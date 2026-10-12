// Application shell: state, board, navigation, move list, FEN/PGN, preferences.
// Feature panels (analysis, counter, review, openings, editor, learn) attach to
// the `app` object created here.
import { Chess, START_FEN, parseUci, gameStatus, validatePosition } from './chess-util.js';
import { GameTree } from './tree.js';
import { parsePgn, treeToPgn, NAG_SYMBOLS } from './pgn.js';
import { Board, destsFromChess, checkSquare } from './board.js';
import { EngineClient } from './engine.js';
import { OpeningBook } from './openings.js';
import { CLASS_INFO } from './eval.js';
import { initAnalysis } from './analysis-panel.js';
import { initCounter } from './counter-panel.js';
import { initReview } from './review.js';
import { initOpenings } from './openings-panel.js';
import { initEditor } from './editor.js';
import { initLearn } from './learn.js';

const $ = (sel) => document.querySelector(sel);
const PREFS_KEY = 'ca.prefs';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}

export const app = {
  tree: new GameTree(START_FEN),
  node: null,
  preview: null, // { base, moves: [{san, uci, from, to, fenAfter}], index, label }
  redoStack: [],
  view: 'analysis',
  prefs: loadPrefs(),
  listeners: new Set(),
  arrowSources: new Map(),
  markSources: new Map(),
  games: [], // imported games (multi-game PGN)
  gameIndex: -1,
  book: null,
  bookError: null,

  savePrefs(patch) {
    Object.assign(this.prefs, patch);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs)); } catch { /* storage unavailable */ }
  },

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },

  /** FEN of the position currently displayed on the board. */
  currentFen() {
    if (this.preview && this.preview.index > 0) return this.preview.moves[this.preview.index - 1].fenAfter;
    if (this.preview) return this.preview.base.fen;
    return this.node.fen;
  },

  /** chess.js instance for the displayed position, including game history. */
  currentChess() {
    const c = this.tree.chessAt(this.preview ? this.preview.base : this.node);
    if (this.preview) for (let i = 0; i < this.preview.index; i++) c.move(parseUci(this.preview.moves[i].uci));
    return c;
  },

  /** UCI moves from the game start to the displayed position. */
  currentMoves() {
    const base = this.tree.path(this.preview ? this.preview.base : this.node).map((n) => n.uci);
    if (this.preview) base.push(...this.preview.moves.slice(0, this.preview.index).map((m) => m.uci));
    return base;
  },

  goto(node, { keepPreview = false } = {}) {
    if (!node) return;
    if (!keepPreview) this.preview = null;
    this.node = node;
    this.refresh();
  },

  /** Play a move from the displayed position (adds a variation if needed). */
  playMove(move) {
    if (this.preview) this.commitPreview();
    const node = this.tree.addMove(this.node, move);
    if (!node) { this.toast('Illegal move'); return null; }
    this.redoStack = [];
    this.goto(node);
    return node;
  },

  commitPreview() {
    const p = this.preview;
    if (!p) return;
    let n = p.base;
    for (let i = 0; i < p.index; i++) n = this.tree.addMove(n, p.moves[i].uci) || n;
    this.preview = null;
    this.node = n;
  },

  startPreview(baseNode, moves, label, index = 1) {
    if (!moves.length) return;
    this.preview = { base: baseNode, moves, index: Math.min(index, moves.length), label };
    this.node = baseNode;
    this.refresh();
  },

  setArrows(source, arrows) { this.arrowSources.set(source, arrows || []); this.renderBoardOverlays(); },
  setMarks(source, marks) { this.markSources.set(source, marks || new Map()); this.renderBoardOverlays(); },

  renderBoardOverlays() {
    if (this.editing) { this.board.set({ arrows: [], marks: new Map() }); return; }
    const arrows = [];
    for (const a of this.arrowSources.values()) arrows.push(...a);
    const marks = new Map();
    for (const m of this.markSources.values()) for (const [k, v] of m) marks.set(k, v);
    this.board.set({ arrows, marks });
  },

  loadTree(tree, { gameIndex = -1 } = {}) {
    this.tree = tree;
    this.node = tree.root;
    this.preview = null;
    this.redoStack = [];
    this.gameIndex = gameIndex;
    this.emit('tree');
    this.refresh();
  },

  newGameFromFen(fen) {
    this.games = [];
    this.loadTree(new GameTree(fen), { gameIndex: -1 });
  },

  emit(kind) { for (const fn of this.listeners) { try { fn(kind); } catch (e) { console.error(e); } } },

  refresh() {
    const chess = this.currentChess();
    const fen = this.currentFen();
    const lastNode = this.preview && this.preview.index > 0 ? this.preview.moves[this.preview.index - 1] : this.node.parent ? this.node : null;
    const playable = this.view !== 'learn' && !this.editing;
    this.board.set({
      fen,
      lastMove: lastNode ? { from: lastNode.from, to: lastNode.to } : null,
      check: checkSquare(chess),
      dests: playable ? destsFromChess(chess) : new Map(),
      turnColor: chess.turn(),
      mode: this.editing ? 'edit' : 'play',
    });
    this.chess = chess;
    renderMoveList();
    renderPreviewBar();
    renderPlayers();
    renderProgress();
    const fenInput = $('#fen-input');
    if (document.activeElement !== fenInput) fenInput.value = fen;
    $('#fen-error').textContent = '';
    this.emit('position');
  },

  toast(msg, ms = 2200) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
  },

  banner(html, { kind = 'error', actions = [] } = {}) {
    const b = $('#banner');
    if (!html) { b.classList.add('hidden'); b.innerHTML = ''; return; }
    b.className = `banner ${kind === 'info' ? 'info' : ''}`;
    b.innerHTML = `<div class="grow">${html}</div>`;
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      if (a.primary) btn.className = 'primary';
      btn.addEventListener('click', a.onClick);
      b.appendChild(btn);
    }
    const close = document.createElement('button');
    close.textContent = 'Dismiss';
    close.addEventListener('click', () => app.banner(null));
    b.appendChild(close);
  },

  setView(view) {
    if (this.editing && view !== 'analysis') this.cancelEditing?.();
    this.view = view;
    document.querySelectorAll('.tabs [role=tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === view)));
    const learn = view === 'learn';
    $('#workspace').classList.toggle('hidden', learn);
    $('#learn').classList.toggle('hidden', !learn);
    document.querySelectorAll('#side .view').forEach((v) => v.classList.toggle('hidden', v.dataset.view !== view));
    this.savePrefs({ view });
    this.emit('view');
    if (!learn) this.refresh();
  },
};

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------------------------------------------------------- move list
function moveLabel(node, withNumber) {
  const full = node.parent.fen.split(' ')[5];
  let num = '';
  if (node.color === 'w') num = `${full}. `;
  else if (withNumber) num = `${full}… `;
  return { num, san: node.san + node.nags.filter((n) => n <= 6).map((n) => NAG_SYMBOLS[n]).join('') };
}

function badgeHtml(node) {
  const r = node.review;
  if (!r || !app.showReviewBadges) return '';
  const info = CLASS_INFO[r.cls];
  if (!info || ['good', 'excellent', 'book'].includes(r.cls)) return '';
  return `<span class="badge" style="background:${info.color}" title="${info.label}">${info.symbol}</span>`;
}

function mvButton(node, text) {
  const cur = !app.preview && node === app.node;
  return `<button class="mv${cur ? ' current' : ''}" data-node="${node.id}" ${cur ? 'aria-current="true"' : ''}>${escapeHtml(text)}${badgeHtml(node)}</button>`;
}

function inlineLine(start, forceNum) {
  // Renders `start` and its main continuation, with nested variations in ( ).
  let out = '';
  let n = start;
  let force = forceNum;
  while (n) {
    const { num, san } = moveLabel(n, force);
    out += mvButton(n, num + san) + ' ';
    force = false;
    if (n.comment) { out += `<span class="comment-inline">{${escapeHtml(n.comment)}}</span> `; force = true; }
    const p = n.parent;
    if (p.children[0] === n && p.children.length > 1 && n !== start) {
      for (const v of p.children.slice(1)) out += `(${inlineLine(v, true).trim()}) `;
      force = true;
    }
    n = n.children[0];
  }
  return out;
}

function renderMoveListInto(el, { emptyText }) {
  const root = app.tree.root;
  if (!root.children.length) {
    el.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }
  let html = '<div class="mainline">';
  if (root.startComment) html += `<div class="comment">${escapeHtml(root.startComment)}</div>`;
  let n = root.children[0];
  let needNumber = true;
  let col = 0; // 0 = expecting white cell, 1 = expecting black cell
  const full = (node) => node.parent.fen.split(' ')[5];
  while (n) {
    if (n.color === 'w') {
      if (col === 1) { html += '<span></span>'; col = 0; }
      html += `<span class="num">${full(n)}.</span>`;
      html += mvButton(n, moveLabel(n, false).san);
      col = 1;
    } else {
      if (col === 0 || needNumber) {
        if (col === 1) html += '<span></span>';
        html += `<span class="num">${full(n)}.</span><span class="mv-placeholder">…</span>`;
      }
      html += mvButton(n, moveLabel(n, false).san);
      col = 0;
    }
    needNumber = false;
    const breaks = n.comment || n.parent.children.length > 1;
    if (breaks) {
      if (col === 1) { html += '<span></span>'; }
      if (n.comment) html += `<div class="comment">${escapeHtml(n.comment)}</div>`;
      for (const v of n.parent.children.slice(1)) html += `<div class="variation">${inlineLine(v, true)}</div>`;
      col = 0;
      needNumber = true;
    }
    n = n.children[0];
  }
  html += '</div>';
  el.innerHTML = html;
  const cur = el.querySelector('.mv.current');
  if (cur) {
    const top = cur.offsetTop - el.offsetTop;
    if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - 30) el.scrollTop = top - el.clientHeight / 2;
  }
}

function renderMoveList() {
  renderMoveListInto($('#movelist'), { emptyText: 'No moves yet. Make a move on the board, paste a PGN, or load a FEN.' });
  if (app.view === 'review') renderMoveListInto($('#review-movelist'), { emptyText: 'No game to review yet.' });
  renderGameHeader();
}

function renderGameHeader() {
  const h = app.tree.headers;
  const el = $('#game-header');
  if (!h.White && !h.Black && !h.Event) { el.innerHTML = ''; return; }
  const parts = [];
  if (h.White || h.Black) parts.push(`<strong>${escapeHtml(h.White || '?')}</strong>${h.WhiteElo ? ` (${escapeHtml(h.WhiteElo)})` : ''} – <strong>${escapeHtml(h.Black || '?')}</strong>${h.BlackElo ? ` (${escapeHtml(h.BlackElo)})` : ''}`);
  const meta = [h.Event, h.Site, h.Date, h.Round && h.Round !== '?' ? `Round ${h.Round}` : ''].filter((x) => x && x !== '?' && x !== '????.??.??');
  if (meta.length) parts.push(`<span class="muted">${meta.map(escapeHtml).join(' · ')}</span>`);
  if (h.Result) parts.push(`Result: <strong>${escapeHtml(h.Result)}</strong>`);
  el.innerHTML = parts.join('<br>');
}

function renderPlayers() {
  const h = app.tree.headers;
  const name = (c) => (c === 'w' ? h.White : h.Black) || '';
  const top = app.board.orientation === 'w' ? 'b' : 'w';
  $('#player-top').textContent = name(top) ? `${top === 'w' ? '♔' : '♚'} ${name(top)}` : '';
  $('#player-bottom').textContent = name(top === 'w' ? 'b' : 'w') ? `${top === 'w' ? '♚' : '♔'} ${name(top === 'w' ? 'b' : 'w')}` : '';
}

function renderProgress() {
  // Position within the current line (start .. end of the line through this node).
  let end = app.node;
  while (end.children.length) end = end.children[0];
  const total = end.ply - app.tree.root.ply;
  const at = app.node.ply - app.tree.root.ply;
  const pct = total ? (at / total) * 100 : 0;
  $('#game-progress > div').style.width = `${pct}%`;
  $('#game-progress-text').textContent = total ? `Ply ${at} / ${total}` : '';
}

function renderPreviewBar() {
  const bar = $('#preview-bar');
  const p = app.preview;
  if (!p) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const mv = p.index > 0 ? p.moves[p.index - 1] : null;
  bar.innerHTML = `<span class="grow">Exploring <strong>${escapeHtml(p.label || 'engine line')}</strong> — move ${p.index}/${p.moves.length}${mv ? `: <strong>${escapeHtml(mv.san)}</strong>` : ''}</span>
    <button data-p="back" aria-label="Previous move in line">◀</button>
    <button data-p="fwd" aria-label="Next move in line">▶</button>
    <button data-p="add" title="Add these moves to the move list as a variation">Add to moves</button>
    <button data-p="exit" class="primary" title="Return to the original position (Esc)">Return</button>`;
}

// ---------------------------------------------------------------- navigation
function previewStep(delta) {
  const p = app.preview;
  if (!p) return false;
  const i = p.index + delta;
  if (i < 0 || i > p.moves.length) return true;
  p.index = i;
  app.refresh();
  return true;
}

export function navigate(act) {
  if (app.editing) return;
  if (app.preview && (act === 'prev' || act === 'next')) { previewStep(act === 'next' ? 1 : -1); return; }
  if (app.preview && (act === 'first' || act === 'last')) { app.preview.index = act === 'first' ? 0 : app.preview.moves.length; app.refresh(); return; }
  const n = app.node;
  if (act === 'prev' && n.parent) app.goto(n.parent);
  else if (act === 'next' && n.children[0]) app.goto(n.children[0]);
  else if (act === 'first') app.goto(app.tree.root);
  else if (act === 'last') { let m = n; while (m.children[0]) m = m.children[0]; app.goto(m); }
}

function undo() {
  if (app.preview) { app.preview = null; app.refresh(); return; }
  const n = app.node;
  if (!n.parent) return;
  if (!n.children.length) {
    app.redoStack.push({ parentId: n.parent.id, uci: n.uci });
    const parent = n.parent;
    app.tree.removeNode(n);
    app.emit('tree');
    app.goto(parent);
  } else {
    app.redoStack.push({ parentId: n.parent.id, uci: n.uci, navOnly: true });
    app.goto(n.parent);
  }
}

function redo() {
  const r = app.redoStack[app.redoStack.length - 1];
  if (r && r.parentId === app.node.id) {
    app.redoStack.pop();
    const node = app.tree.addMove(app.node, r.uci);
    if (!r.navOnly) app.emit('tree');
    app.goto(node);
  } else if (app.node.children[0]) {
    app.goto(app.node.children[0]);
  }
}

// ---------------------------------------------------------------- FEN / PGN
function loadFen(text) {
  const v = validatePosition(text);
  if (!v.ok) { $('#fen-error').textContent = v.error; return false; }
  app.newGameFromFen(v.fen);
  app.toast('Position loaded');
  return true;
}

export function importPgnText(text, { source = 'pasted text' } = {}) {
  const { games, errors } = parsePgn(text);
  const errEl = $('#pgn-error');
  errEl.innerHTML = errors.map((e) => escapeHtml(e.message)).join('<br>');
  if (!games.length) {
    if (!errors.length) errEl.textContent = 'No games found.';
    return false;
  }
  app.games = games;
  app.loadTree(games[0].tree, { gameIndex: 0 });
  renderGamePicker();
  const warn = games[0].warnings.length ? ` (${games[0].warnings.join(' ')})` : '';
  app.toast(`Imported ${games.length} game${games.length > 1 ? 's' : ''} from ${source}${errors.length ? `, ${errors.length} with errors` : ''}${warn}`, 3500);
  return true;
}

function renderGamePicker() {
  const el = $('#game-picker');
  if (app.games.length < 2) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="label">${app.games.length} games in file</div>` + app.games.map((g, i) => {
    const h = g.headers;
    const title = `${i + 1}. ${h.White || '?'} – ${h.Black || '?'} ${g.result}${h.Event && h.Event !== '?' ? ` · ${h.Event}` : ''}${h.Date && !h.Date.startsWith('?') ? ` · ${h.Date}` : ''}`;
    return `<button data-game="${i}" class="${i === app.gameIndex ? 'current' : ''}">${escapeHtml(title)}</button>`;
  }).join('');
}

// ---------------------------------------------------------------- engine pill
function updatePill() {
  const pill = $('#engine-pill');
  const e = app.engine;
  let state = e.state;
  let text = 'Engine off';
  if (e.state === 'loading') text = app.engineLoadText || 'Loading Stockfish 19…';
  else if (e.state === 'ready') { text = e.busy ? `${e.id.name} · thinking` : `${e.id.name} · ready`; if (e.busy) state = 'busy'; }
  else if (e.state === 'error') text = 'Engine error';
  pill.dataset.state = state;
  pill.querySelector('.pill-text').textContent = text;
}

// ---------------------------------------------------------------- init
function initBoard() {
  app.board = new Board($('#board'), {
    onMove: (from, to, promotion) => {
      const node = app.playMove({ from, to, promotion });
      if (!node) app.refresh();
    },
  });
  if (app.prefs.orientation === 'b') app.board.setOrientation('b');
}

function sizeBoard() {
  // Let CSS decide on small screens; on desktop fit the board to the viewport height.
  const wrap = document.querySelector('.board-wrap');
  if (!wrap) return;
  if (window.innerWidth <= 1100) { document.documentElement.style.removeProperty('--board-size'); return; }
  const side = Math.min(520, Math.max(340, window.innerWidth * 0.34));
  const byW = window.innerWidth - side - 32 - 18 - 40;
  const byH = window.innerHeight - 250;
  document.documentElement.style.setProperty('--board-size', `${Math.max(300, Math.min(byW, byH, 900))}px`);
}

function bindUi() {
  document.querySelectorAll('.tabs [role=tab]').forEach((t) => t.addEventListener('click', (e) => {
    app.setView(t.dataset.view);
    // After a mouse click, give the arrow keys back to move navigation.
    if (e.detail > 0) t.blur();
  }));
  $('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = [...document.querySelectorAll('.tabs [role=tab]')];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    next.click();
    e.preventDefault();
  });
  document.querySelector('.board-controls').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (['first', 'prev', 'next', 'last'].includes(act)) navigate(act);
    else if (act === 'flip') { app.board.flip(); app.savePrefs({ orientation: app.board.orientation }); app.emit('flip'); renderPlayers(); }
    else if (act === 'undo') undo();
    else if (act === 'redo') redo();
    else if (act === 'reset') { app.games = []; renderGamePicker(); app.newGameFromFen(START_FEN); }
    else if (act === 'edit') app.startEditing?.();
  });
  const onMoveClick = (e) => {
    const b = e.target.closest('[data-node]');
    if (!b) return;
    app.goto(app.tree.get(Number(b.dataset.node)));
  };
  $('#movelist').addEventListener('click', onMoveClick);
  $('#review-movelist').addEventListener('click', onMoveClick);
  $('#preview-bar').addEventListener('click', (e) => {
    const a = e.target.closest('button')?.dataset.p;
    if (a === 'back') previewStep(-1);
    else if (a === 'fwd') previewStep(1);
    else if (a === 'exit') { app.preview = null; app.refresh(); }
    else if (a === 'add') { app.commitPreview(); app.emit('tree'); app.refresh(); }
  });
  $('#promote-var').addEventListener('click', () => {
    let n = app.node;
    while (n.parent && n.parent.children[0] === n) n = n.parent;
    if (!n.parent) { app.toast('Already on the main line'); return; }
    app.tree.promoteVariation(n);
    app.emit('tree');
    app.refresh();
  });
  $('#delete-var').addEventListener('click', () => {
    const n = app.node;
    if (!n.parent) return;
    const parent = n.parent;
    app.tree.removeNode(n);
    app.emit('tree');
    app.goto(parent);
  });

  $('#move-entry').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#move-input');
    const t = input.value.trim();
    if (!t) return;
    const node = app.playMove(t);
    if (node) input.value = '';
  });

  $('#fen-load').addEventListener('click', () => loadFen($('#fen-input').value));
  $('#fen-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') loadFen(e.target.value); });
  $('#fen-copy').addEventListener('click', () => copyText(app.currentFen(), 'FEN copied'));
  $('#pgn-load').addEventListener('click', () => importPgnText($('#pgn-input').value));
  $('#pgn-file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const text = await f.text();
    $('#pgn-input').value = text.length < 200000 ? text : '';
    importPgnText(text, { source: f.name });
    e.target.value = '';
  });
  $('#pgn-export').addEventListener('click', () => {
    const blob = new Blob([treeToPgn(app.tree)], { type: 'application/x-chess-pgn' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'game.pgn';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#pgn-copy').addEventListener('click', () => copyText(treeToPgn(app.tree), 'PGN copied'));
  $('#game-picker').addEventListener('click', (e) => {
    const b = e.target.closest('[data-game]');
    if (!b) return;
    const i = Number(b.dataset.game);
    app.loadTree(app.games[i].tree, { gameIndex: i });
    renderGamePicker();
  });

  $('#theme-toggle').addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('ca.theme', t); } catch { /* ignore */ }
  });
  $('#help-btn').addEventListener('click', () => {
    $('#engine-log').textContent = app.engine.log.slice(-200).join('\n') || '(no engine output yet)';
    $('#help-dialog').showModal();
  });
  $('#engine-pill').addEventListener('click', () => {
    if (app.view !== 'analysis' && app.view !== 'review') app.setView('analysis');
    $('#help-btn').click();
  });

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
    if (document.querySelector('dialog[open]')) return;
    if (app.view === 'learn') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const map = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowUp: 'first', ArrowDown: 'last', Home: 'first', End: 'last' };
    if (map[e.key]) { e.preventDefault(); navigate(map[e.key]); }
    else if (e.key === 'f' || e.key === 'F') { app.board.flip(); app.savePrefs({ orientation: app.board.orientation }); app.emit('flip'); renderPlayers(); }
    else if (e.key === 'Escape' && app.preview) { app.preview = null; app.refresh(); }
    else if (e.key === ' ' && tag !== 'button') { e.preventDefault(); app.toggleAnalysis?.(); }
  });
  window.addEventListener('resize', sizeBoard);
}

export async function copyText(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    app.toast(msg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    app.toast(ok ? msg : 'Copy failed — select the text manually');
  }
}

async function loadBook() {
  try {
    app.book = await OpeningBook.load('data/openings.json');
    app.bookError = null;
  } catch (e) {
    app.book = null;
    app.bookError = e.message;
  }
  app.emit('book');
}

function init() {
  app.node = app.tree.root;
  initBoard();
  bindUi();
  sizeBoard();
  app.engine = new EngineClient({ workerUrl: 'engine/engine-worker.js', arch: app.prefs.engineArch || 'auto' });
  app.engine.on((ev) => {
    if (ev.type === 'progress') {
      app.engineLoadText = `Loading network ${Math.round((ev.loaded / (ev.total || ev.loaded || 1)) * 100)}%`;
    }
    if (ev.type === 'state' || ev.type === 'progress' || ev.type === 'search-start' || ev.type === 'search-end') updatePill();
  });
  initAnalysis(app);
  initCounter(app);
  initReview(app);
  initOpenings(app);
  initEditor(app);
  initLearn(app);
  loadBook();
  if (!window.crossOriginIsolated) {
    app.banner('This page is not <strong>cross-origin isolated</strong>, so the Stockfish 19 engine cannot run. Start the app with <code>Launch Chess Analysis.command</code> (or <code>python3 serve.py</code>) instead of opening <code>index.html</code> directly. Everything that does not need the engine still works.');
  }
  app.setView(['analysis', 'review', 'openings', 'learn'].includes(app.prefs.view) ? app.prefs.view : 'analysis');
  updatePill();
  window.__app = app; // for automated tests and debugging
}

init();
