package dev.aidanbehar.nuclearstation.sim;

/** Spare part consumed by a local maintenance station to repair a piece of equipment. */
public enum SparePart {
	PUMP_SEAL_KIT("pump_seal_kit"),
	MOTOR_ASSEMBLY("motor_assembly"),
	BREAKER_MODULE("breaker_module"),
	DIESEL_SERVICE_KIT("diesel_service_kit"),
	INSTRUMENT_MODULE("instrument_module"),
	VALVE_ACTUATOR("valve_actuator"),
	BATTERY_CELLS("battery_cells"),
	TRANSFORMER_KIT("transformer_kit"),
	SCREEN_PANELS("screen_panels"),
	BEARING_SET("bearing_set");

	/** Item id (in the mod namespace) of the spare part item. */
	public final String itemId;

	SparePart(String itemId) {
		this.itemId = itemId;
	}
}
