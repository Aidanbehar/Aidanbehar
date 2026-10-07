package dev.timeskip.tier1;

import dev.timeskip.core.SkipJob;
import dev.timeskip.scheduler.TickBudget;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;

/**
 * Tier 1: actually runs the world forward. Each server tick it runs as many extra world ticks as
 * fit in the budget — the same calls the server makes every tick (clocks, datapack tick functions,
 * every dimension's {@code ServerLevel.tick}). Redstone, farms, mobs and fluids all behave exactly
 * as in normal play, just faster.
 */
public final class RealTickRunner implements SkipJob {
    private final MinecraftServer server;
    private final long ticks;
    private long done;
    private boolean cancelled;
    private long startNanos = -1;
    /** Moving average of one extra world tick, so we only start one when it fits the budget. */
    private double avgTickNanos = 1_000_000;

    public RealTickRunner(MinecraftServer server, long ticks) {
        this.server = server;
        this.ticks = ticks;
    }

    @Override
    public boolean tick(TickBudget budget) {
        if (startNanos < 0) {
            startNanos = System.nanoTime();
        }
        if (cancelled) {
            return true;
        }
        int ranThisTick = 0;
        // Always make some progress, even if one world tick costs more than the whole budget.
        while (done < ticks && (ranThisTick++ == 0 || budget.remainingNanos() > avgTickNanos)) {
            long t0 = System.nanoTime();
            server.getFunctions().tick();
            if (server.tickRateManager().runsNormally()) {
                server.clockManager().tick();
            }
            for (ServerLevel level : server.getAllLevels()) {
                level.tick(() -> false);
            }
            done++;
            avgTickNanos = avgTickNanos * 0.9 + (System.nanoTime() - t0) * 0.1;
        }
        return done >= ticks;
    }

    @Override
    public float progress() {
        return ticks == 0 ? 1.0F : (float) ((double) done / ticks);
    }

    @Override
    public String phase() {
        double seconds = startNanos < 0 ? 0 : (System.nanoTime() - startNanos) / 1.0e9;
        double speed = seconds <= 0 ? 0 : done / seconds / 20.0;
        return String.format("Running the world %,.0fx faster", speed);
    }

    @Override
    public void requestCancel() {
        cancelled = true;
    }

    @Override
    public boolean cancelled() {
        return cancelled;
    }

    @Override
    public String detail() {
        return String.format("Ran %,d real game ticks.", done);
    }

    public long ticksDone() {
        return done;
    }

    @Override
    public void close() {
    }
}
