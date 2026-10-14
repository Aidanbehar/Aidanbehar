/* Meridian — Interactive world time-zone map (d3-geo + Natural Earth time-zone polygons) */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc, D = M.D;
  const W = 960, H = 500;
  let root, svg, g, zoom, projection, path, features = [], cityXY = [], selected = null, legendFilter = null, mapReady = false, picker, showNight = true, showLabels = true;
  let lastNightMinute = -1, lastPanelKey = '';
  // Harmonious cyclic palette; adjacent whole-hour offsets always get different hues.
  const PALETTE = ['#6c8cff', '#4fc1b0', '#f2b85b', '#e78a8a', '#9b84f0', '#62b6e8', '#a6cf6a', '#f09bc8'];
  const PALETTE_DARK = ['#4d67d6', '#2f9c8d', '#c99238', '#c36464', '#7b63cf', '#3f93c4', '#7fa84a', '#c9739f'];
  const colorFor = (offSec) => {
    const pal = M.isDark() ? PALETTE_DARK : PALETTE;
    const hours = offSec / 3600;
    const base = pal[TE.mod(Math.floor(hours), 8)];
    if (offSec % 3600 === 0) return base;
    return mix(base, pal[TE.mod(Math.floor(hours) + 1, 8)], 0.5); // fractional offsets: blend with the next hour
  };
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (p, s) => (p >> s) & 255;
    const c = (s) => Math.round(ch(pa, s) * (1 - t) + ch(pb, s) * t);
    return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
  }
  const COMPARE = ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'];

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('map', 'Interactive Time-Zone Map', 'Hover to preview, click anywhere to inspect the local time-zone rules there. Times always come from the IANA time-zone database for a specific location, so countries with several zones — and neighbours with different daylight-saving rules — are handled correctly.')}
      <div class="map-layout">
        <div class="card map-card">
          <div class="map-toolbar">
            <div id="mapSearch"></div>
            <label class="check"><input type="checkbox" id="mapNight" checked> Day/night</label>
            <label class="check"><input type="checkbox" id="mapLabels" checked> City labels</label>
            <label class="check" title="Real satellite imagery of the Earth (NASA Blue Marble via NASA GIBS)"><input type="checkbox" id="mapSat"> Satellite</label>
          </div>
          <div class="map-stage" id="mapStage">
            <div class="empty" id="mapLoading" style="position:absolute;inset:0;display:grid;place-items:center">Loading map data…</div>
            <div class="map-zoom">
              <button class="icon-btn" id="zIn" aria-label="Zoom in">${M.icon('plus')}</button>
              <button class="icon-btn" id="zOut" aria-label="Zoom out">${M.icon('minus')}</button>
              <button class="icon-btn" id="zReset" aria-label="Reset view" title="Reset view">${M.icon('reset')}</button>
            </div>
            <div class="map-attr" id="mapAttr"></div>
          </div>
          <div class="map-legend" id="mapLegend" role="group" aria-label="Legend: standard UTC offsets (click to highlight)"></div>
          <div class="map-foot">Colours show each region’s <b>standard</b> UTC offset (from the current IANA rules of the cities inside it, or the map data’s nominal offset where no city is listed). Polygons: <a href="https://www.naturalearthdata.com/downloads/10m-cultural-vectors/timezones/" target="_blank" rel="noopener">Natural Earth 1:10m time zones</a> (public domain, c. 2012, simplified) — they are nominal offset regions, so recent legal changes and small enclaves may not be reflected. Clicking resolves to the nearest listed city in the region; the panel always uses that city’s live IANA rules. Shaded area = night (approximate terminator).</div>
        </div>
        <div class="card map-panel" id="mapPanel" aria-live="polite"></div>
      </div>`;
    picker = M.zonePicker(M.$('#mapSearch', el), { placeholder: 'Find a city, country or time zone…', noMeta: true, includeFixed: false, onChange: (r) => selectRef(r, true) });
    M.$('#mapNight', el).addEventListener('change', (e) => { showNight = e.target.checked; drawNight(true); });
    M.$('#mapLabels', el).addEventListener('change', (e) => { showLabels = e.target.checked; updateLabels(); });
    const satBox = M.$('#mapSat', el);
    if (M.basemap) {
      satBox.checked = M.basemap.enabled();
      satBox.addEventListener('change', (e) => M.basemap.setEnabled(e.target.checked));
      M.basemap.onChange((v) => { satBox.checked = v; loadSat(); });
    } else satBox.closest('label').hidden = true;
    M.$('#mapPanel', el).addEventListener('click', onPanelClick);
    M.bindCopy(M.$('#mapPanel', el));
    renderPanelEmpty();
    loadMap();
    M.onSettings((k) => { if (k === 'theme' && mapReady) recolor(); lastPanelKey = ''; });
  }

  async function loadMap() {
    try {
      if (typeof d3 === 'undefined' || typeof topojson === 'undefined') throw new Error('Mapping libraries (d3/topojson) failed to load.');
      await Promise.all([M.loadScript('data/timezones-map.js'), M.loadScript('data/countries-map.js')]);
      if (!window.MERIDIAN_TZ_TOPO || !window.MERIDIAN_COUNTRIES_TOPO) throw new Error('Map data files are missing.');
      build();
    } catch (e) {
      console.error(e);
      M.$('#mapLoading', root).innerHTML = `<div class="note error" style="max-width:520px">The map could not be displayed: ${esc(e.message)}<br>You can still search for any city or time zone above — the information panel works without the map.</div>`;
    }
  }

  function rewind(f) {
    // d3 uses spherical winding: a polygon whose area exceeds a hemisphere is inside-out. Fix each polygon separately.
    const fix = (rings) => (d3.geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI ? rings.map(r => r.slice().reverse()) : rings);
    const g0 = f.geometry;
    if (!g0) return f;
    if (g0.type === 'Polygon') g0.coordinates = fix(g0.coordinates);
    else if (g0.type === 'MultiPolygon') g0.coordinates = g0.coordinates.map(fix);
    return f;
  }

  function build() {
    const TZ = window.MERIDIAN_TZ_TOPO, C = window.MERIDIAN_COUNTRIES_TOPO;
    const tzObj = TZ.objects[Object.keys(TZ.objects)[0]];
    features = topojson.feature(TZ, tzObj).features.map(rewind);
    const land = topojson.feature(C, C.objects.land);
    if (land.features) land.features.forEach(rewind); else rewind(land);
    const borders = topojson.mesh(C, C.objects.countries, (a, b) => a !== b);
    projection = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' });
    path = d3.geoPath(projection);
    const now = Date.now();
    // Resolve each polygon: cities inside, representative zone, standard offset used for colouring.
    for (const f of features) {
      const p = f.properties;
      f.cities = D.CITIES.filter(c => d3.geoContains(f, [c.lon, c.lat]));
      const stdOffsets = {};
      for (const c of f.cities) { const s = TE.dstInfo({ kind: 'iana', id: c.zone }, now).standardSec; stdOffsets[s] = (stdOffsets[s] || 0) + 1; }
      const modeStd = Object.keys(stdOffsets).sort((a, b) => stdOffsets[b] - stdOffsets[a])[0];
      f.nominalSec = Math.round(p.zone * 3600);
      f.stdSec = modeStd != null ? +modeStd : f.nominalSec;
      const tzn = p.tz_name1st && TE.isValidIanaZone(p.tz_name1st) ? p.tz_name1st : null;
      f.zoneId = f.cities[0] ? f.cities[0].zone : tzn || etcZone(f.nominalSec);
      f.bounds = d3.geoBounds(f);
    }
    cityXY = D.CITIES.map(c => ({ c, xy: projection([c.lon, c.lat]) }));
    M.$('#mapLoading', root).remove();
    svg = d3.select('#mapStage').insert('svg', '.map-zoom').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'World map of time zones. Use the search box to select a location with the keyboard.');
    const defs = svg.append('defs');
    defs.append('clipPath').attr('id', 'landClip').append('path').attr('d', path(land));
    defs.append('clipPath').attr('id', 'sphereClip').append('path').attr('d', path({ type: 'Sphere' }));
    g = svg.append('g');
    g.append('path').attr('class', 'sphere').attr('d', path({ type: 'Sphere' }));
    const satG = g.append('g').attr('clip-path', 'url(#sphereClip)');
    satG.append('image').attr('class', 'sat').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H).attr('preserveAspectRatio', 'none');
    satG.append('image').attr('class', 'sat-detail').attr('preserveAspectRatio', 'none');
    g.append('path').attr('class', 'graticule').attr('d', path(d3.geoGraticule10()));
    const sea = g.append('g').attr('class', 'tz-sea-g').attr('clip-path', 'url(#sphereClip)');
    sea.selectAll('path').data(features).join('path').attr('class', 'tz tz-sea').attr('d', path)
      .on('mousemove', onHover).on('mouseleave', onLeave).on('click', onClickMap);
    const landG = g.append('g').attr('clip-path', 'url(#landClip)');
    landG.selectAll('path').data(features).join('path').attr('class', 'tz tz-land').attr('d', path);
    g.append('path').attr('class', 'coast').attr('d', path(land));
    g.append('path').attr('class', 'country').attr('d', path(borders));
    g.append('path').attr('class', 'night');
    g.append('path').attr('class', 'hover-outline sel-outline').style('stroke-dasharray', 'none').style('stroke-width', 1.4).style('opacity', .7);
    g.append('path').attr('class', 'sel-outline');
    const cityG = g.append('g').attr('class', 'cities');
    cityG.selectAll('circle').data(cityXY.filter(d => d.xy)).join('circle').attr('class', 'city-dot').attr('cx', d => d.xy[0]).attr('cy', d => d.xy[1]).attr('r', 1.8)
      .on('click', (ev, d) => { ev.stopPropagation(); selectRef(M.cityRef(d.c), false); })
      .on('mousemove', (ev, d) => showTip(ev, M.cityRef(d.c), null)).on('mouseleave', onLeave)
      .append('title').text(d => `${d.c.name} (${d.c.zone})`);
    cityG.selectAll('text').data(cityXY.filter(d => d.xy)).join('text').attr('class', 'city-label').attr('x', d => d.xy[0] + 3.5).attr('y', d => d.xy[1] + 3).text(d => d.c.name.replace(/ \(.*\)$/, ''));
    g.append('circle').attr('class', 'sel-dot').attr('r', 4).attr('fill', 'var(--amber)').attr('stroke', 'var(--text)').attr('stroke-width', 1.2).style('vector-effect', 'non-scaling-stroke').style('display', 'none');
    zoom = d3.zoom().scaleExtent([1, satOk || (M.basemap && M.basemap.enabled()) ? MAX_K : 14]).translateExtent([[0, 0], [W, H]]).on('zoom', (ev) => { g.attr('transform', ev.transform); updateLabels(ev.transform.k); M.$('#mapStage', root).classList.toggle('deep', ev.transform.k > 150); }).on('end', scheduleDetail);
    svg.call(zoom).on('dblclick.zoom', null);
    M.$('#zIn', root).addEventListener('click', () => svg.transition().duration(250).call(zoom.scaleBy, 2.2));
    M.$('#zOut', root).addEventListener('click', () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 2.2));
    M.$('#zReset', root).addEventListener('click', () => svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity));
    mapReady = true;
    loadSat();
    recolor(); updateLabels(1); drawNight(true); renderLegend();
    if (selected) {
      if (!selected.feature) { const ff = featureFor(selected.ref); if (ff) { selected.feature = ff.f; selected.clickLL = ff.ll; } }
      highlightSelected(!!selected.zoom); lastPanelKey = ''; renderPanel(Date.now(), true);
    }
  }
  const etcZone = (sec) => sec % 3600 === 0 && Math.abs(sec) <= 12 * 3600 ? (sec === 0 ? 'Etc/UTC' : `Etc/GMT${sec > 0 ? '-' : '+'}${Math.abs(sec / 3600)}`) : null;

  /* ---------- Satellite basemap: NASA Blue Marble (GIBS) reprojected to Natural Earth ---------- */
  const MAX_K = 50000; // ≈ Esri zoom 18 on a typical screen: individual buildings
  let satOk = false, satToken = 0, detailToken = 0, detailTimer = null;
  function setSat(ok, note) {
    satOk = ok;
    M.$('#mapStage', root).classList.toggle('has-sat', ok);
    M.$('#mapAttr', root).textContent = note || '';
    if (zoom && svg) {
      zoom.scaleExtent([1, ok ? MAX_K : 14]);
      if (!ok && d3.zoomTransform(svg.node()).k > 14) svg.call(zoom.scaleTo, 14);
    }
    recolor();
  }
  async function loadSat() {
    if (!mapReady) return;
    const tok = ++satToken;
    g.select('.sat').attr('href', null); g.select('.sat-detail').attr('href', null);
    if (!M.basemap || !M.basemap.enabled()) { setSat(false); return; }
    M.$('#mapAttr', root).textContent = 'Loading satellite imagery…';
    try {
      const SW = 2048, src = await M.basemap.equirect([-180, -90, 180, 90], SW, SW / 2, { keep: true });
      if (tok !== satToken) return;
      const k = 2, out = M.basemap.reproject(src, [-180, -90, 180, 90], W * k, H * k, (x, y) => projection.invert([x / k, y / k]));
      if (tok !== satToken) return;
      g.select('.sat').attr('href', M.basemap.toURL(out));
      setSat(true, M.basemap.ATTR);
      scheduleDetail();
    } catch (e) {
      if (tok === satToken) setSat(false, navigator.onLine === false ? 'Satellite imagery not saved for offline use yet' : 'Satellite imagery unavailable: ' + e.message);
    }
  }
  function scheduleDetail() { clearTimeout(detailTimer); detailTimer = setTimeout(loadDetail, 350); }
  /** When zoomed in, re-render just the visible area from a sharper image so the satellite view stays crisp. */
  async function loadDetail() {
    if (!mapReady || !satOk) return;
    const tok = ++detailToken, t = d3.zoomTransform(svg.node()), det = g.select('.sat-detail');
    if (t.k < 1.8) { det.attr('href', null); M.$('#mapAttr', root).textContent = M.basemap.ATTR; return; }
    const vx0 = -t.x / t.k, vy0 = -t.y / t.k, vw = W / t.k, vh = H / t.k;
    let lo0 = 180, lo1 = -180, la0 = 90, la1 = -90, n = 0;
    for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {
      const p = [vx0 + vw * i / 12, vy0 + vh * j / 12], ll = projection.invert(p);
      if (!ll) continue;
      const back = projection(ll);
      if (!back || Math.hypot(back[0] - p[0], back[1] - p[1]) > 0.5) continue; // outside the globe outline
      lo0 = Math.min(lo0, ll[0]); lo1 = Math.max(lo1, ll[0]); la0 = Math.min(la0, ll[1]); la1 = Math.max(la1, ll[1]); n++;
    }
    if (!n) return;
    const padX = (lo1 - lo0) * 0.08 + 1e-5, padY = (la1 - la0) * 0.08 + 1e-5;
    lo0 = Math.max(-180, lo0 - padX); lo1 = Math.min(180, lo1 + padX); la0 = Math.max(-90, la0 - padY); la1 = Math.min(90, la1 + padY);
    const stage = M.$('#mapStage', root), dpr = Math.min(2, window.devicePixelRatio || 1);
    const ow = Math.min(2048, Math.round(stage.clientWidth * dpr)), oh = Math.round(ow * H / W);
    const inv = (x, y) => projection.invert([vx0 + x / ow * vw, vy0 + y / oh * vh]);
    try {
      let out, attr = M.basemap.ATTR;
      if (t.k >= 6) {
        // close zoom: high-resolution Esri World Imagery tiles (down to individual buildings)
        const z = M.basemap.zoomFor((lo1 - lo0) / (ow * 0.9), lo1 - lo0, la1 - la0);
        const mo = await M.basemap.mercMosaic(lo0, la0, lo1, la1, z);
        if (tok !== detailToken) return;
        out = M.basemap.reproject(mo.canvas, mo.bbox, ow, oh, inv, true);
        attr = M.basemap.TILES.attribution;
      } else {
        const pw = Math.min(2048, Math.round(ow * 1.25)), ph = Math.max(8, Math.min(2048, Math.round(pw * (la1 - la0) / Math.max(0.01, lo1 - lo0))));
        const src = await M.basemap.equirect([lo0, la0, lo1, la1], pw, ph);
        if (tok !== detailToken) return;
        out = M.basemap.reproject(src, [lo0, la0, lo1, la1], ow, oh, inv);
      }
      if (tok !== detailToken) return;
      det.attr('href', M.basemap.toURL(out)).attr('x', vx0).attr('y', vy0).attr('width', vw).attr('height', vh);
      M.$('#mapAttr', root).textContent = attr;
    } catch (e) { /* keep the base image */ }
  }

  function recolor() {
    if (!mapReady) return;
    g.selectAll('.tz').attr('fill', d => colorFor(d.stdSec)).style('opacity', function (d) {
      const base = this.classList.contains('tz-sea') ? (satOk ? .14 : .28) : (satOk ? .4 : 1);
      return legendFilter == null || d.stdSec === legendFilter ? base : base * .18;
    });
  }
  function renderLegend() {
    const offs = [...new Set(features.map(f => f.stdSec))].sort((a, b) => a - b);
    M.$('#mapLegend', root).innerHTML = offs.map(o => `<button data-off="${o}" class="${legendFilter === o ? 'active' : ''}" title="Highlight regions on ${TE.formatOffset(o)} standard time" aria-pressed="${legendFilter === o}"><i style="background:${colorFor(o)}"></i>${TE.formatOffset(o, { prefix: '' }).replace(':00', '').replace(/^\+00$/, '±0')}</button>`).join('');
    M.$('#mapLegend', root).onclick = (e) => {
      const b = e.target.closest('[data-off]'); if (!b) return;
      const o = +b.dataset.off; legendFilter = legendFilter === o ? null : o; recolor(); renderLegend();
    };
  }
  function updateLabels(k) {
    if (!mapReady) return;
    k = k || d3.zoomTransform(svg.node()).k;
    const grow = Math.sqrt(Math.min(k, 14)) * Math.max(1, k / 14); // dots grow a little up to 14×, then keep a constant screen size
    g.selectAll('.city-dot').attr('r', 2.2 / grow);
    g.selectAll('.city-label').style('font-size', `${10 / k}px`).style('stroke-width', `${3 / k}px`)
      .attr('x', d => d.xy[0] + 3.5 / k).attr('y', d => d.xy[1] + 3 / k)
      .style('display', d => showLabels && (d.c.rank < (k < 1.5 ? 12 : k < 3 ? 45 : k < 6 ? 140 : 999)) ? null : 'none');
    g.select('.sel-dot').attr('r', 4.5 / grow);
  }
  function drawNight(force) {
    if (!mapReady) return;
    const minute = Math.floor(Date.now() / 60000);
    if (!force && minute === lastNightMinute) return;
    lastNightMinute = minute;
    const sun = TE.sunPosition(Date.now());
    const night = d3.geoCircle().center([sun.lon + 180, -sun.lat]).radius(90)();
    g.select('.night').attr('d', showNight ? path(night) : null);
  }

  /* ---------- Interaction ---------- */
  const tip = () => document.getElementById('tooltip');
  function nearestCity(lonlat, feature, countryOnly) {
    let best = null, bd = Infinity;
    const pool = feature && feature.cities.length ? feature.cities : D.CITIES;
    for (const c of pool) { const d = d3.geoDistance(lonlat, [c.lon, c.lat]); if (d < bd) { bd = d; best = c; } }
    return best ? { city: best, dist: bd * 6371 } : null;
  }
  function onHover(ev, f) {
    g.select('.hover-outline').attr('d', path(f));
    const [x, y] = d3.pointer(ev, g.node());
    const ll = projection.invert([x, y]);
    const n = ll ? nearestCity(ll, f) : null;
    const ref = n && f.cities.length ? M.cityRef(n.city) : (f.zoneId ? M.ianaRef(f.zoneId) : M.fixedRef(f.nominalSec));
    showTip(ev, ref, f);
  }
  function showTip(ev, ref, f) {
    const t = tip(), now = Date.now();
    const w = TE.toZoned(ref, now);
    const places = f && f.properties.places ? f.properties.places : '';
    t.innerHTML = `<div class="tt-title">${esc(M.refShort(ref))}${ref.country ? ', ' + esc(ref.country) : ''}</div><div class="tt-time">${esc(M.fmtTime(w))} <span class="small muted">${esc(TE.WEEKDAYS_SHORT[w.weekday])} ${esc(TE.MONTHS_SHORT[w.m - 1])} ${w.d}</span></div><div class="small">${esc(TE.formatOffset(w.offsetSec))}${ref.kind === 'iana' ? ' · ' + esc(ref.id) : ''}</div>${f ? `<div class="tiny muted" style="margin-top:4px">Region: ${esc(TE.formatOffset(f.stdSec))} standard${places ? ' · ' + esc(places.slice(0, 90)) + (places.length > 90 ? '…' : '') : ''}</div>` : ''}<div class="tiny muted">Click for details</div>`;
    t.hidden = false;
    const pad = 14, rect = t.getBoundingClientRect();
    let X = ev.clientX + pad, Y = ev.clientY + pad;
    if (X + rect.width > window.innerWidth - 8) X = ev.clientX - rect.width - pad;
    if (Y + rect.height > window.innerHeight - 8) Y = ev.clientY - rect.height - pad;
    t.style.left = X + 'px'; t.style.top = Y + 'px';
  }
  function onLeave() { tip().hidden = true; if (mapReady) g.select('.hover-outline').attr('d', null); }
  function onClickMap(ev, f) {
    const [x, y] = d3.pointer(ev, g.node());
    const ll = projection.invert([x, y]);
    let ref;
    if (f.cities.length && ll) ref = M.cityRef(nearestCity(ll, f).city);
    else if (f.zoneId) ref = M.ianaRef(f.zoneId);
    else ref = M.fixedRef(f.nominalSec);
    selected = { ref, feature: f, clickLL: ll };
    afterSelect(false);
  }
  function featureFor(ref) {
    if (!mapReady) return null;
    let ll = ref.lat != null ? [ref.lon, ref.lat] : null;
    if (!ll && ref.kind === 'iana') { const c = D.CITIES.find(x => x.zone === ref.id); if (c) ll = [c.lon, c.lat]; }
    if (!ll) return null;
    return { f: features.find(f => d3.geoContains(f, ll)) || null, ll };
  }
  function selectRef(ref, zoomTo) {
    selected = { ref, feature: null, clickLL: null, zoom: zoomTo };
    const ff = featureFor(ref);
    if (ff) { selected.feature = ff.f; selected.clickLL = ff.ll; }
    afterSelect(zoomTo);
  }
  function afterSelect(zoomTo) {
    tip().hidden = true;
    picker.set(selected.ref, true);
    history.replaceState(null, '', M.link('map', { zone: M.serializeRef(selected.ref) }));
    highlightSelected(zoomTo);
    lastPanelKey = '';
    renderPanel(Date.now(), true);
  }
  function highlightSelected(zoomTo) {
    if (!mapReady || !selected) return;
    const f = selected.feature;
    g.select('.sel-outline:not(.hover-outline)').attr('d', f ? path(f) : null);
    const ll = selected.ref.lat != null ? [selected.ref.lon, selected.ref.lat] : selected.clickLL;
    const xy = ll ? projection(ll) : null;
    g.select('.sel-dot').style('display', xy ? null : 'none').attr('cx', xy ? xy[0] : 0).attr('cy', xy ? xy[1] : 0);
    g.selectAll('.city-dot').classed('sel', d => selected.ref.cityId === d.c.id);
    if (zoomTo && xy) {
      const k = 3.2;
      svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - k * xy[0], H / 2 - k * xy[1]).scale(k));
    }
  }

  /* ---------- Panel ---------- */
  function renderPanelEmpty() {
    const lz = M.localZone();
    M.$('#mapPanel', root).innerHTML = `<div class="empty">${M.icon('globe')}<div><b>Select a region</b></div><div class="small">Click the map, a city dot, or search above. Try <button class="btn btn-sm" data-pick="iana:Asia/Kathmandu">Kathmandu</button> <button class="btn btn-sm" data-pick="iana:Australia/Lord_Howe">Lord Howe</button> <button class="btn btn-sm" data-pick="iana:${esc(lz.id)}">your zone</button></div></div>`;
  }
  function onPanelClick(e) {
    const p = e.target.closest('[data-pick]');
    if (p) { const r = M.parseRef(p.dataset.pick) || M.parseRef(p.dataset.pick.replace(/^city:[^:]+:/, 'iana:')); if (r) selectRef(r, true); return; }
    const a = e.target.closest('[data-act]'); if (!a || !selected) return;
    if (a.dataset.act === 'addclock') M.go('clock', { add: M.serializeRef(selected.ref) });
    if (a.dataset.act === 'convert') M.go('convert', { from: M.serializeRef(selected.ref) });
    if (a.dataset.act === 'weather') {
      const r = selected.ref; let c = r.lat != null ? r : null;
      if (!c && r.kind === 'iana') { const x = M.D.CITIES.find(cc => cc.zone === r.id); if (x) c = M.cityRef(x); }
      const ll = c ? [c.lat, c.lon] : selected.clickLL ? [selected.clickLL[1], selected.clickLL[0]] : null;
      if (!ll) { M.toast('No coordinates for this zone — search for a place on the Weather page.'); return; }
      M.go('weather', { lat: ll[0].toFixed(4), lon: ll[1].toFixed(4), name: c ? M.refTitle(c) : `${ll[0].toFixed(2)}, ${ll[1].toFixed(2)}`, zone: r.kind === 'iana' ? r.id : '' });
    }
  }
  /** Compare DST rules of two zones by sampling offsets through the selected year. */
  function sameRules(a, b, year) {
    for (let mth = 0; mth < 12; mth++) for (const day of [1, 8, 15, 22]) {
      const t = Date.UTC(year, mth, day, 12);
      if (TE.offsetAt(a, t) !== TE.offsetAt(b, t)) return false;
    }
    return true;
  }
  function ruleSummary(z, year) {
    const jan = TE.offsetAt(z, Date.UTC(year, 0, 15)), jul = TE.offsetAt(z, Date.UTC(year, 6, 15));
    if (jan === jul) return `No DST · ${TE.formatOffset(jan)}`;
    return `DST · ${TE.formatOffset(Math.min(jan, jul))} / ${TE.formatOffset(Math.max(jan, jul))}`;
  }
  function renderPanel(now, force) {
    if (!selected) return;
    const r = selected.ref, f = selected.feature, lz = M.localZone();
    const w = TE.toZoned(r, now);
    const key = `${M.serializeRef(r)}|${w.offsetSec}|${TE.isoDate(w)}|${M.settings.hour12}|${M.settings.dateFormat}`;
    const panel = M.$('#mapPanel', root);
    if (force || key !== lastPanelKey) {
      lastPanelKey = key;
      const ds = TE.dstInfo(r, now);
      const year = w.y;
      const longName = TE.zoneName(r, now, 'long'), generic = r.kind === 'iana' ? TE.zoneName(r, now, 'longGeneric') : null;
      const abbr = TE.zoneAbbrev(r, now);
      const abbrStd = r.kind === 'iana' ? TE.zoneAbbrev(r, Date.UTC(year, ds.southern ? 6 : 0, 15)) : null;
      const abbrDst = r.kind === 'iana' && ds.observesDst ? TE.zoneAbbrev(r, Date.UTC(year, ds.southern ? 0 : 6, 15)) : null;
      const next = TE.nextTransition(r, now, 400), prev = TE.previousTransition(r, now, 400);
      const lw = TE.toZoned(lz, now);
      const diffLocal = w.offsetSec - lw.offsetSec;
      const notes = [];
      if (w.offsetSec % 3600 !== 0) notes.push(`Uses a ${w.offsetSec % 1800 === 0 ? 'half-hour' : '45-minute'} offset from UTC (${TE.formatOffset(w.offsetSec)}).`);
      if (ds.observesDst && ds.southern) notes.push('Southern-hemisphere daylight saving: clocks go forward around September–October and back around March–April.');
      if (ds.observesDst && ds.daylightSec - ds.standardSec !== 3600) notes.push(`Daylight saving shifts clocks by ${TE.formatDiffHours(ds.daylightSec - ds.standardSec).replace('+', '')}, not the usual hour.`);
      if (Math.abs(w.offsetSec) >= 12 * 3600) notes.push('Near the International Date Line — this location can be a full calendar day ahead of or behind places nearby.');
      if (f && f.nominalSec !== ds.standardSec) notes.push(`The map data marks this area as nominal ${TE.formatOffset(f.nominalSec)}, but current IANA rules for ${r.id || 'this zone'} give ${TE.formatOffset(ds.standardSec)} standard time. The polygon data predates recent changes.`);
      if (r.kind === 'iana' && /^(Africa\/Casablanca|Africa\/El_Aaiun)$/.test(r.id)) notes.push('Morocco uses UTC+1 most of the year and suspends it (UTC+0) during Ramadan, so “DST” detection here is approximate.');
      if (r.kind === 'iana' && r.id === 'Europe/Dublin') notes.push('In Irish law, summer time (IST, UTC+1) is the standard time and winter GMT is the exception; offsets shown here are what clocks actually read.');
      if (r.kind === 'iana' && /^Etc\//.test(r.id)) notes.push('This is a nominal offset zone (often over oceans) rather than a populated place. Note the POSIX sign convention: Etc/GMT+5 means UTC−05:00.');
      if (abbr && D.ABBREVIATIONS.filter(a => a.abbr === abbr).length > 1) notes.push(`The abbreviation “${abbr}” is ambiguous (${D.ABBREVIATIONS.filter(a => a.abbr === abbr).map(a => a.name).join(' / ')}); prefer the IANA name ${r.id}.`);
      if (r.cc && D.CITIES.some(c => c.cc === r.cc && TE.dstInfo({ kind: 'iana', id: c.zone }, now).standardSec !== ds.standardSec)) notes.push(`${r.country} spans more than one time zone — pick a specific city for exact times.`);
      // cities in this region grouped by zone
      let cityRows = '';
      if (f && f.cities.length) {
        const byZone = new Map();
        for (const c of f.cities) { if (!byZone.has(c.zone)) byZone.set(c.zone, []); byZone.get(c.zone).push(c); }
        cityRows = [...byZone.entries()].slice(0, 30).map(([zid, cs]) => {
          const z = { kind: 'iana', id: zid };
          const same = r.kind === 'iana' ? sameRules(r, z, year) : false;
          const zo = TE.offsetAt(z, now);
          return `<tr><td><button class="btn-ghost btn btn-sm" style="padding:2px 4px" data-pick="city:${cs[0].id}:${esc(zid)}">${esc(cs.slice(0, 3).map(c => c.name).join(', '))}${cs.length > 3 ? ` +${cs.length - 3}` : ''}</button><div class="tiny muted">${esc(zid)}</div></td><td class="num">${esc(TE.formatOffset(zo))}</td><td>${same ? '<span class="badge success">Same rules</span>' : `<span class="badge amber" title="${esc(ruleSummary(z, year))}">${zo === w.offsetSec ? 'Different rules' : 'Different time'}</span>`}<div class="tiny muted">${esc(ruleSummary(z, year))}</div></td></tr>`;
        }).join('');
      }
      panel.innerHTML = `
        <div class="card-head" style="margin-bottom:6px"><div style="flex:1;min-width:0"><h2>${esc(M.refTitle(r))}</h2><div class="small muted mono">${esc(r.kind === 'iana' ? r.id : M.refDetail(r))}</div></div>
          <span class="swatch" style="background:${colorFor(ds.standardSec)};width:22px;height:22px" title="Map colour"></span></div>
        <div class="big-time" data-live="time"></div>
        <div class="small" data-live="date" style="margin-bottom:10px"></div>
        <div class="row tight" style="margin-bottom:12px">
          <button class="btn btn-sm" data-act="addclock">${M.icon('plus')} World clock</button>
          <button class="btn btn-sm" data-act="convert">${M.icon('swap')} Convert from here</button>
          <button class="btn btn-sm" data-act="weather">${M.icon('cloud')} Weather here</button>
          <button class="btn btn-sm" data-copy="${esc(M.isoInstant(now, r))}" data-live-copy>${M.icon('copy')} Copy ISO</button>
        </div>
        <dl class="kv">
          <dt>Zone name</dt><dd>${esc(longName || '—')}${generic && generic !== longName ? `<div class="tiny muted">${esc(generic)}</div>` : ''}</dd>
          <dt>Abbreviation</dt><dd>${abbr ? esc(abbr) : '<span class="muted">none commonly used in English locale data</span>'}${abbrStd && abbrDst && abbrStd !== abbrDst ? ` <span class="tiny muted">(${esc(abbrStd)} / ${esc(abbrDst)})</span>` : ''}</dd>
          <dt>UTC offset now</dt><dd>${esc(TE.formatOffset(w.offsetSec))}</dd>
          <dt>Standard time</dt><dd>${esc(TE.formatOffset(ds.standardSec))}</dd>
          <dt>Daylight time</dt><dd>${ds.observesDst ? esc(TE.formatOffset(ds.daylightSec)) : `<span class="muted">not observed in ${year}</span>`}</dd>
          <dt>DST in effect?</dt><dd>${ds.observesDst ? (ds.isDst ? '<span class="badge amber">Yes — daylight saving time</span>' : '<span class="badge">No — standard time</span>') : '<span class="badge">No DST</span>'}</dd>
          <dt>Next clock change</dt><dd>${next ? `${esc(M.fmtDateTime(TE.toZoned(r, next.epochMs)))} → ${esc(TE.formatOffset(next.after))}<div class="tiny muted">(${esc(TE.formatOffset(next.before))} before; ${esc(M.relDays(TE.daysBetween(TE.toZoned(lz, now), TE.toZoned(lz, next.epochMs))))})</div>` : '<span class="muted">none in the next 400 days</span>'}</dd>
          ${prev ? `<dt>Last clock change</dt><dd>${esc(M.fmtDate(TE.toZoned(r, prev.epochMs)))} (${esc(TE.formatOffset(prev.before))} → ${esc(TE.formatOffset(prev.after))})</dd>` : ''}
          <dt>vs. your zone</dt><dd>${diffLocal === 0 ? 'Same offset as you' : `${esc(TE.formatDiffHours(diffLocal))} <span class="tiny muted">(${diffLocal > 0 ? 'ahead of' : 'behind'} ${esc(M.localZoneId)})</span>`}</dd>
          <dt>vs. UTC</dt><dd>${esc(TE.formatDiffHours(w.offsetSec))}</dd>
          <dt>Next local midnight</dt><dd data-live="midnight"></dd>
        </dl>
        <h3 style="margin:16px 0 8px">Example conversions</h3>
        <div data-live="examples" class="small"></div>
        <h3 style="margin:16px 0 8px">Comparison</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>Location</th><th>Time & date</th><th class="num">Offset</th><th class="num">vs. selected</th></tr></thead><tbody data-live="compare"></tbody></table></div>
        ${cityRows ? `<h3 style="margin:16px 0 4px">Cities in this map region</h3><p class="tiny muted" style="margin:0 0 8px">Grouped by IANA zone, with whether they follow the same offsets and daylight-saving dates as ${esc(M.refShort(r))} throughout ${year}.</p><div class="table-wrap"><table class="table"><tbody>${cityRows}</tbody></table></div>` : (f ? `<p class="small muted" style="margin-top:14px">No listed cities fall inside this map region (open ocean or sparsely populated area). Places listed by the map data: ${esc(f.properties.places || '—')}.</p>` : `<p class="small muted" style="margin-top:14px">This zone has no map polygon to highlight; all information above still comes from the IANA database.</p>`)}
        ${notes.length ? `<h3 style="margin:16px 0 8px">Notes</h3><ul class="small" style="padding-left:18px;margin:0">${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
    }
    // live parts
    const set = (sel, html) => { const e = panel.querySelector(`[data-live="${sel}"]`); if (e) e.innerHTML = html; };
    set('time', esc(M.fmtTime(w, { seconds: true })));
    const lt = M.today(lz);
    const rel = TE.compareDates(w, lt);
    set('date', `${esc(TE.formatDateLong(w))} ${rel ? `<span class="badge ${rel > 0 ? 'primary' : 'amber'}">${rel > 0 ? 'ahead of' : 'behind'} your date</span>` : ''}`);
    const tmr = TE.addDays(w, 1);
    const res = TE.resolveLocal(r, { ...tmr, h: 0, mi: 0, s: 0 });
    const midT = res.status === 'gap' ? res.shiftedEpochMs : res.candidates[0].epochMs;
    const b = TE.breakdown(midT - now);
    set('midnight', `${esc(TE.formatDateShort(tmr))} begins in ${b.days * 24 + b.hours}h ${TE.pad(b.minutes)}m ${TE.pad(b.seconds)}s${res.status === 'gap' ? ' <span class="tiny muted">(midnight is skipped by a clock change; day starts at the first valid time)</span>' : ''}`);
    const cp = panel.querySelector('[data-live-copy]'); if (cp) cp.setAttribute('data-copy', M.isoInstant(now, r));
    if (now % 60000 < 1100 || force) {
      // Example conversions use today's date in the selected zone
      const ex = (hh) => { const rr = TE.resolveLocal(r, { y: w.y, m: w.m, d: w.d, h: hh, mi: 0, s: 0 }); return rr.status === 'gap' ? null : rr.candidates[0].epochMs; };
      const lines = [];
      for (const hh of [9, 12, 17]) {
        const t = ex(hh); if (t == null) continue;
        const lw2 = TE.toZoned(lz, t), uw = TE.toZoned(TE.UTC, t);
        lines.push(`<li><b>${esc(M.fmtTime({ h: hh, mi: 0 }))}</b> in ${esc(M.refShort(r))} = ${esc(M.fmtTime(lw2))} ${TE.compareDates(lw2, w) ? esc(TE.WEEKDAYS_SHORT[lw2.weekday]) + ' ' : ''}your time · ${esc(M.fmtTime(uw, { hour12: false }))} UTC</li>`);
      }
      const yr = TE.resolveLocal(lz, { ...lt, h: 9, mi: 0, s: 0 });
      if (yr.status !== 'gap') { const t = yr.candidates[0].epochMs, sw = TE.toZoned(r, t); lines.push(`<li><b>${esc(M.fmtTime({ h: 9, mi: 0 }))}</b> your time = ${esc(M.fmtTime(sw))} ${esc(TE.WEEKDAYS_SHORT[sw.weekday])} in ${esc(M.refShort(r))}</li>`); }
      set('examples', `<ul style="padding-left:18px;margin:0">${lines.join('')}</ul><div class="tiny muted" style="margin-top:4px">For today’s date in each location (${esc(TE.isoDate(w))}).</div>`);
    }
    const compareRefs = COMPARE.map(M.ianaRef);
    compareRefs.push(M.utcZone());
    if (!COMPARE.includes(M.localZoneId)) compareRefs.unshift(M.ianaRef(M.localZoneId));
    set('compare', compareRefs.map(cr => {
      const cw = TE.toZoned(cr, now);
      const d = cw.offsetSec - w.offsetSec;
      const isSel = (cr.kind === 'iana' && r.kind === 'iana' && cr.id === r.id) || (cr.isUTC && r.isUTC);
      return `<tr class="${isSel ? 'is-selected' : ''}"><td><span class="daypart dp-${M.dayPart(cw.h)}"></span> ${esc(M.refShort(cr))}${cr.kind === 'iana' && cr.id === M.localZoneId ? ' <span class="badge accent">You</span>' : ''}</td><td class="nowrap">${esc(M.fmtTime(cw))} <span class="tiny muted">${esc(TE.WEEKDAYS_SHORT[cw.weekday])} ${esc(TE.MONTHS_SHORT[cw.m - 1])} ${cw.d}</span></td><td class="num">${esc(TE.formatOffset(cw.offsetSec, { prefix: '' }))}</td><td class="num">${d === 0 ? '—' : esc(TE.formatDiffHours(d))}</td></tr>`;
    }).join(''));
  }

  function show(params) {
    if (params.zone) { const r = M.parseRef(params.zone); if (r && (!selected || M.serializeRef(selected.ref) !== params.zone)) selectRef(r, true); }
    else if (!selected) selectRef(M.ianaRef(M.localZoneId), false);
  }
  function tick(now) { drawNight(false); if (selected) renderPanel(now, false); }
  M.register('map', { init, show, tick });
})();
