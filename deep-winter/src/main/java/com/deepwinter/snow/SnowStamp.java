package com.deepwinter.snow;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;

/** Snow clock values a chunk had last seen; the difference on load is the snow it missed. */
public record SnowStamp(double snow, double storm) {
	public static final Codec<SnowStamp> CODEC = RecordCodecBuilder.create(i -> i.group(
		Codec.DOUBLE.fieldOf("snow").forGetter(SnowStamp::snow),
		Codec.DOUBLE.fieldOf("storm").forGetter(SnowStamp::storm)
	).apply(i, SnowStamp::new));
}
