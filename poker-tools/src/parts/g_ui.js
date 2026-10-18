
/* =====================================================================
   7. UI CORE  (theme, sound, toasts, modals, cards, chips, table renderer)
   ===================================================================== */
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  sound: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.2-.7-2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
  more: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m7 4 13 8-13 8z"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  fwd: '<path d="m9 18 6-6-6-6"/>',
  first: '<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>',
  last: '<path d="m13 17 5-5-5-5M6 17l5-5-5-5"/>',
  skipBack: '<path d="M19 20 9 12l10-8z"/><path d="M5 19V5"/>',
  skipFwd: '<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  wifi: '<path d="M5 12.6a10 10 0 0 1 14 0M8.5 16.1a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 20 0M12 20h.01"/>',
  table: '<ellipse cx="12" cy="12" rx="10" ry="6"/><ellipse cx="12" cy="12" rx="6" ry="3"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6"/><circle cx="12" cy="3" r="1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5a2.5 2.5 0 0 0 0 5H20"/><path d="M8 7h8M8 11h6"/>',
  calc: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>',
  shieldOk: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  shieldBad: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>',
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "Mobile or computer?" — chosen on the first visit and remembered. Mobile gets the phone oval (rows as a fallback). */
const Device = {
  get() { try { const v = localStorage.getItem('feltroom.device'); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(kind) { try { localStorage.setItem('feltroom.device', JSON.stringify(kind)); } catch { /* private mode */ } Device.apply(); },
  get mobile() { return document.body.classList.contains('mobile'); },
  apply() { document.body.classList.toggle('mobile', Device.get() === 'mobile'); },
  /** What this device probably is, to suggest the right button. */
  guess() { return matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600 ? 'mobile' : 'computer'; },
};

/* ---------- Theme & display prefs ---------- */
const Theme = {
  /** Appearance choices: [value, label, swatch colour]. The first of each list is the default. */
  FELTS: [['green', 'Green', '#138069'], ['blue', 'Blue', '#1f6fa8'], ['red', 'Red', '#a83a3a'], ['purple', 'Purple', '#6b4aa8'], ['charcoal', 'Charcoal', '#3a4048'], ['brown', 'Brown', '#8a6237']],
  BACKS: [['blue', 'Blue', '#1d6f8c'], ['red', 'Red', '#b5323a'], ['green', 'Green', '#1e7a4f'], ['purple', 'Purple', '#6a3fb0'], ['black', 'Black', '#2b2f36'], ['gold', 'Gold', '#b58a1e']],
  RAILS: [['wood', 'Dark wood', '#3a2a1f'], ['light', 'Light wood', '#8a6a48'], ['black', 'Black', '#24272c']],
  pick(key, list) { const v = Prefs.get(key, list[0][0]); return list.some((x) => x[0] === v) ? v : list[0][0]; },
  apply() {
    const d = document.documentElement.dataset;
    d.theme = Prefs.get('theme', 'dark');
    d.felt = Theme.pick('felt', Theme.FELTS); d.back = Theme.pick('cardBack', Theme.BACKS); d.rail = Theme.pick('rail', Theme.RAILS);
    document.body.classList.toggle('two-color', !Prefs.get('fourColor', true));
    document.body.classList.toggle('big-print', Prefs.get('bigPrint', false) === true);
  },
  toggle() { Prefs.set('theme', Prefs.get('theme', 'dark') === 'dark' ? 'light' : 'dark'); Theme.apply(); },
  icon() { return Prefs.get('theme', 'dark') === 'dark' ? icon('sun') : icon('moon'); },
};

/* ---------- Web Audio sound effects (generated, no files) ---------- */
const Sound = {
  ctx: null,
  get muted() { return Prefs.get('muted', false); },
  toggle() { Prefs.set('muted', !this.muted); if (!this.muted) this.play('chip'); },
  unlock() { this._ctx(); },
  _ctx() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  },
  _tone(c, { f = 440, f2, type = 'sine', t = 0, dur = 0.15, vol = 0.1 }) {
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t;
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  _noise(c, { t = 0, dur = 0.06, vol = 0.12, freq = 3000, q = 1, type = 'bandpass' }) {
    const len = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + t;
    s.buffer = b; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(t0);
  },
  play(name, delay = 0) {
    if (this.muted) return;
    const c = this._ctx();
    if (!c || c.state !== 'running') return;
    const t = delay;
    switch (name) {
      case 'deal': this._noise(c, { t, dur: 0.07, vol: 0.22, freq: 2600, q: 0.8 }); break;
      case 'chip': this._tone(c, { f: 2300, type: 'triangle', t, dur: 0.05, vol: 0.06 }); this._tone(c, { f: 3100, type: 'triangle', t: t + 0.045, dur: 0.05, vol: 0.05 }); break;
      case 'knock': this._tone(c, { f: 150, f2: 80, t, dur: 0.12, vol: 0.4 }); this._noise(c, { t, dur: 0.04, vol: 0.12, freq: 900, type: 'lowpass' }); break;
      case 'chime': this._tone(c, { f: 660, t, dur: 0.28, vol: 0.09 }); this._tone(c, { f: 990, t: t + 0.14, dur: 0.38, vol: 0.08 }); break;
      case 'chat': this._tone(c, { f: 1175, t, dur: 0.12, vol: 0.05 }); this._tone(c, { f: 1568, t: t + 0.08, dur: 0.16, vol: 0.04 }); break;
      case 'win': [523, 659, 784].forEach((f, i) => this._tone(c, { f, type: 'triangle', t: t + i * 0.09, dur: 0.3, vol: 0.07 })); break;
      case 'fold': this._noise(c, { t, dur: 0.09, vol: 0.06, freq: 1200, q: 0.5 }); break;
    }
  },
};
addEventListener('pointerdown', () => Sound.unlock(), { once: false, passive: true });
addEventListener('keydown', () => Sound.unlock(), { passive: true });

/* ---------- Toasts, screen-reader announcements, title flash ---------- */
function toast(text, kind = 'info', ms = 3600) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  box.appendChild(el);
  while (box.children.length > (matchMedia('(max-width: 720px)').matches ? 2 : 3)) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
}
function announce(text) { const el = $('#sr'); el.textContent = ''; setTimeout(() => { el.textContent = text; }, 30); }
const TitleFlash = {
  base: document.title, timer: null,
  start(msg) {
    if (!document.hidden || this.timer) return;
    let k = 0;
    this.timer = setInterval(() => { document.title = k++ % 2 ? this.base : msg; }, 900);
  },
  stop() { clearInterval(this.timer); this.timer = null; document.title = this.base; },
};
document.addEventListener('visibilitychange', () => { if (!document.hidden) TitleFlash.stop(); });

/**
 * Copy text. Uses the clipboard API, and falls back to a hidden text box placed inside any open dialog
 * (dialogs keep keyboard focus to themselves, which made the old fallback silently fail). Only says
 * "copied" when it really was; otherwise shows the text selected so it can be copied by hand.
 */
async function copyText(text, label = 'Copied to clipboard') {
  let ok = false;
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch { /* try the fallback */ }
  if (!ok) {
    const host = document.querySelector('.modal') || document.body;
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    host.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  if (ok) { toast(label, 'success', 2200); return true; }
  const m = openModal(`<h2>Copy this</h2><p class="muted" style="margin-top:0">Your browser blocked automatic copying. The text is selected below: press Ctrl+C (or ⌘C, or long-press and Copy).</p>
    <textarea class="input" rows="3" readonly style="width:100%">${U.esc(text)}</textarea><div class="modal-foot"><button class="btn primary" data-close>Done</button></div>`, { label: 'Copy' });
  const t = m.el.querySelector('textarea'); t.focus(); t.select();
  return false;
}
/**
 * Compact copies of records, made in the background as the record grows, so the Copy button can put
 * the compact text on the clipboard instantly (some browsers only allow copying during the click).
 */
const CompactCache = {
  map: new Map(),
  peek(text) { return this.map.get(text) || null; },
  make(text) {
    if (!text || !Compact.available()) return Promise.resolve(text);
    const hit = this.map.get(text);
    if (hit) return Promise.resolve(hit);
    return Compact.encode(text).then((c) => { this.map.set(text, c); while (this.map.size > 6) this.map.delete(this.map.keys().next().value); return c; }, () => text);
  },
  prime(text) { if (text && /#\d+/.test(text) && !this.map.has(text)) this.make(text); },
};
/** Copy a record in its compact form (falls back to the readable text if this browser can't compress). */
async function copyRecordText(text, label) {
  const ready = CompactCache.peek(text);
  if (ready) return copyText(ready, `${label} (compact: ${U.fmt(ready.length)} characters)`);
  try {
    // Safari: hand the clipboard a promise while still inside the click.
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      const p = CompactCache.make(text);
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': p.then((c) => new Blob([c], { type: 'text/plain' })) })]);
      const c = await p;
      return toast(`${label} (compact: ${U.fmt(c.length)} characters)`, 'success', 2600);
    }
  } catch { /* fall through */ }
  return copyText(await CompactCache.make(text), label);
}
function downloadText(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- Modal ---------- */
function openModal(html, { onClose, label = 'Dialog', dismissable = true } = {}) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${U.esc(label)}">${html}</div>`;
  document.body.appendChild(back);
  const prevFocus = document.activeElement;
  const close = () => { back.remove(); removeEventListener('keydown', onKey, true); if (prevFocus && prevFocus.focus) prevFocus.focus(); onClose && onClose(); };
  const onKey = (e) => {
    if (e.key === 'Escape' && dismissable) { e.stopPropagation(); close(); }
    if (e.key === 'Tab') { // keep focus inside
      const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', back).filter((x) => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  addEventListener('keydown', onKey, true);
  if (dismissable) back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  back.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  setTimeout(() => { const f = $('[autofocus], .modal-foot .btn.primary, .modal-foot .btn', back); if (f) f.focus(); }, 30);
  return { el: back, close };
}

function helpOverlay(mode) {
  const rows = mode === 'viewer'
    ? [['← / →', 'Step back / forward one action'], ['Shift + ← / →', 'Previous / next street'], ['↑ / ↓', 'Previous / next hand'], ['Space', 'Autoplay on / off'], ['Home / End', 'Start / end of hand'], ['?', 'This help']]
    : [['F', 'Fold'], ['C', 'Check or call'], ['R', 'Raise / bet (focuses the amount)'], ['↑ / →', 'Increase bet by one big blind'], ['↓ / ←', 'Decrease bet by one big blind'], ['Enter', 'Confirm the bet'], ['M', 'Mute / unmute'], ['?', 'This help'], ['Esc', 'Close dialogs']];
  openModal(`<h2>Keyboard shortcuts</h2><div class="kbd-grid">${rows.map(([k, d]) => `<div>${k.split(' / ').map((x) => `<kbd>${x}</kbd>`).join(' / ')}</div><div>${d}</div>`).join('')}</div>
    <p class="hint" style="margin-top:14px">Four-color deck: ♠ black · <span style="color:var(--suit-h)">♥ red</span> · <span style="color:var(--suit-d)">♦ blue</span> · <span style="color:var(--suit-c)">♣ green</span>. Toggle it from the ⋯ menu.</p>
    <div class="modal-foot"><button class="btn primary" data-close>Got it</button></div>`, { label: 'Keyboard shortcuts' });
}

/* ---------- Cards, chips, avatars ---------- */
const SUIT_NAME = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
function cardHtml(c, cls = '', style = '') {
  if (!Cards.isCard(c)) c = null; // never put anything but a real card into the page
  if (!c) return `<div class="card back ${cls}" style="${style}" role="img" aria-label="Face-down card"></div>`;
  const r = c[0] === 'T' ? '10' : c[0], s = c[1];
  return `<div class="card s-${s} ${cls}" style="${style}" data-card="${c}" role="img" aria-label="${RANK_WORD[Cards.rank(c)]} of ${SUIT_NAME[s]}"><span class="cr">${r}</span><span class="cs">${SUIT_SYM[s]}</span><span class="cb">${SUIT_SYM[s]}</span></div>`;
}
const DENOMS = [5000, 1000, 500, 100, 25, 5, 1];
function chipsHtml(amount, max = 6) {
  const out = [];
  let a = amount;
  for (const d of DENOMS) while (a >= d && out.length < max) { out.push(d); a -= d; }
  return `<div class="chips" aria-hidden="true">${out.map((d) => `<div class="chip d${d}"></div>`).join('')}</div>`;
}
function hueOf(name) { let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h * 47) % 360; }
function initials(name) {
  const w = String(name).trim().split(/\s+/);
  return (w.length > 1 ? w[0][0] + w[1][0] : String(name).slice(0, 2)).toUpperCase();
}
function avatarHtml(name, extra = '', style = '') {
  return `<div class="avatar" style="--h:${hueOf(name)};${style}" aria-hidden="true">${U.esc(initials(name))}${extra}</div>`;
}
const ACTION_WORD = { f: 'Fold', x: 'Check', c: 'Call', b: 'Bet', r: 'Raise' };

/* ---------- Table renderer (shared by the live game and the replay viewer) ----------
   view = { maxSeats, mySeat, handKey, seats:[seat|null], board, pots:[{label,amount}], street,
            results:{winCards, lines}|null, timer:{remaining,total,paused}|null, canSit, readOnly, feltText } */
class TableView {
  constructor(stage, opts = {}) {
    this.stage = stage; this.opts = opts;
    this.el = document.createElement('div');
    this.el.className = 'table';
    this.el.innerHTML = '<div class="layer"></div><div class="fx"></div>';
    this.layer = this.el.firstChild; this.fx = this.el.lastChild;
    stage.appendChild(this.el);
    this.view = null;
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(stage);
    this.watched = new Set(); this.rowsFor = new Set(); this.mk = 1;
    stage.tableView = this; // lets the layout tests inspect the table
    this.el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-seat]');
      if (b && opts.onSit) opts.onSit(Number(b.dataset.seat));
    });
    this.tick = this.tick.bind(this);
  }
  destroy() { this.ro.disconnect(); cancelAnimationFrame(this.raf); }

  /**
   * Mobile: players sit around a phone-shaped oval table. After every redraw the table measures
   * itself; if any two pieces would touch (or spill off the screen) everything shrinks a little, and
   * if even the smallest size cannot fit (say nine players at showdown on a tiny screen), this screen
   * size switches to the stacked rows, which can never overlap. A computer always keeps the big oval.
   */
  get stacked() { return Device.mobile && this.rowsFor.has(this._mkey()); }
  get mobileOval() { return Device.mobile && !this.stacked; }
  _mkey(v = this.view) {
    const cards = v ? Math.max(2, ...v.seats.map((st) => (st && st.cards ? st.cards.length : 2))) : 2;
    // per screen, not per momentary stage height (the action bar changes height between turns)
    return `${innerWidth}x${innerHeight}:${v ? v.maxSeats : 0}:${cards}`;
  }

  layout() {
    if (Device.mobile) return this.stacked ? this._layoutMobile() : this._layoutMobileOval();
    this.el.classList.remove('mtable', 'moval');
    const W = this.stage.clientWidth - 12, H = this.stage.clientHeight - 12;
    if (W < 50 || H < 50) return;
    const portrait = W / H < 0.95;
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    let s, tw, th;
    if (!portrait) {
      s = 1;
      for (let i = 0; i < 4; i++) { tw = Math.min(W - 170 * s, (H - 200 * s) * 2.05); s = cl(tw / 640, 0.55, 1.2); }
      th = tw / 2.05;
    } else {
      s = 1;
      for (let i = 0; i < 4; i++) { tw = Math.min(W - 130 * s, (H - 230 * s) * 0.64); s = cl(Math.min(W / 430, tw / 330), 0.55, 1); }
      th = tw / 0.64;
    }
    tw = Math.max(tw, 160); th = Math.max(th, 120);
    const key = `${Math.round(tw)}x${Math.round(th)}x${s.toFixed(3)}`;
    if (key === this.lkey) return;
    this.lkey = key; this.portrait = portrait;
    this.baseS = s; this.fitK = 1;
    this.el.style.width = tw + 'px'; this.el.style.height = th + 'px';
    this.el.style.setProperty('--s', s.toFixed(3));
    this.w = tw; this.h = th;
    if (this.view) this.render(this.view, { animate: false });
  }

  /** Mobile: no oval. Rows that flow (opponents, board, you), so nothing can ever sit on top of anything else. */
  _layoutMobile() {
    const key = 'm' + this.stage.clientWidth + 'x' + this.stage.clientHeight;
    this.el.classList.remove('moval');
    this.el.classList.add('mtable');
    this.el.style.width = ''; this.el.style.height = '';
    this.el.style.setProperty('--s', '1');
    this.w = this.stage.clientWidth; this.h = this.stage.clientHeight;
    if (key === this.lkey) return;
    this.lkey = key;
    if (this.view) this.render(this.view, { animate: false });
  }

  /** Mobile oval: the table takes whatever height the stage has left after the banner and chat strip. */
  /** The space the phone table may use: the stage minus its padding, the banner and the chat strip. */
  _mobileAvail() {
    // In the game the browser sizes the table itself (it fills what the stage has left), so it follows
    // the action bar in the same frame; the viewer's stage grows with its content, so it gets a height.
    if (!this.opts.mobileHeight && this.el.classList.contains('moval')) return { W: this.el.clientWidth, H: this.el.clientHeight };
    const cs = getComputedStyle(this.stage), gap = parseFloat(cs.rowGap) || 0;
    let H = this.stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    for (const c of this.stage.children) if (c !== this.el && c.offsetParent !== null && getComputedStyle(c).position !== 'absolute') H -= c.offsetHeight + gap;
    const W = this.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (this.opts.mobileHeight) H = this.opts.mobileHeight(W); // a stage that grows with its content (the viewer)
    return { W, H: Math.floor(H) };
  }
  _layoutMobileOval() {
    this.el.classList.remove('mtable');
    this.el.classList.add('moval');
    for (const c of [...this.stage.children, this.el]) if (!this.watched.has(c)) { this.watched.add(c); this.ro.observe(c); }
    if (this.opts.mobileHeight) this.el.classList.add('fixed-h'); else { this.el.style.width = ''; this.el.style.height = ''; }
    const { W, H } = this._mobileAvail();
    if (H < 240 || W < 250) { this.rowsFor.add(this._mkey()); this.lkey = null; return this._layoutMobile(); }
    const key = `o${W}x${H}`;
    if (this.opts.mobileHeight) { this.el.style.width = W + 'px'; this.el.style.height = H + 'px'; }
    this.el.style.setProperty('--s', '1');
    this.w = W; this.h = H;
    if (key === this.lkey) return;
    this.lkey = key; this.mk = 1;
    if (this.view) this.render(this.view, { animate: false });
  }

  pos(seat, f = 1, da = 0) {
    const v = this.view, n = v.maxSeats, k = (seat - (v.mySeat || 0) + n) % n;
    const a = Math.PI / 2 + (k * 2 * Math.PI) / n + da;
    return [50 + 50 * f * Math.cos(a), 50 + 50 * f * Math.sin(a)];
  }

  /** Bets sit between a seat and the pot; the local seat's big cards need a little more room. */
  betF(seat) {
    const v = this.view, k = (seat - (v.mySeat || 0) + v.maxSeats) % v.maxSeats;
    if (k === 0) return this.portrait ? 0.5 : 0.4;
    return this.portrait ? 0.56 : 0.6;
  }

  render(view, o = {}) {
    if (Device.mobile) {
      const key = this._mkey(view);
      if (!this.rowsFor.has(key)) {
        if (!this.el.classList.contains('moval')) { this.lkey = null; this.view = view; this.layout(); }
        if (this._renderMobileOval(view, o)) return;
        this.rowsFor.add(key); // this screen size cannot fit an oval without overlaps: rows from now on
        this.lkey = null; this.layout();
      } else if (!this.el.classList.contains('mtable')) { this.lkey = null; this.view = view; this.layout(); }
      return this.renderMobile(view, o);
    }
    if (this.el.classList.contains('mtable') || this.el.classList.contains('moval')) { this.lkey = null; this.view = view; this.layout(); }
    this._renderOval(view, o);
    this._fit(view);
  }

  /**
   * After drawing the oval, measure it: no seat may touch another seat, the board or the edge of the
   * screen. If anything does, shrink everything a little and redraw. The layout itself never changes.
   */
  _fit(view) {
    const overlaps = () => {
      const box = (e) => e.getBoundingClientRect();
      const st = box(this.stage);
      const seats = [...this.layer.querySelectorAll('.seat, .seat-empty')].map(box);
      const center = this.layer.querySelector('.center');
      const all = center ? [...seats, box(center)] : seats;
      const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      for (let i = 0; i < all.length; i++) {
        const a = all[i];
        if (a.left < st.left - 1 || a.right > st.right + 1 || a.top < st.top - 1 || a.bottom > st.bottom + 1) return true;
        for (let j = i + 1; j < all.length; j++) if (hit(a, all[j])) return true;
      }
      return false;
    };
    if (!this.w || !this.stage.clientWidth) return;
    for (let guard = 0; guard < 10 && this.fitK > 0.4 && overlaps(); guard++) {
      this.fitK *= 0.9;
      this.el.style.setProperty('--s', (this.baseS * this.fitK).toFixed(3));
      this._renderOval(view, { animate: false });
    }
  }

  _renderOval(view, o = {}) {
    const prev = this.view;
    this.view = view;
    if (!this.w) this.layout();
    const same = prev && prev.handKey === view.handKey;
    const animate = o.animate !== false && !document.hidden;
    const newHand = animate && view.handKey && (!prev || prev.handKey !== view.handKey);
    const winSet = new Set(view.results ? view.results.winCards : []);
    const hl = (c) => (winSet.size && c ? (winSet.has(c) ? 'win' : 'dim') : '');
    const parts = [];
    if (view.feltText) parts.push(`<div class="felt-mark">${U.esc(view.feltText)}</div>`);

    // Center: street, pots, board, result line
    const prevBoard = same && prev ? prev.board.length : 0;
    let board = '';
    for (let i = 0; i < 5; i++) {
      const c = view.board[i];
      if (c) {
        const fresh = animate && i >= prevBoard;
        board += cardHtml(c, `${fresh ? 'flip' : ''} ${hl(c)}`, fresh ? `animation-delay:${(i - prevBoard) * 110}ms` : '');
      } else board += '<div class="slot"></div>';
    }
    const pots = (view.pots || []).filter((p) => p.amount > 0).map((p) =>
      `<div class="pot">${chipsHtml(p.amount, 3)}<span class="pot-label">${U.esc(p.label)}</span><span class="pot-amt">${U.fmt(p.amount)}</span></div>`).join('');
    const resLine = view.results && view.results.lines.length
      ? `<div class="pot" style="padding:4px 12px;max-width:min(90vw,${Math.round(this.w * 0.7)}px);white-space:normal;text-align:center">${U.esc(view.results.lines.join(' · '))}</div>` : '';
    parts.push(`<div class="center"><div class="street-label">${U.esc(view.street || '')}</div><div class="pots">${resLine || pots}</div><div class="board" aria-label="Board">${board}</div></div>`);

    // Seats, bets, markers
    const n = view.maxSeats;
    view.seats.forEach((st, seat) => {
      const [x, y] = this.pos(seat);
      if (!st) {
        if (view.readOnly) return;
        parts.push(view.canSit
          ? `<button class="seat-empty" data-seat="${seat}" style="left:${x}%;top:${y}%" aria-label="Sit in seat ${seat + 1}">Sit</button>`
          : `<div class="seat-empty" style="left:${x}%;top:${y}%;opacity:.45" aria-hidden="true"></div>`);
        return;
      }
      const ps = same && prev.seats[seat];
      const isMe = seat === (view.mySeat || 0) && (st.isYou || view.readOnly);
      const cls = ['seat', isMe ? 'me' : '', st.toAct ? 'active' : '', st.folded ? 'folded' : '', (st.sittingOut || st.busted) ? 'out' : '', st.won ? 'winner' : ''].join(' ');
      let hole = '';
      if (st.cards) {
        const dx = (50 - x) * this.w / 100, dy = (50 - y) * this.h / 100;
        hole = st.cards.map((c, j) => {
          const dealt = newHand && !(prev && prev.seats[seat] && prev.seats[seat].cards && prev.handKey === view.handKey);
          const flipNow = animate && same && ps && ps.cards && !ps.cards[j] && c;
          const k = (seat - (view.mySeat || 0) + n) % n;
          const style = dealt ? `--dx:${dx}px;--dy:${dy}px;animation-delay:${(j * n + k) * 45}ms` : '';
          const c2 = (st.folded && c) ? 'ghost' : hl(st.shown || st.isYou || view.readOnly ? c : null);
          return cardHtml(c, `${dealt ? 'deal' : ''} ${flipNow ? 'flip' : ''} ${c2}`, style);
        }).join('');
      }
      const tags = [];
      if (st.won) tags.push(`<span class="tag win">+${U.fmt(st.won)}</span>`);
      if (st.folded) tags.push(`<span class="tag">${st.mucked ? 'Mucked' : 'Folded'}</span>`);
      if (st.allIn) tags.push('<span class="tag allin">All-in</span>');
      if (st.busted) tags.push('<span class="tag off">Busted</span>');
      else if (st.sittingOut) tags.push('<span class="tag off">Sitting out</span>');
      if (st.isBot) tags.push(`<span class="tag" title="Computer player${st.botLabel ? ' · ' + U.esc(st.botLabel) : ''}">🤖 ${st.botLabel === 'CFR+ approx.' ? 'CFR+ approx.' : 'Bot'}</span>`);
      if (st.botPlaying) tags.push('<span class="tag off" title="A bot is playing for this player while they are disconnected">🤖 Bot playing</span>');
      else if (st.disconnected) tags.push('<span class="tag off">Disconnected</span>');
      if (!view.results && !st.folded && !st.won && st.lastAction && ACTION_WORD[st.lastAction] && !st.allIn) tags.push(`<span class="tag last">${ACTION_WORD[st.lastAction]}</span>`);
      let ring = '';
      if (st.toAct && view.timer && view.timer.total) ring = '<svg class="ring" viewBox="0 0 50 50"><circle cx="25" cy="25" r="23" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" data-ring></circle></svg>';
      const label = `${st.name}${st.isYou ? ' (you)' : ''}, ${st.allIn ? 'all-in' : U.fmt(st.stack) + ' chips'}${st.folded ? ', folded' : ''}${st.toAct ? ', to act' : ''}`;
      if (st.button) tags.unshift('<span class="tag mk dealer" title="Dealer button">D</span>');
      if (st.sb || st.bb) tags.unshift(`<span class="tag mk ${st.sb ? 'sb' : 'bb'}" title="${st.sb ? 'Small blind' : 'Big blind'}">${st.sb ? 'SB' : 'BB'}</span>`);
      // The bet sits inside the seat, on the side facing the pot, so it can never cover the board.
      let bet = '';
      if (st.bet > 0) {
        const pop = animate && same && (!ps || ps.bet < st.bet);
        bet = `<div class="seat-bet ${pop ? 'pop' : ''}">${chipsHtml(st.bet)}<span class="bet-amt">${U.fmt(st.bet)}</span></div>`;
      }
      const betFirst = y > 60;
      parts.push(`<div class="${cls}" style="left:${x}%;top:${y}%" role="group" aria-label="${U.esc(label)}">
        ${betFirst ? bet : ''}<div class="hole${st.cards && st.cards.length > 2 ? ' many' : ''}">${hole}</div>
        <div class="plate">${avatarHtml(st.name, ring)}<div class="p-info"><div class="nm">${U.esc(st.name)}${st.isHost ? ' <span title="Host" aria-label="host">★</span>' : ''}</div><div class="stack">${st.allIn && !st.stack ? 'All-in' : U.fmt(st.stack)}</div></div></div>
        ${st.handName ? `<div class="hand-name">${U.esc(st.handName)}</div>` : ''}
        <div class="tags">${tags.join('')}</div>${betFirst ? '' : bet}</div>`);
    });
    this.layer.innerHTML = parts.join('');

    // Timer ring
    if (view.timer && view.timer.total) {
      const end = performance.now() + (view.timer.remaining || 0);
      if (!this.timer || Math.abs(this.timer.end - end) > 400 || this.timer.paused !== view.timer.paused) this.timer = { end, total: view.timer.total, paused: view.timer.paused, rem: view.timer.remaining };
      cancelAnimationFrame(this.raf); this.tick();
    } else { this.timer = null; cancelAnimationFrame(this.raf); }

    if (!animate || !prev) return;
    // Sounds + chip motion
    const snd = this.opts.sound !== false;
    if (newHand && snd) { Sound.play('deal'); Sound.play('deal', 0.12); }
    if (same && view.board.length > prev.board.length && snd) Sound.play('deal');
    if (same) {
      view.seats.forEach((st, seat) => {
        const ps = prev.seats[seat];
        if (!st || !ps) return;
        if (snd && st.bet > ps.bet) Sound.play('chip');
        if (snd && st.lastAction === 'x' && ps.lastAction !== 'x') Sound.play('knock');
        if (snd && st.folded && !ps.folded) Sound.play('fold');
      });
      const streetEnded = view.board.length > prev.board.length || (view.results && !prev.results);
      if (streetEnded) {
        const potXY = [50, 41];
        prev.seats.forEach((ps, seat) => { if (ps && ps.bet > 0) this.fly(this.pos(seat, this.betF(seat)), potXY, ps.bet); });
      }
      if (view.results && !prev.results) {
        setTimeout(() => {
          let mine = false;
          view.seats.forEach((st, seat) => {
            if (!st || !st.won) return;
            if (st.isYou) mine = true;
            this.fly([50, 41], this.pos(seat, 0.85), st.won); // the amount itself shows on the seat's "+won" badge
          });
          if (snd) Sound.play(mine ? 'win' : 'chip');
        }, 420);
      }
    }
  }

  /**
   * Phone oval: opponents sit around the rail of a tall oval, you sit at the bottom with big cards,
   * the board and pot sit in the middle. Returns false if nothing fits even at the smallest size.
   */
  _renderMobileOval(view, o = {}) {
    if (!this.w) this._layoutMobileOval();
    const prev = this.view;
    this.view = view;
    const same = prev && prev.handKey === view.handKey;
    const animate = o.animate !== false && !document.hidden;
    const newHand = animate && view.handKey && (!prev || prev.handKey !== view.handKey);
    const winSet = new Set(view.results ? view.results.winCards : []);
    const hl = (c) => (winSet.size && c ? (winSet.has(c) ? 'win' : 'dim') : '');
    const n = view.maxSeats, me = view.mySeat || 0, meSt = view.seats[me], meIsMe = !!meSt && (meSt.isYou || view.readOnly);
    const cardsOf = (st, seat) => (st.cards || []).map((c, j) => {
      const ps = same && prev.seats[seat];
      const dealt = newHand && !(ps && ps.cards);
      const flipNow = animate && same && ps && ps.cards && !ps.cards[j] && c;
      const c2 = (st.folded && c) ? 'ghost' : hl(st.shown || st.isYou || view.readOnly ? c : null);
      return cardHtml(c, `${dealt ? 'deal' : ''} ${flipNow ? 'flip' : ''} ${c2}`, dealt ? `animation-delay:${j * 70}ms` : '');
    }).join('');
    const status = (st) => {
      if (st.folded) return `<span class="tag">${st.mucked ? 'Mucked' : 'Folded'}</span>`;
      if (st.allIn) return '<span class="tag allin">All-in</span>';
      if (st.busted) return '<span class="tag off">Busted</span>';
      if (st.sittingOut) return '<span class="tag off">Out</span>';
      if (st.botPlaying) return '<span class="tag off">Bot playing</span>';
      if (st.disconnected) return '<span class="tag off">Offline</span>';
      if (!view.results && !st.won && st.lastAction && ACTION_WORD[st.lastAction]) return `<span class="tag last">${ACTION_WORD[st.lastAction]}</span>`;
      return '';
    };
    const marks = (st) => `${st.button ? '<span class="tag mk dealer" title="Dealer button">D</span>' : ''}${st.sb ? '<span class="tag mk sb" title="Small blind">SB</span>' : ''}${st.bb ? '<span class="tag mk bb" title="Big blind">BB</span>' : ''}`;
    const ring = (st) => (st.toAct && view.timer && view.timer.total ? '<svg class="ring" viewBox="0 0 50 50"><circle cx="25" cy="25" r="23" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" data-ring></circle></svg>' : '');
    const bet = (st, seat) => {
      if (!(st.bet > 0)) return '';
      const ps = same && prev.seats[seat];
      return `<span class="mt-bet ${animate && same && (!ps || ps.bet < st.bet) ? 'pop' : ''}">${chipsHtml(st.bet, 3)}<b>${U.fmt(st.bet)}</b></span>`;
    };
    // Short hand names on the small seats ("Two Pair" rather than "Two Pair, Aces and Eights").
    const won = (st, short) => `${st.won ? `<span class="tag win">+${U.fmt(st.won)}</span>` : ''}${st.handName ? `<span class="tag hn" title="${U.esc(st.handName)}">${U.esc(short ? st.handName.split(',')[0] : st.handName)}</span>` : ''}`;
    const label = (st) => `${st.name}${st.isYou ? ' (you)' : ''}, ${st.allIn ? 'all-in' : U.fmt(st.stack) + ' chips'}${st.folded ? ', folded' : ''}${st.toAct ? ', to act' : ''}`;
    const cls = (st, extra) => [extra, st.toAct ? 'active' : '', st.folded ? 'folded' : '', (st.sittingOut || st.busted) ? 'out' : '', st.won ? 'winner' : ''].join(' ');

    const W = this.w, H = this.h;
    const draw = (k) => {
      this.el.style.setProperty('--mk', k.toFixed(3));
      const myCw = Math.min(W * 0.15, 56) * k;
      const meH = meIsMe ? myCw * 1.4 + 18 : 0;
      // the felt: a tall oval above your seat
      const fx = 10, fy = 8, fw = W - 2 * fx, fh = Math.max(120, H - fy - (meIsMe ? meH * 0.62 : 8));
      const cx = W / 2, cy = fy + fh / 2;
      const podW = Math.min(104, W * 0.29) * k, podH = 74 * k;
      // seats straddle the rail; spread evenly along it, leaving the bottom for you
      const rx = fw / 2 - podW * 0.36, ry = fh / 2 - podH * 0.3;
      const N = 360, pts = [], len = [0];
      for (let i = 0; i <= N; i++) { const a = Math.PI / 2 + (i / N) * 2 * Math.PI; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); if (i) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
      const at = (t) => { const L = t * len[N]; let i = 1; while (i < N && len[i] < L) i++; return pts[i]; };
      const gapT = meIsMe ? Math.min(0.34, (Math.min(W * 0.8, 330) * k) / len[N] * 1.1) : 0;
      const parts = [`<div class="mfelt" style="left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px"></div>`];
      if (view.feltText) parts.push(`<div class="felt-mark" style="top:${cy + fh * 0.22}px;font-size:${10 * k}px">${U.esc(view.feltText)}</div>`);
      const opp = meIsMe ? n - 1 : n;
      for (let j = 0; j < opp; j++) {
        const seat = meIsMe ? (me + 1 + j) % n : (me + j) % n, st = view.seats[seat];
        const t = meIsMe ? gapT / 2 + (1 - gapT) * (j + 0.5) / opp : j / opp;
        const [x, y] = at(t);
        if (!st) {
          if (view.canSit && !view.readOnly) parts.push(`<button class="mseat-empty" data-seat="${seat}" style="left:${x}px;top:${y}px" aria-label="Sit in seat ${seat + 1}">Sit</button>`);
          continue;
        }
        const many = st.cards && st.cards.length > 2;
        const line = `${marks(st)}${status(st)}${bet(st, seat)}`;
        parts.push(`<div class="mseat ${cls(st, '')}" data-seat="${seat}" style="left:${x}px;top:${y}px" role="group" aria-label="${U.esc(label(st))}">
          ${st.cards && (!st.folded || st.shown) ? `<div class="ms-cards${many ? ' many' : ''}">${cardsOf(st, seat)}</div>` : ''}
          <div class="ms-plate">${avatarHtml(st.name, ring(st))}<div class="ms-id"><div class="nm">${U.esc(st.name)}${st.isBot ? ' 🤖' : ''}${st.isHost ? ' ★' : ''}</div><div class="stack">${st.allIn && !st.stack ? 'All-in' : U.fmt(st.stack)}</div></div></div>
          ${line ? `<div class="ms-line">${line}</div>` : ''}${st.won || st.handName ? `<div class="ms-tags">${won(st, true)}</div>` : ''}</div>`);
      }
      // the middle: street, pot (or the result), board
      const prevBoard = same && prev ? prev.board.length : 0;
      let board = '';
      for (let i = 0; i < 5; i++) {
        const c = view.board[i];
        if (c) { const fresh = animate && i >= prevBoard; board += cardHtml(c, `${fresh ? 'flip' : ''} ${hl(c)}`, fresh ? `animation-delay:${(i - prevBoard) * 110}ms` : ''); }
        else board += '<div class="slot"></div>';
      }
      const pots = (view.pots || []).filter((p) => p.amount > 0).map((p) => `<div class="pot">${chipsHtml(p.amount, 3)}<span class="pot-label">${U.esc(p.label)}</span><span class="pot-amt">${U.fmt(p.amount)}</span></div>`).join('');
      const res = view.results && view.results.lines.length ? `<div class="mt-result" style="max-width:${Math.round(fw * 0.62)}px">${U.esc(view.results.lines.join(' · '))}</div>` : '';
      const bcw = Math.max(22, Math.min(50, (fw - 2 * podW * 0.95) / 5.5)) * k;
      parts.push(`<div class="mcenter" style="left:${cx}px;top:${cy}px;--bcw:${bcw}px"><div class="street-label">${U.esc(view.street || '')}</div><div class="pots">${res || pots}</div><div class="board" aria-label="Board">${board}</div></div>`);
      if (meIsMe) {
        const st = meSt, many = st.cards && st.cards.length > 2;
        const line = `${marks(st)}${status(st)}${bet(st, me)}`;
        parts.push(`<div class="mme ${cls(st, '')}" data-seat="${me}" style="--mcw:${(many ? myCw * 0.78 : myCw).toFixed(1)}px" role="group" aria-label="${U.esc(label(st))}">
          <div class="mt-mycards${many ? ' many' : ''}">${cardsOf(st, me)}</div>
          <div class="mme-info"><div class="ms-plate">${avatarHtml(st.name, ring(st))}<div class="ms-id"><div class="nm">${U.esc(st.name)}${view.readOnly ? '' : ' (you)'}</div><div class="stack">${st.allIn && !st.stack ? 'All-in' : U.fmt(st.stack)}</div></div></div>
          ${line ? `<div class="ms-line">${line}</div>` : ''}${st.won || st.handName ? `<div class="ms-tags">${won(st, false)}</div>` : ''}</div></div>`);
      }
      this.layer.innerHTML = parts.join('');
      // Seats near the edge are nudged inward so they always sit fully on screen.
      for (const e of this.layer.querySelectorAll('.mseat, .mseat-empty')) {
        const w = e.offsetWidth, h = e.offsetHeight, x = parseFloat(e.style.left), y = parseFloat(e.style.top);
        e.style.left = Math.min(W - w / 2 - 2, Math.max(w / 2 + 2, x)) + 'px';
        e.style.top = Math.min(H - h / 2 - 2, Math.max(h / 2 + 2, y)) + 'px';
      }
    };
    // Measure: no two pieces may touch, and nothing may leave the table area.
    const fits = () => {
      const box = (e) => e.getBoundingClientRect(), T = box(this.el);
      const els = [...this.layer.querySelectorAll('.mseat, .mseat-empty, .mme, .mcenter .board, .mcenter .pots, .mcenter .street-label')].filter((e) => { const r = box(e); return r.width && r.height; });
      const items = els.map(box), nm = (e) => e.className.split(' ')[0] + (e.dataset.seat ? '@' + e.dataset.seat : '');
      for (let i = 0; i < items.length; i++) {
        const a = items[i];
        if (a.left < T.left - 1 || a.right > T.right + 1 || a.top < T.top - 1 || a.bottom > T.bottom + 1) { this.fitWhy = `${nm(els[i])} leaves the table`; return false; }
        for (let j = i + 1; j < items.length; j++) { const b = items[j]; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > -2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > -2) { this.fitWhy = `${nm(els[i])} touches ${nm(els[j])}`; return false; } }
      }
      return true;
    };
    let k = Math.min(1, this.mk || 1);
    draw(k);
    // Grow back toward full size when there is room again (a new hand, fewer players)...
    while (k < 1 && fits()) { const k2 = Math.min(1, k / 0.92); draw(k2); if (fits()) k = k2; else { draw(k); break; } }
    // ...and shrink while anything touches.
    let ok = fits();
    while (!ok && k > 0.62) { k *= 0.92; draw(k); ok = fits(); }
    this.mk = k;
    if (!ok) return false;
    // The action bar can change height in the same moment the table was measured, without the browser
    // reporting a resize. Check once more after this frame and fit to the space that is really there.
    cancelAnimationFrame(this.sizeRaf);
    this.sizeRaf = requestAnimationFrame(() => {
      if (!this.el.classList.contains('moval')) return;
      const a = this._mobileAvail();
      if (a.W !== this.w || a.H !== this.h) { this.lkey = null; this._layoutMobileOval(); }
    });

    if (view.timer && view.timer.total) {
      const end = performance.now() + (view.timer.remaining || 0);
      if (!this.timer || Math.abs(this.timer.end - end) > 400 || this.timer.paused !== view.timer.paused) this.timer = { end, total: view.timer.total, paused: view.timer.paused, rem: view.timer.remaining };
      cancelAnimationFrame(this.raf); this.tick();
    } else { this.timer = null; cancelAnimationFrame(this.raf); }
    if (!animate || !prev || this.opts.sound === false) return true;
    if (newHand) { Sound.play('deal'); Sound.play('deal', 0.12); }
    if (same && view.board.length > prev.board.length) Sound.play('deal');
    if (same) view.seats.forEach((st, seat) => {
      const ps = prev.seats[seat];
      if (!st || !ps) return;
      if (st.bet > ps.bet) Sound.play('chip');
      if (st.lastAction === 'x' && ps.lastAction !== 'x') Sound.play('knock');
      if (st.folded && !ps.folded) Sound.play('fold');
    });
    if (same && view.results && !prev.results) setTimeout(() => Sound.play(view.seats.some((st) => st && st.won && st.isYou) ? 'win' : 'chip'), 420);
    return true;
  }

  renderMobile(view, o = {}) {
    const prev = this.view;
    this.view = view;
    const same = prev && prev.handKey === view.handKey;
    const animate = o.animate !== false && !document.hidden;
    const newHand = animate && view.handKey && (!prev || prev.handKey !== view.handKey);
    const winSet = new Set(view.results ? view.results.winCards : []);
    const hl = (c) => (winSet.size && c ? (winSet.has(c) ? 'win' : 'dim') : '');
    const n = view.maxSeats, me = view.mySeat || 0;
    const meSt = view.seats[me];
    const meIsMe = !!meSt && (meSt.isYou || view.readOnly);

    const cardsOf = (st, seat) => (st.cards || []).map((c, j) => {
      const ps = same && prev.seats[seat];
      const dealt = newHand && !(ps && ps.cards);
      const flipNow = animate && same && ps && ps.cards && !ps.cards[j] && c;
      const c2 = (st.folded && c) ? 'ghost' : hl(st.shown || st.isYou || view.readOnly ? c : null);
      return cardHtml(c, `${dealt ? 'deal' : ''} ${flipNow ? 'flip' : ''} ${c2}`, dealt ? `animation-delay:${j * 70}ms` : '');
    }).join('');
    // Status (folded, all-in, last action…) sits next to the cards; wins and hand names get their own line.
    const statusOf = (st) => {
      const t = [];
      if (st.folded) t.push(`<span class="tag">${st.mucked ? 'Mucked' : 'Folded'}</span>`);
      if (st.allIn) t.push('<span class="tag allin">All-in</span>');
      if (st.busted) t.push('<span class="tag off">Busted</span>');
      else if (st.sittingOut) t.push('<span class="tag off">Out</span>');
      if (st.botPlaying) t.push('<span class="tag off">Bot playing</span>');
      else if (st.disconnected) t.push('<span class="tag off">Offline</span>');
      if (!view.results && !st.folded && !st.won && st.lastAction && ACTION_WORD[st.lastAction] && !st.allIn) t.push(`<span class="tag last">${ACTION_WORD[st.lastAction]}</span>`);
      return t.join('');
    };
    const tagsOf = (st) => `${st.won ? `<span class="tag win">+${U.fmt(st.won)}</span>` : ''}${st.handName ? `<span class="tag hn">${U.esc(st.handName)}</span>` : ''}`;
    const badge = (st) => `${st.isHost ? ' <span title="Host">★</span>' : ''}${st.isBot ? ' <span title="Computer player">🤖</span>' : ''}`;
    const marks = (st) => `${st.button ? '<span class="mk dealer" title="Dealer button">D</span>' : ''}${st.sb ? '<span class="mk sb" title="Small blind">SB</span>' : ''}${st.bb ? '<span class="mk bb" title="Big blind">BB</span>' : ''}`;
    const ring = (st) => (st.toAct && view.timer && view.timer.total ? '<svg class="ring" viewBox="0 0 50 50"><circle cx="25" cy="25" r="23" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" data-ring></circle></svg>' : '');
    const betOf = (st, seat) => {
      if (!(st.bet > 0)) return '';
      const ps = same && prev.seats[seat];
      return `<span class="mt-bet ${animate && same && (!ps || ps.bet < st.bet) ? 'pop' : ''}">${chipsHtml(st.bet, 3)}<b>${U.fmt(st.bet)}</b></span>`;
    };
    const label = (st) => `${st.name}${st.isYou ? ' (you)' : ''}, ${st.allIn ? 'all-in' : U.fmt(st.stack) + ' chips'}${st.folded ? ', folded' : ''}${st.toAct ? ', to act' : ''}`;
    const cls = (st, extra) => ['mt-seat', extra, st.toAct ? 'active' : '', st.folded ? 'folded' : '', (st.sittingOut || st.busted) ? 'out' : '', st.won ? 'winner' : ''].join(' ');

    // Opponents, clockwise from your left. Empty seats appear only when you can sit in them.
    const tiles = [];
    for (let k = meIsMe ? 1 : 0; k < n; k++) {
      const seat = (me + k) % n, st = view.seats[seat];
      if (!st) {
        if (view.canSit && !view.readOnly) tiles.push(`<button class="mt-seat empty" data-seat="${seat}" aria-label="Sit in seat ${seat + 1}">${icon('plus')}Sit here</button>`);
        continue;
      }
      const many = st.cards && st.cards.length > 2;
      tiles.push(`<div class="${cls(st, '')}" data-seat="${seat}" role="group" aria-label="${U.esc(label(st))}">
        <div class="mt-top">${avatarHtml(st.name, ring(st))}<div class="mt-id"><div class="nm">${U.esc(st.name)}${badge(st)}</div><div class="stack">${st.allIn && !st.stack ? 'All-in' : U.fmt(st.stack)}</div></div></div>
        <div class="mt-mid">${st.cards && !st.folded ? `<div class="mt-cards${many ? ' many' : ''}">${cardsOf(st, seat)}</div>` : ''}${marks(st)}${statusOf(st)}${betOf(st, seat)}</div>
        <div class="mt-tags">${tagsOf(st)}</div></div>`);
    }

    // Board
    const prevBoard = same && prev ? prev.board.length : 0;
    let board = '';
    for (let i = 0; i < 5; i++) {
      const c = view.board[i];
      if (c) { const fresh = animate && i >= prevBoard; board += cardHtml(c, `${fresh ? 'flip' : ''} ${hl(c)}`, fresh ? `animation-delay:${(i - prevBoard) * 110}ms` : ''); }
      else board += '<div class="slot"></div>';
    }
    const pots = (view.pots || []).filter((p) => p.amount > 0).map((p) => `<div class="pot">${chipsHtml(p.amount, 3)}<span class="pot-label">${U.esc(p.label)}</span><span class="pot-amt">${U.fmt(p.amount)}</span></div>`).join('');
    const res = view.results && view.results.lines.length ? `<div class="mt-result">${U.esc(view.results.lines.join(' · '))}</div>` : '';

    // You
    let mine = '';
    if (meIsMe) {
      const st = meSt, many = st.cards && st.cards.length > 2;
      mine = `<div class="${cls(st, 'mt-me')}" data-seat="${me}" role="group" aria-label="${U.esc(label(st))}">
        <div class="mt-mycards${many ? ' many' : ''}">${cardsOf(st, me)}</div>
        <div class="mt-meinfo"><div class="mt-top">${avatarHtml(st.name, ring(st))}<div class="mt-id"><div class="nm">${U.esc(st.name)}${view.readOnly ? '' : ' (you)'}</div><div class="stack">${st.allIn && !st.stack ? 'All-in' : U.fmt(st.stack)}</div></div><div class="mt-marks">${marks(st)}</div></div>
        <div class="mt-mid">${statusOf(st)}${betOf(st, me)}</div><div class="mt-tags">${tagsOf(st)}</div></div></div>`;
    }
    const manyCards = view.seats.some((st) => st && st.cards && st.cards.length > 4);
    this.layer.innerHTML = `<div class="mt-opps${tiles.length ? '' : ' none'}${manyCards ? ' many' : ''}">${tiles.join('')}</div>
      <div class="mt-center"><div class="street-label">${U.esc(view.street || '')}</div><div class="pots">${res || pots}</div><div class="board" aria-label="Board">${board}</div></div>
      ${mine}`;

    if (view.timer && view.timer.total) {
      const end = performance.now() + (view.timer.remaining || 0);
      if (!this.timer || Math.abs(this.timer.end - end) > 400 || this.timer.paused !== view.timer.paused) this.timer = { end, total: view.timer.total, paused: view.timer.paused, rem: view.timer.remaining };
      cancelAnimationFrame(this.raf); this.tick();
    } else { this.timer = null; cancelAnimationFrame(this.raf); }
    // Small screens may scroll: bring your own seat into view when it's your turn.
    if (meIsMe && meSt.toAct && !(prev && prev.seats[me] && prev.seats[me].toAct)) {
      const el = this.layer.querySelector('.mt-me');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    if (!animate || !prev || this.opts.sound === false) return;
    if (newHand) { Sound.play('deal'); Sound.play('deal', 0.12); }
    if (same && view.board.length > prev.board.length) Sound.play('deal');
    if (same) view.seats.forEach((st, seat) => {
      const ps = prev.seats[seat];
      if (!st || !ps) return;
      if (st.bet > ps.bet) Sound.play('chip');
      if (st.lastAction === 'x' && ps.lastAction !== 'x') Sound.play('knock');
      if (st.folded && !ps.folded) Sound.play('fold');
    });
    if (same && view.results && !prev.results) setTimeout(() => Sound.play(view.seats.some((st) => st && st.won && st.isYou) ? 'win' : 'chip'), 420);
  }

  /** A speech bubble over a seat for a chat message (below the seat for players at the top of the table). */
  bubble(seat, from, text) {
    if (!this.view || seat == null || seat < 0 || Device.mobile) return; // mobile shows chat in its own strip instead
    const [x, y] = this.pos(seat);
    const below = y < 30;
    const el = document.createElement('div');
    el.className = `chat-bubble${below ? ' below' : ''}`;
    el.style.left = x + '%';
    el.style.top = `calc(${y}% ${below ? '+' : '-'} ${below ? 46 : 58} * var(--s) * 1px)`;
    el.setAttribute('role', 'note');
    el.setAttribute('aria-label', `${from} says: ${text}`);
    el.textContent = text.length > 120 ? text.slice(0, 117) + '…' : text;
    // One bubble per seat at a time: a new message replaces the old one.
    $$(`.chat-bubble[data-seat="${seat}"]`, this.fx).forEach((b) => b.remove());
    el.dataset.seat = seat;
    this.fx.appendChild(el);
    const ms = Math.min(9000, 3500 + text.length * 60);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, ms);
  }

  fly(from, to, amount) {
    if (reducedMotion() || Device.mobile) return;
    const el = document.createElement('div');
    el.className = 'fly';
    el.innerHTML = chipsHtml(amount, 4);
    el.style.left = `calc(${from[0]}% - 9px)`; el.style.top = `calc(${from[1]}% - 9px)`;
    this.fx.appendChild(el);
    const dx = ((to[0] - from[0]) * this.w) / 100, dy = ((to[1] - from[1]) * this.h) / 100;
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transform = `translate(${dx}px, ${dy}px)`; el.style.opacity = '0.15'; }));
    setTimeout(() => el.remove(), 480);
  }

  tick() {
    const t = this.timer, c = this.layer.querySelector('[data-ring]');
    if (!t || !c) return;
    const rem = t.paused ? t.rem : Math.max(0, t.end - performance.now());
    const frac = Math.max(0, Math.min(1, rem / t.total));
    c.setAttribute('stroke-dashoffset', String(100 * (1 - frac)));
    c.style.stroke = frac > 0.5 ? 'var(--accent)' : frac > 0.25 ? 'var(--warn)' : 'var(--danger)';
    if (!t.paused && rem > 0) this.raf = requestAnimationFrame(this.tick);
  }
}
