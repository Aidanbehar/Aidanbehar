package com.deepwinter.storm;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import net.minecraft.resources.Identifier;
import net.minecraft.util.datafix.DataFixTypes;
import net.minecraft.world.level.saveddata.SavedData;
import net.minecraft.world.level.saveddata.SavedDataType;

/**
 * Server-wide storm state (weather is server-wide in 26.x). Also holds two monotonically increasing
 * "snow clocks" measured in layers that a reference column would have received; chunks remember the
 * clock values from when they were last loaded so they can catch up later.
 */
public final class StormData extends SavedData {
	public static final Codec<StormData> CODEC = RecordCodecBuilder.create(i -> i.group(
		Codec.BOOL.optionalFieldOf("active", false).forGetter(d -> d.active),
		Codec.BOOL.optionalFieldOf("forced", false).forGetter(d -> d.forced),
		Codec.INT.optionalFieldOf("remaining_ticks", -1).forGetter(d -> d.remainingTicks),
		Codec.LONG.optionalFieldOf("storm_ticks", 0L).forGetter(d -> d.stormTicks),
		Codec.BOOL.optionalFieldOf("was_raining", false).forGetter(d -> d.wasRaining),
		Codec.DOUBLE.optionalFieldOf("snow_clock", 0.0).forGetter(d -> d.snowClock),
		Codec.DOUBLE.optionalFieldOf("storm_clock", 0.0).forGetter(d -> d.stormClock),
		Codec.DOUBLE.optionalFieldOf("storm_clock_at_start", 0.0).forGetter(d -> d.stormClockAtStart)
	).apply(i, StormData::new));

	public static final SavedDataType<StormData> TYPE = new SavedDataType<>(
		Identifier.fromNamespaceAndPath("deepwinter", "storm"), StormData::new, CODEC, DataFixTypes.SAVED_DATA_COMMAND_STORAGE
	);

	boolean active;
	boolean forced;
	/** Ticks left for a storm started by command; -1 means "until the rain stops". */
	int remainingTicks = -1;
	long stormTicks;
	boolean wasRaining;
	double snowClock;
	double stormClock;
	double stormClockAtStart;

	public StormData() {
	}

	private StormData(boolean active, boolean forced, int remainingTicks, long stormTicks, boolean wasRaining,
					  double snowClock, double stormClock, double stormClockAtStart) {
		this.active = active;
		this.forced = forced;
		this.remainingTicks = remainingTicks;
		this.stormTicks = stormTicks;
		this.wasRaining = wasRaining;
		this.snowClock = snowClock;
		this.stormClock = stormClock;
		this.stormClockAtStart = stormClockAtStart;
	}

	public boolean isActive() {
		return active;
	}

	public boolean isForced() {
		return forced;
	}

	public int remainingTicks() {
		return remainingTicks;
	}

	public long stormTicks() {
		return stormTicks;
	}

	public double snowClock() {
		return snowClock;
	}

	public double stormClock() {
		return stormClock;
	}

	public double stormClockAtStart() {
		return stormClockAtStart;
	}
}
