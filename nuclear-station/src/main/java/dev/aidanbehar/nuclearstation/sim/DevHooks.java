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
}
