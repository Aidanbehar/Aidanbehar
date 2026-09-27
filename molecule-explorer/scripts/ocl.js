/* Loads the bundled OpenChemLib IIFE into a VM sandbox so build scripts use the
 * exact same library build that ships in the HTML file. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let cached = null;

function loadOCL({ withResources = false } = {}) {
  if (cached && (!withResources || cached.resourcesLoaded)) return cached.OCL;
  const ctx = {
    console, Math, Date, JSON, TextEncoder, TextDecoder,
    Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array,
    Float32Array, Float64Array, ArrayBuffer, DataView,
    setTimeout, clearTimeout, setInterval, clearInterval,
    navigator: { userAgent: 'node' },
    performance: { now: () => Date.now() },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'vendor/openchemlib.iife.js'), 'utf8'), ctx);
  const OCL = ctx.OCL;
  let resourcesLoaded = false;
  if (withResources) {
    OCL.Resources.register(readResourceSubset());
    resourcesLoaded = true;
  }
  cached = { OCL, resourcesLoaded };
  return OCL;
}

/* Only the crystallographic (cod) + MMFF94 forcefield entries are needed for
 * 3D conformer generation. The druglikeness/toxicity tables are another ~400 KB
 * of data for features this app does not use. */
function readResourceSubset() {
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/openchemlib/dist/resources.json'), 'utf8'));
  const out = {};
  for (const k of Object.keys(all)) {
    if (k.includes('/cod/') || k.includes('forcefield')) out[k] = all[k];
  }
  return out;
}

/* Element counts from a formula string like "C8H10N4O2" or "Ca3O8P2". */
function parseFormula(f) {
  const counts = {};
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m;
  while ((m = re.exec(f)) !== null) {
    if (!m[1]) continue;
    counts[m[1]] = (counts[m[1]] || 0) + (m[2] ? parseInt(m[2], 10) : 1);
  }
  return counts;
}

function sameFormula(a, b) {
  const ca = parseFormula(a), cb = parseFormula(b);
  const keys = new Set([...Object.keys(ca), ...Object.keys(cb)]);
  for (const k of keys) if ((ca[k] || 0) !== (cb[k] || 0)) return false;
  return true;
}

module.exports = { loadOCL, readResourceSubset, parseFormula, sameFormula };
