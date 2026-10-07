package dev.timeskip.math;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class WeatherMathTest {
    private static final WeatherMath.Range RAIN_DELAY = new WeatherMath.Range(12000, 180000);
    private static final WeatherMath.Range RAIN_DURATION = new WeatherMath.Range(12000, 24000);
    private static final WeatherMath.Range THUNDER_DELAY = new WeatherMath.Range(12000, 180000);
    private static final WeatherMath.Range THUNDER_DURATION = new WeatherMath.Range(3600, 15600);

    /** Literal transcription of the per-tick timer logic in ServerLevel.advanceWeatherCycle. */
    private static WeatherMath.Timer bruteForce(WeatherMath.Timer start, long ticks, WeatherMath.Range delay,
                                                WeatherMath.Range duration, Rng rng) {
        int time = start.time();
        boolean on = start.on();
        for (long t = 0; t < ticks; t++) {
            if (time > 0) {
                if (--time == 0) {
                    on = !on;
                }
            } else if (on) {
                time = duration.sample(rng);
            } else {
                time = delay.sample(rng);
            }
        }
        return new WeatherMath.Timer(time, on);
    }

    @Test
    void eventJumpingEqualsTickByTick() {
        for (int seed = 0; seed < 50; seed++) {
            WeatherMath.Timer start = new WeatherMath.Timer(seed * 997 % 5000, seed % 2 == 0);
            long ticks = 3_000_000L + seed * 12_345L;
            WeatherMath.Timer expected = bruteForce(start, ticks, RAIN_DELAY, RAIN_DURATION, new Rng(seed));
            WeatherMath.Timer actual = WeatherMath.runExact(start, ticks, RAIN_DELAY, RAIN_DURATION, new Rng(seed)).timer();
            assertEquals(expected, actual, "seed " + seed);
        }
    }

    @Test
    void stationaryDistributionMatchesLongRuns() {
        int runs = 4000;
        int onBrute = 0;
        int onStationary = 0;
        double countdownBrute = 0;
        double countdownStationary = 0;
        Rng rng = new Rng(11);
        for (int i = 0; i < runs; i++) {
            WeatherMath.Timer brute = bruteForce(new WeatherMath.Timer(0, false), 2_000_000, THUNDER_DELAY, THUNDER_DURATION, rng);
            WeatherMath.Timer stat = WeatherMath.stationary(THUNDER_DELAY, THUNDER_DURATION, rng);
            onBrute += brute.on() ? 1 : 0;
            onStationary += stat.on() ? 1 : 0;
            countdownBrute += brute.time();
            countdownStationary += stat.time();
        }
        double expectedOn = WeatherMath.onFraction(THUNDER_DELAY, THUNDER_DURATION);
        assertEquals(expectedOn, onBrute / (double) runs, 0.025);
        assertEquals(expectedOn, onStationary / (double) runs, 0.025);
        assertEquals(countdownBrute / runs, countdownStationary / runs, countdownBrute / runs * 0.08);
    }

    @Test
    void clearWeatherCommandHoldsThenReleases() {
        WeatherMath.State start = new WeatherMath.State(30_000, new WeatherMath.Timer(5, true), new WeatherMath.Timer(5, true));
        WeatherMath.Result held = WeatherMath.advance(start, 10_000, RAIN_DELAY, RAIN_DURATION, THUNDER_DELAY, THUNDER_DURATION, new Rng(1));
        assertEquals(20_000, held.state().clearWeatherTime());
        assertFalse(held.state().rain().on());
        assertFalse(held.state().thunder().on());
        assertEquals(0, held.rainingTicks());
    }

    @Test
    void longSkipsUseStationaryAndCountRain() {
        WeatherMath.State start = new WeatherMath.State(0, new WeatherMath.Timer(100, false), new WeatherMath.Timer(100, false));
        long ticks = 876_000_000_000_000L;
        WeatherMath.Result result = WeatherMath.advance(start, ticks, RAIN_DELAY, RAIN_DURATION, THUNDER_DELAY, THUNDER_DURATION, new Rng(2));
        double fraction = result.rainingTicks() / (double) ticks;
        assertEquals(WeatherMath.onFraction(RAIN_DELAY, RAIN_DURATION), fraction, 1e-6);
        assertTrue(result.state().rain().time() >= 0 && result.state().rain().time() <= 180001);
    }
}
