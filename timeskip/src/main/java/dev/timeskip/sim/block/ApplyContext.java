package dev.timeskip.sim.block;

import dev.timeskip.core.SkipStats;
import dev.timeskip.sim.LevelInfo;
import dev.timeskip.sim.SimContext;
import net.minecraft.core.BlockPos;
import net.minecraft.core.SectionPos;
import net.minecraft.server.level.ServerChunkCache;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;

/** Main-thread helpers for applying a planned chunk to the live world. */
public final class ApplyContext {
    /**
     * Bulk changes skip neighbour updates, drops and per-block client packets; changed chunks are
     * re-sent whole at the end of the skip. Lighting and heightmaps still update normally.
     */
    public static final int QUIET_FLAGS = Block.UPDATE_KNOWN_SHAPE | Block.UPDATE_SUPPRESS_DROPS;

    public final SimContext sim;
    public final LevelInfo info;
    public final ServerLevel level;
    public final SkipStats stats;
    private final BlockPos.MutableBlockPos cursor = new BlockPos.MutableBlockPos();
    private boolean changed;

    public ApplyContext(SimContext sim, LevelInfo info) {
        this.sim = sim;
        this.info = info;
        this.level = info.level;
        this.stats = sim.stats;
    }

    public BlockPos.MutableBlockPos at(long packed) {
        return cursor.set(BlockPos.getX(packed), BlockPos.getY(packed), BlockPos.getZ(packed));
    }

    /** Sets a block only if it still is what the snapshot saw (players may have edited it). */
    public boolean replace(BlockPos pos, BlockState expected, BlockState to) {
        if (level.getBlockState(pos) != expected) {
            return false;
        }
        boolean result = level.setBlock(pos, to, QUIET_FLAGS);
        changed |= result;
        return result;
    }

    /** Sets a block with vanilla's normal flags (neighbour updates, client sync). */
    public boolean setNormal(BlockPos pos, BlockState to) {
        boolean result = level.setBlock(pos, to, Block.UPDATE_ALL);
        changed |= result;
        return result;
    }

    /**
     * True if every chunk within {@code radius} blocks is loaded. Actions that may touch blocks near
     * a chunk edge check this first so they never force a synchronous chunk load.
     */
    public boolean areaLoaded(BlockPos pos, int radius) {
        return chunksLoaded(level, pos.getX() - radius, pos.getZ() - radius, pos.getX() + radius, pos.getZ() + radius);
    }

    /**
     * True if every chunk overlapping the block range is fully loaded right now (main thread).
     * {@code Level.hasChunksAt} only checks ticket levels, so a chunk that is ticketed but still
     * loading would pass it and then block the server thread on the first {@code getBlockState}.
     */
    public static boolean chunksLoaded(ServerLevel level, int minX, int minZ, int maxX, int maxZ) {
        ServerChunkCache cache = level.getChunkSource();
        for (int cx = SectionPos.blockToSectionCoord(minX); cx <= SectionPos.blockToSectionCoord(maxX); cx++) {
            for (int cz = SectionPos.blockToSectionCoord(minZ); cz <= SectionPos.blockToSectionCoord(maxZ); cz++) {
                if (cache.getChunkNow(cx, cz) == null) {
                    return false;
                }
            }
        }
        return true;
    }

    public void markChanged() {
        changed = true;
    }

    public boolean takeChanged() {
        boolean was = changed;
        changed = false;
        return was;
    }

    /** Vanilla random source with a reproducible seed for this position and purpose. */
    public RandomSource random(BlockPos pos, long salt) {
        return RandomSource.create(sim.seed(info, pos.getX(), pos.getY(), pos.getZ(), salt));
    }
}
