package com.deepwinter.client;

import com.deepwinter.temperature.BodyTemperature;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.network.chat.Component;
import net.minecraft.util.Mth;
import net.minecraft.world.level.GameType;

/**
 * Small thermometer beside the hotbar showing an approximate body temperature band. The value is
 * deliberately blurred: a slow random drift is added and the mercury only moves in coarse steps, so
 * players can't read exact numbers (only the Thermometer item shows those).
 */
public final class TemperatureHud {
	public enum Band {
		FREEZING(-10, 0xFF9FD8FF), COLD(0, 0xFF5FA8FF), CHILLY(10, 0xFF7FD0D0), COMFORTABLE(26, 0xFF7FD860),
		WARM(35, 0xFFFFB040), HOT(Float.MAX_VALUE, 0xFFFF5030);

		final float upper;
		final int colour;

		Band(float upper, int colour) {
			this.upper = upper;
			this.colour = colour;
		}

		static Band of(float celsius) {
			for (Band b : values()) {
				if (celsius < b.upper) {
					return b;
				}
			}
			return HOT;
		}

		Component label() {
			return Component.translatable("hud.deepwinter.band." + name().toLowerCase(java.util.Locale.ROOT));
		}
	}

	private static float jitter;
	private static float jitterTarget;
	private static float shown = Float.NaN;

	private TemperatureHud() {
	}

	public static void tick(Minecraft client) {
		LocalPlayer player = client.player;
		if (player == null) {
			shown = Float.NaN;
			return;
		}
		Float body = player.getAttached(BodyTemperature.HUD);
		if (body == null) {
			return;
		}
		// Random walk of a few degrees so band edges are fuzzy.
		if (player.tickCount % 40 == 0) {
			jitterTarget = (player.getRandom().nextFloat() * 2 - 1) * 3.0F;
		}
		jitter = Mth.approach(jitter, jitterTarget, 0.05F);
		float target = body + jitter;
		shown = Float.isNaN(shown) ? target : Mth.lerp(0.05F, shown, target);
	}

	public static void render(GuiGraphicsExtractor graphics, DeltaTracker delta) {
		Minecraft mc = Minecraft.getInstance();
		LocalPlayer player = mc.player;
		if (player == null || Float.isNaN(shown) || mc.gameMode == null
			|| mc.gameMode.getPlayerMode() == GameType.SPECTATOR) {
			return;
		}
		Band band = Band.of(shown);
		// Coarse mercury: 8 steps from -25 °C to 50 °C.
		float frac = Mth.clamp((shown + 25.0F) / 75.0F, 0.0F, 1.0F);
		int steps = Math.round(frac * 8);

		int x = graphics.guiWidth() / 2 + 91 + 8;
		int y = graphics.guiHeight() - 21;
		int frame = 0xFF2A2A2A;
		int glass = 0xFFE8EEF2;
		// Tube (outline + glass), mercury rising from the bulb.
		graphics.fill(x + 1, y - 1, x + 6, y + 13, frame);
		graphics.fill(x + 2, y, x + 5, y + 13, glass);
		int mercuryTop = y + 12 - steps * 12 / 8;
		graphics.fill(x + 2, Math.min(mercuryTop, y + 12), x + 5, y + 13, band.colour);
		// Bulb.
		graphics.fill(x, y + 12, x + 7, y + 19, frame);
		graphics.fill(x + 1, y + 13, x + 6, y + 18, band.colour);
		// Tick marks.
		for (int i = 2; i < 12; i += 3) {
			graphics.fill(x + 6, y + i, x + 8, y + i + 1, frame);
		}

		var pose = graphics.pose();
		pose.pushMatrix();
		pose.translate(x + 11, y + 6);
		pose.scale(0.75F, 0.75F);
		graphics.text(mc.font, band.label(), 0, 0, band.colour, true);
		pose.popMatrix();
	}
}
