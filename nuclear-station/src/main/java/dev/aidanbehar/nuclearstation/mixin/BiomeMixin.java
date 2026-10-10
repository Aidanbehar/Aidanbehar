package dev.aidanbehar.nuclearstation.mixin;

import dev.aidanbehar.nuclearstation.facility.StationArea;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.biome.Biome;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Station water (pools, basins, intake, outfall) is warm plant water and never freezes. */
@Mixin(Biome.class)
public abstract class BiomeMixin {
	@Inject(method = "shouldFreeze(Lnet/minecraft/world/level/LevelReader;Lnet/minecraft/core/BlockPos;Z)Z", at = @At("HEAD"), cancellable = true)
	private void nuclearstation$noFreezeInStation(LevelReader level, BlockPos pos, boolean checkNeighbors, CallbackInfoReturnable<Boolean> cir) {
		if (StationArea.contains(level, pos)) {
			cir.setReturnValue(false);
		}
	}
}
