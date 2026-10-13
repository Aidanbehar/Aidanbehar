/* Meridian — Time-zone converter (historical rules, literal abbreviations, gaps & overlaps) */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  let root, srcPicker, timeField, dateInput, dests = [], ambigChoice = null, gapAccepted = false, lastSig = '';

  function defaultDests() {
    const ids = ['Europe/London', 'Asia/Tokyo'].filter(z => z !== M.localZoneId);
    return [M.utcZone(), ...ids.map(M.ianaRef)];
  }

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('convert', 'Time-Zone Converter', 'Convert a date and time from one place to others using the rules that applied <em>on that date</em> — including historical daylight-saving rules. Choose a location (follows its local rules), an IANA zone, or a literal abbreviation/offset such as PST (always UTC−8).')}
      <div class="grid cols-2">
        <div class="card">
          <div class="card-head"><h2>From</h2>
            <button class="btn btn-sm" id="cvNow">${M.icon('clock')} Now</button>
            <button class="btn btn-sm" id="cvMine">Use my zone</button>
          </div>
          <div class="stack">
            <div class="row">
              <div class="field" style="flex:0 1 200px"><label for="cvDate">Date</label><input class="input" type="date" id="cvDate" min="0001-01-01" max="9999-12-31"></div>
              <div id="cvTime" style="flex:1 1 260px"></div>
            </div>
            <div id="cvSrc"></div>
            <div class="example-links"><span class="muted">Examples:</span>
              <button data-ex="pst">Aug 4 2011, 9:30 PM PST → Berlin</button>
              <button data-ex="la">Same, Los Angeles time</button>
              <button data-ex="gap">Nonexistent time (DST gap)</button>
              <button data-ex="amb">Ambiguous time (DST overlap)</button>
              <button data-ex="ktm">Kathmandu (+5:45)</button>
              <button data-ex="midnight">Crossing midnight</button>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>To</h2><button class="btn btn-sm" id="cvAdd">${M.icon('plus')} Add destination</button><button class="btn btn-sm" id="cvSwap" title="Swap origin with first destination">${M.icon('swap')} Swap</button></div>
          <div class="dest-list" id="cvDests"></div>
        </div>
      </div>
      <div id="cvResult" class="section-gap"></div>`;
    dateInput = M.$('#cvDate', el);
    timeField = M.timeField(M.$('#cvTime', el), { label: 'Time', onChange: changed });
    srcPicker = M.zonePicker(M.$('#cvSrc', el), { label: 'Time zone, location, abbreviation or offset', value: M.localZone(), onChange: changed });
    dateInput.addEventListener('input', changed);
    setNow(true);
    dests = defaultDests().map(r => r);
    renderDests();
    M.$('#cvNow', el).addEventListener('click', () => setNow());
    M.$('#cvMine', el).addEventListener('click', () => { srcPicker.set(M.localZone()); });
    M.$('#cvAdd', el).addEventListener('click', () => { dests.push(null); renderDests(true); });
    M.$('#cvSwap', el).addEventListener('click', swap);
    el.querySelector('.example-links').addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) example(b.dataset.ex); });
    M.$('#cvResult', el).addEventListener('change', (e) => {
      if (e.target.name === 'cvAmbig') { ambigChoice = +e.target.value; compute(); }
    });
    M.$('#cvResult', el).addEventListener('click', (e) => {
      const g = e.target.closest('[data-gap]'); if (g) { gapAccepted = true; compute(); }
      const sw = e.target.closest('[data-suggest]'); if (sw) { const r = M.parseRef(sw.dataset.suggest); if (r) srcPicker.set(r); }
    });
    M.bindCopy(el);
    M.onSettings(() => compute());
  }
  function setNow(silent) {
    const z = srcPicker.get() || M.localZone();
    const w = TE.toZoned(z, Date.now());
    dateInput.value = M.dateInputValue(w);
    timeField.set({ h: w.h, mi: w.mi, s: w.s }, true);
    if (!silent) changed();
  }
  function renderDests(focusLast) {
    const box = M.$('#cvDests', root);
    box.innerHTML = '';
    dests.forEach((r, i) => {
      const row = M.el(`<div class="dest-item"><div></div><button class="icon-btn" aria-label="Remove destination ${i + 1}" ${dests.length < 2 ? 'disabled' : ''}>${M.icon('x')}</button></div>`);
      box.appendChild(row);
      const p = M.zonePicker(row.firstElementChild, { label: `Destination ${i + 1}`, value: r, onChange: (nr) => { dests[i] = nr; changed(); } });
      row.querySelector('button').addEventListener('click', () => { dests.splice(i, 1); renderDests(); changed(); });
      if (focusLast && i === dests.length - 1) setTimeout(() => p.input.focus(), 0);
    });
  }
  function swap() {
    const s = srcPicker.get(), d0 = dests[0];
    if (!s || !d0) return;
    // keep the same instant: convert the entered time into the destination first
    const inst = currentInstant();
    dests[0] = s;
    srcPicker.set(d0, true);
    if (inst != null) { const w = TE.toZoned(d0, inst); dateInput.value = M.dateInputValue(w); timeField.set({ h: w.h, mi: w.mi, s: w.s }, true); }
    renderDests(); changed();
  }
  let currentInstantCache = null;
  const currentInstant = () => currentInstantCache;
  function example(k) {
    const set = (date, t, src, dst) => {
      dateInput.value = date; timeField.set(t, true); srcPicker.set(src, true);
      if (dst) { dests = dst; renderDests(); }
      changed();
    };
    const PST = M.fixedRef(-8 * 3600, 'PST', 'Pacific Standard Time');
    const city = (n) => M.cityRef(M.D.CITIES.find(c => c.name === n));
    if (k === 'pst') set('2011-08-04', { h: 21, mi: 30, s: 0 }, PST, [city('Berlin'), M.utcZone()]);
    if (k === 'la') set('2011-08-04', { h: 21, mi: 30, s: 0 }, city('Los Angeles'), [city('Berlin'), M.utcZone()]);
    if (k === 'gap') set('2024-03-10', { h: 2, mi: 30, s: 0 }, city('New York'), [city('London'), M.utcZone()]);
    if (k === 'amb') set('2024-11-03', { h: 1, mi: 30, s: 0 }, city('New York'), [city('London'), M.utcZone()]);
    if (k === 'ktm') set('2024-06-01', { h: 12, mi: 0, s: 0 }, M.utcZone(), [city('Kathmandu'), city('New Delhi'), city('Chatham Islands')]);
    if (k === 'midnight') set('2023-12-31', { h: 22, mi: 0, s: 0 }, city('Los Angeles'), [city('Tokyo'), city('Sydney'), city('Honolulu')]);
  }
  function changed() { ambigChoice = null; gapAccepted = false; compute(); }

  function zoneDesc(z, t) {
    const off = TE.offsetAt(z, t);
    if (z.isUTC) return 'Coordinated Universal Time (UTC±00:00, no daylight saving)';
    if (z.kind === 'fixed') return `${z.abbr ? `${z.abbr} (${z.name || 'fixed offset'})` : 'Fixed offset'} — ${TE.formatOffset(off)}, literal (no DST)`;
    const nm = TE.zoneName(z, t, 'long');
    const ds = TE.dstInfo(z, t);
    return `${nm ? nm + ' — ' : ''}${TE.formatOffset(off)}${ds.observesDst ? (ds.isDst ? ', daylight saving time' : ', standard time') : ''}`;
  }
  function zoneBar(z, t, label) {
    const w = TE.toZoned(z, t);
    const pos = (w.h * 60 + w.mi) / 1440 * 100;
    const segs = Array.from({ length: 24 }, (_, h) => `<span style="background:color-mix(in srgb, var(--${M.dayPart(h)}) ${h >= 21 || h < 5 ? 55 : 40}%, var(--surface))"></span>`).join('');
    return `<div class="zone-bar"><div><b>${esc(label)}</b><div class="tiny muted">${esc(TE.formatDateShort(w))}</div></div><div class="bar" aria-hidden="true">${segs}<div class="marker" style="left:${pos}%" data-label="${esc(M.fmtTime(w))}"></div></div></div>`;
  }

  function compute() {
    const out = M.$('#cvResult', root);
    const src = srcPicker.get();
    const dr = M.readDate(dateInput);
    const tv = timeField.get();
    currentInstantCache = null;
    const errs = [];
    if (!dr.ok) errs.push(dr.error);
    if (!tv) errs.push('Enter a valid time (minutes and seconds 0–59).');
    if (!src) errs.push('Choose an origin time zone or location.');
    if (errs.length) { out.innerHTML = `<div class="note error">${errs.map(esc).join('<br>')}</div>`; return; }
    const wall = { ...dr.date, h: tv.h, mi: tv.mi, s: tv.s, ms: 0 };
    let res;
    try { res = TE.resolveLocal(src, wall); } catch (e) { out.innerHTML = `<div class="note error">${esc(e.message)}</div>`; return; }
    const validDests = dests.filter(Boolean);
    history.replaceState(null, '', M.link('convert', { date: TE.isoDate(dr.date), time: `${TE.pad(tv.h)}:${TE.pad(tv.mi)}:${TE.pad(tv.s)}`, from: M.serializeRef(src), to: validDests.map(M.serializeRef).join('|') }));
    const wallStr = `${TE.formatDateLong(dr.date)}, ${M.fmtTime(wall, { seconds: tv.s !== 0 })}`;
    let instant, chosenOffset, preface = '';
    if (res.status === 'gap') {
      const tr = res.transition;
      const shiftedW = TE.toZoned(src, res.shiftedEpochMs);
      preface = `<div class="card"><div class="note warn"><strong>This local time does not exist.</strong> On ${esc(TE.formatDateLong(dr.date))}, clocks in ${esc(M.refTitle(src))} jumped forward from ${esc(TE.formatOffset(res.offsetBefore))} to ${esc(TE.formatOffset(res.offsetAfter))}${tr ? ` at ${esc(M.fmtTime(TE.toZoned(src, tr.epochMs - 1)))}→${esc(M.fmtTime(TE.toZoned(src, tr.epochMs)))} local time` : ''}, so ${esc(M.fmtTime(wall))} was skipped.
        <div style="margin-top:8px">Most software moves such times forward by the size of the gap. ${gapAccepted ? '' : `<button class="btn btn-sm" data-gap>Interpret as ${esc(M.fmtTime(shiftedW))} (${esc(TE.formatOffset(shiftedW.offsetSec))})</button>`} Or change the time above.</div></div></div>`;
      if (!gapAccepted) { out.innerHTML = preface; return; }
      instant = res.shiftedEpochMs; chosenOffset = shiftedW.offsetSec;
    } else if (res.status === 'ambiguous') {
      const [a, b] = res.candidates;
      const lab = (c, i) => {
        const nm = TE.zoneAbbrev(src, c.epochMs) || TE.zoneName(src, c.epochMs, 'short') || '';
        return `<label><input type="radio" name="cvAmbig" value="${i}" ${ambigChoice === i ? 'checked' : ''}><div><b>${i === 0 ? 'First occurrence' : 'Second occurrence'}</b> — ${esc(M.fmtTime(wall))} ${esc(nm)} (${esc(TE.formatOffset(c.offsetSec))}) = <span class="mono">${esc(new Date(c.epochMs).toISOString().replace('.000', ''))}</span><div class="tiny muted">${i === 0 ? 'Before the clocks were set back (daylight time)' : 'After the clocks were set back (standard time)'}</div></div></label>`;
      };
      preface = `<div class="card"><div class="note warn"><strong>This local time happened twice.</strong> On ${esc(TE.formatDateLong(dr.date))}, clocks in ${esc(M.refTitle(src))} were set back from ${esc(TE.formatOffset(a.offsetSec))} to ${esc(TE.formatOffset(b.offsetSec))}, so ${esc(M.fmtTime(wall))} occurred once before and once after the change (one hour apart). Choose which one you mean:</div><div class="ambig-choices" role="radiogroup" aria-label="Choose interpretation">${lab(a, 0)}${lab(b, 1)}</div></div>`;
      if (ambigChoice == null) {
        // show both interpretations compactly, but don't pick one
        const both = validDests.map(d => `<tr><td>${esc(M.refShort(d))}</td>${[a, b].map(c => { const w = TE.toZoned(d, c.epochMs); return `<td>${esc(M.fmtDateTime(w))} <span class="tiny muted">${esc(TE.formatOffset(w.offsetSec))}</span></td>`; }).join('')}</tr>`).join('');
        out.innerHTML = preface + `<div class="card section-gap"><h3 style="margin-bottom:8px">Both interpretations</h3><div class="table-wrap"><table class="table"><thead><tr><th>Destination</th><th>If first occurrence</th><th>If second occurrence</th></tr></thead><tbody>${both}</tbody></table></div></div>`;
        return;
      }
      instant = res.candidates[ambigChoice].epochMs; chosenOffset = res.candidates[ambigChoice].offsetSec;
    } else { instant = res.candidates[0].epochMs; chosenOffset = res.candidates[0].offsetSec; }
    currentInstantCache = instant;
    const srcW = TE.toZoned(src, instant);
    const utcW = TE.toZoned(TE.UTC, instant);
    const isoSrc = M.isoInstant(instant, src), isoUtc = new Date(instant).toISOString().replace('.000Z', 'Z');
    // Literal-abbreviation sanity check: e.g. PST chosen for a summer date in Los Angeles
    let literalNote = '';
    if (src.kind === 'fixed' && src.abbr && !src.isUTC) {
      const ab = M.D.ABBREVIATIONS.find(a => a.abbr === src.abbr && a.offset * 60 === src.offsetSec);
      if (ab && ab.zones[0] && !ab.zones[0].startsWith('Etc/')) {
        const loc = M.ianaRef(ab.zones[0]);
        const locOff = TE.offsetAt(loc, instant);
        const lr = TE.resolveLocal(loc, wall);
        if (locOff !== src.offsetSec || lr.status !== 'ok' || lr.candidates[0].offsetSec !== src.offsetSec) {
          const locAbbr = TE.zoneAbbrev(loc, instant) || TE.formatOffset(locOff);
          preface += `<div class="note info" style="margin-bottom:12px"><strong>Literal ${esc(src.abbr)} applied (${esc(TE.formatOffset(src.offsetSec))}).</strong> On this date ${esc(M.refShort(loc))} was actually on ${esc(locAbbr)} (${esc(TE.formatOffset(locOff))}). If you meant the local clock time in ${esc(M.refShort(loc))}, <button class="btn btn-sm" data-suggest="${esc(M.serializeRef(loc))}">use ${esc(M.refShort(loc))} instead</button>.</div>`;
        }
      }
    }
    const rows = validDests.map((d, i) => {
      const w = TE.toZoned(d, instant);
      const dayDiff = TE.daysBetween(dr.date, w);
      const offDiff = w.offsetSec - srcW.offsetSec;
      const iso = M.isoInstant(instant, d);
      const plain = `${M.fmtDateTime(w, { seconds: tv.s !== 0 })} ${M.refShort(d)} (${TE.formatOffset(w.offsetSec)})`;
      const steps = [
        `${esc(wallStr)} in ${esc(M.refShort(src))} uses ${esc(TE.formatOffset(srcW.offsetSec))}${src.kind === 'iana' ? ` (the rule in force on that date${TE.dstInfo(src, instant).isDst ? ', daylight saving time' : ''})` : ' (literal fixed offset)'}.`,
        `Subtract the offset to get UTC: ${esc(TE.pad(tv.h))}:${esc(TE.pad(tv.mi))} − (${esc(TE.formatOffset(srcW.offsetSec, { prefix: '' }))}) = <b>${esc(TE.pad(utcW.h))}:${esc(TE.pad(utcW.mi))} UTC</b> on ${esc(TE.formatDateShort(utcW))}.`,
        `${esc(M.refShort(d))} on that instant uses ${esc(TE.formatOffset(w.offsetSec))}${d.kind === 'iana' ? (TE.dstInfo(d, instant).isDst ? ' (daylight saving time)' : TE.dstInfo(d, instant).observesDst ? ' (standard time)' : ' (no DST)') : ' (fixed)'}.`,
        `Add it: ${esc(TE.pad(utcW.h))}:${esc(TE.pad(utcW.mi))} + (${esc(TE.formatOffset(w.offsetSec, { prefix: '' }))}) = <b>${esc(M.fmtTime(w))}</b> on ${esc(TE.formatDateLong(w))}.`
      ];
      return `<div class="card">
        <div class="conv-result-main">
          <div><div class="small muted">${esc(M.refTitle(src))}</div><div class="result-mid">${esc(M.fmtTime(srcW, { seconds: tv.s !== 0 }))}</div><div class="small">${esc(TE.formatDateLong(srcW))}</div></div>
          <div class="conv-arrow" aria-hidden="true">${M.icon('arrowR')}</div>
          <div><div class="small muted">${esc(M.refTitle(d))}</div><div class="result-big">${esc(M.fmtTime(w, { seconds: tv.s !== 0 }))}</div><div class="small">${esc(TE.formatDateLong(w))} ${dayDiff ? `<span class="badge ${dayDiff > 0 ? 'primary' : 'amber'}">${dayDiff > 0 ? '+' : ''}${dayDiff} day${Math.abs(dayDiff) > 1 ? 's' : ''}</span>` : '<span class="badge">same date</span>'}</div></div>
        </div>
        <dl class="kv" style="margin-top:12px">
          <dt>Destination zone</dt><dd>${esc(d.kind === 'iana' ? d.id : M.refTitle(d))} · ${esc(zoneDesc(d, instant))}</dd>
          <dt>Time difference</dt><dd>${offDiff === 0 ? 'Same offset as origin' : `${esc(M.refShort(d))} is ${esc(TE.formatDiffHours(offDiff).replace(/^[+−]/, ''))} ${offDiff > 0 ? 'ahead of' : 'behind'} ${esc(M.refShort(src))} on this date`}</dd>
          <dt>Date changed?</dt><dd>${dayDiff === 0 ? 'No' : `Yes — ${dayDiff > 0 ? 'the next' : 'the previous'} calendar day${Math.abs(dayDiff) > 1 ? ` (${Math.abs(dayDiff)} days)` : ''}`}</dd>
          <dt>ISO 8601</dt><dd class="mono">${esc(iso)}</dd>
        </dl>
        <div class="row tight" style="margin-top:10px"><button class="btn btn-sm" data-copy="${esc(plain)}">${M.icon('copy')} Copy result</button><button class="btn btn-sm" data-copy="${esc(iso)}">${M.icon('copy')} Copy ISO</button></div>
        <details class="explain"><summary>How this was calculated</summary><ol style="margin:0;padding-left:20px">${steps.map(s => `<li>${s}</li>`).join('')}</ol></details>
      </div>`;
    }).join('');
    const allText = [`${wallStr} ${M.refShort(src)} (${TE.formatOffset(srcW.offsetSec)})`, `= ${isoUtc}`, ...validDests.map(d => { const w = TE.toZoned(d, instant); return `= ${M.fmtDateTime(w)} ${M.refShort(d)} (${TE.formatOffset(w.offsetSec)})`; })].join('\n');
    out.innerHTML = `${preface}
      <div class="card highlight">
        <div class="card-head"><h2>Origin</h2><button class="btn btn-sm" data-copy="${esc(allText)}">${M.icon('copy')} Copy all</button></div>
        <dl class="kv">
          <dt>Entered</dt><dd>${esc(wallStr)}</dd>
          <dt>Origin zone</dt><dd>${src.isUTC ? '' : esc(M.refTitle(src)) + (src.kind === 'iana' ? ` <span class="mono small">${esc(src.id)}</span>` : '') + ' · '}${esc(zoneDesc(src, instant))}</dd>
          <dt>UTC instant</dt><dd class="mono">${esc(isoUtc)} <button class="icon-btn sm" data-copy="${esc(isoUtc)}" aria-label="Copy UTC timestamp">${M.icon('copy')}</button></dd>
          <dt>ISO 8601 with offset</dt><dd class="mono">${esc(isoSrc)} <button class="icon-btn sm" data-copy="${esc(isoSrc)}" aria-label="Copy ISO timestamp">${M.icon('copy')}</button></dd>
          <dt>Unix time</dt><dd class="mono">${Math.floor(instant / 1000)} <span class="tiny muted">seconds</span></dd>
        </dl>
      </div>
      <div class="grid ${validDests.length > 1 ? 'cols-2' : ''} section-gap">${rows || '<div class="card empty">Add a destination to see the conversion.</div>'}</div>
      ${validDests.length ? `<div class="card section-gap"><div class="card-head"><h3>Visual comparison</h3><span class="sub">local time of day at this instant</span></div><div class="zone-bars">${zoneBar(src, instant, M.refShort(src))}${validDests.map(d => zoneBar(d, instant, M.refShort(d))).join('')}</div></div>` : ''}
      <details class="explain card section-gap"><summary>PST vs PDT vs “Pacific Time” — what is the difference?</summary>
        <p><b>PST</b> (Pacific Standard Time) always means UTC−08:00. <b>PDT</b> (Pacific Daylight Time) always means UTC−07:00. <b>Pacific Time</b> or a location such as <b>Los Angeles</b> means whichever of the two was in force on that date — determined from the IANA tz database, including historical rule changes (for example, US daylight saving began on the first Sunday in April before 2007 and on the second Sunday in March since). The same distinction applies to EST/EDT, CET/CEST and similar pairs. Abbreviations like CST or IST have several unrelated meanings, so you will be asked to choose.</p>
      </details>`;
    const sig = allText;
    if (sig !== lastSig) { lastSig = sig; M.addRecentDebounced('Convert', `${wallStr} ${M.refShort(src)} → ${validDests.map(M.refShort).join(', ')}`, location.hash); }
  }

  function show(params) {
    if (params.date || params.from || params.to || params.time) {
      if (params.date) { const r = TE.parseISODate(params.date); if (r.ok) dateInput.value = M.dateInputValue(r.date); }
      if (params.time) { const t = TE.parseTime(params.time); if (t.ok) timeField.set(t.time, true); }
      if (params.from) { const r = M.parseRef(params.from); if (r) { srcPicker.set(r, true); if (!params.date) setNow(true); } }
      if (params.to) { const ds = params.to.split('|').map(M.parseRef).filter(Boolean); if (ds.length) { dests = ds; renderDests(); } }
    }
    changed();
  }
  M.register('convert', { init, show });
})();
