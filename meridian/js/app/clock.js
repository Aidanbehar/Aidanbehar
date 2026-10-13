/* Meridian — World clock & meeting planner */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  const DEFAULTS = ['city:c0:America/Los_Angeles', 'city:c1:America/New_York', 'city:c2:Europe/London', 'city:c3:Europe/Berlin', 'city:c4:Asia/Tokyo', 'city:c5:Australia/Sydney'];
  let clocks = load();
  let root, sortMode = M.store.get('clockSort', 'custom'), tab = 'clocks', plannerDate = null, selCol = null, lastRenderKey = '';

  function load() {
    const raw = M.store.get('clocks', null);
    const list = (raw || DEFAULTS.map(r => ({ ref: r }))).map(c => ({ ...c, wh: c.wh || ['09:00', '17:00'], r: M.parseRef(c.ref) })).filter(c => c.r);
    return list;
  }
  function save() { M.store.set('clocks', clocks.map(({ ref, pinned, wh }) => ({ ref, pinned, wh }))); }
  M.clockApi = { list: () => clocks.map(c => c.r) };

  function addRef(r) {
    const key = M.serializeRef(r);
    if (clocks.some(c => c.ref === key)) { M.toast(`${M.refShort(r)} is already in your list`); return; }
    clocks.push({ ref: key, r, wh: ['09:00', '17:00'], pinned: false });
    save(); render(); M.toast(`Added ${M.refShort(r)}`);
  }

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('clock', 'World Clock', 'Live local times for the places you care about. Add as many locations as you like, pin favorites, and use the meeting planner to find overlapping working hours.')}
      <div class="card">
        <div class="row" style="align-items:flex-end">
          <div id="clockAdd" style="flex:2 1 280px"></div>
          <div class="field" style="flex:0 0 auto"><span class="label">Sort</span>
            <div class="seg" role="group" aria-label="Sort clocks">
              <button data-sort="custom">Pinned first</button><button data-sort="alpha">A–Z</button><button data-sort="time">By time</button>
            </div>
          </div>
          <button class="btn" id="clockAddLocal" style="flex:0 0 auto">${M.icon('plus')} Add my zone</button>
        </div>
      </div>
      <div class="tabs section-gap" role="tablist">
        <button role="tab" data-tab="clocks" aria-selected="true">Clocks</button>
        <button role="tab" data-tab="planner" aria-selected="false">Meeting planner</button>
        <button role="tab" data-tab="table" aria-selected="false">Table view</button>
      </div>
      <div id="clockPane"></div>
      <div class="planner-legend" id="dpLegend"><span><span class="daypart dp-morning"></span> Morning 5–12</span><span><span class="daypart dp-afternoon"></span> Afternoon 12–17</span><span><span class="daypart dp-evening"></span> Evening 17–21</span><span><span class="daypart dp-night"></span> Night 21–5</span></div>`;
    M.zonePicker(M.$('#clockAdd', el), { label: 'Add a city or time zone', placeholder: 'Search city, country, IANA zone…', noMeta: true, onChange: (r) => { addRef(r); setTimeout(() => { const i = M.$('#clockAdd input', el); i.value = ''; }, 0); } });
    M.$('#clockAddLocal', el).addEventListener('click', () => addRef(M.ianaRef(M.localZoneId)));
    el.querySelector('.seg').addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (!b) return; sortMode = b.dataset.sort; M.store.set('clockSort', sortMode); render(); });
    el.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; render(); });
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
    M.onSettings(() => { lastRenderKey = ''; if (!root.hidden) render(); });
  }
  function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const i = +t.dataset.i;
    const act = t.dataset.act;
    if (act === 'remove') { const c = clocks[i]; clocks.splice(i, 1); save(); render(); M.toast(`Removed ${M.refShort(c.r)}`); }
    else if (act === 'pin') { clocks[i].pinned = !clocks[i].pinned; save(); render(); }
    else if (act === 'up' && i > 0) { [clocks[i - 1], clocks[i]] = [clocks[i], clocks[i - 1]]; save(); render(); }
    else if (act === 'map') M.go('map', { zone: clocks[i].ref });
    else if (act === 'col') { selCol = +t.dataset.col; renderPlanner(); }
    else if (act === 'pdate') { plannerDate = TE.addDays(plannerDate, +t.dataset.n); renderPlanner(); }
    else if (act === 'reset') { if (confirm('Reset the world clock to the default cities?')) { clocks = DEFAULTS.map(r => ({ ref: r, r: M.parseRef(r), wh: ['09:00', '17:00'] })); save(); render(); } }
  }
  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-wh]')) {
      const i = +t.dataset.i, k = +t.dataset.wh;
      if (/^\d{2}:\d{2}/.test(t.value)) { clocks[i].wh[k] = t.value.slice(0, 5); save(); renderPlanner(); }
    } else if (t.id === 'plannerDate') {
      const r = M.readDate(t); if (r.ok) { plannerDate = r.date; renderPlanner(); }
    }
  }

  function sorted(now) {
    const arr = clocks.map((c, i) => ({ c, i }));
    if (sortMode === 'alpha') arr.sort((a, b) => M.refShort(a.c.r).localeCompare(M.refShort(b.c.r)));
    else if (sortMode === 'time') arr.sort((a, b) => TE.offsetAt(a.c.r, now) - TE.offsetAt(b.c.r, now));
    else arr.sort((a, b) => (b.c.pinned ? 1 : 0) - (a.c.pinned ? 1 : 0));
    return arr;
  }

  function render() {
    M.$$('.seg [data-sort]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sort === sortMode)));
    M.$$('.tabs [data-tab]', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    lastRenderKey = '';
    if (tab === 'planner') renderPlanner(); else renderClocks(Date.now(), true);
  }

  function relDay(w, lt) {
    const c = TE.compareDates(w, lt);
    return c === 0 ? '' : c > 0 ? `<span class="badge primary">Tomorrow${c > 1 ? ` +${c}` : ''}</span>` : `<span class="badge amber">Yesterday</span>`;
  }

  function renderClocks(now, force) {
    const pane = M.$('#clockPane', root);
    const lz = M.localZone();
    const lw = TE.toZoned(lz, now), loff = lw.offsetSec;
    if (!clocks.length) { pane.innerHTML = `<div class="card empty">${M.icon('clock')}<div>No locations yet. Search for a city above to add one.</div><button class="btn btn-sm" data-act="reset" style="margin-top:10px">Restore defaults</button></div>`; return; }
    const arr = sorted(now);
    if (tab === 'table') {
      pane.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Location</th><th>Local time</th><th>Date</th><th>UTC offset</th><th>vs. you</th><th>DST</th><th></th></tr></thead><tbody>${arr.map(({ c, i }) => {
        const w = TE.toZoned(c.r, now), ds = TE.dstInfo(c.r, now);
        return `<tr><td><span class="daypart dp-${M.dayPart(w.h)}"></span> <b>${esc(M.refShort(c.r))}</b> <span class="muted small">${esc(c.r.kind === 'iana' ? c.r.id : '')}</span></td><td class="num">${esc(M.fmtTime(w, { seconds: true }))}</td><td>${esc(M.fmtDateW(w))} ${relDay(w, lw)}</td><td class="num">${esc(TE.formatOffset(w.offsetSec))}</td><td class="num">${esc(TE.formatDiffHours(w.offsetSec - loff))}</td><td>${ds.observesDst ? (ds.isDst ? 'Yes' : 'No') : '—'}</td><td class="right"><button class="icon-btn sm" data-act="remove" data-i="${i}" aria-label="Remove ${esc(M.refShort(c.r))}">${M.icon('x')}</button></td></tr>`;
      }).join('')}</tbody></table></div><p class="small muted">“vs. you” is the current offset difference from your zone (${esc(M.localZoneId)}, ${esc(TE.formatOffset(loff))}). It can change when either location switches to or from daylight saving time.</p>`;
      return;
    }
    const key = arr.map(a => a.i).join(',') + clocks.map(c => c.pinned).join('');
    if (force || key !== lastRenderKey || !pane.querySelector('.clock-list')) {
      lastRenderKey = key;
      pane.innerHTML = `<div class="clock-list">${arr.map(({ c, i }) => `
        <div class="clock-card" data-ci="${i}">
          <div class="tools">
            <button class="icon-btn sm ${c.pinned ? 'pinned' : ''}" data-act="pin" data-i="${i}" aria-pressed="${!!c.pinned}" aria-label="${c.pinned ? 'Unpin' : 'Pin'} ${esc(M.refShort(c.r))}" title="${c.pinned ? 'Unpin' : 'Pin to top'}">${M.icon('star')}</button>
            <button class="icon-btn sm" data-act="map" data-i="${i}" aria-label="Show ${esc(M.refShort(c.r))} on map" title="Show on map">${M.icon('globe')}</button>
            <button class="icon-btn sm" data-act="remove" data-i="${i}" aria-label="Remove ${esc(M.refShort(c.r))}" title="Remove">${M.icon('x')}</button>
          </div>
          <div class="city"><span>${esc(M.refShort(c.r))}</span>${c.r.isLocal || (c.r.kind === 'iana' && c.r.id === M.localZoneId) ? '<span class="badge accent">You</span>' : ''}</div>
          <div class="country">${esc(c.r.kind === 'iana' ? [c.r.country, c.r.id].filter(Boolean).join(' · ') : M.refDetail(c.r))}</div>
          <div class="time" data-f="time"></div>
          <div class="date" data-f="date"></div>
          <div class="meta" data-f="meta"></div>
        </div>`).join('')}</div>`;
    }
    for (const { c, i } of arr) {
      const card = pane.querySelector(`[data-ci="${i}"]`); if (!card) continue;
      const w = TE.toZoned(c.r, now), ds = TE.dstInfo(c.r, now);
      const dp = M.dayPart(w.h);
      card.style.setProperty('--dp', `var(--${dp})`);
      card.querySelector('[data-f="time"]').textContent = M.fmtTime(w, { seconds: M.settings.showSeconds });
      card.querySelector('[data-f="date"]').innerHTML = `${esc(M.fmtDateW(w))} ${relDay(w, lw)}`;
      const abbr = TE.zoneAbbrev(c.r, now);
      const metaKey = `${w.offsetSec}|${ds.isDst}|${dp}|${loff}`;
      const metaEl = card.querySelector('[data-f="meta"]');
      if (metaEl.dataset.k !== metaKey) {
        metaEl.dataset.k = metaKey;
        metaEl.innerHTML = `<span class="badge">${esc(TE.formatOffset(w.offsetSec))}${abbr && !/^UTC/.test(abbr) ? ' · ' + esc(abbr) : ''}</span><span class="badge ${w.offsetSec === loff ? 'success' : ''}">${w.offsetSec === loff ? 'Same as you' : esc(TE.formatDiffHours(w.offsetSec - loff)) + ' vs you'}</span>${ds.observesDst ? `<span class="badge ${ds.isDst ? 'amber' : ''}">${ds.isDst ? 'DST' : 'Standard'}</span>` : ''}<span class="badge"><span class="daypart dp-${dp}"></span> ${M.dayPartLabel[dp]}</span>`;
      }
    }
  }

  /* ---------- Meeting planner ---------- */
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  /** Is the local interval [s, e) (minutes after midnight) inside the working range? Overnight ranges (22:00–06:00) supported. */
  function inWork(s, e, wh) {
    const ws = toMin(wh[0]), we = toMin(wh[1]);
    if (ws === we) return false;
    if (ws < we) return s >= ws && e <= we;
    return (s >= ws && e <= 1440 + we) || e <= we;
  }
  function renderPlanner() {
    const pane = M.$('#clockPane', root);
    const lz = M.localZone();
    if (!plannerDate) plannerDate = M.today(lz);
    if (!clocks.length) { pane.innerHTML = `<div class="card empty">Add locations to plan a meeting.</div>`; return; }
    // Base: your local calendar day, hour by hour (instants), so DST and half-hour zones are exact.
    const r = TE.resolveLocal(lz, { ...plannerDate, h: 0, mi: 0, s: 0 });
    const start = r.status === 'gap' ? r.shiftedEpochMs : r.candidates[0].epochMs;
    const cols = Array.from({ length: 24 }, (_, i) => start + i * 3600000);
    const rows = clocks.map((c, i) => ({ c, i }));
    const overlap = cols.map(t => rows.every(({ c }) => { const w = TE.toZoned(c.r, t); const s = w.h * 60 + w.mi; return inWork(s, s + 60, c.wh); }));
    const baseLabel = (t) => { const w = TE.toZoned(lz, t); return M.settings.hour12 ? `${w.h % 12 || 12}${w.h < 12 ? 'a' : 'p'}` : TE.pad(w.h); };
    let html = `<div class="card">
      <div class="row" style="align-items:flex-end;margin-bottom:12px">
        <div class="field" style="flex:0 0 190px"><label for="plannerDate">Your date (${esc(M.localZoneId)})</label><input class="input" type="date" id="plannerDate" value="${M.dateInputValue(plannerDate)}"></div>
        <button class="btn btn-sm" data-act="pdate" data-n="-1">${M.icon('chevL')} Previous day</button>
        <button class="btn btn-sm" data-act="pdate" data-n="1">Next day ${M.icon('chevR')}</button>
        <div class="spacer"></div>
        <div class="small muted" style="max-width:360px">Edit each location’s working hours (its own local time; overnight shifts like 22:00–06:00 are allowed). Green-outlined columns are hours when everyone is working.</div>
      </div>
      <div class="planner"><div class="planner-grid">
        <div class="planner-row planner-head"><div class="lbl"><b>Your time →</b></div>${cols.map((t, j) => `<div class="planner-cell">${baseLabel(t)}</div>`).join('')}</div>`;
    for (const { c, i } of rows) {
      html += `<div class="planner-row"><div class="lbl"><b title="${esc(M.refTitle(c.r))}">${esc(M.refShort(c.r))}</b><span class="tiny muted">${esc(TE.formatOffset(TE.offsetAt(c.r, cols[12])))}</span>
        <span class="wh"><input class="input" type="time" step="900" aria-label="${esc(M.refShort(c.r))} work start" data-wh="0" data-i="${i}" value="${c.wh[0]}">–<input class="input" type="time" step="900" aria-label="${esc(M.refShort(c.r))} work end" data-wh="1" data-i="${i}" value="${c.wh[1]}"></span></div>`;
      let prevDay = null;
      cols.forEach((t, j) => {
        const w = TE.toZoned(c.r, t);
        const s = w.h * 60 + w.mi;
        const cls = inWork(s, s + 60, c.wh) ? 'work' : (w.h >= 7 && w.h < 22) ? 'edge' : 'night';
        const dayKey = TE.isoDate(w);
        const newDay = prevDay !== null && dayKey !== prevDay || (j === 0 && TE.compareDates(w, plannerDate) !== 0);
        prevDay = dayKey;
        const lbl = M.settings.hour12 ? `${w.h % 12 || 12}${w.mi ? ':' + TE.pad(w.mi) : ''}${w.h < 12 ? 'a' : 'p'}` : `${w.h}${w.mi ? ':' + TE.pad(w.mi) : ''}`;
        html += `<div class="planner-cell ${cls} ${w.mi ? 'half' : ''} ${overlap[j] ? 'overlap-col' : ''} ${selCol === j ? 'sel-col' : ''} ${newDay ? 'newday' : ''}" data-day="${TE.MONTHS_SHORT[w.m - 1]} ${w.d}" data-act="col" data-col="${j}" title="${esc(M.refShort(c.r))}: ${esc(M.fmtDateTime(w))}">${lbl}</div>`;
      });
      html += `</div>`;
    }
    html += `</div></div>
      <div class="planner-legend"><span><i style="background:color-mix(in srgb,var(--accent) 30%,var(--surface))"></i>Working hours</span><span><i style="background:color-mix(in srgb,var(--morning) 22%,var(--surface))"></i>Awake, outside work (7:00–22:00)</span><span><i style="background:color-mix(in srgb,var(--night) 22%,var(--surface))"></i>Night</span><span><i style="box-shadow:inset 0 0 0 2px var(--success)"></i>Everyone working</span><span>Small labels mark a change of local date.</span></div>`;
    // summary
    const runs = []; let s0 = null;
    overlap.forEach((o, j) => { if (o && s0 === null) s0 = j; if ((!o || j === 23) && s0 !== null) { runs.push([s0, o && j === 23 ? 24 : j]); s0 = null; } });
    if (runs.length) {
      html += `<div class="note success" style="margin-top:12px"><strong>Overlapping working hours:</strong> ${runs.map(([a, b]) => {
        const ta = cols[a], tb = start + b * 3600000;
        return `${esc(M.fmtTime(TE.toZoned(lz, ta)))}–${esc(M.fmtTime(TE.toZoned(lz, tb)))} your time (${rows.map(({ c }) => `${esc(M.refShort(c.r))} ${esc(M.fmtTime(TE.toZoned(c.r, ta)))}`).join(', ')})`;
      }).join('; ')}</div>`;
    } else html += `<div class="note warn" style="margin-top:12px">No hour on this day falls within everyone’s working hours. Try adjusting the ranges or picking a different day.</div>`;
    if (selCol != null) {
      const t = cols[selCol];
      html += `<div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Location</th><th>Local date & time</th><th>Offset</th><th>Status</th></tr></thead><tbody>${rows.map(({ c }) => { const w = TE.toZoned(c.r, t); const s = w.h * 60 + w.mi; return `<tr><td>${esc(M.refShort(c.r))}</td><td>${esc(M.fmtDateTime(w))}</td><td class="num">${esc(TE.formatOffset(w.offsetSec))}</td><td>${inWork(s, s + 60, c.wh) ? '<span class="badge success">Working</span>' : `<span class="badge">${M.dayPartLabel[M.dayPart(w.h)]}</span>`}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="copy-line" style="margin-top:8px"><span id="meetCopy">${esc(rows.map(({ c }) => `${M.refShort(c.r)}: ${M.fmtDateTime(TE.toZoned(c.r, t))}`).join(' | '))}</span><button class="btn btn-sm" data-copy-from="#meetCopy">${M.icon('copy')} Copy</button></div>`;
    }
    html += `</div>`;
    pane.innerHTML = html;
  }

  function show(params) {
    if (params.add) { const r = M.parseRef(params.add); if (r) addRef(r); history.replaceState(null, '', '#/clock'); }
    if (params.tab) tab = params.tab;
    render();
  }
  function tick(now) { if (tab !== 'planner') renderClocks(now, false); }
  M.register('clock', { init: (el) => { init(el); M.bindCopy(el); }, show, tick });
})();
