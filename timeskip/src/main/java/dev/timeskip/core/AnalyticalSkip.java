package dev.timeskip.core;

import dev.timeskip.TimeSkipMod;
import dev.timeskip.config.TimeSkipConfig;
import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.math.Rng;
import dev.timeskip.math.WeatherMath;
import dev.timeskip.scheduler.OrderedResults;
import dev.timeskip.scheduler.TickBudget;
import dev.timeskip.scheduler.WorkerPool;
import dev.timeskip.sim.LevelInfo;
import dev.timeskip.sim.SimContext;
import dev.timeskip.sim.block.ApplyContext;
import dev.timeskip.sim.enderman.EndermanPhase;
import dev.timeskip.sim.block.ChunkPlan;
import dev.timeskip.sim.block.ChunkPlanner;
import dev.timeskip.sim.block.ChunkSnapshot;
import dev.timeskip.sim.block.PlanAction;
import dev.timeskip.sim.block.PrecipitationSim;
import dev.timeskip.sim.blockentity.BlockEntitySimulator;
import dev.timeskip.sim.entity.EntitySimulator;
import dev.timeskip.sim.world.WorldStateSimulator;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import net.minecraft.network.protocol.game.ClientboundLevelChunkWithLightPacket;
import net.minecraft.resources.ResourceKey;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.chunk.LevelChunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Tier 2: the analytical fast-forward. A resumable state machine driven from the server tick:
 *
 * <pre>
 * COLLECT -> LOAD_EXTRA -> BLOCKS -> ENDERMEN -> BLOCK_ENTITIES -> ENTITIES -> WORLD -> RESEND -> SAVE -> DONE
 * </pre>
 *
 * In BLOCKS the main thread snapshots chunks and hands them to worker threads, which plan the
 * changes; finished plans come back in submission order and are applied within the tick budget.
 * Each chunk is applied completely before cancel is honoured, so the world is never half-aged.
 */
public final class AnalyticalSkip implements SkipJob {
    private static final Logger LOGGER = LoggerFactory.getLogger("timeskip");
    private static final int LOAD_TIMEOUT_TICKS = 20 * 30;
    private static final int LIGHT_WAIT_TICKS = 100;
    private static final int TICKET_RADIUS = 0;

    private enum Phase {
        COLLECT("Finding chunks"),
        LOAD_EXTRA("Loading nearby chunks"),
        BLOCKS("Aging blocks"),
        ENDERMEN("Endermen moving blocks"),
        BLOCK_ENTITIES("Running furnaces, hoppers and brewing stands"),
        ENTITIES("Aging animals, items and villagers"),
        WORLD("Moving the sun, moon and weather"),
        RESEND("Sending the new world to players"),
        SAVE("Saving the world"),
        DONE("Done");

        final String label;

        Phase(String label) {
            this.label = label;
        }
    }

    private record ChunkRef(LevelInfo info, ChunkPos pos) {
    }

    private final MinecraftServer server;
    private final TimeSkipConfig config;
    private final SkipStats stats;
    private final SimContext sim;
    private final WorkerPool workers;
    private final int maxInFlight;
    private final boolean frozeWorld;

    private Phase phase = Phase.COLLECT;
    private boolean cancelRequested;
    private boolean cancelled;
    private boolean closed;

    private final List<ChunkRef> chunks = new ArrayList<>();
    private final List<ChunkRef> pendingLoads = new ArrayList<>();
    private final List<ChunkRef> ticketed = new ArrayList<>();
    private final Set<ChunkRef> requestedLoads = new java.util.HashSet<>();
    private int loadTicks;
    private int snapshotCursor;
    private int applied;
    private final OrderedResults<ChunkPlan> results = new OrderedResults<>();
    private final Map<Integer, LevelInfo> infoBySequence = new LinkedHashMap<>();
    private ChunkPlan currentPlan;
    private ApplyContext currentCtx;
    private boolean currentEdge;
    private final Set<ChunkRef> touched = new LinkedHashSet<>();
    private final BlockEntitySimulator blockEntities;
    private final EntitySimulator entities;
    private final EndermanPhase endermen;
    private List<ChunkRef> resendList;
    private List<java.util.concurrent.CompletableFuture<?>> lightReady;
    private int resendCursor;
    private int lightWait;
    private final long[] phaseMaxNanos = new long[Phase.values().length];
    private final java.util.concurrent.atomic.LongAdder workerNanos = new java.util.concurrent.atomic.LongAdder();

    public AnalyticalSkip(MinecraftServer server, TimeSkipConfig config, SkipStats stats, long ticks) {
        this.server = server;
        this.config = config;
        this.stats = stats;
        ServerLevel overworld = server.overworld();
        long seedBase = Rng.seed(overworld.getSeed(), overworld.getGameTime(), ticks, config.seedSalt);
        WeatherMath.Result weather = WorldStateSimulator.planWeather(server, ticks, config.simulateWeather,
                new Rng(Rng.seed(seedBase, 0x57454154L)));
        Map<ResourceKey<Level>, LevelInfo> levels = new LinkedHashMap<>();
        for (ServerLevel level : server.getAllLevels()) {
            levels.put(level.dimension(), new LevelInfo(level, ticks,
                    WorldStateSimulator.endTimeOfDay(level, ticks), weather.rainingTicks(), config.simulateEndermen));
        }
        this.sim = new SimContext(config, stats, ticks, seedBase, weather, levels);
        int threads = config.effectiveWorkerThreads();
        this.workers = new WorkerPool(threads);
        this.maxInFlight = Math.max(32, threads * 16);
        this.blockEntities = new BlockEntitySimulator(sim);
        this.entities = new EntitySimulator(sim);
        this.endermen = new EndermanPhase(sim);

        boolean alreadyFrozen = server.tickRateManager().isFrozen();
        if (config.freezeWorldDuringSkip && !alreadyFrozen) {
            server.tickRateManager().setFrozen(true);
            this.frozeWorld = true;
        } else {
            this.frozeWorld = false;
        }
    }

    @Override
    public boolean tick(TickBudget budget) {
        Throwable failure = results.failure();
        if (failure != null) {
            LOGGER.error("[Time Skip] A worker thread failed; stopping the skip safely", failure);
            cancelRequested = true;
            cancelled = true;
            drainCurrentPlan();
            phase = Phase.RESEND;
        }
        while (budget.hasTime() && phase != Phase.DONE) {
            Phase before = phase;
            long phaseStart = System.nanoTime();
            switch (phase) {
                case COLLECT -> collect();
                case LOAD_EXTRA -> loadExtra();
                case BLOCKS -> blocks(budget);
                case ENDERMEN -> {
                    if (cancelRequested) {
                        skipToResend();
                    } else if (!config.simulateEndermen || endermen.step(budget)) {
                        phase = Phase.BLOCK_ENTITIES;
                    }
                }
                case BLOCK_ENTITIES -> {
                    if (cancelRequested) {
                        skipToResend();
                    } else if (!config.simulateBlockEntities || blockEntities.step(budget)) {
                        phase = Phase.ENTITIES;
                    }
                }
                case ENTITIES -> {
                    if (cancelRequested) {
                        skipToResend();
                    } else if (!config.simulateEntities || entities.step(budget)) {
                        phase = Phase.WORLD;
                    }
                }
                case WORLD -> {
                    if (cancelRequested) {
                        skipToResend();
                    } else {
                        WorldStateSimulator.apply(server, sim);
                        addInhabitedTime();
                        phase = Phase.RESEND;
                    }
                }
                case RESEND -> resend();
                case SAVE -> {
                    if (config.saveWorldWhenDone && !cancelled) {
                        server.saveEverything(true, false, false);
                    }
                    phase = Phase.DONE;
                }
                case DONE -> {
                }
            }
            long spent = System.nanoTime() - phaseStart;
            phaseMaxNanos[before.ordinal()] = Math.max(phaseMaxNanos[before.ordinal()], spent);
            if (phase == before && (phase == Phase.LOAD_EXTRA || phase == Phase.RESEND || phase == Phase.BLOCKS)) {
                break; // these phases wait on other threads or on time; continue next tick
            }
            if (phase == Phase.SAVE && before != Phase.SAVE) {
                break; // the world save is the single biggest step: give it a tick of its own
            }
        }
        if (phase == Phase.DONE) {
            close();
            logPhaseTimes();
            return true;
        }
        return false;
    }

    private void logPhaseTimes() {
        StringBuilder line = new StringBuilder();
        for (Phase p : Phase.values()) {
            if (phaseMaxNanos[p.ordinal()] > 0) {
                line.append(String.format("%s=%.1fms ", p.name(), phaseMaxNanos[p.ordinal()] / 1e6));
            }
        }
        LOGGER.info("[Time Skip] Longest single step per phase: {}", line.toString().trim());
        LOGGER.info("[Time Skip] Planning on {} worker thread(s): {} ms total, {} ms per chunk",
                sim.config.effectiveWorkerThreads(), String.format("%.0f", workerNanos.sum() / 1e6),
                String.format("%.2f", applied == 0 ? 0 : workerNanos.sum() / 1e6 / applied));
    }

    // --- COLLECT / LOAD_EXTRA ------------------------------------------------------------------

    private void collect() {
        Set<Long> seen = new java.util.HashSet<>();
        for (LevelInfo info : sim.levels.values()) {
            seen.clear();
            info.level.getChunkSource().chunkMap.forEachReadyToSendChunk(chunk -> {
                ChunkRef ref = new ChunkRef(info, chunk.getPos());
                chunks.add(ref);
                seen.add(chunk.getPos().pack());
            });
            if (config.extraChunkRadius > 0) {
                for (ServerPlayer player : info.level.players()) {
                    ChunkPos center = player.chunkPosition();
                    int r = config.extraChunkRadius + server.getPlayerList().getViewDistance();
                    for (int dx = -r; dx <= r; dx++) {
                        for (int dz = -r; dz <= r; dz++) {
                            ChunkPos pos = new ChunkPos(center.x() + dx, center.z() + dz);
                            if (seen.add(pos.pack())) {
                                pendingLoads.add(new ChunkRef(info, pos));
                            }
                        }
                    }
                }
            }
        }
        // Keep every chunk we are going to touch loaded until the skip ends.
        for (ChunkRef ref : chunks) {
            addTicket(ref);
        }
        phase = pendingLoads.isEmpty() ? Phase.BLOCKS : Phase.LOAD_EXTRA;
    }

    private void loadExtra() {
        int requested = 0;
        for (ChunkRef ref : pendingLoads) {
            if (!requestedLoads.contains(ref) && requested < config.maxChunksPerTickLoad) {
                requestedLoads.add(ref);
                addTicket(ref);
                requested++;
            }
        }
        pendingLoads.removeIf(ref -> {
            if (ref.info.level.getChunkSource().getChunkNow(ref.pos.x(), ref.pos.z()) != null) {
                chunks.add(ref);
                return true;
            }
            return false;
        });
        if (pendingLoads.isEmpty() || ++loadTicks > LOAD_TIMEOUT_TICKS || cancelRequested) {
            pendingLoads.clear();
            phase = Phase.BLOCKS;
        }
    }

    private void addTicket(ChunkRef ref) {
        ref.info.level.getChunkSource().addTicketWithRadius(TimeSkipMod.ticketType(), ref.pos, TICKET_RADIUS);
        ticketed.add(ref);
    }

    // --- BLOCKS --------------------------------------------------------------------------------

    private void blocks(TickBudget budget) {
        while (budget.hasTime()) {
            // 1) Keep the workers busy: snapshot more chunks while the pipeline has room.
            while (!cancelRequested && snapshotCursor < chunks.size() && results.inFlight() < maxInFlight && budget.hasTime()) {
                submitNextChunk();
            }

            // 2) A fully applied chunk still needs its per-chunk work (precipitation, bookkeeping).
            if (currentPlan != null && !currentPlan.hasNext()) {
                finishChunk();
                continue;
            }

            // 3) Apply the next finished plan (strictly in order).
            if (currentPlan == null) {
                int sequence = results.taken();
                ChunkPlan next = results.poll();
                if (next == null) {
                    if (results.inFlight() == 0) {
                        break; // nothing submitted and nothing pending
                    }
                    // Workers are still planning: wait inside our budget rather than ending the tick.
                    results.awaitNext(Math.min(budget.remainingNanos(), 2_000_000L));
                    continue;
                }
                currentPlan = next;
                currentCtx = new ApplyContext(sim, infoBySequence.remove(sequence));
                currentEdge = !neighboursLoaded(currentCtx.level, next.pos());
            }
            int work = 0;
            while (currentPlan.hasNext()) {
                PlanAction action = currentPlan.next();
                if (currentEdge && !action.local()) {
                    continue;
                }
                action.apply(currentCtx);
                // Checking the clock is cheap but not free: check every few cheap actions, and
                // after every expensive one (trees, vanilla replays).
                work += action.cost();
                if (work >= 16) {
                    work = 0;
                    if (budget.expired()) {
                        break;
                    }
                }
            }
        }

        boolean allSubmitted = cancelRequested || snapshotCursor >= chunks.size();
        if (allSubmitted && currentPlan == null && results.allTaken()) {
            if (cancelRequested) {
                cancelled = true;
                phase = Phase.RESEND;
            } else {
                phase = Phase.ENDERMEN;
            }
        }
    }

    private void submitNextChunk() {
        ChunkRef ref = chunks.get(snapshotCursor++);
        LevelChunk chunk = ref.info.level.getChunkSource().getChunkNow(ref.pos.x(), ref.pos.z());
        if (chunk == null) {
            return;
        }
        ChunkSnapshot snapshot = ChunkSnapshot.capture(ref.info, chunk);
        int sequence = results.reserve();
        infoBySequence.put(sequence, ref.info);
        workers.submit(() -> {
            try {
                long t0 = System.nanoTime();
                ChunkPlan plan = ChunkPlanner.plan(sim, snapshot);
                workerNanos.add(System.nanoTime() - t0);
                results.complete(sequence, plan);
            } catch (Throwable t) {
                results.fail(t);
            }
        });
    }

    private void finishChunk() {
        ChunkPlan plan = currentPlan;
        ApplyContext ctx = currentCtx;
        currentPlan = null;
        currentCtx = null;
        LevelChunk chunk = ctx.level.getChunkSource().getChunkNow(plan.pos().x(), plan.pos().z());
        if (chunk == null) {
            return;
        }
        if (config.simulatePrecipitation && !currentEdgeOf(ctx, plan)) {
            PrecipitationSim.apply(ctx, plan.pos());
        }
        if (plan.size() > 0 || ctx.takeChanged()) {
            touched.add(new ChunkRef(ctx.info, plan.pos()));
            chunk.markUnsaved();
        }
        if (config.simulateBlockEntities) {
            blockEntities.collect(ctx.info, chunk);
        }
        if (plan.endermen != null) {
            endermen.add(plan.endermen);
        }
        applied++;
        stats.inc(Stat.CHUNKS_AGED);
    }

    private boolean currentEdgeOf(ApplyContext ctx, ChunkPlan plan) {
        return !neighboursLoaded(ctx.level, plan.pos());
    }

    /** True if the 3x3 chunks around this one are loaded. */
    private static boolean neighboursLoaded(ServerLevel level, ChunkPos pos) {
        int minX = pos.getMinBlockX();
        int minZ = pos.getMinBlockZ();
        return ApplyContext.chunksLoaded(level, minX - 16, minZ - 16, minX + 31, minZ + 31);
    }

    /** Finishes the chunk being applied so a cancel never leaves one half-aged. */
    private void drainCurrentPlan() {
        if (currentPlan != null) {
            while (currentPlan.hasNext()) {
                PlanAction action = currentPlan.next();
                if (!currentEdge || action.local()) {
                    action.apply(currentCtx);
                }
            }
            finishChunk();
        }
    }

    private void skipToResend() {
        cancelled = true;
        phase = Phase.RESEND;
    }

    // --- WORLD helpers -------------------------------------------------------------------------

    private void addInhabitedTime() {
        if (!config.addInhabitedTime) {
            return;
        }
        int range = 8;
        for (ChunkRef ref : chunks) {
            boolean nearPlayer = false;
            for (ServerPlayer player : ref.info.level.players()) {
                ChunkPos p = player.chunkPosition();
                if (Math.abs(p.x() - ref.pos.x()) <= range && Math.abs(p.z() - ref.pos.z()) <= range) {
                    nearPlayer = true;
                    break;
                }
            }
            if (!nearPlayer) {
                continue;
            }
            LevelChunk chunk = ref.info.level.getChunkSource().getChunkNow(ref.pos.x(), ref.pos.z());
            if (chunk != null) {
                long inhabited = chunk.getInhabitedTime();
                long added = inhabited + sim.ticks;
                chunk.setInhabitedTime(added < inhabited ? Long.MAX_VALUE : added);
                chunk.markUnsaved();
            }
        }
    }

    // --- RESEND --------------------------------------------------------------------------------

    private void resend() {
        if (resendList == null) {
            // Ask the light engine to tell us when each changed chunk's lighting is final, so
            // clients receive correct light (vanilla's chunk sender waits the same way).
            resendList = new ArrayList<>(touched);
            lightReady = new ArrayList<>(resendList.size());
            for (ChunkRef ref : resendList) {
                lightReady.add(ref.info.level.getChunkSource().getLightEngine().waitForPendingTasks(ref.pos.x(), ref.pos.z()));
            }
        }
        int sent = 0;
        while (resendCursor < resendList.size() && sent < config.chunkResendsPerTick) {
            if (!lightReady.get(resendCursor).isDone() && lightWait < LIGHT_WAIT_TICKS) {
                lightWait++;
                return; // try again next tick
            }
            ChunkRef ref = resendList.get(resendCursor++);
            ServerLevel level = ref.info.level;
            LevelChunk chunk = level.getChunkSource().getChunkNow(ref.pos.x(), ref.pos.z());
            if (chunk == null) {
                continue;
            }
            List<ServerPlayer> players = level.getChunkSource().chunkMap.getPlayers(ref.pos, false);
            if (players.isEmpty()) {
                continue;
            }
            ClientboundLevelChunkWithLightPacket packet =
                    new ClientboundLevelChunkWithLightPacket(chunk, level.getLightEngine(), null, null);
            for (ServerPlayer player : players) {
                player.connection.send(packet);
            }
            sent++;
        }
        if (resendCursor >= resendList.size()) {
            phase = Phase.SAVE;
        }
    }

    // --- SkipJob -------------------------------------------------------------------------------

    @Override
    public float progress() {
        return switch (phase) {
            case COLLECT, LOAD_EXTRA -> 0.02F;
            case BLOCKS -> 0.03F + 0.67F * (chunks.isEmpty() ? 1.0F : (float) applied / chunks.size());
            case ENDERMEN -> 0.70F + 0.05F * fraction(endermen.done(), endermen.total());
            case BLOCK_ENTITIES -> 0.75F + 0.08F * fraction(blockEntities.done(), blockEntities.total());
            case ENTITIES -> 0.83F + 0.08F * fraction(entities.done(), entities.total());
            case WORLD -> 0.92F;
            case RESEND -> 0.93F + 0.05F * (resendList == null ? 0 : fraction(resendCursor, resendList.size()));
            case SAVE -> 0.99F;
            case DONE -> 1.0F;
        };
    }

    private static float fraction(int done, int total) {
        return total <= 0 ? 0.0F : Math.min(1.0F, (float) done / total);
    }

    @Override
    public String phase() {
        if (phase == Phase.BLOCKS) {
            return String.format("%s (%,d / %,d chunks)", phase.label, applied, chunks.size());
        }
        return phase.label;
    }

    @Override
    public void requestCancel() {
        cancelRequested = true;
    }

    @Override
    public boolean cancelled() {
        return cancelled;
    }

    @Override
    public String detail() {
        if (cancelled) {
            return String.format("Cancelled: %,d of %,d chunks had been aged; the world clock was not moved.", applied, chunks.size());
        }
        return String.format("Aged %,d chunks.", applied);
    }

    /** Immediate stop (server shutting down): finish the current chunk, release everything. */
    public void abort() {
        cancelRequested = true;
        cancelled = true;
        drainCurrentPlan();
        close();
    }

    @Override
    public void close() {
        endermen.save();
        if (closed) {
            return;
        }
        closed = true;
        workers.close();
        for (ChunkRef ref : ticketed) {
            ref.info.level.getChunkSource().removeTicketWithRadius(TimeSkipMod.ticketType(), ref.pos, TICKET_RADIUS);
        }
        ticketed.clear();
        if (frozeWorld) {
            server.tickRateManager().setFrozen(false);
        }
    }
}
