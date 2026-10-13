/*
 * Meridian date/time engine.
 *
 * Pure calculation layer with no DOM access, so it can be tested in Node and in the browser.
 *
 * Design notes
 * - Civil (calendar) dates are plain {y, m, d} objects with m = 1..12. All calendar arithmetic is done
 *   on integer day numbers (days since 1970-01-01 in the proleptic Gregorian calendar), never by parsing
 *   locale strings and never by relying on the browser's local time zone.
 * - Instants are epoch milliseconds (UTC). A "wall time" is a civil date + clock time with no zone.
 * - Time-zone rules come from the IANA tz database shipped with the JavaScript engine, read through
 *   Intl.DateTimeFormat. The offset for a zone is always looked up for the specific instant, so historical
 *   rules (e.g. US DST before/after 2007) are applied automatically. No offsets are hardcoded.
 * - A zone is either {kind:'iana', id} or {kind:'fixed', offsetSec} (a literal offset such as "PST = UTC-8").
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MS_PER_SEC = 1000, MS_PER_MIN = 60000, MS_PER_HOUR = 3600000, MS_PER_DAY = 86400000;
  const MAX_EPOCH_MS = 8.64e15; // ECMAScript Date range limit
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));

  const floorDiv = (a, b) => Math.floor(a / b);
  const mod = (a, b) => ((a % b) + b) % b;
  const pad = (n, w = 2) => { const s = String(Math.abs(n)); return (n < 0 ? '-' : '') + s.padStart(w, '0'); };

  /* ------------------------------------------------------------------ */
  /* Gregorian calendar core                                             */
  /* ------------------------------------------------------------------ */

  /** Gregorian rule: divisible by 4, except centuries, unless divisible by 400. */
  function isLeapYear(y) {
    return (mod(y, 4) === 0 && mod(y, 100) !== 0) || mod(y, 400) === 0;
  }
  function daysInMonth(y, m) {
    return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  }
  function daysInYear(y) { return isLeapYear(y) ? 366 : 365; }
  function isInt(n) { return typeof n === 'number' && Number.isFinite(n) && Math.floor(n) === n; }

  /** Validate without normalising: Feb 30 is invalid, never silently March 2. */
  function validateDate(y, m, d) {
    if (!isInt(y) || !isInt(m) || !isInt(d)) return { ok: false, error: 'Year, month and day must be whole numbers.' };
    if (y < -271820 || y > 275759) return { ok: false, error: 'Year is outside the supported range (−271,820 to 275,759).' };
    if (m < 1 || m > 12) return { ok: false, error: `Month must be between 1 and 12 (got ${m}).` };
    const dim = daysInMonth(y, m);
    if (d < 1 || d > dim) {
      const why = (m === 2 && d === 29) ? ` ${formatYear(y)} is not a leap year.` : '';
      return { ok: false, error: `${MONTHS[m - 1]} ${formatYear(y)} has ${dim} days, so day ${d} does not exist.${why}` };
    }
    return { ok: true };
  }
  function isValidDate(y, m, d) { return validateDate(y, m, d).ok; }

  /** Days since 1970-01-01 (proleptic Gregorian). Howard Hinnant's algorithm; exact for all integer years. */
  function daysFromCivil(y, m, d) {
    y -= m <= 2 ? 1 : 0;
    const era = floorDiv(y, 400);
    const yoe = y - era * 400;
    const mp = m > 2 ? m - 3 : m + 9;
    const doy = floorDiv(153 * mp + 2, 5) + d - 1;
    const doe = yoe * 365 + floorDiv(yoe, 4) - floorDiv(yoe, 100) + doy;
    return era * 146097 + doe - 719468;
  }
  function civilFromDays(z) {
    z += 719468;
    const era = floorDiv(z, 146097);
    const doe = z - era * 146097;
    const yoe = floorDiv(doe - floorDiv(doe, 1460) + floorDiv(doe, 36524) - floorDiv(doe, 146096), 365);
    const y = yoe + era * 400;
    const doy = doe - (365 * yoe + floorDiv(yoe, 4) - floorDiv(yoe, 100));
    const mp = floorDiv(5 * doy + 2, 153);
    const d = doy - floorDiv(153 * mp + 2, 5) + 1;
    const m = mp < 10 ? mp + 3 : mp - 9;
    return { y: y + (m <= 2 ? 1 : 0), m, d };
  }
  const toDays = (dt) => daysFromCivil(dt.y, dt.m, dt.d);

  /** 0 = Sunday … 6 = Saturday. 1970-01-01 was a Thursday. */
  function weekday(y, m, d) { return mod(daysFromCivil(y, m, d) + 4, 7); }
  /** ISO weekday 1 = Monday … 7 = Sunday */
  function isoWeekday(y, m, d) { const w = weekday(y, m, d); return w === 0 ? 7 : w; }
  function dayOfYear(y, m, d) { return daysFromCivil(y, m, d) - daysFromCivil(y, 1, 1) + 1; }
  function daysRemainingInYear(y, m, d) { return daysInYear(y) - dayOfYear(y, m, d); }
  function quarter(m) { return Math.floor((m - 1) / 3) + 1; }
  function compareDates(a, b) { return toDays(a) - toDays(b); }

  /** ISO 8601 week: weeks start Monday; week 1 is the week containing the year's first Thursday (i.e. Jan 4). */
  function isoWeek(y, m, d) {
    const days = daysFromCivil(y, m, d);
    const wd = isoWeekday(y, m, d);
    const thursday = civilFromDays(days - wd + 4); // Thursday of this week decides the week-year
    const wy = thursday.y;
    const week = Math.floor((daysFromCivil(thursday.y, thursday.m, thursday.d) - daysFromCivil(wy, 1, 1)) / 7) + 1;
    return { year: wy, week };
  }
  function isoWeeksInYear(y) { return isoWeek(y, 12, 28).week; }

  /**
   * Week numbering conventions:
   *  iso    – ISO 8601 (Monday start, week containing Jan 4 is week 1). Week-year can differ from calendar year.
   *  us     – Sunday start, week 1 is the week containing January 1 (common in the US, e.g. many spreadsheet defaults).
   *  mideast– Saturday start, week 1 contains January 1 (used in parts of the Middle East).
   *  simple – Day-of-year based: days 1–7 are week 1, days 8–14 week 2 … (no fixed weekday start).
   */
  const WEEK_CONVENTIONS = {
    iso: 'ISO 8601 (weeks start Monday; week 1 contains the first Thursday / January 4)',
    us: 'US (weeks start Sunday; week 1 contains January 1)',
    mideast: 'Middle Eastern (weeks start Saturday; week 1 contains January 1)',
    simple: 'Simple ordinal (days 1–7 are week 1, days 8–14 week 2, …)'
  };
  function weekNumber(y, m, d, convention = 'iso') {
    if (convention === 'iso') return isoWeek(y, m, d);
    if (convention === 'simple') return { year: y, week: Math.floor((dayOfYear(y, m, d) - 1) / 7) + 1 };
    const startDow = convention === 'us' ? 0 : 6;
    const jan1 = daysFromCivil(y, 1, 1);
    const jan1Dow = mod(jan1 + 4, 7);
    const offset = mod(jan1Dow - startDow, 7); // days from week start to Jan 1
    const week = Math.floor((daysFromCivil(y, m, d) - jan1 + offset) / 7) + 1;
    return { year: y, week };
  }

  function addDays(dt, n) { return civilFromDays(toDays(dt) + n); }
  /**
   * Month arithmetic rule (documented in the UI): move the month counter, keep the day-of-month,
   * and if the target month is shorter, CLAMP to its last day. Jan 31 + 1 month = Feb 28 (or 29).
   */
  function addMonths(dt, n) {
    const total = dt.y * 12 + (dt.m - 1) + n;
    const y = floorDiv(total, 12), m = mod(total, 12) + 1;
    const dim = daysInMonth(y, m);
    return { y, m, d: Math.min(dt.d, dim), clamped: dt.d > dim };
  }
  /** Feb 29 + 1 year = Feb 28 (clamped). */
  function addYears(dt, n) { return addMonths(dt, n * 12); }
  function daysBetween(a, b) { return toDays(b) - toDays(a); }

  /**
   * Calendar difference in years / months / days, anchored at the earlier date:
   * the largest whole number of months M such that start + M months (with clamping) does not pass end,
   * then the remaining days. Result is negated when start is after end.
   */
  function calendarDiff(a, b) {
    let sign = 1;
    if (compareDates(a, b) > 0) { [a, b] = [b, a]; sign = -1; }
    let months = (b.y - a.y) * 12 + (b.m - a.m);
    if (months > 0 && compareDates(addMonths(a, months), b) > 0) months--;
    while (months > 0 && compareDates(addMonths(a, months), b) > 0) months--;
    const anchor = addMonths(a, months);
    const days = daysBetween(anchor, b);
    return { sign, years: sign * Math.floor(months / 12), months: sign * (months % 12), days: sign * days, totalMonths: sign * months, totalDays: sign * daysBetween(a, b) };
  }

  /** nth (1..5) occurrence of weekday (0=Sun) in a month, or n = -1 for the last. Returns null if absent. */
  function nthWeekdayOfMonth(y, m, wd, n) {
    if (n === -1 || n === 'last') {
      const last = daysInMonth(y, m);
      const lastWd = weekday(y, m, last);
      return { y, m, d: last - mod(lastWd - wd, 7) };
    }
    const firstWd = weekday(y, m, 1);
    const d = 1 + mod(wd - firstWd, 7) + (n - 1) * 7;
    return d <= daysInMonth(y, m) ? { y, m, d } : null;
  }

  /** Inclusive count of working days between two dates. workdays = Set of weekday indices, holidays = Set of 'YYYY-MM-DD'. */
  function countBusinessDays(a, b, workdays = new Set([1, 2, 3, 4, 5]), holidays = new Set()) {
    let sign = 1;
    let s = toDays(a), e = toDays(b);
    if (s > e) { [s, e] = [e, s]; sign = -1; }
    if (e - s > 400000) throw new RangeError('Range too large for business-day counting (limit ≈ 1,000 years).');
    let count = 0, weekend = 0, holidayHits = 0;
    for (let z = s; z <= e; z++) {
      const wd = mod(z + 4, 7);
      if (!workdays.has(wd)) { weekend++; continue; }
      if (holidays.size && holidays.has(isoDate(civilFromDays(z)))) { holidayHits++; continue; }
      count++;
    }
    return { sign, count, nonWorkingWeekdays: weekend, holidays: holidayHits, totalDays: e - s + 1 };
  }

  function sameWeek(a, b, convention = 'iso') {
    if (convention === 'iso') { const x = isoWeek(a.y, a.m, a.d), y = isoWeek(b.y, b.m, b.d); return x.year === y.year && x.week === y.week; }
    const startDow = convention === 'us' ? 0 : convention === 'mideast' ? 6 : 1;
    const sa = toDays(a) - mod(weekday(a.y, a.m, a.d) - startDow, 7);
    const sb = toDays(b) - mod(weekday(b.y, b.m, b.d) - startDow, 7);
    return sa === sb;
  }

  /* ------------------------------------------------------------------ */
  /* Formatting helpers                                                  */
  /* ------------------------------------------------------------------ */

  /** Astronomical year numbering in ISO strings; "1 BCE" style used in prose. */
  function formatYear(y) { return y > 0 ? String(y) : `${1 - y} BCE`; }
  function isoYear(y) {
    if (y >= 0 && y <= 9999) return pad(y, 4);
    return (y < 0 ? '-' : '+') + String(Math.abs(y)).padStart(6, '0');
  }
  function isoDate(dt) { return `${isoYear(dt.y)}-${pad(dt.m)}-${pad(dt.d)}`; }
  function formatDateLong(dt, withWeekday = true) {
    const wd = withWeekday ? WEEKDAYS[weekday(dt.y, dt.m, dt.d)] + ', ' : '';
    return `${wd}${MONTHS[dt.m - 1]} ${dt.d}, ${formatYear(dt.y)}`;
  }
  function formatDateShort(dt) { return `${WEEKDAYS_SHORT[weekday(dt.y, dt.m, dt.d)]} ${MONTHS_SHORT[dt.m - 1]} ${dt.d}, ${formatYear(dt.y)}`; }
  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function formatTime(h, mi, s, { hour12 = false, seconds = true, ms = null } = {}) {
    const sec = seconds ? ':' + pad(s) : '';
    const msPart = ms != null ? '.' + pad(ms, 3) : '';
    if (!hour12) return `${pad(h)}:${pad(mi)}${sec}${msPart}`;
    const ap = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${pad(mi)}${sec}${msPart} ${ap}`;
  }
  /** "UTC−08:00" with a true minus sign; seconds shown only when non-zero (historic local mean time). */
  function formatOffset(sec, { prefix = 'UTC', ascii = false } = {}) {
    const sign = sec < 0 ? (ascii ? '-' : '−') : '+';
    const a = Math.abs(sec);
    const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), s = a % 60;
    return `${prefix}${sign}${pad(h)}:${pad(m)}${s ? ':' + pad(s) : ''}`;
  }
  function isoOffset(sec) {
    if (sec === 0) return 'Z';
    return formatOffset(sec, { prefix: '', ascii: true }).replace(/:(\d\d):\d\d$/, ':$1');
  }
  function formatNumber(n, maxFrac = 6) {
    if (!Number.isFinite(n)) return String(n);
    return n.toLocaleString('en-US', { maximumFractionDigits: maxFrac });
  }
  function formatDiffHours(sec) {
    if (sec === 0) return 'same time';
    const a = Math.abs(sec), h = Math.floor(a / 3600), m = Math.round((a % 3600) / 60);
    const txt = m ? `${h}h ${m}m` : `${h}h`;
    return (sec > 0 ? '+' : '−') + txt;
  }

  /* ------------------------------------------------------------------ */
  /* Wall time <-> epoch helpers (pure, zone-free)                       */
  /* ------------------------------------------------------------------ */

  function wallToMs(w) {
    return daysFromCivil(w.y, w.m, w.d) * MS_PER_DAY + (w.h || 0) * MS_PER_HOUR + (w.mi || 0) * MS_PER_MIN + (w.s || 0) * MS_PER_SEC + (w.ms || 0);
  }
  function msToWall(ms) {
    const days = floorDiv(ms, MS_PER_DAY);
    let r = ms - days * MS_PER_DAY;
    const c = civilFromDays(days);
    const h = Math.floor(r / MS_PER_HOUR); r -= h * MS_PER_HOUR;
    const mi = Math.floor(r / MS_PER_MIN); r -= mi * MS_PER_MIN;
    const s = Math.floor(r / MS_PER_SEC); r -= s * MS_PER_SEC;
    return { y: c.y, m: c.m, d: c.d, h, mi, s, ms: Math.round(r) };
  }
  function validateTime(h, mi, s = 0, ms = 0) {
    if (![h, mi, s, ms].every(isInt)) return { ok: false, error: 'Time fields must be whole numbers.' };
    if (h < 0 || h > 23) return { ok: false, error: 'Hour must be 0–23.' };
    if (mi < 0 || mi > 59) return { ok: false, error: 'Minute must be 0–59.' };
    if (s < 0 || s > 59) return { ok: false, error: 'Second must be 0–59 (leap seconds are not represented in civil time zones).' };
    if (ms < 0 || ms > 999) return { ok: false, error: 'Milliseconds must be 0–999.' };
    return { ok: true };
  }

  /* ------------------------------------------------------------------ */
  /* Time zones                                                          */
  /* ------------------------------------------------------------------ */

  const dtfCache = new Map();
  function partsFormatter(id) {
    let f = dtfCache.get(id);
    if (!f) {
      f = new Intl.DateTimeFormat('en-US', {
        timeZone: id, hourCycle: 'h23', era: 'short',
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
      });
      dtfCache.set(id, f);
    }
    return f;
  }
  const validZoneCache = new Map();
  function isValidIanaZone(id) {
    if (typeof id !== 'string' || !id) return false;
    if (validZoneCache.has(id)) return validZoneCache.get(id);
    let ok = true;
    try { new Intl.DateTimeFormat('en-US', { timeZone: id }); } catch (e) { ok = false; }
    validZoneCache.set(id, ok);
    return ok;
  }
  function canonicalZone(id) {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: id }).resolvedOptions().timeZone; } catch (e) { return null; }
  }
  function listIanaZones() {
    try { if (Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone'); } catch (e) { /* fall through */ }
    return null;
  }
  function detectLocalZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
  }

  function ianaOffsetSec(id, epochMs) {
    if (!(Math.abs(epochMs) <= MAX_EPOCH_MS)) throw new RangeError('Instant is outside the supported range.');
    const fl = floorDiv(epochMs, 1000) * 1000;
    const parts = partsFormatter(id).formatToParts(new Date(fl));
    let y = 0, mo = 0, d = 0, h = 0, mi = 0, s = 0, era = 'AD';
    for (const p of parts) {
      switch (p.type) {
        case 'year': y = +p.value; break;
        case 'month': mo = +p.value; break;
        case 'day': d = +p.value; break;
        case 'hour': h = +p.value % 24; break;
        case 'minute': mi = +p.value; break;
        case 'second': s = +p.value; break;
        case 'era': era = p.value; break;
      }
    }
    if (/^B/i.test(era)) y = 1 - y;
    const wall = wallToMs({ y, m: mo, d, h, mi, s, ms: 0 });
    return Math.round((wall - fl) / 1000);
  }

  function zoneIana(id) { return { kind: 'iana', id }; }
  function zoneFixed(offsetSec, label) { return { kind: 'fixed', offsetSec, label: label || formatOffset(offsetSec) }; }
  const UTC = { kind: 'fixed', offsetSec: 0, label: 'UTC', isUTC: true };

  function offsetAt(zone, epochMs) {
    if (zone.kind === 'fixed') return zone.offsetSec;
    return ianaOffsetSec(zone.id, epochMs);
  }
  /** Instant -> wall clock in zone. */
  function toZoned(zone, epochMs) {
    const off = offsetAt(zone, epochMs);
    const w = msToWall(epochMs + off * 1000);
    w.offsetSec = off;
    w.epochMs = epochMs;
    w.weekday = weekday(w.y, w.m, w.d);
    return w;
  }
  /**
   * Wall clock in zone -> instant(s).
   * status 'ok': exactly one instant; 'ambiguous': two (clocks fell back, the time happened twice);
   * 'gap': none (clocks sprang forward, the time never happened). For gaps we also report the instant you get
   * by reading the wall time with the pre-transition offset (which lands *after* the gap, the common "push forward" rule).
   */
  function resolveLocal(zone, wall) {
    const local = wallToMs(wall);
    if (zone.kind === 'fixed') {
      return { status: 'ok', candidates: [{ epochMs: local - zone.offsetSec * 1000, offsetSec: zone.offsetSec }] };
    }
    const probes = [local - 2 * MS_PER_DAY, local - MS_PER_DAY / 2, local, local + MS_PER_DAY / 2, local + 2 * MS_PER_DAY]
      .filter(t => Math.abs(t) <= MAX_EPOCH_MS);
    const offsets = [...new Set(probes.map(t => offsetAt(zone, t)))];
    const cands = [];
    for (const o of offsets) {
      const t = local - o * 1000;
      if (Math.abs(t) > MAX_EPOCH_MS) continue;
      if (offsetAt(zone, t) === o && !cands.some(c => c.epochMs === t)) cands.push({ epochMs: t, offsetSec: o });
    }
    cands.sort((a, b) => a.epochMs - b.epochMs);
    if (cands.length === 1) return { status: 'ok', candidates: cands };
    if (cands.length >= 2) return { status: 'ambiguous', candidates: cands.slice(0, 2) };
    // Gap: offset before and after the transition
    const before = offsetAt(zone, local - 2 * MS_PER_DAY), after = offsetAt(zone, local + 2 * MS_PER_DAY);
    const shifted = local - before * 1000;
    const transition = findTransition(zone, local - Math.max(before, after) * 1000 - MS_PER_DAY, local - Math.min(before, after) * 1000 + MS_PER_DAY);
    return { status: 'gap', candidates: [], offsetBefore: before, offsetAfter: after, shiftedEpochMs: shifted, transition };
  }

  /** Find the first offset change in (from, to] by sampling + binary search. Returns {epochMs, before, after} or null. */
  function findTransition(zone, from, to, stepMs = 6 * MS_PER_HOUR) {
    if (zone.kind === 'fixed') return null;
    let a = from, oa = offsetAt(zone, a);
    while (a < to) {
      const b = Math.min(a + stepMs, to);
      const ob = offsetAt(zone, b);
      if (ob !== oa) {
        let lo = a, hi = b;
        while (hi - lo > 1000) {
          const mid = lo + Math.floor((hi - lo) / 2000) * 1000;
          if (mid === lo) break;
          if (offsetAt(zone, mid) === oa) lo = mid; else hi = mid;
        }
        return { epochMs: hi, before: oa, after: ob };
      }
      a = b; oa = ob;
    }
    return null;
  }
  function nextTransition(zone, fromMs, horizonDays = 400) {
    if (zone.kind === 'fixed') return null;
    // coarse daily scan first (fast), then refine
    let a = fromMs, oa = offsetAt(zone, a);
    for (let i = 0; i < horizonDays; i++) {
      const b = a + MS_PER_DAY, ob = offsetAt(zone, b);
      if (ob !== oa) return findTransition(zone, a, b, MS_PER_HOUR);
      a = b; oa = ob;
    }
    return null;
  }
  function previousTransition(zone, fromMs, horizonDays = 400) {
    if (zone.kind === 'fixed') return null;
    let b = fromMs, ob = offsetAt(zone, b);
    for (let i = 0; i < horizonDays; i++) {
      const a = b - MS_PER_DAY, oa = offsetAt(zone, a);
      if (oa !== ob) return findTransition(zone, a, b, MS_PER_HOUR);
      b = a; ob = oa;
    }
    return null;
  }

  /**
   * Standard vs daylight: we compare the current offset with the January and July offsets of that year.
   * The smaller one is treated as standard time. This matches most zones; exceptions (e.g. Morocco's Ramadan
   * suspension, zones that changed their standard offset mid-year) are noted in the UI.
   */
  function dstInfo(zone, epochMs) {
    const off = offsetAt(zone, epochMs);
    if (zone.kind === 'fixed') return { offsetSec: off, standardSec: off, daylightSec: null, observesDst: false, isDst: false };
    const y = msToWall(epochMs + off * 1000).y;
    const jan = offsetAt(zone, wallToMs({ y, m: 1, d: 15, h: 12 }));
    const jul = offsetAt(zone, wallToMs({ y, m: 7, d: 15, h: 12 }));
    const std = Math.min(jan, jul), dst = Math.max(jan, jul);
    const observesDst = jan !== jul;
    return { offsetSec: off, standardSec: std, daylightSec: observesDst ? dst : null, observesDst, isDst: observesDst && off === dst && off !== std, southern: observesDst && jan > jul };
  }

  const nameFmtCache = new Map();
  function zoneName(zone, epochMs, style = 'long') {
    if (zone.kind === 'fixed') return zone.label || formatOffset(zone.offsetSec);
    const key = zone.id + '|' + style;
    let f = nameFmtCache.get(key);
    if (f === undefined) {
      try { f = new Intl.DateTimeFormat('en-US', { timeZone: zone.id, timeZoneName: style }); } catch (e) { f = null; }
      nameFmtCache.set(key, f);
    }
    if (!f) return null;
    try {
      const p = f.formatToParts(new Date(epochMs)).find(x => x.type === 'timeZoneName');
      return p ? p.value : null;
    } catch (e) { return null; }
  }
  /** A short abbreviation only when the locale data provides a real one (e.g. PDT); otherwise null rather than invented. */
  function zoneAbbrev(zone, epochMs) {
    if (zone.kind === 'fixed') return zone.abbr || null;
    const s = zoneName(zone, epochMs, 'short');
    if (!s || /^GMT|^UTC/.test(s) && s.length > 3) return null;
    return s;
  }
  function zoneCityName(id) {
    if (!id) return '';
    const parts = id.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
  }
  function zoneLabel(zone) {
    if (zone.kind === 'fixed') return zone.label || formatOffset(zone.offsetSec);
    return zone.id;
  }

  /* ------------------------------------------------------------------ */
  /* Durations                                                           */
  /* ------------------------------------------------------------------ */

  function breakdown(ms) {
    const sign = ms < 0 ? -1 : 1;
    let a = Math.abs(ms);
    const days = Math.floor(a / MS_PER_DAY); a -= days * MS_PER_DAY;
    const hours = Math.floor(a / MS_PER_HOUR); a -= hours * MS_PER_HOUR;
    const minutes = Math.floor(a / MS_PER_MIN); a -= minutes * MS_PER_MIN;
    const seconds = Math.floor(a / MS_PER_SEC); a -= seconds * MS_PER_SEC;
    return { sign, days, hours, minutes, seconds, milliseconds: Math.round(a) };
  }
  function durationTotals(ms) {
    return {
      milliseconds: ms, seconds: ms / MS_PER_SEC, minutes: ms / MS_PER_MIN, hours: ms / MS_PER_HOUR,
      days: ms / MS_PER_DAY, weeks: ms / (7 * MS_PER_DAY)
    };
  }
  function formatBreakdown(ms, { withMs = true, compact = false } = {}) {
    const b = breakdown(ms);
    const parts = [];
    const unit = (n, w) => compact ? `${n}${w[0]}` : `${formatNumber(n)} ${w}${n === 1 ? '' : 's'}`;
    if (b.days) parts.push(unit(b.days, 'day'));
    if (b.hours) parts.push(unit(b.hours, 'hour'));
    if (b.minutes) parts.push(unit(b.minutes, 'minute'));
    if (b.seconds || (!parts.length && !b.milliseconds)) parts.push(unit(b.seconds, 'second'));
    if (withMs && b.milliseconds) parts.push(compact ? `${b.milliseconds}ms` : `${b.milliseconds} ms`);
    return (b.sign < 0 ? '−' : '') + parts.join(compact ? ' ' : ', ');
  }

  /* ------------------------------------------------------------------ */
  /* Easter                                                              */
  /* ------------------------------------------------------------------ */

  /** Western (Gregorian) Easter — Anonymous Gregorian algorithm (Meeus/Jones/Butcher). Valid for years ≥ 1583. */
  function easterWestern(y) {
    const a = mod(y, 19), b = floorDiv(y, 100), c = mod(y, 100);
    const d = floorDiv(b, 4), e = mod(b, 4), f = floorDiv(b + 8, 25), g = floorDiv(b - f + 1, 3);
    const h = mod(19 * a + b - d - g + 15, 30), i = floorDiv(c, 4), k = mod(c, 4);
    const l = mod(32 + 2 * e + 2 * i - h - k, 7), m = floorDiv(a + 11 * h + 22 * l, 451);
    const month = floorDiv(h + l - 7 * m + 114, 31), day = mod(h + l - 7 * m + 114, 31) + 1;
    return { y, m: month, d: day };
  }
  /** Julian calendar -> days since 1970 (via Julian Day Number). */
  function julianToDays(y, m, d) {
    const a = floorDiv(14 - m, 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    const jdn = d + floorDiv(153 * mm + 2, 5) + 365 * yy + floorDiv(yy, 4) - 32083;
    return jdn - 2440588;
  }
  function daysToJulian(z) {
    const c = z + 2440588 + 32082;
    const d = floorDiv(4 * c + 3, 1461), e = c - floorDiv(1461 * d, 4), m = floorDiv(5 * e + 2, 153);
    return { y: d - 4800 + floorDiv(m, 10), m: m + 3 - 12 * floorDiv(m, 10), d: e - floorDiv(153 * m + 2, 5) + 1 };
  }
  /** Orthodox Easter: Julian computus (Meeus), expressed as a Gregorian date. */
  function easterOrthodox(y) {
    const a = mod(y, 4), b = mod(y, 7), c = mod(y, 19);
    const d = mod(19 * c + 15, 30), e = mod(2 * a + 4 * b - d + 34, 7);
    const month = floorDiv(d + e + 114, 31), day = mod(d + e + 114, 31) + 1;
    const g = civilFromDays(julianToDays(y, month, day));
    return { y: g.y, m: g.m, d: g.d, julian: { y, m: month, d: day } };
  }
  /** Easter on/after a date: returns {thisYear, next, isToday}. */
  function nextEaster(today, kind = 'western') {
    const fn = kind === 'orthodox' ? easterOrthodox : easterWestern;
    let e = fn(today.y);
    const cmp = compareDates(e, today);
    if (cmp === 0) return { date: e, isToday: true, nextAfterToday: fn(today.y + 1) };
    if (cmp < 0) e = fn(today.y + 1);
    return { date: e, isToday: false, nextAfterToday: e };
  }

  /* ------------------------------------------------------------------ */
  /* Friday the 13th                                                     */
  /* ------------------------------------------------------------------ */

  function friday13InYear(y) {
    const out = [];
    for (let m = 1; m <= 12; m++) if (weekday(y, m, 13) === 5) out.push({ y, m, d: 13 });
    return out;
  }
  /** Next Friday 13th on or after `from` (inclusive) */
  function nextFriday13(from, inclusive = true) {
    let y = from.y, m = from.m;
    if (from.d > 13 || (from.d === 13 && !inclusive)) { m++; if (m > 12) { m = 1; y++; } }
    for (let i = 0; i < 400; i++) {
      if (weekday(y, m, 13) === 5) return { y, m, d: 13 };
      m++; if (m > 12) { m = 1; y++; }
    }
    return null;
  }
  function previousFriday13(from) {
    let y = from.y, m = from.m;
    if (from.d <= 13) { m--; if (m < 1) { m = 12; y--; } }
    for (let i = 0; i < 400; i++) {
      if (weekday(y, m, 13) === 5) return { y, m, d: 13 };
      m--; if (m < 1) { m = 12; y--; }
    }
    return null;
  }

  /** Leap years in [a, b] inclusive of both endpoints. */
  function countLeapYears(a, b) {
    if (a > b) [a, b] = [b, a];
    const upTo = (y) => floorDiv(y, 4) - floorDiv(y, 100) + floorDiv(y, 400); // leap years in (0..y], astronomical
    return upTo(b) - upTo(a - 1);
  }

  /* ------------------------------------------------------------------ */
  /* Seasons                                                             */
  /* ------------------------------------------------------------------ */

  function meteorologicalSeason(m, southern = false) {
    const north = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter'];
    const flip = { Winter: 'Summer', Summer: 'Winter', Spring: 'Autumn', Autumn: 'Spring' };
    const s = north[m - 1];
    return southern ? flip[s] : s;
  }
  /** Astronomical season from equinox/solstice instants (UTC instant comparison). */
  function astronomicalSeason(epochMs, southern = false) {
    const y = msToWall(epochMs).y;
    const ev = (yy) => seasonsOfYear(yy);
    const cur = ev(y);
    const order = [
      { at: ev(y - 1).december.epochMs, n: 'Winter' }, { at: cur.march.epochMs, n: 'Spring' }, { at: cur.june.epochMs, n: 'Summer' },
      { at: cur.september.epochMs, n: 'Autumn' }, { at: cur.december.epochMs, n: 'Winter' }
    ];
    let name = 'Winter', start = order[0].at, end = cur.march.epochMs;
    for (let i = 0; i < order.length; i++) {
      if (epochMs >= order[i].at) { name = order[i].n; start = order[i].at; end = i + 1 < order.length ? order[i + 1].at : ev(y + 1).march.epochMs; }
    }
    const flip = { Winter: 'Summer', Summer: 'Winter', Spring: 'Autumn', Autumn: 'Spring' };
    return { name: southern ? flip[name] : name, startMs: start, endMs: end };
  }

  /* ------------------------------------------------------------------ */
  /* Astronomy (Meeus, "Astronomical Algorithms", 2nd ed.)                */
  /* ------------------------------------------------------------------ */

  const rad = Math.PI / 180;
  const jdToMs = (jd) => (jd - 2440587.5) * MS_PER_DAY;
  const msToJd = (ms) => ms / MS_PER_DAY + 2440587.5;

  /** ΔT = TT − UT in seconds (Espenak & Meeus polynomial approximations). */
  function deltaT(year) {
    const y = year;
    let t;
    if (y < -500) { const u = (y - 1820) / 100; return -20 + 32 * u * u; }
    if (y < 500) { const u = y / 100; return 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3 - 0.1798452 * u ** 4 + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6; }
    if (y < 1600) { const u = (y - 1000) / 100; return 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3 - 0.8503463 * u ** 4 - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6; }
    if (y < 1700) { t = y - 1600; return 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129; }
    if (y < 1800) { t = y - 1700; return 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000; }
    if (y < 1860) { t = y - 1800; return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3 - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7; }
    if (y < 1900) { t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
    if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
    if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t ** 2 + 0.0020936 * t ** 3; }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547; }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718; }
    if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    if (y < 2015) { t = y - 2005; return 64.69 + 0.2930 * t; }
    // Observed ΔT has stayed near 69 s since ~2017; extrapolate gently (uncertainty is seconds, far below our stated accuracy).
    if (y < 2030) { return 67.6 + Math.min(y - 2015, 5) * 0.36; }
    if (y < 2150) { return 69.4 + 0.3 * (y - 2030) + 0.002 * (y - 2030) ** 2; }
    const u = (y - 1820) / 100; return -20 + 32 * u * u;
  }
  function jdeToEpochMs(jde) {
    const approxYear = 2000 + (jde - 2451545.0) / 365.25;
    return Math.round(jdToMs(jde) - deltaT(approxYear) * 1000);
  }

  const EQX_TERMS = [
    [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186], [182, 27.85, 445267.112],
    [156, 73.14, 45036.886], [136, 171.52, 22518.443], [77, 222.54, 65928.934], [74, 296.72, 3034.906],
    [70, 243.58, 9037.513], [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.226],
    [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417], [18, 155.12, 67555.328],
    [17, 288.79, 4562.452], [16, 198.04, 62894.029], [14, 199.76, 31436.921], [12, 95.39, 14577.848],
    [12, 287.11, 31931.756], [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074]
  ];
  /** Equinox/solstice instant. which: 0 March, 1 June, 2 September, 3 December. Accuracy ≈ ±1 minute for 1000–3000. */
  function seasonEvent(year, which) {
    let jde0;
    if (year >= 1000) {
      const Y = (year - 2000) / 1000;
      const c = [
        [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
        [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.00030],
        [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
        [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032]][which];
      jde0 = c[0] + c[1] * Y + c[2] * Y ** 2 + c[3] * Y ** 3 + c[4] * Y ** 4;
    } else {
      const Y = year / 1000;
      const c = [
        [1721139.29189, 365242.13740, 0.06134, 0.00111, -0.00071],
        [1721233.25401, 365241.72562, -0.05323, 0.00907, 0.00025],
        [1721325.70455, 365242.49558, -0.11677, -0.00297, 0.00074],
        [1721414.39987, 365242.88257, -0.00769, -0.00933, -0.00006]][which];
      jde0 = c[0] + c[1] * Y + c[2] * Y ** 2 + c[3] * Y ** 3 + c[4] * Y ** 4;
    }
    const T = (jde0 - 2451545.0) / 36525;
    const W = (35999.373 * T - 2.47) * rad;
    const dl = 1 + 0.0334 * Math.cos(W) + 0.0007 * Math.cos(2 * W);
    let S = 0;
    for (const [A, B, C] of EQX_TERMS) S += A * Math.cos((B + C * T) * rad);
    const jde = jde0 + 0.00001 * S / dl;
    return { epochMs: jdeToEpochMs(jde), jde };
  }
  function seasonsOfYear(y) {
    return { march: seasonEvent(y, 0), june: seasonEvent(y, 1), september: seasonEvent(y, 2), december: seasonEvent(y, 3) };
  }

  const PHASE_NAMES = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];
  /** True time of a lunar phase for lunation k (k integer + 0, .25, .5, .75). Accuracy ≈ a few seconds–minutes. */
  function moonPhaseJde(k) {
    const T = k / 1236.85;
    let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.000000150 * T ** 3 + 0.00000000073 * T ** 4;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const M = (2.5534 + 29.10535670 * k - 0.0000014 * T * T - 0.00000011 * T ** 3) * rad;
    const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * rad;
    const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * rad;
    const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T ** 3) * rad;
    const sin = Math.sin, cos = Math.cos;
    const frac = mod(Math.round(k * 4), 4);
    let c = 0;
    if (frac === 0 || frac === 2) {
      const n = frac === 0;
      c = (n ? -0.40720 : -0.40614) * sin(Mp) + (n ? 0.17241 : 0.17302) * E * sin(M) + (n ? 0.01608 : 0.01614) * sin(2 * Mp)
        + (n ? 0.01039 : 0.01043) * sin(2 * F) + (n ? 0.00739 : 0.00734) * E * sin(Mp - M) - (n ? 0.00514 : 0.00515) * E * sin(Mp + M)
        + (n ? 0.00208 : 0.00209) * E * E * sin(2 * M) - 0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M)
        - 0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F) - 0.00024 * E * sin(2 * Mp - M)
        - 0.00017 * sin(Om) - 0.00007 * sin(Mp + 2 * M) + 0.00004 * sin(2 * Mp - 2 * F) + 0.00004 * sin(3 * M)
        + 0.00003 * sin(Mp + M - 2 * F) + 0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) + 0.00003 * sin(Mp - M + 2 * F)
        - 0.00002 * sin(Mp - M - 2 * F) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
    } else {
      c = -0.62801 * sin(Mp) + 0.17172 * E * sin(M) - 0.01183 * E * sin(Mp + M) + 0.00862 * sin(2 * Mp) + 0.00804 * sin(2 * F)
        + 0.00454 * E * sin(Mp - M) + 0.00204 * E * E * sin(2 * M) - 0.00180 * sin(Mp - 2 * F) - 0.00070 * sin(Mp + 2 * F)
        - 0.00040 * sin(3 * Mp) - 0.00034 * E * sin(2 * Mp - M) + 0.00032 * E * sin(M + 2 * F) + 0.00032 * E * sin(M - 2 * F)
        - 0.00028 * E * E * sin(Mp + 2 * M) + 0.00027 * E * sin(2 * Mp + M) - 0.00017 * sin(Om) - 0.00005 * sin(Mp - M - 2 * F)
        + 0.00004 * sin(2 * Mp + 2 * F) - 0.00004 * sin(Mp + M + 2 * F) + 0.00004 * sin(Mp - 2 * M) + 0.00003 * sin(Mp + M - 2 * F)
        + 0.00003 * sin(3 * M) + 0.00002 * sin(2 * Mp - 2 * F) + 0.00002 * sin(Mp - M + 2 * F) - 0.00002 * sin(3 * Mp + M);
      const W = 0.00306 - 0.00038 * E * cos(M) + 0.00026 * cos(Mp) - 0.00002 * cos(Mp - M) + 0.00002 * cos(Mp + M) + 0.00002 * cos(2 * F);
      c += frac === 1 ? W : -W;
    }
    const A = [
      [299.77 + 0.107408 * k - 0.009173 * T * T, 0.000325], [251.88 + 0.016321 * k, 0.000165], [251.83 + 26.651886 * k, 0.000164],
      [349.42 + 36.412478 * k, 0.000126], [84.66 + 18.206239 * k, 0.000110], [141.74 + 53.303771 * k, 0.000062],
      [207.14 + 2.453732 * k, 0.000060], [154.84 + 7.306860 * k, 0.000056], [34.52 + 27.261239 * k, 0.000047],
      [207.19 + 0.121824 * k, 0.000042], [291.34 + 1.844379 * k, 0.000040], [161.72 + 24.198154 * k, 0.000037],
      [239.56 + 25.513099 * k, 0.000035], [331.55 + 3.592518 * k, 0.000023]];
    let add = 0;
    for (const [ang, coef] of A) add += coef * Math.sin(ang * rad);
    return jde + c + add;
  }
  /** All principal phases with instants in [startMs, endMs]. */
  function moonPhasesBetween(startMs, endMs) {
    const yearFrac = 1970 + startMs / (365.2425 * MS_PER_DAY);
    let k = Math.floor((yearFrac - 2000) * 12.3685) - 1;
    const out = [];
    for (let guard = 0; guard < 2000; guard++) {
      for (let q = 0; q < 4; q++) {
        const kk = k + q / 4;
        const ms = jdeToEpochMs(moonPhaseJde(kk));
        if (ms > endMs) return out;
        if (ms >= startMs) out.push({ phase: q, name: PHASE_NAMES[q], epochMs: ms });
      }
      k++;
    }
    return out;
  }
  /** Moon age/illumination at an instant from the surrounding new moons (age-based approximation of illumination). */
  function moonInfo(epochMs) {
    const SYN = 29.530588861;
    const span = 35 * MS_PER_DAY;
    const phases = moonPhasesBetween(epochMs - span, epochMs + span);
    const news = phases.filter(p => p.phase === 0);
    let prevNew = null, nextNew = null;
    for (const p of news) { if (p.epochMs <= epochMs) prevNew = p; else if (!nextNew) nextNew = p; }
    const ageDays = prevNew ? (epochMs - prevNew.epochMs) / MS_PER_DAY : 0;
    const lunation = prevNew && nextNew ? (nextNew.epochMs - prevNew.epochMs) / MS_PER_DAY : SYN;
    const fracCycle = ageDays / lunation;
    const illumination = (1 - Math.cos(2 * Math.PI * fracCycle)) / 2;
    let name;
    const a = fracCycle;
    if (a < 0.0339 || a >= 0.9661) name = 'New Moon';
    else if (a < 0.2161) name = 'Waxing Crescent';
    else if (a < 0.2839) name = 'First Quarter';
    else if (a < 0.4661) name = 'Waxing Gibbous';
    else if (a < 0.5339) name = 'Full Moon';
    else if (a < 0.7161) name = 'Waning Gibbous';
    else if (a < 0.7839) name = 'Last Quarter';
    else name = 'Waning Crescent';
    const upcoming = phases.filter(p => p.epochMs > epochMs).slice(0, 4);
    const recent = phases.filter(p => p.epochMs <= epochMs).slice(-4);
    return { ageDays, fraction: fracCycle, illumination, name, upcoming, recent, prevNew, nextNew };
  }

  /**
   * Sunrise/sunset (NOAA solar calculator algorithm). Returns UTC instants.
   * localNoonMs: an instant near local solar noon for the requested date (used as the evaluation day).
   * Accuracy ≈ ±1–2 minutes for |latitude| < 72°; atmospheric refraction near the horizon makes any
   * calculation uncertain by a minute or more.
   */
  function solarEvents(dateUTC, lat, lon) {
    // dateUTC: civil date {y,m,d}; we evaluate around the solar noon of that date at longitude lon.
    const base = daysFromCivil(dateUTC.y, dateUTC.m, dateUTC.d) * MS_PER_DAY;
    const calc = (ms) => {
      const jd = msToJd(ms), T = (jd - 2451545) / 36525;
      const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360);
      const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
      const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
      const C = Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
      const trueLong = L0 + C;
      const omega = 125.04 - 1934.136 * T;
      const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
      const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
      const eps = eps0 + 0.00256 * Math.cos(omega * rad);
      const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)) / rad;
      const y = Math.tan(eps * rad / 2) ** 2;
      const eqTime = 4 / rad * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad)
        - 0.5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad)); // minutes
      return { decl, eqTime };
    };
    const noonFor = (ms) => { const { eqTime } = calc(ms); return base + (720 - 4 * lon - eqTime) * MS_PER_MIN; };
    let noon = noonFor(base + (720 - 4 * lon) * MS_PER_MIN);
    noon = noonFor(noon);
    const eventAt = (altitude, rising) => {
      let t = noon;
      for (let i = 0; i < 3; i++) {
        const { decl, eqTime } = calc(t);
        const cosH = (Math.sin(altitude * rad) - Math.sin(lat * rad) * Math.sin(decl * rad)) / (Math.cos(lat * rad) * Math.cos(decl * rad));
        if (cosH > 1) return { none: 'below' }; // sun never reaches this altitude (polar night for sunrise)
        if (cosH < -1) return { none: 'above' }; // sun never drops below (midnight sun)
        const H = Math.acos(cosH) / rad;
        const noonT = base + (720 - 4 * lon - eqTime) * MS_PER_MIN;
        t = noonT + (rising ? -1 : 1) * H * 4 * MS_PER_MIN;
      }
      return { epochMs: Math.round(t) };
    };
    const { decl } = calc(noon);
    const noonAlt = 90 - Math.abs(lat - decl);
    return {
      solarNoonMs: Math.round(noon), noonAltitude: noonAlt, declination: decl,
      sunrise: eventAt(-0.833, true), sunset: eventAt(-0.833, false),
      civilDawn: eventAt(-6, true), civilDusk: eventAt(-6, false)
    };
  }

  /** Subsolar point at an instant (for drawing the day/night terminator). Low-precision (≈0.1°). */
  function sunPosition(epochMs) {
    const jd = msToJd(epochMs), T = (jd - 2451545) / 36525;
    const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360);
    const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    const C = Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
    const omega = 125.04 - 1934.136 * T;
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * rad);
    const eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(omega * rad);
    const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)) / rad;
    const y = Math.tan(eps * rad / 2) ** 2;
    const eqTime = 4 / rad * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) - 0.5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
    const utcMin = mod(epochMs, MS_PER_DAY) / MS_PER_MIN;
    let lon = -(utcMin - 720 + eqTime) / 4;
    lon = mod(lon + 180, 360) - 180;
    return { lat: decl, lon };
  }

  /* ------------------------------------------------------------------ */
  /* Parsing                                                             */
  /* ------------------------------------------------------------------ */

  /** Strict YYYY-MM-DD (also ±YYYYYY-MM-DD). Returns {ok, date} or {ok:false, error}. */
  function parseISODate(str) {
    const m = /^\s*([+-]\d{4,6}|\d{4})-(\d{1,2})-(\d{1,2})\s*$/.exec(String(str || ''));
    if (!m) return { ok: false, error: 'Use the format YYYY-MM-DD.' };
    const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
    const v = validateDate(y, mo, d);
    return v.ok ? { ok: true, date: { y, m: mo, d } } : { ok: false, error: v.error };
  }
  /** HH:MM[:SS[.fff]] or h:mm AM/PM */
  function parseTime(str) {
    const s = String(str || '').trim();
    let m = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*([AaPp]\.?[Mm]\.?)?$/.exec(s);
    if (!m) { const m2 = /^(\d{1,2})\s*([AaPp]\.?[Mm]\.?)$/.exec(s); if (m2) m = [s, m2[1], '00', null, null, m2[2]]; }
    if (!m) return { ok: false, error: 'Use HH:MM, HH:MM:SS or h:mm AM/PM.' };
    let h = +m[1]; const mi = +m[2], sec = m[3] ? +m[3] : 0, ms = m[4] ? +m[4].padEnd(3, '0') : 0;
    if (m[5]) {
      if (h < 1 || h > 12) return { ok: false, error: 'With AM/PM the hour must be 1–12.' };
      const pm = /p/i.test(m[5]);
      h = (h % 12) + (pm ? 12 : 0);
    }
    const v = validateTime(h, mi, sec, ms);
    return v.ok ? { ok: true, time: { h, mi, s: sec, ms } } : { ok: false, error: v.error };
  }

  /**
   * ISO 8601 parser (calendar dates, ordinal dates, week dates; extended & basic formats).
   * Returns wall fields, the fraction string as written (precision preserved for display), the offset (seconds,
   * or null when no designator is present = local time with unspecified zone) and the instant (when an offset is given).
   */
  function parseISO8601(input) {
    const s = String(input || '').trim();
    if (!s) return { ok: false, error: 'Enter an ISO 8601 date or timestamp, e.g. 2011-08-04T21:30:00-07:00.' };
    const re = /^([+-]\d{6}|\d{4})(?:-?(?:(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d))?|(\d{3})))?(?:[T ](\d{2})(?::?(\d{2})(?::?(\d{2})(?:[.,](\d+))?)?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
    const m = re.exec(s);
    if (!m) return { ok: false, error: 'Not a recognised ISO 8601 format. Examples: 2026-10-13, 2026-10-13T09:30:00Z, 2026-W42-2, 2026-286.' };
    const y = parseInt(m[1], 10);
    let date;
    let kind = 'calendar';
    if (m[4]) { // week date
      kind = 'week';
      const w = +m[4], wd = m[5] ? +m[5] : 1;
      if (w < 1 || w > isoWeeksInYear(y)) return { ok: false, error: `ISO week-year ${y} has ${isoWeeksInYear(y)} weeks.` };
      if (wd < 1 || wd > 7) return { ok: false, error: 'ISO weekday must be 1 (Monday) to 7 (Sunday).' };
      const jan4 = daysFromCivil(y, 1, 4);
      const week1Mon = jan4 - (isoWeekday(y, 1, 4) - 1);
      date = civilFromDays(week1Mon + (w - 1) * 7 + (wd - 1));
    } else if (m[6]) {
      kind = 'ordinal';
      const o = +m[6];
      if (o < 1 || o > daysInYear(y)) return { ok: false, error: `${y} has ${daysInYear(y)} days.` };
      date = civilFromDays(daysFromCivil(y, 1, 1) + o - 1);
    } else {
      const mo = m[2] ? +m[2] : 1, d = m[3] ? +m[3] : 1;
      const v = validateDate(y, mo, d);
      if (!v.ok) return { ok: false, error: v.error };
      date = { y, m: mo, d };
    }
    const hasTime = m[7] != null;
    let h = hasTime ? +m[7] : 0; const mi = m[8] ? +m[8] : 0, sec = m[9] ? +m[9] : 0;
    const frac = m[10] || '';
    let endOfDay = false;
    if (h === 24 && mi === 0 && sec === 0 && !/[1-9]/.test(frac)) { h = 0; endOfDay = true; }
    const tv = validateTime(h, mi, sec, 0);
    if (!tv.ok) return { ok: false, error: tv.error };
    let offsetSec = null;
    const z = m[11];
    if (z) {
      if (/z/i.test(z)) offsetSec = 0;
      else {
        const om = /([+-])(\d{2}):?(\d{2})?/.exec(z);
        const oh = +om[2], omin = om[3] ? +om[3] : 0;
        if (oh > 23 || omin > 59) return { ok: false, error: 'Offset hours must be ≤ 23 and minutes ≤ 59.' };
        offsetSec = (om[1] === '-' ? -1 : 1) * (oh * 3600 + omin * 60);
        if (offsetSec === 0 && om[1] === '-') offsetSec = 0; // "-00:00" = UTC, offset to local time unknown (RFC 3339)
      }
    }
    if (endOfDay) date = addDays(date, 1);
    const ms = frac ? parseInt(frac.slice(0, 3).padEnd(3, '0'), 10) : 0;
    const wall = { ...date, h, mi, s: sec, ms };
    const epochMs = offsetSec != null ? wallToMs(wall) - offsetSec * 1000 : null;
    return { ok: true, kind, wall, fraction: frac, hasTime, offsetSec, zDesignator: !!(z && /z/i.test(z)), negativeZero: z === '-00:00' || z === '-0000' || z === '-00', epochMs, endOfDay };
  }

  /** Unix timestamp parsing. unit: 'auto' | 's' | 'ms' | 'us' | 'ns'. Auto: |value| ≥ 1e11 → ms, ≥ 1e14 → µs, ≥ 1e17 → ns. */
  function parseUnix(input, unit = 'auto') {
    const s = String(input || '').trim().replace(/[_,\s]/g, '');
    if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return { ok: false, error: 'A Unix timestamp is a number such as 1312518600 (seconds) or 1312518600000 (milliseconds).' };
    const v = Number(s);
    let u = unit;
    if (u === 'auto') {
      const a = Math.abs(v);
      u = a >= 1e17 ? 'ns' : a >= 1e14 ? 'us' : a >= 1e11 ? 'ms' : 's';
    }
    const factor = { s: 1000, ms: 1, us: 1e-3, ns: 1e-6 }[u];
    // seconds with fraction: keep sub-millisecond exactness via string math where possible
    let epochMs;
    if (u === 's') {
      const [ip, fp = ''] = s.replace('+', '').split('.');
      const neg = ip.startsWith('-');
      const whole = Math.abs(parseInt(ip, 10));
      const msFrac = parseInt((fp + '000').slice(0, 3), 10);
      epochMs = (neg ? -1 : 1) * (whole * 1000 + msFrac);
    } else epochMs = Math.trunc(v * factor);
    if (!(Math.abs(epochMs) <= MAX_EPOCH_MS)) return { ok: false, error: 'Timestamp is outside the representable range (±8.64 × 10¹⁵ ms ≈ ±275,000 years).' };
    return { ok: true, epochMs, unit: u, autoDetected: unit === 'auto' };
  }

  const MONTH_LOOKUP = (() => {
    const o = {};
    MONTHS.forEach((n, i) => { o[n.toLowerCase()] = i + 1; o[n.slice(0, 3).toLowerCase()] = i + 1; });
    o.sept = 9;
    return o;
  })();
  /**
   * Flexible date parsing for the format converter. Returns all plausible interpretations, so an input like
   * 04/05/2011 yields both April 5 (MM/DD) and May 4 (DD/MM) instead of silently picking one.
   */
  function parseFlexibleDate(input) {
    const s = String(input || '').trim().replace(/\s+/g, ' ');
    if (!s) return { ok: false, error: 'Enter a date.' };
    const out = [];
    const push = (y, m, d, fmt) => { if (isValidDate(y, m, d) && !out.some(o => o.y === y && o.m === m && o.d === d)) out.push({ y, m, d, format: fmt }); };
    let m;
    if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s))) push(+m[1], +m[2], +m[3], 'YYYY-MM-DD');
    else if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s))) {
      let y = +m[3];
      const twoDigit = m[3].length === 2;
      if (twoDigit) y += y < 50 ? 2000 : 1900;
      const a = +m[1], b = +m[2];
      push(y, a, b, 'MM/DD/YYYY');
      push(y, b, a, 'DD/MM/YYYY');
      if (!out.length) return { ok: false, error: `Neither ${a}/${b} as month/day nor as day/month is a valid date in ${y}.` };
      return { ok: true, interpretations: out, ambiguous: out.length > 1, twoDigitYear: twoDigit };
    } else if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) push(+m[1], +m[2], +m[3], 'YYYYMMDD');
    else if ((m = /^(?:[A-Za-z]+,? )?([A-Za-z]+)\.? (\d{1,2})(?:st|nd|rd|th)?,? (-?\d{1,6})$/.exec(s))) {
      const mo = MONTH_LOOKUP[m[1].toLowerCase()]; if (mo) push(+m[3], mo, +m[2], 'Month D, YYYY');
    } else if ((m = /^(?:[A-Za-z]+,? )?(\d{1,2})(?:st|nd|rd|th)? (?:of )?([A-Za-z]+)\.?,? (-?\d{1,6})$/.exec(s))) {
      const mo = MONTH_LOOKUP[m[2].toLowerCase()]; if (mo) push(+m[3], mo, +m[1], 'D Month YYYY');
    } else if ((m = /^(\d{1,2})[- ]([A-Za-z]{3,})[- ](\d{4})$/.exec(s))) {
      const mo = MONTH_LOOKUP[m[2].toLowerCase()]; if (mo) push(+m[3], mo, +m[1], 'DD-Mon-YYYY');
    }
    if (!out.length) {
      // give a precise reason when the shape was right but the date was impossible
      return { ok: false, error: 'Could not read that date. Try 2011-08-04, 08/04/2011, 4 August 2011 or August 4, 2011. Impossible dates (such as February 30) are rejected.' };
    }
    return { ok: true, interpretations: out, ambiguous: out.length > 1 };
  }

  /** Parse "UTC+5:30", "GMT-8", "+0545", "-03" into seconds, or null. */
  function parseOffset(str) {
    const m = /^\s*(?:UTC|GMT)?\s*([+\-−])\s*(\d{1,2})(?::?(\d{2}))?\s*$/i.exec(String(str || ''));
    if (!m) { if (/^\s*(UTC|GMT|Z)\s*$/i.test(String(str || ''))) return 0; return null; }
    const h = +m[2], mi = m[3] ? +m[3] : 0;
    if (h > 18 || mi > 59) return null;
    return (m[1] === '+' ? 1 : -1) * (h * 3600 + mi * 60);
  }

  /* ------------------------------------------------------------------ */
  /* Holidays (rule-based; current rules, with start years where known)  */
  /* ------------------------------------------------------------------ */

  const nth = nthWeekdayOfMonth;
  const D = (y, m, d) => ({ y, m, d });
  function holidaysFor(country, y) {
    const E = easterWestern(y), ez = toDays(E);
    const ed = (n) => civilFromDays(ez + n);
    const list = [];
    const add = (date, name, type = 'public', note) => { if (date) list.push({ date, name, type, country, note }); };
    const usObserved = (dt, name) => { // federal "in lieu" rule
      const wd = weekday(dt.y, dt.m, dt.d);
      if (wd === 6) add(addDays(dt, -1), name + ' (observed)', 'public', 'Falls on Saturday; federal holiday observed Friday.');
      if (wd === 0) add(addDays(dt, 1), name + ' (observed)', 'public', 'Falls on Sunday; federal holiday observed Monday.');
    };
    switch (country) {
      case 'US': {
        const fixed = [[1, 1, "New Year's Day", 1870], [6, 19, 'Juneteenth National Independence Day', 2021], [7, 4, 'Independence Day', 1870], [11, 11, 'Veterans Day', 1938], [12, 25, 'Christmas Day', 1870]];
        for (const [m, d, n, since] of fixed) if (y >= since) { add(D(y, m, d), n); usObserved(D(y, m, d), n); }
        if (y >= 1986) add(nth(y, 1, 1, 3), 'Birthday of Martin Luther King, Jr.');
        if (y >= 1971) add(nth(y, 2, 1, 3), "Washington's Birthday (Presidents' Day)");
        if (y >= 1971) add(nth(y, 5, 1, -1), 'Memorial Day');
        add(nth(y, 9, 1, 1), 'Labor Day');
        if (y >= 1971) add(nth(y, 10, 1, 2), 'Columbus Day / Indigenous Peoples\' Day', 'public', 'Federal holiday; observance and name vary by state.');
        if (y >= 1942) add(nth(y, 11, 4, 4), 'Thanksgiving Day');
        add(nth(y, 5, 0, 2), "Mother's Day", 'observance');
        add(nth(y, 6, 0, 3), "Father's Day", 'observance');
        add(D(y, 2, 2), 'Groundhog Day', 'observance');
        add(D(y, 10, 31), 'Halloween', 'observance');
        if (y >= 1942) add(addDays(nth(y, 11, 4, 4), 1), 'Black Friday', 'observance', 'Day after Thanksgiving; not a federal holiday.');
        break;
      }
      case 'GB': { // England & Wales bank holidays
        const sub = (dt, name, taken) => { // substitute day rule
          let wd = weekday(dt.y, dt.m, dt.d), x = dt;
          if (wd === 6 || wd === 0) { x = addDays(dt, wd === 6 ? 2 : 1); while (taken.some(t => compareDates(t, x) === 0)) x = addDays(x, 1); add(x, name + ' (substitute day)'); taken.push(x); }
          else { add(dt, name); taken.push(dt); }
        };
        const taken = [];
        sub(D(y, 1, 1), "New Year's Day", taken);
        add(ed(-2), 'Good Friday'); add(ed(1), 'Easter Monday');
        const special = { 2020: { earlyMay: D(2020, 5, 8) }, 2022: { spring: D(2022, 6, 2), extra: [[D(2022, 6, 3), 'Platinum Jubilee bank holiday'], [D(2022, 9, 19), 'State Funeral of Queen Elizabeth II']] }, 2023: { extra: [[D(2023, 5, 8), 'Bank holiday for the Coronation of King Charles III']] }, 2012: { spring: D(2012, 6, 4), extra: [[D(2012, 6, 5), 'Diamond Jubilee bank holiday']] }, 2011: { extra: [[D(2011, 4, 29), 'Wedding of Prince William and Catherine Middleton']] } }[y] || {};
        if (y >= 1978) add(special.earlyMay || nth(y, 5, 1, 1), 'Early May bank holiday');
        if (y >= 1971) add(special.spring || nth(y, 5, 1, -1), 'Spring bank holiday');
        if (y >= 1971) add(nth(y, 8, 1, -1), 'Summer bank holiday');
        (special.extra || []).forEach(([dt, n]) => add(dt, n, 'public', 'One-off bank holiday.'));
        const xmasWd = weekday(y, 12, 25);
        if (xmasWd === 6) { add(D(y, 12, 27), 'Christmas Day (substitute day)'); add(D(y, 12, 28), 'Boxing Day (substitute day)'); }
        else if (xmasWd === 0) { add(D(y, 12, 26), 'Boxing Day'); add(D(y, 12, 27), 'Christmas Day (substitute day)'); }
        else if (xmasWd === 5) { add(D(y, 12, 25), 'Christmas Day'); add(D(y, 12, 28), 'Boxing Day (substitute day)'); }
        else { add(D(y, 12, 25), 'Christmas Day'); add(D(y, 12, 26), 'Boxing Day'); }
        add(ed(-21), 'Mothering Sunday', 'observance');
        add(nth(y, 6, 0, 3), "Father's Day", 'observance');
        add(D(y, 11, 5), 'Guy Fawkes Night', 'observance');
        add(nth(y, 11, 0, 2), 'Remembrance Sunday', 'observance');
        break;
      }
      case 'CA': {
        add(D(y, 1, 1), "New Year's Day"); add(ed(-2), 'Good Friday');
        { let v = D(y, 5, 24); while (weekday(v.y, v.m, v.d) !== 1) v = addDays(v, -1); add(v, 'Victoria Day'); }
        add(D(y, 7, 1), 'Canada Day'); add(nth(y, 9, 1, 1), 'Labour Day');
        if (y >= 2021) add(D(y, 9, 30), 'National Day for Truth and Reconciliation', 'public', 'Federal statutory holiday; provincial observance varies.');
        add(nth(y, 10, 1, 2), 'Thanksgiving'); add(D(y, 11, 11), 'Remembrance Day', 'public', 'Federal; not a statutory holiday in every province.');
        add(D(y, 12, 25), 'Christmas Day'); add(D(y, 12, 26), 'Boxing Day');
        add(ed(1), 'Easter Monday', 'public', 'Federal government holiday; not province-wide in most provinces.');
        break;
      }
      case 'DE': {
        add(D(y, 1, 1), 'Neujahr (New Year\'s Day)'); add(ed(-2), 'Karfreitag (Good Friday)'); add(ed(1), 'Ostermontag (Easter Monday)');
        add(D(y, 5, 1), 'Tag der Arbeit (Labour Day)'); add(ed(39), 'Christi Himmelfahrt (Ascension Day)'); add(ed(50), 'Pfingstmontag (Whit Monday)');
        if (y >= 1990) add(D(y, 10, 3), 'Tag der Deutschen Einheit (German Unity Day)');
        add(D(y, 12, 25), '1. Weihnachtstag (Christmas Day)'); add(D(y, 12, 26), '2. Weihnachtstag (St Stephen\'s Day)');
        break;
      }
      case 'FR': {
        add(D(y, 1, 1), 'Jour de l\'an (New Year\'s Day)'); add(ed(1), 'Lundi de Pâques (Easter Monday)'); add(D(y, 5, 1), 'Fête du Travail (Labour Day)');
        add(D(y, 5, 8), 'Victoire 1945 (Victory in Europe Day)'); add(ed(39), 'Ascension'); add(ed(50), 'Lundi de Pentecôte (Whit Monday)', 'public', 'Also a "journée de solidarité" (solidarity day) for many workers.');
        add(D(y, 7, 14), 'Fête nationale (Bastille Day)'); add(D(y, 8, 15), 'Assomption (Assumption)'); add(D(y, 11, 1), 'Toussaint (All Saints\' Day)');
        add(D(y, 11, 11), 'Armistice 1918'); add(D(y, 12, 25), 'Noël (Christmas Day)');
        break;
      }
      case 'AU': {
        add(D(y, 1, 1), "New Year's Day"); add(D(y, 1, 26), 'Australia Day', 'public', 'If it falls on a weekend, most states observe the following Monday.');
        add(ed(-2), 'Good Friday'); add(ed(-1), 'Easter Saturday', 'public', 'Public holiday in most states and territories (not Tasmania/WA).'); add(ed(1), 'Easter Monday');
        add(D(y, 4, 25), 'Anzac Day'); add(D(y, 12, 25), 'Christmas Day'); add(D(y, 12, 26), 'Boxing Day');
        add(nth(y, 6, 1, 2), "King's Birthday", 'public', 'Second Monday of June in most states; Queensland and WA use other dates.');
        break;
      }
    }
    return list.sort((a, b) => compareDates(a.date, b.date));
  }
  /** Worldwide religious / cultural observances computable by rule. Lunar-calendar observances are not included. */
  function observancesFor(y) {
    const E = easterWestern(y), O = easterOrthodox(y);
    const ed = (n) => addDays(E, n);
    const list = [
      [D(y, 1, 1), "New Year's Day (Gregorian)", 'cultural'],
      [D(y, 1, 6), 'Epiphany', 'religious', 'Western Christian.'],
      [D(y, 1, 7), 'Orthodox Christmas', 'religious', 'December 25 in the Julian calendar (Gregorian January 7 for 1900–2099).'],
      [D(y, 2, 14), "Valentine's Day", 'cultural'],
      [ed(-47), 'Shrove Tuesday / Mardi Gras', 'religious', 'Day before Ash Wednesday (Western).'],
      [ed(-46), 'Ash Wednesday', 'religious', 'Start of Lent (Western).'],
      [D(y, 3, 8), "International Women's Day", 'cultural', 'UN observance.'],
      [D(y, 3, 17), "St Patrick's Day", 'cultural', 'Public holiday in Ireland and Northern Ireland.'],
      [ed(-7), 'Palm Sunday', 'religious', 'Western.'],
      [ed(-2), 'Good Friday', 'religious', 'Western.'],
      [E, 'Easter Sunday (Western)', 'religious', 'Gregorian computus.'],
      [O, 'Easter Sunday (Orthodox)', 'religious', 'Julian computus.'],
      [D(y, 4, 1), "April Fools' Day", 'cultural'],
      [D(y, 4, 22), 'Earth Day', 'cultural'],
      [ed(39), 'Ascension Day', 'religious', 'Western.'],
      [ed(49), 'Pentecost (Whit Sunday)', 'religious', 'Western.'],
      [D(y, 10, 31), 'Halloween', 'cultural'],
      [D(y, 11, 1), "All Saints' Day", 'religious'],
      [D(y, 12, 24), 'Christmas Eve', 'religious'],
      [D(y, 12, 25), 'Christmas Day', 'religious'],
      [D(y, 12, 31), "New Year's Eve", 'cultural']
    ];
    // First Sunday of Advent: fourth Sunday before Christmas
    let adv = D(y, 12, 25); adv = addDays(adv, -(weekday(adv.y, adv.m, adv.d) || 7) - 21);
    list.push([adv, 'First Sunday of Advent', 'religious', 'Western.']);
    return list.map(([date, name, type, note]) => ({ date, name, type, country: 'INTL', note })).sort((a, b) => compareDates(a.date, b.date));
  }
  const HOLIDAY_COUNTRIES = { US: 'United States (federal)', GB: 'United Kingdom (England & Wales)', CA: 'Canada (federal)', DE: 'Germany (national)', FR: 'France', AU: 'Australia (national)' };

  return {
    // constants
    MS_PER_SEC, MS_PER_MIN, MS_PER_HOUR, MS_PER_DAY, WEEKDAYS, WEEKDAYS_SHORT, MONTHS, MONTHS_SHORT, WEEK_CONVENTIONS, PHASE_NAMES, HOLIDAY_COUNTRIES, UTC,
    // helpers
    pad, mod, floorDiv, ordinal, formatNumber,
    // calendar
    isLeapYear, daysInMonth, daysInYear, validateDate, isValidDate, daysFromCivil, civilFromDays, toDays, weekday, isoWeekday,
    dayOfYear, daysRemainingInYear, quarter, compareDates, isoWeek, isoWeeksInYear, weekNumber, addDays, addMonths, addYears, daysBetween,
    calendarDiff, nthWeekdayOfMonth, countBusinessDays, sameWeek, countLeapYears, julianToDays, daysToJulian,
    // formatting
    formatYear, isoYear, isoDate, formatDateLong, formatDateShort, formatTime, formatOffset, isoOffset, formatDiffHours,
    // wall/epoch
    wallToMs, msToWall, validateTime,
    // zones
    isValidIanaZone, canonicalZone, listIanaZones, detectLocalZone, ianaOffsetSec, zoneIana, zoneFixed, offsetAt, toZoned, resolveLocal,
    findTransition, nextTransition, previousTransition, dstInfo, zoneName, zoneAbbrev, zoneCityName, zoneLabel,
    // durations
    breakdown, durationTotals, formatBreakdown,
    // easter / f13 / seasons
    easterWestern, easterOrthodox, nextEaster, friday13InYear, nextFriday13, previousFriday13, meteorologicalSeason, astronomicalSeason,
    // astronomy
    deltaT, seasonEvent, seasonsOfYear, moonPhaseJde, moonPhasesBetween, moonInfo, solarEvents, sunPosition, msToJd, jdToMs,
    // parsing
    parseISODate, parseTime, parseISO8601, parseUnix, parseFlexibleDate, parseOffset,
    // holidays
    holidaysFor, observancesFor
  };
});
