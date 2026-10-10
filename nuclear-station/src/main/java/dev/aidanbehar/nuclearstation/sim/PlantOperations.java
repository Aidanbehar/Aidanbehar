package dev.aidanbehar.nuclearstation.sim;

import dev.aidanbehar.nuclearstation.sim.PlantCommand.Result;

/**
 * Executes operator commands against a {@link PlantModel}, enforcing the interlocks a
 * real control room would. Every refusal explains which condition blocked it.
 */
public final class PlantOperations {
	private PlantOperations() {
	}

	public static Result execute(PlantModel m, PlantCommand cmd, int index, double value) {
		Result r = run(m, cmd, index, value);
		if (r.accepted() && cmd != PlantCommand.ALARM_ACK && cmd != PlantCommand.ALARM_SILENCE && cmd != PlantCommand.ALARM_RESET) {
			m.alarms.log(m.time, 4, "OPER   " + r.message());
		}
		return r;
	}

	private static Result run(PlantModel m, PlantCommand cmd, int index, double value) {
		switch (cmd) {
			case MANUAL_TRIP -> {
				m.tripReactor("manual");
				return Result.ok("Reactor tripped manually");
			}
			case RESET_TRIP -> {
				if (!m.reactorTripped) {
					return Result.blocked("Reactor trip breakers already closed");
				}
				if (m.siActuated) {
					return Result.blocked("Cannot reset: safety injection signal present");
				}
				if (m.shutdownBanks > 0.5 || m.controlBanks > 0.5) {
					return Result.blocked("Cannot reset: rods still moving");
				}
				if (!m.live(Bus.NS1) && !m.live(Bus.NS2)) {
					return Result.blocked("Cannot reset: rod drive MG sets de-energised");
				}
				if (m.rcsFlow < 0.5) {
					return Result.blocked("Cannot reset: at least two RCPs required");
				}
				m.reactorTripped = false;
				m.tripCause = "";
				return Result.ok("Reactor trip breakers closed");
			}
			case ROD_OUT -> {
				if (m.rodAuto) {
					return Result.blocked("Rod control in AUTO - select MANUAL first");
				}
				String block = m.rodWithdrawalBlocked();
				if (block != null) {
					return Result.blocked("Rod withdrawal blocked: " + block);
				}
				m.rodMotion = 1;
				return Result.ok("Withdrawing control banks");
			}
			case ROD_IN -> {
				if (m.rodAuto) {
					return Result.blocked("Rod control in AUTO - select MANUAL first");
				}
				if (m.reactorTripped) {
					return Result.blocked("Rods already inserted by trip");
				}
				m.rodMotion = -1;
				return Result.ok("Inserting control banks");
			}
			case ROD_STOP -> {
				m.rodMotion = 0;
				return Result.ok("Rod motion stopped");
			}
			case ROD_AUTO -> {
				if (m.kinetics.power() < 0.15) {
					return Result.blocked("Automatic rod control requires power above 15% (C-5)");
				}
				if (!m.turbineLatched) {
					return Result.blocked("Automatic rod control requires turbine on line");
				}
				m.rodAuto = true;
				m.rodMotion = 0;
				return Result.ok("Rod control in AUTOMATIC");
			}
			case ROD_MANUAL -> {
				m.rodAuto = false;
				m.rodMotion = 0;
				return Result.ok("Rod control in MANUAL");
			}
			case SHUTDOWN_BANKS_OUT -> {
				if (m.reactorTripped) {
					return Result.blocked("Reset the reactor trip breakers first");
				}
				if (m.shutdownBanks >= PlantModel.ROD_STEPS) {
					return Result.blocked("Shutdown banks already fully withdrawn");
				}
				m.shutdownMotion = 1;
				return Result.ok("Withdrawing shutdown banks (64 steps/min)");
			}
			case SHUTDOWN_BANKS_IN -> {
				if (m.controlBanks > 0.5) {
					return Result.blocked("Insert control banks before shutdown banks");
				}
				m.shutdownMotion = -1;
				return Result.ok("Inserting shutdown banks");
			}
			case BORON_ADJUST -> {
				double base = Double.isNaN(m.boronTarget) ? m.boronPpm : m.boronTarget;
				double target = PlantModel.clamp(base + value, 0, 2500);
				if (!m.eq(EquipmentId.CHG_A).running && !m.eq(EquipmentId.CHG_B).running) {
					return Result.blocked("No charging pump running");
				}
				if (m.siActuated) {
					return Result.blocked("CVCS aligned to safety injection");
				}
				m.boronTarget = target;
				return Result.ok(String.format("Boron target %.0f ppm (%s)", target, target > m.boronPpm ? "borating" : "diluting"));
			}
			case BORON_HOLD -> {
				m.boronTarget = Double.NaN;
				return Result.ok("Boration/dilution stopped");
			}
			case EQUIP_START, EQUIP_STOP -> {
				if (index < 0 || index >= EquipmentId.values().length) {
					return Result.blocked("Unknown equipment");
				}
				return startStop(m, EquipmentId.values()[index], cmd == PlantCommand.EQUIP_START);
			}
			case PZR_HEATERS_AUTO -> {
				m.pzrHeatersAuto = true;
				return Result.ok("Pressurizer heaters in AUTO");
			}
			case PZR_HEATERS_ON -> {
				m.pzrHeatersAuto = false;
				m.pzrHeatersManualOn = true;
				return Result.ok("Pressurizer heaters ON (manual)");
			}
			case PZR_HEATERS_OFF -> {
				m.pzrHeatersAuto = false;
				m.pzrHeatersManualOn = false;
				return Result.ok("Pressurizer heaters OFF (manual)");
			}
			case SPRAY_AUTO -> {
				m.sprayAuto = true;
				return Result.ok("Pressurizer spray in AUTO");
			}
			case SPRAY_OPEN -> {
				m.sprayAuto = false;
				m.sprayManualOpen = true;
				return Result.ok("Pressurizer spray valves OPEN");
			}
			case SPRAY_CLOSE -> {
				m.sprayAuto = false;
				m.sprayManualOpen = false;
				return Result.ok("Pressurizer spray valves CLOSED");
			}
			case PORV_AUTO, PORV_OPEN, PORV_CLOSE, PORV_BLOCK -> {
				int i = index == 1 ? 1 : 0;
				Equipment v = m.eq(i == 0 ? EquipmentId.PORV_1 : EquipmentId.PORV_2);
				if (cmd == PlantCommand.PORV_BLOCK) {
					m.porvBlockOpen[i] = !m.porvBlockOpen[i];
					return Result.ok("PORV " + (i + 1) + " block valve " + (m.porvBlockOpen[i] ? "OPEN" : "CLOSED"));
				}
				if (!m.live(v.id.bus)) {
					return Result.blocked("PORV " + (i + 1) + " solenoid has no DC power");
				}
				if (cmd == PlantCommand.PORV_AUTO) {
					m.porvAuto[i] = true;
					m.porvManual[i] = false;
					return Result.ok("PORV " + (i + 1) + " in AUTO");
				}
				m.porvAuto[i] = false;
				m.porvManual[i] = cmd == PlantCommand.PORV_OPEN;
				if (cmd == PlantCommand.PORV_CLOSE && m.porvStuckOpen[i]) {
					return Result.ok("PORV " + (i + 1) + " close demanded - position indication still OPEN (valve stuck)");
				}
				return Result.ok("PORV " + (i + 1) + (m.porvManual[i] ? " OPEN" : " CLOSED"));
			}
			case FEED_AUTO -> {
				m.feedAuto = true;
				return Result.ok("Feedwater control in AUTO");
			}
			case FEED_MANUAL -> {
				m.feedAuto = false;
				m.feedManualDemand = PlantModel.clamp(value, 0, 1);
				return Result.ok(String.format("Feedwater control MANUAL at %.0f%%", m.feedManualDemand * 100));
			}
			case MFW_RESET -> {
				if (m.siActuated) {
					return Result.blocked("Feedwater isolation sealed in by SI signal");
				}
				if (m.sgNarrowRange() > 75) {
					return Result.blocked("SG level high-high still present");
				}
				m.mfwIsolated = false;
				return Result.ok("Feedwater isolation reset");
			}
			case MSIV_OPEN -> {
				if (m.containmentPressure > 200) {
					return Result.blocked("Containment pressure high - MSIV closure sealed in");
				}
				if (m.sgPressure() < 0.5) {
					return Result.blocked("No steam pressure to warm the main steam lines");
				}
				m.msivOpen = true;
				return Result.ok("Main steam isolation valves OPEN");
			}
			case MSIV_CLOSE -> {
				m.msivOpen = false;
				return Result.ok("Main steam isolation valves CLOSED");
			}
			case ADV_AUTO -> {
				m.advAuto = true;
				return Result.ok("Atmospheric dump valves in AUTO (7.75 MPa)");
			}
			case ADV_MANUAL -> {
				m.advAuto = false;
				m.advManual = PlantModel.clamp(value, 0, 1);
				return Result.ok(String.format("Atmospheric dump valves MANUAL %.0f%%", m.advManual * 100));
			}
			case STEAM_DUMP_ARM -> {
				if (!m.condenserAvailable()) {
					return Result.blocked("Condenser not available (C-9): vacuum or circulating water lost");
				}
				m.steamDumpArmed = true;
				return Result.ok("Condenser steam dumps armed");
			}
			case STEAM_DUMP_BLOCK -> {
				m.steamDumpArmed = false;
				return Result.ok("Condenser steam dumps blocked");
			}
			case AFW_SUCTION_SWAP -> {
				m.afwFromEsw = !m.afwFromEsw;
				return Result.ok("AFW suction aligned to " + (m.afwFromEsw ? "essential service water (sea water)" : "condensate storage tank"));
			}
			case TURBINE_LATCH -> {
				if (m.turbineLatched) {
					return Result.blocked("Turbine already latched");
				}
				if (m.vibration > 180) {
					return Result.blocked("Turbine vibration too high to latch");
				}
				if (!m.condenserAvailable()) {
					return Result.blocked("Condenser vacuum required to latch turbine");
				}
				if (!m.msivOpen) {
					return Result.blocked("MSIVs closed");
				}
				if (m.eq(EquipmentId.TURBINE).failed) {
					return Result.blocked("Turbine damaged - repair required");
				}
				m.turbineLatched = true;
				m.governor = 0;
				m.speedSetpoint = Math.min(m.speedSetpoint, m.turbineSpeed);
				return Result.ok("Turbine latched, stop valves open");
			}
			case TURBINE_TRIP -> {
				m.tripTurbine("manual");
				return Result.ok("Turbine tripped");
			}
			case TURBINE_SPEED -> {
				if (!m.turbineLatched) {
					return Result.blocked("Turbine not latched");
				}
				m.speedSetpoint = PlantModel.clamp(value, 0, PlantModel.TURBINE_RATED_RPM);
				return Result.ok(String.format("Turbine speed setpoint %.0f rpm", m.speedSetpoint));
			}
			case GENERATOR_SYNC -> {
				if (m.generatorBreaker) {
					return Result.blocked("Generator already on line");
				}
				if (!m.turbineLatched) {
					return Result.blocked("Turbine not latched");
				}
				if (Math.abs(m.turbineSpeed - PlantModel.TURBINE_RATED_RPM) > 6) {
					return Result.blocked(String.format("Synchroscope: speed %.0f rpm out of window (1794-1806)", m.turbineSpeed));
				}
				if (!m.gridAvailable || !m.offsiteBreakerClosed) {
					return Result.blocked("Switchyard dead - grid not available");
				}
				if (m.eq(EquipmentId.GSU).failed || m.eq(EquipmentId.GENERATOR).failed) {
					return Result.blocked("Generator or main transformer out of service");
				}
				m.generatorBreaker = true;
				m.loadSetpoint = Math.max(30, m.loadSetpoint < 30 ? 30 : Math.min(m.loadSetpoint, 50));
				m.loadRamped = 0;
				return Result.ok("Generator synchronised - minimum load 30 MW");
			}
			case GENERATOR_OPEN -> {
				if (!m.generatorBreaker) {
					return Result.blocked("Generator breaker already open");
				}
				m.generatorBreaker = false;
				m.steamDumpTavgMode = true;
				return Result.ok("Generator breaker opened");
			}
			case LOAD_SETPOINT, LOAD_ADJUST -> {
				double target = cmd == PlantCommand.LOAD_SETPOINT ? value : m.loadSetpoint + value;
				target = PlantModel.clamp(target, 0, 1100);
				if (!m.generatorBreaker) {
					return Result.blocked("Generator not synchronised");
				}
				if (m.runbackActive && target > 600) {
					return Result.blocked("Runback active: one main feed pump - load limited to 600 MW");
				}
				m.loadSetpoint = target;
				return Result.ok(String.format("Load setpoint %.0f MW", target));
			}
			case RAMP_RATE -> {
				m.rampRate = PlantModel.clamp(value, 5, 200) / 60.0;
				return Result.ok(String.format("Load ramp rate %.0f MW/min", m.rampRate * 60));
			}
			case TOWERS -> {
				m.towersInService = (int) PlantModel.clamp(index, 0, 4);
				return Result.ok(m.towersInService + " cooling tower(s) in service");
			}
			case EDG_START -> {
				int k = index == 1 ? 1 : 0;
				Equipment edg = m.eq(k == 0 ? EquipmentId.EDG_A : EquipmentId.EDG_B);
				if (edg.failed) {
					return Result.blocked(edg.id.label + " failed: " + edg.failureCause);
				}
				if (edg.running) {
					return Result.blocked(edg.id.label + " already running");
				}
				if (m.edgFuel[k] <= 0) {
					return Result.blocked("No fuel oil in day tank");
				}
				m.startDiesel(k, m.lastEnvironment());
				return edg.failed ? Result.blocked(edg.id.label + " failed to start") : Result.ok(edg.id.label + " start signal");
			}
			case EDG_STOP -> {
				int k = index == 1 ? 1 : 0;
				Equipment edg = m.eq(k == 0 ? EquipmentId.EDG_A : EquipmentId.EDG_B);
				if (m.edgBreaker[k]) {
					return Result.blocked(edg.id.label + " is carrying its bus - restore offsite power first");
				}
				if (m.siActuated) {
					return Result.blocked("SI signal present - diesel start sealed in");
				}
				edg.running = false;
				edg.demanded = false;
				return Result.ok(edg.id.label + " stopped");
			}
			case OFFSITE_CLOSE -> {
				if (!m.gridAvailable) {
					return Result.blocked("Grid dispatcher reports offsite lines still de-energised");
				}
				if (m.eq(EquipmentId.SST).failed) {
					return Result.blocked("Station service transformer out of service");
				}
				m.offsiteBreakerClosed = true;
				return Result.ok("Offsite supply breaker closed");
			}
			case OFFSITE_OPEN -> {
				m.offsiteBreakerClosed = false;
				return Result.ok("Offsite supply breaker opened");
			}
			case SI_MANUAL -> {
				if (m.siActuated) {
					return Result.blocked("SI already actuated");
				}
				m.actuateSafetyInjection("manual");
				return Result.ok("Safety injection actuated manually");
			}
			case SI_RESET -> {
				if (!m.siActuated) {
					return Result.blocked("No SI signal to reset");
				}
				if (m.time - m.siActuatedTime < 60) {
					return Result.blocked("SI reset timer: wait 60 s after actuation");
				}
				m.siActuated = false;
				return Result.ok("SI signal reset - ECCS pumps may now be stopped individually");
			}
			case SI_BLOCK -> {
				if (m.rcsPressure > 13.8) {
					return Result.blocked("P-11 not satisfied: pressure must be below 13.8 MPa");
				}
				m.siBlocked = true;
				return Result.ok("Low pressurizer pressure SI blocked");
			}
			case STEAMLINE_SI_BLOCK -> {
				if (m.sgPressure() > 5.0) {
					return Result.blocked("Steam pressure must be below 5.0 MPa to block");
				}
				m.steamlineSiBlocked = true;
				return Result.ok("Low steam line pressure SI blocked");
			}
			case SPRAY_RESET -> {
				if (m.containmentPressure > 250) {
					return Result.blocked("Hi-3 containment pressure still present");
				}
				m.containmentSprayActuated = false;
				return Result.ok("Containment spray signal reset");
			}
			case RHR_COOLDOWN_ON -> {
				if (m.rcsPressure > 3.0) {
					return Result.blocked(String.format("RHR suction interlock: RCS pressure %.2f MPa above 3.0", m.rcsPressure));
				}
				if (m.rcsTavg > 177) {
					return Result.blocked(String.format("RHR entry: RCS temperature %.0f C above 177", m.rcsTavg));
				}
				m.rhrCooldown = true;
				m.eq(EquipmentId.RHR_A).demanded = true;
				return Result.ok("RHR aligned for shutdown cooling");
			}
			case RHR_COOLDOWN_OFF -> {
				m.rhrCooldown = false;
				return Result.ok("RHR shutdown cooling secured");
			}
			case RECIRC_SWITCHOVER -> {
				if (m.recirculationMode) {
					return Result.blocked("Already in recirculation");
				}
				if (m.sumpMass < 300_000) {
					return Result.blocked("Containment sump level insufficient for recirculation");
				}
				m.recirculationMode = true;
				return Result.ok("ECCS aligned to containment sump recirculation");
			}
			case LETDOWN_ON -> {
				if (m.phaseAIsolation) {
					return Result.blocked("Containment isolation phase A present");
				}
				m.letdownInService = true;
				return Result.ok("Letdown restored");
			}
			case LETDOWN_OFF -> {
				m.letdownInService = false;
				return Result.ok("Letdown isolated");
			}
			case IGNITERS_ON -> {
				m.ignitersOn = true;
				m.eq(EquipmentId.IGNITERS).demanded = true;
				return Result.ok("Hydrogen igniters energised");
			}
			case IGNITERS_OFF -> {
				m.ignitersOn = false;
				m.eq(EquipmentId.IGNITERS).demanded = false;
				return Result.ok("Hydrogen igniters off");
			}
			case VENT_OPEN -> {
				if (!m.dcAvailable()) {
					return Result.blocked("Vent valve actuators need DC power");
				}
				m.filteredVentOpen = true;
				return Result.ok("Filtered containment vent OPEN");
			}
			case VENT_CLOSE -> {
				m.filteredVentOpen = false;
				return Result.ok("Filtered containment vent CLOSED");
			}
			case SFP_MAKEUP_ON -> {
				m.sfpMakeup = true;
				return Result.ok("Spent fuel pool makeup from ESW aligned");
			}
			case SFP_MAKEUP_OFF -> {
				m.sfpMakeup = false;
				return Result.ok("Spent fuel pool makeup secured");
			}
			case ALARM_ACK -> {
				m.alarms.acknowledgeAll();
				return Result.ok("Alarms acknowledged");
			}
			case ALARM_RESET -> {
				m.alarms.resetCleared();
				return Result.ok("Cleared alarms reset");
			}
			case ALARM_SILENCE -> {
				m.alarms.silenceHorn();
				return Result.ok("Horn silenced");
			}
		}
		return Result.blocked("Unsupported command");
	}

	private static Result startStop(PlantModel m, EquipmentId id, boolean start) {
		Equipment e = m.eq(id);
		switch (id.kind) {
			case PUMP, FAN, HEATER, STRUCTURE -> {
			}
			default -> {
				return Result.blocked(id.label + " is not operated from this panel");
			}
		}
		if (start) {
			if (e.failed) {
				return Result.blocked(id.label + " is FAILED (" + e.failureCause + ") - repair at local station");
			}
			if (!m.live(id.bus) && id.bus != Bus.NONE) {
				return Result.blocked(id.label + ": " + id.bus.label + " de-energised");
			}
			if (id.name().startsWith("RCP")) {
				if (m.rcsPressure < 2.2) {
					return Result.blocked("RCP start requires RCS pressure above 2.2 MPa (seal differential)");
				}
				if (!m.eq(EquipmentId.CHG_A).running && !m.eq(EquipmentId.CHG_B).running && !m.ccwAvailable) {
					return Result.blocked("RCP start requires seal injection or CCW to thermal barrier");
				}
				if (m.sealCoolingLostTime > 600) {
					return Result.blocked("RCP seals overheated - restart prohibited until seals inspected");
				}
			}
			if ((id == EquipmentId.MFW_A || id == EquipmentId.MFW_B) && !m.condenserAvailable()) {
				return Result.blocked("Main feed pumps need condensate: condenser not available");
			}
			if ((id == EquipmentId.MFW_A || id == EquipmentId.MFW_B) && m.mfwIsolated) {
				return Result.blocked("Feedwater isolation in effect - reset first");
			}
			if (id == EquipmentId.TDAFW && m.sgPressure() < 0.8) {
				return Result.blocked("Insufficient steam pressure to drive TDAFW turbine");
			}
			e.demanded = true;
			return Result.ok(id.label + " START");
		}
		if (m.siActuated && (id == EquipmentId.SI_A || id == EquipmentId.SI_B || id == EquipmentId.CHG_A
			|| id == EquipmentId.CHG_B || id == EquipmentId.RHR_A || id == EquipmentId.RHR_B)) {
			return Result.blocked("SI signal present - reset SI before stopping ECCS pumps");
		}
		e.demanded = false;
		return Result.ok(id.label + " STOP");
	}

	/**
	 * Repair performed at a local maintenance station with the correct spare part.
	 * Clears failures and restores the condition of the equipment.
	 */
	public static Result repair(PlantModel m, EquipmentId id) {
		Equipment e = m.eq(id);
		boolean wasFailed = e.failed;
		double before = e.condition;
		e.repair();
		if (id.kind == EquipmentId.Kind.INSTRUMENT) {
			m.sensors.clearChannel(id.ordinal() - EquipmentId.INSTR_A.ordinal());
		}
		if (id == EquipmentId.PORV_1) {
			m.porvStuckOpen[0] = false;
		}
		if (id == EquipmentId.PORV_2) {
			m.porvStuckOpen[1] = false;
		}
		if (id == EquipmentId.INTAKE_SCREENS) {
			m.screenFouling = 0;
		}
		if (id == EquipmentId.RCP_A || id == EquipmentId.RCP_B || id == EquipmentId.RCP_C || id == EquipmentId.RCP_D) {
			m.sealCoolingLostTime = 0;
		}
		if (id == EquipmentId.EDG_A) {
			m.edgFuel[0] = 1.0;
		}
		if (id == EquipmentId.EDG_B) {
			m.edgFuel[1] = 1.0;
		}
		m.alarms.log(m.time, 3, String.format("MAINT  %s %s (condition %.0f%% -> 100%%)", id.label, wasFailed ? "repaired" : "serviced", before * 100));
		m.pendingEvents.add(new PlantEvent(PlantEvent.Type.EQUIPMENT_REPAIRED, id, before));
		return Result.ok(id.label + (wasFailed ? " repaired and returned to service" : " serviced"));
	}

	/** Cleans the intake screens without parts (slower, partial). */
	public static Result cleanScreens(PlantModel m) {
		m.screenFouling = Math.max(0, m.screenFouling - 0.35);
		return Result.ok(String.format("Intake screens washed - fouling %.0f%%", m.screenFouling * 100));
	}
}
