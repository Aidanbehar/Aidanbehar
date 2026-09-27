/* The drawing editor's own structure model, and the canvas painter for it.
 *
 * The editor keeps its own graph rather than an OpenChemLib molecule, because
 * a half-finished drawing is often not a valid molecule yet, and the editor
 * must never refuse to show you what you drew. The graph is converted to a
 * real molecule on demand for the formula, SMILES, validation and recognition.
 *
 * Coordinates are in "bond length = 1" units, matching OpenChemLib's own
 * convention, so a structure can be handed back and forth without rescaling.
 */
(function () {
  'use strict';

  const ME = window.ME;

  /* ------------------------------------------------------------- the graph */
  function emptyGraph() { return { atoms: [], bonds: [] }; }

  function cloneGraph(g) {
    return {
      atoms: g.atoms.map((a) => ({ x: a.x, y: a.y, sym: a.sym, charge: a.charge || 0 })),
      bonds: g.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order })),
    };
  }

  function addAtom(g, x, y, sym) {
    g.atoms.push({ x, y, sym: sym || 'C', charge: 0 });
    return g.atoms.length - 1;
  }

  function findBond(g, i, j) {
    for (let k = 0; k < g.bonds.length; k++) {
      const b = g.bonds[k];
      if ((b.a === i && b.b === j) || (b.a === j && b.b === i)) return k;
    }
    return -1;
  }

  function addBond(g, i, j, order) {
    if (i === j) return -1;
    const k = findBond(g, i, j);
    if (k >= 0) { g.bonds[k].order = order || 1; return k; }
    g.bonds.push({ a: i, b: j, order: order || 1 });
    return g.bonds.length - 1;
  }

  function removeAtom(g, i) {
    g.atoms.splice(i, 1);
    g.bonds = g.bonds.filter((b) => b.a !== i && b.b !== i)
      .map((b) => ({ a: b.a > i ? b.a - 1 : b.a, b: b.b > i ? b.b - 1 : b.b, order: b.order }));
  }

  function neighbours(g, i) {
    const out = [];
    g.bonds.forEach((b) => {
      if (b.a === i) out.push({ to: b.b, order: b.order });
      else if (b.b === i) out.push({ to: b.a, order: b.order });
    });
    return out;
  }

  /* How many bonds are already used up at this atom. */
  function usedValence(g, i) {
    let v = 0;
    g.bonds.forEach((b) => { if (b.a === i || b.b === i) v += b.order; });
    return v;
  }

  /* Hydrogens the drawing is not showing: whatever is left of the atom's
   * normal capacity after its drawn bonds are counted. */
  function implicitH(g, i) {
    const at = g.atoms[i];
    const rule = ME.chem.VALENCE[at.sym];
    if (!rule || ME.chem.METALS.has(at.sym)) return 0;
    const charge = at.charge || 0;
    let allowed = rule.allowed.slice();
    if (charge !== 0) {
      const alt = rule.charged && rule.charged[String(charge)];
      allowed = alt ? alt.slice() : allowed;
    }
    const used = usedValence(g, i);
    /* pick the smallest normal valence that still covers what is drawn */
    let target = null;
    for (const v of allowed.slice().sort((a, b) => a - b)) {
      if (v >= used) { target = v; break; }
    }
    if (target === null) return 0;
    return Math.max(0, target - used);
  }

  /* --------------------------------------------------- graph <-> molecule */
  /* Builds a real OpenChemLib molecule so the rest of the app (formula, mass,
   * SMILES, functional groups, recognition) can treat a drawing like anything
   * else. Coordinates are carried across so the layout is preserved. */
  function toMolecule(g) {
    const OCL = window.OCL;
    const m = new OCL.Molecule(Math.max(1, g.atoms.length), Math.max(1, g.bonds.length));
    g.atoms.forEach((a) => {
      const idx = m.addAtom(ME.chem.atomicNumber(a.sym) || 6);
      m.setAtomX(idx, a.x);
      m.setAtomY(idx, a.y);
      m.setAtomZ(idx, 0);
      if (a.charge) m.setAtomCharge(idx, a.charge);
    });
    g.bonds.forEach((b) => {
      const bi = m.addBond(b.a, b.b);
      m.setBondOrder(bi, b.order);
    });
    try { m.ensureHelperArrays(OCL.Molecule.cHelperRings); } catch (e) { /* partial drawing */ }
    return m;
  }

  function fromMolecule(mol) {
    ME.chem.ensureCoordinates(mol);
    const g = emptyGraph();
    for (let a = 0; a < mol.getAllAtoms(); a++) {
      g.atoms.push({
        x: mol.getAtomX(a), y: mol.getAtomY(a),
        sym: ME.chem.symbolFor(mol.getAtomicNo(a)),
        charge: mol.getAtomCharge(a),
      });
    }
    for (let b = 0; b < mol.getAllBonds(); b++) {
      g.bonds.push({ a: mol.getBondAtom(0, b), b: mol.getBondAtom(1, b), order: mol.getBondOrder(b) });
    }
    return g;
  }

  /* ------------------------------------------------------------- geometry */
  const SNAP = Math.PI / 6;     /* 30 degrees, the angle a zig-zag chain uses */

  /* Where should a new bond from this atom point? Away from everything already
   * there, snapped to a tidy angle. */
  function suggestAngle(g, i, preferred) {
    const taken = neighbours(g, i).map((n) =>
      Math.atan2(g.atoms[n.to].y - g.atoms[i].y, g.atoms[n.to].x - g.atoms[i].x));
    if (!taken.length) return preferred !== undefined ? preferred : -SNAP;
    if (taken.length === 1) {
      /* One neighbour: the straight-ahead direction has the biggest gap, but a
       * chain of carbons zig-zags at about 120 degrees, so offer that instead
       * and pick whichever side is emptier. */
      const a1 = normalise(taken[0] + Math.PI - SNAP * 2);
      const a2 = normalise(taken[0] + Math.PI + SNAP * 2);
      return crowding(g, i, a1) <= crowding(g, i, a2) ? a1 : a2;
    }
    let best = 0, bestGap = -1;
    for (let k = 0; k < 24; k++) {
      const ang = -Math.PI + (k * Math.PI) / 12;
      let gap = Infinity;
      taken.forEach((t) => { gap = Math.min(gap, Math.abs(ME.render2d.angleDiff(ang, t))); });
      if (gap > bestGap) { bestGap = gap; best = ang; }
    }
    return best;
  }

  /* How close would a new atom in this direction land to existing atoms? */
  function crowding(g, i, angle) {
    const tx = g.atoms[i].x + Math.cos(angle);
    const ty = g.atoms[i].y + Math.sin(angle);
    let worst = 0;
    g.atoms.forEach((a, k) => {
      if (k === i) return;
      const d = Math.hypot(a.x - tx, a.y - ty);
      if (d < 1.2) worst += 1.2 - d;
    });
    return worst;
  }
  function normalise(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }
  function snapAngle(a) { return Math.round(a / SNAP) * SNAP; }

  /* Ring templates, generated rather than tabulated: a regular polygon whose
   * side length is one bond. */
  function ringPoints(n, cx, cy, startAngle) {
    const r = 0.5 / Math.sin(Math.PI / n);
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = (startAngle || -Math.PI / 2) + (k * 2 * Math.PI) / n;
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return pts;
  }

  function addRing(g, n, cx, cy, aromatic, startAngle) {
    const pts = ringPoints(n, cx, cy, startAngle);
    const first = g.atoms.length;
    pts.forEach((p) => addAtom(g, p.x, p.y, 'C'));
    for (let k = 0; k < n; k++) {
      addBond(g, first + k, first + ((k + 1) % n), aromatic && k % 2 === 0 ? 2 : 1);
    }
    return first;
  }

  /* Fuse a ring onto an existing bond, so clicking a bond on benzene gives you
   * naphthalene rather than a ring floating on top. */
  function fuseRing(g, bondIndex, n, aromatic) {
    const bd = g.bonds[bondIndex];
    const A = g.atoms[bd.a], B = g.atoms[bd.b];
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    const dx = B.x - A.x, dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    /* push the new ring's centre to the emptier side of the bond */
    const apothem = 0.5 / Math.tan(Math.PI / n);
    let side = 1;
    let sum = 0;
    g.atoms.forEach((a, i) => {
      if (i === bd.a || i === bd.b) return;
      const d = Math.hypot(a.x - mx, a.y - my);
      if (d > 4) return;
      sum += ((a.x - mx) * px + (a.y - my) * py) / (d || 1);
    });
    if (sum > 0) side = -1;
    const cx = mx + px * apothem * side, cy = my + py * apothem * side;
    const startAngle = Math.atan2(A.y - cy, A.x - cx);

    const pts = ringPoints(n, cx, cy, startAngle);
    /* pts[0] lands on A; find which end pts[1] is nearer so the ring is walked
     * in the right direction */
    const dir = Math.hypot(pts[1].x - B.x, pts[1].y - B.y) < Math.hypot(pts[n - 1].x - B.x, pts[n - 1].y - B.y) ? 1 : -1;
    const idx = [bd.a];
    for (let k = 1; k < n; k++) {
      const p = pts[((dir === 1 ? k : n - k) + n) % n];
      if (k === 1 && dir === 1) { idx.push(bd.b); continue; }
      if (k === n - 1 && dir === -1) { idx.push(bd.b); continue; }
      idx.push(addAtom(g, p.x, p.y, 'C'));
    }
    for (let k = 0; k < n; k++) {
      const i = idx[k], j = idx[(k + 1) % n];
      if (findBond(g, i, j) < 0) addBond(g, i, j, aromatic && k % 2 === 1 ? 2 : 1);
      else if (aromatic) g.bonds[findBond(g, i, j)].order = k % 2 === 1 ? 2 : 1;
    }
    return idx;
  }

  /* Tidy a messy drawing by handing it to OpenChemLib's layout engine. */
  function cleanUp(g) {
    if (!g.atoms.length) return g;
    try {
      const mol = toMolecule(g);
      mol.inventCoordinates();
      const out = fromMolecule(mol);
      /* keep the elements and charges the user chose, in case the round trip
       * reordered nothing but we want to be certain */
      return out;
    } catch (e) { return g; }
  }

  function boundingBox(g) {
    if (!g.atoms.length) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    g.atoms.forEach((a) => {
      minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x);
      minY = Math.min(minY, a.y); maxY = Math.max(maxY, a.y);
    });
    return { minX, maxX, minY, maxY };
  }

  ME.drawModel = {
    emptyGraph, cloneGraph, addAtom, addBond, findBond, removeAtom, neighbours,
    usedValence, implicitH, toMolecule, fromMolecule,
    suggestAngle, snapAngle, normalise, ringPoints, addRing, fuseRing, cleanUp, boundingBox,
    SNAP,
  };
})();
