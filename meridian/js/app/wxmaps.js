/*
 * Meridian — interactive weather maps: temperature, precipitation, wind and air quality.
 *
 * Data: Open-Meteo bulk point forecasts ("best match" of national weather-service models such as ECMWF, NOAA GFS and
 * DWD ICON) and Open-Meteo air quality (Copernicus CAMS), requested on a regular lat/lon grid (world, or around the
 * selected location). The grid is rendered as a smooth raster (bicubic, overshoot-limited) in an equirectangular
 * projection, with borders, labelled isotherms, city values, wind arrows/particles and the selected location on top.
 *
 * Robustness: chunked requests with retries and backoff, per-chunk failure tolerance (missing areas drawn hatched),
 * provider error reasons surfaced, wind interpolated as u/v vectors (never as raw angles), antimeridian-safe regional
 * grids, compact Int16 storage for offline use, and every draw guarded so a bad frame can't break the page.
 */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  const W = 960, STALE_MS = 45 * 60000, HOURS = 48;
  const units = () => M.settings.wxUnits || (navigator.language === 'en-US' ? 'us' : 'metric');

  /* ---------- Colour scales (value in metric units) ---------- */
  const SCALES = {
    temp: { label: 'Temperature', stops: [[-40, '#3b0a5c'], [-30, '#4a2fa8'], [-20, '#2457d6'], [-10, '#3d93e8'], [0, '#86d3f2'], [5, '#b9ecd6'], [10, '#e6f5a0'], [15, '#fde68a'], [20, '#fdbb4d'], [25, '#f9802f'], [30, '#e5461f'], [35, '#b3151f'], [45, '#5e0614']] },
    precip: { label: 'Precipitation', stops: [[0.1, '#b4e2f7'], [0.5, '#62b6f0'], [1, '#2f80e8'], [2.5, '#1d4fc3'], [5, '#6a30cf'], [10, '#b42bc9'], [20, '#e3329a'], [50, '#ff7043']], min: 0.1 },
    wind: { label: 'Wind speed', stops: [[0, '#e8f1fb'], [10, '#a5d7f3'], [20, '#72d29a'], [35, '#f2dc55'], [50, '#f5a04b'], [70, '#e65d4a'], [90, '#b8336a'], [120, '#6b1e7a']] },
    aqi: { label: 'Air quality (US AQI)', steps: [[0, 50, '#00e400', 'Good'], [51, 100, '#ffff00', 'Moderate'], [101, 150, '#ff7e00', 'Unhealthy for sensitive groups'], [151, 200, '#ff0000', 'Unhealthy'], [201, 300, '#8f3f97', 'Very unhealthy'], [301, 500, '#7e0023', 'Hazardous']] }
  };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (const s of Object.values(SCALES)) if (s.stops) s.rgb = s.stops.map(([v, c]) => [v, hex(c)]);
  SCALES.aqi.rgb = SCALES.aqi.steps.map(([a, b, c]) => [a, b, hex(c)]);
  function color(layer, v) {
    if (v == null || !Number.isFinite(v)) return null;
    const s = SCALES[layer];
    if (layer === 'aqi') { const st = s.rgb.find(([, b]) => v <= b + 0.5) || s.rgb[s.rgb.length - 1]; return st[2]; }
    const r = s.rgb;
    if (v <= r[0][0]) return r[0][1];
    for (let i = 1; i < r.length; i++) if (v <= r[i][0]) { const [a, ca] = r[i - 1], [b, cb] = r[i], t = (v - a) / (b - a); return [0, 1, 2].map(k => Math.round(ca[k] + (cb[k] - ca[k]) * t)); }
    return r[r.length - 1][1];
  }
  /** Position (0–1) of a value on the evenly spaced legend bar. */
  function legendPos(layer, v) {
    const st = SCALES[layer].stops;
    if (!st || v == null || !Number.isFinite(v)) return null;
    if (v <= st[0][0]) return 0;
    for (let i = 1; i < st.length; i++) if (v <= st[i][0]) return (i - 1 + (v - st[i - 1][0]) / (st[i][0] - st[i - 1][0])) / (st.length - 1);
    return 1;
  }
  const aqiCat = (v) => SCALES.aqi.steps.find(([, b]) => v <= b + 0.5) || SCALES.aqi.steps[5];
  const fmtVal = (layer, v) => {
    if (v == null || !Number.isFinite(v)) return 'No data';
    const us = units() === 'us';
    if (layer === 'temp') return us ? `${Math.round(v * 9 / 5 + 32)}°F` : `${Math.round(v)}°C`;
    if (layer === 'precip') return v < 0.05 ? 'None' : us ? `${(v / 25.4).toFixed(2)} in/h` : `${v.toFixed(1)} mm/h`;
    if (layer === 'wind') return us ? `${Math.round(v / 1.609)} mph` : `${Math.round(v)} km/h`;
    return `${Math.round(v)} — ${aqiCat(v)[3]}`;
  };
  const chipVal = (layer, v) => {
    if (v == null || !Number.isFinite(v)) return '—';
    const us = units() === 'us';
    if (layer === 'temp') return us ? `${Math.round(v * 9 / 5 + 32)}°` : `${Math.round(v)}°`;
    if (layer === 'precip') return v < 0.05 ? '0' : us ? (v / 25.4).toFixed(2) : v.toFixed(1);
    if (layer === 'wind') return String(Math.round(us ? v / 1.609 : v));
    return String(Math.round(v));
  };
  const tickLabel = (layer, v) => {
    const us = units() === 'us';
    if (layer === 'temp') return us ? Math.round(v * 9 / 5 + 32) + '°' : v + '°';
    if (layer === 'precip') return us ? (v / 25.4).toFixed(v < 2.5 ? 2 : 1) : String(v);
    if (layer === 'wind') return us ? String(Math.round(v / 1.609)) : String(v);
    return String(v);
  };
  const wrapLon = (x) => ((((x + 180) % 360) + 360) % 360) - 180;

  /* ---------- Grids ---------- */
  function worldGrid() {
    const lons = [], lats = [];
    for (let lon = -180; lon < 180; lon += 9) lons.push(lon);
    for (let lat = -60; lat <= 78; lat += 6) lats.push(lat);
    return { key: 'world-v2', lons, lats, wrap: true, bbox: [-180, -60, 180, 78], center: 0 };
  }
  /** Regional grid in an unwrapped longitude frame centred on the location (safe across the antimeridian). */
  function regionGrid(loc) {
    const c = Math.max(-70, Math.min(70, Math.round(loc.lat * 2) / 2)), l0 = Math.round(loc.lon * 2) / 2;
    const lats = [], lons = [];
    for (let i = -7; i <= 7; i++) lats.push(+(c + i * 1.5).toFixed(2));
    for (let j = -11; j <= 11; j++) lons.push(+(l0 + j * 1.5).toFixed(2));
    return { key: `region-v2:${c},${l0}`, lons, lats, wrap: false, bbox: [lons[0], lats[0], lons[lons.length - 1], lats[lats.length - 1]], center: l0 };
  }

  /* ---------- Fetching (chunked bulk requests with retries) ---------- */
  async function fetchOM(url, attempt = 0) {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      let body = null; try { body = await res.json(); } catch (e) { /* non-JSON */ }
      if (!res.ok || (body && body.error)) {
        const reason = body && body.reason ? body.reason : `HTTP ${res.status}`;
        const retryable = res.status === 429 || res.status >= 500;
        const err = new Error(res.status === 429 ? `Rate limited by the data service (${reason}).` : reason); err.retryable = retryable; throw err;
      }
      return body;
    } catch (e) {
      const retryable = e.retryable !== false && (e.retryable || e.name === 'AbortError' || e instanceof TypeError);
      if (retryable && attempt < 2) { await new Promise(r => setTimeout(r, 1200 * (attempt + 1) ** 2)); return fetchOM(url, attempt + 1); }
      if (e.name === 'AbortError') throw new Error('The data service timed out.');
      if (e instanceof TypeError) throw new Error('Could not reach the data service.');
      throw e;
    } finally { clearTimeout(timer); }
  }
  /** Returns { results: [per point object | null], failedChunks, errors } — failed chunks don't fail the whole layer. */
  async function bulk(base, pts, vars) {
    const CH = 100, chunks = [];
    for (let i = 0; i < pts.length; i += CH) chunks.push({ start: i, pts: pts.slice(i, i + CH) });
    const results = new Array(pts.length).fill(null), errors = [];
    let next = 0, failed = 0;
    async function worker() {
      while (next < chunks.length) {
        const c = chunks[next++];
        const url = `${base}?latitude=${c.pts.map(p => p[1].toFixed(2)).join(',')}&longitude=${c.pts.map(p => wrapLon(p[0]).toFixed(2)).join(',')}&hourly=${vars}&forecast_days=3&timeformat=unixtime&timezone=GMT`;
        try {
          const r = await fetchOM(url);
          const arr = Array.isArray(r) ? r : [r];
          if (arr.length !== c.pts.length) throw new Error(`Expected ${c.pts.length} points, got ${arr.length}.`);
          arr.forEach((o, k) => { results[c.start + k] = o && o.hourly ? o : null; });
        } catch (e) { failed++; errors.push(e.message); }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    return { results, failedChunks: failed, totalChunks: chunks.length, errors };
  }
  /** Pack per-point hourly series into a flat Float32Array (NaN = missing), aligned by timestamp. */
  function align(results, varName, times) {
    const H = times.length, out = new Float32Array(results.length * H).fill(NaN);
    const idx = new Map(times.map((t, i) => [t, i]));
    results.forEach((r, p) => {
      if (!r || !r.hourly || !Array.isArray(r.hourly.time)) return;
      const series = r.hourly[varName]; if (!Array.isArray(series)) return;
      r.hourly.time.forEach((t, k) => { const i = idx.get(t); const v = series[k]; if (i != null && v != null && Number.isFinite(+v)) out[p * H + i] = +v; });
    });
    return out;
  }
  async function fetchGrid(grid) {
    const pts = [];
    for (const lat of grid.lats) for (const lon of grid.lons) pts.push([lon, lat]);
    const [wx, aq] = await Promise.all([
      bulk('https://api.open-meteo.com/v1/forecast', pts, 'temperature_2m,precipitation,wind_speed_10m,wind_direction_10m'),
      bulk('https://air-quality-api.open-meteo.com/v1/air-quality', pts, 'us_aqi')
    ]);
    const nowH = Math.floor(Date.now() / 3600000) * 3600;
    const first = (b) => b.results.find(r => r && r.hourly && Array.isArray(r.hourly.time));
    const f = first(wx) || first(aq);
    if (!f) throw new Error([...new Set([...wx.errors, ...aq.errors])].slice(0, 2).join(' · ') || 'No map data returned.');
    const times = f.hourly.time.filter(t => t >= nowH - 3600).slice(0, HOURS + 1);
    const data = { grid: { lons: grid.lons, lats: grid.lats, wrap: grid.wrap, bbox: grid.bbox, key: grid.key, center: grid.center }, at: Date.now(), times, vars: {}, notes: {} };
    if (first(wx)) {
      data.vars.temp = align(wx.results, 'temperature_2m', times);
      data.vars.precip = align(wx.results, 'precipitation', times);
      const sp = align(wx.results, 'wind_speed_10m', times), dir = align(wx.results, 'wind_direction_10m', times);
      // store wind as u/v (km/h): u east-west, v north-south, both pointing where the wind blows TO
      const u = new Float32Array(sp.length), v = new Float32Array(sp.length);
      for (let i = 0; i < sp.length; i++) { const r = dir[i] * Math.PI / 180; u[i] = -sp[i] * Math.sin(r); v[i] = -sp[i] * Math.cos(r); }
      data.vars.u = u; data.vars.v = v;
    }
    if (wx.failedChunks) data.notes.wx = wx.failedChunks === wx.totalChunks ? `Weather data unavailable (${wx.errors[0]})` : `${wx.failedChunks} of ${wx.totalChunks} weather download chunks failed (${wx.errors[0]}); those areas are hatched.`;
    if (first(aq)) data.vars.aqi = align(aq.results, 'us_aqi', times);
    if (aq.failedChunks) data.notes.aqi = aq.failedChunks === aq.totalChunks ? `Air-quality data unavailable (${aq.errors[0]})` : `${aq.failedChunks} of ${aq.totalChunks} air-quality chunks failed (${aq.errors[0]}); those areas are hatched.`;
    return data;
  }

  /* ---------- Compact storage (Int16, base64) ---------- */
  const SCALE = { temp: 10, precip: 100, u: 10, v: 10, aqi: 1 };
  function packArr(a, s) {
    const i16 = new Int16Array(a.length);
    for (let i = 0; i < a.length; i++) i16[i] = Number.isFinite(a[i]) ? Math.max(-32767, Math.min(32767, Math.round(a[i] * s))) : -32768;
    const bytes = new Uint8Array(i16.buffer); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function unpackArr(b64, s) {
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const i16 = new Int16Array(bytes.buffer), out = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) out[i] = i16[i] === -32768 ? NaN : i16[i] / s;
    return out;
  }
  function pack(d) { const vars = {}; for (const [k, a] of Object.entries(d.vars)) vars[k] = packArr(a, SCALE[k]); return { v: 2, grid: d.grid, at: d.at, times: d.times, notes: d.notes, vars }; }
  function unpack(o) {
    if (!o || o.v !== 2 || !o.grid || !Array.isArray(o.times)) return null;
    try { const vars = {}; for (const [k, b] of Object.entries(o.vars || {})) vars[k] = unpackArr(b, SCALE[k] || 1); return { ...o, vars }; } catch (e) { return null; }
  }

  /* ---------- Field sampling ---------- */
  /** Catmull-Rom bicubic interpolation, clamped to the surrounding 4 values (no overshoot, so no negative rain). Falls back to weighted bilinear around missing data. */
  function sampler(data, varName, hour) {
    const a = data.vars[varName]; if (!a) return () => NaN;
    const { lons, lats, wrap, center } = data.grid, nx = lons.length, ny = lats.length, H = data.times.length;
    const dx = lons[1] - lons[0], dy = lats[1] - lats[0];
    const at = (i, j) => { if (wrap) i = ((i % nx) + nx) % nx; else i = Math.max(0, Math.min(nx - 1, i)); j = Math.max(0, Math.min(ny - 1, j)); return a[(j * nx + i) * H + hour]; };
    const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
    return (lon, lat) => {
      if (!wrap) lon = center + wrapLon(lon - center);
      let fx = (lon - lons[0]) / dx; const fy = Math.max(0, Math.min(ny - 1, (lat - lats[0]) / dy));
      if (!wrap && (fx < -0.5 || fx > nx - 0.5)) return NaN;
      if (wrap) fx = ((fx % nx) + nx) % nx; else fx = Math.max(0, Math.min(nx - 1, fx));
      const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
      const q = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)];
      if (q.some(x => !Number.isFinite(x))) {
        const w = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
        let s = 0, ws = 0; q.forEach((x, k) => { if (Number.isFinite(x)) { s += x * w[k]; ws += w[k]; } });
        return ws > 0.35 ? s / ws : NaN;
      }
      const rows = [];
      for (let m = -1; m <= 2; m++) {
        const r = [at(i - 1, j + m), at(i, j + m), at(i + 1, j + m), at(i + 2, j + m)];
        if (r.some(x => !Number.isFinite(x))) { rows.push(null); continue; }
        rows.push(cr(r[0], r[1], r[2], r[3], tx));
      }
      let v;
      if (rows.some(x => x == null)) v = (q[0] * (1 - tx) + q[1] * tx) * (1 - ty) + (q[2] * (1 - tx) + q[3] * tx) * ty;
      else v = cr(rows[0], rows[1], rows[2], rows[3], ty);
      const lo = Math.min(...q), hi = Math.max(...q);
      return Math.max(lo, Math.min(hi, v));
    };
  }
  const windAt = (su, sv) => (lon, lat) => { const u = su(lon, lat), v = sv(lon, lat); if (!Number.isFinite(u) || !Number.isFinite(v)) return null; return { speed: Math.hypot(u, v), from: (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360, u, v }; };

  /* ---------- Component ---------- */
  M.wxMaps = {
    _internals: { sampler, pack, unpack, regionGrid, worldGrid, windAt, legendPos, color },
    mount(host, opts) {
      let layer = M.store.get('wxMapLayer', 'temp'), scope = M.store.get('wxMapScope', 'region'), hour = 0, playing = null, data = null, loading = false, loc = opts.getLoc(), lastTry = 0, reqId = 0, loadErr = null;
      let showIso = M.store.get('wxMapIso', true), showCities = M.store.get('wxMapCities', true);
      let animate = M.store.get('wxMapAnim', !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));
      let svg, g, zoom, proj, rasterCache = new Map(), particles = null;
      if (!['temp', 'precip', 'wind', 'aqi'].includes(layer)) layer = 'temp';
      host.innerHTML = `<div class="card">
        <div class="card-head"><h2>Weather maps</h2><span class="sub" id="wmStatus" aria-live="polite"></span></div>
        <div class="row" style="align-items:center;margin-bottom:10px">
          <div class="seg" role="tablist" aria-label="Map layer" id="wmLayers">${['temp', 'precip', 'wind', 'aqi'].map(k => `<button role="tab" data-l="${k}">${{ temp: '🌡️ Temperature', precip: '🌧️ Precipitation', wind: '💨 Wind', aqi: '🫁 Air quality' }[k]}</button>`).join('')}</div>
          <div class="spacer"></div>
          <div class="seg" role="group" aria-label="Map area" id="wmScope"><button data-s="region">Around location</button><button data-s="world">World</button></div>
          <button class="btn btn-sm" id="wmRefresh">${M.icon('reset')} Refresh maps</button>
        </div>
        <div class="row tight" style="margin-bottom:8px">
          <label class="check"><input type="checkbox" id="wmIso"> Isotherms</label>
          <label class="check"><input type="checkbox" id="wmCities"> City values</label>
          <label class="check"><input type="checkbox" id="wmAnim"> Animate wind</label>
        </div>
        <div class="map-stage wm-stage" id="wmStage"><canvas class="wm-particles" id="wmParticles" aria-hidden="true"></canvas><div class="empty" id="wmMsg" style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:16px">Loading map…</div>
          <div class="map-zoom"><button class="icon-btn" id="wmIn" aria-label="Zoom in">${M.icon('plus')}</button><button class="icon-btn" id="wmOut" aria-label="Zoom out">${M.icon('minus')}</button><button class="icon-btn" id="wmReset" aria-label="Reset view">${M.icon('reset')}</button></div></div>
        <div class="wm-legend" id="wmLegend" aria-label="Colour key"></div>
        <div class="row" style="align-items:center;margin-top:10px">
          <button class="btn btn-sm" id="wmPlay" aria-label="Play forecast animation">▶ Play</button>
          <input type="range" id="wmTime" min="0" max="${HOURS}" value="0" style="flex:1 1 260px" aria-label="Forecast hour">
          <div class="small strong tabular" id="wmTimeLbl" style="min-width:220px"></div>
        </div>
        <div id="wmWarn"></div>
        <p class="tiny muted" id="wmNote" style="margin:8px 0 0"></p>
      </div>`;
      const $ = (s) => host.querySelector(s);
      const tip = () => document.getElementById('tooltip');
      $('#wmIso').checked = showIso; $('#wmCities').checked = showCities; $('#wmAnim').checked = animate;
      const visible = () => { const v = host.closest('.view'); return !(v && v.hidden) && !document.hidden; };

      function gridOf() { return scope === 'world' ? worldGrid() : regionGrid(loc); }
      const cacheKey = () => scope === 'world' ? 'wxgrid2.world' : 'wxgrid2.region';
      /** First index whose hour has not ended yet (so stale saved data starts at "now"). */
      const nowIndex = () => { if (!data) return 0; const t = Date.now() / 1000 - 3600; const i = data.times.findIndex(x => x > t); return i < 0 ? -1 : i; };

      async function load(force) {
        const grid = gridOf();
        const cached = unpack(M.store.get(cacheKey(), null));
        data = cached && cached.grid.key === grid.key ? cached : null;
        rasterCache.clear(); hour = Math.max(0, nowIndex()); loadErr = null;
        safeDraw();
        const fresh = data && Date.now() - data.at < STALE_MS && nowIndex() >= 0;
        if ((!force && fresh) || !navigator.onLine || loading) { status(); return; }
        loading = true; lastTry = Date.now(); const id = ++reqId; status('Downloading map data…');
        try {
          const d = await fetchGrid(grid);
          if (id !== reqId) return;
          data = d; rasterCache.clear(); hour = Math.max(0, nowIndex());
          const packed = pack(d);
          if (!M.store.set(cacheKey(), packed)) { M.store.remove('wxgrid2.world'); M.store.remove('wxgrid2.region'); M.store.set(cacheKey(), packed); }
        } catch (e) { if (id === reqId) loadErr = e.message; }
        finally { if (id === reqId) loading = false; }
        if (id === reqId) safeDraw();
      }
      function status(msg) {
        const el = $('#wmStatus'); if (!el) return;
        const age = data ? Math.round((Date.now() - data.at) / 60000) : null;
        const ageTxt = age == null ? '' : age < 1 ? 'just now' : age < 120 ? `${age} min ago` : `${Math.round(age / 60)} h ago`;
        el.innerHTML = msg ? esc(msg) : loadErr ? `<span class="err-text">Couldn’t update: ${esc(loadErr)}</span>${data ? ` · showing saved maps (${ageTxt})` : ''}` : data ? `${navigator.onLine ? '' : '<span class="badge amber">Offline</span> '}updated ${ageTxt}` : navigator.onLine ? '' : '<span class="badge amber">Offline</span> no saved maps for this area yet';
      }

      function buildSvg() {
        const stage = $('#wmStage');
        stage.querySelectorAll(':scope > svg').forEach(s => s.remove()); // keep the zoom buttons' icons
        if (typeof d3 === 'undefined' || typeof topojson === 'undefined' || !window.MERIDIAN_COUNTRIES_TOPO) { const m = $('#wmMsg'); m.hidden = false; m.textContent = 'Map libraries unavailable.'; return false; }
        const grid = gridOf();
        const [x0, y0, x1, y1] = grid.bbox;
        const H = Math.round(W * (y1 - y0) / (x1 - x0));
        stage.style.aspectRatio = `${W} / ${H}`;
        // rotate so the grid centre is at longitude 0: regional maps then never straddle the ±180° seam
        proj = d3.geoEquirectangular().rotate([-grid.center, 0]).fitExtent([[0, 0], [W, H]], { type: 'MultiPoint', coordinates: [[x0, y0], [x1, y1]] });
        const path = d3.geoPath(proj);
        const C = window.MERIDIAN_COUNTRIES_TOPO;
        svg = d3.select(stage).insert('svg', '.map-zoom').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Weather map. Hover for values, click to load the forecast for a point.');
        const defs = svg.append('defs');
        defs.append('clipPath').attr('id', 'wmClip').append('rect').attr('width', W).attr('height', H);
        g = svg.append('g').attr('clip-path', 'url(#wmClip)');
        g.append('rect').attr('class', 'wm-ocean').attr('x', -W).attr('y', -H).attr('width', 3 * W).attr('height', 3 * H);
        const land = topojson.feature(C, C.objects.land);
        g.append('path').attr('class', 'wm-land').attr('d', path(land));
        g.append('image').attr('class', 'wm-raster').attr('preserveAspectRatio', 'none');
        g.append('path').attr('class', 'country').attr('d', path(topojson.mesh(C, C.objects.countries, (a, b) => a !== b)));
        g.append('path').attr('class', 'coast').attr('d', path(land));
        g.append('g').attr('class', 'wm-iso');
        g.append('g').attr('class', 'wm-arrows');
        g.append('g').attr('class', 'wm-chips');
        if (scope === 'region') { const xy = proj([loc.lon, loc.lat]); g.append('circle').attr('class', 'wm-loc').attr('cx', xy[0]).attr('cy', xy[1]).attr('r', 5); }
        zoom = d3.zoom().scaleExtent([1, 10]).translateExtent([[0, 0], [W, H]]).on('zoom', (ev) => {
          const k = ev.transform.k;
          g.attr('transform', ev.transform);
          g.selectAll('.wm-arrows path').attr('stroke-width', 1.2 / k);
          g.select('.wm-loc').attr('r', 5 / Math.sqrt(k));
          g.selectAll('.wm-chip').attr('transform', function () { return `translate(${this.dataset.x},${this.dataset.y}) scale(${1 / k})`; });
          g.selectAll('.wm-iso path').attr('stroke-width', function () { return (+this.dataset.w || 1) / k; });
          g.selectAll('.wm-iso text').attr('font-size', 10 / k).attr('stroke-width', 3 / k);
          if (particles) particles.clear();
        });
        svg.call(zoom).on('dblclick.zoom', null);
        svg.on('mousemove', onMove).on('mouseleave', () => { tip().hidden = true; legendMark(null); }).on('click', onClick);
        svg.attr('data-key', `${scope}|${grid.key}`);
        return true;
      }

      function raster() {
        const key = `${layer}|${hour}|${data.grid.key}|${data.at}`;
        if (rasterCache.has(key)) return rasterCache.get(key);
        const [x0, y0, x1, y1] = data.grid.bbox;
        const cw = scope === 'world' ? 720 : 480, ch = Math.round(cw * (y1 - y0) / (x1 - x0));
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        const ctx = cv.getContext('2d'), img = ctx.createImageData(cw, ch), px = img.data;
        let s;
        if (layer === 'wind') { const su = sampler(data, 'u', hour), sv = sampler(data, 'v', hour); s = (lon, lat) => { const u = su(lon, lat), v = sv(lon, lat); return Number.isFinite(u) && Number.isFinite(v) ? Math.hypot(u, v) : NaN; }; }
        else s = sampler(data, layer, hour);
        for (let py = 0; py < ch; py++) {
          const lat = y1 - (py + 0.5) / ch * (y1 - y0);
          for (let qx = 0; qx < cw; qx++) {
            const lon = x0 + (qx + 0.5) / cw * (x1 - x0);
            const v = s(lon, lat), o = (py * cw + qx) * 4;
            if (!Number.isFinite(v)) { if (((qx + py) & 7) < 2) { px[o] = px[o + 1] = px[o + 2] = 120; px[o + 3] = 110; } continue; } // hatched = no data
            if (layer === 'precip') {
              if (v < 0.02) continue;
              const c = color('precip', Math.max(0.1, v));
              px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = Math.round(215 * Math.min(1, (v - 0.02) / 0.25));
              continue;
            }
            const c = color(layer, v);
            px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 190;
          }
        }
        ctx.putImageData(img, 0, 0);
        const url = cv.toDataURL();
        if (rasterCache.size > 60) rasterCache.delete(rasterCache.keys().next().value);
        rasterCache.set(key, url);
        return url;
      }

      /** Labelled isotherms from d3.contours on a resampled grid; edges along the map border are not drawn. */
      function drawIso() {
        const iso = g.select('.wm-iso'); iso.html('');
        if (layer !== 'temp' || !showIso) return;
        const [x0, y0, x1, y1] = data.grid.bbox, gw = scope === 'world' ? 180 : 120, gh = Math.max(8, Math.round(gw * (y1 - y0) / (x1 - x0)));
        const s = sampler(data, 'temp', hour), vals = new Float64Array(gw * gh);
        let any = false;
        for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const v = s(x0 + (i + 0.5) / gw * (x1 - x0), y1 - (j + 0.5) / gh * (y1 - y0)); vals[j * gw + i] = Number.isFinite(v) ? v : NaN; if (Number.isFinite(v)) any = true; }
        if (!any) return;
        const us = units() === 'us';
        const thresholds = us ? d3.range(-40, 121, 10).map(f => (f - 32) * 5 / 9) : d3.range(-40, 51, 5);
        const k = d3.zoomTransform(svg.node()).k;
        const nearGap = (cx, cy) => { for (const dx of [-2, -1, 0, 1]) for (const dy of [-2, -1, 0, 1]) { const i = Math.floor(cx) + dx, j = Math.floor(cy) + dy; if (i >= 0 && j >= 0 && i < gw && j < gh && !Number.isFinite(vals[j * gw + i])) return true; } return false; };
        const toXY = ([cx, cy]) => proj([x0 + cx / gw * (x1 - x0), y1 - cy / gh * (y1 - y0)]);
        for (const c of d3.contours().size([gw, gh]).thresholds(thresholds)(Array.from(vals, v => Number.isFinite(v) ? v : -999))) {
          if (c.value < -60) continue;
          let d = '', best = null;
          for (const poly of c.coordinates) for (const ring of poly) {
            let seg = [];
            const flush = () => { if (seg.length > 2) { d += 'M' + seg.map(p => p.join(',')).join('L'); if (!best || seg.length > best.length) best = seg; } seg = []; };
            for (const p of ring) {
              // break the line at the map border and next to missing data, so no false isolines are drawn there
              const onEdge = p[0] <= 0.01 || p[1] <= 0.01 || p[0] >= gw - 0.01 || p[1] >= gh - 0.01 || nearGap(p[0], p[1]);
              if (onEdge) flush(); else seg.push(toXY(p));
            }
            flush();
          }
          if (!d) continue;
          const zero = Math.abs(c.value) < 0.01 || (us && Math.abs(c.value * 9 / 5 + 32 - 32) < 0.01);
          iso.append('path').attr('d', d).attr('data-w', zero ? 1.6 : 0.9).attr('stroke-width', (zero ? 1.6 : 0.9) / k).attr('class', zero ? 'freeze' : '');
          if (best && best.length > 12) { const p = best[Math.floor(best.length / 2)]; iso.append('text').attr('x', p[0]).attr('y', p[1]).attr('font-size', 10 / k).attr('stroke-width', 3 / k).text(us ? Math.round(c.value * 9 / 5 + 32) + '°' : Math.round(c.value) + '°'); }
        }
      }
      function drawArrows() {
        const ar = g.select('.wm-arrows'); ar.html('');
        if (layer !== 'wind' || !data.vars.u || (animate && particles && particles.running)) return;
        const { lons, lats } = data.grid, H = data.times.length, k = d3.zoomTransform(svg.node()).k;
        lats.forEach((lat, j) => lons.forEach((lon, i) => {
          if (scope === 'region' && (i + j) % 2) return;
          const p = (j * lons.length + i) * H + hour, u = data.vars.u[p], v = data.vars.v[p];
          if (!Number.isFinite(u) || !Number.isFinite(v)) return;
          const sp = Math.hypot(u, v); if (sp < 1) return;
          const [x, y] = proj([lon, lat]), len = 6 + Math.min(14, sp / 4);
          const dx = u / sp * len, dy = -v / sp * len, hx = x + dx / 2, hy = y + dy / 2, ang = Math.atan2(dy, dx);
          ar.append('path').attr('d', `M${x - dx / 2},${y - dy / 2}L${hx},${hy}M${hx},${hy}L${hx - 4 * Math.cos(ang - 0.5)},${hy - 4 * Math.sin(ang - 0.5)}M${hx},${hy}L${hx - 4 * Math.cos(ang + 0.5)},${hy - 4 * Math.sin(ang + 0.5)}`).attr('stroke-width', 1.2 / k);
        }));
      }
      function drawChips() {
        const ch = g.select('.wm-chips'); ch.html('');
        if (!showCities) return;
        const [x0, y0, x1, y1] = data.grid.bbox, k = d3.zoomTransform(svg.node()).k;
        const center = data.grid.center;
        const inBox = (c) => { const lon = data.grid.wrap ? c.lon : center + wrapLon(c.lon - center); return c.lat > y0 + 0.5 && c.lat < y1 - 0.5 && lon > x0 + 0.5 && lon < x1 - 0.5; };
        const limit = scope === 'world' ? 40 : 14;
        let s, wind;
        if (layer === 'wind') { wind = windAt(sampler(data, 'u', hour), sampler(data, 'v', hour)); } else s = sampler(data, layer, hour);
        const placed = [];
        for (const c of M.D.CITIES) {
          if (placed.length >= limit) break;
          if (!inBox(c)) continue;
          const xy = proj([c.lon, c.lat]);
          if (placed.some(p => Math.abs(p[0] - xy[0]) < 70 && Math.abs(p[1] - xy[1]) < 24)) continue;
          const v = layer === 'wind' ? (wind(c.lon, c.lat) || {}).speed : s(c.lon, c.lat);
          if (!Number.isFinite(v)) continue;
          placed.push(xy);
          const col = layer === 'precip' && v < 0.05 ? [200, 210, 225] : color(layer, layer === 'precip' ? Math.max(0.1, v) : v) || [200, 200, 200];
          const label = `${c.name.replace(/ \(.*\)$/, '').split(',')[0]} ${chipVal(layer, v)}`;
          const wpx = 8 + label.length * 5.6;
          const gg = ch.append('g').attr('class', 'wm-chip').attr('data-x', xy[0]).attr('data-y', xy[1]).attr('transform', `translate(${xy[0]},${xy[1]}) scale(${1 / k})`);
          gg.append('rect').attr('x', 4).attr('y', -9).attr('width', wpx).attr('height', 17).attr('rx', 8).attr('style', `stroke: rgb(${col.join(',')})`);
          gg.append('circle').attr('r', 2.5);
          gg.append('text').attr('x', 8).attr('y', 3.5).text(label);
        }
      }

      function safeDraw() {
        try { draw(); }
        catch (e) {
          console.error(e);
          const m = $('#wmMsg'); m.hidden = false;
          m.innerHTML = `<div class="note error">The map couldn’t be drawn (${esc(e.message)}). <button class="btn btn-sm" id="wmRetryDraw">Try again</button></div>`;
          const b = $('#wmRetryDraw'); if (b) b.onclick = () => { svg = null; rasterCache.clear(); safeDraw(); };
        }
      }
      function draw() {
        host.querySelectorAll('#wmLayers [data-l]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.l === layer)));
        host.querySelectorAll('#wmScope [data-s]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === scope)));
        $('#wmAnim').closest('label').hidden = layer !== 'wind';
        $('#wmIso').closest('label').hidden = layer !== 'temp';
        legend(); status();
        const msg = $('#wmMsg');
        const want = `${scope}|${gridOf().key}`;
        if (!svg || !svg.node().isConnected || svg.attr('data-key') !== want) { if (!buildSvg()) return; }
        const varKey = layer === 'wind' ? 'u' : layer;
        const clear = (text) => { msg.hidden = false; msg.innerHTML = text; g.select('.wm-raster').attr('href', null); g.selectAll('.wm-arrows, .wm-chips, .wm-iso').html(''); particlesStop(); timeLbl(); };
        if (!data) return clear(loading ? 'Downloading map data…' : loadErr ? `Map data unavailable: ${esc(loadErr)}<br><button class="btn btn-sm" id="wmRetry" style="margin-top:8px">Retry</button>` : navigator.onLine ? 'Map data unavailable. Use “Refresh maps” to try again.' : 'Offline — maps will download when you reconnect.');
        const ni = nowIndex();
        $('#wmWarn').innerHTML = [ni < 0 ? `<div class="note warn small" style="margin-top:8px">These saved maps are out of date — all their forecast hours have passed.${navigator.onLine ? '' : ' They will update when you reconnect.'}</div>` : '', ...Object.values(data.notes || {}).map(n => `<div class="note warn small" style="margin-top:8px">${esc(n)}</div>`)].join('');
        if (!data.vars[varKey]) return clear(`${esc(SCALES[layer].label)} data is unavailable right now.`);
        msg.hidden = true;
        hour = Math.max(0, Math.min(hour, data.times.length - 1));
        const slider = $('#wmTime'); slider.min = Math.max(0, ni); slider.max = data.times.length - 1; slider.value = hour;
        const [x0, y0, x1, y1] = data.grid.bbox, a = proj([x0, y1]), b = proj([x1, y0]);
        g.select('.wm-raster').attr('href', raster()).attr('x', a[0]).attr('y', a[1]).attr('width', b[0] - a[0]).attr('height', b[1] - a[1]);
        drawIso(); drawChips();
        if (layer === 'wind' && animate) particlesStart(); else particlesStop();
        drawArrows();
        timeLbl();
        $('#wmNote').innerHTML = `${layer === 'aqi' ? 'US AQI computed from the Copernicus Atmosphere Monitoring Service (CAMS) model' : 'Forecast model data (“best match” of national weather-service models: ECMWF, NOAA GFS, DWD ICON and others)'} via Open-Meteo. ${scope === 'world' ? '9° × 6° grid' : '1.5° grid around the selected location'}, smoothly interpolated (bicubic, without overshoot) — a forecast field, not observations. Hatched areas = no data. ${layer === 'precip' ? 'Precipitation falling during each hour; blank means none. ' : ''}${layer === 'wind' ? 'Particles/arrows move with the 10 m wind; colour shows its speed. ' : ''}${layer === 'temp' && showIso ? `Lines are isotherms every ${units() === 'us' ? '10°F' : '5°C'}; the thicker line is freezing. ` : ''}Hover for values; click to load that point’s full forecast.`;
      }
      function timeLbl() {
        const el = $('#wmTimeLbl'); if (!data || !data.times || !data.times.length) { el.textContent = ''; return; }
        const t = data.times[hour] * 1000, w = TE.toZoned(M.localZone(), t);
        const rel = Math.round((t - Math.floor(Date.now() / 3600000) * 3600000) / 3600000);
        el.textContent = `${TE.WEEKDAYS_SHORT[w.weekday]} ${M.fmtTime(w)} your time · ${rel === 0 ? 'now' : rel > 0 ? '+' + rel + ' h' : rel + ' h (past)'}`;
      }
      function legend() {
        const s = SCALES[layer], el = $('#wmLegend');
        const us = units() === 'us';
        const unit = layer === 'temp' ? (us ? '°F' : '°C') : layer === 'precip' ? (us ? 'in/h' : 'mm/h') : layer === 'wind' ? (us ? 'mph' : 'km/h') : 'US AQI';
        if (layer === 'aqi') { el.innerHTML = `<div class="wm-key-title">${esc(s.label)}</div><div class="wm-aqi">${s.steps.map(([a, b, c, n]) => `<div data-cat="${a}"><i style="background:${c}"></i><b>${a}–${b}</b><span>${esc(n)}</span></div>`).join('')}</div>`; return; }
        const stops = s.stops;
        const grad = stops.map(([, c], i) => `${c} ${(i / (stops.length - 1) * 100).toFixed(1)}%`).join(',');
        el.innerHTML = `<div class="wm-key-title">${esc(s.label)} <span class="muted">(${unit})</span></div><div class="wm-bar" style="background:linear-gradient(90deg,${grad})"><span class="wm-mark" hidden></span></div><div class="wm-ticks">${stops.map(([v]) => `<span>${esc(tickLabel(layer, v))}</span>`).join('')}</div>${layer === 'precip' ? '<div class="tiny muted">Below 0.1 mm/h: not shaded</div>' : ''}`;
      }
      function legendMark(v) {
        if (layer === 'aqi') { host.querySelectorAll('.wm-aqi > div').forEach(d => d.classList.toggle('hit', v != null && Number.isFinite(v) && +d.dataset.cat === aqiCat(v)[0])); return; }
        const m = host.querySelector('.wm-mark'); if (!m) return;
        const p = legendPos(layer, v);
        if (p == null || (layer === 'precip' && v < 0.1)) { m.hidden = true; return; }
        m.hidden = false; m.style.left = (p * 100).toFixed(2) + '%';
      }
      function lonLatAt(ev) { const [x, y] = d3.pointer(ev, g.node()); return proj.invert([x, y]); }
      function onMove(ev) {
        if (!data || !proj) return;
        const ll = lonLatAt(ev); if (!ll || !Number.isFinite(ll[0])) return;
        const [lon, lat] = ll, [, y0, , y1] = data.grid.bbox;
        if (lat < y0 || lat > y1) { tip().hidden = true; legendMark(null); return; }
        let v, extra = '';
        if (layer === 'wind') { const w = data.vars.u ? windAt(sampler(data, 'u', hour), sampler(data, 'v', hour))(lon, lat) : null; v = w ? w.speed : NaN; if (w && w.speed >= 1) extra = ` from ${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(w.from / 45) % 8]}`; }
        else v = sampler(data, layer, hour)(lon, lat);
        legendMark(v);
        const t = tip();
        t.innerHTML = `<div class="tt-title">${esc(SCALES[layer].label)}</div><div class="tt-time">${esc(fmtVal(layer, v))}${esc(extra)}</div><div class="tiny muted">${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(wrapLon(lon)).toFixed(1)}°${wrapLon(lon) >= 0 ? 'E' : 'W'} · interpolated · click for forecast</div>`;
        t.hidden = false;
        const r = t.getBoundingClientRect();
        let X = ev.clientX + 14, Y = ev.clientY + 14;
        if (X + r.width > innerWidth - 8) X = ev.clientX - r.width - 14;
        if (Y + r.height > innerHeight - 8) Y = ev.clientY - r.height - 14;
        t.style.left = X + 'px'; t.style.top = Y + 'px';
      }
      function onClick(ev) {
        if (ev.defaultPrevented || !proj) return;
        const ll = lonLatAt(ev); if (!ll || !Number.isFinite(ll[0])) return;
        tip().hidden = true;
        opts.onPick({ lat: Math.max(-89, Math.min(89, ll[1])), lon: wrapLon(ll[0]) });
      }

      /* ---------- Wind particles (canvas, advected through the interpolated u/v field) ---------- */
      function particlesStart() {
        if (!data || !data.vars.u || !visible()) return;
        if (!particles) particles = makeParticles();
        particles.setField();
        particles.start();
      }
      function particlesStop() { if (particles) particles.stop(); }
      function makeParticles() {
        const cv = $('#wmParticles'), ctx = cv.getContext('2d');
        let raf = null, field = null, list = [], dpr = 1, sz = [0, 0];
        const N = () => scope === 'world' ? 1400 : 700;
        const resize = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr)); sz = [r.width, r.height]; };
        const spawn = () => { const [x0, y0, x1, y1] = data.grid.bbox; return { lon: x0 + Math.random() * (x1 - x0), lat: y0 + Math.random() * (y1 - y0), age: Math.floor(Math.random() * 80) }; };
        const api = {
          running: false,
          setField() { field = windAt(sampler(data, 'u', hour), sampler(data, 'v', hour)); list = Array.from({ length: N() }, spawn); },
          clear() { ctx.clearRect(0, 0, cv.width, cv.height); },
          start() { if (api.running) return; api.running = true; resize(); const loop = () => { if (!api.running) return; if (!visible() || layer !== 'wind') { api.stop(); return; } step(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); drawArrows(); },
          stop() { api.running = false; cancelAnimationFrame(raf); api.clear(); }
        };
        function step() {
          if (!svg || !field) return;
          const r = cv.getBoundingClientRect(); if (Math.abs(r.width - sz[0]) > 1 || Math.abs(r.height - sz[1]) > 1) resize();
          const t = d3.zoomTransform(svg.node()), vb = svg.node().viewBox.baseVal, sx = sz[0] / vb.width, sy = sz[1] / vb.height;
          ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineWidth = 1.2 * dpr; ctx.strokeStyle = M.isDark() ? 'rgba(255,255,255,0.75)' : 'rgba(15,25,50,0.7)';
          ctx.beginPath();
          const [x0, y0, x1, y1] = data.grid.bbox, speedK = scope === 'world' ? 0.0045 : 0.0012;
          for (const p of list) {
            const w = field(p.lon, p.lat);
            if (!w || p.age++ > 90) { Object.assign(p, spawn(), { age: 0 }); continue; }
            const a = proj([p.lon, p.lat]);
            p.lon += w.u * speedK / Math.max(0.2, Math.cos(p.lat * Math.PI / 180)); p.lat += w.v * speedK;
            if (p.lat < y0 || p.lat > y1 || (!data.grid.wrap && (p.lon < x0 || p.lon > x1))) { Object.assign(p, spawn(), { age: 0 }); continue; }
            if (data.grid.wrap) p.lon = wrapLon(p.lon);
            const b = proj([p.lon, p.lat]);
            if (!a || !b || Math.abs(a[0] - b[0]) > 50) continue;
            ctx.moveTo((t.applyX(a[0]) * sx) * dpr, (t.applyY(a[1]) * sy) * dpr);
            ctx.lineTo((t.applyX(b[0]) * sx) * dpr, (t.applyY(b[1]) * sy) * dpr);
          }
          ctx.stroke();
        }
        return api;
      }

      host.querySelector('#wmLayers').addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (b) { layer = b.dataset.l; M.store.set('wxMapLayer', layer); safeDraw(); } });
      host.querySelector('#wmScope').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b && b.dataset.s !== scope) { scope = b.dataset.s; M.store.set('wxMapScope', scope); svg = null; if (particles) { particles.stop(); particles = null; } load(false); } });
      $('#wmRefresh').addEventListener('click', () => load(true));
      $('#wmStage').addEventListener('click', (e) => { if (e.target.id === 'wmRetry') load(true); });
      $('#wmIso').addEventListener('change', (e) => { showIso = e.target.checked; M.store.set('wxMapIso', showIso); safeDraw(); });
      $('#wmCities').addEventListener('change', (e) => { showCities = e.target.checked; M.store.set('wxMapCities', showCities); safeDraw(); });
      $('#wmAnim').addEventListener('change', (e) => { animate = e.target.checked; M.store.set('wxMapAnim', animate); safeDraw(); });
      $('#wmTime').addEventListener('input', (e) => { hour = +e.target.value; safeDraw(); });
      const stopPlay = () => { clearInterval(playing); playing = null; $('#wmPlay').textContent = '▶ Play'; };
      $('#wmPlay').addEventListener('click', () => {
        if (playing) { stopPlay(); return; }
        if (!data) return;
        $('#wmPlay').textContent = '❚❚ Pause';
        playing = setInterval(() => {
          if (!data || !visible()) { stopPlay(); return; }
          const lo = Math.max(0, nowIndex()); hour = hour + 1 >= data.times.length ? lo : hour + 1; safeDraw();
        }, 700);
      });
      $('#wmIn').addEventListener('click', () => svg && svg.transition().duration(250).call(zoom.scaleBy, 1.6));
      $('#wmOut').addEventListener('click', () => svg && svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6));
      $('#wmReset').addEventListener('click', () => svg && svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));
      window.addEventListener('online', () => { if (visible()) load(false); });
      window.addEventListener('offline', () => status());
      document.addEventListener('visibilitychange', () => { if (!visible()) { particlesStop(); if (playing) stopPlay(); } else if (layer === 'wind' && animate && data) particlesStart(); });
      M.onSettings((k) => { if (k === 'wxUnits' || k === 'hour12' || k === 'theme') safeDraw(); });

      M.loadScript('data/countries-map.js').then(() => load(false)).catch(e => { $('#wmMsg').textContent = 'Map data failed to load: ' + e.message; });
      return {
        setLocation(l) {
          const before = scope === 'region' ? gridOf().key : null; loc = l;
          if (scope === 'region' && regionGrid(l).key !== before) { svg = null; if (particles) { particles.stop(); particles = null; } load(false); }
          else if (scope === 'region' && svg && proj) { const xy = proj([l.lon, l.lat]); svg.select('.wm-loc').attr('cx', xy[0]).attr('cy', xy[1]); }
        },
        tick(now) {
          if (navigator.onLine && !loading && now - lastTry > STALE_MS && (!data || now - data.at > STALE_MS)) load(false);
          // when the clock passes into a new hour, move off the hour that has ended
          if (data && !playing) { const ni = nowIndex(); if (ni > hour) { hour = ni; safeDraw(); } }
          if (visible() && layer === 'wind' && animate && data && particles && !particles.running) particlesStart();
        }
      };
    }
  };
})();
