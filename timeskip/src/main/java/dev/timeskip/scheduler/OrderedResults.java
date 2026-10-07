package dev.timeskip.scheduler;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Collects results that finish on worker threads in any order and hands them to the main thread
 * strictly in submission order. Applying in a fixed order is what keeps a skip reproducible even
 * when results interact (two trees competing for the same space, for example).
 */
public final class OrderedResults<T> {
    private final ConcurrentHashMap<Integer, T> done = new ConcurrentHashMap<>();
    private final AtomicReference<Throwable> failure = new AtomicReference<>();
    private int nextToTake;
    private int submitted;

    /** Reserves the next sequence number (main thread). */
    public int reserve() {
        return submitted++;
    }

    /** Called from any thread when a result is ready. */
    public void complete(int sequence, T result) {
        done.put(sequence, result);
        synchronized (this) {
            notifyAll();
        }
    }

    public void fail(Throwable throwable) {
        failure.compareAndSet(null, throwable);
        synchronized (this) {
            notifyAll();
        }
    }

    /** Waits up to {@code nanos} for the next in-order result to arrive (main thread). */
    public void awaitNext(long nanos) {
        if (nanos <= 0 || done.containsKey(nextToTake) || failure.get() != null) {
            return;
        }
        synchronized (this) {
            if (!done.containsKey(nextToTake) && failure.get() == null) {
                try {
                    wait(Math.max(1, nanos / 1_000_000), (int) (nanos % 1_000_000));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }

    public int inFlight() {
        return submitted - nextToTake;
    }

    public Throwable failure() {
        return failure.get();
    }

    /** Next result in order, or null if it is not ready yet (main thread). */
    public T poll() {
        T result = done.remove(nextToTake);
        if (result != null) {
            nextToTake++;
        }
        return result;
    }

    public boolean allTaken() {
        return nextToTake >= submitted;
    }

    public int submitted() {
        return submitted;
    }

    public int taken() {
        return nextToTake;
    }
}
