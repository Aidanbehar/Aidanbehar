/* Logic tests, run inside the actual built file.
 *
 * These load dist/molecule-explorer.html in a real browser with the network
 * off and exercise the modules directly, so what is tested is the artifact
 * that ships rather than a separate copy of the source.
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

/* ------------------------------------------------------------------ search */
describe('search', () => {
  test('finds an exact name', async () => {
    const r = await run((q) => window.ME.search.search(q).results.map((x) => x.m.n), 'caffeine');
    assert.equal(r[0], 'Caffeine');
  });

  test('ignores case', async () => {
    for (const q of ['CAFFEINE', 'CaFfEiNe', 'caffeine']) {
      const r = await run((s) => window.ME.search.search(s).results[0].m.n, q);
      assert.equal(r, 'Caffeine', `failed for ${q}`);
    }
  });

  test('ignores whitespace and hyphens', async () => {
    for (const q of ['sodium chloride', 'sodium-chloride', '  sodiumchloride  ', 'Sodium   Chloride']) {
      const r = await run((s) => window.ME.search.search(s).results[0].m.n, q);
      assert.equal(r, 'Sodium chloride', `failed for ${q}`);
    }
  });

  test('tolerates typos', async () => {
    const cases = [
      ['caffiene', 'Caffeine'],
      ['asprin', 'Aspirin'],
      ['ibuprofin', 'Ibuprofen'],
      ['acetominophen', 'Paracetamol'],
      ['gluocse', 'Glucose'],
      ['benzine', 'Benzene'],
    ];
    for (const [q, want] of cases) {
      const r = await run((s) => window.ME.search.search(s).results.slice(0, 3).map((x) => x.m.n), q);
      assert.ok(r.includes(want), `"${q}" gave ${JSON.stringify(r)}, wanted ${want} in the top 3`);
    }
  });

  test('knows everyday synonyms', async () => {
    const cases = [
      ['vitamin c', 'Vitamin C'],
      ['table salt', 'Sodium chloride'],
      ['baking soda', 'Sodium bicarbonate'],
      ['rubbing alcohol', 'Isopropanol'],
      ['laughing gas', 'Nitrous oxide'],
      ['epsom salts', 'Magnesium sulfate'],
      ['wood alcohol', 'Methanol'],
      ['dry ice', 'Carbon dioxide'],
      ['mothballs', 'Naphthalene'],
      ['antifreeze', 'Ethylene glycol'],
    ];
    for (const [q, want] of cases) {
      const r = await run((s) => window.ME.search.search(s).results.slice(0, 3).map((x) => x.m.n), q);
      assert.ok(r.includes(want), `"${q}" gave ${JSON.stringify(r)}, wanted ${want}`);
    }
  });

  test('searches by molecular formula', async () => {
    const r = await run(() => {
      const out = window.ME.search.search('C8H10N4O2');
      return { kind: out.kind, names: out.results.map((x) => x.m.n) };
    });
    assert.equal(r.kind, 'formula');
    assert.ok(r.names.includes('Caffeine'), JSON.stringify(r.names));
  });

  test('a shared formula returns every molecule that has it', async () => {
    const r = await run(() => window.ME.search.search('C2H6O').results.map((x) => x.m.n));
    assert.ok(r.includes('Ethanol'), JSON.stringify(r));
    assert.ok(r.includes('Dimethyl ether'), JSON.stringify(r));
  });

  test('formula element order does not matter', async () => {
    const a = await run(() => window.ME.search.search('C8H10N4O2').results.map((x) => x.m.n));
    const b = await run(() => window.ME.search.search('N4C8O2H10').results.map((x) => x.m.n));
    assert.deepEqual(a, b);
  });

  test('searches by SMILES', async () => {
    const cases = [['CCO', 'Ethanol'], ['CN1C=NC2=C1C(=O)N(C)C(=O)N2C', 'Caffeine'], ['c1ccccc1', 'Benzene']];
    for (const [smi, want] of cases) {
      const r = await run((s) => {
        const out = window.ME.search.search(s);
        return { kind: out.kind, name: out.results[0] && out.results[0].m.n };
      }, smi);
      assert.equal(r.kind, 'structure', `${smi} was read as ${r.kind}`);
      assert.equal(r.name, want);
    }
  });

  test('a SMILES written a different way still matches', async () => {
    /* "OCC" and "CCO" are the same molecule spelled from opposite ends. */
    const r = await run(() => window.ME.search.search('OCC').results[0].m.n);
    assert.equal(r, 'Ethanol');
  });

  test('an unknown term returns nothing rather than nonsense', async () => {
    const r = await run(() => window.ME.search.search('qwertyuiopasdf').results.length);
    assert.equal(r, 0);
  });
});

/* -------------------------------------------------------------- validation */
describe('validation', () => {
  test('a carbon with five bonds is explained, not just flagged', async () => {
    const r = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      const c = M.addAtom(g, 0, 0, 'C');
      for (let k = 0; k < 5; k++) {
        const a = M.addAtom(g, Math.cos(k), Math.sin(k), 'C');
        M.addBond(g, c, a, 1);
      }
      const atoms = g.atoms.map((a) => ({ sym: a.sym, charge: 0, explicitH: 0 }));
      return window.ME.chem.validateGraph(atoms, g.bonds);
    });
    assert.equal(r.length, 1);
    assert.match(r[0].title, /Carbon with 5 bonds/);
    assert.match(r[0].text, /four electrons to share/);
    assert.match(r[0].text, /four hands/);
    assert.match(r[0].text, /Try removing one bond/);
  });

  test('legitimate ions and hypervalent atoms are not flagged', async () => {
    const cases = {
      'ammonium': '[NH4+]',
      'hydroxide': '[OH-]',
      'sulfate': '[O-]S(=O)(=O)[O-]',
      'nitrate': '[N+](=O)([O-])[O-]',
      'carbonate': '[O-]C(=O)[O-]',
      'phosphate': 'OP(=O)(O)O',
      'permanganate': '[O-][Mn](=O)(=O)=O',
      'dichromate': '[O-][Cr](=O)(=O)O[Cr](=O)(=O)[O-]',
      'DMSO (S with 3 bonds)': 'CS(C)=O',
      'sulfuric acid (S with 6)': 'OS(=O)(=O)O',
      'sulfur hexafluoride': 'FS(F)(F)(F)(F)F',
      'phosphorus pentachloride': 'ClP(Cl)(Cl)(Cl)Cl',
      'table salt (ionic)': '[Na+].[Cl-]',
      'calcium carbonate': '[Ca+2].[O-]C([O-])=O',
      'borate (B with 4)': '[B-](O)(O)(O)O',
      'trimethylamine N-oxide': 'C[N+](C)(C)[O-]',
      'ozone': '[O-][O+]=O',
      'carbon monoxide': '[C-]#[O+]',
      'diazomethane': 'C=[N+]=[N-]',
      'perchlorate': '[O-]Cl(=O)(=O)=O',
      'xenon tetrafluoride': 'F[Xe](F)(F)F',
      'iron(III) chloride': 'Cl[Fe](Cl)Cl',
      'benzene': 'c1ccccc1',
      'caffeine': 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C',
      'ATP': 'Nc1ncnc2c1ncn2C1OC(COP(=O)(O)OP(=O)(O)OP(=O)(O)O)C(O)C1O',
    };
    const out = await run((c) => {
      const res = {};
      for (const k in c) {
        try {
          const mol = window.ME.chem.fromSmiles(c[k]);
          res[k] = window.ME.chem.validateMolecule(mol).map((p) => p.title);
        } catch (e) { res[k] = ['PARSE ERROR: ' + e.message]; }
      }
      return res;
    }, cases);
    const bad = Object.entries(out).filter(([, v]) => v.length);
    assert.equal(bad.length, 0, 'wrongly flagged: ' + JSON.stringify(bad));
  });

  test('genuinely impossible structures are still caught', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      function build(sym, n, charge) {
        const g = M.emptyGraph();
        const c = M.addAtom(g, 0, 0, sym);
        g.atoms[0].charge = charge || 0;
        for (let k = 0; k < n; k++) {
          const a = M.addAtom(g, Math.cos(k), Math.sin(k), 'C');
          M.addBond(g, c, a, 1);
        }
        return window.ME.chem.validateGraph(
          g.atoms.map((a) => ({ sym: a.sym, charge: a.charge || 0, explicitH: 0 })), g.bonds).length;
      }
      return {
        hydrogenWithTwo: build('H', 2),
        oxygenWithThree: build('O', 3),
        nitrogenWithFour: build('N', 4),
        nitrogenWithFourPlus: build('N', 4, 1),
        fluorineWithTwo: build('F', 2),
        carbonWithFour: build('C', 4),
      };
    });
    assert.ok(out.hydrogenWithTwo > 0, 'two bonds on hydrogen should be flagged');
    assert.ok(out.oxygenWithThree > 0, 'three bonds on neutral oxygen should be flagged');
    assert.ok(out.nitrogenWithFour > 0, 'four bonds on neutral nitrogen should be flagged');
    assert.equal(out.nitrogenWithFourPlus, 0, 'ammonium-style N+ with four bonds is fine');
    assert.ok(out.fluorineWithTwo > 0, 'two bonds on fluorine should be flagged');
    assert.equal(out.carbonWithFour, 0, 'four bonds on carbon is exactly right');
  });
});

/* -------------------------------------------------- formula and molar mass */
describe('formula and molar mass', () => {
  test('matches known values', async () => {
    const cases = [
      ['CCO', 'C2H6O', 46.07],
      ['CN1C=NC2=C1C(=O)N(C)C(=O)N2C', 'C8H10N4O2', 194.19],
      ['CC(=O)Oc1ccccc1C(=O)O', 'C9H8O4', 180.16],
      ['O', 'H2O', 18.015],
      ['OC(=O)CC(O)(CC(O)=O)C(O)=O', 'C6H8O7', 192.12],
      ['C', 'CH4', 16.04],
      ['c1ccccc1', 'C6H6', 78.11],
      ['OCC1OC(O)C(O)C(O)C1O', 'C6H12O6', 180.16],
    ];
    const out = await run((c) => c.map(([smi]) => {
      const a = window.ME.chem.analyse(window.ME.chem.fromSmiles(smi));
      return [a.formula, a.mass];
    }), cases);
    cases.forEach(([smi, formula, mass], i) => {
      assert.equal(out[i][0], formula, `formula for ${smi}`);
      assert.ok(Math.abs(out[i][1] - mass) < 0.05, `mass for ${smi}: got ${out[i][1]}, wanted ${mass}`);
    });
  });

  test('implicit hydrogens are filled in automatically while drawing', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      const a = M.addAtom(g, 0, 0, 'C');
      const b = M.addAtom(g, 1, 0, 'C');
      const o = M.addAtom(g, 2, 0, 'O');
      M.addBond(g, a, b, 1);
      M.addBond(g, b, o, 1);
      return {
        h: [M.implicitH(g, a), M.implicitH(g, b), M.implicitH(g, o)],
        formula: window.ME.chem.analyse(M.toMolecule(g)).formula,
      };
    });
    assert.deepEqual(out.h, [3, 2, 1], 'CH3, CH2 and OH');
    assert.equal(out.formula, 'C2H6O');
  });

  test('a double bond takes up two of the four hands', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      const a = M.addAtom(g, 0, 0, 'C');
      const b = M.addAtom(g, 1, 0, 'C');
      M.addBond(g, a, b, 2);
      return [M.implicitH(g, a), window.ME.chem.analyse(M.toMolecule(g)).formula];
    });
    assert.equal(out[0], 2);
    assert.equal(out[1], 'C2H4');
  });

  test('every database entry agrees with its stored formula and mass', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.search.all().forEach((m) => {
        if (!m.m) return;
        try {
          const a = window.ME.chem.analyse(window.ME.chem.fromSmiles(m.m));
          const norm = (f) => {
            const c = {}; const re = /([A-Z][a-z]?)(\d*)/g; let x;
            while ((x = re.exec(f)) !== null) { if (x[1]) c[x[1]] = (c[x[1]] || 0) + (x[2] ? +x[2] : 1); }
            return Object.keys(c).sort().map((k) => k + c[k]).join('');
          };
          if (norm(a.formula) !== norm(m.f)) out.push([m.n, m.f, a.formula]);
          else if (Math.abs(a.mass - m.w) > Math.max(0.5, m.w * 0.002)) out.push([m.n, m.w, a.mass]);
        } catch (e) { out.push([m.n, 'parse error', String(e.message)]); }
      });
      return out;
    });
    assert.equal(bad.length, 0, 'mismatched entries: ' + JSON.stringify(bad.slice(0, 8)));
  });
});

/* ------------------------------------------------------------ recognition */
describe('drawing recognition', () => {
  test('a drawn ethanol is recognised as ethanol', async () => {
    const r = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      const a = M.addAtom(g, 0, 0, 'C');
      const b = M.addAtom(g, 0.87, 0.5, 'C');
      const o = M.addAtom(g, 1.73, 0, 'O');
      M.addBond(g, a, b, 1);
      M.addBond(g, b, o, 1);
      const hit = window.ME.search.recognise(M.toMolecule(g));
      return hit && hit.n;
    });
    assert.equal(r, 'Ethanol');
  });

  test('recognition does not care which end you drew first', async () => {
    const r = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      const o = M.addAtom(g, 0, 0, 'O');
      const b = M.addAtom(g, 0.87, 0.5, 'C');
      const a = M.addAtom(g, 1.73, 0, 'C');
      M.addBond(g, o, b, 1);
      M.addBond(g, b, a, 1);
      const hit = window.ME.search.recognise(M.toMolecule(g));
      return hit && hit.n;
    });
    assert.equal(r, 'Ethanol');
  });

  test('a drawn benzene ring is recognised', async () => {
    const r = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      M.addRing(g, 6, 0, 0, true);
      const hit = window.ME.search.recognise(M.toMolecule(g));
      return hit && hit.n;
    });
    assert.equal(r, 'Benzene');
  });

  test('a drawn acetic acid is recognised', async () => {
    const r = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      const c1 = M.addAtom(g, 0, 0, 'C');
      const c2 = M.addAtom(g, 0.87, 0.5, 'C');
      const o1 = M.addAtom(g, 1.73, 0, 'O');
      const o2 = M.addAtom(g, 0.87, 1.5, 'O');
      M.addBond(g, c1, c2, 1);
      M.addBond(g, c2, o1, 1);
      M.addBond(g, c2, o2, 2);
      const hit = window.ME.search.recognise(M.toMolecule(g));
      return hit && hit.n;
    });
    assert.equal(r, 'Acetic acid');
  });

  test('something that is not in the database is not falsely recognised', async () => {
    const r = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      let prev = M.addAtom(g, 0, 0, 'C');
      for (let k = 1; k < 17; k++) {
        const n = M.addAtom(g, k * 0.87, (k % 2) * 0.5, 'C');
        M.addBond(g, prev, n, 1);
        prev = n;
      }
      const hit = window.ME.search.recognise(M.toMolecule(g));
      return hit && hit.n;
    });
    assert.equal(r, null);
  });

  test('every gallery molecule recognises itself from its own structure', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.search.gallery().forEach((m) => {
        if (!m.m) return;
        try {
          const hit = window.ME.search.recognise(window.ME.chem.fromSmiles(m.m));
          if (!hit) out.push([m.n, 'not recognised']);
        } catch (e) { out.push([m.n, String(e.message)]); }
      });
      return out;
    });
    assert.equal(bad.length, 0, JSON.stringify(bad));
  });
});

/* --------------------------------------------------- supporting behaviour */
describe('presentation helpers', () => {
  test('condensed formulas are produced for chains and refused for rings', async () => {
    const out = await run(() => {
      const f = (s) => window.ME.chem.condensed(window.ME.chem.fromSmiles(s));
      return {
        ethanol: f('CCO'),
        propanol: f('CCCO'),
        benzene: f('c1ccccc1'),
        caffeine: f('CN1C=NC2=C1C(=O)N(C)C(=O)N2C'),
      };
    });
    assert.equal(out.ethanol.text, 'CH3CH2OH');
    assert.equal(out.propanol.text, 'CH3CH2CH2OH');
    assert.equal(out.benzene.text, null);
    assert.match(out.benzene.why, /cannot show a ring/);
    assert.equal(out.caffeine.text, null);
  });

  test('organic and inorganic are labelled the way a textbook would', async () => {
    const out = await run(() => {
      const f = (s) => window.ME.chem.isOrganic(window.ME.chem.fromSmiles(s));
      return {
        ethanol: f('CCO'), benzene: f('c1ccccc1'), methane: f('C'),
        water: f('O'), salt: f('[Na+].[Cl-]'), co2: f('O=C=O'),
        carbonate: f('[O-]C(=O)[O-]'), ammonia: f('N'),
      };
    });
    assert.equal(out.ethanol, true);
    assert.equal(out.benzene, true);
    assert.equal(out.methane, true);
    assert.equal(out.water, false);
    assert.equal(out.salt, false);
    assert.equal(out.co2, false, 'carbon dioxide is conventionally inorganic');
    assert.equal(out.carbonate, false, 'carbonates are conventionally inorganic');
    assert.equal(out.ammonia, false);
  });

  test('functional groups are found where they should be', async () => {
    const out = await run(() => {
      const f = (s) => window.ME.chem.findGroups(window.ME.chem.fromSmiles(s)).map((g) => g.key + ':' + g.count);
      return {
        ethanol: f('CCO'),
        aceticAcid: f('CC(=O)O'),
        acetone: f('CC(=O)C'),
        aspirin: f('CC(=O)Oc1ccccc1C(=O)O'),
        caffeine: f('CN1C=NC2=C1C(=O)N(C)C(=O)N2C'),
        hexane: f('CCCCCC'),
        salt: f('[Na+].[Cl-]'),
      };
    });
    assert.ok(out.ethanol.includes('alcohol:1'), JSON.stringify(out.ethanol));
    assert.ok(out.aceticAcid.includes('carboxylic:1'), JSON.stringify(out.aceticAcid));
    assert.ok(out.acetone.includes('ketone:1'), JSON.stringify(out.acetone));
    assert.ok(out.aspirin.some((g) => g.startsWith('carboxylic')), JSON.stringify(out.aspirin));
    assert.ok(out.aspirin.some((g) => g.startsWith('ester')), JSON.stringify(out.aspirin));
    assert.ok(out.caffeine.includes('amide:2'), 'caffeine has two carbonyls: ' + JSON.stringify(out.caffeine));
    assert.deepEqual(out.hexane, [], 'a plain alkane has no functional groups');
    assert.deepEqual(out.salt, [], 'table salt has no functional groups');
  });

  test('skeletal drawings are refused where they would mean nothing', async () => {
    const out = await run(() => {
      const f = (s) => window.ME.chem.skeletalMakesSense(window.ME.chem.fromSmiles(s));
      return { hexane: f('CCCCCC'), water: f('O'), salt: f('[Na+].[Cl-]'), co2: f('O=C=O'), ethanol: f('CCO') };
    });
    assert.equal(out.hexane, true);
    assert.equal(out.ethanol, true);
    assert.equal(out.water, false);
    assert.equal(out.salt, false);
    assert.equal(out.co2, false);
  });

  test('the database is complete and internally consistent', async () => {
    const out = await run(() => {
      const all = window.ME.search.all();
      return {
        total: all.length,
        gallery: all.filter((m) => m.g).length,
        withSmiles: all.filter((m) => m.m).length,
        withFact: all.filter((m) => m.x).length,
        withId: all.filter((m) => m.id).length,
        with3d: all.filter((m) => m.d).length,
        organic: all.filter((m) => m.o).length,
        inorganic: all.filter((m) => !m.o).length,
        duplicateNames: all.length - new Set(all.map((m) => m.n)).size,
        elements: window.ME.chem.elements.length,
      };
    });
    assert.ok(out.total >= 500, `only ${out.total} molecules`);
    assert.ok(out.gallery >= 60, `only ${out.gallery} gallery molecules`);
    assert.equal(out.withSmiles, out.total, 'every entry needs a structure');
    assert.equal(out.withFact, out.total, 'every entry needs its one-line fact');
    assert.equal(out.withId, out.total, 'every entry needs a canonical id for recognition');
    assert.ok(out.with3d > 400, `only ${out.with3d} entries carry 3D coordinates`);
    assert.ok(out.inorganic > 50, `only ${out.inorganic} inorganic entries`);
    assert.equal(out.duplicateNames, 0);
    assert.equal(out.elements, 118);
  });
});

/* ------------------------------------------------ legibility of drawings */
describe('drawings stay readable', () => {
  test('labels never sit on top of one another in everyday molecules', async () => {
    const bad = await run(() => {
      /* Measure how close two drawn letters get, in units of the font size.
       * Below about 0.85 the glyphs start to touch and the drawing is hard to
       * read; a bonded pair is normally about 2.2 apart. */
      const out = [];
      const names = ['Ethanol', 'Ethylamine', 'Acetic acid', 'Glycerol', 'Caffeine', 'Aspirin',
        'Glucose', 'Benzene', 'Paracetamol', 'Ibuprofen', 'Alanine', 'Acetone', 'Citric acid',
        'Menthol', 'Vanillin', 'Urea', 'Isobutane', 'Methane', 'Ammonia', 'Water'];
      names.forEach((n) => {
        const m = window.ME.search.get(n);
        if (!m || !m.m) return;
        const svg = window.ME.render2d.render(window.ME.chem.fromSmiles(m.m),
          { xray: 1, width: 420, height: 300, interactive: false });
        const texts = Array.from(svg.querySelectorAll('text'))
          .filter((t) => t.textContent && t.textContent.length <= 2 && !/[+\u2212]/.test(t.textContent));
        if (texts.length < 2) return;
        const fs = parseFloat(texts[0].getAttribute('font-size'));
        let worst = Infinity;
        for (let i = 0; i < texts.length; i++) {
          for (let j = i + 1; j < texts.length; j++) {
            const d = Math.hypot(
              texts[i].getAttribute('x') - texts[j].getAttribute('x'),
              texts[i].getAttribute('y') - texts[j].getAttribute('y')) / fs;
            if (d < worst) worst = d;
          }
        }
        if (worst < 0.85) out.push([n, +worst.toFixed(2)]);
      });
      return out;
    });
    assert.equal(bad.length, 0, 'labels too close together: ' + JSON.stringify(bad));
  });

  test('hydrogens are placed against the whole molecule, not atom by atom', async () => {
    /* Two bonded carbons each have a roomy gap pointing at the other one.
     * Placed independently they both use it and their hydrogens collide. */
    const worst = await run(() => {
      const mol = window.ME.chem.fromSmiles('CCCCCC');
      const svg = window.ME.render2d.render(mol, { xray: 1, width: 420, height: 300, interactive: false });
      const hs = Array.from(svg.querySelectorAll('text')).filter((t) => t.textContent === 'H');
      const fs = parseFloat(hs[0].getAttribute('font-size'));
      let w = Infinity;
      for (let i = 0; i < hs.length; i++) {
        for (let j = i + 1; j < hs.length; j++) {
          const d = Math.hypot(hs[i].getAttribute('x') - hs[j].getAttribute('x'),
            hs[i].getAttribute('y') - hs[j].getAttribute('y')) / fs;
          if (d < w) w = d;
        }
      }
      return +w.toFixed(2);
    });
    assert.ok(worst >= 0.9, `closest pair of hydrogens was ${worst} font-sizes apart`);
  });

  test('a lone atom does not sit under its own hydrogens', async () => {
    /* Water and ammonia dropped on their own into the editor: in the skeletal
     * state their hydrogens tuck in beside the letter, and used to end up
     * underneath the disc that masks bonds behind it. */
    const out = await run(() => {
      const res = {};
      ['O', 'N', 'C', 'S'].forEach((smi) => {
        const svg = window.ME.render2d.render(window.ME.chem.fromSmiles(smi),
          { xray: 0, width: 300, height: 200, interactive: false });
        const texts = Array.from(svg.querySelectorAll('text'));
        const fs = parseFloat(texts[0].getAttribute('font-size'));
        let worst = Infinity;
        for (let i = 0; i < texts.length; i++) {
          for (let j = i + 1; j < texts.length; j++) {
            const d = Math.hypot(texts[i].getAttribute('x') - texts[j].getAttribute('x'),
              texts[i].getAttribute('y') - texts[j].getAttribute('y')) / fs;
            if (d < worst) worst = d;
          }
        }
        res[smi] = texts.length < 2 ? 99 : +worst.toFixed(2);
      });
      return res;
    });
    Object.entries(out).forEach(([smi, d]) => {
      assert.ok(d >= 1.15, `a lone ${smi} has labels only ${d} font-sizes apart`);
    });
  });

  test('a lone water molecule reads as H O H, not both hydrogens on one side', async () => {
    const apart = await run(() => {
      const mol = window.ME.chem.fromSmiles('O');
      const svg = window.ME.render2d.render(mol, { xray: 0, width: 300, height: 200, interactive: false });
      const hs = Array.from(svg.querySelectorAll('text')).filter((t) => t.textContent === 'H');
      const o = Array.from(svg.querySelectorAll('text')).find((t) => t.textContent === 'O');
      const ang = hs.map((h) => Math.atan2(h.getAttribute('y') - o.getAttribute('y'),
        h.getAttribute('x') - o.getAttribute('x')));
      let d = Math.abs(ang[0] - ang[1]);
      if (d > Math.PI) d = 2 * Math.PI - d;
      return +(d * 180 / Math.PI).toFixed(0);
    });
    assert.ok(apart >= 120, `the two hydrogens are only ${apart} degrees apart`);
  });

  test('an explicit hydrogen is drawn in a colour you can see', async () => {
    const fill = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      const a = M.addAtom(g, 0, 0, 'H');
      const b = M.addAtom(g, 1, 0, 'H');
      M.addBond(g, a, b, 1);
      const svg = window.ME.render2d.render(M.toMolecule(g), { xray: 1, width: 300, height: 150, interactive: false });
      const t = Array.from(svg.querySelectorAll('text')).find((x) => x.textContent === 'H');
      return t.getAttribute('fill');
    });
    /* CPK white would be invisible on a light page. */
    assert.equal(fill, 'var(--text)');
  });
});

/* --------------------------------------------------- crowding in the editor */
describe('the drawing editor keeps atoms apart', () => {
  test('a long chain never folds back onto itself', async () => {
    const min = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      let last = M.addAtom(g, 0, 0, 'C');
      for (let k = 0; k < 29; k++) {
        const a = M.suggestAngle(g, last);
        const ni = M.addAtom(g, g.atoms[last].x + Math.cos(a), g.atoms[last].y + Math.sin(a), 'C');
        M.addBond(g, last, ni, 1);
        last = ni;
      }
      let m = Infinity;
      for (let i = 0; i < g.atoms.length; i++) {
        for (let j = i + 1; j < g.atoms.length; j++) {
          m = Math.min(m, Math.hypot(g.atoms[i].x - g.atoms[j].x, g.atoms[i].y - g.atoms[j].y));
        }
      }
      return +m.toFixed(3);
    });
    assert.ok(min >= 0.95, `two atoms in a 30-carbon chain ended up ${min} bond lengths apart`);
  });

  test('branching heavily off one atom still fans out cleanly', async () => {
    const min = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      const centre = M.addAtom(g, 0, 0, 'C');
      for (let branch = 0; branch < 3; branch++) {
        let last = centre;
        for (let k = 0; k < 4; k++) {
          const a = M.suggestAngle(g, last);
          const ni = M.addAtom(g, g.atoms[last].x + Math.cos(a), g.atoms[last].y + Math.sin(a), 'C');
          M.addBond(g, last, ni, 1);
          last = ni;
        }
      }
      let m = Infinity;
      for (let i = 0; i < g.atoms.length; i++) {
        for (let j = i + 1; j < g.atoms.length; j++) {
          m = Math.min(m, Math.hypot(g.atoms[i].x - g.atoms[j].x, g.atoms[i].y - g.atoms[j].y));
        }
      }
      return +m.toFixed(3);
    });
    assert.ok(min >= 0.95, `branches crowded to ${min} bond lengths`);
  });

  test('a position on top of an existing atom is pushed clear', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      M.addAtom(g, 0, 0, 'C');
      const onTop = M.separate(g, 0, 0, -1);
      const close = M.separate(g, 0.3, 0, -1);
      const fine = M.separate(g, 1.0, 0, -1);
      /* squeezed between two atoms: must end up clear of both */
      const g2 = M.emptyGraph();
      M.addAtom(g2, 0, 0, 'C'); M.addAtom(g2, 0.8, 0, 'C');
      const between = M.separate(g2, 0.4, 0.05, -1);
      return {
        min: M.MIN_SEP,
        onTop: +Math.hypot(onTop.x, onTop.y).toFixed(3),
        close: +Math.hypot(close.x, close.y).toFixed(3),
        movedWhenFine: +Math.hypot(fine.x - 1, fine.y).toFixed(3),
        between: [0, 1].map((i) => +Math.hypot(between.x - g2.atoms[i].x, between.y - g2.atoms[i].y).toFixed(3)),
      };
    });
    assert.ok(out.onTop >= out.min - 1e-6, 'an atom dropped exactly on another must move clear');
    assert.ok(out.close >= out.min - 1e-6, 'a near-miss must be pushed out');
    assert.equal(out.movedWhenFine, 0, 'a position that is already fine must be left alone');
    out.between.forEach((d) => assert.ok(d >= out.min - 0.01, 'must clear both neighbours: ' + JSON.stringify(out.between)));
  });
});

/* ------------------------------------------------------------- lesson two */
describe('lesson 2 teaches what its check asks about', () => {
  test('it states the rule that hydrogen fills any spare hand', async () => {
    const text = await run(() => {
      const L = window.ME.learn.LESSONS.find((l) => l.id === 'hands');
      const d = document.createElement('div');
      d.appendChild(L.body());
      return d.textContent;
    });
    assert.match(text, /hand not accounted for by a drawn line is holding a hydrogen/i);
    assert.match(text, /nitrogen/i, 'the check is about nitrogen, so the lesson must cover it');
    assert.match(text, /double/i, 'counting lines needs the double-bond caveat');
    assert.ok(text.length > 2500, `lesson body is only ${text.length} characters`);
  });

  test('its check has exactly one right answer, and it is findable', async () => {
    const out = await run(() => {
      const L = window.ME.learn.LESSONS.find((l) => l.id === 'hands');
      const mol = L.quiz.mol();
      const desc = window.ME.render2d.describe(mol, {});
      const atoms = desc.atoms.map((a, i) => ({ i, sym: a.sym, bondCount: a.bonds.length }));
      return {
        total: atoms.length,
        accepted: atoms.filter((a) => L.quiz.test(a)).map((a) => a.i),
        bondCounts: atoms.map((a) => a.bondCount),
        allCarbon: atoms.every((a) => a.sym === 'C'),
      };
    });
    assert.equal(out.accepted.length, 1, 'there must be exactly one over-bonded atom');
    assert.equal(out.bondCounts[out.accepted[0]], 5);
    assert.ok(out.allCarbon, 'the note tells the reader every atom is a carbon');
    assert.ok(out.total >= 6, 'it should look like a molecule, not a bare star');
  });
});
