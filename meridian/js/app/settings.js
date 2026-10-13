/* Meridian — Settings, favorites, recent calculations, self-tests and about */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  let root;

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('settings', 'Settings & About', 'Preferences are stored only in this browser (localStorage). Nothing is sent anywhere.')}
      <div class="grid cols-2">
        <div class="card"><h2 style="margin-bottom:12px">Preferences</h2><div class="stack">
          <div class="field"><label for="stTheme">Theme</label><select class="select" id="stTheme"><option value="system">Match system</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
          <div class="field"><label for="stHour">Time format</label><select class="select" id="stHour"><option value="false">24-hour (13:45)</option><option value="true">12-hour (1:45 PM)</option></select></div>
          <div class="field"><label for="stDate">Date format</label><select class="select" id="stDate"><option value="long">Tuesday, October 13, 2026</option><option value="iso">2026-10-13 (ISO 8601)</option><option value="mdy">10/13/2026 (US)</option><option value="dmy">13/10/2026 (day first)</option></select></div>
          <div class="field"><label for="stWeek">Week-number convention</label><select class="select" id="stWeek">${Object.entries(TE.WEEK_CONVENTIONS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label for="stHol">Default holiday calendar</label><select class="select" id="stHol">${Object.entries(TE.HOLIDAY_COUNTRIES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label for="stHemi">Hemisphere for seasons</label><select class="select" id="stHemi"><option value="auto">Automatic (from location)</option><option value="north">Northern</option><option value="south">Southern</option></select></div>
          <label class="check"><input type="checkbox" id="stSec"> Show seconds on world clocks</label>
          <label class="check"><input type="checkbox" id="stRecent"> Keep a list of recent calculations (this browser only)</label>
          <div class="small muted">Detected time zone: <b class="mono">${esc(M.localZoneId)}</b> · Locale: ${esc(navigator.language || 'unknown')}</div>
        </div></div>
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Recent calculations</h2><button class="btn btn-sm btn-danger" id="stClearRecent">Clear</button></div><ul class="recent-list" id="stRecentList"></ul></div>
          <div class="card"><div class="card-head"><h2>Favorites</h2></div><div id="stFav" class="small"></div><p class="tiny muted">Use the ☆ button in any tool’s header to add it to the sidebar.</p></div>
          <div class="card"><div class="card-head"><h2>Data</h2></div><p class="small">Clears saved settings, world-clock cities, countdowns, favorites, recent calculations and cached history/holiday data.</p><button class="btn btn-sm btn-danger" id="stReset">Reset all local data</button></div>
        </div>
      </div>
      <div class="card section-gap"><div class="card-head"><h2>Self-tests</h2><button class="btn btn-sm btn-primary" id="stRun">Run engine tests</button></div>
        <p class="small muted">Runs the built-in test suite for leap years, weekdays, time-zone conversions (including historical DST rules, gaps and overlaps), elapsed time, date arithmetic, Easter, Friday the 13th, Unix/ISO parsing and astronomy against your browser’s time-zone data. Also available as <span class="mono">tests/index.html</span> and <span class="mono">node tests/run-node.js</span>.</p>
        <div id="stTests" class="test-results"></div></div>
      <div class="card section-gap"><h2 style="margin-bottom:8px">About Meridian</h2>
        <div class="grid cols-2 small">
          <div>
            <h3 style="margin-bottom:6px">How times are computed</h3>
            <ul style="padding-left:18px;margin:0">
              <li>Time-zone rules come from the IANA tz database built into your browser (via <span class="mono">Intl.DateTimeFormat</span>). Offsets are looked up for the exact instant, so historical rules apply automatically. No UTC offsets are hardcoded. Your browser version determines the tz data release (currently reporting ${M.ALL_ZONES.length} zones).</li>
              <li>Calendar arithmetic uses integer day numbers in the proleptic Gregorian calendar — never locale string parsing or your computer’s own time zone.</li>
              <li>Local times that fall in a DST gap or overlap are detected and you are asked how to interpret them.</li>
              <li>Literal abbreviations (PST, CET…) are fixed offsets; locations and IANA zones follow their local rules.</li>
            </ul>
            <h3 style="margin:12px 0 6px">Known limitations</h3>
            <ul style="padding-left:18px;margin:0">
              <li>Time-zone data before 1970 is less complete; very old instants use local mean time.</li>
              <li>The map’s polygons are Natural Earth’s nominal time-zone regions (c. 2012); legal changes since then may not be drawn, though all times shown use current IANA rules.</li>
              <li>Astronomical results (moon phases, equinoxes, sunrise) are calculated, typically to within a minute or two, and labelled approximate.</li>
              <li>Built-in holiday rules cover six countries’ national holidays plus major observances; lunar-calendar holidays require the online source.</li>
              <li>Leap seconds are not represented (as in Unix time and civil time zones).</li>
            </ul>
          </div>
          <div>
            <h3 style="margin-bottom:6px">Data sources & credits</h3>
            <ul style="padding-left:18px;margin:0">
              <li>IANA Time Zone Database — via the browser’s <span class="mono">Intl</span> API.</li>
              <li>Historical events — <a href="https://api.wikimedia.org/wiki/Feed_API/Reference/On_this_day" target="_blank" rel="noopener">Wikipedia “On this day” (Wikimedia REST API)</a>, CC BY-SA. A small bundled offline set is used only if it can’t be reached.</li>
              <li>Additional public holidays — <a href="https://date.nager.at" target="_blank" rel="noopener">Nager.Date</a> (optional, online).</li>
              <li>Map — <a href="https://www.naturalearthdata.com" target="_blank" rel="noopener">Natural Earth</a> time zones & countries (public domain), <a href="https://github.com/topojson/world-atlas" target="_blank" rel="noopener">world-atlas</a>; rendered with <a href="https://d3js.org" target="_blank" rel="noopener">d3</a> (ISC) and topojson-client (ISC).</li>
              <li>Algorithms — Howard Hinnant (civil dates), Meeus “Astronomical Algorithms” (Easter, seasons, moon phases), NOAA solar calculator (sunrise/sunset), Espenak & Meeus (ΔT).</li>
            </ul>
            <h3 style="margin:12px 0 6px">Keyboard</h3>
            <ul style="padding-left:18px;margin:0"><li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> or <kbd>/</kbd> — search tools, places and dates</li><li><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd> — navigate lists and pickers</li><li>Arrow keys — move the selected day in the calendar</li><li><kbd>Alt</kbd> + <kbd>←</kbd>/<kbd>→</kbd> — previous/next day in This Day in History</li></ul>
            <h3 style="margin:12px 0 6px">Print</h3>
            <p style="margin:0">Any page can be printed; navigation and controls are hidden in print. <button class="btn btn-sm" onclick="window.print()">${M.icon('print')} Print this page</button></p>
          </div>
        </div>
      </div>`;
    const S = M.settings;
    const bind = (id, key, conv = (v) => v, val = (v) => String(v)) => { const e = M.$('#' + id, el); e.value = val(S[key]); e.addEventListener('change', () => M.setSetting(key, conv(e.value))); };
    bind('stTheme', 'theme'); bind('stHour', 'hour12', v => v === 'true'); bind('stDate', 'dateFormat'); bind('stWeek', 'weekConvention'); bind('stHol', 'holidayCountry'); bind('stHemi', 'hemisphere');
    const sec = M.$('#stSec', el); sec.checked = S.showSeconds; sec.addEventListener('change', () => M.setSetting('showSeconds', sec.checked));
    const rc = M.$('#stRecent', el); rc.checked = S.saveRecent; rc.addEventListener('change', () => { M.setSetting('saveRecent', rc.checked); if (!rc.checked) { M.clearRecent(); renderRecent(); } });
    M.$('#stClearRecent', el).addEventListener('click', () => { M.clearRecent(); renderRecent(); M.toast('Recent calculations cleared'); });
    M.$('#stReset', el).addEventListener('click', () => {
      if (!confirm('Reset all Meridian data stored in this browser?')) return;
      try { Object.keys(localStorage).filter(k => k.startsWith('meridian.')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
      location.hash = '#/home'; location.reload();
    });
    M.$('#stRun', el).addEventListener('click', runTests);
    M.$('#stFav', el).addEventListener('click', (e) => { const b = e.target.closest('[data-unfav]'); if (b) { M.toggleFavorite(b.dataset.unfav); renderFav(); } });
    M.onSettings((k) => { if (k === 'hour12') M.$('#stHour', el).value = String(M.settings.hour12); if (k === 'theme') M.$('#stTheme', el).value = M.settings.theme; if (k === 'dateFormat') M.$('#stDate', el).value = M.settings.dateFormat; });
  }
  function renderRecent() {
    const items = M.recent;
    M.$('#stRecentList', root).innerHTML = items.length ? items.map(r => `<li><span class="badge">${esc(r.tool)}</span><a href="${esc(r.href || '#')}">${esc(r.summary)}</a><span class="when">${esc(new Date(r.at).toLocaleString())}</span></li>`).join('') : `<li class="muted">${M.settings.saveRecent ? 'Nothing yet.' : 'Recording is turned off.'}</li>`;
  }
  function renderFav() {
    M.$('#stFav', root).innerHTML = M.favorites.length ? M.favorites.map(f => `<span class="badge primary" style="margin:2px">${esc(M.VIEW_TITLES[f] || f)} <button class="icon-btn sm" style="width:18px;height:18px;border:0;background:none" data-unfav="${esc(f)}" aria-label="Remove ${esc(M.VIEW_TITLES[f] || f)} from favorites">${M.icon('x')}</button></span>`).join('') : '<span class="muted">No favorites yet.</span>';
  }
  async function runTests() {
    const box = M.$('#stTests', root);
    box.innerHTML = '<div class="skeleton"></div>';
    try {
      await M.loadScript('tests/tests.js');
      const results = window.MeridianTests(TE);
      const failed = results.filter(r => !r.pass);
      let group = '';
      box.innerHTML = `<div class="note ${failed.length ? 'error' : 'success'}" style="margin-bottom:10px"><strong>${results.length - failed.length} / ${results.length} tests passed</strong>${failed.length ? ' — failures may indicate outdated time-zone data in this browser.' : '.'}</div>` +
        results.map(r => { const h = r.group !== group ? `<div class="strong" style="margin-top:8px">${esc((group = r.group))}</div>` : ''; return `${h}<div class="${r.pass ? 'pass' : 'fail'}">${r.pass ? '✓' : '✗'} ${esc(r.name)}${r.pass ? '' : ` — ${esc(r.error)}`}</div>`; }).join('');
    } catch (e) { box.innerHTML = `<div class="note error">Could not run tests: ${esc(e.message)}</div>`; }
  }
  M.register('settings', { init, show: () => { renderRecent(); renderFav(); } });
})();
