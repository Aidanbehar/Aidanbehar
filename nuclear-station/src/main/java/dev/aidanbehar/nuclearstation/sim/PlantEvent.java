package dev.aidanbehar.nuclearstation.sim;

/**
 * Discrete events emitted by the simulation for the world layer (sounds, particles,
 * physical damage, contamination). {@code equipment} may be null.
 */
public record PlantEvent(Type type, EquipmentId equipment, double magnitude) {
	public enum Type {
		REACTOR_TRIP,
		TURBINE_TRIP,
		SAFETY_INJECTION,
		PORV_LIFT,
		SAFETY_VALVE_LIFT,
		GRID_LOSS,
		GRID_RESTORED,
		EDG_START,
		EQUIPMENT_FAILURE,
		EQUIPMENT_REPAIRED,
		TRANSFORMER_FIRE,
		RCS_BREAK,
		CORE_DAMAGE_ONSET,
		HYDROGEN_BURN,
		CONTAINMENT_FAILURE,
		VESSEL_FAILURE,
		BASEMAT_MELT_THROUGH,
		SFP_BOILING,
		SFP_FUEL_DAMAGE
	}
}
