// Starts Stockfish 19 WITHOUT its NNUE network and prints what it reports.
// Run as a child process by engine.test.mjs (the engine exits with code 1).
const path = require('path');
const { DIR } = require('./node-engine.cjs');
const factory = require(path.join(DIR, 'stockfish-19.js'));
factory({
  arguments: [],
  locateFile: (f) => path.join(DIR, f),
  print: (l) => console.log(l),
  printErr: (l) => console.log(l),
}).then((mod) => {
  for (const c of ['uci', 'isready', 'position startpos', 'go depth 5']) mod.ccall('sf_uci_push', null, ['string'], [c]);
  setTimeout(() => { console.log('PROBE-TIMEOUT'); process.exit(3); }, 20000);
});
