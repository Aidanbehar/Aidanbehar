/* Canvas painter for the drawing editor.
 *
 * It follows exactly the same rules as the SVG renderer on the molecule page
 * (shared helpers live in ME.render2d), so a molecule looks identical whether
 * you are reading about it or drawing it. Canvas is used here rather than SVG
 * because the editor repaints on every pointer move.
 */
(function () {
  'use strict';

  const ME = window.ME;

  /* Turn the editor graph into the shape the shared geometry helpers expect. */
  function prepare(g, xray) {
    const M = ME.drawModel;
    const atoms = g.atoms.map((a, i) => ({
      i, x: a.x, y: a.y, sym: a.sym, charge: a.charge || 0,
      hydrogens: M.implicitH(g, i),
      isCarbon: a.sym === 'C',
      bonds: [],
    }));
    const bonds = g.bonds.map((b, i) => {
      const bd = { i, a: b.a, b: b.b, order: b.order, ring: false };
      atoms[b.a].bonds.push(bd);
      atoms[b.b].bonds.push(bd);
      return bd;
    });
    markRings(atoms, bonds);
    atoms.forEach((a) => {
      a.forceLabel = !a.isCarbon || ME.render2d.carbonNeedsLabel(a, atoms);
      a.labelAlpha = a.forceLabel ? 1 : xray;
      a.hAlpha = a.isCarbon ? xray : 1;
      a.preferH = !a.isCarbon;
      /* hands left empty because this atom's hydrogens were switched off */
      a.openHands = (g.atoms[a.i].noH || g.atoms[a.i].rad) ? Math.min(4, M.autoH(g, a.i)) : 0;
    });
    /* One pass for the whole structure, so hydrogens on neighbouring atoms
     * cannot be placed on top of each other. */
    ME.render2d.placeAllHydrogens(atoms);
    return { atoms, bonds };
  }

  /* A bond is in a ring if its two ends are still connected without it. */
  function markRings(atoms, bonds) {
    const adj = atoms.map(() => []);
    bonds.forEach((b, i) => { adj[b.a].push({ to: b.b, i }); adj[b.b].push({ to: b.a, i }); });
    bonds.forEach((bd, skip) => {
      const seen = new Set([bd.a]);
      const stack = [bd.a];
      while (stack.length) {
        const n = stack.pop();
        if (n === bd.b) { bd.ring = true; break; }
        for (const e of adj[n]) {
          if (e.i === skip || seen.has(e.to)) continue;
          seen.add(e.to); stack.push(e.to);
        }
      }
    });
  }

  /* view: { scale, ox, oy } mapping model units to canvas pixels */
  function paint(ctx, g, view, opts) {
    opts = opts || {};
    const xray = opts.xray || 0;
    const W = view.w, H = view.h;
    const dpr = view.dpr || 1;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const css = getComputedStyle(document.body);
    const colText = css.getPropertyValue('--text').trim() || '#16181d';
    const colBond = css.getPropertyValue('--bond').trim() || '#2b2f38';
    const colSurface = css.getPropertyValue('--surface').trim() || '#fff';
    const colFaint = css.getPropertyValue('--text-faint').trim() || '#888';
    const colAccent = css.getPropertyValue('--accent').trim() || '#2f6df6';

    if (opts.grid) drawGrid(ctx, view, css);

    const { atoms } = prepare(g, xray);
    const S = view.scale;
    const PX = (a) => a.x * S + view.ox;
    const PY = (a) => a.y * S + view.oy;
    const fs = Math.max(10, S * 0.46);
    const lw = Math.max(1.4, S / 15);

    ctx.lineCap = 'round';
    ctx.font = `620 ${fs}px ${css.getPropertyValue('--font-sans') || 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    function trimFor(a) {
      const base = a.labelAlpha * (fs * 0.62);
      const extra = a.charge !== 0 ? fs * 0.2 * a.labelAlpha : 0;
      const wide = a.sym.length > 1 ? fs * 0.14 * a.labelAlpha : 0;
      return base + extra + wide;
    }

    /* --- problem haloes, so a bad atom is visible before you read the panel */
    (opts.problems || []).forEach((p) => {
      const a = atoms[p.atom];
      if (!a) return;
      ctx.beginPath();
      ctx.arc(PX(a), PY(a), S * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = p.level === 'error' ? 'rgba(217,59,50,.20)' : 'rgba(224,176,74,.24)';
      ctx.fill();
      ctx.strokeStyle = p.level === 'error' ? 'rgba(217,59,50,.75)' : 'rgba(224,176,74,.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    /* --- hover / selection */
    if (opts.hoverAtom != null && atoms[opts.hoverAtom]) {
      const a = atoms[opts.hoverAtom];
      ctx.beginPath();
      ctx.arc(PX(a), PY(a), S * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = colAccent + '33';
      ctx.fill();
    }
    if (opts.hoverBond != null && g.bonds[opts.hoverBond]) {
      const b = g.bonds[opts.hoverBond];
      const A = atoms[b.a], B = atoms[b.b];
      ctx.beginPath();
      ctx.moveTo(PX(A), PY(A)); ctx.lineTo(PX(B), PY(B));
      ctx.strokeStyle = colAccent + '44';
      ctx.lineWidth = S * 0.3;
      ctx.stroke();
    }

    /* --- bonds */
    ctx.strokeStyle = colBond;
    ctx.lineWidth = lw;
    g.bonds.forEach((b, bi) => {
      const A = atoms[b.a], B = atoms[b.b];
      if (!A || !B) return;
      const x1 = PX(A), y1 = PY(A), x2 = PX(B), y2 = PY(B);
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const sx = x1 + ux * trimFor(A), sy = y1 + uy * trimFor(A);
      const ex = x2 - ux * trimFor(B), ey = y2 - uy * trimFor(B);
      if (Math.hypot(ex - sx, ey - sy) < 1) return;
      const px = -uy, py = ux;
      const sep = S * 0.16;
      const bd = { ring: (prepareRingLookup(atoms, bi) || false) };

      if (b.order === 2) {
        const side = doubleSide(atoms, g, bi, px, py, PX, PY);
        if (side === 0) {
          seg(ctx, sx + px * sep / 2, sy + py * sep / 2, ex + px * sep / 2, ey + py * sep / 2);
          seg(ctx, sx - px * sep / 2, sy - py * sep / 2, ex - px * sep / 2, ey - py * sep / 2);
        } else {
          seg(ctx, sx, sy, ex, ey);
          const t = 0.16;
          seg(ctx,
            sx + (ex - sx) * t + px * sep * side, sy + (ey - sy) * t + py * sep * side,
            sx + (ex - sx) * (1 - t) + px * sep * side, sy + (ey - sy) * (1 - t) + py * sep * side);
        }
      } else if (b.order === 3) {
        seg(ctx, sx, sy, ex, ey);
        seg(ctx, sx + px * sep, sy + py * sep, ex + px * sep, ey + py * sep);
        seg(ctx, sx - px * sep, sy - py * sep, ex - px * sep, ey - py * sep);
      } else {
        seg(ctx, sx, sy, ex, ey);
      }
    });

    /* --- hydrogens */
    atoms.forEach((a) => {
      if (!a.hydrogens || a.hAlpha <= 0.001) return;
      const ax = PX(a), ay = PY(a);
      const near = ME.render2d.collapsedRadius(a, fs);
      const far = S * ME.render2d.H_BOND_FRACTION;
      a.hDirs.forEach((ang) => {
        const dist = near + (far - near) * xray;
        const hx = ax + Math.cos(ang) * dist, hy = ay + Math.sin(ang) * dist;
        const bondAlpha = Math.max(0, Math.min(1, (xray - 0.28) / 0.55)) * a.hAlpha;
        if (bondAlpha > 0.01) {
          ctx.save();
          ctx.globalAlpha = bondAlpha;
          ctx.strokeStyle = colBond;
          ctx.lineWidth = lw;
          const t = trimFor(a);
          seg(ctx, ax + Math.cos(ang) * t, ay + Math.sin(ang) * t,
            hx - Math.cos(ang) * fs * 0.58, hy - Math.sin(ang) * fs * 0.58);
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = a.hAlpha;
        /* a disc behind the letter, so no bond line runs through it */
        ctx.beginPath();
        ctx.arc(hx, hy, fs * 0.56, 0, Math.PI * 2);
        ctx.fillStyle = colSurface;
        ctx.fill();
        ctx.fillStyle = colText;
        ctx.font = `500 ${fs}px ${css.getPropertyValue('--font-sans') || 'sans-serif'}`;
        ctx.fillText('H', hx, hy);
        ctx.restore();
      });
    });

    /* --- atom labels */
    atoms.forEach((a) => {
      const x = PX(a), y = PY(a);
      if (a.labelAlpha > 0.001) {
        ctx.save();
        ctx.globalAlpha = a.labelAlpha;
        ctx.beginPath();
        ctx.arc(x, y, fs * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = colSurface;
        ctx.fill();
        ctx.fillStyle = a.sym === 'H' ? colText : ME.chem.colorOf(a.sym);
        ctx.font = `620 ${fs}px ${css.getPropertyValue('--font-sans') || 'sans-serif'}`;
        ctx.fillText(a.sym, x, y);
        ctx.restore();
      } else if (opts.showVertices) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = colFaint;
        ctx.fill();
      }
      if (a.openHands > 0) {
        /* one dot per empty hand, so a bare atom cannot be mistaken for a
         * filled one in the skeletal view */
        const taken = a.bonds.map((bd) => {
          const o = bd.a === a.i ? bd.b : bd.a;
          return Math.atan2(atoms[o].y - a.y, atoms[o].x - a.x);
        }).concat(a.hDirs);
        for (let k = 0; k < a.openHands; k++) {
          let best = 0, bestGap = -1;
          for (let q = 0; q < 24; q++) {
            const th = -Math.PI + (q * Math.PI) / 12;
            let gap = Math.PI;
            for (const t of taken) gap = Math.min(gap, Math.abs(ME.render2d.angleDiff(th, t)));
            if (gap > bestGap) { bestGap = gap; best = th; }
          }
          taken.push(best);
          ctx.beginPath();
          ctx.arc(x + Math.cos(best) * fs * 0.85, y + Math.sin(best) * fs * 0.85,
            Math.max(1.2, fs * 0.11), 0, Math.PI * 2);
          ctx.fillStyle = colFaint;
          ctx.fill();
        }
      }
      if (a.charge) {
        ctx.save();
        ctx.fillStyle = a.charge > 0 ? '#d93b32' : '#2f6df6';
        ctx.font = `700 ${fs * 0.72}px ${css.getPropertyValue('--font-sans') || 'sans-serif'}`;
        ctx.fillText((Math.abs(a.charge) > 1 ? Math.abs(a.charge) : '') + (a.charge > 0 ? '+' : '−'),
          x + fs * 0.66, y - fs * 0.58);
        ctx.restore();
      }
    });

    /* --- the bond being dragged right now */
    if (opts.rubber) {
      ctx.save();
      ctx.strokeStyle = colAccent;
      ctx.lineWidth = lw;
      ctx.setLineDash([5, 4]);
      seg(ctx, opts.rubber.x1, opts.rubber.y1, opts.rubber.x2, opts.rubber.y2);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(opts.rubber.x2, opts.rubber.y2, 4, 0, Math.PI * 2);
      ctx.fillStyle = colAccent;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function prepareRingLookup() { return false; }

  function doubleSide(atoms, g, bi, px, py, PX, PY) {
    const b = g.bonds[bi];
    const A = atoms[b.a], B = atoms[b.b];
    const mx = (PX(A) + PX(B)) / 2, my = (PY(A) + PY(B)) / 2;
    const neigh = [];
    g.bonds.forEach((o, oi) => {
      if (oi === bi) return;
      if (o.a === b.a || o.a === b.b) neigh.push(atoms[o.b]);
      else if (o.b === b.a || o.b === b.b) neigh.push(atoms[o.a]);
    });
    if (!neigh.length) return 0;
    let sum = 0;
    neigh.forEach((nb) => { sum += (PX(nb) - mx) * px + (PY(nb) - my) * py; });
    if (Math.abs(sum) < 1e-6) return 0;
    return sum > 0 ? 1 : -1;
  }

  function seg(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawGrid(ctx, view, css) {
    const step = view.scale;
    if (step < 16) return;
    ctx.save();
    ctx.strokeStyle = (css.getPropertyValue('--border') || '#eee').trim();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let x = view.ox % step; x < view.w; x += step) seg(ctx, x, 0, x, view.h);
    for (let y = view.oy % step; y < view.h; y += step) seg(ctx, 0, y, view.w, y);
    ctx.restore();
  }

  /* Hit testing, in model space. */
  function atomAt(g, mx, my, tol) {
    let best = -1, bestD = tol;
    g.atoms.forEach((a, i) => {
      const d = Math.hypot(a.x - mx, a.y - my);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function bondAt(g, mx, my, tol) {
    let best = -1, bestD = tol;
    g.bonds.forEach((b, i) => {
      const A = g.atoms[b.a], B = g.atoms[b.b];
      const d = pointToSegment(mx, my, A.x, A.y, B.x, B.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function pointToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  ME.drawCanvas = { paint, atomAt, bondAt, prepare };
})();
