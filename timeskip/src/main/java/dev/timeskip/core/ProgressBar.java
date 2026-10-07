package dev.timeskip.core;

import java.util.UUID;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerBossEvent;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.BossEvent;

/** The boss bar shown at the top of every player's screen while a skip runs. */
public final class ProgressBar {
    private final ServerBossEvent bar;
    private final boolean enabled;
    private float lastProgress = -1;
    private String lastText = "";

    public ProgressBar(boolean enabled) {
        this.enabled = enabled;
        this.bar = new ServerBossEvent(UUID.randomUUID(), Component.literal("Time Skip"),
                BossEvent.BossBarColor.BLUE, BossEvent.BossBarOverlay.NOTCHED_20);
    }

    /** Updates text and progress; also adds players who joined since the last tick. */
    public void update(MinecraftServer server, String text, float progress) {
        if (!enabled) {
            return;
        }
        float clamped = Math.max(0.0F, Math.min(1.0F, progress));
        if (Math.abs(clamped - lastProgress) >= 0.002F) {
            bar.setProgress(clamped);
            lastProgress = clamped;
        }
        if (!text.equals(lastText)) {
            bar.setName(Component.literal(text));
            lastText = text;
        }
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            if (!bar.getPlayers().contains(player)) {
                bar.addPlayer(player);
            }
        }
    }

    public void remove() {
        bar.removeAllPlayers();
        bar.setVisible(false);
    }
}
