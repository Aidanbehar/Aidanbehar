package dev.aidanbehar.nuclearstation.facility;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.config.ModConfig;
import dev.aidanbehar.nuclearstation.facility.layout.Blueprint;
import dev.aidanbehar.nuclearstation.plant.PlantWorldEffects;
import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import it.unimi.dsi.fastutil.longs.LongArrayFIFOQueue;
import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import java.util.Map;
import java.util.Optional;
import java.util.WeakHashMap;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerChunkEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLevelEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.FullChunkStatus;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.chunk.LevelChunk;

/**
 * Owns the canonical facility for each running server: selects and persists the site,
 * and builds facility chunks as they load, a few per tick within a time budget.
 *
 * <p>Generation is lazy and resumable. A chunk is painted only once it is a fully
 * generated, loaded chunk (so neighbouring world-generation features can no longer
 * write into it) and is then recorded in {@link FacilityData}. If the server stops
 * mid-way, unbuilt chunks are simply painted the next time they load. Painting is
 * idempotent, so a chunk saved after painting but before the record was saved is
 * repainted to the identical result.
 */
public final class FacilityManager {
	private static final Map<MinecraftServer, Context> CONTEXTS = new WeakHashMap<>();

	private FacilityManager() {
	}

	/** Runtime facility state for one server. */
	public static final class Context {
		public final ServerLevel level;
		public final FacilityData data;
		public final FacilityMarkers markers;
		private final LongArrayFIFOQueue queue = new LongArrayFIFOQueue();
		private final LongOpenHashSet queued = new LongOpenHashSet();
		private int forcedNext = -1;
		private long paintNanos;
		private int paintedThisSession;
		private int writesThisSession;

		Context(ServerLevel level, FacilityData data) {
			this.level = level;
			this.data = data;
			this.markers = new FacilityMarkers(Blueprint.get().collectMarkers(data.originX(), data.originZ(), data.grade(), data.sea()));
		}

		public int queuedChunks() {
			return queue.size();
		}

		public int paintedThisSession() {
			return paintedThisSession;
		}

		public double averagePaintMillis() {
			return paintedThisSession == 0 ? 0 : paintNanos / 1e6 / paintedThisSession;
		}

		public boolean forcedBuildActive() {
			return forcedNext >= 0;
		}

		public BlockPos centre() {
			return new BlockPos(data.originX() + Blueprint.SIZE / 2, data.grade(), data.originZ() + Blueprint.SIZE / 2);
		}

		/** Converts site-local coordinates to a world position. */
		public BlockPos local(int x, int y, int z) {
			return new BlockPos(data.originX() + x, y, data.originZ() + z);
		}

		public int localX(int worldX) {
			return worldX - data.originX();
		}

		public int localZ(int worldZ) {
			return worldZ - data.originZ();
		}

		public boolean inFootprint(BlockPos pos) {
			int lx = localX(pos.getX());
			int lz = localZ(pos.getZ());
			return lx >= 0 && lz >= 0 && lx < Blueprint.SIZE && lz < Blueprint.SIZE;
		}
	}

	public static Optional<Context> context(MinecraftServer server) {
		synchronized (CONTEXTS) {
			return Optional.ofNullable(CONTEXTS.get(server));
		}
	}

	public static void register() {
		ServerLevelEvents.LOAD.register(FacilityManager::onLevelLoad);
		ServerChunkEvents.CHUNK_LOAD.register(FacilityManager::onChunkLoad);
		ServerTickEvents.END_SERVER_TICK.register(FacilityManager::onServerTick);
		ServerLifecycleEvents.SERVER_STOPPED.register(server -> {
			synchronized (CONTEXTS) {
				CONTEXTS.remove(server);
			}
		});
	}

	private static void onLevelLoad(MinecraftServer server, ServerLevel level) {
		if (level.dimension() != Level.OVERWORLD) {
			return;
		}
		FacilityData data = FacilityData.get(level);
		if (!data.siteSelected()) {
			if (!ModConfig.get().facility.enabled) {
				NuclearStation.LOG.info("Facility generation disabled in configuration; no site selected");
				return;
			}
			SiteFinder.Site site = new SiteFinder(level).find(ModConfig.get());
			data.selectSite(site.originX(), site.originZ(), site.grade(), site.sea(), site.note());
			NuclearStation.LOG.info("Meridian Point site selected: origin ({}, {}), grade y={}, centre ({}, {}) - {}",
				site.originX(), site.originZ(), site.grade(), site.originX() + Blueprint.SIZE / 2, site.originZ() + Blueprint.SIZE / 2, site.note());
		} else {
			NuclearStation.LOG.info("Meridian Point site loaded: origin ({}, {}), {} of {} chunks built",
				data.originX(), data.originZ(), data.builtCount(), Blueprint.CHUNKS * Blueprint.CHUNKS);
		}
		long t = System.nanoTime();
		Context ctx = new Context(level, data);
		synchronized (CONTEXTS) {
			CONTEXTS.put(server, ctx);
		}
		NuclearStation.LOG.info("Facility blueprint: {} components, {} markers indexed in {} ms",
			Blueprint.get().components().size(), ctx.markers.total(), (System.nanoTime() - t) / 1_000_000);
	}

	private static void onChunkLoad(ServerLevel level, LevelChunk chunk, boolean generated) {
		if (level.dimension() != Level.OVERWORLD || !ModConfig.get().facility.enabled) {
			return;
		}
		Context ctx = context(level.getServer()).orElse(null);
		if (ctx == null) {
			return;
		}
		ChunkPos pos = chunk.getPos();
		int idx = ctx.data.index(pos.x(), pos.z());
		if (idx < 0) {
			return;
		}
		if (ctx.data.isBuilt(idx)) {
			PlantWorldEffects.syncChunk(level, ctx, pos.x(), pos.z());
			return;
		}
		if (ctx.data.isSkipped(idx)) {
			return;
		}
		long key = ChunkPos.pack(pos.x(), pos.z());
		if (ctx.queued.add(key)) {
			ctx.queue.enqueue(key);
		}
	}

	private static void onServerTick(MinecraftServer server) {
		Context ctx = context(server).orElse(null);
		if (ctx == null || !ModConfig.get().facility.enabled) {
			return;
		}
		long budget = ModConfig.get().facility.generationBudgetMs * 1_000_000L;
		long start = System.nanoTime();
		int checks = ctx.queue.size();
		while (checks-- > 0 && !ctx.queue.isEmpty() && System.nanoTime() - start < budget) {
			long key = ctx.queue.dequeueLong();
			int cx = ChunkPos.getX(key);
			int cz = ChunkPos.getZ(key);
			LevelChunk chunk = ctx.level.getChunkSource().getChunkNow(cx, cz);
			if (chunk == null) {
				// unloaded before we got to it: it will be queued again when it next loads
				ctx.queued.remove(key);
				continue;
			}
			boolean ready = chunk.getFullStatus().isOrAfter(FullChunkStatus.BLOCK_TICKING)
				|| ctx.level.getChunkSource().chunkMap.getPlayers(chunk.getPos(), false).isEmpty();
			if (!ready) {
				ctx.queue.enqueue(key);
				continue;
			}
			ctx.queued.remove(key);
			paint(ctx, chunk);
		}
		// forced build (development / testing): generate and paint every footprint chunk in turn
		while (ctx.forcedNext >= 0 && System.nanoTime() - start < budget) {
			int idx = ctx.forcedNext;
			if (idx >= Blueprint.CHUNKS * Blueprint.CHUNKS) {
				ctx.forcedNext = -1;
				NuclearStation.LOG.info("Forced facility build complete: {} chunks built", ctx.data.builtCount());
				break;
			}
			ctx.forcedNext++;
			if (ctx.data.isBuilt(idx)) {
				continue;
			}
			int cx = (ctx.data.originX() >> 4) + idx / Blueprint.CHUNKS;
			int cz = (ctx.data.originZ() >> 4) + idx % Blueprint.CHUNKS;
			LevelChunk chunk = ctx.level.getChunk(cx, cz);
			paint(ctx, chunk);
		}
	}

	/** Paints one chunk if it is still unbuilt. Returns true if painted. */
	public static boolean paint(Context ctx, LevelChunk chunk) {
		ChunkPos pos = chunk.getPos();
		int idx = ctx.data.index(pos.x(), pos.z());
		if (idx < 0 || ctx.data.isBuilt(idx)) {
			return false;
		}
		long protect = ModConfig.get().facility.protectInhabitedChunksTicks;
		if (protect > 0 && chunk.getInhabitedTime() > protect) {
			ctx.data.markSkipped(idx);
			NuclearStation.LOG.warn("Facility chunk {} skipped: chunk has {} ticks of player activity (protecting existing builds)",
				pos, chunk.getInhabitedTime());
			return false;
		}
		long t = System.nanoTime();
		LevelSink sink = new LevelSink(ctx.level, chunk);
		try {
			Blueprint.get().paintChunk(sink, ctx.data.originX(), ctx.data.originZ(), ctx.data.grade(), ctx.data.sea(),
				idx / Blueprint.CHUNKS, idx % Blueprint.CHUNKS);
		} catch (RuntimeException e) {
			NuclearStation.LOG.error("Failed to paint facility chunk {} - it will be retried on next load", pos, e);
			return false;
		}
		ctx.data.markBuilt(idx);
		long dt = System.nanoTime() - t;
		ctx.paintNanos += dt;
		ctx.paintedThisSession++;
		ctx.writesThisSession += sink.writes();
		RadiationManager.invalidateChunk(ctx.level, pos.x(), pos.z());
		PlantWorldEffects.syncChunk(ctx.level, ctx, pos.x(), pos.z());
		if (ModConfig.get().development.debugLogging || ctx.paintedThisSession % 256 == 0) {
			NuclearStation.LOG.info("Facility generation: {} chunks built ({} this session, avg {} ms, {} block writes)",
				ctx.data.builtCount(), ctx.paintedThisSession, String.format("%.1f", ctx.averagePaintMillis()), ctx.writesThisSession);
		}
		return true;
	}

	/** Development / testing: build every chunk of the footprint, generating terrain as needed. */
	public static void startForcedBuild(Context ctx) {
		ctx.forcedNext = 0;
	}

	/** Development only: mark every chunk unbuilt so it is painted again when next loaded. */
	public static void resetForRegeneration(Context ctx) {
		ctx.data.resetBuilt();
		ctx.queue.clear();
		ctx.queued.clear();
	}
}
