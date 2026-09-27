/* The periodic table.
 *
 * Every number on these pages comes from PubChem's own periodic table, fetched
 * and cross-checked against the chemistry library at build time, then baked
 * into the file. The prose is the app's own: a line on where you actually meet
 * the element, and how many bonds it wants, written in the same voice as the
 * lessons. Elements without a note simply show their data.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  /* Where you have met it, and anything worth knowing that a table of numbers
   * does not convey. Editorial, and deliberately only for the elements a
   * beginner is likely to run into. */
  const NOTES = {
    H: 'The lightest atom, and the most common one in the universe. One hand, so it is always at the edge of a molecule and never in the middle.',
    He: 'Balloon gas. Its outer shell is already full, so it bonds with nothing at all — there is no such thing as a helium compound.',
    Li: 'The lithium in rechargeable batteries, and, as a simple carbonate, a mood stabiliser.',
    Be: 'Light, stiff and toxic. Used in X-ray windows because X-rays pass straight through it.',
    B: 'Borax and boric acid. It settles for three bonds and an empty slot, which leaves it hungry for electrons.',
    C: 'The backbone of every molecule in the Learn section. Four hands, and it is happy bonding to itself, which is what makes chains and rings possible.',
    N: 'Most of the air you are breathing. Three hands. Its triple bond is so strong that almost nothing can break it, which is why fertiliser was such a hard problem.',
    O: 'What you breathe and what things burn in. Two hands, and greedy for electrons — second only to fluorine.',
    F: 'The most electron-greedy element there is. One hand. Its grip on carbon is what makes Teflon non-stick.',
    Ne: 'Neon signs. Another full outer shell, so another element that refuses to react.',
    Na: 'Half of table salt. It gives an electron away so readily that pure sodium reacts violently with water.',
    Mg: 'The atom at the centre of chlorophyll, so indirectly the reason plants are green. Burns with a blinding white flame.',
    Al: 'Foil, cans and aeroplanes. The most abundant metal in the Earth’s crust, but so hard to separate from its ore that it was once more precious than gold.',
    Si: 'Sand, glass and every computer chip. Directly below carbon, with four hands as well — but its bonds to itself are weak, which is why life is not silicon-based.',
    P: 'In your DNA backbone and in every match head. It can take five bonds, which the four-hands rule was never meant to cover.',
    S: 'Yellow, and the smell of rotten eggs. Two hands normally, but it stretches to four or six, which is why sulfuric acid looks impossible at first glance.',
    Cl: 'Swimming pools, and the other half of table salt. One hand.',
    Ar: 'About 1% of the air. Used to fill welding shrouds precisely because it does nothing.',
    K: 'The potassium in bananas, and essential to every nerve impulse you have.',
    Ca: 'Your bones and teeth, chalk, limestone and seashells.',
    Ti: 'Titanium dioxide is the whitest white there is — paint, sunscreen and toothpaste.',
    Cr: 'Chrome plating, and the green of emeralds.',
    Mn: 'Permanganate’s intense purple. Its manganese carries seven bonds, far past anything carbon could manage.',
    Fe: 'The iron at the centre of haemoglobin, which is what actually carries oxygen in your blood. Also rust.',
    Co: 'The metal sitting in the middle of vitamin B12 — the only vitamin that contains one.',
    Ni: 'Coins, and the catalyst that hardens vegetable oil.',
    Cu: 'Wiring, because almost nothing conducts better. Green when it weathers, as on old roofs.',
    Zn: 'Galvanised steel, and the white in nappy cream and mineral sunscreen.',
    Ga: 'Melts in your hand at 30°C. In the LEDs lighting the room you are in.',
    Ge: 'The first transistors were made from this, before silicon took over.',
    As: 'A famous poison, and a semiconductor dopant. Sits right under phosphorus, which is part of why it is so toxic — the body confuses them.',
    Se: 'Needed in trace amounts and toxic in slightly larger ones. In old photocopier drums.',
    Br: 'One of only two elements that are liquid at room temperature. One hand.',
    Kr: 'Another noble gas. Used in some high-performance light bulbs.',
    Ag: 'The best electrical conductor of all, and the light-sensitive salt behind photographic film.',
    Sn: 'Tin cans are steel with a thin tin coat. Bronze is copper and tin.',
    I: 'Purple vapour, an antiseptic, and something your thyroid cannot work without. One hand.',
    Xe: 'Used in car headlights and, oddly for a noble gas, as an anaesthetic.',
    Ba: 'The barium meal you swallow for an X-ray. Barium is toxic, but the sulfate is so insoluble it passes straight through.',
    Pt: 'Catalytic converters, and some of the most effective chemotherapy drugs.',
    Au: 'So unreactive it stays shiny indefinitely, which is most of why it has been valued for so long.',
    Hg: 'The other liquid element. Old thermometers, and seriously toxic.',
    Pb: 'Lead pipes, lead paint and leaded petrol, all abandoned once the damage to developing brains was accepted.',
    U: 'Nuclear fuel. Its heaviest naturally occurring isotope is what reactors and weapons both rely on.',
    Pu: 'Made rather than mined. Almost all of it on Earth was manufactured.',
  };

  /* A one-line explanation of what each of PubChem's categories means. */
  const BLOCK_NOTES = {
    'nonmetal': 'The elements life is built from. They tend to gain or share electrons rather than give them away.',
    'noble-gas': 'Outer shells already full, so they react with almost nothing.',
    'alkali-metal': 'One electron to spare, given away very readily. Soft, and violent with water.',
    'alkaline-earth-metal': 'Two electrons to give away. Reactive, but less dramatically so.',
    'metalloid': 'On the fence between metal and non-metal, which is what makes semiconductors possible.',
    'halogen': 'One electron short of a full shell, so they are aggressive about taking one. Each wants exactly one bond.',
    'post-transition-metal': 'Softer, lower-melting metals sitting to the right of the transition block.',
    'transition-metal': 'The familiar metals. They bond in ways the simple "hands" picture was never meant to cover.',
    'lanthanide': 'The rare earths — not actually rare, just awkward to separate from one another.',
    'actinide': 'Heavy and radioactive. Most of them do not occur naturally at all.',
  };

  const STATE_NOTE = {
    Gas: 'a gas at room temperature',
    Liquid: 'a liquid at room temperature',
    Solid: 'a solid at room temperature',
  };

  let built = false;
  let gridNode = null, detailNode = null;
  let selected = null;

  /* --------------------------------------------------------------- layout */
  function build(host) {
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Periodic table' }));
    wrap.appendChild(el('p', { class: 'note', style: { maxWidth: '66ch', marginBottom: '16px' } },
      'All 118 elements. Click any one for its numbers, what it is used for, and every molecule in the built-in database that contains it.'));

    wrap.appendChild(buildLegend());

    wrap.appendChild(el('p', { class: 'pt-hint', text: 'Scroll the table sideways to reach the middle columns.' }));

    gridNode = el('div', { class: 'pt-full', role: 'grid', 'aria-label': 'Periodic table of the elements' });
    /* On a narrow screen the table scrolls sideways rather than shrinking its
     * cells below a tappable size. */
    wrap.appendChild(el('div', { class: 'pt-scroll' }, [gridNode]));

    detailNode = el('div', { class: 'pt-detail' });
    wrap.appendChild(detailNode);

    host.appendChild(wrap);
    renderGrid();
    /* Carbon is the element the rest of the app is about. */
    select(6);
    built = true;
  }

  function buildLegend() {
    const box = el('div', { class: 'pt-legend' });
    const seen = [];
    ME.chem.elements.forEach((e) => {
      const k = ME.chem.blockKey(e.block);
      if (seen.indexOf(k) < 0) seen.push(k);
    });
    seen.forEach((k) => {
      const label = k.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
      box.appendChild(el('span', { class: 'pt-legend-item' }, [
        el('i', { 'data-block': k }),
        el('span', { text: label }),
      ]));
    });
    return box;
  }

  function renderGrid() {
    ME.clear(gridNode);
    ME.chem.elements.forEach((e) => {
      const [row, col] = ME.chem.ptPosition(e.z);
      const cell = el('button', {
        class: 'pt-el', role: 'gridcell',
        style: { gridRow: String(row), gridColumn: String(col) },
        'aria-label': e.name + ', atomic number ' + e.z,
        title: e.name,
      });
      cell.dataset.block = ME.chem.blockKey(e.block);
      cell.dataset.z = String(e.z);
      cell.appendChild(el('span', { class: 'pt-z', text: String(e.z) }));
      cell.appendChild(el('span', { class: 'pt-sym', text: e.sym }));
      cell.appendChild(el('span', { class: 'pt-name', text: e.name }));
      cell.addEventListener('click', () => select(e.z));
      gridNode.appendChild(cell);
    });
    /* Labels for the two rows lifted out of the main body. */
    [[9, 'Lanthanides'], [10, 'Actinides']].forEach(([row, text]) => {
      gridNode.appendChild(el('span', {
        class: 'pt-rowlabel', text,
        style: { gridRow: String(row), gridColumn: '1 / span 2' },
      }));
    });
  }

  /* --------------------------------------------------------- detail panel */
  function select(z) {
    selected = z;
    ME.$$('.pt-el', gridNode).forEach((c) => {
      c.classList.toggle('on', Number(c.dataset.z) === z);
    });
    renderDetail(ME.chem.element(z));
  }

  function renderDetail(e) {
    ME.clear(detailNode);
    if (!e) return;
    const key = ME.chem.blockKey(e.block);

    const head = el('div', { class: 'pt-detail-head' });
    const tile = el('div', { class: 'pt-bigtile' });
    tile.dataset.block = key;
    tile.appendChild(el('span', { class: 'pt-z', text: String(e.z) }));
    tile.appendChild(el('span', { class: 'pt-sym', text: e.sym }));
    head.appendChild(tile);

    const heading = el('div', { style: { flex: '1 1 260px', minWidth: '0' } });
    heading.appendChild(el('h2', { text: e.name, style: { marginBottom: '4px' } }));
    const chips = el('div', { class: 'mol-badges' });
    chips.appendChild(el('span', { class: 'chip', text: e.block || 'Element' }));
    if (e.state) chips.appendChild(el('span', { class: 'chip', text: e.state }));
    heading.appendChild(chips);
    if (BLOCK_NOTES[key]) heading.appendChild(el('p', { class: 'note', text: BLOCK_NOTES[key] }));
    head.appendChild(heading);
    detailNode.appendChild(head);

    if (NOTES[e.sym]) {
      detailNode.appendChild(el('p', { class: 'pt-note', text: NOTES[e.sym] }));
    }

    detailNode.appendChild(buildBonding(e));
    detailNode.appendChild(buildFacts(e));
    detailNode.appendChild(buildConfiguration(e));
    detailNode.appendChild(buildOrbitals(e));

    const inMol = moleculesWith(e.sym);
    detailNode.appendChild(buildMolecules(e, inMol));
    ME.bindTips(detailNode);
  }

  /* ----------------------------------------- how many bonds it wants ---- */
  function buildBonding(e) {
    const b = ME.orbitals.bonding(e);
    const box = el('div', { class: 'pt-bond pt-bond-' + (b ? b.kind : 'varies') });
    box.appendChild(el('div', { class: 'pt-bond-head' }, [
      el('span', { class: 'pt-bond-n', text: b ? b.headline : 'unknown' }),
      el('span', {
        class: 'pt-bond-cap term',
        'data-tip': 'The "hands" idea from lesson 2: how many things this atom holds on to at once.',
        text: 'bonds it wants',
      }),
    ]));
    if (b) {
      box.appendChild(b.html
        ? el('p', { class: 'pt-bond-why', html: b.text })
        : el('p', { class: 'pt-bond-why', text: b.text }));
    }
    return box;
  }

  /* --------------------------------------- electron configuration ------- */
  function buildConfiguration(e) {
    const a = ME.orbitals.analyse(e);
    const box = el('div', { class: 'pt-section' });
    box.appendChild(el('div', { class: 'section-head' }, 'Electron configuration'));
    box.appendChild(el('p', { class: 'note', style: { maxWidth: '68ch' } },
      'Electrons stack up from the inside out, and only the ones in the outermost shell do any bonding. ' +
      'The rings show how many sit in each shell; the boxes show which orbital each one is in, one per box ' +
      'before any of them pair up.'));

    const grid = el('div', { class: 'pt-config' });

    const left = el('div', { class: 'pt-config-shells' });
    left.appendChild(ME.orbitals.shellDiagram(e, a));
    left.appendChild(el('div', { class: 'pt-config-caption' },
      a.rings.length ? a.rings.map((r) => r.count).join(' · ') + ' by shell' : 'no electrons'));
    if (a.outer) {
      left.appendChild(el('div', { class: 'pt-config-outer' },
        a.outer + ' in the outer shell (shell ' + a.valenceN + ')'));
    }
    grid.appendChild(left);

    const right = el('div', { class: 'pt-config-boxes' });
    right.appendChild(el('code', { class: 'pt-config-str', text: e.cfg || '' }));
    right.appendChild(ME.orbitals.orbitalBoxes(a));
    grid.appendChild(right);

    box.appendChild(grid);

    if (a.predicted) {
      box.appendChild(el('p', { class: 'callout warn', style: { marginTop: '12px', fontSize: '.86rem' },
        text: 'This configuration has never been measured — it is what theory predicts, which is the best anybody has for an element this short-lived.' }));
    } else if (!a.matchesZ) {
      box.appendChild(el('p', { class: 'callout warn', style: { marginTop: '12px', fontSize: '.86rem' },
        text: 'The electrons shown add up to ' + a.total + ', not ' + e.z + '. That is a gap in the source data rather than in the chemistry.' }));
    }
    return box;
  }

  /* ------------------------------------------------ orbital shapes ------ */
  function buildOrbitals(e) {
    const a = ME.orbitals.analyse(e);
    const box = el('div', { class: 'pt-section' });
    box.appendChild(el('div', { class: 'section-head' }, 'What the orbitals look like'));
    box.appendChild(el('p', { class: 'note', style: { maxWidth: '68ch' } },
      'An orbital is not a track an electron runs along. It is a region where the electron is likely to be ' +
      'found — a cloud of probability with a definite shape. Each orbital holds at most two electrons, and ' +
      'the two have to spin opposite ways to share it. These shapes are why molecules have shapes at all: a ' +
      'bond forms along the direction an orbital points.'));
    if (a.types.length) {
      box.appendChild(ME.orbitals.orbitalShapes(a));
      box.appendChild(el('p', { class: 'note', style: { marginTop: '10px', fontSize: '.8rem' },
        text: 'Drag any of the p or d pictures to turn it round. The two lobes of one orbital share a colour.' }));
    } else {
      box.appendChild(el('p', { class: 'note', text: 'No configuration on record for this element.' }));
    }
    return box;
  }

  function buildFacts(e) {
    const rows = [];
    const push = (k, v, tip) => { if (v !== null && v !== undefined && v !== '') rows.push([k, v, tip]); };

    push('Atomic number', String(e.z), 'The number of protons. It is what makes this element this element.');
    push('Atomic mass', e.mass ? e.mass + ' u' : null, 'The average mass of one atom, in atomic mass units. Add these up and you get a molecule’s molar mass.');
    push('Electron configuration', e.cfg, 'Which shells and orbitals its electrons occupy. The last part is the outer shell, and the outer shell is what does the bonding.');
    push('Usual charges', e.ox, 'The charges this element takes when it gains or loses electrons.');
    push('Electronegativity', e.en !== null ? String(e.en) : null, 'How strongly it pulls on shared electrons, on a scale where fluorine is 3.98. A big difference between two bonded atoms makes the bond lopsided.');
    push('Atomic radius', e.radius !== null ? e.radius + ' pm' : null, 'How big the atom is, in picometres — trillionths of a metre.');
    push('Ionization energy', e.ion !== null ? e.ion + ' eV' : null, 'The energy needed to pull one electron off. Low means it gives electrons away easily, like a metal.');
    push('Electron affinity', e.affinity !== null ? e.affinity + ' eV' : null, 'How much energy is released when it takes an electron on. High means it is greedy for them.');
    push('Melts at', e.melt !== null ? kelvin(e.melt) : null, null);
    push('Boils at', e.boil !== null ? kelvin(e.boil) : null, null);
    push('Density', e.density !== null ? e.density + ' g/cm³' : null, 'Mass per unit volume. Gases are quoted at room temperature and pressure.');
    push('First identified', e.year && e.year !== 'Ancient' ? e.year : (e.year || null), null);

    const box = el('div', { class: 'pt-facts' });
    rows.forEach(([k, v, tip]) => {
      const row = el('div', { class: 'pt-fact' });
      row.appendChild(tip
        ? el('span', { class: 'k term', 'data-tip': tip, text: k })
        : el('span', { class: 'k', text: k }));
      row.appendChild(el('span', { class: 'v', text: v }));
      box.appendChild(row);
    });
    return box;
  }

  /* PubChem quotes these in kelvin. Give celsius too, since that is what
   * anybody reading this actually thinks in. */
  function kelvin(k) {
    const c = k - 273.15;
    return `${k} K (${c > -1 && c < 1 ? c.toFixed(1) : Math.round(c)}°C)`;
  }

  function moleculesWith(sym) {
    return ME.search.all().filter((m) => hasElement(m, sym));
  }

  /* Read the element out of the stored formula, so this needs no structure
   * parsing and stays instant across the whole database. */
  function hasElement(m, sym) {
    if (!m.f) return false;
    const re = /([A-Z][a-z]?)(\d*)/g;
    let x;
    while ((x = re.exec(m.f)) !== null) {
      if (x[1] === sym) return true;
    }
    return false;
  }

  function buildMolecules(e, list) {
    const box = el('div', { class: 'pt-molecules' });
    const head = el('div', { class: 'section-head' });
    head.appendChild(document.createTextNode(
      list.length
        ? `${list.length} built-in molecule${list.length === 1 ? '' : 's'} contain${list.length === 1 ? 's' : ''} ${e.name.toLowerCase()}`
        : `No built-in molecule contains ${e.name.toLowerCase()}`));
    box.appendChild(head);

    if (!list.length) {
      box.appendChild(el('p', { class: 'note' },
        'The built-in set is about the molecules people meet day to day, so most of the heavier elements do not appear in it.'));
      return box;
    }

    /* Show the famous ones first, then as many others as fit comfortably. */
    const sorted = list.slice().sort((a, b) => (b.g || 0) - (a.g || 0) || a.n.localeCompare(b.n));
    const shown = sorted.slice(0, 24);
    const chips = el('div', { class: 'pt-mol-list' });
    shown.forEach((m) => {
      const b = el('button', { class: 'pt-mol' });
      b.appendChild(el('span', { class: 'nm', text: m.n }));
      b.appendChild(el('span', { class: 'fm', html: ME.formulaHTML(m.f) }));
      b.addEventListener('click', () => ME.router.goMolecule(m));
      chips.appendChild(b);
    });
    box.appendChild(chips);
    if (sorted.length > shown.length) {
      const more = el('button', { class: 'btn btn-sm', style: { marginTop: '10px' } },
        'Search all ' + sorted.length + ' in the search view');
      more.addEventListener('click', () => ME.router.go('#/search?q=' + encodeURIComponent(e.name)));
      box.appendChild(more);
    }
    return box;
  }

  function ensureBuilt(host) { if (!built) build(host); }
  function show(symOrZ) {
    if (!built) return;
    const e = ME.chem.element(symOrZ);
    if (e) select(e.z);
  }

  ME.elements = { ensureBuilt, show, get selected() { return selected; } };
})();
