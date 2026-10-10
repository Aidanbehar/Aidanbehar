package dev.aidanbehar.nuclearstation.facility.layout;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.*;

import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.facility.Feature;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.Direction;
import net.minecraft.world.item.DyeColor;

/**
 * The heat sink: circulating-water and essential-service-water pump houses drawing from
 * the ocean, the offshore intake, the discharge outfall and the cooling towers. Water
 * blocks are placed only inside closed concrete channels open to the sea at sea level,
 * so nothing can drain or flood.
 */
final class CoolingWater {
	private CoolingWater() {
	}

	static List<Component> components() {
		List<Component> list = new ArrayList<>();
		list.add(new PumpHouse("cw_pump_house", CWPH_X0, CWPH_Z0, CWPH_X1, CWPH_Z1, 4, true));
		list.add(new PumpHouse("esw_pump_house", ESW_X0, ESW_Z0, ESW_X1, ESW_Z1, 2, false));
		list.add(new Intake("cw_intake", CWPH_X0, CWPH_X1, 4));
		list.add(new Intake("esw_intake", ESW_X0 + 10, ESW_X1 - 10, 1));
		list.add(new Discharge());
		for (int i = 0; i < TOWERS.length; i++) {
			list.add(new CoolingTower(i));
		}
		list.add(new TowerPumpStation());
		list.add(new PipeRack("cw_rack_east", 600, 798, 865, 802, true));
		list.add(new PipeRack("cw_rack_north", 863, 585, 867, 798, false));
		return list;
	}

	/** Bay boundaries (x0, x1 inclusive) of n equal channels across [x0, x1]. */
	static int[][] bays(int x0, int x1, int n) {
		int width = (x1 - x0 + 1) / n;
		int[][] out = new int[n][2];
		for (int i = 0; i < n; i++) {
			out[i][0] = x0 + i * width + 3;
			out[i][1] = x0 + (i + 1) * width - 4;
		}
		return out;
	}

	/** Pump house straddling the seawall: water bays below an operating deck, pump motors above. */
	static final class PumpHouse extends Component {
		private final int pumps;
		private final boolean circulating;

		PumpHouse(String name, int x0, int z0, int x1, int z1, int pumps, boolean circulating) {
			super(name, x0, z0, x1, z1);
			this.pumps = pumps;
			this.circulating = circulating;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			int sea = p.sea;
			int bed = sea - Blueprint.DREDGE_DEPTH;
			// substructure
			p.fill(x0, bed - 2, z0, x1, g, z1, Pal.CONCRETE);
			int[][] bays = bays(x0, x1, pumps);
			for (int i = 0; i < pumps; i++) {
				int bx0 = bays[i][0];
				int bx1 = bays[i][1];
				p.fill(bx0, bed, z0 + 8, bx1, sea, z1, Pal.WATER);
				p.fill(bx0, sea + 1, z0 + 8, bx1, g - 1, z1, Pal.AIR);
				// travelling screen across the bay
				int screenZ = z1 - 10;
				p.fill(bx0, bed, screenZ, bx1, g - 1, screenZ, Kit.bars(true));
				p.fill(bx0, g, screenZ - 1, bx1, g, screenZ + 1, Pal.GRATING);
				// vertical pump column and motor on the operating deck
				int px = (bx0 + bx1) / 2;
				int pz = z0 + 14;
				p.fill(px, bed + 1, pz, px, g, pz, Pal.pipe(ModBlocks.PIPE_SEAWATER, Direction.Axis.Y));
				p.fill(px - 1, g + 1, pz - 1, px + 1, g + 2, pz + 1, Painter.facing(ModBlocks.PUMP_CASING, Direction.SOUTH));
				p.fill(px - 1, g + 3, pz - 1, px + 1, g + 5, pz + 1, Pal.MOTOR);
				p.set(px, g + 6, pz, Pal.DUCT);
				EquipmentId id = circulating ? EquipmentId.values()[EquipmentId.CW_1.ordinal() + i]
					: (i == 0 ? EquipmentId.ESW_A : EquipmentId.ESW_B);
				k.station(px + 3, g + 1, pz, Direction.WEST, id);
				k.label(px + 3, g + 2, pz, Direction.WEST, DyeColor.BLACK, Kit.wrap(id.label.toUpperCase(), 15));
				// discharge pipe north to the condenser supply
				k.pipe(ModBlocks.PIPE_SEAWATER, px, g + 2, z0 + 1, px, g + 2, pz - 2);
				p.fill(px, g - 10, z0 + 1, px, g + 1, z0 + 1, Pal.pipe(ModBlocks.PIPE_SEAWATER, Direction.Axis.Y));
				if (circulating && i == 0) {
					k.station(bx0 - 2, g + 1, screenZ, Direction.EAST, EquipmentId.INTAKE_SCREENS);
					k.label(bx0 - 2, g + 2, screenZ, Direction.EAST, DyeColor.BLACK, "TRAVELLING", "SCREENS", "WASH PANEL");
				}
			}
			// superstructure
			int roof = g + 17;
			p.walls(x0, z0, x1, z1, g + 1, roof, circulating ? Pal.BLUE : Pal.CONCRETE);
			p.floor(x0, z0, x1, z1, roof, Pal.GREY);
			for (int x = x0 + 4; x < x1; x += 6) {
				p.fill(x, g + 11, z0, x + 2, g + 12, z0, Kit.pane(Pal.WINDOW, true));
				p.fill(x, g + 11, z1, x + 2, g + 12, z1, Kit.pane(Pal.WINDOW, true));
			}
			p.fill(x0 + 1, g + 14, z0 + 2, x1 - 1, g + 14, z0 + 2, Pal.GIRDER);
			p.fill(x0 + 1, g + 14, z1 - 2, x1 - 1, g + 14, z1 - 2, Pal.GIRDER);
			p.fill((x0 + x1) / 2, g + 14, z0 + 2, (x0 + x1) / 2 + 1, g + 14, z1 - 2, Pal.GIRDER);
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, roof - 1, 8);
			k.doorway((x0 + x1) / 2, g + 1, z0, Direction.SOUTH, true);
			k.label((x0 + x1) / 2 + 2, g + 3, z0 - 1, Direction.NORTH, DyeColor.WHITE,
				circulating ? "CIRCULATING" : "ESSENTIAL", circulating ? "WATER PUMP HOUSE" : "SERVICE WATER", circulating ? "4 x 25%" : "TRAINS A / B");
			k.sign((x0 + x1) / 2 - 2, g + 3, z0 - 1, SignKind.HEARING, Direction.NORTH);
			k.sign(x0 + 2, g + 2, z0 + 1, SignKind.CRANE, Direction.SOUTH);
			p.feature(circulating ? Feature.CW_PUMP_HOUSE : Feature.INTAKE, (x0 + x1) / 2, g + 4, (z0 + z1) / 2);
		}
	}

	/** Offshore intake: concrete piers forming channels, skimmer wall and trash racks. */
	static final class Intake extends Component {
		private final int channels;

		Intake(String name, int x0, int x1, int channels) {
			super(name, x0, Blueprint.SHORE_Z, x1, 990);
			this.channels = channels;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			int sea = p.sea;
			int bed = sea - Blueprint.DREDGE_DEPTH;
			int[][] bays = bays(x0, x1, channels);
			// water through the seawall opening
			p.fill(x0, bed, Blueprint.SHORE_Z, x1, sea, Blueprint.SEA_Z + 2, Pal.WATER);
			p.fill(x0, sea + 1, Blueprint.SHORE_Z, x1, g + 1, Blueprint.SEA_Z + 2, Pal.AIR);
			p.fill(x0, bed - 1, Blueprint.SHORE_Z, x1, bed - 1, z1, Pal.CONCRETE);
			// piers between channels
			for (int i = 0; i <= channels; i++) {
				int px0 = i == 0 ? x0 : bays[i - 1][1] + 1;
				int px1 = i == channels ? x1 : bays[i][0] - 1;
				p.fill(px0, bed - 1, Blueprint.SHORE_Z, px1, g, z1, Pal.CONCRETE);
				p.fill(px0, g + 1, Blueprint.SHORE_Z, px0, g + 1, z1, Kit.bars(false));
				p.fill(px1, g + 1, Blueprint.SHORE_Z, px1, g + 1, z1, Kit.bars(false));
				for (int z = Blueprint.SHORE_Z + 20; z <= z1; z += 30) {
					Infrastructure.lampPost(p, k, (px0 + px1) / 2, z);
				}
			}
			for (int[] bay : bays) {
				// skimmer (curtain) wall stops floating debris; trash rack behind it
				p.fill(bay[0], sea - 2, z1 - 3, bay[1], g, z1, Pal.CONCRETE);
				p.fill(bay[0], bed, z1 - 8, bay[1], sea, z1 - 8, Kit.bars(true));
				p.fill(bay[0], g, z1 - 9, bay[1], g, z1 - 7, Pal.GRATING);
			}
			k.sign(x0 + 1, g + 2, z1 + 1, SignKind.NO_ENTRY, Direction.SOUTH);
			p.feature(Feature.INTAKE, (x0 + x1) / 2, sea, (Blueprint.SEA_Z + z1) / 2);
		}
	}

	/** Seal well and outfall channel returning warmed circulating water to the sea. */
	static final class Discharge extends Component {
		Discharge() {
			super("discharge", DIS_X0, 826, DIS_X1, 1000);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			int sea = p.sea;
			int bed = sea - Blueprint.DREDGE_DEPTH;
			int c0 = DIS_X0 + 10;
			int c1 = DIS_X1 - 10;
			// seal well
			p.fill(DIS_X0, bed - 2, 830, DIS_X1, g + 2, 862, Pal.CONCRETE);
			p.fill(c0, bed, 836, c1, sea, 862, Pal.WATER);
			p.fill(c0, sea + 1, 836, c1, g + 2, 862, Pal.AIR);
			p.fill(c0 + 2, sea + 1, 846, c1 - 2, sea + 2, 846, Pal.CONCRETE); // overflow weir
			k.railing(c0, 835, c1, 835, g + 3);
			// outfall channel walls through the seawall and out to sea
			p.fill(c0 - 3, bed - 2, 862, c0 - 1, g + 1, z1, Pal.CONCRETE);
			p.fill(c1 + 1, bed - 2, 862, c1 + 3, g + 1, z1, Pal.CONCRETE);
			p.fill(c0, bed, 862, c1, sea, z1, Pal.WATER);
			p.fill(c0, sea + 1, 862, c1, g + 1, Blueprint.SEA_Z + 2, Pal.AIR);
			p.fill(c0, bed - 1, 830, c1, bed - 1, z1, Pal.CONCRETE);
			k.railing(c0 - 2, 862, c0 - 2, z1, g + 2);
			k.railing(c1 + 2, 862, c1 + 2, z1, g + 2);
			// return pipes from the cooling-water rack enter the seal well
			for (int x = c0 + 4; x <= c1 - 4; x += 8) {
				k.pipe(ModBlocks.PIPE_SEAWATER, x, g + 4, 804, x, g + 4, 836);
				p.fill(x, sea + 2, 836, x, g + 3, 836, Pal.pipe(ModBlocks.PIPE_SEAWATER, Direction.Axis.Y));
			}
			k.label((c0 + c1) / 2, g + 3, 829, Direction.NORTH, DyeColor.WHITE, "DISCHARGE", "SEAL WELL", "THERMAL OUTFALL");
			k.sign(c0, g + 3, 829, SignKind.NO_ENTRY, Direction.NORTH);
			p.feature(Feature.DISCHARGE, (c0 + c1) / 2, sea, 940);
		}
	}

	/** Natural-draft hyperboloid cooling tower with cold-water basin, support legs and fill. */
	static final class CoolingTower extends Component {
		private final int index;
		private final int cx;
		private final int cz;

		CoolingTower(int index) {
			super("cooling_tower_" + (index + 1), TOWERS[index][0] - TOWER_BASE_R - 3, TOWERS[index][1] - TOWER_BASE_R - 3,
				TOWERS[index][0] + TOWER_BASE_R + 3, TOWERS[index][1] + TOWER_BASE_R + 3);
			this.index = index;
			this.cx = TOWERS[index][0];
			this.cz = TOWERS[index][1];
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			double r = TOWER_BASE_R;
			// cold water basin (below grade, fully enclosed)
			p.cylinder(cx, cz, r + 2, g - 4, g - 3, Pal.CONCRETE);
			p.ring(cx, cz, r + 2, r, g - 2, g + 1, Pal.CONCRETE);
			p.cylinder(cx, cz, r, g - 2, g - 1, Pal.WATER);
			p.cylinder(cx, cz, r, g, g + 9, Pal.AIR);
			// support columns (the shell is carried on raking legs above the air inlet)
			for (int a = 0; a < 72; a++) {
				double ang = a * Math.PI * 2 / 72;
				int lx = (int) Math.floor(cx + Math.cos(ang) * (r - 1));
				int lz = (int) Math.floor(cz + Math.sin(ang) * (r - 1));
				p.fill(lx, g - 2, lz, lx, g + 9, lz, Pal.CONCRETE);
			}
			// shell
			int y0 = g + 10;
			int height = TOWER_HEIGHT - 10;
			p.hyperboloid(cx, cz, y0, height, r, 31, 34, 110, 1.6, Pal.CONCRETE);
			// fill packing and hot water distribution
			p.cylinder(cx, cz, r - 4, g + 6, g + 6, Pal.GRATING);
			p.cylinder(cx, cz, r - 4, g + 7, g + 7, Pal.AIR);
			k.pipe(ModBlocks.PIPE_SEAWATER, cx - (int) r + 5, g + 8, cz, cx + (int) r - 5, g + 8, cz);
			k.pipe(ModBlocks.PIPE_SEAWATER, cx, g + 8, cz - (int) r + 5, cx, g + 8, cz + (int) r - 5);
			p.fill(cx, g - 2, cz, cx, g + 7, cz, Pal.pipe(ModBlocks.PIPE_SEAWATER, Direction.Axis.Y));
			// aviation obstruction lights on the rim
			int top = y0 + height;
			for (int a = 0; a < 8; a++) {
				double ang = a * Math.PI / 4;
				k.emergencyLamp((int) Math.floor(cx + Math.cos(ang) * 33), top + 1, (int) Math.floor(cz + Math.sin(ang) * 33));
			}
			// basin access and signage
			k.label(cx, g + 2, cz - (int) r - 3, Direction.NORTH, DyeColor.WHITE, "COOLING TOWER " + (index + 1), "NATURAL DRAUGHT", "NO ENTRY WHEN", "IN SERVICE");
			k.sign(cx + 2, g + 2, cz - (int) r - 3, SignKind.NO_ENTRY, Direction.NORTH);
			p.feature(Feature.values()[Feature.COOLING_TOWER_1.ordinal() + index], cx, top, cz);
		}
	}

	/** Pump and valve station for the cooling-tower circuit. */
	static final class TowerPumpStation extends Component {
		TowerPumpStation() {
			super("tower_pump_station", 840, 545, 890, 585);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.room(x0, g - 8, z0, x1, g + 10, z1, Pal.CONCRETE, Pal.AIR);
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g, Pal.GRATING);
			for (int i = 0; i < 4; i++) {
				int px = x0 + 7 + i * 12;
				p.fill(px - 1, g - 7, z0 + 10, px + 1, g - 5, z0 + 12, Painter.facing(ModBlocks.PUMP_CASING, Direction.NORTH));
				p.fill(px, g - 4, z0 + 11, px, g + 1, z0 + 11, Pal.pipe(ModBlocks.PIPE_SEAWATER, Direction.Axis.Y));
				p.fill(px - 1, g + 1, z0 + 10, px + 1, g + 3, z0 + 12, Pal.MOTOR);
				k.pipe(ModBlocks.PIPE_SEAWATER, px, g - 6, z0 + 13, px, g - 6, z1 - 1);
				k.label(px, g + 2, z0 + 9, Direction.NORTH, DyeColor.BLACK, "TOWER", "LIFT PUMP " + (i + 1));
			}
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + 9, 8);
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g - 1, 10);
			k.ladder(x0 + 1, g - 7, g - 1, z0 + 1, Direction.SOUTH);
			p.set(x0 + 1, g, z0 + 1, Pal.AIR);
			k.doorway((x0 + x1) / 2, g + 1, z0, Direction.SOUTH, true);
			k.label((x0 + x1) / 2 + 2, g + 3, z0 - 1, Direction.NORTH, DyeColor.WHITE, "COOLING TOWER", "PUMP & VALVE", "STATION");
		}
	}

	/** Steel pipe rack carrying circulating-water mains overhead. */
	static final class PipeRack extends Component {
		private final boolean alongX;

		PipeRack(String name, int x0, int z0, int x1, int z1, boolean alongX) {
			super(name, x0, z0, x1, z1);
			this.alongX = alongX;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			if (alongX) {
				for (int x = x0; x <= x1; x += 8) {
					p.fill(x, g + 1, z0, x, g + 6, z0, Pal.STEEL_COLUMN);
					p.fill(x, g + 1, z1, x, g + 6, z1, Pal.STEEL_COLUMN);
					p.fill(x, g + 6, z0, x, g + 6, z1, Pal.GIRDER);
				}
				k.pipe(ModBlocks.PIPE_SEAWATER, x0, g + 7, z0 + 1, x1, g + 7, z0 + 1);
				k.pipe(ModBlocks.PIPE_SEAWATER, x0, g + 7, z1 - 1, x1, g + 7, z1 - 1);
				k.tray(x0, (z0 + z1) / 2, x1, (z0 + z1) / 2, g + 8);
			} else {
				for (int z = z0; z <= z1; z += 8) {
					p.fill(x0, g + 1, z, x0, g + 6, z, Pal.STEEL_COLUMN);
					p.fill(x1, g + 1, z, x1, g + 6, z, Pal.STEEL_COLUMN);
					p.fill(x0, g + 6, z, x1, g + 6, z, Pal.GIRDER);
				}
				k.pipe(ModBlocks.PIPE_SEAWATER, x0 + 1, g + 7, z0, x0 + 1, g + 7, z1);
				k.pipe(ModBlocks.PIPE_SEAWATER, x1 - 1, g + 7, z0, x1 - 1, g + 7, z1);
				k.tray((x0 + x1) / 2, z0, (x0 + x1) / 2, z1, g + 8);
			}
		}
	}
}
