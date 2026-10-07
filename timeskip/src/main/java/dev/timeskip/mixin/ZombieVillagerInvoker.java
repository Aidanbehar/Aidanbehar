package dev.timeskip.mixin;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.monster.zombie.ZombieVillager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

@Mixin(ZombieVillager.class)
public interface ZombieVillagerInvoker {
    @Invoker("finishConversion")
    void timeskip$finishConversion(ServerLevel level);
}
