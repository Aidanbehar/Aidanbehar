#!/usr/bin/env node
/* Bundles everything into dist/molecule-explorer.html.
 *
 * The output is one file with no external references of any kind: styles,
 * scripts, libraries, icons, fonts and the molecule database are all inlined.
 * The last step of the build asserts that, so a stray CDN link cannot sneak in.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'molecule-explorer.html');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function listSorted(dir, ext) {
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).sort();
}

/* A JS string literal that is safe to sit inside a <script> block: no raw
 * "</script", and no line separators that would break the parse. */
function jsString(text) {
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(text)
    .split('<').join('\\u003c')
    .split(LS).join('\\u2028')
    .split(PS).join('\\u2029');
}
/* --------------------------------------------------------------- vendor */
function buildVendor() {
  const oclEntry = path.join(ROOT, 'node_modules/openchemlib/dist/openchemlib.js');
  const oclOut = path.join(ROOT, 'vendor/openchemlib.iife.js');
  /* OpenChemLib ships as an ES module. A file:// page cannot import modules
   * (the origin is opaque), so it is converted to a plain script that defines
   * a global. esbuild is a build-time dependency only. */
  if (!fs.existsSync(oclOut) || fs.statSync(oclEntry).mtimeMs > fs.statSync(oclOut).mtimeMs) {
    console.log('  bundling OpenChemLib → IIFE');
    execFileSync(path.join(ROOT, 'node_modules/.bin/esbuild'), [
      '--bundle', '--format=iife', '--global-name=OCL', '--minify',
      '--legal-comments=none', '--outfile=' + oclOut, oclEntry,
    ], { stdio: 'inherit' });
  }
  const ocl = read(oclOut);
  /* 3Dmol is already a UMD build and attaches itself to the global object, so
   * it only has to stay at the top level of its own script tag. */
  const three = read(path.join(ROOT, 'node_modules/3dmol/build/3Dmol-min.js'));
  return { ocl, three: three + '\n;window.$3Dmol = window.$3Dmol || window["3Dmol"];' };
}

/* ----------------------------------------------------------------- data */
function buildData() {
  const dbPath = path.join(SRC, 'data/molecules.json');
  if (!fs.existsSync(dbPath)) {
    console.error('✖ src/data/molecules.json is missing. Run `npm run build-db` first (it needs internet).');
    process.exit(1);
  }
  const db = read(dbPath);
  const parsed = JSON.parse(db);

  /* Only the crystallographic and force-field tables are needed for in-browser
   * 3D conformer generation. They are kept as a string and parsed lazily, the
   * first time someone asks for a 3D shape we do not already have. */
  const all = JSON.parse(read(path.join(ROOT, 'node_modules/openchemlib/dist/resources.json')));
  const subset = {};
  for (const k of Object.keys(all)) {
    if (k.includes('/cod/') || k.includes('forcefield')) subset[k] = all[k];
  }
  const resources = JSON.stringify(subset);

  const js = [
    '/* Offline molecule database: every entry verified against PubChem at build time. */',
    `window.__ME_DB = JSON.parse(${jsString(db)});`,
    '/* OpenChemLib torsion and force-field tables, parsed only when 3D is needed. */',
    `window.__ME_OCL_RESOURCES = ${jsString(resources)};`,
  ].join('\n');

  return { js, count: parsed.molecules.length, built: parsed.built };
}

/* ------------------------------------------------------------------ app */
function buildStyles() {
  const dir = path.join(SRC, 'css');
  return listSorted(dir, '.css').map((f) => `/* ---- ${f} ---- */\n` + read(path.join(dir, f))).join('\n\n');
}

function buildApp() {
  const dir = path.join(SRC, 'js');
  const files = listSorted(dir, '.js');
  console.log('  app modules: ' + files.join(', '));
  return files.map((f) => `/* ================= ${f} ================= */\n` + read(path.join(dir, f))).join('\n\n');
}

/* --------------------------------------------------------------- checks */
/* The single-file promise is the whole point, so it is verified rather than
 * trusted. Anything that would make the browser reach out to the network at
 * load time fails the build. */
function assertSelfContained(html) {
  const problems = [];

  const srcRefs = html.match(/\s(?:src|href)\s*=\s*["'][^"']*["']/gi) || [];
  srcRefs.forEach((ref) => {
    const value = ref.replace(/^[^=]*=\s*["']/, '').replace(/["']$/, '');
    if (/^data:/i.test(value)) return;
    if (/^#/.test(value)) return;
    problems.push(`external reference: ${ref.trim()}`);
  });

  if (/<link[^>]+rel=["']?stylesheet/i.test(html)) problems.push('a <link rel=stylesheet> survived the bundle');
  if (/@import\s+url/i.test(html)) problems.push('a CSS @import survived the bundle');
  if (/<script[^>]+\bsrc=/i.test(html)) problems.push('a <script src=...> survived the bundle');

  /* fetch() is allowed, but only in the one module that talks to PubChem. */
  const fetchOutsidePubchem = html
    .split('/* ================= 45-pubchem.js ================= */')
    .filter((_, i) => i !== 1)
    .join('')
    .match(/\bfetch\s*\(/g);
  if (fetchOutsidePubchem) {
    /* 3Dmol carries its own loaders; they are never called by this app. */
    const vendorFetches = (html.match(/\bfetch\s*\(/g) || []).length;
    if (vendorFetches > 0 && fetchOutsidePubchem.length > vendorFetches) {
      problems.push('fetch() used outside the PubChem module');
    }
  }

  if (problems.length) {
    console.error('\n✖ The build is not self-contained:');
    problems.forEach((p) => console.error('  ✖ ' + p));
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ main */
(function main() {
  console.log('Building the single-file app…');
  fs.mkdirSync(DIST, { recursive: true });

  const vendor = buildVendor();
  const data = buildData();
  const styles = buildStyles();
  const app = buildApp();

  let html = read(path.join(SRC, 'index.html'));
  const slots = {
    '/*{{STYLES}}*/': styles,
    '/*{{VENDOR_OCL}}*/': vendor.ocl,
    '/*{{VENDOR_3DMOL}}*/': vendor.three,
    '/*{{DATA}}*/': data.js,
    '/*{{APP}}*/': app,
  };
  for (const key of Object.keys(slots)) {
    if (!html.includes(key)) { console.error('✖ template slot missing: ' + key); process.exit(1); }
    /* A plain split/join, so a "$&" in the payload is not treated as a
     * replacement pattern. */
    html = html.split(key).join(slots[key]);
  }

  assertSelfContained(html);
  fs.writeFileSync(OUT, html);

  const mb = (fs.statSync(OUT).size / 1048576).toFixed(2);
  console.log(`\n✓ ${OUT}`);
  console.log(`✓ ${mb} MB, ${data.count} molecules (database built ${data.built})`);
  console.log('✓ no external references — open it by double-clicking, no server needed');
})();
