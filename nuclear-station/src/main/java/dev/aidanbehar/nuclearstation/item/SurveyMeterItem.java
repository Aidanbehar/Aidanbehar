package dev.aidanbehar.nuclearstation.item;

import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;

/**
 * Ground contamination survey instrument. Using it prints a map of surface
 * contamination around the user (4 x 4 block cells), used to plan cleanup and routes.
 */
public class SurveyMeterItem extends DescribedItem {
	public SurveyMeterItem(Item.Properties properties) {
		super(properties, false);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (player instanceof ServerPlayer serverPlayer && level instanceof ServerLevel server) {
			RadiationManager.sendSurveyMap(server, serverPlayer);
			player.getCooldowns().addCooldown(player.getItemInHand(hand), 40);
		}
		return InteractionResult.SUCCESS;
	}
}
