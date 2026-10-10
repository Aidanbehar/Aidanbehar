package dev.aidanbehar.nuclearstation.facility;

import java.util.function.Consumer;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.LevelChunk;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * Writes facility blocks into one loaded chunk. Blocks are placed without neighbour
 * updates, shape updates, drops or onPlace callbacks, so placed water does not flow and
 * nothing cascades into neighbouring chunks. Clients receive the changes as batched
 * section updates.
 */
public final class LevelSink implements BlockSink {
	private static final int FLAGS = Block.UPDATE_CLIENTS | Block.UPDATE_KNOWN_SHAPE | Block.UPDATE_SUPPRESS_DROPS | Block.UPDATE_SKIP_ON_PLACE;
	private final ServerLevel level;
	private final LevelChunk chunk;
	private final BlockPos.MutableBlockPos cursor = new BlockPos.MutableBlockPos();
	private int writes;

	public LevelSink(ServerLevel level, LevelChunk chunk) {
		this.level = level;
		this.chunk = chunk;
		// Promote block entities still stored as pending NBT (beehives, structure chests)
		// while their block states are intact. Otherwise replacing the block leaves the
		// pending entry behind and the next write at that position fails to create it.
		for (BlockPos pos : chunk.getBlockEntitiesPos()) {
			chunk.getBlockEntity(pos);
		}
	}

	@Override
	public BlockState get(int x, int y, int z) {
		return chunk.getBlockState(cursor.set(x, y, z));
	}

	@Override
	public void set(int x, int y, int z, BlockState state) {
		cursor.set(x, y, z);
		if (chunk.getBlockState(cursor) != state) {
			level.setBlock(cursor, state, FLAGS);
			writes++;
		}
	}

	@Override
	public void configure(int x, int y, int z, Consumer<BlockEntity> action) {
		BlockEntity be = chunk.getBlockEntity(new BlockPos(x, y, z));
		if (be != null) {
			action.accept(be);
			be.setChanged();
		}
	}

	@Override
	public int topY(int x, int z) {
		return chunk.getHeight(Heightmap.Types.WORLD_SURFACE, x & 15, z & 15);
	}

	@Override
	public int minY() {
		return level.getMinY();
	}

	@Override
	public int maxY() {
		return level.getMaxY();
	}

	public int writes() {
		return writes;
	}
}
