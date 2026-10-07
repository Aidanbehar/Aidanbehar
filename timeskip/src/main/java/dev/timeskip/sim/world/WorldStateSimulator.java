package dev.timeskip.sim.world;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.math.Rng;
import dev.timeskip.math.WeatherMath;
import dev.timeskip.mixin.RaidsAccessor;
import dev.timeskip.sim.SimContext;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import net.minecraft.core.Holder;
import net.minecraft.core.registries.Registries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.Mth;
import net.minecraft.util.valueproviders.IntProvider;
import net.minecraft.world.clock.ServerClockManager;
import net.minecraft.world.clock.WorldClock;
import net.minecraft.world.entity.raid.Raid;
import net.minecraft.world.level.gamerules.GameRules;
import net.minecraft.world.level.saveddata.WanderingTraderData;
import net.minecraft.world.level.saveddata.WeatherData;

/**
 * World-level state: clocks (day/night, moon phase), game time, weather, the wandering trader's
 * timers and raids. Everything here ends exactly where vanilla would leave it (in distribution,
 * for the random parts).
 */
public final class WorldStateSimulator {
    /** {@code ServerLevel.THUNDER_DELAY} is private; it has the same value as RAIN_DELAY. */
    private static final WeatherMath.Range THUNDER_DELAY = new WeatherMath.Range(12000, 180000);
    private static final int RAID_TIMEOUT = 48000;
    private static final int TRADER_PERIOD = 24000;
    private static final int TRADER_CHECK = 1200;

    private WorldStateSimulator() {
    }

    private static WeatherMath.Range range(IntProvider provider) {
        return new WeatherMath.Range(provider.minInclusive(), provider.maxInclusive());
    }

    /** Works out the weather at the end of the skip (and how long it rained) before anything changes. */
    public static WeatherMath.Result planWeather(MinecraftServer server, long ticks, boolean simulate, Rng rng) {
        WeatherData data = server.getWeatherData();
        WeatherMath.State start = new WeatherMath.State(data.getClearWeatherTime(),
                new WeatherMath.Timer(data.getRainTime(), data.isRaining()),
                new WeatherMath.Timer(data.getThunderTime(), data.isThundering()));
        if (!simulate || !server.getGlobalGameRules().get(GameRules.ADVANCE_WEATHER)) {
            long raining = data.isRaining() ? ticks : 0;
            return new WeatherMath.Result(start, raining);
        }
        return WeatherMath.advance(start, ticks, range(ServerLevel.RAIN_DELAY), range(ServerLevel.RAIN_DURATION),
                THUNDER_DELAY, range(ServerLevel.THUNDER_DURATION), rng);
    }

    /** How far a clock moves in {@code ticks} game ticks (respecting its rate, pause and advance_time). */
    public static long clockAdvance(MinecraftServer server, Holder<WorldClock> clock, long ticks) {
        if (!server.getGlobalGameRules().get(GameRules.ADVANCE_TIME)) {
            return 0;
        }
        ServerClockManager.ServerClockInstance instance = server.clockManager().getInstance(clock);
        if (instance.isPaused()) {
            return 0;
        }
        double advance = instance.partialTick() + (double) ticks * instance.rate();
        return (long) Math.floor(advance);
    }

    /** Time of day this level will show once the skip is applied. */
    public static long endTimeOfDay(ServerLevel level, long ticks) {
        Optional<Holder<WorldClock>> clock = level.dimensionType().defaultClock();
        if (clock.isEmpty()) {
            return 6000;
        }
        MinecraftServer server = level.getServer();
        long total = server.clockManager().getInstance(clock.get()).totalTicks();
        return total + clockAdvance(server, clock.get(), ticks);
    }

    public static void apply(MinecraftServer server, SimContext sim) {
        long ticks = sim.ticks;

        // Clocks: every registered clock, each at its own rate.
        ServerClockManager clocks = server.clockManager();
        List<Holder<WorldClock>> holders = new ArrayList<>();
        server.registryAccess().lookupOrThrow(Registries.WORLD_CLOCK).listElements().forEach(holders::add);
        for (Holder<WorldClock> holder : holders) {
            long advance = clockAdvance(server, holder, ticks);
            if (advance > 0) {
                long total = clocks.getInstance(holder).totalTicks();
                clocks.setTotalTicks(holder, saturatingAdd(total, advance));
            }
        }

        // Game time drives scheduled ticks, cooldowns and timers; pending ones become due and run normally.
        var levelData = server.getWorldData().overworldData();
        levelData.setGameTime(saturatingAdd(levelData.getGameTime(), ticks));

        // Weather.
        if (sim.config.simulateWeather && server.getGlobalGameRules().get(GameRules.ADVANCE_WEATHER)) {
            WeatherMath.State end = sim.weather.state();
            WeatherData data = server.getWeatherData();
            data.setClearWeatherTime(end.clearWeatherTime());
            data.setRainTime(end.rain().time());
            data.setRaining(end.rain().on());
            data.setThunderTime(end.thunder().time());
            data.setThundering(end.thunder().on());
        }

        applyWanderingTrader(server, sim);

        // Raids time out after 48000 ticks.
        if (ticks >= RAID_TIMEOUT) {
            for (ServerLevel level : server.getAllLevels()) {
                for (Raid raid : ((RaidsAccessor) level.getRaids()).timeskip$getRaidMap().values()) {
                    if (!raid.isStopped() && !raid.isOver()) {
                        raid.stop();
                        sim.stats.inc(Stat.RAIDS_ENDED);
                    }
                }
                level.getRaids().setDirty();
            }
        }

        server.getPlayerList().broadcastAll(clocks.createFullSyncPacket());
    }

    /**
     * Vanilla checks every 1200 ticks; each time the 24000-tick delay runs out it rolls
     * {@code nextInt(100) <= chance} and raises the chance by 25 (to at most 75), resetting it to 25
     * when a trader actually spawns (1 in 10 rolls find a spot near a player). Only the timers are
     * advanced here — traders that would have come and gone (they leave after 48000 ticks) don't.
     */
    private static void applyWanderingTrader(MinecraftServer server, SimContext sim) {
        if (!server.getGlobalGameRules().get(GameRules.SPAWN_WANDERING_TRADERS)) {
            return;
        }
        WanderingTraderData data = server.getDataStorage().computeIfAbsent(WanderingTraderData.TYPE);
        long delay = data.spawnDelay();
        long ticks = sim.ticks;
        if (ticks < delay) {
            long checks = ticks / TRADER_CHECK;
            data.setSpawnDelay((int) (delay - checks * TRADER_CHECK));
            return;
        }
        long attempts = 1 + (ticks - delay) / TRADER_PERIOD;
        Rng rng = new Rng(Rng.seed(sim.seedBase, 0x54524144L));
        int chance = data.spawnChance();
        for (long i = 0; i < Math.min(attempts, 256); i++) {
            int rolled = chance;
            chance = Mth.clamp(chance + 25, 25, 75);
            if (rng.nextInt(100) <= rolled && rng.nextInt(10) == 0) {
                chance = 25;
            }
        }
        long sinceLast = (ticks - delay) % TRADER_PERIOD;
        long newDelay = TRADER_PERIOD - (sinceLast / TRADER_CHECK) * TRADER_CHECK;
        data.setSpawnDelay((int) Math.max(TRADER_CHECK, newDelay));
        data.setSpawnChance(chance);
    }

    private static long saturatingAdd(long a, long b) {
        long r = a + b;
        return ((a ^ r) & (b ^ r)) < 0 ? Long.MAX_VALUE : r;
    }
}
