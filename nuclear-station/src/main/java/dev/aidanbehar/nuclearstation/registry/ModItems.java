package dev.aidanbehar.nuclearstation.registry;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.item.DeconKitItem;
import dev.aidanbehar.nuclearstation.item.DescribedItem;
import dev.aidanbehar.nuclearstation.item.DosimeterItem;
import dev.aidanbehar.nuclearstation.item.GeigerCounterItem;
import dev.aidanbehar.nuclearstation.item.SparePartItem;
import dev.aidanbehar.nuclearstation.item.SurveyMeterItem;
import dev.aidanbehar.nuclearstation.sim.SparePart;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.equipment.ArmorMaterial;
import net.minecraft.world.item.equipment.ArmorType;
import net.minecraft.world.item.equipment.EquipmentAsset;
import net.minecraft.world.item.equipment.EquipmentAssets;

/** All non-block items. */
public final class ModItems {
	public static final List<Item> ALL = new ArrayList<>();

	public static final TagKey<Item> REPAIRS_HAZMAT = TagKey.create(Registries.ITEM, NuclearStation.id("repairs_hazmat"));
	public static final ResourceKey<EquipmentAsset> HAZMAT_ASSET = ResourceKey.create(EquipmentAssets.ROOT_ID, NuclearStation.id("hazmat"));
	public static final ResourceKey<EquipmentAsset> RESPIRATOR_ASSET = ResourceKey.create(EquipmentAssets.ROOT_ID, NuclearStation.id("respirator"));
	public static final ResourceKey<EquipmentAsset> LEAD_APRON_ASSET = ResourceKey.create(EquipmentAssets.ROOT_ID, NuclearStation.id("lead_apron"));

	public static final ArmorMaterial HAZMAT = new ArmorMaterial(12,
		Map.of(ArmorType.HELMET, 1, ArmorType.CHESTPLATE, 2, ArmorType.LEGGINGS, 2, ArmorType.BOOTS, 1, ArmorType.BODY, 2),
		5, SoundEvents.ARMOR_EQUIP_LEATHER, 0f, 0f, REPAIRS_HAZMAT, HAZMAT_ASSET);
	public static final ArmorMaterial RESPIRATOR_MATERIAL = new ArmorMaterial(15,
		Map.of(ArmorType.HELMET, 1, ArmorType.CHESTPLATE, 0, ArmorType.LEGGINGS, 0, ArmorType.BOOTS, 0, ArmorType.BODY, 0),
		5, SoundEvents.ARMOR_EQUIP_IRON, 0f, 0f, REPAIRS_HAZMAT, RESPIRATOR_ASSET);
	public static final ArmorMaterial LEAD_APRON_MATERIAL = new ArmorMaterial(25,
		Map.of(ArmorType.HELMET, 0, ArmorType.CHESTPLATE, 3, ArmorType.LEGGINGS, 0, ArmorType.BOOTS, 0, ArmorType.BODY, 0),
		3, SoundEvents.ARMOR_EQUIP_IRON, 0f, 0.05f, REPAIRS_HAZMAT, LEAD_APRON_ASSET);

	// ----------------------------------------------------------------- instruments and protective equipment
	public static final Item GEIGER_COUNTER = register("geiger_counter", GeigerCounterItem::new, new Item.Properties().stacksTo(1));
	public static final Item DOSIMETER = register("dosimeter", DosimeterItem::new, new Item.Properties().stacksTo(1));
	public static final Item SURVEY_METER = register("survey_meter", SurveyMeterItem::new, new Item.Properties().stacksTo(1));
	public static final Item DECON_KIT = register("decon_kit", DeconKitItem::new, new Item.Properties().stacksTo(16));
	public static final Item HAZMAT_HOOD = register("hazmat_hood", p -> new DescribedItem(p, false), new Item.Properties().humanoidArmor(HAZMAT, ArmorType.HELMET));
	public static final Item HAZMAT_SUIT = register("hazmat_suit", p -> new DescribedItem(p, false), new Item.Properties().humanoidArmor(HAZMAT, ArmorType.CHESTPLATE));
	public static final Item HAZMAT_TROUSERS = register("hazmat_trousers", p -> new DescribedItem(p, false), new Item.Properties().humanoidArmor(HAZMAT, ArmorType.LEGGINGS));
	public static final Item HAZMAT_BOOTS = register("hazmat_boots", p -> new DescribedItem(p, false), new Item.Properties().humanoidArmor(HAZMAT, ArmorType.BOOTS));
	public static final Item RESPIRATOR = register("respirator", p -> new DescribedItem(p, false), new Item.Properties().humanoidArmor(RESPIRATOR_MATERIAL, ArmorType.HELMET));
	public static final Item LEAD_APRON = register("lead_apron", p -> new DescribedItem(p, false), new Item.Properties().humanoidArmor(LEAD_APRON_MATERIAL, ArmorType.CHESTPLATE));

	// ----------------------------------------------------------------- spare parts
	public static final Map<SparePart, Item> SPARE_PARTS = new EnumMap<>(SparePart.class);

	static {
		for (SparePart part : SparePart.values()) {
			SPARE_PARTS.put(part, register(part.itemId, p -> new SparePartItem(p, part), new Item.Properties().stacksTo(16)));
		}
	}

	// ----------------------------------------------------------------- minerals and processed materials
	public static final Item RAW_URANINITE = material("raw_uraninite", false);
	public static final Item PITCHBLENDE_CHUNK = material("pitchblende_chunk", false);
	public static final Item THORIANITE_CRYSTAL = material("thorianite_crystal", false);
	public static final Item MONAZITE_CONCENTRATE = material("monazite_concentrate", false);
	public static final Item CARNOTITE_POWDER = material("carnotite_powder", false);
	public static final Item AUTUNITE_CRYSTAL = material("autunite_crystal", false);
	public static final Item BARITE_CHUNK = material("barite_chunk", false);
	public static final Item RADIUM_SALTS = material("radium_salts", false);
	public static final Item SHALE_FRAGMENT = material("shale_fragment", false);
	public static final Item RAW_GALENA = material("raw_galena", false);
	public static final Item LEAD_INGOT = material("lead_ingot", false);
	public static final Item YELLOWCAKE = material("yellowcake", false);
	public static final Item URANIUM_DIOXIDE_PELLET = material("uranium_dioxide_pellet", false);
	public static final Item ZIRCON_CRYSTAL = material("zircon_crystal", false);
	public static final Item ZIRCALOY_INGOT = material("zircaloy_ingot", false);
	public static final Item COLEMANITE_CHUNK = material("colemanite_chunk", false);
	public static final Item BORON_CARBIDE = material("boron_carbide", false);
	public static final Item GRAPHITE_FLAKE = material("graphite_flake", false);
	// reserved for future development
	public static final Item XENOTIME_CRYSTAL = material("xenotime_crystal", true);
	public static final Item BERYL_CRYSTAL = material("beryl_crystal", true);
	public static final Item SPODUMENE_CRYSTAL = material("spodumene_crystal", true);
	public static final Item GREENOCKITE_CHUNK = material("greenockite_chunk", true);
	public static final Item THORIUM_DIOXIDE = material("thorium_dioxide", true);
	public static final Item BERYLLIUM_INGOT = material("beryllium_ingot", true);
	public static final Item LITHIUM_CARBONATE = material("lithium_carbonate", true);
	public static final Item CADMIUM_INGOT = material("cadmium_ingot", true);
	public static final Item RESONITE_SHARD = material("resonite_shard", true);
	public static final Item VOIDSTONE_FRAGMENT = material("voidstone_fragment", true);

	private ModItems() {
	}

	public static void init() {
		NuclearStation.LOG.debug("Registered {} items", ALL.size());
	}

	private static Item material(String id, boolean reserved) {
		return register(id, p -> new DescribedItem(p, reserved), new Item.Properties());
	}

	private static Item register(String id, Function<Item.Properties, Item> factory, Item.Properties properties) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, NuclearStation.id(id));
		Item item = factory.apply(properties.setId(key));
		Registry.register(BuiltInRegistries.ITEM, key, item);
		ALL.add(item);
		return item;
	}
}
