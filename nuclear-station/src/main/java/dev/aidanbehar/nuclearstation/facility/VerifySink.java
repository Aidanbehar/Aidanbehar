package dev.aidanbehar.nuclearstation.facility;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.LevelChunk;
import net.minecraft.world.level.levelgen.Heightmap;

/** Compares the blueprint's non-air blocks with a chunk without writing anything. */
final class VerifySink implements BlockSink {
	private final ServerLevel level;
	private final LevelChunk chunk;
	private final BlockPos.MutableBlockPos cursor = new BlockPos.MutableBlockPos();
	private int writes;
	private int mismatches;

	VerifySink(ServerLevel level, LevelChunk chunk) {
		this.level = level;
		this.chunk = chunk;
	}

	@Override
	public BlockState get(int x, int y, int z) {
		return chunk.getBlockState(cursor.set(x, y, z));
	}

	@Override
	public void set(int x, int y, int z, BlockState state) {
		// only built blocks count: clearing air over natural air proves nothing
		if (state.isAir()) {
			return;
		}
		writes++;
		if (chunk.getBlockState(cursor.set(x, y, z)).getBlock() != state.getBlock()) {
			mismatches++;
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

	double mismatchFraction() {
		return writes == 0 ? 0 : (double) mismatches / writes;
	}
}
