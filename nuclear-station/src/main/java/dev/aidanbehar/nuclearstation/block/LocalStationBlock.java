package dev.aidanbehar.nuclearstation.block;

import dev.aidanbehar.nuclearstation.plant.Maintenance;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;

/**
 * Local control and maintenance station next to a piece of plant equipment. Shows the
 * equipment's condition; using the matching spare part on it performs a repair.
 */
public class LocalStationBlock extends FacingBlock {
	public LocalStationBlock(BlockBehaviour.Properties properties) {
		super(properties);
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos, Player player,
			InteractionHand hand, BlockHitResult hit) {
		if (stack.isEmpty()) {
			return InteractionResult.TRY_WITH_EMPTY_HAND;
		}
		if (player instanceof ServerPlayer serverPlayer) {
			Maintenance.useStation(serverPlayer, pos, stack);
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (player instanceof ServerPlayer serverPlayer) {
			Maintenance.useStation(serverPlayer, pos, ItemStack.EMPTY);
		}
		return InteractionResult.SUCCESS;
	}
}
