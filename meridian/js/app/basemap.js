/* Meridian — satellite basemap imagery
 * Real Earth imagery from NASA EOSDIS GIBS (Global Imagery Browse Services): a documented, keyless,
 * CORS-enabled WMS. NASA Blue Marble (shaded relief + bathymetry); VIIRS Black Marble is also available.
 * Images are cached in IndexedDB (the imagery is a static composite, so cached copies never go out of date),
 * which keeps the maps photographic when offline. Without network or cache, the maps fall back to vector land.
 */
(function () {
  'use strict';
  const M = window.M;
  const WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
  const LAYERS = {
    day: { id: 'BlueMarble_ShadedRelief_Bathymetry', name: 'NASA Blue Marble' },
    night: { id: 'VIIRS_Black_Marble', name: 'NASA VIIRS Black Marble' }
  };
  const ATTR = 'Imagery: NASA Blue Marble · NASA EOSDIS GIBS';
  const MAX_ENTRIES = 120;
  const stats = { net: 0, cache: 0, failed: 0, lastError: null };

  function wmsUrl(layer, w, s, e, n, pw, ph) {
    const r = (x) => +x.toFixed(5);
    // WMS 1.3.0 with EPSG:4326 uses latitude-first axis order
    return `${WMS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${LAYERS[layer].id}&STYLES=&CRS=EPSG:4326&BBOX=${r(s)},${r(w)},${r(n)},${r(e)}&WIDTH=${pw}&HEIGHT=${ph}&FORMAT=image/jpeg`;
  }

  /* ---------- IndexedDB blob cache ---------- */
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res) => {
      try {
        const r = indexedDB.open('meridian-basemap', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('img');
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
        r.onblocked = () => res(null);
      } catch (e) { res(null); }
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(d => d && new Promise((res) => {
      try { const t = d.transaction('img', mode), st = t.objectStore('img'), q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = t.onabort = () => res(null); } catch (e) { res(null); }
    }));
  }
  const idbGet = (k) => tx('readonly', st => st.get(k));
  const idbPut = (k, v) => tx('readwrite', st => st.put(v, k));
  let pruning = false;
  async function prune() {
    if (pruning) return; pruning = true;
    try {
      const d = await db(); if (!d) return;
      const all = await new Promise((res) => { const out = []; const c = d.transaction('img').objectStore('img').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value.t || 0, !!cur.value.keep]); cur.continue(); } else res(out); }; c.onerror = () => res(out); });
      const drop = all.filter(x => !x[2]).sort((a, b) => a[1] - b[1]);
      const n = all.length - MAX_ENTRIES;
      if (n > 0) await tx('readwrite', st => { drop.slice(0, n).forEach(x => st.delete(x[0])); return null; });
    } finally { pruning = false; }
  }

  const inflight = new Map();
  /** Fetch one WMS image as a Blob, from cache when available. keep=true marks base images that are never pruned. */
  function getBlob(url, { keep = false, cacheOnly = false } = {}) {
    if (inflight.has(url)) return inflight.get(url);
    const p = (async () => {
      const hit = await idbGet(url);
      if (hit && hit.blob) { stats.cache++; return hit.blob; }
      if (cacheOnly || navigator.onLine === false) throw new Error('offline and not cached');
      let r;
      try { r = await fetch(url, { mode: 'cors' }); } catch (e) { throw new Error('network error'); }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const ct = r.headers.get('content-type') || '';
      if (!/^image\//.test(ct)) throw new Error('imagery service returned ' + (ct || 'no content type')); // WMS errors come back as XML
      const blob = await r.blob();
      stats.net++;
      idbPut(url, { blob, t: Date.now(), keep }).then(() => { if (!keep) prune(); });
      return blob;
    })();
    inflight.set(url, p);
    p.catch(e => { stats.failed++; stats.lastError = e.message; }).finally(() => inflight.delete(url));
    return p;
  }
  function blobToImage(blob) {
    if (window.createImageBitmap) return createImageBitmap(blob);
    return new Promise((res, rej) => { const u = URL.createObjectURL(blob), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image decode failed')); }; im.src = u; });
  }

  /**
   * Equirectangular canvas covering bbox [x0, y0, x1, y1] (degrees; x may be "unwrapped" beyond ±180).
   * Pieces that cross the antimeridian are requested separately and stitched.
   */
  async function equirect(bbox, pw, ph, opts = {}) {
    const layer = opts.layer || 'day';
    let [x0, y0, x1, y1] = bbox;
    y0 = Math.max(-90, y0); y1 = Math.min(90, y1);
    pw = Math.max(16, Math.min(8192, Math.round(pw))); ph = Math.max(8, Math.min(8192, Math.round(ph)));
    const span = x1 - x0;
    const pieces = [];
    // split [x0, x1] at multiples of 360 offset by 180
    let a = x0;
    while (a < x1 - 1e-9) {
      const k = Math.floor((a + 180) / 360);
      const edge = Math.min(x1, k * 360 + 180);
      pieces.push([a, edge, k * 360]);
      a = edge;
    }
    const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
    const ctx = cv.getContext('2d');
    await Promise.all(pieces.map(async ([a0, a1, off]) => {
      const px0 = Math.round((a0 - x0) / span * pw), px1 = Math.round((a1 - x0) / span * pw);
      if (px1 - px0 < 1) return;
      const url = wmsUrl(layer, a0 - off, y0, a1 - off, y1, px1 - px0, ph);
      const img = await blobToImage(await getBlob(url, opts));
      ctx.drawImage(img, px0, 0, px1 - px0, ph);
      if (img.close) img.close();
    }));
    return cv;
  }

  /** Whole-world equirectangular image as a blob: URL (for WebGL textures). */
  async function worldURL(layer, pw) {
    const url = wmsUrl(layer, -180, -90, 180, 90, pw, pw / 2);
    return URL.createObjectURL(await getBlob(url, { keep: true }));
  }

  /**
   * Reproject an equirectangular source canvas (covering srcBbox) into an output canvas, using inv(px, py) → [lon, lat] | null.
   * Nearest-neighbour sampling; longitudes are wrapped into the source's range.
   */
  function reproject(src, srcBbox, ow, oh, inv) {
    const [x0, y0, x1, y1] = srcBbox, sw = src.width, sh = src.height;
    const sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
    const out = document.createElement('canvas'); out.width = ow; out.height = oh;
    const octx = out.getContext('2d'), img = octx.createImageData(ow, oh), od = img.data;
    const kx = sw / (x1 - x0), ky = sh / (y1 - y0);
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        const ll = inv(x + 0.5, y + 0.5);
        if (!ll) continue;
        let lon = ll[0];
        if (!Number.isFinite(lon) || !Number.isFinite(ll[1])) continue;
        while (lon < x0) lon += 360;
        while (lon >= x1 && lon - 360 >= x0) lon -= 360;
        const sx = Math.floor((lon - x0) * kx), sy = Math.floor((y1 - ll[1]) * ky);
        if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
        const si = (sy * sw + sx) * 4, oi = (y * ow + x) * 4;
        od[oi] = sd[si]; od[oi + 1] = sd[si + 1]; od[oi + 2] = sd[si + 2]; od[oi + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return out;
  }

  const listeners = new Set();
  M.basemap = {
    LAYERS, ATTR, stats, wmsUrl, equirect, worldURL, reproject, getBlob,
    enabled: () => M.store.get('basemapSat', true) !== false,
    setEnabled(v) { M.store.set('basemapSat', !!v); listeners.forEach(fn => { try { fn(!!v); } catch (e) { console.error(e); } }); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** Canvas → URL usable as an SVG <image> href. */
    toURL(cv) { return cv.toDataURL('image/jpeg', 0.9); },
    attributionHTML: () => `<span class="bm-attr">${ATTR}</span>`
  };
})();
