package com.deepwinter.snow;

import com.deepwinter.config.DeepWinterConfig;
import com.deepwinter.storm.StormFlags;
import net.minecraft.core.BlockPos;
import net.minecraft.util.Mth;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.biome.Biome;

/** How cold a spot is for snow purposes, and how deep snow may get there. */
public final class SnowClimate {
	/** Vanilla's rain/snow line: biome temperature below this snows. */
	public static final float SNOW_LINE = 0.15F;

	private SnowClimate() {
	}

	/** Biome temperature with an altitude lapse rate stronger than vanilla's (higher = colder). */
	public static float adjustedTemperature(Biome biome, BlockPos pos) {
		float altitude = Math.max(0, pos.getY() - 80) * 0.004F;
		return biome.getBaseTemperature() - altitude;
	}

	/** 0 at the snow line, 1 for frozen peaks / very cold places. */
	public static float coldness(Biome biome, BlockPos pos) {
		return Mth.clamp((SNOW_LINE - adjustedTemperature(biome, pos)) / 0.85F, 0.0F, 1.0F);
	}

	/** Max depth in layers (1/8 block) for clear-weather snowfall. Mild snowy areas: ~4-5 layers. */
	public static int clearMaxLayers(Biome biome, BlockPos pos) {
		double base = 2 + coldness(biome, pos) * 14;
		return (int) Math.round(base * DeepWinterConfig.get().maxSnowDepthMultiplier);
	}

	/** Max depth in layers during storms. Snowy plains ~2 blocks, frozen peaks ~5 blocks. */
	public static int stormMaxLayers(Biome biome, BlockPos pos) {
		double base = (2 + coldness(biome, pos) * 14) * 2 + 8;
		return (int) Math.round(base * DeepWinterConfig.get().maxSnowDepthMultiplier);
	}

	/** Whether ordinary (non-storm) snow falls here, ignoring the storm override. */
	public static boolean naturallySnowy(Biome biome, BlockPos pos, Level level) {
		return biome.hasPrecipitation() && biome.coldEnoughToSnow(pos, level.getSeaLevel());
	}

	/** Whether the current storm reaches this biome. */
	public static boolean stormHere(Biome biome) {
		return StormFlags.appliesTo(biome);
	}

	/** Whether a storm could have reached this biome in the past (used for catch-up, where history is unknown). */
	public static boolean stormCapable(Biome biome, BlockPos pos, Level level) {
		return biome.hasPrecipitation()
			&& (biome.getBaseTemperature() <= StormFlags.STORM_BIOME_MAX_TEMPERATURE || naturallySnowy(biome, pos, level));
	}
}
