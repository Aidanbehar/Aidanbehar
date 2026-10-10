package dev.aidanbehar.nuclearstation.sim;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PlantModelTest {
	static PlantEnvironment calm() {
		PlantEnvironment env = new PlantEnvironment();
		env.failureRateFactor = 0;
		env.slowTimeFactor = 20;
		return env;
	}

	static void run(PlantModel m, PlantEnvironment env, double seconds) {
		for (double t = 0; t < seconds; t += 0.5) {
			m.step(0.5, env);
		}
	}

	static String summary(PlantModel m) {
		PlantSnapshot s = PlantSnapshot.capture(m);
		return String.format("t=%.0f n=%.4f%% Pth=%.0f Tavg=%.1f Thot=%.1f P=%.2f PZR=%.0f%% SG=%.0f%% Psg=%.2f gen=%.0f net=%.0f clad=%.0f fuel=%.0f flow=%.2f trip=%s(%s) SI=%s",
			m.time, m.kinetics.power() * 100, m.coreHeatToCoolant, m.rcsTavg, m.tHot, m.rcsPressure, m.pzrLevel,
			m.sgNarrowRange(), m.sgPressure(), m.generatorMW, m.netOutput, m.peakClad, m.fuelTemp, m.rcsFlow,
			m.reactorTripped, m.tripCause, m.siActuated) + " rho=" + s.get(Readout.REACTIVITY);
	}

	@Test
	void initialStateIsFullPowerEquilibrium() {
		PlantModel m = new PlantModel();
		System.out.println("initial: " + summary(m) + " boron=" + m.boronPpm);
		assertEquals(1.0, m.kinetics.power(), 0.02);
		assertTrue(m.generatorMW > 950 && m.generatorMW < 1080, "gross output " + m.generatorMW);
		assertTrue(m.boronPpm > 600 && m.boronPpm < 2000, "critical boron " + m.boronPpm);
	}

	@Test
	void steadyStateIsStableForTenMinutes() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		run(m, env, 600);
		System.out.println("steady: " + summary(m));
		assertFalse(m.reactorTripped, "tripped: " + m.tripCause);
		assertEquals(1.0, m.kinetics.power(), 0.04);
		assertEquals(309.5, m.rcsTavg, 1.5);
		assertEquals(15.5, m.rcsPressure, 0.25);
		assertTrue(m.pzrLevel > 45 && m.pzrLevel < 65, "pzr level " + m.pzrLevel);
		assertTrue(m.sgNarrowRange() > 40 && m.sgNarrowRange() < 60, "sg level " + m.sgNarrowRange());
		assertTrue(m.netOutput > 900, "net " + m.netOutput);
	}

	@Test
	void manualTripReachesHotStandbyWithDecayHeat() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		run(m, env, 30);
		PlantOperations.execute(m, PlantCommand.MANUAL_TRIP, 0, 0);
		run(m, env, 5);
		assertTrue(m.reactorTripped);
		assertTrue(m.controlBanks < 1 && m.shutdownBanks < 1, "rods inserted");
		run(m, env, 60);
		double decay60 = m.totalDecayFraction();
		System.out.println("trip+60: " + summary(m) + " decay=" + decay60);
		assertTrue(decay60 > 0.02 && decay60 < 0.05, "decay heat at 1 min " + decay60);
		run(m, env, 900);
		System.out.println("trip+960: " + summary(m) + " decay=" + m.totalDecayFraction());
		assertTrue(m.kinetics.power() < 1e-3, "neutron power should fall to source level");
		assertTrue(m.totalDecayFraction() > 0.003, "decay heat persists");
		assertEquals(291.7, m.rcsTavg, 6.0);
		assertFalse(m.siActuated);
		assertTrue(m.peakClad < 400);
	}

	@Test
	void controlRodsChangeReactivity() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		PlantOperations.execute(m, PlantCommand.ROD_MANUAL, 0, 0);
		double before = m.rodReactivity();
		PlantOperations.execute(m, PlantCommand.ROD_IN, 0, 0);
		run(m, env, 30);
		PlantOperations.execute(m, PlantCommand.ROD_STOP, 0, 0);
		assertTrue(m.rodReactivity() < before - 1e-4, "inserting rods adds negative reactivity");
		assertTrue(m.kinetics.power() < 0.99, "power falls after insertion: " + m.kinetics.power());
		run(m, env, 120);
		// temperature feedback restores criticality at a lower temperature
		assertTrue(Math.abs(m.reactivity()) < 5e-4, "feedback returns core to critical, rho=" + m.reactivity());
	}

	@Test
	void lossOfOffsitePowerIsHandledBySafetySystems() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		run(m, env, 10);
		m.loseGrid(1e9);
		m.offsiteBreakerClosed = false;
		run(m, env, 60);
		System.out.println("LOOP+60: " + summary(m) + " SA=" + m.live(Bus.SA) + " SB=" + m.live(Bus.SB));
		assertTrue(m.reactorTripped, "reactor trips on loss of power");
		assertTrue(m.live(Bus.SA) && m.live(Bus.SB), "diesels carry safety buses");
		run(m, env, 1800);
		m.alarms.recentLog(120).stream().filter(e -> e.priority() <= 2).forEach(e -> System.out.println("   log " + e));
		System.out.println("LOOP+1860: " + summary(m) + " afw=" + m.afwFlow + " adv=" + m.steamAdv + " natcirc=" + m.rcsFlow);
		assertTrue(m.afwFlow > 0 || m.sgNarrowRange() > 30, "aux feed maintains SG inventory");
		assertTrue(m.peakClad < 400, "core cooled by natural circulation, clad " + m.peakClad);
		assertEquals(0, m.coreDamage, 1e-9);
	}

	@Test
	void stationBlackoutWithoutAuxFeedLeadsToCoreDamage() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		m.failEquipment(m.eq(EquipmentId.EDG_A), "test");
		m.failEquipment(m.eq(EquipmentId.EDG_B), "test");
		m.failEquipment(m.eq(EquipmentId.TDAFW), "test");
		m.loseGrid(1e12);
		double coreDamageAt = -1;
		for (int i = 0; i < 4 * 3600 * 2; i++) {
			m.step(0.5, env);
			if (coreDamageAt < 0 && m.coreDamage > 0.01) {
				coreDamageAt = m.time;
				System.out.println("SBO core damage onset: " + summary(m));
			}
			if (m.time % 600 < 0.5) {
				System.out.println("SBO: " + summary(m) + " sgMass=" + (int) m.sgMass + " inv=" + (int) (m.rcsMass / 1000) + "t cov=" + m.coreCovered + " H2=" + (int) m.hydrogenKg);
			}
		}
		assertTrue(m.reactorTripped);
		assertTrue(coreDamageAt > 600, "core damage should take time to develop: " + coreDamageAt);
		assertTrue(m.coreDamage > 0.01, "core damage occurred");
		assertTrue(m.hydrogenKg > 10, "zirconium oxidation produced hydrogen");
		assertTrue(m.totalEnvironmentalRelease >= 0);
	}

	@Test
	void smallBreakLocaIsMitigatedBySafetyInjection() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		m.breakArea = 0.003;
		double minCovered = 1;
		double maxClad = 0;
		for (int i = 0; i < 2 * 3600; i++) {
			m.step(0.5, env);
			minCovered = Math.min(minCovered, m.coreCovered);
			maxClad = Math.max(maxClad, m.peakClad);
			if (i % 600 == 0) {
				System.out.println("SBLOCA: " + summary(m) + " inv=" + (int) (m.rcsMass / 1000) + "t si=" + (int) m.siFlow + " cont=" + (int) m.containmentPressure);
			}
		}
		assertTrue(m.siActuated, "SI actuated");
		assertTrue(maxClad < 1200, "peak clad below 1200 C: " + maxClad);
		assertEquals(0, m.coreDamage, 1e-9);
	}

	@Test
	void xenonPeaksAfterShutdown() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		PlantOperations.execute(m, PlantCommand.MANUAL_TRIP, 0, 0);
		double peak = 0;
		for (int i = 0; i < 3600 * 2; i++) {
			m.step(0.5, env);
			peak = Math.max(peak, m.xenon);
		}
		System.out.println("xenon peak " + peak + " now " + m.xenon);
		assertTrue(peak > 1.4 && peak < 2.5, "xenon peak " + peak);
		assertTrue(m.xenon < peak, "xenon decays after the peak");
	}

	@Test
	void saveAndLoadRoundTripIsExact() {
		PlantModel a = new PlantModel();
		PlantEnvironment env = calm();
		env.failureRateFactor = 1;
		a.seedRandom(1234);
		run(a, env, 30);
		PlantOperations.execute(a, PlantCommand.MANUAL_TRIP, 0, 0);
		run(a, env, 20);
		StateIO.MapState state = new StateIO.MapState();
		a.save(state);
		PlantModel b = new PlantModel();
		b.load(state);
		run(a, env, 60);
		run(b, env, 60);
		assertEquals(a.rcsTavg, b.rcsTavg, 1e-6);
		assertEquals(a.rcsPressure, b.rcsPressure, 1e-6);
		assertEquals(a.kinetics.power(), b.kinetics.power(), 1e-9);
		assertEquals(a.sgMass, b.sgMass, 1e-3);
	}

	@Test
	void interlocksBlockUnsafeActions() {
		PlantModel m = new PlantModel();
		assertFalse(PlantOperations.execute(m, PlantCommand.RHR_COOLDOWN_ON, 0, 0).accepted(), "RHR at full pressure");
		assertFalse(PlantOperations.execute(m, PlantCommand.ROD_OUT, 0, 0).accepted(), "rods in auto");
		PlantOperations.execute(m, PlantCommand.MANUAL_TRIP, 0, 0);
		assertFalse(PlantOperations.execute(m, PlantCommand.GENERATOR_SYNC, 0, 0).accepted(), "sync with turbine tripped");
		assertFalse(PlantOperations.execute(m, PlantCommand.RESET_TRIP, 0, 0).accepted(), "reset while rods dropping");
	}

	@Test
	void snapshotEncodesAndDecodes() {
		PlantModel m = new PlantModel();
		run(m, calm(), 5);
		PlantSnapshot s = PlantSnapshot.capture(m);
		PlantSnapshot d = PlantSnapshot.decode(s.encode());
		assertEquals(s.get(Readout.T_AVG), d.get(Readout.T_AVG), 1e-3);
		assertEquals(s.flags, d.flags);
		assertEquals(s.log.size(), d.log.size());
	}

	@Test
	void simulationIsDeterministic() {
		PlantEnvironment env = calm();
		env.failureRateFactor = 3;
		PlantModel a = new PlantModel();
		PlantModel b = new PlantModel();
		a.seedRandom(42);
		b.seedRandom(42);
		run(a, env, 600);
		run(b, env, 600);
		assertEquals(a.rcsTavg, b.rcsTavg, 0);
		assertEquals(a.time, b.time, 0);
	}

	@Test
	void reactorCanBeRestartedWithRodsAfterTrip() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		PlantOperations.execute(m, PlantCommand.MANUAL_TRIP, 0, 0);
		run(m, env, 120);
		assertTrue(PlantOperations.execute(m, PlantCommand.RESET_TRIP, 0, 0).accepted(), "trip reset");
		assertTrue(PlantOperations.execute(m, PlantCommand.SHUTDOWN_BANKS_OUT, 0, 0).accepted());
		run(m, env, 240);
		assertEquals(PlantModel.ROD_STEPS, m.shutdownBanks, 0.01, "shutdown banks withdrawn");
		PlantOperations.execute(m, PlantCommand.ROD_MANUAL, 0, 0);
		double rhoStart = m.reactivity();
		assertTrue(PlantOperations.execute(m, PlantCommand.ROD_OUT, 0, 0).accepted());
		double lowestPower = m.kinetics.power();
		for (int i = 0; i < 2400 && m.reactivity() < 0.0015; i++) {
			m.step(0.5, env);
			lowestPower = Math.min(lowestPower, m.kinetics.power());
		}
		PlantOperations.execute(m, PlantCommand.ROD_STOP, 0, 0);
		System.out.println("startup: rods=" + m.controlBanks + " SUR=" + m.kinetics.startupRate() + " rho=" + m.reactivity() + " n=" + m.kinetics.power());
		assertTrue(m.reactivity() > rhoStart, "withdrawal adds reactivity");
		double atStop = m.kinetics.power();
		run(m, env, 20);
		assertTrue(m.kinetics.power() > atStop, "power keeps rising");
		// accelerated xenon build-up after the trip steadily erodes the margin - realistic restart race
		assertTrue(m.kinetics.startupRate() > 0.1, "reactor supercritical with positive startup rate: " + m.kinetics.startupRate());
	}

	@Test
	void turbineLoadReductionIsFollowedByAutomaticRodControl() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		assertTrue(PlantOperations.execute(m, PlantCommand.LOAD_SETPOINT, 0, 700).accepted());
		run(m, env, 900);
		System.out.println("load700: " + summary(m));
		assertFalse(m.reactorTripped);
		assertEquals(700, m.generatorMW, 25);
		assertTrue(m.kinetics.power() < 0.8 && m.kinetics.power() > 0.6, "reactor power follows turbine load: " + m.kinetics.power());
		assertEquals(m.tref(), m.rcsTavg, 2.0);
	}

	@Test
	void emergencyShutdownDoesNotRemoveThermalRisk() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = calm();
		// trip, then lose every heat sink: no feedwater of any kind
		PlantOperations.execute(m, PlantCommand.MANUAL_TRIP, 0, 0);
		for (EquipmentId id : new EquipmentId[] {EquipmentId.MFW_A, EquipmentId.MFW_B, EquipmentId.MDAFW_A, EquipmentId.MDAFW_B, EquipmentId.TDAFW}) {
			m.failEquipment(m.eq(id), "test");
		}
		run(m, env, 3600);
		System.out.println("no-feed: " + summary(m) + " sg=" + (int) m.sgMass);
		assertTrue(m.sgMass < 0.3 * PlantModel.SG_MASS_NOM, "decay heat boils the steam generators dry");
	}
}
