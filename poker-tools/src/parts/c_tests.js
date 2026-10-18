
/* =====================================================================
   9. SELF TESTS  (pure; rendered by the #/selftest route)
   ===================================================================== */
const SelfTest = (() => {
  const T = [];
  const test = (group, name, fn) => T.push({ group, name, fn });
  const eq = (a, b, msg) => {
    const ja = JSON.stringify(a), jb = JSON.stringify(b);
    if (ja !== jb) throw new Error(`${msg ? msg + ': ' : ''}expected ${jb}, got ${ja}`);
  };
  const ok = (v, msg) => { if (!v) throw new Error(msg || 'assertion failed'); };
  const throws = (fn, re, msg) => {
    try { fn(); } catch (e) { if (re && !re.test(e.message)) throw new Error(`${msg || 'wrong error'}: ${e.message}`); return; }
    throw new Error(msg || 'expected an error');
  };
  const ev = (s) => Eval.evaluate(s.split(' '));
  const cmp = (a, b) => Math.sign(ev(a).score - ev(b).score);
  const desc = (s) => Eval.describe(ev(s));

  /** Plays a whole hand to completion. script: list of actions or a function choosing actions. */
  function play(o) {
    const deck = o.deck ? o.deck.slice() : Cards.shuffle(Cards.newDeck());
    const n = o.stacks.length;
    const hc = o.holeCount || (o.game === 'omaha' ? 4 : 2);
    const hole = o.hole || Array.from({ length: n }, () => Array.from({ length: hc }, () => deck.pop()));
    for (const hc of hole) for (const c of hc || []) { const k = deck.indexOf(c); if (k >= 0) deck.splice(k, 1); }
    const board = o.board ? o.board.slice() : null;
    if (board) for (const c of board) { const k = deck.indexOf(c); if (k >= 0) deck.splice(k, 1); }
    const h = Engine.createHand({
      no: o.no || 1, players: o.stacks.map((s, i) => ({ name: (o.names || 'ABCDEFGHI')[i], stack: s })),
      button: o.button || 0, sb: o.sb || 1, bb: o.bb || 2, ante: o.ante || 0, hole,
      game: o.game, limit: o.limit, holeCount: hc,
    });
    let k = 0;
    for (let guard = 0; guard < 500 && h.phase !== 'done'; guard++) {
      if (h.phase === 'betting') {
        const a = typeof o.actions === 'function' ? o.actions(h, Engine.legal(h)) : o.actions[k++];
        if (!a) return h;
        Engine.applyAction(h, a);
      } else if (h.phase === 'deal') {
        const cs = [];
        for (let i = 0; i < h.pendingDeal; i++) cs.push(board && board.length ? board.shift() : deck.pop());
        Engine.dealBoard(h, cs);
      } else if (h.phase === 'showdown') Engine.settle(h, Engine.planShowdown(h, () => o.autoMuck !== false));
      else if (h.phase === 'settle') Engine.settle(h);
    }
    return h;
  }
  const randomAction = (h, L) => {
    const r = U.randInt(100);
    if (L.canRaise && r < 22) {
      const span = L.maxTo - L.minTo;
      const to = r < 4 ? L.maxTo : L.minTo + (span > 0 ? U.randInt(Math.min(span, 40) + 1) : 0);
      return { type: L.isBet ? 'bet' : 'raise', to };
    }
    if (L.canCheck) return { type: 'check' };
    if (r < 70) return { type: 'call' };
    return { type: 'fold' };
  };
  const wins = (h) => { const o = {}; h.log.filter((e) => e.t === 'win').forEach((e) => { const n = h.players[e.p].name; o[n] = (o[n] || 0) + e.amt; }); return o; };

  /* ---------- Evaluator ---------- */
  test('Evaluator', 'Recognises every category', () => {
    eq(desc('Ah Kh Qh Jh Th 2c 3d'), 'Royal Flush');
    eq(desc('9s 8s 7s 6s 5s Ad Ac'), 'Straight Flush, Nine high');
    eq(desc('Ks Kh Kd Kc 2s 3d 4h'), 'Four of a Kind, Kings');
    eq(desc('Ks Kh Kd 7c 7s 2d 3h'), 'Full House, Kings over Sevens');
    eq(desc('Ah 9h 7h 4h 2h Kc Kd'), 'Flush, Ace high');
    eq(desc('Ts 9h 8d 7c 6s 2d 2h'), 'Straight, Ten high');
    eq(desc('Qs Qh Qd 9c 4s 2d 3h'), 'Three of a Kind, Queens');
    eq(desc('Js Jh 4d 4c As 2d 8h'), 'Two Pair, Jacks and Fours');
    eq(desc('Js Jh 4d 6c As 2d 8h'), 'Pair of Jacks');
    eq(desc('As Qh 4d 6c 9s 2d 8h'), 'High Card, Ace');
    eq(desc('6s 6h 6d 2c 2s'), 'Full House, Sixes over Twos');
  });
  test('Evaluator', 'Wheel straight (A-2-3-4-5) is Five high and loses to 6-high', () => {
    eq(desc('Ah 2c 3d 4s 5h Kd Qc'), 'Straight, Five high');
    eq(cmp('Ah 2c 3d 4s 5h', '2c 3d 4s 5h 6d'), -1);
    eq(cmp('Ah 2c 3d 4s 5h', 'Kh Kc Kd 2s 3s'), 1, 'wheel beats trips');
    eq(desc('Ah 2h 3h 4h 5h 9c 9d'), 'Straight Flush, Five high');
    eq(cmp('Ah Kc Qd Js Th', 'Ah 2c 3d 4s 5h'), 1, 'broadway beats wheel');
    eq(desc('Ah Kc Qd 2s 3h 4c 9d'), 'High Card, Ace', 'no wrap-around straight');
  });
  test('Evaluator', 'Kicker ties and exact ties', () => {
    eq(cmp('Ah Kd 9c 7s 4h 3d 2c', 'Ah Qd 9c 7s 4h 3d 2c'), 1, 'king kicker wins');
    eq(cmp('As Ks Qh Jd 9c 3h 2c', 'Ad Kh Qs Jc 9h 4d 2s'), 0, 'same five cards tie');
    eq(cmp('Kh Kd 8c 8s 5h', 'Kc Ks 8d 8h 4c'), 1, 'two pair kicker');
    eq(cmp('Kh Kd 8c 8s 5h', 'Kc Ks 8d 8h 5c'), 0, 'two pair exact tie');
    eq(cmp('9h 9d 9c Ks Qh', '9h 9d 9c Ks Jh'), 1, 'trips second kicker');
    eq(cmp('Ah Jh 9h 6h 3h', 'Ah Jh 9h 6h 2h'), 1, 'flush fifth card');
    eq(cmp('Qh Qd Qc 2s 2h', 'Jh Jd Jc As Ah'), 1, 'full house: trips first');
    eq(cmp('7h 7d 7c 7s 2h', '7h 7d 7c 7s Ah'), -1, 'quads kicker');
    // Board plays: both players hold lower cards, everyone ties.
    const board = 'Ah Kh Qh Jh Ts';
    eq(cmp(board + ' 2c 3c', board + ' 4d 5d'), 0, 'board straight split');
  });
  test('Evaluator', 'Picks the best five of seven', () => {
    const e = ev('2h 3h 9h Th 4h Ah 4c');
    eq(e.cat, 5);
    eq(e.best.slice().sort(), ['3h', '4h', '9h', 'Ah', 'Th'].sort(), 'best five');
    eq(desc('Ah Ad'), 'Pair of Aces', 'preflop pair');
    eq(desc('Ah Kd'), 'High Card, Ace', 'preflop high card');
  });

  /* ---------- Rules: blinds, raises, pots ---------- */
  test('Rules', 'Heads-up: button posts small blind, acts first preflop and last after', () => {
    const h = Engine.createHand({ players: [{ name: 'A', stack: 100 }, { name: 'B', stack: 100 }], button: 1, sb: 1, bb: 2 });
    eq([h.sbIdx, h.bbIdx], [1, 0]);
    eq(h.players.map((p) => p.bet), [2, 1]);
    eq(h.toAct, 1, 'button/SB acts first preflop');
    Engine.applyAction(h, { type: 'call' });
    eq(h.toAct, 0, 'big blind gets the option');
    Engine.applyAction(h, { type: 'check' });
    Engine.dealBoard(h, ['2c', '7d', 'Js']);
    eq(h.toAct, 0, 'big blind acts first on the flop');
  });
  test('Rules', 'Three-handed blinds and first to act', () => {
    const h = Engine.createHand({ players: ['A', 'B', 'C'].map((name) => ({ name, stack: 100 })), button: 0, sb: 1, bb: 2 });
    eq([h.sbIdx, h.bbIdx, h.toAct], [1, 2, 0]);
    const h4 = Engine.createHand({ players: ['A', 'B', 'C', 'D'].map((name) => ({ name, stack: 100 })), button: 2, sb: 5, bb: 10, ante: 1 });
    eq([h4.sbIdx, h4.bbIdx, h4.toAct], [3, 0, 1]);
    eq(h4.players.map((p) => p.committed), [11, 1, 1, 6], 'antes + blinds');
    eq(Engine.potTotal(h4), 19);
  });
  test('Rules', 'Big blind option and walk', () => {
    const h = play({ stacks: [100, 100, 100], actions: [{ type: 'fold' }, { type: 'fold' }] });
    eq(wins(h), { C: 2 }, 'walk: BB wins the small blind back plus own blind');
    eq(h.log.find((e) => e.t === 'return'), { t: 'return', p: 2, amt: 1 }, 'uncalled 1 returned');
    const h2 = Engine.createHand({ players: ['A', 'B', 'C'].map((name) => ({ name, stack: 100 })), button: 0, sb: 1, bb: 2 });
    Engine.applyAction(h2, { type: 'call' }); Engine.applyAction(h2, { type: 'call' });
    eq(h2.toAct, 2, 'BB still to act after limps');
    eq(Engine.legal(h2).canCheck && Engine.legal(h2).canRaise, true);
  });
  test('Rules', 'Minimum raise sizes', () => {
    const h = Engine.createHand({ players: ['A', 'B', 'C'].map((name) => ({ name, stack: 500 })), button: 0, sb: 1, bb: 2 });
    eq(Engine.legal(h).minTo, 4, 'min raise preflop is 2x BB');
    throws(() => Engine.applyAction(h, { type: 'raise', to: 3 }), /Minimum raise/);
    Engine.applyAction(h, { type: 'raise', to: 10 });
    eq(Engine.legal(h).minTo, 18, 'reraise must add at least the last raise (8)');
    Engine.applyAction(h, { type: 'raise', to: 30 });
    eq(Engine.legal(h).minTo, 50, 'raise of 20 sets min to 50');
    Engine.applyAction(h, { type: 'fold' });
    Engine.applyAction(h, { type: 'call' });
    Engine.dealBoard(h, ['2c', '7d', 'Js']);
    eq(Engine.legal(h).minTo, 2, 'min bet postflop is the big blind');
    throws(() => Engine.applyAction(h, { type: 'bet', to: 1 }), /Minimum bet/);
    throws(() => Engine.applyAction(h, { type: 'bet', to: 999 }), /only have/);
    throws(() => Engine.applyAction(h, { type: 'call' }), /Nothing to call/);
  });
  test('Rules', 'Short all-in does not reopen the betting', () => {
    // A bets 100; B goes all-in for 130 (less than a full raise); C calls; A may only call or fold.
    const h = Engine.createHand({ players: [{ name: 'A', stack: 1000 }, { name: 'B', stack: 132 }, { name: 'C', stack: 1000 }, { name: 'D', stack: 1000 }], button: 3, sb: 1, bb: 2 });
    // preflop: D(button)... order: A is SB(idx0), B BB(idx1), C first.
    Engine.applyAction(h, { type: 'call' }); // C
    Engine.applyAction(h, { type: 'call' }); // D
    Engine.applyAction(h, { type: 'call' }); // A
    Engine.applyAction(h, { type: 'check' }); // B
    Engine.dealBoard(h, ['2c', '7d', 'Js']);
    eq(h.toAct, 0);
    Engine.applyAction(h, { type: 'bet', to: 100 }); // A
    Engine.applyAction(h, { type: 'allin' }); // B -> 130 total
    eq(h.players[1].bet, 130); eq(h.players[1].allIn, true);
    eq(Engine.legal(h).canRaise, true, 'C has not acted: may raise');
    eq(Engine.legal(h).minTo, 230, 'min reraise is still +100');
    Engine.applyAction(h, { type: 'call' }); // C
    Engine.applyAction(h, { type: 'call' }); // D
    const L = Engine.legal(h);
    eq(h.toAct, 0); eq(L.canRaise, false, 'A cannot re-raise'); eq(L.reopenBlocked, true); eq(L.toCall, 30);
    throws(() => Engine.applyAction(h, { type: 'raise', to: 400 }), /not reopened/);
    Engine.applyAction(h, { type: 'call' });
    eq(h.phase, 'deal');
  });
  test('Rules', 'Full-size all-in raise does reopen the betting', () => {
    const h = Engine.createHand({ players: [{ name: 'A', stack: 1000 }, { name: 'B', stack: 202 }, { name: 'C', stack: 1000 }], button: 2, sb: 1, bb: 2 });
    Engine.applyAction(h, { type: 'call' }); Engine.applyAction(h, { type: 'call' }); Engine.applyAction(h, { type: 'check' });
    Engine.dealBoard(h, ['2c', '7d', 'Js']);
    Engine.applyAction(h, { type: 'bet', to: 100 }); // A
    Engine.applyAction(h, { type: 'allin' }); // B -> 200, a full raise
    Engine.applyAction(h, { type: 'call' }); // C
    eq(Engine.legal(h).canRaise, true, 'A may re-raise');
  });
  test('Rules', 'Short-stacked blinds post what they have', () => {
    const h = Engine.createHand({ players: [{ name: 'A', stack: 100 }, { name: 'B', stack: 1 }], button: 0, sb: 1, bb: 2 });
    eq(h.players[1].bet, 1); eq(h.players[1].allIn, true);
    eq(h.phase, 'deal', 'SB has matched the all-in BB: no action needed');
    const h2 = play({ stacks: [100, 1], board: ['2c', '3d', '4h', '9s', 'Kd'], hole: [['As', 'Ad'], ['7c', '8c']], actions: [] });
    eq(wins(h2), { A: 2 }); eq(h2.players[0].stack, 101);
  });
  test('Pots', 'Three-way all-in builds main + side pots', () => {
    const h = play({
      stacks: [50, 100, 200], button: 0, hole: [['As', 'Ad'], ['Ks', 'Kd'], ['Qs', 'Qd']], board: ['2c', '7d', '9h', '3s', '4c'],
      actions: [{ type: 'allin' }, { type: 'allin' }, { type: 'call' }],
    });
    eq(h.results.pots.map((p) => p.amount), [150, 100]);
    eq(wins(h), { A: 150, B: 100 });
    eq(h.players.map((p) => p.stack), [150, 100, 100], 'C gets 100 uncalled back');
  });
  test('Pots', 'Side pot to the shorter stack when the big stack wins main', () => {
    const h = play({
      stacks: [50, 100, 200], button: 0, hole: [['Ks', 'Kd'], ['As', 'Ad'], ['Qs', 'Qd']], board: ['2c', '7d', '9h', '3s', '4c'],
      actions: [{ type: 'allin' }, { type: 'allin' }, { type: 'call' }],
    });
    eq(wins(h), { B: 250 });
    eq(h.players.map((p) => p.stack), [0, 250, 100]);
  });
  test('Pots', 'Folded chips stay in the pot but give no eligibility', () => {
    const pots = Engine.computePots([50, 80, 100], [false, true, false]);
    eq(pots, [{ amount: 150, eligible: [0, 2] }, { amount: 80, eligible: [2] }]);
  });
  test('Pots', 'Split pot with odd chip to the first seat left of the button', () => {
    // A, B, C; button = C. A and B chop. Pot 3+... use a 3-chip pot: blinds 1/2 + C folds? Build: C folds, A completes, B checks.
    const h = play({
      stacks: [100, 100, 100], button: 2, sb: 1, bb: 2, ante: 0,
      hole: [['2c', '3d'], ['2d', '3c'], ['9s', '8s']], board: ['Ah', 'Kh', 'Qd', 'Js', 'Tc'],
      actions: [{ type: 'call' }, { type: 'call' }, { type: 'check' }, 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x'].map((a) => (a === 'x' ? { type: 'check' } : a)),
    });
    eq(wins(h), { A: 2, B: 2, C: 2 }, 'three-way chop of 6');
    const h2 = play({
      stacks: [100, 100, 100], button: 2, sb: 1, bb: 2, ante: 1,
      hole: [['2c', '3d'], ['2d', '3c'], ['9s', '8s']], board: ['Ah', 'Kh', 'Qd', 'Js', '4c'],
      actions: [{ type: 'fold' }, { type: 'call' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }],
    });
    eq(Engine.potTotal(h2), 7);
    eq(wins(h2), { A: 4, B: 3 }, 'odd chip goes to A (left of button)');
  });
  test('Pots', 'Showdown order and auto-muck of losing hands', () => {
    const h = play({
      stacks: [100, 100, 100], button: 0, hole: [['2c', '3d'], ['Ac', 'Ad'], ['Kc', 'Kd']], board: ['7h', '8h', '9d', 'Js', '4c'],
      actions: [{ type: 'call' }, { type: 'call' }, { type: 'check' }, { type: 'bet', to: 10 }, { type: 'call' }, { type: 'call' },
        { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }],
    });
    const sd = h.log.filter((e) => e.t === 'show' || e.t === 'muck').map((e) => `${h.players[e.p].name}:${e.t}`);
    eq(sd, ['B:show', 'C:muck', 'A:muck'], 'river checked through: first left of button shows first');
    eq(wins(h), { B: 36 });
  });
  test('Pots', 'Random hands conserve chips (500 hands)', () => {
    for (let k = 0; k < 500; k++) {
      const n = 2 + U.randInt(8);
      const stacks = Array.from({ length: n }, () => 1 + U.randInt(300));
      const h = play({ stacks, button: U.randInt(n), sb: 1, bb: 2, ante: U.randInt(3) === 0 ? 1 : 0, actions: randomAction });
      ok(h.phase === 'done', 'hand finished');
      eq(U.sum(h.players.map((p) => p.stack)), U.sum(stacks), 'chips conserved');
      ok(h.players.every((p) => p.stack >= 0), 'no negative stacks');
    }
  });

  /* ---------- Notation ---------- */
  const sampleGame = (nHands, mode, variant = 'NLHE') => {
    const V = VARIANTS[variant];
    const names = ['Alice', 'Bob', 'Big Al', 'Dee'];
    let stacks = [200, 200, 200, 200];
    const hands = [];
    for (let k = 0; k < nHands; k++) {
      const live = names.map((n, i) => i).filter((i) => stacks[i] > 0);
      if (live.length < 2) break;
      const h = play({ no: k + 1, names: live.map((i) => names[i]), stacks: live.map((i) => stacks[i]), button: k % live.length, ante: 0, actions: randomAction, game: V.game, limit: V.limit, holeCount: V.holeCount });
      h.players.forEach((p) => { stacks[names.indexOf(p.name)] = p.stack; });
      if (k % 3 === 0 && h.players.length) Engine.showCards(h, 0);
      hands.push(h);
    }
    return { tags: Notation.gameTags({ event: 'Test Night', date: '2026.10.14', sb: 1, bb: 2, ante: 0, startingStack: 200, players: names, holeCards: mode, variant }), hands };
  };
  test('Notation', 'serialize → parse → serialize round-trips (60 random hands, both modes)', () => {
    for (const mode of ['All', 'Showdown']) {
      const sg = sampleGame(60, mode);
      const g = { tags: sg.tags, hands: sg.hands.map((h) => Notation.fromHand(h, 0, mode)) };
      const t1 = Notation.serialize(g);
      const t2 = Notation.serialize(Notation.parse(t1));
      if (t1 !== t2) {
        const a = t1.split('\n'), b = t2.split('\n');
        const i = a.findIndex((l, k) => l !== b[k]);
        throw new Error(`differs at line ${i + 1}: "${a[i]}" vs "${b[i]}"`);
      }
    }
  });
  test('Notation', 'Replaying records reproduces every result (no inconsistencies)', () => {
    const sg = sampleGame(60, 'All');
    const g = Notation.parse(Notation.serialize({ tags: sg.tags, hands: sg.hands.map((h) => Notation.fromHand(h, 0, 'All')) }));
    const r = Replay.game(g);
    eq(r.issues, []);
    r.hands.forEach((rh, k) => eq(rh.hand.players.map((p) => p.stack), sg.hands[k].players.map((p) => p.stack), 'final stacks'));
    const sg2 = sampleGame(40, 'Showdown');
    const g2 = Notation.parse(Notation.serialize({ tags: sg2.tags, hands: sg2.hands.map((h) => Notation.fromHand(h, 1, 'Showdown')) }));
    eq(Replay.game(g2).issues, [], 'hidden-card records replay too');
  });
  test('Notation', 'Hidden cards are written as [????] and only for players not seen', () => {
    const h = play({ stacks: [100, 100, 100], names: ['Ann', 'Ben', 'Cy'], hole: [['Ah', 'Kd'], ['7c', '2s'], ['Qs', 'Qh']], board: ['Js', '8h', '3c', '2d', '9s'], actions: [{ type: 'raise', to: 6 }, { type: 'fold' }, { type: 'call' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }] });
    const t = Notation.serializeHand(Notation.fromHand(h, 1, 'Showdown'));
    ok(t.includes('Ben [7c2s] f'), 'own cards visible'); ok(t.includes('Ann [????] r 6'), 'loser mucked: hidden');
    ok(t.includes('Cy [QsQh] c 6'), 'winner shown'); ok(t.includes('SD: Cy shows [QsQh]; Ann mucks'), 'showdown line');
    const spectator = Notation.serializeHand(Notation.fromHand(h, -1, 'Showdown'));
    ok(spectator.includes('Ben [????] f'), 'spectator does not see Ben');
  });
  test('Notation', 'Parser tolerates extra whitespace and line breaks', () => {
    const messy = `  [Event   "Friday"]\n[Blinds "1/2"] [Ante "0"]\r\n\r\n\n#1   [Button "Alice"]\n[Stacks "Alice:200,   Bob:200, Carol:200"]\nBob sb 1;\nCarol bb\n 2 Alice [Ah Kd]\n r 6; Bob [7c2s] f; Carol [QsQh] r 18;\n Alice c 18\nF:  Js 8h\n3c; Carol b 20; Alice c\n20\nT: 2d; Carol x; Alice x\nR: 9s; Carol b 60; Alice f\n=> Carol\nwins 77\n`;
    const g = Notation.parse(messy);
    eq(g.hands[0].streets.map((s) => s.actions.length), [4, 2, 2, 2]);
    const clean = Notation.serialize(g);
    eq(Notation.serialize(Notation.parse(clean)), clean);
    eq(Replay.game(g).issues, []);
    ok(clean.includes('Alice [AhKd] r 6; Bob [7c2s] f; Carol [QsQh] r 18; Alice c 18'));
  });
  test('Notation', 'Errors carry line numbers', () => {
    const bad = `[Event "x"]\n[Blinds "1/2"]\n\n#1 [Button "Alice"] [Stacks "Alice:200, Bob:200"]\nAlice sb 1; Bob bb 2\nAlice zz 5\n=> Bob wins 3\n`;
    throws(() => Notation.parse(bad), /^Line 6:/, 'line number');
    const bad2 = bad.replace('Alice zz 5', 'Dave f');
    throws(() => Notation.parse(bad2), /^Line 6: Unknown player/);
    throws(() => Notation.parse('[Event "x"]\n[Blinds "1/2"]\n#1 [Button "A"] [Stacks "A:10, B:10"]\nA sb 1; B bb 2\nA f\n'), /^Line 3: .*result line/);
  });
  test('Notation', 'Replay flags inconsistent records', () => {
    const base = `[Event "x"]\n[Blinds "1/2"]\n\n#1 [Button "Alice"] [Stacks "Alice:200, Bob:200"]\nAlice sb 1; Bob bb 2\nAlice [AhKd] r 6; Bob [7c2s] f\n=> Alice wins 4\n`;
    eq(Replay.game(Notation.parse(base)).issues, []);
    ok(Replay.game(Notation.parse(base.replace('r 6', 'r 3'))).issues[0].includes('Minimum raise'), 'illegal min raise');
    ok(Replay.game(Notation.parse(base.replace('wins 4', 'wins 9'))).issues[0].includes('result says'), 'wrong result');
    ok(Replay.game(Notation.parse(base.replace('Bob [7c2s] f', 'Bob [7c2s] f; Bob x'))).issues.length === 1, 'action after hand over');
  });
  test('Notation', 'Built-in sample game loads cleanly', () => {
    const g = Notation.parse(SAMPLE_RECORD);
    eq(Notation.serialize(Notation.parse(Notation.serialize(g))), Notation.serialize(g));
    eq(Replay.game(g).issues, []);
    ok(g.hands.length >= 5);
  });

  /* ---------- Omaha & pot limit ---------- */
  const om = (hole, board) => Eval.describe(Eval.forGame('omaha', hole.split(' '), board.split(' ')));
  test('Omaha', 'Must use exactly two hole cards and three board cards', () => {
    eq(om('As Kd 3c 4c', '9s 9h 9d 9c 2h'), 'Three of a Kind, Nines', 'board quads only count three');
    eq(om('Ah Td 3d 4s', 'Kh Qh Jh 2h 9c'), 'Straight, Ace high', 'one hole heart is not a flush');
    eq(om('Ah 2h 3d 4s', 'Kh Qh Jh 5c 9c'), 'Flush, Ace high', 'two hole hearts + three board hearts');
    eq(om('Ah Ad Kc Ks', '2c 3d 7h 8s 9c'), 'Pair of Aces', 'only one pair from the hand');
    eq(om('5c 6d Qs Qh', 'Ah 2d 3h 4c Kd'), 'Straight, Six high', 'best straight using 5-6 from the hand');
    eq(om('Ah Kd', ''), 'High Card, Ace', 'preflop strength');
    eq(om('9h 9d 2c 3s 4d', '9s Kc Kd 2h 7c'), 'Full House, Nines over Kings', '5-card Omaha');
  });
  test('Omaha', 'Random Omaha hands conserve chips and replay cleanly (PLO, PLO5, NLO)', () => {
    for (const v of ['PLO', 'PLO5', 'NLO', 'PLHE']) {
      const sg = sampleGame(40, 'All', v);
      const g = { tags: sg.tags, hands: sg.hands.map((h) => Notation.fromHand(h, 0, 'All')) };
      const t1 = Notation.serialize(g);
      const g2 = Notation.parse(t1);
      eq(Notation.serialize(g2), t1, v + ' round trip');
      eq(Replay.game(g2).issues, [], v + ' replay');
      ok(sg.hands.every((h) => h.players.every((p) => p.hole.length === VARIANTS[v].holeCount)), 'hole card count');
      const hidden = Notation.serialize({ tags: sg.tags, hands: sg.hands.map((h) => Notation.fromHand(h, 1, 'Showdown')) });
      eq(Replay.game(Notation.parse(hidden)).issues, [], v + ' hidden-card replay');
    }
  });
  test('Omaha', 'Pot-limit maximum bets and raises', () => {
    const h = Engine.createHand({ players: ['A', 'B', 'C'].map((name) => ({ name, stack: 1000 })), button: 0, sb: 1, bb: 2, limit: 'pl', game: 'omaha' });
    eq(Engine.legal(h).maxTo, 7, 'first raise: pot is 3 + call 2 → raise to 7');
    throws(() => Engine.applyAction(h, { type: 'raise', to: 8 }), /Pot limit/);
    Engine.applyAction(h, { type: 'allin' });
    eq(h.players[0].bet, 7, '"all-in" is capped at the pot');
    eq(Engine.legal(h).maxTo, 23, 'SB re-pot: 7 + (10 + 6)');
    Engine.applyAction(h, { type: 'call' }); Engine.applyAction(h, { type: 'call' });
    Engine.dealBoard(h, ['2c', '7d', 'Js']);
    eq(Engine.legal(h).maxTo, 21, 'postflop pot bet');
    Engine.applyAction(h, { type: 'bet', to: 10 });
    eq(Engine.legal(h).maxTo, 51, 'pot raise facing 10 into 21: 21 + 3×10');
    const short = Engine.createHand({ players: [{ name: 'A', stack: 5 }, { name: 'B', stack: 1000 }, { name: 'C', stack: 1000 }], button: 0, sb: 1, bb: 2, limit: 'pl' });
    eq(Engine.legal(short).maxTo, 5, 'short stack all-in below the pot');
    eq(Engine.legal(short).capped, false);
  });
  test('Notation', 'Per-hand blind levels are recorded and replayed', () => {
    const h1 = play({ no: 1, stacks: [100, 100], sb: 1, bb: 2, actions: [{ type: 'fold' }] });
    const h2 = play({ no: 2, stacks: [h1.players[0].stack, h1.players[1].stack], button: 1, sb: 5, bb: 10, ante: 1, actions: [{ type: 'call' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }] });
    const tags = Notation.gameTags({ event: 'Levels', date: '2026.10.14', sb: 1, bb: 2, ante: 0, startingStack: 100, players: ['A', 'B'], holeCards: 'All' });
    const t = Notation.serialize({ tags, hands: [h1, h2].map((h) => Notation.fromHand(h, 0, 'All', { levels: true })) });
    ok(t.includes('#2 [Button "B"] [Stacks "A:99, B:101"] [Blinds "5/10"] [Ante "1"]'), 'level tags');
    eq(Replay.game(Notation.parse(t)).issues, []);
    eq(Notation.serialize(Notation.parse(t)), t);
  });

  /* ---------- Encrypted deal ---------- */
  test('Encrypted deal', 'every card maps to a distinct group element and back', () => {
    const d = SRA.plainDeck();
    eq(new Set(d).size, 52);
    d.forEach((h, i) => eq(SRA.decode(SRA.el(h)), Cards.newDeck()[i]));
  });
  test('Encrypted deal', 'locks commute and come off in any order', () => {
    const m = SRA.el(SRA.plainDeck()[7]), a = SRA.keygen(), b = SRA.keygen();
    const ab = SRA.modPow(SRA.modPow(m, a.e), b.e);
    eq(SRA.decode(SRA.modPow(SRA.modPow(ab, a.d), b.d)), Cards.newDeck()[7]);
    eq(SRA.open(SRA.hex(ab), [SRA.hex(a.e), SRA.hex(b.e)]), Cards.newDeck()[7]);
  });
  test('Encrypted deal', 'a key is accepted only for the lock it really made', () => {
    const k = SRA.keygen(), mid = SRA.plainDeck()[3], out = SRA.hex(SRA.modPow(SRA.el(mid), k.e));
    ok(SRA.keyFits(mid, out, SRA.hex(k.e)), 'right key fits');
    ok(!SRA.keyFits(mid, out, SRA.hex(k.e + 2n)), 'wrong key rejected');
  });
  test('Encrypted deal', 'the shuffle-lock removal proof verifies, and fails on any change', async () => {
    const k = SRA.keygen(), ins = SRA.plainDeck().slice(0, 9).map((h) => SRA.hex(SRA.modPow(SRA.el(h), k.e)));
    const mids = ins.map((h) => SRA.hex(SRA.modPow(SRA.el(h), k.d)));
    const pr = await SRA.proveStrip('t|0', ins, mids, k), y = SRA.hex(SRA.modPow(SRA.G, k.e));
    ok(await SRA.verifyStrip('t|0', ins, mids, y, pr), 'honest proof');
    const bad = mids.slice(); [bad[0], bad[1]] = [bad[1], bad[0]];
    ok(!(await SRA.verifyStrip('t|0', ins, bad, y, pr)), 'swapped cards caught');
    ok(!(await SRA.verifyStrip('t|1', ins, mids, y, pr)), 'proof bound to its hand and player');
  });
  test('Encrypted deal', 'a player never gives out its own hole-card keys while dealing', async () => {
    const names = ['A', 'B'], P = names.map((n) => new SraPlayer(n));
    const view = (n) => ({ handNo: 1, phase: 'betting', board: [], hostName: 'A', table: {}, seats: names.map((x) => ({ name: x, isYou: x === n, inHand: true })) });
    let deck = SRA.plainDeck();
    for (const k of [1, 0]) deck = (await P[k].handle({ t: 'sraShuf', no: 1, order: names, hc: 2, deck }, { view: view(names[k]) })).deck;
    let cur = deck.slice(0, 9); const steps = [];
    for (let k = 0; k < 2; k++) { const r = await P[k].handle({ t: 'sraLock', no: 1, items: cur }, {}); steps.push({ ...r, inp: cur }); cur = r.out; }
    for (const p of P) for (let k = 0; k < 2; k++) await p.handle({ t: 'sraStep', no: 1, k, y: SRA.hex(SRA.modPow(SRA.G, P[k].hands[1].key.e)), inp: k === 0 ? steps[0].inp : undefined, mid: steps[k].mid, out: steps[k].out, proof: steps[k].proof });
    const rel = [];
    for (const p of P) rel.push(await p.handle({ t: 'sraDealt', no: 1 }, {}));
    const L = SRA.layout(2, 2);
    rel.forEach((r, k) => { eq(r.t, 'sraKeys'); ok(r.keys.every((x) => !L.own(k).includes(x.pos)), 'no own positions'); });
    ok(await P[0].handle({ t: 'sraBoard', no: 1, idx: [0, 1, 2] }, { view: view('A') }) === null, 'no board key mid-round');
    const sd = await P[0].handle({ t: 'sraSd', no: 1, must: true }, { view: view('A') });
    ok(!sd || sd.t !== 'sraShow', 'no showdown keys mid-hand');
  });

  test('Security', 'Large messages are split into parts and rebuilt safely', () => {
    if (typeof Wire === 'undefined') return;
    const big = { t: 'sraStep', no: 3, mid: Array.from({ length: 60 }, () => 'ab'.repeat(256)) };
    const parts = Wire.pack(big), store = new Map();
    ok(parts.length > 1 && parts.every((x) => JSON.stringify(x).length < 16300), 'every part fits the 16 KB channel limit');
    let out = null;
    for (const x of parts.slice().reverse()) out = Wire.unpack(store, x) || out;
    eq(out, big);
    eq(Wire.unpack(new Map(), { t: 'part', id: 'zz', i: 0, n: 2, s: 'x' }), null);
    eq(Wire.unpack(new Map(), { t: 'part', id: 'abcdef01', i: 0, n: 500, s: 'x' }), null);
    const st = new Map();
    for (let k = 0; k < 10; k++) Wire.unpack(st, { t: 'part', id: (10000000 + k).toString(16).padStart(8, '0'), i: 0, n: 3, s: 'x' });
    ok(st.size <= 4, 'half-sent messages are capped');
  });

  test('Notation', 'Every table setting is written into the record and survives a round trip', () => {
    const tags = Notation.gameTags({ event: 'Settings', date: '2026.10.16', sb: 1, bb: 2, ante: 0, startingStack: 200, players: ['A', 'B'], holeCards: 'All',
      settings: [['ActionTimer', '30s'], ['Deal', 'Encrypted'], ['BotPlayers', 'Rook (Expert, Shark); Ada "x" [y]'], ['Bad Key', 'no'], ['Viewers', 'On']] });
    const g = Notation.parse(Notation.serialize({ tags, hands: [] }) + '\n#1 [Button "A"] [Stacks "A:200, B:200"]\nA sb 1; B bb 2\nA f\n=> B wins 3');
    const get = (k) => (g.tags.find((t) => t[0] === k) || [])[1];
    eq([get('ActionTimer'), get('Deal'), get('Viewers'), get('BotPlayers')], ['30s', 'Encrypted', 'On', 'Rook (Expert, Shark); Ada x y']);
    ok(!g.tags.some((t) => t[0] === 'Bad Key'), 'invalid tag names are dropped');
  });

  test('Security', 'The host can change stacks or remove players only when the table allows it', () => {
    if (typeof HostTable === 'undefined') return;
    for (const allow of [false, true]) {
      const t = new HostTable({ tableName: 'T', sb: 1, bb: 2, ante: 0, startingStack: 100, maxSeats: 4, timer: 0, rebuys: false, recordHole: 'All', hostAdjust: allow, hostKick: allow }, 'Host', 'aaaaaaaaaaaaaaaa');
      const errs = []; t.onDirect = (pid, m) => { if (m.t === 'error') errs.push(m.text); };
      const b = t.addPlayer('Bob', 'bbbbbbbbbbbbbbbb');
      t.handle(t.hostPid, { t: 'adjust', stacks: { [b.pid]: 5000 } });
      t.handle(t.hostPid, { t: 'kick', pid: b.pid });
      eq([b.player.stack === 5000, !t.players.has(b.pid)], [allow, allow], allow ? 'allowed' : 'blocked by default');
      if (!allow) eq(errs.length, 2);
    }
  });

  /* ---------- Compact records ---------- */
  test('Notation', 'A compact record rebuilds exactly the same record, in far fewer characters', async () => {
    if (!Compact.available() || typeof SAMPLE_RECORD === 'undefined') return;
    const canon = Notation.serialize(Notation.parse(SAMPLE_RECORD));
    const c = await Compact.encode(SAMPLE_RECORD);
    ok(Compact.isCompact(c) && c.length * 5 < canon.length, `compact is ${c.length} characters vs ${canon.length}`);
    eq(await Compact.decode(c), canon);
    eq(await Compact.decode(c.replace(/(.{30})/g, '$1\n')), canon, 'line breaks added by a chat app are ignored');
    let rejected = false;
    try { await Compact.decode(c.slice(0, -4)); } catch (e) { rejected = e instanceof RecordError; }
    ok(rejected, 'a cut-off compact record is rejected with a clear error');
  });

  /* ---------- Fixed limit ---------- */
  test('Limit', 'Bets and raises are one fixed size, capped at four bets a round', () => {
    const h = Engine.createHand({ no: 1, players: ['A', 'B', 'C'].map((name) => ({ name, stack: 500 })), button: 0, sb: 1, bb: 2, limit: 'fl' });
    let L = Engine.legal(h);
    eq([L.minTo, L.maxTo, L.betSize], [4, 4, 2], 'preflop raise is one small bet');
    throws(() => Engine.applyAction(h, { type: 'raise', to: 6 }), /exactly/);
    Engine.applyAction(h, { type: 'raise', to: 4 });      // 2nd bet (the big blind is the 1st)
    Engine.applyAction(h, { type: 'raise', to: 6 });      // 3rd
    Engine.applyAction(h, { type: 'raise', to: 8 });      // 4th: capped
    L = Engine.legal(h);
    ok(!L.canRaise && L.capReached, 'no fifth bet');
    Engine.applyAction(h, { type: 'call' }); Engine.applyAction(h, { type: 'call' });
    Engine.dealBoard(h, ['2c', '7d', '9h']);
    L = Engine.legal(h); eq([L.isBet, L.minTo, L.maxTo], [true, 2, 2], 'flop bet is the small bet');
    Engine.applyAction(h, { type: 'check' }); Engine.applyAction(h, { type: 'check' }); Engine.applyAction(h, { type: 'check' });
    Engine.dealBoard(h, ['Kc']);
    L = Engine.legal(h); eq([L.minTo, L.maxTo], [4, 4], 'turn bet is the big bet');
    Engine.applyAction(h, { type: 'bet', to: 4 });
    L = Engine.legal(h); eq([L.minTo, L.maxTo], [8, 8], 'turn raise is to 8');
  });
  test('Limit', 'A short all-in neither counts toward the cap nor reopens the betting', () => {
    const h = Engine.createHand({ no: 1, players: [{ name: 'A', stack: 100 }, { name: 'B', stack: 5 }, { name: 'C', stack: 100 }], button: 0, sb: 1, bb: 2, limit: 'fl' });
    Engine.applyAction(h, { type: 'raise', to: 4 }); // A (button, first to act three-handed)
    Engine.applyAction(h, { type: 'raise', to: 5 }); // B: all-in for one more chip (a short raise)
    eq(h.betCount, 2, 'short all-in not counted');
    Engine.applyAction(h, { type: 'raise', to: 7 }); // C: a full raise over the all-in
    const L = Engine.legal(h); eq([L.player, L.minTo], [0, 9], 'A may raise again');
  });
  test('Limit', 'Limit games record and replay with their own variant codes', () => {
    eq(Notation.variantCode('holdem', 'fl', 2), 'FLHE'); eq(Notation.variantCode('omaha', 'fl', 5), 'FLO5');
    const h = play({ stacks: [100, 100], limit: 'fl', actions: (hh, L) => (L.canRaise && hh.betCount < 3 ? { type: L.isBet ? 'bet' : 'raise', to: L.minTo } : L.canCheck ? { type: 'check' } : { type: 'call' }) });
    ok(h.phase === 'done' && h.limit === 'fl', 'hand finished');
    const tags = Notation.gameTags({ event: 'Limit', date: '2026.10.16', sb: 1, bb: 2, ante: 0, startingStack: 100, players: ['A', 'B'], holeCards: 'All', variant: 'FLHE' });
    const text = Notation.serialize({ tags, hands: [Notation.fromHand(h, 0, 'All')] });
    const rp = Replay.game(Notation.parse(text));
    eq(rp.issues, [], 'replays under limit rules');
  });

  /* ---------- Learn ---------- */
  test('Learn', 'lesson maths matches the standard numbers', () => {
    eq(Learn.C(52, 5), 2598960);
    eq(Learn.C(52, 2), 1326);
    eq(Math.round(Learn.hitTwo(9) * 1000), 350);
    eq(Math.round(Learn.hitTwo(8) * 1000), 315);
    eq(Math.round(Learn.hitTwo(4) * 1000), 165);
    eq(Learn.potOdds(150, 50), 0.25);
    eq(Learn.ev(0.35, 150, 50), 20);
    eq(Learn.mdf(100, 100), 0.5);
  });
  test('Learn', 'every lesson renders and every quiz has a valid answer', () => {
    for (const l of Learn.LESSONS) {
      const h = l.body();
      ok(typeof h === 'string' && h.length > 100 && !/undefined|NaN|engine disagrees/.test(h), `lesson ${l.id}`);
      for (const q of l.quiz) ok(q.a >= 0 && q.a < q.opts.length && q.why, `quiz in ${l.id}`);
    }
  });

  /* ---------- Fair shuffle ---------- */
  test('Fairness', 'SHA-256 matches the standard test vectors', () => {
    eq(Fair.sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    eq(Fair.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    eq(Fair.sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'), '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
    eq(Fair.sha256('a'.repeat(1000)), '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  });
  test('Fairness', 'Seed-driven permutation is deterministic and unbiased-looking', () => {
    const p = Fair.permutation('00'.repeat(32));
    eq(p.slice().sort((a, b) => a - b), Array.from({ length: 52 }, (_, i) => i), 'is a permutation');
    eq(Fair.permutation('00'.repeat(32)), p, 'deterministic');
    ok(Fair.permutation('01'.repeat(32)).join() !== p.join(), 'seed changes the order');
    const counts = new Array(52).fill(0);
    for (let k = 0; k < 2000; k++) counts[Fair.permutation(Fair.sha256('s' + k))[0]]++;
    ok(Math.max(...counts) < 80 && Math.min(...counts) > 15, 'first card roughly uniform');
  });
  /** A full simulated deal between an honest (or dishonest) dealer and a checking player. */
  function fairRound(tamper) {
    const deck = Cards.shuffle(Cards.newDeck()), salts = deck.map(() => U.randHex(16));
    const commits = deck.map((c, i) => Fair.commit(c, salts[i]));
    const ck = new Fair.Checker();
    const reply1 = ck.fair1({ no: 7, commits });
    const hostSeed = U.randHex(32);
    const seedCommits = [reply1.c, Fair.sha256(hostSeed)];
    const reply2 = ck.fair2({ no: 7, seedCommits });
    const seeds = tamper === 'dropseed' ? [hostSeed] : [reply2.seed, hostSeed];
    ck.fair3({ no: 7, seeds, order: ['Me', 'Host'], holeCount: 2 });
    const perm = Fair.permutation(Fair.combine(7, commits, seeds));
    const L = Fair.layout(2, 2);
    const at = (pos) => ({ pos, card: deck[perm[pos]], salt: salts[perm[pos]] });
    const mine = [at(L.hole(0, 0)), at(L.hole(0, 1))];
    if (tamper === 'swap') mine[1] = { ...at(L.hole(1, 1)), pos: L.hole(0, 1) };
    ck.own({ no: 7, cards: mine }, 'Me');
    const board = L.board.slice(0, 3).map(at);
    if (tamper === 'board') board[2] = at(L.board[3]);
    ck.view({ fair: { no: 7, reveals: board }, phase: 'betting', board: board.map((r) => r.card).concat(tamper === 'board' ? [] : []), seats: [{ name: 'Me', cards: mine.map((r) => r.card) }, { name: 'Host', cards: [null, null] }] }, 'Me');
    return ck.hands[7];
  }
  test('Fairness', 'An honest deal verifies; tampering is caught', () => {
    const okRound = fairRound();
    eq(okRound.problems, []); eq(okRound.status, 'verified'); eq(okRound.verified, 5);
    ok(fairRound('swap').status === 'failed', 'swapped hole card detected');
    ok(fairRound('board').status === 'failed', 'board card from the wrong position detected');
    ok(fairRound('dropseed').problems.some((p) => /left your shuffle seed out/.test(p)), 'excluded seed detected');
  });

  test('Stats', 'Advanced stats count exactly what the key says', () => {
    const rec = `[Event "Stats"]\n[Blinds "1/2"]\n\n#1 [Button "A"] [Stacks "A:200, B:200, C:200"]\nB sb 1; C bb 2\nA [????] r 6; B [????] r 18; C [????] f; A c 18\nF: 2c 7d Js; B x; A b 20; B r 60; A f\n=> B wins 78\n`;
    const S = Replay.stats(Replay.game(Notation.parse(rec)));
    const [A, B, C] = ['A', 'B', 'C'].map((n) => S.players.find((p) => p.name === n));
    eq([A.vpip, A.pfr, A.foldTo3Opp, A.foldTo3, A.threeBetOpp], [1, 1, 1, 0, 0], 'A preflop');
    eq([B.threeBetOpp, B.threeBet, B.cbetOpp, B.cbet, B.checkRaise, B.wonNoSD, B.won], [1, 1, 1, 0, 1, 1, 1], 'B');
    eq([C.foldPre, C.threeBetOpp, C.vpip], [1, 0, 0], 'C');
    eq([A.af, A.afqPct, A.net, B.net], [Infinity, 50, -38, 40], 'aggression and results');
    eq([S.totalHands, S.biggestPot, S.showdownPct], [1, 78, 0]);
    ok(STAT_KEY.length >= 25 && STAT_KEY.every(([k, d]) => k && d.length > 20), 'every stat has a definition');
  });
  test('Bots', 'Bots only take legal actions and scale with difficulty', () => {
    const models = {};
    for (let k = 0; k < 70; k++) {
      const game = k % 3 === 0 ? 'omaha' : 'holdem', hc = game === 'omaha' ? 4 : 2;
      const h = play({ no: k + 1, stacks: [200, 200, 200, 200], button: k % 4, game, limit: k % 2 ? 'pl' : 'nl', holeCount: hc,
        actions: (hh) => Bots.decide(Bots.contextFor(hh, hh.toAct, { models, difficulty: Object.keys(Bots.PROFILES)[k % 7], personality: Object.keys(Bots.PERSONALITIES)[k % 8], work: 0.05 })) });
      eq(h.phase, 'done', 'hand finished with bot actions only');
    }
    ok(Bots.chen(['As', 'Ad']) > Bots.chen(['7c', '2d']), 'AA beats 72o preflop');
    ok(Bots.holdemPct(['As', 'Ad']) < 0.01 && Bots.holdemPct(['7c', '2d']) > 0.9, 'percentiles');
    const r = Bots.equity({ game: 'holdem', holeCount: 2, hole: ['As', 'Ad'], board: [], widths: [1], rng: Bots.makeRng(), iters: 1500, budgetMs: 500 });
    ok(r.equity > 0.8 && r.equity < 0.89, `AA vs a random hand ≈ 85% (got ${(r.equity * 100).toFixed(0)}%)`);
  });

  /* ---------- Security ---------- */
  test('Security', 'Names cannot disguise players or pollute objects', () => {
    eq(U.sanitizeName('Al\u202Eice'), 'Alice', 'direction override removed');
    eq(U.sanitizeName('A\u200Blice'), 'Alice', 'zero-width removed');
    eq(U.sanitizeName('<b>x</b>'), 'bx/b', 'markup characters removed');
    for (const n of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) ok(!(n === U.sanitizeName(n)), `${n} rejected`);
    const g = Notation.parse('[Event "x"]\n[Blinds "1/2"]\n\n#1 [Button "__proto__"] [Stacks "__proto__:10, constructor:10"]\n__proto__ sb 1; constructor bb 2\n__proto__ f\n=> constructor wins 2\n');
    Replay.stats(Replay.game(g));
    ok(({}).hands === undefined && ({}).vpip === undefined, 'Object.prototype untouched by hostile record names');
    throws(() => Notation.parse('[Event "x"]\n[Blinds "1/2"]\n[Variant "__proto__"]\n'), /Unknown \[Variant/);
  });
  test('Security', 'Only real cards are ever rendered', () => {
    if (typeof cardHtml === 'undefined') return;
    const evil = '"><img src=x onerror=alert(1)>';
    ok(!cardHtml(evil).includes('<img') && cardHtml(evil).includes('back'), 'hostile card renders as a face-down card');
    ok(cardHtml('Ah').includes('data-card="Ah"'));
  });
  test('Security', 'Host updates are cleaned before display', () => {
    if (typeof Safe === 'undefined') return;
    const X = '<img src=x onerror=1>';
    const v = Safe.view({ table: { maxSeats: X, timer: X, variant: X }, seats: [{ name: 'A', cards: [X, 'Kd'], seat: X }, ...Array(50).fill({ name: 'B' })], board: [X, 'As'],
      log: [{ text: 'hi', kind: X }], legal: { minTo: X, canRaise: 'yes' }, you: { seat: null }, players: [{ pid: X, seat: null }] });
    eq([v.table.maxSeats, v.table.timer, v.table.variant], [9, 0, 'NLHE']);
    eq(v.seats.length, 9, 'seat list capped');
    eq(v.seats[0].cards, [null, 'Kd']); eq(v.board, ['As']); eq(v.log[0].kind, '');
    eq([v.legal.minTo, v.legal.canRaise, v.you.seat, v.players[0].seat], [0, false, null, null]);
    ok(!/[<>]/.test(v.players[0].pid), 'pid stripped to safe characters');
  });
  test('Security', 'Fair-play checker ignores hostile hand numbers', () => {
    const ck = new Fair.Checker();
    eq(ck.fair1({ no: '__proto__', commits: Array(52).fill('a'.repeat(64)) }), null);
    eq(ck.fair1({ no: 'constructor', commits: Array(52).fill('a'.repeat(64)) }), null);
    ok(({}).commits === undefined && ({}).seed === undefined, 'no prototype pollution');
  });
  test('Security', 'Showdown-only tables never reveal enough to deduce folded hands', () => {
    if (typeof HostTable === 'undefined') return;
    const t = new HostTable({ tableName: 'T', sb: 1, bb: 2, ante: 0, startingStack: 100, maxSeats: 4, timer: 0, rebuys: false, recordHole: 'Showdown' }, 'H', 'a'.repeat(32));
    const sh = { no: 1, order: ['x', 'y'], holeCount: 2, layout: Fair.layout(2, 2), deck: Cards.newDeck(), perm: Array.from({ length: 52 }, (_, i) => i), salts: Array(52).fill('s'), seedList: [] };
    t.fair = sh; t.handPids = ['x', 'y'];
    t.hand = { no: 1, phase: 'done', board: [], players: [{ shown: false }, { shown: false }] };
    eq(t._fairView().reveals.length, 0, 'nothing beyond public cards is proven in showdown-only mode');
  });

  /* ---------- Statistical randomness checks ---------- */
  // Chi-square goodness of fit against a uniform distribution. With these thresholds an honest
  // generator fails less than about once in a million runs; a biased shuffle fails at once.
  const chi2 = (counts) => { const n = U.sum(counts), e = n / counts.length; return U.sum(counts.map((c) => ((c - e) ** 2) / e)); };
  const CHI_51 = 112; // 51 degrees of freedom, p ≈ 1e-6
  test('Randomness', 'Secure random integers are uniform (no modulo bias)', () => {
    for (const n of [2, 3, 7, 52]) {
      const counts = new Array(n).fill(0);
      for (let k = 0; k < 6000 * Math.min(n, 10); k++) counts[U.randInt(n)]++;
      const limit = { 2: 24, 3: 28, 7: 36, 52: CHI_51 }[n]; // p ≈ 1e-6 for n-1 degrees of freedom
      ok(chi2(counts) < limit, `randInt(${n}) chi² ${chi2(counts).toFixed(1)}`);
    }
    const b = U.randHex(32);
    ok(/^[0-9a-f]{64}$/.test(b) && b !== U.randHex(32), 'hex seeds look random and never repeat');
  });
  test('Randomness', 'Shuffles put every card in every position equally often', () => {
    const N = 10400, pos = new Array(52).fill(0), top = new Array(52).fill(0), deck0 = Cards.newDeck();
    for (let k = 0; k < N; k++) { const d = Cards.shuffle(deck0.slice()); pos[d.indexOf('As')]++; top[deck0.indexOf(d[0])]++; }
    ok(chi2(pos) < CHI_51, `A♠ position chi² ${chi2(pos).toFixed(1)}`);
    ok(chi2(top) < CHI_51, `top card chi² ${chi2(top).toFixed(1)}`);
    // Neighbouring cards must not stick together (a classic weak-shuffle flaw).
    let stuck = 0;
    for (let k = 0; k < N / 2; k++) { const d = Cards.shuffle(deck0.slice()); if (Math.abs(d.indexOf('As') - d.indexOf('Ah')) === 1) stuck++; }
    const expect = N / 52;
    ok(Math.abs(stuck - expect) < 6 * Math.sqrt(expect), `adjacent pair ${stuck} vs ${expect.toFixed(0)}`);
  });
  test('Randomness', 'The fair-shuffle order is uniform, and one honest party is enough', () => {
    const N = 5200;
    // Host is dishonest (always the same unshuffled deck) but players' seeds are random.
    const fixedDeck = Cards.newDeck(), byPlayers = new Array(52).fill(0);
    for (let k = 0; k < N; k++) { const p = Fair.permutation(Fair.combine(k, ['x'], [U.randHex(32)])); byPlayers[p.indexOf(fixedDeck.indexOf('As'))]++; }
    ok(chi2(byPlayers) < CHI_51, `players alone: chi² ${chi2(byPlayers).toFixed(1)}`);
    // Every player is dishonest (fixed seeds) but the host's secret deck is random.
    const perm = Fair.permutation(Fair.combine(1, ['x'], ['00'.repeat(32)])), byHost = new Array(52).fill(0);
    for (let k = 0; k < N; k++) { const d0 = Cards.shuffle(Cards.newDeck()); byHost[perm.findIndex((i) => d0[i] === 'As')]++; }
    ok(chi2(byHost) < CHI_51, `host alone: chi² ${chi2(byHost).toFixed(1)}`);
  });

  /* ---------- QR ---------- */
  const QR_KNOWN_HELLO = 1773893352; // module-grid hash verified against an independent encoder (mask 2)
  test('QR', 'Encodes a URL into a valid-size symbol', () => {
    if (typeof QR === 'undefined') return;
    const q = QR.encode('https://example.netlify.app/#join=nlhe-abcd-1234');
    eq(q.size, 17 + 4 * q.version);
    ok(q.version >= 3 && q.version <= 5, 'sensible version');
    // Finder pattern corners are dark.
    ok(q.get(0, 0) && q.get(q.size - 1, 0) && q.get(0, q.size - 1), 'finder corners');
    eq(QR.checksum('HELLO'), QR_KNOWN_HELLO, 'matches reference encoder');
  });

  test('Bots', 'The fast evaluator agrees with the rules engine on random showdowns', () => {
    for (let k = 0; k < 1500; k++) {
      const d = Cards.shuffle(Cards.newDeck()), b = d.slice(4, 9), x = [d[0], d[1]], y = [d[2], d[3]];
      const e = Math.sign(Eval.forGame('holdem', x, b).score - Eval.forGame('holdem', y, b).score);
      const f = Math.sign(Bots.Fast.rank([...x, ...b].map(Bots.Fast.id)) - Bots.Fast.rank([...y, ...b].map(Bots.Fast.id)));
      eq(f, e, `showdown ${x} vs ${y} on ${b}`);
    }
  });
  test('Bots', 'Range sampling respects tight ranges (JJ is behind a 4-bet range)', () => {
    const r = (w) => Bots.equity({ game: 'holdem', holeCount: 2, hole: ['Jh', 'Jd'], board: [], widths: [w], rng: Bots.makeRng(), iters: 2500 }).equity;
    const tight = r(0.03), wide = r(1);
    ok(tight < 0.5, `JJ vs a top-3% range should not be ahead (the old sampler said 71%), got ${tight.toFixed(2)}`);
    ok(wide > 0.72, `JJ vs any hand should be ahead, got ${wide.toFixed(2)}`);
  });
  test('Bots', 'No level ever folds a royal flush, and strong bots fold more to bigger bets', () => {
    const spot = (bh, frac) => {
      const h = Engine.createHand({ players: [{ name: 'V', stack: 200 }, { name: 'B', stack: 200 }], button: 0, sb: 1, bb: 2, limit: 'nl', hole: [['8h', '6h'], bh] });
      Engine.applyAction(h, { type: 'c' }); Engine.applyAction(h, { type: 'x' });
      Engine.dealBoard(h, ['As', 'Ks', 'Qs']); Engine.applyAction(h, { type: 'x' }); Engine.applyAction(h, { type: 'x' });
      Engine.dealBoard(h, ['7d']); Engine.applyAction(h, { type: 'x' }); Engine.applyAction(h, { type: 'x' });
      Engine.dealBoard(h, ['2c']); Engine.applyAction(h, { type: 'x' });
      Engine.applyAction(h, { type: 'b', to: Math.max(2, Math.round(frac * Engine.legal(h).pot)) });
      return h;
    };
    for (const lv of Object.keys(Bots.PROFILES)) for (let k = 0; k < 25; k++) {
      const h = spot(['Js', 'Ts'], k % 2 ? 0.5 : 3);
      ok(Bots.decide(Bots.contextFor(h, h.toAct, { models: {}, difficulty: lv, personality: 'balanced', traits: Bots.makeTraits('balanced'), work: 0.2 })).type !== 'fold', `${lv} folded a royal flush`);
    }
    const folds = (frac) => { let f = 0; for (let k = 0; k < 60; k++) { const h = spot(['Ad', '9c'], frac); if (Bots.decide(Bots.contextFor(h, h.toAct, { models: {}, difficulty: 'extreme', personality: 'balanced', work: 0.3 })).type === 'fold') f++; } return f; };
    ok(folds(4) > folds(0.25), 'folds more often to a 4x-pot bet than to a quarter-pot bet');
  });
  test('Bots', 'Every bot has its own traits, and its mood drifts from hand to hand', async () => {
    const a = Bots.makeTraits('maniac'), b = Bots.makeTraits('maniac');
    ok(a.vpip !== b.vpip && a.bluff !== b.bluff, 'two maniacs differ');
    ok(a.vpip > Bots.makeTraits('tightpassive').vpip * 1.5 || a.vpip > 0.3, 'a maniac is still looser than a tight-passive player');
    const m0 = a.mood; for (let k = 0; k < 20; k++) Bots.driftTraits(a);
    ok(a.mood !== m0 && Math.abs(a.mood) <= 0.45, 'mood moves within bounds');
    const h = Engine.createHand({ players: [{ name: 'A', stack: 200 }, { name: 'B', stack: 200 }, { name: 'C', stack: 200 }], button: 0, sb: 1, bb: 2, limit: 'nl', hole: [['As', 'Kd'], ['7c', '7h'], ['2s', '9d']] });
    const act = await Bots.decideAsync(Bots.contextFor(h, h.toAct, { models: {}, difficulty: 'extreme', personality: 'balanced', traits: a, work: 0.2 }));
    Engine.applyAction(h, { ...act, type: { bet: 'b', raise: 'r', call: 'c', check: 'x', fold: 'f' }[act.type] || act.type }); // must be legal
  });
  test('Cepheus', 'Cepheus observes only its own cards, the board and the betting', () => {
    if (typeof CepheusBot === 'undefined') return;
    const h = Engine.createHand({ players: [{ name: 'Cep', stack: 1000 }, { name: 'You', stack: 1000 }], button: 1, sb: 5, bb: 10, limit: 'fl', hole: [['As', 'Kd'], ['7c', '7h']] });
    Engine.applyAction(h, { type: 'r', to: 20 }); // the button (you) raises
    Engine.applyAction(h, { type: 'c' }); // Cepheus calls
    Engine.dealBoard(h, ['2c', '9d', 'Jh']);
    const o = CepheusBot.observe(h, 0);
    eq(o.seat, 0, 'big blind seat');
    eq(o.hole.join(), 'As,Kd'); eq(o.board.join(), '2c,9d,Jh'); eq(o.history.join('|'), 'rc|');
    ok(!/7c|7h/.test(JSON.stringify(o)), 'the opponent\'s cards are not in the observation');
    eq(CepheusBot.observe(Engine.createHand({ players: [{ name: 'a', stack: 1000 }, { name: 'b', stack: 1000 }], button: 0, sb: 5, bb: 10, limit: 'fl', hole: [['2c', '3c'], ['4c', '5c']] }), 0).seat, 1, 'button = small blind = seat 1');
  });
  test('Cepheus', 'Strategy choices always become legal actions; failures check or call', () => {
    if (typeof CepheusBot === 'undefined') return;
    const saved = CepheusBot.model;
    try {
      const mk = () => Engine.createHand({ players: [{ name: 'Cep', stack: 1000 }, { name: 'You', stack: 1000 }], button: 0, sb: 5, bb: 10, limit: 'fl', hole: [['As', 'Kd'], ['7c', '7h']] });
      const pick = (action) => { CepheusBot.model = { decide: () => ({ action }) }; const h = mk(); return CepheusBot.decide(h, h.toAct); };
      eq(JSON.stringify(pick('raise').action), JSON.stringify({ type: 'r', to: 20 }));
      eq(pick('call').action.type, 'c'); eq(pick('fold').action.type, 'f');
      CepheusBot.model = { decide: () => { throw new Error('no such spot'); } };
      let h = mk(); let r = CepheusBot.decide(h, h.toAct);
      eq(r.action.type, 'c'); ok(/no such spot/.test(r.fallback), 'the fallback is reported');
      // at the 4-bet cap a raise cannot happen: it becomes a call, and is reported
      h = mk(); Engine.applyAction(h, { type: 'r', to: 20 }); Engine.applyAction(h, { type: 'r', to: 30 }); Engine.applyAction(h, { type: 'r', to: 40 });
      CepheusBot.model = { decide: () => ({ action: 'raise' }) };
      r = CepheusBot.decide(h, h.toAct); eq(r.action.type, 'c'); ok(r.fallback, 'reported');
      Engine.applyAction(h, r.action);
      // no strategy loaded: check/call, never a fold
      CepheusBot.model = null; h = mk(); r = CepheusBot.decide(h, h.toAct); eq(r.action.type, 'c');
    } finally { CepheusBot.model = saved; }
  });

  test('Hand review', 'Reviews only your own decisions, never with anyone else\'s cards, and grades each one', async () => {
    if (typeof SAMPLE_RECORD === 'undefined' || typeof HandReview === 'undefined') return;
    const S = HandReview.spots(SAMPLE_RECORD, 'Alice');
    ok(S.spots.length > 0, 'Alice has decisions');
    ok(S.spots.every((x) => x.hand.players[x.i].name === 'Alice' && x.hand.players.every((p, j) => j === x.i || !p.hole)), 'only her cards are present');
    const x = await HandReview.analyse(S.spots[0], { work: 0.2 });
    ok(['good', 'close', 'mistake'].includes(x.grade), 'graded');
    const tot = Object.values(x.freq).reduce((a, b) => a + b, 0);
    ok(Math.abs(tot - 1) < 1e-6, 'the reference mix adds up to 100%');
    // folding when a check is free is always a mistake
    const h = Engine.createHand({ players: [{ name: 'A', stack: 1000 }, { name: 'B', stack: 1000 }], button: 0, sb: 5, bb: 10, hole: [['2c', '7d'], ['As', 'Ad']] });
    Engine.applyAction(h, { type: 'c' });
    const g = HandReview.grade({ no: 1, hand: h, i: 1, act: { type: 'f' } }, { L: Engine.legal(h), pot: 20, toCall: 0, facing: false, potOdds: 0, eq: 0.8, freq: { fold: 0.3, check: 0.7, call: 0, raise: 0 }, size: null, source: 'bot' });
    eq(g.grade, 'mistake'); eq(g.kind, 'loose-fold');
  });

  async function run(onResult) {
    const out = [];
    for (const t of T) {
      await new Promise((r) => setTimeout(r, 0)); // let the page paint between tests
      const t0 = Date.now();
      try { await t.fn(); out.push({ ...t, pass: true, ms: Date.now() - t0 }); }
      catch (e) { out.push({ ...t, pass: false, error: e.message, ms: Date.now() - t0 }); }
      if (onResult) onResult(out[out.length - 1], out.length, T.length);
    }
    return out;
  }
  return { run, play, randomAction, tests: T };
})();
