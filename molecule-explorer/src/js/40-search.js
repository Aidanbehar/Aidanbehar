/* Searching the offline database.
 *
 * Everything here runs against an index built once at startup, so results can
 * appear on every keystroke without a network round trip. Four kinds of query
 * are understood, tried in this order:
 *   a molecular formula   "C8H10N4O2"
 *   a SMILES string       "CN1C=NC2=C1C(=O)N(C)C(=O)N2C"
 *   a name or synonym     "vitamin c", "table salt", "caffiene"
 *   a fragment of either
 */
(function () {
  'use strict';

  const ME = window.ME;

  /* Collapse everything that should not affect a match: case, spaces, hyphens,
   * commas and the primes and brackets that litter chemical names. */
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[\s\-_,'’·.()\[\]]/g, '');
  }

  /* --------------------------------------------------------------- index */
  const state = { molecules: [], entries: [], byName: new Map(), byID: new Map(), ready: false };

  function build(molecules) {
    state.molecules = molecules;
    state.entries = [];
    state.byName.clear();
    state.byID.clear();

    molecules.forEach((m, idx) => {
      const keys = new Set();
      const add = (v) => { const n = norm(v); if (n.length > 1) keys.add(n); };
      add(m.n);
      if (m.t && m.t !== m.n) add(m.t);
      (m.s || []).forEach(add);
      if (m.i) add(m.i);
      m.__keys = Array.from(keys);
      m.__norm = norm(m.n);
      m.__formulaKey = formulaKey(m.f);
      m.__idx = idx;
      state.byName.set(m.__norm, m);
      if (m.id) {
        if (!state.byID.has(m.id)) state.byID.set(m.id, m);
      }
      m.__keys.forEach((k) => state.entries.push({ k, m }));
    });
    state.ready = true;
  }

  /* --------------------------------------------------------- formula keys */
  /* "C8H10N4O2" and "H10C8O2N4" describe the same thing. Sort the elements so
   * either spelling matches. */
  function formulaKey(f) {
    if (!f) return '';
    const counts = {};
    const re = /([A-Z][a-z]?)(\d*)/g;
    let m, any = false;
    while ((m = re.exec(f)) !== null) {
      if (!m[1]) continue;
      any = true;
      counts[m[1]] = (counts[m[1]] || 0) + (m[2] ? parseInt(m[2], 10) : 1);
    }
    if (!any) return '';
    return Object.keys(counts).sort().map((k) => k + counts[k]).join('');
  }

  function looksLikeFormula(q) {
    const t = q.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+\-]+$/.test(t)) return false;
    if (!/\d/.test(t)) return false;                 /* "CO" is a name too */
    if (!/^[A-Z]/.test(t)) return false;
    return /^([A-Z][a-z]?\d*)+[+-]?\d*$/.test(t);
  }

  /* --------------------------------------------------------- string score */
  /* Levenshtein distance, abandoned as soon as it exceeds what we will accept. */
  function editDistance(a, b, max) {
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    let prev = new Array(lb + 1);
    let cur = new Array(lb + 1);
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
      cur[0] = i;
      let best = cur[0];
      const ca = a.charCodeAt(i - 1);
      for (let j = 1; j <= lb; j++) {
        const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      const t = prev; prev = cur; cur = t;
    }
    return prev[lb];
  }

  function fuzzyBudget(len) {
    if (len <= 3) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    return 3;
  }

  /* How well does one index key answer this query? Higher is better; 0 means
   * no match at all. */
  function scoreKey(key, q) {
    if (key === q) return 1000;
    if (key.startsWith(q)) return 880 - Math.min(60, key.length - q.length);
    const at = key.indexOf(q);
    if (at >= 0) return 700 - Math.min(80, at * 4) - Math.min(40, key.length - q.length);
    /* Only try the expensive comparison on keys of a plausible length. */
    const budget = fuzzyBudget(q.length);
    if (budget === 0) return 0;
    if (Math.abs(key.length - q.length) > budget) {
      /* the typo might be inside a longer name: compare against its head */
      if (key.length > q.length && key.length - q.length <= 4) {
        const d2 = editDistance(key.slice(0, q.length), q, budget);
        if (d2 <= budget) return 430 - d2 * 70;
      }
      return 0;
    }
    const d = editDistance(key, q, budget);
    if (d <= budget) return 520 - d * 80;
    return 0;
  }

  /* ------------------------------------------------------------- querying */
  function search(query, limit) {
    limit = limit || 25;
    const raw = String(query || '').trim();
    if (!raw) return { kind: 'empty', results: [] };
    if (!state.ready) return { kind: 'empty', results: [] };

    /* 1. a formula */
    if (looksLikeFormula(raw)) {
      const key = formulaKey(raw);
      const hits = state.molecules.filter((m) => m.__formulaKey === key);
      if (hits.length) {
        return {
          kind: 'formula',
          note: hits.length > 1
            ? `${hits.length} molecules share the formula ${raw}. Same atoms, different arrangements — and different substances.`
            : null,
          results: hits.map((m) => ({ m, score: 1000, why: 'matched by formula' })),
        };
      }
    }

    /* 2. a structure */
    if (looksLikeStructure(raw)) {
      const hit = byStructure(raw);
      if (hit) return { kind: 'structure', results: [{ m: hit, score: 1000, why: 'matched by structure' }] };
    }

    /* 3. a name */
    const q = norm(raw);
    if (!q) return { kind: 'name', results: [] };

    const best = new Map();
    for (let i = 0; i < state.entries.length; i++) {
      const e = state.entries[i];
      const s = scoreKey(e.k, q);
      if (s <= 0) continue;
      const prev = best.get(e.m);
      if (!prev || s > prev.score) best.set(e.m, { score: s, key: e.k });
    }

    const results = [];
    best.forEach((v, m) => {
      let score = v.score;
      if (m.g) score += 22;                            /* famous ones first */
      if (v.key === m.__norm) score += 30;             /* matched the real name */
      results.push({
        m, score,
        why: v.key === m.__norm ? null : describeWhy(v.key, m, q),
      });
    });
    results.sort((a, b) => b.score - a.score || a.m.n.length - b.m.n.length);

    const typo = results.length && results[0].score < 700 && results[0].score >= 400;
    return { kind: 'name', typo, results: results.slice(0, limit) };
  }

  function describeWhy(key, m, q) {
    if (key === q) return `also known as "${key}"`;
    return `matched "${key}"`;
  }

  /* --------------------------------------------------------- by structure */
  function looksLikeStructure(q) {
    const t = q.trim();
    if (t.length < 2 || /\s/.test(t)) return false;
    if (t.includes('V2000') || t.includes('V3000')) return true;
    /* Characters that only ever appear in SMILES, never in a compound name. */
    if (/[=#@\[\]()\\\/]/.test(t)) return true;
    /* An all-lowercase organic-subset string like "ccco" would be ambiguous
     * with a name, so only treat it as SMILES when nothing is named that. */
    if (/^[BCNOPSFIbcnops0-9+\-]+$/.test(t) && !state.byName.has(norm(t))) return true;
    return false;
  }

  function byStructure(text) {
    const mol = ME.chem.tryParse(text);
    if (!mol) return null;
    const id = ME.chem.canonicalID(mol);
    return (id && state.byID.get(id)) || null;
  }

  /* Used by the Draw view: does this drawing match something we know? */
  function recognise(mol) {
    if (!mol || mol.getAllAtoms() === 0) return null;
    const id = ME.chem.canonicalID(mol);
    if (!id) return null;
    return state.byID.get(id) || null;
  }

  function get(name) {
    return state.byName.get(norm(name)) || null;
  }
  function byIndex(i) { return state.molecules[i] || null; }
  function all() { return state.molecules; }
  function gallery() { return state.molecules.filter((m) => m.g); }

  ME.search = { build, search, recognise, get, byIndex, all, gallery, norm, formulaKey, looksLikeFormula, editDistance };
})();
