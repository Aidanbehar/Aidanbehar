/* The one optional online feature: looking a molecule up in PubChem.
 *
 * Everything else in this app works with the network unplugged. This module
 * exists so that the ~70 million compounds not in the offline database are
 * still reachable when there is a connection, and so that the absence of one
 * is explained rather than just failing.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest';
  const PROPS = 'MolecularFormula,MolecularWeight,ConnectivitySMILES,SMILES,InChIKey,IUPACName,Title';

  /* Session-lifetime caches. Nothing is written to disk. */
  const cache = { props: new Map(), sdf: new Map(), auto: new Map(), syn: new Map() };

  function online() { return navigator.onLine !== false; }

  /* PubChem asks for at most 5 requests a second. A single-file teaching app
   * will never get close, but a fast typist plus autocomplete could, so
   * requests are spaced out and older ones are dropped. */
  let queue = Promise.resolve();
  let lastAt = 0;
  function spaced(fn) {
    queue = queue.then(async () => {
      const gap = 230 - (Date.now() - lastAt);
      if (gap > 0) await new Promise((r) => setTimeout(r, gap));
      lastAt = Date.now();
      return fn();
    }).catch((e) => { throw e; });
    return queue;
  }

  class PubChemError extends Error {
    constructor(kind, message) { super(message); this.kind = kind; }
  }

  async function request(url, { as = 'json', timeout = 12000, signal } = {}) {
    if (!online()) throw new PubChemError('offline', 'You are offline, so only the built-in database is available.');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    if (signal) signal.addEventListener('abort', () => ctrl.abort());
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (res.status === 404) throw new PubChemError('notfound', 'PubChem has nothing under that name.');
      if (res.status === 503 || res.status === 429) {
        throw new PubChemError('busy', 'PubChem is rate-limiting us. Give it a few seconds and try again.');
      }
      if (!res.ok) throw new PubChemError('http', `PubChem replied with an error (${res.status}).`);
      return as === 'text' ? res.text() : res.json();
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof PubChemError) throw e;
      if (e.name === 'AbortError') throw new PubChemError('timeout', 'PubChem did not answer in time.');
      /* A failed fetch from a file:// page is nearly always no connection. */
      throw new PubChemError('network', online()
        ? 'Could not reach PubChem. Check your connection and try again.'
        : 'You are offline, so only the built-in database is available.');
    } finally {
      clearTimeout(timer);
    }
  }

  /* -------------------------------------------------------- autocomplete */
  async function autocomplete(term, signal) {
    const t = String(term || '').trim();
    if (t.length < 2) return [];
    if (cache.auto.has(t)) return cache.auto.get(t);
    const url = `${BASE}/autocomplete/compound/${encodeURIComponent(t)}/json?limit=8`;
    const data = await spaced(() => request(url, { signal }));
    const list = (data && data.dictionary_terms && data.dictionary_terms.compound) || [];
    cache.auto.set(t, list);
    return list;
  }

  /* ------------------------------------------------------------ lookup */
  /* Resolves a name, CID or SMILES into the same shape the offline database
   * uses, so the molecule page does not care where a molecule came from. */
  async function lookup(query, opts) {
    opts = opts || {};
    const key = 'q:' + query;
    if (cache.props.has(key)) return cache.props.get(key);

    let path;
    if (opts.cid) path = `compound/cid/${encodeURIComponent(opts.cid)}`;
    else if (opts.smiles) path = `compound/smiles/${encodeURIComponent(query)}`;
    else path = `compound/name/${encodeURIComponent(query)}`;

    const data = await spaced(() => request(`${BASE}/pug/${path}/property/${PROPS}/JSON`, { signal: opts.signal }));
    const p = data && data.PropertyTable && data.PropertyTable.Properties && data.PropertyTable.Properties[0];
    if (!p || !p.MolecularFormula) throw new PubChemError('notfound', 'PubChem has nothing under that name.');

    const smiles = p.SMILES || p.ConnectivitySMILES || null;
    const rec = {
      source: 'pubchem',
      n: p.Title || query,
      t: p.Title || query,
      s: [],
      m: smiles ? ME.chem.normaliseSmiles(smiles) : null,
      f: p.MolecularFormula,
      w: parseFloat(p.MolecularWeight),
      k: p.InChIKey || null,
      i: p.IUPACName || null,
      c: null,
      g: 0,
      x: null,
      cid: p.CID,
      ns: 0,
      d: null,
    };
    if (rec.m) {
      try {
        const mol = ME.chem.fromSmiles(rec.m);
        rec.o = ME.chem.isOrganic(mol) ? 1 : 0;
        rec.id = ME.chem.canonicalID(mol);
        rec.ns = ME.chem.skeletalMakesSense(mol) ? 0 : 1;
      } catch (e) { rec.o = 0; }
    }
    cache.props.set(key, rec);
    cache.props.set('cid:' + rec.cid, rec);
    return rec;
  }

  async function synonyms(cid, signal) {
    if (cache.syn.has(cid)) return cache.syn.get(cid);
    try {
      const data = await spaced(() => request(`${BASE}/pug/compound/cid/${cid}/synonyms/JSON`, { signal }));
      const list = (data.InformationList.Information[0].Synonym || [])
        .filter((s) => s.length <= 34 && /[a-z]/.test(s) && !/^\d/.test(s) && !/\d{4,}/.test(s))
        .slice(0, 10);
      cache.syn.set(cid, list);
      return list;
    } catch (e) { return []; }
  }

  /* PubChem's own 3D conformer, when it has computed one. */
  async function sdf3d(cid, signal) {
    if (cache.sdf.has(cid)) return cache.sdf.get(cid);
    try {
      const text = await spaced(() => request(`${BASE}/pug/compound/cid/${cid}/SDF?record_type=3d`, { as: 'text', signal }));
      cache.sdf.set(cid, text);
      return text;
    } catch (e) {
      cache.sdf.set(cid, null);
      return null;
    }
  }

  function describeError(e) {
    if (e && e.kind === 'offline') {
      return 'You are offline. Everything else in this app still works — the built-in database of 500-odd molecules is part of the page itself.';
    }
    if (e && e.kind === 'notfound') return 'PubChem has nothing under that name. Try a different spelling, or search by formula.';
    if (e && e.kind === 'busy') return 'PubChem is busy right now. Wait a few seconds and try again.';
    if (e && e.kind === 'timeout') return 'PubChem did not answer in time. It may be slow right now.';
    return (e && e.message) || 'Something went wrong talking to PubChem.';
  }

  ME.pubchem = { autocomplete, lookup, synonyms, sdf3d, online, describeError, PubChemError };
})();
