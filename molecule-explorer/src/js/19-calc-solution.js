/* Solutions, acids and bases, and heat.
 *
 * Three topics in one file because they share the same shape: a small handful
 * of relationships, each of which has to be explained rather than stated.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const fmt = (x, s) => ME.fmt.fmt(x, s || 4);

  /* ------------------------------------------------------------ solutions */
  function molarity(moles, litres) {
    const M = moles / litres;
    return { ok: true, value: M, steps: [
      { text: 'Molarity is just "how crowded" — moles of the dissolved stuff per litre of solution. Nothing more.' },
      { text: fmt(moles) + ' mol ÷ ' + fmt(litres) + ' L = ' + fmt(M) + ' mol/L, written ' + fmt(M) + ' M.' },
      { text: 'Note it is per litre of *solution*, not per litre of water. You dissolve the solid first and then top up to the mark, because the solid takes up room too.' },
    ] };
  }

  function molarityFromGrams(grams, formula, litres) {
    const p = ME.formula.parse(formula);
    if (!p.ok) return p;
    const moles = grams / p.mass;
    const M = moles / litres;
    return { ok: true, value: M, moles: moles, molarMass: p.mass, steps: [
      { text: 'Molarity counts moles, so the grams have to become moles first. One mole of ' + p.display +
          ' is ' + fmt(p.mass, 6) + ' g.' },
      { text: fmt(grams) + ' g ÷ ' + fmt(p.mass, 5) + ' g/mol = ' + fmt(moles) + ' mol.' },
      { text: fmt(moles) + ' mol ÷ ' + fmt(litres) + ' L = ' + fmt(M) + ' M.' },
    ] };
  }

  /* Dilution. The reason M1V1 = M2V2 works is worth saying, because otherwise
   * it is a fourth formula to memorise rather than an obvious consequence. */
  function dilute(M1, V1, M2, V2) {
    const known = [M1, V1, M2, V2].filter((x) => x !== null && x !== undefined).length;
    if (known !== 3) return { ok: false, error: 'Give me three of the four and I will find the fourth.' };
    let out = {}, solved;
    if (M2 === null || M2 === undefined) { solved = 'M2'; out.M2 = (M1 * V1) / V2; }
    else if (V2 === null || V2 === undefined) { solved = 'V2'; out.V2 = (M1 * V1) / M2; }
    else if (M1 === null || M1 === undefined) { solved = 'M1'; out.M1 = (M2 * V2) / V1; }
    else { solved = 'V1'; out.V1 = (M2 * V2) / M1; }
    const value = out[solved];
    return { ok: true, solvedFor: solved, value: value, steps: [
      { text: 'Diluting adds water. It does not add or remove any of the dissolved substance — so the number of moles before and after is exactly the same.' },
      { text: 'Moles is molarity times volume, so that sentence is M₁V₁ = M₂V₂. It is not a new law, it is "the amount did not change" written down.' },
      { text: 'Rearranged for ' + solved + ': ' + fmt(value) + '.' },
      { text: 'The one trap: this works for any pair of units as long as you use the same ones on both sides. Millilitres on the left and litres on the right is out by a thousand.' },
    ] };
  }

  function massPercent(soluteGrams, solutionGrams) {
    const p = (soluteGrams / solutionGrams) * 100;
    return { ok: true, value: p, steps: [
      { text: 'Mass percent is the everyday way of saying concentration — it is what is on a bottle of vinegar or hydrogen peroxide.' },
      { text: fmt(soluteGrams) + ' g ÷ ' + fmt(solutionGrams) + ' g × 100 = ' + fmt(p, 4) + '%.' },
      { text: 'The bottom number is the whole solution, solute included. Dividing by the mass of the solvent alone is the usual slip.' },
    ] };
  }

  function ppm(soluteGrams, solutionGrams) {
    const v = (soluteGrams / solutionGrams) * 1e6;
    return { ok: true, value: v, steps: [
      { text: 'Parts per million is mass percent with a bigger multiplier, for things too dilute for percentages to be readable.' },
      { text: fmt(soluteGrams) + ' g ÷ ' + fmt(solutionGrams) + ' g × 10⁶ = ' + fmt(v, 4) + ' ppm.' },
      { text: 'For water, 1 ppm is almost exactly 1 mg per litre, because a litre of water weighs about a kilogram. That is why water quality is quoted in mg/L and ppm interchangeably.' },
    ] };
  }

  function molality(moles, kgSolvent) {
    const m = moles / kgSolvent;
    return { ok: true, value: m, steps: [
      { text: 'Molality is per kilogram of *solvent*, not per litre of solution. The difference matters because volume changes with temperature and mass does not — so molality is what you use when the temperature is going to move, which is exactly the case for freezing and boiling points.' },
      { text: fmt(moles) + ' mol ÷ ' + fmt(kgSolvent) + ' kg = ' + fmt(m) + ' mol/kg.' },
    ] };
  }

  /* ------------------------------------------------------- acids and bases */
  function pHfromH(H) {
    if (!(H > 0)) return { ok: false, error: 'A concentration has to be greater than zero.' };
    const pH = -Math.log10(H);
    return { ok: true, pH: pH, pOH: 14 - pH, OH: ME.fmt.CONST.Kw / H, steps: [
      { text: 'pH is a way of writing a very small number without drowning in zeros. Hydrogen ion concentrations run from about 1 down to 0.00000000000001, which is fourteen decimal places of nothing.' },
      { text: 'So take the power of ten and flip the sign: pH = −log[H⁺] = −log(' + ME.fmt.sciText(H, 3) + ') = ' + fmt(pH, 3) + '.' },
      { text: 'This is why a change of one pH unit is a factor of ten in acidity, not a small nudge. pH 3 is ten times as acidic as pH 4 and a hundred times pH 5.' },
      { text: 'And because water itself always satisfies [H⁺][OH⁻] = 10⁻¹⁴, the pOH follows for free: 14 − ' + fmt(pH, 3) + ' = ' + fmt(14 - pH, 3) + '.' },
    ] };
  }

  function HfrompH(pH) {
    const H = Math.pow(10, -pH);
    return { ok: true, H: H, OH: ME.fmt.CONST.Kw / H, pOH: 14 - pH, steps: [
      { text: 'Going back the other way just undoes the logarithm: [H⁺] = 10^(−pH).' },
      { text: '10^(−' + fmt(pH, 3) + ') = ' + ME.fmt.sciText(H, 4) + ' mol/L.' },
      { text: 'And [OH⁻] = 10⁻¹⁴ ÷ ' + ME.fmt.sciText(H, 3) + ' = ' + ME.fmt.sciText(ME.fmt.CONST.Kw / H, 4) + ' mol/L.' },
    ] };
  }

  function neutralise(Ma, Va, Mb, Vb, solveFor) {
    /* Assumes one-to-one, and says so. */
    const steps = [
      { text: 'At the endpoint the acid and the base have cancelled exactly — every H⁺ has met an OH⁻ and become water.' },
      { text: 'So moles of acid = moles of base, which is MₐVₐ = MᵦVᵦ for a one-to-one pair.' },
      { text: 'If the acid gives two hydrogens, like H₂SO₄, you need twice as much base, and the equation gains a 2. Always balance the neutralisation first to see which it is.' },
    ];
    let value;
    if (solveFor === 'Mb') value = (Ma * Va) / Vb;
    else if (solveFor === 'Vb') value = (Ma * Va) / Mb;
    else if (solveFor === 'Ma') value = (Mb * Vb) / Va;
    else value = (Mb * Vb) / Ma;
    steps.push({ text: 'Rearranged: ' + solveFor + ' = ' + fmt(value) + '.' });
    return { ok: true, value: value, steps: steps };
  }

  /* --------------------------------------------------------------- heat */
  function heat(mass, specificHeat, deltaT) {
    const q = mass * specificHeat * deltaT;
    return { ok: true, q: q, steps: [
      { text: 'Three things decide how much energy a temperature change took: how much stuff there is, what the stuff is, and how far the temperature moved. q = mcΔT is those three multiplied together, in that order.' },
      { text: 'c is the specific heat — the energy it takes to warm one gram by one degree. Water’s is 4.184 J/(g·K), which is enormous; a metal’s is around a tenth of that. It is why the sea takes all summer to warm up and a saucepan handle burns you in seconds.' },
      { text: fmt(mass) + ' g × ' + fmt(specificHeat, 4) + ' J/(g·K) × ' + fmt(deltaT, 4) + ' K = ' + fmt(q, 4) + ' J.' },
      { text: q > 0 ? 'A positive answer means the substance gained that much energy.'
                    : 'A negative answer means the substance lost that much energy.' },
      { text: 'Note ΔT is the same number in kelvin and in celsius. A gap of ten degrees is a gap of ten kelvin — only the starting point differs between the two scales, and a difference does not care where you started.' },
    ] };
  }

  /* Two things at different temperatures, put in contact. Energy leaves one
   * and enters the other until they agree, and nothing is lost — so
   *   m1 c1 (Tf - T1) + m2 c2 (Tf - T2) = 0
   * which rearranges to a weighted average of the two starting temperatures,
   * weighted by mc. Solving it rather than iterating means the final
   * temperature is exact, and the q values on each side must cancel. */
  function mixTemperatures(a, b) {
    const w1 = a.mass * a.c, w2 = b.mass * b.c;
    if (!(w1 > 0) || !(w2 > 0)) return { ok: false, error: 'Both masses and both specific heats have to be greater than zero.' };
    const Tf = (w1 * a.T + w2 * b.T) / (w1 + w2);
    const qA = w1 * (Tf - a.T);
    const qB = w2 * (Tf - b.T);
    const hotter = a.T > b.T ? a : b;
    const cooler = a.T > b.T ? b : a;
    return {
      ok: true, finalT: Tf, qA: qA, qB: qB,
      /* The check that matters: what one lost, the other gained. */
      imbalance: qA + qB,
      steps: [
        { text: 'Energy is conserved, so whatever the hotter one loses, the cooler one gains. There is no third place for it to go, assuming the container itself absorbs nothing.' },
        { text: 'Write q = mcΔT for each and set the total to zero: m₁c₁(T_final − T₁) + m₂c₂(T_final − T₂) = 0.' },
        { text: 'Rearranged, the answer is a weighted average of the two starting temperatures, weighted by mass times specific heat.',
          maths: 'T_final = (' + fmt(w1, 4) + ' × ' + fmt(a.T, 5) + ' + ' + fmt(w2, 4) + ' × ' + fmt(b.T, 5) + ') ÷ ' + fmt(w1 + w2, 4) + ' = ' + fmt(Tf, 5) },
        { text: 'So the ' + (hotter === a ? 'first' : 'second') + ' one lost ' + fmt(Math.abs(hotter === a ? qA : qB), 4) +
            ' J and the ' + (cooler === a ? 'first' : 'second') + ' one gained the same ' + fmt(Math.abs(cooler === a ? qA : qB), 4) + ' J.' },
        { text: 'Notice the final temperature is not halfway between. It sits much closer to whichever side has the larger mc — which is why a hot spanner dropped in a bucket of water barely warms the water at all.' },
      ],
    };
  }

  function gibbs(deltaH, deltaS, T) {
    /* deltaH in kJ/mol, deltaS in J/(mol K), T in K */
    const g = deltaH - (T * deltaS) / 1000;
    const spontaneous = g < 0;
    return { ok: true, deltaG: g, spontaneous: spontaneous, steps: [
      { text: 'Two things decide whether a reaction goes by itself. Does it release energy (ΔH negative)? And does it leave things more spread out and disordered (ΔS positive)? Either one helps; both together is unstoppable.' },
      { text: 'ΔG = ΔH − TΔS weighs them against each other, and the T is why temperature can change the answer. At low temperature the energy term wins; at high temperature the disorder term does, because it is multiplied by T.' },
      { text: 'ΔG = ' + fmt(deltaH, 4) + ' kJ/mol − (' + fmt(T, 4) + ' K × ' + fmt(deltaS, 4) +
          ' J/(mol·K) ÷ 1000) = ' + fmt(g, 4) + ' kJ/mol.' },
      { text: spontaneous
          ? 'Negative, so it happens on its own. That does not mean quickly — diamond turning into graphite has a negative ΔG and takes longer than the age of the universe. Spontaneous is about direction, not speed.'
          : 'Positive, so it will not go on its own at this temperature. Something has to push it.' },
      { text: 'The crossover is at T = ΔH/ΔS, which for these numbers is ' +
          (deltaS !== 0 ? fmt((deltaH * 1000) / deltaS, 4) + ' K.' : 'nowhere — ΔS is zero, so temperature makes no difference.') },
    ] };
  }

  /* ------------------------------------------------- colligative properties */
  /* ΔT = i K m. The interesting parameter is i, the number of particles one
   * formula unit produces on dissolving — which is read off the formula by
   * the naming engine rather than supplied, so it cannot disagree with what
   * the compound actually is. */
  function particlesPerUnit(formulaText) {
    const parsed = ME.formula.parse(formulaText);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const split = ME.naming.splitIonic(parsed.counts);
    if (!split) {
      return {
        ok: true, i: 1, ionic: false,
        why: parsed.display + ' dissolves as whole molecules, so one formula unit gives one particle.',
      };
    }
    const plural = (n) => (n === 1 ? ' ion' : ' ions');
    const cationName = (split.cation.sym
      ? ME.ref.elementNameLower(split.cation.sym)
      : split.cation.name) + plural(split.cation.count);
    const anionName = split.anion.name + plural(split.anion.count);
    const i = split.cation.count + split.anion.count;
    return {
      ok: true, i: i, ionic: true,
      why: parsed.display + ' separates into ' + split.cation.count + ' ' + cationName +
        ' and ' + split.anion.count + ' ' + anionName + ', which is ' + i + ' particles.',
    };
  }

  function freezingPoint(formulaText, molality, solventName) {
    const solvent = (solventName || 'water').toLowerCase();
    const c = ME.ref.COLLIGATIVE.solvents[solvent];
    if (!c) return { ok: false, error: 'No constants stored for ' + solvent + '.' };
    const pp = particlesPerUnit(formulaText);
    if (!pp.ok) return pp;
    const drop = pp.i * c.Kf * molality;
    return {
      ok: true, i: pp.i, K: c.Kf, molality: molality, drop: drop,
      temperature: c.mp - drop, solvent: solvent,
      steps: [
        { text: 'How many particles does each formula unit give? ' + pp.why },
        { text: 'The freezing-point constant for ' + solvent + ' is ' + c.Kf + ' °C per molal. That is literature data, not something this app can verify.' },
        { text: 'ΔT = i × K × m', maths: pp.i + ' × ' + c.Kf + ' × ' + ME.fmt.fmt(molality, 4) + ' = ' + ME.fmt.fmt(drop, 4) + ' °C' },
        { text: 'So it freezes at ' + ME.fmt.fmtSigned(c.mp - drop, 4) + ' °C instead of ' + c.mp + ' °C.' },
      ],
    };
  }

  function boilingPoint(formulaText, molality, solventName) {
    const solvent = (solventName || 'water').toLowerCase();
    const c = ME.ref.COLLIGATIVE.solvents[solvent];
    if (!c) return { ok: false, error: 'No constants stored for ' + solvent + '.' };
    const pp = particlesPerUnit(formulaText);
    if (!pp.ok) return pp;
    const rise = pp.i * c.Kb * molality;
    return {
      ok: true, i: pp.i, K: c.Kb, molality: molality, rise: rise,
      temperature: c.bp + rise, solvent: solvent,
      steps: [
        { text: 'How many particles does each formula unit give? ' + pp.why },
        { text: 'The boiling-point constant for ' + solvent + ' is ' + c.Kb + ' °C per molal — much smaller than the freezing one, which is why salting pasta water raises its boiling point by a fraction of a degree and does not speed anything up.' },
        { text: 'ΔT = i × K × m', maths: pp.i + ' × ' + c.Kb + ' × ' + ME.fmt.fmt(molality, 4) + ' = ' + ME.fmt.fmt(rise, 4) + ' °C' },
        { text: 'So it boils at ' + ME.fmt.fmt(c.bp + rise, 4) + ' °C instead of ' + c.bp + ' °C.' },
      ],
    };
  }

  ME.solution = {
    molarity, molarityFromGrams, dilute, massPercent, ppm, molality,
    pHfromH, HfrompH, neutralise, heat, mixTemperatures, gibbs,
    particlesPerUnit, freezingPoint, boilingPoint,
  };
})();
