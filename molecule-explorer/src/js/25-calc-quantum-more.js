/* The rest of quantum physics.
 *
 * A second file rather than a longer first one: 24-calc-quantum.js is the
 * Schrödinger equation and the systems you solve with it, and this is
 * everything else the subject is made of — where the quantum idea came from,
 * the rules of the formalism, angular momentum and spin, atoms and molecules,
 * light and matter, the two kinds of statistics, solids, and the parts that
 * are genuinely strange. Both halves hang off ME.quantum, because a reader
 * does not care which file a formula lives in.
 *
 * Same discipline as the first half: constants are derived, not remembered.
 * The Stefan–Boltzmann constant is 2π⁵k⁴/15h³c², the Wien constant is hc/kx
 * with x the root of a transcendental equation solved here, the Bohr magneton
 * is eℏ/2mₑ. Typing 5.67 × 10⁻⁸ would have been shorter and would have meant
 * the app could disagree with itself.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const C = ME.fmt.CONST;
  const { h, hbar, e, c, me, mp, amu, kB, eps0, bohrRadius } = C;
  const Q = ME.quantum;
  const toEV = Q.toEV, toJ = Q.toJ;
  const NM = 1e-9;

  /* ------------------------------------------------- derived constants */
  /* Wien's law comes from maximising the Planck curve, which leaves you with
   * x = 5(1 − e⁻ˣ). No closed form, so it is solved here once — the same
   * situation as the finite well, and worth seeing twice. */
  function wienX() {
    let x = 5;
    for (let i = 0; i < 200; i++) x = 5 * (1 - Math.exp(-x));
    return x;
  }
  const WIEN_X = wienX();
  const WIEN_B = (h * c) / (kB * WIEN_X);
  const STEFAN = (2 * Math.pow(Math.PI, 5) * Math.pow(kB, 4)) / (15 * h * h * h * c * c);
  const BOHR_MAGNETON = (e * hbar) / (2 * me);
  const COMPTON = h / (me * c);
  const FINE_STRUCTURE = (e * e) / (4 * Math.PI * eps0 * hbar * c);

  /* =============================================== where it came from === */

  /* Planck's law: how much a hot object radiates at each wavelength.
   * The classical version runs away to infinity at short wavelengths — the
   * ultraviolet catastrophe — and Planck's fix was to insist that energy comes
   * in lumps of hf. Both are returned so the gap can be drawn. */
  function planck(lambdaNM, T) {
    const l = lambdaNM * NM;
    const quantum = (2 * Math.PI * h * c * c) / (Math.pow(l, 5) * (Math.exp((h * c) / (l * kB * T)) - 1));
    /* Rayleigh–Jeans: the answer classical physics gives, which is fine at long
     * wavelengths and infinite at short ones. */
    const classical = (2 * Math.PI * c * kB * T) / Math.pow(l, 4);
    return { quantum: quantum, classical: classical, lambdaNM: lambdaNM, T: T };
  }
  function wienPeak(T) { return { lambdaNM: (WIEN_B / T) / NM, T: T, region: Q.spectralRegion((WIEN_B / T) / NM) }; }
  function stefanBoltzmann(T, area) { return STEFAN * Math.pow(T, 4) * (area === undefined ? 1 : area); }

  /* The photoelectric effect. The whole argument for the photon in one line:
   * brighter light means more electrons, never faster ones, because each
   * electron is hit by exactly one photon. */
  function photoelectric(lambdaNM, workFunctionEV) {
    const photonEV = Q.photonFromNM(lambdaNM).eV;
    const kinetic = photonEV - workFunctionEV;
    return {
      photonEV: photonEV, workFunctionEV: workFunctionEV,
      emits: kinetic > 0, kineticEV: Math.max(0, kinetic),
      /* The voltage that just stops the fastest electron — the measurement
       * that pinned h down in the first place. */
      stoppingVolts: Math.max(0, kinetic),
      thresholdNM: Q.HC_EV_NM / workFunctionEV,
      thresholdHz: toJ(workFunctionEV) / h,
      speed: kinetic > 0 ? Math.sqrt((2 * toJ(kinetic)) / me) : 0,
    };
  }

  /* Compton scattering: a photon bounces off an electron and comes back
   * longer. Waves do not do that. This is the experiment that made photons
   * undeniable, because it needs them to carry momentum. */
  function compton(lambdaNM, angleDeg) {
    const shift = COMPTON * (1 - Math.cos((angleDeg * Math.PI) / 180));
    const out = lambdaNM * NM + shift;
    return {
      shiftNM: shift / NM, lambdaOutNM: out / NM,
      energyInEV: Q.photonFromNM(lambdaNM).eV, energyOutEV: Q.photonFromNM(out / NM).eV,
      electronEV: Q.photonFromNM(lambdaNM).eV - Q.photonFromNM(out / NM).eV,
      comptonNM: COMPTON / NM,
    };
  }

  /* de Broglie: everything has a wavelength. Give it a mass and a speed, or an
   * accelerating voltage for an electron. */
  function deBroglieFromSpeed(massKG, speed) {
    const p = massKG * speed;
    return { lambdaNM: h / p / NM, momentum: p };
  }
  function deBroglieFromVolts(volts, massInElectrons, charges) {
    const m = me * (massInElectrons || 1);
    const qq = e * (charges || 1);
    const p = Math.sqrt(2 * m * qq * volts);
    return { lambdaNM: h / p / NM, momentum: p, energyEV: volts * (charges || 1) };
  }
  function deBroglieFromEnergy(energyEV, massInElectrons) {
    const m = me * (massInElectrons || 1);
    const p = Math.sqrt(2 * m * toJ(energyEV));
    return { lambdaNM: h / p / NM, momentum: p };
  }

  /* The Bohr model. Wrong, and worth knowing: it gets hydrogen's energies
   * exactly right from an assumption — angular momentum in whole multiples of
   * ℏ — that it cannot justify. de Broglie later showed that assumption is
   * just "a whole number of wavelengths fits round the orbit". */
  function bohr(n, Z) {
    const z = Z || 1;
    const r = (n * n * bohrRadius) / z;
    const v = (z * e * e) / (4 * Math.PI * eps0 * n * hbar);
    return {
      n: n, Z: z, radiusNM: r / NM, speed: v,
      /* The standing-wave reading: the circumference is exactly n de Broglie
       * wavelengths. That is the whole content of Bohr's rule. */
      circumferenceNM: (2 * Math.PI * r) / NM,
      deBroglieNM: h / (me * v) / NM,
      angularMomentum: n * hbar,
      energyEV: Q.hydrogenEnergy(n, z).eV,
      fractionOfLight: v / c,
    };
  }

  /* Two slits. The pattern is the same whether you send a wave or one particle
   * at a time, which is the experiment everything else has to explain. */
  function doubleSlit(lambdaNM, separationNM, screenM) {
    const l = lambdaNM * NM, d = separationNM * NM;
    return {
      /* Spacing between bright fringes on the screen, for small angles. */
      fringeSpacing: (l * screenM) / d,
      firstMaximumDeg: (Math.asin(Math.min(1, l / d)) * 180) / Math.PI,
      maxima: Math.floor(d / l),
    };
  }

  /* ================================================= rules and formalism */

  /* The particle in a box, measured properly. Every one of these has a closed
   * form, which makes it the one place a reader can watch the uncertainty
   * principle come out of the algebra instead of being asserted.
   *
   *   ⟨x⟩  = L/2                       by symmetry
   *   ⟨x²⟩ = L²(1/3 − 1/(2n²π²))
   *   ⟨p⟩  = 0                         it is going both ways at once
   *   ⟨p²⟩ = (nπℏ/L)²                  which is just 2mE
   */
  function boxStats(n, lengthNM) {
    const L = lengthNM * NM;
    const meanX = L / 2;
    const meanX2 = L * L * (1 / 3 - 1 / (2 * n * n * Math.PI * Math.PI));
    const sigmaX = Math.sqrt(meanX2 - meanX * meanX);
    const meanP2 = Math.pow((n * Math.PI * hbar) / L, 2);
    const sigmaP = Math.sqrt(meanP2);
    return {
      n: n, lengthNM: lengthNM,
      meanXNM: meanX / NM, sigmaXNM: sigmaX / NM,
      meanP: 0, sigmaP: sigmaP,
      product: sigmaX * sigmaP,
      /* In units of ℏ/2, so the reader can see it is never below one. */
      timesTheLimit: (sigmaX * sigmaP) / (hbar / 2),
      energyEV: Q.boxEnergy(n, lengthNM).eV,
    };
  }

  /* Energy and time. Not the same statement as position and momentum — time
   * is not an observable — but the consequence is real and measurable: a state
   * that does not last long does not have a sharp energy, so a short-lived
   * excited state gives a broad spectral line. */
  function lifetimeLinewidth(lifetimeSeconds) {
    const dE = hbar / (2 * lifetimeSeconds);
    return {
      lifetime: lifetimeSeconds, energyEV: toEV(dE),
      frequencyHz: dE / h,
      /* As a fraction of a visible photon, which is the useful comparison. */
      fractionOfGreen: toEV(dE) / Q.photonFromNM(550).eV,
    };
  }

  /* Superposition. Two states with amplitudes, and what a measurement does. */
  function superpose(amplitudeA, amplitudeB) {
    const norm = Math.sqrt(amplitudeA * amplitudeA + amplitudeB * amplitudeB);
    const a = amplitudeA / norm, b = amplitudeB / norm;
    return { a: a, b: b, probA: a * a, probB: b * b, normalised: a * a + b * b };
  }

  /* ============================================ angular momentum and spin */

  /* |L| = √(l(l+1))ℏ, not lℏ — which is the detail that trips everybody, and
   * it matters: the vector can never point straight along z, because its
   * length always exceeds its largest possible z component. */
  function angularMomentum(l) {
    const magnitude = Math.sqrt(l * (l + 1));
    const orientations = [];
    for (let m = -l; m <= l; m++) orientations.push(m);
    return {
      l: l, magnitude: magnitude, magnitudeSI: magnitude * hbar,
      orientations: orientations, count: 2 * l + 1,
      maxZ: l,
      /* The smallest angle it can make with the axis. Never zero. */
      minAngleDeg: l === 0 ? null : (Math.acos(l / magnitude) * 180) / Math.PI,
      label: ['s', 'p', 'd', 'f', 'g', 'h'][l] || String(l),
    };
  }
  function spinMagnitude(s) {
    return { s: s, magnitude: Math.sqrt(s * (s + 1)), count: Math.round(2 * s + 1) };
  }

  /* The Zeeman effect: a magnetic field splits a level into its orientations,
   * which is the direct proof that the orientations are real. */
  function zeeman(fieldTesla, m, gFactor) {
    const g = gFactor === undefined ? 1 : gFactor;
    const dE = g * BOHR_MAGNETON * fieldTesla * m;
    return {
      energyEV: toEV(dE), frequencyHz: dE / h,
      magnetonEVperT: toEV(BOHR_MAGNETON),
      /* Compared with thermal energy at room temperature, which is why you
       * need a big magnet and often a cold sample. */
      versusRoomTemperature: Math.abs(dE) / (kB * 298),
    };
  }

  /* Fine structure: the electron's spin feels the magnetic field of its own
   * orbit, which splits lines by about α² of their energy. */
  function fineStructure(n, Z) {
    const base = Math.abs(Q.hydrogenEnergy(n, Z).eV);
    return {
      alpha: FINE_STRUCTURE, inverseAlpha: 1 / FINE_STRUCTURE,
      splittingEV: base * FINE_STRUCTURE * FINE_STRUCTURE,
      fraction: FINE_STRUCTURE * FINE_STRUCTURE,
    };
  }

  /* ========================================= atoms, shells, the table */

  /* How many electrons fit, and why. Each shell holds 2n² because of how many
   * (l, m) pairs there are, times two for spin — and the times two is Pauli. */
  function shellCapacity(n) {
    const subshells = [];
    for (let l = 0; l < n; l++) {
      subshells.push({ l: l, label: ['s', 'p', 'd', 'f', 'g'][l] || String(l),
        orbitals: 2 * l + 1, electrons: 2 * (2 * l + 1) });
    }
    return { n: n, subshells: subshells, total: 2 * n * n };
  }

  /* The filling order. Not a rule handed down: it is the order of increasing
   * n + l, and ties broken by n, which falls out of how much a subshell is
   * shielded from the nucleus by the ones below it. */
  function aufbauOrder(count) {
    const out = [];
    for (let sum = 1; sum <= 8 && out.length < (count || 20); sum++) {
      for (let l = Math.floor((sum - 1) / 2); l >= 0; l--) {
        const n = sum - l;
        if (n <= l) continue;
        out.push({ n: n, l: l, label: n + (['s', 'p', 'd', 'f', 'g'][l] || l),
          capacity: 2 * (2 * l + 1), nPlusL: n + l });
        if (out.length >= (count || 20)) break;
      }
    }
    return out;
  }

  /* Effective nuclear charge, the crude version that still explains the
   * periodic trends: inner electrons screen almost a whole charge each, ones
   * in your own shell screen about a third. */
  function effectiveCharge(Z, inner, sameShell) {
    const screen = inner * 1.0 + sameShell * 0.35;
    return { Z: Z, screened: screen, zEff: Z - screen };
  }

  /* Moseley's law: X-ray frequencies go as (Z−1)², which is how the elements
   * got put in the right order before anybody knew what a proton was. */
  function moseley(Z) {
    const eV = Math.abs(Q.hydrogenEnergy(2).eV - Q.hydrogenEnergy(1).eV) * Math.pow(Z - 1, 2);
    return { Z: Z, energyEV: eV, lambdaNM: Q.HC_EV_NM / eV, frequency: toJ(eV) / h };
  }

  /* ==================================================== molecules */

  /* Two atomic orbitals go in, two molecular orbitals come out: one lower
   * (bonding) and one higher (antibonding), and the antibonding one is pushed
   * up slightly more than the bonding one is pushed down. That asymmetry is
   * why helium does not form He₂ — fill both and you are worse off. */
  /* Worked as a splitting about the atomic level rather than as two absolute
   * energies. Trying to get absolute energies out of a two-parameter model
   * gives nonsense — the first version of this put the antibonding level
   * below the bonding one — and the splitting is what an MO diagram actually
   * shows anyway. */
  function lcao(atomicEV, interactionEV, overlap) {
    const S = overlap === undefined ? 0.2 : overlap;
    const drop = interactionEV / (1 + S);
    const rise = interactionEV / (1 - S);
    const bonding = atomicEV - drop;
    const anti = atomicEV + rise;
    const fourElectrons = 2 * bonding + 2 * anti - 4 * atomicEV;
    return {
      bondingEV: bonding, antibondingEV: anti, atomicEV: atomicEV,
      stabilisation: drop, destabilisation: rise,
      /* The asymmetry is the whole point: overlap pushes the antibonding level
       * up by more than it pulls the bonding one down. Put four electrons in
       * and you are worse off than you started, which is why there is no He₂. */
      asymmetry: rise / drop,
      fourElectronsEV: fourElectrons,
      bothFilled: fourElectrons > 0 ? 'net repulsive' : 'net bound',
    };
  }

  /* Bond order from how the electrons are shared out. */
  function bondOrder(bondingElectrons, antibondingElectrons) {
    return (bondingElectrons - antibondingElectrons) / 2;
  }

  /* A conjugated chain treated as a box. This is the one place the particle in
   * a box predicts a real measurement to within tens of nanometres — the
   * colour of a dye — using nothing but the length of the molecule. */
  function conjugatedBox(doubleBonds, bondLengthNM) {
    /* 2 π electrons per double bond, filling levels two at a time. */
    const electrons = 2 * doubleBonds;
    const highest = electrons / 2;
    /* The chain is roughly one bond length per bond, plus one for the ends. */
    const L = (2 * doubleBonds) * (bondLengthNM === undefined ? 0.14 : bondLengthNM);
    const gap = Q.boxEnergy(highest + 1, L).eV - Q.boxEnergy(highest, L).eV;
    return {
      doubleBonds: doubleBonds, electrons: electrons, homo: highest, lumo: highest + 1,
      lengthNM: L, gapEV: gap, lambdaNM: Q.HC_EV_NM / gap,
      region: Q.spectralRegion(Q.HC_EV_NM / gap),
    };
  }

  /* =============================================== light and matter */

  /* Boltzmann: how many are in the upper state at temperature T. The answer
   * for a visible transition at room temperature is "essentially none", which
   * is why a laser needs pumping and why you are not glowing. */
  function boltzmannRatio(gapEV, T, degeneracyRatio) {
    const g = degeneracyRatio === undefined ? 1 : degeneracyRatio;
    return {
      ratio: g * Math.exp(-toJ(gapEV) / (kB * T)),
      thermalEV: toEV(kB * T),
      gapOverThermal: gapEV / toEV(kB * T),
    };
  }

  /* Beer–Lambert, because every spectrometer reading is this. */
  function beerLambert(epsilon, concentration, pathCM) {
    const A = epsilon * concentration * pathCM;
    return { absorbance: A, transmittance: Math.pow(10, -A), percent: 100 * Math.pow(10, -A) };
  }

  /* Selection rules for a one-electron atom: which jumps the light can
   * actually drive. The photon carries one unit of angular momentum, so l has
   * to change by exactly one — that is the whole reason. */
  function allowed(fromL, toL, fromM, toM) {
    const dl = toL - fromL, dm = toM - fromM;
    const okL = Math.abs(dl) === 1;
    const okM = Math.abs(dm) <= 1;
    return {
      allowed: okL && okM, deltaL: dl, deltaM: dm,
      why: !okL ? 'Δℓ must be ±1 — the photon carries one unit of angular momentum and it has to go somewhere'
        : !okM ? 'Δm can only be 0 or ±1'
          : 'Δℓ = ' + (dl > 0 ? '+1' : '−1') + ' and Δm = ' + dm + ', so this one goes',
    };
  }

  /* ========================================= statistics and solids */

  /* The three distributions, side by side. The only difference is whether the
   * particles can share a state, and that one question decides whether you get
   * a metal, a laser, or an ideal gas. */
  function occupancy(energyEV, chemicalPotentialEV, T) {
    const x = toJ(energyEV - chemicalPotentialEV) / (kB * T);
    return {
      fermiDirac: 1 / (Math.exp(x) + 1),
      boseEinstein: x > 0 ? 1 / (Math.exp(x) - 1) : Infinity,
      boltzmann: Math.exp(-x),
      x: x,
    };
  }

  /* A band gap, read as a colour. Silicon's gap puts its light in the
   * infrared, which is exactly why there is no silicon LED. */
  function bandGap(gapEV) {
    const nm = Q.HC_EV_NM / gapEV;
    return {
      gapEV: gapEV, lambdaNM: nm, region: Q.spectralRegion(nm),
      /* Carriers across the gap at room temperature, roughly. A gap of 1 eV
       * leaves almost none; a gap of 0.1 eV leaves plenty. */
      thermalFraction: Math.exp(-toJ(gapEV) / (2 * kB * 298)),
      /* The boundary is a convention, not physics, and 3 eV is too low a
       * place to put it: gallium nitride at 3.4 eV is the semiconductor every
       * blue LED is made of. */
      kind: gapEV < 0.1 ? 'conductor' : gapEV < 4 ? 'semiconductor' : 'insulator',
    };
  }

  /* ================================================ nuclear and strange */

  /* Decay is tunnelling, and tunnelling has no schedule. There is no property
   * of a given nucleus that says when it will go; all you can state is a
   * probability per second, and that is where the exponential comes from. */
  function decay(halfLifeSeconds, timeSeconds, startCount) {
    const lambda = Math.LN2 / halfLifeSeconds;
    const n0 = startCount === undefined ? 1 : startCount;
    return {
      constant: lambda, halfLives: timeSeconds / halfLifeSeconds,
      remaining: n0 * Math.exp(-lambda * timeSeconds),
      fraction: Math.exp(-lambda * timeSeconds),
      activity: lambda * n0 * Math.exp(-lambda * timeSeconds),
      meanLife: 1 / lambda,
    };
  }

  /* A qubit on the Bloch sphere. θ sets the odds, φ is a phase you cannot see
   * in a single measurement but which decides what happens when it interferes
   * — which is where the whole advantage comes from. */
  function qubit(thetaDeg, phiDeg) {
    const t = (thetaDeg * Math.PI) / 180;
    return {
      amplitude0: Math.cos(t / 2), amplitude1: Math.sin(t / 2),
      prob0: Math.pow(Math.cos(t / 2), 2), prob1: Math.pow(Math.sin(t / 2), 2),
      phase: phiDeg, sum: 1,
    };
  }

  /* Bell. For a pair in the singlet state the correlation is −cos of the angle
   * between the detectors, and the CHSH combination of four such measurements
   * reaches 2√2. Anything that was decided in advance cannot pass 2. The
   * experiment gives 2√2, which is not a near miss. */
  function bell(aDeg, aPrimeDeg, bDeg, bPrimeDeg) {
    const corr = (x, y) => -Math.cos(((x - y) * Math.PI) / 180);
    const S = corr(aDeg, bDeg) - corr(aDeg, bPrimeDeg)
      + corr(aPrimeDeg, bDeg) + corr(aPrimeDeg, bPrimeDeg);
    return {
      S: S, magnitude: Math.abs(S),
      classicalLimit: 2, quantumLimit: 2 * Math.SQRT2,
      beatsClassical: Math.abs(S) > 2 + 1e-12,
      correlations: { ab: corr(aDeg, bDeg), abp: corr(aDeg, bPrimeDeg),
        apb: corr(aPrimeDeg, bDeg), apbp: corr(aPrimeDeg, bPrimeDeg) },
    };
  }

  /* How small a thing you can see with a given wavelength. An optical
   * microscope stops at about 200 nm because light does; an electron at 100 kV
   * has a wavelength of a few picometres, which is why you can see atoms. */
  function resolution(lambdaNM, numericalAperture) {
    const na = numericalAperture === undefined ? 1 : numericalAperture;
    return { limitNM: lambdaNM / (2 * na), lambdaNM: lambdaNM };
  }

  Object.assign(ME.quantum, {
    WIEN_B, STEFAN, BOHR_MAGNETON, COMPTON, FINE_STRUCTURE, WIEN_X,
    planck, wienPeak, stefanBoltzmann, photoelectric, compton,
    deBroglieFromSpeed, deBroglieFromVolts, deBroglieFromEnergy,
    bohr, doubleSlit, boxStats, lifetimeLinewidth, superpose,
    angularMomentum, spinMagnitude, zeeman, fineStructure,
    shellCapacity, aufbauOrder, effectiveCharge, moseley,
    lcao, bondOrder, conjugatedBox,
    boltzmannRatio, beerLambert, allowed,
    occupancy, bandGap, decay, qubit, bell, resolution,
  });
})();
