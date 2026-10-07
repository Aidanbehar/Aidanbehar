package dev.timeskip.math;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Checks the enderman model against brute-force replays of the 26.3 goal code:
 * {@code EndermanTakeBlockGoal} ({@code nextInt(10) == 0}) and {@code EndermanLeaveBlockGoal}
 * ({@code nextInt(1000) == 0}), driven the way {@code GoalSelector.tick} drives them every other
 * tick: stop running goals whose {@code canContinueToUse} (a fresh {@code canUse} roll) fails, start
 * idle goals whose {@code canUse} passes, then tick every running goal once.
 */
class EndermanMathTest {

    /** One goal under GoalSelector's stop / start / tick order. */
    private static final class Goal {
        final int chance;
        boolean running;

        Goal(int chance) {
            this.chance = chance;
        }

        /** One full goal-selector update; true if the goal ticks (makes an attempt). */
        boolean update(Rng rng) {
            if (running && rng.nextInt(chance) != 0) {
                running = false;
            }
            if (!running && rng.nextInt(chance) == 0) {
                running = true;
            }
            return running;
        }
    }

    @Test
    void successRateMatchesGoalSelector() {
        for (double p : new double[] {0.02, 0.3, 1.0}) {
            Rng rng = new Rng((long) (p * 1000) + 11);
            Goal take = new Goal(10);
            long ticks = 40_000_000;
            long successes = 0;
            for (long t = 0; t < ticks; t += 2) {
                if (take.update(rng) && rng.nextDouble() < p) {
                    successes++;
                    take.running = false; // hands full: a fresh free enderman takes over (cap refill)
                }
            }
            double expected = EndermanMath.successPerTick(EndermanMath.TAKE_GOAL_CHANCE, p) * ticks;
            assertEquals(expected, successes, Math.max(5 * Math.sqrt(expected), expected * 0.01), "p=" + p);
        }
        // Small p: about p/18.2 per tick, not p/20.
        assertEquals(0.02 / 18.2, EndermanMath.successPerTick(0.1, 0.02), 0.02 / 18.2 * 0.01);
        assertEquals(0.05, EndermanMath.successPerTick(0.1, 1.0), 1e-12);
    }

    /** {@code floor(x - 2 + 4u)} with the enderman anywhere inside its block. */
    @Test
    void pickupOffsetsMatchVanillaFormula() {
        Rng rng = new Rng(1);
        int samples = 2_000_000;
        long[] counts = new long[5];
        long[] yCounts = new long[3];
        for (int i = 0; i < samples; i++) {
            double x = 10 + rng.nextDouble();          // enderman's exact x inside block 10
            int target = (int) Math.floor(x - 2.0 + rng.nextDouble() * 4.0);
            counts[target - 10 + 2]++;
            double y = 64;                              // standing on the ground: integer feet height
            yCounts[(int) Math.floor(y + rng.nextDouble() * 3.0) - 64]++;
        }
        for (int i = 0; i < 5; i++) {
            assertEquals(EndermanMath.PICKUP_XZ[i], counts[i] / (double) samples, 0.002, "x offset " + (i - 2));
        }
        for (int i = 0; i < 3; i++) {
            assertEquals(EndermanMath.PICKUP_Y[i], yCounts[i] / (double) samples, 0.002, "y offset " + i);
        }
        assertEquals(1.0, sum3d(true), 1e-12);
    }

    /** {@code floor(x - 1 + 2u)} and {@code floor(y + 2u)}. */
    @Test
    void placeOffsetsMatchVanillaFormula() {
        Rng rng = new Rng(2);
        int samples = 2_000_000;
        long[] counts = new long[3];
        for (int i = 0; i < samples; i++) {
            double x = 5 + rng.nextDouble();
            counts[(int) Math.floor(x - 1.0 + rng.nextDouble() * 2.0) - 5 + 1]++;
        }
        for (int i = 0; i < 3; i++) {
            assertEquals(EndermanMath.PLACE_XZ[i], counts[i] / (double) samples, 0.002);
        }
        assertEquals(1.0, sum3d(false), 1e-12);
    }

    private static double sum3d(boolean pickup) {
        double total = 0;
        for (int dx = -2; dx <= 2; dx++) {
            for (int dy = 0; dy <= 2; dy++) {
                for (int dz = -2; dz <= 2; dz++) {
                    total += pickup ? EndermanMath.pickupOffsetProbability(dx, dy, dz) : EndermanMath.placeOffsetProbability(dx, dy, dz);
                }
            }
        }
        return total;
    }

    /**
     * Cap-limited population: a fixed number of free endermen (a free enderman that picks a block up
     * leaves the cap and the spawner replaces it); carriers place with the leave goal. Compares
     * pickups and the carrier count with the closed-form model.
     */
    @Test
    void capLimitedPopulationMatchesBruteForce() {
        int free = 6;
        double pPick = 0.08;
        double pPlace = 0.4;
        long ticks = 2_000_000;
        Rng rng = new Rng(3);
        Goal[] freeGoals = new Goal[free];
        for (int e = 0; e < free; e++) {
            freeGoals[e] = new Goal(10);
        }
        java.util.List<Goal> carriers = new java.util.ArrayList<>();
        long pickups = 0;
        long carrierTickSum = 0;
        for (long t = 0; t < ticks; t++) {
            if ((t & 1) == 0) {
                for (int e = 0; e < free; e++) {
                    if (freeGoals[e].update(rng) && rng.nextDouble() < pPick) {
                        pickups++;
                        carriers.add(new Goal(1000));
                        freeGoals[e] = new Goal(10); // the spawner replaces it with a fresh free one
                    }
                }
                carriers.removeIf(c -> c.update(rng) && rng.nextDouble() < pPlace);
            }
            if (t > ticks / 2) {
                carrierTickSum += carriers.size();
            }
        }
        double expectedMoves = EndermanMath.expectedMoves((double) free * ticks, pPick);
        assertEquals(expectedMoves, pickups, expectedMoves * 0.03, "pickups");
        double meanCarriers = carrierTickSum / (double) (ticks / 2);
        double expectedCarriers = free * EndermanMath.carriersPerFree(pPick, pPlace);
        assertEquals(expectedCarriers, meanCarriers, expectedCarriers * 0.08, "equilibrium carriers");
    }

    /** One enderman alternating pickup and placement attempts (no spawner involved). */
    @Test
    void singleEndermanCycleMatchesBruteForce() {
        double pPick = 0.3;
        double pPlace = 0.5;
        long ticks = 20_000_000;
        Rng rng = new Rng(4);
        Goal take = new Goal(10);
        Goal leave = new Goal(1000);
        boolean carrying = false;
        long moves = 0;
        long carryingTicks = 0;
        for (long t = 0; t < ticks; t++) {
            if (carrying) {
                carryingTicks++;
            }
            if ((t & 1) != 0) {
                continue;
            }
            if (!carrying) {
                if (take.update(rng) && rng.nextDouble() < pPick) {
                    carrying = true;
                    take.running = false; // canUse fails with hands full: stopped next update
                }
            } else if (leave.update(rng) && rng.nextDouble() < pPlace) {
                carrying = false;
                leave.running = false;
                moves++;
            }
        }
        double expected = EndermanMath.singleEndermanMoves(ticks, pPick, pPlace);
        assertEquals(expected, moves, expected * 0.05);
        assertEquals(EndermanMath.carryingFraction(pPick, pPlace), carryingTicks / (double) ticks, 0.01);
    }

    /** Many short skips add up to the same displacement as one long one. */
    @Test
    void displacementIsCumulativeAcrossSkips() {
        double eq = 40;
        double total = 0;
        double earlier = 0;
        for (int skip = 0; skip < 50; skip++) {
            double added = 3.7;
            total += EndermanMath.displacedIncrement(earlier, added, eq);
            earlier += added;
        }
        assertEquals(EndermanMath.displacedBlocks(earlier, eq), total, 1e-9);
        assertEquals(0.0, EndermanMath.displacedIncrement(1e12, 1e6, eq), 1e-9, "already saturated");
        assertEquals(EndermanMath.displacedBlocks(5, eq), EndermanMath.displacedIncrement(0, 5, eq), 1e-12);
    }

    @Test
    void saturationIsLinearForShortAndCappedForLong() {
        assertEquals(5.0, EndermanMath.displacedBlocks(5, 10_000), 0.01);
        assertEquals(0.0, EndermanMath.displacedBlocks(0, 10));
        double long1 = EndermanMath.displacedBlocks(1.0e6, 40);
        assertEquals(40.0, long1, 1e-9);
        double previous = 0;
        for (int m = 1; m <= 200; m++) {
            double d = EndermanMath.displacedBlocks(m, 40);
            assertTrue(d > previous && d <= m && d < 40);
            previous = d;
        }
    }

    @Test
    void poissonSamplerHasRightMoments() {
        for (double lambda : new double[] {0.3, 7.0, 250.0, 1.0e7}) {
            Rng rng = new Rng((long) (lambda * 1000));
            int n = 100_000;
            double sum = 0;
            double sumSq = 0;
            for (int i = 0; i < n; i++) {
                double k = EndermanMath.poisson(lambda, rng);
                sum += k;
                sumSq += k * k;
            }
            double mean = sum / n;
            double var = sumSq / n - mean * mean;
            assertEquals(lambda, mean, 5 * Math.sqrt(lambda / n) + 1e-9, "mean for " + lambda);
            assertEquals(lambda, var, lambda * 0.05 + 0.01, "variance for " + lambda);
        }
        assertEquals(0, EndermanMath.poisson(0, new Rng(1)));
    }

    @Test
    void randomRoundKeepsTheMean() {
        Rng rng = new Rng(9);
        double sum = 0;
        int n = 200_000;
        for (int i = 0; i < n; i++) {
            sum += EndermanMath.randomRound(2.3, rng);
        }
        assertEquals(2.3, sum / n, 0.01);
    }

    /** Values derived independently from the 26.3 code (Monster.isDarkEnoughToSpawn + dimension settings). */
    @Test
    void spawnLightWeightsMatchVanilla() {
        // Overworld: UniformInt(0,7), block light limit 0, day cycle.
        double surface = EndermanMath.spawnLightPass(15, 0, 0, 7, 0, true, true, 0);
        assertEquals(0.1013, surface, 0.002, "open ground, averaged over a day");
        assertEquals(1.0, EndermanMath.spawnLightPass(0, 0, 0, 7, 0, true, true, 0), 1e-12, "dark cave");
        assertEquals(0.0, EndermanMath.spawnLightPass(0, 1, 0, 7, 0, true, true, 0), "any block light stops it");
        // Full night only (darken 11): 17/32 * 4/8.
        assertEquals(17.0 / 32 * 4 / 8, EndermanMath.spawnLightPass(15, 0, 0, 7, 0, true, false, 11), 1e-12);
        // Nether: ConstantInt(7), block light limit 15 (not checked), no sky.
        assertEquals(1.0, EndermanMath.spawnLightPass(0, 7, 7, 7, 15, false, false, 0), 1e-12);
        assertEquals(0.0, EndermanMath.spawnLightPass(0, 8, 7, 7, 15, false, false, 0), 1e-12);
        // The End: ConstantInt(15), limit 0, sky light 15, no darkening: 17/32.
        assertEquals(17.0 / 32, EndermanMath.spawnLightPass(15, 0, 15, 15, 0, true, false, 0), 1e-12);
    }
}
