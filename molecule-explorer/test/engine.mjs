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

  test('the worked examples in the acids unit still match the engine', async () => {
    const got = await run(() => {
      const S = window.ME.solution;
      return {
        ph1e3: S.pHfromH(1e-3).pH,
        pohAtPh2: S.HfrompH(2).pOH,
        stomachVsBlood: S.HfrompH(1.5).H / S.HfrompH(7.4).H,
        oceanRise: (S.HfrompH(8.1).H / S.HfrompH(8.2).H - 1) * 100,
        ph5e4: S.pHfromH(5e-4).pH,
        titration1: (0.0274 * 0.100) / 0.0250,
        titration2: (0.0250 * 0.200) / 0.0200,
        strongAcidCount: window.ME.ref.STRONG_ACIDS.list.length,
      };
    });
    const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, what + ': engine says ' + a + ', the lesson prints ' + b);
    near(got.ph1e3, 3, 0.001, 'pH of 1e-3 M');
    near(got.pohAtPh2, 12, 0.001, 'pOH at pH 2');
    /* "about eight hundred thousand times more acidic" */
    near(got.stomachVsBlood, 794000, 2000, 'stomach acid against blood');
    near(got.oceanRise, 26, 0.5, 'the ocean pH shift as a percentage rise in H+');
    near(got.ph5e4, 3.3, 0.01, 'the pH of 5e-4, estimated without a calculator');
    near(got.titration1, 0.110, 0.001, 'the first titration worked example');
    near(got.titration2, 0.250, 0.001, 'the second titration question');
    /* The lesson says six, and names them. */
    assert.equal(got.strongAcidCount, 6);
  });

  test('the worked examples in the thermochemistry unit still match the engine', async () => {
    const got = await run(() => {
      const S = window.ME.solution, R = window.ME.ref;
      const c = R.SPECIFIC_HEAT.values;
      const mix = S.mixTemperatures(
        { mass: 100, c: c.aluminium, T: 95 },
        { mass: 200, c: c['water (liquid)'], T: 20 });
      return {
        q250: S.heat(250, c['water (liquid)'], 80).q,
        q100: S.heat(100, c['water (liquid)'], 25).q,
        qAl: S.heat(50, c.aluminium, 40).q,
        kettleSeconds: S.heat(250, c['water (liquid)'], 80).q / 2000,
        table: [c['water (liquid)'], c.ethanol, c['air (dry)'], c.glass, c.aluminium, c.iron, c.lead],
        mixFinal: mix.finalT,
        mixImbalance: mix.imbalance,
        gibbsMelting: S.gibbs(6.01, 22.0, 273.15).deltaG,
      };
    });
    const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) < tol, what + ': engine says ' + a + ', the lesson prints ' + b);
    near(got.q250, 83680, 1, 'warming 250 g of water by 80 degrees');
    near(got.q100, 10460, 1, 'warming 100 g of water by 25 degrees');
    near(got.qAl, 1794, 1, 'warming 50 g of aluminium by 40 degrees');
    near(got.kettleSeconds, 42, 0.5, 'how long a 2 kW kettle takes');
    /* The specific-heat table the lesson prints, in its printed order. */
    assert.deepEqual(got.table, [4.184, 2.44, 1.005, 0.84, 0.897, 0.449, 0.128]);
    /* Calorimetry: energy in must equal energy out, to floating-point noise. */
    assert.ok(Math.abs(got.mixImbalance) < 1e-6, 'calorimetry does not conserve energy: ' + got.mixImbalance);
    near(got.mixFinal, 27.26, 0.01, 'the calorimeter simulation\u2019s default case');
    /* Ice melting: uphill in enthalpy, up in entropy, and balanced at 0 C —
     * which is the lesson's claim that a melting point is where dG crosses zero. */
    assert.ok(Math.abs(got.gibbsMelting) < 0.05, 'melting at 0 C should have dG near zero, got ' + got.gibbsMelting);
  });

  /* The isomer lessons quote boiling points, and the verified molecule
   * database does not carry them, so they live in one marked literature
   * table. This pins the numbers the lessons print and the fact that every
   * pair still makes its point in the right direction. */
  test('the organic boiling points the isomer lessons quote', async () => {
    const got = await run(() => {
      const v = window.ME.ref.ORGANIC_BP.values;
      return {
        values: v,
        source: window.ME.ref.ORGANIC_BP.source,
        formatted: window.ME.ref.boilingPoint('2-methylpropane'),
        missing: window.ME.ref.boilingPoint('nothing at all'),
      };
    });
    const v = got.values;
    assert.equal(v.butane, -0.5);
    assert.equal(v['2-methylpropane'], -11.7);
    assert.equal(v['propan-1-ol'], 97.2);
    assert.equal(v['propan-2-ol'], 82.6);
    assert.equal(v['cis-but-2-ene'], 3.7);
    assert.equal(v['trans-but-2-ene'], 0.9);
    /* The direction of every comparison the lessons make. */
    assert.ok(v.butane > v['2-methylpropane'], 'straight beats branched');
    assert.ok(v.pentane > v['2-methylbutane'], 'one branch lowers it');
    assert.ok(v['2-methylbutane'] > v['2,2-dimethylpropane'], 'two branches lower it further');
    assert.ok(v['propan-1-ol'] > v['propan-2-ol'], 'the end-carbon alcohol boils higher');
    assert.ok(v['cis-but-2-ene'] > v['trans-but-2-ene'], 'cis boils higher than trans');
    assert.ok(v.ethanol > v['dimethyl ether'], 'the alcohol hydrogen-bonds and the ether does not');
    /* It has to say it is literature data rather than verified. */
    assert.match(got.source, /literature/i);
    /* And the formatter uses a real minus sign, not a hyphen. */
    assert.match(got.formatted, /\u2212/);
    assert.equal(got.missing, null);
  });

  /* The organic reaction viewer builds its equation from the formulas its own
   * drawings report, so a typo in a SMILES string shows up as an unbalanced
   * equation rather than as a plausible-looking lie. This checks all four. */
  test('every organic reaction the sim draws actually balances', async () => {
    const got = await run(() => window.ME.sims.ORGANIC_REACTIONS.map((r) => {
      const f = (spec) => {
        try { return window.ME.chem.analyse(window.ME.chem.fromSmiles(spec.s)).formula; }
        catch (e) { return 'UNREADABLE(' + spec.s + ')'; }
      };
      const text = r.left.map(f).join(' + ') + ' -> ' + r.right.map(f).join(' + ');
      const bal = window.ME.balance.balance(text);
      return [r.key, bal.ok ? 'ok' : 'FAILED: ' + bal.error, text];
    }));
    const bad = got.filter((g) => g[1] !== 'ok');
    assert.deepEqual(bad, [], JSON.stringify(bad, null, 1));
    /* And the formulas are what the lessons claim they are. */
    const byKey = {};
    got.forEach((g) => { byKey[g[0]] = g[2]; });
    assert.equal(byKey.addition, 'C2H4 + HBr -> C2H5Br');
    assert.equal(byKey.substitution, 'C2H6 + Cl2 -> C2H5Cl + HCl');
    assert.equal(byKey.elimination, 'C2H6O -> C2H4 + H2O');
    assert.equal(byKey.combustion, 'CH4 + O2 -> CO2 + H2O');
  });
});

/* ------------------------- stoichiometry, gases, solutions and heat */
/* The spec for this course asked for tests on each of these by name. They are
 * exercised incidentally by the generated-problem and worked-example tests;
 * these are direct cases, chosen so every answer can be checked by hand. */
describe('the quantitative calculators, case by case', () => {
  test('stoichiometry: mass to mass through a balanced equation', async () => {
    const got = await run(() => {
      const S = window.ME.stoich;
      return {
        /* 2 H2 + O2 -> 2 H2O. 4.032 g of H2 is exactly 2 mol, which gives
         * 2 mol of water: 36.03 g. */
        water: S.massToMass('2 H2 + O2 -> 2 H2O', 'H2', 4.032, 'H2O').grams,
        /* N2 + 3 H2 -> 2 NH3. 28.014 g of N2 is 1 mol, giving 2 mol NH3. */
        ammonia: S.massToMass('N2 + 3 H2 -> 2 NH3', 'N2', 28.014, 'NH3').molesTo,
        /* The equation is balanced by the engine first, so an unbalanced
         * input still gives the right ratio. */
        unbalanced: S.massToMass('H2 + O2 -> H2O', 'H2', 4.032, 'H2O').grams,
        /* A substance that is not in the equation is refused rather than guessed. */
        refused: S.massToMass('2 H2 + O2 -> 2 H2O', 'CH4', 10, 'H2O').ok,
      };
    });
    assert.ok(Math.abs(got.water - 36.03) < 0.02, 'water from 2 mol of H2: ' + got.water);
    assert.ok(Math.abs(got.ammonia - 2) < 0.001, 'ammonia from 1 mol of N2: ' + got.ammonia);
    assert.ok(Math.abs(got.unbalanced - 36.03) < 0.02, 'balancing first: ' + got.unbalanced);
    assert.equal(got.refused, false);
  });

  test('limiting reactant and percent yield', async () => {
    const got = await run(() => {
      const S = window.ME.stoich;
      /* 2 mol H2 with 2 mol O2: the hydrogen runs out, because the equation
       * wants two of it per oxygen. */
      const lim = S.limiting('2 H2 + O2 -> 2 H2O',
        [{ name: 'H2', grams: 4.032 }, { name: 'O2', grams: 63.996 }]);
      return {
        limiting: lim.limiting.name,
        water: lim.products[0].grams,
        leftover: lim.leftovers[0],
        yield80: S.percentYield(32, 40).percent,
        over100: S.percentYield(42, 40).percent,
      };
    });
    assert.equal(got.limiting, 'H2');
    assert.ok(Math.abs(got.water - 36.03) < 0.02, 'water: ' + got.water);
    assert.equal(got.leftover.name, 'O2');
    assert.ok(Math.abs(got.yield80 - 80) < 0.01, 'percent yield: ' + got.yield80);
    /* Over 100 is arithmetic rather than an error, and the tool says what it means. */
    assert.ok(got.over100 > 100);
  });

  test('gas laws: each named law, and PV = nRT', async () => {
    const got = await run(() => {
      const g = window.ME.gas;
      return {
        /* Boyle: halve the volume, double the pressure. */
        boyle: g.combined({ P: 1, V: 4, n: 1, T: 300 }, { V: 2, n: 1, T: 300 }, 'P'),
        /* Charles: double the kelvin temperature, double the volume. */
        charles: g.combined({ P: 1, V: 5, n: 1, T: 300 }, { P: 1, n: 1, T: 600 }, 'V'),
        /* Gay-Lussac: double T at fixed V, double P. */
        gaylussac: g.combined({ P: 2, V: 1, n: 1, T: 250 }, { V: 1, n: 1, T: 500 }, 'P'),
        /* Avogadro: double the moles, double the volume. */
        avogadro: g.combined({ P: 1, V: 10, n: 1, T: 300 }, { P: 1, n: 2, T: 300 }, 'V'),
        /* One mole at STP. */
        stp: g.solve({ P: 1, V: null, n: 1, T: 273.15,
          units: { P: 'atm', V: 'L', n: 'mol', T: 'K' } }, 'V'),
      };
    });
    assert.ok(Math.abs(got.boyle - 2) < 1e-9, 'Boyle: ' + got.boyle);
    assert.ok(Math.abs(got.charles - 10) < 1e-9, 'Charles: ' + got.charles);
    assert.ok(Math.abs(got.gaylussac - 4) < 1e-9, 'Gay-Lussac: ' + got.gaylussac);
    assert.ok(Math.abs(got.avogadro - 20) < 1e-9, 'Avogadro: ' + got.avogadro);
    const v = got.stp && (got.stp.value !== undefined ? got.stp.value : got.stp);
    assert.ok(Math.abs(v - 22.414) < 0.01, 'one mole at STP: ' + JSON.stringify(got.stp));
  });

  test('concentration and dilution', async () => {
    const got = await run(() => {
      const S = window.ME.solution;
      return {
        /* 0.5 mol in 2 L is 0.25 M. */
        molarity: S.molarity(0.5, 2).value,
        /* M1V1 = M2V2: 6 M diluted to 250 mL of 1.5 M needs 62.5 mL. */
        dilute: S.dilute(6, null, 1.5, 0.25),
        /* And the same sum the other way round. */
        diluteM2: S.dilute(6, 0.0625, null, 0.25),
        /* Three of the four are required; two is not enough to solve. */
        underdetermined: S.dilute(6, null, null, 0.25).ok,
      };
    });
    assert.ok(Math.abs(got.molarity - 0.25) < 1e-9, 'molarity: ' + got.molarity);
    assert.ok(Math.abs(got.dilute.value - 0.0625) < 1e-9, 'volume needed: ' + JSON.stringify(got.dilute));
    assert.ok(Math.abs(got.diluteM2.value - 1.5) < 1e-9, 'concentration reached: ' + JSON.stringify(got.diluteM2));
    assert.equal(got.underdetermined, false);
  });

  test('pH, pOH and the two concentrations', async () => {
    const got = await run(() => {
      const S = window.ME.solution;
      return {
        fromH: S.pHfromH(1e-4),
        fromPH: S.HfrompH(9),
        neutral: S.pHfromH(1e-7),
        /* A concentration of zero has no logarithm, so it must be refused. */
        zero: S.pHfromH(0).ok,
        negative: S.pHfromH(-1).ok,
      };
    });
    assert.ok(Math.abs(got.fromH.pH - 4) < 1e-9, 'pH of 1e-4: ' + got.fromH.pH);
    assert.ok(Math.abs(got.fromH.pOH - 10) < 1e-9, 'pOH: ' + got.fromH.pOH);
    assert.ok(Math.abs(got.fromPH.H - 1e-9) < 1e-18, '[H+] at pH 9: ' + got.fromPH.H);
    assert.ok(Math.abs(got.fromPH.pOH - 5) < 1e-9, 'pOH at pH 9: ' + got.fromPH.pOH);
    assert.ok(Math.abs(got.neutral.pH - 7) < 1e-9, 'neutral: ' + got.neutral.pH);
    assert.equal(got.zero, false);
    assert.equal(got.negative, false);
  });

  test('q = mcDeltaT, in both directions and both signs', async () => {
    const got = await run(() => {
      const S = window.ME.solution;
      const c = window.ME.ref.SPECIFIC_HEAT.values['water (liquid)'];
      return {
        /* 100 g of water up 10 degrees. */
        warming: S.heat(100, c, 10).q,
        /* The same water cooling: the sign flips and nothing else changes. */
        cooling: S.heat(100, c, -10).q,
        /* A metal takes far less for the same rise. */
        metal: S.heat(100, window.ME.ref.SPECIFIC_HEAT.values.iron, 10).q,
      };
    });
    assert.ok(Math.abs(got.warming - 4184) < 0.01, 'warming: ' + got.warming);
    assert.ok(Math.abs(got.cooling + 4184) < 0.01, 'cooling: ' + got.cooling);
    assert.ok(Math.abs(got.metal - 449) < 0.01, 'iron: ' + got.metal);
    /* Water really does take about nine times as much as iron. */
    assert.ok(got.warming / got.metal > 9 && got.warming / got.metal < 10);
  });

  /* The specific-heat table is the largest piece of literature data the app
   * carries, and it feeds a calculator, a generator and a simulation. These
   * check it is internally consistent rather than that any one number is
   * right — which no test here can do, since there is nothing to check it
   * against; that is exactly why it is marked as literature. */
  test('the specific-heat table is consistent with itself', async () => {
    const got = await run(() => {
      const T = window.ME.ref.SPECIFIC_HEAT;
      const seen = {}, dups = [], bad = [];
      T.groups.forEach((g) => {
        if (!g.name || !g.items.length) bad.push(['group', g.name, 'empty']);
        g.items.forEach((it) => {
          const [name, value, note] = it;
          if (seen[name]) dups.push(name);
          seen[name] = true;
          if (typeof name !== 'string' || !name.length) bad.push([String(name), 'no name']);
          if (typeof value !== 'number' || !(value > 0)) bad.push([name, 'value is ' + value]);
          /* Nothing sensible is outside this range: uranium is the lowest
           * real substance and hydrogen the highest. */
          if (value < 0.05 || value > 15) bad.push([name, 'value out of range: ' + value]);
          if (note !== undefined && (typeof note !== 'string' || note.length < 10)) {
            bad.push([name, 'note too short to be useful']);
          }
          /* The flat map every calculator uses must agree with the group. */
          if (T.values[name] !== value) bad.push([name, 'flat map says ' + T.values[name]]);
        });
      });
      return {
        bad: bad, dups: dups,
        count: Object.keys(T.values).length,
        groups: T.groups.length,
        drillable: T.drillable.length,
        /* Food is excluded from the practice questions. */
        foodDrilled: T.drillable.filter((n) => ['milk', 'bread', 'blood', 'potato'].indexOf(n) >= 0),
        noteForHydrogen: T.note('hydrogen'),
        noteForNothing: T.note('a substance that is not in the table'),
        highest: Object.keys(T.values).sort((a, b) => T.values[b] - T.values[a])[0],
        lowest: Object.keys(T.values).sort((a, b) => T.values[a] - T.values[b])[0],
      };
    });
    assert.deepEqual(got.bad, [], JSON.stringify(got.bad.slice(0, 8)));
    assert.deepEqual(got.dups, [], 'the same substance listed twice: ' + got.dups.join(', '));
    assert.ok(got.count >= 90, 'only ' + got.count + ' substances');
    assert.ok(got.groups >= 6, 'only ' + got.groups + ' groups');
    assert.deepEqual(got.foodDrilled, [], 'food should not be drilled: ' + got.foodDrilled.join(', '));
    assert.ok(got.drillable < got.count, 'everything is drillable, so the exclusion does nothing');
    assert.match(got.noteForHydrogen, /highest/i);
    assert.equal(got.noteForNothing, null);
    /* The two the lesson text names as the extremes. */
    assert.equal(got.highest, 'hydrogen');
    assert.equal(got.lowest, 'uranium');
  });

  test('the substances the lessons and simulations name are all still there', async () => {
    const got = await run(() => {
      const v = window.ME.ref.SPECIFIC_HEAT.values;
      /* Every key referenced by name anywhere else in the app. Adding to the
       * table must not quietly rename one of these out from under its user. */
      const NEEDED = ['water (liquid)', 'water (ice)', 'water (steam)',
        'aluminium', 'iron', 'copper', 'lead', 'gold', 'titanium', 'glass',
        'granite', 'concrete', 'ethanol', 'olive oil', 'lithium', 'air (dry)'];
      return NEEDED.filter((k) => typeof v[k] !== 'number');
    });
    assert.deepEqual(got, [], 'missing from the table: ' + got.join(', '));
  });

  test('the heating curve still finds all three water values', async () => {
    /* It looks them up by name, and its numbers are drawn on a canvas — so a
     * renamed key gives NaN stage lengths that the text-based render check
     * cannot see. Renaming "water (ice)" did exactly that once. */
    const got = await run(() => {
      const v = window.ME.ref.SPECIFIC_HEAT.values;
      const ice = v['water (ice)'], water = v['water (liquid)'], steam = v['water (steam)'];
      const total = ice * 20 + window.ME.ref.LATENT.fusion + water * 100 +
        window.ME.ref.LATENT.vaporisation + steam * 20;
      return { ice: ice, water: water, steam: steam, total: total };
    });
    [['ice', got.ice], ['liquid', got.water], ['steam', got.steam]].forEach(([what, v]) => {
      assert.equal(typeof v, 'number', 'water (' + what + ') is ' + v);
      assert.ok(isFinite(v) && v > 0, 'water (' + what + ') is ' + v);
    });
    assert.ok(isFinite(got.total), 'the heating curve totals ' + got.total);
    /* A gram of ice at -20 C taken to steam at 120 C:
     *   41.8 warming the ice + 334 melting + 418.4 warming the water
     *   + 2257 boiling + 40.2 warming the steam = 3091.4 J.
     * Boiling alone is nearly three quarters of it, which is the whole point
     * of the heating curve's long flat stretch. */
    assert.ok(Math.abs(got.total - 3091.4) < 0.5, 'total energy: ' + got.total);
  });
});

/* ------------------------------------------------------- reaction energy */
describe('reaction energy from formation enthalpies', () => {
  /* Every one of these has a settled textbook value, so the table is an
   * independent check rather than a restatement of what the code does. The
   * point of computing from formation enthalpies rather than storing reaction
   * enthalpies is that none of these numbers is in the data — each is a sum. */
  const KNOWN = [
    ['CH4 + O2 -> CO2 + H2O', -890.4, 'methane, water condensed'],
    ['CH4 + O2 -> CO2 + H2O(g)', -802.3, 'methane, water as vapour'],
    ['C3H8 + O2 -> CO2 + H2O', -2220.0, 'propane'],
    ['C4H10 + O2 -> CO2 + H2O', -5754.2, 'butane, for two molecules'],
    ['C2H6O + O2 -> CO2 + H2O', -1366.8, 'ethanol'],
    ['C2H2 + O2 -> CO2 + H2O', -2599.2, 'ethyne, for two molecules'],
    ['C6H12O6 + O2 -> CO2 + H2O', -2802.7, 'respiration of glucose'],
    ['C12H22O11 + O2 -> CO2 + H2O', -5640.2, 'sucrose'],
    ['H2 + O2 -> H2O', -571.7, 'hydrogen, for two molecules'],
    ['C + O2 -> CO2', -393.5, 'carbon'],
    ['N2 + H2 -> NH3', -92.2, 'the Haber process'],
    ['Fe2O3 + Al -> Al2O3 + Fe', -851.5, 'thermite'],
    ['Fe2O3 + CO -> Fe + CO2', -24.7, 'smelting iron'],
    ['CaCO3 -> CaO + CO2', 178.3, 'limestone, endothermic'],
    ['N2 + O2 -> NO', 180.5, 'nitrogen and oxygen, endothermic'],
    ['Mg + O2 -> MgO', -1203.4, 'magnesium burning, for two atoms'],
    ['CaO + H2O -> CaH2O2', -65.2, 'slaking lime'],
    ['S + O2 -> SO2', -296.8, 'burning sulfur'],
  ];

  test('matches the settled value for each reaction', async () => {
    const got = await run((cs) => cs.map((c) => {
      const r = window.ME.thermo.reactionEnthalpy(c[0]);
      return r.ok ? r.deltaH : 'refused: ' + r.error;
    }), KNOWN);
    got.forEach((v, i) => {
      const [eq, want, label] = KNOWN[i];
      assert.equal(typeof v, 'number', label + ' (' + eq + '): ' + v);
      assert.ok(Math.abs(v - want) < 0.6,
        label + ': engine says ' + v + ', the settled value is ' + want);
    });
  });

  test('the state of the water changes the answer by the heat of vaporisation', async () => {
    const got = await run(() => {
      const liquid = window.ME.thermo.reactionEnthalpy('CH4 + O2 -> CO2 + H2O').deltaH;
      const gas = window.ME.thermo.reactionEnthalpy('CH4 + O2 -> CO2 + H2O(g)').deltaH;
      return { liquid: liquid, gas: gas, perWater: (gas - liquid) / 2 };
    });
    /* Two waters are made, and each one not condensing costs 44 kJ — which is
     * the latent heat of vaporisation per mole, 2257 J/g times 18.015 g/mol. */
    assert.ok(Math.abs(got.perWater - 44.01) < 0.1, 'per mole of water: ' + got.perWater);
    assert.ok(got.gas > got.liquid, 'the vapour case must release less');
  });

  test('a reaction and its reverse are equal and opposite', async () => {
    const got = await run(() => ({
      respiration: window.ME.thermo.reactionEnthalpy('C6H12O6 + O2 -> CO2 + H2O').deltaH,
      photosynthesis: window.ME.thermo.reactionEnthalpy('CO2 + H2O -> C6H12O6 + O2').deltaH,
      burn: window.ME.thermo.reactionEnthalpy('H2 + O2 -> H2O').deltaH,
      split: window.ME.thermo.reactionEnthalpy('H2O -> H2 + O2').deltaH,
    }));
    assert.ok(Math.abs(got.respiration + got.photosynthesis) < 0.01,
      'respiration and photosynthesis: ' + got.respiration + ' and ' + got.photosynthesis);
    assert.ok(Math.abs(got.burn + got.split) < 0.01,
      'burning and splitting water: ' + got.burn + ' and ' + got.split);
  });

  test('says what it cannot do rather than guessing', async () => {
    const got = await run(() => {
      const missing = window.ME.thermo.reactionEnthalpy('C20H42 + O2 -> CO2 + H2O');
      const unbalanceable = window.ME.thermo.reactionEnthalpy('CH4 -> CO2');
      const nonsense = window.ME.thermo.reactionEnthalpy('not an equation');
      return {
        missingOk: missing.ok, missingWhy: missing.error, missingNames: missing.missing,
        unbalanceableOk: unbalanceable.ok, unbalanceableStage: unbalanceable.stage,
        nonsenseOk: nonsense.ok,
      };
    });
    assert.equal(got.missingOk, false);
    /* It must name the substance it has no data for. Dropping it from the sum
     * would give a confident wrong number instead of no number. */
    assert.deepEqual(got.missingNames, ['C20H42']);
    assert.match(got.missingWhy, /C20H42/);
    assert.equal(got.unbalanceableOk, false);
    assert.equal(got.unbalanceableStage, 'balance');
    assert.equal(got.nonsenseOk, false);
  });

  test('scales to the amount you actually have, through the limiting reactant', async () => {
    const got = await run(() => {
      const M = (f) => window.ME.formula.parse(f).mass;
      return {
        /* One mole of methane: the full per-equation figure. */
        oneMole: window.ME.thermo.energyFor('CH4 + O2 -> CO2 + H2O',
          [{ name: 'CH4', grams: M('CH4') }]),
        /* Half a mole: half the energy. */
        halfMole: window.ME.thermo.energyFor('CH4 + O2 -> CO2 + H2O',
          [{ name: 'CH4', grams: M('CH4') / 2 }]).energy,
        /* Plenty of methane but only two moles of oxygen — the oxygen is
         * what runs out, so it sets the energy, not the methane. */
        oxygenLimited: window.ME.thermo.energyFor('CH4 + O2 -> CO2 + H2O',
          [{ name: 'CH4', grams: M('CH4') * 10 }, { name: 'O2', grams: M('O2') * 2 }]),
      };
    });
    assert.ok(Math.abs(got.oneMole.energy + 890.4) < 0.6, 'one mole: ' + got.oneMole.energy);
    assert.equal(got.oneMole.limiting.name, 'CH4');
    assert.ok(Math.abs(got.halfMole + 445.2) < 0.3, 'half a mole: ' + got.halfMole);
    /* Two moles of O2 runs the reaction once, because the equation needs two. */
    assert.equal(got.oxygenLimited.limiting.name, 'O2');
    assert.ok(Math.abs(got.oxygenLimited.batches - 1) < 1e-9, 'batches: ' + got.oxygenLimited.batches);
    assert.ok(Math.abs(got.oxygenLimited.energy + 890.4) < 0.6,
      'oxygen-limited: ' + got.oxygenLimited.energy);
  });

  test('an element in its standard state is zero, and the exceptions are not', async () => {
    const got = await run(() => {
      const L = (f, st) => { const h = window.ME.ref.FORMATION.lookup(f, st); return h ? h.dh : 'missing'; };
      return {
        o2: L('O2'), n2: L('N2'), h2: L('H2'), fe: L('Fe'), c: L('C'),
        ozone: L('O3'), diamond: L('C', 's-diamond'),
        waterLiquid: L('H2O'), waterGas: L('H2O', 'g'),
        defaultStateOfWater: window.ME.ref.FORMATION.lookup('H2O').state,
        assumed: window.ME.ref.FORMATION.lookup('H2O').assumedState,
        stated: window.ME.ref.FORMATION.lookup('H2O', 'g').assumedState,
      };
    });
    [['o2', got.o2], ['n2', got.n2], ['h2', got.h2], ['fe', got.fe], ['c', got.c]]
      .forEach(([what, v]) => assert.equal(v, 0, what + ' should be zero, got ' + v));
    /* Both are single elements and neither is the standard state. */
    assert.ok(got.ozone > 140, 'ozone: ' + got.ozone);
    assert.ok(got.diamond > 1 && got.diamond < 3, 'diamond: ' + got.diamond);
    assert.equal(got.waterLiquid, -285.83);
    assert.equal(got.waterGas, -241.82);
    /* Water with no state given is the liquid, and the caller is told it was
     * assumed rather than stated. */
    assert.equal(got.defaultStateOfWater, 'l');
    assert.equal(got.assumed, true);
    assert.equal(got.stated, false);
  });

  test('counts the runs in English, and marks up formulas without mangling the temperature', async () => {
    const got = await run(() => {
      const M = (f) => window.ME.formula.parse(f).mass;
      const one = window.ME.thermo.energyFor('CH4 + O2 -> CO2 + H2O',
        [{ name: 'CH4', grams: M('CH4') }]);
      const many = window.ME.thermo.energyFor('CH4 + O2 -> CO2 + H2O',
        [{ name: 'CH4', grams: M('CH4') * 3 }]);
      const stateStep = one.steps.filter((st) => st.html && /standard state/.test(st.html))[0];
      return {
        oneWords: one.steps.map((st) => st.text).join(' | '),
        manyWords: many.steps.map((st) => st.text).join(' | '),
        stateHTML: stateStep ? stateStep.html : '',
        stateText: stateStep ? stateStep.text : '',
      };
    });
    assert.match(got.oneWords, /runs the reaction once\b/);
    assert.ok(!/1 times/.test(got.oneWords), 'said "1 times": ' + got.oneWords);
    assert.match(got.manyWords, /3 times over/);
    /* The formulas get their subscripts — and 298 K, which is a temperature
     * sitting in the same sentence, does not. */
    assert.match(got.stateHTML, /CH<sub>4<\/sub>/);
    assert.match(got.stateHTML, /H<sub>2<\/sub>O/);
    assert.ok(!/<sub>98/.test(got.stateHTML) && /298 K/.test(got.stateHTML),
      'the temperature was mangled: ' + got.stateHTML);
    /* The plain sentence is still there for anything reading without a DOM. */
    assert.match(got.stateText, /No state was given/);
  });

  test('writes formulas the way a reader would, not in Hill order', async () => {
    const got = await run(() => {
      const L = (f) => window.ME.ref.FORMATION.lookup(f);
      const written = {};
      window.ME.ref.FORMATION.groups.forEach((g) => g.items.forEach((row) => {
        written[row[3]] = row[0];
      }));
      return {
        written: written,
        /* Either spelling has to reach the same row, because the index is
         * keyed on what the formula parser makes of it, not on the string. */
        sameRow: [
          [L('Ca(OH)2').dh, L('CaH2O2').dh],
          [L('NaHCO3').dh, L('CHNaO3').dh],
          [L('C2H5OH').dh, L('C2H6O').dh],
          [L('NH4NO3').dh, L('H4N2O3').dh],
        ],
      };
    });
    /* Hill order puts carbon first and the rest alphabetically, which turns
     * slaked lime into CaH2O2 and baking soda into CHNaO3 — true, and
     * unrecognisable. The table shows the formula a student would meet. */
    assert.equal(got.written['slaked lime'], 'Ca(OH)2');
    assert.equal(got.written['sodium hydrogen carbonate \u2014 baking soda'], 'NaHCO3');
    assert.equal(got.written['magnesium hydroxide'], 'Mg(OH)2');
    assert.equal(got.written['ammonium chloride'], 'NH4Cl');
    assert.equal(got.written['ammonium nitrate'], 'NH4NO3');
    /* C2H6O is two different substances; the table says which one it measured. */
    assert.equal(got.written['ethanol'], 'C2H5OH');
    assert.equal(got.written['methanol'], 'CH3OH');
    assert.equal(got.written['ethanoic acid \u2014 vinegar'], 'CH3COOH');
    got.sameRow.forEach(([a, b], i) => assert.equal(a, b, 'pair ' + i + ': ' + a + ' vs ' + b));
  });

  test('every template in both tools runs and gives a number', async () => {
    const bad = await run(() => {
      const out = [];
      const tools = window.ME.tools.TOOLS.filter((t) => t.templates && t.templates.length);
      if (tools.length < 2) out.push(['only ' + tools.length + ' tools have templates']);
      tools.forEach((tool) => {
        tool.templates.forEach((t) => {
          /* Run the tool exactly as the chip would, including the select
           * defaults the form would have supplied. */
          const values = {};
          tool.fields.forEach((f) => {
            if (f.type === 'select' && f.options && f.options.length) values[f.k] = f.options[0][0];
          });
          Object.keys(t.values).forEach((k) => { values[k] = t.values[k]; });
          let r;
          try { r = tool.run(values); }
          catch (e) { out.push([tool.key, t.label, 'threw: ' + e.message]); return; }
          if (!r || r.error) out.push([tool.key, t.label, 'error: ' + (r && r.error)]);
          else if (!r.headline || /undefined|NaN|null/.test(r.headline)) {
            out.push([tool.key, t.label, 'headline: ' + (r && r.headline)]);
          }
        });
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad, null, 1));
  });
});

/* --------------------------------------------------------------- mixing pH */
describe('pH of a mixture', () => {
  /* Every value below is a settled textbook answer, worked by hand with the
   * usual approximations. They matter more here than in most of this suite,
   * because the pKa values behind them cannot be checked against any free
   * machine-readable source — so what can be checked is that the arithmetic
   * built on them reproduces the answers a chemistry course expects. */
  const ONE = [
    ['hydrochloric-acid', 0.1, 1.00, 'strong acid, 0.1 M'],
    ['hydrochloric-acid', 1.0, 0.00, 'strong acid, 1 M'],
    ['hydrochloric-acid', 1e-8, 6.98, 'strong acid so dilute that water wins'],
    ['sodium-hydroxide', 0.1, 13.00, 'strong base'],
    ['barium-hydroxide', 0.1, 13.30, 'two hydroxides per formula'],
    ['sulfuric-acid', 0.1, 0.96, 'strong first proton, weak second'],
    ['acetic-acid', 0.1, 2.88, 'the textbook weak acid'],
    ['acetic-acid', 0.01, 3.39, 'the same acid, ten times weaker'],
    ['ammonia', 0.1, 11.12, 'the textbook weak base'],
    ['hydrofluoric-acid', 0.1, 2.10, 'weak, and still dissolves glass'],
    ['hydrocyanic-acid', 0.1, 5.11, 'barely an acid at all'],
    ['phosphoric-acid', 0.1, 1.63, 'three protons, only the first one matters here'],
    ['water', 0, 7.00, 'nothing dissolved'],
  ];

  test('one solution on its own matches the settled value', async () => {
    const got = await run((cases) => cases.map((c) => {
      const r = window.ME.ph.mix({ id: c[0], molarity: c[1], litres: 0.1 },
        { id: 'water', molarity: 0, litres: 0 });
      return r.ok ? r.pH : 'refused: ' + r.error;
    }), ONE);
    got.forEach((v, i) => {
      const [id, M, want, label] = ONE[i];
      assert.equal(typeof v, 'number', label + ': ' + v);
      assert.ok(Math.abs(v - want) < 0.02, label + ' (' + id + ' at ' + M + ' M): engine says '
        + v.toFixed(3) + ', the settled value is ' + want);
    });
  });

  const MIX = [
    ['hydrochloric-acid', 0.1, 25, 'sodium-hydroxide', 0.1, 25, 7.00, 'strong + strong, exactly level'],
    ['hydrochloric-acid', 0.1, 50, 'sodium-hydroxide', 0.1, 25, 1.48, 'strong acid half neutralised'],
    ['hydrochloric-acid', 0.1, 25, 'sodium-hydroxide', 0.1, 50, 12.52, 'strong base in excess'],
    ['acetic-acid', 0.1, 50, 'sodium-hydroxide', 0.1, 25, 4.76, 'weak acid half neutralised sits on its pKa'],
    ['acetic-acid', 0.1, 25, 'sodium-hydroxide', 0.1, 25, 8.73, 'weak acid at equivalence is NOT 7'],
    ['ammonia', 0.1, 25, 'hydrochloric-acid', 0.1, 25, 5.28, 'weak base at equivalence is NOT 7'],
    ['ammonia', 0.1, 50, 'hydrochloric-acid', 0.1, 25, 9.25, 'weak base half neutralised sits on its pKa'],
    ['barium-hydroxide', 0.05, 50, 'hydrochloric-acid', 0.05, 50, 12.40, 'equal molarity, and still not neutral'],
    ['hydrochloric-acid', 0.1, 10, 'water', 0, 90, 2.00, 'diluted ten times, one pH unit'],
  ];

  test('two solutions mixed match the settled value', async () => {
    const got = await run((cases) => cases.map((c) => {
      const r = window.ME.ph.mix({ id: c[0], molarity: c[1], litres: c[2] / 1000 },
        { id: c[3], molarity: c[4], litres: c[5] / 1000 });
      return r.ok ? r.pH : 'refused: ' + r.error;
    }), MIX);
    got.forEach((v, i) => {
      const want = MIX[i][6], label = MIX[i][7];
      assert.equal(typeof v, 'number', label + ': ' + v);
      assert.ok(Math.abs(v - want) < 0.02,
        label + ': engine says ' + v.toFixed(3) + ', the settled value is ' + want);
    });
  });

  test('a half-neutralised weak acid lands exactly on its pKa', async () => {
    /* Not approximately. This is the identity Henderson–Hasselbalch is built
     * on, so a solver that drifts off it by more than water's own
     * contribution is solving the wrong equation. */
    const got = await run(() => ['acetic-acid', 'formic-acid', 'benzoic-acid', 'hydrofluoric-acid',
      'hypochlorous-acid', 'ammonia', 'methylamine', 'pyridine'].map((id) => {
      const sub = window.ME.ref.ACID_BASE.get(id);
      const partner = sub.kind === 'acid' ? 'sodium-hydroxide' : 'hydrochloric-acid';
      const r = window.ME.ph.mix({ id: id, molarity: 0.1, litres: 0.05 },
        { id: partner, molarity: 0.1, litres: 0.025 });
      return [id, sub.pKa[0], r.pH];
    }));
    got.forEach(([id, pKa, pH]) => {
      assert.ok(Math.abs(pH - pKa) < 0.02, id + ': half neutralised gives pH ' + pH.toFixed(3)
        + ', its pKa is ' + pKa);
    });
  });

  test('mixing two of the same kind never crosses neutral', async () => {
    /* Two acids cannot make a base. The charge balance has no way to do it,
     * and this pins that it never finds one. */
    const got = await run(() => {
      const acids = ['hydrochloric-acid', 'acetic-acid', 'citric-acid', 'carbonic-acid', 'sulfuric-acid'];
      const bases = ['sodium-hydroxide', 'ammonia', 'barium-hydroxide', 'pyridine'];
      const out = [];
      acids.forEach((a) => acids.forEach((b) => {
        const r = window.ME.ph.mix({ id: a, molarity: 0.05, litres: 0.05 },
          { id: b, molarity: 0.05, litres: 0.05 });
        if (r.pH >= 7) out.push(['acids', a, b, r.pH]);
      }));
      bases.forEach((a) => bases.forEach((b) => {
        const r = window.ME.ph.mix({ id: a, molarity: 0.05, litres: 0.05 },
          { id: b, molarity: 0.05, litres: 0.05 });
        if (r.pH <= 7) out.push(['bases', a, b, r.pH]);
      }));
      return out;
    });
    assert.deepEqual(got, [], JSON.stringify(got));
  });

  test('the mixed pH always sits between the two it was made from, for acid plus acid', async () => {
    const got = await run(() => {
      const out = [];
      [['hydrochloric-acid', 'acetic-acid'], ['acetic-acid', 'carbonic-acid'],
        ['sodium-hydroxide', 'ammonia'], ['ammonia', 'pyridine']].forEach(([a, b]) => {
        const r = window.ME.ph.mix({ id: a, molarity: 0.05, litres: 0.05 },
          { id: b, molarity: 0.05, litres: 0.05 });
        const lo = Math.min(r.pHa, r.pHb) - 0.001, hi = Math.max(r.pHa, r.pHb) + 0.001;
        if (r.pH < lo || r.pH > hi) out.push([a, b, r.pHa, r.pHb, r.pH]);
      });
      return out;
    });
    assert.deepEqual(got, [], JSON.stringify(got));
  });

  test('a pH typed in comes back out when nothing is added to it', async () => {
    const got = await run(() => [0, 1, 2.5, 4, 6.5, 7, 7.5, 9, 11.5, 13, 14].map((pH) => {
      const r = window.ME.ph.mix({ id: 'ph', pH: pH, litres: 0.05 },
        { id: 'water', molarity: 0, litres: 0 });
      return [pH, r.pH];
    }));
    got.forEach(([asked, back]) => assert.ok(Math.abs(asked - back) < 0.002,
      'asked for pH ' + asked + ', got ' + back));
  });

  test('says what it cannot do rather than guessing', async () => {
    const got = await run(() => ({
      noVolume: window.ME.ph.mix({ id: 'hydrochloric-acid', molarity: 0.1, litres: 0 },
        { id: 'water', molarity: 0, litres: 0 }),
      negative: window.ME.ph.mix({ id: 'hydrochloric-acid', molarity: 0.1, litres: -1 },
        { id: 'water', molarity: 0, litres: 0.05 }),
      noMolarity: window.ME.ph.mix({ id: 'acetic-acid', molarity: 0, litres: 0.05 },
        { id: 'water', molarity: 0, litres: 0.05 }),
      noPH: window.ME.ph.mix({ id: 'ph', pH: null, litres: 0.05 },
        { id: 'water', molarity: 0, litres: 0.05 }),
      unknown: window.ME.ph.mix({ id: 'unobtainium', molarity: 0.1, litres: 0.05 },
        { id: 'water', molarity: 0, litres: 0.05 }),
    }));
    Object.keys(got).forEach((k) => assert.equal(got[k].ok, false, k + ' should have been refused'));
    assert.match(got.noMolarity.error, /molarity/i);
    assert.match(got.noPH.error, /pH/);
  });

  test('every substance in the table gives a sane pH at a sane concentration', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.ref.ACID_BASE.all().forEach((sub) => {
        if (sub.id === 'ph') return;
        const r = window.ME.ph.mix({ id: sub.id, molarity: 0.1, litres: 0.05 },
          { id: 'water', molarity: 0, litres: 0.05 });
        if (!r.ok) { out.push([sub.id, 'refused: ' + r.error]); return; }
        if (!isFinite(r.pH) || r.pH < -1 || r.pH > 15) { out.push([sub.id, r.pH]); return; }
        /* An acid has to come out acidic and a base basic. If that ever fails
         * the entry is wrong, whatever the pKa says. */
        if (sub.kind === 'acid' && r.pH >= 7) out.push([sub.id, 'acid came out at pH ' + r.pH]);
        if (sub.kind === 'base' && r.pH <= 7) out.push([sub.id, 'base came out at pH ' + r.pH]);
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('the table itself is internally consistent', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.ref.ACID_BASE.all().forEach((s) => {
        if (s.id === 'ph' || s.id === 'water') return;
        /* Successive protons always come off harder than the one before. A
         * polyprotic acid listed out of order is a typo, and this is the only
         * way to catch one without a source to check against. */
        for (let i = 1; i < s.pKa.length; i++) {
          if (s.pKa[i] <= s.pKa[i - 1]) out.push([s.id, 'pKa values out of order', s.pKa]);
        }
        s.pKa.forEach((k) => { if (k < -2 || k > 14) out.push([s.id, 'pKa off the scale', k]); });
        if (s.strong && s.kind === 'acid' && s.zFull !== -1) out.push([s.id, 'strong acid zFull', s.zFull]);
        if (s.strong && s.kind === 'base' && s.zFull < 1) out.push([s.id, 'strong base zFull', s.zFull]);
        if (!s.strong && s.kind === 'acid' && s.pKa.length === 0) out.push([s.id, 'weak acid with no pKa']);
        if (s.kind === 'base' && !s.strong && s.zFull !== 1) out.push([s.id, 'weak base zFull', s.zFull]);
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('a buffer is called one only when both forms are really there', async () => {
    const got = await run(() => {
      const d = (a, am, av, b, bm, bv) => {
        const r = window.ME.ph.mix({ id: a, molarity: am, litres: av / 1000 },
          { id: b, molarity: bm, litres: bv / 1000 });
        return window.ME.ph.describe(r).buffer;
      };
      return {
        half: d('acetic-acid', 0.1, 50, 'sodium-hydroxide', 0.1, 25),
        plainAcid: d('acetic-acid', 0.1, 50, 'water', 0, 50),
        wellPast: d('acetic-acid', 0.1, 25, 'sodium-hydroxide', 0.1, 50),
        strongOnly: d('hydrochloric-acid', 0.1, 50, 'sodium-hydroxide', 0.1, 25),
      };
    });
    assert.ok(got.half, 'a half-neutralised weak acid is the definition of a buffer');
    assert.ok(Math.abs(got.half.pKa - 4.76) < 0.001);
    assert.equal(got.plainAcid, null, 'an acid on its own is not a buffer');
    assert.equal(got.wellPast, null, 'an acid drowned in base is not a buffer');
    assert.equal(got.strongOnly, null, 'strong acid and strong base cannot buffer anything');
  });
});

/* ------------------------------------------------------- the reaction player */
describe('reaction animations', () => {
  test('every stored structure holds the atoms its own formula claims', async () => {
    /* The one check that matters for a table of hand-written SMILES. OpenChemLib
     * will happily give a bare [Al] three hydrogens, and an animation of
     * aluminium hydride labelled "aluminium" is exactly the kind of quiet
     * fiction this project is not allowed to ship. */
    const bad = await run(() => window.ME.reactionsim.checkStructures());
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('every reaction in the list builds a scene', async () => {
    const bad = await run(() => window.ME.reactionsim.REACTIONS
      .map((r) => { const s = window.ME.reactionsim.buildScene(r); return s.ok ? null : [r.id, s.error]; })
      .filter(Boolean));
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('no atom is created or destroyed on the way across', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.reactionsim.REACTIONS.forEach((r) => {
        const s = window.ME.reactionsim.buildScene(r);
        if (!s.ok) { out.push([r.id, s.error]); return; }
        const count = (atoms) => atoms.reduce((m, a) => { m[a.sym] = (m[a.sym] || 0) + 1; return m; }, {});
        const l = count(s.left.atoms), p = count(s.right.atoms);
        Object.keys(l).concat(Object.keys(p)).forEach((k) => {
          if (l[k] !== p[k]) out.push([r.id, k + ': ' + l[k] + ' in, ' + p[k] + ' out']);
        });
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('the atom mapping is one-to-one, and never swaps an element', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.reactionsim.REACTIONS.forEach((r) => {
        const s = window.ME.reactionsim.buildScene(r);
        if (!s.ok) return;
        const seen = {};
        s.map.forEach((to, from) => {
          if (to < 0) out.push([r.id, 'atom ' + from + ' goes nowhere']);
          else if (seen[to]) out.push([r.id, 'two atoms land on ' + to]);
          else if (s.left.atoms[from].sym !== s.right.atoms[to].sym) {
            /* A carbon that turns into an oxygen would animate beautifully
             * and be a lie about the one thing this is showing. */
            out.push([r.id, s.left.atoms[from].sym + ' becomes ' + s.right.atoms[to].sym]);
          }
          seen[to] = true;
        });
        if (s.map.length !== s.right.atoms.length) out.push([r.id, 'sides are different sizes']);
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('structures come out the shape the chemistry says', async () => {
    const got = await run(() => {
      const R = window.ME.reactionsim;
      const angle = (f, centre) => {
        const sh = R.shapeOf(f);
        const c = sh.atoms[centre];
        const others = sh.atoms.filter((a, i) => i !== centre);
        const a0 = Math.atan2(others[0].y - c.y, others[0].x - c.x);
        const a1 = Math.atan2(others[1].y - c.y, others[1].x - c.x);
        let d = Math.abs(a0 - a1) * 180 / Math.PI;
        if (d > 180) d = 360 - d;
        return d;
      };
      return {
        water: angle('H2O', 0),
        co2: angle('CO2', 1),
        methaneAtoms: R.shapeOf('CH4').atoms.length,
        methaneBonds: R.shapeOf('CH4').bonds.length,
        o2Order: R.shapeOf('O2').bonds[0].order,
        n2Order: R.shapeOf('N2').bonds[0].order,
        magnesium: R.shapeOf('Mg').atoms.length,
        saltPieces: R.shapeOf('NaCl').bonds.length,
      };
    });
    /* Water is bent. The lessons spend a page on why, so an animation that
     * drew it straight would be contradicting the course. */
    assert.ok(Math.abs(got.water - 109.5) < 1, 'water came out at ' + got.water + '°');
    assert.ok(Math.abs(got.co2 - 180) < 1, 'carbon dioxide came out at ' + got.co2 + '°');
    assert.equal(got.methaneAtoms, 5);
    assert.equal(got.methaneBonds, 4);
    assert.equal(got.o2Order, 2, 'oxygen is double bonded');
    assert.equal(got.n2Order, 3, 'nitrogen is triple bonded');
    assert.equal(got.magnesium, 1, 'a magnesium atom is one atom, with no hydrogens');
    assert.equal(got.saltPieces, 0, 'sodium chloride is ions, not a bonded molecule');
  });

  test('molecules are labelled the way they are written, not in Hill order', async () => {
    const got = await run(() => {
      const R = window.ME.reactionsim;
      const labels = (id) => {
        const s = R.buildScene(R.REACTIONS.filter((r) => r.id === id)[0]);
        const out = {};
        s.left.atoms.concat(s.right.atoms).forEach((a) => { out[a.formula] = true; });
        return Object.keys(out).sort();
      };
      return { silver: labels('silver'), neutralise: labels('neutralise') };
    });
    /* Hill order would make these ClNa, NNaO3 and HNaO — all true, and none
     * of them anything a reader would recognise. */
    assert.ok(got.silver.indexOf('NaCl') >= 0, got.silver.join(','));
    assert.ok(got.silver.indexOf('NaNO3') >= 0, got.silver.join(','));
    assert.ok(got.neutralise.indexOf('NaOH') >= 0, got.neutralise.join(','));
    assert.ok(got.silver.indexOf('ClNa') < 0, 'Hill order leaked into a label');
  });

  test('a bond is called unbroken only when both its atoms stay together', async () => {
    const got = await run(() => {
      const s = window.ME.reactionsim.buildScene(
        window.ME.reactionsim.REACTIONS.filter((r) => r.id === 'methane')[0]);
      const v = window.ME.reactionsim.buildScene(
        window.ME.reactionsim.REACTIONS.filter((r) => r.id === 'vinegar-soda')[0]);
      return {
        methaneSurvivors: s.left.bonds.filter((b) => b.persists).length,
        methaneTotal: s.left.bonds.length,
        vinegarSurvivors: v.left.bonds.filter((b) => b.persists).length,
        vinegarTotal: v.left.bonds.length,
      };
    });
    /* Burning methane takes every bond apart: four C–H and two O=O, and
     * nothing on the right is a C–H or an O=O. */
    assert.equal(got.methaneSurvivors, 0, 'combustion should break every bond');
    assert.equal(got.methaneTotal, 6);
    /* Vinegar and baking soda is the opposite case — most of the acetate
     * rides through untouched, and only the ends swap over. */
    assert.ok(got.vinegarSurvivors > got.vinegarTotal / 2,
      'most of the acetate should survive: ' + got.vinegarSurvivors + '/' + got.vinegarTotal);
  });

  test('every atom has a real position at every moment of every reaction', async () => {
    /* A single NaN puts an atom at the end of the universe and takes its
     * bonds with it, and canvas fails silently rather than throwing. */
    const bad = await run(() => {
      const out = [];
      window.ME.reactionsim.REACTIONS.forEach((r) => {
        const s = window.ME.reactionsim.buildScene(r);
        if (!s.ok) return;
        for (let step = 0; step <= 40; step++) {
          const t = step / 40;
          s.left.atoms.forEach((a, i) => {
            const p = window.ME.reactionsim.atomAt(s, i, t);
            if (!isFinite(p.x) || !isFinite(p.y) || Math.abs(p.x) > 60 || Math.abs(p.y) > 60) {
              out.push([r.id, 'atom ' + i + ' at t=' + t.toFixed(2) + ': ' + p.x + ',' + p.y]);
            }
          });
        }
      });
      return out;
    });
    assert.deepEqual(bad.slice(0, 6), [], JSON.stringify(bad.slice(0, 6)));
  });

  test('the animation starts where the reactants are and ends where the products are', async () => {
    const got = await run(() => {
      const R = window.ME.reactionsim;
      const s = R.buildScene(R.REACTIONS.filter((r) => r.id === 'haber')[0]);
      const at = (t) => s.left.atoms.map((a, i) => R.atomAt(s, i, t));
      const start = at(0), end = at(1);
      const off = (list, side, viaMap) => list.reduce((m, p, i) => {
        const q = viaMap ? side.atoms[s.map[i]] : side.atoms[i];
        return Math.max(m, Math.hypot(p.x - q.x, p.y - q.y));
      }, 0);
      return { startOff: off(start, s.left, false), endOff: off(end, s.right, true) };
    });
    assert.ok(got.startOff < 0.08, 'frame one should be the reactants, off by ' + got.startOff);
    assert.ok(got.endOff < 0.08, 'the last frame should be the products, off by ' + got.endOff);
  });

  test('the energy shown is the energy the thermochemistry engine computes', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.reactionsim.REACTIONS.forEach((r) => {
        const s = window.ME.reactionsim.buildScene(r);
        if (!s.ok) return;
        const e = window.ME.thermo.reactionEnthalpy(r.eq);
        if (e.ok && Math.abs(e.deltaH - s.energy) > 1e-9) out.push([r.id, s.energy, e.deltaH]);
        /* And where there is no number, there is a reason for there being no
         * number, rather than a silent nothing. */
        if (!e.ok && !s.energyMissing) out.push([r.id, 'no energy and no explanation']);
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('combustion releases, photosynthesis absorbs', async () => {
    const got = await run(() => {
      const R = window.ME.reactionsim;
      const of = (id) => R.buildScene(R.REACTIONS.filter((r) => r.id === id)[0]).energy;
      return { methane: of('methane'), photo: of('photosynthesis'), resp: of('respiration'),
        kiln: of('quicklime') };
    });
    assert.ok(got.methane < 0 && Math.abs(got.methane + 890.36) < 0.5);
    assert.ok(got.photo > 0, 'photosynthesis has to be paid for');
    assert.ok(Math.abs(got.photo + got.resp) < 0.01, 'and it is exactly respiration backwards');
    assert.ok(got.kiln > 0, 'a lime kiln has to be heated');
  });
});

/* --------------------------------------------------- the Schrödinger engine */
describe('quantum mechanics', () => {
  test('the derived constants come out to the measured values', async () => {
    const got = await run(() => {
      const C = window.ME.fmt.CONST, Q = window.ME.quantum;
      return {
        hc: Q.HC_EV_NM,
        rydbergEV: C.rydbergEnergy / C.e,
        bohrNM: C.bohrRadius * 1e9,
        ionisation: Q.ionisationEV(1),
        reduced: Q.hydrogenEnergy(1).reduced,
      };
    });
    /* Nothing below is stored in the app. Each one is a product of the defined
     * constants, so if any of them were mistyped these would all drift. */
    assert.ok(Math.abs(got.hc - 1239.8419) < 0.001, 'hc = ' + got.hc + ' eV nm');
    assert.ok(Math.abs(got.rydbergEV - 13.605693) < 1e-5, 'Rydberg = ' + got.rydbergEV);
    assert.ok(Math.abs(got.bohrNM - 0.0529177) < 1e-6, 'Bohr radius = ' + got.bohrNM + ' nm');
    /* The measured ionisation energy of hydrogen is 13.5984 eV. Getting this
     * right needs the reduced mass; the electron mass alone gives 13.6057,
     * which is wrong in the fourth figure. */
    assert.ok(Math.abs(got.ionisation - 13.5983) < 0.0005, 'ionisation = ' + got.ionisation);
    assert.ok(Math.abs(got.reduced - 0.99945568) < 1e-7, 'reduced mass factor = ' + got.reduced);
  });

  test('a particle in a box matches the hand calculation and its own scaling laws', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        e1: Q.boxEnergy(1, 1).eV,
        e2: Q.boxEnergy(2, 1).eV,
        e3: Q.boxEnergy(3, 1).eV,
        halfWidth: Q.boxEnergy(1, 0.5).eV,
        doubleWidth: Q.boxEnergy(1, 2).eV,
        heavy: Q.boxEnergy(1, 1, 2).eV,
      };
    });
    assert.ok(Math.abs(got.e1 - 0.37603) < 1e-4, 'E1 in a 1 nm box = ' + got.e1 + ' eV');
    /* E goes as n², so these are not independent numbers — and that is the point. */
    assert.ok(Math.abs(got.e2 / got.e1 - 4) < 1e-9, 'E2/E1 = ' + got.e2 / got.e1);
    assert.ok(Math.abs(got.e3 / got.e1 - 9) < 1e-9, 'E3/E1 = ' + got.e3 / got.e1);
    /* and as 1/L², so halving the width quadruples it */
    assert.ok(Math.abs(got.halfWidth / got.e1 - 4) < 1e-9, 'half width: ' + got.halfWidth);
    assert.ok(Math.abs(got.doubleWidth / got.e1 - 0.25) < 1e-9, 'double width: ' + got.doubleWidth);
    /* and as 1/m, which is why nothing large is visibly quantised */
    assert.ok(Math.abs(got.heavy / got.e1 - 0.5) < 1e-9, 'twice the mass: ' + got.heavy);
  });

  test('the wavefunction is normalised, and the probabilities behave', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      const out = { whole: [], halves: [], middleThird: Q.boxProbability(1, 1, 1 / 3, 2 / 3),
        n2middle: Q.boxProbability(2, 1, 1 / 3, 2 / 3), numeric: 0 };
      for (let n = 1; n <= 6; n++) {
        out.whole.push(Q.boxProbability(n, 1, 0, 1));
        out.halves.push(Q.boxProbability(n, 1, 0, 0.5));
      }
      /* An independent check of the closed form, by brute-force summing the
       * square of the wavefunction the app would draw. */
      const L = 1, n = 3, steps = 20000;
      let sum = 0;
      for (let i = 0; i < steps; i++) {
        const x = ((i + 0.5) / steps) * L;
        const psi = Q.boxPsi(n, L, x);
        sum += psi * psi * (L * 1e-9 / steps);
      }
      out.numeric = sum;
      return out;
    });
    got.whole.forEach((v, i) => assert.ok(Math.abs(v - 1) < 1e-12,
      'n=' + (i + 1) + ' does not integrate to 1: ' + v));
    got.halves.forEach((v, i) => assert.ok(Math.abs(v - 0.5) < 1e-12,
      'n=' + (i + 1) + ' is not symmetric about the middle: ' + v));
    /* The textbook result, and the one that shows the electron is not spread
     * evenly: a classical particle would be here a third of the time. */
    assert.ok(Math.abs(got.middleThird - 0.6090) < 0.0005, 'middle third: ' + got.middleThird);
    /* n = 2 has its node dead centre, so the middle becomes the least likely place. */
    assert.ok(got.n2middle < 0.2, 'n=2 middle third should be small: ' + got.n2middle);
    /* The closed form and the drawn wavefunction agree, so the picture and the
     * number come from the same physics. */
    assert.ok(Math.abs(got.numeric - 1) < 1e-4, 'summing |psi|² over the box gave ' + got.numeric);
  });

  test('hydrogen reproduces its measured spectrum', async () => {
    /* Vacuum wavelengths. Tables usually quote air, which is about 0.03%
     * shorter, and the worked example says so rather than appearing wrong. */
    const LINES = [
      [3, 2, 656.47, 'Balmer alpha, the red line'],
      [4, 2, 486.27, 'Balmer beta'],
      [5, 2, 434.17, 'Balmer gamma'],
      [2, 1, 121.57, 'Lyman alpha'],
      [3, 1, 102.57, 'Lyman beta'],
      [4, 3, 1875.6, 'Paschen alpha'],
    ];
    const got = await run((lines) => lines.map((l) => {
      const t = window.ME.quantum.hydrogenTransition(l[0], l[1]);
      return [t.lambdaNM, t.series, t.region];
    }), LINES);
    got.forEach(([nm, series], i) => {
      const [from, to, want, label] = LINES[i];
      assert.ok(Math.abs(nm - want) / want < 0.0005,
        label + ' (' + from + '→' + to + '): engine says ' + nm.toFixed(2)
          + ' nm, the measured vacuum value is ' + want);
    });
    assert.equal(got[0][1], 'Balmer');
    assert.equal(got[3][1], 'Lyman');
    assert.equal(got[5][1], 'Paschen');
    assert.equal(got[0][2], 'red', 'the red line should come out red');
  });

  test('the energy levels only depend on n, and that is special to hydrogen', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        levels: [1, 2, 3, 4].map((n) => Q.hydrogenEnergy(n).eV),
        helium: Q.hydrogenEnergy(1, 2, 4.0015).eV,
        limit: Q.hydrogenTransition(1e6, 2).lambdaNM,
      };
    });
    /* E ∝ 1/n², checked as ratios so a wrong Rydberg could not hide. */
    assert.ok(Math.abs(got.levels[0] / got.levels[1] - 4) < 1e-9);
    assert.ok(Math.abs(got.levels[0] / got.levels[2] - 9) < 1e-9);
    assert.ok(Math.abs(got.levels[0] / got.levels[3] - 16) < 1e-9);
    /* He⁺ is one electron with a charge of two, so four times deeper. Measured
     * at 54.418 eV. */
    assert.ok(Math.abs(got.helium + 54.42) < 0.02, 'He+ ground state: ' + got.helium);
    /* The Balmer series limit is 364.6 nm in vacuum. */
    assert.ok(Math.abs(got.limit - 364.6) < 0.5, 'Balmer limit: ' + got.limit);
  });

  test('a bond as a spring lands where the infrared band is', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      const o = (k, m1, m2) => Q.oscillator(k, Q.reducedMass(m1, m2));
      return {
        hcl: o(516, 1.00783, 34.9689),
        dcl: o(516, 2.0141, 34.9689),
        co: o(1902, 12, 15.9949),
        mu: Q.reducedMass(1.00783, 34.9689),
      };
    });
    /* These are the harmonic constants spectroscopists quote: HCl 2990 cm⁻¹,
     * CO 2170 cm⁻¹. The observed fundamental bands sit a few per cent lower
     * because a real bond is not a spring, and the page says so. */
    assert.ok(Math.abs(got.hcl.wavenumber - 2990) < 10, 'HCl: ' + got.hcl.wavenumber);
    assert.ok(Math.abs(got.co.wavenumber - 2170) < 10, 'CO: ' + got.co.wavenumber);
    /* The reduced mass of H–Cl is almost exactly the hydrogen mass, because
     * chlorine barely moves. */
    assert.ok(Math.abs(got.mu - 0.9796) < 0.001, 'reduced mass: ' + got.mu);
    /* Swapping H for D nearly doubles the reduced mass, and ω goes as 1/√μ,
     * so the band must drop by roughly √2 — exactly √(μ_DCl/μ_HCl) = 1.3943.
     * Same bond, same force constant, and the observed bands (2886 and 2091)
     * give 1.380, which is the right ratio arriving from real spectra. */
    const ratio = got.hcl.wavenumber / got.dcl.wavenumber;
    assert.ok(Math.abs(ratio - 1.3943) < 0.002, 'H/D ratio: ' + ratio);
    assert.ok(Math.abs(ratio - 2886 / 2091) < 0.02,
      'predicted ratio ' + ratio + ' should be close to the observed 1.380');
    /* The lowest level is half a gap above the floor, never on it. */
    assert.ok(Math.abs(got.hcl.zeroPointEV - got.hcl.spacingEV / 2) < 1e-12);
    assert.ok(got.hcl.zeroPointEV > 0.18, 'zero-point energy: ' + got.hcl.zeroPointEV);
  });

  test('tunnelling falls off a cliff with thickness, and never exceeds certainty', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        widths: [0.05, 0.1, 0.2, 0.5, 1].map((w) => Q.tunnel(1, 5, w).T),
        hand: Q.tunnel(1, 5, 0.1),
        over: Q.tunnel(6, 5, 0.3),
        energies: [0.5, 1, 2, 3, 4].map((E) => Q.tunnel(E, 5, 0.3).T),
      };
    });
    /* Worked by hand: κ = 1.0246 × 10¹⁰ m⁻¹, κa = 1.0246, sinh = 1.2175,
     * T = 1/(1 + 25 × 1.482 / 16) = 0.302. */
    assert.ok(Math.abs(got.hand.T - 0.3029) < 0.001, 'T = ' + got.hand.T);
    assert.ok(Math.abs(got.hand.kappa - 1.0246e10) / 1.0246e10 < 1e-3, 'kappa = ' + got.hand.kappa);
    for (let i = 1; i < got.widths.length; i++) {
      assert.ok(got.widths[i] < got.widths[i - 1], 'thicker should mean less: ' + got.widths);
    }
    /* Ten times the thickness costs eight orders of magnitude. */
    assert.ok(got.widths[1] / got.widths[4] > 1e7, 'the cliff is not steep enough');
    got.widths.forEach((T) => assert.ok(T > 0 && T <= 1, 'T out of range: ' + T));
    for (let i = 1; i < got.energies.length; i++) {
      assert.ok(got.energies[i] > got.energies[i - 1], 'more energy should get through more often');
    }
    /* Above the barrier it can still reflect, which has no classical version. */
    assert.ok(got.over.over === true && got.over.T < 1, 'over the barrier: ' + got.over.T);
  });

  test('a finite well holds fewer, lower levels than a perfect box — but never none', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        mid: Q.finiteWell(5, 1),
        shallow: Q.finiteWell(0.02, 0.2),
        deep: Q.finiteWell(5000, 1).levels.slice(0, 3).map((l) => l.eV),
        box: [1, 2, 3].map((n) => Q.boxEnergy(n, 1).eV),
        deeper: Q.finiteWell(20, 1).count,
      };
    });
    /* Every level sits below its box counterpart, because the wave leaks into
     * the walls and so curves less. */
    got.mid.levels.forEach((lv, i) => {
      assert.ok(lv.eV < got.box[i] || i >= got.box.length,
        'level ' + (i + 1) + ' is not below the box level');
    });
    /* And they are ordered, and all inside the well. */
    for (let i = 1; i < got.mid.levels.length; i++) {
      assert.ok(got.mid.levels[i].eV > got.mid.levels[i - 1].eV, 'levels out of order');
    }
    got.mid.levels.forEach((lv) => assert.ok(lv.eV < 5, 'a bound level above the well top'));
    /* However feeble the well, one state survives. In one dimension that is
     * always true, and it is worth a test because the root-finder could easily
     * have missed it. */
    assert.equal(got.shallow.count, 1, 'a very shallow well should still bind one state');
    /* A very deep well converges on the ideal box, which is the check that the
     * numerical answer and the closed form are the same physics. */
    got.deep.forEach((v, i) => assert.ok(Math.abs(v - got.box[i]) / got.box[i] < 0.03,
      'deep well level ' + (i + 1) + ': ' + v + ' against box ' + got.box[i]));
    assert.ok(got.deeper > got.mid.count, 'a deeper well should hold more');
  });

  test('photon arithmetic round-trips, and names the colour', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      const round = [400, 550, 700].map((nm) => Q.photonFromEV(Q.photonFromNM(nm).eV).lambdaNM);
      return { round: round, green: Q.photonFromNM(550).region, uv: Q.photonFromNM(250).region,
        ir: Q.photonFromNM(2000).region, twoEV: Q.photonFromEV(2).lambdaNM };
    });
    got.round.forEach((nm, i) => assert.ok(Math.abs(nm - [400, 550, 700][i]) < 1e-9));
    assert.equal(got.green, 'green');
    assert.equal(got.uv, 'ultraviolet');
    assert.equal(got.ir, 'infrared');
    /* 2 eV is 620 nm, which is the one most worth knowing by heart. */
    assert.ok(Math.abs(got.twoEV - 619.92) < 0.01, '2 eV is ' + got.twoEV + ' nm');
  });

  test('uncertainty gives the energy scale of an atom', async () => {
    const got = await run(() => window.ME.quantum.uncertainty(0.05));
    /* Pin an electron to half an atom and it must carry about an electronvolt,
     * which is why chemistry happens at the energies it does. */
    assert.ok(Math.abs(got.dp - 1.0546e-24) / 1.0546e-24 < 0.001, 'dp = ' + got.dp);
    assert.ok(got.energyEV > 3 && got.energyEV < 4.5, 'energy = ' + got.energyEV + ' eV');
    assert.ok(got.speed > 1e6, 'speed = ' + got.speed);
  });

  test('every quantum problem can be re-derived from the numbers in its own question', async () => {
    /* Same discipline as the rest of the suite: parse the question text, work
     * the answer out a second way, and compare. A generator that printed one
     * set of numbers and graded against another would not survive this. */
    const bad = await run(() => {
      const Q = window.ME.quantum, out = [];
      for (let i = 1; i <= 60; i++) {
        const seed = i * 7919;

        const box = window.ME.practice.generate('qm-box-energy', seed);
        const bm = /box ([\d.]+) nm wide.*n = (\d+)/.exec(box.q);
        if (!bm) { out.push(['qm-box-energy', 'could not read the question', box.q]); continue; }
        const mine = Q.boxEnergy(Number(bm[2]), Number(bm[1])).eV;
        if (Math.abs(mine - box.answer) > 1e-9) out.push(['qm-box-energy', mine, box.answer]);

        const ph = window.ME.practice.generate('qm-photon', seed);
        const asNM = /([\d.]+) eV\. What is its wavelength/.exec(ph.q);
        const asEV = /wavelength (\d+) nm/.exec(ph.q);
        if (asNM) {
          const want = Q.HC_EV_NM / Number(asNM[1]);
          if (Math.abs(want - ph.answer) > 1e-9) out.push(['qm-photon nm', want, ph.answer]);
        } else if (asEV) {
          const want = Q.HC_EV_NM / Number(asEV[1]);
          if (Math.abs(want - ph.answer) > 1e-9) out.push(['qm-photon eV', want, ph.answer]);
        } else out.push(['qm-photon', 'unreadable', ph.q]);

        const hy = window.ME.practice.generate('qm-hydrogen-line', seed);
        const hm = /n = (\d+) to n = (\d+)/.exec(hy.q);
        if (hm) {
          const want = Q.hydrogenTransition(Number(hm[1]), Number(hm[2])).lambdaNM;
          if (Math.abs(want - hy.answer) > 1e-9) out.push(['qm-hydrogen-line', want, hy.answer]);
        }

        const nd = window.ME.practice.generate('qm-box-nodes', seed);
        const nm2 = /n = (\d+) wavefunction/.exec(nd.q);
        if (nm2 && Number(nm2[1]) - 1 !== nd.answer) out.push(['qm-box-nodes', nm2[1], nd.answer]);

        const tn = window.ME.practice.generate('qm-tunnel', seed);
        const tm = /with ([\d.]+) eV meets a barrier ([\d.]+) eV high and ([\d.]+) nm/.exec(tn.q);
        if (tm) {
          const want = Q.tunnel(Number(tm[1]), Number(tm[2]), Number(tm[3])).T;
          if (Math.abs(want - tn.answer) > 1e-12) out.push(['qm-tunnel', want, tn.answer]);
        }
      }
      return out;
    });
    assert.deepEqual(bad.slice(0, 6), [], JSON.stringify(bad.slice(0, 6)));
  });

  test('every page of the tab builds, with no gaps in the prose', async () => {
    const bad = await run(() => {
      const out = [];
      const host = document.createElement('div');
      document.body.appendChild(host);
      window.ME.quantumview.PAGES.forEach((pg) => {
        let node;
        try { node = pg.build(); }
        catch (e) { out.push([pg.id, 'threw: ' + e.message]); return; }
        const holder = document.createElement('div');
        holder.appendChild(node);
        const text = holder.textContent;
        if (text.length < 900) out.push([pg.id, 'only ' + text.length + ' characters']);
        if (/undefined|NaN|\[object/.test(text)) {
          out.push([pg.id, (text.match(/.{0,50}(undefined|NaN|\[object).{0,50}/) || [''])[0]]);
        }
      });
      host.remove();
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });
});

/* ------------------------------------------- the rest of quantum physics */
describe('quantum physics beyond the equation', () => {
  test('the second batch of derived constants matches the measured values', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        wienB: Q.WIEN_B, wienX: Q.WIEN_X, stefan: Q.STEFAN,
        magneton: Q.BOHR_MAGNETON, compton: Q.COMPTON,
        alpha: Q.FINE_STRUCTURE, invAlpha: 1 / Q.FINE_STRUCTURE,
      };
    });
    /* Not one of these is typed into the app. The Wien constant needs a
     * transcendental equation solved, Stefan–Boltzmann is 2π⁵k⁴/15h³c², the
     * magneton is eℏ/2mₑ, and α is e²/4πε₀ℏc. */
    assert.ok(Math.abs(got.wienX - 4.965114) < 1e-5, 'Wien root: ' + got.wienX);
    assert.ok(Math.abs(got.wienB - 2.897772e-3) / 2.897772e-3 < 1e-5, 'Wien b: ' + got.wienB);
    assert.ok(Math.abs(got.stefan - 5.670374e-8) / 5.670374e-8 < 1e-5, 'Stefan: ' + got.stefan);
    assert.ok(Math.abs(got.magneton - 9.2740100e-24) / 9.274e-24 < 1e-6, 'magneton: ' + got.magneton);
    assert.ok(Math.abs(got.compton - 2.42631023e-12) / 2.426e-12 < 1e-6, 'Compton: ' + got.compton);
    /* The famous one. */
    assert.ok(Math.abs(got.invAlpha - 137.035999) < 0.0001, '1/alpha = ' + got.invAlpha);
  });

  test('hot objects peak where they are measured to peak', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      /* Find the peak of the Planck curve by brute force and check it lands
       * on the Wien prediction — two independent routes to the same number. */
      const brute = (T) => {
        let best = 0, at = 0;
        for (let nm = 20; nm < 40000; nm += 1) {
          const v = Q.planck(nm, T).quantum;
          if (v > best) { best = v; at = nm; }
        }
        return at;
      };
      return {
        sun: Q.wienPeak(5772).lambdaNM, sunBrute: brute(5772),
        body: Q.wienPeak(310).lambdaNM, bodyBrute: brute(310),
        sunRegion: Q.wienPeak(5772).region,
        bodyRegion: Q.wienPeak(310).region,
        /* The catastrophe: at short wavelengths the classical answer runs away. */
        catastrophe: Q.planck(100, 5772).classical / Q.planck(100, 5772).quantum,
        agreeLong: Q.planck(30000, 5772).classical / Q.planck(30000, 5772).quantum,
        power: Q.stefanBoltzmann(5772),
      };
    });
    assert.ok(Math.abs(got.sun - 502) < 1, 'the Sun peaks at ' + got.sun + ' nm');
    assert.ok(Math.abs(got.sun - got.sunBrute) < 2, 'Wien and the curve disagree: '
      + got.sun + ' against ' + got.sunBrute);
    assert.ok(Math.abs(got.body - got.bodyBrute) < 20, 'body heat: ' + got.body + ' / ' + got.bodyBrute);
    assert.equal(got.sunRegion, 'green');
    assert.equal(got.bodyRegion, 'infrared');
    /* Classical physics is wrong by a factor of billions in the ultraviolet
     * and right to a per cent in the far infrared, which is exactly the shape
     * of the failure Planck was fixing. */
    assert.ok(got.catastrophe > 1e8, 'the catastrophe is not steep enough: ' + got.catastrophe);
    assert.ok(Math.abs(got.agreeLong - 1) < 0.05, 'the two should agree at long wavelengths: '
      + got.agreeLong);
    /* The Sun's surface radiates about 63 MW per square metre. */
    assert.ok(Math.abs(got.power - 6.29e7) / 6.29e7 < 0.01, 'solar flux: ' + got.power);
  });

  test('the photoelectric effect has a threshold, and brightness never beats it', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        sodium400: Q.photoelectric(400, 2.28),
        sodium600: Q.photoelectric(600, 2.28),
        threshold: Q.photoelectric(400, 2.28).thresholdNM,
        /* The slope of KE against frequency has to be h, whatever the metal. */
        /* Both wavelengths must clear the threshold for every metal here, or
         * the clamp at zero flattens the line and the slope is meaningless —
         * which is exactly what platinum did on the first attempt. */
        slopes: [2.1, 2.28, 4.3, 5.6].map((phi) => {
          const a = Q.photoelectric(120, phi), b = Q.photoelectric(150, phi);
          const hOverE = window.ME.fmt.CONST.h / window.ME.fmt.CONST.e;
          const f1 = window.ME.quantum.photonFromNM(120).eV / hOverE;
          const f2 = window.ME.quantum.photonFromNM(150).eV / hOverE;
          return (a.kineticEV - b.kineticEV) / (f1 - f2);
        }),
        /* And the clamp itself is right: below threshold it is zero, not negative. */
        belowThreshold: Q.photoelectric(700, 5.6).kineticEV,
      };
    });
    assert.ok(Math.abs(got.sodium400.kineticEV - 0.8196) < 0.001, got.sodium400.kineticEV);
    /* Below threshold the answer is exactly zero, not a small number. */
    assert.equal(got.sodium600.emits, false);
    assert.equal(got.sodium600.kineticEV, 0);
    assert.ok(Math.abs(got.threshold - 543.8) < 0.5, 'threshold: ' + got.threshold);
    /* Every metal gives the same slope, in eV per hertz, and that slope is
     * Planck's constant: h/e = 4.1357 × 10⁻¹⁵ eV·s. Four different work
     * functions, one slope — which is what made the experiment decisive. */
    got.slopes.forEach((s, i) => assert.ok(Math.abs(s / 4.135667696e-15 - 1) < 1e-9,
      'slope ' + i + ' should be h/e: ' + s));
    assert.equal(got.belowThreshold, 0, 'below threshold the answer is zero, never negative');
  });

  test('Compton shifts by the same amount whatever you start with', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        at90: [0.01, 0.0709, 0.5].map((nm) => Q.compton(nm, 90).shiftNM * 1000),
        at180: Q.compton(0.0709, 180).shiftNM * 1000,
        at0: Q.compton(0.0709, 0).shiftNM,
        electronGains: Q.compton(0.0709, 90).electronEV,
      };
    });
    /* The whole point of the formula: the starting wavelength is not in it. */
    got.at90.forEach((s) => assert.ok(Math.abs(s - 2.42631) < 1e-4,
      '90° shift should always be the Compton wavelength: ' + s));
    assert.ok(Math.abs(got.at180 - 4.85262) < 1e-3, 'backscatter is twice: ' + got.at180);
    assert.ok(Math.abs(got.at0) < 1e-15, 'straight through means no shift: ' + got.at0);
    assert.ok(got.electronGains > 0, 'the electron has to gain what the photon lost');
  });

  test('de Broglie wavelengths come out at the scales that matter', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        v100: Q.deBroglieFromVolts(100).lambdaNM,
        v100k: Q.deBroglieFromVolts(100000).lambdaNM,
        ball: Q.deBroglieFromSpeed(0.145, 40).lambdaNM,
        /* Doubling the voltage divides the wavelength by root two. */
        ratio: Q.deBroglieFromVolts(100).lambdaNM / Q.deBroglieFromVolts(400).lambdaNM,
      };
    });
    /* The standard result: 1.226 nm over the square root of the voltage. */
    assert.ok(Math.abs(got.v100 - 0.12264) < 1e-5, '100 V electron: ' + got.v100);
    assert.ok(got.v100k < 0.005, 'an electron microscope beats an atom: ' + got.v100k);
    /* And the reason nobody noticed for three centuries. */
    assert.ok(got.ball < 1e-24, 'a cricket ball: ' + got.ball + ' nm');
    assert.ok(Math.abs(got.ratio - 2) < 1e-9, 'four times the volts is half the wavelength: ' + got.ratio);
  });

  test('Bohr orbits hold a whole number of de Broglie wavelengths', async () => {
    /* This is the identity that turned Bohr's unexplained rule into a
     * standing wave, so it had better be exact rather than close. */
    const bad = await run(() => {
      const Q = window.ME.quantum, out = [];
      for (let n = 1; n <= 8; n++) {
        const b = Q.bohr(n);
        const waves = b.circumferenceNM / b.deBroglieNM;
        if (Math.abs(waves - n) > 1e-9) out.push([n, waves]);
        /* Relative, not absolute: the engine derives a₀ from the constants and
         * the literal 0.0529177 is rounded, which at n = 8 is a bigger gap
         * than an absolute tolerance should forgive. */
        const want = n * n * (window.ME.fmt.CONST.bohrRadius * 1e9);
        if (Math.abs(b.radiusNM / want - 1) > 1e-12) out.push([n, 'radius ' + b.radiusNM]);
      }
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('angular momentum is longer than its own biggest component', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return [0, 1, 2, 3].map((l) => {
        const a = Q.angularMomentum(l);
        return { l: l, mag: a.magnitude, count: a.count, minAngle: a.minAngleDeg, label: a.label };
      });
    });
    assert.deepEqual(got.map((x) => x.count), [1, 3, 5, 7]);
    assert.deepEqual(got.map((x) => x.label), ['s', 'p', 'd', 'f']);
    got.forEach((x) => {
      if (x.l === 0) { assert.equal(x.minAngle, null); return; }
      /* √(ℓ(ℓ+1)) is always more than ℓ, which is why it can never lie along
       * the axis — the whole content of the cone picture. */
      assert.ok(x.mag > x.l, 'l=' + x.l + ': ' + x.mag);
      assert.ok(x.minAngle > 0, 'l=' + x.l + ' should never reach the axis');
    });
    assert.ok(Math.abs(got[1].mag - Math.SQRT2) < 1e-12);
    assert.ok(Math.abs(got[2].minAngle - 35.264) < 0.01, 'd orbital tilt: ' + got[2].minAngle);
  });

  test('shells, the filling order and the shape of the table', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        capacities: [1, 2, 3, 4, 5].map((n) => Q.shellCapacity(n).total),
        order: Q.aufbauOrder(14).map((x) => x.label).join(' '),
        blocks: [0, 1, 2, 3].map((l) => Q.angularMomentum(l).count * 2),
      };
    });
    assert.deepEqual(got.capacities, [2, 8, 18, 32, 50], '2n²');
    /* 4s before 3d, 5s before 4d, 6s before 4f — the n+ℓ rule, which is why
     * the table has the shape it has. */
    assert.equal(got.order, '1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d');
    assert.deepEqual(got.blocks, [2, 6, 10, 14], 'the widths of the s, p, d and f blocks');
  });

  test('Moseley gets the X-ray lines close enough to order the elements', async () => {
    const got = await run(() => [20, 26, 29, 42, 47].map((Z) => window.ME.quantum.moseley(Z).energyEV));
    /* Measured Kα: Ca 3.69, Fe 6.40, Cu 8.05, Mo 17.48, Ag 22.16 keV. A
     * one-parameter formula from 1913, within a couple of per cent. */
    [[3690, 20], [6400, 26], [8050, 29], [17480, 42], [22160, 47]].forEach(([want, Z], i) => {
      const err = Math.abs(got[i] - want) / want;
      assert.ok(err < 0.05, 'Z=' + Z + ': ' + Math.round(got[i]) + ' eV against ' + want);
    });
    /* And the ordering is strictly monotonic, which is the point of it. */
    for (let i = 1; i < got.length; i++) assert.ok(got[i] > got[i - 1]);
  });

  test('a bond is a wave added, and four electrons undo it', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      const r = Q.lcao(-13.6, 2.5);
      return {
        bonding: r.bondingEV, anti: r.antibondingEV, atomic: r.atomicEV,
        asymmetry: r.asymmetry, four: r.fourElectronsEV,
        orders: [Q.bondOrder(2, 0), Q.bondOrder(2, 2), Q.bondOrder(4, 2), Q.bondOrder(2, 1)],
      };
    });
    /* Bonding below, antibonding above — the first version of this had them
     * the wrong way round, which is why the test checks the direction. */
    assert.ok(got.bonding < got.atomic, 'bonding must sit below the atomic level');
    assert.ok(got.anti > got.atomic, 'antibonding must sit above it');
    /* And the rise beats the drop, which is the whole explanation of He₂. */
    assert.ok(got.asymmetry > 1, 'the antibonding level must rise by more: ' + got.asymmetry);
    assert.ok(got.four > 0, 'four electrons must come out net repulsive: ' + got.four);
    assert.deepEqual(got.orders, [1, 0, 1, 0.5]);
  });

  test('the box predicts butadiene, and admits where it drifts', async () => {
    const got = await run(() => [2, 3, 4, 5].map((k) => window.ME.quantum.conjugatedBox(k).lambdaNM));
    /* Butadiene really absorbs at 217 nm, and the free-electron model gets
     * within five per cent with no chemistry in it at all. */
    assert.ok(Math.abs(got[0] - 217) / 217 < 0.06, 'butadiene: ' + got[0] + ' nm');
    /* And it drifts steadily too red for longer chains, because a real chain
     * is not a flat box. The page says so rather than hiding it. */
    assert.ok(got[3] > 334, 'the model should over-predict for longer chains: ' + got[3]);
    for (let i = 1; i < got.length; i++) {
      assert.ok(got[i] > got[i - 1], 'longer conjugation must absorb redder');
    }
  });

  test('band gaps map onto the colours the LEDs actually are', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return [['Si', 1.12], ['GaAs', 1.42], ['GaP', 2.26], ['GaN', 3.4], ['diamond', 5.5]]
        .map(([n, g]) => [n, Q.bandGap(g).lambdaNM, Q.bandGap(g).region, Q.bandGap(g).kind]);
    });
    const by = {};
    got.forEach(([n, nm, region, kind]) => { by[n] = { nm: nm, region: region, kind: kind }; });
    /* Silicon's gap puts its light in the infrared, which is exactly why
     * there is no silicon LED. */
    assert.equal(by.Si.region, 'infrared');
    assert.ok(Math.abs(by.Si.nm - 1107) < 2, 'silicon: ' + by.Si.nm);
    assert.equal(by.GaP.region, 'green');
    assert.equal(by.GaN.region, 'ultraviolet');
    /* Gallium nitride is a wide-gap semiconductor, not an insulator — an
     * earlier threshold in this code called it one. */
    assert.equal(by.GaN.kind, 'semiconductor');
    assert.equal(by.diamond.kind, 'insulator');
  });

  test('the two statistics behave the way their rules demand', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        atMu: Q.occupancy(0, 0, 300).fermiDirac,
        wayBelow: Q.occupancy(-1, 0, 300).fermiDirac,
        wayAbove: Q.occupancy(1, 0, 300).fermiDirac,
        cold: Q.occupancy(0.05, 0, 5).fermiDirac,
        warm: Q.occupancy(0.05, 0, 2000).fermiDirac,
        boseBig: Q.occupancy(0.0005, 0, 300).boseEinstein,
        /* Far from the chemical potential the two quantum curves and the
         * classical one all agree, which is why classical statistics works
         * for a thin gas. */
        fdFar: Q.occupancy(0.5, 0, 300).fermiDirac,
        mbFar: Q.occupancy(0.5, 0, 300).boltzmann,
      };
    });
    /* Fermi–Dirac is exactly a half at the chemical potential, at any
     * temperature. That is what the chemical potential means. */
    assert.ok(Math.abs(got.atMu - 0.5) < 1e-12, 'f(μ) should be 0.5: ' + got.atMu);
    assert.ok(got.wayBelow > 0.999, 'states well below should be full');
    assert.ok(got.wayAbove < 0.001, 'states well above should be empty');
    /* Cold makes the edge a cliff, warm softens it. */
    assert.ok(got.cold < 1e-40, 'at 5 K the cliff should be absolute: ' + got.cold);
    assert.ok(got.warm > 0.3, 'at 2000 K it should be well smeared: ' + got.warm);
    /* Bosons pile up without limit; fermions never exceed one. */
    assert.ok(got.boseBig > 10, 'bosons should crowd in: ' + got.boseBig);
    assert.ok(Math.abs(got.fdFar - got.mbFar) / got.mbFar < 0.01,
      'far from μ the quantum and classical answers must agree');
  });

  test('a laser cannot run on thermal populations', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        visible: Q.boltzmannRatio(2.2, 298).ratio,
        ir: Q.boltzmannRatio(0.025, 298).ratio,
        thermalEV: Q.boltzmannRatio(1, 298).thermalEV,
        hot: Q.boltzmannRatio(2.2, 5000).ratio,
      };
    });
    /* One in 10³⁷ for a visible transition at room temperature, which is zero
     * in any real sample — hence pumping. */
    assert.ok(got.visible < 1e-35, 'visible upper state fraction: ' + got.visible);
    assert.ok(got.ir > 0.1, 'an infrared gap is comparable with kT: ' + got.ir);
    assert.ok(Math.abs(got.thermalEV - 0.02568) < 0.0005, 'kT at 298 K: ' + got.thermalEV);
    /* Even at 5000 K it never reaches one, which is why no temperature gives
     * an inversion. */
    assert.ok(got.hot < 1, 'a thermal population can never invert: ' + got.hot);
  });

  test('Bell: the quantum prediction beats anything decided in advance', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        optimal: Q.bell(0, 90, 45, 135),
        aligned: Q.bell(0, 0, 0, 0),
        /* Scan a lot of angle choices: nothing may ever exceed 2√2, and
         * plenty of ordinary choices do not violate the classical bound at
         * all — the violation is not automatic, it has to be arranged. */
        scanMax: (() => {
          let worst = 0, belowTwo = 0, n = 0;
          for (let a = 0; a < 180; a += 15) {
            for (let ap = 0; ap < 180; ap += 15) {
              for (let bb = 0; bb < 180; bb += 15) {
                for (let bp = 0; bp < 180; bp += 15) {
                  const m = Q.bell(a, ap, bb, bp).magnitude;
                  worst = Math.max(worst, m);
                  if (m <= 2 + 1e-9) belowTwo++;
                  n++;
                }
              }
            }
          }
          return { worst: worst, belowTwo: belowTwo, n: n };
        })(),
      };
    });
    assert.ok(Math.abs(got.optimal.magnitude - 2 * Math.SQRT2) < 1e-9,
      'the optimal angles should give exactly 2√2: ' + got.optimal.magnitude);
    assert.equal(got.optimal.beatsClassical, true);
    assert.ok(Math.abs(got.aligned.magnitude - 2) < 1e-9,
      'aligned detectors should sit exactly on the classical bound: ' + got.aligned.magnitude);
    /* Tsirelson's bound: quantum mechanics beats the classical limit but has
     * a ceiling of its own, and nothing in a scan of 20736 angle choices may
     * exceed it. */
    assert.ok(got.scanMax.worst <= 2 * Math.SQRT2 + 1e-9,
      'something exceeded 2√2: ' + got.scanMax.worst);
    assert.ok(Math.abs(got.scanMax.worst - 2 * Math.SQRT2) < 1e-9,
      'the scan should find the maximum: ' + got.scanMax.worst);
    /* And most choices do not violate anything, which is why Bell tests need
     * their angles chosen deliberately. */
    assert.ok(got.scanMax.belowTwo > got.scanMax.n * 0.4,
      'only ' + got.scanMax.belowTwo + ' of ' + got.scanMax.n + ' choices stay classical');
  });

  test('decay is memoryless, and halves on schedule', async () => {
    const got = await run(() => {
      const Q = window.ME.quantum;
      return {
        halves: [0, 1, 2, 3, 10].map((k) => Q.decay(1, k).fraction),
        /* Memoryless: surviving three half-lives and then one more is the
         * same as one more from the start. */
        conditional: Q.decay(1, 4).fraction / Q.decay(1, 3).fraction,
        meanVsHalf: Q.decay(1, 1).meanLife,
      };
    });
    [1, 0.5, 0.25, 0.125, Math.pow(0.5, 10)].forEach((want, i) => {
      assert.ok(Math.abs(got.halves[i] - want) < 1e-12, 'half-life ' + i + ': ' + got.halves[i]);
    });
    assert.ok(Math.abs(got.conditional - 0.5) < 1e-12,
      'an old atom must be exactly as likely to go as a new one: ' + got.conditional);
    /* The mean life is 1/ln2 of the half-life, which surprises people. */
    assert.ok(Math.abs(got.meanVsHalf - 1 / Math.LN2) < 1e-12, 'mean life: ' + got.meanVsHalf);
  });

  test('uncertainty computed from the box is never below the limit', async () => {
    const bad = await run(() => {
      const out = [];
      for (let n = 1; n <= 30; n++) {
        const s = window.ME.quantum.boxStats(n, 1);
        if (s.timesTheLimit < 1) out.push([n, s.timesTheLimit]);
        if (Math.abs(s.meanXNM - 0.5) > 1e-12) out.push([n, 'mean position ' + s.meanXNM]);
      }
      /* The ground state is the closest any state gets to the limit. */
      const ground = window.ME.quantum.boxStats(1, 1).timesTheLimit;
      for (let n = 2; n <= 30; n++) {
        if (window.ME.quantum.boxStats(n, 1).timesTheLimit < ground) out.push([n, 'below the ground state']);
      }
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  test('every page in the tab builds, in every group', async () => {
    const got = await run(() => {
      const out = { groups: {}, bad: [], ids: {} };
      window.ME.quantumPages.forEach((pg) => {
        out.groups[pg.group] = (out.groups[pg.group] || 0) + 1;
        if (out.ids[pg.id]) out.bad.push([pg.id, 'duplicate id']);
        out.ids[pg.id] = true;
        let node;
        try { node = pg.build(); } catch (e) { out.bad.push([pg.id, 'threw: ' + e.message]); return; }
        const holder = document.createElement('div');
        holder.appendChild(node);
        const text = holder.textContent;
        if (text.length < 900) out.bad.push([pg.id, 'only ' + text.length + ' characters']);
        if (/undefined|NaN|\[object/.test(text)) {
          out.bad.push([pg.id, (text.match(/.{0,50}(undefined|NaN|\[object).{0,50}/) || [''])[0]]);
        }
      });
      return out;
    });
    assert.deepEqual(got.bad, [], JSON.stringify(got.bad, null, 1));
    /* The tab is meant to cover the subject, not one equation. */
    assert.ok(Object.keys(got.groups).length >= 9,
      'only ' + Object.keys(got.groups).length + ' groups');
    const total = Object.values(got.groups).reduce((a, x) => a + x, 0);
    assert.ok(total >= 40, 'only ' + total + ' pages');
  });

  /* Readability, enforced rather than hoped for.
   *
   * Two things make an explanation hard that no structural test would catch:
   * a sentence so long the reader loses the thread before the verb, and a
   * technical word used before anything has earned it. These two tests pin
   * both, because the prose on these pages is the actual product — a page
   * that builds and renders and is still incomprehensible has failed. */
  test('every page opens with a plain-words summary, and it is plain', async () => {
    const got = await run(() => {
      /* Words that may appear in the body of a page, once the page has built
       * up to them, but never in the summary that is supposed to be readable
       * cold by somebody who has read nothing else. */
      const JARGON = ['eigenvalue', 'eigenstate', 'eigenfunction', 'hamiltonian', 'operator',
        'commutator', 'degenerac', 'orthogonal', 'chemical potential', 'metastable',
        'equipartition', 'observable', 'postulate', 'expectation value', 'wavefunction',
        'amplitude', 'normalis', 'eigen'];
      const bad = [];
      window.ME.quantumPages.forEach((pg) => {
        const short = pg.short || '';
        if (!short) { bad.push([pg.id, 'no short version at all']); return; }
        if (short.length < 120) bad.push([pg.id, 'summary is only ' + short.length + ' characters']);
        if (short.length > 400) bad.push([pg.id, 'summary is ' + short.length + ' characters, too long to be a summary']);
        if (/undefined|NaN|\[object/.test(short)) bad.push([pg.id, 'broken text in summary']);
        /* No equations in the summary: it is prose, in words. */
        if (/[=∫∂ℏψφ]/.test(short)) bad.push([pg.id, 'summary contains equation symbols']);
        const hit = JARGON.filter((j) => short.toLowerCase().indexOf(j) >= 0);
        if (hit.length) bad.push([pg.id, 'summary uses ' + hit.join(', ') + ' before the page earns it']);
      });
      return bad;
    });
    assert.deepEqual(got, [], JSON.stringify(got, null, 1));
  });

  test('no page has a sentence long enough to lose the reader', async () => {
    const LIMIT = 36;
    const got = await run((limit) => {
      const bad = [];
      window.ME.quantumPages.forEach((pg) => {
        const holder = document.createElement('div');
        holder.appendChild(pg.build());
        /* Per paragraph, and a trailing colon ends a sentence: these pages
         * routinely run a sentence into a displayed equation, and joining
         * paragraphs would invent run-ons that no reader ever sees. */
        Array.from(holder.querySelectorAll('p')).forEach((node) => {
          const t = node.textContent.trim();
          if (t.length < 40) return;
          t.split(/(?<=[.?!:])\s+/).forEach((sentence) => {
            const n = sentence.split(/\s+/).filter((w) => w).length;
            if (n > limit) bad.push([pg.id, n + ' words', sentence.slice(0, 110)]);
          });
        });
      });
      return bad;
    }, LIMIT);
    assert.deepEqual(got, [], got.length + ' over-long sentences:\n'
      + got.map((x) => '  ' + x.join(' | ')).join('\n'));
  });

  test('every quantum generator produces a gradeable question', async () => {
    const bad = await run(() => {
      const out = [];
      const keys = window.ME.practice.keys.filter((k) => k.indexOf('qm-') === 0);
      if (keys.length < 30) out.push(['only ' + keys.length + ' quantum generators']);
      keys.forEach((k) => {
        for (let i = 1; i <= 40; i++) {
          const q = window.ME.practice.generate(k, i * 7919);
          if (!q) { out.push([k, 'nothing', i]); break; }
          if (q.kind === 'numeric' && !isFinite(q.answer)) out.push([k, 'answer ' + q.answer, i]);
          if (q.kind === 'choice' && q.options.filter((o) => o.ok).length !== 1) {
            out.push([k, 'not exactly one right option', i]);
          }
          if (/undefined|NaN/.test(q.q)) out.push([k, 'question text: ' + q.q.slice(0, 60), i]);
        }
      });
      return out;
    });
    assert.deepEqual(bad.slice(0, 6), [], JSON.stringify(bad.slice(0, 6)));
  });
});

/* ------------------------------------------------------------ simulations */
describe('every simulation builds', () => {
  /* The page-render test covers the sims a lesson embeds, and not the ones
   * reached only from a tab or a preset. A simulation that throws on
   * construction is invisible until somebody opens the page it is on. */
  test('each one returns a rendered node, with no exception', async () => {
    const bad = await run(() => {
      const out = [];
      const sink = document.createElement('div');
      sink.style.display = 'none';
      document.body.appendChild(sink);
      /* The helpers exported alongside the sims are not sims. */
      const HELPERS = ['shell', 'slider', 'whenVisible', 'css'];
      const names = Object.keys(window.ME.sims)
        .filter((k) => typeof window.ME.sims[k] === 'function' && HELPERS.indexOf(k) < 0);
      if (names.length < 12) out.push(['(only ' + names.length + ' sims found, so this test is checking little)']);
      names.forEach((name) => {
        let node = null;
        try { node = window.ME.sims[name](); }
        catch (e) { out.push([name, 'threw: ' + String(e && e.message || e)]); return; }
        if (!node || !node.nodeType) { out.push([name, 'returned nothing renderable']); return; }
        sink.appendChild(node);
        const text = (node.textContent || '').trim();
        if (text.length < 30) out.push([name, 'rendered only ' + text.length + ' characters']);
        if (/\bundefined\b|\[object Object\]|\bNaN\b/.test(text)) {
          out.push([name, 'rendered a placeholder: ' + text.slice(0, 90)]);
        }
        /* Each one should have produced something to interact with or look at. */
        const interactive = node.querySelectorAll('input, button, canvas, svg, table').length;
        if (!interactive) out.push([name, 'nothing to interact with or look at']);
      });
      sink.remove();
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad, null, 1));
  });

  test('each one is stopped again when it goes off screen', async () => {
    /* A lesson can hold several sims, and three animation loops running on a
     * page nobody is looking at is a flat battery. Every sim that animates
     * must register with whenVisible rather than starting unconditionally. */
    const got = await run(() => {
      const src = window.ME.sims.statesOfMatter.toString() + window.ME.sims.heatingCurve.toString() +
        window.ME.sims.equilibrium.toString() + window.ME.sims.titration.toString();
      return { usesWhenVisible: /whenVisible/.test(src) };
    });
    assert.equal(got.usesWhenVisible, true);
  });
});

/* ------------------------------------------------------- searching the app */
describe('the search bar finds more than molecules', () => {
  /* The search box was built for molecules, which left the course, the
   * calculators and the reference tables reachable only by knowing which tab
   * they lived in. These are the queries a reader would actually type. */
  const EXPECTED = [
    ['limiting reactant', 'Limiting reactant'],
    ['molar mass', 'Molar mass'],
    ['le chatelier', 'Pushing an equilibrium about'],
    ['octet', 'Covalent bonding and Lewis structures'],
    ['vsepr', 'Molecular shapes: VSEPR'],
    ['hydrogen bonding', 'Forces between molecules, and why water is strange'],
    ['electron configuration', 'Electron configurations, and the filling order'],
    ['sublimation', 'Phase changes, and why the temperature stops'],
    ['gold foil', 'How we found out what is inside'],
    ['criss cross', 'Naming ionic compounds'],
    ['activity series', 'Activity series'],
    ['solubility rules', 'Solubility rules'],
    ['significant figures', 'Significant figures, and not claiming what you do not know'],
    ['freezing point', 'Why salt melts ice'],
    ['ideal gas', 'PV = nRT, and gases in reactions'],
    ['entropy', 'entropy'],
    ['ph', 'pH'],
  ];

  test('every lesson, tool, table and glossary word is in the index', async () => {
    const got = await run(() => {
      const idx = window.ME.siteIndex.all();
      const kinds = {};
      idx.forEach((e) => { kinds[e.kind] = (kinds[e.kind] || 0) + 1; });
      return {
        total: idx.length, kinds: kinds,
        lessons: window.ME.course.allLessons().length,
        tools: window.ME.tools.TOOLS.length,
        sections: window.ME.reference.SECTIONS.length,
        glossary: window.ME.reference.GLOSSARY.length,
        units: window.ME.course.units.length,
        quantumPages: window.ME.quantumPages.length,
      };
    });
    /* Nothing may be missing: every lesson, tool, section and word is indexed. */
    assert.equal(got.kinds.lesson, got.lessons + 1, 'lessons indexed');   /* +1 for the course map */
    assert.equal(got.kinds.unit, got.units);
    assert.equal(got.kinds.reference, got.sections);
    assert.equal(got.kinds.glossary, got.glossary);
    assert.ok(got.kinds.tool >= got.tools, 'tools indexed: ' + got.kinds.tool + ' vs ' + got.tools);
    /* The quantum tab has its own kind, because a page about Bell's theorem is
       not a chemistry lesson and should not be counted as one. */
    assert.equal(got.kinds.quantum, got.quantumPages, 'quantum pages indexed');
  });

  /* The top three, rather than the first place. Several of these queries have
   * two good answers — "molar mass" could reasonably mean the lesson or the
   * calculator — and pinning an order between them would be testing a
   * preference rather than the feature. */
  test('the queries a reader would type land on the right thing', async () => {
    const bad = await run((cs) => cs.map((c) => {
      const hits = window.ME.siteIndex.search(c[0], 3).map((e) => e.title);
      return hits.indexOf(c[1]) >= 0 ? null : [c[0], 'wanted ' + c[1] + ', got ' + JSON.stringify(hits)];
    }).filter(Boolean), EXPECTED);
    assert.deepEqual(bad, [], JSON.stringify(bad, null, 1));
  });

  test('every indexed link actually goes somewhere', async () => {
    const bad = await run(() => {
      const out = [];
      const views = ['learn', 'draw', 'elements', 'balancer', 'gas', 'reactions', 'tools',
        'reference', 'gallery', 'search', 'quantum'];
      window.ME.siteIndex.all().forEach((e) => {
        const parts = e.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
        if (!parts.length || views.indexOf(parts[0]) < 0) { out.push([e.title, e.hash]); return; }
        if (parts[0] === 'learn' && parts[1] && !window.ME.course.lesson(parts[1])) out.push([e.title, e.hash, 'no such lesson']);
        if (parts[0] === 'tools' && parts[1] && !window.ME.tools.TOOLS.some((t) => t.key === parts[1])) out.push([e.title, e.hash, 'no such tool']);
        if (parts[0] === 'reference' && parts[1] && !window.ME.reference.SECTIONS.some((x) => x.key === parts[1])) out.push([e.title, e.hash, 'no such section']);
        if (parts[0] === 'reactions' && parts[1] && !window.ME.reactionsim.REACTIONS.some((x) => x.id === parts[1])) out.push([e.title, e.hash, 'no such reaction']);
        if (parts[0] === 'quantum' && parts[1] && !window.ME.quantumPages.some((x) => x.id === parts[1])) out.push([e.title, e.hash, 'no such quantum page']);
      });
      return out;
    });
    assert.deepEqual(bad, [], JSON.stringify(bad.slice(0, 6)));
  });

  test('nonsense finds nothing rather than everything', async () => {
    const got = await run(() => [
      window.ME.siteIndex.search('qzxwv', 5).length,
      window.ME.siteIndex.search('', 5).length,
      /* Two words that both occur, in different entries, should not match
       * something that contains neither together. */
      window.ME.siteIndex.search('entropy titration', 5).length,
    ]);
    assert.equal(got[0], 0);
    assert.equal(got[1], 0);
    assert.equal(got[2], 0);
  });
});

/* ------------------------------------------------- colligative properties */
describe('freezing and boiling point shifts', () => {
  /* The i factor is the whole content of the topic, and it is read off the
   * formula rather than supplied, so it cannot disagree with the compound. */
  const PARTICLES = [
    ['C6H12O6', 1], ['CH3CH2OH', 1], ['NaCl', 2], ['KBr', 2],
    ['CaCl2', 3], ['MgCl2', 3], ['Na2CO3', 3], ['Na2SO4', 3],
    ['K3PO4', 4], ['Al2(SO4)3', 5], ['NH4Cl', 2], ['(NH4)2SO4', 3],
  ];

  test('counts the particles each formula unit gives', async () => {
    const got = await run((cs) => cs.map((c) => {
      const r = window.ME.solution.particlesPerUnit(c[0]);
      return [c[0], r.ok ? r.i : 'refused: ' + r.error];
    }), PARTICLES);
    got.forEach((g, i) => assert.deepEqual(g, PARTICLES[i], PARTICLES[i][0] + ': got ' + JSON.stringify(g)));
  });

  test('gives the shifts the solutions lesson prints', async () => {
    const got = await run(() => {
      const S = window.ME.solution;
      return {
        kf: window.ME.ref.COLLIGATIVE.solvents.water.Kf,
        sugar: S.freezingPoint('C6H12O6', 1).temperature,
        nacl: S.freezingPoint('NaCl', 1).temperature,
        cacl2: S.freezingPoint('CaCl2', 1).temperature,
        naclBoil: S.boilingPoint('NaCl', 1).temperature,
        cyclohexane: S.freezingPoint('C6H12O6', 1, 'cyclohexane').drop,
      };
    });
    assert.equal(got.kf, 1.86);
    assert.ok(Math.abs(got.sugar + 1.86) < 0.001, 'sugar: ' + got.sugar);
    assert.ok(Math.abs(got.nacl + 3.72) < 0.001, 'NaCl: ' + got.nacl);
    assert.ok(Math.abs(got.cacl2 + 5.58) < 0.001, 'CaCl2: ' + got.cacl2);
    /* Boiling shifts far less than freezing, which is why salting pasta water
     * does nothing useful to the temperature. */
    assert.ok(got.naclBoil - 100 < 1.1, 'NaCl boiling shift: ' + (got.naclBoil - 100));
    /* Cyclohexane is the one used to measure molar masses, because its
     * constant is ten times water's. */
    assert.ok(Math.abs(got.cyclohexane - 20) < 0.001, 'cyclohexane: ' + got.cyclohexane);
  });

  test('every generated name uses one spelling of aluminium and caesium', async () => {
    const got = await run(() => {
      const bad = [];
      ['Al2O3', 'AlCl3', 'Al2(SO4)3', 'Cs2O', 'CsCl', 'Al(OH)3'].forEach((f) => {
        const r = window.ME.naming.nameOf(f);
        if (!r.ok) { bad.push([f, r.error]); return; }
        const blob = r.name + ' ' + (r.steps || []).map((s) => s.text || s).join(' ');
        if (/aluminum|cesium/i.test(blob)) bad.push([f, r.name]);
      });
      /* And the American spellings must still be accepted as input. */
      ['aluminum oxide', 'aluminium oxide', 'cesium chloride', 'caesium chloride'].forEach((n) => {
        if (!window.ME.naming.formulaOf(n).ok) bad.push([n, 'no longer readable']);
      });
      return bad;
    });
    assert.deepEqual(got, [], JSON.stringify(got));
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
