// Exact legal-move-sequence counter (UI). The counting runs in a module worker
// (perft-worker.js); cancelling terminates the worker. Every result is tagged
// with the FEN and ply count it was computed for and is only shown while that
// position is on the board.
import { formatBig } from './perft-core.js';
import { escapeHtml } from './app.js';

const $ = (s) => document.querySelector(s);

export function initCounter(app) {
  const ui = {
    depth: $('#counter-depth'), run: $('#counter-run'), cancel: $('#counter-cancel'), verify: $('#counter-verify'),
    progress: $('#counter-progress'), result: $('#counter-result'), divideWrap: $('#counter-divide-wrap'),
    divide: $('#counter-divide'), warning: $('#counter-warning'),
  };
  let worker = null;
  let runSeq = 0;
  let running = null; // { id, fen, depth }
  let last = null; // { fen, depth, total, divide, ms }
  let verify = null; // { fen, depth, total, divide } from Stockfish

  function warn() {
    const d = Number(ui.depth.value);
    ui.warning.textContent = d >= 5
      ? `Exhaustive enumeration grows roughly 30× per ply: ${d} plies from a middlegame position can take minutes (the start position needs ~10 s for 5 plies and several minutes for 6). You can cancel at any time.`
      : '';
  }
  ui.depth.addEventListener('change', () => { warn(); render(); });
  warn();

  function stop() {
    if (worker) { worker.terminate(); worker = null; }
    running = null;
    ui.run.disabled = false;
    ui.cancel.disabled = true;
    ui.progress.classList.add('hidden');
  }

  function run() {
    stop();
    const fen = app.currentFen();
    const depth = Number(ui.depth.value);
    const id = ++runSeq;
    running = { id, fen, depth };
    last = null;
    ui.run.disabled = true;
    ui.cancel.disabled = false;
    ui.progress.classList.remove('hidden');
    ui.progress.firstElementChild.style.width = '0%';
    ui.result.innerHTML = `<span class="muted">Counting ${depth}-ply sequences…</span>`;
    ui.divideWrap.classList.add('hidden');
    try {
      worker = new Worker('js/perft-worker.js', { type: 'module' });
    } catch (e) {
      ui.result.innerHTML = `<span class="error-text">Could not start the counting worker: ${escapeHtml(e.message)}</span>`;
      stop();
      return;
    }
    worker.onmessage = (e) => {
      const m = e.data;
      if (!running || m.id !== running.id) return; // stale message
      if (m.type === 'progress') {
        ui.progress.firstElementChild.style.width = `${(m.done / m.total) * 100}%`;
        ui.result.innerHTML = `<span class="muted">Counting… ${m.done}/${m.total} first moves done (after ${escapeHtml(m.move)}: ${formatBig(m.partial)} so far)</span>`;
      } else if (m.type === 'done') {
        last = { fen: m.fen, depth: m.depth, total: BigInt(m.total), divide: m.divide, ms: m.ms };
        stop();
        render();
      } else if (m.type === 'error') {
        stop();
        ui.result.innerHTML = `<span class="error-text">${escapeHtml(m.message)}</span>`;
      }
    };
    worker.onerror = (e) => {
      stop();
      ui.result.innerHTML = `<span class="error-text">Counting worker failed: ${escapeHtml(e.message || 'unknown error')}</span>`;
    };
    worker.postMessage({ id, fen, depth });
  }

  function render() {
    const fen = app.currentFen();
    if (running) return;
    if (!last || last.fen !== fen) {
      ui.result.innerHTML = '';
      ui.divideWrap.classList.add('hidden');
      return;
    }
    const plyWord = last.depth === 1 ? 'ply' : 'plies';
    let html = `<div><span class="big" data-testid="counter-total">${formatBig(last.total)}</span> legal move sequence${last.total === 1n ? '' : 's'} of exactly ${last.depth} ${plyWord}</div>
      <div class="muted small">Exact count by exhaustive enumeration (${(last.ms / 1000).toFixed(2)} s). ${last.total === 0n ? 'The side to move has no legal moves (checkmate or stalemate), so no sequence of this length exists.' : ''}</div>`;
    if (verify && verify.fen === fen && verify.depth === last.depth) {
      const same = BigInt(verify.total) === last.total;
      html += `<div class="${same ? 'feedback ok' : 'feedback bad'}" data-testid="counter-verify">Stockfish 19 <code>go perft ${verify.depth}</code>: ${formatBig(verify.total)} — ${same ? 'matches' : 'DOES NOT MATCH'}</div>`;
    }
    ui.result.innerHTML = html;
    if (last.divide.length) {
      ui.divideWrap.classList.remove('hidden');
      ui.divide.innerHTML = last.divide.map((d) => `<span>${escapeHtml(d.san)}: ${formatBig(d.count)}</span>`).join('');
    } else ui.divideWrap.classList.add('hidden');
    if (Number(ui.depth.value) !== last.depth) ui.result.innerHTML += `<div class="muted small">Shown result is for ${last.depth} ${plyWord}; press Count for ${ui.depth.value}.</div>`;
  }

  ui.run.addEventListener('click', run);
  ui.cancel.addEventListener('click', () => {
    stop();
    ui.result.innerHTML = '<span class="muted">Cancelled.</span>';
  });
  ui.verify.addEventListener('click', async () => {
    if (app.engine.state !== 'ready') { app.toast('Switch the engine on to cross-check with Stockfish'); return; }
    const fen = app.currentFen();
    const depth = Number(ui.depth.value);
    app.analysisStop?.();
    ui.verify.disabled = true;
    const prev = ui.verify.textContent;
    ui.verify.textContent = 'Stockfish counting…';
    try {
      const r = await app.engine.perft(fen, depth);
      if (r.total != null) verify = { fen: r.fen, depth: r.perft, total: r.total, divide: r.divide };
      else app.toast(r.error || 'Stockfish perft was cancelled');
    } finally {
      ui.verify.disabled = false;
      ui.verify.textContent = prev;
    }
    if (!last || last.fen !== fen || last.depth !== depth) {
      if (verify && verify.fen === fen) {
        ui.result.innerHTML = `<div>Stockfish 19 <code>go perft ${depth}</code>: <strong>${formatBig(verify.total)}</strong>. Press <strong>Count</strong> to compare with the app's own enumeration.</div>`;
      }
    } else render();
  });

  app.onChange((kind) => {
    if (kind !== 'position') return;
    if (running && running.fen !== app.currentFen()) {
      stop();
      ui.result.innerHTML = '<span class="muted">Position changed — count cancelled.</span>';
      return;
    }
    render();
  });
}
