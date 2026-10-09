package com.deepwinter.mixin;

import com.deepwinter.storm.StormFlags;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.biome.Biome;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** During a snowstorm, precipitation in affected biomes falls as snow (both for rendering and for gameplay). */
@Mixin(Biome.class)
public abstract class BiomeMixin {
	@Inject(method = "getPrecipitationAt", at = @At("HEAD"), cancellable = true)
	private void deepwinter$stormSnow(BlockPos pos, int seaLevel, CallbackInfoReturnable<Biome.Precipitation> cir) {
		if (StormFlags.appliesTo((Biome) (Object) this)) {
			cir.setReturnValue(Biome.Precipitation.SNOW);
		}
	}
}
