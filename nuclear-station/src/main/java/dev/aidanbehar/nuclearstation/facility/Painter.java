package dev.aidanbehar.nuclearstation.facility;

import java.util.List;
import java.util.function.Consumer;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.DoorBlock;
import net.minecraft.world.level.block.HorizontalDirectionalBlock;
import net.minecraft.world.level.block.StairBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.DoorHingeSide;
import net.minecraft.world.level.block.state.properties.DoubleBlockHalf;
import net.minecraft.world.level.block.state.properties.Half;

/**
 * Draws the facility blueprint in local coordinates (x, z relative to the site origin,
 * y absolute), clipped to one chunk column. Every primitive only touches blocks inside
 * the clip region, so painting chunks in any order produces the same result and no
 * chunk writes into its neighbours.
 *
 * <p>In marker mode nothing is written; only {@link #marker} calls are recorded. This
 * lets the plant layer learn every lamp, panel and station position without
 * generating any chunks.
 */
public final class Painter {
	private final BlockSink sink;
	private final int originX;
	private final int originZ;
	private final int clipX0;
	private final int clipZ0;
	private final int clipX1;
	private final int clipZ1;
	private final int minY;
	private final int maxY;
	private final List<Marker> markers;
	private final boolean markerMode;
	public final int grade;
	public final int sea;

	public Painter(BlockSink sink, int originX, int originZ, int clipX0, int clipZ0, int clipX1, int clipZ1, int grade, int sea,
			List<Marker> markers, boolean markerMode) {
		this.sink = sink;
		this.originX = originX;
		this.originZ = originZ;
		this.clipX0 = clipX0;
		this.clipZ0 = clipZ0;
		this.clipX1 = clipX1;
		this.clipZ1 = clipZ1;
		this.minY = sink == null ? -64 : sink.minY();
		this.maxY = sink == null ? 319 : sink.maxY();
		this.grade = grade;
		this.sea = sea;
		this.markers = markers;
		this.markerMode = markerMode;
	}

	public boolean markerMode() {
		return markerMode;
	}

	// ------------------------------------------------------------------ clipping

	public boolean intersects(int x0, int z0, int x1, int z1) {
		return Math.max(x0, x1) >= clipX0 && Math.min(x0, x1) <= clipX1 && Math.max(z0, z1) >= clipZ0 && Math.min(z0, z1) <= clipZ1;
	}

	public boolean inClip(int x, int z) {
		return x >= clipX0 && x <= clipX1 && z >= clipZ0 && z <= clipZ1;
	}

	public int clipX0() {
		return clipX0;
	}

	public int clipZ0() {
		return clipZ0;
	}

	public int clipX1() {
		return clipX1;
	}

	public int clipZ1() {
		return clipZ1;
	}

	public BlockPos world(int x, int y, int z) {
		return new BlockPos(originX + x, y, originZ + z);
	}

	// ------------------------------------------------------------------ primitives

	public void set(int x, int y, int z, BlockState state) {
		if (markerMode || y < minY || y > maxY || !inClip(x, z)) {
			return;
		}
		sink.set(originX + x, y, originZ + z, state);
	}

	public BlockState get(int x, int y, int z) {
		return sink.get(originX + x, y, originZ + z);
	}

	public int topY(int x, int z) {
		return sink.topY(originX + x, originZ + z);
	}

	public void configure(int x, int y, int z, Consumer<BlockEntity> action) {
		if (markerMode || !inClip(x, z)) {
			return;
		}
		sink.configure(originX + x, y, originZ + z, action);
	}

	/** Solid box, inclusive coordinates in any order. */
	public void fill(int x0, int y0, int z0, int x1, int y1, int z1, BlockState state) {
		if (markerMode) {
			return;
		}
		int ax = Math.max(Math.min(x0, x1), clipX0);
		int bx = Math.min(Math.max(x0, x1), clipX1);
		int az = Math.max(Math.min(z0, z1), clipZ0);
		int bz = Math.min(Math.max(z0, z1), clipZ1);
		int ay = Math.max(Math.min(y0, y1), minY);
		int by = Math.min(Math.max(y0, y1), maxY);
		if (ax > bx || az > bz || ay > by) {
			return;
		}
		for (int x = ax; x <= bx; x++) {
			for (int z = az; z <= bz; z++) {
				for (int y = ay; y <= by; y++) {
					sink.set(originX + x, y, originZ + z, state);
				}
			}
		}
	}

	/** Horizontal slab at height y. */
	public void floor(int x0, int z0, int x1, int z1, int y, BlockState state) {
		fill(x0, y, z0, x1, y, z1, state);
	}

	/** Four walls of a rectangle (no floor or roof). */
	public void walls(int x0, int z0, int x1, int z1, int y0, int y1, BlockState state) {
		int ax = Math.min(x0, x1);
		int bx = Math.max(x0, x1);
		int az = Math.min(z0, z1);
		int bz = Math.max(z0, z1);
		fill(ax, y0, az, bx, y1, az, state);
		fill(ax, y0, bz, bx, y1, bz, state);
		fill(ax, y0, az, ax, y1, bz, state);
		fill(bx, y0, az, bx, y1, bz, state);
	}

	/** Hollow box: walls, floor and roof of the given state, interior cleared to air. */
	public void room(int x0, int y0, int z0, int x1, int y1, int z1, BlockState shell, BlockState air) {
		fill(x0, y0, z0, x1, y1, z1, shell);
		fill(Math.min(x0, x1) + 1, Math.min(y0, y1) + 1, Math.min(z0, z1) + 1, Math.max(x0, x1) - 1, Math.max(y0, y1) - 1, Math.max(z0, z1) - 1, air);
	}

	/** Solid vertical cylinder. */
	public void cylinder(double cx, double cz, double r, int y0, int y1, BlockState state) {
		ring(cx, cz, r, -1, y0, y1, state);
	}

	/** Vertical ring between radii rInner (exclusive) and rOuter (inclusive). rInner &lt; 0 = solid. */
	public void ring(double cx, double cz, double rOuter, double rInner, int y0, int y1, BlockState state) {
		if (markerMode) {
			return;
		}
		int ax = Math.max((int) Math.floor(cx - rOuter), clipX0);
		int bx = Math.min((int) Math.ceil(cx + rOuter), clipX1);
		int az = Math.max((int) Math.floor(cz - rOuter), clipZ0);
		int bz = Math.min((int) Math.ceil(cz + rOuter), clipZ1);
		if (ax > bx || az > bz) {
			return;
		}
		double ro2 = rOuter * rOuter;
		double ri2 = rInner < 0 ? -1 : rInner * rInner;
		for (int x = ax; x <= bx; x++) {
			for (int z = az; z <= bz; z++) {
				double dx = x + 0.5 - cx;
				double dz = z + 0.5 - cz;
				double d2 = dx * dx + dz * dz;
				if (d2 <= ro2 && d2 > ri2) {
					for (int y = Math.max(y0, minY); y <= Math.min(y1, maxY); y++) {
						sink.set(originX + x, y, originZ + z, state);
					}
				}
			}
		}
	}

	/** Solid horizontal cylinder lying along the x axis (turbine casings, tanks, heat exchangers). */
	public void cylinderX(int x0, int x1, double yc, double zc, double r, BlockState state) {
		if (markerMode) {
			return;
		}
		int az = Math.max((int) Math.floor(zc - r), clipZ0);
		int bz = Math.min((int) Math.ceil(zc + r), clipZ1);
		int ax = Math.max(Math.min(x0, x1), clipX0);
		int bx = Math.min(Math.max(x0, x1), clipX1);
		if (ax > bx || az > bz) {
			return;
		}
		double r2 = r * r;
		for (int z = az; z <= bz; z++) {
			for (int y = (int) Math.floor(yc - r); y <= (int) Math.ceil(yc + r); y++) {
				double dz = z + 0.5 - zc;
				double dy = y + 0.5 - yc;
				if (dz * dz + dy * dy <= r2 && y >= minY && y <= maxY) {
					for (int x = ax; x <= bx; x++) {
						sink.set(originX + x, y, originZ + z, state);
					}
				}
			}
		}
	}

	/** Solid horizontal cylinder lying along the z axis. */
	public void cylinderZ(int z0, int z1, double yc, double xc, double r, BlockState state) {
		if (markerMode) {
			return;
		}
		int ax = Math.max((int) Math.floor(xc - r), clipX0);
		int bx = Math.min((int) Math.ceil(xc + r), clipX1);
		int az = Math.max(Math.min(z0, z1), clipZ0);
		int bz = Math.min(Math.max(z0, z1), clipZ1);
		if (ax > bx || az > bz) {
			return;
		}
		double r2 = r * r;
		for (int x = ax; x <= bx; x++) {
			for (int y = (int) Math.floor(yc - r); y <= (int) Math.ceil(yc + r); y++) {
				double dx = x + 0.5 - xc;
				double dy = y + 0.5 - yc;
				if (dx * dx + dy * dy <= r2 && y >= minY && y <= maxY) {
					for (int z = az; z <= bz; z++) {
						sink.set(originX + x, y, originZ + z, state);
					}
				}
			}
		}
	}

	/** Solid sphere. */
	public void sphere(double cx, double cy, double cz, double r, BlockState state) {
		if (markerMode) {
			return;
		}
		int ax = Math.max((int) Math.floor(cx - r), clipX0);
		int bx = Math.min((int) Math.ceil(cx + r), clipX1);
		int az = Math.max((int) Math.floor(cz - r), clipZ0);
		int bz = Math.min((int) Math.ceil(cz + r), clipZ1);
		double r2 = r * r;
		for (int x = ax; x <= bx; x++) {
			for (int z = az; z <= bz; z++) {
				for (int y = Math.max((int) Math.floor(cy - r), minY); y <= Math.min((int) Math.ceil(cy + r), maxY); y++) {
					double dx = x + 0.5 - cx;
					double dy = y + 0.5 - cy;
					double dz = z + 0.5 - cz;
					if (dx * dx + dy * dy + dz * dz <= r2) {
						sink.set(originX + x, y, originZ + z, state);
					}
				}
			}
		}
	}

	/**
	 * Hemispherical (or ellipsoidal) dome shell centred at (cx, baseY, cz), radius r,
	 * vertical semi-axis h, thickness t. Interior cleared to air if {@code air} not null.
	 */
	public void dome(double cx, int baseY, double cz, double r, double h, double t, BlockState shell, BlockState air) {
		if (markerMode) {
			return;
		}
		int ax = Math.max((int) Math.floor(cx - r), clipX0);
		int bx = Math.min((int) Math.ceil(cx + r), clipX1);
		int az = Math.max((int) Math.floor(cz - r), clipZ0);
		int bz = Math.min((int) Math.ceil(cz + r), clipZ1);
		for (int x = ax; x <= bx; x++) {
			for (int z = az; z <= bz; z++) {
				double dx = (x + 0.5 - cx) / r;
				double dz = (z + 0.5 - cz) / r;
				double d2 = dx * dx + dz * dz;
				if (d2 > 1) {
					continue;
				}
				double outer = h * Math.sqrt(1 - d2);
				double ri = r - t;
				double hi = h - t;
				double dxi = (x + 0.5 - cx) / ri;
				double dzi = (z + 0.5 - cz) / ri;
				double di2 = dxi * dxi + dzi * dzi;
				double inner = di2 < 1 ? hi * Math.sqrt(1 - di2) : -1;
				int top = baseY + (int) Math.round(outer);
				int innerTop = inner < 0 ? baseY - 1 : baseY + (int) Math.round(inner);
				for (int y = baseY; y <= Math.min(top, maxY); y++) {
					if (y > innerTop) {
						sink.set(originX + x, y, originZ + z, shell);
					} else if (air != null) {
						sink.set(originX + x, y, originZ + z, air);
					}
				}
			}
		}
	}

	/**
	 * Natural-draft hyperboloid cooling tower shell. Radius varies from rBase at y0 to
	 * rThroat at the throat height and opens to rTop at y0 + height.
	 */
	public void hyperboloid(double cx, double cz, int y0, int height, double rBase, double rThroat, double rTop, int throat,
			double thickness, BlockState shell) {
		if (markerMode) {
			return;
		}
		double maxR = Math.max(rBase, rTop) + 1;
		if (!intersects((int) (cx - maxR), (int) (cz - maxR), (int) (cx + maxR), (int) (cz + maxR))) {
			return;
		}
		for (int dy = 0; dy <= height; dy++) {
			double r;
			if (dy <= throat) {
				double f = (double) (throat - dy) / throat;
				r = rThroat + (rBase - rThroat) * f * f;
			} else {
				double f = (double) (dy - throat) / (height - throat);
				r = rThroat + (rTop - rThroat) * f * f;
			}
			ring(cx, cz, r, r - thickness, y0 + dy, y0 + dy, shell);
		}
	}

	/** Radius of a hyperboloid tower at a height offset (same profile as {@link #hyperboloid}). */
	public static double towerRadius(int dy, int height, double rBase, double rThroat, double rTop, int throat) {
		if (dy <= throat) {
			double f = (double) (throat - dy) / throat;
			return rThroat + (rBase - rThroat) * f * f;
		}
		double f = (double) (dy - throat) / (height - throat);
		return rThroat + (rTop - rThroat) * f * f;
	}

	// ------------------------------------------------------------------ helpers for oriented blocks

	public static BlockState facing(Block block, Direction facing) {
		BlockState s = block.defaultBlockState();
		return s.hasProperty(HorizontalDirectionalBlock.FACING) ? s.setValue(HorizontalDirectionalBlock.FACING, facing) : s;
	}

	public static BlockState stairs(Block block, Direction facing, boolean top) {
		return block.defaultBlockState().setValue(StairBlock.FACING, facing).setValue(StairBlock.HALF, top ? Half.TOP : Half.BOTTOM);
	}

	/** Two-block door; facing is the direction a player walking through faces when entering. */
	public void door(int x, int y, int z, Block door, Direction facing) {
		BlockState lower = door.defaultBlockState().setValue(DoorBlock.FACING, facing).setValue(DoorBlock.HALF, DoubleBlockHalf.LOWER)
			.setValue(DoorBlock.HINGE, DoorHingeSide.LEFT);
		set(x, y, z, lower);
		set(x, y + 1, z, lower.setValue(DoorBlock.HALF, DoubleBlockHalf.UPPER));
	}

	/** Straight staircase climbing from (x,y,z) in direction dir for n steps, w wide (to the right). */
	public void staircase(int x, int y, int z, Direction dir, int steps, int width, Block stair, BlockState support) {
		Direction right = dir.getClockWise();
		for (int i = 0; i < steps; i++) {
			for (int w = 0; w < width; w++) {
				int px = x + dir.getStepX() * i + right.getStepX() * w;
				int pz = z + dir.getStepZ() * i + right.getStepZ() * w;
				set(px, y + i, pz, stairs(stair, dir, false));
				if (support != null && i > 0) {
					fill(px, y, pz, px, y + i - 1, pz, support);
				}
			}
		}
	}

	// ------------------------------------------------------------------ markers

	public void marker(MarkerType type, int x, int y, int z, int data) {
		if (markerMode && markers != null) {
			markers.add(new Marker(type, world(x, y, z), data));
		}
	}

	public void feature(Feature feature, int x, int y, int z) {
		marker(MarkerType.FEATURE, x, y, z, feature.ordinal());
	}
}
