package com.deepwinter.block;

import com.deepwinter.DeepWinter;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.minecraft.world.level.material.PushReaction;

public final class ModBlocks {
	public static final Block SETTLED_SNOW = Blocks.register(
		ResourceKey.create(Registries.BLOCK, DeepWinter.id("settled_snow")),
		SettledSnowBlock::new,
		BlockBehaviour.Properties.of()
			.mapColor(MapColor.SNOW)
			.forceSolidOff()
			.randomTicks()
			.strength(0.1F)
			.requiresCorrectToolForDrops()
			.sound(SoundType.SNOW)
			.noOcclusion()
			.pushReaction(PushReaction.POPPED)
	);

	private ModBlocks() {
	}

	public static void init() {
	}
}
