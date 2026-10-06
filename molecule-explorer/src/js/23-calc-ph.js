/* pH of a mixture.
 *
 * The temptation here is a formula per case: one for strong + strong, one for
 * strong acid with weak base, one for a buffer, one for an equivalence point.
 * That is how textbooks teach it, and it is how a calculator ends up quietly
 * wrong at the seams — the buffer formula does not know what to do when the
 * base runs out, and the equivalence-point formula does not know it is one
 * drop early.
 *
 * So there are no cases here. There is one equation, and it is the one
 * physics actually enforces: a beaker has no net charge.
 *
 *   [H⁺] − [OH⁻] + Σ (what each dissolved thing contributes) = 0
 *
 * Every substance is described the same way — the charge of its fully
 * protonated form, and a pKa for each proton it can lose — so its average
 * charge is a function of [H⁺] alone. Chloride is a −1 that never changes.
 * Acetic acid is a 0 that becomes −1 as the pH climbs past 4.76. Ammonium is
 * a +1 that becomes 0 past 9.25. Put the terms in, and the left-hand side
 * rises monotonically with [H⁺]: below the answer it is negative, above it is
 * positive, so bisection finds the one root it has and cannot miss it.
 *
 * Buffers, equivalence points, half-equivalence, the second proton of
 * sulfuric acid, 10⁻⁸ M hydrochloric acid — none of those is a case in this
 * file. They are all the same equation with different numbers in it, which is
 * the honest reason they behave the way they do.
 *
 * Assumptions, stated because they are real: 25 °C, so Kw = 1.0 × 10⁻¹⁴ and
 * neutral is 7.00; and ideal behaviour, meaning ions are treated as not
 * noticing each other. Above about 0.1 M that second one starts to show, and
 * the tool says so rather than printing four figures it has not earned.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const Kw = ME.fmt.CONST.Kw;

  /* The average charge one mole of a species carries at this [H⁺].
   *
   * β values are the running products of the Ka's, so the fraction in the
   * form that has lost k protons is (βk / hᵏ) over the sum of all of them.
   * With no pKa at all the sum is just 1 and the charge is a constant, which
   * is how a spectator ion falls out of the same expression as a triprotic
   * acid rather than needing its own branch. */
  function averageCharge(species, h) {
    const pKa = species.pKa || [];
    if (!pKa.length) return species.zFull;
    let beta = 1, denom = 1, weighted = 0;
    for (let k = 1; k <= pKa.length; k++) {
      beta *= Math.pow(10, -pKa[k - 1]);
      const term = beta / Math.pow(h, k);
      denom += term;
      weighted += k * term;
    }
    return species.zFull - weighted / denom;
  }

  /* Net charge per litre. Zero at the true pH, negative below it, positive
   * above — strictly increasing in h, which is what makes bisection safe. */
  function netCharge(mix, h) {
    let q = h - Kw / h;
    mix.forEach((s) => { q += s.C * averageCharge(s, h); });
    return q;
  }

  /* pH from a list of { C, zFull, pKa }. Bisection over pH rather than over
   * [H⁺], because pH is the scale the answer lives on: 60 halvings of a
   * 20-unit window land far past any precision the chemistry supports. */
  function solve(mix) {
    let lo = -2, hi = 16;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      /* Net charge falls as pH rises, so the sign test is the other way up. */
      if (netCharge(mix, Math.pow(10, -mid)) > 0) lo = mid; else hi = mid;
    }
    const pH = (lo + hi) / 2;
    const h = Math.pow(10, -pH);
    return { pH: pH, H: h, OH: Kw / h, pOH: 14 - pH };
  }

  /* --------------------------------------------------------- the solutions */
  /* One beaker before mixing: a substance from the table at a molarity, or a
   * pH typed straight in. */
  function solution(spec) {
    const litres = spec.litres;
    /* Zero is allowed. "Add nothing to it" is a real question, and it is how
     * a reader asks this tool for the pH of a single solution. */
    if (!(litres >= 0)) return { ok: false, error: 'A volume cannot be negative.' };

    if (spec.id === 'water') return { ok: true, litres: litres, species: [], label: 'water' };

    if (spec.id === 'ph') {
      if (spec.pH === null || spec.pH === undefined || !isFinite(spec.pH)) {
        return { ok: false, error: 'Give a pH for the solution you said you would type one for.' };
      }
      const h = Math.pow(10, -spec.pH);
      /* The concentration of strong acid (or base) that would sit at exactly
       * this pH, read straight off the same charge balance. At pH 7 it comes
       * out as zero, which is right: that is water. */
      const excess = h - Kw / h;
      const species = Math.abs(excess) < 1e-18 ? []
        : [{ C: Math.abs(excess), zFull: excess > 0 ? -1 : 1, pKa: [],
            name: excess > 0 ? 'strong acid' : 'strong base' }];
      return { ok: true, litres: litres, species: species, assumedStrong: true,
        label: 'something at pH ' + ME.fmt.fmt(spec.pH, 3) };
    }

    const sub = ME.ref.ACID_BASE.get(spec.id);
    if (!sub) return { ok: false, error: 'I do not know a substance called ' + spec.id + '.' };
    if (!(spec.molarity > 0)) {
      return { ok: false, error: 'Give ' + sub.n + ' a molarity greater than zero.' };
    }
    return { ok: true, litres: litres, substance: sub, label: sub.n,
      species: [{ C: spec.molarity, zFull: sub.zFull, pKa: sub.pKa, name: sub.n }] };
  }

  /* ------------------------------------------------------------- the mixing */
  function mix(specA, specB) {
    const a = solution(specA), b = solution(specB);
    if (!a.ok) return a;
    if (!b.ok) return b;

    const total = a.litres + b.litres;
    if (!(total > 0)) return { ok: false, error: 'One of the two volumes has to be more than zero.' };
    /* Mixing dilutes everything by the same factor it always did; the pH is
     * what changes unevenly, not the amounts. */
    const mixed = [];
    [a, b].forEach((sol) => sol.species.forEach((s) => {
      mixed.push({ C: s.C * sol.litres / total, zFull: s.zFull, pKa: s.pKa,
        name: s.name, moles: s.C * sol.litres });
    }));

    const before = { a: a.species.length ? solve(a.species) : solve([]),
      b: b.species.length ? solve(b.species) : solve([]) };
    const after = solve(mixed);

    return { ok: true, a: a, b: b, total: total, mixed: mixed,
      pHa: before.a.pH, pHb: before.b.pH,
      pH: after.pH, H: after.H, OH: after.OH, pOH: after.pOH };
  }

  /* --------------------------------------------------------- what is in there */
  /* How much of a weak species is in each protonation state at the answer.
   * This is where a reader sees that a buffer is not a special substance, it
   * is just an acid caught halfway. */
  function speciation(species, h) {
    const pKa = species.pKa || [];
    if (!pKa.length) return null;
    let beta = 1;
    const terms = [1];
    for (let k = 1; k <= pKa.length; k++) {
      beta *= Math.pow(10, -pKa[k - 1]);
      terms.push(beta / Math.pow(h, k));
    }
    const sum = terms.reduce((x, y) => x + y, 0);
    return terms.map((t, k) => ({ lost: k, fraction: t / sum }));
  }

  /* ------------------------------------------------------- saying why */
  /* Everything below decides what the reader is TOLD. None of it decides the
   * answer — that came out of the charge balance before any of this ran. A
   * classifier that steers the arithmetic is a classifier that can be wrong
   * about the arithmetic; this one can only be wrong about the wording, and
   * the wording is checked against the number it is describing. */

  /* How many protons this substance can hand over, and how many it can take.
   * Both fall out of the same two fields: a chloride cannot be protonated,
   * ammonia can take exactly one, sulfuric acid can give two. */
  function protonsGiven(s) { return Math.max(0, -s.zFull + (s.pKa || []).length); }
  function protonsTaken(s) { return Math.max(0, s.zFull); }

  const f = (x, n) => ME.fmt.fmt(x, n || 4);
  /* pH always gets two decimal places, never significant figures. The digits
   * in front of the point are the exponent of a concentration, not a measured
   * quantity — pH 2.00 is two significant figures, not three — so trimming a
   * trailing zero off pH 7.00 would be throwing away the part that counts. */
  const pHText = (x) => (Math.abs(x) < 0.005 ? 0 : x).toFixed(2);
  /* Concentrations here run from molar down to 10⁻⁹, so small ones need
   * scientific notation — with a real superscript, because "10^-6" in the
   * middle of a sentence reads as source code rather than as a number. */
  const conc = (x) => (x !== 0 && Math.abs(x) < 1e-3 ? ME.fmt.sciUnicode(x, 4) : f(x, 4));

  function describe(r) {
    const steps = [];
    const acidMmol = r.mixed.reduce((t, s) => t + s.moles * protonsGiven(s), 0) * 1000;
    const baseMmol = r.mixed.reduce((t, s) => t + s.moles * protonsTaken(s), 0) * 1000;
    const weak = r.mixed.filter((s) => (s.pKa || []).length);
    const strongOnly = !weak.length;

    steps.push({ text: 'Start with what is in each beaker, in moles rather than in pH. '
      + 'Moles are the thing that survives mixing — pH is not, because pH is a concentration '
      + 'and both concentrations are about to change.' });

    const lines = [];
    [r.a, r.b].forEach((sol, i) => {
      const tag = i === 0 ? 'A' : 'B';
      sol.species.forEach((s) => {
        lines.push(tag + ': ' + conc(s.C) + ' mol/L × ' + f(sol.litres * 1000, 4) + ' mL = '
          + conc(s.C * sol.litres * 1000) + ' mmol of ' + s.name);
      });
      if (!sol.species.length) lines.push(tag + ': ' + f(sol.litres * 1000, 4) + ' mL of water, nothing dissolved');
    });
    steps.push({ text: 'On its own, A sits at pH ' + pHText(r.pHa) + ' and B at pH ' + pHText(r.pHb) + '.',
      maths: lines.join('\n') });

    steps.push({ text: 'Mixing gives ' + f(r.total * 1000, 4) + ' mL in total, so every one of those '
      + 'amounts is now spread through a bigger volume. That dilution alone moves the pH, before '
      + 'anything has reacted with anything.' });

    if (acidMmol > 0 && baseMmol > 0) {
      const short = Math.min(acidMmol, baseMmol);
      const left = Math.abs(acidMmol - baseMmol);
      steps.push({ text: 'There is acid on one side and base on the other, so the first thing that '
        + 'happens is neutralisation: H⁺ meets OH⁻ and becomes water. The acid here can supply '
        + f(acidMmol, 4) + ' mmol of protons in total and the base can absorb ' + f(baseMmol, 4) + ' mmol, '
        + (left < 1e-9 * Math.max(acidMmol, 1)
          ? 'which is a dead heat — they cancel exactly.'
          : 'so ' + f(short, 4) + ' mmol cancels and ' + f(left, 4) + ' mmol of '
            + (acidMmol > baseMmol ? 'acid' : 'base') + ' is left over.') });
    } else if (r.mixed.length) {
      const both = acidMmol > 0 ? 'acids' : baseMmol > 0 ? 'bases' : null;
      steps.push({ text: both
        ? 'These are both ' + both + ', so there is nothing here for a neutralisation to do. '
          + 'The two just pool, and each one is diluted by the other — which is why the answer comes '
          + 'out close to the stronger of the two rather than between them.'
        : 'Nothing in here is an acid or a base, so the pH is water\u2019s own.' });
    }

    /* Is there a buffer? Not asked as "did a weak acid meet a strong base",
     * which would miss half the ways one can arise, but read off the answer:
     * a buffer is simply a weak acid caught with a real amount of both its
     * forms present at once. */
    let buffer = null;
    weak.forEach((s) => {
      const sp = speciation(s, r.H);
      for (let k = 0; k + 1 < sp.length; k++) {
        if (sp[k].fraction > 0.1 && sp[k + 1].fraction > 0.1) {
          buffer = { name: s.name, pKa: s.pKa[k], acid: sp[k].fraction, base: sp[k + 1].fraction };
        }
      }
    });

    if (buffer) {
      const ratio = buffer.base / buffer.acid;
      steps.push({ text: 'What is left is a buffer, and it is worth seeing why rather than being '
        + 'told. ' + buffer.name + ' is sitting ' + (buffer.acid * 100).toFixed(1) + '% in its acid form and '
        + (buffer.base * 100).toFixed(1) + '% in its conjugate base form at once. Add acid and the base form '
        + 'mops it up; add base and the acid form does. That is the whole mechanism.',
        maths: 'pH = pKa + log([base]/[acid]) = ' + f(buffer.pKa, 4) + ' + log(' + f(ratio, 3) + ') = '
          + pHText(buffer.pKa + Math.log10(ratio)) });
      steps.push({ text: 'That is Henderson–Hasselbalch, and it is not a separate rule — it is the '
        + 'same equilibrium rearranged. Which is also why a half-neutralised weak acid lands exactly '
        + 'on its pKa: half and half makes the log term zero.' });
    }

    steps.push({ text: strongOnly
      ? 'With only strong acids and bases in the beaker there is nothing holding protons in reserve, '
        + 'so the leftover amount divided by the total volume is the hydrogen ion concentration, and '
        + 'the pH is its logarithm.'
      : 'A weak acid or base does not hand over a fixed number of protons — how many it gives up '
        + 'depends on the pH, and the pH depends on how many it gives up. So the answer is the pH at '
        + 'which the beaker comes out electrically neutral, with every species holding the share of '
        + 'protons its pKa says it should at that pH.' });

    steps.push({ text: 'Solving that gives [H⁺] = ' + ME.fmt.sciUnicode(r.H, 4) + ' mol/L, and pH = −log[H⁺] = '
      + pHText(r.pH) + '.',
      maths: 'pH ' + pHText(r.pH) + '   pOH ' + pHText(r.pOH) + '   [H⁺] ' + ME.fmt.sciUnicode(r.H, 3)
        + ' M   [OH⁻] ' + ME.fmt.sciUnicode(r.OH, 3) + ' M' });

    /* The one thing most worth saying out loud, and only where it applies. */
    const avg = (r.pHa + r.pHb) / 2;
    if (Math.abs(avg - r.pH) > 0.25 && isFinite(avg)) {
      steps.push({ text: 'Notice the answer is not halfway between pH ' + pHText(r.pHa) + ' and pH '
        + pHText(r.pHb) + ', which would be ' + pHText(avg) + '. ' + (acidMmol > 0 && baseMmol > 0
          ? 'Averaging two pH values is never the move, and here it is not even close to the move: '
            + 'these two did not blend, they destroyed each other. What sets the answer is whatever '
            + 'survived that, which is why the result can sit nowhere near either starting point.'
          : 'You cannot average pH, because pH is a logarithm — what mixes is the concentrations, and '
            + 'one pH unit is a factor of ten in those. Mix something ten times stronger with '
            + 'something weaker and the strong one barely notices.') });
    }

    return { steps: steps, acidMmol: acidMmol, baseMmol: baseMmol, buffer: buffer,
      strongOnly: strongOnly, weak: weak };
  }

  /* Acidic, basic, or the narrow band where neither word is worth saying. */
  function verdict(pH) {
    if (pH < 6.95) return 'acidic';
    if (pH > 7.05) return 'basic';
    return 'essentially neutral';
  }

  ME.ph = { solve, mix, solution, pHText, averageCharge, netCharge, speciation, describe,
    verdict, protonsGiven, protonsTaken, Kw: Kw };
})();
