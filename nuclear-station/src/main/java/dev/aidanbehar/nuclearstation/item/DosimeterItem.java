package dev.aidanbehar.nuclearstation.item;

import dev.aidanbehar.nuclearstation.radiation.PlayerRadiation;
import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;

/**
 * Electronic personal dosimeter. Carried anywhere in the inventory it records the
 * wearer's dose and sounds an alarm at the dose-rate and dose thresholds.
 */
public class DosimeterItem extends DescribedItem {
	public DosimeterItem(Item.Properties properties) {
		super(properties, false);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (player instanceof ServerPlayer serverPlayer) {
			PlayerRadiation rad = RadiationManager.data(serverPlayer);
			serverPlayer.sendSystemMessage(Component.translatable("message.nuclearstation.dosimeter",
				Component.literal(String.format("%.2f mSv", rad.lifetimeDose())).withStyle(ChatFormatting.AQUA),
				Component.literal(String.format("%.1f mSv", rad.acuteDose())).withStyle(RadiationManager.colourForDose(rad.acuteDose())),
				Component.literal(RadiationManager.formatDoseRate(rad.lastDoseRate())).withStyle(RadiationManager.colourFor(rad.lastDoseRate())),
				String.format("%.0f", rad.contamination())));
		}
		return InteractionResult.SUCCESS;
	}
}
