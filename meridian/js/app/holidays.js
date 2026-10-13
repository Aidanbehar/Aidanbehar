/* Meridian — Holidays & astronomy: Easter, Friday the 13th, holiday finder, moon phases, seasons, sunrise/sunset */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  let root, tab = 'easter';
  const panes = {};
  const errBox = (errs) => `<div class="note error">${errs.map(esc).join('<br>')}</div>`;
  const cd = (target, today) => { const n = TE.daysBetween(today, target); return n === 0 ? 'Today!' : M.relDays(n); };

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('holidays', 'Holidays & Astronomy', 'Easter in both traditions, Friday the 13ths, public holidays and observances, moon phases, equinoxes and solstices, and sunrise/sunset times.')}
      <div class="tabs" role="tablist" id="hoTabs">
        <button role="tab" data-tab="easter">Easter</button><button role="tab" data-tab="f13">Friday the 13th</button><button role="tab" data-tab="holidays">Holiday finder</button>
        <button role="tab" data-tab="moon">Moon phases</button><button role="tab" data-tab="seasons">Equinoxes & solstices</button><button role="tab" data-tab="sun">Sunrise & sunset</button>
      </div><div id="hoPane"></div>`;
    M.$('#hoTabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    M.bindCopy(el);
  }
  function setTab(t, params = {}) {
    if (!B[t]) t = 'easter';
    tab = t;
    M.$$('#hoTabs [data-tab]', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    Object.values(panes).forEach(p => { p.el.hidden = true; });
    if (!panes[t]) { const el = document.createElement('div'); M.$('#hoPane', root).appendChild(el); panes[t] = { el, api: B[t](el) }; }
    panes[t].el.hidden = false;
    if (panes[t].api.params) panes[t].api.params(params);
    history.replaceState(null, '', M.link('holidays', { tab: t }));
  }

  /* ---------- Easter ---------- */
  function buildEaster(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="grid cols-2" id="eaNext"></div>
      <div class="card section-gap">
        <div class="row" style="align-items:flex-end"><div class="field" style="flex:0 1 150px"><label for="eaY">Year</label><input class="input num-input" type="number" id="eaY" value="${t.y}" min="1583" max="99999"></div><div class="small muted" style="flex:2 1 300px">Calculated with the Anonymous Gregorian algorithm (Western) and the Julian computus converted to the Gregorian calendar (Orthodox). Valid for 1583 onwards.</div></div>
        <div id="eaYear" class="result"></div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:8px">Recent and upcoming Easters</h2><div id="eaTable"></div></div>
      <div class="card section-gap"><h2 style="margin-bottom:6px">Why are there two Easter dates?</h2>
        <p class="small">Both traditions celebrate Easter on the first Sunday after the first full moon on or after the March equinox — but they compute it differently. Western churches (Catholic and Protestant) use the <b>Gregorian calendar</b> with an ecclesiastical equinox fixed at March 21 and tabulated “paschal full moons”. Eastern Orthodox churches use the older <b>Julian calendar</b> and its lunar tables; since the Julian calendar currently runs 13 days behind, and its lunar tables have drifted, Orthodox Easter usually falls 1–5 weeks later. In some years (e.g. 2017, 2025, 2028) both fall on the same Sunday. These dates come from the church rules (computus), not from astronomical observations.</p>
      </div>`;
    M.$('#eaY', el).addEventListener('input', year);
    function next() {
      const today = M.today();
      const card = (kind, label, cls) => {
        const r = TE.nextEaster(today, kind);
        const d = r.date;
        return `<div class="card ${cls}"><div class="card-head"><h2>${label}</h2><span class="badge ${kind === 'western' ? 'primary' : 'accent'}">${kind === 'western' ? 'Gregorian computus' : 'Julian computus'}</span></div>
          ${r.isToday ? `<div class="note success" style="margin-bottom:8px">🥚 <b>Today is ${label}!</b></div>` : ''}
          <div class="small muted">${r.isToday ? 'This Easter' : 'Next Easter'}</div>
          <div class="result-big">${esc(TE.formatDateLong(d))}</div>
          <p class="small">${esc(cd(d, today))}${r.isToday ? ` · Next after today: <b>${esc(TE.formatDateLong(r.nextAfterToday))}</b> (${esc(M.relDays(TE.daysBetween(today, r.nextAfterToday)))})` : ''}</p>
          ${kind === 'orthodox' ? `<p class="tiny muted">Julian-calendar date: ${TE.MONTHS[TE.easterOrthodox(d.y).julian.m - 1]} ${TE.easterOrthodox(d.y).julian.d}, ${d.y}</p>` : ''}
          <button class="btn btn-sm" data-copy="${esc(TE.formatDateLong(d))}">${M.icon('copy')} Copy</button></div>`;
      };
      M.$('#eaNext', el).innerHTML = card('western', 'Western Easter', 'highlight') + card('orthodox', 'Orthodox Easter', '');
    }
    function year() {
      const y = Number(M.$('#eaY', el).value), out = M.$('#eaYear', el);
      if (!Number.isInteger(y) || y < 1583 || y > 99999) { out.innerHTML = errBox(['Enter a year from 1583 (the first full Gregorian year) onwards.']); return; }
      const w = TE.easterWestern(y), o = TE.easterOrthodox(y), today = M.today();
      const feasts = (E) => [['Ash Wednesday', -46], ['Palm Sunday', -7], ['Good Friday', -2], ['Easter Sunday', 0], ['Easter Monday', 1], ['Ascension', 39], ['Pentecost', 49]].map(([n, k]) => [n, TE.addDays(E, k)]);
      const gap = TE.daysBetween(w, o);
      out.innerHTML = `<div class="grid cols-2">
        <div class="stat"><div class="k">Western Easter ${y}</div><div class="v">${esc(TE.formatDateLong(w))}</div><div class="d">${esc(cd(w, today))}</div></div>
        <div class="stat"><div class="k">Orthodox Easter ${y}</div><div class="v">${esc(TE.formatDateLong(o))}</div><div class="d">${esc(cd(o, today))}</div></div></div>
        <p class="small" style="margin-top:8px">${gap === 0 ? 'Both traditions celebrate on the same day this year.' : `Orthodox Easter is ${gap / 7} week${gap === 7 ? '' : 's'} (${gap} days) after Western Easter.`}</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Movable feast</th><th>Western</th><th>Orthodox</th></tr></thead><tbody>${feasts(w).map(([n, d], i) => `<tr><td>${n}</td><td>${esc(TE.formatDateShort(d))}</td><td>${esc(TE.formatDateShort(feasts(o)[i][1]))}</td></tr>`).join('')}</tbody></table></div>
        <p class="tiny muted">Orthodox “Ash Wednesday” has no direct equivalent (Great Lent begins on Clean Monday, 48 days before Easter); the row shows the same offset for comparison.</p>`;
    }
    function table() {
      const today = M.today();
      const rows = [];
      for (let y = today.y - 5; y <= today.y + 10; y++) {
        const w = TE.easterWestern(y), o = TE.easterOrthodox(y);
        rows.push(`<tr class="${y === today.y ? 'is-selected' : ''}"><td class="num">${y}</td><td>${esc(TE.formatDateShort(w))}${TE.compareDates(w, today) === 0 ? ' <span class="badge success">today</span>' : ''}</td><td>${esc(TE.formatDateShort(o))}${TE.compareDates(o, today) === 0 ? ' <span class="badge success">today</span>' : ''}</td><td class="num">${TE.daysBetween(w, o) === 0 ? 'same day' : TE.daysBetween(w, o) + ' days'}</td></tr>`);
      }
      M.$('#eaTable', el).innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th class="num">Year</th><th>Western</th><th>Orthodox</th><th class="num">Gap</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    }
    next(); year(); table();
    return {};
  }

  /* ---------- Friday the 13th ---------- */
  function buildF13(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="grid cols-2" id="f13Next"></div>
      <div class="card section-gap">
        <div class="row" style="align-items:flex-end"><div class="field" style="flex:0 1 150px"><label for="f13Y">Year</label><input class="input num-input" type="number" id="f13Y" value="${t.y}"></div><div id="f13Count" style="flex:2 1 300px"></div></div>
        <div id="f13Cal" class="result"></div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:8px">The next 10 years</h2><div id="f13Years"></div>
      <p class="tiny muted" style="margin-top:8px">Every Gregorian year has at least one and at most three Friday the 13ths. The 13th of the month is slightly more likely to be a Friday than any other weekday over the 400-year Gregorian cycle.</p></div>`;
    M.$('#f13Y', el).addEventListener('input', year);
    function next() {
      const today = M.today();
      const n = TE.nextFriday13(today), p = TE.previousFriday13(today);
      const isToday = TE.compareDates(n, today) === 0;
      M.$('#f13Next', el).innerHTML = `<div class="card highlight"><div class="small muted">${isToday ? 'Today is' : 'Next Friday the 13th'}</div><div class="result-big">${esc(TE.formatDateLong(n))}</div><p class="small">${isToday ? '😱 It’s Friday the 13th today!' : `${M.plural(TE.daysBetween(today, n), 'day')} to go`} · ${TE.MONTHS[n.m - 1]} ${n.y}</p>${isToday ? `<p class="small">The one after: ${esc(TE.formatDateLong(TE.nextFriday13(today, false)))}</p>` : ''}</div>
        <div class="card"><div class="small muted">Previous Friday the 13th</div><div class="result-mid">${esc(TE.formatDateLong(p))}</div><p class="small">${M.plural(TE.daysBetween(p, today), 'day')} ago</p></div>`;
    }
    function year() {
      const y = Number(M.$('#f13Y', el).value);
      if (!Number.isInteger(y) || Math.abs(y) > 200000) { M.$('#f13Cal', el).innerHTML = errBox(['Enter a whole-number year.']); M.$('#f13Count', el).innerHTML = ''; return; }
      const list = TE.friday13InYear(y);
      M.$('#f13Count', el).innerHTML = `<div class="result-mid">${list.length} Friday the 13th${list.length === 1 ? '' : 's'} in ${esc(TE.formatYear(y))}</div><div class="small">${list.map(d => TE.MONTHS[d.m - 1]).join(', ')}</div>`;
      const today = M.today();
      let html = '<div class="year-grid">';
      for (let m = 1; m <= 12; m++) {
        const lead = TE.weekday(y, m, 1);
        html += `<div class="mini-month"><h4>${TE.MONTHS[m - 1]}${list.some(d => d.m === m) ? ' <span class="badge amber">13th is a Friday</span>' : ''}</h4><div class="mini-grid">${TE.WEEKDAYS_SHORT.map(w => `<span class="h">${w[0]}</span>`).join('')}${'<span class="blank"></span>'.repeat(lead)}`;
        for (let d = 1; d <= TE.daysInMonth(y, m); d++) {
          const f = d === 13 && TE.weekday(y, m, d) === 5;
          html += `<button tabindex="-1" class="${f ? 'mark' : ''} ${TE.compareDates({ y, m, d }, today) === 0 ? 'today' : ''}" title="${esc(TE.formatDateLong({ y, m, d }))}">${d}</button>`;
        }
        html += '</div></div>';
      }
      M.$('#f13Cal', el).innerHTML = html + '</div>';
    }
    function years() {
      const t2 = M.today();
      M.$('#f13Years', el).innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th class="num">Year</th><th class="num">Count</th><th>Months</th></tr></thead><tbody>${Array.from({ length: 10 }, (_, i) => t2.y + i).map(y => { const l = TE.friday13InYear(y); return `<tr><td class="num">${y}</td><td class="num">${l.length}</td><td>${l.map(d => TE.MONTHS_SHORT[d.m - 1] + ' 13').join(', ')}</td></tr>`; }).join('')}</tbody></table></div>`;
    }
    next(); year(); years();
    return {};
  }

  /* ---------- Holiday finder ---------- */
  const nagerCache = new Map();
  let nagerCountries = null;
  async function nagerHolidays(cc, y) {
    const k = cc + y;
    if (nagerCache.has(k)) return nagerCache.get(k);
    const stored = M.store.get('nager.' + k, null);
    if (stored && Date.now() - stored.at < 30 * 86400000) { nagerCache.set(k, stored.data); return stored.data; }
    const raw = await M.fetchJSON(`https://date.nager.at/api/v3/PublicHolidays/${y}/${cc}`);
    const data = raw.map(h => ({ date: TE.parseISODate(h.date).date, name: h.localName && h.localName !== h.name ? `${h.name} (${h.localName})` : h.name, type: (h.types || []).includes('Public') ? 'public' : 'observance', country: cc, note: [h.global === false && h.counties ? `Regional: ${h.counties.slice(0, 6).join(', ')}${h.counties.length > 6 ? '…' : ''}` : '', (h.types || []).filter(t => t !== 'Public').join(', ')].filter(Boolean).join(' · ') || null })).filter(h => h.date);
    nagerCache.set(k, data);
    M.store.set('nager.' + k, { at: Date.now(), data });
    return data;
  }
  function buildHolidays(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="card">
        <div class="row">
          <div class="field" style="flex:1 1 240px"><label for="hfC">Country / calendar</label><select class="select" id="hfC">
            <optgroup label="Built-in rules (offline)">${Object.entries(TE.HOLIDAY_COUNTRIES).map(([k, v]) => `<option value="b:${k}" ${k === M.settings.holidayCountry ? 'selected' : ''}>${v}</option>`).join('')}<option value="b:INTL">Worldwide observances (religious & cultural)</option></optgroup>
            <optgroup label="More countries (online, Nager.Date)" id="hfOnline"><option value="load">Load list of 100+ countries…</option></optgroup>
          </select></div>
          <div class="field" style="flex:0 1 120px"><label for="hfY">Year</label><input class="input num-input" type="number" id="hfY" value="${t.y}" min="1900" max="2200"></div>
          <div class="field" style="flex:0 1 170px"><label for="hfT">Type</label><select class="select" id="hfT"><option value="">All types</option><option value="public">Public holidays</option><option value="observance">Observances</option><option value="religious">Religious</option><option value="cultural">Cultural</option></select></div>
          <div class="field" style="flex:1 1 200px"><label for="hfQ">Search</label><input class="input" type="search" id="hfQ" placeholder="e.g. Christmas, Labour"></div>
        </div>
        <div class="row" style="margin-top:10px;align-items:flex-end"><div class="field" style="flex:0 1 200px"><label for="hfD">What’s on a specific date?</label><input class="input" type="date" id="hfD"></div><div id="hfDOut" class="small" style="flex:3 1 300px"></div></div>
        <div id="hfOut" class="result"></div>
      </div>`;
    const C = M.$('#hfC', el);
    C.addEventListener('change', async () => {
      if (C.value === 'load') {
        C.value = 'b:' + M.settings.holidayCountry;
        try {
          M.toast('Loading country list…');
          nagerCountries = nagerCountries || await M.fetchJSON('https://date.nager.at/api/v3/AvailableCountries');
          M.$('#hfOnline', el).innerHTML = nagerCountries.sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="n:${esc(c.countryCode)}">${esc(c.name)}</option>`).join('');
          M.toast('Countries loaded — pick one from the list');
          C.focus();
        } catch (e) { M.toast('Could not load online countries: ' + e.message); }
        return;
      }
      run();
    });
    ['hfY', 'hfT', 'hfQ'].forEach(i => M.$('#' + i, el).addEventListener('input', M.debounce(run, 150)));
    M.$('#hfD', el).addEventListener('input', onDate);
    M.$('#hfOut', el).addEventListener('click', (e) => { const r = e.target.closest('[data-next]'); if (r) nextOccurrence(r.dataset.next); });
    let lastList = [], lastSource = '';
    async function fetchList(sel, y) {
      const [kind, cc] = sel.split(':');
      if (kind === 'b') return { list: cc === 'INTL' ? TE.observancesFor(y) : TE.holidaysFor(cc, y), source: cc === 'INTL' ? 'Built-in rules: Western/Orthodox Christian and widely observed cultural dates (lunar-calendar observances such as Eid, Diwali or Lunar New Year are not included).' : `Built-in rules for ${TE.HOLIDAY_COUNTRIES[cc]} — current statutes applied (with start years for newer holidays). Regional holidays are not included.` };
      return { list: await nagerHolidays(cc, y), source: 'Online data from Nager.Date (date.nager.at), an open public-holiday API. Cached locally for 30 days.' };
    }
    async function run() {
      const out = M.$('#hfOut', el);
      const y = Number(M.$('#hfY', el).value);
      if (!Number.isInteger(y) || y < 1 || y > 9999) { out.innerHTML = errBox(['Enter a year between 1 and 9999.']); return; }
      out.innerHTML = '<div class="skeleton"></div><div class="skeleton" style="width:80%"></div>';
      let res;
      try { res = await fetchList(C.value, y); }
      catch (e) { out.innerHTML = `<div class="note error">Could not load holidays: ${esc(e.message)} <button class="btn btn-sm" id="hfRetry">Retry</button></div>`; M.$('#hfRetry', el).addEventListener('click', run); return; }
      lastList = res.list; lastSource = res.source;
      const type = M.$('#hfT', el).value, q = M.norm(M.$('#hfQ', el).value.trim());
      const today = M.today();
      const list = res.list.filter(h => (!type || h.type === type) && (!q || M.norm(h.name).includes(q)));
      out.innerHTML = list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Holiday</th><th>Type</th><th class="num">When</th><th></th></tr></thead><tbody>${list.map(h => `<tr class="${TE.compareDates(h.date, today) === 0 ? 'is-selected' : ''}"><td class="nowrap">${esc(TE.formatDateShort(h.date))}</td><td>${esc(h.name)}${h.note ? `<div class="tiny muted">${esc(h.note)}</div>` : ''}</td><td><span class="badge ${h.type === 'public' ? 'danger' : h.type === 'religious' ? 'primary' : 'accent'}">${esc(h.type)}</span></td><td class="num small">${esc(M.relDays(TE.daysBetween(today, h.date)))}</td><td class="right"><button class="btn btn-sm btn-ghost" data-next="${esc(h.name)}">Next</button></td></tr>`).join('')}</tbody></table></div><p class="tiny muted" style="margin-top:8px">${esc(res.source)} Public holiday = official non-working day; observance = recognised but usually not a day off.</p>`
        : `<div class="empty">No holidays match.</div>`;
    }
    async function nextOccurrence(name) {
      const today = M.today();
      const base = name.replace(/ \((observed|substitute day)\)$/, '');
      for (let y = today.y; y <= today.y + 5; y++) {
        let res; try { res = await fetchList(C.value, y); } catch (e) { M.toast(e.message); return; }
        const h = res.list.find(x => x.name.replace(/ \((observed|substitute day)\)$/, '') === base && TE.compareDates(x.date, today) >= 0);
        if (h) { M.toast(`Next ${base}: ${TE.formatDateLong(h.date)} (${M.relDays(TE.daysBetween(today, h.date))})`); return; }
      }
      M.toast(`No upcoming “${base}” found in the next 5 years.`);
    }
    async function onDate() {
      const out = M.$('#hfDOut', el), r = M.readDate(M.$('#hfD', el));
      if (!r.ok) { out.textContent = ''; return; }
      const d = r.date, hits = [];
      for (const cc of Object.keys(TE.HOLIDAY_COUNTRIES)) TE.holidaysFor(cc, d.y).filter(h => TE.compareDates(h.date, d) === 0).forEach(h => hits.push(`${h.name} — ${TE.HOLIDAY_COUNTRIES[cc]} (${h.type})`));
      TE.observancesFor(d.y).filter(h => TE.compareDates(h.date, d) === 0).forEach(h => hits.push(`${h.name} (${h.type})`));
      if (C.value.startsWith('n:')) { try { (await nagerHolidays(C.value.slice(2), d.y)).filter(h => TE.compareDates(h.date, d) === 0).forEach(h => hits.push(`${h.name} — ${C.value.slice(2)} (${h.type})`)); } catch (e) { /* ignore */ } }
      out.innerHTML = `<b>${esc(TE.formatDateLong(d))}:</b> ${hits.length ? esc([...new Set(hits)].join('; ')) : 'no holidays in the built-in calendars' + (C.value.startsWith('n:') ? ' or the selected country' : '')}.`;
    }
    run();
    return {};
  }

  /* ---------- Moon ---------- */
  function moonSVG(fraction, size = 92) {
    const r = size / 2 - 3, cx = size / 2, cy = size / 2;
    const f = TE.mod(fraction, 1);
    const rx = Math.abs(Math.cos(2 * Math.PI * f)) * r;
    const waxing = f < 0.5;
    const gibbous = f > 0.25 && f < 0.75;
    let d;
    if (waxing) d = `M${cx},${cy - r} A${r},${r} 0 0 1 ${cx},${cy + r} A${rx},${r} 0 0 ${gibbous ? 1 : 0} ${cx},${cy - r}Z`;
    else d = `M${cx},${cy - r} A${r},${r} 0 0 0 ${cx},${cy + r} A${rx},${r} 0 0 ${gibbous ? 0 : 1} ${cx},${cy - r}Z`;
    return `<svg class="moon-disc" viewBox="0 0 ${size} ${size}" role="img" aria-label="Moon phase illustration"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#2a3150" stroke="none"/><path d="${d}" fill="#f4eccd" stroke="none"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-strong)" stroke-width="1"/></svg>`;
  }
  function buildMoon(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="card">
        <div class="row"><div class="field" style="flex:0 1 190px"><label for="mnD">Date</label><input class="input" type="date" id="mnD" value="${M.dateInputValue(t)}"></div><div id="mnT" style="flex:1 1 230px"></div><div id="mnZ" style="flex:2 1 260px"></div></div>
        <div id="mnOut" class="result"></div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:8px">Principal phases</h2><div id="mnList"></div>
        <p class="tiny muted" style="margin-top:8px">Phase instants computed with Jean Meeus’s algorithm (Astronomical Algorithms, ch. 49), including the main periodic and planetary corrections; typically accurate to within a minute or two. Times are rounded to the minute and should be treated as approximate. Illumination is estimated from the moon’s age and can differ from precise ephemerides by a few percent.</p></div>`;
    const tf = M.timeField(M.$('#mnT', el), { label: 'Time', value: { h: 12, mi: 0, s: 0 }, seconds: false, onChange: run });
    const zp = M.zonePicker(M.$('#mnZ', el), { label: 'Time zone', value: M.localZone(), noMeta: true, onChange: run });
    M.$('#mnD', el).addEventListener('input', run);
    function run() {
      const out = M.$('#mnOut', el), d = M.readDate(M.$('#mnD', el)), tt = tf.get(), z = zp.get();
      if (!d.ok || !tt || !z) { out.innerHTML = errBox([d.error || 'Check the inputs.']); return; }
      if (d.date.y < 1000 || d.date.y > 3000) { out.innerHTML = errBox(['Moon calculations are supported for years 1000–3000.']); M.$('#mnList', el).innerHTML = ''; return; }
      const r = TE.resolveLocal(z, { ...d.date, ...tt, ms: 0 });
      const inst = r.status === 'gap' ? r.shiftedEpochMs : r.candidates[0].epochMs;
      const mi = TE.moonInfo(inst);
      out.innerHTML = `<div class="row" style="align-items:center;gap:20px">${moonSVG(mi.fraction)}<div><div class="result-big">${esc(mi.name)}</div><p class="small">Illumination ≈ <b>${Math.round(mi.illumination * 100)}%</b> · Moon age ≈ <b>${mi.ageDays.toFixed(1)} days</b> into a ${((mi.nextNew.epochMs - mi.prevNew.epochMs) / 86400000).toFixed(2)}-day lunation · ${mi.fraction < 0.5 ? 'waxing' : 'waning'}</p>
        <p class="small muted">Upcoming: ${mi.upcoming.map(p => `${esc(p.name)} ${esc(M.fmtDate(TE.toZoned(z, p.epochMs), 'short'))} ≈${esc(M.fmtTime(TE.toZoned(z, p.epochMs)))}`).join(' · ')}</p></div></div>`;
      const start = TE.wallToMs({ ...d.date, d: 1 }) - 86400000 * 2;
      const phases = TE.moonPhasesBetween(start, start + 92 * 86400000);
      M.$('#mnList', el).innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Phase</th><th>Date & time (${esc(M.refShort(z))})</th><th>UTC</th></tr></thead><tbody>${phases.map(p => { const w = TE.toZoned(z, p.epochMs); return `<tr><td>${['🌑', '🌓', '🌕', '🌗'][p.phase]} ${esc(p.name)}</td><td>${esc(M.fmtDateW(w))} ≈ ${esc(M.fmtTime(w))}</td><td class="mono small">${esc(new Date(Math.round(p.epochMs / 60000) * 60000).toISOString().slice(0, 16).replace('T', ' '))}</td></tr>`; }).join('')}</tbody></table></div>`;
    }
    run();
    return { params: (p) => { if (p.date) { const r = TE.parseISODate(p.date); if (r.ok) { M.$('#mnD', el).value = M.dateInputValue(r.date); run(); } } } };
  }

  /* ---------- Seasons ---------- */
  function buildSeasons(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="card">
        <div class="row"><div class="field" style="flex:0 1 140px"><label for="ssY">Year</label><input class="input num-input" type="number" id="ssY" value="${t.y}" min="1000" max="3000"></div><div id="ssZ" style="flex:2 1 280px"></div></div>
        <div id="ssOut" class="result"></div>
        <p class="tiny muted">Computed with Meeus’s method (ch. 27) including 24 periodic terms and a ΔT estimate; accuracy is about a minute for years 1000–3000. Times are rounded to the minute.</p>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:6px">Season conventions</h2>
        <div class="table-wrap"><table class="table"><thead><tr><th>Season (Northern Hemisphere)</th><th>Astronomical</th><th>Meteorological</th><th>Southern Hemisphere</th></tr></thead><tbody>
        <tr><td>Spring</td><td>March equinox → June solstice</td><td>March 1 – May 31</td><td>Autumn</td></tr>
        <tr><td>Summer</td><td>June solstice → September equinox</td><td>June 1 – August 31</td><td>Winter</td></tr>
        <tr><td>Autumn</td><td>September equinox → December solstice</td><td>September 1 – November 30</td><td>Spring</td></tr>
        <tr><td>Winter</td><td>December solstice → March equinox</td><td>December 1 – end of February</td><td>Summer</td></tr></tbody></table></div>
        <p class="small muted" style="margin-top:8px">Meteorological seasons use whole months for easier record-keeping. The equinox/solstice is a single instant worldwide, so its local date depends on your time zone.</p></div>`;
    const zp = M.zonePicker(M.$('#ssZ', el), { label: 'Show times in', value: M.localZone(), noMeta: true, onChange: run });
    M.$('#ssY', el).addEventListener('input', run);
    function run() {
      const y = Number(M.$('#ssY', el).value), z = zp.get(), out = M.$('#ssOut', el);
      if (!Number.isInteger(y) || y < 1000 || y > 3000) { out.innerHTML = errBox(['Enter a year from 1000 to 3000.']); return; }
      const s = TE.seasonsOfYear(y), now = Date.now();
      const rows = [['March equinox', s.march, 'Spring begins (N) / Autumn begins (S)'], ['June solstice', s.june, 'Longest day (N) / shortest day (S)'], ['September equinox', s.september, 'Autumn begins (N) / Spring begins (S)'], ['December solstice', s.december, 'Shortest day (N) / longest day (S)']];
      out.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Event</th><th>${esc(M.refShort(z))}</th><th>UTC</th><th>When</th></tr></thead><tbody>${rows.map(([n, e, note]) => { const w = TE.toZoned(z, e.epochMs), u = TE.toZoned(TE.UTC, e.epochMs); return `<tr><td><b>${n}</b><div class="tiny muted">${note}</div></td><td>${esc(M.fmtDateW(w))} ≈ ${esc(M.fmtTime(w))}</td><td class="mono small">${esc(TE.isoDate(u))} ${TE.pad(u.h)}:${TE.pad(u.mi)}</td><td class="small">${e.epochMs > now ? esc(M.relDays(TE.daysBetween(M.today(), w))) : 'past'}</td></tr>`; }).join('')}</tbody></table></div>`;
    }
    run();
    return {};
  }

  /* ---------- Sunrise / sunset ---------- */
  function buildSun(el) {
    const t = M.today();
    const defCity = M.D.CITIES.find(c => c.zone === M.localZoneId) || M.D.CITIES[2];
    el.innerHTML = `
      <div class="card">
        <div class="row"><div id="snCity" style="flex:2 1 280px"></div><div class="field" style="flex:0 1 190px"><label for="snD">Local date</label><input class="input" type="date" id="snD" value="${M.dateInputValue(t)}"></div></div>
        <div class="row" style="margin-top:8px"><div class="field"><label for="snLat">Latitude (°N, negative = S)</label><input class="input num-input" type="number" step="0.01" id="snLat" value="${defCity.lat}"></div><div class="field"><label for="snLon">Longitude (°E, negative = W)</label><input class="input num-input" type="number" step="0.01" id="snLon" value="${defCity.lon}"></div><div id="snZ" style="flex:2 1 260px"></div></div>
        <div id="snOut" class="result"></div>
        <p class="tiny muted">NOAA solar-position algorithm with standard refraction (sun’s centre 0.833° below the horizon). Results are approximate (typically ±1–2 minutes; more near the poles) and depend on the exact location, elevation and atmospheric conditions. Times are shown in the selected time zone for the chosen local date.</p>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:8px">Day length through the year</h2><div id="snYear"></div></div>`;
    const zp = M.zonePicker(M.$('#snZ', el), { label: 'Time zone for results', value: M.cityRef(defCity), noMeta: true, includeFixed: true, onChange: run });
    M.zonePicker(M.$('#snCity', el), { label: 'City (sets coordinates and zone)', value: M.cityRef(defCity), noMeta: true, includeFixed: false, onChange: (r) => {
      let c = r.lat != null ? r : null;
      if (!c) { const x = M.D.CITIES.find(cc => cc.zone === r.id); if (x) c = M.cityRef(x); }
      if (c) { M.$('#snLat', el).value = c.lat; M.$('#snLon', el).value = c.lon; zp.set(r, true); run(); }
      else M.toast('No coordinates for that zone — enter latitude and longitude manually.');
    } });
    ['snD', 'snLat', 'snLon'].forEach(i => M.$('#' + i, el).addEventListener('input', run));
    function evText(e, z, label) {
      if (e.none === 'above') return `<span class="muted">Sun stays above the horizon (midnight sun)</span>`;
      if (e.none === 'below') return `<span class="muted">Sun stays below the horizon (polar night)</span>`;
      return esc(M.fmtTime(TE.toZoned(z, e.epochMs)));
    }
    function compute(date, lat, lon, z) {
      // Evaluate the local calendar date: find the UTC date whose solar noon falls on that local date
      const s = TE.solarEvents(date, lat, lon);
      const nw = TE.toZoned(z, s.solarNoonMs);
      const shift = TE.daysBetween(nw, date);
      return shift ? TE.solarEvents(TE.addDays(date, shift), lat, lon) : s;
    }
    function run() {
      const out = M.$('#snOut', el), d = M.readDate(M.$('#snD', el)), z = zp.get();
      const lat = Number(M.$('#snLat', el).value), lon = Number(M.$('#snLon', el).value);
      const errs = []; if (!d.ok) errs.push(d.error); if (!z) errs.push('Choose a time zone.');
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) errs.push('Latitude must be between −90 and 90.');
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) errs.push('Longitude must be between −180 and 180.');
      if (errs.length) { out.innerHTML = errBox(errs); return; }
      const s = compute(d.date, lat, lon, z);
      let len = '—';
      if (s.sunrise.epochMs && s.sunset.epochMs) { const b = TE.breakdown(s.sunset.epochMs - s.sunrise.epochMs); len = `${b.hours}h ${TE.pad(b.minutes)}m`; }
      else if (s.sunrise.none === 'above') len = '24h (midnight sun)'; else if (s.sunrise.none === 'below') len = '0h (polar night)';
      out.innerHTML = `<div class="grid auto-sm">
        <div class="stat"><div class="k">Sunrise</div><div class="v">${evText(s.sunrise, z)}</div></div>
        <div class="stat"><div class="k">Sunset</div><div class="v">${evText(s.sunset, z)}</div></div>
        <div class="stat"><div class="k">Day length</div><div class="v">${esc(len)}</div></div>
        <div class="stat"><div class="k">Solar noon</div><div class="v">${esc(M.fmtTime(TE.toZoned(z, s.solarNoonMs)))}</div><div class="d">Sun altitude ≈ ${s.noonAltitude.toFixed(1)}°</div></div>
        <div class="stat"><div class="k">Civil dawn</div><div class="v">${evText(s.civilDawn, z)}</div></div>
        <div class="stat"><div class="k">Civil dusk</div><div class="v">${evText(s.civilDusk, z)}</div></div></div>`;
      const y = d.date.y;
      const rows = [];
      for (let m = 1; m <= 12; m++) {
        const date = { y, m, d: 21 };
        const e = compute(date, lat, lon, z);
        let l = '—';
        if (e.sunrise.epochMs && e.sunset.epochMs) l = TE.formatBreakdown(e.sunset.epochMs - e.sunrise.epochMs, { compact: true, withMs: false }).replace(/ \d+s$/, '');
        else l = e.sunrise.none === 'above' ? '24h' : '0h';
        rows.push(`<tr><td>${TE.MONTHS_SHORT[m - 1]} 21</td><td>${evText(e.sunrise, z)}</td><td>${evText(e.sunset, z)}</td><td class="num">${esc(l)}</td></tr>`);
      }
      M.$('#snYear', el).innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Date (${y})</th><th>Sunrise</th><th>Sunset</th><th class="num">Day length</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    }
    run();
    return {};
  }

  const B = { easter: buildEaster, f13: buildF13, holidays: buildHolidays, moon: buildMoon, seasons: buildSeasons, sun: buildSun };
  function show(params) { const { tab: t, ...rest } = params; setTab(t || tab, rest); }
  M.register('holidays', { init, show });
})();
