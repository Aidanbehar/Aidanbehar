package dev.timeskip.sim.block;

import net.minecraft.world.level.block.state.BlockState;

/** Plans what N ticks do to one kind of block. Runs on a worker thread against a snapshot. */
@FunctionalInterface
public interface BlockHandler {
    void plan(PlanScope scope, int x, int y, int z, BlockState state);
}
