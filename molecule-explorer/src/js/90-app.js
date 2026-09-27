/* Application shell: navigation, routing, the always-present search box and
 * the theme switch. */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  const VIEWS = ['learn', 'draw', 'gallery', 'search', 'molecule'];
  const TABS = [
    { k: 'learn', label: 'Learn', icon: 'book' },
    { k: 'draw', label: 'Draw', icon: 'pencil' },
    { k: 'gallery', label: 'Gallery', icon: 'grid' },
    { k: 'search', label: 'Search', icon: 'search' },
  ];

  /* Molecules fetched from PubChem this session, so a back button still works. */
  const transient = new Map();
  let currentView = null;
  let searchInput = null, suggestBox = null, searchWrap = null;

  /* ------------------------------------------------------------------ nav */
  function buildNav() {
    const nav = el('header', { class: 'nav' });
    const inner = el('div', { class: 'nav-inner' });

    const brand = el('button', { class: 'brand', 'aria-label': 'Molecule Explorer home' });
    brand.appendChild(logo());
    brand.appendChild(el('span', { text: 'Molecule Explorer' }));
    brand.addEventListener('click', () => go('#/learn'));
    inner.appendChild(brand);

    const tabs = el('nav', { class: 'tabs', 'aria-label': 'Sections' });
    TABS.forEach((t) => {
      const b = el('button', { class: 'tab', text: t.label });
      b.dataset.view = t.k;
      b.addEventListener('click', () => go('#/' + t.k));
      tabs.appendChild(b);
    });
    inner.appendChild(tabs);
    inner.appendChild(el('div', { class: 'nav-spacer' }));

    searchWrap = el('div', { class: 'searchbox' });
    const mag = ME.icon('search', 'mag');
    searchWrap.appendChild(mag);
    searchInput = el('input', {
      type: 'search', placeholder: 'Search molecules…', 'aria-label': 'Search molecules',
      autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false',
    });
    searchWrap.appendChild(searchInput);
    const clearBtn = el('button', { class: 'clear', 'aria-label': 'Clear search' }, [ME.icon('x')]);
    clearBtn.addEventListener('click', () => { searchInput.value = ''; onSearchInput(); searchInput.focus(); });
    searchWrap.appendChild(clearBtn);
    suggestBox = el('div', { class: 'suggest', role: 'listbox' });
    searchWrap.appendChild(suggestBox);
    inner.appendChild(searchWrap);

    const themeBtn = el('button', { class: 'icon-btn', 'aria-label': 'Switch light and dark mode', title: 'Light / dark / follow system' });
    themeBtn.appendChild(ME.icon(ME.theme.effective() === 'dark' ? 'sun' : 'moon'));
    themeBtn.addEventListener('click', () => {
      ME.theme.cycle();
      ME.clear(themeBtn);
      themeBtn.appendChild(ME.icon(ME.theme.effective() === 'dark' ? 'sun' : 'moon'));
    });
    inner.appendChild(themeBtn);

    nav.appendChild(inner);
    return nav;
  }

  function logo() {
    const svg = ME.render2d.svgEl('svg', { viewBox: '0 0 24 24', fill: 'none' });
    svg.setAttribute('width', '24'); svg.setAttribute('height', '24');
    const g = ME.render2d.svgEl('g', { stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round' });
    g.appendChild(ME.render2d.svgEl('path', { d: 'M5 16 L12 12 L19 16' }));
    g.appendChild(ME.render2d.svgEl('path', { d: 'M12 12 L12 5' }));
    svg.appendChild(g);
    [[5, 16], [19, 16], [12, 5]].forEach(([cx, cy]) => {
      svg.appendChild(ME.render2d.svgEl('circle', { cx, cy, r: 2.3, fill: 'var(--accent)' }));
    });
    svg.appendChild(ME.render2d.svgEl('circle', { cx: 12, cy: 12, r: 1.8, fill: 'currentColor' }));
    return svg;
  }

  function syncTabs() {
    ME.$$('.tab').forEach((t) => {
      const active = t.dataset.view === currentView ||
        (currentView === 'molecule' && t.dataset.view === 'search');
      if (active) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
  }

  /* --------------------------------------------------------------- search */
  const onSearchInput = ME.debounce(function () {
    const q = searchInput.value;
    searchWrap.classList.toggle('has-value', !!q);
    if (!q.trim()) { suggestBox.classList.remove('open'); return; }
    ME.searchview.buildSuggestions(suggestBox, q, (rec) => {
      suggestBox.classList.remove('open');
      if (rec) goMolecule(rec);
      else go('#/search?q=' + encodeURIComponent(q));
    });
    suggestBox.classList.add('open');
  }, 60);

  function bindSearch() {
    searchInput.addEventListener('input', onSearchInput);
    searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) onSearchInput(); });
    searchInput.addEventListener('keydown', (ev) => {
      const items = ME.$$('.suggest-item', suggestBox);
      const active = items.findIndex((i) => i.classList.contains('active'));
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!items.length) return;
        const next = ev.key === 'ArrowDown'
          ? Math.min(items.length - 1, active + 1)
          : Math.max(0, active - 1);
        items.forEach((i) => i.classList.remove('active'));
        items[next].classList.add('active');
        items[next].scrollIntoView({ block: 'nearest' });
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        if (active >= 0) { items[active].dispatchEvent(new MouseEvent('mousedown')); return; }
        suggestBox.classList.remove('open');
        go('#/search?q=' + encodeURIComponent(searchInput.value));
        searchInput.blur();
      } else if (ev.key === 'Escape') {
        suggestBox.classList.remove('open');
        searchInput.blur();
      }
    });
    document.addEventListener('click', (ev) => {
      if (!searchWrap.contains(ev.target)) suggestBox.classList.remove('open');
    });
    /* "/" focuses the search box, the way it does everywhere else. */
    document.addEventListener('keydown', (ev) => {
      if (ev.key === '/' && document.activeElement !== searchInput &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        ev.preventDefault();
        searchInput.focus();
      }
    });
  }

  /* --------------------------------------------------------------- router */
  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function goMolecule(rec) {
    const key = rec.cid ? 'cid:' + rec.cid : 'n:' + rec.n;
    transient.set(key, rec);
    go('#/m/' + encodeURIComponent(key));
  }

  function setView(name) {
    currentView = name;
    VIEWS.forEach((v) => {
      const node = ME.$('#view-' + v);
      if (node) node.classList.toggle('active', v === name);
    });
    syncTabs();
  }

  function route() {
    const raw = (location.hash || '#/learn').replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const params = new URLSearchParams(qs || '');

    if (parts[0] === 'm' && parts[1]) {
      const key = decodeURIComponent(parts.slice(1).join('/'));
      const rec = resolveMolecule(key);
      if (rec && rec.then) {
        setView('molecule');
        showMoleculeLoading(key);
        rec.then((r) => { if (r) ME.molpage.open(r); })
          .catch((e) => showMoleculeError(ME.pubchem.describeError(e)));
        return;
      }
      if (rec) { setView('molecule'); ME.molpage.open(rec); return; }
      setView('molecule');
      showMoleculeError('That molecule is not in the built-in database, and it is not in this session’s memory any more. Try searching for it again.');
      return;
    }

    if (parts[0] === 'draw') {
      setView('draw');
      ME.draw.ensureBuilt(ME.$('#view-draw'));
      ME.draw.resize();
      return;
    }
    if (parts[0] === 'gallery') {
      setView('gallery');
      ME.gallery.ensureBuilt(ME.$('#view-gallery'));
      return;
    }
    if (parts[0] === 'search') {
      setView('search');
      ME.searchview.ensureBuilt(ME.$('#view-search'));
      const q = params.get('q') || '';
      if (searchInput.value !== q) {
        searchInput.value = q;
        searchWrap.classList.toggle('has-value', !!q);
      }
      ME.searchview.show(q);
      return;
    }
    setView('learn');
    ME.learn.ensureBuilt(ME.$('#view-learn'));
  }

  function resolveMolecule(key) {
    if (transient.has(key)) return transient.get(key);
    if (key.startsWith('n:')) {
      const rec = ME.search.get(key.slice(2));
      if (rec) return rec;
    }
    if (key.startsWith('cid:')) {
      const cid = key.slice(4);
      const local = ME.search.all().find((m) => String(m.cid) === cid);
      if (local) return local;
      if (ME.pubchem.online()) {
        return ME.pubchem.lookup(cid, { cid })
          .then((rec) => ME.pubchem.synonyms(rec.cid).then((s) => { rec.s = s; transient.set(key, rec); return rec; }));
      }
    }
    return null;
  }

  function showMoleculeLoading(key) {
    const host = ME.$('#view-molecule');
    ME.clear(host);
    host.appendChild(el('div', { class: 'wrap' }, [
      el('div', { class: 'empty' }, [el('span', { class: 'spin' }), el('p', { text: 'Fetching from PubChem…' })]),
    ]));
  }

  function showMoleculeError(msg) {
    const host = ME.$('#view-molecule');
    ME.clear(host);
    const back = el('button', { class: 'btn' }, [ME.icon('back'), 'Back to search']);
    back.addEventListener('click', () => go('#/search'));
    host.appendChild(el('div', { class: 'wrap' }, [
      el('div', { class: 'empty' }, [el('h3', { text: 'Could not open that' }), el('p', { text: msg }), back]),
    ]));
  }

  /* ----------------------------------------------------------------- boot */
  function boot() {
    const db = window.__ME_DB;
    ME.chem.setElements(db.elements);
    ME.search.build(db.molecules);

    document.body.appendChild(buildNav());
    const main = el('main');
    VIEWS.forEach((v) => main.appendChild(el('section', { id: 'view-' + v, class: 'view' })));
    document.body.appendChild(main);

    bindSearch();
    window.addEventListener('hashchange', route);

    ME.bus.on('open-in-draw', ({ molfile }) => {
      go('#/draw');
      ME.draw.ensureBuilt(ME.$('#view-draw'));
      setTimeout(() => { ME.draw.resize(); ME.draw.loadMolfile(molfile); }, 30);
    });

    ME.bus.on('theme', () => {
      ME.molpage.refreshTheme();
      ME.gallery.redrawThumbs();
      ME.draw.refresh();
    });
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => { if (ME.theme.current() === 'system') ME.bus.emit('theme', ME.theme.effective()); };
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else if (mq.addListener) mq.addListener(handler);
    }

    window.addEventListener('online', () => ME.toast('Back online — PubChem search is available again'));
    window.addEventListener('offline', () => ME.toast('Offline. Everything except PubChem search still works.'));

    route();
    document.documentElement.classList.add('ready');
  }

  ME.router = { go, goMolecule, route };
  ME.boot = boot;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
