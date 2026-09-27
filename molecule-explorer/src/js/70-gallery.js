/* The Gallery: molecules you have already met today, whether you knew it or not. */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  const CATS = [
    { k: 'all', label: 'Everything' },
    { k: 'food', label: 'Food & flavour' },
    { k: 'medicine', label: 'Medicines' },
    { k: 'body', label: 'Body chemistry' },
    { k: 'psychoactive', label: 'Psychoactive' },
    { k: 'household', label: 'Household' },
    { k: 'fuel', label: 'Fuels' },
    { k: 'materials', label: 'Plastics & materials' },
    { k: 'inorganic', label: 'Inorganic' },
    { k: 'lab', label: 'Lab & solvents' },
    { k: 'building', label: 'Building blocks' },
  ];

  let built = false;
  let filter = 'all';
  let gridNode = null;
  let observer = null;

  function build(host) {
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Gallery' }));
    wrap.appendChild(el('p', { class: 'note', style: { maxWidth: '64ch', marginBottom: '18px' } },
      'Every molecule in here is a real one, checked against PubChem. Most you have already met today — in your kitchen, your bathroom cabinet, your medicine drawer, your bloodstream or your fuel tank. Pick a category, or just scroll.'));

    /* With a few hundred molecules on show, the count on each filter is the
     * quickest way to see what is actually in here. A category with nothing in
     * it is left out rather than offered and then found empty. */
    const all = ME.search.gallery();
    const counts = {};
    all.forEach((m) => { counts[m.c] = (counts[m.c] || 0) + 1; });

    const filters = el('div', { class: 'gal-filters' });
    CATS.filter((c) => c.k === 'all' || counts[c.k]).forEach((c) => {
      const b = el('button', { class: 'btn btn-sm' + (c.k === 'all' ? ' on' : '') });
      b.appendChild(document.createTextNode(c.label));
      b.appendChild(el('span', { class: 'gal-count', text: String(c.k === 'all' ? all.length : counts[c.k]) }));
      b.dataset.cat = c.k;
      b.addEventListener('click', () => {
        filter = c.k;
        ME.$$('.btn', filters).forEach((x) => x.classList.toggle('on', x.dataset.cat === filter));
        renderGrid();
      });
      filters.appendChild(b);
    });
    wrap.appendChild(filters);

    gridNode = el('div', { class: 'gal-grid' });
    wrap.appendChild(gridNode);
    host.appendChild(wrap);
    built = true;
    renderGrid();
  }

  /* Thumbnails are only drawn once a card scrolls into view: sixty structure
   * layouts at once is a visible pause on a phone. */
  function ensureObserver() {
    if (observer || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        observer.unobserve(e.target);
        drawThumb(e.target);
      });
    }, { rootMargin: '220px' });
  }

  function drawThumb(thumb) {
    const rec = thumb.__record;
    if (!rec || thumb.__drawn) return;
    thumb.__drawn = true;
    ME.clear(thumb);
    if (!rec.m) { thumb.appendChild(el('span', { class: 'note', text: 'no structure' })); return; }
    try {
      const mol = ME.chem.fromSmiles(rec.m);
      thumb.appendChild(ME.render2d.render(mol, {
        xray: rec.ns ? 1 : 0, width: 200, height: 124, maxScale: 30, interactive: false,
        bg: getComputedStyle(document.body).getPropertyValue('--surface-2').trim() || '#f6f7fa',
      }));
    } catch (e) {
      thumb.appendChild(el('span', { class: 'note', text: 'no structure' }));
    }
  }

  function renderGrid() {
    if (!gridNode) return;
    ensureObserver();
    ME.clear(gridNode);
    const list = ME.search.gallery().filter((m) => filter === 'all' || m.c === filter);
    if (!list.length) {
      gridNode.appendChild(el('div', { class: 'empty' }, [el('h3', { text: 'Nothing in that category yet' })]));
      return;
    }
    list.forEach((rec) => {
      const card = el('button', { class: 'gal-card' });
      const thumb = el('div', { class: 'thumb' });
      thumb.__record = rec;
      card.appendChild(thumb);
      card.appendChild(el('div', { class: 'nm', text: rec.n }));
      card.appendChild(el('div', { class: 'fx', text: rec.x || '' }));
      card.appendChild(el('div', { class: 'fm', html: ME.formulaHTML(rec.f) }));
      card.addEventListener('click', () => ME.router.goMolecule(rec));
      gridNode.appendChild(card);
      if (observer) observer.observe(thumb); else drawThumb(thumb);
    });
  }

  function ensureBuilt(host) { if (!built) build(host); }
  function redrawThumbs() {
    if (!gridNode) return;
    ME.$$('.thumb', gridNode).forEach((t) => { t.__drawn = false; drawThumb(t); });
  }

  ME.gallery = { ensureBuilt, redrawThumbs };
})();
