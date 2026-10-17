/* =====================================================================
   3c. BOTS  (decision engine)
   Pipeline per decision:
     1. Read the hand from public information: positions, every bet and its size,
        lines such as check-raises, donk bets, barrels and overbets.
     2. Equity: Monte-Carlo against each opponent's likely holdings. Preflop ranges come
        from their actions and position; after the flop each bet or raise narrows the range
        toward strong hands (bigger bets narrow more), while keeping a share of bluffs that
        matches what that player has been seen to bluff.
     3. Pot odds, implied odds, stack-to-pot ratio, fold equity by bet size.
     4. Candidate actions and their value; preflop uses position-aware ranges and
        push/fold play when short-stacked.
     5. Balanced bet sizing (bluffs and strong hands share sizes) and safe mixing: bots vary
        their play, but never pick an action that is clearly bad (like folding the nuts).
   Each bot also has its own randomised traits and mood, so a style label is a tendency,
   not a script. Difficulty sets how much of the pipeline runs and how much noise is added.
   Bots never see hidden cards: decide() receives only the bot's own hole cards and public
   information (board, bets, actions, models built from past public play).
   ===================================================================== */
const Bots = (() => {
  /* sims: Monte-Carlo samples (0 = heuristic only) · noise: equity noise · useRanges: model
     opponent ranges · narrow: how much bets narrow those ranges · useOdds · useFoldEq ·
     bluff · adapt: exploit strength · mix: strategy mixing · sizingIQ (>=0.6: balanced sizes) ·
     position: positional awareness · pushFold: short-stack all-in/fold play · readLines */
  const PROFILES = {
    beginner: { level: 0, sims: 0, noise: 0.3, useRanges: false, narrow: 0, useOdds: false, useFoldEq: false, bluff: 0.25, adapt: 0, mix: 0.1, sizingIQ: 0.1, cbet: 0.3, position: 0, pushFold: false, readLines: false, guard: 0.94 },
    casual: { level: 1, sims: 160, noise: 0.2, useRanges: false, narrow: 0.45, useOdds: true, useFoldEq: false, bluff: 0.45, adapt: 0.05, mix: 0.1, sizingIQ: 0.3, cbet: 0.42, position: 0.3, pushFold: false, readLines: false, guard: 0.9 },
    intermediate: { level: 2, sims: 420, noise: 0.13, useRanges: true, narrow: 0.7, useOdds: true, useFoldEq: true, bluff: 0.65, adapt: 0.18, mix: 0.12, sizingIQ: 0.5, cbet: 0.55, position: 0.6, pushFold: true, readLines: false, guard: 0.88 },
    advanced: { level: 3, sims: 800, noise: 0.08, useRanges: true, narrow: 0.8, useOdds: true, useFoldEq: true, bluff: 0.85, adapt: 0.35, mix: 0.14, sizingIQ: 0.65, cbet: 0.6, position: 0.8, pushFold: true, readLines: true, guard: 0.86 },
    professional: { level: 4, sims: 1200, noise: 0.05, useRanges: true, narrow: 0.9, useOdds: true, useFoldEq: true, bluff: 1.0, adapt: 0.5, mix: 0.16, sizingIQ: 0.8, cbet: 0.62, position: 0.9, pushFold: true, readLines: true, guard: 0.85 },
    elite: { level: 5, sims: 1800, noise: 0.03, useRanges: true, narrow: 1, useOdds: true, useFoldEq: true, bluff: 1.05, adapt: 0.65, mix: 0.18, sizingIQ: 0.92, cbet: 0.63, position: 1, pushFold: true, readLines: true, guard: 0.84 },
    extreme: { level: 6, sims: 2600, noise: 0.015, useRanges: true, narrow: 1, useOdds: true, useFoldEq: true, bluff: 1.1, adapt: 0.8, mix: 0.2, sizingIQ: 1.0, cbet: 0.64, position: 1, pushFold: true, readLines: true, guard: 0.84 },
  };
  const LABELS = { beginner: 'Beginner', casual: 'Casual', intermediate: 'Intermediate', advanced: 'Advanced', professional: 'Professional', elite: 'Elite', extreme: 'Extreme' };
  /* vpip: share of hands played (6-max) · aggr: raise vs call · bluff · trap: slow-play strong
     hands · cbet · sizing: bet size skew · sticky: how hard it is to make them fold */
  const PERSONALITIES = {
    balanced: { name: 'Balanced', vpip: 0.26, aggr: 1.05, bluff: 1.0, trap: 1.0, cbet: 1.0, sizing: 1.0, sticky: 1.0 },
    tightaggr: { name: 'Tight-aggressive', vpip: 0.2, aggr: 1.35, bluff: 1.0, trap: 0.6, cbet: 1.15, sizing: 1.0, sticky: 0.9 },
    looseaggr: { name: 'Loose-aggressive', vpip: 0.38, aggr: 1.55, bluff: 1.45, trap: 0.5, cbet: 1.2, sizing: 1.12, sticky: 1.05 },
    tightpassive: { name: 'Tight-passive', vpip: 0.15, aggr: 0.5, bluff: 0.35, trap: 0.5, cbet: 0.75, sizing: 0.8, sticky: 1.0 },
    loosepassive: { name: 'Loose-passive', vpip: 0.46, aggr: 0.55, bluff: 0.45, trap: 0.6, cbet: 0.6, sizing: 0.75, sticky: 1.45 },
    maniac: { name: 'Maniac', vpip: 0.66, aggr: 2.1, bluff: 2.1, trap: 0.3, cbet: 1.5, sizing: 1.4, sticky: 1.25 },
    trapper: { name: 'Trapper', vpip: 0.28, aggr: 0.85, bluff: 0.8, trap: 1.9, cbet: 0.7, sizing: 1.0, sticky: 1.0 },
    gto: { name: 'GTO-inspired', vpip: 0.27, aggr: 1.1, bluff: 1.0, trap: 1.0, cbet: 1.0, sizing: 1.0, sticky: 1.0, balanced: true },
  };
  const TRAIT_KEYS = ['vpip', 'aggr', 'bluff', 'trap', 'cbet', 'sizing', 'sticky'];
  const NAMES = ['Nova', 'Rook', 'Juniper', 'Atlas', 'Echo', 'Pixel', 'Maverick', 'Sable', 'Quinn', 'Orion', 'Wren', 'Bishop', 'Cosmo', 'Indigo', 'Lumen', 'Tango'];

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /** Fast simulation PRNG (sfc32) seeded from the secure generator. Never used for dealing. */
  function makeRng() {
    const s = new Uint32Array(4);
    crypto.getRandomValues(s);
    let [a, b, c, d] = s;
    const next = () => {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0;
      t = (t + d) | 0; c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
    return {
      next, int: (n) => Math.floor(next() * n),
      gauss(m, sd) { const u = Math.max(1e-9, next()), v = next(); return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
      weighted(ws) { const tot = ws.reduce((x, y) => x + y, 0); if (!(tot > 0)) return 0; let r = next() * tot; for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r < 0) return i; } return ws.length - 1; },
    };
  }

  /* ---------- per-bot traits: a style is a tendency, not a script ---------- */
  /** Each bot gets its own version of its style: every trait jittered, plus a hidden pinch of a second style. */
  function makeTraits(personality, rng = makeRng()) {
    const base = PERSONALITIES[personality] || PERSONALITIES.balanced;
    const keys = Object.keys(PERSONALITIES), other = PERSONALITIES[keys[rng.int(keys.length)]], mixW = 0.08 + rng.next() * 0.17;
    const t = { mood: 0, moodHands: 0 };
    for (const k of TRAIT_KEYS) {
      const blended = Math.exp((1 - mixW) * Math.log(base[k]) + mixW * Math.log(other[k]));
      t[k] = blended * Math.exp(clamp(rng.gauss(0, k === 'sizing' ? 0.07 : 0.14), -0.3, 0.3));
    }
    return t;
  }
  /** Called once per hand: the bot's mood wanders, with an occasional gear change. */
  function driftTraits(t, rng = makeRng()) {
    if (!t) return t;
    t.mood = clamp(t.mood * 0.92 + rng.gauss(0, 0.05) + (rng.next() < 0.025 ? (rng.next() < 0.5 ? -0.3 : 0.3) : 0), -0.45, 0.45);
    t.moodHands++;
    return t;
  }
  /** The style actually used for a decision: label x personal traits x current mood. */
  function styleFor(personality, traits) {
    const base = PERSONALITIES[personality] || PERSONALITIES.balanced;
    const s = { ...base };
    if (traits) {
      for (const k of TRAIT_KEYS) if (traits[k] > 0) s[k] = traits[k];
      const m = traits.mood || 0;
      s.vpip *= Math.exp(m * 0.8); s.aggr *= Math.exp(m * 0.6); s.bluff *= Math.exp(m); s.sticky *= Math.exp(m * 0.3);
    }
    s.vpip = clamp(s.vpip, 0.06, 0.9);
    return s;
  }

  /* ---------- fast hand ranking (cards as 0..51 = rank*4 + suit) ---------- */
  const Fast = (() => {
    const RK = '23456789TJQKA', SU = 'shdc', B = [1, 13, 169, 2197, 28561, 371293];
    const id = (c) => RK.indexOf(c[0]) * 4 + SU.indexOf(c[1]);
    const cnt = new Uint8Array(13), sm = new Int32Array(4);
    const pop = (x) => { let n = 0; while (x) { x &= x - 1; n++; } return n; };
    function straightHigh(m) {
      const mm = (m << 1) | ((m >> 12) & 1);
      const s = mm & (mm >> 1) & (mm >> 2) & (mm >> 3) & (mm >> 4);
      return s ? 31 - Math.clz32(s) + 3 : -1;
    }
    function topBits(m, k) { let v = 0, n = 0; for (let r = 12; r >= 0 && n < k; r--) if (m >> r & 1) { v += r * B[4 - n]; n++; } return v; }
    /** Rank of the best 5-card hand among cards[0..n) (n >= 5). Bigger is better; equal is a tie. */
    function rank(cards, n = cards.length) {
      sm[0] = sm[1] = sm[2] = sm[3] = 0; cnt.fill(0);
      for (let i = 0; i < n; i++) { const c = cards[i]; sm[c & 3] |= 1 << (c >> 2); cnt[c >> 2]++; }
      let fm = 0; for (let s = 0; s < 4; s++) if (pop(sm[s]) >= 5) fm = sm[s];
      if (fm) { const sf = straightHigh(fm); if (sf >= 0) return 8 * B[5] + sf; }
      const all = sm[0] | sm[1] | sm[2] | sm[3];
      let q = -1, t1 = -1, t2 = -1, p1 = -1, p2 = -1;
      for (let r = 12; r >= 0; r--) {
        const k = cnt[r];
        if (k === 4) q = r; else if (k === 3) { if (t1 < 0) t1 = r; else if (t2 < 0) t2 = r; } else if (k === 2) { if (p1 < 0) p1 = r; else if (p2 < 0) p2 = r; }
      }
      if (q >= 0) return 7 * B[5] + q * 13 + topBits(all & ~(1 << q), 1) / B[4];
      if (t1 >= 0 && (t2 >= 0 || p1 >= 0)) return 6 * B[5] + t1 * 13 + Math.max(t2, p1);
      if (fm) return 5 * B[5] + topBits(fm, 5);
      const st = straightHigh(all); if (st >= 0) return 4 * B[5] + st;
      if (t1 >= 0) return 3 * B[5] + t1 * B[4] + topBits(all & ~(1 << t1), 2) / 13;
      if (p1 >= 0 && p2 >= 0) return 2 * B[5] + p1 * B[4] + p2 * B[3] + topBits(all & ~(1 << p1) & ~(1 << p2), 1) / 169;
      if (p1 >= 0) return B[5] + p1 * B[4] + topBits(all & ~(1 << p1), 3) / 13;
      return topBits(all, 5);
    }
    const tmp = new Int32Array(5);
    /** Omaha: exactly two hole cards and three board cards. */
    function omaha(hole, board) {
      let best = -1; const nh = hole.length, nb = board.length;
      for (let a = 0; a < nh; a++) for (let b = a + 1; b < nh; b++) for (let c = 0; c < nb; c++) for (let d = c + 1; d < nb; d++) for (let e = d + 1; e < nb; e++) {
        tmp[0] = hole[a]; tmp[1] = hole[b]; tmp[2] = board[c]; tmp[3] = board[d]; tmp[4] = board[e];
        const r = rank(tmp, 5); if (r > best) best = r;
      }
      return best;
    }
    return { id, rank, omaha, cat: (s) => Math.floor(s / B[5]), B, straightHigh };
  })();
  const seven = new Int32Array(9);
  function strength(game, hole, board) {
    if (game === 'omaha') return Fast.omaha(hole, board);
    seven[0] = hole[0]; seven[1] = hole[1]; for (let i = 0; i < board.length; i++) seven[i + 2] = board[i];
    return Fast.rank(seven, board.length + 2);
  }

  /* ---------- preflop tables ---------- */
  // Equity (per mille) of each of the 169 starting hands against 1..5 random hands, computed offline
  // with 60,000 (1 opponent) / 25,000 (2-5 opponents) simulations each. Order: AA, AKs, AKo, AQs, ...
  const PF_PACKED = 'npkghlfddwime5bf9p8pi7dcat957riddpb59c86hycza38f71i5deap8y7lhpcm9u836shzd2ab8k7ghic89g7p6hhfcg9k7x6rgwbh8k6w5lh9c5967m6jgob8896h5ggvbt927g67gbaq7y6653gnbg8l7062g1al7n5x4wgobk8s7962fzag7v624zghb68k7260foad7k5v4vg5b28k6u5xfia37e5t4rfyar856q5qfe9w6y5h4kmzj7g6dxc3hkczak917vh6ca9y806thbcqab8q7egtc29e7v6lh4cba18c78glbo8z7b6dgrbs947o6fg3b0836i5cg6b88i7161foa47n5w4xg2av896s5ufb9y795m4kfram846l5jf89i6z5e4gfhaf7x6c5ees9g6w5a49fca57n675dej9a6g4w43f1a07k6359eb906b4w3wes9o7b5u51e28m654r3umai3etceaegpc59t8b7bg0bc967l6fghbx9k8771fwb58p785yg2bb8x796afaa87x6b5afmat886p5rew9t7b5r4qf1a57p6957ea9b6l5947ex9x7j6653e48t6d503xeq9m7b604ydz8u6d4r3ued9e745u4tdo8f624m3qe79a6y5o4udd875u4j3ie28y6q5h4nd77y5i4e3glkgydub79dg2bk9c826vfaaz8f745ufgaz8r7865eua97r6956f1ag846q5re99c715n4nej9t7i6653dp8v6h5744e196715p4ud98c614l3mdu966v5n4od3835s4h3ldo8s6n5i4kct7w5m443adh8p6n584gcm7m5e413bd78e69524hcc7f574137kufwcka18bexau8m7a65ec9y7n6c5aejab826m5odt9h765m4pe59l7f635ddd8n6i5246dl956w5p4tcv815z4j3sd38f6j5a4ecd7j5c433ccx8e6e524cc57f593z3acp88664x48bv764z3u33ce7y614w42bp6y4u3o31k1eybf8w7ge79w7y6j5odc946t5k4odm9g7f605dcw8l6h544ad5906w5n4xcf7y5r4i3ocn8a6h594ebu7d5b443bc77u5z4t41bc6u4t3o2uc17r5r4o3zb66k4p3m2sbs7d5m4i3xaw6h4j3f2sj8dwae8b6oda9i7e655ack8f6f5347cw8t6v5q4ybz805x4p3tcc8g6d5c4hbj7d5b493ebv7o604v42b16q4w3r32be785h4h3xae6c4d3a2nb5705f4c3na95z49392liccy9k7b64cm8w6y5s4xbr82604t3xc48e6i5g4ob77c5j4f3jbl7y5z5049am6u503t36b37f5m4i3wa86b4g3b2sak6z54473n9k5t3z2z2chmbz8o6s5lbz8e6m5j4sb87b5l4g3obl7v65554gan6u4y413caz7j5o4n3za0694g3m2yak6w58483n9i5s45322lgvb2816753bi846d5d4nak6z56433hb17m5w4x4ca76i4s3o33ad725d4i3y9k604a3b2tfwa97a5t4vaq7d5o4q449r694m3o2ya76v5b4d3t9b5o43372nex9d6s5c4j9z6o54493n905i3x352ge28j654s47';
  const RANKS = '23456789TJQKA';
  const PF = (() => {
    const keys = [];
    for (let a = 12; a >= 0; a--) for (let b = a; b >= 0; b--) { if (a === b) keys.push(RANKS[a] + RANKS[b]); else { keys.push(RANKS[a] + RANKS[b] + 's'); keys.push(RANKS[a] + RANKS[b] + 'o'); } }
    const eq = {}, n = (k) => (k.length === 2 ? 6 : k[2] === 's' ? 4 : 12);
    keys.forEach((k, i) => { eq[k] = [0, 1, 2, 3, 4].map((j) => parseInt(PF_PACKED.substr((i * 5 + j) * 2, 2), 36) / 1000); });
    // Hand order for ranges: heads-up equity blended with multiway equity (playability).
    const z = (j) => { const v = keys.map((k) => eq[k][j]), m = v.reduce((a, b) => a + b, 0) / v.length; const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); return (k) => (eq[k][j] - m) / sd; };
    const z1 = z(0), z3 = z(2);
    const order = keys.slice().sort((a, b) => (z1(b) + 0.8 * z3(b)) - (z1(a) + 0.8 * z3(a)));
    const pct = {}; let acc = 0;
    for (const k of order) { acc += n(k); pct[k] = acc / 1326; }
    // every combo, best first, for exact range sampling
    const combos = [], comboPct = [];
    for (const k of order) {
      const a = RANKS.indexOf(k[0]), b = RANKS.indexOf(k[1]);
      for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) {
        if (k.length === 2 ? s2 <= s1 : (k[2] === 's') !== (s1 === s2)) continue;
        combos.push([a * 4 + s1, b * 4 + s2]); comboPct.push(pct[k]);
      }
    }
    return { eq, pct, combos, comboPct };
  })();
  const shortKey = (hole) => {
    const r = hole.map((c) => c[0]).sort((x, y) => RANKS.indexOf(y) - RANKS.indexOf(x));
    return r[0] === r[1] ? r[0] + r[1] : r[0] + r[1] + (hole[0][1] === hole[1][1] ? 's' : 'o');
  };
  const holdemPct = (hole) => PF.pct[shortKey(hole)] ?? 0.5;
  const holdemEq = (hole, nOpp) => (PF.eq[shortKey(hole)] || [0.5, 0.35, 0.27, 0.22, 0.19])[clamp(nOpp, 1, 5) - 1];
  /** How many combos sit inside the top `w` of hands. */
  function combosWithin(w) { let lo = 0, hi = PF.comboPct.length; while (lo < hi) { const m = (lo + hi) >> 1; if (PF.comboPct[m] <= w) lo = m + 1; else hi = m; } return Math.max(lo, 6); }

  /** Chen formula, kept for the self-tests and as a rough preflop score. */
  function chen(hole) {
    let r1 = Cards.rank(hole[0]) - 2, r2 = Cards.rank(hole[1]) - 2;
    if (r2 > r1) [r1, r2] = [r2, r1];
    const val = (r) => (r === 12 ? 10 : r === 11 ? 8 : r === 10 ? 7 : r === 9 ? 6 : (r + 2) / 2);
    const pair = r1 === r2, suited = hole[0][1] === hole[1][1];
    let p = val(r1);
    if (pair) p = Math.max(5, p * 2);
    if (suited) p += 2;
    const gap = r1 - r2 - 1;
    if (!pair) { if (gap === 1) p -= 1; else if (gap === 2) p -= 2; else if (gap === 3) p -= 4; else if (gap >= 4) p -= 5; if (gap <= 1 && r1 < 10) p += 1; }
    return clamp(0.32 + (Math.ceil(p) + 2) / 26, 0.3, 0.87);
  }

  /** Omaha preflop score 0..1: high cards, pairs, double-suitedness, connectivity. */
  function omahaScore(hole) {
    const ranks = hole.map((c) => Cards.rank(c) - 2).sort((a, b) => b - a);
    let s = ranks.reduce((acc, r, i) => acc + (r / 12) * ([0.3, 0.22, 0.13, 0.07, 0.04][i] || 0), 0);
    const counts = {};
    ranks.forEach((r) => { counts[r] = (counts[r] || 0) + 1; });
    const cv = Object.values(counts);
    const pairs = cv.filter((c) => c === 2).length, trips = cv.filter((c) => c >= 3).length;
    s += pairs * 0.1 + (ranks[0] >= 10 && pairs ? 0.06 : 0) - trips * 0.12;
    const sc = {};
    hole.forEach((c) => { sc[c[1]] = (sc[c[1]] || 0) + 1; });
    const sv = Object.values(sc).sort((a, b) => b - a);
    if (sv[0] === 2 && sv[1] === 2) s += 0.13; else if (sv[0] === 2) s += 0.07;
    if (sv[0] >= 3) s -= 0.06;
    const uniq = [...new Set(ranks)];
    for (let i = 0; i < uniq.length - 1; i++) { const g = uniq[i] - uniq[i + 1]; if (g <= 2) s += g === 1 ? 0.055 : 0.03; }
    return clamp(0.28 + s * 0.62, 0.18, 0.92);
  }
  // Percentile of an Omaha hand's score (0 = best), from a fixed sample of random hands.
  const OMAHA_DIST = {};
  function omahaPct(hole) {
    const n = hole.length;
    if (!OMAHA_DIST[n]) {
      const r = makeRng(), v = [], deck = Cards.newDeck();
      for (let k = 0; k < 3000; k++) { const d = deck.slice(), h = []; for (let i = 0; i < n; i++) h.push(d.splice(r.int(d.length), 1)[0]); v.push(omahaScore(h)); }
      OMAHA_DIST[n] = v.sort((a, b) => b - a);
    }
    const d = OMAHA_DIST[n], s = omahaScore(hole);
    let lo = 0, hi = d.length; while (lo < hi) { const m = (lo + hi) >> 1; if (d[m] > s) lo = m + 1; else hi = m; }
    return (lo + 0.5) / d.length;
  }
  const handPct = (game, hole) => (game === 'omaha' ? omahaPct(hole) : holdemPct(hole));

  /* ---------- board texture, outs, blockers ---------- */
  function analyzeBoard(board) {
    const out = { n: board.length, paired: false, flushPossible: false, straightPossible: false, wetness: 0, topRank: -1 };
    if (!board.length) return out;
    const ranks = board.map((c) => Cards.rank(c) - 2), rc = {}, sc = {};
    ranks.forEach((r) => { rc[r] = (rc[r] || 0) + 1; });
    board.forEach((c) => { sc[c[1]] = (sc[c[1]] || 0) + 1; });
    const scv = Object.values(sc).sort((a, b) => b - a);
    out.paired = Object.values(rc).some((v) => v >= 2);
    out.flushPossible = scv[0] >= 3;
    out.topRank = Math.max(...ranks);
    const uniq = [...new Set(ranks)];
    let windows = 0;
    for (let lo = 0; lo <= 8; lo++) {
      const inWin = uniq.filter((r) => r >= lo && r < lo + 5).length;
      if (inWin >= 2) windows++;
      if (inWin >= 3) out.straightPossible = true;
    }
    out.wetness = clamp((out.flushPossible ? 0.34 : 0) + (scv[0] === 2 ? 0.16 : 0) + (windows / 9) * 0.42 + (out.paired ? 0.1 : 0) + (out.straightPossible ? 0.16 : 0), 0, 1);
    return out;
  }
  /** Outs: unseen cards that improve the hand to a better category through the bot's own cards
      (a card that pairs the board and helps everyone equally is not an out). */
  function countOuts(game, holeIds, boardIds) {
    if (boardIds.length < 3 || boardIds.length >= 5) return { outs: 0, pct: 0 };
    const cur = Fast.cat(strength(game, holeIds, boardIds)), dead = new Set([...holeIds, ...boardIds]);
    let outs = 0, live = 0;
    for (let c = 0; c < 52; c++) {
      if (dead.has(c)) continue;
      live++;
      const nb = [...boardIds, c], nc = Fast.cat(strength(game, holeIds, nb));
      if (nc <= cur) continue;
      let boardCat;
      if (nb.length >= 5) boardCat = Fast.cat(Fast.rank(nb, nb.length));
      else { const k = {}; nb.forEach((x) => { k[x >> 2] = (k[x >> 2] || 0) + 1; }); const v = Object.values(k).sort((a, b) => b - a); boardCat = v[0] === 4 ? 7 : v[0] === 3 ? 3 : v[0] === 2 && v[1] === 2 ? 2 : v[0] === 2 ? 1 : 0; }
      if (nc > boardCat) outs++;
    }
    return { outs, pct: live ? outs / live : 0 };
  }
  function blockerScore(hole, board, tex) {
    let s = 0;
    const hr = hole.map((c) => Cards.rank(c) - 2);
    if (hr.includes(12)) s += 0.16;
    if (hr.includes(11)) s += 0.07;
    if (tex.flushPossible) {
      const sc = {};
      board.forEach((c) => { sc[c[1]] = (sc[c[1]] || 0) + 1; });
      const fs = Object.keys(sc).find((k) => sc[k] >= 3);
      hole.forEach((c) => { if (c[1] === fs && Cards.rank(c) - 2 >= 10) s += 0.2; });
    }
    if (tex.topRank >= 0 && hr.includes(tex.topRank)) s += 0.08;
    return clamp(s, 0, 0.5);
  }

  /* ---------- reading opponents ---------- */
  /** Preflop range width (share of all hands) from public preflop actions, position and their history. */
  function rangeWidth(o, model) {
    const pre = o.acts.filter((a) => a.street === 0);
    const raises = pre.filter((a) => a.type === 'r' || a.type === 'b').length;
    const vpip = model ? model.vpip : 0.28, pfr = model ? Math.max(0.04, model.pfr) : 0.16;
    const posW = o.behindAtOpen != null ? clamp(2.2 / (o.behindAtOpen + 1.3), 0.5, 1.7) : 1;
    if (o.allInPre && raises) return clamp(pfr * 0.6, 0.04, 0.5);
    if (raises >= 3) return clamp(pfr * 0.12, 0.02, 0.06);
    if (raises === 2) return clamp(pfr * 0.3, 0.03, 0.12);
    if (raises === 1) return clamp(pfr * posW, 0.05, 0.7);
    if (pre.some((a) => a.type === 'c')) return clamp(vpip * 1.25, 0.15, 0.9);
    return 1;
  }
  /** After the flop: each bet narrows a range toward its strongest part; calls drop the weakest part.
      Returns { keep: share of the preflop range that is still "honest", bluff: share of bluffs mixed in }. */
  function postflopNarrowing(o, model, prof, curStreet) {
    let keep = 1, bluff = 0, bets = 0, lastAggStreet = -1;
    const streetsBet = new Set();
    for (const a of o.acts) {
      if (a.street === 0) continue;
      if (a.type === 'b' || a.type === 'r') {
        const f = a.frac <= 0.4 ? 0.72 : a.frac <= 0.8 ? 0.6 : a.frac <= 1.3 ? 0.5 : 0.42;
        let m = f;
        if (a.type === 'r') m *= prof.readLines && a.checkRaise ? 0.68 : 0.8;
        if (prof.readLines && a.donk) m = Math.pow(m, 0.75); // leads into the aggressor are often medium hands or draws
        keep *= m; bets++; streetsBet.add(a.street); lastAggStreet = a.street;
        bluff = Math.max(bluff, 0.1 + 0.1 * Math.min(2, a.frac)); // bigger bets are more polarised
      } else if (a.type === 'c') keep *= 0.86;
    }
    if (prof.readLines && streetsBet.size >= 3) keep *= 0.88; // three barrels
    if (!bets) bluff = 0.3; // only calls: the range is capped and keeps many draws
    else {
      const seen = model ? model.bluffiness : 0.2;
      bluff = clamp(bluff * (0.45 + seen / 0.2 * 0.55), 0.03, 0.55);
      if (lastAggStreet < curStreet) bluff *= 0.8; // bets on earlier streets, then checks: fewer pure bluffs
    }
    // A bot that reads less narrows less: n = 0 keeps the whole range.
    const n = prof.narrow;
    return { keep: clamp(1 - (1 - clamp(keep, bets ? 0.06 : 0.25, 1)) * n, 0.06, 1), bluff: 1 - (1 - bluff) * n };
  }

  /* ---------- Monte-Carlo equity against modelled ranges ---------- */
  const PAIR_MID = Fast.B[5] + 6 * Fast.B[4]; // about "a pair of eights": the value a strong draw continues like
  function drawBonus(game, holeIds, boardIds, score) {
    if (boardIds.length >= 5 || score >= PAIR_MID) return score;
    const all = [...holeIds, ...boardIds], sc = [0, 0, 0, 0];
    all.forEach((c) => sc[c & 3]++);
    const fd = holeIds.some((c) => sc[c & 3] >= 4);
    let m = 0; all.forEach((c) => { m |= 1 << (c >> 2); });
    const mm = (m << 1) | ((m >> 12) & 1), s4 = mm & (mm >> 1) & (mm >> 2) & (mm >> 3);
    return fd || s4 ? Math.max(score, PAIR_MID) : score;
  }
  /** Build everything the simulation needs. Opponent hands are drawn from their actual ranges. */
  function planEquity(game, hc, holeIds, boardIds, opps, sims, rng) {
    const dead = new Uint8Array(52); holeIds.forEach((c) => { dead[c] = 1; }); boardIds.forEach((c) => { dead[c] = 1; });
    const plans = opps.map((o) => {
      const p = { w: o.w ?? 1, keep: o.keep ?? 1, bluff: o.bluff ?? 1, thr: -1, L: game === 'holdem' ? combosWithin(o.w ?? 1) : 0 };
      if (boardIds.length >= 3 && p.keep < 0.99) {
        // strength threshold separating the top `keep` of their range on this board
        const v = [];
        for (let k = 0; k < 160; k++) { const h = sampleHand(game, hc, p, dead, null, rng); if (h) v.push(drawBonus(game, h, boardIds, strength(game, h, boardIds))); }
        v.sort((a, b) => a - b);
        p.thr = v.length ? v[Math.min(v.length - 1, Math.floor((1 - p.keep) * v.length))] : -1;
      }
      return p;
    });
    return { game, hc, holeIds, boardIds, dead, plans, sims, rng };
  }
  function sampleHand(game, hc, p, dead, used, rng) {
    const busy = (c) => dead[c] || (used && used[c]);
    for (let tries = 0; tries < 80; tries++) {
      let h;
      if (game === 'holdem') { const cmb = PF.combos[rng.int(p.L)]; if (busy(cmb[0]) || busy(cmb[1])) continue; h = cmb; }
      else {
        h = []; for (let i = 0; i < hc; i++) { let c; do c = rng.int(52); while (busy(c) || h.includes(c)); h.push(c); }
        if (p.w < 1 && tries < 40 && omahaPctIds(h) > p.w) continue;
      }
      return h;
    }
    return null;
  }
  const idsToStr = (ids) => ids.map((c) => RANKS[c >> 2] + 'shdc'[c & 3]);
  const omahaPctIds = (ids) => omahaPct(idsToStr(ids));
  /** Run `n` samples of a plan; returns [wins+ties, samples]. */
  function runEquity(P, n) {
    const { game, hc, holeIds, boardIds, dead, plans, rng } = P;
    const used = new Uint8Array(52), run = new Int32Array(5), oh = [];
    let win = 0, cnt = 0;
    for (let it = 0; it < n; it++) {
      used.fill(0);
      oh.length = 0;
      let ok = true;
      for (const p of plans) {
        let h = null;
        for (let t = 0; t < 30; t++) {
          const c = sampleHand(game, hc, p, dead, used, rng);
          if (!c) break;
          h = c;
          if (p.thr < 0 || rng.next() < p.bluff) break;
          if (drawBonus(game, c, boardIds, strength(game, c, boardIds)) >= p.thr) break;
        }
        if (!h) { ok = false; break; }
        h.forEach((c) => { used[c] = 1; }); oh.push(h);
      }
      if (!ok) continue;
      for (let i = 0; i < boardIds.length; i++) run[i] = boardIds[i];
      for (let i = boardIds.length; i < 5; i++) { let c; do c = rng.int(52); while (dead[c] || used[c]); used[c] = 1; run[i] = c; }
      const full = Array.from(run);
      const my = strength(game, holeIds, full);
      let best = -1, ties = 0;
      for (const h of oh) { const s = strength(game, h, full); if (s > best) { best = s; ties = 1; } else if (s === best) ties++; }
      if (my > best) win++; else if (my === best) win += 1 / (ties + 1);
      cnt++;
    }
    return [win, cnt];
  }
  /** Public wrapper (also used by the self-tests): equity against opponents of the given range widths. */
  function equity(o) {
    const P = planEquity(o.game, o.holeCount || o.hole.length, o.hole.map(Fast.id), o.board.map(Fast.id), o.widths.map((w) => ({ w })), o.iters, o.rng);
    const [w, n] = runEquity(P, o.iters);
    return n ? { equity: w / n, iters: n } : { equity: 0.5, iters: 0 };
  }
  async function equityAsync(P) {
    let W = 0, N = 0;
    const chunk = 300, t0 = Date.now();
    while (N < P.sims) {
      const [w, n] = runEquity(P, Math.min(chunk, P.sims - N));
      W += w; N += Math.max(1, n);
      if (Date.now() - t0 > 1500) break; // a safety stop on very slow devices
      await new Promise((r) => setTimeout(r, 0)); // let the page breathe between chunks
    }
    return N ? W / N : 0.5;
  }

  /* ---------- opponent models from public history ---------- */
  /** Per-name tendencies from finished hands (public actions and shown cards only). */
  function buildModels(hands) {
    const M = Object.create(null);
    const get = (nm) => (M[nm] = M[nm] || { hands: 0, vpip: 0, pfr: 0, aggr: 0, passive: 0, facedS: 0, foldS: 0, facedB: 0, foldB: 0, rivAgg: 0, rivAggWeak: 0, cbetChance: 0, cbet: 0 });
    for (const h of hands) {
      const n = h.players.length, bets = new Array(n).fill(0);
      let cur = 0, pot = 0, pfa = -1, cbetOpen = false;
      const rivAgg = new Set();
      h.players.forEach((p) => { get(p.name).hands++; });
      const vp = new Set(), pr = new Set();
      for (const e of h.log) {
        if (e.t === 'post') { pot += e.amt; if (e.kind !== 'a') { bets[e.p] += e.amt; cur = Math.max(cur, bets[e.p]); } continue; }
        if (e.t === 'deal') { bets.fill(0); cur = 0; cbetOpen = e.street === 1 && pfa >= 0; continue; }
        if (e.t !== 'act') continue;
        const m = get(h.players[e.p].name);
        if (e.street > 0) {
          if (cur > bets[e.p]) {
            const frac = (cur - bets[e.p]) / Math.max(1, pot - (cur - bets[e.p]));
            if (frac <= 0.6) { m.facedS++; if (e.type === 'f') m.foldS++; } else { m.facedB++; if (e.type === 'f') m.foldB++; }
          }
          if (e.type === 'b' || e.type === 'r') { m.aggr++; if (e.street === 3) rivAgg.add(e.p); }
          if (e.type === 'c') m.passive++;
          if (e.street === 1 && cbetOpen && e.p === pfa) { m.cbetChance++; if (e.type === 'b') m.cbet++; cbetOpen = false; }
          if (e.street === 1 && (e.type === 'b') && e.p !== pfa) cbetOpen = false;
        } else {
          if (e.type === 'c' || e.type === 'r' || e.type === 'b') vp.add(e.p);
          if (e.type === 'r' || e.type === 'b') { pr.add(e.p); pfa = e.p; }
        }
        if (e.amt) { pot += e.amt; bets[e.p] += e.amt; cur = Math.max(cur, bets[e.p]); }
      }
      vp.forEach((i) => get(h.players[i].name).vpip++);
      pr.forEach((i) => get(h.players[i].name).pfr++);
      // Bluff evidence: river aggression that reached a showdown with a weak hand.
      if (h.results && h.results.showdown && h.board.length === 5) for (const i of rivAgg) {
        const p = h.players[i];
        if (!p.shown || !p.hole) continue;
        const m = get(p.name); m.rivAgg++;
        // weak = no pair, or only the pair that is already on the board
        const sc = Fast.cat(strength(h.game, p.hole.map(Fast.id), h.board.map(Fast.id))), bc = h.game === 'holdem' ? Fast.cat(Fast.rank(h.board.map(Fast.id), 5)) : 0;
        if (sc === 0 || (sc <= 1 && sc === bc)) m.rivAggWeak++;
      }
    }
    const out = Object.create(null);
    for (const [nm, m] of Object.entries(M)) {
      const w = Math.min(1, m.hands / 12); // shrink toward a neutral prior until we have data
      const vpip = w * (m.vpip / Math.max(1, m.hands)) + (1 - w) * 0.28;
      const pfr = w * (m.pfr / Math.max(1, m.hands)) + (1 - w) * 0.16;
      const af = w * (m.passive ? m.aggr / m.passive : m.aggr ? 3 : 1.2) + (1 - w) * 1.2;
      const foldSmall = (m.foldS + 0.35 * 5) / (m.facedS + 5), foldBig = (m.foldB + 0.5 * 5) / (m.facedB + 5);
      const shownBluff = (m.rivAggWeak + 0.2 * 4) / (m.rivAgg + 4);
      const bluffiness = clamp(0.5 * shownBluff + 0.5 * clamp((af - 1) * 0.12 + 0.15, 0.05, 0.6), 0.04, 0.6);
      out[nm] = {
        vpip, pfr, af, fold: (foldSmall + foldBig) / 2, foldSmall, foldBig, bluffiness,
        cbet: (m.cbet + 0.6 * 4) / (m.cbetChance + 4),
        isStation: vpip > 0.42 && foldSmall < 0.3, isNit: vpip < 0.17, isLag: vpip > 0.35 && af > 2,
        style: vpip > 0.42 && foldSmall < 0.3 ? 'calling station' : vpip < 0.17 ? 'nit' : vpip > 0.35 && af > 2 ? 'loose-aggressive' : 'regular',
      };
    }
    return out;
  }

  /* ---------- sizing ---------- */
  const SIZES = [0.28, 0.4, 0.55, 0.72, 1.0, 1.4, 2.0];
  /** Balanced sizing: bluffs and strong hands share the same "polar" sizes, medium hands use smaller
      "merged" sizes, so a size alone does not reveal whether the bot is bluffing. Weaker profiles keep
      the old habits (bigger with good hands), which is what makes them weaker. */
  function chooseSizing(ctx, kind, eq, prof, pers, rng) {
    const tex = ctx.tex, iq = prof.sizingIQ, w = SIZES.map(() => 0);
    if (iq < 0.2) return 0.5;
    if (iq < 0.35) return ctx.street === 0 ? 1.0 : 0.5;
    if (iq < 0.6) {
      if (kind === 'value') { if (eq > 0.86) { w[3] = 0.7; w[4] = 1.4; w[5] = iq; } else if (eq > 0.72) { w[2] = 1.0; w[3] = 1.3; w[4] = 1.0; } else { w[0] = 0.9; w[1] = 1.4; w[2] = 1.1; w[3] = 0.5; } }
      else if (kind === 'bluff') { w[1] = 1.2; w[2] = 1.0; w[3] = 0.7; } else { w[1] = 1.0; w[2] = 1.3; w[3] = 1.1; }
    } else {
      // Bluffs and strong hands mostly use big "polar" sizes, medium hands mostly small "merged" ones,
      // and each sometimes borrows the other family, so the size distributions overlap.
      const polarShare = kind === 'bluff' ? 0.62 : kind === 'value' && eq > 0.78 ? 0.72 : 0.22;
      const polar = rng.next() < polarShare;
      if (polar) { w[2] = 0.7; w[3] = 1.1; w[4] = 1.2; w[5] = 0.7 * iq; w[6] = (ctx.street === 3 ? 0.55 : 0.25) * iq; }
      else { w[0] = 0.8; w[1] = 1.3; w[2] = 1.2; w[3] = 0.6; }
      if (tex.wetness > 0.6) { w[3] += 0.4; w[4] += 0.3; }
      if (tex.wetness < 0.3) { w[0] += 0.5; w[1] += 0.4; }
      if (ctx.spr < 2) { w[5] += 0.5; w[6] += 0.5; }
    }
    for (let i = 0; i < w.length; i++) w[i] *= Math.pow(SIZES[i], (pers.sizing - 1) * 1.6);
    const f = SIZES[rng.weighted(w)];
    return iq >= 0.6 ? f * (0.92 + rng.next() * 0.16) : f; // a little jitter so exact sizes say nothing
  }

  /* ---------- the decision ---------- */
  /** Everything about the decision except the equity simulation (so it can run in chunks). */
  function prepare(ctx) {
    if (ctx._p) return ctx._p;
    const prof = PROFILES[ctx.difficulty] || PROFILES.intermediate;
    const pers = styleFor(ctx.personality, ctx.traits);
    const rng = ctx.rng || makeRng();
    const work = ctx.work || 1; // simulation budget multiplier (self-tests use a small one)
    const game = ctx.game, holeIds = ctx.hole.map(Fast.id), boardIds = ctx.board.map(Fast.id);
    const opps = ctx.opponents.map((o) => {
      const model = (ctx.models || {})[o.name];
      const w = prof.useRanges ? rangeWidth(o, model) : 1;
      const nar = ctx.board.length >= 3 && prof.narrow > 0 ? postflopNarrowing(o, model, prof, ctx.street) : { keep: 1, bluff: 1 };
      return { w, keep: nar.keep, bluff: nar.bluff };
    });
    let plan = null;
    const nOpp = Math.max(1, ctx.opponents.length);
    if (prof.sims > 0 && (ctx.board.length > 0 || game !== 'holdem' || (prof.useRanges && nOpp <= 5))) {
      const sims = Math.max(40, Math.round(prof.sims * work * (ctx.board.length === 0 ? 0.6 : 1)));
      plan = planEquity(game, ctx.holeCount, holeIds, boardIds, opps, sims, rng);
    }
    return (ctx._p = { prof, pers, rng, holeIds, boardIds, opps, plan, eq: undefined });
  }

  function decide(ctx) {
    const P = prepare(ctx);
    if (P.plan && P.eq === undefined) { const [w, n] = runEquity(P.plan, P.plan.sims); P.eq = n ? w / n : 0.5; }
    return choose(ctx, P);
  }
  /** Same decision, but the simulation yields to the page between chunks so the UI never freezes. */
  async function decideAsync(ctx) {
    const P = prepare(ctx);
    if (P.plan && P.eq === undefined) P.eq = await equityAsync(P.plan);
    return choose(ctx, P);
  }

  function choose(ctx, P) {
    const { prof, pers, rng } = P;
    const L = ctx.legal, game = ctx.game, board = ctx.board;
    const nOpp = Math.max(1, ctx.opponents.length);
    ctx.tex = analyzeBoard(board);
    const pot = L.pot, toCall = L.toCall, facing = toCall > 0;
    const stackLeft = L.stack, bbStack = ctx.effStack / Math.max(1, ctx.bb);
    ctx.spr = pot > 0 ? ctx.effStack / pot : 99;

    // 1. equity
    let eq;
    if (P.eq !== undefined) eq = P.eq;
    else if (board.length === 0) eq = game === 'holdem' ? holdemEq(ctx.hole, nOpp) : Math.pow(omahaScore(ctx.hole), Math.pow(nOpp, 0.82));
    else eq = clamp(0.16 + Fast.cat(strength(game, P.holeIds, P.boardIds)) * 0.115, 0.08, 0.96);
    if (prof.noise > 0) eq = clamp(eq + rng.gauss(0, prof.noise * 0.42), 0.01, 0.99);
    const made = board.length >= 3 ? strength(game, P.holeIds, P.boardIds) : -1;
    const madeCat = made >= 0 ? Fast.cat(made) : -1;

    // Preflop has its own, position-aware logic.
    if (board.length === 0) return preflop(ctx, P, eq);

    // 2. pot mathematics
    const potOdds = facing ? toCall / (pot + toCall) : 0;
    const spr = ctx.spr;

    // 3. hand shape
    const draws = prof.level >= 2 ? countOuts(game, P.holeIds, P.boardIds) : { outs: 0, pct: 0 };
    const blockers = prof.level >= 4 ? blockerScore(ctx.hole, board, ctx.tex) : 0;

    // 4. implied / reverse implied odds
    let implied = 0, reverse = 0;
    if (prof.useOdds && draws.outs >= 6 && ctx.street < 3 && spr > 1.2) implied = clamp((draws.pct * ctx.effStack * 0.38) / Math.max(1, pot + toCall), 0, 0.16);
    if (prof.level >= 4 && madeCat >= 0 && madeCat <= 1 && spr > 4 && ctx.street < 3) reverse = 0.04;
    const effEq = clamp(eq + implied - reverse, 0, 1);

    // 5. opponent read: the player who made the current bet (or, for our bets, whoever is left)
    const models = ctx.opponents.map((o) => (ctx.models || {})[o.name]).filter(Boolean);
    const agg = ctx.aggressor && (ctx.models || {})[ctx.aggressor];
    const ex = { callAdj: 0, bluffAdj: 1, valueAdj: 1 };
    if (prof.adapt > 0) {
      const A = prof.adapt, m = agg || models[0];
      if (m) {
        if (facing) ex.callAdj = (m.bluffiness - 0.2) * 0.35 * A + (m.isLag ? 0.03 * A : 0) - (m.isNit ? 0.04 * A : 0);
        const avgFold = models.length ? models.reduce((a, x) => a + x.fold, 0) / models.length : 0.42;
        if (models.some((x) => x.isStation)) { ex.bluffAdj = 1 - 0.65 * A; ex.valueAdj = 1 + 0.45 * A; }
        if (avgFold > 0.55) ex.bluffAdj *= 1 + 0.5 * A;
        if (avgFold < 0.3) ex.bluffAdj *= 1 - 0.4 * A;
      }
    }
    // Raising a bettor: they fold only the bluffy part of an already-strong range.
    const aggIdx = ctx.opponents.findIndex((o) => o.name === ctx.aggressor);
    const aggBluff = aggIdx >= 0 && P.opps[aggIdx] ? P.opps[aggIdx].bluff : 0.3;
    const foldEquity = (sizeRatio) => {
      if (!prof.useFoldEq) return facing ? 0.2 : 0.3;
      let fe = 1;
      for (const o of ctx.opponents) {
        const m = (ctx.models || {})[o.name];
        let f = m ? (sizeRatio <= 0.6 ? m.foldSmall : m.foldBig) : sizeRatio <= 0.6 ? 0.3 : 0.42;
        f *= clamp(0.75 + 0.35 * Math.log(1 + sizeRatio * 2.2) / Math.log(3.2), 0.6, 1.3);
        f *= clamp(1.2 - ctx.tex.wetness * 0.45, 0.7, 1.2);
        f *= ctx.street === 3 ? 0.95 : 1;
        fe *= clamp(f, 0.02, 0.92);
      }
      if (facing) fe *= clamp(0.2 + Math.min(aggBluff, 0.35) * 1.3, 0.15, 0.65);
      return clamp(fe * (0.85 + (0.3 * pers.bluff) / 1.4), 0.02, 0.9);
    };

    // 6. candidates and their value
    const cands = [];
    const realise = (ctx.actsLast ? 0.82 : 0.66) * (ctx.street === 3 ? 1.2 : 1) * (1 - 0.05 * Math.max(0, nOpp - 1));
    const evCheck = effEq * pot * clamp(realise, 0.3, 1);
    let evCall = 0;
    if (facing) {
      cands.push({ type: 'fold', w: 0 });
      evCall = clamp(effEq + ex.callAdj, 0, 1) * (pot + toCall) - toCall;
      cands.push({ type: 'call', isCall: true, ev: evCall, w: 0 });
    } else cands.push({ type: 'check', ev: evCheck, w: 0 });
    if (L.canRaise) {
      const kinds = [];
      if (eq >= (facing && toCall > pot * 0.45 ? 0.72 : 0.6)) kinds.push('value');
      if (eq < 0.45 && (draws.outs >= 4 || blockers > 0.12 || rng.next() < 0.3)) kinds.push('bluff');
      if (eq >= 0.44 && eq < 0.66 && !(facing && toCall > pot * 0.45)) kinds.push('protect'); // no "protection" raises against big bets
      if (!kinds.length && !(facing && toCall > pot * 0.45)) kinds.push(eq >= 0.5 ? 'value' : 'bluff');
      for (const kind of kinds) {
        const frac = chooseSizing(ctx, kind, eq, prof, pers, rng);
        let to = facing ? L.callTo + frac * (pot + toCall) : L.myBet + frac * pot;
        to = clamp(Math.round(to), L.minTo, L.maxTo);
        const cost = to - L.myBet;
        if (cost <= 0) continue;
        const sizeRatio = (to - L.callTo) / Math.max(1, pot + toCall); // the real size, after any clamping
        const fe = foldEquity(sizeRatio);
        const eqCalled = clamp(eq - (1 - eq) * (0.1 + 0.34 * Math.min(2.5, sizeRatio)) * (1 + ctx.tex.wetness * 0.35), 0.02, 0.99);
        const potFinal = pot + cost + Math.max(0, cost - toCall);
        cands.push({ type: L.isBet ? 'bet' : 'raise', to, kind, fe, frac: sizeRatio, ev: fe * pot + (1 - fe) * (eqCalled * potFinal - cost), shove: cost >= stackLeft });
      }
    }

    // 7. strategy weights: every action is scored in chips, then turned into a weight with a
    // temperature (stronger bots are more decisive), then shaped by style.
    if (facing) {
      const call = cands.find((c) => c.isCall);
      const realCall = ctx.street === 3 ? 1 : clamp((ctx.actsLast ? 0.93 : 0.82) - Math.min(0.1, spr * 0.012), 0.6, 1);
      // Stubborn styles shade the price; the GTO-inspired style defends by minimum defence frequency.
      let edge = effEq * realCall - potOdds + (pers.sticky - 1) * 0.08 + ex.callAdj;
      if (pers.balanced && prof.level >= 3) edge += clamp(0.06 - potOdds * 0.15, 0, 0.06);
      call.ev = edge * (pot + toCall);
      cands.find((c) => c.type === 'fold').ev = 0;
    }
    const T = Math.max(ctx.bb * 0.5, pot * 0.45) * (0.3 + prof.noise * 1.8);
    const best = Math.max(...cands.map((c) => c.ev));
    for (const c of cands) {
      c.w = Math.exp(clamp((c.ev - best) / T, -14, 0));
      if (c.type === 'check') c.w *= 1.1;
      if (c.isCall && prof.level >= 2 && effEq < potOdds * 0.5) c.w *= 0.08; // hopeless calls
      const aggressive = c.type === 'bet' || c.type === 'raise';
      if (aggressive && c.kind === 'value') c.w *= (1 + (eq - 0.6) * 2.4) * pers.aggr * ex.valueAdj * (eq > 0.85 && facing ? 1.8 : 1);
      if (aggressive && ctx.street >= 1 && ctx.isAggressor && !facing) c.w *= (0.8 + prof.cbet) * pers.cbet;
      if (aggressive && c.kind === 'bluff') {
        const profitable = c.fe > (c.frac / (1 + c.frac)) * 0.95;
        c.w *= 0.6 * prof.bluff * pers.bluff * ex.bluffAdj * (profitable ? 1.15 : 0.12) * (1 + blockers * 1.5) * (ctx.actsLast ? 1.3 : 0.75);
        if (facing) c.w *= 0.3; // bluff-raises are rarer than bluff bets
        if (nOpp > 1) c.w *= 0.35 / nOpp;
        if (draws.outs === 0 && ctx.street >= 2) c.w *= 0.55;
      }
      if (aggressive && c.kind === 'protect') c.w *= pers.aggr * 0.9 * (ctx.actsLast ? 1.1 : 0.95);
      if (aggressive && facing && prof.level <= 1 && toCall > pot * 0.45) c.w *= 0.3; // weak players mostly just call big bets
      if (c.type === 'check' && eq > 0.8) c.w *= 0.45 + pers.trap * 0.75;
      if (c.isCall && eq > 0.86) c.w *= 0.55 + pers.trap * 0.7;
      if (aggressive && !ctx.actsLast) c.w *= 0.88;
      if (prof.level >= 3) {
        if (spr < 1.5 && eq > 0.55 && (c.isCall || aggressive)) c.w *= 1.5;
        if (spr < 1.5 && eq < 0.38 && c.type === 'fold') c.w *= 1.7;
      }
      if (aggressive && c.shove && !(eq > 0.8 || (c.fe > 0.55 && eq > 0.42) || spr < 1.8 || draws.outs >= 12)) c.w *= 0.06;
      if (!isFinite(c.w) || c.w < 0) c.w = 0;
    }
    // Never fold a hand this strong (any level): it is the nuts or close to it against their range.
    const nutted = madeCat >= 6 || (madeCat >= 4 && eq >= prof.guard); // a full house or better is never folded
    if (facing && (eq >= prof.guard + 0.04 || nutted)) cands.forEach((c) => { if (c.type === 'fold') c.w = 0; });
    const choice = pick(cands, prof, rng, L, eq);
    // Slow-play now and then with a monster, so a raise is never a guaranteed tell.
    if ((choice.type === 'raise' || choice.type === 'bet') && eq > 0.9 && rng.next() < 0.1 * pers.trap * (ctx.street === 3 ? 0.4 : 1)) return { type: facing ? 'call' : 'check', meta: { eq, kind: 'trap' } };
    return choice;
  }

  /** Safe mixing: vary between actions that are close in value, never pick one that is clearly worse. */
  function pick(cands, prof, rng, L, eq) {
    const mx = Math.max(...cands.map((c) => c.w));
    if (mx > 0) {
      const floor = mx * (prof.level <= 1 ? 0.05 : 0.12);
      cands.forEach((c) => { if (c.w < floor) c.w = 0; else c.w = Math.pow(c.w / mx, 1 - prof.mix) * mx; });
    }
    const ch = cands[rng.weighted(cands.map((c) => c.w))] || cands[0];
    if (ch.type === 'fold' && L.canCheck) return { type: 'check', meta: { eq } };
    if (ch.type === 'bet' || ch.type === 'raise') return { type: ch.type, to: clamp(ch.to, L.minTo, L.maxTo), meta: { eq, kind: ch.kind } };
    return { type: ch.type, meta: { eq } };
  }

  /** Preflop: position-aware opening ranges, sensible 3-betting, and push/fold when short. */
  function preflop(ctx, P, eq) {
    const { prof, pers, rng } = P, L = ctx.legal, bb = ctx.bb;
    const pct = handPct(ctx.game, ctx.hole);
    const fuzz = 0.025 + prof.noise * 0.25; // ranges have soft edges, so borderline hands are mixed
    const inRange = (w) => rng.next() < 1 / (1 + Math.exp((pct - w) / Math.max(0.004, fuzz * Math.sqrt(Math.max(w, 0.02)))));
    const nDealt = ctx.nDealt || ctx.opponents.length + 1, behind = ctx.behind ?? 1;
    const posTable = [1.0, 1.35, 1.54, 0.96, 0.69, 0.58, 0.5, 0.45, 0.42];
    let posF = nDealt === 2 ? 2.9 : posTable[Math.min(behind, 8)];
    posF = 1.15 + (posF - 1.15) * prof.position; // beginners barely notice position
    if (nDealt > 2 && nDealt < 6 && behind > 0) posF *= 1 + (6 - nDealt) * 0.1; // short-handed tables play wider
    const openW = clamp(pers.vpip * posF * (1 + (prof.level - 3) * 0.015), 0.04, 0.95);
    const raise = (to) => (L.canRaise ? { type: L.isBet ? 'bet' : 'raise', to: clamp(Math.round(to), L.minTo, L.maxTo), meta: { eq } } : { type: L.canCheck ? 'check' : 'call', meta: { eq } });
    const passive = () => ({ type: L.canCheck ? 'check' : 'call', meta: { eq } });
    const fold = () => (L.canCheck ? { type: 'check', meta: { eq } } : { type: 'fold', meta: { eq } });
    const shove = () => raise(L.maxTo);
    const facingRaise = ctx.preRaises > 0;
    const noLimit = (ctx.limit || L.limit) === 'nl';

    // Short stack: all-in or fold (no-limit only).
    if (noLimit && prof.pushFold && ctx.effStack <= 13 * bb && L.canRaise) {
      const stackBB = ctx.effStack / bb;
      if (!facingRaise) {
        let pushW = Math.min(1, 6 / stackBB) / (1 + 0.35 * Math.max(0, behind - 1));
        if (nDealt === 2) pushW = Math.min(1, 7.5 / stackBB);
        pushW = clamp(pushW * Math.sqrt(pers.vpip / 0.26), 0.04, 1);
        if (inRange(pushW)) return shove();
        return fold();
      }
      // facing a raise or all-in: call/re-shove when our equity against their range beats the price
      const need = L.toCall / (L.pot + L.toCall);
      if (eq > need + 0.02 - (pers.sticky - 1) * 0.05) return L.canRaise && L.maxTo > L.callTo ? shove() : passive();
      return fold();
    }

    if (!facingRaise) {
      const limpers = ctx.limpers || 0;
      if (inRange(openW)) {
        const limpShare = clamp((0.55 - pers.aggr * 0.35) * (1 - prof.level / 7), 0, 0.5);
        if (rng.next() < limpShare && !L.canCheck) return passive();
        const open = (ctx.limit || L.limit) !== 'nl' ? L.minTo : bb * (2.2 + rng.next() * 0.8 * pers.sizing) + limpers * bb + (behind === 1 && nDealt > 2 ? 0.5 * bb : 0);
        return raise(open);
      }
      // the small blind can complete a little wider; the big blind checks
      if (L.canCheck) return passive();
      if (behind === 1 && nDealt > 2 && inRange(openW * 1.5) && L.toCall <= bb / 2 + 0.01) return passive();
      if (limpers && inRange(openW * 1.25) && L.toCall <= bb) return passive();
      return fold();
    }

    // Facing a raise (or several): continue when equity against the raiser's range justifies it.
    const potOdds = L.toCall / (L.pot + L.toCall);
    const realise = (ctx.actsLast ? 0.9 : 0.8) * (ctx.effStack / bb > 40 ? 1.05 : 1);
    // loose styles defend and flat raises much wider; tight ones give up more
    const edge = eq * realise - potOdds + (pers.sticky - 1) * 0.06 + (pers.vpip - 0.26) * 0.3 + (ctx.isBB ? 0.04 : 0);
    const raiserW = ctx.raiserWidth ?? 0.2;
    const valueRe = pct <= Math.max(0.012, raiserW * 0.3 / Math.max(1, ctx.preRaises * 0.8));
    const bluffRe = !valueRe && pct <= Math.min(0.35, openW) && rng.next() < 0.11 * pers.bluff * prof.bluff && ctx.preRaises === 1 && /^A[2-5]s|^K[9T]s|^[56789]{2}s/.test(shortKey(ctx.hole));
    if (L.canRaise && (valueRe && rng.next() < clamp(0.7 * pers.aggr, 0.35, 0.95) || bluffRe)) {
      const to = (ctx.limit || L.limit) !== 'nl' ? L.minTo : L.callTo + (L.pot + L.toCall) * (ctx.actsLast ? 0.85 : 1.05) * (0.9 + rng.next() * 0.2);
      return to >= L.maxTo * 0.6 ? shove() : raise(to);
    }
    if (edge > -0.02 || (valueRe && !L.canRaise)) return passive();
    if (eq >= prof.guard + 0.04) return passive(); // never fold aces (or similar) to a raise
    return fold();
  }

  /** Build a decision context for player i of an Engine hand from public information. */
  function contextFor(h, i, opts) {
    const L = Engine.legal(h);
    const n = h.players.length, me = h.players[i];
    // Walk the log once: every action with its size relative to the pot, lines, aggressors.
    const acts = h.players.map(() => []), bets = new Array(n).fill(0), lastAgg = [-1, -1, -1, -1], checked = h.players.map(() => [false, false, false, false]);
    let pot = 0, cur = 0, preRaises = 0, limpers = 0, raiserIdx = -1;
    const behindAt = new Array(n).fill(null);
    const order = []; for (let k = 1; k <= n; k++) order.push((h.bbIdx + k) % n); // preflop action order, BB last
    for (const e of h.log) {
      if (e.t === 'post') { pot += e.amt; if (e.kind !== 'a') { bets[e.p] += e.amt; cur = Math.max(cur, bets[e.p]); } continue; }
      if (e.t === 'deal') { bets.fill(0); cur = 0; continue; }
      if (e.t !== 'act') continue;
      const before = cur, agg = e.type === 'b' || e.type === 'r';
      const frac = agg ? (e.to - before) / Math.max(1, pot + (before - bets[e.p])) : 0;
      const prevAgg = e.street > 0 ? lastAgg[e.street - 1] : -1;
      acts[e.p].push({ street: e.street, type: e.type, frac, checkRaise: agg && e.type === 'r' && checked[e.p][e.street], donk: agg && e.type === 'b' && prevAgg >= 0 && prevAgg !== e.p });
      if (e.type === 'x') checked[e.p][e.street] = true;
      if (agg) {
        lastAgg[e.street] = e.p;
        if (e.street === 0) { preRaises++; raiserIdx = e.p; if (behindAt[e.p] == null) behindAt[e.p] = n - 1 - order.indexOf(e.p); }
      } else if (e.street === 0 && e.type === 'c' && preRaises === 0) limpers++;
      if (e.amt) { pot += e.amt; bets[e.p] += e.amt; cur = Math.max(cur, bets[e.p]); }
    }
    const models = opts.models || {};
    const opponents = h.players.map((p, j) => ({ p, j })).filter(({ p, j }) => j !== i && !p.folded)
      .map(({ p, j }) => ({ name: p.name, acts: acts[j], allIn: p.allIn, allInPre: p.allIn && acts[j].some((a) => a.street === 0 && (a.type === 'r' || a.type === 'b')), behindAtOpen: behindAt[j] }));
    let actsLast = i === h.bbIdx;
    if (h.street > 0) {
      let last = -1;
      for (let k = 1; k <= n; k++) { const j = (h.button + k) % n; if (!h.players[j].folded && !h.players[j].allIn) last = j; }
      actsLast = last === i;
    }
    // players still to act after us this preflop round (0 = we close the action)
    let behind = 0;
    for (let k = order.indexOf(i) + 1; k < order.length; k++) { const p = h.players[order[k]]; if (!p.folded && !p.allIn) behind++; }
    const oppStacks = h.players.filter((p, j) => j !== i && !p.folded).map((p) => p.stack + p.bet);
    const raiser = raiserIdx >= 0 ? h.players[raiserIdx] : null;
    const raiserOpp = raiser ? opponents.find((o) => o.name === raiser.name) : null;
    const curAgg = lastAgg[h.street];
    return {
      game: h.game, holeCount: h.holeCount, hole: me.hole, board: h.board.slice(), street: h.street, legal: L, bb: h.bb, limit: h.limit,
      actsLast, effStack: Math.min(me.stack + me.bet, Math.max(0, ...oppStacks)), opponents, models,
      // the aggressor on a street is whoever bet last on the previous one (preflop raiser on the flop)
      isAggressor: h.street > 0 && lastAgg[h.street - 1] === i,
      aggressor: curAgg >= 0 && curAgg !== i ? h.players[curAgg].name : null,
      unopened: h.street === 0 && preRaises === 0, preRaises, limpers, behind, nDealt: n, isBB: i === h.bbIdx,
      raiserWidth: raiserOpp ? rangeWidth(raiserOpp, models[raiserOpp.name]) : null,
      difficulty: opts.difficulty, personality: opts.personality, traits: opts.traits, rng: opts.rng, work: opts.work,
    };
  }

  return { PROFILES, LABELS, PERSONALITIES, NAMES, decide, decideAsync, contextFor, buildModels, equity, chen, holdemPct, omahaScore, analyzeBoard, makeRng, makeTraits, driftTraits, styleFor, Fast };
})();
