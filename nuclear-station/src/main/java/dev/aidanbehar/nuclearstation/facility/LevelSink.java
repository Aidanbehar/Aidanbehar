package dev.aidanbehar.nuclearstation.facility;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.LevelChunk;

/**
 * Writes facility blocks into one loaded chunk. The blueprint paints in layers (terrain is
 * cleared, then buildings, then interiors), so the same cell is often set several times;
 * every write is buffered and only the final state of each cell that differs from the
 * world is placed, once, in {@link #flush()}. Blocks are placed without neighbour updates,
 * drops or onPlace callbacks, so placed water does not flow and nothing cascades into
 * neighbouring chunks. Block entity configuration runs after the blocks exist.
 */
public final class LevelSink implements BlockSink {
	private static final int FLAGS = Block.UPDATE_CLIENTS | Block.UPDATE_KNOWN_SHAPE | Block.UPDATE_SUPPRESS_DROPS | Block.UPDATE_SKIP_ON_PLACE;
	private final ServerLevel level;
	private final LevelChunk chunk;
	private final int minY;
	private final int height;
	private final BlockState[] buffer;
	private final List<Runnable> configure = new ArrayList<>();
	private final BlockPos.MutableBlockPos cursor = new BlockPos.MutableBlockPos();
	private int writes;

	public LevelSink(ServerLevel level, LevelChunk chunk) {
		this.level = level;
		this.chunk = chunk;
		this.minY = level.getMinY();
		this.height = level.getHeight();
		this.buffer = new BlockState[16 * 16 * height];
		// Promote block entities still stored as pending NBT (beehives, structure chests)
		// while their block states are intact. Otherwise replacing the block leaves the
		// pending entry behind and the next write at that position fails to create it.
		for (BlockPos pos : chunk.getBlockEntitiesPos()) {
			chunk.getBlockEntity(pos);
		}
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

	@Override
	public void configure(int x, int y, int z, Consumer<BlockEntity> action) {
		BlockPos pos = new BlockPos(x, y, z);
		configure.add(() -> {
			BlockEntity be = chunk.getBlockEntity(pos);
			if (be != null) {
				action.accept(be);
				be.setChanged();
			}
		});
	}

	/** Places every buffered cell whose final state differs from the world, then configures block entities. */
	public void flush() {
		int x0 = chunk.getPos().getMinBlockX();
		int z0 = chunk.getPos().getMinBlockZ();
		for (int i = 0; i < buffer.length; i++) {
			BlockState s = buffer[i];
			if (s == null) {
				continue;
			}
			int x = x0 + (i & 15);
			int z = z0 + ((i >> 4) & 15);
			int y = (i >> 8) + minY;
			cursor.set(x, y, z);
			if (chunk.getBlockState(cursor) != s) {
				level.setBlock(cursor, s, FLAGS);
				writes++;
			}
		}
		configure.forEach(Runnable::run);
	}

	@Override
	public int topY(int x, int z) {
		return surface(chunk, x, z);
	}

	/**
	 * One above the highest non-air block of a column, found from the blocks themselves.
	 * The stored heightmap is not trusted: where it is stale (chunks upgraded or loaded from
	 * older saves) terrain above it was never cleared and was left floating over the station.
	 */
	static int surface(LevelChunk chunk, int x, int z) {
		int lx = x & 15;
		int lz = z & 15;
		var sections = chunk.getSections();
		for (int si = sections.length - 1; si >= 0; si--) {
			var section = sections[si];
			if (section.hasOnlyAir()) {
				continue;
			}
			for (int ly = 15; ly >= 0; ly--) {
				if (!section.getBlockState(lx, ly, lz).isAir()) {
					return chunk.getSectionYFromSectionIndex(si) * 16 + ly + 1;
				}
			}
		}
		return chunk.getMinY();
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
