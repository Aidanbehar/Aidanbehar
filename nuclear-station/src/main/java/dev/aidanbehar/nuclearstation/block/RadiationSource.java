package dev.aidanbehar.nuclearstation.block;

import net.minecraft.core.BlockPos;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Implemented by blocks that emit ionising radiation. Strength is the gamma dose rate in
 * microsieverts per hour at one metre from the block, before shielding.
 */
public interface RadiationSource {
	float radiationStrength(Level level, BlockPos pos, BlockState state);

	/** Blocks whose emission is constant can be indexed without looking up a block entity. */
	default boolean constantStrength() {
		return true;
	}
}
