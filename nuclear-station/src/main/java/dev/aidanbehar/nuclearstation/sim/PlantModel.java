package dev.aidanbehar.nuclearstation.sim;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Server-authoritative simulation of the Meridian Point pressurized-water reactor unit.
 *
 * <h2>Scope and units</h2>
 * Rated thermal power is 3000 MWt (about 1000 MWe gross). Temperatures are degrees C,
 * pressures MPa absolute (condenser kPa, containment kPa), powers MW, energies MJ, heat
 * capacities MJ/K, mass flows kg/s, time seconds. Reactor kinetics, heat transfer,
 * pressure and turbine dynamics run in real time. Slow processes (xenon, the long tail
 * of decay heat, burnup, wear, battery and fuel-oil depletion, spent-fuel-pool heat-up)
 * are accelerated by {@link PlantEnvironment#slowTimeFactor} so they can be experienced
 * within a play session.
 *
 * <h2>Structure</h2>
 * {@link #step} subdivides each update into 0.05 s sub-steps. Each sub-step runs, in
 * order: electrical distribution, equipment dynamics and failures, instrumentation and
 * protection, automatic control, reactor physics, thermal-hydraulics, turbine-generator,
 * containment / severe accident, spent fuel pool. Alarms are evaluated once per update.
 *
 * <p>No behaviour here is driven by a timer or an unexplained random number. The only
 * stochastic element is equipment reliability: each item has a hazard rate that grows
 * as its condition wears down, plus a probability of failing on demand. Everything that
 * follows a failure is the deterministic response of the plant.
 */
public final class PlantModel {
	// ---------------------------------------------------------------- constants
	public static final double P_NOM = 3000.0;
	static final double C_FUEL = 30.0;
	static final double UA_FUEL = 6.0;
	static final double C_PRIMARY = 2500.0;
	static final double UA_SG = 120.0;
	static final double FLOW_CP = 93.0;
	static final double C_SECONDARY = 1500.0;
	static final double SG_MASS_NOM = 180_000.0;
	static final double STEAM_FULL = 1667.0;
	static final double CV_TURBINE = 270.0;
	static final double CV_DUMP = 0.40 * CV_TURBINE;
	static final double CV_ADV = 0.25 * CV_TURBINE;
	static final double CV_SG_SAFETY = 1.20 * CV_TURBINE;
	static final double RCS_MASS_NOM = 250_000.0;
	static final double C_CONDENSER = 400.0;
	static final double UA_CONDENSER = 250.0;
	static final double CW_FLOW_FULL = 60_000.0;
	static final double CP_WATER = 4.18e-3;
	static final double TURBINE_RATED_RPM = 1800.0;
	static final double TURBINE_KINETIC_ENERGY = 5500.0;
	static final double GSU_RATING = 1100.0;
	static final double EDG_CAPACITY = 7.0;
	static final double CST_CAPACITY = 1_500_000.0;
	static final double RWST_CAPACITY = 1_600_000.0;
	static final double ACCUMULATOR_CAPACITY = 90_000.0;
	static final double ZR_OXIDATION_ENERGY = 130_000.0;
	static final double H2_FULL_OXIDATION = 880.0;
	static final int ROD_STEPS = 228;
	public static final int CONTROL_TRAVEL = 528;
	static final double NO_LOAD_TAVG = 291.7;
	static final double FULL_LOAD_TAVG = 309.5;
	static final double SUBSTEP = 0.05;

	// decay heat groups: fraction of rated power at saturation, half-life (s), accelerated?
	static final double[] DH_FRACTION = {0.017, 0.013, 0.012, 0.010, 0.006, 0.004};
	static final double[] DH_HALFLIFE = {3.0, 40.0, 400.0, 5400.0, 108_000.0, 1_730_000.0};
	static final boolean[] DH_SLOW = {false, false, false, true, true, true};
	static final double DH_TOTAL = 0.062;

	// xenon constants (per second of slow time)
	static final double XE_LAMBDA_I = 2.87e-5;
	static final double XE_LAMBDA_X = 2.09e-5;
	static final double XE_BURNOUT = 6.5e-5;
	static final double XE_SOURCE = XE_LAMBDA_X + XE_BURNOUT;
	static final double XE_WORTH = 0.027;

	// ---------------------------------------------------------------- state
	double time;
	long rngState = 0x5DEECE66DL;

	final PointKinetics kinetics = new PointKinetics(1.0);
	final Map<EquipmentId, Equipment> equipment = new EnumMap<>(EquipmentId.class);
	final Sensors sensors = new Sensors();
	final AlarmSystem alarms = new AlarmSystem();
	final List<PlantEvent> pendingEvents = new ArrayList<>();

	// reactor
	double shutdownBanks = ROD_STEPS;
	double controlBanks = 470;
	int rodMotion;
	/** +1 withdrawing, -1 inserting, 0 stationary. Shutdown banks move at 64 steps/min. */
	int shutdownMotion;
	boolean rodAuto = true;
	boolean reactorTripped;
	String tripCause = "";
	double boronPpm = 1200;
	double boronTarget = Double.NaN;
	double iodine;
	double xenon;
	double burnup = 0.35;
	final double[] decayHeat = new double[6];
	double fuelTemp;
	double rcsTavg = FULL_LOAD_TAVG;
	double previousTavg = FULL_LOAD_TAVG;
	double previousPower = 1.0;
	double fastPowerRate;

	// primary
	double rcsPressure = 15.51;
	double rcsMass = RCS_MASS_NOM;
	double voidFraction;
	double rcsFlow = 1.0;
	double breakArea;
	double identifiedLeak = 0.3;
	double sealLeak;
	double sealCoolingLostTime;
	double pzrHeaterMW;
	double sprayFraction;
	boolean pzrHeatersAuto = true;
	boolean pzrHeatersManualOn;
	boolean sprayAuto = true;
	boolean sprayManualOpen;
	final boolean[] porvOpen = new boolean[2];
	final boolean[] porvAuto = {true, true};
	final boolean[] porvManual = new boolean[2];
	final boolean[] porvBlockOpen = {true, true};
	final boolean[] porvStuckOpen = new boolean[2];
	boolean safetyValvesOpen;
	boolean letdownInService = true;
	double chargingFlow = 6.0;
	double siFlow;

	// derived primary quantities (updated every sub-step)
	double tHot;
	double tCold;
	double pzrLevel;
	double liquidVolume;
	double coreCovered = 1.0;
	double dnbr = 2.0;
	double peakClad;
	double coreHeatToCoolant;
	double subcooling;

	// secondary
	double sgTemp;
	double sgMass = SG_MASS_NOM;
	boolean msivOpen = true;
	double steamTurbine;
	double steamDump;
	double steamAdv;
	double steamSafety;
	double feedFlow;
	double mfwFlow;
	double afwFlow;
	double feedTemp = 225;
	boolean feedAuto = true;
	double feedManualDemand = 0.5;
	boolean mfwIsolated;
	boolean steamDumpArmed = true;
	boolean steamDumpTavgMode;
	boolean advAuto = true;
	double advManual;
	double advPosition;
	double cstMass = CST_CAPACITY * 0.85;
	boolean afwFromEsw;

	// turbine / generator
	boolean turbineLatched = true;
	double turbineSpeed = TURBINE_RATED_RPM;
	double governor = 0.98;
	double speedSetpoint = TURBINE_RATED_RPM;
	double loadSetpoint = 1010;
	double loadRamped = 1010;
	double rampRate = 50.0 / 60.0;
	boolean generatorBreaker = true;
	double generatorMW;
	double turbineMechMW;
	double vibration;
	double gsuTemp = 75;
	boolean runbackActive;

	// condenser and circulating water
	double condenserTemp = 33;
	double condenserPressure = 5;
	double cwFlow = 1.0;
	double cwOutletTemp = 23;
	double dischargeTemp = 20;
	int towersInService = 4;
	double screenFouling = 0.1;

	// electrical
	boolean gridAvailable = true;
	boolean offsiteBreakerClosed = true;
	double gridOutageRemaining;
	final Map<Bus, Boolean> busLive = new EnumMap<>(Bus.class);
	final Map<Bus, String> busSource = new EnumMap<>(Bus.class);
	final Map<Bus, Double> busLoad = new EnumMap<>(Bus.class);
	final Map<Bus, Double> busLiveTime = new EnumMap<>(Bus.class);
	final double[] edgStartTimer = new double[2];
	final boolean[] edgBreaker = new boolean[2];
	final double[] edgFuel = {1.0, 1.0};
	final double[] edgOverloadTime = new double[2];
	final double[] batteryCharge = {1.0, 1.0};
	double houseLoad;
	double netOutput;
	boolean ndBusesOnUat = true;

	// safety systems
	boolean siActuated;
	double siActuatedTime;
	boolean siBlocked;
	boolean steamlineSiBlocked;
	boolean containmentSprayActuated;
	boolean phaseAIsolation;
	boolean rhrCooldown;
	boolean recirculationMode;
	double rwstMass = RWST_CAPACITY;
	double accumulatorMass = ACCUMULATOR_CAPACITY;
	double sumpMass;
	boolean ignitersOn;
	boolean filteredVentOpen;
	double ccwTemp = 30;
	boolean ccwAvailable = true;

	// containment and severe accident
	double containmentEnergy;
	double containmentPressure = 101;
	double containmentTemp = 40;
	double containmentIntegrity = 1.0;
	double hydrogenKg;
	double oxidation;
	double coreDamage;
	double coreMelt;
	double lowerHeadDebris;
	double lowerHeadTemp = 290;
	double vesselFailureTimer;
	boolean vesselFailed;
	double basematErosion;
	boolean basematMeltThrough;
	double releasedToContainment;
	double gapReleased;
	double airborneActivity;
	double totalEnvironmentalRelease;
	double pendingEnvironmentalRelease;
	double releaseRate;
	boolean coreDamageAnnounced;

	// spent fuel pool
	double sfpTemp = 32;
	double sfpLevel = 1.0;
	double sfpDamage;
	boolean sfpMakeup;
	boolean sfpBoilingAnnounced;

	// grid
	double gridDemand = 950;

	// last step bookkeeping
	private PlantEnvironment lastEnv = new PlantEnvironment();
	double siTerminationTimer;

	public PlantModel() {
		for (EquipmentId id : EquipmentId.values()) {
			equipment.put(id, new Equipment(id));
		}
		for (Bus bus : Bus.values()) {
			busLive.put(bus, true);
			busSource.put(bus, "");
			busLoad.put(bus, 0.0);
			busLiveTime.put(bus, 1000.0);
		}
		initialiseFullPower();
	}

	// =================================================================== initial state

	/** Puts the unit at 100% equilibrium power, as the operating crew left it. */
	public void initialiseFullPower() {
		for (EquipmentId id : List.of(EquipmentId.RCP_A, EquipmentId.RCP_B, EquipmentId.RCP_C, EquipmentId.RCP_D,
			EquipmentId.MFW_A, EquipmentId.MFW_B, EquipmentId.CW_1, EquipmentId.CW_2, EquipmentId.CW_3, EquipmentId.CW_4,
			EquipmentId.CHG_A, EquipmentId.CCW_A, EquipmentId.CCW_B, EquipmentId.ESW_A, EquipmentId.ESW_B,
			EquipmentId.CFC_A, EquipmentId.CFC_B, EquipmentId.SFP_A, EquipmentId.PZR_HEATERS, EquipmentId.INTAKE_SCREENS,
			EquipmentId.TURBINE, EquipmentId.GENERATOR, EquipmentId.GSU, EquipmentId.UAT, EquipmentId.SST,
			EquipmentId.INSTR_A, EquipmentId.INSTR_B, EquipmentId.INSTR_C, EquipmentId.INSTR_D, EquipmentId.BAT_A, EquipmentId.BAT_B)) {
			Equipment e = equipment.get(id);
			e.demanded = true;
			e.running = true;
			e.speed = 1.0;
		}
		// A plant that has operated for years: deterministic, uneven equipment condition.
		long h = 0x9E3779B97F4A7C15L;
		for (EquipmentId id : EquipmentId.values()) {
			h = mix(h + id.ordinal());
			equipment.get(id).condition = 0.62 + 0.36 * ((h >>> 11) * 0x1.0p-53);
		}
		kinetics.setEquilibrium(1.0);
		for (int i = 0; i < 6; i++) {
			decayHeat[i] = DH_FRACTION[i];
		}
		iodine = (XE_SOURCE * 0.953) / XE_LAMBDA_I;
		xenon = 1.0;
		rcsTavg = FULL_LOAD_TAVG;
		previousTavg = rcsTavg;
		fuelTemp = rcsTavg + P_NOM / UA_FUEL;
		sgTemp = rcsTavg - (P_NOM + 20) / UA_SG;
		tHot = rcsTavg + 16;
		tCold = rcsTavg - 16;
		rcsMass = RCS_MASS_NOM * (1 + 30.0 / 670) / SteamTables.relativeLiquidVolume(rcsTavg);
		updatePrimaryDerived();
		boronPpm = criticalBoron();
		previousPower = 1.0;
		settle();
	}

	/**
	 * Runs the plant forward with the turbine held at its current valve position so that
	 * temperatures, levels and controllers reach their natural steady state, then adopts
	 * the resulting output as the load setpoint and clears the start-up log.
	 */
	private void settle() {
		PlantEnvironment env = new PlantEnvironment();
		env.failureRateFactor = 0;
		env.slowTimeFactor = 1;
		governor = 0.92;
		for (int i = 0; i < 4; i++) {
			for (int s = 0; s < 1200; s++) {
				substep(SUBSTEP, env);
				loadSetpoint = generatorMW;
				loadRamped = generatorMW;
			}
			boronPpm = criticalBoron();
			kinetics.setEquilibrium(kinetics.power());
		}
		loadSetpoint = Math.round(generatorMW);
		loadRamped = generatorMW;
		evaluateAlarms();
		alarms.acknowledgeAll();
		alarms.resetCleared();
		time = 0;
		pendingEvents.clear();
	}

	/** Boron concentration that makes the current state exactly critical. */
	double criticalBoron() {
		double ppm = 1000;
		for (int i = 0; i < 60; i++) {
			double rho = reactivity(ppm);
			ppm += rho / 1.0e-4;
			ppm = Math.max(0, Math.min(3000, ppm));
		}
		return ppm;
	}

	// =================================================================== main step

	public void step(double dt, PlantEnvironment env) {
		lastEnv = env;
		gridDemand = env.gridDemandMW;
		int n = Math.max(1, (int) Math.ceil(dt / SUBSTEP - 1e-9));
		double h = dt / n;
		for (int i = 0; i < n; i++) {
			substep(h, env);
		}
		evaluateAlarms();
	}

	private void substep(double h, PlantEnvironment env) {
		time += h;
		double slow = Math.max(1.0, env.slowTimeFactor);
		electrical(h, env, slow);
		equipmentDynamics(h, env, slow);
		protection(h, env);
		control(h);
		reactorPhysics(h, slow);
		thermalHydraulics(h, env, slow);
		turbineGenerator(h);
		containmentAndSevereAccident(h, slow);
		spentFuelPool(h, slow);
	}

	// =================================================================== electrical

	private void electrical(double h, PlantEnvironment env, double slow) {
		// Offsite grid: lost through lightning/grid disturbances; returns after the grid
		// operator clears the fault. Breaker reclosure is an operator action.
		if (gridAvailable) {
			double hazard = env.failureRateFactor / (20 * 3600.0) * (env.thunderstorm ? 15 : 1);
			if (random() < hazard * h * slow / 20.0) {
				loseGrid(600 + random() * 1200);
			}
		} else {
			gridOutageRemaining -= h * slow / 4.0;
			if (gridOutageRemaining <= 0) {
				gridAvailable = true;
				alarms.log(time, 3, "Grid dispatcher: offsite power AVAILABLE for reconnection");
				pendingEvents.add(new PlantEvent(PlantEvent.Type.GRID_RESTORED, null, 0));
			}
		}

		boolean generatorExcited = turbineSpeed > 1650 && !eq(EquipmentId.GENERATOR).failed;
		boolean uatOk = generatorExcited && !eq(EquipmentId.UAT).failed;
		boolean sstOk = gridAvailable && offsiteBreakerClosed && !eq(EquipmentId.SST).failed;
		boolean nsLive;
		String nsSource;
		if (uatOk) {
			nsLive = true;
			nsSource = "UAT";
		} else if (sstOk) {
			nsLive = true;
			nsSource = "SST";
		} else {
			nsLive = false;
			nsSource = "";
		}
		ndBusesOnUat = uatOk;
		setBus(Bus.NS1, nsLive, nsSource, h);
		setBus(Bus.NS2, nsLive, nsSource, h);

		for (int k = 0; k < 2; k++) {
			Bus safety = k == 0 ? Bus.SA : Bus.SB;
			Equipment edg = eq(k == 0 ? EquipmentId.EDG_A : EquipmentId.EDG_B);
			boolean edgReady = edg.running && edgStartTimer[k] <= 0 && !edg.failed;
			if (nsLive) {
				edgBreaker[k] = false;
				setBus(safety, true, "OFFSITE", h);
			} else {
				if (edgReady) {
					edgBreaker[k] = true;
				}
				setBus(safety, edgBreaker[k] && edgReady, edgBreaker[k] && edgReady ? "EDG" : "", h);
			}
		}

		// battery chargers run from the safety buses; batteries carry the DC buses otherwise
		for (int k = 0; k < 2; k++) {
			Bus dc = k == 0 ? Bus.DCA : Bus.DCB;
			Bus charger = k == 0 ? Bus.SA : Bus.SB;
			Equipment bat = eq(k == 0 ? EquipmentId.BAT_A : EquipmentId.BAT_B);
			if (live(charger)) {
				batteryCharge[k] = Math.min(1.0, batteryCharge[k] + h * slow / (3 * 3600.0));
				setBus(dc, true, "CHARGER", h);
			} else {
				// 4 hour design coping time at design DC load, accelerated
				// 4 hour design coping time at design DC load; accelerated by half the slow factor
				double drain = (0.8 + 0.2 * (rcsFlow > 0.5 ? 1 : 0.5)) * h * (slow / 2.0) / (4 * 3600.0);
				if (!bat.failed) {
					batteryCharge[k] = Math.max(0, batteryCharge[k] - drain);
				}
				boolean ok = !bat.failed && batteryCharge[k] > 0.02;
				setBus(dc, ok, ok ? "BATTERY" : "", h);
			}
		}

		// bus loading
		for (Bus bus : Bus.values()) {
			busLoad.put(bus, 0.0);
		}
		for (Equipment e : equipment.values()) {
			if (e.running && e.id.loadMW > 0) {
				double load = e.id.loadMW * (e.id.kind == EquipmentId.Kind.HEATER && e.id == EquipmentId.PZR_HEATERS ? pzrHeaterMW / 1.8 : 1.0);
				busLoad.merge(e.id.bus, load, Double::sum);
			}
		}
		double base = 3.0; // lighting, HVAC, instrument air, misc
		busLoad.merge(Bus.NS1, base / 2, Double::sum);
		busLoad.merge(Bus.NS2, base / 2, Double::sum);
		busLoad.merge(Bus.SA, 0.8, Double::sum);
		busLoad.merge(Bus.SB, 0.8, Double::sum);
		houseLoad = busLoad.get(Bus.NS1) + busLoad.get(Bus.NS2) + busLoad.get(Bus.SA) + busLoad.get(Bus.SB);

		// emergency diesel generators
		for (int k = 0; k < 2; k++) {
			Equipment edg = eq(k == 0 ? EquipmentId.EDG_A : EquipmentId.EDG_B);
			Bus safety = k == 0 ? Bus.SA : Bus.SB;
			if (edg.running && edgStartTimer[k] > 0) {
				edgStartTimer[k] -= h;
			}
			if (edg.running) {
				double load = edgBreaker[k] ? busLoad.get(safety) : 0.3;
				edgFuel[k] = Math.max(0, edgFuel[k] - h * slow * (0.25 + 0.75 * load / EDG_CAPACITY) / (7 * 24 * 3600.0));
				if (edgFuel[k] <= 0) {
					edg.running = false;
					edg.demanded = false;
					alarms.log(time, 1, edg.id.label + " stopped: fuel oil exhausted");
				}
				if (edgBreaker[k] && load > EDG_CAPACITY * 1.1) {
					edgOverloadTime[k] += h;
					if (edgOverloadTime[k] > 30) {
						failEquipment(edg, "overload trip");
					}
				} else {
					edgOverloadTime[k] = Math.max(0, edgOverloadTime[k] - h);
				}
			}
		}
	}

	void loseGrid(double outageSeconds) {
		if (!gridAvailable) {
			return;
		}
		gridAvailable = false;
		gridOutageRemaining = outageSeconds;
		alarms.log(time, 1, "Grid disturbance: offsite power LOST");
		pendingEvents.add(new PlantEvent(PlantEvent.Type.GRID_LOSS, null, 0));
		if (generatorBreaker) {
			generatorBreaker = false;
			alarms.log(time, 2, "Generator breaker opened on grid loss - load rejection");
			steamDumpTavgMode = true;
			// The unit can ride a load rejection of up to 50% (40% steam dumps + 10% step
			// in rod control). Larger rejections actuate overspeed protection.
			if (generatorMW > 0.5 * GSU_RATING) {
				tripTurbine("load rejection exceeds 50% capability");
			}
		}
	}

	private void setBus(Bus bus, boolean live, String source, double h) {
		boolean was = busLive.get(bus);
		busLive.put(bus, live);
		busSource.put(bus, source);
		if (live) {
			busLiveTime.put(bus, was ? busLiveTime.get(bus) + h : 0.0);
		} else {
			busLiveTime.put(bus, 0.0);
		}
	}

	boolean live(Bus bus) {
		return bus == Bus.NONE || busLive.get(bus);
	}

	boolean dcAvailable() {
		return live(Bus.DCA) || live(Bus.DCB);
	}

	// =================================================================== equipment

	private void equipmentDynamics(double h, PlantEnvironment env, double slow) {
		for (Equipment e : equipment.values()) {
			EquipmentId id = e.id;
			if (id.kind == EquipmentId.Kind.DIESEL) {
				// running state handled by electrical/start logic
				wearAndFail(e, h, env, slow, e.running ? 1.5 : 0.0);
				continue;
			}
			if (id.kind == EquipmentId.Kind.BATTERY || id.kind == EquipmentId.Kind.ELECTRICAL
				|| id.kind == EquipmentId.Kind.TURBINE || id.kind == EquipmentId.Kind.INSTRUMENT
				|| id.kind == EquipmentId.Kind.VALVE) {
				wearAndFail(e, h, env, slow, id.kind == EquipmentId.Kind.VALVE ? 0.0 : 0.3);
				if (id.kind == EquipmentId.Kind.TURBINE) {
					e.running = turbineSpeed > 10;
					e.speed = turbineSpeed / TURBINE_RATED_RPM;
				}
				continue;
			}
			boolean powered = live(id.bus);
			if (id.bus.safety && powered) {
				// load sequencer: equipment re-energises in steps after a bus is restored
				powered = busLiveTime.get(id.bus) >= sequencerDelay(id);
			}
			if (id == EquipmentId.TDAFW) {
				powered = sgPressure() > 0.8 && msivUpstreamSteamAvailable() && dcAvailable();
			}
			boolean wasRunning = e.running;
			if (e.demanded && powered && !e.failed) {
				if (!wasRunning) {
					e.starts++;
					double pFail = env.failureRateFactor * (0.005 + 0.2 * Math.pow(1 - e.condition, 2));
					if (random() < pFail) {
						failEquipment(e, "failed to start");
						continue;
					}
				}
				e.running = true;
			} else {
				e.running = false;
				if (!powered && !id.bus.safety && id.bus != Bus.NONE && e.demanded && wasRunning) {
					// non-safety motor breakers open on undervoltage and stay open
					e.demanded = false;
					alarms.log(time, 2, id.label + " tripped on bus undervoltage");
				}
			}
			double tau = e.running ? 3.0 : (id.name().startsWith("RCP") ? 25.0 : 4.0);
			double target = e.running ? 1.0 : 0.0;
			e.speed += (target - e.speed) * Math.min(1.0, h / tau);
			if (e.speed < 1e-3) {
				e.speed = 0;
			}
			double stress = 1.0;
			if (id.name().startsWith("RCP") && sealCoolingLostTime > 0) {
				stress = 4.0;
			}
			if ((id == EquipmentId.MDAFW_A || id == EquipmentId.MDAFW_B || id == EquipmentId.TDAFW)
				&& cstMass <= 0 && !afwFromEsw) {
				stress = 40.0; // running dry
			}
			wearAndFail(e, h, env, slow, e.running ? stress : 0.0);
		}
		// screens foul gradually with marine growth and debris; the screen wash slows it
		Equipment screens = eq(EquipmentId.INTAKE_SCREENS);
		double foulRate = (screens.running ? 0.2 : 1.0) / (40 * 3600.0);
		screenFouling = Math.min(1.0, screenFouling + h * slow * foulRate * env.failureRateFactor * (0.3 + cwFlow));
	}

	private static double sequencerDelay(EquipmentId id) {
		return switch (id) {
			case SI_A, SI_B, CHG_A, CHG_B -> 2.0;
			case RHR_A, RHR_B -> 5.0;
			case CCW_A, CCW_B, ESW_A, ESW_B -> 10.0;
			case MDAFW_A, MDAFW_B -> 15.0;
			case CS_A, CS_B, CFC_A, CFC_B -> 20.0;
			default -> 25.0;
		};
	}

	private void wearAndFail(Equipment e, double h, PlantEnvironment env, double slow, double stress) {
		if (stress <= 0 || e.failed) {
			return;
		}
		e.runSeconds += h;
		e.condition = Math.max(0, e.condition - h * slow * stress / (1000 * 3600.0));
		double wear = 1.02 - e.condition;
		double hazard = env.failureRateFactor * 2.0 * wear * wear * stress / (2 * 3600.0) * (slow / 20.0);
		if (e.id.kind == EquipmentId.Kind.INSTRUMENT) {
			if (random() < hazard * h) {
				injectInstrumentFault(e);
			}
			return;
		}
		if (random() < hazard * h) {
			if (e.id == EquipmentId.PORV_1 || e.id == EquipmentId.PORV_2) {
				return; // valves fail on demand, see pressurizer logic
			}
			failEquipment(e, failureMode(e));
		}
	}

	private String failureMode(Equipment e) {
		return switch (e.id.kind) {
			case PUMP -> random() < 0.5 ? "motor overcurrent trip" : "bearing seizure";
			case FAN -> "fan motor failure";
			case HEATER -> "heater group breaker fault";
			case DIESEL -> "governor failure";
			case BATTERY -> "cell failure";
			case TURBINE -> "bearing vibration damage";
			case ELECTRICAL -> "internal fault";
			case STRUCTURE -> "screen drive failure";
			default -> "failure";
		};
	}

	void failEquipment(Equipment e, String cause) {
		if (e.failed) {
			return;
		}
		e.fail(cause);
		e.running = false;
		alarms.log(time, 2, "FAILURE: " + e.id.label + " - " + cause);
		pendingEvents.add(new PlantEvent(PlantEvent.Type.EQUIPMENT_FAILURE, e.id, e.condition));
		if (e.id == EquipmentId.GSU) {
			if (random() < 0.5) {
				pendingEvents.add(new PlantEvent(PlantEvent.Type.TRANSFORMER_FIRE, e.id, 1));
				alarms.log(time, 1, "Main transformer fire - deluge actuated");
			}
			if (generatorBreaker) {
				generatorBreaker = false;
				tripTurbine("generator protection: GSU fault");
			}
		}
		if (e.id == EquipmentId.GENERATOR || e.id == EquipmentId.TURBINE) {
			generatorBreaker = false;
			tripTurbine(e.id.label + " fault");
		}
	}

	private void injectInstrumentFault(Equipment rack) {
		int ch = rack.id.ordinal() - EquipmentId.INSTR_A.ordinal();
		SensorId[] ids = SensorId.values();
		SensorId sensor = ids[(int) (random() * ids.length)];
		Sensors.Fault[] modes = {Sensors.Fault.STUCK, Sensors.Fault.DRIFT_HIGH, Sensors.Fault.DRIFT_LOW, Sensors.Fault.FAIL_HIGH, Sensors.Fault.FAIL_LOW};
		Sensors.Fault mode = modes[(int) (random() * modes.length)];
		if (sensors.fault(sensor, ch) != Sensors.Fault.NONE) {
			return;
		}
		sensors.inject(sensor, ch, mode, sensors.channel(sensor, ch));
		alarms.log(time, 3, "Instrument fault: " + sensor.label + " channel " + romanChannel(ch) + " (" + mode + ")");
	}

	static String romanChannel(int ch) {
		return switch (ch) {
			case 0 -> "I";
			case 1 -> "II";
			case 2 -> "III";
			default -> "IV";
		};
	}

	// =================================================================== protection

	private boolean[] channelPower() {
		boolean[] p = new boolean[4];
		for (int ch = 0; ch < 4; ch++) {
			Equipment rack = eq(EquipmentId.values()[EquipmentId.INSTR_A.ordinal() + ch]);
			p[ch] = live(rack.id.bus) && !rack.failed;
		}
		return p;
	}

	private void protection(double h, PlantEnvironment env) {
		boolean[] chPower = channelPower();
		double power = kinetics.power();
		sensors.measure(SensorId.POWER_RANGE, power * 100, chPower, h);
		sensors.measure(SensorId.PZR_PRESSURE, rcsPressure, chPower, h);
		sensors.measure(SensorId.RCS_FLOW, rcsFlow * 100, chPower, h);
		sensors.measure(SensorId.SG_LEVEL, sgNarrowRange(), chPower, h);
		sensors.measure(SensorId.T_HOT, tHot, chPower, h);
		sensors.measure(SensorId.CONT_PRESSURE, containmentPressure, chPower, h);

		boolean p7 = power > 0.10;
		boolean p8 = power > 0.30;
		boolean p9 = power > 0.50;

		fastPowerRate = (power - previousPower) / h;
		previousPower = power;

		if (!reactorTripped) {
			String cause = null;
			if (sensors.votes(SensorId.POWER_RANGE, 109, true) >= 2) {
				cause = "power range high flux";
			} else if (fastPowerRate > 0.05 && power > 0.05) {
				cause = "power range positive rate";
			} else if (sensors.votes(SensorId.PZR_PRESSURE, 16.6, true) >= 2) {
				cause = "pressurizer pressure high";
			} else if (p7 && sensors.votes(SensorId.PZR_PRESSURE, 12.9, false) >= 2) {
				cause = "pressurizer pressure low";
			} else if (sensors.votes(SensorId.T_HOT, 338, true) >= 2) {
				cause = "overtemperature (hot leg)";
			} else if (p8 && sensors.votes(SensorId.RCS_FLOW, 90, false) >= 2) {
				cause = "RCS low flow";
			} else if (p7 && !p8 && sensors.votes(SensorId.RCS_FLOW, 55, false) >= 2) {
				cause = "RCS low flow (two loops)";
			} else if (sensors.votes(SensorId.SG_LEVEL, 15, false) >= 2 && power > 0.02) {
				cause = "steam generator level low-low";
			} else if (p7 && !live(Bus.NS1) && !live(Bus.NS2)) {
				cause = "RCP bus undervoltage";
			} else if (p9 && !turbineLatched) {
				cause = "turbine trip above P-9";
			} else if (siActuated) {
				cause = "safety injection";
			} else if (!live(Bus.NS1) && !live(Bus.NS2)) {
				cause = "loss of rod drive MG set power";
			}
			if (cause != null) {
				tripReactor(cause);
			}
		}

		// ESFAS: safety injection
		if (!siActuated) {
			String si = null;
			if (!siBlocked && sensors.votes(SensorId.PZR_PRESSURE, 12.7, false) >= 2) {
				si = "pressurizer pressure low-low";
			} else if (sensors.votes(SensorId.CONT_PRESSURE, 125, true) >= 2) {
				si = "containment pressure high";
			} else if (!steamlineSiBlocked && sgPressure() < 4.1) {
				si = "steam line pressure low";
			}
			if (si != null) {
				actuateSafetyInjection(si);
			}
		}
		if (rcsPressure > 13.8) {
			siBlocked = false; // P-11 automatically removes the block
		}
		if (sgPressure() > 5.0) {
			steamlineSiBlocked = false;
		}

		if (!containmentSprayActuated && sensors.votes(SensorId.CONT_PRESSURE, 250, true) >= 2) {
			containmentSprayActuated = true;
			eq(EquipmentId.CS_A).demanded = true;
			eq(EquipmentId.CS_B).demanded = true;
			alarms.log(time, 1, "Containment spray actuated (Hi-3)");
		}
		if (msivOpen && (containmentPressure > 200 || (sgPressure() < 4.1 && !steamlineSiBlocked))) {
			msivOpen = false;
			alarms.log(time, 1, "Main steam isolation");
		}
		// Feedwater isolation on SG level high-high (P-14)
		if (sgNarrowRange() > 80 && (eq(EquipmentId.MFW_A).demanded || eq(EquipmentId.MFW_B).demanded)) {
			mfwIsolated = true;
			eq(EquipmentId.MFW_A).demanded = false;
			eq(EquipmentId.MFW_B).demanded = false;
			tripTurbine("SG level high-high (P-14)");
			alarms.log(time, 2, "Feedwater isolation: SG level high-high");
		}
		// Auxiliary feedwater auto-start
		boolean mfwLost = !eq(EquipmentId.MFW_A).running && !eq(EquipmentId.MFW_B).running;
		boolean afwSignal = sensors.votes(SensorId.SG_LEVEL, 15, false) >= 2 || mfwLost && (power > 0.02 || reactorTripped)
			|| !live(Bus.NS1) && !live(Bus.NS2) || siActuated;
		if (afwSignal) {
			startIfIdle(EquipmentId.MDAFW_A);
			startIfIdle(EquipmentId.MDAFW_B);
			if (sgNarrowRange() < 15 || !live(Bus.NS1) && !live(Bus.NS2)) {
				startIfIdle(EquipmentId.TDAFW);
			}
		}
		// Diesel generators start on safety bus undervoltage or SI
		for (int k = 0; k < 2; k++) {
			Bus safety = k == 0 ? Bus.SA : Bus.SB;
			Equipment edg = eq(k == 0 ? EquipmentId.EDG_A : EquipmentId.EDG_B);
			if ((!live(safety) || siActuated) && !edg.running && !edg.failed && edgFuel[k] > 0) {
				startDiesel(k, env);
			}
		}
		// RCP seal cooling: seal injection from charging or thermal barrier cooling by CCW
		boolean sealInjection = eq(EquipmentId.CHG_A).running || eq(EquipmentId.CHG_B).running;
		ccwAvailable = (eq(EquipmentId.CCW_A).running || eq(EquipmentId.CCW_B).running)
			&& (eq(EquipmentId.ESW_A).running || eq(EquipmentId.ESW_B).running);
		if (!sealInjection && !ccwAvailable && rcsTavg > 120) {
			sealCoolingLostTime += h;
		} else {
			sealCoolingLostTime = Math.max(0, sealCoolingLostTime - h * 0.2);
		}
		double sealDegradation = sealCoolingLostTime > 780 ? Math.min(1, (sealCoolingLostTime - 780) / 1800) : 0;
		// ~1.3 kg/s per pump through degraded seals, up to ~8 kg/s per pump once the seal faces fail
		sealLeak = 4 * (0.08 + 8 * sealDegradation * sealDegradation) * Math.min(1, rcsPressure / 15.5);
		if (rhrCooldown && rcsPressure > 3.5) {
			rhrCooldown = false;
			alarms.log(time, 2, "RHR suction isolation on high RCS pressure");
		}
	}

	private void startIfIdle(EquipmentId id) {
		Equipment e = eq(id);
		if (!e.demanded && !e.failed) {
			e.demanded = true;
			alarms.log(time, 3, id.label + " auto-start");
		}
	}

	void startDiesel(int k, PlantEnvironment env) {
		Equipment edg = eq(k == 0 ? EquipmentId.EDG_A : EquipmentId.EDG_B);
		if (edg.failed || edg.running || edgFuel[k] <= 0) {
			return;
		}
		edg.starts++;
		double pFail = env.failureRateFactor * (0.01 + 0.3 * Math.pow(1 - edg.condition, 2));
		if (random() < pFail) {
			failEquipment(edg, "failed to start");
			return;
		}
		edg.demanded = true;
		edg.running = true;
		edgStartTimer[k] = 10.0;
		pendingEvents.add(new PlantEvent(PlantEvent.Type.EDG_START, edg.id, 0));
		alarms.log(time, 3, edg.id.label + " starting");
	}

	void tripReactor(String cause) {
		if (reactorTripped) {
			return;
		}
		reactorTripped = true;
		tripCause = cause;
		rodMotion = 0;
		shutdownMotion = 0;
		alarms.log(time, 1, "REACTOR TRIP: " + cause);
		pendingEvents.add(new PlantEvent(PlantEvent.Type.REACTOR_TRIP, null, kinetics.power()));
		tripTurbine("reactor trip");
	}

	void tripTurbine(String cause) {
		if (!turbineLatched) {
			return;
		}
		turbineLatched = false;
		governor = 0;
		if (generatorBreaker) {
			generatorBreaker = false;
		}
		steamDumpTavgMode = true;
		alarms.log(time, 2, "TURBINE TRIP: " + cause);
		pendingEvents.add(new PlantEvent(PlantEvent.Type.TURBINE_TRIP, null, turbineMechMW));
	}

	void actuateSafetyInjection(String cause) {
		siActuated = true;
		siActuatedTime = time;
		alarms.log(time, 1, "SAFETY INJECTION: " + cause);
		pendingEvents.add(new PlantEvent(PlantEvent.Type.SAFETY_INJECTION, null, 0));
		for (EquipmentId id : List.of(EquipmentId.CHG_A, EquipmentId.CHG_B, EquipmentId.SI_A, EquipmentId.SI_B,
			EquipmentId.RHR_A, EquipmentId.RHR_B, EquipmentId.CCW_A, EquipmentId.CCW_B, EquipmentId.ESW_A,
			EquipmentId.ESW_B, EquipmentId.CFC_A, EquipmentId.CFC_B)) {
			eq(id).demanded = true;
		}
		phaseAIsolation = true;
		letdownInService = false;
		mfwIsolated = true;
		eq(EquipmentId.MFW_A).demanded = false;
		eq(EquipmentId.MFW_B).demanded = false;
		tripReactor("safety injection");
		tripTurbine("safety injection");
	}

	// =================================================================== automatic control

	private void control(double h) {
		double power = kinetics.power();
		// ---------- rods
		if (reactorTripped) {
			double drop = ROD_STEPS / 2.2 * h;
			shutdownBanks = Math.max(0, shutdownBanks - drop);
			controlBanks = Math.max(0, controlBanks - drop * 2.3);
		} else {
			double speed = 0;
			if (rodAuto && power > 0.15 && turbineLatched) {
				double err = rcsTavg - tref();
				if (Math.abs(err) > 0.8) {
					speed = -Math.signum(err) * Math.min(72, Math.max(8, Math.abs(err) * 10)) / 60.0;
				}
			} else if (rodMotion != 0) {
				speed = rodMotion * 48 / 60.0;
			}
			if (speed > 0 && rodWithdrawalBlocked() != null) {
				speed = 0; // rod stop: motion resumes when the block clears
			}
			controlBanks = Math.max(0, Math.min(CONTROL_TRAVEL, controlBanks + speed * h));
			if (shutdownMotion != 0) {
				boolean blocked = shutdownMotion > 0 && kinetics.startupRate() > 1.0;
				if (!blocked) {
					shutdownBanks = Math.max(0, Math.min(ROD_STEPS, shutdownBanks + shutdownMotion * 64 / 60.0 * h));
				}
				if (shutdownBanks <= 0 || shutdownBanks >= ROD_STEPS) {
					shutdownMotion = 0;
				}
			}
		}
		// ---------- boron (CVCS boration / dilution through the charging pumps)
		boolean charging = eq(EquipmentId.CHG_A).running || eq(EquipmentId.CHG_B).running;
		if (!Double.isNaN(boronTarget) && charging) {
			double rate = (boronTarget > boronPpm ? 40.0 : 25.0) / 60.0;
			double delta = Math.max(-rate * h, Math.min(rate * h, boronTarget - boronPpm));
			boronPpm += delta;
			if (Math.abs(boronTarget - boronPpm) < 0.05) {
				boronPpm = boronTarget;
				boronTarget = Double.NaN;
				alarms.log(time, 3, String.format("CVCS: boron concentration at target %.0f ppm", boronPpm));
			}
		}
		// ---------- pressurizer pressure control
		double heater = 0;
		boolean heatersAvailable = eq(EquipmentId.PZR_HEATERS).running && pzrLevel > 12;
		if (heatersAvailable) {
			if (pzrHeatersAuto) {
				double e = 15.51 - rcsPressure;
				heater = 0.4 * clamp((e + 0.1) / 0.2, 0, 1) + (e > 0.15 ? 1.4 : 0);
			} else if (pzrHeatersManualOn) {
				heater = 1.8;
			}
		}
		pzrHeaterMW = heater;
		boolean sprayHead = eq(EquipmentId.RCP_A).speed > 0.5 || eq(EquipmentId.RCP_B).speed > 0.5;
		if (sprayAuto) {
			sprayFraction = sprayHead ? clamp((rcsPressure - 15.65) / 0.35, 0, 1) : 0;
		} else {
			sprayFraction = sprayManualOpen && sprayHead ? 1 : 0;
		}
		// ---------- turbine runback on loss of one main feed pump
		boolean oneMfw = eq(EquipmentId.MFW_A).running ^ eq(EquipmentId.MFW_B).running;
		if (oneMfw && generatorBreaker && loadSetpoint > 620) {
			loadSetpoint = 600;
			if (!runbackActive) {
				runbackActive = true;
				alarms.log(time, 2, "Turbine runback to 600 MW: one main feedwater pump lost");
			}
		} else if (!oneMfw) {
			runbackActive = false;
		}
		// ---------- operator-equivalent automatic actions (optional)
		if (lastEnv.automaticOperatorActions && siActuated && rwstMass < 0.1 * RWST_CAPACITY && !recirculationMode) {
			recirculationMode = true;
			alarms.log(time, 2, "Automatic switchover to cold-leg recirculation");
		}
	}

	/** Tavg program reference, C, from turbine first-stage steam flow. */
	double tref() {
		double load = clamp(steamTurbine / STEAM_FULL, 0, 1);
		return NO_LOAD_TAVG + (FULL_LOAD_TAVG - NO_LOAD_TAVG) * load;
	}

	/** Returns the reason rod withdrawal is blocked, or null if permitted. */
	String rodWithdrawalBlocked() {
		if (reactorTripped) {
			return "reactor trip breakers open";
		}
		if (shutdownBanks < ROD_STEPS - 0.5) {
			return "shutdown banks not fully withdrawn";
		}
		if (kinetics.power() > 1.03) {
			return "C-2 overpower rod stop (103%)";
		}
		if (kinetics.startupRate() > 1.0) {
			return "startup rate above 1 DPM";
		}
		if (rcsFlow < 0.9 && kinetics.power() > 0.05) {
			return "insufficient RCS flow";
		}
		return null;
	}

	// =================================================================== reactor physics

	/** Integral rod worth S-curve: fraction of a bank's worth inserted for insertion fraction x. */
	static double integralWorth(double x) {
		x = clamp(x, 0, 1);
		return x - Math.sin(2 * Math.PI * x) / (2 * Math.PI);
	}

	/** Bank positions A..D (steps withdrawn) from the overlapped control group position. */
	public static double bankPosition(double group, int bank) {
		return clamp(group - bank * 100, 0, ROD_STEPS);
	}

	static final double[] BANK_WORTH = {0.010, 0.012, 0.016, 0.022};
	static final double SHUTDOWN_WORTH = 0.075;

	double rodReactivity() {
		double rho = -SHUTDOWN_WORTH * integralWorth(1 - shutdownBanks / ROD_STEPS);
		for (int b = 0; b < 4; b++) {
			rho -= BANK_WORTH[b] * integralWorth(1 - bankPosition(controlBanks, b) / ROD_STEPS);
		}
		return rho;
	}

	double fuelExcessReactivity() {
		return 0.25 - 0.13 * burnup;
	}

	double dopplerReactivity() {
		return -3.0e-5 * (Math.min(fuelTemp, 2800) - NO_LOAD_TAVG);
	}

	double moderatorCoefficient(double ppm) {
		return (-45 + 0.02 * ppm) * 1e-5;
	}

	double moderatorReactivity(double ppm) {
		return moderatorCoefficient(ppm) * (rcsTavg - NO_LOAD_TAVG) - 0.15 * voidFraction;
	}

	double boronReactivity(double ppm) {
		return -1.0e-4 * ppm;
	}

	double xenonReactivity() {
		return -XE_WORTH * xenon;
	}

	/** Core geometry loss after melting removes the possibility of a sustained chain reaction. */
	double geometryReactivity() {
		return -0.5 * coreMelt - 0.2 * coreDamage;
	}

	double reactivity(double ppm) {
		return fuelExcessReactivity() + dopplerReactivity() + moderatorReactivity(ppm) + boronReactivity(ppm)
			+ xenonReactivity() + rodReactivity() + geometryReactivity();
	}

	public double reactivity() {
		return reactivity(boronPpm);
	}

	double totalDecayFraction() {
		double s = 0;
		for (double d : decayHeat) {
			s += d;
		}
		return s;
	}

	private void reactorPhysics(double h, double slow) {
		double rho = reactivity();
		double source = 2e-7;
		kinetics.step(rho, h, source);
		double n = kinetics.power();
		for (int i = 0; i < 6; i++) {
			double lambda = Math.log(2) / DH_HALFLIFE[i] * (DH_SLOW[i] ? slow : 1.0);
			decayHeat[i] += (DH_FRACTION[i] * Math.min(n, 1.5) - decayHeat[i]) * (1 - Math.exp(-lambda * h));
		}
		double hs = h * slow;
		double newI = iodine + hs * (XE_SOURCE * 0.953 * n - XE_LAMBDA_I * iodine);
		double newX = xenon + hs * (XE_SOURCE * 0.047 * n + XE_LAMBDA_I * iodine - XE_LAMBDA_X * xenon - XE_BURNOUT * n * xenon);
		iodine = Math.max(0, newI);
		xenon = Math.max(0, newX);
		burnup = Math.min(1.2, burnup + hs * n / (500 * 86400.0));
	}

	// =================================================================== thermal hydraulics

	double sgPressure() {
		return SteamTables.psat(sgTemp);
	}

	boolean msivUpstreamSteamAvailable() {
		return sgMass > 0.02 * SG_MASS_NOM;
	}

	double sgNarrowRange() {
		return clamp(50 + (sgMass / SG_MASS_NOM - 1) * 125, 0, 100);
	}

	public double sgWideRange() {
		return clamp(sgMass / SG_MASS_NOM / 1.4 * 100, 0, 100);
	}

	void updatePrimaryDerived() {
		double rel = SteamTables.relativeLiquidVolume(rcsTavg);
		liquidVolume = rcsMass / RCS_MASS_NOM * rel;
		pzrLevel = clamp(25 + 670 * (liquidVolume - 1), 0, 100);
		if (liquidVolume < 0.963) {
			voidFraction = clamp(1 - liquidVolume / 0.963, 0, 0.95);
		} else {
			voidFraction = 0;
		}
		double effective = liquidVolume;
		coreCovered = clamp((effective - 0.30) / (0.60 - 0.30), 0, 1);
	}

	private void thermalHydraulics(double h, PlantEnvironment env, double slow) {
		double n = kinetics.power();
		updatePrimaryDerived();

		// ---------- RCS flow: pumps (with coastdown) or natural circulation
		double pumpFlow = 0;
		double pumpHeat = 0;
		for (EquipmentId id : List.of(EquipmentId.RCP_A, EquipmentId.RCP_B, EquipmentId.RCP_C, EquipmentId.RCP_D)) {
			Equipment rcp = eq(id);
			double cavitation = rcsPressure < 2.0 || voidFraction > 0.2 ? 0.4 : 1.0;
			pumpFlow += 0.25 * rcp.speed * cavitation;
			pumpHeat += 5.0 * Math.pow(rcp.speed, 3);
			if (rcp.running && (rcsPressure < 2.0 || voidFraction > 0.3)) {
				rcp.condition = Math.max(0, rcp.condition - h * 0.002);
			}
		}
		double sgWet = clamp(sgMass / (0.30 * SG_MASS_NOM), 0, 1);
		double coreHeat = (n * (1 - DH_TOTAL) + totalDecayFraction()) * P_NOM;
		double natCirc = 0;
		// buoyancy-driven flow needs a covered core and a steam generator heat sink above it
		if (coreCovered > 0.99 && voidFraction < 0.3 && sgWet > 0.05) {
			natCirc = Math.min(0.08, 0.035 * Math.sqrt(Math.max(0, coreHeat / (0.02 * P_NOM))));
		}
		rcsFlow = Math.max(pumpFlow, natCirc);
		double w = Math.max(rcsFlow, 0.005);

		// ---------- heat transfer fuel -> coolant, DNB and cladding temperature
		double heatFlux = coreHeat / P_NOM * 2.0 / Math.max(0.2, coreCovered);
		subcooling = SteamTables.tsat(rcsPressure) - tHot;
		dnbr = 1.75 * (0.2 + 0.8 * Math.pow(Math.min(1, w), 0.8)) * clamp(0.6 + subcooling / 60, 0.4, 1.2) / Math.max(heatFlux / 2.0, 1e-3);
		boolean filmBoiling = dnbr < 1.0;
		double boilingFactor = filmBoiling ? 0.15 : 1.0;
		// an uncovered core is cooled only by superheated steam and radiation
		double ua = UA_FUEL * (0.002 + 0.998 * coreCovered * boilingFactor * (1 - 0.5 * voidFraction));
		coreHeatToCoolant = ua * (fuelTemp - rcsTavg);
		double cladFactor = coreCovered * (filmBoiling ? 0.6 : 0.06) + (1 - coreCovered) * 0.95;
		peakClad = tHot + (fuelTemp - tHot) * cladFactor;

		// ---------- zirconium-steam oxidation (exothermic, produces hydrogen)
		double qOx = 0;
		if (peakClad > 1000 && oxidation < 1) {
			double steam = rcsMass > 0.05 * RCS_MASS_NOM ? 1.0 : 0.2;
			double rate = 1000 * Math.exp(-22000 / (peakClad + 273)) * (1 - oxidation) * steam;
			double d = Math.min(1 - oxidation, rate * h);
			oxidation += d;
			qOx = d * ZR_OXIDATION_ENERGY / h;
			hydrogenKg += d * H2_FULL_OXIDATION;
		}

		// ---------- steam generator heat transfer
		// Heat reaches the steam generators by forced flow, by single-phase natural
		// circulation, or - once the RCS has voided - by reflux boiling/condensation.
		double flowFactor = Math.pow(Math.min(1, pumpFlow), 0.8);
		if (natCirc > 0) {
			flowFactor = Math.max(flowFactor, 0.25);
		}
		if (voidFraction > 0.1 && coreCovered > 0.3) {
			flowFactor = Math.max(flowFactor, 0.10 * coreCovered);
		}
		double qSg = UA_SG * flowFactor * sgWet * (rcsTavg - sgTemp);

		// ---------- RHR cooldown
		double qRhr = 0;
		int rhrPumps = (eq(EquipmentId.RHR_A).running ? 1 : 0) + (eq(EquipmentId.RHR_B).running ? 1 : 0);
		if (rhrCooldown && rhrPumps > 0 && ccwAvailable) {
			qRhr = 12.0 * rhrPumps * Math.max(0, rcsTavg - ccwTemp) * Math.min(1, coreCovered + 0.2);
		}
		ccwTemp += (25 + lastEnv.seaTemperature * 0.5 + (ccwAvailable ? qRhr / 40.0 : 30) - ccwTemp) * Math.min(1, h / 120);

		// ---------- inventory: charging, letdown, injection, leaks, relief
		boolean chgA = eq(EquipmentId.CHG_A).running;
		boolean chgB = eq(EquipmentId.CHG_B).running;
		int chg = (chgA ? 1 : 0) + (chgB ? 1 : 0);
		double letdown = letdownInService && pzrLevel > 17 && !phaseAIsolation ? 6.0 : 0.0;
		double levelSetpoint = 25 + 30 * clamp((rcsTavg - NO_LOAD_TAVG) / (FULL_LOAD_TAVG - NO_LOAD_TAVG), 0, 1);
		double charging;
		double injection = 0;
		double injectionTemp = recirculationMode ? Math.min(containmentTemp, 120) : 20;
		boolean waterForInjection = recirculationMode ? sumpMass > 50_000 : rwstMass > 0;
		if (siActuated) {
			charging = 0;
			if (waterForInjection) {
				double headHhsi = clamp((17.5 - rcsPressure) / 17.5, 0, 1);
				double headSi = clamp((10.0 - rcsPressure) / 10.0, 0, 1);
				double headLpsi = clamp((1.4 - rcsPressure) / 1.4, 0, 1);
				if (recirculationMode && rhrPumps == 0) {
					headHhsi = 0;
					headSi = 0;
				}
				injection += chg * 40 * headHhsi;
				injection += ((eq(EquipmentId.SI_A).running ? 1 : 0) + (eq(EquipmentId.SI_B).running ? 1 : 0)) * 60 * headSi;
				if (!rhrCooldown) {
					injection += rhrPumps * 300 * headLpsi;
				}
			}
		} else {
			charging = chg > 0 ? clamp(6 + 1.5 * (levelSetpoint - pzrLevel), 0, 20 * chg) : 0;
		}
		double accum = 0;
		if (rcsPressure < 4.3 && accumulatorMass > 0) {
			accum = Math.min(accumulatorMass / h, 400 * clamp((4.3 - rcsPressure) / 4.3, 0.05, 1));
			accumulatorMass -= accum * h;
		}
		siFlow = injection + accum;
		chargingFlow = charging;
		if (!recirculationMode) {
			rwstMass = Math.max(0, rwstMass - (injection + sprayFlow()) * h);
		} else {
			sumpMass = Math.max(0, sumpMass - (injection + sprayFlow()) * h);
		}
		double dp = Math.max(0, rcsPressure - containmentPressure / 1000.0);
		double breakFlow = 40_000 * breakArea * Math.sqrt(dp / 15.5);
		double leak = identifiedLeak * Math.min(1, rcsPressure / 15.5) + sealLeak;
		// relief valves pass steam unless the pressurizer is water solid
		double reliefPhase = pzrLevel > 95 ? 2.5 : 1.0;
		double porvFlow = 0;
		for (int i = 0; i < 2; i++) {
			if (porvOpen[i] && porvBlockOpen[i]) {
				porvFlow += 26 * rcsPressure / 15.5 * reliefPhase;
			}
		}
		double safetyFlow = safetyValvesOpen ? 3 * 45 * rcsPressure / 17.2 * reliefPhase : 0;
		double out = letdown + breakFlow + leak + porvFlow + safetyFlow;
		double in = charging + siFlow;
		double massBefore = rcsMass;
		rcsMass = Math.max(0, rcsMass + (in - out) * h);
		// identified leakage is collected in the drain tanks; everything else reaches containment
		double dischargedToContainment = (breakFlow + sealLeak + porvFlow + safetyFlow) * h;
		sumpMass += dischargedToContainment;
		double enthalpy = 0.0043 * Math.min(rcsTavg, 350);
		containmentEnergy += dischargedToContainment * Math.max(0, enthalpy - 0.17);
		boronPpm += (siFlow > 0 && rcsMass > 1000) ? (2400 - boronPpm) * siFlow * h / rcsMass * (recirculationMode ? 0.5 : 1) : 0;

		// ---------- primary energy balance
		double cp = C_PRIMARY * Math.max(0.15, Math.min(1.2, rcsMass / RCS_MASS_NOM));
		double qInjection = siFlow * 0.0043 * Math.max(0, rcsTavg - injectionTemp) + (charging - letdown) * 0.0043 * Math.max(0, rcsTavg - 260);
		double flashing = (rcsPressure <= SteamTables.psat(rcsTavg) + 0.05) ? (breakFlow + porvFlow + safetyFlow) * 0.35 : 0;
		previousTavg = rcsTavg;
		rcsTavg += h * (coreHeatToCoolant + pumpHeat - qSg - qRhr - qInjection - flashing) / cp;
		rcsTavg = clamp(rcsTavg, 5, 1200);

		// ---------- fuel energy balance
		double pFission = n * (1 - DH_TOTAL) * P_NOM;
		double pDecay = totalDecayFraction() * P_NOM * (1 - 0.6 * lowerHeadDebrisFractionRemovedFromCore());
		fuelTemp += h * (pFission + pDecay + qOx - coreHeatToCoolant) / C_FUEL;
		fuelTemp = Math.max(rcsTavg, fuelTemp);

		double dT = coreHeatToCoolant / (FLOW_CP * w);
		dT = Math.min(dT, 120);
		tHot = rcsTavg + dT / 2;
		tCold = rcsTavg - dT / 2;

		// ---------- pressurizer pressure
		double oldLevel = pzrLevel;
		updatePrimaryDerived();
		double dLevel = pzrLevel - oldLevel;
		double rawLevelChange = 670 * (rcsMass / RCS_MASS_NOM * SteamTables.relativeLiquidVolume(rcsTavg)
			- massBefore / RCS_MASS_NOM * SteamTables.relativeLiquidVolume(previousTavg));
		double dP;
		if (liquidVolume >= 1.112) {
			dP = 2.0 * rawLevelChange; // water solid: very stiff
		} else if (pzrLevel > 0) {
			// insurge/outsurge compresses or expands the steam bubble; flashing and
			// condensation in the pressurizer moderate the response
			dP = 0.06 * dLevel;
		} else {
			dP = 0;
		}
		dP += h * (pzrHeaterMW * 0.0067 - sprayFraction * 0.06);
		dP -= h * (porvFlow / 26.0) * 0.03 + (safetyValvesOpen ? h * 0.1 : 0);
		// heat losses slowly depressurize a pressurizer without heaters
		dP -= h * 0.0001 * Math.max(0, rcsPressure - 0.2);
		rcsPressure += dP;
		double satFloor = SteamTables.psat(Math.min(tHot, 373));
		if (pzrLevel <= 0) {
			// saturated two-phase system: pressure follows saturation at the core exit;
			// once almost no liquid remains there is little left to flash into steam
			double target = satFloor * Math.min(1, liquidVolume / 0.15 + 0.05);
			rcsPressure += (target - rcsPressure) * Math.min(1, h / 2.0);
			satFloor = target;
		}
		rcsPressure = Math.max(rcsPressure, satFloor * 0.98);
		rcsPressure = Math.max(rcsPressure, containmentPressure / 1000.0);
		rcsPressure = Math.min(rcsPressure, 21.5);
		if (rcsPressure > 18.4 && breakArea < 0.002) {
			breakArea = 0.002;
			alarms.log(time, 1, "RCS overpressure: pressure boundary breach");
			pendingEvents.add(new PlantEvent(PlantEvent.Type.RCS_BREAK, null, breakArea));
		}

		// ---------- relief valves
		for (int i = 0; i < 2; i++) {
			Equipment v = eq(i == 0 ? EquipmentId.PORV_1 : EquipmentId.PORV_2);
			boolean power = live(v.id.bus) && !v.failed;
			boolean want = porvManual[i] || (porvAuto[i] && (porvOpen[i] ? rcsPressure > 16.0 : rcsPressure > 16.2));
			if (porvStuckOpen[i]) {
				porvOpen[i] = true;
				continue;
			}
			if (want && power && !porvOpen[i]) {
				porvOpen[i] = true;
				v.condition = Math.max(0, v.condition - 0.02);
				pendingEvents.add(new PlantEvent(PlantEvent.Type.PORV_LIFT, v.id, 0));
			} else if (porvOpen[i] && (!want || !power)) {
				double pStick = lastEnv.failureRateFactor * (0.01 + 0.15 * Math.pow(1 - v.condition, 2));
				if (random() < pStick) {
					porvStuckOpen[i] = true;
					alarms.log(time, 2, v.id.label + " failed to reseat - stuck open");
				} else {
					porvOpen[i] = false;
				}
			}
		}
		boolean wasSafety = safetyValvesOpen;
		safetyValvesOpen = safetyValvesOpen ? rcsPressure > 16.9 : rcsPressure > 17.2;
		if (safetyValvesOpen && !wasSafety) {
			pendingEvents.add(new PlantEvent(PlantEvent.Type.SAFETY_VALVE_LIFT, null, 0));
		}

		// ---------- secondary side
		secondary(h, qSg);
		condenserAndCirculatingWater(h, env);
	}

	private double lowerHeadDebrisFractionRemovedFromCore() {
		return clamp(lowerHeadDebris + (vesselFailed ? 1 : 0), 0, 1);
	}

	private void secondary(double h, double qSg) {
		double psg = sgPressure();
		boolean steamAvailable = msivUpstreamSteamAvailable();
		steamTurbine = turbineLatched && msivOpen && steamAvailable ? CV_TURBINE * governor * psg : 0;
		boolean condenserAvailable = condenserAvailable();
		double dumpDemand = 0;
		if (steamDumpArmed && condenserAvailable && msivOpen) {
			double pressureMode = clamp((psg - 7.58) / 0.5, 0, 1);
			double tavgMode = steamDumpTavgMode ? clamp((rcsTavg - tref() - 1.5) / 12, 0, 1) : 0;
			dumpDemand = Math.max(pressureMode, tavgMode);
			if (steamDumpTavgMode && rcsTavg < tref() + 1.0) {
				steamDumpTavgMode = false;
			}
		}
		steamDump = steamAvailable ? CV_DUMP * dumpDemand * psg : 0;
		double advTarget = advAuto ? clamp((psg - 7.75) / 0.4, 0, 1) : advManual;
		if (!dcAvailable() && advAuto) {
			advTarget = 0; // ADV controllers need DC; manual local operation still possible
		}
		advPosition += (advTarget - advPosition) * Math.min(1, h / 3);
		steamAdv = steamAvailable ? CV_ADV * advPosition * psg : 0;
		steamSafety = psg > 8.2 && steamAvailable ? CV_SG_SAFETY * clamp((psg - 8.2) / 0.3, 0, 1) * psg : 0;
		double steamTdafw = eq(EquipmentId.TDAFW).running ? 8 : 0;
		double steamTotal = steamTurbine + steamDump + steamAdv + steamSafety + steamTdafw;

		// ---------- feedwater
		int mfwPumps = 0;
		for (EquipmentId id : List.of(EquipmentId.MFW_A, EquipmentId.MFW_B)) {
			Equipment p = eq(id);
			if (p.running && !condenserAvailable) {
				p.demanded = false;
				alarms.log(time, 2, id.label + " tripped: low suction (condenser hotwell)");
			}
			if (p.running) {
				mfwPumps++;
			}
		}
		double nr = sgNarrowRange();
		double mfwCapacity = 0;
		for (EquipmentId id : List.of(EquipmentId.MFW_A, EquipmentId.MFW_B)) {
			mfwCapacity += 1000 * eq(id).speed;
		}
		double mfwDemand;
		if (feedAuto) {
			mfwDemand = Math.max(0, steamTotal + 30 * (50 - nr));
		} else {
			mfwDemand = feedManualDemand * 2000;
		}
		mfwFlow = mfwIsolated ? 0 : Math.min(mfwDemand, mfwCapacity);
		double afwCapacity = (eq(EquipmentId.MDAFW_A).running ? 60 : 0) + (eq(EquipmentId.MDAFW_B).running ? 60 : 0)
			+ (eq(EquipmentId.TDAFW).running ? 120 : 0);
		boolean afwWater = cstMass > 0 || (afwFromEsw && (eq(EquipmentId.ESW_A).running || eq(EquipmentId.ESW_B).running));
		double afwTarget = nr < 40 ? 1.0 : clamp((55 - nr) / 15, 0, 1);
		afwFlow = afwWater ? afwCapacity * afwTarget : 0;
		if (!afwFromEsw) {
			cstMass = Math.max(0, cstMass - afwFlow * h);
		}
		feedFlow = mfwFlow + afwFlow;
		double loadFrac = clamp(steamTurbine / STEAM_FULL, 0, 1);
		double mfwTemp = 60 + 165 * Math.min(1, loadFrac * 1.25);
		feedTemp = feedFlow > 0 ? (mfwFlow * mfwTemp + afwFlow * 35) / feedFlow : feedTemp;

		// ---------- SG energy and mass balance
		double latent = SteamTables.hfg(sgTemp);
		double hf = SteamTables.hf(sgTemp);
		double hFeed = SteamTables.hf(feedTemp);
		double qOut = steamTotal * latent + feedFlow * Math.max(0, hf - hFeed);
		double cs = C_SECONDARY * Math.max(0.2, sgMass / SG_MASS_NOM);
		sgTemp += h * (qSg - qOut) / cs;
		sgTemp = clamp(sgTemp, 5, 370);
		sgMass = Math.max(0, sgMass + (feedFlow - steamTotal) * h);
		sgMass = Math.min(sgMass, 1.6 * SG_MASS_NOM);
	}

	double sprayFlow() {
		return ((eq(EquipmentId.CS_A).running ? 1 : 0) + (eq(EquipmentId.CS_B).running ? 1 : 0)) * 200.0;
	}

	boolean condenserAvailable() {
		return condenserPressure < 20 && cwFlow > 0.1;
	}

	private void condenserAndCirculatingWater(double h, PlantEnvironment env) {
		double pumps = 0;
		for (EquipmentId id : List.of(EquipmentId.CW_1, EquipmentId.CW_2, EquipmentId.CW_3, EquipmentId.CW_4)) {
			pumps += 0.25 * eq(id).speed;
		}
		double fouling = eq(EquipmentId.INTAKE_SCREENS).failed ? Math.max(screenFouling, 0.7) : screenFouling;
		cwFlow = pumps * (1 - 0.6 * fouling * fouling);
		double vacuumFactor = clamp(1 - (condenserPressure - 5) / 60, 0, 1);
		double turbineSpecificWork = 0.62 * vacuumFactor;
		double qIn = steamTurbine * (1.8 - turbineSpecificWork) + steamDump * 1.8;
		double cwCapacity = CW_FLOW_FULL * cwFlow * CP_WATER;
		double tIn = env.seaTemperature;
		double qOut = 0;
		if (cwCapacity > 1) {
			double effectiveness = 1 - Math.exp(-UA_CONDENSER * Math.max(cwFlow, 0.05) / cwCapacity);
			qOut = cwCapacity * effectiveness * Math.max(0, condenserTemp - tIn);
			cwOutletTemp = tIn + qOut / cwCapacity;
		} else {
			cwOutletTemp = condenserTemp;
			qOut = 0.5 * Math.max(0, condenserTemp - tIn);
		}
		condenserTemp += h * (qIn - qOut) / C_CONDENSER;
		condenserTemp = clamp(condenserTemp, tIn, 150);
		condenserPressure = SteamTables.psat(condenserTemp) * 1000;
		// cooling towers trim the discharge temperature before it returns to the sea
		double towerFraction = towersInService / 4.0;
		dischargeTemp = cwOutletTemp - 0.55 * towerFraction * Math.max(0, cwOutletTemp - env.wetBulb);
		turbineMechMW = steamTurbine * turbineSpecificWork;
	}

	public double towerHeatRejection() {
		double cwCapacity = CW_FLOW_FULL * cwFlow * CP_WATER;
		return Math.max(0, (cwOutletTemp - dischargeTemp) * cwCapacity);
	}

	// =================================================================== turbine generator

	private void turbineGenerator(double h) {
		Equipment turbine = eq(EquipmentId.TURBINE);
		double omega = Math.max(turbineSpeed, 30);
		double friction = 8.0 * Math.pow(turbineSpeed / TURBINE_RATED_RPM, 2) + (turbineSpeed > 1 ? 0.5 : 0);
		double electrical = 0;
		boolean gridConnected = generatorBreaker && gridAvailable && offsiteBreakerClosed;
		if (generatorBreaker && !gridConnected) {
			generatorBreaker = false;
		}
		if (gridConnected) {
			turbineSpeed = TURBINE_RATED_RPM;
			generatorMW = Math.max(-5, turbineMechMW * 0.985 - friction * 0.2);
			// governor in load control: track the ramped load setpoint
			double rampTarget = loadSetpoint;
			loadRamped += clamp(rampTarget - loadRamped, -rampRate * h, rampRate * h);
			double err = loadRamped - generatorMW;
			governor = clamp(governor + h * err * 0.0008, 0, 1);
		} else {
			// speed control (rolling up, or islanded on house loads)
			if (ndBusesOnUat && turbineSpeed > 1650) {
				electrical = houseLoad;
			}
			generatorMW = electrical;
			double accel = (turbineMechMW - electrical - friction) * TURBINE_RATED_RPM * TURBINE_RATED_RPM / (2 * TURBINE_KINETIC_ENERGY * omega);
			turbineSpeed = Math.max(0, turbineSpeed + accel * h);
			if (turbineLatched) {
				double err = speedSetpoint - turbineSpeed;
				double desired = clamp(0.02 + err * 0.004 + (electrical + friction) / (CV_TURBINE * Math.max(sgPressure(), 1) * 0.62), 0, 1);
				governor += (desired - governor) * Math.min(1, h / 0.3);
			}
			loadRamped = 0;
		}
		if (turbineSpeed > 1980 && turbineLatched) {
			tripTurbine("overspeed (110%)");
		}
		if (condenserPressure > 25 && turbineLatched && turbineSpeed > 300) {
			tripTurbine("low condenser vacuum");
		}
		double critical = turbineSpeed > 900 && turbineSpeed < 1300 ? 60 : 0;
		vibration = 25 + (1 - turbine.condition) * 120 + critical * (turbine.condition < 0.7 ? 1.5 : 0.6)
			+ (turbine.failed ? 150 : 0);
		if (vibration > 200 && turbineLatched) {
			tripTurbine("high bearing vibration");
		}
		// main step-up transformer temperature
		boolean fans = live(Bus.NS1);
		double loadingSq = Math.pow(Math.max(0, generatorMW) / GSU_RATING, 2);
		double target = 35 + 55 * loadingSq / (fans ? 1.0 : 0.55);
		gsuTemp += (target - gsuTemp) * Math.min(1, h / 600);
		if (gsuTemp > 110 && generatorBreaker) {
			generatorBreaker = false;
			alarms.log(time, 2, "Generator breaker opened: main transformer overtemperature");
			tripTurbine("main transformer protection");
		}
		netOutput = generatorBreaker ? generatorMW - (ndBusesOnUat ? houseLoad : 0) : 0;
	}

	// =================================================================== containment & severe accident

	private void containmentAndSevereAccident(double h, double slow) {
		// ---------- core damage progression
		if (peakClad > 1850 && coreDamage < 1) {
			coreDamage = Math.min(1, coreDamage + h * (peakClad - 1850) / 1000 * 0.01);
		}
		if (fuelTemp > 2600 && coreMelt < 1) {
			// UO2/ZrO2 eutectic melting: energy above the melting point goes into latent
			// heat (about 35 GJ for the core) instead of raising temperature further
			double excess = (fuelTemp - 2600) * C_FUEL;
			coreMelt = Math.min(1, coreMelt + excess / 35_000.0);
			fuelTemp = 2600;
		}
		if (coreDamage > 0.02 && !coreDamageAnnounced) {
			coreDamageAnnounced = true;
			alarms.log(time, 1, "Core exit thermocouples and radiation monitors indicate CORE DAMAGE");
			pendingEvents.add(new PlantEvent(PlantEvent.Type.CORE_DAMAGE_ONSET, null, coreDamage));
		}
		// gap release at cladding burst, then in-vessel release proportional to damage and melt
		if (peakClad > 850 && gapReleased < 1) {
			double d = Math.min(1 - gapReleased, h * (peakClad - 850) / 400 * 0.01);
			gapReleased += d;
		}
		double inVessel = 0.03 * gapReleased + 0.45 * coreDamage + 0.25 * coreMelt + (vesselFailed ? 0.1 : 0) + 0.05 * sfpDamage;
		if (inVessel > releasedToContainment) {
			airborneActivity += inVessel - releasedToContainment;
			releasedToContainment = inVessel;
		}
		// relocation of molten core to the lower head
		if (coreMelt > 0.3 && !vesselFailed) {
			lowerHeadDebris = Math.min(1, lowerHeadDebris + h * 0.002 * coreMelt);
			double debrisHeat = lowerHeadDebris * totalDecayFraction() * P_NOM;
			double waterCooling = liquidVolume > 0.3 ? 40.0 : 0.0;
			lowerHeadTemp += h * (debrisHeat - waterCooling * Math.max(0, lowerHeadTemp - rcsTavg) / 10) / 200;
			lowerHeadTemp = Math.max(rcsTavg, lowerHeadTemp);
			if (lowerHeadTemp > 1200) {
				vesselFailureTimer += h * (1 + rcsPressure / 5);
			}
			if (vesselFailureTimer > 600) {
				vesselFailed = true;
				breakArea = Math.max(breakArea, 0.05);
				alarms.log(time, 1, "Reactor vessel lower head failure - corium in reactor cavity");
				pendingEvents.add(new PlantEvent(PlantEvent.Type.VESSEL_FAILURE, null, lowerHeadDebris));
				containmentEnergy += 40_000 * (rcsPressure / 15.5);
			}
		}
		// molten core-concrete interaction in a dry cavity
		if (vesselFailed && !basematMeltThrough) {
			boolean cavityFlooded = sumpMass > 600_000;
			double heat = totalDecayFraction() * P_NOM * lowerHeadDebris;
			if (!cavityFlooded) {
				basematErosion += h * slow * heat / 45.0 / 3600.0 * 0.5;
				containmentEnergy += h * heat * 0.3;
				hydrogenKg += h * heat * 0.002;
			} else {
				containmentEnergy += h * heat;
			}
			if (basematErosion > 3.0) {
				basematMeltThrough = true;
				alarms.log(time, 1, "Basemat melt-through - corium has penetrated the containment foundation");
				pendingEvents.add(new PlantEvent(PlantEvent.Type.BASEMAT_MELT_THROUGH, null, 1));
			}
		}

		// ---------- containment heat removal
		double qFans = ((eq(EquipmentId.CFC_A).running ? 1 : 0) + (eq(EquipmentId.CFC_B).running ? 1 : 0))
			* 15.0 * clamp((containmentTemp - 35) / 60, 0, 3);
		double qSpray = sprayFlow() / 200.0 * 60.0 * clamp((containmentTemp - 30) / 80, 0, 2);
		double qStructures = 25.0 * clamp((containmentPressure - 101) / 150, 0, 3);
		containmentEnergy = Math.max(0, containmentEnergy - h * (qFans + qSpray + qStructures));
		if (sprayFlow() > 0) {
			sumpMass += sprayFlow() * h;
		}
		// hydrogen management
		hydrogenKg = Math.max(0, hydrogenKg - h * 0.0002 * hydrogenKg);
		double steamPartial = containmentEnergy * 0.0008;
		double h2Partial = hydrogenKg * 0.024;
		containmentPressure = 101 + steamPartial + h2Partial + basematErosion * 15;
		containmentTemp = 40 + containmentEnergy * 0.00028;
		double h2Pct = hydrogenFraction() * 100;
		boolean steamInerted = steamPartial / containmentPressure > 0.55;
		boolean ignitersPowered = ignitersOn && eq(EquipmentId.IGNITERS).running;
		if (ignitersPowered && h2Pct > 4.5 && !steamInerted) {
			double burned = hydrogenKg * 0.02 * h;
			hydrogenKg -= burned;
			containmentEnergy += burned * 120;
		}
		boolean ignitionSource = eq(EquipmentId.CFC_A).running || eq(EquipmentId.CFC_B).running
			|| eq(EquipmentId.RCP_A).running || eq(EquipmentId.PZR_HEATERS).running || h2Pct > 10 || ignitersPowered;
		if (h2Pct > 8 && !steamInerted && ignitionSource) {
			double burned = hydrogenKg * 0.8;
			hydrogenKg -= burned;
			double peak = containmentPressure * (h2Pct > 13 ? 5.0 : 2.6);
			containmentEnergy += burned * 120;
			alarms.log(time, 1, String.format("HYDROGEN DEFLAGRATION in containment: %.0f kg burned, peak %.0f kPa", burned, peak));
			pendingEvents.add(new PlantEvent(PlantEvent.Type.HYDROGEN_BURN, null, peak));
			if (peak > 700) {
				damageContainment((peak - 700) / 400);
			}
		}
		if (containmentPressure > 600) {
			damageContainment(h * (containmentPressure - 600) / 300 * 0.01);
		}
		if (containmentPressure > 950) {
			damageContainment(1);
		}
		// fission products: removal by sprays and deposition, decay, and leakage
		double removal = 2e-4 + sprayFlow() / 200.0 * 2e-3;
		airborneActivity *= Math.exp(-(removal + 1e-6 * slow) * h);
		double leakRate = 1.2e-8 * (containmentPressure / 101) + (1 - containmentIntegrity) * 3e-4
			+ (basematMeltThrough ? 5e-5 : 0) + (!phaseAIsolation && coreDamage > 0 ? 2e-6 : 0);
		double vent = filteredVentOpen ? 3e-4 : 0;
		releaseRate = airborneActivity * (leakRate + vent * 0.01) + sfpReleaseRate();
		airborneActivity = Math.max(0, airborneActivity - airborneActivity * (leakRate + vent) * h);
		if (filteredVentOpen) {
			containmentEnergy *= Math.exp(-vent * 10 * h);
			hydrogenKg *= Math.exp(-vent * 10 * h);
		}
		double released = releaseRate * h;
		pendingEnvironmentalRelease += released;
		totalEnvironmentalRelease += released;
	}

	private double sfpReleaseRate() {
		return sfpDamage > 0 ? sfpDamage * 2e-5 : 0;
	}

	public double hydrogenFraction() {
		return hydrogenKg * 0.024 / Math.max(101, containmentPressure);
	}

	private void damageContainment(double amount) {
		boolean wasIntact = containmentIntegrity > 0.5;
		containmentIntegrity = Math.max(0, containmentIntegrity - amount);
		if (wasIntact && containmentIntegrity <= 0.5) {
			alarms.log(time, 1, "CONTAINMENT FAILURE - loss of containment integrity");
			pendingEvents.add(new PlantEvent(PlantEvent.Type.CONTAINMENT_FAILURE, null, 1 - containmentIntegrity));
		}
	}

	// =================================================================== spent fuel pool

	private void spentFuelPool(double h, double slow) {
		double cooling = ((eq(EquipmentId.SFP_A).running ? 1 : 0) + (eq(EquipmentId.SFP_B).running ? 1 : 0))
			* 0.35 * Math.max(0, sfpTemp - (ccwAvailable ? 28 : 45));
		double heat = 4.0;
		double hs = h * slow;
		if (sfpTemp < 100) {
			sfpTemp += hs * (heat - cooling) / 6300.0;
		} else {
			double net = heat - cooling;
			if (net > 0) {
				sfpLevel = Math.max(0, sfpLevel - hs * net / 2.26 / 1_000_000.0);
			} else {
				sfpTemp += hs * net / 6300.0;
			}
			if (!sfpBoilingAnnounced) {
				sfpBoilingAnnounced = true;
				alarms.log(time, 1, "Spent fuel pool BOILING");
				pendingEvents.add(new PlantEvent(PlantEvent.Type.SFP_BOILING, null, 0));
			}
		}
		if (sfpTemp < 95) {
			sfpBoilingAnnounced = false;
		}
		if (sfpMakeup && (eq(EquipmentId.ESW_A).running || eq(EquipmentId.ESW_B).running)) {
			sfpLevel = Math.min(1.0, sfpLevel + h * 0.0005);
		}
		if (sfpLevel < 0.3) {
			double before = sfpDamage;
			sfpDamage = Math.min(1, sfpDamage + hs * (0.3 - sfpLevel) / 0.3 / 7200.0);
			if (before == 0 && sfpDamage > 0) {
				alarms.log(time, 1, "Spent fuel uncovered - fuel damage in the fuel building");
				pendingEvents.add(new PlantEvent(PlantEvent.Type.SFP_FUEL_DAMAGE, null, 0));
			}
		}
	}

	// =================================================================== alarms

	private void evaluateAlarms() {
		double power = kinetics.power();
		alarms.update(AlarmId.REACTOR_TRIP, reactorTripped, time);
		alarms.update(AlarmId.SI_ACTUATED, siActuated, time);
		alarms.update(AlarmId.HIGH_FLUX, power > 1.05, time);
		alarms.update(AlarmId.HIGH_STARTUP_RATE, kinetics.startupRate() > 1.0 && power < 0.5, time);
		alarms.update(AlarmId.PZR_PRESS_HIGH, rcsPressure > 15.9, time);
		alarms.update(AlarmId.PZR_PRESS_LOW, rcsPressure < 15.0, time);
		alarms.update(AlarmId.PZR_LEVEL_HIGH, pzrLevel > 70, time);
		alarms.update(AlarmId.PZR_LEVEL_LOW, pzrLevel < 17, time);
		alarms.update(AlarmId.PORV_OPEN, porvOpen[0] || porvOpen[1], time);
		alarms.update(AlarmId.SUBCOOLING_LOW, subcooling < 15, time);
		alarms.update(AlarmId.RCS_FLOW_LOW, rcsFlow < 0.9 && power > 0.1, time);
		alarms.update(AlarmId.RCS_LEAK, breakArea > 0 || sealLeak > 2 || porvStuckOpen[0] || porvStuckOpen[1], time);
		alarms.update(AlarmId.TAVG_DEVIATION, turbineLatched && Math.abs(rcsTavg - tref()) > 2.5 && power > 0.15, time);
		alarms.update(AlarmId.DNB_MARGIN_LOW, dnbr < 1.3 && power + totalDecayFraction() > 0.05, time);
		alarms.update(AlarmId.CORE_EXIT_TEMP_HIGH, tHot > 345 || peakClad > 650, time);
		alarms.update(AlarmId.CORE_DAMAGE, coreDamage > 0.01, time);
		alarms.update(AlarmId.SG_LEVEL_LOW, sgNarrowRange() < 30, time);
		alarms.update(AlarmId.SG_LEVEL_HIGH, sgNarrowRange() > 70, time);
		alarms.update(AlarmId.SG_PRESSURE_HIGH, sgPressure() > 7.9, time);
		alarms.update(AlarmId.FEED_FLOW_LOSS, feedFlow < 1 && sgNarrowRange() < 40, time);
		alarms.update(AlarmId.CST_LEVEL_LOW, cstMass < 0.2 * CST_CAPACITY, time);
		alarms.update(AlarmId.TURBINE_TRIP, !turbineLatched, time);
		alarms.update(AlarmId.TURBINE_OVERSPEED, turbineSpeed > 1900, time);
		alarms.update(AlarmId.TURBINE_VIBRATION, vibration > 125 && turbineSpeed > 300, time);
		alarms.update(AlarmId.CONDENSER_VACUUM_LOW, condenserPressure > 15 && turbineLatched, time);
		alarms.update(AlarmId.DISCHARGE_TEMP_HIGH, dischargeTemp > 32, time);
		alarms.update(AlarmId.INTAKE_SCREEN_DP, screenFouling > 0.5 || eq(EquipmentId.INTAKE_SCREENS).failed, time);
		alarms.update(AlarmId.GEN_BREAKER_OPEN, !generatorBreaker, time);
		alarms.update(AlarmId.GRID_LOST, !gridAvailable, time);
		boolean sbo = !live(Bus.SA) && !live(Bus.SB);
		alarms.update(AlarmId.STATION_BLACKOUT, sbo, time);
		alarms.update(AlarmId.BUS_DEAD, !live(Bus.NS1) || !live(Bus.NS2) || !live(Bus.SA) || !live(Bus.SB), time);
		alarms.update(AlarmId.EDG_RUNNING, eq(EquipmentId.EDG_A).running || eq(EquipmentId.EDG_B).running, time);
		alarms.update(AlarmId.EDG_OVERLOAD, edgOverloadTime[0] > 0 || edgOverloadTime[1] > 0, time);
		alarms.update(AlarmId.BATTERY_DISCHARGING, "BATTERY".equals(busSource.get(Bus.DCA)) || "BATTERY".equals(busSource.get(Bus.DCB)), time);
		alarms.update(AlarmId.BATTERY_LOW, batteryCharge[0] < 0.25 || batteryCharge[1] < 0.25, time);
		alarms.update(AlarmId.TRANSFORMER_TEMP_HIGH, gsuTemp > 95, time);
		boolean anyFailed = false;
		for (Equipment e : equipment.values()) {
			if (e.failed) {
				anyFailed = true;
				break;
			}
		}
		alarms.update(AlarmId.EQUIPMENT_FAILURE, anyFailed, time);
		alarms.update(AlarmId.CHANNEL_DEVIATION, sensors.anyDeviation(), time);
		alarms.update(AlarmId.CHANNEL_FAILED, sensors.anyFailedChannel(), time);
		alarms.update(AlarmId.CONT_PRESS_HIGH, containmentPressure > 125, time);
		alarms.update(AlarmId.CONT_HYDROGEN_HIGH, hydrogenFraction() > 0.04, time);
		alarms.update(AlarmId.CONT_RADIATION_HIGH, containmentDoseRate() > 1.0, time);
		alarms.update(AlarmId.CONTAINMENT_BREACH, containmentIntegrity < 0.9, time);
		alarms.update(AlarmId.OFFSITE_RELEASE, releaseRate > 1e-8, time);
		alarms.update(AlarmId.RWST_LOW, rwstMass < 0.1 * RWST_CAPACITY && !recirculationMode, time);
		alarms.update(AlarmId.SFP_TEMP_HIGH, sfpTemp > 60, time);
		alarms.update(AlarmId.SFP_LEVEL_LOW, sfpLevel < 0.85, time);
		alarms.update(AlarmId.XENON_TRANSIENT, Math.abs(xenon - xenonEquilibrium(power)) > 0.25, time);
		alarms.update(AlarmId.ROD_WITHDRAWAL_BLOCK, !reactorTripped && rodWithdrawalBlocked() != null && shutdownBanks >= ROD_STEPS - 0.5, time);
		boolean dhr = (qSgRemovalPossible() || rhrCooldown && ccwAvailable) && coreCovered > 0.99;
		alarms.update(AlarmId.DECAY_HEAT_REMOVAL_LOST, !dhr && reactorTripped, time);
	}

	double xenonEquilibrium(double n) {
		double iEq = XE_SOURCE * 0.953 * n / XE_LAMBDA_I;
		return (XE_SOURCE * 0.047 * n + XE_LAMBDA_I * iEq) / (XE_LAMBDA_X + XE_BURNOUT * n);
	}

	private boolean qSgRemovalPossible() {
		boolean steamPath = steamDump > 1 || steamAdv > 1 || steamSafety > 1 || steamTurbine > 1 || sgPressure() < 7.7;
		return sgMass > 0.3 * SG_MASS_NOM && (feedFlow > 5 || sgMass > 0.6 * SG_MASS_NOM) && steamPath && rcsFlow > 0.02;
	}

	/** Dose rate inside containment operating floor, Sv/h. N-16 during power operation plus airborne activity. */
	public double containmentDoseRate() {
		return 0.002 * kinetics.power() + 2e-4 * totalDecayFraction() / 0.065 + airborneActivity * 50.0;
	}

	// =================================================================== utilities

	Equipment eq(EquipmentId id) {
		return equipment.get(id);
	}

	public Equipment equipment(EquipmentId id) {
		return equipment.get(id);
	}

	static double clamp(double v, double lo, double hi) {
		return v < lo ? lo : (v > hi ? hi : v);
	}

	/** SplitMix64-style generator with persisted state so results are reproducible across saves. */
	double random() {
		rngState += 0x9E3779B97F4A7C15L;
		return (mix(rngState) >>> 11) * 0x1.0p-53;
	}

	static long mix(long z) {
		z = (z ^ (z >>> 30)) * 0xBF58476D1CE4E5B9L;
		z = (z ^ (z >>> 27)) * 0x94D049BB133111EBL;
		return z ^ (z >>> 31);
	}

	public void seedRandom(long seed) {
		rngState = seed;
	}

	public List<PlantEvent> drainEvents() {
		List<PlantEvent> out = new ArrayList<>(pendingEvents);
		pendingEvents.clear();
		return out;
	}

	/** Activity released to the environment since the last call (fraction of core volatile inventory). */
	public double drainEnvironmentalRelease() {
		double r = pendingEnvironmentalRelease;
		pendingEnvironmentalRelease = 0;
		return r;
	}

	PlantEnvironment lastEnvironment() {
		return lastEnv;
	}

	public AlarmSystem alarms() {
		return alarms;
	}

	public Sensors sensors() {
		return sensors;
	}

	public double time() {
		return time;
	}

	public PointKinetics kinetics() {
		return kinetics;
	}

	// =================================================================== public read-only accessors

	public boolean reactorTripped() {
		return reactorTripped;
	}

	public String tripCause() {
		return tripCause;
	}

	public double thermalPowerMW() {
		return coreHeatToCoolant;
	}

	public double neutronPower() {
		return kinetics.power();
	}

	public double decayHeatFraction() {
		return totalDecayFraction();
	}

	public double rcsTavg() {
		return rcsTavg;
	}

	public double rcsPressure() {
		return rcsPressure;
	}

	public double fuelTemp() {
		return fuelTemp;
	}

	public double peakClad() {
		return peakClad;
	}

	public double coreDamage() {
		return coreDamage;
	}

	public double coreMelt() {
		return coreMelt;
	}

	public boolean vesselFailed() {
		return vesselFailed;
	}

	public double containmentPressure() {
		return containmentPressure;
	}

	public double containmentIntegrity() {
		return containmentIntegrity;
	}

	public double generatorMW() {
		return generatorMW;
	}

	public double netOutput() {
		return netOutput;
	}

	public double turbineSpeed() {
		return turbineSpeed;
	}

	public boolean busLive(Bus bus) {
		return live(bus);
	}

	public double sgPressureMPa() {
		return sgPressure();
	}

	public double rcsFlow() {
		return rcsFlow;
	}

	public double totalEnvironmentalRelease() {
		return totalEnvironmentalRelease;
	}

	public double airborneActivity() {
		return airborneActivity;
	}

	public double sfpLevel() {
		return sfpLevel;
	}

	public double sfpDamage() {
		return sfpDamage;
	}

	public boolean basematMeltThrough() {
		return basematMeltThrough;
	}

	public double steamAdvFlow() {
		return steamAdv + steamSafety;
	}

	public boolean hornActive() {
		return alarms.hornActive();
	}

	public double xenon() {
		return xenon;
	}

	public double boronPpm() {
		return boronPpm;
	}

	public double controlBankPosition() {
		return controlBanks;
	}

	public double shutdownBankPosition() {
		return shutdownBanks;
	}

	public boolean turbineLatched() {
		return turbineLatched;
	}

	public boolean generatorBreakerClosed() {
		return generatorBreaker;
	}

	public double cwFlow() {
		return cwFlow;
	}

	public int towersInService() {
		return towersInService;
	}

	public double sgNarrowRangeLevel() {
		return sgNarrowRange();
	}

	public double pzrLevel() {
		return pzrLevel;
	}

	public double coreCovered() {
		return coreCovered;
	}

	// =================================================================== persistence

	public void save(StateIO.Writer w) {
		w.putInt("version", 1);
		w.putDouble("time", time);
		w.putLong("rng", rngState);
		StateIO.Writer k = w.child("kinetics");
		k.putDouble("n", kinetics.power());
		double[] c = kinetics.precursors();
		for (int i = 0; i < 6; i++) {
			k.putDouble("c" + i, c[i]);
		}
		StateIO.Writer e = w.child("equipment");
		for (Equipment eqp : equipment.values()) {
			eqp.save(e.child(eqp.id.name()));
		}
		sensors.save(w.child("sensors"));
		alarms.save(w.child("alarms"));
		StateIO.Writer d = w.child("decay");
		for (int i = 0; i < 6; i++) {
			d.putDouble("g" + i, decayHeat[i]);
		}
		StateIO.Writer s = w.child("state");
		s.putDouble("shutdownBanks", shutdownBanks);
		s.putDouble("controlBanks", controlBanks);
		s.putInt("rodMotion", rodMotion);
		s.putInt("shutdownMotion", shutdownMotion);
		s.putBoolean("rodAuto", rodAuto);
		s.putBoolean("reactorTripped", reactorTripped);
		s.putString("tripCause", tripCause);
		s.putDouble("boronPpm", boronPpm);
		s.putDouble("boronTarget", boronTarget);
		s.putDouble("iodine", iodine);
		s.putDouble("xenon", xenon);
		s.putDouble("burnup", burnup);
		s.putDouble("fuelTemp", fuelTemp);
		s.putDouble("rcsTavg", rcsTavg);
		s.putDouble("rcsPressure", rcsPressure);
		s.putDouble("rcsMass", rcsMass);
		s.putDouble("breakArea", breakArea);
		s.putDouble("sealCoolingLostTime", sealCoolingLostTime);
		s.putBoolean("pzrHeatersAuto", pzrHeatersAuto);
		s.putBoolean("pzrHeatersManualOn", pzrHeatersManualOn);
		s.putBoolean("sprayAuto", sprayAuto);
		s.putBoolean("sprayManualOpen", sprayManualOpen);
		for (int i = 0; i < 2; i++) {
			s.putBoolean("porvOpen" + i, porvOpen[i]);
			s.putBoolean("porvAuto" + i, porvAuto[i]);
			s.putBoolean("porvManual" + i, porvManual[i]);
			s.putBoolean("porvBlock" + i, porvBlockOpen[i]);
			s.putBoolean("porvStuck" + i, porvStuckOpen[i]);
			s.putDouble("edgStartTimer" + i, edgStartTimer[i]);
			s.putBoolean("edgBreaker" + i, edgBreaker[i]);
			s.putDouble("edgFuel" + i, edgFuel[i]);
			s.putDouble("battery" + i, batteryCharge[i]);
		}
		s.putBoolean("letdown", letdownInService);
		s.putDouble("sgTemp", sgTemp);
		s.putDouble("sgMass", sgMass);
		s.putBoolean("msivOpen", msivOpen);
		s.putBoolean("feedAuto", feedAuto);
		s.putDouble("feedManualDemand", feedManualDemand);
		s.putBoolean("mfwIsolated", mfwIsolated);
		s.putBoolean("steamDumpArmed", steamDumpArmed);
		s.putBoolean("steamDumpTavgMode", steamDumpTavgMode);
		s.putBoolean("advAuto", advAuto);
		s.putDouble("advManual", advManual);
		s.putDouble("advPosition", advPosition);
		s.putDouble("cstMass", cstMass);
		s.putBoolean("afwFromEsw", afwFromEsw);
		s.putBoolean("turbineLatched", turbineLatched);
		s.putDouble("turbineSpeed", turbineSpeed);
		s.putDouble("governor", governor);
		s.putDouble("speedSetpoint", speedSetpoint);
		s.putDouble("loadSetpoint", loadSetpoint);
		s.putDouble("loadRamped", loadRamped);
		s.putDouble("rampRate", rampRate);
		s.putBoolean("generatorBreaker", generatorBreaker);
		s.putDouble("gsuTemp", gsuTemp);
		s.putDouble("condenserTemp", condenserTemp);
		s.putInt("towersInService", towersInService);
		s.putDouble("screenFouling", screenFouling);
		s.putBoolean("gridAvailable", gridAvailable);
		s.putBoolean("offsiteBreakerClosed", offsiteBreakerClosed);
		s.putDouble("gridOutageRemaining", gridOutageRemaining);
		s.putBoolean("siActuated", siActuated);
		s.putDouble("siActuatedTime", siActuatedTime);
		s.putBoolean("siBlocked", siBlocked);
		s.putBoolean("steamlineSiBlocked", steamlineSiBlocked);
		s.putBoolean("containmentSprayActuated", containmentSprayActuated);
		s.putBoolean("phaseAIsolation", phaseAIsolation);
		s.putBoolean("rhrCooldown", rhrCooldown);
		s.putBoolean("recirculationMode", recirculationMode);
		s.putDouble("rwstMass", rwstMass);
		s.putDouble("accumulatorMass", accumulatorMass);
		s.putDouble("sumpMass", sumpMass);
		s.putBoolean("ignitersOn", ignitersOn);
		s.putBoolean("filteredVentOpen", filteredVentOpen);
		s.putDouble("ccwTemp", ccwTemp);
		s.putDouble("containmentEnergy", containmentEnergy);
		s.putDouble("containmentIntegrity", containmentIntegrity);
		s.putDouble("hydrogenKg", hydrogenKg);
		s.putDouble("oxidation", oxidation);
		s.putDouble("coreDamage", coreDamage);
		s.putDouble("coreMelt", coreMelt);
		s.putDouble("lowerHeadDebris", lowerHeadDebris);
		s.putDouble("lowerHeadTemp", lowerHeadTemp);
		s.putDouble("vesselFailureTimer", vesselFailureTimer);
		s.putBoolean("vesselFailed", vesselFailed);
		s.putDouble("basematErosion", basematErosion);
		s.putBoolean("basematMeltThrough", basematMeltThrough);
		s.putDouble("releasedToContainment", releasedToContainment);
		s.putDouble("gapReleased", gapReleased);
		s.putDouble("airborneActivity", airborneActivity);
		s.putDouble("totalEnvironmentalRelease", totalEnvironmentalRelease);
		s.putDouble("pendingEnvironmentalRelease", pendingEnvironmentalRelease);
		s.putBoolean("coreDamageAnnounced", coreDamageAnnounced);
		s.putDouble("sfpTemp", sfpTemp);
		s.putDouble("sfpLevel", sfpLevel);
		s.putDouble("sfpDamage", sfpDamage);
		s.putBoolean("sfpMakeup", sfpMakeup);
		s.putDouble("cwFlow", cwFlow);
		s.putDouble("containmentTemp", containmentTemp);
	}

	public void load(StateIO.Reader r) {
		time = r.getDouble("time", 0);
		rngState = r.getLong("rng", rngState);
		StateIO.Reader k = r.child("kinetics");
		double[] c = new double[6];
		for (int i = 0; i < 6; i++) {
			c[i] = k.getDouble("c" + i, kinetics.precursors()[i]);
		}
		kinetics.load(k.getDouble("n", 1.0), c);
		StateIO.Reader e = r.child("equipment");
		for (Equipment eqp : equipment.values()) {
			if (e.has(eqp.id.name())) {
				eqp.load(e.child(eqp.id.name()));
			}
		}
		sensors.load(r.child("sensors"));
		alarms.load(r.child("alarms"));
		StateIO.Reader d = r.child("decay");
		for (int i = 0; i < 6; i++) {
			decayHeat[i] = d.getDouble("g" + i, decayHeat[i]);
		}
		StateIO.Reader s = r.child("state");
		shutdownBanks = s.getDouble("shutdownBanks", shutdownBanks);
		controlBanks = s.getDouble("controlBanks", controlBanks);
		rodMotion = s.getInt("rodMotion", 0);
		shutdownMotion = s.getInt("shutdownMotion", 0);
		rodAuto = s.getBoolean("rodAuto", rodAuto);
		reactorTripped = s.getBoolean("reactorTripped", reactorTripped);
		tripCause = s.getString("tripCause", tripCause);
		boronPpm = s.getDouble("boronPpm", boronPpm);
		boronTarget = s.getDouble("boronTarget", Double.NaN);
		iodine = s.getDouble("iodine", iodine);
		xenon = s.getDouble("xenon", xenon);
		burnup = s.getDouble("burnup", burnup);
		fuelTemp = s.getDouble("fuelTemp", fuelTemp);
		rcsTavg = s.getDouble("rcsTavg", rcsTavg);
		previousTavg = rcsTavg;
		rcsPressure = s.getDouble("rcsPressure", rcsPressure);
		rcsMass = s.getDouble("rcsMass", rcsMass);
		breakArea = s.getDouble("breakArea", breakArea);
		sealCoolingLostTime = s.getDouble("sealCoolingLostTime", 0);
		pzrHeatersAuto = s.getBoolean("pzrHeatersAuto", true);
		pzrHeatersManualOn = s.getBoolean("pzrHeatersManualOn", false);
		sprayAuto = s.getBoolean("sprayAuto", true);
		sprayManualOpen = s.getBoolean("sprayManualOpen", false);
		for (int i = 0; i < 2; i++) {
			porvOpen[i] = s.getBoolean("porvOpen" + i, false);
			porvAuto[i] = s.getBoolean("porvAuto" + i, true);
			porvManual[i] = s.getBoolean("porvManual" + i, false);
			porvBlockOpen[i] = s.getBoolean("porvBlock" + i, true);
			porvStuckOpen[i] = s.getBoolean("porvStuck" + i, false);
			edgStartTimer[i] = s.getDouble("edgStartTimer" + i, 0);
			edgBreaker[i] = s.getBoolean("edgBreaker" + i, false);
			edgFuel[i] = s.getDouble("edgFuel" + i, 1);
			batteryCharge[i] = s.getDouble("battery" + i, 1);
		}
		letdownInService = s.getBoolean("letdown", true);
		sgTemp = s.getDouble("sgTemp", sgTemp);
		sgMass = s.getDouble("sgMass", sgMass);
		msivOpen = s.getBoolean("msivOpen", true);
		feedAuto = s.getBoolean("feedAuto", true);
		feedManualDemand = s.getDouble("feedManualDemand", 0.5);
		mfwIsolated = s.getBoolean("mfwIsolated", false);
		steamDumpArmed = s.getBoolean("steamDumpArmed", true);
		steamDumpTavgMode = s.getBoolean("steamDumpTavgMode", false);
		advAuto = s.getBoolean("advAuto", true);
		advManual = s.getDouble("advManual", 0);
		advPosition = s.getDouble("advPosition", 0);
		cstMass = s.getDouble("cstMass", cstMass);
		afwFromEsw = s.getBoolean("afwFromEsw", false);
		turbineLatched = s.getBoolean("turbineLatched", turbineLatched);
		turbineSpeed = s.getDouble("turbineSpeed", turbineSpeed);
		governor = s.getDouble("governor", governor);
		speedSetpoint = s.getDouble("speedSetpoint", speedSetpoint);
		loadSetpoint = s.getDouble("loadSetpoint", loadSetpoint);
		loadRamped = s.getDouble("loadRamped", loadRamped);
		rampRate = s.getDouble("rampRate", rampRate);
		generatorBreaker = s.getBoolean("generatorBreaker", generatorBreaker);
		gsuTemp = s.getDouble("gsuTemp", gsuTemp);
		condenserTemp = s.getDouble("condenserTemp", condenserTemp);
		condenserPressure = SteamTables.psat(condenserTemp) * 1000;
		towersInService = s.getInt("towersInService", 4);
		screenFouling = s.getDouble("screenFouling", screenFouling);
		gridAvailable = s.getBoolean("gridAvailable", true);
		offsiteBreakerClosed = s.getBoolean("offsiteBreakerClosed", true);
		gridOutageRemaining = s.getDouble("gridOutageRemaining", 0);
		siActuated = s.getBoolean("siActuated", false);
		siActuatedTime = s.getDouble("siActuatedTime", 0);
		siBlocked = s.getBoolean("siBlocked", false);
		steamlineSiBlocked = s.getBoolean("steamlineSiBlocked", false);
		containmentSprayActuated = s.getBoolean("containmentSprayActuated", false);
		phaseAIsolation = s.getBoolean("phaseAIsolation", false);
		rhrCooldown = s.getBoolean("rhrCooldown", false);
		recirculationMode = s.getBoolean("recirculationMode", false);
		rwstMass = s.getDouble("rwstMass", rwstMass);
		accumulatorMass = s.getDouble("accumulatorMass", accumulatorMass);
		sumpMass = s.getDouble("sumpMass", 0);
		ignitersOn = s.getBoolean("ignitersOn", false);
		filteredVentOpen = s.getBoolean("filteredVentOpen", false);
		ccwTemp = s.getDouble("ccwTemp", ccwTemp);
		containmentEnergy = s.getDouble("containmentEnergy", 0);
		containmentIntegrity = s.getDouble("containmentIntegrity", 1);
		hydrogenKg = s.getDouble("hydrogenKg", 0);
		oxidation = s.getDouble("oxidation", 0);
		coreDamage = s.getDouble("coreDamage", 0);
		coreMelt = s.getDouble("coreMelt", 0);
		lowerHeadDebris = s.getDouble("lowerHeadDebris", 0);
		lowerHeadTemp = s.getDouble("lowerHeadTemp", lowerHeadTemp);
		vesselFailureTimer = s.getDouble("vesselFailureTimer", 0);
		vesselFailed = s.getBoolean("vesselFailed", false);
		basematErosion = s.getDouble("basematErosion", 0);
		basematMeltThrough = s.getBoolean("basematMeltThrough", false);
		releasedToContainment = s.getDouble("releasedToContainment", 0);
		gapReleased = s.getDouble("gapReleased", 0);
		airborneActivity = s.getDouble("airborneActivity", 0);
		totalEnvironmentalRelease = s.getDouble("totalEnvironmentalRelease", 0);
		pendingEnvironmentalRelease = s.getDouble("pendingEnvironmentalRelease", 0);
		coreDamageAnnounced = s.getBoolean("coreDamageAnnounced", false);
		sfpTemp = s.getDouble("sfpTemp", sfpTemp);
		sfpLevel = s.getDouble("sfpLevel", 1);
		sfpDamage = s.getDouble("sfpDamage", 0);
		sfpMakeup = s.getBoolean("sfpMakeup", false);
		cwFlow = s.getDouble("cwFlow", cwFlow);
		containmentTemp = s.getDouble("containmentTemp", containmentTemp);
		containmentPressure = 101 + containmentEnergy * 0.0008 + hydrogenKg * 0.024 + basematErosion * 15;
		updatePrimaryDerived();
	}
}
