// Full-game review with Stockfish 19: analyses every main-line position,
// classifies each move by expected-score loss, and summarises the game.
import { Chess, pvToSan, tryUci, isStandardStart } from './chess-util.js';
import { formatScore, classifyMove, winPercentFor, whiteWinPercent, terminalScore, CLASS_INFO, CLASS_THRESHOLDS } from './eval.js';
import { escapeHtml } from './app.js';

const $ = (s) => document.querySelector(s);
const PIECE = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export function initReview(app) {
  const ui = {
    start: $('#review-start'), pause: $('#review-pause'), restart: $('#review-restart'),
    mode: $('#review-mode'), depth: $('#review-depth'), time: $('#review-time'), multipv: $('#review-multipv'),
    progress: $('#review-progress'), status: $('#review-status'), summaryCard: $('#review-summary-card'),
    summary: $('#review-summary'), critical: $('#review-critical'), graph: $('#review-graph'), move: $('#review-move'),
    info: $('#review-game-info'), method: $('#review-method'),
  };
  const p = app.prefs;
  if (p.reviewMode) ui.mode.value = p.reviewMode;
  if (p.reviewDepth) ui.depth.value = p.reviewDepth;
  if (p.reviewTime) ui.time.value = p.reviewTime;
  if (p.reviewMultipv) ui.multipv.value = p.reviewMultipv;
  const syncInputs = () => {
    $('#review-depth-wrap').classList.toggle('hidden', ui.mode.value !== 'depth');
    $('#review-time-wrap').classList.toggle('hidden', ui.mode.value !== 'time');
  };
  syncInputs();
  for (const el of [ui.mode, ui.depth, ui.time, ui.multipv]) el.addEventListener('change', () => {
    syncInputs();
    app.savePrefs({ reviewMode: ui.mode.value, reviewDepth: ui.depth.value, reviewTime: ui.time.value, reviewMultipv: ui.multipv.value });
  });

  ui.method.innerHTML = `Method: each position is searched by Stockfish 19 (${'settings shown above'}); a move's class comes from the drop in the mover's expected score (win %, Lichess logistic model) between the engine's best line and the played move. Bands: Excellent &lt; ${CLASS_THRESHOLDS[0].max}, Good &lt; ${CLASS_THRESHOLDS[1].max}, Inaccuracy &lt; ${CLASS_THRESHOLDS[2].max}, Mistake &lt; ${CLASS_THRESHOLDS[3].max}, Blunder ≥ ${CLASS_THRESHOLDS[3].max} percentage points. "Best" = Stockfish's first choice, "Forced" = the only legal move, "Book" = still in the local opening database. Results depend on depth and on this method.`;

  const st = { token: 0, running: false, settingsKey: null, handle: null, tree: null };
  app.showReviewBadges = true;

  function settings() {
    return ui.mode.value === 'time'
      ? { movetime: Math.max(200, Math.round(Number(ui.time.value) * 1000)), multipv: Number(ui.multipv.value), key: `t${ui.time.value}/${ui.multipv.value}` }
      : { depth: Math.max(6, Math.min(40, Number(ui.depth.value) || 16)), multipv: Number(ui.multipv.value), key: `d${ui.depth.value}/${ui.multipv.value}` };
  }

  function positions() { return [app.tree.root, ...app.tree.mainline()]; }

  function setButtons() {
    ui.start.disabled = st.running || app.engine.state !== 'ready';
    ui.pause.disabled = !st.running;
    ui.restart.disabled = st.running ? false : !positions().some((n) => n.reviewEval);
    const nodes = positions();
    const done = nodes.filter((n) => n.reviewEval && n.reviewEval.key === st.settingsKey).length;
    ui.start.textContent = done > 0 && done < nodes.length && !st.running ? 'Resume review' : 'Start review';
  }

  function bookPlies() {
    if (!app.book || !isStandardStart(app.tree.startFen)) return 0;
    const moves = app.tree.mainline().map((n) => n.uci);
    let k = 0;
    for (let i = 1; i <= moves.length; i++) {
      const seq = moves.slice(0, i).join(' ');
      if (app.book.bySeq.has(seq) || app.book.prefixes.has(seq)) k = i; else break;
    }
    return k;
  }

  async function run({ restart = false } = {}) {
    if (app.engine.state !== 'ready') { app.toast('Switch the engine on first (Analysis tab)'); return; }
    const nodes = positions();
    if (nodes.length < 2) { ui.status.textContent = 'There are no moves to review. Import a PGN or play some moves first.'; return; }
    const s = settings();
    if (restart || st.settingsKey !== s.key || st.tree !== app.tree) {
      for (const n of nodes) { delete n.reviewEval; delete n.review; }
      st.settingsKey = s.key;
      st.tree = app.tree;
    }
    const token = ++st.token;
    st.running = true;
    app.reviewRunning = true;
    app.analysisStop?.();
    app.setArrows('analysis', []);
    app.renderEvalBar?.(null);
    ui.progress.classList.remove('hidden');
    setButtons();
    const total = nodes.length;
    let first = true;
    for (let i = 0; i < total; i++) {
      if (token !== st.token) return;
      const n = nodes[i];
      if (n.reviewEval && n.reviewEval.key === s.key) continue;
      ui.status.textContent = `Analysing position ${i + 1} of ${total}…`;
      ui.progress.firstElementChild.style.width = `${(i / total) * 100}%`;
      const chess = new Chess(n.fen);
      if (chess.isCheckmate() || chess.isStalemate()) {
        n.reviewEval = { key: s.key, fen: n.fen, score: terminalScore(chess), lines: [], depth: 0, terminal: true };
      } else {
        const handle = app.engine.analyze({ fen: n.fen, depth: s.depth, movetime: s.movetime, multipv: s.multipv, newGame: first });
        first = false;
        st.handle = handle;
        const res = await handle.promise;
        st.handle = null;
        if (token !== st.token) return;
        if (res.error) { fail(res.error); return; }
        if (res.cancelled || res.stopped || !res.lines?.length) { fail('The search was interrupted.'); return; }
        if (res.fen !== n.fen) { fail('Internal error: analysis/position mismatch.'); return; }
        n.reviewEval = { key: s.key, fen: n.fen, score: res.lines[0].score, lines: res.lines, depth: res.depth, bestmove: res.bestmove };
      }
      classifyAll();
      if (app.view === 'review') { renderSummary(); renderMove(); app.refresh(); }
    }
    ui.progress.firstElementChild.style.width = '100%';
    st.running = false;
    app.reviewRunning = false;
    ui.status.textContent = `Review complete: ${total - 1} moves analysed by ${app.engine.id.name} (${s.depth ? `depth ${s.depth}` : `${s.movetime / 1000}s per position`}, ${s.multipv} line${s.multipv > 1 ? 's' : ''}).`;
    setButtons();
    renderSummary();
    renderMove();
    app.refresh();
  }

  function fail(msg) {
    st.running = false;
    app.reviewRunning = false;
    ui.status.innerHTML = `<span class="error-text">Review stopped: ${escapeHtml(msg)}</span> Completed positions are kept; press Resume to continue.`;
    setButtons();
  }

  function pause() {
    st.token++;
    st.running = false;
    app.reviewRunning = false;
    st.handle?.stop();
    st.handle = null;
    const nodes = positions();
    const done = nodes.filter((n) => n.reviewEval).length;
    ui.status.textContent = `Paused after ${done} of ${nodes.length} positions. Press Resume to continue.`;
    setButtons();
    app.refresh();
  }

  function classifyAll() {
    const nodes = positions();
    const book = bookPlies();
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const n = nodes[i];
      if (!prev.reviewEval || !n.reviewEval) continue;
      const mover = n.color;
      const legalCount = new Chess(prev.fen).moves().length;
      const before = prev.reviewEval.score;
      // If the played move is one of the engine's candidate lines, use that line's
      // score (same search, same depth); otherwise the next position's own search.
      const asCandidate = prev.reviewEval.lines.find((l) => l.pv[0] === n.uci);
      const after = asCandidate ? asCandidate.score : n.reviewEval.score;
      const bestUci = prev.reviewEval.lines[0]?.pv[0] || null;
      const c = classifyMove({ before, after, mover, playedUci: n.uci, bestUci, legalCount });
      if (i <= book && c.cls !== 'forced') c.cls = c.loss < CLASS_THRESHOLDS[1].max ? 'book' : c.cls;
      n.review = { ...c, before, after, bestUci, mover, ply: i };
    }
  }

  function explain(node) {
    const r = node.review;
    const prev = node.parent;
    const out = [];
    const best = prev.reviewEval?.lines?.[0];
    const bestMove = best ? tryUci(prev.fen, best.pv[0]) : null;
    const who = r.mover === 'w' ? 'White' : 'Black';
    const opp = r.mover === 'w' ? 'Black' : 'White';
    const moverScore = (s) => (s.type === 'mate' ? s.value * (r.mover === 'w' ? 1 : -1) : null);
    if (r.cls === 'forced') out.push('This was the only legal move.');
    if (r.before.type === 'mate' && moverScore(r.before) > 0 && !(r.after.type === 'mate' && moverScore(r.after) > 0)) {
      out.push(`${who} had a forced mate in ${Math.abs(r.before.value)} starting with ${bestMove?.san || best.pv[0]}, which this move lets slip.`);
    }
    if (r.after.type === 'mate' && moverScore(r.after) < 0 && !(r.before.type === 'mate' && moverScore(r.before) < 0)) {
      out.push(`After this move ${opp} has a forced mate in ${Math.abs(r.after.value)}.`);
    }
    const reply = node.reviewEval?.lines?.[0];
    if (reply && reply.pv[0] && ['inaccuracy', 'mistake', 'blunder'].includes(r.cls)) {
      const m = tryUci(node.fen, reply.pv[0]);
      if (m && m.captured) out.push(`Stockfish's best reply ${m.san} captures the ${PIECE[m.captured]} on ${m.to}.`);
      else if (m && /#$/.test(m.san)) out.push(`Stockfish's reply ${m.san} is checkmate.`);
      else if (m && /\+$/.test(m.san)) out.push(`Stockfish's best reply is the check ${m.san}.`);
    }
    if (bestMove && r.cls !== 'best' && r.cls !== 'forced' && r.cls !== 'book') {
      if (bestMove.captured) out.push(`The engine's choice ${bestMove.san} captures the ${PIECE[bestMove.captured]} on ${bestMove.to}.`);
      if (/#$/.test(bestMove.san)) out.push(`${bestMove.san} would have been checkmate.`);
    }
    if (!out.length && ['inaccuracy', 'mistake', 'blunder'].includes(r.cls)) {
      out.push('No simple tactical reason can be stated reliably; compare the engine line with the move played.');
    }
    return out;
  }

  function renderMove() {
    const node = app.node;
    if (!node.parent || !node.review || !app.tree.isMainline(node)) {
      ui.move.innerHTML = node.parent && !app.tree.isMainline(node)
        ? '<p class="muted">This move is in a side variation; only main-line moves are reviewed.</p>'
        : `<p class="muted">${positions().some((n) => n.review) ? 'Select a move in the list (or use ← →) to see its assessment.' : 'Run the review to see assessments.'}</p>`;
      app.setArrows('review', []);
      app.setMarks('review', new Map());
      return;
    }
    const r = node.review;
    const info = CLASS_INFO[r.cls];
    const prev = node.parent;
    const bestLine = prev.reviewEval.lines[0];
    const bestSan = pvToSan(prev.fen, bestLine.pv);
    const full = prev.fen.split(' ')[5];
    const label = `${full}${node.color === 'w' ? '.' : '…'} ${node.san}`;
    const replyLine = node.reviewEval?.lines?.[0];
    const replySan = replyLine ? pvToSan(node.fen, replyLine.pv) : [];
    const fmtLine = (arr) => arr.slice(0, 10).map((m) => m.san).join(' ');
    const alts = prev.reviewEval.lines.slice(1).map((l) => `${pvToSan(prev.fen, l.pv.slice(0, 1))[0]?.san} (${formatScore(l.score)})`).join(', ');
    const lossText = ['best', 'forced'].includes(r.cls) ? '—' : `${r.loss.toFixed(1)} percentage points of expected score`;
    ui.move.innerHTML = `
      <p><strong>${escapeHtml(label)}</strong> — <span class="cls" style="color:${info.color}" data-testid="review-class">${info.symbol} ${info.label}</span></p>
      <dl>
        <dt>Played</dt><dd>${escapeHtml(node.san)}</dd>
        <dt>Engine preferred</dt><dd><strong>${escapeHtml(bestSan[0]?.san || bestLine.pv[0])}</strong>${alts ? ` <span class="muted small">(alternatives: ${escapeHtml(alts)})</span>` : ''}</dd>
        <dt>Eval before</dt><dd>${escapeHtml(formatScore(r.before))} <span class="muted small">(${who(r.mover)} ${winPercentFor(r.before, r.mover).toFixed(0)}%)</span></dd>
        <dt>Eval after</dt><dd>${escapeHtml(formatScore(r.after))} <span class="muted small">(${who(r.mover)} ${winPercentFor(r.after, r.mover).toFixed(0)}%)</span></dd>
        <dt>Loss</dt><dd>${lossText}</dd>
        <dt>Best line</dt><dd class="small">${escapeHtml(fmtLine(bestSan))}</dd>
        ${replySan.length ? `<dt>After ${escapeHtml(node.san)}</dt><dd class="small">${escapeHtml(fmtLine(replySan))}</dd>` : ''}
        <dt>Depth</dt><dd>${prev.reviewEval.depth}</dd>
      </dl>
      ${explain(node).map((t) => `<p class="small">${escapeHtml(t)}</p>`).join('')}`;
    const arrows = [];
    if (r.cls !== 'best' && bestLine.pv[0]) arrows.push({ from: bestLine.pv[0].slice(0, 2), to: bestLine.pv[0].slice(2, 4), color: 'var(--c-best)', width: 0.15 });
    app.setArrows('review', app.view === 'review' ? arrows : []);
    const marks = new Map();
    if (['inaccuracy', 'mistake', 'blunder'].includes(r.cls)) marks.set(node.to, 'bad');
    else if (r.cls === 'best' || r.cls === 'excellent') marks.set(node.to, 'good');
    app.setMarks('review', app.view === 'review' ? marks : new Map());
    if (app.view === 'review') app.renderEvalBar?.(node.reviewEval?.score || null);
  }
  const who = (c) => (c === 'w' ? 'White' : 'Black');

  function renderSummary() {
    const nodes = positions();
    const reviewed = nodes.filter((n) => n.review);
    if (!reviewed.length) { ui.summaryCard.classList.add('hidden'); return; }
    ui.summaryCard.classList.remove('hidden');
    const keys = ['best', 'excellent', 'good', 'book', 'forced', 'inaccuracy', 'mistake', 'blunder'];
    const count = (c, k) => reviewed.filter((n) => n.review.mover === c && n.review.cls === k).length;
    const avgLoss = (c) => {
      const xs = reviewed.filter((n) => n.review.mover === c);
      return xs.length ? (xs.reduce((s, n) => s + n.review.loss, 0) / xs.length).toFixed(1) : '—';
    };
    const h = app.tree.headers;
    ui.summary.innerHTML = `<table class="review-summary" data-testid="review-summary"><thead><tr><th></th><th>${escapeHtml(h.White || 'White')}</th><th>${escapeHtml(h.Black || 'Black')}</th></tr></thead><tbody>
      ${keys.map((k) => `<tr><td><span class="cls-dot" style="background:${CLASS_INFO[k].color}"></span>${CLASS_INFO[k].label}</td><td data-k="w-${k}">${count('w', k)}</td><td data-k="b-${k}">${count('b', k)}</td></tr>`).join('')}
      <tr><td>Avg. expected-score loss</td><td>${avgLoss('w')}</td><td>${avgLoss('b')}</td></tr></tbody></table>`;
    const crit = reviewed.filter((n) => ['mistake', 'blunder', 'inaccuracy'].includes(n.review.cls));
    ui.critical.innerHTML = crit.length ? crit.map((n) => {
      const full = n.parent.fen.split(' ')[5];
      const info = CLASS_INFO[n.review.cls];
      return `<li><button data-node="${n.id}">${full}${n.color === 'w' ? '.' : '…'} ${escapeHtml(n.san)}</button> <span style="color:${info.color}">${info.label}</span> <span class="muted small">(${formatScore(n.review.before)} → ${formatScore(n.review.after)})</span></li>`;
    }).join('') : '<li class="muted">No inaccuracies, mistakes or blunders found.</li>';
    renderGraph(nodes);
  }

  function renderGraph(nodes) {
    const pts = nodes.map((n, i) => ({ i, n, w: n.reviewEval ? whiteWinPercent(n.reviewEval.score) : null }));
    const W = 600;
    const H = 120;
    const x = (i) => (nodes.length > 1 ? (i / (nodes.length - 1)) * W : 0);
    const y = (w) => H - (w / 100) * H;
    const known = pts.filter((p) => p.w !== null);
    let area = '';
    if (known.length) area = `M0,${H} ` + known.map((p) => `L${x(p.i).toFixed(1)},${y(p.w).toFixed(1)}`).join(' ') + ` L${x(known[known.length - 1].i).toFixed(1)},${H} Z`;
    const dots = pts.filter((p) => p.n.review && ['mistake', 'blunder', 'inaccuracy'].includes(p.n.review.cls))
      .map((p) => `<circle cx="${x(p.i)}" cy="${y(p.w ?? 50)}" r="4" fill="${CLASS_INFO[p.n.review.cls].color}"><title>${p.n.san}: ${CLASS_INFO[p.n.review.cls].label}</title></circle>`).join('');
    const curIdx = nodes.indexOf(app.node);
    ui.graph.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="White's expected score over the game">
      <rect width="${W}" height="${H}" fill="#403d39"/>
      <path d="${area}" fill="#f2f2f2"/>
      <line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="#888" stroke-dasharray="4 4"/>
      ${curIdx >= 0 ? `<line x1="${x(curIdx)}" x2="${x(curIdx)}" y1="0" y2="${H}" stroke="var(--arrow)" stroke-width="2"/>` : ''}
      ${dots}</svg>`;
    ui.graph.onclick = (e) => {
      const r = ui.graph.getBoundingClientRect();
      const i = Math.round(((e.clientX - r.left) / r.width) * (nodes.length - 1));
      if (nodes[i]) app.goto(nodes[i]);
    };
  }

  ui.critical.addEventListener('click', (e) => {
    const b = e.target.closest('[data-node]');
    if (b) app.goto(app.tree.get(Number(b.dataset.node)));
  });
  ui.start.addEventListener('click', () => run());
  ui.pause.addEventListener('click', pause);
  ui.restart.addEventListener('click', () => { if (st.running) pause(); run({ restart: true }); });

  function renderInfo() {
    const h = app.tree.headers;
    const n = app.tree.mainline().length;
    ui.info.innerHTML = n ? `${h.White || h.Black ? `<strong>${escapeHtml(h.White || '?')}</strong> – <strong>${escapeHtml(h.Black || '?')}</strong> ${escapeHtml(h.Result || '')}<br>` : ''}<span class="muted">${n} plies in the main line${h.Event && h.Event !== '?' ? ` · ${escapeHtml(h.Event)}` : ''}</span>` : '';
  }

  app.onChange((kind) => {
    if (kind === 'tree') {
      if (st.running && st.tree !== app.tree) pause();
      if (st.tree !== app.tree) { st.settingsKey = null; ui.status.textContent = ''; ui.progress.classList.add('hidden'); }
      else classifyAll();
      renderInfo();
      renderSummary();
      setButtons();
    }
    if (kind === 'view') {
      renderInfo();
      setButtons();
      if (app.view === 'review') { renderSummary(); renderMove(); } else { app.setArrows('review', []); app.setMarks('review', new Map()); }
    }
    if (kind === 'position' && app.view === 'review') { renderMove(); renderGraph(positions()); }
  });
  app.engine.on((ev) => { if (ev.type === 'state') setButtons(); });
  renderInfo();
  setButtons();
}
