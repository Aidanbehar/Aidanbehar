// Small helpers around chess.js (the rules implementation used everywhere).
import { Chess, validateFen, DEFAULT_POSITION } from '../vendor/chess.js';

export { Chess, DEFAULT_POSITION };

export const START_FEN = DEFAULT_POSITION;
export const FILES = 'abcdefgh';

export function squareName(file, rank) { return FILES[file] + (rank + 1); }
export function squareCoords(sq) { return { file: sq.charCodeAt(0) - 97, rank: sq.charCodeAt(1) - 49 }; }

/** Board + side + castling + en passant: identifies a position for opening lookups. */
export function positionKey(fen) { return fen.split(' ').slice(0, 4).join(' '); }

export function isStandardStart(fen) { return positionKey(fen) === positionKey(START_FEN); }

/** Parse a UCI move string ("e2e4", "e7e8q") into a chess.js move object. */
export function parseUci(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined };
}

export function moveToUci(m) { return m.from + m.to + (m.promotion || ''); }

/** Try a UCI move in a position. Returns the chess.js Move (with san, lan, after) or null. */
export function tryUci(fen, uci) {
  const c = new Chess(fen);
  try { return c.move(parseUci(uci)); } catch { return null; }
}

/**
 * Convert a UCI principal variation to SAN, stopping at the first illegal move
 * (which would indicate a stale or mismatched line).
 */
export function pvToSan(fen, pv) {
  const c = new Chess(fen);
  const out = [];
  for (const uci of pv) {
    let m;
    try { m = c.move(parseUci(uci)); } catch { break; }
    out.push({ san: m.san, uci, fenBefore: m.before, fenAfter: m.after, color: m.color });
  }
  return out;
}

/** Status of a position as reported by the rules library. */
export function gameStatus(chess) {
  if (chess.isCheckmate()) return { over: true, kind: 'checkmate', text: `Checkmate — ${chess.turn() === 'w' ? 'Black' : 'White'} wins` };
  if (chess.isStalemate()) return { over: true, kind: 'stalemate', text: 'Stalemate — draw' };
  if (chess.isInsufficientMaterial()) return { over: true, kind: 'insufficient', text: 'Draw — insufficient material' };
  if (chess.isDrawByFiftyMoves()) return { over: false, kind: 'fifty', text: 'Fifty-move rule: a draw can be claimed' };
  if (chess.isThreefoldRepetition()) return { over: false, kind: 'repetition', text: 'Threefold repetition: a draw can be claimed' };
  if (chess.isCheck()) return { over: false, kind: 'check', text: `${chess.turn() === 'w' ? 'White' : 'Black'} is in check` };
  return { over: false, kind: 'normal', text: '' };
}

/**
 * Validate a FEN string thoroughly. Returns { ok, error, fen } where fen is the
 * normalised FEN. Checks both syntax (via chess.js validateFen) and whether the
 * position is one that can be analysed (kings, pawns, check, castling, e.p.).
 */
export function validatePosition(fenInput) {
  const fen = String(fenInput || '').trim().replace(/\s+/g, ' ');
  if (!fen) return { ok: false, error: 'The FEN string is empty.' };
  const fields = fen.split(' ');
  if (fields.length !== 6) {
    return { ok: false, error: `A FEN needs 6 space-separated fields (placement, side to move, castling, en passant, halfmove clock, fullmove number); this one has ${fields.length}.` };
  }
  const v = validateFen(fen);
  if (!v.ok) return { ok: false, error: friendlyFenError(v.error) };

  const [placement, side, castling, ep] = fields;
  const rows = placement.split('/');
  const board = rows.map((row) => {
    const r = [];
    for (const ch of row) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) r.push(null); else r.push(ch); }
    return r;
  }); // board[0] = rank 8
  const count = (p) => board.flat().filter((x) => x === p).length;
  if (count('K') !== 1) return { ok: false, error: `White must have exactly one king (found ${count('K')}).` };
  if (count('k') !== 1) return { ok: false, error: `Black must have exactly one king (found ${count('k')}).` };
  if (board[0].some((p) => p === 'P' || p === 'p') || board[7].some((p) => p === 'P' || p === 'p')) {
    return { ok: false, error: 'Pawns cannot stand on the first or eighth rank.' };
  }
  if (count('P') > 8 || count('p') > 8) return { ok: false, error: 'A side cannot have more than eight pawns.' };
  const extra = (c) => {
    const pieces = c === 'w' ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
    const base = { Q: 1, R: 2, B: 2, N: 2, q: 1, r: 2, b: 2, n: 2 };
    return pieces.reduce((s, p) => s + Math.max(0, count(p) - base[p]), 0);
  };
  if (count('P') + extra('w') > 8 || count('p') + extra('b') > 8) {
    return { ok: false, error: 'Too many promoted pieces for the number of missing pawns.' };
  }
  if (count('P') + count('N') + count('B') + count('R') + count('Q') + 1 > 16 || count('p') + count('n') + count('b') + count('r') + count('q') + 1 > 16) {
    return { ok: false, error: 'A side cannot have more than 16 pieces.' };
  }
  const at = (sq) => { const { file, rank } = squareCoords(sq); return board[7 - rank][file]; };
  if (castling !== '-') {
    const need = { K: ['e1', 'K', 'h1', 'R'], Q: ['e1', 'K', 'a1', 'R'], k: ['e8', 'k', 'h8', 'r'], q: ['e8', 'k', 'a8', 'r'] };
    for (const f of castling) {
      const n = need[f];
      if (!n) return { ok: false, error: `Unknown castling flag "${f}".` };
      if (at(n[0]) !== n[1] || at(n[2]) !== n[3]) {
        return { ok: false, error: `Castling right "${f}" requires the ${n[1] === 'K' || n[1] === 'k' ? (n[1] === 'K' ? 'white' : 'black') : ''} king on ${n[0]} and rook on ${n[2]}.` };
      }
    }
  }
  if (ep !== '-') {
    const r = ep[1];
    if ((side === 'w' && r !== '6') || (side === 'b' && r !== '3')) {
      return { ok: false, error: `En passant square ${ep} is impossible with ${side === 'w' ? 'White' : 'Black'} to move.` };
    }
    const pawnSq = ep[0] + (side === 'w' ? '5' : '4');
    const origin = ep[0] + (side === 'w' ? '7' : '2');
    if (at(pawnSq) !== (side === 'w' ? 'p' : 'P') || at(ep) !== null || at(origin) !== null) {
      return { ok: false, error: `En passant square ${ep} does not match a pawn that just advanced two squares.` };
    }
  }
  let c;
  try { c = new Chess(fen); } catch (e) { return { ok: false, error: friendlyFenError(e.message) }; }
  // The side NOT to move must not be in check (it would mean the king can be captured).
  const flipped = fen.split(' ');
  flipped[1] = side === 'w' ? 'b' : 'w';
  flipped[3] = '-';
  try {
    const other = new Chess(flipped.join(' '), { skipValidation: true });
    if (other.isCheck()) return { ok: false, error: `The side not to move (${side === 'w' ? 'Black' : 'White'}) is in check, so this position cannot arise in a legal game.` };
  } catch { /* ignore */ }
  const checkers = countCheckers(c);
  if (checkers > 2) return { ok: false, error: `The king is attacked by ${checkers} pieces; at most two checkers are possible.` };
  return { ok: true, fen: c.fen({ forceEnpassantSquare: true }) === fen ? fen : normaliseFen(fen, c) };
}

function normaliseFen(input, c) {
  // chess.js drops an en passant square when no capture is possible; keep the user's
  // field if it was valid, so exported FEN round-trips. Otherwise use chess.js output.
  const f = input.split(' ');
  const out = c.fen().split(' ');
  out[3] = f[3];
  return out.join(' ');
}

function countCheckers(c) {
  const turn = c.turn();
  const kingSq = c.findPiece({ type: 'k', color: turn })[0];
  if (!kingSq) return 0;
  return c.attackers(kingSq, turn === 'w' ? 'b' : 'w').length;
}

function friendlyFenError(msg) {
  const m = String(msg || '').replace(/^Invalid FEN:\s*/i, '');
  return `Invalid FEN: ${m.charAt(0).toUpperCase()}${m.slice(1)}${/[.!]$/.test(m) ? '' : '.'}`;
}
