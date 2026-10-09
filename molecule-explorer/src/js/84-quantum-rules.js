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
  const rule = (id, name, blurb, short, build) =>
    ME.quantumPage('The rules', id, name, blurb, short, build);
  const spin = (id, name, blurb, short, build) =>
    ME.quantumPage('Spin and angular momentum', id, name, blurb, short, build);

  /* ============================================================ the rules */

  rule('postulates', 'What the theory actually claims', 'States, operators, and four rules',
    'The whole subject rests on four claims. The wave is everything there is to know. Measuring '
    + 'something means doing a particular job on the wave. Only certain answers can come out, and '
    + 'which one you get is random. And in between measurements, nothing is random at all.',
    () => frag(
    p('Everything so far has been one equation applied to one situation at a time. Underneath it '
      + 'there is a short list of claims that the whole subject rests on. They are worth seeing '
      + 'written out, because almost every "quantum is weird" story turns out to be one of these '
      + 'four being applied honestly.'),
    h3('One: a state is a wavefunction'),
    p('Everything knowable about a system is in ψ. Not most things, not the things we can '
      + 'currently get at — everything. If two systems have the same ψ they are '
      + 'identical, and no measurement can tell them apart. This is a much stronger claim than it '
      + 'looks, and it is where the argument about whether quantum mechanics is "complete" lives.'),
    h3('Two: every measurable thing is a job you do to the wave'),
    p('This is the one piece of vocabulary worth slowing down for, because it sounds far more '
      + 'abstract than it is. In ordinary physics a quantity like momentum is a ', em('number'),
      ' the object carries around with it. Here it is not. Here each measurable quantity is a '
      + 'piece of ', b('work you do to the wave'), ' — multiply it by something, differentiate '
      + 'it, that sort of thing. The name for such a job is an ',
      term('operator', 'A recipe for acting on a wavefunction — multiply it, differentiate it, '
      + 'and so on. Each measurable quantity has one, and the little hat marks it as a job '
      + 'rather than a number.'), ', and the little hat on the symbol is there to remind you '
      + 'that it is a job and not a number:'),
    table(['Quantity', 'Operator', 'What it does to ψ'], [
      ['Position', 'x̂', 'Multiply by x'],
      ['Momentum', 'p̂ = −iℏ d/dx', 'Differentiate once'],
      ['Kinetic energy', 'p̂²/2m', 'Differentiate twice — curvature, as on the equation page'],
      ['Total energy', 'Ĥ', 'Kinetic plus potential: the Hamiltonian'],
    ], 'Momentum being a derivative is why a short wavelength means a big momentum: differentiating a tight wiggle gives a big answer.'),
    h3('Three: you only ever get the answers the wave survives'),
    p('Do the job to the wave and watch what comes back. Usually you get a different shape out '
      + 'than you put in. But for a few special shapes, the wave comes back as ', em('itself'),
      ', merely scaled up or down by some number. Those shapes are the ones that have a definite '
      + 'value of that quantity, and the number they get scaled by is the value you measure:'),
    qeq('Ĥψ = Eψ'),
    p('Read that as a question and an answer. "Work out the energy of this wave" gives back the '
      + 'same wave, E times bigger. So the wave has energy E, definitely, every time you look. '
      + 'The special shapes are called ', term('eigenstates',
      'A state that an operator returns unchanged apart from a scale factor. Such a state has a '
      + 'definite, repeatable value of that quantity.'), ' and the scale factors are called ',
      term('eigenvalues', 'The scale factor an eigenstate comes back multiplied by — the value '
      + 'you actually measure.'), ' — German for "own", as in the operator\u2019s own shapes.'),
    p('And notice that this equation is the time-independent Schrödinger equation, which you have '
      + 'already solved by hand. The TISE is not a special trick. It is rule three, asked about '
      + 'energy.'),
    p('What if your wave is ', em('not'), ' one of the special shapes? Then it is a mixture of '
      + 'several of them, and you get one of those at random, with the odds set by how much of '
      + 'each went into the mixture. That sentence is the entirety of quantum randomness. There '
      + 'is no more to it than that.'),
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

  rule('measurement', 'Measurement and averages', 'What you actually get, and what you get on average',
    'If a particle is in a mixture, it has no value of the thing you are about to measure — not '
    + 'a hidden one, none. You get one of the possible answers at random. The average of many '
    + 'such measurements is a useful number, and it need not be a possible answer itself.',
    () => frag(
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
    p('⟨x⟩ = L/2 by symmetry: the box looks the same from both ends. And ⟨p⟩ = 0 '
      + 'because a standing wave is going both ways at once, so the two directions cancel in the '
      + 'average. That second one is worth a pause. The particle definitely has momentum — '
      + '⟨p²⟩ is nowhere near zero — and the average of it is still exactly nothing.'),
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

  rule('uncertainty', 'Uncertainty, properly', 'Not about clumsy apparatus',
    'A wave squeezed into a narrow space has to be built out of many different wavelengths, and '
    + 'wavelength is momentum. So a particle with a sharp position has a vague momentum. This is '
    + 'not about clumsy instruments — it is true before anybody measures anything at all.',
    () => frag(
    p('The usual story is that measuring a position means bouncing something off the particle, and '
      + 'that knocks it, so you lose track of the momentum. Heisenberg told that story himself in '
      + '1927, and it is wrong — or rather, it describes a real effect that is not this one.'),
    callout(b('The uncertainty is there before anybody measures anything. '), 'It is a property of '
      + 'the state, not of the apparatus. A wave that is sharply localised in space is '
      + 'unavoidably built from a wide spread of wavelengths, and wavelength is momentum. You can '
      + 'see the whole thing in a sound wave: a very short click has no definite pitch, and a pure '
      + 'tone has to last a long time. Nobody thinks the clock is disturbing the note.'),
    qeq('σₓ σₚ ≥ ℏ/2'),
    h3('Where it comes from: order matters'),
    p('Some pairs of actions give a different result depending on which you do first. Socks then '
      + 'shoes is not the same as shoes then socks. Other pairs genuinely do not care — putting '
      + 'on your hat and putting on your left shoe can go in either order. Quantities whose '
      + 'order does not matter are said to ', term('commute',
      'Two operations commute when doing them in either order gives the same result. When they '
      + 'do not, the two quantities cannot both be sharp at once.'), '.'),
    p('Measuring position and measuring momentum are socks and shoes. Do them to a wave in the '
      + 'two different orders and you do not get the same thing, and the exact size of the '
      + 'difference is this:'),
    qeq('[x̂, p̂] = x̂p̂ − p̂x̂ = iℏ'),
    p('That is not an illustration of the uncertainty principle. It ', em('is'), ' the '
      + 'uncertainty principle. A short theorem turns the size of the ordering mismatch straight '
      + 'into the smallest possible product of the two spreads. The ℏ going in on this line '
      + 'is exactly what puts the ℏ/2 on the line above.'),
    p('So the rule is simple to apply. Any two quantities whose order matters cannot both be '
      + 'sharp. Position and momentum: order matters, so you cannot have both. Two different '
      + 'directions of angular momentum: order matters, so you can know how much total there is '
      + 'and how much points up, but never the full direction — that is the cone a few pages on.'),
    p('And pairs that ', em('do'), ' commute carry no limit whatsoever. Energy and momentum for a '
      + 'free particle commute, so a free particle can have both of them exactly. Nothing is '
      + 'mysterious about that pair, and nothing is really mysterious about the other pair '
      + 'either. It is the same piece of algebra giving different answers.'),
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

  rule('superposition', 'Superposition', 'Adding states, and the interference that follows',
    'Add two allowed waves together and you get another allowed wave. This is not the same as '
    + 'not knowing which one you have, because waves added together can cancel — and cancelling '
    + 'means opening a second route can make somewhere harder to reach. Ignorance cannot do that.',
    () => frag(
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
      + 'with itself.'),
    p('Which is what makes the special shapes from the rules page special. Those are the states '
      + 'that are ', em('not'), ' a superposition of anything — at least as far as the one '
      + 'quantity you are asking about goes.'),
    p('Which comes with a twist worth knowing: a state that is definite in energy is usually a '
      + 'superposition in position, and the other way round. There is no state that is definite in '
      + 'everything, and the reason is the commutator on the last page.')
  ));

  rule('correspondence', 'Why you never see any of this', 'Correspondence, and decoherence',
    'Big things are not exempt from quantum mechanics. Two things hide it. The effects shrink as '
    + 'things get bigger, and — more importantly — anything big is constantly being nudged by '
    + 'its surroundings, which leaves a record of where it was, and records destroy interference.',
    () => frag(
    p('A reasonable complaint at this point: if everything is waves and superpositions, why is a '
      + 'cricket ball not in two places? Two answers, and they are different answers.'),
    h3('The first: things get classical when they get big'),
    p('Bohr’s correspondence principle says quantum predictions have to match classical ones '
      + 'in the limit of large quantum numbers, and they do, visibly. Take the particle in a box:'),
    table(['State', 'Probability of being in the middle third', 'A classical particle would say'],
      [1, 2, 5, 20, 100].map((n) => ['n = ' + n,
        fmt(Q.boxProbability(n, 1, 1 / 3, 2 / 3), 4), '0.3333']),
      'By n = 100 the quantum answer is the classical one to three figures, and the bumps are too fine to see.'),
    p('The energy levels tell the same story. When n is small the gap between levels is a big '
      + 'fraction of the energy itself, so the steps are obvious. When n is huge the gap is a '
      + 'vanishing fraction, so the staircase is too fine to see and the energy looks smooth. A '
      + 'swinging pendulum really does have quantum energy levels. They are about '
      + '10⁻³³ J apart, so you would need to measure its energy to thirty-odd '
      + 'decimal places before you noticed.'),
    h3('The second, and the real one: decoherence'),
    p('Size is not actually the point — superpositions of fairly large things have been made '
      + 'in the lab. What kills them is contact with everything else.'),
    callout(b('Interference needs the alternatives to be indistinguishable. '), 'A big object is '
      + 'constantly bumped by air molecules and photons, and each of those carries away a trace of '
      + 'where it was. The record does not need to be read by anyone — it just has to exist '
      + 'somewhere in the universe. Once it does, the paths are distinguishable, the cross terms '
      + 'average to nothing, and what is left behaves exactly like ordinary probability.'),
    p('The timescales are absurd. A dust grain in a vacuum chamber, lit only by starlight, '
      + 'loses its coherence in something like a trillionth of a second. A large molecule can be '
      + 'kept coherent long enough to diffract, but only in a good vacuum and in the dark. That '
      + 'is why those experiments are so hard, and why they are always done cold: every stray air '
      + 'molecule and every stray photon is a witness.'),
    p('So the answer to "why is the world classical" is not that quantum mechanics stops applying. '
      + 'It is that the world is extremely good at keeping records, and records destroy '
      + 'interference. ', b('A quantum computer is a machine built entirely around postponing '
      + 'this'), ' — cold, isolated, shielded — and losing that fight is what a decoherence '
      + 'error is.')
  ));

  /* ================================================ angular momentum, spin */

  spin('angular', 'Angular momentum comes in steps', 'And why it can never point straight at you',
    'Spinning motion comes in fixed steps, and here is the strange part: the total is always '
    + 'bigger than the most that can point along any one direction. So the spin axis can never '
    + 'quite line up with the direction you are measuring. There is always some left over sideways.',
    () => frag(
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
    p('And ℓ = 0 deserves a note. No angular momentum at all means there is no axis, and with '
      + 'no axis there is nothing for the orbital to be oriented about. So an s orbital is '
      + 'spherical. Not because anybody picked a sphere, but because there is no direction '
      + 'available to make it anything else.')
  ));

  spin('spin', 'Spin', 'An angular momentum with nothing going round',
    'Send atoms through a magnet and they split into exactly two beams, whichever way you turn '
    + 'the magnet. Electrons carry a fixed amount of built-in angular momentum with only two '
    + 'settings. Nothing is actually rotating — it is a property, like charge.',
    () => frag(
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

  spin('pauli', 'The exclusion principle', 'Why matter takes up room',
    'Two electrons can never be in the same state, and the reason is a sign flip: swap two '
    + 'electrons and their combined wave flips sign, so putting them in the same state makes the '
    + 'wave equal minus itself, which means zero. This is why you do not fall through your chair.',
    () => frag(
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

  spin('magnetic', 'Spin in a magnetic field', 'Zeeman, fine structure, MRI',
    'A spinning charge is a tiny magnet, and a magnet in a field has different energies for '
    + 'different orientations. Since the orientations come in steps, so do the energies, and one '
    + 'spectral line splits into several. An MRI scanner is built on this.',
    () => frag(
    p('An electron with angular momentum is a tiny magnet, and a magnet in a field has different '
      + 'energies depending on which way it points — a compass needle takes work to turn against '
      + 'the field. From the last two pages, which way it points comes in steps. So the energies '
      + 'come in steps too, and what was one spectral line becomes several close together.'),
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
