package com.deepwinter.snow;

import com.deepwinter.DeepWinter;
import com.deepwinter.config.DeepWinterConfig;
import com.deepwinter.storm.StormData;
import com.deepwinter.storm.StormManager;
import net.fabricmc.fabric.api.attachment.v1.AttachmentRegistry;
import net.fabricmc.fabric.api.attachment.v1.AttachmentType;
import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.util.profiling.Profiler;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.biome.Biome;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.chunk.LevelChunk;
import net.minecraft.world.phys.AABB;

import java.util.ArrayDeque;
import java.util.IdentityHashMap;
import java.util.Map;

/**
 * Budgeted snow accumulation and melting. Each tick a fixed number of random columns spread over all loaded
 * chunks are visited (never a full scan), so the cost is constant no matter how many chunks are loaded.
 * Each visit adds the snow the column would have received since its previous expected visit.
 */
public final class SnowAccumulator {
	public static final AttachmentType<SnowStamp> STAMP = AttachmentRegistry.create(
		DeepWinter.id("snow_stamp"), builder -> builder.persistent(SnowStamp.CODEC));

	/** Layers per tick that sun-exposed excess snow settles after a storm. */
	private static final double SETTLE_RATE = 1.0 / 3000.0;
	/** Base layers per tick that melt in warm biomes. */
	private static final double WARM_MELT_RATE = 1.0 / 1200.0;

	private static final Map<ServerLevel, LevelState> LEVELS = new IdentityHashMap<>();

	private static final class LevelState {
		final LoadedChunks loaded = new LoadedChunks();
		final ArrayDeque<CatchUp> catchUps = new ArrayDeque<>();
		int cursor;
	}

	private record CatchUp(long chunk, double normalLayers, double stormLayers) {
	}

	private SnowAccumulator() {
	}

	private static LevelState state(ServerLevel level) {
		return LEVELS.computeIfAbsent(level, l -> new LevelState());
	}

	// ---------------------------------------------------------------- chunk lifecycle

	public static void onChunkLoad(ServerLevel level, LevelChunk chunk, boolean generated) {
		if (!level.canHaveWeather()) {
			return;
		}
		LevelState st = state(level);
		long pos = chunk.getPos().pack();
		st.loaded.add(pos);

		StormData data = StormManager.data(level.getServer());
		SnowStamp now = new SnowStamp(data.snowClock(), data.stormClock());
		SnowStamp stamp = chunk.getAttached(STAMP);
		if (stamp == null) {
			// Fresh chunks generated during a storm get the storm's snow so far, so new terrain matches old.
			stamp = generated && data.isActive() ? new SnowStamp(now.snow(), data.stormClockAtStart()) : now;
		}
		double normal = Math.max(0, now.snow() - stamp.snow());
		double storm = Math.max(0, now.storm() - stamp.storm());
		if (normal + storm >= 0.5) {
			st.catchUps.add(new CatchUp(pos, normal, storm));
		}
		chunk.setAttached(STAMP, now);
	}

	public static void onChunkUnload(ServerLevel level, LevelChunk chunk) {
		LevelState st = LEVELS.get(level);
		if (st != null) {
			st.loaded.remove(chunk.getPos().pack());
		}
		if (level.canHaveWeather()) {
			StormData data = StormManager.data(level.getServer());
			chunk.setAttached(STAMP, new SnowStamp(data.snowClock(), data.stormClock()));
		}
	}

	/** Before a save, refresh stale stamps on loaded chunks so a crash/quit doesn't double-count snow. */
	public static void beforeSave(MinecraftServer server) {
		StormData data = StormManager.data(server);
		SnowStamp now = new SnowStamp(data.snowClock(), data.stormClock());
		for (Map.Entry<ServerLevel, LevelState> e : LEVELS.entrySet()) {
			ServerLevel level = e.getKey();
			LoadedChunks loaded = e.getValue().loaded;
			for (int i = 0; i < loaded.size(); i++) {
				long p = loaded.get(i);
				LevelChunk chunk = level.getChunkSource().getChunkNow(ChunkPos.getX(p), ChunkPos.getZ(p));
				if (chunk == null) {
					continue;
				}
				SnowStamp old = chunk.getAttached(STAMP);
				if (old == null || now.snow() - old.snow() + now.storm() - old.storm() > 0.25) {
					chunk.setAttached(STAMP, now);
				}
			}
		}
	}

	public static void clear() {
		LEVELS.clear();
	}

	// ---------------------------------------------------------------- ticking

	public static void tick(ServerLevel level) {
		if (!level.canHaveWeather()) {
			return;
		}
		LevelState st = LEVELS.get(level);
		if (st == null || st.loaded.size() == 0) {
			return;
		}
		var profiler = Profiler.get();
		profiler.push("deepwinter_snow");
		DeepWinterConfig cfg = DeepWinterConfig.get();
		boolean raining = level.isRaining();
		int visits = raining ? cfg.snowColumnBudgetPerTick : cfg.snowColumnBudgetPerTick / 4;
		if (visits > 0) {
			int n = st.loaded.size();
			// Ticks that elapse, on average, between two visits of the same column.
			double interval = n * 256.0 / visits;
			RandomSource random = level.getRandom();
			for (int i = 0; i < visits; i++) {
				st.cursor = (st.cursor + 1) % n;
				long p = st.loaded.get(st.cursor);
				int x = ChunkPos.getX(p) * 16 + random.nextInt(16);
				int z = ChunkPos.getZ(p) * 16 + random.nextInt(16);
				visitColumn(level, x, z, raining, interval, random);
			}
		}

		for (int i = 0; i < cfg.catchUpChunksPerTick && !st.catchUps.isEmpty(); i++) {
			CatchUp c = st.catchUps.poll();
			LevelChunk chunk = level.getChunkSource().getChunkNow(ChunkPos.getX(c.chunk), ChunkPos.getZ(c.chunk));
			if (chunk != null) {
				catchUp(level, chunk, c.normalLayers, c.stormLayers);
			}
		}
		profiler.pop();
	}

	private static int randomRound(double v, RandomSource random) {
		int whole = Mth.floor(v);
		return whole + (random.nextDouble() < v - whole ? 1 : 0);
	}

	private static boolean loaded(ServerLevel level, int x, int z) {
		return level.getChunkSource().getChunkNow(x >> 4, z >> 4) != null;
	}

	private static void visitColumn(ServerLevel level, int x, int z, boolean raining, double interval, RandomSource random) {
		SnowColumn column = SnowColumn.scan(level, x, z);
		if (column == null) {
			return;
		}
		BlockPos top = new BlockPos(x, column.topY(), z);
		Biome biome = level.getBiome(top).value();
		boolean storm = SnowClimate.stormHere(biome);
		boolean snowing = raining && (storm || SnowClimate.naturallySnowy(biome, top, level));

		if (column.heated(level)) {
			// Heat source nearby (torch, fire, lava, lit furnace...): melt instead of piling.
			if (column.depth > 0) {
				column.setDepth(level, column.depth - Math.max(1, randomRound(interval / 600.0, random)), 0, random, Block.UPDATE_ALL);
			}
			return;
		}

		if (snowing) {
			int climateMax = storm ? SnowClimate.stormMaxLayers(biome, top) : SnowClimate.clearMaxLayers(biome, top);
			double rate = storm ? StormManager.stormRate() : StormManager.normalRate();
			int add = randomRound(rate * column.kind.rate * interval, random);
			if (add <= 0) {
				return;
			}
			DeepWinterConfig cfg = DeepWinterConfig.get();
			double powder = storm ? cfg.stormPowderSnowChance : cfg.powderSnowChance;
			addWithDrift(level, column, add, climateMax, powder, random);
			return;
		}

		if (column.depth == 0) {
			return;
		}
		float temp = SnowClimate.adjustedTemperature(biome, top);
		double melt = 0;
		if (temp >= SnowClimate.SNOW_LINE) {
			// Warm biome: snow melts, faster the warmer it is.
			melt = WARM_MELT_RATE * (1 + (temp - SnowClimate.SNOW_LINE) * 4);
		} else if (!raining && level.isBrightOutside() && column.depth > column.capFor(SnowClimate.clearMaxLayers(biome, top))) {
			// Storm is over: sunshine slowly settles excess snow back to the normal depth.
			melt = SETTLE_RATE;
		}
		if (melt > 0) {
			int remove = randomRound(melt * DeepWinterConfig.get().debugSpeedMultiplier * interval, random);
			if (remove > 0) {
				int floor = temp >= SnowClimate.SNOW_LINE ? 0 : column.capFor(SnowClimate.clearMaxLayers(biome, top));
				column.setDepth(level, Math.max(floor, column.depth - remove), 0, random, Block.UPDATE_ALL);
			}
		}
	}

	/**
	 * Adds snow, letting it slide into nearby hollows so the surface evens out instead of spiking, and
	 * forming more powder snow in drifts against walls and in low spots.
	 */
	private static void addWithDrift(ServerLevel level, SnowColumn column, int add, int climateMax, double powderChance, RandomSource random) {
		int h = column.surfaceHeight();
		SnowColumn lowest = null;
		int lowestH = Integer.MAX_VALUE;
		int higherNeighbours = 0;
		int wallNeighbours = 0;
		int muchLower = 0;
		int checked = 0;
		int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
		for (int[] d : dirs) {
			int nx = column.x + d[0];
			int nz = column.z + d[1];
			if (!loaded(level, nx, nz)) {
				continue;
			}
			checked++;
			SnowColumn n = SnowColumn.scan(level, nx, nz);
			if (n == null) {
				// Something solid but snow-less (a wall, a chest...) next to us.
				wallNeighbours++;
				continue;
			}
			int nh = n.surfaceHeight();
			if (nh >= h + 8) {
				wallNeighbours++;
			}
			if (nh > h + 1) {
				higherNeighbours++;
			}
			if (nh < h - 12) {
				muchLower++;
			}
			if (nh < lowestH) {
				lowestH = nh;
				lowest = n;
			}
		}

		// Fill hollows: snow slides into a neighbour that is noticeably (but not cliff-) lower.
		if (lowest != null && lowestH <= h - 3 && lowestH >= h - 12) {
			BlockPos np = new BlockPos(lowest.x, lowest.topY(), lowest.z);
			Biome nb = level.getBiome(np).value();
			int nMax = lowest.capFor(SnowClimate.stormHere(nb) ? SnowClimate.stormMaxLayers(nb, np) : SnowClimate.clearMaxLayers(nb, np));
			if (lowest.depth < nMax) {
				// Low spots collect powder.
				lowest.setDepth(level, Math.min(nMax, lowest.depth + add), powderChance * 2.0, random, Block.UPDATE_ALL);
				return;
			}
		}

		int max = column.capFor(climateMax);
		// Isolated pillars (a lone post, a single block) can't hold a tall heap.
		if (checked > 0 && muchLower == checked) {
			max = Math.min(max, 4);
		}
		if (column.depth >= max) {
			return;
		}
		double powder = powderChance;
		if (wallNeighbours > 0 || higherNeighbours >= 3) {
			powder *= 2.5; // drifts against walls and in hollows
		}
		column.setDepth(level, Math.min(max, column.depth + add), Math.min(1.0, powder), random, Block.UPDATE_ALL);
	}

	// ---------------------------------------------------------------- catch-up

	private static void catchUp(ServerLevel level, LevelChunk chunk, double normalLayers, double stormLayers) {
		DeepWinterConfig cfg = DeepWinterConfig.get();
		RandomSource random = level.getRandom();
		ChunkPos cp = chunk.getPos();
		int flags = Block.UPDATE_CLIENTS | Block.UPDATE_KNOWN_SHAPE;
		for (int dx = 0; dx < 16; dx++) {
			for (int dz = 0; dz < 16; dz++) {
				int x = cp.getMinBlockX() + dx;
				int z = cp.getMinBlockZ() + dz;
				SnowColumn column = SnowColumn.scan(level, x, z);
				if (column == null) {
					continue;
				}
				BlockPos top = new BlockPos(x, column.topY(), z);
				if (column.heated(level)) {
					continue;
				}
				Biome biome = level.getBiome(top).value();
				double layers = 0;
				if (SnowClimate.naturallySnowy(biome, top, level)) {
					layers += normalLayers;
				}
				boolean stormed = stormLayers > 0 && SnowClimate.stormCapable(biome, top, level);
				if (stormed) {
					layers += stormLayers;
				}
				layers = Math.min(layers * column.kind.rate, cfg.catchUpCapLayers);
				int add = randomRound(layers, random);
				if (add <= 0) {
					continue;
				}
				int max = column.capFor(stormed ? SnowClimate.stormMaxLayers(biome, top) : SnowClimate.clearMaxLayers(biome, top));
				if (column.depth >= max) {
					continue;
				}
				double powder = stormed ? cfg.stormPowderSnowChance : cfg.powderSnowChance;
				column.setDepth(level, Math.min(max, column.depth + add), powder, random, flags);
			}
		}
		// Make sure nothing that was standing in the chunk ended up inside the new snow.
		AABB box = new AABB(cp.getMinBlockX(), level.getMinY(), cp.getMinBlockZ(), cp.getMaxBlockX() + 1, level.getMaxY(), cp.getMaxBlockZ() + 1);
		for (Entity e : level.getEntitiesOfClass(LivingEntity.class, box, LivingEntity::isInWall)) {
			SnowColumn c = SnowColumn.scan(level, e.getBlockX(), e.getBlockZ());
			if (c != null && c.surfaceHeight() / 8.0 > e.getY()) {
				e.teleportTo(e.getX(), Math.ceil(c.surfaceHeight() / 8.0), e.getZ());
			}
		}
	}
}
