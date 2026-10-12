// Position editor: free piece placement, side to move, castling rights,
// en passant square, move counters, FEN import/export, with validation.
import { START_FEN, validatePosition, FILES } from './chess-util.js';
import { parsePlacement, placementToFen } from './board.js';
import { copyText } from './app.js';

const $ = (s) => document.querySelector(s);
const PIECES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];

export function initEditor(app) {
  const panel = $('#editor-panel');
  const palette = $('#palette');
  const err = $('#ed-error');
  const fenInput = $('#ed-fen');
  let pieces = new Map();
  let tool = 'move'; // 'move' | 'delete' | 'wK' ...

  palette.innerHTML = PIECES.map((p) => `<button data-tool="${p}" title="${p[0] === 'w' ? 'White' : 'Black'} ${({ K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' })[p[1]]}" aria-label="${p[0] === 'w' ? 'White' : 'Black'} ${({ K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' })[p[1]]}" style="background-image:url('assets/pieces/${p}.svg')"></button>`).join('')
    + '<button data-tool="move" class="tool-text" title="Move pieces by dragging">Move</button><button data-tool="delete" class="tool-text" title="Click pieces to delete them">Delete</button>';
  const epSel = $('#ed-ep');

  function setTool(t) {
    tool = t;
    palette.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
  }
  palette.addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });

  function turn() { return document.querySelector('input[name=ed-turn]:checked').value; }

  function buildFen() {
    let castling = ['K', 'Q', 'k', 'q'].filter((f) => $(`#ed-${f}`).checked).join('') || '-';
    const ep = epSel.value || '-';
    const half = Math.max(0, Number($('#ed-half').value) || 0);
    const full = Math.max(1, Number($('#ed-full').value) || 1);
    return `${placementToFen(pieces)} ${turn()} ${castling} ${ep} ${half} ${full}`;
  }

  function fillEp() {
    const t = turn();
    const rank = t === 'w' ? '6' : '3';
    const keep = epSel.value;
    epSel.innerHTML = '<option value="-">none</option>' + [...FILES].map((f) => `<option value="${f}${rank}">${f}${rank}</option>`).join('');
    epSel.value = [...epSel.options].some((o) => o.value === keep) ? keep : '-';
  }

  function update({ fromFenInput = false } = {}) {
    fillEp();
    const fen = buildFen();
    if (!fromFenInput) fenInput.value = fen;
    const v = validatePosition(fen);
    err.textContent = v.ok ? '' : v.error;
    $('#ed-apply').disabled = !v.ok;
    app.board.set({ pieces, lastMove: null, check: null, dests: new Map(), arrows: [], marks: new Map(), mode: 'edit' });
    return v;
  }

  function loadFenIntoEditor(fen) {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 1 || !parts[0].includes('/')) { err.textContent = 'Invalid FEN: the piece-placement field is missing.'; return false; }
    const rows = parts[0].split('/');
    if (rows.length !== 8 || rows.some((r) => [...r].reduce((s, c) => s + (/\d/.test(c) ? +c : /[pnbrqkPNBRQK]/.test(c) ? 1 : 99), 0) !== 8)) {
      err.textContent = 'Invalid FEN: the placement field must have 8 ranks of 8 squares using only pnbrqk/PNBRQK and digits.';
      return false;
    }
    pieces = parsePlacement(parts[0]);
    document.querySelector(`input[name=ed-turn][value=${parts[1] === 'b' ? 'b' : 'w'}]`).checked = true;
    const c = parts[2] || '-';
    for (const f of ['K', 'Q', 'k', 'q']) $(`#ed-${f}`).checked = c.includes(f);
    fillEp();
    epSel.value = parts[3] && parts[3] !== '-' ? parts[3] : '-';
    $('#ed-half').value = parts[4] || 0;
    $('#ed-full').value = parts[5] || 1;
    update();
    return true;
  }

  app.board.opts.editTool = () => tool;
  app.board.opts.onEditClick = (sq) => {
    if (!app.editing) return;
    if (tool === 'delete') pieces.delete(sq);
    else {
      const p = { color: tool[0], type: tool[1].toLowerCase() };
      const cur = pieces.get(sq);
      if (cur && cur.color === p.color && cur.type === p.type) pieces.delete(sq);
      else pieces.set(sq, p);
    }
    update();
  };
  app.board.opts.onEditMove = (from, to) => {
    if (!app.editing) return;
    const p = pieces.get(from);
    pieces.delete(from);
    pieces.set(to, p);
    update();
  };
  app.board.opts.onEditRemove = (sq) => { if (app.editing) { pieces.delete(sq); update(); } };

  app.startEditing = () => {
    if (app.view !== 'analysis') app.setView('analysis');
    app.analysisStop?.();
    app.editing = true;
    document.body.classList.add('editing');
    panel.classList.remove('hidden');
    setTool('move');
    loadFenIntoEditor(app.currentFen());
    panel.querySelector('button').focus();
  };
  function finish() {
    app.editing = false;
    document.body.classList.remove('editing');
    panel.classList.add('hidden');
  }
  app.cancelEditing = () => { finish(); app.refresh(); app.renderBoardOverlays(); };

  document.querySelectorAll('input[name=ed-turn]').forEach((r) => r.addEventListener('change', () => { epSel.value = '-'; update(); }));
  for (const f of ['K', 'Q', 'k', 'q']) $(`#ed-${f}`).addEventListener('change', () => update());
  epSel.addEventListener('change', () => update());
  $('#ed-half').addEventListener('change', () => update());
  $('#ed-full').addEventListener('change', () => update());
  $('#ed-fen-load').addEventListener('click', () => { loadFenIntoEditor(fenInput.value); });
  fenInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadFenIntoEditor(fenInput.value); });
  $('#ed-fen-copy').addEventListener('click', () => copyText(buildFen(), 'FEN copied'));
  $('#ed-start').addEventListener('click', () => loadFenIntoEditor(START_FEN));
  $('#ed-clear').addEventListener('click', () => { pieces = new Map(); for (const f of ['K', 'Q', 'k', 'q']) $(`#ed-${f}`).checked = false; update(); });
  $('#ed-flip').addEventListener('click', () => { app.board.flip(); app.savePrefs({ orientation: app.board.orientation }); });
  $('#ed-cancel').addEventListener('click', () => app.cancelEditing());
  $('#ed-apply').addEventListener('click', () => {
    const v = update();
    if (!v.ok) return;
    finish();
    app.newGameFromFen(v.fen);
    app.toast('Position set');
  });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') app.cancelEditing(); });
}
