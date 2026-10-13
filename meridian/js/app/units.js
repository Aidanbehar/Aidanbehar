/* Meridian — Time-unit converter, reference table and calendar-duration mode */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  // Seconds per unit. Fixed approximations are labelled as such.
  const UNITS = [
    { k: 'ns', n: 'Nanosecond', s: 1e-9, exact: true },
    { k: 'us', n: 'Microsecond', s: 1e-6, exact: true },
    { k: 'ms', n: 'Millisecond', s: 1e-3, exact: true },
    { k: 's', n: 'Second', s: 1, exact: true },
    { k: 'min', n: 'Minute', s: 60, exact: true },
    { k: 'h', n: 'Hour', s: 3600, exact: true },
    { k: 'd', n: 'Day (24 h)', s: 86400, exact: true, note: 'Civil days can be 23 or 25 hours across DST changes; this is the standard 24-hour day.' },
    { k: 'wk', n: 'Week', s: 604800, exact: true },
    { k: 'fn', n: 'Fortnight', s: 1209600, exact: true },
    { k: 'mo30', n: 'Month (30 days, fixed)', s: 2592000, exact: false, note: 'Fixed 30-day month used in some contracts and finance conventions.' },
    { k: 'mo', n: 'Month (Gregorian average, 30.436875 d)', s: 2629746, exact: false, note: 'Average Gregorian month: 365.2425 / 12 days.' },
    { k: 'y365', n: 'Year (365 days, common)', s: 31536000, exact: false },
    { k: 'y', n: 'Year (Gregorian average, 365.2425 d)', s: 31556952, exact: false, note: 'Average over the 400-year Gregorian cycle.' },
    { k: 'yj', n: 'Year (Julian, 365.25 d)', s: 31557600, exact: false, note: 'Used in astronomy (light-year definition).' },
    { k: 'dec', n: 'Decade (10 Gregorian-average years)', s: 315569520, exact: false },
    { k: 'cen', n: 'Century (100 Gregorian-average years)', s: 3155695200, exact: false },
    { k: 'mil', n: 'Millennium (1,000 Gregorian-average years)', s: 31556952000, exact: false }
  ];
  const byKey = Object.fromEntries(UNITS.map(u => [u.k, u]));
  let root, sortKey = 'from', sortDir = 1;

  function fmt(v, notation, digits) {
    if (!Number.isFinite(v)) return '—';
    if (notation === 'sci' || (notation === 'auto' && v !== 0 && (Math.abs(v) >= 1e15 || Math.abs(v) < 1e-6))) {
      const [m, e] = v.toExponential(Math.max(0, digits - 1)).split('e');
      return `${m.replace(/\.?0+$/, '')} × 10${String(+e).replace(/-/, '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`;
    }
    return v.toLocaleString('en-US', { maximumSignificantDigits: Math.min(21, Math.max(1, digits + Math.max(0, Math.floor(Math.log10(Math.abs(v) || 1)) + 1))) , maximumFractionDigits: 20 });
  }
  /** Exact ratio where both units are exact multiples of a nanosecond (avoids 1e-9 float noise). */
  function convert(v, a, b) {
    const ns = (u) => Math.round(u.s * 1e9);
    if (Number.isInteger(ns(a)) && Number.isInteger(ns(b)) && ns(a) > 0 && ns(b) > 0) return v * ns(a) / ns(b);
    return v * a.s / b.s;
  }

  function init(el) {
    root = el;
    const opt = (sel) => UNITS.map(u => `<option value="${u.k}" ${u.k === sel ? 'selected' : ''}>${esc(u.n)}</option>`).join('');
    el.innerHTML = `
      ${M.pageHead('units', 'Time Units', 'Convert between time units from nanoseconds to millennia, and look up common conversions.', `<button class="btn btn-sm" id="unPrint">${M.icon('print')} Print table</button>`)}
      <div class="card">
        <div class="row">
          <div class="field" style="flex:0 1 180px"><label for="unV">Quantity</label><input class="input num-input" id="unV" type="text" inputmode="decimal" value="1"></div>
          <div class="field" style="flex:1 1 220px"><label for="unA">From</label><select class="select" id="unA">${opt('wk')}</select></div>
          <button class="btn" id="unSwap" style="flex:0 0 auto" aria-label="Swap units">${M.icon('swap')}</button>
          <div class="field" style="flex:1 1 220px"><label for="unB">To</label><select class="select" id="unB">${opt('s')}</select></div>
          <div class="field" style="flex:0 1 150px"><label for="unN">Notation</label><select class="select" id="unN"><option value="auto">Automatic</option><option value="dec">Decimal</option><option value="sci">Scientific</option></select></div>
          <div class="field" style="flex:0 1 110px"><label for="unP">Significant digits</label><input class="input num-input" id="unP" type="number" min="1" max="17" value="10"></div>
        </div>
        <div id="unOut" class="result"></div>
      </div>
      <div class="card section-gap">
        <div class="card-head"><h2>Reference table</h2><input class="input" id="unQ" type="search" placeholder="Filter, e.g. week, ms, year" style="max-width:260px" aria-label="Filter reference table"></div>
        <div id="unTable"></div>
        <p class="small muted" style="margin-top:10px"><b>Months and years have no single exact length.</b> Gregorian months have 28–31 days and years 365 or 366 days, so any conversion involving them uses a stated fixed or average value (marked “≈”). For real calendar spans between two dates, use the calendar-duration calculator below.</p>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:8px">Calendar duration between two dates</h2>
        <div class="row"><div class="field" style="flex:0 1 200px"><label for="cdA">From</label><input class="input" type="date" id="cdA" value="2000-02-29"></div><div class="field" style="flex:0 1 200px"><label for="cdB">To</label><input class="input" type="date" id="cdB" value="${M.dateInputValue(M.today())}"></div></div>
        <div id="cdOut" class="result"></div>
      </div>`;
    ['unV', 'unA', 'unB', 'unN', 'unP'].forEach(i => M.$('#' + i, el).addEventListener('input', run));
    M.$('#unSwap', el).addEventListener('click', () => { const a = M.$('#unA', el).value; M.$('#unA', el).value = M.$('#unB', el).value; M.$('#unB', el).value = a; run(); });
    M.$('#unQ', el).addEventListener('input', table);
    M.$('#unPrint', el).addEventListener('click', () => window.print());
    M.$('#unTable', el).addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (b) { if (sortKey === b.dataset.sort) sortDir = -sortDir; else { sortKey = b.dataset.sort; sortDir = 1; } table(); } });
    ['cdA', 'cdB'].forEach(i => M.$('#' + i, el).addEventListener('input', calDur));
    M.bindCopy(el);
    run(); table(); calDur();
  }
  function run() {
    const out = M.$('#unOut', root);
    const raw = M.$('#unV', root).value.trim().replace(/,/g, '').replace(/×\s*10\^?/, 'e');
    const v = Number(raw);
    const digits = Math.min(17, Math.max(1, Number(M.$('#unP', root).value) || 10));
    const notation = M.$('#unN', root).value;
    if (raw === '' || !Number.isFinite(v)) { out.innerHTML = `<div class="note error">Enter a number (e.g. 1.5, -3, 2e9).</div>`; return; }
    const a = byKey[M.$('#unA', root).value], b = byKey[M.$('#unB', root).value];
    const r = convert(v, a, b);
    const approx = !a.exact || !b.exact;
    const txt = fmt(r, notation, digits);
    out.innerHTML = `<div class="result-big">${approx ? '≈ ' : ''}${esc(txt)} <span class="small muted" style="font-weight:500">${esc(b.n.toLowerCase())}${Math.abs(r) === 1 ? '' : 's'}</span></div>
      <p class="small muted">${esc(fmt(v, 'auto', digits))} ${esc(a.n.toLowerCase())} = ${esc(txt)} ${esc(b.n.toLowerCase())}${approx ? ' (uses a fixed/average month or year length)' : ' (exact)'}${[a.note, b.note].filter(Boolean).map(n => ' · ' + esc(n)).join('')}</p>
      <button class="btn btn-sm" data-copy="${esc(String(r))}">${M.icon('copy')} Copy value</button>
      <div class="table-wrap" style="margin-top:12px"><table class="table"><tbody>${UNITS.map(u => `<tr class="${u.k === b.k ? 'is-selected' : ''}"><td>${esc(u.n)}${u.exact ? '' : ' <span class="badge amber">approx.</span>'}</td><td class="num mono">${(!a.exact || !u.exact) ? '≈ ' : ''}${esc(fmt(convert(v, a, u), notation, digits))}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function table() {
    const q = M.norm(M.$('#unQ', root).value.trim());
    const pairs = [['s', 'ms'], ['ms', 'us'], ['us', 'ns'], ['s', 'ns'], ['min', 's'], ['h', 'min'], ['h', 's'], ['d', 'h'], ['d', 'min'], ['d', 's'], ['d', 'ms'], ['wk', 'd'], ['wk', 'h'], ['wk', 's'], ['fn', 'd'], ['fn', 's'], ['mo30', 'd'], ['mo', 'd'], ['mo', 's'], ['y365', 'd'], ['y365', 'h'], ['y365', 's'], ['y', 'd'], ['y', 'wk'], ['y', 'h'], ['y', 's'], ['yj', 's'], ['dec', 'y'], ['cen', 'y'], ['mil', 'y'], ['cen', 'd'], ['mil', 's'], ['y', 'mo'], ['wk', 'min'], ['h', 'ms'], ['min', 'ms']];
    let rows = pairs.map(([a, b]) => ({ a: byKey[a], b: byKey[b], v: convert(1, byKey[a], byKey[b]) }));
    if (q) rows = rows.filter(r => M.norm(`${r.a.n} ${r.b.n} ${r.a.k} ${r.b.k}`).includes(q));
    rows.sort((x, y) => sortDir * (sortKey === 'from' ? x.a.s - y.a.s || x.v - y.v : sortKey === 'to' ? x.b.n.localeCompare(y.b.n) : x.v - y.v));
    const th = (k, l, cls = '') => `<th class="${cls}"><button data-sort="${k}" aria-label="Sort by ${l}">${l} ${sortKey === k ? (sortDir > 0 ? '▲' : '▼') : ''}</button></th>`;
    M.$('#unTable', root).innerHTML = rows.length ? `<div class="table-wrap"><table class="table"><thead><tr>${th('from', 'Unit')}${th('value', 'Equals', 'num')}${th('to', 'In')}</tr></thead><tbody>${rows.map(r => `<tr><td>1 ${esc(r.a.n.toLowerCase())}</td><td class="num mono">${(!r.a.exact || !r.b.exact) ? '≈ ' : ''}${esc(fmt(r.v, 'dec', 12))}</td><td>${esc(r.b.n.toLowerCase())}s</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No rows match.</div>';
  }
  function calDur() {
    const out = M.$('#cdOut', root);
    const a = M.readDate(M.$('#cdA', root), 'From'), b = M.readDate(M.$('#cdB', root), 'To');
    if (!a.ok || !b.ok) { out.innerHTML = `<div class="note error">${esc([a.error, b.error].filter(Boolean).join(' '))}</div>`; return; }
    const c = TE.calendarDiff(a.date, b.date);
    const n = TE.daysBetween(a.date, b.date);
    out.innerHTML = `<div class="result-mid">${c.sign < 0 ? '−' : ''}${M.plural(Math.abs(c.years), 'year')}, ${M.plural(Math.abs(c.months), 'month')}, ${M.plural(Math.abs(c.days), 'day')}</div>
      <p class="small">= ${M.plural(Math.abs(c.totalMonths), 'whole month')} + ${M.plural(Math.abs(c.days), 'day')} · ${TE.formatNumber(Math.abs(n))} calendar days · ${TE.formatNumber(Math.abs(n) / 7, 3)} weeks</p>
      <p class="small muted">Actual calendar months and years are counted from the start date (with month-end clamping), not converted from a fixed number of seconds. For comparison, ${TE.formatNumber(Math.abs(n))} days ≈ ${TE.formatNumber(Math.abs(n) / 365.2425, 4)} average Gregorian years.</p>`;
  }
  M.register('units', { init, show: () => {} });
})();
