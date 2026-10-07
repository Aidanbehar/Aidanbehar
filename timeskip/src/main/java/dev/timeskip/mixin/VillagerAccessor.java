package dev.timeskip.mixin;

import net.minecraft.world.entity.ai.gossip.GossipContainer;
import net.minecraft.world.entity.npc.villager.Villager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(Villager.class)
public interface VillagerAccessor {
    @Accessor("gossips")
    GossipContainer timeskip$getGossips();
}
