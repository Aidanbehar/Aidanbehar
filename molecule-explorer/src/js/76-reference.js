/* The Reference tab: the tables you keep needing, plus a glossary.
 *
 * Everything here is the same data the rest of the app uses, so the tables
 * cannot drift from the calculations. Each one says where it came from,
 * because the provenance genuinely differs — the ion table is checked
 * against PubChem at build time, the solubility rules are from a textbook.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  /* The glossary. Definitions in the same voice as the lessons: what it is and
   * why it matters, not a dictionary entry. */
  const GLOSSARY = [
    ['atom', 'The smallest piece of an element that is still that element. Split it and you have changed which element it is.'],
    ['element', 'A substance made of only one kind of atom. There are 118, and everything else is built from them.'],
    ['compound', 'Two or more different elements chemically joined, in a fixed ratio. Water is always two hydrogens to one oxygen — never 2.1.'],
    ['mixture', 'Several substances in the same place but not joined. You can separate a mixture without any chemistry, which is the test.'],
    ['molecule', 'A group of atoms held together by covalent bonds, behaving as one unit.'],
    ['ion', 'An atom or group that has lost or gained electrons, so it carries a charge.'],
    ['cation', 'A positive ion. It has lost electrons. Remember it as the "paw-sitive" cat.'],
    ['anion', 'A negative ion. It has gained electrons.'],
    ['isotope', 'Atoms of the same element with different numbers of neutrons. Same chemistry, different mass.'],
    ['mole', 'A count: 6.022 × 10²³ of something. It exists so you can weigh out a known number of atoms, since counting them is impossible.'],
    ['molar mass', 'What one mole of a substance weighs, in grams. Numerically the same as its formula mass, which is the whole convenience of the mole.'],
    ['valence electrons', 'The electrons in the outermost shell. Almost everything an atom does chemically is decided by these and nothing else.'],
    ['covalent bond', 'Two atoms sharing a pair of electrons. Neither one wins, so they stay stuck together.'],
    ['ionic bond', 'One atom hands electrons to another, and the resulting opposite charges hold on to each other.'],
    ['metallic bond', 'Metal atoms pooling their outer electrons into a shared sea, which is why metals conduct and bend instead of shattering.'],
    ['electronegativity', 'How hard an atom pulls on shared electrons. The difference between two atoms’ values decides whether their bond is covalent, polar or ionic.'],
    ['polar', 'A molecule with a positive end and a negative end, because the electrons are not shared evenly. Water is the famous case.'],
    ['hydrogen bond', 'The extra-strong attraction between a hydrogen already bonded to N, O or F and a lone pair on another such atom. Weaker than a real bond, strong enough to explain most of water’s oddities.'],
    ['intermolecular force', 'Attraction between whole molecules rather than within them. It sets melting and boiling points, not what the substance is.'],
    ['polyatomic ion', 'A group of atoms that carries a charge and travels as one unit, like sulfate. It stays together through most reactions.'],
    ['oxidation', 'Losing electrons. The old meaning was "reacting with oxygen", which turned out to be a special case.'],
    ['reduction', 'Gaining electrons. It is called reduction because the charge is reduced.'],
    ['redox', 'A reaction where electrons move from one substance to another. One thing is always oxidised and another always reduced — they cannot happen alone.'],
    ['acid', 'Something with a hydrogen it will give away. That is what "acid" means at bottom — everything else follows from it.'],
    ['base', 'Something that will take a hydrogen ion, usually because it has a lone pair waiting or an OH⁻ to offer.'],
    ['pH', 'A short way of writing the hydrogen ion concentration: −log[H⁺]. One unit means a factor of ten.'],
    ['buffer', 'A mixture of a weak acid and its conjugate base, which soaks up added acid or base and holds the pH nearly still. Your blood is one.'],
    ['catalyst', 'Something that speeds a reaction up without being used up. It gives the reaction an easier route, lowering the activation energy.'],
    ['activation energy', 'The hill a reaction has to get over before it can run downhill. It is why a mixture can be perfectly capable of reacting and still just sit there.'],
    ['enthalpy', 'The heat content of a substance. ΔH is how much heat a reaction gives out or takes in, at constant pressure.'],
    ['entropy', 'How many ways the energy and particles of a system can be arranged. More ways means higher entropy, and the universe drifts towards more ways.'],
    ['exothermic', 'Gives out heat. The products hold less energy than the reactants, and the difference leaves as warmth.'],
    ['endothermic', 'Takes in heat. It feels cold because it is stealing energy from its surroundings.'],
    ['equilibrium', 'Forward and reverse reactions running at the same rate, so nothing appears to change. Both are still happening — that is why it is called dynamic.'],
    ['stoichiometry', 'Using a balanced equation to work out how much of one substance reacts with or produces how much of another.'],
    ['limiting reactant', 'The one that runs out first, and therefore decides how much product you can possibly get.'],
    ['molarity', 'Moles of dissolved substance per litre of solution. Written M.'],
    ['solute', 'The thing being dissolved.'],
    ['solvent', 'The thing doing the dissolving. Usually there is more of it.'],
    ['saturated', 'Holding as much dissolved solute as it can at that temperature. Add more and it just sits on the bottom.'],
    ['precipitate', 'A solid that appears out of a solution when two dissolved things meet and form something insoluble.'],
    ['empirical formula', 'The simplest whole-number ratio of atoms. Glucose is C₆H₁₂O₆ but its empirical formula is CH₂O.'],
    ['isomer', 'Molecules with the same formula but different structures, and so different properties. It is why a formula alone tells you so little.'],
    ['functional group', 'A small cluster of atoms that gives a molecule its behaviour. Recognise the group and you can predict a lot.'],
    ['saturated (organic)', 'Holding as many hydrogens as possible — no double bonds, no rings. The other meaning of the same word, unfortunately.'],
    ['aromatic', 'A flat ring whose electrons are spread evenly around it rather than fixed in place. Unusually stable.'],
    ['catalyst poison', 'Something that sticks to a catalyst and stops it working. Leaded petrol wrecked catalytic converters this way.'],
    ['significant figures', 'The digits in a measurement that were actually measured. Writing more implies precision you do not have.'],
    ['dimensional analysis', 'Multiplying by fractions that equal one, arranged so the unwanted units cancel. It catches almost every arithmetic slip.'],
  ];

  const SECTIONS = [
    { key: 'ions', name: 'Polyatomic ions', render: ionTable },
    { key: 'charges', name: 'Ion charges from the table', render: chargeTable },
    { key: 'solubility', name: 'Solubility rules', render: solubility },
    { key: 'activity', name: 'Activity series', render: activity },
    { key: 'acids', name: 'Strong acids and bases', render: acidsBases },
    { key: 'constants', name: 'Constants', render: constants },
    { key: 'prefixes', name: 'SI prefixes', render: prefixes },
    { key: 'heats', name: 'Specific heats', render: heats },
    { key: 'formation', name: 'Formation enthalpies', render: formation },
    { key: 'colligative', name: 'Freezing and boiling constants', render: colligative },
    { key: 'organic-bp', name: 'Boiling points of small isomers', render: organicBP },
    { key: 'glossary', name: 'Glossary', render: glossary },
  ];

  /* Cryoscopic and ebullioscopic constants. Literature data, and the table
   * says so, like the solubility rules and the activity series. */
  function colligative() {
    const c = ME.ref.COLLIGATIVE;
    const box = el('div');
    box.appendChild(el('p', { class: 'note', text: c.why }));
    const t = el('table', { class: 'rf-table' });
    const head = el('tr');
    ['Solvent', 'Melts at', 'Boils at', 'K_f (\u00b0C/m)', 'K_b (\u00b0C/m)'].forEach((h) =>
      head.appendChild(el('th', { text: h })));
    t.appendChild(head);
    Object.keys(c.solvents).forEach((name) => {
      const s = c.solvents[name];
      const tr = el('tr');
      [name, s.mp + ' \u00b0C', s.bp + ' \u00b0C', String(s.Kf), String(s.Kb)].forEach((x, i) =>
        tr.appendChild(el('td', { class: i ? 'num' : '', text: x })));
      t.appendChild(tr);
    });
    box.appendChild(t);
    box.appendChild(el('p', { class: 'note rf-src', text: c.source + ' Literature values, not verified by the build.' }));
    return box;
  }

  /* Boiling points of the small organic molecules the isomer lessons compare.
   * Grouped into pairs, because every pair exists to make the same point. */
  function organicBP() {
    const t = ME.ref.ORGANIC_BP;
    const PAIRS = [
      ['butane', '2-methylpropane', 'C\u2084H\u2081\u2080 \u2014 straight against branched'],
      ['pentane', '2-methylbutane', 'C\u2085H\u2081\u2082 \u2014 one branch'],
      ['pentane', '2,2-dimethylpropane', 'C\u2085H\u2081\u2082 \u2014 two branches, and 27 degrees lower'],
      ['propan-1-ol', 'propan-2-ol', 'C\u2083H\u2088O \u2014 the group moved one carbon'],
      ['cis-but-2-ene', 'trans-but-2-ene', 'C\u2084H\u2088 \u2014 one bond turned round'],
      ['ethanol', 'dimethyl ether', 'C\u2082H\u2086O \u2014 a different family entirely'],
    ];
    const box = el('div');
    box.appendChild(el('p', { class: 'note', text: t.why }));
    const table = el('table', { class: 'rf-table' });
    const head = el('tr');
    ['', 'Boils at', '', 'Boils at', 'The pair'].forEach((h) => head.appendChild(el('th', { text: h })));
    table.appendChild(head);
    PAIRS.forEach(([a, b, note]) => {
      const tr = el('tr');
      [a, ME.ref.boilingPoint(a), b, ME.ref.boilingPoint(b)].forEach((x, i) =>
        tr.appendChild(el('td', { class: i % 2 ? 'num' : '', text: x })));
      tr.appendChild(el('td', { class: 'note', text: note }));
      table.appendChild(tr);
    });
    box.appendChild(table);
    box.appendChild(el('p', { class: 'note rf-src', text: t.source }));
    return box;
  }

  /* Standard enthalpies of formation, which the reaction-energy tool computes
   * every reaction from. Grouped the way the table is written. */
  function formation() {
    const T = ME.ref.FORMATION;
    const body = el('div');
    body.appendChild(el('div', { class: 'callout' }, T.why));
    body.appendChild(el('p', { class: 'note rf-groupnote' },
      'A state is part of the entry, not decoration: liquid water is \u2212285.83 and steam is \u2212241.82, '
      + 'and the 44 kJ/mol between them is exactly what boiling costs. A reaction written without state '
      + 'labels gets each substance in its standard state, and the tool says which it used.'));

    T.groups.forEach((g) => {
      body.appendChild(el('h3', { class: 'section-head', text: g.name }));
      if (g.note) body.appendChild(el('p', { class: 'note rf-groupnote', text: g.note }));
      const t = el('table', { class: 'rf-table rf-heats' });
      const head = el('tr');
      ['Substance', 'State', '\u0394H\u00b0f kJ/mol', ''].forEach((h, i) =>
        head.appendChild(el('th', { class: i === 2 ? 'rf-unit' : '', text: h })));
      t.appendChild(head);
      g.items.forEach(([formula, state, dh, name]) => {
        const tr = el('tr');
        tr.appendChild(el('td', { html: ME.chemHTML(formula) }));
        tr.appendChild(el('td', { class: 'note', text: ME.balance.STATES[state] || state }));
        tr.appendChild(el('td', { class: 'mono num',
          text: (dh > 0 ? '+' : '') + ME.fmt.fmtSigned(dh, 6) }));
        tr.appendChild(el('td', { class: 'note', text: name || '' }));
        t.appendChild(tr);
      });
      body.appendChild(t);
    });

    body.appendChild(el('p', { class: 'note rf-src', text: T.source }));
    const go = el('button', { class: 'btn btn-sm', style: { marginTop: '10px' }, text: 'Open the reaction-energy tool' });
    go.addEventListener('click', () => ME.router.go('#/tools/reaction-energy'));
    body.appendChild(go);
    return card('Formation enthalpies', T.source, body);
  }

  const St = { built: false, host: null, panel: null };

  function build(host) {
    St.host = host;
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Reference' }));
    wrap.appendChild(el('p', { class: 'note rf-intro' },
      'The tables you end up needing over and over. Each one says where it came from, because that differs: the ion table is checked against PubChem every time the app is built, while the solubility rules and the activity series are textbook data with no machine-readable source.'));

    const layout = el('div', { class: 'rf-layout' });
    const nav = el('nav', { class: 'rf-nav' });
    SECTIONS.forEach((s) => {
      const b = el('button', { class: 'rf-navbtn', 'data-sec': s.key, text: s.name });
      b.addEventListener('click', () => show(s.key));
      nav.appendChild(b);
    });
    layout.appendChild(nav);
    St.panel = el('div', { class: 'rf-panel' });
    layout.appendChild(St.panel);
    wrap.appendChild(layout);
    host.appendChild(wrap);
    St.built = true;
    show('ions');
  }

  /* `focus` lets a link point at one entry rather than a whole section, which
   * is what the search bar needs for a glossary word. */
  function show(key, focus) {
    const sec = SECTIONS.filter((s) => s.key === key)[0] || SECTIONS[0];
    ME.$$('.rf-navbtn', St.host).forEach((b) => b.classList.toggle('on', b.dataset.sec === sec.key));
    ME.clear(St.panel);
    St.panel.appendChild(sec.render(focus));
    ME.bindTips(St.panel);
  }

  function card(title, provenance, body) {
    const c = el('div', { class: 'card card-pad rf-card' });
    c.appendChild(el('h2', { text: title }));
    if (provenance) c.appendChild(el('p', { class: 'rf-prov', text: provenance }));
    if (body) c.appendChild(body);
    return c;
  }

  function ionTable() {
    const byCharge = {};
    ME.ref.ions.forEach((i) => { (byCharge[i.c] = byCharge[i.c] || []).push(i); });
    const body = el('div');
    body.appendChild(el('p', { class: 'note',
      text: 'Grouped by charge, because that is what you need when you are balancing a formula. The pattern in the endings is worth more than memorising the list: -ate is the common one, -ite has one oxygen fewer, hypo- one fewer again, and per- one more.' }));
    Object.keys(byCharge).sort((a, b) => Number(b) - Number(a)).forEach((c) => {
      const n = Number(c);
      body.appendChild(el('h3', { class: 'section-head',
        text: n > 0 ? 'Charge ' + n + '+' : 'Charge ' + Math.abs(n) + '−' }));
      const t = el('table', { class: 'rf-table' });
      const head = el('tr');
      ['Name', 'Formula', 'Where you meet it'].forEach((h) => head.appendChild(el('th', { text: h })));
      t.appendChild(head);
      byCharge[c].forEach((i) => {
        const tr = el('tr');
        tr.appendChild(el('td', {}, [el('strong', { text: i.n })]));
        const f = el('td', { class: 'mono' });
        f.appendChild(el('span', { html: ME.formulaHTML(i.f) }));
        f.appendChild(el('sup', { text: (Math.abs(n) === 1 ? '' : Math.abs(n)) + (n < 0 ? '−' : '+') }));
        tr.appendChild(f);
        tr.appendChild(el('td', { class: 'note', text: i.note || '' }));
        t.appendChild(tr);
      });
      body.appendChild(t);
    });
    return card('Polyatomic ions',
      'All ' + ME.ref.ions.length + ' of these are resolved against PubChem when the app is built, with both the formula and the charge cross-checked. If PubChem disagrees, the build fails rather than shipping a wrong ion.',
      body);
  }

  function chargeTable() {
    const body = el('div');
    body.appendChild(el('p', { class: 'note',
      text: 'These are not memorised, they are read off the periodic table. An element in group 1 has one electron in its outer shell and loses it; an element in group 17 is one short and takes one. Click any element to see the reasoning.' }));
    const grid = el('div', { class: 'rf-charge-grid' });
    ME.chem.elements.forEach((e) => {
      const t = ME.ref.typicalCharge(e.sym);
      if (!t) return;
      const b = el('button', { class: 'rf-charge' + (t.variable ? ' varies' : t.charge === 0 ? ' none' : t.charge > 0 ? ' pos' : ' neg') });
      b.appendChild(el('span', { class: 'sym', text: e.sym }));
      b.appendChild(el('span', { class: 'q', text: t.variable ? 'varies' : t.charge === 0 ? '—' :
        (Math.abs(t.charge) === 1 ? '' : Math.abs(t.charge)) + (t.charge > 0 ? '+' : '−') }));
      b.dataset.tip = e.name + ': ' + t.why;
      b.addEventListener('click', () => ME.router.go('#/elements/' + e.sym));
      grid.appendChild(b);
    });
    body.appendChild(grid);
    body.appendChild(el('p', { class: 'note', style: { marginTop: '12px' },
      text: 'The ones marked "varies" are mostly transition metals, and that is exactly why their names carry Roman numerals — the numeral is there to say which charge this time. Carbon and silicon vary for a different reason: gaining four electrons or losing four are both too hard, so they share instead.' }));
    return card('What charge an element takes', 'Derived from each element’s group in the PubChem periodic table, not stored as a separate list, so it cannot disagree with the table.', body);
  }

  function solubility() {
    const body = el('div');
    body.appendChild(el('p', { class: 'note',
      text: 'What dissolves in water and what does not. This is what lets you predict whether mixing two solutions produces a solid — which is the whole of double replacement.' }));
    ME.ref.SOLUBILITY.rules.forEach((r) => {
      const box = el('div', { class: 'rf-rule ' + (r.soluble ? 'yes' : 'no') });
      box.appendChild(el('div', { class: 'rf-rule-head', text: r.text }));
      box.appendChild(el('div', { class: 'note', text: r.why }));
      if (r.exceptions.length) {
        box.appendChild(el('div', { class: 'rf-exc' }, [
          el('span', { class: 'note', text: 'Exceptions: ' }),
          el('span', { class: 'mono', html: r.exceptions.map((x) => ME.formulaHTML(x)).join(', ') }),
        ]));
      }
      body.appendChild(box);
    });
    return card('Solubility rules', ME.ref.SOLUBILITY.source, body);
  }

  function activity() {
    const body = el('div');
    body.appendChild(el('p', { class: 'note', text: ME.ref.ACTIVITY.note }));
    const strip = el('div', { class: 'rf-activity' });
    ME.ref.ACTIVITY.metals.forEach((sym, i) => {
      const e = ME.chem.element(sym);
      const b = el('button', { class: 'rf-act' + (sym === 'H' ? ' hydrogen' : '') });
      b.appendChild(el('span', { class: 'rank', text: String(i + 1) }));
      b.appendChild(el('span', { class: 'sym', text: sym }));
      b.appendChild(el('span', { class: 'nm', text: e ? e.name : sym }));
      if (sym !== 'H') b.addEventListener('click', () => ME.router.go('#/elements/' + sym));
      strip.appendChild(b);
      if (sym === 'H') {
        strip.appendChild(el('div', { class: 'rf-act-divider',
          text: 'Everything above here fizzes in acid. Nothing below it does.' }));
      }
    });
    body.appendChild(strip);
    body.appendChild(el('p', { class: 'note', style: { marginTop: '12px' },
      text: 'Reading it: drop a metal into a solution of a metal below it and the one you dropped in will push the other one out. Copper in silver nitrate grows silver crystals; silver in copper sulfate does nothing at all.' }));
    return card('Activity series', ME.ref.ACTIVITY.source, body);
  }

  function acidsBases() {
    const body = el('div');
    body.appendChild(el('div', { class: 'callout' }, ME.ref.STRONG_ACIDS.why));
    const two = el('div', { class: 'rf-two' });
    [['Strong acids', ME.ref.STRONG_ACIDS], ['Strong bases', ME.ref.STRONG_BASES]].forEach(([title, data]) => {
      const col = el('div');
      col.appendChild(el('h3', { class: 'section-head', text: title }));
      const list = el('div', { class: 'rf-acidlist' });
      data.list.forEach((a) => {
        const item = el('div', { class: 'rf-acid' });
        item.appendChild(el('span', { class: 'mono', html: ME.formulaHTML(a.f) }));
        item.appendChild(el('span', { text: a.n }));
        if (a.note) item.appendChild(el('span', { class: 'note', text: a.note }));
        list.appendChild(item);
      });
      col.appendChild(list);
      col.appendChild(el('p', { class: 'note', text: data.why }));
      two.appendChild(col);
    });
    body.appendChild(two);
    body.appendChild(el('p', { class: 'note', style: { marginTop: '12px' },
      text: 'Anything not on these lists is weak, which does not mean harmless — hydrofluoric acid is weak and will dissolve glass and bone. Weak means it holds on to most of its hydrogens most of the time.' }));
    return card('Strong acids and bases', ME.ref.STRONG_ACIDS.source, body);
  }

  function constants() {
    const C = ME.fmt.CONST;
    const rows = [
      ["Avogadro's number", 'Nᴀ', ME.fmt.sciText(C.NA, 9) + ' mol⁻¹', 'Exact by definition since 2019. It is not measured any more — the mole is defined as this many things.'],
      ['Boltzmann constant', 'kᴮ', C.kB + ' J/K', 'Also exact by definition. Energy per particle per kelvin.'],
      ['Gas constant', 'R', ME.fmt.fmt(C.R, 9) + ' J/(mol·K)', 'Not an independent measurement: R = Nᴀ × kᴮ. Energy per mole per kelvin instead of per particle.'],
      ['Gas constant', 'R', ME.fmt.fmt(ME.fmt.gasConstant('atm', 'L', 'mol'), 7) + ' L·atm/(mol·K)', 'The same number in the units a school lab uses.'],
      ['Gas constant', 'R', ME.fmt.fmt(ME.fmt.gasConstant('kPa', 'L', 'mol'), 7) + ' L·kPa/(mol·K)', 'And again. There is one R; these are all it wearing different clothes.'],
      ['Molar volume at STP', 'Vₘ', ME.fmt.fmt(C.molarVolumeSTP, 6) + ' L/mol', 'One mole of any ideal gas at 0 °C and 1 atm. Calculated from R, not looked up.'],
      ['Standard atmosphere', 'atm', C.atmInPa + ' Pa', 'Exact by definition.'],
      ['Ice point', '0 °C', C.zeroC + ' K', 'Exact by definition — the celsius scale is defined from kelvin.'],
      ['Ion product of water', 'Kᴡ', ME.fmt.sciText(C.Kw, 3), 'At 25 °C. This one really is measured, and it changes with temperature.'],
    ];
    const t = el('table', { class: 'rf-table' });
    const head = el('tr');
    ['Constant', 'Symbol', 'Value', 'Note'].forEach((h) => head.appendChild(el('th', { text: h })));
    t.appendChild(head);
    rows.forEach((r) => {
      const tr = el('tr');
      tr.appendChild(el('td', {}, [el('strong', { text: r[0] })]));
      tr.appendChild(el('td', { class: 'mono', text: r[1] }));
      tr.appendChild(el('td', { class: 'mono', text: r[2] }));
      tr.appendChild(el('td', { class: 'note', text: r[3] }));
      t.appendChild(tr);
    });
    return card('Constants',
      'The SI definitions fix Avogadro’s number, the Boltzmann constant, the atmosphere and the ice point exactly, so R and the molar volume are computed from them here rather than copied from a book.',
      t);
  }

  function prefixes() {
    const t = el('table', { class: 'rf-table' });
    const head = el('tr');
    ['Prefix', 'Symbol', 'Multiplier', 'Example'].forEach((h) => head.appendChild(el('th', { text: h })));
    t.appendChild(head);
    /* Negative keys need quoting in an object literal. */
    const EG = { '3': '1 kg = 1000 g', '-2': '1 cm = 0.01 m', '-3': '1 mL = 0.001 L',
      '-9': 'a chemical bond is about 0.15 nm long', '6': '1 MJ = 10⁶ J',
      '-6': '1 µmol = 10⁻⁶ mol', '-12': 'a picosecond is how long a bond takes to vibrate once' };
    ME.ref.PREFIXES.forEach(([name, sym, exp]) => {
      const tr = el('tr');
      tr.appendChild(el('td', {}, [el('strong', { text: name })]));
      tr.appendChild(el('td', { class: 'mono', text: sym || '—' }));
      tr.appendChild(el('td', { class: 'mono', html: exp === 0 ? '1' : '10<sup>' + exp + '</sup>' }));
      tr.appendChild(el('td', { class: 'note', text: EG[exp] || '' }));
      t.appendChild(tr);
    });
    const body = el('div');
    body.appendChild(el('p', { class: 'note',
      text: 'These are definitions, not measurements, and they are the same in every unit: a kilogram, a kilojoule and a kilometre all mean a thousand of the thing.' }));
    body.appendChild(t);
    return card('SI prefixes', 'Definitions.', body);
  }

  function heats() {
    const T = ME.ref.SPECIFIC_HEAT;
    const body = el('div');
    body.appendChild(el('div', { class: 'callout' }, T.why));

    /* Two views of the same 96 numbers. Grouped is for looking something up;
     * ranked is for seeing the range, which is the thing worth noticing. */
    const buttons = el('div', { class: 'rf-toggle' });
    const panel = el('div');
    let mode = 'grouped';
    [['grouped', 'By kind'], ['ranked', 'Highest to lowest']].forEach(([key, label]) => {
      const btn = el('button', { class: 'btn btn-sm' + (key === mode ? ' on' : ''), text: label });
      btn.addEventListener('click', () => {
        mode = key;
        ME.$$('.btn', buttons).forEach((b) => b.classList.toggle('on', b.textContent === label));
        draw();
      });
      buttons.appendChild(btn);
    });
    body.appendChild(buttons);
    body.appendChild(panel);

    const row = (name, value, note) => {
      const tr = el('tr');
      tr.appendChild(el('td', { text: name }));
      /* Printed exactly as stored, rather than rounded to a fixed number of
       * decimals: water is known to 4.184 and stainless steel to 0.50, and
       * forcing both to the same width would misrepresent one of them. */
      tr.appendChild(el('td', { class: 'mono num', text: String(value) }));
      tr.appendChild(el('td', { class: 'note', text: note || '' }));
      return tr;
    };
    const table = () => {
      const t = el('table', { class: 'rf-table rf-heats' });
      const head = el('tr');
      ['Substance', 'J/(g\u00b7K)', ''].forEach((h, i) =>
        /* The unit must not be upper-cased by the table style: "J/(G\u00b7K)"
         * reads as gigakelvin. */
        head.appendChild(el('th', { class: i === 1 ? 'rf-unit' : '', text: h })));
      t.appendChild(head);
      return t;
    };

    function draw() {
      ME.clear(panel);
      if (mode === 'grouped') {
        T.groups.forEach((g) => {
          panel.appendChild(el('h3', { class: 'section-head', text: g.name }));
          if (g.note) panel.appendChild(el('p', { class: 'note rf-groupnote', text: g.note }));
          const t = table();
          g.items.forEach((it) => t.appendChild(row(it[0], it[1], it[2])));
          panel.appendChild(t);
        });
      } else {
        const t = table();
        Object.keys(T.values)
          .sort((a, b) => T.values[b] - T.values[a])
          .forEach((k) => t.appendChild(row(k, T.values[k], T.note(k))));
        panel.appendChild(t);
      }
    }
    draw();

    body.appendChild(el('h3', { class: 'section-head', text: 'And for water changing state' }));
    body.appendChild(el('p', { class: 'note' }, [
      'Melting takes ', el('strong', { text: ME.ref.LATENT.fusion + ' J/g' }),
      ' and boiling takes ', el('strong', { text: ME.ref.LATENT.vaporisation + ' J/g' }),
      '. ' + ME.ref.LATENT.why,
    ]));
    return card('Specific heats', T.source, body);
  }

  function glossary(focus) {
    const body = el('div');
    const search = el('input', { class: 'rf-search', type: 'search', placeholder: 'Find a word…',
      'aria-label': 'Search the glossary', autocomplete: 'off', value: focus || '' });
    body.appendChild(search);
    const list = el('div', { class: 'rf-gloss' });
    body.appendChild(list);

    function draw(q, highlight) {
      ME.clear(list);
      const n = String(q || '').toLowerCase().trim();
      const hits = GLOSSARY.filter(([w, d]) => !n || w.toLowerCase().indexOf(n) >= 0 || d.toLowerCase().indexOf(n) >= 0);
      if (!hits.length) {
        list.appendChild(el('p', { class: 'note', text: 'Nothing matches that. The search looks at the definitions too, so try a plainer word.' }));
        return;
      }
      hits.forEach(([word, def]) => {
        const item = el('div', { class: 'rf-gloss-item' }, [
          el('dt', { text: word }), el('dd', { text: def }),
        ]);
        /* Arriving from the search bar, the word asked for is marked so it is
         * findable even when the filter left several entries showing. */
        if (highlight && word.toLowerCase() === String(highlight).toLowerCase()) {
          item.classList.add('on');
        }
        list.appendChild(item);
      });
    }
    search.addEventListener('input', ME.debounce(() => draw(search.value), 120));
    draw(focus || '', focus);
    return card('Glossary', 'Definitions written the way the lessons write them: what it is, and why it matters.', body);
  }

  function ensureBuilt(host) { if (!St.built) build(host); }

  /* So the search bar and the lessons can look a word up. */
  function define(word) {
    const n = String(word || '').toLowerCase().trim();
    const hit = GLOSSARY.filter(([w]) => w.toLowerCase() === n)[0];
    return hit ? hit[1] : null;
  }

  ME.reference = { ensureBuilt, show, define, GLOSSARY, SECTIONS };
})();
