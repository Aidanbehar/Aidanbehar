package com.deepwinter.client.mixin;

import com.deepwinter.client.ClientStormState;
import net.minecraft.world.level.Level;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Client-only: a snowstorm darkens the sky and world light the way a thunderstorm does. Capped below
 * vanilla's 0.9 "is thundering" threshold so nothing else treats it as a thunderstorm.
 */
@Mixin(Level.class)
public abstract class LevelMixin {
	@Inject(method = "getThunderLevel", at = @At("RETURN"), cancellable = true)
	private void deepwinter$stormDarkness(float partialTick, CallbackInfoReturnable<Float> cir) {
		Level self = (Level) (Object) this;
		if (!self.isClientSide()) {
			return;
		}
		float storm = ClientStormState.intensity(partialTick) * 0.85F;
		if (storm > cir.getReturnValueF()) {
			cir.setReturnValue(storm);
		}
	}
}
