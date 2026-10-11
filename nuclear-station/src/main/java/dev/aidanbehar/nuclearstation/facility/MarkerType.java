package dev.aidanbehar.nuclearstation.facility;

/** Kinds of positions inside the facility that the plant layer acts on after generation. */
public enum MarkerType {
	/** AC-powered ceiling lamp (goes dark on loss of lighting power). */
	LAMP,
	/** Indicator panel whose STATUS mirrors plant alarms. */
	PANEL,
	/** Annunciator panel section. */
	ANNUNCIATOR,
	/** Rotating beacon lit by evacuation / radiation alarms. */
	BEACON,
	/** Local maintenance station for one piece of equipment (data = EquipmentId ordinal). */
	STATION,
	/** Reactor trip pushbutton wired into the protection system. */
	SCRAM,
	/** Operator console. */
	CONSOLE,
	/** Location of a major component, used for sounds, particles and damage (data = Feature ordinal). */
	FEATURE,
	/** Stairwell bounding box corners (data 0 = minimum, 1 = maximum), for content upgrades. */
	STAIRWELL,
	/** Outdoor emergency siren. */
	SIREN
}
