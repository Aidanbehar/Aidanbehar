package dev.aidanbehar.nuclearstation.facility;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.LevelChunk;

/**
 * Compares the blueprint with a chunk without writing anything. Like {@link LevelSink}, writes
 * are buffered so only the final state of each cell counts (the blueprint paints in layers:
 * terrain first, then paving and buildings over it).
 */
final class VerifySink implements BlockSink {
	private final ServerLevel level;
	private final LevelChunk chunk;
	private final BlockPos.MutableBlockPos cursor = new BlockPos.MutableBlockPos();
	private final int grade;
	private final int minY;
	private final int height;
	private final BlockState[] buffer;
	private boolean evaluated;
	private int writes;
	private int mismatches;
	private int intrusions;
	final List<String> sample = new ArrayList<>();

	VerifySink(ServerLevel level, LevelChunk chunk, int grade) {
		this.level = level;
		this.chunk = chunk;
		this.grade = grade;
		this.minY = level.getMinY();
		this.height = level.getHeight();
		this.buffer = new BlockState[16 * 16 * height];
	}

	private int index(int x, int y, int z) {
		int iy = y - minY;
		if (iy < 0 || iy >= height) {
			return -1;
		}
		return ((iy * 16) + (z & 15)) * 16 + (x & 15);
	}

	@Override
	public BlockState get(int x, int y, int z) {
		int i = index(x, y, z);
		BlockState s = i >= 0 ? buffer[i] : null;
		return s != null ? s : chunk.getBlockState(cursor.set(x, y, z));
	}

	@Override
	public void set(int x, int y, int z, BlockState state) {
		int i = index(x, y, z);
		if (i >= 0) {
			buffer[i] = state;
		}
	}

	private void evaluate() {
		if (evaluated) {
			return;
		}
		evaluated = true;
		int x0 = chunk.getPos().getMinBlockX();
		int z0 = chunk.getPos().getMinBlockZ();
		for (int i = 0; i < buffer.length; i++) {
			BlockState state = buffer[i];
			if (state == null) {
				continue;
			}
			int x = x0 + (i & 15);
			int z = z0 + ((i >> 4) & 15);
			int y = (i >> 8) + minY;
			BlockState actual = chunk.getBlockState(cursor.set(x, y, z));
			if (state.isAir()) {
				// the blueprint clears this cell: natural terrain or vegetation still standing above
				// grade means the chunk was never (or only partly) painted
				if (y > grade && isNatural(actual)) {
					intrusions++;
				}
				continue;
			}
			writes++;
			// kelp and seagrass growing in placed water are not missing blocks
			boolean grownInWater = state.is(Blocks.WATER) && actual.getFluidState().is(net.minecraft.tags.FluidTags.WATER);
			if (actual.getBlock() != state.getBlock() && !grownInWater) {
				mismatches++;
				if (sample.size() < 6) {
					sample.add(x + "," + y + "," + z + " " + state.getBlock().getName().getString() + "->" + actual.getBlock().getName().getString());
				}
			}
		}
	}

	@Override
	public int topY(int x, int z) {
		return LevelSink.surface(chunk, x, z);
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
		evaluate();
		return intrusions;
	}

	/** True if the chunk is missing so much of its blueprint, or still holds terrain, that it must be painted again. */
	boolean needsRepaint() {
		evaluate();
		return mismatches >= 16 && mismatchFraction() >= 0.3 || intrusions >= 4;
	}

	double mismatchFraction() {
		evaluate();
		return writes == 0 ? 0 : (double) mismatches / writes;
	}
}
