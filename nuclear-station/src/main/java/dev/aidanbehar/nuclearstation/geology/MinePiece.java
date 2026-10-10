package dev.aidanbehar.nuclearstation.geology;

import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.facility.BlockSink;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.facility.layout.Kit;
import dev.aidanbehar.nuclearstation.facility.layout.Pal;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import java.util.function.Consumer;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.util.RandomSource;
import net.minecraft.world.item.DyeColor;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.StructureManager;
import net.minecraft.world.level.WorldGenLevel;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.LanternBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.ChunkGenerator;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.level.levelgen.structure.BoundingBox;
import net.minecraft.world.level.levelgen.structure.StructurePiece;
import net.minecraft.world.level.levelgen.structure.pieces.StructurePieceSerializationContext;

/**
 * The single piece of an abandoned uranium mine. It is drawn with the same clipped
 * {@link Painter} as the power station, so each chunk only receives its own blocks.
 */
public class MinePiece extends StructurePiece {
	public static final int HALF = 40;
	static final int SIZE = HALF * 2;
	static final int LEVEL1 = -24;
	static final int LEVEL2 = -44;
	private final long seed;
	private final int surface;

	public MinePiece(BlockPos corner, long seed) {
		super(Geology.MINE_PIECE, 0, new BoundingBox(corner.getX(), corner.getY() + LEVEL2 - 2, corner.getZ(),
			corner.getX() + SIZE, corner.getY() + 28, corner.getZ() + SIZE));
		this.seed = seed;
		this.surface = corner.getY();
	}

	public MinePiece(CompoundTag tag) {
		super(Geology.MINE_PIECE, tag);
		this.seed = tag.getLongOr("seed", 0);
		this.surface = tag.getIntOr("surface", boundingBox.minY() - LEVEL2 + 2);
	}

	@Override
	protected void addAdditionalSaveData(StructurePieceSerializationContext context, CompoundTag tag) {
		tag.putLong("seed", seed);
		tag.putInt("surface", surface);
	}

	/** Writes into the world-generation region. */
	static final class GenSink implements BlockSink {
		private final WorldGenLevel level;
		private final BlockPos.MutableBlockPos cursor = new BlockPos.MutableBlockPos();

		GenSink(WorldGenLevel level) {
			this.level = level;
		}

		@Override
		public BlockState get(int x, int y, int z) {
			return level.getBlockState(cursor.set(x, y, z));
		}

		@Override
		public void set(int x, int y, int z, BlockState state) {
			level.setBlock(cursor.set(x, y, z), state, 2);
		}

		@Override
		public void configure(int x, int y, int z, Consumer<BlockEntity> action) {
			BlockEntity be = level.getBlockEntity(new BlockPos(x, y, z));
			if (be != null) {
				action.accept(be);
			}
		}

		@Override
		public int topY(int x, int z) {
			return level.getHeight(Heightmap.Types.WORLD_SURFACE_WG, x, z) - 1;
		}

		@Override
		public int minY() {
			return level.getMinY();
		}

		@Override
		public int maxY() {
			return level.getMaxY();
		}
	}

	@Override
	public void postProcess(WorldGenLevel level, StructureManager structureManager, ChunkGenerator generator, RandomSource random,
			BoundingBox chunkBB, ChunkPos chunkPos, BlockPos referencePos) {
		int ox = boundingBox.minX();
		int oz = boundingBox.minZ();
		Painter p = new Painter(new GenSink(level), ox, oz, chunkBB.minX() - ox, chunkBB.minZ() - oz, chunkBB.maxX() - ox, chunkBB.maxZ() - oz,
			surface, generator.getSeaLevel(), null, false);
		paint(p, new Kit(p));
	}

	private double h(int x, int y, int z) {
		return Kit.hash(x, y, z, seed);
	}

	void paint(Painter p, Kit k) {
		int s = surface;
		BlockState planks = Blocks.SPRUCE_PLANKS.defaultBlockState();
		BlockState log = Blocks.STRIPPED_SPRUCE_LOG.defaultBlockState();
		BlockState fence = Blocks.SPRUCE_FENCE.defaultBlockState();
		BlockState lantern = Blocks.LANTERN.defaultBlockState().setValue(LanternBlock.HANGING, true);
		int c = HALF;
		// ---------------------------------------------------------------- surface yard
		p.fill(c - 22, s, c - 14, c + 24, s, c + 14, Pal.GRAVEL);
		p.fill(c - 22, s + 1, c - 14, c + 24, s + 24, c + 14, Pal.AIR);
		p.fill(c - 22, s - 6, c - 14, c + 24, s - 1, c + 14, Blocks.COBBLESTONE.defaultBlockState());
		// shaft collar and the shaft itself
		p.fill(c - 3, s - 1, c - 3, c + 3, s, c + 3, Blocks.STONE_BRICKS.defaultBlockState());
		p.fill(c - 2, s + LEVEL2 + 1, c - 2, c + 2, s, c + 2, Pal.CAVE_AIR);
		for (int y = s + LEVEL2; y <= s; y++) {
			if ((y - s) % 4 == 0) {
				p.walls(c - 3, c - 3, c + 3, c + 3, y, y, planks);
			}
		}
		k.ladder(c, s + LEVEL2 + 1, s, c + 2, Direction.NORTH);
		p.fill(c - 2, s + LEVEL2 + 1, c - 2, c - 1, s + LEVEL2 + 3, c - 1, Kit.bars(true));
		// headframe
		for (int[] leg : new int[][] {{-4, -4}, {4, -4}, {-4, 4}, {4, 4}}) {
			p.fill(c + leg[0], s + 1, c + leg[1], c + leg[0], s + 20, c + leg[1], log);
		}
		for (int y = s + 5; y <= s + 20; y += 5) {
			p.walls(c - 4, c - 4, c + 4, c + 4, y, y, Pal.GIRDER);
		}
		p.fill(c - 4, s + 21, c - 4, c + 4, s + 21, c + 4, planks);
		p.cylinderX(c - 1, c + 1, s + 24, c + 0.5, 2.5, Pal.IRON_BARS);
		for (int i = 0; i < 12; i++) {
			p.set(c + 5 + i, s + 20 - i * 1, c, log);
		}
		// hoist house
		p.room(c + 12, s, c - 6, c + 24, s + 8, c + 6, Blocks.BRICKS.defaultBlockState(), Pal.AIR);
		p.cylinderZ(c - 3, c + 3, s + 3, c + 18.5, 2.5, Pal.GIRDER);
		k.chest(c + 22, s + 1, c - 4, Direction.WEST, Kit.LOOT_MINE);
		p.fill(c + 12, s + 1, c, c + 12, s + 2, c, Pal.AIR);
		k.label(c + 11, s + 3, c, Direction.WEST, DyeColor.BLACK, "HOIST HOUSE", "SHAFT No. 3");
		p.set(c + 13, s + 6, c, lantern);
		// ore bin and waste rock
		p.walls(c - 20, c - 12, c - 12, c - 4, s + 1, s + 4, planks);
		for (int x = c - 19; x <= c - 13; x++) {
			for (int z = c - 11; z <= c - 5; z++) {
				p.set(x, s + 1, z, h(x, 1, z) < 0.35 ? ModBlocks.URANINITE_ORE.defaultBlockState() : Pal.GRAVEL);
				if (h(x, 2, z) < 0.4) {
					p.set(x, s + 2, z, Pal.GRAVEL);
				}
			}
		}
		p.cylinder(c - 14, c + 22, 6, s + 1, s + 1, Blocks.COBBLESTONE.defaultBlockState());
		p.cylinder(c - 14, c + 22, 4, s + 2, s + 2, Pal.GRAVEL);
		p.cylinder(c - 14, c + 22, 2, s + 3, s + 3, Pal.GRAVEL);
		// fence, warnings and the company sign
		p.walls(c - 22, c - 14, c + 24, c + 14, s + 1, s + 1, fence);
		p.fill(c - 1, s + 1, c - 14, c + 1, s + 1, c - 14, Pal.AIR);
		k.sign(c - 3, s + 2, c - 15, SignKind.RADIATION, Direction.NORTH);
		k.label(c + 3, s + 2, c - 15, Direction.NORTH, DyeColor.BLACK, "MERIDIAN URANIUM", "CO. SHAFT No.3", "CLOSED - RADON", "DO NOT ENTER");
		k.sign(c, s + 2, c - 4, SignKind.NO_ENTRY, Direction.NORTH);
		// ---------------------------------------------------------------- underground levels
		level(p, k, s + LEVEL1, 1);
		level(p, k, s + LEVEL2, 2);
		p.set(c - 2, s - 2, c - 2, lantern);
	}

	private void level(Painter p, Kit k, int floor, int n) {
		int c = HALF;
		BlockState planks = Blocks.SPRUCE_PLANKS.defaultBlockState();
		BlockState log = Blocks.STRIPPED_SPRUCE_LOG.defaultBlockState();
		BlockState lantern = Blocks.LANTERN.defaultBlockState().setValue(LanternBlock.HANGING, true);
		BlockState rich = n == 1 ? ModBlocks.URANINITE_ORE.defaultBlockState() : ModBlocks.PITCHBLENDE_ORE.defaultBlockState();
		BlockState secondary = n == 1 ? ModBlocks.AUTUNITE_ORE.defaultBlockState() : ModBlocks.DEEPSLATE_URANINITE_ORE.defaultBlockState();
		// shaft station
		p.fill(c - 5, floor + 1, c - 5, c + 5, floor + 4, c + 5, Pal.CAVE_AIR);
		p.floor(c - 5, c - 5, c + 5, c + 5, floor, planks);
		p.set(c + 4, floor + 4, c + 4, lantern);
		p.set(c - 4, floor + 4, c - 4, lantern);
		k.label(c - 3, floor + 2, c - 6, Direction.SOUTH, DyeColor.BLACK, "LEVEL " + n, "-" + (n == 1 ? 24 : 44) + " m", "RADON: VENTILATE");
		if (n == 1) {
			k.chest(c + 5, floor + 1, c - 5, Direction.WEST, Kit.LOOT_MINE);
		}
		// four drifts following the vein
		Direction[] dirs = {Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST};
		for (Direction d : dirs) {
			int len = 30 + (int) (h(d.ordinal(), n, 7) * 6);
			for (int i = 6; i <= len; i++) {
				int x = c + d.getStepX() * i;
				int z = c + d.getStepZ() * i;
				Direction side = d.getClockWise();
				boolean collapsed = h(i / 6, n, d.ordinal()) < 0.12 && i > 14;
				for (int w = -1; w <= 1; w++) {
					int px = x + side.getStepX() * w;
					int pz = z + side.getStepZ() * w;
					p.fill(px, floor + 1, pz, px, floor + 3, pz, collapsed && w != 0 ? Pal.GRAVEL : Pal.CAVE_AIR);
					p.set(px, floor, pz, Pal.GRAVEL);
				}
				if (collapsed) {
					p.set(x, floor + 1, z, Pal.GRAVEL);
				}
				// walls carry the ore that the drift was driven along
				for (int w : new int[] {-2, 2}) {
					int px = x + side.getStepX() * w;
					int pz = z + side.getStepZ() * w;
					for (int y = floor + 1; y <= floor + 3; y++) {
						double r = h(px, y, pz);
						if (r < 0.18) {
							p.set(px, y, pz, rich);
						} else if (r < 0.26) {
							p.set(px, y, pz, secondary);
						}
					}
				}
				if (i % 4 == 0 && !collapsed) {
					for (int w : new int[] {-1, 1}) {
						p.fill(x + side.getStepX() * w, floor + 1, z + side.getStepZ() * w, x + side.getStepX() * w, floor + 2, z + side.getStepZ() * w, log);
					}
					p.fill(x - side.getStepX(), floor + 3, z - side.getStepZ(), x + side.getStepX(), floor + 3, z + side.getStepZ(), planks);
				}
				if (i % 8 == 2 && !collapsed) {
					p.set(x, floor + 3, z, lantern);
				}
				if (i % 3 == 0 && !collapsed) {
					k.rail(x, z, x, z, floor + 1);
					p.set(x, floor, z, Pal.GRAVEL);
				}
			}
			// stope at the end of the drift: the richest exposure, high radiation
			int ex = c + d.getStepX() * (len + 4);
			int ez = c + d.getStepZ() * (len + 4);
			p.fill(ex - 3, floor + 1, ez - 3, ex + 3, floor + 5, ez + 3, Pal.CAVE_AIR);
			for (int x = ex - 4; x <= ex + 4; x++) {
				for (int z = ez - 4; z <= ez + 4; z++) {
					for (int y = floor; y <= floor + 6; y++) {
						boolean shell = Math.abs(x - ex) == 4 || Math.abs(z - ez) == 4 || y == floor || y == floor + 6;
						if (shell && h(x, y, z) < 0.45) {
							p.set(x, y, z, rich);
						}
					}
				}
			}
			int sx = c + d.getStepX() * (len - 1);
			int sz = c + d.getStepZ() * (len - 1);
			p.set(sx, floor + 4, sz, Pal.AIR);
			k.sign(sx + d.getClockWise().getStepX(), floor + 3, sz + d.getClockWise().getStepZ(), SignKind.HIGH_RADIATION, d.getOpposite());
		}
	}
}
