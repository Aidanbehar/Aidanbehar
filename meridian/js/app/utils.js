/* Meridian — Utilities: Unix timestamps, ISO 8601, date formats, countdowns, recurring dates, abbreviations */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  let root, tab = 'unix';
  const panes = {};
  const errBox = (errs) => `<div class="note error">${errs.map(esc).join('<br>')}</div>`;

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('utils', 'Date & Time Utilities', 'Converters and helpers for developers and everyday use.')}
      <div class="tabs" role="tablist" id="utTabs">
        <button role="tab" data-tab="unix">Unix timestamp</button><button role="tab" data-tab="iso">ISO 8601</button><button role="tab" data-tab="format">Date formats</button>
        <button role="tab" data-tab="countdown">Countdowns</button><button role="tab" data-tab="recurring">Recurring dates</button><button role="tab" data-tab="abbr">Zone abbreviations</button>
      </div><div id="utPane"></div>`;
    M.$('#utTabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    M.bindCopy(el);
  }
  function setTab(t, params = {}) {
    if (!B[t]) t = 'unix';
    tab = t;
    M.$$('#utTabs [data-tab]', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    Object.values(panes).forEach(p => { p.el.hidden = true; });
    if (!panes[t]) { const el = document.createElement('div'); M.$('#utPane', root).appendChild(el); panes[t] = { el, api: B[t](el) }; }
    panes[t].el.hidden = false;
    if (panes[t].api.params) panes[t].api.params(params);
    history.replaceState(null, '', M.link('utils', { tab: t }));
  }
  const instantTable = (ms, extraZone) => {
    const zones = [M.localZone(), M.utcZone(), ...(extraZone ? [extraZone] : [])];
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Zone</th><th>Date & time</th><th>ISO 8601</th></tr></thead><tbody>${zones.map(z => { const w = TE.toZoned(z, ms); const iso = M.isoInstant(ms, z, !!w.ms); return `<tr><td>${esc(M.refShort(z))}${z.isLocal ? ' <span class="badge accent">You</span>' : ''}</td><td>${esc(M.fmtDateTime(w, { seconds: true }))}${w.ms ? '.' + TE.pad(w.ms, 3) : ''} <span class="tiny muted">${esc(TE.formatOffset(w.offsetSec))}</span></td><td class="mono small">${esc(iso)} <button class="icon-btn sm" data-copy="${esc(iso)}" aria-label="Copy">${M.icon('copy')}</button></td></tr>`; }).join('')}</tbody></table></div>`;
  };

  /* ---------- Unix ---------- */
  function buildUnix(el) {
    el.innerHTML = `
      <div class="card"><div class="card-head"><h2>Current Unix time</h2><span class="sub">seconds since 1970-01-01T00:00:00Z</span></div>
        <div class="row" style="align-items:center"><div class="result-big mono" id="uxNow"></div><button class="btn btn-sm" id="uxNowCopy">${M.icon('copy')} Copy</button><button class="btn btn-sm" id="uxUse">Use</button></div></div>
      <div class="grid cols-2 section-gap">
        <div class="card"><h2 style="margin-bottom:10px">Timestamp → date</h2>
          <div class="row"><div class="field" style="flex:2 1 220px"><label for="uxIn">Unix timestamp</label><input class="input mono" id="uxIn" value="1312518600" inputmode="numeric" autocomplete="off"></div>
          <div class="field" style="flex:0 1 160px"><label for="uxUnit">Unit</label><select class="select" id="uxUnit"><option value="auto">Auto-detect</option><option value="s">Seconds</option><option value="ms">Milliseconds</option><option value="us">Microseconds</option><option value="ns">Nanoseconds</option></select></div></div>
          <div id="uxZ" style="margin-top:8px"></div>
          <div id="uxOut" class="result"></div>
        </div>
        <div class="card"><h2 style="margin-bottom:10px">Date → timestamp</h2>
          <div class="row"><div class="field" style="flex:0 1 190px"><label for="uxD">Date</label><input class="input" type="date" id="uxD" value="2011-08-04"></div><div id="uxT" style="flex:1 1 230px"></div></div>
          <div id="uxZ2" style="margin-top:8px"></div>
          <div id="uxOut2" class="result"></div>
        </div>
      </div>
      <p class="small muted">Auto-detection: values with magnitude ≥ 10¹¹ are read as milliseconds, ≥ 10¹⁴ as microseconds and ≥ 10¹⁷ as nanoseconds (so dates between 1973 and 5138 are recognised in seconds). Choose a unit explicitly if your value is ambiguous. Unix time ignores leap seconds.</p>`;
    const zp = M.zonePicker(M.$('#uxZ', el), { label: 'Also show in', value: M.ianaRef('America/Los_Angeles'), noMeta: true, onChange: fwd });
    const tf = M.timeField(M.$('#uxT', el), { label: 'Time', value: { h: 21, mi: 30, s: 0 }, onChange: back });
    const zp2 = M.zonePicker(M.$('#uxZ2', el), { label: 'Time zone of the date', value: M.ianaRef('America/Los_Angeles'), onChange: back });
    ['uxIn', 'uxUnit'].forEach(i => M.$('#' + i, el).addEventListener('input', fwd));
    M.$('#uxD', el).addEventListener('input', back);
    M.$('#uxNowCopy', el).addEventListener('click', () => M.copy(String(Math.floor(Date.now() / 1000))));
    M.$('#uxUse', el).addEventListener('click', () => { M.$('#uxIn', el).value = Math.floor(Date.now() / 1000); M.$('#uxUnit', el).value = 'auto'; fwd(); });
    const state = { choice: null, gap: false };
    el.addEventListener('change', (e) => { if (e.target.name === 'uxEP') { state.choice = +e.target.value; back(false); } });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-gapfix="uxEP"]')) { state.gap = true; back(false); } });
    function fwd() {
      const out = M.$('#uxOut', el);
      const r = TE.parseUnix(M.$('#uxIn', el).value, M.$('#uxUnit', el).value);
      if (!r.ok) { out.innerHTML = errBox([r.error]); return; }
      const rel = TE.formatBreakdown(Math.abs(Date.now() - r.epochMs), { withMs: false });
      out.innerHTML = `<p class="small">${r.autoDetected ? `Detected as <b>${{ s: 'seconds', ms: 'milliseconds', us: 'microseconds', ns: 'nanoseconds' }[r.unit]}</b>. ` : ''}${r.epochMs > Date.now() ? 'In ' + esc(rel) : esc(rel) + ' ago'}.</p>${instantTable(r.epochMs, zp.get())}
        <p class="tiny muted">Seconds: ${Math.floor(r.epochMs / 1000)} · Milliseconds: ${r.epochMs}</p>`;
      M.addRecentDebounced('Unix', `${M.$('#uxIn', el).value.trim()} → ${new Date(r.epochMs).toISOString()}`, M.link('utils', { tab: 'unix', ts: M.$('#uxIn', el).value.trim() }));
    }
    function back(reset = true) {
      if (reset) { state.choice = null; state.gap = false; }
      const out = M.$('#uxOut2', el), d = M.readDate(M.$('#uxD', el)), t = tf.get(), z = zp2.get();
      if (!d.ok || !t || !z) { out.innerHTML = errBox([d.error || 'Check the inputs.']); return; }
      const ep = M.resolveEndpoint(z, { ...d.date, ...t, ms: 0 }, state, 'uxEP', 'Date');
      if (ep.instant == null) { out.innerHTML = ep.html; return; }
      const s = Math.floor(ep.instant / 1000);
      out.innerHTML = ep.html + `<dl class="kv"><dt>Seconds</dt><dd class="mono">${s} <button class="icon-btn sm" data-copy="${s}" aria-label="Copy seconds">${M.icon('copy')}</button></dd><dt>Milliseconds</dt><dd class="mono">${ep.instant} <button class="icon-btn sm" data-copy="${ep.instant}" aria-label="Copy milliseconds">${M.icon('copy')}</button></dd><dt>UTC</dt><dd class="mono">${esc(new Date(ep.instant).toISOString())}</dd><dt>Offset used</dt><dd>${esc(TE.formatOffset(TE.offsetAt(z, ep.instant)))}</dd></dl>`;
    }
    fwd(); back();
    return {
      tick: (now) => { const e = M.$('#uxNow', el); if (e) e.textContent = Math.floor(now / 1000); },
      params: (p) => { if (p.ts) { M.$('#uxIn', el).value = p.ts; M.$('#uxUnit', el).value = 'auto'; fwd(); } }
    };
  }

  /* ---------- ISO 8601 ---------- */
  function buildISO(el) {
    el.innerHTML = `
      <div class="card">
        <div class="field"><label for="isIn">ISO 8601 / RFC 3339 timestamp</label><input class="input mono" id="isIn" value="2011-08-04T21:30:00.125-07:00" autocomplete="off" spellcheck="false"></div>
        <div class="example-links" style="margin-top:8px"><span class="muted">Examples:</span>${['2011-08-04T21:30:00-07:00', '2024-06-01T12:00:00Z', '2024-06-01T17:45:00+05:45', '2024-01-01T00:00:00.123456Z', '20240601T120000Z', '2026-W42-2', '2026-286', '2024-03-10T02:30'].map(x => `<button data-ex="${x}">${x}</button>`).join('')}</div>
        <div id="isZ" style="margin-top:10px"></div>
        <div id="isOut" class="result"></div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:6px">Reading ISO 8601</h2>
        <ul class="small" style="margin:0;padding-left:18px">
          <li><span class="mono">2011-08-04</span> calendar date (year-month-day). <span class="mono">T</span> separates date and time.</li>
          <li><span class="mono">Z</span> (“Zulu”) means UTC, offset +00:00.</li>
          <li><span class="mono">+05:45</span> / <span class="mono">-07:00</span> is the offset from UTC <em>of that local time</em>: local − offset = UTC. An offset is not a time zone — it doesn’t tell you the DST rules.</li>
          <li>No offset at all means local time with an unspecified zone — the same text denotes different instants in different places.</li>
          <li>Fractional seconds can have any number of digits; Meridian preserves all digits for display and computes with millisecond precision.</li>
          <li><span class="mono">-00:00</span> (RFC 3339) means “UTC, but the local offset is unknown”.</li>
        </ul></div>`;
    const zp = M.zonePicker(M.$('#isZ', el), { label: 'Show the instant in (also used to interpret timestamps without an offset)', value: M.ianaRef('Asia/Tokyo'), noMeta: true, onChange: run });
    M.$('#isIn', el).addEventListener('input', run);
    el.querySelector('.example-links').addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) { M.$('#isIn', el).value = b.dataset.ex; run(); } });
    function run() {
      const out = M.$('#isOut', el), r = TE.parseISO8601(M.$('#isIn', el).value);
      if (!r.ok) { out.innerHTML = errBox([r.error]); return; }
      const w = r.wall, z = zp.get();
      const timeStr = r.hasTime ? `${TE.pad(w.h)}:${TE.pad(w.mi)}:${TE.pad(w.s)}${r.fraction ? '.' + r.fraction : ''}` : '(no time — date only)';
      let instant = r.epochMs, interp = '';
      if (instant == null && r.hasTime && z) {
        const rr = TE.resolveLocal(z, w);
        if (rr.status === 'gap') interp = `<div class="note warn small">No offset given, and ${timeStr} does not exist in ${esc(M.refShort(z))} on that date (DST gap).</div>`;
        else { instant = rr.candidates[0].epochMs; interp = `<div class="note info small">No offset given — this is a <b>local time</b>. Interpreted in ${esc(M.refShort(z))} (${esc(TE.formatOffset(rr.candidates[0].offsetSec))})${rr.status === 'ambiguous' ? '; this time occurs twice there, the first occurrence is used' : ''}. Change the zone below to reinterpret.</div>`; }
      }
      out.innerHTML = `<dl class="kv">
        <dt>Form</dt><dd>${{ calendar: 'Calendar date', week: 'ISO week date', ordinal: 'Ordinal date (year + day-of-year)' }[r.kind]}${r.endOfDay ? ' · 24:00 = end of day (start of next day)' : ''}</dd>
        <dt>Date</dt><dd>${esc(TE.formatDateLong(w))}</dd>
        <dt>Time</dt><dd class="mono">${esc(timeStr)}${r.fraction.length > 3 ? ' <span class="tiny muted">(sub-millisecond digits preserved for display)</span>' : ''}</dd>
        <dt>Offset</dt><dd>${r.offsetSec == null ? '<span class="badge amber">none — local time</span>' : r.zDesignator ? '<span class="badge primary">Z = UTC</span>' : r.negativeZero ? '<span class="badge">-00:00 — UTC, local offset unknown</span>' : esc(TE.formatOffset(r.offsetSec))}</dd>
        ${r.offsetSec != null && r.offsetSec !== 0 && r.hasTime ? `<dt>Meaning</dt><dd>${esc(timeStr)} local, which is ${esc(TE.formatDiffHours(r.offsetSec).replace(/^[+−]/, ''))} ${r.offsetSec > 0 ? 'ahead of' : 'behind'} UTC</dd>` : ''}
        ${instant != null ? `<dt>UTC instant</dt><dd class="mono">${esc(TE.isoDate(TE.toZoned(TE.UTC, instant)))}T${esc(new Date(instant).toISOString().slice(11, 19))}${r.fraction ? '.' + esc(r.fraction) : ''}Z</dd><dt>Unix</dt><dd class="mono">${Math.floor(instant / 1000)}${r.fraction ? '.' + esc(r.fraction) : ''} s</dd>` : ''}
      </dl>${interp}${instant != null ? `<h3 style="margin:14px 0 8px">The same instant elsewhere</h3>${instantTable(instant, z)}` : ''}`;
    }
    run();
    return {};
  }

  /* ---------- Date formats ---------- */
  function buildFormat(el) {
    el.innerHTML = `
      <div class="card">
        <div class="row"><div class="field" style="flex:2 1 260px"><label for="dfIn">Date in any common format</label><input class="input" id="dfIn" value="04/05/2011" autocomplete="off"></div>
          <div class="field" style="flex:0 1 220px"><label for="dfPref">Preferred display format</label><select class="select" id="dfPref"><option value="long">Weekday, Month D, YYYY</option><option value="iso">YYYY-MM-DD (ISO)</option><option value="mdy">MM/DD/YYYY (US)</option><option value="dmy">DD/MM/YYYY</option></select></div></div>
        <div class="example-links" style="margin-top:8px"><span class="muted">Try:</span>${['04/05/2011', '13/05/2011', '2011-08-04', 'August 4, 2011', '4 Aug 2011', '04-Aug-2011', '20110804', '02/30/2024'].map(x => `<button data-ex="${x}">${x}</button>`).join('')}</div>
        <div id="dfOut" class="result"></div>
        <p class="tiny muted">Two-digit years are read as 1950–2049. Your preferred format is saved and used throughout the app.</p>
      </div>`;
    M.$('#dfPref', el).value = M.settings.dateFormat;
    M.$('#dfPref', el).addEventListener('change', (e) => { M.setSetting('dateFormat', e.target.value); run(); });
    M.$('#dfIn', el).addEventListener('input', run);
    el.querySelector('.example-links').addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) { M.$('#dfIn', el).value = b.dataset.ex; run(); } });
    function formats(d) {
      const p = TE.pad, iso = TE.isoWeek(d.y, d.m, d.d);
      return [['ISO 8601', TE.isoDate(d)], ['US (MM/DD/YYYY)', `${p(d.m)}/${p(d.d)}/${d.y}`], ['Day-first (DD/MM/YYYY)', `${p(d.d)}/${p(d.m)}/${d.y}`], ['European dotted (DD.MM.YYYY)', `${p(d.d)}.${p(d.m)}.${d.y}`], ['Long (US)', TE.formatDateLong(d, false)], ['Long (day-first)', `${d.d} ${TE.MONTHS[d.m - 1]} ${d.y}`], ['With weekday', TE.formatDateLong(d)], ['Abbreviated', `${p(d.d)}-${TE.MONTHS_SHORT[d.m - 1]}-${d.y}`], ['Compact (YYYYMMDD)', `${TE.isoYear(d.y)}${p(d.m)}${p(d.d)}`], ['ISO week date', `${iso.year}-W${p(iso.week)}-${TE.isoWeekday(d.y, d.m, d.d)}`], ['ISO ordinal date', `${TE.isoYear(d.y)}-${p(TE.dayOfYear(d.y, d.m, d.d), 3)}`], ['Your preferred format', M.fmtDate(d)]];
    }
    function run() {
      const out = M.$('#dfOut', el), r = TE.parseFlexibleDate(M.$('#dfIn', el).value);
      if (!r.ok) { out.innerHTML = errBox([r.error]); return; }
      out.innerHTML = (r.ambiguous ? `<div class="note warn">This date is <b>ambiguous</b>: it could be ${r.interpretations.map(i => `<b>${esc(TE.formatDateLong(i))}</b> (${esc(i.format)})`).join(' or ')}. The US convention puts the month first; most other countries put the day first. Use ISO 8601 (YYYY-MM-DD) to avoid confusion.</div>` : '') +
        `<div class="grid ${r.interpretations.length > 1 ? 'cols-2' : ''}" style="margin-top:10px">${r.interpretations.map(i => `<div class="card flat"><h3 style="margin-bottom:8px">${r.ambiguous ? 'If ' + esc(i.format) : 'Read as ' + esc(i.format)}</h3><div class="table-wrap"><table class="table"><tbody>${formats(i).map(([k, v]) => `<tr><td class="small">${esc(k)}</td><td class="mono small">${esc(v)}</td><td class="right"><button class="icon-btn sm" data-copy="${esc(v)}" aria-label="Copy ${esc(k)}">${M.icon('copy')}</button></td></tr>`).join('')}</tbody></table></div></div>`).join('')}</div>`;
    }
    run();
    return {};
  }

  /* ---------- Countdowns ---------- */
  function buildCountdown(el) {
    let list = M.store.get('countdowns', null);
    if (!list) {
      const t = M.today();
      list = [{ id: 1, name: `New Year ${t.y + 1}`, date: `${t.y + 1}-01-01`, time: '00:00:00', zone: 'local' }, { id: 2, name: 'Unix time 2,000,000,000', date: '2033-05-18', time: '03:33:20', zone: 'utc' }];
    }
    let showMs = false, raf = null;
    el.innerHTML = `
      <div class="card"><h2 style="margin-bottom:10px">New countdown or count-up</h2>
        <div class="row"><div class="field" style="flex:1 1 200px"><label for="cdName">Label</label><input class="input" id="cdName" placeholder="e.g. Launch day"></div><div class="field" style="flex:0 1 190px"><label for="cdD">Date</label><input class="input" type="date" id="cdD"></div><div id="cdT" style="flex:1 1 230px"></div></div>
        <div class="row" style="margin-top:8px;align-items:flex-end"><div id="cdZ" style="flex:2 1 280px"></div><button class="btn btn-primary" id="cdAdd" style="flex:0 0 auto">${M.icon('plus')} Add</button><label class="check" style="flex:0 0 auto"><input type="checkbox" id="cdMs"> Show milliseconds</label></div>
        <div id="cdErr"></div>
        <p class="tiny muted">Past dates count up (time elapsed since). Saved only in this browser.</p>
      </div>
      <div class="stack section-gap" id="cdList"></div>`;
    const t0 = M.today();
    M.$('#cdD', el).value = M.dateInputValue(TE.addDays(t0, 30));
    const tf = M.timeField(M.$('#cdT', el), { label: 'Time', value: { h: 9, mi: 0, s: 0 } });
    const zp = M.zonePicker(M.$('#cdZ', el), { label: 'Time zone', value: M.localZone(), noMeta: true });
    const save = () => M.store.set('countdowns', list);
    M.$('#cdAdd', el).addEventListener('click', () => {
      const d = M.readDate(M.$('#cdD', el)), t = tf.get(), z = zp.get(), err = M.$('#cdErr', el);
      if (!d.ok || !t || !z) { err.innerHTML = errBox([d.error || 'Check the time and zone.']); return; }
      const r = TE.resolveLocal(z, { ...d.date, ...t, ms: 0 });
      if (r.status === 'gap') { err.innerHTML = errBox(['That local time does not exist (clocks skip it). Choose another time.']); return; }
      err.innerHTML = r.status === 'ambiguous' ? `<div class="note warn small">That time occurs twice in ${esc(M.refShort(z))}; the first occurrence is used.</div>` : '';
      list.push({ id: Date.now(), name: M.$('#cdName', el).value.trim() || TE.formatDateLong(d.date), date: TE.isoDate(d.date), time: `${TE.pad(t.h)}:${TE.pad(t.mi)}:${TE.pad(t.s)}`, zone: M.serializeRef(z) });
      save(); M.$('#cdName', el).value = ''; render();
    });
    M.$('#cdMs', el).addEventListener('change', (e) => { showMs = e.target.checked; loop(); });
    M.$('#cdList', el).addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (b) { list = list.filter(x => String(x.id) !== b.dataset.del); save(); render(); } });
    const instOf = (c) => { const z = c.zone === 'local' ? M.localZone() : M.parseRef(c.zone) || M.utcZone(); const d = TE.parseISODate(c.date).date, t = TE.parseTime(c.time).time; const r = TE.resolveLocal(z, { ...d, ...t, ms: 0 }); return { z, at: r.status === 'gap' ? r.shiftedEpochMs : r.candidates[0].epochMs }; };
    function render() {
      const box = M.$('#cdList', el);
      if (!list.length) { box.innerHTML = `<div class="card empty">${M.icon('hourglass')}<div>No countdowns yet.</div></div>`; return; }
      box.innerHTML = list.map(c => { const { z, at } = instOf(c); const w = TE.toZoned(z, at); return `<div class="card" data-cd="${c.id}"><div class="card-head"><h3>${esc(c.name)}</h3><span class="sub">${esc(M.fmtDateTime(w))} ${esc(M.refShort(z))}</span><button class="icon-btn sm" data-del="${c.id}" aria-label="Delete ${esc(c.name)}">${M.icon('x')}</button></div><div class="small muted" data-dir></div><div class="countdown-grid" data-grid style="margin-top:6px"></div></div>`; }).join('');
      update(Date.now());
    }
    function update(now) {
      for (const c of list) {
        const card = M.$(`[data-cd="${c.id}"]`, el); if (!card) continue;
        const { at } = instOf(c);
        const diff = at - now, b = TE.breakdown(diff);
        card.querySelector('[data-dir]').textContent = diff >= 0 ? 'Time remaining' : 'Time since (counting up)';
        const units = [['days', TE.formatNumber(b.days)], ['hours', TE.pad(b.hours)], ['min', TE.pad(b.minutes)], ['sec', TE.pad(b.seconds)]];
        if (showMs) units.push(['ms', TE.pad(b.milliseconds, 3)]);
        card.querySelector('[data-grid]').innerHTML = units.map(([k, v]) => `<div class="u"><b>${v}</b><span>${k}</span></div>`).join('');
      }
    }
    function loop() {
      cancelAnimationFrame(raf);
      if (!showMs) return;
      const step = () => { if (el.hidden || root.hidden || !showMs) return; update(Date.now()); raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }
    render();
    return { tick: (now) => { if (!showMs) update(now); else loop(); } };
  }

  /* ---------- Recurring ---------- */
  function buildRecurring(el) {
    const t = M.today();
    el.innerHTML = `
      <div class="card">
        <div class="row">
          <div class="field" style="flex:1 1 220px"><label for="rcMode">Pattern</label><select class="select" id="rcMode">
            <option value="interval">Every N days / weeks / months / years</option><option value="nth">Nth weekday of every month</option><option value="annual">Same month & day every year</option></select></div>
          <div class="field" style="flex:0 1 190px"><label for="rcStart">Start / reference date</label><input class="input" type="date" id="rcStart" value="${M.dateInputValue(t)}"></div>
          <div class="field" style="flex:0 1 110px"><label for="rcCount">Show</label><input class="input num-input" type="number" id="rcCount" value="12" min="1" max="200"></div>
        </div>
        <div class="row" style="margin-top:8px" id="rcOpts"></div>
        <label class="check" style="margin-top:10px"><input type="checkbox" id="rcFuture" checked> Only occurrences on or after today</label>
        <div id="rcOut" class="result"></div>
      </div>`;
    const opts = M.$('#rcOpts', el);
    function renderOpts() {
      const mode = M.$('#rcMode', el).value;
      if (mode === 'interval') opts.innerHTML = `<div class="field" style="flex:0 1 120px"><label for="rcN">Every</label><input class="input num-input" id="rcN" type="number" value="2" min="1"></div><div class="field" style="flex:0 1 160px"><label for="rcU">Unit</label><select class="select" id="rcU"><option value="d">days</option><option value="w" selected>weeks</option><option value="m">months</option><option value="y">years</option></select></div><div class="small muted" style="flex:2 1 260px">Month/year steps are counted from the start date (start + k·N months) with month-end clamping, so a series starting Jan 31 gives Feb 28/29, Mar 31, Apr 30…</div>`;
      else if (mode === 'nth') opts.innerHTML = `<div class="field"><label for="rcNth">Occurrence</label><select class="select" id="rcNth"><option value="1">First</option><option value="2">Second</option><option value="3">Third</option><option value="4">Fourth</option><option value="-1">Last</option></select></div><div class="field"><label for="rcWd">Weekday</label><select class="select" id="rcWd">${TE.WEEKDAYS.map((w, i) => `<option value="${i}" ${i === 2 ? 'selected' : ''}>${w}</option>`).join('')}</select></div>`;
      else opts.innerHTML = `<div class="field" style="flex:1 1 280px"><label for="rcLeap">If the date is February 29</label><select class="select" id="rcLeap"><option value="skip">Only in leap years</option><option value="feb28">Use February 28 in common years</option><option value="mar1">Use March 1 in common years</option></select></div>`;
    }
    el.addEventListener('input', (e) => { if (e.target.id === 'rcMode') renderOpts(); run(); });
    el.addEventListener('change', run);
    function run() {
      const out = M.$('#rcOut', el), s = M.readDate(M.$('#rcStart', el)), count = Number(M.$('#rcCount', el).value);
      if (!s.ok) { out.innerHTML = errBox([s.error]); return; }
      if (!Number.isInteger(count) || count < 1 || count > 200) { out.innerHTML = errBox(['Show between 1 and 200 occurrences.']); return; }
      const mode = M.$('#rcMode', el).value, today = M.today(), onlyFuture = M.$('#rcFuture', el).checked;
      const res = []; let guard = 0;
      const okDate = (d) => !onlyFuture || TE.compareDates(d, today) >= 0;
      if (mode === 'interval') {
        const n = Number(M.$('#rcN', el).value), u = M.$('#rcU', el).value;
        if (!Number.isInteger(n) || n < 1 || n > 100000) { out.innerHTML = errBox(['Interval must be a whole number ≥ 1.']); return; }
        let k = 0;
        if (onlyFuture && (u === 'd' || u === 'w')) { const step = n * (u === 'w' ? 7 : 1); const gap = TE.daysBetween(s.date, today); if (gap > 0) k = Math.ceil(gap / step); }
        while (res.length < count && guard++ < 200000) {
          const d = u === 'd' ? TE.addDays(s.date, k * n) : u === 'w' ? TE.addDays(s.date, k * n * 7) : u === 'm' ? TE.addMonths(s.date, k * n) : TE.addYears(s.date, k * n);
          if (okDate(d)) res.push({ y: d.y, m: d.m, d: d.d, note: d.clamped ? 'clamped to month end' : '' });
          k++;
        }
      } else if (mode === 'nth') {
        const nth = +M.$('#rcNth', el).value, wd = +M.$('#rcWd', el).value;
        let y = s.date.y, m = s.date.m;
        while (res.length < count && guard++ < 5000) {
          const d = TE.nthWeekdayOfMonth(y, m, wd, nth);
          if (d && TE.compareDates(d, s.date) >= 0 && okDate(d)) res.push(d);
          m++; if (m > 12) { m = 1; y++; }
        }
      } else {
        const rule = M.$('#rcLeap', el).value, { m, d } = s.date;
        let y = s.date.y;
        while (res.length < count && guard++ < 5000) {
          let dt = { y, m, d }, note = '';
          if (m === 2 && d === 29 && !TE.isLeapYear(y)) { if (rule === 'skip') dt = null; else { dt = rule === 'feb28' ? { y, m: 2, d: 28 } : { y, m: 3, d: 1 }; note = 'leap-day rule'; } }
          if (dt && okDate(dt)) res.push({ ...dt, note });
          y++;
        }
      }
      out.innerHTML = res.length ? `<div class="table-wrap"><table class="table"><thead><tr><th class="num">#</th><th>Date</th><th>Weekday</th><th class="num">When</th></tr></thead><tbody>${res.map((d, i) => `<tr><td class="num">${i + 1}</td><td>${esc(M.fmtDate(d, 'noweekday'))}${d.note ? ` <span class="tiny muted">(${esc(d.note)})</span>` : ''}</td><td>${TE.WEEKDAYS[TE.weekday(d.y, d.m, d.d)]}</td><td class="num small">${esc(M.relDays(TE.daysBetween(today, d)))}</td></tr>`).join('')}</tbody></table></div>
        <button class="btn btn-sm" style="margin-top:8px" data-copy="${esc(res.map(d => TE.isoDate(d)).join('\n'))}">${M.icon('copy')} Copy as list</button>` : '<div class="empty">No occurrences found.</div>';
    }
    renderOpts(); run();
    return {};
  }

  /* ---------- Abbreviations ---------- */
  function buildAbbr(el) {
    el.innerHTML = `
      <div class="card">
        <div class="row"><div class="field" style="flex:1 1 260px"><label for="abQ">Search abbreviations</label><input class="input" type="search" id="abQ" placeholder="PST, CST, IST, BST, Central…"></div><label class="check"><input type="checkbox" id="abAmb"> Only ambiguous</label></div>
        <div id="abOut" class="result"></div>
      </div>
      <div class="card section-gap"><h2 style="margin-bottom:6px">Why abbreviations are risky</h2>
        <p class="small">Time-zone abbreviations are not standardized. <b>CST</b> can mean US Central Standard Time (UTC−6), China Standard Time (UTC+8) or Cuba Standard Time (UTC−5); <b>IST</b> can be India, Ireland or Israel; <b>BST</b> British Summer Time or Bangladesh Standard Time. An abbreviation also pins a single offset: “EST” is always UTC−5, even in July when New York is actually on EDT (UTC−4). For unambiguous results, use a location or an IANA name such as <span class="mono">America/New_York</span>. In the converter, typing an ambiguous abbreviation lists every meaning and asks you to choose.</p></div>`;
    const counts = {};
    M.D.ABBREVIATIONS.forEach(a => { counts[a.abbr] = (counts[a.abbr] || 0) + 1; });
    const run = () => {
      const q = M.norm(M.$('#abQ', el).value.trim()), amb = M.$('#abAmb', el).checked;
      const rows = M.D.ABBREVIATIONS.filter(a => (!q || M.norm(a.abbr).includes(q) || M.norm(a.name).includes(q) || a.zones.some(z => M.norm(z).includes(q))) && (!amb || counts[a.abbr] > 1));
      M.$('#abOut', el).innerHTML = rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Abbr.</th><th>Meaning</th><th class="num">Offset</th><th>Used by (examples)</th><th></th></tr></thead><tbody>${rows.map(a => `<tr><td><b class="mono">${esc(a.abbr)}</b>${counts[a.abbr] > 1 ? ' <span class="badge amber">ambiguous</span>' : ''}</td><td>${esc(a.name)}${a.note ? `<div class="tiny muted">${esc(a.note)}</div>` : ''}</td><td class="num nowrap">${esc(TE.formatOffset(a.offset * 60))}</td><td class="small">${a.zones.map(z => z.startsWith('Etc/') ? esc(z) : `<a href="${M.link('map', { zone: 'iana:' + z })}">${esc(z)}</a>`).join(', ')}</td><td class="right"><a class="btn btn-sm btn-ghost" href="${M.link('convert', { from: M.serializeRef(a.abbr === 'UTC' || a.abbr === 'Z' ? M.utcZone() : M.fixedRef(a.offset * 60, a.abbr, a.name)) })}">Convert</a></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No abbreviations match.</div>';
    };
    M.$('#abQ', el).addEventListener('input', run); M.$('#abAmb', el).addEventListener('change', run);
    run();
    return {};
  }

  const B = { unix: buildUnix, iso: buildISO, format: buildFormat, countdown: buildCountdown, recurring: buildRecurring, abbr: buildAbbr };
  function show(params) { const { tab: t, ...rest } = params; setTab(t || tab, rest); }
  function tick(now) { const p = panes[tab]; if (p && p.api.tick && !p.el.hidden) p.api.tick(now); }
  M.register('utils', { init, show, tick });
})();
