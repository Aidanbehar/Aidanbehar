
/* =====================================================================
   6. NETWORKING  (PeerJS free cloud broker + free public STUN; no TURN)
   Host = authoritative. Clients send intents only and receive their own
   personalised state. "?local" in the URL swaps PeerJS for a
   BroadcastChannel transport so two tabs can play fully offline.
   ===================================================================== */
const Prefs = {
  get(k, d) { try { const v = localStorage.getItem('feltroom.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('feltroom.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem('feltroom.' + k); } catch { /* ignore */ } },
  /** Everything this site has stored in this browser, grouped for the "Clear my data" dialog. */
  summary() {
    const keys = Prefs.keys();
    const has = (p) => keys.filter((k) => k.startsWith(p)).length;
    return { name: Prefs.get('name', ''), settings: has('lastSettings'), tokens: has('token.'), records: has('record.') + has('viewer'), total: keys.length };
  },
  keys() {
    try { return Object.keys(localStorage).filter((k) => k.startsWith('feltroom.')).map((k) => k.slice(9)); } catch { return []; }
  },
  /** Wipe saved names, settings, rejoin links and records; optionally keep display preferences. */
  wipe(keepDisplay) {
    const display = ['theme', 'muted', 'fourColor', 'panelOpen', 'vSpeed', 'device', 'felt', 'cardBack', 'rail', 'bigPrint'];
    for (const k of Prefs.keys()) if (!(keepDisplay && display.includes(k))) Prefs.del(k);
    try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('feltroom.')) sessionStorage.removeItem(k); } catch { /* ignore */ }
  },
};

/** Drop-in stand-in for the parts of the PeerJS API we use, over BroadcastChannel (same browser only). */
class LocalPeer {
  constructor(id) {
    this.id = typeof id === 'string' ? id : 'local-' + U.randHex(4);
    this.h = {}; this.conns = {}; this.disconnected = false; this.destroyed = false;
    this.bc = new BroadcastChannel('feltroom-local');
    this.bc.onmessage = (e) => this._msg(e.data);
    // Like the real broker, an ID can only be held by one peer at a time.
    if (typeof id === 'string') this.bc.postMessage({ k: 'who', id });
    setTimeout(() => { if (this.taken) { this.destroyed = true; this._emit('error', { type: 'unavailable-id', message: 'ID is taken' }); } else this._emit('open', this.id); }, 150);
    addEventListener('beforeunload', () => this.destroy());
  }
  on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return this; }
  off() { }
  _emit(ev, ...a) { (this.h[ev] || []).forEach((f) => f(...a)); }
  connect(to) {
    const c = new LocalConn(this, U.randHex(6), to);
    this.conns[c.cid] = c;
    this.bc.postMessage({ k: 'connect', from: this.id, to, cid: c.cid });
    c._timer = setTimeout(() => { if (!c.open) this._emit('error', { type: 'peer-unavailable', message: 'Could not connect to peer ' + to }); }, 2500);
    return c;
  }
  _msg(m) {
    if (this.destroyed) return;
    if (m.k === 'who') { if (m.id === this.id) this.bc.postMessage({ k: 'taken', id: m.id }); return; }
    if (m.k === 'taken') { if (m.id === this.id) this.taken = true; return; }
    if (m.to !== this.id) return;
    const c = this.conns[m.cid];
    if (m.k === 'connect') {
      const nc = new LocalConn(this, m.cid, m.from);
      this.conns[m.cid] = nc; nc.open = true;
      this._emit('connection', nc);
      this.bc.postMessage({ k: 'accept', cid: m.cid, to: m.from });
      setTimeout(() => nc._emit('open'), 0);
    } else if (m.k === 'accept' && c) { c.open = true; clearTimeout(c._timer); c._emit('open'); }
    else if (m.k === 'data' && c && c.open) c._emit('data', m.data);
    else if (m.k === 'close' && c && c.open) { c.open = false; c._emit('close'); }
  }
  reconnect() { }
  destroy() { if (this.destroyed) return; Object.values(this.conns).forEach((c) => c.close()); this.destroyed = true; try { this.bc.close(); } catch { /* ignore */ } }
}
class LocalConn {
  constructor(p, cid, remote) { this.p = p; this.cid = cid; this.peer = remote; this.open = false; this.h = {}; }
  on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return this; }
  _emit(ev, ...a) { (this.h[ev] || []).forEach((f) => f(...a)); }
  send(data) { if (this.open && !this.p.destroyed) this.p.bc.postMessage({ k: 'data', cid: this.cid, to: this.peer, data: JSON.parse(JSON.stringify(data)) }); }
  close() { if (!this.open) return; this.open = false; try { this.p.bc.postMessage({ k: 'close', cid: this.cid, to: this.peer }); } catch { /* ignore */ } this._emit('close'); }
}

const Net = {
  // Free public STUN servers only (no TURN, nothing paid).
  ICE: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }],
  // The offline BroadcastChannel transport is a development aid: every tab of the site can read its
  // messages, so it is only available on localhost, never on the deployed site.
  local: /[?&]local\b/.test(location.search) && /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname),

  async lib() {
    if (Net.local) return LocalPeer;
    for (let i = 0; i < 100 && typeof window.Peer !== 'function'; i++) await new Promise((r) => setTimeout(r, 100));
    if (typeof window.Peer !== 'function') throw { type: 'lib-missing' };
    return window.Peer;
  },

  /** Resolves with an open Peer; rejects with a PeerJS-style {type} error. */
  async createPeer(id) {
    const P = await Net.lib();
    return new Promise((resolve, reject) => {
      let settled = false;
      const opts = { debug: 0, config: { iceServers: Net.ICE } };
      const peer = id ? new P(id, opts) : new P(opts);
      const to = setTimeout(() => { if (!settled) { settled = true; try { peer.destroy(); } catch { /* ignore */ } reject({ type: 'broker-timeout' }); } }, 15000);
      peer.on('open', () => { if (settled) return; settled = true; clearTimeout(to); resolve(peer); });
      peer.on('error', (e) => { if (settled) return; settled = true; clearTimeout(to); try { peer.destroy(); } catch { /* ignore */ } reject(e); });
    });
  },

  watchUrl(id) { return id ? `${location.origin}${location.pathname.replace(/index\.html$/, '')}${Net.local ? '?local' : ''}#watch=${id}` : ''; },

  newHostId() {
    const a = 'abcdefghjkmnpqrstuvwxyz23456789';
    const part = () => Array.from({ length: 4 }, () => a[U.randInt(a.length)]).join('');
    return `nlhe-${part()}-${part()}`;
  },

  /** Turn raw PeerJS errors into something a human can act on. */
  friendly(e) {
    const t = (e && e.type) || '';
    const map = {
      'peer-unavailable': ['Game not found', 'Nobody is hosting at this link right now. The host may have closed their tab, or the link was copied incompletely.'],
      'unavailable-id': ['Table ID already in use', 'That table ID is taken on the matchmaking broker. Retry to get a fresh one.'],
      'network': ["Can't reach the matchmaking broker", 'The free PeerJS broker (0.peerjs.com) could not be reached. Check your internet connection, then retry in a moment.'],
      'server-error': ['Matchmaking broker is having trouble', 'The free PeerJS broker returned an error. It is usually back within a minute; retry shortly.'],
      'socket-error': ["Can't reach the matchmaking broker", 'The connection to the free PeerJS broker failed. Check your connection or try again shortly.'],
      'socket-closed': ['Lost the matchmaking broker', 'The connection to the PeerJS broker closed unexpectedly. Retry to reconnect.'],
      'broker-timeout': ['The broker is not answering', 'The free PeerJS broker did not respond in time. It may be busy or blocked on this network. Retry, or try another network.'],
      'browser-incompatible': ['Browser not supported', 'This browser does not support WebRTC data channels. Try a current Chrome, Firefox, Safari or Edge.'],
      'webrtc': ['Connection blocked', 'A direct peer-to-peer connection could not be made. Strict firewalls, some school/office networks and some VPNs block it. Try another network, such as a phone hotspot.'],
      'negotiation-failed': ['Connection blocked', 'A direct peer-to-peer connection could not be negotiated. Try another network, such as a phone hotspot.'],
      'connect-timeout': ['Connection blocked', 'The host was found but no direct connection could be opened in time. A firewall or VPN may be blocking peer-to-peer traffic. Try another network.'],
      'lib-missing': ['Could not load PeerJS', 'The free PeerJS library could not be downloaded from the CDN (unpkg / jsDelivr). Check your connection or content blocker and retry.'],
      'disconnected': ['Disconnected from the broker', 'Lost contact with the matchmaking broker. Retry to reconnect.'],
      'no-crypto': ['This browser cannot shuffle securely', 'Hosting needs the browser\'s built-in secure random number generator (crypto.getRandomValues). Please use a current browser.'],
      'rejected': ['Could not join', (e && e.message) || 'The host declined the connection.'],
    };
    const [title, message] = map[t] || ['Something went wrong', (e && e.message) || String(e)];
    return { title, message, type: t };
  },
};


/**
 * A player's browser in an encrypted deal (host and guests alike): runs SraPlayer one message at a
 * time, holds back board-key requests until the table has really reached that street, and fills our
 * own cards into the views and records the dealer sends (the dealer itself never has them).
 */
class SraLink {
  constructor(name, tableId, send, onProblem) {
    this.p = new SraPlayer(name, SraStore(tableId, name));
    this.send = send; this.onProblem = onProblem;
    this.q = Promise.resolve(); this.deferred = []; this.view = null; this.flagged = new Set();
  }
  static is(m) { return typeof m.t === 'string' && /^sra[A-Z]/.test(m.t); }
  msg(m) { this.q = this.q.then(() => this._run(m)).catch((e) => console.warn(e)); }
  _problem(no, why) { if (!this.flagged.has(no)) { this.flagged.add(no); this.onProblem(no, why); } }
  async _run(m) {
    const v0 = this.view;
    const r = await this.p.handle(m, { view: v0, recordAll: !!(v0 && v0.table.recordHole === 'All'), onProblem: (no, why) => this._problem(no, why) });
    if (r) this.send(r);
    else if (m.t === 'sraBoard' || m.t === 'sraRevealAll' || m.t === 'sraSd') {
      // Not yet allowed: the view for that street may have arrived while we were working, else wait for it.
      if (this.view !== v0) return this._run(m);
      this.deferred = this.deferred.filter((x) => !(x.t === m.t && x.no === m.no)).concat(m).slice(-6);
    }
  }
  onView(v) {
    this.view = v;
    const why = this.p.check(v);
    if (why) this._problem(v.handNo, why);
    const d = this.deferred; this.deferred = [];
    for (const m of d) if (m.no >= v.handNo) this.msg(m);
  }
  patchView(v) { return this.p.patchView(v); }
  patchRecord(text) { return this.p.patchRecord(text); }
  /** Our keys for a voluntary show of the current hand. */
  showKeys(no) { const r = this.p.reveal(no); return r ? r.keys : null; }
}


/**
 * PeerJS's JSON channel refuses messages over about 16 KB, so bigger ones (an encrypted deck, a
 * long chat history) travel as numbered parts and are put back together on arrival.
 */
const Wire = {
  MAX: 15000,
  pack(m) {
    const s = JSON.stringify(m);
    if (s.length <= Wire.MAX) return [m];
    const id = U.randHex(4), n = Math.ceil(s.length / Wire.MAX);
    return Array.from({ length: n }, (_, i) => ({ t: 'part', id, i, n, s: s.slice(i * Wire.MAX, (i + 1) * Wire.MAX) }));
  },
  /** Returns the whole message once every part is in, else null. At most 4 messages in flight, 12 parts each. */
  unpack(store, m) {
    if (typeof m.id !== 'string' || !/^[0-9a-f]{8}$/.test(m.id) || !Number.isInteger(m.n) || m.n < 2 || m.n > 12
      || !Number.isInteger(m.i) || m.i < 0 || m.i >= m.n || typeof m.s !== 'string' || m.s.length > Wire.MAX) return null;
    let a = store.get(m.id);
    if (!a) {
      if (store.size >= 4) store.delete(store.keys().next().value);
      a = { n: m.n, got: 0, parts: [] };
      store.set(m.id, a);
    }
    if (a.n !== m.n || a.parts[m.i] != null) return null;
    a.parts[m.i] = m.s; a.got++;
    if (a.got < a.n) return null;
    store.delete(m.id);
    try { return JSON.parse(a.parts.join('')); } catch { return null; }
  },
};


/**
 * Viewers who open the watch link (#watch=ID). They are not players: they can't sit, act or see a
 * single hole card, they get no records or deal proofs, and they can chat only if the table allows
 * it. Used by both hosted games and Play vs Bots.
 */
const MAX_WATCHERS = 40;
class WatchHub {
  constructor(session) { this.s = session; this.conns = new Set(); this.peer = null; }
  get table() { return this.s.table; }
  /** The viewer link uses its own broker ID, separate from the players' invite link, so it can only ever watch. */
  get url() { return this.peer ? Net.watchUrl(this.peer.id) : ''; }
  async open() {
    try {
      this.peer = await Net.createPeer(Net.newHostId());
      this.peer.on('connection', (c) => {
        c.lastSeen = Date.now();
        c.on('data', (m) => {
          c.lastSeen = Date.now();
          if (!m || typeof m !== 'object' || Array.isArray(m)) return;
          const now = Date.now(), b = c.bucket || (c.bucket = { n: 20, t: now });
          b.n = Math.min(20, b.n + ((now - b.t) / 1000) * 8); b.t = now;
          if (b.n < 1) return;
          b.n -= 1;
          if (c.watch) this.data(c, m);
          else if (m.t === 'hello' && m.watch === true) this.hello(c, m);
          else { this.s._send(c, { t: 'reject', text: 'This is a viewer link: it can only be used to watch.' }); setTimeout(() => { try { c.close(); } catch { /* ignore */ } }, 500); }
        });
        c.on('close', () => this.closed(c));
        c.on('error', () => this.closed(c));
      });
      this.peer.on('disconnected', () => { setTimeout(() => { try { if (!this.peer.destroyed) this.peer.reconnect(); } catch { /* ignore */ } }, 1500); });
      this.beat = setInterval(() => this.heartbeat(), 4000);
      if (this.table) { this.table.watchId = this.peer.id; this.table.changed(); }
    } catch (e) {
      this.s.handlers.error(`The viewer link isn't available: ${Net.friendly(e).title}.`);
    }
  }
  close(reason) {
    this.end(reason);
    clearInterval(this.beat);
    if (this.peer) setTimeout(() => { try { this.peer.destroy(); } catch { /* ignore */ } }, 300);
  }
  hello(c, m) {
    const t = this.table;
    const no = (text) => { this.s._send(c, { t: 'reject', text }); setTimeout(() => { try { c.close(); } catch { /* ignore */ } }, 500); };
    if (!t || !t.s.spectators) return no('This table does not allow viewers.');
    if (t.status === 'ended') return no('This game has ended.');
    if (this.conns.size >= MAX_WATCHERS) return no('Too many people are watching this table right now.');
    c.watch = true;
    c.name = (U.sanitizeName(String(m.name || '').slice(0, 64)) || 'Viewer').slice(0, 18);
    this.conns.add(c);
    this.s._send(c, { t: 'welcome', watch: true, name: c.name, hostId: this.peer.id });
    this.s._send(c, t.viewForWatcher());
  }
  data(c, m) {
    if (m.t === 'ping') return this.s._send(c, { t: 'pong' });
    if (m.t === 'chat') this.table.viewerChat(c.name + ' (viewer)', m.text);
  }
  closed(c) { this.conns.delete(c); }
  broadcast() {
    if (!this.conns.size) return;
    const v = this.table.viewForWatcher();
    for (const c of this.conns) this.s._send(c, v);
  }
  event(kind, text) { for (const c of this.conns) this.s._send(c, { t: 'event', kind, text }); }
  end(reason) { for (const c of this.conns) this.s._send(c, { t: 'ended', reason }); }
  heartbeat() {
    const now = Date.now();
    for (const c of [...this.conns]) {
      this.s._send(c, { t: 'ping' });
      if (now - c.lastSeen > 16000) { this.conns.delete(c); try { c.close(); } catch { /* ignore */ } }
    }
  }
}


/**
 * The Waiting Room: public tables, found without any server of our own. There are a fixed number of
 * well-known room slots on the free PeerJS broker. A host who opts in claims a free slot with a second
 * connection; the Waiting Room screen asks every slot "which table is here?" and lists the answers.
 * Only the table name, host name, stakes and seat count are shared, plus the links to join or watch.
 */
const Rooms = {
  SLOTS: 24,
  slotId: (i) => `feltroom-room-v1-${i}`,
  isTableId: (x) => typeof x === 'string' && /^nlhe-[a-z0-9]{4}-[a-z0-9]{4}$/.test(x),
  /** Clean one answer from a slot into a known-safe shape (anyone could be squatting a slot). */
  clean(m) {
    if (!m || typeof m !== 'object' || m.t !== 'room' || !Rooms.isTableId(m.joinId)) return null;
    const str = (x, n) => (typeof x === 'string' ? x.slice(0, n) : '');
    const num = (x, lo, hi) => (typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi ? Math.floor(x) : null);
    return {
      name: U.cleanText(str(m.name, 40), 40) || 'Poker table', host: U.cleanText(str(m.host, 24), 24) || '?', variant: U.cleanText(str(m.variant, 40), 40),
      sb: num(m.sb, 0, 1e12), bb: num(m.bb, 0, 1e12), ante: num(m.ante, 0, 1e12) || 0, stack: num(m.stack, 0, 1e13),
      seated: num(m.seated, 0, 9) || 0, max: num(m.max, 2, 9) || 9, status: ['lobby', 'playing'].includes(m.status) ? m.status : 'playing',
      hand: num(m.hand, 0, 1e9) || 0, joinId: m.joinId, watchId: Rooms.isTableId(m.watchId) ? m.watchId : null, sra: m.sra === true,
    };
  },
  /** Ask every slot what's there. onTable is called as answers arrive; resolves when all have answered or timed out. */
  async scan(onTable, onProgress) {
    const peer = await Net.createPeer();
    const seen = new Set();
    let done = 0;
    const empty = new Map(); // slot ID -> finish, so the broker's "nobody there" ends that wait at once
    peer.on('error', (e) => {
      const m = /peer (\S+)$/.exec((e && e.message) || '');
      if (m && empty.has(m[1])) empty.get(m[1])();
    });
    await Promise.all(Array.from({ length: Rooms.SLOTS }, (_, i) => new Promise((resolve) => {
      let finished = false, to = null, c = null;
      const fin = () => { if (finished) return; finished = true; clearTimeout(to); try { c.close(); } catch { /* ignore */ } onProgress(++done, Rooms.SLOTS); resolve(); };
      empty.set(Rooms.slotId(i), fin);
      c = peer.connect(Rooms.slotId(i), { reliable: true, serialization: 'json' });
      to = setTimeout(fin, 7000);
      c.on('open', () => c.send({ t: 'roomq' }));
      c.on('data', (m) => { const r = Rooms.clean(m); if (r && !seen.has(r.joinId)) { seen.add(r.joinId); onTable(r); } fin(); });
      c.on('error', fin); c.on('close', fin);
    })));
    setTimeout(() => { try { peer.destroy(); } catch { /* ignore */ } }, 300);
  },
};

/** A hosted table's listing in the Waiting Room (only when the host chose to list it). */
class RoomAd {
  constructor(session) { this.s = session; this.peer = null; this.stopped = false; }
  async start() {
    const order = Array.from({ length: Rooms.SLOTS }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = U.randInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    for (const i of order) {
      if (this.stopped) return;
      try { this.peer = await Net.createPeer(Rooms.slotId(i)); break; }
      catch (e) { if (e && e.type !== 'unavailable-id') { this.s.handlers.error(`Couldn't list this table in the Waiting Room: ${Net.friendly(e).title}.`); return; } }
    }
    if (this.stopped) { this.stop(); return; }
    if (!this.peer) { this.s.handlers.error('The Waiting Room is full right now, so this table isn\'t listed. Invite links still work.'); return; }
    this.peer.on('connection', (c) => {
      let answered = false;
      c.on('data', (m) => {
        if (answered || !m || m.t !== 'roomq') return;
        answered = true;
        try { c.send(this.info()); } catch { /* ignore */ }
        setTimeout(() => { try { c.close(); } catch { /* ignore */ } }, 1500);
      });
      setTimeout(() => { try { c.close(); } catch { /* ignore */ } }, 10000);
    });
    this.peer.on('disconnected', () => { setTimeout(() => { try { if (!this.peer.destroyed && !this.stopped) this.peer.reconnect(); } catch { /* ignore */ } }, 1500); });
    this.listed = true;
    this.s.handlers.event('success', 'Your table is listed in the Waiting Room');
  }
  info() {
    const t = this.s.table;
    return {
      t: 'room', name: t.s.tableName, host: t.players.get(t.hostPid).name, variant: VARIANTS[t.variant].name,
      sb: t.blinds.sb, bb: t.blinds.bb, ante: t.blinds.ante, stack: t.s.startingStack,
      seated: t.seats.filter(Boolean).length, max: t.s.maxSeats, status: t.status, hand: t.handNo,
      joinId: this.s.id, watchId: t.s.spectators && this.s.watchers && this.s.watchers.peer ? this.s.watchers.peer.id : null, sra: t.sra,
    };
  }
  stop() { this.stopped = true; if (this.peer) { try { this.peer.destroy(); } catch { /* ignore */ } } }
}

/* ---------- Host side: wires a HostTable to PeerJS connections ---------- */
class HostSession {
  constructor(settings, name) {
    this.role = 'host';
    this.settings = settings;
    this.name = name;
    this.conns = new Map();
    this.record = '';
    this.handlers = { view: () => {}, event: () => {}, error: () => {}, ended: () => {}, rematch: () => {} };
  }
  on(ev, fn) { this.handlers[ev] = fn; return this; }

  async start() {
    if (!(globalThis.crypto && typeof crypto.getRandomValues === 'function')) throw { type: 'no-crypto' };
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { this.peer = await Net.createPeer(Net.newHostId()); break; }
      catch (e) { lastErr = e; if (e.type !== 'unavailable-id') throw e; }
    }
    if (!this.peer) throw lastErr;
    this.id = this.peer.id;
    const token = Prefs.get('hostToken.' + this.id) || U.randHex(16);
    const t = this.table = new HostTable(this.settings, this.name, token);
    this.watchers = new WatchHub(this);
    if (t.s.spectators) this.watchers.open();
    if (this.settings.listed) { this.ad = new RoomAd(this); this.ad.start(); }
    this.pid = t.hostPid;
    // Encrypted deal: the host's own seat is a player like any other, with its own keys in this tab.
    if (t.sra) this.sraLink = new SraLink(t.players.get(t.hostPid).name, this.id, (r) => t.handle(this.pid, r), (no, why) => this.handlers.error(`Encrypted deal problem on hand #${no}: ${why}`));
    t.onChange = () => this._scheduleBroadcast();
    t.onEvent = (kind, text, about) => {
      for (const [pid, c] of this.conns) if (pid !== about) this._send(c, { t: 'event', kind, text });
      if (this.watchers) this.watchers.event(kind, text);
      if (about !== this.pid) this.handlers.event(kind, text);
    };
    t.onRecord = (pid, text, full) => {
      if (pid === this.pid) {
        if (this.sraLink) { text = this.sraLink.patchRecord(text); full = this.sraLink.patchRecord(full); }
        this.record = text; this.recordFull = full; Prefs.set('record.' + this.id, text); Prefs.set('recordFull.' + this.id, full); }
      else { const c = this.conns.get(pid); if (c) this._send(c, { t: 'record', text, full }); }
    };
    t.onDirect = (pid, m) => {
      if (pid === this.pid) {
        if (m.t === 'error') this.handlers.error(m.text);
        else if (this.sraLink && SraLink.is(m)) this.sraLink.msg(m);
        return;
      }
      const c = this.conns.get(pid);
      if (!c) return;
      this._send(c, m);
      if (m.t === 'kicked') { this.conns.delete(pid); setTimeout(() => { try { c.close(); } catch { /* ignore */ } }, 400); }
    };
    t.onBroadcast = (m) => { for (const c of this.conns.values()) this._send(c, m); };
    this.peer.on('connection', (c) => this._attach(c));
    this.peer.on('disconnected', () => { setTimeout(() => { try { if (!this.peer.destroyed) this.peer.reconnect(); } catch { /* ignore */ } }, 1500); });
    this.peer.on('error', (e) => { if (e.type !== 'peer-unavailable') this.handlers.error(Net.friendly(e).title); });
    this.beat = setInterval(() => this._heartbeat(), 4000);
    this.unload = () => this.leave(true);
    addEventListener('pagehide', this.unload);
    this._scheduleBroadcast();
    return this;
  }

  get inviteUrl() { return `${location.origin}${location.pathname.replace(/index\.html$/, '')}${Net.local ? '?local' : ''}#join=${this.id}`; }
  get watchUrl() { return this.watchers ? this.watchers.url : ''; }

  _attach(c) {
    c.lastSeen = Date.now();
    c.on('data', (m) => { c.lastSeen = Date.now(); this._data(c, m); });
    c.on('close', () => this._closed(c));
    c.on('error', () => this._closed(c));
  }

  _data(c, m) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) return;
    // Flood protection: a token bucket per connection (bursts of 40, 15 messages/second sustained).
    const now = Date.now(), b = c.bucket || (c.bucket = { n: 40, t: now });
    b.n = Math.min(40, b.n + ((now - b.t) / 1000) * 15); b.t = now;
    if (b.n < 1) return;
    b.n -= 1;
    if (m.t === 'hello' && m.watch === true) { this._send(c, { t: 'reject', text: 'Use the viewer link to watch this table.' }); return; }
    if (m.t === 'part') {
      if (!c.pid) return; // only players who have said hello can send large messages
      const whole = Wire.unpack(c.parts || (c.parts = new Map()), m);
      if (whole && typeof whole === 'object' && !Array.isArray(whole) && whole.t !== 'part' && whole.t !== 'hello') this._data(c, whole);
      return;
    }
    const t = this.table;
    if (m.t === 'hello') {
      if (c.pid) return; // one identity per connection: a second hello can't spawn or swap players
      const r = t.addPlayer(String(m.name || '').slice(0, 64), typeof m.token === 'string' && /^[0-9a-f]{16,64}$/.test(m.token) ? m.token : null);
      if (r.error) { this._send(c, { t: 'reject', text: r.error }); setTimeout(() => { try { c.close(); } catch { /* ignore */ } }, 500); return; }
      const old = this.conns.get(r.pid);
      if (old && old !== c) { old.replaced = true; try { old.close(); } catch { /* ignore */ } }
      c.pid = r.pid;
      this.conns.set(r.pid, c);
      this._send(c, { t: 'welcome', pid: r.pid, token: r.player.token, name: r.player.name, hostId: this.id });
      this._send(c, { t: 'record', text: t.recordFor(r.pid, false), full: t.recordFor(r.pid, true) });
      if (r.reconnected) t.setConnected(r.pid, true);
      else t.onEvent('info', `${r.player.name} joined the table`, r.pid);
      t.changed();
      return;
    }
    if (m.t === 'ping') { this._send(c, { t: 'pong' }); return; }
    if (m.t === 'pong' || !c.pid || c.replaced) return;
    if (['start', 'pause', 'kick', 'adjust', 'end'].includes(m.t)) return; // host-only intents never come from the network
    if (m.t === 'rematch-ask' || m.t === 'rematch-ready') { this._rematchMsg(c, m); return; }
    t.handle(c.pid, m);
  }

  _closed(c) {
    if (c.replaced || !c.pid) return;
    if (this.conns.get(c.pid) === c) { this.conns.delete(c.pid); this.table.setConnected(c.pid, false); }
  }

  _heartbeat() {
    const now = Date.now();
    for (const [pid, c] of this.conns) {
      this._send(c, { t: 'ping' });
      if (now - c.lastSeen > 16000) { this.conns.delete(pid); try { c.close(); } catch { /* ignore */ } this.table.setConnected(pid, false); }
    }
    if (this.table.turn && this.table.turn.deadline) this._scheduleBroadcast(); // keeps countdowns in sync
  }

  _send(c, m) { try { if (c.open) for (const x of Wire.pack(m)) c.send(x); } catch { /* connection already gone */ } }

  _scheduleBroadcast() {
    if (this.bq) return;
    this.bq = true;
    queueMicrotask(() => {
      this.bq = false;
      const t = this.table;
      for (const [pid, c] of this.conns) this._send(c, t.viewFor(pid));
      if (this.watchers) this.watchers.broadcast();
      const v = t.viewFor(this.pid);
      if (this.sraLink) { this.sraLink.onView(v); this.sraLink.patchView(v); }
      this.lastView = v;
      this.handlers.view(v);
      if (t.status === 'ended' && !this.endedSent) {
        this.endedSent = true;
        for (const c of this.conns.values()) this._send(c, { t: 'ended', reason: 'The host ended the game.' });
        if (this.watchers) this.watchers.end('The host ended the game.');
        if (this.ad) this.ad.stop();
        this.handlers.ended('You ended the game.');
      }
    });
  }

  send(m) {
    if (m.t === 'show' && this.sraLink && this.table.hand) m = { ...m, keys: this.sraLink.showKeys(this.table.hand.no) };
    this.table.handle(this.pid, m);
  }

  /*
   * Rematch. Whoever asks first hosts the new table with this table's settings and everyone else
   * gets an invitation. A player asks the host for the settings ('rematch-ask' -> 'rematch-go'),
   * opens the new table, then reports its ID ('rematch-ready'); this host passes the ID on.
   */
  _rematchMsg(c, m) {
    const p = this.table.players.get(c.pid);
    if (!p) return;
    if (this.rematch) { this._send(c, { t: 'rematch', from: this.rematch.from, id: this.rematch.id }); return; }
    if (!Rematch.allowed(this.table)) { this._send(c, { t: 'error', text: 'A rematch can be offered once the game is over or someone is out of chips.' }); return; }
    if (m.t === 'rematch-ask') {
      if (this.rematchAsk && this.rematchAsk.pid !== c.pid && Date.now() - this.rematchAsk.at < 20000) { this._send(c, { t: 'error', text: 'Another player is setting up a rematch. Their invitation is on its way.' }); return; }
      this.rematchAsk = { pid: c.pid, at: Date.now() };
      this._send(c, { t: 'rematch-go', settings: this.settings });
      return;
    }
    if (!this.rematchAsk || this.rematchAsk.pid !== c.pid || typeof m.id !== 'string' || !REMATCH_ID.test(m.id)) return;
    this.offerRematch(p.name, m.id, c.pid);
  }
  /** Invite everyone at this table (except the player hosting it) to the rematch table. */
  offerRematch(from, id, exceptPid) {
    this.rematch = { from, id };
    for (const [pid, c] of this.conns) if (pid !== exceptPid) this._send(c, { t: 'rematch', from, id });
    if (exceptPid !== this.pid && this.handlers.rematch) this.handlers.rematch(from, id);
  }

  /** Host leaves: tell everyone (so they can still copy their records), then shut down. */
  leave(silent) {
    if (this.closed) return;
    this.closed = true;
    removeEventListener('pagehide', this.unload);
    clearInterval(this.beat);
    if (this.table && this.table.status !== 'ended') {
      this.table.status = 'ended';
      this.table._clearTurn(); clearTimeout(this.table.nextTimer); clearTimeout(this.table.dealTimer);
    }
    for (const c of this.conns.values()) this._send(c, { t: 'ended', reason: 'Host left, game ended.' });
    if (this.watchers) this.watchers.close('Host left, game ended.');
    if (this.ad) this.ad.stop();
    setTimeout(() => { try { this.peer.destroy(); } catch { /* ignore */ } }, silent ? 0 : 300);
  }
}

/* ---------- Client side ---------- */
/**
 * Everything a player's browser shows comes from the host. A modified host could send anything,
 * so each state update is rebuilt field by field into a known shape: numbers are numbers, cards are
 * real cards, strings are length-limited, lists are capped. Only this cleaned copy reaches the UI.
 */
const Safe = (() => {
  // Only genuine numbers count: null, booleans, strings and objects fall back to the default.
  const num = (x, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  const int = (x, lo, hi, d = null) => (typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi ? x : d);
  const str = (x, max = 80) => (typeof x === 'string' ? x.slice(0, max) : '');
  const bool = (x) => x === true;
  const card = (c) => (Cards.isCard(c) ? c : null);
  const cards = (a, max) => (Array.isArray(a) ? a.slice(0, max).map(card) : null);
  const oneOf = (x, list, d) => (list.includes(x) ? x : d);
  const ACTS = ['f', 'x', 'c', 'b', 'r', 'sb', 'bb'];
  function view(v) {
    if (!v || typeof v !== 'object') return null;
    const t = v.table || {};
    const table = {
      name: str(t.name, 40), sb: num(t.sb), bb: num(t.bb, 1), ante: num(t.ante), baseSb: num(t.baseSb), baseBb: num(t.baseBb),
      maxSeats: int(t.maxSeats, 2, 9, 9), timer: int(t.timer, 0, 600, 0), rebuys: bool(t.rebuys), maxRebuys: int(t.maxRebuys, 0, 99, 0),
      recordHole: oneOf(t.recordHole, ['All', 'Showdown'], 'Showdown'), startingStack: num(t.startingStack),
      variant: oneOf(t.variant, Object.keys(VARIANTS), 'NLHE'), holeCount: int(t.holeCount, 2, 5, 2), limit: oneOf(t.limit, ['nl', 'pl', 'fl'], 'nl'),
      levelHands: int(t.levelHands, 0, 1000, 0), level: int(t.level, 0, 1000, 1), hostPlays: bool(t.hostPlays),
      nextLevelIn: int(t.nextLevelIn, 0, 1000, 0), botTakeover: bool(t.botTakeover), vsBots: bool(t.vsBots), sra: bool(t.sra),
      spectators: bool(t.spectators), viewerChat: bool(t.viewerChat), botChat: bool(t.botChat), listed: bool(t.listed),
      hostAdjust: bool(t.hostAdjust), hostKick: bool(t.hostKick),
    };
    table.variantName = VARIANTS[table.variant].name;
    const seat = (s, i) => (s && typeof s === 'object' ? {
      seat: i, pid: str(s.pid, 24), name: str(s.name, 24), stack: num(s.stack), bet: num(s.bet), cards: cards(s.cards, 5),
      inHand: bool(s.inHand), folded: bool(s.folded), allIn: bool(s.allIn), sittingOut: bool(s.sittingOut), busted: bool(s.busted),
      disconnected: bool(s.disconnected), isHost: bool(s.isHost), isYou: bool(s.isYou), button: bool(s.button), sb: bool(s.sb), bb: bool(s.bb),
      toAct: bool(s.toAct), won: num(s.won), handName: str(s.handName, 60) || null, shown: bool(s.shown), mucked: bool(s.mucked),
      lastAction: oneOf(s.lastAction, ACTS, null), lastTo: num(s.lastTo), isBot: bool(s.isBot), botPlaying: bool(s.botPlaying), botLabel: str(s.botLabel, 20) || null,
    } : null);
    const L = v.legal && typeof v.legal === 'object' ? v.legal : null;
    const y = v.you && typeof v.you === 'object' ? v.you : null;
    return {
      t: 'state', table, shuffling: bool(v.shuffling), fair: v.fair, // fair proofs are validated by the Checker itself
      sraWait: Array.isArray(v.sraWait) ? v.sraWait.slice(0, 9).map((x) => str(x, 24)) : [], voided: bool(v.voided),
      status: oneOf(v.status, ['lobby', 'playing', 'ended'], 'lobby'), paused: bool(v.paused), waiting: bool(v.waiting),
      handNo: int(v.handNo, 0, 1e9, 0), phase: oneOf(v.phase, ['betting', 'deal', 'showdown', 'settle', 'done'], null),
      street: str(v.street, 20), board: (cards(v.board, 5) || []).filter(Boolean),
      pots: Array.isArray(v.pots) ? v.pots.slice(0, 10).map((p) => ({ label: str(p && p.label, 20), amount: num(p && p.amount) })) : [],
      potTotal: num(v.potTotal),
      seats: Array.isArray(v.seats) ? v.seats.slice(0, table.maxSeats).map(seat) : [],
      legal: L && {
        player: int(L.player, 0, 9, 0), canCheck: bool(L.canCheck), toCall: num(L.toCall), callTo: num(L.callTo), canRaise: bool(L.canRaise),
        minTo: num(L.minTo), maxTo: num(L.maxTo), isBet: bool(L.isBet), currentBet: num(L.currentBet), myBet: num(L.myBet), stack: num(L.stack),
        pot: num(L.pot), reopenBlocked: bool(L.reopenBlocked), capped: bool(L.capped), limit: oneOf(L.limit, ['nl', 'pl', 'fl'], 'nl'), betSize: num(L.betSize), capReached: bool(L.capReached),
      },
      timer: v.timer && typeof v.timer === 'object' ? { remaining: num(v.timer.remaining), total: num(v.timer.total), paused: bool(v.timer.paused) } : null,
      results: v.results && typeof v.results === 'object' ? {
        showdown: bool(v.results.showdown), winCards: (cards(v.results.winCards, 10) || []).filter(Boolean),
        lines: Array.isArray(v.results.lines) ? v.results.lines.slice(0, 12).map((l) => str(l, 160)) : [],
      } : null,
      you: y && {
        pid: str(y.pid, 24), name: str(y.name, 24), seat: int(y.seat, 0, 8, null), isHost: bool(y.isHost), inHand: bool(y.inHand), dealt: bool(y.dealt),
        sittingOut: bool(y.sittingOut), busted: bool(y.busted), stack: num(y.stack), autoMuck: bool(y.autoMuck), canShow: bool(y.canShow),
        canRebuy: bool(y.canRebuy), toCallPreview: num(y.toCallPreview),
      },
      hostName: str(v.hostName, 24),
      players: Array.isArray(v.players) ? v.players.slice(0, 30).map((p) => ({
        pid: str(p && p.pid, 24).replace(/[^\w-]/g, ''), name: str(p && p.name, 24), seat: int(p && p.seat, 0, 8, null), stack: num(p && p.stack),
        connected: bool(p && p.connected), sittingOut: bool(p && p.sittingOut), busted: bool(p && p.busted), isHost: bool(p && p.isHost),
        isBot: bool(p && p.isBot), rebuys: int(p && p.rebuys, 0, 1e6, 0), net: num(p && p.net),
      })) : [],
      log: Array.isArray(v.log) ? v.log.slice(-150).map((l) => ({ id: num(l && l.id), text: str(l && l.text, 300), kind: oneOf(l && l.kind, ['hand', 'win', ''], '') })) : [],
      chat: Array.isArray(v.chat) ? v.chat.slice(-80).map((c) => ({ id: num(c && c.id), from: str(c && c.from, 30), text: str(c && c.text, 300), ts: num(c && c.ts), viewer: bool(c && c.viewer), bot: bool(c && c.bot) })) : [],
      watching: bool(v.watching), watchId: typeof v.watchId === 'string' && /^[a-z0-9-]{4,40}$/.test(v.watchId) ? v.watchId : null,
    };
  }
  /** Rematch: table settings sent by another player's browser, rebuilt into a known shape. */
  function settings(x) {
    if (!x || typeof x !== 'object') return null;
    const sb = int(x.sb, 1, 1e9, null), bb = int(x.bb, 1, 1e9, null), st = int(x.startingStack, 2, 1e12, null);
    if (sb == null || bb == null || bb < sb || st == null || st < bb * 2) return null;
    return {
      tableName: str(x.tableName, 40).replace(/["\[\]\\]/g, '').trim() || 'Rematch', sb, bb, ante: int(x.ante, 0, bb, 0), startingStack: st,
      maxSeats: int(x.maxSeats, 2, 9, 9), timer: int(x.timer, 0, 600, 0), rebuys: bool(x.rebuys), maxRebuys: int(x.maxRebuys, 0, 99, 0),
      recordHole: oneOf(x.recordHole, ['All', 'Showdown'], 'Showdown'), game: oneOf(x.game, ['holdem', 'omaha4', 'omaha5'], 'holdem'),
      limit: oneOf(x.limit, ['nl', 'pl', 'fl'], 'nl'), levelHands: int(x.levelHands, 0, 1000, 0), hostPlays: true,
      botTakeover: bool(x.botTakeover) && !bool(x.sra), sra: bool(x.sra), spectators: bool(x.spectators), viewerChat: bool(x.spectators) && bool(x.viewerChat),
      listed: false, hostAdjust: bool(x.hostAdjust), hostKick: bool(x.hostKick),
    };
  }
  return { view, settings };
})();

/** Peer IDs that a rematch invitation may point to. */
const REMATCH_ID = /^nlhe-[a-z2-9]{4}-[a-z2-9]{4}$/;
/** A rematch can be offered once at least one hand is done and the game is over or someone is out of chips. */
const Rematch = {
  allowed(t) {
    if (!t.finished.length) return false;
    return t.status === 'ended' || [...t.players.values()].some((p) => p.busted);
  },
  allowedView(v) {
    if (!v || !v.handNo || v.status === 'lobby') return false;
    return v.status === 'ended' || v.players.some((p) => p.busted) || !!(v.you && v.you.busted);
  },
};


class ClientSession {
  constructor(hostId, name, opts = {}) {
    this.role = opts.watch ? 'watcher' : 'client';
    this.watch = !!opts.watch;
    this.fresh = !!opts.fresh;
    this.id = hostId;
    this.name = name;
    this.record = Prefs.get('record.' + hostId, '');
    this.recordFull = Prefs.get('recordFull.' + hostId, this.record);
    this.handlers = { view: () => {}, event: () => {}, error: () => {}, ended: () => {}, status: () => {}, fair: () => {}, rematch: () => {} };
    this.ended = false;
    this.fair = new Fair.Checker((f, msg) => this.handlers.fair(f, msg));
  }
  on(ev, fn) { this.handlers[ev] = fn; return this; }
  get inviteUrl() { return `${location.origin}${location.pathname.replace(/index\.html$/, '')}${Net.local ? '?local' : ''}#join=${this.id}`; }
  /** Players get the viewer link's ID in their view; a viewer re-shares the link they came in on. */
  get watchUrl() { return this.watch ? Net.watchUrl(this.id) : (this.lastView && this.lastView.watchId ? Net.watchUrl(this.lastView.watchId) : ''); }

  async connect() {
    if (!this.peer || this.peer.destroyed) this.peer = await Net.createPeer();
    this.peer.on('disconnected', () => { setTimeout(() => { try { if (!this.peer.destroyed) this.peer.reconnect(); } catch { /* ignore */ } }, 1000); });
    await this._open();
    // Closing or refreshing the tab tells the host straight away (instead of after the heartbeat timeout).
    this.unload = () => { try { if (this.conn) this.conn.close(); } catch { /* ignore */ } };
    addEventListener('pagehide', this.unload);
    this.dog = setInterval(() => {
      if (this.ended || !this.conn) return;
      if (Date.now() - this.lastMsg > 15000) { try { this.conn.close(); } catch { /* ignore */ } this._lost(); }
      else this.send({ t: 'ping' });
    }, 4000);
    return this;
  }

  _open() {
    return new Promise((resolve, reject) => {
      let done = false;
      const fin = (err) => { if (done) return; done = true; clearTimeout(to); this.peer.off && this.peer.off('error', onErr); err ? reject(err) : resolve(); };
      const onErr = (e) => { if (e && (e.type === 'peer-unavailable' || e.type === 'network' || e.type === 'webrtc' || e.type === 'server-error' || e.type === 'socket-error')) fin(e); };
      this.peer.on('error', onErr);
      const c = this.peer.connect(this.id, { reliable: true, serialization: 'json' });
      const to = setTimeout(() => { try { c.close(); } catch { /* ignore */ } fin({ type: 'connect-timeout' }); }, 15000);
      c.on('open', () => {
        this.lastMsg = Date.now();
        c.send(this.watch ? { t: 'hello', watch: true, name: this.name } : { t: 'hello', name: this.name, token: this.fresh ? null : this._token() });
      });
      c.on('data', (m) => {
        this.lastMsg = Date.now();
        if (!m || typeof m !== 'object') return;
        if (m.t === 'part') { m = Wire.unpack(this.parts || (this.parts = new Map()), m); if (!m || typeof m !== 'object' || m.t === 'part') return; }
        if (m.t === 'welcome' && this.watch) {
          if (m.watch !== true) { fin({ type: 'rejected', message: 'That link is not a viewer link.' }); return; }
          this.conn = c; this.name = String(m.name || 'Viewer').slice(0, 18);
          this.handlers.status('connected');
          fin();
          return;
        }
        if (m.t === 'welcome') {
          this.conn = c; this.pid = m.pid; this.name = m.name;
          this.fresh = false;
          Prefs.set('token.' + this.id, m.token); Prefs.set('tokenName.' + this.id, m.name);
          try { sessionStorage.setItem('feltroom.active', this.id); sessionStorage.setItem('feltroom.token.' + this.id, m.token); } catch { /* ignore */ }
          this.handlers.status('connected');
          fin();
          return;
        }
        if (m.t === 'reject') { this.ended = true; fin({ type: 'rejected', message: m.text }); return; }
        this._msg(m);
      });
      c.on('close', () => { if (this.conn === c) this._lost(); else fin({ type: 'connect-timeout' }); });
      c.on('error', () => { if (this.conn === c) this._lost(); });
    });
  }

  _msg(m) {
    switch (m.t) {
      case 'state':
        m = Safe.view(m);
        if (!m) break;
        if (m.table.sra && !this.sraLink && !this.watch) this._sra();
        if (this.sraLink) { this.sraLink.onView(m); this.sraLink.patchView(m); }
        this.lastView = m;
        try { this.fair.view(m, this.name); } catch (e) { console.warn(e); }
        // The record for a hand can arrive just before the view that proves its last board card.
        if (this.pendingAudit) { const t = this.pendingAudit; this.pendingAudit = null; this._audit(t); }
        this.handlers.view(m);
        break;
      case 'event': this.handlers.event(m.kind, m.text); break;
      case 'record':
        if (this.watch) break;
        this.record = m.text; this.recordFull = m.full || m.text;
        if (this.sraLink) { this.record = this.sraLink.patchRecord(this.record); this.recordFull = this.sraLink.patchRecord(this.recordFull); }
        Prefs.set('record.' + this.id, this.record); Prefs.set('recordFull.' + this.id, this.recordFull);
        this.pendingAudit = this.recordFull;
        break;
      // Shuffle proofs: answer with our own committed randomness, then verify every card we see.
      case 'fair1': { const r = this.fair.fair1(m); if (r) this.send(r); break; }
      case 'fair2': { const r = this.fair.fair2(m); if (r) this.send(r); break; }
      case 'fair3': this.fair.fair3(m); break;
      case 'fairown': this.fair.own(m, this.name); break;
      case 'error': this._rematchDone(null); this.handlers.error(m.text); break;
      case 'ping': this.send({ t: 'pong' }); break;
      case 'kicked': this._end('You were removed from the table by the host.'); break;
      // The connection stays open after the game ends, so a rematch invitation can still arrive.
      case 'ended': this._end(m.reason || 'Host left, game ended.', true); break;
      case 'rematch':
        if (this.watch || typeof m.id !== 'string' || !REMATCH_ID.test(m.id) || m.id === this.id) break;
        this._rematchDone(null);
        this.rematch = { from: String(m.from || 'A player').slice(0, 24), id: m.id };
        this.handlers.rematch(this.rematch.from, m.id);
        break;
      case 'rematch-go': if (!this.watch) this._rematchDone(Safe.settings(m.settings)); break;
      // Encrypted deal steps go to our own SraPlayer.
      default: if (SraLink.is(m) && !this.watch) { if (!this.sraLink) this._sra(); this.sraLink.msg(m); } break;
    }
  }

  /** This tab's own seat first (two tabs of one browser can be two different players), else the browser's. */
  _token() {
    try { const t = sessionStorage.getItem('feltroom.token.' + this.id); if (t) return t; } catch { /* ignore */ }
    return Prefs.get('token.' + this.id, null);
  }
  _sra() {
    this.sraLink = new SraLink(this.name, this.id, (r) => this.send(r), (no, why) => {
      const f = this.fair._h(no);
      this.fair._fail(f, why);
    });
  }

  /** Re-simulate the newest hand of the host's record and check it against what we saw ourselves. */
  _audit(text) {
    try {
      const g = Notation.parse(text);
      const r = g.hands[g.hands.length - 1];
      if (!r || this.audited === r.no) return;
      this.audited = r.no;
      const rp = Replay.game({ tags: g.tags, hands: [r] });
      const issues = rp.issues.slice();
      const f = this.fair.hands[r.no];
      if (f && f.own && r.hole[this.name] && r.hole[this.name].join() !== f.own.join()) issues.push('the record shows different hole cards from the ones you were dealt');
      if (f && f.layout) r.streets.slice(1).flatMap((st) => st.board).forEach((c, i) => {
        if (!f.checked.has(f.layout.board[i] + ':' + c)) issues.push(`board card ${Cards.pretty(c)} in the record was never proven`);
      });
      this.fair.audit(r.no, issues);
    } catch (e) { this.fair.audit(-1, [`the host sent a record that does not parse (${e.message})`]); }
  }

  async _lost() {
    if (this.ended || this.reconnecting) return;
    this.reconnecting = true;
    this.conn = null;
    this.handlers.status('reconnecting');
    for (let i = 0; i < 6 && !this.ended; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      try { await this._open(); this.reconnecting = false; return; } catch (e) { if (e && e.type === 'rejected') break; }
    }
    this.reconnecting = false;
    this._end('Host left, game ended.');
  }

  _end(reason, keepOpen) {
    if (this.ended) return;
    this.ended = true;
    clearInterval(this.dog);
    this.handlers.ended(reason);
    if (!keepOpen) setTimeout(() => { try { this.peer.destroy(); } catch { /* ignore */ } }, 500);
  }

  /** Ask the host for this table's settings so this player can host the rematch. Resolves null if the host doesn't answer. */
  askRematch() {
    return new Promise((resolve) => {
      const to = setTimeout(() => { if (this.rematchWait) { this.rematchWait = null; resolve(null); } }, 8000);
      this.rematchWait = (s) => { clearTimeout(to); resolve(s); };
      this.send({ t: 'rematch-ask' });
    });
  }
  _rematchDone(s) { const w = this.rematchWait; this.rematchWait = null; if (w) w(s); }

  send(m) {
    if (m.t === 'show' && this.sraLink && this.lastView) m = { ...m, keys: this.sraLink.showKeys(this.lastView.handNo) };
    try { if (this.conn && this.conn.open) for (const x of Wire.pack(m)) this.conn.send(x); } catch { /* ignore */ }
  }
  leave() {
    try { sessionStorage.removeItem('feltroom.active'); } catch { /* ignore */ }
    this.ended = true; this.closed = true; clearInterval(this.dog); if (this.unload) removeEventListener('pagehide', this.unload); try { this.conn && this.conn.close(); this.peer.destroy(); } catch { /* ignore */ } }
}

/* ---------- Play vs Bots: the same HostTable, fully offline ---------- */
class BotSession {
  constructor(settings, name, bots) {
    this.role = 'host';
    this.offline = true;
    this.id = 'offline';
    this.settings = settings; this.name = name; this.bots = bots;
    this.record = ''; this.recordFull = '';
    this.handlers = { view: () => {}, event: () => {}, error: () => {}, ended: () => {} };
  }
  on(ev, fn) { this.handlers[ev] = fn; return this; }
  get inviteUrl() { return ''; }
  /** Viewer link for a bot game: only once the table has opened its connection to the broker. */
  get watchUrl() { return this.watchers ? this.watchers.url : ''; }
  start() {
    const t = this.table = new HostTable({ ...this.settings, vsBots: true, hostPlays: true }, this.name, U.randHex(16));
    this.watchers = new WatchHub(this);
    if (t.s.spectators) this.watchers.open(); // the game stays on this device; the broker is only for viewers
    this.pid = t.hostPid;
    for (const b of this.bots) t.addBot(b);
    t.onChange = () => {
      if (this.bq) return;
      this.bq = true;
      queueMicrotask(() => {
        this.bq = false;
        this.handlers.view(t.viewFor(this.pid));
        this.watchers.broadcast();
        if (t.status === 'ended' && !this.endedSent) { this.endedSent = true; this.watchers.end('The game is over.'); this.handlers.ended('Game over.'); }
      });
    };
    t.onEvent = (kind, text) => { this.handlers.event(kind, text); this.watchers.event(kind, text); };
    t.onRecord = (pid, text, full) => { if (pid === this.pid) { this.record = full; this.recordFull = full; Prefs.set('record.offline', full); } };
    t.onDirect = (pid, m) => { if (pid === this.pid && m.t === 'error') this.handlers.error(m.text); };
    t.handle(this.pid, { t: 'start' });
    return this;
  }
  send(m) { this.table.handle(this.pid, m); }
  _send(c, m) { try { if (c.open) for (const x of Wire.pack(m)) c.send(x); } catch { /* connection already gone */ } }
  leave() {
    if (this.closed) return;
    this.closed = true;
    if (this.watchers) this.watchers.close('The game is over.');
    const t = this.table;
    if (t && t.status !== 'ended') { t.status = 'ended'; t._clearTurn(); clearTimeout(t.nextTimer); clearTimeout(t.dealTimer); clearTimeout(t.botTimer); }
  }
}
