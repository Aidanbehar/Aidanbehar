/* Practice problems for the Schrödinger tab.
 *
 * These register in the same generator registry the course uses, so
 * ME.practice.selfTest covers them with everything else: every problem must
 * have real question text, a finite numeric answer, and exactly one right
 * option where it is multiple choice.
 *
 * The rule the whole project runs on applies here too, and matters most in a
 * topic where the arithmetic is unfamiliar: pick the numbers first, then ask
 * the engine for the answer. No generator below ever carries its own answer,
 * so a problem and its grader cannot disagree.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const Q = ME.quantum;
  const gen = ME.practice.generator;

  const fmt = (x, s) => ME.fmt.fmt(x, s || 4);

  /* ------------------------------------------------------- the box */
  gen('qm-box-energy', {
    make(r) {
      const n = r.int(1, 4);
      const L = r.pick([0.3, 0.5, 0.8, 1, 1.2, 1.5, 2]);
      const answer = Q.boxEnergy(n, L).eV;
      return {
        kind: 'numeric',
        q: 'An electron is trapped in a one-dimensional box ' + L + ' nm wide. '
          + 'What is its energy in level n = ' + n + '? Give the answer in electronvolts.',
        answer: answer, sig: 3, placeholder: 'eV',
        note: 'E = n²h²/8mL². Watch the units: L has to be in metres before it goes in.',
        right: 'Yes — ' + fmt(answer, 4) + ' eV.',
        wrong: 'E = n²h²/(8mL²), with L = ' + L + ' nm = ' + L + ' × 10⁻⁹ m, and divide by '
          + '1.602 × 10⁻¹⁹ at the end to get electronvolts.',
      };
    },
  });

  gen('qm-box-jump', {
    make(r) {
      const L = r.pick([0.4, 0.6, 1, 1.5, 2]);
      const from = r.int(1, 3);
      const to = from + r.int(1, 2);
      const t = Q.boxTransition(from, to, L);
      return {
        kind: 'numeric',
        q: 'An electron in a ' + L + ' nm box drops from level n = ' + to + ' to n = ' + from
          + '. What is the wavelength of the photon it emits, in nanometres?',
        answer: t.lambdaNM, sig: 3, placeholder: 'nm',
        note: 'Find the energy gap first, then λ = hc/ΔE. In electronvolts and nanometres, hc = 1239.8.',
        right: 'That is it — ' + fmt(t.lambdaNM, 4) + ' nm, in the ' + Q.spectralRegion(t.lambdaNM) + '.',
        wrong: 'ΔE = (' + to + '² − ' + from + '²)h²/(8mL²) = ' + fmt(t.deltaEV, 4)
          + ' eV, and then λ = 1239.8/ΔE with ΔE in eV.',
      };
    },
  });

  gen('qm-box-probability', {
    make(r) {
      const n = r.int(1, 3);
      const L = r.pick([1, 2]);
      const thirds = r.pick([
        [0, 1 / 3, 'the left third'], [1 / 3, 2 / 3, 'the middle third'],
        [0, 1 / 2, 'the left half'], [1 / 4, 3 / 4, 'the middle half'],
      ]);
      const a = thirds[0] * L, b = thirds[1] * L;
      const answer = Q.boxProbability(n, L, a, b);
      return {
        kind: 'numeric',
        q: 'An electron is in level n = ' + n + ' of a ' + L + ' nm box. What is the probability '
          + 'of finding it in ' + thirds[2] + ' of the box? Give a decimal between 0 and 1.',
        answer: answer, tol: 0.01, placeholder: '0.00',
        note: 'Integrate |ψ|² = (2/L)sin²(nπx/L) between the two limits. The sin² integral has a '
          + 'closed form, so no estimating.',
        right: 'Yes — ' + fmt(answer, 3) + '.',
        wrong: 'P = (b−a)/L − [sin(2πnb/L) − sin(2πna/L)]/2πn. For a classical particle it would '
          + 'just be the fraction of the width; the wave makes it uneven.',
      };
    },
  });

  gen('qm-box-nodes', {
    make(r) {
      const n = r.int(2, 7);
      return {
        kind: 'count',
        q: 'How many nodes does the n = ' + n + ' wavefunction of a particle in a box have '
          + 'strictly inside the box — not counting the two walls?',
        answer: n - 1,
        note: 'A node is a place where ψ crosses zero.',
        right: 'Right — n − 1 = ' + (n - 1) + '. Each step up adds one more wiggle.',
        wrong: 'ψ = sin(nπx/L) goes through zero n − 1 times between the walls, so the answer is '
          + (n - 1) + '. The walls themselves are zeros too, but they are not counted as nodes.',
      };
    },
  });

  /* ----------------------------------------------------- which equation */
  /* The conceptual one, and the one most worth drilling: a reader who can pick
   * the right equation has understood what separating the variables bought. */
  gen('qm-which-equation', {
    make(r) {
      const cases = [
        { q: 'You want the energies an electron is allowed to have in a hydrogen atom.', tise: true,
          why: 'A fixed potential and a question with no "when" in it. Stationary states are exactly what the TISE gives you.' },
        { q: 'You want to know the shape of a 2p orbital.', tise: true,
          why: 'An orbital IS a solution of the TISE. Its probability cloud does not change with time, which is why a picture of it makes sense at all.' },
        { q: 'You want to predict the wavelengths in the emission spectrum of hydrogen.', tise: true,
          why: 'Spectra are differences between energy levels, and levels come from the TISE. You only need the TDSE if you want the rate at which the jump happens.' },
        { q: 'A molecule is hit by a short laser pulse and you want to know what happens during it.', tise: false,
          why: 'The potential itself changes while you watch, so there are no stationary states to find. This is the TDSE’s job.' },
        { q: 'You want to follow a wave packet as it moves along and spreads out.', tise: false,
          why: 'Spreading is change, and change in time is what the TDSE describes. A single TISE solution never changes shape.' },
        { q: 'An electron is in a mixture of the n = 1 and n = 2 states of a box, and you want to know how its probability cloud sloshes about.', tise: false,
          why: 'Each piece is a TISE solution, but they rotate at different rates, and the interference between them moves. You need the TDSE — though you build its answer out of TISE solutions.' },
        { q: 'You want the vibrational energy levels of a C=O bond.', tise: true,
          why: 'Fixed potential, definite energies wanted. The TISE for a harmonic oscillator.' },
        { q: 'You want the probability that an electron tunnels through a barrier, in steady state.', tise: true,
          why: 'Steady state is the giveaway: nothing is changing with time, so the TISE with the barrier in V(x) is enough.' },
      ];
      const pick = r.pick(cases);
      return {
        kind: 'choice',
        q: pick.q + ' Which equation do you reach for?',
        options: [
          { t: 'The time-independent equation, Ĥψ = Eψ', ok: pick.tise },
          { t: 'The time-dependent equation, iℏ ∂ψ/∂t = Ĥψ', ok: !pick.tise },
        ],
        right: pick.why,
        wrong: pick.why,
      };
    },
  });

  /* --------------------------------------------------------- hydrogen */
  gen('qm-hydrogen-level', {
    make(r) {
      const n = r.int(1, 6);
      const answer = Q.hydrogenEnergy(n).eV;
      return {
        kind: 'numeric',
        q: 'What is the energy of the n = ' + n + ' level of a hydrogen atom, in electronvolts? '
          + 'Include the sign.',
        answer: answer, tol: 0.02, placeholder: 'eV',
        note: 'E = −13.6/n² eV. The sign is not decoration: it says the electron is bound.',
        right: 'Yes — ' + fmt(answer, 4) + ' eV.',
        wrong: 'E = −13.6/' + n + '² = ' + fmt(answer, 4) + ' eV. Negative because zero is set at '
          + 'the electron being free and infinitely far away; anything bound is below that.',
      };
    },
  });

  gen('qm-hydrogen-line', {
    make(r) {
      const to = r.int(1, 3);
      const from = to + r.int(1, 3);
      const t = Q.hydrogenTransition(from, to);
      return {
        kind: 'numeric',
        q: 'A hydrogen atom drops from n = ' + from + ' to n = ' + to + '. What wavelength does it '
          + 'emit, in nanometres?',
        answer: t.lambdaNM, sig: 3, placeholder: 'nm',
        note: 'ΔE = 13.6(1/n_f² − 1/n_i²) eV, then λ = 1239.8/ΔE nm.',
        right: 'That is it — ' + fmt(t.lambdaNM, 4) + ' nm, in the ' + t.region
          + (t.series ? ', part of the ' + t.series + ' series' : '') + '.',
        wrong: 'ΔE = ' + fmt(t.deltaEV, 4) + ' eV, so λ = 1239.8/' + fmt(t.deltaEV, 4) + ' = '
          + fmt(t.lambdaNM, 4) + ' nm.',
      };
    },
  });

  gen('qm-hydrogen-series', {
    make(r) {
      const row = r.pick(Q.SERIES.slice(0, 3));
      const to = row[0];
      const from = to + r.int(1, 2);
      const t = Q.hydrogenTransition(from, to);
      const names = Q.SERIES.slice(0, 4).map((s) => s[1]);
      return {
        kind: 'choice',
        q: 'A hydrogen line at ' + fmt(t.lambdaNM, 4) + ' nm comes from an electron landing on '
          + 'n = ' + to + '. Which series is it part of?',
        options: names.map((nm) => ({ t: nm, ok: nm === row[1] })),
        right: 'Yes. Every line that ends on n = ' + to + ' belongs to the ' + row[1]
          + ' series, and they all come out in the ' + row[2] + '.',
        wrong: 'The series is named for where the electron lands, not where it started. Landing on '
          + 'n = ' + to + ' makes it ' + row[1] + '.',
      };
    },
  });

  /* ------------------------------------------------------- oscillator */
  gen('qm-oscillator', {
    make(r) {
      const bond = r.pick([
        ['H–Cl', 516, 1.00783, 34.9689], ['H–Br', 412, 1.00783, 78.9183],
        ['C–O', 1902, 12, 15.9949], ['N–O', 1595, 14.0031, 15.9949],
        ['C–H', 500, 12, 1.00783], ['H–F', 966, 1.00783, 18.9984],
      ]);
      const mu = Q.reducedMass(bond[2], bond[3]);
      const o = Q.oscillator(bond[1], mu);
      const ask = r.pick(['wavenumber', 'zero']);
      if (ask === 'wavenumber') {
        return {
          kind: 'numeric',
          q: 'Treat the ' + bond[0] + ' bond as a spring with force constant ' + bond[1]
            + ' N/m. Its reduced mass is ' + fmt(mu, 4) + ' u. Where does its vibration appear in '
            + 'an infrared spectrum, in cm⁻¹?',
          answer: o.wavenumber, sig: 3, placeholder: 'cm⁻¹',
          note: 'ω = √(k/μ), and the wavenumber is ω/2πc. Remember μ is in kilograms for that: '
            + 'multiply by 1.6605 × 10⁻²⁷.',
          right: 'Yes — about ' + Math.round(o.wavenumber) + ' cm⁻¹.',
          wrong: 'ω = √(k/μ) = ' + ME.fmt.sciUnicode(o.omega, 4) + ' rad/s, and dividing by 2πc '
            + '(with c in cm/s) gives ' + Math.round(o.wavenumber) + ' cm⁻¹.',
        };
      }
      return {
        kind: 'numeric',
        q: 'The ' + bond[0] + ' bond has a force constant of ' + bond[1] + ' N/m and a reduced mass '
          + 'of ' + fmt(mu, 4) + ' u. How much vibrational energy does it still have at absolute '
          + 'zero, in electronvolts?',
        answer: o.zeroPointEV, sig: 3, placeholder: 'eV',
        note: 'The lowest level is n = 0, and E = (n + ½)ℏω — so the answer is ½ℏω, not zero.',
        right: 'Yes — ' + fmt(o.zeroPointEV, 4) + ' eV, and it can never be taken away.',
        wrong: 'E₀ = ½ℏω with ω = √(k/μ), which comes to ' + fmt(o.zeroPointEV, 4) + ' eV. A bond '
          + 'cannot be made to hold still; stopping it dead would pin down both position and '
          + 'momentum at once.',
      };
    },
  });

  /* -------------------------------------------------------- tunnelling */
  gen('qm-tunnel', {
    make(r) {
      const E = r.pick([0.5, 1, 1.5, 2]);
      const V = E + r.pick([1, 2, 3, 4]);
      const w = r.pick([0.1, 0.15, 0.2, 0.3]);
      const t = Q.tunnel(E, V, w);
      return {
        kind: 'numeric',
        q: 'An electron with ' + E + ' eV meets a barrier ' + V + ' eV high and ' + w + ' nm thick. '
          + 'What fraction of the time does it get through? Give a decimal.',
        answer: t.T, tol: Math.max(1e-6, t.T * 0.06), placeholder: '0.000',
        note: 'T = 1/(1 + V₀²sinh²(κa)/4E(V₀−E)), with κ = √(2m(V₀−E))/ℏ. Work out κa first.',
        right: 'Yes — about ' + fmt(t.T, 3) + '. Classically it would be exactly zero.',
        wrong: 'κ = √(2m(V₀−E))/ℏ = ' + ME.fmt.sciUnicode(t.kappa, 4) + ' m⁻¹, so κa = '
          + fmt(t.kappa * w * 1e-9, 4) + ' and T works out at ' + fmt(t.T, 3) + '.',
      };
    },
  });

  gen('qm-tunnel-thinking', {
    make(r) {
      const cases = [
        { t: 'Halve the thickness of the barrier', ok: true },
        { t: 'Halve the mass of the particle', ok: false },
        { t: 'Lower the barrier by a tenth of an electronvolt', ok: false },
        { t: 'Double the number of particles arriving', ok: false },
      ];
      return {
        kind: 'choice',
        q: 'An electron is tunnelling through a barrier and almost none of it gets through. '
          + 'Which change would help the most?',
        options: ME.quiz.shuffle(cases.slice()),
        right: 'Thickness, every time. T falls off roughly as e^(−2κa), so the width sits in an '
          + 'exponent while everything else only scales what the exponent multiplies. Halving the '
          + 'thickness can change the answer by orders of magnitude.',
        wrong: 'Look at where each quantity appears. Width is inside an exponential — it beats '
          + 'anything that merely multiplies. Sending twice as many particles does not change the '
          + 'fraction at all.',
      };
    },
  });

  /* --------------------------------------------------------- photons */
  gen('qm-photon', {
    make(r) {
      const mode = r.pick(['toNM', 'toEV']);
      if (mode === 'toNM') {
        const eV = r.round(1 + r.next() * 5, 2);
        const ph = Q.photonFromEV(eV);
        return {
          kind: 'numeric',
          q: 'A photon carries ' + eV + ' eV. What is its wavelength in nanometres?',
          answer: ph.lambdaNM, sig: 3, placeholder: 'nm',
          note: 'λ = hc/E, and in these units hc = 1239.8 eV·nm.',
          right: 'Yes — ' + fmt(ph.lambdaNM, 4) + ' nm, in the ' + ph.region + '.',
          wrong: 'λ = 1239.8/' + eV + ' = ' + fmt(ph.lambdaNM, 4) + ' nm.',
        };
      }
      const nm = r.int(200, 800);
      const ph = Q.photonFromNM(nm);
      return {
        kind: 'numeric',
        q: 'Light of wavelength ' + nm + ' nm arrives. How much energy does one photon carry, in '
          + 'electronvolts?',
        answer: ph.eV, sig: 3, placeholder: 'eV',
        note: 'E = hc/λ = 1239.8/λ with λ in nanometres.',
        right: 'Yes — ' + fmt(ph.eV, 4) + ' eV.',
        wrong: 'E = 1239.8/' + nm + ' = ' + fmt(ph.eV, 4) + ' eV.',
      };
    },
  });

  /* ----------------------------------------------------- uncertainty */
  gen('qm-uncertainty', {
    make(r) {
      const dx = r.pick([0.05, 0.1, 0.2, 0.5, 1]);
      const u = Q.uncertainty(dx);
      return {
        kind: 'numeric',
        q: 'An electron is known to be somewhere within ' + dx + ' nm. What is the smallest '
          + 'uncertainty in its momentum, in kg·m/s?',
        answer: u.dp, sig: 3, placeholder: 'kg m/s',
        note: 'Δx Δp ≥ ℏ/2, so the smallest Δp is ℏ/2Δx.',
        right: 'Yes — ' + ME.fmt.sciUnicode(u.dp, 4) + ' kg·m/s, which for an electron is a speed '
          + 'of about ' + Math.round(u.speed / 1000) + ' km/s.',
        wrong: 'Δp = ℏ/(2Δx) = 1.055 × 10⁻³⁴ / (2 × ' + dx + ' × 10⁻⁹) = '
          + ME.fmt.sciUnicode(u.dp, 4) + ' kg·m/s.',
      };
    },
  });

  /* ------------------------------------------------------ reading ψ */
  gen('qm-psi-meaning', {
    make(r) {
      const cases = [
        { q: 'What does |ψ|² tell you at a point?', right: 'The probability per unit volume of finding the particle there',
          wrongs: ['The particle’s speed there', 'The energy stored at that point', 'How much of the particle is there'],
          why: 'It is a probability density. Multiply it by a small volume and you get the chance of finding the whole particle in that volume — the particle is never partly anywhere.' },
        { q: 'Why does ψ get squared before it means anything?', right: 'Because ψ can be negative or complex, and a probability cannot',
          wrongs: ['Because squaring makes the numbers bigger', 'Because the particle has two states', 'Because energy is always squared'],
          why: 'The sign is real and it matters — it is what makes two overlapping waves add into a bond or cancel into an antibond — but a chance of finding something cannot be negative. Squaring is what turns an amplitude into odds.' },
        { q: 'Why must ∫|ψ|² over all space equal 1?', right: 'Because the particle is definitely somewhere',
          wrongs: ['Because energy is conserved', 'Because the wave has to fit in the box', 'Because probabilities are always 1'],
          why: 'It is bookkeeping rather than physics: add up the chances of finding it everywhere and you must get certainty. That condition is where the √(2/L) in front of the box wavefunction comes from.' },
        { q: 'A stationary state is one where', right: 'the probability cloud does not change with time',
          wrongs: ['the particle is not moving', 'the kinetic energy is zero', 'the wavefunction is completely constant'],
          why: 'The wave underneath is still turning — it picks up a phase e^(−iEt/ℏ) — but that phase has magnitude one, so |ψ|² is frozen. An electron in an orbital has plenty of kinetic energy and is going nowhere.' },
        { q: 'In the equation, what does the second derivative of ψ measure?', right: 'Curvature, which is the kinetic energy',
          wrongs: ['Acceleration of the particle', 'How fast the wave moves', 'The potential energy'],
          why: 'That is the one substitution that makes the whole equation readable: a tightly wiggling wave is sharply curved, and sharp curvature means high kinetic energy. It is de Broglie’s short-wavelength-means-fast, written so you can differentiate it.' },
      ];
      const pick = r.pick(cases);
      const opts = [{ t: pick.right, ok: true }].concat(pick.wrongs.map((w) => ({ t: w, ok: false })));
      return {
        kind: 'choice', q: pick.q, options: ME.quiz.shuffle(opts),
        right: pick.why, wrong: pick.why,
      };
    },
  });

  /* ------------------------------------------- the box, qualitatively */
  gen('qm-box-thinking', {
    make(r) {
      const cases = [
        { q: 'You squeeze the box to half its width. What happens to every energy level?',
          right: 'They all go up by a factor of four', wrongs: ['They all double', 'They all halve', 'They stay the same'],
          why: 'E goes as 1/L², so halving L multiplies every level by four. This is why confining anything costs energy, and why an electron pinned to the size of an atom has energies measured in electronvolts.' },
        { q: 'Why can n not be zero?',
          right: 'ψ would be zero everywhere, which is not a particle', wrongs: ['Zero energy is forbidden by Heisenberg', 'Because n must be positive by convention', 'The box would have to be infinitely wide'],
          why: 'Put n = 0 into sin(nπx/L) and the wave vanishes at every point, so the chance of finding the particle anywhere is zero. The lowest real state is n = 1, and its energy is not zero — that is zero-point energy, and it falls out of the shape rather than being imposed.' },
        { q: 'The gaps between levels in a box',
          right: 'get wider as you go up', wrongs: ['stay the same all the way up', 'get narrower as you go up', 'are random'],
          why: 'E goes as n², so the gap from n to n+1 grows with n. The harmonic oscillator is the odd one out here: its gaps are all identical, which is why a vibration gives one infrared band rather than a spread of them.' },
        { q: 'What makes the energy of a particle in a box come in steps at all?',
          right: 'The wave has to be zero at both walls', wrongs: ['Energy is always quantised', 'The particle bounces at fixed speeds', 'Electrons can only have certain energies'],
          why: 'It is the boundary condition and nothing else. Only whole numbers of half-waves fit between two fixed ends, exactly like a guitar string — and nobody finds the string mysterious. Remove the walls and the energies become continuous again.' },
      ];
      const pick = r.pick(cases);
      const opts = [{ t: pick.right, ok: true }].concat(pick.wrongs.map((w) => ({ t: w, ok: false })));
      return {
        kind: 'choice', q: pick.q, options: ME.quiz.shuffle(opts),
        right: pick.why, wrong: pick.why,
      };
    },
  });

  ME.quantumProblems = ['qm-which-equation', 'qm-psi-meaning', 'qm-box-energy', 'qm-box-jump',
    'qm-box-probability', 'qm-box-nodes', 'qm-box-thinking', 'qm-hydrogen-level',
    'qm-hydrogen-line', 'qm-hydrogen-series', 'qm-oscillator', 'qm-tunnel',
    'qm-tunnel-thinking', 'qm-photon', 'qm-uncertainty'];
})();
