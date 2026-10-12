// PGN import/export with headers, comments, NAGs, recursive variations and
// multiple games per file. Moves are validated by chess.js through GameTree.
import { GameTree } from './tree.js';
import { Chess, START_FEN, validatePosition } from './chess-util.js';

const RESULTS = new Set(['1-0', '0-1', '1/2-1/2', '*']);
export const NAG_SYMBOLS = { 1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!', 7: '□', 10: '=', 13: '∞', 14: '⩲', 15: '⩱', 16: '±', 17: '∓', 18: '+−', 19: '−+', 22: '⨀', 32: '⟳', 36: '→', 40: '↑', 132: '⇆', 146: 'N' };
const SUFFIX_NAG = { '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6 };

export class PgnError extends Error {}

function tokenize(text) {
  const toks = [];
  let i = 0;
  let line = 1;
  const n = text.length;
  let atLineStart = true;
  while (i < n) {
    const ch = text[i];
    if (ch === '\n') { line++; i++; atLineStart = true; continue; }
    if (ch === '%' && atLineStart) { while (i < n && text[i] !== '\n') i++; continue; }
    atLineStart = false;
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '[') {
      const m = /^\[\s*([A-Za-z0-9_]+)\s*"((?:[^"\\]|\\.)*)"\s*\]/.exec(text.slice(i, i + 4000));
      if (!m) throw new PgnError(`Line ${line}: malformed header tag starting "${text.slice(i, i + 30).split('\n')[0]}".`);
      toks.push({ t: 'tag', key: m[1], value: m[2].replace(/\\(["\\])/g, '$1'), line });
      i += m[0].length;
      continue;
    }
    if (ch === '{') {
      const end = text.indexOf('}', i + 1);
      if (end < 0) throw new PgnError(`Line ${line}: comment "{" is never closed.`);
      const body = text.slice(i + 1, end);
      toks.push({ t: 'comment', value: body.replace(/\s+/g, ' ').trim(), line });
      line += (body.match(/\n/g) || []).length;
      i = end + 1;
      continue;
    }
    if (ch === ';') {
      let j = i + 1;
      while (j < n && text[j] !== '\n') j++;
      toks.push({ t: 'comment', value: text.slice(i + 1, j).trim(), line });
      i = j;
      continue;
    }
    if (ch === '(') { toks.push({ t: 'open', line }); i++; continue; }
    if (ch === ')') { toks.push({ t: 'close', line }); i++; continue; }
    if (ch === '$') {
      const m = /^\$(\d+)/.exec(text.slice(i, i + 6));
      if (!m) throw new PgnError(`Line ${line}: malformed annotation "$".`);
      toks.push({ t: 'nag', value: Number(m[1]), line });
      i += m[0].length;
      continue;
    }
    let j = i;
    while (j < n && !/[\s(){}[\];]/.test(text[j])) j++;
    const word = text.slice(i, j);
    i = j;
    if (RESULTS.has(word)) { toks.push({ t: 'result', value: word, line }); continue; }
    // Move numbers, possibly glued to the move ("12.Nf3", "12...Nf6").
    const mn = /^(\d+)(\.+)(.*)$/.exec(word);
    if (mn) {
      if (mn[3]) pushMove(toks, mn[3], line);
      continue;
    }
    if (/^\.+$/.test(word)) continue;
    pushMove(toks, word, line);
  }
  return toks;
}

function pushMove(toks, word, line) {
  let san = word;
  let nag = null;
  const m = /^(.*?)([!?]{1,2})$/.exec(san);
  if (m && SUFFIX_NAG[m[2]]) { san = m[1]; nag = SUFFIX_NAG[m[2]]; }
  san = san.replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O').replace(/e\.p\.$/, '');
  if (san === '--' || san === 'Z0') { toks.push({ t: 'null', line }); return; }
  toks.push({ t: 'move', san, nag, line });
}

/**
 * Parse PGN text that may contain several games.
 * Returns { games: [{ tree, headers, result, warnings }], errors: [{ game, message }] }.
 */
export function parsePgn(text) {
  const games = [];
  const errors = [];
  let toks;
  try {
    toks = tokenize(String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'));
  } catch (e) {
    return { games, errors: [{ game: 1, message: e.message }] };
  }
  let i = 0;
  let gameNo = 0;
  while (i < toks.length) {
    gameNo++;
    const headers = {};
    while (i < toks.length && toks[i].t === 'tag') { headers[toks[i].key] = toks[i].value; i++; }
    let startFen = START_FEN;
    if (headers.FEN) {
      const v = validatePosition(headers.FEN);
      if (!v.ok) {
        errors.push({ game: gameNo, message: `Game ${gameNo}: invalid FEN header — ${v.error}` });
        i = skipGame(toks, i);
        continue;
      }
      startFen = v.fen;
    }
    const tree = new GameTree(startFen, headers);
    const warnings = [];
    let cur = tree.root; // position before the next move
    let last = null; // node of the last move played in this scope
    const stack = [];
    let pendingComment = '';
    let result = null;
    let failed = false;
    let sawMove = false;
    for (; i < toks.length; i++) {
      const tk = toks[i];
      if (tk.t === 'tag') {
        if (sawMove || Object.keys(headers).length) { warnings.push('Game has no result token; it ended where the next game\'s headers begin.'); break; }
        continue;
      }
      if (tk.t === 'result') { result = tk.value; i++; break; }
      if (tk.t === 'comment') {
        if (last) last.comment = (last.comment ? last.comment + ' ' : '') + tk.value;
        else if (cur === tree.root && !stack.length) tree.root.startComment = (tree.root.startComment ? tree.root.startComment + ' ' : '') + tk.value;
        else pendingComment = (pendingComment ? pendingComment + ' ' : '') + tk.value;
        continue;
      }
      if (tk.t === 'nag') { if (last) last.nags.push(tk.value); continue; }
      if (tk.t === 'open') {
        if (!last) { failed = true; errors.push({ game: gameNo, message: `Game ${gameNo}, line ${tk.line}: a variation "(" must follow a move.` }); break; }
        stack.push({ cur, last });
        cur = last.parent;
        last = null;
        continue;
      }
      if (tk.t === 'close') {
        if (!stack.length) { failed = true; errors.push({ game: gameNo, message: `Game ${gameNo}, line ${tk.line}: unmatched ")".` }); break; }
        ({ cur, last } = stack.pop());
        continue;
      }
      if (tk.t === 'null') {
        failed = true;
        errors.push({ game: gameNo, message: `Game ${gameNo}, line ${tk.line}: null moves ("--") are not supported.` });
        break;
      }
      if (tk.t === 'move') {
        const node = tree.addMove(cur, tk.san);
        if (!node) {
          const c = new Chess(cur.fen);
          const who = c.turn() === 'w' ? 'White' : 'Black';
          failed = true;
          errors.push({ game: gameNo, message: `Game ${gameNo}, line ${tk.line}: "${tk.san}" is not a legal move for ${who} at move ${cur.fen.split(' ')[5]}${stack.length ? ' (inside a variation)' : ''}.` });
          break;
        }
        sawMove = true;
        if (pendingComment) { node.preComment = pendingComment; pendingComment = ''; }
        if (tk.nag) node.nags.push(tk.nag);
        cur = node;
        last = node;
      }
    }
    if (failed) { i = skipGame(toks, i); continue; }
    if (stack.length) warnings.push('Unclosed variation at end of game.');
    if (!sawMove && !Object.keys(headers).length && result === null) break; // trailing whitespace/comments
    if (!result) warnings.push('Missing result token.');
    result = result || headers.Result || '*';
    games.push({ tree, headers, result, warnings });
  }
  if (!games.length && !errors.length) errors.push({ game: 1, message: 'No games were found in the PGN text.' });
  return { games, errors };
}

function skipGame(toks, i) {
  for (; i < toks.length; i++) {
    if (toks[i].t === 'result') return i + 1;
    if (toks[i].t === 'tag' && i > 0 && toks[i - 1].t !== 'tag') return i;
  }
  return i;
}

/** Export a GameTree (with variations, comments and NAGs) as PGN text. */
export function treeToPgn(tree, { result } = {}) {
  const h = { Event: '?', Site: '?', Date: '????.??.??', Round: '?', White: '?', Black: '?', Result: result || tree.headers.Result || '*', ...tree.headers };
  if (result) h.Result = result;
  if (tree.startFen !== new Chess().fen()) { h.SetUp = '1'; h.FEN = tree.startFen; }
  const order = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result'];
  const keys = [...order, ...Object.keys(h).filter((k) => !order.includes(k))];
  const head = keys.map((k) => `[${k} "${String(h[k]).replace(/(["\\])/g, '\\$1')}"]`).join('\n');
  const parts = [];
  if (tree.root.startComment) parts.push(`{${tree.root.startComment}}`);
  writeLine(tree.root, parts, true);
  parts.push(h.Result);
  return `${head}\n\n${wrap(parts.join(' '))}\n`;
}

function moveText(node, forceNumber) {
  const [, , , , , full] = node.parent.fen.split(' ');
  let s = '';
  if (node.color === 'w') s = `${full}. `;
  else if (forceNumber) s = `${full}... `;
  s += node.san;
  for (const n of node.nags) s += ` $${n}`;
  return s;
}

function writeLine(parent, parts, forceNumber) {
  let p = parent;
  let force = forceNumber;
  while (p.children.length) {
    const main = p.children[0];
    if (main.preComment) parts.push(`{${main.preComment}}`);
    parts.push(moveText(main, force));
    force = false;
    if (main.comment) { parts.push(`{${main.comment}}`); force = true; }
    for (const v of p.children.slice(1)) {
      parts.push('(');
      if (v.preComment) parts.push(`{${v.preComment}}`);
      parts.push(moveText(v, true));
      if (v.comment) parts.push(`{${v.comment}}`);
      writeLine(v, parts, !!v.comment);
      parts.push(')');
      force = true;
    }
    p = main;
  }
}

function wrap(s, width = 80) {
  const words = s.replace(/\( /g, '(').replace(/ \)/g, ')').split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > width) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
}
