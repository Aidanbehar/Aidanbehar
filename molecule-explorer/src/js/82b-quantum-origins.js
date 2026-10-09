/* Where the quantum idea came from.
 *
 * These pages come before the Schrödinger equation on purpose. Every one of
 * them is an experiment that classical physics got flatly, measurably wrong —
 * not approximately wrong, wrong by factors of billions or in the opposite
 * direction. A reader who has seen the damage understands why anybody would
 * tear up mechanics and start again; a reader who meets the equation first
 * has to take it on trust.
 *
 * Every page opens with a plain-words summary (the fourth argument). That box
 * carries no equations, no symbols and no words the page has not earned yet.
 * Somebody who reads only the boxes should still finish the tab knowing what
 * quantum mechanics claims.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const Q = ME.quantum;
  const F = ME.quantumFigures;
  const { p, b, em, callout, table, worked, term } = K;
  const { qeq, h3 } = ME.quantumInternals;
  const fmt = (x, s) => ME.fmt.fmt(x, s || 4);
  const frag = (...kids) => K.frag(kids.flat());
  const page = (id, name, blurb, short, build) =>
    ME.quantumPage('Where it came from', id, name, blurb, short, build);

  page('catastrophe', 'The ultraviolet catastrophe', 'Classical physics predicts infinity',
    'Hot things glow, and old physics could not say why. Worse: it said every warm object '
    + 'should blast out infinite ultraviolet. Planck fixed it by guessing that light can only '
    + 'be built up in whole lumps, never in any amount you like. That guess started all of this.',
    () => frag(
    p('Heat something up and it glows. A poker goes dull red, then orange, then white. That is '
      + 'about as ordinary as physics gets, and in 1900 nobody could explain it — not '
      + 'approximately, not nearly. The theory gave an answer of infinity.'),
    h3('How you get to infinity by doing everything right'),
    p('Light inside a hot oven bounces back and forth between the walls, and as with a guitar '
      + 'string, only the waves that fit neatly between the ends survive. Call each wave that fits '
      + 'a ', em('way of wiggling'), '. Classical physics then adds one rule, and the whole disaster '
      + 'comes out of it: on average, every way of wiggling ends up holding the same amount of '
      + 'energy. Nothing gets a bigger share for being short or long. Everybody gets the same wage.'),
    p('So count the ways of wiggling, pay each one its wage, and add up the bill. Here is the '
      + 'problem. Short waves fit between the walls in far more ways than long ones — halve the '
      + 'wavelength and you roughly ', em('octuple'), ' the number of ways — and there is no '
      + 'shortest wave. The workforce is infinite and everyone is on the same wage, so the payroll '
      + 'is infinite. That is not a rounding error in the theory. That is the theory.'),
    callout(b('Taken seriously, this says that opening an oven door should kill you. '),
      'Every warm object would dump most of its energy as ultraviolet and X-rays, instantly, '
      + 'because that is where almost all of the ways of wiggling are. Ehrenfest named it the '
      + 'ultraviolet catastrophe. It is the clearest case in physics of a theory being not '
      + 'slightly off but visibly absurd.'),
    F.blackbodyFigure(),
    h3('Planck’s fix, which he hated'),
    p('Planck found one assumption that makes the curve come out right. A wiggle of frequency f '
      + 'cannot hold just any amount of energy. It can hold one lump, or two lumps, or seventeen '
      + 'lumps — never half a lump — and the size of a lump is hf:'),
    qeq('E = nhf,    n = 1, 2, 3, …'),
    p('Why that fixes it is worth following rather than memorising, and the wage analogy carries '
      + 'straight over. A high-frequency wiggle has a big lump size, so it will not turn up for '
      + 'less than a big payment. At the temperature of an oven there is nowhere near enough energy '
      + 'going around to pay that, so those wiggles never show up for work at all. The short '
      + 'wavelengths are not sharing the energy. They are ', b('priced out'), '. The sum stops '
      + 'running away because almost all of its terms are now zero.'),
    p('Note what Planck did not say. He did not say light is made of particles — only that it '
      + 'is handed over in whole lumps, which he took for a bookkeeping trick that somebody would '
      + 'later explain away. It took Einstein, five years on, to say the uncomfortable thing: the '
      + 'lumps are real, and they are what light is made of.'),
    h3('What falls out for free'),
    p('Two laws that had been found by measurement, with no explanation behind them, now follow '
      + 'from the curve. Wien’s law says the peak colour shifts as 1/T, and Stefan’s law says the '
      + 'total power goes as T⁴. Both are derivable and both are checkable:'),
    table(['Object', 'Temperature', 'Peak wavelength', 'Which is'], [
      ['You', '310 K', Math.round(Q.wienPeak(310).lambdaNM) + ' nm', 'far infrared — a thermal camera sees you by this'],
      ['A wood fire', '1100 K', Math.round(Q.wienPeak(1100).lambdaNM) + ' nm', 'infrared, with the red tail just visible'],
      ['A filament bulb', '2800 K', Math.round(Q.wienPeak(2800).lambdaNM) + ' nm', 'still infrared — most of the power is heat, not light'],
      ['The Sun', '5772 K', Math.round(Q.wienPeak(5772).lambdaNM) + ' nm', 'green, right in the middle of what your eyes do'],
      ['Rigel', '11000 K', Math.round(Q.wienPeak(11000).lambdaNM) + ' nm', 'ultraviolet, which is why it looks blue-white'],
    ], 'Every number from λT = hc/kx, with x the root of x = 5(1 − e⁻ˣ) solved in the app.'),
    p('The Sun row is worth a second look. Your eyes are most sensitive exactly where the Sun is '
      + 'brightest. That is a fact about evolution rather than about physics. But it is a nice '
      + 'one: it means the quantum theory of hot objects is what tells you why green ended up in '
      + 'the middle of the colours you can see.')
  ));

  page('photoelectric', 'Light arrives in lumps', 'The photoelectric effect, and why brightness does nothing',
    'Shine light on metal and electrons come off — but only if the light is blue enough. Red '
    + 'light fails however bright you make it. That only makes sense if each electron is knocked '
    + 'out by one single lump of light, and a red lump is too small to do the job.',
    () => frag(
    p('Shine light on a metal and electrons come off. Classically that is easy. Light is a wave, '
      + 'the wave shakes the electrons loose, and a stronger wave shakes them harder, so brighter '
      + 'light should give faster electrons. It should also work at any colour if you are patient, '
      + 'because a weak wave just takes longer to build the energy up.'),
    p('Neither happens. And the way it fails is specific enough to point straight at the answer:'),
    table(['What you do', 'What classical physics says', 'What actually happens'], [
      ['Make the light brighter', 'Faster electrons', 'More electrons, each one exactly as fast as before'],
      ['Use redder light', 'Slower electrons, eventually', 'Below a threshold colour, nothing at all — forever'],
      ['Use very dim light', 'A delay while energy accumulates', 'Electrons appear immediately, just fewer of them'],
      ['Make the light bluer', 'Not much', 'Faster electrons, in exact proportion to the frequency'],
    ]),
    callout(b('The threshold is the killer. '), 'A dim blue lamp frees electrons from sodium. An '
      + 'arc lamp of red light, blindingly bright, frees none — not one, not ever, no matter how '
      + 'long you leave it on. A wave has no way out of this. Pour in enough energy and something '
      + 'should eventually give. Nothing gives.'),
    h3('One lump, one electron'),
    p('Einstein’s reading, in 1905, was that light arrives as lumps of energy hf, and that each '
      + 'electron is hit by exactly one of them. No teaming up, no saving the energy from an '
      + 'earlier lump. One lump, one electron, take it or leave it.'),
    p('Every row of that table then falls into place at once. Brighter light means more lumps '
      + 'arriving, so more electrons come off — but not faster ones, because each electron is '
      + 'still being paid by a single lump of the same size. Redder light means smaller lumps, and '
      + 'below a certain size a lump simply cannot cover the cost of getting out of the metal:'),
    qeq('(energy of the fastest electron) = hf − φ'),
    p('φ is the work function: the toll an electron pays to leave. Read the equation as a '
      + 'sentence and it says what the lump brought in, minus the toll, is what the electron '
      + 'leaves with. It is also a straight line, which is what made the experiment decisive. '
      + 'Plot electron energy against frequency and Planck’s constant is the slope — you can get '
      + 'it off the graph with a ruler:'),
    F.photoelectricFigure(),
    worked('Violet light on sodium', [
      { q: 'The light', why: '400 nm, so each photon carries 1239.8/400',
        maths: fmt(Q.photonFromNM(400).eV, 4) + ' eV' },
      { q: 'The toll', why: 'Sodium’s work function is 2.28 eV', maths: '2.28 eV' },
      { q: 'What is left', why: fmt(Q.photonFromNM(400).eV, 4) + ' − 2.28',
        maths: fmt(Q.photoelectric(400, 2.28).kineticEV, 3) + ' eV' },
      { q: 'As a speed', why: 'From ½mv² for an electron',
        maths: Math.round(Q.photoelectric(400, 2.28).speed / 1000) + ' km/s' },
      { q: 'The stopping voltage', why: 'The voltage that just turns the fastest one back. It is '
          + 'numerically the same as the energy in eV, which is the whole reason eV is a '
          + 'convenient unit here',
        maths: fmt(Q.photoelectric(400, 2.28).stoppingVolts, 3) + ' V' },
      { q: 'And the threshold', why: '1239.8/2.28 — any longer than this and nothing happens',
        maths: Math.round(Q.photoelectric(400, 2.28).thresholdNM) + ' nm, which is green' },
    ]),
    p('That last line is testable on a kitchen table. Green light on sodium: nothing. Blue light: '
      + 'electrons. The line between the two sits at '
      + Math.round(Q.photoelectric(400, 2.28).thresholdNM) + ' nm, and it is sharp.')
  ));

  page('compton', 'Photons push back', 'Compton scattering, and momentum without mass',
    'X-rays bouncing off a block of graphite come back a redder colour, by an amount that '
    + 'depends only on the angle. Waves cannot do that. Collisions can. So a lump of light does '
    + 'not just carry energy — it carries a shove, exactly like a moving ball.',
    () => frag(
    p('The photoelectric effect says light carries energy in lumps. Compton’s experiment, twenty '
      + 'years later, says those lumps also carry ', b('momentum'), '. That is the one that '
      + 'settled the argument, because momentum is the thing a moving object has and a spreading '
      + 'wave does not.'),
    p('Fire X-rays at a block of graphite and look at what comes out sideways. Some of it comes '
      + 'back at a longer wavelength than it went in — and the amount of lengthening depends only '
      + 'on the angle you look at. Not on the material, not on the wavelength you started with:'),
    qeq('Δλ = (h/mₑc)(1 − cos θ)'),
    p('A wave cannot do this. Shake an electron with a wave of some frequency and it re-radiates '
      + 'at the frequency you shook it at, because that is the only frequency in the problem. '
      + 'Shift the colour and you have left wave physics behind.'),
    callout(b('Treat it as a collision and it is just snooker. '), 'A photon carrying momentum '
      + 'h/λ hits a stationary electron. Conserve energy and conserve momentum — the same two '
      + 'rules you would use on two billiard balls, with relativity for the electron — and the '
      + 'formula above drops out in a page of algebra. The photon loses energy to the electron it '
      + 'hit, and a photon that has lost energy is a photon with a longer wavelength.'),
    p('The quantity h/mₑc in that formula is the ', term('Compton wavelength',
      'h/mc for a particle, the wavelength at which its quantum and relativistic descriptions '
      + 'collide. For an electron it is 2.426 pm.'), ' of the electron, '
      + fmt(Q.COMPTON * 1e12, 5) + ' pm. It is not a size, and the electron is not that big. It '
      + 'is the scale at which pinning an electron down gets absurdly expensive: squeeze one into '
      + 'that space and it costs more energy than it would take to make a second electron out of '
      + 'nothing. Which is the point where this subject hands over to particle physics.'),
    worked('X-rays bouncing off at a right angle', [
      { q: 'Going in', why: '0.0709 nm, the molybdenum Kα line Compton used',
        maths: fmt(Q.photonFromNM(0.0709).eV / 1000, 4) + ' keV' },
      { q: 'The shift at 90°', why: '(h/mₑc)(1 − cos 90°) = h/mₑc, the whole Compton wavelength',
        maths: fmt(Q.compton(0.0709, 90).shiftNM * 1000, 4) + ' pm' },
      { q: 'Coming out', why: '0.0709 nm + the shift',
        maths: fmt(Q.compton(0.0709, 90).lambdaOutNM, 5) + ' nm' },
      { q: 'What the electron got', why: 'The energy the photon lost, which is now kinetic energy in the graphite',
        maths: fmt(Q.compton(0.0709, 90).electronEV, 4) + ' eV' },
      { q: 'Straight back at 180°', why: 'Twice the shift, because (1 − cos 180°) = 2',
        maths: fmt(Q.compton(0.0709, 180).shiftNM * 1000, 4) + ' pm' },
    ]),
    p('And notice what the formula does not contain: the wavelength you started with. A 0.07 nm '
      + 'X-ray and a 0.01 nm gamma ray shift by exactly the same '
      + fmt(Q.COMPTON * 1e12, 4) + ' pm at 90°. That is a very strange thing for a wave to do '
      + 'and a very ordinary thing for a collision.')
  ));

  page('spectra', 'Why atoms glow in stripes', 'Line spectra, Bohr, and a rule with no reason',
    'A hydrogen lamp does not glow in all colours. It glows in four sharp lines and nothing in '
    + 'between, and every hydrogen lamp in the universe picks the same four. Something inside '
    + 'the atom is only allowed certain energies, and the lines are the gaps between them.',
    () => frag(
    p('Put hydrogen in a tube and run a current through it and it glows pink. Split that light '
      + 'with a prism and the pink turns out to be four sharp lines — red, blue-green, violet, '
      + 'deep violet — with darkness in between. Every hydrogen tube in every lab gives the same '
      + 'four. So does every star.'),
    p('Classically this is impossible twice over. An electron going round a nucleus is a charge '
      + 'going round a corner, and charges that go round corners radiate their energy away. So '
      + 'the electron should spiral into the nucleus in about ten picoseconds, with its colour '
      + 'sliding smoothly up the scale as it falls in. Instead, atoms last for billions of years '
      + 'and give out a handful of exact frequencies.'),
    h3('Balmer’s formula, which nobody could explain'),
    p('In 1885 a Swiss schoolteacher noticed that the four visible lines fit one expression with '
      + 'no physics in it at all — just small whole numbers:'),
    qeq('1/λ = R (1/n₁² − 1/n₂²)'),
    p('It worked to five figures. It predicted lines nobody had looked for yet, in the ultraviolet '
      + 'and the infrared, and they were there. And it meant nothing. Why would the colour of '
      + 'light depend on the difference of two reciprocal squares?'),
    h3('Bohr’s answer, and the price of it'),
    p('Bohr’s 1913 model says three things. The electron can only sit in certain orbits. It does '
      + 'not radiate while it stays in one. And light comes out when it drops from one orbit to '
      + 'another, carrying away exactly the energy difference. Pick which orbits are allowed by '
      + 'insisting the angular momentum is a whole multiple of ℏ, and the energies come out as '
      + '−' + fmt(Q.ionisationEV(1), 5) + '/n² eV — which reproduces Balmer exactly.'),
    table(['Orbit', 'Radius', 'Electron speed', 'Energy'], [1, 2, 3, 4].map((n) => {
      const bo = Q.bohr(n);
      return ['n = ' + n, fmt(bo.radiusNM, 4) + ' nm',
        fmt(bo.fractionOfLight * 100, 3) + '% of light speed', fmt(bo.energyEV, 4) + ' eV'];
    }), 'The n = 1 radius is the Bohr radius, and it is still the unit atoms are measured in.'),
    callout(b('But why whole multiples of ℏ? '), 'Bohr had no answer and said so. The model also '
      + 'fails completely on helium, says nothing about why some lines come out brighter than '
      + 'others, and puts the electron on a definite path — which later turns out to be the one '
      + 'thing it certainly does not have. It is right about the energies and wrong about '
      + 'everything underneath them, which is a specific and useful kind of wrong.'),
    h3('The hint that cracked it'),
    p('Ten years later de Broglie pointed out what Bohr’s rule had been saying all along. '
      + 'Angular momentum mvr = nℏ rearranges to 2πr = n(h/mv), and h/mv is a wavelength. So the '
      + 'rule reads: ', b('a whole number of wavelengths fits around the orbit.')),
    table(['Orbit', 'Circumference', 'One de Broglie wavelength', 'How many fit'], [1, 2, 3].map((n) => {
      const bo = Q.bohr(n);
      return ['n = ' + n, fmt(bo.circumferenceNM, 4) + ' nm', fmt(bo.deBroglieNM, 4) + ' nm',
        fmt(bo.circumferenceNM / bo.deBroglieNM, 3)];
    }), 'Exactly n, every time. Not approximately — exactly, by construction.'),
    p('Which is the guitar string again, bent into a circle. A guitar string can only play the '
      + 'notes whose waves fit its length, and an atom can only hold the orbits whose waves fit '
      + 'the way round. Bohr’s mysterious whole numbers were counting waves the whole time, and '
      + 'the next page is about what put the wave there.')
  ));

  page('debroglie', 'Everything has a wavelength', 'Matter waves, and why you have never noticed yours',
    'If light can behave like a particle, maybe particles can behave like waves. They do — '
    + 'electrons diffract. You have never noticed your own wavelength because it is smaller '
    + 'than a proton by a factor with twenty-five zeros in it.',
    () => frag(
    p('In 1924, in a doctoral thesis his examiners were not sure what to do with, de Broglie '
      + 'proposed a symmetry. Light had been a wave and turned out to carry momentum like a '
      + 'particle. So perhaps matter, which everyone agreed was particles, carries a wavelength:'),
    qeq('λ = h / p = h / mv'),
    p('No new constant, no new mechanism — just the photon relation read backwards. It is the '
      + 'kind of idea that is either empty or enormous, and three years later Davisson and Germer '
      + 'bounced electrons off a nickel crystal and got a diffraction pattern out. Electrons '
      + 'diffract. The thesis was right.'),
    h3('Why nobody noticed for three hundred years'),
    p('Because h is tiny and everyday masses are not. Momentum sits on the bottom of that '
      + 'fraction, so the heavier and faster a thing is, the shorter its wavelength:'),
    table(['Thing', 'Momentum', 'Wavelength', 'Compared with'], [
      ['A thrown cricket ball', '0.145 kg at 40 m/s',
        ME.fmt.sciUnicode(Q.deBroglieFromSpeed(0.145, 40).lambdaNM * 1e-9, 3) + ' m',
        'a billion billion times smaller than a proton'],
      ['A walking person', '70 kg at 1.4 m/s',
        ME.fmt.sciUnicode(Q.deBroglieFromSpeed(70, 1.4).lambdaNM * 1e-9, 3) + ' m',
        'there is no comparison to make'],
      ['An electron in a 100 V tube', 'from the accelerating voltage',
        fmt(Q.deBroglieFromVolts(100).lambdaNM, 4) + ' nm', 'about an atom wide'],
      ['An electron at 100 kV', 'an electron microscope',
        fmt(Q.deBroglieFromVolts(100000).lambdaNM, 4) + ' nm', 'smaller than an atom — so you can see atoms'],
      ['A neutron from a reactor', 'thermal, around 300 K',
        fmt(Q.deBroglieFromEnergy(0.025, 1839).lambdaNM, 4) + ' nm', 'the spacing between atoms in a crystal'],
    ]),
    callout(b('The cricket ball’s wavelength is not small. It is nothing. '),
      'Twenty-five orders of magnitude below the size of a proton. There is no experiment, even '
      + 'in principle, that could reveal it. That is why ordinary mechanics works so well, and '
      + 'why it took until the twentieth century for anyone to notice something was wrong. The '
      + 'quantum effects were never hiding. They were scaled by a number with thirty-three zeros '
      + 'after the point.'),
    h3('And why it matters that it is small but not zero'),
    p('The electron microscope row is the practical payoff. No microscope can resolve anything '
      + 'much smaller than half a wavelength of whatever it is looking with. For ordinary light '
      + 'that puts the floor at roughly '
      + Math.round(Q.resolution(550).limitNM) + ' nm: you can see a bacterium, and you will '
      + 'never see a virus. Now accelerate an electron through 100 kV. Its wavelength is '
      + fmt(Q.deBroglieFromVolts(100000).lambdaNM * 1000, 3) + ' picometres, smaller than an atom. '
      + 'Same optics, same limit, a hundred thousand times finer. Every image you have ever seen '
      + 'of individual atoms exists because electrons have a wavelength.')
  ));

  page('doubleslit', 'The two-slit experiment', 'The one that nobody has explained away',
    'Send electrons one at a time through two slits and they build up stripes on the screen, as '
    + 'though each one went through both slits and interfered with itself. Watch which slit each '
    + 'one uses and the stripes vanish. Nobody has ever made this feel reasonable.',
    () => frag(
    p('Feynman called this the only mystery — the one phenomenon that contains everything strange '
      + 'about quantum mechanics, and which no amount of cleverness has ever reduced to something '
      + 'familiar. It is worth meeting carefully.'),
    p('Two narrow slits, a source, a screen. With water waves you get an interference pattern: '
      + 'bands where the two paths arrive in step and add up, and gaps where they arrive out of '
      + 'step and cancel out. Nothing odd about that — it is what waves do. But hold on to the '
      + 'gaps, because a gap is a place where opening a second slit made ', em('less'),
      ' arrive, not more.'),
    p('Now fire electrons, one at a time, slowly enough that only one is anywhere in the '
      + 'apparatus at a time. Each one arrives as a single dot, so each one is a whole particle '
      + 'landing in one place. Wait, and watch the dots pile up:'),
    F.doubleSlitFigure(),
    callout(b('The bands appear anyway. '), 'There was never a second electron for the first one '
      + 'to interfere with. Whatever goes through the slits goes through both, interferes with '
      + 'itself, and then lands in one spot. Close one slit and the bands vanish — so each '
      + 'electron somehow depends on whether the other slit is open, even though it arrives as '
      + 'one indivisible thing.'),
    h3('The part that makes people argue'),
    p('Put a detector at the slits to see which one each electron uses. You get a perfectly '
      + 'reliable answer every time: this one, that one, this one. And the bands disappear. What '
      + 'you get instead is the plain sum of two single-slit patterns, exactly as if the electrons '
      + 'had been ordinary little balls all along.'),
    p('The usual explanation is that measuring disturbs them, and that is not quite right. The '
      + 'experiment has been run with detectors so gentle that the shove they give is far too '
      + 'small to wash out the fringes, and the fringes still go. So it is not the jostling. What '
      + 'matters is that ', b('the two paths have stopped being indistinguishable.'), ' '
      + 'Interference happens when there is genuinely no fact anywhere about which way the '
      + 'electron went. Create that fact — even as a record nobody ever reads — and the '
      + 'interference is gone.'),
    h3('And it is not just electrons'),
    p('The same pattern has been produced with neutrons, with whole atoms, with buckyballs of '
      + 'sixty carbons, and with molecules of several thousand atoms. There is no known mass at '
      + 'which it stops. It does get harder as things get heavier, partly because the wavelength '
      + 'shrinks and partly because keeping the two paths indistinguishable gets harder. That '
      + 'second reason is decoherence, it has a page of its own later on, and it is the best '
      + 'answer anyone has to why you do not diffract when you walk through a doorway.')
  ));
})();
