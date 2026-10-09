package com.deepwinter.client;

import com.deepwinter.network.StormSyncPayload;
import com.deepwinter.storm.StormFlags;
import net.minecraft.client.Minecraft;
import net.minecraft.util.Mth;

/** Client copy of the storm state, plus a smoothed 0..1 intensity used for fog, darkness, wind and particles. */
public final class ClientStormState {
	private static boolean active;
	private static float intensity;
	private static float prevIntensity;

	private ClientStormState() {
	}

	public static void apply(StormSyncPayload payload) {
		active = payload.active();
		StormFlags.active = payload.active();
		StormFlags.forced = payload.forced();
	}

	public static void tick(Minecraft client) {
		prevIntensity = intensity;
		float target = active && client.level != null ? client.level.getRainLevel(1.0F) : 0.0F;
		// Fade over roughly 10 seconds.
		intensity = Mth.approach(intensity, target, 0.005F);
	}

	public static void reset() {
		active = false;
		intensity = 0;
		prevIntensity = 0;
		StormFlags.reset();
	}

	public static boolean isActive() {
		return active;
	}

	public static float intensity(float partialTick) {
		return Mth.lerp(partialTick, prevIntensity, intensity);
	}
}
