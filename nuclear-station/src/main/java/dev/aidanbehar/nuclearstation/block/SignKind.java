package dev.aidanbehar.nuclearstation.block;

import net.minecraft.util.StringRepresentable;

/** Pictogram shown on a {@link SignPlateBlock}. */
public enum SignKind implements StringRepresentable {
	RADIATION("radiation", 0),
	CONTAMINATION("contamination", 0),
	HIGH_RADIATION("high_radiation", 0),
	HIGH_VOLTAGE("high_voltage", 0),
	RESTRICTED("restricted", 0),
	NO_ENTRY("no_entry", 0),
	EXIT("exit", 9),
	PPE("ppe", 0),
	HOT_SURFACE("hot_surface", 0),
	PRESSURE("pressure", 0),
	EMERGENCY_SHOWER("emergency_shower", 0),
	FIRE("fire", 0),
	CRANE("crane", 0),
	MAGNETIC("magnetic", 0),
	LASER("laser", 0),
	HEARING("hearing", 0);

	private final String name;
	public final int light;

	SignKind(String name, int light) {
		this.name = name;
		this.light = light;
	}

	@Override
	public String getSerializedName() {
		return name;
	}
}
