// Rule-based checks used to verify Learning Center exercises. Everything here
// is computed from the position with chess.js; nothing is a hard-coded answer.
import { Chess, FILES, squareCoords, parseUci } from './chess-util.js';

const ALL_SQUARES = [];
for (let r = 1; r <= 8; r++) for (const f of FILES) ALL_SQUARES.push(f + r);

function pawns(chess, color) {
  return chess.findPiece({ type: 'p', color });
}

/** Squares attacked by at least one pawn of `color`. */
export function pawnAttacks(chess, color) {
  const out = new Set();
  for (const sq of pawns(chess, color)) {
    const { file, rank } = squareCoords(sq);
    const r = rank + (color === 'w' ? 1 : -1);
    if (r < 0 || r > 7) continue;
    if (file > 0) out.add(FILES[file - 1] + (r + 1));
    if (file < 7) out.add(FILES[file + 1] + (r + 1));
  }
  return out;
}

/** True if no pawn of `enemy` can ever attack `sq` (no enemy pawn on an adjacent file that can still advance to attack it). */
export function safeFromPawns(chess, sq, enemy) {
  const { file, rank } = squareCoords(sq);
  for (const p of pawns(chess, enemy)) {
    const c = squareCoords(p);
    if (Math.abs(c.file - file) !== 1) continue;
    // Black pawns move down: a black pawn above `sq` can still come to attack it.
    if (enemy === 'b' && c.rank > rank) return false;
    if (enemy === 'w' && c.rank < rank) return false;
  }
  return true;
}

/** Outpost squares for `color`: in the 4th–6th rank zone (from color's side), protected by an own pawn, never attackable by enemy pawns. */
export function outposts(chess, color) {
  const enemy = color === 'w' ? 'b' : 'w';
  const prot = pawnAttacks(chess, color);
  return ALL_SQUARES.filter((sq) => {
    const { rank } = squareCoords(sq);
    const rel = color === 'w' ? rank + 1 : 8 - rank;
    if (rel < 4 || rel > 6) return false;
    const pc = chess.get(sq);
    if (pc && pc.type === 'p') return false;
    return prot.has(sq) && safeFromPawns(chess, sq, enemy);
  });
}

export function isolatedPawns(chess, color) {
  const ps = pawns(chess, color);
  const files = new Set(ps.map((s) => squareCoords(s).file));
  return ps.filter((s) => { const f = squareCoords(s).file; return !files.has(f - 1) && !files.has(f + 1); });
}

export function doubledPawns(chess, color) {
  const ps = pawns(chess, color);
  const count = {};
  for (const s of ps) count[s[0]] = (count[s[0]] || 0) + 1;
  return ps.filter((s) => count[s[0]] > 1);
}

export function passedPawns(chess, color) {
  const enemy = color === 'w' ? 'b' : 'w';
  const ep = pawns(chess, enemy).map(squareCoords);
  return pawns(chess, color).filter((s) => {
    const { file, rank } = squareCoords(s);
    return !ep.some((e) => Math.abs(e.file - file) <= 1 && (color === 'w' ? e.rank > rank : e.rank < rank));
  });
}

/** Files with no pawns at all. */
export function openFiles(chess) {
  const all = [...pawns(chess, 'w'), ...pawns(chess, 'b')].map((s) => s[0]);
  return [...FILES].filter((f) => !all.includes(f));
}

/** Pieces of `color` (not the king) attacked by the opponent and not defended by any own piece. */
export function hangingPieces(chess, color) {
  const enemy = color === 'w' ? 'b' : 'w';
  const out = [];
  for (const sq of ALL_SQUARES) {
    const p = chess.get(sq);
    if (!p || p.color !== color || p.type === 'k') continue;
    if (chess.attackers(sq, enemy).length && !chess.attackers(sq, color).length) out.push(sq);
  }
  return out;
}

/** Number of pseudo-mobility squares for each piece of the side to move (legal moves per piece). */
export function mobility(chess) {
  const m = new Map();
  for (const mv of chess.moves({ verbose: true })) m.set(mv.from, (m.get(mv.from) || 0) + 1);
  return m;
}

/** Bishops of `color` standing on the same square colour as most of their own pawns. */
export function badBishops(chess, color) {
  const sqColor = (sq) => { const { file, rank } = squareCoords(sq); return (file + rank) % 2; };
  const ps = pawns(chess, color);
  return chess.findPiece({ type: 'b', color }).filter((b) => {
    const same = ps.filter((p) => sqColor(p) === sqColor(b)).length;
    return same > ps.length - same && same >= 3;
  });
}

/** Squares the piece on `sq` attacks (ignoring whose turn it is). */
export function attackedBy(chess, sq) {
  const p = chess.get(sq);
  if (!p) return [];
  return ALL_SQUARES.filter((t) => t !== sq && chess.attackers(t, p.color).includes(sq));
}

/** Evaluate a named square-set "kind" for an exercise. */
export function squareSet(fen, kind, color) {
  const c = new Chess(fen);
  switch (kind) {
    case 'outposts': return outposts(c, color);
    case 'isolated': return isolatedPawns(c, color);
    case 'doubled': return doubledPawns(c, color);
    case 'passed': return passedPawns(c, color);
    case 'hanging': return hangingPieces(c, color);
    case 'bad-bishop': return badBishops(c, color);
    case 'open-files': return openFiles(c).map((f) => `${f}*`);
    default:
      if (kind.startsWith('attacks:')) return attackedBy(c, kind.slice(8));
      throw new Error(`Unknown square kind ${kind}`);
  }
}

/** Count something about a position (used by "count" exercises). */
export function countKind(fen, kind) {
  const c = new Chess(fen);
  const moves = c.moves({ verbose: true });
  switch (kind) {
    case 'legal': return moves.length;
    case 'checks': return moves.filter((m) => /[+#]$/.test(m.san)).length;
    case 'captures': return moves.filter((m) => m.captured).length;
    case 'king': return moves.filter((m) => m.piece === 'k').length;
    case 'space': {
      // Squares in the opponent's half (ranks 5-8 for White, 1-4 for Black) attacked by the side to move's pawns.
      const color = c.turn();
      return [...pawnAttacks(c, color)].filter((sq) => (color === 'w' ? Number(sq[1]) >= 5 : Number(sq[1]) <= 4)).length;
    }
    default:
      if (kind.startsWith('mobility:')) return moves.filter((m) => m.from === kind.slice(9)).length;
      throw new Error(`Unknown count kind ${kind}`);
  }
}

/** Status of a position for "classify" exercises. */
export function classifyPosition(fen) {
  const c = new Chess(fen);
  if (c.isCheckmate()) return 'checkmate';
  if (c.isStalemate()) return 'stalemate';
  if (c.isInsufficientMaterial()) return 'insufficient';
  if (c.isDrawByFiftyMoves()) return 'fifty';
  if (c.isCheck()) return 'check';
  return 'play';
}

/**
 * Move predicates for "any move that…" exercises. Each receives the chess.js
 * Move (with before/after FEN) and returns { ok, why }.
 */
export const MOVE_PREDICATES = {
  develop: (m) => ({ ok: (m.piece === 'n' || m.piece === 'b') && (m.from[1] === '1' || m.from[1] === '8'), why: 'Develop a knight or bishop from its starting rank.' }),
  'center-pawn': (m) => ({ ok: m.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(m.to), why: 'Put a pawn on one of the central squares d4, e4, d5 or e5.' }),
  castle: (m) => ({ ok: m.flags.includes('k') || m.flags.includes('q'), why: 'Castle (move the king two squares towards a rook).' }),
  'rook-open-file': (m) => {
    if (m.piece !== 'r') return { ok: false, why: 'Move a rook.' };
    const c = new Chess(m.after);
    return { ok: openFiles(c).includes(m.to[0]), why: 'Place a rook on a file that has no pawns on it.' };
  },
  'into-square': (m, ex) => {
    // Rule of the square: with the pawn to move, the king catches it if its
    // distance (in king moves) to the promotion square is at most the number
    // of moves the pawn needs to promote (a pawn on its start rank can double-step).
    if (m.piece !== 'k') return { ok: false, why: 'Move your king.' };
    const c = new Chess(m.after);
    const pawn = c.get(ex.pawn);
    if (!pawn || pawn.type !== 'p') return { ok: false, why: 'The pawn is no longer there.' };
    const p = squareCoords(ex.pawn);
    const promoRank = pawn.color === 'w' ? 7 : 0;
    let need = Math.abs(promoRank - p.rank);
    if ((pawn.color === 'w' && p.rank === 1) || (pawn.color === 'b' && p.rank === 6)) need -= 1;
    const k = squareCoords(m.to);
    const dist = Math.max(Math.abs(k.file - p.file), Math.abs(k.rank - promoRank));
    return { ok: dist <= need, why: `Your king must get within ${need} king moves of ${FILES[p.file]}${promoRank + 1}, the pawn's promotion square ("inside the square").` };
  },
  'outpost-occupy': (m, ex, before) => {
    if (m.piece !== 'n' && m.piece !== 'b') return { ok: false, why: 'Use a knight (or bishop) to occupy the weak square.' };
    const posts = outposts(before, m.color);
    return { ok: posts.includes(m.to), why: posts.length ? `That square can still be attacked by an enemy pawn or is not supported by your pawns. Weak squares here: ${posts.join(', ')}.` : 'There is no outpost square in this position.' };
  },
  'no-mate-in-1': (m) => {
    const c = new Chess(m.after);
    const mate = c.moves({ verbose: true }).find((r) => { c.move(r); const mated = c.isCheckmate(); c.undo(); return mated; });
    return { ok: !mate, why: mate ? `The opponent still has ${mate.san} — checkmate.` : '' };
  },
  'improve-worst': (m, ex, before) => {
    const color = before.turn();
    const mob = mobility(before);
    const pieces = ALL_SQUARES.filter((sq) => { const p = before.get(sq); return p && p.color === color && p.type !== 'p' && p.type !== 'k'; });
    const min = Math.min(...pieces.map((sq) => mob.get(sq) || 0));
    const worst = pieces.filter((sq) => (mob.get(sq) || 0) === min);
    if (!worst.includes(m.from)) {
      return { ok: false, why: `Not quite: your least active piece${worst.length > 1 ? 's are' : ' is'} on ${worst.join(', ')} with only ${min} legal move${min === 1 ? '' : 's'}. Improve ${worst.length > 1 ? 'one of them' : 'it'}.` };
    }
    const f = m.after.split(' ');
    f[1] = color;
    f[3] = '-';
    const same = new Chess(f.join(' '), { skipValidation: true });
    const now = same.moves({ square: m.to }).length;
    return { ok: now > min, why: now > min ? '' : `The piece is still passive on ${m.to} (${now} moves). Find a square where it does more.` };
  },
};

/** Apply a list of UCI/SAN moves and return the resulting chess.js instance or null if any is illegal. */
export function playLine(fen, moves) {
  const c = new Chess(fen);
  for (const mv of moves) {
    try { c.move(/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(mv) ? parseUci(mv) : mv); } catch { return null; }
  }
  return c;
}

export { ALL_SQUARES };
