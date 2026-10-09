package com.deepwinter.item;

import com.deepwinter.DeepWinter;
import net.fabricmc.fabric.api.creativetab.v1.CreativeModeTabEvents;
import net.minecraft.core.HolderGetter;
import net.minecraft.core.Registry;
import net.minecraft.core.component.DataComponents;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.tags.BlockTags;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.item.ToolMaterial;
import net.minecraft.world.item.component.Tool;
import net.minecraft.world.level.block.Block;

import java.util.List;
import java.util.function.Function;

public final class ModItems {
	/** Blocks the snow shovel cuts through very quickly. */
	public static final TagKey<Block> SHOVEL_FAST = TagKey.create(Registries.BLOCK, DeepWinter.id("snow_shovel_fast"));

	public static final Item THERMOMETER = register("thermometer", ThermometerItem::new,
		new Item.Properties().stacksTo(1).rarity(Rarity.COMMON));

	public static final Item SNOW_SHOVEL = register("snow_shovel", SnowShovelItem::new, snowShovelProperties());

	private ModItems() {
	}

	private static Item.Properties snowShovelProperties() {
		HolderGetter<Block> blocks = BuiltInRegistries.acquireBootstrapRegistrationLookup(BuiltInRegistries.BLOCK);
		// Iron-tier shovel (250 durability, repairable with iron, enchantable), but much faster on snow.
		Item.Properties props = new Item.Properties().shovel(ToolMaterial.IRON, 1.5F, -3.0F).durability(320);
		return props.component(DataComponents.TOOL, new Tool(List.of(
			Tool.Rule.minesAndDrops(blocks.getOrThrow(SHOVEL_FAST), 22.0F),
			Tool.Rule.deniesDrops(blocks.getOrThrow(BlockTags.INCORRECT_FOR_IRON_TOOL)),
			Tool.Rule.minesAndDrops(blocks.getOrThrow(BlockTags.MINEABLE_WITH_SHOVEL), 6.0F)
		), 1.0F, 1, true));
	}

	private static Item register(String name, Function<Item.Properties, Item> factory, Item.Properties props) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, DeepWinter.id(name));
		return Registry.register(BuiltInRegistries.ITEM, key, factory.apply(props.setId(key)));
	}

	public static void init() {
		CreativeModeTabEvents.modifyOutputEvent(CreativeModeTabs.TOOLS_AND_UTILITIES).register(output -> {
			output.insertAfter(Items.SPYGLASS, THERMOMETER);
			output.insertAfter(Items.NETHERITE_HOE, SNOW_SHOVEL);
		});
	}
}
