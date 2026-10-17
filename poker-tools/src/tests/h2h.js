// New engine vs old engine, heads-up, duplicate deals (same cards, seats swapped). Stacks 100bb, reset every hand.
const fs = require('fs');
const M = require('./run_tests.js'); const { Engine, Cards } = M;
const oldSrc = fs.readFileSync(__dirname + '/botdev/a3_bots.old.js', 'utf8');
const OldBots = new Function('Cards', 'Eval', 'Engine', 'RANKS', oldSrc + '\nreturn Bots;')(Cards, M.Eval, Engine, '23456789TJQKA');
const NewBots = M.Bots;
const [lvN, lvO, N, limit] = [process.argv[2] || 'extreme', process.argv[3] || 'extreme', +(process.argv[4] || 600), process.argv[5] || 'nl'];
let net = 0, sq = 0; const hist = [];
const trN = NewBots.makeTraits('balanced');
function play(deck, newSeat) {
  const names = newSeat === 0 ? ['New', 'Old'] : ['Old', 'New'];
  const d = deck.slice();
  const h = Engine.createHand({ players: names.map((name) => ({ name, stack: 200 })), button: 0, sb: 1, bb: 2, game: 'holdem', limit, hole: [[d.pop(), d.pop()], [d.pop(), d.pop()]] });
  const mN = NewBots.buildModels(hist.slice(-80)), mO = OldBots.buildModels(hist.slice(-80));
  NewBots.driftTraits(trN);
  for (let g = 0; g < 300 && h.phase !== 'done'; g++) {
    if (h.phase === 'betting') {
      const i = h.toAct, isNew = h.players[i].name === 'New';
      let a = isNew ? NewBots.decide(NewBots.contextFor(h, i, { models: mN, difficulty: lvN, personality: 'balanced', traits: trN })) : OldBots.decide(OldBots.contextFor(h, i, { models: mO, difficulty: lvO, personality: 'balanced' }));
      a = { ...a, type: { bet: 'b', raise: 'r', call: 'c', check: 'x', fold: 'f' }[a.type] || a.type };
      try { Engine.applyAction(h, a); } catch (e) { const L = Engine.legal(h); Engine.applyAction(h, { type: L.canCheck ? 'x' : 'c' }); }
    } else if (h.phase === 'deal') { const cs = []; for (let j = 0; j < h.pendingDeal; j++) cs.push(d.pop()); Engine.dealBoard(h, cs); }
    else if (h.phase === 'showdown') Engine.settle(h, Engine.planShowdown(h, () => true));
    else Engine.settle(h);
  }
  hist.push(h);
  return (h.players[newSeat].stack - 200) / 2;
}
for (let k = 0; k < N; k++) { const deck = Cards.shuffle(Cards.newDeck()); const x = play(deck, 0) + play(deck, 1); net += x; sq += x * x; }
const m = net / N / 2, se = Math.sqrt(sq / N - (net / N) ** 2) / Math.sqrt(N) / 2;
console.log(`NEW ${lvN} vs OLD ${lvO} (${limit}, ${2 * N} hands): new engine ${m >= 0 ? '+' : ''}${(m * 100).toFixed(0)} bb/100 (±${(196 * se).toFixed(0)})`);
