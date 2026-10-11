package dev.aidanbehar.nuclearstation.facility.layout;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.*;

import dev.aidanbehar.nuclearstation.block.PanelStatus;
import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.facility.Feature;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.item.Handbooks;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import net.minecraft.core.Direction;
import net.minecraft.world.item.DyeColor;
import net.minecraft.world.level.block.Blocks;

/**
 * Research wing: laboratories, hot cells and the Experimental Reaction Chamber. The
 * chamber is fully built and furnished but is not commissioned: its consoles report
 * the system as inactive and it has no connection to the main reactor simulation.
 */
final class ResearchWing extends Component {
	static final int UPPER = 8;
	static final int ROOF = 16;
	static final int HALL_TOP = 45;
	static final int HALL_FLOOR = -10;

	ResearchWing() {
		super("research_wing", RES_X0, RES_Z0, RES_X1, RES_Z1);
	}

	@Override
	public void paint(Painter p, Kit k) {
		int g = p.grade;
		int hx0 = CHAMBER_X0 - 10;
		int hz0 = CHAMBER_Z0 - 10;
		int hx1 = CHAMBER_X1 + 10;
		int hz1 = CHAMBER_Z1 + 10;
		int ccx = (CHAMBER_X0 + CHAMBER_X1) / 2;
		int ccz = (CHAMBER_Z0 + CHAMBER_Z1) / 2;
		// ---------------------------------------------------------------- envelope
		p.room(x0, g, z0, x1, g + ROOF, z1, Pal.WHITE, Pal.AIR);
		p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g, Pal.LAB_FLOOR);
		p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + UPPER, Pal.LAB_FLOOR);
		for (int lv : new int[] {0, UPPER}) {
			for (int x = x0 + 3; x < x1 - 3; x += 6) {
				p.fill(x, g + lv + 2, z0, x + 3, g + lv + 5, z0, Kit.pane(Pal.WINDOW, true));
				p.fill(x, g + lv + 2, z1, x + 3, g + lv + 5, z1, Kit.pane(Pal.WINDOW, true));
			}
		}
		// ---------------------------------------------------------------- chamber hall
		p.fill(hx0, g + HALL_FLOOR - 1, hz0, hx1, g + HALL_TOP, hz1, Pal.EXP_WALL);
		p.fill(hx0 + 4, g + HALL_FLOOR, hz0 + 4, hx1 - 4, g + HALL_TOP - 3, hz1 - 4, Pal.AIR);
		p.floor(hx0 + 4, hz0 + 4, hx1 - 4, hz1 - 4, g + HALL_FLOOR, Pal.STEEL_FLOOR);
		// central vessel with viewports
		int vy = g + 15;
		p.sphere(ccx + 0.5, vy, ccz + 0.5, 10, Pal.EXP_WALL);
		p.sphere(ccx + 0.5, vy, ccz + 0.5, 8.5, Pal.AIR);
		p.sphere(ccx + 0.5, vy, ccz + 0.5, 2, ModBlocks.EXP_EMITTER.defaultBlockState());
		for (int a = 0; a < 360; a += 45) {
			double ar = Math.toRadians(a);
			int wx = (int) Math.floor(ccx + 0.5 + Math.cos(ar) * 9.3);
			int wz = (int) Math.floor(ccz + 0.5 + Math.sin(ar) * 9.3);
			p.fill(wx, vy - 1, wz, wx, vy + 1, wz, Pal.OBS_GLASS);
		}
		p.fill(ccx, g + HALL_FLOOR + 1, ccz, ccx, vy - 10, ccz, Pal.EXP_WALL);
		// toroidal field coil stack and poloidal columns
		for (int y = vy - 4; y <= vy + 4; y += 2) {
			p.ring(ccx + 0.5, ccz + 0.5, 22, 19, y, y, Pal.EXP_COIL);
		}
		for (int a = 0; a < 360; a += 30) {
			double ar = Math.toRadians(a);
			int cxp = (int) Math.floor(ccx + 0.5 + Math.cos(ar) * 25);
			int czp = (int) Math.floor(ccz + 0.5 + Math.sin(ar) * 25);
			p.fill(cxp, g + HALL_FLOOR + 1, czp, cxp, g + HALL_TOP - 6, czp, Pal.EXP_COIL);
			p.fill(cxp, g + HALL_TOP - 5, czp, cxp, g + HALL_TOP - 4, czp, Pal.CHAIN);
		}
		// beam emitters on pedestals aimed at the vessel
		for (int a = 22; a < 360; a += 45) {
			double ar = Math.toRadians(a);
			int ex = (int) Math.floor(ccx + 0.5 + Math.cos(ar) * 33);
			int ez = (int) Math.floor(ccz + 0.5 + Math.sin(ar) * 33);
			p.fill(ex, g + HALL_FLOOR + 1, ez, ex, vy - 1, ez, Pal.STEEL_COLUMN);
			Direction face = Math.abs(Math.cos(ar)) > Math.abs(Math.sin(ar)) ? (Math.cos(ar) > 0 ? Direction.WEST : Direction.EAST)
				: (Math.sin(ar) > 0 ? Direction.NORTH : Direction.SOUTH);
			p.set(ex, vy, ez, Painter.facing(ModBlocks.EXP_EMITTER, face));
		}
		// catwalk rings
		for (int y : new int[] {g + UPPER, g + 26}) {
			p.ring(ccx + 0.5, ccz + 0.5, 39, 36, y, y, Pal.GRATING);
			p.ring(ccx + 0.5, ccz + 0.5, 36, 35, y + 1, y + 1, Pal.IRON_BARS);
		}
		k.ladder(ccx + 37, g + HALL_FLOOR + 1, g + 26, ccz, Direction.WEST);
		p.set(ccx + 37, g + UPPER, ccz, Pal.AIR);
		p.set(ccx + 37, g + 26, ccz, Pal.AIR);
		for (int a = 0; a < 360; a += 30) {
			double ar = Math.toRadians(a);
			k.lamp((int) Math.floor(ccx + Math.cos(ar) * 40), g + HALL_TOP - 4, (int) Math.floor(ccz + Math.sin(ar) * 40));
		}
		for (int a = 15; a < 360; a += 90) {
			double ar = Math.toRadians(a);
			k.sign((int) Math.floor(ccx + Math.cos(ar) * 38), g + UPPER + 2, (int) Math.floor(ccz + Math.sin(ar) * 38), SignKind.MAGNETIC, Direction.NORTH);
		}
		// observation gallery behind thick glass on the north side
		int gz = hz0 + 4;
		p.fill(ccx - 30, g + UPPER, gz, ccx + 30, g + UPPER, gz + 6, Pal.LAB_FLOOR);
		p.fill(ccx - 30, g + UPPER + 1, gz + 7, ccx + 30, g + UPPER + 6, gz + 7, Pal.OBS_GLASS);
		p.fill(ccx - 30, g + UPPER + 7, gz, ccx + 30, g + UPPER + 7, gz + 7, Pal.EXP_WALL);
		p.fill(ccx - 31, g + UPPER + 1, gz, ccx - 31, g + UPPER + 6, gz + 7, Pal.EXP_WALL);
		p.fill(ccx + 31, g + UPPER + 1, gz, ccx + 31, g + UPPER + 6, gz + 7, Pal.EXP_WALL);
		k.lamps(ccx - 30, gz, ccx + 30, gz + 6, g + UPPER + 6, 6);
		p.fill(ccx - 1, g + UPPER + 1, hz0, ccx + 1, g + UPPER + 3, gz - 1, Pal.AIR);
		k.door(ccx, g + UPPER + 1, hz0, Direction.SOUTH);
		k.label(ccx - 2, g + UPPER + 3, gz + 1, Direction.SOUTH, DyeColor.PURPLE, "OBSERVATION", "GALLERY");
		// personnel entrance from the upper-floor corridor (east) onto the lower catwalk ring
		p.fill(ccx + 39, g + UPPER, ccz - 1, hx1, g + UPPER, ccz + 1, Pal.GRATING);
		p.fill(ccx + 39, g + UPPER + 1, ccz - 1, hx1, g + UPPER + 3, ccz + 1, Pal.AIR);
		p.fill(ccx + 39, g + UPPER + 1, ccz - 2, hx1 - 4, g + UPPER + 1, ccz - 2, Kit.bars(true));
		p.fill(ccx + 39, g + UPPER + 1, ccz + 2, hx1 - 4, g + UPPER + 1, ccz + 2, Kit.bars(true));
		k.door(hx1, g + UPPER + 1, ccz, Direction.EAST);
		k.label(hx1 + 1, g + UPPER + 3, ccz + 2, Direction.EAST, DyeColor.PURPLE, "CHAMBER HALL", "CATWALK ACCESS", "MAGNETIC FIELD", "AREA");
		k.sign(hx1 + 1, g + UPPER + 3, ccz - 2, SignKind.MAGNETIC, Direction.EAST);
		// shielded personnel door at hall floor level (locked out)
		p.fill(ccx - 2, g + HALL_FLOOR + 1, hz1 - 4, ccx + 2, g + HALL_FLOOR + 5, hz1 - 4, Pal.LEAD);
		k.label(ccx, g + HALL_FLOOR + 3, hz1 - 5, Direction.NORTH, DyeColor.RED, "SHIELD DOOR", "LOCKED OUT", "NOT COMMISSIONED");
		p.feature(Feature.EXPERIMENTAL_CHAMBER, ccx, vy, ccz);

		// ---------------------------------------------------------------- chamber control room (upper floor, north)
		int crz0 = z0 + 24;
		int crz1 = hz0 - 2;
		int crx0 = ccx - 30;
		int crx1 = ccx + 30;
		p.walls(crx0, crz0, crx1, crz1, g + UPPER + 1, g + ROOF - 1, Pal.EXP_WALL);
		p.fill(crx0 + 1, g + UPPER + 1, crz0 + 1, crx1 - 1, g + ROOF - 1, crz1 - 1, Pal.AIR);
		for (int x = crx0 + 4; x <= crx1 - 4; x++) {
			p.set(x, g + UPPER + 1, crz1 - 3, Painter.facing(ModBlocks.EXP_CONSOLE, Direction.NORTH));
			p.set(x, g + UPPER + 1, crz1 - 1, Pal.panel(ModBlocks.CONTROL_PANEL, Direction.NORTH, PanelStatus.OFF));
			p.set(x, g + UPPER + 2, crz1 - 1, Pal.panel(ModBlocks.ANNUNCIATOR_PANEL, Direction.NORTH, PanelStatus.OFF));
		}
		for (int x = crx0 + 6; x <= crx1 - 6; x += 4) {
			p.set(x, g + UPPER + 1, crz1 - 5, Painter.stairs(Blocks.DARK_OAK_STAIRS, Direction.NORTH, false));
		}
		k.lectern(crx0 + 3, g + UPPER + 1, crz0 + 3, Direction.SOUTH, Handbooks.experimentalChamberNotice());
		k.label(ccx, g + UPPER + 4, crz1 - 1, Direction.NORTH, DyeColor.PURPLE, "EXPERIMENTAL", "REACTION CHAMBER", "SYSTEM INACTIVE", "NOT COMMISSIONED");
		k.lamps(crx0 + 1, crz0 + 1, crx1 - 1, crz1 - 1, g + ROOF - 2, 5);
		k.doorway(crx0, g + UPPER + 1, (crz0 + crz1) / 2, Direction.EAST, true);
		k.sign(crx0 - 1, g + UPPER + 3, (crz0 + crz1) / 2 + 2, SignKind.MAGNETIC, Direction.WEST);
		k.sign(crx0 - 1, g + UPPER + 3, (crz0 + crz1) / 2 - 2, SignKind.LASER, Direction.WEST);
		k.label(crx0 - 1, g + UPPER + 4, (crz0 + crz1) / 2, Direction.WEST, DyeColor.PURPLE, "ERC CONTROL", "ROOM", "AUTHORISED", "RESEARCHERS ONLY");

		// ---------------------------------------------------------------- laboratories (ground floor, north)
		int lz0 = z0 + 22;
		for (int i = 0; i < 4; i++) {
			int lx0 = x0 + 4 + i * 48;
			int lx1 = lx0 + 44;
			p.walls(lx0, lz0, lx1, hz0 - 4, g + 1, g + UPPER - 1, Pal.WALL);
			p.fill(lx0 + 1, g + 1, lz0 + 1, lx1 - 1, g + UPPER - 1, hz0 - 5, Pal.AIR);
			for (int x = lx0 + 3; x < lx1 - 3; x += 6) {
				for (int z = lz0 + 4; z < hz0 - 8; z += 8) {
					p.fill(x, g + 1, z, x + 3, g + 1, z, Pal.slab(Blocks.SMOOTH_QUARTZ_SLAB, true));
					p.set(x, g + 2, z, i % 2 == 0 ? Blocks.BREWING_STAND.defaultBlockState() : Blocks.FLOWER_POT.defaultBlockState());
					p.set(x + 2, g + 2, z, Blocks.CAULDRON.defaultBlockState());
				}
			}
			String[] names = {"RADIOCHEMISTRY", "MATERIALS LAB", "INSTRUMENT LAB", "GEOLOGY & ORE"};
			if (i == 0) {
				for (int x = lx0 + 2; x < lx1 - 2; x += 4) {
					p.fill(x, g + 1, lz0 + 1, x + 2, g + 3, lz0 + 1, Pal.DUCT);
					p.fill(x, g + 2, lz0 + 2, x + 2, g + 2, lz0 + 2, Pal.GLASS);
				}
				k.sign(lx0 + 22, g + 4, hz0 - 5, SignKind.CONTAMINATION, Direction.NORTH);
			}
			if (i == 3) {
				for (int x = lx0 + 4; x < lx1 - 4; x += 5) {
					p.set(x, g + 1, hz0 - 6, ModBlocks.URANINITE_ORE.defaultBlockState());
					p.set(x + 1, g + 1, hz0 - 6, ModBlocks.MONAZITE_ORE.defaultBlockState());
					p.set(x + 2, g + 1, hz0 - 6, ModBlocks.CARNOTITE_ORE.defaultBlockState());
				}
				k.sign(lx0 + 22, g + 4, hz0 - 5, SignKind.RADIATION, Direction.NORTH);
			}
			k.chest(lx1 - 2, g + 1, lz0 + 2, Direction.WEST, Kit.LOOT_LAB);
			k.doorway((lx0 + lx1) / 2, g + 1, hz0 - 4, Direction.NORTH, true);
			k.label((lx0 + lx1) / 2 + 2, g + 3, hz0 - 3, Direction.SOUTH, DyeColor.BLACK, names[i]);
			k.lamps(lx0 + 1, lz0 + 1, lx1 - 1, hz0 - 5, g + UPPER - 1, 6);
		}
		// ---------------------------------------------------------------- hot cells (east)
		int cellX0 = hx1 + 6;
		for (int c = 0; c < 4; c++) {
			int cz0 = hz0 + c * 26;
			p.fill(cellX0 + 6, g + 1, cz0, x1 - 2, g + UPPER - 1, cz0 + 20, Pal.LEAD);
			p.fill(cellX0 + 8, g + 1, cz0 + 2, x1 - 4, g + UPPER - 2, cz0 + 18, Pal.AIR);
			p.fill(cellX0 + 6, g + 2, cz0 + 7, cellX0 + 7, g + 4, cz0 + 13, Pal.LEAD_GLASS);
			p.set(cellX0 + 12, g + 1, cz0 + 10, ModBlocks.CONTAMINATED_DEBRIS.defaultBlockState());
			p.set(cellX0 + 14, g + 1, cz0 + 8, ModBlocks.FUEL_ASSEMBLY.defaultBlockState());
			for (int dz : new int[] {8, 12}) {
				p.fill(cellX0 + 8, g + 5, cz0 + dz, cellX0 + 11, g + 5, cz0 + dz, Pal.CHAIN.setValue(net.minecraft.world.level.block.RotatedPillarBlock.AXIS, Direction.Axis.X));
				p.set(cellX0 + 11, g + 4, cz0 + dz, Blocks.END_ROD.defaultBlockState());
				p.set(cellX0 + 5, g + 4, cz0 + dz, Blocks.LEVER.defaultBlockState());
			}
			k.sign(cellX0 + 5, g + 5, cz0 + 10, SignKind.HIGH_RADIATION, Direction.WEST);
			// shielded access door through the 2-block lead wall (north side)
			k.doorway(cellX0 + 15, g + 1, cz0, Direction.NORTH, true);
			k.doorway(cellX0 + 15, g + 1, cz0 + 1, Direction.NORTH, false);
			k.label(cellX0 + 5, g + 6, cz0 + 10, Direction.WEST, DyeColor.YELLOW, "HOT CELL " + (c + 1));
			k.lamp(cellX0 + 12, g + UPPER - 2, cz0 + 10);
		}
		k.lamps(hx1 + 1, hz0, cellX0 + 5, hz1, g + UPPER - 1, 7);
		// ---------------------------------------------------------------- offices and stores (south and west strips)
		k.office(x0 + 2, hz1 + 2, x1 - 2, z1 - 2, g, g + UPPER);
		k.office(x0 + 2, hz1 + 2, x1 - 2, z1 - 2, g + UPPER, g + ROOF);
		k.store(x0 + 3, hz0 + 4, hx0 - 6, hz1 - 4, g, Kit.LOOT_LAB);
		k.lamps(x0 + 1, hz0, hx0 - 1, hz1, g + UPPER - 1, 7);
		for (int x = x0 + 4; x < hx0 - 4; x += 2) {
			p.fill(x, g + UPPER + 1, hz0 + 6, x, g + UPPER + 3, hz0 + 6, Painter.facing(ModBlocks.SERVER_RACK, Direction.SOUTH));
		}
		k.label(x0 + 6, g + UPPER + 3, hz0 + 5, Direction.NORTH, DyeColor.BLACK, "DATA", "ACQUISITION");
		k.lamps(x0 + 1, hz0, hx0 - 1, hz1, g + ROOF - 1, 7);
		// ---------------------------------------------------------------- entrance and circulation
		int mid = (x0 + x1) / 2;
		p.fill(mid - 2, g + 1, z0, mid + 2, g + 4, z0, Pal.GLASS);
		p.fill(mid - 1, g + 1, z0, mid + 1, g + 2, z0, Pal.AIR);
		k.label(mid, g + 6, z0 - 1, Direction.NORTH, DyeColor.PURPLE, "MERIDIAN POINT", "RESEARCH WING", "EXPERIMENTAL", "PHYSICS DIVISION");
		k.lamps(x0 + 1, z0 + 1, x1 - 1, lz0 - 1, g + UPPER - 1, 6);
		int[] floors = {g, g + UPPER};
		k.stairCore(x0 + 4, z0 + 4, floors, Pal.WALL);
		k.stairCore(x1 - 8, z0 + 4, floors, Pal.WALL);
		k.lamps(x0 + 1, z0 + 1, x1 - 1, crz0 - 1, g + ROOF - 1, 6);
		k.sign(mid + 4, g + 3, z0 - 1, SignKind.RESTRICTED, Direction.NORTH);
		for (int x = x0 + 10; x < x1 - 10; x += 30) {
			p.fill(x, g + ROOF + 1, z0 + 6, x + 4, g + ROOF + 2, z0 + 10, Pal.DUCT);
		}
	}
}
