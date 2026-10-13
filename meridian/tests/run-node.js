#!/usr/bin/env node
// Run the engine test suite in Node: `node tests/run-node.js` (requires Node 18+ with full ICU, the default).
const TE = require('../js/engine.js');
const defineTests = require('./tests.js');
const results = defineTests(TE);
let failed = 0, group = '';
for (const r of results) {
  if (r.group !== group) { group = r.group; console.log(`\n${group}`); }
  console.log(`  ${r.pass ? '✓' : '✗'} ${r.name}${r.pass ? '' : '\n      → ' + r.error}`);
  if (!r.pass) failed++;
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
