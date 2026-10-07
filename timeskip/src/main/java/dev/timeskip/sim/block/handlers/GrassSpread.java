package dev.timeskip.sim.block.handlers;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.math.RandomTickMath;
import dev.timeskip.math.Rng;
import dev.timeskip.mixin.SpreadingSnowyBlockAccessor;
import dev.timeskip.sim.block.ChunkSnapshot;
import dev.timeskip.sim.block.PlanScope;
import it.unimi.dsi.fastutil.longs.Long2DoubleOpenHashMap;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import java.util.ArrayList;
import java.util.List;
import java.util.PriorityQueue;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.tags.BlockTags;
import net.minecraft.tags.FluidTags;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.SnowLayerBlock;
import net.minecraft.world.level.block.SnowyBlock;
import net.minecraft.world.level.block.SpreadingSnowyBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.lighting.LightEngine;

/**
 * Grass and mycelium ({@link SpreadingSnowyBlock}).
 *
 * <p>Blocks that can no longer stay alive (covered, or under water) revert to dirt on their next
 * random tick. Living ones spread: on each random tick, if the light above passes 9 (day/night
 * aware), vanilla tries 4 random offsets in a 3x5x3 box (dy from -3 to +1) and converts a base
 * block there if it could support grass. That makes a hop to one particular neighbour a Poisson
 * process with rate {@code speed/4096 * lightFraction * (1 - (44/45)^4)} per tick. Spreading over
 * the chunk is then first-passage percolation: Dijkstra over sampled exponential hop times, and
 * every base block reached within the skip turns into grass.
 */
public final class GrassSpread {
    private static final long SALT = 0x47524153L;
    private static final double HIT_PER_RANDOM_TICK = 1.0 - Math.pow(44.0 / 45.0, 4);

    private record Source(int x, int y, int z, BlockState state) {
    }

    private record Arrival(double time, long pos, SpreadingSnowyBlock block) implements Comparable<Arrival> {
        @Override
        public int compareTo(Arrival other) {
            int c = Double.compare(time, other.time);
            return c != 0 ? c : Long.compare(pos, other.pos);
        }
    }

    private final PlanScope scope;
    private final List<Source> sources = new ArrayList<>();

    public GrassSpread(PlanScope scope) {
        this.scope = scope;
    }

    public void add(int x, int y, int z, BlockState state) {
        sources.add(new Source(x, y, z, state));
    }

    public void finish() {
        ChunkSnapshot snap = scope.snapshot;
        Rng rng = scope.rng(snap.minX, 1, snap.minZ, SALT);
        double perTickRandomTicks = scope.info.randomTickSpeed / RandomTickMath.SECTION_VOLUME;
        long horizon = scope.info.ticks;

        PriorityQueue<Arrival> queue = new PriorityQueue<>();
        Long2DoubleOpenHashMap best = new Long2DoubleOpenHashMap();
        best.defaultReturnValue(Double.POSITIVE_INFINITY);
        LongOpenHashSet settled = new LongOpenHashSet();
        Long2ObjectOpenHashMap<BlockState> originalDirt = new Long2ObjectOpenHashMap<>();

        for (Source source : sources) {
            if (!canStayAlive(snap, source.x, source.y, source.z, source.state)) {
                if (scope.ticked(source.x, source.y, source.z, SALT)) {
                    Block base = baseBlock(source.state);
                    if (base != null) {
                        scope.set(source.x, source.y, source.z, source.state, base.defaultBlockState(), Stat.GRASS_DIED, 1);
                    }
                }
                continue;
            }
            long pos = PlanScope.pack(source.x, source.y, source.z);
            settled.add(pos);
            queue.add(new Arrival(0.0, pos, (SpreadingSnowyBlock) source.state.getBlock()));
        }
        if (perTickRandomTicks <= 0 || horizon <= 0) {
            return;
        }

        while (!queue.isEmpty()) {
            Arrival current = queue.poll();
            long pos = current.pos;
            if (current.time > 0) {
                if (settled.contains(pos)) {
                    continue;
                }
                settled.add(pos);
                int x = BlockPos.getX(pos);
                int y = BlockPos.getY(pos);
                int z = BlockPos.getZ(pos);
                BlockState from = originalDirt.get(pos);
                BlockState above = snap.get(x, y + 1, z);
                BlockState grown = current.block.defaultBlockState().setValue(SnowyBlock.SNOWY, above.is(BlockTags.SNOW));
                scope.set(x, y, z, from, grown, Stat.GRASS_SPREAD, 1);
            }
            int x = BlockPos.getX(pos);
            int y = BlockPos.getY(pos);
            int z = BlockPos.getZ(pos);
            double light = scope.info.fractionLit(snap.skyLight(x, y + 1, z), snap.blockLight(x, y + 1, z), 9);
            double rate = perTickRandomTicks * light * HIT_PER_RANDOM_TICK;
            if (rate <= 0) {
                continue;
            }
            Block base = baseBlock(current.block.defaultBlockState());
            if (base == null) {
                continue;
            }
            for (int dx = -1; dx <= 1; dx++) {
                for (int dy = -3; dy <= 1; dy++) {
                    for (int dz = -1; dz <= 1; dz++) {
                        int tx = x + dx;
                        int ty = y + dy;
                        int tz = z + dz;
                        if (!snap.contains(tx, tz)) {
                            continue;
                        }
                        long target = PlanScope.pack(tx, ty, tz);
                        if (settled.contains(target)) {
                            continue;
                        }
                        BlockState targetState = snap.get(tx, ty, tz);
                        if (!targetState.is(base) || !canPropagate(snap, tx, ty, tz, current.block.defaultBlockState())) {
                            continue;
                        }
                        double arrival = current.time - Math.log(rng.nextDoubleNonZero()) / rate;
                        if (arrival <= horizon && arrival < best.get(target)) {
                            best.put(target, arrival);
                            originalDirt.put(target, targetState);
                            queue.add(new Arrival(arrival, target, current.block));
                        }
                    }
                }
            }
        }
    }

    private static Block baseBlock(BlockState state) {
        if (!(state.getBlock() instanceof SpreadingSnowyBlock block)) {
            return null;
        }
        return BuiltInRegistries.BLOCK.getValue(((SpreadingSnowyBlockAccessor) block).timeskip$getBaseBlock());
    }

    /** Same as vanilla {@code SpreadingSnowyBlock.canStayAlive}, read from the snapshot. */
    static boolean canStayAlive(ChunkSnapshot snap, int x, int y, int z, BlockState state) {
        BlockState above = snap.get(x, y + 1, z);
        if (ChunkSnapshot.isUnknown(above)) {
            return true;
        }
        if (above.is(Blocks.SNOW) && above.getValue(SnowLayerBlock.LAYERS) == 1) {
            return true;
        }
        if (above.getFluidState().isFull()) {
            return false;
        }
        return LightEngine.getLightDampeningInto(state, above, Direction.UP, above.getLightDampening()) < 15;
    }

    /** Same as vanilla {@code SpreadingSnowyBlock.canPropagate}. */
    static boolean canPropagate(ChunkSnapshot snap, int x, int y, int z, BlockState grass) {
        return canStayAlive(snap, x, y, z, grass) && !snap.get(x, y + 1, z).getFluidState().is(FluidTags.WATER);
    }
}
