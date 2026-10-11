package dev.aidanbehar.nuclearstation.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.DustParticleOptions;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/** Outdoor emergency siren on a mast. ACTIVE while the site siren system is sounding. */
public class SirenBlock extends Block {
	public static final BooleanProperty ACTIVE = BooleanProperty.create("active");
	private static final VoxelShape SHAPE = Block.box(2, 0, 2, 14, 12, 14);

	public SirenBlock(BlockBehaviour.Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(ACTIVE, false));
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPE;
	}

	@Override
	public void animateTick(BlockState state, Level level, BlockPos pos, RandomSource random) {
		if (state.getValue(ACTIVE)) {
			level.addParticle(new DustParticleOptions(0xFF2020, 1.5f), pos.getX() + 0.5 + (random.nextDouble() - 0.5),
				pos.getY() + 1.0, pos.getZ() + 0.5 + (random.nextDouble() - 0.5), 0, 0, 0);
		}
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(ACTIVE);
	}
}
