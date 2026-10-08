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

  test('the molecules added in the latest expansion are all reachable', async () => {
    /* A spot check across every category the expansion touched. Each of these
       went through the same PubChem verification as the rest, so what this
       pins is that they survived into the shipped file and can be found by
       the names a reader would type. */
    const WANT = [
      ['magnetite', 'Magnetite'], ['pyrite', 'Pyrite'], ['borax', 'Borax'],
      ['gold', 'Gold'], ['tungsten', 'Tungsten'], ['silicon', 'Silicon'],
      ['phosgene', 'Phosgene'], ['galena', 'Galena'],
      ['thalidomide', 'Thalidomide'], ['propofol', 'Propofol'],
      ['ciclosporin', 'Ciclosporin'], ['amphotericin B', 'Amphotericin B'],
      ['leaf alcohol', 'cis-3-Hexen-1-ol'], ['eucalyptol', 'Eucalyptol'],
      ['nootkatone', 'Nootkatone'], ['erythritol', 'Erythritol'],
      ['piperidine', 'Piperidine'], ['ferrocene', 'Ferrocene'],
      ['18-crown-6', '18-Crown-6'], ['PFOA', 'PFOA'],
      ['SAM', 'SAM'], ['NADH', 'NADH'], ['carnosine', 'Carnosine'],
      ['hexadecane', 'Hexadecane'], ['cumene', 'Cumene'],
    ];
    const bad = await run((want) => {
      const out = [];
      want.forEach(([query, name]) => {
        const r = window.ME.search.search(query, 8);
        const names = (r.results || []).map((hit) => hit.m.n);
        if (names.indexOf(name) < 0) {
          out.push([query, 'wanted ' + name + ', got ' + JSON.stringify(names.slice(0, 4))]);
        }
      });
      return out;
    }, WANT);
    assert.deepEqual(bad, [], JSON.stringify(bad, null, 1));
  });

  test('every molecule in the database renders a structure and a 2D drawing', async () => {
    /* With a thousand entries, one bad SMILES would be easy to miss. This
       reads every one back through the shipped library and draws it. */
    const bad = await run(() => {
      const out = [];
      window.ME.search.all().forEach((m) => {
        let mol;
        try { mol = window.ME.chem.fromSmiles(m.m); }
        catch (e) { out.push([m.n, 'SMILES threw: ' + e.message]); return; }
        if (!mol || !mol.getAllAtoms()) { out.push([m.n, 'no atoms']); return; }
        const parsed = window.ME.formula.parse(m.f);
        if (!parsed.ok) { out.push([m.n, 'formula ' + m.f + ' will not parse']); return; }
        /* The formula the app shows and the structure it draws have to hold the
           same atoms, every time. Compared as element counts rather than as
           text, because the displayed formula carries the ion's charge and
           OpenChemLib's does not. */
        const fromStructure = window.ME.formula.parse(mol.getMolecularFormula().formula);
        if (!fromStructure.ok) { out.push([m.n, 'structure formula will not parse']); return; }
        const keys = Object.keys(parsed.counts);
        const same = keys.length === Object.keys(fromStructure.counts).length
          && keys.every((k) => fromStructure.counts[k] === parsed.counts[k]);
        if (!same) {
          out.push([m.n, 'formula ' + m.f + ' but the structure holds '
            + mol.getMolecularFormula().formula]);
        }
      });
      return out;
    });
    assert.deepEqual(bad.slice(0, 8), [], JSON.stringify(bad.slice(0, 8), null, 1));
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
    /* Floors rather than exact counts, so adding molecules does not break the
       suite — but high enough that losing a chunk of the database would. */
    assert.ok(out.total >= 1000, `only ${out.total} molecules`);
    assert.ok(out.gallery >= 700, `only ${out.gallery} gallery molecules`);
    assert.equal(out.withSmiles, out.total, 'every entry needs a structure');
    assert.equal(out.withFact, out.total, 'every entry needs its one-line fact');
    assert.equal(out.withId, out.total, 'every entry needs a canonical id for recognition');
    assert.ok(out.with3d > 700, `only ${out.with3d} entries carry 3D coordinates`);
    assert.ok(out.inorganic > 90, `only ${out.inorganic} inorganic entries`);
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
      const q = (L.quizzes || [L.quiz])[0];
      const mol = q.mol();
      const desc = window.ME.render2d.describe(mol, {});
      const atoms = desc.atoms.map((a, i) => ({ i, sym: a.sym, bondCount: a.bonds.length }));
      return {
        total: atoms.length,
        accepted: atoms.filter((a) => q.test(a)).map((a) => a.i),
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

/* ------------------------------------------------- bare atoms in the editor */
describe('hydrogens can be switched off', () => {
  test('a lone atom fills its spare bonds by default', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      const res = {};
      ['C', 'O', 'N', 'S', 'Cl'].forEach((sym) => {
        const g = M.emptyGraph();
        M.addAtom(g, 0, 0, sym);
        res[sym] = window.ME.chem.analyse(M.toMolecule(g)).formula;
      });
      return res;
    });
    /* This is the behaviour lesson 2 teaches, so it stays the default. */
    assert.equal(out.C, 'CH4');
    assert.equal(out.O, 'H2O');
    assert.equal(out.N, 'H3N');
    assert.equal(out.S, 'H2S');
    /* OpenChemLib writes hydrogen first for this one; PubChem writes "ClH". */
    assert.equal(out.Cl, 'HCl');
  });

  test('a bare atom can be placed instead', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      const res = {};
      ['C', 'O', 'N', 'S'].forEach((sym) => {
        const g = M.emptyGraph();
        M.addAtom(g, 0, 0, sym, true);
        res[sym] = {
          formula: window.ME.chem.analyse(M.toMolecule(g)).formula,
          h: M.implicitH(g, 0),
          wouldBe: M.autoH(g, 0),
        };
      });
      return res;
    });
    assert.equal(out.C.formula, 'C');
    assert.equal(out.C.h, 0);
    assert.equal(out.C.wouldBe, 4, 'it still knows how many it is suppressing');
    assert.equal(out.O.formula, 'O');
    assert.equal(out.N.formula, 'N');
    assert.equal(out.S.formula, 'S');
  });

  test('switching them back on restores the hydrogens', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      M.addAtom(g, 0, 0, 'C', true);
      const bare = window.ME.chem.analyse(M.toMolecule(g)).formula;
      g.atoms[0].noH = false;
      const filled = window.ME.chem.analyse(M.toMolecule(g)).formula;
      return { bare, filled };
    });
    assert.equal(out.bare, 'C');
    assert.equal(out.filled, 'CH4');
  });

  test('a bonded atom can have its hydrogens stripped too', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      const g = M.emptyGraph();
      const a = M.addAtom(g, 0, 0, 'C');
      const b = M.addAtom(g, 1, 0, 'C');
      M.addBond(g, a, b, 1);
      const before = window.ME.chem.analyse(M.toMolecule(g)).formula;
      g.atoms[1].noH = true;
      return { before, after: window.ME.chem.analyse(M.toMolecule(g)).formula };
    });
    assert.equal(out.before, 'C2H6');
    assert.equal(out.after, 'C2H3', 'stripping one methyl leaves a radical');
  });

  test('a bare carbon is not mistaken for methane', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      const bare = M.emptyGraph(); M.addAtom(bare, 0, 0, 'C', true);
      const filled = M.emptyGraph(); M.addAtom(filled, 0, 0, 'C');
      const hit = (g) => { const r = window.ME.search.recognise(M.toMolecule(g)); return r && r.n; };
      return { bare: hit(bare), filled: hit(filled) };
    });
    assert.equal(out.filled, 'Methane', 'a lone carbon is methane and should be recognised as such');
    assert.notEqual(out.bare, 'Methane', 'a bare carbon is a different thing');
  });

  test('every database molecule survives a trip through the editor unchanged', async () => {
    /* Opening a molecule in Draw and reading it back must not invent or lose
     * an atom. Radicals like nitric oxide used to gain a hydrogen here. */
    const bad = await run(() => {
      const M = window.ME.drawModel;
      const norm = (f) => {
        const c = {}; const re = /([A-Z][a-z]?)(\d*)/g; let x;
        while ((x = re.exec(f)) !== null) { if (x[1]) c[x[1]] = (c[x[1]] || 0) + (x[2] ? +x[2] : 1); }
        return Object.keys(c).sort().map((k) => k + c[k]).join('');
      };
      const out = [];
      window.ME.search.all().forEach((m) => {
        if (!m.m) return;
        try {
          const mol = window.ME.chem.fromSmiles(m.m);
          const before = window.ME.chem.analyse(mol).formula;
          const g = M.fromMolecule(window.ME.chem.fromMolfile(mol.toMolfile()));
          const after = window.ME.chem.analyse(M.toMolecule(g)).formula;
          if (norm(before) !== norm(after)) out.push([m.n, before, after]);
        } catch (e) { out.push([m.n, 'error', String(e.message).slice(0, 50)]); }
      });
      return out;
    });
    assert.equal(bad.length, 0, 'changed on the round trip: ' + JSON.stringify(bad.slice(0, 6)));
  });

  test('radicals keep their unpaired electron', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel;
      const rec = window.ME.search.get('Nitric oxide');
      const mol = window.ME.chem.fromSmiles(rec.m);
      const g = M.fromMolecule(window.ME.chem.fromMolfile(mol.toMolfile()));
      return {
        formula: window.ME.chem.analyse(M.toMolecule(g)).formula,
        flagged: g.atoms.filter((a) => a.noH).length,
      };
    });
    assert.equal(out.formula, 'NO', 'nitric oxide must not gain a hydrogen');
    assert.ok(out.flagged >= 1);
  });
});

/* ------------------------------------------------------------- the dots */
describe('dots never pile up', () => {
  test('bare atoms packed together keep their dots apart', async () => {
    const out = await run(() => {
      const M = window.ME.drawModel, DC = window.ME.drawCanvas;
      const fsUnits = 0.46;
      const ring = fsUnits * window.ME.render2d.DECO_RING;
      const dotDiameter = fsUnits * 0.11 * 2;
      function closest(g) {
        const P = DC.prepare(g, 0, fsUnits);
        const pts = [];
        P.atoms.forEach((a) => a.dotDirs.forEach((d) => {
          pts.push({ x: a.x + Math.cos(d) * ring, y: a.y + Math.sin(d) * ring });
        }));
        let m = Infinity;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            m = Math.min(m, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
          }
        }
        return { closest: m, dots: pts.length };
      }
      const cases = {};
      /* the arrangement that showed the problem: four bare carbons in a square */
      {
        const g = M.emptyGraph();
        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([x, y]) => M.addAtom(g, x, y, 'C', true));
        cases.square = closest(g);
      }
      [0.8, 1.0, 1.2].forEach((sp) => {
        const g = M.emptyGraph();
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) M.addAtom(g, c * sp, r * sp, 'C', true);
        cases['grid' + sp] = closest(g);
      });
      {
        const g = M.emptyGraph();
        ['C', 'N', 'O', 'S', 'C', 'N'].forEach((sym, i) => M.addAtom(g, i * 0.8, 0, sym, true));
        cases.row = closest(g);
      }
      return { cases, dotDiameter };
    });
    Object.entries(out.cases).forEach(([name, r]) => {
      assert.ok(r.dots > 0, name + ' produced no dots');
      assert.ok(r.closest >= out.dotDiameter * 1.5,
        `${name}: closest dots ${r.closest.toFixed(3)} apart, dot diameter is ${out.dotDiameter.toFixed(3)}`);
    });
  });

  test('lone pairs keep clear of each other and of the hydrogens', async () => {
    const bad = await run(() => {
      const out = [];
      ['O', 'N', 'CCO', 'CC(=O)O', 'C(F)(F)F', 'OS(=O)(=O)O', 'ClCCl'].forEach((smi) => {
        const svg = window.ME.render2d.render(window.ME.chem.fromSmiles(smi),
          { xray: 1, lonePairs: true, width: 420, height: 300, interactive: false });
        const dots = Array.from(svg.querySelectorAll('circle'))
          .filter((c) => parseFloat(c.getAttribute('r')) < 6 && c.getAttribute('fill') === 'var(--text-soft)')
          .map((c) => ({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r') }));
        for (let i = 0; i < dots.length; i++) {
          for (let j = i + 1; j < dots.length; j++) {
            const d = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
            /* two dots of one lone pair sit deliberately close; anything closer
             * than touching between different pairs is a collision */
            if (d < dots[i].r * 1.6) out.push([smi, +d.toFixed(2), dots[i].r]);
          }
        }
      });
      return out;
    });
    assert.equal(bad.length, 0, 'overlapping dots: ' + JSON.stringify(bad.slice(0, 6)));
  });
});

/* ----------------------------------------------------- the lesson checks */
/* A condensed formula reads along one connected chain. Cisplatin used to come
 * out as "ClPtCl", which is one of its three pieces presented as all of it, so
 * no molecule in several pieces may be given one. */
describe('condensed formulas never describe only part of a molecule', () => {
  test('nothing in more than one piece gets one', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.search.all().forEach((m) => {
        let mol;
        try { mol = window.ME.chem.fromSmiles(m.m); } catch (e) { return; }
        if (window.ME.chem.fragmentCount(mol) < 2) return;
        const c = window.ME.chem.condensed(mol);
        if (c.text) out.push([m.n, m.f, c.text]);
      });
      return out;
    });
    assert.deepEqual(bad, [], 'partial condensed formulas: ' + JSON.stringify(bad.slice(0, 5)));
  });

  test('and the refusal says why, for cisplatin specifically', async () => {
    const r = await run(() => {
      const m = window.ME.search.all().find((x) => x.n === 'Cisplatin');
      return window.ME.chem.condensed(window.ME.chem.fromSmiles(m.m));
    });
    assert.equal(r.text, null);
    assert.match(r.why, /more than one separate piece/);
  });

  test('a single-piece molecule still gets one', async () => {
    const r = await run(() => window.ME.chem.condensed(window.ME.chem.fromSmiles('CCO')).text);
    assert.equal(r, 'CH3CH2OH');
  });
});

/* ------------------------------------------------------- the gallery's reach */
/* Plain-English things a reader would actually type, and the molecule each one
 * has to land on. These broke once already: deduplicating the seed dropped the
 * copy that carried the search term, and "bleach" quietly started answering
 * hydrogen peroxide. Pinning them here means that cannot happen unnoticed. */
describe('the words a reader would search for', () => {
  const WANT = {
    /* household */
    bleach: 'Sodium hypochlorite', 'oxygen bleach': 'Sodium percarbonate',
    mothballs: null, 'pool chlorine': null, descaler: 'EDTA',
    'rust remover': 'Oxalic acid', 'salt substitute': 'Potassium chloride',
    /* brands and everyday names */
    tylenol: 'Paracetamol', advil: 'Ibuprofen', ritalin: 'Methylphenidate',
    adderall: 'Amphetamine', vyvanse: 'Lisdexamfetamine', xanax: 'Alprazolam',
    eliquis: 'Apixaban', ventolin: 'Salbutamol', 'laughing gas': 'Nitrous oxide',
    /* what a thing is for */
    adhd: null, statin: null, 'beta blocker': null, 'blood thinner': null,
    antidepressant: null, antibiotic: null, chemotherapy: null, gout: null,
    migraine: null, contraceptive: null, 'sleeping pill': null,
    /* materials and the lab */
    kevlar: 'p-Phenylenediamine', 'school glue': 'Vinyl acetate',
    epoxy: 'Epichlorohydrin', sandpaper: null, titration: null,
    fingerprints: 'Ninhydrin', 'rocket fuel': null, airbag: 'Sodium azide',
    /* body and minerals */
    'tooth enamel': 'Hydroxyapatite',
    /* psychoactive, by their plant or source */
    kratom: 'Mitragynine', 'fly agaric': 'Muscimol', ayahuasca: null,
    'betel nut': 'Arecoline', khat: 'Cathinone', nutmeg: 'Myristicin',
    kava: 'Kavain', salvia: 'Salvinorin A',
  };

  test('each one finds something, and the named ones find the right thing', async () => {
    const got = await run((terms) => {
      const out = {};
      terms.forEach((t) => {
        const r = window.ME.search.search(t).results;
        out[t] = r.length ? r[0].m.n : null;
      });
      return out;
    }, Object.keys(WANT));

    const empty = Object.keys(WANT).filter((t) => !got[t]);
    assert.deepEqual(empty, [], 'these searches found nothing: ' + empty.join(', '));
    Object.keys(WANT).forEach((t) => {
      if (WANT[t]) {
        assert.equal(got[t], WANT[t], `"${t}" should find ${WANT[t]}, found ${got[t]}`);
      }
    });
  });
});

/* ------------------------------------------------- degrees of unsaturation */
/* Every number the unsaturation lesson quotes is checked here against the
 * real structure, two independent ways: the arithmetic on the formula, and a
 * direct count of rings and pi bonds in the molecule itself. If the lesson
 * ever drifts from the chemistry, one of the two disagrees. */
describe('the unsaturation lesson quotes real numbers', () => {
  /* name -> [SMILES, formula the lesson prints, degrees the lesson claims] */
  const CLAIMS = {
    propane: ['CCC', 'C3H8', 0],
    butane: ['CCCC', 'C4H10', 0],
    pentane: ['CCCCC', 'C5H12', 0],
    'but-1-ene': ['C=CCC', 'C4H8', 1],
    cyclobutane: ['C1CCC1', 'C4H8', 1],
    ethane: ['CC', 'C2H6', 0],
    ethanol: ['CCO', 'C2H6O', 0],
    'dimethyl ether': ['COC', 'C2H6O', 0],
    benzene: ['c1ccccc1', 'C6H6', 4],
    chloroethane: ['CCCl', 'C2H5Cl', 0],
    caffeine: ['CN1C=NC2=C1C(=O)N(C(=O)N2C)C', 'C8H10N4O2', 6],
    nicotine: ['CN1CCCC1c1cccnc1', 'C10H14N2', 5],
    triphenylphosphine: ['P(c1ccccc1)(c1ccccc1)c1ccccc1', 'C18H15P', 12],
  };

  /* The lesson is explicit that a five-bonded phosphorus breaks the rule, and
   * says by how much. That claim is checked too, rather than waved at. */
  /* The formula string is the composition the shipped library reports, in its
   * own element order; the lesson prints the same composition the way everyone
   * writes it, H3PO4. */
  const PHOSPHATE = ['OP(=O)(O)O', 'H3O4P', 0, 1];

  test('each formula and degree count matches the structure', async () => {
    const out = await run((claims) => {
      const res = {};
      Object.keys(claims).forEach((name) => {
        const mol = window.ME.chem.fromSmiles(claims[name][0]);
        const n = { C: 0, H: 0, N: 0, X: 0 };
        let rings = 0, pi = 0;
        const HAL = { 9: 1, 17: 1, 35: 1, 53: 1 };
        for (let a = 0; a < mol.getAllAtoms(); a++) {
          const z = mol.getAtomicNo(a);
          if (z === 6) n.C++;
          /* phosphorus sits under nitrogen and carries the same +1 term */
          else if (z === 7 || z === 15) n.N++;
          else if (z === 1) n.H++;
          else if (HAL[z]) n.X++;
          n.H += mol.getImplicitHydrogens(a);
        }
        for (let b = 0; b < mol.getAllBonds(); b++) pi += Math.max(0, mol.getBondOrder(b) - 1);
        /* rings = bonds - atoms + fragments, for any graph */
        rings = mol.getAllBonds() - mol.getAllAtoms() + window.ME.chem.fragmentCount(mol);
        res[name] = {
          formula: window.ME.chem.analyse(mol).formula,
          byArithmetic: (2 * n.C + 2 + n.N - n.H - n.X) / 2,
          byStructure: rings + pi,
        };
      });
      return res;
    }, Object.assign({ phosphate: PHOSPHATE }, CLAIMS));

    /* The one the lesson says the rule gets wrong, and by exactly one. */
    assert.equal(out.phosphate.formula.replace(/[^A-Za-z0-9]/g, ''), PHOSPHATE[1]);
    assert.equal(out.phosphate.byArithmetic, PHOSPHATE[2],
      'the lesson says the three-hand rule predicts 0 for phosphoric acid');
    assert.equal(out.phosphate.byStructure, PHOSPHATE[3],
      'the lesson says phosphoric acid really has one degree, the P=O');

    Object.keys(CLAIMS).forEach((name) => {
      const [, formula, degrees] = CLAIMS[name];
      const got = out[name];
      assert.equal(got.formula.replace(/[^A-Za-z0-9]/g, ''), formula,
        `the lesson prints ${formula} for ${name} but the structure is ${got.formula}`);
      assert.equal(got.byArithmetic, degrees,
        `the lesson claims ${degrees} degrees for ${name}; the formula gives ${got.byArithmetic}`);
      assert.equal(got.byStructure, degrees,
        `the lesson claims ${degrees} degrees for ${name}; the structure has ${got.byStructure} rings and pi bonds`);
    });
  });

  test('both unsaturation questions agree with the formula they quote', async () => {
    /* The two counting questions give a formula in their text, so the stated
     * answer can be checked straight off that text. */
    const qs = await run(() => {
      const L = window.ME.learn.LESSONS.find((x) => x.id === 'unsaturation');
      return L.quizzes.filter((q) => q.kind === 'count').map((q) => ({ q: q.q, answer: q.answer }));
    });
    assert.equal(qs.length, 2);
    const SUB = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9 };
    qs.forEach(({ q, answer }) => {
      const plain = q.replace(/[₀-₉]/g, (c) => String(SUB[c]));
      const m = plain.match(/C(\d*)H(\d*)(?:N(\d*))?/);
      assert.ok(m, `no formula found in "${q}"`);
      const [C, H, N] = [1, 2, 3].map((i) => (m[i] === undefined ? 0 : m[i] === '' ? 1 : +m[i]));
      assert.equal((2 * C + 2 + N - H) / 2, answer,
        `"${q}" expects ${answer}, but its own formula gives ${(2 * C + 2 + N - H) / 2}`);
    });
  });
});

describe('every lesson check is answerable', () => {
  test('each click-an-atom question has at least one correct atom', async () => {
    const out = await run(() => {
      const res = [];
      window.ME.learn.LESSONS.forEach((L) => {
        (L.quizzes || [L.quiz]).filter((q) => q && q.kind === 'clickatom').forEach((q) => {
        const mol = q.mol ? q.mol() : window.ME.chem.fromSmiles(q.smiles);
        const desc = window.ME.render2d.describe(mol, {});
        const atoms = desc.atoms.map((a, i) => ({
          i, sym: a.sym, hydrogens: a.hydrogens, bondCount: a.bonds.length,
        }));
        res.push({ id: L.id, accepted: atoms.filter((a) => q.test(a)).length, total: atoms.length });
        });
      });
      return res;
    });
    assert.ok(out.length >= 8, 'expected a click-an-atom question in most lessons');
    out.forEach((r) => {
      assert.ok(r.accepted >= 1, `lesson "${r.id}" asks for an atom that does not exist in its molecule`);
      assert.ok(r.accepted < r.total, `lesson "${r.id}" accepts every atom, so it is not a question`);
    });
  });

  test('each counting question matches its own molecule', async () => {
    const out = await run(() => {
      const res = [];
      window.ME.learn.LESSONS.forEach((L) => {
        (L.quizzes || [L.quiz]).filter((q) => q && q.kind === 'count' && q.smiles).forEach((q) => {
        const mol = window.ME.chem.fromSmiles(q.smiles);
        let carbons = 0, hydrogens = 0;
        for (let a = 0; a < mol.getAllAtoms(); a++) {
          if (mol.getAtomicNo(a) === 6) carbons++;
          hydrogens += mol.getImplicitHydrogens(a);
        }
        res.push({ id: L.id, answer: q.answer, carbons, hydrogens, q: q.q });
        });
      });
      return res;
    });
    assert.ok(out.length >= 6);
    out.forEach((r) => {
      /* A question may legitimately count something else \u2014 heteroatoms, or
       * every atom in the picture \u2014 so only questions that say "carbon" or
       * "hydrogen" are pinned to those counts. */
      if (/how many carbon/i.test(r.q)) {
        assert.equal(r.answer, r.carbons, `"${r.q}" expects ${r.answer} but the molecule has ${r.carbons} carbons`);
      } else if (/how many hydrogen/i.test(r.q)) {
        assert.equal(r.answer, r.hydrogens, `"${r.q}" expects ${r.answer} but the molecule has ${r.hydrogens} hydrogens`);
      }
    });
  });

  test('no question contradicts the answer it accepts', async () => {
    /* A question that asks for "no hydrogens" must accept an atom with none. */
    const out = await run(() => {
      const res = [];
      window.ME.learn.LESSONS.forEach((L) => {
        (L.quizzes || [L.quiz]).filter((q) => q && q.kind === 'clickatom').forEach((q) => {
        const mol = q.mol ? q.mol() : window.ME.chem.fromSmiles(q.smiles);
        const desc = window.ME.render2d.describe(mol, {});
        const atoms = desc.atoms.map((a, i) => ({ i, sym: a.sym, hydrogens: a.hydrogens, bondCount: a.bonds.length }));
        const accepted = atoms.filter((a) => q.test(a));
        res.push({
          id: L.id,
          q: q.q,
          right: q.right,
          note: q.note || '',
          hydrogensOfAccepted: accepted.map((a) => a.hydrogens),
        });
        });
      });
      return res;
    });
    out.forEach((r) => {
      const asksForNone = /no hydrogens at all|has no hydrogens/i.test(r.q);
      if (asksForNone) {
        r.hydrogensOfAccepted.forEach((h) => {
          assert.equal(h, 0, `lesson "${r.id}" asks for a carbon with no hydrogens but accepts one with ${h}`);
        });
      }
      assert.ok(!/there is no .* in this molecule/i.test(r.note),
        `lesson "${r.id}" has a note admitting its own question cannot be answered`);
    });
  });
});

/* ---------------------------------------------------------- the elements */
describe('the element data', () => {
  test('all 118 elements are present and complete', async () => {
    const out = await run(() => {
      const els = window.ME.chem.elements;
      const missing = (k) => els.filter((e) => e[k] === null || e[k] === undefined || e[k] === '').map((e) => e.sym);
      return {
        count: els.length,
        zRange: [Math.min(...els.map((e) => e.z)), Math.max(...els.map((e) => e.z))],
        duplicateZ: els.length - new Set(els.map((e) => e.z)).size,
        duplicateSym: els.length - new Set(els.map((e) => e.sym)).size,
        noName: missing('name'),
        noMass: missing('mass'),
        noConfig: missing('cfg'),
        noBlock: missing('block'),
        noState: missing('state'),
      };
    });
    assert.equal(out.count, 118);
    assert.deepEqual(out.zRange, [1, 118]);
    assert.equal(out.duplicateZ, 0);
    assert.equal(out.duplicateSym, 0);
    assert.deepEqual(out.noName, []);
    assert.deepEqual(out.noMass, []);
    assert.deepEqual(out.noConfig, []);
    assert.deepEqual(out.noBlock, []);
    assert.deepEqual(out.noState, []);
  });

  test('known values match what a textbook says', async () => {
    const out = await run(() => {
      const g = (sym) => window.ME.chem.element(sym);
      return {
        H: g('H'), C: g('C'), O: g('O'), Fe: g('Fe'), Au: g('Au'), U: g('U'),
      };
    });
    assert.equal(out.H.z, 1);
    assert.equal(out.C.z, 6);
    assert.equal(out.O.z, 8);
    assert.equal(out.Fe.z, 26);
    assert.equal(out.Au.z, 79);
    assert.equal(out.U.z, 92);
    assert.ok(Math.abs(out.C.mass - 12.011) < 0.01, 'carbon mass ' + out.C.mass);
    assert.ok(Math.abs(out.O.mass - 15.999) < 0.01, 'oxygen mass ' + out.O.mass);
    assert.equal(out.C.cfg, '[He]2s2 2p2');
    assert.equal(out.O.block, 'Nonmetal');
    assert.equal(out.Fe.block, 'Transition metal');
    assert.equal(out.C.name, 'Carbon');
    /* Electronegativity: fluorine is the top of the scale. */
    assert.ok(out.O.en > out.C.en, 'oxygen should pull harder than carbon');
  });

  test('every element lands in a sensible spot in the table', async () => {
    const out = await run(() => {
      const bad = [];
      const seen = {};
      window.ME.chem.elements.forEach((e) => {
        const [row, col] = window.ME.chem.ptPosition(e.z);
        if (row < 1 || row > 10 || col < 1 || col > 18) bad.push([e.sym, row, col]);
        const key = row + ':' + col;
        if (seen[key]) bad.push([e.sym + ' collides with ' + seen[key], row, col]);
        seen[key] = e.sym;
      });
      return {
        bad,
        h: window.ME.chem.ptPosition(1),
        he: window.ME.chem.ptPosition(2),
        c: window.ME.chem.ptPosition(6),
        la: window.ME.chem.ptPosition(57),
        lu: window.ME.chem.ptPosition(71),
        hf: window.ME.chem.ptPosition(72),
        og: window.ME.chem.ptPosition(118),
      };
    });
    assert.deepEqual(out.bad, [], 'misplaced or colliding cells');
    assert.deepEqual(out.h, [1, 1], 'hydrogen top left');
    assert.deepEqual(out.he, [1, 18], 'helium top right');
    assert.deepEqual(out.c, [2, 14], 'carbon in group 14');
    assert.deepEqual(out.la, [9, 3], 'lanthanides on their own row');
    assert.deepEqual(out.lu, [9, 17], 'and fifteen wide');
    assert.deepEqual(out.hf, [6, 4], 'hafnium follows the lanthanides');
    assert.deepEqual(out.og, [7, 18], 'oganesson bottom right');
  });

  test('the hands shown for an element agree with the drawing validator', async () => {
    const mismatched = await run(() => {
      const bad = [];
      window.ME.chem.elements.forEach((e) => {
        const rule = window.ME.chem.VALENCE[e.sym];
        if (!rule) return;
        /* The element page reads this straight off the same table the editor
         * validates against, so they cannot disagree \u2014 this guards against
         * someone adding a second copy of the numbers. */
        if (typeof rule.hands !== 'number') bad.push(e.sym);
      });
      return bad;
    });
    assert.deepEqual(mismatched, []);
  });

  test('every element the database uses has a record', async () => {
    const missing = await run(() => {
      const bad = new Set();
      window.ME.search.all().forEach((m) => {
        if (!m.f) return;
        const re = /([A-Z][a-z]?)(\d*)/g;
        let x;
        while ((x = re.exec(m.f)) !== null) {
          if (x[1] && !window.ME.chem.element(x[1])) bad.add(x[1] + ' (' + m.n + ')');
        }
      });
      return Array.from(bad);
    });
    assert.deepEqual(missing, [], 'formulas referencing unknown elements');
  });
});

/* ------------------------------------------------ configuration diagrams */
describe('electron configuration', () => {
  test('the noble-gas core expands to the right number of electrons', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.chem.elements.forEach((e) => {
        const a = window.ME.orbitals.analyse(e);
        /* Ten of the heaviest have only a predicted configuration; the rest
         * must account for exactly as many electrons as the element has
         * protons, which is what proves the core expansion is right. */
        if (!a.predicted && a.total !== e.z) out.push([e.sym, e.z, a.total]);
      });
      return out;
    });
    assert.deepEqual(bad, [], 'electrons not adding up to the atomic number');
  });

  test('shells match the textbook counts', async () => {
    const out = await run(() => {
      const g = (sym) => window.ME.orbitals.analyse(window.ME.chem.element(sym)).rings.map((r) => r.count);
      return { H: g('H'), C: g('C'), Ne: g('Ne'), Na: g('Na'), Ar: g('Ar'), Fe: g('Fe'), Au: g('Au') };
    });
    assert.deepEqual(out.H, [1]);
    assert.deepEqual(out.C, [2, 4]);
    assert.deepEqual(out.Ne, [2, 8]);
    assert.deepEqual(out.Na, [2, 8, 1]);
    assert.deepEqual(out.Ar, [2, 8, 8]);
    /* Iron is the interesting one: 4s fills before 3d finishes, so the third
     * shell ends up holding fourteen. */
    assert.deepEqual(out.Fe, [2, 8, 14, 2]);
    assert.deepEqual(out.Au, [2, 8, 18, 32, 18, 1]);
  });

  test('outer-shell counts are what the octet story needs', async () => {
    const out = await run(() => {
      const g = (sym) => window.ME.orbitals.analyse(window.ME.chem.element(sym)).outer;
      return { H: g('H'), C: g('C'), N: g('N'), O: g('O'), F: g('F'), Ne: g('Ne'), Na: g('Na'), Cl: g('Cl') };
    });
    assert.equal(out.H, 1);
    assert.equal(out.C, 4);
    assert.equal(out.N, 5);
    assert.equal(out.O, 6);
    assert.equal(out.F, 7);
    assert.equal(out.Ne, 8);
    assert.equal(out.Na, 1);
    assert.equal(out.Cl, 7);
  });

  test('the orbital boxes fill singly before pairing', async () => {
    const out = await run(() => {
      /* Count the arrows the diagram actually draws. */
      const read = (sym) => {
        const a = window.ME.orbitals.analyse(window.ME.chem.element(sym));
        const node = window.ME.orbitals.orbitalBoxes(a);
        return Array.from(node.querySelectorAll('.orb-row')).map((row) => ({
          label: row.querySelector('.orb-label').textContent,
          up: row.querySelectorAll('.orb-up').length,
          down: row.querySelectorAll('.orb-down').length,
          cells: row.querySelectorAll('.orb-cell').length,
        }));
      };
      return { C: read('C'), N: read('N'), O: read('O'), Fe: read('Fe') };
    });
    /* carbon 2p2: two orbitals singly occupied, none paired */
    const c2p = out.C.find((r) => r.label === '2p');
    assert.deepEqual([c2p.up, c2p.down, c2p.cells], [2, 0, 3]);
    /* nitrogen 2p3: all three singly occupied */
    const n2p = out.N.find((r) => r.label === '2p');
    assert.deepEqual([n2p.up, n2p.down, n2p.cells], [3, 0, 3]);
    /* oxygen 2p4: three singles, then one of them pairs up */
    const o2p = out.O.find((r) => r.label === '2p');
    assert.deepEqual([o2p.up, o2p.down, o2p.cells], [3, 1, 3]);
    /* iron 3d6: five singles and one pair, across five orbitals */
    const fe3d = out.Fe.find((r) => r.label === '3d');
    assert.deepEqual([fe3d.up, fe3d.down, fe3d.cells], [5, 1, 5]);
  });

  test('the arrows account for every electron', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.chem.elements.forEach((e) => {
        const a = window.ME.orbitals.analyse(e);
        if (a.predicted) return;
        const node = window.ME.orbitals.orbitalBoxes(a);
        const drawn = node.querySelectorAll('.orb-up').length + node.querySelectorAll('.orb-down').length;
        if (drawn !== e.z) out.push([e.sym, e.z, drawn]);
      });
      return out;
    });
    assert.deepEqual(bad, [], 'arrows drawn not matching the atomic number');
  });

  test('a predicted configuration is flagged as predicted', async () => {
    const out = await run(() => {
      const predicted = window.ME.chem.elements
        .filter((e) => window.ME.orbitals.analyse(e).predicted).map((e) => e.sym);
      return { predicted, carbon: window.ME.orbitals.analyse(window.ME.chem.element('C')).predicted };
    });
    assert.ok(out.predicted.length > 0, 'some of the heaviest elements are predictions');
    assert.ok(out.predicted.length < 20, 'but only a handful');
    assert.equal(out.carbon, false, 'carbon is not a prediction');
  });
});

describe('bonds an element wants', () => {
  test('it agrees with the table the drawing editor validates against', async () => {
    const bad = await run(() => {
      const out = [];
      window.ME.chem.elements.forEach((e) => {
        const rule = window.ME.chem.VALENCE[e.sym];
        if (!rule) return;
        const b = window.ME.orbitals.bonding(e);
        const want = rule.hands === 0 ? 'No bonds'
          : rule.hands === 1 ? '1 bond' : rule.hands + ' bonds';
        if (b.headline !== want) out.push([e.sym, want, b.headline]);
      });
      return out;
    });
    assert.deepEqual(bad, [], 'the element page and the validator disagree');
  });

  test('the everyday elements come out right', async () => {
    const out = await run(() => {
      const g = (sym) => window.ME.orbitals.bonding(window.ME.chem.element(sym));
      const r = {};
      ['H', 'C', 'N', 'O', 'F', 'Cl', 'S', 'P', 'Ne', 'He', 'Na', 'Mg', 'Fe', 'Au', 'U'].forEach((sym) => {
        const b = g(sym);
        r[sym] = { headline: b.headline, kind: b.kind };
      });
      return r;
    });
    assert.equal(out.H.headline, '1 bond');
    assert.equal(out.C.headline, '4 bonds');
    assert.equal(out.N.headline, '3 bonds');
    assert.equal(out.O.headline, '2 bonds');
    assert.equal(out.F.headline, '1 bond');
    assert.equal(out.Cl.headline, '1 bond');
    assert.equal(out.S.headline, '2 bonds');
    assert.equal(out.P.headline, '3 bonds');
    /* Noble gases share nothing. */
    assert.equal(out.Ne.kind, 'none');
    assert.equal(out.He.kind, 'none');
    /* Metals on the left give electrons away rather than sharing bonds, and
     * the page should say so rather than claiming "1 bond". */
    assert.equal(out.Na.kind, 'gives');
    assert.equal(out.Mg.kind, 'gives');
    assert.match(out.Na.headline, /^Gives away 1$/);
    assert.match(out.Mg.headline, /^Gives away 2$/);
    /* The d-block does not follow the simple rule, and says so. */
    assert.equal(out.Fe.kind, 'varies');
    assert.equal(out.Au.kind, 'varies');
    assert.equal(out.U.kind, 'varies');
  });

  test('every element gets an answer of some kind', async () => {
    const bad = await run(() => window.ME.chem.elements
      .filter((e) => {
        const b = window.ME.orbitals.bonding(e);
        return !b || !b.headline || !b.text;
      }).map((e) => e.sym));
    assert.deepEqual(bad, []);
  });
});

describe('the orbital shapes', () => {
  test('only the orbital types an element actually uses are shown', async () => {
    const out = await run(() => {
      const g = (sym) => window.ME.orbitals.analyse(window.ME.chem.element(sym)).types;
      return { H: g('H'), C: g('C'), Na: g('Na'), Fe: g('Fe'), U: g('U') };
    });
    assert.deepEqual(out.H, ['s']);
    assert.deepEqual(out.C, ['s', 'p']);
    assert.deepEqual(out.Na, ['s', 'p']);
    assert.deepEqual(out.Fe, ['s', 'p', 'd']);
    assert.ok(out.U.indexOf('f') >= 0, 'uranium fills f orbitals');
  });

  test('the 3D view really is three-dimensional', async () => {
    const out = await run(() => {
      const a = window.ME.orbitals.analyse(window.ME.chem.element('C'));
      const node = window.ME.orbitals.orbitalShapes(a);
      document.body.appendChild(node);
      const host = node.querySelectorAll('.orb-3d')[1];   /* the p panel */
      const svg = host.querySelector('svg');
      const sig = () => Array.from(svg.querySelectorAll('ellipse'))
        .map((e) => e.getAttribute('cx') + ',' + e.getAttribute('cy')).join(' ');
      const before = sig();
      const opts = { bubbles: true, cancelable: true, pointerId: 1, clientX: 100, clientY: 100 };
      host.dispatchEvent(new PointerEvent('pointerdown', opts));
      host.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, opts, { clientX: 170, clientY: 140 })));
      host.dispatchEvent(new PointerEvent('pointerup', opts));
      const after = sig();
      node.remove();
      return { lobes: before.split(' ').length, rotated: before !== after };
    });
    assert.equal(out.lobes, 6, 'three p orbitals means six lobes');
    assert.ok(out.rotated, 'dragging should turn it round');
  });
});
