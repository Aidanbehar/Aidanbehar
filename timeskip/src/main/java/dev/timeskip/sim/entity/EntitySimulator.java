package dev.timeskip.sim.entity;

import dev.timeskip.config.TimeSkipConfig;
import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.mixin.AbstractArrowAccessor;
import dev.timeskip.mixin.ExperienceOrbAccessor;
import dev.timeskip.mixin.ItemEntityAccessor;
import dev.timeskip.mixin.TadpoleAccessor;
import dev.timeskip.mixin.VillagerAccessor;
import dev.timeskip.mixin.ZombieVillagerAccessor;
import dev.timeskip.mixin.ZombieVillagerInvoker;
import dev.timeskip.scheduler.TickBudget;
import dev.timeskip.sim.LevelInfo;
import dev.timeskip.sim.SimContext;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.Difficulty;
import net.minecraft.world.entity.AgeableMob;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.ExperienceOrb;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.OwnableEntity;
import net.minecraft.world.entity.ai.memory.MemoryModuleType;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.animal.frog.Tadpole;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.monster.zombie.ZombieVillager;
import net.minecraft.world.entity.npc.villager.Villager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.arrow.AbstractArrow;

/**
 * Ages every loaded entity by the skipped time.
 *
 * <ul>
 *   <li>Dropped items and XP orbs despawn once older than 6000 ticks (infinite-lifetime items stay).</li>
 *   <li>Arrows stuck in blocks despawn after 1200 ticks.</li>
 *   <li>Babies grow up and breeding cooldowns run out (age-locked babies stay babies).</li>
 *   <li>Tadpoles turn into frogs and zombie villagers being cured finish curing (vanilla code).</li>
 *   <li>Villagers with a job site restock their trades; gossip decays one step per day.</li>
 *   <li>Mob equilibrium: mobs vanilla is allowed to despawn are removed, so the normal spawner
 *       repopulates naturally after the skip. Named, tamed, leashed, riding and persistent mobs stay.</li>
 * </ul>
 */
public final class EntitySimulator {
    private static final int ITEM_LIFETIME = 6000;
    private static final int INFINITE_ITEM_LIFETIME = -32768;
    private static final int ARROW_LIFETIME = 1200;
    private static final int TICKS_PER_DAY = 24000;
    private static final int MAX_GOSSIP_DECAYS = 30;
    /** "Very far from every player" for vanilla's removeWhenFarAway check. */
    private static final double FAR_AWAY_SQR = 1.0e12;

    private final SimContext sim;
    private final List<Entry> entities = new ArrayList<>();
    private int cursor;
    private boolean collected;

    private record Entry(LevelInfo info, Entity entity) {
    }

    public EntitySimulator(SimContext sim) {
        this.sim = sim;
    }

    public int total() {
        return entities.size();
    }

    public int done() {
        return cursor;
    }

    public boolean step(TickBudget budget) {
        if (!collected) {
            collected = true;
            for (LevelInfo info : sim.levels.values()) {
                for (Entity entity : info.level.getAllEntities()) {
                    if (!(entity instanceof Player)) {
                        entities.add(new Entry(info, entity));
                    }
                }
            }
        }
        while (cursor < entities.size()) {
            if ((cursor & 63) == 0 && budget.expired()) {
                return false;
            }
            Entry entry = entities.get(cursor++);
            Entity entity = entry.entity;
            if (entity.isRemoved() || sim.isNewborn(entity.getUUID())) {
                continue;
            }
            age(entry.info, entity);
        }
        return true;
    }

    private void age(LevelInfo info, Entity entity) {
        long ticks = info.ticks;
        int clamped = (int) Math.min(ticks, Integer.MAX_VALUE / 2);
        switch (entity) {
            case ItemEntity item -> {
                ItemEntityAccessor acc = (ItemEntityAccessor) item;
                int age = acc.timeskip$getAge();
                if (age == INFINITE_ITEM_LIFETIME) {
                    return;
                }
                if (age + ticks >= ITEM_LIFETIME) {
                    item.discard();
                    sim.stats.inc(Stat.ITEMS_DESPAWNED);
                } else {
                    acc.timeskip$setAge(age + clamped);
                }
            }
            case ExperienceOrb orb -> {
                ExperienceOrbAccessor acc = (ExperienceOrbAccessor) orb;
                if (acc.timeskip$getAge() + ticks >= ITEM_LIFETIME) {
                    orb.discard();
                    sim.stats.inc(Stat.ORBS_DESPAWNED);
                } else {
                    acc.timeskip$setAge(acc.timeskip$getAge() + clamped);
                }
            }
            case AbstractArrow arrow -> {
                AbstractArrowAccessor acc = (AbstractArrowAccessor) arrow;
                if (acc.timeskip$isInGround()) {
                    if (acc.timeskip$getLife() + ticks >= ARROW_LIFETIME) {
                        arrow.discard();
                        sim.stats.inc(Stat.ITEMS_DESPAWNED);
                    } else {
                        acc.timeskip$setLife(acc.timeskip$getLife() + clamped);
                    }
                }
            }
            case Mob mob -> ageMob(info, mob, ticks, clamped);
            default -> {
            }
        }
    }

    private void ageMob(LevelInfo info, Mob mob, long ticks, int clamped) {
        ServerLevel level = info.level;
        if (sim.config.mobEquilibrium == TimeSkipConfig.MobEquilibrium.DESPAWN && isDespawnable(level, mob)) {
            mob.discard();
            sim.stats.inc(Stat.MOBS_DESPAWNED);
            return;
        }
        if (mob instanceof AgeableMob ageable && !ageable.isAgeLocked()) {
            int age = ageable.getAge();
            if (age < 0) {
                int grown = (int) Math.min(0L, age + ticks);
                ageable.setAge(grown);
                if (grown == 0) {
                    sim.stats.inc(Stat.BABIES_GROWN);
                }
            } else if (age > 0) {
                ageable.setAge((int) Math.max(0L, age - ticks));
            }
        }
        if (mob instanceof Animal animal) {
            animal.resetLove();
        }
        if (mob instanceof Tadpole tadpole && !tadpole.isAgeLocked()) {
            TadpoleAccessor acc = (TadpoleAccessor) tadpole;
            long target = Math.min((long) Tadpole.ticksToBeFrog, acc.timeskip$getAge() + ticks);
            acc.timeskip$setAge((int) target); // vanilla converts it to a frog once old enough
            if (target >= Tadpole.ticksToBeFrog) {
                sim.stats.inc(Stat.CONVERSIONS);
            }
        }
        if (mob instanceof ZombieVillager zombie && zombie.isConverting()) {
            ZombieVillagerAccessor acc = (ZombieVillagerAccessor) zombie;
            if (acc.timeskip$getConversionTime() <= ticks) {
                ((ZombieVillagerInvoker) zombie).timeskip$finishConversion(level);
                sim.stats.inc(Stat.CONVERSIONS);
            } else {
                acc.timeskip$setConversionTime((int) (acc.timeskip$getConversionTime() - ticks));
            }
        }
        if (mob instanceof Villager villager && !villager.isRemoved()) {
            if (villager.getBrain().hasMemoryValue(MemoryModuleType.JOB_SITE)) {
                villager.restock();
                sim.stats.inc(Stat.VILLAGERS_RESTOCKED);
            }
            long decays = Math.min(MAX_GOSSIP_DECAYS, ticks / TICKS_PER_DAY);
            for (long i = 0; i < decays; i++) {
                ((VillagerAccessor) villager).timeskip$getGossips().decay();
            }
        }
    }

    /** Vanilla's own despawn rules, evaluated as if every player were far away. */
    private static boolean isDespawnable(ServerLevel level, Mob mob) {
        if (level.getDifficulty() == Difficulty.PEACEFUL && !mob.getType().isAllowedInPeaceful()) {
            return true;
        }
        if (mob.isPersistenceRequired() || mob.requiresCustomPersistence() || mob.hasCustomName()
                || mob.isVehicle() || mob.isPassenger()) {
            return false;
        }
        if (mob instanceof OwnableEntity ownable && ownable.getOwnerReference() != null) {
            return false;
        }
        return mob.removeWhenFarAway(FAR_AWAY_SQR);
    }
}
