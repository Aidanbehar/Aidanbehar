package com.deepwinter.mixin;

import com.deepwinter.temperature.BodyTemperature;
import com.llamalad7.mixinextras.injector.ModifyExpressionValue;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(LivingEntity.class)
public abstract class LivingEntityMixin {
	@Inject(method = "tick", at = @At("TAIL"))
	private void deepwinter$tickTemperature(CallbackInfo ci) {
		BodyTemperature.tick((LivingEntity) (Object) this);
	}

	/**
	 * Vanilla only hurts frozen entities that "can freeze" (no leather worn). Cold exposure is already
	 * reduced by insulation in our model, so an entity that is freezing from the cold takes the damage.
	 */
	@ModifyExpressionValue(method = "aiStep", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/entity/LivingEntity;canFreeze()Z"))
	private boolean deepwinter$coldFreezes(boolean original) {
		return original || BodyTemperature.isFreezing((LivingEntity) (Object) this);
	}
}
