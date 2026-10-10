package dev.aidanbehar.nuclearstation.item;

import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

/**
 * Field decontamination kit (wipes, strippable coating, bags). Removes about half of the
 * user's surface contamination - less effective than a decontamination shower.
 */
public class DeconKitItem extends DescribedItem {
	public DeconKitItem(Item.Properties properties) {
		super(properties, false);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		ItemStack stack = player.getItemInHand(hand);
		if (player instanceof ServerPlayer serverPlayer) {
			RadiationManager.decontaminatePlayer(serverPlayer, 0.5f);
			level.playSound(null, player.blockPosition(), SoundEvents.BRUSH_GENERIC, SoundSource.PLAYERS, 0.8f, 1.2f);
			if (!player.getAbilities().instabuild) {
				stack.shrink(1);
			}
		}
		return InteractionResult.SUCCESS;
	}
}
