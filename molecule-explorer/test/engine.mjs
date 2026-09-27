/* Tests for the calculation engine, run inside the real built file.
 *
 * Every number a lesson shows and every answer a lesson grades comes out of
 * this code, so these tests are the guarantee that the app cannot teach one
 * thing and mark another.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const FILE = 'file://' + path.resolve('dist/molecule-explorer.html');
const EXEC = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let browser, page;
before(async () => {
  browser = await chromium.launch({
    executablePath: fs.existsSync(EXEC) ? EXEC : undefined,
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const ctx = await browser.newContext();
  await ctx.setOffline(true);
  page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.ME && window.ME.search && window.ME.search.all().length > 0);
});
after(async () => { await browser.close(); });
const run = (fn, arg) => page.evaluate(fn, arg);

/* ------------------------------------------------------------- constants */
describe('physical constants', () => {
  test('are derived from the SI definitions, not copied', async () => {
    const c = await run(() => window.ME.fmt.CONST);
    /* NA and kB are exact by definition since 2019, so R is exact too. */
    assert.equal(c.NA, 6.02214076e23);
    assert.equal(c.kB, 1.380649e-23);
    assert.ok(Math.abs(c.R - 8.31446261815324) < 1e-12, 'R = ' + c.R);
    assert.ok(Math.abs(c.molarVolumeSTP - 22.414) < 0.001, 'molar volume at STP = ' + c.molarVolumeSTP);
  });

  test('R comes out right in whatever units the reader is using', async () => {
    const got = await run(() => ({
      atmL: window.ME.fmt.gasConstant('atm', 'L', 'mol'),
      kPaL: window.ME.fmt.gasConstant('kPa', 'L', 'mol'),
      mmHgL: window.ME.fmt.gasConstant('mmHg', 'L', 'mol'),
      PaM3: window.ME.fmt.gasConstant('Pa', 'm3', 'mol'),
    }));
    assert.ok(Math.abs(got.atmL - 0.0820573) < 1e-6, 'L atm: ' + got.atmL);
    assert.ok(Math.abs(got.kPaL - 8.31446) < 1e-4, 'L kPa: ' + got.kPaL);
    assert.ok(Math.abs(got.mmHgL - 62.3636) < 1e-3, 'L mmHg: ' + got.mmHgL);
    assert.ok(Math.abs(got.PaM3 - 8.31446) < 1e-4, 'Pa m3: ' + got.PaM3);
  });
});

/* ------------------------------------------------------------ conversions */
describe('unit conversions', () => {
  const CASES = [
    /* value, from, to, expected — every one checkable by hand */
    [1, 'atm', 'Pa', 101325], [1, 'atm', 'kPa', 101.325], [1, 'atm', 'torr', 760],
    [1, 'atm', 'bar', 1.01325], [1, 'atm', 'psi', 14.6959], [760, 'mmHg', 'atm', 1.0000],
    [1, 'L', 'mL', 1000], [1, 'm3', 'L', 1000], [1, 'L', 'cm3', 1000],
    [1, 'gal', 'L', 3.785412], [1, 'ft3', 'L', 28.31685], [1, 'dm3', 'L', 1],
    [0, 'C', 'K', 273.15], [100, 'C', 'K', 373.15], [25, 'C', 'K', 298.15],
    [32, 'F', 'C', 0], [212, 'F', 'C', 100], [98.6, 'F', 'C', 37],
    [-40, 'F', 'C', -40], [0, 'K', 'C', -273.15], [300, 'K', 'F', 80.33],
    [1, 'mol', 'mmol', 1000], [1, 'mol', 'particles', 6.02214076e23],
    [1, 'kg', 'g', 1000], [1, 'lb', 'g', 453.59237],
    [1, 'kcal', 'J', 4184], [1, 'cal', 'J', 4.184],
  ];
  test('every one is right', async () => {
    const got = await run((cases) => cases.map((c) => {
      try { return window.ME.fmt.convert(c[0], c[1], c[2]); } catch (e) { return 'ERROR ' + e.message; }
    }), CASES);
    CASES.forEach((c, i) => {
      const want = c[3];
      const g = got[i];
      assert.equal(typeof g, 'number', `${c[0]} ${c[1]} -> ${c[2]} gave ${g}`);
      const slack = Math.max(Math.abs(want) * 1e-5, 1e-9);
      assert.ok(Math.abs(g - want) <= slack, `${c[0]} ${c[1]} -> ${c[2]}: got ${g}, expected ${want}`);
    });
  });

  test('round-trips through every unit of every dimension', async () => {
    const bad = await run(() => {
      const F = window.ME.fmt, out = [];
      Object.keys(F.UNITS).forEach((dim) => {
        const units = F.unitsFor(dim);
        units.forEach((a) => units.forEach((b) => {
          const v = 37.5;
          const back = F.convert(F.convert(v, a, b), b, a);
          if (Math.abs(back - v) > 1e-9 * Math.max(1, v)) out.push([dim, a, b, back]);
        }));
      });
      return out;
    });
    assert.deepEqual(bad, [], 'conversions that do not round-trip: ' + JSON.stringify(bad.slice(0, 5)));
  });

  test('refuses to convert between different quantities', async () => {
    const r = await run(() => {
      try { window.ME.fmt.convert(1, 'L', 'atm'); return 'no error'; } catch (e) { return e.message; }
    });
    assert.match(r, /different quantities/);
  });

  test('temperature units do not collide with other single letters', async () => {
    /* "C" is celsius and "c" is not; "K" is kelvin and "kg" is mass. */
    const got = await run(() => ({
      C: window.ME.fmt.canonicalUnit('C', 'temperature'),
      degC: window.ME.fmt.canonicalUnit('°C'),
      K: window.ME.fmt.canonicalUnit('K'),
      F: window.ME.fmt.canonicalUnit('F', 'temperature'),
      g: window.ME.fmt.canonicalUnit('g'),
      L: window.ME.fmt.canonicalUnit('L'),
    }));
    assert.deepEqual(got, { C: 'C', degC: 'C', K: 'K', F: 'F', g: 'g', L: 'L' });
  });
});

/* --------------------------------------------------------- sig figs & format */
describe('significant figures', () => {
  test('counted from what was written, not from the value', async () => {
    const got = await run(() => {
      const F = window.ME.fmt;
      const cases = ['100', '100.', '100.0', '0.00120', '1.20e3', '1200', '5', '0.0', '12.340', '1.2 x 10^3'];
      const out = {};
      cases.forEach((c) => { out[c] = F.sigFigs(c); });
      return out;
    });
    assert.equal(got['100'], 1);
    assert.equal(got['100.'], 3);
    assert.equal(got['100.0'], 4);
    assert.equal(got['0.00120'], 3);
    assert.equal(got['1.20e3'], 3);
    assert.equal(got['1200'], 2);
    assert.equal(got['5'], 1);
    assert.equal(got['12.340'], 5);
    assert.equal(got['1.2 x 10^3'], 2);
  });

  test('rounds to a given number of figures', async () => {
    const got = await run(() => {
      const F = window.ME.fmt;
      return [F.roundSig(1234, 2), F.roundSig(0.0012345, 3), F.roundSig(9.99, 2), F.roundSig(1.005, 3), F.roundSig(-1234, 2)];
    });
    assert.equal(got[0], 1200);
    assert.ok(Math.abs(got[1] - 0.00123) < 1e-9);
    assert.equal(got[2], 10);
    assert.equal(got[4], -1200);
  });
});

/* ---------------------------------------------------------- formula parsing */
describe('formula parsing and molar mass', () => {
  /* Masses checked against the values a chemistry class would use. */
  const MASSES = [
    ['H2O', 18.015], ['CO2', 44.009], ['NaCl', 58.44], ['C6H12O6', 180.16],
    ['Ca(OH)2', 74.09], ['Al2(SO4)3', 342.15], ['CuSO4', 159.61],
    ['CuSO4.5H2O', 249.69], ['CuSO4·5H2O', 249.69],
    ['KAl(SO4)2·12H2O', 474.39], ['Na2CO3·10H2O', 286.14],
    ['(NH4)2Cr2O7', 252.06], ['Fe(C5H5)2', 186.03], ['Mg(NO3)2', 148.31],
    ['H2SO4', 98.08], ['NH3', 17.03], ['CH4', 16.04], ['C8H18', 114.23],
    ['[Cu(NH3)4]2+', 131.67], ['Ca3(PO4)2', 310.18], ['NaHCO3', 84.01],
  ];
  test('every molar mass is right', async () => {
    const got = await run((list) => list.map((c) => {
      const p = window.ME.formula.parse(c[0]);
      return p.ok ? p.mass : 'FAIL: ' + p.error;
    }), MASSES);
    MASSES.forEach((c, i) => {
      assert.equal(typeof got[i], 'number', `${c[0]}: ${got[i]}`);
      assert.ok(Math.abs(got[i] - c[1]) < 0.02, `${c[0]}: got ${got[i]}, expected about ${c[1]}`);
    });
  });

  test('ions get the charge the notation means', async () => {
    /* The bug this pins: NH4+ once read as nitrogen, four hydrogens and a
     * charge of +4, because a trailing digit was always taken as the charge. */
    const CASES = [
      ['NH4+', { N: 1, H: 4 }, 1], ['SO42-', { S: 1, O: 4 }, -2],
      ['SO4^2-', { S: 1, O: 4 }, -2], ['PO43-', { P: 1, O: 4 }, -3],
      ['CO32-', { C: 1, O: 3 }, -2], ['NO3-', { N: 1, O: 3 }, -1],
      ['Cr2O72-', { Cr: 2, O: 7 }, -2], ['Fe3+', { Fe: 1 }, 3],
      ['Ca2+', { Ca: 1 }, 2], ['Ca++', { Ca: 1 }, 2], ['S2-', { S: 1 }, -2],
      ['OH-', { O: 1, H: 1 }, -1], ['H3O+', { H: 3, O: 1 }, 1],
      ['MnO4-', { Mn: 1, O: 4 }, -1], ['Sn4+', { Sn: 1 }, 4],
      ['[Cu(NH3)4]2+', { Cu: 1, N: 4, H: 12 }, 2],
      ['[Fe(CN)6]3-', { Fe: 1, C: 6, N: 6 }, -3],
      ['e-', {}, -1],
    ];
    const got = await run((list) => list.map((c) => {
      const p = window.ME.formula.parse(c[0]);
      return p.ok ? { counts: p.counts, charge: p.charge } : { error: p.error };
    }), CASES);
    CASES.forEach((c, i) => {
      const g = got[i];
      assert.ok(!g.error, `${c[0]}: ${g.error}`);
      assert.equal(g.charge, c[2], `${c[0]} charge: got ${g.charge}, expected ${c[2]}`);
      const keys = Object.keys(g.counts).filter((k) => g.counts[k]);
      assert.equal(keys.length, Object.keys(c[1]).length, `${c[0]} element count: ${JSON.stringify(g.counts)}`);
      Object.keys(c[1]).forEach((k) => {
        assert.equal(g.counts[k], c[1][k], `${c[0]} ${k}: got ${g.counts[k]}, expected ${c[1][k]}`);
      });
    });
  });

  test('canonical text round-trips back through the parser', async () => {
    const bad = await run(() => {
      const F = window.ME.formula, out = [];
      ['NH4+', 'SO42-', 'PO43-', 'Fe3+', 'Cr2O72-', 'H3O+', 'Al2(SO4)3',
       'CuSO4.5H2O', '[Fe(CN)6]3-', 'Ca(OH)2', 'C6H12O6'].forEach((f) => {
        const a = F.parse(f);
        if (!a.ok) { out.push([f, a.error]); return; }
        const b = F.parse(a.text);
        if (!b.ok) { out.push([f, a.text, b.error]); return; }
        if (b.charge !== a.charge) { out.push([f, 'charge', a.charge, b.charge]); return; }
        const keys = new Set(Object.keys(a.counts).concat(Object.keys(b.counts)));
        for (const k of keys) if ((a.counts[k] || 0) !== (b.counts[k] || 0)) out.push([f, k]);
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('case matters, and a wrong case is offered a fix rather than refused', async () => {
    const got = await run(() => {
      const F = window.ME.formula;
      return {
        CO: F.parse('CO').mass, Co: F.parse('Co').mass,
        lower: F.parse('h2o'), caps: F.parse('NACL'), mixed: F.parse('naCl'),
      };
    });
    /* Co is cobalt at 58.9; CO is carbon monoxide at 28.0. Never the same. */
    assert.ok(Math.abs(got.CO - 28.01) < 0.02, 'CO = ' + got.CO);
    assert.ok(Math.abs(got.Co - 58.93) < 0.02, 'Co = ' + got.Co);
    assert.equal(got.lower.ok, false);
    assert.deepEqual(got.lower.fixes, ['H2O']);
    assert.equal(got.caps.ok, false);
    assert.ok(got.caps.fixes.indexOf('NaCl') >= 0, JSON.stringify(got.caps.fixes));
    assert.ok(got.mixed.fixes.indexOf('NaCl') >= 0, JSON.stringify(got.mixed.fixes));
  });

  test('malformed input explains itself and never throws', async () => {
    const got = await run(() => {
      const F = window.ME.formula;
      return ['', 'Xx2', '(H2O', 'H2O)', 'Zz', '()', 'H2O^', '2', '+'].map((f) => {
        const p = F.parse(f);
        return { input: f, ok: p.ok, error: p.error || null };
      });
    });
    got.forEach((g) => {
      assert.equal(g.ok, false, g.input + ' should not parse');
      assert.ok(g.error && g.error.length > 10, g.input + ' needs a real explanation, got: ' + g.error);
    });
  });

  test('percent composition adds up to 100', async () => {
    const got = await run(() => ['H2O', 'C6H12O6', 'Ca(OH)2', 'CuSO4.5H2O', 'NaHCO3'].map((f) => {
      const p = window.ME.formula.percentComposition(f);
      return { f: f, total: p.rows.reduce((n, r) => n + r.percent, 0), rows: p.rows.length };
    }));
    got.forEach((g) => {
      assert.ok(Math.abs(g.total - 100) < 1e-6, g.f + ' percentages total ' + g.total);
      assert.ok(g.rows >= 2, g.f);
    });
  });

  test('water is 11.19% hydrogen by mass', async () => {
    const got = await run(() => window.ME.formula.percentComposition('H2O').rows
      .map((r) => [r.sym, Math.round(r.percent * 100) / 100]));
    assert.deepEqual(got, [['H', 11.19], ['O', 88.81]]);
  });
});

/* -------------------------------------------------------------- balancing */
describe('balancing equations', () => {
  /* Each of these has one right answer, checkable against any textbook. */
  const EQ = [
    ['CH4 + O2 -> CO2 + H2O', [1, 2, 1, 2]],
    ['H2 + O2 = H2O', [2, 1, 2]],
    ['Fe + O2 -> Fe2O3', [4, 3, 2]],
    ['C3H8 + O2 -> CO2 + H2O', [1, 5, 3, 4]],
    ['C8H18 + O2 -> CO2 + H2O', [2, 25, 16, 18]],
    ['Al + CuSO4 -> Al2(SO4)3 + Cu', [2, 3, 1, 3]],
    ['NaOH + H2SO4 -> Na2SO4 + H2O', [2, 1, 1, 2]],
    ['Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O', [3, 2, 1, 6]],
    ['Pb(NO3)2 + KI -> PbI2 + KNO3', [1, 2, 1, 2]],
    ['N2 + H2 -> NH3', [1, 3, 2]],
    ['Zn + HCl -> ZnCl2 + H2', [1, 2, 1, 1]],
    ['H2O -> H2 + O2', [2, 2, 1]],
    ['C6H12O6 + O2 -> CO2 + H2O', [1, 6, 6, 6]],
    ['Fe + H2O -> Fe3O4 + H2', [3, 4, 1, 4]],
    ['NH3 + O2 -> NO + H2O', [4, 5, 4, 6]],
    ['KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', [2, 16, 2, 2, 8, 5]],
    ['CuSO4.5H2O -> CuSO4 + H2O', [1, 1, 5]],
    ['KAl(SO4)2·12H2O -> KAl(SO4)2 + H2O', [1, 1, 12]],
    ['Ca(HCO3)2 -> CaCO3 + CO2 + H2O', [1, 1, 1, 1]],
    ['Fe2O3 + CO -> Fe + CO2', [1, 3, 2, 3]],
    ['P4 + O2 -> P4O10', [1, 5, 1]],
    ['Ag2O -> Ag + O2', [2, 4, 1]],
    /* redox half-equations: charge balances too */
    ['Fe2+ -> Fe3+ + e-', [1, 1, 1]],
    ['2H+ + 2e- -> H2', [2, 2, 1]],
    ['MnO4- + H+ + e- -> Mn2+ + H2O', [1, 8, 5, 1, 4]],
    ['Cr2O72- + H+ + e- -> Cr3+ + H2O', [1, 14, 6, 2, 7]],
    ['MnO4- + Fe2+ + H+ -> Mn2+ + Fe3+ + H2O', [1, 5, 8, 1, 5, 4]],
    ['Zn + Cu2+ -> Zn2+ + Cu', [1, 1, 1, 1]],
  ];

  test('every coefficient is the textbook one', async () => {
    const got = await run((list) => list.map((c) => {
      const r = window.ME.balance.balance(c[0]);
      return r.ok ? { c: r.coefficients, text: r.text } : { error: r.error, kind: r.kind };
    }), EQ);
    EQ.forEach((c, i) => {
      const g = got[i];
      assert.ok(!g.error, `${c[0]} did not balance: ${g.error}`);
      assert.deepEqual(g.c, c[1], `${c[0]} gave ${JSON.stringify(g.c)} (${g.text}), expected ${JSON.stringify(c[1])}`);
    });
  });

  test('every balanced equation passes its own atom tally and mass check', async () => {
    const bad = await run((list) => {
      const out = [];
      list.forEach((c) => {
        const r = window.ME.balance.balance(c[0]);
        if (!r.ok) { out.push([c[0], 'did not balance']); return; }
        r.tally.forEach((t) => { if (!t.ok) out.push([c[0], t.element, t.left, t.right]); });
        if (!r.mass.ok) out.push([c[0], 'mass', r.mass.left, r.mass.right]);
      });
      return out;
    }, EQ);
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 6)));
  });

  test('coefficients are always the smallest whole numbers', async () => {
    const bad = await run((list) => list
      .map((c) => {
        const r = window.ME.balance.balance(c[0]);
        if (!r.ok) return null;
        const f = window.ME.balance.smallestFactor(r.coefficients);
        return f > 1 ? [c[0], r.text, f] : null;
      }).filter(Boolean), EQ);
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('the formulas come back spelled the way they were typed', async () => {
    /* Hill order is right and unreadable: NaOH is HNaO, Ca(OH)2 is CaH2O2. */
    const got = await run(() => [
      window.ME.balance.balance('NaOH + H2SO4 -> Na2SO4 + H2O').text,
      window.ME.balance.balance('Al + CuSO4 -> Al2(SO4)3 + Cu').text,
      window.ME.balance.balance('Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O').text,
    ]);
    assert.equal(got[0], '2NaOH + H2SO4 → Na2SO4 + 2H2O');
    assert.equal(got[1], '2Al + 3CuSO4 → Al2(SO4)3 + 3Cu');
    assert.equal(got[2], '3Ca(OH)2 + 2H3PO4 → Ca3(PO4)2 + 6H2O');
  });

  test('a plus sign that is a charge is not mistaken for a separator', async () => {
    const got = await run(() => ({
      spaced: window.ME.balance.splitSide('MnO4- + Fe2+ + H+'),
      tight: window.ME.balance.splitSide('H2+O2'),
      single: window.ME.balance.splitSide('Fe2+'),
      doubled: window.ME.balance.splitSide('Ca++'),
    }));
    assert.deepEqual(got.spaced, ['MnO4-', 'Fe2+', 'H+']);
    assert.deepEqual(got.tight, ['H2', 'O2']);
    assert.deepEqual(got.single, ['Fe2+']);
    assert.deepEqual(got.doubled, ['Ca++']);
  });

  test('every arrow spelling works', async () => {
    const got = await run(() => ['->', '=', '=>', '-->', '==>', '→', '⇒', '⇌', '<=>']
      .map((a) => {
        const r = window.ME.balance.balance('H2 ' + a + ' H2');
        return r.ok;
      }));
    assert.deepEqual(got, got.map(() => true), 'some arrow spellings failed');
  });

  test('an anion right before the arrow does not swallow it', async () => {
    const r = await run(() => window.ME.balance.balance('MnO4- -> MnO4-').ok);
    assert.equal(r, true);
  });

  test('an equation that cannot balance says why, in plain words', async () => {
    const got = await run(() => ['CH4 + O2 -> CO2', 'Na + Cl2 -> NaBr', 'H2O -> He'].map((e) => {
      const r = window.ME.balance.balance(e);
      return { ok: r.ok, kind: r.kind, error: r.error };
    }));
    got.forEach((g) => {
      assert.equal(g.ok, false);
      assert.equal(g.kind, 'impossible');
      assert.match(g.error, /appears only on the (left|right)|cannot be made to match/);
    });
  });

  test('an equation with several valid balancings says so instead of picking one', async () => {
    const r = await run(() => {
      const x = window.ME.balance.balance('C + O2 -> CO + CO2');
      return { ok: x.ok, kind: x.kind, choices: x.choices, error: x.error };
    });
    assert.equal(r.ok, false);
    assert.equal(r.kind, 'ambiguous');
    assert.ok(r.choices >= 2);
    assert.match(r.error, /more than one valid set/);
  });

  test('no arrow at all is a friendly message, not a crash', async () => {
    const r = await run(() => window.ME.balance.balance('H2O + CO2'));
    assert.equal(r.ok, false);
    assert.match(r.error, /arrow/);
  });

  test('reaction types are identified with a reason', async () => {
    const CASES = [
      ['CH4 + O2 -> CO2 + H2O', 'combustion'],
      ['N2 + H2 -> NH3', 'synthesis'],
      ['H2O -> H2 + O2', 'decomposition'],
      ['Zn + HCl -> ZnCl2 + H2', 'single'],
      ['AgNO3 + NaCl -> AgCl + NaNO3', 'double'],
      ['NaOH + HCl -> NaCl + H2O', 'double'],
      ['H2 -> H2', 'none'],
    ];
    const got = await run((list) => list.map((c) => {
      const r = window.ME.balance.balance(c[0]);
      return r.ok ? { key: r.type.key, why: r.type.why } : { error: r.error };
    }), CASES);
    CASES.forEach((c, i) => {
      assert.ok(!got[i].error, c[0] + ': ' + got[i].error);
      assert.equal(got[i].key, c[1], `${c[0]} classified as ${got[i].key}`);
      assert.ok(got[i].why.length > 30, c[0] + ' needs a real reason');
    });
  });

  test('the walkthrough covers every element and ends with the answer', async () => {
    const got = await run(() => {
      const r = window.ME.balance.balance('C3H8 + O2 -> CO2 + H2O');
      const steps = window.ME.balance.explain(r);
      return {
        count: steps.length,
        elements: steps.filter((s) => s.element).map((s) => s.element),
        last: steps[steps.length - 1].result,
        first: steps[0].body,
      };
    });
    assert.deepEqual(got.elements, ['C', 'H', 'O'], 'carbon first, H and O last: ' + got.elements);
    assert.equal(got.last, 'C3H8 + 5O2 → 3CO2 + 4H2O');
    assert.match(got.first, /never what they are|subscript/);
  });

  test('the try-it-yourself hint names the element that is out', async () => {
    const got = await run(() => {
      const r = window.ME.balance.balance('CH4 + O2 -> CO2 + H2O');
      return {
        wrong: window.ME.balance.hint(r, [1, 1, 1, 1]),
        right: window.ME.balance.hint(r, [1, 2, 1, 2]),
        multiple: window.ME.balance.hint(r, [2, 4, 2, 4]),
      };
    });
    assert.equal(got.wrong.done, false);
    assert.match(got.wrong.message, /hydrogen|oxygen/);
    assert.equal(got.right.done, true);
    assert.equal(got.multiple.done, false);
    assert.match(got.multiple.message, /factor of 2/);
  });
});

/* ------------------------------------------------------------ answer checking */
describe('grading a typed answer', () => {
  test('accepts the right value, in any accepted unit', async () => {
    const got = await run(() => {
      const F = window.ME.fmt;
      const want = { value: 2.5, unit: 'L' };
      return {
        plain: F.checkAnswer('2.5', want).ok,
        withUnit: F.checkAnswer('2.5 L', want).ok,
        other: F.checkAnswer('2500 mL', want).ok,
        sci: F.checkAnswer('2.5e0 L', want).ok,
        wrongDim: F.checkAnswer('2.5 atm', want),
        wrong: F.checkAnswer('4.0', want).ok,
      };
    });
    assert.equal(got.plain, true);
    assert.equal(got.withUnit, true);
    assert.equal(got.other, true, 'should accept the same quantity in another unit');
    assert.equal(got.sci, true);
    assert.equal(got.wrongDim.ok, false);
    assert.match(got.wrongDim.why, /pressure/);
    assert.equal(got.wrong, false);
  });

  test('names the two mistakes people actually make', async () => {
    const got = await run(() => {
      const F = window.ME.fmt;
      return {
        tenfold: F.checkAnswer('25', { value: 2.5 }).why,
        inverted: F.checkAnswer('0.4', { value: 2.5 }).why,
      };
    });
    assert.match(got.tenfold, /factor of 10|decimal/);
    assert.match(got.inverted, /upside down|divided/);
  });

  test('checks significant figures when the lesson asks it to', async () => {
    const got = await run(() => {
      const F = window.ME.fmt;
      const want = { value: 18.02, sig: 4, tol: 0.01 };
      return {
        right: F.checkAnswer('18.02', want),
        tooFew: F.checkAnswer('18', want),
        valueWrong: F.checkAnswer('25', want),
      };
    });
    assert.equal(got.right.ok, true);
    assert.equal(got.tooFew.ok, false);
    assert.equal(got.tooFew.closeButPrecision, true);
    assert.match(got.tooFew.why, /significant figure/);
    assert.equal(got.valueWrong.ok, false);
    assert.ok(!got.valueWrong.closeButPrecision, 'a wrong value is not a precision problem');
  });

  test('insists on a unit when the lesson requires one', async () => {
    const got = await run(() => window.ME.fmt.checkAnswer('2.5',
      { value: 2.5, unit: 'L', unitRequired: true }));
    assert.equal(got.ok, false);
    assert.match(got.why, /needs its unit/);
  });

  test('gibberish gets a helpful message, not a crash', async () => {
    const got = await run(() => ['', 'banana', '??', 'L'].map((x) =>
      window.ME.fmt.checkAnswer(x, { value: 1 })));
    got.forEach((g) => {
      assert.equal(g.ok, false);
      assert.ok(g.why.length > 10);
    });
  });
});

/* ---------------------------------------------------------- reference data */
describe('reference data', () => {
  test('the polyatomic ion table loaded, verified at build time', async () => {
    const got = await run(() => ({
      count: window.ME.ref.ions.length,
      noNote: window.ME.ref.ions.filter((i) => !i.note).map((i) => i.n),
      noCid: window.ME.ref.ions.filter((i) => !i.cid).map((i) => i.n),
    }));
    assert.ok(got.count >= 30, 'only ' + got.count + ' ions');
    assert.deepEqual(got.noNote, [], 'ions with no explanation: ' + got.noNote);
    assert.deepEqual(got.noCid, [], 'ions with no PubChem record: ' + got.noCid);
  });

  test('every ion in the table parses, and its charge matches', async () => {
    const bad = await run(() => window.ME.ref.ions.map((ion) => {
      const p = window.ME.formula.parse(ion.f);
      if (!p.ok) return [ion.n, ion.f, p.error];
      const found = window.ME.ref.ionByFormula(ion.f, ion.c);
      if (!found || found.n !== ion.n) return [ion.n, 'not findable by formula and charge'];
      if (window.ME.ref.ionByName(ion.n) !== ion) return [ion.n, 'not findable by name'];
      return null;
    }).filter(Boolean));
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('ions are findable by their everyday names too', async () => {
    const got = await run(() => ({
      bicarbonate: (window.ME.ref.ionByName('bicarbonate') || {}).n,
      bleach: (window.ME.ref.ionByName('bleach') || {}).n,
      ethanoate: (window.ME.ref.ionByName('ethanoate') || {}).n,
      bisulfate: (window.ME.ref.ionByName('bisulfate') || {}).n,
    }));
    assert.equal(got.bicarbonate, 'Hydrogen carbonate');
    assert.equal(got.bleach, 'Hypochlorite');
    assert.equal(got.ethanoate, 'Acetate');
    assert.equal(got.bisulfate, 'Hydrogen sulfate');
  });

  test('monatomic ion charges are derived from the group, and come out right', async () => {
    /* The bug this pins: aluminium read as a variable-charge transition metal,
     * because PubChem's block for it is "post-transition metal" and a
     * substring test for "transition" matched. Al is always 3+. */
    const FIXED = {
      H: 1, Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1,
      Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2,
      Al: 3, Ga: 3, In: 3, Bi: 3,
      F: -1, Cl: -1, Br: -1, I: -1,
      O: -2, S: -2, Se: -2,
      N: -3, P: -3,
      He: 0, Ne: 0, Ar: 0, Kr: 0, Xe: 0,
      /* d-block metals with only one common charge, named without a numeral */
      Zn: 2, Cd: 2, Ag: 1, Sc: 3,
    };
    const VARIES = ['Fe', 'Cu', 'Cr', 'Mn', 'Ni', 'Co', 'Sn', 'Pb', 'Tl', 'C', 'Si', 'U', 'Ce', 'Ti', 'V'];
    const got = await run((arg) => {
      const R = window.ME.ref, out = { fixed: {}, varies: {} };
      Object.keys(arg.FIXED).forEach((s) => {
        const t = R.typicalCharge(s);
        out.fixed[s] = t ? { charge: t.charge, variable: !!t.variable, why: t.why } : null;
      });
      arg.VARIES.forEach((s) => {
        const t = R.typicalCharge(s);
        out.varies[s] = t ? { charge: t.charge, variable: !!t.variable } : null;
      });
      return out;
    }, { FIXED, VARIES });

    Object.keys(FIXED).forEach((s) => {
      const g = got.fixed[s];
      assert.ok(g, s + ' has no charge rule');
      assert.equal(g.charge, FIXED[s], `${s}: got ${g.charge}, expected ${FIXED[s]}`);
      assert.equal(g.variable, false, s + ' should not be variable');
      assert.ok(g.why && g.why.length > 20, s + ' needs a reason, got: ' + g.why);
    });
    VARIES.forEach((s) => {
      const g = got.varies[s];
      assert.ok(g, s + ' has no charge rule');
      assert.equal(g.variable, true, `${s} should take more than one charge, got ${g.charge}`);
    });
  });

  test('-ide names are right, including the irregular stems', async () => {
    const got = await run(() => {
      const out = {};
      ['Cl', 'O', 'N', 'S', 'P', 'F', 'Br', 'I', 'H', 'C', 'Se', 'Si', 'As'].forEach((s) => {
        out[s] = window.ME.ref.ideName(s);
      });
      return out;
    });
    assert.deepEqual(got, {
      Cl: 'chloride', O: 'oxide', N: 'nitride', S: 'sulfide', P: 'phosphide',
      F: 'fluoride', Br: 'bromide', I: 'iodide', H: 'hydride', C: 'carbide',
      Se: 'selenide', Si: 'silicide', As: 'arsenide',
    });
  });

  test('the activity series orders metals the way it should', async () => {
    const got = await run(() => {
      const R = window.ME.ref;
      return {
        znCu: R.moreReactive('Zn', 'Cu'), cuZn: R.moreReactive('Cu', 'Zn'),
        mgFe: R.moreReactive('Mg', 'Fe'), agAu: R.moreReactive('Ag', 'Au'),
        kNa: R.moreReactive('K', 'Na'),
        /* anything above hydrogen displaces it from an acid; copper does not */
        znH: R.moreReactive('Zn', 'H'), cuH: R.moreReactive('Cu', 'H'),
        unknown: R.moreReactive('Xx', 'Cu'),
      };
    });
    assert.equal(got.znCu, true);
    assert.equal(got.cuZn, false);
    assert.equal(got.mgFe, true);
    assert.equal(got.agAu, true);
    assert.equal(got.kNa, true);
    assert.equal(got.znH, true, 'zinc fizzes in acid');
    assert.equal(got.cuH, false, 'copper does not fizz in acid');
    assert.equal(got.unknown, null);
  });

  test('every literature table says where it came from', async () => {
    const got = await run(() => {
      const R = window.ME.ref;
      return [R.SOLUBILITY, R.ACTIVITY, R.STRONG_ACIDS, R.STRONG_BASES, R.SPECIFIC_HEAT, R.LATENT]
        .map((t) => !!(t.source && t.source.length > 20));
    });
    assert.deepEqual(got, got.map(() => true), 'a table with no stated source');
  });

  test('specific heats and latent heats are the standard values', async () => {
    const got = await run(() => ({
      water: window.ME.ref.SPECIFIC_HEAT.values['water (liquid)'],
      iron: window.ME.ref.SPECIFIC_HEAT.values.iron,
      fusion: window.ME.ref.LATENT.fusion,
      vap: window.ME.ref.LATENT.vaporisation,
    }));
    assert.equal(got.water, 4.184);
    assert.ok(Math.abs(got.iron - 0.449) < 0.01);
    assert.ok(Math.abs(got.fusion - 334) < 2);
    assert.ok(Math.abs(got.vap - 2257) < 5);
  });
});

/* --------------------------------------------------------------- naming */
describe('naming inorganic compounds', () => {
  const NAMES = [
    /* ionic, fixed-charge metal */
    ['NaCl', 'sodium chloride'], ['MgO', 'magnesium oxide'], ['CaCl2', 'calcium chloride'],
    ['Al2O3', 'aluminium oxide'], ['K2S', 'potassium sulfide'], ['Li3N', 'lithium nitride'],
    /* ionic, variable-charge metal: the Roman numeral is worked out */
    ['FeCl2', 'iron(II) chloride'], ['FeCl3', 'iron(III) chloride'],
    ['CuO', 'copper(II) oxide'], ['Cu2O', 'copper(I) oxide'],
    ['PbO2', 'lead(IV) oxide'], ['SnCl4', 'tin(IV) chloride'],
    ['Fe2(SO4)3', 'iron(III) sulfate'],
    /* d-block metals with one charge take no numeral */
    ['ZnO', 'zinc oxide'], ['AgCl', 'silver chloride'], ['CdS', 'cadmium sulfide'],
    /* polyatomic anions, and a polyatomic cation */
    ['CaSO4', 'calcium sulfate'], ['Na2CO3', 'sodium carbonate'],
    ['Mg(NO3)2', 'magnesium nitrate'], ['Ca3(PO4)2', 'calcium phosphate'],
    ['NaOH', 'sodium hydroxide'], ['NaHCO3', 'sodium hydrogen carbonate'],
    ['NH4Cl', 'ammonium chloride'], ['(NH4)2SO4', 'ammonium sulfate'],
    /* a metal inside the anion */
    ['KMnO4', 'potassium permanganate'], ['K2Cr2O7', 'potassium dichromate'],
    /* covalent, with prefixes */
    ['CO', 'carbon monoxide'], ['CO2', 'carbon dioxide'],
    ['N2O', 'dinitrogen monoxide'], ['NO2', 'nitrogen dioxide'],
    ['N2O5', 'dinitrogen pentoxide'], ['SF6', 'sulfur hexafluoride'],
    ['PCl5', 'phosphorus pentachloride'], ['CCl4', 'carbon tetrachloride'],
    /* acids */
    ['HCl', 'hydrochloric acid'], ['HBr', 'hydrobromic acid'], ['H2S', 'hydrosulfuric acid'],
    ['HNO3', 'nitric acid'], ['HNO2', 'nitrous acid'],
    ['H2SO4', 'sulfuric acid'], ['H2SO3', 'sulfurous acid'],
    ['H3PO4', 'phosphoric acid'], ['H2CO3', 'carbonic acid'],
    ['HClO4', 'perchloric acid'], ['HClO', 'hypochlorous acid'],
    /* hydrates */
    ['CuSO4.5H2O', 'copper(II) sulfate pentahydrate'],
    ['Na2CO3.10H2O', 'sodium carbonate decahydrate'],
  ];

  test('every formula gets the right name', async () => {
    const got = await run((list) => list.map((c) => {
      const r = window.ME.naming.nameOf(c[0]);
      return r.ok ? r.name : 'FAILED: ' + r.error;
    }), NAMES);
    NAMES.forEach((c, i) => {
      /* the element table spells it aluminium; either spelling is the name */
      const norm = (x) => String(x).toLowerCase().replace(/aluminum/g, 'aluminium');
      assert.equal(norm(got[i]), norm(c[1]), `${c[0]}: got "${got[i]}", expected "${c[1]}"`);
    });
  });

  test('every name gives back a formula with the same atoms', async () => {
    const bad = await run((list) => {
      const out = [];
      list.forEach((c) => {
        const back = window.ME.naming.formulaOf(c[1]);
        if (!back.ok) { out.push([c[1], back.error]); return; }
        const a = window.ME.formula.parse(c[0]);
        const b = window.ME.formula.parse(back.formula);
        if (!b.ok) { out.push([c[1], back.formula, b.error]); return; }
        if (a.text !== b.text) out.push([c[1], 'wanted ' + a.text + ', got ' + b.text]);
      });
      return out;
    }, NAMES);
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('every name carries its reasoning, not just the answer', async () => {
    const bad = await run((list) => list.map((c) => {
      const r = window.ME.naming.nameOf(c[0]);
      if (!r.ok || !r.steps || !r.steps.length) return [c[0], 'no steps'];
      const thin = r.steps.filter((s) => !s.text || s.text.length < 25);
      return thin.length ? [c[0], 'a step with no explanation'] : null;
    }).filter(Boolean), NAMES);
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('the Roman numeral is derived from charge balance, and explained', async () => {
    const got = await run(() => {
      const r = window.ME.naming.nameOf('Fe2(SO4)3');
      return { name: r.name, charge: r.cation.charge, why: r.steps[0].text };
    });
    assert.equal(got.name, 'iron(III) sulfate');
    assert.equal(got.charge, 3);
    /* the reasoning has to show the cancellation, not just assert the answer */
    assert.match(got.why, /no overall charge|neutral/);
    assert.match(got.why, /-6|6/);
  });

  test('criss-crossing is explained as the lowest common multiple', async () => {
    const got = await run(() => window.ME.naming.formulaOf('aluminium oxide'));
    assert.equal(got.formula, 'Al2O3');
    assert.ok(got.steps.some((s) => /criss-cross/.test(s)), JSON.stringify(got.steps));
    assert.ok(got.steps.some((s) => /smallest number that/.test(s)), JSON.stringify(got.steps));
  });

  test('a variable metal with no Roman numeral is refused, helpfully', async () => {
    const got = await run(() => ['iron chloride', 'copper oxide', 'lead oxide']
      .map((n) => window.ME.naming.formulaOf(n)));
    got.forEach((g) => {
      assert.equal(g.ok, false);
      assert.match(g.error, /Roman numeral/);
    });
  });

  test('a polyatomic ion gets brackets when there is more than one of it', async () => {
    const got = await run(() => ['magnesium nitrate', 'calcium phosphate', 'ammonium sulfate',
      'sodium nitrate', 'sulfuric acid']
      .map((n) => window.ME.naming.formulaOf(n).formula));
    assert.deepEqual(got, ['Mg(NO3)2', 'Ca3(PO4)2', '(NH4)2SO4', 'NaNO3', 'H2SO4']);
  });

  test('organic compounds are declined rather than guessed at', async () => {
    const got = await run(() => ['C6H12O6', 'CH3CH2OH', 'C8H10N4O2']
      .map((f) => window.ME.naming.nameOf(f)));
    got.forEach((g) => {
      if (g.ok) assert.notMatch(g.name, /^[a-z]*ane|ol$/, 'should not attempt an organic name: ' + g.name);
      else assert.match(g.error, /organic|does not fit/);
    });
  });
});

/* ------------------------------------------------------- practice problems */
describe('generated practice problems', () => {
  test('every generator makes a valid problem, every time', async () => {
    /* 200 runs each, and the check is structural: a question with no text, an
     * answer that is not a number, or a multiple choice without exactly one
     * right option would all put a broken problem in front of a reader. */
    const problems = await run(() => window.ME.practice.selfTest(200));
    assert.deepEqual(problems, [], JSON.stringify(problems.slice(0, 8)));
  });

  test('there is a generator for everything the course needs to drill', async () => {
    const keys = await run(() => window.ME.practice.keys);
    ['molar-mass', 'grams-moles', 'balance', 'formula-to-name', 'name-to-formula',
     'stoichiometry', 'limiting', 'gas-law', 'dilution', 'ph', 'heat',
     'unit-conversion', 'sigfigs', 'percent-composition', 'empirical', 'molarity']
      .forEach((k) => assert.ok(keys.indexOf(k) >= 0, 'missing generator: ' + k));
  });

  test('a generated answer can be recomputed independently and matches', async () => {
    /* The engine produced the answer; here it is checked a second way, from
     * the numbers printed in the question itself. If a generator ever wrote a
     * question that does not match its own answer, this catches it. */
    const bad = await run(() => {
      const out = [];
      const F = window.ME.fmt;
      for (let i = 1; i <= 150; i++) {
        const p = window.ME.practice.generate('gas-law', i * 104729);
        if (!p) { out.push('gas-law returned nothing'); continue; }
        const grab = (re) => { const m = p.q.match(re); return m ? parseFloat(m[1]) : null; };
        const unit = (re) => { const m = p.q.match(re); return m ? m[1] : null; };
        const si = {};
        const P = grab(/P = ([\d.]+) (?:atm|kPa|mmHg)/);
        if (P !== null) si.P = F.convert(P, unit(/P = [\d.]+ (atm|kPa|mmHg)/), 'Pa');
        const V = grab(/V = ([\d.]+) L/);
        if (V !== null) si.V = V / 1000;
        const n = grab(/n = ([\d.]+) mol/);
        if (n !== null) si.n = n;
        const T = grab(/T = ([\d.-]+) (?:K|°C)/);
        if (T !== null) si.T = unit(/T = [\d.-]+ (K|°C)/) === 'K' ? T : F.convert(T, 'C', 'K');
        const missing = ['P', 'V', 'n', 'T'].filter((k) => si[k] === undefined);
        if (missing.length !== 1) { out.push('question gave ' + (4 - missing.length) + ' of the four'); continue; }
        const k = missing[0];
        const mine = window.ME.gas.solveSI(si, k);
        const base = k === 'T' ? 'K' : window.ME.gas.baseOf({ P: 'pressure', V: 'volume', n: 'amount' }[k]);
        const inAsked = F.convert(mine, base, p.unit === 'mol' ? 'mol' : p.unit);
        if (Math.abs(inAsked - p.answer) > Math.abs(p.answer) * 1e-6) {
          out.push(k + ': question implies ' + inAsked + ', answer says ' + p.answer);
        }
        /* and the state has to be one a reader could actually meet */
        if (si.T < 150 || si.T > 700) out.push('unphysical temperature ' + si.T);
      }
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 5)));
  });

  test('a generated molar mass matches the engine to six figures', async () => {
    const bad = await run(() => {
      const out = [];
      for (let i = 1; i <= 200; i++) {
        const p = window.ME.practice.generate('molar-mass', i * 7919);
        /* the formula may carry a charge, as an ion from the database does */
        const m = p.q.match(/,\s*([A-Za-z0-9()·.^+-]+)\?$/);
        if (!m) { out.push('no formula in: ' + p.q); continue; }
        const mine = window.ME.formula.parse(m[1]);
        if (!mine.ok) { out.push('unparseable formula in question: ' + m[1]); continue; }
        if (Math.abs(mine.mass - p.answer) > 1e-6) out.push(m[1] + ': ' + mine.mass + ' vs ' + p.answer);
      }
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 5)));
  });

  test('generated naming problems use compounds whose names round-trip', async () => {
    const bad = await run(() => {
      const out = [];
      for (let i = 1; i <= 150; i++) {
        const p = window.ME.practice.generate('name-to-formula', i * 31337);
        if (!p) { out.push('nothing generated'); continue; }
        const back = window.ME.naming.formulaOf(p.q.replace(/^Write the formula for /, '').replace(/\.$/, ''));
        if (!back.ok) { out.push('name does not read back: ' + p.q); continue; }
        const a = window.ME.formula.parse(back.formula);
        const b = window.ME.formula.parse(p.answer);
        if (!a.ok || !b.ok || a.text !== b.text) out.push(p.q + ' -> ' + back.formula + ' vs ' + p.answer);
      }
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 5)));
  });

  /* The numbers printed in a lesson's worked examples are written by hand, so
   * they can drift away from what the engine computes without anything
   * complaining. These are the ones Unit 9 shows the reader. */
  test('the worked examples in the mole unit still match the engine', async () => {
    const got = await run(() => {
      const M = (f) => window.ME.formula.parse(f).mass;
      const s = window.ME.stoich.massToMass('CH4 + 2 O2 -> CO2 + 2 H2O', 'CH4', 100, 'CO2');
      const lim = window.ME.stoich.limiting('2 H2 + O2 -> 2 H2O',
        [{ name: 'H2', grams: 10 }, { name: 'O2', grams: 10 }]);
      return {
        caNO3: M('Ca(NO3)2'), caOH: M('Ca(OH)2'), h2so4: M('H2SO4'), al2so43: M('Al2(SO4)3'),
        oPercent: 6 * 15.999 / M('Ca(NO3)2') * 100,
        waterMoles: 25 / M('H2O'),
        naclHalf: 0.5 * M('NaCl'),
        co2Grams: s.grams, ch4Moles: s.molesFrom,
        limiting: lim.limiting.name,
        waterGrams: lim.products[0].grams,
        leftoverName: lim.leftovers[0].name, leftoverGrams: lim.leftovers[0].grams,
        propeneMultiplier: 42.08 / M('CH2'),
      };
    });
    const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, what + ': engine says ' + a + ', the lesson prints ' + b);
    near(got.caNO3, 164.088, 0.002, 'Ca(NO3)2 molar mass');
    near(got.caOH, 74.09, 0.01, 'Ca(OH)2 molar mass');
    near(got.h2so4, 98.08, 0.01, 'H2SO4 molar mass');
    near(got.al2so43, 342.16, 0.01, 'Al2(SO4)3 molar mass');
    near(got.oPercent, 58.5, 0.05, 'oxygen percentage in calcium nitrate');
    near(got.waterMoles, 1.388, 0.001, '25 g of water in moles');
    near(got.naclHalf, 29.22, 0.01, 'half a mole of NaCl');
    near(got.co2Grams, 274, 0.5, 'CO2 from 100 g of methane');
    near(got.ch4Moles, 6.23, 0.01, 'moles in 100 g of methane');
    assert.equal(got.limiting, 'O2', 'the limiting reactant in the 10 g / 10 g example');
    near(got.waterGrams, 11.26, 0.01, 'water produced in the limiting example');
    assert.equal(got.leftoverName, 'H2');
    near(got.leftoverGrams, 8.74, 0.01, 'hydrogen left over');
    near(got.propeneMultiplier, 3, 0.01, 'the CH2 to C3H6 multiplier');
  });

  test('the worked examples in the gas unit still match the engine', async () => {
    const got = await run(() => {
      const g = window.ME.gas, F = window.ME.fmt;
      return {
        rAtmL: F.gasConstant('atm', 'L', 'mol'),
        rKPaL: F.gasConstant('kPa', 'L', 'mol'),
        rMmHgL: F.gasConstant('mmHg', 'L', 'mol'),
        molarVolume: F.CONST.molarVolumeSTP,
        cubeSide: Math.cbrt(F.CONST.molarVolumeSTP / 1000) * 100,
        charles: g.combined({ P: 1, V: 3, n: 1, T: 300.15 }, { P: 1, n: 1, T: 400.15 }, 'V'),
        celsiusTrap: 3 * 127 / 27,
        boyle: g.combined({ P: 1, V: 2, n: 1, T: 300 }, { V: 0.5, n: 1, T: 300 }, 'P'),
        rmsH2: g.rmsSpeed(298, 'H2'),
        rmsSF6: g.rmsSpeed(298, 'SF6'),
        ch4Moles: 32 / window.ME.formula.parse('CH4').mass,
      };
    });
    const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, what + ': engine says ' + a + ', the lesson prints ' + b);
    near(got.rAtmL, 0.08206, 0.00001, 'R in L atm');
    near(got.rKPaL, 8.314, 0.001, 'R in L kPa');
    near(got.rMmHgL, 62.36, 0.01, 'R in L mmHg');
    near(got.molarVolume, 22.4, 0.02, 'molar volume at STP');
    near(got.cubeSide, 28, 0.5, 'the side of a 22.4 L cube, in cm');
    near(got.charles, 4.00, 0.01, 'Charles: 3.0 L from 27 to 127 C');
    near(got.celsiusTrap, 14.1, 0.05, 'what using Celsius would have given');
    near(got.boyle, 4.0, 0.01, 'Boyle: 2.0 L at 1 atm squeezed to 0.5 L');
    near(got.rmsH2, 1900, 50, 'hydrogen rms speed at room temperature');
    near(got.rmsSF6, 225, 5, 'SF6 rms speed at room temperature');
    near(got.ch4Moles, 2.00, 0.01, 'moles in 32 g of methane');
  });
});

/* ---------------------------------------------------- prose with formulas in */
describe('rendering formulas inside teaching prose', () => {
  /* Every lesson page, question, table and worked example goes through
   * chemHTML, so a rule that is too eager silently mangles the whole course.
   * The first table is what must be marked up; the second is what must not. */
  const MARKED = [
    ['H2O', 'H<sub>2</sub>O'],
    ['CO2 drifts out of a fizzy drink', 'CO<sub>2</sub> drifts out of a fizzy drink'],
    ['Ca(OH)2', 'Ca(OH)<sub>2</sub>'],
    ['(NH4)2SO4', '(NH<sub>4</sub>)<sub>2</sub>SO<sub>4</sub>'],
    ['Na+', 'Na<sup>+</sup>'],
    ['Cl-', 'Cl<sup>-</sup>'],
    ['OH-', 'OH<sup>-</sup>'],
    ['SO42-', 'SO<sub>42</sub><sup>-</sup>'],
    ['MnO4- is purple', 'MnO<sub>4</sub><sup>-</sup> is purple'],
    ['an electron, e-, on its own', 'an electron, e<sup>-</sup>, on its own'],
    ['a 2+ charge', 'a 2<sup>+</sup> charge'],
  ];
  const LEFT_ALONE = [
    /* decimals and measurements: the old rule made this 109 with a subscript 5 */
    '109.5 degrees', '104.5', '35.45', 'melts at 801 C', 'about 3550 C',
    /* arithmetic: the old rule superscripted this plus */
    '2 + 6 = 8', '24 - 16 = 8 electrons shared', 'R = 8.314',
    /* ordinary numbers after a space */
    'period 3', 'group 17', 'level 2 holds 8', 'in 1869 Mendeleev',
    /* hyphenated words, ranges and dates */
    'self-contained', 'cis-trans', 'X-ray', 'pre- and post-reaction',
    'one- or two-electron', 'T-shaped', '20-30 kJ', 'the 1909 result',
  ];

  test('marks up what is a formula', async () => {
    const got = await run((cs) => cs.map((c) => window.ME.chemHTML(c[0])), MARKED);
    got.forEach((g, i) => assert.equal(g, MARKED[i][1], JSON.stringify(MARKED[i][0])));
  });

  test('leaves ordinary prose, arithmetic and hyphens alone', async () => {
    const got = await run((cs) => cs.map((c) => window.ME.chemHTML(c)), LEFT_ALONE);
    got.forEach((g, i) => assert.equal(g, LEFT_ALONE[i], 'changed: ' + LEFT_ALONE[i] + ' -> ' + g));
  });

  test('still escapes, so lesson text cannot inject markup', async () => {
    const got = await run(() => window.ME.chemHTML('<img src=x onerror=1> & "quoted"'));
    assert.ok(got.indexOf('<img') < 0, got);
    assert.ok(got.indexOf('&lt;img') >= 0, got);
    assert.ok(got.indexOf('&amp;') >= 0, got);
  });

  test('the formula-only renderer is unchanged, since every digit there is a subscript', async () => {
    const got = await run(() => [window.ME.formulaHTML('H2SO4'), window.ME.formulaHTML('Ca(OH)2')]);
    assert.equal(got[0], 'H<sub>2</sub>SO<sub>4</sub>');
    assert.equal(got[1], 'Ca(OH)<sub>2</sub>');
  });
});

/* -------------------------------------------------------- Lewis and VSEPR */
describe('Lewis structures and shapes', () => {
  /* Every one of these has a settled textbook answer, so the table is an
   * independent check rather than a copy of what the code happens to do. */
  const CASES = [
    /* formula,   central, bond orders, lone pairs on central, shape, angle, polar */
    ['CH4',   'C', '1111',   0, 'tetrahedral',           109.5, false],
    ['NH3',   'N', '111',    1, 'trigonal pyramidal',    107,   true],
    ['H2O',   'O', '11',     2, 'bent',                  104.5, true],
    ['CO2',   'C', '22',     0, 'linear',                180,   false],
    ['SO2',   'S', '21',     1, 'bent',                  118,   true],
    ['SO3',   'S', '211',    0, 'trigonal planar',       120,   false],
    ['CH2O',  'C', '112',    0, 'trigonal planar',       120,   true],
    ['CCl4',  'C', '1111',   0, 'tetrahedral',           109.5, false],
    ['NF3',   'N', '111',    1, 'trigonal pyramidal',    107,   true],
    ['H2S',   'S', '11',     2, 'bent',                  104.5, true],
    ['PH3',   'P', '111',    1, 'trigonal pyramidal',    107,   true],
    ['OF2',   'O', '11',     2, 'bent',                  104.5, true],
    ['SiCl4', 'Si', '1111',  0, 'tetrahedral',           109.5, false],
    /* the electron-deficient pair, which the plain octet rule gets wrong */
    ['BF3',   'B', '111',    0, 'trigonal planar',       120,   false],
    ['BeCl2', 'Be', '11',    0, 'linear',                180,   false],
    /* expanded octets */
    ['PCl5',  'P', '11111',  0, 'trigonal bipyramidal',  120,   false],
    ['SF6',   'S', '111111', 0, 'octahedral',            90,    false],
    ['SF4',   'S', '1111',   1, 'seesaw',                90,    true],
    ['ClF3',  'Cl', '111',   2, 'T-shaped',              90,    true],
    ['XeF4',  'Xe', '1111',  2, 'square planar',         90,    false],
    ['XeF2',  'Xe', '11',    3, 'linear',                180,   false],
    /* ions */
    ['NH4+',  'N', '1111',   0, 'tetrahedral',           109.5, false],
    ['H3O+',  'O', '111',    1, 'trigonal pyramidal',    107,   true],
    ['CO3 2-', 'C', '211',   0, 'trigonal planar',       120,   false],
    ['NO3-',  'N', '211',    0, 'trigonal planar',       120,   false],
    ['SO4 2-', 'S', '1111',  0, 'tetrahedral',           109.5, false],
    ['PO4 3-', 'P', '1111',  0, 'tetrahedral',           109.5, false],
  ];

  test('come out right for the molecules a course actually draws', async () => {
    const got = await run((cs) => cs.map((c) => {
      const r = window.ME.lewis.fromFormula(c[0]);
      if (!r.ok) return [c[0], 'refused: ' + r.why];
      return [c[0], r.central, r.order.join(''), r.centralLone, r.shape, r.angle, r.polar];
    }), CASES);
    got.forEach((g, i) => {
      assert.deepEqual(g, CASES[i], CASES[i][0] + ': got ' + JSON.stringify(g));
    });
  });

  test('the electron count always balances', async () => {
    const bad = await run((cs) => {
      const out = [];
      cs.forEach((c) => {
        const r = window.ME.lewis.fromFormula(c[0]);
        if (!r.ok) { out.push([c[0], r.why]); return; }
        /* Every available electron is either in a bond or in a lone pair. */
        const inBonds = r.order.reduce((a, b) => a + b, 0) * 2;
        const inLone = (r.centralLone + r.terminalLone.reduce((a, b) => a + b, 0)) * 2;
        if (inBonds + inLone !== r.available) out.push([c[0], inBonds + ' + ' + inLone + ' != ' + r.available]);
        /* And the valence count is the group number, summed. */
        let sum = window.ME.lewis.valenceOf(r.central);
        r.terminals.forEach((t) => { sum += window.ME.lewis.valenceOf(t); });
        if (sum - r.charge !== r.available) out.push([c[0], 'valence sum ' + sum + ' with charge ' + r.charge + ' != ' + r.available]);
      });
      return out;
    }, CASES);
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('formal charges add up to the charge on the species', async () => {
    const bad = await run((cs) => {
      const out = [];
      cs.forEach((c) => {
        const r = window.ME.lewis.fromFormula(c[0]);
        if (r.ok && r.formalChargeSum !== r.charge) out.push([c[0], r.formalChargeSum, r.charge]);
      });
      return out;
    }, CASES);
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('refuses what the counting method cannot honestly do', async () => {
    const got = await run(() => ({
      /* Period 2 cannot expand, so there is no such molecule. */
      nf5: window.ME.lewis.fromFormula('NF5').ok,
      /* An odd electron count is a radical. */
      no: window.ME.lewis.fromFormula('NO').ok,
      /* A d-block metal does not follow group-number counting. */
      fecl3: window.ME.lewis.fromFormula('FeCl3').ok,
      whyNF5: window.ME.lewis.fromFormula('NF5').why,
      whyNO: window.ME.lewis.fromFormula('NO').why,
    }));
    assert.equal(got.nf5, false);
    assert.equal(got.no, false);
    assert.equal(got.fecl3, false);
    assert.match(got.whyNF5, /period 2|more than eight/i);
    assert.match(got.whyNO, /radical|odd/i);
  });

  test('spots the structures that need resonance', async () => {
    const got = await run(() => ({
      ozone: window.ME.lewis.fromFormula('O3').resonance,
      carbonate: window.ME.lewis.fromFormula('CO3 2-').resonance,
      nitrate: window.ME.lewis.fromFormula('NO3-').resonance,
      methane: window.ME.lewis.fromFormula('CH4').resonance,
      water: window.ME.lewis.fromFormula('H2O').resonance,
    }));
    /* Identical outer atoms but unequal bonds: the drawing has to pick one,
     * and the real molecule is the average. */
    assert.equal(got.ozone, true);
    assert.equal(got.carbonate, true);
    assert.equal(got.nitrate, true);
    assert.equal(got.methane, false);
    assert.equal(got.water, false);
  });

  test('every worked step it shows carries a real number', async () => {
    const bad = await run((cs) => {
      const out = [];
      cs.forEach((c) => {
        const r = window.ME.lewis.fromFormula(c[0]);
        if (!r.ok) return;
        if (r.steps.length < 4) out.push([c[0], 'only ' + r.steps.length + ' steps']);
        r.steps.forEach((s, i) => {
          if (!s.label || !s.value) out.push([c[0], i, 'step with no label or value']);
          if (/undefined|NaN/.test(s.label + s.detail + s.value)) out.push([c[0], i, s.value]);
        });
      });
      return out;
    }, CASES);
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });
});

/* ------------------------------------------------------------- the course */
describe('the course structure', () => {
  test('every lesson has a question, and every question a kind that exists', async () => {
    const bad = await run(() => {
      const out = [];
      const kinds = Object.keys(window.ME.quiz.KINDS);
      window.ME.course.allLessons().forEach((l) => {
        const qs = window.ME.course.questionsOf(l);
        if (!qs.length) out.push([l.id, 'no questions']);
        qs.forEach((q, i) => {
          if (kinds.indexOf(q.kind) < 0) out.push([l.id, i, 'unknown kind ' + q.kind]);
          if (!q.q || q.q.length < 8) out.push([l.id, i, 'no question text']);
        });
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 6)));
  });

  test('every multiple choice has exactly one right answer, and every option a reason', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.course.allLessons().forEach((l) => {
        window.ME.course.questionsOf(l).forEach((q, i) => {
          if (q.kind !== 'choice') return;
          const opts = q.optionsBuilder ? q.optionsBuilder() : q.options;
          const right = opts.filter((o) => o.ok).length;
          if (right !== 1) out.push([l.id, i, right + ' right options']);
          opts.forEach((o, j) => {
            if (!o.why || o.why.length < 20) out.push([l.id, i, j, 'option with no real explanation']);
          });
        });
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 6)));
  });

  test('every named practice generator actually exists', async () => {
    const bad = await run(() => {
      const keys = window.ME.practice.keys, out = [];
      window.ME.course.allLessons().forEach((l) => {
        if (!l.practice) return;
        (Array.isArray(l.practice) ? l.practice : [l.practice]).forEach((k) => {
          if (keys.indexOf(k) < 0) out.push([l.id, k]);
        });
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('every builds_on points at a lesson that exists', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.course.allLessons().forEach((l) => {
        (l.builds_on || []).forEach((id) => {
          if (!window.ME.course.lesson(id)) out.push([l.id, 'builds on missing lesson ' + id]);
        });
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('units are numbered without gaps or repeats', async () => {
    const ns = await run(() => window.ME.course.units.map((u) => u.n));
    const sorted = ns.slice().sort((a, b) => a - b);
    assert.deepEqual(ns, sorted, 'units are not in order: ' + ns);
    assert.equal(new Set(ns).size, ns.length, 'two units share a number: ' + ns);
  });

  test('a long-form lesson has the parts the format promises', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.course.allLessons().forEach((l) => {
        if (!l.pages) return;        /* the original twelve use the older format */
        if (!l.hook) out.push([l.id, 'no hook']);
        if (l.pages.length < 2) out.push([l.id, 'only one page']);
        if (!l.mistakes || l.mistakes.length < 2) out.push([l.id, 'no common-mistakes section']);
        if (!l.recap) out.push([l.id, 'no recap']);
        l.pages.forEach((pg, i) => { if (!pg.body) out.push([l.id, i, 'page with no body']); });
        (l.checkpoints || []).forEach((c, i) => {
          if (c.after === undefined) out.push([l.id, i, 'checkpoint with no page to sit after']);
          else if (c.after >= l.pages.length) out.push([l.id, i, 'checkpoint after a page that does not exist']);
        });
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 6)));
  });

  /* Structure checks cannot see a typo inside a page body, because a body is a
   * function nobody has called yet. So call all of them, for real, and let any
   * exception fail the build rather than the reader. */
  test('every page body, hook and recap actually renders', async () => {
    const bad = await run(() => {
      const out = [];
      const sink = document.createElement('div');
      sink.style.display = 'none';
      document.body.appendChild(sink);
      window.ME.course.allLessons().forEach((l) => {
        const parts = [];
        if (l.hook) parts.push(['hook', l.hook]);
        (l.pages || []).forEach((pg, i) => parts.push(['page ' + i, pg.body]));
        parts.forEach(([what, fn]) => {
          let node = null;
          try { node = fn(); } catch (e) { out.push([l.id, what, String(e && e.message || e)]); return; }
          if (!node || !node.nodeType) { out.push([l.id, what, 'returned nothing renderable']); return; }
          const probe = document.createElement('div');
          probe.appendChild(node);
          sink.appendChild(probe);
          const text = (probe.textContent || '').trim();
          if (text.length < 40) out.push([l.id, what, 'rendered only ' + text.length + ' characters']);
          /* An undefined slipping into a template shows up as the literal word. */
          if (/\bundefined\b|\[object Object\]|\bNaN\b/.test(text)) out.push([l.id, what, 'rendered a placeholder: ' + text.slice(0, 80)]);
        });
      });
      sink.remove();
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 6), null, 1));
  });

  /* Same argument for the questions: a kind renderer that throws on one
   * question's shape is invisible until somebody reaches that question. */
  test('every question renders through its own kind', async () => {
    const bad = await run(() => {
      const out = [];
      const sink = document.createElement('div');
      sink.style.display = 'none';
      document.body.appendChild(sink);
      window.ME.course.allLessons().forEach((l) => {
        window.ME.course.questionsOf(l).forEach((q, i) => {
          const body = document.createElement('div');
          sink.appendChild(body);
          try { window.ME.quiz.KINDS[q.kind](q, body, function () {}); }
          catch (e) { out.push([l.id, i, q.kind, String(e && e.message || e)]); return; }
          if (!body.childNodes.length) out.push([l.id, i, q.kind, 'rendered nothing']);
        });
      });
      sink.remove();
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 6), null, 1));
  });

  /* A lesson that hands the reader off to another tab is only useful if the
   * link lands somewhere. These are written by hand in the lesson text, so
   * they are exactly the kind of thing that rots silently. */
  test('every link a lesson offers points somewhere real', async () => {
    const bad = await run(() => {
      const out = [];
      const sink = document.createElement('div');
      sink.style.display = 'none';
      document.body.appendChild(sink);
      const seen = [];
      window.ME.course.allLessons().forEach((l) => {
        const parts = [];
        if (l.hook) parts.push(l.hook);
        (l.pages || []).forEach((pg) => parts.push(pg.body));
        parts.forEach((fn) => {
          let node;
          try { node = fn(); } catch (e) { return; }   /* the render test reports this */
          const probe = document.createElement('div');
          probe.appendChild(node);
          sink.appendChild(probe);
          Array.prototype.forEach.call(probe.querySelectorAll('[data-goto], a[href^="#/"], .ls-goto'), (n) => {
            const hash = n.dataset.goto || n.getAttribute('href') || '';
            if (hash) seen.push([l.id, hash]);
          });
        });
      });
      sink.remove();

      const views = ['learn', 'draw', 'elements', 'balancer', 'gas', 'tools', 'reference', 'gallery', 'search', 'm'];
      seen.forEach(([id, hash]) => {
        const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
        if (!parts.length) { out.push([id, hash, 'empty']); return; }
        if (views.indexOf(parts[0]) < 0) { out.push([id, hash, 'no such view']); return; }
        if (parts[0] === 'learn' && parts[1] && !window.ME.course.lesson(parts[1])) out.push([id, hash, 'no such lesson']);
        if (parts[0] === 'tools' && parts[1] && !window.ME.tools.TOOLS.some((t) => t.key === parts[1])) out.push([id, hash, 'no such tool']);
        if (parts[0] === 'elements' && parts[1] && !window.ME.chem.element(parts[1])) out.push([id, hash, 'no such element']);
        if (parts[0] === 'm' && parts[1]) {
          const key = decodeURIComponent(parts.slice(1).join('/'));
          const cid = /^cid:(\d+)$/.exec(key);
          const name = /^n:(.+)$/.exec(key);
          if (cid) {
            if (!window.ME.search.all().some((m) => String(m.cid) === cid[1])) out.push([id, hash, 'no molecule with that CID']);
          } else if (name) {
            if (!window.ME.search.get(name[1])) out.push([id, hash, 'no molecule with that name']);
          } else {
            out.push([id, hash, 'a molecule link must be cid: or n: — a bare slug reaches nothing offline']);
          }
        }
      });
      if (!seen.length) out.push(['none', '', 'no links found at all, so this test is checking nothing']);
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 8), null, 1));
  });
});
