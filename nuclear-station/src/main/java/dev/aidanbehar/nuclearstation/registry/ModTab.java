package dev.aidanbehar.nuclearstation.registry;

import dev.aidanbehar.nuclearstation.NuclearStation;
import net.fabricmc.fabric.api.creativetab.v1.FabricCreativeModeTab;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.Block;

/** Creative inventory tab with every block and item of the mod. */
public final class ModTab {
	public static final CreativeModeTab TAB = Registry.register(BuiltInRegistries.CREATIVE_MODE_TAB, NuclearStation.id("main"),
		FabricCreativeModeTab.builder()
			.title(Component.translatable("itemGroup.nuclearstation.main"))
			.icon(() -> new ItemStack(ModBlocks.SIGN_PLATE))
			.displayItems((params, output) -> {
				ModItems.ALL.forEach(output::accept);
				for (Block b : ModBlocks.ALL) {
					output.accept(b);
				}
			})
			.build());

	private ModTab() {
	}

	public static void init() {
	}
}
