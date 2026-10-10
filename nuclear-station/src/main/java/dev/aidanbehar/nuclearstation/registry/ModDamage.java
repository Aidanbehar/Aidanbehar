package dev.aidanbehar.nuclearstation.registry;

import dev.aidanbehar.nuclearstation.NuclearStation;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.damagesource.DamageType;

/** Damage types defined in data/nuclearstation/damage_type. */
public final class ModDamage {
	public static final ResourceKey<DamageType> RADIATION = ResourceKey.create(Registries.DAMAGE_TYPE, NuclearStation.id("radiation_sickness"));

	private ModDamage() {
	}

	public static DamageSource radiation(ServerLevel level) {
		return new DamageSource(level.registryAccess().lookupOrThrow(Registries.DAMAGE_TYPE).getOrThrow(RADIATION));
	}
}
