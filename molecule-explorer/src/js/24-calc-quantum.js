/* The Schrödinger equation, solved.
 *
 * Every number the quantum tab prints comes out of here, and nothing in here
 * is a remembered result. The hydrogen ground state is not −13.6 eV because
 * somebody typed −13.6; it is what mₑe⁴/(8ε₀²h²) evaluates to, which is the
 * answer the equation gives when you solve it for one proton and one electron.
 * Same for the Bohr radius, same for hc = 1239.84 eV·nm. If a constant
 * changes, every page changes with it.
 *
 * The exception is the finite well, which has no closed-form answer at all —
 * its energies come out of a numerical root-find. That is not a shortcoming to
 * hide; it is the honest situation for almost every real potential, and the
 * tab says so.
 *
 * Units: joules and metres inside, electronvolts and nanometres at the edges,
 * because eV and nm are the units these numbers are human-sized in. A
 * conversion that happens in one place cannot disagree with itself.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const C = ME.fmt.CONST;
  const { h, hbar, e, c, me, amu, mp, rydbergEnergy, bohrRadius } = C;

  /* eV and nm conversions, in one place each. */
  const toEV = (joules) => joules / e;
  const toJ = (eV) => eV * e;
  const NM = 1e-9;

  /* hc, in the units that make photon arithmetic a one-liner: λ in nm times
   * energy in eV is always 1239.84. Worth knowing by heart, and worth
   * deriving rather than memorising. */
  const HC_EV_NM = (h * c / e) / NM;

  /* ------------------------------------------------- a particle in a box */
  /* The one problem you can do entirely by hand, start to finish, and the
   * reason it is in every course: the algebra is short enough to follow and
   * the result — that confinement forces energy to come in steps — is the
   * whole point of quantum mechanics.
   *
   *   E_n = n²h² / (8mL²)
   *
   * Mass is in electron masses, because every example here is an electron. */
  function boxEnergy(n, lengthNM, massInElectrons) {
    const m = me * (massInElectrons || 1);
    const L = lengthNM * NM;
    if (!(n >= 1) || !(L > 0)) return null;
    const joules = (n * n * h * h) / (8 * m * L * L);
    return { n: n, joules: joules, eV: toEV(joules), L: lengthNM, mass: massInElectrons || 1 };
  }

  function boxLevels(lengthNM, massInElectrons, count) {
    const out = [];
    for (let n = 1; n <= (count || 5); n++) out.push(boxEnergy(n, lengthNM, massInElectrons));
    return out;
  }

  /* ψ_n(x) = √(2/L) sin(nπx/L), which is the only shape that is zero at both
   * walls and solves the equation in between. */
  function boxPsi(n, lengthNM, xNM) {
    const L = lengthNM * NM, x = xNM * NM;
    if (x < 0 || x > L) return 0;
    return Math.sqrt(2 / L) * Math.sin((n * Math.PI * x) / L);
  }

  /* The chance of finding it between a and b.
   *
   * ∫ sin²  has a closed form, so this is exact rather than a sum of slices:
   *   P = (b−a)/L − [sin(2πnb/L) − sin(2πna/L)] / (2πn)
   * A tab that drew a curve and then numerically integrated its own picture
   * would be checking the picture, not the physics. */
  function boxProbability(n, lengthNM, aNM, bNM) {
    const L = lengthNM, a = Math.max(0, Math.min(aNM, bNM)), b = Math.min(L, Math.max(aNM, bNM));
    if (!(L > 0) || !(n >= 1)) return null;
    const k = (2 * Math.PI * n) / L;
    return (b - a) / L - (Math.sin(k * b) - Math.sin(k * a)) / (2 * Math.PI * n);
  }

  /* Jumping between two levels: the photon carries exactly the difference. */
  function boxTransition(from, to, lengthNM, massInElectrons) {
    const a = boxEnergy(from, lengthNM, massInElectrons);
    const b = boxEnergy(to, lengthNM, massInElectrons);
    if (!a || !b) return null;
    const dEeV = Math.abs(b.eV - a.eV);
    return { from: from, to: to, deltaEV: dEeV, absorbed: b.eV > a.eV,
      lambdaNM: dEeV > 0 ? HC_EV_NM / dEeV : Infinity,
      region: dEeV > 0 ? spectralRegion(HC_EV_NM / dEeV) : 'nothing',
      frequency: dEeV > 0 ? toJ(dEeV) / h : 0 };
  }

  /* ------------------------------------------------------------- photons */
  function photonFromEV(eV) {
    return { eV: eV, lambdaNM: HC_EV_NM / eV, frequency: toJ(eV) / h,
      region: spectralRegion(HC_EV_NM / eV) };
  }
  function photonFromNM(nm) {
    return { eV: HC_EV_NM / nm, lambdaNM: nm, frequency: c / (nm * NM),
      region: spectralRegion(nm) };
  }
  /* Named so a reader can tell whether the answer is something they could see.
   * The boundaries are conventions, not physics, and they are approximate on
   * purpose. */
  function spectralRegion(nm) {
    if (nm < 10) return 'X-ray';
    if (nm < 400) return 'ultraviolet';
    if (nm < 450) return 'violet';
    if (nm < 495) return 'blue';
    if (nm < 570) return 'green';
    if (nm < 590) return 'yellow';
    if (nm < 620) return 'orange';
    if (nm < 750) return 'red';
    if (nm < 1e6) return 'infrared';
    return 'microwave or longer';
  }

  /* ------------------------------------------------------ hydrogen atom */
  /* E_n = −Ry/n², with Ry derived from the constants rather than typed. This
   * is the one case where the Schrödinger equation is solved exactly for a
   * real atom, and it is why the equation was believed in the first place.
   *
   * With one correction that matters more than it looks. The electron does not
   * orbit a fixed point: the nucleus is heavy but not infinitely heavy, so both
   * of them move about their shared centre. The fix is to replace the electron
   * mass with the reduced mass μ = mₑM/(mₑ+M) — exactly the same substitution
   * as two atoms on a spring, for exactly the same reason.
   *
   * It is a 0.05% change, and it is the difference between an ionisation energy
   * of 13.606 eV and the measured 13.598. Leaving it out would make this tab
   * disagree with a data table for no reason other than laziness. */
  function hydrogenEnergy(n, Z, nucleusAMU) {
    const z = Z || 1;
    const M = (nucleusAMU === undefined ? mp / amu : nucleusAMU) * amu;
    const reduced = 1 / (1 + me / M);
    const joules = -(reduced * z * z * rydbergEnergy) / (n * n);
    return { n: n, Z: z, reduced: reduced, joules: joules, eV: toEV(joules) };
  }

  const SERIES = [
    [1, 'Lyman', 'ultraviolet'], [2, 'Balmer', 'visible, mostly'],
    [3, 'Paschen', 'infrared'], [4, 'Brackett', 'infrared'], [5, 'Pfund', 'far infrared'],
  ];
  function hydrogenTransition(from, to, Z, nucleusAMU) {
    const a = hydrogenEnergy(from, Z, nucleusAMU), b = hydrogenEnergy(to, Z, nucleusAMU);
    const dEeV = Math.abs(b.eV - a.eV);
    const lower = Math.min(from, to);
    const named = SERIES.filter((s) => s[0] === lower)[0];
    return { from: from, to: to, deltaEV: dEeV, absorbed: b.eV > a.eV,
      lambdaNM: HC_EV_NM / dEeV, region: spectralRegion(HC_EV_NM / dEeV),
      series: named ? named[1] : null, seriesWhere: named ? named[2] : null };
  }
  /* The energy to tear the electron off entirely: from n up to free. */
  function ionisationEV(n, Z, nucleusAMU) { return -hydrogenEnergy(n, Z, nucleusAMU).eV; }

  /* ------------------------------------------------ harmonic oscillator */
  /* A bond as a spring. E_n = (n + ½)ℏω, which has two features worth more
   * than the formula: the levels are evenly spaced, unlike every other system
   * here, and the lowest one is not zero. A bond at absolute zero is still
   * vibrating, and this says by how much.
   *
   * Reduced mass in atomic mass units, force constant in N/m. */
  function oscillator(forceConstant, reducedMassAMU, n) {
    const mu = reducedMassAMU * amu;
    const omega = Math.sqrt(forceConstant / mu);
    const spacing = hbar * omega;
    const level = (lv) => ({ n: lv, joules: (lv + 0.5) * spacing, eV: toEV((lv + 0.5) * spacing) });
    return {
      omega: omega, spacingEV: toEV(spacing), zeroPointEV: toEV(0.5 * spacing),
      level: level, at: level(n === undefined ? 0 : n),
      /* Spectroscopists quote vibrations in cm⁻¹, which is a frequency divided
       * by the speed of light. It is the number an IR spectrum is labelled in. */
      wavenumber: omega / (2 * Math.PI * c * 100),
      lambdaNM: HC_EV_NM / toEV(spacing),
    };
  }
  /* Two atoms on one spring behave like one mass of μ = m₁m₂/(m₁+m₂). */
  function reducedMass(m1AMU, m2AMU) { return (m1AMU * m2AMU) / (m1AMU + m2AMU); }

  /* ----------------------------------------------------------- tunnelling */
  /* The thing that has no classical version at all: a particle with less
   * energy than the wall arrives on the other side anyway.
   *
   *   T = 1 / (1 + V₀² sinh²(κa) / (4E(V₀−E))),    κ = √(2m(V₀−E))/ℏ
   *
   * sinh grows like a doubling exponential, so T falls off a cliff with width.
   * That steepness is not a quirk — it is why a scanning tunnelling microscope
   * can see single atoms, and why one extra bond length of insulation stops a
   * current dead. */
  function tunnel(energyEV, barrierEV, widthNM, massInElectrons) {
    const m = me * (massInElectrons || 1);
    const E = toJ(energyEV), V0 = toJ(barrierEV), a = widthNM * NM;
    if (!(a > 0) || !(E > 0)) return null;
    if (energyEV >= barrierEV) {
      /* Over the top, and still not a certainty — it can reflect off a step it
       * clears. Same formula with sin in place of sinh. */
      const k = Math.sqrt(2 * m * (E - V0)) / hbar;
      const s = Math.sin(k * a);
      const T = 1 / (1 + (V0 * V0 * s * s) / (4 * E * (E - V0) || 1e-300));
      return { T: T, over: true, kappa: k, decayLengthNM: Infinity };
    }
    const kappa = Math.sqrt(2 * m * (V0 - E)) / hbar;
    const sh = Math.sinh(kappa * a);
    const T = 1 / (1 + (V0 * V0 * sh * sh) / (4 * E * (V0 - E)));
    return { T: T, over: false, kappa: kappa, decayLengthNM: 1 / kappa / NM };
  }

  /* ---------------------------------------------------- a finite-depth well */
  /* The same box, but with walls you can climb out of. There is no formula for
   * the answers: the boundary conditions give
   *
   *   even states:  u tan u = √(R² − u²)
   *   odd  states: −u cot u = √(R² − u²)      u = (L/2)√(2mE)/ℏ,  R = (L/2)√(2mV₀)/ℏ
   *
   * and those cannot be rearranged for u. So they are found by bisection,
   * branch by branch. Worth meeting early: the particle in a box is the
   * unusual case, not the normal one. */
  function finiteWell(barrierEV, widthNM, massInElectrons) {
    const m = me * (massInElectrons || 1);
    const L = widthNM * NM, V0 = toJ(barrierEV);
    const R = (L / 2) * Math.sqrt(2 * m * V0) / hbar;
    const levels = [];
    /* Each half-π branch of tan holds at most one state, and there is always
     * at least one bound state however shallow the well. */
    const branches = Math.ceil(R / (Math.PI / 2));
    for (let k = 0; k < branches; k++) {
      const even = k % 2 === 0;
      const lo = k * (Math.PI / 2) + 1e-9;
      const hi = Math.min(R - 1e-9, (k + 1) * (Math.PI / 2) - 1e-9);
      if (hi <= lo) break;
      const f = (u) => (even ? u * Math.tan(u) : -u / Math.tan(u)) - Math.sqrt(Math.max(0, R * R - u * u));
      if (f(lo) * f(hi) > 0) continue;
      let a = lo, b = hi;
      for (let i = 0; i < 120; i++) {
        const mid = (a + b) / 2;
        if (f(a) * f(mid) <= 0) b = mid; else a = mid;
      }
      const u = (a + b) / 2;
      const E = (2 * hbar * hbar * u * u) / (m * L * L);
      levels.push({ n: levels.length + 1, eV: toEV(E), joules: E, even: even, u: u });
    }
    return { R: R, barrierEV: barrierEV, widthNM: widthNM, levels: levels,
      /* How many fit. A well that is too shallow or too narrow holds exactly
       * one, and never zero. */
      count: levels.length };
  }

  /* ------------------------------------------------------- uncertainty */
  /* Δx Δp ≥ ℏ/2. Not a statement about clumsy measurement — it is a property
   * of anything built out of waves, and it is why squeezing a particle into a
   * small box raises its energy. */
  function uncertainty(positionNM, massInElectrons) {
    const m = me * (massInElectrons || 1);
    const dx = positionNM * NM;
    const dp = hbar / (2 * dx);
    return { dx: positionNM, dp: dp, speed: dp / m,
      energyEV: toEV((dp * dp) / (2 * m)) };
  }

  /* de Broglie: everything has a wavelength, it is just absurdly small for
   * anything you can hold. */
  function deBroglie(massKG, speed) {
    return { lambda: h / (massKG * speed), lambdaNM: h / (massKG * speed) / NM };
  }

  ME.quantum = {
    HC_EV_NM: HC_EV_NM, toEV: toEV, toJ: toJ,
    boxEnergy, boxLevels, boxPsi, boxProbability, boxTransition,
    photonFromEV, photonFromNM, spectralRegion,
    hydrogenEnergy, hydrogenTransition, ionisationEV, SERIES,
    oscillator, reducedMass, tunnel, finiteWell, uncertainty, deBroglie,
  };
})();
