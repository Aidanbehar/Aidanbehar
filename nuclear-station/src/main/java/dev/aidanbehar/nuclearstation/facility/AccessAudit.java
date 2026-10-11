package dev.aidanbehar.nuclearstation.facility;

import dev.aidanbehar.nuclearstation.facility.layout.Blueprint;
import dev.aidanbehar.nuclearstation.facility.layout.Component;
import it.unimi.dsi.fastutil.ints.IntArrayFIFOQueue;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Consumer;
import net.minecraft.core.BlockPos;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.level.EmptyBlockGetter;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.DoorBlock;
import net.minecraft.world.level.block.FenceGateBlock;
import net.minecraft.world.level.block.SlabBlock;
import net.minecraft.world.level.block.StairBlock;
import net.minecraft.world.level.block.TrapDoorBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Development audit of the blueprint: paints the whole station into memory over flat
 * synthetic terrain, then flood-fills every place a player can walk, step up, climb a
 * ladder, swim or drop to, starting from all open-air ground. Standable space that cannot
 * be reached - a room without a door, a cut-off stair landing, a stair exit boxed in - is
 * reported grouped into connected pockets.
 */
public final class AccessAudit {
	private static final int GRADE = 68;
	private static final int SEA = 63;
	private static final int Y0 = GRADE - 40;
	private static final int H = 160;
	private static final int N = Blueprint.SIZE;
	private static final byte PASS = 1;
	private static final byte FLOOR = 2;
	private static final byte CLIMB = 4;
	private static final byte WATER = 8;
	private static final byte LOW = 16;
	private static final byte SEEN = 32;
	private static final byte POCKET = 64;
	private static final byte DOOR = (byte) 128;

	/** cells[chunkIndex][(y * 16 + lz) * 16 + lx] */
	private final byte[][] cells = new byte[Blueprint.CHUNKS * Blueprint.CHUNKS][];

	public record Pocket(String component, int x, int y, int z, int size, int minX, int minZ, int maxX, int maxZ, int minY, int maxY) {
		@Override
		public String toString() {
			return String.format("%s: %d cells, sample local (%d, grade%+d, %d), box x %d..%d z %d..%d y grade%+d..%+d",
				component, size, x, y - GRADE, z, minX, maxX, minZ, maxZ, minY - GRADE, maxY - GRADE);
		}
	}

	public static List<Pocket> run(int minSize) {
		return run(minSize, null);
	}

	/** Runs the audit; if mapDir is given, writes floor plans of every level that has unreachable pockets. */
	public static List<Pocket> run(int minSize, java.nio.file.Path mapDir) {
		AccessAudit a = new AccessAudit();
		a.paintAll();
		a.flood();
		List<Pocket> pockets = a.pockets(minSize);
		if (mapDir != null) {
			a.maps(pockets, mapDir);
		}
		return pockets;
	}

	private void maps(List<Pocket> pockets, java.nio.file.Path dir) {
		try {
			java.nio.file.Files.createDirectories(dir);
			try (var old = java.nio.file.Files.list(dir)) {
				for (java.nio.file.Path f : old.toList()) {
					java.nio.file.Files.deleteIfExists(f);
				}
			}
		} catch (java.io.IOException e) {
			return;
		}
		java.util.Set<String> done = new java.util.HashSet<>();
		for (Pocket pk : pockets) {
			Component c = component(pk.component());
			if (c == null) {
				continue;
			}
			for (int y = pk.minY(); y <= pk.maxY(); y++) {
				String key = c.name + "_" + (y - GRADE);
				if (!done.add(key)) {
					continue;
				}
				int m = 3;
				int x0 = Math.max(0, c.x0 - m);
				int z0 = Math.max(0, c.z0 - m);
				int x1 = Math.min(N - 1, c.x1 + m);
				int z1 = Math.min(N - 1, c.z1 + m);
				int sc = 6;
				var img = new java.awt.image.BufferedImage((x1 - x0 + 1) * sc, (z1 - z0 + 1) * sc, java.awt.image.BufferedImage.TYPE_INT_RGB);
				for (int x = x0; x <= x1; x++) {
					for (int z = z0; z <= z1; z++) {
						int rgb = colour(x, y, z);
						for (int i = 0; i < sc; i++) {
							for (int j = 0; j < sc; j++) {
								img.setRGB((x - x0) * sc + i, (z - z0) * sc + j, (i == 0 || j == 0) ? darker(rgb) : rgb);
							}
						}
					}
				}
				try {
					javax.imageio.ImageIO.write(img, "png", dir.resolve(String.format("%s_y%+d.png", c.name, y - GRADE)).toFile());
				} catch (java.io.IOException e) {
					return;
				}
			}
		}
	}

	private static int darker(int rgb) {
		return ((rgb >> 1) & 0x7F7F7F);
	}

	private int colour(int x, int y, int z) {
		byte c = at(x, y, z);
		boolean stand = standable(x, y, z);
		if (stand && (c & SEEN) != 0) {
			return (c & DOOR) != 0 ? 0x2E7D32 : 0x66BB6A; // reachable
		}
		if (stand) {
			return (c & DOOR) != 0 ? 0x8B0000 : 0xE53935; // unreachable
		}
		if ((c & DOOR) != 0) {
			return 0x8D6E63;
		}
		if ((c & CLIMB) != 0) {
			return 0xFF9800;
		}
		if ((c & WATER) != 0) {
			return 0x1E88E5;
		}
		if ((c & PASS) != 0) {
			byte below = at(x, y - 1, z);
			if ((below & LOW) != 0 && (below & FLOOR) != 0) {
				return 0xFDD835; // stairs / slab underfoot
			}
			return (below & PASS) != 0 ? 0x000000 : 0xF5F5F5; // void below / open
		}
		return (c & LOW) != 0 ? 0xC0A000 : 0x546E7A; // stair/slab block or solid
	}

	private static Component component(String name) {
		for (Component c : Blueprint.get().components()) {
			if (c.name.equals(name)) {
				return c;
			}
		}
		return null;
	}

	// ------------------------------------------------------------------ painting

	private void paintAll() {
		for (int cx = 0; cx < Blueprint.CHUNKS; cx++) {
			for (int cz = 0; cz < Blueprint.CHUNKS; cz++) {
				MemorySink sink = new MemorySink(cx, cz);
				Blueprint.get().paintChunk(sink, 0, 0, GRADE, SEA, cx, cz);
				byte[] c = new byte[16 * 16 * H];
				for (int i = 0; i < c.length; i++) {
					c[i] = classify(sink.state(i));
				}
				cells[cx * Blueprint.CHUNKS + cz] = c;
			}
		}
	}

	private static BlockState base(int y, int z) {
		if (z >= Blueprint.SEA_Z) {
			return y <= SEA - 15 ? Blocks.STONE.defaultBlockState() : (y <= SEA ? Blocks.WATER.defaultBlockState() : Blocks.AIR.defaultBlockState());
		}
		return y <= GRADE ? Blocks.STONE.defaultBlockState() : Blocks.AIR.defaultBlockState();
	}

	private static final class MemorySink implements BlockSink {
		final int cx;
		final int cz;
		final BlockState[] states = new BlockState[16 * 16 * H];

		MemorySink(int cx, int cz) {
			this.cx = cx;
			this.cz = cz;
		}

		int idx(int x, int y, int z) {
			int iy = y - Y0;
			return iy < 0 || iy >= H ? -1 : (iy * 16 + (z & 15)) * 16 + (x & 15);
		}

		BlockState state(int i) {
			BlockState s = states[i];
			if (s != null) {
				return s;
			}
			int y = i / 256 + Y0;
			int z = cz * 16 + (i / 16) % 16;
			return base(y, z);
		}

		@Override
		public BlockState get(int x, int y, int z) {
			int i = idx(x, y, z);
			return i < 0 ? base(y, z) : state(i);
		}

		@Override
		public void set(int x, int y, int z, BlockState state) {
			int i = idx(x, y, z);
			if (i >= 0) {
				states[i] = state;
			}
		}

		@Override
		public void configure(int x, int y, int z, Consumer<BlockEntity> action) {
		}

		@Override
		public int topY(int x, int z) {
			return z >= Blueprint.SEA_Z ? SEA : GRADE;
		}

		@Override
		public int minY() {
			return -64;
		}

		@Override
		public int maxY() {
			return 320;
		}
	}

	private static byte classify(BlockState s) {
		byte f = 0;
		if (s.is(BlockTags.CLIMBABLE)) {
			return (byte) (PASS | CLIMB);
		}
		if (!s.getFluidState().isEmpty() && s.getCollisionShape(EmptyBlockGetter.INSTANCE, BlockPos.ZERO).isEmpty()) {
			return (byte) (PASS | WATER);
		}
		if (s.getBlock() instanceof DoorBlock || s.getBlock() instanceof FenceGateBlock || s.getBlock() instanceof TrapDoorBlock) {
			return (byte) (PASS | DOOR);
		}
		VoxelShape shape = s.getCollisionShape(EmptyBlockGetter.INSTANCE, BlockPos.ZERO);
		if (shape.isEmpty()) {
			return PASS;
		}
		double top = shape.max(net.minecraft.core.Direction.Axis.Y);
		double bottom = shape.min(net.minecraft.core.Direction.Axis.Y);
		if (top > 1.0) {
			return 0; // fences, walls: barriers, not floors
		}
		if (bottom >= 0.75 && top >= 0.99) {
			// thin ceiling fittings (lamps) leave the space below open but are a floor on top
			f |= PASS;
		}
		if (top >= 0.49) {
			f |= FLOOR;
		}
		if (top <= 0.51 || s.getBlock() instanceof StairBlock || s.getBlock() instanceof SlabBlock) {
			f |= LOW;
		}
		return f;
	}

	// ------------------------------------------------------------------ access

	private byte at(int x, int y, int z) {
		if (x < 0 || z < 0 || x >= N || z >= N || y < Y0 || y >= Y0 + H) {
			// outside the station: open air above grade, ground below
			return y > GRADE ? PASS : FLOOR;
		}
		return cells[(x >> 4) * Blueprint.CHUNKS + (z >> 4)][((y - Y0) * 16 + (z & 15)) * 16 + (x & 15)];
	}

	private void mark(int x, int y, int z, byte bit) {
		cells[(x >> 4) * Blueprint.CHUNKS + (z >> 4)][((y - Y0) * 16 + (z & 15)) * 16 + (x & 15)] |= bit;
	}

	private boolean pass(int x, int y, int z) {
		return (at(x, y, z) & PASS) != 0;
	}

	private boolean standable(int x, int y, int z) {
		if (!pass(x, y, z) || !pass(x, y + 1, z)) {
			return false;
		}
		byte feet = at(x, y, z);
		byte below = at(x, y - 1, z);
		return (feet & (CLIMB | WATER)) != 0 || (below & FLOOR) != 0 && (below & PASS) == 0 || (below & CLIMB) != 0;
	}

	private static boolean inside(int x, int y, int z) {
		return x >= 0 && z >= 0 && x < N && z < N && y > Y0 && y < Y0 + H - 2;
	}

	private static int pack(int x, int y, int z) {
		return (x << 18) | (z << 8) | (y - Y0);
	}

	private void flood() {
		IntArrayFIFOQueue q = new IntArrayFIFOQueue();
		// seeds: open ground with nothing overhead
		for (int x = 0; x < N; x++) {
			for (int z = 0; z < N; z++) {
				int y = Y0 + H - 3;
				while (y > Y0 + 1 && pass(x, y, z)) {
					y--;
				}
				int feet = y + 1;
				if (inside(x, feet, z) && standable(x, feet, z) && (at(x, feet, z) & SEEN) == 0) {
					mark(x, feet, z, SEEN);
					q.enqueue(pack(x, feet, z));
				}
			}
		}
		int[] dx = {1, -1, 0, 0};
		int[] dz = {0, 0, 1, -1};
		while (!q.isEmpty()) {
			int p = q.dequeueInt();
			int x = p >>> 18;
			int z = (p >>> 8) & 1023;
			int y = (p & 255) + Y0;
			byte feet = at(x, y, z);
			for (int d = 0; d < 4; d++) {
				int nx = x + dx[d];
				int nz = z + dz[d];
				if (nx < 0 || nz < 0 || nx >= N || nz >= N) {
					continue;
				}
				if (pass(nx, y, nz) && pass(nx, y + 1, nz)) {
					// walk, or walk off an edge and fall
					int ny = y;
					// only drops a player can climb back up (one block) count: everything reachable
					// must also be leavable on foot
					while (ny > Y0 + 1 && !standable(nx, ny, nz) && pass(nx, ny - 1, nz) && y - ny < 1) {
						ny--;
					}
					visit(q, nx, ny, nz);
				} else if (pass(nx, y + 1, nz) && pass(nx, y + 2, nz) && (at(nx, y, nz) & FLOOR) != 0) {
					// step up onto a block, stair or slab
					boolean low = (at(nx, y, nz) & LOW) != 0;
					if (low || pass(x, y + 2, z)) {
						visit(q, nx, y + 1, nz);
					}
				}
			}
			// ladders and water: up and down
			if ((feet & (CLIMB | WATER)) != 0 || (at(x, y - 1, z) & CLIMB) != 0) {
				visit(q, x, y + 1, z);
			}
			if ((at(x, y - 1, z) & (CLIMB | WATER)) != 0 || (feet & (CLIMB | WATER)) != 0 && pass(x, y - 1, z)) {
				visit(q, x, y - 1, z);
			}
		}
	}

	private void visit(IntArrayFIFOQueue q, int x, int y, int z) {
		if (!inside(x, y, z) || (at(x, y, z) & SEEN) != 0 || !standable(x, y, z)) {
			return;
		}
		mark(x, y, z, SEEN);
		q.enqueue(pack(x, y, z));
	}

	// ------------------------------------------------------------------ report

	private List<Pocket> pockets(int minSize) {
		List<Pocket> out = new ArrayList<>();
		IntArrayFIFOQueue q = new IntArrayFIFOQueue();
		for (int x = 0; x < N; x++) {
			for (int z = 0; z < N; z++) {
				for (int y = Y0 + 2; y < Y0 + H - 2; y++) {
					byte c = at(x, y, z);
					if ((c & (SEEN | POCKET)) != 0 || !standable(x, y, z)) {
						continue;
					}
					int size = 0;
					int roofed = 0;
					int minX = x;
					int maxX = x;
					int minZ = z;
					int maxZ = z;
					int minY = y;
					int maxY = y;
					mark(x, y, z, POCKET);
					q.enqueue(pack(x, y, z));
					while (!q.isEmpty()) {
						int p = q.dequeueInt();
						int px = p >>> 18;
						int pz = (p >>> 8) & 1023;
						int py = (p & 255) + Y0;
						size++;
						if (ceiling(px, py, pz)) {
							roofed++;
						}
						minX = Math.min(minX, px);
						maxX = Math.max(maxX, px);
						minZ = Math.min(minZ, pz);
						maxZ = Math.max(maxZ, pz);
						minY = Math.min(minY, py);
						maxY = Math.max(maxY, py);
						for (int[] o : new int[][] {{1, 0, 0}, {-1, 0, 0}, {0, 0, 1}, {0, 0, -1}, {0, 1, 0}, {0, -1, 0}}) {
							int nx = px + o[0];
							int ny = py + o[1];
							int nz = pz + o[2];
							if (inside(nx, ny, nz) && (at(nx, ny, nz) & (SEEN | POCKET)) == 0 && standable(nx, ny, nz)) {
								mark(nx, ny, nz, POCKET);
								q.enqueue(pack(nx, ny, nz));
							}
						}
					}
					boolean water = (at(x, y, z) & WATER) != 0;
					boolean narrow = Math.min(maxX - minX, maxZ - minZ) + 1 < 3;
					// rooms have a ceiling; open surfaces under a tall hall roof are tops of machines or rooms
					boolean room = roofed * 2 >= size;
					if (size >= minSize && !water && !narrow && room) {
						out.add(new Pocket(componentAt(x, z), x, y, z, size, minX, minZ, maxX, maxZ, minY, maxY));
					}
				}
			}
		}
		out.sort(Comparator.comparingInt(Pocket::size).reversed());
		return out;
	}

	private boolean ceiling(int x, int y, int z) {
		for (int dy = 2; dy <= 12; dy++) {
			if (!pass(x, y + dy, z)) {
				return true;
			}
		}
		return false;
	}

	private static String componentAt(int x, int z) {
		String best = "site";
		int bestArea = Integer.MAX_VALUE;
		for (Component c : Blueprint.get().components()) {
			if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1) {
				int area = (c.x1 - c.x0) * (c.z1 - c.z0);
				if (area < bestArea) {
					bestArea = area;
					best = c.name;
				}
			}
		}
		return best;
	}
}
