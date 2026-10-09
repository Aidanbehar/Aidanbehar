package com.deepwinter.storm;

import net.minecraft.world.level.biome.Biome;

/**
 * Global storm flags read by the {@link Biome} precipitation mixin. Weather is server-wide and only the
 * overworld-style dimensions have precipitation, so a pair of statics is enough; the client copy is
 * kept in sync by {@code StormSyncPayload}. In single player both sides share these values, which is
 * consistent because they always agree.
 */
public final class StormFlags {
	/** Biomes whose base temperature is at or below this get the storm (snowy biomes, taigas, groves, peaks, windswept hills...). */
	public static final float STORM_BIOME_MAX_TEMPERATURE = 0.35F;

	public static volatile boolean active;
	public static volatile boolean forced;

	private StormFlags() {
	}

	public static boolean appliesTo(Biome biome) {
		if (!active || !biome.hasPrecipitation()) {
			return false;
		}
		return forced || biome.getBaseTemperature() <= STORM_BIOME_MAX_TEMPERATURE;
	}

	public static void reset() {
		active = false;
		forced = false;
	}
}
