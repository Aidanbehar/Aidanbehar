package dev.timeskip.core;

import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.atomic.LongAdder;

/** Thread-safe tallies of what a skip changed, used for the summary message. */
public final class SkipStats {
    public enum Stat {
        CROPS_MATURED("crops matured"),
        PLANT_GROWTH("plant growth stages"),
        FRUIT_GROWN("melons/pumpkins grown"),
        TREES_GROWN("trees grown"),
        TALL_PLANTS("sugar cane/cactus/bamboo/kelp/vine blocks grown"),
        COPPER_WEATHERED("copper blocks weathered"),
        AMETHYST_GROWN("amethyst buds grown"),
        LEAVES_DECAYED("leaves decayed"),
        GRASS_SPREAD("grass/mycelium spread"),
        GRASS_DIED("grass died back"),
        FARMLAND_CHANGED("farmland dried or watered"),
        ICE_FORMED("water froze"),
        SNOW_FELL("snow layers fell"),
        MELTED("ice/snow melted"),
        CAULDRONS_FILLED("cauldron fill steps"),
        EGGS_HATCHED("eggs hatched"),
        FIRES_OUT("fires burned out"),
        ENDERMAN_MOVES("blocks moved by endermen"),
        OTHER_BLOCKS("other blocks changed"),
        ITEMS_SMELTED("items smelted"),
        POTIONS_BREWED("potions brewed"),
        CAMPFIRE_COOKED("items cooked on campfires"),
        COMPOSTERS_READY("composters finished"),
        HOPPER_ITEMS("items moved by hoppers"),
        BABIES_GROWN("babies grew up"),
        ITEMS_DESPAWNED("dropped items despawned"),
        ORBS_DESPAWNED("XP orbs despawned"),
        MOBS_DESPAWNED("mobs despawned"),
        VILLAGERS_RESTOCKED("villagers restocked"),
        CONVERSIONS("mob transformations finished"),
        RAIDS_ENDED("raids ended"),
        CHUNKS_AGED("chunks aged");

        public final String label;

        Stat(String label) {
            this.label = label;
        }
    }

    private final EnumMap<Stat, LongAdder> counters = new EnumMap<>(Stat.class);

    public SkipStats() {
        for (Stat stat : Stat.values()) {
            counters.put(stat, new LongAdder());
        }
    }

    public void add(Stat stat, long amount) {
        if (amount != 0) {
            counters.get(stat).add(amount);
        }
    }

    public void inc(Stat stat) {
        counters.get(stat).increment();
    }

    public long get(Stat stat) {
        return counters.get(stat).sum();
    }

    public Map<Stat, Long> nonZero() {
        Map<Stat, Long> result = new EnumMap<>(Stat.class);
        for (Map.Entry<Stat, LongAdder> e : counters.entrySet()) {
            long v = e.getValue().sum();
            if (v != 0) {
                result.put(e.getKey(), v);
            }
        }
        return result;
    }
}
