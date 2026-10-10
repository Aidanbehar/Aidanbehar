package dev.aidanbehar.nuclearstation.facility.layout;

import dev.aidanbehar.nuclearstation.facility.Painter;

/**
 * One building or piece of site infrastructure. Bounds are local (site) coordinates,
 * inclusive; the blueprint uses them to decide which chunks a component touches.
 * {@link #paint} must draw only through the painter so output is clipped per chunk.
 */
public abstract class Component {
	public final String name;
	public final int x0;
	public final int z0;
	public final int x1;
	public final int z1;

	protected Component(String name, int x0, int z0, int x1, int z1) {
		this.name = name;
		this.x0 = Math.min(x0, x1);
		this.z0 = Math.min(z0, z1);
		this.x1 = Math.max(x0, x1);
		this.z1 = Math.max(z0, z1);
	}

	public abstract void paint(Painter p, Kit k);

	/** Deterministic per-component random seed: identical in every world. */
	protected long seed() {
		return name.hashCode() * 0x9E3779B97F4A7C15L;
	}
}
