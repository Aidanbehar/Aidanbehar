/* =====================================================================
   7j. HEADS-UP LIMIT SOLVER  (#/solver)
   Enter a heads-up fixed-limit Hold'em spot: your seat, your cards, the board, the
   blinds, your stack and the betting so far. The answer comes from the same CFR+
   strategy as Play Against Cepheus (an approximation of Cepheus, not its own files):
   how often to fold, check/call and bet/raise in this exact spot. The chance of
   winning is worked out against any hand, and against the hands the opponent is
   likely to hold given how they have bet (each of their possible hands is weighted
   by how often the strategy would have made their actions with it).
   ===================================================================== */
const LimitSolver = (() => {
  const CODE = { f: 'f', x: 'c', c: 'c', b: 'r', r: 'r' };
  const history = (h) => {
    const out = Array.from({ length: h.street + 1 }, () => '');
    for (const e of h.log) if (e.t === 'act') out[e.street] += CODE[e.type] || '?';
    return out;
  };

  /**
   * Replay a spot. s = { hero: 0 (button) | 1 (big blind), hole: [c, c] | null, board: [up to 5, may hold nulls],
   * sb, bb, stackBB, actions: ['r', 'c', 'f', ...] in Cepheus codes }. Opponent decisions are kept for the range.
   */
  function build(s) {
    const stack = Math.max(1, Math.round(s.stackBB * s.bb));
    const h = Engine.createHand({
      players: [{ name: s.hero === 0 ? 'You' : 'Opponent', stack }, { name: s.hero === 1 ? 'You' : 'Opponent', stack }],
      button: 0, sb: s.sb, bb: s.bb, limit: 'fl', hole: s.hero === 0 ? [s.hole, null] : [null, s.hole],
    });
    const opp = [];
    let needBoard = 0, applied = 0;
    const deal = () => {
      while (h.phase === 'deal') {
        const k = h.board.length, cards = (s.board || []).slice(k, k + h.pendingDeal);
        if (cards.length < h.pendingDeal || cards.some((c) => !c)) { needBoard = h.pendingDeal; return false; }
        Engine.dealBoard(h, cards);
      }
      return true;
    };
    for (const code of s.actions) {
      if (!deal() || h.phase !== 'betting') break;
      const i = h.toAct, L = Engine.legal(h);
      const t = i !== s.hero ? { seat: i === h.button ? 1 : 0, board: h.board.slice(), history: history(h), code, canRaise: L.canRaise, canCheck: L.canCheck } : null;
      if (code === 'f') Engine.applyAction(h, { type: 'fold' });
      else if (code === 'c') Engine.applyAction(h, { type: L.canCheck ? 'check' : 'call' });
      else if (L.canRaise) Engine.applyAction(h, { type: L.isBet ? 'bet' : 'raise', to: L.minTo });
      else break; // a raise the rules no longer allow (cap reached): the rest is ignored
      if (t) opp.push(t);
      applied++;
    }
    deal();
    return { h, hero: s.hero, opp, needBoard, applied };
  }

  /** The strategy's mix for your seat, mapped onto what the table allows. */
  function advise(model, B, hole) {
    const h = B.h;
    if (!hole || h.phase !== 'betting' || h.toAct !== B.hero) return null;
    const L = Engine.legal(h);
    const d = model.decide({ seat: B.hero === h.button ? 1 : 0, hole: hole.slice(), board: h.board.slice(), history: history(h) }, Math.random);
    const p = d.probs;
    const mix = { fold: L.canCheck ? 0 : p.fold, call: p.call + (L.canCheck ? p.fold : 0) + (L.canRaise ? 0 : p.raise), raise: L.canRaise ? p.raise : 0 };
    return { mix, L, bucket: d.bucket, street: d.street };
  }

  const pairs = (dead) => {
    const deck = Cards.newDeck().filter((c) => !dead.includes(c)), out = [];
    for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) out.push([deck[i], deck[j]]);
    return out;
  };
  // deterministic sampling, so the same spot always gives the same numbers
  const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  /** A quicker strength bucket for the opponent's possible hands (sampled runouts on the flop and turn). */
  function quickModel(model) {
    const M = Object.create(model), cache = new Map();
    M.bucket = function (street, hole, board) {
      if (street === 0) return model.bucket(street, hole, board);
      const key = street + ':' + hole.join(',') + '|' + board.join(',');
      if (cache.has(key)) return cache.get(key);
      let f;
      if (street === 3) f = model.riverValue(hole, board);
      else {
        const used = new Set([...hole, ...board]), rest = [];
        for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
        const r = rng(hole[0] * 131 + hole[1] * 7 + board.length);
        if (street === 2) {
          const m = 12; f = 0;
          for (let k = 0; k < m; k++) { const x = rest[Math.floor(r() * rest.length)]; const v = model.riverValue(hole, [...board, x]); f += v * v; }
          f *= rest.length / m;
        } else {
          const m = 24, total = (rest.length * (rest.length - 1)) / 2; f = 0;
          for (let k = 0; k < m; k++) {
            const a = Math.floor(r() * rest.length); let b = Math.floor(r() * (rest.length - 1)); if (b >= a) b++;
            const v = model.riverValue(hole, [...board, rest[a], rest[b]]); f += v * v;
          }
          f *= total / m;
        }
      }
      const t = model.g.thr[street];
      let lo = 0, hi = model.g.K[street] - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] <= f) lo = m + 1; else hi = m; }
      cache.set(key, lo);
      return lo;
    };
    return M;
  }

  /**
   * Chance of winning (ties count half): against any hand, and against the opponent's likely hands
   * given their actions. Runs in chunks; returns null if cancelled().
   */
  async function odds(model, B, hole, { cancelled = () => false, progress = () => {} } = {}) {
    const board = B.h.board.slice(), F = Bots.Fast;
    const combos = pairs([...hole, ...board]);
    const weights = new Float64Array(combos.length).fill(1);
    if (B.opp.length && model) {
      const M = quickModel(model);
      for (let k = 0; k < combos.length; k++) {
        if (k % 40 === 0) { progress(k / combos.length / 2); await new Promise((r) => setTimeout(r, 0)); if (cancelled()) return null; }
        let w = 1;
        for (const t of B.opp) {
          try {
            const p = M.decide({ seat: t.seat, hole: combos[k], board: t.board, history: t.history }, () => 0).probs;
            w *= t.code === 'f' ? p.fold : t.code === 'r' ? p.raise : p.call + (t.canRaise ? 0 : p.raise) + (t.canCheck ? p.fold : 0);
          } catch { /* a line the strategy tree does not have: no information */ }
          if (w === 0) break;
        }
        weights[k] = w;
      }
    }
    const mine = hole.map(F.id), bd = board.map(F.id), need = 5 - board.length;
    const deck = Cards.newDeck().map(F.id).filter((c) => !mine.includes(c) && !bd.includes(c));
    const r = rng(mine[0] * 977 + mine[1] * 31 + bd.length);
    const a7 = new Int32Array(7), b7 = new Int32Array(7);
    let any = 0, rangeW = 0, rangeSum = 0;
    for (let k = 0; k < combos.length; k++) {
      if (k % 60 === 0) { progress(0.5 + k / combos.length / 2); await new Promise((res) => setTimeout(res, 0)); if (cancelled()) return null; }
      const opp = combos[k].map(F.id), left = deck.filter((c) => c !== opp[0] && c !== opp[1]);
      let e = 0, n = 0;
      const run = (extra) => {
        let m = 0;
        for (const c of mine) a7[m++] = c; for (const c of bd) a7[m++] = c; for (const c of extra) a7[m++] = c;
        let q = 0; for (const c of opp) b7[q++] = c; for (const c of bd) b7[q++] = c; for (const c of extra) b7[q++] = c;
        const x = F.rank(a7, m), y = F.rank(b7, q);
        e += x > y ? 1 : x === y ? 0.5 : 0; n++;
      };
      if (need === 0) run([]);
      else if (need === 1) for (const c of left) run([c]);
      else {
        const samples = need === 2 ? 40 : 30;
        for (let s = 0; s < samples; s++) {
          const pick = [];
          while (pick.length < need) { const c = left[Math.floor(r() * left.length)]; if (!pick.includes(c)) pick.push(c); }
          run(pick);
        }
      }
      const eq = e / n;
      any += eq; rangeW += weights[k]; rangeSum += weights[k] * eq;
    }
    progress(1);
    return { any: any / combos.length, range: rangeW > 0 ? rangeSum / rangeW : null, ranged: B.opp.length > 0, combos: combos.length, likely: rangeW };
  }

  return { build, advise, odds, history, quickModel };
})();

function SolverScreen() {
  document.title = TitleFlash.base = 'Heads-Up Limit Solver · Feltroom';
  document.body.classList.add('scroll');
  const saved = Prefs.get('solverSpot', null);
  const S = Object.assign({ hero: 0, sb: 5, bb: 10, stackBB: 100, cards: [null, null, null, null, null, null, null], actions: [], slot: 0 }, saved || {});
  if (!Array.isArray(S.cards) || S.cards.length !== 7) S.cards = [null, null, null, null, null, null, null];
  let model = null, alive = true, token = 0;
  const C = CepheusBot;
  App.root.innerHTML = `<div class="page"><div class="page-inner sv-page">
    <div class="page-head"><a class="btn ghost icon-btn" href="#/" aria-label="Back to home">${icon('back')}</a><h2>${icon('calc')} Heads-Up Limit Solver</h2><span class="grow"></span>${topIconButtons()}</div>
    <p class="muted" style="margin-top:0">Set up any heads-up <b>fixed-limit Hold'em</b> spot and see exactly what the CFR+ strategy does there: how often to fold, check or call, and bet or raise, plus your chance of winning. It is the same strategy as <a href="#/cepheus">Play Against Cepheus</a> (built on Cepheus's rules and algorithm; an approximation, not Cepheus's own strategy). Update the spot as the hand goes on.</p>
    <div id="sv-load" class="hint"></div>
    <div class="sv-grid">
      <div class="sv-left">
        <section class="card-ui setup-section"><h3>The table</h3>
          <div class="field"><span>Your seat</span><div class="seg" role="radiogroup" data-sv="hero"><button type="button" data-v="0">Button (small blind)</button><button type="button" data-v="1">Big blind</button></div></div>
          <div class="two"><label class="field"><span>Small blind</span><input class="input num" id="sv-sb" type="number" min="1" step="1" value="${S.sb}"></label>
            <label class="field"><span>Big blind</span><input class="input num" id="sv-bb" type="number" min="1" step="1" value="${S.bb}"></label></div>
          <label class="field"><span>Your stack, in big blinds (betting units)</span><input class="input num" id="sv-stack" type="number" min="1" step="1" value="${S.stackBB}"></label>
          <p class="hint" style="margin:0" id="sv-table-note"></p>
        </section>
        <section class="card-ui setup-section"><h3>The cards</h3>
          <div class="sv-slots" id="sv-slots"></div>
          <div class="sv-deck" id="sv-deck"></div>
          <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm" id="sv-random">${icon('history')}Random hand</button><button class="btn sm ghost" id="sv-clearcards">Clear cards</button></div>
        </section>
        <section class="card-ui setup-section"><h3>The betting</h3>
          <div id="sv-history"></div>
          <div id="sv-next"></div>
          <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm" id="sv-undo">${icon('back')}Undo last action</button><button class="btn sm ghost" id="sv-newhand">New hand (clear betting)</button></div>
        </section>
      </div>
      <div class="sv-right"><section class="card-ui setup-section sv-advice" id="sv-advice"></section></div>
    </div>
  </div></div>`;
  bindThemeToggles(App.root);
  const SLOT_NAMES = ['Your card 1', 'Your card 2', 'Flop 1', 'Flop 2', 'Flop 3', 'Turn', 'River'];
  const save = () => Prefs.set('solverSpot', { hero: S.hero, sb: S.sb, bb: S.bb, stackBB: S.stackBB, cards: S.cards, actions: S.actions, slot: S.slot });
  const hole = () => (S.cards[0] && S.cards[1] ? [S.cards[0], S.cards[1]] : null);
  const spot = () => ({ hero: S.hero, hole: hole(), board: S.cards.slice(2), sb: S.sb, bb: S.bb, stackBB: S.stackBB, actions: S.actions });
  const who = (B, i) => (i === B.hero ? 'You' : 'Opponent');
  const word = (e, me) => (me ? { f: 'fold', x: 'check', c: 'call', b: `bet ${U.fmt(e.to)}`, r: `raise to ${U.fmt(e.to)}` } : { f: 'folds', x: 'checks', c: 'calls', b: `bets ${U.fmt(e.to)}`, r: `raises to ${U.fmt(e.to)}` })[e.type];

  function renderCards() {
    $('#sv-slots').innerHTML = [[0, 2, 'You'], [2, 5, 'Flop'], [5, 6, 'Turn'], [6, 7, 'River']].map(([a, b, label]) => `<div class="sv-slotgrp"><b>${label}</b><span>${S.cards.slice(a, b).map((c, k) => `<button class="sv-slot ${S.slot === a + k ? 'on' : ''}" data-slot="${a + k}" aria-label="${SLOT_NAMES[a + k]}${c ? ': ' + Cards.pretty(c) : ' (empty)'}">${c ? cardHtml(c) : '<span>+</span>'}</button>`).join('')}</span></div>`).join('');
    const used = new Set(S.cards.filter(Boolean));
    $('#sv-deck').innerHTML = 'shdc'.split('').map((su) => `<div class="sv-row">${'AKQJT98765432'.split('').map((r) => { const c = r + su; return `<button class="sv-card" data-card="${c}" ${used.has(c) ? 'disabled' : ''} aria-label="${Cards.pretty(c)}">${cardHtml(c)}</button>`; }).join('')}</div>`).join('');
    $$('[data-sv="hero"] button').forEach((b) => { const on = Number(b.dataset.v) === S.hero; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-checked', String(on)); });
  }

  function renderBetting(B) {
    const h = B.h, lines = [[], [], [], []];
    for (const e of h.log) if (e.t === 'act') lines[e.street].push(`<span class="sv-act ${e.p === B.hero ? 'me' : ''}">${who(B, e.p)} ${word(e, e.p === B.hero)}</span>`);
    const post = (i, amt) => `<span class="sv-act">${who(B, i)} post${i === B.hero ? '' : 's'} ${U.fmt(amt)}</span>`;
    const posts = post(h.sbIdx, h.sb) + post(h.bbIdx, h.bb);
    $('#sv-history').innerHTML = `<div class="sv-street"><b>Preflop</b>${posts}${lines[0].join('')}</div>` + [1, 2, 3].filter((s) => h.street >= s).map((s) => `<div class="sv-street"><b>${STREETS[s]} <span class="crow">${(s === 1 ? h.board.slice(0, 3) : h.board.slice(s + 1, s + 2)).map((c) => cardHtml(c, '', '--cw:20px')).join('')}</span></b>${lines[s].join('') || '<span class="hint">no betting yet</span>'}</div>`).join('');
    const next = $('#sv-next');
    if (h.phase === 'done') { next.innerHTML = `<p class="hint">${h.players.find((p) => !p.folded) ? `${who(B, h.players.findIndex((p) => !p.folded))} win${h.players.findIndex((p) => !p.folded) === B.hero ? '' : 's'} the pot (the other player folded).` : ''}</p>`; return; }
    if (B.needBoard) {
      const st = h.board.length === 0 ? 'the flop' : h.board.length === 3 ? 'the turn' : 'the river';
      next.innerHTML = `<p class="sv-need">${icon('alert')} Betting on this street is over. Pick ${st} above to continue.</p>`;
      return;
    }
    if (h.phase === 'showdown') { next.innerHTML = '<p class="hint">Showdown: the betting is over.</p>'; return; }
    const L = Engine.legal(h), i = h.toAct;
    const btn = (code, label) => `<button class="btn ${i === B.hero ? 'primary' : ''}" data-act="${code}">${label}</button>`;
    next.innerHTML = `<p style="margin:6px 0"><b>${i === B.hero ? 'Your turn' : 'Opponent to act'}.</b> ${i === B.hero ? 'Record what you do once you have decided:' : 'Record what they did:'}</p>
      <div class="dr-opts">${L.canCheck ? '' : btn('f', 'Fold')}${btn('c', L.canCheck ? 'Check' : `Call ${U.fmt(L.toCall)}`)}${L.canRaise ? btn('r', `${L.isBet ? 'Bet' : 'Raise to'} ${U.fmt(L.minTo)}`) : ''}</div>
      ${L.capReached ? '<p class="hint">Betting is capped (four bets this round): no more raises.</p>' : ''}`;
  }

  async function renderAdvice(B) {
    const box = $('#sv-advice'), my = ++token, hc = hole(), h = B.h;
    const pot = Engine.potTotal(h), L = h.phase === 'betting' ? Engine.legal(h) : null;
    let html = `<h3>What to do</h3>`;
    if (!model) html += '<p class="hint">Loading the strategy…</p>';
    else if (!hc) html += '<p>Pick your two cards to get advice.</p>';
    else if (h.phase !== 'betting') html += `<p class="hint">${B.needBoard ? 'Pick the next board card(s) to continue.' : 'The betting in this hand is over.'}</p>`;
    else if (h.toAct !== B.hero) html += '<p>It is the opponent\'s turn. Record their action to see your next move.</p>';
    else {
      let a = null;
      try { a = LimitSolver.advise(model, B, hc); } catch (e) { html += `<div class="err-box">${icon('alert')}<div>The strategy has no answer for this exact line (${U.esc(e.message)}). It was solved for the standard game, with at most four bets a round.</div></div>`; }
      if (a) {
        const opts = [['fold', 'Fold'], ['call', a.L.canCheck ? 'Check' : `Call ${U.fmt(a.L.toCall)}`], ['raise', `${a.L.isBet ? 'Bet' : 'Raise to'} ${U.fmt(a.L.minTo)}`]].filter(([k]) => k !== 'fold' || !a.L.canCheck).filter(([k]) => k !== 'raise' || a.L.canRaise);
        const best = opts.reduce((x, y) => (a.mix[y[0]] > a.mix[x[0]] ? y : x));
        const top = a.mix[best[0]];
        html += `<div class="sv-best"><span class="hint">Best play</span><b>${best[1]}</b><span>${top >= 0.995 ? 'Always.' : top >= 0.9 ? `Almost always (${Math.round(top * 100)}%).` : top >= 0.7 ? `Most of the time (${Math.round(top * 100)}%).` : `A mixed spot: ${Math.round(top * 100)}% of the time.`}</span></div>
          <div class="sv-mix">${opts.map(([k, l]) => `<div class="sv-bar"><span>${l}</span><div><i style="width:${(a.mix[k] * 100).toFixed(1)}%"></i></div><b>${Math.round(a.mix[k] * 100)}%</b></div>`).join('')}</div>
          <p class="hint">The strategy mixes its actions so it can't be read: to copy it, pick each action about this often${top < 0.95 ? ' (for example, roll a die or use the second hand of a clock)' : ''}.</p>`;
      }
    }
    html += `<h3 style="margin-top:14px">The pot</h3><div class="summary"><div class="sum-tile"><b>${U.fmt(pot)}</b><span>Pot (${(pot / S.bb).toFixed(1)} big blinds)</span></div>
      <div class="sum-tile"><b>${L && L.toCall ? U.fmt(L.toCall) : '–'}</b><span>To call${L && L.toCall ? ` · needs ${Math.round((100 * L.toCall) / (pot + L.toCall))}%` : ''}</span></div></div>
      <h3 style="margin-top:14px">Chance of winning</h3><div id="sv-odds">${hc ? '<div class="rv-bar"><span id="sv-oprog"></span></div><p class="hint">Working it out…</p>' : '<p class="hint">Pick your two cards.</p>'}</div>`;
    box.innerHTML = html;
    if (!hc) return;
    const res = await LimitSolver.odds(model, B, hc, { cancelled: () => my !== token || !alive, progress: (x) => { const p = $('#sv-oprog'); if (p) p.style.width = `${Math.round(x * 100)}%`; } }).catch((e) => { console.warn(e); return null; });
    if (!res || my !== token || !alive) return;
    const pct = (x) => `${(x * 100).toFixed(1)}%`;
    $('#sv-odds').innerHTML = `<div class="summary">
      <div class="sum-tile" style="grid-column:span 2"><b class="sv-big">${pct(res.range != null ? res.range : res.any)}</b><span>${res.ranged ? 'Against the hands they are likely to have, given their betting' : 'Against any two cards (no betting from them to go on yet)'}</span></div>
      ${res.ranged ? `<div class="sum-tile" style="grid-column:span 2"><b>${pct(res.any)}</b><span>Against any two cards</span></div>` : ''}</div>
      <p class="hint">Ties count as half a win. ${h.board.length === 5 ? 'Exact over every hand they could hold.' : h.board.length === 4 ? 'Exact over every hand and every river card.' : 'Every hand they could hold, with sampled board run-outs.'}${res.ranged ? ' Each hand they could hold is weighted by how often this strategy would have bet the way they did with it.' : ''} This is your chance if the hand were checked down from here; betting still to come can change who wins.</p>`;
  }

  function refresh() {
    S.sb = Math.max(1, Math.floor(Number($('#sv-sb').value) || 1)); S.bb = Math.max(S.sb, Math.floor(Number($('#sv-bb').value) || 2)); S.stackBB = Math.max(1, Math.floor(Number($('#sv-stack').value) || 100));
    const notes = [];
    if (S.sb * 2 !== S.bb) notes.push('The strategy was solved with the small blind at half the big blind; other blinds give approximate advice.');
    if (S.stackBB < 24) notes.push(`With ${S.stackBB} big blinds someone can run out of chips (a capped hand costs up to 24 big blinds); the strategy assumes deeper stacks, so treat the advice as approximate.`);
    $('#sv-table-note').textContent = notes.join(' ') || `Bets are ${U.fmt(S.bb)} on the first two rounds and ${U.fmt(S.bb * 2)} on the turn and river, at most four bets a round.`;
    renderCards();
    let B;
    try { B = LimitSolver.build(spot()); } catch (e) { $('#sv-history').innerHTML = `<div class="err-box">${icon('alert')}<div>${U.esc(e.message)}</div></div>`; return; }
    if (B.applied < S.actions.length) S.actions = S.actions.slice(0, B.applied);
    renderBetting(B);
    save();
    renderAdvice(B);
  }

  // cards
  App.root.addEventListener('click', (e) => {
    const sl = e.target.closest('[data-slot]');
    if (sl) { const k = +sl.dataset.slot; if (S.slot === k && S.cards[k]) S.cards[k] = null; S.slot = k; refresh(); return; }
    const cd = e.target.closest('.sv-card');
    if (cd && !cd.disabled) {
      S.cards[S.slot] = cd.dataset.card;
      const nextEmpty = S.cards.findIndex((c, i) => !c && i > S.slot);
      S.slot = nextEmpty >= 0 ? nextEmpty : S.cards.findIndex((c) => !c) >= 0 ? S.cards.findIndex((c) => !c) : S.slot;
      refresh(); return;
    }
    const ac = e.target.closest('[data-act]');
    if (ac) { S.actions.push(ac.dataset.act); refresh(); return; }
    const hs = e.target.closest('[data-sv="hero"] button');
    if (hs) { S.hero = Number(hs.dataset.v); S.actions = []; refresh(); }
  });
  $('#sv-random').addEventListener('click', () => { const d = Cards.shuffle(Cards.newDeck()); S.cards = [d[0], d[1], null, null, null, null, null]; S.actions = []; S.slot = 2; refresh(); });
  $('#sv-clearcards').addEventListener('click', () => { S.cards = [null, null, null, null, null, null, null]; S.slot = 0; refresh(); });
  $('#sv-undo').addEventListener('click', () => { S.actions.pop(); refresh(); });
  $('#sv-newhand').addEventListener('click', () => { S.actions = []; refresh(); });
  ['#sv-sb', '#sv-bb', '#sv-stack'].forEach((id) => $(id).addEventListener('change', refresh));

  $('#sv-load').innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:-2px"></span> Loading the strategy (${U.esc(C.sizeLabel)}, once)…`;
  C.load().then((m) => { if (!alive) return; model = m; $('#sv-load').textContent = ''; refresh(); })
    .catch((e) => { if (!alive) return; $('#sv-load').innerHTML = `<div class="err-box">${icon('alert')}<div><b>The strategy could not be loaded.</b><br>${U.esc(e.message)}</div></div>`; refresh(); });
  refresh();
  return { destroy() { alive = false; token++; document.body.classList.remove('scroll'); } };
}
