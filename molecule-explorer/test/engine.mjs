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
