/* Meridian — Date & time calculator: elapsed time, date arithmetic, weekdays, business days, time arithmetic, age, comparison */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  const AVG_MONTH_DAYS = 30.436875, AVG_YEAR_DAYS = 365.2425; // Gregorian averages (146097 days / 400 years)
  let root, tab = 'elapsed';
  const panes = {};

  /**
   * Shared endpoint resolution: returns {instant} or an explanation for gaps/overlaps with controls to choose.
   * state = {choice: null|0|1, gap: bool}; name is used for the radio group.
   */
  M.resolveEndpoint = (zone, wall, state, name, label) => {
    const r = TE.resolveLocal(zone, wall);
    if (r.status === 'ok') return { instant: r.candidates[0].epochMs, html: '' };
    if (r.status === 'ambiguous') {
      const opts = r.candidates.map((c, i) => `<label><input type="radio" name="${name}" value="${i}" ${state.choice === i ? 'checked' : ''}><div><b>${i ? 'Second' : 'First'} occurrence</b> (${esc(TE.formatOffset(c.offsetSec))}${TE.zoneAbbrev(zone, c.epochMs) ? ' ' + esc(TE.zoneAbbrev(zone, c.epochMs)) : ''}) <span class="mono tiny">${esc(new Date(c.epochMs).toISOString())}</span></div></label>`).join('');
      const html = `<div class="note warn small" style="margin-top:8px"><strong>${esc(label)}: ${esc(M.fmtTime(wall))} happened twice</strong> on ${esc(TE.formatDateShort(wall))} (clocks were set back). Choose one:<div class="ambig-choices">${opts}</div></div>`;
      return { instant: state.choice != null ? r.candidates[state.choice].epochMs : null, html, needsChoice: state.choice == null };
    }
    const shifted = TE.toZoned(zone, r.shiftedEpochMs);
    const html = `<div class="note warn small" style="margin-top:8px"><strong>${esc(label)}: ${esc(M.fmtTime(wall))} does not exist</strong> on ${esc(TE.formatDateShort(wall))} in ${esc(M.refShort(zone))} — clocks jumped from ${esc(TE.formatOffset(r.offsetBefore))} to ${esc(TE.formatOffset(r.offsetAfter))}. ${state.gap ? `Using ${esc(M.fmtTime(shifted))} (shifted forward).` : `<button class="btn btn-sm" data-gapfix="${name}">Use ${esc(M.fmtTime(shifted))} instead</button>`}</div>`;
    return { instant: state.gap ? r.shiftedEpochMs : null, html, needsChoice: !state.gap };
  };

  const dateField = (id, label, value, extra = '') => `<div class="field" ${extra}><label for="${id}">${esc(label)}</label><input class="input" type="date" id="${id}" value="${value ? M.dateInputValue(value) : ''}"></div>`;
  const numField = (id, label, value, attrs = '') => `<div class="field"><label for="${id}">${esc(label)}</label><input class="input num-input" type="number" id="${id}" value="${value}" ${attrs}></div>`;
  const errBox = (errs) => `<div class="note error">${errs.map(esc).join('<br>')}</div>`;
  const statsGrid = (pairs) => `<div class="grid auto-sm">${pairs.map(([k, v, d]) => `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${v}</div>${d ? `<div class="d">${d}</div>` : ''}</div>`).join('')}</div>`;

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('calc', 'Date & Time Calculator', 'Exact elapsed time between time-zone-aware timestamps, calendar arithmetic with clearly stated rules, business days, time arithmetic and more.')}
      <div class="tabs" role="tablist" id="calcTabs">
        <button role="tab" data-tab="elapsed">Elapsed time</button>
        <button role="tab" data-tab="date">Add & subtract dates</button>
        <button role="tab" data-tab="between">Days between dates</button>
        <button role="tab" data-tab="weekday">Weekday finder</button>
        <button role="tab" data-tab="business">Business days</button>
        <button role="tab" data-tab="time">Time arithmetic</button>
        <button role="tab" data-tab="age">Age & anniversaries</button>
        <button role="tab" data-tab="compare">Compare dates</button>
      </div>
      <div id="calcPane"></div>`;
    M.$('#calcTabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    M.bindCopy(el);
  }
  function setTab(t, params = {}) {
    if (!BUILDERS[t]) t = 'elapsed';
    tab = t;
    M.$$('#calcTabs [data-tab]', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    const pane = M.$('#calcPane', root);
    Object.values(panes).forEach(p => { p.el.hidden = true; });
    if (!panes[t]) { const el = document.createElement('div'); pane.appendChild(el); panes[t] = { el, api: BUILDERS[t](el) }; }
    panes[t].el.hidden = false;
    if (panes[t].api && panes[t].api.params) panes[t].api.params(params);
    history.replaceState(null, '', M.link('calc', { tab: t, ...params }));
  }

  /* ================= Elapsed time ================= */
  function buildElapsed(el) {
    const now = M.today();
    el.innerHTML = `
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><h2>Start</h2><button class="btn btn-sm" data-now="a">Now</button></div><div class="stack" id="elA"></div></div>
        <div class="card"><div class="card-head"><h2>End</h2><button class="btn btn-sm" data-now="b">Now</button></div><div class="stack" id="elB"></div></div>
      </div>
      <div class="row section-gap" style="align-items:center">
        <button class="btn" id="elSwap">${M.icon('swap')} Swap endpoints</button>
        <div class="example-links"><span class="muted">Examples:</span><button data-ex="1">LA → Berlin, Aug 2011</button><button data-ex="2">Across a DST change</button><button data-ex="3">Across New Year</button><button data-ex="4">Reversed order</button></div>
      </div>
      <div id="elOut" class="section-gap"></div>`;
    const mk = (box, label, def) => {
      const b = M.$(box, el);
      const row = M.el(`<div class="row"><div class="field" style="flex:0 1 190px"><label>Date</label><input class="input" type="date"></div><div style="flex:1 1 250px" data-t></div><div class="field" style="flex:0 0 90px"><label>ms</label><input class="input num-input" type="number" min="0" max="999" value="0" aria-label="${label} milliseconds"></div></div>`);
      b.appendChild(row);
      const date = row.querySelector('input[type=date]'); date.setAttribute('aria-label', label + ' date'); date.value = M.dateInputValue(def.date);
      const ms = row.querySelectorAll('input')[1];
      const tf = M.timeField(row.querySelector('[data-t]'), { label: 'Time', value: def.time, onChange: () => compute(true) });
      const zp = M.zonePicker(b, { label: 'Time zone or location (choose UTC for UTC input)', value: def.zone, onChange: () => compute(true) });
      date.addEventListener('input', () => compute(true)); ms.addEventListener('input', () => compute(true));
      return { date, ms, tf, zp, state: { choice: null, gap: false } };
    };
    const A = mk('#elA', 'Start', { date: now, time: { h: 9, mi: 0, s: 0 }, zone: M.localZone() });
    const B = mk('#elB', 'End', { date: TE.addDays(now, 1), time: { h: 17, mi: 30, s: 0 }, zone: M.utcZone() });
    const setEP = (E, d, t, z) => { E.date.value = d; E.tf.set(t, true); E.zp.set(z, true); E.ms.value = 0; };
    const city = (n) => M.cityRef(M.D.CITIES.find(c => c.name === n));
    el.addEventListener('click', (e) => {
      const n = e.target.closest('[data-now]');
      if (n) { const E = n.dataset.now === 'a' ? A : B; const w = TE.toZoned(E.zp.get() || M.localZone(), Date.now()); E.date.value = M.dateInputValue(w); E.tf.set({ h: w.h, mi: w.mi, s: w.s }, true); E.ms.value = w.ms; compute(true); }
      const x = e.target.closest('[data-ex]');
      if (x) {
        const k = x.dataset.ex;
        if (k === '1') { setEP(A, '2011-08-04', { h: 21, mi: 30, s: 0 }, city('Los Angeles')); setEP(B, '2011-08-06', { h: 14, mi: 15, s: 0 }, city('Berlin')); }
        if (k === '2') { setEP(A, '2024-03-09', { h: 12, mi: 0, s: 0 }, city('New York')); setEP(B, '2024-03-10', { h: 12, mi: 0, s: 0 }, city('New York')); }
        if (k === '3') { setEP(A, '2024-12-31', { h: 23, mi: 0, s: 0 }, city('Tokyo')); setEP(B, '2025-01-01', { h: 1, mi: 0, s: 0 }, city('London')); }
        if (k === '4') { setEP(A, '2011-08-06', { h: 14, mi: 15, s: 0 }, city('Berlin')); setEP(B, '2011-08-04', { h: 21, mi: 30, s: 0 }, city('Los Angeles')); }
        compute(true);
      }
      const g = e.target.closest('[data-gapfix]'); if (g) { (g.dataset.gapfix === 'elA' ? A : B).state.gap = true; compute(false); }
    });
    el.addEventListener('change', (e) => { if (e.target.name === 'elA' || e.target.name === 'elB') { (e.target.name === 'elA' ? A : B).state.choice = +e.target.value; compute(false); } });
    M.$('#elSwap', el).addEventListener('click', () => {
      const a = { d: A.date.value, t: A.tf.get(), z: A.zp.get(), ms: A.ms.value }, b = { d: B.date.value, t: B.tf.get(), z: B.zp.get(), ms: B.ms.value };
      setEP(A, b.d, b.t || { h: 0, mi: 0, s: 0 }, b.z); A.ms.value = b.ms; setEP(B, a.d, a.t || { h: 0, mi: 0, s: 0 }, a.z); B.ms.value = a.ms; compute(true);
    });
    M.onSettings(() => compute(false));
    function readEP(E, label, name) {
      const errs = [];
      const d = M.readDate(E.date, label + ' date'); if (!d.ok) errs.push(d.error);
      const t = E.tf.get(); if (!t) errs.push(`${label} time is invalid.`);
      const ms = E.ms.value === '' ? 0 : +E.ms.value; if (!Number.isInteger(ms) || ms < 0 || ms > 999) errs.push(`${label} milliseconds must be 0–999.`);
      const z = E.zp.get(); if (!z) errs.push(`${label} time zone is required.`);
      if (errs.length) return { errs };
      const wall = { ...d.date, ...t, ms };
      const r = M.resolveEndpoint(z, wall, E.state, name, label);
      return { wall, zone: z, ...r };
    }
    function compute(reset) {
      if (reset) { A.state = { choice: null, gap: false }; B.state = { choice: null, gap: false }; }
      const out = M.$('#elOut', el);
      const a = readEP(A, 'Start', 'elA'), b = readEP(B, 'End', 'elB');
      const errs = [...(a.errs || []), ...(b.errs || [])];
      if (errs.length) { out.innerHTML = errBox(errs); return; }
      let html = a.html + b.html;
      if (a.instant == null || b.instant == null) { out.innerHTML = html; return; }
      const diff = b.instant - a.instant;
      const tot = TE.durationTotals(diff), bd = TE.breakdown(diff);
      const aw = TE.toZoned(a.zone, a.instant), bw = TE.toZoned(b.zone, b.instant);
      const first = diff >= 0 ? 'start' : 'end';
      const sign = diff < 0 ? '−' : '';
      const dec = (v, n = 6) => TE.formatNumber(v, n);
      // calendar view in the start zone's local calendar
      const bInA = TE.toZoned(a.zone, b.instant);
      const cal = wallCalendarDiff(aw, bInA);
      const human = `From ${M.fmtDateTime(aw, { seconds: true })} ${TE.formatOffset(aw.offsetSec)} (${M.refShort(a.zone)}) to ${M.fmtDateTime(bw, { seconds: true })} ${TE.formatOffset(bw.offsetSec)} (${M.refShort(b.zone)}) is ${diff === 0 ? 'zero time' : TE.formatBreakdown(Math.abs(diff))}${diff < 0 ? ' backwards (the end is before the start)' : ''}.`;
      html += `<div class="card highlight">
        <div class="card-head"><h2>Elapsed time</h2><button class="btn btn-sm" data-copy="${esc(human)}">${M.icon('copy')} Copy</button></div>
        <div class="result-big">${diff === 0 ? 'No time elapsed' : esc(sign + TE.formatBreakdown(Math.abs(diff)))}</div>
        <p class="small" style="margin-top:6px">${diff === 0 ? 'Both endpoints are the same instant.' : `<span class="badge ${diff > 0 ? 'success' : 'amber'}">${diff > 0 ? 'Positive' : 'Negative'} duration</span> The <b>${first}</b> event comes first${diff < 0 ? ' — swap the endpoints for a positive duration' : ''}.`}</p>
        <p class="small muted">${esc(human)}</p>
      </div>
      <div class="grid cols-2 section-gap">
        <div class="card"><h3 style="margin-bottom:10px">Exact totals</h3>
          <div class="table-wrap"><table class="table"><tbody>
            ${[['Milliseconds', TE.formatNumber(tot.milliseconds)], ['Seconds', dec(tot.seconds, 3)], ['Minutes', dec(tot.minutes)], ['Hours', dec(tot.hours)], ['Days (24 h)', dec(tot.days)], ['Weeks (7 days)', dec(tot.weeks)]].map(([k, v]) => `<tr><td>${k}</td><td class="num mono">${v}</td><td class="right"><button class="icon-btn sm" data-copy="${esc(v.replace(/,/g, ''))}" aria-label="Copy ${k}">${M.icon('copy')}</button></td></tr>`).join('')}
            <tr><td>Combined</td><td class="num mono" colspan="2">${sign}${TE.formatNumber(bd.days)}d ${bd.hours}h ${bd.minutes}m ${bd.seconds}s ${bd.milliseconds}ms</td></tr>
          </tbody></table></div>
          <p class="tiny muted" style="margin-top:8px">Totals are exact, computed from absolute UTC instants. “Days” here means 24-hour periods of elapsed time.</p>
        </div>
        <div class="card"><h3 style="margin-bottom:10px">How it was computed</h3>
          <ol class="small" style="padding-left:18px;margin:0">
            <li>Start: ${esc(M.fmtDateTime(aw, { seconds: true }))} in ${esc(M.refShort(a.zone))} used ${esc(TE.formatOffset(aw.offsetSec))} → <span class="mono">${esc(new Date(a.instant).toISOString())}</span></li>
            <li>End: ${esc(M.fmtDateTime(bw, { seconds: true }))} in ${esc(M.refShort(b.zone))} used ${esc(TE.formatOffset(bw.offsetSec))} → <span class="mono">${esc(new Date(b.instant).toISOString())}</span></li>
            <li>End − start = ${esc(TE.formatNumber(diff))} ms.</li>
          </ol>
          <hr class="sep">
          <h3 style="margin-bottom:6px">Calendar view</h3>
          <p class="small" style="margin:0">${cal.text}</p>
          <p class="tiny muted">Measured on ${esc(M.refShort(a.zone))}’s wall clock and calendar (end converted to that zone: ${esc(M.fmtDateTime(bInA))}). Calendar months and years vary in length, and wall-clock hours can differ from elapsed hours across DST changes${cal.wallHours !== null && Math.abs(cal.wallMs - Math.abs(diff)) > 0 ? ` — here the wall clock moved ${esc(TE.formatBreakdown(cal.wallMs))} while ${esc(TE.formatBreakdown(Math.abs(diff)))} actually elapsed` : ''}.</p>
          <hr class="sep">
          <h3 style="margin-bottom:6px">Approximate long units</h3>
          <p class="small" style="margin:0">${dec(tot.days / AVG_MONTH_DAYS, 4)} average months · ${dec(tot.days / AVG_YEAR_DAYS, 5)} average years</p>
          <p class="tiny muted">Using Gregorian averages: 1 month = ${AVG_MONTH_DAYS} days, 1 year = ${AVG_YEAR_DAYS} days. These are conventions, not exact calendar durations.</p>
        </div>
      </div>`;
      out.innerHTML = html;
      M.addRecentDebounced('Elapsed', `${M.refShort(a.zone)} ${TE.isoDate(aw)} → ${M.refShort(b.zone)} ${TE.isoDate(bw)}: ${sign}${TE.formatBreakdown(Math.abs(diff), { compact: true })}`, location.hash);
    }
    compute(true);
    return {};
  }
  /** Calendar difference between two wall times (y/m/d + h/m/s), anchored at the earlier one. */
  function wallCalendarDiff(a, b) {
    let sign = 1;
    const am = TE.wallToMs(a), bm = TE.wallToMs(b);
    if (bm < am) { [a, b] = [b, a]; sign = -1; }
    const tA = a.h * 3600000 + a.mi * 60000 + a.s * 1000 + (a.ms || 0), tB = b.h * 3600000 + b.mi * 60000 + b.s * 1000 + (b.ms || 0);
    let dB = { y: b.y, m: b.m, d: b.d }, t = tB - tA;
    if (t < 0) { dB = TE.addDays(dB, -1); t += 86400000; }
    const c = TE.calendarDiff({ y: a.y, m: a.m, d: a.d }, dB);
    const bd = TE.breakdown(t);
    const parts = [];
    if (c.years) parts.push(M.plural(c.years, 'year')); if (c.months) parts.push(M.plural(c.months, 'month')); if (c.days) parts.push(M.plural(c.days, 'day'));
    if (bd.hours) parts.push(M.plural(bd.hours, 'hour')); if (bd.minutes) parts.push(M.plural(bd.minutes, 'minute')); if (bd.seconds) parts.push(M.plural(bd.seconds, 'second'));
    return { text: (sign < 0 ? '−' : '') + (parts.join(', ') || 'no difference'), wallMs: Math.abs(bm - am), wallHours: (bm - am) / 3600000 };
  }

  /* ================= Add & subtract dates ================= */
  function buildDate(el) {
    el.innerHTML = `
      <div class="card">
        <div class="row">
          ${dateField('daStart', 'Start date', M.today(), 'style="flex:0 1 200px"')}
          <div class="field" style="flex:0 0 130px"><label for="daOp">Operation</label><select class="select" id="daOp"><option value="1">Add (+)</option><option value="-1">Subtract (−)</option></select></div>
          ${numField('daY', 'Years', 0, 'min="0" step="1"')}${numField('daM', 'Months', 0, 'min="0" step="1"')}${numField('daW', 'Weeks', 0, 'min="0" step="1"')}${numField('daD', 'Days', 30, 'min="0" step="1"')}
        </div>
        <div class="example-links" style="margin-top:10px"><span class="muted">Examples:</span><button data-ex="jan31">Jan 31 + 1 month</button><button data-ex="leap">Feb 29 2024 + 1 year</button><button data-ex="100">Today + 100 days</button><button data-ex="sub">Today − 6 weeks</button></div>
        <div id="daOut" class="result"></div>
        <details class="explain"><summary>Rules used</summary>
          <p>Years and months are applied first, then weeks and days. When a month or year step lands on a day that doesn’t exist (e.g. January 31 + 1 month, or February 29 + 1 year), the result is <b>clamped to the last day of the target month</b> (February 28/29). Weeks are exactly 7 days. All dates use the proleptic Gregorian calendar. Subtracting applies every component in reverse.</p>
        </details>
      </div>`;
    const ids = ['daStart', 'daOp', 'daY', 'daM', 'daW', 'daD'];
    ids.forEach(i => M.$('#' + i, el).addEventListener('input', compute));
    el.querySelector('.example-links').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ex]'); if (!b) return;
      const set = (d, op, y, m, w, dd) => { M.$('#daStart', el).value = d; M.$('#daOp', el).value = op; M.$('#daY', el).value = y; M.$('#daM', el).value = m; M.$('#daW', el).value = w; M.$('#daD', el).value = dd; compute(); };
      const t = M.dateInputValue(M.today());
      ({ jan31: () => set('2023-01-31', 1, 0, 1, 0, 0), leap: () => set('2024-02-29', 1, 1, 0, 0, 0), 100: () => set(t, 1, 0, 0, 0, 100), sub: () => set(t, -1, 0, 0, 6, 0) })[b.dataset.ex]();
    });
    function compute() {
      const out = M.$('#daOut', el);
      const s = M.readDate(M.$('#daStart', el), 'Start date');
      const nums = ['daY', 'daM', 'daW', 'daD'].map(i => M.$('#' + i, el).value === '' ? 0 : Number(M.$('#' + i, el).value));
      const errs = [];
      if (!s.ok) errs.push(s.error);
      if (nums.some(n => !Number.isInteger(n) || Math.abs(n) > 1e7)) errs.push('Amounts must be whole numbers (up to 10,000,000).');
      if (errs.length) { out.innerHTML = errBox(errs); return; }
      const sign = +M.$('#daOp', el).value;
      const [y, m, w, d] = nums.map(n => n * sign);
      let cur = s.date; const steps = []; let clampNote = '';
      if (y || m) { const r = TE.addMonths(cur, y * 12 + m); if (r.clamped) clampNote = `Day ${cur.d} doesn’t exist in ${TE.MONTHS[r.m - 1]} ${r.y}, so the result was clamped to the ${TE.ordinal(r.d)}.`; cur = { y: r.y, m: r.m, d: r.d }; steps.push(`${sign > 0 ? '+' : '−'}${Math.abs(y) ? M.plural(Math.abs(y), 'year') + ' ' : ''}${Math.abs(m) ? M.plural(Math.abs(m), 'month') : ''} → ${TE.formatDateShort(cur)}`); }
      if (w || d) { cur = TE.addDays(cur, w * 7 + d); steps.push(`${sign > 0 ? '+' : '−'}${Math.abs(w * 7 + d)} days${w ? ` (${M.plural(Math.abs(w), 'week')}${d ? ` + ${M.plural(Math.abs(d), 'day')}` : ''})` : ''} → ${TE.formatDateShort(cur)}`); }
      if (cur.y < -271820 || cur.y > 275759) { out.innerHTML = errBox(['Result is outside the supported range.']); return; }
      const total = TE.daysBetween(s.date, cur);
      const text = TE.formatDateLong(cur);
      out.innerHTML = `<div class="card flat"><div class="small muted">Result</div><div class="result-big">${esc(text)}</div>
        <div class="row tight" style="margin:8px 0"><span class="badge primary">${esc(TE.WEEKDAYS[TE.weekday(cur.y, cur.m, cur.d)])}</span><span class="badge">${esc(TE.isoDate(cur))}</span><span class="badge">Day ${TE.dayOfYear(cur.y, cur.m, cur.d)} of ${cur.y}</span><span class="badge">ISO week ${TE.isoWeek(cur.y, cur.m, cur.d).week}</span><span class="badge">${total >= 0 ? '+' : ''}${TE.formatNumber(total)} days from start</span></div>
        ${clampNote ? `<div class="note info small">${esc(clampNote)}</div>` : ''}
        ${steps.length ? `<ol class="small" style="padding-left:18px;margin:8px 0 0">${steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '<p class="small muted">No change — all amounts are zero.</p>'}
        <div class="row tight" style="margin-top:10px"><button class="btn btn-sm" data-copy="${esc(text)}">${M.icon('copy')} Copy</button><a class="btn btn-sm btn-ghost" href="${M.link('explorer', { date: TE.isoDate(cur) })}">Explore this date</a></div></div>`;
      M.addRecentDebounced('Date math', `${TE.isoDate(s.date)} ${sign > 0 ? '+' : '−'} ${[y && M.plural(Math.abs(y), 'y', 'y'), m && M.plural(Math.abs(m), 'mo', 'mo'), w && M.plural(Math.abs(w), 'w', 'w'), d && M.plural(Math.abs(d), 'd', 'd')].filter(Boolean).join(' ')} = ${TE.isoDate(cur)}`, location.hash);
    }
    compute();
    return { params: (p) => { if (p.date) { const r = TE.parseISODate(p.date); if (r.ok) { M.$('#daStart', el).value = M.dateInputValue(r.date); compute(); } } } };
  }

  /* ================= Days between ================= */
  function buildBetween(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="card">
        <div class="row">${dateField('dbA', 'From', t, 'style="flex:0 1 200px"')}${dateField('dbB', 'To', { y: t.y, m: 12, d: 31 }, 'style="flex:0 1 200px"')}
          <button class="btn" id="dbSwap" style="flex:0 0 auto">${M.icon('swap')} Swap</button>
          <div class="field" style="flex:0 0 auto"><span class="label">Count weekday N days later</span><div class="row tight" style="flex-wrap:nowrap"><input class="input num-input" id="dbN" type="number" value="1000" style="width:110px" aria-label="Number of days"><span class="small muted">days after “From”</span></div></div>
        </div>
        <div id="dbOut" class="result"></div>
      </div>`;
    ['dbA', 'dbB', 'dbN'].forEach(i => M.$('#' + i, el).addEventListener('input', compute));
    M.$('#dbSwap', el).addEventListener('click', () => { const a = M.$('#dbA', el).value; M.$('#dbA', el).value = M.$('#dbB', el).value; M.$('#dbB', el).value = a; compute(); });
    function compute() {
      const out = M.$('#dbOut', el);
      const a = M.readDate(M.$('#dbA', el), 'From'), b = M.readDate(M.$('#dbB', el), 'To');
      if (!a.ok || !b.ok) { out.innerHTML = errBox([a.error, b.error].filter(Boolean)); return; }
      const n = TE.daysBetween(a.date, b.date);
      const cal = TE.calendarDiff(a.date, b.date);
      const abs = Math.abs(n);
      const lo = n >= 0 ? a.date : b.date, hi = n >= 0 ? b.date : a.date;
      const wk = TE.countBusinessDays(lo, hi);
      const N = +M.$('#dbN', el).value;
      const later = Number.isInteger(N) && Math.abs(N) < 1e8 ? TE.addDays(a.date, N) : null;
      out.innerHTML = `<div class="result-big">${TE.formatNumber(n)} day${abs === 1 ? '' : 's'}</div>
        <p class="small muted">${n === 0 ? 'Same date.' : `${esc(TE.formatDateLong(b.date))} is ${TE.formatNumber(abs)} days ${n > 0 ? 'after' : 'before'} ${esc(TE.formatDateLong(a.date))}.`} Counting convention: the difference excludes the start date and includes the end date (like counting nights). Counting both endpoints gives <b>${TE.formatNumber(abs + 1)}</b> days.</p>
        ${statsGrid([
          ['Calendar difference', `${cal.years ? M.plural(Math.abs(cal.years), 'year') + ', ' : ''}${M.plural(Math.abs(cal.months), 'month')}, ${M.plural(Math.abs(cal.days), 'day')}`, 'Anchored at the earlier date; month-end clamping'],
          ['Weeks', `${Math.floor(abs / 7)} w ${abs % 7} d`, `${TE.formatNumber(abs / 7, 4)} weeks`],
          ['Weekdays (Mon–Fri)', TE.formatNumber(wk.count), `In the inclusive range ${TE.isoDate(lo)} … ${TE.isoDate(hi)}`],
          ['Weekend days', TE.formatNumber(wk.nonWorkingWeekdays), 'Saturdays + Sundays, inclusive range'],
          ['Hours (24 h days)', TE.formatNumber(abs * 24), 'Calendar days × 24; actual elapsed time may differ by ±1 h across DST'],
          ['Months (avg.)', TE.formatNumber(abs / AVG_MONTH_DAYS, 3), `1 month = ${AVG_MONTH_DAYS} days (Gregorian average)`]
        ])}
        ${later ? `<div class="note" style="margin-top:12px">${TE.formatNumber(N)} days after ${esc(TE.formatDateShort(a.date))} is <b>${esc(TE.formatDateLong(later))}</b>${N % 7 === 0 ? ' — the same weekday, since it’s a whole number of weeks' : ''}.</div>` : ''}
        <div class="row tight" style="margin-top:10px"><button class="btn btn-sm" data-copy="${n}">${M.icon('copy')} Copy day count</button></div>`;
    }
    compute();
    return {};
  }

  /* ================= Weekday finder ================= */
  function buildWeekday(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="grid cols-2">
        <div class="card"><h2 style="margin-bottom:10px">Nth weekday of a month</h2>
          <div class="row">
            <div class="field"><label for="nwN">Occurrence</label><select class="select" id="nwN"><option value="1">First</option><option value="2">Second</option><option value="3">Third</option><option value="4">Fourth</option><option value="5">Fifth</option><option value="-1">Last</option></select></div>
            <div class="field"><label for="nwW">Weekday</label><select class="select" id="nwW">${TE.WEEKDAYS.map((w, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${w}</option>`).join('')}</select></div>
            <div class="field"><label for="nwM">Month</label><select class="select" id="nwM">${TE.MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === t.m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
            ${numField('nwY', 'Year', t.y, 'step="1"')}
          </div>
          <div class="example-links" style="margin-top:8px"><span class="muted">e.g.</span><button data-nw="4,4,11">Thanksgiving (4th Thu Nov)</button><button data-nw="-1,1,5">Memorial Day (last Mon May)</button><button data-nw="2,0,5">Mother’s Day (2nd Sun May)</button><button data-nw="-1,5,${t.m}">Last Friday this month</button></div>
          <div id="nwOut" class="result"></div>
        </div>
        <div class="card"><h2 style="margin-bottom:10px">Month & year boundaries</h2>
          <div class="row">
            <div class="field"><label for="mbM">Month</label><select class="select" id="mbM">${TE.MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === t.m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
            ${numField('mbY', 'Year', t.y, 'step="1"')}
          </div>
          <div id="mbOut" class="result"></div>
        </div>
      </div>`;
    ['nwN', 'nwW', 'nwM', 'nwY'].forEach(i => M.$('#' + i, el).addEventListener('input', nth));
    ['mbM', 'mbY'].forEach(i => M.$('#' + i, el).addEventListener('input', bounds));
    el.querySelector('.example-links').addEventListener('click', (e) => { const b = e.target.closest('[data-nw]'); if (!b) return; const [n, w, m] = b.dataset.nw.split(','); M.$('#nwN', el).value = n; M.$('#nwW', el).value = w; M.$('#nwM', el).value = m; nth(); });
    const readY = (id) => { const v = Number(M.$('#' + id, el).value); return Number.isInteger(v) && v >= -271820 && v <= 275759 ? v : null; };
    function nth() {
      const n = +M.$('#nwN', el).value, w = +M.$('#nwW', el).value, m = +M.$('#nwM', el).value, y = readY('nwY');
      const out = M.$('#nwOut', el);
      if (y == null) { out.innerHTML = errBox(['Enter a valid year.']); return; }
      const r = TE.nthWeekdayOfMonth(y, m, w, n);
      const all = [1, 2, 3, 4, 5].map(k => TE.nthWeekdayOfMonth(y, m, w, k)).filter(Boolean);
      const label = `${n === -1 ? 'Last' : ['First', 'Second', 'Third', 'Fourth', 'Fifth'][n - 1]} ${TE.WEEKDAYS[w]} of ${TE.MONTHS[m - 1]} ${TE.formatYear(y)}`;
      out.innerHTML = r ? `<div class="small muted">${esc(label)}</div><div class="result-big">${esc(TE.formatDateLong(r))}</div><p class="small">${esc(M.relDays(TE.daysBetween(M.today(), r)))} · All ${TE.WEEKDAYS[w]}s that month: ${all.map(d => d.d).join(', ')} (${all.length})</p><button class="btn btn-sm" data-copy="${esc(TE.formatDateLong(r))}">${M.icon('copy')} Copy</button>`
        : `<div class="note warn">${esc(TE.MONTHS[m - 1])} ${TE.formatYear(y)} has only ${all.length} ${TE.WEEKDAYS[w]}s (${all.map(d => d.d).join(', ')}), so there is no fifth one.</div>`;
    }
    function bounds() {
      const m = +M.$('#mbM', el).value, y = readY('mbY');
      const out = M.$('#mbOut', el);
      if (y == null) { out.innerHTML = errBox(['Enter a valid year.']); return; }
      const first = { y, m, d: 1 }, last = { y, m, d: TE.daysInMonth(y, m) };
      let fb = first; while ([0, 6].includes(TE.weekday(fb.y, fb.m, fb.d))) fb = TE.addDays(fb, 1);
      let lb = last; while ([0, 6].includes(TE.weekday(lb.y, lb.m, lb.d))) lb = TE.addDays(lb, -1);
      const wk = TE.countBusinessDays(first, last);
      out.innerHTML = `<div class="table-wrap"><table class="table"><tbody>
        <tr><td>First day of month</td><td>${esc(TE.formatDateLong(first))}</td></tr>
        <tr><td>Last day of month</td><td>${esc(TE.formatDateLong(last))}</td></tr>
        <tr><td>Days in month</td><td>${TE.daysInMonth(y, m)}${m === 2 ? (TE.isLeapYear(y) ? ' (leap year)' : ' (common year)') : ''}</td></tr>
        <tr><td>Weekdays (Mon–Fri)</td><td>${wk.count}</td></tr>
        <tr><td>First / last weekday</td><td>${esc(TE.formatDateShort(fb))} / ${esc(TE.formatDateShort(lb))}</td></tr>
        <tr><td>First day of year</td><td>${esc(TE.formatDateLong({ y, m: 1, d: 1 }))}</td></tr>
        <tr><td>Last day of year</td><td>${esc(TE.formatDateLong({ y, m: 12, d: 31 }))}</td></tr>
        <tr><td>Days in year</td><td>${TE.daysInYear(y)} · ISO weeks: ${TE.isoWeeksInYear(y)}</td></tr>
        <tr><td>Quarter</td><td>Q${TE.quarter(m)}: ${esc(TE.MONTHS_SHORT[(TE.quarter(m) - 1) * 3])} 1 – ${esc(TE.MONTHS_SHORT[TE.quarter(m) * 3 - 1])} ${TE.daysInMonth(y, TE.quarter(m) * 3)}</td></tr>
      </tbody></table></div>`;
    }
    nth(); bounds();
    return {};
  }

  /* ================= Business days ================= */
  function buildBusiness(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="card">
        <div class="row">
          ${dateField('bdA', 'Start date', t, 'style="flex:0 1 200px"')}${dateField('bdB', 'End date', TE.addDays(t, 30), 'style="flex:0 1 200px"')}
          <div class="field" style="flex:0 1 260px"><label for="bdCal">Holiday calendar</label><select class="select" id="bdCal"><option value="">None</option>${Object.entries(TE.HOLIDAY_COUNTRIES).map(([k, v]) => `<option value="${k}" ${k === M.settings.holidayCountry ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        </div>
        <div class="field" style="margin-top:12px"><span class="label">Working days</span><div class="row tight" id="bdDays">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="check"><input type="checkbox" value="${d}" ${d >= 1 && d <= 5 ? 'checked' : ''}> ${TE.WEEKDAYS_SHORT[d]}</label>`).join('')}</div></div>
        <div class="field" style="margin-top:12px"><label for="bdCustom">Extra non-working dates <span class="muted">(optional, YYYY-MM-DD, one per line or comma-separated)</span></label><textarea class="input" id="bdCustom" rows="2" placeholder="2026-12-24, 2026-12-31"></textarea></div>
        <div id="bdOut" class="result"></div>
        <hr class="sep">
        <h3>Add business days</h3>
        <div class="row" style="margin-top:8px">${numField('bdN', 'Business days to add (negative to subtract)', 10, 'step="1"')}<div class="small muted" style="flex:2 1 300px">Starting from the start date above, using the same working days and holidays. The start date itself is not counted.</div></div>
        <div id="bdAddOut" class="result"></div>
      </div>`;
    el.addEventListener('input', compute); el.addEventListener('change', compute);
    function compute() {
      const out = M.$('#bdOut', el), out2 = M.$('#bdAddOut', el);
      const a = M.readDate(M.$('#bdA', el), 'Start'), b = M.readDate(M.$('#bdB', el), 'End');
      const work = new Set(M.$$('#bdDays input', el).filter(i => i.checked).map(i => +i.value));
      const errs = [];
      if (!a.ok) errs.push(a.error); if (!b.ok) errs.push(b.error);
      if (!work.size) errs.push('Select at least one working day.');
      const custom = M.$('#bdCustom', el).value.split(/[\s,;]+/).filter(Boolean);
      const holidays = new Map();
      for (const c of custom) { const r = TE.parseISODate(c); if (!r.ok) errs.push(`“${c}”: ${r.error}`); else holidays.set(TE.isoDate(r.date), 'Custom'); }
      if (errs.length) { out.innerHTML = errBox(errs); out2.innerHTML = ''; return; }
      const cal = M.$('#bdCal', el).value;
      const lo = TE.compareDates(a.date, b.date) <= 0 ? a.date : b.date, hi = lo === a.date ? b.date : a.date;
      if (cal) for (let y = lo.y; y <= Math.min(hi.y, lo.y + 200); y++) TE.holidaysFor(cal, y).filter(h => h.type === 'public').forEach(h => { const k = TE.isoDate(h.date); if (!holidays.has(k)) holidays.set(k, h.name); });
      let r;
      try { r = TE.countBusinessDays(a.date, b.date, work, new Set(holidays.keys())); } catch (e) { out.innerHTML = errBox([e.message]); return; }
      const hitList = [...holidays.entries()].filter(([k]) => { const d = TE.parseISODate(k).date; return TE.compareDates(d, lo) >= 0 && TE.compareDates(d, hi) <= 0 && work.has(TE.weekday(d.y, d.m, d.d)); }).sort();
      out.innerHTML = `<div class="result-big">${TE.formatNumber(r.count)} business day${r.count === 1 ? '' : 's'}</div>
        <p class="small muted">Inclusive of both ${esc(TE.formatDateShort(lo))} and ${esc(TE.formatDateShort(hi))} (${TE.formatNumber(r.totalDays)} calendar days): ${TE.formatNumber(r.nonWorkingWeekdays)} non-working weekdays and ${TE.formatNumber(r.holidays)} holiday${r.holidays === 1 ? '' : 's'} on working days excluded.</p>
        ${hitList.length ? `<details class="explain" ${hitList.length <= 6 ? 'open' : ''}><summary>Holidays excluded (${hitList.length})</summary><ul class="small" style="margin:0;padding-left:18px">${hitList.slice(0, 60).map(([k, n]) => `<li>${esc(TE.formatDateShort(TE.parseISODate(k).date))} — ${esc(n)}</li>`).join('')}</ul></details>` : ''}
        ${cal ? `<p class="tiny muted">Built-in ${esc(TE.HOLIDAY_COUNTRIES[cal])} public holidays (rule-based; includes observed/substitute days). Regional holidays are not included.</p>` : ''}
        <button class="btn btn-sm" data-copy="${r.count}">${M.icon('copy')} Copy</button>`;
      const N = Number(M.$('#bdN', el).value);
      if (!Number.isInteger(N) || Math.abs(N) > 100000) { out2.innerHTML = errBox(['Enter a whole number of business days (up to 100,000).']); return; }
      let cur = a.date, left = Math.abs(N), dir = N < 0 ? -1 : 1, guard = 0;
      const extraHol = new Map(holidays);
      while (left > 0 && guard++ < 2000000) {
        cur = TE.addDays(cur, dir);
        if (cal && !extraHol.has(`y${cur.y}`)) { extraHol.set(`y${cur.y}`, 1); TE.holidaysFor(cal, cur.y).filter(h => h.type === 'public').forEach(h => { const k = TE.isoDate(h.date); if (!extraHol.has(k)) extraHol.set(k, h.name); }); }
        if (work.has(TE.weekday(cur.y, cur.m, cur.d)) && !extraHol.has(TE.isoDate(cur))) left--;
      }
      out2.innerHTML = `<div class="result-mid">${esc(TE.formatDateLong(cur))}</div><p class="small muted">${TE.formatNumber(Math.abs(N))} business days ${N < 0 ? 'before' : 'after'} ${esc(TE.formatDateShort(a.date))} (${TE.formatNumber(Math.abs(TE.daysBetween(a.date, cur)))} calendar days).</p>`;
    }
    compute();
    return {};
  }

  /* ================= Time arithmetic ================= */
  function buildTime(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="grid cols-2">
        <div class="card"><h2 style="margin-bottom:10px">Clock arithmetic</h2>
          <div class="row"><div id="taTime" style="flex:1 1 250px"></div>
            <div class="field" style="flex:0 0 110px"><label for="taOp">Operation</label><select class="select" id="taOp"><option value="1">Add</option><option value="-1">Subtract</option></select></div></div>
          <div class="row" style="margin-top:8px">${numField('taH', 'Hours', 10)}${numField('taM', 'Minutes', 45)}${numField('taS', 'Seconds', 0)}</div>
          <div id="taOut" class="result"></div>
          <p class="tiny muted">Pure clock arithmetic on a 24-hour dial (no time zone or DST). Day changes are reported.</p>
        </div>
        <div class="card"><h2 style="margin-bottom:10px">Duration converter</h2>
          <div class="row">${numField('dcD', 'Days', 0)}${numField('dcH', 'Hours', 36)}${numField('dcM', 'Minutes', 0)}${numField('dcS', 'Seconds', 0)}${numField('dcMs', 'ms', 0)}</div>
          <div id="dcOut" class="result"></div>
          <p class="tiny muted">Negative values allowed. Days are 24-hour periods.</p>
        </div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:4px">Add a duration to a timestamp</h2>
        <p class="small muted" style="margin-top:0">Shows the difference between adding <b>elapsed time</b> (e.g. exactly 24 hours) and advancing the <b>local calendar</b> (e.g. “same time tomorrow”) — they differ across daylight-saving changes.</p>
        <div class="row">${dateField('tsDate', 'Date', t, 'style="flex:0 1 190px"')}<div id="tsTime" style="flex:1 1 250px"></div><div id="tsZone" style="flex:2 1 280px"></div></div>
        <div class="row" style="margin-top:8px"><div class="field" style="flex:0 0 110px"><label for="tsOp">Operation</label><select class="select" id="tsOp"><option value="1">Add</option><option value="-1">Subtract</option></select></div>${numField('tsD', 'Days', 1)}${numField('tsH', 'Hours', 0)}${numField('tsM', 'Minutes', 0)}${numField('tsS', 'Seconds', 0)}</div>
        <div class="example-links" style="margin-top:8px"><span class="muted">Try:</span><button data-ts="1">New York, day before spring-forward + 1 day</button><button data-ts="2">London, day before fall-back + 1 day</button></div>
        <div id="tsOut" class="result"></div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:10px">Time until / since</h2>
        <div class="row">${dateField('tuDate', 'Date', { y: t.y + 1, m: 1, d: 1 }, 'style="flex:0 1 190px"')}<div id="tuTime" style="flex:1 1 250px"></div><div id="tuZone" style="flex:2 1 280px"></div></div>
        <div id="tuOut" class="result" aria-live="off"></div>
      </div>`;
    const taTime = M.timeField(M.$('#taTime', el), { label: 'Start time', value: { h: 21, mi: 30, s: 0 }, onChange: clock });
    ['taOp', 'taH', 'taM', 'taS'].forEach(i => M.$('#' + i, el).addEventListener('input', clock));
    ['dcD', 'dcH', 'dcM', 'dcS', 'dcMs'].forEach(i => M.$('#' + i, el).addEventListener('input', conv));
    const tsTime = M.timeField(M.$('#tsTime', el), { label: 'Time', value: { h: 12, mi: 0, s: 0 }, onChange: () => stamp(true) });
    const tsZone = M.zonePicker(M.$('#tsZone', el), { label: 'Time zone', value: M.localZone(), onChange: () => stamp(true) });
    ['tsDate', 'tsOp', 'tsD', 'tsH', 'tsM', 'tsS'].forEach(i => M.$('#' + i, el).addEventListener('input', () => stamp(true)));
    const tuTime = M.timeField(M.$('#tuTime', el), { label: 'Time', value: { h: 0, mi: 0, s: 0 }, onChange: () => until(true) });
    const tuZone = M.zonePicker(M.$('#tuZone', el), { label: 'Time zone', value: M.localZone(), onChange: () => until(true) });
    M.$('#tuDate', el).addEventListener('input', () => until(true));
    const tsState = { choice: null, gap: false }, tuState = { choice: null, gap: false };
    el.addEventListener('change', (e) => { if (e.target.name === 'tsEP') { tsState.choice = +e.target.value; stamp(false); } if (e.target.name === 'tuEP') { tuState.choice = +e.target.value; until(false); } });
    el.addEventListener('click', (e) => {
      const g = e.target.closest('[data-gapfix]'); if (g) { if (g.dataset.gapfix === 'tsEP') { tsState.gap = true; stamp(false); } else { tuState.gap = true; until(false); } }
      const x = e.target.closest('[data-ts]'); if (x) {
        const city = (n) => M.cityRef(M.D.CITIES.find(c => c.name === n));
        if (x.dataset.ts === '1') { M.$('#tsDate', el).value = '2024-03-09'; tsTime.set({ h: 12, mi: 0, s: 0 }, true); tsZone.set(city('New York'), true); }
        else { M.$('#tsDate', el).value = '2024-10-26'; tsTime.set({ h: 12, mi: 0, s: 0 }, true); tsZone.set(city('London'), true); }
        ['tsD', 'tsH', 'tsM', 'tsS'].forEach((i, k) => { M.$('#' + i, el).value = k === 0 ? 1 : 0; }); M.$('#tsOp', el).value = 1; stamp(true);
      }
    });
    const num = (id) => { const v = M.$('#' + id, el).value; return v === '' ? 0 : Number(v); };
    function clock() {
      const out = M.$('#taOut', el), st = taTime.get();
      const vals = [num('taH'), num('taM'), num('taS')];
      if (!st || vals.some(v => !Number.isFinite(v))) { out.innerHTML = errBox(['Enter valid numbers.']); return; }
      const sign = +M.$('#taOp', el).value;
      const durMs = Math.round((vals[0] * 3600 + vals[1] * 60 + vals[2]) * 1000) * sign;
      const startMs = (st.h * 3600 + st.mi * 60 + st.s) * 1000;
      const total = startMs + durMs;
      const dayShift = Math.floor(total / 86400000);
      const w = TE.msToWall(TE.mod(total, 86400000));
      out.innerHTML = `<div class="result-big">${esc(M.fmtTime(w, { seconds: true }))}</div><p class="small">${dayShift === 0 ? 'Same day' : `<span class="badge ${dayShift > 0 ? 'primary' : 'amber'}">${dayShift > 0 ? '+' : ''}${dayShift} day${Math.abs(dayShift) > 1 ? 's' : ''}</span> ${dayShift > 0 ? 'later (crossed midnight)' : 'earlier'}`} · ${esc(M.fmtTime(st, { seconds: true }))} ${sign > 0 ? '+' : '−'} ${esc(TE.formatBreakdown(Math.abs(durMs)))}</p>`;
    }
    function conv() {
      const out = M.$('#dcOut', el);
      const ms = Math.round(num('dcD') * 86400000 + num('dcH') * 3600000 + num('dcM') * 60000 + num('dcS') * 1000 + num('dcMs'));
      if (!Number.isFinite(ms)) { out.innerHTML = errBox(['Enter valid numbers.']); return; }
      const t = TE.durationTotals(ms);
      out.innerHTML = `<div class="result-mid">${esc(TE.formatBreakdown(ms) || '0 seconds')}</div>
        <div class="table-wrap" style="margin-top:8px"><table class="table"><tbody>${[['Milliseconds', t.milliseconds], ['Seconds', t.seconds], ['Minutes', t.minutes], ['Hours', t.hours], ['Days', t.days], ['Weeks', t.weeks]].map(([k, v]) => `<tr><td>${k}</td><td class="num mono">${TE.formatNumber(v, 6)}</td></tr>`).join('')}
        <tr><td>h:mm:ss.mmm</td><td class="num mono">${ms < 0 ? '−' : ''}${Math.floor(Math.abs(ms) / 3600000)}:${TE.pad(Math.floor(Math.abs(ms) / 60000) % 60)}:${TE.pad(Math.floor(Math.abs(ms) / 1000) % 60)}.${TE.pad(Math.abs(ms) % 1000, 3)}</td></tr></tbody></table></div>`;
    }
    function stamp(reset) {
      if (reset) { tsState.choice = null; tsState.gap = false; }
      const out = M.$('#tsOut', el);
      const d = M.readDate(M.$('#tsDate', el)), tt = tsTime.get(), z = tsZone.get();
      const vals = [num('tsD'), num('tsH'), num('tsM'), num('tsS')];
      const errs = []; if (!d.ok) errs.push(d.error); if (!tt) errs.push('Invalid time.'); if (!z) errs.push('Choose a time zone.');
      if (vals.some(v => !Number.isInteger(v))) errs.push('Duration fields must be whole numbers.');
      if (errs.length) { out.innerHTML = errBox(errs); return; }
      const wall = { ...d.date, ...tt, ms: 0 };
      const ep = M.resolveEndpoint(z, wall, tsState, 'tsEP', 'Start');
      if (ep.instant == null) { out.innerHTML = ep.html; return; }
      const sign = +M.$('#tsOp', el).value;
      const [dd, hh, mm, ss] = vals.map(v => v * sign);
      // A) exact elapsed duration
      const elapsedMs = ((dd * 24 + hh) * 3600 + mm * 60 + ss) * 1000;
      const A = TE.toZoned(z, ep.instant + elapsedMs);
      // B) calendar: advance local date by days, then add the clock duration as elapsed time
      const target = TE.addDays(d.date, dd);
      const rb = TE.resolveLocal(z, { ...target, ...tt, ms: 0 });
      let bInstant, bNote = '';
      if (rb.status === 'ok') bInstant = rb.candidates[0].epochMs;
      else if (rb.status === 'ambiguous') { bInstant = rb.candidates[0].epochMs; bNote = ' The local time occurs twice on that day; the first occurrence is shown.'; }
      else { bInstant = rb.shiftedEpochMs; bNote = ' That local time does not exist on the target day (DST gap); shifted forward.'; }
      const B = TE.toZoned(z, bInstant + (hh * 3600 + mm * 60 + ss) * 1000);
      const same = A.epochMs === B.epochMs;
      out.innerHTML = ep.html + `<div class="grid cols-2">
        <div class="card flat"><div class="small muted">Elapsed duration (exact)</div><div class="result-mid">${esc(M.fmtDateTime(A, { seconds: true }))}</div><div class="small">${esc(TE.formatOffset(A.offsetSec))} · start ${sign > 0 ? '+' : '−'} exactly ${esc(TE.formatBreakdown(Math.abs(elapsedMs)) || '0 seconds')} of real time</div></div>
        <div class="card flat"><div class="small muted">Calendar days (local clock)</div><div class="result-mid">${esc(M.fmtDateTime(B, { seconds: true }))}</div><div class="small">${esc(TE.formatOffset(B.offsetSec))} · date ${sign > 0 ? '+' : '−'} ${M.plural(Math.abs(dd), 'calendar day')}, same wall-clock time${hh || mm || ss ? ', then the hours/minutes/seconds' : ''}.${esc(bNote)}</div></div>
      </div>
      <div class="note ${same ? '' : 'info'} small" style="margin-top:10px">${same ? 'Both methods agree — no clock change happens in this interval.' : `The results differ by ${esc(TE.formatBreakdown(Math.abs(B.epochMs - A.epochMs)))} because ${esc(M.refShort(z))} changes its UTC offset in between (${esc(TE.formatOffset(TE.offsetAt(z, ep.instant)))} → ${esc(TE.formatOffset(A.offsetSec))}). “One day later” on the calendar is not always 24 elapsed hours.`}</div>`;
    }
    function until(reset) {
      if (reset) { tuState.choice = null; tuState.gap = false; }
      const out = M.$('#tuOut', el);
      const d = M.readDate(M.$('#tuDate', el)), tt = tuTime.get(), z = tuZone.get();
      if (!d.ok || !tt || !z) { out.innerHTML = errBox([d.error || '', !tt ? 'Invalid time.' : '', !z ? 'Choose a time zone.' : ''].filter(Boolean)); return; }
      const ep = M.resolveEndpoint(z, { ...d.date, ...tt, ms: 0 }, tuState, 'tuEP', 'Target');
      if (ep.instant == null) { out.innerHTML = ep.html; return; }
      out.dataset.instant = ep.instant;
      out.dataset.extra = ep.html;
      liveUntil(Date.now());
    }
    function liveUntil(now) {
      const out = M.$('#tuOut', el);
      if (!out.dataset.instant) return;
      const target = +out.dataset.instant, diff = target - now;
      const b = TE.breakdown(diff);
      const z = tuZone.get(), w = TE.toZoned(z, target);
      out.innerHTML = (out.dataset.extra || '') + `<div class="small muted">${diff >= 0 ? 'Time remaining until' : 'Time elapsed since'} ${esc(M.fmtDateTime(w))} ${esc(M.refShort(z))}</div>
        <div class="countdown-grid" style="margin-top:8px">${[['days', b.days], ['hours', b.hours], ['minutes', b.minutes], ['seconds', b.seconds]].map(([k, v]) => `<div class="u"><b>${TE.formatNumber(v)}</b><span>${k}</span></div>`).join('')}</div>
        <p class="small muted" style="margin-top:8px">= ${TE.formatNumber(Math.abs(diff / 3600000), 2)} hours = ${TE.formatNumber(Math.abs(Math.floor(diff / 1000)))} seconds ${diff >= 0 ? 'remaining' : 'elapsed'}. Your local time: ${esc(M.fmtDateTime(TE.toZoned(M.localZone(), target)))}.</p>`;
    }
    clock(); conv(); stamp(true); until(true);
    return { tick: liveUntil };
  }

  /* ================= Age & anniversary ================= */
  function buildAge(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="card">
        <div class="row">
          ${dateField('agB', 'Date of birth / start date', { y: 2000, m: 2, d: 29 }, 'style="flex:0 1 220px"')}
          ${dateField('agT', 'As of', t, 'style="flex:0 1 200px"')}
          <div class="field" style="flex:1 1 260px"><label for="agLeap">Feb 29 anniversaries in common years</label><select class="select" id="agLeap"><option value="feb28">Celebrate on February 28</option><option value="mar1">Celebrate on March 1</option></select></div>
        </div>
        <div id="agOut" class="result"></div>
        <details class="explain"><summary>Conventions</summary><p>Age in years/months/days is anchored at the start date with month-end clamping, so it never assumes a year is 365 days or a month 30 days. For a February 29 start date, the anniversary in non-leap years is observed on the date you choose above (legal conventions differ by country). An age increases on the anniversary date itself.</p></details>
      </div>`;
    el.addEventListener('input', compute);
    function anniv(b, y, rule) {
      if (b.m === 2 && b.d === 29 && !TE.isLeapYear(y)) return rule === 'mar1' ? { y, m: 3, d: 1 } : { y, m: 2, d: 28 };
      return { y, m: b.m, d: b.d };
    }
    function compute() {
      const out = M.$('#agOut', el);
      const b = M.readDate(M.$('#agB', el), 'Start date'), a = M.readDate(M.$('#agT', el), 'As of');
      if (!b.ok || !a.ok) { out.innerHTML = errBox([b.error, a.error].filter(Boolean)); return; }
      const rule = M.$('#agLeap', el).value;
      const B = b.date, T = a.date;
      if (TE.compareDates(B, T) > 0) { out.innerHTML = `<div class="note warn">The start date is after the “as of” date — that date is ${TE.formatNumber(TE.daysBetween(T, B))} days in the future.</div>`; return; }
      // completed years using the chosen leap rule
      let years = T.y - B.y;
      if (TE.compareDates(anniv(B, T.y, rule), T) > 0) years--;
      const lastAnn = anniv(B, B.y + years, rule);
      let months = 0; while (TE.compareDates(TE.addMonths(lastAnn, months + 1), T) <= 0) months++;
      const days = TE.daysBetween(TE.addMonths(lastAnn, months), T);
      let nextY = T.y; if (TE.compareDates(anniv(B, nextY, rule), T) <= 0) nextY++;
      const next = anniv(B, nextY, rule);
      const isToday = TE.compareDates(anniv(B, T.y, rule), T) === 0;
      const totalDays = TE.daysBetween(B, T);
      const milestones = [1000, 5000, 10000, 15000, 20000, 25000, 30000].map(n => ({ n, d: TE.addDays(B, n) })).filter(m => TE.compareDates(m.d, T) > 0).slice(0, 2);
      out.innerHTML = `${isToday ? `<div class="note success" style="margin-bottom:10px">🎉 Today is the anniversary — ${M.plural(years, 'year')}!</div>` : ''}
        <div class="small muted">Age as of ${esc(TE.formatDateLong(T))}</div><div class="result-big">${M.plural(years, 'year')}, ${M.plural(months, 'month')}, ${M.plural(days, 'day')}</div>
        ${statsGrid([
          ['Total days', TE.formatNumber(totalDays), `${TE.formatNumber(totalDays + 1)} counting both dates`],
          ['Total weeks', `${TE.formatNumber(Math.floor(totalDays / 7))} w ${totalDays % 7} d`, ''],
          ['Total months', TE.formatNumber(years * 12 + months), 'Completed calendar months'],
          ['Born on a', esc(TE.WEEKDAYS[TE.weekday(B.y, B.m, B.d)]), esc(TE.formatDateLong(B, false))],
          ['Next anniversary', esc(TE.formatDateShort(next)), `${esc(M.relDays(TE.daysBetween(T, next)))} · turns ${years + 1}${B.m === 2 && B.d === 29 && !TE.isLeapYear(next.y) ? ' (leap-day rule applied)' : ''}`],
          ...milestones.map(m => [`${TE.formatNumber(m.n)} days old`, esc(TE.formatDateShort(m.d)), esc(M.relDays(TE.daysBetween(T, m.d)))])
        ])}`;
    }
    compute();
    return {};
  }

  /* ================= Compare dates ================= */
  function buildCompare(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="card">
        <div class="row">${dateField('cpA', 'Date A', t, 'style="flex:0 1 200px"')}${dateField('cpB', 'Date B', { y: 1969, m: 7, d: 20 }, 'style="flex:0 1 200px"')}
          <div class="field" style="flex:0 1 220px"><label for="cpWk">Week convention for “same week”</label><select class="select" id="cpWk">${Object.entries(TE.WEEK_CONVENTIONS).filter(([k]) => k !== 'simple').map(([k, v]) => `<option value="${k}" ${k === M.settings.weekConvention ? 'selected' : ''}>${v.split(' (')[0]}</option>`).join('')}</select></div>
        </div>
        <div id="cpOut" class="result"></div>
      </div>`;
    el.addEventListener('input', compute);
    function compute() {
      const out = M.$('#cpOut', el);
      const a = M.readDate(M.$('#cpA', el), 'Date A'), b = M.readDate(M.$('#cpB', el), 'Date B');
      if (!a.ok || !b.ok) { out.innerHTML = errBox([a.error, b.error].filter(Boolean)); return; }
      const A = a.date, B = b.date, conv = M.$('#cpWk', el).value;
      const info = (d) => ({ wd: TE.WEEKDAYS[TE.weekday(d.y, d.m, d.d)], doy: TE.dayOfYear(d.y, d.m, d.d), iso: TE.isoWeek(d.y, d.m, d.d), wk: TE.weekNumber(d.y, d.m, d.d, conv), q: TE.quarter(d.m), leap: TE.isLeapYear(d.y), dim: TE.daysInMonth(d.y, d.m), rem: TE.daysRemainingInYear(d.y, d.m, d.d) });
      const ia = info(A), ib = info(B);
      const yn = (v) => v ? '<span class="badge success">Yes</span>' : '<span class="badge">No</span>';
      const cal = TE.calendarDiff(A, B), n = TE.daysBetween(A, B);
      out.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Date A</th><th>Date B</th></tr></thead><tbody>
        <tr><td>Date</td><td><b>${esc(TE.formatDateLong(A, false))}</b></td><td><b>${esc(TE.formatDateLong(B, false))}</b></td></tr>
        <tr><td>Weekday</td><td>${ia.wd}</td><td>${ib.wd}</td></tr>
        <tr><td>Day of year</td><td>${ia.doy} <span class="muted small">(${ia.rem} left)</span></td><td>${ib.doy} <span class="muted small">(${ib.rem} left)</span></td></tr>
        <tr><td>ISO week</td><td>${ia.iso.year}-W${TE.pad(ia.iso.week)}</td><td>${ib.iso.year}-W${TE.pad(ib.iso.week)}</td></tr>
        ${conv !== 'iso' ? `<tr><td>Week (${esc(conv.toUpperCase())})</td><td>${ia.wk.week}</td><td>${ib.wk.week}</td></tr>` : ''}
        <tr><td>Quarter</td><td>Q${ia.q}</td><td>Q${ib.q}</td></tr>
        <tr><td>Leap year?</td><td>${ia.leap ? 'Yes' : 'No'}</td><td>${ib.leap ? 'Yes' : 'No'}</td></tr>
        <tr><td>Days in month</td><td>${ia.dim}</td><td>${ib.dim}</td></tr>
      </tbody></table></div>
      <div class="grid cols-2 section-gap">
        <div class="card flat"><h3 style="margin-bottom:8px">Similarities</h3><dl class="kv">
          <dt>Same month & day</dt><dd>${yn(A.m === B.m && A.d === B.d)}</dd><dt>Same weekday</dt><dd>${yn(ia.wd === ib.wd)}</dd>
          <dt>Same week</dt><dd>${yn(TE.sameWeek(A, B, conv))}</dd><dt>Same month</dt><dd>${yn(A.y === B.y && A.m === B.m)}</dd>
          <dt>Same quarter</dt><dd>${yn(A.y === B.y && ia.q === ib.q)}</dd><dt>Same year</dt><dd>${yn(A.y === B.y)}</dd>
          <dt>Same calendar layout</dt><dd>${yn(ia.leap === ib.leap && TE.weekday(A.y, 1, 1) === TE.weekday(B.y, 1, 1))} <span class="tiny muted">(years share all weekdays)</span></dd></dl></div>
        <div class="card flat"><h3 style="margin-bottom:8px">Differences</h3><dl class="kv">
          <dt>Days (B − A)</dt><dd>${TE.formatNumber(n)}</dd><dt>Calendar</dt><dd>${cal.sign < 0 ? '−' : ''}${M.plural(Math.abs(cal.years), 'year')}, ${M.plural(Math.abs(cal.months), 'month')}, ${M.plural(Math.abs(cal.days), 'day')}</dd>
          <dt>Weeks</dt><dd>${TE.formatNumber(n / 7, 3)}</dd><dt>Elapsed (midnight to midnight UTC)</dt><dd>${TE.formatNumber(Math.abs(n) * 24)} hours</dd></dl>
          <p class="tiny muted">Date-only comparison; for clock times in specific zones use the Elapsed time tab.</p></div>
      </div>`;
    }
    compute();
    return {};
  }

  const BUILDERS = { elapsed: buildElapsed, date: buildDate, between: buildBetween, weekday: buildWeekday, business: buildBusiness, time: buildTime, age: buildAge, compare: buildCompare };
  function show(params) { const { tab: t, ...rest } = params; setTab(t || tab, rest); }
  function tick(now) { const p = panes[tab]; if (p && p.api && p.api.tick) p.api.tick(now); }
  M.register('calc', { init, show, tick });
})();
