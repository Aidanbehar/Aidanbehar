/*
 * Feltroom: the "Play Against Cepheus" decision engine.
 * Loaded on demand (only when that mode is opened) together with cepheus-strategy.bin.
 *
 * The strategy file was computed offline with CFR+ (see poker-tools/cepheus) on the exact
 * betting tree of heads-up fixed-limit Hold'em used by Cepheus, with an abstraction of the
 * cards. It is an approximation, not Cepheus's own (unpublished, multi-terabyte) strategy.
 *
 * The engine only ever sees what a real player sees: its own two cards, the board, the
 * betting so far and its seat. Hand ranking is a port of rankCardset() and its tables
 * from the CFR_plus archive (University of Alberta, see LICENCE-CFR_plus.txt).
 */
(function () {
  'use strict';
  const RANKS = '23456789TJQKA', SUITS = 'shdc';
  const NROUNDS = 4, A_FOLD = 0, A_CALL = 1, A_RAISE = 2, CODE = 'fcr';
  const QUADS = [11934, 11947, 11960, 11973, 11986, 11999, 12012, 12025, 12038, 12051, 12064, 12077, 12090];
  const TRIPS = [8606, 8684, 8762, 8840, 8918, 8996, 9074, 9152, 9230, 9308, 9386, 9464, 9542];
  const PAIRS = [1287, 1573, 1859, 2145, 2431, 2717, 3003, 3289, 3575, 3861, 4147, 4433, 4719];
  const TWO_PAIR_OTHER = [3718, 3731, 3744, 3757, 3770, 3783, 3796, 3809, 3822, 3835, 3848, 3861, 3874];
  const FULL_HOUSE_OTHER = 10920 - 8606, STRAIGHT = 9620, STRAIGHT_FLUSH = 12103;

  class StrategyError extends Error {}

  function cardId(s) {
    const r = RANKS.indexOf(s[0]), u = SUITS.indexOf(s[1]);
    if (r < 0 || u < 0 || s.length !== 2) throw new StrategyError(`Bad card "${s}"`);
    return r * 4 + u;
  }
  function fnv(bytes, n) { let h = 2166136261 >>> 0; for (let i = 0; i < n; i++) { h ^= bytes[i]; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

  function parse(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    if (u8.length < 8 || String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== 'CPH1') throw new StrategyError('This is not a Cepheus strategy file (or it is an unsupported version).');
    if (fnv(u8, u8.length - 4) !== dv.getUint32(u8.length - 4, true)) throw new StrategyError('The strategy file is damaged (checksum mismatch). Reload the page to download it again.');
    let o = 4;
    const u16 = () => { const v = dv.getUint16(o, true); o += 2; return v; };
    const u8r = () => u8[o++];
    const ml = u16(); const meta = JSON.parse(new TextDecoder().decode(u8.subarray(o, o + ml))); o += ml;
    const blind = [u16(), u16()], raise = [], first = [], maxRaises = [], K = [];
    for (let r = 0; r < NROUNDS; r++) { raise.push(u16()); first.push(u8r()); maxRaises.push(u8r()); }
    for (let r = 0; r < NROUNDS; r++) K.push(u16());
    const thr = [null];
    for (let r = 1; r < NROUNDS; r++) { const t = new Float64Array(K[r] - 1); for (let j = 0; j < K[r] - 1; j++) { t[j] = dv.getFloat64(o, true); o += 8; } thr.push(t); }
    const nDec = []; for (let r = 0; r < NROUNDS; r++) { nDec.push(dv.getUint32(o, true)); o += 4; }
    const tab16 = () => { const a = new Uint16Array(8192); for (let i = 0; i < 8192; i++) { a[i] = dv.getUint16(o, true); o += 2; } return a; };
    const tab8 = () => { const a = u8.slice(o, o + 8192); o += 8192; return a; };
    const tables = { oneSuit: tab16(), pairOther: tab16(), anySuit: tab16(), topBit: tab8(), tripsOther: tab8() };
    return { meta, blind, raise, first, maxRaises, K, thr, nDec, tables, strat: u8, stratStart: o, end: u8.length - 4 };
  }

  /* The betting tree, built exactly like the solver builds it (same node order). */
  function buildTree(g) {
    const nodes = [], nDec = [0, 0, 0, 0];
    function build(round, s0, s1, raises, acted, player) {
      const id = nodes.length, n = { kind: 'dec', round, player, act: [], child: [], idx: nDec[round]++ };
      nodes.push(n);
      const mx = Math.max(s0, s1), sp = [s0, s1];
      if (sp[player] < mx) n.act.push(A_FOLD);
      n.act.push(A_CALL);
      if (raises < g.maxRaises[round]) n.act.push(A_RAISE);
      for (const a of n.act) {
        let c;
        if (a === A_FOLD) { c = nodes.length; nodes.push({ kind: 'fold' }); }
        else if (a === A_CALL) {
          const q = [s0, s1]; q[player] = mx;
          const ac = acted | (1 << player);
          if (ac === 3 && q[0] === q[1]) {
            if (round === NROUNDS - 1) { c = nodes.length; nodes.push({ kind: 'show' }); }
            else c = build(round + 1, q[0], q[1], 0, 0, g.first[round + 1]);
          } else c = build(round, q[0], q[1], raises, ac, 1 - player);
        } else {
          const q = [s0, s1]; q[player] = mx + g.raise[round];
          c = build(round, q[0], q[1], raises + 1, 1 << player, 1 - player);
        }
        n.child.push(c);
      }
      return id;
    }
    build(0, g.blind[0], g.blind[1], 0, 0, g.first[0]);
    return { nodes, nDec };
  }

  class Model {
    constructor(g) {
      this.g = g; this.meta = g.meta;
      const t = buildTree(g);
      for (let r = 0; r < NROUNDS; r++) if (t.nDec[r] !== g.nDec[r]) throw new StrategyError('The strategy file does not match this betting tree.');
      this.nodes = t.nodes;
      let off = g.stratStart;
      for (const n of this.nodes) if (n.kind === 'dec') { n.off = off; off += g.K[n.round] * (n.act.length - 1); }
      if (off !== g.end) throw new StrategyError('The strategy file has the wrong size for this betting tree.');
      this.cache = new Map();
      this.evals = 0;
    }

    /* rankCardset() from the archive, on four 13-bit suit masks */
    rank(m0, m1, m2, m3) {
      const T = this.g.tables; this.evals++;
      let post = T.oneSuit[m0];
      if (T.oneSuit[m1] > post) post = T.oneSuit[m1];
      if (T.oneSuit[m2] > post) post = T.oneSuit[m2];
      if (T.oneSuit[m3] > post) post = T.oneSuit[m3];
      if (post >= STRAIGHT_FLUSH) return post;
      let s0 = m0 | m1, s1 = m0 & m1;
      let s2 = s1 & m2;
      s1 |= s0 & m2; s0 |= m2;
      const s3 = s2 & m3;
      s2 |= s1 & m3; s1 |= s0 & m3; s0 |= m3;
      let r;
      if (s3) { r = T.topBit[s3]; return QUADS[r] + T.topBit[s0 ^ (1 << r)]; }
      if (s2) {
        r = T.topBit[s2]; s1 ^= 1 << r;
        if (s1) return TRIPS[r] + FULL_HOUSE_OTHER + T.topBit[s1];
        if (post) return post;
        post = T.anySuit[s0];
        if (post >= STRAIGHT) return post;
        s0 ^= 1 << r;
        return TRIPS[r] + T.tripsOther[s0];
      }
      if (post) return post;
      post = T.anySuit[s0];
      if (post >= STRAIGHT) return post;
      if (s1) {
        r = T.topBit[s1]; s0 ^= 1 << r; s1 ^= 1 << r;
        if (s1) { s0 ^= 1 << T.topBit[s1]; return PAIRS[r] + TWO_PAIR_OTHER[T.topBit[s1]] + T.topBit[s0]; }
        return PAIRS[r] + T.pairOther[s0];
      }
      return post;
    }
    rankOf(cards) { const m = [0, 0, 0, 0]; for (const c of cards) m[c & 3] |= 1 << (c >> 2); return this.rank(m[0], m[1], m[2], m[3]); }

    /* river value v = 2*(opponent hands beaten) + (hands tied), over every opponent hand */
    riverValue(hole, board5) {
      const m = [0, 0, 0, 0]; for (const c of board5) m[c & 3] |= 1 << (c >> 2);
      const used = new Uint8Array(52); for (const c of board5) used[c] = 1; used[hole[0]] = used[hole[1]] = 1;
      const add = (mm, c) => { mm[c & 3] |= 1 << (c >> 2); };
      const me = m.slice(); add(me, hole[0]); add(me, hole[1]);
      const mine = this.rank(me[0], me[1], me[2], me[3]);
      const rest = []; for (let c = 0; c < 52; c++) if (!used[c]) rest.push(c);
      let v = 0;
      for (let i = 0; i < rest.length; i++) {
        const a = rest[i], ma = m.slice(); add(ma, a);
        for (let j = i + 1; j < rest.length; j++) {
          const b = rest[j], s = b & 3, bit = 1 << (b >> 2);
          const r = this.rank(s === 0 ? ma[0] | bit : ma[0], s === 1 ? ma[1] | bit : ma[1], s === 2 ? ma[2] | bit : ma[2], s === 3 ? ma[3] | bit : ma[3]);
          v += mine > r ? 2 : mine === r ? 1 : 0;
        }
      }
      return v;
    }
    feature(street, hole, board) {
      if (street === 3) return this.riverValue(hole, board);
      const used = new Uint8Array(52); for (const c of board) used[c] = 1; used[hole[0]] = used[hole[1]] = 1;
      const rest = []; for (let c = 0; c < 52; c++) if (!used[c]) rest.push(c);
      let f = 0;
      if (street === 2) for (const x of rest) { const v = this.riverValue(hole, [...board, x]); f += v * v; }
      else for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) { const v = this.riverValue(hole, [...board, rest[i], rest[j]]); f += v * v; }
      return f;
    }
    bucket(street, hole, board) {
      if (street === 0) {
        const ra = hole[0] >> 2, rb = hole[1] >> 2;
        if (ra === rb) return ra;
        const hi = Math.max(ra, rb), lo = Math.min(ra, rb), k = (hi * (hi - 1)) / 2 + lo;
        return ((hole[0] & 3) === (hole[1] & 3) ? 13 : 91) + k;
      }
      const key = street + ':' + hole.join(',') + '|' + board.join(',');
      if (this.cache.has(key)) return this.cache.get(key);
      const f = this.feature(street, hole, board), t = this.g.thr[street];
      let lo = 0, hi = this.g.K[street] - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] <= f) lo = m + 1; else hi = m; }
      if (this.cache.size > 64) this.cache.clear();
      this.cache.set(key, lo);
      return lo;
    }

    /** obs: { seat: 0 big blind | 1 small blind (button), hole: ['As','Kd'], board: [...], history: ['rc','c',...] per street }
        Returns { action: 'fold'|'call'|'raise', probs: {fold,call,raise}, bucket, street } */
    decide(obs, rand) {
      const street = obs.history.length - 1;
      if (street < 0 || street >= NROUNDS) throw new StrategyError('Unexpected street');
      const needBoard = [0, 3, 4, 5][street];
      if (!obs.board || obs.board.length !== needBoard) throw new StrategyError('The board does not match the street');
      const hole = obs.hole.map(cardId), board = obs.board.map(cardId);
      let id = 0;
      for (let r = 0; r <= street; r++) {
        for (const ch of obs.history[r]) {
          const n = this.nodes[id];
          if (n.kind !== 'dec' || n.round !== r) throw new StrategyError('The betting does not match the strategy tree');
          const k = n.act.indexOf(CODE.indexOf(ch));
          if (k < 0) throw new StrategyError(`Action "${ch}" is not possible in the strategy tree here`);
          id = n.child[k];
        }
        if (r < street && (this.nodes[id].kind !== 'dec' || this.nodes[id].round !== r + 1)) throw new StrategyError('The betting round did not end where expected');
      }
      const n = this.nodes[id];
      if (n.kind !== 'dec' || n.round !== street || n.player !== obs.seat) throw new StrategyError('It is not Cepheus\'s turn in the strategy tree');
      const b = this.bucket(street, hole, board);
      const s = this.g.strat, base = n.off + b * (n.act.length - 1);
      const q = []; let used = 0;
      for (let a = 0; a < n.act.length - 1; a++) { q.push(s[base + a]); used += s[base + a]; }
      q.push(255 - used);
      if (q[q.length - 1] < 0) throw new StrategyError('The strategy file is damaged');
      let x = rand() * 255, k = 0;
      while (k < q.length - 1 && x >= q[k]) { x -= q[k]; k++; }
      while (q[k] === 0) k = (k + 1) % q.length; // never pick an action with probability zero
      const probs = { fold: 0, call: 0, raise: 0 };
      n.act.forEach((a, i) => { probs[['fold', 'call', 'raise'][a]] = q[i] / 255; });
      return { action: ['fold', 'call', 'raise'][n.act[k]], probs, bucket: b, street };
    }
  }

  async function load(url) {
    let res;
    try { res = await fetch(url, { cache: 'force-cache' }); }
    catch (e) { throw new StrategyError('Could not download the Cepheus strategy file. Check your connection and try again.'); }
    if (!res.ok) throw new StrategyError(`The Cepheus strategy file is missing (HTTP ${res.status}).`);
    return new Model(parse(await res.arrayBuffer()));
  }

  const api = { load, fromBuffer: (buf) => new Model(parse(buf)), StrategyError, cardId };
  if (typeof window !== 'undefined') window.CepheusEngine = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
