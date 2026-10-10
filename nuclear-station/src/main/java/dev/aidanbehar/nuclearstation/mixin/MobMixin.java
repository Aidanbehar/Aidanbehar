package dev.aidanbehar.nuclearstation.mixin;

import dev.aidanbehar.nuclearstation.facility.StationArea;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.level.LevelAccessor;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * No natural, world-generation, reinforcement or event spawns anywhere in the station
 * footprint. Spawn eggs, spawners, commands and breeding are unaffected.
 */
@Mixin(Mob.class)
public abstract class MobMixin {
	@Inject(method = "checkSpawnRules", at = @At("HEAD"), cancellable = true)
	private void nuclearstation$noNaturalSpawnsInStation(LevelAccessor level, EntitySpawnReason reason, CallbackInfoReturnable<Boolean> cir) {
		if (blocked(reason)) {
			Mob self = (Mob) (Object) this;
			if (StationArea.contains(level, self.getBlockX(), self.getBlockZ())) {
				cir.setReturnValue(false);
			}
		}
	}

	private static boolean blocked(EntitySpawnReason reason) {
		return switch (reason) {
			case NATURAL, CHUNK_GENERATION, STRUCTURE, REINFORCEMENT, EVENT, PATROL, JOCKEY -> true;
			default -> false;
		};
	}
}
