/* The full-page search results view, and the live suggestion list under the
 * search box. Offline results are instant; PubChem is a clearly separate,
 * clearly optional section below them. */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  let host = null, queryNode = null, offlineNode = null, onlineNode = null;
  let lastQuery = '';
  let onlineToken = 0;

  function ensureBuilt(h) {
    if (host) return;
    host = el('div', { class: 'wrap' });
    queryNode = el('div');
    offlineNode = el('div');
    onlineNode = el('div');
    host.appendChild(queryNode);
    host.appendChild(offlineNode);
    host.appendChild(onlineNode);
    h.appendChild(host);
  }

  function show(query) {
    lastQuery = query;
    ME.clear(queryNode); ME.clear(offlineNode); ME.clear(onlineNode);

    if (!query.trim()) {
      queryNode.appendChild(el('div', { class: 'empty' }, [
        el('h3', { text: 'Search for a molecule' }),
        el('p', { text: 'By name ("aspirin"), by what you call it ("table salt"), by formula ("C8H10N4O2"), or by SMILES ("CCO"). Spelling does not have to be perfect.' }),
      ]));
      return;
    }

    queryNode.appendChild(el('h1', { text: '“' + query + '”' }));

    const res = ME.search.search(query, 60);

    if (res.kind === 'formula' && res.note) {
      queryNode.appendChild(el('div', { class: 'callout', style: { marginBottom: '16px' } }, res.note));
    }
    if (res.typo && res.results.length) {
      queryNode.appendChild(el('p', { class: 'note', style: { marginBottom: '14px' } },
        `Nothing matched exactly. Did you mean ${res.results[0].m.n}?`));
    }

    offlineNode.appendChild(el('div', { class: 'section-head' }, 'In the built-in database'));
    if (!res.results.length) {
      offlineNode.appendChild(el('p', { class: 'note', style: { marginBottom: '8px' } },
        'No match in the ' + ME.search.all().length + ' molecules built into this page.'));
    } else {
      const list = el('div', { class: 'res-list' });
      res.results.forEach((r) => list.appendChild(resultRow(r.m, r.why)));
      offlineNode.appendChild(list);
    }

    buildOnlineSection(query);
  }

  function resultRow(rec, why) {
    const row = el('button', { class: 'res' });
    const thumb = el('div', { class: 'thumb' });
    row.appendChild(thumb);
    if (rec.m) {
      try {
        const mol = ME.chem.fromSmiles(rec.m);
        thumb.appendChild(ME.render2d.render(mol, {
          xray: rec.ns ? 1 : 0, width: 78, height: 58, maxScale: 17, interactive: false,
          bg: getComputedStyle(document.body).getPropertyValue('--surface').trim(),
        }));
      } catch (e) { /* leave the thumbnail blank */ }
    }
    const meta = el('div', { class: 'meta' });
    meta.appendChild(el('div', { class: 'nm', text: rec.n }));
    meta.appendChild(el('div', { class: 'sub', text: why ? why : (rec.x || rec.i || '') }));
    row.appendChild(meta);
    row.appendChild(el('div', { class: 'fm', html: ME.formulaHTML(rec.f) }));
    row.addEventListener('click', () => ME.router.goMolecule(rec));
    return row;
  }

  /* --------------------------------------------------------- online part */
  function buildOnlineSection(query) {
    const token = ++onlineToken;
    const head = el('div', { class: 'section-head' });
    head.appendChild(ME.icon('globe'));
    head.appendChild(document.createTextNode('Search online (PubChem)'));
    onlineNode.appendChild(head);

    if (!ME.pubchem.online()) {
      onlineNode.appendChild(offlineNotice());
      return;
    }

    const box = el('div');
    onlineNode.appendChild(box);
    box.appendChild(el('div', { class: 'panel', style: { display: 'flex', gap: '9px', alignItems: 'center' } }, [
      el('span', { class: 'spin' }),
      el('span', { class: 'note', text: 'Asking PubChem…' }),
    ]));

    ME.pubchem.autocomplete(query)
      .then((names) => {
        if (token !== onlineToken) return;
        ME.clear(box);
        const known = new Set(ME.search.all().map((m) => ME.search.norm(m.n)));
        const fresh = names.filter((n) => !known.has(ME.search.norm(n)));
        if (!fresh.length) {
          box.appendChild(el('p', { class: 'note', text: 'PubChem suggests nothing beyond what is already built in.' }));
          return;
        }
        box.appendChild(el('p', { class: 'note', style: { marginBottom: '10px' } },
          'These are not in the built-in set. Opening one fetches it from PubChem.'));
        const list = el('div', { class: 'res-list' });
        fresh.forEach((name) => {
          const row = el('button', { class: 'res' });
          row.appendChild(el('div', { class: 'thumb' }, [ME.icon('globe')]));
          row.appendChild(el('div', { class: 'meta' }, [
            el('div', { class: 'nm', text: name }),
            el('div', { class: 'sub', text: 'from PubChem' }),
          ]));
          row.addEventListener('click', () => openOnline(name, row));
          list.appendChild(row);
        });
        box.appendChild(list);
      })
      .catch((e) => {
        if (token !== onlineToken) return;
        ME.clear(box);
        box.appendChild(el('div', { class: 'callout warn' }, ME.pubchem.describeError(e)));
      });
  }

  function offlineNotice() {
    return el('div', { class: 'callout warn' }, [
      el('b', { text: 'You are offline. ' }),
      'This is the only part of the app that needs a connection. Everything else — the lessons, the drawing tools, the gallery and all ' + ME.search.all().length + ' built-in molecules — is part of this file and works exactly the same.',
    ]);
  }

  function openOnline(name, row) {
    const original = row.innerHTML;
    ME.clear(row);
    row.appendChild(el('div', { class: 'thumb' }, [el('span', { class: 'spin' })]));
    row.appendChild(el('div', { class: 'meta' }, [el('div', { class: 'nm', text: 'Fetching ' + name + '…' })]));
    ME.pubchem.lookup(name)
      .then((rec) => ME.pubchem.synonyms(rec.cid).then((syn) => { rec.s = syn; return rec; }))
      .then((rec) => ME.router.goMolecule(rec))
      .catch((e) => {
        row.innerHTML = original;
        ME.toast(ME.pubchem.describeError(e));
      });
  }

  /* -------------------------------------------------- suggestion dropdown */
  function buildSuggestions(container, query, onPick) {
    ME.clear(container);
    const res = ME.search.search(query, 8);
    if (res.results.length) {
      container.appendChild(el('div', { class: 'suggest-group', text: 'Built in' }));
      res.results.forEach((r) => {
        const b = el('button', { class: 'suggest-item' });
        b.appendChild(el('div', {}, [
          el('div', { class: 'nm', text: r.m.n }),
          r.why ? el('span', { class: 'why', text: r.why }) : null,
        ]));
        b.appendChild(el('span', { class: 'sub', html: ME.formulaHTML(r.m.f) }));
        b.addEventListener('mousedown', (ev) => { ev.preventDefault(); onPick(r.m); });
        container.appendChild(b);
      });
    } else {
      container.appendChild(el('div', { class: 'suggest-empty' },
        'Nothing built in matches that. Press Enter to search PubChem as well.'));
    }
    const all = el('button', { class: 'suggest-item' });
    all.appendChild(el('div', { class: 'nm', text: 'See all results for “' + query + '”' }));
    all.addEventListener('mousedown', (ev) => { ev.preventDefault(); onPick(null); });
    container.appendChild(all);
  }

  ME.searchview = { ensureBuilt, show, buildSuggestions, get lastQuery() { return lastQuery; } };
})();
