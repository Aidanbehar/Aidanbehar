package com.deepwinter.temperature;

/**
 * Every contribution (°C) to the temperature at a spot, as shown by the thermometer.
 *
 * @param ambient    environment temperature (everything except clothing)
 * @param felt       what the body tends toward: ambient plus insulation
 * @param shelter    0 = fully exposed, 1 = indoors behind walls
 */
public record TemperatureBreakdown(
	float biome, float altitude, float timeOfDay, float weather, float wind, float wetness,
	float shelterBuffer, float heat, float insulation, float ambient, float felt, float shelter,
	boolean storm, String dimension
) {
}
