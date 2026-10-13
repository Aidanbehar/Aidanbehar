/*
 * Meridian — Weather.
 *
 * Sources (all free, keyless, CORS-enabled, from government met services or built on their models):
 *  - US National Weather Service (api.weather.gov): official US forecasts, hourly forecasts, station observations, active alerts.
 *  - MET Norway (api.met.no): the Norwegian Meteorological Institute's global Locationforecast (ECMWF-based), used worldwide.
 *  - Open-Meteo (open-meteo.com): side-by-side model comparison (ECMWF, NOAA GFS, DWD ICON) and CAMS air quality; geocoding.
 *
 * Online/offline: every successful download is saved in localStorage. The page shows saved data immediately (labelled with
 * its age), refreshes whenever it opens online, every 15 minutes while visible, and as soon as the browser comes back online.
 */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  const REFRESH_MS = 15 * 60000, STALE_MS = 3 * 3600000;
  let root, maps = null, loc = null, bundle = null, loading = false, lastAttempt = 0, reqId = 0;
  const units = () => M.settings.wxUnits || (navigator.language === 'en-US' ? 'us' : 'metric');

  /* ---------- Units ---------- */
  const tC = (c) => c == null || !Number.isFinite(c) ? '—' : units() === 'us' ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`;
  const wind = (ms) => ms == null || !Number.isFinite(ms) ? '—' : units() === 'us' ? `${Math.round(ms * 2.23694)} mph` : `${Math.round(ms * 3.6)} km/h`;
  const precip = (mm) => mm == null ? '—' : units() === 'us' ? `${(mm / 25.4).toFixed(2)} in` : `${mm.toFixed(1)} mm`;
  const f2c = (f) => (f - 32) * 5 / 9;
  const compass = (deg) => deg == null ? '' : ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(TE.mod(deg, 360) / 22.5) % 16];
  /** "5 to 10 mph" → same range in the chosen unit. */
  const nwsWind = (s) => { if (!s) return '—'; if (units() === 'us') return s; return s.replace(/(\d+)/g, (n) => Math.round(+n * 1.60934)).replace('mph', 'km/h'); };

  /* ---------- Weather symbols ---------- */
  function metSymbol(code) {
    if (!code) return ['❔', 'Unknown'];
    const night = /_night/.test(code), c = code.replace(/_(day|night|polartwilight)$/, '');
    const thunder = /thunder/.test(c);
    const map = [
      [/^clearsky$/, night ? '🌙' : '☀️', 'Clear sky'], [/^fair$/, night ? '🌙' : '🌤️', 'Fair'], [/^partlycloudy$/, night ? '☁️' : '⛅', 'Partly cloudy'],
      [/^cloudy$/, '☁️', 'Cloudy'], [/^fog$/, '🌫️', 'Fog'],
      [/sleet/, '🌨️', 'Sleet'], [/snow/, '❄️', 'Snow'], [/heavyrain/, '🌧️', 'Heavy rain'], [/lightrain/, '🌦️', 'Light rain'], [/rain/, '🌧️', 'Rain']
    ];
    for (const [re, ic, label] of map) if (re.test(c)) {
      let l = label;
      if (/showers/.test(c)) l = l.replace(/rain|snow|sleet/i, (w) => w.toLowerCase() + ' showers').replace(/^./, x => x.toUpperCase());
      return [thunder ? '⛈️' : ic, thunder ? `${l} and thunder` : l];
    }
    return ['🌡️', c.replace(/([a-z])(?=[A-Z])/g, '$1 ')];
  }
  const WMO = { 0: ['☀️', 'Clear'], 1: ['🌤️', 'Mainly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'], 45: ['🌫️', 'Fog'], 48: ['🌫️', 'Rime fog'], 51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Dense drizzle'], 56: ['🌨️', 'Freezing drizzle'], 57: ['🌨️', 'Freezing drizzle'], 61: ['🌦️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'], 66: ['🌨️', 'Freezing rain'], 67: ['🌨️', 'Freezing rain'], 71: ['🌨️', 'Light snow'], 73: ['❄️', 'Snow'], 75: ['❄️', 'Heavy snow'], 77: ['❄️', 'Snow grains'], 80: ['🌦️', 'Rain showers'], 81: ['🌧️', 'Rain showers'], 82: ['🌧️', 'Violent showers'], 85: ['🌨️', 'Snow showers'], 86: ['❄️', 'Snow showers'], 95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm, hail'], 99: ['⛈️', 'Thunderstorm, hail'] };
  function nwsEmoji(text) {
    const t = (text || '').toLowerCase();
    if (/thunder/.test(t)) return '⛈️'; if (/snow|flurr|blizzard/.test(t)) return '❄️'; if (/sleet|freezing|ice/.test(t)) return '🌨️';
    if (/shower|drizzle/.test(t)) return '🌦️'; if (/rain/.test(t)) return '🌧️'; if (/fog|haze|smoke/.test(t)) return '🌫️';
    if (/partly|mostly sunny|mostly clear/.test(t)) return '⛅'; if (/cloud|overcast/.test(t)) return '☁️'; if (/sunny|clear/.test(t)) return '☀️';
    if (/wind|breez/.test(t)) return '💨'; return '🌡️';
  }

  /* ---------- Fetching ---------- */
  const NWS_H = { Accept: 'application/geo+json' };
  async function fetchNWS(lat, lon) {
    const pts = await M.fetchJSON(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, { headers: NWS_H });
    const p = pts.properties;
    const [fc, hr, al, st] = await Promise.allSettled([
      M.fetchJSON(p.forecast, { headers: NWS_H }), M.fetchJSON(p.forecastHourly, { headers: NWS_H }),
      M.fetchJSON(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`, { headers: NWS_H }),
      M.fetchJSON(p.observationStations, { headers: NWS_H }).catch(() => new Promise(r => setTimeout(r, 1500)).then(() => M.fetchJSON(p.observationStations, { headers: NWS_H }))) // one retry: NWS has transient errors
    ]);
    let obs = null;
    if (st.status === 'fulfilled') {
      for (const s of (st.value.features || []).slice(0, 4)) {
        try {
          const o = await M.fetchJSON(`https://api.weather.gov/stations/${s.properties.stationIdentifier}/observations/latest`, { headers: NWS_H });
          const q = o.properties;
          if (q && q.temperature && q.temperature.value != null && Date.now() - Date.parse(q.timestamp) < 6 * 3600000) {
            obs = { station: q.stationName || s.properties.name, id: s.properties.stationIdentifier, time: Date.parse(q.timestamp), text: q.textDescription, tempC: q.temperature.value, windKmh: q.windSpeed && q.windSpeed.value, windDir: q.windDirection && q.windDirection.value, rh: q.relativeHumidity && q.relativeHumidity.value, pressurePa: q.barometricPressure && q.barometricPressure.value, visM: q.visibility && q.visibility.value, feelsC: (q.heatIndex && q.heatIndex.value) ?? (q.windChill && q.windChill.value) };
            break;
          }
        } catch (e) { /* try the next station */ }
      }
    }
    const per = (r) => r.status === 'fulfilled' ? r.value.properties.periods.map(x => ({ name: x.name, start: Date.parse(x.startTime), end: Date.parse(x.endTime), day: x.isDaytime, tempC: x.temperatureUnit === 'F' ? f2c(x.temperature) : x.temperature, pop: x.probabilityOfPrecipitation && x.probabilityOfPrecipitation.value, wind: x.windSpeed, windDir: x.windDirection, short: x.shortForecast, detail: x.detailedForecast, rh: x.relativeHumidity && x.relativeHumidity.value })) : null;
    return {
      zone: p.timeZone, place: p.relativeLocation ? `${p.relativeLocation.properties.city}, ${p.relativeLocation.properties.state}` : null, office: p.gridId,
      updated: fc.status === 'fulfilled' ? Date.parse(fc.value.properties.updateTime || fc.value.properties.generatedAt) : null,
      periods: per(fc), hourly: per(hr), obs,
      alerts: al.status === 'fulfilled' ? al.value.features.map(f => ({ event: f.properties.event, headline: f.properties.headline, severity: f.properties.severity, urgency: f.properties.urgency, onset: Date.parse(f.properties.onset || f.properties.effective), ends: Date.parse(f.properties.ends || f.properties.expires), desc: f.properties.description, instruction: f.properties.instruction, sender: f.properties.senderName, area: f.properties.areaDesc })) : null,
      alertsError: al.status === 'rejected' ? al.reason.message : null
    };
  }
  async function fetchMET(lat, lon) {
    const r = await M.fetchJSON(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
    return {
      updated: Date.parse(r.properties.meta.updated_at),
      series: r.properties.timeseries.map(t => {
        const d = t.data.instant.details, n1 = t.data.next_1_hours, n6 = t.data.next_6_hours;
        return { t: Date.parse(t.time), tempC: d.air_temperature, windMs: d.wind_speed, windDir: d.wind_from_direction, rh: d.relative_humidity, cloud: d.cloud_area_fraction, pressure: d.air_pressure_at_sea_level, sym1: n1 && n1.summary.symbol_code, pr1: n1 && n1.details.precipitation_amount, sym6: n6 && n6.summary.symbol_code, pr6: n6 && n6.details.precipitation_amount, sym12: t.data.next_12_hours && t.data.next_12_hours.summary.symbol_code };
      })
    };
  }
  const MODELS = [['ecmwf_ifs025', 'ECMWF IFS', 'European Centre for Medium-Range Weather Forecasts'], ['gfs_seamless', 'NOAA GFS', 'US National Oceanic and Atmospheric Administration'], ['icon_seamless', 'DWD ICON', 'Deutscher Wetterdienst (German weather service)']];
  async function fetchModels(lat, lon) {
    const vars = 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code';
    const r = await M.fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&daily=${vars}&models=${MODELS.map(m => m[0]).join(',')}&timezone=auto&forecast_days=7`);
    const d = r.daily;
    return { zone: r.timezone, days: d.time, models: MODELS.map(([k, label, org]) => ({ k, label, org, max: d[`temperature_2m_max_${k}`] || [], min: d[`temperature_2m_min_${k}`] || [], pr: d[`precipitation_sum_${k}`] || [], code: d[`weather_code_${k}`] || [] })) };
  }
  async function fetchAir(lat, lon) {
    const r = await M.fetchJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=us_aqi,european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=auto`);
    return r.current;
  }

  /* ---------- Cache (offline support) ---------- */
  const key = (l) => `wx.${l.lat.toFixed(2)},${l.lon.toFixed(2)}`;
  const loadCache = (l) => M.store.get(key(l), null);
  function saveCache(l, data) {
    if (!M.store.set(key(l), data)) { // storage full: drop other saved weather and retry
      try { Object.keys(localStorage).filter(k => k.startsWith('meridian.wx.')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
      M.store.set(key(l), data);
    }
  }

  async function refresh(force = false) {
    if (!loc || loading) return;
    if (!navigator.onLine && !force) { render(); return; }
    loading = true; lastAttempt = Date.now();
    const id = ++reqId, l = loc;
    renderStatus('Updating…');
    const prev = bundle || {};
    const next = { ...prev };
    const KEYS = { nws: fetchNWS, met: fetchMET, models: fetchModels, air: fetchAir };
    // Show each source as soon as it arrives instead of waiting for the slowest one.
    const settle = (k) => KEYS[k](l.lat, l.lon).then(
      (data) => ({ data, at: Date.now() }),
      (err) => prev[k] && prev[k].data ? { ...prev[k], stale: true, error: err.message } : { error: err.message, notCovered: k === 'nws' && /404/.test(err.message) }
    ).then((res) => {
      if (id !== reqId) return res;
      next[k] = res; bundle = next;
      if (res.data && res.data.zone && !l.zone) l.zone = res.data.zone;
      render();
      return res;
    });
    const results = await Promise.all(Object.keys(KEYS).map(settle));
    loading = false;
    if (id !== reqId) return;
    if (results.some(r => r.data && !r.stale)) saveCache(l, bundle);
    render();
  }

  /* ---------- Locations ---------- */
  function defaultLoc() {
    const saved = M.store.get('wxLoc', null);
    if (saved && Number.isFinite(saved.lat)) return saved;
    const c = M.D.CITIES.find(x => x.zone === M.localZoneId) || M.D.CITIES[0];
    return { name: `${c.name}, ${c.country}`, lat: c.lat, lon: c.lon, zone: c.zone };
  }
  function setLoc(l) {
    loc = l; M.store.set('wxLoc', l);
    const recent = M.store.get('wxRecent', []).filter(r => r.name !== l.name);
    M.store.set('wxRecent', [l, ...recent].slice(0, 6));
    const c = loadCache(l);
    bundle = c || null;
    loading = false; // a refresh for the previous location is superseded (reqId guards its results)
    render();
    // Load the forecast first; the map grids (many requests to the same servers) start once it has settled,
    // so a slow map download never delays the main forecast.
    refresh().finally(() => mountMaps(l));
  }
  function mountMaps(l) {
    if (loc !== l) return;
    if (!maps && M.wxMaps) maps = M.wxMaps.mount(M.$('#wxMaps', root), { getLoc: () => loc, onPick: (p) => { setLoc({ name: `Map point ${Math.abs(p.lat).toFixed(2)}°${p.lat >= 0 ? 'N' : 'S'}, ${Math.abs(p.lon).toFixed(2)}°${p.lon >= 0 ? 'E' : 'W'}`, lat: p.lat, lon: p.lon, zone: null }); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    else if (maps) maps.setLocation(l);
  }
  const nearestZone = (lat, lon) => {
    let best = null, bd = Infinity;
    for (const c of M.D.CITIES) { const d = (c.lat - lat) ** 2 + ((c.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < bd) { bd = d; best = c; } }
    return best ? best.zone : 'UTC';
  };
  const zoneOf = (l) => ({ kind: 'iana', id: l.zone && TE.isValidIanaZone(l.zone) ? l.zone : nearestZone(l.lat, l.lon) });

  /* ---------- View ---------- */
  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('weather', 'Weather', 'Current conditions, forecasts and alerts from official meteorological services, with a side-by-side comparison of the major global forecast models. Downloads are saved, so the last forecast stays available offline and refreshes automatically whenever you’re connected.')}
      <div class="card">
        <div class="row" style="align-items:flex-end">
          <div class="field zp" style="flex:2 1 300px"><label for="wxQ">Location</label>
            <div class="zp-input-wrap"><input class="input" id="wxQ" type="search" autocomplete="off" placeholder="Search any city or town…" role="combobox" aria-expanded="false" aria-controls="wxList"></div>
            <ul class="dropdown" id="wxList" role="listbox" hidden></ul></div>
          <button class="btn" id="wxGeo" style="flex:0 0 auto">${M.icon('target')} Use my location</button>
          <div class="field" style="flex:0 0 auto"><span class="label">Units</span><div class="seg" role="group" aria-label="Units"><button data-u="metric">°C · km/h</button><button data-u="us">°F · mph</button></div></div>
          <button class="btn" id="wxRefresh" style="flex:0 0 auto">${M.icon('reset')} Refresh</button>
        </div>
        <div class="row tight" id="wxRecent" style="margin-top:10px"></div>
        <div id="wxStatus" class="small" style="margin-top:10px" aria-live="polite"></div>
      </div>
      <div id="wxBody" class="section-gap"></div>
      <div id="wxMaps" class="section-gap"></div>`;
    const q = M.$('#wxQ', el), list = M.$('#wxList', el);
    let items = [], active = 0;
    const show = (html) => { list.innerHTML = html; list.hidden = false; q.setAttribute('aria-expanded', 'true'); };
    const hide = () => { list.hidden = true; q.setAttribute('aria-expanded', 'false'); };
    const renderItems = (note) => {
      show(items.map((it, i) => `<li class="opt" role="option" data-i="${i}" aria-selected="${i === active}"><div style="min-width:0"><div class="t">${esc(it.name)}</div><div class="s">${esc(it.sub)}</div></div></li>`).join('') + (note ? `<li class="msg">${esc(note)}</li>` : ''));
    };
    const search = M.debounce(async (text) => {
      const nq = M.norm(text.trim());
      if (nq.length < 2) { hide(); return; }
      items = M.D.CITIES.filter(c => M.norm(c.name).startsWith(nq) || M.norm(c.country).startsWith(nq)).slice(0, 6).map(c => ({ name: `${c.name}, ${c.country}`, sub: `${c.lat.toFixed(2)}, ${c.lon.toFixed(2)} · built-in`, lat: c.lat, lon: c.lon, zone: c.zone }));
      active = 0; renderItems(navigator.onLine ? 'Searching worldwide…' : 'Offline — showing built-in cities only.');
      if (!navigator.onLine) return;
      try {
        const r = await M.fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text.trim())}&count=8&language=en&format=json`);
        if (M.norm(q.value.trim()) !== nq) return;
        const extra = (r.results || []).map(g => ({ name: [g.name, g.admin1, g.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', '), sub: `${g.latitude.toFixed(2)}, ${g.longitude.toFixed(2)}${g.population ? ' · pop. ' + TE.formatNumber(g.population) : ''}`, lat: g.latitude, lon: g.longitude, zone: g.timezone }));
        const seen = new Set(items.map(i => i.name));
        items = items.concat(extra.filter(e => !seen.has(e.name))).slice(0, 12);
        renderItems(items.length ? '' : 'No places found.');
      } catch (e) { renderItems(`Worldwide search unavailable (${e.message}). Built-in cities shown.`); }
    }, 250);
    q.addEventListener('input', () => search(q.value));
    q.addEventListener('keydown', (e) => {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); renderItems(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); renderItems(); }
      else if (e.key === 'Enter' && items[active]) { e.preventDefault(); choose(items[active]); }
      else if (e.key === 'Escape') hide();
    });
    q.addEventListener('blur', () => setTimeout(hide, 150));
    list.addEventListener('mousedown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (o) choose(items[+o.dataset.i]); });
    function choose(it) { hide(); q.value = ''; setLoc({ name: it.name, lat: it.lat, lon: it.lon, zone: it.zone || null }); }
    M.$('#wxGeo', el).addEventListener('click', () => {
      if (!navigator.geolocation) { M.toast('Location is not available in this browser.'); return; }
      M.toast('Requesting your location…');
      navigator.geolocation.getCurrentPosition(
        (p) => setLoc({ name: `My location (${p.coords.latitude.toFixed(2)}, ${p.coords.longitude.toFixed(2)})`, lat: p.coords.latitude, lon: p.coords.longitude, zone: M.localZoneId }),
        (err) => M.toast(err.code === 1 ? 'Location permission was denied.' : 'Could not determine your location.'), { timeout: 15000, maximumAge: 600000 });
    });
    M.$('#wxRefresh', el).addEventListener('click', () => refresh(true));
    el.querySelector('.seg').addEventListener('click', (e) => { const b = e.target.closest('[data-u]'); if (b) { M.setSetting('wxUnits', b.dataset.u); render(); } });
    M.$('#wxRecent', el).addEventListener('click', (e) => { const b = e.target.closest('[data-loc]'); if (b) setLoc(JSON.parse(b.dataset.loc)); });
    M.$('#wxBody', el).addEventListener('click', (e) => { const r = e.target.closest('[data-retry]'); if (r) refresh(true); });
    window.addEventListener('online', () => { renderStatus(); if (!root.hidden) refresh(); });
    window.addEventListener('offline', () => renderStatus());
    M.onSettings((k) => { if (!root.hidden && (k === 'hour12' || k === 'wxUnits' || k === 'dateFormat')) render(); });
  }

  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min ago` : `${Math.floor(m / 1440)} days ago`; };
  function renderStatus(msg) {
    const box = M.$('#wxStatus', root);
    if (!box) return;
    const online = navigator.onLine;
    const at = bundle ? Math.max(...['nws', 'met', 'models', 'air'].map(k => (bundle[k] && bundle[k].at) || 0)) : 0;
    const stale = at && Date.now() - at > STALE_MS;
    box.innerHTML = `<span class="badge ${online ? 'success' : 'amber'}">${online ? '● Online' : '● Offline'}</span> ${msg ? esc(msg) : at ? `Last updated ${esc(ago(at))} (${esc(new Date(at).toLocaleString())}).` : 'No saved data for this location yet.'} ${stale ? `<span class="badge amber">Saved data is over 3 hours old</span>` : ''} ${!online ? 'Showing saved data; it will refresh automatically when you reconnect.' : `Auto-refreshes every 15 minutes.`}`;
    M.$$('.seg [data-u]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.u === units())));
    const recent = M.store.get('wxRecent', []);
    M.$('#wxRecent', root).innerHTML = recent.length > 1 ? `<span class="small muted">Recent:</span>` + recent.map(r => `<button class="btn btn-sm ${loc && r.name === loc.name ? 'btn-primary' : ''}" data-loc="${esc(JSON.stringify(r))}">${esc(r.name.split(',')[0])}</button>`).join('') : '';
  }

  function srcBadge(s, label) {
    if (!s) return '';
    if (s.data && !s.stale) return `<span class="badge success" title="Loaded ${esc(ago(s.at))}">✓ ${label}</span>`;
    if (s.data && s.stale) return `<span class="badge amber" title="${esc(s.error || '')}">Saved · ${label} (${esc(ago(s.at))})</span>`;
    if (s.notCovered) return `<span class="badge" title="The NWS covers US locations only">${label}: n/a outside US</span>`;
    return `<span class="badge danger" title="${esc(s.error || '')}">✗ ${label} unavailable</span>`;
  }

  function render() {
    renderStatus(loading ? 'Updating…' : null);
    const body = M.$('#wxBody', root);
    if (!loc) return;
    const z = zoneOf(loc);
    const now = Date.now();
    if (!bundle) {
      body.innerHTML = navigator.onLine ? `<div class="card"><div class="skeleton"></div><div class="skeleton" style="width:70%"></div><div class="skeleton" style="width:85%"></div></div>`
        : `<div class="card empty">${M.icon('globe')}<div>You’re offline and there’s no saved weather for ${esc(loc.name)} yet.</div><div class="small">It will load automatically as soon as you’re back online.</div></div>`;
      return;
    }
    const nws = bundle.nws && bundle.nws.data, met = bundle.met && bundle.met.data, models = bundle.models && bundle.models.data, air = bundle.air && bundle.air.data;
    const fmtT = (t) => M.fmtTime(TE.toZoned(z, t));
    const dayLabel = (t) => { const w = TE.toZoned(z, t); const d = TE.daysBetween(TE.toZoned(z, now), w); return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${TE.WEEKDAYS_SHORT[w.weekday]} ${TE.MONTHS_SHORT[w.m - 1]} ${w.d}`; };
    const nowLocal = TE.toZoned(z, now);
    let html = `<div class="card highlight"><div class="card-head"><div style="flex:1;min-width:0"><h2>${esc(loc.name)}</h2><div class="small muted">${loc.lat.toFixed(3)}°, ${loc.lon.toFixed(3)}° · local time ${esc(M.fmtTime(nowLocal))} ${esc(TE.WEEKDAYS_SHORT[nowLocal.weekday])} (${esc(z.id)}${loc.zone ? '' : ', nearest listed city'})</div></div>
      <div class="row tight">${srcBadge(bundle.nws, 'NWS')}${srcBadge(bundle.met, 'MET Norway')}${srcBadge(bundle.models, 'Model comparison')}${srcBadge(bundle.air, 'Air quality')}</div></div>`;

    // Current conditions: measured (NWS station) if available, otherwise MET Norway's forecast for the current hour.
    const curMet = met ? met.series.filter(s => s.t <= now + 1800000).pop() || met.series[0] : null;
    if (nws && nws.obs) {
      const o = nws.obs;
      html += `<div class="row" style="align-items:center;gap:22px"><div style="font-size:3.2rem;line-height:1">${nwsEmoji(o.text)}</div><div><div class="result-big">${esc(tC(o.tempC))}</div><div>${esc(o.text || '')}${o.feelsC != null ? ` · feels like ${esc(tC(o.feelsC))}` : ''}</div></div>
        <dl class="kv" style="flex:1;min-width:220px"><dt>Wind</dt><dd>${o.windKmh != null ? esc(wind(o.windKmh / 3.6)) : '—'} ${esc(compass(o.windDir))}</dd><dt>Humidity</dt><dd>${o.rh != null ? Math.round(o.rh) + '%' : '—'}</dd><dt>Pressure</dt><dd>${o.pressurePa ? Math.round(o.pressurePa / 100) + ' hPa' : '—'}</dd></dl></div>
        <p class="tiny muted" style="margin:8px 0 0">Measured at <b>${esc(o.station)}</b> (${esc(o.id)}) at ${esc(fmtT(o.time))} local, ${esc(ago(o.time))} — US National Weather Service observation.</p>`;
    } else if (curMet) {
      const [ic, label] = metSymbol(curMet.sym1 || curMet.sym6);
      html += `<div class="row" style="align-items:center;gap:22px"><div style="font-size:3.2rem;line-height:1">${ic}</div><div><div class="result-big">${esc(tC(curMet.tempC))}</div><div>${esc(label)}</div></div>
        <dl class="kv" style="flex:1;min-width:220px"><dt>Wind</dt><dd>${esc(wind(curMet.windMs))} ${esc(compass(curMet.windDir))}</dd><dt>Humidity</dt><dd>${curMet.rh != null ? Math.round(curMet.rh) + '%' : '—'}</dd><dt>Cloud cover</dt><dd>${curMet.cloud != null ? Math.round(curMet.cloud) + '%' : '—'}</dd><dt>Pressure</dt><dd>${curMet.pressure ? Math.round(curMet.pressure) + ' hPa' : '—'}</dd></dl></div>
        <p class="tiny muted" style="margin:8px 0 0">Forecast conditions for ${esc(fmtT(curMet.t))} local from MET Norway (not a direct measurement).</p>`;
    } else html += `<div class="note warn">Current conditions are unavailable right now.</div>`;
    html += `</div>`;

    // Alerts (NWS, US only)
    if (nws && nws.alerts) {
      const act = nws.alerts.filter(a => !a.ends || a.ends > now);
      html += act.length ? `<div class="card section-gap" style="border-color:var(--danger)"><h2 style="margin-bottom:8px">⚠️ Active alerts (${act.length})</h2>${act.map(a => `<details class="note ${/Extreme|Severe/.test(a.severity) ? 'error' : 'warn'}" style="margin-bottom:8px"><summary><b>${esc(a.event)}</b> — ${esc(a.severity || '')}${a.ends ? ` · until ${esc(M.fmtDateTime(TE.toZoned(z, a.ends)))}` : ''}</summary><p class="small"><b>${esc(a.headline || '')}</b></p><p class="small" style="white-space:pre-line">${esc(a.desc || '')}</p>${a.instruction ? `<p class="small" style="white-space:pre-line"><b>What to do:</b> ${esc(a.instruction)}</p>` : ''}<p class="tiny muted">Issued by ${esc(a.sender || 'NWS')} · ${esc(a.area || '')}</p></details>`).join('')}</div>`
        : `<div class="note success section-gap">No active NWS watches, warnings or advisories for this point.</div>`;
    } else if (bundle.nws && bundle.nws.notCovered) {
      html += `<div class="note section-gap small">Official severe-weather warnings for this location are issued by its national weather service. Meteoalarm (meteoalarm.org) covers Europe; for other regions check the national service directly. Always follow official warnings.</div>`;
    }

    // Hourly: NWS hourly in the US, otherwise MET Norway
    const hourly = (nws && nws.hourly ? nws.hourly.filter(h => h.end > now).slice(0, 24).map(h => ({ t: h.start, ic: nwsEmoji(h.short), tempC: h.tempC, pop: h.pop, extra: nwsWind(h.wind) })) : met ? met.series.filter(s => s.t >= now - 3600000 && s.sym1).slice(0, 24).map(s => ({ t: s.t, ic: metSymbol(s.sym1)[0], tempC: s.tempC, mm: s.pr1, extra: wind(s.windMs) })) : []);
    if (hourly.length) {
      const temps = hourly.map(h => h.tempC), lo = Math.min(...temps), hi = Math.max(...temps);
      html += `<div class="card section-gap"><div class="card-head"><h2>Next 24 hours</h2><span class="sub">${nws && nws.hourly ? 'NWS hourly forecast' : 'MET Norway'} · times in ${esc(z.id)}</span></div><div class="wx-hours">${hourly.map(h => `<div class="wx-hour"><div class="tiny muted">${esc(fmtT(h.t))}</div><div style="font-size:1.4rem">${h.ic}</div><div class="strong">${esc(tC(h.tempC))}</div><div class="wx-bar" style="height:${hi > lo ? 6 + 34 * (h.tempC - lo) / (hi - lo) : 20}px"></div><div class="tiny" style="color:var(--primary)">${h.pop != null ? (h.pop ? h.pop + '% 💧' : '') : h.mm ? esc(precip(h.mm)) : ''}</div><div class="tiny muted">${esc(h.extra)}</div></div>`).join('')}</div></div>`;
    }

    // Daily forecast
    if (nws && nws.periods) {
      html += `<div class="card section-gap"><div class="card-head"><h2>7-day forecast</h2><span class="sub">US National Weather Service, ${esc(nws.office || '')} office${nws.updated ? ` · issued ${esc(ago(nws.updated))}` : ''}</span></div><div class="table-wrap"><table class="table"><tbody>${nws.periods.filter(p => p.end > now).map(p => `<tr><td class="nowrap"><b>${esc(p.name)}</b></td><td style="font-size:1.3rem">${nwsEmoji(p.short)}</td><td class="num"><b>${esc(tC(p.tempC))}</b> <span class="tiny muted">${p.day ? 'high' : 'low'}</span></td><td><div>${esc(p.short)}</div><div class="tiny muted">${esc(units() === 'us' ? p.detail : p.detail.replace(/(-?\d+)( ?(?:degrees|°))/g, (m, n) => `${Math.round(f2c(+n))}°C`).replace(/(\d+) to (\d+) mph|(\d+) mph/g, (m) => nwsWind(m)))}</div></td><td class="num small">${p.pop ? p.pop + '% 💧' : ''}</td></tr>`).join('')}</tbody></table></div></div>`;
    }
    let metDays = [];
    if (met) {
      const byDay = new Map();
      for (const s of met.series) { const w = TE.toZoned(z, s.t); const k = TE.isoDate(w); if (!byDay.has(k)) byDay.set(k, { date: w, temps: [], mm: 0, syms: [] }); const d = byDay.get(k); d.temps.push(s.tempC); d.mm += (s.pr1 != null ? s.pr1 : 0); if (s.sym1 == null && s.pr6 != null && w.h % 6 === 0) d.mm += s.pr6; d.syms.push({ h: w.h, s: s.sym6 || s.sym1 }); }
      metDays = [...byDay.values()].filter(d => TE.compareDates(d.date, nowLocal) >= 0 && d.temps.length >= 3).slice(0, 9).map(d => ({ ...d, max: Math.max(...d.temps), min: Math.min(...d.temps), sym: (d.syms.find(x => x.h >= 11 && x.s) || d.syms.find(x => x.s) || {}).s }));
      if (!nws || !nws.periods) {
        html += `<div class="card section-gap"><div class="card-head"><h2>${metDays.length}-day forecast</h2><span class="sub">MET Norway Locationforecast · updated ${esc(ago(met.updated))}</span></div><div class="table-wrap"><table class="table"><tbody>${metDays.map(d => { const [ic, label] = metSymbol(d.sym); return `<tr><td class="nowrap"><b>${esc(dayLabel(TE.wallToMs({ ...d.date, h: 12 }) - d.date.offsetSec * 1000))}</b></td><td style="font-size:1.3rem">${ic}</td><td>${esc(label)}</td><td class="num"><b>${esc(tC(d.max))}</b> / <span class="muted">${esc(tC(d.min))}</span></td><td class="num small">${d.mm >= 0.1 ? esc(precip(d.mm)) + ' 💧' : ''}</td></tr>`; }).join('')}</tbody></table></div><p class="tiny muted">Daily high/low from the forecast's time steps in local time; later days use 6-hour steps, so extremes may be slightly smoothed.</p></div>`;
      }
    }

    // Model comparison
    if (models) {
      const todayIso = TE.isoDate(nowLocal);
      const rows = models.days.map((d, i) => {
        if (d < todayIso) return ''; // skip days already over at the location
        const vals = models.models.map(m => m.max[i]).filter(v => v != null);
        const spread = vals.length > 1 ? Math.max(...vals) - Math.min(...vals) : null;
        const metD = metDays.find(x => TE.isoDate(x.date) === d);
        const conf = spread == null ? '' : spread <= 2 ? '<span class="badge success">High agreement</span>' : spread <= 5 ? '<span class="badge amber">Some disagreement</span>' : '<span class="badge danger">Low agreement</span>';
        const dt = TE.parseISODate(d).date;
        return `<tr><td class="nowrap"><b>${esc(TE.WEEKDAYS_SHORT[TE.weekday(dt.y, dt.m, dt.d)])} ${esc(TE.MONTHS_SHORT[dt.m - 1])} ${dt.d}</b></td>${models.models.map(m => `<td class="num">${m.max[i] != null ? `${(WMO[m.code[i]] || ['', ''])[0]} <b>${esc(tC(m.max[i]))}</b> / <span class="muted">${esc(tC(m.min[i]))}</span><div class="tiny muted">${m.pr[i] ? esc(precip(m.pr[i])) : ''}</div>` : '—'}</td>`).join('')}<td class="num">${metD ? `<b>${esc(tC(metD.max))}</b> / <span class="muted">${esc(tC(metD.min))}</span>` : '—'}</td><td>${conf}${spread != null ? `<div class="tiny muted">highs differ by ${units() === 'us' ? Math.round(spread * 9 / 5) + '°F' : Math.round(spread) + '°C'}</div>` : ''}</td></tr>`;
      }).join('');
      html += `<div class="card section-gap"><div class="card-head"><h2>Model comparison</h2><span class="sub">daily high / low · precipitation</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Day</th>${models.models.map(m => `<th class="num" title="${esc(m.org)}">${esc(m.label)}</th>`).join('')}<th class="num">MET Norway</th><th>Agreement</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="tiny muted" style="margin-top:8px">Raw output of three leading global models via Open-Meteo, next to MET Norway's forecast. When independent models agree, the forecast is more reliable; a wide spread means more uncertainty. Agreement is judged from the spread of the models' daily highs (≤2°C high, ≤5°C some, more = low).</p></div>`;
    } else if (bundle.models && bundle.models.error) {
      html += `<div class="note section-gap small">Model comparison is unavailable right now (${esc(bundle.models.error)}). <button class="btn btn-sm" data-retry>Retry</button></div>`;
    }

    // Air quality
    if (air) {
      const aqi = air.us_aqi;
      const cat = aqi == null ? ['—', ''] : aqi <= 50 ? ['Good', 'success'] : aqi <= 100 ? ['Moderate', 'amber'] : aqi <= 150 ? ['Unhealthy for sensitive groups', 'amber'] : aqi <= 200 ? ['Unhealthy', 'danger'] : aqi <= 300 ? ['Very unhealthy', 'danger'] : ['Hazardous', 'danger'];
      html += `<div class="card section-gap"><div class="card-head"><h2>Air quality</h2><span class="sub">Copernicus Atmosphere Monitoring Service (CAMS) model via Open-Meteo</span></div>
        <div class="grid auto-sm"><div class="stat"><div class="k">US AQI</div><div class="v">${aqi ?? '—'}</div><div class="d"><span class="badge ${cat[1]}">${esc(cat[0])}</span></div></div><div class="stat"><div class="k">European AQI</div><div class="v">${air.european_aqi ?? '—'}</div></div><div class="stat"><div class="k">PM2.5</div><div class="v">${air.pm2_5 != null ? Math.round(air.pm2_5) : '—'} <span class="small muted">µg/m³</span></div></div><div class="stat"><div class="k">PM10</div><div class="v">${air.pm10 != null ? Math.round(air.pm10) : '—'} <span class="small muted">µg/m³</span></div></div><div class="stat"><div class="k">Ozone</div><div class="v">${air.ozone != null ? Math.round(air.ozone) : '—'} <span class="small muted">µg/m³</span></div></div></div>
        <p class="tiny muted" style="margin-top:8px">Modelled values for ${esc(air.time ? air.time.replace('T', ' ') : 'now')} local; local monitoring stations can differ.</p></div>`;
    }

    // Sources
    html += `<div class="card section-gap"><h2 style="margin-bottom:8px">Sources</h2><ul class="small" style="margin:0;padding-left:18px">
      <li><b>US National Weather Service</b> (NOAA, US government) — official forecasts, station observations and alerts for US locations. <a href="https://www.weather.gov" target="_blank" rel="noopener">weather.gov</a>${nws ? ` · <a href="https://forecast.weather.gov/MapClick.php?lat=${loc.lat.toFixed(4)}&lon=${loc.lon.toFixed(4)}" target="_blank" rel="noopener">this location on weather.gov ↗</a>` : ''}</li>
      <li><b>MET Norway</b> (Norwegian Meteorological Institute, government agency) — global Locationforecast built on ECMWF data. Licensed CC BY 4.0. <a href="https://www.yr.no/en" target="_blank" rel="noopener">yr.no</a> · <a href="https://api.met.no" target="_blank" rel="noopener">api.met.no</a></li>
      <li><b>Open-Meteo</b> — open-source access to national weather-service models (ECMWF, NOAA GFS, DWD ICON) and Copernicus CAMS air quality; also place search. CC BY 4.0. <a href="https://open-meteo.com" target="_blank" rel="noopener">open-meteo.com</a></li>
    </ul><p class="tiny muted" style="margin-top:8px">Forecasts are predictions and can change. For safety decisions, follow warnings from your national weather service.</p></div>`;
    body.innerHTML = html;
  }

  function show(params) {
    if (params.lat && params.lon && Number.isFinite(+params.lat) && Number.isFinite(+params.lon)) {
      setLoc({ name: params.name || `${(+params.lat).toFixed(2)}, ${(+params.lon).toFixed(2)}`, lat: +params.lat, lon: +params.lon, zone: params.zone || null });
      history.replaceState(null, '', '#/weather');
      return;
    }
    if (!loc) setLoc(defaultLoc());
    else if (Date.now() - lastAttempt > 60000) { render(); refresh(); } else render();
  }
  function tick(now) {
    if (maps) maps.tick(now);
    if (loc && !loading && navigator.onLine && now - lastAttempt > REFRESH_MS) refresh();
    if (now % 60000 < 1000) renderStatus(loading ? 'Updating…' : null);
  }
  M.register('weather', { init, show, tick });
})();
