/* 3D ball-and-stick viewing, on top of 3Dmol.js.
 *
 * Coordinates come from one of two places, in this order:
 *   1. the offline database, which carries PubChem's own 3D conformer
 *   2. OpenChemLib's conformer generator, run in the browser on demand
 * The second path needs the library's crystallographic torsion tables, which
 * are ~950 KB of text, so they are only parsed the first time they are wanted.
 */
(function () {
  'use strict';

  const ME = window.ME;

  function lib() { return window.$3Dmol || window['3Dmol'] || null; }

  /* ------------------------------------------------------- molfile writing */
  function pad(s, n, right) {
    s = String(s);
    if (s.length > n) s = s.slice(0, n);
    return right ? s + ' '.repeat(n - s.length) : ' '.repeat(n - s.length) + s;
  }
  function fixed(v, w, dp) { return pad(Number(v).toFixed(dp), w); }

  /* Rebuild a V2000 molfile from the compact form stored in the database. */
  function molfileFromPacked(d, title) {
    const el = d.e.split(' ');
    const na = el.length;
    const nb = d.b.length / 3;
    const out = [title || '', '  molecule-explorer 3D', ''];
    out.push(pad(na, 3) + pad(nb, 3) + '  0  0  0  0  0  0  0  0999 V2000');
    for (let i = 0; i < na; i++) {
      out.push(fixed(d.c[i * 3], 10, 4) + fixed(d.c[i * 3 + 1], 10, 4) + fixed(d.c[i * 3 + 2], 10, 4) +
        ' ' + pad(el[i], 3, true) + ' 0  0  0  0  0  0  0  0  0  0  0  0');
    }
    for (let i = 0; i < nb; i++) {
      out.push(pad(d.b[i * 3], 3) + pad(d.b[i * 3 + 1], 3) + pad(d.b[i * 3 + 2], 3) + '  0  0  0  0');
    }
    out.push('M  END');
    return out.join('\n');
  }

  /* ---------------------------------------------- on-demand 3D from a SMILES */
  let resourcesReady = false;
  function ensureResources() {
    if (resourcesReady) return true;
    try {
      const raw = window.__ME_OCL_RESOURCES;
      if (!raw) return false;
      window.OCL.Resources.register(typeof raw === 'string' ? JSON.parse(raw) : raw);
      resourcesReady = true;
      return true;
    } catch (e) {
      console.warn('3D resource tables unavailable', e);
      return false;
    }
  }

  const genCache = {};

  /* Returns a molfile string, or null if a conformer could not be produced. */
  function generate3D(mol, key) {
    if (key && genCache[key]) return genCache[key];
    if (!ensureResources()) return null;
    try {
      const OCL = window.OCL;
      const work = mol.getCompactCopy ? mol.getCompactCopy() : ME.chem.fromSmiles(mol.toSmiles());
      const gen = new OCL.ConformerGenerator(0x1234);
      if (!gen.initializeConformers(work)) return null;
      const conf = gen.getNextConformerAsMolecule();
      if (!conf) return null;
      conf.addImplicitHydrogens();
      const mf = conf.toMolfile();
      if (key) genCache[key] = mf;
      return mf;
    } catch (e) {
      console.warn('conformer generation failed', e);
      return null;
    }
  }

  /* --------------------------------------------------------------- viewing */
  function colorMap() {
    const map = {};
    for (const k in ME.chem.CPK) map[k] = ME.chem.CPK[k];
    /* Hydrogen has to stay visible against a light background. */
    map.H = ME.theme.effective() === 'dark' ? '#e8e8ee' : '#cfd3da';
    return map;
  }

  function surfaceColor() {
    const cs = getComputedStyle(document.body);
    return (cs.getPropertyValue('--surface-2') || '#f6f7fa').trim();
  }

  /* Mounts a viewer into `host`. Returns { ok, message, viewer, dispose }. */
  function mount(host, source, opts) {
    opts = opts || {};
    const $3D = lib();
    ME.clear(host);
    const overlay = ME.el('div', { class: 'overlay' });
    host.appendChild(overlay);

    if (!$3D) {
      overlay.textContent = 'The 3D viewer could not start in this browser.';
      return { ok: false };
    }

    let molfile = null;
    if (source.molfile) molfile = source.molfile;
    else if (source.packed) molfile = molfileFromPacked(source.packed, source.title);

    if (!molfile && source.mol) {
      overlay.appendChild(ME.el('div', { class: 'spin' }));
      overlay.appendChild(ME.el('div', { text: 'Working out a 3D shape…' }));
      /* Let the spinner paint before the (synchronous) generator blocks. */
      setTimeout(() => {
        const mf = generate3D(source.mol, source.key);
        if (!mf) {
          ME.clear(overlay);
          overlay.appendChild(ME.el('div', {}, [
            ME.el('p', { text: 'No 3D shape available for this one.' }),
            ME.el('p', { class: 'note', text: source.why || 'Some structures — salts, polymers and very large molecules — have no single 3D arrangement to show.' }),
          ]));
          return;
        }
        start(mf);
      }, 60);
      return { ok: true, pending: true };
    }

    if (!molfile) {
      overlay.appendChild(ME.el('div', {}, [
        ME.el('p', { text: 'No 3D shape available for this one.' }),
        ME.el('p', { class: 'note', text: source.why || 'Salts and network solids like table salt are endless repeating grids, not single molecules, so there is no one shape to rotate.' }),
      ]));
      return { ok: false };
    }

    return start(molfile);

    function start(mf) {
      let viewer;
      try {
        viewer = $3D.createViewer(host, { backgroundColor: surfaceColor(), antialias: true });
        viewer.addModel(mf, 'sdf');
        applyStyle(viewer, opts.style || 'ballstick');
        viewer.zoomTo();
        viewer.render();
        viewer.zoom(1.1, 400);
      } catch (e) {
        ME.clear(host);
        host.appendChild(ME.el('div', { class: 'overlay', text: 'This browser could not open a 3D view (WebGL may be switched off).' }));
        return { ok: false };
      }
      overlay.classList.add('hide');

      const api = {
        ok: true,
        viewer,
        setStyle(name) { applyStyle(viewer, name); viewer.render(); },
        spin(on) { viewer.spin(on ? 'y' : false); },
        reset() { viewer.zoomTo(); viewer.render(); },
        refreshTheme() {
          try { viewer.setBackgroundColor(surfaceColor()); applyStyle(viewer, api.__style); viewer.render(); }
          catch (e) { /* the viewer may already be gone */ }
        },
        dispose() { try { viewer.clear(); } catch (e) { /* nothing to do */ } },
        molfile: mf,
      };
      api.__style = opts.style || 'ballstick';
      return api;
    }

    function applyStyle(viewer, name) {
      const cs = { prop: 'elem', map: colorMap() };
      viewer.setStyle({}, {});
      if (name === 'spacefill') {
        viewer.setStyle({}, { sphere: { colorscheme: cs } });
      } else if (name === 'stick') {
        viewer.setStyle({}, { stick: { radius: 0.13, colorscheme: cs } });
      } else {
        viewer.setStyle({}, {
          stick: { radius: 0.11, colorscheme: cs },
          sphere: { scale: 0.24, colorscheme: cs },
        });
      }
    }
  }

  ME.render3d = { mount, molfileFromPacked, generate3D, available: () => !!lib() };
})();
