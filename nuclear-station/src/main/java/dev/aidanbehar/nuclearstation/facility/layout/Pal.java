package dev.aidanbehar.nuclearstation.facility.layout;

import dev.aidanbehar.nuclearstation.block.CableTrayBlock;
import dev.aidanbehar.nuclearstation.block.PanelBlock;
import dev.aidanbehar.nuclearstation.block.PanelStatus;
import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.block.SignPlateBlock;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import net.minecraft.core.Direction;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.RotatedPillarBlock;
import net.minecraft.world.level.block.SlabBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.SlabType;

/**
 * Palette of block states used by the blueprint. Kept in one place so the whole complex
 * follows consistent conventions: bare concrete for nuclear-safety structures, blue
 * cladding for the turbine island, white cladding for offices and labs, yellow for
 * cranes and hazards, and pipes colour-coded by fluid.
 */
public final class Pal {
	public static final BlockState AIR = Blocks.AIR.defaultBlockState();
	public static final BlockState CAVE_AIR = Blocks.CAVE_AIR.defaultBlockState();
	public static final BlockState WATER = Blocks.WATER.defaultBlockState();
	public static final BlockState STONE = Blocks.STONE.defaultBlockState();
	public static final BlockState DIRT = Blocks.DIRT.defaultBlockState();
	public static final BlockState GRASS = Blocks.GRASS_BLOCK.defaultBlockState();
	public static final BlockState GRAVEL = Blocks.GRAVEL.defaultBlockState();
	public static final BlockState SAND = Blocks.SAND.defaultBlockState();
	public static final BlockState ASPHALT = Blocks.CONCRETE_POWDER.pick(net.minecraft.world.item.DyeColor.BLACK).defaultBlockState();
	public static final BlockState ROAD = Blocks.CONCRETE.pick(net.minecraft.world.item.DyeColor.GRAY).defaultBlockState();
	public static final BlockState ROAD_LINE = Blocks.CONCRETE.pick(net.minecraft.world.item.DyeColor.WHITE).defaultBlockState();
	public static final BlockState ROAD_YELLOW = Blocks.CONCRETE.pick(net.minecraft.world.item.DyeColor.YELLOW).defaultBlockState();
	public static final BlockState CURB = Blocks.SMOOTH_STONE.defaultBlockState();
	public static final BlockState PAVING = Blocks.CONCRETE.pick(net.minecraft.world.item.DyeColor.LIGHT_GRAY).defaultBlockState();
	public static final BlockState ARMOUR_STONE = Blocks.COBBLED_DEEPSLATE.defaultBlockState();

	public static final BlockState CONCRETE = ModBlocks.REINFORCED_CONCRETE.defaultBlockState();
	public static final BlockState PANEL = ModBlocks.CONCRETE_PANEL.defaultBlockState();
	public static final BlockState DARK_CONCRETE = ModBlocks.DARK_CONCRETE.defaultBlockState();
	public static final BlockState CONTAINMENT = ModBlocks.CONTAINMENT_CONCRETE.defaultBlockState();
	public static final BlockState LINER = ModBlocks.CONTAINMENT_LINER.defaultBlockState();
	public static final BlockState STEEL_FLOOR = ModBlocks.STEEL_FLOOR_PLATE.defaultBlockState();
	public static final BlockState GRATING = ModBlocks.STEEL_GRATING.defaultBlockState();
	public static final BlockState HAZARD = ModBlocks.HAZARD_STRIPES.defaultBlockState();
	public static final BlockState EPOXY = ModBlocks.EPOXY_FLOOR.defaultBlockState();
	public static final BlockState LAB_FLOOR = ModBlocks.LAB_FLOOR.defaultBlockState();
	public static final BlockState RUBBER = ModBlocks.RUBBER_FLOOR.defaultBlockState();
	public static final BlockState BLUE = ModBlocks.CLADDING_BLUE.defaultBlockState();
	public static final BlockState WHITE = ModBlocks.CLADDING_WHITE.defaultBlockState();
	public static final BlockState GREY = ModBlocks.CLADDING_GREY.defaultBlockState();
	public static final BlockState WALL = ModBlocks.PAINTED_WALL.defaultBlockState();
	public static final BlockState CEILING = ModBlocks.ACOUSTIC_CEILING.defaultBlockState();
	public static final BlockState CARPET = ModBlocks.OFFICE_CARPET.defaultBlockState();
	public static final BlockState TILE = ModBlocks.WHITE_TILE.defaultBlockState();
	public static final BlockState LEAD = ModBlocks.LEAD_BLOCK.defaultBlockState();
	public static final BlockState DUCT = ModBlocks.DUCT.defaultBlockState();
	public static final BlockState INSULATION = ModBlocks.INSULATION_CLADDING.defaultBlockState();
	public static final BlockState LEAD_GLASS = ModBlocks.LEAD_GLASS.defaultBlockState();
	public static final BlockState GLASS = Blocks.STAINED_GLASS.pick(net.minecraft.world.item.DyeColor.LIGHT_GRAY).defaultBlockState();
	public static final BlockState WINDOW = Blocks.STAINED_GLASS_PANE.pick(net.minecraft.world.item.DyeColor.GRAY).defaultBlockState();
	public static final BlockState GIRDER = ModBlocks.CRANE_GIRDER.defaultBlockState();
	public static final BlockState IRON_BARS = Blocks.IRON_BARS.defaultBlockState();
	public static final BlockState CHAIN = Blocks.IRON_CHAIN.defaultBlockState();
	public static final BlockState IRON = Blocks.IRON_BLOCK.defaultBlockState();
	public static final BlockState STEEL_COLUMN = Blocks.POLISHED_DEEPSLATE.defaultBlockState();
	public static final BlockState LADDER_N = Blocks.LADDER.defaultBlockState();

	public static final BlockState VESSEL = ModBlocks.REACTOR_VESSEL.defaultBlockState();
	public static final BlockState VESSEL_HEAD = ModBlocks.REACTOR_VESSEL_HEAD.defaultBlockState();
	public static final BlockState CRDM = ModBlocks.CRDM_HOUSING.defaultBlockState();
	public static final BlockState SG = ModBlocks.STEAM_GENERATOR_SHELL.defaultBlockState();
	public static final BlockState PZR = ModBlocks.PRESSURIZER_SHELL.defaultBlockState();
	public static final BlockState TURBINE = ModBlocks.TURBINE_CASING.defaultBlockState();
	public static final BlockState GENERATOR = ModBlocks.GENERATOR_HOUSING.defaultBlockState();
	public static final BlockState CONDENSER = ModBlocks.CONDENSER_SHELL.defaultBlockState();
	public static final BlockState TRANSFORMER = ModBlocks.TRANSFORMER_BODY.defaultBlockState();
	public static final BlockState RADIATOR = ModBlocks.TRANSFORMER_RADIATOR.defaultBlockState();
	public static final BlockState TANK = ModBlocks.TANK_SHELL.defaultBlockState();
	public static final BlockState DIESEL = ModBlocks.DIESEL_ENGINE.defaultBlockState();
	public static final BlockState BATTERY = ModBlocks.BATTERY_RACK.defaultBlockState();
	public static final BlockState HX = ModBlocks.HEAT_EXCHANGER.defaultBlockState();
	public static final BlockState MOTOR = ModBlocks.MOTOR_HOUSING.defaultBlockState();
	public static final BlockState EXP_WALL = ModBlocks.EXP_CHAMBER_WALL.defaultBlockState();
	public static final BlockState EXP_COIL = ModBlocks.EXP_COIL.defaultBlockState();
	public static final BlockState OBS_GLASS = ModBlocks.OBSERVATION_GLASS.defaultBlockState();
	public static final BlockState GLOW = ModBlocks.CHERENKOV_GLOW.defaultBlockState().setValue(net.minecraft.world.level.block.state.properties.BlockStateProperties.WATERLOGGED, true);
	public static final BlockState LAMP = ModBlocks.FACILITY_LAMP.defaultBlockState();
	public static final BlockState EMERGENCY_LAMP = ModBlocks.EMERGENCY_LAMP.defaultBlockState();
	public static final BlockState BEACON = ModBlocks.WARNING_BEACON.defaultBlockState();
	public static final BlockState WASTE_DRUM = ModBlocks.WASTE_DRUM.defaultBlockState();
	public static final BlockState SEA_LANTERN = Blocks.SEA_LANTERN.defaultBlockState();
	public static final BlockState LANTERN_POST = Blocks.LANTERN.defaultBlockState();

	private Pal() {
	}

	public static BlockState pipe(Block pipe, Direction.Axis axis) {
		return pipe.defaultBlockState().setValue(RotatedPillarBlock.AXIS, axis);
	}

	public static BlockState tray(Direction.Axis axis) {
		return ModBlocks.CABLE_TRAY.defaultBlockState().setValue(CableTrayBlock.AXIS, axis);
	}

	public static BlockState sign(SignKind kind, Direction facing) {
		return Painter.facing(ModBlocks.SIGN_PLATE, facing).setValue(SignPlateBlock.KIND, kind);
	}

	public static BlockState panel(Block block, Direction facing, PanelStatus status) {
		return Painter.facing(block, facing).setValue(PanelBlock.STATUS, status);
	}

	public static BlockState slab(Block slab, boolean top) {
		return slab.defaultBlockState().setValue(SlabBlock.TYPE, top ? SlabType.TOP : SlabType.BOTTOM);
	}
}
