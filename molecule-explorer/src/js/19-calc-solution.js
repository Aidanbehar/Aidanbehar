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

  ME.solution = {
    molarity, molarityFromGrams, dilute, massPercent, ppm, molality,
    pHfromH, HfrompH, neutralise, heat, gibbs,
  };
})();
