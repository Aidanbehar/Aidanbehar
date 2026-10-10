package dev.aidanbehar.nuclearstation.block;

import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;

/**
 * Personnel decontamination station. With an empty hand it washes skin and clothing
 * contamination off the user; with an item in hand it scrubs that item stack.
 */
public class DeconShowerBlock extends FacingBlock {
	public DeconShowerBlock(BlockBehaviour.Properties properties) {
		super(properties);
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (player instanceof ServerPlayer serverPlayer && level instanceof ServerLevel server) {
			RadiationManager.decontaminatePlayer(serverPlayer, 0.85f);
			server.sendParticles(ParticleTypes.SPLASH, player.getX(), player.getY() + 1.8, player.getZ(), 40, 0.3, 0.4, 0.3, 0.1);
			level.playSound(null, pos, SoundEvents.WEATHER_RAIN, SoundSource.BLOCKS, 0.8f, 1.4f);
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos, Player player,
			InteractionHand hand, BlockHitResult hit) {
		if (stack.isEmpty()) {
			return InteractionResult.TRY_WITH_EMPTY_HAND;
		}
		if (player instanceof ServerPlayer serverPlayer) {
			RadiationManager.decontaminateItem(serverPlayer, stack);
			level.playSound(null, pos, SoundEvents.WEATHER_RAIN, SoundSource.BLOCKS, 0.6f, 1.6f);
		}
		return InteractionResult.SUCCESS;
	}
}
