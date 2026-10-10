package dev.aidanbehar.nuclearstation.radiation;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.block.RadiationSource;
import dev.aidanbehar.nuclearstation.config.ModConfig;
import dev.aidanbehar.nuclearstation.network.ModNetwork;
import dev.aidanbehar.nuclearstation.plant.PlantService;
import dev.aidanbehar.nuclearstation.registry.ModAttachments;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import dev.aidanbehar.nuclearstation.registry.ModComponents;
import dev.aidanbehar.nuclearstation.registry.ModDamage;
import dev.aidanbehar.nuclearstation.registry.ModItems;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.WeakHashMap;
import net.fabricmc.fabric.api.entity.event.v1.ServerPlayerEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerChunkEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.event.player.PlayerBlockBreakEvents;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.SectionPos;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.LevelChunk;
import net.minecraft.world.level.chunk.LevelChunkSection;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.phys.Vec3;

/**
 * Radiation exposure and contamination.
 *
 * <h2>Sources</h2>
 * <ul>
 * <li>Radioactive blocks, indexed per 16^3 chunk section. A section is examined only
 * when a dose calculation needs it, and only scanned block by block if its palette
 * contains a radioactive block; results are cached until a radioactive block in it
 * changes or the chunk unloads. No part of the world is scanned every tick.</li>
 * <li>Plant zones: containment atmosphere and fuel building air, from the plant model.</li>
 * <li>Ground contamination from releases ({@link ContaminationData}).</li>
 * <li>Carried radioactive items and the player's own surface contamination.</li>
 * </ul>
 *
 * <h2>Dose</h2>
 * Point sources follow the inverse-square law with exponential attenuation through the
 * blocks between source and player (lead, water and concrete shield strongly).
 * Doses are in microsieverts per hour (uSv/h) and accumulated in millisieverts.
 */
public final class RadiationManager {
	public static final double BACKGROUND = 0.1;
	static final int RANGE = 40;
	static final int UPDATE_TICKS = 10;
	static final double ACUTE_RECOVERY_HALF_LIFE = 1200;
	/** Bq of dose-relevant activity per unit core release fraction, expressed in kBq. */
	static final double RELEASE_KBQ = 1.0e15;
	static final double SOIL_CONVERSION_THRESHOLD = 2.0e5;

	private static final Map<ServerLevel, Long2ObjectOpenHashMap<SectionSources>> INDEX = new WeakHashMap<>();
	private static final Map<BlockState, Float> ATTENUATION = new IdentityHashMap<>();

	private RadiationManager() {
	}

	public record Reading(double doseRate, double external, double internal, double groundContamination) {
	}

	/** Cached radioactive blocks of one section, in world coordinates. */
	static final class SectionSources {
		static final SectionSources EMPTY = new SectionSources(0);
		final int n;
		final float[] x;
		final float[] y;
		final float[] z;
		final float[] s;
		float total;
		float cx;
		float cy;
		float cz;

		SectionSources(int capacity) {
			this.n = capacity;
			x = new float[capacity];
			y = new float[capacity];
			z = new float[capacity];
			s = new float[capacity];
		}
	}

	// ================================================================== registration

	public static void register() {
		ServerTickEvents.END_SERVER_TICK.register(RadiationManager::tick);
		ServerChunkEvents.CHUNK_UNLOAD.register((level, chunk) -> invalidateChunk(level, chunk.getPos().x(), chunk.getPos().z()));
		ServerPlayerEvents.AFTER_RESPAWN.register((oldPlayer, newPlayer, alive) -> {
			if (!alive) {
				data(newPlayer).resetAfterDeath();
			}
		});
		PlayerBlockBreakEvents.AFTER.register((level, player, pos, state, be) -> {
			if (level instanceof ServerLevel server && player instanceof ServerPlayer sp) {
				onBlockBroken(server, sp, pos, state);
			}
		});
	}

	public static PlayerRadiation data(ServerPlayer player) {
		return player.getAttachedOrCreate(ModAttachments.RADIATION);
	}

	// ================================================================== source index

	public static void invalidate(ServerLevel level, BlockPos pos) {
		Long2ObjectOpenHashMap<SectionSources> map = INDEX.get(level);
		if (map != null) {
			map.remove(SectionPos.asLong(pos.getX() >> 4, pos.getY() >> 4, pos.getZ() >> 4));
		}
	}

	public static void invalidateChunk(ServerLevel level, int chunkX, int chunkZ) {
		Long2ObjectOpenHashMap<SectionSources> map = INDEX.get(level);
		if (map != null) {
			for (int sy = level.getMinSectionY(); sy <= level.getMaxSectionY(); sy++) {
				map.remove(SectionPos.asLong(chunkX, sy, chunkZ));
			}
		}
	}

	static SectionSources sources(ServerLevel level, int sx, int sy, int sz) {
		Long2ObjectOpenHashMap<SectionSources> map = INDEX.computeIfAbsent(level, l -> new Long2ObjectOpenHashMap<>());
		long key = SectionPos.asLong(sx, sy, sz);
		SectionSources cached = map.get(key);
		if (cached != null) {
			return cached;
		}
		if (sy < level.getMinSectionY() || sy > level.getMaxSectionY()) {
			return SectionSources.EMPTY;
		}
		LevelChunk chunk = level.getChunkSource().getChunkNow(sx, sz);
		if (chunk == null) {
			return SectionSources.EMPTY; // not cached: computed once the chunk is loaded
		}
		LevelChunkSection section = chunk.getSection(level.getSectionIndexFromSectionY(sy));
		SectionSources result = SectionSources.EMPTY;
		if (!section.hasOnlyAir() && section.getStates().maybeHas(st -> st.getBlock() instanceof RadiationSource)) {
			List<float[]> found = new ArrayList<>();
			BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
			for (int y = 0; y < 16; y++) {
				for (int z = 0; z < 16; z++) {
					for (int x = 0; x < 16; x++) {
						BlockState st = section.getBlockState(x, y, z);
						if (st.getBlock() instanceof RadiationSource src) {
							pos.set((sx << 4) + x, (sy << 4) + y, (sz << 4) + z);
							float strength = src.radiationStrength(level, pos, st);
							if (strength > 0) {
								found.add(new float[] {pos.getX() + 0.5f, pos.getY() + 0.5f, pos.getZ() + 0.5f, strength});
							}
						}
					}
				}
			}
			if (!found.isEmpty()) {
				result = new SectionSources(found.size());
				double tx = 0;
				double ty = 0;
				double tz = 0;
				for (int i = 0; i < found.size(); i++) {
					float[] f = found.get(i);
					result.x[i] = f[0];
					result.y[i] = f[1];
					result.z[i] = f[2];
					result.s[i] = f[3];
					result.total += f[3];
					tx += f[0] * f[3];
					ty += f[1] * f[3];
					tz += f[2] * f[3];
				}
				result.cx = (float) (tx / result.total);
				result.cy = (float) (ty / result.total);
				result.cz = (float) (tz / result.total);
			}
		}
		map.put(key, result);
		return result;
	}

	public static int indexedSections(ServerLevel level) {
		Long2ObjectOpenHashMap<SectionSources> map = INDEX.get(level);
		return map == null ? 0 : map.size();
	}

	// ================================================================== shielding

	static float attenuation(BlockState state) {
		Float cached = ATTENUATION.get(state);
		if (cached != null) {
			return cached;
		}
		float mu;
		if (state.isAir()) {
			mu = 0f;
		} else if (state.is(ModBlocks.LEAD_BLOCK) || state.is(ModBlocks.LEAD_GLASS) || state.is(ModBlocks.WASTE_DRUM)) {
			mu = 6.0f;
		} else if (state.is(ModBlocks.CONTAINMENT_CONCRETE) || state.is(ModBlocks.REINFORCED_CONCRETE) || state.is(ModBlocks.DARK_CONCRETE)
			|| state.is(ModBlocks.CONCRETE_PANEL) || state.is(ModBlocks.EXP_CHAMBER_WALL)) {
			mu = 2.3f;
		} else if (!state.getFluidState().isEmpty() && state.getFluidState().is(net.minecraft.tags.FluidTags.WATER)) {
			mu = 2.5f;
		} else if (state.is(BlockTags.LEAVES) || state.canBeReplaced()) {
			mu = 0.05f;
		} else if (!state.canOcclude()) {
			mu = 0.6f;
		} else if (state.getBlock().getExplosionResistance() >= 6.0f) {
			mu = 3.2f;
		} else {
			mu = 1.7f;
		}
		ATTENUATION.put(state, mu);
		return mu;
	}

	/** Fraction of gamma radiation transmitted along the line between two points. */
	static double transmission(ServerLevel level, double ax, double ay, double az, double bx, double by, double bz) {
		double dx = bx - ax;
		double dy = by - ay;
		double dz = bz - az;
		double len = Math.sqrt(dx * dx + dy * dy + dz * dz);
		if (len < 0.8) {
			return 1;
		}
		double step = 0.5;
		int steps = (int) (len / step);
		double sum = 0;
		BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
		int lastX = Integer.MIN_VALUE;
		int lastY = 0;
		int lastZ = 0;
		float lastMu = 0;
		for (int i = 1; i < steps; i++) {
			double t = i * step / len;
			int x = (int) Math.floor(ax + dx * t);
			int y = (int) Math.floor(ay + dy * t);
			int z = (int) Math.floor(az + dz * t);
			if (x != lastX || y != lastY || z != lastZ) {
				pos.set(x, y, z);
				lastMu = attenuation(level.getBlockState(pos));
				lastX = x;
				lastY = y;
				lastZ = z;
			}
			sum += lastMu * step;
			if (sum > 40) {
				return 0;
			}
		}
		return Math.exp(-sum);
	}

	// ================================================================== dose rate

	/** External gamma dose rate from radioactive blocks around a point, uSv/h. */
	public static double blockDoseRate(ServerLevel level, double px, double py, double pz) {
		int sx0 = ((int) Math.floor(px) - RANGE) >> 4;
		int sx1 = ((int) Math.floor(px) + RANGE) >> 4;
		int sy0 = ((int) Math.floor(py) - RANGE) >> 4;
		int sy1 = ((int) Math.floor(py) + RANGE) >> 4;
		int sz0 = ((int) Math.floor(pz) - RANGE) >> 4;
		int sz1 = ((int) Math.floor(pz) + RANGE) >> 4;
		double rate = 0;
		int individualRays = 0;
		for (int sx = sx0; sx <= sx1; sx++) {
			for (int sz = sz0; sz <= sz1; sz++) {
				if (level.getChunkSource().getChunkNow(sx, sz) == null) {
					continue;
				}
				for (int sy = sy0; sy <= sy1; sy++) {
					SectionSources src = sources(level, sx, sy, sz);
					if (src.n == 0) {
						continue;
					}
					double cdx = src.cx - px;
					double cdy = src.cy - py;
					double cdz = src.cz - pz;
					double cd2 = cdx * cdx + cdy * cdy + cdz * cdz;
					if (cd2 > 22 * 22 || individualRays > 160) {
						double unshielded = src.total / Math.max(cd2, 0.25);
						if (unshielded < 0.01) {
							continue;
						}
						rate += unshielded * transmission(level, px, py, pz, src.cx, src.cy, src.cz);
						continue;
					}
					for (int i = 0; i < src.n; i++) {
						double dx = src.x[i] - px;
						double dy = src.y[i] - py;
						double dz = src.z[i] - pz;
						double d2 = Math.max(dx * dx + dy * dy + dz * dz, 0.25);
						double unshielded = src.s[i] / d2;
						if (unshielded < 0.005) {
							continue;
						}
						individualRays++;
						rate += unshielded * transmission(level, px, py, pz, src.x[i], src.y[i], src.z[i]);
					}
				}
			}
		}
		return rate;
	}

	private static boolean outdoors(ServerLevel level, BlockPos pos) {
		return level.canSeeSky(pos.above());
	}

	public static Reading measure(ServerLevel level, ServerPlayer player) {
		return compute(level, player, protection(player));
	}

	record Protection(double gamma, double contamination, double internal) {
	}

	static Protection protection(Player player) {
		ItemStack head = player.getItemBySlot(EquipmentSlot.HEAD);
		ItemStack chest = player.getItemBySlot(EquipmentSlot.CHEST);
		ItemStack legs = player.getItemBySlot(EquipmentSlot.LEGS);
		ItemStack feet = player.getItemBySlot(EquipmentSlot.FEET);
		int suit = (head.is(ModItems.HAZMAT_HOOD) ? 1 : 0) + (chest.is(ModItems.HAZMAT_SUIT) ? 1 : 0)
			+ (legs.is(ModItems.HAZMAT_TROUSERS) ? 1 : 0) + (feet.is(ModItems.HAZMAT_BOOTS) ? 1 : 0);
		double contamination = suit == 4 ? 0.02 : 1 - 0.22 * suit;
		double internal = head.is(ModItems.RESPIRATOR) ? 0.05 : (head.is(ModItems.HAZMAT_HOOD) ? 0.3 : 1.0);
		double gamma = chest.is(ModItems.LEAD_APRON) ? 0.8 : 1.0;
		return new Protection(gamma, contamination, internal);
	}

	static Reading compute(ServerLevel level, ServerPlayer player, Protection prot) {
		double severity = ModConfig.get().radiation.severity;
		Vec3 body = player.position().add(0, 1.0, 0);
		double blocks = blockDoseRate(level, body.x, body.y, body.z);
		double zone = level.dimension() == Level.OVERWORLD ? PlantService.zoneDoseRate(level, player.blockPosition()) : 0;
		double ground = 0;
		double cell = 0;
		if (level.dimension() == Level.OVERWORLD) {
			cell = ContaminationData.get(level).at(player.getBlockX(), player.getBlockZ());
			if (cell > 0) {
				int surface = level.getHeight(Heightmap.Types.MOTION_BLOCKING, player.getBlockX(), player.getBlockZ());
				double heightFactor = Math.max(0, 1 - Math.max(0, player.getY() - surface - 2) / 10.0);
				double roof = outdoors(level, player.blockPosition()) ? 1.0 : 0.25;
				if (player.getY() < surface - 3) {
					roof = 0.02; // underground
				}
				ground = cell * ContaminationData.DOSE_PER_KBQ * heightFactor * roof;
			}
		}
		double carried = 0;
		for (int i = 0; i < player.getInventory().getContainerSize(); i++) {
			ItemStack stack = player.getInventory().getItem(i);
			if (!stack.isEmpty()) {
				carried += ItemRadioactivity.activity(stack) * stack.getCount() * 2.0;
				Float c = stack.get(ModComponents.CONTAMINATION);
				if (c != null) {
					carried += c * 0.0005 * stack.getCount();
				}
			}
		}
		double skin = data(player).contamination() * 0.002;
		double external = ((blocks + zone * 0.7 + ground) * prot.gamma + carried) * severity;
		double internal = (zone * 0.3 + ground * 0.4) * prot.internal * severity;
		double total = BACKGROUND + external + internal + skin * severity;
		return new Reading(total, external, internal, cell);
	}

	// ================================================================== per-tick processing

	private static void tick(MinecraftServer server) {
		long time = server.getTickCount();
		if (time % UPDATE_TICKS != 0) {
			return;
		}
		double dtSeconds = UPDATE_TICKS / 20.0;
		ModConfig cfg = ModConfig.get();
		for (ServerPlayer player : server.getPlayerList().getPlayers()) {
			if (player.isSpectator()) {
				continue;
			}
			ServerLevel level = player.level();
			Protection prot = protection(player);
			Reading r = compute(level, player, prot);
			PlayerRadiation rad = data(player);
			if (!player.isCreative()) {
				rad.addDose(r.doseRate() * dtSeconds / 3600.0 / 1000.0);
				// pick up surface contamination from contaminated ground or debris underfoot
				if (r.groundContamination() > 0 && player.onGround()) {
					rad.addContamination(r.groundContamination() * 0.002 * dtSeconds * prot.contamination());
				}
				BlockState under = level.getBlockState(player.blockPosition().below());
				if (under.is(ModBlocks.CONTAMINATED_DEBRIS) || under.is(ModBlocks.CORIUM) || under.is(ModBlocks.CONTAMINATED_SOIL)) {
					rad.addContamination(50 * dtSeconds * prot.contamination());
				}
			}
			rad.recover(dtSeconds, ACUTE_RECOVERY_HALF_LIFE);
			rad.setLast((float) r.doseRate(), (float) r.groundContamination());
			if (cfg.radiation.sickness && !player.isCreative()) {
				applySickness(level, player, rad, time);
			}
			ModNetwork.sendRadiation(player, rad, r);
		}
		if (time % 200 == 0) {
			ServerLevel overworld = server.overworld();
			ContaminationData.get(overworld).decay(10.0 * cfg.simulation.slowTimeFactor);
			convertContaminatedSurfaces(overworld);
		}
	}

	private static void applySickness(ServerLevel level, ServerPlayer player, PlayerRadiation rad, long time) {
		double acute = rad.acuteDose();
		if (acute < 200) {
			return;
		}
		if (time % 600 == 0) {
			player.addEffect(new MobEffectInstance(MobEffects.HUNGER, 200, 0, true, false, true));
		}
		if (acute >= 1000 && time % 400 == 0) {
			player.addEffect(new MobEffectInstance(MobEffects.NAUSEA, 200, 0, true, false, true));
			player.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 600, acute >= 2000 ? 1 : 0, true, false, true));
		}
		if (acute >= 2000) {
			player.addEffect(new MobEffectInstance(MobEffects.MINING_FATIGUE, 600, 0, true, false, true));
			int period = acute >= 8000 ? 40 : (acute >= 4000 ? 80 : 300);
			if (time % period == 0) {
				player.hurtServer(level, ModDamage.radiation(level), acute >= 8000 ? 2.0f : 1.0f);
			}
		}
		if (acute >= 4000 && time % 200 == 0) {
			player.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 300, 0, true, false, true));
		}
	}

	// ================================================================== contamination, cleanup and waste

	/**
	 * Deposits an environmental release as a plume downwind of the release point. Wind
	 * direction follows a slowly varying, deterministic function of game time.
	 */
	public static void depositRelease(ServerLevel level, BlockPos source, double releaseFraction, long gameTime, boolean raining) {
		if (releaseFraction <= 0) {
			return;
		}
		ModConfig cfg = ModConfig.get();
		double q = releaseFraction * RELEASE_KBQ * cfg.radiation.severity;
		double angle = 2 * Math.PI * ((gameTime / 72000.0) % 1.0) + 0.7 * Math.sin(gameTime / 9000.0);
		double wx = Math.cos(angle);
		double wz = Math.sin(angle);
		int radius = cfg.radiation.releaseSpreadRadius;
		ContaminationData data = ContaminationData.get(level);
		int samples = 240;
		double norm = 0;
		double[] weights = new double[samples];
		double[] dist = new double[samples];
		for (int i = 0; i < samples; i++) {
			double u = (i + 0.5) / samples;
			dist[i] = 12 + (radius - 12) * u * u;
			weights[i] = Math.pow(dist[i], -1.1) * (raining && dist[i] < 200 ? 2.0 : 1.0) * u;
			norm += weights[i];
		}
		for (int i = 0; i < samples; i++) {
			double x = dist[i];
			double sigma = 0.15 * x + 6;
			double h = hash(gameTime, i);
			double y = (h * 2 - 1) * sigma * 1.4;
			int px = (int) Math.floor(source.getX() + wx * x - wz * y);
			int pz = (int) Math.floor(source.getZ() + wz * x + wx * y);
			double kBq = 0.5 * q * weights[i] / norm;
			data.deposit(px, pz, kBq / 16.0, 0.7);
		}
	}

	private static double hash(long t, int i) {
		long h = t * 0x9E3779B97F4A7C15L + i * 0xC2B2AE3D27D4EB4FL;
		h = (h ^ (h >>> 31)) * 0xBF58476D1CE4E5B9L;
		h ^= h >>> 29;
		return (h >>> 11) * 0x1.0p-53;
	}

	/** Turns the topsoil of heavily contaminated cells near players into contaminated soil blocks. */
	private static void convertContaminatedSurfaces(ServerLevel level) {
		ContaminationData data = ContaminationData.get(level);
		if (data.contaminatedChunks() == 0) {
			return;
		}
		for (ServerPlayer player : level.players()) {
			int px = player.getBlockX();
			int pz = player.getBlockZ();
			for (int x = px - 24; x <= px + 24; x += 4) {
				for (int z = pz - 24; z <= pz + 24; z += 4) {
					if (data.at(x, z) < SOIL_CONVERSION_THRESHOLD || level.getChunkSource().getChunkNow(x >> 4, z >> 4) == null) {
						continue;
					}
					int cx = x & ~3;
					int cz = z & ~3;
					for (int dx = 0; dx < 4; dx++) {
						for (int dz = 0; dz < 4; dz++) {
							int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, cx + dx, cz + dz) - 1;
							BlockPos pos = new BlockPos(cx + dx, y, cz + dz);
							BlockState s = level.getBlockState(pos);
							if (s.is(Blocks.GRASS_BLOCK) || s.is(Blocks.PODZOL) || s.is(Blocks.MYCELIUM) || s.is(Blocks.SAND) || s.is(Blocks.COARSE_DIRT)) {
								level.setBlock(pos, ModBlocks.CONTAMINATED_SOIL.defaultBlockState(), 3);
							}
						}
					}
				}
			}
		}
	}

	private static void onBlockBroken(ServerLevel level, ServerPlayer player, BlockPos pos, BlockState state) {
		if (state.is(ModBlocks.CONTAMINATED_SOIL)) {
			ContaminationData.get(level).remove(pos.getX(), pos.getZ(), 1.0 / 16.0);
		}
		if (state.is(ModBlocks.CONTAMINATED_SOIL) || state.is(ModBlocks.CONTAMINATED_DEBRIS) || state.is(ModBlocks.CORIUM)) {
			data(player).addContamination(400 * protection(player).contamination());
		}
	}

	public static void decontaminatePlayer(ServerPlayer player, float fraction) {
		PlayerRadiation rad = data(player);
		double before = rad.contamination();
		rad.setContamination(before * (1 - fraction));
		player.sendOverlayMessage(Component.translatable("message.nuclearstation.decon_player",
			String.format("%.0f", before), String.format("%.0f", rad.contamination())).withStyle(ChatFormatting.AQUA));
	}

	public static void decontaminateItem(ServerPlayer player, ItemStack stack) {
		if (ItemRadioactivity.activity(stack) > 0) {
			player.sendOverlayMessage(Component.translatable("message.nuclearstation.decon_item_radioactive").withStyle(ChatFormatting.YELLOW));
			return;
		}
		if (stack.has(ModComponents.CONTAMINATION)) {
			stack.remove(ModComponents.CONTAMINATION);
			player.sendOverlayMessage(Component.translatable("message.nuclearstation.decon_item_clean").withStyle(ChatFormatting.AQUA));
		} else {
			player.sendOverlayMessage(Component.translatable("message.nuclearstation.decon_item_already_clean"));
		}
	}

	// ================================================================== instruments

	public static void sendSurveyMap(ServerLevel level, ServerPlayer player) {
		ContaminationData data = ContaminationData.get(level);
		int px = player.getBlockX() & ~3;
		int pz = player.getBlockZ() & ~3;
		double max = 0;
		player.sendSystemMessage(Component.translatable("message.nuclearstation.survey_header", player.getBlockX(), player.getBlockZ())
			.withStyle(ChatFormatting.GOLD));
		for (int row = -6; row <= 6; row++) {
			MutableComponent line = Component.literal(row == -6 ? "N " : "  ");
			for (int col = -10; col <= 10; col++) {
				double cell = data.at(px + col * 4, pz + row * 4);
				double rate = cell * ContaminationData.DOSE_PER_KBQ;
				max = Math.max(max, rate);
				String glyph = row == 0 && col == 0 ? "◆" : "█";
				line.append(Component.literal(glyph).withStyle(colourFor(rate + BACKGROUND)));
			}
			player.sendSystemMessage(line);
		}
		player.sendSystemMessage(Component.translatable("message.nuclearstation.survey_legend",
			formatDoseRate(max)).withStyle(ChatFormatting.GRAY));
	}

	public static ChatFormatting colourFor(double uSvPerHour) {
		if (uSvPerHour < 0.5) {
			return ChatFormatting.GREEN;
		}
		if (uSvPerHour < 10) {
			return ChatFormatting.YELLOW;
		}
		if (uSvPerHour < 100) {
			return ChatFormatting.GOLD;
		}
		if (uSvPerHour < 1000) {
			return ChatFormatting.RED;
		}
		return ChatFormatting.DARK_RED;
	}

	public static ChatFormatting colourForDose(double mSv) {
		if (mSv < 50) {
			return ChatFormatting.GREEN;
		}
		if (mSv < 250) {
			return ChatFormatting.YELLOW;
		}
		if (mSv < 1000) {
			return ChatFormatting.GOLD;
		}
		return ChatFormatting.RED;
	}

	public static String formatDoseRate(double uSvPerHour) {
		if (uSvPerHour < 1000) {
			return String.format("%.2f µSv/h", uSvPerHour);
		}
		if (uSvPerHour < 1_000_000) {
			return String.format("%.1f mSv/h", uSvPerHour / 1000);
		}
		return String.format("%.2f Sv/h", uSvPerHour / 1_000_000);
	}

	public static void logStatus(ServerLevel level) {
		NuclearStation.LOG.info("Radiation index: {} sections cached", indexedSections(level));
	}
}
