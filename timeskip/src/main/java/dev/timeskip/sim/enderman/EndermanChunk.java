package dev.timeskip.sim.enderman;

import dev.timeskip.sim.LevelInfo;
import net.minecraft.world.level.ChunkPos;

/**
 * What the enderman planner found in one chunk (made on a worker, used on the main thread once
 * every chunk has been planned, when the monster cap can be shared out between chunks).
 *
 * @param spawnWeight   summed spawn weight of the chunk's standing spots within spawn range of a
 *                      player: how often a monster spawn attempt succeeds here, relative to other chunks
 * @param players       players whose local monster cap counts this chunk
 * @param share         enderman share of the monsters spawning here
 * @param meanPick      pickup success per attempt, averaged over the spots by weight
 * @param reachable     holdable blocks some spot can reach
 * @param teleportChance chance an open-sky carrier here teleports before placing (dawn or rain)
 * @param targets       candidate pickups in random order (distinct; take a prefix)
 * @param feet          where the enderman stood for each candidate
 * @param wander        how that enderman moves before placing ({@link EndermanPlacement.Wander} ordinal)
 */
public record EndermanChunk(LevelInfo info, ChunkPos pos, double spawnWeight, int[] players, double share, double meanPick,
                            int reachable, double teleportChance, long[] targets, long[] feet, byte[] wander) {
    static final long[] NO_LONGS = new long[0];
    static final byte[] NO_BYTES = new byte[0];

    /** A chunk where monsters spawn (so it takes part of the cap) but endermen can't move anything. */
    static EndermanChunk spawnOnly(LevelInfo info, ChunkPos pos, double spawnWeight, int[] players) {
        return new EndermanChunk(info, pos, spawnWeight, players, 0.0, 0.0, 0, 0.0, NO_LONGS, NO_LONGS, NO_BYTES);
    }
}
