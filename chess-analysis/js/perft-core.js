// Exact enumeration of legal move sequences ("perft") using chess.js's legal
// move generator. Counts are accumulated as BigInt so no precision is lost.
//
//   N_1(P) = |L(P)|
//   N_d(P) = sum over m in L(P) of N_{d-1}(P_m)
//
// Terminal positions (checkmate, stalemate) have no legal moves, so their
// branches contribute 0 sequences of any further length. Draw rules (fifty
// moves, repetition, insufficient material) do NOT end a branch here: those
// draws must be claimed and the moves remain legal, matching standard perft.
import { Chess } from '../vendor/chess.js';

/**
 * Legal moves of the current chess.js position, from the library's own legal
 * generator (the same one behind chess.moves()). Internal API of the vendored,
 * pinned chess.js 1.4.0, used because building SAN for every node would be
 * ~20x slower; tests cross-check it against chess.moves() and published perft.
 */
function legalMoves(chess) { return chess._moves({ legal: true }); }

/**
 * Count legal move sequences of exactly `depth` plies from `fen`.
 * Returns { total: BigInt, divide: [{ san, uci, count: BigInt }], nodes }.
 * `onProgress({ done, total, move, partial })` is called after each root move.
 */
export function countSequences(fen, depth, onProgress) {
  if (!Number.isInteger(depth) || depth < 0) throw new Error('Depth must be a non-negative integer');
  const chess = new Chess(fen);
  if (depth === 0) return { total: 1n, divide: [], nodes: 1 };
  let nodes = 0;
  const rec = (d) => {
    const moves = legalMoves(chess);
    nodes++;
    if (d === 1) return BigInt(moves.length);
    let sum = 0n;
    for (let i = 0; i < moves.length; i++) {
      chess._makeMove(moves[i]);
      sum += rec(d - 1);
      chess._undoMove();
    }
    return sum;
  };
  const rootVerbose = chess.moves({ verbose: true });
  const rootRaw = legalMoves(chess);
  if (rootVerbose.length !== rootRaw.length) throw new Error('Move generator mismatch');
  const divide = [];
  let total = 0n;
  for (let i = 0; i < rootRaw.length; i++) {
    const mv = rootVerbose.find((v) => v.lan === lanOf(rootRaw[i]));
    chess._makeMove(rootRaw[i]);
    const count = depth === 1 ? 1n : rec(depth - 1);
    chess._undoMove();
    total += count;
    divide.push({ san: mv.san, uci: mv.lan, count });
    if (onProgress) onProgress({ done: i + 1, total: rootRaw.length, move: mv.san, partial: total, nodes });
  }
  return { total, divide, nodes };
}

const SQ = (i) => 'abcdefgh'[i & 15] + (8 - (i >> 4)); // chess.js 0x88 index -> square
function lanOf(m) {
  return SQ(m.from) + SQ(m.to) + (m.promotion || '');
}

/** Format a BigInt with thin grouping separators without changing its value. */
export function formatBig(n) {
  const s = BigInt(n).toString();
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
