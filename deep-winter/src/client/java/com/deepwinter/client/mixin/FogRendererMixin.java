package com.deepwinter.client.mixin;

import com.deepwinter.client.ClientStormState;
import net.minecraft.client.Camera;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.renderer.fog.FogData;
import net.minecraft.client.renderer.fog.FogRenderer;
import net.minecraft.util.Mth;
import net.minecraft.world.level.material.FogType;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Heavy, grey-white fog outdoors in a snowstorm. */
@Mixin(FogRenderer.class)
public abstract class FogRendererMixin {
	private static final float STORM_FOG_START = 0.0F;
	private static final float STORM_FOG_END = 22.0F;

	@Inject(method = "setupFog", at = @At("RETURN"))
	private void deepwinter$stormFog(Camera camera, int renderDistanceInChunks, DeltaTracker deltaTracker, float darkenWorldAmount,
									 ClientLevel level, CallbackInfoReturnable<FogData> cir) {
		if (camera.getFluidInCamera() != FogType.NONE) {
			return;
		}
		float f = ClientStormState.exposure(deltaTracker.getGameTimeDeltaPartialTick(false));
		if (f <= 0.001F) {
			return;
		}
		FogData fog = cir.getReturnValue();
		float e = f * f * (3 - 2 * f);
		fog.environmentalStart = Mth.lerp(e, fog.environmentalStart, STORM_FOG_START);
		fog.environmentalEnd = Mth.lerp(e, fog.environmentalEnd, STORM_FOG_END);
		fog.renderDistanceStart = Mth.lerp(e, fog.renderDistanceStart, STORM_FOG_START);
		fog.renderDistanceEnd = Mth.lerp(e, fog.renderDistanceEnd, STORM_FOG_END + 8);
		fog.skyEnd = Mth.lerp(e, fog.skyEnd, STORM_FOG_END);
		fog.cloudEnd = Mth.lerp(e, fog.cloudEnd, STORM_FOG_END);
		// Blend toward a dim blue-grey snow haze that keeps the fog's brightness (so nights stay dark).
		float brightness = Math.max(fog.color.x, Math.max(fog.color.y, fog.color.z));
		float b = Mth.clamp(brightness * 0.85F, 0.03F, 0.62F);
		fog.color.set(Mth.lerp(e, fog.color.x, b * 0.92F), Mth.lerp(e, fog.color.y, b * 0.95F), Mth.lerp(e, fog.color.z, b), 1.0F);
	}
}
