package dev.timeskip.sim.enderman;

import dev.timeskip.math.EndermanMath;
import dev.timeskip.math.Rng;
import dev.timeskip.scheduler.TickBudget;
import dev.timeskip.sim.LevelInfo;
import dev.timeskip.sim.SimContext;
import dev.timeskip.sim.block.ApplyContext;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;

/**
 * Endermen moving blocks, run on the main thread after every chunk has been aged.
 *
 * <p>Waiting until all chunks are planned does two things. The monster cap can be shared out
 * properly: a chunk's free endermen are {@code cap × share × spawnWeight / Σ spawnWeight} over the
 * level's spawning chunks, as vanilla's spawner fills the cap wherever spawn attempts succeed. And
 * every chunk was snapshotted before any enderman put a block into it, so the result does not
 * depend on thread timing.
 *
 * <p>Per chunk: pickups {@code M ~ Poisson(freeEndermanTicks × successPerTick)}; displaced blocks
 * {@code D(M₀ + M) − D(M₀)} with {@code D(m) = Dmax(1 − e^(−m/Dmax))}, {@code Dmax} =
 * {@code enderman_max_disturbed_percent} of the reachable holdables, and {@code M₀} the pickups the
 * chunk already had in earlier skips ({@link EndermanHistory}) — so the cap holds across many skips,
 * not just within one. Moves are applied in chunk order within the tick budget.
 */
public final class EndermanPhase {
    private static final long SALT = 0x454E4450L;

    private final SimContext sim;
    private final List<EndermanChunk> chunks = new ArrayList<>();
    private Map<LevelInfo, Double> weightSum;
    private EndermanHistory history;
    private int chunkCursor;
    private int moveCursor;
    /** Moves decided for the chunk at {@link #chunkCursor}, or -1 if not decided yet. */
    private int chunkMoves = -1;
    private ApplyContext ctx;

    public EndermanPhase(SimContext sim) {
        this.sim = sim;
    }

    /** Called in apply order as each chunk finishes (main thread). */
    public void add(EndermanChunk chunk) {
        chunks.add(chunk);
    }

    public int total() {
        return chunks.size();
    }

    public int done() {
        return chunkCursor;
    }

    /** Runs within the budget; true when finished. */
    public boolean step(TickBudget budget) {
        if (weightSum == null) {
            history = chunks.isEmpty() ? null : EndermanHistory.load(chunks.get(0).info().level.getServer());
            weightSum = new IdentityHashMap<>();
            for (EndermanChunk chunk : chunks) {
                weightSum.merge(chunk.info(), chunk.spawnWeight(), Double::sum);
            }
        }
        while (chunkCursor < chunks.size()) {
            if (budget.expired()) {
                return false;
            }
            EndermanChunk chunk = chunks.get(chunkCursor);
            if (chunkMoves < 0) {
                chunkMoves = decideMoves(chunk);
                moveCursor = 0;
                continue;
            }
            if (moveCursor >= chunkMoves) {
                chunkCursor++;
                chunkMoves = -1;
                continue;
            }
            if (ctx == null || ctx.info != chunk.info()) {
                ctx = new ApplyContext(sim, chunk.info());
            }
            int i = moveCursor++;
            EndermanMove.apply(ctx, chunk.targets()[i], chunk.feet()[i], EndermanPlacement.Wander.of(chunk.wander()[i]),
                    chunk.teleportChance());
        }
        save();
        return true;
    }

    /** Writes the enderman history for the chunks decided so far (also after a cancel). */
    public void save() {
        if (history != null) {
            history.save();
        }
    }

    /** How many of this chunk's candidates actually get moved. */
    private int decideMoves(EndermanChunk chunk) {
        double percent = sim.config.endermanMaxDisturbedPercent;
        if (chunk.targets().length == 0 || percent <= 0) {
            return 0;
        }
        LevelInfo info = chunk.info();
        double free = info.endermen.totalCap() * chunk.share() * chunk.spawnWeight() / weightSum.get(info);
        double perTick = EndermanMath.successPerTick(EndermanMath.TAKE_GOAL_CHANCE, chunk.meanPick());
        Rng rng = sim.rng(info, chunk.pos().getMinBlockX(), 3, chunk.pos().getMinBlockZ(), SALT);
        String dimension = info.level.dimension().identifier().toString();
        double earlier = history.earlierPickups(dimension, chunk.pos());
        long pickups = EndermanMath.poisson(free * perTick * info.ticks, rng);
        history.addPickups(dimension, chunk.pos(), pickups);
        double equilibrium = chunk.reachable() * percent / 100.0;
        long displaced = EndermanMath.randomRound(EndermanMath.displacedIncrement(earlier, pickups, equilibrium), rng);
        int moves = (int) Math.min(chunk.targets().length, displaced);
        if (EndermanPlacement.DEBUG) {
            EndermanPlacement.LOGGER.info("[Time Skip] enderman chunk {},{}: {} free endermen, pickup chance {}, {} reachable holdables, "
                            + "{} earlier pickups, {} new pickups -> {} displaced",
                    chunk.pos().x(), chunk.pos().z(), String.format("%.4f", free), String.format("%.4f", chunk.meanPick()),
                    chunk.reachable(), String.format("%.1f", earlier), pickups, moves);
        }
        return moves;
    }
}
