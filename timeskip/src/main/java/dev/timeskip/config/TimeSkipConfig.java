package dev.timeskip.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Properties;
import java.util.function.Function;

/**
 * Every setting the mod has, with its default and the comment written into the config file.
 * Nobody needs to touch these; they exist for server owners who want to tune things.
 */
public final class TimeSkipConfig {
    public enum MobEquilibrium { DESPAWN, KEEP }

    // --- Units & limits -------------------------------------------------------------------
    public int daysPerYear = 365;
    public double maxSkipYears = 100_000_000;
    public long minSkipTicks = 24_000;
    public double confirmThresholdYears = 1000;
    public int confirmTimeoutSeconds = 60;

    // --- Tiers & performance ----------------------------------------------------------------
    public long realTickMaxTicks = 72_000;
    public int realTickMaxSeconds = 90;
    public int tickBudgetMs = 30;
    public int workerThreads = 0;
    public int extraChunkRadius = 0;
    public int maxChunksPerTickLoad = 4;
    public int chunkResendsPerTick = 16;

    // --- Safety & presentation ----------------------------------------------------------------
    public boolean freezeWorldDuringSkip = true;
    public boolean protectPlayersDuringSkip = true;
    public boolean saveWorldWhenDone = true;
    public boolean showBossBar = true;
    public boolean announceToEveryone = true;

    // --- Simulation switches ------------------------------------------------------------------
    public boolean simulateBlocks = true;
    public boolean simulatePrecipitation = true;
    public boolean simulateBlockEntities = true;
    public boolean simulateEntities = true;
    public boolean simulateWeather = true;
    public boolean growTrees = true;
    public MobEquilibrium mobEquilibrium = MobEquilibrium.DESPAWN;
    public boolean addInhabitedTime = true;

    // --- Fine tuning --------------------------------------------------------------------------
    public int fallbackMaxRandomTicks = 16;
    public int vanillaReplayMaxRandomTicks = 64;
    public int treeGrowthAttempts = 4;
    public int hopperPasses = 3;
    public long seedSalt = 0;

    /** Ticks in one configured year. */
    public long ticksPerYear() {
        return 24_000L * daysPerYear;
    }

    public long maxSkipTicks() {
        double ticks = maxSkipYears * ticksPerYear();
        return ticks >= Long.MAX_VALUE / 4.0 ? Long.MAX_VALUE / 4 : (long) ticks;
    }

    public long confirmThresholdTicks() {
        double ticks = confirmThresholdYears * ticksPerYear();
        return ticks >= Long.MAX_VALUE / 4.0 ? Long.MAX_VALUE / 4 : (long) ticks;
    }

    public int effectiveWorkerThreads() {
        if (workerThreads > 0) {
            return workerThreads;
        }
        int cores = Runtime.getRuntime().availableProcessors();
        return Math.max(1, Math.min(4, cores / 2));
    }

    /** Clamps values a person might mistype into ranges the mod can work with. */
    void sanitize() {
        daysPerYear = clamp(daysPerYear, 1, 100_000);
        maxSkipYears = Math.max(1.0 / daysPerYear, Math.min(maxSkipYears, 1.0e12));
        minSkipTicks = Math.max(1, minSkipTicks);
        confirmThresholdYears = Math.max(0, confirmThresholdYears);
        confirmTimeoutSeconds = clamp(confirmTimeoutSeconds, 5, 3600);
        realTickMaxTicks = Math.max(0, realTickMaxTicks);
        realTickMaxSeconds = clamp(realTickMaxSeconds, 1, 86_400);
        tickBudgetMs = clamp(tickBudgetMs, 1, 45);
        workerThreads = clamp(workerThreads, 0, 64);
        extraChunkRadius = clamp(extraChunkRadius, 0, 32);
        maxChunksPerTickLoad = clamp(maxChunksPerTickLoad, 1, 64);
        chunkResendsPerTick = clamp(chunkResendsPerTick, 1, 1024);
        fallbackMaxRandomTicks = clamp(fallbackMaxRandomTicks, 0, 4096);
        vanillaReplayMaxRandomTicks = clamp(vanillaReplayMaxRandomTicks, 0, 4096);
        treeGrowthAttempts = clamp(treeGrowthAttempts, 1, 64);
        hopperPasses = clamp(hopperPasses, 0, 16);
    }

    private static int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    // ------------------------------------------------------------------------------------------
    // File layout: one entry per setting, grouped under headings, each with a comment.
    // ------------------------------------------------------------------------------------------

    record Entry(String key, String comment, Function<TimeSkipConfig, String> getter, Setter setter) {
    }

    @FunctionalInterface
    interface Setter {
        void set(TimeSkipConfig config, String value);
    }

    record Section(String title, List<Entry> entries) {
    }

    static List<Section> layout() {
        List<Section> sections = new ArrayList<>();

        sections.add(new Section("Units and limits", List.of(
                entry("days_per_year", "How many Minecraft days make one 'year' in /timeskip. 1 day = 24000 ticks.",
                        c -> Integer.toString(c.daysPerYear), (c, v) -> c.daysPerYear = Integer.parseInt(v)),
                entry("max_skip_years", "The longest skip allowed, in years.",
                        c -> fmt(c.maxSkipYears), (c, v) -> c.maxSkipYears = Double.parseDouble(v)),
                entry("min_skip_ticks", "The shortest skip allowed, in ticks (24000 = one day).",
                        c -> Long.toString(c.minSkipTicks), (c, v) -> c.minSkipTicks = Long.parseLong(v)),
                entry("confirm_threshold_years", "Skips at least this long ask for /timeskip confirm first (and suggest a backup).",
                        c -> fmt(c.confirmThresholdYears), (c, v) -> c.confirmThresholdYears = Double.parseDouble(v)),
                entry("confirm_timeout_seconds", "How long a pending skip waits for /timeskip confirm.",
                        c -> Integer.toString(c.confirmTimeoutSeconds), (c, v) -> c.confirmTimeoutSeconds = Integer.parseInt(v))
        )));

        sections.add(new Section("How the skip runs", List.of(
                entry("real_tick_max_ticks", "Skips up to this many ticks really run the world forward (fast), so redstone,\n"
                                + "farms and mobs behave exactly like normal play. Longer skips are calculated instead.\n"
                                + "Default 72000 = 3 days. Set to 0 to always calculate.",
                        c -> Long.toString(c.realTickMaxTicks), (c, v) -> c.realTickMaxTicks = Long.parseLong(v)),
                entry("real_tick_max_seconds", "...but only if this server can do it within this many seconds (estimated from how\n"
                                + "long its ticks take right now). Busy worlds calculate instead, so a skip never drags on.",
                        c -> Integer.toString(c.realTickMaxSeconds), (c, v) -> c.realTickMaxSeconds = Integer.parseInt(v)),
                entry("tick_budget_ms", "Milliseconds of each server tick (50 ms) the skip may use. Lower = smoother, slower skip.",
                        c -> Integer.toString(c.tickBudgetMs), (c, v) -> c.tickBudgetMs = Integer.parseInt(v)),
                entry("worker_threads", "Background threads used for the maths. 0 = automatic (half your CPU cores, max 4).",
                        c -> Integer.toString(c.workerThreads), (c, v) -> c.workerThreads = Integer.parseInt(v)),
                entry("extra_chunk_radius", "Also age chunks this many chunks around each player that are not currently loaded\n"
                                + "(they are loaded in small batches). 0 = only age chunks that are already loaded.",
                        c -> Integer.toString(c.extraChunkRadius), (c, v) -> c.extraChunkRadius = Integer.parseInt(v)),
                entry("max_chunks_per_tick_load", "How many extra chunks may be requested per tick when extra_chunk_radius > 0.",
                        c -> Integer.toString(c.maxChunksPerTickLoad), (c, v) -> c.maxChunksPerTickLoad = Integer.parseInt(v)),
                entry("chunk_resends_per_tick", "How many changed chunks are re-sent to players per tick at the end of a skip.",
                        c -> Integer.toString(c.chunkResendsPerTick), (c, v) -> c.chunkResendsPerTick = Integer.parseInt(v))
        )));

        sections.add(new Section("Safety and display", List.of(
                entry("freeze_world_during_skip", "Freeze mobs, redstone and time while a calculated skip runs (players can still move).",
                        c -> Boolean.toString(c.freezeWorldDuringSkip), (c, v) -> c.freezeWorldDuringSkip = parseBool(v)),
                entry("protect_players_during_skip", "Players take no damage while any skip is running.",
                        c -> Boolean.toString(c.protectPlayersDuringSkip), (c, v) -> c.protectPlayersDuringSkip = parseBool(v)),
                entry("save_world_when_done", "Save the world automatically when a skip finishes.",
                        c -> Boolean.toString(c.saveWorldWhenDone), (c, v) -> c.saveWorldWhenDone = parseBool(v)),
                entry("show_boss_bar", "Show a progress bar at the top of the screen during a skip.",
                        c -> Boolean.toString(c.showBossBar), (c, v) -> c.showBossBar = parseBool(v)),
                entry("announce_to_everyone", "Tell every player when a skip starts and finishes (otherwise only the person who ran it).",
                        c -> Boolean.toString(c.announceToEveryone), (c, v) -> c.announceToEveryone = parseBool(v))
        )));

        sections.add(new Section("What gets simulated", List.of(
                entry("simulate_blocks", "Crops, trees, plants, copper, amethyst, grass, leaves, ice, eggs and other blocks.",
                        c -> Boolean.toString(c.simulateBlocks), (c, v) -> c.simulateBlocks = parseBool(v)),
                entry("simulate_precipitation", "Snow piling up, water freezing and cauldrons filling while it rained.",
                        c -> Boolean.toString(c.simulatePrecipitation), (c, v) -> c.simulatePrecipitation = parseBool(v)),
                entry("simulate_block_entities", "Furnaces, smokers, blast furnaces, brewing stands, campfires, composters, hoppers.",
                        c -> Boolean.toString(c.simulateBlockEntities), (c, v) -> c.simulateBlockEntities = parseBool(v)),
                entry("simulate_entities", "Baby animals grow up, dropped items despawn, villagers restock, and so on.",
                        c -> Boolean.toString(c.simulateEntities), (c, v) -> c.simulateEntities = parseBool(v)),
                entry("simulate_weather", "Move rain and thunder to where they would be after the skip.",
                        c -> Boolean.toString(c.simulateWeather), (c, v) -> c.simulateWeather = parseBool(v)),
                entry("grow_trees", "Let saplings grow into full trees.",
                        c -> Boolean.toString(c.growTrees), (c, v) -> c.growTrees = parseBool(v)),
                entry("mob_equilibrium", "despawn = mobs that could despawn are removed and the normal spawner refills the world\n"
                                + "afterwards (named, tamed, leashed and persistent mobs always stay). keep = leave all mobs.",
                        c -> c.mobEquilibrium.name().toLowerCase(Locale.ROOT),
                        (c, v) -> c.mobEquilibrium = MobEquilibrium.valueOf(v.trim().toUpperCase(Locale.ROOT))),
                entry("add_inhabited_time", "Chunks near players count the skipped time as 'lived in' (raises local difficulty like real play).",
                        c -> Boolean.toString(c.addInhabitedTime), (c, v) -> c.addInhabitedTime = parseBool(v))
        )));

        sections.add(new Section("Fine tuning", List.of(
                entry("fallback_max_random_ticks", "Blocks the mod has no exact model for (e.g. from other mods) get their own\n"
                                + "random tick called up to this many times per skip.",
                        c -> Integer.toString(c.fallbackMaxRandomTicks), (c, v) -> c.fallbackMaxRandomTicks = Integer.parseInt(v)),
                entry("vanilla_replay_max_random_ticks", "Cap for vanilla blocks whose growth is replayed tick by tick\n"
                                + "(bamboo, chorus, vines, mushrooms, dripstone).",
                        c -> Integer.toString(c.vanillaReplayMaxRandomTicks), (c, v) -> c.vanillaReplayMaxRandomTicks = Integer.parseInt(v)),
                entry("tree_growth_attempts", "How many times a sapling may try to grow a tree in a long skip if the first try lacks room.",
                        c -> Integer.toString(c.treeGrowthAttempts), (c, v) -> c.treeGrowthAttempts = Integer.parseInt(v)),
                entry("hopper_passes", "Rounds of hopper -> furnace -> hopper item movement to settle simple item chains.",
                        c -> Integer.toString(c.hopperPasses), (c, v) -> c.hopperPasses = Integer.parseInt(v)),
                entry("seed_salt", "Change to get a different (but still repeatable) random outcome for the same world and skip.",
                        c -> Long.toString(c.seedSalt), (c, v) -> c.seedSalt = Long.parseLong(v))
        )));
        return sections;
    }

    private static Entry entry(String key, String comment, Function<TimeSkipConfig, String> getter, Setter setter) {
        return new Entry(key, comment, getter, setter);
    }

    private static String fmt(double v) {
        return v == Math.rint(v) && Math.abs(v) < 1e15 ? Long.toString((long) v) : Double.toString(v);
    }

    private static boolean parseBool(String v) {
        String s = v.trim().toLowerCase(Locale.ROOT);
        if (s.equals("true") || s.equals("yes") || s.equals("on") || s.equals("1")) {
            return true;
        }
        if (s.equals("false") || s.equals("no") || s.equals("off") || s.equals("0")) {
            return false;
        }
        throw new IllegalArgumentException("expected true or false");
    }

    /** Applies values from a parsed file; returns human readable problems (bad values keep defaults). */
    List<String> apply(Properties properties) {
        List<String> problems = new ArrayList<>();
        for (Section section : layout()) {
            for (Entry entry : section.entries()) {
                String raw = properties.getProperty(entry.key());
                if (raw == null) {
                    continue;
                }
                try {
                    entry.setter().set(this, raw.trim());
                } catch (RuntimeException e) {
                    problems.add(entry.key() + " = '" + raw + "' is not valid (" + e.getMessage() + "), using default");
                }
            }
        }
        sanitize();
        return problems;
    }
}
