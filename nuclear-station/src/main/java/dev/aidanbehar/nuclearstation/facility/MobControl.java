package dev.aidanbehar.nuclearstation.facility;

import dev.aidanbehar.nuclearstation.config.ModConfig;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.boss.enderdragon.EnderDragon;
import net.minecraft.world.entity.boss.wither.WitherBoss;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.phys.AABB;

/**
 * Site security: every few seconds hostile mobs inside the station footprint are removed
 * (those that wandered in from outside or were already there). Named, leashed or otherwise
 * persistent mobs and bosses are left alone.
 */
public final class MobControl {
	private static final int INTERVAL = 100;

	private MobControl() {
	}

	public static void register() {
		ServerTickEvents.END_SERVER_TICK.register(MobControl::tick);
	}

	private static void tick(MinecraftServer server) {
		if (server.getTickCount() % INTERVAL != 0 || !ModConfig.get().facility.noHostileMobs) {
			return;
		}
		FacilityManager.Context ctx = FacilityManager.context(server).orElse(null);
		if (ctx == null) {
			return;
		}
		int x0 = ctx.data.originX();
		int z0 = ctx.data.originZ();
		AABB box = new AABB(x0, ctx.level.getMinY(), z0, x0 + 1024, ctx.level.getMaxY(), z0 + 1024);
		for (Entity e : ctx.level.getEntities((Entity) null, box, MobControl::removable)) {
			e.discard();
		}
	}

	static boolean removable(Entity e) {
		return e instanceof Enemy && e instanceof Mob mob && !mob.isPersistenceRequired() && !mob.hasCustomName() && !mob.isLeashed()
			&& !(e instanceof WitherBoss) && !(e instanceof EnderDragon);
	}
}
