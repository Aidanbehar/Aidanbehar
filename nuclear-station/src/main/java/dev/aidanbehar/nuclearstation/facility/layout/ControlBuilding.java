package dev.aidanbehar.nuclearstation.facility.layout;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.*;

import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.facility.Feature;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.item.Handbooks;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import java.util.List;
import net.minecraft.core.Direction;
import net.minecraft.world.item.DyeColor;
import net.minecraft.world.level.block.Blocks;

/** Control building (main control room, batteries, protection racks) and the administration wing. */
final class ControlBuilding {
	static final int BASEMENT = -6;
	static final int GROUND = 0;
	static final int CONTROL = 7;
	static final int RELAY = 14;
	static final int ROOF = 21;

	private ControlBuilding() {
	}

	static List<Component> components() {
		return List.of(new Control(), new Admin());
	}

	static final class Control extends Component {
		Control() {
			super("control_building", CB_X0, CB_Z0, CB_X1, CB_Z1);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			// shell
			p.room(x0, g + BASEMENT - 1, z0, x1, g + ROOF, z1, Pal.CONCRETE, Pal.AIR);
			for (int lv : new int[] {BASEMENT, GROUND, CONTROL, RELAY}) {
				p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + lv, Pal.CONCRETE);
			}
			p.walls(x0, z0, x1, z1, g + 1, g + ROOF - 1, Pal.PANEL);
			// ---------------------------------------------------------------- basement: cable spreading room
			int b = g + BASEMENT;
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, b, Pal.EPOXY);
			for (int z = z0 + 4; z < z1 - 2; z += 4) {
				k.tray(x0 + 1, z, x1 - 1, z, b + 4);
				k.tray(x0 + 1, z, x1 - 1, z, b + 2);
			}
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, b + 5, 8);
			k.label(x0 + 6, b + 2, z0 + 1, Direction.SOUTH, DyeColor.YELLOW, "CABLE SPREADING", "ROOM", "FIRE ZONE CB-B1");
			k.sign(x0 + 3, b + 2, z0 + 1, SignKind.FIRE, Direction.SOUTH);
			// ---------------------------------------------------------------- ground floor: entrance, batteries, DC distribution
			int gr = g + GROUND;
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, gr, Pal.EPOXY);
			int mid = (z0 + z1) / 2;
			p.fill(x0 + 1, gr + 1, mid - 3, x1 - 1, gr + 6, mid + 3, Pal.AIR);
			p.walls(x0 + 1, mid - 4, x1 - 1, mid + 4, gr + 1, gr + 6, Pal.WALL);
			p.fill(x0 + 2, gr + 1, mid - 3, x1 - 2, gr + 6, mid + 3, Pal.AIR);
			p.floor(x0 + 2, mid - 3, x1 - 2, mid + 3, gr, Pal.TILE);
			for (int i = 0; i < 2; i++) {
				int rx0 = x0 + 6 + i * 36;
				int rx1 = rx0 + 30;
				p.walls(rx0, z1 - 22, rx1, z1 - 2, gr + 1, gr + 6, Pal.CONCRETE);
				p.fill(rx0 + 1, gr + 1, z1 - 21, rx1 - 1, gr + 5, z1 - 3, Pal.AIR);
				for (int x = rx0 + 2; x <= rx1 - 2; x += 3) {
					p.fill(x, gr + 1, z1 - 19, x + 1, gr + 2, z1 - 5, Pal.BATTERY);
				}
				EquipmentId bat = i == 0 ? EquipmentId.BAT_A : EquipmentId.BAT_B;
				k.station(rx0 + 1, gr + 1, z1 - 21, Direction.SOUTH, bat);
				k.label(rx0 + 2, gr + 2, z1 - 21, Direction.SOUTH, DyeColor.BLACK, "STATION", "BATTERY " + (i == 0 ? "A" : "B"), "125 V DC", "4 HOUR RATING");
				k.doorway((rx0 + rx1) / 2, gr + 1, z1 - 22, Direction.SOUTH, true);
				k.lamps(rx0 + 1, z1 - 21, rx1 - 1, z1 - 3, gr + 5, 6);
				k.sign((rx0 + rx1) / 2 + 2, gr + 3, z1 - 23, SignKind.HIGH_VOLTAGE, Direction.NORTH);
			}
			for (int x = x1 - 60; x <= x1 - 8; x++) {
				p.fill(x, gr + 1, z0 + 4, x, gr + 3, z0 + 4, Painter.facing(ModBlocks.SWITCHGEAR_CABINET, Direction.SOUTH));
			}
			k.label(x1 - 34, gr + 4, z0 + 5, Direction.SOUTH, DyeColor.YELLOW, "125 V DC", "DISTRIBUTION", "TRAINS A / B");
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, gr + 6, 8);
			k.doorway(x0, gr + 1, mid, Direction.EAST, true);
			k.doorway(x1, gr + 1, mid, Direction.WEST, true);
			// the entrance corridor connects both entrances to the rooms north and south of it
			k.doorway(x0 + 1, gr + 1, mid, Direction.EAST, false);
			k.doorway(x1 - 1, gr + 1, mid, Direction.WEST, false);
			for (int x : new int[] {x0 + 24, (x0 + x1) / 2, x1 - 24}) {
				k.doorway(x, gr + 1, mid - 4, Direction.NORTH, true);
				k.doorway(x, gr + 1, mid + 4, Direction.SOUTH, true);
			}
			// ---------------------------------------------------------------- control room level
			int cr = g + CONTROL;
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, cr, Pal.LAB_FLOOR);
			int cx0 = x0 + 20;
			int cx1 = x1 - 20;
			int cz0 = z0 + 10;
			int cz1 = z1 - 6;
			p.walls(cx0 - 1, cz0 - 1, cx1 + 1, cz1 + 1, cr + 1, cr + 6, Pal.WALL);
			p.fill(cx0, cr + 1, cz0, cx1, cr + 6, cz1, Pal.AIR);
			p.floor(cx0, cz0, cx1, cz1, cr + 6, Pal.CEILING);
			// vertical boards along the south wall: annunciators on top, control boards below
			for (int x = cx0 + 2; x <= cx1 - 2; x++) {
				k.panel(x, cr + 1, cz1, Direction.NORTH);
				k.panel(x, cr + 2, cz1, Direction.NORTH);
				k.annunciator(x, cr + 3, cz1, Direction.NORTH);
				k.annunciator(x, cr + 4, cz1, Direction.NORTH);
			}
			// side boards (safety systems east, electrical west)
			for (int z = cz0 + 6; z <= cz1 - 3; z++) {
				k.panel(cx0, cr + 1, z, Direction.EAST);
				k.panel(cx0, cr + 2, z, Direction.EAST);
				k.annunciator(cx0, cr + 3, z, Direction.EAST);
				k.panel(cx1, cr + 1, z, Direction.WEST);
				k.panel(cx1, cr + 2, z, Direction.WEST);
				k.annunciator(cx1, cr + 3, z, Direction.WEST);
			}
			// horseshoe operator console
			int conZ = cz1 - 8;
			int mx = (cx0 + cx1) / 2;
			for (int x = mx - 24; x <= mx + 24; x++) {
				k.console(x, cr + 1, conZ, Direction.NORTH);
			}
			for (int z = conZ - 5; z < conZ; z++) {
				k.console(mx - 24, cr + 1, z, Direction.EAST);
				k.console(mx + 24, cr + 1, z, Direction.WEST);
			}
			for (int x = mx - 22; x <= mx + 22; x += 3) {
				p.set(x, cr + 1, conZ - 2, Painter.stairs(Blocks.DARK_OAK_STAIRS, Direction.NORTH, false));
			}
			k.scram(mx - 2, cr + 2, conZ - 1, Direction.NORTH);
			k.scram(mx + 2, cr + 2, conZ - 1, Direction.NORTH);
			k.label(mx, cr + 2, conZ - 1, Direction.NORTH, DyeColor.RED, "REACTOR", "TRIP", "PUSH");
			// shift supervisor's desk and procedures
			p.fill(mx - 5, cr + 1, cz0 + 6, mx + 5, cr + 1, cz0 + 8, Pal.STEEL_FLOOR);
			for (int x = mx - 3; x <= mx + 3; x += 3) {
				k.desk(x, cr + 2, cz0 + 7, Direction.SOUTH);
			}
			k.lectern(mx - 8, cr + 1, cz0 + 7, Direction.SOUTH, Handbooks.operatorHandbook());
			k.lectern(mx + 8, cr + 1, cz0 + 7, Direction.SOUTH, Handbooks.emergencyProcedures());
			k.lectern(mx - 12, cr + 1, cz0 + 4, Direction.SOUTH, Handbooks.shiftLog());
			k.label(mx, cr + 3, cz0 + 9, Direction.SOUTH, DyeColor.BLACK, "SHIFT", "SUPERVISOR");
			// manuals: site guide, interface guide and operating manual on lecterns, copies in the chests
			k.lectern(mx + 12, cr + 1, cz0 + 4, Direction.SOUTH, Handbooks.siteGuide());
			k.lectern(mx - 16, cr + 1, cz0 + 4, Direction.SOUTH, Handbooks.reactorManual());
			k.lectern(mx + 16, cr + 1, cz0 + 4, Direction.SOUTH, Handbooks.controlRoomGuide());
			k.itemChest(mx + 20, cr + 1, cz0, Direction.SOUTH, Handbooks.allManuals());
			k.itemChest(mx - 20, cr + 1, cz0, Direction.SOUTH, Handbooks.allManuals());
			k.label(mx + 20, cr + 2, cz0 + 1, Direction.SOUTH, DyeColor.BLACK, "MANUALS", "TAKE A COPY");
			k.label(mx - 20, cr + 2, cz0 + 1, Direction.SOUTH, DyeColor.BLACK, "MANUALS", "TAKE A COPY");
			k.lamps(cx0, cz0, cx1, cz1, cr + 5, 5);
			k.emergencyLamp(cx0 + 2, cr + 5, cz0 + 2);
			k.emergencyLamp(cx1 - 2, cr + 5, cz0 + 2);
			k.emergencyLamp(cx0 + 2, cr + 5, cz1 - 2);
			k.emergencyLamp(cx1 - 2, cr + 5, cz1 - 2);
			k.beacon(mx, cr + 5, cz1 - 1 - 0);
			k.doorway(mx, cr + 1, cz0 - 1, Direction.SOUTH, true);
			k.label(mx + 2, cr + 3, cz0 - 2, Direction.NORTH, DyeColor.WHITE, "MAIN", "CONTROL ROOM", "UNIT 1", "AUTHORISED ONLY");
			k.sign(mx - 2, cr + 3, cz0 - 2, SignKind.RESTRICTED, Direction.NORTH);
			// visitors' gallery behind glass and the technical support centre
			p.fill(cx0 + 30, cr + 1, cz0 - 1, cx1 - 30, cr + 4, cz0 - 1, Pal.GLASS);
			p.fill(mx - 1, cr + 1, cz0 - 1, mx + 1, cr + 3, cz0 - 1, Pal.WALL);
			k.doorway(mx, cr + 1, cz0 - 1, Direction.SOUTH, true);
			p.floor(x0 + 1, z0 + 1, x1 - 1, cz0 - 2, cr, Pal.CARPET);
			k.lamps(x0 + 1, z0 + 1, x1 - 1, cz0 - 2, cr + 6, 6);
			int tsc0 = x0 + 2;
			p.walls(tsc0, cz0, cx0 - 2, cz1, cr + 1, cr + 6, Pal.WALL);
			p.fill(tsc0 + 1, cr + 1, cz0 + 1, cx0 - 3, cr + 5, cz1 - 1, Pal.AIR);
			p.floor(tsc0 + 1, cz0 + 1, cx0 - 3, cz1 - 1, cr, Pal.CARPET);
			for (int z = cz0 + 3; z < cz1 - 2; z += 4) {
				k.desk(tsc0 + 4, cr + 1, z, Direction.EAST);
				k.desk(tsc0 + 10, cr + 1, z, Direction.EAST);
			}
			k.lectern(tsc0 + 14, cr + 1, cz1 - 2, Direction.WEST, Handbooks.radiationProtection());
			k.lectern(tsc0 + 14, cr + 1, cz1 - 5, Direction.WEST, Handbooks.siteGuide());
			k.itemChest(tsc0 + 14, cr + 1, cz1 - 8, Direction.WEST, Handbooks.allManuals());
			k.doorway(cx0 - 2, cr + 1, cz0 + 4, Direction.EAST, true);
			k.doorway(cx0 - 1, cr + 1, cz0 + 4, Direction.EAST, false);
			k.label(tsc0 + 2, cr + 3, cz0 + 1, Direction.SOUTH, DyeColor.BLACK, "TECHNICAL", "SUPPORT", "CENTRE");
			k.lamps(tsc0 + 1, cz0 + 1, cx0 - 3, cz1 - 1, cr + 5, 5);
			p.walls(cx1 + 2, cz0, x1 - 2, cz1, cr + 1, cr + 6, Pal.WALL);
			p.fill(cx1 + 3, cr + 1, cz0 + 1, x1 - 3, cr + 5, cz1 - 1, Pal.AIR);
			k.breakRoom(cx1 + 3, cz0 + 1, x1 - 3, cz1 - 1, cr);
			k.doorway(cx1 + 2, cr + 1, cz0 + 4, Direction.WEST, true);
			k.doorway(cx1 + 1, cr + 1, cz0 + 4, Direction.WEST, false);
			k.label(x1 - 4, cr + 3, cz0 + 1, Direction.SOUTH, DyeColor.BLACK, "CREW ROOM");
			k.lamps(cx1 + 3, cz0 + 1, x1 - 3, cz1 - 1, cr + 5, 5);
			// ---------------------------------------------------------------- relay room: four separated protection channels
			int rr = g + RELAY;
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, rr, Pal.EPOXY);
			int width = (x1 - x0 - 2) / 4;
			for (int ch = 0; ch < 4; ch++) {
				int rx0 = x0 + 1 + ch * width;
				int rx1 = rx0 + width - 1;
				p.walls(rx0, z0 + 1, rx1, z1 - 12, rr + 1, rr + 6, Pal.CONCRETE);
				p.fill(rx0 + 1, rr + 1, z0 + 2, rx1 - 1, rr + 6, z1 - 13, Pal.AIR);
				for (int x = rx0 + 2; x <= rx1 - 2; x += 2) {
					for (int z = z0 + 4; z <= z1 - 16; z += 6) {
						p.fill(x, rr + 1, z, x, rr + 3, z, Painter.facing(ModBlocks.INSTRUMENT_RACK, Direction.SOUTH));
					}
				}
				EquipmentId rack = EquipmentId.values()[EquipmentId.INSTR_A.ordinal() + ch];
				k.station(rx0 + 2, rr + 1, z1 - 14, Direction.SOUTH, rack);
				k.label(rx0 + 3, rr + 2, z1 - 14, Direction.SOUTH, DyeColor.BLACK, "PROTECTION", "CHANNEL " + new String[] {"I", "II", "III", "IV"}[ch], "RACKS");
				k.doorway((rx0 + rx1) / 2, rr + 1, z1 - 12, Direction.SOUTH, true);
				k.lamps(rx0 + 1, z0 + 2, rx1 - 1, z1 - 13, rr + 6, 6);
				k.sign((rx0 + rx1) / 2 + 2, rr + 3, z1 - 11, SignKind.RESTRICTED, Direction.SOUTH);
			}
			for (int x = x0 + 6; x <= x1 - 6; x += 2) {
				p.fill(x, rr + 1, z1 - 4, x, rr + 3, z1 - 4, Painter.facing(ModBlocks.SERVER_RACK, Direction.NORTH));
			}
			k.label(x0 + 4, rr + 3, z1 - 6, Direction.NORTH, DyeColor.BLACK, "PLANT PROCESS", "COMPUTER");
			k.lamps(x0 + 1, z1 - 11, x1 - 1, z1 - 1, rr + 6, 6);
			// ---------------------------------------------------------------- vertical circulation
			int[] floors = {g - 14, g + BASEMENT, g + GROUND, g + CONTROL, g + RELAY};
			int len = Kit.stairCoreLength(floors);
			k.stairCore(x0 + 39, z0 + 2 + 0, floors, Pal.CONCRETE);
			k.ladder(x1 - 3, g + RELAY + 1, g + ROOF - 1, z0 + 2, Direction.SOUTH);
			p.set(x1 - 3, g + ROOF, z0 + 2, Pal.AIR);
			// ---------------------------------------------------------------- roof: HVAC and the site siren
			for (int x = x0 + 8; x < x1 - 8; x += 20) {
				p.fill(x, g + ROOF + 1, z0 + 8, x + 6, g + ROOF + 3, z0 + 14, Pal.DUCT);
			}
			p.fill(x1 - 10, g + ROOF + 1, z1 - 10, x1 - 10, g + ROOF + 8, z1 - 10, Pal.STEEL_COLUMN);
			k.beacon(x1 - 10, g + ROOF + 9, z1 - 10);
			p.feature(Feature.CONTROL_ROOM, mx, cr + 2, (cz0 + cz1) / 2);
			p.feature(Feature.SITE_SIREN, x1 - 10, g + ROOF + 9, z1 - 10);
		}
	}

	/** Four-storey administration wing: lobby, health physics, dosimetry, canteen, offices. */
	static final class Admin extends Component {
		Admin() {
			super("admin_wing", ADMIN_X0, ADMIN_Z0, ADMIN_X1, CB_Z0);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			int zEnd = ADMIN_Z1;
			int[] levels = {0, 6, 12, 18};
			int roof = 24;
			p.room(x0, g, z0, x1, g + roof, zEnd, Pal.WHITE, Pal.AIR);
			for (int lv : levels) {
				p.floor(x0 + 1, z0 + 1, x1 - 1, zEnd - 1, g + lv, Pal.CONCRETE);
				for (int x = x0 + 2; x < x1 - 2; x += 5) {
					p.fill(x, g + lv + 2, z0, x + 2, g + lv + 4, z0, Kit.pane(Pal.WINDOW, true));
					p.fill(x, g + lv + 2, zEnd, x + 2, g + lv + 4, zEnd, Kit.pane(Pal.WINDOW, true));
				}
				for (int z = z0 + 3; z < zEnd - 2; z += 5) {
					p.fill(x0, g + lv + 2, z, x0, g + lv + 4, z + 2, Kit.pane(Pal.WINDOW, false));
					p.fill(x1, g + lv + 2, z, x1, g + lv + 4, z + 2, Kit.pane(Pal.WINDOW, false));
				}
			}
			int mid = (x0 + x1) / 2;
			// ground floor: lobby with reception and turnstiles
			p.floor(x0 + 1, z0 + 1, x1 - 1, zEnd - 1, g, Pal.TILE);
			p.fill(mid - 3, g + 1, z0, mid + 3, g + 4, z0, Pal.GLASS);
			p.fill(mid - 1, g + 1, z0, mid + 1, g + 2, z0, Pal.AIR);
			k.label(mid, g + 6, z0 - 1, Direction.NORTH, DyeColor.BLUE, "MERIDIAN POINT", "NUCLEAR", "GENERATING", "STATION");
			p.fill(mid - 6, g + 1, z0 + 8, mid + 6, g + 1, z0 + 8, Pal.slab(Blocks.SMOOTH_QUARTZ_SLAB, true));
			k.label(mid, g + 2, z0 + 8, Direction.NORTH, DyeColor.BLACK, "RECEPTION", "SIGN IN HERE", "COLLECT BADGE", "& DOSIMETER");
			for (int x = mid - 8; x <= mid + 8; x += 2) {
				p.set(x, g + 1, z0 + 16, Kit.bars(false));
			}
			k.label(mid + 1, g + 3, z0 + 15, Direction.NORTH, DyeColor.RED, "PROTECTED AREA", "ACCESS CONTROL", "BADGE + PIN");
			// health physics: dosimetry issue, frisking, decontamination
			p.walls(x0 + 1, z0 + 20, x0 + 30, zEnd - 1, g + 1, g + 5, Pal.WALL);
			p.fill(x0 + 2, g + 1, z0 + 21, x0 + 29, g + 5, zEnd - 2, Pal.AIR);
			p.floor(x0 + 2, z0 + 21, x0 + 29, zEnd - 2, g, Pal.RUBBER);
			k.doorway(x0 + 30, g + 1, z0 + 26, Direction.WEST, true);
			k.label(x0 + 31, g + 3, z0 + 28, Direction.EAST, DyeColor.YELLOW, "HEALTH PHYSICS", "DOSIMETRY", "DECONTAMINATION");
			k.sign(x0 + 31, g + 3, z0 + 24, SignKind.CONTAMINATION, Direction.EAST);
			for (int z = z0 + 24; z <= z0 + 40; z += 4) {
				p.set(x0 + 2, g + 1, z, Painter.facing(ModBlocks.DECON_SHOWER, Direction.EAST));
				k.sign(x0 + 2, g + 2, z, SignKind.EMERGENCY_SHOWER, Direction.EAST);
			}
			k.chest(x0 + 28, g + 1, z0 + 22, Direction.WEST, Kit.LOOT_PPE);
			k.chest(x0 + 28, g + 1, z0 + 24, Direction.WEST, Kit.LOOT_PPE);
			k.lockerRoom(x0 + 4, z0 + 50, x0 + 28, zEnd - 4, g, Direction.SOUTH);
			p.set(x0 + 14, g + 1, z0 + 44, ModBlocks.WASTE_DRUM.defaultBlockState());
			k.label(x0 + 14, g + 2, z0 + 43, Direction.NORTH, DyeColor.YELLOW, "CONTAMINATED", "PPE ONLY");
			k.lamps(x0 + 2, z0 + 21, x0 + 29, zEnd - 2, g + 5, 6);
			// canteen
			p.walls(x1 - 40, z0 + 20, x1 - 1, zEnd - 1, g + 1, g + 5, Pal.WALL);
			p.fill(x1 - 39, g + 1, z0 + 21, x1 - 2, g + 5, zEnd - 2, Pal.AIR);
			k.breakRoom(x1 - 38, z0 + 22, x1 - 3, zEnd - 3, g);
			k.doorway(x1 - 40, g + 1, z0 + 26, Direction.EAST, true);
			k.label(x1 - 41, g + 3, z0 + 28, Direction.WEST, DyeColor.BLACK, "STAFF", "RESTAURANT");
			k.lamps(x1 - 39, z0 + 21, x1 - 2, zEnd - 2, g + 5, 6);
			// corridor through to the control building
			p.fill(mid - 2, g + 1, z0 + 16, mid + 2, g + 4, CB_Z0, Pal.AIR);
			p.floor(mid - 2, z0 + 16, mid + 2, CB_Z0, g, Pal.TILE);
			k.lamps(mid - 2, z0 + 16, mid + 2, CB_Z0, g + 5, 6);
			p.fill(mid - 3, g, zEnd + 1, mid + 3, g + 6, CB_Z0 - 1, Pal.WHITE);
			p.fill(mid - 2, g + 1, zEnd, mid + 2, g + 4, CB_Z0, Pal.AIR);
			// upper floors: offices, meeting rooms, document control
			for (int i = 1; i < levels.length; i++) {
				int fl = g + levels[i];
				k.office(x0 + 2, z0 + 2, mid - 6, zEnd - 2, fl, fl + 6);
				p.walls(mid + 6, z0 + 2, x1 - 2, z0 + 30, fl + 1, fl + 5, Pal.WALL);
				p.fill(mid + 7, fl + 1, z0 + 3, x1 - 3, fl + 5, z0 + 29, Pal.AIR);
				p.floor(mid + 7, z0 + 3, x1 - 3, z0 + 29, fl, Pal.CARPET);
				p.fill(mid + 14, fl + 1, z0 + 12, x1 - 10, fl + 1, z0 + 20, Pal.slab(Blocks.DARK_OAK_SLAB, true));
				k.doorway(mid + 6, fl + 1, z0 + 16, Direction.EAST, true);
				k.lamps(mid + 7, z0 + 3, x1 - 3, z0 + 29, fl + 5, 5);
				k.label(mid + 5, fl + 3, z0 + 18, Direction.WEST, DyeColor.BLACK, "MEETING ROOM", i + "." + (i * 3));
				if (i == 2) {
					for (int x = mid + 8; x < x1 - 3; x += 2) {
						p.fill(x, fl + 1, z0 + 40, x, fl + 3, z0 + 40, Blocks.BOOKSHELF.defaultBlockState());
					}
					k.lectern(mid + 12, fl + 1, z0 + 46, Direction.NORTH, Handbooks.operatorHandbook());
					k.lectern(mid + 18, fl + 1, z0 + 46, Direction.NORTH, Handbooks.radiationProtection());
					k.lectern(mid + 24, fl + 1, z0 + 46, Direction.NORTH, Handbooks.siteGuide());
					k.lectern(mid + 6 + 24, fl + 1, z0 + 46, Direction.NORTH, Handbooks.reactorManual());
					k.itemChest(mid + 9, fl + 1, z0 + 46, Direction.NORTH, Handbooks.allManuals());
					k.label(mid + 15, fl + 3, z0 + 39, Direction.SOUTH, DyeColor.BLACK, "DOCUMENT", "CONTROL", "PROCEDURES");
				} else {
					k.office(mid + 7, z0 + 34, x1 - 3, zEnd - 2, fl, fl + 6);
				}
				k.chest(x1 - 4, fl + 1, zEnd - 3, Direction.WEST, Kit.LOOT_OFFICE);
			}
			int[] floors = {g, g + 6, g + 12, g + 18};
			int len = Kit.stairCoreLength(floors);
			k.stairCore(mid - 2, zEnd - len - 1, floors, Pal.WALL);
			for (int x = x0 + 6; x < x1 - 6; x += 18) {
				p.fill(x, g + roof + 1, z0 + 10, x + 4, g + roof + 2, z0 + 14, Pal.DUCT);
			}
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z0 + 19, g + 5, 6);
		}
	}
}
