/* The molecule page: one molecule shown every way at once, each with a line
 * about why that particular way of drawing it exists. */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  const ORGANIC_TIP = 'Organic chemistry is the chemistry of carbon compounds — carbon bonded to hydrogen and to other carbons. Everything alive is built from them. Inorganic chemistry is everything else: salts, metals, water, acids. The line is a historical convention rather than a law, which is why a few carbon compounds like carbon dioxide sit on the inorganic side.';

  const CATEGORY_LABEL = {
    food: 'Food & flavour', medicine: 'Medicines', body: 'Body chemistry',
    psychoactive: 'Psychoactive', fuel: 'Fuels', household: 'Household',
    materials: 'Plastics & materials', inorganic: 'Inorganic', lab: 'Lab & solvents',
    building: 'Building blocks',
  };

  let current = null;
  let viewer3d = null;

  function open(record) {
    current = record;
    const host = ME.$('#view-molecule');
    ME.clear(host);
    if (viewer3d && viewer3d.dispose) { viewer3d.dispose(); viewer3d = null; }

    const wrap = el('div', { class: 'wrap' });
    host.appendChild(wrap);

    let mol = null;
    if (record.m) {
      try { mol = ME.chem.fromSmiles(record.m); } catch (e) { mol = null; }
    }

    wrap.appendChild(header(record, mol));

    const grid = el('div', { class: 'rep-grid' });
    wrap.appendChild(grid);

    grid.appendChild(cardFormula(record, mol));
    grid.appendChild(cardCondensed(record, mol));
    if (mol) {
      grid.appendChild(cardStructural(record, mol));
      grid.appendChild(cardSkeletal(record, mol));
      grid.appendChild(card3D(record, mol));
      grid.appendChild(cardGroups(record, mol));
    } else {
      grid.appendChild(cardNoStructure(record));
    }
    grid.appendChild(cardIdentifiers(record));

    ME.bindTips(wrap);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ----------------------------------------------------------------- head */
  function header(r, mol) {
    const organic = r.o === 1;
    const head = el('div', { class: 'mol-head' });
    const text = el('div', { class: 'mol-head-text' });

    text.appendChild(el('h1', { text: r.n }));
    if (r.i && ME.search.norm(r.i) !== ME.search.norm(r.n)) {
      text.appendChild(el('div', { class: 'mol-iupac' }, [
        el('span', { class: 'term', 'data-tip': 'The IUPAC name is the systematic one: built from strict rules so that a chemist anywhere can read it and draw the exact structure. Common names are shorter but tell you nothing about the shape.', text: 'IUPAC name' }),
        ': ' + r.i,
      ]));
    }

    const badges = el('div', { class: 'mol-badges' });
    badges.appendChild(el('span', {
      class: 'chip ' + (organic ? 'chip-organic' : 'chip-inorganic'),
      'data-tip': ORGANIC_TIP, text: organic ? 'Organic' : 'Inorganic',
    }));
    /* The category chip would just repeat the badge for inorganic compounds. */
    if (r.c && CATEGORY_LABEL[r.c] && r.c !== 'inorganic') {
      badges.appendChild(el('span', { class: 'chip', text: CATEGORY_LABEL[r.c] }));
    }
    if (r.source === 'pubchem') {
      badges.appendChild(el('span', { class: 'chip', text: 'From PubChem' }));
    }
    if (r.cid) {
      badges.appendChild(el('span', { class: 'chip', text: 'CID ' + r.cid }));
    }
    text.appendChild(badges);

    if (r.x) text.appendChild(el('p', { class: 'mol-fact', text: r.x }));

    const actions = el('div', { class: 'mol-actions' });
    if (mol) {
      const b = el('button', { class: 'btn btn-primary' }, [ME.icon('pencil'), 'Open in Draw']);
      b.addEventListener('click', () => ME.bus.emit('open-in-draw', { record: r, molfile: mol.toMolfile() }));
      actions.appendChild(b);
    }
    const back = el('button', { class: 'btn' }, [ME.icon('back'), 'Back']);
    back.addEventListener('click', () => history.back());
    actions.appendChild(back);
    text.appendChild(actions);

    head.appendChild(text);
    return head;
  }

  /* ------------------------------------------------------------ rep cards */
  function repCard(title, why, tipText) {
    const c = el('div', { class: 'rep' });
    const h = el('h3');
    h.appendChild(document.createTextNode(title));
    if (tipText) h.appendChild(el('span', { class: 'term', 'data-tip': tipText, text: '?', style: { fontSize: '.72rem', opacity: '.6' } }));
    c.appendChild(h);
    c.appendChild(el('p', { class: 'why', text: why }));
    const body = el('div', { class: 'body' });
    c.appendChild(body);
    c.__body = body;
    return c;
  }

  function cardFormula(r, mol) {
    const c = repCard('Molecular formula',
      'A headcount: which elements are here, and how many of each. Quick to write, but it says nothing about how the atoms are joined — which is exactly why the drawings below exist.');
    c.__body.appendChild(el('div', { class: 'formula-big', html: ME.formulaHTML(r.f) }));
    if (r.w) {
      c.__body.appendChild(el('div', { class: 'mass' }, [
        el('span', {
          class: 'term',
          'data-tip': 'Molar mass is what one mole — 6.022 × 10²³ of these molecules — weighs in grams. It is just the masses of all the atoms added up.',
          text: 'Molar mass',
        }),
        `: ${r.w.toFixed(2)} g/mol`,
      ]));
    }
    /* Anything else in the database sharing this formula is the whole point. */
    const twins = ME.search.all().filter((m) => m !== r && m.f === r.f);
    if (twins.length) {
      const box = el('div', { class: 'callout', style: { marginTop: '12px', fontSize: '.86rem' } });
      box.appendChild(document.createTextNode('Same formula, different molecule: '));
      twins.slice(0, 4).forEach((t, i) => {
        if (i) box.appendChild(document.createTextNode(', '));
        const a = el('button', { class: 'btn btn-sm btn-ghost', text: t.n, style: { padding: '0 2px' } });
        a.addEventListener('click', () => ME.router.goMolecule(t));
        box.appendChild(a);
      });
      box.appendChild(document.createTextNode('. Identical headcount, completely different substance.'));
      c.__body.appendChild(box);
    }
    return c;
  }

  function cardCondensed(r, mol) {
    const c = repCard('Condensed formula',
      'The molecule written out as a line of groups, reading along the chain. It fits on one line of text, which is why chemists use it in prose.');
    if (!mol) {
      c.__body.appendChild(el('p', { class: 'note', text: 'There is no structure on file for this one, so there is nothing to condense.' }));
      return c;
    }
    const res = ME.chem.condensed(mol);
    if (res.text) {
      c.__body.appendChild(el('div', { class: 'formula-big mono', style: { fontSize: '1.3rem', wordBreak: 'break-all' }, text: res.text }));
    } else {
      c.__body.appendChild(el('p', { class: 'note', text: res.why }));
    }
    return c;
  }

  function cardStructural(r, mol) {
    const c = repCard('Full structural formula',
      'Every atom and every bond, nothing left out, plus the non-bonding pairs of electrons sitting on the oxygens and nitrogens. Complete, honest, and unbearable to draw for anything large.');
    const holder = el('div');
    holder.appendChild(ME.render2d.render(mol, { xray: 1, lonePairs: true, width: 420, height: 300 }));
    c.__body.appendChild(holder);
    c.__body.appendChild(el('p', { class: 'note', style: { marginTop: '8px' } }, [
      el('span', { class: 'term', 'data-tip': 'A lone pair is two electrons in an atom’s outer shell that are not being shared with anyone. They take up space and push bonds around, which is why water is bent rather than straight.', text: 'The pairs of dots' }),
      ' are lone pairs — electrons the atom keeps to itself.',
    ]));
    return c;
  }

  function cardSkeletal(r, mol) {
    const usable = ME.chem.skeletalMakesSense(mol) && !r.ns;
    const c = repCard('Skeletal (line-angle) formula',
      usable
        ? 'The working drawing. Carbon is so common in these molecules that writing C over and over is pointless clutter, so it is left out: every corner and every line end is a carbon, and the hydrogens on those carbons are assumed. Slide the control to watch them come back.'
        : 'The shorthand chemists use for carbon chains.');
    if (!usable) {
      c.__body.appendChild(el('div', { class: 'callout warn' },
        'A skeletal drawing is a shortcut for carbon chains: the corners stand for carbons. This molecule has no carbon-carbon backbone, so there would be nothing to leave out — the full drawing above already is the short version.'));
      return c;
    }
    ME.render2d.mountXray(c.__body, mol, { width: 420, height: 300, xray: 0 });
    c.__body.appendChild(el('p', { class: 'note', style: { marginTop: '4px' }, text: 'Hover or tap any corner to see what is hiding there.' }));
    return c;
  }

  function card3D(r, mol) {
    const c = repCard('3D shape',
      'Molecules are objects, not diagrams. Shape decides almost everything about how one behaves — what it fits into, what it sticks to, how it smells. Drag to rotate, scroll to zoom.');
    const host = el('div', { class: 'viewer3d' });
    c.__body.appendChild(host);

    const controls = el('div', { class: 'v3d-controls' });
    c.__body.appendChild(controls);

    const source = { title: r.n, key: r.id || r.m };
    if (r.d) {
      source.packed = r.d;
    } else if (ME.chem.fragmentCount(mol) > 1) {
      /* Two or more unconnected pieces: a salt is a repeating grid of ions, and
       * their positions relative to one another are not a property of a single
       * molecule. Generating coordinates here would be inventing a fact. */
      source.why = 'This is made of separate pieces rather than one joined-up molecule. In the solid they pack into a repeating grid, and in water they drift apart — so there is no single 3D shape to rotate.';
    } else {
      source.mol = mol;
    }

    function build() {
      viewer3d = ME.render3d.mount(host, source, { style: 'ballstick' });
      ME.clear(controls);
      if (!viewer3d || !viewer3d.ok) return;
      ['Ball & stick', 'Sticks', 'Space-filling'].forEach((label, i) => {
        const key = ['ballstick', 'stick', 'spacefill'][i];
        const b = el('button', { class: 'btn btn-sm' + (i === 0 ? ' on' : ''), text: label });
        b.addEventListener('click', () => {
          ME.$$('.btn', controls).forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          viewer3d.__style = key;
          viewer3d.setStyle(key);
        });
        controls.appendChild(b);
      });
      let spinning = false;
      const spin = el('button', { class: 'btn btn-sm' }, [ME.icon('rotate'), 'Spin']);
      spin.addEventListener('click', () => { spinning = !spinning; viewer3d.spin(spinning); spin.classList.toggle('on', spinning); });
      controls.appendChild(spin);
      if (r.d && r.d.s === 'pubchem') {
        controls.appendChild(el('span', { class: 'note', style: { marginLeft: 'auto', fontSize: '.76rem' }, text: 'coordinates from PubChem' }));
      } else {
        controls.appendChild(el('span', { class: 'note', style: { marginLeft: 'auto', fontSize: '.76rem' }, text: 'shape worked out in your browser' }));
      }
    }

    /* If this came from PubChem and we have no stored conformer, try to fetch
     * one before falling back to generating it here. */
    if (!r.d && r.cid && r.source === 'pubchem' && ME.pubchem.online()) {
      host.appendChild(el('div', { class: 'overlay' }, [el('div', { class: 'spin' }), el('div', { text: 'Fetching the 3D shape…' })]));
      ME.pubchem.sdf3d(r.cid).then((sdf) => {
        if (sdf) source.molfile = sdf;
        build();
      }).catch(() => build());
    } else {
      build();
    }
    return c;
  }

  function cardGroups(r, mol) {
    const c = repCard('Functional groups',
      ME.chem.hasCarbon(mol)
        ? 'The interesting parts. A long carbon chain is mostly inert scaffolding; the small clusters of atoms bolted onto it are what actually react, dissolve, smell and bind. Chemists recognise molecules by these.'
        : 'The clusters of atoms that decide how a substance behaves. This is really a way of talking about organic molecules.');
    let groups = [];
    try { groups = ME.chem.findGroups(mol); } catch (e) { groups = []; }

    if (!groups.length) {
      const msg = ME.chem.hasCarbon(mol)
        ? 'No standard functional groups here — this is plain carbon-and-hydrogen scaffolding, which is why it is unreactive and greasy.'
        : 'Functional groups are a way of describing organic molecules: small reactive clusters bolted onto a carbon skeleton. This one has no carbon skeleton, so the idea does not apply.';
      c.__body.appendChild(el('p', { class: 'note', text: msg }));
      return c;
    }

    const holder = el('div');
    holder.appendChild(ME.render2d.render(mol, {
      xray: 0, width: 420, height: 260,
      highlight: groups.map((g) => ({ atoms: g.atoms, color: g.color })),
    }));
    c.__body.appendChild(holder);

    const list = el('div', { class: 'fg-list', style: { marginTop: '12px' } });
    groups.forEach((g) => {
      list.appendChild(el('div', { class: 'fg-item' }, [
        el('span', { class: 'fg-dot', style: { background: g.color } }),
        el('div', {}, [
          el('b', { text: g.name + (g.count > 1 ? ` ×${g.count}` : '') }),
          ' ',
          el('span', { text: g.note }),
        ]),
      ]));
    });
    c.__body.appendChild(list);
    return c;
  }

  function cardIdentifiers(r) {
    const c = repCard('Machine-readable names',
      'Two ways of writing a structure as plain text, so it can be emailed, searched and stored in a database without a picture.');
    if (r.m) {
      c.__body.appendChild(el('p', { class: 'note', style: { marginBottom: '4px' } }, [
        el('b', { text: 'SMILES' }), ' — a structure typed as a line of characters. Atoms in order, brackets for branches, digits to close rings.',
      ]));
      c.__body.appendChild(codeRow(r.m, 'SMILES'));
    }
    if (r.k) {
      c.__body.appendChild(el('p', { class: 'note', style: { marginBottom: '4px', marginTop: '10px' } }, [
        el('b', { text: 'InChIKey' }), ' — a fixed-length fingerprint. Two chemists who draw the same molecule get the same key, which makes it a reliable thing to search for.',
      ]));
      c.__body.appendChild(codeRow(r.k, 'InChIKey'));
    }
    if (!r.m && !r.k) c.__body.appendChild(el('p', { class: 'note', text: 'No machine-readable identifiers on file for this one.' }));
    return c;
  }

  function codeRow(value, label) {
    const row = el('div', { class: 'code-row' });
    row.appendChild(el('code', { text: value }));
    const b = el('button', { class: 'btn btn-sm', title: 'Copy ' + label }, [ME.icon('copy')]);
    b.addEventListener('click', () => ME.copy(value, label));
    row.appendChild(b);
    return row;
  }

  function cardNoStructure(r) {
    const c = repCard('Structure', 'Not every substance is a single molecule you can draw.');
    c.__body.appendChild(el('div', { class: 'callout warn' },
      'There is no single structure on file for this one. Proteins and polymers are the same unit repeated thousands of times over, with no fixed size, so there is no one molecule to draw.'));
    return c;
  }

  ME.molpage = { open, get current() { return current; }, refreshTheme() { if (viewer3d && viewer3d.refreshTheme) viewer3d.refreshTheme(); } };
})();
