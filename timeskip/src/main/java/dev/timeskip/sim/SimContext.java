package dev.timeskip.sim;

import dev.timeskip.config.TimeSkipConfig;
import dev.timeskip.core.SkipStats;
import dev.timeskip.math.Rng;
import dev.timeskip.math.WeatherMath;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.level.Level;

/** Everything shared by one analytical skip. Immutable apart from the thread-safe stats. */
public final class SimContext {
    public final TimeSkipConfig config;
    public final SkipStats stats;
    public final long ticks;
    public final long seedBase;
    public final WeatherMath.Result weather;
    public final Map<ResourceKey<Level>, LevelInfo> levels;
    /** Entities born during the block phase are already the right age; the entity phase skips them. */
    private final Set<UUID> newborn = ConcurrentHashMap.newKeySet();

    public SimContext(TimeSkipConfig config, SkipStats stats, long ticks, long seedBase,
                      WeatherMath.Result weather, Map<ResourceKey<Level>, LevelInfo> levels) {
        this.config = config;
        this.stats = stats;
        this.ticks = ticks;
        this.seedBase = seedBase;
        this.weather = weather;
        this.levels = levels;
    }

    /** Independent, reproducible generator for one block and one purpose. */
    public Rng rng(LevelInfo info, int x, int y, int z, long salt) {
        return new Rng(Rng.seed(seedBase, info.dimensionSalt, Rng.packPos(x, y, z), salt));
    }

    public long seed(LevelInfo info, int x, int y, int z, long salt) {
        return Rng.seed(seedBase, info.dimensionSalt, Rng.packPos(x, y, z), salt);
    }

    public void markNewborn(UUID id) {
        newborn.add(id);
    }

    public boolean isNewborn(UUID id) {
        return newborn.contains(id);
    }
}
