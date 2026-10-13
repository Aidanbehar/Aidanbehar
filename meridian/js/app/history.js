/* Meridian — This Day in History (Wikipedia "On this day" feed, with caching and a limited offline fallback) */
(function () {
  'use strict';
  const M = window.M, TE = M.TE, esc = M.esc;

  /* ------------------------------------------------------------ */
  /* Data access                                                   */
  /* ------------------------------------------------------------ */
  const mem = new Map();
  const CACHE_KEY = 'otdCache', CACHE_MAX = 10, TTL = 7 * 86400000;
  const p2 = (n) => String(n).padStart(2, '0');
  function readCache(key) {
    const c = M.store.get(CACHE_KEY, {});
    const e = c[key];
    if (e && Date.now() - e.at < TTL) return e.data;
    return null;
  }
  function writeCache(key, data) {
    const c = M.store.get(CACHE_KEY, {});
    c[key] = { at: Date.now(), data };
    const keys = Object.keys(c).sort((a, b) => c[b].at - c[a].at);
    for (const k of keys.slice(CACHE_MAX)) delete c[k];
    if (!M.store.set(CACHE_KEY, c)) { // quota: keep only this entry
      M.store.set(CACHE_KEY, { [key]: c[key] });
    }
  }
  function normItem(e, type) {
    const pg = (e.pages || [])[0] || {};
    const pages = (e.pages || []).slice(0, 3).map(p => ({ title: (p.normalizedtitle || p.title || '').replace(/_/g, ' '), url: p.content_urls && p.content_urls.desktop ? p.content_urls.desktop.page : null, desc: p.description || '' }));
    return {
      type, year: typeof e.year === 'number' ? e.year : null, text: e.text || '',
      url: pages[0] ? pages[0].url : null, pages,
      thumb: pg.thumbnail ? pg.thumbnail.source : null,
      desc: pages.map(p => p.desc).join(' · ')
    };
  }
  function normalize(raw) {
    const out = { selected: [], events: [], births: [], deaths: [], holidays: [] };
    for (const k of Object.keys(out)) out[k] = (raw[k] || []).map(e => normItem(e, k));
    return out;
  }
  function localData(m, d) {
    const items = M.D.LOCAL_HISTORY.filter(h => h.m === m && h.d === d).map(h => ({ type: h.type, year: h.year, text: h.text, url: h.url, pages: [{ title: decodeURIComponent(h.url.split('/').pop()).replace(/_/g, ' '), url: h.url }], thumb: null, desc: '' }));
    return { selected: [], events: items.filter(i => i.type === 'events'), births: items.filter(i => i.type === 'births'), deaths: items.filter(i => i.type === 'deaths'), holidays: [], local: true };
  }
  async function get(m, d, { force = false } = {}) {
    const key = `${p2(m)}-${p2(d)}`;
    if (!force && mem.has(key)) return mem.get(key);
    if (!force) { const c = readCache(key); if (c) { mem.set(key, c); return c; } }
    const urls = [
      `https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/${p2(m)}/${p2(d)}`,
      `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${p2(m)}/${p2(d)}`
    ];
    let lastErr;
    for (const u of urls) {
      try {
        const raw = await M.fetchJSON(u, { timeout: 15000, headers: { 'Api-User-Agent': 'Meridian time toolkit (browser app)' } });
        const data = normalize(raw);
        if (!data.events.length && !data.selected.length && !data.births.length) throw new Error('The feed returned no entries.');
        mem.set(key, data); writeCache(key, data);
        return data;
      } catch (e) { lastErr = e; }
    }
    const fb = localData(m, d);
    fb.error = lastErr ? lastErr.message : 'Unknown error';
    return fb; // not cached, so a retry hits the network again
  }
  const fmtYear = (y) => y == null ? '—' : y <= 0 ? `${1 - y} BC` : String(y);

  /* Keyword-based topic & region tagging (approximate; clearly labelled in the UI). */
  const TOPICS = {
    science: { label: 'Science & technology', re: /scien|physic|chemi|biolog|discover|invent|patent|vaccin|medic|surgeon|surgery|computer|internet|software|electric|nuclear|atom|genom|\bDNA\b|theory|laborator|mathemat|engineer|technolog|radio|television|telephone|aircraft|airplane|aviation|rocket|microsc|element|disease|antibiot|robot|transistor|steam engine|railway/i },
    space: { label: 'Space & astronomy', re: /\bspace|astronaut|cosmonaut|\bNASA\b|satellite|orbit|\bmoon\b|lunar|\bmars\b|planet|comet|asteroid|apollo|shuttle|spacecraft|space probe|\bISS\b|telescope|eclipse|galax|Soyuz|Sputnik|Voyager|astronom|meteor|supernova|Hubble/i },
    politics: { label: 'Politics & government', re: /president|prime minister|elected|election|parliament|congress|senate|\bking\b|\bqueen\b|emperor|treaty|independen|constitution|government|revolution|\bcoup\b|declar|republic|minister|dynasty|annex|referendum|united nations|political|monarch|chancellor|throne|crowned|abolish|legislat|supreme court|\blaw\b|suffrage/i },
    war: { label: 'War & conflict', re: /\bwar\b|battle|invasion|invade|army|troops|siege|bomb|military|\bnavy\b|naval|forces|attack|massacre|surrender|armistice|conflict|rebel|insurgen|occupation|genocide|terror/i },
    culture: { label: 'Arts & culture', re: /album|\bfilm\b|movie|novel|opera|music|\bsong|painting|painter|artist|poet|\bplay\b|theatre|theater|broadcast|premiere|published|museum|\bbook\b|singer|actor|actress|composer|writer|author|ballet|sculpt|architect|festival|magazine|newspaper|comic|video game/i },
    sports: { label: 'Sports', re: /olympic|championship|world cup|football|soccer|baseball|basketball|cricket|tennis|marathon|world record|\bleague\b|tournament|\bgolf|boxing|\brace\b|racing|athlete|\bgrand prix|super bowl|stanley cup|hockey|rugby/i },
    disasters: { label: 'Disasters & accidents', re: /earthquake|tsunami|hurricane|cyclone|typhoon|\bflood|eruption|volcan|\bfire\b|crash|disaster|explosion|\bsinks?\b|sank|shipwreck|epidemic|pandemic|famine|derail|collapse|avalanche|tornado|accident/i },
    religion: { label: 'Religion', re: /church|\bpope\b|religio|\bsaint\b|bishop|temple|mosque|cathedral|monaster|christian|islam|muslim|jewish|buddhis|hindu|catholic|protestant/i }
  };
  const REGIONS = {
    europe: { label: 'Europe', re: /europe|britain|british|england|english|scotland|scottish|wales|welsh|ireland|irish|france|french|germany|german|prussia|ital|spain|spanish|portug|netherlands|dutch|belgi|swiss|switzerland|austria|hungar|poland|polish|czech|slovak|sweden|swedish|norw|denmark|danish|finland|finnish|iceland|russia|soviet|ukrain|greece|greek|roman|rome|byzantin|serbia|croatia|bosnia|yugoslav|romania|bulgaria|albania|lithuan|latvia|eston|belarus|vatican|london|paris|berlin|vienna|moscow|habsburg|ottoman/i },
    americas: { label: 'Americas', re: /united states|\bU\.S\.|american|america\b|canada|canadian|mexic|brazil|argentin|chile|peru|colombia|venezuela|cuba|haiti|jamaica|caribbean|bolivia|ecuador|uruguay|paraguay|guatemala|panama|nicaragua|honduras|salvador|costa rica|puerto rico|new york|washington|california|texas|confedera|inca|aztec|maya/i },
    asia: { label: 'Asia', re: /\basia|china|chinese|japan|japanese|korea|india\b|indian (?!ocean)|pakistan|bangladesh|sri lanka|nepal|vietnam|thai|siam|burm|myanmar|cambodia|laos|malaysia|singapore|indonesia|philippin|mongol|tibet|taiwan|hong kong|kazakh|uzbek|afghan|mughal|qing|ming dynasty|tokyo|beijing|shanghai|delhi/i },
    middleeast: { label: 'Middle East', re: /middle east|israel|palestin|iran|persia|iraq|syria|lebanon|jordan|saudi|arabia|yemen|oman|emirates|kuwait|qatar|bahrain|turkey|turkish|türkiye|egypt|jerusalem|baghdad|ottoman|crusade/i },
    africa: { label: 'Africa', re: /africa|egypt|nigeria|kenya|ethiopia|ghana|south africa|zimbabwe|rhodesia|congo|zaire|sudan|morocc|algeria|tunisia|libya|senegal|uganda|tanzania|rwanda|somalia|angola|mozambique|namibia|zambia|madagascar|liberia|sierra leone|cameroon|mali\b|apartheid|mandela/i },
    oceania: { label: 'Oceania', re: /australia|new zealand|aotearoa|fiji|samoa|tonga|papua|hawaii|pacific island|polynesia|melanesia|micronesia|sydney|melbourne|auckland|māori|maori|aborigin/i }
  };
  const PERIODS = { ancient: ['Ancient (before 500)', -99999, 499], medieval: ['Medieval (500–1499)', 500, 1499], early: ['Early modern (1500–1799)', 1500, 1799], c19: ['19th century', 1800, 1899], c20: ['20th century', 1900, 1999], c21: ['21st century', 2000, 99999] };
  function tags(item) {
    const s = item.text + ' ' + (item.desc || '');
    return { topics: Object.keys(TOPICS).filter(k => TOPICS[k].re.test(s)), regions: Object.keys(REGIONS).filter(k => REGIONS[k].re.test(s)) };
  }

  M.historyApi = { get, fmtYear };

  /* ------------------------------------------------------------ */
  /* View                                                          */
  /* ------------------------------------------------------------ */
  let root, sel = { m: 1, d: 1 }, cat = 'selected', filters = { topic: '', region: '', period: '', q: '', order: 'desc' }, current = null, reqId = 0;

  function init(el) {
    root = el;
    const t = M.today();
    sel = { m: t.m, d: t.d };
    el.innerHTML = `
      ${M.pageHead('history', 'This Day in History', 'Pick any month and day — the year doesn’t matter — to see events, births and deaths on that date throughout history. Entries come from Wikipedia’s curated “On this day” feed and link to their source articles.')}
      <div class="hx-layout">
        <div class="card hx-picker">
          <div class="hx-months" role="group" aria-label="Month">${TE.MONTHS_SHORT.map((m, i) => `<button data-m="${i + 1}" aria-pressed="false" aria-label="${TE.MONTHS[i]}">${m}</button>`).join('')}</div>
          <div class="hx-days" id="hxDays" role="group" aria-label="Day"></div>
          <div class="hx-nav">
            <button class="btn btn-sm" id="hxPrev" aria-label="Previous day">${M.icon('chevL')} Prev</button>
            <button class="btn btn-sm" id="hxToday">Today</button>
            <button class="btn btn-sm" id="hxRandom">${M.icon('dice')} Random</button>
            <button class="btn btn-sm" id="hxNext" aria-label="Next day">Next ${M.icon('chevR')}</button>
          </div>
          <p class="tiny muted" style="margin-top:12px">Dates are as given by the sources. Events before the Gregorian reform (1582, later in many countries) are usually given in the Julian calendar.</p>
        </div>
        <div>
          <div class="card">
            <div class="row" style="align-items:center">
              <div style="flex:1;min-width:200px"><div class="hx-title" id="hxTitle"></div><div class="small muted" id="hxSub"></div></div>
              <a class="btn btn-sm" id="hxCal" href="#">Weekdays for this date ${M.icon('arrowR')}</a>
            </div>
            <div id="hxNote"></div>
            <div class="hx-cats" id="hxCats" role="group" aria-label="Category" style="margin-top:12px"></div>
            <div class="hx-filters">
              <label class="sr-only" for="hxTopic">Topic</label>
              <select class="select" id="hxTopic"><option value="">All topics</option>${Object.entries(TOPICS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
              <label class="sr-only" for="hxRegion">Region</label>
              <select class="select" id="hxRegion"><option value="">All regions</option>${Object.entries(REGIONS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
              <label class="sr-only" for="hxPeriod">Period</label>
              <select class="select" id="hxPeriod"><option value="">All periods</option>${Object.entries(PERIODS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
              <label class="sr-only" for="hxOrder">Order</label>
              <select class="select" id="hxOrder"><option value="desc">Newest first</option><option value="asc">Oldest first</option></select>
              <input class="input" id="hxQ" type="search" placeholder="Search text…" aria-label="Search within results">
              <button class="btn btn-sm btn-ghost" id="hxClear">Clear filters</button>
            </div>
            <div class="tiny muted" style="margin-top:-4px;margin-bottom:8px">Topic and region filters use keyword matching on each entry’s text and linked article descriptions, so they are approximate.</div>
            <div id="hxList"></div>
          </div>
        </div>
      </div>`;
    el.querySelector('.hx-months').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) { const m = +b.dataset.m; select(m, Math.min(sel.d, TE.daysInMonth(2024, m))); } });
    M.$('#hxDays', el).addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) select(sel.m, +b.dataset.d); });
    M.$('#hxPrev', el).addEventListener('click', () => step(-1));
    M.$('#hxNext', el).addEventListener('click', () => step(1));
    M.$('#hxToday', el).addEventListener('click', () => { const t = M.today(); select(t.m, t.d); });
    M.$('#hxRandom', el).addEventListener('click', () => { const z = Math.floor(Math.random() * 366); const c = TE.civilFromDays(TE.daysFromCivil(2024, 1, 1) + z); select(c.m, c.d); });
    M.$('#hxCats', el).addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; renderList(); } });
    const onF = () => { filters = { topic: M.$('#hxTopic', el).value, region: M.$('#hxRegion', el).value, period: M.$('#hxPeriod', el).value, q: M.$('#hxQ', el).value.trim(), order: M.$('#hxOrder', el).value }; renderList(); };
    ['#hxTopic', '#hxRegion', '#hxPeriod', '#hxOrder'].forEach(s => M.$(s, el).addEventListener('change', onF));
    M.$('#hxQ', el).addEventListener('input', M.debounce(onF, 200));
    M.$('#hxClear', el).addEventListener('click', () => { ['#hxTopic', '#hxRegion', '#hxPeriod'].forEach(s => { M.$(s, el).value = ''; }); M.$('#hxQ', el).value = ''; onF(); });
    // Offline fallback is temporary: reload the real feed as soon as the connection returns.
    window.addEventListener('online', () => { if (current && current.local) load(true); });
    el.addEventListener('keydown', (e) => {
      if (e.target.closest('input,select,textarea')) return;
      if (e.key === 'ArrowLeft' && e.altKey) { step(-1); } if (e.key === 'ArrowRight' && e.altKey) { step(1); }
    });
  }
  /** Step through the 366 possible month/day combinations (including Feb 29). */
  function step(n) {
    const z = TE.daysFromCivil(2024, sel.m, sel.d) - TE.daysFromCivil(2024, 1, 1);
    const c = TE.civilFromDays(TE.daysFromCivil(2024, 1, 1) + TE.mod(z + n, 366));
    select(c.m, c.d);
  }
  function select(m, d, push = true) {
    sel = { m, d };
    if (push) history.replaceState(null, '', M.link('history', { m, d }));
    renderPicker(); load();
  }
  function renderPicker() {
    M.$$('.hx-months button', root).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.m === sel.m)));
    const t = M.today();
    const n = TE.daysInMonth(2024, sel.m); // year-agnostic: February shows 29
    let html = '';
    for (let d = 1; d <= n; d++) {
      const leap = sel.m === 2 && d === 29;
      html += `<button data-d="${d}" aria-pressed="${d === sel.d}" class="${t.m === sel.m && t.d === d ? 'is-today' : ''} ${leap ? 'leap' : ''}" aria-label="${TE.MONTHS[sel.m - 1]} ${d}${leap ? ' (leap day)' : ''}" ${leap ? 'title="Leap day — only in leap years"' : ''}>${d}</button>`;
    }
    M.$('#hxDays', root).innerHTML = html;
    M.$('#hxTitle', root).textContent = `${TE.MONTHS[sel.m - 1]} ${sel.d}`;
    const t2 = M.today();
    let next = { y: t2.y, m: sel.m, d: sel.d };
    if (sel.m === 2 && sel.d === 29) { let y = t2.y; while (!TE.isLeapYear(y) || TE.compareDates({ y, m: 2, d: 29 }, t2) < 0) y++; next = { y, m: 2, d: 29 }; }
    else if (TE.compareDates(next, t2) < 0) next.y++;
    const days = TE.daysBetween(t2, next);
    M.$('#hxSub', root).textContent = `${sel.m === 2 && sel.d === 29 ? 'Leap day. ' : ''}Next occurrence: ${TE.formatDateLong(next)} (${M.relDays(days)}).`;
    M.$('#hxCal', root).href = M.link('explorer', { date: TE.isoDate(next) });
    M.$('#hxNote', root).innerHTML = sel.m === 2 && sel.d === 29 ? `<div class="note info small" style="margin-top:10px">February 29 exists only in leap years (every 4 years, except century years not divisible by 400). Events listed here happened on leap days.</div>` : '';
  }
  async function load(force = false) {
    const id = ++reqId;
    M.$('#hxList', root).innerHTML = '<div class="skeleton"></div><div class="skeleton" style="width:85%"></div><div class="skeleton" style="width:70%"></div><div class="skeleton" style="width:90%"></div>';
    M.$('#hxCats', root).innerHTML = '';
    const data = await get(sel.m, sel.d, { force });
    if (id !== reqId) return;
    current = data;
    for (const k of ['selected', 'events', 'births', 'deaths', 'holidays']) data[k].forEach(it => { if (!it._tags) it._tags = tags(it); });
    if (data.local && cat === 'selected') cat = 'events';
    renderList();
  }
  function renderList() {
    if (!current) return;
    const data = current;
    const cats = [['selected', 'Highlights'], ['events', 'All events'], ['births', 'Births'], ['deaths', 'Deaths'], ['holidays', 'Observances']];
    const pass = (it) => {
      if (filters.topic && !it._tags.topics.includes(filters.topic)) return false;
      if (filters.region && !it._tags.regions.includes(filters.region)) return false;
      if (filters.period) { const [, a, b] = PERIODS[filters.period]; if (it.year == null || it.year < a || it.year > b) return false; }
      if (filters.q && !M.norm(it.text + ' ' + (it.desc || '')).includes(M.norm(filters.q))) return false;
      return true;
    };
    M.$('#hxCats', root).innerHTML = cats.map(([k, l]) => `<button data-cat="${k}" aria-pressed="${k === cat}">${l}<span class="c">${data[k].filter(pass).length}</span></button>`).join('');
    let items = data[cat].filter(pass);
    if (cat !== 'holidays') items.sort((a, b) => filters.order === 'asc' ? (a.year ?? 1e9) - (b.year ?? 1e9) : (b.year ?? -1e9) - (a.year ?? -1e9));
    let html = '';
    if (data.local) html += `<div class="note warn small" style="margin-bottom:12px"><strong>Showing a limited offline dataset.</strong> The Wikipedia feed could not be loaded (${esc(data.error || '')}). Only a handful of well-known events are bundled. <button class="btn btn-sm" id="hxRetry">${M.icon('reset')} Retry</button></div>`;
    if (!items.length) html += `<div class="empty">${M.icon('book')}<div>${data[cat].length ? 'No entries match the current filters.' : data.local ? 'No entries for this date in the offline dataset.' : 'No entries in this category.'}</div></div>`;
    else {
      const LIMIT = 150;
      html += `<ul class="timeline">${items.slice(0, LIMIT).map(it => {
        const topics = it._tags.topics.slice(0, 2).map(t => `<span class="badge">${esc(TOPICS[t].label)}</span>`).join(' ');
        const src = it.pages && it.pages.length ? it.pages.slice(0, 2).map(p => p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)} ↗</a>` : '').join('') : '';
        return `<li class="${esc(it.type)}"><span class="y">${esc(cat === 'holidays' ? '' : fmtYear(it.year))}</span><span class="dot" aria-hidden="true"></span><div class="body"><div class="txt">${esc(it.text)}<div class="src">${src}${topics ? `<span>${topics}</span>` : ''}${it.year != null && cat !== 'holidays' ? `<a href="${M.link('explorer', { date: it.year >= 1 && it.year <= 9999 ? TE.isoDate({ y: it.year, m: sel.m, d: sel.d }) : '' })}" class="muted" title="Weekday and calendar details (proleptic Gregorian)">${it.year >= 1 && TE.isValidDate(it.year, sel.m, sel.d) ? 'Weekday: ' + TE.WEEKDAYS[TE.weekday(it.year, sel.m, sel.d)] + '*' : ''}</a>` : ''}</div></div>${it.thumb ? `<img class="thumb" src="${esc(it.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</div></li>`;
      }).join('')}</ul>`;
      if (items.length > LIMIT) html += `<div class="small muted center">Showing the first ${LIMIT} of ${items.length}. Use the filters to narrow down.</div>`;
      html += `<p class="tiny muted" style="margin-top:12px">${data.local ? 'Limited offline dataset bundled with Meridian; each entry links to its Wikipedia article.' : 'Source: Wikipedia “On this day”, via the Wikimedia REST API (CC BY-SA). Cached locally for 7 days.'} *Weekdays are computed in the proleptic Gregorian calendar and may differ from the weekday recorded at the time for pre-reform (Julian) dates.</p>`;
    }
    M.$('#hxList', root).innerHTML = html;
    const r = M.$('#hxRetry', root); if (r) r.addEventListener('click', () => load(true));
  }
  function show(params) {
    const m = +params.m, d = +params.d;
    if (m >= 1 && m <= 12 && d >= 1 && d <= TE.daysInMonth(2024, m)) { if (m !== sel.m || d !== sel.d || !current) select(m, d, false); }
    else if (!current) select(sel.m, sel.d, false);
  }
  M.register('history', { init, show });
})();
