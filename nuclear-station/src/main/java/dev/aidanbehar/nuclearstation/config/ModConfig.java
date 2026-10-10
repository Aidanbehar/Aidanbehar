package dev.aidanbehar.nuclearstation.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import dev.aidanbehar.nuclearstation.NuclearStation;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import net.fabricmc.loader.api.FabricLoader;

/**
 * Mod configuration, stored as {@code config/nuclearstation.json}. Defaults give the
 * intended experience; options in {@link Development} are for testing and can destroy
 * or duplicate builds if misused, so they are grouped and named accordingly.
 */
public final class ModConfig {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
	private static ModConfig instance = new ModConfig();

	public Facility facility = new Facility();
	public Simulation simulation = new Simulation();
	public Radiation radiation = new Radiation();
	public Geology geology = new Geology();
	public Experimental experimental = new Experimental();
	public Development development = new Development();

	public static final class Facility {
		/** Generate the power station in new and existing worlds. */
		public boolean enabled = true;
		/** Minimum and maximum distance from world spawn (0,0) searched for a coastal site. */
		public int searchMinDistance = 900;
		public int searchMaxDistance = 6000;
		/** Milliseconds per server tick spent building facility chunks. */
		public int generationBudgetMs = 20;
		/**
		 * Chunks whose inhabited time exceeds this many ticks are treated as player
		 * territory and are not overwritten if they lie inside the footprint.
		 */
		public long protectInhabitedChunksTicks = 12000;
	}

	public static final class Simulation {
		/** Ticks between plant simulation updates (10 = twice a second). */
		public int updateIntervalTicks = 10;
		/** Acceleration of slow processes: xenon, decay heat tail, burnup, wear, battery life. */
		public double slowTimeFactor = 20.0;
		/** CALM (no random failures), NORMAL, HARSH. */
		public String accidentDifficulty = "NORMAL";
		/** Perform operator-only steps (e.g. sump recirculation switchover) automatically. */
		public boolean automaticOperatorActions = false;
		/** Simulate the plant even when no player is in the Overworld. */
		public boolean runWithoutPlayers = true;
	}

	public static final class Radiation {
		/** Multiplier on all dose rates. */
		public double severity = 1.0;
		/** Apply radiation sickness effects and damage. */
		public boolean sickness = true;
		/** Radius (blocks) around the plant over which an environmental release can deposit. */
		public int releaseSpreadRadius = 700;
	}

	public static final class Geology {
		public boolean generateOres = true;
		public boolean generateMines = true;
	}

	public static final class Experimental {
		/** Reserved: the experimental reaction chamber has no active behaviour yet. */
		public boolean enableExperimentalChamber = false;
	}

	public static final class Development {
		/** DEVELOPMENT ONLY. "AUTO" (coastal search), "NEAR_SPAWN" (first suitable site near spawn), "FIXED". */
		public String placementMode = "AUTO";
		/** DEVELOPMENT ONLY. Site origin (north-west corner) for placementMode FIXED. */
		public int fixedOriginX = 0;
		public int fixedOriginZ = 0;
		/** DEVELOPMENT ONLY. Allow /nps dev regenerate (re-paints every facility chunk). Use only in disposable worlds. */
		public boolean allowRegenerate = false;
		/** Verbose diagnostic logging (generation progress, radiation timing). */
		public boolean debugLogging = false;
	}

	public static ModConfig get() {
		return instance;
	}

	public double failureRateFactor() {
		return switch (simulation.accidentDifficulty.toUpperCase()) {
			case "CALM" -> 0.0;
			case "HARSH" -> 3.0;
			default -> 1.0;
		};
	}

	public static void load() {
		Path path = FabricLoader.getInstance().getConfigDir().resolve(NuclearStation.MOD_ID + ".json");
		if (Files.exists(path)) {
			try (Reader reader = Files.newBufferedReader(path)) {
				ModConfig loaded = GSON.fromJson(reader, ModConfig.class);
				if (loaded != null) {
					instance = loaded;
					instance.fillDefaults();
				}
			} catch (IOException | JsonParseException e) {
				NuclearStation.LOG.error("Could not read {}, using defaults: {}", path, e.getMessage());
			}
		}
		save(path);
	}

	private void fillDefaults() {
		if (facility == null) {
			facility = new Facility();
		}
		if (simulation == null) {
			simulation = new Simulation();
		}
		if (radiation == null) {
			radiation = new Radiation();
		}
		if (geology == null) {
			geology = new Geology();
		}
		if (experimental == null) {
			experimental = new Experimental();
		}
		if (development == null) {
			development = new Development();
		}
		simulation.updateIntervalTicks = Math.max(1, Math.min(100, simulation.updateIntervalTicks));
		simulation.slowTimeFactor = Math.max(1, Math.min(500, simulation.slowTimeFactor));
		facility.generationBudgetMs = Math.max(2, Math.min(45, facility.generationBudgetMs));
	}

	private static void save(Path path) {
		try {
			Files.createDirectories(path.getParent());
			try (Writer writer = Files.newBufferedWriter(path)) {
				GSON.toJson(instance, writer);
			}
		} catch (IOException e) {
			NuclearStation.LOG.warn("Could not write {}: {}", path, e.getMessage());
		}
	}
}
