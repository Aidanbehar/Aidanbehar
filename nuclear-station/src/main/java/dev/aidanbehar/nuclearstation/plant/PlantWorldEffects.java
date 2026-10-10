package dev.aidanbehar.nuclearstation.plant;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.*;

import dev.aidanbehar.nuclearstation.block.LampBlock;
import dev.aidanbehar.nuclearstation.block.PanelBlock;
import dev.aidanbehar.nuclearstation.block.PanelStatus;
import dev.aidanbehar.nuclearstation.block.WarningBeaconBlock;
import dev.aidanbehar.nuclearstation.facility.FacilityManager;
import dev.aidanbehar.nuclearstation.facility.Feature;
import dev.aidanbehar.nuclearstation.facility.Marker;
import dev.aidanbehar.nuclearstation.facility.layout.Blueprint;
import dev.aidanbehar.nuclearstation.facility.layout.Kit;
import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import dev.aidanbehar.nuclearstation.registry.ModSounds;
import dev.aidanbehar.nuclearstation.sim.AlarmId;
import dev.aidanbehar.nuclearstation.sim.AlarmSystem;
import dev.aidanbehar.nuclearstation.sim.Bus;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import dev.aidanbehar.nuclearstation.sim.PlantEvent;
import dev.aidanbehar.nuclearstation.sim.PlantModel;
import java.util.Map;
import java.util.WeakHashMap;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.LevelChunk;

/**
 * Makes the plant state visible in the world: AC-powered lighting goes dark in a
 * blackout, control panels and annunciators reflect live alarms, beacons rotate during
 * emergencies, events produce sounds and steam, and severe accidents leave persistent,
 * deterministic physical damage (re-applied to chunks as they load).
 */
public final class PlantWorldEffects {
	private static final int FLAGS = Block.UPDATE_CLIENTS | Block.UPDATE_KNOWN_SHAPE;
	private static final Map<ServerLevel, Visual> LAST = new WeakHashMap<>();

	private PlantWorldEffects() {
	}

	/** Coarse visual state of the plant; panels are only rewritten when it changes. */
	record Visual(boolean lighting, boolean instruments, boolean beacons, long alarmBits, int damage) {
		static Visual of(PlantModel m, int damage) {
			boolean lighting = m.busLive(Bus.NS1) || m.busLive(Bus.NS2) || m.busLive(Bus.SA) || m.busLive(Bus.SB);
			boolean instruments = m.busLive(Bus.DCA) || m.busLive(Bus.DCB);
			AlarmSystem alarms = m.alarms();
			long bits = 0;
			for (AlarmId id : AlarmId.values()) {
				if (alarms.active(id) && id.ordinal() < 64) {
					bits |= 1L << id.ordinal();
				}
			}
			boolean beacons = alarms.active(AlarmId.OFFSITE_RELEASE) || alarms.active(AlarmId.CONT_RADIATION_HIGH)
				|| alarms.active(AlarmId.CORE_DAMAGE) || alarms.active(AlarmId.SI_ACTUATED) || alarms.active(AlarmId.STATION_BLACKOUT)
				|| alarms.active(AlarmId.REACTOR_TRIP) && m.hornActive();
			return new Visual(lighting, instruments, beacons, bits, damage);
		}
	}

	// ================================================================== marker state

	public static void syncChunk(ServerLevel level, FacilityManager.Context ctx, int cx, int cz) {
		PlantData data = PlantService.data(level.getServer());
		Visual v = LAST.computeIfAbsent(level, l -> Visual.of(data.model(), data.damageStages()));
		LevelChunk chunk = level.getChunkSource().getChunkNow(cx, cz);
		if (chunk == null) {
			return;
		}
		applyMarkers(level, ctx, chunk, v);
		if (data.damageStages() != 0) {
			applyDamage(level, ctx, data, chunk);
		}
	}

	private static void applyMarkers(ServerLevel level, FacilityManager.Context ctx, LevelChunk chunk, Visual v) {
		for (Marker m : ctx.markers.inChunk(chunk.getPos().x(), chunk.getPos().z())) {
			BlockState s = chunk.getBlockState(m.pos());
			BlockState target = s;
			switch (m.type()) {
				case LAMP -> {
					if (s.is(ModBlocks.FACILITY_LAMP)) {
						target = s.setValue(LampBlock.POWERED, v.lighting);
					}
				}
				case BEACON -> {
					if (s.is(ModBlocks.WARNING_BEACON)) {
						target = s.setValue(WarningBeaconBlock.LIT, v.beacons);
					}
				}
				case PANEL -> {
					if (s.is(ModBlocks.CONTROL_PANEL)) {
						target = s.setValue(PanelBlock.STATUS, panelStatus(m.pos(), v));
					}
				}
				case ANNUNCIATOR -> {
					if (s.is(ModBlocks.ANNUNCIATOR_PANEL)) {
						target = s.setValue(PanelBlock.STATUS, annunciatorStatus(m.pos(), v));
					}
				}
				default -> {
				}
			}
			if (target != s) {
				level.setBlock(m.pos(), target, FLAGS);
			}
		}
	}

	private static PanelStatus panelStatus(BlockPos pos, Visual v) {
		if (!v.instruments) {
			return PanelStatus.OFF;
		}
		double h = Kit.hash(pos.getX(), pos.getY(), pos.getZ(), 101);
		boolean p1 = (v.alarmBits & priorityMask(1)) != 0;
		boolean p2 = (v.alarmBits & priorityMask(2)) != 0;
		if (p1 && h < 0.3) {
			return PanelStatus.ALARM;
		}
		if ((p1 || p2) && h < 0.5) {
			return PanelStatus.CAUTION;
		}
		return PanelStatus.NORMAL;
	}

	private static PanelStatus annunciatorStatus(BlockPos pos, Visual v) {
		if (!v.instruments) {
			return PanelStatus.OFF;
		}
		AlarmId[] ids = AlarmId.values();
		AlarmId id = ids[(int) (Kit.hash(pos.getX(), pos.getY(), pos.getZ(), 202) * ids.length)];
		if ((v.alarmBits & (1L << id.ordinal())) == 0) {
			return PanelStatus.NORMAL;
		}
		return id.priority == 1 ? PanelStatus.ALARM : PanelStatus.CAUTION;
	}

	private static long priorityMask(int priority) {
		long mask = 0;
		for (AlarmId id : AlarmId.values()) {
			if (id.priority == priority) {
				mask |= 1L << id.ordinal();
			}
		}
		return mask;
	}

	static void periodic(ServerLevel level, FacilityManager.Context ctx, PlantData data, long tick) {
		if (tick % 20 != 0) {
			return;
		}
		Visual now = Visual.of(data.model(), data.damageStages());
		Visual before = LAST.put(level, now);
		if (now.equals(before)) {
			return;
		}
		for (long key : ctx.markers.chunks()) {
			LevelChunk chunk = level.getChunkSource().getChunkNow(net.minecraft.world.level.ChunkPos.getX(key), net.minecraft.world.level.ChunkPos.getZ(key));
			if (chunk != null) {
				int idx = ctx.data.index(chunk.getPos().x(), chunk.getPos().z());
				if (idx >= 0 && ctx.data.isBuilt(idx)) {
					applyMarkers(level, ctx, chunk, now);
				}
			}
		}
		if (before != null && before.lighting && !now.lighting) {
			broadcast(level, ctx, Component.literal("Lighting power lost - emergency lighting on batteries").withStyle(ChatFormatting.GOLD));
		}
	}

	// ================================================================== events

	static void handle(ServerLevel level, FacilityManager.Context ctx, PlantData data, PlantEvent e) {
		PlantModel m = data.model();
		switch (e.type()) {
			case REACTOR_TRIP -> {
				sound(level, ctx, Feature.REACTOR_CORE, ModSounds.ROD_DROP, 3.0f, 1.0f);
				sound(level, ctx, Feature.CONTROL_ROOM, ModSounds.ANNUNCIATOR_CHIME, 1.0f, 1.0f);
				broadcast(level, ctx, Component.literal("REACTOR TRIP - " + m.tripCause()).withStyle(ChatFormatting.RED));
			}
			case TURBINE_TRIP -> {
				sound(level, ctx, Feature.TURBINE, ModSounds.STEAM_RELEASE, 4.0f, 0.6f);
				steam(level, ctx, Feature.ADV_STACK, 60);
			}
			case SAFETY_INJECTION -> broadcast(level, ctx, Component.literal("SAFETY INJECTION ACTUATED").withStyle(ChatFormatting.RED));
			case PORV_LIFT, SAFETY_VALVE_LIFT -> {
				sound(level, ctx, Feature.PRESSURIZER, ModSounds.STEAM_RELEASE, 2.0f, 1.2f);
				steam(level, ctx, Feature.PRESSURIZER, 30);
			}
			case GRID_LOSS -> {
				sound(level, ctx, Feature.SWITCHYARD, ModSounds.BREAKER_TRIP, 4.0f, 0.8f);
				broadcast(level, ctx, Component.literal("Grid disturbance - offsite power lost").withStyle(ChatFormatting.GOLD));
			}
			case GRID_RESTORED -> broadcast(level, ctx, Component.literal("Grid dispatcher: offsite power available").withStyle(ChatFormatting.GREEN));
			case EDG_START -> sound(level, ctx, e.equipment() == EquipmentId.EDG_B ? Feature.DIESEL_B : Feature.DIESEL_A, ModSounds.DIESEL_ENGINE, 2.0f, 1.0f);
			case EQUIPMENT_FAILURE -> {
				BlockPos at = stationOf(ctx, e.equipment());
				if (at != null) {
					level.sendParticles(ParticleTypes.ELECTRIC_SPARK, at.getX() + 0.5, at.getY() + 1.2, at.getZ() + 0.5, 25, 0.6, 0.6, 0.6, 0.2);
					level.sendParticles(ParticleTypes.LARGE_SMOKE, at.getX() + 0.5, at.getY() + 1.5, at.getZ() + 0.5, 12, 0.5, 0.5, 0.5, 0.02);
					level.playSound(null, at, ModSounds.BREAKER_TRIP, SoundSource.BLOCKS, 1.5f, 1.0f);
				}
				broadcast(level, ctx, Component.literal("Equipment failure: " + e.equipment().label).withStyle(ChatFormatting.YELLOW));
			}
			case EQUIPMENT_REPAIRED -> {
			}
			case TRANSFORMER_FIRE -> transformerFire(level, ctx);
			case RCS_BREAK -> {
				sound(level, ctx, Feature.CONTAINMENT_OPERATING_FLOOR, ModSounds.STEAM_RELEASE, 4.0f, 0.5f);
				steam(level, ctx, Feature.CONTAINMENT_OPERATING_FLOOR, 120);
			}
			case CORE_DAMAGE_ONSET -> {
				data.addDamage(PlantData.DAMAGE_CORE);
				broadcast(level, ctx, Component.literal("Radiation monitors indicate CORE DAMAGE").withStyle(ChatFormatting.DARK_RED));
				reapplyDamage(level, ctx, data);
			}
			case HYDROGEN_BURN -> {
				BlockPos p = ctx.markers.feature(Feature.CONTAINMENT_OPERATING_FLOOR);
				if (p != null) {
					level.explode(null, p.getX() + 0.5, p.getY() + 4, p.getZ() + 0.5, 6.0f, Level.ExplosionInteraction.NONE);
					sound(level, ctx, Feature.CONTAINMENT_DOME_TOP, ModSounds.RUMBLE, 8.0f, 0.7f);
				}
				data.addDamage(PlantData.DAMAGE_HYDROGEN_BURN);
				broadcast(level, ctx, Component.literal("Hydrogen deflagration inside the reactor containment").withStyle(ChatFormatting.DARK_RED));
				reapplyDamage(level, ctx, data);
			}
			case CONTAINMENT_FAILURE -> {
				sound(level, ctx, Feature.CONTAINMENT_DOME_TOP, ModSounds.RUMBLE, 10.0f, 0.5f);
				data.addDamage(PlantData.DAMAGE_CONTAINMENT_BREACH);
				broadcast(level, ctx, Component.literal("CONTAINMENT FAILURE - radioactive release to the environment").withStyle(ChatFormatting.DARK_RED));
				reapplyDamage(level, ctx, data);
			}
			case VESSEL_FAILURE -> {
				sound(level, ctx, Feature.REACTOR_CAVITY, ModSounds.RUMBLE, 6.0f, 0.4f);
				data.addDamage(PlantData.DAMAGE_VESSEL_FAILURE);
				reapplyDamage(level, ctx, data);
			}
			case BASEMAT_MELT_THROUGH -> {
				data.addDamage(PlantData.DAMAGE_MELT_THROUGH);
				reapplyDamage(level, ctx, data);
			}
			case SFP_BOILING -> {
				broadcast(level, ctx, Component.literal("Spent fuel pool is boiling").withStyle(ChatFormatting.GOLD));
				steam(level, ctx, Feature.SPENT_FUEL_POOL, 80);
			}
			case SFP_FUEL_DAMAGE -> {
				data.addDamage(PlantData.DAMAGE_SFP);
				broadcast(level, ctx, Component.literal("Spent fuel uncovered - fuel building radiation alarm").withStyle(ChatFormatting.DARK_RED));
				reapplyDamage(level, ctx, data);
			}
		}
	}

	private static BlockPos stationOf(FacilityManager.Context ctx, EquipmentId id) {
		if (id == null) {
			return null;
		}
		for (Map.Entry<BlockPos, EquipmentId> e : ctx.markers.stations().entrySet()) {
			if (e.getValue() == id) {
				return e.getKey();
			}
		}
		return null;
	}

	private static void sound(ServerLevel level, FacilityManager.Context ctx, Feature feature, SoundEvent sound, float volume, float pitch) {
		BlockPos p = ctx.markers.feature(feature);
		if (p != null) {
			level.playSound(null, p, sound, SoundSource.BLOCKS, volume, pitch);
		}
	}

	private static void steam(ServerLevel level, FacilityManager.Context ctx, Feature feature, int count) {
		BlockPos p = ctx.markers.feature(feature);
		if (p != null) {
			level.sendParticles(ParticleTypes.CLOUD, p.getX() + 0.5, p.getY() + 1, p.getZ() + 0.5, count, 1.5, 2.0, 1.5, 0.08);
		}
	}

	private static void transformerFire(ServerLevel level, FacilityManager.Context ctx) {
		BlockPos p = ctx.markers.feature(Feature.MAIN_TRANSFORMER);
		if (p == null) {
			return;
		}
		for (int dx = -4; dx <= 4; dx += 2) {
			BlockPos top = level.getHeightmapPos(net.minecraft.world.level.levelgen.Heightmap.Types.MOTION_BLOCKING, p.offset(dx, 0, 0));
			if (level.getBlockState(top).isAir()) {
				level.setBlock(top, Blocks.FIRE.defaultBlockState(), 3);
			}
		}
		level.sendParticles(ParticleTypes.LARGE_SMOKE, p.getX() + 0.5, p.getY() + 8, p.getZ() + 0.5, 80, 3, 3, 3, 0.05);
		level.playSound(null, p, SoundEvents.GENERIC_EXPLODE.value(), SoundSource.BLOCKS, 4.0f, 0.6f);
		broadcast(level, ctx, Component.literal("Main transformer fire - deluge system actuated").withStyle(ChatFormatting.RED));
	}

	static void broadcast(ServerLevel level, FacilityManager.Context ctx, Component message) {
		BlockPos c = ctx.centre();
		double r = Blueprint.SIZE * 0.75;
		Component full = Component.literal("[Meridian Point] ").withStyle(ChatFormatting.DARK_AQUA).append(message);
		for (ServerPlayer player : level.players()) {
			if (player.blockPosition().distSqr(c) < r * r) {
				player.sendSystemMessage(full);
			}
		}
	}

	// ================================================================== physical accident damage

	private static void reapplyDamage(ServerLevel level, FacilityManager.Context ctx, PlantData data) {
		int cx0 = ctx.local(CONT_X - CONT_R - 40, 0, 0).getX() >> 4;
		int cx1 = ctx.local(FUEL_X1 + 10, 0, 0).getX() >> 4;
		int cz0 = ctx.local(0, 0, CONT_Z - CONT_R - 40).getZ() >> 4;
		int cz1 = ctx.local(0, 0, CONT_Z + CONT_R + 40).getZ() >> 4;
		for (int cx = cx0; cx <= cx1; cx++) {
			for (int cz = cz0; cz <= cz1; cz++) {
				LevelChunk chunk = level.getChunkSource().getChunkNow(cx, cz);
				int idx = ctx.data.index(cx, cz);
				if (chunk != null && idx >= 0 && ctx.data.isBuilt(idx)) {
					applyDamage(level, ctx, data, chunk);
					RadiationManager.invalidateChunk(level, cx, cz);
				}
			}
		}
	}

	/** Applies all recorded damage stages to one chunk. Idempotent: only original blocks are altered. */
	static void applyDamage(ServerLevel level, FacilityManager.Context ctx, PlantData data, LevelChunk chunk) {
		int g = ctx.data.grade();
		int wx0 = chunk.getPos().getMinBlockX();
		int wz0 = chunk.getPos().getMinBlockZ();
		int lx0 = ctx.localX(wx0);
		int lz0 = ctx.localZ(wz0);
		boolean nearContainment = lx0 + 15 >= CONT_X - CONT_R - 34 && lx0 <= CONT_X + CONT_R + 34
			&& lz0 + 15 >= CONT_Z - CONT_R - 34 && lz0 <= CONT_Z + CONT_R + 34;
		boolean nearFuel = lx0 + 15 >= FUEL_X0 && lx0 <= FUEL_X1 && lz0 + 15 >= FUEL_Z0 && lz0 <= FUEL_Z1;
		if (!nearContainment && !nearFuel) {
			return;
		}
		BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
		for (int dx = 0; dx < 16; dx++) {
			for (int dz = 0; dz < 16; dz++) {
				int lx = lx0 + dx;
				int lz = lz0 + dz;
				double rx = lx + 0.5 - CONT_X;
				double rz = lz + 0.5 - CONT_Z;
				double r = Math.sqrt(rx * rx + rz * rz);
				int x = wx0 + dx;
				int z = wz0 + dz;
				if (data.hasDamage(PlantData.DAMAGE_CORE) && r < 30 && r > 18) {
					// contaminated debris washed into the containment sump area
					if (Kit.hash(lx, 1, lz, 900) < 0.04) {
						replaceIf(level, pos.set(x, g - 19, z), Blocks.AIR, ModBlocks.CONTAMINATED_DEBRIS.defaultBlockState());
					}
				}
				if (data.hasDamage(PlantData.DAMAGE_HYDROGEN_BURN) && r < CONT_R - 4) {
					for (int y = g + 29; y <= g + 60; y++) {
						double h = Kit.hash(lx, y, lz, 901);
						pos.set(x, y, z);
						BlockState s = level.getBlockState(pos);
						if (h < 0.15 && (s.is(ModBlocks.FACILITY_LAMP) || s.is(ModBlocks.STEEL_GRATING) || s.is(Blocks.IRON_BARS))) {
							level.setBlock(pos, Blocks.AIR.defaultBlockState(), FLAGS);
						} else if (h < 0.05 && (s.is(ModBlocks.REINFORCED_CONCRETE) || s.is(ModBlocks.STEEL_FLOOR_PLATE))) {
							level.setBlock(pos, ModBlocks.DAMAGED_CONCRETE.defaultBlockState(), FLAGS);
						}
					}
				}
				if (data.hasDamage(PlantData.DAMAGE_CONTAINMENT_BREACH)) {
					// a ragged opening in the dome on its south-west side, debris thrown around the building
					double ax = rx + 18;
					double az = rz - 14;
					if (ax * ax + az * az < 13 * 13) {
						for (int y = g + 64; y <= g + 64 + 40; y++) {
							pos.set(x, y, z);
							BlockState s = level.getBlockState(pos);
							if (s.is(ModBlocks.CONTAINMENT_CONCRETE) || s.is(ModBlocks.CONTAINMENT_LINER)) {
								double h = Kit.hash(lx, y, lz, 902);
								double edge = Math.sqrt(ax * ax + az * az) / 13.0;
								level.setBlock(pos, h > edge ? Blocks.AIR.defaultBlockState() : ModBlocks.DAMAGED_CONCRETE.defaultBlockState(), FLAGS);
							}
						}
					}
					if (r > CONT_R + 2 && r < CONT_R + 32 && Kit.hash(lx, 2, lz, 903) < 0.03) {
						int y = level.getHeight(net.minecraft.world.level.levelgen.Heightmap.Types.MOTION_BLOCKING, x, z);
						replaceIf(level, pos.set(x, y, z), Blocks.AIR, ModBlocks.CONTAMINATED_DEBRIS.defaultBlockState());
					}
				}
				if (data.hasDamage(PlantData.DAMAGE_VESSEL_FAILURE) && r < 6.5) {
					for (int y = g - 19; y <= g - 17; y++) {
						pos.set(x, y, z);
						if (!level.getBlockState(pos).is(ModBlocks.CORIUM)) {
							level.setBlock(pos, ModBlocks.CORIUM.defaultBlockState(), FLAGS);
						}
					}
					if (r < 4.5) {
						for (int y = g - 14; y <= g - 8; y++) {
							pos.set(x, y, z);
							if (level.getBlockState(pos).is(ModBlocks.REACTOR_VESSEL) && Kit.hash(lx, y, lz, 904) < 0.5) {
								level.setBlock(pos, ModBlocks.CORIUM.defaultBlockState(), FLAGS);
							}
						}
					}
				}
				if (data.hasDamage(PlantData.DAMAGE_MELT_THROUGH) && r < 3.5) {
					for (int y = g - 32; y <= g - 20; y++) {
						pos.set(x, y, z);
						if (!level.getBlockState(pos).is(ModBlocks.CORIUM)) {
							level.setBlock(pos, ModBlocks.CORIUM.defaultBlockState(), FLAGS);
						}
					}
				}
				if (data.hasDamage(PlantData.DAMAGE_SFP) && lx >= FUEL_X0 + 14 && lx <= FUEL_X1 - 14 && lz >= FUEL_Z0 + 14 && lz <= FUEL_Z1 - 26) {
					// pool level has boiled down: the top layers of water are gone
					for (int y = g - 8; y <= g - 1; y++) {
						pos.set(x, y, z);
						if (level.getBlockState(pos).is(Blocks.WATER)) {
							level.setBlock(pos, Blocks.AIR.defaultBlockState(), FLAGS);
						}
					}
				}
			}
		}
	}

	private static void replaceIf(ServerLevel level, BlockPos pos, Block expected, BlockState replacement) {
		if (level.getBlockState(pos).is(expected)) {
			level.setBlock(pos, replacement, FLAGS);
		}
	}
}
