/* Meridian — Calendar (month & year views, holidays, astronomy, day details) */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  let root, view = 'month', cur = null, selDay = null, zonePicker, zone = null, country = null;

  const weekStart = () => ({ iso: 1, simple: 1, us: 0, mideast: 6 }[M.settings.weekConvention] ?? 1);

  /** Notable items for a given year, keyed by ISO date. */
  const yearCache = new Map();
  function itemsForYear(y) {
    const key = y + '|' + country;
    if (yearCache.has(key)) return yearCache.get(key);
    const map = new Map();
    const add = (d, it) => { const k = TE.isoDate(d); if (!map.has(k)) map.set(k, []); map.get(k).push(it); };
    if (country) TE.holidaysFor(country, y).forEach(h => add(h.date, { name: h.name, kind: h.type === 'public' ? 'pub' : 'obs', note: h.note }));
    TE.observancesFor(y).forEach(h => { const k = TE.isoDate(h.date); if (!(map.get(k) || []).some(x => x.name.replace(/ \(.*/, '') === h.name.replace(/ \(.*/, ''))) add(h.date, { name: h.name, kind: 'obs', note: h.note }); });
    const tz = zone || M.localZone();
    try {
      const s = TE.seasonsOfYear(y);
      [['March equinox', s.march], ['June solstice', s.june], ['September equinox', s.september], ['December solstice', s.december]].forEach(([n, e]) => { const w = TE.toZoned(tz, e.epochMs); if (w.y === y) add(w, { name: `${n} (${M.fmtTime(w)})`, kind: 'astro' }); });
      const start = TE.wallToMs({ y, m: 1, d: 1 }) - 86400000, end = TE.wallToMs({ y: y + 1, m: 1, d: 1 }) + 86400000;
      TE.moonPhasesBetween(start, end).filter(p => p.phase === 0 || p.phase === 2).forEach(p => { const w = TE.toZoned(tz, p.epochMs); if (w.y === y) add(w, { name: `${p.phase === 0 ? '🌑 New moon' : '🌕 Full moon'} (${M.fmtTime(w)})`, kind: 'astro' }); });
    } catch (e) { /* astronomy outside supported range */ }
    TE.friday13InYear(y).forEach(d => add(d, { name: 'Friday the 13th', kind: 'astro' }));
    yearCache.set(key, map);
    return map;
  }

  function init(el) {
    root = el;
    country = M.settings.holidayCountry;
    const t = M.today();
    cur = { y: t.y, m: t.m };
    el.innerHTML = `
      ${M.pageHead('calendar', 'Calendar', 'A compact month and year calendar with public holidays, observances, moon phases, equinoxes and Friday the 13ths. Click a day for details and shortcuts to the other tools.')}
      <div class="cal-wrap">
        <div class="card">
          <div class="cal-head">
            <button class="icon-btn" id="calPrev" aria-label="Previous">${M.icon('chevL')}</button>
            <h2 id="calTitle" aria-live="polite"></h2>
            <button class="icon-btn" id="calNext" aria-label="Next">${M.icon('chevR')}</button>
            <button class="btn btn-sm" id="calToday">Today</button>
            <div class="spacer"></div>
            <div class="seg" role="group" aria-label="View"><button data-v="month">Month</button><button data-v="year">Year</button></div>
          </div>
          <div class="row" style="margin-bottom:12px">
            <div class="field" style="flex:0 1 150px"><label for="calM">Month</label><select class="select" id="calM">${TE.MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select></div>
            <div class="field" style="flex:0 1 110px"><label for="calY">Year</label><input class="input num-input" id="calY" type="number" step="1"></div>
            <div class="field" style="flex:0 1 220px"><label for="calC">Public holidays</label><select class="select" id="calC"><option value="">None</option>${Object.entries(TE.HOLIDAY_COUNTRIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
            <div id="calZone" style="flex:1 1 240px"></div>
          </div>
          <div id="calBody"></div>
          <div class="planner-legend"><span><i style="background:var(--danger)"></i>Public holiday</span><span><i style="background:var(--accent)"></i>Observance</span><span><i style="background:var(--amber)"></i>Astronomy / Friday 13th</span><span>Week numbers: ${esc(TE.WEEK_CONVENTIONS[M.settings.weekConvention].split(' (')[0])} (change in Settings)</span></div>
        </div>
        <div class="card section-gap" id="calDetail" hidden></div>
      </div>`;
    M.$('#calC', el).value = country;
    zonePicker = M.zonePicker(M.$('#calZone', el), { label: 'Show “today” and astronomy in', value: M.localZone(), noMeta: true, onChange: (r) => { zone = r; yearCache.clear(); render(); } });
    M.$('#calPrev', el).addEventListener('click', () => move(-1));
    M.$('#calNext', el).addEventListener('click', () => move(1));
    M.$('#calToday', el).addEventListener('click', () => { const t2 = M.today(zone); cur = { y: t2.y, m: t2.m }; selDay = t2; render(); renderDetail(); });
    M.$('#calM', el).addEventListener('change', (e) => { cur.m = +e.target.value; render(); });
    M.$('#calY', el).addEventListener('change', (e) => { const y = Number(e.target.value); if (Number.isInteger(y) && y >= -9999 && y <= 99999) { cur.y = y; render(); } else { M.toast('Enter a year between −9999 and 99999'); e.target.value = cur.y; } });
    M.$('#calC', el).addEventListener('change', (e) => { country = e.target.value; yearCache.clear(); render(); if (selDay) renderDetail(); });
    el.querySelector('.seg').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { view = b.dataset.v; render(); } });
    M.$('#calBody', el).addEventListener('click', (e) => {
      const d = e.target.closest('[data-date]');
      if (d) { const r = TE.parseISODate(d.dataset.date); if (r.ok) { selDay = r.date; if (d.dataset.jump) { cur = { y: r.date.y, m: r.date.m }; view = 'month'; } render(); renderDetail(); } return; }
      const mh = e.target.closest('[data-month]'); if (mh) { cur.m = +mh.dataset.month; view = 'month'; render(); }
    });
    M.$('#calBody', el).addEventListener('keydown', (e) => {
      if (view !== 'month' || !selDay) return;
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (delta) { e.preventDefault(); selDay = TE.addDays(selDay, delta); cur = { y: selDay.y, m: selDay.m }; render(); renderDetail(); const b = M.$(`[data-date="${TE.isoDate(selDay)}"]`, root); if (b) b.focus(); }
    });
    M.onSettings((k) => { yearCache.clear(); if (!root.hidden) render(); });
  }
  function move(n) {
    if (view === 'year') cur.y += n;
    else { const t = cur.y * 12 + cur.m - 1 + n; cur = { y: Math.floor(t / 12), m: TE.mod(t, 12) + 1 }; }
    render();
  }
  function render() {
    M.$$('.seg [data-v]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === view)));
    M.$('#calM', root).value = cur.m; M.$('#calY', root).value = cur.y;
    M.$('#calM', root).closest('.field').hidden = view === 'year';
    M.$('#calTitle', root).textContent = view === 'year' ? TE.formatYear(cur.y) : `${TE.MONTHS[cur.m - 1]} ${TE.formatYear(cur.y)}`;
    if (view === 'year') renderYear(); else renderMonth();
  }
  function renderMonth() {
    const { y, m } = cur;
    const ws = weekStart();
    const today = M.today(zone);
    const first = { y, m, d: 1 };
    const lead = TE.mod(TE.weekday(y, m, 1) - ws, 7);
    const start = TE.addDays(first, -lead);
    const items = new Map([...itemsForYear(y - 1), ...itemsForYear(y), ...itemsForYear(y + 1)]);
    const weeks = Math.ceil((lead + TE.daysInMonth(y, m)) / 7);
    let html = `<div class="cal-grid" role="grid" aria-label="${TE.MONTHS[m - 1]} ${y}"><div class="dow" title="Week number">Wk</div>${Array.from({ length: 7 }, (_, i) => `<div class="dow">${TE.WEEKDAYS_SHORT[(ws + i) % 7]}</div>`).join('')}`;
    for (let w = 0; w < weeks; w++) {
      // ISO: the row's Thursday decides the week; US/Middle-Eastern: the row's last day (week 1 contains Jan 1).
      const wc = M.settings.weekConvention;
      const refDay = TE.addDays(start, w * 7 + (wc === 'iso' ? TE.mod(4 - ws, 7) : wc === 'simple' ? 0 : 6));
      const wn = TE.weekNumber(refDay.y, refDay.m, refDay.d, wc).week;
      html += `<div class="wk">${wn}</div>`;
      for (let i = 0; i < 7; i++) {
        const d = TE.addDays(start, w * 7 + i);
        const k = TE.isoDate(d);
        const its = items.get(k) || [];
        const wd = TE.weekday(d.y, d.m, d.d);
        const cls = ['cal-day', d.m !== m ? 'other' : '', wd === 0 || wd === 6 ? 'weekend' : '', TE.compareDates(d, today) === 0 ? 'today' : '', selDay && TE.compareDates(d, selDay) === 0 ? 'selected' : '', its.length ? 'has-ev' : ''].join(' ');
        const label = `${TE.formatDateLong(d)}${TE.compareDates(d, today) === 0 ? ', today' : ''}${its.length ? ': ' + its.map(x => x.name).join('; ') : ''}`;
        html += `<button class="${cls}" data-date="${k}" role="gridcell" aria-label="${esc(label)}" ${selDay && TE.compareDates(d, selDay) === 0 ? 'aria-selected="true"' : ''} tabindex="${selDay ? (TE.compareDates(d, selDay) === 0 ? 0 : -1) : (TE.compareDates(d, today) === 0 ? 0 : -1)}"><span class="n">${d.d}</span>${its.slice(0, 3).map(x => `<span class="ev ${x.kind}">${esc(x.name)}</span>`).join('')}${its.length > 3 ? `<span class="ev">+${its.length - 3} more</span>` : ''}</button>`;
      }
    }
    html += `</div>`;
    M.$('#calBody', root).innerHTML = html;
  }
  function renderYear() {
    const y = cur.y, ws = weekStart(), today = M.today(zone);
    const items = itemsForYear(y);
    let html = `<div class="year-grid">`;
    for (let m = 1; m <= 12; m++) {
      const lead = TE.mod(TE.weekday(y, m, 1) - ws, 7);
      html += `<div class="mini-month"><h4><button data-month="${m}">${TE.MONTHS[m - 1]}</button><span class="muted tiny">${TE.daysInMonth(y, m)} d</span></h4><div class="mini-grid">${Array.from({ length: 7 }, (_, i) => `<span class="h">${TE.WEEKDAYS_SHORT[(ws + i) % 7][0]}</span>`).join('')}${'<span class="blank"></span>'.repeat(lead)}`;
      for (let d = 1; d <= TE.daysInMonth(y, m); d++) {
        const dt = { y, m, d }, k = TE.isoDate(dt), its = items.get(k) || [];
        const cls = [TE.compareDates(dt, today) === 0 ? 'today' : '', its.some(x => x.kind === 'pub') ? 'hol' : '', its.some(x => x.name === 'Friday the 13th') ? 'mark' : ''].join(' ');
        html += `<button class="${cls}" data-date="${k}" data-jump="1" title="${esc(TE.formatDateLong(dt) + (its.length ? ' — ' + its.map(x => x.name).join('; ') : ''))}">${d}</button>`;
      }
      html += `</div></div>`;
    }
    html += `</div><p class="small muted" style="margin-top:10px">${TE.formatYear(y)}: ${TE.daysInYear(y)} days, ${TE.isLeapYear(y) ? 'leap year' : 'common year'}, starts on a ${TE.WEEKDAYS[TE.weekday(y, 1, 1)]}, ${TE.isoWeeksInYear(y)} ISO weeks. Red = public holiday, highlighted = Friday the 13th.</p>`;
    M.$('#calBody', root).innerHTML = html;
  }
  function renderDetail() {
    const box = M.$('#calDetail', root);
    if (!selDay) { box.hidden = true; return; }
    const d = selDay, k = TE.isoDate(d);
    const its = itemsForYear(d.y).get(k) || [];
    const wk = TE.weekNumber(d.y, d.m, d.d, M.settings.weekConvention), iso = TE.isoWeek(d.y, d.m, d.d);
    const today = M.today(zone);
    box.hidden = false;
    box.innerHTML = `<div class="card-head"><h2>${esc(TE.formatDateLong(d))}</h2><span class="sub">${esc(M.relDays(TE.daysBetween(today, d)))}</span><button class="icon-btn sm" id="calClose" aria-label="Close details">${M.icon('x')}</button></div>
      <div class="grid cols-2">
        <div><dl class="kv">
          <dt>Weekday</dt><dd>${TE.WEEKDAYS[TE.weekday(d.y, d.m, d.d)]}</dd>
          <dt>Day of year</dt><dd>${TE.dayOfYear(d.y, d.m, d.d)} of ${TE.daysInYear(d.y)} (${TE.daysRemainingInYear(d.y, d.m, d.d)} remaining)</dd>
          <dt>Week number</dt><dd>${wk.week} (${esc(M.settings.weekConvention.toUpperCase())})${M.settings.weekConvention !== 'iso' ? ` · ISO ${iso.year}-W${TE.pad(iso.week)}` : iso.year !== d.y ? ` · ISO week-year ${iso.year}` : ''}</dd>
          <dt>Leap year?</dt><dd>${TE.isLeapYear(d.y) ? 'Yes' : 'No'} — ${TE.formatYear(d.y)} has ${TE.daysInYear(d.y)} days</dd>
          <dt>Quarter</dt><dd>Q${TE.quarter(d.m)}</dd>
          <dt>Notable</dt><dd>${its.length ? its.map(x => `<div><span class="badge ${x.kind === 'pub' ? 'danger' : x.kind === 'astro' ? 'amber' : 'accent'}">${x.kind === 'pub' ? 'Public' : x.kind === 'astro' ? 'Astronomy' : 'Observance'}</span> ${esc(x.name)}${x.note ? `<div class="tiny muted">${esc(x.note)}</div>` : ''}</div>`).join('') : '<span class="muted">Nothing in the built-in calendars</span>'}</dd>
        </dl>
        <div class="row tight" style="margin-top:12px">
          <a class="btn btn-sm" href="${M.link('explorer', { date: k })}">Date details</a>
          <a class="btn btn-sm" href="${M.link('history', { m: d.m, d: d.d })}">${TE.MONTHS_SHORT[d.m - 1]} ${d.d} in history</a>
          <a class="btn btn-sm" href="${M.link('convert', { date: k, time: '12:00:00' })}">Convert a time on this date</a>
          <a class="btn btn-sm" href="${M.link('calc', { tab: 'date', date: k })}">Add / subtract</a>
          <a class="btn btn-sm" href="${M.link('holidays', { tab: 'moon', date: k })}">Moon phase</a>
        </div></div>
        <div><h3 style="margin-bottom:8px">On ${TE.MONTHS[d.m - 1]} ${d.d} in history</h3><div id="calHist"><div class="skeleton"></div><div class="skeleton" style="width:80%"></div></div></div>
      </div>`;
    M.$('#calClose', root).addEventListener('click', () => { selDay = null; box.hidden = true; render(); });
    const hb = M.$('#calHist', root);
    M.historyApi.get(d.m, d.d).then(data => {
      const list = (data.selected.length ? data.selected : data.events).slice(0, 5);
      hb.innerHTML = list.length ? `<ul class="hist-list">${list.map(e => `<li><span class="hist-year">${esc(M.historyApi.fmtYear(e.year))}</span><span class="hist-text">${esc(e.text)} ${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">Source ↗</a>` : ''}</span></li>`).join('')}</ul><div class="tiny muted" style="margin-top:6px">${data.local ? 'Limited offline dataset.' : 'Wikipedia “On this day”.'}</div>` : '<div class="small muted">No events available.</div>';
    }).catch(() => { hb.innerHTML = '<div class="small muted">History unavailable.</div>'; });
  }
  function show(params) {
    if (params.date) { const r = TE.parseISODate(params.date); if (r.ok) { selDay = r.date; cur = { y: r.date.y, m: r.date.m }; renderDetail(); } }
    render();
  }
  M.register('calendar', { init, show });
})();
