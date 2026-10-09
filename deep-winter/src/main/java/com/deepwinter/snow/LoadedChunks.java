package com.deepwinter.snow;

import it.unimi.dsi.fastutil.longs.Long2IntOpenHashMap;
import it.unimi.dsi.fastutil.longs.LongArrayList;

/** A set of chunk positions with O(1) add/remove and random access (for round-robin/random sampling). */
final class LoadedChunks {
	private final LongArrayList list = new LongArrayList();
	private final Long2IntOpenHashMap index = new Long2IntOpenHashMap();

	LoadedChunks() {
		index.defaultReturnValue(-1);
	}

	void add(long pos) {
		if (index.get(pos) < 0) {
			index.put(pos, list.size());
			list.add(pos);
		}
	}

	void remove(long pos) {
		int i = index.remove(pos);
		if (i < 0) {
			return;
		}
		int last = list.size() - 1;
		long moved = list.getLong(last);
		list.removeLong(last);
		if (i != last) {
			list.set(i, moved);
			index.put(moved, i);
		}
	}

	int size() {
		return list.size();
	}

	long get(int i) {
		return list.getLong(i);
	}
}
