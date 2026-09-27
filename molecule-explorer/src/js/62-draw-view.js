/* The Draw view: toolbar, pointer handling, live analysis and recognition. */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;
  const M = () => ME.drawModel;
  const DC = () => ME.drawCanvas;

  const QUICK = ['C', 'H', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I'];
  const RINGS = [
    { n: 3, label: '3' }, { n: 4, label: '4' }, { n: 5, label: '5' },
    { n: 6, label: '6' }, { n: 7, label: '7' }, { n: 8, label: '8' },
  ];

  const S = {
    graph: null,
    history: [], future: [],
    tool: 'atom',
    element: 'C',
    ringSize: 6,
    aromatic: false,
    xray: 0,
    view: { scale: 44, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 },
    hoverAtom: null, hoverBond: null,
    drag: null,
    canvas: null, ctx: null,
    problems: [],
    built: false,
  };

  /* ------------------------------------------------------------- history */
  function snapshot() {
    S.history.push(M().cloneGraph(S.graph));
    if (S.history.length > 80) S.history.shift();
    S.future.length = 0;
  }
  function undo() {
    if (!S.history.length) return;
    S.future.push(M().cloneGraph(S.graph));
    S.graph = S.history.pop();
    refresh();
  }
  function redo() {
    if (!S.future.length) return;
    S.history.push(M().cloneGraph(S.graph));
    S.graph = S.future.pop();
    refresh();
  }

  /* --------------------------------------------------------------- build */
  function build(host) {
    S.graph = M().emptyGraph();

    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Draw' }));
    wrap.appendChild(el('p', { class: 'note', style: { maxWidth: '62ch', marginBottom: '18px' } },
      'Click empty space to drop an atom. Click an atom to grow a chain from it, or drag from one atom to another to bond them. Everything you draw is checked as you go, and if it turns out to be something known you will be told what it is.'));

    const layout = el('div', { class: 'draw-layout' });
    wrap.appendChild(layout);

    const left = el('div');
    left.appendChild(buildToolbar());
    const canvas = el('canvas', { id: 'drawCanvas', 'aria-label': 'Molecule drawing area' });
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d');
    left.appendChild(canvas);

    const xrayRow = el('div', { class: 'xray' });
    const slider = el('input', { type: 'range', min: '0', max: '100', value: '0', 'aria-label': 'X-ray slider on your drawing' });
    slider.addEventListener('input', () => { S.xray = slider.value / 100; slider.style.setProperty('--pct', slider.value + '%'); paint(); });
    xrayRow.appendChild(el('label', { text: 'Skeletal' }));
    xrayRow.appendChild(slider);
    xrayRow.appendChild(el('label', { text: 'Full structure' }));
    left.appendChild(xrayRow);
    layout.appendChild(left);

    layout.appendChild(buildSide());
    host.appendChild(wrap);

    bindPointer(canvas);
    window.addEventListener('resize', ME.debounce(resize, 120));
    resize();
    S.built = true;
    refresh();
  }

  /* ------------------------------------------------------------- toolbar */
  function buildToolbar() {
    const bar = el('div', { class: 'draw-toolbar' });

    QUICK.forEach((sym) => {
      const b = el('button', { class: 'tool el', text: sym, title: ME.chem.elementName(sym) });
      b.dataset.el = sym;
      b.addEventListener('click', () => { S.tool = 'atom'; S.element = sym; syncTools(); });
      bar.appendChild(b);
    });

    const more = el('button', { class: 'tool', title: 'Every other element' }, ['…']);
    more.addEventListener('click', openPeriodicTable);
    bar.appendChild(more);

    bar.appendChild(el('div', { class: 'tool-sep' }));

    [['bond1', '—', 'Single bond'], ['bond2', '=', 'Double bond'], ['bond3', '≡', 'Triple bond']].forEach(([t, glyph, title]) => {
      const b = el('button', { class: 'tool', title, text: glyph });
      b.dataset.tool = t;
      b.addEventListener('click', () => { S.tool = t; syncTools(); });
      bar.appendChild(b);
    });

    bar.appendChild(el('div', { class: 'tool-sep' }));

    RINGS.forEach((r) => {
      /* A bare digit next to the bond glyphs reads as nothing in particular, so
       * each ring button draws its own polygon. */
      const b = el('button', { class: 'tool', title: `${r.n}-membered ring` });
      b.appendChild(ringGlyph(r.n));
      b.dataset.tool = 'ring'; b.dataset.ring = String(r.n);
      b.addEventListener('click', () => { S.tool = 'ring'; S.ringSize = r.n; S.aromatic = false; syncTools(); });
      bar.appendChild(b);
    });
    const benz = el('button', { class: 'tool', title: 'Benzene ring' });
    benz.dataset.tool = 'benzene';
    benz.appendChild(benzeneGlyph());
    benz.addEventListener('click', () => { S.tool = 'ring'; S.ringSize = 6; S.aromatic = true; syncTools(); });
    bar.appendChild(benz);

    bar.appendChild(el('div', { class: 'tool-sep' }));

    [['charge+', '+', 'Add a positive charge'], ['charge-', '−', 'Add a negative charge']].forEach(([t, glyph, title]) => {
      const b = el('button', { class: 'tool', title, text: glyph });
      b.dataset.tool = t;
      b.addEventListener('click', () => { S.tool = t; syncTools(); });
      bar.appendChild(b);
    });

    const erase = el('button', { class: 'tool', title: 'Erase' }, [ME.icon('erase')]);
    erase.dataset.tool = 'erase';
    erase.addEventListener('click', () => { S.tool = 'erase'; syncTools(); });
    bar.appendChild(erase);

    const move = el('button', { class: 'tool', title: 'Move atoms and pan' }, ['✥']);
    move.dataset.tool = 'move';
    move.addEventListener('click', () => { S.tool = 'move'; syncTools(); });
    bar.appendChild(move);

    bar.appendChild(el('div', { class: 'tool-sep' }));

    const u = el('button', { class: 'tool', title: 'Undo' }, [ME.icon('undo')]);
    u.addEventListener('click', undo);
    const r = el('button', { class: 'tool', title: 'Redo' }, [ME.icon('redo')]);
    r.addEventListener('click', redo);
    const clean = el('button', { class: 'tool', title: 'Tidy the layout' }, [ME.icon('wand'), 'Clean up']);
    clean.addEventListener('click', () => { snapshot(); S.graph = M().cleanUp(S.graph); fitView(); refresh(); });
    const clr = el('button', { class: 'tool', title: 'Clear everything' }, [ME.icon('trash')]);
    clr.addEventListener('click', () => {
      if (!S.graph.atoms.length) return;
      snapshot(); S.graph = M().emptyGraph(); refresh();
    });
    [u, r, clean, clr].forEach((b) => bar.appendChild(b));

    S.toolbar = bar;
    setTimeout(syncTools, 0);
    return bar;
  }

  /* A regular polygon with n sides, matching the ring the button inserts. */
  function ringGlyph(n) {
    const svg = ME.render2d.svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' });
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / n;
      pts.push((12 + 9 * Math.cos(a)).toFixed(1) + ',' + (12 + 9 * Math.sin(a)).toFixed(1));
    }
    svg.appendChild(ME.render2d.svgEl('polygon', { points: pts.join(' ') }));
    /* A heptagon and an octagon are hard to tell apart at 17 pixels, so the
     * ring size goes inside the shape. */
    const t = ME.render2d.svgEl('text', {
      x: 12, y: 12, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 11, 'font-weight': 700, fill: 'currentColor', stroke: 'none',
      'font-family': 'inherit',
    });
    t.textContent = String(n);
    svg.appendChild(t);
    svg.setAttribute('width', '17'); svg.setAttribute('height', '17');
    return svg;
  }

  function benzeneGlyph() {
    const svg = ME.render2d.svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' });
    svg.appendChild(ME.render2d.svgEl('polygon', { points: '12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5' }));
    svg.appendChild(ME.render2d.svgEl('circle', { cx: '12', cy: '12', r: '4.4' }));
    svg.setAttribute('width', '17'); svg.setAttribute('height', '17');
    return svg;
  }

  function syncTools() {
    if (!S.toolbar) return;
    ME.$$('.tool', S.toolbar).forEach((b) => {
      let on = false;
      if (b.dataset.el) on = S.tool === 'atom' && S.element === b.dataset.el;
      else if (b.dataset.tool === 'ring') on = S.tool === 'ring' && !S.aromatic && Number(b.dataset.ring) === S.ringSize;
      else if (b.dataset.tool === 'benzene') on = S.tool === 'ring' && S.aromatic;
      else if (b.dataset.tool) on = S.tool === b.dataset.tool;
      b.classList.toggle('on', on);
    });
    if (S.canvas) {
      S.canvas.style.cursor = S.tool === 'move' ? 'grab' : S.tool === 'erase' ? 'not-allowed' : 'crosshair';
    }
  }

  /* ---------------------------------------------------------- side panel */
  function buildSide() {
    const side = el('div', { class: 'draw-side' });

    const info = el('div', { class: 'panel' });
    info.appendChild(el('h4', { text: 'What you have drawn' }));
    S.infoBody = el('div');
    info.appendChild(S.infoBody);
    side.appendChild(info);

    const check = el('div', { class: 'panel' });
    check.appendChild(el('h4', { text: 'Check' }));
    S.checkBody = el('div');
    check.appendChild(S.checkBody);
    side.appendChild(check);

    S.recogBox = el('div');
    side.appendChild(S.recogBox);

    const out = el('div', { class: 'panel' });
    out.appendChild(el('h4', { text: 'Take it with you' }));
    const row = el('div', { style: { display: 'flex', gap: '7px', flexWrap: 'wrap' } });
    const png = el('button', { class: 'btn btn-sm' }, [ME.icon('download'), 'PNG']);
    png.addEventListener('click', exportPNG);
    const svg = el('button', { class: 'btn btn-sm' }, [ME.icon('download'), 'SVG']);
    svg.addEventListener('click', exportSVG);
    const smi = el('button', { class: 'btn btn-sm' }, [ME.icon('copy'), 'Copy SMILES']);
    smi.addEventListener('click', () => {
      const s = currentSmiles();
      if (s) ME.copy(s, 'SMILES'); else ME.toast('Nothing to copy yet');
    });
    [png, svg, smi].forEach((b) => row.appendChild(b));
    out.appendChild(row);
    side.appendChild(out);

    return side;
  }

  /* ------------------------------------------------------------- canvas */
  function resize() {
    const c = S.canvas;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    S.view.w = rect.width; S.view.h = rect.height; S.view.dpr = dpr;
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    if (!S.graph.atoms.length) { S.view.ox = rect.width / 2; S.view.oy = rect.height / 2; }
    paint();
  }

  function fitView() {
    const bb = M().boundingBox(S.graph);
    const w = S.view.w || 600, h = S.view.h || 420;
    const spanX = Math.max(1.5, bb.maxX - bb.minX + 2.2);
    const spanY = Math.max(1.5, bb.maxY - bb.minY + 2.2);
    S.view.scale = Math.max(20, Math.min(62, Math.min(w / spanX, h / spanY)));
    S.view.ox = w / 2 - ((bb.minX + bb.maxX) / 2) * S.view.scale;
    S.view.oy = h / 2 - ((bb.minY + bb.maxY) / 2) * S.view.scale;
  }

  const toModel = (px, py) => ({ x: (px - S.view.ox) / S.view.scale, y: (py - S.view.oy) / S.view.scale });
  const toPx = (mx, my) => ({ x: mx * S.view.scale + S.view.ox, y: my * S.view.scale + S.view.oy });

  function paint() {
    if (!S.ctx) return;
    DC().paint(S.ctx, S.graph, S.view, {
      xray: S.xray, problems: S.problems,
      hoverAtom: S.hoverAtom, hoverBond: S.hoverBond,
      rubber: S.drag && S.drag.rubber ? S.drag.rubber : null,
      showVertices: S.graph.atoms.length > 0,
    });
  }

  /* -------------------------------------------------------- interaction */
  function bindPointer(canvas) {
    let pointerId = null;

    canvas.addEventListener('pointerdown', (ev) => {
      if (pointerId !== null) return;
      pointerId = ev.pointerId;
      canvas.setPointerCapture(pointerId);
      ev.preventDefault();
      onDown(local(ev));
    });
    canvas.addEventListener('pointermove', (ev) => {
      const p = local(ev);
      if (pointerId === ev.pointerId && S.drag) onMove(p);
      else onHover(p);
    });
    const end = (ev) => {
      if (pointerId !== ev.pointerId) return;
      try { canvas.releasePointerCapture(pointerId); } catch (e) { /* already gone */ }
      pointerId = null;
      onUp(local(ev));
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', () => { S.hoverAtom = S.hoverBond = null; ME.hideTip(); paint(); });

    canvas.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const p = local(ev);
      const before = toModel(p.x, p.y);
      const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
      S.view.scale = Math.max(16, Math.min(90, S.view.scale * factor));
      const after = toModel(p.x, p.y);
      S.view.ox += (after.x - before.x) * S.view.scale;
      S.view.oy += (after.y - before.y) * S.view.scale;
      paint();
    }, { passive: false });

    function local(ev) {
      const r = canvas.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top, clientX: ev.clientX, clientY: ev.clientY };
    }
  }

  const HIT = 0.42;     /* how close a click counts as hitting an atom */
  const SNAP_TO = 0.66; /* how close a drag has to end to bond to an atom */

  function onHover(p) {
    const m = toModel(p.x, p.y);
    const a = DC().atomAt(S.graph, m.x, m.y, HIT);
    const b = a < 0 ? DC().bondAt(S.graph, m.x, m.y, 0.3) : -1;
    if (a !== S.hoverAtom || b !== S.hoverBond) {
      S.hoverAtom = a >= 0 ? a : null;
      S.hoverBond = b >= 0 ? b : null;
      paint();
    }
    if (a >= 0) {
      const at = S.graph.atoms[a];
      const h = M().implicitH(S.graph, a);
      let txt = ME.chem.elementName(at.sym);
      if (at.charge) txt += `, charge ${at.charge > 0 ? '+' + at.charge : at.charge}`;
      txt += h > 0
        ? `, with ${h} ${at.sym === 'C' ? 'hidden ' : ''}hydrogen${h === 1 ? '' : 's'}.`
        : ', with no room left for hydrogens.';
      ME.showTip(txt, p.clientX, p.clientY - 6);
    } else ME.hideTip();
  }

  function onDown(p) {
    const m = toModel(p.x, p.y);
    const ai = DC().atomAt(S.graph, m.x, m.y, HIT);
    const bi = ai < 0 ? DC().bondAt(S.graph, m.x, m.y, 0.3) : -1;

    if (S.tool === 'erase') {
      if (ai >= 0) { snapshot(); M().removeAtom(S.graph, ai); refresh(); }
      else if (bi >= 0) { snapshot(); S.graph.bonds.splice(bi, 1); refresh(); }
      return;
    }
    if (S.tool === 'charge+' || S.tool === 'charge-') {
      if (ai >= 0) {
        snapshot();
        S.graph.atoms[ai].charge = (S.graph.atoms[ai].charge || 0) + (S.tool === 'charge+' ? 1 : -1);
        refresh();
      }
      return;
    }
    if (S.tool === 'ring') {
      snapshot();
      if (bi >= 0) M().fuseRing(S.graph, bi, S.ringSize, S.aromatic);
      else if (ai >= 0) attachRingAtAtom(ai);
      else {
        const spot = M().separate(S.graph, m.x, m.y, -1);
        M().addRing(S.graph, S.ringSize, spot.x, spot.y, S.aromatic);
      }
      refresh();
      return;
    }
    if (S.tool === 'move') {
      if (ai >= 0) S.drag = { kind: 'moveAtom', atom: ai, start: m, snapshotTaken: false };
      else S.drag = { kind: 'pan', startPx: p, startOx: S.view.ox, startOy: S.view.oy };
      return;
    }

    /* atom and bond tools both start a possible drag from an atom */
    const order = S.tool === 'bond2' ? 2 : S.tool === 'bond3' ? 3 : 1;

    if (ai >= 0) {
      S.drag = { kind: 'bondFrom', atom: ai, order, moved: false, rubber: null, downAt: m };
      return;
    }
    if (bi >= 0) {
      snapshot();
      if (S.tool === 'atom') {
        /* cycling the order here is the quickest way to make a double bond */
        S.graph.bonds[bi].order = S.graph.bonds[bi].order % 3 + 1;
      } else {
        S.graph.bonds[bi].order = order;
      }
      refresh();
      return;
    }
    /* empty space */
    snapshot();
    /* A click just outside an atom's hit area would otherwise drop a new atom
     * half inside it. Push it out to a readable distance first. */
    const spot = M().separate(S.graph, snapCoord(m.x), snapCoord(m.y), -1);
    const idx = M().addAtom(S.graph, spot.x, spot.y, S.tool === 'atom' ? S.element : 'C');
    if (S.graph.atoms.length === 1) fitViewSoft();
    refresh();
    S.drag = { kind: 'bondFrom', atom: idx, order, moved: false, rubber: null, downAt: m, fresh: true };
  }

  function snapCoord(v) { return Math.round(v * 4) / 4; }

  function onMove(p) {
    const m = toModel(p.x, p.y);
    if (!S.drag) return;
    if (S.drag.kind === 'pan') {
      S.view.ox = S.drag.startOx + (p.x - S.drag.startPx.x);
      S.view.oy = S.drag.startOy + (p.y - S.drag.startPx.y);
      paint();
      return;
    }
    if (S.drag.kind === 'moveAtom') {
      if (!S.drag.snapshotTaken) { snapshot(); S.drag.snapshotTaken = true; }
      const a = S.graph.atoms[S.drag.atom];
      a.x = m.x; a.y = m.y;
      S.drag.overlapping = M().nearestAtom(S.graph, m.x, m.y, S.drag.atom).distance < M().MIN_SEP;
      paint();
      return;
    }
    if (S.drag.kind === 'bondFrom') {
      const from = S.graph.atoms[S.drag.atom];
      const dist = Math.hypot(m.x - from.x, m.y - from.y);
      if (dist > 0.25) S.drag.moved = true;
      /* A generous snap radius here: releasing near an atom means "bond to
       * that one", which is almost always what was meant, and it stops a new
       * atom being created on top of it. */
      const target = DC().atomAt(S.graph, m.x, m.y, SNAP_TO);
      if (target >= 0 && target !== S.drag.atom) {
        const t = S.graph.atoms[target];
        S.drag.rubber = Object.assign(toPx(from.x, from.y), {});
        const a = toPx(from.x, from.y), b = toPx(t.x, t.y);
        S.drag.rubber = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
        S.drag.over = target;
      } else {
        S.drag.over = -1;
        const ang = M().snapAngle(Math.atan2(m.y - from.y, m.x - from.x));
        const len = Math.max(0.7, Math.min(1.35, dist));
        const tx = from.x + Math.cos(ang) * len, ty = from.y + Math.sin(ang) * len;
        const a = toPx(from.x, from.y), b = toPx(tx, ty);
        S.drag.rubber = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
        S.drag.target = { x: tx, y: ty };
      }
      paint();
    }
  }

  function onUp(p) {
    const d = S.drag;
    S.drag = null;
    if (!d) return;
    if (d.kind === 'pan') return;
    if (d.kind === 'moveAtom') {
      /* Let go on top of another atom and it slides clear rather than hiding
       * inside it. */
      const a = S.graph.atoms[d.atom];
      if (a) {
        const spot = M().separate(S.graph, a.x, a.y, d.atom);
        a.x = spot.x; a.y = spot.y;
      }
      refresh();
      return;
    }
    if (d.kind !== 'bondFrom') return;

    const from = S.graph.atoms[d.atom];
    if (!from) { paint(); return; }

    if (!d.moved) {
      if (d.fresh) { paint(); return; }
      /* A plain click on an atom: change its element, or if it already is that
       * element, grow the chain by one. */
      if (S.tool === 'atom' && from.sym !== S.element) {
        snapshot();
        from.sym = S.element;
        refresh();
        return;
      }
      snapshot();
      const ang = M().suggestAngle(S.graph, d.atom);
      const ni = M().addAtom(S.graph, from.x + Math.cos(ang), from.y + Math.sin(ang),
        S.tool === 'atom' ? S.element : 'C');
      M().addBond(S.graph, d.atom, ni, d.order);
      refresh();
      return;
    }

    snapshot();
    if (d.over >= 0) {
      M().addBond(S.graph, d.atom, d.over, d.order);
    } else if (d.target) {
      const spot = M().separate(S.graph, d.target.x, d.target.y, -1);
      const ni = M().addAtom(S.graph, spot.x, spot.y, S.tool === 'atom' ? S.element : 'C');
      M().addBond(S.graph, d.atom, ni, d.order);
    }
    refresh();
  }

  function attachRingAtAtom(ai) {
    const a = S.graph.atoms[ai];
    const ang = M().suggestAngle(S.graph, ai);
    const n = S.ringSize;
    const apothem = 0.5 / Math.tan(Math.PI / n);
    const rad = 0.5 / Math.sin(Math.PI / n);
    const cx = a.x + Math.cos(ang) * rad, cy = a.y + Math.sin(ang) * rad;
    const start = Math.atan2(a.y - cy, a.x - cx);
    const pts = M().ringPoints(n, cx, cy, start);
    const idx = [ai];
    for (let k = 1; k < n; k++) idx.push(M().addAtom(S.graph, pts[k].x, pts[k].y, 'C'));
    for (let k = 0; k < n; k++) {
      M().addBond(S.graph, idx[k], idx[(k + 1) % n], S.aromatic && k % 2 === 1 ? 2 : 1);
    }
    void apothem;
  }

  function fitViewSoft() {
    if (S.graph.atoms.length <= 1) return;
    fitView();
  }

  /* ------------------------------------------------------------- refresh */
  function refresh() {
    paint();
    updateAnalysis();
  }

  function currentMolecule() {
    if (!S.graph.atoms.length) return null;
    try { return M().toMolecule(S.graph); } catch (e) { return null; }
  }
  function currentSmiles() {
    const mol = currentMolecule();
    if (!mol) return null;
    try { return mol.toSmiles(); } catch (e) { return null; }
  }

  const updateAnalysis = ME.debounce(() => {
    if (!S.built) return;
    const g = S.graph;

    /* --- validation, straight off the editor graph so a broken drawing still
     * gets a sensible explanation --- */
    const atoms = g.atoms.map((a, i) => ({ sym: a.sym, charge: a.charge || 0, explicitH: 0 }));
    const bonds = g.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order }));
    S.problems = ME.chem.validateGraph(atoms, bonds);
    paint();

    ME.clear(S.checkBody);
    if (!g.atoms.length) {
      S.checkBody.appendChild(el('p', { class: 'note', text: 'Nothing drawn yet.' }));
    } else if (!S.problems.length) {
      S.checkBody.appendChild(el('div', { class: 'vmsg ok' }, [
        el('div', {}, [el('b', { text: 'This all holds together.' }),
          'Every atom has a sensible number of bonds.']),
      ]));
    } else {
      S.problems.forEach((p) => {
        S.checkBody.appendChild(el('div', { class: 'vmsg ' + (p.level === 'error' ? 'err' : 'warn') }, [
          el('div', {}, [el('b', { text: p.title }), p.text]),
        ]));
      });
    }

    /* --- live figures --- */
    ME.clear(S.infoBody);
    const mol = currentMolecule();
    if (!mol) {
      S.infoBody.appendChild(el('p', { class: 'note', text: 'Draw something and the formula, mass and SMILES will appear here.' }));
      ME.clear(S.recogBox);
      return;
    }
    let a;
    try { a = ME.chem.analyse(mol); } catch (e) { a = null; }
    if (a) {
      S.infoBody.appendChild(kv('Formula', ME.formulaHTML(a.formula), true));
      S.infoBody.appendChild(kv('Molar mass', a.mass.toFixed(2) + ' g/mol'));
      let hidden = 0;
      for (let i = 0; i < g.atoms.length; i++) hidden += M().implicitH(g, i);
      S.infoBody.appendChild(kv('Hidden hydrogens', String(hidden)));
      S.infoBody.appendChild(kv('Atoms drawn', String(g.atoms.length)));
      if (a.smiles) {
        const row = el('div', { class: 'code-row', style: { marginTop: '10px' } });
        row.appendChild(el('code', { text: a.smiles }));
        const cp = el('button', { class: 'btn btn-sm' }, [ME.icon('copy')]);
        cp.addEventListener('click', () => ME.copy(a.smiles, 'SMILES'));
        row.appendChild(cp);
        S.infoBody.appendChild(row);
      }
    }

    /* --- is it something we know? --- */
    ME.clear(S.recogBox);
    if (S.problems.length) return;
    const hit = ME.search.recognise(mol);
    if (hit) {
      const box = el('div', { class: 'recog' });
      box.appendChild(el('div', {}, [
        el('div', { class: 'big', text: 'You drew ' + hit.n + '!' }),
        el('div', { class: 'note', text: hit.x || '' }),
      ]));
      const b = el('button', { class: 'btn btn-sm btn-primary', style: { marginLeft: 'auto' } }, ['Open']);
      b.addEventListener('click', () => ME.router.goMolecule(hit));
      box.appendChild(b);
      S.recogBox.appendChild(box);
    } else if (g.atoms.length > 1 && ME.pubchem.online()) {
      lookupOnline(mol);
    }
  }, 140);

  let onlineToken = 0;
  function lookupOnline(mol) {
    const token = ++onlineToken;
    let smiles;
    try { smiles = mol.toSmiles(); } catch (e) { return; }
    const panel = el('div', { class: 'panel', style: { display: 'flex', alignItems: 'center', gap: '9px' } }, [
      el('span', { class: 'spin' }), el('span', { class: 'note', text: 'Checking PubChem…' }),
    ]);
    S.recogBox.appendChild(panel);
    ME.pubchem.lookup(smiles, { smiles: true })
      .then((rec) => {
        if (token !== onlineToken) return;
        ME.clear(S.recogBox);
        const box = el('div', { class: 'recog' });
        box.appendChild(el('div', {}, [
          el('div', { class: 'big', text: 'You drew ' + rec.n + '!' }),
          el('div', { class: 'note', text: 'Found in PubChem, not in the built-in set.' }),
        ]));
        const b = el('button', { class: 'btn btn-sm btn-primary', style: { marginLeft: 'auto' } }, ['Open']);
        b.addEventListener('click', () => ME.router.goMolecule(rec));
        box.appendChild(b);
        S.recogBox.appendChild(box);
      })
      .catch(() => { if (token === onlineToken) ME.clear(S.recogBox); });
  }

  function kv(k, v, isHtml) {
    const row = el('div', { class: 'kv' });
    row.appendChild(el('span', { class: 'k', text: k }));
    row.appendChild(el('span', isHtml ? { class: 'v', html: v } : { class: 'v', text: v }));
    return row;
  }

  /* -------------------------------------------------------------- export */
  function exportPNG() {
    if (!S.graph.atoms.length) { ME.toast('Nothing to export yet'); return; }
    /* Re-draw at a fitted view and higher resolution rather than copying the
     * on-screen canvas, so the file is not cropped by whatever you scrolled to. */
    const bb = M().boundingBox(S.graph);
    const scale = 70;
    const padUnits = 1.2;
    const w = Math.ceil((bb.maxX - bb.minX + padUnits * 2) * scale);
    const h = Math.ceil((bb.maxY - bb.minY + padUnits * 2) * scale);
    const c = document.createElement('canvas');
    const dpr = 2;
    c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--surface').trim() || '#fff';
    ctx.fillRect(0, 0, w, h);
    DC().paint(ctx, S.graph, {
      scale, ox: -bb.minX * scale + padUnits * scale, oy: -bb.minY * scale + padUnits * scale,
      w, h, dpr,
    }, { xray: S.xray });
    c.toBlob((blob) => {
      if (blob) ME.download('molecule.png', blob);
      else ME.toast('Could not create the image');
    }, 'image/png');
  }

  function exportSVG() {
    const mol = currentMolecule();
    if (!mol) { ME.toast('Nothing to export yet'); return; }
    const svg = ME.render2d.render(mol, { xray: S.xray, width: 600, height: 450, interactive: false });
    ME.download('molecule.svg', ME.render2d.toStandaloneSVG(svg), 'image/svg+xml');
  }

  /* ----------------------------------------------------- periodic table */
  function ptPosition(z) {
    if (z === 1) return [1, 1];
    if (z === 2) return [1, 18];
    if (z <= 10) return [2, z <= 4 ? z - 2 : z + 8];
    if (z <= 18) return [3, z <= 12 ? z - 10 : z];
    if (z <= 36) return [4, z - 18];
    if (z <= 54) return [5, z - 36];
    if (z <= 56) return [6, z - 54];
    if (z <= 71) return [9, z - 57 + 3];
    if (z <= 86) return [6, z - 72 + 4];
    if (z <= 88) return [7, z - 86];
    if (z <= 103) return [10, z - 89 + 3];
    return [7, z - 104 + 4];
  }

  function ptFamily(z) {
    if ([2, 10, 18, 36, 54, 86, 118].indexOf(z) >= 0) return 'noble';
    if ([9, 17, 35, 53, 85, 117].indexOf(z) >= 0) return 'halogen';
    if ([1, 6, 7, 8, 15, 16, 34].indexOf(z) >= 0) return 'nonmetal';
    if ([5, 14, 32, 33, 51, 52, 84].indexOf(z) >= 0) return 'metalloid';
    if ([3, 11, 19, 37, 55, 87].indexOf(z) >= 0) return 'alkali';
    if ([4, 12, 20, 38, 56, 88].indexOf(z) >= 0) return 'alkaline';
    if (z >= 57 && z <= 71) return 'lanth';
    if (z >= 89 && z <= 103) return 'act';
    return 'metal';
  }

  let ptModal = null;
  function openPeriodicTable() {
    if (!ptModal) ptModal = buildPeriodicTable();
    ptModal.classList.add('open');
  }

  function buildPeriodicTable() {
    const back = el('div', { class: 'ptable-backdrop' });
    const modal = el('div', { class: 'ptable-modal' });
    back.appendChild(modal);

    const head = el('h3');
    head.appendChild(document.createTextNode('Pick any element'));
    const close = el('button', { class: 'icon-btn', style: { marginLeft: 'auto' }, 'aria-label': 'Close' }, [ME.icon('x')]);
    close.addEventListener('click', () => back.classList.remove('open'));
    head.style.display = 'flex';
    head.appendChild(close);
    modal.appendChild(head);
    modal.appendChild(el('p', { class: 'note', style: { marginBottom: '0' } },
      'The organic ones are in the toolbar because they do most of the work, but nothing stops you using the rest.'));

    const grid = el('div', { class: 'ptable' });
    const cells = {};
    ME.chem.elements.forEach(([z, sym]) => {
      const [row, col] = ptPosition(z);
      const b = el('button', {
        class: 'pt-cell', title: `${ME.chem.elementName(sym)} (${z})`,
        style: { gridRow: String(row), gridColumn: String(col) },
      });
      b.dataset.fam = ptFamily(z);
      b.appendChild(el('span', { class: 'z', text: String(z) }));
      b.appendChild(el('span', { text: sym }));
      b.addEventListener('click', () => {
        S.tool = 'atom'; S.element = sym;
        syncTools();
        back.classList.remove('open');
        ME.toast(ME.chem.elementName(sym) + ' selected');
      });
      cells[z] = b;
      grid.appendChild(b);
    });
    modal.appendChild(grid);
    back.addEventListener('click', (ev) => { if (ev.target === back) back.classList.remove('open'); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') back.classList.remove('open'); });
    document.body.appendChild(back);
    return back;
  }

  /* --------------------------------------------------------------- entry */
  function loadMolfile(mf) {
    try {
      const mol = ME.chem.fromMolfile(mf);
      snapshot();
      S.graph = M().fromMolecule(mol);
      fitView();
      refresh();
      return true;
    } catch (e) { return false; }
  }

  function ensureBuilt(host) { if (!S.built) build(host); }

  ME.draw = {
    ensureBuilt, loadMolfile, refresh, resize,
    get graph() { return S.graph; },
    setGraph(g) { snapshot(); S.graph = g; fitView(); refresh(); },
  };
})();
