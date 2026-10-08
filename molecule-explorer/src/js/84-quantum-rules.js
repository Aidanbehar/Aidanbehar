/* The rules of the game, and angular momentum.
 *
 * The Schrödinger pages show the equation working. These say what the whole
 * framework actually claims — what a state is, what a measurement does, where
 * uncertainty comes from — and then apply it to the one quantity that is most
 * stubbornly quantised and most responsible for the shape of the periodic
 * table.
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
  const rule = (id, name, blurb, build) => ME.quantumPage('The rules', id, name, blurb, build);
  const spin = (id, name, blurb, build) => ME.quantumPage('Spin and angular momentum', id, name, blurb, build);

  /* ============================================================ the rules */

  rule('postulates', 'What the theory actually claims', 'States, operators, and four rules', () => frag(
    p('Everything so far has been one equation applied to one situation at a time. Underneath it '
      + 'there is a short list of claims that the whole subject rests on. They are worth seeing '
      + 'written out, because almost every "quantum is weird" story turns out to be one of these '
      + 'four being applied honestly.'),
    h3('One: a state is a wavefunction'),
    p('Everything knowable about a system is in ψ. Not most things, not the things we can '
      + 'currently get at — everything. If two systems have the same ψ they are '
      + 'identical, and no measurement can tell them apart. This is a much stronger claim than it '
      + 'looks, and it is where the argument about whether quantum mechanics is "complete" lives.'),
    h3('Two: every measurable thing has an operator'),
    p('Position, momentum, energy, angular momentum — each is represented by an operation you '
      + 'do to the wavefunction rather than by a number the system carries around:'),
    table(['Quantity', 'Operator', 'What it does to ψ'], [
      ['Position', 'x̂', 'Multiply by x'],
      ['Momentum', 'p̂ = −iℏ d/dx', 'Differentiate once'],
      ['Kinetic energy', 'p̂²/2m', 'Differentiate twice — curvature, as on the equation page'],
      ['Total energy', 'Ĥ', 'Kinetic plus potential: the Hamiltonian'],
    ], 'Momentum being a derivative is why a short wavelength means a big momentum: differentiating a tight wiggle gives a big answer.'),
    h3('Three: the answers you can get are the eigenvalues'),
    p('Apply the operator. If the wavefunction comes back unchanged except for a multiplying '
      + 'number, that number is what you measure and it is certain:'),
    qeq('Ĥψ = Eψ'),
    p('Which is the time-independent Schrödinger equation — so the TISE is not a special '
      + 'case of anything, it is rule three for energy. And if ψ is ', em('not'), ' one of '
      + 'those special shapes, you get one of them at random, with probabilities set by how much '
      + 'of each is in the mixture. That is the whole of quantum randomness in one sentence.'),
    h3('Four: between measurements it evolves smoothly'),
    p('The TDSE runs, deterministically, with no randomness anywhere in it. Give me ψ now and '
      + 'I will give you ψ at any future time exactly.'),
    callout(b('Which leaves a seam, and everybody can see it. '), 'Rule four says smooth and '
      + 'deterministic. Rule three says abrupt and random. The theory does not say where the '
      + 'boundary is or what counts as a measurement, and a hundred years of argument has not '
      + 'settled it. Every interpretation of quantum mechanics is an attempt to deal with that '
      + 'seam, and none of them changes a single prediction. The page at the end of this tab is '
      + 'about that, and the honest summary is that you can do all of chemistry without picking a '
      + 'side.')
  ));

  rule('measurement', 'Measurement and averages', 'What you actually get, and what you get on average', () => frag(
    p('A wavefunction that is not an eigenstate does not have a value of the thing you are about '
      + 'to measure. It is not that the value is hidden; there is no value. What there is, is a '
      + 'set of possible answers with probabilities.'),
    p('So a single measurement gives one of them, and the useful quantity is the average over many '
      + 'identical measurements — the ', term('expectation value',
      'The average result of measuring a quantity on many identically prepared systems. Not '
      + 'necessarily a possible result of any single measurement.'), ', written ⟨x⟩:'),
    qeq('⟨x⟩ = ∫ ψ* x̂ ψ dx'),
    p('Note what that is not. The expectation value need not be one of the possible answers at all '
      + '— the average of a die is 3.5, which is not a face. The average position of an '
      + 'electron in a p orbital is the nucleus, which is the one place it is never found.'),
    h3('The box, measured exactly'),
    p('The particle in a box is the one system where all of this can be computed in closed form '
      + 'rather than described, so it is worth doing. For the n-th state:'),
    qeq('⟨x⟩ = L/2        ⟨x²⟩ = L²(1/3 − 1/2n²π²)        ⟨p⟩ = 0        ⟨p²⟩ = (nπℏ/L)²'),
    p('⟨x⟩ = L/2 by symmetry, and ⟨p⟩ = 0 because a standing wave is going both '
      + 'ways at once — which is worth pausing on, because the particle certainly has momentum '
      + '(⟨p²⟩ is not zero) and its average is still exactly nothing.'),
    p('The spread is what is left after you subtract the square of the average:'),
    table(['State', 'Spread in position', 'Spread in momentum', 'σₓσₚ, in units of ℏ/2'],
      [1, 2, 3, 5, 10].map((n) => {
        const s = Q.boxStats(n, 1);
        return ['n = ' + n, fmt(s.sigmaXNM, 4) + ' nm', ME.fmt.sciUnicode(s.sigmaP, 3) + ' kg m/s',
          fmt(s.timesTheLimit, 4)];
      }), 'A 1 nm box. The last column is never below 1, and it is closest in the ground state.'),
    callout(b('That last column is the uncertainty principle, computed rather than quoted. '),
      'Nobody put it in. It falls out of integrating sin² and sin′² over a box, and '
      + 'the closest any state gets to the limit is the ground state at '
      + fmt(Q.boxStats(1, 1).timesTheLimit, 4) + ' — above one, as it must be, and not by much. '
      + 'Climb to n = 10 and the product is nine times the limit: excited states are sloppier, not '
      + 'sharper.')
  ));

  rule('uncertainty', 'Uncertainty, properly', 'Not about clumsy apparatus', () => frag(
    p('The usual story is that measuring a position means bouncing something off the particle, and '
      + 'that knocks it, so you lose track of the momentum. Heisenberg told that story himself in '
      + '1927, and it is wrong — or rather, it describes a real effect that is not this one.'),
    callout(b('The uncertainty is there before anybody measures anything. '), 'It is a property of '
      + 'the state, not of the apparatus. A wave that is sharply localised in space is '
      + 'unavoidably built from a wide spread of wavelengths, and wavelength is momentum. You can '
      + 'see the whole thing in a sound wave: a very short click has no definite pitch, and a pure '
      + 'tone has to last a long time. Nobody thinks the clock is disturbing the note.'),
    qeq('σₓ σₚ ≥ ℏ/2'),
    h3('Where it comes from'),
    p('Two quantities have a joint uncertainty when their operators do not commute — when '
      + 'doing them in the other order gives a different answer:'),
    qeq('[x̂, p̂] = x̂p̂ − p̂x̂ = iℏ'),
    p('That is not an analogy; it is the source. Work out the commutator of any two operators and '
      + 'you get the uncertainty relation between them for free. Position and momentum do not '
      + 'commute, so they have one. Two components of angular momentum do not commute, so you can '
      + 'know how much total angular momentum there is and which way one component points, but '
      + 'never the whole direction — which is exactly the cone picture a few pages on.'),
    p('And operators that ', em('do'), ' commute have no such limit at all. Energy and momentum in '
      + 'free space commute, so a free particle can have both exactly. Nothing is mysterious about '
      + 'that pair, and nothing is mysterious about the other pair either; it is the same algebra '
      + 'giving different answers.'),
    h3('Energy and time, which is a different animal'),
    p('ΔEΔt ≥ ℏ/2 looks like the same statement and is not, because time is not '
      + 'an observable in quantum mechanics — there is no time operator. What it means is: a '
      + 'state that does not last long does not have a sharp energy.'),
    table(['Excited state lifetime', 'Energy is fuzzy by', 'Which is'], [
      ['10 ns — a typical atomic transition', ME.fmt.sciUnicode(Q.lifetimeLinewidth(1e-8).energyEV, 3) + ' eV',
        'about ' + Math.round(Q.lifetimeLinewidth(1e-8).frequencyHz / 1e6) + ' MHz, the natural linewidth'],
      ['1 ps — a vibration relaxing', ME.fmt.sciUnicode(Q.lifetimeLinewidth(1e-12).energyEV, 3) + ' eV',
        'enough to broaden an infrared band visibly'],
      ['1 fs — a molecule falling apart', ME.fmt.sciUnicode(Q.lifetimeLinewidth(1e-15).energyEV, 3) + ' eV',
        'so broad the "line" is a smear hundreds of nm wide'],
    ], 'Which is why a spectroscopist can read a lifetime off the width of a line without ever timing anything.'),
    p('This is a measurement, not a philosophical point. Lines from long-lived states are razor '
      + 'sharp; lines from states that fall apart immediately are broad. You can watch a molecule '
      + 'dissociate by looking at how smeared its spectrum is.')
  ));

  rule('superposition', 'Superposition', 'Adding states, and the interference that follows', () => frag(
    p('If ψ₁ and ψ₂ are both solutions, so is any combination of them. That '
      + 'follows from the equation being linear, which is a dull mathematical property with '
      + 'extraordinary consequences.'),
    qeq('ψ = aψ₁ + bψ₂,    with |a|² + |b|² = 1'),
    p('Measure the energy and you get E₁ with probability |a|² or E₂ with probability '
      + '|b|². Never anything in between, and never both.'),
    h3('What it is not'),
    p('It is not "we do not know which one it is". That distinction is the whole game, and the '
      + 'two-slit experiment is what settles it. If each electron secretly went through one slit '
      + 'and we merely did not know which, the pattern would be the sum of the two single-slit '
      + 'patterns. It is not. There are places that electrons reach when one slit is open and '
      + 'stop reaching when you open the second — opening a door makes somewhere harder to '
      + 'get to. Ignorance cannot do that. Only cancellation can.'),
    callout(b('The cross terms are where everything happens. '), 'Square a + b and you get '
      + 'a² + b² + 2ab. The first two are "what you would get from each separately" and '
      + 'the third is interference. It is the 2ab that makes bonds, makes diffraction patterns, '
      + 'makes lasers coherent and makes a quantum computer worth building. Take away the cross '
      + 'terms and you are left with ordinary probability — which, as it happens, is exactly '
      + 'what decoherence does.'),
    h3('Superposition of what, though'),
    p('Of anything with more than one option. Two energy levels, two slits, two spin directions, '
      + 'two positions. The one thing it is never a superposition of is a single definite outcome '
      + 'with itself — and the states you build everything out of, the eigenstates, are '
      + 'precisely the ones that are not superpositions of anything, with respect to the quantity '
      + 'you are asking about.'),
    p('Which comes with a twist worth knowing: a state that is definite in energy is usually a '
      + 'superposition in position, and the other way round. There is no state that is definite in '
      + 'everything, and the reason is the commutator on the last page.')
  ));

  rule('correspondence', 'Why you never see any of this', 'Correspondence, and decoherence', () => frag(
    p('A reasonable complaint at this point: if everything is waves and superpositions, why is a '
      + 'cricket ball not in two places? Two answers, and they are different answers.'),
    h3('The first: things get classical when they get big'),
    p('Bohr’s correspondence principle says quantum predictions have to match classical ones '
      + 'in the limit of large quantum numbers, and they do, visibly. Take the particle in a box:'),
    table(['State', 'Probability of being in the middle third', 'A classical particle would say'],
      [1, 2, 5, 20, 100].map((n) => ['n = ' + n,
        fmt(Q.boxProbability(n, 1, 1 / 3, 2 / 3), 4), '0.3333']),
      'By n = 100 the quantum answer is the classical one to three figures, and the bumps are too fine to see.'),
    p('Same story for the energy levels: the gaps are a large fraction of the energy when n is '
      + 'small and a vanishing fraction when n is large, so a macroscopic object’s levels are '
      + 'so finely spaced that its energy looks continuous. A pendulum has quantum levels. They are '
      + 'about 10⁻³³ J apart.'),
    h3('The second, and the real one: decoherence'),
    p('Size is not actually the point — superpositions of fairly large things have been made '
      + 'in the lab. What kills them is contact with everything else.'),
    callout(b('Interference needs the alternatives to be indistinguishable. '), 'A big object is '
      + 'constantly bumped by air molecules and photons, and each of those carries away a trace of '
      + 'where it was. The record does not need to be read by anyone — it just has to exist '
      + 'somewhere in the universe. Once it does, the paths are distinguishable, the cross terms '
      + 'average to nothing, and what is left behaves exactly like ordinary probability.'),
    p('The timescales are absurd. A dust grain in a vacuum chamber, lit only by starlight, '
      + 'decoheres in something like a trillionth of a second. A large molecule in a good vacuum, '
      + 'in the dark, can be kept coherent for long enough to diffract — which is why those '
      + 'experiments are done at high vacuum and low temperature and are so hard.'),
    p('So the answer to "why is the world classical" is not that quantum mechanics stops applying. '
      + 'It is that the world is extremely good at keeping records, and records destroy '
      + 'interference. ', b('A quantum computer is a machine built entirely around postponing '
      + 'this'), ' — cold, isolated, shielded — and losing that fight is what a decoherence '
      + 'error is.')
  ));

  /* ================================================ angular momentum, spin */

  spin('angular', 'Angular momentum comes in steps', 'And why it can never point straight at you', () => frag(
    p('Angular momentum is quantised too, and the way it is quantised is odder than energy. Two '
      + 'numbers come out of the equation: how much there is, and how much of it points along '
      + 'whichever axis you choose to call z.'),
    qeq('|L| = √(ℓ(ℓ+1)) ℏ        L_z = mℏ,    m = −ℓ … +ℓ'),
    p('The √(ℓ(ℓ+1)) is not a typo for ℓ, and the difference is the whole point. '
      + 'For ℓ = 1 the vector is √2 = ' + fmt(Math.SQRT2, 4) + ' units long, but the most '
      + 'it can ever show along z is 1. There is always something left over sideways.'),
    F.angularFigure(),
    callout(b('So the vector can never lie along the axis. '), 'If it could, you would know all '
      + 'three components at once — z would be everything and x and y would both be zero. '
      + 'The operators for the three components do not commute, so that is forbidden, and the '
      + 'tilt is what the prohibition looks like when you draw it. The vector is somewhere on a '
      + 'cone, and which part of the cone is not a question with an answer.'),
    h3('Where the orbital letters come from'),
    table(['ℓ', 'Letter', 'Orientations (2ℓ+1)', 'Length of L', 'Closest it gets to the axis'],
      [0, 1, 2, 3].map((l) => {
        const a = Q.angularMomentum(l);
        return [String(l), a.label, String(a.count), fmt(a.magnitude, 4) + ' ℏ',
          a.minAngleDeg === null ? 'no direction at all' : fmt(a.minAngleDeg, 3) + '°'];
      }), 'The letters are historical — sharp, principal, diffuse, fundamental — from spectral lines, and they stuck.'),
    p('The 2ℓ+1 column is doing quiet work: it is why there is one s orbital, three p, five d '
      + 'and seven f, which is why the blocks of the periodic table are 2, 6, 10 and 14 wide. The '
      + 'shape of the table is this column times two for spin.'),
    p('And ℓ = 0 deserves a note. No angular momentum means no axis, which means nothing to '
      + 'be oriented about — so an s orbital is spherical, not because somebody chose a '
      + 'spherical shape but because there is no direction available to make it anything else.')
  ));

  spin('spin', 'Spin', 'An angular momentum with nothing going round', () => frag(
    p('In 1922 Stern and Gerlach sent silver atoms through an uneven magnetic field, expecting the '
      + 'beam to smear. A magnetic atom tumbling out of an oven points every which way, so the '
      + 'field should pull each one by a different amount and spread them into a band.'),
    F.sternGerlachFigure(),
    p('Two spots. Nothing in between, nothing outside. Whatever the atoms were doing on the way in, '
      + 'the field only ever found two answers — and it finds two answers no matter which way '
      + 'you turn the magnet.'),
    h3('Half a unit, which should not be possible'),
    p('Orbital angular momentum has 2ℓ+1 orientations, always an odd number: 1, 3, 5. Two '
      + 'orientations needs ℓ = ½, and the orbital quantum number is strictly a whole '
      + 'number — going round a circle and meeting yourself demands it. So this is not orbital '
      + 'angular momentum. It is something else that behaves like angular momentum, and it is '
      + 'called ', b('spin'), '.'),
    qeq('|S| = √(s(s+1)) ℏ = (√3/2)ℏ        S_z = ±½ℏ'),
    callout(b('Nothing is spinning. '), 'Take the electron’s angular momentum and its known '
      + 'upper size limit and work out how fast the surface would have to move: the answer comes '
      + 'out faster than light, by a lot. Spin is not rotation of a little ball. It is an intrinsic '
      + 'property, like charge — the electron simply has ½ℏ of angular momentum the '
      + 'way it simply has one unit of negative charge, and asking what is going round is asking '
      + 'the wrong question.'),
    h3('The sequential experiment, which is the strange one'),
    p('Send a beam through a vertical magnet and keep only the "up" half. Every one of those is '
      + 'now definitely up — send them through a second vertical magnet and all of them go up '
      + 'again. Fine.'),
    p('Now put a horizontal magnet in the middle. The up beam splits half-and-half into left and '
      + 'right, which is reasonable enough. But take the "left" half and send it through a vertical '
      + 'magnet again, and it splits in two. ', b('The upness is gone'), ' — destroyed by '
      + 'having measured something else. Vertical and horizontal spin do not commute, so having one '
      + 'sharply means not having the other at all, and measuring the second one wipes the first.'),
    p('This is the cleanest demonstration of rule three in the whole subject, and you can do it in '
      + 'an afternoon with a beam of atoms and three magnets.')
  ));

  spin('pauli', 'The exclusion principle', 'Why matter takes up room', () => frag(
    p('Two electrons cannot be in the same state. That is Pauli’s principle, usually met as a '
      + 'bookkeeping rule for filling orbitals, and it is in fact the reason you do not fall '
      + 'through your chair.'),
    h3('Where it comes from'),
    p('Identical particles are genuinely identical — there is no paint mark on one electron. '
      + 'So swapping two of them cannot change anything measurable, which means |ψ|² must '
      + 'be unchanged, which means ψ itself either stays the same or flips sign. Both options '
      + 'are mathematically open, and nature uses both:'),
    table(['', 'Fermions', 'Bosons'], [
      ['Swapping two', 'ψ changes sign', 'ψ unchanged'],
      ['Spin', 'Half-integer: ½, 3/2', 'Whole number: 0, 1, 2'],
      ['Sharing a state', 'Forbidden', 'Encouraged'],
      ['Examples', 'Electrons, protons, neutrons, He-3', 'Photons, He-4, the Higgs'],
      ['What they build', 'Matter that occupies space', 'Forces, lasers, superfluids'],
    ]),
    p('The forbidding follows in one line. If ψ flips sign when you swap two particles, then '
      + 'putting both in the same state means swapping changes nothing — so ψ = −ψ, '
      + 'so ψ = 0. There is no such state. Not "it is unlikely"; it does not exist.'),
    callout(b('And this is why solid things are solid. '), 'Press two atoms together and their '
      + 'electron clouds must stay out of each other’s occupied states, which forces some '
      + 'electrons into higher ones, which costs energy. That cost is felt as a push back. It is '
      + 'not electrostatic repulsion — the usual story — it is Pauli pressure, and it is '
      + 'what holds up a white dwarf star against its own gravity.'),
    h3('What it buys chemistry'),
    p('An orbital holds two electrons, not one and not three, because spin has exactly two states. '
      + 'Multiply the 2ℓ+1 orientations from the last page by that two and you get the '
      + 'capacities:'),
    table(['Shell', 'Subshells', 'Capacity'], [1, 2, 3, 4].map((n) => {
      const s = Q.shellCapacity(n);
      return ['n = ' + n, s.subshells.map((x) => x.label + ' (' + x.electrons + ')').join(', '),
        s.total + ' = 2×' + n + '²'];
    }), '2n² is not a rule to learn. It is (2ℓ+1) summed over ℓ, doubled by spin.'),
    p('Without the exclusion principle every electron in every atom would drop to 1s, every element '
      + 'would behave about the same, and there would be no chemistry at all — no bonds, no '
      + 'periodic table, nothing. One sign flip in an equation is the difference between a universe '
      + 'with structure and a universe of identical inert blobs.')
  ));

  spin('magnetic', 'Spin in a magnetic field', 'Zeeman, fine structure, MRI', () => frag(
    p('An electron with angular momentum is a tiny magnet, and a magnet in a field has different '
      + 'energies depending on which way it points. Since the pointing is quantised, so are the '
      + 'energies — and a single spectral line splits into several.'),
    qeq('ΔE = g μᴮ B m'),
    p('μᴮ is the Bohr magneton, eℏ/2mₑ = '
      + ME.fmt.sciUnicode(Q.BOHR_MAGNETON, 4) + ' J/T, or '
      + ME.fmt.sciUnicode(Q.zeeman(1, 1).magnetonEVperT, 4) + ' eV per tesla — derived in the '
      + 'app from e, ℏ and the electron mass rather than looked up.'),
    h3('How small is it'),
    table(['Field', 'Splitting', 'Compared with room-temperature thermal energy'], [
      ['1 T — a strong lab magnet', ME.fmt.sciUnicode(Q.zeeman(1, 1).energyEV, 3) + ' eV',
        fmt(Q.zeeman(1, 1).versusRoomTemperature * 100, 3) + '% of kT'],
      ['3 T — a hospital MRI', ME.fmt.sciUnicode(Q.zeeman(3, 1).energyEV, 3) + ' eV',
        fmt(Q.zeeman(3, 1).versusRoomTemperature * 100, 3) + '% of kT'],
      ['20 T — a research magnet', ME.fmt.sciUnicode(Q.zeeman(20, 1).energyEV, 3) + ' eV',
        fmt(Q.zeeman(20, 1).versusRoomTemperature * 100, 3) + '% of kT'],
    ], 'Tiny compared with the thermal jostling, which is why magnetic resonance needs big magnets and patience.'),
    p('That last column explains a lot about how these experiments are done. The splitting is a '
      + 'thousandth of the thermal energy, so the two spin states are populated almost exactly '
      + 'equally — the excess in the lower one is a few parts per million. An MRI scanner is '
      + 'imaging that few parts per million, out of the water in your body, and it works because '
      + 'there are an awful lot of water molecules.'),
    h3('Fine structure: the electron feels its own orbit'),
    p('Even with no external magnet, lines are split. From the electron’s point of view the '
      + 'nucleus is orbiting ', em('it'), ', and a circulating charge is a magnetic field — so '
      + 'the electron’s spin feels a field created by its own motion. The size of the effect '
      + 'is set by the fine-structure constant:'),
    qeq('α = e²/4πε₀ℏc = 1/' + fmt(1 / Q.FINE_STRUCTURE, 7)),
    p('A pure number with no units, about 1/137, and nobody knows why it has the value it has. It '
      + 'measures how strongly charges and light talk to each other, and because the splitting goes '
      + 'as α² it is about a twenty-thousandth of the energy — '
      + fmt(Q.fineStructure(2, 1).splittingEV * 1000, 3) + ' meV for hydrogen’s n = 2. Small, '
      + 'and measurable since the 1890s, which is how people knew something was missing from Bohr '
      + 'long before anyone could say what.')
  ));
})();
