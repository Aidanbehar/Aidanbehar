package dev.timeskip.core;

import dev.timeskip.config.TimeSkipConfig;

/** Human-friendly durations for chat and the boss bar. */
public final class SkipFormat {
    private SkipFormat() {
    }

    public static String describe(long ticks, TimeSkipConfig config) {
        double years = (double) ticks / config.ticksPerYear();
        if (years >= 1_000_000) {
            return number(years / 1_000_000) + " million years";
        }
        if (years >= 1) {
            return number(years) + (years == 1 ? " year" : " years");
        }
        double days = ticks / 24_000.0;
        if (days >= 1) {
            return number(days) + (days == 1 ? " day" : " days");
        }
        return String.format("%,d ticks", ticks);
    }

    private static String number(double value) {
        if (value == Math.rint(value)) {
            return String.format("%,d", (long) value);
        }
        return String.format("%,.2f", value).replaceAll("0+$", "").replaceAll("\\.$", "");
    }
}
