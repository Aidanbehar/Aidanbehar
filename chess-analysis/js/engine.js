// Main-thread client for the Stockfish 19 Web Worker.
//
// Guarantees:
//  * Every search has an id and the FEN it was started for; every event carries
//    both, so the UI can drop anything that does not belong to what it shows.
//  * Only one search runs at a time. A new request stops the running search and
//    waits for its `bestmove` before sending the next `position`/`go`, so engine
//    output can never be attributed to the wrong position.
//  * If several requests arrive while waiting, only the newest one runs
//    (older ones resolve with { cancelled: true }).
import { toWhitePov } from './eval.js';
import { Chess, validatePosition } from './chess-util.js';

export const EXPECTED_ENGINE = 'Stockfish 19';

let searchSeq = 0;

export function parseInfo(line) {
  const t = line.split(' ');
  if (t[0] !== 'info') return null;
  const info = {};
  for (let i = 1; i < t.length; i++) {
    const k = t[i];
    switch (k) {
      case 'depth': case 'seldepth': case 'multipv': case 'nodes': case 'nps': case 'time': case 'hashfull': case 'tbhits': case 'currmovenumber':
        info[k] = Number(t[++i]); break;
      case 'score': {
        const type = t[++i];
        const value = Number(t[++i]);
        info.score = { type, value };
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') info.score.bound = t[++i];
        break;
      }
      case 'wdl': info.wdl = [Number(t[i + 1]), Number(t[i + 2]), Number(t[i + 3])]; i += 3; break;
      case 'pv': info.pv = t.slice(i + 1); i = t.length; break;
      case 'string': info.string = t.slice(i + 1).join(' '); i = t.length; break;
      case 'currmove': info.currmove = t[++i]; break;
      default: break;
    }
  }
  return info;
}

export class EngineClient {
  constructor({ workerUrl = 'engine/engine-worker.js', arch = 'auto' } = {}) {
    this.workerUrl = workerUrl;
    this.arch = arch;
    this.state = 'off'; // off | loading | ready | error
    this.error = null;
    this.id = { name: null, author: null };
    this.options = {};
    this.listeners = new Set();
    this.lineWaiters = [];
    this.current = null; // running search
    this.pending = null; // newest queued request
    this.applied = {}; // option values already sent
    this.pumping = false;
    this.log = [];
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { for (const fn of this.listeners) { try { fn(ev); } catch (e) { console.error(e); } } }

  setState(state, extra = {}) {
    this.state = state;
    this.emit({ type: 'state', state, ...extra });
  }

  /** Start the worker and perform the UCI handshake. Resolves when ready. */
  async start() {
    if (this.state === 'ready' || this.state === 'loading') return this.startPromise;
    this.error = null;
    this.setState('loading', { message: 'Starting engine…' });
    this.startPromise = this._start().catch((e) => {
      this._fail(e.code || 'init-failed', e.message);
      throw e;
    });
    return this.startPromise;
  }

  async _start() {
    const w = new Worker(this.workerUrl);
    this.worker = w;
    const ready = new Promise((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;
    });
    w.onmessage = (e) => this._onWorkerMessage(e.data);
    w.onerror = (e) => {
      e.preventDefault?.();
      const msg = `Engine worker crashed: ${e.message || 'unknown error'}`;
      this._readyReject?.(Object.assign(new Error(msg), { code: 'crashed' }));
      this._fail('crashed', msg);
    };
    w.onmessageerror = () => this._fail('crashed', 'Engine worker sent an unreadable message.');
    w.postMessage({ type: 'init', arch: this.arch });
    const info = await ready;
    this.buildArch = info.arch;
    this.cores = info.cores;
    this.net = info.net;

    this.send('uci');
    await this._waitLine((l) => l === 'uciok', 30000, 'UCI handshake (uci → uciok) timed out');
    if (!this.id.name || !this.id.name.startsWith(EXPECTED_ENGINE)) {
      throw Object.assign(new Error(`Unexpected engine identity "${this.id.name}" (expected ${EXPECTED_ENGINE}).`), { code: 'wrong-engine' });
    }
    this.send('setoption name UCI_ShowWDL value true');
    this.applied.UCI_ShowWDL = 'true';
    await this.isReady();
    this.setState('ready', { message: `${this.id.name} ready` });
    return true;
  }

  async isReady(timeout = 30000) {
    this.send('isready');
    await this._waitLine((l) => l === 'readyok', timeout, 'Engine did not answer isready');
  }

  _onWorkerMessage(m) {
    if (m.type === 'line') this._onLine(m.line);
    else if (m.type === 'ready') this._readyResolve?.(m);
    else if (m.type === 'progress') this.emit({ type: 'progress', loaded: m.loaded, total: m.total });
    else if (m.type === 'status') this.emit({ type: 'status', message: m.message });
    else if (m.type === 'error') {
      const err = Object.assign(new Error(m.message), { code: m.code });
      this._readyReject?.(err);
      this._fail(m.code, m.message);
    }
  }

  _onLine(line) {
    this.log.push(line);
    if (this.log.length > 400) this.log.splice(0, 100);
    this.emit({ type: 'line', line });
    if (line.startsWith('id name ')) this.id.name = line.slice(8).trim();
    else if (line.startsWith('id author ')) this.id.author = line.slice(10).trim();
    else if (line.startsWith('option name ')) {
      const m = /^option name (.+?) type (\w+)(?: default (\S*))?(?: min (-?\d+))?(?: max (-?\d+))?/.exec(line);
      if (m) this.options[m[1]] = { type: m[2], default: m[3], min: m[4] && +m[4], max: m[5] && +m[5] };
    } else if (this.current?.perft) {
      this._onPerftLine(line);
    } else if (line.startsWith('info ') && this.current) {
      this._onInfo(parseInfo(line));
    } else if (line.startsWith('bestmove')) {
      this._onBestmove(line);
    }
    for (const w of [...this.lineWaiters]) {
      if (w.pred(line)) { this.lineWaiters.splice(this.lineWaiters.indexOf(w), 1); clearTimeout(w.timer); w.resolve(line); }
    }
  }

  _waitLine(pred, timeout, message) {
    return new Promise((resolve, reject) => {
      const w = { pred, resolve };
      w.timer = setTimeout(() => {
        this.lineWaiters.splice(this.lineWaiters.indexOf(w), 1);
        reject(Object.assign(new Error(message), { code: 'timeout' }));
      }, timeout);
      this.lineWaiters.push(w);
    });
  }

  _fail(code, message) {
    if (this.state === 'error' && this.error?.code === code) return;
    this.error = { code, message };
    const s = this.current;
    this.current = null;
    if (s) { s.resolve({ ...this._result(s), error: message }); s.finish?.(); }
    if (this.pending) { this.pending.resolve({ cancelled: true, error: message }); this.pending = null; }
    for (const w of this.lineWaiters) clearTimeout(w.timer);
    this.lineWaiters = [];
    this.setState('error', { code, message });
    try { this.worker?.terminate(); } catch { /* ignore */ }
    this.worker = null;
  }

  send(cmd) {
    if (!this.worker) return;
    this.log.push(`> ${cmd}`);
    this.emit({ type: 'sent', cmd });
    this.worker.postMessage({ type: 'cmd', cmd });
  }

  /** Stop everything and free the worker (engine "off"). */
  terminate() {
    const s = this.current;
    this.current = null;
    if (s) { s.resolve({ ...this._result(s), cancelled: true }); s.finish?.(); }
    if (this.pending) { this.pending.resolve({ cancelled: true }); this.pending = null; }
    for (const w of this.lineWaiters) clearTimeout(w.timer);
    this.lineWaiters = [];
    try { this.worker?.terminate(); } catch { /* ignore */ }
    this.worker = null;
    this.applied = {};
    this.id = { name: null, author: null };
    this.startPromise = null;
    this.setState('off');
  }

  async restart() {
    this.terminate();
    return this.start();
  }

  /**
   * Analyse a position.
   *   req = { fen, depth?, movetime?, infinite?, multipv?, threads?, hash?, searchmoves? }
   *   onUpdate(snapshot) is called as lines improve.
   * Returns { id, promise, stop() }. The promise resolves with
   *   { id, fen, bestmove, ponder, lines, depth, cancelled?, error? }.
   */
  analyze(req, onUpdate) {
    const id = ++searchSeq;
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    const job = { ...req, id, onUpdate, resolve, lines: new Map(), stopped: false };
    if (this.state !== 'ready') {
      resolve({ id, fen: req.fen, cancelled: true, error: this.error?.message || 'Engine is not running' });
      return { id, promise, stop() {} };
    }
    if (this.pending) this.pending.resolve({ id: this.pending.id, fen: this.pending.fen, cancelled: true });
    this.pending = job;
    this._pump();
    return {
      id,
      promise,
      stop: () => this.stopSearch(id),
    };
  }

  /** Stop the search with this id (or whatever is running when id is omitted). */
  stopSearch(id) {
    if (this.pending && (id === undefined || this.pending.id === id)) {
      this.pending.resolve({ id: this.pending.id, fen: this.pending.fen, cancelled: true });
      this.pending = null;
    }
    if (this.current && (id === undefined || this.current.id === id) && !this.current.stopped) {
      this.current.stopped = true;
      this.send('stop');
    }
  }

  async _pump() {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.pending && this.state === 'ready') {
        if (this.current) {
          if (!this.current.stopped) { this.current.stopped = true; this.send('stop'); }
          await this.current.done;
          continue;
        }
        const job = this.pending;
        this.pending = null;
        await this._run(job);
      }
    } finally {
      this.pumping = false;
    }
  }

  async _run(job) {
    // Options are only changed while no search is running (we are idle here).
    const want = {};
    if (job.multipv) want.MultiPV = String(job.multipv);
    if (job.threads) want.Threads = String(job.threads);
    if (job.hash) want.Hash = String(job.hash);
    let changed = false;
    for (const [k, v] of Object.entries(want)) {
      if (this.applied[k] !== v) { this.send(`setoption name ${k} value ${v}`); this.applied[k] = v; changed = true; }
    }
    if (job.newGame) { this.send('ucinewgame'); changed = true; }
    if (changed) {
      try { await this.isReady(60000); } catch (e) { this._fail('timeout', e.message); return; }
    }
    if (this.state !== 'ready') { job.resolve({ id: job.id, fen: job.fen, cancelled: true }); return; }
    // Never send a position Stockfish cannot handle: it treats an unsupported
    // position as a critical error and exits.
    const v = validatePosition(job.fen);
    if (!v.ok) { job.resolve({ id: job.id, fen: job.fen, error: `Position not analysed: ${v.error}`, lines: [] }); return; }
    job.sideToMove = job.fen.split(' ')[1];
    job.chess = new Chess(job.fen);
    job.done = new Promise((r) => { job.finish = r; });
    job.startedAt = performance.now();
    this.current = job;
    this.send(`position fen ${job.fen}`);
    if (job.perft) {
      job.divide = [];
      this.send(`go perft ${job.perft}`);
      this.emit({ type: 'search-start', id: job.id, fen: job.fen });
      return;
    }
    let go = 'go';
    if (job.infinite) go += ' infinite';
    else {
      if (job.depth) go += ` depth ${job.depth}`;
      if (job.movetime) go += ` movetime ${job.movetime}`;
      if (job.nodes) go += ` nodes ${job.nodes}`;
    }
    if (job.searchmoves?.length) go += ` searchmoves ${job.searchmoves.join(' ')}`;
    this.send(go);
    this.emit({ type: 'search-start', id: job.id, fen: job.fen });
  }

  _onInfo(info) {
    const job = this.current;
    if (!info || !job || !info.pv || !info.score) return;
    const mpv = info.multipv || 1;
    // Validate the PV against the position this search was started for. A PV
    // whose first move is illegal here cannot belong to this search.
    const first = info.pv[0];
    if (!job.legal) job.legal = new Set(job.chess.moves({ verbose: true }).map((m) => m.lan));
    if (!job.legal.has(first)) return;
    const prev = job.lines.get(mpv);
    // Keep exact scores; skip bound-only updates of a line we already have at this depth.
    if (info.score.bound && prev && prev.depth >= info.depth) return;
    job.lines.set(mpv, {
      multipv: mpv,
      depth: info.depth,
      seldepth: info.seldepth,
      score: toWhitePov(info.score, job.sideToMove),
      rawScore: info.score,
      wdl: info.wdl ? (job.sideToMove === 'w' ? info.wdl : [info.wdl[2], info.wdl[1], info.wdl[0]]) : null,
      pv: info.pv,
      nodes: info.nodes,
      nps: info.nps,
      time: info.time,
      hashfull: info.hashfull,
    });
    job.depth = Math.max(job.depth || 0, info.depth || 0);
    job.nodes = info.nodes ?? job.nodes;
    job.nps = info.nps ?? job.nps;
    if (job.onUpdate) {
      const now = performance.now();
      if (!job.lastUpdate || now - job.lastUpdate > 80) {
        job.lastUpdate = now;
        job.onUpdate(this._result(job));
      } else if (!job.updateTimer) {
        job.updateTimer = setTimeout(() => {
          job.updateTimer = null;
          if (this.current === job) { job.lastUpdate = performance.now(); job.onUpdate(this._result(job)); }
        }, 90);
      }
    }
  }

  /** Count legal move sequences with Stockfish's own generator (`go perft`). */
  perft(fen, depth) {
    return this.analyze({ fen, perft: depth }).promise;
  }

  _onPerftLine(line) {
    const job = this.current;
    let m = /^([a-h][1-8][a-h][1-8][qrbn]?): (\d+)$/.exec(line);
    if (m) { job.divide.push({ uci: m[1], count: m[2] }); return; }
    m = /^Nodes searched: (\d+)$/.exec(line);
    if (m) {
      this.current = null;
      job.resolve({ id: job.id, fen: job.fen, perft: job.perft, total: m[1], divide: job.divide });
      job.finish();
      this.emit({ type: 'search-end', id: job.id, fen: job.fen });
    }
  }

  _result(job) {
    const lines = [...job.lines.values()].sort((a, b) => a.multipv - b.multipv);
    return { id: job.id, fen: job.fen, lines, depth: job.depth || 0, nodes: job.nodes, nps: job.nps };
  }

  _onBestmove(line) {
    const job = this.current;
    if (!job) return; // bestmove of a search we no longer track
    const [, best, , ponder] = line.split(' ');
    this.current = null;
    clearTimeout(job.updateTimer);
    const res = { ...this._result(job), bestmove: best === '(none)' ? null : best, ponder: ponder || null, stopped: job.stopped };
    if (best && best !== '(none)' && !job.legal?.has(best) && !job.chess.moves({ verbose: true }).some((m) => m.lan === best)) {
      res.error = `Engine returned a move (${best}) that is illegal in the analysed position.`;
    }
    job.onUpdate?.(res);
    job.resolve(res);
    job.finish();
    this.emit({ type: 'search-end', id: job.id, fen: job.fen });
  }

  get busy() { return !!this.current || !!this.pending; }
}
