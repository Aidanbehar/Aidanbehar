// Combine the offline test results into poker/cepheus/cepheus-stats.json (read by the Stats tab).
const fs = require('fs'), S = __dirname, MDIR = process.env.MDIR || 'cstats', EDIR = `${S}/${process.env.EDIR || '.'}`;
const exactAll = fs.readdirSync(EDIR).filter((f) => /^exact_[a-z]\.txt$/.test(f)).flatMap((f) => fs.readFileSync(`${EDIR}/${f}`, 'utf8').split('\n').filter((l) => l.startsWith('JSON ')).map((l) => JSON.parse(l.slice(5))));
const fin = 'run/state.bin';
const exact = ['call', 'raise', 'uniform', fin].map((b) => exactAll.find((x) => x.a === fin && x.b === b)).filter(Boolean).map((x) => ({ ...x, b: x.b === fin ? 'self' : x.b }));
const minutes = (f) => +f.match(/state-(\d)/)[1] * 20;
const convergence = [{ minutes: 0, vsCall: (exactAll.find((x) => x.a === 'uniform' && x.b === 'call') || {}).mbb }]
  .concat(exactAll.filter((x) => /snaps\/state-\d/.test(x.a) && x.b === 'call').map((x) => ({ minutes: minutes(x.a), vsCall: x.mbb })))
  .filter((x) => x.vsCall != null).sort((a, b) => a.minutes - b.minutes);
const vsSnapshots = exactAll.filter((x) => x.a === fin && /snaps\/state-\d/.test(x.b)).map((x) => ({ minutes: minutes(x.b), mbb: x.mbb, ci: x.ci })).sort((a, b) => a.minutes - b.minutes);
const matchups = fs.readdirSync(`${S}/${MDIR}`).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(`${S}/${MDIR}/${f}`, 'utf8')));
const totalHands = matchups.reduce((a, m) => a + m.hands, 0), totalFallbacks = matchups.reduce((a, m) => a + m.fallbacks, 0);
const strong = matchups.filter((m) => ['advanced', 'professional', 'elite', 'extreme'].includes(m.opponent));
const out = {
  version: 1, date: new Date().toISOString().slice(0, 10), bb: 10,
  strategy: { minutes: 100, summary: 'CFR+ on the exact heads-up limit Hold\'em betting tree (6,378 decision points), 169 preflop hand classes and 50 strength groups per later street, 14,273 iterations in 100 minutes on 4 CPU cores.' },
  sdPerHand: +(strong.reduce((a, m) => a + m.sdPerHand, 0) / Math.max(1, strong.length)).toFixed(2),
  exact, convergence, vsSnapshots, matchups, totalHands, totalFallbacks,
};
fs.writeFileSync('/home/user/Aidanbehar/poker/cepheus/cepheus-stats.json', JSON.stringify(out));
console.log('wrote cepheus-stats.json:', JSON.stringify(out).length, 'bytes |', matchups.length, 'matchups,', totalHands, 'hands, fallbacks', totalFallbacks, '| exact', exact.map((x) => x.b + ' ' + x.mbb).join(', '), '| convergence', convergence.map((c) => c.minutes + ':' + c.vsCall).join(' '));
