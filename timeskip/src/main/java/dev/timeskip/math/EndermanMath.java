package dev.timeskip.math;

/**
 * Pure maths for endermen moving blocks ({@code Enderman.EndermanTakeBlockGoal} /
 * {@code EndermanLeaveBlockGoal} in 26.3). No Minecraft classes, so it is unit-testable.
 *
 * <h2>Rates</h2>
 * A mob's goal selector does its full update every other tick ({@code Mob.serverAiStep}). The take
 * goal's {@code canUse} is {@code nextInt(reducedTickDelay(20)) == 0} → {@code q = 1/10} per update,
 * only while the enderman's hands are empty; the leave goal's is {@code q = 1/1000}, only while
 * carrying. {@code GoalSelector.tick} first stops a running goal whose {@code canContinueToUse}
 * (= {@code canUse}, a fresh roll) fails, then may start it again in the same update with another
 * roll, then ticks every running goal (one attempt). So right after a failed attempt the next update
 * attempts with {@code 2q - q²}, otherwise with {@code q}. Solving that two-state chain, a free
 * enderman's successful pickups per update are {@code q·p / (p + (1 - p)(1 - q + q²))}, about
 * {@code p/18.2} per tick for small {@code p} rather than {@code p/20} ({@link #successPerTick}).
 *
 * <h2>Geometry</h2>
 * Pickup target: {@code floor(x - 2 + 4u)}, {@code floor(y + 3u)}, {@code floor(z - 2 + 4u)} around
 * the enderman's position. With the enderman anywhere inside its block (uniform fraction) the
 * horizontal offset has the trapezoid distribution 1/8, 1/4, 1/4, 1/4, 1/8 over -2..+2, and the
 * vertical offset is 0, 1 or 2 above its feet with 1/3 each — it can never reach the block it
 * stands on. Placement target: {@code floor(x - 1 + 2u)} → 1/4, 1/2, 1/4 over -1..+1, and 0 or 1
 * above its feet with 1/2 each.
 *
 * <h2>Population-level rate</h2>
 * One enderman on its own alternates "empty, trying to pick up" and "carrying, trying to place"
 * ({@link #meanCycleTicks}). But a carrying enderman is excluded from the monster cap
 * ({@code NaturalSpawner.java:76}) and never despawns ({@code Mob.checkDespawn}), so the spawner
 * replaces it with a new free one. The free population therefore stays at its cap share, carriers
 * pile up on top until placements balance pickups, and the long-run number of moves is the free
 * population's pickup rate {@code freeEndermanTicks × successPerTick(1/10, pPick)}
 * ({@link #expectedMoves}). Over long skips that count is very close to Poisson, which is what we
 * sample.
 */
public final class EndermanMath {
    /** {@code canUse} chance per goal update of the take goal ({@code 1 / reducedTickDelay(20)}). */
    public static final double TAKE_GOAL_CHANCE = 1.0 / 10.0;
    /** {@code canUse} chance per goal update of the leave goal ({@code 1 / reducedTickDelay(2000)}). */
    public static final double LEAVE_GOAL_CHANCE = 1.0 / 1000.0;
    /** The goal selector's full update runs every other tick. */
    public static final int TICKS_PER_GOAL_UPDATE = 2;

    /** Horizontal pickup offsets -2..+2 and their probabilities. */
    public static final double[] PICKUP_XZ = {0.125, 0.25, 0.25, 0.25, 0.125};
    public static final int PICKUP_XZ_MIN = -2;
    /** Vertical pickup offsets 0..2 above the feet. */
    public static final double[] PICKUP_Y = {1.0 / 3, 1.0 / 3, 1.0 / 3};
    /** Horizontal placement offsets -1..+1. */
    public static final double[] PLACE_XZ = {0.25, 0.5, 0.25};
    public static final int PLACE_XZ_MIN = -1;
    /** Vertical placement offsets 0..1 above the feet. */
    public static final double[] PLACE_Y = {0.5, 0.5};

    private EndermanMath() {
    }

    /** Probability that one pickup attempt targets the block at offset (dx, dy, dz) from the feet block. */
    public static double pickupOffsetProbability(int dx, int dy, int dz) {
        return at(PICKUP_XZ, dx - PICKUP_XZ_MIN) * at(PICKUP_Y, dy) * at(PICKUP_XZ, dz - PICKUP_XZ_MIN);
    }

    /** Probability that one placement attempt targets offset (dx, dy, dz) from the feet block. */
    public static double placeOffsetProbability(int dx, int dy, int dz) {
        return at(PLACE_XZ, dx - PLACE_XZ_MIN) * at(PLACE_Y, dy) * at(PLACE_XZ, dz - PLACE_XZ_MIN);
    }

    /**
     * Compensation for planning one chunk at a time: a pickup target near the chunk border is also
     * picked by endermen standing in the neighbouring chunk, which the planner of this chunk can't
     * see. With similar terrain on both sides, multiplying the target's probability by this factor
     * restores its vanilla pick rate (and the chunk's total pickup rate). {@code localX/localZ} are
     * the target's coordinates inside its chunk (0-15).
     */
    public static double borderCompensation(int localX, int localZ) {
        return 1.0 / (inChunkPickerMass(localX) * inChunkPickerMass(localZ));
    }

    /** Share of a target's pickers (offsets -2..+2 away) that stand inside the same chunk, per axis. */
    static double inChunkPickerMass(int local) {
        double mass = 0;
        for (int i = 0; i < PICKUP_XZ.length; i++) {
            int standing = local - (PICKUP_XZ_MIN + i);
            if (standing >= 0 && standing < 16) {
                mass += PICKUP_XZ[i];
            }
        }
        return mass;
    }

    private static double at(double[] table, int index) {
        return index < 0 || index >= table.length ? 0.0 : table[index];
    }

    /**
     * Successful attempts per game tick of a goal with {@code canUse} chance {@code q} per update
     * whose attempts each succeed with {@code p}, following {@code GoalSelector.tick}'s
     * stop-then-restart order (see the class comment). 0 if {@code p <= 0}.
     */
    public static double successPerTick(double q, double p) {
        if (p <= 0 || q <= 0) {
            return 0.0;
        }
        double pp = Math.min(1.0, p);
        double perUpdate = q * pp / (pp + (1.0 - pp) * (1.0 - q + q * q));
        return perUpdate / TICKS_PER_GOAL_UPDATE;
    }

    /**
     * Mean ticks for one full pick-up-and-put-down cycle, or {@code +Infinity} if one of the two
     * steps can never succeed.
     */
    public static double meanCycleTicks(double pPick, double pPlace) {
        if (pPick <= 0 || pPlace <= 0) {
            return Double.POSITIVE_INFINITY;
        }
        return 1.0 / successPerTick(TAKE_GOAL_CHANCE, pPick) + 1.0 / successPerTick(LEAVE_GOAL_CHANCE, pPlace);
    }

    /** Fraction of its time an enderman spends carrying a block. */
    public static double carryingFraction(double pPick, double pPlace) {
        double cycle = meanCycleTicks(pPick, pPlace);
        if (Double.isInfinite(cycle)) {
            return pPick > 0 ? 1.0 : 0.0;
        }
        return (1.0 / successPerTick(LEAVE_GOAL_CHANCE, pPlace)) / cycle;
    }

    /** Expected completed cycles of a single enderman present for {@code endermanTicks}. */
    public static double singleEndermanMoves(double endermanTicks, double pPick, double pPlace) {
        double cycle = meanCycleTicks(pPick, pPlace);
        return Double.isInfinite(cycle) || endermanTicks <= 0 ? 0.0 : endermanTicks / cycle;
    }

    /**
     * Expected blocks moved by a cap-limited population: {@code freeEndermanTicks} of free (not
     * carrying) enderman presence, each pickup attempt succeeding with {@code pPick}. Every pickup
     * is eventually put down by the carrier, so pickups = moves in the long run.
     */
    public static double expectedMoves(double freeEndermanTicks, double pPick) {
        if (freeEndermanTicks <= 0) {
            return 0.0;
        }
        return freeEndermanTicks * successPerTick(TAKE_GOAL_CHANCE, pPick);
    }

    /** Equilibrium number of carrying endermen per free enderman ({@code r_take / r_place}). */
    public static double carriersPerFree(double pPick, double pPlace) {
        if (pPick <= 0) {
            return 0.0;
        }
        if (pPlace <= 0) {
            return Double.POSITIVE_INFINITY;
        }
        return successPerTick(TAKE_GOAL_CHANCE, pPick) / successPerTick(LEAVE_GOAL_CHANCE, pPlace);
    }

    /**
     * Distinct blocks that end up displaced after {@code rawMoves} moves when at most
     * {@code equilibrium} can be out of place at once.
     *
     * <p>Endermen re-pick blocks that were already moved (they are just as holdable, and placed
     * blocks sit at feet level where endermen reach them most easily), so after enough moves the
     * displaced count stops growing and settles at an equilibrium instead of increasing forever.
     * The approach is exponential: {@code D = Dmax * (1 - exp(-M / Dmax))}. For short skips
     * ({@code M ≪ Dmax}) this is just {@code M}, the vanilla rate.
     */
    public static double displacedBlocks(double rawMoves, double equilibrium) {
        if (rawMoves <= 0 || equilibrium <= 0) {
            return 0.0;
        }
        return equilibrium * -Math.expm1(-rawMoves / equilibrium);
    }

    /**
     * New displacements from {@code addedMoves} more moves in a place where {@code earlierDisplaced}
     * blocks are already out of place: {@code (Dmax − D₀)(1 − e^(−M/Dmax))}, i.e. continuing the
     * saturation curve from where earlier skips left it. Keeps the cap cumulative, so many short
     * skips end up like one long one, and a larger cap later still leaves room.
     */
    public static double displacedIncrement(double earlierDisplaced, double addedMoves, double equilibrium) {
        if (addedMoves <= 0 || equilibrium <= 0) {
            return 0.0;
        }
        double room = Math.max(0.0, equilibrium - Math.max(0.0, earlierDisplaced));
        return room * -Math.expm1(-addedMoves / equilibrium);
    }

    /** Draws a Poisson(lambda) count (via an exact binomial with huge n and tiny p). */
    public static long poisson(double lambda, Rng rng) {
        if (!(lambda > 0)) {
            return 0;
        }
        if (lambda > 1.0e15) {
            return (long) lambda;
        }
        long n = 1L << 50;
        return Binomial.sample(n, lambda / n, rng);
    }

    /** Rounds a non-negative expected value to an integer, randomly up or down so the mean is kept. */
    public static long randomRound(double value, Rng rng) {
        if (!(value > 0)) {
            return 0;
        }
        long floor = (long) Math.floor(value);
        return floor + (rng.nextDouble() < value - floor ? 1 : 0);
    }

    /**
     * Day-averaged chance that {@code Monster.isDarkEnoughToSpawn} passes at a spot:
     * {@code sky <= nextInt(32)} (raw sky light, no darkening), block light within the dimension's
     * {@code monster_spawn_block_light_limit} (not checked when the limit is 15), and current
     * brightness {@code max(sky - darken, block)} at most the dimension's
     * {@code monster_spawn_light_level} sample (uniform over [lightMin, lightMax]).
     *
     * @param dayCycle true if darkening follows the overworld day ({@link DaylightModel}); otherwise
     *                 {@code fixedDarken} applies all the time
     */
    public static double spawnLightPass(int sky, int block, int lightMin, int lightMax, int blockLimit,
                                        boolean hasSky, boolean dayCycle, int fixedDarken) {
        int s = hasSky ? Math.max(0, Math.min(15, sky)) : 0;
        if (blockLimit < 15 && block > blockLimit) {
            return 0.0;
        }
        double skyPass = (32.0 - s) / 32.0;
        double brightPass;
        if (dayCycle && hasSky) {
            int samples = 240;
            double sum = 0;
            for (int i = 0; i < samples; i++) {
                int darken = DaylightModel.skyDarken((long) i * DaylightModel.DAY_LENGTH / samples);
                sum += atLeast(lightMin, lightMax, Math.max(s - darken, block));
            }
            brightPass = sum / samples;
        } else {
            brightPass = atLeast(lightMin, lightMax, Math.max(s - fixedDarken, block));
        }
        return skyPass * brightPass;
    }

    /** P(sample >= brightness) for an integer sample uniform over [min, max]. */
    static double atLeast(int min, int max, int brightness) {
        if (brightness <= min) {
            return 1.0;
        }
        if (brightness > max) {
            return 0.0;
        }
        return (max - brightness + 1) / (double) (max - min + 1);
    }
}
