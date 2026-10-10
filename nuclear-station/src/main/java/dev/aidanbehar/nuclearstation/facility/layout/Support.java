package dev.aidanbehar.nuclearstation.facility.layout;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.*;

import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.Direction;
import net.minecraft.world.item.DyeColor;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.FenceGateBlock;
import net.minecraft.world.level.block.state.BlockState;

/** Workshops, warehouses, the fire and security station, gatehouses and site masts. */
final class Support {
	private Support() {
	}

	static List<Component> components() {
		List<Component> list = new ArrayList<>();
		list.add(new Warehouse("warehouse_1", WAREHOUSE_X0, WAREHOUSE_Z0, WAREHOUSE_X0 + 84, WAREHOUSE_Z1, "WAREHOUSE 1", "SPARE PARTS"));
		list.add(new Warehouse("warehouse_2", WAREHOUSE_X0 + 96, WAREHOUSE_Z0, WAREHOUSE_X1, WAREHOUSE_Z1, "WAREHOUSE 2", "BULK STORES"));
		list.add(new Workshop());
		list.add(new FireStation());
		list.add(new Gatehouse("main_gate", 40, "MAIN GATE", "VISITORS REPORT", "TO RECEPTION"));
		list.add(new Gatehouse("pa_gate", PA_Z0 - 10, "PROTECTED AREA", "ACCESS POINT", "SEARCH IN PROGRESS"));
		list.add(new LatticeMast("met_mast", 960, 770, 90));
		list.add(new WaterTower("water_tower", 960, 640));
		return list;
	}

	/** Large steel-framed shed. */
	static void shed(Painter p, Kit k, int x0, int z0, int x1, int z1, int height, BlockState cladding) {
		int g = p.grade;
		p.room(x0, g, z0, x1, g + height, z1, cladding, Pal.AIR);
		p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g, Pal.CONCRETE);
		for (int x = x0; x <= x1; x += 10) {
			p.fill(x, g + 1, z0 + 1, x, g + height - 1, z0 + 1, Pal.STEEL_COLUMN);
			p.fill(x, g + 1, z1 - 1, x, g + height - 1, z1 - 1, Pal.STEEL_COLUMN);
			p.fill(x, g + height - 1, z0 + 1, x, g + height - 1, z1 - 1, Pal.GIRDER);
		}
		for (int x = x0 + 3; x < x1 - 3; x += 7) {
			p.fill(x, g + height - 5, z0, x + 3, g + height - 3, z0, Kit.pane(Pal.WINDOW, true));
			p.fill(x, g + height - 5, z1, x + 3, g + height - 3, z1, Kit.pane(Pal.WINDOW, true));
		}
		k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + height - 2, 9);
	}

	static final class Warehouse extends Component {
		private final String[] label;

		Warehouse(String name, int x0, int z0, int x1, int z1, String... label) {
			super(name, x0, z0, x1, z1);
			this.label = label;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			shed(p, k, x0, z0, x1, z1, 18, Pal.GREY);
			// pallet racking aisles
			for (int x = x0 + 4; x < x1 - 4; x += 6) {
				for (int z = z0 + 6; z < z1 - 12; z++) {
					for (int lvl = 0; lvl < 3; lvl++) {
						p.set(x, g + 1 + lvl * 3, z, Pal.slab(Blocks.SPRUCE_SLAB, false));
						p.set(x + 1, g + 1 + lvl * 3, z, Pal.slab(Blocks.SPRUCE_SLAB, false));
						if (Kit.hash(x, lvl, z, 13) < 0.55) {
							p.set(x, g + 2 + lvl * 3, z, Kit.hash(x, lvl, z, 14) < 0.5 ? Blocks.BARREL.defaultBlockState() : Pal.TANK);
						}
					}
					if (z % 8 == 0) {
						p.fill(x - 1, g + 1, z, x - 1, g + 8, z, Pal.GIRDER);
						p.fill(x + 2, g + 1, z, x + 2, g + 8, z, Pal.GIRDER);
					}
				}
				if ((x - x0) % 12 == 4) {
					k.chest(x, g + 1, z1 - 8, Direction.SOUTH, Kit.LOOT_PARTS);
					k.chest(x + 1, g + 1, z1 - 8, Direction.SOUTH, Kit.LOOT_PARTS);
				}
			}
			// loading dock doors on the south side
			for (int x = x0 + 10; x < x1 - 10; x += 24) {
				p.fill(x, g + 1, z1, x + 6, g + 7, z1, Pal.AIR);
				p.fill(x - 1, g + 1, z1, x - 1, g + 8, z1, Pal.HAZARD);
				p.fill(x + 7, g + 1, z1, x + 7, g + 8, z1, Pal.HAZARD);
			}
			k.label((x0 + x1) / 2, g + 10, z1 + 1, Direction.SOUTH, DyeColor.WHITE, label);
			k.label(x0 + 6, g + 3, z1 - 9, Direction.NORTH, DyeColor.BLACK, "ISSUE COUNTER", "SPARE PARTS", "SIGN OUT");
		}
	}

	static final class Workshop extends Component {
		Workshop() {
			super("workshop", 640, 100, 780, 200);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			shed(p, k, x0, z0, x1, z1, 16, Pal.BLUE);
			int third = (x1 - x0) / 3;
			String[] names = {"MECHANICAL", "ELECTRICAL", "I & C"};
			for (int i = 0; i < 3; i++) {
				int sx0 = x0 + 1 + i * third;
				int sx1 = sx0 + third - 2;
				if (i > 0) {
					p.fill(sx0 - 1, g + 1, z0 + 1, sx0 - 1, g + 6, z1 - 20, Pal.WALL);
					k.doorway(sx0 - 1, g + 1, z0 + 40, Direction.EAST, true);
				}
				for (int z = z0 + 6; z < z1 - 24; z += 10) {
					k.workbenchRow(sx0 + 3, z, sx1 - 3, g);
				}
				k.chest(sx0 + 2, g + 1, z1 - 22, Direction.NORTH, Kit.LOOT_WORKSHOP);
				k.chest(sx1 - 2, g + 1, z1 - 22, Direction.NORTH, i == 0 ? Kit.LOOT_PARTS : Kit.LOOT_WORKSHOP);
				k.label((sx0 + sx1) / 2, g + 3, z0 + 1, Direction.SOUTH, DyeColor.BLACK, names[i], "WORKSHOP");
				if (i == 1) {
					for (int x = sx0 + 4; x < sx1 - 4; x += 3) {
						p.set(x, g + 1, z1 - 4, Painter.facing(ModBlocks.SWITCHGEAR_CABINET, Direction.NORTH));
						p.set(x + 1, g + 1, z1 - 4, Pal.MOTOR);
					}
					k.sign(sx0 + 2, g + 3, z1 - 3, SignKind.HIGH_VOLTAGE, Direction.NORTH);
				}
				if (i == 2) {
					for (int x = sx0 + 4; x < sx1 - 4; x += 2) {
						p.set(x, g + 1, z1 - 4, Painter.facing(ModBlocks.INSTRUMENT_RACK, Direction.NORTH));
					}
				}
			}
			// overhead crane in the mechanical bay
			p.fill(x0 + 1, g + 12, z0 + 3, x0 + third - 2, g + 12, z0 + 3, Pal.GIRDER);
			p.fill(x0 + 1, g + 12, z1 - 3, x0 + third - 2, g + 12, z1 - 3, Pal.GIRDER);
			p.fill(x0 + 20, g + 13, z0 + 3, x0 + 22, g + 13, z1 - 3, Pal.GIRDER);
			// roller door
			p.fill(x0 + 10, g + 1, z1, x0 + 18, g + 8, z1, Pal.AIR);
			k.label((x0 + x1) / 2, g + 11, z1 + 1, Direction.SOUTH, DyeColor.WHITE, "MAINTENANCE", "WORKSHOPS");
			k.sign(x0 + 8, g + 3, z1 + 1, SignKind.PPE, Direction.SOUTH);
		}
	}

	static final class FireStation extends Component {
		FireStation() {
			super("fire_station", 560, 60, 636, 130);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.room(x0, g, z0, x1, g + 10, z1, Pal.WHITE, Pal.AIR);
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g, Pal.EPOXY);
			for (int i = 0; i < 3; i++) {
				int bx = x0 + 6 + i * 14;
				p.fill(bx, g + 1, z1, bx + 8, g + 7, z1, Pal.AIR);
				p.fill(bx + 1, g + 1, z0 + 10, bx + 7, g + 3, z1 - 4, Blocks.CONCRETE.pick(net.minecraft.world.item.DyeColor.RED).defaultBlockState());
				p.fill(bx + 2, g + 4, z0 + 12, bx + 6, g + 4, z1 - 8, Blocks.CONCRETE.pick(net.minecraft.world.item.DyeColor.RED).defaultBlockState());
			}
			p.walls(x1 - 26, z0 + 1, x1 - 1, z1 - 1, g + 1, g + 9, Pal.WALL);
			p.fill(x1 - 25, g + 1, z0 + 2, x1 - 2, g + 9, z1 - 2, Pal.AIR);
			k.office(x1 - 25, z0 + 2, x1 - 2, z0 + 30, g, g + 10);
			for (int z = z0 + 34; z < z1 - 4; z += 3) {
				p.set(x1 - 4, g + 1, z, Painter.facing(ModBlocks.SERVER_RACK, Direction.WEST));
			}
			k.label(x1 - 13, g + 3, z0 + 33, Direction.SOUTH, DyeColor.BLACK, "SECURITY", "CENTRAL ALARM", "STATION");
			k.doorway(x1 - 26, g + 1, z0 + 20, Direction.WEST, true);
			k.chest(x1 - 3, g + 1, z1 - 3, Direction.WEST, Kit.LOOT_PPE);
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + 9, 7);
			k.label((x0 + x1) / 2, g + 9, z1 + 1, Direction.SOUTH, DyeColor.RED, "SITE FIRE", "& RESCUE", "SECURITY");
		}
	}

	/** Checkpoint over the spine road: guard booths, barriers and turnstiles. */
	static final class Gatehouse extends Component {
		private final String[] label;

		Gatehouse(String name, int z, String... label) {
			super(name, SPINE_X0 - 14, z, SPINE_X1 + 14, z + 14);
			this.label = label;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			// canopy on columns
			for (int x : new int[] {x0, SPINE_X0 - 2, SPINE_X1 + 2, x1}) {
				p.fill(x, g + 1, z0 + 2, x, g + 7, z0 + 2, Pal.STEEL_COLUMN);
				p.fill(x, g + 1, z1 - 2, x, g + 7, z1 - 2, Pal.STEEL_COLUMN);
			}
			p.fill(x0, g + 8, z0 + 1, x1, g + 8, z1 - 1, Pal.WHITE);
			k.lamps(x0 + 1, z0 + 2, x1 - 1, z1 - 2, g + 7, 5);
			// guard booths either side of the road
			for (int bx : new int[] {x0 + 2, x1 - 9}) {
				p.room(bx, g, z0 + 4, bx + 7, g + 5, z1 - 4, Pal.WHITE, Pal.AIR);
				p.fill(bx, g + 2, z0 + 5, bx, g + 3, z1 - 5, Kit.pane(Pal.WINDOW, false));
				p.fill(bx + 7, g + 2, z0 + 5, bx + 7, g + 3, z1 - 5, Kit.pane(Pal.WINDOW, false));
				k.doorway(bx + 3, g + 1, z0 + 4, Direction.SOUTH, true);
				k.desk(bx + 3, g + 1, z0 + 8, Direction.SOUTH);
				k.lamp(bx + 3, g + 4, z0 + 7);
			}
			// barriers (fence gates) across both lanes
			BlockState gate = Blocks.SPRUCE_FENCE_GATE.defaultBlockState().setValue(FenceGateBlock.FACING, Direction.NORTH);
			p.fill(SPINE_X0, g + 1, z0 + 6, SPINE_X1, g + 1, z0 + 6, gate);
			p.fill(SPINE_X0 - 1, g, z0 + 4, SPINE_X1 + 1, g, z0 + 4, Pal.HAZARD);
			k.label((x0 + x1) / 2, g + 7, z0 + 1, Direction.NORTH, DyeColor.BLACK, label);
			k.sign(SPINE_X0 - 1, g + 4, z0 + 1, SignKind.RESTRICTED, Direction.NORTH);
			k.beacon(SPINE_X1 + 2, g + 8 + 1, z0 + 2);
		}
	}

	/** Guyed lattice meteorological mast with instrument booms. */
	static final class LatticeMast extends Component {
		private final int cx;
		private final int cz;
		private final int h;

		LatticeMast(String name, int cx, int cz, int h) {
			super(name, cx - 3, cz - 3, cx + 3, cz + 3);
			this.cx = cx;
			this.cz = cz;
			this.h = h;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.fill(cx - 2, g, cz - 2, cx + 2, g, cz + 2, Pal.CONCRETE);
			for (int y = g + 1; y <= g + h; y++) {
				p.set(cx - 1, y, cz - 1, Pal.IRON_BARS);
				p.set(cx + 1, y, cz - 1, Pal.IRON_BARS);
				p.set(cx, y, cz + 1, Pal.IRON_BARS);
				if ((y - g) % 20 == 0) {
					p.fill(cx - 3, y, cz, cx + 3, y, cz, Kit.bars(true));
					p.set(cx + 3, y + 1, cz, Blocks.LIGHTNING_ROD.waxed().unaffected().defaultBlockState());
				}
			}
			k.emergencyLamp(cx, g + h + 1, cz);
			k.label(cx, g + 2, cz - 3, Direction.NORTH, DyeColor.BLACK, "METEOROLOGICAL", "MAST", "WIND / STABILITY");
		}
	}

	static final class WaterTower extends Component {
		private final int cx;
		private final int cz;

		WaterTower(String name, int cx, int cz) {
			super(name, cx - 9, cz - 9, cx + 9, cz + 9);
			this.cx = cx;
			this.cz = cz;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			for (int[] leg : new int[][] {{-5, -5}, {5, -5}, {-5, 5}, {5, 5}}) {
				p.fill(cx + leg[0], g + 1, cz + leg[1], cx + leg[0], g + 30, cz + leg[1], Pal.STEEL_COLUMN);
			}
			p.fill(cx, g + 1, cz, cx, g + 30, cz, Pal.pipe(ModBlocks.PIPE_SERVICE, net.minecraft.core.Direction.Axis.Y));
			p.sphere(cx + 0.5, g + 36, cz + 0.5, 8, Pal.TANK);
			k.ladder(cx + 6, g + 1, g + 30, cz + 5, Direction.EAST);
			k.label(cx, g + 3, cz - 6, Direction.NORTH, DyeColor.BLACK, "FIRE WATER", "TOWER");
		}
	}
}
