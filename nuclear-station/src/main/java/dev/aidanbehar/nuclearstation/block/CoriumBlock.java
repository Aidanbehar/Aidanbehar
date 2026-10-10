package dev.aidanbehar.nuclearstation.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Solidified molten core material: lava-like, fiercely radioactive and still generating
 * decay heat. Burns anything that touches it.
 */
public class CoriumBlock extends RadioactiveBlock {
	public CoriumBlock(BlockBehaviour.Properties properties, float strength) {
		super(properties, strength);
	}

	@Override
	public void stepOn(Level level, BlockPos pos, BlockState state, Entity entity) {
		if (level instanceof ServerLevel server && entity instanceof LivingEntity living && !living.fireImmune()) {
			living.hurtServer(server, level.damageSources().hotFloor(), 4.0f);
			living.igniteForSeconds(4);
		}
		super.stepOn(level, pos, state, entity);
	}

	@Override
	public void animateTick(BlockState state, Level level, BlockPos pos, RandomSource random) {
		if (random.nextInt(4) == 0 && level.getBlockState(pos.above()).isAir()) {
			level.addParticle(ParticleTypes.LARGE_SMOKE, pos.getX() + random.nextDouble(), pos.getY() + 1.05, pos.getZ() + random.nextDouble(), 0, 0.03, 0);
		}
		if (random.nextInt(12) == 0) {
			level.addParticle(ParticleTypes.LAVA, pos.getX() + random.nextDouble(), pos.getY() + 1.0, pos.getZ() + random.nextDouble(), 0, 0, 0);
		}
	}
}
