/* The mole, and stoichiometry.
 *
 * The whole subject rests on one idea: you cannot count atoms, but you can
 * weigh them, and a mole is the bridge. Everything here is that bridge in one
 * direction or another, and every calculation records its steps, because in
 * stoichiometry the steps *are* the lesson - the answer on its own teaches
 * nothing.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const NA = () => ME.fmt.CONST.NA;

  /* ------------------------------------------------- grams, moles, particles */
  function gramsToMoles(grams, formula) {
    const m = ME.formula.parse(formula);
    if (!m.ok) return m;
    const moles = grams / m.mass;
    return {
      ok: true, moles: moles, molarMass: m.mass, formula: m,
      steps: [
        { text: 'First, how much does one mole of ' + m.display + ' weigh? Add up its atoms: ' +
            ME.fmt.fmt(m.mass, 6) + ' g/mol.' },
        { text: 'A mole of it weighs ' + ME.fmt.fmt(m.mass, 5) + ' g, and you have ' + ME.fmt.fmt(grams, 4) +
            ' g. Divide: ' + ME.fmt.fmt(grams, 4) + ' g ÷ ' + ME.fmt.fmt(m.mass, 5) + ' g/mol = ' +
            ME.fmt.fmt(moles, 4) + ' mol.',
          maths: ME.fmt.fmt(grams, 4) + ' g × (1 mol / ' + ME.fmt.fmt(m.mass, 5) + ' g) = ' + ME.fmt.fmt(moles, 4) + ' mol' },
        { text: 'Notice how the grams cancel and moles are left. That is dimensional analysis doing the thinking for you — if you set the fraction up the other way, you would get g²/mol, which is not a thing, and that is how you know you had it upside down.' },
      ],
    };
  }

  function molesToGrams(moles, formula) {
    const m = ME.formula.parse(formula);
    if (!m.ok) return m;
    const grams = moles * m.mass;
    return {
      ok: true, grams: grams, molarMass: m.mass, formula: m,
      steps: [
        { text: 'One mole of ' + m.display + ' weighs ' + ME.fmt.fmt(m.mass, 6) + ' g.' },
        { text: 'So ' + ME.fmt.fmt(moles, 4) + ' mol weighs ' + ME.fmt.fmt(moles, 4) + ' × ' +
            ME.fmt.fmt(m.mass, 5) + ' = ' + ME.fmt.fmt(grams, 4) + ' g.',
          maths: ME.fmt.fmt(moles, 4) + ' mol × (' + ME.fmt.fmt(m.mass, 5) + ' g / 1 mol) = ' + ME.fmt.fmt(grams, 4) + ' g' },
      ],
    };
  }

  function molesToParticles(moles) {
    return {
      ok: true, particles: moles * NA(),
      steps: [
        { text: 'A mole is a count, like a dozen — just a much bigger one. One mole is ' +
            ME.fmt.sciText(NA(), 6) + ' of whatever you are counting.' },
        { text: ME.fmt.fmt(moles, 4) + ' mol × ' + ME.fmt.sciText(NA(), 4) + ' /mol = ' +
            ME.fmt.sciText(moles * NA(), 4) + ' particles.' },
      ],
    };
  }

  /* --------------------------------------------------- empirical formulas */
  /* From percent composition or masses, to the simplest whole-number ratio.
   * The trick everybody is taught - divide by the smallest - is really just
   * finding the ratio, so the steps say that. */
  function empiricalFormula(entries) {
    /* entries: [{ sym, value }] where value is a mass or a percentage */
    const steps = [];
    const rows = entries.map((e) => {
      const el = ME.chem.element(e.sym);
      if (!el || !el.mass) return null;
      return { sym: e.sym, value: e.value, mass: el.mass, moles: e.value / el.mass };
    });
    if (rows.some((r) => !r)) return { ok: false, error: 'One of those is not an element.' };
    if (rows.some((r) => !(r.moles > 0))) return { ok: false, error: 'Every amount has to be greater than zero.' };

    steps.push({ text: 'Percentages and grams are both masses, and masses cannot be compared directly — a gram of hydrogen is far more atoms than a gram of carbon. So turn each one into moles first, by dividing by its molar mass.' });
    rows.forEach((r) => {
      steps.push({ text: r.sym + ': ' + ME.fmt.fmt(r.value, 4) + ' ÷ ' + ME.fmt.fmt(r.mass, 5) +
        ' = ' + ME.fmt.fmt(r.moles, 4) + ' mol' });
    });

    const smallest = Math.min.apply(null, rows.map((r) => r.moles));
    rows.forEach((r) => { r.ratio = r.moles / smallest; });
    steps.push({ text: 'Now divide every one by the smallest. That does not change the ratio, it just makes the smallest number 1, which makes the rest easy to read.' });
    rows.forEach((r) => {
      steps.push({ text: r.sym + ': ' + ME.fmt.fmt(r.moles, 4) + ' ÷ ' + ME.fmt.fmt(smallest, 4) +
        ' = ' + ME.fmt.fmt(r.ratio, 4) });
    });

    /* Find the multiplier that makes all the ratios whole. */
    let best = 1, bestErr = Infinity;
    for (let k = 1; k <= 8; k++) {
      const err = rows.reduce((m, r) => Math.max(m, Math.abs(r.ratio * k - Math.round(r.ratio * k))), 0);
      if (err < bestErr - 1e-9) { bestErr = err; best = k; }
      if (err < 0.06) break;
    }
    if (best > 1) {
      steps.push({ text: 'Those are not whole numbers yet. Multiply them all by ' + best +
        ' and they become whole — a ratio of 1 to 1.5 is the same as 2 to 3, and formulas are written in whole atoms.' });
    }
    const counts = {};
    rows.forEach((r) => { counts[r.sym] = Math.round(r.ratio * best); });
    const text = ME.formula.formulaText(counts);
    if (bestErr > 0.12) {
      return { ok: false, error: 'Those numbers do not settle on a whole-number ratio. Check the values — percentages should add to about 100.', steps: steps };
    }
    steps.push({ text: 'So the empirical formula is ' + text + '.' });
    return { ok: true, formula: text, counts: counts, rows: rows, multiplier: best, steps: steps };
  }

  function molecularFormula(empirical, molarMass) {
    const e = ME.formula.parse(empirical);
    if (!e.ok) return e;
    const n = molarMass / e.mass;
    const rounded = Math.round(n);
    const counts = {};
    Object.keys(e.counts).forEach((k) => { counts[k] = e.counts[k] * rounded; });
    return {
      ok: true, n: rounded, formula: ME.formula.formulaText(counts), counts: counts,
      steps: [
        { text: 'The empirical formula gives the ratio, not the size. ' + e.display + ' weighs ' +
            ME.fmt.fmt(e.mass, 5) + ' g/mol.' },
        { text: 'The real molecule weighs ' + ME.fmt.fmt(molarMass, 5) + ' g/mol, which is ' +
            ME.fmt.fmt(molarMass, 5) + ' ÷ ' + ME.fmt.fmt(e.mass, 5) + ' = ' + ME.fmt.fmt(n, 4) +
            ' times as heavy — so about ' + rounded + '.' },
        { text: 'Multiply every subscript by ' + rounded + ': the molecular formula is ' +
            ME.formula.formulaText(counts) + '.' },
      ],
    };
  }

  /* -------------------------------------------------------- stoichiometry */
  /* Mass of one substance to mass of another, through the balanced equation.
   * Four steps, always the same four, which is why the road map picture is
   * worth drawing: grams -> moles -> moles -> grams. */
  function massToMass(equationText, fromName, fromGrams, toName) {
    const bal = ME.balance.balance(equationText);
    if (!bal.ok) return { ok: false, error: bal.error };
    const all = bal.left.concat(bal.right);
    const find = (name) => {
      const want = ME.formula.parse(name);
      if (!want.ok) return null;
      return all.filter((x) => x.species.formula.text === want.text)[0] || null;
    };
    const from = find(fromName), to = find(toName);
    if (!from) return { ok: false, error: 'I cannot find ' + fromName + ' in that equation.' };
    if (!to) return { ok: false, error: 'I cannot find ' + toName + ' in that equation.' };

    const Mfrom = from.species.formula.mass, Mto = to.species.formula.mass;
    const molesFrom = fromGrams / Mfrom;
    const molesTo = molesFrom * (to.coefficient / from.coefficient);
    const gramsTo = molesTo * Mto;

    return {
      ok: true, equation: bal, from: from, to: to,
      molesFrom: molesFrom, molesTo: molesTo, grams: gramsTo,
      roadmap: [
        { label: ME.fmt.fmt(fromGrams, 4) + ' g', sub: from.species.formula.display },
        { label: ME.fmt.fmt(molesFrom, 4) + ' mol', sub: from.species.formula.display },
        { label: ME.fmt.fmt(molesTo, 4) + ' mol', sub: to.species.formula.display },
        { label: ME.fmt.fmt(gramsTo, 4) + ' g', sub: to.species.formula.display },
      ],
      steps: [
        { text: 'Balance it first, always. ' + bal.text + ' — without this the ratio in step three is a guess.' },
        { text: 'Grams cannot talk to grams. The equation counts molecules, not mass, so the first job is to turn the mass you have into a number of moles: ' +
            ME.fmt.fmt(fromGrams, 4) + ' g ÷ ' + ME.fmt.fmt(Mfrom, 5) + ' g/mol = ' + ME.fmt.fmt(molesFrom, 4) + ' mol.' },
        { text: 'Now use the equation. It says ' + from.coefficient + ' ' + from.species.formula.display +
            ' gives ' + to.coefficient + ' ' + to.species.formula.display + ', so multiply by ' +
            to.coefficient + '/' + from.coefficient + ': ' + ME.fmt.fmt(molesFrom, 4) + ' × ' +
            to.coefficient + '/' + from.coefficient + ' = ' + ME.fmt.fmt(molesTo, 4) + ' mol.',
          maths: ME.fmt.fmt(molesFrom, 4) + ' mol ' + from.species.formula.display + ' × (' +
            to.coefficient + ' mol ' + to.species.formula.display + ' / ' + from.coefficient + ' mol ' +
            from.species.formula.display + ') = ' + ME.fmt.fmt(molesTo, 4) + ' mol' },
        { text: 'And back to something you can weigh: ' + ME.fmt.fmt(molesTo, 4) + ' mol × ' +
            ME.fmt.fmt(Mto, 5) + ' g/mol = ' + ME.fmt.fmt(gramsTo, 4) + ' g of ' + to.species.formula.display + '.' },
        { text: 'It is the same four steps every single time — grams, moles, moles, grams — and only the middle step needs the equation. Learn the shape and you have learned all of stoichiometry.' },
      ],
    };
  }

  /* Which reactant runs out first, and what that means for the yield. */
  function limiting(equationText, given) {
    /* given: [{ name, grams }] */
    const bal = ME.balance.balance(equationText);
    if (!bal.ok) return { ok: false, error: bal.error };
    const rows = [];
    for (const g of given) {
      const want = ME.formula.parse(g.name);
      if (!want.ok) return { ok: false, error: 'Cannot read ' + g.name };
      const sp = bal.left.filter((x) => x.species.formula.text === want.text)[0];
      if (!sp) return { ok: false, error: g.name + ' is not one of the reactants.' };
      const moles = g.grams / sp.species.formula.mass;
      rows.push({ name: sp.species.formula.display, grams: g.grams, moles: moles,
        coefficient: sp.coefficient, batches: moles / sp.coefficient, sp: sp });
    }
    rows.sort((a, b) => a.batches - b.batches);
    const lim = rows[0];

    const steps = [
      { text: 'A balanced equation is a recipe, and a recipe has a limit. Two eggs and a whole bag of flour still only makes one batch of pancakes — the eggs decide. The reactant that runs out first is called the limiting reactant, and it sets everything that follows.' },
      { text: 'Comparing masses directly will mislead you, because the substances have different molar masses and the equation wants different numbers of each. Turn each into moles, then divide by its coefficient — that gives how many "batches" of the reaction each one could support.' },
    ];
    rows.forEach((r) => {
      steps.push({ text: r.name + ': ' + ME.fmt.fmt(r.grams, 4) + ' g ÷ ' +
        ME.fmt.fmt(r.sp.species.formula.mass, 5) + ' = ' + ME.fmt.fmt(r.moles, 4) + ' mol, and ÷ ' +
        r.coefficient + ' = ' + ME.fmt.fmt(r.batches, 4) + ' batches.' });
    });
    steps.push({ text: lim.name + ' gives the smallest number, ' + ME.fmt.fmt(lim.batches, 4) +
      ', so it runs out first. It is the limiting reactant, and every product amount is worked out from it. Everything else is in excess — there will be some left over when the reaction stops.' });

    const products = bal.right.map((p) => {
      const moles = lim.batches * p.coefficient;
      return { name: p.species.formula.display, moles: moles, grams: moles * p.species.formula.mass };
    });
    const leftovers = rows.slice(1).map((r) => {
      const used = lim.batches * r.coefficient;
      return { name: r.name, moles: r.moles - used, grams: (r.moles - used) * r.sp.species.formula.mass };
    });
    return { ok: true, equation: bal, rows: rows, limiting: lim, products: products, leftovers: leftovers, steps: steps };
  }

  function percentYield(actual, theoretical) {
    const pct = (actual / theoretical) * 100;
    return {
      ok: true, percent: pct,
      steps: [
        { text: 'The theoretical yield is what the equation promises if nothing goes wrong: ' +
            ME.fmt.fmt(theoretical, 4) + ' g.' },
        { text: 'You actually got ' + ME.fmt.fmt(actual, 4) + ' g. As a percentage: ' +
            ME.fmt.fmt(actual, 4) + ' ÷ ' + ME.fmt.fmt(theoretical, 4) + ' × 100 = ' +
            ME.fmt.fmt(pct, 3) + '%.' },
        { text: pct > 100
            ? 'Over 100%, which cannot really happen — the product is almost certainly still wet, or has something else mixed in with it.'
            : 'Real reactions lose some. Product sticks to the glass, some of it goes off down a side reaction, some never reacts at all. A yield of 70–90% is a good day.' },
      ],
    };
  }

  ME.stoich = {
    gramsToMoles, molesToGrams, molesToParticles,
    empiricalFormula, molecularFormula, massToMass, limiting, percentYield,
  };
})();
