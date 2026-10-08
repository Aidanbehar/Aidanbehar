/* Figures for the rest of the quantum tab.
 *
 * Same contract as the ones in 82-quantum.js: each returns a <figure>, each
 * draws from ME.quantum rather than from a shape that looks about right, and
 * each registers with the shared paint list so the shell can repaint them all
 * on a resize and animate the ones that move.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const el = ME.el;
  const Q = ME.quantum;
  const K = ME.kit;
  const { figure } = K;
  const { canvasFigure, slider } = ME.quantumInternals;
  const fmt = (x, s) => ME.fmt.fmt(x, s || 4);

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
  const WARM = '#e8663c', COOL = '#3b82f6', GREEN = '#2f9e5f', VIOLET = '#8b5cf6';

  /* ------------------------------------------- the ultraviolet catastrophe */
  function blackbodyFigure() {
    const St = { T: 5772 };
    const fig = canvasFigure(0.44, (ctx, W, H) => {
      const c = ink();
      const padL = 46, padR = 14, padT = 16, padB = 34;
      const pw = W - padL - padR, ph = H - padT - padB;
      const maxNM = 2200;
      /* Scaled to the peak of the quantum curve, so the classical one runs off
       * the top of the frame — which is the entire point of the picture. */
      const peak = Q.planck(Q.wienPeak(St.T).lambdaNM, St.T).quantum;
      const X = (nm) => padL + (nm / maxNM) * pw;
      const Y = (v) => padT + ph - Math.min(1.08, v / peak) * ph;

      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ph);
      ctx.lineTo(padL + pw, padT + ph); ctx.stroke();

      /* the visible band, so a reader can see where the peak falls */
      const g = ctx.createLinearGradient(X(400), 0, X(750), 0);
      ['#8b5cf6', '#3b82f6', '#22c55e', '#eab308', '#ef4444'].forEach((col, i, a) =>
        g.addColorStop(i / (a.length - 1), col));
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = g;
      ctx.fillRect(X(400), padT, X(750) - X(400), ph);
      ctx.globalAlpha = 1;

      [['classical', WARM, 'classical'], ['quantum', c.accent, 'quantum']].forEach(([key, colour]) => {
        ctx.beginPath();
        let started = false;
        for (let nm = 60; nm <= maxNM; nm += 4) {
          const v = Q.planck(nm, St.T)[key];
          const y = Y(v);
          if (y < padT - 2) { started = false; continue; }
          if (!started) { ctx.moveTo(X(nm), y); started = true; } else ctx.lineTo(X(nm), y);
        }
        ctx.strokeStyle = colour;
        ctx.lineWidth = key === 'quantum' ? 2.6 : 2;
        if (key === 'classical') ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = WARM;
      ctx.textAlign = 'left';
      ctx.fillText('what classical physics predicts', padL + 8, padT + 14);
      ctx.fillStyle = c.accent;
      ctx.fillText('what Planck’s lumps predict, and what you measure', padL + 8, padT + 30);
      ctx.fillStyle = c.dim;
      ctx.textAlign = 'center';
      [0, 500, 1000, 1500, 2000].forEach((nm) => ctx.fillText(nm + ' nm', X(nm), H - 10));
      ctx.save();
      ctx.translate(14, padT + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('energy radiated', 0, 0);
      ctx.restore();
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      const w = Q.wienPeak(St.T);
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill', text: 'peak at ' + Math.round(w.lambdaNM) + ' nm' }));
      readout.appendChild(el('span', { class: 'note', text: 'in the ' + w.region
        + ', and the whole surface radiates ' + ME.fmt.sciUnicode(Q.stefanBoltzmann(St.T), 3)
        + ' W per square metre — which goes as T⁴, so twice the temperature is sixteen times the power.' }));
      fig.repaint();
    };
    controls.appendChild(slider('temperature', 500, 9000, 50, 5772,
      (v) => { St.T = v; refresh(); }, (v) => v + ' K').node);
    [['a wood fire', 1100], ['a filament', 2800], ['the Sun', 5772], ['Rigel', 11000]].forEach(([label, T]) => {
      const btn = el('button', { class: 'btn btn-sm', text: label });
      btn.addEventListener('click', () => { St.T = Math.min(9000, T); refresh(); });
      controls.appendChild(btn);
    });
    refresh();
    return figure('Drag the temperature. The dashed line is the honest prediction of classical '
      + 'physics, and it does not have a peak at all — it climbs forever as the wavelength shortens.',
      fig.node, controls, readout);
  }

  /* ----------------------------------------------- the photoelectric effect */
  function photoelectricFigure() {
    const METALS = [['caesium', 2.1], ['sodium', 2.28], ['zinc', 4.3], ['platinum', 5.6]];
    const St = { i: 1 };
    const fig = canvasFigure(0.42, (ctx, W, H) => {
      const c = ink();
      const padL = 52, padR = 16, padT = 18, padB = 36;
      const pw = W - padL - padR, ph = H - padT - padB;
      const maxF = 2.2e15, maxKE = 6;
      const X = (f) => padL + (f / maxF) * pw;
      const Y = (ke) => padT + ph - (ke / maxKE) * ph;

      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ph);
      ctx.lineTo(padL + pw, padT + ph); ctx.stroke();

      METALS.forEach(([name, phi], idx) => {
        const on = idx === St.i;
        const f0 = ME.fmt.CONST.e * phi / ME.fmt.CONST.h;
        ctx.beginPath();
        ctx.moveTo(X(f0), Y(0));
        ctx.lineTo(X(maxF), Y(ME.quantum.photonFromEV(1).eV * 0 + (ME.fmt.CONST.h * maxF / ME.fmt.CONST.e) - phi));
        ctx.strokeStyle = on ? c.accent : c.line;
        ctx.lineWidth = on ? 2.6 : 1.4;
        ctx.stroke();
        if (on) {
          ctx.fillStyle = c.accent;
          ctx.font = '600 12px system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(name + ', φ = ' + phi + ' eV', X(f0) + 8, Y(0) - 10);
        }
      });

      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('frequency of the light →', padL + pw / 2, H - 9);
      ctx.save();
      ctx.translate(15, padT + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('energy of the fastest electron (eV)', 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.fillText('every line has the same slope, and the slope is h', padL + 10, padT + 14);
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      const [name, phi] = METALS[St.i];
      const r = Q.photoelectric(400, phi);
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill',
        text: 'threshold ' + Math.round(r.thresholdNM) + ' nm' }));
      readout.appendChild(el('span', { class: 'note', text: 'Shine 400 nm violet light on '
        + name + ' and ' + (r.emits
          ? 'electrons come off with up to ' + fmt(r.kineticEV, 3) + ' eV, however dim the light is.'
          : 'nothing comes off at all, however bright you make it.') }));
      ME.$$('.qm-seg', controls).forEach((x, i) => x.classList.toggle('on', i === St.i));
      fig.repaint();
    };
    METALS.forEach(([name], i) => {
      const btn = el('button', { class: 'btn btn-sm qm-seg', text: name });
      btn.addEventListener('click', () => { St.i = i; refresh(); });
      controls.appendChild(btn);
    });
    refresh();
    return figure('Four metals, four different thresholds, one slope. That slope is Planck’s '
      + 'constant, measured off a graph of a desk experiment.', fig.node, controls, readout);
  }

  /* ------------------------------------------------------- the two slits */
  function doubleSlitFigure() {
    const St = { dots: [], mode: 'particles' };
    const fig = canvasFigure(0.4, (ctx, W, H, s) => {
      const c = ink();
      const padT = 14, padB = 26;
      const ph = H - padT - padB;
      /* The interference pattern, as a probability. Dots are thrown at it one
       * at a time with those odds. */
      const prob = (x) => {
        const u = (x / W - 0.5) * 26;
        const envelope = Math.pow(Math.sin(u / 4) / (u / 4 || 1), 2);
        return St.mode === 'particles'
          ? Math.pow(Math.cos(u), 2) * envelope
          : envelope;
      };
      /* one new arrival per frame or so */
      if (s.animated) {
        for (let k = 0; k < 6; k++) {
          for (let tries = 0; tries < 40; tries++) {
            const x = Math.random() * W;
            if (Math.random() < prob(x)) { St.dots.push([x, padT + Math.random() * ph]); break; }
          }
        }
        if (St.dots.length > 2600) St.dots.splice(0, St.dots.length - 2600);
      }

      ctx.fillStyle = c.accent;
      St.dots.forEach(([x, y]) => { ctx.fillRect(x, y, 1.6, 1.6); });

      /* the curve the dots are filling in */
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = padT + ph - prob(x) * ph * 0.92;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(St.dots.length + ' arrivals', W / 2, H - 8);
    }, { animated: true });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const setMode = (m) => {
      St.mode = m; St.dots = [];
      ME.$$('.qm-seg', controls).forEach((x) => x.classList.toggle('on', x.dataset.m === m));
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'note', text: m === 'particles'
        ? 'Both slits open, electrons fired one at a time. Each lands as a single dot — so each '
          + 'one is a whole particle — and yet the pattern they build has bands in it. Nothing '
          + 'was there for a single electron to interfere with except itself.'
        : 'Now a detector watches which slit each one went through. The bands vanish, and you get '
          + 'the plain sum of two slits. Not because the detector jostles anything — because the '
          + 'two paths are no longer indistinguishable, and only indistinguishable paths interfere.' }));
      fig.repaint();
    };
    [['particles', 'nobody watching'], ['watched', 'detector at the slits']].forEach(([m, label]) => {
      const btn = el('button', { class: 'btn btn-sm qm-seg', 'data-m': m, text: label });
      btn.addEventListener('click', () => setMode(m));
      controls.appendChild(btn);
    });
    setMode('particles');
    return figure(null, fig.node, controls, readout);
  }

  /* --------------------------------- angular momentum, and why it tilts */
  function angularFigure() {
    const St = { l: 2 };
    const fig = canvasFigure(0.44, (ctx, W, H) => {
      const c = ink();
      const cx = W / 2, cy = H / 2;
      const a = Q.angularMomentum(St.l);
      const unit = Math.min(H * 0.34, W * 0.16);
      const len = a.magnitude * unit;

      /* the z axis and its allowed rungs */
      ctx.strokeStyle = c.line; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cx, cy - len - 16); ctx.lineTo(cx, cy + len + 16); ctx.stroke();
      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('z', cx, cy - len - 22);

      a.orientations.forEach((m) => {
        const z = m * unit;
        const horizontal = Math.sqrt(Math.max(0, len * len - z * z));
        /* the vector itself */
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + horizontal, cy - z);
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        /* the cone it is free to lie anywhere on */
        ctx.beginPath();
        ctx.ellipse(cx, cy - z, horizontal, Math.max(3, horizontal * 0.22), 0, 0, Math.PI * 2);
        ctx.strokeStyle = c.line;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = c.dim;
        ctx.textAlign = 'right';
        ctx.fillText('m = ' + m, cx - 8, cy - z + 4);
      });

      ctx.fillStyle = c.accent;
      ctx.textAlign = 'left';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText('|L| = √(' + St.l + '×' + (St.l + 1) + ') ℏ = '
        + fmt(a.magnitude, 4) + ' ℏ', 12, 18);
      if (a.minAngleDeg !== null) {
        ctx.fillStyle = c.dim;
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('closest it can get to the axis: ' + fmt(a.minAngleDeg, 3) + '°', 12, 36);
      }
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      const a = Q.angularMomentum(St.l);
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill',
        text: a.label + ' orbital · ' + a.count + ' orientation' + (a.count > 1 ? 's' : '') }));
      readout.appendChild(el('span', { class: 'note', text: St.l === 0
        ? 'No angular momentum at all, so no direction to point in. An s orbital is a sphere for '
          + 'exactly this reason.'
        : 'The vector is ' + fmt(a.magnitude, 4) + 'ℏ long but its z component can only reach '
          + St.l + 'ℏ, so it can never lie along the axis. Something is always left over '
          + 'sideways, and that is the uncertainty principle showing up in a different costume.' }));
      fig.repaint();
    };
    controls.appendChild(slider('ℓ', 0, 3, 1, 2, (v) => { St.l = v; refresh(); }).node);
    refresh();
    return figure(null, fig.node, controls, readout);
  }

  /* ------------------------------------------------------ Stern–Gerlach */
  function sternGerlachFigure() {
    const St = { kind: 'spin' };
    const fig = canvasFigure(0.34, (ctx, W, H, s) => {
      const c = ink();
      const midY = H / 2;
      const magnetX = W * 0.36, magnetW = W * 0.2;

      /* the magnet */
      ctx.fillStyle = c.line;
      ctx.fillRect(magnetX, midY - H * 0.33, magnetW, H * 0.16);
      ctx.fillRect(magnetX, midY + H * 0.17, magnetW, H * 0.16);
      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('uneven magnetic field', magnetX + magnetW / 2, midY - H * 0.36);

      /* atoms flying through */
      const t = s.t;
      for (let i = 0; i < 26; i++) {
        const phase = ((t * 0.5 + i / 26) % 1);
        const x = phase * W;
        let y = midY;
        if (x > magnetX) {
          const k = Math.min(1, (x - magnetX) / (W - magnetX));
          const up = i % 2 === 0;
          if (St.kind === 'spin') y = midY + (up ? -1 : 1) * k * H * 0.3;
          else y = midY + ((i % 7) / 3 - 1) * k * H * 0.3;
        }
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = c.accent;
        ctx.fill();
      }

      /* the screen */
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W - 6, midY - H * 0.38); ctx.lineTo(W - 6, midY + H * 0.38); ctx.stroke();
      if (St.kind === 'spin') {
        ctx.fillStyle = c.accent;
        ctx.fillRect(W - 14, midY - H * 0.32, 10, 7);
        ctx.fillRect(W - 14, midY + H * 0.25, 10, 7);
      } else {
        ctx.fillStyle = c.accent;
        ctx.fillRect(W - 14, midY - H * 0.32, 10, Math.round(H * 0.64));
      }
    }, { animated: true });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const setKind = (k) => {
      St.kind = k;
      ME.$$('.qm-seg', controls).forEach((x) => x.classList.toggle('on', x.dataset.k === k));
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'note', text: k === 'spin'
        ? 'What actually happens: two spots, nothing in between. The atoms were not prepared '
          + 'pointing up or down — they came out of an oven in every direction — and the field '
          + 'still only ever finds two answers.'
        : 'What a spinning classical ball would do: arrive pointing every which way, and smear '
          + 'into a continuous band. Nobody has ever seen this.' }));
      fig.repaint();
    };
    [['spin', 'what happens'], ['classical', 'what should happen']].forEach(([k, label]) => {
      const btn = el('button', { class: 'btn btn-sm qm-seg', 'data-k': k, text: label });
      btn.addEventListener('click', () => setKind(k));
      controls.appendChild(btn);
    });
    setKind('spin');
    return figure(null, fig.node, controls, readout);
  }

  /* ------------------------------------------------------ an MO diagram */
  function lcaoFigure() {
    const St = { electrons: 2, interaction: 2.5 };
    const fig = canvasFigure(0.44, (ctx, W, H) => {
      const c = ink();
      const r = Q.lcao(-13.6, St.interaction);
      const padT = 24, padB = 34;
      const ph = H - padT - padB;
      const mid = padT + ph / 2;
      const scale = (ph * 0.36) / Math.max(r.destabilisation, 0.001);
      const yAtom = mid;
      const yBond = mid + r.stabilisation * scale;
      const yAnti = mid - r.destabilisation * scale;
      const lw = W * 0.16;
      const leftX = W * 0.08, rightX = W * 0.76, midX = W * 0.42;

      const level = (x, y, colour, label) => {
        ctx.strokeStyle = colour; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + lw, y); ctx.stroke();
        ctx.fillStyle = colour; ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + lw / 2, y - 8);
      };
      level(leftX, yAtom, c.faint, 'atom A');
      level(rightX, yAtom, c.faint, 'atom B');
      level(midX, yBond, GREEN, 'bonding');
      level(midX, yAnti, WARM, 'antibonding');

      ctx.strokeStyle = c.line; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      [[leftX + lw, yAtom, midX, yBond], [leftX + lw, yAtom, midX, yAnti],
        [rightX, yAtom, midX + lw, yBond], [rightX, yAtom, midX + lw, yAnti]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      ctx.setLineDash([]);

      /* electrons, filling from the bottom */
      const dot = (x, y) => {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = c.accent; ctx.fill();
      };
      const put = (y, n) => {
        if (n >= 1) dot(midX + lw * 0.35, y);
        if (n >= 2) dot(midX + lw * 0.65, y);
      };
      put(yBond, Math.min(2, St.electrons));
      put(yAnti, Math.max(0, St.electrons - 2));

      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('the antibonding level rises by more than the bonding level drops',
        W / 2, H - 10);
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      const r = Q.lcao(-13.6, St.interaction);
      const net = St.electrons <= 2
        ? -St.electrons * r.stabilisation
        : -2 * r.stabilisation + (St.electrons - 2) * r.destabilisation;
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill',
        text: 'bond order ' + Q.bondOrder(Math.min(2, St.electrons), Math.max(0, St.electrons - 2)) }));
      readout.appendChild(el('span', { class: 'note', text: net < 0
        ? 'Net ' + fmt(-net, 3) + ' eV better off than two separate atoms, so it holds together.'
        : 'Net ' + fmt(net, 3) + ' eV worse off than two separate atoms, so it falls apart. '
          + 'This is why there is no He₂ — fill both levels and the antibonding one wins.' }));
      fig.repaint();
    };
    controls.appendChild(slider('electrons', 1, 4, 1, 2, (v) => { St.electrons = v; refresh(); }).node);
    controls.appendChild(slider('overlap', 0.5, 5, 0.25, 2.5,
      (v) => { St.interaction = v; refresh(); }, (v) => v.toFixed(2) + ' eV').node);
    refresh();
    return figure(null, fig.node, controls, readout);
  }

  /* ------------------------------------------- the three statistics */
  function statisticsFigure() {
    const St = { T: 300 };
    const fig = canvasFigure(0.42, (ctx, W, H) => {
      const c = ink();
      const padL = 46, padR = 16, padT = 18, padB = 34;
      const pw = W - padL - padR, ph = H - padT - padB;
      const span = 0.4;
      const X = (eV) => padL + ((eV + span / 2) / span) * pw;
      const Y = (f) => padT + ph - Math.min(1, f / 1.25) * ph;

      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ph);
      ctx.lineTo(padL + pw, padT + ph); ctx.stroke();
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(X(0), padT); ctx.lineTo(X(0), padT + ph); ctx.stroke();
      ctx.setLineDash([]);

      [['fermiDirac', c.accent, 'Fermi–Dirac — fermions, one per state'],
        ['boltzmann', c.faint, 'Boltzmann — the classical guess'],
        ['boseEinstein', GREEN, 'Bose–Einstein — bosons, pile in']].forEach(([key, colour, label], i) => {
        ctx.beginPath();
        let started = false;
        for (let eV = -span / 2; eV <= span / 2; eV += span / 400) {
          const v = Q.occupancy(eV, 0, St.T)[key];
          if (!isFinite(v) || v > 40) { started = false; continue; }
          const y = Y(v);
          if (y < padT) { started = false; continue; }
          if (!started) { ctx.moveTo(X(eV), y); started = true; } else ctx.lineTo(X(eV), y);
        }
        ctx.strokeStyle = colour;
        ctx.lineWidth = key === 'fermiDirac' ? 2.6 : 1.8;
        ctx.stroke();
        ctx.fillStyle = colour;
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, padL + 8, padT + 13 + i * 15);
      });

      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('energy, relative to the chemical potential →', padL + pw / 2, H - 9);
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      ME.clear(readout);
      readout.appendChild(el('span', { class: 'qm-pill',
        text: 'kT = ' + fmt(ME.quantum.toEV(ME.fmt.CONST.kB * St.T) * 1000, 3) + ' meV' }));
      readout.appendChild(el('span', { class: 'note', text: St.T < 60
        ? 'Nearly absolute zero: the Fermi–Dirac curve is a cliff. Every state below the line is '
          + 'full and every state above it is empty, because there is nowhere else for a fermion '
          + 'to go.'
        : 'Warm it up and the cliff softens over a width of about kT. That narrow softened edge '
          + 'is the only part of a metal’s electrons that can do anything at all, which is why '
          + 'metals have far less heat capacity than classical physics predicts.' }));
      fig.repaint();
    };
    controls.appendChild(slider('temperature', 10, 2000, 10, 300,
      (v) => { St.T = v; refresh(); }, (v) => v + ' K').node);
    refresh();
    return figure(null, fig.node, controls, readout);
  }

  /* ------------------------------------------------------- energy bands */
  function bandFigure() {
    const MATERIALS = [['copper', 0], ['silicon', 1.12], ['gallium arsenide', 1.42],
      ['gallium nitride', 3.4], ['diamond', 5.5]];
    const St = { i: 1 };
    const fig = canvasFigure(0.38, (ctx, W, H) => {
      const c = ink();
      const [name, gap] = MATERIALS[St.i];
      const padT = 20, padB = 30;
      const ph = H - padT - padB;
      const maxGap = 6;
      const bandH = ph * 0.3;
      const gapH = (gap / maxGap) * ph * 0.6;
      const x = W * 0.2, bw = W * 0.6;

      const valenceY = padT + ph - bandH;
      const conductionY = valenceY - gapH - bandH;

      ctx.fillStyle = c.accent + '55';
      ctx.fillRect(x, valenceY, bw, bandH);
      ctx.fillStyle = gap === 0 ? c.accent + '55' : c.line + '66';
      ctx.fillRect(x, conductionY, bw, bandH);

      ctx.strokeStyle = c.faint; ctx.lineWidth = 1;
      ctx.strokeRect(x, valenceY, bw, bandH);
      ctx.strokeRect(x, conductionY, bw, bandH);

      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('conduction band — empty seats, where current flows', x + bw + 10, conductionY + bandH / 2);
      ctx.fillText('valence band — full, so nothing can move', x + bw + 10, valenceY + bandH / 2);
      if (gap > 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = c.text;
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText(gap + ' eV gap', x + bw / 2, conductionY + bandH + gapH / 2 + 5);
      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = c.accent;
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText('no gap at all — the bands touch', x + bw / 2, conductionY + bandH + 16);
      }
    });

    const controls = el('div', { class: 'qm-controls' });
    const readout = el('div', { class: 'qm-readout' });
    const refresh = () => {
      const [name, gap] = MATERIALS[St.i];
      ME.clear(readout);
      if (gap === 0) {
        readout.appendChild(el('span', { class: 'qm-pill', text: 'conductor' }));
        readout.appendChild(el('span', { class: 'note', text: 'The top band is only part full, so '
          + 'an electron has an empty state right next to it to move into. That is all "being a '
          + 'metal" means.' }));
      } else {
        const b = Q.bandGap(gap);
        readout.appendChild(el('span', { class: 'qm-pill', text: b.kind }));
        readout.appendChild(el('span', { class: 'note', text: 'An electron crossing that gap emits '
          + Math.round(b.lambdaNM) + ' nm light, which is ' + b.region + '. At room temperature only '
          + 'about ' + ME.fmt.sciUnicode(b.thermalFraction, 2) + ' of them have the energy to get '
          + 'across on their own.' }));
      }
      ME.$$('.qm-seg', controls).forEach((x, i) => x.classList.toggle('on', i === St.i));
      fig.repaint();
    };
    MATERIALS.forEach(([name], i) => {
      const btn = el('button', { class: 'btn btn-sm qm-seg', text: name });
      btn.addEventListener('click', () => { St.i = i; refresh(); });
      controls.appendChild(btn);
    });
    refresh();
    return figure(null, fig.node, controls, readout);
  }

  /* ------------------------------------------------------------ Bell */
  function bellFigure() {
    const fig = canvasFigure(0.42, (ctx, W, H) => {
      const c = ink();
      const padL = 50, padR = 16, padT = 18, padB = 34;
      const pw = W - padL - padR, ph = H - padT - padB;
      const X = (deg) => padL + (deg / 180) * pw;
      const Y = (v) => padT + ph / 2 - (v * ph) / 2;

      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ph);
      ctx.moveTo(padL, Y(0)); ctx.lineTo(padL + pw, Y(0)); ctx.stroke();

      /* quantum: -cos(theta). classical best effort: the straight line. */
      ctx.beginPath();
      for (let d = 0; d <= 180; d += 2) {
        const y = Y(-Math.cos((d * Math.PI) / 180));
        if (d === 0) ctx.moveTo(X(d), y); else ctx.lineTo(X(d), y);
      }
      ctx.strokeStyle = c.accent; ctx.lineWidth = 2.6; ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(X(0), Y(-1)); ctx.lineTo(X(180), Y(1));
      ctx.strokeStyle = WARM; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = c.accent; ctx.textAlign = 'left';
      ctx.fillText('what quantum mechanics says, and what the lab measures', padL + 8, padT + 14);
      ctx.fillStyle = WARM;
      ctx.fillText('the best any pre-agreed answer can manage', padL + 8, padT + 30);
      ctx.fillStyle = c.dim; ctx.textAlign = 'center';
      [0, 45, 90, 135, 180].forEach((d) => ctx.fillText(d + '°', X(d), H - 9));
      ctx.fillText('angle between the two detectors', padL + pw / 2, padT + ph + 26);
    });
    const r = Q.bell(0, 90, 45, 135);
    const readout = el('div', { class: 'qm-readout' });
    readout.appendChild(el('span', { class: 'qm-pill', text: 'S = ' + fmt(r.magnitude, 4) }));
    readout.appendChild(el('span', { class: 'note', text: 'Anything decided in advance is stuck at '
      + '2 or below, whatever the hidden plan. Quantum mechanics predicts 2√2 = '
      + fmt(r.quantumLimit, 4) + ', and the experiment gives 2√2. That is not a near miss; it '
      + 'is a different number.' }));
    return figure(null, fig.node, readout);
  }

  /* ----------------------------------------------------- radioactive decay */
  function decayFigure() {
    const St = { n: 400, atoms: null, t: 0, halfLife: 3 };
    const fig = canvasFigure(0.34, (ctx, W, H, s) => {
      const c = ink();
      if (!St.atoms || St.atoms.length !== St.n) {
        St.atoms = [];
        for (let i = 0; i < St.n; i++) St.atoms.push(true);
        St.t = 0;
      }
      /* Each surviving atom gets the same chance every frame, with no memory
       * of how long it has already waited. That indifference is the whole
       * reason the curve is an exponential. */
      const dt = 1 / 60;
      St.t += dt;
      const perFrame = 1 - Math.pow(0.5, dt / St.halfLife);
      let alive = 0;
      St.atoms.forEach((a, i) => {
        if (a && Math.random() < perFrame) St.atoms[i] = false;
        if (St.atoms[i]) alive++;
      });
      if (alive === 0) { St.atoms = null; }

      const cols = 40, cell = Math.min((W - 20) / cols, (H - 40) / Math.ceil(St.n / cols));
      St.atoms.forEach((a, i) => {
        const x = 10 + (i % cols) * cell, y = 16 + Math.floor(i / cols) * cell;
        ctx.fillStyle = a ? c.accent : c.line;
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, Math.max(1.6, cell * 0.3), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = c.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(alive + ' of ' + St.n + ' left after ' + fmt(St.t / St.halfLife, 3)
        + ' half-lives', 10, H - 8);
      ctx.textAlign = 'right';
      ctx.fillText('expected: ' + Math.round(St.n * Math.pow(0.5, St.t / St.halfLife)), W - 10, H - 8);
    }, { animated: true });

    const controls = el('div', { class: 'qm-controls' });
    const again = el('button', { class: 'btn btn-sm', text: 'Start again' });
    again.addEventListener('click', () => { St.atoms = null; fig.repaint(); });
    controls.appendChild(again);

    return figure('Four hundred identical atoms, none of them ageing, none of them scheduled. Each '
      + 'one has the same chance of going in the next instant as it had when it was made — and out '
      + 'of that indifference comes a curve you can set a clock by.', fig.node, controls);
  }

  Object.assign(ME.quantumFigures, {
    blackbodyFigure, photoelectricFigure, doubleSlitFigure, angularFigure,
    sternGerlachFigure, lcaoFigure, statisticsFigure, bandFigure, bellFigure, decayFigure,
  });
})();
