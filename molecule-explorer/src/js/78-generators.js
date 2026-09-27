/* Unlimited practice problems.
 *
 * The rule every generator follows: pick the numbers, then ask the calculation
 * engine for the answer. Never carry an answer. That way a generated question,
 * its worked solution and the grader are all the same code, and the app cannot
 * mark a correct answer wrong.
 *
 * The compounds are real, too - they come from the verified molecule database
 * and the verified ion table, not from a list typed here.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const gen = (k, s) => ME.practice.generator(k, s);
  const f = (x, s) => ME.fmt.fmt(x, s || 4);

  /* ---------------------------------------------------------------- pools */
  /* Simple ionic compounds, built from the verified tables rather than listed,
   * so every one is a real compound with a real name. */
  function ionicPool() {
    if (ionicPool.cache) return ionicPool.cache;
    const metals = ['Na', 'K', 'Li', 'Mg', 'Ca', 'Ba', 'Al', 'Zn', 'Ag', 'Fe', 'Cu', 'Pb', 'Sn'];
    const out = [];
    metals.forEach((m) => {
      const t = ME.ref.typicalCharge(m);
      const charges = t.variable ? (m === 'Fe' ? [2, 3] : m === 'Cu' ? [1, 2] : [2, 4]) : [t.charge];
      charges.forEach((mc) => {
        const anions = [{ f: 'Cl', c: -1 }, { f: 'O', c: -2 }, { f: 'S', c: -2 }, { f: 'Br', c: -1 }, { f: 'N', c: -3 }]
          .concat(ME.ref.ions.filter((i) => i.c < 0 && i.f.length <= 4).map((i) => ({ f: i.f, c: i.c, ion: i })));
        anions.forEach((a) => {
          const g = gcd(Math.abs(mc), Math.abs(a.c));
          const nM = Math.abs(a.c) / g, nA = Math.abs(mc) / g;
          const wrap = (txt, n) => (n === 1 ? txt : (/^[A-Z][a-z]?$/.test(txt) ? txt : '(' + txt + ')') + n);
          const formula = wrap(m, nM) + wrap(a.f, nA);
          const parsed = ME.formula.parse(formula);
          if (!parsed.ok) return;
          const named = ME.naming.nameOf(formula);
          if (!named.ok) return;
          /* Only keep it if the name reads back to the same compound. That is a
           * self-check: a generated problem nobody can answer is worse than no
           * problem at all. */
          const back = ME.naming.formulaOf(named.name);
          if (!back.ok) return;
          const bp = ME.formula.parse(back.formula);
          if (!bp.ok || bp.text !== parsed.text) return;
          out.push({ formula: formula, name: named.name, mass: parsed.mass, display: parsed.display });
        });
      });
    });
    ionicPool.cache = out;
    return out;
  }

  function covalentPool() {
    if (covalentPool.cache) return covalentPool.cache;
    const list = ['CO', 'CO2', 'NO', 'NO2', 'N2O', 'N2O4', 'N2O5', 'SO2', 'SO3', 'PCl3', 'PCl5',
      'CCl4', 'SF6', 'SF4', 'CS2', 'P2O5', 'ClF3', 'XeF4', 'IF7', 'SiO2', 'BF3'];
    covalentPool.cache = list.map((x) => {
      const p = ME.formula.parse(x);
      const n = ME.naming.nameOf(x);
      if (!p.ok || !n.ok) return null;
      return { formula: x, name: n.name, mass: p.mass, display: p.display };
    }).filter(Boolean);
    return covalentPool.cache;
  }

  /* Ordinary molecules from the verified database, for mass questions. */
  function moleculePool() {
    if (moleculePool.cache) return moleculePool.cache;
    moleculePool.cache = ME.search.all()
      .filter((m) => m.f && m.n && ME.formula.parse(m.f).ok)
      .filter((m) => {
        const p = ME.formula.parse(m.f);
        return p.atoms >= 3 && p.atoms <= 40 && p.mass < 400;
      })
      /* Database display names are capitalised, which reads badly in the
       * middle of a sentence. The naming engine's names are already correctly
       * cased, so only these need lowering. */
      .map((m) => ({ formula: m.f, name: m.n.toLowerCase(), mass: ME.formula.parse(m.f).mass }));
    return moleculePool.cache;
  }

  /* Balanced equations that are real reactions, checked by the balancer at
   * generation time so a broken one can never reach the reader. */
  const EQUATIONS = [
    'CH4 + O2 -> CO2 + H2O', 'C2H6 + O2 -> CO2 + H2O', 'C3H8 + O2 -> CO2 + H2O',
    'C4H10 + O2 -> CO2 + H2O', 'C2H5OH + O2 -> CO2 + H2O', 'C6H12O6 + O2 -> CO2 + H2O',
    'H2 + O2 -> H2O', 'N2 + H2 -> NH3', 'Na + Cl2 -> NaCl', 'Mg + O2 -> MgO',
    'Fe + O2 -> Fe2O3', 'Al + O2 -> Al2O3', 'K + H2O -> KOH + H2',
    'Zn + HCl -> ZnCl2 + H2', 'Mg + HCl -> MgCl2 + H2', 'Al + HCl -> AlCl3 + H2',
    'CaCO3 -> CaO + CO2', 'KClO3 -> KCl + O2', 'H2O2 -> H2O + O2', 'NaHCO3 -> Na2CO3 + H2O + CO2',
    'AgNO3 + NaCl -> AgCl + NaNO3', 'Pb(NO3)2 + KI -> PbI2 + KNO3',
    'BaCl2 + Na2SO4 -> BaSO4 + NaCl', 'NaOH + HCl -> NaCl + H2O',
    'NaOH + H2SO4 -> Na2SO4 + H2O', 'Ca(OH)2 + HCl -> CaCl2 + H2O',
    'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O', 'Fe2O3 + CO -> Fe + CO2',
    'N2O5 -> NO2 + O2', 'P4 + O2 -> P4O10', 'SO2 + O2 -> SO3',
    'Cu + AgNO3 -> Cu(NO3)2 + Ag', 'Al + CuSO4 -> Al2(SO4)3 + Cu',
  ];

  function gcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a || 1; }

  /* ============================================================ generators */

  gen('molar-mass', {
    name: 'Molar mass',
    make(r) {
      const pool = r.next() < 0.5 ? ionicPool() : moleculePool();
      const c = r.pick(pool);
      const m = ME.formula.molarMass(c.formula);
      return {
        kind: 'numeric',
        q: 'What is the molar mass of ' + c.name + ', ' + c.formula + '?',
        answer: m.mass, unit: 'g', tol: 0.005,
        right: 'Yes — ' + f(m.mass, 6) + ' g/mol.',
        wrong: 'Add up every atom: ' + m.rows.map((x) => x.count + ' × ' + f(x.mass, 5)).join(' + ') + '.',
        solution: m.rows.map((x) => ({
          text: x.count + ' ' + x.name.toLowerCase() + ' at ' + f(x.mass, 6) + ' = ' + f(x.total, 6) + ' g/mol',
        })).concat([{ text: 'Total: ' + f(m.mass, 6) + ' g/mol.' }]),
      };
    },
  });

  gen('grams-moles', {
    name: 'Grams and moles',
    make(r) {
      const c = r.pick(moleculePool().concat(ionicPool()));
      const toMoles = r.next() < 0.5;
      if (toMoles) {
        const grams = r.round(r.int(5, 500) / (r.next() < 0.5 ? 1 : 10), 2);
        const res = ME.stoich.gramsToMoles(grams, c.formula);
        return {
          kind: 'numeric',
          q: 'How many moles are there in ' + grams + ' g of ' + c.name + ', ' + c.formula + '?',
          answer: res.moles, unit: 'mol', tol: 0.01,
          right: f(res.moles, 4) + ' mol. Grams divided by molar mass, every time.',
          wrong: 'One mole of ' + c.formula + ' weighs ' + f(res.molarMass, 5) + ' g. Divide, do not multiply — check that the grams cancel.',
          solution: res.steps,
        };
      }
      const moles = r.round(r.int(5, 400) / 100, 2);
      const res = ME.stoich.molesToGrams(moles, c.formula);
      return {
        kind: 'numeric',
        q: 'What does ' + moles + ' mol of ' + c.name + ', ' + c.formula + ', weigh?',
        answer: res.grams, unit: 'g', tol: 0.01,
        right: f(res.grams, 4) + ' g.',
        wrong: 'One mole weighs ' + f(res.molarMass, 5) + ' g, so multiply by how many moles you have.',
        solution: res.steps,
      };
    },
  });

  gen('percent-composition', {
    name: 'Percent composition',
    make(r) {
      const c = r.pick(moleculePool().concat(ionicPool()));
      const res = ME.formula.percentComposition(c.formula);
      const row = r.pick(res.rows);
      return {
        kind: 'numeric',
        q: 'What percentage of ' + c.formula + ' is ' + row.name.toLowerCase() + ', by mass?',
        answer: row.percent, unit: null, tol: 0.01,
        right: f(row.percent, 4) + '%.',
        wrong: 'Work out the mass of that element in one mole, then divide by the mass of the whole mole.',
        solution: [
          { text: 'One mole of ' + c.formula + ' weighs ' + f(res.mass, 6) + ' g.' },
          { text: 'Of that, ' + row.name.toLowerCase() + ' accounts for ' + row.count + ' × ' +
              f(row.mass, 5) + ' = ' + f(row.total, 5) + ' g.' },
          { text: f(row.total, 5) + ' ÷ ' + f(res.mass, 6) + ' × 100 = ' + f(row.percent, 4) + '%.' },
        ],
      };
    },
  });

  gen('balance', {
    name: 'Balancing equations',
    make(r) {
      const eq = r.pick(EQUATIONS);
      const bal = ME.balance.balance(eq);
      if (!bal.ok) return null;
      return {
        kind: 'balance', equation: eq,
        q: 'Balance this: ' + eq.replace(/->/g, '→'),
        right: 'Balanced. ' + bal.text + ' — and it is ' + bal.type.label.toLowerCase() + '.',
        solution: ME.balance.explain(bal).map((s) => ({ text: s.heading + ' — ' + s.body })),
      };
    },
  });

  gen('formula-to-name', {
    name: 'Name the compound',
    make(r) {
      const pool = r.next() < 0.65 ? ionicPool() : covalentPool();
      const c = r.pick(pool);
      const named = ME.naming.nameOf(c.formula);
      return {
        kind: 'name', mode: 'name',
        q: 'What is the name of ' + c.formula + '?',
        answer: named.name,
        right: 'Yes: ' + named.name + '.',
        wrong: 'Positive part first, negative part second.',
        solution: named.steps,
      };
    },
  });

  gen('name-to-formula', {
    name: 'Write the formula',
    make(r) {
      const pool = r.next() < 0.65 ? ionicPool() : covalentPool();
      const c = r.pick(pool);
      const back = ME.naming.formulaOf(c.name);
      if (!back.ok) return null;
      return {
        kind: 'name', mode: 'formula',
        q: 'Write the formula for ' + c.name + '.',
        answer: back.formula,
        right: 'Yes: ' + back.formula + '.',
        wrong: 'Find the charge on each part, then work out how many of each you need for them to cancel.',
        solution: back.steps.map((s) => ({ text: s })),
      };
    },
  });

  gen('stoichiometry', {
    name: 'Mass to mass',
    make(r) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const eq = r.pick(EQUATIONS);
        const bal = ME.balance.balance(eq);
        if (!bal.ok) continue;
        const from = r.pick(bal.left);
        const to = r.pick(bal.right);
        const grams = r.round(r.int(20, 400) / (r.next() < 0.5 ? 1 : 10), 2);
        const res = ME.stoich.massToMass(eq, from.species.formula.text, grams, to.species.formula.text);
        if (!res.ok || !isFinite(res.grams)) continue;
        return {
          kind: 'numeric',
          q: grams + ' g of ' + from.species.formula.display + ' reacts as in ' +
            eq.replace(/->/g, '→') + '. What mass of ' + to.species.formula.display + ' does that make?',
          answer: res.grams, unit: 'g', tol: 0.015,
          right: f(res.grams, 4) + ' g.',
          wrong: 'Grams to moles, then use the coefficients, then moles back to grams. Four steps, always the same four.',
          solution: res.steps,
        };
      }
      return null;
    },
  });

  gen('limiting', {
    name: 'Limiting reactant',
    make(r) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const eq = r.pick(EQUATIONS);
        const bal = ME.balance.balance(eq);
        if (!bal.ok || bal.left.length < 2) continue;
        const given = bal.left.map((x) => ({
          name: x.species.formula.text,
          grams: r.round(r.int(10, 300) / (r.next() < 0.5 ? 1 : 10), 2),
        }));
        const res = ME.stoich.limiting(eq, given);
        if (!res.ok) continue;
        /* Skip the ones where two reactants tie, since then there is no
         * single right answer to grade. */
        if (res.rows.length > 1 && Math.abs(res.rows[0].batches - res.rows[1].batches) < 1e-6) continue;
        return {
          kind: 'choice',
          q: 'In ' + eq.replace(/->/g, '→') + ', you have ' +
            given.map((g, i) => g.grams + ' g of ' + bal.left[i].species.formula.display).join(' and ') +
            '. Which one runs out first?',
          options: bal.left.map((x) => ({
            t: x.species.formula.display,
            ok: x.species.formula.display === res.limiting.name,
            why: x.species.formula.display === res.limiting.name
              ? 'Right. It supports only ' + f(res.limiting.batches, 3) + ' batches of the reaction, fewer than the other, so it is the one that runs out and it decides how much product you get.'
              : 'No — there is more than enough of that one. Turn each mass into moles and then divide by its coefficient; the smallest result is the one that runs out.',
          })),
          solution: res.steps,
        };
      }
      return null;
    },
  });

  gen('gas-law', {
    name: 'The ideal gas law',
    make(r) {
      const solveFor = r.pick(['P', 'V', 'n', 'T']);
      const units = {
        P: r.pick(['atm', 'kPa', 'mmHg']), V: 'L',
        n: 'mol', T: r.pick(['K', 'C']),
      };
      /* Pick three values a reader could meet in a lab and derive the
       * fourth, rather than picking all four independently - that produced
       * "85 L at 267 kPa with half a mole", which needs 5469 K and is a
       * plasma, not a chemistry question. */
      const Patm = r.round(r.int(50, 400) / 100, 2);          /* 0.5 to 4 atm */
      const n = r.round(r.int(10, 300) / 100, 2);             /* 0.1 to 3 mol */
      const TK = r.int(250, 500);                             /* -23 to 227 C */
      const si = { P: Patm * 101325, n: n, T: TK };
      si.V = ME.gas.solveSI(si, 'V');

      const input = { units: units };
      ['P', 'V', 'n', 'T'].forEach((k) => {
        if (k === solveFor) { input[k] = null; return; }
        const base = k === 'T' ? 'K' : ME.gas.baseOf({ P: 'pressure', V: 'volume', n: 'amount' }[k]);
        input[k] = ME.fmt.roundSig(ME.fmt.convert(si[k], base, units[k]), 4);
      });
      /* Rebuild the state from the rounded numbers the reader will actually
       * see, so the answer matches what they can compute from the question. */
      ['P', 'V', 'n', 'T'].forEach((k) => {
        if (k === solveFor || input[k] === null) return;
        const base = k === 'T' ? 'K' : ME.gas.baseOf({ P: 'pressure', V: 'volume', n: 'amount' }[k]);
        si[k] = ME.fmt.convert(input[k], units[k], base);
      });
      si[solveFor] = ME.gas.solveSI(si, solveFor);
      const res = ME.gas.solve(input, solveFor);
      if (!res.ok) return null;
      const label = { P: 'the pressure', V: 'the volume', n: 'how many moles there are', T: 'the temperature' }[solveFor];
      const given = ['P', 'V', 'n', 'T'].filter((k) => k !== solveFor)
        .map((k) => k + ' = ' + f(input[k], 4) + ' ' + ME.fmt.unitLabel(units[k]));
      return {
        kind: 'numeric',
        q: 'A gas has ' + given.join(', ') + '. Work out ' + label + ', in ' + ME.fmt.unitLabel(units[solveFor]) + '.',
        answer: res.value, unit: solveFor === 'n' ? 'mol' : units[solveFor], tol: 0.015,
        right: f(res.value, 4) + ' ' + ME.fmt.unitLabel(units[solveFor]) + '.',
        wrong: 'Rearrange PV = nRT for ' + solveFor + ', and check the temperature went in as kelvin.',
        solution: [{ text: 'PV = nRT, rearranged: ' +
            { P: 'P = nRT/V', V: 'V = nRT/P', n: 'n = PV/RT', T: 'T = PV/nR' }[solveFor] }]
          .concat(res.steps.map((s) => ({ text: f(s.from, 5) + ' ' + ME.fmt.unitLabel(s.fromUnit) +
            ' becomes ' + f(s.to, 5) + ' ' + ME.fmt.unitLabel(s.toUnit) + '.' + (s.why ? ' ' + s.why : '') })))
          .concat([{ text: 'With R = ' + f(res.R, 6) + ' ' + res.RUnit + ', that gives ' + f(res.value, 5) + ' ' + ME.fmt.unitLabel(units[solveFor]) + '.' }]),
      };
    },
  });

  gen('dilution', {
    name: 'Dilution',
    make(r) {
      const M1 = r.round(r.int(10, 120) / 10, 1);
      const M2 = r.round(M1 / r.int(2, 10), 3);
      const V2 = r.int(50, 1000);
      const res = ME.solution.dilute(M1, null, M2, V2);
      return {
        kind: 'numeric',
        q: 'You need ' + V2 + ' mL of ' + M2 + ' M solution, and the bottle on the shelf is ' + M1 +
          ' M. What volume of the concentrated stuff do you measure out, in mL?',
        answer: res.value, unit: null, tol: 0.015,
        right: f(res.value, 4) + ' mL, then top up to ' + V2 + ' mL with water.',
        wrong: 'M₁V₁ = M₂V₂, because diluting does not change how much solute there is.',
        solution: res.steps,
      };
    },
  });

  gen('ph', {
    name: 'pH',
    make(r) {
      if (r.next() < 0.5) {
        const exp = r.int(1, 13);
        const mant = r.pick([1, 2, 5]);
        const H = mant * Math.pow(10, -exp);
        const res = ME.solution.pHfromH(H);
        return {
          kind: 'numeric',
          q: 'A solution has [H⁺] = ' + ME.fmt.sciText(H, 2) + ' mol/L. What is its pH?',
          answer: res.pH, unit: null, tol: 0.01, abs: 0.03,
          right: 'pH ' + f(res.pH, 3) + '.',
          wrong: 'pH = −log[H⁺]. If the concentration is 10⁻ⁿ exactly, the pH is just n.',
          solution: res.steps,
        };
      }
      const pH = r.round(r.int(5, 130) / 10, 1);
      const res = ME.solution.HfrompH(pH);
      return {
        kind: 'numeric',
        q: 'A solution has pH ' + pH + '. What is [H⁺], in mol/L?',
        answer: res.H, unit: null, tol: 0.03,
        right: ME.fmt.sciText(res.H, 3) + ' mol/L.',
        wrong: '[H⁺] = 10 to the power of minus the pH.',
        solution: res.steps,
      };
    },
  });

  gen('heat', {
    name: 'q = mcΔT',
    make(r) {
      const names = Object.keys(ME.ref.SPECIFIC_HEAT.values);
      const sub = r.pick(names);
      const c = ME.ref.SPECIFIC_HEAT.values[sub];
      const mass = r.int(20, 800);
      const dT = r.int(5, 80) * (r.next() < 0.25 ? -1 : 1);
      const res = ME.solution.heat(mass, c, dT);
      return {
        kind: 'numeric',
        q: 'How much energy does it take to change the temperature of ' + mass + ' g of ' + sub +
          ' by ' + dT + ' °C? Its specific heat is ' + c + ' J/(g·K). Answer in joules.',
        answer: res.q, unit: 'J', tol: 0.01,
        right: f(res.q, 4) + ' J.',
        wrong: 'q = mcΔT — just the three multiplied together.',
        solution: res.steps,
      };
    },
  });

  gen('unit-conversion', {
    name: 'Unit conversion',
    make(r) {
      const dim = r.pick(['pressure', 'volume', 'temperature', 'mass', 'energy', 'length']);
      const units = ME.fmt.unitsFor(dim);
      const from = r.pick(units);
      let to = r.pick(units);
      let guard = 0;
      while (to === from && guard++ < 10) to = r.pick(units);
      const value = dim === 'temperature' ? r.int(-50, 400) : r.round(r.int(1, 900) / (r.next() < 0.5 ? 1 : 10), 2);
      const answer = ME.fmt.convert(value, from, to);
      return {
        kind: 'numeric',
        q: 'Convert ' + value + ' ' + ME.fmt.unitLabel(from) + ' into ' + ME.fmt.unitLabel(to) + '.',
        answer: answer, unit: null, tol: 0.005,
        right: f(answer, 5) + ' ' + ME.fmt.unitLabel(to) + '.',
        wrong: 'Multiply by a fraction that equals one, arranged so the old unit cancels.',
        solution: [
          { text: '1 ' + ME.fmt.unitLabel(from) + ' = ' + f(ME.fmt.convert(1, from, to), 6) + ' ' + ME.fmt.unitLabel(to) + '.' },
          { text: value + ' × that = ' + f(answer, 6) + ' ' + ME.fmt.unitLabel(to) + '.' },
        ],
      };
    },
  });

  gen('sigfigs', {
    name: 'Significant figures',
    make(r) {
      const shapes = ['0.00#0', '#.##0', '##00', '#.#0e3', '0.0##', '###.#'];
      const shape = r.pick(shapes);
      const text = shape.replace(/#/g, () => String(r.int(1, 9)));
      const answer = ME.fmt.sigFigs(text);
      if (answer === null) return null;
      return {
        kind: 'count',
        q: 'How many significant figures does ' + text + ' have?',
        answer: answer,
        right: answer + '. ' + (text.indexOf('.') >= 0
          ? 'The decimal point means the trailing zeros were measured, so they count.'
          : 'With no decimal point the trailing zeros are just placeholders, so they do not count.'),
        wrong: 'Leading zeros never count. Trailing zeros count only if there is a decimal point.',
        solution: [
          { text: 'Strip the leading zeros — they only say where the decimal point is.' },
          { text: text.indexOf('.') >= 0
              ? 'There is a decimal point, so every remaining digit counts, trailing zeros included.'
              : 'There is no decimal point, so trailing zeros are ambiguous and do not count.' },
          { text: 'That leaves ' + answer + '.' },
        ],
      };
    },
  });

  gen('ion-charge', {
    name: 'Ion charges',
    make(r) {
      const useIon = r.next() < 0.5 && ME.ref.ions.length;
      if (useIon) {
        const ion = r.pick(ME.ref.ions);
        return {
          kind: 'count',
          q: 'What is the size of the charge on the ' + ion.n.toLowerCase() + ' ion, ' + ion.f + '?',
          answer: Math.abs(ion.c),
          right: ion.f + ' carries ' + Math.abs(ion.c) + (ion.c < 0 ? '−' : '+') + '. ' + (ion.note || ''),
          wrong: 'This one has to be learned — it is in the Reference tab, grouped by charge.',
          solution: [{ text: ion.n + ' is ' + ion.f + ' with a charge of ' + ion.c + '.' }],
        };
      }
      const syms = ME.chem.elements.filter((e) => {
        const t = ME.ref.typicalCharge(e.sym);
        return t && t.charge !== null && !t.variable && t.charge !== 0 && e.z <= 56;
      }).map((e) => e.sym);
      const sym = r.pick(syms);
      const t = ME.ref.typicalCharge(sym);
      return {
        kind: 'choice',
        q: 'What charge does ' + ME.chem.element(sym).name.toLowerCase() + ' take when it forms an ion?',
        options: ME.quiz.shuffle([t.charge, -t.charge, t.charge > 0 ? t.charge + 1 : t.charge - 1, 0])
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((v) => ({
            t: v === 0 ? 'none — it does not form an ion' : (Math.abs(v) === 1 ? '' : Math.abs(v)) + (v > 0 ? '+' : '−'),
            ok: v === t.charge,
            why: v === t.charge ? 'Right. ' + t.why
              : 'No. ' + t.why + ' So it is ' + (Math.abs(t.charge) === 1 ? '' : Math.abs(t.charge)) + (t.charge > 0 ? '+' : '−') + '.',
          })),
        solution: [{ text: t.why }],
      };
    },
  });

  gen('reaction-type', {
    name: 'Reaction types',
    make(r) {
      const LABELS = {
        synthesis: 'Synthesis', decomposition: 'Decomposition',
        single: 'Single replacement', double: 'Double replacement', combustion: 'Combustion',
      };
      /* Some of the equations in the pool are redox and do not fit the five
       * basic types. Keep picking rather than giving up, or the generator
       * returns nothing about one time in ten. */
      for (let attempt = 0; attempt < 20; attempt++) {
        const eq = r.pick(EQUATIONS);
        const bal = ME.balance.balance(eq);
        if (!bal.ok || !LABELS[bal.type.key]) continue;
        return {
          kind: 'choice',
          q: 'What kind of reaction is this? ' + eq.replace(/->/g, '\u2192'),
          options: ME.quiz.shuffle(Object.keys(LABELS)).map((k) => ({
            t: LABELS[k], ok: k === bal.type.key,
            why: k === bal.type.key ? 'Right. ' + bal.type.why : 'Not that one. ' + bal.type.why,
          })),
          solution: [{ text: bal.type.why }, { text: 'Balanced, it is ' + bal.text + '.' }],
        };
      }
      return null;
    },
  });

  gen('empirical', {
    name: 'Empirical formulas',
    make(r) {
      const c = r.pick(moleculePool());
      const comp = ME.formula.percentComposition(c.formula);
      if (!comp.ok) return null;
      const entries = comp.rows.map((x) => ({ sym: x.sym, value: r.round(x.percent, 2) }));
      const res = ME.stoich.empiricalFormula(entries);
      if (!res.ok) return null;
      return {
        kind: 'name', mode: 'formula',
        q: 'A compound is ' + entries.map((e) => e.value + '% ' + ME.chem.element(e.sym).name.toLowerCase()).join(', ') +
          ' by mass. What is its empirical formula?',
        answer: res.formula,
        right: res.formula + '.',
        wrong: 'Percentages are masses, so turn each into moles first, then divide by the smallest.',
        solution: res.steps,
      };
    },
  });

  gen('molarity', {
    name: 'Molarity',
    make(r) {
      const c = r.pick(ionicPool());
      const grams = r.round(r.int(20, 500) / 10, 1);
      const litres = r.round(r.int(1, 30) / 10, 2);
      const res = ME.solution.molarityFromGrams(grams, c.formula, litres);
      if (!res.ok) return null;
      return {
        kind: 'numeric',
        q: grams + ' g of ' + c.name + ' (' + c.formula + ') is dissolved and made up to ' +
          litres + ' L. What is the molarity?',
        answer: res.value, unit: null, tol: 0.015,
        right: f(res.value, 4) + ' M.',
        wrong: 'Grams to moles first — molarity counts moles, not mass — then divide by the litres.',
        solution: res.steps,
      };
    },
  });

  /* Every generator above has to actually work. This runs each one once at
   * startup in development, and the test suite runs each 400 times. */
  ME.practice.selfTest = function (times) {
    const problems = [];
    ME.practice.keys.forEach((k) => {
      for (let i = 0; i < (times || 1); i++) {
        try {
          const p = ME.practice.generate(k, (i + 1) * 7919);
          if (!p) { problems.push([k, 'returned nothing', i]); continue; }
          if (!p.q || p.q.length < 10) problems.push([k, 'no question text', i]);
          if (p.kind === 'numeric' && !isFinite(p.answer)) problems.push([k, 'answer is not a number', i]);
          if (p.kind === 'count' && !Number.isInteger(p.answer)) problems.push([k, 'count answer is not a whole number', i]);
          if (p.kind === 'choice' && p.options.filter((o) => o.ok).length !== 1) problems.push([k, 'not exactly one right option', i]);
          if (p.kind === 'name' && !p.answer) problems.push([k, 'no answer', i]);
        } catch (e) { problems.push([k, 'threw: ' + e.message, i]); }
      }
    });
    return problems;
  };
})();
