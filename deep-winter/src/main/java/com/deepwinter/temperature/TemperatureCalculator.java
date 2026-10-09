package com.deepwinter.temperature;

import com.deepwinter.storm.StormFlags;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.tags.FluidTags;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.npc.villager.Villager;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.biome.Biome;
import net.minecraft.world.level.block.AbstractFurnaceBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.CampfireBlock;
import net.minecraft.world.level.block.state.BlockState;
import org.jspecify.annotations.Nullable;

import java.util.IdentityHashMap;
import java.util.Map;

/** Works out the temperature (°C) at a position, and what a given entity feels there. */
public final class TemperatureCalculator {
	public static final float COMFORT = 20.0F;
	private static final float NETHER = 60.0F;
	private static final float END = -15.0F;
	private static final int HEAT_RADIUS = 7;
	private static final int HEAT_RADIUS_Y = 3;

	private record HeatSource(float heat, float radius) {
	}

	private static final Map<Block, HeatSource> HEAT = new IdentityHashMap<>();

	static {
		HEAT.put(Blocks.CAMPFIRE, new HeatSource(35, 7));
		HEAT.put(Blocks.SOUL_CAMPFIRE, new HeatSource(26, 6));
		HEAT.put(Blocks.FIRE, new HeatSource(28, 6));
		HEAT.put(Blocks.SOUL_FIRE, new HeatSource(20, 5));
		HEAT.put(Blocks.LAVA, new HeatSource(32, 7));
		HEAT.put(Blocks.LAVA_CAULDRON, new HeatSource(22, 5));
		HEAT.put(Blocks.FURNACE, new HeatSource(20, 5));
		HEAT.put(Blocks.SMOKER, new HeatSource(20, 5));
		HEAT.put(Blocks.BLAST_FURNACE, new HeatSource(24, 5));
		HEAT.put(Blocks.MAGMA_BLOCK, new HeatSource(12, 3));
		HEAT.put(Blocks.TORCH, new HeatSource(4, 2.5F));
		HEAT.put(Blocks.WALL_TORCH, new HeatSource(4, 2.5F));
		HEAT.put(Blocks.SOUL_TORCH, new HeatSource(3, 2.5F));
		HEAT.put(Blocks.SOUL_WALL_TORCH, new HeatSource(3, 2.5F));
		HEAT.put(Blocks.COPPER_TORCH, new HeatSource(4, 2.5F));
		HEAT.put(Blocks.COPPER_WALL_TORCH, new HeatSource(4, 2.5F));
		HEAT.put(Blocks.LANTERN, new HeatSource(3, 2.5F));
		HEAT.put(Blocks.SOUL_LANTERN, new HeatSource(2, 2.5F));
	}

	private TemperatureCalculator() {
	}

	/** Biome temperature to °C: snowy plains -5, taiga ~1, plains 15, desert 45. */
	public static float biomeCelsius(Biome biome) {
		return biome.getBaseTemperature() * 25.0F - 5.0F;
	}

	public static TemperatureBreakdown compute(Level level, BlockPos feet, @Nullable LivingEntity entity) {
		BlockPos eye = entity != null ? BlockPos.containing(entity.getEyePosition()) : feet.above();
		Biome biome = level.getBiome(feet).value();
		float insulation = entity != null ? insulation(entity) : 0;

		if (level.dimension() == Level.NETHER || level.dimension() == Level.END) {
			boolean nether = level.dimension() == Level.NETHER;
			float base = nether ? NETHER : END;
			float heat = heatAround(level, feet, 1.0F);
			float wet = entity != null && entity.isInWater() ? -8 : 0;
			float ambient = base + heat + wet;
			float felt = applyInsulation(ambient, insulation);
			return new TemperatureBreakdown(base, 0, 0, 0, 0, wet, 0, heat, felt - ambient, ambient, felt, 1, false,
				nether ? "nether" : "end");
		}

		float biomeC = biomeCelsius(biome);
		boolean skyVisible = level.canSeeSky(eye);
		boolean underground = !skyVisible && feet.getY() < level.getSeaLevel() - 8;

		float altitude = -Math.max(0, feet.getY() - 80) * 0.1F;
		if (underground) {
			// Deep caves hold a steady ~12 °C.
			altitude = (12.0F - biomeC) * 0.6F;
		}

		float shelter = shelter(level, eye, skyVisible);
		float exposure = 1.0F - shelter;

		float darkness = level.getSkyDarken() / 11.0F;
		float timeOfDay = underground ? 0 : -7.0F * darkness * (skyVisible ? 1.0F : 0.5F);

		float rain = level.isRaining() ? level.getRainLevel(1.0F) : 0;
		boolean storm = rain > 0 && StormFlags.appliesTo(biome);
		float weather = 0;
		if (rain > 0 && !underground && biome.hasPrecipitation()) {
			weather = (storm ? -12.0F : -3.0F) * rain * (1.0F - 0.5F * shelter);
		}
		float wind = underground ? 0 : -(3.0F + (storm ? 9.0F * rain : 0)) * exposure;

		float wetness = 0;
		if (entity != null) {
			if (entity.isInWater()) {
				wetness = level.getFluidState(feet).is(FluidTags.WATER) && biomeC < 5 ? -12 : -8;
			} else if (entity.isInWaterOrRain()) {
				wetness = -3;
			}
			if (entity.isInPowderSnow) {
				wetness -= 6;
			}
		}

		float raw = biomeC + altitude + timeOfDay + weather + wind + wetness;
		// A closed room (roof + walls) buffers the outside air toward a mild 10 °C.
		float buffer = shelter >= 0.9F ? (10.0F - raw) * 0.4F : 0;
		float heat = heatAround(level, feet, shelter >= 0.8F ? 1.3F : 1.0F);
		float ambient = raw + buffer + heat;
		float felt = applyInsulation(ambient, insulation);
		return new TemperatureBreakdown(biomeC, altitude, timeOfDay, weather, wind, wetness, buffer, heat,
			felt - ambient, ambient, felt, shelter, storm, "overworld");
	}

	private static float applyInsulation(float ambient, float insulation) {
		if (ambient >= COMFORT || insulation <= 0) {
			return ambient;
		}
		return Math.min(COMFORT, ambient + insulation);
	}

	/** Clothing: leather is by far the warmest; full leather gives +23 °C. Villagers wear warm robes. */
	public static float insulation(LivingEntity entity) {
		float total = 0;
		total += piece(entity.getItemBySlot(EquipmentSlot.HEAD), Items.LEATHER_HELMET, 5);
		total += piece(entity.getItemBySlot(EquipmentSlot.CHEST), Items.LEATHER_CHESTPLATE, 8);
		total += piece(entity.getItemBySlot(EquipmentSlot.LEGS), Items.LEATHER_LEGGINGS, 6);
		total += piece(entity.getItemBySlot(EquipmentSlot.FEET), Items.LEATHER_BOOTS, 4);
		if (entity instanceof Villager) {
			total += 4;
		}
		return total;
	}

	private static float piece(ItemStack stack, net.minecraft.world.item.Item leather, float leatherValue) {
		if (stack.isEmpty()) {
			return 0;
		}
		return stack.is(leather) ? leatherValue : 1.0F;
	}

	/** 0 = open sky, 1 = roof plus walls on all four sides. */
	public static float shelter(Level level, BlockPos eye, boolean skyVisible) {
		float roof = skyVisible ? 0 : 0.6F;
		int walls = 0;
		BlockPos.MutableBlockPos p = new BlockPos.MutableBlockPos();
		for (Direction dir : Direction.Plane.HORIZONTAL) {
			for (int i = 1; i <= 6; i++) {
				p.setWithOffset(eye, dir.getStepX() * i, 0, dir.getStepZ() * i);
				if (!level.hasChunkAt(p)) {
					break;
				}
				BlockState s = level.getBlockState(p);
				if (s.isSolid() || s.isSolidRender()) {
					walls++;
					break;
				}
			}
		}
		return roof + walls * 0.1F;
	}

	/** Sum of nearby heat sources, falling off with distance. */
	public static float heatAround(Level level, BlockPos center, float multiplier) {
		float total = 0;
		BlockPos.MutableBlockPos p = new BlockPos.MutableBlockPos();
		for (int dx = -HEAT_RADIUS; dx <= HEAT_RADIUS; dx++) {
			for (int dz = -HEAT_RADIUS; dz <= HEAT_RADIUS; dz++) {
				p.set(center.getX() + dx, center.getY(), center.getZ() + dz);
				if (!level.hasChunkAt(p)) {
					continue;
				}
				for (int dy = -HEAT_RADIUS_Y; dy <= HEAT_RADIUS_Y; dy++) {
					p.setY(center.getY() + dy);
					BlockState state = level.getBlockState(p);
					if (state.isAir()) {
						continue;
					}
					HeatSource src = HEAT.get(state.getBlock());
					if (src == null) {
						if (state.getFluidState().is(FluidTags.LAVA)) {
							src = HEAT.get(Blocks.LAVA);
						} else {
							continue;
						}
					}
					if (state.hasProperty(CampfireBlock.LIT) && !state.getValue(CampfireBlock.LIT)) {
						continue;
					}
					if (state.hasProperty(AbstractFurnaceBlock.LIT) && !state.getValue(AbstractFurnaceBlock.LIT)) {
						continue;
					}
					float d = Mth.sqrt(dx * dx + dy * dy * 1.5F + dz * dz);
					if (d < src.radius) {
						total += src.heat * (float) Math.pow(1.0F - d / src.radius, 1.5);
					}
				}
			}
		}
		return Math.min(45.0F, total * multiplier);
	}
}
