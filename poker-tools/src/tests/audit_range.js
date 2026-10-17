// How well does the bots' range sampling respect a tight range (e.g. after a 3-bet)?
const { Bots, Cards, Eval } = require('./run_tests.js');
const rng = Bots.makeRng();
for (const hole of [['Jh', 'Jd'], ['Ah', 'Qd'], ['9s', '8s']]) for (const w of [0.03, 0.08, 0.3]) {
  const bot = Bots.equity({ game: 'holdem', holeCount: 2, hole, board: [], widths: [w], rng, iters: 6000, budgetMs: 5000 }).equity;
  // exact range: sample opponent hands strictly inside the top w of hands
  let win = 0, n = 0; const dead = new Set(hole);
  while (n < 6000) {
    const d = Cards.shuffle(Cards.newDeck().filter((c) => !dead.has(c))); const o = [d[0], d[1]];
    if (Bots.holdemPct(o) > w) continue;
    const b = d.slice(2, 7), a = Eval.forGame('holdem', hole, b).score, c = Eval.forGame('holdem', o, b).score;
    win += a > c ? 1 : a === c ? 0.5 : 0; n++;
  }
  console.log(`${hole.join('')} vs top ${Math.round(w * 100)}%: the bots think ${(100 * bot).toFixed(0)}% equity, really ${(100 * win / n).toFixed(0)}%`);
}
