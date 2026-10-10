package dev.aidanbehar.nuclearstation.block;

import java.util.Map;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.EnumProperty;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * A thin enamelled warning plate mounted on a wall. Right-click with an empty hand to
 * cycle the pictogram when placing signage by hand.
 */
public class SignPlateBlock extends FacingBlock {
	public static final EnumProperty<SignKind> KIND = EnumProperty.create("kind", SignKind.class);
	private static final Map<Direction, VoxelShape> SHAPES = Map.of(
		Direction.NORTH, Block.box(1, 1, 15, 15, 15, 16),
		Direction.SOUTH, Block.box(1, 1, 0, 15, 15, 1),
		Direction.WEST, Block.box(15, 1, 1, 16, 15, 15),
		Direction.EAST, Block.box(0, 1, 1, 1, 15, 15));

	public SignPlateBlock(BlockBehaviour.Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(FACING, Direction.NORTH).setValue(KIND, SignKind.RADIATION));
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
		if (!player.isShiftKeyDown()) {
			return InteractionResult.PASS;
		}
		SignKind[] kinds = SignKind.values();
		SignKind next = kinds[(state.getValue(KIND).ordinal() + 1) % kinds.length];
		if (!level.isClientSide()) {
			level.setBlock(pos, state.setValue(KIND, next), Block.UPDATE_ALL);
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(FACING, KIND);
	}
}
