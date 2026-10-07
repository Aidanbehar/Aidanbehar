package dev.timeskip.sim.enderman;

import dev.timeskip.math.EndermanMath;
import dev.timeskip.math.Rng;
import dev.timeskip.sim.block.ChunkSnapshot;
import dev.timeskip.sim.block.PlanScope;
import it.unimi.dsi.fastutil.bytes.ByteArrayList;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import it.unimi.dsi.fastutil.objects.Reference2ByteOpenHashMap;
import net.minecraft.core.BlockPos;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.PalettedContainer;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;
import net.minecraft.world.phys.shapes.CollisionContext;

/**
 * Works out what endermen could do in one chunk (worker thread, snapshot only). How many blocks
 * actually move is decided later by {@link EndermanPhase}, once every chunk's share of the monster
 * cap is known.
 *
 * <ol>
 *   <li><b>Standing spots:</b> every position a monster can spawn and stand in — a block that
 *       passes vanilla's {@code isValidSpawn} below and three blocks without collision or fluid
 *       (2.9 blocks tall, avoids water), more than 24 and at most 128 blocks from the nearest
 *       player. Weight = the day-averaged chance vanilla's darkness test passes there
 *       ({@link EndermanPopulation#spotWeight}) ÷ the column height (vanilla picks the spawn
 *       height uniformly in the column) × the share of open blocks around it at that height
 *       (an attempt whose start block is solid is thrown away; {@link StartBlocks}) × the dry
 *       share of the time for open-sky spots where it rains. Their sum is the chunk's spawn
 *       weight.</li>
 *   <li><b>Pickup success per attempt</b> at every spot: the exact vanilla target distribution
 *       ({@link EndermanMath#pickupOffsetProbability}) over the 5×3×5 box, counting targets in
 *       {@code #enderman_holdable} that vanilla's own ray cast ({@code BlockGetter.clip} with
 *       {@code OUTLINE}, run on the snapshot) reaches. Targets near the chunk border are weighted
 *       up by {@link EndermanMath#borderCompensation} for the endermen standing in the neighbouring
 *       chunk. Gives the weighted mean success and the holdable blocks any spot can reach.</li>
 *   <li><b>Candidates:</b> up to {@code enderman_max_disturbed_percent} of the reachable blocks,
 *       distinct, drawn spot ∝ weight × success and target ∝ its offset probability, each with
 *       how its enderman wanders before placing ({@link EndermanPlacement.Wander}).</li>
 * </ol>
 */
public final class EndermanPlanner {
    private static final long SALT = 0x454E4445L;
    private static final byte PASSABLE = 1;
    private static final byte FULL_TOP = 2;
    private static final byte HOLDABLE = 4;
    private static final byte CONDUCTOR = 8;
    /** Pack members land within a few blocks of the attempt's start (steps of nextInt(6) - nextInt(6)). */
    private static final int START_RADIUS = 4;

    private EndermanPlanner() {
    }

    /** A standing spot with its pickup success per attempt and its reachable holdable targets. */
    private record Sample(long feet, double pPick, long[] targets, double[] targetProbability) {
    }

    public static void plan(PlanScope scope) {
        ChunkSnapshot snap = scope.snapshot;
        if (!snap.monstersSpawn) {
            return;
        }
        EndermanPopulation population = scope.info.endermen;
        Classifier cls = new Classifier(snap);

        // 1) Standing spots in spawn range and their weights.
        LongArrayList spots = new LongArrayList();
        DoubleArrayList weights = new DoubleArrayList();
        findSpots(scope, snap, cls, spots, weights);
        double spawnWeight = 0;
        for (int i = 0; i < weights.size(); i++) {
            spawnWeight += weights.getDouble(i);
        }
        if (spawnWeight <= 0) {
            return;
        }
        int percent = scope.config.endermanMaxDisturbedPercent;
        if (snap.endermanShare <= 0 || percent <= 0) {
            scope.setEndermen(EndermanChunk.spawnOnly(scope.info, snap.pos, spawnWeight));
            return;
        }

        // 2) Every spot: pickup success per attempt and the holdable blocks it can reach.
        Sample[] measured = new Sample[spots.size()];
        double[] pickCumulative = new double[spots.size()];
        LongOpenHashSet reachableSet = new LongOpenHashSet();
        double weightedPick = 0;
        for (int i = 0; i < spots.size(); i++) {
            Sample sample = measure(snap, cls, spots.getLong(i));
            measured[i] = sample;
            weightedPick += weights.getDouble(i) * sample.pPick;
            pickCumulative[i] = weightedPick;
            for (long target : sample.targets) {
                reachableSet.add(target);
            }
        }
        int reachable = reachableSet.size();
        if (weightedPick <= 0 || reachable == 0) {
            scope.setEndermen(EndermanChunk.spawnOnly(scope.info, snap.pos, spawnWeight));
            return;
        }

        // 3) Candidates, in random order: spot ∝ weight × success, then target ∝ its offset probability.
        int limit = (int) Math.min(reachable, Math.ceil(reachable * percent / 100.0));
        Rng rng = scope.rng(snap.minX, 2, snap.minZ, SALT);
        double teleportChance = population.teleportChance(snap.rainsHere);
        LongOpenHashSet chosen = new LongOpenHashSet();
        LongArrayList targets = new LongArrayList();
        LongArrayList feet = new LongArrayList();
        ByteArrayList wander = new ByteArrayList();
        long attempts = (long) limit * 8;
        for (long a = 0; a < attempts && targets.size() < limit; a++) {
            Sample sample = measured[search(pickCumulative, rng.nextDouble() * weightedPick)];
            if (sample.targets.length == 0) {
                continue;
            }
            double u = rng.nextDouble() * sample.pPick;
            int t = 0;
            while (t < sample.targets.length - 1 && (u -= sample.targetProbability[t]) > 0) {
                t++;
            }
            long target = sample.targets[t];
            if (!chosen.add(target)) {
                continue;
            }
            int fx = BlockPos.getX(sample.feet);
            int fy = BlockPos.getY(sample.feet);
            int fz = BlockPos.getZ(sample.feet);
            EndermanPlacement.Wander how;
            if (population.nearPlayer(fx, fy, fz)) {
                how = EndermanPlacement.Wander.STROLL;
            } else if (teleportChance > 0 && snap.skyLight(fx, fy, fz) >= 15) {
                how = EndermanPlacement.Wander.SKY;
            } else {
                how = EndermanPlacement.Wander.STAY;
            }
            targets.add(target);
            feet.add(sample.feet);
            wander.add((byte) how.ordinal());
        }
        scope.setEndermen(new EndermanChunk(scope.info, snap.pos, spawnWeight, snap.endermanShare,
                weightedPick / spawnWeight, reachable, teleportChance,
                targets.toLongArray(), feet.toLongArray(), wander.toByteArray()));
    }

    // ------------------------------------------------------------------------------------------

    /** One bottom-up pass per column: a spot is a full-topped block followed by 3 passable ones. */
    private static void findSpots(PlanScope scope, ChunkSnapshot snap, Classifier cls,
                                  LongArrayList spots, DoubleArrayList weights) {
        EndermanPopulation population = scope.info.endermen;
        StartBlocks starts = new StartBlocks(snap, cls);
        double openSkyInRain = snap.rainsHere ? 1.0 - population.rainFraction() : 1.0;
        int minY = snap.getMinY();
        int maxY = minY + snap.getHeight() - 1;
        for (int lz = 0; lz < 16; lz++) {
            for (int lx = 0; lx < 16; lx++) {
                int x = snap.minX + lx;
                int z = snap.minZ + lz;
                int top = topNonAir(snap, x, z, minY, maxY);
                if (top < minY) {
                    continue;
                }
                double columnNorm = 1.0 / (top + 2 - minY); // vanilla picks y in [minY, top + 1]
                int passRun = 0;
                int fullAt = Integer.MIN_VALUE;
                for (int y = minY; y <= Math.min(maxY, top + 3); y++) {
                    byte flags = cls.flags(x, y, z);
                    if ((flags & PASSABLE) != 0) {
                        passRun++;
                        if (passRun == 3 && fullAt == y - 3) {
                            int feet = y - 2;
                            double w = 0.0;
                            if (population.inSpawnRange(x, feet, z)) {
                                int sky = snap.skyLight(x, feet, z);
                                w = population.spotWeight(sky, snap.blockLight(x, feet, z)) * columnNorm
                                        * starts.fraction(lx, feet, lz) * (sky >= 15 ? openSkyInRain : 1.0);
                            }
                            if (w > 0) {
                                long packed = BlockPos.asLong(x, feet, z);
                                spots.add(packed);
                                weights.add(w);
                            }
                        }
                    } else {
                        passRun = 0;
                        fullAt = (flags & FULL_TOP) != 0 ? y : Integer.MIN_VALUE;
                    }
                }
            }
        }
    }

    private static int topNonAir(ChunkSnapshot snap, int x, int z, int minY, int maxY) {
        for (int index = snap.sectionCount() - 1; index >= 0; index--) {
            PalettedContainer<BlockState> section = snap.section(index);
            if (section == null) {
                continue;
            }
            int base = snap.sectionMinY(index);
            for (int ly = 15; ly >= 0; ly--) {
                if (!section.get(x & 15, ly, z & 15).isAir()) {
                    return Math.min(maxY, base + ly);
                }
            }
        }
        return minY - 1;
    }

    /** Pickup success per attempt at one spot, and its reachable holdable targets. */
    private static Sample measure(ChunkSnapshot snap, Classifier cls, long feet) {
        int fx = BlockPos.getX(feet);
        int fy = BlockPos.getY(feet);
        int fz = BlockPos.getZ(feet);
        LongArrayList targets = new LongArrayList();
        DoubleArrayList probabilities = new DoubleArrayList();
        double pPick = 0;
        for (int dy = 0; dy < EndermanMath.PICKUP_Y.length; dy++) {
            for (int dx = -2; dx <= 2; dx++) {
                for (int dz = -2; dz <= 2; dz++) {
                    int tx = fx + dx;
                    int ty = fy + dy;
                    int tz = fz + dz;
                    if ((cls.flags(tx, ty, tz) & HOLDABLE) == 0 || !reachable(snap, fx, fz, tx, ty, tz)) {
                        continue;
                    }
                    double p = EndermanMath.pickupOffsetProbability(dx, dy, dz) * EndermanMath.borderCompensation(tx & 15, tz & 15);
                    pPick += p;
                    targets.add(BlockPos.asLong(tx, ty, tz));
                    probabilities.add(p);
                }
            }
        }
        return new Sample(feet, pPick, targets.toLongArray(), probabilities.toDoubleArray());
    }

    /**
     * Vanilla's line-of-sight test: a ray at the target's height from the centre of the enderman's
     * column to the target's centre must first hit the target itself.
     */
    static boolean reachable(ChunkSnapshot snap, int fx, int fz, int tx, int ty, int tz) {
        Vec3 from = new Vec3(fx + 0.5, ty + 0.5, fz + 0.5);
        Vec3 to = new Vec3(tx + 0.5, ty + 0.5, tz + 0.5);
        BlockHitResult hit = snap.clip(new ClipContext(from, to, ClipContext.Block.OUTLINE, ClipContext.Fluid.NONE, CollisionContext.empty()));
        BlockPos pos = hit.getBlockPos();
        return pos.getX() == tx && pos.getY() == ty && pos.getZ() == tz;
    }

    private static int search(double[] cumulative, double value) {
        int lo = 0;
        int hi = cumulative.length - 1;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (cumulative[mid] <= value) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo;
    }

    /**
     * {@code NaturalSpawner.spawnCategoryForPosition} throws an attempt away if its random start
     * block is a redstone conductor (stone, dirt...), then spreads the pack a few blocks sideways at
     * the start's height. So a spot gets spawns in proportion to the open (non-conductor) blocks
     * around it at its own height: a narrow tunnel far fewer than open ground.
     */
    private static final class StartBlocks {
        private static final int SIDE = 17;
        private final ChunkSnapshot snap;
        private final Classifier cls;
        private final Int2ObjectOpenHashMap<int[]> prefixByY = new Int2ObjectOpenHashMap<>();

        StartBlocks(ChunkSnapshot snap, Classifier cls) {
            this.snap = snap;
            this.cls = cls;
        }

        /** Share of open blocks at height {@code y} within {@link #START_RADIUS} of local (lx, lz). */
        double fraction(int lx, int y, int lz) {
            int[] p = prefixByY.computeIfAbsent(y, this::build);
            int x0 = Math.max(0, lx - START_RADIUS);
            int x1 = Math.min(15, lx + START_RADIUS);
            int z0 = Math.max(0, lz - START_RADIUS);
            int z1 = Math.min(15, lz + START_RADIUS);
            int open = p[(z1 + 1) * SIDE + x1 + 1] - p[z0 * SIDE + x1 + 1] - p[(z1 + 1) * SIDE + x0] + p[z0 * SIDE + x0];
            return open / (double) ((x1 - x0 + 1) * (z1 - z0 + 1));
        }

        private int[] build(int y) {
            int[] p = new int[SIDE * SIDE];
            for (int z = 0; z < 16; z++) {
                for (int x = 0; x < 16; x++) {
                    int open = (cls.flags(snap.minX + x, y, snap.minZ + z) & CONDUCTOR) == 0 ? 1 : 0;
                    p[(z + 1) * SIDE + x + 1] = open + p[z * SIDE + x + 1] + p[(z + 1) * SIDE + x] - p[z * SIDE + x];
                }
            }
            return p;
        }
    }

    /** Per-state flags, cached (a chunk has a few dozen distinct states). */
    private static final class Classifier {
        private final ChunkSnapshot snap;
        private final Reference2ByteOpenHashMap<BlockState> cache = new Reference2ByteOpenHashMap<>();
        private final BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();

        Classifier(ChunkSnapshot snap) {
            this.snap = snap;
            cache.defaultReturnValue((byte) -1);
        }

        byte flags(int x, int y, int z) {
            BlockState state = snap.get(x, y, z);
            byte cached = cache.getByte(state);
            if (cached >= 0) {
                return cached;
            }
            byte flags = 0;
            if (!ChunkSnapshot.isUnknown(state)) {
                pos.set(x, y, z);
                if (state.getCollisionShape(snap, pos).isEmpty() && state.getFluidState().isEmpty()) {
                    flags |= PASSABLE;
                }
                // Vanilla's spawn ground test (no spawning on leaves, glass, bedrock, magma...).
                if (state.isValidSpawn(snap, pos, EntityTypes.ENDERMAN)) {
                    flags |= FULL_TOP;
                }
                if (state.is(BlockTags.ENDERMAN_HOLDABLE)) {
                    flags |= HOLDABLE;
                }
                if (state.isRedstoneConductor(snap, pos)) {
                    flags |= CONDUCTOR;
                }
            }
            cache.put(state, flags);
            return flags;
        }
    }
}
