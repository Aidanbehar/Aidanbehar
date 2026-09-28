/* Lewis structures and VSEPR shapes, worked out rather than listed.
 *
 * Every molecule the lessons show is run through this code, so the drawing,
 * the electron count, the formal charges, the shape name and the bond angle
 * all come from one place and cannot disagree with each other. The method is
 * the ordinary school one — count what you have, count what you need, the
 * difference is what gets shared — with the two families of exception
 * (electron-deficient boron and beryllium, and the expanded octets further
 * down the table) handled explicitly rather than quietly getting them wrong.
 */
(function () {
  'use strict';
  const ME = window.ME;

  /* How many electrons an atom of this element brings to the table. Straight
   * off the group number, so it cannot drift away from the periodic table. */
  function valenceOf(sym) {
    const e = ME.chem.element(sym);
    if (!e) return null;
    if (sym === 'He') return 2;
    const pos = ME.chem.ptPosition(e.z);
    const group = pos ? pos[1] : null;
    if (group === null) return null;
    if (group <= 2) return group;
    if (group >= 13) return group - 10;
    return null;                       /* d-block: not a main-group count */
  }

  /* How many electrons an atom wants around it once the sharing is done.
   * Hydrogen and helium fill at two. Beryllium and boron are famously content
   * with less, and pretending otherwise is what makes BF3 come out wrong. */
  function needsOf(sym) {
    if (sym === 'H' || sym === 'He') return 2;
    if (sym === 'Be') return 4;
    if (sym === 'B' || sym === 'Al') return 6;
    return 8;
  }

  /* Only period 3 and below can hold more than eight, because only they have
   * d orbitals close enough in energy to use. */
  const CAN_EXPAND = { P: 1, S: 1, Cl: 1, Br: 1, I: 1, Xe: 1, Kr: 1, As: 1, Se: 1, Sb: 1, Te: 1, Si: 1 };
  /* An atom that will not take a share in a second or third bond in any
   * structure a school course draws. */
  const NEVER_MULTIPLE = { H: 1, F: 1, Cl: 1, Br: 1, I: 1 };

  /* Which atom goes in the middle: never hydrogen, and otherwise the one that
   * holds its electrons most loosely, because the central atom is the one
   * doing the most sharing. A single atom of its element is a strong hint. */
  function chooseCentral(counts) {
    const syms = Object.keys(counts).filter((s) => s !== 'H');
    if (!syms.length) return null;
    if (syms.length === 1) return syms[0];
    const singles = syms.filter((s) => counts[s] === 1);
    const pool = singles.length ? singles : syms;
    let best = null, bestEn = Infinity;
    pool.forEach((s) => {
      const e = ME.chem.element(s);
      const en = e && e.en != null ? e.en : 99;
      if (en < bestEn) { bestEn = en; best = s; }
    });
    return best;
  }

  /* ------------------------------------------------------------- shapes */
  /* Keyed by the number of things around the central atom (bonded groups plus
   * lone pairs) and how many of those are lone pairs. Symmetric means the bond
   * dipoles cancel when every outer atom is the same. */
  const SHAPES = {
    '1,0': { name: 'linear', angle: null, symmetric: true, why: 'Two atoms can only lie in a line.' },
    '2,0': { name: 'linear', angle: 180, symmetric: true, why: 'Two groups get as far apart as possible, which is opposite ends of a straight line.' },
    '2,1': { name: 'bent', angle: 118, symmetric: false, why: 'Three groups would be a flat triangle, but one corner is a lone pair you cannot see, so what is left looks bent.' },
    '2,2': { name: 'bent', angle: 104.5, symmetric: false, why: 'Four groups point at the corners of a tetrahedron; two of those corners are lone pairs, so the visible shape is bent.' },
    '2,3': { name: 'linear', angle: 180, symmetric: true, why: 'Five groups make a trigonal bipyramid, and three lone pairs take the roomy equatorial corners, leaving the two poles in a line.' },
    '3,0': { name: 'trigonal planar', angle: 120, symmetric: true, why: 'Three groups spread into a flat triangle, 120° apart.' },
    '3,1': { name: 'trigonal pyramidal', angle: 107, symmetric: false, why: 'Four groups point tetrahedrally, and one is a lone pair, so the three bonds form a pyramid under it.' },
    '3,2': { name: 'T-shaped', angle: 90, symmetric: false, why: 'Five groups, with two lone pairs taking equatorial corners, leaves three bonds in a T.' },
    '4,0': { name: 'tetrahedral', angle: 109.5, symmetric: true, why: 'Four groups get furthest apart at the corners of a tetrahedron, not in a flat cross.' },
    '4,1': { name: 'seesaw', angle: 90, symmetric: false, why: 'Five groups with one equatorial lone pair, which pushes the rest into a seesaw.' },
    '4,2': { name: 'square planar', angle: 90, symmetric: true, why: 'Six groups make an octahedron; two lone pairs take opposite poles, leaving a flat square.' },
    '5,0': { name: 'trigonal bipyramidal', angle: 120, symmetric: true, why: 'Five groups: three round the equator at 120°, two at the poles.' },
    '5,1': { name: 'square pyramidal', angle: 90, symmetric: false, why: 'Six groups with one lone pair at a pole, leaving a square base and one apex.' },
    '6,0': { name: 'octahedral', angle: 90, symmetric: true, why: 'Six groups, all at 90° to their neighbours.' },
  };

  /* --------------------------------------------------------- the method */
  /* counts: { C: 1, H: 4 }. Returns everything a lesson needs to draw and
   * explain the structure, or { ok: false, why } if it is outside what this
   * method can honestly do. */
  function analyse(counts, opts) {
    opts = opts || {};
    const charge = opts.charge || 0;
    const atoms = [];
    Object.keys(counts).forEach((s) => { for (let i = 0; i < counts[s]; i++) atoms.push(s); });
    if (atoms.length < 2) return { ok: false, why: 'A Lewis structure needs at least two atoms.' };

    const central = opts.central || chooseCentral(counts);
    if (!central) return { ok: false, why: 'Every atom here is hydrogen, and hydrogen cannot be a central atom — it only ever makes one bond.' };
    if (valenceOf(central) === null) return { ok: false, why: ME.chem.element(central).name + ' is a transition metal, and its bonding does not follow the simple counting method.' };

    const terminals = atoms.slice();
    terminals.splice(terminals.indexOf(central), 1);
    if (!terminals.length) return { ok: false, why: 'There is nothing for the central atom to bond to.' };
    for (let i = 0; i < terminals.length; i++) {
      if (valenceOf(terminals[i]) === null) return { ok: false, why: ME.chem.element(terminals[i]).name + ' is a transition metal, and its bonding does not follow the simple counting method.' };
    }

    const steps = [];

    /* 1. What we have. A negative ion has gained electrons, so its charge is
     *    subtracted, which is the sign catching everybody out. */
    let available = valenceOf(central);
    const perAtom = [central + ' brings ' + valenceOf(central)];
    terminals.forEach((s) => { available += valenceOf(s); });
    const termGroups = {};
    terminals.forEach((s) => { termGroups[s] = (termGroups[s] || 0) + 1; });
    Object.keys(termGroups).forEach((s) => {
      perAtom.push(termGroups[s] + ' × ' + s + ' at ' + valenceOf(s) + ' = ' + (termGroups[s] * valenceOf(s)));
    });
    available -= charge;
    steps.push({
      label: 'Count the valence electrons you have',
      detail: perAtom.join(', ') +
        (charge ? '; the ' + (charge > 0 ? charge + '+' : (-charge) + '−') + ' charge ' +
          (charge > 0 ? 'means ' + charge + ' fewer' : 'means ' + (-charge) + ' more') : ''),
      value: available + ' electrons available',
    });

    /* 2. What they would all want if they were on their own. */
    let needed = needsOf(central);
    terminals.forEach((s) => { needed += needsOf(s); });
    steps.push({
      label: 'Count what they would all need separately',
      detail: 'eight each, except hydrogen at two' +
        (central === 'B' || central === 'Be' || central === 'Al' ? ' and ' + central + ', which settles for ' + needsOf(central) : ''),
      value: needed + ' electrons needed',
    });

    /* 3. The difference has to be made up by sharing, and a shared pair is
     *    counted twice — once by each atom. That is the whole trick. */
    let shared = needed - available;
    let bonds = Math.floor(shared / 2);
    let expanded = false;

    if (bonds < terminals.length) {
      /* Not enough bonds to reach every outer atom. Either the central atom is
       * holding more than eight, or the molecule does not exist. */
      if (!CAN_EXPAND[central]) {
        return { ok: false, why: 'The counting gives only ' + bonds + ' bond' + (bonds === 1 ? '' : 's') +
          ' for ' + terminals.length + ' outer atoms, and ' + central + ' is in period 2, so it cannot hold more than eight electrons. This is not a structure that exists.' };
      }
      expanded = true;
      bonds = terminals.length;
      shared = bonds * 2;
      steps.push({
        label: 'The count says too few bonds, so the central atom expands',
        detail: central + ' is in period 3 or below, so it has d orbitals near enough in energy to hold more than eight electrons. Give it one bond to each outer atom and carry on.',
        value: bonds + ' bonds',
      });
    } else {
      steps.push({
        label: 'The difference must be shared',
        detail: needed + ' − ' + available + ' = ' + shared + ' shared electrons, and a shared pair is one bond',
        value: bonds + ' bond' + (bonds === 1 ? '' : 's'),
      });
    }

    /* 4. One bond to each outer atom, then spend anything left over on making
     *    some of them double or triple. Hydrogen and the halogens never take
     *    a second share in a structure at this level. */
    const order = terminals.map(() => 1);
    let extra = bonds - terminals.length;
    if (extra < 0) return { ok: false, why: 'There are not enough electrons to bond every atom on.' };
    for (let pass = 0; pass < 2 && extra > 0; pass++) {
      for (let i = 0; i < terminals.length && extra > 0; i++) {
        if (NEVER_MULTIPLE[terminals[i]]) continue;
        if (order[i] >= 3) continue;
        order[i]++; extra--;
      }
    }
    if (extra > 0) return { ok: false, why: 'The count leaves bonds with nowhere to go — the outer atoms here cannot take double bonds.' };

    const multiples = order.filter((o) => o > 1).length;
    if (multiples) {
      const spare = bonds - terminals.length;
      steps.push({
        label: 'Place the bonds',
        detail: 'One bond to each outer atom uses ' + (terminals.length * 2) + ' electrons, and the ' +
          (spare === 1 ? 'one left over becomes ' : spare + ' left over become ') +
          (order.indexOf(3) >= 0 ? 'a triple bond'
            : multiples === 1 ? 'a double bond' : multiples + ' double bonds') + '.',
        value: order.map((o, i) => terminals[i] + (o === 1 ? '' : o === 2 ? ' (double)' : ' (triple)')).join(', '),
      });
    }

    /* 5. Everything not in a bond is a lone pair. Outer atoms get theirs
     *    first, and whatever is left sits on the central atom. */
    let leftover = available - bonds * 2;
    const termLone = [];
    terminals.forEach((s, i) => {
      const want = Math.max(0, (needsOf(s) - order[i] * 2) / 2);
      const give = Math.min(want, Math.floor(leftover / 2));
      termLone.push(give);
      leftover -= give * 2;
    });
    const centralLone = Math.floor(leftover / 2);
    leftover -= centralLone * 2;
    if (leftover !== 0) return { ok: false, why: 'An odd electron is left over. This molecule is a radical, and radicals do not obey the octet rule.' };

    steps.push({
      label: 'Everything left is lone pairs',
      detail: 'Fill the outer atoms first, then whatever remains sits on ' + central + '.',
      value: centralLone === 0 ? 'no lone pairs on ' + central
        : centralLone + ' lone pair' + (centralLone === 1 ? '' : 's') + ' on ' + central,
    });

    /* 6. Formal charge, which is the check that the structure is the sensible
     *    one: valence electrons brought, minus the ones kept, minus the bonds. */
    const fcOf = (sym, lone, bondCount) => valenceOf(sym) - lone * 2 - bondCount;
    const centralFC = fcOf(central, centralLone, order.reduce((a, b) => a + b, 0));
    const termFC = terminals.map((s, i) => fcOf(s, termLone[i], order[i]));
    const fcSum = centralFC + termFC.reduce((a, b) => a + b, 0);

    /* 7. Shape. Lone pairs take up room even though you cannot see them, so
     *    they count towards the arrangement and then get left out of the name. */
    const groups = terminals.length;
    const steric = groups + centralLone;
    const shape = SHAPES[groups + ',' + centralLone] ||
      { name: 'not a standard shape', angle: null, symmetric: false,
        why: 'This arrangement is beyond the shapes a first course covers.' };

    /* 8. Polarity. A bond is polar when the two ends pull unequally; the
     *    molecule is polar when those pulls do not cancel. */
    const sameTerminals = terminals.every((s) => s === terminals[0]);
    const cEn = ME.chem.element(central).en;
    const bondPolar = terminals.some((s) => {
      const e = ME.chem.element(s).en;
      return e != null && cEn != null && Math.abs(e - cEn) >= 0.4;
    });
    /* Symmetric shape with identical outer atoms means every pull is matched by
     * an equal one opposite, so the molecule has no overall direction. Anything
     * else is polar if the bonds pull unequally — or if there is a lone pair,
     * which is a lump of charge on one side even when the bonds are even. PH3
     * is the case that catches a bonds-only rule out. */
    const polar = (shape.symmetric && sameTerminals) ? false : (bondPolar || centralLone > 0);

    return {
      ok: true,
      central: central, terminals: terminals, order: order,
      charge: charge, available: available, needed: needed, shared: shared,
      bonds: bonds, expanded: expanded,
      centralLone: centralLone, terminalLone: termLone,
      centralFC: centralFC, terminalFC: termFC, formalChargeSum: fcSum,
      groups: groups, steric: steric,
      shape: shape.name, angle: shape.angle, shapeWhy: shape.why, symmetric: shape.symmetric,
      polar: polar, bondPolar: bondPolar,
      resonance: multiples > 0 && sameTerminals && terminals.length > 1 && order.some((o) => o === 1),
      steps: steps,
      formula: formulaOf(counts, charge),
    };
  }

  function formulaOf(counts, charge) {
    const f = ME.formula.parse(Object.keys(counts).map((s) => s + (counts[s] > 1 ? counts[s] : '')).join(''));
    return f.ok ? f.display : '';
  }

  /* A convenience: give it a formula and it does the parsing too. */
  function fromFormula(text, opts) {
    const f = ME.formula.parse(text);
    if (!f.ok) return { ok: false, why: f.error };
    return analyse(f.counts, Object.assign({ charge: f.charge || 0 }, opts || {}));
  }

  ME.lewis = {
    analyse: analyse, fromFormula: fromFormula,
    valenceOf: valenceOf, needsOf: needsOf, chooseCentral: chooseCentral,
    SHAPES: SHAPES,
  };
})();
