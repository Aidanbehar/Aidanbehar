package dev.timeskip.core;

import dev.timeskip.config.TimeSkipConfig;
import dev.timeskip.scheduler.TickBudget;
import java.util.Map;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** One running skip: its job, boss bar, statistics and the messages around it. */
public final class SkipSession {
    private static final Logger LOGGER = LoggerFactory.getLogger("timeskip");

    private final MinecraftServer server;
    private final TimeSkipConfig config;
    private final SkipJob job;
    private final SkipStats stats;
    private final ProgressBar bar;
    private final long ticks;
    private final String description;
    private final @Nullable UUID initiator;
    private final String initiatorName;
    private final boolean realTicking;
    private final long startNanos = System.nanoTime();
    private boolean finished;
    private long ticksWorked;
    private long totalWorkNanos;
    private long maxWorkNanos;

    public SkipSession(MinecraftServer server, TimeSkipConfig config, SkipJob job, SkipStats stats, long ticks,
                       String description, @Nullable UUID initiator, String initiatorName, boolean realTicking) {
        this.server = server;
        this.config = config;
        this.job = job;
        this.stats = stats;
        this.ticks = ticks;
        this.description = description;
        this.initiator = initiator;
        this.initiatorName = initiatorName;
        this.realTicking = realTicking;
        this.bar = new ProgressBar(config.showBossBar);
    }

    public void tick() {
        if (finished) {
            return;
        }
        boolean done;
        long begin = System.nanoTime();
        try {
            done = job.tick(TickBudget.ofMillis(config.tickBudgetMs));
            long spent = System.nanoTime() - begin;
            ticksWorked++;
            totalWorkNanos += spent;
            maxWorkNanos = Math.max(maxWorkNanos, spent);
        } catch (RuntimeException e) {
            LOGGER.error("[Time Skip] The skip failed and was stopped safely", e);
            job.close();
            finish(false, "The skip hit an error and was stopped (details in the server log). The world clock was not moved.");
            return;
        }
        bar.update(server, "Time Skip: " + description + " - " + job.phase(), job.progress());
        if (done) {
            finish(!job.cancelled(), job.detail());
        }
    }

    public boolean isFinished() {
        return finished;
    }

    public void cancel() {
        job.requestCancel();
    }

    public void abort() {
        if (job instanceof AnalyticalSkip analytical) {
            analytical.abort();
        } else {
            job.requestCancel();
            job.close();
        }
        bar.remove();
        finished = true;
    }

    public String statusLine() {
        return String.format("Skipping %s: %s (%.0f%%, %.1fs so far)", description, job.phase(),
                job.progress() * 100, elapsedSeconds());
    }

    private double elapsedSeconds() {
        return (System.nanoTime() - startNanos) / 1.0e9;
    }

    private void finish(boolean completed, String detail) {
        finished = true;
        bar.remove();
        MutableComponent message = Component.literal("[Time Skip] ").withStyle(ChatFormatting.GOLD);
        if (completed) {
            message.append(Component.literal(String.format("Skipped %s in %.1f seconds. ", description, elapsedSeconds()))
                    .withStyle(ChatFormatting.GREEN));
        } else {
            message.append(Component.literal("Skip stopped. ").withStyle(ChatFormatting.YELLOW));
        }
        message.append(Component.literal(detail).withStyle(ChatFormatting.GRAY));
        if (!realTicking) {
            Map<SkipStats.Stat, Long> changes = stats.nonZero();
            changes.remove(SkipStats.Stat.CHUNKS_AGED);
            if (!changes.isEmpty()) {
                message.append(Component.literal("\nWhat changed: ").withStyle(ChatFormatting.GOLD));
                StringBuilder list = new StringBuilder();
                for (Map.Entry<SkipStats.Stat, Long> e : changes.entrySet()) {
                    if (!list.isEmpty()) {
                        list.append(", ");
                    }
                    list.append(String.format("%,d %s", e.getValue(), e.getKey().label));
                }
                message.append(Component.literal(list.toString()).withStyle(ChatFormatting.WHITE));
            }
        }
        announce(message);
        LOGGER.info("[Time Skip] {} ({} ticks) finished by {}: completed={}, {}", description, ticks, initiatorName,
                completed, stats.nonZero());
        LOGGER.info("[Time Skip] Main-thread work: {} server ticks, average {} ms, longest {} ms per tick (budget {} ms)",
                ticksWorked, String.format("%.2f", ticksWorked == 0 ? 0 : totalWorkNanos / 1e6 / ticksWorked),
                String.format("%.2f", maxWorkNanos / 1e6), config.tickBudgetMs);
    }

    private void announce(Component message) {
        if (config.announceToEveryone) {
            server.getPlayerList().broadcastSystemMessage(message, false);
            return;
        }
        if (initiator != null) {
            ServerPlayer player = server.getPlayerList().getPlayer(initiator);
            if (player != null) {
                player.sendSystemMessage(message);
            }
        }
        server.sendSystemMessage(message);
    }
}
