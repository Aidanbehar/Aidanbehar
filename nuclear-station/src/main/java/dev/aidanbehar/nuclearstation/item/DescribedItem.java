package dev.aidanbehar.nuclearstation.item;

import dev.aidanbehar.nuclearstation.radiation.ItemRadioactivity;
import dev.aidanbehar.nuclearstation.registry.ModComponents;
import java.util.function.Consumer;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.component.TooltipDisplay;

/**
 * Item with a descriptive tooltip ({@code item.nuclearstation.<id>.desc}), its
 * radioactivity, and an explicit marker for materials reserved for future development.
 */
public class DescribedItem extends Item {
	private final boolean reserved;

	public DescribedItem(Item.Properties properties, boolean reservedForFuture) {
		super(properties);
		this.reserved = reservedForFuture;
	}

	@Override
	public void appendHoverText(ItemStack stack, Item.TooltipContext context, TooltipDisplay display, Consumer<Component> builder, TooltipFlag flag) {
		builder.accept(Component.translatable(getDescriptionId() + ".desc").withStyle(ChatFormatting.GRAY));
		appendRadiation(stack, builder);
		if (reserved) {
			builder.accept(Component.translatable("tooltip.nuclearstation.reserved").withStyle(ChatFormatting.DARK_PURPLE, ChatFormatting.ITALIC));
		}
	}

	public static void appendRadiation(ItemStack stack, Consumer<Component> builder) {
		float activity = ItemRadioactivity.activity(stack);
		if (activity > 0) {
			builder.accept(Component.translatable("tooltip.nuclearstation.radioactive", String.format("%.1f", activity)).withStyle(ChatFormatting.YELLOW));
		}
		Float contamination = stack.get(ModComponents.CONTAMINATION);
		if (contamination != null && contamination > 0.5f) {
			builder.accept(Component.translatable("tooltip.nuclearstation.contaminated", String.format("%.0f", contamination)).withStyle(ChatFormatting.RED));
		}
	}

	public boolean reservedForFuture() {
		return reserved;
	}
}
