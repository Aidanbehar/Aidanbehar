/* The gas laws.
 *
 * All of them are one equation, PV = nRT, looked at with different things held
 * still. That is worth saying out loud, because a first course usually
 * presents Boyle, Charles, Gay-Lussac and Avogadro as four separate laws to
 * memorise, and they are not four laws. They are one law, four times.
 *
 * Everything here works in SI internally (pascals, cubic metres, moles,
 * kelvin) and converts at the edges, so no formula in this file has to know
 * which units the reader picked.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const F = () => ME.fmt;

  /* ------------------------------------------------------------- the gases */
  /* Molar masses come from the verified element table via the formula parser,
   * so none of them is typed here. Air is the exception and is marked as
   * what it is: an average over a mixture, not a molecule. */
  const GASES = [
    { key: 'He', name: 'Helium', formula: 'He', atoms: 1, colour: '#d8b34a' },
    { key: 'Ne', name: 'Neon', formula: 'Ne', atoms: 1, colour: '#b46ad0' },
    { key: 'Ar', name: 'Argon', formula: 'Ar', atoms: 1, colour: '#4fb3a8' },
    { key: 'Kr', name: 'Krypton', formula: 'Kr', atoms: 1, colour: '#6f7ad6' },
    { key: 'Xe', name: 'Xenon', formula: 'Xe', atoms: 1, colour: '#9a5fb8' },
    { key: 'H2', name: 'Hydrogen', formula: 'H2', atoms: 2, colour: '#8d949f' },
    { key: 'N2', name: 'Nitrogen', formula: 'N2', atoms: 2, colour: '#3b62d4' },
    { key: 'O2', name: 'Oxygen', formula: 'O2', atoms: 2, colour: '#d6453c' },
    { key: 'CO2', name: 'Carbon dioxide', formula: 'CO2', atoms: 3, colour: '#5a6470' },
    { key: 'CH4', name: 'Methane', formula: 'CH4', atoms: 5, colour: '#43884f' },
    { key: 'NH3', name: 'Ammonia', formula: 'NH3', atoms: 4, colour: '#4a8fd0' },
    { key: 'SF6', name: 'Sulfur hexafluoride', formula: 'SF6', atoms: 7, colour: '#c8a02e' },
    { key: 'air', name: 'Air', formula: null, mass: 28.96, atoms: 2, colour: '#7d8894',
      note: 'Air is a mixture, not a molecule, so 28.96 g/mol is an average over roughly four fifths nitrogen and one fifth oxygen. The gas laws do not care — they never asked what the particles were.' },
  ];

  const BY_KEY = {};
  GASES.forEach((g) => { BY_KEY[g.key] = g; });

  function gas(key) { return BY_KEY[key] || BY_KEY.N2; }

  /* Molar mass in g/mol, derived from the element table wherever possible. */
  function molarMass(key) {
    const g = gas(key);
    if (g.mass) return g.mass;
    const p = ME.formula.parse(g.formula);
    return p.ok ? p.mass : null;
  }

  /* -------------------------- LITERATURE: van der Waals constants ---------
   * These are measured, tabulated quantities with no free machine-readable
   * source, so they sit here in one place, in the units they are published in
   * (a in L² bar mol⁻², b in L mol⁻¹) and the app says they are
   * tabulated values rather than implying they were checked against anything.
   *
   * `a` is how much the particles pull on each other, which lowers the
   * pressure below ideal. `b` is how much room the particles themselves take
   * up, which leaves less space than the container suggests. */
  const VDW = {
    source: 'Tabulated van der Waals constants, a in L² bar mol⁻² and b in L mol⁻¹.',
    He: { a: 0.0346, b: 0.0238 }, Ne: { a: 0.208, b: 0.0167 },
    Ar: { a: 1.355, b: 0.0320 }, Kr: { a: 2.325, b: 0.0396 },
    Xe: { a: 4.192, b: 0.0516 }, H2: { a: 0.2453, b: 0.0265 },
    N2: { a: 1.370, b: 0.0387 }, O2: { a: 1.382, b: 0.0319 },
    CO2: { a: 3.658, b: 0.0429 }, CH4: { a: 2.303, b: 0.0431 },
    NH3: { a: 4.225, b: 0.0371 }, SF6: { a: 7.857, b: 0.0879 },
    air: { a: 1.368, b: 0.0367 },
  };

  /* ------------------------------------------------------- the ideal gas law */
  /* Solve for whichever of the four is missing. Everything in SI. */
  function solveSI(state, solveFor) {
    const R = F().CONST.R;
    const { P, V, n, T } = state;
    switch (solveFor) {
      case 'P': return (n * R * T) / V;
      case 'V': return (n * R * T) / P;
      case 'n': return (P * V) / (R * T);
      case 'T': return (P * V) / (n * R);
      default: return null;
    }
  }

  /* The same thing in whatever units the reader is using, with the conversion
   * steps recorded so the app can show its working. */
  function solve(input, solveFor) {
    const u = input.units;
    const steps = [];
    const si = {};

    const put = (key, dim, unit) => {
      if (input[key] === null || input[key] === undefined) return;
      const v = F().convert(input[key], unit, dim === 'temperature' ? 'K' : baseOf(dim));
      si[key] = v;
      if (unit !== (dim === 'temperature' ? 'K' : baseOf(dim))) {
        steps.push({
          key: key, from: input[key], fromUnit: unit, to: v,
          toUnit: dim === 'temperature' ? 'K' : baseOf(dim),
          why: dim === 'temperature'
            ? 'Temperature has to go in as kelvin. The gas laws are proportional to temperature, and a proportion only means anything if zero really is zero — at 0 °C the particles have plenty of energy left, so calling it zero would make the arithmetic nonsense. At 0 K they have none.'
            : null,
        });
      }
    };
    put('P', 'pressure', u.P);
    put('V', 'volume', u.V);
    put('n', 'amount', u.n);
    put('T', 'temperature', u.T);

    const answerSI = solveSI(si, solveFor);
    if (answerSI === null || !isFinite(answerSI)) return { ok: false, error: 'Those numbers do not give an answer.' };

    const dim = { P: 'pressure', V: 'volume', n: 'amount', T: 'temperature' }[solveFor];
    const outUnit = u[solveFor];
    const answer = F().convert(answerSI, dim === 'temperature' ? 'K' : baseOf(dim), outUnit);
    return {
      ok: true, value: answer, unit: outUnit, si: answerSI, steps: steps,
      R: F().gasConstant(u.P, u.V, u.n),
      RUnit: F().unitLabel(u.P) + '·' + F().unitLabel(u.V) + ' / (' + F().unitLabel(u.n) + '·K)',
    };
  }

  function baseOf(dim) {
    return { pressure: 'Pa', volume: 'm3', amount: 'mol', temperature: 'K', mass: 'g' }[dim];
  }

  /* Grams to moles and back, which is a unit conversion that needs to know
   * what the gas is. This is why "grams" cannot live in the plain unit table. */
  function gramsToMoles(grams, gasKey) {
    const M = molarMass(gasKey);
    return M ? grams / M : null;
  }
  function molesToGrams(moles, gasKey) {
    const M = molarMass(gasKey);
    return M ? moles * M : null;
  }

  /* ----------------------------------------------------- the four "laws" */
  /* Each one is PV = nRT with two things pinned. The point of listing them is
   * to show that they are the same statement, not four things to learn. */
  const LAWS = [
    {
      key: 'boyle', name: "Boyle's law", hold: ['T', 'n'], vary: ['P', 'V'],
      relation: 'P₁V₁ = P₂V₂',
      plain: 'Squeeze a fixed amount of gas at a fixed temperature and the pressure goes up in exact proportion as the volume goes down.',
      why: 'The particles are unchanged and moving just as fast, but the box is smaller, so each one hits the wall more often. Halve the volume and every particle has half as far to travel between hits, so the hits come twice as often, so the pressure doubles.',
    },
    {
      key: 'charles', name: "Charles's law", hold: ['P', 'n'], vary: ['V', 'T'],
      relation: 'V₁ / T₁ = V₂ / T₂',
      plain: 'Heat a gas at a fixed pressure and it expands in proportion to its temperature in kelvin.',
      why: 'Hotter means faster, and faster particles hit harder and more often. If the pressure has to stay the same, the only way out is for the box to get bigger, so the hits spread over more wall. This is why a balloon shrinks in a freezer.',
    },
    {
      key: 'gaylussac', name: "Gay-Lussac's law", hold: ['V', 'n'], vary: ['P', 'T'],
      relation: 'P₁ / T₁ = P₂ / T₂',
      plain: 'Heat a gas in a container that cannot change size and the pressure climbs in proportion to the temperature.',
      why: 'Same reasoning as Charles, with the escape route blocked. The particles speed up and hit harder, and since the walls cannot move, all of that turns into pressure. It is why an aerosol can says do not incinerate.',
    },
    {
      key: 'avogadro', name: "Avogadro's law", hold: ['P', 'T'], vary: ['V', 'n'],
      relation: 'V₁ / n₁ = V₂ / n₂',
      plain: 'At the same pressure and temperature, twice as much gas takes up twice the volume — whatever the gas is.',
      why: 'The startling part is "whatever the gas is". A mole of hydrogen and a mole of sulfur hexafluoride, which is 70 times heavier, fill the same space. The heavy one moves slower, and that exactly cancels out its extra mass, so it lands on the wall with the same push.',
    },
  ];

  /* Combined gas law: the same ratio before and after. */
  function combined(before, after, solveFor) {
    /* P1V1/(n1T1) = P2V2/(n2T2) = R, so anything missing follows. */
    const R = (s) => (s.P * s.V) / (s.n * s.T);
    const k = R(before);
    const a = Object.assign({}, after);
    switch (solveFor) {
      case 'P': return (k * a.n * a.T) / a.V;
      case 'V': return (k * a.n * a.T) / a.P;
      case 'n': return (a.P * a.V) / (k * a.T);
      case 'T': return (a.P * a.V) / (k * a.n);
      default: return null;
    }
  }

  /* ----------------------------------------------------- non-ideal behaviour */
  /* The van der Waals equation, in SI, for the "real gas" comparison.
   *   (P + a n²/V²)(V − nb) = nRT
   */
  function vanDerWaalsP(state, gasKey) {
    const c = VDW[gasKey];
    if (!c) return null;
    /* a: L² bar mol⁻² -> Pa m⁶ mol⁻² ; b: L mol⁻¹ -> m³ mol⁻¹ */
    const a = c.a * 1e5 * 1e-6;
    const b = c.b * 1e-3;
    const R = F().CONST.R;
    const { V, n, T } = state;
    const free = V - n * b;
    if (free <= 0) return null;
    return (n * R * T) / free - (a * n * n) / (V * V);
  }

  /* How far from ideal, as a percentage, and whether it is worth mentioning. */
  function nonIdeal(state, gasKey) {
    const ideal = solveSI(state, 'P');
    const real = vanDerWaalsP(state, gasKey);
    if (real === null || !ideal) return null;
    const off = (real - ideal) / ideal * 100;
    return { ideal: ideal, real: real, percent: off, matters: Math.abs(off) > 2 };
  }

  /* -------------------------------------------------- particle speeds */
  /* Root-mean-square speed, from (3/2)kT = (1/2)mv² per particle. */
  function rmsSpeed(T, gasKey) {
    const M = molarMass(gasKey);
    if (!M || !T) return null;
    return Math.sqrt((3 * F().CONST.R * T) / (M / 1000));   /* m/s */
  }

  /* The Maxwell-Boltzmann distribution, for the speed histogram. Returns the
   * fraction of particles per unit speed at each speed given. */
  function speedDistribution(T, gasKey, speeds) {
    const M = molarMass(gasKey);
    if (!M || !T) return null;
    const m = (M / 1000) / F().CONST.NA;
    const k = F().CONST.kB;
    const pre = 4 * Math.PI * Math.pow(m / (2 * Math.PI * k * T), 1.5);
    return speeds.map((v) => pre * v * v * Math.exp(-(m * v * v) / (2 * k * T)));
  }

  /* Dalton: the total is just the sum, because each gas fills the whole
   * container as if the others were not there. */
  function partialPressures(moles, totalPressure) {
    const total = moles.reduce((a, b) => a + b, 0);
    if (!total) return null;
    return moles.map((n) => ({ moles: n, fraction: n / total, pressure: (n / total) * totalPressure }));
  }

  ME.gas = {
    GASES, gas, molarMass, solve, solveSI, combined, LAWS, VDW,
    vanDerWaalsP, nonIdeal, rmsSpeed, speedDistribution, partialPressures,
    gramsToMoles, molesToGrams, baseOf,
  };
})();
