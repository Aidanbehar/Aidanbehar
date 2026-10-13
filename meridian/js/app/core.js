/* Meridian — core UI framework: settings, helpers, zone references, zone picker, time field, router, tick loop, search. */
(function () {
  'use strict';
  const TE = window.TE, D = window.MERIDIAN_DATA;
  const M = window.M = { TE, D, views: {}, tickers: new Set() };

  /* ------------------------------------------------------------ */
  /* Storage & settings                                            */
  /* ------------------------------------------------------------ */
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem('meridian.' + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(key, val) { try { localStorage.setItem('meridian.' + key, JSON.stringify(val)); return true; } catch (e) { return false; } },
    remove(key) { try { localStorage.removeItem('meridian.' + key); } catch (e) { /* ignore */ } }
  };
  M.store = store;
  const localeHour12 = (() => { try { return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === true; } catch (e) { return false; } })();
  const DEFAULT_SETTINGS = { theme: 'system', hour12: localeHour12, dateFormat: 'long', weekConvention: 'iso', holidayCountry: 'US', saveRecent: true, showSeconds: true, hemisphere: 'auto' };
  M.settings = Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {}));
  const settingListeners = new Set();
  M.onSettings = (fn) => settingListeners.add(fn);
  M.setSetting = (k, v) => {
    M.settings[k] = v; store.set('settings', M.settings);
    if (k === 'theme') applyTheme();
    settingListeners.forEach(fn => { try { fn(k, v); } catch (e) { console.error(e); } });
  };
  function applyTheme() {
    const t = M.settings.theme;
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  }
  M.isDark = () => {
    const t = M.settings.theme;
    if (t === 'dark') return true; if (t === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  M.localZoneId = TE.detectLocalZone();

  /* ------------------------------------------------------------ */
  /* DOM helpers                                                   */
  /* ------------------------------------------------------------ */
  M.$ = (sel, root = document) => root.querySelector(sel);
  M.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = M.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  M.debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  M.el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  let toastTimer;
  M.toast = (msg) => {
    const t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  };
  M.copy = async (text, label = 'Copied to clipboard') => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      M.toast(label);
    } catch (e) { M.toast('Copy failed — select the text and copy manually.'); }
  };
  /** Wire up all [data-copy] buttons inside root: copies the attribute value, or the text of [data-copy-target]. */
  M.bindCopy = (root) => {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-copy],[data-copy-from]');
      if (!b || !root.contains(b)) return;
      let text = b.getAttribute('data-copy');
      if (b.hasAttribute('data-copy-from')) { const src = root.querySelector(b.getAttribute('data-copy-from')); text = src ? src.innerText.trim() : ''; }
      if (text) M.copy(text);
    });
  };
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11v6M8 15h2M12 15h2M8 18h2M12 18h2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    pin: '<path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/>',
    chevL: '<path d="M15 6l-6 6 6 6"/>',
    chevR: '<path d="M9 6l6 6-6 6"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="16" cy="16" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    egg: '<path d="M12 3c-4 0-7 6-7 11a7 7 0 0 0 14 0c0-5-3-11-7-11z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9s10 4 10 9"/>'
  };
  M.icon = (name, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* ------------------------------------------------------------ */
  /* Formatting using settings                                     */
  /* ------------------------------------------------------------ */
  M.dayPart = (h) => h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
  M.dayPartLabel = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };
  M.fmtTime = (w, opts = {}) => TE.formatTime(w.h, w.mi, w.s || 0, { hour12: opts.hour12 != null ? opts.hour12 : M.settings.hour12, seconds: opts.seconds != null ? opts.seconds : false, ms: opts.ms ? (w.ms || 0) : null });
  M.fmtDate = (dt, style) => {
    style = style || M.settings.dateFormat;
    const p = TE.pad;
    switch (style) {
      case 'iso': return TE.isoDate(dt);
      case 'mdy': return `${p(dt.m)}/${p(dt.d)}/${TE.isoYear(dt.y)}`;
      case 'dmy': return `${p(dt.d)}/${p(dt.m)}/${TE.isoYear(dt.y)}`;
      case 'short': return TE.formatDateShort(dt);
      case 'noweekday': return TE.formatDateLong(dt, false);
      default: return TE.formatDateLong(dt);
    }
  };
  /** Date with weekday prefix for numeric styles. */
  M.fmtDateW = (dt) => {
    const s = M.settings.dateFormat;
    if (s === 'long') return TE.formatDateLong(dt);
    return `${TE.WEEKDAYS_SHORT[TE.weekday(dt.y, dt.m, dt.d)]} ${M.fmtDate(dt)}`;
  };
  M.fmtDateTime = (w, opts = {}) => `${M.fmtDateW(w)}, ${M.fmtTime(w, opts)}`;
  M.isoInstant = (epochMs, zone, withMs = false) => {
    const w = TE.toZoned(zone, epochMs);
    const msPart = withMs || w.ms ? '.' + TE.pad(w.ms, 3) : '';
    return `${TE.isoDate(w)}T${TE.pad(w.h)}:${TE.pad(w.mi)}:${TE.pad(w.s)}${msPart}${TE.isoOffset(w.offsetSec)}`;
  };
  M.relDays = (n) => n === 0 ? 'today' : n === 1 ? 'tomorrow' : n === -1 ? 'yesterday' : n > 0 ? `in ${TE.formatNumber(n)} days` : `${TE.formatNumber(-n)} days ago`;
  M.plural = (n, w, pl) => `${TE.formatNumber(n)} ${Math.abs(n) === 1 ? w : (pl || w + 's')}`;
  M.dateInputValue = (dt) => (dt && dt.y >= 1 && dt.y <= 9999) ? TE.isoDate(dt) : '';
  /** Reads a native date input strictly. */
  M.readDate = (input, label = 'Date') => {
    const v = input.value;
    if (!v) {
      if (input.validity && input.validity.badInput) return { ok: false, error: `${label}: that is not a valid calendar date.` };
      return { ok: false, error: `${label} is required.` };
    }
    const r = TE.parseISODate(v);
    return r.ok ? r : { ok: false, error: `${label}: ${r.error}` };
  };
  M.today = (zone) => { const w = TE.toZoned(zone || M.localZone(), Date.now()); return { y: w.y, m: w.m, d: w.d }; };

  /* ------------------------------------------------------------ */
  /* Zone references                                               */
  /* ------------------------------------------------------------ */
  // A ZoneRef is an engine zone ({kind:'iana', id} / {kind:'fixed', offsetSec}) plus display metadata.
  M.localZone = () => ({ kind: 'iana', id: M.localZoneId, city: TE.zoneCityName(M.localZoneId), isLocal: true });
  M.utcZone = () => ({ kind: 'fixed', offsetSec: 0, label: 'UTC', abbr: 'UTC', name: 'Coordinated Universal Time', isUTC: true });
  M.cityById = new Map(D.CITIES.map(c => [c.id, c]));
  M.cityRef = (c) => ({ kind: 'iana', id: c.zone, city: c.name, country: c.country, cc: c.cc, lat: c.lat, lon: c.lon, cityId: c.id });
  M.ianaRef = (id) => {
    const c = D.CITIES.find(x => x.zone === id && TE.zoneCityName(id) === x.name.replace(/ \(.*\)$/, ''));
    return c ? M.cityRef(c) : { kind: 'iana', id, city: TE.zoneCityName(id) };
  };
  M.fixedRef = (offsetSec, abbr, name) => ({ kind: 'fixed', offsetSec, abbr: abbr || null, name: name || null, label: abbr ? `${abbr} (${TE.formatOffset(offsetSec)})` : TE.formatOffset(offsetSec), literal: true });
  M.refTitle = (r) => {
    if (!r) return '';
    if (r.isUTC) return 'UTC';
    if (r.kind === 'fixed') return r.abbr ? `${r.abbr} — ${r.name || ''}`.replace(/ — $/, '') : TE.formatOffset(r.offsetSec);
    if (r.city) return r.country ? `${r.city}, ${r.country}` : r.city;
    return r.id;
  };
  M.refShort = (r) => {
    if (!r) return '';
    if (r.isUTC) return 'UTC';
    if (r.kind === 'fixed') return r.abbr || TE.formatOffset(r.offsetSec);
    return r.city || TE.zoneCityName(r.id);
  };
  M.refDetail = (r, at = Date.now()) => {
    if (!r) return '';
    if (r.kind === 'fixed') return r.isUTC ? 'Coordinated Universal Time — fixed, no daylight saving' : `Literal fixed offset ${TE.formatOffset(r.offsetSec)} — no daylight-saving changes applied`;
    const off = TE.offsetAt(r, at);
    const nm = TE.zoneName(r, at, 'long');
    return `${r.id} · ${nm ? nm + ' · ' : ''}${TE.formatOffset(off)} now`;
  };
  M.serializeRef = (r) => {
    if (!r) return '';
    if (r.isUTC) return 'utc';
    if (r.kind === 'fixed') return `fixed:${r.offsetSec}:${r.abbr || ''}:${r.name || ''}`;
    if (r.cityId) return `city:${r.cityId}:${r.id}`;
    return `iana:${r.id}`;
  };
  M.parseRef = (s) => {
    if (!s || typeof s !== 'string') return null;
    if (s === 'utc' || s === 'UTC') return M.utcZone();
    if (s === 'local') return M.localZone();
    const [kind, ...rest] = s.split(':');
    if (kind === 'fixed') { const off = parseInt(rest[0], 10); if (!Number.isFinite(off) || Math.abs(off) > 18 * 3600) return null; return M.fixedRef(off, rest[1] || null, rest.slice(2).join(':') || null); }
    if (kind === 'city') { const c = M.cityById.get(rest[0]); if (c && c.zone === rest.slice(1).join(':')) return M.cityRef(c); const id = rest.slice(1).join(':'); return TE.isValidIanaZone(id) ? M.ianaRef(id) : null; }
    if (kind === 'iana') { const id = rest.join(':'); return TE.isValidIanaZone(id) ? M.ianaRef(id) : null; }
    if (TE.isValidIanaZone(s)) return M.ianaRef(s);
    return null;
  };

  /* Zone search used by pickers, the map search and the global palette. */
  let ALL_ZONES = TE.listIanaZones() || [];
  if (!ALL_ZONES.length) ALL_ZONES = Array.from(new Set(D.CITIES.map(c => c.zone).concat(D.COMMON_ZONES.filter(z => z !== 'UTC'))));
  if (!ALL_ZONES.includes(M.localZoneId) && TE.isValidIanaZone(M.localZoneId)) ALL_ZONES.push(M.localZoneId);
  M.ALL_ZONES = ALL_ZONES;
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_]/g, ' ');
  M.norm = norm;
  M.searchZones = (query, { limit = 40, includeFixed = true, includeLocal = true } = {}) => {
    const q = norm(query.trim());
    const groups = [];
    const now = Date.now();
    if (!q) {
      const common = [];
      if (includeLocal) common.push({ ref: M.localZone(), title: `Your zone — ${TE.zoneCityName(M.localZoneId)}`, sub: M.localZoneId });
      common.push({ ref: M.utcZone(), title: 'UTC', sub: 'Coordinated Universal Time' });
      for (const z of D.COMMON_ZONES) {
        if (z === 'UTC' || (includeLocal && z === M.localZoneId)) continue;
        const r = M.ianaRef(z); common.push({ ref: r, title: M.refTitle(r), sub: z });
      }
      groups.push({ label: 'Common', items: common });
      return { groups, note: 'Type a city, country, IANA zone (e.g. Europe/Berlin), abbreviation (PST) or offset (UTC+5:30).' };
    }
    let note = null;
    // offsets
    if (includeFixed) {
      const off = TE.parseOffset(query);
      if (off != null && /[+\-−]|^\s*(utc|gmt|z)\s*$/i.test(query)) {
        groups.push({ label: 'Fixed UTC offset', items: [off === 0 ? { ref: M.utcZone(), title: 'UTC', sub: 'UTC±00:00 fixed' } : { ref: M.fixedRef(off), title: TE.formatOffset(off), sub: 'Literal fixed offset (no daylight saving)' }] });
      }
    }
    // abbreviations
    if (includeFixed) {
      const abbrMatches = D.ABBREVIATIONS.filter(a => norm(a.abbr) === q || (q.length >= 2 && norm(a.abbr).startsWith(q) && q.length >= a.abbr.length - 1) || (q.length >= 4 && norm(a.name).includes(q)));
      if (abbrMatches.length) {
        const items = [];
        for (const a of abbrMatches) {
          items.push({ ref: a.abbr === 'UTC' || a.abbr === 'Z' ? M.utcZone() : M.fixedRef(a.offset * 60, a.abbr, a.name), title: `${a.abbr} — ${a.name}`, sub: `Literal ${TE.formatOffset(a.offset * 60)} all year`, badge: 'fixed' });
        }
        // also offer the location rules of the first zone for each distinct meaning
        const seen = new Set();
        for (const a of abbrMatches) {
          const z = a.zones[0]; if (!z || seen.has(z) || z.startsWith('Etc/')) continue; seen.add(z);
          const r = M.ianaRef(z);
          items.push({ ref: r, title: `${M.refTitle(r)} — location rules`, sub: `${z}: switches standard/daylight time as the location does`, badge: 'rules' });
        }
        const exact = abbrMatches.filter(a => norm(a.abbr) === q);
        const meanings = new Set(exact.map(a => a.name));
        if (meanings.size > 1) note = { warn: true, text: `“${query.trim().toUpperCase()}” is ambiguous: ${[...meanings].join(' / ')}. Choose the intended meaning.` };
        groups.push({ label: 'Abbreviations', items });
      }
    }
    // cities
    const cityItems = [];
    for (const c of D.CITIES) {
      const n = norm(c.name), co = norm(c.country);
      let score = -1;
      if (n === q) score = 100; else if (n.startsWith(q)) score = 80; else if (n.includes(q)) score = 60;
      else if (co === q || c.cc.toLowerCase() === q) score = 50; else if (co.startsWith(q)) score = 45; else if (norm(c.zone).includes(q)) score = 30;
      if (score >= 0) cityItems.push({ score: score - c.rank / 1000, ref: M.cityRef(c), title: `${c.name}`, sub: `${c.country} · ${c.zone}` });
    }
    cityItems.sort((a, b) => b.score - a.score);
    if (cityItems.length) groups.push({ label: 'Cities', items: cityItems.slice(0, 14) });
    // IANA zones
    const cityZones = new Set(cityItems.slice(0, 14).map(i => i.ref.id));
    const zoneItems = [];
    for (const z of ALL_ZONES) {
      const zn = norm(z);
      if (zn.includes(q) || norm(TE.zoneCityName(z)).startsWith(q)) {
        if (cityZones.has(z) && !zn.includes(q.replace(/ /g, ''))) continue;
        zoneItems.push({ z, title: z, score: zn.startsWith(q) ? 2 : norm(TE.zoneCityName(z)).startsWith(q) ? 1 : 0 });
      }
    }
    if ('utc'.startsWith(q) && includeFixed && !groups.some(g => g.label === 'Fixed UTC offset')) groups.unshift({ label: 'UTC', items: [{ ref: M.utcZone(), title: 'UTC', sub: 'Coordinated Universal Time' }] });
    zoneItems.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    if (zoneItems.length) groups.push({ label: 'IANA time zones', items: zoneItems.slice(0, 20).map(it => ({ ref: M.ianaRef(it.z), title: it.z, sub: TE.zoneName({ kind: 'iana', id: it.z }, now, 'long') || '' })) });
    let count = 0;
    for (const g of groups) { g.items = g.items.slice(0, Math.max(0, limit - count)); count += g.items.length; }
    if (!count) note = { text: `No match for “${query.trim()}”. Try a larger nearby city, a country, an IANA name like America/Chicago or an offset like UTC−3.` };
    return { groups: groups.filter(g => g.items.length), note };
  };

  /* ------------------------------------------------------------ */
  /* Zone picker (combobox)                                        */
  /* ------------------------------------------------------------ */
  let pickerSeq = 0;
  /**
   * M.zonePicker(container, { label, value: ZoneRef, onChange(ref), includeFixed, hint })
   * Returns { get(), set(ref), el }.
   */
  M.zonePicker = (container, opts = {}) => {
    const id = 'zp' + (++pickerSeq);
    const wrap = M.el(`<div class="field zp">
      ${opts.label ? `<label for="${id}">${esc(opts.label)}</label>` : ''}
      <div class="zp-input-wrap">
        <input class="input" id="${id}" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list" autocomplete="off" spellcheck="false" placeholder="${esc(opts.placeholder || 'City, country, zone, PST, UTC+2…')}">
        <button type="button" class="icon-btn sm zp-clear" aria-label="Show all options" tabindex="-1">${M.icon('search')}</button>
      </div>
      <ul class="dropdown" id="${id}-list" role="listbox" hidden></ul>
      ${opts.noMeta ? '' : `<div class="zp-meta" aria-live="polite"></div>`}
    </div>`);
    container.appendChild(wrap);
    const input = wrap.querySelector('input'), list = wrap.querySelector('ul'), meta = wrap.querySelector('.zp-meta');
    let value = opts.value || null, items = [], active = -1, open = false;
    const showValue = () => {
      input.value = value ? M.refTitle(value) : '';
      if (meta) meta.textContent = value ? M.refDetail(value) : (opts.hint || '');
      input.classList.remove('invalid');
    };
    const close = () => { list.hidden = true; open = false; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); };
    const render = (q) => {
      const res = M.searchZones(q, { includeFixed: opts.includeFixed !== false });
      items = []; let html = '';
      if (res.note && res.note.warn) html += `<li class="msg warn" role="presentation">${esc(res.note.text)}</li>`;
      for (const g of res.groups) {
        html += `<li class="grp" role="presentation">${esc(g.label)}</li>`;
        for (const it of g.items) {
          const i = items.length; items.push(it);
          let off = '';
          try { off = TE.formatOffset(TE.offsetAt(it.ref, Date.now())); } catch (e) { /* ignore */ }
          html += `<li class="opt" role="option" id="${id}-o${i}" data-i="${i}" aria-selected="false"><div style="min-width:0"><div class="t">${esc(it.title)}</div><div class="s">${esc(it.sub || '')}</div></div><span class="o">${esc(off)}</span></li>`;
        }
      }
      if (res.note && !res.note.warn) html += `<li class="msg" role="presentation">${esc(res.note.text)}</li>`;
      list.innerHTML = html;
      active = items.length ? 0 : -1; highlight();
      list.hidden = false; open = true; input.setAttribute('aria-expanded', 'true');
    };
    const highlight = () => {
      M.$$('.opt', list).forEach(o => o.setAttribute('aria-selected', String(+o.dataset.i === active)));
      const a = list.querySelector(`#${id}-o${active}`);
      if (a) { input.setAttribute('aria-activedescendant', a.id); a.scrollIntoView({ block: 'nearest' }); }
    };
    const choose = (i) => {
      const it = items[i]; if (!it) return;
      value = it.ref; showValue(); close();
      if (opts.onChange) opts.onChange(value);
    };
    input.addEventListener('focus', () => { input.select(); });
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) render(input.value === M.refTitle(value) ? '' : input.value); else { active = Math.min(items.length - 1, active + 1); highlight(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); highlight(); }
      else if (e.key === 'Enter') { if (open && active >= 0) { e.preventDefault(); choose(active); } }
      else if (e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); close(); showValue(); } }
      else if (e.key === 'Tab') { if (open) { close(); showValue(); } }
    });
    input.addEventListener('blur', () => setTimeout(() => {
      if (!wrap.contains(document.activeElement)) {
        if (open) close();
        if (input.value.trim() && input.value !== M.refTitle(value)) {
          input.classList.add('invalid');
          if (meta) meta.innerHTML = `<span class="err-text">Pick an option from the list. “${esc(input.value)}” was not applied.</span>`;
          setTimeout(showValue, 2500);
        } else showValue();
      }
    }, 150));
    list.addEventListener('mousedown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (o) choose(+o.dataset.i); });
    wrap.querySelector('.zp-clear').addEventListener('click', () => { input.focus(); render(''); });
    showValue();
    return { el: wrap, input, get: () => value, set: (r, silent) => { value = r; showValue(); if (!silent && opts.onChange) opts.onChange(r); }, refresh: showValue };
  };

  /* ------------------------------------------------------------ */
  /* Time field (respects 12/24-hour setting)                      */
  /* ------------------------------------------------------------ */
  let tfSeq = 0;
  M.timeField = (container, opts = {}) => {
    const id = 'tf' + (++tfSeq);
    let val = Object.assign({ h: 12, mi: 0, s: 0 }, opts.value || {});
    const withSec = opts.seconds !== false;
    const wrap = M.el(`<div class="field"><label for="${id}-h">${esc(opts.label || 'Time')}</label><div class="row tight" role="group" aria-label="${esc(opts.label || 'Time')}" style="flex-wrap:nowrap;align-items:center"></div>${opts.hint ? `<div class="hint">${esc(opts.hint)}</div>` : ''}</div>`);
    const row = wrap.querySelector('.row');
    container.appendChild(wrap);
    const render = () => {
      const h12 = M.settings.hour12;
      const hours = h12 ? Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i) : Array.from({ length: 24 }, (_, i) => i);
      const curH = h12 ? (val.h % 12 === 0 ? 12 : val.h % 12) : val.h;
      row.innerHTML = `
        <select class="select num-input" id="${id}-h" aria-label="Hour" style="width:76px">${hours.map(h => `<option value="${h}" ${h === curH ? 'selected' : ''}>${h12 ? h : TE.pad(h)}</option>`).join('')}</select>
        <span aria-hidden="true">:</span>
        <input class="input num-input" id="${id}-m" aria-label="Minute" type="number" min="0" max="59" value="${TE.pad(val.mi)}" style="width:68px">
        ${withSec ? `<span aria-hidden="true">:</span><input class="input num-input" id="${id}-s" aria-label="Second" type="number" min="0" max="59" value="${TE.pad(val.s)}" style="width:68px">` : ''}
        ${h12 ? `<select class="select" id="${id}-ap" aria-label="AM or PM" style="width:76px"><option value="AM" ${val.h < 12 ? 'selected' : ''}>AM</option><option value="PM" ${val.h >= 12 ? 'selected' : ''}>PM</option></select>` : ''}`;
    };
    const read = () => {
      const h12 = M.settings.hour12;
      let h = +row.querySelector(`#${id}-h`).value;
      if (h12) { const ap = row.querySelector(`#${id}-ap`).value; h = (h % 12) + (ap === 'PM' ? 12 : 0); }
      const mEl = row.querySelector(`#${id}-m`), sEl = row.querySelector(`#${id}-s`);
      const mi = mEl.value === '' ? NaN : +mEl.value, s = !sEl ? 0 : sEl.value === '' ? 0 : +sEl.value;
      const okM = Number.isInteger(mi) && mi >= 0 && mi <= 59, okS = Number.isInteger(s) && s >= 0 && s <= 59;
      mEl.classList.toggle('invalid', !okM); if (sEl) sEl.classList.toggle('invalid', !okS);
      if (okM && okS) val = { h, mi, s };
      return okM && okS;
    };
    row.addEventListener('change', () => { if (read() && opts.onChange) opts.onChange(val); });
    row.addEventListener('input', (e) => { if (e.target.type === 'number' && read() && opts.onChange) opts.onChange(val); });
    render();
    M.onSettings((k) => { if (k === 'hour12') render(); });
    return {
      el: wrap,
      get: () => (read() ? { ...val } : null),
      valid: () => read(),
      set: (v, silent) => { val = Object.assign({ h: 0, mi: 0, s: 0 }, v); render(); if (!silent && opts.onChange) opts.onChange(val); }
    };
  };

  /* ------------------------------------------------------------ */
  /* Navigation, routing, tick loop                                */
  /* ------------------------------------------------------------ */
  M.NAV = [
    { group: 'Overview', items: [['home', 'Today', 'home'], ['clock', 'World Clock', 'clock'], ['map', 'Time-Zone Map', 'globe']] },
    { group: 'Convert & calculate', items: [['convert', 'Time-Zone Converter', 'swap'], ['calc', 'Date & Time Calculator', 'calc'], ['explorer', 'Date Explorer', 'search']] },
    { group: 'Reference', items: [['history', 'This Day in History', 'book'], ['holidays', 'Holidays & Astronomy', 'sun'], ['utils', 'Utilities', 'tools'], ['units', 'Time Units', 'ruler'], ['calendar', 'Calendar', 'calendar']] },
    { group: 'App', items: [['settings', 'Settings & About', 'settings']] }
  ];
  M.VIEW_TITLES = {};
  M.NAV.forEach(g => g.items.forEach(([k, t]) => { M.VIEW_TITLES[k] = t; }));
  M.favorites = store.get('favorites', []);
  M.toggleFavorite = (view) => {
    const i = M.favorites.indexOf(view);
    if (i >= 0) M.favorites.splice(i, 1); else M.favorites.push(view);
    store.set('favorites', M.favorites); renderNav(); return M.favorites.includes(view);
  };
  function renderNav() {
    const nav = document.getElementById('nav');
    const cur = M.currentView;
    const link = ([k, t, ic], star) => `<a href="#/${k}" data-view="${k}" ${k === cur ? 'aria-current="page"' : ''}>${M.icon(ic)}<span>${esc(t)}</span>${star ? '<span class="star" aria-label="favorite">★</span>' : ''}</a>`;
    let html = '';
    if (M.favorites.length) {
      const all = M.NAV.flatMap(g => g.items);
      html += `<div class="nav-group"><div class="nav-label">Favorites</div>${M.favorites.map(f => all.find(i => i[0] === f)).filter(Boolean).map(i => link(i, true)).join('')}</div>`;
    }
    for (const g of M.NAV) html += `<div class="nav-group"><div class="nav-label">${esc(g.group)}</div>${g.items.map(i => link(i)).join('')}</div>`;
    nav.innerHTML = html;
  }
  M.renderNav = renderNav;
  /** Standard page header with a favorite toggle. */
  M.pageHead = (view, title, desc, extra = '') => `<div class="page-head"><div class="titles"><h1>${esc(title)}</h1>${desc ? `<p>${desc}</p>` : ''}</div><div class="actions">${extra}<button class="icon-btn fav-btn" data-fav="${view}" aria-pressed="${M.favorites.includes(view)}" aria-label="Add ${esc(title)} to favorites" title="Favorite">${M.icon('star')}</button></div></div>`;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]'); if (!b) return;
    const on = M.toggleFavorite(b.dataset.fav); b.setAttribute('aria-pressed', String(on));
    M.toast(on ? 'Added to favorites' : 'Removed from favorites');
  });

  M.parseHash = () => {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const params = {};
    if (qs) new URLSearchParams(qs).forEach((v, k) => { params[k] = v; });
    return { view: path || 'home', params };
  };
  M.go = (view, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const target = `#/${view}${qs}`;
    if (location.hash === target) route(); else location.hash = target;
  };
  M.link = (view, params) => `#/${view}${params ? '?' + new URLSearchParams(params).toString() : ''}`;
  function route() {
    const { view, params } = M.parseHash();
    const name = M.views[view] ? view : 'home';
    if (M.currentView && M.currentView !== name) { const old = M.views[M.currentView]; if (old && old.hide) old.hide(); }
    M.currentView = name;
    M.$$('.view').forEach(s => { s.hidden = s.dataset.view !== name; });
    const v = M.views[name], el = document.getElementById('view-' + name);
    try {
      if (!v._inited) { v._inited = true; v.init(el); }
      if (v.show) v.show(params);
    } catch (e) {
      console.error(e);
      el.insertAdjacentHTML('afterbegin', `<div class="note error">Something went wrong while opening this tool: ${esc(e.message)}. Try reloading the page.</div>`);
    }
    document.title = `${M.VIEW_TITLES[name] || 'Meridian'} — Meridian`;
    renderNav(); closeSidebar();
    if (M._routedOnce) { document.getElementById('main').focus({ preventScroll: true }); window.scrollTo(0, 0); }
    M._routedOnce = true;
  }
  M.route = route;
  M.register = (name, def) => { M.views[name] = def; };

  M.onTick = (fn) => { M.tickers.add(fn); return () => M.tickers.delete(fn); };
  function tick() {
    const now = Date.now();
    renderTopClock(now);
    const v = M.views[M.currentView];
    if (v && v.tick && !document.hidden) { try { v.tick(now); } catch (e) { console.error(e); } }
    M.tickers.forEach(fn => { try { fn(now); } catch (e) { console.error(e); } });
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  function renderTopClock(now) {
    const w = TE.toZoned(M.localZone(), now);
    const u = TE.toZoned(TE.UTC, now);
    document.getElementById('topClock').innerHTML = `<b>${esc(M.fmtTime(w, { seconds: true }))}</b> ${esc(TE.WEEKDAYS_SHORT[w.weekday])} ${esc(TE.MONTHS_SHORT[w.m - 1])} ${w.d} · UTC ${esc(M.fmtTime(u, { hour12: false }))}`;
  }

  /* ------------------------------------------------------------ */
  /* Sidebar (mobile)                                              */
  /* ------------------------------------------------------------ */
  function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('scrim').hidden = false; document.getElementById('navToggle').setAttribute('aria-expanded', 'true'); }
  function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').hidden = true; document.getElementById('navToggle').setAttribute('aria-expanded', 'false'); }

  /* ------------------------------------------------------------ */
  /* Recent calculations (local only, can be disabled/cleared)     */
  /* ------------------------------------------------------------ */
  M.recent = store.get('recent', []);
  M.addRecent = (tool, summary, href) => {
    if (!M.settings.saveRecent) return;
    const item = { tool, summary, href, at: Date.now() };
    M.recent = [item, ...M.recent.filter(r => r.summary !== summary)].slice(0, 25);
    store.set('recent', M.recent);
  };
  M.addRecentDebounced = M.debounce(M.addRecent, 1500);
  M.clearRecent = () => { M.recent = []; store.remove('recent'); };

  /* ------------------------------------------------------------ */
  /* Network helpers                                               */
  /* ------------------------------------------------------------ */
  M.fetchJSON = async (url, { timeout = 12000, headers = {} } = {}) => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl ? ctrl.signal : undefined, headers: { Accept: 'application/json', ...headers } });
      if (res.status === 429) throw new Error('The data service is rate-limiting requests (HTTP 429). Please wait a minute and retry.');
      if (!res.ok) throw new Error(`The data service responded with HTTP ${res.status}.`);
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('The request timed out. Check your connection and retry.');
      if (e instanceof TypeError) throw new Error('Could not reach the data service (offline, blocked, or opened from a restricted context).');
      throw e;
    } finally { clearTimeout(timer); }
  };
  const loaded = new Map();
  M.loadScript = (src) => {
    if (loaded.has(src)) return loaded.get(src);
    // Single-file build: lazily loaded files are embedded as functions instead of separate files.
    const bundled = window.MERIDIAN_BUNDLED && window.MERIDIAN_BUNDLED[src];
    if (bundled) { const p = new Promise((resolve, reject) => { try { bundled(); resolve(); } catch (e) { reject(e); } }); loaded.set(src, p); return p; }
    const p = new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = () => resolve(); s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
    loaded.set(src, p); return p;
  };

  /* ------------------------------------------------------------ */
  /* Global search palette                                         */
  /* ------------------------------------------------------------ */
  M.TOOLS = [
    ['home', 'Today dashboard', 'today date time now week number day of year leap season', 'home'],
    ['clock', 'World clock', 'world clock cities compare times', 'clock'],
    ['clock', 'Meeting planner', 'meeting planner working hours overlap business hours', 'clock', { tab: 'planner' }],
    ['map', 'Interactive time-zone map', 'map world zones regions click', 'globe'],
    ['convert', 'Time-zone converter', 'convert conversion pst pdt historical timezone', 'swap'],
    ['calc', 'Elapsed time between timestamps', 'difference elapsed duration between two dates times zones', 'calc', { tab: 'elapsed' }],
    ['calc', 'Add / subtract days, weeks, months, years', 'date arithmetic add subtract days months years weeks', 'calc', { tab: 'date' }],
    ['calc', 'Business days & weekdays', 'business working days weekdays holidays exclude weekends', 'calc', { tab: 'business' }],
    ['calc', 'Nth weekday / month boundaries', 'nth weekday first monday last friday month start end', 'calc', { tab: 'weekday' }],
    ['calc', 'Time arithmetic', 'add hours minutes seconds time remaining since until duration', 'calc', { tab: 'time' }],
    ['calc', 'Age & anniversary calculator', 'age birthday anniversary leap day', 'calc', { tab: 'age' }],
    ['calc', 'Compare two dates', 'compare dates side by side same week month quarter', 'calc', { tab: 'compare' }],
    ['explorer', 'Weekday of any date', 'weekday day of week what day date info', 'search'],
    ['explorer', 'Leap-year explorer', 'leap year february 29 gregorian rule', 'search', { tab: 'leap' }],
    ['explorer', 'Week-number calculator', 'week number iso us convention', 'search', { tab: 'week' }],
    ['explorer', 'Historical dates & Julian calendar', 'julian gregorian historical calendar old dates offset lmt', 'search', { tab: 'historic' }],
    ['history', 'This Day in History', 'history events births deaths on this day wikipedia', 'book'],
    ['holidays', 'Easter calculator', 'easter orthodox western computus', 'egg', { tab: 'easter' }],
    ['holidays', 'Friday the 13th finder', 'friday 13th unlucky', 'flag', { tab: 'f13' }],
    ['holidays', 'Holiday finder', 'holidays public bank observances country', 'flag', { tab: 'holidays' }],
    ['holidays', 'Moon phases', 'moon phase full new quarter lunar', 'moon', { tab: 'moon' }],
    ['holidays', 'Equinoxes & solstices', 'equinox solstice season astronomy', 'sun', { tab: 'seasons' }],
    ['holidays', 'Sunrise & sunset', 'sunrise sunset day length daylight solar noon twilight', 'sun', { tab: 'sun' }],
    ['utils', 'Unix timestamp converter', 'unix epoch timestamp seconds milliseconds', 'tools', { tab: 'unix' }],
    ['utils', 'ISO 8601 parser', 'iso 8601 rfc 3339 timestamp z offset', 'tools', { tab: 'iso' }],
    ['utils', 'Date format converter', 'format mm/dd/yyyy dd/mm/yyyy ambiguous', 'tools', { tab: 'format' }],
    ['utils', 'Countdown & count-up timers', 'countdown count up timer until since', 'hourglass', { tab: 'countdown' }],
    ['utils', 'Recurring date finder', 'recurring repeat every n days weeks months next occurrence', 'tools', { tab: 'recurring' }],
    ['utils', 'Time-zone abbreviations', 'abbreviation pst est cst ist bst gmt cet meaning ambiguous', 'tools', { tab: 'abbr' }],
    ['units', 'Time-unit converter & reference', 'units convert seconds minutes hours fortnight nanoseconds table', 'ruler'],
    ['calendar', 'Calendar', 'calendar month year view', 'calendar'],
    ['settings', 'Settings & about', 'settings preferences theme format tests about', 'settings']
  ];
  let palItems = [], palActive = 0;
  function openPalette(prefill = '') {
    const p = document.getElementById('palette'), inp = document.getElementById('paletteInput');
    p.hidden = false; inp.value = prefill; renderPalette(prefill); setTimeout(() => inp.focus(), 10);
  }
  function closePalette() { document.getElementById('palette').hidden = true; }
  M.openPalette = openPalette;
  function renderPalette(q) {
    const list = document.getElementById('paletteList');
    const nq = norm(q.trim());
    palItems = []; let html = '';
    const groups = [];
    // Smart actions
    const smart = [];
    if (q.trim()) {
      const nl = M.parseNaturalConversion(q);
      if (nl) smart.push({ t: `Convert ${nl.summary}`, s: 'Open in the time-zone converter', ic: 'swap', run: () => M.go('convert', nl.params) });
      const iso = TE.parseISO8601(q.trim());
      if (iso.ok) smart.push({ t: `Explore ${TE.formatDateLong(iso.wall)}`, s: 'Weekday, week number, day of year…', ic: 'search', run: () => M.go('explorer', { date: TE.isoDate(iso.wall) }) });
      else {
        const fd = TE.parseFlexibleDate(q);
        if (fd.ok) fd.interpretations.forEach(dt => smart.push({ t: `Explore ${TE.formatDateLong(dt)}`, s: fd.ambiguous ? `Interpreted as ${dt.format}` : 'Date explorer', ic: 'search', run: () => M.go('explorer', { date: TE.isoDate(dt) }) }));
      }
      if (/^[+-]?\d{9,19}(\.\d+)?$/.test(q.trim())) smart.push({ t: `Unix timestamp ${q.trim()}`, s: 'Convert to a readable date', ic: 'tools', run: () => M.go('utils', { tab: 'unix', ts: q.trim() }) });
      const mdm = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2})$/i.exec(q.trim());
      if (mdm) { const m = TE.MONTHS.findIndex(x => x.toLowerCase().startsWith(mdm[1].toLowerCase())) + 1, d = +mdm[2]; if (d >= 1 && d <= TE.daysInMonth(2024, m)) smart.push({ t: `${TE.MONTHS[m - 1]} ${d} in history`, s: 'Events, births and deaths on this day', ic: 'book', run: () => M.go('history', { m, d }) }); }
    }
    if (smart.length) groups.push({ label: 'Actions', items: smart });
    const tools = M.TOOLS.filter(([v, t, kw]) => !nq || norm(t).includes(nq) || nq.split(' ').every(w => norm(kw + ' ' + t).includes(w)))
      .map(([v, t, kw, ic, params]) => ({ t, s: M.VIEW_TITLES[v], ic, run: () => M.go(v, params) }));
    if (tools.length) groups.push({ label: 'Tools', items: tools.slice(0, nq ? 8 : 12) });
    if (nq.length >= 2) {
      const z = M.searchZones(q, { limit: 8, includeFixed: false, includeLocal: false });
      const zitems = z.groups.flatMap(g => g.items).slice(0, 8).map(it => ({ t: it.title, s: `${it.sub} · show on map`, ic: 'globe', run: () => M.go('map', { zone: M.serializeRef(it.ref) }), alt: () => M.go('clock', { add: M.serializeRef(it.ref) }) }));
      if (zitems.length) groups.push({ label: 'Places & time zones', items: zitems });
    }
    for (const g of groups) {
      html += `<li class="grp" role="presentation">${esc(g.label)}</li>`;
      for (const it of g.items) { const i = palItems.length; palItems.push(it); html += `<li class="opt" role="option" id="pal-${i}" data-i="${i}" aria-selected="false">${M.icon(it.ic)}<div style="min-width:0"><div class="t">${esc(it.t)}</div><div class="s">${esc(it.s || '')}</div></div></li>`; }
    }
    if (!palItems.length) html = `<li class="empty">No results. Try a tool name, a city, a date like 2011-08-04, or “9:30 PM PST in Berlin”.</li>`;
    list.innerHTML = html; palActive = 0; palHighlight();
  }
  function palHighlight() {
    M.$$('#paletteList .opt').forEach(o => o.setAttribute('aria-selected', String(+o.dataset.i === palActive)));
    const a = document.getElementById('pal-' + palActive);
    if (a) { a.scrollIntoView({ block: 'nearest' }); document.getElementById('paletteInput').setAttribute('aria-activedescendant', a.id); }
  }
  function palRun(i) { const it = palItems[i]; if (it) { closePalette(); it.run(); } }

  /** Parse "9:30 PM PST in Berlin", "2011-08-04 21:30 Los Angeles to Tokyo", "noon UTC in Sydney". */
  M.parseNaturalConversion = (q) => {
    const m = /^(.*?)\s+(?:in|to|->|→)\s+(.+)$/i.exec(q.trim());
    if (!m) return null;
    let left = m[1].trim();
    const pickZone = (s) => {
      const r = M.searchZones(s, { limit: 3 });
      const first = r.groups.flatMap(g => g.items)[0];
      if (!first) return null;
      if (r.note && r.note.warn) {
        // ambiguous abbreviation: prefer the North-American/most common meaning listed first but tell the user
        return { ref: first.ref, ambiguous: true };
      }
      return { ref: first.ref };
    };
    const to = pickZone(m[2]); if (!to) return null;
    let date = null;
    const dm = /^(\d{4}-\d{2}-\d{2})\s*/.exec(left);
    if (dm) { const pd = TE.parseISODate(dm[1]); if (!pd.ok) return null; date = pd.date; left = left.slice(dm[0].length); }
    else {
      const md = /^([A-Za-z]+\.? \d{1,2},? \d{4})\s*(?:at\s+)?/.exec(left);
      if (md) { const fd = TE.parseFlexibleDate(md[1].replace(',', ',')); if (fd.ok) { date = fd.interpretations[0]; left = left.slice(md[0].length); } }
    }
    left = left.replace(/^at\s+/i, '');
    let time = null;
    const special = /^(noon|midnight)\b\s*/i.exec(left);
    if (special) { time = { h: /noon/i.test(special[1]) ? 12 : 0, mi: 0, s: 0 }; left = left.slice(special[0].length); }
    else {
      const tm = /^(\d{1,2}(?::\d{2}(?::\d{2})?)?\s*(?:[ap]\.?m\.?)?)\s+/i.exec(left + ' ');
      if (!tm) return null;
      const pt = TE.parseTime(tm[1].trim()); if (!pt.ok) return null;
      time = pt.time; left = left.slice(tm[0].length).trim();
    }
    if (!left) return null;
    const from = pickZone(left); if (!from) return null;
    const today = M.today(from.ref.kind === 'iana' ? from.ref : M.localZone());
    const d = date || today;
    const params = { date: TE.isoDate(d), time: `${TE.pad(time.h)}:${TE.pad(time.mi)}:${TE.pad(time.s || 0)}`, from: M.serializeRef(from.ref), to: M.serializeRef(to.ref) };
    return { params, summary: `${M.fmtTime(time)} ${M.refShort(from.ref)} → ${M.refShort(to.ref)}${date ? ' on ' + TE.isoDate(date) : ''}` };
  };

  /* ------------------------------------------------------------ */
  /* Boot                                                          */
  /* ------------------------------------------------------------ */
  M.boot = () => {
    applyTheme();
    renderNav();
    const fmtBtn = document.getElementById('fmtToggle');
    const syncFmt = () => { fmtBtn.textContent = M.settings.hour12 ? '12h' : '24h'; fmtBtn.setAttribute('aria-label', `Time format: ${M.settings.hour12 ? '12-hour' : '24-hour'}. Click to switch.`); };
    syncFmt();
    fmtBtn.addEventListener('click', () => { M.setSetting('hour12', !M.settings.hour12); syncFmt(); });
    M.onSettings((k) => { if (k === 'hour12') syncFmt(); });
    document.getElementById('themeToggle').addEventListener('click', () => M.setSetting('theme', M.isDark() ? 'light' : 'dark'));
    document.getElementById('navToggle').addEventListener('click', () => (document.getElementById('sidebar').classList.contains('open') ? closeSidebar() : openSidebar()));
    document.getElementById('scrim').addEventListener('click', closeSidebar);
    document.getElementById('searchTrigger').addEventListener('click', () => openPalette());
    const pal = document.getElementById('palette'), pin = document.getElementById('paletteInput');
    pal.addEventListener('mousedown', (e) => { if (e.target === pal) closePalette(); });
    pin.addEventListener('input', () => renderPalette(pin.value));
    pin.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); palActive = Math.min(palItems.length - 1, palActive + 1); palHighlight(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palActive = Math.max(0, palActive - 1); palHighlight(); }
      else if (e.key === 'Enter') { e.preventDefault(); palRun(palActive); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });
    document.getElementById('paletteList').addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (o) palRun(+o.dataset.i); });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
      else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openPalette(); }
      else if (e.key === 'Escape') closeSidebar();
    });
    window.addEventListener('hashchange', route);
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => settingListeners.forEach(fn => fn('theme', M.settings.theme)));
    route();
    tick();
  };
})();
