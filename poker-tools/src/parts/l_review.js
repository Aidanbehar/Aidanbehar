/* =====================================================================
   7g. HAND REVIEW
   Every decision you made is replayed from your game record and compared with what
   Feltroom's strongest bot (Extreme, GTO-inspired style) would do in the same spot, or,
   in a Play Against Cepheus game, with the CFR+ strategy. Only what you could see is
   used: your own cards, the board and the betting. Everyone else's cards are removed
   before anything is analysed, even when the record has them.
   ===================================================================== */
const HandReview = (() => {
  const SAMPLES = 48;      // how many times the reference player decides each spot (it mixes its play)
  const MAX_SPOTS = 400;   // very long games: the most recent decisions
  const RECENT_HANDS = 3000; // ...found among this many most recent hands
  const WORD = { fold: 'fold', check: 'check', call: 'call', raise: 'bet or raise' };
  const group = (t) => ({ f: 'fold', fold: 'fold', x: 'check', check: 'check', c: 'call', call: 'call', b: 'raise', r: 'raise', bet: 'raise', raise: 'raise' }[t] || 'check');
  const pct = (x) => `${Math.round(100 * x)}%`;
  const STREET = ['Preflop', 'Flop', 'Turn', 'River'];

  /** Every decision `name` made in a readable record, with the table exactly as it was just before it. */
  function spots(text, name) {
    const g = Notation.parse(text);
    // Very long games (Instant mode): only the most recent hands can matter, since at most MAX_SPOTS
    // decisions are reviewed. Each hand states its own stacks, so it replays the same on its own.
    const total = g.hands.length;
    if (total > RECENT_HANDS) g.hands = g.hands.slice(-RECENT_HANDS);
    const rp = Replay.game(g);
    const out = [], finished = [];
    for (const rh of rp.hands) {
      const r = rh.rec, me = r.stacks.findIndex(([n]) => n === name);
      if (me >= 0 && r.hole[name] && rh.hand) {
        for (let k = 1; k < rh.steps.length; k++) {
          const st = rh.steps[k];
          if (st.kind !== 'act' || st.actor !== me) continue;
          const before = U.clone(rh.steps[k - 1].hand);
          before.players.forEach((p, j) => { if (j !== me) { p.hole = null; p.shown = false; } });
          const e = st.hand.log[st.hand.log.length - 1];
          out.push({ no: r.no, hand: before, i: me, act: { type: e.type, to: e.to }, prior: finished.slice(-80) });
        }
      }
      if (rh.hand && rh.hand.phase === 'done') finished.push(rh.hand);
    }
    return { spots: out.slice(-MAX_SPOTS), cut: Math.max(0, out.length - MAX_SPOTS) + (total > RECENT_HANDS ? 1 : 0), hands: total, cfg: rp.cfg };
  }

  /** The reference player's mix of actions in one spot, plus the numbers behind it. */
  async function analyse(spot, opts = {}) {
    const h = spot.hand, i = spot.i, L = Engine.legal(h);
    const pot = L.pot, toCall = L.toCall, facing = toCall > 0;
    const potOdds = facing ? toCall / (pot + toCall) : 0;
    if (!spot.models) spot.models = Bots.buildModels(spot.prior);
    const ctx = Bots.contextFor(h, i, { models: spot.models, difficulty: 'extreme', personality: 'gto', work: opts.work || 0.6 });
    const freq = { fold: 0, check: 0, call: 0, raise: 0 }, sizes = [];
    const tally = (a) => { const k = group(a.type); freq[k] += 1 / SAMPLES; if (k === 'raise' && a.to) sizes.push(a.to); };
    const first = await Bots.decideAsync(ctx);
    tally(first);
    for (let k = 1; k < SAMPLES; k++) tally(Bots.decide(ctx));
    let eq = ctx._p && ctx._p.eq !== undefined ? ctx._p.eq : first.meta && first.meta.eq;
    if (typeof eq !== 'number') eq = null;
    let source = 'bot';
    // Against Cepheus, the CFR+ strategy itself is the reference (heads-up limit Hold'em only).
    if (opts.cepheus && typeof CepheusBot !== 'undefined' && CepheusBot.model && h.limit === 'fl' && h.game === 'holdem' && h.players.length === 2) {
      try {
        const d = CepheusBot.model.decide(CepheusBot.observe(h, i), Math.random);
        const p = d.probs;
        freq.fold = L.canCheck ? 0 : p.fold; freq.check = L.canCheck ? p.call + p.fold : 0; freq.call = L.canCheck ? 0 : p.call; freq.raise = L.canRaise ? p.raise : 0;
        if (!L.canRaise) { if (L.canCheck) freq.check += p.raise; else freq.call += p.raise; }
        source = 'cepheus';
      } catch { /* keep the bot's answer */ }
    }
    return grade(spot, { L, pot, toCall, facing, potOdds, eq, freq, size: sizes.length ? sizes.sort((a, b) => a - b)[sizes.length >> 1] : null, source });
  }

  /** good / close / mistake, with a plain-language reason. */
  function grade(spot, a) {
    const mine = group(spot.act.type), f = a.freq[mine] || 0;
    const best = Object.keys(a.freq).reduce((x, y) => (a.freq[y] > a.freq[x] ? y : x), mine);
    let g = f >= 0.25 ? 'good' : f >= 0.06 ? 'close' : 'mistake';
    if (mine === 'fold' && a.L.canCheck) g = 'mistake';
    const h = spot.hand, bb = h.bb || 1;
    const eqT = a.eq != null ? pct(a.eq) : null;
    const facts = [];
    if (a.facing) facts.push(`You had to call ${U.fmt(a.toCall)} to win a pot of ${U.fmt(a.pot)}, so a call needed to win at least ${pct(a.potOdds)} of the time.`);
    else facts.push(a.pot ? `Nobody had bet yet; the pot was ${U.fmt(a.pot)}.` : 'Nobody had bet yet.');
    if (eqT) facts.push(`Against the hands your opponents were likely to hold, yours would win about ${eqT} of the time.`);
    let why = '', kind = null;
    const say = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    if (g === 'good') why = best === mine || a.freq[mine] >= 0.6 ? `${say(WORD[mine])} is what a strong player does here.` : `${say(WORD[mine])} is a fine choice. A strong player would also ${WORD[best]} here ${pct(a.freq[best])} of the time.`;
    else {
      if (mine === 'fold' && a.L.canCheck) { why = 'You folded when checking was free. Checking keeps your hand alive at no cost.'; kind = 'loose-fold'; }
      else if (mine === 'fold' && a.eq != null && a.eq > a.potOdds + 0.06) { why = 'Folding gave up a profitable call: your chance of winning was better than the price you were offered.'; kind = 'overfold'; }
      else if (mine === 'call' && a.eq != null && a.eq < a.potOdds - 0.06) { why = 'Calling costs chips over time here: the price was higher than your chance of winning.'; kind = 'overcall'; }
      else if (mine === 'raise' && (best === 'fold' || best === 'check' || best === 'call') && a.eq != null && a.eq < 0.5) { why = 'This bet was likely to be called by better hands and rarely made better hands fold.'; kind = 'risky'; }
      else if ((mine === 'check' || mine === 'call') && best === 'raise' && a.eq != null && a.eq >= 0.6) { why = 'With a hand this strong, betting or raising wins more chips from worse hands.'; kind = 'passive'; }
      else why = `A strong player would usually ${WORD[best]} here (${pct(a.freq[best])} of the time) and only rarely ${WORD[mine]}.`;
      if (g === 'close') why = `Close. ${why}`;
    }
    if (mine === 'raise' && a.size && spot.act.to && g !== 'mistake') {
      const r = spot.act.to / a.size;
      if (r > 2 || r < 0.5) facts.push(`Size: you made it ${U.fmt(spot.act.to)}; a typical size here is about ${U.fmt(a.size)}.`);
    }
    // How much the decision mattered: bigger pots and clearer mistakes first.
    const weight = (1 - f) * (a.pot + a.toCall) / bb;
    return { no: spot.no, street: h.street, hole: h.players[spot.i].hole, board: h.board.slice(), mine, did: spot.act, best, freq: a.freq, grade: g, why, facts, kind, weight, pot: a.pot, source: a.source, eq: a.eq, potOdds: a.potOdds };
  }

  /** Analyse a whole record, yielding to the page as it goes. onProgress(done, total). */
  async function run(text, name, opts = {}) {
    const S = spots(text, name);
    const items = [];
    for (let k = 0; k < S.spots.length; k++) {
      if (opts.cancelled && opts.cancelled()) return null;
      items.push(await analyse(S.spots[k], opts));
      if (opts.onProgress) opts.onProgress(k + 1, S.spots.length);
      if (k % 4 === 3) await new Promise((r) => setTimeout(r, 0));
    }
    return summarise(items, S);
  }

  function summarise(items, S) {
    const n = items.length, by = (g) => items.filter((x) => x.grade === g).length;
    const good = by('good'), close = by('close'), mistakes = by('mistake');
    const streets = STREET.map((label, s) => {
      const xs = items.filter((x) => x.street === s);
      return { label, n: xs.length, score: xs.length ? (xs.filter((x) => x.grade === 'good').length + 0.5 * xs.filter((x) => x.grade === 'close').length) / xs.length : null };
    });
    const kinds = {};
    for (const x of items) if (x.kind && x.grade !== 'good') kinds[x.kind] = (kinds[x.kind] || 0) + 1;
    const worst = items.filter((x) => x.grade !== 'good').sort((a, b) => b.weight - a.weight).slice(0, 6);
    const bestPlays = items.filter((x) => x.grade === 'good' && x.freq[x.mine] >= 0.5 && (x.mine === 'raise' || x.mine === 'call' || (x.mine === 'fold' && x.pot > 0)))
      .sort((a, b) => b.pot - a.pot).slice(0, 3);
    return { items, n, good, close, mistakes, score: n ? (good + 0.5 * close) / n : null, streets, kinds, worst, bestPlays, hands: S.hands, cut: S.cut, source: items.some((x) => x.source === 'cepheus') ? 'cepheus' : 'bot' };
  }

  return { spots, analyse, grade, run, summarise, group };
})();

/* ----- The review window ----- */
function reviewModal(text, name, opts = {}) {
  if (!text || !/#\d+/.test(text)) return toast('No finished hands to review yet.', 'info');
  let stop = false;
  const m = openModal(`<h2>${icon('calc')} Hand review</h2><div id="rv-body">
    <p class="muted" style="margin-top:0">Checking each of your decisions against ${opts.cepheus ? 'the CFR+ strategy' : 'Feltroom\'s strongest bot'}, using only what you could see at the time…</p>
    <div class="rv-bar"><span id="rv-fill"></span></div><p class="hint" id="rv-count">Starting…</p></div>
    <div class="modal-foot"><button class="btn" data-close>Close</button></div>`, { label: 'Hand review', onClose: () => { stop = true; } });
  $('.modal', m.el).classList.add('wide');
  const body = $('#rv-body', m.el);
  const cards = (cs) => (cs || []).map((c) => cardHtml(c)).join('');
  const GRADE = { good: ['Good', 'rv-good'], close: ['Close', 'rv-close'], mistake: ['Mistake', 'rv-bad'] };
  const KINDS = { overfold: 'Folded when calling was profitable', overcall: 'Called when the price was too high', passive: 'Checked or called with a strong hand', risky: 'Bet or raised with a weak hand', 'loose-fold': 'Folded when you could check for free' };
  const did = (x) => `${{ fold: 'Fold', check: 'Check', call: 'Call', raise: x.did.type === 'b' ? 'Bet' : 'Raise' }[x.mine]}${x.mine === 'raise' && x.did.to ? ' to ' + U.fmt(x.did.to) : ''}`;
  const mix = (x) => ['fold', 'check', 'call', 'raise'].filter((k) => x.freq[k] > 0.005).map((k) => `${{ fold: 'fold', check: 'check', call: 'call', raise: 'bet/raise' }[k]} ${Math.round(100 * x.freq[k])}%`).join(' · ');
  const spotHtml = (x) => `<div class="rv-spot">
      <div class="rv-head"><span class="rv-tag ${GRADE[x.grade][1]}">${GRADE[x.grade][0]}</span><b>Hand #${x.no} · ${['Preflop', 'Flop', 'Turn', 'River'][x.street]}</b><span class="grow"></span><span class="hint">You: <b>${did(x)}</b></span></div>
      <div class="rv-cards"><span class="rv-hole">${cards(x.hole)}</span>${x.board.length ? `<span class="rv-board">${cards(x.board)}</span>` : ''}</div>
      <p>${U.esc(x.why)}</p><p class="hint">${x.facts.map(U.esc).join(' ')}</p>
      <p class="hint">${x.source === 'cepheus' ? 'CFR+ strategy' : 'Strong player'}: ${mix(x)}</p></div>`;
  HandReview.run(text, name, {
    cepheus: opts.cepheus,
    cancelled: () => stop,
    onProgress: (k, n) => { const f = $('#rv-fill', m.el), c = $('#rv-count', m.el); if (f) f.style.width = `${(100 * k) / n}%`; if (c) c.textContent = `${k} of ${n} decisions checked`; },
  }).then((R) => {
    if (!R || stop) return;
    if (!R.n) { body.innerHTML = '<p>You have not made any decisions in the finished hands yet. Play a few hands, then review again.</p>'; return; }
    const score = Math.round(100 * R.score);
    const verdict = score >= 85 ? 'Excellent: very close to how a strong player plays.' : score >= 70 ? 'Solid, with a few leaks to work on.' : score >= 55 ? 'Some good decisions, and some costly habits to fix.' : 'Plenty to work on. The biggest mistakes below are the place to start.';
    const kinds = Object.entries(R.kinds).sort((a, b) => b[1] - a[1]);
    body.innerHTML = `
      <div class="rv-score"><div class="rv-big">${score}<small>/100</small></div><div><b>${verdict}</b>
        <div class="hint">${R.n} decision${R.n === 1 ? '' : 's'} over ${R.hands} hand${R.hands === 1 ? '' : 's'}: <span class="rv-good-t">${R.good} good</span> · <span class="rv-close-t">${R.close} close</span> · <span class="rv-bad-t">${R.mistakes} mistake${R.mistakes === 1 ? '' : 's'}</span>${R.cut ? ` (the most recent ${R.n} decisions)` : ''}</div></div></div>
      <div class="rv-streets">${R.streets.filter((s) => s.n).map((s) => `<div class="sum-tile"><b>${Math.round(100 * s.score)}</b><span>${s.label} · ${s.n}</span></div>`).join('')}</div>
      ${kinds.length ? `<div class="section-title">Your habits to watch</div><ul class="rv-kinds">${kinds.map(([k, c]) => `<li>${U.esc(KINDS[k])}: <b>${c}</b> time${c === 1 ? '' : 's'}</li>`).join('')}</ul>` : ''}
      ${R.worst.length ? `<div class="section-title">Decisions to look at again</div>${R.worst.map(spotHtml).join('')}` : '<p><b>No mistakes found.</b> Nicely played.</p>'}
      ${R.bestPlays.length ? `<div class="section-title">Best plays</div>${R.bestPlays.map(spotHtml).join('')}` : ''}
      <details class="rv-all"><summary>Every decision (${R.n})</summary>${R.items.map(spotHtml).join('')}</details>
      <p class="hint">How this works: each spot is replayed with only your cards, the board and the betting, then ${R.source === 'cepheus' ? 'the CFR+ strategy\'s own action mix for that spot is used' : 'Feltroom\'s Extreme bot decides it ' + 48 + ' times (it mixes its play)'}. "Good" means a strong player makes that choice at least a quarter of the time. These are estimates from a strong player, not a perfect solver, and a single hand never proves a play right or wrong.</p>`;
  }).catch((e) => { if (!stop) body.innerHTML = `<div class="err-box">${icon('alert')}<div>The review could not be completed: ${U.esc(e.message)}</div></div>`; });
}
