package dev.timeskip.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ConfigIOTest {
    @Test
    void createsCommentedFileWithDefaults(@TempDir Path dir) throws Exception {
        Path file = dir.resolve("config/timeskip.properties");
        ConfigIO.LoadResult result = ConfigIO.load(file);
        assertTrue(Files.exists(file));
        String text = Files.readString(file);
        assertTrue(text.contains("# How many Minecraft days make one 'year'"));
        assertTrue(text.contains("days_per_year = 365"));
        assertEquals(365, result.config().daysPerYear);
        assertTrue(result.problems().isEmpty());
    }

    @Test
    void keepsUserValuesAndFixesBadOnes(@TempDir Path dir) throws Exception {
        Path file = dir.resolve("timeskip.properties");
        Files.writeString(file, "days_per_year = 100\ntick_budget_ms = banana\nmob_equilibrium = KEEP\nfreeze_world_during_skip = no\n");
        ConfigIO.LoadResult result = ConfigIO.load(file);
        TimeSkipConfig config = result.config();
        assertEquals(100, config.daysPerYear);
        assertEquals(30, config.tickBudgetMs);
        assertEquals(TimeSkipConfig.MobEquilibrium.KEEP, config.mobEquilibrium);
        assertFalse(config.freezeWorldDuringSkip);
        assertEquals(1, result.problems().size());
        String rewritten = Files.readString(file);
        assertTrue(rewritten.contains("days_per_year = 100"));
        assertTrue(rewritten.contains("save_world_when_done = true"));
    }

    @Test
    void clampsDangerousValues(@TempDir Path dir) throws Exception {
        Path file = dir.resolve("timeskip.properties");
        Files.writeString(file, "tick_budget_ms = 500\ndays_per_year = 0\n");
        TimeSkipConfig config = ConfigIO.load(file).config();
        assertEquals(45, config.tickBudgetMs);
        assertEquals(1, config.daysPerYear);
    }

    @Test
    void derivedValues() {
        TimeSkipConfig config = new TimeSkipConfig();
        assertEquals(8_760_000L, config.ticksPerYear());
        assertEquals(876_000_000_000_000L, config.maxSkipTicks());
        assertEquals(8_760_000_000L, config.confirmThresholdTicks());
    }
}
