package dev.timeskip.command;

import dev.timeskip.config.TimeSkipConfig;

/** Units accepted by {@code /timeskip <amount> <unit>}. */
public enum SkipUnit {
    TICKS("ticks"),
    DAYS("days"),
    YEARS("years"),
    THOUSAND_YEARS("thousand_years"),
    MILLION_YEARS("million_years");

    public final String id;

    SkipUnit(String id) {
        this.id = id;
    }

    /** Length of one unit in game ticks. Years follow {@code days_per_year} (default 365). */
    public double ticks(TimeSkipConfig config) {
        return switch (this) {
            case TICKS -> 1.0;
            case DAYS -> 24_000.0;
            case YEARS -> config.ticksPerYear();
            case THOUSAND_YEARS -> config.ticksPerYear() * 1.0e3;
            case MILLION_YEARS -> config.ticksPerYear() * 1.0e6;
        };
    }
}
