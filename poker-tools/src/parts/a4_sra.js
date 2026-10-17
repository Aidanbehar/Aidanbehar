
/* =====================================================================
   3d. ENCRYPTED DEAL ("mental poker" with commutative encryption)
   With this on, no device ever holds the deck in the clear: not the
   host's, not anyone's. Each card is a number that every player locks with
   their own secret key. Locks commute (x^(a·b) = x^(b·a)), so they can come
   off in any order, and a card is readable only once every lock is off.

   1. Shuffle: in turn, each player locks all 52 cards with one secret key
      and shuffles them. The host's own seat goes last.
   2. Re-lock: in turn, each player removes that shuffle lock (with a
      zero-knowledge proof that they removed exactly it) and puts a separate
      lock on every card position, publishing the before/after values.
   3. Deal: everybody gives out their keys for the other players' hole-card
      positions, never for their own. Only you hold the last key to your
      cards, so only your browser can read them. Board cards are unlocked
      street by street with everyone's keys; a hand at showdown by its owner.
   Every key anyone gives out is checked against that player's published
   before/after values, so a wrong or doctored key is caught and named.
   Players hand out keys; they never decrypt values someone else supplies,
   so no message can trick a browser into unlocking its own cards.

   Group: the 2048-bit safe prime of RFC 3526 (group 14), working in the
   subgroup of squares (prime order q). Cards are hashed into that subgroup.
   ===================================================================== */
const SRA = (() => {
  const P = BigInt('0x' +
    'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF');
  const Q = (P - 1n) >> 1n;
  const G = 4n; // a square, so it generates the order-q subgroup

  function modPow(b, e, m = P) {
    let r = 1n;
    b %= m;
    while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; }
    return r;
  }
  function inverse(a, m) {
    let [r0, r1] = [((a % m) + m) % m, m], [s0, s1] = [1n, 0n];
    while (r1) { const k = r0 / r1; [r0, r1] = [r1, r0 - k * r1]; [s0, s1] = [s1, s0 - k * s1]; }
    if (r0 !== 1n) throw new Error('not invertible');
    return ((s0 % m) + m) % m;
  }
  function randBits(bits) {
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    crypto.getRandomValues(bytes);
    let x = 0n;
    for (const b of bytes) x = (x << 8n) | BigInt(b);
    return x;
  }
  const hex = (x) => x.toString(16);
  const big = (h) => BigInt('0x' + h);
  /** A group element from the wire: lowercase hex with 1 < x < p (optionally checked to be a square), else null. */
  function el(h, square = false) {
    if (typeof h !== 'string' || !/^[0-9a-f]{1,512}$/.test(h)) return null;
    const x = big(h);
    if (!(x > 1n && x < P)) return null;
    return square && modPow(x, Q) !== 1n ? null : x;
  }
  /** A per-position locking exponent from the wire (at most 256 bits, odd). */
  const exp = (h) => (typeof h === 'string' && /^[0-9a-f]{1,64}$/.test(h) && (big(h) & 1n) === 1n ? big(h) : null);
  const tick = () => new Promise((r) => setTimeout(r, 0));

  // Each card becomes a square mod p: SHA-256 in counter mode, reduced, squared.
  const CARD_EL = new Map(), EL_CARD = new Map();
  for (const c of Cards.newDeck()) {
    let h = '';
    for (let i = 0; h.length < 600; i++) h += Fair.sha256(`feltroom-card-v1|${c}|${i}`);
    const x = big(h) % P;
    const m = (x * x) % P;
    CARD_EL.set(c, m); EL_CARD.set(hex(m), c);
  }
  const decode = (x) => EL_CARD.get(hex(x)) || null;
  const plainDeck = () => Cards.newDeck().map((c) => hex(CARD_EL.get(c)));

  /** A lock key: a short (fast) odd exponent e, and its inverse d mod q to unlock. */
  function keygen() {
    const e = randBits(256) | 1n;
    return { e, d: inverse(e, Q) };
  }

  /** Where the cards go: hole card r of player k, then the five board cards (positions 0..K-1 of the deck). */
  const layout = (n, hc) => ({
    n, hc, K: n * hc + 5,
    board: (i) => n * hc + i,
    own: (k) => Array.from({ length: hc }, (_, r) => r * n + k),
  });

  /** Fiat–Shamir weights for the batch proof (128 bits each). */
  function weights(ctx, ins, mids) {
    const seed = Fair.sha256([ctx, ins.join(','), mids.join(',')].join('|'));
    return ins.map((_, i) => big(Fair.sha256(seed + '|' + i).slice(0, 32)));
  }
  const challenge = (...parts) => big(Fair.sha256(parts.join('|')));
  /**
   * Batch Chaum–Pedersen proof that every mid[i] = in[i]^d, i.e. in[i] = mid[i]^e, for the e behind y = G^e.
   * Positions are combined with random weights: A = Π in^w, B = Π mid^w; then it proves log_G(y) = log_B(A).
   */
  async function proveStrip(ctx, ins, mids, key) {
    const w = weights(ctx, ins, mids);
    let B = 1n;
    for (let i = 0; i < mids.length; i++) { B = (B * modPow(big(mids[i]), w[i])) % P; if (i % 8 === 7) await tick(); }
    const y = modPow(G, key.e), r = randBits(256 + 256 + 128);
    const t1 = modPow(G, r), t2 = modPow(B, r);
    const c = challenge(ctx, hex(y), hex(B), hex(t1), hex(t2));
    return { t1: hex(t1), t2: hex(t2), s: hex(r + c * key.e) };
  }
  async function verifyStrip(ctx, ins, mids, yHex, pr) {
    const y = el(yHex);
    if (!y || !pr || ins.length !== mids.length) return false;
    const t1 = el(pr.t1), t2 = el(pr.t2);
    if (!t1 || !t2 || typeof pr.s !== 'string' || !/^[0-9a-f]{1,200}$/.test(pr.s)) return false;
    const w = weights(ctx, ins, mids);
    let A = 1n, B = 1n;
    for (let i = 0; i < ins.length; i++) {
      A = (A * modPow(big(ins[i]), w[i])) % P;
      B = (B * modPow(big(mids[i]), w[i])) % P;
      if (i % 6 === 5) await tick();
    }
    const s = big(pr.s);
    const c = challenge(ctx, hex(y), hex(B), hex(t1), hex(t2));
    return modPow(G, s) === (t1 * modPow(y, c)) % P && modPow(B, s) === (t2 * modPow(A, c)) % P;
  }
  /** Is e really this player's lock on this position (mid^e = out)? */
  const keyFits = (midHex, outHex, eHex) => { const m = el(midHex), o = el(outHex), e = exp(eHex); return !!(m && o && e) && modPow(m, e) === o; };
  /** Unlock a position with every player's lock exponent for it: one inverse and one exponentiation. */
  function open(cHex, eHexes) {
    const c = el(cHex);
    if (!c || !Array.isArray(eHexes) || !eHexes.length) return null;
    let E = 1n;
    for (const h of eHexes) { const e = exp(h); if (!e) return null; E = (E * e) % Q; }
    return decode(modPow(c, inverse(E, Q)));
  }
  const validDeck = (arr, len) => Array.isArray(arr) && arr.length === len && arr.every((h) => el(h)) && new Set(arr).size === len;
  /** Shuffle order for a hand: the dealing order with the host's seat moved to the end. */
  const shuffleOrder = (order, hostName) => order.filter((x) => x !== hostName).concat(order.includes(hostName) ? [hostName] : []);

  return { P, Q, G, modPow, el, exp, hex, big, tick, decode, plainDeck, keygen, layout, proveStrip, verifyStrip, keyFits, open, validDeck, shuffleOrder };
})();

/**
 * One player's side of the encrypted deal: holds this player's secret keys and cards and answers the
 * dealer. Whatever it is asked, it never gives out the keys to its own hole cards (only when its owner
 * shows), and gives a board card's key only once the hand has reached that street. It checks every key
 * it is given against the published re-lock steps. Async: the maths takes a moment, so it yields often.
 */
class SraPlayer {
  constructor(name, store) {
    this.name = name;
    this.store = store || null; // optional {get, set, getOwn, setOwn}: survives a page refresh
    this.hands = Object.create(null);
    this.ownLog = (this.store && this.store.getOwn && this.store.getOwn()) || {}; // hand no -> our cards (for the record)
  }
  _ok(no) { return Number.isInteger(no) && no > 0 && no < 1e9; }
  _hand(no, create) {
    if (this.hands[no]) return this.hands[no];
    const saved = this.store && this.store.get(no);
    if (!saved && !create) return null;
    const f = { no, steps: [], problems: [] };
    if (saved && saved.n) {
      Object.assign(f, { n: saved.n, hc: saved.hc, me: saved.me, order: saved.order, game: saved.game, e: saved.e, own: saved.own, C: saved.C, ck: saved.ck, seen: saved.seen || {} });
      f.L = SRA.layout(f.n, f.hc);
    }
    this.hands[no] = f;
    const nos = Object.keys(this.hands).map(Number).sort((a, b) => a - b);
    while (nos.length > 4) delete this.hands[nos.shift()];
    return f;
  }
  _save(f) {
    if (this.store && f.C) this.store.set(f.no, { n: f.n, hc: f.hc, me: f.me, order: f.order, game: f.game, e: f.e, own: f.own || null, C: f.C, ck: f.ck, seen: f.seen || {} });
  }
  _bad(f, why) { if (!f.problems.includes(why)) f.problems.push(why); return { t: 'sraBad', no: f.no, why }; }
  /** Check a player's key for a position against their published re-lock step. */
  _fits(f, k, pos, e) { const c = f.ck && f.ck[pos]; return !!c && Array.isArray(c[k]) && SRA.keyFits(c[k][0], c[k][1], e); }

  /**
   * Handle a dealer message; resolves to the reply to send (or null).
   * ctx: { view: latest table view, recordAll: bool, onProblem(no, why) }
   */
  async handle(m, ctx = {}) {
    if (!m || typeof m !== 'object' || !this._ok(m.no)) return null;
    const r = await this._handle(m, ctx);
    if (r && r.t === 'sraBad' && ctx.onProblem) ctx.onProblem(m.no, r.why);
    return r;
  }
  async _handle(m, ctx) {
    const v = ctx.view;
    switch (m.t) {
      // 1. Lock every card with our shuffle key and shuffle.
      case 'sraShuf': {
        const order = Array.isArray(m.order) ? m.order.map(String) : [];
        const hc = m.hc, k = order.indexOf(this.name);
        if (![2, 4, 5].includes(hc) || order.length < 2 || order.length > 9 || new Set(order).size !== order.length || k < 0) return null;
        const f = this._hand(m.no, true);
        if (f.key || f.C) return null; // once per hand (also after a refresh)
        if (!SRA.validDeck(m.deck, 52)) return this._bad(f, 'The deck sent for shuffling was not 52 different locked cards.');
        // The first to shuffle starts from the open deck: check it really is one of each card.
        const seq = SRA.shuffleOrder(order, v ? v.hostName : null);
        if (seq[0] === this.name) { const plain = new Set(SRA.plainDeck()); if (!m.deck.every((x) => plain.has(x))) return this._bad(f, 'The starting deck was not a normal 52-card deck.'); }
        Object.assign(f, { order, n: order.length, hc, me: k, game: m.game === 'omaha' ? 'omaha' : 'holdem', L: SRA.layout(order.length, hc) });
        f.key = SRA.keygen();
        const out = [];
        for (let i = 0; i < 52; i++) { out.push(SRA.hex(SRA.modPow(SRA.big(m.deck[i]), f.key.e))); if (i % 13 === 12) await SRA.tick(); }
        return { t: 'sraShufR', no: m.no, deck: Cards.shuffle(out), y: SRA.hex(SRA.modPow(SRA.G, f.key.e)) };
      }
      // 2. Remove our shuffle lock (proven) and put a separate lock on each position.
      case 'sraLock': {
        const f = this.hands[m.no];
        if (!f || !f.key || f.locked || f.C) return null;
        f.locked = true; // once per hand
        if (!SRA.validDeck(m.items, f.L.K)) return this._bad(f, 'The deck sent for re-locking was malformed or had a repeated card.');
        f.inp = m.items.slice();
        const mid = [], out = [], e = [];
        for (let i = 0; i < f.L.K; i++) {
          const x = SRA.modPow(SRA.big(m.items[i]), f.key.d);
          const ck = SRA.keygen();
          mid.push(SRA.hex(x)); out.push(SRA.hex(SRA.modPow(x, ck.e))); e.push(SRA.hex(ck.e));
          if (i % 3 === 2) await SRA.tick();
        }
        f.mid = mid; f.out = out; f.e = e;
        const proof = await SRA.proveStrip(`${m.no}|${f.me}`, f.inp, mid, f.key);
        return { t: 'sraLockR', no: m.no, mid, out, proof };
      }
      // The dealer forwards everyone's re-lock steps so each browser can check the whole chain itself.
      case 'sraStep': {
        const f = this.hands[m.no];
        if (!f || !f.L || !Number.isInteger(m.k) || m.k < 0 || m.k >= f.n || f.steps[m.k]) return null;
        f.steps[m.k] = { y: m.y, inp: m.inp, mid: m.mid, out: m.out, proof: m.proof };
        return null;
      }
      // 3. Everyone has re-locked: verify the chain, then give out our keys to the other players' hole cards.
      case 'sraDealt': {
        const f = this.hands[m.no];
        if (!f || !f.e || f.C) return null;
        const K = f.L.K;
        for (let k = 0; k < f.n; k++) {
          const s = f.steps[k];
          if (!s) return this._bad(f, 'Part of the encrypted deal is missing.');
          const inp = k === 0 ? s.inp : f.steps[k - 1].out;
          if (!SRA.validDeck(inp, K) || !SRA.validDeck(s.mid, K) || !SRA.validDeck(s.out, K)) return this._bad(f, 'Part of the encrypted deal was malformed.');
          if (k === f.me && (inp.join() !== f.inp.join() || s.mid.join() !== f.mid.join() || s.out.join() !== f.out.join())) return this._bad(f, 'Your own step of the encrypted deal was altered.');
          if (!(await SRA.verifyStrip(`${m.no}|${k}`, inp, s.mid, s.y, s.proof))) return this._bad(f, `${f.order[k]}'s step of the encrypted deal did not prove correct.`);
        }
        f.C = f.steps[f.n - 1].out.slice();
        // Keep every player's before/after value at each position, to check the keys they give out later.
        f.ck = Array.from({ length: K }, (_, pos) => f.steps.map((s) => [s.mid[pos], s.out[pos]]));
        f.steps = []; f.inp = null; f.mid = null; f.out = null; // free memory
        const keys = [];
        for (let k = 0; k < f.n; k++) if (k !== f.me) for (const pos of f.L.own(k)) keys.push({ pos, e: f.e[pos] });
        this._save(f);
        return { t: 'sraKeys', no: m.no, keys };
      }
      // Our hole cards: everyone else's keys for our positions, checked one by one, plus our own.
      case 'sraHole': {
        const f = this.hands[m.no];
        if (!f || !f.C || f.own) return null;
        const own = [];
        for (const pos of f.L.own(f.me)) {
          const ks = m.keys && Array.isArray(m.keys[pos]) ? m.keys[pos] : [];
          const es = [];
          for (let k = 0; k < f.n; k++) {
            if (k === f.me) continue;
            const it = ks.find((x) => x && x.k === k);
            if (!it) return this._bad(f, `${f.order[k]}'s key for one of your hole cards is missing.`);
            if (!this._fits(f, k, pos, it.e)) return this._bad(f, `${f.order[k]} sent a wrong key for one of your hole cards.`);
            es.push(it.e);
          }
          const c = SRA.open(f.C[pos], [...es, f.e[pos]]);
          if (!c || own.includes(c)) return this._bad(f, 'Your hole cards did not unlock to real cards: the shuffle was tampered with.');
          own.push(c);
        }
        f.own = own;
        this.ownLog[m.no] = own;
        if (this.store && this.store.setOwn) this.store.setOwn(this.ownLog);
        this._save(f);
        return { t: 'sraOwnOk', no: m.no };
      }
      // A board card: release our key once the hand has reached that street.
      case 'sraBoard': {
        const f = this.hands[m.no] || this._hand(m.no);
        if (!f || !f.C || !Array.isArray(m.idx)) return null;
        const idx = m.idx.filter((i) => Number.isInteger(i) && i >= 0 && i < 5);
        if (!idx.length || !this.boardAllowed(f, idx, v)) return null;
        return { t: 'sraKeys', no: m.no, keys: idx.map((i) => ({ pos: f.L.board(i), e: f.e[f.L.board(i)] })) };
      }
      // Showdown: show (give out our own keys) or muck.
      case 'sraSd': {
        const f = this.hands[m.no] || this._hand(m.no);
        if (!f || !f.own) return { t: 'sraMuck', no: m.no };
        if (!this.showdownAllowed(f, v)) return null;
        if (!m.must && m.autoMuck !== false && this.beaten(f, m)) return { t: 'sraMuck', no: m.no };
        return this.reveal(m.no);
      }
      // The dealer forwards the keys behind every public card so each browser can unlock and check it itself.
      case 'sraReveal': {
        const f = this.hands[m.no] || this._hand(m.no);
        if (!f || !f.C || !Array.isArray(m.items)) return null;
        f.seen = f.seen || {};
        for (const it of m.items.slice(0, 60)) {
          if (!it || !Number.isInteger(it.pos) || it.pos < 0 || it.pos >= f.L.K || f.seen[it.pos] || !Array.isArray(it.keys)) continue;
          if (it.keys.length !== f.n || new Set(it.keys.map((x) => x && x.k)).size !== f.n) return this._bad(f, 'A card was revealed without every player\'s key.');
          for (const x of it.keys) if (!this._fits(f, x.k, it.pos, x.e)) return this._bad(f, `${f.order[x.k] || 'Someone'} gave a wrong key for a revealed card.`);
          const c = SRA.open(f.C[it.pos], it.keys.map((x) => x.e));
          if (!c) return this._bad(f, 'A revealed card did not unlock to a real card: the shuffle was tampered with.');
          const mine = f.L.own(f.me).includes(it.pos);
          if (Object.values(f.seen).includes(c) || (!mine && f.own && f.own.includes(c))) return this._bad(f, `${Cards.pretty(c)} turned up twice: the shuffle was tampered with.`);
          f.seen[it.pos] = c;
        }
        this._save(f);
        const why = this.check(v);
        return why ? this._bad(f, why) : null;
      }
      // "All cards" tables: every hand goes into the record once it is over.
      case 'sraRevealAll': {
        const f = this.hands[m.no] || this._hand(m.no);
        if (!f || !f.own || !ctx.recordAll || !v || v.handNo < m.no || (v.handNo === m.no && v.phase !== 'done')) return null;
        return this.reveal(m.no);
      }
    }
    return null;
  }

  /** A board key goes out only for the live hand, for a street it has reached. */
  boardAllowed(f, idx, v) {
    if (!v || v.handNo !== f.no || v.phase !== 'deal') return false;
    const live = (v.seats || []).filter((s) => s && s.inHand && !s.folded);
    if (live.filter((s) => !s.allIn).length <= 1) return true; // all-in: the rest of the board comes out now
    const need = v.board.length === 0 ? 2 : v.board.length; // flop is 0..2, turn 3, river 4
    return Math.max(...idx) <= need;
  }
  /** Our hand is shown only at a real showdown: this hand, five board cards we unlocked ourselves, and we're still in. */
  showdownAllowed(f, v) {
    if (!v || v.handNo !== f.no || (v.phase !== 'showdown' && v.phase !== 'done') || v.board.length !== 5) return false;
    const me = (v.seats || []).find((s) => s && s.isYou);
    if (!me || me.folded) return false;
    return [0, 1, 2, 3, 4].every((i) => f.seen && f.seen[f.L.board(i)] === v.board[i]);
  }
  /** Compare what the dealer's view shows with the cards we unlocked ourselves. Returns a problem or null. */
  check(v) {
    const f = v && this.hands[v.handNo];
    if (!f || !f.seen || !f.L) return null;
    for (let i = 0; i < v.board.length; i++) {
      const c = f.seen[f.L.board(i)];
      if (c && c !== v.board[i]) return `The board shows ${Cards.pretty(v.board[i])} where the encrypted deck holds ${Cards.pretty(c)}.`;
    }
    for (const s of v.seats || []) {
      if (!s || !s.shown || !Array.isArray(s.cards) || !f.order) continue;
      const k = f.order.indexOf(s.name);
      if (k < 0) continue;
      const pos = f.L.own(k);
      for (let r = 0; r < pos.length; r++) {
        const c = f.seen[pos[r]];
        if (c && s.cards[r] && c !== s.cards[r]) return `${s.name}'s shown cards don't match the encrypted deck.`;
      }
    }
    return null;
  }
  /** Muck only when clearly beaten: one pot, and worse than a hand already shown. */
  beaten(f, m) {
    const board = Array.isArray(m.board) ? m.board.filter(Cards.isCard) : [];
    if (board.length !== 5 || m.sidePots || !Array.isArray(m.shown) || !m.shown.length) return false;
    const mine = Eval.forGame(f.game, f.own, board).score;
    const shown = m.shown.filter((h) => Array.isArray(h) && h.length === f.hc && h.every(Cards.isCard));
    return shown.length > 0 && mine < Math.max(...shown.map((h) => Eval.forGame(f.game, h, board).score));
  }
  /** Our own keys, so anyone can unlock our hand (showdown or a voluntary show). */
  reveal(no) {
    const f = this.hands[no] || this._hand(no);
    if (!f || !f.own) return null;
    return { t: 'sraShow', no, keys: f.L.own(f.me).map((pos) => ({ pos, e: f.e[pos] })) };
  }
  ownCards(no) {
    if (Array.isArray(this.ownLog[no])) return this.ownLog[no].slice();
    const f = this.hands[no] || this._hand(no);
    return f && f.own ? f.own.slice() : null;
  }

  /** Put our own cards into a view from the dealer (who never has them). */
  patchView(v) {
    if (!v || !v.handNo) return v;
    const own = this.ownCards(v.handNo);
    const s = own && (v.seats || []).find((x) => x && x.isYou);
    if (!s || !s.inHand || !Array.isArray(s.cards) || s.cards.length !== own.length || !s.cards.every((c) => c == null)) return v;
    s.cards = own;
    const f = this.hands[v.handNo];
    if (f && f.game && !(s.folded && v.phase !== 'done')) { try { s.handName = Eval.describe(Eval.forGame(f.game, own, v.board)); } catch { /* ignore */ } }
    return v;
  }
  /** Put our own cards into the dealer's record (it shows them as hidden). */
  patchRecord(text) {
    if (!text) return text;
    try {
      const g = Notation.parse(text);
      let changed = false;
      for (const r of g.hands) {
        const own = this.ownCards(r.no);
        if (own && this.name in r.hole && r.hole[this.name] == null && own.length === r.holeCount) { r.hole[this.name] = own; changed = true; }
      }
      return changed ? Notation.serialize(g) : text;
    } catch { return text; }
  }
}

/** sessionStorage-backed key store, so a refresh mid-hand doesn't lose your cards (cleared when the tab closes). */
const SraStore = (tableId, name) => {
  const key = (x) => `feltroom.sra.${tableId}.${name}.${x}`;
  return {
    get(no) { try { return JSON.parse(sessionStorage.getItem(key(no))); } catch { return null; } },
    set(no, v) {
      try { sessionStorage.setItem(key(no), JSON.stringify(v)); sessionStorage.removeItem(key(no - 2)); } catch { /* storage full or off: a refresh would lose this hand */ }
    },
    getOwn() { try { return JSON.parse(sessionStorage.getItem(key('own'))) || {}; } catch { return {}; } },
    setOwn(v) { try { sessionStorage.setItem(key('own'), JSON.stringify(v)); } catch { /* ignore */ } },
  };
};
