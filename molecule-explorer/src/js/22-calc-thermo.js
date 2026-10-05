/* Reaction energy, from formation enthalpies.
 *
 * The useful move here is not to store the enthalpy of each reaction. That
 * would be a list, and a list only ever covers what somebody thought to add.
 * Instead store one number per substance — its enthalpy of formation — and
 * compute any reaction between them:
 *
 *   ΔH°rxn = Σ ΔH°f(products) − Σ ΔH°f(reactants)
 *
 * which is Hess's law from Unit 13. Roughly a hundred substances then cover
 * an unbounded number of reactions, including ones nobody has run.
 *
 * Every number comes out of ME.ref.FORMATION, and the equation is balanced by
 * ME.balance first, so the coefficients used here are the same ones the
 * Balancer tab would show. A substance that is not in the table is said so by
 * name rather than quietly left out of the sum — a missing reactant would
 * otherwise produce a confident, wrong answer.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const f = (x, s) => ME.fmt.fmt(x, s || 4);
  const signed = (x, s) => (x > 0 ? '+' : '') + ME.fmt.fmtSigned(x, s || 4);

  /* How many times the recipe runs, said the way a person would say it.
   * "1 times through" is the sort of phrase that makes a reader stop and
   * reread, which is exactly the attention the chemistry needs instead. */
  function times(n) {
    if (Math.abs(n - 1) < 1e-9) return 'once through';
    if (Math.abs(n - 2) < 1e-9) return 'twice through';
    return f(n, 4) + ' times through';
  }
  function over(n) {
    if (Math.abs(n - 1) < 1e-9) return 'once';
    if (Math.abs(n - 2) < 1e-9) return 'twice';
    return f(n, 4) + ' times over';
  }

  /* ---------------------------------------------------------- the reaction */
  function reactionEnthalpy(equationText) {
    const bal = ME.balance.balance(equationText);
    if (!bal.ok) return { ok: false, error: bal.error, stage: 'balance' };

    const sides = [
      { key: 'reactants', list: bal.left, sign: -1 },
      { key: 'products', list: bal.right, sign: 1 },
    ];
    const rows = [];
    const missing = [];

    sides.forEach((side) => {
      side.list.forEach((x) => {
        const sp = x.species;
        const hit = ME.ref.FORMATION.lookup(sp.formula.text, sp.state);
        if (!hit) {
          missing.push(sp.formula.display + (sp.state ? '(' + sp.state + ')' : ''));
          return;
        }
        rows.push({
          side: side.key, sign: side.sign,
          display: sp.formula.display, name: hit.name,
          coefficient: x.coefficient, state: hit.state, assumedState: hit.assumedState,
          dh: hit.dh, contribution: side.sign * x.coefficient * hit.dh,
        });
      });
    });

    if (missing.length) {
      return {
        ok: false, stage: 'lookup', missing: missing,
        error: 'No formation enthalpy stored for ' + missing.join(' or ') +
          '. The table covers about a hundred common substances; this is not one of them, ' +
          'and leaving it out of the sum would give a confident wrong answer rather than no answer.',
      };
    }

    const deltaH = rows.reduce((sum, r) => sum + r.contribution, 0);
    const exothermic = deltaH < 0;
    const assumed = rows.filter((r) => r.assumedState);

    /* "Per mole of what" is ambiguous unless you say, so every reactant and
     * product gets its own per-mole figure. */
    const perMole = rows.map((r) => ({
      display: r.display, side: r.side, coefficient: r.coefficient,
      kJ: deltaH / r.coefficient,
    }));

    const sumText = (key) => rows.filter((r) => r.side === key)
      .map((r) => (r.coefficient === 1 ? '' : r.coefficient + ' × ') + f(r.dh, 5))
      .join(' + ');
    const sideTotal = (key) => rows.filter((r) => r.side === key)
      .reduce((n, r) => n + r.coefficient * r.dh, 0);

    const steps = [
      { text: 'Balance it first. Without the right coefficients every number below is multiplied by the wrong amount.',
        maths: bal.text },
      { text: 'Look up each substance’s enthalpy of formation — the energy change when one mole of it is made from its elements in their standard states. An element in its own standard state is zero by definition, which is where the whole scale is measured from.' },
      { text: 'Add up the products, each multiplied by its coefficient.',
        maths: sumText('products') + ' = ' + f(sideTotal('products'), 5) + ' kJ' },
      { text: 'Add up the reactants the same way.',
        maths: sumText('reactants') + ' = ' + f(sideTotal('reactants'), 5) + ' kJ' },
      { text: 'Subtract: products minus reactants. This is Hess’s law — enthalpy depends only on where you start and where you finish, so going down to the elements and back up again gives the same answer as the direct route.',
        maths: f(sideTotal('products'), 5) + ' − (' + f(sideTotal('reactants'), 5) + ') = ' + signed(deltaH, 5) + ' kJ' },
      { text: exothermic
        ? 'Negative, so the reaction releases ' + f(-deltaH, 5) + ' kJ as written. The bonds made are stronger than the bonds broken, and the difference comes out as heat.'
        : 'Positive, so the reaction absorbs ' + f(deltaH, 5) + ' kJ as written. The bonds made are weaker than the ones broken, so energy has to be put in and stays in.' },
    ];

    if (assumed.length) {
      steps.splice(2, 0, {
        /* Formulas in running prose, so chemHTML rather than formulaHTML:
         * the "298" in this sentence is a temperature, not a subscript. */
        html: 'No state was given for ' + assumed.map((r) => ME.chemHTML(r.display)).join(', ') +
          ', so each was taken in its standard state at 298 K: ' +
          assumed.map((r) => ME.chemHTML(r.display) + ' as ' +
            (ME.balance.STATES[r.state] || r.state)).join(', ') +
          '. This matters: water as a liquid and water as a gas differ by 44 kJ/mol, which is exactly the energy of boiling it.',
        text: 'No state was given for ' + assumed.map((r) => r.display).join(', ') +
          ', so each was taken in its standard state at 298 K: ' +
          assumed.map((r) => r.display + ' as ' + (ME.balance.STATES[r.state] || r.state)).join(', ') +
          '. This matters: water as a liquid and water as a gas differ by 44 kJ/mol, which is exactly the energy of boiling it.',
      });
    }

    return {
      ok: true, equation: bal, deltaH: deltaH, exothermic: exothermic,
      rows: rows, perMole: perMole, assumed: assumed, steps: steps,
    };
  }

  /* --------------------------------------------------- scaled to an amount */
  /* How much energy a particular quantity of reactant actually releases.
   * The amount of reaction that runs is set by whichever reactant runs out
   * first, so this goes through the same limiting-reactant code the
   * stoichiometry tool uses rather than assuming the one you named is it. */
  function energyFor(equationText, amounts) {
    const rxn = reactionEnthalpy(equationText);
    if (!rxn.ok) return rxn;

    const given = (amounts || []).filter((a) => a && a.name &&
      (a.grams !== null && a.grams !== undefined && isFinite(a.grams)));
    if (!given.length) return { ok: false, error: 'Give me a mass of at least one reactant.' };

    const lim = ME.stoich.limiting(equationText, given);
    if (!lim.ok) return { ok: false, error: lim.error };

    const batches = lim.limiting.batches;
    const energy = rxn.deltaH * batches;

    const steps = rxn.steps.concat([
      { text: 'That ΔH is for the equation exactly as written — the coefficients are the recipe. To scale it, work out how many times over the reaction can run with what you have.' },
      { text: given.length > 1
        ? 'With more than one reactant given, the one that runs out first decides, so this goes through the limiting-reactant calculation: ' +
          lim.limiting.name + ' runs out after ' + times(batches) + '.'
        : 'One reactant given, so it sets the scale directly: ' + f(given[0].grams, 4) + ' g of ' +
          lim.limiting.name + ' is ' + f(lim.limiting.moles, 4) + ' mol, which at a coefficient of ' +
          lim.limiting.coefficient + ' runs the reaction ' + over(batches) + '.',
        maths: f(batches, 5) + ' × ' + signed(rxn.deltaH, 5) + ' kJ = ' + signed(energy, 5) + ' kJ' },
      { text: rxn.exothermic
        ? 'So this much releases ' + f(-energy, 4) + ' kJ.'
        : 'So this much absorbs ' + f(energy, 4) + ' kJ.' },
    ]);

    return {
      ok: true, deltaH: rxn.deltaH, exothermic: rxn.exothermic,
      batches: batches, energy: energy, limiting: lim.limiting,
      leftovers: lim.leftovers, products: lim.products,
      equation: rxn.equation, rows: rxn.rows, steps: steps,
    };
  }

  /* A couple of comparisons that make a bare number mean something. */
  function compare(energyKJ) {
    const kJ = Math.abs(energyKJ);
    if (!(kJ > 0)) return null;
    const cWater = ME.ref.SPECIFIC_HEAT.values['water (liquid)'];
    /* How much water this would take from room temperature to boiling. */
    const litres = (kJ * 1000) / (cWater * 80) / 1000;
    /* A 2 kW kettle, in seconds. */
    const seconds = (kJ * 1000) / 2000;
    return {
      litres: litres, seconds: seconds,
      text: 'That is enough to take about ' + f(litres, 3) + ' litres of water from 20 °C to boiling, ' +
        'or the same as a 2 kW kettle running for ' + f(seconds, 3) + ' seconds.',
    };
  }

  ME.thermo = { reactionEnthalpy, energyFor, compare, times, over };
})();
