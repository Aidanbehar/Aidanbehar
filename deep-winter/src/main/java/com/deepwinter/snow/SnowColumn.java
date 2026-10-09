package com.deepwinter.snow;

import com.deepwinter.block.ModBlocks;
import com.deepwinter.block.SettledSnowBlock;
import net.minecraft.core.BlockPos;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.LightLayer;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.DoublePlantBlock;
import net.minecraft.world.level.block.IronBarsBlock;
import net.minecraft.world.level.block.SnowLayerBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.DoubleBlockHalf;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.util.RandomSource;
import org.jspecify.annotations.Nullable;

/**
 * A vertical stack of snow on the highest sky-exposed surface of an (x, z) column.
 *
 * <p>Depth is measured in layers (1/8 block). Normally the stack is full snow (or powder snow) blocks with
 * a partial snow layer on top. On a bottom slab the first cell is {@link SettledSnowBlock} (up to 12 layers,
 * starting half a block lower), then regular snow continues above.
 */
public final class SnowColumn {
	/** Hard limit on how far down we look through existing snow (blocks). */
	private static final int MAX_SCAN_BLOCKS = 48;

	public enum Kind {
		GROUND(1.0), CANOPY(0.45), ROOF(0.6), NARROW(0.5);

		public final double rate;

		Kind(double rate) {
			this.rate = rate;
		}
	}

	public final int x;
	public final int z;
	/** First cell above the support block. */
	public final int baseY;
	public final int depth;
	public final BlockState support;
	public final boolean slabMode;
	public final Kind kind;

	private SnowColumn(int x, int z, int baseY, int depth, BlockState support, boolean slabMode, Kind kind) {
		this.x = x;
		this.z = z;
		this.baseY = baseY;
		this.depth = depth;
		this.support = support;
		this.slabMode = slabMode;
		this.kind = kind;
	}

	public static boolean isSnow(BlockState state) {
		return state.is(Blocks.SNOW) || state.is(Blocks.SNOW_BLOCK) || state.is(Blocks.POWDER_SNOW) || state.is(ModBlocks.SETTLED_SNOW);
	}

	private static int layersOf(BlockState state) {
		if (state.is(Blocks.SNOW)) {
			return state.getValue(SnowLayerBlock.LAYERS);
		}
		if (state.is(ModBlocks.SETTLED_SNOW)) {
			return state.getValue(SettledSnowBlock.LAYERS);
		}
		return 8;
	}

	/** Absolute height of the snow surface in layer units (y * 8 + layers). Used for smoothing. */
	public int surfaceHeight() {
		if (slabMode) {
			// Settled snow starts half a block (4 layers) below baseY.
			return baseY * 8 - 4 + depth;
		}
		return baseY * 8 + depth;
	}

	/** Y of the cell holding the topmost snow (or baseY when empty). */
	public int topY() {
		if (depth == 0) {
			return baseY;
		}
		if (slabMode) {
			if (depth <= SettledSnowBlock.MAX_LAYERS) {
				return baseY;
			}
			return baseY + 1 + (depth - SettledSnowBlock.MAX_LAYERS - 1) / 8;
		}
		return baseY + (depth - 1) / 8;
	}

	/**
	 * Finds the snow column at (x, z), or null when snow can't live there (blocked top, liquid, fire, lava, ...).
	 * The caller must make sure the chunk is loaded.
	 */
	public static @Nullable SnowColumn scan(Level level, int x, int z) {
		int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING, x, z);
		if (y <= level.getMinY() || y > level.getMaxY()) {
			return null;
		}
		BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos(x, y, z);
		// Thin snow layers and settled snow don't count for the heightmap, so climb through any snow at or
		// above the reported height to find the real top of the stack.
		BlockState at = level.getBlockState(pos);
		while (isSnow(at) && y < level.getMaxY()) {
			pos.setY(++y);
			at = level.getBlockState(pos);
		}
		if (!at.isAir() && !isBuryablePlant(at)) {
			return null;
		}
		int topCell = y - 1; // the stack (if any) ends just below the first non-snow cell

		// Walk down through snow to the support block.
		int depth = 0;
		int cy = topCell;
		int scanned = 0;
		BlockState state;
		while (true) {
			pos.setY(cy);
			state = level.getBlockState(pos);
			if (!isSnow(state) || scanned++ > MAX_SCAN_BLOCKS) {
				break;
			}
			depth += layersOf(state);
			cy--;
		}
		BlockState support = state;
		int baseY = cy + 1;

		if (!support.getFluidState().isEmpty()
			|| support.is(BlockTags.FIRE) || support.is(BlockTags.CAMPFIRES)
			|| support.is(Blocks.MAGMA_BLOCK) || support.is(Blocks.LAVA) || support.is(BlockTags.CANNOT_SUPPORT_SNOW_LAYER)) {
			return null;
		}
		boolean slab = SettledSnowBlock.isSupport(support);
		if (depth == 0) {
			// Nothing yet: make sure a first layer could actually rest here.
			pos.setY(baseY);
			if (!slab && !Blocks.SNOW.defaultBlockState().canSurvive(level, pos)) {
				return null;
			}
		}
		return new SnowColumn(x, z, baseY, depth, support, slab, kindOf(support, slab));
	}

	private static Kind kindOf(BlockState support, boolean slab) {
		if (support.is(BlockTags.LEAVES) || support.is(BlockTags.LOGS)) {
			return Kind.CANOPY;
		}
		if (support.is(BlockTags.FENCES) || support.is(BlockTags.WALLS) || support.getBlock() instanceof IronBarsBlock) {
			return Kind.NARROW;
		}
		if (slab || support.is(BlockTags.PLANKS) || support.is(BlockTags.STAIRS) || support.is(BlockTags.SLABS)
			|| support.is(BlockTags.WOOL) || support.is(BlockTags.TRAPDOORS)) {
			return Kind.ROOF;
		}
		return Kind.GROUND;
	}

	public static boolean isBuryablePlant(BlockState state) {
		if (state.is(BlockTags.FIRE) || !state.getFluidState().isEmpty()) {
			return false;
		}
		return state.canBeReplaced() || state.is(BlockTags.SMALL_FLOWERS) || state.is(BlockTags.SAPLINGS);
	}

	/** Whether a block is too warm to keep snow: block light near torches, fire, lava... */
	public boolean heated(Level level) {
		return level.getBrightness(LightLayer.BLOCK, new BlockPos(x, topY() + (depth == 0 ? 0 : 1), z)) >= 10;
	}

	/** Max depth allowed for this column given a climate max. Narrow supports (fences, walls) only get a cap. */
	public int capFor(int climateMax) {
		return kind == Kind.NARROW ? Math.min(3, climateMax) : climateMax;
	}

	/**
	 * Rewrites the column to the given depth. Returns the depth actually reached (growth stops when it would
	 * overwrite something that isn't air or a buryable plant).
	 *
	 * @param powderChance chance that each newly completed full block becomes powder snow
	 * @param flags        block update flags
	 */
	public int setDepth(Level level, int newDepth, double powderChance, RandomSource random, int flags) {
		newDepth = Math.max(0, newDepth);
		if (newDepth == depth) {
			return depth;
		}
		BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos(x, baseY, z);
		int oldTop = topY();
		int remaining = newDepth;
		int cell = baseY;
		int reached = 0;
		int cellIndex = 0;
		int highestCell = Math.max(oldTop, baseY + newDepth / 8 + 2);
		boolean blocked = false;

		for (; cell <= highestCell && cell <= level.getMaxY(); cell++, cellIndex++) {
			pos.setY(cell);
			BlockState current = level.getBlockState(pos);
			int capacity = (slabMode && cellIndex == 0) ? SettledSnowBlock.MAX_LAYERS : 8;
			int here = blocked ? 0 : Math.min(capacity, remaining);
			remaining -= here;

			BlockState desired;
			if (here == 0) {
				if (!isSnow(current)) {
					if (cell > oldTop) {
						break;
					}
					continue;
				}
				desired = Blocks.AIR.defaultBlockState();
			} else if (slabMode && cellIndex == 0) {
				desired = ModBlocks.SETTLED_SNOW.defaultBlockState().setValue(SettledSnowBlock.LAYERS, here);
			} else if (here == 8) {
				if (current.is(Blocks.SNOW_BLOCK) || current.is(Blocks.POWDER_SNOW)) {
					reached += here;
					continue; // keep existing full blocks (and their powder pockets) as they are
				}
				boolean powder = cellIndex > 0 && random.nextDouble() < powderChance;
				desired = powder ? Blocks.POWDER_SNOW.defaultBlockState() : Blocks.SNOW_BLOCK.defaultBlockState();
			} else {
				desired = Blocks.SNOW.defaultBlockState().setValue(SnowLayerBlock.LAYERS, here);
			}

			if (!isSnow(current) && !desired.isAir()) {
				if (!current.isAir() && !isBuryablePlant(current)) {
					blocked = true;
					remaining = 0;
					continue;
				}
				clearDoublePlant(level, pos, current);
			}
			if (current != desired) {
				if (here > 0) {
					Block.pushEntitiesUp(current, desired, level, pos);
				}
				level.setBlock(pos, desired, flags);
			}
			reached += here;
		}
		return reached;
	}

	private static void clearDoublePlant(Level level, BlockPos pos, BlockState state) {
		if (state.getBlock() instanceof DoublePlantBlock && state.hasProperty(DoublePlantBlock.HALF)) {
			BlockPos other = state.getValue(DoublePlantBlock.HALF) == DoubleBlockHalf.LOWER ? pos.above() : pos.below();
			if (level.getBlockState(other).is(state.getBlock())) {
				level.setBlock(other, Blocks.AIR.defaultBlockState(), Block.UPDATE_CLIENTS | Block.UPDATE_KNOWN_SHAPE);
			}
		}
	}
}
