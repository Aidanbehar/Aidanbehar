package dev.timeskip.core;

import dev.timeskip.TimeSkipMod;
import dev.timeskip.command.SkipUnit;
import dev.timeskip.config.TimeSkipConfig;
import dev.timeskip.tier1.RealTickRunner;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.Entity;
import org.jspecify.annotations.Nullable;

/** Owns the (at most one) running skip and the pending confirmation for a server. */
public final class SkipManager {
    private static volatile boolean protectingPlayers;
    private static @Nullable SkipManager instance;

    private final MinecraftServer server;
    private @Nullable SkipSession active;
    private @Nullable Pending pending;

    private record Pending(long ticks, String description, String sourceName, long expiresAtNanos) {
    }

    private SkipManager(MinecraftServer server) {
        this.server = server;
    }

    // --- lifecycle (called from TimeSkipMod) ---------------------------------------------------

    public static void onServerStarted(MinecraftServer server) {
        instance = new SkipManager(server);
    }

    public static void onServerStopping(MinecraftServer server) {
        SkipManager manager = instance;
        if (manager != null && manager.active != null) {
            manager.active.abort();
            manager.active = null;
        }
        protectingPlayers = false;
        instance = null;
    }

    public static void onServerTick(MinecraftServer server) {
        SkipManager manager = instance;
        if (manager != null) {
            manager.tick();
        }
    }

    public static @Nullable SkipManager get() {
        return instance;
    }

    /** Read by the player damage mixin. */
    public static boolean isProtectingPlayers() {
        return protectingPlayers;
    }

    private void tick() {
        if (pending != null && System.nanoTime() > pending.expiresAtNanos) {
            pending = null;
        }
        if (active != null) {
            active.tick();
            if (active.isFinished()) {
                active = null;
                protectingPlayers = false;
            }
        }
    }

    // --- commands --------------------------------------------------------------------------------

    public int request(CommandSourceStack source, double amount, SkipUnit unit) {
        TimeSkipConfig config = TimeSkipMod.config();
        if (!(amount > 0) || Double.isInfinite(amount)) {
            source.sendFailure(Component.literal("The amount must be a positive number."));
            return 0;
        }
        double exactTicks = amount * unit.ticks(config);
        if (exactTicks > config.maxSkipTicks() * 1.000001) {
            source.sendFailure(Component.literal("That is longer than the maximum of "
                    + SkipFormat.describe(config.maxSkipTicks(), config) + " (change max_skip_years in the config)."));
            return 0;
        }
        long ticks = Math.round(exactTicks);
        if (ticks < config.minSkipTicks) {
            source.sendFailure(Component.literal("The shortest skip is " + SkipFormat.describe(config.minSkipTicks, config) + "."));
            return 0;
        }
        if (active != null) {
            source.sendFailure(Component.literal("A skip is already running. Use /timeskip status or /timeskip cancel."));
            return 0;
        }
        String description = SkipFormat.describe(ticks, config);
        if (ticks >= config.confirmThresholdTicks()) {
            pending = new Pending(ticks, description, source.getTextName(),
                    System.nanoTime() + config.confirmTimeoutSeconds * 1_000_000_000L);
            MutableComponent message = Component.literal("[Time Skip] ").withStyle(ChatFormatting.GOLD)
                    .append(Component.literal("Skipping " + description + " permanently changes this world. ")
                            .withStyle(ChatFormatting.YELLOW))
                    .append(Component.literal("Back up your world first if you might want to undo it. ")
                            .withStyle(ChatFormatting.RED))
                    .append(Component.literal("Type /timeskip confirm within " + config.confirmTimeoutSeconds
                            + " seconds to go ahead.").withStyle(ChatFormatting.WHITE));
            source.sendSuccess(() -> message, false);
            return 1;
        }
        return start(source, ticks, description);
    }

    public int confirm(CommandSourceStack source) {
        Pending request = pending;
        if (request == null) {
            source.sendFailure(Component.literal("There is no skip waiting for confirmation."));
            return 0;
        }
        if (!request.sourceName.equals(source.getTextName())) {
            source.sendFailure(Component.literal("Only " + request.sourceName + " can confirm their skip."));
            return 0;
        }
        pending = null;
        if (active != null) {
            source.sendFailure(Component.literal("A skip is already running."));
            return 0;
        }
        return start(source, request.ticks, request.description);
    }

    public int cancel(CommandSourceStack source) {
        if (pending != null && active == null) {
            pending = null;
            source.sendSuccess(() -> Component.literal("[Time Skip] Pending skip discarded.").withStyle(ChatFormatting.GOLD), true);
            return 1;
        }
        if (active == null) {
            source.sendFailure(Component.literal("No skip is running."));
            return 0;
        }
        active.cancel();
        source.sendSuccess(() -> Component.literal("[Time Skip] Stopping safely...")
                .withStyle(ChatFormatting.GOLD), true);
        return 1;
    }

    public int status(CommandSourceStack source) {
        if (active != null) {
            String line = active.statusLine();
            source.sendSuccess(() -> Component.literal("[Time Skip] ").withStyle(ChatFormatting.GOLD)
                    .append(Component.literal(line).withStyle(ChatFormatting.WHITE)), false);
        } else if (pending != null) {
            String line = "A skip of " + pending.description + " is waiting for /timeskip confirm.";
            source.sendSuccess(() -> Component.literal("[Time Skip] " + line).withStyle(ChatFormatting.GOLD), false);
        } else {
            source.sendSuccess(() -> Component.literal("[Time Skip] No skip is running.").withStyle(ChatFormatting.GOLD), false);
        }
        return 1;
    }

    private int start(CommandSourceStack source, long ticks, String description) {
        TimeSkipConfig config = TimeSkipMod.config();
        boolean realTicking = ticks <= config.realTickMaxTicks;
        String note = "";
        if (realTicking) {
            // Each extra world tick costs about one normal server tick; the skip gets tick_budget_ms
            // of every 50 ms tick. Busy worlds would take too long, so they are calculated instead.
            double tickMs = Math.max(0.05, server.getAverageTickTimeNanos() / 1.0e6);
            double seconds = ticks * tickMs / config.tickBudgetMs * 0.05;
            if (seconds > config.realTickMaxSeconds) {
                realTicking = false;
                note = String.format(" Running it for real would take about %,.0f seconds on this server, so it is calculated instead"
                        + " (redstone and farms won't run; raise real_tick_max_seconds to change this).", seconds);
            }
        }
        if (realTicking && server.tickRateManager().isFrozen()) {
            source.sendFailure(Component.literal("The game is frozen (/tick freeze). Unfreeze it first, or raise the skip above "
                    + SkipFormat.describe(config.realTickMaxTicks, config) + " so it is calculated instead."));
            return 0;
        }
        SkipStats stats = new SkipStats();
        SkipJob job = realTicking ? new RealTickRunner(server, ticks) : new AnalyticalSkip(server, config, stats, ticks);
        Entity entity = source.getEntity();
        UUID initiator = entity == null ? null : entity.getUUID();
        active = new SkipSession(server, config, job, stats, ticks, description, initiator, source.getTextName(), realTicking);
        protectingPlayers = config.protectPlayersDuringSkip;
        String mode = realTicking ? "running the world forward for real" : "calculating the result";
        MutableComponent message = Component.literal("[Time Skip] ").withStyle(ChatFormatting.GOLD)
                .append(Component.literal(source.getTextName() + " started skipping " + description + " (" + mode + ")." + note)
                        .withStyle(ChatFormatting.WHITE));
        if (config.announceToEveryone) {
            server.getPlayerList().broadcastSystemMessage(message, false);
        } else {
            source.sendSuccess(() -> message, false);
        }
        return 1;
    }
}
