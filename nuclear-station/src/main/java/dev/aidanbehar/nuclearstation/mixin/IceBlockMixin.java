package dev.aidanbehar.nuclearstation.mixin;

import dev.aidanbehar.nuclearstation.facility.StationArea;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.IceBlock;
import net.minecraft.world.level.block.state.BlockState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Ice that formed in station water before freezing was prevented melts back. */
@Mixin(IceBlock.class)
public abstract class IceBlockMixin {
	@Shadow
	protected abstract void melt(BlockState state, net.minecraft.world.level.Level level, BlockPos pos);

	@Inject(method = "randomTick", at = @At("HEAD"), cancellable = true)
	private void nuclearstation$meltInStation(BlockState state, ServerLevel level, BlockPos pos, RandomSource random, CallbackInfo ci) {
		if (StationArea.contains(level, pos)) {
			melt(state, level, pos);
			ci.cancel();
		}
	}
}
