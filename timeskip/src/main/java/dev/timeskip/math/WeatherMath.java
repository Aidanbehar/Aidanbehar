package dev.timeskip.math;

/**
 * Fast-forwards vanilla's weather timers ({@code ServerLevel.advanceWeatherCycle}).
 *
 * <p>Rain and thunder are two independent on/off processes. Each tick a positive countdown is
 * decremented and the state flips when it reaches zero; a zero countdown is replaced by a fresh
 * duration (if on) or delay (if off). A {@code /weather clear} countdown overrides both while it
 * runs. For skips up to {@link #EXACT_TICK_LIMIT} we replay that exactly, jumping from event to
 * event; for longer skips the process has forgotten its start state thousands of times over, so we
 * draw directly from its stationary distribution: the phase with probability proportional to its
 * mean length and the remaining countdown from the length-biased residual-life law.
 */
public final class WeatherMath {
    /** Above this many ticks we sample from the stationary distribution (about 175k weather cycles). */
    public static final long EXACT_TICK_LIMIT = 20_000_000_000L;

    private WeatherMath() {
    }

    /** Inclusive integer range, mirrors vanilla {@code UniformInt}. */
    public record Range(int min, int max) {
        public int sample(Rng rng) {
            return rng.nextIntBetweenInclusive(min, max);
        }

        public double mean() {
            return (min + (double) max) / 2.0;
        }
    }

    /** One on/off timer (rain or thunder). */
    public record Timer(int time, boolean on) {
    }

    public record State(int clearWeatherTime, Timer rain, Timer thunder) {
    }

    /** Final weather plus how many of the skipped ticks it was raining (for snow/ice/cauldrons). */
    public record Result(State state, long rainingTicks) {
    }

    public static Result advance(State start, long ticks, Range rainDelay, Range rainDuration,
                                 Range thunderDelay, Range thunderDuration, Rng rng) {
        if (ticks <= 0) {
            return new Result(start, 0);
        }
        int clear = start.clearWeatherTime();
        Timer rain = start.rain();
        Timer thunder = start.thunder();
        long remaining = ticks;
        long rainingTicks = 0;

        if (clear > 0) {
            long d = Math.min(clear, remaining);
            clear -= (int) d;
            remaining -= d;
            // While clear weather is forced, vanilla parks both timers at 1 and turns both off.
            rain = new Timer(1, false);
            thunder = new Timer(1, false);
        }
        if (remaining == 0) {
            return new Result(new State(clear, rain, thunder), rainingTicks);
        }

        if (remaining <= EXACT_TICK_LIMIT) {
            TimerRun rainRun = runExact(rain, remaining, rainDelay, rainDuration, rng);
            TimerRun thunderRun = runExact(thunder, remaining, thunderDelay, thunderDuration, rng);
            return new Result(new State(clear, rainRun.timer, thunderRun.timer), rainingTicks + rainRun.onTicks);
        }

        Timer finalRain = stationary(rainDelay, rainDuration, rng);
        Timer finalThunder = stationary(thunderDelay, thunderDuration, rng);
        double onFraction = onFraction(rainDelay, rainDuration);
        return new Result(new State(clear, finalRain, finalThunder), rainingTicks + Math.round(remaining * onFraction));
    }

    /** Long-run fraction of time the timer is "on". The sampling tick belongs to the new phase. */
    public static double onFraction(Range delay, Range duration) {
        double on = duration.mean() + 1;
        double off = delay.mean() + 1;
        return on / (on + off);
    }

    record TimerRun(Timer timer, long onTicks) {
    }

    /** Exact event-to-event replay of one vanilla timer for {@code ticks} ticks. */
    static TimerRun runExact(Timer start, long ticks, Range delay, Range duration, Rng rng) {
        int time = start.time();
        boolean on = start.on();
        long remaining = ticks;
        long onTicks = 0;
        while (remaining > 0) {
            if (time > 0) {
                long d = Math.min(time, remaining);
                if (on) {
                    onTicks += d;
                }
                time -= (int) d;
                remaining -= d;
                if (time == 0) {
                    // Flip happens on the tick the countdown hits zero; that tick was counted above
                    // in the old phase, matching vanilla's isRaining() during the tick.
                    on = !on;
                }
            } else {
                time = on ? duration.sample(rng) : delay.sample(rng);
                if (on) {
                    onTicks++;
                }
                remaining--;
            }
        }
        return new TimerRun(new Timer(time, on), onTicks);
    }

    /** Draws a timer state from the stationary distribution of the alternating renewal process. */
    static Timer stationary(Range delay, Range duration, Rng rng) {
        boolean on = rng.nextDouble() < onFraction(delay, duration);
        Range range = on ? duration : delay;
        // Length-biased pick of the current phase length (+1 for the sampling tick)...
        int length;
        do {
            length = range.sample(rng) + 1;
        } while (rng.nextDouble() * (range.max() + 1) > length);
        // ...and a uniformly random point inside it. Position 0 is the sampling tick (countdown 0).
        int position = rng.nextInt(length);
        int countdown = position == 0 ? 0 : length - position;
        return new Timer(countdown, on);
    }
}
