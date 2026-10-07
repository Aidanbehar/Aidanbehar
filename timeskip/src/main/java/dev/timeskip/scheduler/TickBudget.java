package dev.timeskip.scheduler;

/** A wall-clock allowance for main-thread work inside one server tick. */
public final class TickBudget {
    private final long deadlineNanos;

    private TickBudget(long deadlineNanos) {
        this.deadlineNanos = deadlineNanos;
    }

    public static TickBudget ofMillis(long millis) {
        return new TickBudget(System.nanoTime() + millis * 1_000_000L);
    }

    public boolean hasTime() {
        return System.nanoTime() < deadlineNanos;
    }

    public boolean expired() {
        return !hasTime();
    }

    public long remainingNanos() {
        return Math.max(0, deadlineNanos - System.nanoTime());
    }
}
