/* Where the quantum idea came from.
 *
 * These pages come before the Schrödinger equation on purpose. Every one of
 * them is an experiment that classical physics got flatly, measurably wrong —
 * not approximately wrong, wrong by factors of billions or in the opposite
 * direction. A reader who has seen the damage understands why anybody would
 * tear up mechanics and start again; a reader who meets the equation first
 * has to take it on trust.
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
  const page = (id, name, blurb, build) =>
    ME.quantumPage('Where it came from', id, name, blurb, build);

  page('catastrophe', 'The ultraviolet catastrophe', 'Classical physics predicts infinity', () => frag(
    p('Heat something up and it glows. A poker goes dull red, then orange, then white. That is '
      + 'about as ordinary as physics gets, and in 1900 nobody could explain it — not '
      + 'approximately, not nearly. The theory gave an answer of infinity.'),
    p('The reasoning was impeccable. Inside a hot cavity, light rattles around in standing waves, '
      + 'and classical physics has an iron rule that every way a system can wiggle gets the same '
      + 'share of energy on average. Count the standing waves that fit, give each one its share, '
      + 'add them up. The trouble is that short wavelengths fit in far more ways than long ones '
      + '— and there is no shortest wavelength. So the sum runs away.'),
    callout(b('Taken seriously, this says that opening an oven door should kill you. '),
      'Every warm object would dump most of its energy as ultraviolet and X-rays, instantly. '
      + 'Ehrenfest named it the ultraviolet catastrophe, and it is the clearest case in physics of '
      + 'a theory being not slightly off but spectacularly, visibly absurd.'),
    F.blackbodyFigure(),
    h3('Planck’s fix, which he hated'),
    p('Planck found that one assumption makes the curve come out right: that a wiggle of frequency '
      + 'f cannot hold just any amount of energy, only whole multiples of a lump:'),
    qeq('E = nhf,    n = 1, 2, 3, …'),
    p('That single change fixes everything, and the reason it works is worth understanding rather '
      + 'than memorising. A high-frequency wiggle needs a ', em('big'), ' lump to get started — '
      + 'a whole hf. At the temperatures involved there is simply not enough energy going around to '
      + 'pay the entry fee, so those wiggles sit empty. The short wavelengths are not sharing; they '
      + 'are priced out. The sum stops running away because most of its terms are zero.'),
    p('Planck thought this was a mathematical trick to be explained away later. It took Einstein, '
      + 'five years on, to say the obvious uncomfortable thing: the lumps are real.'),
    h3('What falls out for free'),
    p('Two laws that had been found by measurement and had no explanation now follow from the '
      + 'curve. Wien’s law says the peak shifts as 1/T, and Stefan’s law says the total '
      + 'power goes as T⁴ — both derivable, both checkable:'),
    table(['Object', 'Temperature', 'Peak wavelength', 'Which is'], [
      ['You', '310 K', Math.round(Q.wienPeak(310).lambdaNM) + ' nm', 'far infrared — a thermal camera sees you by this'],
      ['A wood fire', '1100 K', Math.round(Q.wienPeak(1100).lambdaNM) + ' nm', 'infrared, with the red tail just visible'],
      ['A filament bulb', '2800 K', Math.round(Q.wienPeak(2800).lambdaNM) + ' nm', 'still infrared — most of the power is heat, not light'],
      ['The Sun', '5772 K', Math.round(Q.wienPeak(5772).lambdaNM) + ' nm', 'green, right in the middle of what your eyes do'],
      ['Rigel', '11000 K', Math.round(Q.wienPeak(11000).lambdaNM) + ' nm', 'ultraviolet, which is why it looks blue-white'],
    ], 'Every number from λT = hc/kx, with x the root of x = 5(1 − e⁻ˣ) solved in the app.'),
    p('The Sun row is not a coincidence worth passing over. Your eyes are sensitive exactly where '
      + 'the Sun is brightest, which is a fact about evolution rather than about physics — but '
      + 'it is nice that the quantum theory of hot objects tells you why green is the middle of the '
      + 'visible range.')
  ));

  page('photoelectric', 'Light arrives in lumps', 'The photoelectric effect, and why brightness does nothing', () => frag(
    p('Shine light on a metal and electrons come off. Classically that is easy: light is a wave, '
      + 'the wave shakes the electrons, and a stronger wave shakes them harder. Brighter light '
      + 'should give faster electrons. It should also work at any colour, given enough time for '
      + 'the energy to build up.'),
    p('Neither happens, and the way it fails is specific enough to point straight at the answer.'),
    table(['What you do', 'What classical physics says', 'What actually happens'], [
      ['Make the light brighter', 'Faster electrons', 'More electrons, each one exactly as fast as before'],
      ['Use redder light', 'Slower electrons, eventually', 'Below a threshold colour, nothing at all — forever'],
      ['Use very dim light', 'A delay while energy accumulates', 'Electrons appear immediately, just fewer of them'],
      ['Make the light bluer', 'Not much', 'Faster electrons, in exact proportion to the frequency'],
    ]),
    callout(b('The threshold is the killer. '), 'A dim blue lamp frees electrons from sodium. An '
      + 'arc lamp of red light, blindingly bright, frees none — not one, not ever, no matter '
      + 'how long you leave it. A wave has no way to explain that: pour in enough energy and '
      + 'something should eventually give. Nothing gives.'),
    p('Einstein’s reading, in 1905, was that light arrives as lumps of energy hf and each '
      + 'electron is hit by exactly one. Then everything lines up at once. Brighter means more '
      + 'lumps, so more electrons — not faster ones, because each electron still only gets one '
      + 'lump. Redder means smaller lumps, and below a certain size the lump cannot pay the cost of '
      + 'getting out:'),
    qeq('(energy of the fastest electron) = hf − φ'),
    p('φ is the work function, the toll for leaving the metal. The equation is a straight '
      + 'line, which is what makes the experiment so decisive — plot the electron energy '
      + 'against frequency and you can read Planck’s constant off the slope with a ruler:'),
    F.photoelectricFigure(),
    worked('Violet light on sodium', [
      { q: 'The light', why: '400 nm, so each photon carries 1239.8/400',
        maths: fmt(Q.photonFromNM(400).eV, 4) + ' eV' },
      { q: 'The toll', why: 'Sodium’s work function is 2.28 eV', maths: '2.28 eV' },
      { q: 'What is left', why: fmt(Q.photonFromNM(400).eV, 4) + ' − 2.28',
        maths: fmt(Q.photoelectric(400, 2.28).kineticEV, 3) + ' eV' },
      { q: 'As a speed', why: 'From ½mv² for an electron',
        maths: Math.round(Q.photoelectric(400, 2.28).speed / 1000) + ' km/s' },
      { q: 'The stopping voltage', why: 'The potential that just turns the fastest one back — '
          + 'numerically the same as the energy in eV, which is what makes eV such a convenient unit',
        maths: fmt(Q.photoelectric(400, 2.28).stoppingVolts, 3) + ' V' },
      { q: 'And the threshold', why: '1239.8/2.28 — longer than this and nothing happens',
        maths: Math.round(Q.photoelectric(400, 2.28).thresholdNM) + ' nm, which is green' },
    ]),
    p('That last line is testable on a kitchen table. Green light on sodium: nothing. Blue: '
      + 'electrons. The line between them sits at '
      + Math.round(Q.photoelectric(400, 2.28).thresholdNM) + ' nm and it is sharp.')
  ));

  page('compton', 'Photons push back', 'Compton scattering, and momentum without mass', () => frag(
    p('The photoelectric effect says light carries energy in lumps. Compton’s experiment, '
      + 'twenty years later, says those lumps also carry ', b('momentum'), ' — and that is the '
      + 'one that settled the argument, because momentum is what particles have and waves do not.'),
    p('Fire X-rays at a block of graphite and look at what comes out sideways. Some of it comes '
      + 'back at a longer wavelength than it went in — and the amount it lengthens depends only '
      + 'on the angle, never on the material or the starting wavelength:'),
    qeq('Δλ = (h/mₑc)(1 − cos θ)'),
    p('A wave cannot do this. Scatter a wave off something and it comes back at the same frequency, '
      + 'because the electron is being shaken at that frequency and re-radiates at the frequency it '
      + 'is shaken. Shift the colour and you have left wave physics behind.'),
    callout(b('Treat it as a collision and it is just snooker. '), 'A photon with momentum h/λ '
      + 'hits a stationary electron. Conserve energy and momentum — the same two rules you '
      + 'would use for two billiard balls, with relativity for the electron — and the formula '
      + 'above drops out in a page of algebra. The photon loses energy to the electron, and a photon '
      + 'that has lost energy is a photon with a longer wavelength.'),
    p('The quantity h/mₑc that appears is the ', term('Compton wavelength',
      'h/mc for a particle, the wavelength at which its quantum and relativistic descriptions '
      + 'collide. For an electron it is 2.426 pm.'), ' of the electron, '
      + fmt(Q.COMPTON * 1e12, 5) + ' pm. It is not a size, and the electron is not that big. It is '
      + 'the scale at which trying to pin an electron down costs enough energy to make a second '
      + 'electron out of nothing — which is where this subject hands over to particle physics.'),
    worked('X-rays bouncing off at a right angle', [
      { q: 'Going in', why: '0.0709 nm, the molybdenum Kα line Compton used',
        maths: fmt(Q.photonFromNM(0.0709).eV / 1000, 4) + ' keV' },
      { q: 'The shift at 90°', why: '(h/mₑc)(1 − cos 90°) = h/mₑc, the whole Compton wavelength',
        maths: fmt(Q.compton(0.0709, 90).shiftNM * 1000, 4) + ' pm' },
      { q: 'Coming out', why: '0.0709 nm + the shift',
        maths: fmt(Q.compton(0.0709, 90).lambdaOutNM, 5) + ' nm' },
      { q: 'What the electron got', why: 'The difference in photon energy, which is now kinetic energy in the graphite',
        maths: fmt(Q.compton(0.0709, 90).electronEV, 4) + ' eV' },
      { q: 'Straight back at 180°', why: 'Twice the shift, because (1 − cos 180°) = 2',
        maths: fmt(Q.compton(0.0709, 180).shiftNM * 1000, 4) + ' pm' },
    ]),
    p('And notice what the formula does not contain: the wavelength you started with. A 0.07 nm '
      + 'X-ray and a 0.01 nm gamma ray shift by exactly the same '
      + fmt(Q.COMPTON * 1e12, 4) + ' pm at 90°. That is a very strange thing for a wave to do '
      + 'and a very ordinary thing for a collision.')
  ));

  page('spectra', 'Why atoms glow in stripes', 'Line spectra, Bohr, and a rule with no reason', () => frag(
    p('Put hydrogen in a tube and run a current through it and it glows pink. Split that light with '
      + 'a prism and the pink turns out to be four sharp lines — red, blue-green, violet, deep '
      + 'violet — with nothing in between. Every hydrogen tube in every lab gives the same four. '
      + 'So does every star.'),
    p('Classically this is impossible twice over. An electron orbiting a nucleus is an accelerating '
      + 'charge, and accelerating charges radiate; it should spiral into the nucleus in about ten '
      + 'picoseconds, shining at a smoothly rising frequency as it goes. Instead atoms are stable '
      + 'for billions of years and emit a handful of exact frequencies.'),
    h3('Balmer’s formula, which nobody could explain'),
    p('In 1885 a Swiss schoolteacher noticed the four visible lines fit one expression with no '
      + 'physics in it at all — just small whole numbers:'),
    qeq('1/λ = R (1/n₁² − 1/n₂²)'),
    p('It worked to five figures. It predicted lines nobody had looked for, in the ultraviolet and '
      + 'the infrared, and they were there. And it meant nothing: why would the colour of light '
      + 'depend on the difference of two reciprocal squares?'),
    h3('Bohr’s answer, and the price of it'),
    p('Bohr’s 1913 model says the electron can only occupy certain orbits, it does not radiate '
      + 'while it is in one, and light comes out when it drops from one to another. Pick the orbits '
      + 'by insisting that the angular momentum is a whole multiple of ℏ and the energies come '
      + 'out as −' + fmt(Q.ionisationEV(1), 5) + '/n² eV, which reproduces Balmer exactly.'),
    table(['Orbit', 'Radius', 'Electron speed', 'Energy'], [1, 2, 3, 4].map((n) => {
      const bo = Q.bohr(n);
      return ['n = ' + n, fmt(bo.radiusNM, 4) + ' nm',
        fmt(bo.fractionOfLight * 100, 3) + '% of light speed', fmt(bo.energyEV, 4) + ' eV'];
    }), 'The n = 1 radius is the Bohr radius, and it is still the unit atoms are measured in.'),
    callout(b('But why whole multiples of ℏ? '), 'Bohr had no answer, and said so. The model '
      + 'also fails completely on helium, says nothing about why some lines are brighter than '
      + 'others, and has the electron on a definite path, which later turns out to be the one thing '
      + 'it certainly does not have. It is right about the energies and wrong about everything '
      + 'underneath them — which is a specific and useful kind of wrong.'),
    h3('The hint that cracked it'),
    p('Ten years later de Broglie pointed out what Bohr’s rule is really saying. Angular '
      + 'momentum mvr = nℏ rearranges to 2πr = n(h/mv), and h/mv is a wavelength. So the '
      + 'rule reads: ', b('a whole number of wavelengths fits around the orbit.')),
    table(['Orbit', 'Circumference', 'One de Broglie wavelength', 'How many fit'], [1, 2, 3].map((n) => {
      const bo = Q.bohr(n);
      return ['n = ' + n, fmt(bo.circumferenceNM, 4) + ' nm', fmt(bo.deBroglieNM, 4) + ' nm',
        fmt(bo.circumferenceNM / bo.deBroglieNM, 3)];
    }), 'Exactly n, every time. Not approximately — exactly, by construction.'),
    p('Which is the guitar string again, bent into a circle. Bohr’s mysterious whole numbers '
      + 'were counting waves all along, and the next page is about what put the wave there.')
  ));

  page('debroglie', 'Everything has a wavelength', 'Matter waves, and why you have never noticed yours', () => frag(
    p('In 1924, in a doctoral thesis his examiners were not sure what to do with, de Broglie '
      + 'proposed a symmetry. Light had been a wave and turned out to carry momentum like a '
      + 'particle. So perhaps matter, which everyone agreed was particles, carries a wavelength:'),
    qeq('λ = h / p = h / mv'),
    p('No new constant, no new mechanism — just the photon relation read backwards. It is the '
      + 'kind of idea that is either empty or enormous, and three years later Davisson and Germer '
      + 'bounced electrons off a nickel crystal and got a diffraction pattern. Electrons diffract. '
      + 'The thesis was right.'),
    h3('Why nobody noticed for three hundred years'),
    p('Because h is tiny and everyday masses are not:'),
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
      'Twenty-five orders of magnitude below the size of a proton. There is no experiment, even in '
      + 'principle, that could reveal it. That is why classical mechanics works and why it took '
      + 'until the twentieth century to notice anything was wrong — the quantum effects were '
      + 'never hiding, they were just scaled by a number with thirty-three zeros after the point.'),
    h3('And why it matters that it is small but not zero'),
    p('The electron microscope row is the practical payoff. An optical microscope cannot resolve '
      + 'anything smaller than about half a wavelength of light, which puts a floor at roughly '
      + Math.round(Q.resolution(550).limitNM) + ' nm — you can see a bacterium and you will '
      + 'never see a virus. Accelerate an electron through 100 kV and its wavelength is '
      + fmt(Q.deBroglieFromVolts(100000).lambdaNM * 1000, 3) + ' picometres, which is smaller than '
      + 'an atom. Same optics, same diffraction limit, a hundred thousand times finer. Every image '
      + 'you have seen of individual atoms exists because electrons have a wavelength.')
  ));

  page('doubleslit', 'The two-slit experiment', 'The one that nobody has explained away', () => frag(
    p('Feynman called this the only mystery — the one phenomenon that contains everything '
      + 'strange about quantum mechanics, and which no amount of cleverness has ever reduced to '
      + 'something familiar. It is worth meeting carefully.'),
    p('Two narrow slits, a source, a screen. With water waves you get an interference pattern: '
      + 'bands where the two paths arrive in step and add, and gaps where they arrive out of step '
      + 'and cancel. Nothing odd about that — it is what waves do, and the gaps are the clue, '
      + 'because a gap is a place where ', em('more'), ' input gives ', em('less'), ' output.'),
    p('Now fire electrons, one at a time, slowly enough that only one is in the apparatus at any '
      + 'moment. Each arrives as a single dot — so each is a whole particle, landing in one '
      + 'place. Wait, and watch the dots pile up:'),
    F.doubleSlitFigure(),
    callout(b('The bands appear anyway. '), 'There was never a second electron for the first one to '
      + 'interfere with. Whatever goes through the slits goes through both, interferes with itself, '
      + 'and then lands in one spot. Close one slit and the bands vanish — so each electron '
      + '"knows" whether the other slit is open, even though it arrives as one indivisible thing.'),
    h3('The part that makes people argue'),
    p('Put a detector at the slits to see which one each electron uses, and you get a perfectly '
      + 'reliable answer every time: this one, that one, this one. And the bands disappear. You get '
      + 'the plain sum of two single-slit patterns, exactly as if the electrons were ordinary little '
      + 'balls.'),
    p('The usual explanation is that the measurement disturbs them, and that is not quite right. '
      + 'The experiment has been done with detectors so gentle that the momentum they impart is far '
      + 'too small to wash out the fringes — and the fringes still go. What matters is not the '
      + 'jostling. It is that ', b('the two paths have stopped being indistinguishable.'), ' '
      + 'Interference is what happens when there is genuinely no fact about which way it went. '
      + 'Create that fact anywhere in the universe, even in a record nobody reads, and the '
      + 'interference is gone.'),
    h3('And it is not just electrons'),
    p('The same pattern has been produced with neutrons, with whole atoms, with buckyballs of sixty '
      + 'carbons, and with molecules of several thousand atoms. There is no known mass at which it '
      + 'stops. It gets harder as things get heavier, because the wavelength shrinks and because '
      + 'keeping the paths indistinguishable gets harder — which is the subject of the page on '
      + 'decoherence, and is the best answer anyone has to why you do not diffract through doorways.')
  ));
})();
