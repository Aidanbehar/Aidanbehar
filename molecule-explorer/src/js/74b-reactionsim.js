/* The reaction player. This one is for fun.
 *
 * Nothing here is hand-choreographed, because hand-choreographing twenty
 * reactions means twenty chances to draw a molecule that does not exist. The
 * whole animation is derived:
 *
 *   the equation  →  ME.balance, for the coefficients
 *   each species  →  OpenChemLib, for a real structure and real coordinates
 *   the energy    →  ME.thermo, from the formation enthalpies
 *
 * So the atoms on screen are the atoms the formula says, in the numbers the
 * balanced equation says, and the flash at the end is the size the enthalpy
 * says. A test checks the first of those directly: every species' drawn atoms
 * must match its formula, element for element.
 *
 * What the animation honestly shows is that atoms are conserved and
 * rearranged — which is the whole idea of a chemical reaction, and the thing
 * worth watching. What it does NOT show is mechanism. Real reactions go
 * through collisions, intermediates and often many steps, and the path each
 * atom takes between its old molecule and its new one is drawn here, not
 * computed. The app says so on screen rather than letting a pretty animation
 * imply more than it knows.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const el = ME.el;

  /* Structures, as SMILES. Short enough to read, and every one is checked
   * against the formula in the equation by OpenChemLib at test time, so a
   * typo here fails the build rather than drawing a quiet fiction. */
  const SMILES = {
    H2: '[H][H]', O2: 'O=O', N2: 'N#N', Cl2: 'ClCl', F2: 'FF', Br2: 'BrBr', I2: 'II',
    H2O: 'O', CO2: 'O=C=O', CO: '[C-]#[O+]', NH3: 'N', CH4: 'C', NO: '[N]=O', NO2: 'O=[N+][O-]',
    SO2: 'O=S=O', SO3: 'O=S(=O)=O', H2S: 'S', HCl: 'Cl', HBr: 'Br', HF: 'F', HI: 'I',
    H2O2: 'OO', O3: '[O-][O+]=O', N2O: '[N-]=[N+]=O',
    P4: 'P12P3P1P23',
    /* Lone atoms are not listed. OpenChemLib applies valence rules to a bare
     * atom and hands [Al] three hydrogens, so a single atom is built directly
     * instead — there is nothing to lay out, and nothing to get wrong. */
    NaCl: '[Na+].[Cl-]', KCl: '[K+].[Cl-]', NaBr: '[Na+].[Br-]', KI: '[K+].[I-]',
    MgO: '[Mg+2].[O-2]', CaO: '[Ca+2].[O-2]', ZnO: '[Zn+2].[O-2]',
    Fe2O3: '[Fe+3].[Fe+3].[O-2].[O-2].[O-2]', Al2O3: '[Al+3].[Al+3].[O-2].[O-2].[O-2]',
    CuO: '[Cu+2].[O-2]', ZnCl2: '[Zn+2].[Cl-].[Cl-]',
    FeS: '[Fe+2].[S-2]', ZnS: '[Zn+2].[S-2]', PbI2: '[Pb+2].[I-].[I-]',
    NaOH: '[Na+].[OH-]', KOH: '[K+].[OH-]', 'Ca(OH)2': '[Ca+2].[OH-].[OH-]',
    'Mg(OH)2': '[Mg+2].[OH-].[OH-]',
    HNO3: 'O[N+](=O)[O-]', H2SO4: 'OS(=O)(=O)O', H3PO4: 'OP(=O)(O)O', H2CO3: 'OC(=O)O',
    NaHCO3: '[Na+].OC([O-])=O', Na2CO3: '[Na+].[Na+].[O-]C([O-])=O',
    CaCO3: '[Ca+2].[O-]C([O-])=O', NaNO3: '[Na+].[O-][N+](=O)[O-]',
    AgNO3: '[Ag+].[O-][N+](=O)[O-]', AgCl: '[Ag+].[Cl-]',
    'Cu(NO3)2': '[Cu+2].[O-][N+](=O)[O-].[O-][N+](=O)[O-]',
    ZnSO4: '[Zn+2].[O-]S(=O)(=O)[O-]', CuSO4: '[Cu+2].[O-]S(=O)(=O)[O-]',
    Na2SO4: '[Na+].[Na+].[O-]S(=O)(=O)[O-]', MgCl2: '[Mg+2].[Cl-].[Cl-]',
    CaCl2: '[Ca+2].[Cl-].[Cl-]', FeCl3: '[Fe+3].[Cl-].[Cl-].[Cl-]',
    NH4Cl: '[NH4+].[Cl-]',
    CH3COOH: 'CC(=O)O', CH3COONa: '[Na+].CC(=O)[O-]',
    C2H5OH: 'CCO', C2H6: 'CC', C2H4: 'C=C', C2H2: 'C#C',
    C3H8: 'CCC', C4H10: 'CCCC', C8H18: 'CCCCCCCC',
    C6H12O6: 'OCC1OC(O)C(O)C(O)C1O', C6H6: 'c1ccccc1', CH3OH: 'CO',
  };

  /* The list. Grouped the way a person would browse it rather than the way a
   * syllabus would file it. */
  const REACTIONS = [
    { group: 'Things that burn', id: 'methane', name: 'Natural gas burning',
      eq: 'CH4 + O2 -> CO2 + H2O',
      note: 'The blue flame on a hob. Every hydrogen ends up in water and every carbon in carbon dioxide — watch them split up and find their new partners.' },
    { group: 'Things that burn', id: 'hydrogen', name: 'Hydrogen going up',
      eq: 'H2 + O2 -> H2O',
      note: 'Two of the simplest molecules there are, and the only product is water. This is the one that powers rockets.' },
    { group: 'Things that burn', id: 'magnesium', name: 'Magnesium ribbon',
      eq: 'Mg + O2 -> MgO',
      note: 'The white glare in every school lab. A metal and a gas, and what drops out is a powder.' },
    { group: 'Things that burn', id: 'propane', name: 'Camping gas',
      eq: 'C3H8 + O2 -> CO2 + H2O',
      note: 'Bigger than methane, so there is more to take apart — five oxygen molecules get used up for every propane.' },
    { group: 'Things that burn', id: 'ethyne', name: 'A welding torch',
      eq: 'C2H2 + O2 -> CO2 + H2O',
      note: 'That triple bond holds a lot of energy, which is why this flame cuts steel.' },
    { group: 'Things that burn', id: 'sulfur', name: 'Sulfur burning blue',
      eq: 'S + O2 -> SO2',
      note: 'One atom meets one molecule. About as simple as a reaction gets, and the gas it makes is what makes acid rain.' },

    { group: 'Bang, flash, fizz', id: 'thermite', name: 'Thermite',
      eq: 'Fe2O3 + Al -> Al2O3 + Fe',
      note: 'Aluminium wants oxygen more than iron does, so it simply takes it. The iron that falls out arrives molten.' },
    { group: 'Bang, flash, fizz', id: 'sodium-water', name: 'Sodium meets water',
      eq: 'Na(s) + H2O(l) -> NaOH(aq) + H2(g)',
      note: 'The lump that skitters across the water and then goes off. The hydrogen it frees is what catches fire.' },
    { group: 'Bang, flash, fizz', id: 'vinegar-soda', name: 'Vinegar and baking soda',
      eq: 'CH3COOH + NaHCO3 -> CH3COONa + H2O + CO2',
      note: 'The volcano. All that foam is the carbon dioxide leaving — count the atoms and you can see exactly where it came from.' },
    { group: 'Bang, flash, fizz', id: 'peroxide', name: 'Elephant toothpaste',
      eq: 'H2O2 -> H2O + O2',
      note: 'One substance, two products, no help needed — just a catalyst to hurry it along. Hydrogen peroxide is water with one oxygen too many and it would rather not keep it.' },
    { group: 'Bang, flash, fizz', id: 'zinc-acid', name: 'Zinc in acid',
      eq: 'Zn(s) + HCl(aq) -> ZnCl2(aq) + H2(g)',
      note: 'The classic test-tube fizz. The metal pushes hydrogen out of the acid and takes its place.' },

    { group: 'In a beaker', id: 'neutralise', name: 'Acid meets alkali',
      eq: 'HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)',
      note: 'Two dangerous things making salt water. Watch what actually happens: one H and one OH leave to become water, and the sodium and chloride barely move.' },
    { group: 'In a beaker', id: 'silver', name: 'A precipitate appearing',
      eq: 'AgNO3(aq) + NaCl(aq) -> AgCl(s) + NaNO3(aq)',
      note: 'Two clear solutions, one white cloud. The silver and the chloride find each other and refuse to stay dissolved.' },
    { group: 'In a beaker', id: 'copper-silver', name: 'Copper stealing silver',
      eq: 'Cu + AgNO3 -> Cu(NO3)2 + Ag',
      note: 'A copper wire in silver nitrate grows silver whiskers, and the solution turns blue. Copper is the more reactive metal, so it takes the place.' },
    { group: 'In a beaker', id: 'limestone', name: 'Limestone and acid',
      eq: 'CaCO3(s) + HCl(aq) -> CaCl2(aq) + H2O(l) + CO2(g)',
      note: 'What happens to a statue in acid rain, and what makes a chalk sample fizz.' },

    { group: 'Industry', id: 'haber', name: 'The Haber process',
      eq: 'N2 + H2 -> NH3',
      note: 'Breaking the triple bond in nitrogen is the hard part — it is one of the strongest bonds there is. This reaction feeds about half the world.' },
    { group: 'Industry', id: 'quicklime', name: 'A lime kiln',
      eq: 'CaCO3 -> CaO + CO2',
      note: 'Heat limestone hard enough and it gives up its carbon dioxide. This one absorbs energy rather than releasing it.' },
    { group: 'Industry', id: 'smelting', name: 'Smelting iron',
      eq: 'Fe2O3 + CO -> Fe + CO2',
      note: 'How a blast furnace turns rock into metal: carbon monoxide takes the oxygen away.' },
    { group: 'Industry', id: 'contact', name: 'Making sulfuric acid',
      eq: 'SO2 + O2 -> SO3',
      note: 'The middle step of the contact process. One oxygen atom joins on, and the world gets its most-made chemical.' },

    { group: 'Alive', id: 'respiration', name: 'Respiration',
      eq: 'C6H12O6 + O2 -> CO2 + H2O',
      note: 'Sugar and the air you breathed in, turning into the air you breathe out. Your body does this constantly, in small careful steps rather than one flash.' },
    { group: 'Alive', id: 'photosynthesis', name: 'Photosynthesis',
      eq: 'CO2 + H2O -> C6H12O6 + O2',
      note: 'Respiration, backwards, which is why it needs sunlight pouring in rather than giving energy out.' },
    { group: 'Alive', id: 'fermentation', name: 'Fermentation',
      eq: 'C6H12O6 -> C2H5OH + CO2',
      note: 'Yeast taking sugar apart without any oxygen at all. Bread rises on the gas and beer keeps the rest.' },
  ];

  /* ------------------------------------------------------- building a shape */
  /* OpenChemLib lays out the heavy atoms and will not keep explicit hydrogens
   * through that layout, so the hydrogens are placed here: in whatever
   * direction around their atom is least crowded. */
  /* The angle between two things stuck on the same atom, from the only rule
   * that matters: electron pairs push each other as far apart as they can.
   * Four pairs give the tetrahedral angle, three give 120, two give 180 —
   * and a lone pair counts, which is the whole reason water is bent and not
   * a straight line. Four actual substituents are drawn as a cross instead,
   * because 109.5 four times does not fit in a flat circle and the cross is
   * what every textbook draws. */
  function idealAngle(steric, substituents) {
    if (substituents >= 4) return (Math.PI * 2) / substituents;
    if (steric >= 4) return 109.5 * Math.PI / 180;
    if (steric === 3) return 120 * Math.PI / 180;
    return Math.PI;
  }

  function placeHydrogens(heavy, bonds) {
    const atoms = heavy.map((a) => ({ sym: a.sym, x: a.x, y: a.y, charge: a.charge }));
    const out = bonds.slice();
    heavy.forEach((a, i) => {
      const taken = [];
      bonds.forEach((b) => {
        if (b.a === i) taken.push(Math.atan2(heavy[b.b].y - a.y, heavy[b.b].x - a.x));
        else if (b.b === i) taken.push(Math.atan2(heavy[b.a].y - a.y, heavy[b.a].x - a.x));
      });

      /* An atom with nothing else attached has a free choice of where its
       * hydrogens go, and spreading them evenly over the full circle is the
       * wrong choice: two hydrogens end up opposite each other and water
       * comes out straight. Fan them around one direction at the angle VSEPR
       * actually calls for. */
      if (!taken.length && a.hydrogens > 1) {
        const steric = a.hydrogens + (a.lonePairs || 0);
        const step = idealAngle(steric, a.hydrogens);
        for (let h = 0; h < a.hydrogens; h++) {
          const ang = Math.PI / 2 + (h - (a.hydrogens - 1) / 2) * step;
          atoms.push({ sym: 'H', x: a.x + Math.cos(ang) * 0.85, y: a.y + Math.sin(ang) * 0.85, charge: 0 });
          out.push({ a: i, b: atoms.length - 1, order: 1 });
        }
        return;
      }

      for (let h = 0; h < a.hydrogens; h++) {
        let best = 0, bestGap = -1;
        /* Thirty-six candidate directions is plenty: the eye cannot tell ten
         * degrees of difference in where a hydrogen sits, and it can very
         * much tell two hydrogens drawn on top of each other. */
        for (let d = 0; d < 36; d++) {
          const ang = (d / 36) * Math.PI * 2;
          let gap = Math.PI;
          taken.forEach((t) => {
            let diff = Math.abs(((ang - t + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            gap = Math.min(gap, diff);
          });
          if (gap > bestGap) { bestGap = gap; best = ang; }
        }
        taken.push(best);
        atoms.push({ sym: 'H', x: a.x + Math.cos(best) * 0.85, y: a.y + Math.sin(best) * 0.85, charge: 0 });
        out.push({ a: i, b: atoms.length - 1, order: 1 });
      }
    });
    return { atoms: atoms, bonds: out };
  }

  /* The table above is keyed the way a person writes a formula; the balancer
   * hands back Hill order, where acetic acid is C2H4O2. Indexing through the
   * formula parser means both spellings land on the same structure, and the
   * index is built on first use because this file is concatenated before
   * nothing in particular and that has bitten this project twice. */
  let SMILES_BY_HILL = null;
  function smilesFor(formula) {
    if (!SMILES_BY_HILL) {
      SMILES_BY_HILL = {};
      Object.keys(SMILES).forEach((k) => {
        const parsed = ME.formula.parse(k);
        SMILES_BY_HILL[parsed.ok ? parsed.text : k] = SMILES[k];
      });
    }
    if (SMILES[formula]) return SMILES[formula];
    const parsed = ME.formula.parse(formula);
    return SMILES_BY_HILL[parsed.ok ? parsed.text : formula] || null;
  }

  const shapeCache = {};
  function shapeOf(formula) {
    if (shapeCache[formula]) return shapeCache[formula];
    const parsed = ME.formula.parse(formula);
    /* One atom of one element: a lump of magnesium, a speck of carbon. */
    if (parsed.ok && Object.keys(parsed.counts).length === 1) {
      const sym = Object.keys(parsed.counts)[0];
      if (parsed.counts[sym] === 1) {
        shapeCache[formula] = { atoms: [{ sym: sym, x: 0, y: 0, charge: 0 }], bonds: [] };
        return shapeCache[formula];
      }
    }
    const smiles = smilesFor(formula);
    if (!smiles) return null;
    let mol;
    try { mol = ME.chem.fromSmiles(smiles); } catch (e) { return null; }
    if (!mol) return null;
    mol.inventCoordinates();
    const d = ME.render2d.describe(mol, { lonePairs: true });
    const heavy = d.atoms.map((a) => ({ sym: a.sym, x: a.x, y: -a.y, charge: a.charge,
      hydrogens: a.hydrogens, lonePairs: a.lonePairs }));
    const bonds = d.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order }));
    /* A salt comes back as separate fragments sitting on top of each other,
     * because there are no bonds to push them apart. Spread them by hand so
     * the ions of sodium chloride are two things rather than one blob. */
    const shape = placeHydrogens(heavy, bonds);
    /* The tripwire. A SMILES that parses is not a SMILES that is right: OCL
     * will happily hand [Fe] three implicit hydrogens, which is how iron(III)
     * oxide first came out of here carrying six hydrogen atoms that the
     * formula says nothing about. Rather than draw that, refuse it. */
    if (!matchesFormula(shape, formula)) return null;
    spreadFragments(shape);
    centre(shape);
    shapeCache[formula] = shape;
    return shape;
  }

  function matchesFormula(shape, formula) {
    const want = ME.formula.parse(formula);
    if (!want.ok) return false;
    const got = {};
    shape.atoms.forEach((a) => { got[a.sym] = (got[a.sym] || 0) + 1; });
    const keys = Object.keys(want.counts);
    if (keys.length !== Object.keys(got).length) return false;
    return keys.every((k) => got[k] === want.counts[k]);
  }

  /* Every stored structure, checked against its own formula. The engine test
   * calls this; nothing in the app needs it, which is rather the point. */
  function checkStructures() {
    const formulas = {};
    Object.keys(SMILES).forEach((f) => { formulas[f] = true; });
    /* And every species the reaction list actually asks for, which is the
     * coverage that matters: a structure nothing uses can be wrong quietly,
     * a structure a reaction uses cannot. */
    REACTIONS.forEach((r) => {
      const bal = ME.balance.balance(r.eq);
      if (!bal.ok) { formulas['!' + r.id] = true; return; }
      bal.left.concat(bal.right).forEach((sp) => { formulas[sp.species.formula.text] = true; });
    });
    return Object.keys(formulas)
      .map((f) => (f.charAt(0) === '!' ? [f, 'equation does not balance'] : (shapeOf(f) ? null : [f, SMILES[f] || 'no structure'])))
      .filter(Boolean);
  }

  /* Connected components, laid out side by side if they started on top of
   * each other. */
  function spreadFragments(shape) {
    const n = shape.atoms.length;
    const group = new Array(n).fill(-1);
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (group[i] !== -1) continue;
      const stack = [i];
      group[i] = count;
      while (stack.length) {
        const at = stack.pop();
        shape.bonds.forEach((b) => {
          if (b.a === at && group[b.b] === -1) { group[b.b] = count; stack.push(b.b); }
          if (b.b === at && group[b.a] === -1) { group[b.a] = count; stack.push(b.a); }
        });
      }
      count++;
    }
    if (count < 2) return;
    const widths = [];
    for (let g = 0; g < count; g++) {
      const xs = shape.atoms.filter((a, i) => group[i] === g).map((a) => a.x);
      widths.push(Math.max.apply(null, xs) - Math.min.apply(null, xs) + 1.4);
    }
    let x = 0;
    const offset = [];
    for (let g = 0; g < count; g++) { offset.push(x + widths[g] / 2); x += widths[g]; }
    shape.atoms.forEach((a, i) => {
      const g = group[i];
      const xs = shape.atoms.filter((b, j) => group[j] === g).map((b) => b.x);
      const mid = (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2;
      a.x = a.x - mid + offset[g];
    });
  }

  function centre(shape) {
    let sx = 0, sy = 0;
    shape.atoms.forEach((a) => { sx += a.x; sy += a.y; });
    const cx = sx / shape.atoms.length, cy = sy / shape.atoms.length;
    shape.atoms.forEach((a) => { a.x -= cx; a.y -= cy; });
  }

  function radiusOf(shape) {
    let r = 0.6;
    shape.atoms.forEach((a) => { r = Math.max(r, Math.hypot(a.x, a.y) + 0.6); });
    return r;
  }

  /* ----------------------------------------------------------- the scene */
  /* One side of the equation, as a flat list of atoms with positions, plus
   * the bonds between them. Molecules are spread around a ring so that two
   * oxygens are visibly two oxygens. */
  function sideScene(species) {
    const copies = [];
    species.forEach((sp) => {
      /* Two different spellings, deliberately. The structure is looked up by
       * the parser's Hill text so that NaCl and ClNa find the same molecule;
       * the label on screen is what the reader wrote, because nobody calls
       * table salt ClNa. */
      const formula = sp.species.formula.text;
      const label = sp.species.formula.display || formula;
      for (let c = 0; c < sp.coefficient; c++) {
        const shape = shapeOf(formula);
        if (!shape) return;
        copies.push({ formula: formula, label: label, shape: shape });
      }
    });
    if (!copies.length) return null;

    /* A grid rather than a ring. A ring looks tidy with three molecules and
     * falls off the canvas with twelve, which is what respiration needs, and
     * it wastes the width on a stage that is twice as wide as it is tall. */
    const cell = Math.max.apply(null, copies.map((c) => radiusOf(c.shape))) * 2.25;
    const cols = Math.min(copies.length, Math.max(1, Math.round(Math.sqrt(copies.length * 2.1))));
    const rows = Math.ceil(copies.length / cols);

    const atoms = [], bonds = [];
    copies.forEach((c, i) => {
      const row = Math.floor(i / cols);
      /* The last row is centred under the others rather than left-aligned. */
      const inRow = Math.min(cols, copies.length - row * cols);
      const col = i - row * cols;
      const ox = (col - (inRow - 1) / 2) * cell;
      const oy = (row - (rows - 1) / 2) * cell;
      const base = atoms.length;
      c.shape.atoms.forEach((a) => atoms.push({
        sym: a.sym, x: a.x + ox, y: a.y + oy, charge: a.charge, mol: i, formula: c.label,
      }));
      c.shape.bonds.forEach((b) => bonds.push({ a: base + b.a, b: base + b.b, order: b.order }));
    });
    return { atoms: atoms, bonds: bonds, molecules: copies.length };
  }

  /* Which atom becomes which. The equation is balanced, so the two sides hold
   * the same multiset of elements and a complete pairing always exists. The
   * shortest-first pairing is not the real mechanism — no 2D tween is — but
   * it keeps each atom near where it started, which is what makes the
   * rearrangement readable rather than a swarm. */
  function mapAtoms(left, right) {
    const map = new Array(left.atoms.length).fill(-1);
    const bySym = {};
    left.atoms.forEach((a, i) => { (bySym[a.sym] = bySym[a.sym] || { l: [], r: [] }).l.push(i); });
    right.atoms.forEach((a, i) => { (bySym[a.sym] = bySym[a.sym] || { l: [], r: [] }).r.push(i); });
    Object.keys(bySym).forEach((sym) => {
      const { l, r } = bySym[sym];
      const pairs = [];
      l.forEach((i) => r.forEach((j) => pairs.push({
        i: i, j: j, d: Math.hypot(left.atoms[i].x - right.atoms[j].x, left.atoms[i].y - right.atoms[j].y),
      })));
      pairs.sort((p, q) => p.d - q.d);
      const usedL = {}, usedR = {};
      pairs.forEach((p) => {
        if (usedL[p.i] || usedR[p.j]) return;
        usedL[p.i] = usedR[p.j] = true;
        map[p.i] = p.j;
      });
    });
    return improve(map, left, right);
  }

  /* Shortest-travel alone is a poor mapping. It will happily send the two
   * hydrogens of an acetate group to opposite ends of the beaker because they
   * happened to start a millimetre nearer, tearing apart a group that the
   * reaction never touches.
   *
   * So: score a mapping by how many bonds it leaves intact, with distance only
   * as a tie-breaker, and improve it by swapping pairs. Swapping two atoms of
   * the same element always leaves a valid mapping, which makes this a hill
   * climb over legal states rather than a search that has to check itself.
   * It is a heuristic and makes no claim to be a mechanism — but a mapping
   * that keeps whole groups together is both prettier and closer to what
   * really happens than one that scatters them. */
  function improve(map, left, right) {
    const key = (a, b) => Math.min(a, b) + ':' + Math.max(a, b);
    const rightBonds = {};
    right.bonds.forEach((b) => { rightBonds[key(b.a, b.b)] = b.order; });

    const score = (m) => {
      let kept = 0, travel = 0;
      left.bonds.forEach((b) => {
        if (rightBonds[key(m[b.a], m[b.b])] === b.order) kept++;
      });
      left.atoms.forEach((a, i) => {
        travel += Math.hypot(a.x - right.atoms[m[i]].x, a.y - right.atoms[m[i]].y);
      });
      /* A kept bond is worth more than any plausible amount of travel, so the
       * distance term only ever decides between equally good mappings. */
      return kept * 1000 - travel;
    };

    let best = score(map);
    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (let i = 0; i < map.length; i++) {
        for (let j = i + 1; j < map.length; j++) {
          if (left.atoms[i].sym !== left.atoms[j].sym) continue;
          const t = map[i]; map[i] = map[j]; map[j] = t;
          const next = score(map);
          if (next > best + 1e-9) { best = next; moved = true; }
          else { const u = map[i]; map[i] = map[j]; map[j] = u; }
        }
      }
      if (!moved) break;
    }
    return map;
  }

  /* A bond that exists on both sides between the same pair of atoms never
   * broke. Saying which bonds survive is the one genuinely mechanistic thing
   * this animation can claim, because it follows from the atom mapping rather
   * than from a guess about how the reaction proceeds. */
  function classifyBonds(left, right, map) {
    const key = (a, b) => Math.min(a, b) + ':' + Math.max(a, b);
    const rightBonds = {};
    right.bonds.forEach((b) => { rightBonds[key(b.a, b.b)] = b.order; });
    const leftSeen = {};
    left.bonds.forEach((b) => {
      const k = key(map[b.a], map[b.b]);
      b.persists = rightBonds[k] === b.order;
      if (b.persists) leftSeen[k] = true;
    });
    right.bonds.forEach((b) => { b.persists = !!leftSeen[key(b.a, b.b)]; });
  }

  function buildScene(reaction) {
    const bal = ME.balance.balance(reaction.eq);
    if (!bal.ok) return { ok: false, error: bal.error };
    const formulas = bal.left.concat(bal.right).map((s) => s.species.formula.text);
    /* Two different failures, said differently, because they want different
     * fixes: one needs a structure added, the other needs a wrong one
     * corrected. Either way nothing is drawn — a reaction animation with a
     * made-up molecule in it is worse than no animation. */
    const unbuilt = formulas.filter((f) => !shapeOf(f));
    if (unbuilt.length) {
      const known = unbuilt.filter((f) => smilesFor(f));
      const unknown = unbuilt.filter((f) => !smilesFor(f));
      return { ok: false, error: unknown.length
        ? 'No structure stored for ' + unknown.join(' or ') + '.'
        : 'The stored structure for ' + known.join(' and ')
          + ' does not hold the atoms its formula claims, so it is not being drawn.' };
    }
    const left = sideScene(bal.left), right = sideScene(bal.right);
    if (!left || !right) return { ok: false, error: 'Could not build the structures.' };

    /* Both sides share one coordinate system, so an atom's journey is a
     * straight read across. */
    const map = mapAtoms(left, right);
    classifyBonds(left, right, map);

    const energy = ME.thermo.reactionEnthalpy(reaction.eq);
    return {
      ok: true, reaction: reaction, equation: bal, left: left, right: right, map: map,
      energy: energy.ok ? energy.deltaH : null,
      /* Why there is no number, in the cases where there is no number. An
       * animation that just quietly drops the energy would leave a reader
       * assuming the reaction has none. */
      energyMissing: energy.ok ? null : (energy.missing || null),
    };
  }

  /* ------------------------------------------------------------ the phases */
  /* Fractions of one run. The long middle is the rearrangement, because that
   * is the part worth watching. */
  const PHASES = [
    { at: 0.00, key: 'apart', label: 'The reactants, minding their own business' },
    { at: 0.20, key: 'closing', label: 'Closing in — a reaction needs a collision' },
    { at: 0.32, key: 'impact', label: 'Contact. The old bonds start to give' },
    { at: 0.40, key: 'swap', label: 'Atoms changing partners' },
    { at: 0.62, key: 'energy', label: null },
    { at: 0.76, key: 'done', label: 'The products, made of exactly the same atoms' },
  ];
  function phaseAt(t) {
    let p = PHASES[0];
    PHASES.forEach((x) => { if (t >= x.at) p = x; });
    return p;
  }
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const span = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));

  /* Where an atom is at time t, in scene units. */
  function atomAt(scene, i, t) {
    const L = scene.left.atoms[i], R = scene.right.atoms[scene.map[i]];
    /* How far in the molecules come to meet. Low numbers look dramatic for
     * about one frame and then everything is a pile in the middle with the
     * atoms drawn on top of each other, which is the opposite of the point. */
    const squeeze = 0.72;
    /* Wobble gives the molecules some life while they wait; it is decoration
     * and it stops at the moment the atoms start moving for real. */
    const w = Math.max(0, 1 - span(t, 0.3, 0.42)) * 0.05;
    const wob = Math.sin(t * 34 + i * 1.7) * w;

    if (t < 0.32) {
      const k = ease(span(t, 0.05, 0.32)) * (1 - squeeze);
      return { x: L.x * (1 - k) + wob, y: L.y * (1 - k) + wob, from: 1 };
    }
    if (t < 0.62) {
      const k = ease(span(t, 0.36, 0.60));
      return { x: (L.x * squeeze) * (1 - k) + (R.x * squeeze) * k,
        y: (L.y * squeeze) * (1 - k) + (R.y * squeeze) * k, from: 1 - k };
    }
    const k = ease(span(t, 0.66, 0.92));
    return { x: R.x * (squeeze + (1 - squeeze) * k) + wob,
      y: R.y * (squeeze + (1 - squeeze) * k) + wob, from: 0 };
  }

  /* --------------------------------------------------------------- the view */
  function buildModule() {
    const St = { built: false, host: null, canvas: null, ctx: null, scene: null,
      t: 0, playing: true, speed: 1, loop: true, raf: null, last: 0, current: null,
      caption: null, eqBox: null, noteBox: null, scrub: null, playBtn: null };

    function build(host) {
      St.host = host;
      const wrap = el('div', { class: 'wrap' });
      wrap.appendChild(el('h1', { text: 'Reactions' }));
      wrap.appendChild(el('p', { class: 'note' },
        'Pick a reaction and watch the atoms rearrange. The structures are real and the '
        + 'numbers of each are what the balanced equation says — but the path the atoms '
        + 'take in between is drawn, not computed. Real reactions go through collisions and '
        + 'intermediates; this shows what goes in and what comes out.'));

      const layout = el('div', { class: 'rx-layout' });
      const nav = el('nav', { class: 'rx-nav', 'aria-label': 'Reactions' });
      let lastGroup = null;
      REACTIONS.forEach((r) => {
        if (r.group !== lastGroup) {
          lastGroup = r.group;
          nav.appendChild(el('div', { class: 'rx-group', text: r.group }));
        }
        const b = el('button', { class: 'rx-navbtn', 'data-rx': r.id, text: r.name });
        b.addEventListener('click', () => { show(r.id); ME.revealTop(St.panel); });
        nav.appendChild(b);
      });
      layout.appendChild(nav);

      St.panel = el('div', { class: 'rx-panel' });
      layout.appendChild(St.panel);
      wrap.appendChild(layout);
      host.appendChild(wrap);
      St.built = true;
      show(REACTIONS[0].id);
    }

    function show(id) {
      const r = REACTIONS.filter((x) => x.id === id)[0] || REACTIONS[0];
      St.current = r;
      ME.$$('.rx-navbtn', St.host).forEach((b) => b.classList.toggle('on', b.dataset.rx === r.id));
      ME.clear(St.panel);

      const card = el('div', { class: 'card card-pad rx-card' });
      card.appendChild(el('h2', { text: r.name }));
      St.eqBox = el('div', { class: 'rx-eq' });
      card.appendChild(St.eqBox);

      const stage = el('div', { class: 'rx-stage' });
      St.canvas = el('canvas', { class: 'rx-canvas' });
      stage.appendChild(St.canvas);
      card.appendChild(stage);

      St.caption = el('div', { class: 'rx-caption' });
      card.appendChild(St.caption);

      const controls = el('div', { class: 'rx-controls' });
      St.playBtn = el('button', { class: 'btn btn-primary btn-sm', text: 'Pause' });
      St.playBtn.addEventListener('click', () => {
        St.playing = !St.playing;
        St.playBtn.textContent = St.playing ? 'Pause' : 'Play';
        if (St.playing) resume();
      });
      controls.appendChild(St.playBtn);

      const again = el('button', { class: 'btn btn-sm', text: 'Again' });
      again.addEventListener('click', () => {
        St.t = 0; St.playing = true; St.playBtn.textContent = 'Pause'; resume();
      });
      controls.appendChild(again);

      St.scrub = el('input', { class: 'rx-scrub', type: 'range', min: '0', max: '1000', value: '0' });
      St.scrub.addEventListener('input', () => {
        St.t = Number(St.scrub.value) / 1000;
        /* Dragging the bar is how you stop on the frame where a bond breaks,
         * so it takes over from the clock rather than fighting it. */
        St.playing = false;
        St.playBtn.textContent = 'Play';
        paint();
        updateCaption();
      });
      controls.appendChild(St.scrub);

      const speed = el('select', { class: 'tl-select rx-speed' });
      [['0.5', 'slow'], ['1', 'normal'], ['2', 'fast']].forEach(([v, label]) =>
        speed.appendChild(el('option', { value: v, text: label, selected: v === '1' || null })));
      speed.addEventListener('change', () => { St.speed = Number(speed.value); });
      controls.appendChild(speed);

      const loop = el('label', { class: 'rx-loop' });
      const box = el('input', { type: 'checkbox', checked: 'checked' });
      box.addEventListener('change', () => { St.loop = box.checked; });
      loop.appendChild(box);
      loop.appendChild(el('span', { text: 'loop' }));
      controls.appendChild(loop);
      card.appendChild(controls);

      card.appendChild(el('p', { class: 'note rx-note', text: r.note }));
      St.noteBox = el('div', { class: 'rx-energy' });
      card.appendChild(St.noteBox);
      St.panel.appendChild(card);

      St.scene = buildScene(r);
      St.t = 0;
      St.playing = true;
      St.playBtn.textContent = 'Pause';
      describeScene();
      resize();
      resume();
    }

    function describeScene() {
      ME.clear(St.eqBox);
      ME.clear(St.noteBox);
      if (!St.scene.ok) {
        St.eqBox.appendChild(el('div', { class: 'callout warn', text: St.scene.error }));
        return;
      }
      St.eqBox.appendChild(el('div', { class: 'rx-eqtext', html: ME.chemHTML(St.scene.equation.text) }));
      const dH = St.scene.energy;
      if (dH === null && St.scene.energyMissing) {
        /* An animation that simply shows no energy reads as a reaction with
         * none. Say which substance the table is missing instead. */
        const miss = St.scene.energyMissing;
        St.noteBox.appendChild(el('span', { class: 'note', html:
          'No energy figure: ' + miss.map((m) => ME.chemHTML(m)).join(' and ')
          + (miss.length > 1 ? ' are' : ' is')
          + ' not in the formation-enthalpy table, and a sum with a term missing '
          + 'would be a confident wrong number.' }));
      }
      if (dH !== null) {
        const out = dH < 0;
        St.noteBox.appendChild(el('span', {
          class: 'rx-badge ' + (out ? 'hot' : 'cold'),
          text: (out ? 'Releases ' : 'Absorbs ') + ME.fmt.fmt(Math.abs(dH), 5) + ' kJ per equation',
        }));
        St.noteBox.appendChild(el('span', { class: 'note', text: out
          ? ' — which is why the flash goes outwards.'
          : ' — energy has to be pushed in, so the sparks go the other way.' }));
      }
    }

    /* The canvas is sized in CSS pixels and drawn at the device ratio, so the
     * labels stay crisp on a retina screen. */
    function resize() {
      if (!St.canvas) return;
      const ratio = window.devicePixelRatio || 1;
      const w = St.canvas.clientWidth || 640;
      const h = Math.max(300, Math.min(460, Math.round(w * 0.52)));
      St.canvas.style.height = h + 'px';
      St.canvas.width = Math.round(w * ratio);
      St.canvas.height = Math.round(h * ratio);
      St.ctx = St.canvas.getContext('2d');
      St.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      St.w = w; St.h = h;
      paint();
    }

    /* One scale for the whole run, from the widest the scene ever gets, so
     * nothing changes size mid-animation. Worked out per axis: a stage twice
     * as wide as it is tall will otherwise push the top of a tall molecule
     * off the canvas to satisfy the width. */
    function sceneScale() {
      let mx = 0.8, my = 0.8;
      [St.scene.left, St.scene.right].forEach((side) => side.atoms.forEach((a) => {
        mx = Math.max(mx, Math.abs(a.x));
        my = Math.max(my, Math.abs(a.y));
      }));
      /* Half an atom at each edge, and room under the bottom row for a label. */
      return Math.min(St.w / (2 * mx + 1.4), St.h / (2 * my + 2.4));
    }

    function paint() {
      if (!St.ctx || !St.scene || !St.scene.ok) return;
      const ctx = St.ctx, W = St.w, H = St.h, t = St.t;
      const s = sceneScale(), cx = W / 2, cy = H / 2;
      const X = (x) => cx + x * s, Y = (y) => cy + y * s;

      ctx.clearRect(0, 0, W, H);
      const css = getComputedStyle(document.documentElement);
      const ink = css.getPropertyValue('--text').trim() || '#222';
      const faint = css.getPropertyValue('--border-strong').trim() || '#999';

      /* The flash, drawn under everything so it reads as light in the room
       * rather than a sticker on top. */
      const burst = span(t, 0.58, 0.80);
      if (burst > 0 && burst < 1 && St.scene.energy !== null) {
        drawEnergy(ctx, cx, cy, burst, St.scene.energy, s);
      }

      const pos = St.scene.left.atoms.map((a, i) => atomAt(St.scene, i, t));
      /* Bonds first, so the atoms sit on top of their own ends. */
      drawBonds(ctx, St.scene.left.bonds, (i) => pos[i], X, Y, s, ink,
        t < 0.36 ? 1 : 1 - span(t, 0.36, 0.52), false);
      drawBonds(ctx, St.scene.right.bonds, (j) => {
        const i = St.scene.map.indexOf(j);
        return pos[i];
      }, X, Y, s, ink, t < 0.46 ? 0 : span(t, 0.46, 0.64), true);

      St.scene.left.atoms.forEach((a, i) => {
        const p = pos[i];
        drawAtom(ctx, X(p.x), Y(p.y), a.sym, s, ink);
      });

      if (t < 0.30 || t > 0.80) drawLabels(ctx, X, Y, s, t, faint);
    }

    function drawBonds(ctx, bonds, posOf, X, Y, s, ink, alpha, isProduct) {
      if (alpha <= 0.01) return;
      ctx.save();
      bonds.forEach((b) => {
        const p = posOf(b.a), q = posOf(b.b);
        if (!p || !q) return;
        /* A bond that survives the reaction is drawn solid the whole way
         * through; only the ones that actually break get to fade. */
        ctx.globalAlpha = b.persists ? 1 : alpha;
        /* Colour marks the moment, not the bond. A bond is ordinary ink until
         * it is mid-break or mid-form; a scene that opens with every bond
         * already red has spent its one signal before anything happened. */
        ctx.strokeStyle = (b.persists || alpha > 0.985) ? ink
          : (isProduct ? '#2f9e5f' : '#d2544a');
        ctx.lineWidth = Math.max(1.6, s * 0.09);
        ctx.lineCap = 'round';
        const dx = q.x - p.x, dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        /* Scene units, not pixels: the offset is applied to coordinates that
         * have not been scaled yet. Mixing the two drew the second line of
         * every double bond four bond-lengths above the molecule. */
        const gap = b.order > 1 ? 0.085 : 0;
        for (let k = 0; k < b.order; k++) {
          const off = (k - (b.order - 1) / 2) * gap * 2;
          ctx.beginPath();
          ctx.moveTo(X(p.x + nx * off), Y(p.y + ny * off));
          ctx.lineTo(X(q.x + nx * off), Y(q.y + ny * off));
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    /* Black or white lettering, whichever the circle underneath can carry.
     * Hydrogen's CPK colour is white, so a fixed white label made it vanish. */
    function inkOn(hex) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return '#1a1a1a';
      const lum = (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16)
        + 0.114 * parseInt(m[3], 16)) / 255;
      return lum > 0.6 ? '#1a1a1a' : '#fff';
    }

    function drawAtom(ctx, x, y, sym, s, ink) {
      const r = Math.max(7, s * (sym === 'H' ? 0.22 : 0.3));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = ME.chem.colorOf(sym);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.stroke();
      if (r > 9) {
        ctx.fillStyle = inkOn(ME.chem.colorOf(sym));
        ctx.font = '600 ' + Math.round(r * 1.05) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sym, x, y + 0.5);
      }
    }

    /* Sparks. Outward and warm when energy comes out, inward and cold when it
     * has to be put in — and as many of them as the enthalpy deserves. */
    function drawEnergy(ctx, cx, cy, k, dH, s) {
      const out = dH < 0;
      const strength = Math.min(1, Math.abs(dH) / 1200);
      const n = Math.round(14 + strength * 46);
      const fade = Math.sin(k * Math.PI);
      ctx.save();
      ctx.globalAlpha = fade * 0.9;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + i * 0.7;
        /* Every spark travels at its own speed. Without this they stay in
         * formation and the burst reads as a dotted circle. */
        const pace = 0.55 + ((i * 2654435761) % 1000) / 1000 * 0.75;
        const reach = s * (1.2 + strength * 2.4) * pace * (out ? k : 1 - k);
        const x = cx + Math.cos(ang) * reach, y = cy + Math.sin(ang) * reach;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, s * 0.05 * (1 - k * 0.6)), 0, Math.PI * 2);
        ctx.fillStyle = out ? (i % 3 ? '#ff9a3c' : '#ffd166') : '#5aa9e6';
        ctx.fill();
      }
      ctx.globalAlpha = fade * (out ? 0.22 : 0.14) * (0.4 + strength);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 3);
      g.addColorStop(0, out ? '#ffb703' : '#4895ef');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - s * 3, cy - s * 3, s * 6, s * 6);
      ctx.restore();
    }

    /* Formula labels under each molecule, at the two moments when the
     * molecules are actually separate things worth naming. */
    /* Canvas has no markup, so the subscripts are the characters themselves. */
    const SUB = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
    function subscripted(formula) {
      return String(formula).replace(/\d/g, (d) => SUB.charAt(Number(d)));
    }

    function drawLabels(ctx, X, Y, s, t, faint) {
      const side = t < 0.3 ? St.scene.left : St.scene.right;
      const alpha = t < 0.3 ? 1 - span(t, 0.18, 0.3) : span(t, 0.8, 0.9);
      if (alpha <= 0.02) return;
      const groups = {};
      side.atoms.forEach((a, i) => {
        const left = t < 0.3 ? i : St.scene.map.indexOf(i);
        const p = atomAt(St.scene, left, t);
        const g = groups[a.mol] = groups[a.mol] || { x: 0, n: 0, low: -1e9, f: a.formula };
        g.x += p.x; g.n++;
        /* Under the lowest atom, not under the middle of the molecule, or the
         * label sits on top of whatever hangs below the centre. */
        g.low = Math.max(g.low, p.y);
      });
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = faint;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      Object.keys(groups).forEach((k) => {
        const g = groups[k];
        ctx.fillText(subscripted(g.f), X(g.x / g.n), Y(g.low) + s * 0.52 + 14);
      });
      ctx.restore();
    }

    function step(now) {
      St.raf = null;
      if (!St.playing) return;
      const dt = St.last ? Math.min(0.05, (now - St.last) / 1000) : 0;
      St.last = now;
      St.t += dt * 0.145 * St.speed;
      if (St.t >= 1) {
        if (St.loop) St.t = 0;
        else { St.t = 1; St.playing = false; St.playBtn.textContent = 'Play'; }
      }
      if (St.scrub) St.scrub.value = String(Math.round(St.t * 1000));
      paint();
      updateCaption();
      if (St.playing) St.raf = requestAnimationFrame(step);
    }

    function updateCaption() {
      if (!St.caption) return;
      const p = phaseAt(St.t);
      let text = p.label;
      if (p.key === 'energy') {
        const dH = St.scene && St.scene.energy;
        text = dH === null || dH === undefined ? 'Settling into the new arrangement'
          : dH < 0 ? 'The new bonds are stronger than the old ones — the difference comes out as heat'
            : 'The new bonds are weaker than the old ones, so this one had to be paid for';
      }
      if (St.caption.textContent !== text) St.caption.textContent = text;
    }

    function resume() {
      if (!St.built || St.raf || !St.playing) return;
      St.last = 0;
      St.raf = requestAnimationFrame(step);
    }
    function pause() {
      if (St.raf) cancelAnimationFrame(St.raf);
      St.raf = null;
    }
    function ensureBuilt(host) {
      if (!St.built) build(host);
      resize();
    }

    window.addEventListener('resize', ME.debounce(() => { if (St.built) resize(); }, 150));

    return { ensureBuilt, resume, pause, show, buildScene, shapeOf, smilesFor, checkStructures, atomAt,
      REACTIONS, SMILES,
      get state() { return St; } };
  }
  ME.reactionsim = buildModule();
})();
