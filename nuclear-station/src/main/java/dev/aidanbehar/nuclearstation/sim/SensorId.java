package dev.aidanbehar.nuclearstation.sim;

/** Protection-system measured parameters. Each is measured by four redundant channels (I-IV). */
public enum SensorId {
	POWER_RANGE("Power Range Flux", "%", 2.0),
	PZR_PRESSURE("Pressurizer Pressure", "MPa", 0.25),
	RCS_FLOW("RCS Loop Flow", "%", 4.0),
	SG_LEVEL("SG Narrow-Range Level", "%", 6.0),
	T_HOT("Hot Leg Temperature", "C", 4.0),
	CONT_PRESSURE("Containment Pressure", "kPa", 6.0);

	public final String label;
	public final String unit;
	/** Deviation from the channel median that raises a CHANNEL DEVIATION alarm. */
	public final double deviationThreshold;

	SensorId(String label, String unit, double deviationThreshold) {
		this.label = label;
		this.unit = unit;
		this.deviationThreshold = deviationThreshold;
	}
}
