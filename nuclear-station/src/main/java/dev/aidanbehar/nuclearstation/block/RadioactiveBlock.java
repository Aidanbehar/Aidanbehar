package dev.aidanbehar.nuclearstation.block;

import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;

/**
 * A block containing radioactive material (ores, contaminated debris, corium...). Its
 * emission is indexed per chunk section by {@link RadiationManager}; placing or removing
 * it invalidates that section's cached source list.
 */
public class RadioactiveBlock extends Block implements RadiationSource {
	private final float strength;

	public RadioactiveBlock(BlockBehaviour.Properties properties, float strengthMicroSvPerHourAtOneMetre) {
		super(properties);
		this.strength = strengthMicroSvPerHourAtOneMetre;
	}

	@Override
	public float radiationStrength(Level level, BlockPos pos, BlockState state) {
		return strength;
	}

	public float strength() {
		return strength;
	}

	@Override
	protected void onPlace(BlockState state, Level level, BlockPos pos, BlockState oldState, boolean movedByPiston) {
		super.onPlace(state, level, pos, oldState, movedByPiston);
		if (level instanceof ServerLevel server && !oldState.is(state.getBlock())) {
			RadiationManager.invalidate(server, pos);
		}
	}

	@Override
	protected void affectNeighborsAfterRemoval(BlockState state, ServerLevel level, BlockPos pos, boolean movedByPiston) {
		super.affectNeighborsAfterRemoval(state, level, pos, movedByPiston);
		RadiationManager.invalidate(level, pos);
	}
}
