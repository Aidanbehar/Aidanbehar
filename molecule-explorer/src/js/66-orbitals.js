/* Electron configuration, drawn.
 *
 * Everything here is derived from the electron configuration string that came
 * with the element data, so no shell counts or orbital occupancies are written
 * out by hand. The noble-gas core in a string like "[Ar]4s2 3d6" is expanded by
 * looking up argon's own configuration in the same data and recursing, which
 * means there is no second, hand-typed copy of the cores either.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;
  const svgEl = (t, a) => ME.render2d.svgEl(t, a);

  /* Orbitals per subshell, and therefore electrons per subshell. */
  const ORBITALS = { s: 1, p: 3, d: 5, f: 7 };
  const SUBSHELL_ORDER = { s: 0, p: 1, d: 2, f: 3 };

  /* ------------------------------------------------------------- parsing */
  /* "[Ar]4s2 3d6" -> [{n:1,l:'s',count:2}, ... {n:3,l:'d',count:6}] */
  function expand(cfg, depth) {
    if (!cfg || depth > 8) return { shells: [], predicted: false };
    let predicted = /\((?:predicted|calculated)\)/i.test(cfg);
    let text = cfg.replace(/\((?:predicted|calculated)\)/ig, '').trim();

    let shells = [];
    const core = text.match(/^\[([A-Za-z]+)\]/);
    if (core) {
      const coreEl = ME.chem.element(core[1]);
      if (coreEl && coreEl.cfg) {
        const inner = expand(coreEl.cfg, (depth || 0) + 1);
        shells = inner.shells.slice();
        predicted = predicted || inner.predicted;
      }
      text = text.slice(core[0].length);
    }

    const re = /(\d+)([spdf])(\d+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      shells.push({ n: parseInt(m[1], 10), l: m[2], count: parseInt(m[3], 10) });
    }
    return { shells, predicted };
  }

  /* Reading order: by shell, then s before p before d before f. */
  function sorted(shells) {
    return shells.slice().sort((a, b) => a.n - b.n || SUBSHELL_ORDER[a.l] - SUBSHELL_ORDER[b.l]);
  }

  function analyse(element) {
    const { shells, predicted } = expand(element && element.cfg, 0);
    const list = sorted(shells);
    const total = list.reduce((n, s) => n + s.count, 0);

    /* Electrons per principal shell, for the ring diagram. */
    const perShell = [];
    list.forEach((s) => { perShell[s.n] = (perShell[s.n] || 0) + s.count; });
    const rings = [];
    for (let n = 1; n < perShell.length; n++) if (perShell[n]) rings.push({ n, count: perShell[n] });

    /* The valence shell is the highest one holding s or p electrons. */
    let valenceN = 0;
    list.forEach((s) => { if ((s.l === 's' || s.l === 'p') && s.n > valenceN) valenceN = s.n; });
    const outer = list
      .filter((s) => s.n === valenceN && (s.l === 's' || s.l === 'p'))
      .reduce((n, s) => n + s.count, 0);

    const types = [];
    list.forEach((s) => { if (types.indexOf(s.l) < 0) types.push(s.l); });

    return { list, rings, total, outer, valenceN, types, predicted, matchesZ: total === (element ? element.z : -1) };
  }

  /* ------------------------------------------------- how many bonds it wants */
  /* The valence table the drawing editor validates against is the source of
   * truth wherever it has an entry, so the two can never disagree. Beyond it,
   * the answer is worked out from the outer-shell count, and where the simple
   * rule genuinely does not apply that is what it says. */
  function bonding(element) {
    if (!element) return null;
    const a = analyse(element);
    const rule = ME.chem.VALENCE[element.sym];
    const block = ME.chem.blockKey(element.block);

    if (rule) {
      const hands = rule.hands;
      const extra = rule.allowed.length > 1
        ? ' It can also stretch to ' + rule.allowed.slice(1).join(' or ') + ' by using more of its outer shell, which is why sulfate and phosphate look impossible at first glance.'
        : '';
      if (hands === 0) {
        return {
          headline: 'No bonds', kind: 'none',
          text: 'Its outer shell is already full, so it has nothing to gain by sharing. ' +
            element.name + ' forms almost no compounds at all.' + extra,
        };
      }
      return {
        headline: hands === 1 ? '1 bond' : hands + ' bonds', kind: 'covalent',
        text: 'It has ' + a.outer + ' electrons in its outer shell and room for eight, so it shares ' +
          hands + ' to make up the difference — ' + hands + (hands === 1 ? ' hand' : ' hands') +
          ', ' + hands + ' thing' + (hands === 1 ? '' : 's') + ' to hold.' + extra,
      };
    }

    if (block === 'noble-gas') {
      return { headline: 'No bonds', kind: 'none',
        text: 'A full outer shell, so there is nothing to gain by sharing.' };
    }
    if (block === 'alkali-metal' || block === 'alkaline-earth-metal') {
      const give = a.outer;
      return {
        headline: 'Gives away ' + give, kind: 'gives',
        text: 'With only ' + give + ' electron' + (give === 1 ? '' : 's') +
          ' in its outer shell, it is far easier to hand ' + (give === 1 ? 'it' : 'them') +
          ' over than to collect six or seven more. So it does not really share bonds at all: it becomes a ' +
          element.sym + '<sup>' + give + '+</sup> ion and sits next to something negative.',
        html: true,
      };
    }
    if (block === 'transition-metal' || block === 'lanthanide' || block === 'actinide') {
      return {
        headline: 'It varies', kind: 'varies',
        text: 'The four-hands picture was built for the second row of the table and does not carry over here. ' +
          'A d-block metal has several outer electrons of very similar energy, so it can give up different numbers ' +
          'of them in different compounds' + (element.ox ? ' — for this one, usually ' + element.ox : '') +
          '. This is also why so many of their compounds are coloured.',
      };
    }
    /* Remaining main-group elements: work it out from the outer shell. */
    if (a.outer >= 3 && a.outer <= 7) {
      const wants = 8 - a.outer;
      return {
        headline: wants === 1 ? '1 bond' : wants + ' bonds', kind: 'covalent',
        text: 'It has ' + a.outer + ' electrons in its outer shell and room for eight, so it needs ' +
          wants + ' more and shares ' + wants + ' to get there.',
      };
    }
    return {
      headline: 'It varies', kind: 'varies',
      text: 'This one does not follow the simple outer-shell rule cleanly.' +
        (element.ox ? ' In practice it usually takes charges of ' + element.ox + '.' : ''),
    };
  }

  /* ----------------------------------------------------- the shell diagram */
  /* Concentric rings with the electrons on them: the picture that makes
   * "full outer shell" mean something. */
  function shellDiagram(element, a) {
    const rings = a.rings;
    const size = 190;
    const c = size / 2;
    const maxR = c - 12;
    const step = rings.length ? maxR / rings.length : maxR;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${size} ${size}`, class: 'orb-shells',
      role: 'img', 'aria-label': `${element.name}: ${rings.map((r) => r.count).join(', ')} electrons by shell`,
    });

    /* the nucleus */
    svg.appendChild(svgEl('circle', { cx: c, cy: c, r: 13, fill: 'var(--accent)', opacity: 0.16 }));
    const nuc = svgEl('text', {
      x: c, y: c, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 11, 'font-weight': 700, fill: 'var(--accent-text)',
    });
    nuc.textContent = element.sym;
    svg.appendChild(nuc);

    rings.forEach((ring, i) => {
      const r = step * (i + 1);
      const isOuter = i === rings.length - 1;
      svg.appendChild(svgEl('circle', {
        cx: c, cy: c, r: round(r), fill: 'none',
        stroke: isOuter ? 'var(--accent)' : 'var(--border-strong)',
        'stroke-width': isOuter ? 1.6 : 1,
        'stroke-dasharray': isOuter ? null : '3 3',
      }));
      /* Electrons spread evenly round the ring, starting at the top. */
      for (let k = 0; k < ring.count; k++) {
        const ang = -Math.PI / 2 + (k * 2 * Math.PI) / ring.count;
        svg.appendChild(svgEl('circle', {
          cx: round(c + Math.cos(ang) * r), cy: round(c + Math.sin(ang) * r),
          r: ring.count > 18 ? 1.7 : 2.6,
          fill: isOuter ? 'var(--accent)' : 'var(--text-faint)',
        }));
      }
      const lbl = svgEl('text', {
        x: round(c + r + 2), y: c - 4, 'font-size': 8.5, 'font-weight': 600,
        fill: isOuter ? 'var(--accent-text)' : 'var(--text-faint)',
      });
      lbl.textContent = String(ring.count);
      svg.appendChild(lbl);
    });
    return svg;
  }

  /* --------------------------------------------------- the orbital diagram */
  /* Boxes and arrows: one box per orbital, filled singly before any pairing,
   * which is how electrons actually arrange themselves. */
  function orbitalBoxes(a) {
    const box = el('div', { class: 'orb-boxes' });
    a.list.forEach((s) => {
      const row = el('div', { class: 'orb-row' });
      row.appendChild(el('span', { class: 'orb-label' }, [
        String(s.n), el('i', { text: s.l }),
      ]));
      const cells = el('div', { class: 'orb-cells' });
      const slots = ORBITALS[s.l];
      /* one electron in each orbital first, then pair them up */
      const singles = Math.min(s.count, slots);
      const pairs = Math.max(0, s.count - slots);
      for (let k = 0; k < slots; k++) {
        const cell = el('span', { class: 'orb-cell' });
        if (k < singles) cell.appendChild(el('span', { class: 'orb-up', text: '↑' }));
        if (k < pairs) cell.appendChild(el('span', { class: 'orb-down', text: '↓' }));
        cells.appendChild(cell);
      }
      row.appendChild(cells);
      row.appendChild(el('span', { class: 'orb-count', text: s.count + (s.count === 1 ? ' electron' : ' electrons') }));
      box.appendChild(row);
    });
    return box;
  }

  /* ------------------------------------------------ the 3D orbital shapes */
  /* A small, genuinely three-dimensional view: lobe directions are real 3D
   * vectors, rotated and projected on every frame, and sorted back to front so
   * the ones pointing away are drawn behind. Drag it to turn it round. */
  const SHAPES = {
    s: { lobes: [], sphere: true, name: 's orbital', note: 'A sphere. It looks the same from every direction, so on its own it gives a molecule no particular shape.' },
    p: {
      lobes: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
      groups: [0, 0, 1, 1, 2, 2],
      name: 'p orbitals', note: 'Three dumbbells at right angles to one another. This is where molecular shape comes from — bonds follow the directions the orbitals point in.',
    },
    d: {
      lobes: [[1, 1, 0], [-1, -1, 0], [1, -1, 0], [-1, 1, 0], [0, 1, 1], [0, -1, -1], [0, 1, -1], [0, -1, 1]],
      groups: [0, 0, 0, 0, 1, 1, 1, 1],
      name: 'd orbitals', note: 'Five of them, mostly four-lobed cloverleaves pointing between the axes. Transition metals use these, which is why their bonding is so much less tidy.',
    },
    f: { lobes: [], sphere: false, name: 'f orbitals', note: 'Seven of them, with shapes too intricate to be worth drawing here. Only the lanthanides and actinides fill them.' },
  };

  const LOBE_COLORS = ['var(--accent)', '#e0523f', '#3fa06e'];

  function orbitalViewer(type) {
    const shape = SHAPES[type];
    const size = 150;
    const host = el('div', { class: 'orb-3d' });
    const svg = svgEl('svg', {
      viewBox: `0 0 ${size} ${size}`, class: 'orb-3d-svg',
      role: 'img', 'aria-label': shape.name + ' shape, drag to rotate',
    });
    host.appendChild(svg);

    let yaw = 0.6, pitch = -0.45;

    function project(v) {
      /* yaw about the vertical axis, then pitch about the horizontal one */
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const x1 = v[0] * cy + v[2] * sy;
      const z1 = -v[0] * sy + v[2] * cy;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const y1 = v[1] * cp - z1 * sp;
      const z2 = v[1] * sp + z1 * cp;
      return [x1, y1, z2];
    }

    function paint() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const c = size / 2;
      const R = size * 0.34;

      if (!shape.lobes.length) {
        /* a sphere needs no rotating */
        const grad = svgEl('radialGradient', { id: 'orbsph', cx: '35%', cy: '32%', r: '70%' });
        grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': 'var(--accent)', 'stop-opacity': '0.85' }));
        grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': 'var(--accent)', 'stop-opacity': '0.22' }));
        const defs = svgEl('defs', {});
        defs.appendChild(grad);
        svg.appendChild(defs);
        svg.appendChild(svgEl('circle', { cx: c, cy: c, r: R, fill: 'url(#orbsph)', stroke: 'var(--accent)', 'stroke-opacity': '0.5' }));
        if (type === 'f') {
          const t = svgEl('text', { x: c, y: c, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 13, fill: 'var(--text-faint)' });
          t.textContent = 'f';
          svg.appendChild(t);
        }
        return;
      }

      /* axes, for a sense of which way is which */
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((ax) => {
        const p = project(ax);
        svg.appendChild(svgEl('line', {
          x1: round(c - p[0] * R * 1.25), y1: round(c + p[1] * R * 1.25),
          x2: round(c + p[0] * R * 1.25), y2: round(c - p[1] * R * 1.25),
          stroke: 'var(--border-strong)', 'stroke-width': 0.6, 'stroke-dasharray': '2 2',
        }));
      });

      /* back to front, so nearer lobes cover further ones */
      const lobes = shape.lobes.map((v, i) => {
        const len = Math.hypot(v[0], v[1], v[2]) || 1;
        const unit = [v[0] / len, v[1] / len, v[2] / len];
        return { p: project(unit), group: shape.groups[i] };
      }).sort((a2, b2) => a2.p[2] - b2.p[2]);

      lobes.forEach((lobe) => {
        const [px, py, pz] = lobe.p;
        const flat = Math.hypot(px, py);
        /* A lobe pointing at the viewer projects short, so it reads as a disc;
         * one across the view projects long and reads as a dumbbell half. */
        const rx = Math.max(R * 0.28, flat * R * 0.62);
        const ry = R * 0.28;
        const cx = c + px * R * 0.5;
        const cy = c - py * R * 0.5;
        const ang = (Math.atan2(-py, px) * 180) / Math.PI;
        const depth = (pz + 1) / 2;                 /* 0 far, 1 near */
        svg.appendChild(svgEl('ellipse', {
          cx: round(cx), cy: round(cy), rx: round(rx), ry: round(ry),
          transform: `rotate(${round(ang)} ${round(cx)} ${round(cy)})`,
          fill: LOBE_COLORS[lobe.group % LOBE_COLORS.length],
          'fill-opacity': round3(0.25 + depth * 0.45),
          stroke: LOBE_COLORS[lobe.group % LOBE_COLORS.length],
          'stroke-opacity': round3(0.35 + depth * 0.4),
          'stroke-width': 0.8,
        }));
      });

      svg.appendChild(svgEl('circle', { cx: c, cy: c, r: 2.2, fill: 'var(--text-soft)' }));
    }

    /* drag to turn */
    let dragging = false, last = null;
    const down = (ev) => {
      dragging = true;
      last = pt(ev);
      host.setPointerCapture && ev.pointerId !== undefined && host.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    };
    const move = (ev) => {
      if (!dragging) return;
      const p = pt(ev);
      yaw += (p.x - last.x) * 0.012;
      pitch += (p.y - last.y) * 0.012;
      pitch = Math.max(-1.45, Math.min(1.45, pitch));
      last = p;
      paint();
    };
    const up = () => { dragging = false; };
    function pt(ev) {
      const t = ev.touches ? ev.touches[0] : ev;
      return { x: t.clientX, y: t.clientY };
    }
    if (shape.lobes.length) {
      host.addEventListener('pointerdown', down);
      host.addEventListener('pointermove', move);
      host.addEventListener('pointerup', up);
      host.addEventListener('pointercancel', up);
      host.classList.add('draggable');
    }

    paint();
    return host;
  }

  /* One panel per orbital type the element actually holds electrons in. */
  function orbitalShapes(a) {
    const box = el('div', { class: 'orb-shapes' });
    a.types.forEach((t) => {
      const shape = SHAPES[t];
      if (!shape) return;
      const inType = a.list.filter((s) => s.l === t).reduce((n, s) => n + s.count, 0);
      const panel = el('div', { class: 'orb-panel' });
      panel.appendChild(orbitalViewer(t));
      panel.appendChild(el('div', { class: 'orb-panel-name', text: shape.name }));
      panel.appendChild(el('div', { class: 'orb-panel-count', text: inType + ' electron' + (inType === 1 ? '' : 's') }));
      panel.appendChild(el('div', { class: 'orb-panel-note', text: shape.note }));
      box.appendChild(panel);
    });
    return box;
  }

  const round = (v) => Math.round(v * 100) / 100;
  const round3 = (v) => Math.round(v * 1000) / 1000;

  ME.orbitals = { expand, analyse, bonding, shellDiagram, orbitalBoxes, orbitalShapes, ORBITALS };
})();
