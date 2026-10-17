// In-depth Cepheus testing through the real game engine (Engine.createHand/applyAction/settle).
// Usage: node ceph_stats.js <opponent> <deals> <out.json>
//   opponent: call | raise | random | self | <level>[:<style>]   (e.g. extreme, elite:maniac)
// Every deal is played twice with the seats swapped (duplicate poker), stacks reset each hand.
const fs = require('fs');
const M = require('./run_tests.js'); const { Bots, Engine, Cards } = M;
const E = require('/home/user/Aidanbehar/poker/cepheus/cepheus.js');
const CB = () => { const C = new Function('Engine', 'Bots', fs.readFileSync(__dirname + '/parts/k_cepheus.js', 'utf8') + '\nreturn CepheusBot;')(Engine, Bots); const buf = fs.readFileSync('/home/user/Aidanbehar/poker/cepheus/cepheus-strategy.bin'); C.model = E.fromBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)); return C; };
const cep = CB(), cep2 = CB();
const [opp, DEALS, OUT] = [process.argv[2], +process.argv[3], process.argv[4]];
const rnd = Bots.makeRng();
const pass = (L) => ({ type: L.canCheck ? 'x' : 'c' });
const [lv, style] = opp.split(':');
const traits = Bots.PROFILES[lv] ? Bots.makeTraits(style || 'balanced') : null;
function oppAct(h, i, hist) {
  const L = Engine.legal(h);
  if (opp === 'call') return pass(L);
  if (opp === 'raise') return L.canRaise ? { type: L.isBet ? 'b' : 'r', to: L.minTo } : pass(L);
  if (opp === 'random') { const o = [pass(L)]; if (!L.canCheck) o.push({ type: 'f' }); if (L.canRaise) o.push({ type: L.isBet ? 'b' : 'r', to: L.minTo }); return o[rnd.int(o.length)]; }
  if (opp === 'self') { const r = cep2.decide(h, i); return r.action; }
  const a = Bots.decide(Bots.contextFor(h, i, { models: Bots.buildModels(hist.slice(-80)), difficulty: lv, personality: style || 'balanced', traits }));
  return { ...a, type: { bet: 'b', raise: 'r', call: 'c', check: 'x', fold: 'f' }[a.type] || a.type };
}
const blank = () => ({ hands: 0, vpip: 0, pfr: 0, threeBetChance: 0, threeBet: 0, bets: 0, raises: 0, calls: 0, sawFlop: 0, wtsd: 0, wsd: 0, cbetChance: 0, cbet: 0, facedCbet: 0, foldCbet: 0, foldedTo: 0, faced: 0 });
const S = { cep: blank(), opp: blank(), results: [], pos: { button: { hands: 0, net: 0, sq: 0 }, bb: { hands: 0, net: 0, sq: 0 } }, won: 0, lost: 0, split: 0, showdowns: 0, sdWon: 0, nsdWon: 0, fallbacks: 0, msCep: 0, decCep: 0, biggestWin: 0, biggestLoss: 0, endStreet: [0, 0, 0, 0, 0] };
const hist = [];
function track(st, h, i, type, L, flags) {
  if (h.street === 0) {
    if (L.toCall > 0 && h.currentBet > h.bb && !flags.threeBetSeen) { st.threeBetChance++; if (type === 'r') st.threeBet++; flags.threeBetSeen = true; }
  } else {
    if (type === 'b') st.bets++; if (type === 'r') st.raises++; if (type === 'c') st.calls++;
    if (L.toCall > 0) { st.faced++; if (type === 'f') st.foldedTo++; }
  }
}
function play(deck, cepSeat) {
  const names = cepSeat === 0 ? ['Cepheus', 'Opp'] : ['Opp', 'Cepheus'];
  const d = deck.slice();
  // button = index 0 (small blind); Cepheus is on the button when cepSeat === 0
  const h = Engine.createHand({ players: names.map((name) => ({ name, stack: 1000 })), button: 0, sb: 5, bb: 10, game: 'holdem', limit: 'fl', hole: [[d.pop(), d.pop()], [d.pop(), d.pop()]] });
  const flags = [{}, {}], vp = [false, false], pr = [false, false];
  let pfa = -1, cbetOpen = false;
  for (let g = 0; g < 200 && h.phase !== 'done'; g++) {
    if (h.phase === 'betting') {
      const i = h.toAct, L = Engine.legal(h), isCep = i === cepSeat, st = isCep ? S.cep : S.opp;
      let a;
      if (isCep) { const t0 = Date.now(); const r = cep.decide(h, i); S.msCep += Date.now() - t0; S.decCep++; if (r.fallback) S.fallbacks++; a = r.action; }
      else a = oppAct(h, i, hist);
      const before = h.log.length;
      try { Engine.applyAction(h, a); } catch (e) { Engine.applyAction(h, pass(Engine.legal(h))); }
      const e = h.log.slice(before).find((x) => x.t === 'act'); const type = e ? e.type : 'x';
      track(st, h, i, type, L, flags[i]);
      if (h.street === 0 || (e && e.street === 0)) {
        if (type === 'c' || type === 'r' || type === 'b') vp[i] = true;
        if (type === 'r' || type === 'b') { pr[i] = true; pfa = i; }
      } else if (e && e.street === 1) {
        if (i !== pfa && (type === 'b')) cbetOpen = false; // a lead into the raiser: no c-bet chance
        if (cbetOpen && i === pfa && L.toCall === 0) { st.cbetChance++; if (type === 'b') st.cbet++; cbetOpen = false; }
        else if (pfa >= 0 && i !== pfa && L.toCall > 0 && !flags[i].cbetFaced && h.log.some((x) => x.t === 'act' && x.street === 1 && x.p === pfa && x.type === 'b')) { flags[i].cbetFaced = true; st.facedCbet++; if (type === 'f') st.foldCbet++; }
      }
    } else if (h.phase === 'deal') { if (h.street === 0) cbetOpen = pfa >= 0; const cs = []; for (let j = 0; j < h.pendingDeal; j++) cs.push(d.pop()); Engine.dealBoard(h, cs); }
    else if (h.phase === 'showdown') { S.showdowns++; Engine.settle(h, Engine.planShowdown(h, () => true)); }
    else Engine.settle(h);
  }
  const net = h.players[cepSeat].stack - 1000, showdown = !!h.results.showdown;
  for (const [i, st] of [[cepSeat, S.cep], [1 - cepSeat, S.opp]]) {
    st.hands++; if (vp[i]) st.vpip++; if (pr[i]) st.pfr++;
    const sawFlop = h.street >= 1 && !h.log.some((x) => x.t === 'act' && x.street === 0 && x.type === 'f');
    if (sawFlop) { st.sawFlop++; if (showdown) { st.wtsd++; if (h.players[i].stack > 1000) st.wsd++; } }
  }
  S.endStreet[showdown ? 4 : h.street]++;
  if (net > 0) { S.won++; if (showdown) S.sdWon++; else S.nsdWon++; } else if (net < 0) S.lost++; else S.split++;
  const p = S.pos[cepSeat === 0 ? 'button' : 'bb']; p.hands++; p.net += net; p.sq += net * net;
  S.biggestWin = Math.max(S.biggestWin, net); S.biggestLoss = Math.min(S.biggestLoss, net);
  S.results.push(net / 10);
  hist.push(h);
  if (hist.length > 120) hist.shift();
}
const t0 = Date.now();
for (let k = 0; k < DEALS; k++) { const deck = Cards.shuffle(Cards.newDeck()); play(deck, 0); play(deck, 1); }
// summary
const n = S.results.length, mean = S.results.reduce((a, b) => a + b, 0) / n;
// duplicate pairs reduce luck: the error bar uses the variance of pair totals
const pairs = []; for (let k = 0; k < n; k += 2) pairs.push(S.results[k] + S.results[k + 1]);
const pm = pairs.reduce((a, b) => a + b, 0) / pairs.length, pv = pairs.reduce((a, b) => a + (b - pm) ** 2, 0) / (pairs.length - 1);
const sdHand = Math.sqrt(S.results.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
const ci95 = 1.96 * Math.sqrt(pv) / Math.sqrt(pairs.length) / 2; // per hand, bb
const hist2 = {}; for (const r of S.results) { const b = Math.max(-12, Math.min(12, Math.round(r / 2) * 2)); hist2[b] = (hist2[b] || 0) + 1; }
const CURVE_HANDS = 10000, CURVE_STEP = 50; // a sample run: the running total every 50 hands
const curve = []; let cum = 0; for (let k = 0; k < Math.min(n, CURVE_HANDS); k++) { cum += S.results[k]; if (k % CURVE_STEP === CURVE_STEP - 1) curve.push(+cum.toFixed(1)); }
const rate = (a, b) => (b ? +(a / b).toFixed(3) : null);
const prof = (st) => ({ vpip: rate(st.vpip, st.hands), pfr: rate(st.pfr, st.hands), threeBet: rate(st.threeBet, st.threeBetChance), af: rate(st.bets + st.raises, st.calls), cbet: rate(st.cbet, st.cbetChance), foldToCbet: rate(st.foldCbet, st.facedCbet), foldToBet: rate(st.foldedTo, st.faced), wtsd: rate(st.wtsd, st.sawFlop), wsd: rate(st.wsd, st.wtsd) });
const out = {
  opponent: opp, hands: n, bbPerHand: +mean.toFixed(4), bb100: +(mean * 100).toFixed(1), ci95bb100: +(ci95 * 100).toFixed(1), sdPerHand: +sdHand.toFixed(2),
  wonPct: rate(S.won, n), lostPct: rate(S.lost, n), splitPct: rate(S.split, n), showdownPct: rate(S.showdowns, n), sdWonOfWins: rate(S.sdWon, S.won), endedOn: { preflop: rate(S.endStreet[0], n), flop: rate(S.endStreet[1], n), turn: rate(S.endStreet[2], n), river: rate(S.endStreet[3], n), showdown: rate(S.endStreet[4], n) },
  byPosition: Object.fromEntries(Object.entries(S.pos).map(([k, v]) => [k, { hands: v.hands, bb100: +(v.net / 10 / v.hands * 100).toFixed(1) }])),
  biggestWinBB: S.biggestWin / 10, biggestLossBB: S.biggestLoss / 10, histogramBB: hist2, curve, curveStep: CURVE_STEP,
  cepheus: prof(S.cep), opponentStats: prof(S.opp), fallbacks: S.fallbacks, msPerDecision: +(S.msCep / S.decCep).toFixed(1), seconds: Math.round((Date.now() - t0) / 1000),
};
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`${opp.padEnd(18)} ${n} hands: Cepheus ${out.bb100 >= 0 ? '+' : ''}${out.bb100} bb/100 (±${out.ci95bb100}) | won ${Math.round(100 * out.wonPct)}% of hands | fallbacks ${S.fallbacks} | ${out.seconds}s`);
