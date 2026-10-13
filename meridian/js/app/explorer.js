/* Meridian — Date explorer: weekday of any date, leap years, week numbers, historical (Julian) dates */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  let root, tab = 'date';
  const panes = {};
  const errBox = (errs) => `<div class="note error">${errs.map(esc).join('<br>')}</div>`;

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('explorer', 'Date Explorer', 'Everything about a date: weekday, day of year, week numbers, leap years and how historical calendars line up.')}
      <div class="tabs" role="tablist" id="exTabs">
        <button role="tab" data-tab="date">Weekday & date facts</button>
        <button role="tab" data-tab="leap">Leap years</button>
        <button role="tab" data-tab="week">Week numbers</button>
        <button role="tab" data-tab="historic">Historical dates</button>
      </div><div id="exPane"></div>`;
    M.$('#exTabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    M.bindCopy(el);
  }
  function setTab(t, params = {}) {
    if (!B[t]) t = 'date';
    tab = t;
    M.$$('#exTabs [data-tab]', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    Object.values(panes).forEach(p => { p.el.hidden = true; });
    if (!panes[t]) { const el = document.createElement('div'); M.$('#exPane', root).appendChild(el); panes[t] = { el, api: B[t](el) }; }
    panes[t].el.hidden = false;
    if (panes[t].api.params) panes[t].api.params(params);
  }

  /* ---------- Date facts ---------- */
  function buildDate(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="card">
        <div class="row">
          <div class="field" style="flex:0 1 200px"><label for="exPick">Pick a date</label><input class="input" type="date" id="exPick" value="${M.dateInputValue(t)}"></div>
          <div class="field" style="flex:0 1 110px"><label for="exY">Year</label><input class="input num-input" type="number" id="exY" value="${t.y}" step="1"></div>
          <div class="field" style="flex:0 1 150px"><label for="exM">Month</label><select class="select" id="exM">${TE.MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === t.m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
          <div class="field" style="flex:0 1 90px"><label for="exD">Day</label><input class="input num-input" type="number" id="exD" value="${t.d}" step="1"></div>
          <button class="btn" id="exToday" style="flex:0 0 auto">Today</button>
        </div>
        <p class="tiny muted" style="margin:8px 0 0">Year/month/day fields accept any year from −271,820 to 275,759 (astronomical numbering: year 0 = 1 BCE). Dates use the proleptic Gregorian calendar — see “Historical dates” for Julian-calendar dates.</p>
        <div class="example-links" style="margin-top:8px"><span class="muted">Try:</span><button data-ex="1969-07-20">Moon landing</button><button data-ex="1776-07-04">US independence</button><button data-ex="2000-02-29">Leap day 2000</button><button data-ex="2100-02-29">Feb 29, 2100 (invalid)</button><button data-ex="-0043-03-15">Ides of March, 44 BCE</button></div>
        <div id="exOut" class="result"></div>
      </div>`;
    const pick = M.$('#exPick', el), Y = M.$('#exY', el), Mo = M.$('#exM', el), Dd = M.$('#exD', el);
    pick.addEventListener('input', () => { const r = TE.parseISODate(pick.value); if (r.ok) { Y.value = r.date.y; Mo.value = r.date.m; Dd.value = r.date.d; compute(); } });
    [Y, Mo, Dd].forEach(i => i.addEventListener('input', () => { compute(); }));
    M.$('#exToday', el).addEventListener('click', () => setDate(M.today()));
    el.querySelector('.example-links').addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (!b) return; const m = /^(-?\d+)-(\d+)-(\d+)$/.exec(b.dataset.ex); Y.value = +m[1]; Mo.value = +m[2]; Dd.value = +m[3]; compute(); });
    function setDate(d) { Y.value = d.y; Mo.value = d.m; Dd.value = d.d; compute(); }
    function compute() {
      const out = M.$('#exOut', el);
      const y = Number(Y.value), m = Number(Mo.value), d = Number(Dd.value);
      const v = TE.validateDate(y, m, d);
      if (Y.value === '' || Dd.value === '') { out.innerHTML = errBox(['Enter a year and a day.']); return; }
      if (!v.ok) { out.innerHTML = errBox([v.error]); pick.value = ''; return; }
      const dt = { y, m, d };
      pick.value = M.dateInputValue(dt);
      const wd = TE.weekday(y, m, d), doy = TE.dayOfYear(y, m, d), today = M.today();
      const iso = TE.isoWeek(y, m, d);
      let next = { y: today.y, m, d };
      if (m === 2 && d === 29) { let yy = today.y; while (!TE.isLeapYear(yy) || TE.compareDates({ y: yy, m: 2, d: 29 }, today) < 0) yy++; next = { y: yy, m: 2, d: 29 }; }
      else if (TE.compareDates(next, today) < 0) next.y++;
      const untilNext = TE.daysBetween(today, next);
      const fromToday = TE.daysBetween(today, dt);
      const jdn = TE.daysFromCivil(y, m, d) + 2440588;
      const jul = TE.daysToJulian(TE.daysFromCivil(y, m, d));
      const text = `${TE.formatDateLong(dt)} — day ${doy} of ${TE.daysInYear(y)}, ISO week ${iso.year}-W${TE.pad(iso.week)}, Q${TE.quarter(m)}${TE.isLeapYear(y) ? ', leap year' : ''}`;
      out.innerHTML = `<div class="card flat">
        <div class="result-big">${TE.WEEKDAYS[wd]}</div>
        <div class="result-mid" style="font-weight:550">${esc(TE.formatDateLong(dt, false))}</div>
        <p class="small muted">${fromToday === 0 ? 'That’s today.' : `${fromToday > 0 ? 'In' : ''} ${TE.formatNumber(Math.abs(fromToday))} days ${fromToday > 0 ? 'from today' : 'ago'}`}${y < 1583 ? ' · Before 1583 this is a proleptic Gregorian date — historical sources usually used the Julian calendar.' : ''}</p>
        <div class="grid auto-sm" style="margin-top:12px">
          ${[['Weekday', TE.WEEKDAYS[wd], `ISO weekday ${TE.isoWeekday(y, m, d)}`], ['Day of month', TE.ordinal(d), `of ${TE.daysInMonth(y, m)}`], ['Month', TE.MONTHS[m - 1], `month ${m}`], ['Year', esc(TE.formatYear(y)), y <= 0 ? `astronomical year ${y}` : ''], ['Day of year', doy, `of ${TE.daysInYear(y)}`], ['ISO week', `${iso.week}`, `week-year ${iso.year}${iso.year !== y ? ' (differs from calendar year)' : ''}`], ['US week', TE.weekNumber(y, m, d, 'us').week, 'Sunday start'], ['Leap year?', TE.isLeapYear(y) ? 'Yes' : 'No', `${TE.daysInYear(y)} days`], ['Quarter', `Q${TE.quarter(m)}`, ['', 'Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'][TE.quarter(m)]], ['Days left in year', TE.daysRemainingInYear(y, m, d), `until Dec 31 (excluding this day)`], ['Next occurrence', untilNext === 0 ? 'Today' : M.plural(untilNext, 'day'), esc(TE.formatDateShort(next))], ['Julian Day Number', TE.formatNumber(jdn), 'at noon UT'], ['Julian calendar', esc(`${TE.MONTHS_SHORT[jul.m - 1]} ${jul.d}, ${TE.formatYear(jul.y)}`), 'same day, Julian reckoning']].map(([k, v, s]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${s}</div></div>`).join('')}
        </div>
        <div class="row tight" style="margin-top:12px">
          <button class="btn btn-sm" data-copy="${esc(text)}">${M.icon('copy')} Copy summary</button>
          <a class="btn btn-sm btn-ghost" href="${M.link('history', { m, d })}">${TE.MONTHS_SHORT[m - 1]} ${d} in history</a>
          ${y >= 1 && y <= 9999 ? `<a class="btn btn-sm btn-ghost" href="${M.link('calendar', { date: TE.isoDate(dt) })}">Show in calendar</a><a class="btn btn-sm btn-ghost" href="${M.link('convert', { date: TE.isoDate(dt), time: '12:00:00' })}">Convert a time on this date</a>` : ''}
        </div></div>`;
      M.addRecentDebounced('Weekday', `${TE.isoDate(dt)} was/is a ${TE.WEEKDAYS[wd]}`, M.link('explorer', { date: TE.isoDate(dt) }));
    }
    compute();
    return { params: (p) => { if (p.date) { const r = TE.parseISODate(p.date); if (r.ok) setDate(r.date); } } };
  }

  /* ---------- Leap years ---------- */
  function buildLeap(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="grid cols-2">
        <div class="card"><h2 style="margin-bottom:10px">Is it a leap year?</h2>
          <div class="row"><div class="field" style="flex:0 1 160px"><label for="lyY">Year</label><input class="input num-input" type="number" id="lyY" value="${t.y}" step="1"></div></div>
          <div id="lyOut" class="result"></div>
        </div>
        <div class="card"><h2 style="margin-bottom:10px">Leap years in a range</h2>
          <div class="row"><div class="field"><label for="lyA">From year</label><input class="input num-input" type="number" id="lyA" value="2000"></div><div class="field"><label for="lyB">To year</label><input class="input num-input" type="number" id="lyB" value="2100"></div></div>
          <div id="lyRange" class="result"></div>
          <hr class="sep">
          <h3 style="margin-bottom:8px">Is a date valid?</h3>
          <div class="row"><div class="field"><label for="lvY">Year</label><input class="input num-input" type="number" id="lvY" value="2100"></div><div class="field"><label for="lvM">Month</label><input class="input num-input" type="number" id="lvM" value="2" min="1" max="12"></div><div class="field"><label for="lvD">Day</label><input class="input num-input" type="number" id="lvD" value="29"></div></div>
          <div id="lvOut" class="result"></div>
        </div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:8px">Examples</h2><div class="leap-ex" id="lyEx"></div></div>
      <div class="card section-gap"><h2 style="margin-bottom:8px">Why leap years exist</h2>
        <p>A <b>tropical year</b> — one cycle of the seasons — lasts about <b>365.2422 days</b>. A calendar of exactly 365 days would drift by roughly a quarter of a day each year, about 24 days per century, so the solstices and equinoxes would wander through the months.</p>
        <p>The <b>Julian calendar</b> (45 BCE) added a leap day every 4 years, giving an average year of 365.25 days — about 11 minutes too long, which accumulated to ~10 days by the 1500s.</p>
        <p>The <b>Gregorian calendar</b> (1582) fixed this: <b>a year is a leap year if it is divisible by 4, except years divisible by 100, unless they are also divisible by 400.</b> That removes 3 leap days every 400 years, giving an average of 365.2425 days — within about 27 seconds of the tropical year.</p>
        <ul><li><b>Divisible by 4</b> → usually a leap year (2024).</li><li><b>Divisible by 100</b> → not a leap year (1900, 2100), because those extra days would over-correct.</li><li><b>Divisible by 400</b> → a leap year after all (2000, 2400), to fine-tune the average.</li></ul>
        <p class="small muted">In leap years February has 29 days and the year has 366 days. 97 of every 400 Gregorian years are leap years.</p>
      </div>`;
    ['lyY'].forEach(i => M.$('#' + i, el).addEventListener('input', one));
    ['lyA', 'lyB'].forEach(i => M.$('#' + i, el).addEventListener('input', range));
    ['lvY', 'lvM', 'lvD'].forEach(i => M.$('#' + i, el).addEventListener('input', valid));
    const intVal = (id) => { const v = M.$('#' + id, el).value; const n = Number(v); return v !== '' && Number.isInteger(n) ? n : null; };
    function explain(y) {
      const by4 = TE.mod(y, 4) === 0, by100 = TE.mod(y, 100) === 0, by400 = TE.mod(y, 400) === 0;
      const steps = [`Divisible by 4? <b>${by4 ? 'Yes' : 'No'}</b>`];
      if (by4) steps.push(`Divisible by 100? <b>${by100 ? 'Yes' : 'No'}</b>`);
      if (by4 && by100) steps.push(`Divisible by 400? <b>${by400 ? 'Yes' : 'No'}</b>`);
      return steps.join(' → ');
    }
    function one() {
      const y = intVal('lyY'), out = M.$('#lyOut', el);
      if (y == null || Math.abs(y) > 1e9) { out.innerHTML = errBox(['Enter a whole-number year.']); return; }
      const leap = TE.isLeapYear(y);
      let p = y - 1; while (!TE.isLeapYear(p)) p--;
      let n = y + 1; while (!TE.isLeapYear(n)) n++;
      out.innerHTML = `<div class="result-big ${leap ? 'ok-text' : ''}">${esc(TE.formatYear(y))} ${leap ? 'is' : 'is not'} a leap year</div>
        <p class="small">${explain(y)} → <b>${leap ? 'leap year' : 'common year'}</b></p>
        <dl class="kv"><dt>Days in February</dt><dd>${TE.daysInMonth(y, 2)}</dd><dt>Days in year</dt><dd>${TE.daysInYear(y)}</dd><dt>Previous leap year</dt><dd>${esc(TE.formatYear(p))}</dd><dt>Next leap year</dt><dd>${esc(TE.formatYear(n))}</dd><dt>January 1 falls on</dt><dd>${TE.WEEKDAYS[TE.weekday(y, 1, 1)]}</dd></dl>
        ${y < 1582 ? '<p class="tiny muted">Rule applied proleptically: the Gregorian calendar did not exist before 1582. Under the Julian calendar every year divisible by 4 was a leap year.</p>' : ''}`;
    }
    function range() {
      const a = intVal('lyA'), b = intVal('lyB'), out = M.$('#lyRange', el);
      if (a == null || b == null || Math.abs(a) > 1e9 || Math.abs(b) > 1e9) { out.innerHTML = errBox(['Enter two whole-number years.']); return; }
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const n = TE.countLeapYears(lo, hi);
      const list = [];
      if (hi - lo <= 400) for (let y = lo; y <= hi; y++) if (TE.isLeapYear(y)) list.push(y);
      out.innerHTML = `<div class="result-mid">${TE.formatNumber(n)} leap year${n === 1 ? '' : 's'}</div><p class="small muted">From ${esc(TE.formatYear(lo))} to ${esc(TE.formatYear(hi))}, <b>including both endpoint years</b> (${TE.formatNumber(hi - lo + 1)} years in total).</p>${list.length ? `<p class="small" style="overflow-wrap:anywhere">${list.join(', ')}</p>` : ''}`;
    }
    function valid() {
      const y = intVal('lvY'), m = intVal('lvM'), d = intVal('lvD'), out = M.$('#lvOut', el);
      if (y == null || m == null || d == null) { out.innerHTML = errBox(['Enter whole numbers.']); return; }
      const v = TE.validateDate(y, m, d);
      out.innerHTML = v.ok ? `<div class="note success">✓ ${esc(TE.formatDateLong({ y, m, d }))} is a valid date.</div>` : `<div class="note error">✗ ${esc(v.error)}</div>`;
    }
    M.$('#lyEx', el).innerHTML = [1600, 1700, 1900, 2000, 2023, 2024, 2100, 2400].map(y => `<div class="stat"><div class="k">${y}</div><div class="v ${TE.isLeapYear(y) ? 'ok-text' : ''}">${TE.isLeapYear(y) ? 'Leap year' : 'Common year'}</div><div class="d">${explain(y).replace(/<\/?b>/g, '')}</div></div>`).join('');
    one(); range(); valid();
    return {};
  }

  /* ---------- Week numbers ---------- */
  function buildWeek(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="grid cols-2">
        <div class="card"><h2 style="margin-bottom:10px">Week number of a date</h2>
          <div class="row"><div class="field" style="flex:0 1 200px"><label for="wkD">Date</label><input class="input" type="date" id="wkD" value="${M.dateInputValue(t)}"></div></div>
          <div id="wkOut" class="result"></div>
        </div>
        <div class="card"><h2 style="margin-bottom:10px">Date from ISO week</h2>
          <div class="row"><div class="field"><label for="wiY">ISO week-year</label><input class="input num-input" type="number" id="wiY" value="${t.y}"></div><div class="field"><label for="wiW">Week</label><input class="input num-input" type="number" id="wiW" value="1" min="1" max="53"></div><div class="field"><label for="wiD">Weekday</label><select class="select" id="wiD">${[1, 2, 3, 4, 5, 6, 7].map(i => `<option value="${i}">${i} – ${TE.WEEKDAYS[i % 7]}</option>`).join('')}</select></div></div>
          <div id="wiOut" class="result"></div>
        </div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:6px">Why week numbers differ</h2>
        <p class="small">There is no single universal week-numbering system. <b>ISO 8601</b> (used across Europe and much of Asia) starts weeks on Monday and defines week 1 as the week containing the year’s first Thursday — so January 1–3 can belong to week 52/53 of the previous year, and December 29–31 to week 1 of the next. In the <b>US convention</b> weeks start on Sunday and week 1 is the week containing January 1, so the first and last weeks can be partial. Some Middle-Eastern locales start weeks on Saturday. Spreadsheet functions (e.g. WEEKNUM vs ISOWEEKNUM) follow different rules too. Always state which convention you use.</p>
      </div>`;
    M.$('#wkD', el).addEventListener('input', wk);
    ['wiY', 'wiW', 'wiD'].forEach(i => M.$('#' + i, el).addEventListener('input', wi));
    function wk() {
      const r = M.readDate(M.$('#wkD', el)), out = M.$('#wkOut', el);
      if (!r.ok) { out.innerHTML = errBox([r.error]); return; }
      const { y, m, d } = r.date, iso = TE.isoWeek(y, m, d);
      const mon = TE.addDays(r.date, -(TE.isoWeekday(y, m, d) - 1)), sun = TE.addDays(mon, 6);
      const isoStr = `${iso.year}-W${TE.pad(iso.week)}-${TE.isoWeekday(y, m, d)}`;
      out.innerHTML = `<div class="result-big">Week ${iso.week}</div><p class="small">ISO 8601: <span class="mono">${isoStr}</span> <button class="icon-btn sm" data-copy="${isoStr}" aria-label="Copy ISO week date">${M.icon('copy')}</button> · Monday ${esc(TE.formatDateShort(mon))} – Sunday ${esc(TE.formatDateShort(sun))}</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Convention</th><th class="num">Week</th><th>Notes</th></tr></thead><tbody>
          ${Object.entries(TE.WEEK_CONVENTIONS).map(([k, v]) => { const w = TE.weekNumber(y, m, d, k); return `<tr><td>${esc(v.split(' (')[0])}</td><td class="num"><b>${w.week}</b>${w.year !== y ? ` <span class="tiny muted">(${w.year})</span>` : ''}</td><td class="small muted">${esc((v.match(/\((.*)\)/) || [])[1] || '')}</td></tr>`; }).join('')}
        </tbody></table></div><p class="tiny muted">${y} has ${TE.isoWeeksInYear(y)} ISO weeks.</p>`;
    }
    function wi() {
      const y = Number(M.$('#wiY', el).value), w = Number(M.$('#wiW', el).value), d = +M.$('#wiD', el).value, out = M.$('#wiOut', el);
      const r = TE.parseISO8601(`${y >= 0 && y <= 9999 ? TE.pad(y, 4) : TE.isoYear(y)}-W${TE.pad(w)}-${d}`);
      out.innerHTML = !Number.isInteger(y) || !Number.isInteger(w) ? errBox(['Enter whole numbers.']) : r.ok ? `<div class="result-mid">${esc(TE.formatDateLong(r.wall))}</div>` : errBox([r.error]);
    }
    wk(); wi();
    return {};
  }

  /* ---------- Historical dates ---------- */
  function buildHistoric(el) {
    el.innerHTML = `
      <div class="grid cols-2">
        <div class="card"><h2 style="margin-bottom:10px">Julian ↔ Gregorian</h2>
          <div class="row"><div class="field" style="flex:0 1 150px"><label for="hcCal">Input calendar</label><select class="select" id="hcCal"><option value="julian">Julian</option><option value="gregorian">Gregorian</option></select></div>
            <div class="field"><label for="hcY">Year</label><input class="input num-input" type="number" id="hcY" value="1752"></div><div class="field"><label for="hcM">Month</label><input class="input num-input" type="number" id="hcM" value="9" min="1" max="12"></div><div class="field"><label for="hcD">Day</label><input class="input num-input" type="number" id="hcD" value="2"></div></div>
          <div class="example-links" style="margin-top:8px"><span class="muted">e.g.</span><button data-hc="julian,1582,10,4">Last Julian day in Rome (1582)</button><button data-hc="julian,1752,9,2">Britain switches (1752)</button><button data-hc="julian,1917,10,25">October Revolution</button><button data-hc="julian,1642,12,25">Newton’s birth</button></div>
          <div id="hcOut" class="result"></div>
        </div>
        <div class="card"><h2 style="margin-bottom:10px">Historical UTC offset at a location</h2>
          <div class="row"><div class="field" style="flex:0 1 190px"><label for="hoD">Date</label><input class="input" type="date" id="hoD" value="1900-01-01"></div><div id="hoT" style="flex:1 1 230px"></div></div>
          <div id="hoZ" style="margin-top:8px"></div>
          <div id="hoOut" class="result"></div>
        </div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:6px">Calendar-system limitations</h2>
        <p class="small">All other tools in Meridian use the <b>proleptic Gregorian calendar</b> — the Gregorian rules extended backwards indefinitely. Real historical documents, however, used the calendar in force locally. The Gregorian calendar was introduced in October 1582 (Thursday 4 October, Julian, was followed by Friday 15 October, Gregorian) in Catholic countries; Britain and its colonies switched in 1752 (2 September followed by 14 September); Japan adopted it in 1873, Russia in 1918, Greece in 1923, among others. The year number did not always change on January 1 either (England used March 25 until 1752). Weekdays are unaffected by the switch — only the day numbering jumped.</p>
        <p class="small">Time zones are even newer: standardized zones date from the 1880s (railway time); before that, places kept <b>local mean time</b> (LMT) based on longitude. The IANA database records LMT and historical changes for each location, but data before 1970 is less complete and some old offsets are reconstructions. Results for very old timestamps should be treated as best estimates.</p>
      </div>`;
    const ids = ['hcCal', 'hcY', 'hcM', 'hcD'];
    ids.forEach(i => M.$('#' + i, el).addEventListener('input', conv));
    el.querySelector('.example-links').addEventListener('click', (e) => { const b = e.target.closest('[data-hc]'); if (!b) return; const [c, y, m, d] = b.dataset.hc.split(','); M.$('#hcCal', el).value = c; M.$('#hcY', el).value = y; M.$('#hcM', el).value = m; M.$('#hcD', el).value = d; conv(); });
    function conv() {
      const out = M.$('#hcOut', el);
      const cal = M.$('#hcCal', el).value, y = Number(M.$('#hcY', el).value), m = Number(M.$('#hcM', el).value), d = Number(M.$('#hcD', el).value);
      if (![y, m, d].every(Number.isInteger)) { out.innerHTML = errBox(['Enter whole numbers.']); return; }
      if (m < 1 || m > 12) { out.innerHTML = errBox(['Month must be 1–12.']); return; }
      let days;
      if (cal === 'julian') {
        const jl = TE.mod(y, 4) === 0 ? 29 : 28; // Julian rule: every 4th year
        const dim = [31, jl, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
        if (d < 1 || d > dim) { out.innerHTML = errBox([`In the Julian calendar ${TE.MONTHS[m - 1]} ${TE.formatYear(y)} has ${dim} days.`]); return; }
        days = TE.julianToDays(y, m, d);
      } else {
        const v = TE.validateDate(y, m, d); if (!v.ok) { out.innerHTML = errBox([v.error]); return; }
        days = TE.daysFromCivil(y, m, d);
      }
      const g = TE.civilFromDays(days), j = TE.daysToJulian(days);
      const wd = TE.WEEKDAYS[TE.mod(days + 4, 7)];
      const diff = days - TE.daysFromCivil(j.y, j.m, j.d); // how far Gregorian day numbers run ahead
      out.innerHTML = `<div class="grid cols-2"><div class="stat"><div class="k">Julian calendar</div><div class="v">${esc(`${TE.MONTHS[j.m - 1]} ${j.d}, ${TE.formatYear(j.y)}`)}</div></div><div class="stat"><div class="k">Gregorian calendar</div><div class="v">${esc(`${TE.MONTHS[g.m - 1]} ${g.d}, ${TE.formatYear(g.y)}`)}</div></div></div>
        <p class="small" style="margin-top:10px">Weekday: <b>${wd}</b> (the same in both calendars). Julian Day Number ${TE.formatNumber(days + 2440588)}. On this date the Gregorian calendar is <b>${diff} day${Math.abs(diff) === 1 ? '' : 's'}</b> ${diff >= 0 ? 'ahead of' : 'behind'} the Julian.</p>`;
    }
    const tf = M.timeField(M.$('#hoT', el), { label: 'Local time', value: { h: 12, mi: 0, s: 0 }, onChange: off });
    const zp = M.zonePicker(M.$('#hoZ', el), { label: 'Location', value: M.ianaRef('America/Los_Angeles'), includeFixed: false, onChange: off });
    M.$('#hoD', el).addEventListener('input', off);
    function off() {
      const out = M.$('#hoOut', el);
      const d = M.readDate(M.$('#hoD', el)), t = tf.get(), z = zp.get();
      if (!d.ok || !t || !z) { out.innerHTML = errBox([d.error || 'Check the inputs.']); return; }
      let r;
      try { r = TE.resolveLocal(z, { ...d.date, ...t, ms: 0 }); } catch (e) { out.innerHTML = errBox([e.message]); return; }
      const cands = r.status === 'gap' ? [{ epochMs: r.shiftedEpochMs, offsetSec: r.offsetAfter }] : r.candidates;
      const c = cands[0];
      const nm = TE.zoneName(z, c.epochMs, 'long');
      const nowOff = TE.offsetAt(z, Date.now());
      out.innerHTML = `${r.status === 'gap' ? '<div class="note warn small">That local time was skipped by a clock change; showing the shifted time.</div>' : r.status === 'ambiguous' ? `<div class="note warn small">That local time occurred twice (${r.candidates.map(x => TE.formatOffset(x.offsetSec)).join(' and ')}); the first is shown.</div>` : ''}
        <div class="result-mid">${esc(TE.formatOffset(c.offsetSec))}</div>
        <dl class="kv"><dt>Zone</dt><dd>${esc(z.id)}</dd><dt>Name then</dt><dd>${esc(nm || '—')}</dd><dt>UTC instant</dt><dd class="mono">${esc(new Date(c.epochMs).toISOString())}</dd><dt>Offset today</dt><dd>${esc(TE.formatOffset(nowOff))}${nowOff !== c.offsetSec ? ' <span class="badge amber">different</span>' : ''}</dd></dl>
        ${c.offsetSec % 60 !== 0 ? '<p class="tiny muted">An offset with seconds indicates local mean time (LMT) — the location had not yet adopted standard time.</p>' : ''}`;
    }
    conv(); off();
    return {};
  }

  const B = { date: buildDate, leap: buildLeap, week: buildWeek, historic: buildHistoric };
  function show(params) { const { tab: t, ...rest } = params; setTab(t || (params.date ? 'date' : tab), rest); }
  M.register('explorer', { init, show });
})();
