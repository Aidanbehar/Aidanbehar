/* Everything that knows about chemistry. Structure handling is delegated to
 * OpenChemLib; this module wraps it in the vocabulary the rest of the app uses
 * and adds the teaching-oriented bits (plain-English validation, condensed
 * formulas, functional-group detection). */
(function () {
  'use strict';

  const ME = window.ME;
  const OCL = window.OCL;
  const Mol = OCL.Molecule;

  /* --------------------------------------------------------- element data */
  /* CPK-style colours, used identically in 2D and 3D so an oxygen is the same
   * red wherever you meet it. */
  const CPK = {
    H: '#f2f2f4', C: '#4a4f58', N: '#2f5fd0', O: '#d93b32', F: '#5ec96a',
    Cl: '#3fae52', Br: '#9c4a26', I: '#7b3fa0', S: '#d6b220', P: '#e8871e',
    B: '#e59a9a', Si: '#c9a26a', Se: '#e88a2a', Li: '#7a4fd0', Na: '#6b4fd6',
    K: '#6b4fd6', Rb: '#6b4fd6', Cs: '#6b4fd6', Be: '#3f9c5a', Mg: '#3f9c5a',
    Ca: '#3f9c5a', Sr: '#3f9c5a', Ba: '#3f9c5a', Fe: '#c2601c', Cu: '#b06a2c',
    Zn: '#6a7a93', Mn: '#8a5fb0', Cr: '#5f7fb0', Ni: '#4f9c6a', Co: '#4a6fb0',
    Ag: '#98a0ab', Au: '#c8a02a', Hg: '#8a8f9c', Pb: '#5a6470', Al: '#9aa7b5',
    Ti: '#8a9099', Sn: '#6e7a86', As: '#b06fb0', Te: '#b07a2a', He: '#7fd6cf',
    Ne: '#7fd6cf', Ar: '#7fd6cf', Kr: '#7fd6cf', Xe: '#7fd6cf',
  };
  const CPK_DEFAULT = '#8f96a3';
  function colorOf(sym) { return CPK[sym] || CPK_DEFAULT; }

  /* Hydrogen's CPK colour is white, which works for a shaded 3D sphere and is
   * all but invisible as flat text on a light page. Written-out atom labels use
   * the ordinary text colour for it instead. */
  function labelColorOf(sym) { return sym === 'H' ? 'var(--text)' : colorOf(sym); }

  /* Covalent-ish radii (Angstrom-scaled, only used for relative 3D sphere and
   * 2D label sizing). */
  const RADIUS = { H: 0.31, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Cl: 1.02, Br: 1.20, I: 1.39, S: 1.05, P: 1.07 };
  function radiusOf(sym) { return RADIUS[sym] || 1.0; }

  /* How many bonds each element normally wants, and the exceptions that are
   * genuinely fine. `hands` is the everyday number used in the lessons. */
  const VALENCE = {
    H: { hands: 1, allowed: [1], charged: { '-1': [0], '1': [0] } },
    B: { hands: 3, allowed: [3], charged: { '-1': [4] } },
    C: { hands: 4, allowed: [4], charged: { '-1': [3], '1': [3] } },
    N: { hands: 3, allowed: [3], charged: { '1': [4], '-1': [2] } },
    O: { hands: 2, allowed: [2], charged: { '1': [3], '-1': [1] } },
    F: { hands: 1, allowed: [1], charged: { '-1': [0] } },
    Si: { hands: 4, allowed: [4, 5, 6] },
    P: { hands: 3, allowed: [3, 5, 6], charged: { '1': [4] } },
    S: { hands: 2, allowed: [2, 4, 6], charged: { '1': [3], '-1': [1] } },
    Cl: { hands: 1, allowed: [1, 3, 5, 7], charged: { '-1': [0] } },
    Se: { hands: 2, allowed: [2, 4, 6] },
    Br: { hands: 1, allowed: [1, 3, 5, 7], charged: { '-1': [0] } },
    Te: { hands: 2, allowed: [2, 4, 6] },
    I: { hands: 1, allowed: [1, 3, 5, 7], charged: { '-1': [0] } },
    He: { hands: 0, allowed: [0] }, Ne: { hands: 0, allowed: [0] },
    Ar: { hands: 0, allowed: [0] }, Kr: { hands: 0, allowed: [0, 2] },
    Xe: { hands: 0, allowed: [0, 2, 4, 6, 8] },
  };

  /* Elements we deliberately do not police: metals bond in ways the simple
   * "hands" picture was never meant to cover. */
  const METALS = new Set(('Li Be Na Mg Al K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn ' +
    'Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po Fr Ra Ac Th Pa U Np Pu ' +
    'Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og Ge Sb At').split(' '));

  /* Valence electrons in the outer shell, for lone-pair dots. */
  const OUTER = { H: 1, He: 2, Li: 1, Be: 2, B: 3, C: 4, N: 5, O: 6, F: 7, Ne: 8,
    Na: 1, Mg: 2, Al: 3, Si: 4, P: 5, S: 6, Cl: 7, Ar: 8, K: 1, Ca: 2,
    Ga: 3, Ge: 4, As: 5, Se: 6, Br: 7, Kr: 8, In: 3, Sn: 4, Sb: 5, Te: 6, I: 7, Xe: 8 };

  /* One record per element, straight from PubChem's periodic table and baked
   * in at build time. See scripts/build-db.js. */
  let ELEMENTS = [];
  const BY_Z = {};
  const BY_SYM = {};
  function setElements(list) {
    ELEMENTS = list || [];
    ELEMENTS.forEach((e) => { BY_Z[e.z] = e; BY_SYM[e.sym] = e; });
  }
  function element(idOrSym) {
    return typeof idOrSym === 'number' ? (BY_Z[idOrSym] || null) : (BY_SYM[idOrSym] || null);
  }
  function symbolFor(z) {
    const e = BY_Z[z];
    return e ? e.sym : (Mol.cAtomLabel && Mol.cAtomLabel[z]) || '?';
  }
  function atomicNumber(sym) {
    const e = BY_SYM[sym];
    return e ? e.z : 0;
  }

  /* Where an element sits in the conventional 18-column layout. The f-block
   * goes on its own two rows below the table, as it is normally printed. */
  function ptPosition(z) {
    if (z === 1) return [1, 1];
    if (z === 2) return [1, 18];
    if (z <= 10) return [2, z <= 4 ? z - 2 : z + 8];
    if (z <= 18) return [3, z <= 12 ? z - 10 : z];
    if (z <= 36) return [4, z - 18];
    if (z <= 54) return [5, z - 36];
    if (z <= 56) return [6, z - 54];
    if (z <= 71) return [9, z - 57 + 3];      /* lanthanides */
    if (z <= 86) return [6, z - 72 + 4];
    if (z <= 88) return [7, z - 86];
    if (z <= 103) return [10, z - 89 + 3];    /* actinides */
    return [7, z - 104 + 4];
  }

  /* A short key for PubChem's GroupBlock, used for the colour coding. */
  function blockKey(block) {
    return String(block || 'other').toLowerCase().replace(/[^a-z]+/g, '-');
  }

  /* ------------------------------------------------------------- parsing */
  /* OpenChemLib reads PubChem's compact "[HH]" for molecular hydrogen as one
   * atom. Writing it out the long way fixes it without changing the meaning. */
  function normaliseSmiles(s) {
    return String(s).trim().replace(/\[HH\]/g, '[H][H]');
  }

  function fromSmiles(smiles) {
    const m = Mol.fromSmiles(normaliseSmiles(smiles));
    m.ensureHelperArrays(Mol.cHelperRings);
    return m;
  }
  function fromMolfile(mf) {
    const m = Mol.fromMolfile(mf);
    m.ensureHelperArrays(Mol.cHelperRings);
    return m;
  }
  function tryParse(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    try {
      const m = t.includes('V2000') || t.includes('V3000') ? fromMolfile(t) : fromSmiles(t);
      return m.getAllAtoms() > 0 ? m : null;
    } catch (e) { return null; }
  }

  /* Coordinates: OpenChemLib lays molecules out with a bond length of 1. */
  function ensureCoordinates(mol) {
    let allZero = true;
    for (let a = 0; a < mol.getAllAtoms(); a++) {
      if (mol.getAtomX(a) !== 0 || mol.getAtomY(a) !== 0) { allZero = false; break; }
    }
    if (allZero && mol.getAllAtoms() > 1) mol.inventCoordinates();
    return mol;
  }

  /* A canonical fingerprint that ignores 3D arrangement, for "you drew X!". */
  function canonicalID(mol) {
    try { return OCL.CanonizerUtil.getIDCode(mol, OCL.CanonizerUtil.NOSTEREO); }
    catch (e) { try { return mol.getIDCode(); } catch (e2) { return null; } }
  }

  /* ------------------------------------------------------------- analysis */
  function analyse(mol) {
    const mf = mol.getMolecularFormula();
    return {
      formula: mf.formula,
      mass: mf.relativeWeight,
      exactMass: mf.absoluteWeight,
      atoms: mol.getAllAtoms(),
      smiles: safeSmiles(mol),
    };
  }
  function safeSmiles(mol) {
    try { return mol.toSmiles(); } catch (e) { return null; }
  }

  function isOrganic(mol) {
    /* The everyday definition taught in schools: carbon with hydrogen or
     * carbon-carbon bonding. Carbonates, cyanides, CO and CO2 contain carbon
     * but are counted as inorganic by long-standing convention. */
    let carbons = 0, satisfying = 0;
    for (let a = 0; a < mol.getAllAtoms(); a++) {
      if (mol.getAtomicNo(a) !== 6) continue;
      carbons++;
      if (mol.getImplicitHydrogens(a) > 0) { satisfying++; continue; }
      for (let n = 0; n < mol.getAllConnAtoms(a); n++) {
        const z = mol.getAtomicNo(mol.getConnAtom(a, n));
        if (z === 6 || z === 1) { satisfying++; break; }
      }
    }
    return carbons > 0 && satisfying > 0;
  }

  /* Does a skeletal drawing make any sense for this? It is a shortcut for
   * carbon chains, so something with no carbon-carbon backbone gains nothing. */
  function skeletalMakesSense(mol) {
    let ccBonds = 0;
    for (let b = 0; b < mol.getAllBonds(); b++) {
      if (mol.getAtomicNo(mol.getBondAtom(0, b)) === 6 && mol.getAtomicNo(mol.getBondAtom(1, b)) === 6) ccBonds++;
    }
    return ccBonds > 0;
  }

  /* ----------------------------------------------------- lone pair counting */
  function lonePairs(mol, a) {
    const sym = symbolFor(mol.getAtomicNo(a));
    const outer = OUTER[sym];
    if (outer == null || METALS.has(sym)) return 0;
    let bonds = 0;
    for (let n = 0; n < mol.getAllConnAtoms(a); n++) bonds += mol.getConnBondOrder(a, n);
    bonds += mol.getImplicitHydrogens(a);
    const charge = mol.getAtomCharge(a);
    const nonBonding = outer - bonds - charge;
    return nonBonding > 0 ? Math.floor(nonBonding / 2) : 0;
  }

  /* ------------------------------------------------------ functional groups */
  /* Ordered: the first pattern to claim an atom wins, so a carboxylic acid is
   * not also reported as "an alcohol and a ketone". */
  const GROUPS = [
    { k: 'carboxylic', name: 'Carboxylic acid', smarts: '[CX3](=[OX1])[OX2H1]', color: '#e0523f',
      note: 'A C=O and an O–H on the same carbon. This is what makes vinegar and lemon juice sour.' },
    { k: 'carboxylate', name: 'Carboxylate', smarts: '[CX3](=[OX1])[OX1-]', color: '#e0523f',
      note: 'A carboxylic acid that has given its hydrogen away, leaving a negative charge.' },
    { k: 'ester', name: 'Ester', smarts: '[CX3](=[OX1])[OX2H0][#6]', color: '#e08b2f',
      note: 'An acid with the O–H swapped for a carbon. Most fruity smells are esters.' },
    { k: 'amide', name: 'Amide', smarts: '[CX3](=[OX1])[NX3]', color: '#8a5fd6',
      note: 'A C=O next to a nitrogen. This is the link that joins amino acids into proteins.' },
    { k: 'anhydride', name: 'Anhydride', smarts: '[CX3](=[OX1])[OX2][CX3]=[OX1]', color: '#d2691e',
      note: 'Two acid groups sharing one oxygen. Very reactive.' },
    { k: 'aldehyde', name: 'Aldehyde', smarts: '[CX3H1](=[OX1])', color: '#3fa06e',
      note: 'A C=O sitting at the end of a chain, so it also carries a hydrogen. Cinnamon and almond smells are aldehydes.' },
    { k: 'ketone', name: 'Ketone', smarts: '[#6][CX3](=[OX1])[#6]', color: '#2f8fd6',
      note: 'A C=O with a carbon on both sides. Acetone, in nail polish remover, is the simplest one.' },
    { k: 'nitro', name: 'Nitro group', smarts: '[NX3](=[OX1])[OX1-,OX2H0]', color: '#c0392b',
      note: 'A nitrogen carrying two oxygens. Packs a lot of energy, which is why explosives are full of them.' },
    { k: 'nitrile', name: 'Nitrile', smarts: '[NX1]#[CX2]', color: '#16a085',
      note: 'A carbon and nitrogen sharing a triple bond.' },
    { k: 'sulfonic', name: 'Sulfonic acid', smarts: '[SX4](=[OX1])(=[OX1])[OX2H,OX1-]', color: '#c9a227',
      note: 'A sulfur with three oxygens and an O–H. Detergents are built around this.' },
    { k: 'phosphate', name: 'Phosphate', smarts: '[PX4](=[OX1])([OX2,OX1-])([OX2,OX1-])[OX2,OX1-]', color: '#e8871e',
      note: 'A phosphorus surrounded by oxygens. DNA’s backbone and your cells’ energy currency both use it.' },
    { k: 'thiol', name: 'Thiol', smarts: '[SX2H]', color: '#d6b220',
      note: 'Sulfur with a hydrogen. Responsible for some of the worst smells in chemistry.' },
    { k: 'sulfide', name: 'Sulfide', smarts: '[#6][SX2][#6]', color: '#bfa22a',
      note: 'A sulfur bridging two carbons. Garlic and onions are full of these.' },
    { k: 'phenol', name: 'Phenol', smarts: '[c][OX2H]', color: '#d64f9e',
      note: 'An O–H attached straight onto an aromatic ring. Sits between an alcohol and an acid in behaviour.' },
    { k: 'alcohol', name: 'Alcohol', smarts: '[CX4][OX2H]', color: '#d64f9e',
      note: 'An O–H on a carbon. The –ol ending in ethanol and menthol comes from this.' },
    { k: 'amine', name: 'Amine', smarts: '[NX3;H2,H1,H0;!$(N[CX3]=[OX1]);!$(N=*);!$([N+])][#6]', color: '#4a6fd6',
      note: 'A nitrogen with carbons on it. Amines are basic, which is why many drugs are sold as their salts.' },
    { k: 'ammonium', name: 'Ammonium', smarts: '[NX4+]', color: '#4a6fd6',
      note: 'A nitrogen that has taken an extra bond and gone positive.' },
    { k: 'ether', name: 'Ether', smarts: '[OD2]([#6])[#6]', color: '#7f8fa6',
      note: 'An oxygen bridging two carbons. Chemically quiet, which is why ethers make good solvents.' },
    { k: 'halide', name: 'Halogen', smarts: '[#6][F,Cl,Br,I]', color: '#3fae52',
      note: 'A halogen attached to a carbon. Each one wants exactly one bond.' },
    { k: 'alkyne', name: 'Triple bond (alkyne)', smarts: '[CX2]#[CX2]', color: '#8e44ad',
      note: 'Three shared pairs between two carbons. Forces those atoms into a straight line.' },
    { k: 'aromatic', name: 'Aromatic ring', smarts: 'c1ccccc1', color: '#6b5fd6',
      note: 'A flat ring with its electrons spread evenly around it. Unusually stable, and very common.' },
    { k: 'alkene', name: 'Double bond (alkene)', smarts: '[CX3]=[CX3]', color: '#2f8f5f',
      note: 'Two shared pairs between two carbons. It cannot twist, which locks the shape in place.' },
  ];

  let smartsCache = null;
  function getSmartsParser() {
    if (!smartsCache) smartsCache = new OCL.SmilesParser({ smartsMode: 'smarts', noStereo: true });
    return smartsCache;
  }

  const queryCache = {};
  function queryFor(smarts) {
    if (queryCache[smarts] !== undefined) return queryCache[smarts];
    let q = null;
    try {
      q = getSmartsParser().parseMolecule(smarts);
      q.setFragment(true);
      q.ensureHelperArrays(Mol.cHelperRings);
    } catch (e) { q = null; }
    queryCache[smarts] = q;
    return q;
  }

  function findGroups(mol) {
    const claimed = new Set();
    const found = [];
    let searcher;
    try { searcher = new OCL.SSSearcher(); } catch (e) { return found; }

    for (const g of GROUPS) {
      const q = queryFor(g.smarts);
      if (!q) continue;
      let matches = [];
      try {
        searcher.setMol(q, mol);
        if (searcher.findFragmentInMolecule() > 0) matches = searcher.getMatchList() || [];
      } catch (e) { continue; }
      if (!matches.length) continue;

      const hits = [];
      /* Count one group per anchor atom, not per match. A cyclic diamide like
       * caffeine matches the amide pattern four times across two C=O groups,
       * and reporting "amide x4" would be nonsense to a reader. */
      const anchors = new Set();
      for (const m of matches) {
        const atoms = m.filter((a) => a >= 0);
        /* Skip a match whose every atom another group already accounted for. */
        if (atoms.length && atoms.every((a) => claimed.has(a))) continue;
        atoms.forEach((a) => claimed.add(a));
        hits.push(atoms);
        if (atoms.length) anchors.add(atoms[0]);
      }
      if (hits.length) {
        found.push({
          key: g.k, name: g.name, note: g.note, color: g.color,
          count: anchors.size || hits.length, atoms: hits.flat(),
        });
      }
    }
    return found;
  }

  /* -------------------------------------------------------- condensed form */
  /* Condensed formulas are a shorthand for chains. They stop being readable
   * once a molecule has rings or many branches, so this refuses those cases
   * rather than producing something misleading. */
  function condensed(mol) {
    const n = mol.getAllAtoms();
    if (n === 0) return { text: null, why: 'There is nothing here yet.' };
    for (let b = 0; b < mol.getAllBonds(); b++) {
      if (mol.isRingBond(b)) {
        return { text: null, why: 'Condensed formulas write a molecule out as a line of groups, so they cannot show a ring. The skeletal drawing does that job instead.' };
      }
    }
    if (n > 24) return { text: null, why: 'This molecule is too big for a condensed formula to stay readable. The skeletal drawing is the better shorthand here.' };
    for (let a = 0; a < n; a++) {
      if (mol.getAtomCharge(a) !== 0) {
        return { text: null, why: 'This molecule carries a charge, which condensed formulas have no tidy way of showing.' };
      }
    }
    /* Find the longest path through the heavy-atom graph and walk it. */
    const adj = [];
    for (let a = 0; a < n; a++) {
      adj[a] = [];
      for (let k = 0; k < mol.getAllConnAtoms(a); k++) {
        adj[a].push({ to: mol.getConnAtom(a, k), order: mol.getConnBondOrder(a, k) });
      }
    }
    const path = longestPath(adj, n);
    if (!path) return { text: null, why: 'This one branches too much for a condensed formula to help.' };

    const onPath = new Set(path);
    let out = '';
    for (let i = 0; i < path.length; i++) {
      const a = path[i];
      out += atomChunk(mol, a);
      /* branches hanging off this backbone atom */
      const branches = adj[a].filter((e) => !onPath.has(e.to));
      for (const br of branches) {
        const sub = describeBranch(mol, br.to, a, adj, onPath);
        if (sub === null) return { text: null, why: 'This one branches too much for a condensed formula to help.' };
        out += '(' + (br.order === 2 ? '=' : br.order === 3 ? '#' : '') + sub + ')';
      }
      if (i < path.length - 1) {
        const e = adj[a].find((x) => x.to === path[i + 1]);
        if (e && e.order === 2) out += '=';
        else if (e && e.order === 3) out += '≡';
      }
    }
    return { text: out, why: null };
  }

  function atomChunk(mol, a) {
    const sym = symbolFor(mol.getAtomicNo(a));
    const h = mol.getImplicitHydrogens(a) + countExplicitH(mol, a);
    return sym + (h === 0 ? '' : h === 1 ? 'H' : 'H' + h);
  }
  function countExplicitH(mol, a) {
    let c = 0;
    for (let k = 0; k < mol.getAllConnAtoms(a); k++) if (mol.getAtomicNo(mol.getConnAtom(a, k)) === 1) c++;
    return c;
  }
  function describeBranch(mol, start, from, adj, onPath) {
    /* Only short, simple branches are written inline. */
    const seen = new Set([from]);
    let out = '';
    let cur = start, prev = from, steps = 0;
    while (cur != null && steps < 6) {
      if (seen.has(cur)) return null;
      seen.add(cur);
      if (mol.getAtomicNo(cur) === 1) return 'H';
      out += atomChunk(mol, cur);
      const next = adj[cur].filter((e) => e.to !== prev && !onPath.has(e.to));
      if (next.length === 0) return out;
      if (next.length > 1) return null;
      if (next[0].order > 1) out += next[0].order === 2 ? '=' : '≡';
      prev = cur; cur = next[0].to; steps++;
    }
    return null;
  }

  function longestPath(adj, n) {
    /* Small molecules only, so an exhaustive DFS from every atom is fine. */
    let best = null;
    const limit = 40000;
    let visits = 0;
    for (let s = 0; s < n; s++) {
      const stack = [[s, [s], new Set([s])]];
      while (stack.length) {
        if (++visits > limit) return best;
        const [a, path, seen] = stack.pop();
        if (!best || path.length > best.length) best = path;
        for (const e of adj[a]) {
          if (seen.has(e.to)) continue;
          const ns = new Set(seen); ns.add(e.to);
          stack.push([e.to, path.concat(e.to), ns]);
        }
      }
    }
    return best;
  }

  /* ----------------------------------------------------------- validation */
  /* Works on a neutral description so both a parsed molecule and the drawing
   * editor's own graph can be checked with identical rules:
   *   atoms: [{ sym, charge, explicitH }]
   *   bonds: [{ a, b, order }]
   */
  function validateGraph(atoms, bonds) {
    const problems = [];
    const degree = atoms.map(() => 0);
    const bondCount = atoms.map(() => 0);

    bonds.forEach((bd) => {
      degree[bd.a] += bd.order;
      degree[bd.b] += bd.order;
      bondCount[bd.a]++; bondCount[bd.b]++;
    });

    atoms.forEach((at, i) => {
      const sym = at.sym;
      const charge = at.charge || 0;
      const used = degree[i] + (at.explicitH || 0);
      if (METALS.has(sym)) return;                 /* metals play by other rules */
      const rule = VALENCE[sym];
      if (!rule) return;

      let allowed = rule.allowed.slice();
      if (charge !== 0) {
        const alt = rule.charged && rule.charged[String(charge)];
        if (alt) allowed = alt.slice();
        else allowed = allowed.map((v) => v + (isRightOfCarbon(sym) ? charge : -charge)).filter((v) => v >= 0);
      }
      const max = Math.max.apply(null, allowed);
      if (used <= max && allowed.indexOf(used) === -1 && used < max) {
        /* Under-filled is normal: the gap is simply hidden hydrogens. */
        return;
      }
      if (used > max) {
        problems.push({
          atom: i,
          level: 'error',
          title: `${elementName(sym)} with ${used} bond${used === 1 ? '' : 's'}`,
          text: explainTooMany(sym, used, max, charge),
        });
      }
    });

    return problems;
  }

  function isRightOfCarbon(sym) {
    return ['N', 'O', 'F', 'P', 'S', 'Cl', 'Se', 'Br', 'Te', 'I'].indexOf(sym) >= 0;
  }

  function explainTooMany(sym, used, max, charge) {
    const name = elementName(sym);
    if (sym === 'C') {
      return `This carbon has ${used} bonds. Carbon has four electrons to share, so it can make four bonds and no more — four hands, four things to hold. Try removing one bond, or turning a double bond back into a single one.`;
    }
    if (sym === 'H') {
      return 'Hydrogen has a single electron to share, so it can only ever hold on to one thing. It is always at the edge of a molecule, never in the middle.';
    }
    if (sym === 'N') {
      return `This nitrogen has ${used} bonds, and nitrogen normally makes three. It can stretch to four, but only by going positive — that is what an ammonium group is. If you meant that, give it a + charge and the warning will clear.`;
    }
    if (sym === 'O') {
      return `This oxygen has ${used} bonds, and oxygen normally makes two. Three is possible with a + charge, but that is unusual outside a reaction in progress.`;
    }
    if (['F', 'Cl', 'Br', 'I'].indexOf(sym) >= 0) {
      return `${name} normally makes just one bond — it needs a single electron to complete its outer shell, then it is done. More than one is only possible with oxygen attached, as in perchlorate.`;
    }
    if (charge !== 0) {
      return `With a charge of ${charge > 0 ? '+' + charge : charge}, ${name.toLowerCase()} can manage at most ${max} bonds, and this one has ${used}.`;
    }
    return `${name} can manage at most ${max} bonds here, and this one has ${used}.`;
  }

  /* Names come from the verified element data rather than a second, hand-typed
   * copy of the periodic table. */
  function elementName(sym) {
    const e = BY_SYM[sym];
    return e ? e.name : sym;
  }

  /* Validate a parsed OpenChemLib molecule by projecting it onto the same
   * neutral description the editor uses. */
  function validateMolecule(mol) {
    const atoms = [];
    for (let a = 0; a < mol.getAllAtoms(); a++) {
      atoms.push({ sym: symbolFor(mol.getAtomicNo(a)), charge: mol.getAtomCharge(a), explicitH: mol.getImplicitHydrogens(a) });
    }
    const bonds = [];
    for (let b = 0; b < mol.getAllBonds(); b++) {
      bonds.push({ a: mol.getBondAtom(0, b), b: mol.getBondAtom(1, b), order: mol.getBondOrder(b) });
    }
    return validateGraph(atoms, bonds);
  }

  function hasCarbon(mol) {
    for (let a = 0; a < mol.getAllAtoms(); a++) if (mol.getAtomicNo(a) === 6) return true;
    return false;
  }

  /* Can a 3D conformer be worked out here? Disconnected pieces (a salt is two
   * separate ions) have no fixed arrangement relative to one another, so a
   * generated one would be a fiction. */
  function fragmentCount(mol) {
    const n = mol.getAllAtoms();
    if (n === 0) return 0;
    const seen = new Array(n).fill(false);
    let parts = 0;
    for (let start = 0; start < n; start++) {
      if (seen[start]) continue;
      parts++;
      const stack = [start];
      seen[start] = true;
      while (stack.length) {
        const a = stack.pop();
        for (let k = 0; k < mol.getAllConnAtoms(a); k++) {
          const nb = mol.getConnAtom(a, k);
          if (!seen[nb]) { seen[nb] = true; stack.push(nb); }
        }
      }
    }
    return parts;
  }

  ME.chem = {
    OCL, Mol, CPK, colorOf, labelColorOf, radiusOf, VALENCE, METALS, OUTER, GROUPS,
    setElements, get elements() { return ELEMENTS; }, element, ptPosition, blockKey,
    symbolFor, atomicNumber, elementName,
    fromSmiles, fromMolfile, tryParse, normaliseSmiles, ensureCoordinates, canonicalID,
    analyse, safeSmiles, isOrganic, skeletalMakesSense, lonePairs,
    findGroups, condensed, validateGraph, validateMolecule, hasCarbon, fragmentCount,
  };
})();
