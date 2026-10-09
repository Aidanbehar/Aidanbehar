package com.deepwinter.temperature;

import com.deepwinter.config.DeepWinterConfig;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Shared text formatting for exact temperatures (thermometer and debug command). */
public final class TemperatureFormat {
	private TemperatureFormat() {
	}

	public static String exact(float celsius) {
		if (DeepWinterConfig.get().useFahrenheit) {
			return String.format(Locale.ROOT, "%.1f°F", celsius * 9.0F / 5.0F + 32.0F);
		}
		return String.format(Locale.ROOT, "%.1f°C", celsius);
	}

	/** A difference (no offset for °F). */
	public static String delta(float celsius) {
		float v = DeepWinterConfig.get().useFahrenheit ? celsius * 9.0F / 5.0F : celsius;
		String unit = DeepWinterConfig.get().useFahrenheit ? "°F" : "°C";
		return String.format(Locale.ROOT, "%+.1f%s", v, unit);
	}

	private static ChatFormatting colour(float v) {
		return v > 0.05F ? ChatFormatting.GOLD : v < -0.05F ? ChatFormatting.AQUA : ChatFormatting.GRAY;
	}

	private static MutableComponent line(String key, float value) {
		return Component.translatable("thermometer.deepwinter." + key).withStyle(ChatFormatting.GRAY)
			.append(Component.literal(" " + delta(value)).withStyle(colour(value)));
	}

	public static List<Component> breakdownLines(TemperatureBreakdown t) {
		List<Component> lines = new ArrayList<>();
		if (!t.dimension().equals("overworld")) {
			lines.add(Component.translatable("thermometer.deepwinter.dimension." + t.dimension()).withStyle(ChatFormatting.GRAY)
				.append(Component.literal(" " + exact(t.biome())).withStyle(colour(t.biome()))));
		} else {
			lines.add(Component.translatable("thermometer.deepwinter.biome").withStyle(ChatFormatting.GRAY)
				.append(Component.literal(" " + exact(t.biome())).withStyle(colour(t.biome()))));
			lines.add(line("altitude", t.altitude()));
			lines.add(line("time", t.timeOfDay()));
			lines.add(line(t.storm() ? "storm" : "weather", t.weather()));
			lines.add(line("wind", t.wind()));
			lines.add(line("shelter", t.shelterBuffer()).append(Component.literal(
				String.format(Locale.ROOT, " (%d%%)", Math.round(t.shelter() * 100))).withStyle(ChatFormatting.DARK_GRAY)));
		}
		lines.add(line("heat", t.heat()));
		lines.add(line("wetness", t.wetness()));
		lines.add(line("armor", t.insulation()));
		lines.add(Component.translatable("thermometer.deepwinter.total").withStyle(ChatFormatting.WHITE)
			.append(Component.literal(" " + exact(t.felt())).withStyle(ChatFormatting.WHITE)));
		return lines;
	}
}
