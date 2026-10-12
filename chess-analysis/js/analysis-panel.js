// Analysis panel: engine on/off, limits, MultiPV, continuous analysis, eval bar,
// candidate lines (play / explore / compare), legal move count, position status.
import { pvToSan, gameStatus } from './chess-util.js';
import { formatScore, barPercent, winPercentFor } from './eval.js';
import { escapeHtml } from './app.js';

const $ = (s) => document.querySelector(s);

export function initAnalysis(app) {
  const engine = app.engine;
  const p = app.prefs;
  const ui = {
    toggle: $('#engine-toggle'), status: $('#engine-status'), limit: $('#limit-mode'), depth: $('#depth-input'),
    time: $('#time-input'), multipv: $('#multipv-input'), threads: $('#threads-input'), hash: $('#hash-input'),
    analyze: $('#analyze-btn'), stop: $('#stop-btn'), reanalyze: $('#reanalyze-btn'), continuous: $('#continuous-input'),
    summary: $('#engine-summary'), lines: $('#pv-lines'), legal: $('#legal-count'), posStatus: $('#pos-status'),
    evalbar: $('#evalbar'),
  };
  const cores = Math.max(1, navigator.hardwareConcurrency || 1);
  const maxThreads = Math.max(1, Math.min(cores, 32));
  for (let t = 1; t <= maxThreads; t++) ui.threads.add(new Option(String(t), String(t)));
  ui.threads.value = String(Math.min(p.threads || Math.max(1, Math.min(cores - 1, 4)), maxThreads));
  if (p.limit) ui.limit.value = p.limit;
  if (p.depth) ui.depth.value = p.depth;
  if (p.time) ui.time.value = p.time;
  if (p.multipv) ui.multipv.value = p.multipv;
  if (p.hash) ui.hash.value = p.hash;
  if (p.continuous === false) ui.continuous.checked = false;

  const state = {
    handle: null, // current engine search handle
    result: null, // latest result for the displayed position
    cache: new Map(), // fen -> best result seen (same multipv)
    want: false, // user wants analysis running for the displayed position
  };
  app.analysis = state;

  function settings() {
    const mode = ui.limit.value;
    return {
      multipv: Number(ui.multipv.value),
      threads: Number(ui.threads.value),
      hash: Number(ui.hash.value),
      infinite: mode === 'infinite',
      depth: mode === 'depth' ? Math.max(1, Math.min(99, Number(ui.depth.value) || 20)) : undefined,
      movetime: mode === 'time' ? Math.max(100, Math.round((Number(ui.time.value) || 5) * 1000)) : undefined,
    };
  }

  function syncLimitInputs() {
    $('#depth-wrap').classList.toggle('hidden', ui.limit.value !== 'depth');
    $('#time-wrap').classList.toggle('hidden', ui.limit.value !== 'time');
  }
  syncLimitInputs();

  function saveSettings() {
    app.savePrefs({ limit: ui.limit.value, depth: ui.depth.value, time: ui.time.value, multipv: ui.multipv.value, threads: ui.threads.value, hash: ui.hash.value, continuous: ui.continuous.checked });
  }

  function engineUsable() { return engine.state === 'ready' && !app.reviewRunning; }

  function setStatus(text, cls = '') {
    ui.status.textContent = text;
    ui.status.className = `engine-status ${cls}`;
  }

  function updateButtons() {
    const ready = engine.state === 'ready';
    ui.analyze.disabled = !ready || app.reviewRunning;
    ui.reanalyze.disabled = !ready || app.reviewRunning;
    ui.stop.disabled = !ready || !state.handle;
    ui.toggle.checked = engine.state === 'ready' || engine.state === 'loading';
  }

  // ---------------------------------------------------------- engine life cycle
  engine.on((ev) => {
    if (ev.type === 'state') {
      if (ev.state === 'loading') setStatus(ev.message || 'Starting Stockfish 19…');
      if (ev.state === 'ready') {
        setStatus(`${engine.id.name} (official build, ${engine.buildArch === 'relaxed' ? 'WebAssembly relaxed SIMD' : 'WebAssembly SIMD'}, NNUE ${engine.net}). Up to ${engine.cores} threads available.`);
        app.banner(null);
        if (ui.continuous.checked && ['analysis', 'openings'].includes(app.view)) startAnalysis();
      }
      if (ev.state === 'error') {
        setStatus(`Engine error: ${ev.message}`, 'error');
        state.handle = null;
        renderEmpty();
        app.banner(`<strong>Stockfish 19 stopped:</strong> ${escapeHtml(ev.message)}`, {
          actions: [{ label: 'Restart engine', primary: true, onClick: () => { app.banner(null); engine.restart().catch(() => {}); } }],
        });
      }
      if (ev.state === 'off') { setStatus('Engine is off. Switch it on to analyse positions.', 'muted'); state.handle = null; renderEmpty(); }
      updateButtons();
      renderEvalBar();
    } else if (ev.type === 'status') setStatus(ev.message);
    else if (ev.type === 'progress') {
      const pct = ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0;
      setStatus(`Loading Stockfish 19 neural network… ${pct}% (${(ev.loaded / 1048576).toFixed(0)} MB)`);
    }
  });

  ui.toggle.addEventListener('change', () => {
    if (ui.toggle.checked) {
      app.savePrefs({ engineOn: true });
      engine.start().catch(() => {});
    } else {
      app.savePrefs({ engineOn: false });
      stopAnalysis();
      engine.terminate();
    }
  });

  // ---------------------------------------------------------- searching
  function startAnalysis({ force = false } = {}) {
    state.want = true;
    if (!engineUsable()) { updateButtons(); return; }
    const chess = app.currentChess();
    const fen = app.currentFen();
    if (chess.isGameOver() || !chess.moves().length) {
      // Nothing to search: show the rules' verdict instead of engine output.
      stopAnalysis({ keepWant: true });
      renderResult(null);
      return;
    }
    const s = settings();
    if (!force) {
      const cached = state.cache.get(fen);
      if (cached && cached.lines.length >= s.multipv && !s.infinite && cached.depth >= (s.depth || 0) && cached.complete) {
        state.result = cached;
        renderResult(cached);
        return;
      }
    }
    state.result = null;
    renderResult(null, { searching: true });
    const handle = engine.analyze({ fen, ...s }, (res) => {
      if (res.fen !== app.currentFen() || state.handle !== handle) return; // stale
      state.result = res;
      renderResult(res);
    });
    state.handle = handle;
    updateButtons();
    handle.promise.then((res) => {
      if (state.handle === handle) { state.handle = null; updateButtons(); }
      if (res.cancelled || !res.lines?.length) return;
      if (res.error) { setStatus(res.error, 'error'); return; }
      res.complete = !res.stopped;
      const prev = state.cache.get(res.fen);
      if (!prev || prev.depth <= res.depth || prev.lines.length < res.lines.length) state.cache.set(res.fen, res);
      if (res.fen === app.currentFen()) { state.result = res; renderResult(res); }
    });
  }

  function stopAnalysis({ keepWant = false } = {}) {
    if (!keepWant) state.want = false;
    if (state.handle) { state.handle.stop(); }
    updateButtons();
  }

  app.toggleAnalysis = () => {
    if (engine.state !== 'ready') { ui.toggle.checked = true; ui.toggle.dispatchEvent(new Event('change')); return; }
    if (state.handle) stopAnalysis(); else startAnalysis();
  };
  app.analysisStop = () => stopAnalysis({ keepWant: true });

  ui.analyze.addEventListener('click', () => startAnalysis());
  ui.stop.addEventListener('click', () => stopAnalysis());
  ui.reanalyze.addEventListener('click', () => { state.cache.delete(app.currentFen()); startAnalysis({ force: true }); });
  for (const el of [ui.limit, ui.depth, ui.time, ui.multipv, ui.threads, ui.hash]) {
    el.addEventListener('change', () => {
      syncLimitInputs();
      saveSettings();
      if (state.want && engineUsable()) startAnalysis({ force: true });
    });
  }
  ui.continuous.addEventListener('change', () => {
    saveSettings();
    if (ui.continuous.checked && engineUsable()) startAnalysis();
  });

  // ---------------------------------------------------------- position changes
  app.onChange((kind) => {
    if (kind !== 'position' && kind !== 'view') return;
    const chess = app.chess || app.currentChess();
    const moves = chess.moves({ verbose: true });
    ui.legal.textContent = String(moves.length);
    const st = gameStatus(chess);
    ui.posStatus.textContent = st.text;
    ui.posStatus.className = `pos-status${st.kind === 'check' || st.over ? ' alert' : ''}`;
    if (kind === 'view' && !['analysis', 'openings'].includes(app.view)) return;
    if (app.reviewRunning) return;
    const fen = app.currentFen();
    if (state.result && state.result.fen !== fen) state.result = null;
    const runningFor = state.handle && engine.current?.fen;
    if (engine.state === 'ready' && ui.continuous.checked && ['analysis', 'openings'].includes(app.view)) {
      if (runningFor !== fen) startAnalysis();
    } else {
      if (state.handle && runningFor !== fen) stopAnalysis({ keepWant: true });
      const cached = state.cache.get(fen);
      renderResult(cached || null);
    }
  });

  // ---------------------------------------------------------- rendering
  function renderEmpty() {
    ui.summary.innerHTML = '';
    ui.lines.innerHTML = '';
    app.setArrows('analysis', []);
    renderEvalBar();
  }

  function renderEvalBar(score) {
    const bar = ui.evalbar;
    const flipped = app.board.orientation === 'b';
    bar.classList.toggle('flipped', flipped);
    const fill = bar.querySelector('.evalbar-fill');
    const top = bar.querySelector('.evalbar-label.top');
    const bottom = bar.querySelector('.evalbar-label.bottom');
    if (!score) {
      bar.classList.add('off');
      fill.style.height = '50%';
      top.textContent = '';
      bottom.textContent = '';
      bar.setAttribute('aria-label', 'Evaluation bar: no evaluation');
      return;
    }
    bar.classList.remove('off');
    const pct = barPercent(score);
    fill.style.height = `${pct}%`;
    const txt = formatScore(score).replace('+', '').replace('−', '');
    const whiteBetter = score.type === 'mate' ? score.value > 0 || (score.value === 0 && score.matedSide === 'b') : score.value >= 0;
    // Label sits at White's end when White is better, otherwise at Black's end.
    const whiteAtBottom = !flipped;
    const atBottom = whiteBetter === whiteAtBottom;
    top.textContent = atBottom ? '' : txt;
    bottom.textContent = atBottom ? txt : '';
    top.style.color = whiteAtBottom ? '#f5f5f5' : '#333';
    bottom.style.color = whiteAtBottom ? '#333' : '#f5f5f5';
    bar.setAttribute('aria-label', `Evaluation ${formatScore(score)} from White's point of view`);
  }
  app.onChange((k) => { if (k === 'flip') renderEvalBar(state.result?.lines?.[0]?.score || null); });

  function renderResult(res, { searching = false } = {}) {
    const chess = app.currentChess();
    const fen = app.currentFen();
    if (res && res.fen !== fen) res = null; // never show another position's analysis
    const st = gameStatus(chess);
    if (st.over) {
      const score = chess.isCheckmate() ? { type: 'mate', value: 0, matedSide: chess.turn() } : { type: 'cp', value: 0 };
      ui.summary.innerHTML = `<div class="big-eval">${chess.isCheckmate() ? (chess.turn() === 'w' ? '0-1' : '1-0') : '½-½'}</div><div>${escapeHtml(st.text)}</div><div class="kv">No legal moves — no engine search needed.</div>`;
      ui.lines.innerHTML = '';
      app.setArrows('analysis', []);
      renderEvalBar(score);
      return;
    }
    if (engine.state !== 'ready') {
      ui.summary.innerHTML = engine.state === 'error' ? '' : `<div class="kv" style="grid-column:1/-1">Engine analysis is off. Rules-based features (legal moves, counts, openings, PGN) work without it.</div>`;
      ui.lines.innerHTML = '';
      app.setArrows('analysis', []);
      renderEvalBar(null);
      return;
    }
    if (app.reviewRunning) {
      ui.summary.innerHTML = '<div class="kv" style="grid-column:1/-1">Engine is busy with the game review.</div>';
      ui.lines.innerHTML = '';
      return;
    }
    if (!res || !res.lines?.length) {
      ui.summary.innerHTML = `<div class="kv" style="grid-column:1/-1">${searching || state.handle ? 'Stockfish 19 is thinking…' : 'Press <strong>Analyze</strong> (or Space) to analyse this position.'}</div>`;
      ui.lines.innerHTML = '';
      app.setArrows('analysis', []);
      renderEvalBar(null);
      return;
    }
    const best = res.lines[0];
    const bestSan = pvToSan(fen, best.pv.slice(0, 1))[0]?.san || best.pv[0];
    const wdl = best.wdl ? `<span class="kv">W/D/L <b>${(best.wdl[0] / 10).toFixed(1)}/${(best.wdl[1] / 10).toFixed(1)}/${(best.wdl[2] / 10).toFixed(1)}%</b></span>` : '';
    const running = state.handle && engine.current?.fen === fen;
    ui.summary.innerHTML = `
      <div class="big-eval" data-testid="eval">${escapeHtml(formatScore(best.score))}</div>
      <div class="kv">Best move <b data-testid="bestmove">${escapeHtml(bestSan)}</b> · depth <b data-testid="depth">${res.depth}</b>${best.seldepth ? `/${best.seldepth}` : ''}${running ? ' · <span class="muted">searching…</span>' : ''}</div>
      <div class="kv">Nodes <b>${res.nodes != null ? res.nodes.toLocaleString() : '—'}</b> · <b>${res.nps != null ? `${(res.nps / 1000).toFixed(0)} kN/s` : '—'}</b></div>
      <div>${wdl}</div>`;
    const bestWin = winPercentFor(best.score, chess.turn());
    ui.lines.innerHTML = res.lines.map((l, i) => {
      const san = pvToSan(fen, l.pv);
      const neg = l.score.type === 'mate' ? l.score.value < 0 : l.score.value < 0;
      const moves = san.map((m, j) => {
        const full = Number(m.fenBefore.split(' ')[5]);
        const num = m.color === 'w' ? `${full}. ` : j === 0 ? `${full}… ` : '';
        return `<button class="pv-move${j === 0 ? ' first' : ''}" data-line="${i}" data-idx="${j + 1}">${num}${escapeHtml(m.san)}</button>`;
      }).join(' ');
      const delta = i > 0 ? `<span class="delta">${(bestWin - winPercentFor(l.score, chess.turn())).toFixed(1)} win-% below best</span>` : '';
      return `<li class="pv-line" data-testid="pv-line">
        <span class="pv-eval${neg ? ' neg' : ''}">${escapeHtml(formatScore(l.score))}</span>
        <span class="pv-moves">${moves}</span>
        <span class="pv-actions"><button data-play="${i}" title="Play this move">Play ${escapeHtml(san[0]?.san || '')}</button><button data-explore="${i}" title="Step through this line on the board">Explore</button>${delta}<span class="delta">d${l.depth}</span></span>
      </li>`;
    }).join('');
    const arrows = res.lines.slice(0, 3).map((l, i) => ({ from: l.pv[0].slice(0, 2), to: l.pv[0].slice(2, 4), color: i === 0 ? 'var(--arrow)' : 'var(--arrow-2)', width: i === 0 ? 0.18 : 0.11, opacity: i === 0 ? 0.85 : 0.55 }));
    app.setArrows('analysis', app.view === 'analysis' || app.view === 'openings' ? arrows : []);
    renderEvalBar(best.score);
  }
  app.renderEvalBar = renderEvalBar;

  ui.lines.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !state.result) return;
    const res = state.result;
    const fen = app.currentFen();
    if (res.fen !== fen) return;
    const lineIdx = Number(b.dataset.play ?? b.dataset.explore ?? b.dataset.line);
    const line = res.lines[lineIdx];
    if (!line) return;
    const san = pvToSan(fen, line.pv);
    if (b.dataset.play !== undefined) {
      app.playMove(line.pv[0]);
      return;
    }
    const moves = san.map((m) => ({ san: m.san, uci: m.uci, from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), fenAfter: m.fenAfter }));
    const label = `line ${lineIdx + 1} (${formatScore(line.score)})`;
    if (app.preview) app.commitPreview(); // explore from the previewed position
    app.startPreview(app.node, moves, label, b.dataset.idx ? Number(b.dataset.idx) : 1);
  });

  updateButtons();
  renderEmpty();
  if (p.engineOn !== false && window.crossOriginIsolated) {
    engine.start().catch(() => {});
  }
}
