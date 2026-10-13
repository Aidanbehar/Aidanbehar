/*
 * Meridian — Live World: a 3D Earth with real-time day/night shading and worldwide live webcams.
 *
 * Architecture (all in-browser, no backend):
 *  - Globe: globe.gl (three.js) loaded on demand from a CDN; a d3 orthographic canvas globe is the fallback.
 *  - Day/night: the subsolar point is computed locally (TE.sunPosition, NOAA/Meeus low-precision solar formulas)
 *    and fed to a shader patch on the globe material, which blends day imagery, darkness and city lights.
 *  - Providers: modular metadata sources (government open-data cameras + curated YouTube livestreams + optional
 *    keyed APIs). Each normalises to one camera format and fails independently.
 *  - Freshness: only the open camera is refreshed. Still images are re-requested no faster than the source publishes
 *    them, with capture/publish timestamps checked before anything is called "updating". HLS video is verified live
 *    from its playlist; YouTube status is unknown unless verified with an optional Data API key.
 */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;
  const CDN = {
    globe: 'https://cdn.jsdelivr.net/npm/globe.gl@2.32.0/dist/globe.gl.min.js',
    hls: 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js',
    day: 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
    night: 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-night.jpg',
    bump: 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-topology.png',
    sky: 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/night-sky.png'
  };
  const CATS = { nature: 'Nature & wildlife', city: 'Cities & streets', mountain: 'Mountains & snow', beach: 'Beaches & coasts', transport: 'Traffic & transport', weather: 'Weather', landmark: 'Landmarks' };
  const CAT_COLOR = { nature: '#4ade80', city: '#f6c35b', mountain: '#e2e8f0', beach: '#38bdf8', transport: '#fb923c', weather: '#a78bfa', landmark: '#f472b6' };
  const STATUS = {
    live: { label: 'LIVE VIDEO', cls: 'st-live', desc: 'Continuous stream verified as currently live.' },
    updating: { label: 'UPDATING IMAGE', cls: 'st-upd', desc: 'Still image refreshing on schedule; its timestamp is current.' },
    recent: { label: 'RECENT IMAGE', cls: 'st-recent', desc: 'Retrieved just now, but the source gives no capture time, so freshness is not independently confirmed.' },
    stale: { label: 'STALE', cls: 'st-stale', desc: 'The image is older than its expected update interval, or refreshing has failed.' },
    offline: { label: 'OFFLINE', cls: 'st-off', desc: 'The source reports the camera unavailable, or repeated checks confirm an outage.' },
    ended: { label: 'ENDED', cls: 'st-off', desc: 'The broadcast has ended.' },
    unknown: { label: 'STATUS UNKNOWN', cls: 'st-unk', desc: 'Not enough information to say whether this camera is live right now.' }
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('meridian.live.' + k); if (v == null) return d; const o = JSON.parse(v); return o == null ? d : o; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('meridian.live.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem('meridian.live.' + k); } catch (e) { /* ignore */ } }
  };
  const validLL = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
  const validUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch (e) { return null; } };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const yieldUI = () => new Promise(r => setTimeout(r, 0));

  async function getJSON(url, { timeout = 30000, signal } = {}) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), timeout);
    if (signal) signal.addEventListener('abort', () => ctrl.abort());
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; }
      return await r.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('timed out');
      if (e instanceof TypeError) { const x = new Error('network error or blocked by browser (CORS)'); x.network = true; throw x; }
      throw e;
    } finally { clearTimeout(t); }
  }
  async function getText(url, opts = {}) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), opts.timeout || 30000);
    try { const r = await fetch(url, { signal: ctrl.signal, cache: opts.cache || 'default' }); if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; } return await r.text(); }
    catch (e) { if (e.name === 'AbortError') throw new Error('timed out'); if (e instanceof TypeError) { const x = new Error('network error or blocked by browser (CORS)'); x.network = true; throw x; } throw e; }
    finally { clearTimeout(t); }
  }

  /* ================================================================== */
  /* Providers                                                           */
  /* ================================================================== */
  // Common camera format:
  // { id, provider, title, place, region, country, lat, lon, precision, zone, cats[], kind: 'image'|'hls'|'youtube'|'page',
  //   image: { url, expectedMin, minMin, capture: 'api'|'header'|'none', cors }, hls, yt: { vid, channel, channelId }, page, sourceOffline, extra }
  const PROVIDERS = [
    {
      id: 'caltrans', name: 'Caltrans CCTV', operator: 'California Department of Transportation', region: 'California, USA',
      docs: 'https://cwwp2.dot.ca.gov/documentation/cctv/cctv.htm', kinds: 'Live HLS video + JPEG updated every ~1 min',
      refresh: 'Images: source publishes about every 1–2 min (per-camera frequency in the metadata); Meridian refreshes every 2 min by default and never faster than the stated frequency. Video: continuous HLS, never reloaded.',
      async fetch(signal) {
        const ds = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const out = [], errors = [];
        let i = 0;
        const worker = async () => {
          while (i < ds.length) {
            const d = ds[i++];
            try {
              const j = await getJSON(`https://cwwp2.dot.ca.gov/data/d${+d}/cctv/cctvStatusD${d}.json`, { signal });
              await yieldUI();
              for (const row of (j.data || [])) {
                const c = row.cctv; if (!c || !c.location) continue;
                const lat = parseFloat(c.location.latitude), lon = parseFloat(c.location.longitude);
                const img = c.imageData && c.imageData.static ? validUrl(c.imageData.static.currentImageURL) : null;
                const hls = c.imageData ? validUrl(c.imageData.streamingVideoURL) : null;
                if (!img && !hls) continue;
                const freq = Math.max(1, parseFloat(c.imageData.static && c.imageData.static.currentImageUpdateFrequency) || 2);
                const elev = parseFloat(c.location.elevation) || 0;
                const cats = ['transport']; if (elev > 4500) cats.push('mountain');
                out.push({
                  id: 'caltrans:' + (img || hls), provider: 'caltrans', title: c.location.locationName || 'Caltrans camera', place: [c.location.nearbyPlace, c.location.county ? c.location.county + ' County' : ''].filter(Boolean).join(', '),
                  region: 'California', country: 'United States', lat, lon, precision: 'site', zone: 'America/Los_Angeles', cats,
                  kind: hls ? 'hls' : 'image', hls, image: img ? { url: img, expectedMin: freq, minMin: freq, capture: 'header', cors: true } : null,
                  page: 'https://quickmap.dot.ca.gov/', sourceOffline: c.inService !== 'true', extra: { route: c.location.route, direction: c.location.direction, district: d }
                });
              }
            } catch (e) { errors.push(`District ${+d}: ${e.message}`); }
          }
        };
        await Promise.all([worker(), worker(), worker()]);
        if (!out.length) throw new Error(errors.join('; ') || 'no cameras returned');
        return { cams: out, warnings: errors };
      }
    },
    {
      id: 'tfl', name: 'TfL JamCams', operator: 'Transport for London', region: 'London, UK',
      docs: 'https://api.tfl.gov.uk/', kinds: 'JPEG still images (plus short recent clips — not live video)',
      refresh: 'Images change every few minutes; Meridian starts at 5 min and backs off further if the image has not changed (server Last-Modified).',
      async fetch(signal) {
        const a = await getJSON('https://api.tfl.gov.uk/Place/Type/JamCam', { signal });
        const out = [];
        for (const p of a) {
          const prop = (k) => ((p.additionalProperties || []).find(x => x.key === k) || {}).value;
          const img = validUrl(prop('imageUrl')); if (!img) continue;
          out.push({ id: 'tfl:' + p.id, provider: 'tfl', title: p.commonName || 'London traffic camera', place: 'London', region: 'Greater London', country: 'United Kingdom', lat: p.lat, lon: p.lon, precision: 'site', zone: 'Europe/London', cats: ['transport', 'city'], kind: 'image', image: { url: img, expectedMin: 5, minMin: 3, capture: 'header', cors: true }, page: 'https://tfl.gov.uk/traffic/status/', sourceOffline: prop('available') === 'false', extra: { clip: validUrl(prop('videoUrl')), view: prop('view') } });
        }
        return { cams: out };
      }
    },
    {
      id: 'hktd', name: 'Hong Kong Transport Department', operator: 'Transport Department, HKSAR Government', region: 'Hong Kong',
      docs: 'https://data.gov.hk/en-data/dataset/hk-td-tis_2-traffic-snapshot-images', kinds: 'JPEG snapshots',
      refresh: 'Snapshots update about every 2 min (server cache max-age 60 s); Meridian refreshes every 2 min.',
      async fetch(signal) {
        const xml = await getText('https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml', { signal });
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const out = [], seen = new Set();
        for (const n of doc.querySelectorAll('image')) {
          const g = (t) => (n.querySelector(t) || {}).textContent || '';
          const key = g('key'), img = validUrl(g('url'));
          if (!key || !img || seen.has(key)) continue; seen.add(key);
          out.push({ id: 'hktd:' + key, provider: 'hktd', title: g('description').replace(/\s*\[[^\]]+\]\s*$/, '') || key, place: [g('district'), g('region')].filter(Boolean).join(', '), region: g('region'), country: 'Hong Kong', lat: parseFloat(g('latitude')), lon: parseFloat(g('longitude')), precision: 'site', zone: 'Asia/Hong_Kong', cats: ['transport', 'city'], kind: 'image', image: { url: img, expectedMin: 2, minMin: 2, capture: 'header', cors: true }, page: 'https://www.hkemobility.gov.hk/' });
        }
        return { cams: out };
      }
    },
    {
      id: 'lta', name: 'Singapore LTA traffic images', operator: 'Land Transport Authority via data.gov.sg', region: 'Singapore',
      docs: 'https://data.gov.sg/', kinds: 'JPEG images with capture timestamps',
      refresh: 'The API publishes a new image set about every 20–60 s with capture times; Meridian re-queries every 2 min.',
      async fetch(signal) {
        const j = await getJSON('https://api.data.gov.sg/v1/transport/traffic-images', { signal });
        const cams = ((j.items || [])[0] || {}).cameras || [];
        lta.cache = { at: Date.now(), cams };
        return { cams: cams.map(c => ({ id: 'lta:' + c.camera_id, provider: 'lta', title: `Traffic camera ${c.camera_id}`, place: 'Singapore', region: 'Singapore', country: 'Singapore', lat: c.location && c.location.latitude, lon: c.location && c.location.longitude, precision: 'site', zone: 'Asia/Singapore', cats: ['transport', 'city'], kind: 'image', image: { url: validUrl(c.image), expectedMin: 2, minMin: 1, capture: 'api', cors: false }, page: 'https://onemotoring.lta.gov.sg/content/onemotoring/home/driving/traffic_information/traffic-cameras.html', extra: { cameraId: c.camera_id, ts: c.timestamp } })) };
      }
    },
    {
      id: 'digitraffic', name: 'Fintraffic Digitraffic weather cameras', operator: 'Fintraffic / Finnish Transport Infrastructure Agency', region: 'Finland',
      docs: 'https://www.digitraffic.fi/en/road-traffic/', kinds: 'JPEG road-weather camera images with capture times (several views per station)',
      refresh: 'Images are captured about every 10 min (exact measuredTime per view); Meridian refreshes every 10 min.',
      async fetch(signal) {
        const [j, data] = await Promise.all([getJSON('https://tie.digitraffic.fi/api/weathercam/v1/stations', { signal }), getJSON('https://tie.digitraffic.fi/api/weathercam/v1/stations/data', { signal }).catch(() => null)]);
        // real per-view capture times for every station in one small request
        const measured = new Map();
        for (const st of ((data && data.stations) || [])) for (const pr of (st.presets || [])) if (pr.measuredTime) measured.set(pr.id, pr.measuredTime);
        const out = [];
        for (const f of (j.features || [])) {
          const p = f.properties || {}, c = (f.geometry || {}).coordinates || [];
          const presets = (p.presets || []).filter(x => x.inCollection !== false).map(x => x.id);
          if (!presets.length) continue;
          const m = /^(?:vt|kt|st|mt)?(\d+)?_?(.*)$/i.exec(p.name || '');
          const nice = (m && m[2] ? m[2] : p.name || p.id).replace(/_/g, ' ');
          out.push({ id: 'digitraffic:' + p.id, provider: 'digitraffic', title: `${nice}${m && m[1] ? ` (road ${m[1]})` : ''}`, place: nice, region: 'Finland', country: 'Finland', lat: c[1], lon: c[0], precision: 'site', zone: 'Europe/Helsinki', cats: ['weather', 'transport'], kind: 'image', image: { url: `https://weathercam.digitraffic.fi/${presets[0]}.jpg`, expectedMin: 10, minMin: 10, capture: 'api', cors: true }, page: 'https://liikennetilanne.fintraffic.fi/', sourceOffline: p.collectionStatus && p.collectionStatus !== 'GATHERING', extra: { station: p.id, presets, measured: measured.get(presets[0]) || null } });
        }
        return { cams: out };
      }
    },
    {
      id: 'iem', name: 'Iowa Environmental Mesonet webcams', operator: 'Iowa State University (IEM)', region: 'Iowa & Midwest, USA',
      docs: 'https://mesonet.agron.iastate.edu/current/webcam.php', kinds: 'Weather camera images with capture times',
      refresh: 'Images are archived every 5 min with their valid time; Meridian refreshes every 5 min.',
      async fetch(signal) {
        // each IEM camera network is listed separately; merge them and drop duplicates
        const nets = ['KCRG', 'KCCI', 'KELO', 'ISUC', 'MCFC'];
        const res = await Promise.allSettled(nets.map(n => getJSON(`https://mesonet.agron.iastate.edu/geojson/webcam.geojson?network=${n}`, { signal })));
        const byCid = new Map();
        res.forEach(r => { if (r.status === 'fulfilled') for (const f of (r.value.features || [])) if (f.properties && f.properties.cid) byCid.set(f.properties.cid, f); });
        if (!byCid.size) throw new Error(res.map(r => r.reason && r.reason.message).filter(Boolean)[0] || 'no cameras returned');
        const feats = [...byCid.values()];
        iem.cache = { at: Date.now(), feats };
        return { cams: feats.map(f => { const p = f.properties || {}, c = (f.geometry || {}).coordinates || []; return { id: 'iem:' + p.cid, provider: 'iem', title: p.name || p.cid, place: [p.name, p.county ? p.county + ' County' : ''].filter(Boolean).join(', '), region: p.state, country: 'United States', lat: c[1], lon: c[0], precision: 'site', zone: 'America/Chicago', cats: ['weather'], kind: 'image', image: { url: validUrl(p.url || p.imgurl), expectedMin: 5, minMin: 5, capture: 'api', cors: true }, page: 'https://mesonet.agron.iastate.edu/current/webcam.php', extra: { cid: p.cid, valid: p.utc_valid || p.valid } }; }) };
      }
    },
    {
      id: 'youtube', name: 'YouTube livestreams (curated)', operator: 'Channel operators (EarthCam, See Jackson Hole, NASA, Monterey Bay Aquarium, …)', region: 'Worldwide',
      docs: 'https://developers.google.com/youtube/iframe_api_reference', kinds: 'Continuous live video (embedded YouTube player)',
      refresh: 'Continuous video — never reloaded. Live status is verified only with an optional YouTube Data API key (videos.list, 1 quota unit per 50 videos).',
      async fetch() {
        const D = window.MERIDIAN_LIVECAMS; if (!D) throw new Error('curated list missing');
        return { cams: D.YT.map(([vid, ch, chId, title, lat, lon, place, country, zone, cats, prec]) => ({ id: 'yt:' + vid, provider: 'youtube', title, place, region: '', country, lat, lon, precision: lat == null ? null : prec, zone, cats, kind: 'youtube', yt: { vid, channel: ch, channelId: chId }, page: `https://www.youtube.com/watch?v=${vid}` })) };
      }
    },
    {
      id: 'windy', name: 'Windy Webcams (optional)', operator: 'Windy.com', region: 'Worldwide', needsKey: 'windy',
      docs: 'https://api.windy.com/webcams', kinds: 'Still images with update times; timelapse player pages',
      refresh: 'Uses the API’s lastUpdatedOn time. Free-tier image URLs expire, so images are re-requested from the API.',
      async fetch(signal) {
        const key = keys().windy; if (!key) { const e = new Error('API key not configured'); e.needsKey = true; throw e; }
        const out = [];
        for (let offset = 0; offset < 1000; offset += 50) {
          const ctrl = new AbortController(); if (signal) signal.addEventListener('abort', () => ctrl.abort());
          const r = await fetch(`https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}&include=categories,images,location,player,urls`, { headers: { 'x-windy-api-key': key }, signal: ctrl.signal });
          if (!r.ok) throw new Error(`HTTP ${r.status}${r.status === 401 ? ' (invalid key)' : ''}`);
          const j = await r.json(); const list = j.webcams || [];
          for (const w of list) {
            const loc = w.location || {}, cur = (w.images || {}).current || {};
            const cats = (w.categories || []).map(c => c.id);
            const cat = cats.includes('beach') || cats.includes('coast') ? 'beach' : cats.includes('mountain') ? 'mountain' : cats.includes('traffic') ? 'transport' : cats.includes('city') ? 'city' : cats.includes('landscape') || cats.includes('forest') ? 'nature' : 'weather';
            out.push({ id: 'windy:' + w.webcamId, provider: 'windy', title: w.title, place: loc.city || '', region: loc.region || '', country: loc.country || '', lat: loc.latitude, lon: loc.longitude, precision: 'site', zone: null, cats: [cat], kind: 'image', image: { url: validUrl(cur.preview), expectedMin: 10, minMin: 10, capture: 'api', cors: false }, page: (w.urls && w.urls.detail) || 'https://www.windy.com/webcams', sourceOffline: w.status && w.status !== 'active', extra: { updated: w.lastUpdatedOn } });
          }
          if (list.length < 50) break;
        }
        return { cams: out };
      }
    }
  ];
  const lta = PROVIDERS.find(p => p.id === 'lta'), iem = PROVIDERS.find(p => p.id === 'iem');
  const BLOCKED = [
    ['Transport for NSW Live Traffic cameras (Australia)', 'The camera feed sends no CORS header, so browsers block it; using it would need a server proxy.'],
    ['NYC DOT traffic cameras', 'Metadata endpoint has no CORS header (browser-blocked).'],
    ['Ontario 511 / Alberta 511 cameras', 'API rejects requests without a developer key ("Invalid Key").'],
    ['US National Park Service webcams', 'The NPS API needs a free key, and its webcam records mostly link to pages or representative stills rather than live image URLs.'],
    ['Automatic YouTube search', 'Requires the YouTube Data API (optional key below); Meridian does not scrape YouTube.']
  ];
  const keys = () => store.get('keys', {}) || {};

  /* ================================================================== */
  /* State                                                               */
  /* ================================================================== */
  const S = {
    cams: [], byId: new Map(), provState: {}, loaded: false, loading: false, loadedAt: 0,
    favs: new Set(store.get('favs', []) || []), status: new Map(), // camId -> { st, at, note, verifiedAt, capture, published, retrieved, next }
    filter: store.get('filter', 'all'), statusFilter: store.get('statusFilter', 'any'), query: '',
    prefs: Object.assign({ shading: true, lights: true, terminator: true, atmosphere: true, markers: true, refreshFactor: 1 }, store.get('prefs', {})),
    preview: null, // epoch ms when previewing; null = real time
    sel: null, stats: { imgOk: 0, imgFail: 0, lastImg: 0 }
  };
  const setStatus = (id, patch) => { const cur = S.status.get(id) || { st: 'unknown' }; S.status.set(id, Object.assign(cur, patch)); };
  const statusOf = (c) => {
    const s = S.status.get(c.id);
    if (s && s.st) return s.st;
    if (c.sourceOffline) return 'offline';
    return 'unknown';
  };

  async function loadAll(force) {
    if (S.loading) return; S.loading = true; renderDiag(); renderCounts('Loading camera sources…');
    const cached = !force && store.get('catalog', null);
    const all = [];
    await Promise.all(PROVIDERS.map(async (p) => {
      const st = S.provState[p.id] = { state: 'loading', count: 0, withCoords: 0, error: null, at: null };
      if (p.needsKey && !keys()[p.needsKey]) { Object.assign(st, { state: 'needs-key' }); return; }
      try {
        let res;
        const cp = cached && cached[p.id];
        if (cp && Date.now() - cp.at < (p.id === 'lta' || p.id === 'iem' ? 10 * 60000 : 6 * 3600000)) { res = { cams: cp.cams }; st.cached = true; st.at = cp.at; }
        else { res = await p.fetch(); st.at = Date.now(); }
        const seen = new Set(), cams = [];
        for (const c of res.cams) {
          if (!c || seen.has(c.id)) continue;
          if (c.lat != null && !validLL(+c.lat, +c.lon)) { c.lat = c.lon = null; c.precision = null; }
          if (c.kind === 'image' && (!c.image || !c.image.url)) { if (!c.page) continue; c.kind = 'page'; }
          c.lat = c.lat == null ? null : +c.lat; c.lon = c.lon == null ? null : +c.lon;
          seen.add(c.id); cams.push(c);
        }
        Object.assign(st, { state: 'ok', count: cams.length, withCoords: cams.filter(c => c.lat != null).length, error: null, warnings: res.warnings || [] });
        all.push(...cams);
        if (!st.cached) { const cat = store.get('catalog', {}) || {}; cat[p.id] = { at: st.at, cams }; if (!store.set('catalog', cat)) { delete cat[p.id]; store.set('catalog', cat); } }
      } catch (e) {
        Object.assign(st, { state: e.needsKey ? 'needs-key' : 'failed', error: e.message });
        // fall back to an older cached copy if we have one
        const cp = (store.get('catalog', {}) || {})[p.id];
        if (cp && cp.cams) { all.push(...cp.cams); Object.assign(st, { state: 'stale-cache', count: cp.cams.length, withCoords: cp.cams.filter(c => c.lat != null).length, at: cp.at }); }
      }
      renderDiag();
    }));
    // de-duplicate across providers by id and canonical media URL
    const seenUrl = new Set(); S.cams = []; S.byId.clear();
    for (const c of all) {
      const canon = c.yt ? 'yt:' + c.yt.vid : (c.hls || (c.image && c.image.url) || c.page);
      if (S.byId.has(c.id) || seenUrl.has(canon)) continue;
      seenUrl.add(canon); S.byId.set(c.id, c);
      c.search = M.norm([c.title, c.place, c.region, c.country, ...(c.cats || []).map(k => CATS[k]), providerName(c.provider), c.yt ? c.yt.channel : ''].join(' '));
      S.cams.push(c);
    }
    seedStatuses();
    S.loaded = true; S.loading = false; S.loadedAt = Date.now();
    renderDiag(); renderCounts(); rebuildMarkers(true); renderList();
    if (keys().youtube) verifyYouTube().catch(() => {});
  }
  const providerName = (id) => (PROVIDERS.find(p => p.id === id) || {}).name || id;

  /** Use timestamps that providers give for all cameras at once (no extra requests). */
  function seedStatuses() {
    const now = Date.now();
    for (const c of S.cams) {
      if (S.status.has(c.id)) continue;
      if (c.provider === 'digitraffic' && c.extra && c.extra.measured && S.provState.digitraffic && !S.provState.digitraffic.cached) { const t = Date.parse(c.extra.measured), age = now - t; setStatus(c.id, { st: c.sourceOffline ? 'offline' : age < 40 * 60000 ? 'updating' : 'stale', capture: t, note: 'Capture time (measuredTime) from Digitraffic.', verifiedAt: now }); }
      else if ((c.provider === 'lta' || c.provider === 'iem') && c.extra && (c.extra.ts || c.extra.valid)) { const t = Date.parse(c.extra.ts || c.extra.valid), age = now - t; setStatus(c.id, { st: age < (c.provider === 'lta' ? 15 : 30) * 60000 ? 'updating' : 'stale', capture: t, verifiedAt: now, note: 'Capture time from the provider API.' }); }
    }
  }

  /* ---------- YouTube verification (optional key) ---------- */
  async function verifyYouTube() {
    const key = keys().youtube; if (!key) return;
    const yt = S.cams.filter(c => c.provider === 'youtube');
    for (let i = 0; i < yt.length; i += 50) {
      const batch = yt.slice(i, i + 50);
      try {
        const r = await getJSON(`https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=${batch.map(c => c.yt.vid).join(',')}&key=${encodeURIComponent(key)}`);
        const found = new Map((r.items || []).map(it => [it.id, it]));
        const now = Date.now();
        for (const c of batch) {
          const it = found.get(c.yt.vid);
          if (!it) { setStatus(c.id, { st: 'offline', verifiedAt: now, note: 'YouTube reports this video as unavailable (removed or private).' }); continue; }
          const lbc = it.snippet && it.snippet.liveBroadcastContent, lsd = it.liveStreamingDetails || {};
          if (lbc === 'live') setStatus(c.id, { st: 'live', verifiedAt: now, note: `YouTube Data API: broadcasting live${lsd.concurrentViewers ? ` (${lsd.concurrentViewers} watching)` : ''}.` });
          else if (lsd.actualEndTime) setStatus(c.id, { st: 'ended', verifiedAt: now, note: `Broadcast ended ${new Date(lsd.actualEndTime).toLocaleString()}.` });
          else if (lbc === 'upcoming') setStatus(c.id, { st: 'unknown', verifiedAt: now, note: 'Scheduled, not live yet.' });
          else setStatus(c.id, { st: 'unknown', verifiedAt: now, note: 'Not a live broadcast according to YouTube.' });
          if (it.status && it.status.embeddable === false) setStatus(c.id, { noEmbed: true });
        }
        S.provState.youtube.verified = now; S.provState.youtube.verifyError = null;
      } catch (e) { if (S.provState.youtube) S.provState.youtube.verifyError = e.status === 400 || e.status === 403 ? 'API key rejected or quota exceeded' : e.message; break; }
    }
    renderDiag(); renderCounts(); rebuildMarkers(true); if (S.sel) renderViewer();
  }
  /** Without a key: the public oEmbed endpoint confirms the video still exists and is embeddable (not that it is live). */
  async function checkOEmbed(c) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + c.yt.vid)}&format=json`);
      if (r.status === 404 || r.status === 400) { if (!keys().youtube) setStatus(c.id, { st: 'offline', verifiedAt: Date.now(), note: 'YouTube reports this video is no longer available.' }); }
      else if (r.status === 401 || r.status === 403) setStatus(c.id, { noEmbed: true, note: 'The owner does not allow embedding; open it on YouTube.' });
      else if (r.ok && !keys().youtube) setStatus(c.id, { oembedOk: Date.now() });
    } catch (e) { /* network: leave unknown */ }
  }

  /* ================================================================== */
  /* Globe                                                               */
  /* ================================================================== */
  let root, G = null, fallback = null, globeKind = 'none', sunU = null, clusters = [], cellDeg = 0, rebuildTimer = null;
  function sunNow() { return TE.sunPosition(S.preview != null ? S.preview : Date.now()); }
  function llToVec(lat, lon) { const phi = (90 - lat) * Math.PI / 180, th = (90 - lon) * Math.PI / 180; return { x: Math.sin(phi) * Math.cos(th), y: Math.cos(phi), z: Math.sin(phi) * Math.sin(th) }; }

  async function initGlobe() {
    const host = M.$('#lwGlobe', root);
    let ok = false;
    try {
      if (!window.WebGLRenderingContext) throw new Error('WebGL not available');
      await M.loadScript(CDN.globe);
      if (typeof window.Globe !== 'function') throw new Error('globe library did not load');
      const make = window.Globe;
      let g; try { g = make({ animateIn: false })(host); } catch (e) { g = new make(host, { animateIn: false }); }
      G = g;
      G.width(host.clientWidth).height(host.clientHeight)
        .backgroundImageUrl(CDN.sky).globeImageUrl(CDN.day).bumpImageUrl(CDN.bump)
        .showAtmosphere(S.prefs.atmosphere).atmosphereColor('#7cc4ff').atmosphereAltitude(0.17)
        .pointsMerge(true).pointsTransitionDuration(0).pointLat('lat').pointLng('lng').pointAltitude('alt').pointRadius('r').pointColor('color')
        .ringsData([]).ringColor(() => (t) => `rgba(255,198,92,${1 - t})`).ringMaxRadius(2.2).ringPropagationSpeed(2.5).ringRepeatPeriod(900)
        .pathsData([]).pathPoints('pts').pathPointLat(p => p[1]).pathPointLng(p => p[0]).pathColor(() => 'rgba(255,214,120,0.75)').pathStroke(1.2).pathTransitionDuration(0)
        .onZoom(() => scheduleRebuild());
      const ctr = G.controls(); ctr.enableDamping = true; ctr.dampingFactor = 0.12; ctr.rotateSpeed = 0.55; ctr.zoomSpeed = 1.4; ctr.minDistance = 101.5; ctr.maxDistance = 700;
      const pov = store.get('pov', null);
      G.pointOfView(pov && Number.isFinite(pov.lat) ? pov : { lat: 25, lng: -30, altitude: 2.4 }, 0);
      installShading();
      bindPicking(G.renderer().domElement);
      globeKind = 'webgl'; ok = true;
    } catch (e) {
      console.warn('Live World: WebGL globe unavailable, using fallback', e);
      M.$('#lwGlobeNote', root).innerHTML = `<div class="note warn small">3D globe unavailable (${esc(e.message)}). Showing a simplified 2D globe instead — rotation, day/night and cameras still work.</div>`;
      try { initFallback(host); globeKind = 'fallback'; ok = true; } catch (e2) { host.innerHTML = `<div class="note error" style="margin:20px">The globe could not be displayed: ${esc(e2.message)}. You can still search and open cameras from the list.</div>`; }
    }
    if (ok) { updateSun(); rebuildMarkers(true); }
    window.addEventListener('resize', onResize);
  }
  function onResize() {
    const host = M.$('#lwGlobe', root); if (!host) return;
    if (G) G.width(host.clientWidth).height(host.clientHeight);
    if (fallback) fallback.resize();
  }

  /** Patch the globe's Phong material: dark night hemisphere, city lights, soft twilight band, driven by the Sun's direction. */
  function installShading() {
    const mat = G.globeMaterial();
    sunU = { sunDir: { value: { x: 1, y: 0, z: 0 } }, nightMap: { value: null }, shadeOn: { value: S.prefs.shading ? 1 : 0 }, lightsOn: { value: S.prefs.lights ? 1 : 0 } };
    const tryNight = () => {
      if (!mat.map || !mat.map.image) return setTimeout(tryNight, 300);
      const Tex = mat.map.constructor, img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { const t = new Tex(img); if ('colorSpace' in mat.map) t.colorSpace = mat.map.colorSpace; t.needsUpdate = true; sunU.nightMap.value = t; mat.needsUpdate = true; };
      img.onerror = () => { sunU.lightsOn.value = 0; };
      img.src = CDN.night;
    };
    tryNight();
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, sunU);
      shader.vertexShader = 'varying vec3 vObjDir;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vObjDir = normalize(position);');
      shader.fragmentShader = 'uniform vec3 sunDir;\nuniform sampler2D nightMap;\nuniform float shadeOn;\nuniform float lightsOn;\nvarying vec3 vObjDir;\n' +
        shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float sunDot = dot(normalize(vObjDir), normalize(sunDir));
  float dayMix = mix(1.0, smoothstep(-0.105, 0.035, sunDot), shadeOn);
  diffuseColor.rgb *= mix(0.10, 1.0, dayMix);
  #ifdef USE_MAP
    vec3 nightTex = texture2D(nightMap, vMapUv).rgb;
    totalEmissiveRadiance += nightTex * lightsOn * shadeOn * (1.0 - dayMix) * 1.6;
  #endif`);
    };
    mat.needsUpdate = true;
  }
  function updateSun() {
    const s = sunNow();
    if (sunU) { const v = llToVec(s.lat, s.lon); sunU.sunDir.value = v; sunU.shadeOn.value = S.prefs.shading ? 1 : 0; sunU.lightsOn.value = S.prefs.lights && sunU.nightMap.value ? 1 : 0; }
    if (G) {
      if (S.prefs.terminator) {
        const circle = d3.geoCircle().center([s.lon + 180, -s.lat]).radius(90)();
        G.pathsData([{ pts: circle.coordinates[0] }]);
      } else G.pathsData([]);
    }
    if (fallback) fallback.draw();
    renderClock();
  }

  /* ---------- Clustering ---------- */
  function visibleCams() {
    const q = S.query ? M.norm(S.query) : '';
    return S.cams.filter(c => {
      if (S.filter === 'favs' && !S.favs.has(c.id)) return false;
      if (S.filter === 'youtube' && c.provider !== 'youtube') return false;
      if (S.filter === 'video' && !(c.kind === 'hls' || c.kind === 'youtube')) return false;
      if (S.filter === 'images' && c.kind !== 'image') return false;
      if (CATS[S.filter] && !(c.cats || []).includes(S.filter)) return false;
      const st = statusOf(c);
      if (S.statusFilter === 'verified' && !(st === 'live' || st === 'updating')) return false;
      if (S.statusFilter === 'hidebad' && (st === 'stale' || st === 'offline' || st === 'ended')) return false;
      if (q && !c.search.includes(q)) return false;
      return true;
    });
  }
  function cellFor(alt) { return alt > 2.2 ? 6 : alt > 1.4 ? 3.5 : alt > 0.8 ? 2 : alt > 0.45 ? 1 : alt > 0.22 ? 0.4 : alt > 0.1 ? 0.12 : 0.03; }
  function scheduleRebuild() { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(() => { if (G) store.set('pov', G.pointOfView()); rebuildMarkers(false); }, 220); }
  function rebuildMarkers(force) {
    if (!G && !fallback) return;
    const pov = G ? G.pointOfView() : fallback.pov();
    const c = cellFor(pov.altitude);
    if (!force && c === cellDeg && Math.abs((rebuildMarkers.lastLat || 0) - pov.lat) < c * 3 && Math.abs((rebuildMarkers.lastLng || 0) - pov.lng) < c * 3) return;
    cellDeg = c; rebuildMarkers.lastLat = pov.lat; rebuildMarkers.lastLng = pov.lng;
    const cams = S.prefs.markers ? visibleCams().filter(x => x.lat != null) : [];
    const capDeg = Math.acos(1 / (1 + pov.altitude)) * 180 / Math.PI + 12; // visible cap + margin (fine levels only)
    const fine = c < 1;
    const cv = llToVec(pov.lat, pov.lng);
    const map = new Map();
    for (const cam of cams) {
      if (fine) { const v = llToVec(cam.lat, cam.lon); const ang = Math.acos(Math.max(-1, Math.min(1, v.x * cv.x + v.y * cv.y + v.z * cv.z))) * 180 / Math.PI; if (ang > capDeg) continue; }
      const k = Math.floor(cam.lat / c) + ':' + Math.floor(cam.lon / c);
      let cl = map.get(k);
      if (!cl) { cl = { cams: [], lat: 0, lng: 0 }; map.set(k, cl); }
      cl.cams.push(cam); cl.lat += cam.lat; cl.lng += cam.lon;
    }
    clusters = [...map.values()].map(cl => {
      const n = cl.cams.length; cl.lat /= n; cl.lng /= n;
      const sts = cl.cams.map(statusOf);
      const live = sts.some(s => s === 'live') || cl.cams.some(x => (S.status.get(x.id) || {}).videoSt === 'live'), upd = sts.some(s => s === 'updating'), allBad = sts.every(s => s === 'offline' || s === 'stale' || s === 'ended');
      const fav = cl.cams.some(x => S.favs.has(x.id));
      const cat = n === 1 ? (cl.cams[0].cats || [])[0] : null;
      cl.color = fav ? '#ffc65c' : live ? '#ff4d6d' : upd ? '#34d399' : allBad ? 'rgba(160,160,170,0.55)' : n > 1 ? '#7dd3fc' : CAT_COLOR[cat] || '#cbd5e1';
      cl.r = Math.min(1.8, (fine ? 0.14 : 0.32) + Math.sqrt(n) * (fine ? 0.05 : 0.12)) * Math.max(0.22, Math.min(1.1, pov.altitude / 1.5));
      cl.alt = 0.006; cl.n = n;
      return cl;
    });
    if (G) G.pointsData(clusters);
    if (fallback) fallback.draw();
    renderCounts();
  }

  /* ---------- Picking (works with merged points, both globes) ---------- */
  function screenOf(cl) { return G ? G.getScreenCoords(cl.lat, cl.lng, cl.alt) : fallback.screen(cl.lat, cl.lng); }
  function frontFacing(cl) {
    const pov = G ? G.pointOfView() : fallback.pov();
    const a = llToVec(pov.lat, pov.lng), b = llToVec(cl.lat, cl.lng);
    return a.x * b.x + a.y * b.y + a.z * b.z > 1 / (1 + pov.altitude) - 0.02;
  }
  function pick(x, y) {
    let best = null, bd = 16 * 16;
    for (const cl of clusters) {
      if (!frontFacing(cl)) continue;
      const s = screenOf(cl); if (!s) continue;
      const d = (s.x - x) ** 2 + (s.y - y) ** 2;
      const rr = Math.max(bd, 8 * 8);
      if (d < rr && d < bd) { bd = d; best = cl; }
    }
    return best;
  }
  function bindPicking(el) {
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: Date.now() }; });
    el.addEventListener('pointerup', (e) => {
      if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
      if (moved > 5) return;
      const r = el.getBoundingClientRect(), cl = pick(e.clientX - r.left, e.clientY - r.top);
      if (!cl) return;
      if (cl.n === 1) select(cl.cams[0].id, { fly: false });
      else if (cellDeg <= 0.03 || cl.cams.every(c => c.lat === cl.cams[0].lat && c.lon === cl.cams[0].lon)) showClusterList(cl);
      else flyTo(cl.lat, cl.lng, Math.max(0.05, (G ? G.pointOfView().altitude : fallback.pov().altitude) * 0.42));
    });
    el.addEventListener('pointermove', M.debounce((e) => {
      const tip = document.getElementById('tooltip');
      const r = el.getBoundingClientRect(), cl = pick(e.clientX - r.left, e.clientY - r.top);
      el.style.cursor = cl ? 'pointer' : '';
      if (!cl) { tip.hidden = true; return; }
      const c0 = cl.cams[0];
      tip.innerHTML = cl.n === 1 ? `<div class="tt-title">${esc(c0.title)}</div><div class="small">${esc([c0.place, c0.country].filter(Boolean).join(' · '))}</div><div class="tiny">${badge(statusOf(c0))} ${esc(kindLabel(c0))}</div>` : `<div class="tt-title">${cl.n} cameras</div><div class="small">${esc([...new Set(cl.cams.map(c => c.country).filter(Boolean))].slice(0, 3).join(', '))}</div><div class="tiny muted">Click to zoom in</div>`;
      tip.hidden = false; tip.style.left = Math.min(innerWidth - 300, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
    }, 30));
    el.addEventListener('pointerleave', () => { document.getElementById('tooltip').hidden = true; });
  }
  function flyTo(lat, lng, altitude, ms = 1200) {
    if (G) G.pointOfView({ lat, lng, altitude }, ms);
    else if (fallback) fallback.flyTo(lat, lng, altitude);
    setTimeout(() => rebuildMarkers(true), ms + 60);
  }

  /* ---------- 2D fallback globe (d3 orthographic on canvas) ---------- */
  function initFallback(host) {
    if (typeof d3 === 'undefined' || !window.MERIDIAN_COUNTRIES_TOPO) throw new Error('map libraries unavailable');
    host.innerHTML = '<canvas class="lw-canvas"></canvas>';
    const cv = host.querySelector('canvas'), ctx = cv.getContext('2d');
    const C = window.MERIDIAN_COUNTRIES_TOPO, land = topojson.feature(C, C.objects.land), borders = topojson.mesh(C, C.objects.countries, (a, b) => a !== b);
    const proj = d3.geoOrthographic().clipAngle(90), path = d3.geoPath(proj, ctx);
    let rot = [30, -25], alt = 2.4, w = 0, h = 0, dpr = 1;
    const scaleFor = () => Math.min(w, h) * 0.45 * (2.4 / Math.max(0.15, alt)) ** 0.75;
    const api = {
      resize() { const r = host.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px'; api.draw(); },
      pov() { return { lat: -rot[1], lng: -rot[0], altitude: alt }; },
      screen(lat, lng) { const p = proj([lng, lat]); return p ? { x: p[0], y: p[1] } : null; },
      flyTo(lat, lng, a) { rot = [-lng, -lat]; alt = a; api.draw(); },
      draw() {
        proj.translate([w / 2, h / 2]).scale(scaleFor()).rotate(rot);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
        ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = '#0d2a4f'; ctx.fill();
        ctx.beginPath(); path(land); ctx.fillStyle = '#3d6b46'; ctx.fill();
        ctx.beginPath(); path(borders); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 0.6; ctx.stroke();
        if (S.prefs.shading) { const s = sunNow(); ctx.beginPath(); path(d3.geoCircle().center([s.lon + 180, -s.lat]).radius(90)()); ctx.fillStyle = 'rgba(2,6,23,.55)'; ctx.fill(); }
        for (const cl of clusters) { const p = proj([cl.lng, cl.lat]); if (!p || !frontFacing(cl)) continue; ctx.beginPath(); ctx.arc(p[0], p[1], 2 + Math.sqrt(cl.n) * 0.9, 0, 6.3); ctx.fillStyle = cl.color; ctx.fill(); }
        if (S.sel) { const c = S.byId.get(S.sel); const p = c && c.lat != null && proj([c.lon, c.lat]); if (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, 6.3); ctx.strokeStyle = '#ffc65c'; ctx.lineWidth = 2; ctx.stroke(); } }
      }
    };
    d3.select(cv).call(d3.drag().on('drag', (ev) => { const k = 0.25 * 2.4 / Math.max(0.3, (2.4 / alt)); rot = [rot[0] + ev.dx * k, Math.max(-89, Math.min(89, rot[1] - ev.dy * k))]; api.draw(); scheduleRebuild(); }));
    cv.addEventListener('wheel', (e) => { e.preventDefault(); alt = Math.max(0.08, Math.min(4, alt * (e.deltaY > 0 ? 1.15 : 0.87))); api.draw(); scheduleRebuild(); }, { passive: false });
    fallback = api; api.resize();
    bindPicking(cv);
  }

  /* ================================================================== */
  /* Camera viewer & live media                                         */
  /* ================================================================== */
  let feed = null; // active media controller for the open camera
  const badge = (st) => `<span class="lw-st ${STATUS[st].cls}" title="${esc(STATUS[st].desc)}">${STATUS[st].label}</span>`;
  const kindLabel = (c) => c.kind === 'hls' ? 'Continuous video (HLS) + still image' : c.kind === 'youtube' ? 'YouTube livestream' : c.kind === 'image' ? `Still image, updates ~every ${c.image.expectedMin} min` : 'Link to camera page';
  /** Absolute time shown in the camera's own zone when known (else the viewer's), with the zone abbreviation. */
  const fmtAbs = (t, zone) => { if (!t) return '—'; const z = zone ? { kind: 'iana', id: zone } : M.localZone(); const w = TE.toZoned(z, t); return `${M.fmtDateTime(w, { seconds: true })} ${TE.zoneAbbrev(z, t) || TE.formatOffset(w.offsetSec)}`; };
  const fmtAgo = (t) => { if (!t) return ''; const s = Math.round((Date.now() - t) / 1000); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min ago` : `${Math.round(s / 86400)} days ago`; };

  function select(id, { fly = true, tab } = {}) {
    const c = S.byId.get(id); if (!c) return;
    stopFeed();
    S.sel = id;
    if (c.lat != null) {
      if (G) G.ringsData([{ lat: c.lat, lng: c.lon }]);
      if (fly) flyTo(c.lat, c.lon, Math.min(G ? G.pointOfView().altitude : 1, 0.35));
    } else if (G) G.ringsData([]);
    if (fallback) fallback.draw();
    renderViewer(tab);
    startFeed(c, tab);
    history.replaceState(null, '', M.link('live', { cam: id }));
  }
  function closeViewer() { stopFeed(); S.sel = null; if (G) G.ringsData([]); if (fallback) fallback.draw(); M.$('#lwPanel', root).innerHTML = panelHome(); bindPanelHome(); history.replaceState(null, '', '#/live'); }

  function renderViewer(tab) {
    const c = S.byId.get(S.sel); if (!c) return;
    const panel = M.$('#lwPanel', root);
    const st = statusOf(c), s = S.status.get(c.id) || {};
    const z = c.zone ? { kind: 'iana', id: c.zone } : null;
    const lw = z ? TE.toZoned(z, Date.now()) : null;
    const fav = S.favs.has(c.id);
    const mediaTabs = c.kind === 'hls' && c.image ? `<div class="seg" role="tablist" aria-label="Media" style="margin-bottom:8px"><button data-media="video" aria-selected="${(tab || 'video') === 'video'}">Live video</button><button data-media="image" aria-selected="${tab === 'image'}">Still image</button></div>` : '';
    panel.innerHTML = `
      <div class="card-head" style="margin-bottom:6px"><div style="flex:1;min-width:0"><h2 class="lw-title">${esc(c.title)}</h2><div class="small muted">${esc([c.place, c.region !== c.place ? c.region : '', c.country].filter(Boolean).join(' · '))}</div></div>
        <button class="icon-btn sm" id="lwFav" aria-pressed="${fav}" aria-label="${fav ? 'Remove from' : 'Add to'} favorites" title="Favorite">${M.icon('star')}</button>
        <button class="icon-btn sm" id="lwClose" aria-label="Close camera">${M.icon('x')}</button></div>
      <div class="row tight" style="margin-bottom:8px" id="lwStatusRow">${badge(st)} <span class="badge">${esc(kindLabel(c))}</span></div>
      ${mediaTabs}
      <div class="lw-media" id="lwMedia"></div>
      <div class="row tight" style="margin:8px 0">
        <button class="btn btn-sm" id="lwRefresh" ${c.kind === 'youtube' || (c.kind === 'hls' && (tab || 'video') === 'video') ? 'hidden' : ''}>${M.icon('reset')} Refresh now</button>
        <button class="btn btn-sm" id="lwFull">⛶ Full screen</button>
        <a class="btn btn-sm" href="${esc(c.page || '#')}" target="_blank" rel="noopener">Original source ↗</a>
        ${c.extra && c.extra.clip ? `<a class="btn btn-sm btn-ghost" href="${esc(c.extra.clip)}" target="_blank" rel="noopener" title="Short recent clip published by TfL (not live)">Recent clip ↗</a>` : ''}
      </div>
      ${c.kind === 'youtube' ? '<p class="tiny muted" style="margin:0 0 6px">Plays muted. If the embedded player shows an error, use “Original source” to watch on YouTube.</p>' : ''}
      <div id="lwFresh"></div>
      <dl class="kv small" style="margin-top:8px">
        <dt>Local time</dt><dd id="lwLocal">${lw ? `${esc(M.fmtDateTime(lw, { seconds: false }))} ${esc(TE.zoneAbbrev(z, Date.now()) || TE.formatOffset(lw.offsetSec))}` : '—'}</dd>
        <dt>Coordinates</dt><dd>${c.lat != null ? `${c.lat.toFixed(4)}°, ${c.lon.toFixed(4)}°${c.precision === 'city' ? ' <span class="tiny muted">(town/city position — exact camera site not published)</span>' : ''}` : '<span class="muted">Not plotted — exact location not established</span>'}</dd>
        <dt>Source</dt><dd>${esc(providerName(c.provider))}${c.yt ? ` · channel <a href="https://www.youtube.com/channel/${esc(c.yt.channelId)}" target="_blank" rel="noopener">${esc(c.yt.channel)}</a>` : ''}</dd>
        ${c.yt ? `<dt>Video ID</dt><dd class="mono">${esc(c.yt.vid)}</dd>` : ''}
        ${c.extra && c.extra.route ? `<dt>Route</dt><dd>${esc(c.extra.route)} ${esc(c.extra.direction || '')}</dd>` : ''}
        ${c.extra && c.extra.presets && c.extra.presets.length > 1 ? `<dt>Views</dt><dd>${c.extra.presets.map((p, i) => `<button class="btn btn-sm btn-ghost" data-preset="${esc(p)}" style="padding:2px 6px">${i + 1}</button>`).join('')}</dd>` : ''}
      </dl>
      <p class="tiny muted" style="margin-top:10px">${esc(STATUS[st].desc)}</p>`;
    panel.querySelector('#lwClose').onclick = closeViewer;
    panel.querySelector('#lwFav').onclick = () => { toggleFav(c.id); renderViewer(tab); };
    panel.querySelector('#lwFull').onclick = () => { const m = M.$('#lwMedia', root); const el = m.querySelector('video,iframe,img') || m; (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); };
    const rb = panel.querySelector('#lwRefresh'); if (rb) rb.onclick = () => feed && feed.refreshNow && feed.refreshNow(true);
    panel.querySelectorAll('[data-media]').forEach(b => b.onclick = () => { stopFeed(); renderViewer(b.dataset.media); startFeed(c, b.dataset.media); });
    panel.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { c.image.url = `https://weathercam.digitraffic.fi/${b.dataset.preset}.jpg`; c.extra.preset = b.dataset.preset; stopFeed(); renderViewer(); startFeed(c); });
    renderFresh();
  }
  function renderStatusRow() {
    const c = S.byId.get(S.sel); const row = M.$('#lwStatusRow', root); if (!c || !row) return;
    row.innerHTML = `${badge(statusOf(c))} <span class="badge">${esc(kindLabel(c))}</span>`;
  }
  function renderFresh() {
    const c = S.byId.get(S.sel), box = M.$('#lwFresh', root); if (!c || !box) return;
    const s = S.status.get(c.id) || {};
    const z = c.zone;
    const rows = [];
    if (c.kind === 'image' || (c.kind === 'hls' && feed && feed.kind === 'image')) {
      rows.push(['Capture time', s.capture ? `${fmtAbs(s.capture, z)} <span class="muted">(${fmtAgo(s.capture)}, from the provider)</span>` : '<span class="muted">Not provided by this source</span>']);
      rows.push(['Published', s.published ? `${fmtAbs(s.published, z)} <span class="muted">(${fmtAgo(s.published)}, server Last-Modified)</span>` : '<span class="muted">Unknown</span>']);
      rows.push(['Retrieved by Meridian', s.retrieved ? `${fmtAbs(s.retrieved)} <span class="muted">(${fmtAgo(s.retrieved)})</span>` : '—']);
      rows.push(['Source updates', `about every ${c.image.expectedMin} min`]);
      rows.push(['Next refresh', s.next ? `${fmtAbs(s.next)} <span class="muted">(every ${feed && feed.intervalMin ? feed.intervalMin.toFixed(1).replace(/\.0$/, '') : '?'} min)</span>` : '—']);
    } else if (c.kind === 'hls') {
      rows.push(['Stream check', s.verifiedAt ? `${fmtAbs(s.verifiedAt)} <span class="muted">(${fmtAgo(s.verifiedAt)})</span>` : 'Checking…']);
    } else if (c.kind === 'youtube') {
      rows.push(['Live status check', s.verifiedAt ? `${fmtAbs(s.verifiedAt)} <span class="muted">(${fmtAgo(s.verifiedAt)}, YouTube Data API)</span>` : keys().youtube ? 'Checking…' : `<span class="muted">Not verified — catalogued as live on ${esc(window.MERIDIAN_LIVECAMS.catalogued)}. Add a YouTube Data API key (Diagnostics) to verify.</span>`]);
    }
    if (c.kind === 'hls' && s.videoSt && !(feed && feed.kind === 'video')) rows.push(['Video stream', `${badge(s.videoSt)} <span class="muted">${esc(s.videoNote || '')} Checked ${esc(fmtAgo(s.videoAt))}.${s.noDecoder ? ' This browser can’t decode the video (H.264), so the still image is shown.' : ''}</span>`]);
    if (s.note) rows.push(['Note', esc(s.note)]);
    if (s.error) rows.push(['Last error', `<span class="err-text">${esc(s.error)}</span>`]);
    box.innerHTML = `<dl class="kv small">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  }

  function stopFeed() { if (feed) { try { feed.stop(); } catch (e) { /* ignore */ } feed = null; } }
  function startFeed(c, tab) {
    const media = M.$('#lwMedia', root); if (!media) return;
    if (c.kind === 'youtube') feed = youtubeFeed(c, media);
    else if (c.kind === 'hls' && (tab || 'video') === 'video') feed = hlsFeed(c, media);
    else if (c.image) feed = imageFeed(c, media);
    else { media.innerHTML = `<div class="empty">This camera can only be viewed on its original website.<br><a class="btn btn-sm" style="margin-top:8px" href="${esc(c.page)}" target="_blank" rel="noopener">Open camera page ↗</a></div>`; feed = { stop() {} }; }
  }

  /** Still images: one timer, no overlapping requests, never faster than the source publishes, capture-aware freshness. */
  function imageFeed(c, media) {
    let timer = null, inflight = null, stopped = false, failures = 0, notFound = 0, lastPublished = null, objUrl = null, unchanged = 0;
    const base = Math.max(c.image.minMin, Math.max(2, c.image.expectedMin) * (S.prefs.refreshFactor || 1));
    const api = { kind: 'image', intervalMin: Math.max(c.image.minMin, c.image.provider === 'lta' ? 2 : base) };
    media.innerHTML = `<div class="lw-imgwrap"><img id="lwImg" alt="${esc(c.title)} — latest camera image" decoding="async"><div class="lw-imgmsg" id="lwImgMsg">Loading latest image…</div></div>`;
    const img = media.querySelector('img'), msg = media.querySelector('#lwImgMsg');
    const evaluate = () => {
      const s = S.status.get(c.id) || {};
      const ref = s.capture || s.published;
      let st;
      if (c.sourceOffline) st = 'offline';
      else if (notFound >= 2) st = 'offline';
      else if (failures >= 3) st = 'stale';
      else if (!s.retrieved) st = s.st || 'unknown';
      else if (ref) { const ageMin = (Date.now() - ref) / 60000; st = ageMin <= Math.max(3 * c.image.expectedMin, c.image.expectedMin + 10) ? 'updating' : 'stale'; }
      else st = 'recent';
      setStatus(c.id, { st, verifiedAt: s.retrieved || s.verifiedAt });
      renderStatusRow(); renderFresh(); rebuildMarkers(true);
    };
    async function providerMeta() {
      // capture times from provider APIs (no image download involved)
      if (c.provider === 'lta') {
        if (!lta.cache || Date.now() - lta.cache.at > 60000) { const j = await getJSON('https://api.data.gov.sg/v1/transport/traffic-images'); lta.cache = { at: Date.now(), cams: ((j.items || [])[0] || {}).cameras || [] }; }
        const m = lta.cache.cams.find(x => String(x.camera_id) === String(c.extra.cameraId));
        if (!m) { notFound++; throw new Error('Camera no longer listed by the API'); }
        c.image.url = validUrl(m.image) || c.image.url; setStatus(c.id, { capture: Date.parse(m.timestamp) });
      } else if (c.provider === 'digitraffic') {
        const j = await getJSON(`https://tie.digitraffic.fi/api/weathercam/v1/stations/${c.extra.station}/data`);
        const p = (j.presets || []).find(x => x.id === (c.extra.preset || c.extra.presets[0]));
        if (p && p.measuredTime) setStatus(c.id, { capture: Date.parse(p.measuredTime) });
      } else if (c.provider === 'iem') {
        if (!iem.cache || Date.now() - iem.cache.at > 4 * 60000) { const net = c.extra.cid.split('-')[0]; const j = await getJSON(`https://mesonet.agron.iastate.edu/geojson/webcam.geojson?network=${encodeURIComponent(net)}`); const other = (iem.cache && iem.cache.feats || []).filter(f => !f.properties.cid.startsWith(net + '-')); iem.cache = { at: Date.now(), feats: other.concat(j.features || []) }; }
        const f = iem.cache.feats.find(x => x.properties && x.properties.cid === c.extra.cid);
        if (!f) { notFound++; throw new Error('Camera not in the current IEM list'); }
        c.image.url = validUrl(f.properties.url || f.properties.imgurl) || c.image.url; setStatus(c.id, { capture: Date.parse(f.properties.utc_valid || f.properties.valid) });
      }
    }
    async function refresh(manual) {
      if (stopped || inflight) return;
      clearTimeout(timer);
      const ctrl = new AbortController(); inflight = ctrl;
      msg.hidden = false; msg.textContent = manual ? 'Refreshing…' : msg.textContent;
      try {
        await providerMeta();
        const url = c.image.url;
        let blobUrl = null, published = null;
        if (c.image.cors) {
          // cache: 'no-cache' revalidates with the server (If-Modified-Since/ETag) — honours caching rules, no cache-busting
          const r = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
          if (r.status === 404 || r.status === 410) { notFound++; throw new Error(`Image not found (HTTP ${r.status})`); }
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const lm = r.headers.get('Last-Modified'); published = lm ? Date.parse(lm) : null;
          const b = await r.blob(); if (!/^image\//.test(b.type) && b.type !== 'application/octet-stream') throw new Error('Response was not an image');
          blobUrl = URL.createObjectURL(b);
        }
        await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Image could not be displayed')); img.src = blobUrl || url; });
        if (objUrl) URL.revokeObjectURL(objUrl); objUrl = blobUrl;
        notFound = 0; failures = 0;
        if (published && lastPublished && published === lastPublished) unchanged++; else unchanged = 0;
        lastPublished = published || lastPublished;
        setStatus(c.id, { retrieved: Date.now(), published: published || (S.status.get(c.id) || {}).published, error: null });
        S.stats.imgOk++; S.stats.lastImg = Date.now();
        msg.hidden = true;
      } catch (e) {
        if (e.name === 'AbortError' || stopped) return;
        failures++; S.stats.imgFail++;
        setStatus(c.id, { error: e.message });
        msg.hidden = false;
        msg.innerHTML = img.src ? `Refresh failed (${esc(e.message)}). Showing the last image retrieved ${esc(fmtAgo((S.status.get(c.id) || {}).retrieved))}.` : `Could not load the image (${esc(e.message)}). <button class="btn btn-sm" id="lwRetry">Retry</button>`;
        const rb = msg.querySelector('#lwRetry'); if (rb) rb.onclick = () => refresh(true);
      } finally { if (inflight === ctrl) inflight = null; }
      if (stopped) return;
      evaluate();
      // schedule: back off when the source hasn't published anything new, and after failures (max 30 min)
      let next = api.intervalMin;
      if (unchanged) next = Math.min(30, next * (1 + unchanged * 0.5));
      if (failures) next = Math.min(30, Math.max(next, 1) * 2 ** Math.min(4, failures));
      const due = Date.now() + next * 60000;
      setStatus(c.id, { next: due }); renderFresh();
      schedule(due);
    }
    function schedule(due) {
      clearTimeout(timer);
      timer = setTimeout(() => { if (document.hidden || root.hidden) { schedule(Date.now() + 15000); return; } refresh(false); }, Math.max(1000, due - Date.now()));
    }
    api.refreshNow = (manual) => refresh(manual);
    api.stop = () => { stopped = true; clearTimeout(timer); if (inflight) inflight.abort(); if (objUrl) URL.revokeObjectURL(objUrl); };
    api.tick = () => { evaluate(); };
    refresh(false);
    return api;
  }

  /** Inspect an HLS playlist twice: live = reachable, has segments, no #EXT-X-ENDLIST, media sequence advancing. */
  async function hlsPlaylistState(url) {
    const txt = await getText(url, { cache: 'no-store', timeout: 15000 });
    let body = txt;
    const variant = txt.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#') && /\.m3u8/i.test(l));
    if (/#EXT-X-STREAM-INF/.test(txt) && variant) body = await getText(new URL(variant, url).href, { cache: 'no-store', timeout: 15000 });
    return { ended: /#EXT-X-ENDLIST/.test(body), seq: +((/#EXT-X-MEDIA-SEQUENCE:(\d+)/.exec(body) || [])[1] || NaN), td: +((/#EXT-X-TARGETDURATION:(\d+)/.exec(body) || [])[1] || 6), segments: (body.match(/#EXTINF/g) || []).length };
  }
  /** Verify a camera's HLS stream and record the result as videoSt (kept separate from the status of whatever media is on screen). */
  async function verifyStream(c, isStopped = () => false) {
    try {
      const a = await hlsPlaylistState(c.hls); if (isStopped()) return null;
      if (a.ended) return record('ended', 'The playlist is marked as ended (#EXT-X-ENDLIST).');
      if (!a.segments) throw new Error('Playlist has no media segments');
      await sleep(Math.min(12, a.td * 1.6) * 1000); if (isStopped()) return null;
      const b = await hlsPlaylistState(c.hls); if (isStopped()) return null;
      if (b.ended) return record('ended', 'The playlist is marked as ended.');
      if (b.seq > a.seq) return record('live', `Live HLS playlist advancing (segment ${b.seq}).`);
      return record('stale', 'The stream playlist is reachable but not advancing.');
    } catch (e) {
      if (isStopped()) return null;
      const prev = S.status.get(c.id) || {}, fails = (prev.hlsFails || 0) + 1;
      setStatus(c.id, { hlsFails: fails, error: e.message });
      return record(e.status === 404 && fails >= 2 ? 'offline' : prev.videoSt === 'live' ? 'live' : 'unknown', `Stream check failed: ${e.message}`);
    }
    function record(st, note) { setStatus(c.id, { videoSt: st, videoAt: Date.now(), videoNote: note, hlsFails: st === 'live' ? 0 : (S.status.get(c.id) || {}).hlsFails }); renderStatusRow(); renderFresh(); rebuildMarkers(true); renderCounts(); return st; }
  }

  /** Continuous HLS video: verify the playlist is live, play once, never reload. */
  function hlsFeed(c, media) {
    let stopped = false, hls = null, checkTimer = null;
    const api = { kind: 'video' };
    media.innerHTML = `<div class="lw-imgwrap"><video id="lwVid" muted playsinline controls preload="none" aria-label="${esc(c.title)} live video"></video><div class="lw-imgmsg" id="lwImgMsg">Connecting to the live stream…</div></div>`;
    const v = media.querySelector('video'), msg = media.querySelector('#lwImgMsg');
    async function verify() {
      const st = await verifyStream(c, () => stopped);
      if (stopped || st == null) return;
      setStatus(c.id, { st, verifiedAt: Date.now(), note: (S.status.get(c.id) || {}).videoNote });
      finish();
    }
    function finish() { renderStatusRow(); renderFresh(); rebuildMarkers(true); if (!stopped) checkTimer = setTimeout(verify, 5 * 60000); } // re-check every 5 min without touching playback
    const noDecoder = (why) => {
      // the stream may be live, but this browser can't decode H.264: say so and fall back to the still image
      msg.hidden = false;
      msg.innerHTML = `This browser can’t decode this stream’s H.264 video (${esc(why)}).${c.image ? ' Switching to the camera’s still image…' : ''}`;
      setStatus(c.id, { noDecoder: true });
      verifyStream(c, () => S.sel !== c.id); // stream status is still checked and reported
      if (c.image) setTimeout(() => { if (stopped || S.sel !== c.id) return; stopFeed(); renderViewer('image'); startFeed(c, 'image'); M.toast('Showing the still image — this browser can’t play the video'); }, 1800);
    };
    (async () => {
      try {
        const nativeHls = !!v.canPlayType('application/vnd.apple.mpegurl');
        const mseH264 = !!(window.MediaSource && MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"'));
        if (!nativeHls && !mseH264) { noDecoder('no H.264 support'); return; }
        if (nativeHls) v.src = c.hls;
        else {
          await M.loadScript(CDN.hls);
          if (!window.Hls || !window.Hls.isSupported()) throw new Error('HLS playback is not supported in this browser');
          hls = new window.Hls({ lowLatencyMode: false, liveSyncDurationCount: 3, maxBufferLength: 20 });
          hls.on(window.Hls.Events.ERROR, (ev, d) => {
            if (/IncompatibleCodecs|bufferAddCodecError|codec/i.test(d.details || '')) { noDecoder(d.details); return; }
            if (!d.fatal) return;
            if (d.type === window.Hls.ErrorTypes.NETWORK_ERROR) { msg.hidden = false; msg.innerHTML = `Stream connection problem (${esc(d.details)}). <button class="btn btn-sm" id="lwRetry">Retry</button>`; msg.querySelector('#lwRetry').onclick = () => { msg.hidden = true; hls.startLoad(); }; }
            else if (d.type === window.Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            else { msg.hidden = false; msg.textContent = `Playback error (${d.details}).`; }
          });
          hls.loadSource(c.hls); hls.attachMedia(v);
        }
        v.addEventListener('playing', () => { msg.hidden = true; }, { once: false });
        v.addEventListener('waiting', () => { msg.hidden = false; msg.textContent = 'Buffering…'; });
        v.play().catch(() => { msg.hidden = false; msg.innerHTML = 'Press play to start the live video.'; });
      } catch (e) { msg.hidden = false; msg.innerHTML = `${esc(e.message)}. ${c.image ? 'Use the “Still image” tab instead.' : ''}`; }
    })();
    verify();
    api.stop = () => { stopped = true; clearTimeout(checkTimer); if (hls) hls.destroy(); v.pause(); v.removeAttribute('src'); v.load(); };
    return api;
  }

  /** YouTube: embed only when opened (muted autoplay), never reloaded; status from the API key or oEmbed availability. */
  function youtubeFeed(c, media) {
    const s = S.status.get(c.id) || {};
    const embed = () => {
      media.innerHTML = `<div class="lw-yt"><iframe src="https://www.youtube-nocookie.com/embed/${esc(c.yt.vid)}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1" title="${esc(c.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    };
    if (s.noEmbed) media.innerHTML = `<div class="empty">The channel doesn’t allow this stream to be embedded.<br><a class="btn btn-sm" style="margin-top:8px" href="${esc(c.page)}" target="_blank" rel="noopener">Watch on YouTube ↗</a></div>`;
    else if (location.protocol === 'file:' && !store.get('ytTryFile', false)) {
      // YouTube refuses embedded players on pages without a web origin (error 153), which is the case for a local file.
      media.innerHTML = `<div class="empty lw-ytfile"><div style="font-size:2rem">▶</div><div><b>Watch this livestream on YouTube</b></div>
        <div class="small" style="max-width:340px;margin:6px auto 10px">YouTube blocks its embedded player on pages opened directly from a file on your computer. Open the stream on YouTube, or host this HTML file on any website (for example GitHub Pages) to watch it inside Meridian.</div>
        <a class="btn btn-sm btn-primary" href="${esc(c.page)}" target="_blank" rel="noopener">Watch live on YouTube ↗</a> <button class="btn btn-sm" id="lwYtTry">Try the embedded player anyway</button></div>`;
      media.querySelector('#lwYtTry').onclick = () => { store.set('ytTryFile', true); embed(); };
    } else embed();
    checkOEmbed(c).then(() => { renderStatusRow(); renderFresh(); });
    if (keys().youtube && !(S.status.get(c.id) || {}).verifiedAt) verifyYouTube().catch(() => {});
    return { kind: 'video', stop() { const f = media.querySelector('iframe'); if (f) f.src = 'about:blank'; } };
  }

  /* ================================================================== */
  /* UI                                                                  */
  /* ================================================================== */
  const FILTERS = [['all', 'All'], ['nature', '🌿 Nature'], ['city', '🏙️ Cities'], ['mountain', '🏔️ Mountains'], ['beach', '🏖️ Beaches'], ['transport', '🚦 Traffic & transport'], ['weather', '🌦️ Weather'], ['landmark', '🗽 Landmarks'], ['youtube', '▶ YouTube'], ['video', '🎥 Live video'], ['images', '🖼️ Updating images'], ['favs', '★ Favorites']];
  function toggleFav(id) { if (S.favs.has(id)) S.favs.delete(id); else S.favs.add(id); store.set('favs', [...S.favs]); rebuildMarkers(true); renderList(); }

  function init(el) {
    root = el;
    el.innerHTML = `
      ${M.pageHead('live', 'Live World', 'Spin the Earth, watch day and night move across it, and open real webcams and livestreams wherever they are. Labels say exactly how live each feed is.')}
      <div class="lw-layout">
        <div class="card lw-card">
          <div class="lw-top">
            <div class="lw-search"><input class="input" id="lwQ" type="search" placeholder="Search cameras, cities, countries, channels…" aria-label="Search cameras" autocomplete="off"><ul class="dropdown" id="lwResults" role="listbox" hidden></ul></div>
            <div class="lw-chips" id="lwChips" role="group" aria-label="Camera filters">${FILTERS.map(([k, l]) => `<button data-f="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join('')}</div>
          </div>
          <div class="lw-stage" id="lwStage">
            <div class="lw-globe" id="lwGlobe"><div class="empty" style="position:absolute;inset:0;display:grid;place-items:center;color:#cbd5e1">Loading the Earth…</div></div>
            <div class="lw-overlay lw-tl"><span class="lw-clock" id="lwClock"></span></div>
            <div class="lw-overlay lw-tr">
              <button class="icon-btn" id="lwReset" title="Reset view" aria-label="Reset globe view">${M.icon('reset')}</button>
              <button class="icon-btn" id="lwZoomIn" aria-label="Zoom in">${M.icon('plus')}</button>
              <button class="icon-btn" id="lwZoomOut" aria-label="Zoom out">${M.icon('minus')}</button>
            </div>
            <details class="lw-overlay lw-bl lw-ctrl" id="lwCtrl"><summary>Layers & time</summary>
              <div class="stack" style="gap:8px;margin-top:8px">
                <label class="check"><input type="checkbox" data-p="shading"> Day / night shading</label>
                <label class="check"><input type="checkbox" data-p="lights"> City lights at night</label>
                <label class="check"><input type="checkbox" data-p="terminator"> Terminator line</label>
                <label class="check"><input type="checkbox" data-p="atmosphere"> Atmosphere glow</label>
                <label class="check"><input type="checkbox" data-p="markers"> Camera markers</label>
                <select class="select" id="lwStatusF" aria-label="Status filter" style="height:32px;font-size:.82rem"><option value="any">Any status</option><option value="verified">Verified live / updating only</option><option value="hidebad">Hide stale & offline</option></select>
                <hr class="sep" style="margin:4px 0">
                <label class="check"><input type="checkbox" id="lwPrevOn"> Preview another time</label>
                <div id="lwPrevBox" hidden>
                  <input class="input" type="datetime-local" id="lwPrevDT" step="60" style="height:32px;font-size:.82rem" aria-label="Preview date and time (your local time)">
                  <input type="range" id="lwPrevSlide" min="-720" max="720" step="10" value="0" aria-label="Shift preview time (hours)" style="width:100%">
                  <div class="tiny muted" id="lwPrevLbl"></div>
                  <button class="btn btn-sm" id="lwPrevNow">Back to now</button>
                </div>
              </div>
            </details>
            <div class="lw-overlay lw-br" id="lwSrc"></div>
          </div>
          <div class="lw-counts small muted" id="lwCounts"></div>
          <div id="lwGlobeNote"></div>
        </div>
        <div class="card lw-panel" id="lwPanel"></div>
      </div>
      <div class="card section-gap" id="lwDiagCard">
        <details id="lwDiag"><summary class="strong">Source diagnostics & settings</summary><div id="lwDiagBody" style="margin-top:10px"></div></details>
      </div>`;
    M.$('#lwPanel', el).innerHTML = panelHome(); bindPanelHome();
    // filters
    M.$('#lwChips', el).addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; S.filter = b.dataset.f; store.set('filter', S.filter); M.$$('#lwChips [data-f]', el).forEach(x => x.setAttribute('aria-pressed', String(x === b))); rebuildMarkers(true); renderList(); });
    const sf = M.$('#lwStatusF', el); sf.value = S.statusFilter; sf.onchange = () => { S.statusFilter = sf.value; store.set('statusFilter', S.statusFilter); rebuildMarkers(true); renderList(); };
    // layer toggles
    M.$$('[data-p]', el).forEach(i => { i.checked = !!S.prefs[i.dataset.p]; i.onchange = () => { S.prefs[i.dataset.p] = i.checked; store.set('prefs', S.prefs); if (i.dataset.p === 'atmosphere' && G) G.showAtmosphere(i.checked); if (i.dataset.p === 'markers') rebuildMarkers(true); updateSun(); }; });
    // time preview
    const pOn = M.$('#lwPrevOn', el), pBox = M.$('#lwPrevBox', el), pDT = M.$('#lwPrevDT', el), pSl = M.$('#lwPrevSlide', el);
    const toLocalInput = (ms) => { const w = TE.toZoned(M.localZone(), ms); return `${TE.isoDate(w)}T${TE.pad(w.h)}:${TE.pad(w.mi)}`; };
    const setPreview = (ms) => { S.preview = ms; updateSun(); };
    pOn.onchange = () => { pBox.hidden = !pOn.checked; if (pOn.checked) { const now = Date.now(); pDT.value = toLocalInput(now); pSl.value = 0; setPreview(now); } else { S.preview = null; updateSun(); } };
    pDT.oninput = () => { const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(pDT.value); if (!m) return; const r = TE.resolveLocal(M.localZone(), { y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: 0 }); const t = r.status === 'gap' ? r.shiftedEpochMs : r.candidates[0].epochMs; pSl.value = 0; pSl.dataset.base = t; setPreview(t); };
    pSl.oninput = () => { const base = +pSl.dataset.base || Date.now(); setPreview(base + (+pSl.value) * 60000 * 6); };
    M.$('#lwPrevNow', el).onclick = () => { pOn.checked = false; pBox.hidden = true; S.preview = null; updateSun(); };
    // globe buttons
    M.$('#lwReset', el).onclick = () => { store.del('pov'); flyTo(25, -30, 2.4, 1000); };
    M.$('#lwZoomIn', el).onclick = () => { const p = G ? G.pointOfView() : fallback && fallback.pov(); if (p) flyTo(p.lat, p.lng, Math.max(0.05, p.altitude * 0.6), 500); };
    M.$('#lwZoomOut', el).onclick = () => { const p = G ? G.pointOfView() : fallback && fallback.pov(); if (p) flyTo(p.lat, p.lng, Math.min(4, p.altitude * 1.6), 500); };
    // search
    const q = M.$('#lwQ', el), res = M.$('#lwResults', el);
    let items = [], active = 0;
    const renderRes = () => {
      res.innerHTML = items.length ? items.map((c, i) => `<li class="opt" role="option" data-i="${i}" aria-selected="${i === active}"><div style="min-width:0"><div class="t">${esc(c.title)}</div><div class="s">${esc([c.place, c.country, providerName(c.provider)].filter(Boolean).join(' · '))}${c.lat == null ? ' · no exact location' : ''}</div></div><span class="o">${badge(statusOf(c))}</span></li>`).join('') : '<li class="msg">No cameras match.</li>';
      res.hidden = false;
    };
    q.addEventListener('input', M.debounce(() => {
      S.query = q.value.trim();
      const n = M.norm(S.query);
      items = n.length < 2 ? [] : S.cams.filter(c => c.search.includes(n)).sort((a, b) => (b.title.toLowerCase().startsWith(n) ? 1 : 0) - (a.title.toLowerCase().startsWith(n) ? 1 : 0)).slice(0, 30);
      active = 0; if (n.length >= 2) renderRes(); else res.hidden = true;
      rebuildMarkers(true); renderList();
    }, 200));
    q.addEventListener('keydown', (e) => {
      if (res.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); renderRes(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); renderRes(); }
      else if (e.key === 'Enter' && items[active]) { e.preventDefault(); res.hidden = true; select(items[active].id); }
      else if (e.key === 'Escape') res.hidden = true;
    });
    q.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 150));
    res.addEventListener('mousedown', (e) => e.preventDefault());
    res.addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (o) { res.hidden = true; select(items[+o.dataset.i].id); } });
    // diagnostics
    M.$('#lwDiag', el).addEventListener('toggle', renderDiag);
    document.addEventListener('visibilitychange', () => { if (!G) return; if (document.hidden || root.hidden) G.pauseAnimation(); else G.resumeAnimation(); });
    M.bindCopy(el);
    (async () => {
      await M.loadScript('data/countries-map.js').catch(() => {});
      initGlobe();
      loadAll(false);
    })();
  }

  function panelHome() {
    return `<div class="card-head"><h2>Cameras</h2><span class="sub" id="lwListSub"></span></div>
      <div class="seg" role="tablist" aria-label="List" id="lwListTabs" style="margin-bottom:8px"><button data-lt="view" aria-selected="true">In view</button><button data-lt="nogeo" aria-selected="false">No exact location</button><button data-lt="favs" aria-selected="false">Favorites</button></div>
      <ul class="lw-list" id="lwList"></ul>
      <p class="tiny muted" style="margin-top:8px">Click a marker on the globe or a camera here to watch it. Clusters zoom in when clicked.</p>
      <div class="lw-legend tiny"><span><i style="background:#ff4d6d"></i>Live video verified</span><span><i style="background:#34d399"></i>Image updating</span><span><i style="background:#7dd3fc"></i>Group of cameras</span><span><i style="background:#cbd5e1"></i>Status unknown</span><span><i style="background:rgba(160,160,170,.55)"></i>Stale / offline</span><span><i style="background:#ffc65c"></i>Favorite</span></div>`;
  }
  let listTab = 'view';
  function bindPanelHome() {
    const t = M.$('#lwListTabs', root); if (!t) return;
    t.onclick = (e) => { const b = e.target.closest('[data-lt]'); if (!b) return; listTab = b.dataset.lt; M.$$('#lwListTabs [data-lt]', root).forEach(x => x.setAttribute('aria-selected', String(x === b))); renderList(); };
    M.$('#lwList', root).onclick = (e) => { const li = e.target.closest('[data-cam]'); if (li) select(li.dataset.cam); };
    renderList();
  }
  function renderList() {
    const ul = M.$('#lwList', root); if (!ul) return;
    if (!S.loaded) { ul.innerHTML = '<li class="muted small">Loading sources…</li>'; return; }
    let list;
    if (listTab === 'nogeo') list = S.cams.filter(c => c.lat == null);
    else if (listTab === 'favs') list = S.cams.filter(c => S.favs.has(c.id));
    else {
      const pov = G ? G.pointOfView() : fallback ? fallback.pov() : { lat: 0, lng: 0, altitude: 2 };
      const cv = llToVec(pov.lat, pov.lng);
      list = visibleCams().filter(c => c.lat != null).map(c => { const v = llToVec(c.lat, c.lon); return [c, v.x * cv.x + v.y * cv.y + v.z * cv.z]; }).filter(([, d]) => d > 1 / (1 + pov.altitude)).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    }
    const order = { live: 0, updating: 1, recent: 2, unknown: 3, stale: 4, ended: 5, offline: 6 };
    list = list.slice().sort((a, b) => order[statusOf(a)] - order[statusOf(b)]).slice(0, 80);
    const sub = M.$('#lwListSub', root); if (sub) sub.textContent = listTab === 'view' ? 'nearest the centre of the view' : '';
    ul.innerHTML = list.length ? list.map(c => `<li data-cam="${esc(c.id)}" tabindex="0"><div style="min-width:0"><div class="t">${S.favs.has(c.id) ? '★ ' : ''}${esc(c.title)}</div><div class="s">${esc([c.place, c.country].filter(Boolean).join(' · '))}</div></div>${badge(statusOf(c))}</li>`).join('') : `<li class="muted small">${listTab === 'favs' ? 'No favorites yet — use ☆ in a camera’s panel.' : listTab === 'nogeo' ? 'None.' : 'No cameras in view with these filters. Rotate or zoom out.'}</li>`;
    ul.onkeydown = (e) => { if (e.key === 'Enter') { const li = e.target.closest('[data-cam]'); if (li) select(li.dataset.cam); } };
  }
  function showClusterList(cl) {
    const panel = M.$('#lwPanel', root);
    stopFeed(); S.sel = null;
    panel.innerHTML = `<div class="card-head"><h2>${cl.n} cameras here</h2><button class="icon-btn sm" id="lwBack" aria-label="Back">${M.icon('x')}</button></div><ul class="lw-list">${cl.cams.slice(0, 200).map(c => `<li data-cam="${esc(c.id)}" tabindex="0"><div style="min-width:0"><div class="t">${esc(c.title)}</div><div class="s">${esc(c.place)}</div></div>${badge(statusOf(c))}</li>`).join('')}</ul>`;
    panel.querySelector('#lwBack').onclick = closeViewer;
    panel.querySelector('.lw-list').onclick = (e) => { const li = e.target.closest('[data-cam]'); if (li) select(li.dataset.cam); };
  }
  function renderCounts(msg) {
    const el = M.$('#lwCounts', root); if (!el) return;
    if (msg) { el.textContent = msg; return; }
    const total = S.cams.length, geo = S.cams.filter(c => c.lat != null).length;
    let live = 0, upd = 0; for (const c of S.cams) { const s = statusOf(c), v = (S.status.get(c.id) || {}).videoSt; if (s === 'live' || v === 'live') live++; else if (s === 'updating') upd++; }
    const shown = clusters.reduce((s, c) => s + c.n, 0);
    el.innerHTML = `<b>${TE.formatNumber(total)}</b> camera entries discovered · <b>${TE.formatNumber(geo)}</b> with coordinates · <b>${live}</b> live video verified · <b>${TE.formatNumber(upd)}</b> images verified updating · ${TE.formatNumber(shown)} shown with current filters`;
    const src = M.$('#lwSrc', root);
    if (src) { const st = Object.values(S.provState); const ok = st.filter(s => s.state === 'ok').length, loading = st.filter(s => s.state === 'loading').length; const bad = st.filter(s => s.state === 'failed' || s.state === 'stale-cache').length; const total = st.filter(s => s.state !== 'needs-key').length; src.innerHTML = `<button class="lw-srcbtn" id="lwSrcBtn" title="Open source diagnostics"><span class="dot ${loading ? '' : bad ? (ok ? 'warn' : 'bad') : 'ok'}"></span>${loading ? `Loading sources… ${ok}/${total} ready` : `${ok}/${total} sources OK`}</button>`; M.$('#lwSrcBtn', root).onclick = () => { const d = M.$('#lwDiag', root); d.open = true; d.scrollIntoView({ behavior: 'smooth' }); }; }
  }
  function renderClock() {
    const el = M.$('#lwClock', root); if (!el) return;
    const t = S.preview != null ? S.preview : Date.now(), u = TE.toZoned(TE.UTC, t), s = TE.sunPosition(t);
    el.innerHTML = `${S.preview != null ? '<b class="lw-prev">PREVIEW</b>' : '<b class="lw-now">NOW</b>'} ${esc(TE.isoDate(u))} ${TE.pad(u.h)}:${TE.pad(u.mi)} UTC · Sun overhead ${Math.abs(s.lat).toFixed(1)}°${s.lat >= 0 ? 'N' : 'S'}, ${Math.abs(s.lon).toFixed(1)}°${s.lon >= 0 ? 'E' : 'W'}`;
    const lbl = M.$('#lwPrevLbl', root);
    if (lbl && S.preview != null) { const w = TE.toZoned(M.localZone(), S.preview); lbl.textContent = `Previewing ${M.fmtDateTime(w)} your time. Real time and the rest of Meridian are unaffected.`; }
  }
  function renderDiag() {
    const body = M.$('#lwDiagBody', root); if (!body || !M.$('#lwDiag', root).open) return;
    const k = keys();
    const rows = PROVIDERS.map(p => {
      const s = S.provState[p.id] || { state: 'not loaded' };
      const st = { ok: '<span class="badge success">OK</span>', loading: '<span class="badge">Loading…</span>', failed: '<span class="badge danger">Failed</span>', 'stale-cache': '<span class="badge amber">Failed — using saved list</span>', 'needs-key': '<span class="badge">Needs API key</span>' }[s.state] || esc(s.state);
      const live = S.cams.filter(c => c.provider === p.id && statusOf(c) === 'live').length, upd = S.cams.filter(c => c.provider === p.id && statusOf(c) === 'updating').length;
      return `<tr><td><b>${esc(p.name)}</b><div class="tiny muted">${esc(p.operator)} · ${esc(p.region)} · <a href="${esc(p.docs)}" target="_blank" rel="noopener">docs</a></div></td><td>${st}${s.error ? `<div class="tiny err-text">${esc(s.error)}</div>` : ''}${s.warnings && s.warnings.length ? `<div class="tiny warn-text">${esc(s.warnings.join('; '))}</div>` : ''}${p.id === 'youtube' && s.verifyError ? `<div class="tiny err-text">Verification: ${esc(s.verifyError)}</div>` : ''}</td><td class="num">${s.count != null ? TE.formatNumber(s.count) : '—'}</td><td class="num">${s.withCoords != null ? TE.formatNumber(s.withCoords) : '—'}</td><td class="num">${live} / ${TE.formatNumber(upd)}</td><td class="small">${s.at ? esc(fmtAgo(s.at)) + (s.cached ? ' (cached)' : '') : '—'}</td><td class="tiny">${esc(p.kinds)}<div class="muted">${esc(p.refresh)}</div></td></tr>`;
    }).join('');
    body.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Provider</th><th>Status</th><th class="num">Entries</th><th class="num">With coords</th><th class="num">Live / updating</th><th>Last metadata</th><th>Media & refresh policy</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="small" style="margin-top:8px">This session: ${S.stats.imgOk} image refreshes succeeded, ${S.stats.imgFail} failed${S.stats.lastImg ? `; last successful refresh ${esc(fmtAgo(S.stats.lastImg))}` : ''}.</p>
      <h3 style="margin:14px 0 6px">Sources not usable from a browser</h3><ul class="small" style="margin:0;padding-left:18px">${BLOCKED.map(([n, w]) => `<li><b>${esc(n)}</b> — ${esc(w)}</li>`).join('')}</ul>
      <h3 style="margin:14px 0 6px">Optional API keys</h3>
      <p class="small muted" style="margin-top:0">Stored only in this browser and sent only to the provider. Leave blank to disable.</p>
      <div class="row"><div class="field"><label for="lwKeyYT">YouTube Data API v3 key <span class="muted">(verifies which streams are live right now)</span></label><input class="input" id="lwKeyYT" type="password" autocomplete="off" placeholder="${k.youtube ? '•••••••• (saved)' : 'not set'}"></div>
        <div class="field"><label for="lwKeyWindy">Windy Webcams API key <span class="muted">(adds Windy’s worldwide webcams)</span></label><input class="input" id="lwKeyWindy" type="password" autocomplete="off" placeholder="${k.windy ? '•••••••• (saved)' : 'not set'}"></div></div>
      <div class="row tight" style="margin-top:8px"><button class="btn btn-sm btn-primary" id="lwKeySave">Save keys & reload sources</button><button class="btn btn-sm" id="lwKeyClear">Remove keys</button><button class="btn btn-sm" id="lwReload">Reload all sources</button><button class="btn btn-sm btn-danger" id="lwClearPrefs">Clear Live World preferences</button></div>`;
    M.$('#lwKeySave', root).onclick = () => { const kk = keys(); const y = M.$('#lwKeyYT', root).value.trim(), w = M.$('#lwKeyWindy', root).value.trim(); if (y) kk.youtube = y; if (w) kk.windy = w; store.set('keys', kk); M.toast('Keys saved'); loadAll(true); };
    M.$('#lwKeyClear', root).onclick = () => { store.del('keys'); M.toast('Keys removed'); loadAll(true); };
    M.$('#lwReload', root).onclick = () => { store.del('catalog'); loadAll(true); };
    M.$('#lwClearPrefs', root).onclick = () => { if (!confirm('Clear Live World favorites, filters, layer settings and saved view?')) return; ['favs', 'filter', 'statusFilter', 'prefs', 'pov', 'catalog'].forEach(store.del); S.favs.clear(); M.toast('Live World preferences cleared'); rebuildMarkers(true); renderList(); };
  }

  function show(params) {
    if (G && !document.hidden) G.resumeAnimation();
    if (params.cam) {
      const open = () => { if (S.byId.has(params.cam)) select(params.cam); };
      if (S.loaded) open(); else { const t = setInterval(() => { if (S.loaded) { clearInterval(t); open(); } }, 300); setTimeout(() => clearInterval(t), 60000); }
    }
    setTimeout(onResize, 50);
  }
  function hide() { if (G) G.pauseAnimation(); document.getElementById('tooltip').hidden = true; if (feed && feed.kind === 'video') { /* keep playing only while visible */ closeViewerMediaOnly(); } }
  function closeViewerMediaOnly() { const id = S.sel; stopFeed(); if (id) { S.sel = id; const m = M.$('#lwMedia', root); if (m) m.innerHTML = '<div class="empty">Paused while you’re on another page. <button class="btn btn-sm" id="lwResume">Resume</button></div>'; const b = M.$('#lwResume', root); if (b) b.onclick = () => select(id, { fly: false }); } }
  let lastSun = 0;
  function tick(now) {
    if (now - lastSun > 30000 && S.preview == null) { lastSun = now; updateSun(); }
    else renderClock();
    if (S.sel && now % 10000 < 1000) { const c = S.byId.get(S.sel); const el = M.$('#lwLocal', root); if (c && c.zone && el) { const z = { kind: 'iana', id: c.zone }, w = TE.toZoned(z, now); el.textContent = `${M.fmtDateTime(w)} ${TE.zoneAbbrev(z, now) || TE.formatOffset(w.offsetSec)}`; } renderFresh(); if (feed && feed.tick) feed.tick(); }
  }
  // read-only hooks for the self-test harness
  M.liveWorld = { _S: S, PROVIDERS, statusOf, select, globe: () => G, globeKind: () => globeKind, feed: () => feed, clusters: () => clusters, sunU: () => sunU };
  M.register('live', { init, show, hide, tick });
})();
