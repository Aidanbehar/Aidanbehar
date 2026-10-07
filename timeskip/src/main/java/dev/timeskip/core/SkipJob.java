package dev.timeskip.core;

import dev.timeskip.scheduler.TickBudget;

/** A running skip: resumable work done a slice at a time from the server tick. */
public interface SkipJob {
    /** Does work within the budget; returns true once finished (completed or cancelled). */
    boolean tick(TickBudget budget);

    /** 0..1 for the boss bar. */
    float progress();

    /** Short description of the current step, shown in the boss bar and /timeskip status. */
    String phase();

    /** Asks the job to stop at the next safe point. */
    void requestCancel();

    boolean cancelled();

    /** One-line extra detail for the completion message (may be empty). */
    String detail();

    /** Releases everything (freeze, tickets, threads). Safe to call more than once. */
    void close();
}
