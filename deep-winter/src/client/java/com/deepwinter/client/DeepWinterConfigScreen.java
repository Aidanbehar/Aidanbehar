package com.deepwinter.client;

import com.deepwinter.config.DeepWinterConfig;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.CycleButton;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import org.jspecify.annotations.Nullable;

import java.util.function.Consumer;
import java.util.function.DoubleSupplier;

/** Simple two-column config screen built from vanilla widgets (opened from Mod Menu). */
public class DeepWinterConfigScreen extends Screen {
	private final @Nullable Screen parent;
	private int index;

	public DeepWinterConfigScreen(@Nullable Screen parent) {
		super(Component.translatable("config.deepwinter.title"));
		this.parent = parent;
	}

	@Override
	protected void init() {
		DeepWinterConfig c = DeepWinterConfig.get();
		index = 0;
		slider("max_depth", 0.0, 4.0, 0.05, () -> c.maxSnowDepthMultiplier, v -> c.maxSnowDepthMultiplier = v, "x%.2f");
		slider("accumulation_speed", 0.0, 10.0, 0.1, () -> c.accumulationSpeed, v -> c.accumulationSpeed = v, "x%.1f");
		slider("storm_multiplier", 1.0, 20.0, 0.5, () -> c.stormAccumulationMultiplier, v -> c.stormAccumulationMultiplier = v, "x%.1f");
		slider("storm_chance", 0.0, 1.0, 0.05, () -> c.stormChance, v -> c.stormChance = v, "percent");
		slider("particle_density", 0.0, 2.0, 0.05, () -> c.stormParticleDensity, v -> c.stormParticleDensity = v, "x%.2f");
		slider("particle_cap", 0, 1000, 10, () -> c.maxStormParticlesPerTick, v -> c.maxStormParticlesPerTick = (int) Math.round(v), "%.0f");
		slider("catch_up_cap", 0, 128, 1, () -> c.catchUpCapLayers, v -> c.catchUpCapLayers = (int) Math.round(v), "%.0f");
		slider("freezing_threshold", -30.0, 10.0, 0.5, () -> c.freezingThreshold, v -> c.freezingThreshold = v, "%.1f °C");
		toggle("villagers_freeze", c.villagersFreeze, v -> c.villagersFreeze = v);
		toggle("other_mobs_freeze", c.otherMobsFreeze, v -> c.otherMobsFreeze = v);
		toggle("heat_damage", c.heatDamage, v -> c.heatDamage = v);
		addRenderableWidget(CycleButton.builder((Boolean f) -> Component.literal(f ? "°F" : "°C"), c.useFahrenheit)
			.withValues(Boolean.FALSE, Boolean.TRUE)
			.create(x(), y(), 150, 20, Component.translatable("config.deepwinter.units"), (b, v) -> c.useFahrenheit = v));
		index++;

		addRenderableWidget(Button.builder(Component.translatable("gui.done"), b -> onClose())
			.bounds(width / 2 - 100, height - 28, 200, 20).build());
	}

	private int x() {
		return width / 2 + (index % 2 == 0 ? -155 : 5);
	}

	private int y() {
		return 32 + (index / 2) * 24;
	}

	private void toggle(String key, boolean initial, Consumer<Boolean> setter) {
		addRenderableWidget(CycleButton.onOffBuilder(initial)
			.create(x(), y(), 150, 20, Component.translatable("config.deepwinter." + key), (b, v) -> setter.accept(v)));
		index++;
	}

	private void slider(String key, double min, double max, double step, DoubleSupplier getter, Consumer<Double> setter, String format) {
		Component label = Component.translatable("config.deepwinter." + key);
		double initial = (getter.getAsDouble() - min) / (max - min);
		addRenderableWidget(new AbstractSliderButton(x(), y(), 150, 20, Component.empty(), Math.max(0, Math.min(1, initial))) {
			{
				updateMessage();
			}

			private double actual() {
				double v = min + value * (max - min);
				return Math.round(v / step) * step;
			}

			@Override
			protected void updateMessage() {
				double v = actual();
				String text = format.equals("percent") ? Math.round(v * 100) + "%" : String.format(format, v);
				setMessage(Component.empty().append(label).append(": " + text));
			}

			@Override
			protected void applyValue() {
				setter.accept(actual());
			}
		});
		index++;
	}

	@Override
	public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float a) {
		super.extractRenderState(graphics, mouseX, mouseY, a);
		graphics.centeredText(font, title, width / 2, 12, 0xFFFFFFFF);
	}

	@Override
	public void onClose() {
		DeepWinterConfig.get().clamp();
		DeepWinterConfig.save();
		minecraft.gui.setScreen(parent);
	}
}
