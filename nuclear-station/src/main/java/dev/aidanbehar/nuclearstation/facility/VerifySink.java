package dev.aidanbehar.nuclearstation.facility;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.LevelChunk;
import net.minecraft.world.level.levelgen.Heightmap;

/** Compares the blueprint's non-air blocks with a chunk without writing anything. */
final class VerifySink implements BlockSink {
	private final ServerLevel level;
	private final LevelChunk chunk;
	private final BlockPos.MutableBlockPos cursor = new BlockPos.MutableBlockPos();
	private final int grade;
	private int writes;
	private int mismatches;
	private int intrusions;

	VerifySink(ServerLevel level, LevelChunk chunk, int grade) {
		this.level = level;
		this.chunk = chunk;
		this.grade = grade;
	}

	@Override
	public BlockState get(int x, int y, int z) {
		return chunk.getBlockState(cursor.set(x, y, z));
	}

	@Override
	public void set(int x, int y, int z, BlockState state) {
		if (state.isAir()) {
			// the blueprint clears this cell: natural terrain or vegetation still standing above
			// grade means the chunk was never (or only partly) painted
			if (y > grade && isNatural(chunk.getBlockState(cursor.set(x, y, z)))) {
				intrusions++;
			}
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

	private static boolean isNatural(BlockState s) {
		return s.is(BlockTags.DIRT) || s.is(BlockTags.BASE_STONE_OVERWORLD) || s.is(BlockTags.LOGS) || s.is(BlockTags.LEAVES)
			|| s.is(BlockTags.SAND) || s.is(Blocks.GRAVEL) || s.is(Blocks.SNOW_BLOCK) || s.is(BlockTags.TERRACOTTA);
	}

	int intrusions() {
		return intrusions;
	}

	/** True if the chunk is missing so much of its blueprint that it must be painted again. */
	boolean needsRepaint() {
		return mismatchFraction() >= 0.3 || intrusions >= 24;
	}

	double mismatchFraction() {
		return writes == 0 ? 0 : (double) mismatches / writes;
	}
}
