
/* =====================================================================
   5. HOST TABLE  (authoritative game controller; runs only in the host's tab)
   Owns seats, stacks, the deck and timers; drives the Engine; builds a
   personalised view for every player so hidden cards never leave the host.
   Transport-agnostic: the networking layer calls handle() and listens to
   onChange / onEvent / onRecord / onDirect.
   ===================================================================== */
const DISCONNECT_GRACE = 30;   // seconds a disconnected player gets on their turn when the timer is off
const HAND_PAUSE_MS = 5200;    // results stay on screen this long before the next deal
const SEED_WAIT_MS = 2500;     // how long the host waits for each round of shuffle randomness
// Blind levels (multiples of the starting blinds) when "blinds go up every N hands" is on.
const LEVEL_FACTORS = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 80, 100, 150, 200, 300, 500, 800, 1000];

const SRA_REPLY_MS = 30000;
const INSTANT_RECORD_MS = 3000; // Instant bot games save the record at most this often (and when they stop)
const KEEP_FULL_HANDS = 300;    // Instant bot games keep this many recent hands complete (older ones: record text only)

/**
 * Timers that can also run "as soon as possible": Instant bot games use a message channel, which
 * runs the next step straight after the browser has had its chance to draw, without the 4 ms
 * minimum that chained setTimeout calls get. Later.clear cancels either kind.
 */
const Later = {
  q: new Map(), id: 0, ch: null,
  set(fn, ms, fast) {
    if (!fast || typeof MessageChannel === 'undefined') return setTimeout(fn, ms);
    if (!this.ch) {
      this.ch = new MessageChannel();
      this.ch.port1.onmessage = (e) => { const f = this.q.get(e.data); if (f) { this.q.delete(e.data); f(); } };
      if (this.ch.port1.unref) this.ch.port1.unref(); // Node: never keep the process alive for this
    }
    const h = { fast: ++this.id };
    this.q.set(h.fast, fn);
    this.ch.port2.postMessage(h.fast);
    return h;
  },
  clear(h) { if (h && typeof h === 'object') this.q.delete(h.fast); else clearTimeout(h); },
};    // a connected player's browser has this long to answer an encrypted-deal step

/**
 * The host's side of the encrypted deal. It only passes locked cards and keys between players: it
 * never holds anyone's hole cards in readable form. It can read a card only once every player has
 * given out their key for it (board cards, and hands shown at showdown). Every key is checked
 * against the giver's published re-lock step as it arrives.
 */
class SraDealer {
  constructor(table, sh) {
    this.t = table; this.no = sh.no;
    this.pids = sh.order.slice();
    this.names = this.pids.map((pid) => sh.names[pid]);
    this.n = this.pids.length; this.hc = table.holeCount;
    this.L = SRA.layout(this.n, this.hc);
    this.keys = Array.from({ length: this.L.K }, () => new Map()); // pos -> Map(player index -> exponent)
    this.pending = new Map(); // pid -> request awaiting an answer
    this.cancelled = false;
    this.failure = null;
    this.cheat = null;
  }
  /** Names of players whose browsers we are waiting on (shown on the table). */
  waiting() { return [...this.pending.keys()].map((pid) => this.names[this.pids.indexOf(pid)]).filter(Boolean); }
  /** Send a request and wait for the answer. grace: how long a disconnected player has to come back. */
  _ask(pid, msg, want, grace = DISCONNECT_GRACE * 1000) {
    return new Promise((resolve) => {
      const prev = this.pending.get(pid);
      if (prev) prev.finish(null);
      const e = { msg, want, sentAt: Date.now() };
      e.finish = (r) => { clearInterval(e.timer); if (this.pending.get(pid) === e) this.pending.delete(pid); this.t.changed(); resolve(r); };
      e.timer = setInterval(() => {
        const p = this.t.players.get(pid), now = Date.now();
        if (this.cancelled || !p) return e.finish(null);
        if (!p.connected) { if (!p.disconnectedAt || now - p.disconnectedAt >= grace) e.finish(null); }
        else if (now - e.sentAt > SRA_REPLY_MS) e.finish(null);
      }, 500);
      this.pending.set(pid, e);
      this.t.onDirect(pid, msg);
      this.t.changed();
    });
  }
  /** A player came back: repeat whatever we were waiting on (the first copy may have been lost). */
  resend(pid) { const e = this.pending.get(pid); if (e) { e.sentAt = Date.now(); this.t.onDirect(pid, e.msg); } }
  reply(pid, m) {
    if (m.no !== this.no) return;
    const k = this.pids.indexOf(pid);
    if (k < 0) return;
    if (m.t === 'sraKeys') this._store(k, m.keys);
    const e = this.pending.get(pid);
    if (e && e.want.includes(m.t)) e.finish(m);
  }
  cancel() { this.cancelled = true; for (const e of [...this.pending.values()]) e.finish(null); }
  _fail(k, why, sitOut) {
    const p = this.t.players.get(this.pids[k]);
    // Someone who simply dropped out is dealt in again when they're back; only a browser that stayed
    // connected and still failed (or misbehaved) is sat out.
    if (p && !p.connected) { why = `${this.names[k]} disconnected during the shuffle`; sitOut = false; }
    this.failure = { pid: this.pids[k], name: this.names[k], why, sitOut: !!sitOut };
    return false;
  }
  _bcast(m) { for (const pid of this.pids) this.t.onDirect(pid, m); }
  /** Does this player's key really undo their own lock at this position? */
  _fits(k, pos, e) { return !!this.mids && SRA.keyFits(this.mids[k][pos], this.outs[k][pos], e); }
  /** Keep the keys a player gave out, but only for other people's positions, and only if they check out. */
  _store(k, keys) {
    if (!Array.isArray(keys)) return;
    const own = this.L.own(k);
    for (const it of keys.slice(0, this.L.K)) {
      if (!it || !Number.isInteger(it.pos) || it.pos < 0 || it.pos >= this.L.K || own.includes(it.pos) || this.keys[it.pos].has(k)) continue;
      if (this._fits(k, it.pos, it.e)) this.keys[it.pos].set(k, it.e);
      else this.cheat = k;
    }
  }
  _list(pos, extra) { return [...this.keys[pos]].map(([k, e]) => ({ k, e })).concat(extra || []); }

  /** Shuffle, re-lock and hand out hole cards. Resolves true once every player holds their cards. */
  async setup() {
    const { no, n, hc, L, pids, names } = this;
    const game = this.t.gameKind;
    // Shuffle in dealing order, except that the host's own seat shuffles last.
    const seq = SRA.shuffleOrder(names, this.t.players.get(this.t.hostPid).name).map((nm) => names.indexOf(nm));
    let deck = SRA.plainDeck();
    const ys = [];
    for (const k of seq) {
      const r = await this._ask(pids[k], { t: 'sraShuf', no, order: names, hc, game, deck }, ['sraShufR', 'sraBad'], 0);
      if (this.cancelled) return false;
      if (!r) return this._fail(k, `${names[k]}'s browser did not shuffle in time`, true);
      if (r.t === 'sraBad') return this._fail(k, `${names[k]}'s browser rejected the deck (${U.cleanText(r.why, 120)})`);
      if (!SRA.validDeck(r.deck, 52) || !SRA.el(r.y, true)) return this._fail(k, `${names[k]}'s browser sent back an invalid deck`, true);
      deck = r.deck; ys[k] = r.y;
    }
    let cur = deck.slice(0, L.K);
    this.mids = []; this.outs = [];
    for (let k = 0; k < n; k++) {
      const r = await this._ask(pids[k], { t: 'sraLock', no, items: cur }, ['sraLockR', 'sraBad'], 0);
      if (this.cancelled) return false;
      if (!r) return this._fail(k, `${names[k]}'s browser did not answer in time`, true);
      if (r.t === 'sraBad') return this._fail(k, `${names[k]}'s browser rejected the deck (${U.cleanText(r.why, 120)})`);
      if (!SRA.validDeck(r.mid, L.K) || !SRA.validDeck(r.out, L.K) || !(await SRA.verifyStrip(`${no}|${k}`, cur, r.mid, ys[k], r.proof))) {
        return this._fail(k, `${names[k]}'s browser failed the shuffle proof`, true);
      }
      this._bcast({ t: 'sraStep', no, k, y: ys[k], inp: k === 0 ? cur : undefined, mid: r.mid, out: r.out, proof: r.proof });
      this.mids.push(r.mid); this.outs.push(r.out);
      cur = r.out;
    }
    this.C = cur;
    // Everyone checks the whole chain, then gives out their keys to the other players' hole cards.
    const rel = await Promise.all(pids.map((pid) => this._ask(pid, { t: 'sraDealt', no }, ['sraKeys', 'sraBad'], 0)));
    if (this.cancelled) return false;
    if (this.cheat != null) return this._fail(this.cheat, `${names[this.cheat]}'s browser gave out a wrong key`, true);
    for (let k = 0; k < n; k++) {
      if (!rel[k]) return this._fail(k, `${names[k]}'s browser did not answer in time`, true);
      if (rel[k].t === 'sraBad') return this._fail(k, `${names[k]}'s browser found a problem (${U.cleanText(rel[k].why, 120)})`);
      if (L.own(k).some((pos) => this.keys[pos].size !== n - 1)) {
        const g = this.pids.findIndex((pid, j) => j !== k && L.own(k).some((pos) => !this.keys[pos].has(j)));
        return this._fail(g, `${names[g]}'s browser held back a key`, true);
      }
    }
    const got = await Promise.all(pids.map((pid, k) => this._ask(pid, {
      t: 'sraHole', no, keys: Object.fromEntries(L.own(k).map((pos) => [pos, this._list(pos)])),
    }, ['sraOwnOk', 'sraBad'], 0)));
    if (this.cancelled) return false;
    for (let k = 0; k < n; k++) {
      if (got[k] && got[k].t === 'sraOwnOk') continue;
      if (!got[k]) return this._fail(k, `${names[k]}'s browser did not answer in time`, true);
      return this._fail(k, `${names[k]}'s browser could not read its cards (${U.cleanText(got[k].why, 120)})`);
    }
    return true;
  }

  /** Board cards at board indexes idx (0..4): collect every player's key, unlock, and show the keys to all. */
  async boardCards(idx) {
    const pos = idx.map((i) => this.L.board(i));
    const missing = this.pids.filter((pid, k) => pos.some((p) => !this.keys[p].has(k)));
    await Promise.all(missing.map((pid) => this._ask(pid, { t: 'sraBoard', no: this.no, idx }, ['sraKeys'])));
    if (this.cancelled) return { cards: null };
    const cards = [];
    for (const p of pos) {
      const gone = this.pids.findIndex((pid, k) => !this.keys[p].has(k));
      if (gone >= 0) return { cards: null, why: `${this.names[gone]} ${this.cheat === gone ? 'gave out a wrong key' : 'left while holding a key needed to deal the board'}` };
      const c = SRA.open(this.C[p], [...this.keys[p].values()]);
      if (!c || cards.includes(c)) return { cards: null, why: 'a board card did not unlock to a real card (the shuffle was tampered with)' };
      cards.push(c);
    }
    this._bcast({ t: 'sraReveal', no: this.no, items: pos.map((p) => ({ pos: p, keys: this._list(p) })) });
    return { cards };
  }

  /** A player shows their hand: their own keys (checked) plus everyone else's unlock it. Returns the cards or null. */
  openHand(k, keys) {
    if (k < 0 || !Array.isArray(keys) || !this.C) return null;
    const cards = [], items = [];
    for (const pos of this.L.own(k)) {
      const it = keys.find((x) => x && x.pos === pos);
      if (!it || !this._fits(k, pos, it.e) || this.keys[pos].size !== this.n - 1) return null;
      const c = SRA.open(this.C[pos], [...this.keys[pos].values(), it.e]);
      if (!c || cards.includes(c)) return null;
      cards.push(c); items.push({ pos, keys: this._list(pos, [{ k, e: it.e }]) });
    }
    this._bcast({ t: 'sraReveal', no: this.no, items });
    return cards;
  }

  /** Showdown in the usual order: each player shows (gives their keys) or mucks. Returns a settle plan. */
  async showdown(h) {
    const order = Engine.showdownOrder(h);
    const runout = h.players.filter((p) => !p.folded && !p.allIn).length <= 1;
    const sidePots = Engine.computePots(h.players.map((p) => p.committed), h.players.map((p) => p.folded)).length > 1;
    const plan = [], shown = [];
    for (let j = 0; j < order.length; j++) {
      const i = order[j], pid = this.t.handPids[i], k = this.pids.indexOf(pid), p = this.t.players.get(pid);
      const r = await this._ask(pid, {
        t: 'sraSd', no: this.no, must: j === 0 || runout, autoMuck: !p || p.autoMuck !== false, board: h.board.slice(), shown: shown.slice(), sidePots,
      }, ['sraShow', 'sraMuck']);
      if (this.cancelled) return null;
      const cards = r && r.t === 'sraShow' ? this.openHand(k, r.keys) : null;
      if (cards) { h.players[i].hole = cards; shown.push(cards); plan.push({ p: i, show: true }); }
      else plan.push({ p: i, show: false });
    }
    return plan;
  }

  /** "All cards" tables: once the hand is over, everyone's keys go into the record. */
  revealAll(h, onCards) {
    this.pids.forEach((pid, k) => {
      const i = this.t.handPids.indexOf(pid);
      if (i < 0 || h.players[i].hole) return;
      this._ask(pid, { t: 'sraRevealAll', no: this.no }, ['sraShow']).then((r) => {
        const cards = r ? this.openHand(k, r.keys) : null;
        if (cards && !h.players[i].hole) { h.players[i].hole = cards; onCards(); }
      });
    });
  }
}

/** Corny, kind table talk for bots ("Bots cheer you on" setting). {you} is the player, {who} whoever it's about. */
const BOT_CHEER = {
  start: ['Shuffle up and smile, everybody! 😄', 'Good luck, {you}! May the flop be with you! 🍀', 'Let\'s have a fun game, friends! 🃏', 'Cards in the air, joy in the heart! ✨'],
  win: ['Nice pot, {you}! Your chips are proud of you! 🎉', 'Well played, {you}! Keep that sparkle! ✨', 'Look at you go, {you}! 👏', 'That\'s how it\'s done, {you}! 🌟'],
  bigWin: ['WOW, {you}! That pot was HUGE! 🏆', 'Somebody call the chip police, {you} is on fire! 🔥', 'Legendary hand, {you}! Frame it! 🖼️', 'I\'m not even mad, {you}. That was beautiful! 😭👏'],
  bust: ['Chin up, {you}! Every champion has a rebuy story! 💪', 'The cards owe you one, {you}! 🃏', 'Bad beats build character, {you}! Go get \'em! 🌈', 'Shake it off, {you}! The deck still loves you! ❤️'],
  any: ['Believe in the river! 🌊', 'Every fold is a step toward greatness! 🚶', 'You\'ve got this, {you}! 💪', 'Remember: it\'s not about the chips, it\'s about the friends we beat along the way! 😄',
    'Keep calm and shuffle on! ☕', 'Smile! The flop can sense fear! 😁', 'Positive vibes only at this table! ✌️', 'You miss 100% of the pots you don\'t play! (Please play responsibly.) 😅',
    'Hydrate, {you}! Champions drink water! 💧', 'Today\'s forecast: 100% chance of good cards! ☀️'],
};

class HostTable {
  constructor(settings, hostName, hostToken) {
    this.s = { game: 'holdem', limit: 'nl', levelHands: 0, maxRebuys: 0, hostPlays: true, spectators: false, viewerChat: false, botChat: false, hostAdjust: false, hostKick: false, ...settings };
    this.s.viewerChat = !!(this.s.spectators && this.s.viewerChat);
    this.s.rakePct = [0, 2.5, 5, 10].includes(Number(this.s.rakePct)) && !this.s.cepheus ? Number(this.s.rakePct) : 0;
    this.s.rakeCap = [0, 1, 3, 5].includes(Number(this.s.rakeCap)) ? Number(this.s.rakeCap) : 0;
    this.gameKind = this.s.game === 'holdem' ? 'holdem' : 'omaha';
    this.holeCount = this.s.game === 'omaha5' ? 5 : this.s.game === 'omaha4' ? 4 : 2;
    this.variant = Notation.variantCode(this.gameKind, this.s.limit, this.holeCount);
    // Encrypted deal: this device never sees anyone else's cards (see ENCRYPTED DEAL). Not for bot games.
    this.sra = !!this.s.sra && !this.s.vsBots;
    if (this.sra) this.s.botTakeover = false;
    this.sraDealer = null;
    this.level = 0;
    this.blinds = { sb: this.s.sb, bb: this.s.bb, ante: this.s.ante };
    this.shuffling = null;      // commit-reveal shuffle in progress
    this.fair = null;           // proofs for the current hand
    this.players = new Map();
    this.seats = new Array(this.s.maxSeats).fill(null);
    this.status = 'lobby';
    this.paused = false;
    this.handNo = 0;
    this.hand = null;
    this.handPids = [];
    this.buttonSeat = -1;
    this.finished = [];        // [{hand, pids}]
    this.names = [];           // every name ever dealt in (record [Players])
    this.log = []; this.logCursor = 0; this.logId = 0;
    this.chat = []; this.chatId = 0;
    this.turn = null;          // {deadline, total, idx, handle}
    this.nextTimer = null; this.dealTimer = null;
    this.banned = new Set();
    const d = new Date();
    this.date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    this.onChange = () => {}; this.onEvent = () => {}; this.onRecord = () => {}; this.onDirect = () => {}; this.onBroadcast = () => {};
    this.hostPid = this.addPlayer(hostName, hostToken).pid;
    this.players.get(this.hostPid).isHost = true;
    this.players.get(this.hostPid).connected = true;
    if (this.s.hostPlays !== false) this._sit(this.hostPid, 0);
    this.botTimer = null;
    this.botModels = {};
  }

  /* ---------------- bots ---------------- */
  /** Seat a computer player (Play vs Bots mode). */
  addBot({ name, difficulty, personality, kind }) {
    const pid = 'b' + U.randHex(4);
    const p = {
      pid, token: null, name: this.uniqueName(name), seat: null, stack: this.s.startingStack, sittingOut: false, busted: false,
      connected: true, lastSeen: Date.now(), disconnectedAt: null, autoMuck: true, rebuys: 0, bought: this.s.startingStack,
      isHost: false, leaving: false, isBot: true, botDifficulty: difficulty || 'intermediate', botPersonality: personality || 'balanced',
      botKind: kind || null, // 'cepheus' = the Play Against Cepheus opponent (its own decision path)
      botTraits: kind ? null : Bots.makeTraits(personality || 'balanced'), // this bot's own version of its style
    };
    this.players.set(pid, p);
    const seat = this.seats.indexOf(null);
    if (seat >= 0) this._sit(pid, seat);
    return p;
  }
  /** Is a bot making this seat's decisions right now? (a real bot, or a disconnected player with takeover on) */
  _botControlled(p) { return !!p && (p.isBot || (!this.sra && !!this.s.botTakeover && !p.connected && !p.leaving)); }
  _botTurn() {
    if (this.botTimer) return;
    const h = this.hand, i = h.toAct, pid = this.handPids[i];
    const speed = this._instant() ? 0 : { ultra: 0.04, fast: 0.3, normal: 1, slow: 1.8 }[this.s.botSpeed || 'normal'] || 1;
    const live = () => this.hand === h && h.phase === 'betting' && h.toAct === i && !this.paused && this.status === 'playing';
    this.botTimer = Later.set(async () => {
      this.botTimer = null;
      if (!live()) return;
      const p = this.players.get(pid);
      if (!this._botControlled(p)) { this._proceed(); return; }
      if (p.botKind === 'cepheus') { this._cepheusAct(h, i, p); return; }
      const ctx = Bots.contextFor(h, i, {
        models: this.botModels,
        difficulty: p.isBot ? p.botDifficulty : this.s.takeoverDifficulty || 'advanced',
        personality: p.isBot ? p.botPersonality : 'balanced',
        traits: p.isBot ? p.botTraits : null,
      });
      // The simulation runs in small chunks so the page stays responsive; while it runs no second
      // decision can start for this seat.
      this.botTimer = 'thinking';
      let a = null;
      // Instant games decide Hold'em in one go (a few milliseconds); Omaha's longer simulation still runs in chunks.
      try { a = this._instant() && this.gameKind === 'holdem' ? Bots.decide(ctx) : await Bots.decideAsync(ctx); } catch (e) { console.error(e); }
      this.botTimer = null;
      if (!live()) return; // paused, ended or changed meanwhile: resuming asks again
      try { Engine.applyAction(h, a || { type: 'fold' }); }
      catch (e) { const L = Engine.legal(h); Engine.applyAction(h, { type: L.canCheck ? 'check' : 'fold' }); }
      h.botNames = h.botNames || [];
      if (!h.botNames.includes(p.name)) h.botNames.push(p.name);
      if (!p.isBot && !p.botAnnounced) {
        p.botAnnounced = true;
        this._log(`A bot is playing for ${p.name} until they reconnect`);
        this.onEvent('info', `A bot is playing for ${p.name} until they reconnect`, null);
      }
      this._afterAction();
    }, (350 + Math.random() * 900) * speed, this._instant()); // think time (cosmetic, not security-relevant randomness)
  }

  /** Ultra-fast bot games shorten the pauses between cards and hands (games with people keep the normal pace). */
  _pace() { return this._instant() ? 0 : this.s.vsBots && this.s.botSpeed === 'ultra' ? 0.1 : 1; }
  /** Instant: a bot game with no pauses at all. Only you can hold it up, by not having auto-play on. */
  _instant() { return !!this.s.vsBots && this.s.botSpeed === 'instant'; }
  /** Auto-play run by the table itself (Instant games): the same rule as the Auto-play button. */
  _autoAct(h) {
    const L = Engine.legal(h);
    if (L.toCall > 0) Engine.applyAction(h, { type: 'call' });
    else if (L.isBet && L.canRaise) Engine.applyAction(h, { type: 'bet', to: L.minTo });
    else Engine.applyAction(h, { type: 'check' });
  }

  /** Play Against Cepheus: the strategy picks fold/call/raise; anything it cannot handle checks or calls, visibly. */
  _cepheusAct(h, i, p) {
    const r = CepheusBot.decide(h, i);
    try { Engine.applyAction(h, r.action); }
    catch (e) { r.fallback = r.fallback || e.message; const L = Engine.legal(h); Engine.applyAction(h, { type: L.canCheck ? 'x' : 'c' }); }
    if (r.fallback) {
      this.cepheusFallbacks = (this.cepheusFallbacks || 0) + 1;
      const msg = `${p.name} could not use its strategy here (${r.fallback}), so it ${h.log[h.log.length - 1].type === 'x' ? 'checked' : 'called'}`;
      this._log(msg); this.onEvent('warn', msg, null);
    }
    h.botNames = h.botNames || [];
    if (!h.botNames.includes(p.name)) h.botNames.push(p.name);
    this._afterAction();
  }

  /* ---------------- players ---------------- */
  /** Names must be unique for the whole game so the record stays unambiguous. */
  uniqueName(name) {
    const base = U.sanitizeName(name) || 'Player';
    const taken = (x) => [...this.players.values()].some((p) => p.name.toLowerCase() === x.toLowerCase())
      || this.names.some((y) => y.toLowerCase() === x.toLowerCase());
    let n = base, k = 2;
    while (taken(n)) n = `${base.slice(0, 15)} ${k++}`;
    return n;
  }
  byToken(token) { return [...this.players.values()].find((p) => p.token === token); }

  /** Join or reconnect. Returns {player, reconnected} or {error}. */
  addPlayer(name, token) {
    if (token && this.banned.has(token)) return { error: 'You were removed from this table by the host.' };
    // The host's and bots' seats can never be claimed over the network.
    const existing = token && this.byToken(token);
    if (existing && (existing.isHost || existing.isBot)) return { error: 'That seat cannot be claimed.' };
    if (existing) { existing.lastSeen = Date.now(); return { player: existing, reconnected: true, pid: existing.pid }; }
    if (this.status === 'ended') return { error: 'This game has ended.' };
    if (this.players.size >= 24) {
      // Make room by dropping disconnected watchers, so join spam can't lock real players out.
      for (const q of [...this.players.values()]) if (this.players.size >= 24 && !q.connected && q.seat == null && !q.isHost && !q.isBot && !this._inLiveHand(q.pid)) this.players.delete(q.pid);
      if (this.players.size >= 24) return { error: 'This table is full.' };
    }
    const pid = 'p' + U.randHex(4);
    const p = {
      pid, token: token || U.randHex(16), name: this.uniqueName(name), seat: null, stack: this.s.startingStack,
      sittingOut: false, busted: false, connected: true, lastSeen: Date.now(), disconnectedAt: null,
      autoMuck: true, rebuys: 0, bought: this.s.startingStack, isHost: false, leaving: false,
    };
    this.players.set(pid, p);
    return { player: p, reconnected: false, pid };
  }

  setConnected(pid, on) {
    const p = this.players.get(pid);
    if (!p || p.connected === on) return;
    p.connected = on;
    p.disconnectedAt = on ? null : Date.now();
    if (on) p.botAnnounced = false;
    if (on && this.sraDealer) this.sraDealer.resend(pid);
    if (p.seat != null) this.onEvent(on ? 'success' : 'warn', on ? `${p.name} reconnected` : `${p.name} disconnected`, pid);
    // A disconnected player on the clock with no action timer gets a grace timer.
    if (this.hand && this.hand.phase === 'betting' && this.handPids[this.hand.toAct] === pid) {
      if (this.s.botTakeover) this._proceed(); else this._startTurnTimer(true);
    }
    this.changed();
  }

  /* ---------------- intents ---------------- */
  /** Every client message and every host UI action ends up here. */
  handle(pid, m) {
    const p = this.players.get(pid);
    if (!p || !m || typeof m !== 'object') return;
    const isHost = pid === this.hostPid;
    const err = (text) => this.onDirect(pid, { t: 'error', text });
    p.lastSeen = Date.now();
    switch (m.t) {
      case 'sit': {
        const seat = Number(m.seat);
        if (this.status === 'ended') return err('The game has ended.');
        if (p.seat != null) return err('You already have a seat.');
        if (pid === this.hostPid && this.s.hostPlays === false) return err('You chose to deal without playing at this table.');
        if (!Number.isInteger(seat) || seat < 0 || seat >= this.seats.length || this.seats[seat]) return err('That seat is taken.');
        this._sit(pid, seat);
        this.onEvent('info', `${p.name} sat down`, null);
        this._maybeDeal();
        break;
      }
      case 'stand': {
        if (p.seat == null) return;
        if (this._inLiveHand(pid)) return err('You can leave your seat once this hand is over. Sit out to skip future hands.');
        this.seats[p.seat] = null; p.seat = null;
        this._log(`${p.name} stood up`);
        break;
      }
      case 'sitout': p.sittingOut = !!m.on; if (!m.on) this._maybeDeal(); break;
      case 'automuck': p.autoMuck = !!m.on; break;
      // Auto-play: normally your own browser sends the actions; in an Instant bot game the table makes them itself.
      case 'autoplay': p.autoPlay = !!m.on && !!this.s.vsBots; this._kick(pid); break;
      case 'action': {
        const h = this.hand;
        if (this.status !== 'playing' || !h) return err('There is no hand in progress.');
        if (this.paused) return err('The game is paused.');
        const idx = this.handPids.indexOf(pid);
        if (h.phase !== 'betting' || idx < 0 || h.toAct !== idx) return err("It's not your turn.");
        try { Engine.applyAction(h, { type: String(m.action), to: m.amount == null ? undefined : Math.round(Number(m.amount)) }); }
        catch (e) { return err(e.message); }
        this._afterAction();
        return;
      }
      case 'show': {
        const h = this.hand, idx = this.handPids.indexOf(pid);
        if (!h || h.phase !== 'done' || idx < 0 || h.voided) return;
        if (this.sra && !h.players[idx].hole) {
          // Encrypted deal: showing means handing over your own keys, which unlock your cards for everyone.
          const D = this.sraDealer, cards = D && D.no === h.no ? D.openHand(D.pids.indexOf(pid), m.keys) : null;
          if (!cards) return;
          h.players[idx].hole = cards;
        }
        if (Engine.showCards(h, idx)) { delete h.recText; this._syncLog(); this._sendRecords(); }
        break;
      }
      case 'rebuy': {
        if (!this.s.rebuys) return err('Rebuys are not allowed at this table.');
        if (this.s.maxRebuys && p.rebuys >= this.s.maxRebuys) return err(`You have used all ${this.s.maxRebuys} rebuy${this.s.maxRebuys > 1 ? 's' : ''}.`);
        if (p.stack > 0) return err('You can rebuy once you are out of chips.');
        if (this._inLiveHand(pid)) return err('Wait for this hand to finish.');
        p.stack = this.s.startingStack; p.rebuys++; p.bought += this.s.startingStack; p.busted = false; p.sittingOut = false;
        this._log(`${p.name} rebuys for ${U.fmt(this.s.startingStack)}`);
        this.onEvent('info', `${p.name} rebought`, null);
        this._maybeDeal();
        break;
      }
      // Shuffle randomness: a commitment first, then the seed itself (see FAIR SHUFFLE PROOFS).
      case 'fairc': case 'fairs': {
        const sh = this.shuffling;
        if (!sh || m.no !== sh.no || !sh.contributors || !sh.contributors.includes(pid)) return;
        if (m.t === 'fairc' && sh.stage === 1 && sh.seedC[pid] == null && Fair.isHex(m.c, 64)) sh.seedC[pid] = m.c;
        if (m.t === 'fairs' && sh.stage === 2 && sh.seedC[pid] && sh.seeds[pid] == null && Fair.isHex(m.seed, 64)) sh.seeds[pid] = m.seed;
        if (sh.waiter) sh.waiter();
        return;
      }
      // Answers from players' browsers during the encrypted deal.
      case 'sraShufR': case 'sraLockR': case 'sraKeys': case 'sraOwnOk': case 'sraBad': case 'sraShow': case 'sraMuck':
        if (this.sraDealer) this.sraDealer.reply(pid, m);
        return;
      case 'chat': {
        if (!this.addChat(p.name, m.text, {})) return;
        break;
      }
      // ---- host-only controls ----
      case 'start':
        if (!isHost) return;
        if (this.status !== 'lobby') return;
        if (this._eligible().length < 2) return err('At least two seated players with chips are needed.');
        this.status = 'playing';
        this.onEvent('success', 'The game has started', null);
        this._botSay('start');
        // "Start the game paused": nothing is dealt until the host presses Resume (time to set stacks first).
        if (this.s.startPaused) { this.paused = true; this._log('The game is paused before the first hand. Press Resume to deal.'); this.changed(); return; }
        this._startHand();
        return;
      case 'pause':
        if (!isHost || this.status !== 'playing') return;
        this._setPaused(!!m.on);
        break;
      case 'speed': {
        if (!isHost || !this.s.vsBots || !['instant', 'ultra', 'fast', 'normal', 'slow'].includes(m.speed)) return;
        const was = this._instant();
        this.s.botSpeed = m.speed;
        if (was && !this._instant() && this.recTimer) this._sendRecords();
        this._kick(pid);
        break;
      }
      case 'kick': {
        if (!isHost) return;
        if (!this.s.hostKick) return err('Removing players is turned off at this table.');
        const q = this.players.get(m.pid);
        if (!q || q.pid === this.hostPid) return;
        this.banned.add(q.token);
        this.onDirect(q.pid, { t: 'kicked' });
        this.onEvent('warn', `${q.name} was removed by the host`, null);
        this._log(`${q.name} was removed from the table`);
        if (this._inLiveHand(q.pid)) {
          q.leaving = true;
          if (this.hand.phase === 'betting' && this.handPids[this.hand.toAct] === q.pid) { Engine.applyAction(this.hand, { type: 'fold' }); this._afterAction(); return; }
        } else this._remove(q.pid);
        break;
      }
      case 'adjust': {
        if (!isHost) return;
        if (!this.s.hostAdjust) return err('Changing stacks is turned off at this table.');
        const h = this.hand, mid = !!h && h.phase !== 'done';
        if (this.shuffling) return err('The cards are being shuffled. Try again in a moment.');
        if (mid && !this.paused) return err('Pause the game first to change stacks during a hand.');
        const locked = [];
        for (const [qid, val] of Object.entries(m.stacks || {})) {
          const q = this.players.get(qid), v = Math.max(0, Math.floor(Number(val)));
          if (!q || !Number.isFinite(v)) continue;
          const i = mid ? this.handPids.indexOf(qid) : -1;
          if (i >= 0) {
            // Paused mid-hand: the new number is the chips they have behind (what is already in the pot
            // stays there). The hand is recorded as if they had started it with that many more chips,
            // so the record still replays exactly and their result for the hand is unchanged.
            const hp = h.players[i], to = hp.folded ? v : Math.max(1, v), d = to - hp.stack;
            if (!d) continue;
            if (hp.allIn) { locked.push(q.name); continue; }
            hp.stack = to; hp.startStack += d; q.stack += d; q.bought += d;
            this._log(`Host set ${q.name}'s chips behind to ${U.fmt(to)} during hand #${h.no} (was ${U.fmt(to - d)})`);
            continue;
          }
          if (v === q.stack) continue;
          this._log(`Host set ${q.name}'s stack to ${U.fmt(v)} (was ${U.fmt(q.stack)})`);
          q.bought += v - q.stack; q.stack = v;
          if (v > 0) { q.busted = false; if (!this.s.rebuys) q.sittingOut = false; }
        }
        if (locked.length) err(`${locked.join(', ')} ${locked.length > 1 ? 'are' : 'is'} all-in, so ${locked.length > 1 ? 'their' : 'that'} stack can be changed once this hand is over.`);
        this.onEvent('info', 'The host adjusted stacks', null);
        this._maybeDeal();
        break;
      }
      case 'end':
        if (!isHost) return;
        this.end('The host ended the game.');
        return;
      default: return;
    }
    this.changed();
  }

  /** Add a chat line. kind: { viewer } for someone watching through the viewer link, { bot } for a computer player. */
  addChat(from, text, kind = {}) {
    text = U.cleanText(text, 280);
    if (!text) return false;
    this.chat.push({ id: ++this.chatId, from, text, ts: Date.now(), viewer: !!kind.viewer, bot: !!kind.bot });
    if (this.chat.length > 80) this.chat.shift();
    return true;
  }
  /** A message from a viewer (watch link), if this table lets viewers chat. */
  viewerChat(name, text) {
    if (!this.s.spectators || !this.s.viewerChat || this.status === 'ended') return;
    if (this.addChat(name, text, { viewer: true })) this.changed();
  }

  /* ---------------- bot table talk (cheerful, optional) ---------------- */
  _botSay(kind, about) {
    // The lines cheer on the person at the table, so a bots-only game (you just watching) has none.
    if (!this.s.botChat || this.status === 'ended' || (this.s.vsBots && this.s.hostPlays === false)) return;
    const bots = [...this.players.values()].filter((p) => p.isBot && p.seat != null);
    if (!bots.length) return;
    const human = this.players.get(this.hostPid);
    const you = (human && human.name) || 'friend';
    const L = BOT_CHEER[kind] || BOT_CHEER.any;
    const line = L[Math.floor(Math.random() * L.length)].replace(/\{you\}/g, you).replace(/\{who\}/g, about || you);
    const bot = bots[Math.floor(Math.random() * bots.length)]; // cosmetic choice, not security-relevant
    clearTimeout(this.botChatTimer);
    this.botChatTimer = setTimeout(() => { if (this.status !== 'ended' && this.addChat(bot.name, line, { bot: true })) this.changed(); }, 700 + Math.random() * 1500);
  }

  _sit(pid, seat) {
    const p = this.players.get(pid);
    this.seats[seat] = pid; p.seat = seat; p.sittingOut = false;
    if (p.stack <= 0 && !this.s.rebuys) { p.sittingOut = true; p.busted = true; }
  }
  _remove(pid) {
    const p = this.players.get(pid);
    if (!p) return;
    if (p.seat != null && this.seats[p.seat] === pid) this.seats[p.seat] = null;
    this.players.delete(pid);
  }
  _inLiveHand(pid) {
    if (this.shuffling && this.shuffling.order.includes(pid)) return true;
    const h = this.hand, i = this.handPids.indexOf(pid);
    return !!h && h.phase !== 'done' && i >= 0 && !h.players[i].folded;
  }
  _eligible() {
    return this.seats.map((pid, seat) => ({ pid, seat })).filter(({ pid }) => {
      const p = pid && this.players.get(pid);
      return p && !p.sittingOut && !p.leaving && p.stack > 0;
    });
  }
  _log(text, kind = '') {
    this.log.push({ id: ++this.logId, text, kind });
    if (this.log.length > 250) this.log.shift();
  }
  _syncLog() {
    const h = this.hand;
    if (!h) return;
    for (; this.logCursor < h.log.length; this.logCursor++) {
      const e = h.log[this.logCursor];
      this._log(Engine.describeEntry(h, e), e.t === 'win' ? 'win' : '');
    }
  }
  /** Instant game, your turn, auto-play just switched on: act now instead of waiting. */
  _kick(pid) {
    const h = this.hand, p = this.players.get(pid);
    if (p && p.autoPlay && this._instant() && !this.paused && h && h.phase === 'betting' && this.handPids[h.toAct] === pid) { this._clearTurn(); this._proceed(); }
  }
  _setPaused(on) {
    if (this.paused === on) return;
    this.paused = on;
    if (on && this.recTimer) this._sendRecords();
    this._log(on ? 'Game paused by the host' : 'Game resumed');
    this.onEvent('info', on ? 'Game paused' : 'Game resumed', null);
    if (on) {
      if (this.turn) { clearTimeout(this.turn.handle); this.turn.frozen = this.turn.deadline ? Math.max(0, this.turn.deadline - Date.now()) : null; }
      Later.clear(this.nextTimer); this.nextTimer = null;
    } else {
      if (this.turn && this.turn.frozen != null) this._armTurn(this.turn.frozen, this.turn.total);
      if (!this.hand || this.hand.phase === 'done') this._startHand();
      else this._proceed();
    }
  }

  /* ---------------- hand lifecycle ---------------- */
  _maybeDeal() {
    if (this.status === 'playing' && !this.paused && !this.shuffling && (!this.hand || this.hand.phase === 'done') && !this.nextTimer) this._startHand();
  }

  _startHand() {
    Later.clear(this.nextTimer); this.nextTimer = null;
    if (this.status !== 'playing' || this.paused || this.shuffling) return this.changed();
    // Bots' moods wander a little from hand to hand, so their style labels stay tendencies.
    for (const p of this.players.values()) if (p.isBot && p.botTraits) Bots.driftTraits(p.botTraits);
    if (this.s.resetStacks) {
      // Every hand starts with full stacks; the difference is booked so each player's net result stays exact.
      for (const p of this.players.values()) if (p.seat != null) { p.bought += this.s.startingStack - p.stack; p.stack = this.s.startingStack; p.busted = false; }
    }
    // Players who have been gone for two minutes are sat out automatically.
    // (With bot takeover on, a bot keeps their seat going instead.)
    if (!this.s.botTakeover) for (const p of this.players.values()) if (!p.connected && p.disconnectedAt && Date.now() - p.disconnectedAt > 120000 && p.seat != null) p.sittingOut = true;
    this.botModels = Bots.buildModels(this.finished.slice(-80).map((f) => f.hand));
    // In an encrypted deal every dealt player's browser must take part, so absent players sit the hand out.
    const elig = this._eligible().filter((e) => !this.sra || this.players.get(e.pid).connected);
    if (elig.length < 2) { this.waiting = true; return this.changed(); }
    this.waiting = false;
    let bi;
    if (this.buttonSeat < 0) bi = U.randInt(elig.length);
    else { bi = elig.findIndex((e) => e.seat > this.buttonSeat); if (bi < 0) bi = 0; }
    this.buttonSeat = elig[bi].seat;
    const no = ++this.handNo;
    // Rising blinds.
    const lv = this.s.levelHands ? Math.min(LEVEL_FACTORS.length - 1, Math.floor((no - 1) / this.s.levelHands)) : 0;
    const f = LEVEL_FACTORS[lv];
    this.blinds = { sb: this.s.sb * f, bb: this.s.bb * f, ante: this.s.ante * f };
    if (lv !== this.level) {
      this.level = lv;
      const b = this.blinds;
      this._log(`Blinds go up to ${U.fmt(b.sb)}/${U.fmt(b.bb)}${b.ante ? `, ante ${U.fmt(b.ante)}` : ''}`);
      this.onEvent('info', `Blinds are now ${U.fmt(b.sb)}/${U.fmt(b.bb)}`, null);
    }
    const n = elig.length, order = [];
    for (let k = 1; k <= n; k++) order.push(elig[(bi + k) % n].pid);
    const sh = this.shuffling = {
      no, elig, bi, order, seedC: {}, seeds: {}, stage: 1, blinds: { ...this.blinds },
      names: Object.fromEntries(elig.map((e) => [e.pid, this.players.get(e.pid).name])),
      stacks: Object.fromEntries(elig.map((e) => [e.pid, this.players.get(e.pid).stack])),
    };
    this.changed();
    const run = this.sra ? this._sraSetup(sh) : this._fairShuffle(sh).then(() => true);
    run.then((ok) => {
      if (this.shuffling !== sh) return;
      this.shuffling = null;
      if (this.status !== 'playing') return this.changed();
      if (!ok) { this.nextTimer = setTimeout(() => { this.nextTimer = null; this._startHand(); }, 2000); return this.changed(); }
      this._deal(sh);
    }, (e) => { console.error(e); this.shuffling = null; this.changed(); });
  }

  /** Encrypted deal: run the shuffle among the players' browsers. If someone fails, nobody has posted chips yet. */
  async _sraSetup(sh) {
    if (this.sraDealer) this.sraDealer.cancel();
    const D = this.sraDealer = new SraDealer(this, sh);
    const ok = await D.setup();
    if (!ok && this.sraDealer === D && D.failure) {
      const f = D.failure, p = this.players.get(f.pid);
      this._log(`Hand #${sh.no} could not be dealt: ${f.why}`);
      this.onEvent('warn', `Re-dealing: ${f.why}`, null);
      if (p && f.sitOut && !p.isHost) { p.sittingOut = true; this._log(`${p.name} is sat out (their browser did not complete the encrypted deal)`); }
    }
    return ok;
  }

  /** Cancel a hand that cannot be finished (a key holder left): everyone gets back what they put in. */
  _voidHand(why) {
    const h = this.hand;
    if (!h || h.phase === 'done') return;
    this._clearTurn(); Later.clear(this.dealTimer); this.dealTimer = null;
    if (this.sraDealer) this.sraDealer.cancel();
    h.players.forEach((hp, i) => {
      hp.stack = hp.startStack; hp.bet = 0; hp.committed = 0; hp.allIn = false;
      const p = this.players.get(this.handPids[i]);
      if (p) p.stack = hp.stack;
    });
    h.phase = 'done'; h.toAct = -1; h.voided = true;
    h.results = { pots: [], payouts: h.players.map(() => 0), showdown: false, voided: true };
    this._log(`Hand #${h.no} was cancelled and all chips were returned: ${why}`);
    this.onEvent('warn', `Hand cancelled: ${why}. Chips returned.`, null);
    for (const pid of this.handPids) { const p = this.players.get(pid); if (p && p.leaving) this._remove(pid); }
    Later.clear(this.nextTimer);
    this.nextTimer = setTimeout(() => { this.nextTimer = null; this._startHand(); }, 3000);
    this.changed();
  }

  /** Commit to a secret pre-deck, then mix in every player's committed randomness. */
  async _fairShuffle(sh) {
    const D0 = Cards.shuffle(Cards.newDeck());
    const salts = D0.map(() => U.randHex(32)); // 256-bit salts: card commitments can't be brute-forced
    const commits = D0.map((c, i) => Fair.commit(c, salts[i]));
    Object.assign(sh, { D0, salts, commits });
    // Everyone connected adds randomness: seated players, players sitting out, spectators and the
    // dealer. The deck is unpredictable as long as any single one of them is honest.
    const contributors = sh.contributors = [...this.players.values()].filter((p) => p.pid === this.hostPid || (p.connected && !p.isBot)).map((p) => p.pid);
    this.onBroadcast({ t: 'fair1', no: sh.no, commits });
    sh.hostSeed = U.randHex(32);
    sh.seedC[this.hostPid] = Fair.sha256(sh.hostSeed);
    await this._collect(sh, 'seedC', contributors);
    sh.stage = 2;
    const committed = Object.keys(sh.seedC);
    this.onBroadcast({ t: 'fair2', no: sh.no, seedCommits: committed.map((pid) => sh.seedC[pid]) });
    if (sh.hostSeed) sh.seeds[this.hostPid] = sh.hostSeed;
    await this._collect(sh, 'seeds', committed);
    sh.stage = 3;
    const seeds = committed.filter((pid) => sh.seeds[pid] && Fair.sha256(sh.seeds[pid]) === sh.seedC[pid]).map((pid) => sh.seeds[pid]);
    sh.seedList = seeds;
    sh.holeCount = this.holeCount;
    sh.perm = Fair.permutation(Fair.combine(sh.no, commits, seeds), 52);
    sh.deck = sh.perm.map((i) => D0[i]);
    sh.layout = Fair.layout(sh.order.length, this.holeCount);
    this.onBroadcast({ t: 'fair3', no: sh.no, seeds, order: sh.order.map((pid) => sh.names[pid]), holeCount: this.holeCount });
  }

  _collect(sh, key, pids) {
    return new Promise((resolve) => {
      const done = () => pids.every((pid) => sh[key][pid] != null);
      if (done()) return resolve();
      const t = setTimeout(() => { sh.waiter = null; resolve(); }, SEED_WAIT_MS);
      sh.waiter = () => { if (done()) { clearTimeout(t); sh.waiter = null; resolve(); } };
    });
  }

  /** Deal from the jointly-shuffled deck and send each player the proofs for their own cards. */
  _deal(sh) {
    const hc = this.holeCount, L = sh.layout;
    const at = (pos) => ({ pos, card: sh.deck[pos], salt: sh.salts[sh.perm[pos]] });
    const holeOf = {};
    if (!this.sra) sh.order.forEach((pid, k) => {
      const own = Array.from({ length: hc }, (_, r) => at(L.hole(k, r)));
      holeOf[pid] = own.map((x) => x.card);
      this.onDirect(pid, { t: 'fairown', no: sh.no, cards: own });
    });
    this.fair = this.sra ? null : sh;
    this.handPids = sh.elig.map((e) => e.pid);
    for (const pid of this.handPids) { const nm = sh.names[pid]; if (!this.names.includes(nm)) this.names.push(nm); }
    this.hand = Engine.createHand({
      no: sh.no, players: sh.elig.map((e) => ({ name: sh.names[e.pid], stack: sh.stacks[e.pid] })),
      button: sh.bi, sb: sh.blinds.sb, bb: sh.blinds.bb, ante: sh.blinds.ante, hole: sh.elig.map((e) => holeOf[e.pid] || null),
      game: this.gameKind, limit: this.s.limit, holeCount: hc,
      rake: this.s.rakePct > 0 && !this.s.cepheus ? { pct: this.s.rakePct, cap: this.s.rakeCap ? this.s.rakeCap * sh.blinds.bb : 0 } : null,
    });
    this.logCursor = 0;
    this._log(`Hand #${sh.no}`, 'hand');
    this._syncLog();
    this._proceed();
  }

  /** Public proofs for this hand: board cards, shown hands, and at the end everything nobody needs to keep secret. */
  _fairView() {
    const f = this.fair, h = this.hand;
    if (!f || !h || f.no !== h.no) return null;
    const L = f.layout, seen = new Set(), reveals = [];
    const add = (pos) => { if (!seen.has(pos)) { seen.add(pos); reveals.push({ pos, card: f.deck[pos], salt: f.salts[f.perm[pos]] }); } };
    h.board.forEach((c, i) => add(L.board[i]));
    h.players.forEach((p, i) => {
      if (!p.shown) return;
      const k = f.order.indexOf(this.handPids[i]);
      for (let r = 0; r < f.holeCount; r++) add(L.hole(k, r));
    });
    // Only in "All cards" mode is the rest of the deck revealed at the end (the record shows every hand
    // then anyway). In "showdown only" mode, revealing burns or the undealt stub would let players
    // deduce folded and mucked hands by elimination, so only already-public cards are ever proven.
    if (h.phase === 'done' && this.s.recordHole === 'All') for (let pos = 0; pos < 52; pos++) add(pos);
    return { no: f.no, reveals, final: h.phase === 'done', seeds: f.seedList.length };
  }

  _afterAction() {
    this._clearTurn();
    this._syncLog();
    this._proceed();
  }

  _proceed() {
    const h = this.hand;
    if (!h) return this.changed();
    for (let guard = 0; guard < 400; guard++) {
      if (h.phase === 'betting') {
        const p = this.players.get(this.handPids[h.toAct]);
        if (!p || p.leaving) { Engine.applyAction(h, { type: 'fold' }); this._syncLog(); continue; }
        if (this._botControlled(p)) { this._clearTurn(); this._botTurn(); break; }
        if (p.autoPlay && this._instant() && !this.paused) { this._clearTurn(); this._autoAct(h); this._syncLog(); continue; }
        if (!this.turn || this.turn.idx !== h.toAct || this.turn.street !== h.street || this.turn.no !== h.no) this._startTurnTimer();
        break;
      }
      if (h.phase === 'deal' && this.sra) {
        if (!this.dealTimer && !this.paused) {
          // Every player's browser releases its key for the new board cards; the cards are unlocked only then.
          const runout = h.players.filter((p) => !p.folded && !p.allIn).length <= 1;
          const idx = h.street === 0 ? [0, 1, 2] : [h.street + 2];
          const D = this.sraDealer;
          this.dealTimer = -1;
          Promise.all([D.boardCards(idx), new Promise((r) => setTimeout(r, runout ? 1300 : 650))]).then(([res]) => {
            if (this.hand === h) this.dealTimer = null;
            if (this.hand !== h || h.phase !== 'deal' || this.status !== 'playing') return;
            if (!res.cards) return res.why ? this._voidHand(res.why) : undefined;
            if (this.paused) return;
            Engine.dealBoard(h, res.cards);
            this._syncLog();
            this._proceed();
          });
        }
        break;
      }
      if (h.phase === 'deal') {
        if (!this.dealTimer && !this.paused) {
          const runout = h.players.filter((p) => !p.folded && !p.allIn).length <= 1;
          this.dealTimer = Later.set(() => {
            this.dealTimer = null;
            if (this.hand !== h || h.phase !== 'deal' || this.status !== 'playing') return;
            if (this.paused) return;
            // Burn and turn from the committed positions (see Fair.layout).
            const idx = h.street === 0 ? [0, 1, 2] : [h.street + 2];
            const cards = idx.map((i) => this.fair.deck[this.fair.layout.board[i]]);
            Engine.dealBoard(h, cards);
            this._syncLog();
            this._proceed();
          }, (runout ? 1300 : 650) * this._pace(), this._instant());
        }
        break;
      }
      if (h.phase === 'showdown' && this.sra) {
        if (!this.dealTimer) {
          this.dealTimer = -1;
          this.sraDealer.showdown(h).then((plan) => {
            if (this.hand === h) this.dealTimer = null;
            if (!plan || this.hand !== h || h.phase !== 'showdown' || this.status !== 'playing') return;
            Engine.settle(h, plan);
            this._finishHand();
            this.changed();
          });
        }
        break;
      }
      if (h.phase === 'showdown') {
        Engine.settle(h, Engine.planShowdown(h, (i) => { const p = this.players.get(this.handPids[i]); return !p || p.autoMuck !== false; }));
        this._finishHand();
        break;
      }
      if (h.phase === 'settle') { Engine.settle(h); this._finishHand(); break; }
      break;
    }
    this.changed();
  }

  _finishHand() {
    const h = this.hand;
    this._clearTurn();
    this._syncLog();
    h.players.forEach((hp, i) => { const p = this.players.get(this.handPids[i]); if (p) p.stack = hp.stack; });
    this.finished.push({ hand: h, pids: this.handPids.slice() });
    if (this._instant() && !this.s.cepheus) this._compact(this.finished[this.finished.length - KEEP_FULL_HANDS - 1]);
    for (const pid of this.handPids) {
      const p = this.players.get(pid);
      if (!p) continue;
      if (p.leaving) { this._remove(pid); continue; }
      if (p.stack === 0 && (p.isBot || (p.autoPlay && this._instant())) && this.s.rebuys && (!this.s.maxRebuys || p.rebuys < this.s.maxRebuys)) {
        p.stack = this.s.startingStack; p.rebuys++; p.bought += this.s.startingStack;
        this._log(`${p.name} rebuys for ${U.fmt(this.s.startingStack)}`);
      } else if (p.stack === 0) {
        p.busted = true;
        p.sittingOut = true;
        this._log(this.s.rebuys ? `${p.name} is out of chips (rebuy available)` : `${p.name} is out of chips`);
      }
    }
    if (this._instant()) this._recordsSoon(); else this._sendRecords();
    if (this.sra && this.s.recordHole === 'All' && this.sraDealer) this.sraDealer.revealAll(h, () => { delete h.recText; this._sendRecords(); });
    if (this.s.botChat && !this._instant()) {
      const hi = this.handPids.indexOf(this.hostPid), won = hi >= 0 ? h.results.payouts[hi] : 0;
      const host = this.players.get(this.hostPid);
      if (hi >= 0 && won > 0 && won >= 10 * h.bb) this._botSay('bigWin');
      else if (hi >= 0 && host && host.stack === 0) this._botSay('bust');
      else if (hi >= 0 && won > 0) this._botSay('win');
      else if (Math.random() < 0.3) this._botSay('any');
    }
    // Play Against Cepheus with kept stacks: the match is over when either player has no chips left.
    if (this.s.cepheus && !this.s.resetStacks) {
      const out = this.handPids.map((pid) => this.players.get(pid)).find((p) => p && p.stack === 0);
      if (out) {
        const msg = out.botKind === 'cepheus' ? `Cepheus is out of chips. You win the match after ${this.finished.length.toLocaleString()} hands!` : `You are out of chips. Cepheus wins the match after ${this.finished.length.toLocaleString()} hands.`;
        this._log(msg);
        this.end(msg, true);
        return;
      }
    }
    // Just watching a bot game: once a single bot has chips left, it has won.
    if (this.s.vsBots && this.s.hostPlays === false && this._eligible().length < 2) {
      const w = this._eligible()[0], p = w && this.players.get(w.pid);
      const msg = p ? `${p.name} wins: every other bot is out of chips after ${this.finished.length.toLocaleString()} hands.` : 'Every bot is out of chips.';
      this._log(msg);
      this.end(msg, true);
      return;
    }
    Later.clear(this.nextTimer);
    if (this._eligible().length < 2) this.waiting = true;
    this.nextTimer = Later.set(() => { this.nextTimer = null; this._startHand(); }, (HAND_PAUSE_MS + (h.results.showdown ? 1200 : 0)) * this._pace(), this._instant());
  }

  /* ---------------- action clock ---------------- */
  _startTurnTimer(keepIfRunning) {
    const h = this.hand;
    if (!h || h.phase !== 'betting') return;
    const p = this.players.get(this.handPids[h.toAct]);
    if (keepIfRunning && this.turn && this.turn.idx === h.toAct && this.turn.deadline && this.s.timer) return;
    this._clearTurn();
    let secs = this.s.timer || 0;
    if (!secs && p && !p.connected) secs = DISCONNECT_GRACE;
    this.turn = { idx: h.toAct, street: h.street, no: h.no, deadline: null, total: secs * 1000, handle: null };
    if (secs && !this.paused) this._armTurn(secs * 1000, secs * 1000);
    else if (secs && this.paused) this.turn.frozen = secs * 1000;
  }
  _armTurn(ms, total) {
    const t = this.turn;
    t.total = total; t.deadline = Date.now() + ms; t.frozen = null;
    clearTimeout(t.handle);
    t.handle = setTimeout(() => this._timeout(t), ms);
  }
  _timeout(t) {
    const h = this.hand;
    if (this.turn !== t || !h || h.phase !== 'betting' || h.toAct !== t.idx || this.paused) return;
    const L = Engine.legal(h);
    Engine.applyAction(h, { type: L.canCheck ? 'check' : 'fold' });
    this._log(`${h.players[t.idx].name} ran out of time`);
    this._afterAction();
  }
  _clearTurn() { if (this.turn) clearTimeout(this.turn.handle); this.turn = null; }

  end(reason, tellPlayers) {
    if (this.status === 'ended') return;
    this.status = 'ended';
    if (tellPlayers) this.endReason = reason; // shown as the game-over message (otherwise "You ended the game")
    this._clearTurn(); Later.clear(this.nextTimer); Later.clear(this.dealTimer); Later.clear(this.botTimer);
    this.shuffling = null;
    if (this.sraDealer) this.sraDealer.cancel();
    this._log('The game has ended');
    this._sendRecords();
    this.onEvent('info', reason, null);
    this.changed();
  }

  /* ---------------- records ---------------- */
  /**
   * A player's record. By default hands in which a bot made any decision are left out (the pure
   * player-vs-player record); full = true includes them, tagged [Bots "..."]. In Play vs Bots
   * mode every hand has bots, so the record is always the full one.
   */
  recordFor(pid, full) {
    full = full || !!this.s.vsBots;
    const tags = Notation.gameTags({
      event: this.s.tableName, date: this.date, sb: this.s.sb, bb: this.s.bb, ante: this.s.ante,
      startingStack: this.s.startingStack, players: this.names, holeCards: this.s.recordHole, variant: this.variant,
      settings: this.settingTags(),
    });
    // Each finished hand's text is kept, so a long game does not rebuild every hand each time.
    const texts = this.finished.filter(({ hand }) => full || !(hand.botNames && hand.botNames.length)).map(({ hand, pids }) => this._handText(hand, pids.indexOf(pid)));
    return Notation.serialize({ tags, hands: [] }).replace(/\n$/, '') + texts.map((x) => '\n\n' + x).join('') + '\n';
  }
  /** All of this table's settings as record header tags. */
  settingTags() {
    const s = this.s, yn = (x) => (x ? 'On' : 'Off');
    const t = [
      ['Mode', s.cepheus ? 'Play Against Cepheus' : s.vsBots ? 'Play vs Bots' : 'Hosted'], ['Game', VARIANTS[this.variant].name], ['MaxSeats', s.maxSeats],
      ['ActionTimer', s.timer ? `${s.timer}s` : 'Off'], ['BlindsUp', s.levelHands ? `Every ${s.levelHands} hands` : 'Never'],
      ['Rebuys', !s.rebuys ? 'None' : s.maxRebuys ? `${s.maxRebuys} each` : 'Unlimited'],
      ['Rake', s.rakePct > 0 && !s.cepheus ? `${s.rakePct}%${s.rakeCap ? ` cap ${s.rakeCap}bb` : ''}` : 'Off'],
    ];
    if (s.vsBots) {
      const bots = [...this.players.values()].filter((p) => p.isBot);
      t.push(['BotPlayers', bots.map((p) => p.botKind === 'cepheus' ? `${p.name} (CFR+ approximation of Cepheus, not Cepheus's own strategy)`
        : `${p.name} (${Bots.LABELS[p.botDifficulty] || p.botDifficulty}, ${(Bots.PERSONALITIES[p.botPersonality] || {}).name || p.botPersonality})`).join('; ')],
        ['BotSpeed', s.botSpeed || 'normal'], ['BotsCheer', yn(s.botChat)]);
      if (s.hostPlays === false) t.push(['HostPlays', 'Off']); // just watching the bots
      if (s.resetStacks) t.push(['StacksReset', 'Every hand']);
    } else {
      t.push(['Deal', this.sra ? 'Encrypted' : 'Standard'], ['HostPlays', yn(s.hostPlays !== false)], ['BotTakeover', yn(s.botTakeover)], ['WaitingRoom', yn(s.listed)]);
    }
    t.push(['Viewers', yn(s.spectators)], ['ViewerChat', yn(s.viewerChat)], ['HostCanChangeStacks', yn(s.hostAdjust)], ['HostCanRemovePlayers', yn(s.hostKick)]);
    return t;
  }
  _sendRecords() {
    clearTimeout(this.recTimer); this.recTimer = null;
    for (const [pid, p] of this.players) if (!p.isBot) this.onRecord(pid, this.recordFor(pid, false), this.recordFor(pid, true));
  }
  /**
   * Instant games can play tens of thousands of hands. Older hands keep only their finished record
   * text (for each person at the table), not the whole hand, so memory stays small. The last
   * KEEP_FULL_HANDS stay complete for the bots' reads of their opponents.
   */
  _compact(f) {
    if (!f || f.lite) return;
    const h = f.hand, ks = [...this.players.values()].filter((p) => !p.isBot).map((p) => f.pids.indexOf(p.pid));
    for (const k of ks) this._handText(h, k);
    f.hand = { no: h.no, botNames: h.botNames, recText: h.recText };
    f.lite = true;
  }
  _handText(hand, k) {
    const c = hand.recText || (hand.recText = {});
    return c[k] || (c[k] = Notation.serializeHand(Notation.fromHand(hand, k, this.s.recordHole, { levels: !!this.s.levelHands })));
  }
  /** Instant games: hands finish many times a second, so the record is saved every few seconds instead. */
  _recordsSoon() { if (!this.recTimer) this.recTimer = setTimeout(() => this._sendRecords(), INSTANT_RECORD_MS); }

  changed() { this.onChange(); }

  /* ---------------- personalised view ---------------- */
  viewFor(pid) {
    const me = this.players.get(pid);
    const h = this.hand;
    const myIdx = h ? this.handPids.indexOf(pid) : -1;
    const done = h && h.phase === 'done';
    const curActs = {};
    if (h) for (const e of h.log) {
      if (e.t === 'act' && e.street === h.street) curActs[e.p] = e;
      if (e.t === 'post' && h.street === 0 && e.kind !== 'a' && !curActs[e.p]) curActs[e.p] = { type: e.kind, amt: e.amt };
    }
    const wins = {};
    if (done) h.log.filter((e) => e.t === 'win').forEach((e) => { wins[e.p] = (wins[e.p] || 0) + e.amt; });
    const winCards = new Set();
    // Just watching a bot game, with "show every bot's cards": the host sees all hole cards (only bots are dealt in).
    const reveal = pid === this.hostPid && !!this.s.vsBots && this.s.hostPlays === false && !!this.s.showBotCards;
    if (done && h.results.showdown) h.results.pots.forEach((pt) => pt.winners.forEach((w) => { const ev = h.results.evals[w]; if (ev) ev.best.forEach((c) => winCards.add(c)); }));

    const seats = this.seats.map((qid, seat) => {
      if (!qid) return null;
      const q = this.players.get(qid);
      if (!q) return null;
      const i = h ? this.handPids.indexOf(qid) : -1;
      const hp = i >= 0 ? h.players[i] : null;
      let cards = null;
      if (hp) {
        if (qid === pid || hp.shown || reveal) cards = hp.hole ? hp.hole.slice() : new Array(this.holeCount).fill(null);
        else if (!hp.folded && !hp.mucked) cards = new Array(this.holeCount).fill(null);
      }
      let handName = null;
      if (hp && cards && cards[0] && (qid === pid || hp.shown || reveal) && !(qid === pid && hp.folded && !done)) {
        const e = Eval.forGame(h.game, hp.hole, h.board);
        handName = Eval.describe(e);
      }
      const la = hp && curActs[i];
      return {
        seat, pid: qid, name: q.name, stack: hp ? hp.stack : q.stack, bet: hp ? hp.bet : 0, cards,
        inHand: !!hp, folded: !!hp && hp.folded, allIn: !!hp && hp.allIn && !done, sittingOut: q.sittingOut && !hp,
        busted: q.busted && !hp, disconnected: !q.connected && !q.isBot, isHost: q.isHost, isYou: qid === pid,
        isBot: !!q.isBot, botPlaying: !q.isBot && this._botControlled(q), botLabel: q.isBot ? (q.botKind === 'cepheus' ? 'CFR+ approx.' : Bots.LABELS[q.botDifficulty]) : null,
        button: !!h && hp && i === h.button, sb: !!h && hp && i === h.sbIdx && !done, bb: !!h && hp && i === h.bbIdx && !done,
        toAct: !!h && h.phase === 'betting' && h.toAct === i,
        won: done && wins[i] ? wins[i] : 0, handName, shown: !!hp && hp.shown, mucked: !!hp && hp.mucked,
        lastAction: la ? la.type : null, lastTo: la ? la.to || la.amt : null,
      };
    });
    let pots = [];
    if (h && !done) {
      const ps = Engine.collectedPots(h);
      pots = ps.map((pt, k) => ({ label: ps.length > 1 ? (k === 0 ? 'Main' : `Side ${k}`) : 'Pot', amount: pt.amount }));
    }
    let legal = null;
    if (h && h.phase === 'betting' && myIdx >= 0 && h.toAct === myIdx && !this.paused) legal = Engine.legal(h);
    const t = this.turn;
    const timer = t && h && h.phase === 'betting' && t.idx === h.toAct
      ? { remaining: t.deadline ? Math.max(0, t.deadline - Date.now()) : t.frozen, total: t.total, paused: this.paused } : null;
    const results = done ? {
      showdown: h.results.showdown,
      winCards: [...winCards],
      lines: h.voided ? ['Hand cancelled: all chips returned'] : h.log.filter((e) => e.t === 'win').map((e) => Engine.describeEntry(h, e)),
    } : null;
    return {
      t: 'state',
      table: {
        name: this.s.tableName, sb: this.blinds.sb, bb: this.blinds.bb, ante: this.blinds.ante, baseSb: this.s.sb, baseBb: this.s.bb,
        maxSeats: this.s.maxSeats, timer: this.s.timer, rebuys: this.s.rebuys, maxRebuys: this.s.maxRebuys || 0, recordHole: this.s.recordHole,
        startingStack: this.s.startingStack, variant: this.variant, variantName: VARIANTS[this.variant].name, holeCount: this.holeCount,
        limit: this.s.limit, botSpeed: this.s.vsBots ? this.s.botSpeed || 'normal' : null, rakePct: this.s.cepheus ? 0 : this.s.rakePct || 0, rakeCap: this.s.rakeCap || 0, levelHands: this.s.levelHands || 0, level: this.level + 1, hostPlays: this.s.hostPlays !== false,
        botTakeover: !!this.s.botTakeover, vsBots: !!this.s.vsBots, sra: this.sra,
        spectators: !!this.s.spectators, viewerChat: !!this.s.viewerChat, botChat: !!this.s.botChat, listed: !!this.s.listed,
        hostAdjust: !!this.s.hostAdjust, hostKick: !!this.s.hostKick,
        showBotCards: !!this.s.showBotCards, cepheus: !!this.s.cepheus, resetStacks: !!this.s.resetStacks, handsDone: this.finished.length, cepheusFallbacks: this.cepheusFallbacks || 0,
        nextLevelIn: this.s.levelHands ? this.s.levelHands - ((Math.max(1, this.handNo) - 1) % this.s.levelHands) : 0,
      },
      watchId: this.s.spectators ? this.watchId || null : null, shuffling: !!this.shuffling, fair: this._fairView(), sraWait: this.sraDealer ? this.sraDealer.waiting() : [], voided: !!(h && h.voided),
      status: this.status, endReason: this.endReason || null, paused: this.paused, waiting: !!this.waiting, handNo: h ? h.no : 0,
      phase: h ? h.phase : null, street: h ? (done ? (h.results.showdown ? 'Showdown' : STREETS[h.street]) : STREETS[h.street]) : '',
      board: h ? h.board.slice() : [], pots, potTotal: h && !done ? Engine.potTotal(h) : 0,
      seats, legal, timer, results,
      you: me ? {
        pid, name: me.name, seat: me.seat, isHost: pid === this.hostPid, inHand: myIdx >= 0 && !!h && !h.players[myIdx].folded && !done,
        dealt: myIdx >= 0, sittingOut: me.sittingOut, busted: me.busted, stack: me.stack, autoMuck: me.autoMuck,
        canShow: !!done && myIdx >= 0 && !h.players[myIdx].shown, canRebuy: !!this.s.rebuys && me.stack === 0 && !this._inLiveHand(pid) && (!this.s.maxRebuys || me.rebuys < this.s.maxRebuys),
        toCallPreview: h && myIdx >= 0 && h.phase === 'betting' && !h.players[myIdx].folded ? Math.max(0, h.currentBet - h.players[myIdx].bet) : 0,
      } : null,
      hostName: this.players.get(this.hostPid).name,
      players: [...this.players.values()].map((q) => ({
        pid: q.pid, name: q.name, seat: q.seat, stack: q.stack, connected: q.connected, sittingOut: q.sittingOut, busted: q.busted,
        isHost: q.isHost, isBot: !!q.isBot, rebuys: q.rebuys, net: (this._liveStack(q.pid) ?? q.stack) - q.bought,
      })),
      log: this.log.slice(-120), chat: this.chat.slice(-60),
    };
  }
  /**
   * What someone watching through the viewer link sees: the table as an onlooker, never a hole card
   * (only hands turned face up at showdown, which every player sees too), and none of the deal proofs.
   */
  viewForWatcher() {
    const v = this.viewFor('\u0000watcher');
    v.seats = v.seats.map((st) => st && { ...st, cards: st.cards && st.shown ? st.cards : st.cards && st.cards.map(() => null), handName: st.shown ? st.handName : null });
    v.fair = null; v.you = null; v.legal = null; v.watching = true; v.players = v.players.map((p) => ({ ...p, pid: '' }));
    return v;
  }
  _liveStack(pid) {
    const h = this.hand, i = this.handPids.indexOf(pid);
    if (!h || i < 0 || h.phase === 'done') return null;
    return h.players[i].stack + h.players[i].committed;
  }
}
