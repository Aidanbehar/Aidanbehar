package com.deepwinter.config;

import com.deepwinter.DeepWinter;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Plain JSON config stored in config/deepwinter.json. Every field has a sane default so a
 * missing or partial file still works; unknown fields are ignored.
 */
public final class DeepWinterConfig {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
	private static final Path PATH = FabricLoader.getInstance().getConfigDir().resolve("deepwinter.json");
	private static DeepWinterConfig instance = new DeepWinterConfig();

	// --- Snow accumulation ---
	/** Scales how deep snow may get everywhere (1.0 = default depths). */
	public double maxSnowDepthMultiplier = 1.0;
	/** Scales how often snow is added in clear-sky snowfall. */
	public double accumulationSpeed = 1.0;
	/** Snow columns visited per loaded chunk per tick are drawn from this budget (whole level). */
	public int snowColumnBudgetPerTick = 384;
	/** Chance that a layer added on top of 1+ blocks of deep snow becomes powder snow (normal snowfall). */
	public double powderSnowChance = 0.04;
	/** Same, during storms. */
	public double stormPowderSnowChance = 0.18;

	// --- Storms ---
	/** Chance that rain starting in the world becomes a snowstorm in cold biomes. */
	public double stormChance = 0.6;
	/** Accumulation speed multiplier while a storm is active. */
	public double stormAccumulationMultiplier = 5.0;
	/** Scales client storm particle density (0 disables them). */
	public double stormParticleDensity = 1.0;
	/** Hard cap on storm particles spawned per client tick. */
	public int maxStormParticlesPerTick = 220;
	/** Maximum layers (1/8 block each) a chunk can catch up when it loads after being unloaded. */
	public int catchUpCapLayers = 40;
	/** Chunks processed for catch-up per tick. */
	public int catchUpChunksPerTick = 4;

	// --- Temperature ---
	/** Body temperature (°C, felt) below which an entity starts freezing. */
	public double freezingThreshold = -10.0;
	public boolean villagersFreeze = true;
	/** Also track temperature for other mobs (cows, pigs, ...). Off by default for performance. */
	public boolean otherMobsFreeze = false;
	public boolean heatDamage = false;
	/** Body temperature (°C) above which heat damage applies, if enabled. */
	public double heatDamageThreshold = 48.0;
	public boolean useFahrenheit = false;

	// --- Debug ---
	/** Extra runtime multiplier for testing (set with /deepwinter speed). */
	public double debugSpeedMultiplier = 1.0;

	public static DeepWinterConfig get() {
		return instance;
	}

	public static void load() {
		if (Files.exists(PATH)) {
			try (Reader reader = Files.newBufferedReader(PATH)) {
				DeepWinterConfig loaded = GSON.fromJson(reader, DeepWinterConfig.class);
				if (loaded != null) {
					instance = loaded;
				}
			} catch (Exception e) {
				DeepWinter.LOGGER.error("Could not read {}, using defaults", PATH, e);
			}
		}
		instance.clamp();
		save();
	}

	public static void save() {
		try {
			Files.createDirectories(PATH.getParent());
			try (Writer writer = Files.newBufferedWriter(PATH)) {
				GSON.toJson(instance, writer);
			}
		} catch (IOException e) {
			DeepWinter.LOGGER.error("Could not write {}", PATH, e);
		}
	}

	public void clamp() {
		maxSnowDepthMultiplier = clamp(maxSnowDepthMultiplier, 0.0, 10.0);
		accumulationSpeed = clamp(accumulationSpeed, 0.0, 100.0);
		snowColumnBudgetPerTick = (int) clamp(snowColumnBudgetPerTick, 0, 20000);
		powderSnowChance = clamp(powderSnowChance, 0.0, 1.0);
		stormPowderSnowChance = clamp(stormPowderSnowChance, 0.0, 1.0);
		stormChance = clamp(stormChance, 0.0, 1.0);
		stormAccumulationMultiplier = clamp(stormAccumulationMultiplier, 0.0, 100.0);
		stormParticleDensity = clamp(stormParticleDensity, 0.0, 4.0);
		maxStormParticlesPerTick = (int) clamp(maxStormParticlesPerTick, 0, 4000);
		catchUpCapLayers = (int) clamp(catchUpCapLayers, 0, 400);
		catchUpChunksPerTick = (int) clamp(catchUpChunksPerTick, 0, 64);
		freezingThreshold = clamp(freezingThreshold, -60.0, 30.0);
		heatDamageThreshold = clamp(heatDamageThreshold, 20.0, 200.0);
		debugSpeedMultiplier = clamp(debugSpeedMultiplier, 0.0, 1000.0);
	}

	private static double clamp(double v, double min, double max) {
		return Double.isNaN(v) ? min : Math.max(min, Math.min(max, v));
	}
}
