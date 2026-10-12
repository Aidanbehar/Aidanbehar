// Stockfish 19 acceptance tests, run against the shipped WebAssembly build
// (engine/stockfish-19/*) under Node.js. The same files are loaded by the
// browser; tests/e2e.test.mjs repeats the key checks inside Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from '../vendor/chess.js';

const require = createRequire(import.meta.url);
const { startEngine, finalLines, DIR } = require('./lib/node-engine.cjs');

const legalUci = (fen, uci) => {
  const c = new Chess(fen === 'startpos' ? undefined : fen);
  return c.moves({ verbose: true }).some((m) => m.lan === uci);
};
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

for (const variant of ['simd', 'relaxed']) {
  test(`Stockfish 19 (${variant} build) acceptance`, { timeout: 600000 }, async (t) => {
    const eng = await startEngine({ variant });
    let hs;
    await t.test('engine loads, identifies as Stockfish 19, uci -> uciok, isready -> readyok', async () => {
      hs = await eng.handshake();
      assert.ok(hs.includes('id name Stockfish 19'), `id line: ${hs.find((l) => l.startsWith('id name'))}`);
      assert.ok(hs.includes('uciok'));
      assert.ok(hs.includes('readyok'));
      assert.ok(eng.lines[0].startsWith('Stockfish 19 by the Stockfish developers'), 'banner');
    });

    await t.test('position startpos + go depth 10: genuine info output and a legal bestmove', async () => {
      const r = await eng.go('startpos', 'depth 10');
      assert.ok(!r.raw.some((l) => /ERROR/.test(l)), 'no error output');
      const depths = r.infos.map((l) => Number(l.split(' ')[2]));
      assert.ok(depths.includes(10), 'reached depth 10');
      assert.ok(r.infos.every((l) => / score (cp|mate) -?\d+/.test(l) && / nodes \d+/.test(l)), 'info lines have score and nodes');
      assert.ok(legalUci(START, r.bestmove), `bestmove ${r.bestmove} legal`);
      const final = finalLines(r.infos)[0];
      let c = new Chess();
      for (const u of final.pv) assert.ok(c.moves({ verbose: true }).some((m) => m.lan === u) && c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }), `PV move ${u} legal`);
      void c;
    });

    await t.test('NNUE network loaded (nn-1a298aa575a0.nnue)', () => {
      assert.ok(eng.lines.some((l) => /NNUE evaluation using nn-1a298aa575a0\.nnue/.test(l)), 'NNUE info string');
    });

    await t.test('FEN analysis (Kiwipete) gives legal moves and a valid PV', async () => {
      const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
      const r = await eng.go(fen, 'depth 12');
      assert.ok(legalUci(fen, r.bestmove));
      const c = new Chess(fen);
      for (const u of finalLines(r.infos)[0].pv) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    });

    await t.test('mate scores: mate in 1 is reported as "score mate 1"', async () => {
      const fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
      const r = await eng.go(fen, 'depth 8');
      const f = finalLines(r.infos)[0];
      assert.deepEqual(f.score, { type: 'mate', value: 1 });
      assert.equal(r.bestmove, 'd1d8');
    });

    await t.test('MultiPV 3 returns three distinct candidate lines', async () => {
      const r = await eng.go('startpos', 'depth 10', { multipv: 3 });
      const ls = finalLines(r.infos);
      assert.equal(ls.length, 3);
      assert.equal(new Set(ls.map((l) => l.pv[0])).size, 3);
      eng.send('setoption name MultiPV value 1');
    });

    await t.test('search cancellation: go infinite + stop returns a legal bestmove promptly', async () => {
      eng.send('position startpos moves e2e4');
      eng.send('go infinite');
      await new Promise((r) => setTimeout(r, 700));
      const t0 = Date.now();
      eng.send('stop');
      const bm = await eng.waitFor((l) => l.startsWith('bestmove'), 10000);
      assert.ok(Date.now() - t0 < 3000, 'stopped within 3 s');
      assert.ok(legalUci('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', bm.split(' ')[1]));
    });

    await t.test('a new search after stop works, and output belongs to the new position', async () => {
      const fenA = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
      const fenB = '8/8/8/4k3/8/8/4PK2/8 w - - 0 1';
      eng.send(`position fen ${fenA}`);
      eng.send('go infinite');
      await new Promise((r) => setTimeout(r, 300));
      eng.send('stop');
      const bmA = await eng.waitFor((l) => l.startsWith('bestmove'));
      assert.ok(legalUci(fenA, bmA.split(' ')[1]), 'bestmove of A legal in A');
      const r = await eng.go(fenB, 'depth 14');
      assert.ok(legalUci(fenB, r.bestmove), 'bestmove of B legal in B');
      for (const l of r.infos) {
        const pv0 = l.split(' pv ')[1].split(' ')[0];
        assert.ok(legalUci(fenB, pv0), `every PV after the switch starts with a legal move in B (${pv0})`);
      }
    });

    await t.test('rapid position changes: 25 short searches with stop, no hang, all results legal', async () => {
      const c = new Chess();
      const fens = [];
      for (const san of ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6', 'f3', 'Be7', 'Qd2', 'O-O', 'O-O-O', 'Nbd7', 'g4', 'b5', 'g5', 'b4', 'Ne2']) { c.move(san); fens.push(c.fen()); }
      for (const fen of fens) {
        eng.send(`position fen ${fen}`);
        eng.send('go infinite');
        eng.send('stop');
        const bm = await eng.waitFor((l) => l.startsWith('bestmove'), 15000);
        assert.ok(legalUci(fen, bm.split(' ')[1]), `bestmove legal for ${fen}`);
      }
      eng.send('isready');
      await eng.waitFor((l) => l === 'readyok', 10000);
    });

    await t.test('repeated depth searches (10x) complete without hanging', async () => {
      for (let i = 0; i < 10; i++) {
        const r = await eng.go('startpos', 'depth 8');
        assert.ok(legalUci(START, r.bestmove));
      }
    });

    await t.test('go perft (independent move generator) matches published counts', async () => {
      for (const [d, n] of [[1, 20], [2, 400], [3, 8902], [4, 197281]]) {
        eng.send('position startpos');
        eng.send(`go perft ${d}`);
        const line = await eng.waitFor((l) => l.startsWith('Nodes searched:'), 60000);
        assert.equal(Number(line.split(': ')[1]), n, `perft ${d}`);
      }
    });

    await t.test('multi-threaded search (Threads=2) works', async () => {
      eng.send('setoption name Threads value 2');
      eng.send('isready');
      await eng.waitFor((l) => l === 'readyok');
      const r = await eng.go('startpos', 'depth 12');
      assert.ok(legalUci(START, r.bestmove));
      eng.send('setoption name Threads value 1');
    });

    eng.quit();
  });
}

test('missing NNUE file is reported, not silently ignored', { timeout: 120000 }, () => {
  // A child process starts the engine WITHOUT writing the network into its file system.
  const { spawnSync } = require('node:child_process');
  const r = spawnSync(process.execPath, [path.join(path.dirname(new URL(import.meta.url).pathname), 'lib', 'no-net-probe.cjs')], { encoding: 'utf8', timeout: 60000 });
  const errLine = r.stdout.split('\n').find((l) => /ERROR/.test(l));
  assert.ok(errLine, `expected an ERROR line, got: ${r.stdout.slice(-300)}`);
  assert.match(errLine, /network|NNUE|EvalFile/i);
  assert.ok(!/^bestmove/m.test(r.stdout), 'no search result is produced without a network');
  console.log('Engine output without network:', errLine);
});

test('shipped files: NNUE parts reassemble to the SHA-256 recorded in nnue.sha256', () => {
  const crypto = require('node:crypto');
  const parts = fs.readFileSync(path.join(DIR, 'nnue-parts.txt'), 'utf8').trim().split(/\s+/);
  const [sha, name] = fs.readFileSync(path.join(DIR, 'nnue.sha256'), 'utf8').trim().split(/\s+/);
  const buf = Buffer.concat(parts.map((p) => fs.readFileSync(path.join(DIR, p))));
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), sha);
  assert.equal(name, 'nn-1a298aa575a0.nnue');
  assert.ok(sha.startsWith('1a298aa575a0'), 'net name encodes the first 12 hex digits of its SHA-256');
});
