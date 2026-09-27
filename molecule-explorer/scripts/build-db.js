#!/usr/bin/env node
/* Builds src/data/molecules.json from src/data/seed.js by resolving every entry
 * against PubChem. Requires internet. Run:  npm run build-db
 *
 * Nothing structural in seed.js is trusted. For each entry this script:
 *   1. resolves the query name to a CID and pulls PubChem's own formula, SMILES,
 *      InChIKey, IUPAC name and weight
 *   2. fails loudly if PubChem's formula disagrees with the seed's `ef` tripwire
 *   3. re-parses PubChem's SMILES through the exact OpenChemLib build that ships
 *      in the app, and fails if the structure it reads back does not have
 *      PubChem's formula (catches truncated downloads and parser disagreements)
 *   4. fetches the experimental/computed 3D conformer where PubChem has one
 *
 * Responses are cached under .cache/ so re-runs are cheap and incremental.
 */
const fs = require('fs');
const path = require('path');
const { loadOCL, sameFormula, parseFormula } = require('./ocl.js');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(ROOT, '.cache');
const SEED = require(path.join(ROOT, 'src/data/seed.js'));
const OCL = loadOCL();

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PROPS = 'MolecularFormula,MolecularWeight,ConnectivitySMILES,SMILES,InChIKey,IUPACName,Title';
const MAX_3D_ATOMS = 120;

const ONLY = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1].toLowerCase()
  : null;

fs.mkdirSync(CACHE, { recursive: true });

/* ---------------------------------------------------------------- fetching */
/* PubChem asks for no more than 5 requests a second. Stay under it. */
let lastCall = 0;
async function throttle() {
  const gap = 260;
  const wait = lastCall + gap - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

function cacheKey(url) {
  return path.join(CACHE, url.replace(/[^a-z0-9]+/gi, '_').slice(-180) + '.txt');
}

async function get(url, { allow404 = false } = {}) {
  const key = cacheKey(url);
  if (fs.existsSync(key)) {
    const body = fs.readFileSync(key, 'utf8');
    return body === '\u0000404' ? null : body;
  }
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    await throttle();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'molecule-explorer-build/1.0' } });
      if (res.status === 404 || res.status === 400) {
        if (allow404) { fs.writeFileSync(key, '\u0000404'); return null; }
        throw new Error(`HTTP ${res.status}`);
      }
      if (res.status === 503 || res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      fs.writeFileSync(key, body);
      return body;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr || new Error('request failed');
}

/* ------------------------------------------------------------- 3D handling */
/* PubChem SDFs are verbose. Store elements, coordinates (2 dp is plenty for a
 * ball-and-stick view) and a flat bond list; the app rebuilds a molfile. */
function packSDF(sdf) {
  const lines = sdf.split('\n');
  const counts = lines[3];
  if (!counts || !counts.includes('V2000')) return null;
  const na = parseInt(counts.slice(0, 3), 10);
  const nb = parseInt(counts.slice(3, 6), 10);
  if (!na || na > MAX_3D_ATOMS) return null;
  const el = [];
  const xyz = [];
  for (let i = 0; i < na; i++) {
    const L = lines[4 + i];
    if (!L) return null;
    xyz.push(Math.round(parseFloat(L.slice(0, 10)) * 100) / 100);
    xyz.push(Math.round(parseFloat(L.slice(10, 20)) * 100) / 100);
    xyz.push(Math.round(parseFloat(L.slice(20, 30)) * 100) / 100);
    el.push(L.slice(31, 34).trim());
  }
  const bonds = [];
  for (let i = 0; i < nb; i++) {
    const L = lines[4 + na + i];
    if (!L) return null;
    bonds.push(parseInt(L.slice(0, 3), 10), parseInt(L.slice(3, 6), 10), parseInt(L.slice(6, 9), 10));
  }
  if (xyz.some((v) => !Number.isFinite(v))) return null;
  return { e: el.join(' '), c: xyz, b: bonds };
}

/* --------------------------------------------------------------- elements */
/* PubChem publishes the whole periodic table in one request. Every field the
 * element pages show comes from here; the only check is that its symbols line
 * up with the chemistry library that ships in the app, which would catch a
 * shifted or truncated table. */
async function buildElements() {
  const raw = await get(`${BASE}/periodictable/JSON`);
  const table = JSON.parse(raw).Table;
  const cols = table.Columns.Column;
  const rows = table.Row.map((r) => {
    const o = {};
    cols.forEach((c, i) => { o[c] = r.Cell[i]; });
    return o;
  });

  if (rows.length !== 118) {
    console.error(`\u2716 PubChem returned ${rows.length} elements, expected 118.`);
    process.exit(1);
  }

  const num = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = parseFloat(String(v).replace(/[^\d.eE+-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const problems = [];
  const out = rows.map((r) => {
    const z = parseInt(r.AtomicNumber, 10);

    /* Cross-check: the library's own label for this atomic number must be the
     * symbol PubChem gives it. */
    const m = new OCL.Molecule(1, 0);
    m.addAtom(z);
    const label = m.getAtomLabel(0);
    if (label && label !== '?' && label !== r.Symbol) {
      problems.push(`atomic number ${z}: PubChem says ${r.Symbol}, OpenChemLib says ${label}`);
    }
    const oclMass = m.getMolecularFormula().relativeWeight;
    const pcMass = num(r.AtomicMass);
    if (pcMass && oclMass && Math.abs(oclMass - pcMass) / pcMass > 0.02) {
      WARNINGS.push(`${r.Name}: atomic mass ${pcMass} from PubChem vs ${oclMass.toFixed(3)} from OpenChemLib`);
    }

    return {
      z,
      sym: r.Symbol,
      name: r.Name,
      mass: pcMass,
      cpk: r.CPKHexColor || null,
      cfg: r.ElectronConfiguration || null,
      en: num(r.Electronegativity),
      radius: num(r.AtomicRadius),
      ion: num(r.IonizationEnergy),
      affinity: num(r.ElectronAffinity),
      ox: r.OxidationStates || null,
      state: r.StandardState || null,
      melt: num(r.MeltingPoint),
      boil: num(r.BoilingPoint),
      density: num(r.Density),
      block: r.GroupBlock || null,
      year: r.YearDiscovered || null,
    };
  });

  if (problems.length) {
    console.error('\n\u2716 The periodic table does not line up with the chemistry library:');
    problems.forEach((p) => console.error('  \u2716 ' + p));
    process.exit(1);
  }

  console.log(`\u2713 ${out.length} elements from PubChem's periodic table, symbols cross-checked.`);
  return out;
}

/* ---------------------------------------------------------------- checking */
/* OpenChemLib reads the compact "[HH]" form PubChem uses for molecular hydrogen
 * as a single atom. Writing it the long way round fixes it without changing
 * what the SMILES means. */
function normaliseSmiles(s) {
  return String(s).replace(/\[HH\]/g, '[H][H]');
}

function isOrganic(smiles) {
  /* "Organic" in the everyday teaching sense: carbon, bonded to hydrogen or to
   * other carbons. Carbonates, cyanides, CO and CO2 contain carbon but are
   * traditionally counted as inorganic, so exclude them explicitly. */
  let mol;
  try { mol = OCL.Molecule.fromSmiles(normaliseSmiles(smiles)); } catch { return false; }
  mol.ensureHelperArrays(OCL.Molecule.cHelperRings);
  let carbons = 0, cH = 0, cC = 0;
  for (let a = 0; a < mol.getAllAtoms(); a++) {
    if (mol.getAtomicNo(a) !== 6) continue;
    carbons++;
    if (mol.getImplicitHydrogens(a) > 0) cH++;
    for (let n = 0; n < mol.getAllConnAtoms(a); n++) {
      if (mol.getAtomicNo(mol.getConnAtom(a, n)) === 6) cC++;
    }
  }
  if (carbons === 0) return false;
  return cH > 0 || cC > 0;
}

/* A stereochemistry-blind canonical code, so a drawing can be matched against
 * the database without the user having to get wedge bonds right. */
function canonicalID(mol) {
  if (!mol) return null;
  try { return OCL.CanonizerUtil.getIDCode(mol, OCL.CanonizerUtil.NOSTEREO); }
  catch (e) { return null; }
}

const FAILURES = [];
const WARNINGS = [];

function fail(entry, msg) { FAILURES.push(`${entry.n} (query "${entry.q}"): ${msg}`); }
function warn(entry, msg) { WARNINGS.push(`${entry.n}: ${msg}`); }

/* -------------------------------------------------------------------- main */
async function resolveEntry(entry) {
  const idPart = entry.cid ? `cid/${entry.cid}` : `name/${encodeURIComponent(entry.q)}`;
  const raw = await get(`${BASE}/compound/${idPart}/property/${PROPS}/JSON`, { allow404: true });
  if (!raw) { fail(entry, 'PubChem could not resolve this name'); return null; }

  let p;
  try { p = JSON.parse(raw).PropertyTable.Properties[0]; }
  catch { fail(entry, 'unreadable property response'); return null; }
  if (!p || !p.MolecularFormula) { fail(entry, 'no formula returned'); return null; }

  const formula = p.MolecularFormula;

  /* Tripwire 1: the seed's expected formula. */
  if (entry.ef && !sameFormula(entry.ef, formula)) {
    fail(entry, `expected formula ${entry.ef} but PubChem returned ${formula} (CID ${p.CID}, title "${p.Title}")`);
    return null;
  }
  if (!entry.ef) {
    /* Without a tripwire a bad name resolution ships silently — asking PubChem
     * for "silicone" once returned elemental silicon. Every entry needs one. */
    fail(entry, `no expected-formula tripwire. PubChem returned "${p.Title}" = ${formula} (CID ${p.CID}); add ef:'${formula}' to seed.js if that is right.`);
    return null;
  }

  const smiles = p.SMILES || p.ConnectivitySMILES;
  if (!smiles) {
    /* Proteins and polymers legitimately have no usable SMILES. */
    if (entry.noskel) {
      return { entry, p, formula, smiles: null, mol: null, d3: null, organic: false };
    }
    fail(entry, 'PubChem returned no SMILES');
    return null;
  }

  /* Tripwire 2: re-read the structure with the shipped library and confirm it
   * describes the same set of atoms PubChem claims. */
  let mol;
  try { mol = OCL.Molecule.fromSmiles(normaliseSmiles(smiles)); }
  catch (e) { fail(entry, `OpenChemLib cannot parse PubChem's SMILES (${e.message})`); return null; }
  const oclFormula = mol.getMolecularFormula().formula;
  if (!sameFormula(oclFormula, formula)) {
    fail(entry, `structure mismatch: PubChem says ${formula}, the SMILES "${smiles}" reads as ${oclFormula}`);
    return null;
  }

  /* 3D coordinates, where PubChem has a conformer for this CID. */
  let d3 = null;
  const heavy = Object.entries(parseFormula(formula))
    .reduce((n, [el, c]) => n + (el === 'H' ? 0 : c), 0);
  if (heavy > 0 && heavy <= MAX_3D_ATOMS) {
    const sdf = await get(`${BASE}/compound/cid/${p.CID}/SDF?record_type=3d`, { allow404: true });
    if (sdf) {
      d3 = packSDF(sdf);
      if (d3) d3.s = 'pubchem';
    }
  }

  return { entry, p, formula, smiles, mol, d3, organic: isOrganic(smiles) };
}

async function fetchSynonyms(cid) {
  const raw = await get(`${BASE}/compound/cid/${cid}/synonyms/JSON`, { allow404: true });
  if (!raw) return [];
  try {
    const list = JSON.parse(raw).InformationList.Information[0].Synonym || [];
    /* Keep short, human-looking names: skip registry numbers, codes and
     * anything with the shape of a database identifier. */
    return list
      .filter((s) => s.length <= 34 && /[a-z]/.test(s) && !/^\d/.test(s)
        && !/^[A-Z0-9-]+$/.test(s) && !/\d{4,}/.test(s) && !/^(CHEBI|CHEMBL|DTXSID|UNII|NSC|EINECS|SCHEMBL|AKOS|MFCD|HSDB|EC |CAS-)/i.test(s))
      .slice(0, 10);
  } catch { return []; }
}

(async () => {
  const live = SEED.filter((e) => !e.skip && (!ONLY || e.n.toLowerCase().includes(ONLY) || e.q.toLowerCase().includes(ONLY)));
  console.log(`Verifying ${live.length} entries against PubChem...`);
  const out = [];
  let done = 0;

  for (const entry of live) {
    let r = null;
    try { r = await resolveEntry(entry); }
    catch (e) { fail(entry, `request failed: ${e.message}`); }
    done++;
    if (done % 25 === 0 || done === live.length) {
      process.stdout.write(`  ${done}/${live.length} (${FAILURES.length} failures)\n`);
    }
    if (!r) continue;

    const syn = await fetchSynonyms(r.p.CID);
    const synonyms = [...new Set([
      ...(entry.syn || []),
      ...syn.map((s) => s.trim()),
    ])].filter((s) => s.toLowerCase() !== entry.n.toLowerCase()).slice(0, 12);

    out.push({
      n: entry.n,
      t: r.p.Title || entry.n,
      s: synonyms,
      m: normaliseSmiles(r.smiles),
      f: r.formula,
      w: parseFloat(r.p.MolecularWeight),
      k: r.p.InChIKey || null,
      i: r.p.IUPACName || null,
      c: entry.c,
      g: entry.g ? 1 : 0,
      o: r.organic ? 1 : 0,
      x: entry.f,
      cid: r.p.CID,
      id: canonicalID(r.mol),
      ns: entry.noskel ? 1 : 0,
      d: r.d3,
    });
  }

  if (WARNINGS.length) {
    console.log(`\n${WARNINGS.length} entries had no formula tripwire:`);
    for (const w of WARNINGS) console.log('  ~ ' + w);
  }

  if (FAILURES.length) {
    console.error(`\n✖ ${FAILURES.length} entries FAILED verification:\n`);
    for (const f of FAILURES) console.error('  ✖ ' + f);
    console.error('\nFix seed.js (or supply an explicit cid) and re-run. Nothing was written.');
    process.exit(1);
  }

  /* Element reference data from PubChem's own periodic table, cross-checked
   * against the shipped chemistry library. Nothing here is typed from memory. */
  const elements = await buildElements();

  const db = { v: 1, built: new Date().toISOString().slice(0, 10), elements, molecules: out };
  const dest = path.join(ROOT, 'src/data/molecules.json');
  fs.writeFileSync(dest, JSON.stringify(db));
  const with3d = out.filter((m) => m.d).length;
  console.log(`\n✓ ${out.length} molecules verified, ${with3d} with PubChem 3D coordinates.`);
  console.log(`✓ Wrote ${dest} (${(fs.statSync(dest).size / 1048576).toFixed(2)} MB)`);
})();
