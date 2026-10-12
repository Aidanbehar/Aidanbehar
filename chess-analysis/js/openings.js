// Opening identification from the actual move sequence, using the locally
// stored Lichess chess-openings database (CC0).
import { isStandardStart, positionKey } from './chess-util.js';

export class OpeningBook {
  constructor(data) {
    if (!data || !Array.isArray(data.entries) || !data.entries.length) throw new Error('Opening database is empty or malformed.');
    this.meta = { source: data.source, license: data.license, revision: data.revision, count: data.entries.length };
    this.entries = data.entries.map((e) => {
      const [family, variation] = splitName(e.name);
      return { ...e, family, variation, plies: e.uci.split(' ').length };
    });
    this.bySeq = new Map(); // "e2e4 e7e5" -> entry
    this.prefixes = new Map(); // "e2e4" -> number of entries continuing it
    this.byKey = new Map(); // position key -> [entries]
    for (const e of this.entries) {
      this.bySeq.set(e.uci, e);
      const parts = e.uci.split(' ');
      for (let i = 1; i < parts.length; i++) {
        const p = parts.slice(0, i).join(' ');
        this.prefixes.set(p, (this.prefixes.get(p) || 0) + 1);
      }
      if (!this.byKey.has(e.key)) this.byKey.set(e.key, []);
      this.byKey.get(e.key).push(e);
    }
  }

  static async load(url = 'data/openings.json') {
    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      throw new Error(`Opening database could not be loaded (${e.message}).`);
    }
    if (!res.ok) throw new Error(`Opening database missing: ${url} returned HTTP ${res.status}.`);
    return new OpeningBook(await res.json());
  }

  /**
   * Identify the opening of a game from its move sequence.
   *   startFen : starting position of the game
   *   moves    : UCI moves from the start up to the current position
   *   fen      : current position (used only for transposition detection)
   * Returns {
   *   status: 'start' | 'exact' | 'classified' | 'none' | 'not-applicable',
   *   entry,           // deepest database line that is a prefix of the moves
   *   matchedPlies,    // length of that line
   *   inBook,          // moves so far are still a prefix of some database line
   *   continuations,   // database lines one ply deeper (for "book moves")
   *   transposition,   // entry whose final position equals the current one (different order)
   * }
   */
  identify(startFen, moves, fen) {
    if (!isStandardStart(startFen)) return { status: 'not-applicable' };
    if (!moves.length) return { status: 'start', inBook: true, continuations: this.continuations([]) };
    let entry = null;
    let matchedPlies = 0;
    for (let i = 1; i <= moves.length; i++) {
      const seq = moves.slice(0, i).join(' ');
      const e = this.bySeq.get(seq);
      if (e) { entry = e; matchedPlies = i; }
      else if (!this.prefixes.has(seq)) break;
    }
    const full = moves.join(' ');
    const exact = this.bySeq.get(full) || null;
    const inBook = !!exact || this.prefixes.has(full);
    let transposition = null;
    if (fen) {
      const cands = (this.byKey.get(positionKey(fen)) || []).filter((e) => e.uci !== full);
      if (cands.length && !exact) transposition = cands.sort((a, b) => b.plies - a.plies)[0];
    }
    const status = exact ? 'exact' : entry ? 'classified' : 'none';
    return { status, entry: exact || entry, matchedPlies: exact ? moves.length : matchedPlies, inBook, continuations: inBook ? this.continuations(moves) : [], transposition };
  }

  /** Database lines that extend `moves` by exactly one ply. */
  continuations(moves) {
    const base = moves.join(' ');
    const out = new Map();
    for (const e of this.entries) {
      const parts = e.uci.split(' ');
      if (parts.length <= moves.length) continue;
      if (moves.length && !e.uci.startsWith(base + ' ')) continue;
      const next = parts[moves.length];
      const named = this.bySeq.get(parts.slice(0, moves.length + 1).join(' '));
      const prev = out.get(next);
      if (!prev) out.set(next, { uci: next, entry: named || null, lines: 1 });
      else prev.lines++;
    }
    return [...out.values()].sort((a, b) => b.lines - a.lines);
  }

  search(query, limit = 60) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.entries.filter((e) => e.name.toLowerCase().includes(q) || e.eco.toLowerCase() === q || e.pgn.toLowerCase().includes(q)).slice(0, limit);
  }
}

export function splitName(name) {
  const i = name.indexOf(':');
  if (i < 0) return [name, ''];
  return [name.slice(0, i).trim(), name.slice(i + 1).trim()];
}
