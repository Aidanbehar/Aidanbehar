package dev.timeskip.sim.block;

/** One change planned off-thread and carried out on the main thread. */
public interface PlanAction {
    void apply(ApplyContext ctx);

    /** Rough relative cost, used to keep a tick's work inside its budget. */
    default int cost() {
        return 1;
    }

    /**
     * True if the action only reads and writes its own block. Other actions (vanilla ticks, tree
     * growth, neighbour updates) are skipped in chunks whose neighbours are not loaded, so the skip
     * never forces a synchronous chunk load at the edge of the loaded area.
     */
    default boolean local() {
        return false;
    }
}
