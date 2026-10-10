package dev.aidanbehar.nuclearstation.facility;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.config.ModConfig;
import dev.aidanbehar.nuclearstation.facility.layout.Blueprint;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import net.minecraft.core.Holder;
import net.minecraft.core.QuartPos;
import net.minecraft.core.registries.Registries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.BiomeTags;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.biome.Biome;
import net.minecraft.world.level.biome.BiomeResolver;
import net.minecraft.world.level.chunk.ChunkGenerator;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.level.levelgen.RandomState;
import net.minecraft.world.level.levelgen.structure.BuiltinStructureSets;
import net.minecraft.world.level.levelgen.structure.StructureSet;

/**
 * Finds the coastal site for the station using the world's biome and noise generators
 * only - no chunk is generated or loaded during the search. Candidates lie on rings
 * around the world origin, each oriented with land to the north and ocean to the south.
 * The search is bounded; requirements are relaxed in stages and the best candidate is
 * used if no ideal site exists. Because it depends only on the seed, an interrupted
 * selection re-runs to the same answer.
 */
public final class SiteFinder {
	public record Site(int originX, int originZ, int grade, int sea, String note) {
	}

	private record Score(boolean ocean, boolean land, boolean flat, boolean villageFree, boolean untouched, double value) {
		boolean acceptable(int strictness) {
			return switch (strictness) {
				case 0 -> ocean && land && flat && villageFree && untouched;
				case 1 -> ocean && land && villageFree && untouched;
				default -> ocean && untouched;
			};
		}
	}

	private final ServerLevel level;
	private final ChunkGenerator generator;
	private final RandomState randomState;
	private final BiomeResolver biomes;
	private final int sea;
	private final Optional<Holder.Reference<StructureSet>> villages;

	public SiteFinder(ServerLevel level) {
		this.level = level;
		this.generator = level.getChunkSource().getGenerator();
		this.randomState = level.getChunkSource().randomState();
		this.biomes = generator.getBiomeSource().createUncachedResolver(randomState);
		this.sea = generator.getSeaLevel();
		this.villages = level.registryAccess().lookupOrThrow(Registries.STRUCTURE_SET).get(BuiltinStructureSets.VILLAGES);
	}

	public Site find(ModConfig config) {
		ModConfig.Development dev = config.development;
		int grade = sea + 5;
		if ("FIXED".equalsIgnoreCase(dev.placementMode)) {
			return new Site(dev.fixedOriginX & ~15, dev.fixedOriginZ & ~15, grade, sea, "fixed origin from configuration");
		}
		boolean nearSpawn = "NEAR_SPAWN".equalsIgnoreCase(dev.placementMode);
		int minR = nearSpawn ? 0 : Math.max(0, config.facility.searchMinDistance);
		int maxR = nearSpawn ? 3000 : Math.max(minR + 512, config.facility.searchMaxDistance);
		long start = System.nanoTime();
		int evaluated = 0;
		Site best = null;
		double bestValue = Double.NEGATIVE_INFINITY;
		for (int strictness = 0; strictness <= 2; strictness++) {
			for (int r = minR; r <= maxR; r += 320) {
				int steps = Math.max(1, (int) Math.round(2 * Math.PI * Math.max(r, 1) / 320));
				for (int i = 0; i < steps; i++) {
					double a = 2 * Math.PI * i / steps;
					int cx = (int) Math.round(Math.cos(a) * r);
					int cz = (int) Math.round(Math.sin(a) * r);
					int ox = (cx - Blueprint.SIZE / 2) & ~15;
					int oz = (cz - Blueprint.SIZE / 2) & ~15;
					if (!nearSpawn && overlapsSpawn(ox, oz)) {
						continue;
					}
					Score s = score(ox, oz, strictness < 2);
					evaluated++;
					if (s.acceptable(strictness)) {
						logSearch(start, evaluated, strictness);
						return new Site(ox, oz, grade, sea, "coastal search, strictness " + strictness + ", " + evaluated + " candidates");
					}
					if (s.value > bestValue) {
						bestValue = s.value;
						best = new Site(ox, oz, grade, sea, "best available after " + evaluated + " candidates (no ideal coast)");
					}
				}
			}
		}
		logSearch(start, evaluated, 3);
		return best != null ? best : new Site(minR & ~15, minR & ~15, grade, sea, "fallback");
	}

	private void logSearch(long start, int evaluated, int strictness) {
		NuclearStation.LOG.info("Site search evaluated {} candidates in {} ms (relaxation level {})", evaluated,
			TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start), strictness);
	}

	private static boolean overlapsSpawn(int ox, int oz) {
		return ox < 160 && ox + Blueprint.SIZE > -160 && oz < 160 && oz + Blueprint.SIZE > -160;
	}

	private Holder<Biome> biome(int x, int z) {
		return biomes.getNoiseBiome(QuartPos.fromBlock(x), QuartPos.fromBlock(sea), QuartPos.fromBlock(z));
	}

	private Score score(int ox, int oz, boolean checkExisting) {
		int ocean = 0;
		int oceanSamples = 0;
		for (int lz : new int[] {Blueprint.SEA_Z + 20, Blueprint.SEA_Z + 70, Blueprint.SIZE - 8}) {
			for (int lx = 64; lx < Blueprint.SIZE; lx += 128) {
				oceanSamples++;
				if (biome(ox + lx, oz + lz).is(BiomeTags.IS_OCEAN)) {
					ocean++;
				}
			}
		}
		int land = 0;
		int landSamples = 0;
		for (int lz = 80; lz < Blueprint.SHORE_Z; lz += 160) {
			for (int lx = 64; lx < Blueprint.SIZE; lx += 128) {
				landSamples++;
				Holder<Biome> b = biome(ox + lx, oz + lz);
				if (!b.is(BiomeTags.IS_OCEAN) && !b.is(BiomeTags.IS_RIVER)) {
					land++;
				}
			}
		}
		double oceanFrac = (double) ocean / oceanSamples;
		double landFrac = (double) land / landSamples;
		boolean oceanOk = oceanFrac >= 0.7;
		boolean landOk = landFrac >= 0.75;
		double value = oceanFrac + landFrac;
		boolean flat = false;
		boolean villageFree = true;
		boolean untouched = true;
		if (oceanFrac >= 0.4 && landFrac >= 0.5) {
			int near = 0;
			double dev = 0;
			int n = 0;
			for (int lz = 80; lz < Blueprint.SHORE_Z; lz += 200) {
				for (int lx = 64; lx < Blueprint.SIZE; lx += 192) {
					int h = generator.getBaseHeight(ox + lx, oz + lz, Heightmap.Types.WORLD_SURFACE_WG, level, randomState);
					dev += Math.abs(h - (sea + 5));
					if (h >= sea - 4 && h <= sea + 24) {
						near++;
					}
					n++;
				}
			}
			flat = (double) near / n >= 0.7;
			value += (double) near / n - dev / n / 40.0;
			int centreChunkX = (ox + Blueprint.SIZE / 2) >> 4;
			int centreChunkZ = (oz + Blueprint.SIZE / 2) >> 4;
			if (villages.isPresent()) {
				villageFree = !level.getChunkSource().getGeneratorState().hasStructureChunkInRange(villages.get(), centreChunkX, centreChunkZ, 40);
			}
			if (checkExisting) {
				untouched = !hasGeneratedChunks(ox, oz);
			}
			value += villageFree ? 0.5 : 0;
			value += untouched ? 2 : -5;
		}
		return new Score(oceanOk, landOk, flat, villageFree, untouched, value);
	}

	/** Samples the footprint for chunks that already exist on disk (previous exploration or builds). */
	private boolean hasGeneratedChunks(int ox, int oz) {
		int cx0 = ox >> 4;
		int cz0 = oz >> 4;
		for (int i = 0; i < Blueprint.CHUNKS; i += 9) {
			for (int j = 0; j < Blueprint.CHUNKS; j += 9) {
				ChunkPos pos = new ChunkPos(cx0 + i, cz0 + j);
				if (level.getChunkSource().hasChunk(pos.x(), pos.z())) {
					return true;
				}
				try {
					if (level.getChunkSource().chunkMap.read(pos).get(2, TimeUnit.SECONDS).isPresent()) {
						return true;
					}
				} catch (Exception e) {
					NuclearStation.LOG.debug("Chunk existence check failed at {}: {}", pos, e.toString());
				}
			}
		}
		return false;
	}
}
