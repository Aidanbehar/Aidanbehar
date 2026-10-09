package com.deepwinter.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.LightLayer;
import net.minecraft.world.level.ScheduledTickAccess;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.SlabBlock;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.level.block.state.properties.SlabType;
import net.minecraft.world.level.pathfinder.PathComputationType;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Snow resting on a bottom slab. It lives in the cell above the slab but its model and shape start half a
 * block lower, so the snow sits on the slab's real top surface instead of floating. Layers 1..12: the
 * first 4 fill the slab's empty upper half, 12 is flush with the top of the cell, after which ordinary
 * snow continues on top.
 */
public class SettledSnowBlock extends Block {
	public static final int MAX_LAYERS = 12;
	public static final IntegerProperty LAYERS = IntegerProperty.create("layers", 1, MAX_LAYERS);
	private static final VoxelShape[] SHAPES = new VoxelShape[MAX_LAYERS + 1];

	static {
		SHAPES[0] = Shapes.empty();
		for (int i = 1; i <= MAX_LAYERS; i++) {
			SHAPES[i] = Block.box(0, -8, 0, 16, -8 + i * 2, 16);
		}
	}

	public SettledSnowBlock(BlockBehaviour.Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(LAYERS, 1));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(LAYERS);
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPES[Math.max(1, state.getValue(LAYERS))];
	}

	@Override
	protected VoxelShape getCollisionShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPES[state.getValue(LAYERS) - 1];
	}

	@Override
	protected VoxelShape getBlockSupportShape(BlockState state, BlockGetter level, BlockPos pos) {
		return SHAPES[state.getValue(LAYERS)];
	}

	@Override
	protected boolean isPathfindable(BlockState state, PathComputationType type) {
		return type == PathComputationType.LAND && state.getValue(LAYERS) < 9;
	}

	@Override
	protected boolean canBeReplaced(BlockState state, BlockPlaceContext context) {
		return state.getValue(LAYERS) <= 2;
	}

	public static boolean isSupport(BlockState below) {
		return below.getBlock() instanceof SlabBlock
			&& below.getValue(SlabBlock.TYPE) == SlabType.BOTTOM
			&& below.getFluidState().isEmpty();
	}

	@Override
	protected boolean canSurvive(BlockState state, LevelReader level, BlockPos pos) {
		return isSupport(level.getBlockState(pos.below()));
	}

	@Override
	protected BlockState updateShape(BlockState state, LevelReader level, ScheduledTickAccess ticks, BlockPos pos,
									 Direction direction, BlockPos neighbourPos, BlockState neighbourState, RandomSource random) {
		return !state.canSurvive(level, pos) ? Blocks.AIR.defaultBlockState()
			: super.updateShape(state, level, ticks, pos, direction, neighbourPos, neighbourState, random);
	}

	@Override
	protected void randomTick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
		if (level.getBrightness(LightLayer.BLOCK, pos) > 11) {
			dropResources(state, level, pos);
			level.removeBlock(pos, false);
		}
	}
}
