package dev.aidanbehar.nuclearstation.facility.layout;

import dev.aidanbehar.nuclearstation.facility.BlockSink;
import dev.aidanbehar.nuclearstation.facility.Marker;
import dev.aidanbehar.nuclearstation.facility.Painter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.level.block.state.BlockState;

/**
 * The canonical Meridian Point site plan. Identical in every world: components have
 * fixed local coordinates and any randomness is derived from fixed seeds and block
 * positions, never from the world seed. Terrain adaptation is computed per column from
 * the column's own natural terrain, so chunks can be painted independently and in any
 * order.
 *
 * <p>Local axes: +x east, +z south. The land side is to the north; the ocean frontage
 * (intake, discharge, seawall) faces south.
 */
public final class Blueprint {
	public static final int SIZE = 1024;
	public static final int CHUNKS = SIZE / 16;
	/** Seawall occupies z in [SHORE_Z, SEA_Z). */
	public static final int SHORE_Z = 880;
	public static final int SEA_Z = 896;
	/** Depth below sea level to which the harbour basin is dredged. */
	public static final int DREDGE_DEPTH = 7;
	public static final int MAX_FOUNDATION_DEPTH = 48;

	private static Blueprint instance;

	private final List<Component> components;
	private final List<List<Component>> byChunk;

	private Blueprint(List<Component> components) {
		this.components = Collections.unmodifiableList(components);
		this.byChunk = new ArrayList<>(CHUNKS * CHUNKS);
		for (int i = 0; i < CHUNKS * CHUNKS; i++) {
			byChunk.add(new ArrayList<>(4));
		}
		for (Component c : components) {
			int cx0 = Math.max(0, c.x0 >> 4);
			int cx1 = Math.min(CHUNKS - 1, c.x1 >> 4);
			int cz0 = Math.max(0, c.z0 >> 4);
			int cz1 = Math.min(CHUNKS - 1, c.z1 >> 4);
			for (int cx = cx0; cx <= cx1; cx++) {
				for (int cz = cz0; cz <= cz1; cz++) {
					byChunk.get(cx * CHUNKS + cz).add(c);
				}
			}
		}
	}

	public static synchronized Blueprint get() {
		if (instance == null) {
			instance = new Blueprint(SiteLayout.components());
		}
		return instance;
	}

	public List<Component> components() {
		return components;
	}

	public int componentCount(int cx, int cz) {
		return byChunk.get(cx * CHUNKS + cz).size();
	}

	public enum Zone {
		LAND, SEAWALL, SEA
	}

	public static Zone zone(int z) {
		return z < SHORE_Z ? Zone.LAND : (z < SEA_Z ? Zone.SEAWALL : Zone.SEA);
	}

	/**
	 * Paints one chunk column of the facility. cx/cz are local chunk indices (0..63).
	 */
	public void paintChunk(BlockSink sink, int originX, int originZ, int grade, int sea, int cx, int cz) {
		Painter p = new Painter(sink, originX, originZ, cx * 16, cz * 16, cx * 16 + 15, cz * 16 + 15, grade, sea, null, false);
		terrain(p);
		Kit k = new Kit(p);
		for (Component c : byChunk.get(cx * CHUNKS + cz)) {
			c.paint(p, k);
		}
	}

	/** Records every marker in the blueprint without touching any world. */
	public List<Marker> collectMarkers(int originX, int originZ, int grade, int sea) {
		List<Marker> markers = new ArrayList<>();
		Painter p = new Painter(null, originX, originZ, 0, 0, SIZE - 1, SIZE - 1, grade, sea, markers, true);
		Kit k = new Kit(p);
		for (Component c : components) {
			c.paint(p, k);
		}
		return markers;
	}

	// ------------------------------------------------------------------ terrain adaptation

	static boolean isGround(BlockState s) {
		return !s.isAir() && s.getFluidState().isEmpty() && !s.canBeReplaced() && !s.is(BlockTags.LEAVES) && !s.is(BlockTags.LOGS);
	}

	private void terrain(Painter p) {
		int grade = p.grade;
		int sea = p.sea;
		for (int x = p.clipX0(); x <= p.clipX1(); x++) {
			for (int z = p.clipZ0(); z <= p.clipZ1(); z++) {
				int top = p.topY(x, z);
				Zone zone = zone(z);
				if (zone == Zone.SEA) {
					for (int y = sea + 1; y <= top; y++) {
						p.set(x, y, z, Pal.AIR);
					}
					for (int y = sea; y >= sea - DREDGE_DEPTH + 1; y--) {
						if (!p.get(x, y, z).is(net.minecraft.world.level.block.Blocks.WATER)) {
							p.set(x, y, z, Pal.WATER);
						}
					}
					if (!isGround(p.get(x, sea - DREDGE_DEPTH, z))) {
						if (p.get(x, sea - DREDGE_DEPTH, z).isAir()) {
							p.set(x, sea - DREDGE_DEPTH, z, Pal.GRAVEL);
						}
					} else {
						p.set(x, sea - DREDGE_DEPTH, z, Pal.GRAVEL);
					}
					continue;
				}
				for (int y = grade + 1; y <= top; y++) {
					p.set(x, y, z, Pal.AIR);
				}
				p.set(x, grade, z, zone == Zone.SEAWALL ? Pal.CONCRETE : Pal.GRASS);
				int limit = Math.max(grade - MAX_FOUNDATION_DEPTH, sea - 40);
				for (int y = grade - 1; y > limit; y--) {
					BlockState s = p.get(x, y, z);
					if (isGround(s) && y < grade - 3) {
						break;
					}
					p.set(x, y, z, y >= grade - 3 ? Pal.DIRT : Pal.STONE);
				}
				boolean edge = x < 2 || x > SIZE - 3 || z < 2;
				if (edge && zone == Zone.LAND && top > grade + 1) {
					p.fill(x, grade + 1, z, x, top, z, Pal.CONCRETE);
				}
			}
		}
	}
}
