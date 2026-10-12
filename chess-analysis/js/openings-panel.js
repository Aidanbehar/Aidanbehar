// Openings view + the compact opening line in the Analysis panel.
import { Chess, pvToSan } from './chess-util.js';
import { GameTree } from './tree.js';
import { escapeHtml } from './app.js';

const $ = (s) => document.querySelector(s);

export function initOpenings(app) {
  const detail = $('#opening-detail');
  const conts = $('#opening-continuations');
  const search = $('#opening-search');
  const results = $('#opening-results');
  const compact = $('#opening-line');

  function sanSeq(uciList, matched) {
    const san = pvToSan(new Chess().fen(), uciList);
    return san.map((m, i) => {
      const num = i % 2 === 0 ? `${i / 2 + 1}. ` : '';
      return `<span class="${i < matched ? 'matched' : ''}">${num}${escapeHtml(m.san)}</span>`;
    }).join(' ');
  }

  function render() {
    if (app.bookError) {
      const msg = `<span class="error-text">Opening database unavailable: ${escapeHtml(app.bookError)} Opening names cannot be shown.</span>`;
      detail.innerHTML = msg;
      compact.innerHTML = msg;
      conts.innerHTML = '';
      return;
    }
    if (!app.book) { detail.innerHTML = '<span class="muted">Loading opening database…</span>'; compact.innerHTML = ''; return; }
    const moves = app.currentMoves();
    const id = app.book.identify(app.tree.startFen, moves, app.currentFen());
    let html = '';
    let line = '';
    if (id.status === 'not-applicable') {
      html = '<p class="muted">This game starts from a custom position, so it cannot be matched against opening move sequences.</p>';
      line = '';
    } else if (id.status === 'start') {
      html = '<p class="muted">Starting position. Play a move (or pick a book continuation below) to identify the opening.</p>';
    } else if (id.status === 'none') {
      html = `<p>No database line matches the first move${moves.length > 1 ? 's' : ''} of this game.</p>`;
      line = '<span class="muted">Opening: not in database</span>';
    } else {
      const e = id.entry;
      const statusText = id.status === 'exact'
        ? '<span class="badge-status exact" title="The moves played so far are exactly a named database line">Exact sequence match</span>'
        : `<span class="badge-status" title="The game has left the named line; this is the deepest named line that the game followed">Broader classification · matched ${id.matchedPlies} of ${moves.length} plies</span>`;
      html = `<p><span class="eco">${escapeHtml(e.eco)}</span> <strong data-testid="opening-name">${escapeHtml(e.family)}</strong>${statusText}</p>
        ${e.variation ? `<p>Variation: <strong>${escapeHtml(e.variation)}</strong></p>` : ''}
        <p class="seq small">Database line: ${sanSeq(e.uci.split(' '), id.matchedPlies)}</p>
        ${!id.inBook ? `<p class="muted small">The game left the database after ${id.matchedPlies} plies of this line${moves.length > id.matchedPlies ? '' : ''}.</p>` : id.status !== 'exact' ? '<p class="muted small">The current sequence is part of longer database lines (see continuations).</p>' : ''}`;
      line = `<span class="eco">${escapeHtml(e.eco)}</span>${escapeHtml(e.name)} <span class="muted small">(${id.status === 'exact' ? 'exact' : 'classification'})</span>`;
    }
    if (id.transposition) {
      const t = id.transposition;
      html += `<p class="small">Transposition: the current position also arises in <span class="eco">${escapeHtml(t.eco)}</span>${escapeHtml(t.name)} (different move order).</p>`;
    }
    detail.innerHTML = html;
    compact.innerHTML = line;
    if (id.continuations && id.continuations.length) {
      const fen = app.currentFen();
      conts.innerHTML = id.continuations.slice(0, 40).map((c) => {
        const san = pvToSan(fen, [c.uci])[0]?.san || c.uci;
        return `<button data-uci="${c.uci}"><span class="san">${escapeHtml(san)}</span><span>${c.entry ? `<span class="eco">${escapeHtml(c.entry.eco)}</span>${escapeHtml(c.entry.name)}` : '<span class="muted">(continues to named lines)</span>'}</span><span class="muted small" style="margin-left:auto">${c.lines} line${c.lines > 1 ? 's' : ''}</span></button>`;
      }).join('');
    } else conts.innerHTML = `<div class="empty-state">${id.status === 'not-applicable' ? 'Not available for custom start positions.' : 'No database continuations from here.'}</div>`;
  }

  conts.addEventListener('click', (e) => {
    const b = e.target.closest('[data-uci]');
    if (b) app.playMove(b.dataset.uci);
  });

  function doSearch() {
    if (!app.book) { results.innerHTML = ''; return; }
    const r = app.book.search(search.value);
    results.innerHTML = r.map((e, i) => `<li><button data-i="${i}"><span class="eco">${escapeHtml(e.eco)}</span>${escapeHtml(e.name)}<br><span class="muted small">${escapeHtml(e.pgn)}</span></button></li>`).join('')
      || (search.value.trim() ? '<li class="empty-state">No matches.</li>' : '');
    results._data = r;
  }
  search.addEventListener('input', doSearch);
  results.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const entry = results._data[Number(b.dataset.i)];
    const tree = new GameTree(new Chess().fen(), { Event: `${entry.eco} ${entry.name}` });
    let n = tree.root;
    for (const u of entry.uci.split(' ')) n = tree.addMove(n, u);
    app.games = [];
    app.loadTree(tree);
    app.goto(n);
  });

  app.onChange((k) => {
    if (k === 'book' && app.book) $('#opening-source').innerHTML = `Database: ${app.book.meta.count.toLocaleString()} named lines from <a href="${escapeHtml(app.book.meta.source)}" target="_blank" rel="noopener">lichess-org/chess-openings</a> (${escapeHtml(app.book.meta.license)}), stored locally.`;
    if (k === 'position' || k === 'book' || k === 'tree') render();
  });
  render();
}
