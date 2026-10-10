package dev.aidanbehar.nuclearstation.radiation;

import com.mojang.serialization.Codec;
import dev.aidanbehar.nuclearstation.NuclearStation;
import it.unimi.dsi.fastutil.longs.Long2ObjectMap;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import it.unimi.dsi.fastutil.longs.LongIterator;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.datafix.DataFixTypes;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.saveddata.SavedData;
import net.minecraft.world.level.saveddata.SavedDataType;

/**
 * Ground contamination deposited by radioactive releases, in kBq/m2, on a grid of
 * 4 x 4 block cells. Each cell has a short-lived component (iodine-like, decays in
 * days of plant time) and a long-lived one (caesium-like, effectively permanent).
 * Only contaminated chunks are stored, so the map stays small.
 */
public final class ContaminationData extends SavedData {
	public static final Codec<ContaminationData> CODEC = CompoundTag.CODEC.xmap(ContaminationData::fromTag, ContaminationData::toTag);
	public static final SavedDataType<ContaminationData> TYPE = new SavedDataType<>(
		NuclearStation.id("contamination"), ContaminationData::new, CODEC, DataFixTypes.SAVED_DATA_COMMAND_STORAGE);
	/** Gamma dose rate at 1 m above uniformly contaminated ground, uSv/h per kBq/m2. */
	public static final double DOSE_PER_KBQ = 0.002;
	/** Short-lived half-life in plant seconds (8 days, iodine-131). */
	public static final double SHORT_HALF_LIFE = 8 * 86400.0;
	static final double NEGLIGIBLE = 0.5;

	/** chunk key -> 32 floats: [cell*2] short-lived, [cell*2+1] long-lived; cell = (x>>2) + (z>>2)*4. */
	private final Long2ObjectOpenHashMap<float[]> chunks = new Long2ObjectOpenHashMap<>();
	private double totalDeposited;

	public static ContaminationData get(ServerLevel level) {
		return level.getDataStorage().computeIfAbsent(TYPE);
	}

	private static int cell(int x, int z) {
		return ((x & 15) >> 2) + ((z & 15) >> 2) * 4;
	}

	public double at(int x, int z) {
		float[] c = chunks.get(ChunkPos.pack(x >> 4, z >> 4));
		if (c == null) {
			return 0;
		}
		int i = cell(x, z) * 2;
		return c[i] + c[i + 1];
	}

	public void deposit(int x, int z, double kBqPerM2, double shortFraction) {
		if (kBqPerM2 <= 0) {
			return;
		}
		float[] c = chunks.computeIfAbsent(ChunkPos.pack(x >> 4, z >> 4), k -> new float[32]);
		int i = cell(x, z) * 2;
		c[i] += (float) (kBqPerM2 * shortFraction);
		c[i + 1] += (float) (kBqPerM2 * (1 - shortFraction));
		totalDeposited += kBqPerM2 * 16;
		setDirty();
	}

	/** Removes a fraction of the cell's contamination (topsoil removal, washing). Returns the amount removed. */
	public double remove(int x, int z, double fraction) {
		float[] c = chunks.get(ChunkPos.pack(x >> 4, z >> 4));
		if (c == null) {
			return 0;
		}
		int i = cell(x, z) * 2;
		double before = c[i] + c[i + 1];
		c[i] *= (float) (1 - fraction);
		c[i + 1] *= (float) (1 - fraction);
		setDirty();
		return before * fraction;
	}

	/** Radioactive decay of the short-lived component. */
	public void decay(double plantSeconds) {
		if (chunks.isEmpty()) {
			return;
		}
		float factor = (float) Math.exp(-Math.log(2) * plantSeconds / SHORT_HALF_LIFE);
		LongIterator it = chunks.keySet().iterator();
		while (it.hasNext()) {
			long key = it.nextLong();
			float[] c = chunks.get(key);
			double sum = 0;
			for (int i = 0; i < 32; i += 2) {
				c[i] *= factor;
				sum += c[i] + c[i + 1];
			}
			if (sum < NEGLIGIBLE) {
				it.remove();
			}
		}
		setDirty();
	}

	public int contaminatedChunks() {
		return chunks.size();
	}

	public double totalDeposited() {
		return totalDeposited;
	}

	public Long2ObjectMap<float[]> raw() {
		return chunks;
	}

	private static ContaminationData fromTag(CompoundTag tag) {
		ContaminationData d = new ContaminationData();
		d.totalDeposited = tag.getDoubleOr("total", 0);
		ListTag list = tag.getListOrEmpty("chunks");
		for (Tag t : list) {
			if (t instanceof CompoundTag entry) {
				long key = entry.getLongOr("k", 0);
				int[] bits = entry.getIntArray("v").orElse(new int[0]);
				float[] c = new float[32];
				for (int i = 0; i < Math.min(32, bits.length); i++) {
					c[i] = Float.intBitsToFloat(bits[i]);
				}
				d.chunks.put(key, c);
			}
		}
		return d;
	}

	private CompoundTag toTag() {
		CompoundTag tag = new CompoundTag();
		tag.putDouble("total", totalDeposited);
		ListTag list = new ListTag();
		for (Long2ObjectMap.Entry<float[]> e : chunks.long2ObjectEntrySet()) {
			CompoundTag entry = new CompoundTag();
			entry.putLong("k", e.getLongKey());
			int[] bits = new int[32];
			for (int i = 0; i < 32; i++) {
				bits[i] = Float.floatToIntBits(e.getValue()[i]);
			}
			entry.putIntArray("v", bits);
			list.add(entry);
		}
		tag.put("chunks", list);
		return tag;
	}
}
