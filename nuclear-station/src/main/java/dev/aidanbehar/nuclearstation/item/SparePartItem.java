package dev.aidanbehar.nuclearstation.item;

import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import dev.aidanbehar.nuclearstation.sim.SparePart;
import java.util.function.Consumer;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.component.TooltipDisplay;

/** Maintenance spare part; consumed at a local station to repair matching equipment. */
public class SparePartItem extends Item {
	public final SparePart part;

	public SparePartItem(Item.Properties properties, SparePart part) {
		super(properties);
		this.part = part;
	}

	@Override
	public void appendHoverText(ItemStack stack, Item.TooltipContext context, TooltipDisplay display, Consumer<Component> builder, TooltipFlag flag) {
		builder.accept(Component.translatable("tooltip.nuclearstation.spare_part").withStyle(ChatFormatting.GRAY));
		int shown = 0;
		for (EquipmentId id : EquipmentId.values()) {
			if (id.part == part) {
				if (shown < 6) {
					builder.accept(Component.literal("  " + id.label).withStyle(ChatFormatting.DARK_AQUA));
				}
				shown++;
			}
		}
		if (shown > 6) {
			builder.accept(Component.translatable("tooltip.nuclearstation.and_more", shown - 6).withStyle(ChatFormatting.DARK_GRAY));
		}
	}
}
