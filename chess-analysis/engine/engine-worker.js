/*
 * Web Worker that hosts the official Stockfish 19 WebAssembly build.
 *
 * Protocol (postMessage):
 *   in : { type: 'init', arch?: 'auto'|'simd'|'relaxed' }
 *        { type: 'cmd', cmd: string }            -> one UCI command line
 *   out: { type: 'status', message }
 *        { type: 'progress', loaded, total }      -> NNUE download progress
 *        { type: 'ready', arch, cores }
 *        { type: 'line', line }                   -> one line of engine stdout
 *        { type: 'error', code, message }
 *
 * The engine itself runs its UCI loop on a pthread (PROXY_TO_PTHREAD), so this
 * worker never blocks; commands are queued into the engine via sf_uci_push().
 */
/* global Stockfish19 */
'use strict';

const ENGINE_BASE = './stockfish-19/';

if (self.name === 'em-pthread') {
  // Emscripten starts each engine thread by loading *this* script (the worker's
  // own URL) with name "em-pthread". Hand over to the Emscripten glue, which
  // receives the already-compiled WebAssembly module from the parent. The glue
  // of the two builds is identical apart from the .wasm filename, so either works.
  importScripts(ENGINE_BASE + 'stockfish-19.js');
} else {

let engine = null;
let netName = null;
let fatal = false;

const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
const RELAXED_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 15, 1, 13, 0, 65, 1, 253, 15, 65, 2, 253, 15, 253, 128, 2, 11]);

function post(msg) { self.postMessage(msg); }
function fail(code, message) {
  fatal = true;
  post({ type: 'error', code, message });
}

function validates(bytes) {
  try { return WebAssembly.validate(bytes); } catch (e) { return false; }
}

async function fetchText(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw Object.assign(new Error(`${url}: HTTP ${r.status}`), { code: 'missing-file' });
  return r.text();
}

async function fetchNetwork(base) {
  const parts = (await fetchText(base + 'nnue-parts.txt')).split(/\s+/).filter(Boolean);
  const shaLine = (await fetchText(base + 'nnue.sha256')).trim();
  const [expectedSha, name] = shaLine.split(/\s+/);
  if (!parts.length || !name) throw Object.assign(new Error('NNUE manifest is empty or malformed'), { code: 'nnue-missing' });

  // HEAD-less size discovery: read Content-Length of each part as we go.
  const responses = [];
  let total = 0;
  for (const p of parts) {
    const r = await fetch(base + p, { cache: 'no-cache' });
    if (!r.ok) throw Object.assign(new Error(`NNUE file ${p}: HTTP ${r.status}`), { code: 'nnue-missing' });
    responses.push(r);
    total += Number(r.headers.get('Content-Length') || 0);
  }
  const chunks = [];
  let loaded = 0;
  let lastPost = 0;
  for (const r of responses) {
    const reader = r.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      const now = Date.now();
      if (now - lastPost > 100) { lastPost = now; post({ type: 'progress', loaded, total }); }
    }
  }
  post({ type: 'progress', loaded, total: total || loaded });
  const bytes = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) { bytes.set(c, off); off += c.length; }

  post({ type: 'status', message: 'Verifying neural network (SHA-256)…' });
  if (self.crypto && self.crypto.subtle) {
    const digest = new Uint8Array(await self.crypto.subtle.digest('SHA-256', bytes));
    const hex = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
    if (hex !== expectedSha) {
      throw Object.assign(new Error(`NNUE checksum mismatch (got ${hex.slice(0, 12)}…, expected ${expectedSha.slice(0, 12)}…). The file is corrupt or incomplete.`), { code: 'nnue-corrupt' });
    }
  }
  return { name, bytes };
}

async function init(opts) {
  const base = ENGINE_BASE;
  if (typeof WebAssembly !== 'object') return fail('unsupported', 'This browser does not support WebAssembly.');
  if (typeof SharedArrayBuffer === 'undefined' || self.crossOriginIsolated === false) {
    return fail('not-isolated', 'SharedArrayBuffer is unavailable. Stockfish 19 needs a cross-origin-isolated page: start the app with the provided launcher (serve.py), not by opening index.html directly.');
  }
  if (!validates(SIMD_PROBE)) return fail('unsupported', 'This browser does not support WebAssembly SIMD, which the Stockfish 19 build requires (Chrome 91+, Firefox 89+, Safari 16.4+).');

  let arch = opts.arch || 'auto';
  if (arch === 'auto') arch = validates(RELAXED_PROBE) ? 'relaxed' : 'simd';
  const script = base + (arch === 'relaxed' ? 'stockfish-19-relaxed.js' : 'stockfish-19.js');

  let net;
  try {
    post({ type: 'status', message: 'Loading Stockfish 19 neural network…' });
    net = await fetchNetwork(base);
    netName = net.name;
  } catch (e) {
    return fail(e.code || 'nnue-missing', e.message);
  }

  try {
    importScripts(script);
  } catch (e) {
    return fail('missing-file', `Could not load the engine script ${script}: ${e.message}`);
  }
  if (typeof Stockfish19 !== 'function') return fail('missing-file', `Engine script ${script} did not define Stockfish19().`);

  post({ type: 'status', message: 'Starting Stockfish 19…' });
  const scriptUrl = new URL(script, self.location.href).href;
  try {
    engine = await Stockfish19({
      locateFile: (f) => new URL(f, scriptUrl).href,
      print: (line) => {
        post({ type: 'line', line });
        if (/^info string ERROR/.test(line) || /CRITICAL ERROR/.test(line)) {
          post({ type: 'error', code: /network|NNUE|EvalFile/i.test(line) ? 'nnue-failed' : 'engine-error', message: line.replace(/^info string /, '') });
        }
      },
      printErr: (line) => post({ type: 'line', line: `[stderr] ${line}` }),
      preRun: [(m) => { m.FS.writeFile('/' + net.name, net.bytes); net.bytes = null; }],
      onAbort: (what) => fail('crashed', `Stockfish aborted: ${what}`),
      onExit: (code) => { if (!fatal) fail('exited', `Stockfish exited (code ${code}).`); },
    });
  } catch (e) {
    return fail('init-failed', `Stockfish failed to initialise: ${e && e.message ? e.message : e}`);
  }
  post({ type: 'ready', arch, cores: self.navigator.hardwareConcurrency || 1, net: netName });
}

self.onmessage = (ev) => {
  const msg = ev.data || {};
  if (msg.type === 'init') {
    init(msg).catch((e) => fail('init-failed', String(e && e.message ? e.message : e)));
  } else if (msg.type === 'cmd') {
    if (!engine || fatal) return;
    try {
      engine.ccall('sf_uci_push', null, ['string'], [String(msg.cmd)]);
    } catch (e) {
      fail('crashed', `Engine call failed: ${e.message}`);
    }
  }
};
}
