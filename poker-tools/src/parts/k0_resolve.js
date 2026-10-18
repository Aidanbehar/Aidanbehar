/* =====================================================================
   7e. RE-SOLVING THE TURN AND RIVER  (used by Cepheus and the limit solver)
   The strategy table groups hands into 50 strength buckets per street. On the
   turn and river this module instead solves the spot in front of the player
   exactly, during play:
     1. Ranges: every hand each player could hold is weighted by how often the
        table strategy (or the earlier turn re-solve) would have bet the way that
        player actually did. Only public information is used: the board, the
        betting and the seat. The player's own cards are not used to build
        either range (its whole range is solved, then its own hand looked up).
     2. A small exact game is built from the start of the current street: the
        real betting tree (real stacks and blinds) and every two-card hand.
        On the river it runs to showdown. On the turn, the river after it is
        played by the table strategy for every possible river card, with exact
        hand strengths.
     3. CFR+ (the training method used for the table, run on this small game)
        finds the strategy. Safety: at the start, the opponent may "take" what
        each of their hands would win against the table strategy instead, so the
        new strategy can never hand them more than the table would.
   Cards are 0..51 = rank * 4 + suit (ranks 2..A, suits s h d c), as in cepheus.js.
   ===================================================================== */
const Resolver = (() => {
  const N = 1326;
  const HA = new Uint8Array(N), HB = new Uint8Array(N), HID = new Int16Array(52 * 52).fill(-1);
  { let k = 0; for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) { HA[k] = a; HB[k] = b; HID[a * 52 + b] = HID[b * 52 + a] = k; k++; } }
  const cid = (c) => '23456789TJQKA'.indexOf(c[0]) * 4 + 'shdc'.indexOf(c[1]);
  const handOf = (cards) => HID[cid(cards[0]) * 52 + cid(cards[1])];
  const CODE = { f: 'f', x: 'c', c: 'c', b: 'r', r: 'r' };
  const OPTS = { riverIters: 60, turnIters: 60, turnSamples: 1, safetyRivers: 24, flopSamples: 150, oppFloor: 0.02 };

  /* ---------- exact hand strength on a board ---------- */
  /** Every hand's rank on a five-card board (blocked hands -1) and the valid hands sorted by rank. */
  const KEYS = new Float64Array(N);
  function ranksOn(model, board) {
    let m0 = 0, m1 = 0, m2 = 0, m3 = 0; const dead = new Uint8Array(52);
    for (const c of board) { const bit = 1 << (c >> 2), s = c & 3; if (s === 0) m0 |= bit; else if (s === 1) m1 |= bit; else if (s === 2) m2 |= bit; else m3 |= bit; dead[c] = 1; }
    const rank = new Int32Array(N).fill(-1); let n = 0;
    for (let h = 0; h < N; h++) {
      const a = HA[h], b = HB[h];
      if (dead[a] || dead[b]) continue;
      let x0 = m0, x1 = m1, x2 = m2, x3 = m3;
      for (const c of [a, b]) { const bit = 1 << (c >> 2), s = c & 3; if (s === 0) x0 |= bit; else if (s === 1) x1 |= bit; else if (s === 2) x2 |= bit; else x3 |= bit; }
      const r = model.rank(x0, x1, x2, x3);
      rank[h] = r; KEYS[n++] = r * 2048 + h;
    }
    const sorted = KEYS.subarray(0, n).slice().sort(), order = new Int16Array(n);
    for (let i = 0; i < n; i++) order[i] = sorted[i] % 2048;
    return { rank, order, n, dead };
  }
  const C1 = new Float64Array(52), C2 = new Float64Array(52);
  /**
   * Showdown against an opponent reach vector r (card removal exact): out[h] = A * (weight h beats)
   * - B * (weight h loses to), where A is what the opponent put in and B what this player put in.
   */
  function showdown(R, r, A, B, out) {
    const ord = R.order, rk = R.rank, n = R.n;
    C1.fill(0); let T = 0;
    for (let i = 0; i < n;) {
      let j = i; const v = rk[ord[i]];
      while (j < n && rk[ord[j]] === v) j++;
      for (let k = i; k < j; k++) { const h = ord[k]; out[h] = A * (T - C1[HA[h]] - C1[HB[h]]); }
      for (let k = i; k < j; k++) { const h = ord[k], w = r[h]; T += w; C1[HA[h]] += w; C1[HB[h]] += w; }
      i = j;
    }
    C2.fill(0); T = 0;
    for (let i = n - 1; i >= 0;) {
      let j = i; const v = rk[ord[i]];
      while (j >= 0 && rk[ord[j]] === v) j--;
      for (let k = i; k > j; k--) { const h = ord[k]; out[h] -= B * (T - C2[HA[h]] - C2[HB[h]]); }
      for (let k = i; k > j; k--) { const h = ord[k], w = r[h]; T += w; C2[HA[h]] += w; C2[HB[h]] += w; }
      i = j;
    }
  }
  /** Weight of opponent hands that share no card with each hand: out[h] = s * that weight. */
  function disjoint(valid, r, s, out) {
    C1.fill(0); let T = 0;
    for (let i = 0; i < valid.length; i++) { const h = valid[i], w = r[h]; T += w; C1[HA[h]] += w; C1[HB[h]] += w; }
    for (let i = 0; i < valid.length; i++) { const h = valid[i]; out[h] = s * (T - C1[HA[h]] - C1[HB[h]] + r[h]); }
  }
  const TW = new Float64Array(N);
  /** One river showdown, opponent weight ro[o] x th[bucket o]; adds w x mine[bucket h] x m x (win - lose) into out. */
  function showdownB(R, ro, th, bk, mine, w, m, out) {
    const ord = R.order, rk = R.rank, n = R.n;
    C1.fill(0); let T = 0;
    for (let i = 0; i < n;) {
      let j = i; const v = rk[ord[i]];
      while (j < n && rk[ord[j]] === v) j++;
      for (let k = i; k < j; k++) { const h = ord[k]; TW[h] = T - C1[HA[h]] - C1[HB[h]]; }
      for (let k = i; k < j; k++) { const h = ord[k], x = ro[h] * th[bk[h]]; T += x; C1[HA[h]] += x; C1[HB[h]] += x; }
      i = j;
    }
    C2.fill(0); T = 0;
    for (let i = n - 1; i >= 0;) {
      let j = i; const v = rk[ord[i]];
      while (j >= 0 && rk[ord[j]] === v) j--;
      for (let k = i; k > j; k--) { const h = ord[k]; out[h] += w * m * mine[bk[h]] * (TW[h] - (T - C2[HA[h]] - C2[HB[h]])); }
      for (let k = i; k > j; k--) { const h = ord[k], x = ro[h] * th[bk[h]]; T += x; C2[HA[h]] += x; C2[HB[h]] += x; }
      i = j;
    }
  }
  /** One river fold ending: adds w x coef x mine[bucket h] x (opponent weight sharing no card) into out. */
  function disjointB(V, ro, th, bk, mine, w, coef, out) {
    C1.fill(0); let T = 0;
    for (let i = 0; i < V.length; i++) { const h = V[i], x = ro[h] * th[bk[h]]; T += x; C1[HA[h]] += x; C1[HB[h]] += x; }
    for (let i = 0; i < V.length; i++) { const h = V[i]; out[h] += w * coef * mine[bk[h]] * (T - C1[HA[h]] - C1[HB[h]] + ro[h] * th[bk[h]]); }
  }
  /** The table's river feature for every hand: 2 x (hands beaten) + (hands tied), card removal included. */
  function riverValues(R, out) {
    const ones = R._ones || (R._ones = (() => { const o = new Float64Array(N); for (let i = 0; i < R.n; i++) o[R.order[i]] = 1; return o; })());
    const win = new Float64Array(N), tot = new Float64Array(N);
    showdown(R, ones, 1, 0, win);
    const lose = new Float64Array(N); showdown(R, ones, 0, -1, lose); // lose[h] = weight h loses to
    disjoint(R.order, ones, 1, tot);
    for (let i = 0; i < R.n; i++) { const h = R.order[i]; out[h] = 2 * win[h] + (tot[h] - win[h] - lose[h]); }
  }
  const bucketOf = (model, street, f) => {
    const t = model.g.thr[street];
    let lo = 0, hi = model.g.K[street] - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] <= f) lo = m + 1; else hi = m; }
    return lo;
  };
  /** The table's strength bucket of every hand on a board (255 = blocked). Flop features are sampled. */
  function bucketsFor(model, street, board, cache) {
    const key = street + ':' + board.join(',');
    if (cache && cache.has(key)) return cache.get(key);
    const out = new Uint8Array(N).fill(255), dead = new Uint8Array(52);
    for (const c of board) dead[c] = 1;
    if (street === 0) {
      for (let h = 0; h < N; h++) { const a = HA[h], b = HB[h]; out[h] = model.bucket(0, [a, b], []); }
    } else if (street === 3) {
      const R = ranksOn(model, board), v = new Float64Array(N);
      riverValues(R, v);
      for (let i = 0; i < R.n; i++) { const h = R.order[i]; out[h] = bucketOf(model, 3, v[h]); }
    } else {
      const f = new Float64Array(N), cnt = new Float64Array(N), v = new Float64Array(N);
      const rest = []; for (let c = 0; c < 52; c++) if (!dead[c]) rest.push(c);
      const runs = [];
      if (street === 2) for (let i_ = 0; i_ < rest.length; i_++) { const x = rest[i_]; runs.push([x]); }
      else {
        let seed = board.reduce((a, c) => a * 53 + c + 1, 7) >>> 0;
        const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const seen = new Set();
        while (runs.length < OPTS.flopSamples) {
          const a = rest[Math.floor(rnd() * rest.length)], b = rest[Math.floor(rnd() * rest.length)];
          if (a === b || seen.has(a * 64 + b) || seen.has(b * 64 + a)) continue;
          seen.add(a * 64 + b); runs.push([a, b]);
        }
      }
      for (const run of runs) {
        const R = ranksOn(model, [...board, ...run]);
        riverValues(R, v);
        for (let i = 0; i < R.n; i++) { const h = R.order[i]; f[h] += v[h] * v[h]; cnt[h]++; }
      }
      const full = street === 2 ? 46 : 1081; // run-outs that avoid a hand's own cards
      for (let h = 0; h < N; h++) if (!dead[HA[h]] && !dead[HB[h]] && cnt[h]) out[h] = bucketOf(model, street, (f[h] * full) / cnt[h]);
    }
    if (cache) cache.set(key, out);
    return out;
  }

  /* ---------- the table strategy, by betting history ---------- */
  function bpNode(model, hist) {
    let id = 0;
    for (let r = 0; r < hist.length; r++) {
      for (const ch of hist[r]) {
        const n = model.nodes[id];
        if (!n || n.kind !== 'dec' || n.round !== r) return -1;
        const k = n.act.indexOf('fcr'.indexOf(ch));
        if (k < 0) return -1;
        id = n.child[k];
      }
      if (r < hist.length - 1 && (!model.nodes[id] || model.nodes[id].kind !== 'dec' || model.nodes[id].round !== r + 1)) return -1;
    }
    const n = model.nodes[id];
    return n && n.kind === 'dec' && n.round === hist.length - 1 ? id : -1;
  }
  /** Action probabilities of a table node for every bucket, in the order of `codes` (missing ones get 0). */
  function bpTable(model, id, codes) {
    const key = id + ':' + codes.join('');
    const T = model._bpT || (model._bpT = new Map());
    if (T.has(key)) return T.get(key);
    const n = model.nodes[id], K = model.g.K[n.round], nA = n.act.length, s = model.g.strat;
    const P = new Float32Array(K * codes.length);
    for (let b = 0; b < K; b++) {
      const base = n.off + b * (nA - 1); let used = 0;
      const q = [];
      for (let a = 0; a < nA - 1; a++) { q.push(s[base + a]); used += s[base + a]; }
      q.push(255 - used);
      let tot = 0;
      codes.forEach((c, j) => { const k = n.act.indexOf('fcr'.indexOf(c)); const p = k >= 0 ? q[k] / 255 : 0; P[b * codes.length + j] = p; tot += p; });
      // an action the table lacks here (short stacks): spread its share over the rest
      if (tot < 0.999) for (let j = 0; j < codes.length; j++) P[b * codes.length + j] = tot > 0 ? P[b * codes.length + j] / tot : 1 / codes.length;
    }
    T.set(key, P);
    return P;
  }

  /* ---------- replaying the public betting ---------- */
  const hist = (h) => { const out = Array.from({ length: h.street + 1 }, () => ''); for (const e of h.log) if (e.t === 'act') out[e.street] += CODE[e.type] || '?'; return out; };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  /** A fresh copy of hand h at the start of `street` (its board cards dealt, nobody's cards known). */
  function rootOf(h, street) {
    const g = Engine.createHand({ no: h.no, players: h.players.map((p) => ({ name: p.name, stack: p.startStack })), button: h.button, sb: h.sb, bb: h.bb, ante: h.ante, limit: 'fl', game: 'holdem' });
    const acts = h.log.filter((e) => e.t === 'act');
    let k = 0;
    while (g.phase !== 'done') {
      if (g.phase === 'deal') { if (g.street + 1 > street) break; const n = g.pendingDeal, at = g.board.length; Engine.dealBoard(g, h.board.slice(at, at + n)); continue; }
      if (g.phase !== 'betting' || g.street >= street) break;
      const e = acts[k++]; if (!e) break;
      Engine.applyAction(g, { type: e.type, to: e.to });
    }
    return g;
  }

  /* ---------- the small exact game ---------- */
  function codesOf(L) { const c = []; if (!L.canCheck) c.push('f'); c.push('c'); if (L.canRaise) c.push('r'); return c; }
  function apply(g, code) {
    const L = Engine.legal(g);
    if (code === 'f') Engine.applyAction(g, { type: 'fold' });
    else if (code === 'c') Engine.applyAction(g, { type: L.canCheck ? 'check' : 'call' });
    else Engine.applyAction(g, { type: L.isBet ? 'bet' : 'raise', to: L.minTo });
  }
  /** Tree from a root hand state: decision, fold, showdown and (end of turn) chance nodes. */
  function buildTree(g0, model, solveStreet) {
    const nodes = [];
    const rec = (g) => {
      const id = nodes.length;
      if (g.phase === 'betting') {
        const L = Engine.legal(g), codes = codesOf(L), hs = hist(g);
        const n = { t: 0, p: g.toAct, codes, kids: [], street: g.street, hist: hs, bp: bpNode(model, hs), solve: g.street === solveStreet, path: null };
        nodes.push(n);
        for (const c of codes) { const x = clone(g); apply(x, c); n.kids.push(rec(x)); }
        return id;
      }
      if (g.phase === 'deal') {
        // The river card does not change the betting, so one river tree serves every card.
        const n = { t: 3, kid: -1 }; nodes.push(n);
        const x = clone(g); const used = new Set(x.board.map(cid));
        let filler = 0; while (used.has(filler)) filler++;
        Engine.dealBoard(x, ['23456789TJQKA'[filler >> 2] + 'shdc'[filler & 3]]);
        n.kid = rec(x);
        return id;
      }
      const c = g.players.map((p) => p.committed);
      if (g.phase === 'showdown') { nodes.push({ t: 2, c }); return id; }
      const folder = g.players.findIndex((p) => p.folded);
      nodes.push({ t: 1, f: folder, c }); return id;
    };
    rec(g0);
    // path of codes from the root to each node, to find "where we are now"
    const walk = (id, path) => { const n = nodes[id]; n.path = path; if (n.t === 0) n.kids.forEach((k, j) => walk(k, path + n.codes[j])); else if (n.t === 3) walk(n.kid, path + '|'); };
    walk(0, '');
    return nodes;
  }

  /* ---------- ranges from the betting ---------- */
  /**
   * Reach weight of every hand for both seats at the start of `street` of hand h. Actions on streets with a
   * stored re-solve (`sols`) use that solution; earlier streets use the table. Board cards block hands.
   */
  function ranges(model, h, street, sols, cache) {
    const board = h.board.slice(0, [0, 3, 4, 5][street]).map(cid);
    const dead = new Uint8Array(52); for (const c of board) dead[c] = 1;
    const reach = [new Float64Array(N), new Float64Array(N)];
    for (let x = 0; x < N; x++) if (!dead[HA[x]] && !dead[HB[x]]) reach[0][x] = reach[1][x] = 1;
    const g = rootOf(h, 0), acts = h.log.filter((e) => e.t === 'act');
    let k = 0;
    while (g.phase === 'betting' && g.street < street) {
      const e = acts[k++]; if (!e) break;
      const s = g.street, p = g.toAct, code = CODE[e.type];
      const sol = sols && sols[s] && sols[s].key === keyOf(h, s) ? sols[s] : null;
      if (sol) {
        const node = sol.byPath.get(sol.pathOf(g));
        if (node && node.t === 0) { const j = node.codes.indexOf(code), pr = sol.strategy(node, j); for (let x = 0; x < N; x++) reach[p][x] *= pr[x]; }
      } else {
        const hs = hist(g), id = bpNode(model, hs);
        if (id >= 0) {
          const codes = codesOf(Engine.legal(g)), P = bpTable(model, id, codes), j = codes.indexOf(code);
          const bk = bucketsFor(model, s, g.board.map(cid), cache), nC = codes.length;
          for (let x = 0; x < N; x++) if (reach[p][x] > 0) reach[p][x] *= P[bk[x] * nC + j];
        }
      }
      Engine.applyAction(g, { type: e.type, to: e.to });
      while (g.phase === 'deal' && g.street + 1 <= street) { const n = g.pendingDeal, at = g.board.length; Engine.dealBoard(g, h.board.slice(at, at + n)); }
    }
    return reach;
  }

  /** Reach of every hand for both seats right now (all betting so far, the whole current board). For the solver tab. */
  function rangesNow(model, h, sols, cache) {
    const board = h.board.map(cid), dead = new Uint8Array(52); for (const c of board) dead[c] = 1;
    const reach = ranges(model, h, h.street, sols, cache);
    for (let x = 0; x < N; x++) if (dead[HA[x]] || dead[HB[x]]) reach[0][x] = reach[1][x] = 0;
    // this street's actions so far
    const g = rootOf(h, h.street), acts = h.log.filter((e) => e.t === 'act' && e.street === h.street);
    const sol = sols && sols[h.street] && sols[h.street].key === keyOf(h, h.street) ? sols[h.street] : null;
    for (const e of acts) {
      if (g.phase !== 'betting') break;
      const p = g.toAct, code = CODE[e.type];
      const node = sol && sol.byPath.get(sol.pathOf(g));
      if (node && node.t === 0 && node.reg) { const pr = sol.strategy(node, node.codes.indexOf(code)); for (let x = 0; x < N; x++) reach[p][x] *= pr[x]; }
      else {
        const id = bpNode(model, hist(g));
        if (id >= 0) {
          const codes = codesOf(Engine.legal(g)), P = bpTable(model, id, codes), j = codes.indexOf(code), bk = bucketsFor(model, g.street, g.board.map(cid), cache), nC = codes.length;
          for (let x = 0; x < N; x++) if (reach[p][x] > 0) reach[p][x] *= P[bk[x] * nC + j];
        }
      }
      Engine.applyAction(g, { type: e.type, to: e.to });
    }
    return reach;
  }

  /* ---------- CFR+ on the small game ---------- */
  class Solve {
    constructor(model, h, street, me, reach, cache, opts = {}) {
      this.model = model; this.me = me; this.opp = 1 - me; this.street = street; this.cache = cache;
      this.o = Object.assign({}, OPTS, opts);
      const g0 = rootOf(h, street);
      this.root = g0; this.nodes = buildTree(g0, model, street);
      this.byPath = new Map(this.nodes.map((n) => [n.path, n]));
      this.board = g0.board.map(cid);
      const dead = new Uint8Array(52); for (const c of this.board) dead[c] = 1;
      this.valid = Int16Array.from([...Array(N).keys()].filter((x) => !dead[HA[x]] && !dead[HB[x]]));
      this.reach = reach.map((r) => { const a = new Float64Array(N); for (let i_ = 0; i_ < this.valid.length; i_++) { const x = this.valid[i_]; a[x] = r[x]; } return a; });
      // the opponent may not play like the table: keep a little weight on every hand they could hold
      let mx = 0; for (let i_ = 0; i_ < this.valid.length; i_++) { const x = this.valid[i_]; mx = Math.max(mx, this.reach[this.opp][x]); }
      if (mx > 0) for (let i_ = 0; i_ < this.valid.length; i_++) { const x = this.valid[i_]; this.reach[this.opp][x] = Math.max(this.reach[this.opp][x], mx * this.o.oppFloor); }
      // scratch memory, one set per node (each node is visited once per pass)
      for (const n of this.nodes) {
        if (n.t === 0 && n.street === street) {
          n.reg = new Float64Array(n.codes.length * N); n.avg = new Float64Array(n.codes.length * N);
          n.S = new Float64Array(n.codes.length * N); n.kr = n.codes.map(() => new Float64Array(N)); n.vals = [];
        }
        n.out = new Float64Array(N);
      }
      this.rivers = [];
      if (street === 2) { for (let c = 0; c < 52; c++) if (!dead[c]) this.rivers.push(c); }
      else { this.R = ranksOn(model, this.board); this.bk3 = this.buckets(3, this.board); }
      this.rc = new Map(); this.t = 0;
      this.tmp = new Float64Array(N); this.tv = new Float64Array(N);
    }
    buckets(street, board) { return bucketsFor(this.model, street, board, this.cache); }
    river(c) {
      let x = this.rc.get(c);
      if (!x) {
        const b5 = [...this.board, c], R = ranksOn(this.model, b5), v = new Float64Array(N), bk = new Uint8Array(N).fill(255);
        riverValues(R, v);
        for (let i = 0; i < R.n; i++) { const h = R.order[i]; bk[h] = bucketOf(this.model, 3, v[h]); }
        const n = R.n, sa = new Uint8Array(n), sb = new Uint8Array(n), sk = new Uint8Array(n), gs = [];
        for (let k = 0; k < n; k++) { const h = R.order[k]; sa[k] = HA[h]; sb[k] = HB[h]; sk[k] = bk[h]; if (k === 0 || R.rank[R.order[k - 1]] !== R.rank[h]) gs.push(k); }
        gs.push(n);
        x = { c, R, bk, valid: R.order, n, sa, sb, sk, gs: Int16Array.from(gs), rs: new Float64Array(n), xs: new Float64Array(n), ws: new Float64Array(n), acc: new Float64Array(n) };
        this.rc.set(c, x);
      }
      return x;
    }
    /** End-of-turn node L: every river ending with the decisions on the way to it. */
    terms(L) {
      if (L.terms) return L.terms;
      const out = [], rec = (id, path) => { const n = this.nodes[id]; if (n.t === 0) n.kids.forEach((k, a) => rec(k, path.concat([[n, a]]))); else out.push({ n, path }); };
      rec(L.kid, []);
      return (L.terms = out);
    }
    /** Each player's probability (table strategy) of reaching each river ending of L, by river bucket. */
    probs(L) {
      if (L.pi) return L.pi;
      const K = this.model.g.K[3];
      L.pi = this.terms(L).map(({ path }) => {
        const q = [new Float64Array(K).fill(1), new Float64Array(K).fill(1)];
        for (const [n, a] of path) {
          const nA = n.codes.length, P = n.bp >= 0 ? bpTable(this.model, n.bp, n.codes) : null, v = q[n.p];
          for (let b = 0; b < K; b++) v[b] *= P ? P[b * nA + a] : 1 / nA;
        }
        return q;
      });
      return L.pi;
    }
    /** Adds w x (value of each of p's hands at end-of-turn node L, river card rv) into out. */
    leaf(L, p, ro, rv, w, out) {
      const pi = this.probs(L), T = this.terms(L), o = 1 - p, n = rv.n, ord = rv.R.order, sa = rv.sa, sb = rv.sb, sk = rv.sk, gs = rv.gs;
      const rs = rv.rs, xs = rv.xs, ws = rv.ws, acc = rv.acc, G = gs.length - 1;
      for (let k = 0; k < n; k++) { rs[k] = ro[ord[k]]; acc[k] = 0; }
      for (let z = 0; z < T.length; z++) {
        const t = T[z].n, mine = pi[z][p], th = pi[z][o];
        let tot = 0;
        for (let k = 0; k < n; k++) { const x = rs[k] * th[sk[k]]; xs[k] = x; }
        C1.fill(0);
        if (t.t === 1) {
          const coef = w * (t.f !== p ? t.c[t.f] : -t.c[t.f]);
          for (let k = 0; k < n; k++) { const x = xs[k]; tot += x; C1[sa[k]] += x; C1[sb[k]] += x; }
          for (let k = 0; k < n; k++) acc[k] += coef * mine[sk[k]] * (tot - C1[sa[k]] - C1[sb[k]] + xs[k]);
        } else {
          const m = w * Math.min(t.c[0], t.c[1]);
          for (let g = 0; g < G; g++) { // weight each hand beats
            const i = gs[g], j = gs[g + 1];
            for (let k = i; k < j; k++) ws[k] = tot - C1[sa[k]] - C1[sb[k]];
            for (let k = i; k < j; k++) { const x = xs[k]; tot += x; C1[sa[k]] += x; C1[sb[k]] += x; }
          }
          C2.fill(0); tot = 0;
          for (let g = G - 1; g >= 0; g--) { // minus the weight each hand loses to
            const i = gs[g], j = gs[g + 1];
            for (let k = i; k < j; k++) acc[k] += m * mine[sk[k]] * (ws[k] - (tot - C2[sa[k]] - C2[sb[k]]));
            for (let k = i; k < j; k++) { const x = xs[k]; tot += x; C2[sa[k]] += x; C2[sb[k]] += x; }
          }
        }
      }
      for (let k = 0; k < n; k++) out[ord[k]] += acc[k];
    }
    /** Strategy of a node for each hand into out: regret matching, the table ('bp') or the average ('avg'). */
    strat(n, mode, out) {
      const nA = n.codes.length, V = this.valid;
      if (mode === 'bp' || !n.reg) {
        const P = n.bp >= 0 ? bpTable(this.model, n.bp, n.codes) : null, bk = n.street === 3 ? this.bk3 : this.buckets(n.street, this.board);
        for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_];  const b = bk[x]; for (let a = 0; a < nA; a++) out[a * N + x] = P && b !== 255 ? P[b * nA + a] : 1 / nA;  }
        return out;
      }
      const R = n.reg, A = n.avg, useAvg = mode === 'avg';
      for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_]; 
        let s = 0; for (let a = 0; a < nA; a++) s += useAvg ? A[a * N + x] : R[a * N + x];
        if (s > 0) for (let a = 0; a < nA; a++) out[a * N + x] = (useAvg ? A[a * N + x] : R[a * N + x]) / s;
        else if (useAvg) { let r = 0; for (let a = 0; a < nA; a++) r += R[a * N + x]; for (let a = 0; a < nA; a++) out[a * N + x] = r > 0 ? R[a * N + x] / r : 1 / nA; }
        else for (let a = 0; a < nA; a++) out[a * N + x] = 1 / nA;
       }
      return out;
    }
    /** Counterfactual values of p's hands at node id (rp, ro: reach of p and of the opponent). */
    walk(id, p, rp, ro, mode) {
      const n = this.nodes[id], V = this.valid, out = n.out;
      if (n.t === 1) { disjoint(V, ro, n.f !== p ? n.c[n.f] : -n.c[n.f], out); return out; }
      if (n.t === 2) { const m = Math.min(n.c[0], n.c[1]); showdown(this.R, ro, m, m, out); return out; }
      if (n.t === 3) {
        out.fill(0);
        const cards = mode === 'cfr' ? this.sample : mode === 'bp' && this.safety ? this.safety : this.rivers, w = 1 / cards.length;
        for (const c of cards) this.leaf(n, p, ro, this.river(c), w, out);
        return out;
      }
      const nA = n.codes.length, S = this.strat(n, mode, n.S || new Float64Array(nA * N));
      for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_]; out[x] = 0; }
      if (n.p === p) {
        for (let a = 0; a < nA; a++) {
          const r2 = n.kr ? n.kr[a] : new Float64Array(N);
          for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_]; r2[x] = rp[x] * S[a * N + x]; }
          const v = this.walk(n.kids[a], p, r2, ro, mode);
          if (n.vals) n.vals[a] = v;
          for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_]; out[x] += S[a * N + x] * v[x]; }
        }
        if (mode === 'cfr' && n.reg) {
          const R = n.reg, A = n.avg, t = this.t;
          for (let a = 0; a < nA; a++) {
            const v = n.vals[a];
            for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_];  const r = R[a * N + x] + v[x] - out[x]; R[a * N + x] = r > 0 ? r : 0; A[a * N + x] += t * rp[x] * S[a * N + x];  }
          }
        }
      } else {
        for (let a = 0; a < nA; a++) {
          const r2 = n.kr ? n.kr[a] : new Float64Array(N);
          for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_]; r2[x] = ro[x] * S[a * N + x]; }
          const v = this.walk(n.kids[a], p, rp, r2, mode);
          for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_]; out[x] += v[x]; }
        }
      }
      return out;
    }
    run() {
      const me = this.me, op = this.opp, iters = this.street === 3 ? this.o.riverIters : this.o.turnIters;
      // the safety step: what each opponent hand gets against the table strategy (an even spread of river cards)
      if (this.rivers.length > this.o.safetyRivers) { const st = this.rivers.length / this.o.safetyRivers; this.safety = Array.from({ length: this.o.safetyRivers }, (_, k) => this.rivers[Math.floor(k * st)]); }
      const cbv = Float64Array.from(this.walk(0, op, this.reach[op], this.reach[me], 'bp'));
      this.safety = null;
      const gT = new Float64Array(N), gF = new Float64Array(N), sF = new Float64Array(N).fill(1), ro = new Float64Array(N);
      let seed = this.board.reduce((a, c) => a * 53 + c + 1, 11) >>> 0;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let t = 1; t <= iters; t++) {
        this.t = t;
        if (this.rivers.length) {
          // every river card in turn, in a shuffled order: steadier than picking at random
          if (!this.deck || this.di + this.o.turnSamples > this.deck.length) {
            this.deck = this.rivers.slice(); this.di = 0;
            for (let k = this.deck.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [this.deck[k], this.deck[j]] = [this.deck[j], this.deck[k]]; }
          }
          this.sample = this.deck.slice(this.di, this.di + this.o.turnSamples); this.di += this.o.turnSamples;
        }
        for (let i_ = 0; i_ < this.valid.length; i_++) { const x = this.valid[i_]; ro[x] = this.reach[op][x] * sF[x]; }
        this.walk(0, me, this.reach[me], ro, 'cfr');
        const vF = this.walk(0, op, ro, this.reach[me], 'cfr');
        for (let i_ = 0; i_ < this.valid.length; i_++) { const x = this.valid[i_]; 
          const f = vF[x], u = (1 - sF[x]) * cbv[x] + sF[x] * f;
          gT[x] = Math.max(0, gT[x] + cbv[x] - u); gF[x] = Math.max(0, gF[x] + f - u);
          const s = gT[x] + gF[x]; sF[x] = s > 0 ? gF[x] / s : 1;
         }
      }
      this.gate = sF;
      for (const n of this.nodes) { n.out = null; n.kr = null; n.S = null; n.vals = null; }
      return this;
    }
    pathOf(g) { return hist(g)[this.street] + (g.street > this.street ? '|' + hist(g)[g.street] : ''); }
    /** Probability of action j at node for every hand (averaged strategy). */
    strategy(n, j) {
      const S = this.strat(n, 'avg', new Float64Array(n.codes.length * N)), out = new Float64Array(N);
      for (let i_ = 0; i_ < this.valid.length; i_++) { const x = this.valid[i_]; out[x] = S[j * N + x]; }
      return out;
    }
    /** The strategy for one hand at the node matching hand state g: { codes, probs } or null. */
    at(g, hole) {
      const n = this.byPath.get(this.pathOf(g));
      if (!n || n.t !== 0 || !n.reg) return null;
      const x = handOf(hole), S = this.strat(n, 'avg', new Float64Array(n.codes.length * N));
      return { codes: n.codes, probs: n.codes.map((_, a) => S[a * N + x]) };
    }
    /** Test measure: what a best-responding opponent wins (per unit of their reach) against the solved strategy and the table. */
    exploit() {
      for (const n of this.nodes) { n.out = n.out || new Float64Array(N); }
      const op = this.opp, tot = this.valid.reduce((a, x) => a + this.reach[op][x], 0) || 1;
      const br = (mode) => { const v = this.brVec(0, op, this.reach[this.me], mode); let s = 0; for (let i_ = 0; i_ < this.valid.length; i_++) { const x = this.valid[i_]; s += v[x] * this.reach[op][x]; } return s / tot; };
      return { vsSolved: br('avg'), vsTable: br('bp') };
    }
    brVec(id, p, ro, mode) {
      const n = this.nodes[id], V = this.valid;
      if (n.t !== 0) return Float64Array.from(this.walk(id, p, null, ro, mode));
      const nA = n.codes.length, out = new Float64Array(N);
      if (n.p === p) {
        out.fill(-Infinity);
        for (let a = 0; a < nA; a++) { const v = this.brVec(n.kids[a], p, ro, mode); for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_]; if (v[x] > out[x]) out[x] = v[x]; } }
        for (let x = 0; x < N; x++) if (out[x] === -Infinity) out[x] = 0;
        return out;
      }
      const S = this.strat(n, mode, new Float64Array(nA * N));
      for (let a = 0; a < nA; a++) { const r2 = new Float64Array(N); for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_]; r2[x] = ro[x] * S[a * N + x]; } const v = this.brVec(n.kids[a], p, r2, mode); for (let i_ = 0; i_ < V.length; i_++) { const x = V[i_]; out[x] += v[x]; } }
      return out;
    }
  }

  /** Everything public up to the start of `street`: a solve made from there is valid for this hand. */
  const keyOf = (h, street) => JSON.stringify([h.players.map((p) => p.startStack), h.sb, h.bb, h.button, h.board.slice(0, [0, 3, 4, 5][street]), hist(h).slice(0, street)]);
  function decide(model, h, me, hole, memo, opts) {
    if (h.street < 2 || h.phase !== 'betting' || h.limit !== 'fl' || h.players.length !== 2) return null;
    memo.sols = memo.sols || {};
    if (!memo.cache || memo.cache.size > 40) memo.cache = new Map();
    for (const s of Object.keys(memo.sols)) if (memo.sols[s].key !== keyOf(h, +s) || memo.sols[s].me !== me) delete memo.sols[s];
    let sol = memo.sols[h.street];
    if (!sol) {
      const reach = ranges(model, h, h.street, memo.sols, memo.cache);
      sol = new Solve(model, h, h.street, me, reach, memo.cache, opts).run();
      sol.key = keyOf(h, h.street);
      memo.sols[h.street] = sol;
    }
    const r = sol.at(h, hole);
    return r ? { ...r, solve: sol } : null;
  }

  return { decide, keyOf, ranges, rangesNow, Solve, bucketsFor, ranksOn, showdown, riverValues, handOf, cid, HA, HB, N, OPTS, rootOf, hist };
})();
