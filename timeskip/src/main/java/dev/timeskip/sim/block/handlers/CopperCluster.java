package dev.timeskip.sim.block.handlers;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.math.Binomial;
import dev.timeskip.math.RandomTickMath;
import dev.timeskip.math.Rng;
import dev.timeskip.sim.block.PlanScope;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.longs.Long2IntOpenHashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import net.minecraft.world.level.block.ChangeOverTimeBlock;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Event-driven simulation of copper weathering ({@link ChangeOverTimeBlock#changeOverTime}) for all
 * weathering blocks in a chunk, using vanilla's exact rule:
 * <ul>
 *   <li>each random tick, 0.05688889 chance to attempt;</li>
 *   <li>abort if any same-type block within Manhattan distance 4 is younger;</li>
 *   <li>otherwise succeed with {@code ((older + 1) / (older + same + 1))^2 * chanceModifier}.</li>
 * </ul>
 * Attempts are drawn as one Poisson-superposed stream over the whole cluster (each attempt picks a
 * uniformly random block), and neighbour age counts are maintained incrementally, so a large roof
 * costs O(attempts + advances * neighbours) instead of a scan per attempt.
 */
public final class CopperCluster {
    private static final float ATTEMPT_CHANCE = 0.05688889F;
    private static final int SCAN = ChangeOverTimeBlock.SCAN_DISTANCE;
    /** Attempts per block after which we stop simulating and jump to the fully weathered state. */
    private static final long ATTEMPT_CAP_PER_BLOCK = 2_000;
    private static final long SALT = 0x434F5050L;

    private final PlanScope scope;
    private final IntArrayList xs = new IntArrayList();
    private final IntArrayList ys = new IntArrayList();
    private final IntArrayList zs = new IntArrayList();
    private final List<BlockState> states = new ArrayList<>();

    public CopperCluster(PlanScope scope) {
        this.scope = scope;
    }

    public void add(int x, int y, int z, BlockState state) {
        xs.add(x);
        ys.add(y);
        zs.add(z);
        states.add(state);
    }

    public void finish() {
        int n = states.size();
        if (n == 0) {
            return;
        }
        BlockState[] current = states.toArray(new BlockState[0]);
        BlockState[] original = current.clone();
        int[] age = new int[n];
        Class<?>[] type = new Class<?>[n];
        Long2IntOpenHashMap index = new Long2IntOpenHashMap(n * 2);
        index.defaultReturnValue(-1);
        for (int i = 0; i < n; i++) {
            ChangeOverTimeBlock<?> block = (ChangeOverTimeBlock<?>) current[i].getBlock();
            age[i] = block.getAge().ordinal();
            type[i] = block.getAge().getClass();
            index.put(PlanScope.pack(xs.getInt(i), ys.getInt(i), zs.getInt(i)), i);
        }

        // Neighbour lists (same ageing type, Manhattan distance <= 4, inside this chunk).
        int[][] neighbours = new int[n][];
        IntArrayList tmp = new IntArrayList();
        for (int i = 0; i < n; i++) {
            tmp.clear();
            int x = xs.getInt(i);
            int y = ys.getInt(i);
            int z = zs.getInt(i);
            for (int dx = -SCAN; dx <= SCAN; dx++) {
                int rx = SCAN - Math.abs(dx);
                for (int dy = -rx; dy <= rx; dy++) {
                    int rz = rx - Math.abs(dy);
                    for (int dz = -rz; dz <= rz; dz++) {
                        if (dx == 0 && dy == 0 && dz == 0) {
                            continue;
                        }
                        int j = index.get(PlanScope.pack(x + dx, y + dy, z + dz));
                        if (j >= 0 && type[j] == type[i]) {
                            tmp.add(j);
                        }
                    }
                }
            }
            neighbours[i] = tmp.toIntArray();
        }

        int[] younger = new int[n];
        int[] same = new int[n];
        int[] older = new int[n];
        for (int i = 0; i < n; i++) {
            recount(i, age, neighbours, younger, same, older);
        }

        boolean[] canAdvance = new boolean[n];
        int advanceable = 0;
        for (int i = 0; i < n; i++) {
            canAdvance[i] = next(current[i]).isPresent();
            if (canAdvance[i]) {
                advanceable++;
            }
        }
        if (advanceable == 0) {
            return;
        }

        Rng rng = scope.rng(scope.snapshot.minX, 0, scope.snapshot.minZ, SALT);
        long clusterTrials = scope.trials > Long.MAX_VALUE / n ? Long.MAX_VALUE : scope.trials * n;
        long attempts = Binomial.sample(clusterTrials, ATTEMPT_CHANCE / RandomTickMath.SECTION_VOLUME, rng);
        long cap = ATTEMPT_CAP_PER_BLOCK * n;
        boolean saturated = attempts > cap;
        attempts = Math.min(attempts, cap);

        int[] steps = new int[n];
        for (long a = 0; a < attempts && advanceable > 0; a++) {
            int i = rng.nextInt(n);
            if (!canAdvance[i] || younger[i] > 0) {
                continue;
            }
            float base = (float) (older[i] + 1) / (older[i] + same[i] + 1);
            float chance = base * base * ((ChangeOverTimeBlock<?>) current[i].getBlock()).getChanceModifier();
            if (rng.nextFloat() >= chance) {
                continue;
            }
            Optional<BlockState> next = next(current[i]);
            if (next.isEmpty()) {
                canAdvance[i] = false;
                advanceable--;
                continue;
            }
            int oldAge = age[i];
            current[i] = next.get();
            age[i] = ((ChangeOverTimeBlock<?>) current[i].getBlock()).getAge().ordinal();
            steps[i]++;
            for (int j : neighbours[i]) {
                adjust(j, oldAge, -1, age, younger, same, older);
                adjust(j, age[i], +1, age, younger, same, older);
            }
            recount(i, age, neighbours, younger, same, older);
            if (next(current[i]).isEmpty()) {
                canAdvance[i] = false;
                advanceable--;
            }
        }

        if (saturated) {
            for (int i = 0; i < n; i++) {
                Optional<BlockState> next;
                int guard = 0;
                while ((next = next(current[i])).isPresent() && guard++ < 16) {
                    current[i] = next.get();
                    steps[i]++;
                }
            }
        }

        for (int i = 0; i < n; i++) {
            if (steps[i] > 0) {
                scope.set(xs.getInt(i), ys.getInt(i), zs.getInt(i), original[i], current[i], Stat.COPPER_WEATHERED, 1);
            }
        }
    }

    private static Optional<BlockState> next(BlockState state) {
        return state.getBlock() instanceof ChangeOverTimeBlock<?> block ? block.getNext(state) : Optional.empty();
    }

    private static void recount(int i, int[] age, int[][] neighbours, int[] younger, int[] same, int[] older) {
        int y = 0;
        int s = 0;
        int o = 0;
        for (int j : neighbours[i]) {
            if (age[j] < age[i]) {
                y++;
            } else if (age[j] > age[i]) {
                o++;
            } else {
                s++;
            }
        }
        younger[i] = y;
        same[i] = s;
        older[i] = o;
    }

    /** Neighbour {@code j} sees a block of age {@code otherAge} appear (+1) or disappear (-1). */
    private static void adjust(int j, int otherAge, int delta, int[] age, int[] younger, int[] same, int[] older) {
        if (otherAge < age[j]) {
            younger[j] += delta;
        } else if (otherAge > age[j]) {
            older[j] += delta;
        } else {
            same[j] += delta;
        }
    }
}
