package dev.timeskip.sim.block;

import dev.timeskip.config.TimeSkipConfig;
import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.math.RandomTickMath;
import dev.timeskip.math.Rng;
import dev.timeskip.sim.LevelInfo;
import dev.timeskip.sim.SimContext;
import dev.timeskip.sim.block.handlers.CopperCluster;
import dev.timeskip.sim.block.handlers.GrassSpread;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.block.state.BlockState;

/** What a handler can see and do while planning one chunk. */
public final class PlanScope {
    public final SimContext sim;
    public final LevelInfo info;
    public final ChunkSnapshot snapshot;
    public final TimeSkipConfig config;
    public final long trials;
    private final ChunkPlan.Builder builder = new ChunkPlan.Builder();
    private final BlockPos.MutableBlockPos mutable = new BlockPos.MutableBlockPos();
    private CopperCluster copper;
    private GrassSpread grass;

    public PlanScope(SimContext sim, ChunkSnapshot snapshot) {
        this.sim = sim;
        this.info = snapshot.info;
        this.snapshot = snapshot;
        this.config = sim.config;
        this.trials = info.trials;
    }

    public Rng rng(int x, int y, int z, long salt) {
        return sim.rng(info, x, y, z, salt);
    }

    /** Random ticks this block receives during the skip. */
    public long randomTicks(int x, int y, int z, long salt) {
        return RandomTickMath.randomTicks(trials, rng(x, y, z, salt));
    }

    /** True if the block gets at least one random tick (practically always for skips of a day or more). */
    public boolean ticked(int x, int y, int z, long salt) {
        return RandomTickMath.successes(trials, 1.0, 1, rng(x, y, z, salt)) >= 1;
    }

    public BlockPos pos(int x, int y, int z) {
        return mutable.set(x, y, z);
    }

    public static long pack(int x, int y, int z) {
        return BlockPos.asLong(x, y, z);
    }

    public void add(PlanAction action) {
        builder.add(action);
    }

    public void set(int x, int y, int z, BlockState from, BlockState to, Stat stat, int amount) {
        if (from != to) {
            builder.add(new Actions.SetBlock(pack(x, y, z), from, to, stat, amount));
        }
    }

    public CopperCluster copper() {
        if (copper == null) {
            copper = new CopperCluster(this);
        }
        return copper;
    }

    public GrassSpread grass() {
        if (grass == null) {
            grass = new GrassSpread(this);
        }
        return grass;
    }

    /** Runs chunk-wide aggregations (copper clusters, grass spread) and returns the plan. */
    public ChunkPlan finish() {
        if (copper != null) {
            copper.finish();
        }
        if (grass != null) {
            grass.finish();
        }
        return builder.build(snapshot);
    }
}
