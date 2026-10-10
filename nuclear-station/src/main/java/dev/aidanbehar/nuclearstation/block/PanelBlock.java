package dev.aidanbehar.nuclearstation.block;

import net.minecraft.core.Direction;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.EnumProperty;

/**
 * Indicator panel (mimic board section or annunciator) whose lamps reflect live plant
 * state. The plant layer updates STATUS for panels it built; the textures differ per state.
 */
public class PanelBlock extends FacingBlock {
	public static final EnumProperty<PanelStatus> STATUS = EnumProperty.create("status", PanelStatus.class);

	public PanelBlock(BlockBehaviour.Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(FACING, Direction.NORTH).setValue(STATUS, PanelStatus.NORMAL));
	}

	public static int light(BlockState state) {
		return switch (state.getValue(STATUS)) {
			case OFF -> 0;
			case NORMAL -> 4;
			case CAUTION, ALARM -> 7;
		};
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(FACING, STATUS);
	}
}
