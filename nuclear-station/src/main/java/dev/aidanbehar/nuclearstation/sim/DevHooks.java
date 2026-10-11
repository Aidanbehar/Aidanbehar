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

	/** How far a forced meltdown has gone. */
	public enum Severity {
		/** Partial melt held inside the vessel and containment (like Three Mile Island 2). */
		MINOR,
		/** Full melt, vessel failure, concrete attack, a leaking containment. */
		MAJOR,
		/** Hydrogen explosion opens the containment, melt-through, burning pool fuel, large release. */
		CATASTROPHIC
	}

	/**
	 * Puts the plant directly into the aftermath of a severe accident of the given severity:
	 * the same state variables the accident model would reach, and the same events, so the
	 * world damage, radiation fields, contamination plume and sirens all follow as usual.
	 */
	public static void forceMeltdown(PlantModel m, Severity severity) {
		meltdown(m);
		if (!m.reactorTripped) {
			m.tripReactor("core meltdown");
		}
		boolean major = severity != Severity.MINOR;
		boolean worst = severity == Severity.CATASTROPHIC;
		m.peakClad = major ? 2400 : 1900;
		m.fuelTemp = major ? 2600 : 2200;
		m.gapReleased = 1;
		m.oxidation = major ? 0.7 : 0.45;
		m.coreDamage = major ? 1.0 : 0.5;
		m.coreMelt = major ? 1.0 : 0.35;
		m.breakArea = Math.max(m.breakArea, major ? 0.05 : 0.002);
		m.hydrogenKg = worst ? 200 : 60;
		m.alarms.log(m.time, 1, "Core exit thermocouples and radiation monitors indicate CORE DAMAGE");
		m.coreDamageAnnounced = true;
		m.pendingEvents.add(new PlantEvent(PlantEvent.Type.CORE_DAMAGE_ONSET, null, m.coreDamage));
		double toContainment = 0.03 + 0.45 * m.coreDamage + 0.25 * m.coreMelt;
		if (major) {
			m.lowerHeadDebris = 1;
			m.lowerHeadTemp = 1500;
			m.vesselFailed = true;
			m.basematErosion = worst ? 3.2 : 1.4;
			m.containmentEnergy += 40_000;
			m.alarms.log(m.time, 1, "Reactor vessel lower head failure - corium in reactor cavity");
			m.pendingEvents.add(new PlantEvent(PlantEvent.Type.VESSEL_FAILURE, null, 1));
			toContainment += 0.1;
		}
		m.alarms.log(m.time, 1, String.format("HYDROGEN DEFLAGRATION in containment: %.0f kg burned", worst ? 600.0 : 150.0));
		m.pendingEvents.add(new PlantEvent(PlantEvent.Type.HYDROGEN_BURN, null, worst ? 1100 : 450));
		m.containmentIntegrity = worst ? 0.08 : (major ? 0.6 : 1.0);
		double release = worst ? 0.22 : (major ? 0.02 : 0.0002);
		if (worst) {
			m.alarms.log(m.time, 1, "CONTAINMENT FAILURE - loss of containment integrity");
			m.pendingEvents.add(new PlantEvent(PlantEvent.Type.CONTAINMENT_FAILURE, null, 1 - m.containmentIntegrity));
			m.basematMeltThrough = true;
			m.alarms.log(m.time, 1, "Basemat melt-through - corium has penetrated the containment foundation");
			m.pendingEvents.add(new PlantEvent(PlantEvent.Type.BASEMAT_MELT_THROUGH, null, 1));
			m.sfpLevel = 0.1;
			m.sfpTemp = 100;
			m.sfpDamage = 0.6;
			m.pendingEvents.add(new PlantEvent(PlantEvent.Type.SFP_FUEL_DAMAGE, null, 0));
		}
		m.releasedToContainment = Math.max(m.releasedToContainment, toContainment);
		m.airborneActivity = Math.max(0, toContainment - release) * (worst ? 0.3 : 0.6);
		m.pendingEnvironmentalRelease += release;
		m.totalEnvironmentalRelease += release;
	}
}
