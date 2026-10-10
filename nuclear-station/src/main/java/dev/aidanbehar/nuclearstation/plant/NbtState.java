package dev.aidanbehar.nuclearstation.plant;

import dev.aidanbehar.nuclearstation.sim.StateIO;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.Tag;

/** Adapts the simulation's {@link StateIO} persistence interfaces to NBT. */
public final class NbtState implements StateIO.Writer, StateIO.Reader {
	private final CompoundTag tag;

	public NbtState(CompoundTag tag) {
		this.tag = tag;
	}

	public CompoundTag tag() {
		return tag;
	}

	@Override
	public void putDouble(String key, double value) {
		tag.putDouble(key, value);
	}

	@Override
	public void putInt(String key, int value) {
		tag.putInt(key, value);
	}

	@Override
	public void putLong(String key, long value) {
		tag.putLong(key, value);
	}

	@Override
	public void putBoolean(String key, boolean value) {
		tag.putBoolean(key, value);
	}

	@Override
	public void putString(String key, String value) {
		tag.putString(key, value);
	}

	@Override
	public NbtState child(String key) {
		Tag existing = tag.get(key);
		if (existing instanceof CompoundTag compound) {
			return new NbtState(compound);
		}
		CompoundTag child = new CompoundTag();
		tag.put(key, child);
		return new NbtState(child);
	}

	@Override
	public double getDouble(String key, double fallback) {
		return tag.getDoubleOr(key, fallback);
	}

	@Override
	public int getInt(String key, int fallback) {
		return tag.getIntOr(key, fallback);
	}

	@Override
	public long getLong(String key, long fallback) {
		return tag.getLongOr(key, fallback);
	}

	@Override
	public boolean getBoolean(String key, boolean fallback) {
		return tag.getBooleanOr(key, fallback);
	}

	@Override
	public String getString(String key, String fallback) {
		return tag.getStringOr(key, fallback);
	}

	@Override
	public boolean has(String key) {
		return tag.contains(key);
	}
}
