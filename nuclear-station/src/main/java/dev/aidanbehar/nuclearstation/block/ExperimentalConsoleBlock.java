package dev.aidanbehar.nuclearstation.block;

import dev.aidanbehar.nuclearstation.network.ModNetwork;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;

/** Console of the experimental reaction chamber. The chamber is not yet commissioned. */
public class ExperimentalConsoleBlock extends FacingBlock {
	public ExperimentalConsoleBlock(BlockBehaviour.Properties properties) {
		super(properties);
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (player instanceof ServerPlayer serverPlayer) {
			ModNetwork.openExperimentalConsole(serverPlayer);
		}
		return InteractionResult.SUCCESS;
	}
}
