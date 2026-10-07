package dev.timeskip.sim.block;

import dev.timeskip.sim.LevelInfo;
import net.minecraft.core.BlockPos;
import net.minecraft.core.SectionPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.LightLayer;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.DataLayer;
import net.minecraft.world.level.chunk.LevelChunk;
import net.minecraft.world.level.chunk.LevelChunkSection;
import net.minecraft.world.level.chunk.PalettedContainer;
import net.minecraft.world.level.lighting.LayerLightEventListener;
import net.minecraft.world.level.material.FluidState;
import org.jspecify.annotations.Nullable;

/**
 * A private copy of one chunk's blocks and light, made on the main thread and then read by a
 * worker thread. It implements vanilla's {@link BlockGetter} so pure vanilla helpers (such as
 * {@code CropBlock.getGrowthSpeed}) run on it unchanged.
 *
 * <p>Positions outside the chunk read as {@code VOID_AIR} so handlers can tell "unknown" from
 * "air" and defer such cases to the main thread.
 */
public final class ChunkSnapshot implements BlockGetter {
    private static final BlockState UNKNOWN = Blocks.VOID_AIR.defaultBlockState();
    private static final BlockState AIR = Blocks.AIR.defaultBlockState();

    public final LevelInfo info;
    public final ChunkPos pos;
    public final int minX;
    public final int minZ;
    private final int minY;
    private final int height;
    private final int minSection;
    private final PalettedContainer<BlockState>[] states;
    /** Index = section index + 1 (light storage extends one section below and above the world). */
    private final DataLayer[] sky;
    private final DataLayer[] block;

    @SuppressWarnings("unchecked")
    private ChunkSnapshot(LevelInfo info, LevelChunk chunk) {
        this.info = info;
        this.pos = chunk.getPos();
        this.minX = pos.getMinBlockX();
        this.minZ = pos.getMinBlockZ();
        this.minY = chunk.getMinY();
        this.height = chunk.getHeight();
        this.minSection = chunk.getMinSectionY();
        LevelChunkSection[] sections = chunk.getSections();
        this.states = new PalettedContainer[sections.length];
        for (int i = 0; i < sections.length; i++) {
            LevelChunkSection section = sections[i];
            if (section != null && !section.hasOnlyAir()) {
                states[i] = section.getStates().copy();
            }
        }
        this.sky = new DataLayer[sections.length + 2];
        this.block = new DataLayer[sections.length + 2];
        ServerLevel level = info.level;
        LayerLightEventListener skyListener = level.getLightEngine().getLayerListener(LightLayer.SKY);
        LayerLightEventListener blockListener = level.getLightEngine().getLayerListener(LightLayer.BLOCK);
        for (int i = -1; i <= sections.length; i++) {
            SectionPos sectionPos = SectionPos.of(pos.x(), minSection + i, pos.z());
            if (info.hasSkyLight) {
                DataLayer layer = skyListener.getDataLayerData(sectionPos);
                sky[i + 1] = layer == null ? null : layer.copy();
            }
            DataLayer layer = blockListener.getDataLayerData(sectionPos);
            block[i + 1] = layer == null ? null : layer.copy();
        }
    }

    /** Main thread only. */
    public static ChunkSnapshot capture(LevelInfo info, LevelChunk chunk) {
        return new ChunkSnapshot(info, chunk);
    }

    public int sectionCount() {
        return states.length;
    }

    public @Nullable PalettedContainer<BlockState> section(int index) {
        return states[index];
    }

    public int sectionMinY(int index) {
        return (minSection + index) << 4;
    }

    public boolean contains(int x, int z) {
        return (x - minX) >>> 4 == 0 && (z - minZ) >>> 4 == 0;
    }

    public boolean containsY(int y) {
        return y >= minY && y < minY + height;
    }

    /** Block at world coordinates; VOID_AIR outside this chunk or the build height. */
    public BlockState get(int x, int y, int z) {
        if (!contains(x, z) || !containsY(y)) {
            return UNKNOWN;
        }
        PalettedContainer<BlockState> container = states[(y - minY) >> 4];
        return container == null ? AIR : container.get(x & 15, y & 15, z & 15);
    }

    public static boolean isUnknown(BlockState state) {
        return state == UNKNOWN;
    }

    public int skyLight(int x, int y, int z) {
        if (!info.hasSkyLight) {
            return 0;
        }
        if (y >= minY + height) {
            return 15;
        }
        int index = ((y - minY) >> 4) + 1;
        if (index < 0) {
            return 0;
        }
        DataLayer layer = sky[index];
        if (layer != null) {
            return layer.get(x & 15, y & 15, z & 15);
        }
        // Same rule as vanilla's SkyLightSectionStorage: missing data means "use the bottom row of
        // the next stored section above", or full sky light if there is none.
        for (int i = index + 1; i < sky.length; i++) {
            if (sky[i] != null) {
                return sky[i].get(x & 15, 0, z & 15);
            }
        }
        return 15;
    }

    public int blockLight(int x, int y, int z) {
        int index = ((y - minY) >> 4) + 1;
        if (index < 0 || index >= block.length) {
            return 0;
        }
        DataLayer layer = block[index];
        return layer == null ? 0 : layer.get(x & 15, y & 15, z & 15);
    }

    /** Equivalent of {@code getRawBrightness(pos, 0)}. */
    public int rawBrightness(int x, int y, int z) {
        return Math.max(skyLight(x, y, z), blockLight(x, y, z));
    }

    // --- BlockGetter --------------------------------------------------------------------------

    @Override
    public BlockState getBlockState(BlockPos pos) {
        return get(pos.getX(), pos.getY(), pos.getZ());
    }

    @Override
    public FluidState getFluidState(BlockPos pos) {
        return getBlockState(pos).getFluidState();
    }

    @Override
    public @Nullable BlockEntity getBlockEntity(BlockPos pos) {
        return null;
    }

    @Override
    public int getHeight() {
        return height;
    }

    @Override
    public int getMinY() {
        return minY;
    }
}
