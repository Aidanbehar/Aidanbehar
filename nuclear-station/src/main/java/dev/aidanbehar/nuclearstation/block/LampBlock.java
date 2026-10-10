package dev.aidanbehar.nuclearstation.block;

import net.minecraft.core.BlockPos;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Ceiling light fitting. Facility lamps are fed from the station's AC buses: the plant
 * layer switches the POWERED state of lamps it built when lighting power is lost or
 * restored. Lamps placed by players are always powered.
 */
public class LampBlock extends Block {
	public static final BooleanProperty POWERED = BooleanProperty.create("powered");
	private static final VoxelShape SHAPE = Block.box(1, 13, 1, 15, 16, 15);

	public LampBlock(BlockBehaviour.Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(POWERED, true));
	}

	public static int light(BlockState state, int on, int off) {
		return state.getValue(POWERED) ? on : off;
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPE;
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(POWERED);
	}
}
