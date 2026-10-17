
/* =====================================================================
   3b. FAIR SHUFFLE PROOFS  (pure; commit-reveal with player entropy)

   Every hand:
   1. The host shuffles a secret "pre-deck" D0, gives each card a random salt and
      publishes 52 commitments  C[i] = SHA256(D0[i] + ":" + salt[i]).
   2. Every dealt player picks a random seed and sends SHA256(seed) (a commitment),
      so nobody (host included) can pick their seed after seeing someone else's.
   3. Seeds are revealed and checked against those commitments. The final order is
      a permutation P derived from SHA256(hand number, commitments, sorted seeds):
      the card dealt at position j is D0[P[j]].
   Because D0 was fixed before any player's randomness existed, the host cannot
   choose which card lands where. Every card that becomes visible to a player
   (their own hole cards, the board, shown hands, and at the end burns and the
   undealt stub) arrives with its salt, and each browser checks it against the
   commitment for its position.
   ===================================================================== */
const Fair = (() => {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

  /** SHA-256 of a UTF-8 string, as lowercase hex. Pure JS so it also works on plain-HTTP LAN addresses. */
  function sha256(str) {
    const msg = new TextEncoder().encode(String(str));
    const len = msg.length, bitLen = len * 8;
    const total = ((len + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(total);
    buf.set(msg); buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000)); dv.setUint32(total - 4, bitLen >>> 0);
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return Array.from(H, (x) => x.toString(16).padStart(8, '0')).join('');
  }

  const isHex = (s, n) => typeof s === 'string' && s.length === n && /^[0-9a-f]+$/.test(s);
  const commit = (card, salt) => sha256(card + ':' + salt);

  /** The value every party derives the final order from. Seeds are sorted so order of arrival is irrelevant. */
  function combine(no, commits, seeds) {
    return sha256(`feltroom-v1|${no}|${sha256(commits.join(','))}|${seeds.slice().sort().join(',')}`);
  }

  /** Deterministic, unbiased Fisher-Yates permutation of 0..n-1 driven by SHA-256 in counter mode. */
  function permutation(seedHex, n = 52) {
    let pool = [], ctr = 0;
    const next32 = () => {
      if (!pool.length) {
        const hx = sha256(`${seedHex}#${ctr++}`);
        for (let i = 0; i < 64; i += 8) pool.push(parseInt(hx.slice(i, i + 8), 16));
      }
      return pool.shift();
    };
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const m = i + 1, limit = Math.floor(0x100000000 / m) * m;
      let x;
      do { x = next32(); } while (x >= limit);
      const j = x % m;
      [p[i], p[j]] = [p[j], p[i]];
    }
    return p;
  }

  /** Where every card comes from: hole cards round-robin from the left of the button, then burn-and-turn. */
  function layout(nPlayers, holeCount) {
    const b = nPlayers * holeCount;
    return {
      hole: (k, r) => r * nPlayers + k,
      board: [b + 1, b + 2, b + 3, b + 5, b + 7],
      burns: [b, b + 4, b + 6],
      used: b + 8,
    };
  }

  /**
   * Client-side checker. Feed it the host's fair1/fair2/fair3/fairown messages and every state view;
   * it reports 'verified', 'unverified' (not enough data, e.g. joined mid-hand) or 'failed' with reasons.
   */
  class Checker {
    constructor(onChange) { this.hands = Object.create(null); this.onChange = onChange || (() => {}); this.latest = null; }
    _ok(no) { return Number.isInteger(no) && no > 0 && no < 1e9; }
    _h(no) { return (this.hands[no] = this.hands[no] || { no, problems: [], notes: [], checked: new Set(), cards: new Map(), status: 'unverified', verified: 0 }); }
    _fail(f, msg) { if (!f.problems.includes(msg)) { f.problems.push(msg); f.status = 'failed'; this.latest = f; this.onChange(f, msg); } }
    _note(f, msg) { if (!f.notes.includes(msg)) f.notes.push(msg); }

    fair1(m) {
      if (!this._ok(m.no)) return null;
      if (!Array.isArray(m.commits) || m.commits.length !== 52 || !m.commits.every((c) => isHex(c, 64))) return null;
      const f = this._h(m.no);
      if (f.commits) return null; // commitments can never be replaced mid-hand
      f.commits = m.commits.slice();
      if (new Set(f.commits).size !== 52) this._fail(f, 'The host committed to the same card hash twice.');
      f.seed = U.randHex(32);
      f.seedC = sha256(f.seed);
      this.latest = f;
      return { t: 'fairc', no: m.no, c: f.seedC };
    }
    fair2(m) {
      if (!this._ok(m.no)) return null;
      const f = this.hands[m.no];
      if (!f || !Array.isArray(m.seedCommits) || f.seedCommits) return null;
      f.seedCommits = m.seedCommits.filter((c) => isHex(c, 64));
      if (f.seedC && !f.seedCommits.includes(f.seedC)) { this._note(f, 'Your shuffle contribution arrived too late to be used this hand.'); return null; }
      return f.seedC ? { t: 'fairs', no: m.no, seed: f.seed } : null;
    }
    fair3(m) {
      if (!this._ok(m.no)) return;
      const f = this.hands[m.no];
      if (!f || !f.commits || f.perm) return;
      const seeds = (m.seeds || []).filter((x) => isHex(x, 64));
      if (f.seedCommits) {
        for (const sd of seeds) if (!f.seedCommits.includes(sha256(sd))) this._fail(f, 'The host used a shuffle seed that nobody committed to in advance.');
        if (new Set(seeds).size !== seeds.length) this._fail(f, 'A shuffle seed was counted twice.');
      }
      if (f.seedC && f.seedCommits && f.seedCommits.includes(f.seedC) && !seeds.includes(f.seed)) this._fail(f, 'The host left your shuffle seed out after you revealed it.');
      if (!seeds.length) this._note(f, 'No player randomness was available for this shuffle.');
      f.seeds = seeds;
      f.order = Array.isArray(m.order) ? m.order.map(String) : [];
      f.holeCount = Number(m.holeCount) || 2;
      f.perm = permutation(combine(m.no, f.commits, seeds), 52);
      f.layout = layout(f.order.length, f.holeCount);
      if (f.status !== 'failed') f.status = 'pending';
    }
    _reveal(f, r, where) {
      if (!r || typeof r.pos !== 'number' || !f.perm || r.pos < 0 || r.pos > 51) return null;
      const key = r.pos + ':' + r.card;
      if (f.checked.has(key)) return r.card;
      if (!Cards.isCard(r.card) || commit(r.card, String(r.salt)) !== f.commits[f.perm[r.pos]]) {
        this._fail(f, `${where} (${Cards.pretty(r.card)}) does not match the deck the host committed to before the shuffle.`);
        return null;
      }
      const prev = f.cards.get(r.card);
      if (prev != null && prev !== r.pos) this._fail(f, `${Cards.pretty(r.card)} appeared in two places in the deck.`);
      f.cards.set(r.card, r.pos);
      f.checked.add(key); f.verified = f.checked.size;
      return r.card;
    }
    own(m, myName) {
      if (!this._ok(m.no)) return;
      const f = this.hands[m.no];
      if (!f || !f.perm) return;
      const k = f.order.indexOf(myName);
      if (k < 0) return this._fail(f, 'You were dealt cards but are missing from the dealing order.');
      f.own = [];
      (m.cards || []).forEach((r, i) => {
        if (r.pos !== f.layout.hole(k, i)) this._fail(f, 'Your hole cards came from the wrong place in the deck.');
        f.own.push(this._reveal(f, r, 'One of your hole cards'));
      });
      if (f.own.length !== f.holeCount) this._fail(f, 'You were dealt the wrong number of hole cards.');
    }
    /** Check what a state view shows against the proofs for its hand. */
    view(v, myName) {
      const fv = v.fair;
      if (!fv || !this._ok(fv.no) || !Array.isArray(fv.reveals)) return;
      const f = this.hands[fv.no];
      if (!f || !f.perm) return;
      const byPos = new Map();
      for (const r of fv.reveals || []) { const c = this._reveal(f, r, `The card at deal position ${r.pos + 1}`); if (c) byPos.set(r.pos, c); }
      v.board.forEach((c, i) => {
        const pos = f.layout.board[i];
        if (byPos.has(pos) ? byPos.get(pos) !== c : !f.checked.has(pos + ':' + c)) this._fail(f, `Board card ${Cards.pretty(c)} was not proven against the committed deck.`);
      });
      for (const s of v.seats) {
        if (!s || !s.cards || !s.cards[0]) continue;
        const k = f.order.indexOf(s.name);
        if (k < 0) continue;
        s.cards.forEach((c, r) => {
          if (!c) return;
          const pos = f.layout.hole(k, r);
          if (s.name === myName && !f.own) return;
          const ok = s.name === myName ? f.own[r] === c : byPos.get(pos) === c || f.checked.has(pos + ':' + c);
          if (!ok) this._fail(f, `${s.name}'s ${Cards.pretty(c)} was not proven against the committed deck.`);
        });
      }
      if (f.status !== 'failed' && f.verified) f.status = 'verified';
      if (v.phase === 'done' && fv.final) f.final = true;
      this.latest = f;
    }
    /** The host's record of the hand must follow the rules when re-simulated. */
    audit(no, issues) {
      const f = this._h(no);
      for (const i of issues) this._fail(f, 'Rules check: ' + i);
      if (!issues.length) f.audited = true;
    }
  }

  return { sha256, commit, combine, permutation, layout, Checker, isHex };
})();
