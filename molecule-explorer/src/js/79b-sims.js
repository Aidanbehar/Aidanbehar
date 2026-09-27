/* Interactive simulations for the lessons.
 *
 * Each one returns a self-contained DOM node a lesson can drop in, and each
 * one is built so the reader can break it: push the temperature up until the
 * solid melts, add protons until the element changes, drop enough acid in to
 * shoot past the endpoint. Being able to overshoot is most of what makes a
 * simulation teach rather than illustrate.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  function shell(title, hint, body) {
    const box = el('div', { class: 'sim' });
    const head = el('div', { class: 'sim-head' });
    head.appendChild(el('div', { class: 'sim-title', text: title }));
    if (hint) head.appendChild(el('div', { class: 'sim-hint', text: hint }));
    box.appendChild(head);
    const inner = el('div', { class: 'sim-body' });
    inner.appendChild(body);
    box.appendChild(inner);
    return box;
  }

  function slider(label, min, max, value, step, onInput, format) {
    const wrap = el('div', { class: 'sim-control' });
    wrap.appendChild(el('label', { text: label }));
    const input = el('input', { type: 'range', min: String(min), max: String(max),
      value: String(value), step: String(step || 1), 'aria-label': label });
    const out = el('span', { class: 'sim-val' });
    const sync = () => { out.textContent = (format ? format(Number(input.value)) : input.value); };
    input.addEventListener('input', () => { sync(); onInput(Number(input.value)); });
    wrap.appendChild(input);
    wrap.appendChild(out);
    sync();
    return { node: wrap, input: input, sync: sync };
  }

  const css = (name, fallback) =>
    getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;

  /* Every simulation runs only while it is on screen. A lesson can have
   * several, and three animation loops on a page nobody is looking at is just
   * a flat battery. */
  function whenVisible(node, start, stop) {
    if (!('IntersectionObserver' in window)) { start(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) start(); else stop(); });
    }, { rootMargin: '80px' });
    io.observe(node);
  }

  /* ==================================================== states of matter */
  /* One temperature slider, and the particles behave like a solid, a liquid or
   * a gas depending on where it is. The point is that nothing changes except
   * how fast they are moving. */
  function statesOfMatter(opts) {
    const o = opts || {};
    const canvas = el('canvas', { width: '680', height: '300' });
    const body = el('div');
    body.appendChild(canvas);
    const readout = el('div', { class: 'sim-readout' });
    body.appendChild(readout);
    const note = el('div', { class: 'sim-note' });
    body.appendChild(note);

    let T = o.start === undefined ? 120 : o.start;      /* an arbitrary 0-500 scale */
    const N = 84;
    const parts = [];
    const cols = 14, rows = 6;
    for (let i = 0; i < N; i++) {
      parts.push({
        hx: (i % cols + 0.5) / cols, hy: (Math.floor(i / cols) + 0.5) / rows,  /* home, for the solid */
        x: 0, y: 0, vx: 0, vy: 0,
      });
    }
    parts.forEach((q) => { q.x = q.hx; q.y = 0.45 + q.hy * 0.5; q.vx = (Math.random() - 0.5) * 0.004; q.vy = (Math.random() - 0.5) * 0.004; });

    const control = slider('Temperature', 0, 500, T, 1, (v) => { T = v; describe(); }, (v) => v + ' K');
    body.appendChild(el('div', { class: 'sim-controls' }, [control.node]));

    function phase() { return T < 150 ? 'solid' : T < 330 ? 'liquid' : 'gas'; }

    function describe() {
      const ph = phase();
      ME.clear(readout);
      readout.appendChild(el('span', {}, ['State: ', el('b', { text: ph })]));
      readout.appendChild(el('span', {}, ['Particle speed: ', el('b', { text: (T / 100).toFixed(2) + ' ×' })]));
      note.textContent = {
        solid: 'Cold. The particles have so little energy that they cannot escape their neighbours — they can only vibrate about a fixed spot. That fixed arrangement is why a solid holds its shape, and the vibration is why it still has a temperature at all.',
        liquid: 'Warmer. Now they have enough energy to slide past each other but not enough to escape altogether, so they stay touching while the arrangement keeps changing. That is why a liquid keeps its volume but takes the shape of its container.',
        gas: 'Hot. They have enough energy to break away completely and spend most of their time nowhere near anything else. That is why a gas fills whatever you put it in, and why it can be squashed — nearly all of its volume is empty space.',
      }[ph];
    }

    function step() {
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = css('--surface-2', '#f6f7fa');
      ctx.fillRect(0, 0, W, H);

      const ph = phase();
      const speed = T / 26000;
      const accent = css('--accent', '#2f6df6');

      parts.forEach((q) => {
        if (ph === 'solid') {
          /* pulled hard back to a lattice site, so it can only wobble */
          const jitter = T / 30000;
          q.x += (q.hx - q.x) * 0.22 + (Math.random() - 0.5) * jitter;
          q.y += (0.45 + q.hy * 0.5 - q.y) * 0.22 + (Math.random() - 0.5) * jitter;
        } else if (ph === 'liquid') {
          /* free to move, but gravity keeps it pooled in the bottom half */
          q.vx += (Math.random() - 0.5) * speed * 0.6;
          q.vy += (Math.random() - 0.5) * speed * 0.6 + 0.00022;
          q.vx *= 0.97; q.vy *= 0.97;
          q.x += q.vx; q.y += q.vy;
          if (q.y > 0.97) { q.y = 0.97; q.vy = -Math.abs(q.vy) * 0.35; }
          if (q.y < 0.38) { q.vy += 0.0004; }
        } else {
          q.vx += (Math.random() - 0.5) * speed * 0.35;
          q.vy += (Math.random() - 0.5) * speed * 0.35;
          const sp = Math.hypot(q.vx, q.vy) || 1;
          const want = speed * 2.4;
          q.vx = (q.vx / sp) * want; q.vy = (q.vy / sp) * want;
          q.x += q.vx; q.y += q.vy;
        }
        if (q.x < 0.02) { q.x = 0.02; q.vx = Math.abs(q.vx); }
        if (q.x > 0.98) { q.x = 0.98; q.vx = -Math.abs(q.vx); }
        if (q.y < 0.03) { q.y = 0.03; q.vy = Math.abs(q.vy); }
        if (q.y > 0.97) { q.y = 0.97; q.vy = -Math.abs(q.vy); }

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(q.x * W, q.y * H, 6.5, 0, Math.PI * 2);
        ctx.fill();
      });

      /* the container, drawn only where it matters */
      ctx.strokeStyle = css('--border-strong', '#cbd1dc');
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);

      if (running) raf = requestAnimationFrame(step);
    }

    let running = false, raf = null;
    const node = shell(o.title || 'Solid, liquid, gas — one slider',
      'Drag the temperature. Nothing else changes: same particles, same number of them.', body);
    whenVisible(node, () => { if (!running) { running = true; raf = requestAnimationFrame(step); } },
      () => { running = false; if (raf) cancelAnimationFrame(raf); });
    describe();
    return node;
  }

  /* ================================================ heating curve, live */
  /* Energy in on the x axis, temperature on the y, and the two flat stretches
   * where the temperature refuses to move. */
  function heatingCurve() {
    const canvas = el('canvas', { width: '680', height: '320' });
    const body = el('div');
    body.appendChild(canvas);
    const readout = el('div', { class: 'sim-readout' });
    const note = el('div', { class: 'sim-note' });
    body.appendChild(readout);
    body.appendChild(note);

    /* One gram of water, in joules. Numbers from the verified reference data. */
    const R = ME.ref;
    const cIce = R.SPECIFIC_HEAT.values['water (ice)'];
    const cWater = R.SPECIFIC_HEAT.values['water (liquid)'];
    const cSteam = R.SPECIFIC_HEAT.values['water (steam)'];
    const fus = R.LATENT.fusion, vap = R.LATENT.vaporisation;

    /* the five stages, each as (energy needed, what happens) */
    const stages = [
      { e: cIce * 20, from: -20, to: 0, kind: 'warming ice' },
      { e: fus, from: 0, to: 0, kind: 'melting' },
      { e: cWater * 100, from: 0, to: 100, kind: 'warming water' },
      { e: vap, from: 100, to: 100, kind: 'boiling' },
      { e: cSteam * 50, from: 100, to: 150, kind: 'warming steam' },
    ];
    const totalE = stages.reduce((n, s) => n + s.e, 0);

    function tempAt(energy) {
      let acc = 0;
      for (const s of stages) {
        if (energy <= acc + s.e) {
          const frac = s.e ? (energy - acc) / s.e : 0;
          return { T: s.from + (s.to - s.from) * frac, stage: s };
        }
        acc += s.e;
      }
      return { T: 150, stage: stages[stages.length - 1] };
    }

    let energy = 0;
    const control = slider('Energy added', 0, Math.round(totalE), 0, 1,
      (v) => { energy = v; draw(); }, (v) => Math.round(v) + ' J');
    body.appendChild(el('div', { class: 'sim-controls' }, [control.node]));

    function draw() {
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height, pad = 42;
      ctx.clearRect(0, 0, W, H);
      const X = (e) => pad + (e / totalE) * (W - pad - 14);
      const Y = (t) => H - pad - ((t + 25) / 180) * (H - pad - 16);

      ctx.strokeStyle = css('--border', '#e2e5ec');
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, 8); ctx.lineTo(pad, H - pad); ctx.lineTo(W - 8, H - pad); ctx.stroke();

      /* 0 and 100 marked, because those are where the flats are */
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = css('--text-faint', '#888');
      [0, 100].forEach((t) => {
        ctx.beginPath(); ctx.moveTo(pad, Y(t)); ctx.lineTo(W - 8, Y(t)); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.fillStyle = css('--text-faint', '#888');
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('100 °C', pad - 5, Y(100) + 4);
      ctx.fillText('0 °C', pad - 5, Y(0) + 4);
      ctx.textAlign = 'center';
      ctx.fillText('energy in →', (W + pad) / 2, H - 12);

      /* the whole curve, faint, then the part travelled so far, solid */
      const plot = (upto, colour, width) => {
        ctx.strokeStyle = colour; ctx.lineWidth = width;
        ctx.beginPath();
        let acc = 0, started = false;
        stages.forEach((s) => {
          const a = acc, bEnd = acc + s.e;
          const from = Math.min(bEnd, upto), seg = Math.max(0, from - a);
          if (seg <= 0) { acc = bEnd; return; }
          const t0 = s.from, t1 = s.from + (s.to - s.from) * (seg / s.e);
          if (!started) { ctx.moveTo(X(a), Y(t0)); started = true; }
          ctx.lineTo(X(a + seg), Y(t1));
          acc = bEnd;
        });
        ctx.stroke();
      };
      plot(totalE, css('--border-strong', '#cbd1dc'), 2);
      plot(energy, css('--accent', '#2f6df6'), 3);

      const now = tempAt(energy);
      ctx.fillStyle = css('--accent', '#2f6df6');
      ctx.beginPath(); ctx.arc(X(energy), Y(now.T), 5, 0, Math.PI * 2); ctx.fill();

      ME.clear(readout);
      readout.appendChild(el('span', {}, ['Temperature: ', el('b', { text: now.T.toFixed(1) + ' °C' })]));
      readout.appendChild(el('span', {}, ['Doing: ', el('b', { text: now.stage.kind })]));
      note.textContent = now.stage.from === now.stage.to
        ? 'The temperature has stopped, and energy is still going in. It is not being wasted — it is going into pulling the particles away from each other instead of speeding them up. Until every last one has broken free, the temperature cannot move. Melting this gram of ice takes ' + fus + ' J, which is as much as warming the water afterwards by ' + Math.round(fus / cWater) + ' °C.'
        : 'Energy going in is speeding the particles up, so the temperature climbs. The slope depends on the specific heat: ice and steam warm about twice as fast per joule as liquid water, which is why those stretches are steeper.';
    }

    draw();
    return shell('Heating one gram of ice from −20 °C to steam',
      'Drag the energy in and watch the temperature stop twice.', body);
  }

  /* ==================================================== build an atom */
  function buildAtom() {
    const body = el('div');
    const canvas = el('canvas', { width: '680', height: '300' });
    body.appendChild(canvas);
    const readout = el('div', { class: 'sim-readout' });
    const note = el('div', { class: 'sim-note' });
    body.appendChild(readout);
    body.appendChild(note);

    let pr = 6, ne = 6, elec = 6;
    const controls = el('div', { class: 'sim-controls' });
    const sp = slider('Protons', 1, 20, pr, 1, (v) => { pr = v; draw(); });
    const sn = slider('Neutrons', 0, 24, ne, 1, (v) => { ne = v; draw(); });
    const se = slider('Electrons', 0, 20, elec, 1, (v) => { elec = v; draw(); });
    controls.appendChild(sp.node); controls.appendChild(sn.node); controls.appendChild(se.node);
    body.appendChild(controls);

    function draw() {
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.32, cy = H / 2;

      /* the nucleus, as a clump */
      const total = pr + ne;
      const rad = 12 + Math.sqrt(total) * 4.4;
      for (let i = 0; i < total; i++) {
        const a = i * 2.39996;                        /* golden angle, so it packs evenly */
        const r = rad * Math.sqrt(i / Math.max(1, total));
        ctx.fillStyle = i < pr ? css('--danger', '#c0392b') : css('--text-faint', '#888');
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }

      /* electron shells, 2 then 8 then 8 */
      const caps = [2, 8, 8, 2];
      let left = elec;
      ctx.strokeStyle = css('--border', '#e2e5ec');
      caps.forEach((cap, ring) => {
        const here = Math.min(cap, left);
        if (here <= 0 && left <= 0 && ring > 0) return;
        const r = rad + 34 + ring * 33;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < here; i++) {
          const a = (i / here) * Math.PI * 2 - Math.PI / 2;
          ctx.fillStyle = css('--accent', '#2f6df6');
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        left -= here;
      });

      /* what you have built */
      const e = ME.chem.element(pr);
      const charge = pr - elec;
      const mass = pr + ne;
      ctx.textAlign = 'left';
      ctx.fillStyle = css('--text', '#16181d');
      ctx.font = '700 40px system-ui, sans-serif';
      ctx.fillText(e ? e.sym : '?', W * 0.68, cy - 6);
      ctx.font = '400 15px system-ui, sans-serif';
      ctx.fillStyle = css('--text-soft', '#565c69');
      ctx.fillText(e ? e.name : 'no such element', W * 0.68, cy + 18);
      ctx.font = '400 13px ui-monospace, monospace';
      ctx.fillText('mass number ' + mass, W * 0.68, cy + 42);
      if (charge !== 0) {
        ctx.fillStyle = charge > 0 ? css('--danger', '#c0392b') : css('--accent', '#2f6df6');
        ctx.fillText('charge ' + (charge > 0 ? '+' : '') + charge, W * 0.68, cy + 62);
      }

      ME.clear(readout);
      readout.appendChild(el('span', {}, ['Element: ', el('b', { text: e ? e.name : '—' })]));
      readout.appendChild(el('span', {}, ['Mass number: ', el('b', { text: String(mass) })]));
      readout.appendChild(el('span', {}, ['Charge: ', el('b', { text: charge === 0 ? 'neutral' : (charge > 0 ? '+' : '') + charge })]));

      const bits = [];
      bits.push('The protons decide which element it is, and nothing else does. Change the protons and you have a different substance entirely.');
      if (charge === 0) bits.push('Protons and electrons balance, so it is a neutral atom.');
      else if (charge > 0) bits.push('There are ' + charge + ' more protons than electrons, so it is a ' + charge + '+ ion — a ' + (e ? e.name.toLowerCase() : '') + ' atom that has lost ' + charge + ' electron' + (charge === 1 ? '' : 's') + '. It is still ' + (e ? e.name.toLowerCase() : '') + '.');
      else bits.push('There are ' + (-charge) + ' more electrons than protons, so it is a ' + (-charge) + '− ion.');
      if (e) {
        const natural = Math.round(e.mass) - pr;
        if (Math.abs(ne - natural) >= 2) {
          bits.push('Most ' + e.name.toLowerCase() + ' atoms have about ' + natural + ' neutrons. With ' + ne + ' this is an unusual isotope — same element, same chemistry, different mass, and quite possibly radioactive.');
        } else {
          bits.push('That is about the usual number of neutrons for ' + e.name.toLowerCase() + '.');
        }
      }
      note.textContent = bits.join(' ');
    }
    draw();
    return shell('Build an atom', 'Add protons, neutrons and electrons and watch what you have made.', body);
  }

  /* ============================================= periodic trend heatmap */
  function trendMap() {
    const body = el('div');
    const TRENDS = [
      { key: 'radius', label: 'Atomic radius', field: 'radius', unit: 'pm', high: 'big',
        why: 'Down a group the atoms get bigger, because each row adds a whole new shell further out. Across a period they get smaller, which is less obvious: the shell count does not change, but the nucleus gains protons, and a stronger positive pull draws the same electrons in closer.' },
      { key: 'en', label: 'Electronegativity', field: 'en', unit: '', high: 'greedy',
        why: 'How hard an atom pulls on shared electrons. It rises across a period, because more protons pull harder, and falls down a group, because the outer electrons are further from the nucleus and screened by the shells in between. Fluorine, top right, is the greediest element there is.' },
      { key: 'ion', label: 'Ionisation energy', field: 'ion', unit: 'eV', high: 'holds on tight',
        why: 'The energy needed to pull one electron off. It mirrors electronegativity, and for the same reason: a small atom with a lot of protons holds its electrons tightly. The noble gases are the hardest of all to strip, which is exactly why they are unreactive.' },
      { key: 'melt', label: 'Melting point', field: 'melt', unit: 'K', high: 'high',
        why: 'Not a smooth trend, and worth seeing for that reason. It peaks in the middle of the transition metals, where metallic bonding is strongest, and collapses at the noble gases, which barely hold on to each other at all.' },
      { key: 'density', label: 'Density', field: 'density', unit: 'g/cm³', high: 'heavy',
        why: 'Heaviest towards the bottom middle — osmium and iridium are the densest elements known. A tennis-ball-sized lump of osmium weighs about 13 kg.' },
    ];
    let active = TRENDS[0];

    const buttons = el('div', { class: 'sim-buttons' });
    TRENDS.forEach((t) => {
      const btn = el('button', { class: 'btn btn-sm' + (t === active ? ' on' : ''), text: t.label });
      btn.addEventListener('click', () => {
        active = t;
        ME.$$('.btn', buttons).forEach((x) => x.classList.toggle('on', x.textContent === t.label));
        draw();
      });
      buttons.appendChild(btn);
    });
    body.appendChild(buttons);

    const grid = el('div', { class: 'sim-trend' });
    body.appendChild(grid);
    const note = el('div', { class: 'sim-note' });
    body.appendChild(note);

    function draw() {
      ME.clear(grid);
      const vals = ME.chem.elements.map((e) => e[active.field]).filter((v) => v !== null && v !== undefined);
      const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      ME.chem.elements.forEach((e) => {
        const pos = ME.chem.ptPosition(e.z);
        if (!pos) return;
        const cell = el('button', { class: 'sim-trend-cell' });
        cell.style.gridRow = String(pos[0]);
        cell.style.gridColumn = String(pos[1]);
        const v = e[active.field];
        if (v === null || v === undefined) {
          cell.classList.add('unknown');
          cell.dataset.tip = e.name + ': no value for ' + active.label.toLowerCase();
        } else {
          const frac = (v - lo) / (hi - lo || 1);
          /* A single-hue ramp, so "more" is unambiguous. */
          cell.style.background = 'color-mix(in srgb, var(--accent) ' + Math.round(8 + frac * 82) + '%, var(--surface-2))';
          cell.style.color = frac > 0.55 ? '#fff' : 'var(--text)';
          cell.dataset.tip = e.name + ': ' + ME.fmt.fmt(v, 4) + ' ' + active.unit;
        }
        cell.appendChild(el('span', { text: e.sym }));
        cell.addEventListener('click', () => ME.router.go('#/elements/' + e.sym));
        grid.appendChild(cell);
      });
      note.textContent = active.why;
      ME.bindTips(grid);
    }
    draw();
    return shell('The table, coloured by one property at a time',
      'Darker means more. Hover for the value, click for the element.', body);
  }

  /* ================================================= pH and titration */
  function phScale() {
    const body = el('div');
    const things = [
      ['Battery acid', 0.5], ['Stomach acid', 1.5], ['Lemon juice', 2.3], ['Cola', 2.5],
      ['Vinegar', 2.9], ['Orange juice', 3.7], ['Tomato', 4.3], ['Black coffee', 5.0],
      ['Rain', 5.6], ['Milk', 6.6], ['Pure water', 7.0], ['Blood', 7.4],
      ['Seawater', 8.1], ['Baking soda', 8.4], ['Hand soap', 10.0],
      ['Household ammonia', 11.5], ['Bleach', 12.6], ['Drain cleaner', 13.5],
    ];
    const strip = el('div', { class: 'sim-ph' });
    const note = el('div', { class: 'sim-note' });
    things.forEach(([name, ph]) => {
      const row = el('button', { class: 'sim-ph-row' });
      row.appendChild(el('span', { class: 'n', text: String(ph) }));
      const barWrap = el('span', { class: 'bar' });
      const fill = el('i');
      fill.style.width = (ph / 14 * 100) + '%';
      fill.style.background = phColour(ph);
      barWrap.appendChild(fill);
      row.appendChild(barWrap);
      row.appendChild(el('span', { class: 'l', text: name }));
      row.addEventListener('click', () => {
        const H = Math.pow(10, -ph);
        const r = ME.solution.pHfromH(H);
        note.textContent = name + ' at pH ' + ph + ' has a hydrogen ion concentration of ' +
          ME.fmt.sciText(H, 3) + ' mol/L, and a hydroxide concentration of ' +
          ME.fmt.sciText(r.OH, 3) + ' mol/L. ' +
          (ph < 7 ? 'More hydrogen ions than hydroxide, so it is acidic. '
           : ph > 7 ? 'More hydroxide than hydrogen ions, so it is basic. '
           : 'Exactly equal, which is what neutral means. ') +
          'Compared with pure water it is ' + ME.fmt.fmt(Math.pow(10, Math.abs(7 - ph)), 3) +
          ' times ' + (ph < 7 ? 'more acidic' : ph > 7 ? 'more basic' : 'the same') + '.';
      });
      strip.appendChild(row);
    });
    body.appendChild(strip);
    body.appendChild(note);
    note.textContent = 'Click anything on the list. The scale is logarithmic, so each step of one is a factor of ten — lemon juice is not "a bit more acidic" than coffee, it is about five hundred times more.';
    return shell('The pH scale, with things you have met', 'Click any of them.', body);
  }

  function phColour(ph) {
    if (ph < 3) return '#d6453c';
    if (ph < 6) return '#e08a3c';
    if (ph < 6.6) return '#d8c53a';
    if (ph <= 7.4) return '#4caf72';
    if (ph < 9) return '#3aa6b9';
    if (ph < 11.5) return '#3b62d4';
    return '#7a3bd4';
  }

  /* A titration you add drops to, which draws its own curve. */
  function titration() {
    const body = el('div');
    const canvas = el('canvas', { width: '680', height: '320' });
    body.appendChild(canvas);
    const readout = el('div', { class: 'sim-readout' });
    const note = el('div', { class: 'sim-note' });
    body.appendChild(readout);

    /* 25.0 mL of 0.100 M HCl, titrated with 0.100 M NaOH. */
    const Va = 25.0, Ma = 0.100, Mb = 0.100;
    let Vb = 0;
    const equivalence = (Ma * Va) / Mb;

    function pHat(vb) {
      const molA = Ma * Va / 1000, molB = Mb * vb / 1000;
      const total = (Va + vb) / 1000;
      if (Math.abs(molA - molB) < 1e-12) return 7;
      if (molA > molB) return -Math.log10((molA - molB) / total);
      return 14 + Math.log10((molB - molA) / total);
    }

    const control = slider('Base added', 0, 50, 0, 0.1,
      (v) => { Vb = v; draw(); }, (v) => v.toFixed(1) + ' mL');
    body.appendChild(el('div', { class: 'sim-controls' }, [control.node]));
    body.appendChild(note);

    const buttons = el('div', { class: 'sim-buttons' });
    [['+1 drop (0.05 mL)', 0.05], ['+1 mL', 1], ['Reset', null]].forEach(([label, amount]) => {
      const btn = el('button', { class: 'btn btn-sm', text: label });
      btn.addEventListener('click', () => {
        Vb = amount === null ? 0 : Math.min(50, Vb + amount);
        control.input.value = String(Vb);
        control.sync();
        draw();
      });
      buttons.appendChild(btn);
    });
    body.appendChild(buttons);

    function draw() {
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height, pad = 40;
      ctx.clearRect(0, 0, W, H);
      const X = (v) => pad + (v / 50) * (W - pad - 12);
      const Y = (ph) => H - pad - (ph / 14) * (H - pad - 14);

      ctx.strokeStyle = css('--border', '#e2e5ec'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, 8); ctx.lineTo(pad, H - pad); ctx.lineTo(W - 8, H - pad); ctx.stroke();
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(pad, Y(7)); ctx.lineTo(W - 8, Y(7)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = css('--text-faint', '#888');
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('pH 7', pad - 5, Y(7) + 4);
      ctx.fillText('14', pad - 5, Y(14) + 8);
      ctx.fillText('0', pad - 5, Y(0) + 4);
      ctx.textAlign = 'center';
      ctx.fillText('mL of base added →', (W + pad) / 2, H - 12);

      /* the full curve, faint */
      ctx.strokeStyle = css('--border-strong', '#cbd1dc'); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let v = 0; v <= 50; v += 0.1) {
        const y = Y(Math.max(0, Math.min(14, pHat(v))));
        if (v === 0) ctx.moveTo(X(v), y); else ctx.lineTo(X(v), y);
      }
      ctx.stroke();
      /* so far, solid */
      ctx.strokeStyle = css('--accent', '#2f6df6'); ctx.lineWidth = 3;
      ctx.beginPath();
      for (let v = 0; v <= Vb + 1e-9; v += 0.05) {
        const y = Y(Math.max(0, Math.min(14, pHat(v))));
        if (v === 0) ctx.moveTo(X(v), y); else ctx.lineTo(X(v), y);
      }
      ctx.stroke();

      const ph = pHat(Vb);
      ctx.fillStyle = phColour(ph);
      ctx.beginPath(); ctx.arc(X(Vb), Y(Math.max(0, Math.min(14, ph))), 6, 0, Math.PI * 2); ctx.fill();

      /* the flask, coloured by an indicator */
      ctx.fillStyle = ph < 8.2 ? 'rgba(255,255,255,0)' : 'rgba(226,90,160,.55)';
      ctx.strokeStyle = css('--border-strong', '#cbd1dc'); ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W - 92, 30); ctx.lineTo(W - 80, 30); ctx.lineTo(W - 80, 62);
      ctx.lineTo(W - 56, 104); ctx.lineTo(W - 116, 104); ctx.lineTo(W - 92, 62);
      ctx.closePath(); ctx.stroke(); ctx.fill();

      ME.clear(readout);
      readout.appendChild(el('span', {}, ['pH: ', el('b', { text: ph.toFixed(2) })]));
      readout.appendChild(el('span', {}, ['Added: ', el('b', { text: Vb.toFixed(2) + ' mL' })]));
      readout.appendChild(el('span', {}, ['Indicator: ', el('b', { text: ph < 8.2 ? 'colourless' : 'pink' })]));

      const off = Math.abs(Vb - equivalence);
      note.textContent = off < 0.06
        ? 'This is the equivalence point: exactly enough base to cancel every acid molecule, at ' + equivalence.toFixed(1) + ' mL. Notice how steep the curve is here — a single drop swings the pH by several units, which is why a titration can be read so precisely, and why one drop too many overshoots badly.'
        : Vb < equivalence
          ? 'Still acid left over. The pH is creeping up slowly, because there is plenty of unreacted acid to soak up each new drop of base. The curve is almost flat here, which is exactly why you cannot find the endpoint by watching the pH change slowly — you find it by watching it change suddenly.'
          : 'Past the equivalence point, so now there is excess base and the pH is high. Going from ' + equivalence.toFixed(1) + ' to ' + Vb.toFixed(1) + ' mL took it to ' + ph.toFixed(1) + '; the curve flattens out again because each extra drop is a smaller and smaller fraction of the base already there.';
    }
    draw();
    return shell('Titrating 25.0 mL of 0.100 M hydrochloric acid with 0.100 M sodium hydroxide',
      'Add base a drop at a time and watch the curve draw itself.', body);
  }

  /* ================================================= energy diagrams */
  function energyDiagram() {
    const body = el('div');
    const canvas = el('canvas', { width: '680', height: '300' });
    body.appendChild(canvas);
    const note = el('div', { class: 'sim-note' });

    let exo = true, catalyst = false;
    const buttons = el('div', { class: 'sim-buttons' });
    const mk = (label, fn) => {
      const btn = el('button', { class: 'btn btn-sm', text: label });
      btn.addEventListener('click', () => { fn(); sync(); draw(); });
      buttons.appendChild(btn);
      return btn;
    };
    const bExo = mk('Exothermic', () => { exo = true; });
    const bEndo = mk('Endothermic', () => { exo = false; });
    const bCat = mk('Add a catalyst', () => { catalyst = !catalyst; });
    body.appendChild(buttons);
    body.appendChild(note);

    function sync() {
      bExo.classList.toggle('on', exo);
      bEndo.classList.toggle('on', !exo);
      bCat.classList.toggle('on', catalyst);
      bCat.textContent = catalyst ? 'Remove the catalyst' : 'Add a catalyst';
    }

    function draw() {
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height, pad = 44;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = css('--border', '#e2e5ec'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, 10); ctx.lineTo(pad, H - pad); ctx.lineTo(W - 10, H - pad); ctx.stroke();
      ctx.fillStyle = css('--text-faint', '#888');
      ctx.font = '11px system-ui, sans-serif';
      ctx.save();
      ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillText('energy', 0, 0);
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.fillText('how far the reaction has got →', (W + pad) / 2, H - 12);

      const yStart = exo ? H - pad - 70 : H - pad - 40;
      const yEnd = exo ? H - pad - 30 : H - pad - 110;
      const peak = (catalyst ? 58 : 100);
      const yPeak = Math.min(yStart, yEnd) - peak;

      const X = (f) => pad + f * (W - pad - 20);
      ctx.strokeStyle = css('--accent', '#2f6df6');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X(0), yStart);
      ctx.lineTo(X(0.22), yStart);
      ctx.bezierCurveTo(X(0.38), yStart, X(0.42), yPeak, X(0.5), yPeak);
      ctx.bezierCurveTo(X(0.58), yPeak, X(0.62), yEnd, X(0.78), yEnd);
      ctx.lineTo(X(1), yEnd);
      ctx.stroke();

      /* the two arrows worth labelling */
      const arrow = (x, y1, y2, label, colour) => {
        ctx.strokeStyle = colour; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = colour;
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 6, (y1 + y2) / 2 + 4);
      };
      arrow(X(0.5), yStart, yPeak, 'activation energy', css('--warn', '#b7791f'));
      arrow(X(0.9), yStart, yEnd, (exo ? 'ΔH negative' : 'ΔH positive'),
        exo ? css('--ok', '#1f7a4d') : css('--danger', '#c0392b'));

      ctx.fillStyle = css('--text-soft', '#565c69');
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('reactants', X(0.02), yStart - 8);
      ctx.textAlign = 'right';
      ctx.fillText('products', X(0.99), yEnd - 8);

      note.textContent = (exo
        ? 'Exothermic: the products sit lower than the reactants, so the reaction lets energy go and the surroundings get warmer. '
        : 'Endothermic: the products sit higher, so the reaction has to take energy in, and the surroundings get colder. This is why an instant cold pack feels cold. ')
        + 'Either way there is a hill in the middle. That hill is the activation energy, and it is why a mixture can be perfectly capable of reacting and still just sit there — petrol and air are an exothermic reaction waiting to happen, and they need a spark to get over the hill. '
        + (catalyst
          ? 'The catalyst has lowered the hill, so many more collisions now have enough energy to get over it and the reaction goes faster. Notice what has not changed: both ends are exactly where they were. A catalyst changes the route, never the destination — so it cannot change how much energy the reaction gives out, and it cannot make an impossible reaction happen.'
          : 'Add a catalyst and watch which parts of the picture move.');
    }
    sync(); draw();
    return shell('Energy diagrams', 'Switch between exothermic and endothermic, and add a catalyst.', body);
  }

  /* =============================================== Le Chatelier shifter */
  function equilibrium() {
    const body = el('div');
    const canvas = el('canvas', { width: '680', height: '260' });
    body.appendChild(canvas);
    const note = el('div', { class: 'sim-note' });

    /* N2 + 3H2 <=> 2NH3, exothermic, fewer moles of gas on the right. */
    let shift = 0;           /* -1 fully left, +1 fully right */
    let target = 0;
    let last = 'Nothing yet. Stress it and watch which way it moves.';

    const buttons = el('div', { class: 'sim-buttons' });
    const stresses = [
      { label: 'Add N₂', to: 0.6,
        why: 'Adding a reactant means more collisions on the left, so the forward reaction speeds up and the position shifts right until the rates match again. The system does not "want" anything — it is just that one direction got busier.' },
      { label: 'Remove NH₃', to: 0.55,
        why: 'Taking a product away slows the reverse reaction, because there is less of it to go backwards. So the forward one wins for a while and the position shifts right. This is exactly how ammonia is made industrially — the product is condensed out continuously so the reaction never settles.' },
      { label: 'Raise the pressure', to: 0.5,
        why: 'There are four molecules of gas on the left and two on the right, so shifting right reduces the number of gas molecules and therefore the pressure. Squeeze the system and it moves the way that relieves the squeeze.' },
      { label: 'Raise the temperature', to: -0.55,
        why: 'This one catches people. The forward reaction is exothermic, so it releases heat — which means heat behaves like a product. Add heat and you are adding a product, so the position shifts left. Heating an exothermic equilibrium always pushes it backwards.' },
      { label: 'Add a catalyst', to: 0,
        why: 'Nothing moves. A catalyst speeds up the forward and reverse reactions by exactly the same factor, so the position where they balance is unchanged. It gets you to equilibrium sooner and does not change where equilibrium is — which is genuinely useful industrially, and a favourite exam trap.' },
    ];
    stresses.forEach((s) => {
      const btn = el('button', { class: 'btn btn-sm', text: s.label });
      btn.addEventListener('click', () => { target = s.to; last = s.why; note.textContent = last; });
      buttons.appendChild(btn);
    });
    const reset = el('button', { class: 'btn btn-sm', text: 'Reset' });
    reset.addEventListener('click', () => { target = 0; last = 'Back to the middle.'; note.textContent = last; });
    buttons.appendChild(reset);
    body.appendChild(buttons);
    body.appendChild(note);
    note.textContent = last;

    function draw() {
      shift += (target - shift) * 0.06;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* a balance beam that tilts */
      const cx = W / 2, cy = H / 2 + 20;
      const angle = shift * 0.24;
      ctx.strokeStyle = css('--border-strong', '#cbd1dc');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(angle) * 230, cy - Math.sin(angle) * 230);
      ctx.lineTo(cx + Math.cos(angle) * 230, cy + Math.sin(angle) * 230);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 46); ctx.stroke();

      const pan = (side, label, formula, count) => {
        const x = cx + side * Math.cos(angle) * 230;
        const y = cy + side * Math.sin(angle) * 230;
        ctx.fillStyle = css('--accent', '#2f6df6');
        for (let i = 0; i < count; i++) {
          const a = i * 2.39996, r = 4 * Math.sqrt(i);
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * r, y - 26 + Math.sin(a) * r, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = css('--text', '#16181d');
        ctx.font = '700 15px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(formula, x, y + 24);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = css('--text-faint', '#888');
        ctx.fillText(label, x, y + 40);
      };
      const left = Math.round(26 - shift * 18), right = Math.round(26 + shift * 18);
      pan(-1, 'reactants', 'N₂ + 3H₂', Math.max(2, left));
      pan(1, 'products', '2NH₃', Math.max(2, right));

      ctx.textAlign = 'center';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = shift > 0.08 ? css('--ok', '#1f7a4d') : shift < -0.08 ? css('--warn', '#b7791f') : css('--text-faint', '#888');
      ctx.fillText(shift > 0.08 ? 'shifted towards the products' : shift < -0.08 ? 'shifted back towards the reactants' : 'at equilibrium', cx, 26);

      if (running) raf = requestAnimationFrame(draw);
    }
    let running = false, raf = null;
    const node = shell('Le Chatelier: stress it and see which way it gives',
      'N₂ + 3H₂ ⇌ 2NH₃, which is exothermic and has fewer gas molecules on the right.', body);
    whenVisible(node, () => { if (!running) { running = true; raf = requestAnimationFrame(draw); } },
      () => { running = false; if (raf) cancelAnimationFrame(raf); });
    return node;
  }

  /* ================================================== solution mixer */
  function solutionMixer() {
    const body = el('div');
    const canvas = el('canvas', { width: '680', height: '240' });
    body.appendChild(canvas);
    const readout = el('div', { class: 'sim-readout' });
    const note = el('div', { class: 'sim-note' });
    body.appendChild(readout);

    let grams = 58.44, mL = 1000;
    const controls = el('div', { class: 'sim-controls' });
    const sg = slider('Salt added', 0, 300, grams, 0.5, (v) => { grams = v; draw(); }, (v) => v.toFixed(1) + ' g');
    const sv = slider('Water', 50, 2000, mL, 10, (v) => { mL = v; draw(); }, (v) => v + ' mL');
    controls.appendChild(sg.node); controls.appendChild(sv.node);
    body.appendChild(controls);
    body.appendChild(note);

    const M = ME.formula.parse('NaCl').mass;

    function draw() {
      const moles = grams / M;
      const molarity = moles / (mL / 1000);
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* a beaker with dots in it, as many as the concentration warrants */
      const bx = 40, by = 30, bw = 240, bh = H - 70;
      ctx.strokeStyle = css('--border-strong', '#cbd1dc'); ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      const fill = Math.min(1, mL / 2000);
      const top = by + bh * (1 - fill);
      ctx.fillStyle = 'color-mix(in srgb, var(--accent) 12%, var(--surface-2))';
      ctx.fillRect(bx + 1, top, bw - 2, by + bh - top - 1);

      const dots = Math.min(400, Math.round(molarity * 90));
      ctx.fillStyle = css('--accent', '#2f6df6');
      for (let i = 0; i < dots; i++) {
        const a = i * 2.39996;
        const x = bx + 8 + ((Math.sin(a * 3.1) + 1) / 2) * (bw - 16);
        const y = top + 8 + ((Math.cos(a * 2.3) + 1) / 2) * (by + bh - top - 16);
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = css('--text', '#16181d');
      ctx.textAlign = 'left';
      ctx.font = '700 30px ui-monospace, monospace';
      ctx.fillText(ME.fmt.fmt(molarity, 3) + ' M', bx + bw + 40, H / 2 - 6);
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = css('--text-soft', '#565c69');
      ctx.fillText(ME.fmt.fmt(moles, 3) + ' mol in ' + ME.fmt.fmt(mL / 1000, 3) + ' L', bx + bw + 40, H / 2 + 18);

      ME.clear(readout);
      readout.appendChild(el('span', {}, ['Moles of NaCl: ', el('b', { text: ME.fmt.fmt(moles, 4) })]));
      readout.appendChild(el('span', {}, ['Molarity: ', el('b', { text: ME.fmt.fmt(molarity, 4) + ' M' })]));

      /* Sodium chloride saturates at roughly 360 g per litre at room
       * temperature, which is worth flagging when the reader sails past it. */
      const perLitre = grams / (mL / 1000);
      note.textContent = perLitre > 360
        ? 'That is more salt than will actually dissolve. Water holds about 360 g of salt per litre at room temperature, and beyond that the rest just sits on the bottom — the solution is saturated, and adding more changes nothing about its concentration. Unit 11 explains why there is a limit at all.'
        : 'Molarity is moles per litre of solution, so there are two ways to change it: add more solute, or change the volume. Notice that doubling the water halves the molarity without removing a single grain of salt — concentration is a ratio, not an amount.';
    }
    draw();
    return shell('Make a solution', 'Add salt, add water, watch the concentration.', body);
  }

  /* ============================================ rotating a bond or not */
  /* Two carbons with the atoms on them, and a slider that twists one end.
   * Single bond: it spins, and every angle is the same substance. Double
   * bond: it refuses, and that is why cis and trans are different molecules. */
  function bondRotation() {
    const body = el('div');
    const canvas = el('canvas', { width: '680', height: '280' });
    body.appendChild(canvas);
    const readout = el('div', { class: 'sim-readout' });
    const note = el('div', { class: 'sim-note' });
    body.appendChild(readout);

    let order = 1;          /* 1 = single, 2 = double */
    let angle = 0;          /* degrees of twist */

    const buttons = el('div', { class: 'sim-buttons' });
    const bSingle = el('button', { class: 'btn btn-sm on', text: 'Single bond' });
    const bDouble = el('button', { class: 'btn btn-sm', text: 'Double bond' });
    bSingle.addEventListener('click', () => { order = 1; bSingle.classList.add('on'); bDouble.classList.remove('on'); draw(); });
    bDouble.addEventListener('click', () => { order = 2; bDouble.classList.add('on'); bSingle.classList.remove('on'); draw(); });
    buttons.appendChild(bSingle); buttons.appendChild(bDouble);
    body.appendChild(buttons);

    const control = slider('Twist the right-hand end', 0, 360, 0, 1,
      (v) => { angle = v; draw(); }, (v) => v + '\u00b0');
    body.appendChild(el('div', { class: 'sim-controls' }, [control.node]));
    body.appendChild(note);

    function draw() {
      /* A double bond simply will not turn. Snapping the slider back is the
       * honest way to show that: the reader pushes and nothing gives. */
      let shown = angle;
      if (order === 2) {
        shown = angle > 90 && angle < 270 ? 180 : 0;
        if (Math.abs(angle - shown) > 2) {
          control.input.value = String(shown);
          control.sync();
          angle = shown;
        }
      }
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const cy = H / 2 - 10;
      const lx = W * 0.38, rx = W * 0.62;
      const bond = css('--bond', '#2b2f38');
      const accent = css('--accent', '#2f6df6');
      const faint = css('--text-faint', '#888');

      /* the bond down the middle, seen end-on so the twist is visible */
      ctx.strokeStyle = bond; ctx.lineWidth = 3;
      if (order === 1) {
        ctx.beginPath(); ctx.moveTo(lx, cy); ctx.lineTo(rx, cy); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(lx, cy - 4); ctx.lineTo(rx, cy - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx, cy + 4); ctx.lineTo(rx, cy + 4); ctx.stroke();
      }

      /* the two carbons */
      [[lx, 'C'], [rx, 'C']].forEach(([x, label]) => {
        ctx.fillStyle = css('--surface', '#fff');
        ctx.beginPath(); ctx.arc(x, cy, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bond;
        ctx.font = '700 18px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x, cy);
      });

      /* Substituents. The left carbon is fixed; the right one turns by the
       * twist angle, drawn as an ellipse to suggest the rotation in depth. */
      const arm = 62;
      const sub = (x, deg, label, colour) => {
        const a = (deg * Math.PI) / 180;
        const px = x + Math.cos(a) * arm * 0.55;
        const py = cy + Math.sin(a) * arm;
        ctx.strokeStyle = bond; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(px, py); ctx.stroke();
        /* A two- or three-character label needs a bigger disc than a lone H,
         * or CH3 spills over the edge of it. */
        ctx.font = '700 14px system-ui, sans-serif';
        const r = Math.max(14, ctx.measureText(label).width / 2 + 7);
        ctx.fillStyle = css('--surface', '#fff');
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colour; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = colour;
        ctx.font = '700 14px system-ui, sans-serif';
        ctx.fillText(label, px, py);
      };
      /* left end fixed: CH3 up, H down */
      sub(lx, -90, 'CH\u2083', accent);
      sub(lx, 90, 'H', faint);
      /* right end twisted */
      sub(rx, -90 + shown, 'CH\u2083', accent);
      sub(rx, 90 + shown, 'H', faint);

      const sameSide = Math.cos((shown * Math.PI) / 180) > 0;
      ME.clear(readout);
      readout.appendChild(el('span', {}, ['Twist: ', el('b', { text: shown + '\u00b0' })]));
      readout.appendChild(el('span', {}, ['The two CH\u2083 groups are: ',
        el('b', { text: sameSide ? 'on the same side' : 'on opposite sides' })]));

      if (order === 1) {
        note.textContent = 'A single bond is one shared pair, and a shared pair does not care how the two ends are turned relative to each other \u2014 so the bond spins freely, billions of times a second at room temperature. Every angle you can set here is the same substance. There is nothing to name and nothing to separate, because the molecule is doing all of these at once.';
      } else {
        note.textContent = 'A double bond will not turn, and you can feel the slider refusing. The second shared pair sits above and below the line between the atoms, and twisting would have to tear it apart \u2014 which costs far more energy than room temperature has. So the two arrangements are locked, they cannot become each other, and they are genuinely different substances: ' +
          (sameSide ? 'this one, with both methyls on the same side, is cis.' : 'this one, with the methyls on opposite sides, is trans.') +
          ' They have different melting points, different shapes and, in the case of fats, different effects on your arteries.';
      }
    }
    draw();
    return shell('Why a double bond cannot twist',
      'Try to turn each one. One spins freely; the other will not budge.', body);
  }

  /* ============================================ Lewis structures and VSEPR */
  /* Type a formula and watch the counting method run. Everything on screen —
   * the electron totals, the bonds, the lone pairs, the shape name, the angle,
   * the formal charges, the polarity verdict — comes out of ME.lewis, so the
   * picture cannot disagree with the working printed underneath it. */
  const LEWIS_LAYOUT = {
    /* bonds and lone pairs placed by angle, 0° to the right. Schematic: a flat
     * drawing of a shape that is mostly not flat. */
    '1,0': { b: [0], l: [] },
    '2,0': { b: [0, 180], l: [] },
    '2,1': { b: [200, 340], l: [90] },
    '2,2': { b: [230, 310], l: [50, 130] },
    '2,3': { b: [90, 270], l: [0, 130, 230] },
    '3,0': { b: [90, 210, 330], l: [] },
    '3,1': { b: [190, 270, 350], l: [90] },
    '3,2': { b: [90, 270, 0], l: [160, 200] },
    '4,0': { b: [45, 135, 225, 315], l: [] },
    '4,1': { b: [90, 270, 10, 350], l: [180] },
    '4,2': { b: [0, 90, 180, 270], l: [45, 225] },
    '5,0': { b: [90, 270, 0, 145, 215], l: [] },
    '5,1': { b: [0, 72, 144, 216, 288], l: [90] },
    '6,0': { b: [0, 60, 120, 180, 240, 300], l: [] },
  };

  function lewis(opts) {
    opts = opts || {};
    const PRESETS = opts.presets ||
      ['CH4', 'H2O', 'NH3', 'CO2', 'SO2', 'BF3', 'CH2O', 'PCl5', 'SF6', 'XeF4', 'NH4+', 'CO3 2-'];
    const body = el('div');

    const chips = el('div', { class: 'sim-buttons' });
    body.appendChild(chips);

    const row = el('div', { class: 'sim-control' });
    row.appendChild(el('label', { text: 'Formula' }));
    const input = el('input', { type: 'text', class: 'sim-input', spellcheck: 'false',
      autocomplete: 'off', autocapitalize: 'off', value: opts.start || 'H2O',
      'aria-label': 'a formula to draw' });
    row.appendChild(input);
    body.appendChild(row);

    const toggles = el('div', { class: 'sim-buttons' });
    let showLone = true;
    const loneBtn = el('button', { class: 'btn btn-sm on', text: 'Lone pairs shown' });
    loneBtn.addEventListener('click', () => {
      showLone = !showLone;
      loneBtn.textContent = showLone ? 'Lone pairs shown' : 'Lone pairs hidden';
      loneBtn.classList.toggle('on', showLone);
      draw();
    });
    toggles.appendChild(loneBtn);
    body.appendChild(toggles);

    const canvas = el('div', { class: 'sim-lewis' });
    body.appendChild(canvas);
    const verdict = el('div', { class: 'sim-verdict' });
    body.appendChild(verdict);
    const work = el('div', { class: 'sim-steps' });
    body.appendChild(work);

    PRESETS.forEach((f) => {
      const btn = el('button', { class: 'btn btn-sm', text: f });
      btn.addEventListener('click', () => { input.value = f; draw(); });
      chips.appendChild(btn);
    });
    input.addEventListener('input', draw);

    const svgEl = (name, attrs) => {
      const n = document.createElementNS('http://www.w3.org/2000/svg', name);
      Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, String(attrs[k])));
      return n;
    };

    function draw() {
      ME.clear(canvas); ME.clear(verdict); ME.clear(work);
      const r = ME.lewis.fromFormula(input.value);
      if (!r.ok) {
        verdict.appendChild(el('p', { class: 'note', text: r.why }));
        return;
      }

      const W = 340, H = 260, CX = W / 2, CY = H / 2, R = 78;
      const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%',
        role: 'img', 'aria-label': r.formula + ', ' + r.shape });
      const layout = LEWIS_LAYOUT[r.groups + ',' + r.centralLone] || null;
      const angleOf = (i, n) => 90 + i * (360 / n);
      const bondAngles = layout ? layout.b : r.terminals.map((_, i) => angleOf(i, r.groups));
      const loneAngles = layout ? layout.l
        : new Array(r.centralLone).fill(0).map((_, i) => angleOf(r.groups + i, r.groups + r.centralLone));
      const at = (deg, dist) => [CX + Math.cos(-deg * Math.PI / 180) * dist,
                                 CY + Math.sin(-deg * Math.PI / 180) * dist];

      const accent = css('--accent', '#3b6ef0');
      const text = css('--text', '#111');
      const faint = css('--text-faint', '#888');

      /* bonds first, so the atom labels sit on top of them */
      r.terminals.forEach((sym, i) => {
        const a = bondAngles[i % bondAngles.length];
        const [x, y] = at(a, R);
        const offsets = r.order[i] === 1 ? [0] : r.order[i] === 2 ? [-3.5, 3.5] : [-5, 0, 5];
        const perp = [Math.sin(-a * Math.PI / 180) * -1, Math.cos(-a * Math.PI / 180) * -1];
        offsets.forEach((o) => {
          svg.appendChild(svgEl('line', {
            x1: CX + perp[0] * o + (x - CX) * 0.28, y1: CY + perp[1] * o + (y - CY) * 0.28,
            x2: x + perp[0] * o - (x - CX) * 0.24, y2: y + perp[1] * o - (y - CY) * 0.24,
            stroke: text, 'stroke-width': 1.7, 'stroke-linecap': 'round',
          }));
        });
      });

      /* lone pairs on the central atom: two dots side by side, pointing out */
      if (showLone) {
        loneAngles.forEach((a) => {
          const perp = [Math.sin(-a * Math.PI / 180) * -1, Math.cos(-a * Math.PI / 180) * -1];
          [-4, 4].forEach((o) => {
            const [x, y] = at(a, 30);
            svg.appendChild(svgEl('circle', { cx: x + perp[0] * o, cy: y + perp[1] * o, r: 2.6, fill: accent }));
          });
        });
        /* and on the outer atoms */
        r.terminals.forEach((sym, i) => {
          const a = bondAngles[i % bondAngles.length];
          const [x, y] = at(a, R);
          for (let k = 0; k < r.terminalLone[i]; k++) {
            const sub = a + 40 + k * 55;
            const perp = [Math.sin(-sub * Math.PI / 180) * -1, Math.cos(-sub * Math.PI / 180) * -1];
            [-3.5, 3.5].forEach((o) => {
              const px = x + Math.cos(-sub * Math.PI / 180) * 17 + perp[0] * o;
              const py = y + Math.sin(-sub * Math.PI / 180) * 17 + perp[1] * o;
              svg.appendChild(svgEl('circle', { cx: px, cy: py, r: 2.2, fill: faint }));
            });
          }
        });
      }

      const label = (x, y, sym, fc) => {
        const g = svgEl('g', {});
        g.appendChild(svgEl('circle', { cx: x, cy: y, r: 14, fill: css('--surface', '#fff') }));
        const t = svgEl('text', { x: x, y: y + 5.5, 'text-anchor': 'middle',
          'font-size': 16, 'font-weight': 600, fill: text });
        t.textContent = sym;
        g.appendChild(t);
        if (fc) {
          const f = svgEl('text', { x: x + 13, y: y - 9, 'text-anchor': 'middle',
            'font-size': 10.5, 'font-weight': 700, fill: accent });
          f.textContent = (fc > 0 ? '+' : '−') + (Math.abs(fc) === 1 ? '' : Math.abs(fc));
          g.appendChild(f);
        }
        svg.appendChild(g);
      };
      r.terminals.forEach((sym, i) => {
        const [x, y] = at(bondAngles[i % bondAngles.length], R);
        label(x, y, sym, r.terminalFC[i]);
      });
      label(CX, CY, r.central, r.centralFC);

      if (r.charge) {
        const t = svgEl('text', { x: W - 16, y: 22, 'text-anchor': 'end',
          'font-size': 15, 'font-weight': 700, fill: text });
        t.textContent = (r.charge > 0 ? '+' : '−') + (Math.abs(r.charge) === 1 ? '' : Math.abs(r.charge));
        svg.appendChild(t);
      }
      canvas.appendChild(svg);

      /* The verdict, in words. Built as nodes rather than a string, because
       * formulaHTML subscripts every digit it sees and this is prose. */
      const say = function () {
        const para = el('p');
        Array.prototype.slice.call(arguments).forEach((x) => {
          para.appendChild(typeof x === 'string' ? document.createTextNode(x) : x);
        });
        verdict.appendChild(para);
      };
      const bold = (t) => el('b', { text: t });
      say(bold(r.shape), (r.angle ? ', with bond angles of about ' + r.angle + '°' : '') + '. ' + r.shapeWhy);
      if (r.centralLone) {
        say('There ' + (r.centralLone === 1 ? 'is one lone pair' : 'are ' + r.centralLone + ' lone pairs') +
          ' on the ' + r.central + '. Turn them off above: the shape is named after what is left, because the lone pairs are not atoms and nobody can see them — but they still take up room, which is why the angle is not the neat one.');
      }
      if (r.polar) {
        say('The molecule is ', bold('polar'), r.bondPolar
          ? ' — the bonds pull unequally, and the shape does not let those pulls cancel.'
          : ' — the bonds themselves are near enough even, but a lone pair is a lump of charge on one side.');
      } else {
        say('The molecule is ', bold('non-polar'), r.bondPolar
          ? ' — the bonds are polar, but the shape is symmetric and every pull is matched by an equal one opposite. Polar bonds, non-polar molecule.'
          : ' — neither the bonds nor the shape gives it a direction.');
      }
      if (r.resonance) {
        say('The outer atoms are identical, but the drawing gives one of them a double bond — which cannot be right, because nothing tells them apart. The real molecule is the average of the ways you could draw it, every bond the same and somewhere between single and double. That averaging is called ', bold('resonance'), '.');
      }
      if (r.expanded) {
        say('The ' + r.central + ' ends up with more than eight electrons around it. Only period 3 and below can do that, because only they have d orbitals close enough in energy to use.');
      }

      /* and the arithmetic, so the picture is never a black box */
      const ol = el('ol', { class: 'sim-worklist' });
      r.steps.forEach((st) => {
        const li = el('li');
        li.appendChild(el('span', { class: 'sim-worklabel', text: st.label }));
        li.appendChild(el('span', { class: 'sim-workval', text: st.value }));
        if (st.detail) li.appendChild(el('div', { class: 'note', text: st.detail }));
        ol.appendChild(li);
      });
      work.appendChild(ol);
    }

    draw();
    return shell(opts.title || 'Build a Lewis structure',
      'Pick one, or type any formula — including ones that cannot exist, which it will tell you about.', body);
  }

  /* ============================================== the stoichiometry road map */
  /* Grams, moles, moles, grams. Drag the mass and watch the value travel the
   * four stations, with each conversion written on the arrow that performs it.
   * Everything comes from ME.stoich.massToMass, which is also what the Tools
   * tab and the graders use, so the picture cannot drift from the arithmetic. */
  function stoichMap(opts) {
    opts = opts || {};
    const SCENARIOS = opts.scenarios || [
      { eq: 'CH4 + 2 O2 -> CO2 + 2 H2O', from: 'CH4', to: 'CO2',
        note: 'Burning natural gas. How much carbon dioxide does a given mass of methane make?' },
      { eq: '2 H2 + O2 -> 2 H2O', from: 'H2', to: 'H2O',
        note: 'The simplest case, and the ratio is not 1:1 \u2014 which is the whole point of step three.' },
      { eq: 'N2 + 3 H2 -> 2 NH3', from: 'N2', to: 'NH3',
        note: 'Ammonia synthesis. Roughly half the nitrogen in your body passed through this reaction.' },
      { eq: 'Fe2O3 + 3 CO -> 2 Fe + 3 CO2', from: 'Fe2O3', to: 'Fe',
        note: 'Smelting iron. How much iron do you get from a mass of ore?' },
      { eq: 'CaCO3 -> CaO + CO2', from: 'CaCO3', to: 'CaO',
        note: 'Making quicklime from limestone \u2014 one of the oldest industrial reactions there is.' },
    ];
    let scenario = SCENARIOS[0];
    let grams = 10;

    const body = el('div');
    const chips = el('div', { class: 'sim-buttons' });
    body.appendChild(chips);
    SCENARIOS.forEach((sc) => {
      const parsed = ME.formula.parse(sc.from);
      const btn = el('button', { class: 'btn btn-sm' + (sc === scenario ? ' on' : '') });
      /* One span, because .btn is a flex row and separate text nodes would be
       * spaced apart by its gap — which puts a gap before every subscript. */
      btn.appendChild(el('span', { html: ME.chemHTML((parsed.ok ? parsed.display : sc.from) +
        ' \u2192 ' + (ME.formula.parse(sc.to).display || sc.to)) }));
      btn.addEventListener('click', () => {
        scenario = sc;
        ME.$$('.btn', chips).forEach((x, i) => x.classList.toggle('on', SCENARIOS[i] === sc));
        draw();
      });
      chips.appendChild(btn);
    });

    const massSlider = slider('Mass you start with', 1, 200, grams, 1,
      (v) => { grams = v; draw(); }, (v) => v + ' g');
    body.appendChild(massSlider.node);

    const eqLine = el('div', { class: 'sim-eq' });
    body.appendChild(eqLine);
    const map = el('div', { class: 'sim-roadmap' });
    body.appendChild(map);
    const note = el('div', { class: 'sim-note' });
    body.appendChild(note);
    const work = el('div', { class: 'sim-steps' });
    body.appendChild(work);

    function station(top, bottom) {
      return el('div', { class: 'sim-rm-station' }, [
        el('div', { class: 'v', text: top }),
        el('div', { class: 'k', html: ME.chemHTML(bottom) }),
      ]);
    }
    function arrow(label, why) {
      /* The direction glyph is drawn by CSS, so the same markup reads as a row
       * of four on a wide screen and a column of four on a narrow one. */
      return el('div', { class: 'sim-rm-arrow' }, [
        el('div', { class: 'sim-rm-op', text: label }),
        el('div', { class: 'sim-rm-glyph', 'aria-hidden': 'true' }),
        el('div', { class: 'sim-rm-why', html: ME.chemHTML(why) }),
      ]);
    }

    function draw() {
      ME.clear(eqLine); ME.clear(map); ME.clear(work);
      const r = ME.stoich.massToMass(scenario.eq, scenario.from, grams, scenario.to);
      if (!r.ok) { note.textContent = r.error; return; }

      eqLine.innerHTML = ME.chemHTML(r.equation.text);
      const Mfrom = r.from.species.formula.mass, Mto = r.to.species.formula.mass;
      const fd = r.from.species.formula.display, td = r.to.species.formula.display;

      map.appendChild(station(ME.fmt.fmt(grams, 4) + ' g', fd));
      map.appendChild(arrow('\u00f7 ' + ME.fmt.fmt(Mfrom, 5),
        'the molar mass of ' + fd + ', because grams cannot talk to grams'));
      map.appendChild(station(ME.fmt.fmt(r.molesFrom, 4) + ' mol', fd));
      map.appendChild(arrow('\u00d7 ' + r.to.coefficient + '/' + r.from.coefficient,
        'the only step that uses the equation'));
      map.appendChild(station(ME.fmt.fmt(r.molesTo, 4) + ' mol', td));
      map.appendChild(arrow('\u00d7 ' + ME.fmt.fmt(Mto, 5),
        'the molar mass of ' + td + ', to get back to something you can weigh'));
      map.appendChild(station(ME.fmt.fmt(r.grams, 4) + ' g', td));

      note.textContent = scenario.note + ' Move the slider: the two outer numbers change and the middle ratio never does, because the ratio is the chemistry and the masses are just units.';

      const ol = el('ol', { class: 'sim-worklist' });
      r.steps.forEach((st) => {
        const li = el('li');
        li.appendChild(el('span', { html: ME.chemHTML(st.text) }));
        if (st.maths) li.appendChild(el('div', { class: 'sim-workval', text: st.maths }));
        ol.appendChild(li);
      });
      work.appendChild(ol);
    }

    draw();
    return shell('The four stations of every stoichiometry problem',
      'Grams, moles, moles, grams. Only the middle arrow needs the balanced equation.', body);
  }

  /* ================================================== one gas law at a time */
  /* The full Gas Simulator tab lets you move everything at once, which is the
   * right tool once the ideas are in place. This one deliberately pins two
   * variables so a single relationship is visible on its own, and plots it so
   * you can see whether it is a straight line through the origin or a curve.
   * Every point on the graph comes from ME.gas.combined. */
  function gasLaw(opts) {
    opts = opts || {};
    let law = ME.gas.LAWS.filter((l) => l.key === (opts.law || 'boyle'))[0] || ME.gas.LAWS[0];

    /* The arithmetic runs in SI, and the slider runs in the units the reader
     * reads, because a range input whose whole span is 0.005 to 0.09 snaps
     * awkwardly. `si` converts one to the other; `fromZero` says whether the
     * relationship is defined at zero, which decides where the graph starts.
     * Whether the line reaches the origin is the difference between Boyle and
     * Charles, so the graph must not quietly crop it out. */
    const REF = { P: 101325, V: 0.0224, n: 1, T: 273.15 };
    const RANGE = {
      P: { lo: 25, hi: 500, unit: 'kPa', si: 1000, step: 1, label: 'Pressure', fromZero: true },
      V: { lo: 2, hi: 90, unit: 'L', si: 0.001, step: 0.5, label: 'Volume', fromZero: false },
      T: { lo: 50, hi: 700, unit: 'K', si: 1, step: 5, label: 'Temperature', fromZero: true },
      n: { lo: 0.25, hi: 3, unit: 'mol', si: 1, step: 0.05, label: 'Amount', fromZero: true },
    };

    const body = el('div');
    const chips = el('div', { class: 'sim-buttons' });
    body.appendChild(chips);
    const holdLine = el('div', { class: 'sim-note' });
    body.appendChild(holdLine);
    const controls = el('div');
    body.appendChild(controls);
    const readout = el('div', { class: 'sim-roadmap' });
    body.appendChild(readout);
    const plot = el('canvas', { width: '680', height: '280' });
    body.appendChild(plot);
    const why = el('div', { class: 'sim-note' });
    body.appendChild(why);

    ME.gas.LAWS.forEach((l) => {
      const btn = el('button', { class: 'btn btn-sm' + (l === law ? ' on' : ''), text: l.name });
      btn.addEventListener('click', () => {
        law = l;
        ME.$$('.btn', chips).forEach((x) => x.classList.toggle('on', x.textContent === l.name));
        rebuild();
      });
      chips.appendChild(btn);
    });

    /* The variable the reader drags, and the one the gas law then forces. */
    let driven, forced, shown;   /* `shown` is in the reader's units */

    function rebuild() {
      /* Each law lists its two free variables; the reader drags the second and
       * the first is forced. Boyle: drag the volume, the pressure follows.
       * Charles: drag the temperature, the volume follows. And so on. */
      driven = law.vary[1];
      forced = law.vary[0];
      const r = RANGE[driven];
      shown = REF[driven] / r.si;
      ME.clear(controls);
      const sl = slider('Drag the ' + r.label.toLowerCase(), r.lo, r.hi, shown, r.step,
        (v) => { shown = v; draw(); },
        (v) => ME.fmt.fmt(v, 4) + ' ' + r.unit);
      controls.appendChild(sl.node);
      /* A range input snaps its value to the nearest step, so read back what
       * it actually landed on rather than trusting what we asked for —
       * otherwise the slider and the readout disagree by half a step. */
      shown = Number(sl.input.value);
      sl.sync();
      holdLine.textContent = 'Held still: ' + law.hold.map((k) => RANGE[k].label.toLowerCase()).join(' and ') +
        '. ' + law.plain;
      why.textContent = law.why;
      draw();
    }

    /* v is in the reader's units; everything inside is SI. */
    function stateFor(v) {
      const after = Object.assign({}, REF);
      after[driven] = v * RANGE[driven].si;
      after[forced] = ME.gas.combined(REF, after, forced);
      return after;
    }

    function station(label, siValue, key, strong) {
      const r = RANGE[key];
      return el('div', { class: 'sim-rm-station' + (strong ? ' on' : '') }, [
        el('div', { class: 'v', text: ME.fmt.fmt(siValue / r.si, 4) + ' ' + r.unit }),
        el('div', { class: 'k', text: label }),
      ]);
    }

    function draw() {
      const st = stateFor(shown);
      ME.clear(readout);
      readout.appendChild(station('you set', st[driven], driven, true));
      readout.appendChild(el('div', { class: 'sim-rm-arrow' }, [
        el('div', { class: 'sim-rm-op', text: law.relation }),
        el('div', { class: 'sim-rm-glyph', 'aria-hidden': 'true' }),
        el('div', { class: 'sim-rm-why', text: 'so this one has no choice' }),
      ]));
      readout.appendChild(station('follows', st[forced], forced, false));
      law.hold.forEach((k) => readout.appendChild(station('held', st[k], k, false)));
      plotIt();
    }

    function plotIt() {
      const ctx = plot.getContext('2d');
      const W = plot.width, H = plot.height, pad = 46;
      ctx.clearRect(0, 0, W, H);
      const dr = RANGE[driven], fr = RANGE[forced];

      /* Sample the law across the axis. A proportional law is sampled from
       * zero so the reader can see the line arrive at the origin; an inverse
       * one cannot be, because it goes to infinity there. */
      const from = dr.fromZero ? 0.0001 : dr.lo;
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const v = from + (dr.hi - from) * (i / 160);
        pts.push([v, stateFor(v)[forced] / fr.si]);
      }
      const yMax = Math.max.apply(null, pts.map((q) => q[1])) * 1.06;
      const xMax = dr.hi;
      const px = (x) => pad + (x / xMax) * (W - pad - 16);
      const py = (y) => H - pad - (y / yMax) * (H - pad - 20);

      ctx.strokeStyle = css('--border-strong', '#bbb');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, 12); ctx.lineTo(pad, H - pad); ctx.lineTo(W - 12, H - pad);
      ctx.stroke();

      ctx.fillStyle = css('--text-faint', '#888');
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(fr.label + ' (' + fr.unit + ')', 8, 16);
      const xl = dr.label + ' (' + dr.unit + ')';
      ctx.fillText(xl, W - 14 - ctx.measureText(xl).width, H - 14);
      ctx.fillText('0', pad - 11, H - pad + 15);
      ctx.fillText(ME.fmt.fmt(xMax, 3), px(xMax) - 12, H - pad + 15);
      /* Just inside the axis rather than beside the axis title, which sits in
       * the same corner. */
      ctx.fillText(ME.fmt.fmt(yMax, 3), pad + 6, py(yMax) + 4);

      ctx.strokeStyle = css('--accent', '#3b6ef0');
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((q, i) => {
        const y = py(q[1]);
        /* An inverse law runs off the top of the frame near zero; clip rather
         * than draw a spike that squashes everything else flat. */
        if (y < 6) { ctx.moveTo(px(q[0]), 6); return; }
        if (i === 0) ctx.moveTo(px(q[0]), y); else ctx.lineTo(px(q[0]), y);
      });
      ctx.stroke();

      const here = stateFor(shown);
      ctx.fillStyle = css('--accent', '#3b6ef0');
      ctx.beginPath();
      ctx.arc(px(shown), py(here[forced] / fr.si), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    rebuild();
    return shell(opts.title || 'One gas law at a time',
      'Two variables pinned, one dragged, and the fourth has no choice. Watch whether the graph is a line through the origin or a curve.', body);
  }

  ME.sims = {
    statesOfMatter, heatingCurve, buildAtom, trendMap, phScale, titration, lewis,
    energyDiagram, equilibrium, solutionMixer, bondRotation, stoichMap, gasLaw,
    shell, slider, whenVisible, css,
  };
})();
