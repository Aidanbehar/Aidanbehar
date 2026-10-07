package dev.timeskip.sim;

import dev.timeskip.math.DaylightModel;
import dev.timeskip.math.RandomTickMath;
import dev.timeskip.sim.enderman.EndermanPopulation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.gamerules.GameRules;

/**
 * Facts about one dimension that the simulation needs, captured on the main thread when a skip
 * starts. Everything except {@link #level} is immutable and safe to read from worker threads.
 */
public final class LevelInfo {
    /** Turtle eggs: chance 1.0 during ticks 21062-21905 of the overworld day, 0.002 otherwise. */
    private static final float OVERWORLD_TURTLE_HATCH = (843.0F / 24000.0F) + (1.0F - 843.0F / 24000.0F) * 0.002F;
    private static final float DEFAULT_TURTLE_HATCH = 0.002F;

    /** Main thread only. */
    public final ServerLevel level;
    public final long ticks;
    public final int randomTickSpeed;
    public final long trials;
    public final boolean hasSkyLight;
    public final boolean dayCycle;
    public final int fixedSkyDarken;
    public final long dimensionSalt;
    public final long endTimeOfDay;
    public final float turtleHatchChance;
    public final long rainTicks;
    public final int maxSnowHeight;
    public final int seaLevel;
    public final boolean canHaveWeather;
    /** Enderman population model for this dimension (inactive if disabled or mobGriefing is off). */
    public final EndermanPopulation endermen;

    public LevelInfo(ServerLevel level, long ticks, long endTimeOfDay, long rainTicks, boolean simulateEndermen) {
        this.level = level;
        this.ticks = ticks;
        this.randomTickSpeed = Math.max(0, level.getGameRules().get(GameRules.RANDOM_TICK_SPEED));
        this.trials = RandomTickMath.trials(ticks, randomTickSpeed);
        this.hasSkyLight = level.dimensionType().hasSkyLight();
        this.dayCycle = level.dimension() == Level.OVERWORLD;
        this.fixedSkyDarken = level.getSkyDarken();
        this.dimensionSalt = level.dimension().identifier().toString().hashCode() * 0x9E3779B97F4A7C15L;
        this.endTimeOfDay = Math.floorMod(endTimeOfDay, DaylightModel.DAY_LENGTH);
        this.turtleHatchChance = dayCycle ? OVERWORLD_TURTLE_HATCH : DEFAULT_TURTLE_HATCH;
        this.canHaveWeather = level.canHaveWeather();
        this.rainTicks = canHaveWeather ? rainTicks : 0;
        this.maxSnowHeight = level.getGameRules().get(GameRules.MAX_SNOW_ACCUMULATION_HEIGHT);
        this.seaLevel = level.getSeaLevel();
        this.endermen = new EndermanPopulation(level, simulateEndermen, dayCycle, ticks > 0 ? (double) this.rainTicks / ticks : 0.0);
    }

    /** Fraction of the day a block passes a "max local raw brightness >= threshold" check. */
    public double fractionLit(int sky, int block, int threshold) {
        return DaylightModel.fractionLit(hasSkyLight ? sky : 0, block, threshold, dayCycle, fixedSkyDarken);
    }

    /** Converts leftover trials back into ticks. */
    public long ticksForTrials(long trialsLeft) {
        return randomTickSpeed <= 0 ? 0 : trialsLeft / randomTickSpeed;
    }
}
