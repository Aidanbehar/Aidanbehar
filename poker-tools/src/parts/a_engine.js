/* =====================================================================
   1. UTILITIES  (pure helpers, no DOM / network)
   ===================================================================== */
const U = {
  clone(o) { return JSON.parse(JSON.stringify(o)); },
  /** Unbiased random integer in [0, n) from crypto.getRandomValues. */
  randInt(n) {
    if (!(n >= 1 && n <= 0x100000000)) throw new Error('randInt range');
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  },
  randHex(bytes) {
    const b = new Uint8Array(bytes);
    crypto.getRandomValues(b);
    return Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
  },
  fmt(n) { return Number(n || 0).toLocaleString('en-US'); },
  /** Names may not contain characters the record notation uses as syntax. */
  sanitizeName(s) {
    s = String(s || '').normalize('NFKC')
      // invisible / direction-changing characters could disguise one player as another
      .replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
      .replace(/[;:\[\]"#,=()<>{}\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 18);
    // names are used as keys in records and stats: never allow built-in object property names
    const reserved = (x) => Object.prototype.hasOwnProperty.call(Object.prototype, x) || /^__.*__$/.test(x);
    if (reserved(s)) s = s.replace(/_/g, '');
    if (s && reserved(s)) s += ' 1';
    return s;
  },
  /** Same invisible-character filter for chat text. */
  cleanText(s, max) {
    return String(s || '').replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  },
  sum(a) { return a.reduce((x, y) => x + y, 0); },
  esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
};

/* =====================================================================
   2. CARDS & HAND EVALUATOR  (pure)
   Cards are strings: rank + suit, e.g. "Ah", "Td", "2c".
   ===================================================================== */
const RANKS = '23456789TJQKA';
const SUITS = 'shdc';
const SUIT_SYM = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RANK_WORD = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
const HAND_CATS = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];

const Cards = {
  newDeck() { const d = []; for (const s of SUITS) for (const r of RANKS) d.push(r + s); return d; },
  shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) { const j = U.randInt(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
  },
  rank(c) { return RANKS.indexOf(c[0]) + 2; },
  isCard(c) { return typeof c === 'string' && /^[2-9TJQKA][shdc]$/.test(c); },
  /** Parse a loose card token ("10h", "ah", "A♥") into canonical form or null. */
  parse(tok) {
    if (!tok) return null;
    let t = String(tok).trim().replace('♠', 's').replace('♥', 'h').replace('♦', 'd').replace('♣', 'c');
    t = t.replace(/^10/, 'T');
    if (t.length !== 2) return null;
    const c = t[0].toUpperCase() + t[1].toLowerCase();
    return Cards.isCard(c) ? c : null;
  },
  pretty(c) { return c ? (c[0] === 'T' ? '10' : c[0]) + SUIT_SYM[c[1]] : '??'; },
  /** "QQ", "AKs", "T9o" style shorthand for two hole cards; ranks high-to-low for Omaha hands. */
  shorthand(h) {
    if (!h || !h.length) return '';
    if (h.length !== 2) return h.map((c) => c[0]).sort((x, y) => RANKS.indexOf(y) - RANKS.indexOf(x)).join('');
    let [a, b] = h;
    if (Cards.rank(b) > Cards.rank(a)) [a, b] = [b, a];
    if (a[0] === b[0]) return a[0] + b[0];
    return a[0] + b[0] + (a[1] === b[1] ? 's' : 'o');
  },
};

const Eval = {
  plural(r) { return r === 6 ? 'Sixes' : RANK_WORD[r] + 's'; },

  /** Score exactly five cards. Higher score wins; equal scores tie. */
  eval5(cs) {
    const rs = cs.map(Cards.rank).sort((a, b) => b - a);
    const flush = cs.every((c) => c[1] === cs[0][1]);
    const cnt = {};
    for (const r of rs) cnt[r] = (cnt[r] || 0) + 1;
    const groups = Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a);
    let sh = 0;
    if (groups.length === 5) {
      if (rs[0] - rs[4] === 4) sh = rs[0];
      else if (rs[0] === 14 && rs[1] === 5) sh = 5; // wheel: A-2-3-4-5
    }
    let cat, tb;
    if (sh && flush) { cat = 8; tb = [sh]; }
    else if (cnt[groups[0]] === 4) { cat = 7; tb = groups; }
    else if (cnt[groups[0]] === 3 && cnt[groups[1]] === 2) { cat = 6; tb = groups; }
    else if (flush) { cat = 5; tb = rs; }
    else if (sh) { cat = 4; tb = [sh]; }
    else if (cnt[groups[0]] === 3) { cat = 3; tb = groups; }
    else if (cnt[groups[0]] === 2 && cnt[groups[1]] === 2) { cat = 2; tb = groups; }
    else if (cnt[groups[0]] === 2) { cat = 1; tb = groups; }
    else { cat = 0; tb = rs; }
    return { cat, ranks: tb, score: Eval.encode(cat, tb) };
  },

  encode(cat, tb) { let s = cat; for (let i = 0; i < 5; i++) s = s * 15 + (tb[i] || 0); return s; },

  /** Fewer than five cards (preflop / partial): only pairs, trips, quads, high card. */
  evalSmall(cs) {
    const rs = cs.map(Cards.rank).sort((a, b) => b - a);
    const cnt = {};
    for (const r of rs) cnt[r] = (cnt[r] || 0) + 1;
    const groups = Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a);
    let cat = 0;
    if (cnt[groups[0]] === 4) cat = 7;
    else if (cnt[groups[0]] === 3) cat = 3;
    else if (cnt[groups[0]] === 2 && cnt[groups[1]] === 2) cat = 2;
    else if (cnt[groups[0]] === 2) cat = 1;
    const tb = cat ? groups : rs;
    return { cat, ranks: tb, score: Eval.encode(cat, tb), best: cs.slice() };
  },

  /** Best hand from 2..7 cards. Returns {cat, ranks, score, best:[5 cards]}. */
  evaluate(cards) {
    cards = cards.filter(Boolean);
    if (cards.length < 5) return Eval.evalSmall(cards);
    let best = null;
    const n = cards.length;
    const pick = [0, 0, 0, 0, 0];
    const rec = (start, depth) => {
      if (depth === 5) {
        const five = pick.map((i) => cards[i]);
        const e = Eval.eval5(five);
        if (!best || e.score > best.score) { best = e; best.best = five; }
        return;
      }
      for (let i = start; i <= n - (5 - depth); i++) { pick[depth] = i; rec(i + 1, depth + 1); }
    };
    rec(0, 0);
    return best;
  },

  /** All k-element subsets of arr. */
  combos(arr, k) {
    const out = [], pick = [];
    const rec = (start) => {
      if (pick.length === k) { out.push(pick.slice()); return; }
      for (let i = start; i <= arr.length - (k - pick.length); i++) { pick.push(arr[i]); rec(i + 1); pick.pop(); }
    };
    rec(0);
    return out;
  },

  /**
   * Best hand for a game. Hold'em: any five of hole + board.
   * Omaha: exactly two hole cards plus exactly three board cards.
   */
  forGame(game, hole, board) {
    hole = (hole || []).filter(Boolean);
    board = (board || []).filter(Boolean);
    if (game !== 'omaha') return Eval.evaluate([...hole, ...board]);
    let best = null;
    const keep = (e) => { if (!best || e.score > best.score) best = e; };
    const pairs = Eval.combos(hole, 2);
    if (board.length < 3) { for (const pr of pairs) keep(Eval.evalSmall(pr)); return best; }
    const trips = Eval.combos(board, 3);
    for (const pr of pairs) for (const tr of trips) { const five = [...pr, ...tr]; const e = Eval.eval5(five); e.best = five; keep(e); }
    return best;
  },

  describe(e) {
    const r = e.ranks, W = RANK_WORD, P = Eval.plural;
    switch (e.cat) {
      case 8: return r[0] === 14 ? 'Royal Flush' : `Straight Flush, ${W[r[0]]} high`;
      case 7: return `Four of a Kind, ${P(r[0])}`;
      case 6: return `Full House, ${P(r[0])} over ${P(r[1])}`;
      case 5: return `Flush, ${W[r[0]]} high`;
      case 4: return `Straight, ${W[r[0]]} high`;
      case 3: return `Three of a Kind, ${P(r[0])}`;
      case 2: return `Two Pair, ${P(r[0])} and ${P(r[1])}`;
      case 1: return `Pair of ${P(r[0])}`;
      default: return `High Card, ${W[r[0]]}`;
    }
  },
};

/* =====================================================================
   3. RULES ENGINE  (pure: no DOM, no network, no randomness)
   One object per hand. Dealing is done by the caller (host or replayer),
   which keeps the engine deterministic and lets the viewer re-simulate.

   hand.phase: 'betting' -> someone must act (hand.toAct)
               'deal'    -> caller must deal hand.pendingDeal board cards
               'showdown'-> caller must call settle(hand, planShowdown(...))
               'settle'  -> everyone else folded; caller calls settle(hand)
               'done'    -> chips distributed
   ===================================================================== */
const STREETS = ['Preflop', 'Flop', 'Turn', 'River'];
const LIMIT_CAP = 4; // fixed limit: a bet and three raises per betting round

const Engine = {
  /**
   * o = {no, players:[{name, stack}], button, sb, bb, ante, hole:[[c,c]|null],
   *      game: 'holdem'|'omaha', limit: 'nl'|'pl', holeCount: 2|4|5}
   * players are in seat (clockwise) order; button is an index into players.
   */
  createHand(o) {
    const n = o.players.length;
    if (n < 2) throw new Error('A hand needs at least two players');
    if (!(o.button >= 0 && o.button < n)) throw new Error('Invalid button position');
    const h = {
      no: o.no || 1, sb: o.sb, bb: o.bb, ante: o.ante || 0, button: o.button,
      game: o.game === 'omaha' ? 'omaha' : 'holdem', limit: ['pl', 'fl'].includes(o.limit) ? o.limit : 'nl',
      holeCount: o.holeCount || (o.game === 'omaha' ? 4 : 2),
      players: o.players.map((p, i) => ({
        name: p.name, startStack: p.stack, stack: p.stack, bet: 0, committed: 0,
        folded: false, allIn: false, acted: false, actedBet: 0,
        hole: (o.hole && o.hole[i]) || null, shown: false, mucked: false,
      })),
      board: [], street: 0, currentBet: 0, minRaise: o.bb, toAct: -1, betCount: 1, // the big blind is the first bet
      phase: 'betting', pendingDeal: 0, log: [], lastAggressor: -1, results: null,
    };
    for (const p of h.players) if (!(p.stack > 0)) throw new Error(`${p.name} has no chips to play`);
    // Heads-up: the button posts the small blind and acts first preflop.
    h.sbIdx = n === 2 ? h.button : (h.button + 1) % n;
    h.bbIdx = (h.sbIdx + 1) % n;
    if (h.ante > 0) for (let k = 1; k <= n; k++) Engine._post(h, (h.button + k) % n, h.ante, 'a');
    Engine._post(h, h.sbIdx, h.sb, 'sb');
    Engine._post(h, h.bbIdx, h.bb, 'bb');
    h.currentBet = h.bb;
    h.toAct = Engine._nextToAct(h, h.bbIdx);
    if (h.toAct < 0) Engine._endRound(h);
    return h;
  },

  _post(h, i, amount, kind) {
    const p = h.players[i];
    const a = Math.min(amount, p.stack);
    if (a <= 0) return;
    p.stack -= a; p.committed += a;
    if (kind !== 'a') p.bet += a;
    if (p.stack === 0) p.allIn = true;
    h.log.push({ t: 'post', kind, p: i, amt: a });
  },

  _put(p, amt) { p.stack -= amt; p.bet += amt; p.committed += amt; if (p.stack === 0) p.allIn = true; },

  _needsAction(h, i) {
    const p = h.players[i];
    if (p.folded || p.allIn) return false;
    if (p.acted && p.bet >= h.currentBet) return false;
    let othersAble = false, maxOther = 0;
    h.players.forEach((q, j) => {
      if (j === i || q.folded) return;
      if (!q.allIn) othersAble = true;
      maxOther = Math.max(maxOther, q.bet);
    });
    // Everyone else is all-in: act only when facing a bet you have not matched.
    if (!othersAble && p.bet >= maxOther) return false;
    return true;
  },

  _nextToAct(h, from) {
    const n = h.players.length;
    for (let k = 1; k <= n; k++) { const i = (from + k) % n; if (Engine._needsAction(h, i)) return i; }
    return -1;
  },

  _endRound(h) {
    h.toAct = -1;
    if (h.players.filter((p) => !p.folded).length <= 1) { h.phase = 'settle'; return; }
    if (h.street === 3) h.phase = 'showdown';
    else { h.phase = 'deal'; h.pendingDeal = h.street === 0 ? 3 : 1; }
  },

  /** What the player to act may do. null if no action is pending. */
  legal(h) {
    if (h.phase !== 'betting' || h.toAct < 0) return null;
    const i = h.toAct, p = h.players[i];
    const toCall = Math.min(Math.max(0, h.currentBet - p.bet), p.stack);
    const othersAble = h.players.some((q, j) => j !== i && !q.folded && !q.allIn);
    const allInTo = p.bet + p.stack;
    // Pot limit: the largest raise is to (current bet + the pot after calling).
    // Fixed limit: every bet and raise is exactly one bet (the big blind preflop and on the flop, two big
    // blinds on the turn and river), with at most four bets in a betting round.
    const fixed = h.limit === 'fl', size = Engine.betSize(h);
    const potCap = h.limit === 'pl' ? h.currentBet + Engine.potTotal(h) + toCall : fixed ? h.currentBet + size : Infinity;
    const maxTo = Math.min(allInTo, potCap);
    const capReached = fixed && h.betCount >= LIMIT_CAP;
    // An all-in that is less than a full raise does not reopen betting for
    // players who already acted (cumulative short raises can, TDA style).
    const reopened = !p.acted || h.currentBet - p.actedBet >= h.minRaise;
    const canRaise = othersAble && reopened && !capReached && maxTo > h.currentBet;
    const minFull = fixed ? h.currentBet + size : h.currentBet === 0 ? h.bb : h.currentBet + h.minRaise;
    return {
      player: i, canCheck: toCall === 0, toCall, callTo: p.bet + toCall, canRaise,
      minTo: Math.min(minFull, maxTo), maxTo, isBet: h.currentBet === 0,
      currentBet: h.currentBet, myBet: p.bet, stack: p.stack, pot: Engine.potTotal(h),
      reopenBlocked: othersAble && !reopened && maxTo > h.currentBet,
      capped: maxTo < allInTo, limit: h.limit, betSize: fixed ? size : null, capReached,
    };
  },

  /** Fixed limit: the small bet (big blind) on the first two rounds, the big bet (two big blinds) after. */
  betSize(h) { return h.street < 2 ? h.bb : 2 * h.bb; },

  potTotal(h) { return U.sum(h.players.map((p) => p.committed)); },

  /** a = {type: fold|check|call|bet|raise|allin (or f|x|c|b|r), to: street total} */
  applyAction(h, a) {
    const L = Engine.legal(h);
    if (!L) throw new Error('No action is expected right now');
    const i = L.player, p = h.players[i];
    let type = { f: 'fold', x: 'check', c: 'call', b: 'bet', r: 'raise' }[a.type] || a.type;
    let to = a.to;
    if (type === 'allin') {
      if (L.canRaise) { type = 'raise'; to = L.maxTo; } else type = L.toCall > 0 ? 'call' : 'check';
    }
    let rec, amt = 0;
    if (type === 'fold') { p.folded = true; rec = 'f'; to = undefined; }
    else if (type === 'check') {
      if (!L.canCheck) throw new Error(`Cannot check: ${U.fmt(L.toCall)} to call`);
      rec = 'x'; to = undefined;
    } else if (type === 'call') {
      if (L.toCall === 0) throw new Error('Nothing to call, check instead');
      amt = L.toCall; Engine._put(p, amt); rec = 'c'; to = p.bet;
    } else if (type === 'bet' || type === 'raise') {
      if (!L.canRaise) {
        throw new Error(L.reopenBlocked ? 'Betting was not reopened (the all-in was less than a full raise); you may only call or fold' : 'Raising is not possible here');
      }
      to = Number(to);
      if (!Number.isInteger(to)) throw new Error('Amount must be a whole number of chips');
      if (to > L.maxTo) throw new Error(h.limit === 'fl' && L.capped ? `Limit: ${L.isBet ? 'bets' : 'raises'} are exactly ${U.fmt(L.betSize)}, so it's to ${U.fmt(L.maxTo)}` : L.capped ? `Pot limit: the most you can make it is ${U.fmt(L.maxTo)}` : `You only have ${U.fmt(L.maxTo)} in total`);
      if (to < L.minTo) throw new Error(`Minimum ${L.isBet ? 'bet' : 'raise'} is to ${U.fmt(L.minTo)}`);
      const inc = to - h.currentBet;
      if (inc >= h.minRaise) h.minRaise = inc;
      if (h.limit === 'fl' && inc >= Engine.betSize(h)) h.betCount++; // a short all-in doesn't count toward the cap
      amt = to - p.bet; Engine._put(p, amt);
      h.currentBet = to; h.lastAggressor = i;
      rec = L.isBet ? 'b' : 'r';
    } else throw new Error('Unknown action "' + a.type + '"');
    p.acted = true; p.actedBet = h.currentBet;
    h.log.push({ t: 'act', street: h.street, p: i, type: rec, to, amt, allIn: p.allIn });
    if (h.players.filter((q) => !q.folded).length === 1) { Engine._endRound(h); return h; }
    const nx = Engine._nextToAct(h, i);
    if (nx >= 0) h.toAct = nx; else Engine._endRound(h);
    return h;
  },

  dealBoard(h, cards) {
    if (h.phase !== 'deal') throw new Error('Board cards are not due yet');
    if (!cards || cards.length !== h.pendingDeal) throw new Error(`Expected ${h.pendingDeal} board card(s)`);
    h.board.push(...cards); h.street++;
    h.log.push({ t: 'deal', street: h.street, cards: cards.slice() });
    for (const p of h.players) { p.bet = 0; p.acted = false; p.actedBet = 0; }
    h.currentBet = 0; h.minRaise = h.limit === 'fl' ? Engine.betSize(h) : h.bb; h.betCount = 0; h.lastAggressor = -1; h.pendingDeal = 0;
    h.phase = 'betting';
    h.toAct = Engine._nextToAct(h, h.button);
    if (h.toAct < 0) Engine._endRound(h);
    return h;
  },

  /** Split contributions into main pot + side pots. folded[i] players are never eligible. */
  computePots(amounts, folded) {
    const levels = [...new Set(amounts.filter((a, i) => !folded[i] && a > 0))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    for (const lv of levels) {
      let amt = 0;
      amounts.forEach((a) => { amt += Math.max(0, Math.min(a, lv) - prev); });
      const elig = amounts.map((a, i) => i).filter((i) => !folded[i] && amounts[i] >= lv);
      const last = pots[pots.length - 1];
      if (last && last.eligible.join() === elig.join()) last.amount += amt;
      else if (amt > 0) pots.push({ amount: amt, eligible: elig });
      prev = lv;
    }
    const left = U.sum(amounts) - U.sum(pots.map((p) => p.amount));
    if (left > 0) {
      if (pots.length) pots[pots.length - 1].amount += left;
      else pots.push({ amount: left, eligible: amounts.map((a, i) => i).filter((i) => !folded[i]) });
    }
    return pots;
  },

  /** Pots already collected from previous streets (for display). */
  collectedPots(h) {
    return Engine.computePots(h.players.map((p) => p.committed - p.bet), h.players.map((p) => p.folded));
  },

  showdownOrder(h) {
    const n = h.players.length;
    let start = h.lastAggressor >= 0 && !h.players[h.lastAggressor].folded ? h.lastAggressor : -1;
    if (start < 0) for (let k = 1; k <= n; k++) { const i = (h.button + k) % n; if (!h.players[i].folded) { start = i; break; } }
    const order = [];
    for (let k = 0; k < n; k++) { const i = (start + k) % n; if (!h.players[i].folded) order.push(i); }
    return order;
  },

  /**
   * Decide who shows and who mucks. First in order always shows; when the board was
   * run out with players all-in everyone shows; otherwise a player shows only if they
   * can still win or tie a pot they are in (or has auto-muck switched off).
   */
  planShowdown(h, autoMuck) {
    const order = Engine.showdownOrder(h);
    const runout = h.players.filter((p) => !p.folded && !p.allIn).length <= 1;
    const pots = Engine.computePots(h.players.map((p) => p.committed), h.players.map((p) => p.folded)).map((p) => ({ ...p, best: -1 }));
    return order.map((i, k) => {
      const ev = Eval.forGame(h.game, h.players[i].hole, h.board);
      const mine = pots.filter((pt) => pt.eligible.includes(i));
      const canWin = mine.some((pt) => ev.score >= pt.best);
      const show = k === 0 || runout || !(autoMuck ? autoMuck(i) : true) || canWin;
      if (show) for (const pt of mine) pt.best = Math.max(pt.best, ev.score);
      return { p: i, show };
    });
  },

  /** Distribute the pot. plan = [{p, show}] for showdowns (ignored when uncontested). */
  settle(h, plan) {
    if (h.phase !== 'showdown' && h.phase !== 'settle') throw new Error('Hand is not ready to settle');
    const P = h.players, n = P.length;
    // 1) Return any uncalled part of the largest bet.
    let top = -1, max = -1, second = 0;
    P.forEach((p, i) => {
      if (p.committed > max) { second = Math.max(second, max); max = p.committed; top = i; }
      else second = Math.max(second, p.committed);
    });
    if (top >= 0 && max > second) {
      const d = max - second, p = P[top];
      p.stack += d; p.committed -= d; p.bet = Math.max(0, p.bet - d); p.allIn = p.stack === 0;
      h.log.push({ t: 'return', p: top, amt: d });
    }
    const live = P.map((p, i) => i).filter((i) => !P[i].folded);
    const results = { pots: [], payouts: P.map(() => 0), showdown: false };
    if (live.length === 1) {
      const w = live[0], amt = Engine.potTotal(h);
      P[w].stack += amt; results.payouts[w] = amt;
      results.pots.push({ amount: amt, eligible: [w], winners: [w] });
      h.log.push({ t: 'win', p: w, amt, pot: 0, npots: 1, desc: null });
    } else {
      results.showdown = true;
      for (const step of plan || []) {
        const p = P[step.p];
        if (!p || p.folded) continue;
        if (step.show && p.hole) { p.shown = true; h.log.push({ t: 'show', p: step.p, cards: p.hole.slice() }); }
        else { p.mucked = true; h.log.push({ t: 'muck', p: step.p }); }
      }
      const evs = P.map((p) => (p.shown && p.hole ? Eval.forGame(h.game, p.hole, h.board) : null));
      results.evals = evs.map((e) => e && { score: e.score, desc: Eval.describe(e), best: e.best });
      const pots = Engine.computePots(P.map((p) => p.committed), P.map((p) => p.folded));
      pots.forEach((pot, k) => {
        let contenders = pot.eligible.filter((i) => evs[i]);
        if (!contenders.length) contenders = pot.eligible.slice(0, 1); // cannot happen with a valid plan
        const best = Math.max(...contenders.map((i) => (evs[i] ? evs[i].score : -1)));
        // Odd chips go to the winner(s) closest to the left of the button.
        const winners = contenders.filter((i) => (evs[i] ? evs[i].score : -1) === best)
          .sort((a, b) => ((a - h.button - 1 + n) % n) - ((b - h.button - 1 + n) % n));
        const share = Math.floor(pot.amount / winners.length);
        let rem = pot.amount - share * winners.length;
        for (const w of winners) {
          const amt = share + (rem-- > 0 ? 1 : 0);
          P[w].stack += amt; results.payouts[w] += amt;
          h.log.push({ t: 'win', p: w, amt, pot: k, npots: pots.length, desc: evs[w] ? Eval.describe(evs[w]) : null });
        }
        results.pots.push({ amount: pot.amount, eligible: pot.eligible, winners });
      });
    }
    for (const p of P) p.allIn = p.stack === 0;
    h.results = results; h.phase = 'done'; h.toAct = -1;
    return h;
  },

  /** Voluntary show after the hand (or a forced reveal in replays). */
  showCards(h, i) {
    const p = h.players[i];
    if (!p || !p.hole || p.shown) return false;
    p.shown = true; p.mucked = false;
    h.log.push({ t: 'show', p: i, cards: p.hole.slice(), voluntary: true });
    return true;
  },

  /** Human-readable sentence for a log entry. */
  describeEntry(h, e) {
    const nm = e.p != null ? h.players[e.p].name : '';
    const ai = e.allIn ? ' (all-in)' : '';
    switch (e.t) {
      case 'post': return `${nm} posts ${{ a: 'ante', sb: 'small blind', bb: 'big blind' }[e.kind]} ${U.fmt(e.amt)}`;
      case 'act':
        return { f: `${nm} folds`, x: `${nm} checks`, c: `${nm} calls ${U.fmt(e.amt)}${ai}`, b: `${nm} bets ${U.fmt(e.to)}${ai}`, r: `${nm} raises to ${U.fmt(e.to)}${ai}` }[e.type];
      case 'deal': return `${STREETS[e.street]}: ${e.cards.map(Cards.pretty).join(' ')}`;
      case 'show': return `${nm} shows ${e.cards.map(Cards.pretty).join(' ')}` + (h.board.length >= 3 ? ` (${Eval.describe(Eval.forGame(h.game, e.cards, h.board))})` : '');
      case 'muck': return `${nm} mucks`;
      case 'return': return `Uncalled ${U.fmt(e.amt)} returned to ${nm}`;
      case 'win': return `${nm} wins ${U.fmt(e.amt)}${e.npots > 1 ? ' from ' + Notation.potLabel(e.pot) : ''}${e.desc ? ' with ' + e.desc : ''}`;
    }
    return '';
  },
};
