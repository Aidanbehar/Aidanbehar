// Verifies all Learning Center content:
//  * every FEN is a valid, analysable position (validatePosition)
//  * every worked-example move is legal
//  * every exercise is solvable and non-trivial according to the rules library
//  * every "line" exercise (and extra puzzle) is confirmed by Stockfish 19:
//    each solution move must be (close to) the engine's best choice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Chess, validatePosition, parseUci } from '../js/chess-util.js';
import { LESSONS, SECTIONS, EXTRA_PUZZLES } from '../js/lessons/index.js';
import { squareSet, countKind, classifyPosition, MOVE_PREDICATES } from '../js/learn-rules.js';

const require = createRequire(import.meta.url);
const SKIP_ENGINE = process.env.SKIP_ENGINE === '1';

const valid = (fen, where) => {
  const v = validatePosition(fen);
  assert.ok(v.ok, `${where}: invalid position ${fen}: ${v.error}`);
};

function sanToUci(fen, san) {
  const c = new Chess(fen);
  const m = c.move(san);
  return m.lan;
}

test('learning center has all required sections with lessons', () => {
  const need = ['fundamentals', 'tactics', 'positional', 'openings', 'endgames', 'calculation'];
  for (const s of need) {
    assert.ok(SECTIONS.find((x) => x.id === s), `section ${s}`);
    assert.ok(LESSONS.filter((l) => l.section === s).length >= 6, `section ${s} has at least 6 lessons`);
  }
  const ids = new Set();
  for (const l of LESSONS) { assert.ok(!ids.has(l.id), `duplicate id ${l.id}`); ids.add(l.id); }
});

for (const l of LESSONS) {
  test(`lesson ${l.id}: content is complete and legal`, () => {
    assert.ok(l.title && l.body && l.body.length > 300, 'has a real explanation');
    assert.ok(l.diagram?.fen, 'has a diagram');
    valid(l.diagram.fen, `${l.id} diagram`);
    if (l.example) {
      valid(l.example.fen, `${l.id} example`);
      const c = new Chess(l.example.fen);
      for (const st of l.example.steps) {
        if (st.move) assert.doesNotThrow(() => c.move(st.move), `${l.id} example move ${st.move} illegal at ${c.fen()}`);
      }
    } else {
      assert.ok(l.id === 'clock', 'every lesson except clock management has a worked example');
    }
    assert.ok(l.quiz && l.quiz.options.length >= 3 && l.quiz.answer >= 0 && l.quiz.answer < l.quiz.options.length, 'has a valid quiz');
    const ex = l.exercise;
    if (!ex) { assert.ok(['clock', 'opening-plans'].includes(l.id), `${l.id} should have an exercise`); return; }
    checkExerciseRules(ex, l.id);
  });
}

for (const p of EXTRA_PUZZLES) {
  test(`puzzle ${p.id}: legal and solvable`, () => checkExerciseRules(p, p.id));
}

function checkExerciseRules(ex, id) {
  valid(ex.fen, `${id} exercise`);
  const c = new Chess(ex.fen);
  switch (ex.type) {
    case 'mate': {
      const mates = c.moves({ verbose: true }).filter((m) => /#$/.test(m.san));
      assert.ok(mates.length >= 1, `${id}: no mate in one exists`);
      break;
    }
    case 'line': {
      for (let i = 0; i < ex.solution.length; i++) {
        const fen = c.fen();
        if (i % 2 === 0 && ex.accept?.[i / 2]) for (const alt of ex.accept[i / 2]) assert.doesNotThrow(() => new Chess(fen).move(alt), `${id}: alternative ${alt} illegal`);
        assert.doesNotThrow(() => c.move(ex.solution[i]), `${id}: solution move ${ex.solution[i]} illegal at ${fen}`);
      }
      assert.equal(ex.solution.length % 2, 1, `${id}: a line must end with the solver's move`);
      break;
    }
    case 'count': {
      const n = countKind(ex.fen, ex.kind);
      assert.ok(Number.isInteger(n) && n > 0, `${id}: count ${n}`);
      break;
    }
    case 'squares': {
      const s = squareSet(ex.fen, ex.kind, ex.color || c.turn());
      assert.ok(s.length > 0, `${id}: empty answer set`);
      break;
    }
    case 'predicate': {
      const moves = c.moves({ verbose: true });
      const before = new Chess(ex.fen);
      const ok = moves.filter((m) => MOVE_PREDICATES[ex.predicate](m, ex, before).ok);
      assert.ok(ok.length > 0, `${id}: no move satisfies ${ex.predicate}`);
      assert.ok(ok.length < moves.length, `${id}: every move satisfies ${ex.predicate} (trivial)`);
      break;
    }
    case 'classify': {
      const kinds = new Set();
      for (const p of ex.positions) { valid(p.fen, `${id} classify`); kinds.add(classifyPosition(p.fen)); }
      assert.ok(kinds.size >= 2, `${id}: classify positions should differ`);
      break;
    }
    default: assert.fail(`${id}: unknown exercise type ${ex.type}`);
  }
}

// Specific rule-derived answers we know independently.
test('rule-derived answers match hand analysis', () => {
  const byId = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
  assert.equal(countKind(byId['legal-moves'].exercise.fen, 'legal'), 4, 'pinned bishop: only 4 king moves');
  assert.deepEqual(squareSet(byId['pawn-structure'].exercise.fen, 'isolated', 'w').sort(), ['a2', 'd4']);
  assert.deepEqual(squareSet(byId['outposts'].exercise.fen, 'outposts', 'w'), ['d5']);
  assert.deepEqual(squareSet(byId['open-files'].exercise.fen, 'open-files').sort(), ['c*', 'd*']);
  assert.deepEqual(squareSet(byId['bishops'].exercise.fen, 'bad-bishop', 'w'), ['c1']);
  assert.deepEqual(squareSet(byId['blunder-check'].exercise.fen, 'hanging', 'w').sort(), ['e4', 'e5']);
  assert.deepEqual(squareSet(byId['evaluating-positions'].exercise.fen, 'passed', 'w').sort(), ['b5', 'd4']);
  assert.equal(countKind(byId['piece-activity'].exercise.fen, 'mobility:a1'), 2);
  const sq = byId['square-of-pawn'].exercise;
  const accepted = new Chess(sq.fen).moves({ verbose: true }).filter((m) => MOVE_PREDICATES['into-square'](m, sq).ok).map((m) => m.san).sort();
  assert.deepEqual(accepted, ['Ke1', 'Ke2', 'Ke3']);
  const kinds = byId.draws.exercise.positions.map((p) => classifyPosition(p.fen));
  assert.deepEqual(kinds, ['stalemate', 'insufficient', 'checkmate', 'play']);
  assert.deepEqual(byId['fifty-move'].exercise.positions.map((p) => classifyPosition(p.fen)), ['fifty', 'play']);
});

// ------------------------------------------------------------------ engine
test('line exercises and puzzles are confirmed by Stockfish 19', { skip: SKIP_ENGINE && 'SKIP_ENGINE=1', timeout: 1800000 }, async () => {
  const { startEngine, finalLines } = require('./lib/node-engine.cjs');
  const eng = await startEngine();
  const hs = await eng.handshake();
  assert.ok(hs.includes('id name Stockfish 19'));
  const items = [
    ...LESSONS.filter((l) => l.exercise?.type === 'line').map((l) => ({ id: l.id, ex: l.exercise })),
    ...EXTRA_PUZZLES.filter((p) => p.type === 'line').map((p) => ({ id: `puzzle:${p.id}`, ex: p })),
  ];
  const report = [];
  const score = (s) => (s.type === 'mate' ? (s.value > 0 ? 100000 - s.value : -100000 - s.value) : s.value);
  for (const { id, ex } of items) {
    const c = new Chess(ex.fen);
    for (let i = 0; i < ex.solution.length; i += 2) {
      const fen = c.fen();
      const best = finalLines((await eng.go(fen, 'depth 16', { multipv: 1 })).infos)[0];
      const moves = [ex.solution[i], ...((ex.accept && ex.accept[i / 2]) || [])];
      for (const mv of moves) {
        const uci = sanToUci(fen, mv);
        const r = finalLines((await eng.go(fen, `depth 16 searchmoves ${uci}`, { multipv: 1 })).infos)[0];
        const gap = score(best.score) - score(r.score);
        const okMate = best.score.type === 'mate' && best.score.value > 0 ? r.score.type === 'mate' && r.score.value > 0 : true;
        const winning = r.score.type === 'mate' ? r.score.value > 0 : r.score.value >= 200;
        const ok = okMate && (gap <= 60 || (winning && gap <= 400) || best.pv[0] === uci);
        report.push(`${id} ${mv}: ${r.score.type} ${r.score.value} (best ${best.pv[0]} ${best.score.type} ${best.score.value})`);
        assert.ok(ok, `${id}: ${mv} is not close to Stockfish's best (${best.pv[0]} ${JSON.stringify(best.score)} vs ${JSON.stringify(r.score)})`);
      }
      c.move(ex.solution[i]);
      if (i + 1 < ex.solution.length) c.move(ex.solution[i + 1]);
    }
    if (/#$/.test(ex.solution[ex.solution.length - 1])) assert.ok(c.isCheckmate(), `${id}: line should end in mate`);
  }
  // Square-of-the-pawn: the accepted king moves must hold the draw.
  const sq = LESSONS.find((l) => l.id === 'square-of-pawn').exercise;
  for (const san of ['Ke1', 'Ke2', 'Ke3']) {
    const uci = sanToUci(sq.fen, san);
    const r = finalLines((await eng.go(sq.fen, `depth 18 searchmoves ${uci}`)).infos)[0];
    report.push(`square-of-pawn ${san}: ${r.score.type} ${r.score.value}`);
    assert.ok(r.score.type === 'cp' && Math.abs(r.score.value) < 100, `${san} should draw`);
  }
  const bad = finalLines((await eng.go(sq.fen, `depth 18 searchmoves ${sanToUci(sq.fen, 'Kg3')}`)).infos)[0];
  report.push(`square-of-pawn Kg3 (outside the square): ${bad.score.type} ${bad.score.value}`);
  assert.ok(bad.score.type === 'mate' ? bad.score.value < 0 : bad.score.value < -300, 'Kg3 should lose');
  console.log(report.join('\n'));
  eng.quit();
});
void parseUci;
