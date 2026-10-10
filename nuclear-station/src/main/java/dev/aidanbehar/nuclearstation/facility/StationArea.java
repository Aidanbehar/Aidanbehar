package dev.aidanbehar.nuclearstation.facility;

import dev.aidanbehar.nuclearstation.config.ModConfig;
import dev.aidanbehar.nuclearstation.facility.layout.Blueprint;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.ServerLevelAccessor;

/** Fast "is this position inside the station footprint" test for game hooks. */
public final class StationArea {
	private StationArea() {
	}

	/** Resolves the server level behind a reader (live level or world-generation region). */
	public static ServerLevel serverLevel(Object level) {
		if (level instanceof ServerLevel server) {
			return server;
		}
		if (level instanceof ServerLevelAccessor accessor) {
			return accessor.getLevel();
		}
		return null;
	}

	public static boolean contains(Object level, int x, int z) {
		ServerLevel server = serverLevel(level);
		if (server == null || server.dimension() != Level.OVERWORLD || !ModConfig.get().facility.enabled) {
			return false;
		}
		FacilityManager.Context ctx = FacilityManager.context(server.getServer()).orElse(null);
		if (ctx == null) {
			return false;
		}
		int lx = x - ctx.data.originX();
		int lz = z - ctx.data.originZ();
		return lx >= 0 && lz >= 0 && lx < Blueprint.SIZE && lz < Blueprint.SIZE;
	}

	public static boolean contains(LevelReader level, net.minecraft.core.BlockPos pos) {
		return contains((Object) level, pos.getX(), pos.getZ());
	}
}
