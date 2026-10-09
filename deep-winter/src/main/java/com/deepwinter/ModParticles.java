package com.deepwinter;

import net.fabricmc.fabric.api.particle.v1.FabricParticleTypes;
import net.minecraft.core.Registry;
import net.minecraft.core.particles.SimpleParticleType;
import net.minecraft.core.registries.BuiltInRegistries;

public final class ModParticles {
	/** Wind-driven storm snow (client-only visuals). */
	public static final SimpleParticleType STORM_SNOW = Registry.register(
		BuiltInRegistries.PARTICLE_TYPE, DeepWinter.id("storm_snow"), FabricParticleTypes.simple(true));

	private ModParticles() {
	}

	public static void init() {
	}
}
