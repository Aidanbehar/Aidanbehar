package dev.timeskip.sim.block;

import dev.timeskip.sim.SimContext;
import dev.timeskip.sim.enderman.EndermanPlanner;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.PalettedContainer;

/** Turns a chunk snapshot into a plan. Pure function of the snapshot: safe on any thread. */
public final class ChunkPlanner {
    private ChunkPlanner() {
    }

    public static ChunkPlan plan(SimContext sim, ChunkSnapshot snapshot) {
        PlanScope scope = new PlanScope(sim, snapshot);
        if (sim.config.simulateBlocks) {
            for (int index = 0; index < snapshot.sectionCount(); index++) {
                PalettedContainer<BlockState> section = snapshot.section(index);
                if (section == null || !section.maybeHas(BlockHandlers::isInteresting)) {
                    continue;
                }
                int baseY = snapshot.sectionMinY(index);
                for (int ly = 0; ly < 16; ly++) {
                    for (int lz = 0; lz < 16; lz++) {
                        for (int lx = 0; lx < 16; lx++) {
                            BlockState state = section.get(lx, ly, lz);
                            if (!BlockHandlers.isInteresting(state)) {
                                continue;
                            }
                            BlockHandlers.forBlock(state.getBlock())
                                    .plan(scope, snapshot.minX + lx, baseY + ly, snapshot.minZ + lz, state);
                        }
                    }
                }
            }
        }
        // Endermen act last, after the chunk's own changes (grass spreading or dying, copper...).
        scope.finishAggregates();
        if (sim.config.simulateEndermen) {
            EndermanPlanner.plan(scope);
        }
        return scope.finish();
    }
}
