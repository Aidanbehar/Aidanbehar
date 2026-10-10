package dev.aidanbehar.nuclearstation.mixin;

import com.llamalad7.mixinextras.injector.WrapWithCondition;
import dev.aidanbehar.nuclearstation.facility.StationArea;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.levelgen.PhantomSpawner;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;

/** Phantoms never appear inside the station footprint. */
@Mixin(PhantomSpawner.class)
public abstract class PhantomSpawnerMixin {
	@WrapWithCondition(method = "tick", at = @At(value = "INVOKE",
		target = "Lnet/minecraft/server/level/ServerLevel;addFreshEntityWithPassengers(Lnet/minecraft/world/entity/Entity;)V"))
	private boolean nuclearstation$notInStation(ServerLevel level, Entity entity) {
		return !StationArea.contains(level, entity.getBlockX(), entity.getBlockZ());
	}
}
