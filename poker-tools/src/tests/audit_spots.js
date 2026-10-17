// Spot probes: put a bot (big blind) in an exact river spot and ask it many times what it does.
const { Bots, Engine } = require('./run_tests.js');
const LEVELS = (process.argv[2] || 'beginner,casual,intermediate,advanced,professional,elite,extreme').split(',');
const N = +(process.argv[3] || 150);
function riverSpot(botHole, villHole, board, betFrac, opts = {}) {
  const h = Engine.createHand({ players: [{ name: 'Vill', stack: 200 }, { name: 'Bot', stack: 200 }], button: 0, sb: 1, bb: 2, limit: 'nl', hole: [villHole, botHole] });
  if (opts.raisedPre) { Engine.applyAction(h, { type: 'r', to: 6 }); Engine.applyAction(h, { type: 'c' }); }
  else { Engine.applyAction(h, { type: 'c' }); Engine.applyAction(h, { type: 'x' }); }
  Engine.dealBoard(h, board.slice(0, 3)); Engine.applyAction(h, { type: 'x' }); Engine.applyAction(h, { type: 'x' });
  Engine.dealBoard(h, [board[3]]); Engine.applyAction(h, { type: 'x' }); Engine.applyAction(h, { type: 'x' });
  Engine.dealBoard(h, [board[4]]);
  if (betFrac === 0) return h; // bot first to act on the river
  Engine.applyAction(h, { type: 'x' });
  const L = Engine.legal(h); const to = Math.min(L.maxTo, Math.max(L.minTo, Math.round(betFrac * L.pot)));
  Engine.applyAction(h, { type: 'b', to });
  return h;
}
function freq(h, level, pers = 'balanced') {
  const c = { fold: 0, call: 0, raise: 0, check: 0, bet: 0 }, sizes = [];
  for (let k = 0; k < N; k++) {
    const a = Bots.decide(Bots.contextFor(h, h.toAct, { models: {}, difficulty: level, personality: pers }));
    const t = { f: 'fold', x: 'check', c: 'call', b: 'bet', r: 'raise' }[a.type] || a.type; c[t]++;
    if (t === 'bet' || t === 'raise') sizes.push(a.to);
  }
  const pct = Object.fromEntries(Object.entries(c).filter(([, v]) => v).map(([k, v]) => [k, Math.round(100 * v / N) + '%']));
  return { pct, avgSize: sizes.length ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) : null };
}
const board = ['As', 'Ks', 'Qs', '7d', '2c'];
const SPOTS = [
  ['ROYAL FLUSH facing 1/2-pot bet', ['Js', 'Ts'], ['Ah', '9c'], 0.5],
  ['ROYAL FLUSH facing 3x-pot overbet', ['Js', 'Ts'], ['Ah', '9c'], 3],
  ['top pair (A9) facing 1/4 pot', ['Ah', '9c'], ['8h', '6h'], 0.25],
  ['top pair (A9) facing 1x pot', ['Ah', '9c'], ['8h', '6h'], 1],
  ['top pair (A9) facing 5x pot (shove)', ['Ah', '9c'], ['8h', '6h'], 5],
  ['air (4h3h) facing 1/4 pot', ['4h', '3h'], ['8h', '6h'], 0.25],
  ['air (4h3h), first to act', ['4h', '3h'], ['8h', '6h'], 0],
  ['nuts (JsTs) first to act', ['Js', 'Ts'], ['8h', '6h'], 0],
];
for (const lv of LEVELS) {
  console.log(`\n=== ${lv}`);
  for (const [name, bh, vh, f] of SPOTS) { const r = freq(riverSpot(bh, vh, board, f), lv); console.log(name.padEnd(38), JSON.stringify(r.pct), r.avgSize ? `avg to ${r.avgSize} (pot ${f === 0 ? 'n/a' : ''})` : ''); }
}
