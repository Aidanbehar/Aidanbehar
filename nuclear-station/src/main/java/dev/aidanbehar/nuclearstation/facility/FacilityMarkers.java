package dev.aidanbehar.nuclearstation.facility;

import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.ChunkPos;

/**
 * Index of every marker in the built blueprint, in world coordinates. Derived from the
 * blueprint (not stored), so it is always consistent with what was generated.
 */
public final class FacilityMarkers {
	private final Long2ObjectOpenHashMap<List<Marker>> byChunk = new Long2ObjectOpenHashMap<>();
	private final Map<BlockPos, EquipmentId> stations = new HashMap<>();
	private final Set<BlockPos> scramButtons = new HashSet<>();
	private final Set<BlockPos> consoles = new HashSet<>();
	private final List<BlockPos> sirens = new ArrayList<>();
	private final Map<Feature, BlockPos> features = new EnumMap<>(Feature.class);
	private final int total;

	public FacilityMarkers(List<Marker> markers) {
		for (Marker m : markers) {
			long key = ChunkPos.pack(m.pos().getX() >> 4, m.pos().getZ() >> 4);
			byChunk.computeIfAbsent(key, k -> new ArrayList<>()).add(m);
			switch (m.type()) {
				case STATION -> stations.put(m.pos(), EquipmentId.values()[m.data()]);
				case SCRAM -> scramButtons.add(m.pos());
				case CONSOLE -> consoles.add(m.pos());
				case SIREN -> sirens.add(m.pos());
				case FEATURE -> features.putIfAbsent(Feature.values()[m.data()], m.pos());
				default -> {
				}
			}
		}
		this.total = markers.size();
	}

	public List<Marker> inChunk(int chunkX, int chunkZ) {
		List<Marker> list = byChunk.get(ChunkPos.pack(chunkX, chunkZ));
		return list == null ? Collections.emptyList() : list;
	}

	public Iterable<Long> chunks() {
		return byChunk.keySet();
	}

	public EquipmentId stationAt(BlockPos pos) {
		return stations.get(pos);
	}

	public boolean isScram(BlockPos pos) {
		return scramButtons.contains(pos);
	}

	public List<BlockPos> sirens() {
		return sirens;
	}

	public Set<BlockPos> consoles() {
		return consoles;
	}

	public BlockPos feature(Feature feature) {
		return features.get(feature);
	}

	public Map<BlockPos, EquipmentId> stations() {
		return stations;
	}

	public int total() {
		return total;
	}
}
