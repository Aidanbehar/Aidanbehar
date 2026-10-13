/* Meridian — Home / Today dashboard */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  let root, mode = 'local', picker, lastDateKey = '', lastShownKey = '', lastMinuteKey = '';

  function shownZone() {
    if (mode === 'utc') return M.utcZone();
    if (mode === 'pick') return M.parseRef(M.settings.homeZone) || M.ianaRef('Asia/Tokyo');
    return M.localZone();
  }

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('home', 'Today', 'Your current date and time, calendar facts, and what is coming up — detected automatically from your browser.')}
      <div class="hero">
        <div class="card hero-clock">
          <div class="seg zone-switch" role="group" aria-label="Show time for">
            <button data-mode="local" aria-pressed="true">Local</button>
            <button data-mode="utc" aria-pressed="false">UTC</button>
            <button data-mode="pick" aria-pressed="false">Other location</button>
          </div>
          <div id="homePickWrap" hidden style="max-width:360px;margin-bottom:10px"></div>
          <div class="hero-time" id="heroTime" aria-live="off"></div>
          <div class="hero-date" id="heroDate"></div>
          <div class="hero-zone" id="heroZone"></div>
          <div class="hero-meta" id="heroMeta"></div>
          <svg class="hero-analog" id="heroAnalog" viewBox="0 0 100 100" aria-hidden="true"></svg>
          <div class="hero-facts" id="heroFacts"></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Tomorrow</h2><span class="sub" id="tmrSub"></span></div>
          <div id="tomorrow"></div>
        </div>
      </div>
      <div class="grid cols-4 section-gap" id="homeStats"></div>
      <div class="card section-gap">
        <div class="card-head"><h3>Year progress</h3><span class="sub" id="yearPct"></span></div>
        <div class="year-progress" aria-hidden="true"><div id="yearBar"></div></div>
        <div class="small muted" id="yearNote"></div>
      </div>
      <div class="grid cols-2 section-gap">
        <div class="card">
          <div class="card-head"><h2 id="todayHistTitle">Today in history</h2><a class="btn btn-sm" id="todayHistLink" href="#/history">All events</a></div>
          <div id="todayHist"></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Coming up</h2><span class="sub">relative to your local date</span></div>
          <ul class="milestones" id="milestones"></ul>
        </div>
      </div>
      <div class="card section-gap">
        <div class="card-head"><h2>Around the world</h2><a class="btn btn-sm" href="#/clock">Open world clock</a></div>
        <div class="mini-clocks" id="miniClocks"></div>
      </div>
      <div class="card section-gap" id="recentCard" hidden>
        <div class="card-head"><h3>Recent calculations</h3><span class="sub">stored only in this browser</span><a class="btn btn-sm btn-ghost" href="#/settings">Manage</a></div>
        <ul class="recent-list" id="recentList"></ul>
      </div>`;
    el.querySelector('.zone-switch').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mode]'); if (!b) return;
      mode = b.dataset.mode;
      M.$$('.zone-switch button', el).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      M.$('#homePickWrap', el).hidden = mode !== 'pick';
      if (mode === 'pick' && !picker) {
        picker = M.zonePicker(M.$('#homePickWrap', el), { value: shownZone(), noMeta: true, onChange: (r) => { M.setSetting('homeZone', M.serializeRef(r)); renderAll(); } });
        picker.el.querySelector('input').style.background = 'rgba(255,255,255,.95)';
        picker.el.querySelector('input').style.color = '#182036';
      }
      renderAll();
    });
    el.addEventListener('click', (e) => {
      const mc = e.target.closest('.mini-clock[data-ref]');
      if (mc) M.go('map', { zone: mc.dataset.ref });
    });
    M.onSettings(() => { if (root && !root.hidden) renderAll(); });
  }

  function statCard(k, v, d, tip) {
    return `<div class="stat"><div class="k">${tip ? `<span data-tip title="${esc(tip)}">${esc(k)}</span>` : esc(k)}</div><div class="v">${v}</div>${d ? `<div class="d">${d}</div>` : ''}</div>`;
  }

  function renderClock(now) {
    const z = shownZone();
    const w = TE.toZoned(z, now);
    const h12 = M.settings.hour12;
    const hh = h12 ? (w.h % 12 === 0 ? 12 : w.h % 12) : TE.pad(w.h);
    M.$('#heroTime', root).innerHTML = `${hh}:${TE.pad(w.mi)}<span class="sec">:${TE.pad(w.s)}${h12 ? (w.h < 12 ? ' AM' : ' PM') : ''}</span>`;
    drawAnalog(w);
    const key = `${TE.isoDate(w)}|${M.serializeRef(z)}|${w.offsetSec}|${M.settings.dateFormat}|${M.settings.weekConvention}`;
    if (key !== lastShownKey) { lastShownKey = key; renderShownDate(z, w, now); }
  }

  function drawAnalog(w) {
    const svg = M.$('#heroAnalog', root);
    if (!svg.firstChild) {
      svg.innerHTML = `<circle cx="50" cy="50" r="47" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>` +
        Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${50 + 40 * Math.sin(a)}" y1="${50 - 40 * Math.cos(a)}" x2="${50 + (i % 3 ? 43 : 45) * Math.sin(a)}" y2="${50 - (i % 3 ? 43 : 45) * Math.cos(a)}" stroke="rgba(255,255,255,${i % 3 ? .5 : .9})" stroke-width="${i % 3 ? 1.2 : 2.2}" stroke-linecap="round"/>`; }).join('') +
        `<line id="hH" x1="50" y1="50" x2="50" y2="27" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><line id="hM" x1="50" y1="50" x2="50" y2="15" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><line id="hS" x1="50" y1="56" x2="50" y2="12" stroke="#ffc65c" stroke-width="1.2" stroke-linecap="round"/><circle cx="50" cy="50" r="2.6" fill="#ffc65c"/>`;
    }
    const sec = w.s, min = w.mi + sec / 60, hr = (w.h % 12) + min / 60;
    svg.querySelector('#hH').setAttribute('transform', `rotate(${hr * 30} 50 50)`);
    svg.querySelector('#hM').setAttribute('transform', `rotate(${min * 6} 50 50)`);
    svg.querySelector('#hS').setAttribute('transform', `rotate(${sec * 6} 50 50)`);
  }

  function renderFacts(z, w, now) {
    const facts = [];
    const u = TE.toZoned(TE.UTC, now);
    if (!z.isUTC) facts.push(['UTC', `${M.fmtTime(u, { hour12: false })} · ${TE.WEEKDAYS_SHORT[u.weekday]}`]);
    const mi = TE.moonInfo(now);
    facts.push(['Moon', `${mi.name} · ${Math.round(mi.illumination * 100)}%`]);
    let lat = z.lat, lon = z.lon;
    if (lat == null && z.kind === 'iana') { const c = M.D.CITIES.find(x => x.zone === z.id); if (c) { lat = c.lat; lon = c.lon; } }
    if (lat != null) {
      const s = TE.solarEvents({ y: w.y, m: w.m, d: w.d }, lat, lon);
      const f = (e) => e.epochMs ? M.fmtTime(TE.toZoned(z, e.epochMs)) : e.none === 'above' ? 'up all day' : 'below horizon';
      facts.push([`Sun${z.city ? ' · ' + z.city : ''}`, `↑ ${f(s.sunrise)}  ↓ ${f(s.sunset)}`]);
    }
    const ny = TE.resolveLocal(z, { y: w.y + 1, m: 1, d: 1, h: 0, mi: 0, s: 0 });
    const nyT = ny.status === 'gap' ? ny.shiftedEpochMs : ny.candidates[0].epochMs;
    facts.push([`New Year ${w.y + 1}`, `in ${TE.formatNumber(Math.ceil((nyT - now) / 86400000))} days`]);
    M.$('#heroFacts', root).innerHTML = facts.map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('');
  }

  function renderShownDate(z, w, now) {
    const dt = { y: w.y, m: w.m, d: w.d };
    const ds = TE.dstInfo(z, now);
    M.$('#heroDate', root).textContent = TE.formatDateLong(dt);
    const name = z.kind === 'iana' ? (TE.zoneName(z, now, 'long') || '') : (z.name || '');
    M.$('#heroZone', root).innerHTML = `${mode === 'local' ? 'Your detected time zone: ' : mode === 'utc' ? '' : 'Showing time in '}<b>${esc(z.kind === 'iana' ? z.id : M.refTitle(z))}</b>${name ? ' · ' + esc(name) : ''}`;
    const wk = TE.weekNumber(dt.y, dt.m, dt.d, M.settings.weekConvention);
    const badges = [
      `${TE.WEEKDAYS[w.weekday]}`, `Day ${TE.dayOfYear(dt.y, dt.m, dt.d)} of ${TE.daysInYear(dt.y)}`, `Week ${wk.week}${wk.year !== dt.y ? ' of ' + wk.year : ''} (${M.settings.weekConvention.toUpperCase()})`,
      TE.formatOffset(w.offsetSec), ds.observesDst ? (ds.isDst ? 'Daylight saving time in effect' : 'Standard time (DST not in effect)') : (z.kind === 'iana' ? 'No daylight saving this year' : 'Fixed offset')
    ];
    M.$('#heroMeta', root).innerHTML = badges.map(b => `<span class="badge">${esc(b)}</span>`).join('');
    if (mode !== 'local') {
      const lw = TE.toZoned(M.localZone(), now);
      const cmp = TE.compareDates(dt, lw);
      if (cmp !== 0) M.$('#heroMeta', root).insertAdjacentHTML('beforeend', `<span class="badge">${cmp > 0 ? 'A day ahead of' : 'A day behind'} your local date</span>`);
    }
    renderStats(z, dt, w, now);
    renderFacts(z, w, now);
  }

  function renderStats(z, dt, w, now) {
    const wk = TE.weekNumber(dt.y, dt.m, dt.d, M.settings.weekConvention);
    const iso = TE.isoWeek(dt.y, dt.m, dt.d);
    const doy = TE.dayOfYear(dt.y, dt.m, dt.d), diy = TE.daysInYear(dt.y);
    const leap = TE.isLeapYear(dt.y);
    const ds = TE.dstInfo(z, now);
    const lat = z.lat != null ? z.lat : (z.kind === 'iana' && /^(Australia|Pacific\/Auckland|America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|La_Paz|Lima)|Africa\/(Johannesburg|Windhoek|Maputo|Harare|Lusaka))/.test(z.id) ? -30 : 30);
    const southern = M.settings.hemisphere === 'south' || (M.settings.hemisphere === 'auto' && lat < 0);
    const met = TE.meteorologicalSeason(dt.m, southern);
    const astro = TE.astronomicalSeason(now, southern);
    const u = TE.toZoned(TE.UTC, now);
    const qStart = { y: dt.y, m: (TE.quarter(dt.m) - 1) * 3 + 1, d: 1 };
    const stats = [
      statCard('Weekday', esc(TE.WEEKDAYS[w.weekday]), `${esc(TE.MONTHS[dt.m - 1])} ${dt.y}`),
      statCard('Day of year', `${doy} <span class="small muted">/ ${diy}</span>`, `${diy - doy} days remaining`),
      statCard('Week number', `${wk.week}`, `${esc(M.settings.weekConvention === 'iso' ? 'ISO 8601' : TE.WEEK_CONVENTIONS[M.settings.weekConvention].split(' (')[0])}${M.settings.weekConvention !== 'iso' ? ` · ISO: W${iso.week}` : (iso.year !== dt.y ? ` · week-year ${iso.year}` : '')}`, TE.WEEK_CONVENTIONS[M.settings.weekConvention]),
      statCard('Leap year?', leap ? 'Yes' : 'No', `${dt.y} has ${diy} days · Feb has ${TE.daysInMonth(dt.y, 2)}`),
      statCard('Quarter', `Q${TE.quarter(dt.m)}`, `Day ${TE.daysBetween(qStart, dt) + 1} of the quarter`),
      statCard('Season', esc(met), `Meteorological (${southern ? 'Southern' : 'Northern'} Hemisphere) · Astronomical: ${esc(astro.name)}`, 'Meteorological seasons use whole months (e.g. Northern spring = March–May). Astronomical seasons run between equinoxes and solstices. The hemisphere is inferred from the shown location; change it in Settings.'),
      statCard('UTC time', esc(M.fmtTime(u, { seconds: false, hour12: false })), esc(TE.formatDateShort(u))),
      statCard('UTC offset', esc(TE.formatOffset(w.offsetSec)), ds.observesDst ? (ds.isDst ? `Daylight time (standard is ${esc(TE.formatOffset(ds.standardSec))})` : `Standard time (daylight is ${esc(TE.formatOffset(ds.daylightSec))})`) : 'No DST in this zone this year')
    ];
    M.$('#homeStats', root).innerHTML = stats.join('');
    const pct = ((doy - 1) + (w.h * 3600 + w.mi * 60 + w.s) / 86400) / diy * 100;
    M.$('#yearBar', root).style.width = pct.toFixed(2) + '%';
    M.$('#yearPct', root).textContent = `${pct.toFixed(1)}% of ${dt.y} has passed`;
    M.$('#yearNote', root).textContent = `${diy - doy} days remain after today until December 31, ${dt.y}. ${leap ? `${dt.y} is a leap year.` : `The next leap year is ${nextLeap(dt.y)}.`}`;
  }
  const nextLeap = (y) => { let x = y + 1; while (!TE.isLeapYear(x)) x++; return x; };

  function renderLocalDated(now) {
    const lz = M.localZone();
    const today = M.today(lz);
    const tmr = TE.addDays(today, 1);
    // Tomorrow panel
    const hols = upcomingHolidays(tmr, tmr);
    const facts = [];
    facts.push(`Day ${TE.dayOfYear(tmr.y, tmr.m, tmr.d)} of ${tmr.y}; ISO week ${TE.isoWeek(tmr.y, tmr.m, tmr.d).week}.`);
    if (tmr.d === 1) facts.push(`First day of ${TE.MONTHS[tmr.m - 1]}${tmr.m === 1 ? ' — a new year begins' : ''}.`);
    if (tmr.d === TE.daysInMonth(tmr.y, tmr.m)) facts.push(`Last day of ${TE.MONTHS[tmr.m - 1]}.`);
    if (tmr.m === 2 && tmr.d === 29) facts.push('Leap day — February 29 only occurs in leap years.');
    if (tmr.d === 13 && TE.weekday(tmr.y, tmr.m, tmr.d) === 5) facts.push('Friday the 13th!');
    const wdT = TE.weekday(tmr.y, tmr.m, tmr.d);
    if (wdT === 0 || wdT === 6) facts.push('It falls on a weekend.');
    const trans = TE.nextTransition(lz, now, 3);
    if (trans) { const tw = TE.toZoned(lz, trans.epochMs); if (TE.compareDates(tw, tmr) === 0) facts.push(`Clocks change tomorrow in ${M.localZoneId}: ${TE.formatOffset(trans.before)} → ${TE.formatOffset(trans.after)}.`); }
    const moonTmr = TE.moonPhasesBetween(TE.wallToMs({ ...tmr, h: 0 }) - TE.offsetAt(lz, now) * 1000, TE.wallToMs({ ...tmr, h: 24 }) - TE.offsetAt(lz, now) * 1000);
    moonTmr.forEach(p => facts.push(`${p.name} (approx. ${M.fmtTime(TE.toZoned(lz, p.epochMs))} local).`));
    M.$('#tmrSub', root).textContent = `${M.localZoneId}`;
    M.$('#tomorrow', root).innerHTML = `
      <div class="result-mid">${esc(TE.formatDateLong(tmr))}</div>
      <div class="small muted" style="margin:2px 0 10px">Starts in <b id="tmrCountdown" class="tabular"></b> (local midnight)</div>
      ${hols.length ? `<div class="stack" style="gap:6px;margin-bottom:8px">${hols.map(h => `<div class="small"><span class="badge ${h.type === 'public' ? 'danger' : h.type === 'religious' ? 'primary' : 'accent'}">${esc(h.type === 'public' ? 'Public holiday · ' + h.country : h.type)}</span> ${esc(h.name)}</div>`).join('')}</div>` : `<div class="small muted" style="margin-bottom:8px">No holidays in the built-in calendars (${esc(M.TE.HOLIDAY_COUNTRIES[M.settings.holidayCountry] || M.settings.holidayCountry)} + major observances).</div>`}
      <ul class="small" style="margin:0 0 10px;padding-left:18px">${facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="small strong" style="margin-bottom:6px">On ${TE.MONTHS[tmr.m - 1]} ${tmr.d} in history</div>
      <div id="tmrHist"><div class="skeleton"></div><div class="skeleton" style="width:70%"></div></div>
      <div style="margin-top:8px"><a class="btn btn-sm" href="${M.link('history', { m: tmr.m, d: tmr.d })}">Explore ${TE.MONTHS_SHORT[tmr.m - 1]} ${tmr.d}</a> <a class="btn btn-sm btn-ghost" href="${M.link('explorer', { date: TE.isoDate(tmr) })}">Date details</a></div>`;
    M.$('#todayHistTitle', root).textContent = `${TE.MONTHS[today.m - 1]} ${today.d} in history`;
    M.$('#todayHistLink', root).href = M.link('history', { m: today.m, d: today.d });
    loadHist(today, '#todayHist', 7);
    loadHist(tmr, '#tmrHist', 3);
    renderMilestones(today, now);
  }

  function loadHist(dt, sel, n) {
    const box = M.$(sel, root);
    if (!M.historyApi) { box.innerHTML = '<div class="small muted">History module unavailable.</div>'; return; }
    box.innerHTML = '<div class="skeleton"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:60%"></div>';
    M.historyApi.get(dt.m, dt.d).then((data) => {
      let items = (data.selected && data.selected.length ? data.selected : data.events || []).slice();
      if (items.length < n) items = items.concat((data.events || []).filter(e => !items.includes(e)));
      items = items.slice(0, n);
      if (!items.length) { box.innerHTML = `<div class="small muted">No events available for this date${data.local ? ' in the limited offline dataset' : ''}.</div>`; return; }
      box.innerHTML = `<ul class="hist-list">${items.map(e => `<li><span class="hist-year">${esc(M.historyApi.fmtYear(e.year))}</span><span class="hist-text">${esc(e.text)} ${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">Source ↗</a>` : ''}</span></li>`).join('')}</ul>
        <div class="tiny muted" style="margin-top:8px">${data.local ? 'Limited offline dataset (Wikipedia feed unreachable).' : 'Source: Wikipedia “On this day” (Wikimedia REST API).'}</div>`;
    }).catch((err) => {
      box.innerHTML = `<div class="note error small">Could not load history: ${esc(err.message)} <button class="btn btn-sm" data-retry>Retry</button></div>`;
      box.querySelector('[data-retry]').addEventListener('click', () => loadHist(dt, sel, n));
    });
  }

  function upcomingHolidays(from, to) {
    const out = [];
    for (let y = from.y; y <= to.y; y++) {
      out.push(...TE.holidaysFor(M.settings.holidayCountry, y));
      out.push(...TE.observancesFor(y).filter(o => /Easter|Christmas Day|New Year's Day|Halloween|Valentine|Good Friday|Orthodox Christmas|Women|Ash Wednesday|Pentecost|Eve/.test(o.name)));
    }
    const seen = new Set();
    return out.filter(h => TE.compareDates(h.date, from) >= 0 && TE.compareDates(h.date, to) <= 0)
      .filter(h => { const k = TE.isoDate(h.date) + h.name.replace(/ \(.*/, ''); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => TE.compareDates(a.date, b.date));
  }

  function renderMilestones(today, now) {
    const lz = M.localZone();
    const items = [];
    const add = (ico, title, dt, extra) => items.push({ ico, title, dt, extra, days: TE.daysBetween(today, dt) });
    const f13 = TE.nextFriday13(today);
    add('🃏', 'Next Friday the 13th', f13, '<a href="#/holidays?tab=f13">finder</a>');
    const ew = TE.nextEaster(today, 'western'), eo = TE.nextEaster(today, 'orthodox');
    add('🥚', ew.isToday ? 'Easter (Western) is today!' : 'Easter Sunday (Western)', ew.date);
    add('🕯️', eo.isToday ? 'Orthodox Easter is today!' : 'Easter Sunday (Orthodox)', eo.date);
    const hol = upcomingHolidays(TE.addDays(today, 1), TE.addDays(today, 120)).filter(h => !/Easter Sunday/.test(h.name)).slice(0, 4);
    hol.forEach(h => add(h.type === 'public' ? '🏛️' : '🎉', `${h.name}${h.type === 'public' ? ` <span class="badge danger">${esc(h.country)}</span>` : ''}`, h.date));
    // equinox / solstice
    const evs = [];
    for (const y of [today.y, today.y + 1]) { const s = TE.seasonsOfYear(y); evs.push(['March equinox', s.march], ['June solstice', s.june], ['September equinox', s.september], ['December solstice', s.december]); }
    const nextEv = evs.find(([, e]) => e.epochMs > now);
    if (nextEv) { const w = TE.toZoned(lz, nextEv[1].epochMs); add('🌗', nextEv[0], { y: w.y, m: w.m, d: w.d }, `≈ ${esc(M.fmtTime(w))} local`); }
    const fm = TE.moonPhasesBetween(now, now + 32 * 86400000).find(p => p.phase === 2);
    if (fm) { const w = TE.toZoned(lz, fm.epochMs); add('🌕', 'Next full moon', { y: w.y, m: w.m, d: w.d }, `≈ ${esc(M.fmtTime(w))} local`); }
    const tr = TE.nextTransition(lz, now, 400);
    if (tr) { const w = TE.toZoned(lz, tr.epochMs); add('⏰', `Clocks change (${esc(TE.formatOffset(tr.before))} → ${esc(TE.formatOffset(tr.after))})`, { y: w.y, m: w.m, d: w.d }, esc(M.fmtTime(w))); }
    add('🎆', `New Year ${today.y + 1}`, { y: today.y + 1, m: 1, d: 1 });
    items.sort((a, b) => a.days - b.days);
    M.$('#milestones', root).innerHTML = items.map(i => `<li><span class="ico" aria-hidden="true">${i.ico}</span><div style="min-width:0"><div>${i.title}</div><div class="small muted">${esc(TE.formatDateLong(i.dt))}${i.extra ? ' · ' + i.extra : ''}</div></div><span class="when">${esc(M.relDays(i.days))}</span></li>`).join('');
  }

  function renderMiniClocks(now) {
    const refs = (M.clockApi ? M.clockApi.list() : []).slice(0, 8);
    const list = refs.length ? refs : ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'].map(M.ianaRef);
    const lt = M.today(M.localZone());
    M.$('#miniClocks', root).innerHTML = list.map(r => {
      const w = TE.toZoned(r, now);
      const cmp = TE.compareDates(w, lt);
      return `<button class="mini-clock" data-ref="${esc(M.serializeRef(r))}" title="Show ${esc(M.refTitle(r))} on the map"><div class="c"><span class="daypart dp-${M.dayPart(w.h)}"></span> ${esc(M.refShort(r))}</div><div class="t">${esc(M.fmtTime(w))}</div><div class="d">${esc(TE.WEEKDAYS_SHORT[w.weekday])}${cmp ? (cmp > 0 ? ' · tomorrow' : ' · yesterday') : ''} · ${esc(TE.formatOffset(w.offsetSec))}</div></button>`;
    }).join('');
  }

  function renderRecent() {
    const card = M.$('#recentCard', root);
    const items = M.recent.slice(0, 5);
    card.hidden = !items.length || !M.settings.saveRecent;
    M.$('#recentList', root).innerHTML = items.map(r => `<li><span class="badge">${esc(r.tool)}</span><a href="${esc(r.href || '#')}">${esc(r.summary)}</a><span class="when">${esc(new Date(r.at).toLocaleString())}</span></li>`).join('');
  }

  function renderAll() {
    lastShownKey = ''; lastDateKey = ''; lastMinuteKey = '';
    tick(Date.now());
    renderRecent();
  }
  function tick(now) {
    renderClock(now);
    const lt = TE.toZoned(M.localZone(), now);
    const key = TE.isoDate(lt) + M.settings.holidayCountry;
    if (key !== lastDateKey) { lastDateKey = key; renderLocalDated(now); }
    const cd = M.$('#tmrCountdown', root);
    if (cd) {
      const tmr = TE.addDays(lt, 1);
      const r = TE.resolveLocal(M.localZone(), { ...tmr, h: 0, mi: 0, s: 0 });
      const mid = r.status === 'gap' ? r.shiftedEpochMs : r.candidates[0].epochMs;
      const b = TE.breakdown(mid - now);
      cd.textContent = `${b.hours + b.days * 24}h ${TE.pad(b.minutes)}m ${TE.pad(b.seconds)}s`;
    }
    const minuteKey = Math.floor(now / 60000) + '|' + M.settings.hour12;
    if (minuteKey !== lastMinuteKey) { lastMinuteKey = minuteKey; renderMiniClocks(now); const z = shownZone(); renderFacts(z, TE.toZoned(z, now), now); }
  }

  M.register('home', { init, show: () => renderAll(), tick });
})();
