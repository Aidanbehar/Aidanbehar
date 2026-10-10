package dev.aidanbehar.nuclearstation.sim;

/**
 * Inputs from the world that the plant simulation needs each step. Filled in by the
 * Minecraft layer from biome temperature, weather and configuration.
 */
public final class PlantEnvironment {
	/** Sea water temperature at the intake, C. */
	public double seaTemperature = 15.0;
	/** Ambient wet-bulb temperature for the cooling towers, C. */
	public double wetBulb = 12.0;
	/** Thunderstorms raise the chance of losing the offsite grid. */
	public boolean thunderstorm;
	/** Grid dispatcher demand, MW. Informational target for the operator. */
	public double gridDemandMW = 950;
	/** Multiplier applied to slow processes (xenon, decay heat tail, burnup, wear, batteries). */
	public double slowTimeFactor = 20.0;
	/** Multiplier on random equipment failure hazards. 0 disables random failures. */
	public double failureRateFactor = 1.0;
	/** If true, the RWST-to-sump switchover and other operator-only steps are performed automatically. */
	public boolean automaticOperatorActions = false;
}
