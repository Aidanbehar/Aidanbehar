package dev.aidanbehar.nuclearstation.geology;

import com.mojang.serialization.MapCodec;
import dev.aidanbehar.nuclearstation.config.ModConfig;
import java.util.Optional;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.level.levelgen.structure.Structure;
import net.minecraft.world.level.levelgen.structure.StructureType;

/**
 * An abandoned uranium mine: headframe, hoist house and ore bins at the surface, a shaft
 * and two levels of timbered drifts following uraninite and pitchblende veins below.
 * Placed through a normal structure set, so it is bounded and chunk-safe.
 */
public class UraniumMineStructure extends Structure {
	public static final MapCodec<UraniumMineStructure> CODEC = simpleCodec(UraniumMineStructure::new);

	public UraniumMineStructure(Structure.StructureSettings settings) {
		super(settings);
	}

	@Override
	protected Optional<Structure.GenerationStub> findGenerationPoint(Structure.GenerationContext context) {
		if (!ModConfig.get().geology.generateMines) {
			return Optional.empty();
		}
		int x = context.chunkPos().getMiddleBlockX();
		int z = context.chunkPos().getMiddleBlockZ();
		int y = context.chunkGenerator().getFirstOccupiedHeight(x, z, Heightmap.Types.WORLD_SURFACE_WG, context.heightAccessor(), context.randomState());
		if (y < context.chunkGenerator().getSeaLevel() + 2 || y - 50 < context.heightAccessor().getMinY() + 4) {
			return Optional.empty();
		}
		long seed = context.seed() ^ context.chunkPos().pack();
		return onTopOfChunkCenter(context, Heightmap.Types.WORLD_SURFACE_WG,
			builder -> builder.addPiece(new MinePiece(new BlockPos(x - MinePiece.HALF, y, z - MinePiece.HALF), seed)));
	}

	@Override
	public StructureType<?> type() {
		return Geology.URANIUM_MINE;
	}
}
