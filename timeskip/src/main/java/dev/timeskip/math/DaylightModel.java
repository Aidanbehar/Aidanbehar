package dev.timeskip.math;

/**
 * How much of a day a block's light passes a brightness check that includes sky darkening.
 *
 * <p>Saplings and grass test {@code getMaxLocalRawBrightness}, i.e. {@code max(sky - darken,
 * block)}. In 26.3 the darkening comes from the overworld timeline: the sky light level is 15
 * from tick 133 to 11867, fades linearly to 4 (factor 0.26666668) by 13670, stays there until
 * 22330 and fades back to 15 by tick 133 of the next day ({@code Timelines.OVERWORLD_DAY}).
 * {@code skyDarken = (int)(15 - skyLightLevel)}.
 */
public final class DaylightModel {
    public static final int DAY_LENGTH = 24000;
    private static final int[] KEY_TICKS = {133, 11867, 13670, 22330, 133 + DAY_LENGTH};
    private static final float[] KEY_FACTORS = {1.0F, 1.0F, 0.26666668F, 0.26666668F, 1.0F};

    private static final double[][] FRACTION_CACHE = new double[16][16];

    static {
        int[] darkenAt = new int[DAY_LENGTH];
        for (int t = 0; t < DAY_LENGTH; t++) {
            darkenAt[t] = skyDarken(t);
        }
        for (int sky = 0; sky < 16; sky++) {
            for (int threshold = 0; threshold < 16; threshold++) {
                int passing = 0;
                for (int t = 0; t < DAY_LENGTH; t++) {
                    if (sky - darkenAt[t] >= threshold) {
                        passing++;
                    }
                }
                FRACTION_CACHE[sky][threshold] = passing / (double) DAY_LENGTH;
            }
        }
    }

    private DaylightModel() {
    }

    /** Sky darkening (0 at noon, 11 at midnight) for a time of day in [0, 24000). */
    public static int skyDarken(long timeOfDay) {
        int t = (int) Math.floorMod(timeOfDay, DAY_LENGTH);
        if (t < KEY_TICKS[0]) {
            t += DAY_LENGTH;
        }
        float factor = 1.0F;
        for (int i = 0; i < KEY_TICKS.length - 1; i++) {
            if (t >= KEY_TICKS[i] && t <= KEY_TICKS[i + 1]) {
                float span = KEY_TICKS[i + 1] - KEY_TICKS[i];
                float alpha = (t - KEY_TICKS[i]) / span;
                factor = KEY_FACTORS[i] + (KEY_FACTORS[i + 1] - KEY_FACTORS[i]) * alpha;
                break;
            }
        }
        return (int) (15.0F - 15.0F * factor);
    }

    /**
     * Fraction of a day during which {@code max(sky - darken, block) >= threshold}.
     *
     * @param dayCycle false for dimensions without a day/night cycle; then {@code fixedDarken} is used
     */
    public static double fractionLit(int skyLight, int blockLight, int threshold, boolean dayCycle, int fixedDarken) {
        if (blockLight >= threshold) {
            return 1.0;
        }
        int sky = clamp(skyLight);
        if (!dayCycle) {
            return sky - fixedDarken >= threshold ? 1.0 : 0.0;
        }
        return FRACTION_CACHE[sky][clamp(threshold)];
    }

    /** True if the brightness check passes at a specific time of day. */
    public static boolean litAt(int skyLight, int blockLight, int threshold, long timeOfDay) {
        return Math.max(skyLight - skyDarken(timeOfDay), blockLight) >= threshold;
    }

    private static int clamp(int light) {
        return Math.max(0, Math.min(15, light));
    }
}
