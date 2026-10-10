package dev.aidanbehar.nuclearstation.plant;

import com.mojang.serialization.Codec;
import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.sim.PlantModel;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.datafix.DataFixTypes;
import net.minecraft.world.level.saveddata.SavedData;
import net.minecraft.world.level.saveddata.SavedDataType;

/**
 * Persistent plant simulation state and the record of physical accident damage that has
 * been applied to the world (so it is re-applied consistently to chunks loading later).
 */
public final class PlantData extends SavedData {
	public static final Codec<PlantData> CODEC = CompoundTag.CODEC.xmap(PlantData::fromTag, PlantData::toTag);
	public static final SavedDataType<PlantData> TYPE = new SavedDataType<>(
		NuclearStation.id("plant"), PlantData::new, CODEC, DataFixTypes.SAVED_DATA_COMMAND_STORAGE);

	public static final int DAMAGE_HYDROGEN_BURN = 1;
	public static final int DAMAGE_CONTAINMENT_BREACH = 1 << 1;
	public static final int DAMAGE_VESSEL_FAILURE = 1 << 2;
	public static final int DAMAGE_MELT_THROUGH = 1 << 3;
	public static final int DAMAGE_SFP = 1 << 4;
	public static final int DAMAGE_CORE = 1 << 5;

	private PlantModel model;
	private boolean seeded;
	private int damageStages;
	private long lastUpdateTick;
	/** Release accumulated since the last plume deposition (not persisted; flushed every 10 s). */
	private double pendingRelease;

	public PlantData() {
		this.model = new PlantModel();
	}

	public static PlantData get(ServerLevel overworld) {
		PlantData data = overworld.getDataStorage().computeIfAbsent(TYPE);
		if (!data.seeded) {
			data.model.seedRandom(overworld.getSeed() ^ 0x4D45524944L);
			data.seeded = true;
			data.setDirty();
		}
		return data;
	}

	public PlantModel model() {
		return model;
	}

	public int damageStages() {
		return damageStages;
	}

	public boolean hasDamage(int flag) {
		return (damageStages & flag) != 0;
	}

	public void addDamage(int flag) {
		damageStages |= flag;
		setDirty();
	}

	public void addPendingRelease(double amount) {
		pendingRelease += amount;
	}

	public double takePendingRelease() {
		double r = pendingRelease;
		pendingRelease = 0;
		return r;
	}

	public long lastUpdateTick() {
		return lastUpdateTick;
	}

	public void setLastUpdateTick(long tick) {
		lastUpdateTick = tick;
	}

	/** Development: start over with a fresh plant at full power. */
	public void reset() {
		model = new PlantModel();
		damageStages = 0;
		seeded = false;
		setDirty();
	}

	private static PlantData fromTag(CompoundTag tag) {
		PlantData d = new PlantData();
		try {
			d.model.load(new NbtState(tag.getCompoundOrEmpty("model")));
		} catch (RuntimeException e) {
			NuclearStation.LOG.error("Plant state could not be loaded, starting a fresh plant", e);
			d.model = new PlantModel();
		}
		d.seeded = tag.getBooleanOr("seeded", false);
		d.damageStages = tag.getIntOr("damage", 0);
		return d;
	}

	private CompoundTag toTag() {
		CompoundTag tag = new CompoundTag();
		CompoundTag m = new CompoundTag();
		model.save(new NbtState(m));
		tag.put("model", m);
		tag.putBoolean("seeded", seeded);
		tag.putInt("damage", damageStages);
		return tag;
	}
}
