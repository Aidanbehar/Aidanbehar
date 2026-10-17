// Cepheus vs other opponents through the real game engine (Engine.createHand/applyAction/settle).
const fs = require('fs');
const M = require('./run_tests.js'); const { Bots, Engine, Cards } = M;
const E = require('/home/user/Aidanbehar/poker/cepheus/cepheus.js');
const CepheusBot = new Function('Engine', 'Bots', fs.readFileSync(__dirname + '/parts/k_cepheus.js', 'utf8') + '\nreturn CepheusBot;')(Engine, Bots);
const file = process.argv[2] || __dirname + '/test-strategy.bin';
const buf = fs.readFileSync(file); CepheusBot.model = E.fromBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)); CepheusBot.rng = Bots.makeRng();
const rnd = Bots.makeRng();
const POL = {
  call: (h) => { const L = Engine.legal(h); return { type: L.canCheck ? 'x' : 'c' }; },
  raise: (h) => { const L = Engine.legal(h); return L.canRaise ? { type: L.isBet ? 'b' : 'r', to: L.minTo } : { type: L.canCheck ? 'x' : 'c' }; },
  random: (h) => { const L = Engine.legal(h); const o = [{ type: L.canCheck ? 'x' : 'c' }]; if (!L.canCheck) o.push({ type: 'f' }); if (L.canRaise) o.push({ type: L.isBet ? 'b' : 'r', to: L.minTo }); return o[rnd.int(o.length)]; },
};
for (const d of ['intermediate', 'elite', 'extreme']) POL[d] = (h, i, hist) => Bots.decide(Bots.contextFor(h, i, { models: Bots.buildModels(hist.slice(-40)), difficulty: d, personality: 'balanced' }));
const stats = { hands: 0, fallbacks: 0, illegal: 0, showdowns: 0, splits: 0, capHits: 0, badSize: 0, maxBets: 0, streetsSeen: [0, 0, 0, 0], actions: { fold: 0, call: 0, raise: 0 } };
function playHand(deck, cepSeatIsButton, opp, hist, no) {
  const names = ['Cepheus', 'Opp'], button = cepSeatIsButton ? 0 : 1;
  const d = deck.slice();
  const h = Engine.createHand({ no, players: names.map((name) => ({ name, stack: 1000 })), button, sb: 5, bb: 10, game: 'holdem', limit: 'fl', holeCount: 2, hole: [[d.pop(), d.pop()], [d.pop(), d.pop()]] });
  for (let g = 0; g < 200 && h.phase !== 'done'; g++) {
    if (h.phase === 'betting') {
      const i = h.toAct; let a;
      if (i === 0) { const r = CepheusBot.decide(h, i); if (r.fallback) { stats.fallbacks++; if (stats.fallbacks < 4) console.log('FALLBACK', r.fallback); } a = r.action; if (r.d) stats.actions[r.d.action]++; }
      else a = POL[opp](h, i, hist);
      try { Engine.applyAction(h, a); } catch (e) { stats.illegal++; console.log('ILLEGAL', i, JSON.stringify(a), e.message); const L = Engine.legal(h); Engine.applyAction(h, { type: L.canCheck ? 'x' : 'c' }); }
    } else if (h.phase === 'deal') { const cs = []; for (let j = 0; j < h.pendingDeal; j++) cs.push(d.pop()); Engine.dealBoard(h, cs); }
    else if (h.phase === 'showdown') { stats.showdowns++; Engine.settle(h, Engine.planShowdown(h, () => true)); }
    else Engine.settle(h);
  }
  if (h.phase !== 'done') throw new Error('hand did not finish');
  // fixed sizes and the 4-bet cap, straight from the log
  for (let s = 0; s <= h.street; s++) {
    stats.streetsSeen[s]++;
    let level = s === 0 ? 10 : 0, bets = s === 0 ? 1 : 0;
    for (const e of h.log) if (e.t === 'act' && e.street === s && (e.type === 'b' || e.type === 'r')) { bets++; if (e.to - level !== (s < 2 ? 10 : 20)) stats.badSize++; level = e.to; }
    stats.maxBets = Math.max(stats.maxBets, bets); if (bets === 4) stats.capHits++; if (bets > 4) stats.badSize++;
  }
  if (h.results && h.results.payouts.filter((x) => x > 0).length === 2) stats.splits++;
  stats.hands++; hist.push(h);
  return h.players[0].stack - h.players[0].startStack;
}
const plan = (process.argv[3] || 'call:1500,raise:1500,random:1500,intermediate:300,elite:300,extreme:300').split(',');
const t0 = Date.now();
for (const item of plan) {
  const [opp, n] = item.split(':'); const hist = []; let net = 0, sq = 0;
  for (let k = 0; k < +n; k++) {
    const deck = Cards.shuffle(Cards.newDeck());
    const x = playHand(deck, true, opp, hist, 2 * k + 1) + playHand(deck, false, opp, hist, 2 * k + 2); // duplicate: same cards, seats swapped
    net += x; sq += x * x;
  }
  const m = net / (2 * n), se = Math.sqrt(sq / n - (net / n) ** 2) / Math.sqrt(n) / 2;
  console.log(`vs ${opp.padEnd(12)} ${2 * n} hands: Cepheus ${m >= 0 ? '+' : ''}${(m / 10).toFixed(3)} bb/hand (±${(1.96 * se / 10).toFixed(3)})`);
}
console.log(JSON.stringify(stats), `${((Date.now() - t0) / 1000).toFixed(0)}s`);
