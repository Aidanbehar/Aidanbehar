package dev.aidanbehar.nuclearstation.client.screen;

import dev.aidanbehar.nuclearstation.client.ClientPlantState;
import dev.aidanbehar.nuclearstation.network.Payloads;
import dev.aidanbehar.nuclearstation.sim.AlarmId;
import dev.aidanbehar.nuclearstation.sim.AlarmSystem;
import dev.aidanbehar.nuclearstation.sim.Bus;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import dev.aidanbehar.nuclearstation.sim.PlantCommand;
import dev.aidanbehar.nuclearstation.sim.PlantSnapshot;
import dev.aidanbehar.nuclearstation.sim.Readout;
import dev.aidanbehar.nuclearstation.sim.SensorId;
import java.util.ArrayList;
import java.util.List;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;

/**
 * The main control room interface. Every value comes from the server snapshot (which is
 * built from instrumentation, so indications fail when DC power is lost), and every
 * control sends a command that the server validates against interlocks.
 */
public final class ControlRoomScreen extends Screen {
	static final int BG = 0xF0101418;
	static final int PANEL = 0xFF1B2128;
	static final int PANEL_EDGE = 0xFF3A4652;
	static final int TEXT = 0xFFD8E0E8;
	static final int DIM = 0xFF7D8A96;
	static final int GREEN = 0xFF3DDC84;
	static final int AMBER = 0xFFFFB020;
	static final int RED = 0xFFFF4040;
	static final int BLUE = 0xFF4DA6FF;
	static final int CYAN = 0xFF40E0E0;

	enum Tab {
		OVERVIEW("Overview"), REACTOR("Reactor"), PRIMARY("Primary"), SECONDARY("Secondary"), TURBINE("Turbine/CW"),
		ELECTRICAL("Electrical"), SAFETY("Safety"), ALARMS("Alarms & Log");

		final String label;

		Tab(String label) {
			this.label = label;
		}
	}

	private record Hit(int x0, int y0, int x1, int y1, Runnable action) {
	}

	private final List<Hit> hits = new ArrayList<>();
	private Tab tab = Tab.OVERVIEW;
	private int frame;
	private int logScroll;

	public ControlRoomScreen() {
		super(Component.translatable("screen.nuclearstation.control_room"));
	}

	@Override
	public boolean isPauseScreen() {
		return false;
	}

	@Override
	public void onClose() {
		ClientPlayNetworking.send(new Payloads.CloseScreen());
		super.onClose();
	}

	@Override
	public boolean mouseClicked(MouseButtonEvent event, boolean doubleClick) {
		if (event.button() == 0) {
			for (Hit h : hits) {
				if (event.x() >= h.x0 && event.x() < h.x1 && event.y() >= h.y0 && event.y() < h.y1) {
					h.action.run();
					return true;
				}
			}
		}
		return super.mouseClicked(event, doubleClick);
	}

	@Override
	public boolean mouseScrolled(double x, double y, double scrollX, double scrollY) {
		if (tab == Tab.ALARMS) {
			logScroll = Math.max(0, logScroll + (scrollY > 0 ? 1 : -1));
			return true;
		}
		return super.mouseScrolled(x, y, scrollX, scrollY);
	}

	private static void send(PlantCommand command, int index, double value) {
		ClientPlayNetworking.send(new Payloads.Command(command.ordinal(), index, value));
	}

	private static void send(PlantCommand command) {
		send(command, 0, 0);
	}

	// ================================================================== drawing helpers

	private void text(GuiGraphicsExtractor g, String s, int x, int y, int colour) {
		g.text(font, s, x, y, colour, false);
	}

	private void box(GuiGraphicsExtractor g, int x, int y, int w, int h) {
		g.fill(x, y, x + w, y + h, PANEL);
		g.outline(x, y, w, h, PANEL_EDGE);
	}

	private void button(GuiGraphicsExtractor g, int x, int y, int w, String label, int colour, Runnable action) {
		int h = 12;
		g.fill(x, y, x + w, y + h, 0xFF26303A);
		g.outline(x, y, w, h, colour);
		int tw = font.width(label);
		text(g, label, x + (w - tw) / 2, y + 2, colour);
		hits.add(new Hit(x, y, x + w, y + h, action));
	}

	private void cmd(GuiGraphicsExtractor g, int x, int y, int w, String label, PlantCommand c, int index, double value) {
		button(g, x, y, w, label, TEXT, () -> send(c, index, value));
	}

	private void cmd(GuiGraphicsExtractor g, int x, int y, int w, String label, PlantCommand c) {
		cmd(g, x, y, w, label, c, 0, 0);
	}

	/** Labelled readout; returns the next y. */
	private int value(GuiGraphicsExtractor g, PlantSnapshot s, Readout r, int x, int y, int labelWidth) {
		double v = s.get(r);
		text(g, r.label, x, y, DIM);
		String str = r.format(v) + (Double.isNaN(v) ? "" : " " + r.unit);
		text(g, str, x + labelWidth, y, Double.isNaN(v) ? DIM : colourFor(r, v));
		return y + 10;
	}

	private int values(GuiGraphicsExtractor g, PlantSnapshot s, int x, int y, int labelWidth, Readout... readouts) {
		for (Readout r : readouts) {
			y = value(g, s, r, x, y, labelWidth);
		}
		return y;
	}

	private static int colourFor(Readout r, double v) {
		return switch (r) {
			case RCS_PRESSURE -> v > 16.2 || v < 14.5 ? AMBER : GREEN;
			case SUBCOOLING -> v < 10 ? RED : (v < 20 ? AMBER : GREEN);
			case PZR_LEVEL -> v < 17 || v > 80 ? AMBER : GREEN;
			case SG_LEVEL_NR -> v < 25 || v > 75 ? AMBER : GREEN;
			case PEAK_CLAD -> v > 1200 ? RED : (v > 650 ? AMBER : GREEN);
			case DNBR -> v < 1.3 ? RED : GREEN;
			case CORE_DAMAGE, CORE_MELT -> v > 0.01 ? RED : GREEN;
			case CONT_PRESSURE -> v > 125 ? RED : GREEN;
			case CONT_HYDROGEN -> v > 4 ? RED : GREEN;
			case CONT_INTEGRITY -> v < 90 ? RED : GREEN;
			case CONDENSER_PRESSURE -> v > 15 ? AMBER : GREEN;
			case BATTERY_A, BATTERY_B, EDG_A_FUEL, EDG_B_FUEL, CST, RWST -> v < 25 ? AMBER : GREEN;
			case STARTUP_RATE -> v > 1 ? AMBER : CYAN;
			case RELEASE_RATE -> v > 0 ? RED : GREEN;
			case VIBRATION -> v > 125 ? AMBER : GREEN;
			case GSU_TEMP -> v > 95 ? AMBER : GREEN;
			case SFP_TEMP -> v > 60 ? AMBER : GREEN;
			default -> TEXT;
		};
	}

	/** Equipment status tile; clicking starts or stops it. */
	private void equipment(GuiGraphicsExtractor g, PlantSnapshot s, EquipmentId id, String label, int x, int y, int w) {
		int st = s.equipmentState[id.ordinal()];
		int cond = s.equipmentCondition[id.ordinal()];
		int colour = switch (st) {
			case PlantSnapshot.EQ_RUNNING -> GREEN;
			case PlantSnapshot.EQ_FAILED -> RED;
			case PlantSnapshot.EQ_NO_POWER -> AMBER;
			case PlantSnapshot.EQ_COASTING -> 0xFF9ACD32;
			default -> DIM;
		};
		if (st == PlantSnapshot.EQ_FAILED && frame % 20 < 10) {
			colour = 0xFF801010;
		}
		g.fill(x, y, x + w, y + 20, 0xFF20262E);
		g.outline(x, y, w, 20, colour);
		text(g, label, x + 3, y + 2, colour);
		String state = switch (st) {
			case PlantSnapshot.EQ_RUNNING -> "RUN";
			case PlantSnapshot.EQ_FAILED -> "FAIL";
			case PlantSnapshot.EQ_NO_POWER -> "NO PWR";
			case PlantSnapshot.EQ_COASTING -> "COAST";
			default -> "STOP";
		};
		text(g, state + " " + cond + "%", x + 3, y + 11, DIM);
		hits.add(new Hit(x, y, x + w, y + 20, () -> send(st == PlantSnapshot.EQ_RUNNING || st == PlantSnapshot.EQ_COASTING
			? PlantCommand.EQUIP_STOP : PlantCommand.EQUIP_START, id.ordinal(), 0)));
	}

	private void lamp(GuiGraphicsExtractor g, int x, int y, boolean on, int colour, String label) {
		g.fill(x, y, x + 8, y + 8, on ? colour : 0xFF303840);
		g.outline(x, y, 8, 8, PANEL_EDGE);
		text(g, label, x + 11, y, on ? TEXT : DIM);
	}

	private void bar(GuiGraphicsExtractor g, int x, int y, int w, int h, double fraction, int colour, String label) {
		g.fill(x, y, x + w, y + h, 0xFF101418);
		int filled = (int) Math.round(h * Math.max(0, Math.min(1, fraction)));
		g.fill(x, y + h - filled, x + w, y + h, colour);
		g.outline(x, y, w, h, PANEL_EDGE);
		int tw = font.width(label);
		text(g, label, x + (w - tw) / 2, y + h + 2, DIM);
	}

	private void channels(GuiGraphicsExtractor g, PlantSnapshot s, SensorId id, int x, int y) {
		text(g, id.label + " (" + id.unit + ")", x, y, DIM);
		for (int ch = 0; ch < 4; ch++) {
			float v = s.channels[id.ordinal()][ch];
			int fault = s.channelFault[id.ordinal()][ch];
			String str = Float.isNaN(v) ? "FAIL" : String.format(v > 100 ? "%.0f" : "%.2f", v);
			text(g, new String[] {"I", "II", "III", "IV"}[ch] + ":" + str, x + ch * 52, y + 10, Float.isNaN(v) ? RED : (fault != 0 ? AMBER : TEXT));
		}
	}

	// ================================================================== screen

	@Override
	public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float partial) {
		frame++;
		hits.clear();
		g.fill(0, 0, width, height, BG);
		PlantSnapshot s = ClientPlantState.snapshot;
		int x0 = 6;
		int y0 = 4;
		text(g, "MERIDIAN POINT NGS  -  UNIT 1 MAIN CONTROL ROOM", x0, y0, CYAN);
		if (s == null) {
			text(g, "Waiting for plant computer...", x0, y0 + 20, DIM);
			super.extractRenderState(g, mouseX, mouseY, partial);
			return;
		}
		boolean stale = System.currentTimeMillis() - ClientPlantState.snapshotTime > 3000;
		double t = s.get(Readout.SIM_TIME);
		String clock = String.format("T+%02d:%02d:%02d", (long) t / 3600, ((long) t / 60) % 60, (long) t % 60);
		text(g, clock + (stale ? "  (LINK LOST)" : ""), width - 6 - font.width(clock) - (stale ? 80 : 0), y0, stale ? RED : DIM);
		// status banner
		int by = y0 + 12;
		boolean tripped = s.flag(PlantSnapshot.F_TRIPPED);
		String banner = tripped ? "REACTOR TRIPPED: " + s.tripCause.toUpperCase() : String.format("REACTOR AT POWER  %.1f%%", s.get(Readout.NEUTRON_POWER));
		g.fill(x0, by, width - 6, by + 12, tripped ? 0xFF501010 : 0xFF103020);
		text(g, banner, x0 + 4, by + 2, tripped ? RED : GREEN);
		if (s.instrumentsDead) {
			text(g, "NO DC POWER - INDICATIONS LOST", x0 + 230, by + 2, frame % 30 < 15 ? RED : AMBER);
		}
		boolean horn = s.flag(PlantSnapshot.F_HORN);
		button(g, width - 6 - 150, by, 48, "ACK", horn && frame % 20 < 10 ? RED : TEXT, () -> send(PlantCommand.ALARM_ACK));
		button(g, width - 6 - 100, by, 48, "SILENCE", TEXT, () -> send(PlantCommand.ALARM_SILENCE));
		button(g, width - 6 - 50, by, 48, "RESET", TEXT, () -> send(PlantCommand.ALARM_RESET));
		// tabs
		int ty = by + 16;
		int tx = x0;
		for (Tab tb : Tab.values()) {
			int w = font.width(tb.label) + 10;
			int colour = tb == tab ? CYAN : DIM;
			g.fill(tx, ty, tx + w, ty + 12, tb == tab ? 0xFF20343A : 0xFF181E24);
			g.outline(tx, ty, w, 12, colour);
			text(g, tb.label, tx + 5, ty + 2, colour);
			Tab target = tb;
			hits.add(new Hit(tx, ty, tx + w, ty + 12, () -> tab = target));
			tx += w + 2;
		}
		int top = ty + 16;
		int bottom = height - 34;
		switch (tab) {
			case OVERVIEW -> overview(g, s, x0, top, width - 12, bottom - top);
			case REACTOR -> reactor(g, s, x0, top);
			case PRIMARY -> primary(g, s, x0, top);
			case SECONDARY -> secondary(g, s, x0, top);
			case TURBINE -> turbine(g, s, x0, top);
			case ELECTRICAL -> electrical(g, s, x0, top);
			case SAFETY -> safety(g, s, x0, top);
			case ALARMS -> alarms(g, s, x0, top, bottom);
		}
		// command feedback and the latest log entries
		int fy = height - 30;
		g.fill(x0, fy - 2, width - 6, height - 2, 0xFF0C1014);
		if (System.currentTimeMillis() - ClientPlantState.commandTime < 8000 && !ClientPlantState.commandMessage.isEmpty()) {
			text(g, (ClientPlantState.commandAccepted ? "OK: " : "BLOCKED: ") + ClientPlantState.commandMessage, x0 + 2, fy, ClientPlantState.commandAccepted ? GREEN : RED);
		}
		List<AlarmSystem.LogEntry> log = s.log;
		for (int i = 0; i < 2 && i < log.size(); i++) {
			AlarmSystem.LogEntry e = log.get(log.size() - 1 - i);
			text(g, logLine(e), x0 + 2, fy + 10 + i * 9, logColour(e.priority()));
		}
		super.extractRenderState(g, mouseX, mouseY, partial);
	}

	private static String logLine(AlarmSystem.LogEntry e) {
		long t = (long) e.time();
		return String.format("%02d:%02d:%02d  %s", t / 3600, (t / 60) % 60, t % 60, e.text());
	}

	private static int logColour(int priority) {
		return switch (priority) {
			case 1 -> RED;
			case 2 -> AMBER;
			case 3 -> TEXT;
			default -> CYAN;
		};
	}

	// ================================================================== tabs

	private void overview(GuiGraphicsExtractor g, PlantSnapshot s, int x, int y, int w, int h) {
		int bw = 74;
		int bh = 40;
		int gap = (w - bw * 5) / 4;
		String[] names = {"REACTOR", "STEAM GEN", "TURBINE", "GENERATOR", "GRID"};
		String[] values = {
			s.get(Readout.THERMAL_POWER) == s.get(Readout.THERMAL_POWER) ? Readout.THERMAL_POWER.format(s.get(Readout.THERMAL_POWER)) + " MWt" : "----",
			Readout.SG_PRESSURE.format(s.get(Readout.SG_PRESSURE)) + " MPa",
			Readout.TURBINE_SPEED.format(s.get(Readout.TURBINE_SPEED)) + " rpm",
			Readout.GENERATOR.format(s.get(Readout.GENERATOR)) + " MWe",
			Readout.NET_OUTPUT.format(s.get(Readout.NET_OUTPUT)) + " MWe"};
		boolean[] on = {!s.flag(PlantSnapshot.F_TRIPPED), s.get(Readout.STEAM_TURBINE) > 1, s.flag(PlantSnapshot.F_TURBINE_LATCHED),
			s.flag(PlantSnapshot.F_GEN_BREAKER), s.flag(PlantSnapshot.F_GRID)};
		for (int i = 0; i < 5; i++) {
			int bx = x + i * (bw + gap);
			g.fill(bx, y, bx + bw, y + bh, 0xFF1E262E);
			g.outline(bx, y, bw, bh, on[i] ? GREEN : AMBER);
			text(g, names[i], bx + 4, y + 4, on[i] ? GREEN : AMBER);
			text(g, values[i], bx + 4, y + 20, TEXT);
			if (i < 4) {
				int ax = bx + bw;
				boolean flow = on[i] && on[i + 1];
				int offset = flow ? (frame / 3) % 6 : 0;
				for (int k = ax + 2 + offset; k < ax + gap - 2; k += 6) {
					g.fill(k, y + bh / 2, k + 3, y + bh / 2 + 2, flow ? 0xFFFF8040 : DIM);
				}
			}
		}
		int cy = y + bh + 14;
		box(g, x, cy, w / 3 - 4, 120);
		text(g, "PRIMARY", x + 4, cy + 4, CYAN);
		values(g, s, x + 4, cy + 16, 96, Readout.NEUTRON_POWER, Readout.T_AVG, Readout.T_HOT, Readout.RCS_PRESSURE, Readout.PZR_LEVEL,
			Readout.SUBCOOLING, Readout.RCS_FLOW, Readout.BORON, Readout.PEAK_CLAD, Readout.DECAY_HEAT);
		int x2 = x + w / 3;
		box(g, x2, cy, w / 3 - 4, 120);
		text(g, "SECONDARY & HEAT SINK", x2 + 4, cy + 4, CYAN);
		values(g, s, x2 + 4, cy + 16, 96, Readout.SG_LEVEL_NR, Readout.STEAM_TURBINE, Readout.FEED_FLOW, Readout.AFW_FLOW, Readout.STEAM_DUMP,
			Readout.STEAM_ADV, Readout.CONDENSER_PRESSURE, Readout.CW_FLOW, Readout.DISCHARGE_TEMP, Readout.TOWER_HEAT);
		int x3 = x + 2 * w / 3;
		box(g, x3, cy, w / 3, 120);
		text(g, "ELECTRICAL & SAFETY", x3 + 4, cy + 4, CYAN);
		values(g, s, x3 + 4, cy + 16, 96, Readout.GRID_DEMAND, Readout.HOUSE_LOAD, Readout.BATTERY_A, Readout.BATTERY_B, Readout.CONT_PRESSURE,
			Readout.CONT_HYDROGEN, Readout.CONT_DOSE, Readout.CORE_DAMAGE, Readout.RELEASE_TOTAL, Readout.SFP_TEMP);
		int ly = cy + 128;
		lamp(g, x, ly, s.flag(PlantSnapshot.F_SI), RED, "SAFETY INJECTION");
		lamp(g, x + 110, ly, s.flag(PlantSnapshot.F_ROD_AUTO), GREEN, "RODS AUTO");
		lamp(g, x + 190, ly, s.flag(PlantSnapshot.F_MSIV), GREEN, "MSIVs OPEN");
		lamp(g, x + 270, ly, s.busLive[Bus.SA.ordinal()] != 0 && s.busLive[Bus.SB.ordinal()] != 0, GREEN, "SAFETY BUSES");
		lamp(g, x + 360, ly, s.flag(PlantSnapshot.F_HORN), RED, "ALARM HORN");
	}

	private void reactor(GuiGraphicsExtractor g, PlantSnapshot s, int x, int y) {
		box(g, x, y, 200, 150);
		text(g, "ROD POSITIONS (steps withdrawn)", x + 4, y + 4, CYAN);
		bar(g, x + 8, y + 18, 14, 100, s.get(Readout.SHUTDOWN_BANKS) / 228, BLUE, "SD");
		Readout[] banks = {Readout.BANK_A, Readout.BANK_B, Readout.BANK_C, Readout.BANK_D};
		for (int i = 0; i < 4; i++) {
			bar(g, x + 40 + i * 24, y + 18, 14, 100, s.get(banks[i]) / 228, GREEN, String.valueOf((char) ('A' + i)));
		}
		text(g, String.format("Group %.0f / 528", s.get(Readout.CONTROL_GROUP)), x + 140, y + 20, TEXT);
		text(g, s.flag(PlantSnapshot.F_ROD_AUTO) ? "AUTO" : "MANUAL", x + 140, y + 32, s.flag(PlantSnapshot.F_ROD_AUTO) ? GREEN : AMBER);
		if (!s.rodBlock.isEmpty()) {
			text(g, "BLOCK: " + s.rodBlock, x + 4, y + 136, AMBER);
		}
		int bx = x + 4;
		int by = y + 156;
		cmd(g, bx, by, 64, "ROD OUT", PlantCommand.ROD_OUT);
		cmd(g, bx + 66, by, 64, "ROD STOP", PlantCommand.ROD_STOP);
		cmd(g, bx + 132, by, 64, "ROD IN", PlantCommand.ROD_IN);
		cmd(g, bx, by + 14, 64, "AUTO", PlantCommand.ROD_AUTO);
		cmd(g, bx + 66, by + 14, 64, "MANUAL", PlantCommand.ROD_MANUAL);
		button(g, bx + 132, by + 14, 64, "TRIP", RED, () -> send(PlantCommand.MANUAL_TRIP));
		cmd(g, bx, by + 28, 96, "SD BANKS OUT", PlantCommand.SHUTDOWN_BANKS_OUT);
		cmd(g, bx + 100, by + 28, 96, "SD BANKS IN", PlantCommand.SHUTDOWN_BANKS_IN);
		cmd(g, bx, by + 42, 196, "RESET REACTOR TRIP BREAKERS", PlantCommand.RESET_TRIP);
		int x2 = x + 208;
		box(g, x2, y, 190, 210);
		text(g, "CORE PHYSICS", x2 + 4, y + 4, CYAN);
		values(g, s, x2 + 4, y + 16, 104, Readout.NEUTRON_POWER, Readout.LOG_POWER, Readout.STARTUP_RATE, Readout.REACTIVITY, Readout.RHO_RODS,
			Readout.RHO_BORON, Readout.RHO_DOPPLER, Readout.RHO_MODERATOR, Readout.RHO_XENON, Readout.RHO_FUEL, Readout.MTC, Readout.XENON,
			Readout.IODINE, Readout.BURNUP, Readout.FUEL_TEMP, Readout.PEAK_CLAD, Readout.DNBR, Readout.DECAY_HEAT, Readout.THERMAL_POWER);
		int x3 = x2 + 198;
		box(g, x3, y, 150, 110);
		text(g, "BORON (CVCS)", x3 + 4, y + 4, CYAN);
		values(g, s, x3 + 4, y + 16, 70, Readout.BORON, Readout.BORON_TARGET, Readout.CHARGING);
		cmd(g, x3 + 4, y + 50, 44, "+50", PlantCommand.BORON_ADJUST, 0, 50);
		cmd(g, x3 + 50, y + 50, 44, "+10", PlantCommand.BORON_ADJUST, 0, 10);
		cmd(g, x3 + 96, y + 50, 50, "HOLD", PlantCommand.BORON_HOLD);
		cmd(g, x3 + 4, y + 64, 44, "-50", PlantCommand.BORON_ADJUST, 0, -50);
		cmd(g, x3 + 50, y + 64, 44, "-10", PlantCommand.BORON_ADJUST, 0, -10);
		text(g, "+ borate / - dilute", x3 + 4, y + 82, DIM);
	}

	private void primary(GuiGraphicsExtractor g, PlantSnapshot s, int x, int y) {
		box(g, x, y, 190, 220);
		text(g, "REACTOR COOLANT SYSTEM", x + 4, y + 4, CYAN);
		values(g, s, x + 4, y + 16, 104, Readout.T_HOT, Readout.T_COLD, Readout.T_AVG, Readout.T_REF, Readout.RCS_PRESSURE, Readout.PZR_LEVEL,
			Readout.PZR_HEATERS, Readout.PZR_SPRAY, Readout.SUBCOOLING, Readout.RCS_FLOW, Readout.RCS_INVENTORY, Readout.VOID_FRACTION,
			Readout.CORE_COVERED, Readout.CHARGING, Readout.LEAK_FLOW, Readout.PEAK_CLAD);
		int x2 = x + 198;
		text(g, "REACTOR COOLANT PUMPS (click to start/stop)", x2, y, CYAN);
		EquipmentId[] rcps = {EquipmentId.RCP_A, EquipmentId.RCP_B, EquipmentId.RCP_C, EquipmentId.RCP_D};
		for (int i = 0; i < 4; i++) {
			equipment(g, s, rcps[i], "RCP " + (char) ('A' + i), x2 + i * 64, y + 12, 60);
		}
		equipment(g, s, EquipmentId.CHG_A, "CHG A", x2, y + 38, 60);
		equipment(g, s, EquipmentId.CHG_B, "CHG B", x2 + 64, y + 38, 60);
		equipment(g, s, EquipmentId.PZR_HEATERS, "PZR HTR", x2 + 128, y + 38, 60);
		int cy = y + 66;
		text(g, "PRESSURIZER", x2, cy, CYAN);
		cmd(g, x2, cy + 10, 60, "HTR AUTO", PlantCommand.PZR_HEATERS_AUTO);
		cmd(g, x2 + 62, cy + 10, 60, "HTR ON", PlantCommand.PZR_HEATERS_ON);
		cmd(g, x2 + 124, cy + 10, 60, "HTR OFF", PlantCommand.PZR_HEATERS_OFF);
		cmd(g, x2, cy + 24, 60, "SPR AUTO", PlantCommand.SPRAY_AUTO);
		cmd(g, x2 + 62, cy + 24, 60, "SPR OPEN", PlantCommand.SPRAY_OPEN);
		cmd(g, x2 + 124, cy + 24, 60, "SPR CLOSE", PlantCommand.SPRAY_CLOSE);
		lamp(g, x2 + 190, cy + 12, s.flag(PlantSnapshot.F_HEATERS_AUTO), GREEN, "HTR AUTO");
		lamp(g, x2 + 190, cy + 26, s.flag(PlantSnapshot.F_SPRAY_AUTO), GREEN, "SPRAY AUTO");
		for (int i = 0; i < 2; i++) {
			int py = cy + 42 + i * 14;
			int idx = i;
			boolean open = s.flag(i == 0 ? PlantSnapshot.F_PORV1 : PlantSnapshot.F_PORV2);
			boolean block = s.flag(i == 0 ? PlantSnapshot.F_PORV1_BLOCK : PlantSnapshot.F_PORV2_BLOCK);
			lamp(g, x2, py + 2, open, RED, "PORV " + (i + 1));
			cmd(g, x2 + 52, py, 40, "AUTO", PlantCommand.PORV_AUTO, i, 0);
			cmd(g, x2 + 94, py, 40, "OPEN", PlantCommand.PORV_OPEN, i, 0);
			cmd(g, x2 + 136, py, 40, "CLOSE", PlantCommand.PORV_CLOSE, i, 0);
			button(g, x2 + 178, py, 70, block ? "BLOCK: OPEN" : "BLOCK: SHUT", block ? GREEN : AMBER, () -> send(PlantCommand.PORV_BLOCK, idx, 0));
		}
		int ly = cy + 74;
		cmd(g, x2, ly, 90, "LETDOWN ON", PlantCommand.LETDOWN_ON);
		cmd(g, x2 + 92, ly, 90, "LETDOWN OFF", PlantCommand.LETDOWN_OFF);
		lamp(g, x2 + 190, ly + 2, s.flag(PlantSnapshot.F_LETDOWN), GREEN, "LETDOWN");
		channels(g, s, SensorId.PZR_PRESSURE, x2, ly + 20);
		channels(g, s, SensorId.T_HOT, x2, ly + 44);
		channels(g, s, SensorId.RCS_FLOW, x2, ly + 68);
		channels(g, s, SensorId.POWER_RANGE, x2, ly + 92);
	}

	private void secondary(GuiGraphicsExtractor g, PlantSnapshot s, int x, int y) {
		box(g, x, y, 190, 200);
		text(g, "STEAM & FEEDWATER", x + 4, y + 4, CYAN);
		values(g, s, x + 4, y + 16, 104, Readout.SG_PRESSURE, Readout.SG_LEVEL_NR, Readout.SG_LEVEL_WR, Readout.STEAM_TURBINE, Readout.STEAM_DUMP,
			Readout.STEAM_ADV, Readout.ADV_POSITION, Readout.FEED_FLOW, Readout.MFW_FLOW, Readout.AFW_FLOW, Readout.FEED_TEMP, Readout.CST,
			Readout.CONDENSER_PRESSURE);
		int x2 = x + 198;
		text(g, "FEED PUMPS", x2, y, CYAN);
		equipment(g, s, EquipmentId.MFW_A, "MFW A", x2, y + 12, 60);
		equipment(g, s, EquipmentId.MFW_B, "MFW B", x2 + 64, y + 12, 60);
		equipment(g, s, EquipmentId.MDAFW_A, "MDAFW A", x2, y + 36, 60);
		equipment(g, s, EquipmentId.MDAFW_B, "MDAFW B", x2 + 64, y + 36, 60);
		equipment(g, s, EquipmentId.TDAFW, "TDAFW", x2 + 128, y + 36, 60);
		int cy = y + 64;
		cmd(g, x2, cy, 80, "FEED AUTO", PlantCommand.FEED_AUTO);
		cmd(g, x2 + 82, cy, 50, "MAN 25%", PlantCommand.FEED_MANUAL, 0, 0.25);
		cmd(g, x2 + 134, cy, 50, "MAN 75%", PlantCommand.FEED_MANUAL, 0, 0.75);
		cmd(g, x2, cy + 14, 132, "RESET FW ISOLATION", PlantCommand.MFW_RESET);
		lamp(g, x2 + 140, cy + 16, s.flag(PlantSnapshot.F_MFW_ISOLATED), RED, "FW ISOL");
		cmd(g, x2, cy + 28, 64, "MSIV OPEN", PlantCommand.MSIV_OPEN);
		cmd(g, x2 + 66, cy + 28, 64, "MSIV CLOSE", PlantCommand.MSIV_CLOSE);
		lamp(g, x2 + 140, cy + 30, s.flag(PlantSnapshot.F_MSIV), GREEN, "MSIV OPEN");
		cmd(g, x2, cy + 42, 64, "ADV AUTO", PlantCommand.ADV_AUTO);
		cmd(g, x2 + 66, cy + 42, 40, "ADV 0", PlantCommand.ADV_MANUAL, 0, 0);
		cmd(g, x2 + 108, cy + 42, 40, "ADV 50", PlantCommand.ADV_MANUAL, 0, 0.5);
		cmd(g, x2 + 150, cy + 42, 44, "ADV 100", PlantCommand.ADV_MANUAL, 0, 1.0);
		cmd(g, x2, cy + 56, 96, "ARM STEAM DUMPS", PlantCommand.STEAM_DUMP_ARM);
		cmd(g, x2 + 98, cy + 56, 96, "BLOCK DUMPS", PlantCommand.STEAM_DUMP_BLOCK);
		lamp(g, x2 + 200, cy + 58, s.flag(PlantSnapshot.F_DUMPS_ARMED), GREEN, "ARMED");
		cmd(g, x2, cy + 70, 194, s.flag(PlantSnapshot.F_AFW_ESW) ? "AFW SUCTION: ESW (SEA WATER)" : "AFW SUCTION: CST", PlantCommand.AFW_SUCTION_SWAP);
		channels(g, s, SensorId.SG_LEVEL, x2, cy + 92);
	}

	private void turbine(GuiGraphicsExtractor g, PlantSnapshot s, int x, int y) {
		box(g, x, y, 190, 210);
		text(g, "TURBINE GENERATOR", x + 4, y + 4, CYAN);
		values(g, s, x + 4, y + 16, 104, Readout.TURBINE_SPEED, Readout.SPEED_SETPOINT, Readout.GOVERNOR, Readout.TURBINE_MECH, Readout.GENERATOR,
			Readout.LOAD_SETPOINT, Readout.LOAD_RAMPED, Readout.RAMP_RATE, Readout.HOUSE_LOAD, Readout.NET_OUTPUT, Readout.GRID_DEMAND,
			Readout.VIBRATION, Readout.GSU_TEMP);
		lamp(g, x + 4, y + 154, s.flag(PlantSnapshot.F_TURBINE_LATCHED), GREEN, "LATCHED");
		lamp(g, x + 84, y + 154, s.flag(PlantSnapshot.F_GEN_BREAKER), GREEN, "ON LINE");
		lamp(g, x + 4, y + 166, s.flag(PlantSnapshot.F_RUNBACK), AMBER, "RUNBACK");
		int x2 = x + 198;
		int cy = y;
		cmd(g, x2, cy, 60, "LATCH", PlantCommand.TURBINE_LATCH);
		button(g, x2 + 62, cy, 60, "TRIP", RED, () -> send(PlantCommand.TURBINE_TRIP));
		cmd(g, x2, cy + 14, 40, "0 rpm", PlantCommand.TURBINE_SPEED, 0, 0);
		cmd(g, x2 + 42, cy + 14, 40, "900", PlantCommand.TURBINE_SPEED, 0, 900);
		cmd(g, x2 + 84, cy + 14, 40, "1800", PlantCommand.TURBINE_SPEED, 0, 1800);
		cmd(g, x2, cy + 28, 60, "SYNC", PlantCommand.GENERATOR_SYNC);
		cmd(g, x2 + 62, cy + 28, 62, "OPEN BKR", PlantCommand.GENERATOR_OPEN);
		int[] steps = {-100, -50, -10, 10, 50, 100};
		for (int i = 0; i < steps.length; i++) {
			cmd(g, x2 + i * 34, cy + 42, 32, (steps[i] > 0 ? "+" : "") + steps[i], PlantCommand.LOAD_ADJUST, 0, steps[i]);
		}
		text(g, "load setpoint MW", x2 + 206, cy + 44, DIM);
		cmd(g, x2, cy + 56, 60, "RAMP 20", PlantCommand.RAMP_RATE, 0, 20);
		cmd(g, x2 + 62, cy + 56, 60, "RAMP 50", PlantCommand.RAMP_RATE, 0, 50);
		cmd(g, x2 + 124, cy + 56, 60, "RAMP 150", PlantCommand.RAMP_RATE, 0, 150);
		text(g, "CIRCULATING WATER", x2, cy + 76, CYAN);
		EquipmentId[] cw = {EquipmentId.CW_1, EquipmentId.CW_2, EquipmentId.CW_3, EquipmentId.CW_4};
		for (int i = 0; i < 4; i++) {
			equipment(g, s, cw[i], "CW " + (i + 1), x2 + i * 64, cy + 88, 60);
		}
		equipment(g, s, EquipmentId.INTAKE_SCREENS, "SCREENS", x2 + 256, cy + 88, 60);
		for (int n = 0; n <= 4; n++) {
			cmd(g, x2 + n * 40, cy + 114, 38, n + " TWR", PlantCommand.TOWERS, n, 0);
		}
		values(g, s, x2, cy + 132, 110, Readout.CONDENSER_PRESSURE, Readout.CONDENSER_TEMP, Readout.CW_FLOW, Readout.SEA_TEMP, Readout.CW_OUTLET,
			Readout.DISCHARGE_TEMP, Readout.TOWER_HEAT, Readout.SCREEN_FOULING);
	}

	private void electrical(GuiGraphicsExtractor g, PlantSnapshot s, int x, int y) {
		text(g, "ONE-LINE DIAGRAM", x, y, CYAN);
		int lx = x;
		int ly = y + 14;
		lamp(g, lx, ly, s.flag(PlantSnapshot.F_GRID), GREEN, "400 kV GRID");
		lamp(g, lx + 100, ly, s.flag(PlantSnapshot.F_OFFSITE_BREAKER), GREEN, "OFFSITE BKR");
		lamp(g, lx + 200, ly, s.flag(PlantSnapshot.F_GEN_BREAKER), GREEN, "GEN BKR");
		cmd(g, lx + 300, ly - 2, 70, "CLOSE OFFS.", PlantCommand.OFFSITE_CLOSE);
		cmd(g, lx + 372, ly - 2, 70, "OPEN OFFS.", PlantCommand.OFFSITE_OPEN);
		Bus[] buses = {Bus.NS1, Bus.NS2, Bus.SA, Bus.SB, Bus.DCA, Bus.DCB};
		Readout[] loads = {Readout.BUS_NS1_LOAD, Readout.BUS_NS2_LOAD, Readout.BUS_SA_LOAD, Readout.BUS_SB_LOAD, null, null};
		for (int i = 0; i < buses.length; i++) {
			int bx = x + (i % 2) * 230;
			int by = ly + 18 + (i / 2) * 26;
			boolean live = s.busLive[buses[i].ordinal()] != 0;
			g.fill(bx, by, bx + 220, by + 22, 0xFF1E262E);
			g.outline(bx, by, 220, 22, live ? GREEN : RED);
			text(g, buses[i].label, bx + 4, by + 2, live ? GREEN : RED);
			String src = s.busSource[buses[i].ordinal()];
			String load = loads[i] == null ? "" : String.format("  %.1f MW", s.get(loads[i]));
			text(g, (live ? "LIVE from " + (src == null || src.isEmpty() ? "?" : src) : "DEAD") + load, bx + 4, by + 12, live ? TEXT : RED);
		}
		int ey = ly + 100;
		equipment(g, s, EquipmentId.EDG_A, "EDG A", x, ey, 64);
		equipment(g, s, EquipmentId.EDG_B, "EDG B", x + 68, ey, 64);
		cmd(g, x + 140, ey, 50, "START A", PlantCommand.EDG_START, 0, 0);
		cmd(g, x + 192, ey, 50, "STOP A", PlantCommand.EDG_STOP, 0, 0);
		cmd(g, x + 140, ey + 12, 50, "START B", PlantCommand.EDG_START, 1, 0);
		cmd(g, x + 192, ey + 12, 50, "STOP B", PlantCommand.EDG_STOP, 1, 0);
		equipment(g, s, EquipmentId.GSU, "GSU", x + 250, ey, 56);
		equipment(g, s, EquipmentId.UAT, "UAT", x + 310, ey, 56);
		equipment(g, s, EquipmentId.SST, "SST", x + 370, ey, 56);
		equipment(g, s, EquipmentId.BAT_A, "BATT A", x + 250, ey + 24, 56);
		equipment(g, s, EquipmentId.BAT_B, "BATT B", x + 310, ey + 24, 56);
		equipment(g, s, EquipmentId.GENERATOR, "GEN", x + 370, ey + 24, 56);
		values(g, s, x, ey + 30, 100, Readout.EDG_A_FUEL, Readout.EDG_B_FUEL, Readout.EDG_A_TIMER, Readout.EDG_B_TIMER, Readout.BATTERY_A,
			Readout.BATTERY_B, Readout.HOUSE_LOAD, Readout.GENERATOR, Readout.GSU_TEMP);
		text(g, "Diesels start automatically on safety bus undervoltage or SI.", x + 250, ey + 56, DIM);
		text(g, "Batteries carry DC instruments while chargers are dead.", x + 250, ey + 66, DIM);
	}

	private void safety(GuiGraphicsExtractor g, PlantSnapshot s, int x, int y) {
		lamp(g, x, y, s.flag(PlantSnapshot.F_SI), RED, "SI");
		lamp(g, x + 40, y, s.flag(PlantSnapshot.F_SI_BLOCKED), AMBER, "SI BLOCK");
		lamp(g, x + 110, y, s.flag(PlantSnapshot.F_SPRAY_ACT), RED, "CS ACT");
		lamp(g, x + 170, y, s.flag(PlantSnapshot.F_RHR_COOLDOWN), GREEN, "RHR CLDN");
		lamp(g, x + 240, y, s.flag(PlantSnapshot.F_RECIRC), AMBER, "RECIRC");
		lamp(g, x + 300, y, s.flag(PlantSnapshot.F_IGNITERS), GREEN, "IGNITERS");
		lamp(g, x + 370, y, s.flag(PlantSnapshot.F_VENT), RED, "VENT OPEN");
		int by = y + 14;
		cmd(g, x, by, 60, "MANUAL SI", PlantCommand.SI_MANUAL);
		cmd(g, x + 62, by, 60, "RESET SI", PlantCommand.SI_RESET);
		cmd(g, x + 124, by, 60, "BLOCK SI", PlantCommand.SI_BLOCK);
		cmd(g, x + 186, by, 70, "BLOCK SL SI", PlantCommand.STEAMLINE_SI_BLOCK);
		cmd(g, x + 258, by, 70, "RESET SPRAY", PlantCommand.SPRAY_RESET);
		cmd(g, x, by + 14, 60, "RHR ON", PlantCommand.RHR_COOLDOWN_ON);
		cmd(g, x + 62, by + 14, 60, "RHR OFF", PlantCommand.RHR_COOLDOWN_OFF);
		cmd(g, x + 124, by + 14, 70, "TO RECIRC", PlantCommand.RECIRC_SWITCHOVER);
		cmd(g, x + 196, by + 14, 60, "IGN ON", PlantCommand.IGNITERS_ON);
		cmd(g, x + 258, by + 14, 60, "IGN OFF", PlantCommand.IGNITERS_OFF);
		cmd(g, x + 320, by + 14, 60, "VENT OPEN", PlantCommand.VENT_OPEN);
		cmd(g, x + 382, by + 14, 60, "VENT CLOSE", PlantCommand.VENT_CLOSE);
		cmd(g, x + 330, by, 56, "SFP MKUP", PlantCommand.SFP_MAKEUP_ON);
		cmd(g, x + 388, by, 54, "MKUP OFF", PlantCommand.SFP_MAKEUP_OFF);
		EquipmentId[] eccs = {EquipmentId.SI_A, EquipmentId.SI_B, EquipmentId.RHR_A, EquipmentId.RHR_B, EquipmentId.CS_A, EquipmentId.CS_B,
			EquipmentId.CCW_A, EquipmentId.CCW_B, EquipmentId.ESW_A, EquipmentId.ESW_B, EquipmentId.CFC_A, EquipmentId.CFC_B,
			EquipmentId.SFP_A, EquipmentId.SFP_B, EquipmentId.IGNITERS};
		String[] names = {"SI A", "SI B", "RHR A", "RHR B", "CS A", "CS B", "CCW A", "CCW B", "ESW A", "ESW B", "CFC A", "CFC B", "SFP A", "SFP B", "IGN"};
		for (int i = 0; i < eccs.length; i++) {
			equipment(g, s, eccs[i], names[i], x + (i % 8) * 56, by + 32 + (i / 8) * 24, 52);
		}
		int vy = by + 84;
		box(g, x, vy, 196, 120);
		text(g, "ECCS & HEAT REMOVAL", x + 4, vy + 4, CYAN);
		values(g, s, x + 4, vy + 16, 104, Readout.SI_FLOW, Readout.RWST, Readout.ACCUMULATORS, Readout.SUMP, Readout.CCW_TEMP, Readout.SFP_TEMP,
			Readout.SFP_LEVEL, Readout.CORE_COVERED, Readout.PEAK_CLAD, Readout.SUBCOOLING);
		box(g, x + 204, vy, 240, 120);
		text(g, "CONTAINMENT & SEVERE ACCIDENT", x + 208, vy + 4, CYAN);
		values(g, s, x + 208, vy + 16, 120, Readout.CONT_PRESSURE, Readout.CONT_TEMP, Readout.CONT_HYDROGEN, Readout.CONT_INTEGRITY,
			Readout.CONT_DOSE, Readout.AIRBORNE, Readout.RELEASE_RATE, Readout.OXIDATION, Readout.CORE_DAMAGE, Readout.CORE_MELT);
		channels(g, s, SensorId.CONT_PRESSURE, x, vy + 126);
		// site emergency sirens
		int sy = vy + 150;
		lamp(g, x, sy + 2, s.flag(PlantSnapshot.F_SIREN), RED, "SITE SIRENS");
		cmd(g, x + 90, sy, 56, "AUTO", PlantCommand.SIREN_AUTO);
		button(g, x + 148, sy, 56, "SOUND", RED, () -> send(PlantCommand.SIREN_ON));
		cmd(g, x + 206, sy, 56, "SILENCE", PlantCommand.SIREN_OFF);
		if (s.flag(PlantSnapshot.F_VESSEL_FAILED)) {
			text(g, "REACTOR VESSEL FAILURE INDICATED", x + 220, vy + 128, frame % 20 < 10 ? RED : AMBER);
		}
	}

	private void alarms(GuiGraphicsExtractor g, PlantSnapshot s, int x, int y, int bottom) {
		AlarmId[] ids = AlarmId.values();
		int cols = 5;
		int cw = (width - 12) / cols;
		int ch = 18;
		for (int i = 0; i < ids.length; i++) {
			int cx = x + (i % cols) * cw;
			int cy = y + (i / cols) * (ch + 2);
			AlarmSystem.State st = AlarmSystem.State.values()[s.alarmState[i]];
			int colour = ids[i].priority == 1 ? RED : (ids[i].priority == 2 ? AMBER : 0xFFE0E0E0);
			int bg;
			int fg;
			switch (st) {
				case NEW -> {
					boolean on = frame % 16 < 8;
					bg = on ? (colour & 0x00FFFFFF) | 0xB0000000 : 0xFF202428;
					fg = on ? 0xFF000000 : colour;
				}
				case ACKNOWLEDGED -> {
					bg = (colour & 0x00FFFFFF) | 0xB0000000;
					fg = 0xFF000000;
				}
				case RINGBACK -> {
					bg = 0xFF283038;
					fg = frame % 40 < 20 ? colour : DIM;
				}
				default -> {
					bg = 0xFF181C20;
					fg = 0xFF485058;
				}
			}
			g.fill(cx + 1, cy, cx + cw - 1, cy + ch, bg);
			String label = ids[i].text;
			if (font.width(label) > cw - 6) {
				label = font.plainSubstrByWidth(label, cw - 10) + ".";
			}
			text(g, label, cx + 4, cy + 5, fg);
		}
		int logTop = y + ((ids.length + cols - 1) / cols) * (ch + 2) + 6;
		text(g, "EVENT LOG (scroll)", x, logTop, CYAN);
		List<AlarmSystem.LogEntry> log = s.log;
		int lines = Math.max(1, (bottom - logTop - 12) / 9);
		int start = Math.max(0, log.size() - lines - logScroll);
		for (int i = 0; i < lines && start + i < log.size(); i++) {
			AlarmSystem.LogEntry e = log.get(start + i);
			text(g, logLine(e), x, logTop + 12 + i * 9, logColour(e.priority()));
		}
	}
}
