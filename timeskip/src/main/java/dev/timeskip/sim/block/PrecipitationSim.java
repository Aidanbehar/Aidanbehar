package dev.timeskip.sim.block;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.math.Binomial;
import dev.timeskip.math.RandomTickMath;
import dev.timeskip.math.Rng;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.biome.Biome;
import net.minecraft.world.level.block.AbstractCauldronBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.SnowLayerBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * Snow, ice and cauldrons ({@code ServerLevel.tickPrecipitation}), which vanilla runs per chunk
 * rather than per block: each tick, {@code randomTickSpeed} tries at 1/48 each pick a random column,
 * so a column is visited with probability {@code speed / 12288} per tick. Water freezing happens
 * in any weather; snow and cauldron filling only while it rains.
 *
 * <p>Runs on the main thread with vanilla's own {@code shouldFreeze}, {@code shouldSnow} and
 * {@code handlePrecipitation}. Freezing works inwards from the edges of a body of water as vanilla's
 * "not surrounded by water" rule makes it: a block d blocks from the shore needs d visits.
 */
public final class PrecipitationSim {
    private static final double COLUMN_CHANCE = 1.0 / 12288.0;
    private static final long SALT = 0x50524543L;
    private static final int MAX_FREEZE_VISITS = 256;
    private static final int MAX_CAULDRON_STEPS = 32;

    private PrecipitationSim() {
    }

    public static void apply(ApplyContext ctx, ChunkPos chunkPos) {
        ServerLevel level = ctx.level;
        long visitTrials = RandomTickMath.trials(ctx.info.ticks, ctx.info.randomTickSpeed);
        long rainTrials = RandomTickMath.trials(ctx.info.rainTicks, ctx.info.randomTickSpeed);
        if (visitTrials <= 0) {
            return;
        }
        int[] freezeVisits = new int[256];
        int[] rainVisits = new int[256];
        boolean anyFreeze = false;
        BlockPos.MutableBlockPos column = new BlockPos.MutableBlockPos();
        for (int i = 0; i < 256; i++) {
            int x = chunkPos.getMinBlockX() + (i & 15);
            int z = chunkPos.getMinBlockZ() + (i >> 4);
            Rng rng = ctx.sim.rng(ctx.info, x, 0, z, SALT);
            freezeVisits[i] = (int) Math.min(MAX_FREEZE_VISITS, Binomial.sample(visitTrials, COLUMN_CHANCE, rng));
            rainVisits[i] = (int) Math.min(64, Binomial.sample(rainTrials, COLUMN_CHANCE, rng));
            anyFreeze |= freezeVisits[i] > 0;
        }

        // Freezing spreads inwards from the edge of a body of water: vanilla only freezes water that
        // is not surrounded by water, so a block at distance d from the shore needs d visits, each
        // after its neighbour froze. Breadth-first from the shore: one check per column.
        if (anyFreeze) {
            java.util.ArrayDeque<int[]> queue = new java.util.ArrayDeque<>();
            boolean[] queued = new boolean[256];
            for (int i = 0; i < 256; i++) {
                if (freezeVisits[i] > 0) {
                    queue.add(new int[] {i, 1});
                    queued[i] = true;
                }
            }
            while (!queue.isEmpty()) {
                int[] entry = queue.poll();
                int i = entry[0];
                int depth = entry[1];
                if (freezeVisits[i] < depth) {
                    queued[i] = false; // may be re-queued later by a neighbour at a smaller depth
                    continue;
                }
                column.set(chunkPos.getMinBlockX() + (i & 15), 0, chunkPos.getMinBlockZ() + (i >> 4));
                BlockPos top = level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING, column);
                BlockPos below = top.below();
                Biome biome = level.getBiome(top).value();
                if (biome.warmEnoughToRain(below, ctx.info.seaLevel)) {
                    freezeVisits[i] = 0;
                    continue;
                }
                if (!biome.shouldFreeze(level, below)) {
                    queued[i] = false; // open water surrounded by water: wait for a neighbour
                    continue;
                }
                ctx.setNormal(below, Blocks.ICE.defaultBlockState());
                ctx.stats.inc(Stat.ICE_FORMED);
                freezeVisits[i] = 0;
                int x = i & 15;
                int z = i >> 4;
                int[][] around = {{x - 1, z}, {x + 1, z}, {x, z - 1}, {x, z + 1}};
                for (int[] n : around) {
                    if (n[0] < 0 || n[0] > 15 || n[1] < 0 || n[1] > 15) {
                        continue;
                    }
                    int j = n[0] | (n[1] << 4);
                    if (freezeVisits[j] > 0 && !queued[j]) {
                        queued[j] = true;
                        queue.add(new int[] {j, depth + 1});
                    }
                }
            }
        }

        if (rainTrials <= 0) {
            return;
        }
        int maxLayers = Math.min(ctx.info.maxSnowHeight, 8);
        for (int i = 0; i < 256; i++) {
            int visits = rainVisits[i];
            if (visits <= 0) {
                continue;
            }
            column.set(chunkPos.getMinBlockX() + (i & 15), 0, chunkPos.getMinBlockZ() + (i >> 4));
            BlockPos top = level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING, column);
            BlockPos below = top.below();
            Biome biome = level.getBiome(top).value();

            if (maxLayers > 0 && biome.shouldSnow(level, top)) {
                BlockState state = level.getBlockState(top);
                int layers = state.is(Blocks.SNOW) ? state.getValue(SnowLayerBlock.LAYERS) : 0;
                int target = Math.min(maxLayers, layers + visits);
                if (target > layers) {
                    BlockState snow = Blocks.SNOW.defaultBlockState().setValue(SnowLayerBlock.LAYERS, target);
                    Block.pushEntitiesUp(state, snow, level, top);
                    ctx.setNormal(top, snow);
                    ctx.stats.add(Stat.SNOW_FELL, target - layers);
                }
            }

            Biome.Precipitation precipitation = biome.getPrecipitationAt(below, ctx.info.seaLevel);
            if (precipitation != Biome.Precipitation.NONE) {
                BlockState belowState = level.getBlockState(below);
                if (belowState.getBlock() instanceof AbstractCauldronBlock) {
                    int steps = Math.min(visits, MAX_CAULDRON_STEPS);
                    for (int s = 0; s < steps; s++) {
                        BlockState current = level.getBlockState(below);
                        current.getBlock().handlePrecipitation(current, level, below, precipitation);
                        if (level.getBlockState(below) != current) {
                            ctx.stats.inc(Stat.CAULDRONS_FILLED);
                            ctx.markChanged();
                        }
                    }
                }
            }
        }
    }
}
