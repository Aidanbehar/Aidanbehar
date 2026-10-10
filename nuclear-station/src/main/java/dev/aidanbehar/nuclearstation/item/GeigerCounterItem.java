package dev.aidanbehar.nuclearstation.item;

import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;

/**
 * Hand-held Geiger-Mueller survey instrument. While held it clicks and shows the local
 * gamma dose rate on the HUD; using it records a reading with position in chat.
 */
public class GeigerCounterItem extends DescribedItem {
	public GeigerCounterItem(Item.Properties properties) {
		super(properties, false);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (player instanceof ServerPlayer serverPlayer && level instanceof ServerLevel server) {
			RadiationManager.Reading r = RadiationManager.measure(server, serverPlayer);
			ChatFormatting colour = RadiationManager.colourFor(r.doseRate());
			serverPlayer.sendSystemMessage(Component.translatable("message.nuclearstation.geiger_reading",
				Component.literal(RadiationManager.formatDoseRate(r.doseRate())).withStyle(colour),
				String.format("%.0f", r.groundContamination()),
				player.getBlockX(), player.getBlockY(), player.getBlockZ()));
		}
		return InteractionResult.SUCCESS;
	}
}
