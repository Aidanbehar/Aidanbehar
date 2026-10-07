package dev.timeskip.sim.block;

import dev.timeskip.sim.enderman.EndermanChunk;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.world.level.ChunkPos;
import org.jspecify.annotations.Nullable;

/** Everything one chunk needs to have done to it, in order. Applied incrementally across ticks. */
public final class ChunkPlan {
    public final ChunkSnapshot snapshot;
    /** What endermen could do here; carried out after every chunk is aged (null if nothing). */
    public final @Nullable EndermanChunk endermen;
    private final List<PlanAction> actions;
    private int cursor;

    public ChunkPlan(ChunkSnapshot snapshot, List<PlanAction> actions, @Nullable EndermanChunk endermen) {
        this.snapshot = snapshot;
        this.actions = actions;
        this.endermen = endermen;
    }

    public ChunkPos pos() {
        return snapshot.pos;
    }

    public boolean hasNext() {
        return cursor < actions.size();
    }

    public PlanAction next() {
        return actions.get(cursor++);
    }

    public int size() {
        return actions.size();
    }

    /** Builder used by the planner on a worker thread. */
    public static final class Builder {
        private final List<PlanAction> actions = new ArrayList<>();

        public void add(PlanAction action) {
            actions.add(action);
        }

        public ChunkPlan build(ChunkSnapshot snapshot, @Nullable EndermanChunk endermen) {
            return new ChunkPlan(snapshot, actions, endermen);
        }
    }
}
