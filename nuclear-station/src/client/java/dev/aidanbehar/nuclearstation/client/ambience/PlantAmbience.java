package dev.aidanbehar.nuclearstation.client.ambience;

import dev.aidanbehar.nuclearstation.client.ClientPlantState;
import dev.aidanbehar.nuclearstation.client.hud.RadiationHud;
import dev.aidanbehar.nuclearstation.facility.layout.SiteLayout;
import dev.aidanbehar.nuclearstation.network.Payloads;
import dev.aidanbehar.nuclearstation.registry.ModSounds;
import java.util.ArrayList;
import java.util.List;
import java.util.function.ToDoubleFunction;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.resources.sounds.AbstractTickableSoundInstance;
import net.minecraft.client.resources.sounds.SoundInstance;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.phys.Vec3;

/**
 * Client soundscape and visual plant state. All of it is driven by the compact status the
 * server sends to players near the site: the turbine hum follows turbine speed, the pumps
 * follow circulating-water flow, diesels only run when they actually run, alarms sound in
 * the buildings when the horn is active, towers only plume when they reject heat and the
 * atmospheric relief stacks only roar when they relieve steam.
 */
public final class PlantAmbience {
	/** One fixed-position plant noise source. Local coordinates relative to the site origin. */
	private record Source(SoundEvent sound, double lx, double ly, double lz, double range, ToDoubleFunction<Payloads.Status> level,
			ToDoubleFunction<Payloads.Status> pitch) {
	}

	private static final List<Source> SOURCES = new ArrayList<>();
	private static final List<Loop> PLAYING = new ArrayList<>();
	private static int ticks;

	static {
		ToDoubleFunction<Payloads.Status> one = s -> 1.0;
		ToDoubleFunction<Payloads.Status> lit = s -> s.flag(Payloads.Status.F_LIGHTING) ? 1 : 0;
		// turbine hall: the machine hum scales with speed and pitch follows rpm
		for (int x = SiteLayout.TH_X0 + 40; x < SiteLayout.TH_X1; x += 80) {
			SOURCES.add(new Source(ModSounds.TURBINE_HUM, x, 12, SiteLayout.TH_AXIS_Z, 90, s -> Math.min(1, s.turbineRpm() / 1800.0),
				s -> 0.5 + 0.5 * Math.min(1.1, s.turbineRpm() / 1800.0)));
		}
		// circulating water pump house
		SOURCES.add(new Source(ModSounds.PUMP_HUM, (SiteLayout.CWPH_X0 + SiteLayout.CWPH_X1) / 2.0, 4, (SiteLayout.CWPH_Z0 + SiteLayout.CWPH_Z1) / 2.0,
			70, s -> Math.min(1, s.cwFlow() / 100.0), one));
		// reactor coolant pumps can be heard faintly through the auxiliary building
		SOURCES.add(new Source(ModSounds.PUMP_HUM, (SiteLayout.AUX_X0 + SiteLayout.AUX_X1) / 2.0, 6, (SiteLayout.AUX_Z0 + SiteLayout.AUX_Z1) / 2.0,
			50, s -> s.power() > 0.001 || !s.flag(Payloads.Status.F_TRIPPED) ? 0.6 : 0.3, s -> 0.8));
		// transformers in the switchyard and the main transformer bank
		SOURCES.add(new Source(ModSounds.TRANSFORMER_HUM, (SiteLayout.GSU_X0 + SiteLayout.GSU_X1) / 2.0, 4, (SiteLayout.GSU_Z0 + SiteLayout.GSU_Z1) / 2.0,
			60, s -> Math.min(1, 0.2 + s.power()), one));
		SOURCES.add(new Source(ModSounds.TRANSFORMER_HUM, (SiteLayout.SY_X0 + SiteLayout.SY_X1) / 2.0, 4, (SiteLayout.SY_Z0 + SiteLayout.SY_Z1) / 2.0,
			90, lit, one));
		// HVAC in the main buildings, dead when the station is blacked out
		SOURCES.add(new Source(ModSounds.VENTILATION, (SiteLayout.CB_X0 + SiteLayout.CB_X1) / 2.0, 8, (SiteLayout.CB_Z0 + SiteLayout.CB_Z1) / 2.0, 50, lit, one));
		SOURCES.add(new Source(ModSounds.VENTILATION, (SiteLayout.AUX_X0 + SiteLayout.AUX_X1) / 2.0, 14, (SiteLayout.AUX_Z0 + SiteLayout.AUX_Z1) / 2.0, 50, lit, one));
		// emergency diesels
		SOURCES.add(new Source(ModSounds.DIESEL_ENGINE, (SiteLayout.EDGA_X0 + SiteLayout.EDGA_X1) / 2.0, 4, (SiteLayout.EDGA_Z0 + SiteLayout.EDGA_Z1) / 2.0,
			80, s -> s.flag(Payloads.Status.F_EDG_A) ? 1 : 0, one));
		SOURCES.add(new Source(ModSounds.DIESEL_ENGINE, (SiteLayout.EDGB_X0 + SiteLayout.EDGB_X1) / 2.0, 4, (SiteLayout.EDGB_Z0 + SiteLayout.EDGB_Z1) / 2.0,
			80, s -> s.flag(Payloads.Status.F_EDG_B) ? 1 : 0, one));
		// cooling towers: falling water rain zone noise
		for (int[] t : SiteLayout.TOWERS) {
			SOURCES.add(new Source(ModSounds.COOLING_TOWER, t[0], 6, t[1], 110, s -> s.flag(Payloads.Status.F_TOWERS) ? Math.min(1, 0.3 + s.towerHeat() / 800.0) : 0, one));
		}
		// atmospheric relief roar at the main steam valve house
		SOURCES.add(new Source(ModSounds.STEAM_RELEASE, SiteLayout.CONT_X, 36, SiteLayout.MSIV_Z0 + 6, 220, s -> Math.min(1, s.steamVent() / 40.0), one));
		// control room and turbine hall alarm horns
		SOURCES.add(new Source(ModSounds.ALARM_HORN, (SiteLayout.CB_X0 + SiteLayout.CB_X1) / 2.0, 8, (SiteLayout.CB_Z0 + SiteLayout.CB_Z1) / 2.0, 40,
			s -> s.flag(Payloads.Status.F_HORN) ? 0.8 : 0, one));
		SOURCES.add(new Source(ModSounds.ALARM_HORN, (SiteLayout.TH_X0 + SiteLayout.TH_X1) / 2.0, 10, SiteLayout.TH_AXIS_Z, 90,
			s -> s.flag(Payloads.Status.F_HORN) && s.alarmPriority() == 1 ? 0.6 : 0, one));
		// site emergency siren on core damage or an off-site release
		SOURCES.add(new Source(ModSounds.ALARM_SIREN, (SiteLayout.ADMIN_X0 + SiteLayout.ADMIN_X1) / 2.0, 30, (SiteLayout.ADMIN_Z0 + SiteLayout.ADMIN_Z1) / 2.0,
			500, s -> s.flag(Payloads.Status.F_RELEASE) || s.flag(Payloads.Status.F_CORE_DAMAGE) ? 1 : 0, one));
	}

	private PlantAmbience() {
	}

	/** Looping sound whose volume follows plant state and distance; stops itself when silent. */
	private static final class Loop extends AbstractTickableSoundInstance {
		final Source source;
		final Vec3 pos;
		private int silentTicks;

		Loop(Source source, Vec3 pos, RandomSource random) {
			super(source.sound, SoundSource.AMBIENT, random);
			this.source = source;
			this.pos = pos;
			this.x = pos.x;
			this.y = pos.y;
			this.z = pos.z;
			this.looping = true;
			this.delay = 0;
			this.attenuation = SoundInstance.Attenuation.NONE;
			this.volume = 0.01f;
		}

		@Override
		public boolean canStartSilent() {
			return true;
		}

		@Override
		public void tick() {
			Minecraft mc = Minecraft.getInstance();
			Payloads.Status s = ClientPlantState.status;
			if (mc.player == null || s == null || !ClientPlantState.statusFresh()) {
				stop();
				return;
			}
			double target = targetVolume(source, pos, mc.player.position(), s);
			volume = (float) (volume + (target - volume) * 0.1);
			pitch = (float) source.pitch.applyAsDouble(s);
			if (target < 0.005 && volume < 0.01) {
				if (++silentTicks > 40) {
					stop();
				}
			} else {
				silentTicks = 0;
			}
		}

		void halt() {
			stop();
		}
	}

	private static double targetVolume(Source src, Vec3 pos, Vec3 listener, Payloads.Status s) {
		double d = listener.distanceTo(pos);
		if (d > src.range) {
			return 0;
		}
		double fall = 1 - d / src.range;
		return Math.max(0, Math.min(1, src.level.applyAsDouble(s))) * fall * fall;
	}

	private static Vec3 world(Payloads.Status s, double lx, double ly, double lz) {
		return new Vec3(s.originX() + lx, s.grade() + ly, s.originZ() + lz);
	}

	public static void tick(Minecraft mc) {
		RadiationHud.tick(mc);
		ClientLevel level = mc.level;
		if (level == null || mc.player == null) {
			PLAYING.clear();
			return;
		}
		ticks++;
		Payloads.Status s = ClientPlantState.status;
		if (s == null || !ClientPlantState.statusFresh()) {
			return;
		}
		Vec3 me = mc.player.position();
		PLAYING.removeIf(l -> l.isStopped() || !mc.getSoundManager().isActive(l) && ticks % 20 == 0);
		if (ticks % 10 == 0) {
			for (Source src : SOURCES) {
				Vec3 pos = world(s, src.lx, src.ly, src.lz);
				if (targetVolume(src, pos, me, s) < 0.01) {
					continue;
				}
				boolean already = false;
				for (Loop l : PLAYING) {
					if (l.source == src) {
						already = true;
						break;
					}
				}
				if (!already) {
					Loop loop = new Loop(src, pos, level.getRandom());
					PLAYING.add(loop);
					mc.getSoundManager().play(loop);
				}
			}
		}
		particles(level, s, me);
	}

	private static void particles(ClientLevel level, Payloads.Status s, Vec3 me) {
		RandomSource r = level.getRandom();
		// cooling tower plumes, visible from far away
		if (s.flag(Payloads.Status.F_TOWERS) && s.towerHeat() > 1) {
			double intensity = Math.min(1, s.towerHeat() / 900.0);
			for (int[] t : SiteLayout.TOWERS) {
				Vec3 top = world(s, t[0], SiteLayout.TOWER_HEIGHT, t[1]);
				if (top.distanceToSqr(me) > 600 * 600 || r.nextDouble() > intensity) {
					continue;
				}
				for (int i = 0; i < 2; i++) {
					double a = r.nextDouble() * Math.PI * 2;
					double rr = r.nextDouble() * 26;
					level.addAlwaysVisibleParticle(ParticleTypes.CAMPFIRE_SIGNAL_SMOKE, true, top.x + Math.cos(a) * rr, top.y - 2, top.z + Math.sin(a) * rr,
						0.02, 0.12 + r.nextDouble() * 0.05, 0.02);
				}
			}
		}
		// atmospheric relief valve steam
		if (s.steamVent() > 1) {
			for (int sx : new int[] {SiteLayout.CONT_X - 22, SiteLayout.CONT_X + 22}) {
				for (int dx : new int[] {-3, 3}) {
					Vec3 stack = world(s, sx + dx + 0.5, 38, SiteLayout.MSIV_Z0 + 6.5);
					if (stack.distanceToSqr(me) > 300 * 300) {
						continue;
					}
					int n = (int) Math.min(6, 1 + s.steamVent() / 15);
					for (int i = 0; i < n; i++) {
						level.addAlwaysVisibleParticle(ParticleTypes.CLOUD, true, stack.x, stack.y, stack.z,
							(r.nextDouble() - 0.5) * 0.2, 0.5 + r.nextDouble() * 0.4, (r.nextDouble() - 0.5) * 0.2);
					}
				}
			}
		}
		// warm water boil at the discharge outfall
		if (s.cwFlow() > 5) {
			Vec3 outfall = world(s, (SiteLayout.DIS_X0 + SiteLayout.DIS_X1) / 2.0 + (r.nextDouble() - 0.5) * 40, 0.1, 900 + r.nextDouble() * 20);
			outfall = new Vec3(outfall.x, s.sea() + 0.1, outfall.z);
			if (outfall.distanceToSqr(me) < 200 * 200 && r.nextInt(3) == 0) {
				level.addParticle(ParticleTypes.BUBBLE_POP, outfall.x, outfall.y, outfall.z, 0, 0.05, 0);
				level.addParticle(ParticleTypes.WHITE_SMOKE, outfall.x, outfall.y + 0.2, outfall.z, 0, 0.02, 0);
			}
		}
		// radioactive release: dark plume above containment
		if (s.flag(Payloads.Status.F_RELEASE) || s.flag(Payloads.Status.F_BREACH)) {
			Vec3 dome = world(s, SiteLayout.CONT_X, 80, SiteLayout.CONT_Z);
			if (dome.distanceToSqr(me) < 500 * 500) {
				level.addAlwaysVisibleParticle(ParticleTypes.LARGE_SMOKE, true, dome.x + (r.nextDouble() - 0.5) * 20, dome.y, dome.z + (r.nextDouble() - 0.5) * 20,
					0.05, 0.15, 0.02);
			}
		}
		// spent fuel pool boiling
		if (s.flag(Payloads.Status.F_SFP_BOILING)) {
			Vec3 pool = world(s, (SiteLayout.FUEL_X0 + SiteLayout.FUEL_X1) / 2.0, 40, (SiteLayout.FUEL_Z0 + SiteLayout.FUEL_Z1) / 2.0);
			if (pool.distanceToSqr(me) < 300 * 300) {
				level.addAlwaysVisibleParticle(ParticleTypes.CLOUD, true, pool.x, pool.y, pool.z, 0, 0.3, 0);
			}
		}
	}
}
