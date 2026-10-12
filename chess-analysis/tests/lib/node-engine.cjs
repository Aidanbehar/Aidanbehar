// Runs the shipped Stockfish 19 WebAssembly build under Node.js for tests.
// Uses the same files the browser loads (engine/stockfish-19/*), including the
// split NNUE parts and the sf_uci_push() command bridge.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', '..', 'engine', 'stockfish-19');

async function startEngine({ variant = 'simd', onLine } = {}) {
  const parts = fs.readFileSync(path.join(DIR, 'nnue-parts.txt'), 'utf8').trim().split(/\s+/);
  const [sha, name] = fs.readFileSync(path.join(DIR, 'nnue.sha256'), 'utf8').trim().split(/\s+/);
  const net = Buffer.concat(parts.map((p) => fs.readFileSync(path.join(DIR, p))));
  const got = crypto.createHash('sha256').update(net).digest('hex');
  if (got !== sha) throw new Error(`NNUE checksum mismatch ${got}`);
  const script = path.join(DIR, variant === 'relaxed' ? 'stockfish-19-relaxed.js' : 'stockfish-19.js');
  delete require.cache[require.resolve(script)];
  const factory = require(script);
  const lines = [];
  const waiters = [];
  const mod = await factory({
    arguments: [], // never forward this process's argv to Stockfish
    locateFile: (f) => path.join(DIR, f),
    print: (l) => {
      lines.push(l);
      if (onLine) onLine(l);
      for (const w of [...waiters]) if (w.pred(l)) { waiters.splice(waiters.indexOf(w), 1); clearTimeout(w.t); w.resolve(l); }
    },
    printErr: (l) => lines.push(`[stderr] ${l}`),
    preRun: [(m) => m.FS.writeFile('/' + name, net)],
  });
  const send = (cmd) => mod.ccall('sf_uci_push', null, ['string'], [cmd]);
  const waitFor = (pred, ms = 60000) => new Promise((resolve, reject) => {
    const w = { pred, resolve };
    w.t = setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error('timeout waiting for engine output')); }, ms);
    waiters.push(w);
  });
  const engine = {
    mod, lines, send, waitFor,
    async handshake() {
      const from = lines.length;
      send('uci');
      await waitFor((l) => l === 'uciok');
      send('isready');
      await waitFor((l) => l === 'readyok');
      return lines.slice(from);
    },
    /** Search and return { bestmove, infos } with infos collected for this search only. */
    async go(fen, goArgs, { multipv = 1 } = {}) {
      send(`setoption name MultiPV value ${multipv}`);
      send(fen === 'startpos' ? 'position startpos' : `position fen ${fen}`);
      const from = lines.length;
      send(`go ${goArgs}`);
      const best = await waitFor((l) => l.startsWith('bestmove'), 600000);
      const infos = lines.slice(from).filter((l) => l.startsWith('info') && / pv /.test(l));
      return { bestmove: best.split(' ')[1], infos, raw: lines.slice(from) };
    },
    quit() { try { send('quit'); } catch { /* ignore */ } },
  };
  return engine;
}

/** Final MultiPV lines of a search: [{ multipv, depth, score:{type,value}, pv:[] }]. */
function finalLines(infos) {
  const best = new Map();
  for (const l of infos) {
    const t = l.split(' ');
    const g = (k) => { const i = t.indexOf(k); return i >= 0 ? t[i + 1] : null; };
    if (l.includes('lowerbound') || l.includes('upperbound')) continue;
    const mpv = Number(g('multipv') || 1);
    const si = t.indexOf('score');
    const rec = { multipv: mpv, depth: Number(g('depth')), score: { type: t[si + 1], value: Number(t[si + 2]) }, pv: t.slice(t.indexOf('pv') + 1) };
    const prev = best.get(mpv);
    if (!prev || rec.depth >= prev.depth) best.set(mpv, rec);
  }
  return [...best.values()].sort((a, b) => a.multipv - b.multipv);
}

module.exports = { startEngine, finalLines, DIR };
