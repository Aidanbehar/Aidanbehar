package dev.aidanbehar.nuclearstation.facility.layout;

import dev.aidanbehar.nuclearstation.facility.Painter;
import java.util.ArrayList;
import java.util.List;

/**
 * Outdoor emergency sirens spread over the site on open ground, so that the whole station
 * and its approaches can hear them. Positions are chosen deterministically from a grid,
 * skipping anything that would land on or beside another component.
 */
final class SirenNetwork extends Component {
	static final int HEIGHT = 12;
	private final List<int[]> masts = new ArrayList<>();

	SirenNetwork(List<Component> others) {
		super("siren_network", 0, 0, Blueprint.SIZE - 1, Blueprint.SHORE_Z);
		int[] xs = {90, 290, 500, 700, 900};
		int[] zs = {120, 300, 520, 700, 850};
		for (int gx : xs) {
			for (int gz : zs) {
				int[] spot = freeSpot(others, gx, gz);
				if (spot != null) {
					masts.add(spot);
				}
			}
		}
	}

	private static int[] freeSpot(List<Component> others, int gx, int gz) {
		for (int r = 0; r <= 40; r += 8) {
			for (int[] o : new int[][] {{0, 0}, {r, 0}, {-r, 0}, {0, r}, {0, -r}, {r, r}, {-r, -r}, {r, -r}, {-r, r}}) {
				int x = gx + o[0];
				int z = gz + o[1];
				if (x < 30 || z < 30 || x > Blueprint.SIZE - 30 || z > Blueprint.SHORE_Z - 8 || blocked(others, x, z)) {
					continue;
				}
				return new int[] {x, z};
			}
		}
		return null;
	}

	private static boolean blocked(List<Component> others, int x, int z) {
		for (Component c : others) {
			long area = (long) (c.x1 - c.x0) * (c.z1 - c.z0);
			if (area > 200_000) {
				continue; // site-wide components (tunnels underground, perimeter fence)
			}
			if (x >= c.x0 - 4 && x <= c.x1 + 4 && z >= c.z0 - 4 && z <= c.z1 + 4) {
				return true;
			}
		}
		return false;
	}

	List<int[]> masts() {
		return masts;
	}

	@Override
	public void paint(Painter p, Kit k) {
		for (int[] m : masts) {
			k.sirenMast(m[0], m[1], HEIGHT);
		}
	}
}
