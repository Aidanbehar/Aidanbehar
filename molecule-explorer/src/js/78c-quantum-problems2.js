/* Problems for the broader quantum tab.
 *
 * Same contract as everything else in the practice registry: pick the numbers
 * first, then ask the engine for the answer, so a question and its grader
 * cannot drift apart. ME.practice.selfTest covers these along with the rest.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const Q = ME.quantum;
  const gen = ME.practice.generator;
  const fmt = (x, s) => ME.fmt.fmt(x, s || 4);
  const sci = (x, s) => ME.fmt.sciUnicode(x, s || 4);

  /* ------------------------------------------------- where it came from */
  gen('qm-wien', {
    make(r) {
      const T = r.pick([310, 800, 1100, 2800, 5772, 9000, 12000]);
      const w = Q.wienPeak(T);
      return {
        kind: 'numeric',
        q: 'An object at ' + T + ' K glows. At what wavelength does it radiate most strongly, '
          + 'in nanometres?',
        answer: w.lambdaNM, sig: 3, placeholder: 'nm',
        note: 'Wien: λT = 2.898 × 10⁻³ m·K. Watch the metres.',
        right: 'Yes — ' + Math.round(w.lambdaNM) + ' nm, which is ' + w.region + '.',
        wrong: 'λ = 2.898 × 10⁻³ / ' + T + ' = ' + sci(w.lambdaNM * 1e-9, 4)
          + ' m, which is ' + Math.round(w.lambdaNM) + ' nm.',
      };
    },
  });

  gen('qm-photoelectric', {
    make(r) {
      const metal = r.pick([['caesium', 2.1], ['sodium', 2.28], ['calcium', 2.87],
        ['zinc', 4.3], ['copper', 4.7], ['platinum', 5.6]]);
      const nm = r.int(180, 560);
      const pe = Q.photoelectric(nm, metal[1]);
      if (!pe.emits) {
        return {
          kind: 'numeric',
          q: nm + ' nm light falls on ' + metal[0] + ', whose work function is ' + metal[1]
            + ' eV. What is the maximum kinetic energy of the electrons that come off, in eV?',
          answer: 0, abs: 0.01, placeholder: 'eV',
          note: 'Work out the photon energy first and compare it with the toll.',
          right: 'Right — zero. The photon carries ' + fmt(pe.photonEV, 4)
            + ' eV, which is less than the ' + metal[1] + ' eV it costs to get out, so nothing '
            + 'comes off however bright the light is.',
          wrong: 'The photon has ' + fmt(pe.photonEV, 4) + ' eV and the work function is '
            + metal[1] + ' eV. Below threshold, so the answer is exactly zero.',
        };
      }
      return {
        kind: 'numeric',
        q: nm + ' nm light falls on ' + metal[0] + ', whose work function is ' + metal[1]
          + ' eV. What is the maximum kinetic energy of the electrons, in eV?',
        answer: pe.kineticEV, sig: 3, placeholder: 'eV',
        note: 'KE = hf − φ, and hf in eV is 1239.8/λ with λ in nm.',
        right: 'Yes — ' + fmt(pe.kineticEV, 4) + ' eV, and no amount of extra brightness '
          + 'changes it.',
        wrong: '1239.8/' + nm + ' = ' + fmt(pe.photonEV, 4) + ' eV, minus ' + metal[1]
          + ' eV, gives ' + fmt(pe.kineticEV, 4) + ' eV.',
      };
    },
  });

  gen('qm-threshold', {
    make(r) {
      const metal = r.pick([['caesium', 2.1], ['sodium', 2.28], ['zinc', 4.3], ['platinum', 5.6]]);
      const pe = Q.photoelectric(200, metal[1]);
      return {
        kind: 'numeric',
        q: 'What is the longest wavelength of light that will free an electron from ' + metal[0]
          + ', whose work function is ' + metal[1] + ' eV? Answer in nanometres.',
        answer: pe.thresholdNM, sig: 3, placeholder: 'nm',
        note: 'At threshold the photon has exactly enough and the electron leaves with nothing.',
        right: 'Yes — ' + Math.round(pe.thresholdNM) + ' nm. Anything longer and nothing '
          + 'happens at all.',
        wrong: 'λ = 1239.8/φ = 1239.8/' + metal[1] + ' = ' + Math.round(pe.thresholdNM) + ' nm.',
      };
    },
  });

  gen('qm-compton', {
    make(r) {
      const angle = r.pick([30, 45, 60, 90, 120, 180]);
      const nm = r.pick([0.01, 0.05, 0.0709, 0.1]);
      const cp = Q.compton(nm, angle);
      return {
        kind: 'numeric',
        q: 'An X-ray of wavelength ' + nm + ' nm scatters off an electron and comes away at '
          + angle + '°. By how much does its wavelength increase, in picometres?',
        answer: cp.shiftNM * 1000, sig: 3, placeholder: 'pm',
        note: 'Δλ = (h/mₑc)(1 − cos θ), and h/mₑc is 2.426 pm.',
        right: 'Yes — ' + fmt(cp.shiftNM * 1000, 4) + ' pm. Notice the starting wavelength '
          + 'never entered the sum.',
        wrong: '2.426 × (1 − cos ' + angle + '°) = ' + fmt(cp.shiftNM * 1000, 4)
          + ' pm. The shift depends only on the angle.',
      };
    },
  });

  gen('qm-debroglie', {
    make(r) {
      const volts = r.pick([50, 100, 250, 500, 1000, 5000, 20000]);
      const d = Q.deBroglieFromVolts(volts);
      return {
        kind: 'numeric',
        q: 'An electron is accelerated from rest through ' + volts + ' V. What is its de Broglie '
          + 'wavelength, in nanometres?',
        answer: d.lambdaNM, sig: 3, placeholder: 'nm',
        note: 'It gains ' + volts + ' eV of kinetic energy, so p = √(2mE), then λ = h/p.',
        right: 'Yes — ' + fmt(d.lambdaNM, 4) + ' nm.',
        wrong: 'E = ' + volts + ' eV = ' + sci(volts * ME.fmt.CONST.e, 4)
          + ' J, p = √(2mE), and λ = h/p = ' + fmt(d.lambdaNM, 4) + ' nm.',
      };
    },
  });

  gen('qm-bohr', {
    make(r) {
      const n = r.int(1, 5);
      const bo = Q.bohr(n);
      const ask = r.pick(['radius', 'waves']);
      if (ask === 'radius') {
        return {
          kind: 'numeric',
          q: 'In the Bohr model of hydrogen, what is the radius of the n = ' + n + ' orbit, in '
            + 'nanometres?',
          answer: bo.radiusNM, sig: 3, placeholder: 'nm',
          note: 'r = n²a₀, and the Bohr radius a₀ is 0.0529 nm.',
          right: 'Yes — ' + fmt(bo.radiusNM, 4) + ' nm.',
          wrong: 'r = ' + n + '² × 0.0529 = ' + fmt(bo.radiusNM, 4) + ' nm. The radius '
            + 'goes as n², so the atom grows fast as you climb.',
        };
      }
      return {
        kind: 'count',
        q: 'How many de Broglie wavelengths of the electron fit around the n = ' + n
          + ' Bohr orbit?',
        answer: n,
        note: 'Bohr’s rule mvr = nℏ rearranges into exactly this statement.',
        right: 'Exactly ' + n + '. That is all Bohr’s quantisation rule ever said.',
        wrong: '2πr = nλ, so the answer is n = ' + n + '. The circumference is '
          + fmt(bo.circumferenceNM, 4) + ' nm and the wavelength is '
          + fmt(bo.deBroglieNM, 4) + ' nm.',
      };
    },
  });

  /* --------------------------------------------- angular momentum and spin */
  gen('qm-angular', {
    make(r) {
      const l = r.int(1, 4);
      const a = Q.angularMomentum(l);
      const ask = r.pick(['magnitude', 'count']);
      if (ask === 'count') {
        return {
          kind: 'count',
          q: 'How many orientations can an electron with ℓ = ' + l + ' have in a magnetic '
            + 'field?',
          answer: a.count,
          note: 'm runs from −ℓ to +ℓ in whole steps.',
          right: 'Yes — 2ℓ + 1 = ' + a.count + ', which is why the ' + a.label
            + ' block of the periodic table is ' + a.count * 2 + ' wide.',
          wrong: 'm = −' + l + ' … +' + l + ', so there are 2ℓ + 1 = ' + a.count + '.',
        };
      }
      return {
        kind: 'numeric',
        q: 'What is the magnitude of the orbital angular momentum of an electron with ℓ = '
          + l + ', in units of ℏ?',
        answer: a.magnitude, sig: 3, placeholder: '× ℏ',
        note: '|L| = √(ℓ(ℓ+1)) ℏ — not ℓℏ, and the difference matters.',
        right: 'Yes — √' + (l * (l + 1)) + ' = ' + fmt(a.magnitude, 4)
          + 'ℏ, which is more than ' + l + 'ℏ. That is why the vector can never lie '
          + 'along the axis.',
        wrong: '√(' + l + ' × ' + (l + 1) + ') = ' + fmt(a.magnitude, 4) + '. The '
          + 'common mistake is answering ' + l + ', but the largest z component is '
          + l + 'ℏ while the vector itself is longer.',
      };
    },
  });

  gen('qm-shells', {
    make(r) {
      const n = r.int(1, 5);
      const s = Q.shellCapacity(n);
      return {
        kind: 'count',
        q: 'How many electrons fit in the n = ' + n + ' shell?',
        answer: s.total,
        note: 'Count the subshells, work out how many orbitals each has, and double for spin.',
        right: 'Yes — ' + s.total + ', which is 2n². It is '
          + s.subshells.map((x) => x.label + ' holding ' + x.electrons).join(' plus ') + '.',
        wrong: 'Each ℓ gives 2ℓ+1 orbitals and each orbital holds two electrons, so the '
          + 'shell holds ' + s.subshells.map((x) => x.electrons).join(' + ') + ' = ' + s.total
          + ', which is 2 × ' + n + '².',
      };
    },
  });

  gen('qm-zeeman', {
    make(r) {
      const field = r.pick([0.5, 1, 1.5, 3, 7, 12]);
      const z = Q.zeeman(field, 1);
      return {
        kind: 'numeric',
        q: 'A level with m = 1 sits in a ' + field + ' T magnetic field. By how much does its '
          + 'energy shift, in electronvolts?',
        answer: z.energyEV, sig: 3, placeholder: 'eV',
        note: 'ΔE = μᴮBm, and the Bohr magneton is 5.788 × 10⁻⁵ eV/T.',
        right: 'Yes — ' + sci(z.energyEV, 4) + ' eV, which is tiny next to the '
          + fmt(0.0257, 3) + ' eV of room-temperature thermal energy.',
        wrong: 'ΔE = 5.788 × 10⁻⁵ × ' + field + ' = ' + sci(z.energyEV, 4) + ' eV.',
      };
    },
  });

  gen('qm-fermion-boson', {
    make(r) {
      const cases = [
        { t: 'Electron', fermion: true }, { t: 'Photon', fermion: false },
        { t: 'Proton', fermion: true }, { t: 'Neutron', fermion: true },
        { t: 'Helium-4 nucleus', fermion: false }, { t: 'Helium-3 nucleus', fermion: true },
      ];
      const pick = r.pick(cases);
      return {
        kind: 'choice',
        q: 'Is a ' + pick.t.toLowerCase() + ' a fermion or a boson?',
        options: ME.quiz.shuffle([
          { t: 'A fermion — half-integer spin, one per state', ok: pick.fermion },
          { t: 'A boson — whole-number spin, as many per state as you like', ok: !pick.fermion },
        ]),
        right: pick.fermion
          ? 'Half-integer spin, so the exclusion principle applies and no two can share a state. '
            + 'This is the kind of thing matter is built from.'
          : 'Whole-number spin, so any number can pile into the same state. This is the kind of '
            + 'thing lasers and superfluids are made of.',
        wrong: 'Count the half-integer spins inside it. Helium-4 has two protons, two neutrons and '
          + 'two electrons — six halves, which add to a whole number, so it is a boson and can '
          + 'become a superfluid. Helium-3 has one neutron fewer, so it is a fermion and behaves '
          + 'completely differently.',
      };
    },
  });

  /* ------------------------------------------------ atoms, light, solids */
  gen('qm-moseley', {
    make(r) {
      const el = r.pick([['calcium', 20], ['iron', 26], ['nickel', 28], ['copper', 29],
        ['zinc', 30], ['molybdenum', 42], ['silver', 47]]);
      const m = Q.moseley(el[1]);
      return {
        kind: 'numeric',
        q: 'Estimate the Kα X-ray energy of ' + el[0] + ' (Z = ' + el[1] + ') from '
          + 'Moseley’s law, in keV.',
        answer: m.energyEV / 1000, sig: 3, placeholder: 'keV',
        note: 'E ≈ 10.2 eV × (Z − 1)² — the hydrogen 2→1 gap with the '
          + 'nuclear charge screened by one electron.',
        right: 'Yes — about ' + fmt(m.energyEV / 1000, 4) + ' keV, so a wavelength of '
          + fmt(m.lambdaNM, 4) + ' nm.',
        wrong: '10.2 × (' + el[1] + ' − 1)² = ' + Math.round(m.energyEV)
          + ' eV, which is ' + fmt(m.energyEV / 1000, 4) + ' keV.',
      };
    },
  });

  gen('qm-bandgap', {
    make(r) {
      const mat = r.pick([['silicon', 1.12], ['gallium arsenide', 1.42], ['gallium phosphide', 2.26],
        ['indium gallium nitride', 2.7], ['gallium nitride', 3.4], ['diamond', 5.5]]);
      const g = Q.bandGap(mat[1]);
      return {
        kind: 'numeric',
        q: 'An LED made of ' + mat[0] + ' has a band gap of ' + mat[1] + ' eV. What wavelength '
          + 'does it emit, in nanometres?',
        answer: g.lambdaNM, sig: 3, placeholder: 'nm',
        note: 'The photon carries the gap energy, so λ = 1239.8/Eɡ.',
        right: 'Yes — ' + Math.round(g.lambdaNM) + ' nm, which is ' + g.region + '.',
        wrong: 'λ = 1239.8/' + mat[1] + ' = ' + Math.round(g.lambdaNM) + ' nm. '
          + (g.region === 'infrared' ? 'Infrared, which is why you cannot see a plain silicon LED.'
            : 'That puts it in the ' + g.region + '.'),
      };
    },
  });

  gen('qm-boltzmann', {
    make(r) {
      const gap = r.pick([0.01, 0.025, 0.05, 0.1, 0.5, 1, 2.2]);
      const T = r.pick([77, 298, 500, 1000]);
      const bz = Q.boltzmannRatio(gap, T);
      return {
        kind: 'numeric',
        q: 'Two levels are ' + gap + ' eV apart. At ' + T + ' K, what fraction of the molecules '
          + 'are in the upper one, relative to the lower?',
        answer: bz.ratio, tol: Math.max(1e-30, bz.ratio * 0.05), placeholder: 'ratio',
        note: 'N₂/N₁ = e^(−ΔE/kT), and kT at ' + T + ' K is '
          + fmt(bz.thermalEV * 1000, 3) + ' meV.',
        right: 'Yes — ' + (bz.ratio < 0.001 ? sci(bz.ratio, 3) : fmt(bz.ratio, 4))
          + '. ' + (bz.ratio < 1e-10 ? 'Which is effectively none, and why a laser has to be pumped.' : ''),
        wrong: 'ΔE/kT = ' + fmt(bz.gapOverThermal, 4) + ', so the ratio is e to minus that, '
          + 'which is ' + (bz.ratio < 0.001 ? sci(bz.ratio, 3) : fmt(bz.ratio, 4)) + '.',
      };
    },
  });

  gen('qm-beer', {
    make(r) {
      const eps = r.pick([500, 2000, 8000, 15000, 40000]);
      const conc = r.pick([1e-6, 5e-6, 1e-5, 5e-5]);
      const bl = Q.beerLambert(eps, conc, 1);
      return {
        kind: 'numeric',
        q: 'A solution of ' + sci(conc, 2) + ' mol/L is measured in a 1 cm cell. The molar '
          + 'absorptivity is ' + eps + ' L/(mol·cm). What is the absorbance?',
        answer: bl.absorbance, sig: 3, placeholder: 'A',
        note: 'A = εcl, and watch that all three units line up.',
        right: 'Yes — A = ' + fmt(bl.absorbance, 4) + ', so '
          + fmt(bl.percent, 3) + '% of the light gets through.',
        wrong: 'A = ' + eps + ' × ' + sci(conc, 2) + ' × 1 = ' + fmt(bl.absorbance, 4) + '.',
      };
    },
  });

  gen('qm-selection', {
    make(r) {
      const jumps = [[0, 1, '1s → 2p'], [0, 0, '1s → 2s'], [0, 2, '1s → 3d'],
        [1, 2, '2p → 3d'], [1, 1, '2p → 3p'], [2, 1, '3d → 4p'], [2, 3, '3d → 4f']];
      const j = r.pick(jumps);
      const a = Q.allowed(j[0], j[1], 0, 0);
      return {
        kind: 'choice',
        q: 'Can an atom absorb a photon to make the jump ' + j[2] + '?',
        options: [
          { t: 'Yes — it obeys the selection rules', ok: a.allowed },
          { t: 'No — the photon cannot drive that one', ok: !a.allowed },
        ],
        right: a.why,
        wrong: a.why + ' The rule is Δℓ = ±1, and nothing else will do: the photon '
          + 'carries exactly one unit of angular momentum and it has to go somewhere.',
      };
    },
  });

  gen('qm-decay', {
    make(r) {
      const halves = r.int(1, 6);
      const start = r.pick([100, 400, 1000, 8000]);
      const d = Q.decay(1, halves, start);
      return {
        kind: 'numeric',
        q: 'A sample starts with ' + start + ' radioactive atoms. How many are left after '
          + halves + ' half-li' + (halves === 1 ? 'fe' : 'ves') + '?',
        answer: d.remaining, tol: Math.max(0.5, d.remaining * 0.02), placeholder: 'atoms',
        note: 'Halve it once per half-life. No atom is ageing — each just has the same '
          + 'chance per second as always.',
        right: 'Yes — ' + Math.round(d.remaining) + ', which is ' + start + ' ÷ 2'
          + (halves > 1 ? '^' + halves : '') + '.',
        wrong: start + ' × (½)^' + halves + ' = ' + Math.round(d.remaining) + '.',
      };
    },
  });

  gen('qm-bell', {
    make(r) {
      const cases = [
        { q: 'A Bell test measures S = 2.7. What does that tell you?',
          right: 'The particles did not carry answers decided in advance',
          wrongs: ['A signal passed between the detectors faster than light',
            'The experiment has an error, since 2 is the maximum',
            'The two particles are physically touching'],
          why: 'Anything with pre-agreed answers is stuck at 2 or below — Bell proved that as '
            + 'a theorem, with no assumptions about the mechanism. Exceeding it rules out the whole '
            + 'class of explanations, and quantum mechanics predicts up to 2√2 = 2.83.' },
        { q: 'Can entanglement be used to send a message faster than light?',
          right: 'No — each side sees only random results until the lists are compared',
          wrongs: ['Yes, that is the main application',
            'Yes, but only over short distances',
            'Only if the particles are identical'],
          why: 'Each experimenter sees an unbiased coin flip, and nothing the other does changes '
            + 'that. The correlation only shows up when the two records are brought together, and '
            + 'bringing them together travels at the speed of light like everything else.' },
        { q: 'What is a quantum computer’s actual advantage?',
          right: 'Interference can cancel the wrong answers before you measure',
          wrongs: ['It tries every possible answer at the same time and reports the best',
            'It runs at a much higher clock speed',
            'It stores exponentially more data than a classical computer'],
          why: 'The "tries everything at once" line is the common misreading. Measuring n qubits '
            + 'gives n ordinary bits and nothing more, so parallelism alone buys you nothing. The '
            + 'advantage comes from arranging the amplitudes so wrong answers cancel.' },
        { q: 'Why does watching which slit the electron goes through destroy the pattern?',
          right: 'The paths stop being indistinguishable, and only indistinguishable paths interfere',
          wrongs: ['The detector physically knocks the electron off course',
            'Electrons become particles when observed and waves when not',
            'The measurement adds energy that washes out the fringes'],
          why: 'The jostling story is the usual one and it is not the reason — the experiment '
            + 'works with detectors far too gentle to disturb the path. What matters is whether a '
            + 'record exists anywhere of which way it went.' },
      ];
      const pick = r.pick(cases);
      return {
        kind: 'choice', q: pick.q,
        options: ME.quiz.shuffle([{ t: pick.right, ok: true }]
          .concat(pick.wrongs.map((w) => ({ t: w, ok: false })))),
        right: pick.why, wrong: pick.why,
      };
    },
  });

  gen('qm-history', {
    make(r) {
      const cases = [
        { q: 'Which experiment showed that light carries momentum, not just energy?',
          right: 'Compton scattering', wrongs: ['The photoelectric effect', 'Blackbody radiation', 'The Stern–Gerlach experiment'],
          why: 'A photon bouncing off an electron comes away with a longer wavelength, by an amount '
            + 'that depends only on the angle. A wave scatters at the frequency it was shaken at; '
            + 'only a collision changes the colour.' },
        { q: 'Which result could classical physics not explain even approximately — it predicted infinity?',
          right: 'The spectrum of a hot object', wrongs: ['The photoelectric effect', 'Line spectra of atoms', 'Electron diffraction'],
          why: 'Count the standing waves in a cavity, give each the same energy, and the sum '
            + 'diverges because there is no shortest wavelength. Planck’s lumps price the '
            + 'short ones out and fix it.' },
        { q: 'Which experiment showed that spin takes only two values?',
          right: 'Stern–Gerlach', wrongs: ['Davisson–Germer', 'The two-slit experiment', 'Compton scattering'],
          why: 'Silver atoms through an uneven magnetic field give two spots, not a smear — '
            + 'and two orientations needs a half-integer, which orbital angular momentum cannot be.' },
        { q: 'Which experiment showed that matter has a wavelength?',
          right: 'Davisson–Germer electron diffraction', wrongs: ['Millikan’s oil drop', 'The photoelectric effect', 'Moseley’s X-ray measurements'],
          why: 'Electrons bounced off a nickel crystal produced a diffraction pattern, three years '
            + 'after de Broglie proposed matter waves in a thesis his examiners were unsure about.' },
        { q: 'What did Moseley’s X-ray measurements settle?',
          right: 'That elements are ordered by nuclear charge, not atomic weight',
          wrongs: ['That electrons have spin', 'That light is quantised', 'That the nucleus is tiny'],
          why: 'Plot √E against position in the table and you get a straight line with no '
            + 'ambiguity, which fixed the places where ordering by weight gave the wrong chemistry '
            + '— two years before anyone named the proton.' },
      ];
      const pick = r.pick(cases);
      return {
        kind: 'choice', q: pick.q,
        options: ME.quiz.shuffle([{ t: pick.right, ok: true }]
          .concat(pick.wrongs.map((w) => ({ t: w, ok: false })))),
        right: pick.why, wrong: pick.why,
      };
    },
  });

  gen('qm-colour', {
    make(r) {
      const k = r.int(2, 8);
      const cb = Q.conjugatedBox(k);
      return {
        kind: 'numeric',
        q: 'A conjugated chain has ' + k + ' double bonds, so ' + (2 * k) + ' π electrons in '
          + 'a box ' + fmt(cb.lengthNM, 3) + ' nm long. Treating it as a particle in a box, what '
          + 'wavelength does it absorb, in nanometres?',
        answer: cb.lambdaNM, sig: 3, placeholder: 'nm',
        note: 'The electrons fill from the bottom, two per level, so the jump is from n = '
          + cb.homo + ' to n = ' + cb.lumo + '.',
        right: 'Yes — ' + Math.round(cb.lambdaNM) + ' nm. The model is excellent for short '
          + 'chains and drifts too red for long ones, because a real chain is not a flat box.',
        wrong: 'ΔE = (' + cb.lumo + '² − ' + cb.homo + '²)h²/8mL² = '
          + fmt(cb.gapEV, 4) + ' eV, so λ = 1239.8/ΔE = ' + Math.round(cb.lambdaNM) + ' nm.',
      };
    },
  });

  ME.quantumProblems2 = ['qm-wien', 'qm-photoelectric', 'qm-threshold', 'qm-compton',
    'qm-debroglie', 'qm-bohr', 'qm-angular', 'qm-shells', 'qm-zeeman', 'qm-fermion-boson',
    'qm-moseley', 'qm-bandgap', 'qm-boltzmann', 'qm-beer', 'qm-selection', 'qm-decay',
    'qm-bell', 'qm-history', 'qm-colour'];
})();
