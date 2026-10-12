// Game tree with variations. Every node holds the FEN reached after its move, so
// the board, move list and engine analysis always refer to the same position.
import { Chess, parseUci } from './chess-util.js';

let nextId = 1;

export class GameTree {
  constructor(startFen, headers = {}) {
    const c = new Chess(startFen);
    this.headers = { ...headers };
    this.root = {
      id: nextId++, parent: null, children: [], ply: 0, fen: c.fen(), san: null, uci: null,
      comment: '', nags: [], startComment: '',
    };
    this.startFen = this.root.fen;
    this.byId = new Map([[this.root.id, this.root]]);
  }

  /** Add (or reuse) a child of `parent` for `move` ({from,to,promotion} | SAN | UCI). */
  addMove(parent, move) {
    const c = new Chess(parent.fen);
    // Re-create history so threefold-repetition detection works along the path.
    let m;
    try {
      m = typeof move === 'string'
        ? (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move) ? c.move(parseUci(move)) : c.move(move))
        : c.move(move);
    } catch {
      return null;
    }
    const uci = m.from + m.to + (m.promotion || '');
    const existing = parent.children.find((ch) => ch.uci === uci);
    if (existing) return existing;
    const node = {
      id: nextId++, parent, children: [], ply: parent.ply + 1, fen: m.after, san: m.san, uci,
      color: m.color, from: m.from, to: m.to, captured: m.captured || null, flags: m.flags,
      comment: '', nags: [],
    };
    parent.children.push(node);
    this.byId.set(node.id, node);
    return node;
  }

  removeNode(node) {
    if (!node.parent) return;
    const sibs = node.parent.children;
    sibs.splice(sibs.indexOf(node), 1);
    const drop = (n) => { this.byId.delete(n.id); n.children.forEach(drop); };
    drop(node);
  }

  promoteVariation(node) {
    const p = node.parent;
    if (!p) return;
    const i = p.children.indexOf(node);
    if (i > 0) { p.children.splice(i, 1); p.children.unshift(node); }
  }

  get(id) { return this.byId.get(id) || null; }

  /** Nodes from the root (excluded) to `node` (included). */
  path(node) {
    const out = [];
    for (let n = node; n && n.parent; n = n.parent) out.push(n);
    return out.reverse();
  }

  mainline() {
    const out = [];
    for (let n = this.root.children[0]; n; n = n.children[0]) out.push(n);
    return out;
  }

  isMainline(node) {
    for (let n = node; n.parent; n = n.parent) if (n.parent.children[0] !== n) return false;
    return true;
  }

  /** A chess.js instance positioned at `node` with full move history (for repetition rules). */
  chessAt(node) {
    const c = new Chess(this.startFen);
    for (const n of this.path(node)) c.move(parseUci(n.uci));
    return c;
  }

  /** Move number label of a node ("12." for white, "12…" for black). */
  static moveNumber(node) {
    const full = Number(node.parent.fen.split(' ')[5]);
    return { full, white: node.color === 'w' };
  }
}
