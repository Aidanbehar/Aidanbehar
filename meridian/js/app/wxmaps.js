/*
 * Meridian — interactive weather maps: temperature, precipitation, wind and air quality.
 *
 * Data: Open-Meteo bulk point forecasts ("best match" of national weather-service models such as ECMWF, NOAA GFS and
 * DWD ICON) and Open-Meteo air quality (Copernicus CAMS). We request a regular lat/lon grid (world or around the selected
 * location), bilinearly interpolate it into a smooth raster in an equirectangular projection, and overlay borders, wind
 * arrows and the selected location. Downloads are cached so the last maps stay viewable offline.
 */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  const W = 960, STALE_MS = 45 * 60000, HOURS = 48;
  const units = () => M.settings.wxUnits || (navigator.language === 'en-US' ? 'us' : 'metric');

  /* ---------- Colour scales (value in metric units) ---------- */
  const SCALES = {
    temp: { label: 'Temperature', unit: '°C', stops: [[-40, '#3b0a5c'], [-30, '#4a2fa8'], [-20, '#2457d6'], [-10, '#3d93e8'], [0, '#86d3f2'], [5, '#b9ecd6'], [10, '#e6f5a0'], [15, '#fde68a'], [20, '#fdbb4d'], [25, '#f9802f'], [30, '#e5461f'], [35, '#b3151f'], [45, '#5e0614']] },
    precip: { label: 'Precipitation', unit: 'mm/h', stops: [[0.1, '#b4e2f7'], [0.5, '#62b6f0'], [1, '#2f80e8'], [2.5, '#1d4fc3'], [5, '#6a30cf'], [10, '#b42bc9'], [20, '#e3329a'], [50, '#ff7043']], min: 0.1 },
    wind: { label: 'Wind speed', unit: 'km/h', stops: [[0, '#e8f1fb'], [10, '#a5d7f3'], [20, '#72d29a'], [35, '#f2dc55'], [50, '#f5a04b'], [70, '#e65d4a'], [90, '#b8336a'], [120, '#6b1e7a']] },
    aqi: { label: 'Air quality (US AQI)', unit: 'AQI', steps: [[0, 50, '#00e400', 'Good'], [51, 100, '#ffff00', 'Moderate'], [101, 150, '#ff7e00', 'Unhealthy for sensitive groups'], [151, 200, '#ff0000', 'Unhealthy'], [201, 300, '#8f3f97', 'Very unhealthy'], [301, 500, '#7e0023', 'Hazardous']] }
  };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (const s of Object.values(SCALES)) if (s.stops) s.rgb = s.stops.map(([v, c]) => [v, hex(c)]);
  SCALES.aqi.rgb = SCALES.aqi.steps.map(([a, b, c]) => [a, b, hex(c)]);
  function color(layer, v) {
    if (v == null || !Number.isFinite(v)) return null;
    const s = SCALES[layer];
    if (layer === 'aqi') { const st = s.rgb.find(([a, b]) => v <= b + 0.5) || s.rgb[s.rgb.length - 1]; return st[2]; }
    if (s.min != null && v < s.min) return null;
    const r = s.rgb;
    if (v <= r[0][0]) return r[0][1];
    for (let i = 1; i < r.length; i++) if (v <= r[i][0]) { const [a, ca] = r[i - 1], [b, cb] = r[i], t = (v - a) / (b - a); return ca.map((c, k) => Math.round(c + (cb[k] - c) * t)); }
    return r[r.length - 1][1];
  }
  const fmtVal = (layer, v) => {
    if (v == null || !Number.isFinite(v)) return '—';
    const us = units() === 'us';
    if (layer === 'temp') return us ? `${Math.round(v * 9 / 5 + 32)}°F` : `${Math.round(v)}°C`;
    if (layer === 'precip') return us ? `${(v / 25.4).toFixed(2)} in/h` : `${v.toFixed(1)} mm/h`;
    if (layer === 'wind') return us ? `${Math.round(v / 1.609)} mph` : `${Math.round(v)} km/h`;
    const st = SCALES.aqi.steps.find(([a, b]) => v <= b + 0.5) || SCALES.aqi.steps[5];
    return `${Math.round(v)} — ${st[3]}`;
  };
  const tickLabel = (layer, v) => {
    const us = units() === 'us';
    if (layer === 'temp') return us ? Math.round(v * 9 / 5 + 32) + '°' : v + '°';
    if (layer === 'precip') return us ? (v / 25.4).toFixed(v < 2.5 ? 2 : 1) : String(v);
    if (layer === 'wind') return us ? String(Math.round(v / 1.609)) : String(v);
    return String(v);
  };

  /* ---------- Grids ---------- */
  function worldGrid() {
    const lons = [], lats = [];
    for (let lon = -180; lon < 180; lon += 10) lons.push(lon);
    for (let lat = -56; lat <= 72; lat += 8) lats.push(lat);
    return { key: 'world', lons, lats, wrap: true, bbox: [-180, -60, 180, 76] };
  }
  function regionGrid(loc) {
    const c = Math.max(-70, Math.min(70, Math.round(loc.lat))), l0 = Math.round(loc.lon);
    const lats = [], lons = [];
    for (let i = -5; i <= 5; i++) lats.push(c + i * 2);
    for (let j = -8; j <= 8; j++) lons.push(l0 + j * 2);
    return { key: `region:${c},${l0}`, lons, lats, wrap: false, bbox: [lons[0], lats[0], lons[lons.length - 1], lats[lats.length - 1]], center: [loc.lon, loc.lat] };
  }
  const wrapLon = (x) => ((x + 540) % 360) - 180;

  /* ---------- Fetching (chunked bulk requests) ---------- */
  async function bulk(base, pts, vars) {
    const CH = 120, chunks = [];
    for (let i = 0; i < pts.length; i += CH) chunks.push(pts.slice(i, i + CH));
    const out = new Array(chunks.length);
    let next = 0;
    async function worker() {
      while (next < chunks.length) {
        const i = next++, c = chunks[i];
        const url = `${base}?latitude=${c.map(p => p[1].toFixed(2)).join(',')}&longitude=${c.map(p => wrapLon(p[0]).toFixed(2)).join(',')}&hourly=${vars}&forecast_days=3&timeformat=unixtime&timezone=GMT`;
        const r = await M.fetchJSON(url, { timeout: 25000 });
        out[i] = Array.isArray(r) ? r : [r];
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    return out.flat();
  }
  async function fetchGrid(grid) {
    const pts = [];
    for (const lat of grid.lats) for (const lon of grid.lons) pts.push([lon, lat]);
    const [wx, aq] = await Promise.allSettled([
      bulk('https://api.open-meteo.com/v1/forecast', pts, 'temperature_2m,precipitation,wind_speed_10m,wind_direction_10m'),
      bulk('https://air-quality-api.open-meteo.com/v1/air-quality', pts, 'us_aqi')
    ]);
    const nowH = Math.floor(Date.now() / 3600000) * 3600;
    const slice = (res, v) => {
      const times = res[0].hourly.time; let s = times.findIndex(t => t >= nowH); if (s < 0) s = 0;
      return { times: times.slice(s, s + HOURS), vals: res.map(r => (r.hourly[v] || []).slice(s, s + HOURS).map(x => x == null ? null : Math.round(x * 10) / 10)) };
    };
    const data = { grid: { lons: grid.lons, lats: grid.lats, wrap: grid.wrap, bbox: grid.bbox, key: grid.key }, at: Date.now() };
    if (wx.status === 'fulfilled') { const t = slice(wx.value, 'temperature_2m'); data.times = t.times; data.temp = t.vals; data.precip = slice(wx.value, 'precipitation').vals; data.wind = slice(wx.value, 'wind_speed_10m').vals; data.wdir = slice(wx.value, 'wind_direction_10m').vals; }
    else data.wxError = wx.reason.message;
    if (aq.status === 'fulfilled') { const a = slice(aq.value, 'us_aqi'); data.aqi = a.vals; data.aqiTimes = a.times; if (!data.times) data.times = a.times; }
    else data.aqiError = aq.reason.message;
    if (!data.times) throw new Error(data.wxError || data.aqiError || 'No map data returned.');
    return data;
  }

  /* ---------- Component ---------- */
  M.wxMaps = {
    mount(host, opts) {
      let layer = M.store.get('wxMapLayer', 'temp'), scope = 'region', hour = 0, playing = null, data = null, loading = false, loc = opts.getLoc(), lastTry = 0, reqId = 0;
      let svg, g, zoom, proj, rasterCache = {};
      host.innerHTML = `<div class="card">
        <div class="card-head"><h2>Weather maps</h2><span class="sub" id="wmStatus"></span></div>
        <div class="row" style="align-items:center;margin-bottom:10px">
          <div class="seg" role="tablist" aria-label="Map layer" id="wmLayers">${Object.entries(SCALES).map(([k, s]) => `<button role="tab" data-l="${k}">${{ temp: '🌡️ Temperature', precip: '🌧️ Precipitation', wind: '💨 Wind', aqi: '🫁 Air quality' }[k]}</button>`).join('')}</div>
          <div class="spacer"></div>
          <div class="seg" role="group" aria-label="Map area" id="wmScope"><button data-s="region">Around location</button><button data-s="world">World</button></div>
          <button class="btn btn-sm" id="wmRefresh">${M.icon('reset')} Refresh maps</button>
        </div>
        <div class="map-stage wm-stage" id="wmStage"><div class="empty" id="wmMsg" style="position:absolute;inset:0;display:grid;place-items:center">Loading map…</div>
          <div class="map-zoom"><button class="icon-btn" id="wmIn" aria-label="Zoom in">${M.icon('plus')}</button><button class="icon-btn" id="wmOut" aria-label="Zoom out">${M.icon('minus')}</button><button class="icon-btn" id="wmReset" aria-label="Reset view">${M.icon('reset')}</button></div></div>
        <div class="wm-legend" id="wmLegend" aria-label="Colour key"></div>
        <div class="row" style="align-items:center;margin-top:10px">
          <button class="btn btn-sm" id="wmPlay" aria-label="Play forecast animation">▶ Play</button>
          <input type="range" id="wmTime" min="0" max="${HOURS - 1}" value="0" style="flex:1 1 260px" aria-label="Forecast hour">
          <div class="small strong tabular" id="wmTimeLbl" style="min-width:210px"></div>
        </div>
        <p class="tiny muted" id="wmNote" style="margin:8px 0 0"></p>
      </div>`;
      const $ = (s) => host.querySelector(s);
      const tip = () => document.getElementById('tooltip');

      function gridOf() { return scope === 'world' ? worldGrid() : regionGrid(loc); }
      const cacheKey = () => scope === 'world' ? 'wxgrid.world' : 'wxgrid.region';

      async function load(force) {
        const grid = gridOf();
        const cached = M.store.get(cacheKey(), null);
        if (cached && cached.grid.key === grid.key) { data = cached; draw(); }
        else { data = null; draw(); }
        const fresh = data && Date.now() - data.at < STALE_MS;
        if ((!force && fresh) || !navigator.onLine || loading) { status(); return; }
        loading = true; lastTry = Date.now(); const id = ++reqId; status('Downloading map data…');
        try {
          const d = await fetchGrid(grid);
          if (id !== reqId) return;
          data = d; rasterCache = {};
          if (!M.store.set(cacheKey(), d)) { M.store.remove('wxgrid.world'); M.store.remove('wxgrid.region'); M.store.set(cacheKey(), d); }
        } catch (e) { if (id === reqId) { status(null, e.message); loading = false; draw(); return; } }
        finally { if (id === reqId) loading = false; }
        draw();
      }
      function status(msg, err) {
        const el = $('#wmStatus'); if (!el) return;
        const age = data ? Math.round((Date.now() - data.at) / 60000) : null;
        el.innerHTML = msg ? esc(msg) : err ? `<span class="err-text">Couldn’t update: ${esc(err)}</span>${data ? ` · showing saved maps (${age} min old)` : ''}` : data ? `${navigator.onLine ? '' : '<span class="badge amber">Offline</span> '}updated ${age < 1 ? 'just now' : age < 120 ? age + ' min ago' : Math.round(age / 60) + ' h ago'}` : navigator.onLine ? '' : '<span class="badge amber">Offline</span> no saved maps for this area yet';
      }

      function buildSvg() {
        const stage = $('#wmStage');
        stage.querySelectorAll(':scope > svg').forEach(s => s.remove()); // keep the zoom buttons' icons
        if (typeof d3 === 'undefined' || !window.MERIDIAN_COUNTRIES_TOPO) { $('#wmMsg').textContent = 'Map libraries unavailable.'; return false; }
        const grid = gridOf();
        const [x0, y0, x1, y1] = grid.bbox;
        const H = Math.round(W * (y1 - y0) / (x1 - x0));
        stage.style.aspectRatio = `${W} / ${H}`;
        proj = d3.geoEquirectangular().fitExtent([[0, 0], [W, H]], { type: 'MultiPoint', coordinates: [[x0, y0], [x1, y1]] });
        const path = d3.geoPath(proj);
        const C = window.MERIDIAN_COUNTRIES_TOPO;
        svg = d3.select(stage).insert('svg', '.map-zoom').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Weather map. Hover for values, click to load the forecast for a point.');
        svg.append('defs').append('clipPath').attr('id', 'wmClip').append('rect').attr('width', W).attr('height', H);
        g = svg.append('g').attr('clip-path', 'url(#wmClip)');
        g.append('rect').attr('class', 'wm-ocean').attr('x', -W).attr('y', -H).attr('width', 3 * W).attr('height', 3 * H);
        const land = topojson.feature(C, C.objects.land);
        g.append('path').attr('class', 'wm-land').attr('d', path(land));
        g.append('image').attr('class', 'wm-raster').attr('preserveAspectRatio', 'none');
        g.append('path').attr('class', 'country').attr('d', path(topojson.mesh(C, C.objects.countries, (a, b) => a !== b)));
        g.append('path').attr('class', 'coast').attr('d', path(land));
        g.append('g').attr('class', 'wm-arrows');
        if (scope === 'region') { const xy = proj([loc.lon, loc.lat]); g.append('circle').attr('class', 'wm-loc').attr('cx', xy[0]).attr('cy', xy[1]).attr('r', 5); }
        zoom = d3.zoom().scaleExtent([1, 10]).translateExtent([[0, 0], [W, H]]).on('zoom', (ev) => { g.attr('transform', ev.transform); g.selectAll('.wm-arrows path').attr('stroke-width', 1.2 / ev.transform.k); g.select('.wm-loc').attr('r', 5 / Math.sqrt(ev.transform.k)); });
        svg.call(zoom).on('dblclick.zoom', null);
        svg.on('mousemove', onMove).on('mouseleave', () => { tip().hidden = true; }).on('click', onClick);
        return true;
      }

      /** Bilinear interpolation on the regular grid (wraps longitude for the world grid). */
      function sample(arr, lon, lat) {
        if (!data || !arr) return null;
        const { lons, lats, wrap } = data.grid, nx = lons.length, ny = lats.length;
        const dx = lons[1] - lons[0], dy = lats[1] - lats[0];
        let fx = (lon - lons[0]) / dx, fy = (lat - lats[0]) / dy;
        if (wrap) fx = TE.mod(fx, nx); else fx = Math.max(0, Math.min(nx - 1, fx));
        fy = Math.max(0, Math.min(ny - 1, fy));
        const i0 = Math.floor(fx), j0 = Math.floor(fy), tx = fx - i0, ty = fy - j0;
        const i1 = wrap ? (i0 + 1) % nx : Math.min(nx - 1, i0 + 1), j1 = Math.min(ny - 1, j0 + 1);
        const v = (i, j) => { const a = arr[j * nx + i]; return a ? a[hour] : null; };
        const q = [[v(i0, j0), (1 - tx) * (1 - ty)], [v(i1, j0), tx * (1 - ty)], [v(i0, j1), (1 - tx) * ty], [v(i1, j1), tx * ty]].filter(([x]) => x != null && Number.isFinite(x));
        if (!q.length) return null;
        const wsum = q.reduce((s, [, w]) => s + w, 0);
        return wsum ? q.reduce((s, [x, w]) => s + x * w, 0) / wsum : q[0][0];
      }
      function raster() {
        const key = `${layer}|${hour}|${data.grid.key}|${data.at}`;
        if (rasterCache[key]) return rasterCache[key];
        const [x0, y0, x1, y1] = data.grid.bbox;
        const cw = scope === 'world' ? 360 : 256, ch = Math.round(cw * (y1 - y0) / (x1 - x0));
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        const ctx = cv.getContext('2d'), img = ctx.createImageData(cw, ch);
        const arr = data[layer];
        for (let py = 0; py < ch; py++) {
          const lat = y1 - (py + 0.5) / ch * (y1 - y0);
          for (let px = 0; px < cw; px++) {
            const lon = x0 + (px + 0.5) / cw * (x1 - x0);
            const v = sample(arr, lon, lat);
            const o = (py * cw + px) * 4;
            if (layer === 'precip') {
              // fade light rain in gradually so rain areas have soft edges instead of hard cut-offs
              if (v == null || v < 0.02) continue;
              const c = color('precip', Math.max(0.1, v));
              img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = Math.round(215 * Math.min(1, (v - 0.02) / 0.25));
              continue;
            }
            const c = color(layer, v);
            if (c) { img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 190; }
          }
        }
        ctx.putImageData(img, 0, 0);
        return (rasterCache[key] = cv.toDataURL());
      }

      function draw() {
        layer = layer in SCALES ? layer : 'temp';
        host.querySelectorAll('#wmLayers [data-l]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.l === layer)));
        host.querySelectorAll('#wmScope [data-s]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === scope)));
        legend(); status();
        const msg = $('#wmMsg');
        const builtFor = svg && svg.node().isConnected && svg.attr('data-key');
        const want = `${scope}|${scope === 'region' ? gridOf().key : ''}`;
        if (builtFor !== want) { if (!buildSvg()) return; svg.attr('data-key', want); }
        if (!data) { msg.hidden = false; msg.innerHTML = loading ? '<div class="skeleton" style="width:200px"></div>' : navigator.onLine ? 'Map data unavailable. Use “Refresh maps” to try again.' : 'Offline — maps will download when you reconnect.'; g.select('.wm-raster').attr('href', null); g.select('.wm-arrows').html(''); timeLbl(); return; }
        if (!data[layer]) { msg.hidden = false; msg.textContent = `${SCALES[layer].label} data is unavailable right now (${layer === 'aqi' ? data.aqiError || '' : data.wxError || ''}).`; g.select('.wm-raster').attr('href', null); g.select('.wm-arrows').html(''); timeLbl(); return; }
        msg.hidden = true;
        hour = Math.min(hour, data.times.length - 1);
        $('#wmTime').max = data.times.length - 1; $('#wmTime').value = hour;
        const [x0, y0, x1, y1] = data.grid.bbox, a = proj([x0, y1]), b = proj([x1, y0]);
        g.select('.wm-raster').attr('href', raster()).attr('x', a[0]).attr('y', a[1]).attr('width', b[0] - a[0]).attr('height', b[1] - a[1]);
        // wind arrows: point the way the wind blows (meteorological direction is where it comes from)
        const ar = g.select('.wm-arrows'); ar.html('');
        if (layer === 'wind' && data.wdir) {
          const { lons, lats } = data.grid, k = d3.zoomTransform(svg.node()).k;
          lats.forEach((lat, j) => lons.forEach((lon, i) => {
            const sp = data.wind[j * lons.length + i] && data.wind[j * lons.length + i][hour], dir = data.wdir[j * lons.length + i] && data.wdir[j * lons.length + i][hour];
            if (sp == null || dir == null) return;
            const [x, y] = proj([lon, lat]), len = 5 + Math.min(16, sp / 4), th = (dir + 180) * Math.PI / 180;
            const dx = Math.sin(th) * len, dy = -Math.cos(th) * len;
            const hx = x + dx / 2, hy = y + dy / 2, ang = Math.atan2(dy, dx);
            ar.append('path').attr('d', `M${x - dx / 2},${y - dy / 2}L${hx},${hy}M${hx},${hy}L${hx - 4 * Math.cos(ang - 0.5)},${hy - 4 * Math.sin(ang - 0.5)}M${hx},${hy}L${hx - 4 * Math.cos(ang + 0.5)},${hy - 4 * Math.sin(ang + 0.5)}`).attr('stroke-width', 1.2 / k);
          }));
        }
        timeLbl();
        $('#wmNote').innerHTML = `${layer === 'aqi' ? 'US AQI computed from the Copernicus Atmosphere Monitoring Service (CAMS) model' : 'Forecast model data (“best match” of national weather-service models: ECMWF, NOAA GFS, DWD ICON and others)'} via Open-Meteo. ${scope === 'world' ? '10° × 8° grid' : '2° grid around the selected location'}, smoothly interpolated between points — a forecast field, not observations. ${layer === 'precip' ? 'Shows precipitation during each hour; blank means none forecast. ' : ''}${layer === 'wind' ? 'Arrows point where the wind is blowing toward; colour shows 10 m wind speed. ' : ''}Hover for values; click to load that point’s full forecast.`;
      }
      function timeLbl() {
        const el = $('#wmTimeLbl'); if (!data || !data.times) { el.textContent = ''; return; }
        const t = data.times[hour] * 1000, w = TE.toZoned(M.localZone(), t);
        el.textContent = `${TE.WEEKDAYS_SHORT[w.weekday]} ${M.fmtTime(w)} your time · ${hour === 0 ? 'now' : '+' + hour + ' h'}`;
      }
      function legend() {
        const s = SCALES[layer], el = $('#wmLegend');
        const us = units() === 'us';
        const unit = layer === 'temp' ? (us ? '°F' : '°C') : layer === 'precip' ? (us ? 'in/h' : 'mm/h') : layer === 'wind' ? (us ? 'mph' : 'km/h') : 'US AQI';
        if (layer === 'aqi') { el.innerHTML = `<div class="wm-key-title">${esc(s.label)}</div><div class="wm-aqi">${s.steps.map(([a, b, c, n]) => `<div><i style="background:${c}"></i><b>${a}–${b === 500 ? '500' : b}</b><span>${esc(n)}</span></div>`).join('')}</div>`; return; }
        const stops = s.stops;
        // place stops evenly so every colour band is visible
        const grad = stops.map(([v, c], i) => `${c} ${(i / (stops.length - 1) * 100).toFixed(1)}%`).join(',');
        el.innerHTML = `<div class="wm-key-title">${esc(s.label)} <span class="muted">(${unit})</span></div><div class="wm-bar" style="background:linear-gradient(90deg,${grad})"></div><div class="wm-ticks">${stops.map(([v]) => `<span>${esc(tickLabel(layer, v))}</span>`).join('')}</div>${layer === 'precip' ? '<div class="tiny muted">Below 0.1 mm/h: not shaded</div>' : ''}`;
      }
      function lonLatAt(ev) { const [x, y] = d3.pointer(ev, g.node()); return proj.invert([x, y]); }
      function onMove(ev) {
        if (!data || !data[layer]) return;
        const ll = lonLatAt(ev); if (!ll) return;
        const [lon, lat] = ll, [x0, y0, x1, y1] = data.grid.bbox;
        if (lat < y0 || lat > y1 || (!data.grid.wrap && (lon < x0 || lon > x1))) { tip().hidden = true; return; }
        const v = sample(data[layer], lon, lat);
        let extra = '';
        if (layer === 'wind' && data.wdir) { const d = sample(data.wdir, lon, lat); extra = d == null ? '' : ` from ${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(TE.mod(d, 360) / 45) % 8]}`; }
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
        if (ev.defaultPrevented) return;
        const ll = lonLatAt(ev); if (!ll) return;
        tip().hidden = true;
        opts.onPick({ lat: Math.max(-89, Math.min(89, ll[1])), lon: wrapLon(ll[0]) });
      }

      host.querySelector('#wmLayers').addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (b) { layer = b.dataset.l; M.store.set('wxMapLayer', layer); draw(); } });
      host.querySelector('#wmScope').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b && b.dataset.s !== scope) { scope = b.dataset.s; svg = null; load(false); } });
      $('#wmRefresh').addEventListener('click', () => load(true));
      $('#wmTime').addEventListener('input', (e) => { hour = +e.target.value; draw(); });
      $('#wmPlay').addEventListener('click', () => {
        if (playing) { clearInterval(playing); playing = null; $('#wmPlay').textContent = '▶ Play'; return; }
        $('#wmPlay').textContent = '❚❚ Pause';
        playing = setInterval(() => { if (!data || host.closest('.view').hidden) return; hour = (hour + 1) % data.times.length; draw(); }, 650);
      });
      $('#wmIn').addEventListener('click', () => svg && svg.transition().duration(250).call(zoom.scaleBy, 1.6));
      $('#wmOut').addEventListener('click', () => svg && svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6));
      $('#wmReset').addEventListener('click', () => svg && svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));
      window.addEventListener('online', () => { if (!host.closest('.view').hidden) load(false); });
      window.addEventListener('offline', () => status());
      M.onSettings((k) => { if (k === 'wxUnits' || k === 'hour12' || k === 'theme') draw(); });

      M.loadScript('data/countries-map.js').then(() => load(false)).catch(e => { $('#wmMsg').textContent = 'Map data failed to load: ' + e.message; });
      return {
        setLocation(l) { const before = scope === 'region' ? gridOf().key : null; loc = l; if (scope === 'region' && regionGrid(l).key !== before) { svg = null; load(false); } else if (scope === 'region' && svg) { const xy = proj([l.lon, l.lat]); svg.select('.wm-loc').attr('cx', xy[0]).attr('cy', xy[1]); } },
        tick(now) { if (navigator.onLine && !loading && now - lastTry > STALE_MS && (!data || now - data.at > STALE_MS)) load(false); }
      };
    }
  };
})();
