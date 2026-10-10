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
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.RotatedPillarBlock;
import net.minecraft.world.level.block.state.BlockState;

/** Transformer yard, 400 kV switchyard and transmission line, and the emergency diesel generator buildings. */
final class Electrical {
	private Electrical() {
	}

	static List<Component> components() {
		List<Component> list = new ArrayList<>();
		list.add(new TransformerYard());
		list.add(new Switchyard());
		list.add(new TransmissionTower("line_tower_1", 52, 650));
		list.add(new TransmissionTower("line_tower_2", 52, 790));
		list.add(new DieselBuilding("edg_a", EDGA_X0, EDGA_Z0, EDGA_X1, EDGA_Z1, 0));
		list.add(new DieselBuilding("edg_b", EDGB_X0, EDGB_Z0, EDGB_X1, EDGB_Z1, 1));
		return list;
	}

	static BlockState chain(Direction.Axis axis) {
		return Pal.CHAIN.setValue(RotatedPillarBlock.AXIS, axis);
	}

	/** Main generator step-up transformers, unit auxiliary and station service transformers. */
	static final class TransformerYard extends Component {
		TransformerYard() {
			super("transformer_yard", GSU_X0, GSU_Z0, GSU_X1, GSU_Z1);
		}

		private void transformer(Painter p, Kit k, int x0, int z0, int length, int height, EquipmentId id, String label) {
			int g = p.grade;
			p.fill(x0 - 2, g, z0 - 2, x0 + length + 1, g, z0 + 9, Pal.CONCRETE);
			p.fill(x0, g + 1, z0, x0 + length - 1, g + height, z0 + 7, Pal.TRANSFORMER);
			p.fill(x0 + 1, g + 1, z0 - 1, x0 + length - 2, g + height - 1, z0 - 1, Pal.RADIATOR);
			p.fill(x0 + 1, g + 1, z0 + 8, x0 + length - 2, g + height - 1, z0 + 8, Pal.RADIATOR);
			for (int i = 0; i < 3; i++) {
				int bx = x0 + 2 + i * Math.max(2, (length - 4) / 2);
				p.fill(bx, g + height + 1, z0 + 3, bx, g + height + 4, z0 + 3, Blocks.END_ROD.defaultBlockState());
				p.set(bx, g + height + 5, z0 + 3, Blocks.LIGHTNING_ROD.waxed().unaffected().defaultBlockState());
			}
			k.pipe(ModBlocks.PIPE_SERVICE, x0 - 1, g + height + 1, z0 - 1, x0 + length, g + height + 1, z0 - 1);
			k.station(x0 - 2, g + 1, z0 + 4, Direction.WEST, id);
			k.label(x0 - 2, g + 2, z0 + 4, Direction.WEST, DyeColor.YELLOW, label);
			k.sign(x0 - 1, g + 3, z0 + 6, SignKind.HIGH_VOLTAGE, Direction.WEST);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.fill(x0, g, z0, x1, g, z1, Pal.GRAVEL);
			transformer(p, k, x0 + 14, z0 + 6, 14, 9, EquipmentId.GSU, Kit.wrap("MAIN TRANSFORMER PHASE A", 15)[0]);
			transformer(p, k, x0 + 14, z0 + 24, 14, 9, EquipmentId.GSU, "PHASE B");
			transformer(p, k, x0 + 14, z0 + 42, 14, 9, EquipmentId.GSU, "PHASE C");
			transformer(p, k, x0 + 18, z0 + 64, 10, 7, EquipmentId.UAT, "UNIT AUX TX");
			transformer(p, k, x0 + 18, z0 + 86, 10, 7, EquipmentId.SST, "STATION SVC TX");
			// fire walls between transformers
			for (int z : new int[] {z0 + 19, z0 + 37, z0 + 57, z0 + 79}) {
				p.fill(x0 + 10, g + 1, z, x0 + 34, g + 11, z, Pal.CONCRETE);
			}
			// isolated phase bus duct from the generator terminals in the turbine hall
			for (int i = 0; i < 3; i++) {
				int z = z0 + 9 + i * 18;
				p.fill(x0 + 28, g + 12, z, TH_X0, g + 12, z, Pal.DUCT);
				p.fill(x0 + 28, g + 10, z, x0 + 28, g + 11, z, Pal.DUCT);
			}
			p.fill(x0 + 26, g + 12, z0 + 9, x0 + 26, g + 12, z0 + 68, Pal.DUCT);
			// overhead line to the switchyard
			for (int z : new int[] {z0 + 20, z0 + 30, z0 + 40}) {
				p.fill(x0 + 2, g + 1, z, x0 + 2, g + 17, z, Pal.STEEL_COLUMN);
				p.fill(SY_X1, g + 18, z, x0 + 2, g + 18, z, chain(Direction.Axis.X));
			}
			p.fill(x0 + 2, g + 17, z0 + 20, x0 + 2, g + 17, z0 + 40, Pal.GIRDER);
			Infrastructure.lampPost(p, k, x0 + 6, z0 + 2);
			Infrastructure.lampPost(p, k, x0 + 6, z1 - 2);
			p.feature(Feature.MAIN_TRANSFORMER, x0 + 21, g + 5, z0 + 28);
		}
	}

	/** Air-insulated 400 kV switchyard: gantries, breakers, disconnectors and busbars. */
	static final class Switchyard extends Component {
		Switchyard() {
			super("switchyard", SY_X0, SY_Z0, SY_X1, SY_Z1);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.fill(x0, g, z0, x1, g, z1, Pal.GRAVEL);
			// boundary fence
			p.fill(x0, g + 1, z0, x1, g + 3, z0, Kit.bars(true));
			p.fill(x0, g + 1, z1, x1, g + 3, z1, Kit.bars(true));
			p.fill(x0, g + 1, z0, x0, g + 3, z1, Kit.bars(false));
			p.fill(x1, g + 1, z0, x1, g + 3, z1, Kit.bars(false));
			p.fill(x1, g + 1, 698, x1, g + 3, 710, Pal.AIR);
			for (int bay = 0; bay < 6; bay++) {
				int bz = z0 + 14 + bay * 36;
				// gantry
				for (int x : new int[] {x0 + 8, x1 - 50}) {
					p.fill(x, g + 1, bz - 6, x, g + 16, bz - 6, Pal.STEEL_COLUMN);
					p.fill(x, g + 1, bz + 6, x, g + 16, bz + 6, Pal.STEEL_COLUMN);
					p.fill(x, g + 16, bz - 6, x, g + 16, bz + 6, Pal.GIRDER);
				}
				// busbars, breakers and disconnectors per phase
				for (int ph = -1; ph <= 1; ph++) {
					int z = bz + ph * 4;
					p.fill(x0 + 8, g + 15, z, x1 - 50, g + 15, z, chain(Direction.Axis.X));
					for (int x = x0 + 30; x < x1 - 60; x += 28) {
						p.fill(x, g, z - 1, x + 3, g, z + 1, Pal.CONCRETE);
						p.fill(x, g + 1, z, x + 1, g + 4, z, Painter.facing(ModBlocks.SWITCHGEAR_CABINET, Direction.SOUTH));
						p.fill(x + 2, g + 5, z, x + 2, g + 8, z, Blocks.END_ROD.defaultBlockState());
						p.fill(x + 8, g + 1, z, x + 8, g + 10, z, Kit.bars(false));
						p.fill(x + 8, g + 11, z, x + 8, g + 14, z, Blocks.END_ROD.defaultBlockState());
					}
				}
				Infrastructure.lampPost(p, k, x1 - 40, bz);
			}
			// lightning masts
			for (int[] c : new int[][] {{x0 + 3, z0 + 3}, {x1 - 3, z0 + 3}, {x0 + 3, z1 - 3}, {x1 - 3, z1 - 3}}) {
				p.fill(c[0], g + 1, c[1], c[0], g + 26, c[1], Blocks.POLISHED_DEEPSLATE_WALL.defaultBlockState());
				p.set(c[0], g + 27, c[1], Blocks.LIGHTNING_ROD.waxed().unaffected().defaultBlockState());
			}
			// relay & control house
			int hx0 = x1 - 40;
			int hz0 = z0 + 4;
			p.room(hx0, g, hz0, hx0 + 30, g + 7, hz0 + 16, Pal.CONCRETE, Pal.AIR);
			p.floor(hx0 + 1, hz0 + 1, hx0 + 29, hz0 + 15, g, Pal.EPOXY);
			for (int x = hx0 + 2; x <= hx0 + 28; x += 2) {
				p.set(x, g + 1, hz0 + 1, Painter.facing(ModBlocks.SWITCHGEAR_CABINET, Direction.SOUTH));
				p.set(x, g + 2, hz0 + 1, Painter.facing(ModBlocks.INSTRUMENT_RACK, Direction.SOUTH));
				k.panel(x, g + 1, hz0 + 15, Direction.NORTH);
			}
			k.lamps(hx0 + 1, hz0 + 1, hx0 + 29, hz0 + 15, g + 6, 6);
			k.doorway(hx0 + 15, g + 1, hz0 + 16, Direction.NORTH, true);
			k.label(hx0 + 17, g + 3, hz0 + 17, Direction.SOUTH, DyeColor.YELLOW, "400 kV", "SWITCHYARD", "RELAY HOUSE");
			k.sign(hx0 + 13, g + 3, hz0 + 17, SignKind.HIGH_VOLTAGE, Direction.SOUTH);
			k.sign(x1 + 1, g + 2, 704, SignKind.HIGH_VOLTAGE, Direction.EAST);
			k.label(x1 + 1, g + 3, 706, Direction.EAST, DyeColor.YELLOW, "DANGER", "400 000 VOLTS", "KEEP OUT");
			p.feature(Feature.SWITCHYARD, (x0 + x1) / 2, g + 10, (z0 + z1) / 2);
		}
	}

	/** Lattice transmission tower carrying the two outgoing 400 kV circuits off site. */
	static final class TransmissionTower extends Component {
		private final int cx;
		private final int cz;

		TransmissionTower(String name, int cx, int cz) {
			super(name, 0, cz - 12, SY_X0 + 2, cz + 12);
			this.cx = cx;
			this.cz = cz;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			int h = 44;
			for (int dy = 0; dy <= h; dy++) {
				int w = (int) Math.round(4 - 3.0 * dy / h);
				BlockState leg = Pal.IRON_BARS;
				p.set(cx - w, g + 1 + dy, cz - w, leg);
				p.set(cx + w, g + 1 + dy, cz - w, leg);
				p.set(cx - w, g + 1 + dy, cz + w, leg);
				p.set(cx + w, g + 1 + dy, cz + w, leg);
				if (dy % 6 == 3) {
					p.fill(cx - w, g + 1 + dy, cz - w, cx + w, g + 1 + dy, cz - w, Kit.bars(true));
					p.fill(cx - w, g + 1 + dy, cz + w, cx + w, g + 1 + dy, cz + w, Kit.bars(true));
				}
			}
			for (int arm : new int[] {g + 30, g + 38}) {
				p.fill(cx, arm, cz - 10, cx, arm, cz + 10, Pal.GIRDER);
				for (int dz : new int[] {-9, 0, 9}) {
					p.set(cx, arm - 1, cz + dz, Pal.CHAIN);
					p.set(cx, arm - 2, cz + dz, Pal.CHAIN);
					// conductors west to the site boundary and east to the switchyard gantry
					p.fill(0, arm - 3, cz + dz, SY_X0 + 2, arm - 3, cz + dz, chain(Direction.Axis.X));
				}
			}
			p.set(cx, g + h + 2, cz, Blocks.LIGHTNING_ROD.waxed().unaffected().defaultBlockState());
			p.fill(cx - 5, g, cz - 5, cx + 5, g, cz + 5, Pal.CONCRETE);
			k.sign(cx - 5, g + 2, cz, SignKind.HIGH_VOLTAGE, Direction.WEST);
		}
	}

	/** Emergency diesel generator building (one per safety train) with its fuel oil tank. */
	static final class DieselBuilding extends Component {
		private final int train;

		private final int bz0;
		private final int bz1;

		DieselBuilding(String name, int x0, int z0, int x1, int z1, int train) {
			// train A's fuel oil tank sits south of the building, train B's to the north
			super(name, x0, train == 0 ? z0 : z0 - 16, x1, train == 0 ? z1 + 16 : z1);
			this.train = train;
			this.bz0 = z0;
			this.bz1 = z1;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			int z1 = bz1;
			String t = train == 0 ? "A" : "B";
			p.room(x0, g - 1, bz0, x1, g + 14, z1, Pal.CONCRETE, Pal.AIR);
			p.floor(x0 + 1, bz0 + 1, x1 - 1, z1 - 1, g, Pal.EPOXY);
			int ex0 = x0 + 8;
			int ex1 = x1 - 14;
			int ez = (bz0 + z1) / 2;
			// engine block on its seismic plinth, generator at the drive end
			p.fill(ex0 - 1, g + 1, ez - 4, x1 - 6, g + 1, ez + 4, Pal.DARK_CONCRETE);
			p.fill(ex0, g + 2, ez - 3, ex1, g + 6, ez + 3, Pal.DIESEL);
			p.fill(ex0 + 2, g + 7, ez - 2, ex1 - 2, g + 7, ez + 2, Pal.STEEL_FLOOR);
			p.cylinderX(ex1 + 1, x1 - 7, g + 5, ez + 0.5, 3.5, Pal.GENERATOR);
			k.catwalk(ex0, ez - 6, ex1, ez - 6, g + 5);
			k.ladder(ex0 - 1, g + 1, g + 5, ez - 6, Direction.EAST);
			// exhaust stacks through the roof
			for (int sx : new int[] {ex0 + 4, ex1 - 4}) {
				p.fill(sx, g + 8, ez, sx, g + 22, ez, Pal.pipe(ModBlocks.PIPE_SERVICE, Direction.Axis.Y));
			}
			// radiators and air intake louvres
			p.fill(x1, g + 4, bz0 + 4, x1, g + 10, z1 - 4, Kit.bars(false));
			p.fill(x0, g + 4, bz0 + 4, x0, g + 10, z1 - 4, Kit.bars(false));
			// day tank, control panel, local station
			p.cylinder(x0 + 4, bz0 + 4, 2, g + 1, g + 6, Pal.TANK);
			k.station(x1 - 3, g + 1, bz0 + 2, Direction.SOUTH, train == 0 ? EquipmentId.EDG_A : EquipmentId.EDG_B);
			for (int x = x1 - 9; x <= x1 - 5; x++) {
				k.panel(x, g + 1, bz0 + 1, Direction.SOUTH);
				k.panel(x, g + 2, bz0 + 1, Direction.SOUTH);
			}
			k.label(x1 - 4, g + 3, bz0 + 1, Direction.SOUTH, DyeColor.BLACK, "EDG " + t, "LOCAL CONTROL", "START: AUTO");
			k.lamps(x0 + 1, bz0 + 1, x1 - 1, z1 - 1, g + 13, 7);
			k.emergencyLamp(x0 + 2, g + 12, bz0 + 2);
			k.emergencyLamp(x1 - 2, g + 12, z1 - 2);
			k.doorway(x0 + 4, g + 1, bz0, Direction.SOUTH, true);
			k.label(x0 + 6, g + 3, bz0 - 1, Direction.NORTH, DyeColor.WHITE, "EMERGENCY", "DIESEL GEN " + t, "SAFETY TRAIN " + t, "7 MW 4.16 kV");
			k.sign(x0 + 2, g + 3, bz0 - 1, SignKind.HEARING, Direction.NORTH);
			k.sign(x0 + 8, g + 3, bz0 - 1, SignKind.FIRE, Direction.NORTH);
			// bunded fuel oil storage tank outside
			int tx = (x0 + x1) / 2;
			int tz = train == 0 ? bz1 + 9 : bz0 - 9;
			p.walls(tx - 8, tz - 6, tx + 8, tz + 6, g + 1, g + 2, Pal.CONCRETE);
			p.cylinder(tx, tz, 4.5, g + 1, g + 7, Pal.TANK);
			if (train == 0) {
				k.pipe(ModBlocks.PIPE_SERVICE, tx, g + 3, bz1, tx, g + 3, tz - 5);
			} else {
				k.pipe(ModBlocks.PIPE_SERVICE, tx, g + 3, tz + 5, tx, g + 3, bz0);
			}
			k.label(tx, g + 3, tz - 7, Direction.NORTH, DyeColor.BLACK, "FUEL OIL", "STORAGE " + t, "7 DAYS");
			p.feature(train == 0 ? Feature.DIESEL_A : Feature.DIESEL_B, (ex0 + ex1) / 2, g + 4, ez);
		}
	}
}
