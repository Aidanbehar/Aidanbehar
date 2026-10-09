package com.deepwinter.temperature;

import com.deepwinter.DeepWinter;
import com.deepwinter.config.DeepWinterConfig;
import com.mojang.serialization.Codec;
import net.fabricmc.fabric.api.attachment.v1.AttachmentRegistry;
import net.fabricmc.fabric.api.attachment.v1.AttachmentSyncPredicate;
import net.fabricmc.fabric.api.attachment.v1.AttachmentType;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.EntityTypeTags;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.memory.MemoryModuleType;
import net.minecraft.world.entity.npc.villager.Villager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.schedule.Activity;
import org.jspecify.annotations.Nullable;

/** Tracks each entity's internal temperature and turns prolonged cold into vanilla freezing. */
public final class BodyTemperature {
	/** Fraction of the gap to the felt temperature closed per tick (time constant ~20 s). */
	private static final float RATE = 1.0F / 400.0F;

	/** Mutable per-entity state; only the body temperature is saved. */
	public static final class State {
		float body;
		boolean initialized;
		boolean freezing;
		float lastSynced = Float.NaN;
		@Nullable TemperatureBreakdown last;

		State() {
		}

		State(float body) {
			this.body = body;
			this.initialized = true;
		}

		public float body() {
			return body;
		}

		public boolean freezing() {
			return freezing;
		}

		public @Nullable TemperatureBreakdown last() {
			return last;
		}
	}

	public static final AttachmentType<State> STATE = AttachmentRegistry.create(DeepWinter.id("body_temperature"), b -> b
		.persistent(Codec.FLOAT.xmap(State::new, State::body))
		.initializer(State::new));

	/** Rounded body temperature synced to the owning player for the (deliberately fuzzy) HUD. */
	public static final AttachmentType<Float> HUD = AttachmentRegistry.create(DeepWinter.id("hud_temperature"), b -> b
		.syncWith(ByteBufCodecs.FLOAT, AttachmentSyncPredicate.targetOnly()));

	private BodyTemperature() {
	}

	public static void init() {
	}

	public static boolean tracked(LivingEntity entity) {
		if (entity instanceof Player) {
			return true;
		}
		DeepWinterConfig cfg = DeepWinterConfig.get();
		if (entity instanceof Villager) {
			return cfg.villagersFreeze;
		}
		return cfg.otherMobsFreeze && entity instanceof Mob && !entity.is(EntityTypeTags.FREEZE_IMMUNE_ENTITY_TYPES);
	}

	public static boolean isFreezing(LivingEntity entity) {
		State s = entity.getAttached(STATE);
		return s != null && s.freezing;
	}

	public static State state(LivingEntity entity) {
		return entity.getAttachedOrCreate(STATE);
	}

	/** Fresh breakdown for an entity (also caches it). */
	public static TemperatureBreakdown refresh(LivingEntity entity) {
		State s = state(entity);
		s.last = TemperatureCalculator.compute(entity.level(), entity.blockPosition(), entity);
		return s.last;
	}

	/** Called at the end of LivingEntity.tick on the server. */
	public static void tick(LivingEntity entity) {
		if (!(entity.level() instanceof ServerLevel level) || !entity.isAlive() || !tracked(entity)) {
			return;
		}
		State s = state(entity);
		boolean player = entity instanceof Player;
		int interval = player ? 20 : 40;
		if (s.last == null || (entity.tickCount + entity.getId()) % interval == 0) {
			s.last = TemperatureCalculator.compute(level, entity.blockPosition(), entity);
		}
		float felt = s.last.felt();
		if (!s.initialized) {
			// New entities start comfortable (or warmer, if their surroundings are) and adapt from there.
			s.body = Math.max(15.0F, felt);
			s.initialized = true;
		}
		s.body += (felt - s.body) * RATE;

		DeepWinterConfig cfg = DeepWinterConfig.get();
		boolean exempt = entity.isSpectator() || (entity instanceof Player p && p.isCreative())
			|| entity.is(EntityTypeTags.FREEZE_IMMUNE_ENTITY_TYPES);
		s.freezing = !exempt && s.body < cfg.freezingThreshold;

		if (s.freezing) {
			// Vanilla thaws by 2 per tick outside powder snow; add enough on top for a net gain that grows with the cold.
			int severity = 1 + (int) Math.min(2, (cfg.freezingThreshold - s.body) / 6.0);
			int required = entity.getTicksRequiredToFreeze();
			entity.setTicksFrozen(Math.min(required + 2, entity.getTicksFrozen() + 2 + severity));
		}

		if (cfg.heatDamage && !exempt && s.body > cfg.heatDamageThreshold && entity.tickCount % 40 == 0) {
			entity.hurtServer(level, level.damageSources().onFire(), 1.0F);
		}

		if (player && entity.tickCount % 20 == 0 && Math.abs(s.body - s.lastSynced) > 0.05F || player && Float.isNaN(s.lastSynced)) {
			s.lastSynced = s.body;
			entity.setAttached(HUD, s.body);
		}

		if (entity instanceof Villager villager && (entity.tickCount + entity.getId()) % 40 == 0) {
			seekShelter(level, villager, s, cfg);
		}
	}

	/**
	 * Villagers caught outdoors in a storm, or out in the cold at night, react as if the bell rang:
	 * vanilla's hide behaviour walks them to their home and keeps them there for a while.
	 */
	private static void seekShelter(ServerLevel level, Villager villager, State s, DeepWinterConfig cfg) {
		TemperatureBreakdown t = s.last;
		if (t == null || villager.isSleeping() || villager.isBaby() && !t.storm()) {
			return;
		}
		boolean outdoors = t.shelter() < 0.6F;
		boolean cold = s.body < cfg.freezingThreshold + 10 || t.felt() < cfg.freezingThreshold + 4;
		boolean night = level.isDarkOutside() && t.felt() < 5;
		if (outdoors && (t.storm() || cold || night)) {
			villager.getBrain().setMemory(MemoryModuleType.HEARD_BELL_TIME, level.getGameTime());
			villager.getBrain().setActiveActivityIfPossible(Activity.HIDE);
		}
	}
}
