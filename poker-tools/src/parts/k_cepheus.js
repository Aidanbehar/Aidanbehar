/* =====================================================================
   7f. PLAY AGAINST CEPHEUS
   A dedicated decision path for one heads-up fixed-limit opponent. The engine
   (cepheus/cepheus.js) and its strategy (cepheus/cepheus-strategy.bin) are separate
   static files, downloaded only when this mode is opened and checked against the
   hashes this page was built with.
   ===================================================================== */
const CepheusBot = {
  JS: 'cepheus/cepheus.js', DATA: 'cepheus/cepheus-strategy.bin',
  JS_SRI: '__CEPHEUS_JS_SRI__', DATA_SHA256: '__CEPHEUS_BIN_SHA256__', DATA_BYTES: '__CEPHEUS_BIN_BYTES__',
  // The table Cepheus was computed for (holdem.limit.2p.reverse_blinds.game): blinds 5/10, bets 10/10/20/20.
  SB: 5, BB: 10, STACK: 1000,
  model: null, loading: null, rng: null,
  get sizeLabel() { const n = Number(this.DATA_BYTES); return n > 0 ? `${Math.round(n / 1024)} KB` : 'about 1 MB'; },

  /** Download and check the engine and strategy once; later calls reuse them. */
  load() {
    if (this.model) return Promise.resolve(this.model);
    if (!this.loading) this.loading = this._load().catch((e) => { this.loading = null; throw e; });
    return this.loading;
  },
  async _load() {
    if (this.JS_SRI.startsWith('__')) throw new Error('This build of Feltroom does not include the Cepheus files.');
    const v = this.DATA_SHA256.slice(0, 12);
    if (!window.CepheusEngine) {
      await new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = `${this.JS}?v=${v}`; s.integrity = this.JS_SRI; s.async = true;
        s.onload = ok;
        s.onerror = () => { s.remove(); fail(new Error('Could not load the Cepheus engine (cepheus/cepheus.js). Check your connection and try again.')); };
        document.head.appendChild(s);
      });
      if (!window.CepheusEngine) throw new Error('The Cepheus engine did not start.');
    }
    let res;
    try { res = await fetch(`${this.DATA}?v=${v}`); }
    catch { throw new Error('Could not download the Cepheus strategy file. Check your connection and try again.'); }
    if (!res.ok) throw new Error(`The Cepheus strategy file is missing from this site (HTTP ${res.status}).`);
    const buf = await res.arrayBuffer();
    if (crypto.subtle) {
      const d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
      const hex = [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (hex !== this.DATA_SHA256) throw new Error('The Cepheus strategy file does not match this version of Feltroom. Reload the page to get matching files.');
    }
    try { this.model = window.CepheusEngine.fromBuffer(buf); }
    catch (e) { throw new Error(`The Cepheus strategy file could not be used: ${e.message}`); }
    return this.model;
  },

  /** Exactly what a player in Cepheus's seat can observe: its own cards, the board, the betting and its seat. */
  observe(h, i) {
    const code = { f: 'f', x: 'c', c: 'c', b: 'r', r: 'r' };
    const history = Array.from({ length: h.street + 1 }, () => '');
    for (const e of h.log) if (e.t === 'act') history[e.street] += code[e.type] || '?';
    return { seat: i === h.button ? 1 : 0, hole: h.players[i].hole.slice(), board: h.board.slice(), history };
  },

  /**
   * The river is re-solved exactly during play (see Resolver); false uses the table everywhere. The turn
   * stays on the table: a turn re-solve fast enough to play was not reliably better in testing.
   */
  resolve: true, resolveStreets: [3],
  /** An action the engine accepts. Returns { action, fallback } (fallback = why the strategy could not be used). */
  decide(h, i) {
    const L = Engine.legal(h);
    const passive = () => ({ type: L.canCheck ? 'x' : 'c' });
    if (!this.model) return { action: passive(), fallback: 'the strategy is not loaded' };
    let d;
    try {
      if (h.limit !== 'fl' || h.game !== 'holdem' || h.players.length !== 2) throw new Error('this is not heads-up limit Hold\'em');
      if (!this.rng) this.rng = Bots.makeRng(); // secure-seeded; used only to sample the strategy's mixed actions
      const obs = this.observe(h, i);
      // River: solve this exact spot (only public information and its own cards are used).
      if (this.resolve && this.resolveStreets.includes(h.street) && typeof Resolver !== 'undefined') {
        const t0 = Date.now();
        let r = null;
        try { r = Resolver.decide(this.model, h, i, obs.hole, this.memo || (this.memo = {})); } catch (e) { this.resolveFails = (this.resolveFails || 0) + 1; if (typeof window !== 'undefined') console.warn('re-solve failed, using the table', e); }
        if (!r) this.resolveMisses = (this.resolveMisses || 0) + 1;
        if (r) {
          this.resolveMs = (this.resolveMs || 0) + (Date.now() - t0); this.resolves = (this.resolves || 0) + 1;
          const u = this.rng.next(); let k = 0, acc = r.probs[0];
          while (k < r.codes.length - 1 && u >= acc) acc += r.probs[++k];
          const code = r.codes[k], probs = { fold: 0, call: 0, raise: 0 };
          r.codes.forEach((c, j) => { probs[{ f: 'fold', c: 'call', r: 'raise' }[c]] = r.probs[j]; });
          d = { action: { f: 'fold', c: 'call', r: 'raise' }[code], probs, resolved: true };
        }
      }
      if (!d) d = this.model.decide(obs, this.rng.next);
    } catch (e) { return { action: passive(), fallback: e.message }; }
    if (d.action === 'raise' && L.canRaise) return { action: { type: L.isBet ? 'b' : 'r', to: L.minTo }, d };
    if (d.action === 'fold' && !L.canCheck) return { action: { type: 'f' }, d };
    // Kept stacks: when the chips run short (an all-in, a short all-in that does not reopen the betting,
    // or too few chips left to raise) calling is all that is left, which is not a strategy failure.
    if (d.action === 'raise' && !L.capReached) return { action: passive(), d };
    if (d.action === 'raise') return { action: passive(), fallback: 'the strategy chose a raise the table does not allow', d };
    return { action: passive(), d };
  },
};

/* ----- The "Stats" tab of a Play Against Cepheus game: how good the bot is, and how you are doing. ----- */
const CepheusStats = (() => {
  const URL = 'cepheus/cepheus-stats.json', SHA = '__CEPHEUS_STATS_SHA__';
  let data = null, loading = null, failed = false;
  const load = () => {
    if (data) return Promise.resolve(data);
    if (!loading) loading = fetch(`${URL}?v=${SHA.slice(0, 12)}`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j) => { if (!j || j.version !== 1) throw new Error('unexpected format'); data = j; return j; })
      .catch((e) => { loading = null; failed = true; throw e; });
    return loading;
  };
  // standard normal CDF (Abramowitz-Stegun 7.1.26)
  const phi = (z) => { const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2); return z >= 0 ? (1 + y) / 2 : (1 - y) / 2; };
  const pct = (x, d = 0) => (x == null ? '–' : `${(100 * x).toFixed(d)}%`);
  const sgn = (x, d = 1) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(d)}`;
  const esc = (s) => U.esc(String(s));
  // Results in big blinds (poker's usual unit) or in chips: the "Show results in" switch at the top of the tab.
  let F = 1; // chips per unit shown: 1 = big blinds, the big blind (10) = chips
  const inChips = () => F !== 1;
  const sl = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.round(Math.abs(x)).toLocaleString()}`; // whole chips, with separators
  const sv = (v, d = 1) => (inChips() ? sl(v * F) : sgn(v, d)); // a signed amount in the unit shown (number only)
  const am = (v, d = 1) => `${sv(v, d)} ${inChips() ? 'chips' : 'bb'}`;
  const ciOf = (v) => (inChips() ? Math.round(v * F).toLocaleString() : v.toFixed(1));
  const RU = () => (inChips() ? 'chips/100' : 'bb/100');
  const UW = () => (inChips() ? 'chips' : 'big blinds');
  const NAMES = { table: 'Previous version (table only)', call: 'Always calls', raise: 'Always raises', random: 'Random clicks', uniform: 'Random clicks', self: 'Itself (mirror match)', beginner: 'Beginner bot', casual: 'Casual bot', intermediate: 'Intermediate bot', advanced: 'Advanced bot', professional: 'Professional bot', elite: 'Elite bot', extreme: 'Extreme bot', 'elite:maniac': 'Elite Maniac', 'elite:loosepassive': 'Elite Loose-passive', 'elite:tightpassive': 'Elite Tight-passive', 'elite:trapper': 'Elite Trapper', 'extreme:gto': 'Extreme GTO-inspired' };
  const nameOf = (k) => NAMES[k] || k;
  // the sample run: newer results files store { curve, curveStep }, older ones curveEvery30
  const runOf = (m) => (m.curve ? { pts: m.curve, step: m.curveStep || 50 } : { pts: m.curveEvery30 || [], step: 30 });

  /** Public play-style numbers for one seat over finished hands (same definitions as the offline tests). */
  function profile(hands, nameIs) {
    const st = { hands: 0, vpip: 0, pfr: 0, bets: 0, calls: 0, faced: 0, folded: 0, sawFlop: 0, wtsd: 0, wsd: 0, net: 0, won: 0 };
    for (const h of hands) {
      const i = h.players.findIndex((p) => nameIs(p.name)); if (i < 0) continue;
      st.hands++;
      const acts = h.log.filter((e) => e.t === 'act' && e.p === i);
      if (acts.some((e) => e.street === 0 && ['c', 'r', 'b'].includes(e.type))) st.vpip++;
      if (acts.some((e) => e.street === 0 && ['r', 'b'].includes(e.type))) st.pfr++;
      let cur = 0; const bets = h.players.map(() => 0);
      for (const e of h.log) {
        if (e.t === 'post' && e.kind !== 'a') { bets[e.p] += e.amt; cur = Math.max(cur, bets[e.p]); }
        if (e.t === 'deal') { bets.fill(0); cur = 0; }
        if (e.t !== 'act') continue;
        if (e.p === i && e.street > 0) { if (e.type === 'b' || e.type === 'r') st.bets++; if (e.type === 'c') st.calls++; if (cur > bets[e.p]) { st.faced++; if (e.type === 'f') st.folded++; } }
        if (e.amt) { bets[e.p] += e.amt; cur = Math.max(cur, bets[e.p]); }
      }
      const preFold = acts.some((e) => e.street === 0 && e.type === 'f');
      if (h.board.length >= 3 && !preFold) { st.sawFlop++; if (h.results && h.results.showdown && !h.players[i].folded) { st.wtsd++; if (h.players[i].stack > h.players[i].startStack) st.wsd++; } }
      const d = h.players[i].stack - h.players[i].startStack; st.net += d; if (d > 0) st.won++;
    }
    const r = (a, b) => (b ? a / b : null);
    return { hands: st.hands, net: st.net, won: r(st.won, st.hands), vpip: r(st.vpip, st.hands), pfr: r(st.pfr, st.hands), af: r(st.bets, st.calls), foldToBet: r(st.folded, st.faced), wtsd: r(st.wtsd, st.sawFlop), wsd: r(st.wsd, st.wtsd) };
  }

  /* ---------- small SVG charts (thin marks, recessive grid, hover tooltips) ---------- */
  function lineChart(id, pts, { yLabel = 'bb', xLabel = 'hands', xStep = 1, aria }) {
    const W = 320, H = 150, l = 34, r = 8, t = 10, b = 20;
    const ys = pts.concat([0]), lo = Math.min(...ys), hi = Math.max(...ys), pad = Math.max(1, (hi - lo) * 0.08);
    const y0 = lo - pad, y1 = hi + pad, n = Math.max(1, pts.length - 1);
    const X = (i) => l + (i / n) * (W - l - r), Y = (v) => t + (1 - (v - y0) / (y1 - y0)) * (H - t - b);
    const d = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
    const ticks = [y0 + pad, 0, y1 - pad].filter((v, i, a) => a.findIndex((w) => Math.abs(w - v) < (y1 - y0) * 0.12) === i);
    const last = pts[pts.length - 1] || 0;
    return `<div class="chart cs-chart" data-chart="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
      <g class="grid">${ticks.map((v) => `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')}</g>
      <line x1="${l}" x2="${W - r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--text-3)" stroke-width="1"/>
      <g class="axis">${ticks.map((v) => `<text x="${l - 5}" y="${Y(v) + 3}" text-anchor="end">${sl(v)}</text>`).join('')}<text x="${l}" y="${H - 5}">0</text><text x="${W - r}" y="${H - 5}" text-anchor="end">${(n * xStep).toLocaleString()} ${xLabel}</text></g>
      <g class="series"><path d="${d}" style="stroke:${last >= 0 ? 'var(--accent)' : 'var(--danger)'}"/></g>
      <line class="cs-cross" x1="0" x2="0" y1="${t}" y2="${H - b}" stroke="var(--text-3)" stroke-dasharray="3 3" visibility="hidden"/>
      <circle class="cs-dot" r="4" visibility="hidden" style="fill:var(--surface);stroke:var(--text);stroke-width:2"/>
      <rect class="cs-hit" x="${l}" y="0" width="${W - l - r}" height="${H}" fill="transparent"/></svg><div class="tip hidden"></div></div>`;
  }
  function bindLine(root, id, pts, xStep, fmt, zoom) {
    const box = root.querySelector(`[data-chart="${id}"]`); if (!box) return;
    const svg = box.querySelector('svg'), hit = box.querySelector('.cs-hit'), tip = box.querySelector('.tip'), cross = box.querySelector('.cs-cross'), dot = box.querySelector('.cs-dot');
    const W = 320, l = 34, r = 8, n = Math.max(1, pts.length - 1);
    const H = 150, t = 10, b = 20, ys = pts.concat([0]), lo = Math.min(...ys), hi = Math.max(...ys), pad = Math.max(1, (hi - lo) * 0.08), y0 = lo - pad, y1 = hi + pad;
    hit.addEventListener('pointermove', (ev) => {
      const rc = svg.getBoundingClientRect(), px = ((ev.clientX - rc.left) / rc.width) * W;
      const i = Math.max(0, Math.min(n, Math.round(((px - l) / (W - l - r)) * n)));
      const x = l + (i / n) * (W - l - r), y = t + (1 - (pts[i] - y0) / (y1 - y0)) * (H - t - b);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('visibility', 'visible');
      tip.innerHTML = fmt(i * xStep, pts[i]); tip.classList.remove('hidden');
      tip.style.left = Math.min(rc.width - tip.offsetWidth - 4, Math.max(4, (x / W) * rc.width + 10)) + 'px'; tip.style.top = '6px';
    });
    hit.addEventListener('pointerleave', () => { tip.classList.add('hidden'); cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); });
    if (!zoom || typeof ZoomChart === 'undefined') return;
    // Click or tap: the same chart, large, to zoom in and read every point.
    box.classList.add('zc-small'); box.title = 'Click to open in detail';
    hit.addEventListener('click', (ev) => {
      const rc = svg.getBoundingClientRect(), px = ((ev.clientX - rc.left) / rc.width) * W;
      const i = Math.max(0, Math.min(n, Math.round(((px - l) / (W - l - r)) * n)));
      ZoomChart.open({
        ...zoom, startAt: i * xStep, zeroLine: true,
        series: [{ name: zoom.unit, color: (pts[pts.length - 1] || 0) >= 0 ? 'var(--accent)' : 'var(--danger)', pts: pts.map((v, k) => ({ x: k * xStep, y: v })) }],
      });
    });
  }
  /** Horizontal bars around zero with 95% whiskers; positive = Cepheus wins. */
  function barChart(rows, aria) {
    const W = 320, rowH = 22, l = 112, r = 34, H = rows.length * rowH + 22; // values sit in the right margin, clear of the whiskers
    const ext = Math.max(10, ...rows.map((x) => Math.abs(x.v) + (x.ci || 0))) * 1.08;
    const X = (v) => l + ((v + ext) / (2 * ext)) * (W - l - r);
    const bars = rows.map((x, k) => {
      const y = k * rowH + 4, x0 = X(Math.min(0, x.v)), w = Math.max(1.5, Math.abs(X(x.v) - X(0)));
      const col = x.v >= 0 ? 'var(--accent)' : 'var(--danger)';
      const tipText = `${x.label}: ${sgn(x.v)} ${RU()} (95% range ${sgn(x.v - (x.ci || 0))} to ${sgn(x.v + (x.ci || 0))})${x.n ? ` over ${x.n.toLocaleString()} hands` : ''}`;
      return `<g class="cs-bar" tabindex="0" data-tip="${esc(tipText)}"><rect x="0" y="${y - 3}" width="${W}" height="${rowH}" fill="transparent"/>
        <text x="${l - 6}" y="${y + 11}" text-anchor="end" style="fill:var(--text-2);font-size:10px">${esc(x.label)}</text>
        <rect x="${x0}" y="${y + 3}" width="${w}" height="10" rx="3" style="fill:${col}" opacity=".85"/>
        ${x.ci ? `<line x1="${X(x.v - x.ci)}" x2="${X(x.v + x.ci)}" y1="${y + 8}" y2="${y + 8}" stroke="var(--text)" stroke-width="1.2"/><line x1="${X(x.v - x.ci)}" x2="${X(x.v - x.ci)}" y1="${y + 4}" y2="${y + 12}" stroke="var(--text)" stroke-width="1.2"/><line x1="${X(x.v + x.ci)}" x2="${X(x.v + x.ci)}" y1="${y + 4}" y2="${y + 12}" stroke="var(--text)" stroke-width="1.2"/>` : ''}
        <text x="${W - 2}" y="${y + 11}" text-anchor="end" style="fill:var(--text);font-size:10px" class="num">${sgn(x.v, 0)}</text></g>`;
    }).join('');
    return `<div class="chart cs-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
      <line x1="${X(0)}" x2="${X(0)}" y1="0" y2="${H - 18}" stroke="var(--text-3)"/>${bars}
      <g class="axis"><text x="${X(-ext * 0.9)}" y="${H - 4}" text-anchor="start">← loses</text><text x="${X(0)}" y="${H - 4}" text-anchor="middle">0</text><text x="${X(ext * 0.9)}" y="${H - 4}" text-anchor="end">wins →</text></g></svg><div class="tip hidden"></div></div>`;
  }
  function histChart(hist, aria) {
    const keys = Object.keys(hist).map(Number).sort((a, b) => a - b), tot = keys.reduce((a, k) => a + hist[k], 0);
    const W = 320, H = 130, l = 8, r = 8, t = 8, b = 22, bw = (W - l - r) / keys.length, mx = Math.max(...keys.map((k) => hist[k]));
    const bars = keys.map((k, i) => {
      const h = (hist[k] / mx) * (H - t - b), x = l + i * bw, y = H - b - h;
      const u = inChips() ? 'chips' : 'bb', a = (v) => (v * F).toLocaleString();
      const label = k === 0 ? `about break-even (−${a(1)} to +${a(1)} ${u})` : `${k > 0 ? 'won' : 'lost'} about ${a(Math.abs(k))} ${u}${Math.abs(k) >= 12 ? ' or more' : ''}`;
      return `<g class="cs-bar" tabindex="0" data-tip="${esc(`${pct(hist[k] / tot, 1)} of hands: ${label}`)}"><rect x="${x}" y="0" width="${bw}" height="${H - b}" fill="transparent"/><rect x="${x + 1}" y="${y}" width="${bw - 2}" height="${Math.max(1, h)}" rx="2" style="fill:${k > 0 ? 'var(--accent)' : k < 0 ? 'var(--danger)' : 'var(--text-3)'}" opacity=".85"/></g>`;
    }).join('');
    return `<div class="chart cs-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${bars}
      <g class="axis">${keys.filter((k) => k % 4 === 0).map((k) => `<text x="${l + (keys.indexOf(k) + 0.5) * bw}" y="${H - 6}" text-anchor="middle">${k > 0 ? '+' : ''}${k * F}${Math.abs(k) >= 12 ? '+' : ''}</text>`).join('')}</g></svg><div class="tip hidden"></div></div>`;
  }
  function bindBars(root) {
    for (const box of root.querySelectorAll('.cs-chart')) {
      const tip = box.querySelector('.tip'), svg = box.querySelector('svg');
      for (const g of box.querySelectorAll('.cs-bar')) {
        const show = () => { tip.textContent = g.dataset.tip; tip.classList.remove('hidden'); const rc = svg.getBoundingClientRect(), gr = g.getBoundingClientRect(); tip.style.left = Math.max(4, Math.min(rc.width - tip.offsetWidth - 4, gr.left - rc.left + gr.width / 2 - tip.offsetWidth / 2)) + 'px'; tip.style.top = Math.max(0, gr.top - rc.top - tip.offsetHeight - 4) + 'px'; };
        const hide = () => tip.classList.add('hidden');
        g.addEventListener('pointerenter', show); g.addEventListener('pointerleave', hide); g.addEventListener('focus', show); g.addEventListener('blur', hide);
      }
    }
  }

  /* ---------- the tab ---------- */
  function sessionHtml(session) {
    const t = session.table, me = t.players.get(session.pid), hands = t.finished.map((f) => f.hand);
    const you = profile(hands, (n) => n === me.name), cep = profile(hands, (n) => n === 'Cepheus');
    const n = you.hands, bb = t.s.bb, net = you.net / bb, kept = !t.s.resetStacks;
    const sd = (data && data.sdPerHand) || 4.5; // typical swing per hand, from the offline tests
    const rate = n ? (net / n) * 100 : 0, half = n ? 1.96 * sd / Math.sqrt(n) * 100 : 0;
    let verdict;
    if (n < 5) verdict = 'Play a few hands and your results will show up here.';
    else if (rate - half > 0) verdict = `You are beating Cepheus by more than luck explains so far. Impressive! Keep going to be sure.`;
    else if (rate + half < 0) verdict = `Cepheus is ahead by more than luck explains. Its edge is showing.`;
    else verdict = `Too early to tell who is better: after ${n} hand${n === 1 ? '' : 's'}, luck could still explain anything between ${sv(rate - half, 0)} and ${sv(rate + half, 0)} ${UW()} per 100 hands.`;
    const curve = runningCurve(t, me);
    const cepP = [...t.players.values()].find((q) => q.botKind === 'cepheus');
    const row = (label, a, b, help) => `<tr title="${esc(help)}"><td>${label}</td><td class="num">${a}</td><td class="num">${b}</td></tr>`;
    return `<section class="cs-sec"><div class="cs-unitrow"><h4>Your session</h4><span class="grow"></span><div class="seg cs-unit" role="radiogroup" aria-label="Show results in">${[['bb', 'Big blinds'], ['chips', 'Chips']].map(([v, l]) => `<button type="button" role="radio" data-unit="${v}" aria-checked="${(v === 'chips') === inChips()}" aria-pressed="${(v === 'chips') === inChips()}">${l}</button>`).join('')}</div></div>
      <div class="cs-hero"><div class="num ${net > 0 ? 'net-pos' : net < 0 ? 'net-neg' : ''}">${am(net)}</div><div class="muted">${n} hand${n === 1 ? '' : 's'} · ${inChips() ? `${sgn(net, 1)} big blinds` : `${sgn(you.net, 0)} chips`}${n ? ` · ${sv(rate, 1)} ${UW()} per 100 hands` : ''}</div></div>
      ${kept ? `<p class="cs-plain">Chips now: you <b class="num">${me.stack.toLocaleString()}</b> · Cepheus <b class="num">${cepP ? cepP.stack.toLocaleString() : '–'}</b> (each started with ${t.s.startingStack.toLocaleString()}; the game ends when one of you runs out).</p>` : `<p class="hint" style="margin:0 0 8px">Both stacks are topped back up to ${t.s.startingStack.toLocaleString()} chips every hand (Cepheus's game), so this is your total over all hands.</p>`}
      <p class="cs-plain">${esc(verdict)}</p>
      ${n >= 2 ? lineChart('session', curve, { xLabel: 'hands', aria: `Your running result against Cepheus in ${UW()} after every hand` }) : ''}
      ${n ? `<table class="cs-table"><thead><tr><th></th><th>You</th><th>Cepheus</th></tr></thead><tbody>
        ${row('Hands won', pct(you.won), pct(cep.won), 'Share of hands that ended with more chips than they started with')}
        ${row('Played the hand', pct(you.vpip), pct(cep.vpip), 'VPIP: put chips in before the flop by choice (calling or raising)')}
        ${row('Raised first', pct(you.pfr), pct(cep.pfr), 'PFR: raised before the flop')}
        ${row('Aggression', you.af == null ? '–' : you.af.toFixed(1), cep.af == null ? '–' : cep.af.toFixed(1), 'AF: bets and raises divided by calls after the flop. Above 2 is aggressive')}
        ${row('Folded to a bet', pct(you.foldToBet), pct(cep.foldToBet), 'After the flop, how often a bet made them fold')}
        ${row('Won at showdown', pct(you.wsd), pct(cep.wsd), 'W$SD: of the hands that reached a showdown, how many they won')}
      </tbody></table>` : ''}</section>`;
  }
  function aboutHtml(d) {
    const ext = d.matchups.find((m) => m.opponent === 'extreme'), call = d.exact.find((x) => x.b === 'call');
    const ahead = (m, N) => 1 - phi((m.bbPerHand * N) / (m.sdPerHand * Math.sqrt(N)));
    const sorted = d.matchups.filter((m) => m.opponent !== 'self').sort((a, b) => b.bb100 - a.bb100);
    return `<section class="cs-sec"><h4>How good is Cepheus?</h4>
      <div class="cs-cards">
        <div class="cs-card"><b class="num">${pct(ext.wonPct)}</b><span>of hands won against our strongest bot (Extreme). It folds the rest early when that is cheaper.</span></div>
        <div class="cs-card"><b class="num">${sv(ext.bb100, 0)}</b><span>${inChips() ? `chips per 100 hands against Extreme: about ${sgn(ext.bb100, 0)} big blinds.` : `big blinds per 100 hands against Extreme: about ${Math.round(ext.bb100 * d.bb).toLocaleString()} chips at these blinds.`}</span></div>
        <div class="cs-card"><b class="num">${sv(call.mbb / 10, 0)}</b><span>${UW()} per 100 hands against someone who always calls (exact calculation, strategy table).</span></div>
      </div>
      ${(() => { const t = d.matchups.find((m) => m.opponent === 'table'); return t ? `<p class="cs-plain"><b>River re-solving.</b> On the river Cepheus now solves the exact spot during play, with every hand either player could hold, instead of using its 50 strength groups. Against the previous version, which used the table on every street, it scored <b class="num">${sv(t.bb100, 1)} ${RU()}</b> (95% range ±${ciOf(t.ci95bb100)}) over ${t.hands.toLocaleString()} hands.${Math.abs(t.bb100) <= t.ci95bb100 ? ' That is within luck: both versions are close to unbeatable, so any difference between them is too small to measure here. The re-solve\'s gain is that a perfect opponent can win less from it.' : ''}</p>` : ''; })()}
      <p class="cs-plain"><b>Luck vs skill.</b> If you played exactly like our Extreme bot, here is the chance you would be ahead of Cepheus after:</p>
      <div class="cs-meter">${[10, 100, 1000, 10000].map((N) => { const p = ahead(ext, N); return `<div><span>${N.toLocaleString()} hands</span><div class="cs-track" role="img" aria-label="${pct(p)} chance"><i style="width:${(100 * p).toFixed(1)}%"></i></div><b class="num">${p < 0.001 ? '<0.1%' : pct(p)}</b></div>`; }).join('')}</div>
      <p class="cs-plain">Short sessions are mostly luck; over thousands of hands the better player almost always comes out ahead.</p>
      <p class="cs-plain"><b>Against every opponent we tested</b> (green: Cepheus wins; the black line is the range the true result very likely lies in):</p>
      ${barChart(sorted.map((m) => ({ label: nameOf(m.opponent), v: m.bb100 * F, ci: m.ci95bb100 * F, n: m.hands })), `Cepheus win rate in ${UW()} per 100 hands against each opponent, with 95% ranges`)}
    </section>`;
  }
  function numbersHtml(d) {
    const ms = d.matchups.slice().sort((a, b) => b.bb100 - a.bb100), ext = d.matchups.find((m) => m.opponent === 'extreme');
    const strong = d.matchups.filter((m) => ['advanced', 'professional', 'elite', 'extreme'].includes(m.opponent));
    const avg = (k) => strong.reduce((a, m) => a + (m.cepheus[k] || 0), 0) / strong.length;
    const conv = d.convergence;
    return `<section class="cs-sec"><h4>The numbers</h4>
      <details open><summary>Every matchup</summary><div class="cs-scroll"><table class="cs-table cs-wide"><thead><tr><th>Opponent</th><th>Hands</th><th title="${inChips() ? 'Chips' : 'Big blinds'} per 100 hands, ± 95% range">${RU()}</th><th title="Share of hands Cepheus won">Won</th><th title="Hands that reached a showdown">SD</th><th title="On the button (small blind)">Btn</th><th title="In the big blind">BB</th></tr></thead><tbody>
        ${ms.map((m) => `<tr><td>${esc(nameOf(m.opponent))}${m.opponent === 'self' ? '*' : ''}</td><td class="num">${m.hands.toLocaleString()}</td><td class="num ${m.opponent === 'self' ? '' : m.bb100 - m.ci95bb100 > 0 ? 'net-pos' : m.bb100 + m.ci95bb100 < 0 ? 'net-neg' : ''}">${sv(m.bb100)} ±${ciOf(m.ci95bb100)}</td><td class="num">${pct(m.wonPct)}</td><td class="num">${pct(m.showdownPct)}</td><td class="num">${sv(m.byPosition.button.bb100, 0)}</td><td class="num">${sv(m.byPosition.bb.bb100, 0)}</td></tr>`).join('')}
      </tbody></table></div><p class="cs-note">Each deal was played twice with the seats swapped (duplicate poker), which cancels much of the luck. ${RU()} is ${UW()} won per 100 hands; ± is the 95% range. Green means the win is bigger than luck explains. *Against itself the true result is exactly zero (the exact calculation below confirms it); the small number here is ordinary random variation. With ${ms.length} matchups, one landing just outside its 95% range is expected now and then.</p></details>
      <details><summary>Exact calculations (no luck at all)</summary><table class="cs-table"><thead><tr><th>Against</th><th>${RU()}</th><th>On the button</th><th>In the big blind</th></tr></thead><tbody>
        ${d.exact.map((x) => `<tr><td>${esc(nameOf(x.b))}</td><td class="num">${sv(x.mbb / 10)}</td><td class="num">${sv(x.asButton / 10)}</td><td class="num">${sv(x.asBB / 10)}</td></tr>`).join('')}
      </tbody></table><p class="cs-note">Computed by the offline solver over ${d.exact[0].boards.toLocaleString()} random boards, adding up every possible pair of hands on each board exactly. Against a copy of itself the result is exactly zero, as it should be. These figures are for the strategy table alone: the river re-solving happens during play, so it is measured by the ${d.totalHands.toLocaleString()} test hands above (see "Previous version").</p></details>
      <details><summary>How it learned</summary>${conv && conv.length > 1 ? lineChart('conv', conv.map((c) => (c.vsCall / 10) * F), { xLabel: 'minutes', xStep: conv[1].minutes - conv[0].minutes, aria: 'Win rate against an always-calling player as training went on' }) : ''}
        <p class="cs-note">Win rate against an always-calling player (${RU()}) at each saved point of the ${d.strategy.minutes}-minute CFR+ run. ${d.vsSnapshots.map((s) => `The final version beats its ${s.minutes}-minute self by ${inChips() ? sgn((s.mbb / 10) * F, 1) : sgn(s.mbb / 10, 2)} ${RU()}.`).join(' ')} Gains that small mean training had settled.</p></details>
      <details><summary>Its playing style</summary><table class="cs-table"><tbody>
        <tr title="VPIP"><td>Plays the hand (VPIP)</td><td class="num">${pct(avg('vpip'))}</td></tr>
        <tr title="PFR"><td>Raises before the flop (PFR)</td><td class="num">${pct(avg('pfr'))}</td></tr>
        <tr><td>Re-raises a raise (3-bet)</td><td class="num">${pct(avg('threeBet'))}</td></tr>
        <tr><td>Aggression factor (AF)</td><td class="num">${avg('af').toFixed(2)}</td></tr>
        <tr><td>Bets the flop after raising (c-bet)</td><td class="num">${pct(avg('cbet'))}</td></tr>
        <tr><td>Folds to a flop c-bet</td><td class="num">${pct(avg('foldToCbet'))}</td></tr>
        <tr><td>Folds to any bet after the flop</td><td class="num">${pct(avg('foldToBet'))}</td></tr>
        <tr><td>Goes to showdown after the flop (WTSD)</td><td class="num">${pct(avg('wtsd'))}</td></tr>
        <tr><td>Wins at showdown (W$SD)</td><td class="num">${pct(avg('wsd'))}</td></tr>
      </tbody></table><p class="cs-note">Averaged over its games against the Advanced, Professional, Elite and Extreme bots. Heads-up limit rewards aggression: it plays most hands and rarely just calls.</p></details>
      <details><summary>How much a single hand swings</summary>${histChart(ext.histogramBB, `How often each result happened in one hand against the Extreme bot, in ${UW()}`)}
        <p class="cs-note">One hand against Extreme, in ${UW()} (a typical swing is ±${inChips() ? Math.round(ext.sdPerHand * F) + ' chips' : ext.sdPerHand.toFixed(1) + ' bb'} per hand). Most hands are small; the big pots decide sessions.</p></details>
      <details><summary>A sample run of ${(runOf(ext).pts.length * runOf(ext).step).toLocaleString()} hands</summary>${lineChart('run', [0, ...runOf(ext).pts].map((v) => v * F), { xLabel: 'hands', xStep: runOf(ext).step, aria: "Cepheus's running result over a sample of hands against the Extreme bot" })}
        <p class="cs-note">Cepheus's running total against Extreme. Even a winning player has long losing stretches.</p></details>
      <details><summary>How this was tested</summary><ul class="cs-note">
        <li>${d.totalHands.toLocaleString()} hands through Feltroom's own game engine, with every bet checked for the right size and the 4-bet cap. Fallbacks (spots the strategy did not cover): ${d.totalFallbacks}.</li>
        <li>Exact expected values from the offline CFR+ solver, which add up every pair of hands on ${d.exact[0].boards.toLocaleString()} random boards.</li>
        <li>Strategy: ${esc(d.strategy.summary)}</li>
        ${d.resolve ? `<li>River re-solving: ${d.resolve.count.toLocaleString()} river spots were solved exactly during the test games, about ${Math.round(d.resolve.ms)} ms each; ${d.resolve.fails} fell back to the table.</li>` : ''}
        <li>Remember: this is a CFR+ approximation of Cepheus, not Cepheus's own strategy. Tested ${esc(d.date)}.</li></ul></details>
    </section>`;
  }

  /** Render (or refresh) the tab into `el`. Static results load once; the session part updates every hand. */
  /** Your running total after every hand, in the unit shown. */
  function runningCurve(t, me) {
    const curve = [0], per = t.s.bb / F; let c = 0;
    for (const f of t.finished) { const p = f.hand.players.find((q) => q.name === me.name); if (p) { c += (p.stack - p.startStack) / per; curve.push(+c.toFixed(1)); } }
    return curve;
  }
  function render(el, session, retry) {
    if (retry) failed = false; // reopening the tab tries the download again
    F = Prefs.get('cepheusUnit', 'bb') === 'chips' ? session.table.s.bb || 10 : 1;
    const top = el.scrollTop, open = [...el.querySelectorAll('details')].map((x) => x.open);
    let html = sessionHtml(session);
    if (data) html += aboutHtml(data) + numbersHtml(data);
    else html += `<section class="cs-sec"><p class="cs-plain" id="cs-loading">${failed ? 'The test results could not be loaded. Your session numbers above still work.' : 'Loading test results…'}</p></section>`;
    el.innerHTML = `<div class="cs">${html}</div>`;
    el.querySelectorAll('details').forEach((x, i) => { if (open[i] != null) x.open = open[i]; });
    el.scrollTop = top;
    const t = session.table, me = t.players.get(session.pid);
    el.querySelectorAll('[data-unit]').forEach((b) => b.addEventListener('click', () => { Prefs.set('cepheusUnit', b.dataset.unit); render(el, session); }));
    const u = inChips() ? 'chips' : 'bb', dp = inChips() ? 0 : 1, fmtU = (v) => `${inChips() ? sl(v) : sgn(v, 1)} ${u}`;
    bindLine(el, 'session', runningCurve(t, me), 1, (i, v) => `<b>After ${i} hand${i === 1 ? '' : 's'}</b><div>You: <b class="num">${fmtU(v)}</b></div>`,
      { title: 'Your running result against Cepheus', unit: inChips() ? 'Chips' : 'Big blinds', yFmt: fmtU, dFmt: fmtU, xName: (x) => (x ? `After hand ${x.toLocaleString()}` : 'Start') });
    if (data) {
      const conv = data.convergence;
      bindLine(el, 'conv', conv.map((x) => (x.vsCall / 10) * F), conv.length > 1 ? conv[1].minutes - conv[0].minutes : 1, (m, v) => `<b>After ${m} minutes of training</b><div>${sgn(v, dp)} ${RU()} vs always-call</div>`);
      const ext = data.matchups.find((m) => m.opponent === 'extreme');
      bindLine(el, 'run', [0, ...runOf(ext).pts].map((v) => v * F), runOf(ext).step, (i, v) => `<b>After ${i.toLocaleString()} hands</b><div>Cepheus: <b class="num">${fmtU(v)}</b></div>`,
        { title: 'Cepheus against Extreme: a sample run', unit: inChips() ? 'Chips' : 'Big blinds', yFmt: (v) => `${inChips() ? sl(v) : sgn(v, 0)} ${u}`, dFmt: fmtU, xName: (x) => (x ? `After ${x.toLocaleString()} hands` : 'Start') });
      bindBars(el);
    } else if (!failed) {
      load().then(() => render(el, session), () => { const l = el.querySelector('#cs-loading'); if (l) l.textContent = 'The test results could not be loaded. Your session numbers above still work.'; });
    }
  }
  return { render, load, profile };
})();
