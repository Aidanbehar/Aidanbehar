package dev.aidanbehar.nuclearstation.sim;

/** Fault injection used by development commands and tests. */
public final class DevHooks {
	private DevHooks() {
	}

	public static void fail(PlantModel model, EquipmentId id) {
		model.failEquipment(model.eq(id), "injected fault");
	}

	public static void gridLoss(PlantModel model) {
		model.loseGrid(1200);
	}

	/** Sets the RCS break area as a fraction of a double-ended guillotine break of a cold leg. */
	public static void loca(PlantModel model, double area) {
		model.breakArea = Math.max(model.breakArea, area);
		model.pendingEvents.add(new PlantEvent(PlantEvent.Type.RCS_BREAK, null, area));
	}

	/**
	 * Initiating events for a core meltdown: an extended station blackout (grid lost for
	 * days, both diesels and the turbine-driven aux feed pump failed). Nothing else is
	 * scripted - the core heats up, uncovers, oxidises, melts, fails the vessel and attacks
	 * the containment purely through the plant model. Operators can still intervene
	 * (repair a diesel, restore feed) and stop it, as in a real accident.
	 */
	public static void meltdown(PlantModel model) {
		model.loseGrid(1.0e9);
		model.gridOutageRemaining = Math.max(model.gridOutageRemaining, 1.0e9);
		for (EquipmentId id : new EquipmentId[] {EquipmentId.EDG_A, EquipmentId.EDG_B, EquipmentId.TDAFW}) {
			if (!model.eq(id).failed) {
				model.failEquipment(model.eq(id), "failed (meltdown scenario)");
			}
		}
		model.alarms.log(model.time, 1, "SCENARIO: extended station blackout - no AC power, no auxiliary feedwater");
	}
}
