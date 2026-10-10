package dev.aidanbehar.nuclearstation.sim;

import java.util.HashMap;
import java.util.Map;

/**
 * Minimal key/value persistence abstraction so the simulation can be saved without
 * depending on Minecraft classes. The Minecraft side adapts this to NBT; tests use
 * {@link MapState}.
 */
public final class StateIO {
	private StateIO() {
	}

	public interface Writer {
		void putDouble(String key, double value);

		void putInt(String key, int value);

		void putLong(String key, long value);

		void putBoolean(String key, boolean value);

		void putString(String key, String value);

		Writer child(String key);
	}

	public interface Reader {
		double getDouble(String key, double fallback);

		int getInt(String key, int fallback);

		long getLong(String key, long fallback);

		boolean getBoolean(String key, boolean fallback);

		String getString(String key, String fallback);

		/** Returns an empty reader if the child does not exist. */
		Reader child(String key);

		boolean has(String key);
	}

	/** Plain map implementation used by unit tests and for snapshots. */
	public static final class MapState implements Writer, Reader {
		private final Map<String, Object> values = new HashMap<>();

		@Override
		public void putDouble(String key, double value) {
			values.put(key, value);
		}

		@Override
		public void putInt(String key, int value) {
			values.put(key, value);
		}

		@Override
		public void putLong(String key, long value) {
			values.put(key, value);
		}

		@Override
		public void putBoolean(String key, boolean value) {
			values.put(key, value);
		}

		@Override
		public void putString(String key, String value) {
			values.put(key, value);
		}

		@Override
		public MapState child(String key) {
			Object existing = values.get(key);
			if (existing instanceof MapState state) {
				return state;
			}
			MapState state = new MapState();
			values.put(key, state);
			return state;
		}

		@Override
		public double getDouble(String key, double fallback) {
			return values.get(key) instanceof Number number ? number.doubleValue() : fallback;
		}

		@Override
		public int getInt(String key, int fallback) {
			return values.get(key) instanceof Number number ? number.intValue() : fallback;
		}

		@Override
		public long getLong(String key, long fallback) {
			return values.get(key) instanceof Number number ? number.longValue() : fallback;
		}

		@Override
		public boolean getBoolean(String key, boolean fallback) {
			return values.get(key) instanceof Boolean b ? b : fallback;
		}

		@Override
		public String getString(String key, String fallback) {
			return values.get(key) instanceof String s ? s : fallback;
		}

		@Override
		public boolean has(String key) {
			return values.containsKey(key);
		}

		public Map<String, Object> raw() {
			return values;
		}
	}
}
