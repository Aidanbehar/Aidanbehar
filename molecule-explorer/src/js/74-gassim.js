/* The Gas Simulator tab.
 *
 * A box of particles you can squeeze, heat and fill, with all four gas
 * variables live. The point is that PV = nRT stops being an equation to
 * memorise once you have watched the particles do it: pull the piston out and
 * you can see the hits on the wall get rarer.
 *
 * Every number shown goes through ME.gas and ME.fmt, so the simulation, the
 * equation panel and the graphs cannot disagree with each other.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;
  const G = () => ME.gas;
  const F = () => ME.fmt;

  /* Which units each variable offers, in the order a reader expects. */
  const UNIT_CHOICES = {
    P: ['atm', 'kPa', 'Pa', 'bar', 'mmHg', 'torr', 'psi'],
    V: ['L', 'mL', 'm3', 'cm3', 'dm3', 'gal', 'ft3'],
    T: ['K', 'C', 'F'],
    n: ['mol', 'mmol', 'particles', 'g'],
  };

  const VAR = {
    P: { label: 'Pressure', dim: 'pressure', symbol: 'P' },
    V: { label: 'Volume', dim: 'volume', symbol: 'V' },
    T: { label: 'Temperature', dim: 'temperature', symbol: 'T' },
    n: { label: 'Amount', dim: 'amount', symbol: 'n' },
  };

  const PRESETS = [
    { name: 'Room temperature, one mole', si: { P: 101325, V: 0.0244, n: 1, T: 293.15 }, gas: 'air',
      derive: 'V',
      why: 'A mole of air at room temperature and normal pressure. About 24 litres — a bit more than a bucket.' },
    { name: 'Car tyre on a cold morning', si: { P: 240000, V: 0.015, n: 1.48, T: 273.15 }, gas: 'air', hold: ['V', 'n'],
      derive: 'n',
      why: 'A tyre is a fixed volume, so when the night cools the air inside, the pressure drops and the tyre reads low. Nothing leaked. Warm it back up on the motorway and the pressure comes back.' },
    { name: 'Balloon in the freezer', si: { P: 101325, V: 0.002, n: 0.083, T: 293.15 }, gas: 'He', hold: ['P', 'n'],
      derive: 'n',
      why: 'A balloon holds its pressure and changes size instead. Drag the temperature down to 255 K and watch it shrink — that is Charles’s law in a freezer.' },
    { name: 'Scuba tank', si: { P: 20000000, V: 0.012, n: 98, T: 293.15 }, gas: 'air', hold: ['V', 'T'],
      derive: 'n',
      why: 'Twelve litres at 200 atmospheres. This is also where the ideal gas law starts to creak — switch on the real-gas comparison and see how far off it is.' },
    { name: 'Hot air balloon', si: { P: 101325, V: 2800, n: 88000, T: 373.15 }, gas: 'air', hold: ['P', 'V'],
      derive: 'n',
      why: 'Heating the air pushes some of it out of the open bottom, so what is left is less dense than the air outside. That density difference is the whole lift.' },
    { name: 'Fizzy drink can', si: { P: 250000, V: 0.00002, n: 0.0021, T: 277.15 }, gas: 'CO2', hold: ['V', 'T'],
      derive: 'n',
      why: 'The gap above the drink holds carbon dioxide at about 2.5 atmospheres. Open it and the pressure drops to one, so the gas that was dissolved has nowhere to stay.' },
  ];

  const St = {
    built: false, host: null, running: false, raf: null,
    /* the physical state, always in SI */
    si: { P: 101325, V: 0.0244, n: 1, T: 293.15 },
    gasKey: 'air',
    hold: { P: false, V: false, n: true, T: true },
    units: { P: 'atm', V: 'L', T: 'C', n: 'mol' },
    realGas: false,
    particles: [], flashes: [], pistonX: 0.78,
    history: { PV: [], VT: [], PT: [] },
    fields: {}, lastChanged: 'V',
  };

  /* ----------------------------------------------------------- persistence */
  function loadPrefs() {
    const u = ME.store.get('gasUnits', null);
    if (u && typeof u === 'object') {
      Object.keys(St.units).forEach((k) => { if (UNIT_CHOICES[k].indexOf(u[k]) >= 0) St.units[k] = u[k]; });
    }
    const g = ME.store.get('gasKey', null);
    if (g && G().gas(g).key === g) St.gasKey = g;
  }
  function savePrefs() {
    ME.store.set('gasUnits', St.units);
    ME.store.set('gasKey', St.gasKey);
  }

  /* -------------------------------------------------------------- display */
  /* A variable's value in the unit the reader picked. Amount in grams needs
   * the gas's molar mass, which is why it cannot be a plain conversion. */
  function shown(key) {
    const unit = St.units[key];
    if (key === 'n' && unit === 'g') return G().molesToGrams(St.si.n, St.gasKey);
    if (key === 'n') return F().convert(St.si.n, 'mol', unit);
    const dim = VAR[key].dim;
    return F().convert(St.si[key], G().baseOf(dim), unit);
  }

  /* And the other way, when they type into a box. */
  function toSI(key, value) {
    const unit = St.units[key];
    if (key === 'n' && unit === 'g') return G().gramsToMoles(value, St.gasKey);
    if (key === 'n') return F().convert(value, unit, 'mol');
    return F().convert(value, unit, G().baseOf(VAR[key].dim));
  }

  /* ------------------------------------------------------------ the physics */
  /* One variable has been changed. Something has to give, and which one is
   * decided by what the reader has chosen to hold still. */
  function apply(changed, newSI) {
    const free = ['P', 'V', 'n', 'T'].filter((k) => k !== changed && !St.hold[k]);
    if (!free.length) {
      ME.toast('Everything else is held, so nothing can respond. Unlock one of them.');
      return false;
    }
    /* Prefer to move the one the reader did not touch last, so repeated drags
     * keep pushing the same variable around rather than ping-ponging. */
    const respond = free.indexOf(St.lastChanged) >= 0 && free.length > 1
      ? free.filter((k) => k !== St.lastChanged)[0]
      : free[0];

    const trial = Object.assign({}, St.si);
    trial[changed] = newSI;
    trial[respond] = G().solveSI(trial, respond);

    if (!isFinite(trial[respond]) || trial[respond] <= 0) {
      ME.toast('That would need ' + VAR[respond].label.toLowerCase() + ' to be zero or negative, which cannot happen.');
      return false;
    }
    St.si = trial;
    St.lastChanged = changed;
    return true;
  }

  /* PV = nRT means a gas has three degrees of freedom, not four. Any state
   * written out with all four numbers by hand will be slightly wrong, and the
   * equation panel will show PV and nRT disagreeing - which it did, by 1.4%,
   * from the very first frame. So every state gets one variable recomputed
   * from the other three before it is shown. */
  function enforce(preferred) {
    const order = (preferred ? [preferred] : []).concat(['V', 'P', 'T', 'n']);
    const solveFor = order.filter((k) => !St.hold[k])[0] || 'V';
    const v = G().solveSI(St.si, solveFor);
    if (isFinite(v) && v > 0) St.si[solveFor] = v;
    return solveFor;
  }

  function setVar(key, displayValue) {
    const si = toSI(key, displayValue);
    if (si === null || !isFinite(si)) return;

    /* Guardrails that teach rather than just refuse. */
    if (key === 'T' && si <= 0) {
      ME.toast('Nothing can be colder than 0 K. That is not a limit of the equipment — temperature measures how much the particles are moving, and at 0 K they have stopped. There is no less than stopped.');
      syncFields();
      return;
    }
    if (si <= 0) { syncFields(); return; }

    if (St.hold[key]) St.hold[key] = false;
    if (!apply(key, si)) { syncFields(); return; }
    reseedParticles();
    syncAll();
  }

  /* --------------------------------------------------------------- build */
  function build(host) {
    St.host = host;
    loadPrefs();
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Gas Simulator' }));
    wrap.appendChild(el('p', { class: 'note gs-intro' },
      'Four numbers describe a gas completely: how hard it pushes, how much room it has, how hot it is, and how much of it there is. Change one and something else has to move. Pick what to hold still, then drag.'));

    const layout = el('div', { class: 'gs-layout' });

    /* left: the box */
    const left = el('div', { class: 'gs-left' });
    St.canvas = el('canvas', { class: 'gs-canvas', width: '760', height: '470' });
    left.appendChild(el('div', { class: 'gs-canvas-wrap' }, [St.canvas]));
    St.readout = el('div', { class: 'gs-readout' });
    left.appendChild(St.readout);
    layout.appendChild(left);

    /* right: the controls */
    const right = el('div', { class: 'gs-right' });
    right.appendChild(gasPicker());
    right.appendChild(lawPresets());
    ['P', 'V', 'T', 'n'].forEach((k) => right.appendChild(control(k)));
    right.appendChild(extras());
    layout.appendChild(right);

    /* The equation and the graphs go in the left column under the box, because
     * the four controls make the right column much the taller of the two and
     * the space would otherwise just sit there empty. */
    left.appendChild(equationPanel());
    left.appendChild(graphPanel());

    wrap.appendChild(layout);
    wrap.appendChild(scenarioPanel());
    host.appendChild(wrap);
    St.built = true;

    St.ctx = St.canvas.getContext('2d');
    enforce('V');
    reseedParticles();
    syncAll();
    bindPiston();
  }

  /* -------------------------------------------------------------- controls */
  function control(key) {
    const v = VAR[key];
    const card = el('div', { class: 'card card-pad gs-ctrl', 'data-var': key });

    const head = el('div', { class: 'gs-ctrl-head' });
    head.appendChild(el('span', { class: 'gs-sym', text: v.symbol }));
    head.appendChild(el('span', { class: 'gs-name', text: v.label }));

    const lock = el('button', { class: 'gs-lock', title: 'Hold this one still' });
    lock.appendChild(el('span', { class: 'gs-lock-dot' }));
    lock.appendChild(el('span', { class: 'gs-lock-text', text: 'hold' }));
    lock.addEventListener('click', () => {
      const wouldHold = ['P', 'V', 'n', 'T'].filter((k) => St.hold[k] || k === key).length;
      if (!St.hold[key] && wouldHold > 3) {
        ME.toast('Three held at once already fixes the fourth. Release one first.');
        return;
      }
      St.hold[key] = !St.hold[key];
      syncAll();
    });
    head.appendChild(lock);
    card.appendChild(head);

    const row = el('div', { class: 'gs-ctrl-row' });
    const input = el('input', { class: 'gs-num', type: 'text', inputmode: 'decimal',
      'aria-label': v.label + ' value' });
    input.addEventListener('change', () => {
      const q = F().parseQuantity(input.value);
      if (q) setVar(key, q.value); else syncFields();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    row.appendChild(input);

    const select = el('select', { class: 'gs-unit', 'aria-label': v.label + ' unit' });
    UNIT_CHOICES[key].forEach((u) => {
      const label = u === 'g' ? 'g' : F().unitLabel(u);
      select.appendChild(el('option', { value: u, text: label, selected: u === St.units[key] || null }));
    });
    select.addEventListener('change', () => {
      /* Changing a unit only changes how the number is written. The gas in the
       * box is untouched, which is worth being strict about. */
      St.units[key] = select.value;
      savePrefs();
      syncAll();
      ME.toast('Showing ' + v.label.toLowerCase() + ' in ' + (select.value === 'g' ? 'grams' : F().unitLabel(select.value)) + '. The gas itself has not changed.');
    });
    row.appendChild(select);
    card.appendChild(row);

    const slider = el('input', { type: 'range', class: 'gs-slider', min: '0', max: '1000', value: '500',
      'aria-label': v.label + ' slider' });
    slider.addEventListener('input', () => {
      const r = sliderRange(key);
      const frac = slider.value / 1000;
      /* Logarithmic, because pressure and volume span orders of magnitude and
       * a linear slider would spend its whole travel in the top decade. */
      const si = r.log
        ? r.min * Math.pow(r.max / r.min, frac)
        : r.min + frac * (r.max - r.min);
      if (St.hold[key]) St.hold[key] = false;
      if (apply(key, si)) { reseedParticles(); syncAll(); } else syncFields();
    });
    card.appendChild(slider);

    St.fields[key] = { input: input, slider: slider, select: select, lock: lock, card: card };
    return card;
  }

  /* Sensible ranges, in SI, for each slider. */
  function sliderRange(key) {
    switch (key) {
      case 'P': return { min: 1000, max: 5e7, log: true };
      case 'V': return { min: 1e-5, max: 5, log: true };
      case 'T': return { min: 20, max: 1200, log: false };
      case 'n': return { min: 0.005, max: 200, log: true };
      default: return { min: 0, max: 1 };
    }
  }

  function gasPicker() {
    const card = el('div', { class: 'card card-pad gs-gas' });
    card.appendChild(el('h3', { class: 'section-head', text: 'Which gas' }));
    const grid = el('div', { class: 'gs-gas-grid' });
    G().GASES.forEach((g) => {
      const b = el('button', { class: 'gs-gas-btn' + (g.key === St.gasKey ? ' on' : ''), 'data-gas': g.key });
      b.appendChild(el('span', { class: 'gs-dot', style: { background: g.colour } }));
      b.appendChild(el('span', { text: g.name }));
      b.appendChild(el('span', { class: 'gs-mm', text: ME.fmt.fmt(G().molarMass(g.key), 4) }));
      b.addEventListener('click', () => {
        const wasGrams = St.units.n === 'g';
        St.gasKey = g.key;
        savePrefs();
        reseedParticles();
        syncAll();
        ME.toast(g.name + ' at ' + ME.fmt.fmt(G().molarMass(g.key), 4) + ' g/mol. ' +
          (wasGrams ? 'The amount is shown in grams, so the number changed — same number of particles, different mass.' :
            'Same number of particles, so P, V, n and T are all unchanged. Only the speed on screen is different.'));
      });
      grid.appendChild(b);
    });
    card.appendChild(grid);
    St.gasNote = el('p', { class: 'note gs-gas-note' });
    card.appendChild(St.gasNote);
    return card;
  }

  function lawPresets() {
    const card = el('div', { class: 'card card-pad gs-laws' });
    card.appendChild(el('h3', { class: 'section-head', text: 'Hold two, and you have a law' }));
    card.appendChild(el('p', { class: 'note',
      text: 'Each of the named gas laws is just PV = nRT with two things pinned. Pick one and the locks are set for you.' }));
    const list = el('div', { class: 'gs-law-list' });
    G().LAWS.forEach((law) => {
      const b = el('button', { class: 'gs-law', 'data-law': law.key });
      b.appendChild(el('span', { class: 'gs-law-name', text: law.name }));
      b.appendChild(el('span', { class: 'gs-law-rel', text: law.relation }));
      b.addEventListener('click', () => {
        ['P', 'V', 'n', 'T'].forEach((k) => { St.hold[k] = law.hold.indexOf(k) >= 0; });
        St.lastChanged = law.vary[0];
        St.activeLaw = law;
        syncAll();
      });
      list.appendChild(b);
    });
    card.appendChild(list);
    St.lawNote = el('div', { class: 'gs-law-note' });
    card.appendChild(St.lawNote);
    return card;
  }

  function extras() {
    const card = el('div', { class: 'card card-pad gs-extras' });
    const real = el('label', { class: 'switch' });
    const cb = el('input', { type: 'checkbox' });
    cb.addEventListener('change', () => { St.realGas = cb.checked; syncAll(); });
    real.appendChild(cb);
    real.appendChild(el('span', { text: 'Compare with a real gas' }));
    card.appendChild(real);
    card.appendChild(el('p', { class: 'note', style: { marginTop: '6px' },
      text: 'The ideal gas law pretends particles have no size and ignore each other. Switch this on to see how far that is from the truth for the gas and conditions you have set.' }));
    const reset = el('button', { class: 'btn btn-sm', style: { marginTop: '10px' }, text: 'Reset' });
    reset.addEventListener('click', () => {
      St.si = { P: 101325, V: 0.0244, n: 1, T: 293.15 };
      St.hold = { P: false, V: false, n: true, T: true };
      St.realGas = false; cb.checked = false;
      St.activeLaw = null;
      enforce('V');
      reseedParticles(); syncAll();
    });
    card.appendChild(reset);
    return card;
  }

  /* --------------------------------------------------------- equation panel */
  function equationPanel() {
    const card = el('div', { class: 'card card-pad gs-eq' });
    card.appendChild(el('h3', { text: 'PV = nRT, with your numbers in it' }));
    St.eqBody = el('div', { class: 'gs-eq-body' });
    card.appendChild(St.eqBody);
    return card;
  }

  function renderEquation() {
    ME.clear(St.eqBody);
    const u = St.units;
    const R = F().gasConstant(u.P, u.V, u.n === 'g' ? 'mol' : u.n);

    /* the symbolic form */
    const line = el('div', { class: 'gs-eq-line' });
    ['P', 'V', '=', 'n', 'R', 'T'].forEach((t) => {
      line.appendChild(el('span', { class: t === '=' ? 'op' : 'sym', text: t }));
    });
    St.eqBody.appendChild(line);

    /* the numbers, in the reader's units */
    const nums = el('div', { class: 'gs-eq-nums' });
    const cell = (label, value, unit) => el('div', { class: 'gs-eq-cell' }, [
      el('div', { class: 'k', text: label }),
      el('div', { class: 'v', text: ME.fmt.fmt(value, 4) }),
      el('div', { class: 'u', text: unit }),
    ]);
    nums.appendChild(cell('P', shown('P'), F().unitLabel(u.P)));
    nums.appendChild(cell('V', shown('V'), F().unitLabel(u.V)));
    nums.appendChild(el('div', { class: 'gs-eq-op', text: '=' }));
    nums.appendChild(cell('n', u.n === 'g' ? St.si.n : shown('n'), 'mol'));
    nums.appendChild(cell('R', R, ''));
    nums.appendChild(cell('T', St.si.T, 'K'));
    St.eqBody.appendChild(nums);

    const lhs = shown('P') * shown('V');
    const rhs = (u.n === 'g' ? St.si.n : shown('n')) * R * St.si.T;
    const check = el('div', { class: 'gs-eq-check' });
    check.appendChild(el('span', { text: 'PV = ' + ME.fmt.fmt(lhs, 5) }));
    check.appendChild(el('span', { class: 'op', text: Math.abs(lhs - rhs) < Math.abs(lhs) * 1e-6 ? '=' : '≈' }));
    check.appendChild(el('span', { text: 'nRT = ' + ME.fmt.fmt(rhs, 5) }));
    St.eqBody.appendChild(check);

    /* R depends on the units, which is the thing nobody tells you */
    St.eqBody.appendChild(el('p', { class: 'note' }, [
      'R is ', el('strong', { text: ME.fmt.fmt(R, 6) }), ' ',
      el('span', { class: 'gs-runit', text: F().unitLabel(u.P) + '·' + F().unitLabel(u.V) + ' / (mol·K)' }),
      '. There is nothing to memorise here: R is one number, ', el('strong', { text: '8.314462 J/(mol·K)' }),
      ', and every other version of it is that number wearing different units. Change a unit above and watch it follow.',
    ]));

    /* the conversions actually being done, including the kelvin one */
    const conv = el('div', { class: 'gs-conv' });
    let any = false;
    if (St.units.T !== 'K') {
      any = true;
      conv.appendChild(el('div', { class: 'gs-conv-row' }, [
        el('code', { text: ME.fmt.fmt(shown('T'), 4) + ' ' + F().unitLabel(St.units.T) + ' → ' + ME.fmt.fmt(St.si.T, 5) + ' K' }),
        el('span', { class: 'note', text: 'Temperature must go in as kelvin. The law says volume is proportional to temperature, and a proportion only works if zero means zero — at 0 °C the particles still have plenty of motion left, so doubling from 10 °C to 20 °C does not double anything. From 283 K to 293 K it is a 3.5% change, which is what actually happens.' }),
      ]));
    }
    if (St.units.n === 'g') {
      any = true;
      conv.appendChild(el('div', { class: 'gs-conv-row' }, [
        el('code', { text: ME.fmt.fmt(shown('n'), 4) + ' g ÷ ' + ME.fmt.fmt(G().molarMass(St.gasKey), 4) + ' g/mol = ' + ME.fmt.fmt(St.si.n, 4) + ' mol' }),
        el('span', { class: 'note', text: 'Grams are not an amount the gas laws understand — they count particles, not mass. Dividing by the molar mass turns one into the other, and it is the only place in this panel where which gas you picked makes any difference.' }),
      ]));
    }
    if (any) {
      St.eqBody.appendChild(el('h4', { class: 'section-head', text: 'Conversions being done for you' }));
      St.eqBody.appendChild(conv);
    }

    if (St.realGas) St.eqBody.appendChild(realGasPanel());
  }

  function realGasPanel() {
    const box = el('div', { class: 'gs-real' });
    const r = G().nonIdeal(St.si, St.gasKey);
    if (!r) {
      box.appendChild(el('p', { class: 'note', text: 'At this volume the particles would be overlapping, which the van der Waals equation cannot describe either. It is a liquid by now.' }));
      return box;
    }
    const u = St.units.P;
    const ideal = F().convert(r.ideal, 'Pa', u), real = F().convert(r.real, 'Pa', u);
    box.appendChild(el('h4', { class: 'section-head', text: 'Ideal against real' }));
    const grid = el('div', { class: 'gs-real-grid' });
    grid.appendChild(el('div', {}, [el('div', { class: 'k', text: 'Ideal gas law says' }),
      el('div', { class: 'v', text: ME.fmt.fmt(ideal, 5) + ' ' + F().unitLabel(u) })]));
    grid.appendChild(el('div', {}, [el('div', { class: 'k', text: 'van der Waals says' }),
      el('div', { class: 'v', text: ME.fmt.fmt(real, 5) + ' ' + F().unitLabel(u) })]));
    grid.appendChild(el('div', {}, [el('div', { class: 'k', text: 'Difference' }),
      el('div', { class: 'v' + (r.matters ? ' warn' : ''), text: (r.percent > 0 ? '+' : '') + ME.fmt.fmt(r.percent, 3) + '%' })]));
    box.appendChild(grid);
    box.appendChild(el('p', { class: 'note', text: r.matters
      ? 'More than a couple of percent out, so the ideal gas law is starting to lie here. Two things it ignores are catching up: the particles do take up room, which leaves less space than the container suggests, and they do pull on each other, which softens their landing on the wall. Squeeze harder or cool further and it gets worse.'
      : 'Under a couple of percent apart, so the ideal gas law is doing fine. It works because at everyday pressures the particles are so far apart that their own size and their attraction to each other genuinely do not matter much.' }));
    box.appendChild(el('p', { class: 'note gs-src', text: G().VDW.source + ' These are tabulated measurements, not something this app can derive.' }));
    return box;
  }

  /* -------------------------------------------------------------- graphs */
  function graphPanel() {
    const card = el('div', { class: 'card card-pad gs-graphs' });
    card.appendChild(el('h3', { text: 'What the numbers look like' }));
    card.appendChild(el('p', { class: 'note',
      text: 'The first three plot themselves as you drag. A straight line through the origin means directly proportional; a curve that never touches the axes means inversely proportional.' }));
    const grid = el('div', { class: 'gs-graph-grid' });
    St.graphs = {};
    [['PV', 'P against V', 'V', 'P'], ['VT', 'V against T', 'T (K)', 'V'],
     ['PT', 'P against T', 'T (K)', 'P'], ['speed', 'How fast the particles are going', 'speed (m/s)', 'share']]
      .forEach(([key, title, xl, yl]) => {
        const holder = el('div', { class: 'gs-graph' });
        holder.appendChild(el('div', { class: 'gs-graph-title', text: title }));
        const c = el('canvas', { width: '340', height: '210' });
        holder.appendChild(c);
        holder.appendChild(el('div', { class: 'gs-graph-axes', text: xl + '  →   ↑ ' + yl }));
        grid.appendChild(holder);
        St.graphs[key] = c;
      });
    card.appendChild(grid);
    return card;
  }

  function scenarioPanel() {
    const card = el('div', { class: 'card card-pad gs-presets' });
    card.appendChild(el('h3', { text: 'Try a real situation' }));
    const list = el('div', { class: 'gs-preset-list' });
    PRESETS.forEach((p) => {
      const b = el('button', { class: 'gs-preset' });
      b.appendChild(el('span', { class: 'gs-preset-name', text: p.name }));
      b.appendChild(el('span', { class: 'note', text: p.why }));
      b.addEventListener('click', () => {
        St.si = Object.assign({}, p.si);
        St.gasKey = p.gas;
        if (p.hold) ['P', 'V', 'n', 'T'].forEach((k) => { St.hold[k] = p.hold.indexOf(k) >= 0; });
        St.activeLaw = null;
        /* The scenario numbers are written from life, so one of them gets
         * recomputed to make the state obey the law exactly. */
        enforce(p.derive || 'n');
        clearHistory();
        reseedParticles();
        syncAll();
        St.canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      list.appendChild(b);
    });
    card.appendChild(list);
    return card;
  }

  /* ------------------------------------------------------------ particles */
  /* Particle count is proportional to moles, capped so the animation stays
   * smooth. Speed is scaled from the real rms speed, so a heavy gas visibly
   * moves slower at the same temperature. */
  function particleCount() {
    return Math.max(6, Math.min(260, Math.round(18 * Math.pow(St.si.n, 0.55) * 6)));
  }

  function reseedParticles() {
    const want = particleCount();
    const g = G().gas(St.gasKey);
    const speed = visualSpeed();
    while (St.particles.length > want) St.particles.pop();
    while (St.particles.length < want) {
      St.particles.push({
        x: Math.random() * 0.94 + 0.02, y: Math.random() * 0.94 + 0.03,
        a: Math.random() * Math.PI * 2, r: 3 + Math.min(4, g.atoms * 0.6),
      });
    }
    St.particles.forEach((p) => {
      p.vx = Math.cos(p.a) * speed * (0.75 + Math.random() * 0.5);
      p.vy = Math.sin(p.a) * speed * (0.75 + Math.random() * 0.5);
    });
    /* The piston sits where the volume says it does, on a log scale so the
     * whole useful range fits in the box. */
    const r = sliderRange('V');
    const frac = Math.log(St.si.V / r.min) / Math.log(r.max / r.min);
    St.pistonX = Math.max(0.12, Math.min(0.97, 0.12 + frac * 0.85));
  }

  function visualSpeed() {
    const rms = G().rmsSpeed(St.si.T, St.gasKey) || 400;
    return Math.max(0.0006, Math.min(0.02, rms / 90000));
  }

  function bindPiston() {
    let dragging = false;
    const xy = (e) => {
      const b = St.canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return (t.clientX - b.left) / b.width;
    };
    const near = (fx) => Math.abs(fx - St.pistonX) < 0.05;
    const move = (e) => {
      if (!dragging) return;
      e.preventDefault();
      const fx = Math.max(0.12, Math.min(0.97, xy(e)));
      const r = sliderRange('V');
      const frac = (fx - 0.12) / 0.85;
      const si = r.min * Math.pow(r.max / r.min, frac);
      if (St.hold.V) St.hold.V = false;
      if (apply('V', si)) { reseedParticles(); syncAll(); }
    };
    const down = (e) => { if (near(xy(e))) { dragging = true; move(e); } };
    const up = () => { dragging = false; };
    St.canvas.addEventListener('mousedown', down);
    St.canvas.addEventListener('touchstart', down, { passive: false });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    St.canvas.addEventListener('mousemove', (e) => {
      St.canvas.style.cursor = near(xy(e)) ? 'ew-resize' : 'default';
    });
  }

  function step() {
    const c = St.ctx, W = St.canvas.width, H = St.canvas.height;
    const g = G().gas(St.gasKey);
    const style = getComputedStyle(document.body);
    const bg = style.getPropertyValue('--surface-2').trim() || '#f6f7fa';
    const wall = style.getPropertyValue('--border-strong').trim() || '#cbd1dc';
    const textFaint = style.getPropertyValue('--text-faint').trim() || '#878d9b';

    c.clearRect(0, 0, W, H);
    const px = St.pistonX * W;

    /* the container */
    c.fillStyle = bg;
    c.fillRect(0, 0, px, H);
    c.strokeStyle = wall;
    c.lineWidth = 2;
    c.strokeRect(1, 1, px - 2, H - 2);

    /* wall-hit flashes: pressure you can see */
    St.flashes = St.flashes.filter((f) => f.life > 0);
    St.flashes.forEach((f) => {
      c.globalAlpha = Math.min(1, f.life / 12) * 0.55;
      c.fillStyle = g.colour;
      c.beginPath();
      c.arc(f.x * px, f.y * H, 9 * (1 - f.life / 14) + 3, 0, Math.PI * 2);
      c.fill();
      f.life--;
    });
    c.globalAlpha = 1;

    /* the particles */
    const speed = visualSpeed();
    St.particles.forEach((p) => {
      const sp = Math.hypot(p.vx, p.vy) || 1;
      p.vx = (p.vx / sp) * speed; p.vy = (p.vy / sp) * speed;
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0.012) { p.x = 0.012; p.vx = Math.abs(p.vx); hit(p); }
      if (p.x > 0.988) { p.x = 0.988; p.vx = -Math.abs(p.vx); hit(p); }
      if (p.y < 0.016) { p.y = 0.016; p.vy = Math.abs(p.vy); hit(p); }
      if (p.y > 0.984) { p.y = 0.984; p.vy = -Math.abs(p.vy); hit(p); }
      c.fillStyle = g.colour;
      c.beginPath();
      c.arc(p.x * px, p.y * H, p.r, 0, Math.PI * 2);
      c.fill();
    });

    /* the piston */
    c.fillStyle = wall;
    c.fillRect(px - 5, 0, 10, H);
    c.fillRect(px, H / 2 - 22, Math.min(46, W - px - 4), 44);
    c.fillStyle = textFaint;
    c.font = '600 12px system-ui, sans-serif';
    c.textAlign = 'center';
    for (let i = -1; i <= 1; i++) c.fillRect(px - 2, H / 2 + i * 8 - 1, 4, 2);
    if (px < W - 70) c.fillText('drag', px + 24, H / 2 + 34);

    if (St.running) St.raf = requestAnimationFrame(step);
  }

  function hit(p) { if (St.flashes.length < 40) St.flashes.push({ x: p.x, y: p.y, life: 14 }); }

  /* --------------------------------------------------------------- sync */
  function syncFields() {
    Object.keys(St.fields).forEach((k) => {
      const f = St.fields[k];
      const val = shown(k);
      f.input.value = ME.fmt.fmt(val, k === 'n' && St.units.n === 'particles' ? 3 : 4);
      const r = sliderRange(k);
      const frac = r.log
        ? Math.log(St.si[k] / r.min) / Math.log(r.max / r.min)
        : (St.si[k] - r.min) / (r.max - r.min);
      f.slider.value = String(Math.max(0, Math.min(1000, Math.round(frac * 1000))));
      f.card.classList.toggle('held', !!St.hold[k]);
      f.lock.classList.toggle('on', !!St.hold[k]);
      if (f.select.value !== St.units[k]) f.select.value = St.units[k];
    });
  }

  function syncAll() {
    syncFields();
    renderEquation();
    renderReadout();
    renderGasNote();
    renderLawNote();
    ME.$$('.gs-gas-btn', St.host).forEach((b) => b.classList.toggle('on', b.dataset.gas === St.gasKey));
    ME.$$('.gs-law', St.host).forEach((b) =>
      b.classList.toggle('on', !!St.activeLaw && b.dataset.law === St.activeLaw.key));
    recordHistory();
    drawGraphs();
  }

  function renderReadout() {
    ME.clear(St.readout);
    const rms = G().rmsSpeed(St.si.T, St.gasKey);
    const items = [
      ['Particles on screen', String(St.particles.length) + ' of ' + ME.fmt.sciText(St.si.n * F().CONST.NA, 3)],
      ['Typical speed', ME.fmt.fmt(rms, 3) + ' m/s'],
      ['Density', ME.fmt.fmt((St.si.n * G().molarMass(St.gasKey)) / (St.si.V * 1000), 3) + ' g/L'],
    ];
    items.forEach(([k, v]) => {
      St.readout.appendChild(el('div', { class: 'gs-ro' }, [
        el('span', { class: 'k', text: k }), el('span', { class: 'v', text: v }),
      ]));
    });
  }

  function renderGasNote() {
    const g = G().gas(St.gasKey);
    const rms = G().rmsSpeed(St.si.T, St.gasKey);
    const ref = G().rmsSpeed(St.si.T, 'H2');
    ME.clear(St.gasNote);
    St.gasNote.appendChild(document.createTextNode(
      g.name + ' is ' + ME.fmt.fmt(G().molarMass(g.key), 4) + ' g/mol, so at this temperature its particles average ' +
      ME.fmt.fmt(rms, 3) + ' m/s — ' +
      (St.gasKey === 'H2' ? 'the fastest of any gas, because it is the lightest.'
        : ME.fmt.fmt(ref / rms, 2) + ' times slower than hydrogen. Heavier particles move slower at the same temperature, because temperature sets their energy and energy is mass times speed squared. ') +
      (g.note ? '' : 'Swapping the gas changes nothing in PV = nRT: the law never asks what the particles are.')));
    if (g.note) St.gasNote.appendChild(el('span', { text: ' ' + g.note }));
  }

  function renderLawNote() {
    ME.clear(St.lawNote);
    const held = ['P', 'V', 'n', 'T'].filter((k) => St.hold[k]);
    if (!St.activeLaw) {
      St.lawNote.appendChild(el('p', { class: 'note', text: held.length
        ? 'Holding ' + held.map((k) => VAR[k].symbol).join(' and ') + '. Change anything else and whichever variable is still free will move to keep PV = nRT true.'
        : 'Nothing held. Change one variable and another will move to compensate — lock a couple to control which.' }));
      return;
    }
    const law = St.activeLaw;
    const box = el('div', { class: 'callout' });
    box.appendChild(el('strong', { text: law.name + ': ' + law.relation }));
    box.appendChild(el('p', { text: law.plain }));
    box.appendChild(el('p', { class: 'gs-law-why', text: law.why }));
    box.appendChild(el('p', { class: 'note', text: 'Holding ' + law.hold.map((k) => VAR[k].label.toLowerCase()).join(' and ') +
      ' still. Now drag ' + law.vary.map((k) => VAR[k].label.toLowerCase()).join(' or ') + ' and watch the other one answer.' }));
    St.lawNote.appendChild(box);
  }

  /* ------------------------------------------------------------- history */
  function clearHistory() { St.history = { PV: [], VT: [], PT: [] }; }
  function recordHistory() {
    const push = (key, x, y) => {
      const list = St.history[key];
      const last = list[list.length - 1];
      if (last && Math.abs(last[0] - x) < 1e-12 && Math.abs(last[1] - y) < 1e-12) return;
      list.push([x, y]);
      if (list.length > 400) list.shift();
    };
    push('PV', St.si.V, St.si.P);
    push('VT', St.si.T, St.si.V);
    push('PT', St.si.T, St.si.P);
  }

  function drawGraphs() {
    drawScatter('PV', St.history.PV, 'V', 'P');
    drawScatter('VT', St.history.VT, 'T', 'V');
    drawScatter('PT', St.history.PT, 'T', 'P');
    drawSpeeds();
  }

  function drawScatter(key, pts, xKey, yKey) {
    const c = St.graphs[key];
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height, pad = 26;
    const style = getComputedStyle(document.body);
    const line = style.getPropertyValue('--border').trim() || '#e2e5ec';
    const accent = style.getPropertyValue('--accent').trim() || '#2f6df6';
    const faint = style.getPropertyValue('--text-faint').trim() || '#888';
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, 6); ctx.lineTo(pad, H - pad); ctx.lineTo(W - 6, H - pad); ctx.stroke();

    if (pts.length < 2) {
      ctx.fillStyle = faint;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('drag something to plot', W / 2, H / 2);
      return;
    }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = 0, x1 = Math.max.apply(null, xs) * 1.08;
    const y0 = 0, y1 = Math.max.apply(null, ys) * 1.08;
    const X = (v) => pad + ((v - x0) / (x1 - x0 || 1)) * (W - pad - 8);
    const Y = (v) => H - pad - ((v - y0) / (y1 - y0 || 1)) * (H - pad - 10);

    /* the path, in order of when it was visited */
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((p, i) => { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); });
    ctx.stroke();
    /* where it is now */
    const last = pts[pts.length - 1];
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(X(last[0]), Y(last[1]), 4, 0, Math.PI * 2); ctx.fill();
  }

  function drawSpeeds() {
    const c = St.graphs.speed;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height, pad = 26;
    const style = getComputedStyle(document.body);
    const line = style.getPropertyValue('--border').trim() || '#e2e5ec';
    const faint = style.getPropertyValue('--text-faint').trim() || '#888';
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, 6); ctx.lineTo(pad, H - pad); ctx.lineTo(W - 6, H - pad); ctx.stroke();

    const vmax = Math.max(400, (G().rmsSpeed(St.si.T, St.gasKey) || 400) * 2.6);
    const speeds = [];
    for (let i = 0; i <= 90; i++) speeds.push((i / 90) * vmax);
    const dist = G().speedDistribution(St.si.T, St.gasKey, speeds);
    if (!dist) return;
    const peak = Math.max.apply(null, dist) || 1;
    const X = (v) => pad + (v / vmax) * (W - pad - 8);
    const Y = (d) => H - pad - (d / peak) * (H - pad - 14);

    const g = G().gas(St.gasKey);
    ctx.fillStyle = g.colour + '44';
    ctx.strokeStyle = g.colour;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    speeds.forEach((v, i) => ctx.lineTo(X(v), Y(dist[i])));
    ctx.lineTo(X(vmax), Y(0));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    /* mark the rms speed */
    const rms = G().rmsSpeed(St.si.T, St.gasKey);
    ctx.strokeStyle = faint;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(X(rms), 8); ctx.lineTo(X(rms), H - pad); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = faint;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(rms) + ' m/s', Math.min(X(rms) + 4, W - 62), 18);
  }

  /* ------------------------------------------------------------ lifecycle */
  function ensureBuilt(host) { if (!St.built) build(host); }
  function resume() {
    if (!St.built || St.running) return;
    St.running = true;
    St.raf = requestAnimationFrame(step);
  }
  function pause() {
    St.running = false;
    if (St.raf) cancelAnimationFrame(St.raf);
    St.raf = null;
  }

  ME.gassim = { ensureBuilt, resume, pause, get state() { return St; } };
})();
