// Six identical bots at one table: what kind of game do they produce?
const { Bots, Engine, Cards, Eval } = require('./run_tests.js');
const [lv, pers, HANDS, limit] = [process.argv[2], process.argv[3], +(process.argv[4] || 200), process.argv[5] || 'nl'];
const names = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
const S = { hands: 0, preflopEnd: 0, walks: 0, showdown: 0, allin: 0, pot: 0, vpip: 0, pfr: 0, seats: 0, threeBet: 0, limps: 0, riverBets: { value: [], bluff: [], protect: [] }, postBets: { value: [], bluff: [], protect: [] }, foldToCbet: [0, 0], ms: 0, decisions: 0, maxPreRaises: 0 };
const hist = []; const TR = Object.fromEntries(names.map((n) => [n, process.env.NOTRAITS ? null : Bots.makeTraits(pers)]));
for (let k = 0; k < HANDS; k++) {
  const deck = Cards.shuffle(Cards.newDeck());
  const h = Engine.createHand({ no: k + 1, players: names.map((name) => ({ name, stack: 200 })), button: k % 6, sb: 1, bb: 2, game: 'holdem', limit, hole: names.map(() => [deck.pop(), deck.pop()]) });
  const models = Bots.buildModels(hist.slice(-80)); for (const n of names) Bots.driftTraits(TR[n]);
  let preRaises = 0, cbetStreet = -1, cbettor = -1, pfrIdx = -1;
  const vp = new Set(), pr = new Set();
  for (let g = 0; g < 500 && h.phase !== 'done'; g++) {
    if (h.phase === 'betting') {
      const i = h.toAct, L = Engine.legal(h), t0 = Date.now();
      const a = Bots.decide(Bots.contextFor(h, i, { models, difficulty: lv, personality: pers, traits: TR[h.players[i].name] }));
      S.ms += Date.now() - t0; S.decisions++;
      const type = { bet: 'b', raise: 'r', call: 'c', check: 'x', fold: 'f' }[a.type] || a.type;
      if (h.street === 0) {
        if (type === 'c' || type === 'r' || type === 'b') vp.add(i);
        if (type === 'r' || type === 'b') { pr.add(i); preRaises++; if (preRaises === 2) S.threeBet++; pfrIdx = i; }
        if (type === 'c' && preRaises === 0) S.limps++;
      } else {
        if ((type === 'b' || type === 'r') && a.meta && a.meta.kind) {
          const frac = (a.to - L.callTo) / Math.max(1, L.pot);
          S.postBets[a.meta.kind].push(frac);
          if (h.street === 3) S.riverBets[a.meta.kind].push(frac);
        }
        if (h.street === 1 && type === 'b' && i === pfrIdx && cbettor < 0) { cbettor = i; cbetStreet = 1; }
        else if (cbettor >= 0 && h.street === cbetStreet && i !== cbettor && L.toCall > 0) { S.foldToCbet[1]++; if (type === 'f') S.foldToCbet[0]++; }
      }
      Engine.applyAction(h, { ...a, type });
    } else if (h.phase === 'deal') { const cs = []; for (let j = 0; j < h.pendingDeal; j++) cs.push(deck.pop()); Engine.dealBoard(h, cs); }
    else if (h.phase === 'showdown') { S.showdown++; Engine.settle(h, Engine.planShowdown(h, () => true)); }
    else Engine.settle(h);
  }
  S.maxPreRaises = Math.max(S.maxPreRaises, preRaises);
  S.hands++; S.vpip += vp.size; S.pfr += pr.size; S.seats += 6;
  if (h.street === 0) S.preflopEnd++;
  if (h.street === 0 && vp.size === 0) S.walks++;
  if (h.players.some((p) => p.allIn)) S.allin++;
  S.pot += h.players.reduce((a, p) => a + p.committed, 0);
  hist.push(h);
}
const avg = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '-';
const pc = (x) => Math.round(100 * x) + '%';
const pb = S.postBets, nb = pb.value.length + pb.bluff.length + pb.protect.length;
console.log(`${lv}/${pers}${limit !== 'nl' ? '/' + limit : ''}: VPIP ${pc(S.vpip / S.seats)} PFR ${pc(S.pfr / S.seats)} limp/hand ${(S.limps / S.hands).toFixed(2)} 3bet ${pc(S.threeBet / S.hands)} | ends preflop ${pc(S.preflopEnd / S.hands)} walks ${pc(S.walks / S.hands)} showdown ${pc(S.showdown / S.hands)} all-in ${pc(S.allin / S.hands)} avg pot ${(S.pot / S.hands / 2).toFixed(1)}bb maxPreRaises ${S.maxPreRaises} | fold-to-cbet ${S.foldToCbet[1] ? pc(S.foldToCbet[0] / S.foldToCbet[1]) : '-'} | postflop bets: value ${pc(pb.value.length / Math.max(1, nb))} bluff ${pc(pb.bluff.length / Math.max(1, nb))} protect ${pc(pb.protect.length / Math.max(1, nb))}; avg size (x pot) value ${avg(pb.value)} bluff ${avg(pb.bluff)} protect ${avg(pb.protect)}; river bluff share ${pc(S.riverBets.bluff.length / Math.max(1, S.riverBets.bluff.length + S.riverBets.value.length + S.riverBets.protect.length))} | ${(S.ms / S.decisions).toFixed(0)}ms/decision`);
