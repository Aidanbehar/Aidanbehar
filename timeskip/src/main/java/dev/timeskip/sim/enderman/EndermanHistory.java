package dev.timeskip.sim.enderman;

import it.unimi.dsi.fastutil.longs.Long2DoubleMap;
import it.unimi.dsi.fastutil.longs.Long2DoubleOpenHashMap;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.NbtAccounter;
import net.minecraft.nbt.NbtIo;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.storage.LevelResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * How many blocks endermen have already displaced in each chunk in earlier skips, so the
 * disturbance cap is cumulative: ten 10,000-year skips end up like one 100,000-year skip instead of
 * scrambling ten times as much. Only moves that actually happened are counted (so a cancelled skip
 * counts what it did), and a cap that grows later (player moved closer, higher percentage) still
 * leaves room for more.
 *
 * <p>Kept in {@code <world>/data/timeskip_endermen.dat} (gzipped NBT, one entry per chunk and
 * dimension). Main thread only. If the file is missing or unreadable every chunk starts fresh,
 * which only means the next skip may move a few more blocks.
 */
public final class EndermanHistory {
    private static final Logger LOGGER = LoggerFactory.getLogger("timeskip");
    private static final String FILE = "timeskip_endermen.dat";

    private final Path file;
    private final Map<String, Long2DoubleOpenHashMap> byDimension = new HashMap<>();
    private boolean dirty;

    private EndermanHistory(Path file) {
        this.file = file;
    }

    public static EndermanHistory load(MinecraftServer server) {
        EndermanHistory history = new EndermanHistory(server.getWorldPath(LevelResource.DATA).resolve(FILE));
        if (!Files.isRegularFile(history.file)) {
            return history;
        }
        try {
            CompoundTag root = NbtIo.readCompressed(history.file, NbtAccounter.unlimitedHeap());
            for (String dimension : root.keySet()) {
                CompoundTag tag = root.getCompoundOrEmpty(dimension);
                long[] chunks = tag.getLongArray("chunks").orElse(new long[0]);
                long[] pickups = tag.getLongArray("displaced").orElse(new long[0]);
                Long2DoubleOpenHashMap map = history.map(dimension);
                for (int i = 0; i < Math.min(chunks.length, pickups.length); i++) {
                    map.put(chunks[i], Double.longBitsToDouble(pickups[i]));
                }
            }
        } catch (IOException | RuntimeException e) {
            LOGGER.warn("[Time Skip] Could not read {}; enderman history starts fresh", history.file, e);
        }
        return history;
    }

    /** Blocks endermen displaced in this chunk in earlier skips. */
    public double earlierDisplaced(String dimension, ChunkPos pos) {
        Long2DoubleOpenHashMap map = byDimension.get(dimension);
        return map == null ? 0.0 : map.get(pos.pack());
    }

    public void addDisplaced(String dimension, ChunkPos pos, double blocks) {
        if (blocks > 0) {
            map(dimension).addTo(pos.pack(), blocks);
            dirty = true;
        }
    }

    public void save() {
        if (!dirty) {
            return;
        }
        CompoundTag root = new CompoundTag();
        for (Map.Entry<String, Long2DoubleOpenHashMap> entry : byDimension.entrySet()) {
            Long2DoubleOpenHashMap map = entry.getValue();
            long[] chunks = new long[map.size()];
            long[] pickups = new long[map.size()];
            int i = 0;
            for (Long2DoubleMap.Entry e : map.long2DoubleEntrySet()) {
                chunks[i] = e.getLongKey();
                pickups[i] = Double.doubleToLongBits(e.getDoubleValue());
                i++;
            }
            CompoundTag tag = new CompoundTag();
            tag.putLongArray("chunks", chunks);
            tag.putLongArray("displaced", pickups);
            root.put(entry.getKey(), tag);
        }
        try {
            Files.createDirectories(file.getParent());
            Path temp = file.resolveSibling(FILE + ".tmp");
            NbtIo.writeCompressed(root, temp);
            Files.move(temp, file, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            dirty = false;
        } catch (IOException e) {
            LOGGER.warn("[Time Skip] Could not write {}", file, e);
        }
    }

    private Long2DoubleOpenHashMap map(String dimension) {
        return byDimension.computeIfAbsent(dimension, d -> new Long2DoubleOpenHashMap());
    }
}
