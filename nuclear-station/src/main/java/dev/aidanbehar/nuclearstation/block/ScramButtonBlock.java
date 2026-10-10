package dev.aidanbehar.nuclearstation.block;

import dev.aidanbehar.nuclearstation.plant.PlantService;
import java.util.Map;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Red mushroom-head reactor trip pushbutton. Only buttons that are wired into the
 * reactor protection system (those built with the plant) can trip the reactor.
 */
public class ScramButtonBlock extends FacingBlock {
	private static final Map<Direction, VoxelShape> SHAPES = Map.of(
		Direction.NORTH, Block.box(4, 4, 11, 12, 12, 16),
		Direction.SOUTH, Block.box(4, 4, 0, 12, 12, 5),
		Direction.WEST, Block.box(11, 4, 4, 16, 12, 12),
		Direction.EAST, Block.box(0, 4, 4, 5, 12, 12));

	public ScramButtonBlock(BlockBehaviour.Properties properties) {
		super(properties);
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPES.get(state.getValue(FACING));
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext context) {
		Direction face = context.getClickedFace();
		Direction facing = face.getAxis().isHorizontal() ? face : context.getHorizontalDirection().getOpposite();
		return defaultBlockState().setValue(FACING, facing);
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (player instanceof ServerPlayer serverPlayer) {
			PlantService.manualTripButton(serverPlayer, pos);
		}
		return InteractionResult.SUCCESS;
	}
}
