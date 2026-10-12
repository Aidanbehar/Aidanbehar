// Build data/openings.json from the Lichess chess-openings TSV files (CC0).
// Every PGN line is replayed with chess.js, so each entry carries the exact UCI
// move sequence and the resulting position key.
//   node tools/build-openings.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from '../vendor/chess.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'data', 'openings-src');
const entries = [];
for (const f of ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv']) {
  const lines = fs.readFileSync(path.join(src, f), 'utf8').trim().split('\n');
  const header = lines.shift().split('\t');
  if (header.join(',') !== 'eco,name,pgn') throw new Error(`${f}: unexpected header ${header}`);
  for (const line of lines) {
    const [eco, name, pgn] = line.split('\t');
    const c = new Chess();
    const sans = pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/);
    const uci = [];
    for (const san of sans) {
      const m = c.move(san);
      uci.push(m.lan);
    }
    entries.push({ eco, name, pgn, uci: uci.join(' '), key: c.fen().split(' ').slice(0, 4).join(' ') });
  }
}
const out = {
  source: 'https://github.com/lichess-org/chess-openings',
  license: 'CC0-1.0 (public domain dedication)',
  revision: 'a6189a30dc273ccb21fc2536a9a2fefd5592a67a',
  count: entries.length,
  entries,
};
fs.writeFileSync(path.join(root, 'data', 'openings.json'), JSON.stringify(out));
console.log(`Wrote ${entries.length} openings`);
