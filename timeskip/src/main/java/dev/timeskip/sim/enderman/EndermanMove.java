package dev.timeskip.sim.enderman;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.sim.block.ApplyContext;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.state.BlockState;

/**
 * One enderman picking a block up and putting it down somewhere (main thread).
 *
 * <p>Transactional so nothing is lost: the block is only taken once a valid place for it has been
 * found, and if taking it invalidates that place it is put straight back. Like vanilla, the
 * enderman takes {@code defaultBlockState()} of the block (a snowy grass block comes back as plain
 * grass) and the removal uses {@code removeBlock}, so a flower standing on a taken grass block pops
 * off as an item (which then despawns in the skip).
 */
public final class EndermanMove {
    private static final long SALT = 0x4D4F5645L;

    private EndermanMove() {
    }

    /** Returns true if a block was moved. */
    public static boolean apply(ApplyContext ctx, long pickup, long feet, EndermanPlacement.Wander wander, double teleportChance) {
        ServerLevel level = ctx.level;
        BlockPos from = BlockPos.of(pickup);
        if (!ctx.areaLoaded(from, 1)) {
            return false;
        }
        // The chunk's own changes ran first (grass spreading over dirt, say); any holdable block will do.
        BlockState current = level.getBlockState(from);
        if (!current.is(BlockTags.ENDERMAN_HOLDABLE)) {
            return false;
        }
        BlockState carried = current.getBlock().defaultBlockState();
        RandomSource random = ctx.random(from, SALT);
        BlockPos target = EndermanPlacement.findSpot(level, BlockPos.of(feet), carried, random, from, wander, teleportChance);
        if (target == null) {
            return false; // nowhere to put it: the enderman would still be carrying it, so leave it be
        }
        level.removeBlock(from, false);
        if (!EndermanPlacement.canPlace(level, target, carried)) {
            level.setBlockAndUpdate(from, current);
            return false;
        }
        ctx.markChanged();
        if (!EndermanPlacement.place(level, target, carried)) {
            EndermanPlacement.debugLog(level, from, target, carried, "lost (it can't live there, as in vanilla)");
            return false;
        }
        ctx.stats.inc(Stat.ENDERMAN_MOVES);
        EndermanPlacement.debugLog(level, from, target, carried, "moved");
        return true;
    }
}
