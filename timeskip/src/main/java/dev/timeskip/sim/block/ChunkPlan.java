package dev.timeskip.sim.block;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.world.level.ChunkPos;

/** Everything one chunk needs to have done to it, in order. Applied incrementally across ticks. */
public final class ChunkPlan {
    public final ChunkSnapshot snapshot;
    private final List<PlanAction> actions;
    private int cursor;

    public ChunkPlan(ChunkSnapshot snapshot, List<PlanAction> actions) {
        this.snapshot = snapshot;
        this.actions = actions;
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

        public ChunkPlan build(ChunkSnapshot snapshot) {
            return new ChunkPlan(snapshot, actions);
        }
    }
}
