package dev.aidanbehar.nuclearstation.radiation;

import dev.aidanbehar.nuclearstation.block.RadioactiveBlock;
import dev.aidanbehar.nuclearstation.registry.ModItems;
import java.util.IdentityHashMap;
import java.util.Map;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;

/** Intrinsic activity of radioactive items: dose rate at 1 m per item, uSv/h. */
public final class ItemRadioactivity {
	private static final Map<Item, Float> ACTIVITY = new IdentityHashMap<>();

	private ItemRadioactivity() {
	}

	public static void init() {
		ACTIVITY.put(ModItems.RAW_URANINITE, 2.0f);
		ACTIVITY.put(ModItems.PITCHBLENDE_CHUNK, 4.0f);
		ACTIVITY.put(ModItems.THORIANITE_CRYSTAL, 2.5f);
		ACTIVITY.put(ModItems.MONAZITE_CONCENTRATE, 0.6f);
		ACTIVITY.put(ModItems.CARNOTITE_POWDER, 1.0f);
		ACTIVITY.put(ModItems.AUTUNITE_CRYSTAL, 1.5f);
		ACTIVITY.put(ModItems.BARITE_CHUNK, 3.0f);
		ACTIVITY.put(ModItems.RADIUM_SALTS, 60.0f);
		ACTIVITY.put(ModItems.SHALE_FRAGMENT, 0.15f);
		ACTIVITY.put(ModItems.YELLOWCAKE, 1.2f);
		ACTIVITY.put(ModItems.URANIUM_DIOXIDE_PELLET, 0.6f);
		ACTIVITY.put(ModItems.XENOTIME_CRYSTAL, 0.3f);
		ACTIVITY.put(ModItems.THORIUM_DIOXIDE, 1.5f);
		ACTIVITY.put(ModItems.RESONITE_SHARD, 1.0f);
	}

	/** Activity of one item of this stack (uSv/h at 1 m), excluding surface contamination. */
	public static float activity(ItemStack stack) {
		if (stack.isEmpty()) {
			return 0;
		}
		Float a = ACTIVITY.get(stack.getItem());
		if (a != null) {
			return a;
		}
		if (stack.getItem() instanceof BlockItem blockItem && blockItem.getBlock() instanceof RadioactiveBlock radioactive) {
			return radioactive.strength();
		}
		return 0;
	}
}
