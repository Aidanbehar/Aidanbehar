/* The Tools tab: calculators that show their working.
 *
 * Every one of these is a thin face over the engine. None of them does any
 * chemistry of its own, which is the point — the number a tool shows is the
 * same number a lesson would show and the same number a question would be
 * graded against.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  /* A field spec: key, label, placeholder, and what kind of thing it takes. */
  const TOOLS = [
    {
      key: 'molar-mass', name: 'Molar mass', blurb: 'Type any formula and see what a mole of it weighs, atom by atom.',
      fields: [{ k: 'f', label: 'Formula', placeholder: 'CuSO4·5H2O', wide: true }],
      run(v) {
        const r = ME.formula.molarMass(v.f);
        if (!r.ok) return { error: r.error, fixes: r.fixes };
        const rows = r.rows.map((x) => [
          x.sym + ' ' + x.name.toLowerCase(),
          String(x.count) + ' × ' + ME.fmt.fmt(x.mass, 6),
          ME.fmt.fmt(x.total, 6) + ' g/mol',
        ]);
        return {
          headline: ME.fmt.fmt(r.mass, 6) + ' g/mol',
          sub: r.formula.display + ', ' + r.formula.atoms + ' atoms',
          table: { head: ['Element', 'Count × mass', 'Contribution'], rows: rows },
          steps: [
            { text: 'A molar mass is nothing more than the atoms added up. Every atomic mass here comes from the periodic table in this app, which is checked against PubChem when the app is built.' },
            { text: 'Add the contributions: ' + r.rows.map((x) => ME.fmt.fmt(x.total, 5)).join(' + ') + ' = ' + ME.fmt.fmt(r.mass, 6) + ' g/mol.' },
            { text: 'The unit is grams per mole, and that per-mole is doing real work: it means this number is simultaneously "what one molecule weighs in atomic mass units" and "what 6.022 × 10²³ of them weigh in grams". That coincidence is exactly why the mole was defined the way it was.' },
          ],
        };
      },
    },
    {
      key: 'percent-composition', name: 'Percent composition', blurb: 'What fraction of a compound’s mass is each element.',
      fields: [{ k: 'f', label: 'Formula', placeholder: 'C6H12O6', wide: true }],
      run(v) {
        const r = ME.formula.percentComposition(v.f);
        if (!r.ok) return { error: r.error, fixes: r.fixes };
        return {
          headline: r.rows.map((x) => x.sym + ' ' + ME.fmt.fmt(x.percent, 4) + '%').join('  ·  '),
          sub: 'total molar mass ' + ME.fmt.fmt(r.mass, 6) + ' g/mol',
          table: {
            head: ['Element', 'Mass in one mole', 'Percent'],
            rows: r.rows.map((x) => [x.sym + ' ' + x.name.toLowerCase(),
              ME.fmt.fmt(x.total, 5) + ' g', ME.fmt.fmt(x.percent, 4) + '%']),
          },
          steps: [
            { text: 'Work out what one mole of the whole compound weighs, then ask what share of that each element is responsible for.' },
            { text: 'Each row is that element’s contribution divided by the total, times 100. They have to add to 100% — if yours do not, something is missing.' },
          ],
        };
      },
    },
    {
      key: 'grams-moles', name: 'Grams ⇄ moles ⇄ particles', blurb: 'The bridge between what you can weigh and what you can count.',
      fields: [
        { k: 'f', label: 'Formula', placeholder: 'NaCl' },
        { k: 'amount', label: 'Amount', placeholder: '25' },
        { k: 'kind', label: 'which is', type: 'select', options: [['g', 'grams'], ['mol', 'moles']] },
      ],
      run(v) {
        const amount = num(v.amount);
        if (amount === null) return { error: 'Type an amount.' };
        const r = v.kind === 'mol' ? ME.stoich.molesToGrams(amount, v.f) : ME.stoich.gramsToMoles(amount, v.f);
        if (!r.ok) return { error: r.error, fixes: r.fixes };
        const moles = v.kind === 'mol' ? amount : r.moles;
        const particles = ME.stoich.molesToParticles(moles);
        return {
          headline: v.kind === 'mol' ? ME.fmt.fmt(r.grams, 5) + ' g' : ME.fmt.fmt(r.moles, 5) + ' mol',
          sub: ME.fmt.sciText(particles.particles, 4) + ' particles · molar mass ' + ME.fmt.fmt(r.molarMass, 6) + ' g/mol',
          steps: r.steps.concat(particles.steps),
        };
      },
    },
    {
      key: 'stoichiometry', name: 'Stoichiometry', blurb: 'From a mass of one substance to a mass of another, through a balanced equation.',
      fields: [
        { k: 'eq', label: 'Equation', placeholder: 'CH4 + O2 -> CO2 + H2O', wide: true },
        { k: 'from', label: 'I have', placeholder: 'CH4' },
        { k: 'grams', label: 'grams of it', placeholder: '16' },
        { k: 'to', label: 'How much', placeholder: 'CO2' },
      ],
      run(v) {
        const g = num(v.grams);
        if (g === null) return { error: 'Type a mass in grams.' };
        const r = ME.stoich.massToMass(v.eq, v.from, g, v.to);
        if (!r.ok) return { error: r.error };
        return {
          headline: ME.fmt.fmt(r.grams, 5) + ' g of ' + r.to.species.formula.display,
          sub: r.equation.text,
          roadmap: r.roadmap,
          steps: r.steps,
        };
      },
    },
    {
      key: 'limiting', name: 'Limiting reactant', blurb: 'Which one runs out first, what you get, and what is left over.',
      fields: [
        { k: 'eq', label: 'Equation', placeholder: 'N2 + H2 -> NH3', wide: true },
        { k: 'a', label: 'Reactant', placeholder: 'N2' },
        { k: 'ag', label: 'grams', placeholder: '28' },
        { k: 'b', label: 'Reactant', placeholder: 'H2' },
        { k: 'bg', label: 'grams', placeholder: '10' },
      ],
      run(v) {
        const ag = num(v.ag), bg = num(v.bg);
        if (ag === null || bg === null) return { error: 'Both masses, please.' };
        const r = ME.stoich.limiting(v.eq, [{ name: v.a, grams: ag }, { name: v.b, grams: bg }]);
        if (!r.ok) return { error: r.error };
        return {
          headline: r.limiting.name + ' runs out first',
          sub: r.equation.text,
          table: {
            head: ['Product', 'Moles', 'Mass'],
            rows: r.products.map((p) => [p.name, ME.fmt.fmt(p.moles, 4), ME.fmt.fmt(p.grams, 5) + ' g']).concat(
              r.leftovers.map((l) => [l.name + ' left over', ME.fmt.fmt(l.moles, 4), ME.fmt.fmt(l.grams, 5) + ' g'])),
          },
          steps: r.steps,
        };
      },
    },
    {
      key: 'percent-yield', name: 'Percent yield', blurb: 'What you got against what the equation promised.',
      fields: [
        { k: 'actual', label: 'Actually got (g)', placeholder: '12.4' },
        { k: 'theoretical', label: 'Theoretical (g)', placeholder: '15.0' },
      ],
      run(v) {
        const a = num(v.actual), t = num(v.theoretical);
        if (a === null || t === null || !t) return { error: 'Two masses, and the theoretical one cannot be zero.' };
        const r = ME.stoich.percentYield(a, t);
        return { headline: ME.fmt.fmt(r.percent, 4) + '%', steps: r.steps };
      },
    },
    {
      key: 'empirical', name: 'Empirical formula', blurb: 'From percentages or masses to the simplest whole-number ratio.',
      fields: [{ k: 'data', label: 'Element and amount, one per line', type: 'area', wide: true,
        placeholder: 'C 40.0\nH 6.7\nO 53.3' }],
      run(v) {
        const entries = String(v.data || '').split(/\n+/).map((line) => {
          const m = line.trim().match(/^([A-Za-z]{1,2})\s*[:\s,]\s*([\d.]+)/);
          return m ? { sym: m[1][0].toUpperCase() + (m[1][1] || '').toLowerCase(), value: parseFloat(m[2]) } : null;
        }).filter(Boolean);
        if (entries.length < 2) return { error: 'Give me at least two lines, like "C 40.0".' };
        const r = ME.stoich.empiricalFormula(entries);
        if (!r.ok) return { error: r.error, steps: r.steps };
        return { headline: r.formula, sub: 'simplest whole-number ratio', steps: r.steps };
      },
    },
    {
      key: 'gas-laws', name: 'Gas laws', blurb: 'PV = nRT in any units, with every conversion shown.',
      fields: [
        { k: 'P', label: 'Pressure', placeholder: '1', unit: 'pressure', unitDefault: 'atm' },
        { k: 'V', label: 'Volume', placeholder: '22.4', unit: 'volume', unitDefault: 'L' },
        { k: 'n', label: 'Moles', placeholder: '1', unit: 'amount', unitDefault: 'mol' },
        { k: 'T', label: 'Temperature', placeholder: '273.15', unit: 'temperature', unitDefault: 'K' },
        { k: 'solve', label: 'Leave one blank, or solve for', type: 'select',
          options: [['auto', 'the blank one'], ['P', 'P'], ['V', 'V'], ['n', 'n'], ['T', 'T']] },
      ],
      run(v) {
        const units = { P: v.P_unit || 'atm', V: v.V_unit || 'L', n: v.n_unit || 'mol', T: v.T_unit || 'K' };
        const vals = {};
        ['P', 'V', 'n', 'T'].forEach((k) => { vals[k] = num(v[k]); });
        let solveFor = v.solve && v.solve !== 'auto' ? v.solve : null;
        if (!solveFor) {
          const blanks = ['P', 'V', 'n', 'T'].filter((k) => vals[k] === null);
          if (blanks.length !== 1) return { error: 'Leave exactly one of the four blank, or pick which to solve for.' };
          solveFor = blanks[0];
        }
        const missing = ['P', 'V', 'n', 'T'].filter((k) => k !== solveFor && vals[k] === null);
        if (missing.length) return { error: 'I still need ' + missing.join(', ') + '.' };
        if (vals.T !== null && solveFor !== 'T') {
          const K = ME.fmt.convert(vals.T, units.T, 'K');
          if (K <= 0) return { error: 'Nothing can be at or below 0 K. Temperature measures how much the particles move, and at 0 K they have stopped — there is no less than stopped.' };
        }
        const r = ME.gas.solve(Object.assign({}, vals, { units: units }), solveFor);
        if (!r.ok) return { error: r.error };
        return {
          headline: solveFor + ' = ' + ME.fmt.fmt(r.value, 5) + ' ' + ME.fmt.unitLabel(r.unit),
          sub: 'using R = ' + ME.fmt.fmt(r.R, 6) + ' ' + r.RUnit,
          steps: [
            { text: 'PV = nRT. Rearranged for ' + solveFor + ', that is ' + rearranged(solveFor) + '.' },
          ].concat(r.steps.map((s) => ({
            text: ME.fmt.fmt(s.from, 5) + ' ' + ME.fmt.unitLabel(s.fromUnit) + ' becomes ' +
              ME.fmt.fmt(s.to, 5) + ' ' + ME.fmt.unitLabel(s.toUnit) + '.' + (s.why ? ' ' + s.why : ''),
          }))).concat([
            { text: 'R is not a number to look up — it is 8.314462 J/(mol·K) expressed in whatever units you are working in. Here it comes out as ' + ME.fmt.fmt(r.R, 6) + ' ' + r.RUnit + '.' },
            { text: 'Answer: ' + solveFor + ' = ' + ME.fmt.fmt(r.value, 5) + ' ' + ME.fmt.unitLabel(r.unit) + '.' },
          ]),
          link: { view: '#/gas', label: 'See it in the Gas Simulator' },
        };
      },
    },
    {
      key: 'concentration', name: 'Concentration', blurb: 'Molarity from moles or grams, mass percent, ppm and molality.',
      fields: [
        { k: 'mode', label: 'Work out', type: 'select', options: [
          ['M-mol', 'molarity from moles'], ['M-g', 'molarity from grams'],
          ['pct', 'mass percent'], ['ppm', 'parts per million'], ['molal', 'molality'],
        ] },
        { k: 'a', label: 'Amount', placeholder: '0.5' },
        { k: 'f', label: 'Formula (for grams)', placeholder: 'NaCl' },
        { k: 'b', label: 'Volume (L) or mass (g/kg)', placeholder: '2' },
      ],
      run(v) {
        const a = num(v.a), b = num(v.b);
        if (a === null || b === null || !b) return { error: 'Two numbers, and the second cannot be zero.' };
        let r;
        if (v.mode === 'M-mol') r = ME.solution.molarity(a, b);
        else if (v.mode === 'M-g') r = ME.solution.molarityFromGrams(a, v.f, b);
        else if (v.mode === 'pct') r = ME.solution.massPercent(a, b);
        else if (v.mode === 'ppm') r = ME.solution.ppm(a, b);
        else r = ME.solution.molality(a, b);
        if (!r.ok) return { error: r.error };
        const unit = v.mode === 'pct' ? '%' : v.mode === 'ppm' ? ' ppm' : v.mode === 'molal' ? ' mol/kg' : ' M';
        return { headline: ME.fmt.fmt(r.value, 5) + unit, steps: r.steps };
      },
    },
    {
      key: 'dilution', name: 'Dilution', blurb: 'M₁V₁ = M₂V₂. Leave one box empty.',
      fields: [
        { k: 'M1', label: 'M₁', placeholder: '6' }, { k: 'V1', label: 'V₁', placeholder: '' },
        { k: 'M2', label: 'M₂', placeholder: '1.5' }, { k: 'V2', label: 'V₂', placeholder: '250' },
      ],
      run(v) {
        const g = (k) => (String(v[k] || '').trim() === '' ? null : num(v[k]));
        const r = ME.solution.dilute(g('M1'), g('V1'), g('M2'), g('V2'));
        if (!r.ok) return { error: r.error };
        return { headline: r.solvedFor + ' = ' + ME.fmt.fmt(r.value, 5), steps: r.steps };
      },
    },
    {
      key: 'ph', name: 'pH and pOH', blurb: 'Between pH, pOH, [H⁺] and [OH⁻].',
      fields: [
        { k: 'mode', label: 'I know', type: 'select', options: [['pH', 'the pH'], ['H', '[H⁺] in mol/L']] },
        { k: 'value', label: 'Value', placeholder: '3.5' },
      ],
      run(v) {
        const x = num(v.value);
        if (x === null) return { error: 'Type a value.' };
        const r = v.mode === 'pH' ? ME.solution.HfrompH(x) : ME.solution.pHfromH(x);
        if (!r.ok) return { error: r.error };
        const pH = v.mode === 'pH' ? x : r.pH;
        return {
          headline: 'pH ' + ME.fmt.fmt(pH, 3) + (pH < 7 ? '  ·  acidic' : pH > 7 ? '  ·  basic' : '  ·  neutral'),
          sub: '[H⁺] = ' + ME.fmt.sciText(v.mode === 'pH' ? r.H : x, 4) + ' mol/L, [OH⁻] = ' +
            ME.fmt.sciText(r.OH, 4) + ' mol/L, pOH = ' + ME.fmt.fmt(r.pOH, 3),
          steps: r.steps,
        };
      },
    },
    {
      key: 'heat', name: 'Heat: q = mcΔT', blurb: 'Energy in or out of something whose temperature changed.',
      fields: [
        { k: 'm', label: 'Mass (g)', placeholder: '250' },
        { k: 'sub', label: 'Substance', type: 'select', options: [] },
        { k: 'c', label: 'or specific heat J/(g·K)', placeholder: '4.184' },
        { k: 'dT', label: 'ΔT (K or °C)', placeholder: '30' },
      ],
      run(v) {
        const m = num(v.m), dT = num(v.dT);
        let c = num(v.c);
        if (v.sub && v.sub !== 'custom') c = ME.ref.SPECIFIC_HEAT.values[v.sub];
        if (m === null || dT === null || c === null) return { error: 'Mass, specific heat and temperature change, please.' };
        const r = ME.solution.heat(m, c, dT);
        return {
          headline: ME.fmt.fmt(r.q, 5) + ' J  (' + ME.fmt.fmt(r.q / 1000, 4) + ' kJ)',
          sub: (v.sub && v.sub !== 'custom' ? v.sub + ', ' : '') + 'c = ' + ME.fmt.fmt(c, 4) + ' J/(g·K)',
          steps: r.steps,
          source: ME.ref.SPECIFIC_HEAT.source,
        };
      },
    },
    {
      key: 'gibbs', name: 'Gibbs free energy', blurb: 'ΔG = ΔH − TΔS, and whether a reaction goes by itself.',
      fields: [
        { k: 'H', label: 'ΔH (kJ/mol)', placeholder: '-92' },
        { k: 'S', label: 'ΔS (J/mol·K)', placeholder: '-198' },
        { k: 'T', label: 'T (K)', placeholder: '298' },
      ],
      run(v) {
        const H = num(v.H), S = num(v.S), T = num(v.T);
        if (H === null || S === null || T === null) return { error: 'All three, please.' };
        if (T <= 0) return { error: 'Temperature in kelvin, and it cannot be zero or less.' };
        const r = ME.solution.gibbs(H, S, T);
        return {
          headline: 'ΔG = ' + ME.fmt.fmt(r.deltaG, 4) + ' kJ/mol',
          sub: r.spontaneous ? 'negative, so it goes on its own' : 'positive, so it needs pushing',
          steps: r.steps,
        };
      },
    },
    {
      key: 'name-formula', name: 'Name ⇄ formula', blurb: 'Inorganic compounds, both directions, with the rules spelled out.',
      fields: [{ k: 'q', label: 'A formula or a name', placeholder: 'iron(III) sulfate', wide: true }],
      run(v) {
        const text = String(v.q || '').trim();
        if (!text) return { error: 'Type a formula or a name.' };
        const asFormula = ME.formula.parse(text);
        if (asFormula.ok) {
          const r = ME.naming.nameOf(text);
          if (!r.ok) return { error: r.error };
          return { headline: r.name, sub: asFormula.display + ', ' + ME.fmt.fmt(asFormula.mass, 5) + ' g/mol',
            steps: r.steps };
        }
        const r = ME.naming.formulaOf(text);
        if (!r.ok) return { error: r.error, fixes: asFormula.fixes };
        const p = ME.formula.parse(r.formula);
        return { headline: r.formula, sub: p.ok ? ME.fmt.fmt(p.mass, 5) + ' g/mol' : '',
          steps: r.steps.map((s) => ({ text: s })) };
      },
    },
    {
      key: 'reaction-type', name: 'Reaction type', blurb: 'What kind of reaction an equation is, and why.',
      fields: [{ k: 'eq', label: 'Equation', placeholder: 'AgNO3 + NaCl -> AgCl + NaNO3', wide: true }],
      run(v) {
        const r = ME.balance.balance(v.eq);
        if (!r.ok) return { error: r.error };
        return {
          headline: r.type.label, sub: r.text,
          steps: [{ text: r.type.why }, { text: 'Balanced, it is ' + r.text + '.' }],
          link: { view: '#/balancer/' + encodeURIComponent(v.eq), label: 'Open in the Balancer' },
        };
      },
    },
    {
      key: 'units', name: 'Unit converter', blurb: 'Every unit the app knows, in both directions.',
      fields: [
        { k: 'dim', label: 'Quantity', type: 'select', options: [] },
        { k: 'value', label: 'Value', placeholder: '1' },
        { k: 'from', label: 'From', type: 'select', options: [] },
        { k: 'to', label: 'To', type: 'select', options: [] },
      ],
      run(v) {
        const x = num(v.value);
        if (x === null) return { error: 'Type a value.' };
        try {
          const out = ME.fmt.convert(x, v.from, v.to);
          return {
            headline: ME.fmt.fmt(x, 6) + ' ' + ME.fmt.unitLabel(v.from) + ' = ' + ME.fmt.fmt(out, 6) + ' ' + ME.fmt.unitLabel(v.to),
            steps: [
              { text: 'Conversion is multiplying by a fraction that equals one. ' +
                  '1 ' + ME.fmt.unitLabel(v.from) + ' is ' + ME.fmt.fmt(ME.fmt.convert(1, v.from, v.to), 6) + ' ' + ME.fmt.unitLabel(v.to) +
                  ', so that fraction is the conversion factor.' },
              { text: 'Set it up so the unit you are getting rid of appears on the bottom and cancels. If the units do not cancel, the fraction is upside down — that is the whole of dimensional analysis, and it will catch almost every arithmetic slip you make.' },
            ],
          };
        } catch (e) { return { error: e.message }; }
      },
    },
    {
      key: 'sigfigs', name: 'Significant figures', blurb: 'How many a number claims, and how to round to a given number.',
      fields: [
        { k: 'value', label: 'Number as written', placeholder: '0.004070' },
        { k: 'to', label: 'Round to (optional)', placeholder: '3' },
      ],
      run(v) {
        const text = String(v.value || '').trim();
        if (!text) return { error: 'Type a number.' };
        const n = ME.fmt.sigFigs(text);
        if (n === null) return { error: 'That does not read as a number.' };
        const q = ME.fmt.parseQuantity(text);
        const to = num(v.to);
        const steps = [
          { text: 'Significant figures are a claim about how carefully something was measured. Every digit counts except zeros that are only holding a place.' },
          { text: 'Leading zeros never count — 0.00407 and 4.07 are measured to the same care, and the zeros only say where the decimal point is.' },
          { text: text.indexOf('.') >= 0
              ? 'There is a decimal point here, so trailing zeros do count: they would not have been written unless they were measured.'
              : 'There is no decimal point, so trailing zeros are ambiguous and by convention do not count. This is exactly why scientific notation exists: 1200 could be two, three or four figures, but 1.20 × 10³ is unmistakably three.' },
        ];
        let headline = n + ' significant figure' + (n === 1 ? '' : 's');
        if (to && q) {
          const rounded = ME.fmt.roundSig(q.value, to);
          headline += '  →  ' + ME.fmt.fmt(rounded, to) + ' to ' + to;
          steps.push({ text: 'Rounded to ' + to + ': ' + ME.fmt.fmt(rounded, to) + ', or in scientific notation ' + ME.fmt.sciText(rounded, to) + '.' });
        }
        if (ME.fmt.sigFigsAmbiguous(text)) {
          steps.push({ text: 'Written like this the precision is genuinely unclear. If you mean all of those digits, write it as ' + ME.fmt.sciText(q.value, String(text).replace(/[^\d]/g, '').replace(/0+$/, '').length || 1) + ' or put a decimal point on the end.' });
        }
        return { headline: headline, sub: 'value ' + (q ? ME.fmt.sciText(q.value, 6) : ''), steps: steps };
      },
    },
  ];

  const num = (x) => {
    const q = ME.fmt.parseQuantity(x);
    return q ? q.value : null;
  };

  const rearranged = (k) => ({ P: 'P = nRT / V', V: 'V = nRT / P', n: 'n = PV / RT', T: 'T = PV / nR' }[k]);

  const St = { built: false, host: null, current: null, nodes: {} };

  function build(host) {
    St.host = host;
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Tools' }));
    wrap.appendChild(el('p', { class: 'note tl-intro' },
      'Calculators that show their working. Every one uses the same code as the lessons and the practice questions, so an answer here and an answer there can never disagree.'));

    const layout = el('div', { class: 'tl-layout' });
    const nav = el('nav', { class: 'tl-nav', 'aria-label': 'Tools' });
    TOOLS.forEach((t) => {
      const b = el('button', { class: 'tl-navbtn', 'data-tool': t.key });
      b.appendChild(el('span', { class: 'tl-navname', text: t.name }));
      b.appendChild(el('span', { class: 'note', text: t.blurb }));
      b.addEventListener('click', () => show(t.key));
      nav.appendChild(b);
    });
    layout.appendChild(nav);
    St.panel = el('div', { class: 'tl-panel' });
    layout.appendChild(St.panel);
    wrap.appendChild(layout);
    host.appendChild(wrap);
    St.built = true;
    show('molar-mass');
  }

  function show(key) {
    const tool = TOOLS.filter((t) => t.key === key)[0] || TOOLS[0];
    St.current = tool;
    ME.$$('.tl-navbtn', St.host).forEach((b) => b.classList.toggle('on', b.dataset.tool === tool.key));
    ME.clear(St.panel);

    const card = el('div', { class: 'card card-pad tl-tool' });
    card.appendChild(el('h2', { text: tool.name }));
    card.appendChild(el('p', { class: 'note', text: tool.blurb }));

    const form = el('div', { class: 'tl-form' });
    const values = {};
    const inputs = {};

    tool.fields.forEach((f) => {
      const holder = el('div', { class: 'tl-field' + (f.wide ? ' wide' : '') });
      holder.appendChild(el('label', { text: f.label }));
      let node;
      if (f.type === 'select') {
        node = el('select', { class: 'tl-select' });
        optionsFor(tool, f).forEach(([v, label]) => node.appendChild(el('option', { value: v, text: label })));
        values[f.k] = node.value;
        node.addEventListener('change', () => { values[f.k] = node.value; go(); });
      } else if (f.type === 'area') {
        node = el('textarea', { class: 'tl-area', rows: '4', placeholder: f.placeholder || '', spellcheck: 'false' });
        node.addEventListener('input', ME.debounce(() => { values[f.k] = node.value; go(); }, 200));
      } else {
        const row = el('div', { class: 'tl-inline' });
        node = el('input', { class: 'tl-input', type: 'text', placeholder: f.placeholder || '', spellcheck: 'false',
          autocomplete: 'off', autocapitalize: 'off' });
        node.addEventListener('input', ME.debounce(() => { values[f.k] = node.value; go(); }, 200));
        node.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        row.appendChild(node);
        if (f.unit) {
          const u = el('select', { class: 'tl-select tl-unit' });
          ME.fmt.unitsFor(f.unit).forEach((x) =>
            u.appendChild(el('option', { value: x, text: ME.fmt.unitLabel(x), selected: x === f.unitDefault || null })));
          values[f.k + '_unit'] = f.unitDefault;
          u.addEventListener('change', () => { values[f.k + '_unit'] = u.value; go(); });
          row.appendChild(u);
        }
        holder.appendChild(row);
        form.appendChild(holder);
        inputs[f.k] = node;
        if (f.placeholder && !f.unit) { /* prefill nothing; placeholders show the shape */ }
        return;
      }
      holder.appendChild(node);
      form.appendChild(holder);
      inputs[f.k] = node;
    });
    card.appendChild(form);

    const goBtn = el('button', { class: 'btn btn-primary', text: 'Work it out' });
    goBtn.addEventListener('click', () => go());
    card.appendChild(goBtn);

    const out = el('div', { class: 'tl-out', 'aria-live': 'polite' });
    card.appendChild(out);
    St.panel.appendChild(card);

    /* Pre-fill from the placeholders so the tool shows something working the
     * moment it opens, rather than an empty box and a question mark. */
    tool.fields.forEach((f) => {
      if (f.type === 'select' || !f.placeholder) return;
      inputs[f.k].value = f.placeholder;
      values[f.k] = f.placeholder;
    });
    go();

    function go() {
      let result;
      try { result = tool.run(values); }
      catch (e) { result = { error: 'Something in there does not make sense: ' + e.message }; }
      renderResult(out, result, tool, inputs, values, go);
    }
  }

  function optionsFor(tool, f) {
    if (f.options && f.options.length) return f.options;
    if (tool.key === 'heat' && f.k === 'sub') {
      return Object.keys(ME.ref.SPECIFIC_HEAT.values).map((k) => [k, k]).concat([['custom', 'something else — type c']]);
    }
    if (tool.key === 'units') {
      if (f.k === 'dim') return Object.keys(ME.fmt.UNITS).map((d) => [d, d]);
      return ME.fmt.unitsFor('pressure').map((u) => [u, ME.fmt.unitLabel(u)]);
    }
    return [];
  }

  function renderResult(out, r, tool, inputs, values, go) {
    ME.clear(out);
    if (!r) return;
    if (r.error) {
      const box = el('div', { class: 'callout warn' });
      box.appendChild(el('div', { text: r.error }));
      if (r.fixes && r.fixes.length) {
        const row = el('div', { class: 'tl-fixes' });
        row.appendChild(el('span', { class: 'note', text: 'Did you mean' }));
        r.fixes.forEach((fx) => {
          const b = el('button', { class: 'btn btn-sm' });
          b.appendChild(el('code', { html: ME.formulaHTML(fx) }));
          b.addEventListener('click', () => {
            const key = tool.fields.filter((f) => f.k === 'f' || f.k === 'q')[0];
            if (key && inputs[key.k]) { inputs[key.k].value = fx; values[key.k] = fx; go(); }
          });
          row.appendChild(b);
        });
        box.appendChild(row);
      }
      out.appendChild(box);
      if (r.steps) out.appendChild(stepList(r.steps));
      return;
    }

    out.appendChild(el('div', { class: 'tl-headline', text: r.headline }));
    if (r.sub) out.appendChild(el('div', { class: 'tl-sub', html: ME.chemHTML(r.sub) }));
    if (r.roadmap) out.appendChild(roadmap(r.roadmap));
    if (r.table) out.appendChild(table(r.table));
    if (r.steps) out.appendChild(stepList(r.steps));
    if (r.source) out.appendChild(el('p', { class: 'note tl-src', text: r.source }));
    if (r.link) {
      const b = el('button', { class: 'btn btn-sm', style: { marginTop: '12px' }, text: r.link.label });
      b.addEventListener('click', () => ME.router.go(r.link.view));
      out.appendChild(b);
    }
  }

  function stepList(steps) {
    const box = el('div', { class: 'tl-steps' });
    box.appendChild(el('h3', { class: 'section-head', text: 'How that works' }));
    const list = el('ol');
    steps.forEach((s) => {
      const li = el('li');
      li.appendChild(el('div', { text: typeof s === 'string' ? s : s.text }));
      if (s && s.maths) li.appendChild(el('div', { class: 'tl-maths', text: s.maths }));
      list.appendChild(li);
    });
    box.appendChild(list);
    return box;
  }

  function table(t) {
    const node = el('table', { class: 'tl-table' });
    const head = el('tr');
    t.head.forEach((h) => head.appendChild(el('th', { text: h })));
    node.appendChild(head);
    t.rows.forEach((r) => {
      const tr = el('tr');
      r.forEach((c) => tr.appendChild(el('td', { html: ME.chemHTML(String(c)) })));
      node.appendChild(tr);
    });
    return node;
  }

  /* The four-step picture that makes stoichiometry click. */
  function roadmap(steps) {
    const box = el('div', { class: 'tl-roadmap' });
    steps.forEach((s, i) => {
      if (i) box.appendChild(el('span', { class: 'tl-rm-arrow', html: '&#8594;' }));
      box.appendChild(el('div', { class: 'tl-rm-step' }, [
        el('div', { class: 'v', text: s.label }),
        el('div', { class: 'k', html: ME.chemHTML(s.sub) }),
      ]));
    });
    return box;
  }

  function ensureBuilt(host) { if (!St.built) build(host); }
  ME.tools = { ensureBuilt, show, TOOLS };
})();
