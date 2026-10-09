package com.deepwinter.client;

import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.ParticleProvider;
import net.minecraft.client.particle.SingleQuadParticle;
import net.minecraft.client.particle.SpriteSet;
import net.minecraft.core.particles.SimpleParticleType;
import net.minecraft.util.RandomSource;

/** A snow speck carried sideways by the wind; it keeps its speed and vanishes when it hits something. */
public class StormSnowParticle extends SingleQuadParticle {
	protected StormSnowParticle(ClientLevel level, double x, double y, double z, double xd, double yd, double zd, SpriteSet sprites) {
		super(level, x, y, z, sprites.get(level.getRandom()));
		this.xd = xd;
		this.yd = yd;
		this.zd = zd;
		this.friction = 1.0F;
		this.gravity = 0.0F;
		this.hasPhysics = true;
		this.quadSize = 0.06F + this.random.nextFloat() * 0.06F;
		this.lifetime = 30 + this.random.nextInt(25);
		float shade = 0.92F + this.random.nextFloat() * 0.08F;
		this.setColor(shade, shade, Math.min(1.0F, shade + 0.04F));
		this.setAlpha(0.85F);
	}

	@Override
	public SingleQuadParticle.Layer getLayer() {
		return SingleQuadParticle.Layer.TRANSLUCENT;
	}

	@Override
	public void tick() {
		double oldX = this.xd;
		double oldZ = this.zd;
		super.tick();
		// Hitting a wall or the ground ends the flake.
		if (this.onGround || Math.abs(this.xd - oldX) > 1.0E-4 || Math.abs(this.zd - oldZ) > 1.0E-4) {
			this.remove();
		}
		if (this.age > this.lifetime - 8) {
			this.setAlpha(0.85F * (this.lifetime - this.age) / 8.0F);
		}
	}

	public static class Provider implements ParticleProvider<SimpleParticleType> {
		private final SpriteSet sprites;

		public Provider(SpriteSet sprites) {
			this.sprites = sprites;
		}

		@Override
		public Particle createParticle(SimpleParticleType options, ClientLevel level, double x, double y, double z,
									   double xd, double yd, double zd, RandomSource random) {
			return new StormSnowParticle(level, x, y, z, xd, yd, zd, sprites);
		}
	}
}
