/* The 2D drawing engine.
 *
 * The whole point of this renderer (rather than using OpenChemLib's own SVG
 * export) is the X-ray slider: one continuous parameter that morphs a skeletal
 * line-angle drawing into a full structural formula. Nothing pops in or out.
 *
 *   xray = 0   carbons are bare vertices, hydrogens on carbon are invisible,
 *              an O-H reads as a compact "OH"
 *   xray = 1   every atom carries a label, every hydrogen sits at the end of
 *              its own bond line
 *
 * Between those, labels fade up, bonds retract from the growing labels, and
 * hydrogens slide outwards from beside their atom to the end of a bond.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const SVGNS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    return n;
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

  /* --------------------------------------------------- geometry extraction */
  /* Turn an OpenChemLib molecule into the flat description the drawing code
   * works from, so the renderer never has to query the library mid-draw. */
  function describe(mol, opts) {
    const chem = ME.chem;
    chem.ensureCoordinates(mol);
    const n = mol.getAllAtoms();
    const atoms = [];
    for (let a = 0; a < n; a++) {
      const z = mol.getAtomicNo(a);
      const sym = chem.symbolFor(z);
      atoms.push({
        i: a, x: mol.getAtomX(a), y: mol.getAtomY(a), z, sym,
        charge: mol.getAtomCharge(a),
        hydrogens: mol.getImplicitHydrogens(a),
        isCarbon: z === 6,
        aromatic: mol.isAromaticAtom(a),
        ring: mol.isRingAtom(a),
        bonds: [],
        lonePairs: opts && opts.lonePairs ? chem.lonePairs(mol, a) : 0,
        /* Hands left empty because the hydrogens were deliberately switched
         * off, rather than because the atom is full. Drawn as dots. */
        openHands: opts && opts.radicalDots ? openHandCount(mol, a) : 0,
      });
    }
    const bonds = [];
    for (let b = 0; b < mol.getAllBonds(); b++) {
      const a1 = mol.getBondAtom(0, b), a2 = mol.getBondAtom(1, b);
      const bd = { i: b, a: a1, b: a2, order: mol.getBondOrder(b), ring: mol.isRingBond(b), aromatic: mol.isAromaticBond(b) };
      bonds.push(bd);
      atoms[a1].bonds.push(bd);
      atoms[a2].bonds.push(bd);
    }
    return { atoms, bonds };
  }

  /* An atom whose valence has been pinned to exactly what is drawn has had its
   * hydrogens suppressed; the difference from its normal valence is how many
   * unpaired electrons it is left holding. */
  function openHandCount(mol, a) {
    if (mol.getAtomAbnormalValence(a) < 0) return 0;
    if (mol.getImplicitHydrogens(a) > 0) return 0;
    const sym = ME.chem.symbolFor(mol.getAtomicNo(a));
    const rule = ME.chem.VALENCE[sym];
    if (!rule || ME.chem.METALS.has(sym)) return 0;
    let used = 0;
    for (let k = 0; k < mol.getAllConnAtoms(a); k++) used += mol.getConnBondOrder(a, k);
    let cap = null;
    for (const v of rule.allowed.slice().sort((x, y) => x - y)) {
      if (v >= used) { cap = v; break; }
    }
    if (cap === null) return 0;
    return Math.max(0, Math.min(4, cap - used));
  }

  /* A carbon is normally invisible in a skeletal drawing. It has to be drawn
   * anyway when there is nothing else to mark its position. */
  function carbonNeedsLabel(atom, atoms) {
    if (atom.bonds.length === 0) return true;
    if (atom.bonds.length === 1) {
      /* A lone C-C pair (ethane) would otherwise be a bare line with nothing
       * to say what its ends are; a CH3 on a longer chain is fine as a vertex. */
      const other = atom.bonds[0].a === atom.i ? atom.bonds[0].b : atom.bonds[0].a;
      if (atoms[other].bonds.length === 1) return true;
    }
    return false;
  }

  /* Where do the hydrogens go?
   *
   * This has to be decided for the whole molecule at once. Choosing each atom's
   * hydrogen directions on its own is what produces unreadable drawings: two
   * bonded carbons will each pick the roomy gap between them, and their
   * hydrogens land on top of one another. So every hydrogen is placed against a
   * shared map of what is already on the page — heavy atoms first, then each
   * hydrogen as it is positioned.
   */

  /* How far a hydrogen sits from its atom when fully expanded, as a fraction of
   * a bond length. One whole bond, the way a structural formula is drawn. */
  const H_BOND_FRACTION = 1.0;
  /* Roughly the radius of a drawn label in bond-length units: the font is about
   * 0.46 of a bond and the label disc about 0.62 of the font. */
  const LABEL_R = 0.3;

  /* How far the hydrogens sit from their atom in the collapsed, skeletal state.
   *
   * Every label is drawn on a small disc that masks the bonds behind it, so two
   * labels whose centres are closer than about 1.2 font sizes will clip each
   * other. One hydrogen tucks in right beside its atom, so that an O-H reads as
   * "OH"; two or more also have to clear one another, which needs more room the
   * closer together their directions ended up. */
  function collapsedRadius(a, fs) {
    const clear = fs * 1.2;
    if (!a.hDirs || a.hDirs.length < 2) return clear;
    let minGap = Math.PI;
    for (let i = 0; i < a.hDirs.length; i++) {
      for (let j = i + 1; j < a.hDirs.length; j++) {
        const d = Math.abs(angleDiff(a.hDirs[i], a.hDirs[j]));
        if (d < minGap) minGap = d;
      }
    }
    const needed = minGap > 0.02 ? clear / (2 * Math.sin(minGap / 2)) : clear * 2;
    /* never further out than a hydrogen sits when fully expanded */
    return Math.max(clear, Math.min(needed, fs * 2.1));
  }

  /* Ring the dots sit on, as a fraction of the font size: just outside the
   * disc that backs the atom's letter. */
  const DECO_RING = 0.88;

  /* Places everything that hangs off an atom — its hydrogens, the dots marking
   * hands left empty, and its lone pairs — in one pass over the whole molecule,
   * against a single shared map of what is already on the page.
   *
   * Every one of these used to be chosen per atom, looking only at that atom's
   * own bonds, which is why two neighbouring atoms would happily put a mark in
   * exactly the same spot and the dots between them merged into one.
   *
   * fsUnits is the font size expressed in bond lengths, so that the marks scale
   * with the drawing.
   */
  function placeDecorations(atoms, fsUnits) {
    const ring = fsUnits * DECO_RING;
    const dotR = fsUnits * 0.16;
    const pairR = fsUnits * 0.34;

    /* kind 'centre' entries are skipped for their own atom's marks: a dot is
     * meant to hug the letter it belongs to. */
    const occupied = [];
    atoms.forEach((a, i) => {
      a.hDirs = []; a.dotDirs = []; a.lpDirs = [];
      occupied.push({ x: a.x, y: a.y, r: LABEL_R, kind: 'centre', owner: i });
    });

    /* Most-constrained first: an atom with three bonds has almost no choice
     * about where its one hydrogen goes, so let it claim its spot before the
     * atoms that have room to move. */
    const order = atoms.map((a, i) => i)
      .sort((i, j) => atoms[j].bonds.length - atoms[i].bonds.length);

    const bondAnglesOf = (a) => a.bonds.map((bd) => {
      const o = bd.a === a.i ? bd.b : bd.a;
      return Math.atan2(atoms[o].y - a.y, atoms[o].x - a.x);
    });

    /* Pick the best free direction for one mark and record where it landed. */
    function place(a, i, radius, markR, bondAngles, taken, prefer) {
      let best = 0, bestScore = Infinity;
      for (let k = 0; k < 72; k++) {
        const th = -Math.PI + (k * Math.PI) / 36;
        const mx = a.x + Math.cos(th) * radius;
        const my = a.y + Math.sin(th) * radius;
        let score = 0;

        /* Stay out of the directions this atom's bonds already use. */
        for (const b of bondAngles) {
          const d = Math.abs(angleDiff(th, b));
          if (d < 0.9) score += (0.9 - d) * 4;
        }
        /* Stay clear of every mark already on the page. */
        for (const q of occupied) {
          if (q.kind === 'centre' && q.owner === i) continue;
          const need = q.r + markR + fsUnits * 0.1;
          const dx = mx - q.x, dy = my - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < need * need) {
            const d = Math.sqrt(d2);
            score += (need - d) * (need - d) * 60;
          }
        }
        if (prefer) score += prefer(th);
        /* Among equally free directions, take the one furthest from
         * everything, so marks spread evenly instead of bunching. */
        let spread = Math.PI;
        for (const t of bondAngles) spread = Math.min(spread, Math.abs(angleDiff(th, t)));
        for (const t of taken) spread = Math.min(spread, Math.abs(angleDiff(th, t)));
        score -= spread * 0.25;

        if (score < bestScore) { bestScore = score; best = th; }
      }
      taken.push(best);
      return best;
    }

    /* 1. hydrogens, which are the biggest marks and the most constrained */
    order.forEach((i) => {
      const a = atoms[i];
      if (!a.hydrogens) return;
      const bondAngles = bondAnglesOf(a);
      for (let h = 0; h < a.hydrogens; h++) {
        const prefer = (a.preferH && h === 0)
          /* A heteroatom's first hydrogen sits beside it, so an O with one
           * hydrogen reads as "OH" rather than stacking vertically. */
          ? (th) => Math.min(Math.abs(angleDiff(th, 0)), Math.abs(angleDiff(th, Math.PI))) * 0.35
          : null;
        const ang = place(a, i, H_BOND_FRACTION, LABEL_R, bondAngles, a.hDirs, prefer);
        occupied.push({
          x: a.x + Math.cos(ang) * H_BOND_FRACTION,
          y: a.y + Math.sin(ang) * H_BOND_FRACTION,
          r: LABEL_R, kind: 'h', owner: i,
        });
      }
    });

    /* 2. then the dots, which have to dodge the hydrogens as well as each
     * other and the neighbouring atoms */
    order.forEach((i) => {
      const a = atoms[i];
      if (!a.openHands && !a.lonePairs) return;
      const bondAngles = bondAnglesOf(a);
      const taken = a.hDirs.slice();

      for (let k = 0; k < (a.openHands || 0); k++) {
        const ang = place(a, i, ring, dotR, bondAngles, taken, null);
        a.dotDirs.push(ang);
        occupied.push({ x: a.x + Math.cos(ang) * ring, y: a.y + Math.sin(ang) * ring, r: dotR, kind: 'dot', owner: i });
      }
      for (let k = 0; k < (a.lonePairs || 0); k++) {
        const ang = place(a, i, ring, pairR, bondAngles, taken, null);
        a.lpDirs.push(ang);
        occupied.push({ x: a.x + Math.cos(ang) * ring, y: a.y + Math.sin(ang) * ring, r: pairR, kind: 'lp', owner: i });
      }
    });
  }

  function angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }

  /* --------------------------------------------------------------- drawing */
  /* opts:
   *   xray       0..1
   *   width/height  target box in px (the SVG is responsive via viewBox)
   *   lonePairs  draw non-bonding electron dots on heteroatoms
   *   highlight  [{ atoms:[i], color }]
   *   radicalDots  mark hands left empty by switching hydrogens off
   *   interactive  attach hover targets and tooltips
   *   onAtomClick  callback(atomIndex)
   *   selectable   atoms that respond to a click
   */
  function render(mol, opts) {
    opts = opts || {};
    const xray = clamp01(opts.xray === undefined ? 0 : opts.xray);
    const chem = ME.chem;
    const { atoms } = describe(mol, opts);
    const desc = { atoms, bonds: [] };
    atoms.forEach((a) => a.bonds.forEach((b) => { if (desc.bonds.indexOf(b) < 0) desc.bonds.push(b); }));

    /* ---- decide what each atom shows ---- */
    atoms.forEach((a) => {
      a.forceLabel = !a.isCarbon || carbonNeedsLabel(a, atoms);
      /* opacity of this atom's own element label */
      a.labelAlpha = a.forceLabel ? 1 : xray;
      a.preferH = !a.isCarbon;
      /* Hydrogens on a heteroatom are visible even in skeletal form (as "OH"),
       * hydrogens on a carbon are the ones the shorthand hides. */
      a.hAlpha = a.isCarbon ? xray : 1;
    });

    /* ---- layout ---- */
    const pad = 1.0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    atoms.forEach((a) => {
      const reach = a.hydrogens > 0 ? H_BOND_FRACTION + LABEL_R : 0.45;
      minX = Math.min(minX, a.x - reach); maxX = Math.max(maxX, a.x + reach);
      minY = Math.min(minY, a.y - reach); maxY = Math.max(maxY, a.y + reach);
    });
    if (!isFinite(minX)) { minX = maxX = minY = maxY = 0; }
    const unitW = (maxX - minX) + pad * 2;
    const unitH = (maxY - minY) + pad * 2;

    const boxW = opts.width || 440;
    const boxH = opts.height || 300;
    let scale = Math.min(boxW / unitW, boxH / unitH);
    scale = Math.max(14, Math.min(scale, opts.maxScale || 52));

    const w = Math.max(unitW * scale, boxW * 0.35);
    const h = Math.max(unitH * scale, boxH * 0.35);
    const offX = (w - (maxX - minX) * scale) / 2 - minX * scale;
    const offY = (h - (maxY - minY) * scale) / 2 - minY * scale;
    const PX = (a) => a.x * scale + offX;
    const PY = (a) => a.y * scale + offY;

    const fs = Math.max(9, scale * 0.46);
    const lw = Math.max(1.3, scale / 15);
    const bondColor = opts.bondColor || 'var(--bond)';

    /* Where the hydrogens, dots and lone pairs go. It has to wait for the font
     * size, because the marks are spaced in multiples of it. */
    placeDecorations(atoms, fs / scale);

    const svg = svgEl('svg', {
      xmlns: SVGNS, viewBox: `0 0 ${round(w)} ${round(h)}`,
      class: 'molcanvas', role: 'img',
      'aria-label': opts.label || 'Molecular structure drawing',
      preserveAspectRatio: 'xMidYMid meet',
    });
    svg.style.maxHeight = boxH + 'px';

    const gHighlight = svgEl('g', {});
    const gBonds = svgEl('g', { 'stroke-linecap': 'round' });
    const gAtoms = svgEl('g', {});
    const gHits = svgEl('g', {});
    svg.appendChild(gHighlight); svg.appendChild(gBonds); svg.appendChild(gAtoms); svg.appendChild(gHits);

    /* ---- functional group haloes ---- */
    if (opts.highlight) {
      opts.highlight.forEach((hl) => {
        (hl.atoms || []).forEach((ai) => {
          const a = atoms[ai];
          if (!a) return;
          gHighlight.appendChild(svgEl('circle', {
            cx: round(PX(a)), cy: round(PY(a)), r: round(scale * 0.40),
            fill: hl.color, opacity: 0.22,
          }));
        });
        /* join adjacent highlighted atoms with a thick soft stroke */
        const set = new Set(hl.atoms || []);
        desc.bonds.forEach((bd) => {
          if (!set.has(bd.a) || !set.has(bd.b)) return;
          gHighlight.appendChild(svgEl('line', {
            x1: round(PX(atoms[bd.a])), y1: round(PY(atoms[bd.a])),
            x2: round(PX(atoms[bd.b])), y2: round(PY(atoms[bd.b])),
            stroke: hl.color, 'stroke-width': round(scale * 0.8),
            'stroke-linecap': 'round', opacity: 0.22,
          }));
        });
      });
    }

    /* ---- how far a bond stops short of each end ---- */
    /* The gap tracks the label's opacity, so in skeletal mode lines meet at a
     * clean point and in full mode they stop politely outside the letters. */
    function trimFor(a) {
      const base = a.labelAlpha * (fs * 0.62);
      const extra = a.charge !== 0 ? fs * 0.2 * a.labelAlpha : 0;
      const wide = a.sym.length > 1 ? fs * 0.14 * a.labelAlpha : 0;
      return base + extra + wide;
    }

    /* ---- bonds ---- */
    desc.bonds.forEach((bd) => {
      const A = atoms[bd.a], B = atoms[bd.b];
      const x1 = PX(A), y1 = PY(A), x2 = PX(B), y2 = PY(B);
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const tA = trimFor(A), tB = trimFor(B);
      const sx = x1 + ux * tA, sy = y1 + uy * tA;
      const ex = x2 - ux * tB, ey = y2 - uy * tB;
      if (Math.hypot(ex - sx, ey - sy) < 1) return;

      const px = -uy, py = ux;                 /* perpendicular */
      const sep = scale * 0.16;

      if (bd.order === 2) {
        const dir = doubleBondSide(bd, A, B, atoms, px, py, PX, PY);
        if (dir === 0) {
          /* symmetric pair, used for an isolated C=C or C=O */
          line(gBonds, sx + px * sep / 2, sy + py * sep / 2, ex + px * sep / 2, ey + py * sep / 2, lw, bondColor);
          line(gBonds, sx - px * sep / 2, sy - py * sep / 2, ex - px * sep / 2, ey - py * sep / 2, lw, bondColor);
        } else {
          line(gBonds, sx, sy, ex, ey, lw, bondColor);
          const inset = 0.16;
          const ix1 = lerp(sx, ex, inset) + px * sep * dir;
          const iy1 = lerp(sy, ey, inset) + py * sep * dir;
          const ix2 = lerp(sx, ex, 1 - inset) + px * sep * dir;
          const iy2 = lerp(sy, ey, 1 - inset) + py * sep * dir;
          line(gBonds, ix1, iy1, ix2, iy2, lw, bondColor);
        }
      } else if (bd.order === 3) {
        line(gBonds, sx, sy, ex, ey, lw, bondColor);
        line(gBonds, sx + px * sep, sy + py * sep, ex + px * sep, ey + py * sep, lw, bondColor);
        line(gBonds, sx - px * sep, sy - py * sep, ex - px * sep, ey - py * sep, lw, bondColor);
      } else {
        line(gBonds, sx, sy, ex, ey, lw, bondColor);
      }
    });

    /* ---- hydrogens (they slide out as the slider moves) ---- */
    atoms.forEach((a) => {
      if (!a.hydrogens || a.hAlpha <= 0.001) return;
      const ax = PX(a), ay = PY(a);
      /* beside the label when collapsed, at bond length when expanded */
      const near = collapsedRadius(a, fs);
      const far = scale * H_BOND_FRACTION;
      a.hDirs.forEach((ang) => {
        const dist = lerp(near, far, xray);
        const hx = ax + Math.cos(ang) * dist;
        const hy = ay + Math.sin(ang) * dist;

        /* the bond line to the hydrogen only exists once it has moved out */
        const bondAlpha = clamp01((xray - 0.28) / 0.55);
        if (bondAlpha > 0.01) {
          const tA = trimFor(a);
          const ux = Math.cos(ang), uy = Math.sin(ang);
          const l = line(gBonds, ax + ux * tA, ay + uy * tA,
            hx - ux * fs * 0.58, hy - uy * fs * 0.58, lw, bondColor);
          l.setAttribute('opacity', round3(bondAlpha * a.hAlpha));
        }
        const hg = svgEl('g', { opacity: round3(a.hAlpha) });
        /* A disc behind the letter, so a bond passing nearby never runs
         * through it. */
        hg.appendChild(svgEl('circle', {
          cx: round(hx), cy: round(hy), r: round(fs * 0.56), fill: opts.bg || 'var(--surface)',
        }));
        const t = svgEl('text', {
          x: round(hx), y: round(hy), 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': round(fs), 'font-family': 'var(--font-sans)', 'font-weight': 500,
          fill: 'var(--text)',
        });
        t.textContent = 'H';
        hg.appendChild(t);
        gAtoms.appendChild(hg);
      });
    });

    /* ---- atom labels ---- */
    atoms.forEach((a) => {
      const x = PX(a), y = PY(a);
      if (a.labelAlpha > 0.001) {
        const g = svgEl('g', { opacity: round3(a.labelAlpha) });
        /* a disc of background behind the letter so bonds never touch it */
        g.appendChild(svgEl('circle', {
          cx: round(x), cy: round(y), r: round(fs * 0.62),
          fill: opts.bg || 'var(--surface)',
        }));
        const t = svgEl('text', {
          x: round(x), y: round(y), 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': round(fs), 'font-family': 'var(--font-sans)', 'font-weight': 620,
          fill: opts.mono ? 'var(--text)' : ME.chem.labelColorOf(a.sym),
        });
        t.textContent = a.sym;
        g.appendChild(t);
        gAtoms.appendChild(g);
      }
      /* charges are never hidden: they change what the molecule is */
      if (a.charge !== 0) {
        const cx = x + fs * 0.66, cy = y - fs * 0.58;
        const badge = svgEl('text', {
          x: round(cx), y: round(cy), 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': round(fs * 0.72), 'font-family': 'var(--font-sans)', 'font-weight': 700,
          fill: a.charge > 0 ? '#d93b32' : '#2f6df6',
        });
        badge.textContent = (Math.abs(a.charge) > 1 ? Math.abs(a.charge) : '') + (a.charge > 0 ? '+' : '−');
        gAtoms.appendChild(badge);
      }
      /* unpaired electrons where hydrogens were switched off: single dots, so
       * they read differently from the paired dots of a lone pair */
      a.dotDirs.forEach((ang) => {
        gAtoms.appendChild(svgEl('circle', {
          cx: round(x + Math.cos(ang) * fs * DECO_RING),
          cy: round(y + Math.sin(ang) * fs * DECO_RING),
          r: round(Math.max(1.2, fs * 0.11)), fill: 'var(--text-soft)',
        }));
      });
      /* lone pairs: two dots side by side, so they read as a pair */
      a.lpDirs.forEach((ang) => {
        const r = fs * DECO_RING;
        const ox = x + Math.cos(ang) * r, oy = y + Math.sin(ang) * r;
        const pxp = -Math.sin(ang), pyp = Math.cos(ang);
        const d = fs * 0.17;
        [-1, 1].forEach((side) => {
          gAtoms.appendChild(svgEl('circle', {
            cx: round(ox + pxp * d * side), cy: round(oy + pyp * d * side),
            r: round(Math.max(1.1, fs * 0.095)), fill: 'var(--text-soft)', opacity: 0.85,
          }));
        });
      });
    });

    /* ---- invisible hover / click targets ---- */
    if (opts.interactive !== false) {
      atoms.forEach((a) => {
        const hit = svgEl('circle', {
          cx: round(PX(a)), cy: round(PY(a)), r: round(Math.max(11, scale * 0.44)),
          fill: 'transparent', class: 'hit',
        });
        hit.style.cursor = opts.onAtomClick ? 'pointer' : 'help';
        const text = atomDescription(a);
        const show = (ev) => {
          const pt = ev.touches ? ev.touches[0] : ev;
          ME.showTip(text, pt.clientX, pt.clientY - 6);
        };
        hit.addEventListener('mouseenter', show);
        hit.addEventListener('mousemove', show);
        hit.addEventListener('mouseleave', ME.hideTip);
        hit.addEventListener('touchstart', (ev) => { show(ev); setTimeout(ME.hideTip, 2400); }, { passive: true });
        if (opts.onAtomClick) {
          hit.addEventListener('click', (ev) => { ev.stopPropagation(); opts.onAtomClick(a.i, a, hit); });
        }
        gHits.appendChild(hit);
      });
    }

    svg.__atoms = atoms;
    svg.__scale = scale;
    svg.__project = (a) => ({ x: PX(a), y: PY(a) });
    return svg;
  }

  /* The tooltip line the lessons promise: "Carbon, with 2 hidden hydrogens." */
  function atomDescription(a) {
    const name = ME.chem.elementName(a.sym);
    let s = name;
    if (a.charge !== 0) s += `, charge ${a.charge > 0 ? '+' + a.charge : a.charge}`;
    if (a.hydrogens > 0) {
      const hidden = a.isCarbon ? 'hidden ' : '';
      s += `, with ${a.hydrogens} ${hidden}hydrogen${a.hydrogens === 1 ? '' : 's'}`;
    } else if (a.isCarbon) {
      s += ', with no hydrogens — its four bonds are all used up';
    }
    return s + '.';
  }

  /* Which side does the second line of a double bond sit on? Inside a ring,
   * always inwards; otherwise centre it. */
  function doubleBondSide(bd, A, B, atoms, px, py, PX, PY) {
    if (!bd.ring) {
      const neighbours = [];
      [A, B].forEach((at) => at.bonds.forEach((o) => {
        if (o === bd) return;
        const other = o.a === at.i ? o.b : o.a;
        neighbours.push(atoms[other]);
      }));
      if (neighbours.length === 0) return 0;
      const mx = (PX(A) + PX(B)) / 2, my = (PY(A) + PY(B)) / 2;
      let sum = 0;
      neighbours.forEach((nb) => { sum += (PX(nb) - mx) * px + (PY(nb) - my) * py; });
      if (Math.abs(sum) < 1e-6) return 0;
      return sum > 0 ? 1 : -1;
    }
    /* ring bond: aim at the average of the other ring atoms nearby */
    const mx = (PX(A) + PX(B)) / 2, my = (PY(A) + PY(B)) / 2;
    let cx = 0, cy = 0, count = 0;
    atoms.forEach((at) => {
      if (!at.ring || at === A || at === B) return;
      const d = Math.hypot(PX(at) - mx, PY(at) - my);
      if (d < 200) { cx += PX(at); cy += PY(at); count++; }
    });
    if (!count) return 0;
    cx /= count; cy /= count;
    const dot = (cx - mx) * px + (cy - my) * py;
    return dot > 0 ? 1 : -1;
  }

  function line(parent, x1, y1, x2, y2, w, color) {
    const l = svgEl('line', {
      x1: round(x1), y1: round(y1), x2: round(x2), y2: round(y2),
      stroke: color, 'stroke-width': round3(w),
    });
    parent.appendChild(l);
    return l;
  }

  const round = (v) => Math.round(v * 100) / 100;
  const round3 = (v) => Math.round(v * 1000) / 1000;

  /* ------------------------------------------------- slider-backed viewer */
  /* Mounts a drawing plus its X-ray slider, re-rendering as the slider moves. */
  function mountXray(container, mol, opts) {
    opts = opts || {};
    const holder = ME.el('div', { class: 'xray-holder' });
    const target = ME.el('div');
    holder.appendChild(target);

    let value = opts.xray === undefined ? 0 : opts.xray;

    const slider = ME.el('input', {
      type: 'range', min: '0', max: '100', value: String(Math.round(value * 100)),
      'aria-label': 'X-ray slider: slide from the skeletal shorthand to the full structural formula',
    });
    const row = ME.el('div', { class: 'xray' }, [
      ME.el('label', { text: 'Skeletal' }),
      slider,
      ME.el('label', { text: 'Full structure' }),
    ]);

    function paint() {
      slider.style.setProperty('--pct', Math.round(value * 100) + '%');
      ME.clear(target);
      target.appendChild(render(mol, Object.assign({}, opts, { xray: value })));
    }
    slider.addEventListener('input', () => { value = slider.value / 100; paint(); });
    paint();

    if (opts.hideSlider !== true) holder.appendChild(row);
    container.appendChild(holder);
    return {
      node: holder,
      set(v) { value = clamp01(v); slider.value = String(Math.round(value * 100)); paint(); },
      get() { return value; },
      repaint: paint,
    };
  }

  /* Serialise an SVG for download, inlining the theme colours it resolves. */
  function toStandaloneSVG(svg) {
    const clone = svg.cloneNode(true);
    const cs = getComputedStyle(document.body);
    const map = {
      'var(--bond)': cs.getPropertyValue('--bond').trim() || '#2b2f38',
      'var(--text)': cs.getPropertyValue('--text').trim() || '#16181d',
      'var(--text-soft)': cs.getPropertyValue('--text-soft').trim() || '#565c69',
      'var(--surface)': cs.getPropertyValue('--surface').trim() || '#ffffff',
    };
    clone.querySelectorAll('*').forEach((n) => {
      ['stroke', 'fill'].forEach((attr) => {
        const v = n.getAttribute(attr);
        if (v && map[v]) n.setAttribute(attr, map[v]);
      });
      const f = n.getAttribute('font-family');
      if (f && f.includes('var(')) n.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
    });
    clone.setAttribute('xmlns', SVGNS);
    clone.removeAttribute('class');
    const bg = svgEl('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: map['var(--surface)'] });
    clone.insertBefore(bg, clone.firstChild);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  }

  function svgToPNG(svg, scale, cb) {
    const src = toStandaloneSVG(svg);
    const vb = (svg.getAttribute('viewBox') || '0 0 400 300').split(/\s+/).map(Number);
    const w = Math.max(1, vb[2]) * (scale || 2);
    const h = Math.max(1, vb[3]) * (scale || 2);
    const img = new Image();
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(src)));
    img.onload = function () {
      const c = document.createElement('canvas');
      c.width = Math.round(w); c.height = Math.round(h);
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((blob) => cb(blob), 'image/png');
    };
    img.onerror = function () { cb(null); };
    img.src = url;
  }

  ME.render2d = {
    render, mountXray, describe, toStandaloneSVG, svgToPNG, atomDescription, svgEl,
    /* shared with the drawing editor's canvas painter so both obey the same rules */
    placeDecorations, collapsedRadius, carbonNeedsLabel, angleDiff, lerp, clamp01,
    H_BOND_FRACTION, LABEL_R, DECO_RING,
  };
})();
