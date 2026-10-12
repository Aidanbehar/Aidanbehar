// Rules, FEN, sequence counter, PGN, openings and evaluation tests (Node.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Chess, START_FEN, validatePosition, gameStatus, pvToSan, positionKey } from '../js/chess-util.js';
import { countSequences, formatBig } from '../js/perft-core.js';
import { parsePgn, treeToPgn } from '../js/pgn.js';
import { GameTree } from '../js/tree.js';
import { OpeningBook } from '../js/openings.js';
import { toWhitePov, formatScore, classifyMove, whiteWinPercent } from '../js/eval.js';
import { parseInfo } from '../js/engine.js';

const book = new OpeningBook(JSON.parse(fs.readFileSync(new URL('../data/openings.json', import.meta.url))));

// ------------------------------------------------------------------ rules
test('starting position: 20 legal moves, correct FEN', () => {
  const c = new Chess();
  assert.equal(c.moves().length, 20);
  assert.equal(c.fen(), START_FEN);
  assert.equal(c.moves({ verbose: true }).filter((m) => m.piece === 'p').length, 16);
  assert.equal(c.moves({ verbose: true }).filter((m) => m.piece === 'n').length, 4);
});

test('checkmate: Fool\'s Mate', () => {
  const c = new Chess();
  for (const m of ['f3', 'e5', 'g4', 'Qh4#']) c.move(m);
  assert.ok(c.isCheckmate());
  assert.equal(c.moves().length, 0);
  assert.equal(gameStatus(c).kind, 'checkmate');
});

test('stalemate', () => {
  const c = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.ok(c.isStalemate());
  assert.equal(c.moves().length, 0);
  assert.equal(gameStatus(c).kind, 'stalemate');
});

test('castling rules', () => {
  const both = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const sans = both.moves();
  assert.ok(sans.includes('O-O') && sans.includes('O-O-O'));
  const through = new Chess('4k3/8/8/8/2b5/8/PPP2PPP/R3K2R w KQ - 0 1');
  assert.ok(!through.moves().includes('O-O'), 'cannot castle through an attacked square');
  assert.ok(through.moves().includes('O-O-O'));
  const inCheck = new Chess('4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1');
  assert.ok(!inCheck.moves().some((m) => m.startsWith('O-O')), 'cannot castle out of check');
  const noRights = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1');
  assert.ok(!noRights.moves().some((m) => m.startsWith('O-O')));
});

test('en passant', () => {
  const c = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
  const ep = c.moves({ verbose: true }).find((m) => m.flags.includes('e'));
  assert.equal(ep.san, 'exd6');
  c.move('exd6');
  assert.equal(c.get('d5'), undefined, 'captured pawn removed');
  const late = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - - 0 2');
  assert.ok(!late.moves().includes('exd6'), 'no en passant without the e.p. right');
  // En passant that would expose the king is illegal (horizontal pin).
  const pinned = new Chess('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1');
  assert.ok(!pinned.moves().includes('exd6'));
});

test('promotion generates four moves per destination', () => {
  const c = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1');
  const promos = c.moves({ verbose: true }).filter((m) => m.promotion);
  assert.deepEqual(promos.map((m) => m.promotion).sort(), ['b', 'n', 'q', 'r']);
  assert.equal(c.moves().length, 4 + 3);
});

test('pinned pieces and check evasions', () => {
  const pin = new Chess('4r1k1/8/8/8/8/8/4B3/4K3 w - - 0 1');
  assert.equal(pin.moves({ square: 'e2' }).length, 0);
  assert.equal(pin.moves().length, 4);
  const check = new Chess('4k3/8/8/8/8/8/3PPP2/r3K3 w - - 0 1');
  assert.ok(check.isCheck());
  assert.ok(check.moves().every((m) => m.startsWith('K')), 'only king moves escape a rook check along the back rank here');
});

test('FEN validation explains problems', () => {
  assert.ok(validatePosition(START_FEN).ok);
  const bad = [
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -', /6 space-separated fields/],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNX w KQkq - 0 1', /Invalid FEN/],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w kq - 0 1', /king/i],
    ['4k3/8/8/8/8/8/8/P3K3 w - - 0 1', /first or eighth rank/],
    ['k7/8/1K6/8/8/8/8/7Q w - - 0 1', /side not to move .*in check/],
    ['4k3/8/8/8/8/8/8/4K3 w K - 0 1', /Castling right "K"/],
    ['4k3/8/8/3p4/8/8/8/4K3 w - e6 0 1', /En passant square/],
  ];
  for (const [fen, re] of bad) {
    const v = validatePosition(fen);
    assert.equal(v.ok, false, fen);
    assert.match(v.error, re, `${fen}: ${v.error}`);
  }
});

test('FEN import/export round trip', () => {
  for (const fen of [START_FEN, 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2']) {
    const v = validatePosition(fen);
    assert.ok(v.ok);
    assert.equal(v.fen, fen);
  }
});

// ------------------------------------------------------------------ counter
// Independent reference: uses only chess.js's PUBLIC API and rebuilds every
// position from its FEN, a different code path from countSequences (which
// uses the internal move generator with make/unmake).
function referenceCount(fen, depth) {
  if (depth === 0) return 1n;
  const c = new Chess(fen);
  let total = 0n;
  for (const m of c.moves({ verbose: true })) total += referenceCount(m.after, depth - 1);
  return total;
}

test('sequence counter: start position 20 / 400 / 8,902 (and 197,281)', () => {
  assert.equal(countSequences(START_FEN, 1).total, 20n);
  assert.equal(countSequences(START_FEN, 2).total, 400n);
  const r3 = countSequences(START_FEN, 3);
  assert.equal(r3.total, 8902n);
  assert.equal(r3.divide.reduce((s, d) => s + d.count, 0n), 8902n, 'divide sums to total');
  assert.equal(referenceCount(START_FEN, 3), 8902n, 'independent reference implementation agrees');
  assert.equal(countSequences(START_FEN, 4).total, 197281n, 'published perft(4)');
});

test('sequence counter: N2 equals sum over moves of legal replies (definition)', () => {
  for (const fen of [START_FEN, 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1']) {
    const c = new Chess(fen);
    let n2 = 0n;
    for (const m of c.moves({ verbose: true })) n2 += BigInt(new Chess(m.after).moves().length);
    assert.equal(countSequences(fen, 2).total, n2);
  }
});

const PERFT_SUITE = [
  // Chess Programming Wiki perft positions (castling, en passant, promotions, checks, pins).
  ['Kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['Position 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['Position 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['Position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];
for (const [name, fen, counts] of PERFT_SUITE) {
  test(`sequence counter matches published perft: ${name}`, () => {
    counts.forEach((n, i) => assert.equal(countSequences(fen, i + 1).total, BigInt(n), `${name} depth ${i + 1}`));
    assert.equal(referenceCount(fen, 2), BigInt(counts[1]), 'reference implementation agrees at 2 plies');
  });
}

test('sequence counter: terminal positions and forced moves', () => {
  const mated = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
  assert.equal(countSequences(mated, 1).total, 0n);
  assert.equal(countSequences(mated, 3).total, 0n);
  const stale = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
  assert.equal(countSequences(stale, 2).total, 0n);
  // Forced: black king in check with a single escape.
  const forced = '7k/8/5K2/8/8/8/8/6R1 b - - 0 1';
  const c = new Chess(forced);
  assert.equal(c.moves().length, 1);
  assert.equal(countSequences(forced, 1).total, 1n);
  // Branches end at mate: after 1.f3 e5 2.g4, every N1 reply count includes Qh4# whose subtree is empty.
  const pre = new Chess();
  ['f3', 'e5', 'g4'].forEach((m) => pre.move(m));
  assert.equal(countSequences(pre.fen(), 2).total, referenceCount(pre.fen(), 2));
});

test('sequence counter: special moves are counted separately', () => {
  // Promotion: 4 sequences for a single pawn push.
  assert.equal(countSequences('8/P7/8/8/8/8/8/k6K w - - 0 1', 1).total, 7n);
  // En passant counted.
  assert.equal(countSequences('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', 1).total, BigInt(new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2').moves().length));
  // Transpositions counted as separate sequences: 1.Nf3 Nf6 2.Nc3 and 1.Nc3 Nf6 2.Nf3 reach one position.
  const r = countSequences(START_FEN, 3);
  assert.ok(r.total > 8000n);
});

test('BigInt formatting and exact arithmetic', () => {
  assert.equal(formatBig(0n), '0');
  assert.equal(formatBig(8902n), '8,902');
  assert.equal(formatBig(4865609n), '4,865,609');
  const big = 2n ** 64n + 1n;
  assert.equal(formatBig(big), '18,446,744,073,709,551,617');
  // Beyond Number.MAX_SAFE_INTEGER, Number arithmetic loses precision but BigInt does not.
  const a = BigInt(Number.MAX_SAFE_INTEGER);
  assert.equal(a + 2n, 9007199254740993n);
  assert.notEqual(BigInt(Number(a) + 2), 9007199254740993n, 'Number arithmetic would have rounded');
  assert.equal(typeof countSequences(START_FEN, 2).total, 'bigint');
});

// ------------------------------------------------------------------ PGN
const SAMPLE = `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[Round "?"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 {This is a weak move already.} 4. dxe5 Bxf3 5. Qxf3
dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12.
O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ $1 Nxb8 17. Rd8# 1-0`;

test('PGN: headers, moves, comments, NAGs, result', () => {
  const { games, errors } = parsePgn(SAMPLE);
  assert.equal(errors.length, 0);
  assert.equal(games.length, 1);
  const g = games[0];
  assert.equal(g.headers.White, 'Paul Morphy');
  assert.equal(g.result, '1-0');
  const main = g.tree.mainline();
  assert.equal(main.length, 33);
  assert.equal(main[32].san, 'Rd8#');
  assert.equal(main[5].comment, 'This is a weak move already.');
  assert.deepEqual(main[30].nags, [1]);
  assert.ok(g.tree.chessAt(main[32]).isCheckmate());
});

test('PGN: nested variations, suffix annotations, multiple games', () => {
  const text = `[Event "A"]\n[White "X"]\n[Black "Y"]\n[Result "*"]\n\n1. e4 (1. d4 d5 (1... Nf6 2. c4) 2. c4) 1... e5!? 2. Nf3?! Nc6 *\n\n[Event "B"]\n[Result "0-1"]\n\n1. f3 e5 2. g4?? Qh4# 0-1\n`;
  const { games, errors } = parsePgn(text);
  assert.equal(errors.length, 0);
  assert.equal(games.length, 2);
  const t = games[0].tree;
  assert.equal(t.root.children.length, 2, '1.e4 and 1.d4');
  const d4 = t.root.children[1];
  assert.equal(d4.san, 'd4');
  assert.equal(d4.children.length, 2, '1...d5 and 1...Nf6');
  assert.equal(d4.children[1].children[0].san, 'c4');
  assert.deepEqual(t.root.children[0].children[0].nags, [5]);
  assert.equal(games[1].tree.mainline().length, 4);
  assert.deepEqual(games[1].tree.mainline()[2].nags, [4]);
});

test('PGN: malformed input is reported clearly', () => {
  let r = parsePgn('1. e4 e5 2. Nf6 Nc6 *');
  assert.equal(r.games.length, 0);
  assert.match(r.errors[0].message, /"Nf6" is not a legal move for White at move 2/);
  r = parsePgn('[Event "x"\n1. e4 *');
  assert.match(r.errors[0].message, /malformed header/);
  r = parsePgn('1. e4 {unclosed comment');
  assert.match(r.errors[0].message, /never closed/);
  r = parsePgn('');
  assert.match(r.errors[0].message, /No games/);
  // A bad game in the middle does not stop the others.
  r = parsePgn('[Event "1"]\n\n1. e4 *\n\n[Event "2"]\n\n1. e5 *\n\n[Event "3"]\n\n1. d4 *');
  assert.equal(r.games.length, 2);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0].message, /Game 2/);
});

test('PGN: FEN header and export round trip with variations', () => {
  const text = '[Event "FEN test"]\n[SetUp "1"]\n[FEN "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2"]\n[Result "*"]\n\n2. exd6 (2. Kd2 Kd7) 2... Kd7 {comment} 3. Kd2 *';
  const { games, errors } = parsePgn(text);
  assert.equal(errors.length, 0);
  const tree = games[0].tree;
  assert.equal(tree.mainline()[0].san, 'exd6');
  const out = treeToPgn(tree);
  assert.match(out, /\[FEN "4k3\/8\/8\/3pP3\/8\/8\/8\/4K3 w - d6 0 2"\]/);
  const again = parsePgn(out).games[0].tree;
  assert.deepEqual(again.mainline().map((n) => n.san), tree.mainline().map((n) => n.san));
  assert.equal(again.root.children.length, 2);
  assert.equal(again.mainline()[1].comment, 'comment');
});

test('game tree navigation and synchronisation helpers', () => {
  const { games } = parsePgn(SAMPLE);
  const t = games[0].tree;
  const main = t.mainline();
  const n10 = main[9];
  assert.equal(t.path(n10).length, 10);
  assert.equal(t.chessAt(n10).fen(), n10.fen, 'replaying the path reproduces the node FEN');
  assert.ok(t.isMainline(n10));
  const v = t.addMove(main[0], 'c5');
  assert.ok(!t.isMainline(v));
  t.promoteVariation(v);
  assert.ok(t.isMainline(v));
  assert.equal(t.addMove(main[0], 'Zz9'), null, 'illegal moves are rejected');
  const rep = new GameTree(START_FEN);
  let n = rep.root;
  for (const m of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) n = rep.addMove(n, m);
  assert.ok(rep.chessAt(n).isThreefoldRepetition(), 'repetition detected along the path');
});

// ------------------------------------------------------------------ openings
const uciOf = (...sans) => { const c = new Chess(); return sans.map((s) => c.move(s).lan); };

test('openings: exact sequence match', () => {
  const moves = uciOf('e4', 'e5', 'Nf3', 'Nc6', 'Bb5');
  const r = book.identify(START_FEN, moves);
  assert.equal(r.status, 'exact');
  assert.equal(r.entry.eco, 'C60');
  assert.equal(r.entry.family, 'Ruy Lopez');
});

test('openings: broader classification after leaving the book', () => {
  const moves = uciOf('e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5', 'Bc2', 'c5', 'd4', 'Qc7', 'a4', 'h6');
  const r = book.identify(START_FEN, moves);
  assert.equal(r.status, 'classified');
  assert.ok(r.matchedPlies < moves.length);
  assert.ok(r.entry.name.startsWith('Ruy Lopez'));
  assert.equal(r.inBook, false);
});

test('openings: identification follows the move sequence, not just the position', () => {
  // Same final position via two move orders: only one is a database sequence.
  const a = uciOf('d4', 'd5', 'c4', 'e6');
  const b = uciOf('c4', 'e6', 'd4', 'd5');
  const fa = new Chess(); ['d4', 'd5', 'c4', 'e6'].forEach((m) => fa.move(m));
  const ra = book.identify(START_FEN, a, fa.fen());
  const rb = book.identify(START_FEN, b, fa.fen());
  assert.equal(ra.status, 'exact');
  assert.match(ra.entry.name, /Queen's Gambit Declined/);
  assert.notEqual(rb.entry?.uci, ra.entry.uci, 'different sequence → different database line');
  assert.ok(rb.status === 'transposition' || rb.transposition || rb.status === 'classified' || rb.status === 'exact');
  if (rb.transposition) assert.equal(positionKey(fa.fen()), rb.transposition.key);
});

test('openings: custom start positions and database errors', async () => {
  assert.equal(book.identify('4k3/8/8/8/8/8/8/4K3 w - - 0 1', ['e1e2']).status, 'not-applicable');
  assert.equal(book.identify(START_FEN, []).status, 'start');
  assert.throws(() => new OpeningBook({ entries: [] }), /empty or malformed/);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  await assert.rejects(() => OpeningBook.load('data/missing.json'), /missing: data\/missing\.json returned HTTP 404/);
  globalThis.fetch = async () => { throw new Error('network down'); };
  await assert.rejects(() => OpeningBook.load('data/openings.json'), /could not be loaded/);
  globalThis.fetch = realFetch;
});

test('openings database: every entry replays legally and is unique', () => {
  assert.ok(book.entries.length > 3000);
  for (const e of book.entries.slice(0, 4000)) {
    const c = new Chess();
    for (const u of e.uci.split(' ')) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    assert.equal(positionKey(c.fen()), e.key);
  }
});

// ------------------------------------------------------------------ evaluation
test('score conversion to White\'s point of view and formatting', () => {
  assert.deepEqual(toWhitePov({ type: 'cp', value: 35 }, 'b'), { type: 'cp', value: -35 });
  assert.deepEqual(toWhitePov({ type: 'mate', value: 3 }, 'b'), { type: 'mate', value: -3 });
  assert.equal(formatScore({ type: 'cp', value: 124 }), '+1.24');
  assert.equal(formatScore({ type: 'cp', value: -30 }), '−0.30');
  assert.equal(formatScore({ type: 'mate', value: -5 }), '-M5');
  assert.equal(whiteWinPercent({ type: 'mate', value: 2 }), 100);
  assert.ok(Math.abs(whiteWinPercent({ type: 'cp', value: 0 }) - 50) < 1e-9);
});

test('move classification thresholds, perspective and mates', () => {
  const cp = (v) => ({ type: 'cp', value: v });
  assert.equal(classifyMove({ before: cp(30), after: cp(20), mover: 'w', playedUci: 'e2e4', bestUci: 'e2e4', legalCount: 20 }).cls, 'best');
  assert.equal(classifyMove({ before: cp(30), after: cp(25), mover: 'w', playedUci: 'd2d4', bestUci: 'e2e4', legalCount: 20 }).cls, 'excellent');
  assert.equal(classifyMove({ before: cp(30), after: cp(-500), mover: 'w', playedUci: 'a2a3', bestUci: 'e2e4', legalCount: 20 }).cls, 'blunder');
  // Black's perspective: White-POV score going UP is bad for Black.
  assert.equal(classifyMove({ before: cp(0), after: cp(400), mover: 'b', playedUci: 'a7a6', bestUci: 'e7e5', legalCount: 20 }).cls, 'blunder');
  assert.equal(classifyMove({ before: cp(0), after: cp(-400), mover: 'b', playedUci: 'a7a6', bestUci: 'e7e5', legalCount: 20 }).cls, 'excellent');
  // Mate handling.
  assert.equal(classifyMove({ before: { type: 'mate', value: 2 }, after: cp(300), mover: 'w', playedUci: 'a', bestUci: 'b', legalCount: 30 }).cls, 'mistake');
  assert.equal(classifyMove({ before: cp(0), after: { type: 'mate', value: -1 }, mover: 'w', playedUci: 'a', bestUci: 'b', legalCount: 30 }).cls, 'blunder');
  assert.equal(classifyMove({ before: cp(0), after: cp(-900), mover: 'w', playedUci: 'a', bestUci: 'b', legalCount: 1 }).cls, 'forced');
});

test('UCI info parsing', () => {
  const i = parseInfo('info depth 18 seldepth 25 multipv 2 score cp -31 lowerbound nodes 123456 nps 654321 hashfull 12 tbhits 0 time 189 wdl 50 900 50 pv e2e4 e7e5 g1f3');
  assert.equal(i.depth, 18);
  assert.equal(i.multipv, 2);
  assert.deepEqual(i.score, { type: 'cp', value: -31, bound: 'lowerbound' });
  assert.deepEqual(i.wdl, [50, 900, 50]);
  assert.deepEqual(i.pv, ['e2e4', 'e7e5', 'g1f3']);
  assert.equal(parseInfo('bestmove e2e4'), null);
});

test('PV to SAN stops at the first illegal move (stale-line protection)', () => {
  const r = pvToSan(START_FEN, ['e2e4', 'e7e5', 'e1e3', 'g8f6']);
  assert.deepEqual(r.map((m) => m.san), ['e4', 'e5']);
});
