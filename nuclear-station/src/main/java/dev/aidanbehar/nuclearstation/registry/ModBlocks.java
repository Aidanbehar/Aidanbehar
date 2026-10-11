package dev.aidanbehar.nuclearstation.registry;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.block.CableTrayBlock;
import dev.aidanbehar.nuclearstation.block.ControlConsoleBlock;
import dev.aidanbehar.nuclearstation.block.CoriumBlock;
import dev.aidanbehar.nuclearstation.block.DeconShowerBlock;
import dev.aidanbehar.nuclearstation.block.ExperimentalConsoleBlock;
import dev.aidanbehar.nuclearstation.block.FacingBlock;
import dev.aidanbehar.nuclearstation.block.GlowBlock;
import dev.aidanbehar.nuclearstation.block.LampBlock;
import dev.aidanbehar.nuclearstation.block.LocalStationBlock;
import dev.aidanbehar.nuclearstation.block.PanelBlock;
import dev.aidanbehar.nuclearstation.block.PipeBlock;
import dev.aidanbehar.nuclearstation.block.RadioactiveBlock;
import dev.aidanbehar.nuclearstation.block.ScramButtonBlock;
import dev.aidanbehar.nuclearstation.block.SignPlateBlock;
import dev.aidanbehar.nuclearstation.block.WarningBeaconBlock;
import dev.aidanbehar.nuclearstation.block.WasteDrumBlock;
import dev.aidanbehar.nuclearstation.block.WasteDrumBlockEntity;
import dev.aidanbehar.nuclearstation.block.WaterloggedRadioactiveBlock;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.TransparentBlock;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockBehaviour.Properties;
import net.minecraft.world.level.material.MapColor;
import net.minecraft.world.level.material.PushReaction;

/** All blocks of the mod. Every block also registers a block item unless noted. */
public final class ModBlocks {
	/** Registration order, used for the creative tab and asset validation. */
	public static final List<Block> ALL = new ArrayList<>();
	public static final List<Block> ORES = new ArrayList<>();

	// ----------------------------------------------------------------- structure
	public static final Block REINFORCED_CONCRETE = register("reinforced_concrete", Block::new, concrete());
	public static final Block CONCRETE_PANEL = register("concrete_panel", Block::new, concrete());
	public static final Block DARK_CONCRETE = register("dark_concrete", Block::new, concrete().mapColor(MapColor.COLOR_GRAY));
	public static final Block CONTAINMENT_CONCRETE = register("containment_concrete", Block::new, concrete().strength(8f, 1200f));
	public static final Block CONTAINMENT_LINER = register("containment_liner", Block::new, metal());
	public static final Block STEEL_FLOOR_PLATE = register("steel_floor_plate", Block::new, metal());
	public static final Block HAZARD_STRIPES = register("hazard_stripes", Block::new, concrete().mapColor(MapColor.COLOR_YELLOW));
	public static final Block EPOXY_FLOOR = register("epoxy_floor", Block::new, concrete().mapColor(MapColor.COLOR_GREEN));
	public static final Block LAB_FLOOR = register("lab_floor", Block::new, concrete().mapColor(MapColor.SNOW));
	public static final Block RUBBER_FLOOR = register("rubber_floor", Block::new, Properties.of().mapColor(MapColor.COLOR_BLACK).strength(1.5f).sound(SoundType.WOOL));
	public static final Block CLADDING_BLUE = register("cladding_blue", Block::new, metal().mapColor(MapColor.COLOR_BLUE));
	public static final Block CLADDING_WHITE = register("cladding_white", Block::new, metal().mapColor(MapColor.SNOW));
	public static final Block CLADDING_GREY = register("cladding_grey", Block::new, metal().mapColor(MapColor.COLOR_LIGHT_GRAY));
	public static final Block PAINTED_WALL = register("painted_wall", Block::new, concrete().mapColor(MapColor.SAND));
	public static final Block ACOUSTIC_CEILING = register("acoustic_ceiling", Block::new, Properties.of().mapColor(MapColor.SNOW).strength(1f).sound(SoundType.WOOL));
	public static final Block OFFICE_CARPET = register("office_carpet", Block::new, Properties.of().mapColor(MapColor.COLOR_BLUE).strength(0.8f).sound(SoundType.WOOL));
	public static final Block WHITE_TILE = register("white_tile", Block::new, concrete().mapColor(MapColor.SNOW).sound(SoundType.CALCITE));
	public static final Block LEAD_BLOCK = register("lead_block", Block::new, metal().mapColor(MapColor.COLOR_GRAY).strength(4f, 12f));
	public static final Block DUCT = register("duct", Block::new, metal().mapColor(MapColor.METAL));
	public static final Block INSULATION_CLADDING = register("insulation_cladding", Block::new, metal().mapColor(MapColor.METAL).strength(3f, 6f));
	public static final Block DAMAGED_CONCRETE = register("damaged_concrete", Block::new, concrete().strength(1.5f, 3f));
	public static final Block LEAD_GLASS = register("lead_glass", TransparentBlock::new, glass().strength(2f, 12f));
	public static final Block STEEL_GRATING = register("steel_grating", TransparentBlock::new, metal().noOcclusion().isViewBlocking((s, l, p, a) -> false));
	public static final Block CRANE_GIRDER = register("crane_girder", Block::new, metal().mapColor(MapColor.COLOR_YELLOW));

	// ----------------------------------------------------------------- machinery
	public static final Block REACTOR_VESSEL = register("reactor_vessel", Block::new, machine().mapColor(MapColor.COLOR_GRAY));
	public static final Block REACTOR_VESSEL_HEAD = register("reactor_vessel_head", Block::new, machine().mapColor(MapColor.COLOR_GRAY));
	public static final Block CRDM_HOUSING = register("crdm_housing", Block::new, machine());
	public static final Block STEAM_GENERATOR_SHELL = register("steam_generator_shell", Block::new, machine().mapColor(MapColor.SNOW));
	public static final Block PRESSURIZER_SHELL = register("pressurizer_shell", Block::new, machine().mapColor(MapColor.SNOW));
	public static final Block TURBINE_CASING = register("turbine_casing", Block::new, machine().mapColor(MapColor.COLOR_GREEN));
	public static final Block GENERATOR_HOUSING = register("generator_housing", Block::new, machine().mapColor(MapColor.COLOR_BLUE));
	public static final Block CONDENSER_SHELL = register("condenser_shell", Block::new, machine());
	public static final Block TRANSFORMER_BODY = register("transformer_body", Block::new, machine().mapColor(MapColor.COLOR_GRAY));
	public static final Block TRANSFORMER_RADIATOR = register("transformer_radiator", Block::new, machine().mapColor(MapColor.COLOR_GRAY));
	public static final Block TANK_SHELL = register("tank_shell", Block::new, machine().mapColor(MapColor.SNOW));
	public static final Block DIESEL_ENGINE = register("diesel_engine", Block::new, machine().mapColor(MapColor.COLOR_RED));
	public static final Block BATTERY_RACK = register("battery_rack", Block::new, machine());
	public static final Block HEAT_EXCHANGER = register("heat_exchanger", Block::new, machine());
	public static final Block MOTOR_HOUSING = register("motor_housing", Block::new, machine().mapColor(MapColor.COLOR_BLUE));
	public static final Block PUMP_CASING = register("pump_casing", FacingBlock::new, machine().mapColor(MapColor.COLOR_BLUE));
	public static final Block REACTOR_COOLANT_PUMP = register("reactor_coolant_pump", FacingBlock::new, machine());
	public static final Block INSTRUMENT_RACK = register("instrument_rack", FacingBlock::new, metal().lightLevel(s -> 3));
	public static final Block SWITCHGEAR_CABINET = register("switchgear_cabinet", FacingBlock::new, metal().mapColor(MapColor.COLOR_LIGHT_GRAY));
	public static final Block VENTILATION_FAN = register("ventilation_fan", FacingBlock::new, metal());
	public static final Block SERVER_RACK = register("server_rack", FacingBlock::new, metal().mapColor(MapColor.COLOR_BLACK).lightLevel(s -> 4));
	public static final Block LOCKER = register("locker", FacingBlock::new, metal().mapColor(MapColor.COLOR_LIGHT_GRAY).strength(2f));

	public static final Block PIPE_PRIMARY = register("pipe_primary", PipeBlock::new, pipe());
	public static final Block PIPE_STEAM = register("pipe_steam", PipeBlock::new, pipe());
	public static final Block PIPE_FEEDWATER = register("pipe_feedwater", PipeBlock::new, pipe());
	public static final Block PIPE_SEAWATER = register("pipe_seawater", PipeBlock::new, pipe());
	public static final Block PIPE_SERVICE = register("pipe_service", PipeBlock::new, pipe());
	public static final Block CABLE_TRAY = register("cable_tray", CableTrayBlock::new, metal().noOcclusion().strength(2f));

	// ----------------------------------------------------------------- lighting, signage, controls
	public static final Block SIGN_PLATE = register("sign_plate", SignPlateBlock::new,
		metal().noOcclusion().noCollision().strength(1f).lightLevel(s -> s.getValue(SignPlateBlock.KIND).light));
	public static final Block FACILITY_LAMP = register("facility_lamp", LampBlock::new,
		glass().noOcclusion().lightLevel(s -> LampBlock.light(s, 15, 0)));
	public static final Block EMERGENCY_LAMP = register("emergency_lamp", LampBlock::new,
		glass().noOcclusion().lightLevel(s -> 9));
	public static final Block WARNING_BEACON = register("warning_beacon", WarningBeaconBlock::new,
		glass().noOcclusion().lightLevel(s -> s.getValue(WarningBeaconBlock.LIT) ? 13 : 0));
	public static final Block SIREN = register("siren", dev.aidanbehar.nuclearstation.block.SirenBlock::new,
		metal().noOcclusion().strength(3f).lightLevel(s -> s.getValue(dev.aidanbehar.nuclearstation.block.SirenBlock.ACTIVE) ? 12 : 0));
	public static final Block CONTROL_CONSOLE = register("control_console", ControlConsoleBlock::new, metal().lightLevel(s -> 5));
	public static final Block CONTROL_PANEL = register("control_panel", PanelBlock::new, metal().lightLevel(PanelBlock::light));
	public static final Block ANNUNCIATOR_PANEL = register("annunciator_panel", PanelBlock::new, metal().lightLevel(PanelBlock::light));
	public static final Block SCRAM_BUTTON = register("scram_button", ScramButtonBlock::new, metal().noOcclusion().strength(2f));
	public static final Block LOCAL_STATION = register("local_station", LocalStationBlock::new, metal().lightLevel(s -> 3));
	public static final Block DECON_SHOWER = register("decon_shower", DeconShowerBlock::new, metal());
	public static final Block WASTE_DRUM = register("waste_drum", WasteDrumBlock::new, metal().noOcclusion().strength(3f, 10f));

	// ----------------------------------------------------------------- nuclear materials in the plant
	public static final Block FUEL_ASSEMBLY = register("fuel_assembly",
		p -> new WaterloggedRadioactiveBlock(p, 5f, Block.box(3, 0, 3, 13, 16, 13)), metal().noOcclusion());
	public static final Block SPENT_FUEL_ASSEMBLY = register("spent_fuel_assembly",
		p -> new WaterloggedRadioactiveBlock(p, 2.0e7f, Block.box(3, 0, 3, 13, 16, 13)), metal().noOcclusion().lightLevel(s -> 4));
	public static final Block SPENT_FUEL_RACK = register("spent_fuel_rack",
		p -> new WaterloggedRadioactiveBlock(p, 0f, Block.box(0, 0, 0, 16, 16, 16)), metal().noOcclusion());
	public static final Block CHERENKOV_GLOW = register("cherenkov_glow", GlowBlock::new,
		Properties.of().noCollision().noOcclusion().replaceable().strength(-1f, 3600000f).noLootTable().lightLevel(s -> 15).pushReaction(PushReaction.POPPED));
	public static final Block CORIUM = register("corium", p -> new CoriumBlock(p, 5.0e7f),
		Properties.of().mapColor(MapColor.COLOR_BLACK).strength(30f, 1200f).requiresCorrectToolForDrops().sound(SoundType.BASALT).lightLevel(s -> 11));
	public static final Block CONTAMINATED_DEBRIS = register("contaminated_debris", p -> new RadioactiveBlock(p, 2000f),
		concrete().strength(1.5f, 3f).sound(SoundType.GRAVEL));
	public static final Block CONTAMINATED_SOIL = register("contaminated_soil", p -> new RadioactiveBlock(p, 120f),
		Properties.of().mapColor(MapColor.DIRT).strength(0.6f).sound(SoundType.GRAVEL));

	// ----------------------------------------------------------------- experimental research wing
	public static final Block EXP_CHAMBER_WALL = register("exp_chamber_wall", Block::new, machine().mapColor(MapColor.COLOR_PURPLE));
	public static final Block EXP_COIL = register("exp_coil", Block::new, machine().mapColor(MapColor.COLOR_ORANGE).lightLevel(s -> 6));
	public static final Block EXP_EMITTER = register("exp_emitter", FacingBlock::new, machine().mapColor(MapColor.COLOR_CYAN).lightLevel(s -> 9));
	public static final Block EXP_CONSOLE = register("exp_console", ExperimentalConsoleBlock::new, metal().lightLevel(s -> 5));
	public static final Block OBSERVATION_GLASS = register("observation_glass", TransparentBlock::new, glass().strength(3f, 20f));

	// ----------------------------------------------------------------- geology
	public static final Block URANINITE_ORE = ore("uraninite_ore", 20f, stoneOre());
	public static final Block DEEPSLATE_URANINITE_ORE = ore("deepslate_uraninite_ore", 20f, deepslateOre());
	public static final Block PITCHBLENDE_ORE = ore("pitchblende_ore", 45f, deepslateOre());
	public static final Block THORIANITE_ORE = ore("thorianite_ore", 25f, deepslateOre());
	public static final Block MONAZITE_SAND = ore("monazite_sand", 2f, Properties.of().mapColor(MapColor.SAND).strength(0.6f).sound(SoundType.SAND));
	public static final Block MONAZITE_ORE = ore("monazite_ore", 5f, stoneOre().mapColor(MapColor.DIRT));
	public static final Block CARNOTITE_ORE = ore("carnotite_ore", 10f, Properties.of().mapColor(MapColor.SAND).strength(1.2f).requiresCorrectToolForDrops());
	public static final Block AUTUNITE_ORE = ore("autunite_ore", 15f, stoneOre().lightLevel(s -> 3));
	public static final Block RADIFEROUS_BARITE_ORE = ore("radiferous_barite_ore", 30f, stoneOre());
	public static final Block RADIOACTIVE_SHALE = ore("radioactive_shale", 1.5f, stoneOre().mapColor(MapColor.COLOR_BLACK));
	public static final Block XENOTIME_ORE = ore("xenotime_ore", 3f, stoneOre());
	public static final Block ZIRCON_ORE = ore("zircon_ore", 0.5f, stoneOre());
	public static final Block BERYL_ORE = ore("beryl_ore", 0f, stoneOre());
	public static final Block COLEMANITE_ORE = ore("colemanite_ore", 0f, stoneOre().mapColor(MapColor.SAND));
	public static final Block SPODUMENE_ORE = ore("spodumene_ore", 0f, stoneOre());
	public static final Block GREENOCKITE_ORE = ore("greenockite_ore", 0f, stoneOre());
	public static final Block GRAPHITE_ORE = ore("graphite_ore", 0f, stoneOre());
	public static final Block GALENA_ORE = ore("galena_ore", 0f, stoneOre());
	public static final Block RESONITE_ORE = ore("resonite_ore", 8f, deepslateOre().lightLevel(s -> 5));
	public static final Block VOIDSTONE = ore("voidstone", 0f, deepslateOre().mapColor(MapColor.COLOR_BLACK));

	public static final BlockEntityType<WasteDrumBlockEntity> WASTE_DRUM_ENTITY = Registry.register(
		BuiltInRegistries.BLOCK_ENTITY_TYPE, NuclearStation.id("waste_drum"),
		new BlockEntityType<>(WasteDrumBlockEntity::new, Set.of(WASTE_DRUM)));

	private ModBlocks() {
	}

	public static void init() {
		NuclearStation.LOG.debug("Registered {} blocks", ALL.size());
	}

	// ----------------------------------------------------------------- helpers

	private static Properties concrete() {
		return Properties.of().mapColor(MapColor.STONE).strength(3f, 9f).sound(SoundType.STONE).requiresCorrectToolForDrops();
	}

	private static Properties metal() {
		return Properties.of().mapColor(MapColor.METAL).strength(4f, 8f).sound(SoundType.METAL).requiresCorrectToolForDrops();
	}

	private static Properties machine() {
		return Properties.of().mapColor(MapColor.METAL).strength(6f, 12f).sound(SoundType.NETHERITE_BLOCK).requiresCorrectToolForDrops();
	}

	private static Properties glass() {
		return Properties.of().strength(0.6f).sound(SoundType.GLASS).noOcclusion().isValidSpawn((s, l, p, e) -> false)
			.isRedstoneConductor((s, l, p) -> false).isSuffocating((s, l, p) -> false).isViewBlocking((s, l, p, a) -> false);
	}

	private static Properties pipe() {
		return metal().noOcclusion().strength(3f, 8f);
	}

	private static Properties stoneOre() {
		return Properties.of().mapColor(MapColor.STONE).strength(3f, 3f).requiresCorrectToolForDrops();
	}

	private static Properties deepslateOre() {
		return Properties.of().mapColor(MapColor.DEEPSLATE).strength(4.5f, 3f).sound(SoundType.DEEPSLATE).requiresCorrectToolForDrops();
	}

	private static Block ore(String id, float strength, Properties properties) {
		Block block = strength > 0
			? register(id, p -> new RadioactiveBlock(p, strength), properties)
			: register(id, Block::new, properties);
		ORES.add(block);
		return block;
	}

	private static Block register(String id, Function<BlockBehaviour.Properties, Block> factory, Properties properties) {
		Identifier identifier = NuclearStation.id(id);
		ResourceKey<Block> key = ResourceKey.create(Registries.BLOCK, identifier);
		Block block = factory.apply(properties.setId(key));
		Registry.register(BuiltInRegistries.BLOCK, key, block);
		ResourceKey<Item> itemKey = ResourceKey.create(Registries.ITEM, identifier);
		BlockItem item = new BlockItem(block, new Item.Properties().setId(itemKey).useBlockDescriptionPrefix());
		item.registerBlocks(Item.BY_BLOCK, item);
		Registry.register(BuiltInRegistries.ITEM, itemKey, item);
		ALL.add(block);
		return block;
	}
}
