
/* =====================================================================
   7c. HAND HISTORY VIEWER  (fully offline; same Engine + TableView)
   ===================================================================== */
function ViewerScreen() {
  document.title = TitleFlash.base = 'Hand History Viewer · Feltroom';
  document.body.classList.add('viewer-mode');
  const V = { game: null, replay: null, stats: null, hk: 0, si: 0, persp: null, playing: false, timer: null, speed: Prefs.get('vSpeed', 1), tab: 'stats', table: null };
  let onKey = null;

  function loadPage(text, err) {
    if (V.table) { V.table.destroy(); V.table = null; }
    stop();
    App.root.innerHTML = `<div class="game" style="grid-template-rows:auto 1fr">
      <header class="topbar"><a class="btn ghost icon-btn" href="#/" aria-label="Home">${icon('home')}</a>
        <div class="brand"><div style="min-width:0"><div class="t-name">Hand History Viewer</div><div class="t-sub">Replays run entirely in your browser</div></div></div>
        <div class="top-actions">${topIconButtons()}<button class="btn ghost icon-btn" id="v-help" aria-label="Keyboard shortcuts">${icon('help')}</button></div></header>
      <div class="v-load">
        <div class="page-head" style="margin:0"><h2>Replay a game</h2></div>
        <p class="muted" style="margin:0">Paste a game record (from <b>Copy Game Record</b> at the table). Nothing is uploaded: every hand is re-simulated locally with the same rules engine the live game uses.</p>
        <textarea class="input" id="v-text" rows="16" spellcheck="false" aria-label="Game record"></textarea>
        <div id="v-err"></div>
        <div class="row" style="flex-wrap:wrap">
          <button class="btn primary lg" id="v-load">Load</button>
          <button class="btn lg" id="v-sample">Load sample game</button>
          <span class="grow"></span>
          <label class="btn ghost">${icon('download')}Open a .txt file<input type="file" id="v-file" accept=".txt,text/plain" hidden></label>
        </div>
      </div></div>`;
    bindThemeToggles(App.root);
    $('#v-help').addEventListener('click', () => helpOverlay('viewer'));
    const ta = $('#v-text');
    ta.value = text || '';
    $('#v-load').addEventListener('click', () => tryLoad(ta.value));
    $('#v-sample').addEventListener('click', () => { ta.value = SAMPLE_RECORD; tryLoad(SAMPLE_RECORD); });
    $('#v-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) { ta.value = await f.text(); tryLoad(ta.value); } });
    if (err) showErr(err);
    else setTimeout(() => ta.focus(), 30);
  }

  function showErr(e) {
    const box = $('#v-err');
    if (!box) return;
    box.innerHTML = `<div class="err-box" role="alert">${icon('alert')}<div style="flex:1">${e.line ? `<b>Line ${e.line}</b>: ${U.esc(e.detail)}` : U.esc(e.message)}</div>${e.line ? `<button class="btn sm" id="v-goto">Show line</button>` : ''}</div>`;
    const g = $('#v-goto');
    if (g) g.addEventListener('click', () => {
      const ta = $('#v-text'), lines = ta.value.split('\n');
      let start = 0;
      for (let i = 0; i < e.line - 1 && i < lines.length; i++) start += lines[i].length + 1;
      ta.focus(); ta.setSelectionRange(start, start + (lines[e.line - 1] || '').length);
      ta.scrollTop = Math.max(0, (e.line - 4) * 19.5);
    });
  }

  async function tryLoad(text) {
    // A compact record (starting with ♣) is unpacked to the full text first.
    if (Compact.isCompact(text)) {
      try { text = await Compact.decode(text); }
      catch (e) { if ($('#v-text')) showErr(e); else loadPage(text, e); return; }
    }
    let game;
    try { game = Notation.parse(text); }
    catch (e) { if ($('#v-text')) showErr(e); else loadPage(text, e); return; }
    if (!game.hands.length) { const e = new RecordError(1, 'The record has a header but no hands yet.'); if ($('#v-text')) showErr(e); else loadPage(text, e); return; }
    Prefs.set('viewerLast', text);
    V.text = text; V.game = game;
    V.replay = Replay.game(game);
    V.stats = Replay.stats(V.replay);
    V.order = V.stats.players.map((p) => p.name);
    // Default point of view: the player whose hole cards are known most often (the record's owner).
    const known = Object.create(null);
    game.hands.forEach((h) => Object.entries(h.hole).forEach(([n, c]) => { if (c) known[n] = (known[n] || 0) + 1; }));
    V.persp = Object.keys(known).sort((a, b) => known[b] - known[a])[0] || V.order[0];
    V.hk = Math.max(0, V.replay.hands.findIndex((h) => h.steps.length));
    V.si = 0;
    mainPage();
  }

  const tag = (k) => (V.game.tags.find((t) => t[0] === k) || [])[1];
  const colorOf = (name) => { const i = V.order.indexOf(name); return i >= 0 && i < 8 ? `var(--series-${i + 1})` : 'var(--text-3)'; };

  function mainPage() {
    const nIssues = V.replay.issues.length;
    App.root.innerHTML = `<div class="game" style="grid-template-rows:auto 1fr">
      <header class="topbar"><a class="btn ghost icon-btn" href="#/" aria-label="Home">${icon('home')}</a>
        <div class="brand"><div style="min-width:0"><div class="t-name">${U.esc(tag('Event') || 'Game record')}</div><div class="t-sub">${U.esc([(Object.hasOwn(VARIANTS, tag('Variant') || 'NLHE') ? VARIANTS[tag('Variant') || 'NLHE'] : {}).name, tag('Date'), `Blinds ${tag('Blinds')}`, `${V.game.hands.length} hands`, tag('HoleCards') === 'All' ? 'all hole cards' : 'showdown cards only'].filter(Boolean).join(' · '))}</div></div></div>
        <div class="top-actions">
          <label class="row hide-sm" style="font-size:13px;color:var(--text-2)">View from <select class="input" id="v-persp" style="height:34px;width:auto">${V.order.map((n) => `<option ${n === V.persp ? 'selected' : ''}>${U.esc(n)}</option>`).join('')}</select></label>
          <button class="btn sm" id="v-new">${icon('plus')}<span class="hide-sm">Load another</span></button>
          <button class="btn sm ghost hide-sm" id="v-copy">${icon('copy')}<span>Copy</span></button>
          ${topIconButtons()}<button class="btn ghost icon-btn hide-sm" id="v-help" aria-label="Keyboard shortcuts">${icon('help')}</button>
        </div></header>
      <div class="viewer-body">
        <nav class="v-hands" id="v-hands" aria-label="Hands"></nav>
        <main class="v-main">
          <div class="v-label" id="v-label" aria-live="polite"></div>
          <div class="table-stage" id="v-stage"></div>
          <div class="v-controls" role="toolbar" aria-label="Replay controls">
            <button class="btn icon-btn" data-nav="prevHand" title="Previous hand (↑)" aria-label="Previous hand">${icon('first')}</button>
            <button class="btn icon-btn" data-nav="prevStreet" title="Previous street (Shift+←)" aria-label="Previous street">${icon('skipBack')}</button>
            <button class="btn icon-btn" data-nav="prev" title="Step back (←)" aria-label="Step back">${icon('back')}</button>
            <button class="btn primary icon-btn" data-nav="play" id="v-play" title="Autoplay (Space)" aria-label="Autoplay">${icon('play')}</button>
            <button class="btn icon-btn" data-nav="next" title="Step forward (→)" aria-label="Step forward">${icon('fwd')}</button>
            <button class="btn icon-btn" data-nav="nextStreet" title="Next street (Shift+→)" aria-label="Next street">${icon('skipFwd')}</button>
            <button class="btn icon-btn" data-nav="nextHand" title="Next hand (↓)" aria-label="Next hand">${icon('last')}</button>
            <span class="sep"></span>
            <select class="input" id="v-speed" style="height:38px;width:auto" aria-label="Autoplay speed">${[[0.5, '0.5×'], [1, '1×'], [2, '2×'], [4, '4×']].map(([s, l]) => `<option value="${s}" ${s === V.speed ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <span class="v-progress" id="v-progress"></span>
          </div>
        </main>
        <aside class="v-side">
          <div class="tabs" role="tablist">
            <button class="tab" role="tab" data-vtab="stats">Stats</button>
            <button class="tab" role="tab" data-vtab="hand">Hand</button>
            <button class="tab" role="tab" data-vtab="issues">Checks${nIssues ? ` <span style="color:var(--warn)">(${nIssues})</span>` : ' ✓'}</button>
          </div>
          <div class="tab-panel" id="v-panel"></div>
        </aside>
      </div></div>`;
    bindThemeToggles(App.root);
    $('#v-help').addEventListener('click', () => helpOverlay('viewer'));
    $('#v-new').addEventListener('click', () => loadPage(V.text));
    CompactCache.prime(Notation.serialize(V.game));
    $('#v-copy').addEventListener('click', () => copyRecordText(Notation.serialize(V.game), 'Record copied'));
    $('#v-persp').addEventListener('change', (e) => { V.persp = e.target.value; show(false); });
    $('#v-speed').addEventListener('change', (e) => { V.speed = Number(e.target.value); Prefs.set('vSpeed', V.speed); if (V.playing) { stop(); play(); } });
    $$('[data-nav]').forEach((b) => b.addEventListener('click', () => nav(b.dataset.nav)));
    $$('[data-vtab]').forEach((b) => b.addEventListener('click', () => { V.tab = b.dataset.vtab; renderSide(); }));
    V.table = new TableView($('#v-stage'), { readOnly: true, mobileHeight: (w) => Math.round(Math.max(380, Math.min(innerHeight * 0.66, w * 1.5))) });
    const list = $('#v-hands');
    list.innerHTML = V.replay.hands.map((rh, k) => `<button class="v-hand" data-hk="${k}">${rh.issues.length ? '<span class="warn-ic" title="Inconsistency found">⚠ </span>' : ''}${(rh.rec.tags || []).some((t) => t[0] === 'Bots') ? '<span title="A bot made decisions in this hand">🤖 </span>' : ''}${U.esc(Replay.summary(rh))}</button>`).join('');
    list.addEventListener('click', (e) => { const b = e.target.closest('[data-hk]'); if (b) { stop(); V.hk = Number(b.dataset.hk); V.si = 0; show(true); } });
    show(true);
    renderSide();
  }

  function cur() { return V.replay.hands[V.hk]; }

  function replayView(rh, step) {
    const h = step.hand, done = h.phase === 'done';
    const persp = Math.max(0, h.players.findIndex((p) => p.name === V.persp));
    const curActs = {};
    for (const e of h.log) if (e.t === 'act' && e.street === h.street) curActs[e.p] = e;
    const wins = {};
    if (done) h.log.filter((e) => e.t === 'win').forEach((e) => { wins[e.p] = (wins[e.p] || 0) + e.amt; });
    const winCards = new Set();
    if (done && h.results.showdown) h.results.pots.forEach((pt) => pt.winners.forEach((w) => { const ev = h.results.evals[w]; if (ev) ev.best.forEach((c) => winCards.add(c)); }));
    const ps = !done ? Engine.collectedPots(h) : [];
    return {
      maxSeats: h.players.length, mySeat: persp, handKey: `r${V.hk}`, readOnly: true, feltText: tag('Event') || '',
      seats: h.players.map((p, i) => ({
        seat: i, name: p.name, stack: p.stack, bet: done ? 0 : p.bet,
        cards: p.hole ? p.hole.slice() : (p.folded || p.mucked ? null : new Array(h.holeCount || 2).fill(null)),
        folded: p.folded || p.mucked, mucked: p.mucked && !p.folded, allIn: p.allIn && !done, button: i === h.button,
        sb: i === h.sbIdx && h.street === 0 && !done, bb: i === h.bbIdx && h.street === 0 && !done,
        toAct: h.phase === 'betting' && h.toAct === i, won: wins[i] || 0, shown: true, isYou: i === persp,
        handName: p.hole && !p.folded && !p.mucked ? Eval.describe(Eval.forGame(h.game, p.hole, h.board)) : null,
        lastAction: curActs[i] ? curActs[i].type : null,
      })),
      board: h.board.slice(), street: done ? (h.results.showdown ? 'Showdown' : STREETS[h.street]) : STREETS[h.street],
      pots: ps.map((pt, k) => ({ label: ps.length > 1 ? (k === 0 ? 'Main' : `Side ${k}`) : 'Pot', amount: pt.amount })),
      results: done ? { winCards: [...winCards], lines: h.log.filter((e) => e.t === 'win').map((e) => Engine.describeEntry(h, e)) } : null,
      timer: null,
    };
  }

  function show(animate) {
    const rh = cur();
    if (!rh) return;
    $$('.v-hand').forEach((b) => b.setAttribute('aria-current', String(Number(b.dataset.hk) === V.hk)));
    const cb = $(`.v-hand[data-hk="${V.hk}"]`);
    if (cb) cb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (!rh.steps.length) {
      $('#v-label').textContent = `Hand #${rh.rec.no} could not be replayed`;
      $('#v-progress').textContent = `Hand ${V.hk + 1}/${V.replay.hands.length}`;
      return;
    }
    V.si = Math.max(0, Math.min(V.si, rh.steps.length - 1));
    const step = rh.steps[V.si];
    V.table.render(replayView(rh, step), { animate });
    $('#v-label').textContent = `Hand #${rh.rec.no} · ${step.label}`;
    $('#v-progress').textContent = `Step ${V.si + 1}/${rh.steps.length} · Hand ${V.hk + 1}/${V.replay.hands.length}`;
    if (V.tab === 'hand' && V.sideHand !== V.hk) renderSide();
  }

  function nav(what) {
    const rh = cur();
    const last = rh.steps.length - 1;
    const lastHand = V.replay.hands.length - 1;
    if (what === 'play') return V.playing ? stop() : play();
    if (what !== 'tick') stop();
    let fwd = true;
    switch (what) {
      case 'tick': case 'next':
        if (V.si < last) V.si++;
        else if (V.hk < lastHand) { V.hk++; V.si = 0; }
        else { stop(); return; }
        break;
      case 'prev':
        fwd = false;
        if (V.si > 0) V.si--;
        else if (V.hk > 0) { V.hk--; V.si = cur().steps.length - 1; }
        break;
      case 'nextStreet': {
        const j = rh.steps.findIndex((s, k) => k > V.si && (s.kind === 'deal' || s.kind === 'showdown' || k === last));
        if (j >= 0) V.si = j; else if (V.hk < lastHand) { V.hk++; V.si = 0; }
        break;
      }
      case 'prevStreet': {
        fwd = false;
        let j = 0;
        rh.steps.forEach((s, k) => { if (k < V.si && s.kind === 'deal') j = k; });
        if (V.si === 0 && V.hk > 0) { V.hk--; V.si = 0; } else V.si = j;
        break;
      }
      case 'nextHand': if (V.hk < lastHand) { V.hk++; V.si = 0; } break;
      case 'prevHand': fwd = false; if (V.hk > 0) { V.hk--; V.si = 0; } else V.si = 0; break;
      case 'start': fwd = false; V.si = 0; break;
      case 'end': V.si = last; break;
    }
    show(fwd);
  }
  function play() {
    V.playing = true;
    const b = $('#v-play'); if (b) { b.innerHTML = icon('pause'); b.setAttribute('aria-label', 'Pause autoplay'); }
    const ms = { 0.5: 2200, 1: 1150, 2: 600, 4: 300 }[V.speed] || 1150;
    V.timer = setInterval(() => nav('tick'), ms);
  }
  function stop() {
    V.playing = false; clearInterval(V.timer);
    const b = $('#v-play'); if (b) { b.innerHTML = icon('play'); b.setAttribute('aria-label', 'Autoplay'); }
  }

  /* ----- side panel: stats / hand text / checks ----- */
  function renderSide() {
    const p = $('#v-panel');
    if (!p) return;
    $$('[data-vtab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.vtab === V.tab)));
    if (V.tab === 'hand') {
      const rh = cur();
      V.sideHand = V.hk;
      p.innerHTML = `<div class="section-title" style="margin-top:4px">Hand #${rh.rec.no} as recorded</div><pre class="hand-text">${U.esc(Notation.serializeHand(rh.rec))}</pre>
        ${rh.issues.length ? `<div class="section-title">Inconsistencies</div><div class="issues">${rh.issues.map((i) => `<div class="issue">${U.esc(i)}</div>`).join('')}</div>` : `<div class="issue ok" style="margin-top:10px">${icon('check')} Re-simulated cleanly.</div>`}`;
    } else if (V.tab === 'issues') {
      const iss = V.replay.issues, notes = V.replay.notes;
      p.innerHTML = `<div class="section-title" style="margin-top:4px">Engine re-simulation</div><div class="issues">
        ${iss.length ? iss.map((i) => `<div class="issue">⚠ ${U.esc(i)}</div>`).join('') : `<div class="issue ok">${icon('check')} All ${V.replay.hands.length} hands re-simulated through the rules engine with no inconsistencies.</div>`}
        ${notes.map((n) => `<div class="issue note">${U.esc(n)}</div>`).join('')}</div>`;
    } else p.innerHTML = statsHtml();
    if (V.tab === 'stats') {
      bindChart();
      const kb = $('#v-keybtn');
      if (kb) kb.addEventListener('click', () => $('#v-key').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }));
    }
  }

  function statsHtml() {
    const S = V.stats;
    const KEY = Object.fromEntries(STAT_KEY);
    const pct = (x) => (x == null ? '–' : x + '%');
    const sign = (n) => `<span class="${n > 0 ? 'net-pos' : n < 0 ? 'net-neg' : ''}">${n > 0 ? '+' : ''}${U.fmt(n)}</span>`;
    // Every tile carries its definition as a tooltip; the full key is at the bottom.
    const tile = (label, value, cls = 'tile', sub = '') => `<div class="${cls}" title="${U.esc(label + ': ' + (KEY[label] || ''))}"><${cls === 'tile' ? 'div class="tv"' : 'b'}>${value}</${cls === 'tile' ? 'div' : 'b'}><${cls === 'tile' ? 'div class="tl"' : 'span'}>${label}${sub}</${cls === 'tile' ? 'div' : 'span'}></div>`;
    const mini = (label, value) => tile(label, value, '');
    const ratio = (a, b) => (b ? ` <small class="muted">${a}/${b}</small>` : '');
    const maxCat = Math.max(1, ...S.winningHands.map((w) => w.count));
    return `<div class="row" style="margin-top:4px"><div class="section-title" style="margin:0">Overview</div><span class="grow"></span><button class="btn sm ghost" id="v-keybtn">${icon('help')}Stat key</button></div>
      <div class="tiles" style="margin-top:8px">
        ${tile('Hands', S.totalHands)}
        ${tile('Biggest pot', U.fmt(S.biggestPot), 'tile', S.biggestPotHand ? ' · #' + S.biggestPotHand : '')}
        ${tile('Avg pot', U.fmt(S.avgPot))}
        ${tile('Showdowns', pct(S.showdownPct))}
        ${tile('Split pots', S.splits)}
        <div class="tile" title="Average number of players dealt into each hand"><div class="tv">${S.avgPlayers}</div><div class="tl">Players / hand</div></div>
      </div>
      ${S.botHands ? `<p class="hint">🤖 ${S.botHands} hand${S.botHands > 1 ? 's' : ''} in this record had a bot making decisions (marked in the hand list).</p>` : ''}
      ${S.winningHands.length ? `<div class="section-title" title="${U.esc(KEY['Winning hands'])}">Winning hands at showdown</div>
      <div class="bars">${S.winningHands.slice().reverse().map((w) => `<div class="bar-row"><span>${w.name}</span><div class="bar"><i style="width:${(100 * w.count) / maxCat}%"></i></div><b class="num">${w.count}</b></div>`).join('')}</div>` : ''}
      <div class="section-title">Chip stacks over time</div>
      <div class="chart" id="v-chart">${chartSvg()}<div class="tip hidden" id="v-tip"></div></div>
      <div class="legend">${S.players.map((pl) => `<span><i style="background:${colorOf(pl.name)}"></i>${U.esc(pl.name)}</span>`).join('')}</div>
      <details style="margin-top:8px"><summary class="hint" style="cursor:pointer">Show stacks as a table</summary>${stackTable()}</details>
      <div class="section-title">Players</div>
      <div style="display:flex;flex-direction:column;gap:10px">${S.players.map((pl) => `<div class="pcard">
        <div class="pcard-head">${avatarHtml(pl.name, '', `background:${colorOf(pl.name)}`)}<div style="flex:1;min-width:0"><b>${U.esc(pl.name)}</b><div class="hint">${pl.hands} hands · ${pl.bb100 == null ? '–' : (pl.bb100 > 0 ? '+' : '') + pl.bb100} bb/100${pl.botHands ? ` · 🤖 ${pl.botHands}` : ''}</div></div><div style="font-weight:800;font-size:18px" class="num" title="${U.esc(KEY.Net)}">${sign(pl.net)}</div></div>
        <div class="stat-group">Results</div>
        <div class="mini">
          ${mini('Won', `${pct(pl.winPct)}${ratio(pl.won, pl.hands)}`)}${mini('bb/100', pl.bb100 == null ? '–' : pl.bb100)}
          ${mini('Avg pot won', U.fmt(pl.avgWon))}${mini('Biggest pot', U.fmt(pl.biggest))}
          ${mini('Worst hand', pl.worst ? sign(pl.worst) : '0')}${mini('Best streak', pl.bestStreak)}
          ${mini('All-ins', `${pl.allIn}${pl.allIn ? ` <small class="muted">won ${pl.allInWon}</small>` : ''}`)}${mini('Won w/o SD', pl.wonNoSD)}
        </div>
        <div class="stat-group">Before the flop</div>
        <div class="mini">
          ${mini('VPIP', pct(pl.vpipPct))}${mini('PFR', pct(pl.pfrPct))}${mini('3-Bet', `${pct(pl.threeBetPct)}${ratio(pl.threeBet, pl.threeBetOpp)}`)}${mini('Fold to 3-Bet', `${pct(pl.foldTo3Pct)}${ratio(pl.foldTo3, pl.foldTo3Opp)}`)}
          ${mini('Limp', pct(pl.limpPct))}${mini('Fold preflop', pct(pl.foldPrePct))}
        </div>
        <div class="stat-group">After the flop</div>
        <div class="mini">
          ${mini('AF', pl.af == null ? '–' : pl.af === Infinity ? '∞' : pl.af)}${mini('AFq', pct(pl.afqPct))}
          ${mini('C-Bet', `${pct(pl.cbetPct)}${ratio(pl.cbet, pl.cbetOpp)}`)}${mini('Fold to C-Bet', `${pct(pl.foldToCbetPct)}${ratio(pl.foldToCbet, pl.foldToCbetOpp)}`)}
          ${mini('Check-raise', pl.checkRaise)}${mini('Saw flop', pl.sawFlop)}
        </div>
        <div class="stat-group">Showdown</div>
        <div class="mini">
          ${mini('WTSD', pct(pl.wtsdPct))}${mini('W$SD', pct(pl.wsdPct))}${mini('WWSF', pct(pl.wwsfPct))}
        </div></div>`).join('')}</div>
      <div class="section-title" id="v-key">Stat key</div>
      <dl class="stat-key">${STAT_KEY.map(([k, d]) => `<dt>${U.esc(k)}</dt><dd>${U.esc(d)}</dd>`).join('')}</dl>
      <p class="hint">Percentages with a small fraction (like <span class="num">3/10</span>) show how many times it happened out of the chances the player had. Hover or long-press any stat to see its definition.</p>`;
  }

  function chartData() {
    const S = V.stats, n = V.replay.hands.length;
    const start = Number(tag('StartingStack')) || 0;
    return S.players.map((pl) => {
      const pts = [];
      const firstHand = V.replay.hands.findIndex((rh) => rh.hand && rh.hand.players.some((p) => p.name === pl.name));
      for (let k = 0; k < n; k++) {
        const h = V.replay.hands[k].hand;
        const p = h && h.players.find((q) => q.name === pl.name);
        if (k === firstHand && p) pts.push({ x: k, y: p.startStack });
        pts.push(p && h.phase === 'done' ? { x: k + 1, y: p.stack } : null);
      }
      if (firstHand < 0 && start) pts.unshift({ x: 0, y: start });
      return { name: pl.name, pts };
    });
  }
  const CH = { w: 360, h: 190, l: 40, r: 10, t: 10, b: 22 };
  function chartScales() {
    const data = chartData(), n = V.replay.hands.length;
    let max = 0;
    data.forEach((s) => s.pts.forEach((p) => { if (p && p.y > max) max = p.y; }));
    const mag = Math.pow(10, Math.floor(Math.log10(max || 1)));
    const nice = Math.ceil((max || 1) / mag / 2) * 2 * mag || 1;
    const X = (x) => CH.l + (x / Math.max(1, n)) * (CH.w - CH.l - CH.r);
    const Y = (y) => CH.t + (1 - y / nice) * (CH.h - CH.t - CH.b);
    return { data, n, nice, X, Y };
  }
  function chartSvg() {
    const { data, n, nice, X, Y } = chartScales();
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${CH.l}" x2="${CH.w - CH.r}" y1="${Y(nice * f)}" y2="${Y(nice * f)}"/>`).join('');
    const yl = [0, 0.5, 1].map((f) => `<text x="${CH.l - 6}" y="${Y(nice * f) + 3}" text-anchor="end">${U.fmt(Math.round(nice * f))}</text>`).join('');
    const xt = [0, Math.round(n / 2), n].filter((v, i, a) => a.indexOf(v) === i).map((x) => `<text x="${X(x)}" y="${CH.h - 6}" text-anchor="middle">${x === 0 ? 'Start' : '#' + x}</text>`).join('');
    const paths = data.map((s) => {
      let d = '', pen = false;
      for (const p of s.pts) { if (!p) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`; pen = true; }
      return `<path d="${d}" style="stroke:${colorOf(s.name)}"><title>${U.esc(s.name)}</title></path>`;
    }).join('');
    let labels = '';
    if (data.length <= 4) { // direct labels at line ends, nudged apart so they never collide
      const ls = data.map((s) => { const last = [...s.pts].reverse().find(Boolean); return last && { name: s.name, x: X(last.x), y: Y(last.y) - 6 }; }).filter(Boolean).sort((a, b) => a.y - b.y);
      for (let i = 1; i < ls.length; i++) if (ls[i].y - ls[i - 1].y < 11) ls[i].y = ls[i - 1].y + 11;
      labels = ls.map((l) => `<text x="${l.x - 2}" y="${l.y}" text-anchor="end" style="fill:var(--text-2);font-size:10px">${U.esc(l.name)}</text>`).join('');
    }
    return `<svg viewBox="0 0 ${CH.w} ${CH.h}" role="img" aria-label="Line chart of each player's chip stack after every hand" id="v-svg">
      <g class="grid">${grid}</g><g class="axis">${yl}${xt}</g><g class="series">${paths}</g><g>${labels}</g>
      <line id="v-cross" x1="0" x2="0" y1="${CH.t}" y2="${CH.h - CH.b}" stroke="var(--text-3)" stroke-dasharray="3 3" visibility="hidden"/>
      <rect x="${CH.l}" y="0" width="${CH.w - CH.l - CH.r}" height="${CH.h}" fill="transparent" id="v-hit"/></svg>`;
  }
  function bindChart() {
    const svg = $('#v-svg'), hit = $('#v-hit'), tip = $('#v-tip'), cross = $('#v-cross');
    if (!svg) return;
    const { data, n, X } = chartScales();
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * CH.w;
      const x = Math.max(0, Math.min(n, Math.round(((px - CH.l) / (CH.w - CH.l - CH.r)) * n)));
      cross.setAttribute('x1', X(x)); cross.setAttribute('x2', X(x)); cross.setAttribute('visibility', 'visible');
      const rows = data.map((s) => ({ name: s.name, p: s.pts.filter(Boolean).filter((p) => p.x === x).pop() })).filter((r2) => r2.p).sort((a, b) => b.p.y - a.p.y);
      tip.innerHTML = `<b>${x === 0 ? 'Start' : 'After hand #' + (V.replay.hands[x - 1] ? V.replay.hands[x - 1].rec.no : x)}</b>${rows.map((r2) => `<div><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colorOf(r2.name)};margin-right:6px"></i>${U.esc(r2.name)} <b class="num">${U.fmt(r2.p.y)}</b></div>`).join('')}`;
      tip.classList.remove('hidden');
      const left = ((X(x) / CH.w) * r.width);
      tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(4, left + 12)) + 'px';
      tip.style.top = '10px';
    };
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerleave', () => { tip.classList.add('hidden'); cross.setAttribute('visibility', 'hidden'); });
  }
  function stackTable() {
    const S = V.stats;
    return `<div style="overflow:auto;max-height:260px;margin-top:6px"><table style="width:100%;font-size:12px;border-collapse:collapse" class="num">
      <thead><tr><th style="text-align:left;padding:4px">Hand</th>${S.players.map((p) => `<th style="text-align:right;padding:4px">${U.esc(p.name)}</th>`).join('')}</tr></thead>
      <tbody>${V.replay.hands.map((rh) => `<tr><td style="padding:4px">#${rh.rec.no}</td>${S.players.map((pl) => { const p = rh.hand && rh.hand.players.find((q) => q.name === pl.name); return `<td style="text-align:right;padding:4px">${p ? U.fmt(p.stack) : '–'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  onKey = (e) => {
    if (!V.replay || !$('#v-stage') || $('.modal-back')) return;
    const tg = e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
    const map = { ArrowRight: e.shiftKey ? 'nextStreet' : 'next', ArrowLeft: e.shiftKey ? 'prevStreet' : 'prev', ArrowDown: 'nextHand', ArrowUp: 'prevHand', PageDown: 'nextHand', PageUp: 'prevHand', Home: 'start', End: 'end', ' ': 'play' };
    if (e.key === '?') { e.preventDefault(); return helpOverlay('viewer'); }
    if (map[e.key]) { e.preventDefault(); nav(map[e.key]); }
  };
  addEventListener('keydown', onKey);

  const pending = Prefs.get('viewerPending', null);
  if (pending) { Prefs.del('viewerPending'); tryLoad(pending); }
  else loadPage(Prefs.get('viewerLast', ''));
  return { destroy() { stop(); removeEventListener('keydown', onKey); if (V.table) V.table.destroy(); } };
}

/* =====================================================================
   9b. SELF-TEST SCREEN  (#/selftest)
   ===================================================================== */
function SelfTestScreen() {
  document.title = TitleFlash.base = 'Self-test · Feltroom';
  App.root.innerHTML = `<div class="page"><div class="page-inner">
    <div class="page-head"><a class="btn ghost icon-btn" href="#/" aria-label="Home">${icon('back')}</a><h2>Self-test</h2><span class="grow"></span><span id="st-sum" class="muted">Running…</span></div>
    <div class="card-ui" id="st-list" style="overflow:hidden"></div></div></div>`;
  document.body.classList.add('scroll');
  SelfTest.run((r, i, n) => { $('#st-sum').textContent = `Running… ${i}/${n}`; }).then((res) => {
    const pass = res.filter((r) => r.pass).length;
    window.__selftest = { pass, total: res.length, results: res };
    $('#st-sum').innerHTML = `<b style="color:${pass === res.length ? 'var(--accent)' : 'var(--danger)'}">${pass}/${res.length} passed</b>`;
    let g = '';
    $('#st-list').innerHTML = res.map((r) => {
      const head = r.group !== g ? `<div class="section-title" style="padding:0 12px">${U.esc((g = r.group))}</div>` : '';
      return `${head}<div class="test-row ${r.pass ? 'pass' : 'fail'}"><span class="res">${r.pass ? 'PASS' : 'FAIL'}</span><div style="flex:1">${U.esc(r.name)} <span class="hint">${r.ms} ms</span>${r.pass ? '' : `<div class="err">${U.esc(r.error)}</div>`}</div></div>`;
    }).join('');
  });
  return {};
}

/* =====================================================================
   10. ROUTER  (hash routes work on any static host without redirects)
   #/  ·  #/host  ·  #/viewer  ·  #/selftest  ·  #join=<hostPeerId>
   ===================================================================== */
let lastHash = location.hash;
function route(force) {
  const h = location.hash;
  const s = App.session;
  // Leaving a live hosted game by navigating away ends it, so confirm first.
  const home = s && s.offline ? (s.cepheus ? '#/cepheus' : '#/bots') : '#/host';
  if (!force && s && s.role === 'host' && !s.closed && lastHash.startsWith(home) && !h.startsWith(home)) {
    if (!confirm(s.offline ? 'Leave this practice game?' : 'Leave the table? As the host, this ends the game for everyone.')) { history.replaceState(null, '', lastHash); return; }
    s.leave(); App.session = null;
  }
  // A client stays connected after its game ends (a rematch invitation can still arrive), so leaving the page closes it.
  if (!force && s && s.role === 'client' && !s.closed && lastHash.startsWith('#join=') && !h.startsWith('#join=')) { s.leave(); App.session = null; }
  if (!force && s && s.role === 'watcher' && !s.ended && lastHash.startsWith('#watch=') && !h.startsWith('#watch=')) { s.leave(); App.session = null; }
  lastHash = h;
  if (App.screen && App.screen.destroy) App.screen.destroy();
  App.screen = null;
  document.body.classList.remove('viewer-mode', 'scroll');
  $$('.modal-back, .menu').forEach((m) => m.remove());
  // First visit: ask whether this is a phone or a computer, then carry on to where the link pointed.
  if (!Device.get() && !h.startsWith('#/selftest')) { App.screen = DeviceScreen(h || '#/'); return; }
  const j = h.match(/^#join=([A-Za-z0-9_-]+)/);
  const w = h.match(/^#watch=([A-Za-z0-9_-]+)/);
  if (j) App.screen = JoinScreen(j[1]);
  else if (w) App.screen = WatchScreen(w[1]);
  else if (h.startsWith('#/host')) App.screen = s && s.role === 'host' && !s.offline && !s.closed ? GameScreen(s) : HostSetupScreen();
  else if (h.startsWith('#/bots')) App.screen = s && s.offline && !s.cepheus && !s.closed ? GameScreen(s) : BotSetupScreen();
  else if (h.startsWith('#/cepheus')) App.screen = s && s.offline && s.cepheus && !s.closed ? GameScreen(s) : CepheusScreen();
  else if (h.startsWith('#/viewer')) App.screen = ViewerScreen();
  else if (h.startsWith('#/solver')) App.screen = SolverScreen();
  else if (h.startsWith('#/selftest')) App.screen = SelfTestScreen();
  else if (h.startsWith('#/rooms')) App.screen = RoomsScreen();
  else if (h.startsWith('#/learn')) App.screen = LearnScreen(decodeURIComponent(h.slice(8).replace(/^\//, '')));
  else App.screen = HomeScreen();
}
addEventListener('hashchange', () => route());
addEventListener('beforeunload', (e) => {
  if (App.session && App.session.role === 'host' && !App.session.closed && App.session.table.status !== 'ended') { e.preventDefault(); e.returnValue = ''; }
});
Theme.apply();
Device.apply();
route(true);
