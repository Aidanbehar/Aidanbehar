package dev.aidanbehar.nuclearstation.facility.layout;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.*;

import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.block.WasteDrumBlock;
import dev.aidanbehar.nuclearstation.block.WasteDrumBlockEntity;
import dev.aidanbehar.nuclearstation.facility.Feature;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.Direction;
import net.minecraft.world.item.DyeColor;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;

/** Auxiliary building, fuel building, MSIV house, tanks, water treatment and radioactive waste facilities. */
final class NuclearIsland {
	private NuclearIsland() {
	}

	static List<Component> components() {
		List<Component> list = new ArrayList<>();
		list.add(new Auxiliary());
		list.add(new FuelBuilding());
		list.add(new MsivHouse());
		list.add(new Tank("rwst", 380, 500, 8, 20, Pal.TANK, "REFUELLING", "WATER STORAGE", "TANK  2400 ppm B"));
		list.add(new Tank("cst", 622, 668, 10, 16, Pal.TANK, "CONDENSATE", "STORAGE TANK", "AUX FEED SUPPLY"));
		list.add(new Tank("demin_tank", 622, 702, 7, 14, Pal.TANK, "DEMINERALISED", "WATER TANK"));
		list.add(new WaterTreatment());
		list.add(new Radwaste());
		return list;
	}

	/** Pump room helper: a motor-driven (or turbine-driven) pump with piping, station and signage. */
	static void pumpRoom(Painter p, Kit k, int rx0, int rz0, int rx1, int rz1, int floor, EquipmentId id, Direction door, boolean steamDriven) {
		p.walls(rx0, rz0, rx1, rz1, floor + 1, floor + 8, Pal.CONCRETE);
		p.fill(rx0 + 1, floor + 1, rz0 + 1, rx1 - 1, floor + 8, rz1 - 1, Pal.AIR);
		p.floor(rx0 + 1, rz0 + 1, rx1 - 1, rz1 - 1, floor, Pal.EPOXY);
		int px = (rx0 + rx1) / 2;
		int pz = (rz0 + rz1) / 2;
		p.fill(px - 1, floor + 1, pz - 1, px + 1, floor + 1, pz + 3, Pal.DARK_CONCRETE);
		p.fill(px - 1, floor + 2, pz - 1, px + 1, floor + 3, pz, Painter.facing(ModBlocks.PUMP_CASING, Direction.SOUTH));
		if (steamDriven) {
			p.cylinderZ(pz + 1, pz + 4, floor + 3, px + 0.5, 1.5, Pal.TURBINE);
			k.pipe(ModBlocks.PIPE_STEAM, px, floor + 6, pz + 3, px, floor + 6, rz1 - 1);
			p.fill(px, floor + 5, pz + 3, px, floor + 5, pz + 3, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
		} else {
			p.cylinderZ(pz + 1, pz + 4, floor + 3, px + 0.5, 1.5, Pal.MOTOR);
		}
		k.pipe(ModBlocks.PIPE_SERVICE, px, floor + 2, rz0 + 1, px, floor + 2, pz - 2);
		k.pipe(ModBlocks.PIPE_FEEDWATER, px, floor + 6, rz0 + 1, px, floor + 6, pz - 1);
		p.fill(px, floor + 4, pz - 1, px, floor + 5, pz - 1, Pal.pipe(ModBlocks.PIPE_FEEDWATER, Direction.Axis.Y));
		int sx = door == Direction.EAST ? rx1 - 1 : rx0 + 1;
		k.station(sx, floor + 1, rz0 + 2, door, id);
		k.label(sx, floor + 2, rz0 + 2, door, DyeColor.BLACK, Kit.wrap(id.label.toUpperCase(), 15));
		k.lamps(rx0 + 1, rz0 + 1, rx1 - 1, rz1 - 1, floor + 7, 6);
		int dx = door == Direction.EAST ? rx1 : rx0;
		k.doorway(dx, floor + 1, pz, door.getOpposite(), true);
		int outside = door == Direction.EAST ? rx1 + 1 : rx0 - 1;
		k.sign(outside, floor + 3, pz + 2, SignKind.RADIATION, door);
		k.label(outside, floor + 3, pz - 2, door, DyeColor.YELLOW, Kit.wrap(id.label.toUpperCase(), 15));
	}

	static final class Auxiliary extends Component {
		Auxiliary() {
			super("auxiliary_building", AUX_X0, AUX_Z0, AUX_X1, AUX_Z1);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.room(x0, g - 13, z0, x1, g + 20, z1, Pal.CONCRETE, Pal.AIR);
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g - 12, Pal.EPOXY);
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g, Pal.CONCRETE);
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + 10, Pal.CONCRETE);
			EquipmentId[] west = {EquipmentId.CHG_A, EquipmentId.CHG_B, EquipmentId.SI_A, EquipmentId.SI_B, EquipmentId.CS_A, EquipmentId.CS_B};
			EquipmentId[] east = {EquipmentId.RHR_A, EquipmentId.RHR_B, EquipmentId.CCW_A, EquipmentId.CCW_B, EquipmentId.MDAFW_A, EquipmentId.MDAFW_B, EquipmentId.TDAFW};
			int corr0 = x0 + 31;
			int corr1 = x0 + 35;
			for (int i = 0; i < west.length; i++) {
				int rz0 = z0 + 1 + i * 20;
				pumpRoom(p, k, x0 + 1, rz0, corr0 - 1, rz0 + 19, g, west[i], Direction.EAST, false);
			}
			for (int i = 0; i < east.length; i++) {
				int rz0 = z0 + 1 + i * 17;
				pumpRoom(p, k, corr1 + 1, rz0, x1 - 1, Math.min(rz0 + 16, z1 - 1), g, east[i], Direction.WEST, east[i] == EquipmentId.TDAFW);
			}
			p.floor(corr0, z0 + 1, corr1, z1 - 1, g, Pal.TILE);
			k.lamps(corr0, z0 + 1, corr1, z1 - 1, g + 8, 6);
			k.emergencyLamp(corr0, g + 7, z0 + 30);
			k.emergencyLamp(corr0, g + 7, z0 + 90);
			k.label(corr0 + 2, g + 3, z0 + 1, Direction.SOUTH, DyeColor.YELLOW, "AUXILIARY BLDG", "ECCS PUMP ROOMS", "RADIOLOGICALLY", "CONTROLLED AREA");
			k.doorway(corr0 + 2, g + 1, z0, Direction.SOUTH, true);
			k.doorway(corr0 + 2, g + 1, z1, Direction.NORTH, true);
			k.sign(corr0, g + 3, z0 - 1, SignKind.RADIATION, Direction.NORTH);
			// basement: heat exchangers, CVCS tanks, boric acid
			int b = g - 12;
			for (int i = 0; i < 2; i++) {
				p.cylinderZ(z0 + 10, z0 + 30, b + 3, x0 + 8.5 + i * 8, 2.5, Pal.HX);
				k.label(x0 + 8 + i * 8, b + 2, z0 + 9, Direction.NORTH, DyeColor.BLACK, i == 0 ? "RHR HX A" : "RHR HX B");
				p.cylinderZ(z0 + 40, z0 + 60, b + 3, x0 + 8.5 + i * 8, 2.5, Pal.HX);
				k.label(x0 + 8 + i * 8, b + 2, z0 + 39, Direction.NORTH, DyeColor.BLACK, i == 0 ? "CCW HX A" : "CCW HX B");
			}
			p.cylinder(x1 - 12, z0 + 20, 5, b + 1, b + 10, Pal.TANK);
			k.label(x1 - 12, b + 2, z0 + 14, Direction.NORTH, DyeColor.BLACK, "VOLUME", "CONTROL TANK");
			for (int i = 0; i < 2; i++) {
				p.cylinder(x1 - 12, z0 + 40 + i * 14, 4, b + 1, b + 9, Pal.TANK);
				k.label(x1 - 12, b + 2, z0 + 35 + i * 14, Direction.NORTH, DyeColor.BLACK, "BORIC ACID", "TANK " + (i + 1));
			}
			for (int z = z0 + 70; z < z1 - 4; z += 6) {
				k.tray(x0 + 2, z, x1 - 2, z, b + 10);
			}
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, b + 11, 8);
			// upper level: ventilation filter trains and the plant vent
			int u = g + 10;
			for (int i = 0; i < 3; i++) {
				p.fill(x0 + 6, u + 1, z0 + 10 + i * 30, x1 - 6, u + 4, z0 + 16 + i * 30, Pal.DUCT);
				k.label(x0 + 5, u + 3, z0 + 13 + i * 30, Direction.WEST, DyeColor.BLACK, "HEPA / CHARCOAL", "FILTER TRAIN " + (i + 1));
			}
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, u + 8, 8);
			int[] floors = {g - 12, g, g + 10};
			int len = Kit.stairCoreLength(floors);
			k.stairCore(corr0 + 1, z1 - len - 1, floors, Pal.CONCRETE, Direction.NORTH, Direction.SOUTH);
			// the end pump rooms open into the stair core, which fills the corridor end
			k.doorway(corr0 - 1, g + 1, z1 - len - 1 + Kit.landingRow(floors, 1), Direction.WEST, true);
			p.cylinder(x0 + 10, z1 - 10, 2.5, g + 21, g + 64, Pal.DARK_CONCRETE);
			p.cylinder(x0 + 10, z1 - 10, 1.4, g + 21, g + 64, Pal.AIR);
			k.emergencyLamp(x0 + 10, g + 65, z1 - 10);
			k.label(x0 + 13, g + 22, z1 - 10, Direction.EAST, DyeColor.WHITE, "PLANT VENT", "STACK");
			// RWST suction line to the ECCS pumps
			k.pipe(ModBlocks.PIPE_SERVICE, 389, g + 3, 500, x0, g + 3, 500);
		}
	}

	static final class FuelBuilding extends Component {
		FuelBuilding() {
			super("fuel_building", FUEL_X0, FUEL_Z0, FUEL_X1, FUEL_Z1);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.room(x0, g - 17, z0, x1, g + 30, z1, Pal.CONCRETE, Pal.AIR);
			p.fill(x0 + 1, g - 16, z0 + 1, x1 - 1, g, z1 - 1, Pal.CONCRETE);
			p.walls(x0, z0, x1, z1, g + 1, g + 29, Pal.GREY);
			// spent fuel pool: 14 blocks of water over the racks
			int px0 = x0 + 14;
			int px1 = x1 - 14;
			int pz0 = z0 + 14;
			int pz1 = z1 - 26;
			p.fill(px0, g - 15, pz0, px1, g - 1, pz1, Pal.WATER);
			p.fill(px0 - 1, g - 16, pz0 - 1, px1 + 1, g - 16, pz1 + 1, Pal.LINER);
			BlockState rack = ModBlocks.SPENT_FUEL_RACK.defaultBlockState().setValue(BlockStateProperties.WATERLOGGED, true);
			BlockState fuel = ModBlocks.SPENT_FUEL_ASSEMBLY.defaultBlockState().setValue(BlockStateProperties.WATERLOGGED, true);
			for (int x = px0 + 2; x <= px1 - 2; x++) {
				for (int z = pz0 + 2; z <= pz1 - 2; z++) {
					boolean aisle = (x - px0) % 8 == 0 || (z - pz0) % 10 == 0;
					if (aisle) {
						if ((x + z) % 5 == 0) {
							p.set(x, g - 15, z, Pal.GLOW);
						}
						continue;
					}
					boolean occupied = Kit.hash(x, 0, z, 41) < 0.7;
					p.set(x, g - 15, z, occupied ? fuel : rack);
					p.set(x, g - 14, z, occupied ? fuel : rack);
				}
			}
			// pool curb, railing and the fuel handling bridge
			p.walls(px0 - 1, pz0 - 1, px1 + 1, pz1 + 1, g, g, Pal.HAZARD);
			p.walls(px0 - 2, pz0 - 2, px1 + 2, pz1 + 2, g + 1, g + 1, Pal.CONCRETE);
			k.railing(px0 - 2, pz0 - 3, px1 + 2, pz0 - 3, g + 1);
			int bz = (pz0 + pz1) / 2;
			p.fill(px0 - 3, g + 5, bz - 1, px1 + 3, g + 5, bz + 1, Pal.GIRDER);
			p.fill(px0 - 3, g + 1, bz - 1, px0 - 3, g + 4, bz + 1, Pal.GIRDER);
			p.fill(px1 + 3, g + 1, bz - 1, px1 + 3, g + 4, bz + 1, Pal.GIRDER);
			p.fill((px0 + px1) / 2, g - 6, bz, (px0 + px1) / 2, g + 4, bz, Pal.CHAIN);
			p.fill((px0 + px1) / 2 - 1, g + 6, bz - 1, (px0 + px1) / 2 + 1, g + 7, bz + 1, Pal.IRON);
			k.sign(px0 - 2, g + 2, pz0 - 4, SignKind.HIGH_RADIATION, Direction.NORTH);
			k.label(px0, g + 2, pz0 - 4, Direction.NORTH, DyeColor.YELLOW, "SPENT FUEL POOL", "NO OBJECTS", "OVER THE POOL", "KEEP 7m WATER");
			// pool cooling pumps and heat exchanger
			for (int i = 0; i < 2; i++) {
				int sx = x0 + 3 + i * 6;
				p.fill(sx, g + 1, z0 + 3, sx + 2, g + 2, z0 + 4, Painter.facing(ModBlocks.PUMP_CASING, Direction.EAST));
				p.fill(sx, g + 3, z0 + 3, sx + 2, g + 3, z0 + 4, Pal.MOTOR);
				EquipmentId id = i == 0 ? EquipmentId.SFP_A : EquipmentId.SFP_B;
				k.station(sx + 1, g + 1, z0 + 6, Direction.SOUTH, id);
				k.label(sx + 1, g + 2, z0 + 6, Direction.SOUTH, DyeColor.BLACK, "SFP COOLING", "PUMP " + (i == 0 ? "A" : "B"));
			}
			p.cylinderX(x0 + 3, x0 + 12, g + 6, z0 + 9.5, 1.5, Pal.HX);
			k.pipe(ModBlocks.PIPE_SERVICE, x0 + 13, g + 2, z0 + 4, px0 - 2, g + 2, z0 + 4);
			// new fuel vault
			int vz0 = z1 - 22;
			p.walls(x0 + 2, vz0, x0 + 20, z1 - 2, g + 1, g + 6, Pal.CONCRETE);
			p.fill(x0 + 3, g + 1, vz0 + 1, x0 + 19, g + 5, z1 - 3, Pal.AIR);
			for (int x = x0 + 4; x <= x0 + 18; x += 2) {
				for (int z = vz0 + 2; z <= z1 - 4; z += 3) {
					p.set(x, g + 1, z, ModBlocks.FUEL_ASSEMBLY.defaultBlockState());
				}
			}
			k.doorway(x0 + 11, g + 1, vz0, Direction.SOUTH, true);
			k.label(x0 + 13, g + 3, vz0 - 1, Direction.NORTH, DyeColor.YELLOW, "NEW FUEL", "STORAGE VAULT", "CRITICALITY", "CONTROLLED");
			k.lamps(x0 + 3, vz0 + 1, x0 + 19, z1 - 3, g + 5, 5);
			// cask loading bay served by the rail spur
			p.fill(x1 - 12, g - 6, z1 - 18, x1 - 2, g, z1 - 4, Pal.AIR);
			p.floor(x1 - 12, z1 - 18, x1 - 2, z1 - 4, g - 7, Pal.LINER);
			p.fill(x1, g + 1, 597, x1, g + 7, 603, Pal.AIR);
			k.rail(x1 - 14, 600, x1, 600, g + 1);
			k.label(x1 - 7, g + 3, z1 - 19, Direction.NORTH, DyeColor.YELLOW, "CASK LOADING", "PIT");
			p.cylinder(x1 - 7, z1 - 11, 2.5, g - 6, g - 1, Pal.TANK);
			// fuel transfer tube from the containment refuelling canal
			p.cylinderX(CONT_X + CONT_R - 2, x0 + 2, g - 8, CONT_Z + 0.5, 1.5, Pal.LINER);
			// overhead crane and lighting
			p.fill(x0 + 1, g + 24, z0 + 2, x1 - 1, g + 24, z0 + 2, Pal.GIRDER);
			p.fill(x0 + 1, g + 24, z1 - 2, x1 - 1, g + 24, z1 - 2, Pal.GIRDER);
			p.fill(x0 + 30, g + 25, z0 + 2, x0 + 32, g + 25, z1 - 2, Pal.GIRDER);
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + 28, 8);
			k.doorway(x0 + 2, g + 1, z0 + 30, Direction.EAST, true);
			k.label(x0 - 1, g + 4, z0 + 32, Direction.WEST, DyeColor.WHITE, "FUEL BUILDING", "SPENT FUEL POOL", "RESTRICTED");
			k.sign(x0 - 1, g + 3, z0 + 28, SignKind.RADIATION, Direction.WEST);
			k.beacon(px1 + 3, g + 3, pz0 - 3);
			p.feature(Feature.SPENT_FUEL_POOL, (px0 + px1) / 2, g - 6, (pz0 + pz1) / 2);
		}
	}

	static final class MsivHouse extends Component {
		MsivHouse() {
			super("msiv_house", MSIV_X0, MSIV_Z0, MSIV_X1, TH_Z0);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			int z1h = MSIV_Z1;
			p.room(x0, g, z0, x1, g + 30, z1h, Pal.CONCRETE, Pal.AIR);
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1h - 1, g + 14, Pal.GRATING);
			for (int sx : new int[] {CONT_X - 22, CONT_X + 22}) {
				// steam lines arriving from the containment penetration
				p.fill(sx, g + 22, CONT_Z + CONT_R + 1, sx, g + 22, TH_Z0, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Z));
				// main steam isolation valve and its actuator
				p.fill(sx - 1, g + 21, z0 + 12, sx + 1, g + 23, z0 + 14, Pal.IRON);
				p.fill(sx, g + 24, z0 + 13, sx, g + 27, z0 + 13, Pal.MOTOR);
				// atmospheric dump valve and safety valve stacks through the roof
				p.fill(sx + 3, g + 23, z0 + 6, sx + 3, g + 38, z0 + 6, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
				p.fill(sx - 3, g + 23, z0 + 6, sx - 3, g + 36, z0 + 6, Pal.pipe(ModBlocks.PIPE_STEAM, Direction.Axis.Y));
				k.pipe(ModBlocks.PIPE_STEAM, sx - 3, g + 22, z0 + 6, sx + 3, g + 22, z0 + 6);
				k.label(sx, g + 15, z0 + 11, Direction.NORTH, DyeColor.BLACK, "MAIN STEAM", "ISOLATION VALVE", sx < CONT_X ? "LOOPS A / C" : "LOOPS B / D");
			}
			// feedwater from the turbine hall to the containment penetrations
			k.pipe(ModBlocks.PIPE_FEEDWATER, TH_X1 - 32, g + 22, TH_Z0 - 1, TH_X1 - 32, g + 22, z0 + 20);
			k.pipe(ModBlocks.PIPE_FEEDWATER, CONT_X - 20, g + 20, z0 + 20, TH_X1 - 32, g + 20, z0 + 20);
			p.fill(TH_X1 - 32, g + 20, z0 + 20, TH_X1 - 32, g + 21, z0 + 20, Pal.pipe(ModBlocks.PIPE_FEEDWATER, Direction.Axis.Y));
			for (int sx : new int[] {CONT_X - 20, CONT_X + 24}) {
				k.pipe(ModBlocks.PIPE_FEEDWATER, sx, g + 20, CONT_Z + CONT_R + 1, sx, g + 20, z0 + 20);
			}
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1h - 1, g + 13, 8);
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1h - 1, g + 29, 8);
			k.ladder(x0 + 2, g + 1, g + 13, z0 + 2, Direction.SOUTH);
			p.set(x0 + 2, g + 14, z0 + 2, Pal.AIR);
			k.doorway(x0, g + 1, z0 + 17, Direction.EAST, true);
			k.label(x0 - 1, g + 3, z0 + 19, Direction.WEST, DyeColor.WHITE, "MAIN STEAM", "VALVE HOUSE", "HIGH ENERGY", "LINES");
			k.sign(x0 - 1, g + 3, z0 + 15, SignKind.PRESSURE, Direction.WEST);
			k.sign(x0 - 1, g + 2, z0 + 15, SignKind.HEARING, Direction.WEST);
			p.feature(Feature.MSIV_HOUSE, (x0 + x1) / 2, g + 22, (z0 + z1h) / 2);
			p.feature(Feature.ADV_STACK, CONT_X + 25, g + 39, z0 + 6);
		}
	}

	/** Vertical cylindrical storage tank on a ring foundation with a caged ladder. */
	static final class Tank extends Component {
		private final int cx;
		private final int cz;
		private final int r;
		private final int h;
		private final BlockState shell;
		private final String[] label;

		Tank(String name, int cx, int cz, int r, int h, BlockState shell, String... label) {
			super(name, cx - r - 2, cz - r - 2, cx + r + 2, cz + r + 2);
			this.cx = cx;
			this.cz = cz;
			this.r = r;
			this.h = h;
			this.shell = shell;
			this.label = label;
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.cylinder(cx, cz, r + 1, g, g, Pal.CONCRETE);
			p.cylinder(cx, cz, r, g + 1, g + h, shell);
			p.dome(cx, g + h + 1, cz, r, 2, r, shell, null);
			k.ladder(cx, g + 1, g + h, cz - r - 1, Direction.NORTH);
			k.label(cx + 2, g + 3, cz - r - 1, Direction.NORTH, DyeColor.BLACK, label);
		}
	}

	static final class WaterTreatment extends Component {
		WaterTreatment() {
			super("water_treatment", 650, 640, 696, 740);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			p.room(x0, g, z0, x1, g + 12, z1, Pal.WHITE, Pal.AIR);
			p.floor(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g, Pal.EPOXY);
			for (int z = z0 + 6; z < z1 - 6; z += 12) {
				for (int x = x0 + 6; x < x1 - 4; x += 10) {
					p.cylinder(x, z, 2.5, g + 1, g + 8, Pal.TANK);
				}
				k.pipe(ModBlocks.PIPE_SERVICE, x0 + 2, g + 9, z, x1 - 2, g + 9, z);
			}
			k.lamps(x0 + 1, z0 + 1, x1 - 1, z1 - 1, g + 11, 7);
			k.doorway(x0, g + 1, z0 + 10, Direction.EAST, true);
			k.label(x0 - 1, g + 3, z0 + 12, Direction.WEST, DyeColor.BLACK, "MAKEUP WATER", "TREATMENT", "REVERSE OSMOSIS", "& DEMINERALISERS");
		}
	}

	/** Radioactive waste processing building and the fenced interim drum store. */
	static final class Radwaste extends Component {
		Radwaste() {
			super("radwaste", RW_X0, RW_Z0, RW_X1, RW_Z1);
		}

		@Override
		public void paint(Painter p, Kit k) {
			int g = p.grade;
			int bz0 = RW_Z0 + 60;
			p.room(x0, g, bz0, x1, g + 14, z1, Pal.CONCRETE, Pal.AIR);
			p.floor(x0 + 1, bz0 + 1, x1 - 1, z1 - 1, g, Pal.EPOXY);
			for (int i = 0; i < 3; i++) {
				p.cylinder(x0 + 12 + i * 14, bz0 + 14, 4, g + 1, g + 10, Pal.TANK);
				k.label(x0 + 12 + i * 14, g + 2, bz0 + 9, Direction.NORTH, DyeColor.BLACK, "WASTE", "EVAPORATOR " + (i + 1));
			}
			for (int x = x0 + 8; x < x1 - 8; x += 3) {
				p.set(x, g + 1, z1 - 8, ModBlocks.WASTE_DRUM.defaultBlockState());
			}
			p.fill(x1 - 14, g + 1, bz0 + 24, x1 - 8, g + 6, bz0 + 30, Pal.IRON);
			p.fill(x1 - 12, g + 7, bz0 + 26, x1 - 10, g + 9, bz0 + 28, Blocks.PISTON.defaultBlockState());
			k.label(x1 - 11, g + 2, bz0 + 23, Direction.NORTH, DyeColor.BLACK, "SUPERCOMPACTOR");
			k.lamps(x0 + 1, bz0 + 1, x1 - 1, z1 - 1, g + 13, 7);
			k.doorway(x0 + 40, g + 1, bz0, Direction.SOUTH, true);
			k.label(x0 + 42, g + 3, bz0 - 1, Direction.NORTH, DyeColor.YELLOW, "RADWASTE", "PROCESSING", "CONTROLLED AREA");
			k.sign(x0 + 38, g + 3, bz0 - 1, SignKind.RADIATION, Direction.NORTH);
			// interim storage pad: shielded bays of sealed drums
			int sz0 = RW_Z0 + 4;
			int sz1 = bz0 - 6;
			p.fill(x0 + 2, g, sz0, x1 - 2, g, sz1, Pal.CONCRETE);
			p.walls(x0 + 1, sz0 - 1, x1 - 1, sz1 + 1, g + 1, g + 3, Kit.bars(true));
			p.fill(x0 + 1, g + 1, sz0, x0 + 1, g + 3, sz1, Kit.bars(false));
			p.fill(x1 - 1, g + 1, sz0, x1 - 1, g + 3, sz1, Kit.bars(false));
			p.fill(x0 + 40, g + 1, sz1 + 1, x0 + 44, g + 3, sz1 + 1, Pal.AIR);
			for (int bay = 0; bay < 4; bay++) {
				int bx0 = x0 + 6 + bay * 20;
				p.fill(bx0 - 1, g + 1, sz0 + 2, bx0 - 1, g + 4, sz1 - 4, Pal.CONCRETE);
				for (int x = bx0 + 1; x < bx0 + 16; x += 2) {
					for (int z = sz0 + 3; z < sz1 - 5; z += 2) {
						p.set(x, g + 1, z, ModBlocks.WASTE_DRUM.defaultBlockState().setValue(WasteDrumBlock.FILL, 4));
						long activity = 400 + (long) (Kit.hash(x, bay, z, 5) * 1600);
						p.configure(x, g + 1, z, be -> {
							if (be instanceof WasteDrumBlockEntity drum && drum.items() == 0) {
								drum.add(WasteDrumBlock.CAPACITY, activity);
							}
						});
					}
				}
			}
			for (int x = x0 + 10; x < x1; x += 30) {
				k.sign(x, g + 2, sz1 + 2, SignKind.RADIATION, Direction.SOUTH);
			}
			k.label(x0 + 42, g + 4, sz1 + 2, Direction.SOUTH, DyeColor.YELLOW, "INTERIM STORE", "LOW & INTERMED.", "LEVEL WASTE", "LIMIT STAY TIME");
			k.beacon(x0 + 2, g + 4, sz1 + 1);
			p.feature(Feature.RADWASTE_STORE, (x0 + x1) / 2, g + 1, (sz0 + sz1) / 2);
		}
	}
}
