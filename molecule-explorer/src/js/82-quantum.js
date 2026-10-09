/* The Schrödinger tab.
 *
 * Deliberately not part of the course. The course is a path with an order and
 * a next button; this is one topic taken as far as it will go, for someone who
 * wants to know how the equation actually works rather than where it fits in a
 * syllabus. It sits at the far right of the bar for the same reason.
 *
 * Every number on every page comes from ME.quantum, which derives everything
 * from the defined constants. There is no 13.6 typed anywhere in this file.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const el = ME.el;
  const K = ME.kit;
  const Q = ME.quantum;
  const { p, b, em, callout, figure, table, worked } = K;

  const fmt = (x, s) => ME.fmt.fmt(x, s || 4);
  /* Maths goes in as plain text, not through chemHTML: an exponent in n²h² is
   * not a subscript in a formula, and the markup for chemistry would eat it. */
  const qeq = (text) => el('div', { class: 'qm-eq', text: text });
  const h3 = (t) => el('h3', { class: 'qm-h', text: t });

  /* --------------------------------------------------------- canvas helper */
  /* One place that knows about device pixel ratios, resizing and animation, so
   * seven figures do not each get it slightly wrong. */
  const LIVE = [];
  function canvasFigure(heightRatio, draw, opts) {
    const wrap = el('div', { class: 'qm-canvaswrap' });
    const canvas = el('canvas', { class: 'qm-canvas' });
    wrap.appendChild(canvas);
    const state = { canvas: canvas, draw: draw, t: 0, animated: !!(opts && opts.animated) };

    /* paint() calls state.draw rather than the argument, so a figure can wrap
     * its own drawing to update a readout alongside it. Closing over the
     * argument instead made that wrapping silently do nothing. */
    state.paint = function () {
      const ratio = window.devicePixelRatio || 1;
      const w = canvas.clientWidth || 600;
      const hh = Math.round(w * heightRatio);
      if (canvas.style.height !== hh + 'px') canvas.style.height = hh + 'px';
      if (canvas.width !== Math.round(w * ratio)) {
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(hh * ratio);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, hh);
      state.draw(ctx, w, hh, state);
    };
    LIVE.push(state);
    return { node: wrap, state: state, repaint: () => state.paint() };
  }

  function ink() {
    const css = getComputedStyle(document.documentElement);
    return {
      text: css.getPropertyValue('--text').trim() || '#222',
      dim: css.getPropertyValue('--text-soft').trim() || '#666',
      faint: css.getPropertyValue('--border-strong').trim() || '#aaa',
      line: css.getPropertyValue('--border').trim() || '#ddd',
      accent: css.getPropertyValue('--accent').trim() || '#2563eb',
    };
  }

  /* A labelled slider that reports its value as it moves. */
  function slider(label, min, max, step, value, onChange, format) {
    const row = el('div', { class: 'qm-slider' });
    row.appendChild(el('label', { text: label }));
    const input = el('input', { type: 'range', min: String(min), max: String(max),
      step: String(step), value: String(value) });
    const out = el('span', { class: 'qm-sliderval' });
    const show = (v) => { out.textContent = format ? format(v) : String(v); };
    show(value);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      show(v);
      onChange(v);
    });
    row.appendChild(input);
    row.appendChild(out);
    return { node: row, set: (v) => { input.value = String(v); show(v); } };
  }

  /* ===================================================== the figures ===== */

  /* The particle in a box: the wave, its square, and the ladder beside it. */
  function boxFigure() {
    const St = { n: 1, L: 1, squared: false };
    const fig = canvasFigure(0.42, (ctx, W, H) => {
      const c = ink();
      const padL = 54, padR = 150, padT = 18, padB = 34;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const midY = padT + plotH / 2;

      /* the walls */
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH);
      ctx.moveTo(padL + plotW, padT); ctx.lineTo(padL + plotW, padT + plotH);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = c.line;
      ctx.beginPath(); ctx.moveTo(padL, midY); ctx.lineTo(padL + plotW, midY); ctx.stroke();

      /* the wave */
      const amp = plotH * 0.42;
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const frac = i / 240;
        const psi = Math.sin(St.n * Math.PI * frac);
        const v = St.squared ? psi * psi : psi;
        const x = padL + frac * plotW;
        const y = St.squared ? padT + plotH - v * amp * 1.8 : midY - v * amp;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      if (St.squared) {
        ctx.lineTo(padL + plotW, padT + plotH);
        ctx.lineTo(padL, padT + plotH);
        ctx.closePath();
        ctx.fillStyle = c.accent + '22';
        ctx.fill();
      }

      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(St.squared ? '|ψ|²' : 'ψ', padL + 6, padT + 12);
      ctx.textAlign = 'center';
      ctx.fillText('0', padL, H - 10);
      ctx.fillText(St.L + ' nm', padL + plotW, H - 10);

      /* the ladder */
      const levels = Q.boxLevels(St.L, 1, 6);
      const top = levels[5].eV;
      const lx = W - padR + 22, lw = padR - 46;
      levels.forEach((lv) => {
        const y = padT + plotH - (lv.eV / top) * plotH;
        const on = lv.n === St.n;
        ctx.strokeStyle = on ? c.accent : c.line;
        ctx.lineWidth = on ? 2.6 : 1.2;
        ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw, y); ctx.stroke();
        ctx.fillStyle = on ? c.accent : c.faint;
        ctx.font = (on ? '600 ' : '') + '11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('n=' + lv.n + '  ' + fmt(lv.eV, 3) + ' eV', lx + 2, y - 4);
      });
    });

    const controls = el('div', { class: 'qm-controls' });
    const nS = slider('level n', 1, 6, 1, 1, (v) => { St.n = v; fig.repaint(); });
    const lS = slider('width L', 0.2, 3, 0.1, 1, (v) => { St.L = v; fig.repaint(); },
      (v) => v.toFixed(1) + ' nm');
    controls.appendChild(nS.node);
    controls.appendChild(lS.node);
    const toggle = el('button', { class: 'btn btn-sm', text: 'show |ψ|²' });
    toggle.addEventListener('click', () => {
      St.squared = !St.squared;
      toggle.textContent = St.squared ? 'show ψ' : 'show |ψ|²';
      fig.repaint();
    });
    controls.appendChild(toggle);

    const readout = el('div', { class: 'qm-readout' });
    const update = () => {
      const e = Q.boxEnergy(St.n, St.L);
      const half = Q.boxProbability(St.n, St.L, 0, St.L / 2);
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill',
        text: 'E = ' + fmt(e.eV, 4) + ' eV' }));
      readout.appendChild(el('span', { class: 'note',
        text: St.n - 1 === 0 ? 'no nodes inside — one smooth hump'
          : (St.n - 1) + ' node' + (St.n - 1 > 1 ? 's' : '') + ' inside, and '
            + fmt(half, 3) + ' of the probability in the left half' }));
    };
    const wrapDraw = fig.state.draw;
    fig.state.draw = (ctx, W, H, s) => { wrapDraw(ctx, W, H, s); update(); };

    return figure('Drag the level and the width. The ladder on the right is the real energy scale, '
      + 'computed from E = n²h²/8mL² — notice how fast it climbs when you narrow the box.',
      fig.node, controls, readout);
  }

  /* The one demo this topic really needs: why a stationary state is called
   * stationary, and what a mixture of two of them does instead. */
  function stationaryFigure() {
    const St = { mode: 'one' };
    const fig = canvasFigure(0.36, (ctx, W, H, s) => {
      const c = ink();
      const padL = 20, padR = 20, padT = 24, padB = 26;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const L = 1;
      /* Phases rotate at e^(-iEt/hbar); what is drawn is the relative rate,
       * slowed by a constant so a human can watch it. E2/E1 = 4 exactly. */
      const t = s.t;
      const ph1 = -t * 1.0, ph2 = -t * 4.0;

      const value = (frac) => {
        const a = Math.sin(Math.PI * frac);
        const bb = Math.sin(2 * Math.PI * frac);
        if (St.mode === 'one') {
          return { re: a * Math.cos(ph1), im: a * Math.sin(ph1), sq: a * a };
        }
        const re = (a * Math.cos(ph1) + bb * Math.cos(ph2)) / Math.SQRT2;
        const im = (a * Math.sin(ph1) + bb * Math.sin(ph2)) / Math.SQRT2;
        return { re: re, im: im, sq: re * re + im * im };
      };

      const amp = plotH * 0.3;
      const midY = padT + plotH * 0.34;
      /* real part, imaginary part, then the square underneath */
      [['re', c.accent, 2.4], ['im', c.faint, 1.6]].forEach(([key, colour, lw]) => {
        ctx.beginPath();
        for (let i = 0; i <= 200; i++) {
          const frac = i / 200;
          const v = value(frac)[key];
          const x = padL + frac * plotW;
          const y = midY - v * amp;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = colour; ctx.lineWidth = lw; ctx.stroke();
      });

      const baseY = padT + plotH;
      ctx.beginPath();
      ctx.moveTo(padL, baseY);
      for (let i = 0; i <= 200; i++) {
        const frac = i / 200;
        const x = padL + frac * plotW;
        ctx.lineTo(x, baseY - value(frac).sq * amp * 1.05);
      }
      ctx.lineTo(padL + plotW, baseY);
      ctx.closePath();
      ctx.fillStyle = '#2f9e5f33';
      ctx.fill();
      ctx.strokeStyle = '#2f9e5f';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = c.accent;
      ctx.fillText('real part of ψ', padL, 14);
      ctx.fillStyle = c.faint;
      ctx.fillText('imaginary part', padL + 110, 14);
      ctx.fillStyle = '#2f9e5f';
      ctx.fillText('|ψ|² — what you could measure', padL + 212, 14);
    }, { animated: true });

    const controls = el('div', { class: 'qm-controls' });
    const caption = el('div', { class: 'qm-readout' });
    const setMode = (m) => {
      St.mode = m;
      ME.$$('.qm-seg', controls).forEach((x) => x.classList.toggle('on', x.dataset.mode === m));
      ME.clear(caption);
      caption.appendChild(el('span', { class: 'note', text: m === 'one'
        ? 'One state of definite energy. The wave underneath is spinning — watch the blue and grey '
          + 'curves trade places — but the green curve never moves. That is what stationary means.'
        : 'An equal mixture of n = 1 and n = 2. Each piece is still a perfectly good solution, but '
          + 'they spin at different rates, so the interference between them changes and the green '
          + 'curve sloshes. Motion, built out of two things that individually never move.' }));
      fig.repaint();
    };
    [['one', 'one state'], ['mix', 'a mixture of two']].forEach(([m, label]) => {
      const btn = el('button', { class: 'btn btn-sm qm-seg', 'data-mode': m, text: label });
      btn.addEventListener('click', () => setMode(m));
      controls.appendChild(btn);
    });
    setMode('one');

    return figure(null, fig.node, controls, caption);
  }

  /* Tunnelling, with the cliff made visible. */
  function tunnelFigure() {
    const St = { E: 1, V: 5, w: 0.2 };
    const fig = canvasFigure(0.38, (ctx, W, H) => {
      const c = ink();
      const padL = 16, padR = 16, padT = 20, padB = 30;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const baseY = padT + plotH;
      const scale = plotH / (Math.max(St.V, St.E) * 1.25);

      /* the barrier */
      const bw = Math.max(6, (St.w / 1.2) * plotW * 0.45);
      const bx = padL + plotW * 0.45;
      ctx.fillStyle = c.line;
      ctx.fillRect(bx, baseY - St.V * scale, bw, St.V * scale);

      /* the particle's energy */
      const ey = baseY - St.E * scale;
      ctx.strokeStyle = c.accent;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(padL, ey); ctx.lineTo(padL + plotW, ey); ctx.stroke();
      ctx.setLineDash([]);

      const t = Q.tunnel(St.E, St.V, St.w);
      /* Incoming wave, exponential decay inside, smaller wave out the far
       * side — with the far amplitude set by the real transmission, so the
       * picture cannot flatter the physics. */
      /* Inside the wall the amplitude falls as e^(-kx) over the real width, so
       * the drawn decay is the computed one rather than a decorative curve. */
      const decayOverWall = t.over ? 0 : t.kappa * St.w * 1e-9;
      const outAmp = Math.sqrt(Math.max(t.T, 1e-12));
      const wave = plotH * 0.1;
      ctx.beginPath();
      for (let x = padL; x <= padL + plotW; x += 1.5) {
        let y;
        if (x < bx) {
          y = ey - Math.sin((x - padL) * 0.22) * wave;
        } else if (x < bx + bw) {
          y = ey - wave * Math.exp(-((x - bx) / bw) * decayOverWall);
        } else {
          y = ey - Math.sin((x - bx - bw) * 0.22) * wave * outAmp;
        }
        if (x === padL) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('barrier ' + St.V + ' eV', bx + bw / 2, baseY - St.V * scale - 7);
      ctx.textAlign = 'left';
      ctx.fillText('electron, ' + St.E + ' eV', padL + 2, ey - 8);
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      const t = Q.tunnel(St.E, St.V, St.w);
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill',
        text: 'gets through ' + (t.T < 0.001 ? ME.fmt.sciUnicode(t.T, 3) : fmt(t.T * 100, 3) + '%')
          + (t.T < 0.001 ? ' of the time' : '') }));
      readout.appendChild(el('span', { class: 'note', text: t.over
        ? 'Above the barrier now — and still not a certainty. A wave can reflect off a step it '
          + 'clears, which has no classical version either.'
        : 'The amplitude dies away inside the wall with a decay length of '
          + fmt(t.decayLengthNM, 3) + ' nm. Every extra bit of thickness costs another factor.' }));
      fig.repaint();
    };
    controls.appendChild(slider('electron E', 0.2, 8, 0.1, 1,
      (v) => { St.E = v; refresh(); }, (v) => v.toFixed(1) + ' eV').node);
    controls.appendChild(slider('barrier V₀', 0.5, 10, 0.5, 5,
      (v) => { St.V = v; refresh(); }, (v) => v.toFixed(1) + ' eV').node);
    controls.appendChild(slider('thickness', 0.05, 1.2, 0.05, 0.2,
      (v) => { St.w = v; refresh(); }, (v) => v.toFixed(2) + ' nm').node);
    refresh();

    return figure('Thickness is the one to play with. It sits inside an exponential, so dragging it '
      + 'a little does what dragging the others a lot cannot.', fig.node, controls, readout);
  }

  /* Levels in a real, finite well against the idealised box. */
  function wellFigure() {
    const St = { V: 5, L: 1 };
    const fig = canvasFigure(0.40, (ctx, W, H) => {
      const c = ink();
      const padT = 22, padB = 26;
      const plotH = H - padT - padB;
      const w = Q.finiteWell(St.V, St.L);
      const top = St.V;
      const scale = plotH / (top * 1.1);
      const baseY = padT + plotH;
      const leftX = W * 0.08, wellW = W * 0.4;

      /* the well itself */
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(leftX - 30, baseY - top * scale);
      ctx.lineTo(leftX, baseY - top * scale);
      ctx.lineTo(leftX, baseY);
      ctx.lineTo(leftX + wellW, baseY);
      ctx.lineTo(leftX + wellW, baseY - top * scale);
      ctx.lineTo(leftX + wellW + 30, baseY - top * scale);
      ctx.stroke();

      ctx.font = '11px system-ui, sans-serif';
      w.levels.forEach((lv) => {
        const y = baseY - lv.eV * scale;
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(leftX + 4, y); ctx.lineTo(leftX + wellW - 4, y); ctx.stroke();
        ctx.fillStyle = c.accent;
        ctx.textAlign = 'left';
        ctx.fillText(fmt(lv.eV, 3) + ' eV', leftX + wellW + 6, y + 4);
      });

      /* the infinite box next to it, same width */
      const bx = W * 0.62, bw = W * 0.3;
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, padT - 4); ctx.lineTo(bx, baseY); ctx.lineTo(bx + bw, baseY);
      ctx.lineTo(bx + bw, padT - 4);
      ctx.stroke();
      Q.boxLevels(St.L, 1, 8).forEach((lv) => {
        if (lv.eV > top * 1.05) return;
        const y = baseY - lv.eV * scale;
        ctx.strokeStyle = c.dim;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(bx + 4, y); ctx.lineTo(bx + bw - 4, y); ctx.stroke();
        ctx.fillStyle = c.dim;
        ctx.textAlign = 'left';
        ctx.fillText(fmt(lv.eV, 3) + ' eV', bx + bw + 6, y + 4);
      });

      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('finite well, ' + St.V + ' eV deep', leftX + wellW / 2, H - 8);
      ctx.fillText('infinite box, same width', bx + bw / 2, H - 8);
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      const w = Q.finiteWell(St.V, St.L);
      const box1 = Q.boxEnergy(1, St.L).eV;
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill',
        text: w.count + ' bound state' + (w.count === 1 ? '' : 's') }));
      readout.appendChild(el('span', { class: 'note',
        text: 'Ground state ' + fmt(w.levels[0].eV, 3) + ' eV, against ' + fmt(box1, 3)
          + ' eV for the perfect box. Always lower, because the wave leaks a little way into the '
          + 'walls and a wave with more room to spread is a wave with less curvature.' }));
      fig.repaint();
    };
    controls.appendChild(slider('depth V₀', 0.2, 20, 0.2, 5,
      (v) => { St.V = v; refresh(); }, (v) => v.toFixed(1) + ' eV').node);
    controls.appendChild(slider('width L', 0.2, 2, 0.1, 1,
      (v) => { St.L = v; refresh(); }, (v) => v.toFixed(1) + ' nm').node);
    refresh();

    return figure('Make it shallow enough and only one level survives — but never zero. In one '
      + 'dimension a well always holds at least one bound state, however feeble.',
      fig.node, controls, readout);
  }

  /* The oscillator: a parabola with a ladder of equal rungs. */
  function oscillatorFigure() {
    const BONDS = [
      ['H–Cl', 516, 1.00783, 34.9689, 2886],
      ['H–F', 966, 1.00783, 18.9984, 3962],
      ['C–O (in CO)', 1902, 12, 15.9949, 2143],
      ['C=O (in a ketone)', 1200, 12, 15.9949, 1715],
      ['C–H', 500, 12, 1.00783, 2950],
      ['D–Cl', 516, 2.0141, 34.9689, 2091],
    ];
    const St = { i: 0 };
    const fig = canvasFigure(0.4, (ctx, W, H) => {
      const c = ink();
      const row = BONDS[St.i];
      const o = Q.oscillator(row[1], Q.reducedMass(row[2], row[3]));
      const padT = 18, padB = 28;
      const plotH = H - padT - padB;
      const baseY = padT + plotH;
      const levels = 6;
      const topE = (levels - 0.5) * o.spacingEV;
      const scale = plotH / (topE * 1.12);
      const cx = W / 2;
      const halfW = Math.min(W * 0.42, 260);

      /* V = ½kx², drawn so the top level just fits */
      ctx.beginPath();
      for (let i = -60; i <= 60; i++) {
        const f = i / 60;
        const x = cx + f * halfW;
        const y = baseY - (f * f * topE) * scale;
        if (i === -60) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '11px system-ui, sans-serif';
      for (let n = 0; n < levels; n++) {
        const E = (n + 0.5) * o.spacingEV;
        const y = baseY - E * scale;
        const halfAt = halfW * Math.sqrt(E / topE);
        ctx.strokeStyle = n === 0 ? c.accent : c.dim;
        ctx.lineWidth = n === 0 ? 2.4 : 1.4;
        ctx.beginPath(); ctx.moveTo(cx - halfAt, y); ctx.lineTo(cx + halfAt, y); ctx.stroke();
        ctx.fillStyle = n === 0 ? c.accent : c.faint;
        ctx.textAlign = 'left';
        ctx.fillText('n=' + n, cx + halfAt + 5, y + 4);
      }
      ctx.fillStyle = c.accent;
      ctx.textAlign = 'center';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('zero-point energy ' + fmt(o.zeroPointEV, 3) + ' eV — the bottom rung is not the floor',
        cx, baseY + 18);
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      const row = BONDS[St.i];
      const o = Q.oscillator(row[1], Q.reducedMass(row[2], row[3]));
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill',
        text: Math.round(o.wavenumber) + ' cm⁻¹ predicted' }));
      readout.appendChild(el('span', { class: 'note',
        text: 'The band really appears at about ' + row[4] + ' cm⁻¹. The gap between those '
          + 'two numbers is the spring model failing in the one way it must: a real bond gets '
          + 'easier to stretch the longer it gets, and eventually breaks. A spring never does.' }));
      ME.$$('.qm-seg', controls).forEach((x, i) => x.classList.toggle('on', i === St.i));
      fig.repaint();
    };
    BONDS.forEach((row, i) => {
      const btn = el('button', { class: 'btn btn-sm qm-seg', text: row[0] });
      btn.addEventListener('click', () => { St.i = i; refresh(); });
      controls.appendChild(btn);
    });
    refresh();

    return figure('Equal rungs all the way up — the only system on this page with that property, '
      + 'and the reason a vibration gives one infrared band instead of a spread of them.',
      fig.node, controls, readout);
  }

  /* Hydrogen's ladder, with the series drawn on it. */
  function hydrogenFigure() {
    const St = { to: 2 };
    const fig = canvasFigure(0.46, (ctx, W, H) => {
      const c = ink();
      const padT = 20, padB = 30, padL = 60;
      const plotH = H - padT - padB;
      const baseY = padT + plotH;
      /* Drawn on the real energy scale, which is the point: the levels crowd
       * together at the top and that is why the series converge. */
      const lowest = Q.hydrogenEnergy(1).eV;
      const scale = plotH / (-lowest * 1.04);
      const yOf = (eV) => baseY + (eV - lowest) * scale - plotH;

      ctx.font = '11px system-ui, sans-serif';
      for (let n = 1; n <= 8; n++) {
        const e = Q.hydrogenEnergy(n).eV;
        const y = yOf(e) + plotH;
        ctx.strokeStyle = n === St.to ? c.accent : c.line;
        ctx.lineWidth = n === St.to ? 2.4 : 1.3;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - 18, y); ctx.stroke();
        ctx.fillStyle = n === St.to ? c.accent : c.faint;
        ctx.textAlign = 'right';
        ctx.fillText('n=' + n, padL - 6, y + 4);
        if (n <= 4 || n === 8) {
          ctx.textAlign = 'left';
          ctx.fillText(fmt(e, 4) + ' eV', padL + 6, y - 4);
        }
      }
      /* free electron */
      const freeY = yOf(0) + plotH;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = c.dim;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, freeY); ctx.lineTo(W - 18, freeY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c.dim;
      ctx.textAlign = 'left';
      ctx.fillText('0 eV — electron free', padL + 6, freeY + 12);

      /* arrows down to the chosen level */
      for (let n = St.to + 1; n <= St.to + 4; n++) {
        const t = Q.hydrogenTransition(n, St.to);
        const x = padL + 70 + (n - St.to) * ((W - padL - 120) / 5);
        const y1 = yOf(Q.hydrogenEnergy(n).eV) + plotH;
        const y2 = yOf(Q.hydrogenEnergy(St.to).eV) + plotH;
        ctx.strokeStyle = colourFor(t.lambdaNM);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y2); ctx.lineTo(x - 4, y2 - 7); ctx.lineTo(x + 4, y2 - 7);
        ctx.closePath();
        ctx.fillStyle = colourFor(t.lambdaNM);
        ctx.fill();
        ctx.save();
        ctx.translate(x + 4, (y1 + y2) / 2);
        ctx.textAlign = 'left';
        ctx.fillStyle = c.dim;
        ctx.fillText(Math.round(t.lambdaNM) + ' nm', 2, 0);
        ctx.restore();
      }
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      const s = Q.SERIES.filter((x) => x[0] === St.to)[0];
      const limit = Q.hydrogenTransition(1000, St.to);
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill', text: s ? s[1] + ' series' : 'series' }));
      readout.appendChild(el('span', { class: 'note',
        text: 'Every line that lands on n = ' + St.to + ' belongs to this series, and they crowd '
          + 'towards a limit at ' + fmt(limit.lambdaNM, 4) + ' nm — the shortest wavelength it '
          + 'can give, which is an electron falling in from infinitely far out.' }));
      ME.$$('.qm-seg', controls).forEach((x) => x.classList.toggle('on', Number(x.dataset.to) === St.to));
      fig.repaint();
    };
    Q.SERIES.slice(0, 4).forEach((s) => {
      const btn = el('button', { class: 'btn btn-sm qm-seg', 'data-to': String(s[0]), text: s[1] });
      btn.addEventListener('click', () => { St.to = s[0]; refresh(); });
      controls.appendChild(btn);
    });
    refresh();

    return figure('Drawn on the real energy scale. The levels pile up as n grows, which is why '
      + 'every series converges rather than marching on evenly.', fig.node, controls, readout);
  }

  function colourFor(nm) {
    if (nm < 400) return '#8b5cf6';
    if (nm < 490) return '#3b82f6';
    if (nm < 570) return '#22c55e';
    if (nm < 590) return '#eab308';
    if (nm < 750) return '#ef4444';
    return '#92400e';
  }

  /* The page registry. Content files call ME.quantumPage() as they load and
   * the shell reads the list when it first builds, so the pages can be split
   * across as many files as the subject needs without any of them knowing
   * about the others. Order of registration is reading order. */
  ME.quantumPages = [];
  /* Every page opens with `short`: the one idea, in the plainest words it can
   * be put in, before any of the detail. A reader who stops after that box
   * should still have learnt the thing the page is about. It is allowed to
   * come either before or after the build function so that content files can
   * put it up at the top of the page where it is read, rather than trailing
   * after a hundred lines of prose. */
  ME.quantumPage = function (group, id, name, blurb, a, b) {
    const build = typeof a === 'function' ? a : b;
    const short = typeof a === 'function' ? (b || '') : (a || '');
    ME.quantumPages.push({ group: group, id: id, name: name, blurb: blurb,
      short: short, build: build });
  };

  ME.quantumFigures = { boxFigure, stationaryFigure, tunnelFigure, wellFigure,
    oscillatorFigure, hydrogenFigure };
  ME.quantumInternals = { LIVE, canvasFigure, slider, qeq, h3 };
})();
