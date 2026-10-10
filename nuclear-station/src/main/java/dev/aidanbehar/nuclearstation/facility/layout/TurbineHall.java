package dev.aidanbehar.nuclearstation.facility.layout;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.*;

import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.facility.Feature;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import net.minecraft.core.Direction;
import net.minecraft.world.item.DyeColor;

/**
 * Turbine hall: a 240 x 160 block steel-framed hall, 55 blocks high, housing the
 * tandem-compound turbine (one high-pressure and three low-pressure cylinders) and the
 * generator on a deck at +14, the condensers and feedwater train below, moisture
 * separator reheaters, the deaerator, main feed pumps, the 6.9 kV switchgear and an
 * overhead travelling crane.
 */
final class TurbineHall extends Component {
	static final int BASE = -14;
	static final int DECK = 14;
	static final int ROOF = 55;
	static final int CRANE = 44;
	static final int[][] LP = {{418, 448}, {456, 486}, {494, 524}};

	TurbineHall() {
		super("turbine_hall", TH_X0, TH_Z0, TH_X1, TH_Z1);
	}

	@Override
	public void paint(Painter p, Kit k) {
		int g = p.grade;
		int az = TH_AXIS_Z;
		// ---------------------------------------------------------------- substructure
		p.fill(x0, g + BASE - 2, z0, x1, g, z1, Pal.CONCRETE);
		p.fill(x0 + 1, g + BASE + 1, z0 + 1, x1 - 1, g - 1, z1 - 1, Pal.AIR);
		p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + BASE, Pal.EPOXY);
		p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g, Pal.CONCRETE);
		// basement columns
		k.columns(x0 + 12, z0 + 12, x1 - 12, z1 - 12, g + BASE + 1, g - 1, 12, Pal.CONCRETE);
		// ---------------------------------------------------------------- superstructure
		p.walls(x0, z0, x1, z1, g + 1, g + 3, Pal.CONCRETE);
		p.walls(x0, z0, x1, z1, g + 4, g + ROOF - 1, Pal.BLUE);
		p.floor(x0, z0, x1, z1, g + ROOF, Pal.GREY);
		p.fill(x0 + 1, g + 1, z0 + 1, x1 - 1, g + ROOF - 1, z1 - 1, Pal.AIR);
		for (int x = x0; x <= x1; x += 12) {
			p.fill(x, g + 1, z0 + 1, x, g + ROOF - 1, z0 + 1, Pal.STEEL_COLUMN);
			p.fill(x, g + 1, z1 - 1, x, g + ROOF - 1, z1 - 1, Pal.STEEL_COLUMN);
			p.fill(x, g + ROOF - 1, z0 + 1, x, g + ROOF - 1, z1 - 1, Pal.GIRDER);
		}
		for (int x = x0 + 4; x <= x1 - 6; x += 6) {
			p.fill(x, g + 40, z0, x + 3, g + 43, z0, Kit.pane(Pal.WINDOW, true));
			p.fill(x, g + 40, z1, x + 3, g + 43, z1, Kit.pane(Pal.WINDOW, true));
			p.fill(x, g + 6, z1, x + 3, g + 8, z1, Kit.pane(Pal.WINDOW, true));
		}
		for (int z = z0 + 4; z <= z1 - 6; z += 6) {
			p.fill(x1, g + 40, z, x1, g + 43, z + 3, Kit.pane(Pal.WINDOW, false));
		}
		// roof skylight strip and ventilators
		p.fill(x0 + 6, g + ROOF, az - 2, x1 - 6, g + ROOF, az + 2, Pal.GLASS);
		for (int x = x0 + 12; x <= x1 - 12; x += 24) {
			p.fill(x, g + ROOF + 1, z0 + 20, x + 2, g + ROOF + 3, z0 + 22, Pal.DUCT);
			p.fill(x, g + ROOF + 1, z1 - 22, x + 2, g + ROOF + 3, z1 - 20, Pal.DUCT);
		}
		// ---------------------------------------------------------------- turbine deck
		p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + DECK, Pal.CONCRETE);
		p.floor(x0 + 1, z0 + 1, x1 - 1, z0 + 30, g + DECK, Pal.GRATING);
		p.floor(x0 + 1, z1 - 30, x1 - 1, z1 - 1, g + DECK, Pal.GRATING);
		k.columns(x0 + 12, az - 24, x1 - 12, az + 24, g + 1, g + DECK - 1, 12, Pal.CONCRETE);
		// equipment hatch from the deck to the ground floor
		p.fill(x1 - 18, g + DECK, az - 10, x1 - 6, g + DECK, az + 10, Pal.AIR);
		k.railing(x1 - 19, az - 11, x1 - 5, az - 11, g + DECK + 1);
		k.railing(x1 - 19, az + 11, x1 - 5, az + 11, g + DECK + 1);
		k.railing(x1 - 19, az - 11, x1 - 19, az + 11, g + DECK + 1);
		p.fill(x1 - 18, g, az - 10, x1 - 6, g, az + 10, Pal.HAZARD);
		// ---------------------------------------------------------------- turbine-generator train
		int shaftY = g + DECK + 4;
		p.cylinderX(x0 + 10, x0 + 18, shaftY, az + 0.5, 2.5, Pal.GENERATOR);
		p.cylinderX(x0 + 20, x0 + 50, shaftY + 1, az + 0.5, 4.5, Pal.GENERATOR);
		p.fill(x0 + 22, g + DECK + 1, az - 4, x0 + 48, g + DECK + 1, az + 4, Pal.DARK_CONCRETE);
		for (int[] lp : LP) {
			p.fill(lp[0], g + DECK + 1, az - 8, lp[1], g + DECK + 5, az + 8, Pal.TURBINE);
			p.cylinderX(lp[0] + 1, lp[1] - 1, shaftY + 1, az + 0.5, 6.5, Pal.TURBINE);
			// condenser hung below each LP cylinder, through the deck and ground floor
			p.fill(lp[0], g + BASE + 1, az - 12, lp[1], g + DECK - 1, az + 12, Pal.CONDENSER);
			for (int x = lp[0] + 4; x <= lp[1] - 4; x += 10) {
				k.pipe(ModBlocks.PIPE_SEAWATER, x, g + BASE + 3, az + 13, x, g + BASE + 3, z1 - 1);
				k.pipe(ModBlocks.PIPE_SEAWATER, x + 3, g + BASE + 6, az + 13, x + 3, g + BASE + 6, z1 - 1);
			}
			k.label(lp[0] + 2, g + 2, az - 13, Direction.NORTH, DyeColor.BLACK, "CONDENSER", "SHELL " + (char) ('A' + (lp[0] - LP[0][0]) / 38));
			// crossover pipes from the HP exhaust
			p.fill(lp[0] + 14, shaftY + 7, az - 4, lp[0] + 14, shaftY + 9, az - 4, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
			p.fill(lp[0] + 14, shaftY + 7, az + 4, lp[0] + 14, shaftY + 9, az + 4, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
		}
		int hp0 = 534;
		int hp1 = 560;
		p.cylinderX(hp0, hp1, shaftY + 1, az + 0.5, 4.5, Pal.TURBINE);
		p.fill(hp0, g + DECK + 1, az - 3, hp1, g + DECK + 1, az + 3, Pal.DARK_CONCRETE);
		p.cylinderX(x0 + 10, hp1 + 4, shaftY + 1, az + 0.5, 1.0, Pal.IRON);
		k.pipe(ModBlocks.PIPE_STEAM, LP[0][0] + 14, shaftY + 10, az - 4, hp0 + 4, shaftY + 10, az - 4);
		k.pipe(ModBlocks.PIPE_STEAM, LP[0][0] + 14, shaftY + 10, az + 4, hp0 + 4, shaftY + 10, az + 4);
		p.fill(hp0 + 4, shaftY + 5, az - 4, hp0 + 4, shaftY + 9, az - 4, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
		p.fill(hp0 + 4, shaftY + 5, az + 4, hp0 + 4, shaftY + 9, az + 4, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
		// main steam from the MSIV house: stop and control valves ahead of the HP turbine
		for (int sx : new int[] {CONT_X - 22, CONT_X + 22}) {
			k.pipe(ModBlocks.PIPE_STEAM, sx, g + 22, z0, sx, g + 22, az - 14);
			k.pipe(ModBlocks.PIPE_STEAM, sx, g + 22, az - 14, hp1 + 6, g + 22, az - 14);
		}
		p.fill(hp1 + 6, g + DECK + 1, az - 14, hp1 + 6, g + 21, az - 14, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
		p.fill(hp1 + 5, g + DECK + 1, az - 13, hp1 + 7, g + DECK + 4, az - 9, Pal.IRON);
		k.label(hp1 + 6, g + DECK + 2, az - 15, Direction.NORTH, DyeColor.BLACK, "MAIN STOP", "& CONTROL", "VALVES");
		// moisture separator reheaters
		for (int z : new int[] {az - 30, az + 30}) {
			p.cylinderX(430, 520, g + DECK + 3, z + 0.5, 2.5, Pal.TANK);
			for (int x = 432; x <= 518; x += 14) {
				p.fill(x, g + DECK + 1, z, x, g + DECK + 1, z, Pal.STEEL_COLUMN);
			}
		}
		// deaerator and feedwater storage tank on its platform
		p.cylinderX(x1 - 40, x1 - 16, g + DECK + 4, z0 + 20.5, 3.5, Pal.TANK);
		k.label(x1 - 28, g + DECK + 2, z0 + 16, Direction.NORTH, DyeColor.BLACK, "DEAERATOR", "FEED STORAGE");
		// ---------------------------------------------------------------- ground floor equipment
		for (int i = 0; i < 6; i++) {
			int hx = 400 + i * 24;
			p.cylinderX(hx, hx + 16, g + 3, z0 + 12.5, 1.5, Pal.HX);
			p.cylinderX(hx, hx + 16, g + 3, z0 + 18.5, 1.5, Pal.HX);
		}
		k.label(402, g + 2, z0 + 10, Direction.SOUTH, DyeColor.BLACK, "LP FEEDWATER", "HEATERS 1-6");
		for (int m = 0; m < 2; m++) {
			int mz = z1 - 18 - m * 14;
			int mx = x1 - 34;
			p.fill(mx, g + 1, mz - 1, mx + 4, g + 3, mz + 1, Painter.facing(ModBlocks.PUMP_CASING, Direction.WEST));
			p.cylinderX(mx + 5, mx + 11, g + 2.5, mz + 0.5, 1.6, Pal.MOTOR);
			k.pipe(ModBlocks.PIPE_FEEDWATER, mx + 2, g + 4, mz, mx + 2, g + 21, mz);
			EquipmentId id = m == 0 ? EquipmentId.MFW_A : EquipmentId.MFW_B;
			k.station(mx - 2, g + 1, mz, Direction.WEST, id);
			k.label(mx - 2, g + 2, mz, Direction.WEST, DyeColor.BLACK, "MAIN FEED", "PUMP " + (m == 0 ? "A" : "B"), "8 MW");
		}
		k.pipe(ModBlocks.PIPE_FEEDWATER, x1 - 32, g + 22, z1 - 32, x1 - 32, g + 22, z0 + 2);
		p.fill(x1 - 32, g + 22, z0, x1 - 32, g + 22, z0 + 1, Pal.pipe(ModBlocks.PIPE_FEEDWATER, Direction.Axis.Z));
		// condensate pumps in the basement
		for (int i = 0; i < 3; i++) {
			int cx = 430 + i * 8;
			p.fill(cx, g + BASE + 1, z1 - 12, cx + 2, g + BASE + 3, z1 - 10, Painter.facing(ModBlocks.PUMP_CASING, Direction.NORTH));
			p.fill(cx, g + BASE + 4, z1 - 12, cx + 2, g + BASE + 5, z1 - 10, Pal.MOTOR);
		}
		k.label(432, g + BASE + 3, z1 - 13, Direction.NORTH, DyeColor.BLACK, "CONDENSATE", "PUMPS");
		// lube oil system at the generator end
		p.cylinder(x0 + 30, z1 - 24, 3, g + 1, g + 6, Pal.TANK);
		k.label(x0 + 30, g + 2, z1 - 28, Direction.NORTH, DyeColor.BLACK, "TURBINE", "LUBE OIL", "RESERVOIR");
		k.sign(x0 + 28, g + 3, z1 - 28, SignKind.FIRE, Direction.NORTH);
		// 6.9 kV switchgear rooms at the west end
		for (int bus = 0; bus < 2; bus++) {
			int rz0 = bus == 0 ? z0 + 4 : az + 4;
			int rz1 = bus == 0 ? az - 4 : z1 - 4;
			p.walls(x0 + 1, rz0, x0 + 20, rz1, g + 1, g + 8, Pal.CONCRETE);
			p.fill(x0 + 2, g + 1, rz0 + 1, x0 + 19, g + 7, rz1 - 1, Pal.AIR);
			p.floor(x0 + 1, rz0, x0 + 20, rz1, g + 8, Pal.CONCRETE);
			for (int z = rz0 + 2; z <= rz1 - 2; z++) {
				p.fill(x0 + 3, g + 1, z, x0 + 3, g + 3, z, Painter.facing(ModBlocks.SWITCHGEAR_CABINET, Direction.EAST));
				p.fill(x0 + 17, g + 1, z, x0 + 17, g + 3, z, Painter.facing(ModBlocks.SWITCHGEAR_CABINET, Direction.WEST));
			}
			k.lamps(x0 + 2, rz0 + 1, x0 + 19, rz1 - 1, g + 7, 6);
			k.doorway(x0 + 20, g + 1, (rz0 + rz1) / 2, Direction.WEST, true);
			k.label(x0 + 21, g + 3, (rz0 + rz1) / 2 + 2, Direction.EAST, DyeColor.YELLOW, "6.9 kV", "SWITCHGEAR", bus == 0 ? "BUS NS-1" : "BUS NS-2");
			k.sign(x0 + 21, g + 3, (rz0 + rz1) / 2 - 2, SignKind.HIGH_VOLTAGE, Direction.EAST);
		}
		// ---------------------------------------------------------------- local stations on the deck
		k.station(hp1 + 3, g + DECK + 1, az + 6, Direction.SOUTH, EquipmentId.TURBINE);
		k.label(hp1 + 3, g + DECK + 2, az + 6, Direction.SOUTH, DyeColor.BLACK, "TURBINE", "FRONT STANDARD", "TRIP / RESET");
		k.station(x0 + 34, g + DECK + 1, az + 7, Direction.SOUTH, EquipmentId.GENERATOR);
		k.label(x0 + 34, g + DECK + 2, az + 7, Direction.SOUTH, DyeColor.BLACK, "GENERATOR", "1150 MVA", "H2 COOLED");
		// ---------------------------------------------------------------- crane
		p.fill(x0 + 1, g + CRANE, z0 + 2, x1 - 1, g + CRANE, z0 + 2, Pal.GIRDER);
		p.fill(x0 + 1, g + CRANE, z1 - 2, x1 - 1, g + CRANE, z1 - 2, Pal.GIRDER);
		p.fill(480, g + CRANE + 1, z0 + 2, 482, g + CRANE + 2, z1 - 2, Pal.GIRDER);
		p.fill(479, g + CRANE + 1, az - 3, 483, g + CRANE + 3, az + 3, Pal.IRON);
		p.fill(481, g + DECK + 12, az, 481, g + CRANE, az, Pal.CHAIN);
		// ---------------------------------------------------------------- access
		int[] floors = {g + BASE, g, g + DECK};
		int len = Kit.stairCoreLength(floors);
		int[][] cores = {{x0 + 26, z0 + 3}, {x1 - 8, z0 + 3}, {x0 + 26, z1 - 2 - len}, {x1 - 8, z1 - 2 - len}};
		for (int[] c : cores) {
			k.stairCore(c[0], c[1], floors, Pal.CONCRETE);
			for (int fl : floors) {
				p.fill(c[0] + 4, fl + 1, c[1] + len / 2 - 1, c[0] + 4, fl + 2, c[1] + len / 2, Pal.AIR);
				p.fill(c[0] - 1, fl + 1, c[1] + len / 2 - 1, c[0] - 1, fl + 2, c[1] + len / 2, Pal.AIR);
			}
			k.ladder(c[0] + 1, g + DECK + 1, g + CRANE - 1, c[1] - 1 >= z0 + 2 ? c[1] - 1 : c[1] + len, c[1] < az ? Direction.SOUTH : Direction.NORTH);
		}
		for (int x = x0 + 40; x < x1 - 20; x += 60) {
			k.doorway(x, g + 1, z0, Direction.SOUTH, true);
			k.doorway(x, g + 1, z1, Direction.NORTH, true);
		}
		p.fill(x1, g + 1, az - 8, x1, g + 12, az + 8, Pal.AIR);
		p.fill(x1, g + 13, az - 9, x1, g + 13, az + 9, Pal.HAZARD);
		p.fill(x1, g + 1, az - 9, x1, g + 12, az - 9, Pal.HAZARD);
		p.fill(x1, g + 1, az + 9, x1, g + 12, az + 9, Pal.HAZARD);
		k.label(x1 + 1, g + 15, az, Direction.EAST, DyeColor.WHITE, "TURBINE HALL", "UNIT 1", "1050 MWe");
		k.sign(x0 + 41, g + 3, z0 - 1, SignKind.HEARING, Direction.NORTH);
		k.sign(x1 + 1, g + 3, az - 11, SignKind.HEARING, Direction.EAST);
		// ---------------------------------------------------------------- lighting
		k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + ROOF - 2, 12);
		k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + DECK - 1, 10);
		k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g - 1, 10);
		for (int x = x0 + 20; x < x1; x += 40) {
			k.emergencyLamp(x, g + DECK - 2, z0 + 2);
			k.emergencyLamp(x, g + DECK - 2, z1 - 2);
		}
		p.feature(Feature.TURBINE, 490, g + DECK + 10, az);
		p.feature(Feature.GENERATOR, x0 + 35, g + DECK + 5, az);
		p.feature(Feature.CONDENSER, 470, g - 6, az);
	}
}
