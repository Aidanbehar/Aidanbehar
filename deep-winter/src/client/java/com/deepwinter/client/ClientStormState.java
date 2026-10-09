package com.deepwinter.client;

import com.deepwinter.ModParticles;
import com.deepwinter.config.DeepWinterConfig;
import com.deepwinter.network.StormSyncPayload;
import com.deepwinter.storm.StormFlags;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.BlockPos;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * Client copy of the storm state plus the derived visuals: a smoothed storm intensity, how exposed the
 * camera is (for fog and darkness), the wind, and the blowing snow particles.
 */
public final class ClientStormState {
	private static boolean active;
	private static float intensity;
	private static float prevIntensity;
	/** 0 indoors / outside the storm, 1 outdoors in the storm. */
	private static float exposure;
	private static float prevExposure;
	private static float windAngle = (float) (Math.PI / 4);

	private ClientStormState() {
	}

	public static void apply(StormSyncPayload payload) {
		active = payload.active();
		StormFlags.active = payload.active();
		StormFlags.forced = payload.forced();
	}

	public static void reset() {
		active = false;
		intensity = prevIntensity = exposure = prevExposure = 0;
		StormFlags.reset();
	}

	public static boolean isActive() {
		return active;
	}

	public static float intensity(float partialTick) {
		return Mth.lerp(partialTick, prevIntensity, intensity);
	}

	/** Storm strength as felt at the camera: drives fog and darkness. */
	public static float exposure(float partialTick) {
		return Mth.lerp(partialTick, prevExposure, exposure);
	}

	public static void tick(Minecraft client) {
		prevIntensity = intensity;
		prevExposure = exposure;
		ClientLevel level = client.level;
		LocalPlayer player = client.player;
		if (level == null || player == null) {
			intensity = exposure = 0;
			return;
		}
		float target = active ? level.getRainLevel(1.0F) : 0.0F;
		intensity = Mth.approach(intensity, target, 0.005F);

		BlockPos eye = BlockPos.containing(player.getEyePosition());
		boolean stormHere = StormFlags.appliesTo(level.getBiome(eye).value());
		boolean outside = level.canSeeSky(eye);
		float targetExposure = stormHere ? intensity * (outside ? 1.0F : 0.12F) : 0.0F;
		exposure = Mth.approach(exposure, targetExposure, 0.02F);

		// Wind direction wanders slowly.
		windAngle += (float) (Math.sin(level.getGameTime() / 900.0) * 0.002);
		if (intensity > 0.01F && stormHere) {
			spawnParticles(client, level, player);
		}
	}

	private static void spawnParticles(Minecraft client, ClientLevel level, LocalPlayer player) {
		DeepWinterConfig cfg = DeepWinterConfig.get();
		int count = (int) Math.min(cfg.maxStormParticlesPerTick, cfg.maxStormParticlesPerTick * cfg.stormParticleDensity * intensity);
		if (count <= 0) {
			return;
		}
		RandomSource random = level.getRandom();
		float gust = 0.55F + 0.25F * (float) Math.sin(level.getGameTime() / 37.0);
		double windX = Math.cos(windAngle) * gust;
		double windZ = Math.sin(windAngle) * gust;
		BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
		int spawned = 0;
		for (int i = 0; i < count * 2 && spawned < count; i++) {
			// Spawn upwind so the flakes blow across the view.
			double dx = random.nextGaussian() * 9.0 - windX * 10;
			double dz = random.nextGaussian() * 9.0 - windZ * 10;
			double dy = random.nextDouble() * 12.0 - 3.0;
			double x = player.getX() + dx;
			double y = player.getY() + dy;
			double z = player.getZ() + dz;
			pos.set(x, y, z);
			if (!level.hasChunkAt(pos)) {
				continue;
			}
			// Only in exposed air: never under roofs or inside buildings.
			if (level.getHeight(Heightmap.Types.MOTION_BLOCKING, pos.getX(), pos.getZ()) > y || !level.getBlockState(pos).isAir()) {
				continue;
			}
			double speed = 0.8 + random.nextDouble() * 0.5;
			level.addParticle(ModParticles.STORM_SNOW, x, y, z,
				windX * speed + random.nextGaussian() * 0.04,
				-0.06 - random.nextDouble() * 0.08,
				windZ * speed + random.nextGaussian() * 0.04);
			spawned++;
		}
	}
}
