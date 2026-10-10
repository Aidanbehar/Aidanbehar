package dev.aidanbehar.nuclearstation.facility;

import java.util.function.Consumer;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Destination for facility blocks, in world coordinates. Implementations write into a
 * live chunk, or record into memory for tests and for marker collection.
 */
public interface BlockSink {
	BlockState get(int x, int y, int z);

	void set(int x, int y, int z, BlockState state);

	/** Configures a block entity that was just placed (chest loot, sign text, lectern book). */
	default void configure(int x, int y, int z, Consumer<BlockEntity> action) {
	}

	/** Highest non-air block in the column (natural terrain before painting), or minY - 1. */
	int topY(int x, int z);

	int minY();

	int maxY();
}
