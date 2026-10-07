package dev.timeskip.sim.enderman;

import dev.timeskip.math.EndermanMath;
import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.valueproviders.IntProvider;
import net.minecraft.world.Difficulty;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.attribute.EnvironmentAttributes;
import net.minecraft.world.level.biome.MobSpawnSettings;
import net.minecraft.world.level.chunk.LevelChunk;
import net.minecraft.world.level.dimension.DimensionType;
import net.minecraft.world.level.gamerules.GameRules;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.util.random.Weighted;

/**
 * Where and how many endermen there are during a skip, from vanilla's spawning rules (created on
 * the main thread at skip start; the per-spot queries are then also used by worker threads).
 *
 * <ul>
 *   <li><b>Whether at all:</b> vanilla only spawns near a (non-spectator) player, only with
 *       {@code spawn_mobs} and {@code spawn_monsters} on ({@code ServerLevel.isSpawningMonsters})
 *       and difficulty above peaceful, and endermen only move blocks with {@code mob_griefing}.</li>
 *   <li><b>Which chunks:</b> spawning chunks are entity-ticking chunks whose centre is within 128
 *       blocks (horizontally) of a player ({@code ChunkMap.collectSpawningChunks}).</li>
 *   <li><b>How many monsters:</b> near players the monster category sits at its cap almost all the
 *       time. The cap is {@code 70 × spawnableChunks / 289} ({@code NaturalSpawner.SpawnState}),
 *       where spawnable chunks are those within 8 chunks of a player — 70 per player. Those
 *       monsters are shared among the spawning chunks in proportion to how often a spawn attempt
 *       succeeds there (the chunk's summed spot weight), which the enderman phase does once every
 *       chunk has been planned.</li>
 *   <li><b>How many of them are endermen:</b> the monster spawn list vanilla reads at that spot
 *       ({@code EnvironmentAttributes.NATURAL_MOB_SPAWNS}, so datapack and modded biomes work):
 *       the enderman share of expected individuals, {@code Σ weight·meanGroupSize} for endermen
 *       over the same sum for all monsters. That makes most Overworld biomes about 1.2%, The End
 *       and warped forests 100%, mushroom fields and the deep dark 0. Biomes with a spawn cost for
 *       endermen (warped forest, soul sand valley) are further limited by vanilla's
 *       spawn-potential rule: roughly {@code budget/charge² × 128} costed mobs per player.</li>
 *   <li><b>Where inside a chunk:</b> {@link #spotWeight} — the chance that vanilla's
 *       {@code Monster.isDarkEnoughToSpawn} passes for a spot's sky/block light, averaged over a
 *       day if time moves — times {@link #inSpawnRange}: more than 24 and at most 128 blocks (3D)
 *       from the nearest player, as {@code NaturalSpawner} requires. The planner divides by the
 *       column height because vanilla picks the spawn height uniformly in the column.</li>
 * </ul>
 */
public final class EndermanPopulation {
    /** Vanilla's spawn-range check: chunks within 128 blocks of a player can spawn mobs. */
    private static final double SPAWN_RANGE = 128.0;
    private static final double SPAWN_RANGE_SQR = SPAWN_RANGE * SPAWN_RANGE;
    /** {@code NaturalSpawner.isRightDistanceToPlayerAndSpawnPoint}: nothing spawns this close (24²). */
    private static final double MIN_SPAWN_DISTANCE_SQR = 576.0;
    /** {@code MobCategory.MONSTER} no-despawn distance: closer than this, mobs keep strolling. */
    private static final double STROLL_DISTANCE_SQR = 32.0 * 32.0;
    /** {@code NaturalSpawner.MAGIC_NUMBER}: the cap scales with spawnable chunks / 17². */
    private static final int CAP_CHUNK_AREA = 17 * 17;
    /** Spawnable chunks: within 8 chunks of a player ({@code DistanceManager.naturalSpawnChunkCounter}). */
    private static final int CAP_CHUNK_RADIUS = 8;
    /**
     * Surface carriers that see daylight while carrying: picked up at a random point of the night,
     * placed after about 2000/pPlace ≈ 3000-6000 ticks, so roughly a third are still carrying at
     * dawn and teleport away from the sun ({@code Enderman.customServerAiStep}).
     */
    private static final double DAWN_TELEPORT_CHANCE = 1.0 / 3.0;

    private final ServerLevel level;
    private final boolean active;
    private final double totalCap;
    private final double[] players;
    private final double teleportChance;
    private final double[][] lightWeight = new double[16][16];
    private final Map<MobSpawnSettings, double[]> shareBySettings = new IdentityHashMap<>();

    public EndermanPopulation(ServerLevel level, boolean enabled, boolean dayCycle) {
        this.level = level;
        boolean griefing = level.getGameRules().get(GameRules.MOB_GRIEFING);
        boolean spawning = level.isSpawningMonsters();
        boolean peaceful = level.getDifficulty() == Difficulty.PEACEFUL;
        List<ServerPlayer> list = level.players().stream().filter(p -> !p.isSpectator()).toList();
        this.active = enabled && griefing && spawning && !peaceful && !list.isEmpty();
        this.players = new double[list.size() * 3];
        LongOpenHashSet capChunks = new LongOpenHashSet();
        for (int i = 0; i < list.size(); i++) {
            ServerPlayer player = list.get(i);
            players[3 * i] = player.getX();
            players[3 * i + 1] = player.getY();
            players[3 * i + 2] = player.getZ();
            ChunkPos at = player.chunkPosition();
            for (int dx = -CAP_CHUNK_RADIUS; dx <= CAP_CHUNK_RADIUS; dx++) {
                for (int dz = -CAP_CHUNK_RADIUS; dz <= CAP_CHUNK_RADIUS; dz++) {
                    capChunks.add(ChunkPos.pack(at.x() + dx, at.z() + dz));
                }
            }
        }
        this.totalCap = (double) MobCategory.MONSTER.getMaxInstancesPerChunk() * capChunks.size() / CAP_CHUNK_AREA;
        boolean timeMoves = dayCycle && level.getServer().getGlobalGameRules().get(GameRules.ADVANCE_TIME);
        this.teleportChance = timeMoves ? DAWN_TELEPORT_CHANCE : (dayCycle && level.isBrightOutside() ? 1.0 : 0.0);
        buildLightTable(level.dimensionType(), timeMoves, level.getSkyDarken());
        if (EndermanPlacement.DEBUG) {
            EndermanPlacement.LOGGER.info("[Time Skip] endermen in {}: active={} (enabled={}, mobGriefing={}, spawning monsters={}, peaceful={}, players={}), monster cap {}",
                    level.dimension().identifier(), active, enabled, griefing, spawning, peaceful, list.size(), totalCap);
        }
    }

    public boolean active() {
        return active;
    }

    /** Free monsters the level holds near its players (all spawning chunks together). */
    public double totalCap() {
        return totalCap;
    }

    /** Chance that a carrier picked up under open sky teleports away from daylight before placing. */
    public double teleportChance() {
        return teleportChance;
    }

    /**
     * Enderman share of the monsters spawning in this chunk (main thread): 0 if nothing spawns here;
     * NaN-free. Averages the spawn lists at the surface and halfway down (caves).
     */
    public double endermanShare(LevelChunk chunk) {
        double[] surface = shares(chunk, true);
        double[] middle = shares(chunk, false);
        return 0.5 * (surface[0] + middle[0]);
    }

    /** True if vanilla's spawner would run in this chunk and some monster can spawn in it (main thread). */
    public boolean monstersSpawn(LevelChunk chunk) {
        if (!active || !isSpawningChunk(chunk.getPos())) {
            return false;
        }
        return shares(chunk, true)[1] > 0 || shares(chunk, false)[1] > 0;
    }

    private boolean isSpawningChunk(ChunkPos pos) {
        double cx = pos.getMiddleBlockX();
        double cz = pos.getMiddleBlockZ();
        boolean near = false;
        for (int i = 0; i < players.length; i += 3) {
            double dx = players[i] - cx;
            double dz = players[i + 2] - cz;
            if (dx * dx + dz * dz <= SPAWN_RANGE_SQR) {
                near = true;
                break;
            }
        }
        return near && level.isPositionEntityTicking(new BlockPos((int) cx, level.getSeaLevel(), (int) cz));
    }

    /** {share, monsters can spawn ? 1 : 0} for the spawn list at the surface or halfway down. */
    private double[] shares(LevelChunk chunk, boolean surface) {
        ChunkPos pos = chunk.getPos();
        int top = chunk.getHeight(Heightmap.Types.WORLD_SURFACE, 8, 8) + 1;
        int y = surface ? top : (level.getMinY() + top) / 2;
        MobSpawnSettings settings = level.environmentAttributes().getValue(EnvironmentAttributes.NATURAL_MOB_SPAWNS,
                new BlockPos(pos.getMiddleBlockX(), y, pos.getMiddleBlockZ()));
        return shareBySettings.computeIfAbsent(settings, EndermanPopulation::shareFor);
    }

    /** Spawn share of endermen, limited by the spawn-cost rule, plus whether any monster spawns. */
    static double[] shareFor(MobSpawnSettings settings) {
        double ender = 0;
        double total = 0;
        for (Weighted<MobSpawnSettings.SpawnerData> entry : settings.getMobsToSpawn(MobCategory.MONSTER).unwrap()) {
            IntProvider count = entry.value().count();
            double individuals = entry.weight() * (count.minInclusive() + count.maxInclusive()) / 2.0;
            total += individuals;
            if (entry.value().type() == EntityTypes.ENDERMAN) {
                ender += individuals;
            }
        }
        double share = total <= 0 ? 0.0 : ender / total;
        MobSpawnSettings.MobSpawnCost cost = settings.getMobSpawnCost(EntityTypes.ENDERMAN);
        if (share > 0 && cost != null && cost.charge() > 0) {
            // NaturalSpawner's potential rule caps costed mobs at about budget/charge² × range per
            // player, out of the 70 the cap would otherwise allow.
            double allowed = cost.energyBudget() / (cost.charge() * cost.charge()) * SPAWN_RANGE;
            share = Math.min(share, share * allowed / MobCategory.MONSTER.getMaxInstancesPerChunk());
        }
        return new double[] {share, total > 0 ? 1.0 : 0.0};
    }

    /** True if a monster may spawn at this spot: more than 24 and at most 128 blocks from the nearest player. */
    public boolean inSpawnRange(int x, int feetY, int z) {
        double nearest = nearestPlayerSqr(x, feetY, z);
        return nearest > MIN_SPAWN_DISTANCE_SQR && nearest <= SPAWN_RANGE_SQR;
    }

    /** True if a player is within 32 blocks, so mobs here keep strolling ({@code noActionTime} resets). */
    public boolean nearPlayer(int x, int feetY, int z) {
        return nearestPlayerSqr(x, feetY, z) < STROLL_DISTANCE_SQR;
    }

    private double nearestPlayerSqr(int x, int feetY, int z) {
        double best = Double.POSITIVE_INFINITY;
        for (int i = 0; i < players.length; i += 3) {
            double dx = players[i] - (x + 0.5);
            double dy = players[i + 1] - feetY;
            double dz = players[i + 2] - (z + 0.5);
            best = Math.min(best, dx * dx + dy * dy + dz * dz);
        }
        return best;
    }

    /** Relative chance that a monster spawns on (and so endermen roam) a spot with this light. */
    public double spotWeight(int skyLight, int blockLight) {
        return lightWeight[clamp(skyLight)][clamp(blockLight)];
    }

    /** Spawn-light weight for every sky/block light pair (see {@link EndermanMath#spawnLightPass}). */
    private void buildLightTable(DimensionType type, boolean dayCycle, int fixedDarken) {
        IntProvider test = type.monsterSpawnLightTest();
        for (int sky = 0; sky < 16; sky++) {
            for (int block = 0; block < 16; block++) {
                lightWeight[sky][block] = EndermanMath.spawnLightPass(sky, block, test.minInclusive(), test.maxInclusive(),
                        type.monsterSpawnBlockLightLimit(), type.hasSkyLight(), dayCycle, fixedDarken);
            }
        }
    }

    private static int clamp(int light) {
        return Math.max(0, Math.min(15, light));
    }
}
