package dev.timeskip.core;

import static org.junit.jupiter.api.Assertions.assertEquals;

import dev.timeskip.command.SkipUnit;
import dev.timeskip.config.TimeSkipConfig;
import org.junit.jupiter.api.Test;

class SkipFormatTest {
    private final TimeSkipConfig config = new TimeSkipConfig();

    @Test
    void describesDurations() {
        assertEquals("1 day", SkipFormat.describe(24_000, config));
        assertEquals("3 days", SkipFormat.describe(72_000, config));
        assertEquals("1.5 days", SkipFormat.describe(36_000, config));
        assertEquals("10 years", SkipFormat.describe(87_600_000, config));
        assertEquals("1,000 years", SkipFormat.describe(8_760_000_000L, config));
        assertEquals("100 million years", SkipFormat.describe(876_000_000_000_000L, config));
        assertEquals("500 ticks", SkipFormat.describe(500, config));
    }

    @Test
    void unitsConvertToTicks() {
        assertEquals(1, SkipUnit.TICKS.ticks(config));
        assertEquals(24_000, SkipUnit.DAYS.ticks(config));
        assertEquals(8_760_000, SkipUnit.YEARS.ticks(config));
        assertEquals(8.76e9, SkipUnit.THOUSAND_YEARS.ticks(config));
        assertEquals(8.76e12, SkipUnit.MILLION_YEARS.ticks(config));
        config.daysPerYear = 100;
        assertEquals(2_400_000, SkipUnit.YEARS.ticks(config));
    }
}
