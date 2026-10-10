package dev.aidanbehar.nuclearstation.facility.layout;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.CONT_R;
import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.CONT_X;
import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.CONT_Z;

import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.facility.Feature;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import net.minecraft.core.Direction;
import net.minecraft.world.item.DyeColor;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Reactor containment building: a post-tensioned concrete cylinder with a steel liner and
 * hemispherical dome. Inside are five levels, the reactor vessel in its biological
 * shield, four steam generators in their compartments, the pressurizer, four reactor
 * coolant pumps, primary/steam/feedwater piping, fan coolers, hydrogen igniters, the
 * containment sump and the polar crane over a 70-block-high operating floor volume.
 */
final class ContainmentBuilding extends Component {
	static final int WALL_TOP = 64;
	static final int DOME_H = 38;
	static final int INNER_R = CONT_R - 4;
	static final int[] LEVELS = {-20, -8, 0, 14, 28};
	static final int[][] SG = {{-22, -22}, {22, -22}, {-22, 22}, {22, 22}};
	static final EquipmentId[] RCP = {EquipmentId.RCP_A, EquipmentId.RCP_B, EquipmentId.RCP_C, EquipmentId.RCP_D};

	ContainmentBuilding() {
		super("containment", CONT_X - CONT_R - 3, CONT_Z - CONT_R - 3, CONT_X + CONT_R + 3, CONT_Z + CONT_R + 3);
	}

	private static boolean inside(int x, int z, double r) {
		double dx = x + 0.5 - CONT_X;
		double dz = z + 0.5 - CONT_Z;
		return dx * dx + dz * dz < r * r;
	}

	private void radialWall(Painter p, double angleDeg, double r0, double r1, int y0, int y1, BlockState state) {
		double a = Math.toRadians(angleDeg);
		for (double r = r0; r <= r1; r += 0.5) {
			int x = (int) Math.floor(CONT_X + Math.cos(a) * r);
			int z = (int) Math.floor(CONT_Z + Math.sin(a) * r);
			p.fill(x, y0, z, x, y1, z, state);
		}
	}

	private void diskLamps(Kit k, int y, double rMax, int spacing) {
		for (int x = CONT_X - INNER_R; x <= CONT_X + INNER_R; x += spacing) {
			for (int z = CONT_Z - INNER_R; z <= CONT_Z + INNER_R; z += spacing) {
				if (inside(x, z, rMax) && !inside(x, z, 11)) {
					k.lamp(x, y, z);
				}
			}
		}
	}

	@Override
	public void paint(Painter p, Kit k) {
		int g = p.grade;
		int cx = CONT_X;
		int cz = CONT_Z;
		// ---------------------------------------------------------------- shell
		p.cylinder(cx, cz, CONT_R + 2, g - 26, g - 21, Pal.DARK_CONCRETE);
		p.ring(cx, cz, CONT_R, CONT_R - 3, g - 20, g + WALL_TOP, Pal.CONTAINMENT);
		p.ring(cx, cz, CONT_R - 3, INNER_R, g - 20, g + WALL_TOP, Pal.LINER);
		p.cylinder(cx, cz, INNER_R, g - 20, g + WALL_TOP, Pal.AIR);
		p.dome(cx, g + WALL_TOP, cz, CONT_R, DOME_H, 3, Pal.CONTAINMENT, Pal.AIR);
		p.dome(cx, g + WALL_TOP, cz, CONT_R - 3, DOME_H - 3, 1, Pal.LINER, null);
		// buttresses for the tendon anchorages and a ring beam at the springline
		for (int b = 0; b < 3; b++) {
			double a = Math.toRadians(30 + b * 120);
			int bx = (int) Math.floor(cx + Math.cos(a) * (CONT_R + 1));
			int bz = (int) Math.floor(cz + Math.sin(a) * (CONT_R + 1));
			p.fill(bx - 1, g, bz - 1, bx + 1, g + WALL_TOP, bz + 1, Pal.CONTAINMENT);
		}
		p.ring(cx, cz, CONT_R + 1, CONT_R - 1, g + WALL_TOP - 1, g + WALL_TOP + 1, Pal.PANEL);
		k.emergencyLamp(cx, g + WALL_TOP + DOME_H + 1, cz);

		// ---------------------------------------------------------------- floors
		for (int i = 0; i < LEVELS.length; i++) {
			BlockState floor = i == 0 ? Pal.DARK_CONCRETE : (i == LEVELS.length - 1 ? Pal.STEEL_FLOOR : Pal.CONCRETE);
			p.cylinder(cx, cz, INNER_R, g + LEVELS[i], g + LEVELS[i], floor);
		}
		// ---------------------------------------------------------------- reactor vessel and biological shield
		p.ring(cx, cz, 10.5, 6.5, g - 20, g + 20, Pal.CONCRETE);
		p.cylinder(cx, cz, 6.5, g - 19, g + 27, Pal.AIR);
		p.cylinder(cx, cz, 4.5, g - 10, g + 14, Pal.VESSEL);
		p.sphere(cx, g - 10, cz, 4.5, Pal.VESSEL);
		p.dome(cx, g + 15, cz, 4.5, 3, 4.5, Pal.VESSEL_HEAD, null);
		for (int dx = -2; dx <= 2; dx += 2) {
			for (int dz = -2; dz <= 2; dz += 2) {
				p.fill(cx + dx, g + 18, cz + dz, cx + dx, g + 23, cz + dz, Pal.CRDM);
			}
		}
		p.fill(cx - 3, g + 24, cz - 3, cx + 3, g + 24, cz + 3, Pal.GRATING);
		// incore instrument guide tubes in the cavity below the vessel
		for (int dx = -2; dx <= 2; dx += 2) {
			p.fill(cx + dx, g - 19, cz, cx + dx, g - 15, cz, Pal.CHAIN);
		}
		p.floor(cx - 6, cz - 6, cx + 6, cz + 6, g - 20, Pal.LINER);
		// refuelling cavity walls above the shield, open to the operating floor
		p.walls(cx - 8, cz - 8, cx + 8, cz + 8, g + 21, g + 28, Pal.LINER);
		p.fill(cx - 7, g + 21, cz - 7, cx + 7, g + 28, cz + 7, Pal.AIR);
		p.fill(cx - 7, g + 20, cz - 7, cx + 7, g + 20, cz + 7, Pal.LINER);
		p.cylinder(cx, cz, 6.5, g + 20, g + 20, Pal.AIR);
		k.railing(cx - 9, cz - 9, cx + 9, cz - 9, g + 29);
		k.railing(cx - 9, cz + 9, cx + 9, cz + 9, g + 29);
		k.railing(cx - 9, cz - 9, cx - 9, cz + 9, g + 29);
		k.railing(cx + 9, cz - 9, cx + 9, cz + 9, g + 29);
		p.fill(cx - 9, g + 28, cz - 9, cx + 9, g + 28, cz - 9, Pal.HAZARD);
		p.fill(cx - 9, g + 28, cz + 9, cx + 9, g + 28, cz + 9, Pal.HAZARD);
		k.sign(cx, g + 29, cz - 10, SignKind.HIGH_RADIATION, Direction.NORTH);
		k.label(cx + 2, g + 30, cz - 10, Direction.NORTH, DyeColor.YELLOW, "REFUELLING", "CAVITY", "REACTOR VESSEL", "BELOW");

		// ---------------------------------------------------------------- steam generators
		for (int i = 0; i < 4; i++) {
			int sx = cx + SG[i][0];
			int sz = cz + SG[i][1];
			p.ring(sx, sz, 9.5, 7.5, g + 1, g + 28, Pal.CONCRETE);
			p.cylinder(sx, sz, 7.5, g + 1, g + 27, Pal.AIR);
			p.cylinder(sx, sz, 3, g + 1, g + 30, Pal.SG);
			p.cylinder(sx, sz, 4.5, g + 31, g + 42, Pal.SG);
			p.dome(sx, g + 43, sz, 4.5, 3, 4.5, Pal.SG, null);
			// compartment door facing the reactor
			int dx = Integer.signum(cx - sx);
			int dz = Integer.signum(cz - sz);
			int doorX = sx + dx * 8;
			int doorZ = sz;
			p.fill(doorX - (dx > 0 ? 1 : 0), g + 1, doorZ, doorX + (dx < 0 ? 1 : 0), g + 3, doorZ + 1, Pal.AIR);
			k.sign(doorX + dx * 2, g + 3, doorZ + 3, SignKind.HIGH_RADIATION, dx > 0 ? Direction.EAST : Direction.WEST);
			k.label(doorX + dx * 2, g + 2, doorZ + 3, dx > 0 ? Direction.EAST : Direction.WEST, DyeColor.YELLOW, "STEAM", "GENERATOR " + (char) ('A' + i), "COMPARTMENT");
			// SG access platforms
			k.catwalk(sx - 3, sz - 6, sx + 3, sz - 6, g + 14);
			// hot leg (vessel outlet nozzle to SG inlet plenum)
			k.pipeL(ModBlocks.PIPE_PRIMARY, cx + Integer.signum(sx - cx) * 7, cz + Integer.signum(sz - cz) * 2, sx, sz - dz * 4, g + 6);
			p.fill(sx, g + 3, sz - dz * 4, sx, g + 5, sz - dz * 4, Pal.pipe(ModBlocks.PIPE_PRIMARY, Direction.Axis.Y));
			// reactor coolant pump in the cold leg
			int rx = cx + Integer.signum(SG[i][0]) * 12;
			int rz = cz + Integer.signum(SG[i][1]) * 28;
			p.fill(rx - 1, g + 1, rz - 1, rx + 1, g + 3, rz + 1, Painter.facing(ModBlocks.REACTOR_COOLANT_PUMP, dz > 0 ? Direction.SOUTH : Direction.NORTH));
			p.fill(rx - 1, g + 4, rz - 1, rx + 1, g + 7, rz + 1, Pal.MOTOR);
			p.cylinder(rx + 0.5, rz + 0.5, 1.4, g + 8, g + 8, Pal.IRON);
			k.pipeL(ModBlocks.PIPE_PRIMARY, sx, sz + (rz - sz > 0 ? 4 : -4), rx, rz, g + 2);
			k.pipeL(ModBlocks.PIPE_PRIMARY, rx, rz - Integer.signum(rz - cz) * 2, cx + Integer.signum(rx - cx) * 7, cz + Integer.signum(rz - cz), g + 4);
			k.station(rx + Integer.signum(rx - cx) * 3, g + 1, rz, Integer.signum(rx - cx) > 0 ? Direction.EAST : Direction.WEST, RCP[i]);
			k.label(rx + Integer.signum(rx - cx) * 3, g + 2, rz, Integer.signum(rx - cx) > 0 ? Direction.EAST : Direction.WEST, DyeColor.BLACK, "REACTOR", "COOLANT PUMP", String.valueOf((char) ('A' + i)), "6 MW");
			// main steam line: up out of the SG head, across to the south wall
			p.fill(sx, g + 46, sz, sx, g + 50, sz, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
			k.pipe(ModBlocks.PIPE_STEAM, sx, g + 50, sz, sx, g + 50, cz + INNER_R - 1);
			// feedwater line from the south wall into the SG downcomer
			k.pipe(ModBlocks.PIPE_FEEDWATER, sx + 2, g + 20, sz + (sz > cz ? 0 : 0), sx + 2, g + 20, cz + INNER_R - 1);
			if (i == 0) {
				p.feature(Feature.STEAM_GENERATOR, sx, g + 30, sz);
			}
		}
		// steam and feed penetrations through the south wall towards the MSIV house
		for (int i = 0; i < 4; i++) {
			int sx = cx + SG[i][0];
			p.fill(sx, g + 50, cz + INNER_R, sx, g + 50, cz + CONT_R + 1, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Z));
			p.fill(sx, g + 22, cz + CONT_R + 1, sx, g + 49, cz + CONT_R + 1, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
			p.fill(sx + 2, g + 20, cz + INNER_R, sx + 2, g + 20, cz + CONT_R + 1, Pal.pipe(ModBlocks.PIPE_FEEDWATER, Direction.Axis.Z));
		}

		// ---------------------------------------------------------------- pressurizer
		int px = cx + 30;
		p.ring(px, cz, 6.5, 4.5, g + 1, g + 28, Pal.CONCRETE);
		p.cylinder(px, cz, 4.5, g + 1, g + 27, Pal.AIR);
		p.cylinder(px, cz, 2.5, g + 3, g + 33, Pal.PZR);
		p.dome(px, g + 34, cz, 2.5, 2, 2.5, Pal.PZR, null);
		p.fill(px, g + 1, cz, px, g + 2, cz, Pal.PZR);
		p.fill(px - 4, g + 1, cz, px - 3, g + 3, cz, Pal.AIR);
		k.pipe(ModBlocks.PIPE_PRIMARY, cx + 11, g + 2, cz, px - 3, g + 2, cz); // surge line
		// PORVs and safety valves on top, relief line to the relief tank on the lower level
		p.fill(px - 1, g + 36, cz, px + 1, g + 36, cz, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.X));
		p.fill(px + 2, g + 36, cz, px + 2, g + 36, cz + 3, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Z));
		p.fill(px + 2, g - 6, cz + 3, px + 2, g + 35, cz + 3, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
		p.cylinderX(px - 4, px + 6, g - 5, cz + 6.5, 2.5, Pal.TANK);
		k.label(px, g - 5, cz + 3, Direction.SOUTH, DyeColor.BLACK, "PRESSURIZER", "RELIEF TANK");
		k.catwalk(px - 3, cz - 7, px + 3, cz - 7, g + 33);
		k.station(px - 2, g + 29, cz - 5, Direction.NORTH, EquipmentId.PORV_1);
		k.station(px + 2, g + 29, cz - 5, Direction.NORTH, EquipmentId.PORV_2);
		k.label(px - 2, g + 30, cz - 5, Direction.NORTH, DyeColor.BLACK, "PORV 1", "LOCAL", "ACTUATOR");
		k.label(px + 2, g + 30, cz - 5, Direction.NORTH, DyeColor.BLACK, "PORV 2", "LOCAL", "ACTUATOR");
		k.station(px - 5, g + 1, cz - 3, Direction.WEST, EquipmentId.PZR_HEATERS);
		k.label(px - 5, g + 2, cz - 3, Direction.WEST, DyeColor.BLACK, "PZR HEATER", "GROUPS", "BREAKERS");
		k.sign(px - 7, g + 3, cz, SignKind.HOT_SURFACE, Direction.WEST);
		p.feature(Feature.PRESSURIZER, px, g + 20, cz);

		// ---------------------------------------------------------------- lower levels: radial rooms
		for (int lv = 0; lv < 2; lv++) {
			int y0 = g + LEVELS[lv] + 1;
			int y1 = g + LEVELS[lv + 1] - 1;
			for (int a = 0; a < 360; a += 45) {
				radialWall(p, a + 22.5, 11, INNER_R - 1, y0, y1, Pal.CONCRETE);
				// door through each radial wall near its outer end
				double ar = Math.toRadians(a + 22.5);
				int dxp = (int) Math.floor(cx + Math.cos(ar) * (INNER_R - 6));
				int dzp = (int) Math.floor(cz + Math.sin(ar) * (INNER_R - 6));
				p.fill(dxp - 1, y0, dzp - 1, dxp + 1, y0 + 2, dzp + 1, Pal.AIR);
			}
			diskLamps(k, y1, INNER_R - 2, 8);
		}
		// lower level equipment: drain tank, letdown and seal water heat exchangers, sump
		int l1 = g + LEVELS[1];
		p.cylinderX(cx - 30, cx - 18, l1 + 3, cz - 20.5, 2.5, Pal.TANK);
		k.label(cx - 24, l1 + 2, cz - 17, Direction.SOUTH, DyeColor.BLACK, "REACTOR COOLANT", "DRAIN TANK");
		p.cylinderZ(cz + 14, cz + 24, l1 + 2.5, cx - 28.5, 1.5, Pal.HX);
		p.cylinderZ(cz + 14, cz + 24, l1 + 2.5, cx - 24.5, 1.5, Pal.HX);
		k.label(cx - 26, l1 + 4, cz + 13, Direction.NORTH, DyeColor.BLACK, "LETDOWN", "HEAT EXCHANGERS");
		int l0 = g + LEVELS[0];
		p.fill(cx - 27, l0 - 2, cz + 18, cx - 21, l0 - 1, cz + 24, Pal.CONCRETE);
		p.fill(cx - 26, l0 - 1, cz + 19, cx - 22, l0 - 1, cz + 23, Pal.WATER);
		p.fill(cx - 26, l0, cz + 19, cx - 22, l0, cz + 23, Pal.AIR);
		p.fill(cx - 27, l0 + 1, cz + 18, cx - 21, l0 + 1, cz + 18, Kit.bars(true));
		k.sign(cx - 24, l0 + 2, cz + 17, SignKind.CONTAMINATION, Direction.NORTH);
		k.label(cx - 22, l0 + 2, cz + 17, Direction.NORTH, DyeColor.YELLOW, "CONTAINMENT", "SUMP", "RECIRC SCREENS");
		p.fill(cx - 26, l0 + 1, cz + 24, cx - 22, l0 + 3, cz + 24, Kit.bars(true));
		// cavity access tunnel to the instrument area under the vessel
		p.fill(cx - 2, l0 + 1, cz - 18, cx + 2, l0 + 3, cz - 7, Pal.AIR);
		k.sign(cx, l0 + 3, cz - 19, SignKind.HIGH_RADIATION, Direction.NORTH);
		k.label(cx + 3, l0 + 2, cz - 19, Direction.NORTH, DyeColor.RED, "REACTOR CAVITY", "LOCKED HIGH", "RADIATION AREA");
		p.feature(Feature.REACTOR_CAVITY, cx, l0 + 2, cz);
		p.feature(Feature.REACTOR_CORE, cx, g + 2, cz);

		// ---------------------------------------------------------------- level 0 / 14: fan coolers, igniters, valve galleries
		int l3 = g + LEVELS[3];
		for (int s = 0; s < 2; s++) {
			int fz = cz + (s == 0 ? -16 : 16);
			int fx = cx - 34;
			p.fill(fx - 2, l3 + 1, fz - 2, fx + 2, l3 + 4, fz + 2, Pal.HX);
			p.fill(fx - 1, l3 + 5, fz - 1, fx + 1, l3 + 7, fz + 1, Painter.facing(ModBlocks.VENTILATION_FAN, Direction.EAST));
			p.fill(fx, l3 + 8, fz, fx, l3 + 12, fz, Pal.DUCT);
			k.pipe(ModBlocks.PIPE_SERVICE, fx - 3, l3 + 2, fz, fx - 3, l3 + 2, fz + (s == 0 ? -8 : 8));
			k.station(fx + 3, l3 + 1, fz, Direction.EAST, s == 0 ? EquipmentId.CFC_A : EquipmentId.CFC_B);
			k.label(fx + 3, l3 + 2, fz, Direction.EAST, DyeColor.BLACK, "CONTAINMENT", "FAN COOLER " + (s == 0 ? "A" : "B"));
		}
		k.station(cx - 10, g + LEVELS[4] + 1, cz + 34, Direction.SOUTH, EquipmentId.IGNITERS);
		k.label(cx - 10, g + LEVELS[4] + 2, cz + 34, Direction.SOUTH, DyeColor.BLACK, "HYDROGEN", "IGNITER", "DISTRIBUTION");
		for (int a = 0; a < 360; a += 30) {
			double ar = Math.toRadians(a);
			int ix = (int) Math.floor(cx + Math.cos(ar) * (INNER_R - 0.6));
			int iz = (int) Math.floor(cz + Math.sin(ar) * (INNER_R - 0.6));
			p.set(ix, g + 40, iz, Blocks.END_ROD.defaultBlockState());
			p.set(ix, g + 18, iz, Blocks.END_ROD.defaultBlockState());
		}
		// passive autocatalytic recombiners on the operating floor
		for (int a = 15; a < 360; a += 90) {
			double ar = Math.toRadians(a);
			int rx = (int) Math.floor(cx + Math.cos(ar) * (INNER_R - 4));
			int rz = (int) Math.floor(cz + Math.sin(ar) * (INNER_R - 4));
			p.fill(rx, g + 29, rz, rx + 1, g + 31, rz + 1, Pal.IRON);
		}
		diskLamps(k, g + LEVELS[3] - 1, INNER_R - 2, 9);
		diskLamps(k, g + LEVELS[4] - 1, INNER_R - 2, 9);

		// ---------------------------------------------------------------- operating floor, polar crane, sprays
		int crane = g + 58;
		p.ring(cx, cz, INNER_R, INNER_R - 2, crane - 1, crane - 1, Pal.CONCRETE);
		p.ring(cx, cz, INNER_R - 0.5, INNER_R - 1.5, crane, crane, Pal.GIRDER);
		p.fill(cx - INNER_R + 2, crane + 1, cz - 2, cx + INNER_R - 2, crane + 2, cz - 2, Pal.GIRDER);
		p.fill(cx - INNER_R + 2, crane + 1, cz + 2, cx + INNER_R - 2, crane + 2, cz + 2, Pal.GIRDER);
		p.fill(cx - 2, crane + 1, cz - 1, cx + 2, crane + 3, cz + 1, Pal.IRON);
		p.fill(cx, crane - 14, cz, cx, crane, cz, Pal.CHAIN);
		p.fill(cx - 1, crane - 16, cz, cx + 1, crane - 15, cz, Pal.GIRDER);
		k.sign(cx - 20, g + 30, cz - 20, SignKind.CRANE, Direction.SOUTH);
		for (int a = 0; a < 360; a += 20) {
			double ar = Math.toRadians(a);
			k.lamp((int) Math.floor(cx + Math.cos(ar) * (INNER_R - 3)), crane - 2, (int) Math.floor(cz + Math.sin(ar) * (INNER_R - 3)));
		}
		p.ring(cx, cz, 30.5, 29.5, g + 76, g + 76, Pal.pipe(ModBlocks.PIPE_SERVICE, Direction.Axis.X));
		p.ring(cx, cz, 18.5, 17.5, g + 86, g + 86, Pal.pipe(ModBlocks.PIPE_SERVICE, Direction.Axis.X));
		k.label(cx - 12, g + 30, cz - 30, Direction.SOUTH, DyeColor.WHITE, "EL +28", "OPERATING FLOOR", "HARD HATS AND", "DOSIMETERS");
		k.sign(cx - 14, g + 30, cz - 30, SignKind.PPE, Direction.SOUTH);
		p.feature(Feature.CONTAINMENT_OPERATING_FLOOR, cx - 20, g + 30, cz - 20);
		p.feature(Feature.CONTAINMENT_DOME_TOP, cx, g + WALL_TOP + DOME_H, cz);

		// ---------------------------------------------------------------- stairs and lift
		int[] floors = new int[LEVELS.length];
		for (int i = 0; i < LEVELS.length; i++) {
			floors[i] = g + LEVELS[i];
		}
		int len = Kit.stairCoreLength(floors);
		k.stairCore(cx - 40, cz - len / 2, floors, Pal.CONCRETE);
		k.stairCore(cx + 3, cz - 40, floors, Pal.CONCRETE);
		for (int fl : floors) {
			// openings from the stair wells onto each level
			p.fill(cx - 36, fl + 1, cz - 1, cx - 36, fl + 2, cz + 1, Pal.AIR);
			p.fill(cx + 2, fl + 1, cz - 31, cx + 2, fl + 2, cz - 29, Pal.AIR);
			k.label(cx - 35, fl + 3, cz - 2, Direction.EAST, DyeColor.WHITE, "LEVEL", fl - g >= 0 ? "EL +" + (fl - g) : "EL " + (fl - g));
		}

		// ---------------------------------------------------------------- personnel airlock (north) and equipment hatch (west)
		int az = cz - CONT_R;
		p.fill(cx - 2, g, az - 3, cx + 2, g + 4, az + 5, Pal.LINER);
		p.fill(cx - 1, g + 1, az - 3, cx + 1, g + 3, az + 5, Pal.AIR);
		p.fill(cx - 1, g, az - 3, cx + 1, g, az + 5, Pal.STEEL_FLOOR);
		k.door(cx, g + 1, az - 3, Direction.SOUTH);
		k.door(cx, g + 1, az + 5, Direction.SOUTH);
		k.lamp(cx, g + 3, az + 1);
		k.sign(cx - 3, g + 3, az - 4, SignKind.RADIATION, Direction.NORTH);
		k.sign(cx + 3, g + 3, az - 4, SignKind.PPE, Direction.NORTH);
		k.label(cx + 1, g + 4, az - 4, Direction.NORTH, DyeColor.YELLOW, "CONTAINMENT", "PERSONNEL", "AIRLOCK", "ONE DOOR ONLY");
		k.label(cx - 6, g + 6, az - 1, Direction.NORTH, DyeColor.WHITE, "UNIT 1 REACTOR", "CONTAINMENT", "BUILDING", "3000 MWt PWR");
		k.beacon(cx + 3, g + 5, az - 2);
		p.cylinderX(cx - CONT_R - 1, cx - CONT_R + 3, g + 33, cz, 4.5, Pal.LINER);
		k.sign(cx - CONT_R - 2, g + 30, cz, SignKind.CRANE, Direction.WEST);
		// path from the airlock to the stair well
		p.fill(cx - 1, g + 1, az + 6, cx + 1, g + 3, cz - 12, Pal.AIR);
	}
}
