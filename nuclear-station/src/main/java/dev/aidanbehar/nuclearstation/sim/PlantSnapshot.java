package dev.aidanbehar.nuclearstation.sim;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Immutable view of the plant sent to clients. Values shown on control panels come
 * from instrumentation: if both DC buses are lost, indications go blank ("instruments
 * dead") even though the simulation continues on the server.
 */
public final class PlantSnapshot {
	public static final int EQ_STOPPED = 0;
	public static final int EQ_RUNNING = 1;
	public static final int EQ_FAILED = 2;
	public static final int EQ_NO_POWER = 3;
	public static final int EQ_COASTING = 4;

	public final double[] values = new double[Readout.values().length];
	public final byte[] equipmentState = new byte[EquipmentId.values().length];
	public final byte[] equipmentCondition = new byte[EquipmentId.values().length];
	public final byte[] alarmState = new byte[AlarmId.values().length];
	public final float[][] channels = new float[SensorId.values().length][4];
	public final byte[][] channelFault = new byte[SensorId.values().length][4];
	public final byte[] busLive = new byte[Bus.values().length];
	public final String[] busSource = new String[Bus.values().length];
	public final List<AlarmSystem.LogEntry> log = new ArrayList<>();
	public int flags;
	public String tripCause = "";
	public String rodBlock = "";
	public boolean instrumentsDead;

	public static final int F_TRIPPED = 1;
	public static final int F_ROD_AUTO = 1 << 1;
	public static final int F_TURBINE_LATCHED = 1 << 2;
	public static final int F_GEN_BREAKER = 1 << 3;
	public static final int F_GRID = 1 << 4;
	public static final int F_OFFSITE_BREAKER = 1 << 5;
	public static final int F_SI = 1 << 6;
	public static final int F_SI_BLOCKED = 1 << 7;
	public static final int F_SPRAY_ACT = 1 << 8;
	public static final int F_RHR_COOLDOWN = 1 << 9;
	public static final int F_RECIRC = 1 << 10;
	public static final int F_MSIV = 1 << 11;
	public static final int F_FEED_AUTO = 1 << 12;
	public static final int F_MFW_ISOLATED = 1 << 13;
	public static final int F_DUMPS_ARMED = 1 << 14;
	public static final int F_ADV_AUTO = 1 << 15;
	public static final int F_PORV1 = 1 << 16;
	public static final int F_PORV2 = 1 << 17;
	public static final int F_PORV1_BLOCK = 1 << 18;
	public static final int F_PORV2_BLOCK = 1 << 19;
	public static final int F_HEATERS_AUTO = 1 << 20;
	public static final int F_SPRAY_AUTO = 1 << 21;
	public static final int F_IGNITERS = 1 << 22;
	public static final int F_VENT = 1 << 23;
	public static final int F_HORN = 1 << 24;
	public static final int F_AFW_ESW = 1 << 25;
	public static final int F_LETDOWN = 1 << 26;
	public static final int F_SFP_MAKEUP = 1 << 27;
	public static final int F_VESSEL_FAILED = 1 << 28;
	public static final int F_RUNBACK = 1 << 29;
	public static final int F_STEAMLINE_SI_BLOCKED = 1 << 30;

	public double get(Readout r) {
		return values[r.ordinal()];
	}

	public boolean flag(int f) {
		return (flags & f) != 0;
	}

	public static PlantSnapshot capture(PlantModel m) {
		PlantSnapshot s = new PlantSnapshot();
		boolean instruments = m.dcAvailable();
		s.instrumentsDead = !instruments;
		double n = m.kinetics.power();
		set(s, Readout.SIM_TIME, m.time);
		set(s, Readout.NEUTRON_POWER, n * 100);
		set(s, Readout.THERMAL_POWER, m.coreHeatToCoolant);
		set(s, Readout.DECAY_HEAT, m.totalDecayFraction() * PlantModel.P_NOM);
		set(s, Readout.STARTUP_RATE, m.kinetics.startupRate());
		set(s, Readout.LOG_POWER, Math.log10(Math.max(n, 1e-12)));
		set(s, Readout.REACTIVITY, m.reactivity() * 1e5);
		set(s, Readout.RHO_RODS, m.rodReactivity() * 1e5);
		set(s, Readout.RHO_BORON, m.boronReactivity(m.boronPpm) * 1e5);
		set(s, Readout.RHO_DOPPLER, m.dopplerReactivity() * 1e5);
		set(s, Readout.RHO_MODERATOR, m.moderatorReactivity(m.boronPpm) * 1e5);
		set(s, Readout.RHO_XENON, m.xenonReactivity() * 1e5);
		set(s, Readout.RHO_FUEL, (m.fuelExcessReactivity() + m.geometryReactivity()) * 1e5);
		set(s, Readout.MTC, m.moderatorCoefficient(m.boronPpm) * 1e5);
		set(s, Readout.BORON, m.boronPpm);
		set(s, Readout.BORON_TARGET, Double.isNaN(m.boronTarget) ? m.boronPpm : m.boronTarget);
		set(s, Readout.XENON, m.xenon);
		set(s, Readout.IODINE, m.iodine * PlantModel.XE_LAMBDA_I / (PlantModel.XE_SOURCE * 0.953));
		set(s, Readout.BURNUP, m.burnup * 100);
		set(s, Readout.SHUTDOWN_BANKS, m.shutdownBanks);
		set(s, Readout.CONTROL_GROUP, m.controlBanks);
		set(s, Readout.BANK_A, PlantModel.bankPosition(m.controlBanks, 0));
		set(s, Readout.BANK_B, PlantModel.bankPosition(m.controlBanks, 1));
		set(s, Readout.BANK_C, PlantModel.bankPosition(m.controlBanks, 2));
		set(s, Readout.BANK_D, PlantModel.bankPosition(m.controlBanks, 3));
		set(s, Readout.FUEL_TEMP, m.fuelTemp);
		set(s, Readout.PEAK_CLAD, m.peakClad);
		set(s, Readout.DNBR, Math.min(m.dnbr, 9.99));
		set(s, Readout.T_HOT, m.tHot);
		set(s, Readout.T_COLD, m.tCold);
		set(s, Readout.T_AVG, m.rcsTavg);
		set(s, Readout.T_REF, m.tref());
		set(s, Readout.RCS_PRESSURE, m.rcsPressure);
		set(s, Readout.PZR_LEVEL, m.pzrLevel);
		set(s, Readout.PZR_HEATERS, m.pzrHeaterMW);
		set(s, Readout.PZR_SPRAY, m.sprayFraction * 100);
		set(s, Readout.SUBCOOLING, m.subcooling);
		set(s, Readout.RCS_FLOW, m.rcsFlow * 100);
		set(s, Readout.RCS_INVENTORY, m.rcsMass / PlantModel.RCS_MASS_NOM * 100);
		set(s, Readout.VOID_FRACTION, m.voidFraction * 100);
		set(s, Readout.CORE_COVERED, m.coreCovered * 100);
		set(s, Readout.CHARGING, m.chargingFlow);
		set(s, Readout.SI_FLOW, m.siFlow);
		set(s, Readout.LEAK_FLOW, m.sealLeak + 40_000 * m.breakArea * Math.sqrt(Math.max(0, m.rcsPressure) / 15.5));
		set(s, Readout.RWST, m.rwstMass / PlantModel.RWST_CAPACITY * 100);
		set(s, Readout.ACCUMULATORS, m.accumulatorMass / PlantModel.ACCUMULATOR_CAPACITY * 100);
		set(s, Readout.SUMP, m.sumpMass / 1000);
		set(s, Readout.SG_PRESSURE, m.sgPressure());
		set(s, Readout.SG_LEVEL_NR, m.sgNarrowRange());
		set(s, Readout.SG_LEVEL_WR, m.sgWideRange());
		set(s, Readout.STEAM_TURBINE, m.steamTurbine);
		set(s, Readout.STEAM_DUMP, m.steamDump);
		set(s, Readout.STEAM_ADV, m.steamAdv + m.steamSafety);
		set(s, Readout.FEED_FLOW, m.feedFlow);
		set(s, Readout.MFW_FLOW, m.mfwFlow);
		set(s, Readout.AFW_FLOW, m.afwFlow);
		set(s, Readout.FEED_TEMP, m.feedTemp);
		set(s, Readout.CST, m.cstMass / PlantModel.CST_CAPACITY * 100);
		set(s, Readout.ADV_POSITION, m.advPosition * 100);
		set(s, Readout.TURBINE_SPEED, m.turbineSpeed);
		set(s, Readout.SPEED_SETPOINT, m.speedSetpoint);
		set(s, Readout.GOVERNOR, m.governor * 100);
		set(s, Readout.TURBINE_MECH, m.turbineMechMW);
		set(s, Readout.GENERATOR, m.generatorMW);
		set(s, Readout.LOAD_SETPOINT, m.loadSetpoint);
		set(s, Readout.LOAD_RAMPED, m.loadRamped);
		set(s, Readout.RAMP_RATE, m.rampRate * 60);
		set(s, Readout.HOUSE_LOAD, m.houseLoad);
		set(s, Readout.NET_OUTPUT, m.netOutput);
		set(s, Readout.GRID_DEMAND, m.gridDemand);
		set(s, Readout.VIBRATION, m.vibration);
		set(s, Readout.GSU_TEMP, m.gsuTemp);
		set(s, Readout.CONDENSER_PRESSURE, m.condenserPressure);
		set(s, Readout.CONDENSER_TEMP, m.condenserTemp);
		set(s, Readout.CW_FLOW, m.cwFlow * 100);
		set(s, Readout.CW_OUTLET, m.cwOutletTemp);
		set(s, Readout.DISCHARGE_TEMP, m.dischargeTemp);
		set(s, Readout.SEA_TEMP, m.lastEnvironment().seaTemperature);
		set(s, Readout.TOWER_HEAT, m.towerHeatRejection());
		set(s, Readout.SCREEN_FOULING, m.screenFouling * 100);
		set(s, Readout.BUS_NS1_LOAD, m.busLoad.get(Bus.NS1));
		set(s, Readout.BUS_NS2_LOAD, m.busLoad.get(Bus.NS2));
		set(s, Readout.BUS_SA_LOAD, m.busLoad.get(Bus.SA));
		set(s, Readout.BUS_SB_LOAD, m.busLoad.get(Bus.SB));
		set(s, Readout.EDG_A_FUEL, m.edgFuel[0] * 100);
		set(s, Readout.EDG_B_FUEL, m.edgFuel[1] * 100);
		set(s, Readout.EDG_A_TIMER, Math.max(0, m.edgStartTimer[0]));
		set(s, Readout.EDG_B_TIMER, Math.max(0, m.edgStartTimer[1]));
		set(s, Readout.BATTERY_A, m.batteryCharge[0] * 100);
		set(s, Readout.BATTERY_B, m.batteryCharge[1] * 100);
		set(s, Readout.CONT_PRESSURE, m.containmentPressure);
		set(s, Readout.CONT_TEMP, m.containmentTemp);
		set(s, Readout.CONT_HYDROGEN, m.hydrogenFraction() * 100);
		set(s, Readout.CONT_INTEGRITY, m.containmentIntegrity * 100);
		set(s, Readout.CONT_DOSE, m.containmentDoseRate());
		set(s, Readout.AIRBORNE, m.airborneActivity * 100);
		set(s, Readout.RELEASE_RATE, m.releaseRate * 3600 * 100);
		set(s, Readout.RELEASE_TOTAL, m.totalEnvironmentalRelease * 100);
		set(s, Readout.OXIDATION, m.oxidation * 100);
		set(s, Readout.HYDROGEN_MASS, m.hydrogenKg);
		set(s, Readout.CORE_DAMAGE, m.coreDamage * 100);
		set(s, Readout.CORE_MELT, m.coreMelt * 100);
		set(s, Readout.LOWER_HEAD_TEMP, m.lowerHeadTemp);
		set(s, Readout.BASEMAT_EROSION, m.basematErosion);
		set(s, Readout.SFP_TEMP, m.sfpTemp);
		set(s, Readout.SFP_LEVEL, m.sfpLevel * 100);
		set(s, Readout.CCW_TEMP, m.ccwTemp);

		if (!instruments) {
			// Plant computer and indicators are DC powered; only the simulation clock continues.
			for (Readout r : Readout.values()) {
				if (r != Readout.SIM_TIME) {
					s.values[r.ordinal()] = Double.NaN;
				}
			}
		} else {
			// Protection-grade indications come from the four instrument channels.
			s.values[Readout.NEUTRON_POWER.ordinal()] = m.sensors.indicated(SensorId.POWER_RANGE);
			s.values[Readout.RCS_PRESSURE.ordinal()] = m.sensors.indicated(SensorId.PZR_PRESSURE);
			s.values[Readout.RCS_FLOW.ordinal()] = m.sensors.indicated(SensorId.RCS_FLOW);
			s.values[Readout.SG_LEVEL_NR.ordinal()] = m.sensors.indicated(SensorId.SG_LEVEL);
			s.values[Readout.T_HOT.ordinal()] = m.sensors.indicated(SensorId.T_HOT);
			s.values[Readout.CONT_PRESSURE.ordinal()] = m.sensors.indicated(SensorId.CONT_PRESSURE);
		}

		for (EquipmentId id : EquipmentId.values()) {
			Equipment e = m.eq(id);
			int st;
			if (e.failed) {
				st = EQ_FAILED;
			} else if (e.running) {
				st = EQ_RUNNING;
			} else if (e.speed > 0.05) {
				st = EQ_COASTING;
			} else if (e.demanded && !m.live(id.bus)) {
				st = EQ_NO_POWER;
			} else {
				st = EQ_STOPPED;
			}
			if (id.kind == EquipmentId.Kind.ELECTRICAL || id.kind == EquipmentId.Kind.BATTERY || id.kind == EquipmentId.Kind.INSTRUMENT || id.kind == EquipmentId.Kind.VALVE) {
				st = e.failed ? EQ_FAILED : EQ_RUNNING;
			}
			s.equipmentState[id.ordinal()] = (byte) st;
			s.equipmentCondition[id.ordinal()] = (byte) Math.round(e.condition * 100);
		}
		for (AlarmId id : AlarmId.values()) {
			s.alarmState[id.ordinal()] = (byte) m.alarms.state(id).ordinal();
		}
		for (SensorId id : SensorId.values()) {
			for (int ch = 0; ch < 4; ch++) {
				s.channels[id.ordinal()][ch] = (float) m.sensors.channel(id, ch);
				s.channelFault[id.ordinal()][ch] = (byte) m.sensors.fault(id, ch).ordinal();
			}
		}
		for (Bus b : Bus.values()) {
			s.busLive[b.ordinal()] = (byte) (m.live(b) ? 1 : 0);
			s.busSource[b.ordinal()] = m.busSource.getOrDefault(b, "");
		}
		s.log.addAll(m.alarms.recentLog(40));
		int f = 0;
		f |= m.reactorTripped ? F_TRIPPED : 0;
		f |= m.rodAuto ? F_ROD_AUTO : 0;
		f |= m.turbineLatched ? F_TURBINE_LATCHED : 0;
		f |= m.generatorBreaker ? F_GEN_BREAKER : 0;
		f |= m.gridAvailable ? F_GRID : 0;
		f |= m.offsiteBreakerClosed ? F_OFFSITE_BREAKER : 0;
		f |= m.siActuated ? F_SI : 0;
		f |= m.siBlocked ? F_SI_BLOCKED : 0;
		f |= m.containmentSprayActuated ? F_SPRAY_ACT : 0;
		f |= m.rhrCooldown ? F_RHR_COOLDOWN : 0;
		f |= m.recirculationMode ? F_RECIRC : 0;
		f |= m.msivOpen ? F_MSIV : 0;
		f |= m.feedAuto ? F_FEED_AUTO : 0;
		f |= m.mfwIsolated ? F_MFW_ISOLATED : 0;
		f |= m.steamDumpArmed ? F_DUMPS_ARMED : 0;
		f |= m.advAuto ? F_ADV_AUTO : 0;
		f |= m.porvOpen[0] ? F_PORV1 : 0;
		f |= m.porvOpen[1] ? F_PORV2 : 0;
		f |= m.porvBlockOpen[0] ? F_PORV1_BLOCK : 0;
		f |= m.porvBlockOpen[1] ? F_PORV2_BLOCK : 0;
		f |= m.pzrHeatersAuto ? F_HEATERS_AUTO : 0;
		f |= m.sprayAuto ? F_SPRAY_AUTO : 0;
		f |= m.ignitersOn ? F_IGNITERS : 0;
		f |= m.filteredVentOpen ? F_VENT : 0;
		f |= m.alarms.hornActive() ? F_HORN : 0;
		f |= m.afwFromEsw ? F_AFW_ESW : 0;
		f |= m.letdownInService ? F_LETDOWN : 0;
		f |= m.sfpMakeup ? F_SFP_MAKEUP : 0;
		f |= m.vesselFailed ? F_VESSEL_FAILED : 0;
		f |= m.runbackActive ? F_RUNBACK : 0;
		f |= m.steamlineSiBlocked ? F_STEAMLINE_SI_BLOCKED : 0;
		s.flags = f;
		s.tripCause = m.tripCause;
		String block = m.rodWithdrawalBlocked();
		s.rodBlock = block == null ? "" : block;
		return s;
	}

	private static void set(PlantSnapshot s, Readout r, double v) {
		s.values[r.ordinal()] = v;
	}

	public byte[] encode() {
		try {
			ByteArrayOutputStream bytes = new ByteArrayOutputStream(4096);
			DataOutputStream out = new DataOutputStream(bytes);
			out.writeInt(values.length);
			for (double v : values) {
				out.writeFloat((float) v);
			}
			out.writeInt(equipmentState.length);
			out.write(equipmentState);
			out.write(equipmentCondition);
			out.writeInt(alarmState.length);
			out.write(alarmState);
			for (int i = 0; i < channels.length; i++) {
				for (int ch = 0; ch < 4; ch++) {
					out.writeFloat(channels[i][ch]);
					out.writeByte(channelFault[i][ch]);
				}
			}
			for (int i = 0; i < busLive.length; i++) {
				out.writeByte(busLive[i]);
				out.writeUTF(busSource[i] == null ? "" : busSource[i]);
			}
			out.writeInt(flags);
			out.writeBoolean(instrumentsDead);
			out.writeUTF(tripCause);
			out.writeUTF(rodBlock);
			out.writeShort(log.size());
			for (AlarmSystem.LogEntry e : log) {
				out.writeDouble(e.time());
				out.writeByte(e.priority());
				out.writeUTF(e.text().length() > 200 ? e.text().substring(0, 200) : e.text());
			}
			out.flush();
			return bytes.toByteArray();
		} catch (IOException e) {
			throw new IllegalStateException(e);
		}
	}

	public static PlantSnapshot decode(byte[] data) {
		PlantSnapshot s = new PlantSnapshot();
		try (DataInputStream in = new DataInputStream(new ByteArrayInputStream(data))) {
			int nv = in.readInt();
			for (int i = 0; i < nv; i++) {
				float v = in.readFloat();
				if (i < s.values.length) {
					s.values[i] = v;
				}
			}
			int ne = in.readInt();
			byte[] st = new byte[ne];
			byte[] cond = new byte[ne];
			in.readFully(st);
			in.readFully(cond);
			System.arraycopy(st, 0, s.equipmentState, 0, Math.min(ne, s.equipmentState.length));
			System.arraycopy(cond, 0, s.equipmentCondition, 0, Math.min(ne, s.equipmentCondition.length));
			int na = in.readInt();
			byte[] al = new byte[na];
			in.readFully(al);
			System.arraycopy(al, 0, s.alarmState, 0, Math.min(na, s.alarmState.length));
			for (int i = 0; i < s.channels.length; i++) {
				for (int ch = 0; ch < 4; ch++) {
					s.channels[i][ch] = in.readFloat();
					s.channelFault[i][ch] = in.readByte();
				}
			}
			for (int i = 0; i < s.busLive.length; i++) {
				s.busLive[i] = in.readByte();
				s.busSource[i] = in.readUTF();
			}
			s.flags = in.readInt();
			s.instrumentsDead = in.readBoolean();
			s.tripCause = in.readUTF();
			s.rodBlock = in.readUTF();
			int nl = in.readShort();
			for (int i = 0; i < nl; i++) {
				s.log.add(new AlarmSystem.LogEntry(in.readDouble(), in.readByte(), in.readUTF()));
			}
		} catch (IOException e) {
			throw new IllegalStateException("Malformed plant snapshot", e);
		}
		return s;
	}
}
