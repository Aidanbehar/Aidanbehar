// Interactive chessboard: click-to-move, drag-and-drop, legal-destination hints,
// last-move / selection / check highlights, promotion picker, arrows, flipping,
// and a free-placement mode for the position editor.
import { FILES, squareCoords } from './chess-util.js';

const PIECE_URL = (color, type) => `assets/pieces/${color}${type.toUpperCase()}.svg`;
const PIECE_NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

export function parsePlacement(fen) {
  const map = new Map();
  const rows = fen.split(' ')[0].split('/');
  rows.forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch);
      else {
        map.set(FILES[f] + (8 - r), { color: ch === ch.toUpperCase() ? 'w' : 'b', type: ch.toLowerCase() });
        f++;
      }
    }
  });
  return map;
}

export function placementToFen(map) {
  const rows = [];
  for (let r = 8; r >= 1; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = map.get(FILES[f] + r);
      if (!p) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += p.color === 'w' ? p.type.toUpperCase() : p.type;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/');
}

export class Board {
  constructor(el, opts = {}) {
    this.el = el;
    this.opts = opts;
    this.orientation = 'w';
    this.pieces = new Map();
    this.dests = new Map(); // from -> [{to, promotion}]
    this.selected = null;
    this.lastMove = null;
    this.checkSquare = null;
    this.arrows = [];
    this.marks = new Map(); // square -> class
    this.mode = opts.mode || 'play'; // play | view | edit
    this.turnColor = 'w';
    this.build();
  }

  build() {
    this.el.classList.add('board');
    this.el.innerHTML = '';
    this.el.setAttribute('role', 'grid');
    this.el.setAttribute('aria-label', 'Chessboard');
    this.squaresEl = document.createElement('div');
    this.squaresEl.className = 'board-squares';
    this.el.appendChild(this.squaresEl);
    this.sqEls = new Map();
    for (let i = 0; i < 64; i++) {
      const d = document.createElement('div');
      d.className = 'sq';
      this.squaresEl.appendChild(d);
    }
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', '0 0 8 8');
    this.svg.classList.add('board-arrows');
    this.el.appendChild(this.svg);
    this.promoEl = document.createElement('div');
    this.promoEl.className = 'promo hidden';
    this.el.appendChild(this.promoEl);

    this.el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.mode === 'edit') {
        const sq = this.squareAt(e.clientX, e.clientY);
        if (sq) this.opts.onEditRemove?.(sq);
      }
    });
    this.layout();
  }

  layout() {
    const els = [...this.squaresEl.children];
    this.sqEls.clear();
    for (let i = 0; i < 64; i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const file = this.orientation === 'w' ? col : 7 - col;
      const rank = this.orientation === 'w' ? 7 - row : row;
      const sq = FILES[file] + (rank + 1);
      const d = els[i];
      d.dataset.sq = sq;
      d.className = `sq ${(file + rank) % 2 === 0 ? 'dark' : 'light'}`;
      d.setAttribute('role', 'gridcell');
      d.innerHTML = '';
      if (col === 0) { const s = document.createElement('span'); s.className = 'coord rank'; s.textContent = rank + 1; d.appendChild(s); }
      if (row === 7) { const s = document.createElement('span'); s.className = 'coord file'; s.textContent = FILES[file]; d.appendChild(s); }
      this.sqEls.set(sq, d);
    }
    this.render();
  }

  setOrientation(color) { if (color !== this.orientation) { this.orientation = color; this.layout(); } }
  flip() { this.setOrientation(this.orientation === 'w' ? 'b' : 'w'); }

  /**
   * Update the displayed state.
   *   fen, lastMove {from,to}, check (square|null), dests Map, turnColor,
   *   movable (bool), arrows [{from,to,color,width}]
   */
  set(state) {
    if (state.fen !== undefined) this.pieces = parsePlacement(state.fen);
    if (state.pieces) this.pieces = new Map(state.pieces);
    if ('lastMove' in state) this.lastMove = state.lastMove;
    if ('check' in state) this.checkSquare = state.check;
    if ('dests' in state) this.dests = state.dests || new Map();
    if ('turnColor' in state) this.turnColor = state.turnColor;
    if ('arrows' in state) this.arrows = state.arrows || [];
    if ('marks' in state) this.marks = state.marks || new Map();
    if ('mode' in state) this.mode = state.mode;
    if (state.fen !== undefined || state.pieces) {
      if (this.selected && !this.dests.has(this.selected)) this.selected = null;
      this.hidePromotion();
    }
    this.render();
  }

  render() {
    for (const [sq, d] of this.sqEls) {
      d.classList.remove('last', 'selected', 'check', 'dest', 'capture-dest', 'mark-good', 'mark-bad', 'mark-info');
      const old = d.querySelector('.piece');
      if (old) old.remove();
      const p = this.pieces.get(sq);
      if (p) {
        const pe = document.createElement('div');
        pe.className = `piece ${p.color}${p.type}`;
        pe.style.backgroundImage = `url("${PIECE_URL(p.color, p.type)}")`;
        d.appendChild(pe);
        d.setAttribute('aria-label', `${sq} ${p.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[p.type]}`);
      } else {
        d.setAttribute('aria-label', sq);
      }
      const mark = this.marks.get(sq);
      if (mark) d.classList.add(`mark-${mark}`);
    }
    if (this.lastMove) {
      this.sqEls.get(this.lastMove.from)?.classList.add('last');
      this.sqEls.get(this.lastMove.to)?.classList.add('last');
    }
    if (this.checkSquare) this.sqEls.get(this.checkSquare)?.classList.add('check');
    if (this.selected) {
      this.sqEls.get(this.selected)?.classList.add('selected');
      for (const m of this.dests.get(this.selected) || []) {
        this.sqEls.get(m.to)?.classList.add(this.pieces.has(m.to) ? 'capture-dest' : 'dest');
      }
    }
    this.renderArrows();
  }

  renderArrows() {
    const ns = 'http://www.w3.org/2000/svg';
    this.svg.innerHTML = '';
    const defs = document.createElementNS(ns, 'defs');
    this.svg.appendChild(defs);
    const center = (sq) => {
      const { file, rank } = squareCoords(sq);
      const x = this.orientation === 'w' ? file : 7 - file;
      const y = this.orientation === 'w' ? 7 - rank : rank;
      return [x + 0.5, y + 0.5];
    };
    this.arrows.forEach((a, i) => {
      const color = a.color || 'var(--arrow)';
      const id = `ah${i}`;
      const marker = document.createElementNS(ns, 'marker');
      marker.setAttribute('id', id);
      marker.setAttribute('orient', 'auto');
      marker.setAttribute('markerWidth', '4');
      marker.setAttribute('markerHeight', '4');
      marker.setAttribute('refX', '2.05');
      marker.setAttribute('refY', '2');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M0,0 V4 L3,2 Z');
      path.setAttribute('fill', color);
      marker.appendChild(path);
      defs.appendChild(marker);
      const [x1, y1] = center(a.from);
      const [x2, y2] = center(a.to);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const shorten = 0.35;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', x1 + (dx / len) * 0.2);
      line.setAttribute('y1', y1 + (dy / len) * 0.2);
      line.setAttribute('x2', x2 - (dx / len) * shorten);
      line.setAttribute('y2', y2 - (dy / len) * shorten);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', a.width || 0.16);
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('marker-end', `url(#${id})`);
      line.setAttribute('opacity', a.opacity ?? 0.85);
      this.svg.appendChild(line);
    });
  }

  squareAt(x, y) {
    const r = this.squaresEl.getBoundingClientRect();
    if (x < r.left || y < r.top || x >= r.right || y >= r.bottom) return null;
    const col = Math.floor(((x - r.left) / r.width) * 8);
    const row = Math.floor(((y - r.top) / r.height) * 8);
    const file = this.orientation === 'w' ? col : 7 - col;
    const rank = this.orientation === 'w' ? 7 - row : row;
    return FILES[file] + (rank + 1);
  }

  canMoveFrom(sq) {
    if (this.mode === 'edit') return this.pieces.has(sq);
    if (this.mode !== 'play') return false;
    const p = this.pieces.get(sq);
    return !!p && p.color === this.turnColor && this.dests.has(sq);
  }

  onPointerDown(e) {
    if (e.button !== 0) return;
    if (!this.promoEl.classList.contains('hidden')) return;
    const sq = this.squareAt(e.clientX, e.clientY);
    if (!sq) return;
    if (this.mode === 'edit' && this.opts.onEditClick && this.opts.editTool?.() !== 'move') {
      e.preventDefault();
      this.opts.onEditClick(sq);
      return;
    }
    // Clicking a destination of the selected piece moves it.
    if (this.selected && this.selected !== sq && this.isDest(this.selected, sq)) {
      e.preventDefault();
      this.tryMove(this.selected, sq);
      return;
    }
    if (!this.canMoveFrom(sq)) {
      if (this.selected) { this.selected = null; this.render(); }
      return;
    }
    e.preventDefault();
    const wasSelected = this.selected === sq;
    this.selected = sq;
    this.render();
    this.startDrag(e, sq, wasSelected);
  }

  isDest(from, to) {
    if (this.mode === 'edit') return true;
    return (this.dests.get(from) || []).some((m) => m.to === to);
  }

  startDrag(e, from, wasSelected) {
    const pieceEl = this.sqEls.get(from).querySelector('.piece');
    if (!pieceEl) return;
    const size = this.squaresEl.getBoundingClientRect().width / 8;
    let ghost = null;
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
      if (!ghost) {
        ghost = pieceEl.cloneNode(true);
        ghost.classList.add('ghost');
        ghost.style.width = `${size}px`;
        ghost.style.height = `${size}px`;
        document.body.appendChild(ghost);
        pieceEl.classList.add('dragging');
      }
      ghost.style.transform = `translate(${ev.clientX - size / 2}px, ${ev.clientY - size / 2}px)`;
      const over = this.squareAt(ev.clientX, ev.clientY);
      for (const d of this.sqEls.values()) d.classList.toggle('hover', d.dataset.sq === over && over !== from);
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      for (const d of this.sqEls.values()) d.classList.remove('hover');
      const dragged = !!ghost;
      if (ghost) ghost.remove();
      pieceEl.classList.remove('dragging');
      const to = this.squareAt(ev.clientX, ev.clientY);
      if (!dragged) {
        if (wasSelected) { this.selected = null; this.render(); }
        return;
      }
      if (this.mode === 'edit') {
        this.selected = null;
        if (!to) this.opts.onEditRemove?.(from);
        else if (to !== from) this.opts.onEditMove?.(from, to);
        else this.render();
        return;
      }
      if (to && to !== from && this.isDest(from, to)) this.tryMove(from, to);
      else if (to === from) this.render();
      else { this.selected = null; this.render(); }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  tryMove(from, to) {
    const options = (this.dests.get(from) || []).filter((m) => m.to === to);
    this.selected = null;
    if (options.some((m) => m.promotion)) {
      this.showPromotion(from, to, options.map((m) => m.promotion));
      return;
    }
    this.render();
    this.opts.onMove?.(from, to);
  }

  showPromotion(from, to, choices) {
    const color = this.pieces.get(from)?.color || this.turnColor;
    this.promoEl.innerHTML = '';
    this.promoEl.classList.remove('hidden');
    const box = document.createElement('div');
    box.className = 'promo-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Choose promotion piece');
    for (const t of ['q', 'r', 'b', 'n'].filter((x) => choices.includes(x))) {
      const b = document.createElement('button');
      b.className = 'promo-btn';
      b.title = PIECE_NAMES[t];
      b.setAttribute('aria-label', `Promote to ${PIECE_NAMES[t]}`);
      b.style.backgroundImage = `url("${PIECE_URL(color, t)}")`;
      b.addEventListener('click', (e) => { e.stopPropagation(); this.hidePromotion(); this.render(); this.opts.onMove?.(from, to, t); });
      box.appendChild(b);
    }
    const cancel = document.createElement('button');
    cancel.className = 'promo-cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', (e) => { e.stopPropagation(); this.hidePromotion(); this.render(); });
    box.appendChild(cancel);
    this.promoEl.appendChild(box);
    box.querySelector('button')?.focus();
  }

  hidePromotion() { this.promoEl.classList.add('hidden'); this.promoEl.innerHTML = ''; }
}

/** Build a dests Map (from -> [{to, promotion}]) from a chess.js instance. */
export function destsFromChess(chess) {
  const dests = new Map();
  for (const m of chess.moves({ verbose: true })) {
    if (!dests.has(m.from)) dests.set(m.from, []);
    dests.get(m.from).push({ to: m.to, promotion: m.promotion });
  }
  return dests;
}

/** Square of the king of the side to move if it is in check, else null. */
export function checkSquare(chess) {
  if (!chess.isCheck()) return null;
  return chess.findPiece({ type: 'k', color: chess.turn() })[0] || null;
}
