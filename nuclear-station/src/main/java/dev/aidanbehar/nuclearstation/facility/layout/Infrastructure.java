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
import net.minecraft.world.level.block.state.BlockState;

/** Roads, parking, rail, seawall, street lighting, fences and the underground utility galleries. */
final class Infrastructure {
	private Infrastructure() {
	}

	/** Road segment: axis-aligned asphalt strip with kerbs and a dashed centre line. */
	static final class Road extends Component {
		private final boolean alongX;

		Road(String name, int x0, int z0, int x1, int z1) {
			super(name, x0, z0, x1, z1);
			this.alongX = (x1 - x0) >= (z1 - z0);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.fill(x0, g, z0, x1, g, z1, Pal.ROAD);
			p.fill(x0, g - 1, z0, x1, g - 1, z1, Pal.GRAVEL);
			if (alongX) {
				int mid = (z0 + z1) / 2;
				for (int x = x0; x <= x1; x++) {
					if ((x / 4) % 2 == 0) {
						p.set(x, g, mid, Pal.ROAD_YELLOW);
					}
				}
				p.fill(x0, g, z0, x1, g, z0, Pal.CURB);
				p.fill(x0, g, z1, x1, g, z1, Pal.CURB);
				for (int x = x0 + 12; x <= x1; x += 28) {
					lampPost(p, k, x, z0 - 2);
				}
			} else {
				int mid = (x0 + x1) / 2;
				for (int z = z0; z <= z1; z++) {
					if ((z / 4) % 2 == 0) {
						p.set(mid, g, z, Pal.ROAD_YELLOW);
					}
				}
				p.fill(x0, g, z0, x0, g, z1, Pal.CURB);
				p.fill(x1, g, z0, x1, g, z1, Pal.CURB);
				for (int z = z0 + 12; z <= z1; z += 28) {
					lampPost(p, k, x0 - 2, z);
				}
			}
		}
	}

	static void lampPost(Painter p, Kit k, int x, int z) {
		int g = p.grade;
		BlockState post = Blocks.POLISHED_DEEPSLATE_WALL.defaultBlockState();
		p.fill(x, g + 1, z, x, g + 5, z, post);
		k.lamp(x, g + 6, z);
		p.set(x, g + 7, z, Pal.STEEL_COLUMN);
		p.set(x, g + 8, z, Pal.slab(Blocks.SMOOTH_STONE_SLAB, false));
	}

	/** Parking lot with painted bays. */
	static final class Parking extends Component {
		Parking(String name, int x0, int z0, int x1, int z1) {
			super(name, x0, z0, x1, z1);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.fill(x0, g, z0, x1, g, z1, Pal.ROAD);
			for (int z = z0 + 2; z <= z1 - 2; z += 14) {
				for (int x = x0 + 1; x <= x1 - 1; x += 3) {
					p.fill(x, g, z, x, g, z + 4, Pal.ROAD_LINE);
					p.fill(x, g, z + 8, x, g, z + 12, Pal.ROAD_LINE);
				}
			}
			for (int x = x0 + 8; x <= x1; x += 24) {
				for (int z = z0 + 7; z <= z1; z += 28) {
					lampPost(p, k, x, z);
				}
			}
			p.walls(x0, z0, x1, z1, g, g, Pal.CURB);
		}
	}

	/** Paved hard-standing (yards, aprons). */
	static final class Paving extends Component {
		private final BlockState surface;

		Paving(String name, int x0, int z0, int x1, int z1, BlockState surface) {
			super(name, x0, z0, x1, z1);
			this.surface = surface;
		}

		@Override
		public void paint(Painter p, Kit k) {
			p.fill(x0, p.grade, z0, x1, p.grade, z1, surface);
		}
	}

	/** Railway siding on a gravel bed. */
	static final class Railway extends Component {
		Railway(String name, int x0, int z0, int x1, int z1) {
			super(name, x0, z0, x1, z1);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.fill(x0 - (z0 == z1 ? 0 : 1), g, z0 - (z0 == z1 ? 1 : 0), x1 + (z0 == z1 ? 0 : 1), g, z1 + (z0 == z1 ? 1 : 0), Pal.GRAVEL);
			k.rail(x0, z0, x1, z1, g + 1);
		}
	}

	/** Seawall along the ocean frontage, with armour stone on the seaward face and openings for water structures. */
	static final class Seawall extends Component {
		Seawall() {
			super("seawall", 0, Blueprint.SHORE_Z, Blueprint.SIZE - 1, Blueprint.SEA_Z + 6);
		}

		static boolean opening(int x) {
			return x >= ESW_X0 + 10 && x <= ESW_X1 - 10 || x >= CWPH_X0 && x <= CWPH_X1 || x >= DIS_X0 + 10 && x <= DIS_X1 - 10;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			int bed = p.sea - Blueprint.DREDGE_DEPTH;
			for (int x = x0; x <= x1; x++) {
				if (opening(x)) {
					continue;
				}
				p.fill(x, bed - 2, Blueprint.SHORE_Z, x, g, Blueprint.SHORE_Z + 9, Pal.CONCRETE);
				p.fill(x, g + 1, Blueprint.SHORE_Z + 9, x, g + 1, Blueprint.SHORE_Z + 9, Pal.CONCRETE);
				p.set(x, g, Blueprint.SHORE_Z + 3, Pal.PAVING);
				// stepped armour-stone revetment down to the dredged bed
				for (int i = 0; i < 6; i++) {
					int top = g - 1 - i * 2;
					p.fill(x, bed, Blueprint.SHORE_Z + 10 + i, x, Math.max(bed, top), Blueprint.SHORE_Z + 10 + i, Pal.ARMOUR_STONE);
				}
				p.set(x, g + 2, Blueprint.SHORE_Z + 9, Kit.bars(true));
				if (x % 32 == 0) {
					lampPost(p, k, x, Blueprint.SHORE_Z + 6);
				}
			}
		}
	}

	static List<Component> groundworks() {
		List<Component> list = new ArrayList<>();
		list.add(new Seawall());
		// roads
		list.add(new Road("spine_road", SPINE_X0, 0, SPINE_X1, 820));
		list.add(new Road("north_ring", 32, 32, 992, 40));
		list.add(new Road("south_ring", 32, 812, 992, 820));
		list.add(new Road("west_ring", 32, 32, 40, 820));
		list.add(new Road("east_ring", 984, 32, 992, 820));
		list.add(new Road("pa_north_road", 40, 280, 984, 288));
		list.add(new Road("pa_mid_road", 290, 476, 708, 484));
		list.add(new Road("pa_west_road", 290, 288, 298, 812));
		list.add(new Road("pa_east_road", 700, 288, 708, 812));
		list.add(new Road("research_road", 40, 160, 100, 168));
		list.add(new Road("warehouse_road", 640, 230, 984, 238));
		list.add(new Road("tower_road", 708, 400, 984, 408));
		list.add(new Parking("parking_main", 300, 60, 490, 180));
		list.add(new Parking("parking_research", 44, 60, 96, 150));
		list.add(new Paving("warehouse_apron", 800, 222, 980, 229, Pal.PAVING));
		list.add(new Paving("pa_plaza", 440, 290, 600, 306, Pal.PAVING));
		list.add(new Railway("rail_main", 640, 48, Blueprint.SIZE - 1, 48));
		list.add(new Railway("rail_spur_south", 996, 49, 996, 600));
		list.add(new Railway("rail_spur_west", 640, 600, 995, 600));
		return list;
	}

	// ------------------------------------------------------------------ underground galleries

	/**
	 * The utility tunnel network: cable and pipe galleries that link the plant's buildings
	 * underground. All segments are painted as one component so that intersections
	 * stay open (all shells are drawn before any interior is cleared).
	 */
	static final class TunnelNetwork extends Component {
		record Seg(String label, int x0, int z0, int x1, int z1) {
		}

		/** Access shaft at (x, z) with the box (x/z ranges) carved through to the gallery at its foot. */
		record Shaft(String label, int x, int z, int cx0, int cz0, int cx1, int cz1) {
		}

		static final List<Seg> SEGMENTS = List.of(
			new Seg("GALLERY T1 EAST-WEST", 120, 473, 960, 481),
			new Seg("GALLERY T2 WEST", 379, 150, 387, 860),
			new Seg("GALLERY T3 EAST", 739, 150, 747, 860),
			new Seg("GALLERY T4 SOUTH", 379, 821, 747, 829),
			new Seg("BRANCH TO CONTROL BLDG", 498, 404, 506, 481),
			new Seg("BRANCH TO EDG A", 320, 481, 328, 500),
			new Seg("BRANCH TO SWITCHYARD", 200, 700, 387, 708),
			new Seg("BRANCH TO RESEARCH", 120, 270, 128, 481),
			new Seg("BRANCH TO TOWERS", 747, 404, 860, 412),
			new Seg("BRANCH TO PUMP HOUSE", 460, 829, 468, 845),
			new Seg("BRANCH TO ESW", 330, 821, 387, 829),
			new Seg("BRANCH TO ESW", 330, 829, 338, 845));

		static final List<Shaft> SHAFTS = List.of(
			new Shaft("T1/T2 JUNCTION", 389, 462, 389, 471, 392, 473),
			new Shaft("T1/T3 JUNCTION", 749, 462, 749, 471, 752, 473),
			new Shaft("T2 NORTH PORTAL", 389, 152, 388, 152, 388, 155),
			new Shaft("T3 NORTH PORTAL", 749, 152, 748, 152, 748, 155),
			new Shaft("RESEARCH PORTAL", 130, 300, 129, 300, 129, 303),
			new Shaft("SWITCHYARD PORTAL", 202, 688, 202, 697, 205, 700),
			new Shaft("T4 SOUTH PORTAL", 560, 836, 560, 829, 563, 835));

		/** Extra openings carved after the network (into building stair wells). */
		static final List<int[]> LINKS = List.of(new int[] {493, 405, 497, 407});

		TunnelNetwork() {
			super("tunnel_network", 110, 140, 970, 870);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int floor = p.grade + TUNNEL_FLOOR;
			for (Seg s : SEGMENTS) {
				if (p.intersects(s.x0 - 1, s.z0 - 1, s.x1 + 1, s.z1 + 1)) {
					p.fill(s.x0 - 1, floor - 1, s.z0 - 1, s.x1 + 1, floor + 7, s.z1 + 1, Pal.CONCRETE);
				}
			}
			for (Seg s : SEGMENTS) {
				if (p.intersects(s.x0, s.z0, s.x1, s.z1)) {
					p.fill(s.x0, floor + 1, s.z0, s.x1, floor + 6, s.z1, Pal.CAVE_AIR);
					p.fill(s.x0, floor, s.z0, s.x1, floor, s.z1, Pal.EPOXY);
				}
			}
			for (Seg s : SEGMENTS) {
				if (!p.intersects(s.x0, s.z0, s.x1, s.z1)) {
					continue;
				}
				boolean alongX = (s.x1 - s.x0) > (s.z1 - s.z0);
				if (alongX) {
					int mid = (s.z0 + s.z1) / 2;
					// drainage channel, cable trays, pipes
					k.tray(s.x0, s.z0, s.x1, s.z0, floor + 6);
					k.tray(s.x0, s.z1, s.x1, s.z1, floor + 6);
					k.pipe(ModBlocks.PIPE_SEAWATER, s.x0, floor + 1, s.z0, s.x1, floor + 1, s.z0);
					k.pipe(ModBlocks.PIPE_SERVICE, s.x0, floor + 2, s.z1, s.x1, floor + 2, s.z1);
					for (int x = s.x0 + 4; x <= s.x1; x += 8) {
						k.lamp(x, floor + 6, mid);
					}
					for (int x = s.x0 + 8; x <= s.x1; x += 32) {
						k.emergencyLamp(x, floor + 5, s.z0 + 1);
						k.label(x + 2, floor + 3, s.z1, Direction.NORTH, DyeColor.YELLOW, s.label, "EXIT VIA SHAFTS", "<- WEST   EAST ->");
					}
				} else {
					int mid = (s.x0 + s.x1) / 2;
					k.tray(s.x0, s.z0, s.x0, s.z1, floor + 6);
					k.tray(s.x1, s.z0, s.x1, s.z1, floor + 6);
					k.pipe(ModBlocks.PIPE_SEAWATER, s.x0, floor + 1, s.z0, s.x0, floor + 1, s.z1);
					k.pipe(ModBlocks.PIPE_SERVICE, s.x1, floor + 2, s.z0, s.x1, floor + 2, s.z1);
					for (int z = s.z0 + 4; z <= s.z1; z += 8) {
						k.lamp(mid, floor + 6, z);
					}
					for (int z = s.z0 + 8; z <= s.z1; z += 32) {
						k.emergencyLamp(s.x0 + 1, floor + 5, z);
						k.label(s.x1, floor + 3, z + 2, Direction.WEST, DyeColor.YELLOW, s.label, "EXIT VIA SHAFTS", "^ NORTH  SOUTH v");
					}
				}
			}
			// where a gallery runs through the turbine hall basement, the basement itself is the passage
			for (Seg s : SEGMENTS) {
				int ax = Math.max(s.x0 - 1, TH_X0 + 1);
				int bx = Math.min(s.x1 + 1, TH_X1 - 1);
				int az = Math.max(s.z0 - 1, TH_Z0 + 1);
				int bz = Math.min(s.z1 + 1, TH_Z1 - 1);
				if (ax <= bx && az <= bz && p.intersects(ax, az, bx, bz)) {
					p.fill(ax, floor + 1, az, bx, p.grade - 1, bz, Pal.AIR);
					p.fill(ax, floor, az, bx, floor, bz, Pal.EPOXY);
				}
			}
			for (int[] l : LINKS) {
				if (p.intersects(l[0], l[1], l[2], l[3])) {
					p.fill(l[0], floor + 1, l[1], l[2], floor + 3, l[3], Pal.CAVE_AIR);
					p.fill(l[0], floor, l[1], l[2], floor, l[3], Pal.EPOXY);
				}
			}
			for (Shaft sh : SHAFTS) {
				if (!p.intersects(Math.min(sh.x, sh.cx0) - 2, Math.min(sh.z, sh.cz0) - 2, sh.x + 6, Math.max(sh.z + 12, sh.cz1))) {
					continue;
				}
				// kiosk at grade with a stair core down to the gallery
				int g = p.grade;
				k.stairCore(sh.x, sh.z, new int[] {floor, floor + 7, g}, Pal.CONCRETE);
				int len = Kit.stairCoreLength(new int[] {floor, floor + 7, g});
				p.fill(sh.x - 1, g + 6, sh.z - 1, sh.x + 4, g + 6, sh.z + len - 2, Pal.CONCRETE);
				k.doorway(sh.x + 1, g + 1, sh.z - 1, Direction.SOUTH, true);
				k.label(sh.x + 2, g + 3, sh.z - 2, Direction.NORTH, DyeColor.YELLOW, "SERVICE SHAFT", sh.label, "TO GALLERY", "AUTHORISED ONLY");
				k.sign(sh.x, g + 2, sh.z - 2, SignKind.RESTRICTED, Direction.NORTH);
				// opening from the foot of the stair well into the gallery
				p.fill(sh.cx0, floor + 1, sh.cz0, sh.cx1, floor + 3, sh.cz1, Pal.CAVE_AIR);
				p.fill(sh.cx0, floor, sh.cz0, sh.cx1, floor, sh.cz1, Pal.EPOXY);
			}
		}
	}

	static List<Component> tunnels() {
		return List.of(new TunnelNetwork());
	}

	// ------------------------------------------------------------------ security fences

	/** Security fence line: iron bars on a concrete kerb, with a gap list. */
	static final class Fence extends Component {
		private final int[][] gaps;

		Fence(String name, int x0, int z0, int x1, int z1, int[]... gaps) {
			super(name, x0, z0, x1, z1);
			this.gaps = gaps;
		}

		private boolean gap(int v) {
			for (int[] g : gaps) {
				if (v >= g[0] && v <= g[1]) {
					return true;
				}
			}
			return false;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			boolean alongX = z0 == z1;
			BlockState bars = Kit.bars(alongX);
			if (alongX) {
				for (int x = x0; x <= x1; x++) {
					if (gap(x)) {
						continue;
					}
					p.set(x, g, z0, Pal.CURB);
					p.fill(x, g + 1, z0, x, g + 3, z0, bars);
					if (x % 40 == 0) {
						k.sign(x, g + 2, z0 + 1, SignKind.RESTRICTED, Direction.SOUTH);
						k.sign(x, g + 2, z0 - 1, SignKind.NO_ENTRY, Direction.NORTH);
					}
				}
			} else {
				for (int z = z0; z <= z1; z++) {
					if (gap(z)) {
						continue;
					}
					p.set(x0, g, z, Pal.CURB);
					p.fill(x0, g + 1, z, x0, g + 3, z, bars);
					if (z % 40 == 0) {
						k.sign(x0 + 1, g + 2, z, SignKind.RESTRICTED, Direction.EAST);
						k.sign(x0 - 1, g + 2, z, SignKind.NO_ENTRY, Direction.WEST);
					}
				}
			}
		}
	}

	static List<Component> security() {
		List<Component> list = new ArrayList<>();
		int[] spineGap = {SPINE_X0 - 2, SPINE_X1 + 2};
		// owner-controlled area: double perimeter fence (no fence along the seawall)
		for (int off = 0; off <= 4; off += 4) {
			list.add(new Fence("perimeter_north_" + off, FENCE_X0 + off, FENCE_Z0 + off, FENCE_X1 - off, FENCE_Z0 + off, spineGap, new int[] {634, 640}));
			list.add(new Fence("perimeter_west_" + off, FENCE_X0 + off, FENCE_Z0 + off, FENCE_X0 + off, FENCE_Z1, new int[] {0, 0}));
			list.add(new Fence("perimeter_east_" + off, FENCE_X1 - off, FENCE_Z0 + off, FENCE_X1 - off, FENCE_Z1, new int[] {44, 52}));
		}
		// protected area around the power block
		for (int off = 0; off <= 4; off += 4) {
			list.add(new Fence("pa_north_" + off, PA_X0 + off, PA_Z0 + off, PA_X1 - off, PA_Z0 + off, spineGap));
			list.add(new Fence("pa_west_" + off, PA_X0 + off, PA_Z0 + off, PA_X0 + off, PA_Z1 - 10, new int[] {476, 484}, new int[] {812, 820}));
			list.add(new Fence("pa_east_" + off, PA_X1 - off, PA_Z0 + off, PA_X1 - off, PA_Z1 - 10, new int[] {400, 410}, new int[] {596, 604}, new int[] {812, 820}));
		}
		return list;
	}
}
