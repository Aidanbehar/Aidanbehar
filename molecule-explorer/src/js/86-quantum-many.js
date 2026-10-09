/* Many particles, solids, and the parts that are genuinely strange.
 *
 * The last three groups. The first is what happens when you have 10²³ of
 * something and the exclusion principle starts deciding the behaviour of
 * bulk matter; the second is the technology that falls out of it; the third
 * is the handful of results that nobody has managed to make comfortable.
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
  const many = (id, n, bl, sh, f) => ME.quantumPage('Many particles', id, n, bl, sh, f);
  const odd = (id, n, bl, sh, f) => ME.quantumPage('The strange part', id, n, bl, sh, f);

  /* ===================================================== many particles */

  many('statistics', 'Two kinds of particle, two kinds of crowd', 'Fermi–Dirac and Bose–Einstein',
    'There are two kinds of particle in the universe. One kind refuses to share a state with '
    + 'another of its own kind, so they stack up from the bottom — that is matter. The other '
    + 'kind actively likes company and piles into the lowest state together — that is light.',
    () => frag(
    p('Classical physics has one rule for how a crowd of particles shares out energy. The chance '
      + 'of finding a particle in a state of energy E goes as e^(−E/kT), and there is no limit '
      + 'on how many can pile into the same state. Everyone is free to be anywhere.'),
    p('Quantum mechanics has two rules instead of one, because it turns out there are two kinds '
      + 'of particle in the universe, and the only difference between them is the sign flip from '
      + 'the exclusion page. The consequences of that one sign are enormous:'),
    F.statisticsFigure(),
    table(['', 'Fermions', 'Bosons'], [
      ['Who', 'Electrons, protons, neutrons — matter', 'Photons, phonons, helium-4 — carriers and condensates'],
      ['Rule', 'One per state, ever', 'As many as you like, and they prefer company'],
      ['Occupancy', 'f = 1/(e^x + 1), never above 1', 'f = 1/(e^x − 1), no ceiling at all'],
      ['At low temperature', 'Fill up from the bottom, forced into high states',
        'All pile into the lowest state together'],
      ['What that makes', 'Solid matter, metals, white dwarfs', 'Lasers, superfluids, Bose–Einstein condensates'],
    ]),
    h3('Why the Fermi curve is a cliff'),
    p('At absolute zero every state below a certain energy is full, every state above it is '
      + 'empty, and there is nothing in between. That is not because the electrons are cold and '
      + 'sluggish. It is because there is nowhere else for them to go: the lowest states are '
      + 'already taken, so each new electron is forced upstairs. ',
      b('A metal at absolute zero still has electrons moving at thousands of kilometres per '
      + 'second'), ', and there is nothing they can do to slow down.'),
    p('Now warm it up. Heating a crowd means letting some of them move up to higher states. But '
      + 'an electron deep in the pile has nowhere to move up ', em('to'), ': every state just '
      + 'above it is already occupied. Only the ones near the very top of the pile have empty '
      + 'states within reach, and at room temperature that is a fraction of a percent of them.'),
    p('Which settles an old embarrassment. Classical physics predicts that the free electrons in '
      + 'a metal should soak up a great deal of heat, and they do not — a metal\u2019s heat '
      + 'capacity is almost all lattice vibration. The electrons cannot absorb heat because '
      + 'almost none of them are allowed to move. That mismatch went unexplained for thirty '
      + 'years, and then Pauli settled it in a line.'),
    h3('And why the Bose curve has no ceiling'),
    p('Nothing stops bosons sharing, and in fact they prefer it: the more there are in a state, '
      + 'the more likely the next one is to join. Cool a gas of them far enough and a macroscopic '
      + 'number drop into the single lowest state at once, behaving as one quantum object you can '
      + 'photograph. That is a Bose–Einstein condensate, predicted in 1924 and made in 1995, '
      + 'and the same gregariousness is what makes a laser beam coherent.'),
    callout(b('And both reduce to Boltzmann when the gas is thin. '), 'When states are plentiful '
      + 'and particles are scarce, the chance of two wanting the same state is negligible, so it '
      + 'stops mattering whether sharing is allowed. That is why classical statistical mechanics '
      + 'works for air, and fails completely for the electrons in a wire.')
  ));

  many('bands', 'Why metals conduct', 'What happens to levels when you bring 10²³ atoms together',
    'Two atoms make two levels out of one. A huge number of atoms make a huge number of levels '
    + 'so close together that they are effectively a continuous band. Whether a material '
    + 'conducts comes down to one question: is its topmost band part-full, or exactly full?',
    () => frag(
    p('Two atoms give two molecular orbitals, one up and one down, as on the bonding page. Three '
      + 'give three. A mole gives 10²³, spread over the same finite energy range — '
      + 'so the gaps between them become unmeasurably small and the levels merge into a continuous ',
      b('band'), '.'),
    p('Between the bands there can be a gap, where the equation has no solutions at all. Whether a '
      + 'material conducts comes down to one question: ', b('is the highest occupied band full?')),
    F.bandFigure(),
    table(['Case', 'Top band', 'What an electron can do', 'You call it'], [
      ['Metal', 'Half full', 'Move into the empty state next door for almost no energy', 'a conductor'],
      ['Semiconductor', 'Full, small gap above', 'Nothing — unless it is given the gap energy', 'a semiconductor'],
      ['Insulator', 'Full, enormous gap above', 'Nothing, ever, at any reasonable temperature', 'an insulator'],
    ]),
    callout(b('A full band carries no current, however many electrons are in it. '),
      'This is the part that surprises people. To carry current the electrons have to change '
      + 'their collective momentum, and to do that some of them must move into new states. If '
      + 'every state is taken there is nowhere to go, so nothing happens. A full band is a traffic '
      + 'jam with no gaps — full of cars, going nowhere.'),
    h3('The gap decides everything'),
    table(['Material', 'Gap', 'Carriers at room temperature', 'Behaviour'],
      [['Copper', 0], ['Silicon', 1.12], ['Gallium arsenide', 1.42],
        ['Gallium nitride', 3.4], ['Diamond', 5.5]].map(([n, g]) => {
        const r = Q.bandGap(g);
        return [n, g === 0 ? 'none' : g + ' eV',
          g === 0 ? 'enormous' : ME.fmt.sciUnicode(r.thermalFraction, 2) + ' of them',
          g === 0 ? 'conducts' : r.kind];
      }), 'The carrier fraction goes as e^(−gap/2kT), so a factor of five in the gap is a factor of 10¹⁹ in conductivity.'),
    p('That exponential is why semiconductors are interesting and insulators are not. Silicon at '
      + 'room temperature has almost no free carriers — but "almost none" is enough to work '
      + 'with, and crucially it ', em('responds'), ': heat it, light it, or add a trace of another '
      + 'element and the number changes by orders of magnitude. Diamond’s gap is five times '
      + 'bigger and nothing you can do short of destroying it will produce a carrier.'),
    p('And it runs the other way too, which is the point of the next page: push an electron across '
      + 'the gap and when it falls back it emits a photon of exactly that energy. The gap is a '
      + 'colour.')
  ));

  many('devices', 'Doping, LEDs and solar cells', 'Engineering the gap',
    'Add about one foreign atom per million to silicon and you change how well it conducts by a '
    + 'factor of a billion. Join a piece with spare electrons to a piece short of them and you '
    + 'get a one-way valve for current — which is a diode, an LED and a solar cell.',
    () => frag(
    p('Pure silicon is nearly useless — too few carriers to carry anything. The trick that '
      + 'built the modern world is to add impurities on purpose, about one atom in a million, and '
      + 'change the carrier count by a factor of a billion.'),
    table(['Add', 'It has', 'Which leaves', 'Called'], [
      ['Phosphorus, one in 10⁶', 'Five outer electrons where silicon has four',
        'A spare electron, sitting just below the conduction band and easily freed', 'n-type'],
      ['Boron, one in 10⁶', 'Three outer electrons', 'A missing electron — a hole — just above '
        + 'the valence band, which neighbouring electrons fall into, so the hole moves', 'p-type'],
    ]),
    p('A hole is worth taking seriously as an object. It is an absence, and it moves, and it '
      + 'behaves in every measurable way like a particle with positive charge. The electrons are '
      + 'shuffling one way; it is far easier to track the one gap going the other way.'),
    h3('A junction, which is where it gets useful'),
    p('Put n-type and p-type together. Electrons from the n side wander across and fall into holes '
      + 'on the p side, leaving a zone in the middle with no carriers at all and a built-in '
      + 'electric field across it. That asymmetry is a diode: current flows one way and not the '
      + 'other, which is the single most useful thing a lump of matter can do.'),
    h3('Run it forwards: a light-emitting diode'),
    p('Push current through and electrons meet holes in the middle and fall into them, releasing '
      + 'the gap energy as a photon. The colour is the gap, so choosing the material chooses the '
      + 'colour:'),
    table(['Material', 'Gap', 'Emits at', 'Colour'],
      [['Gallium arsenide', 1.42], ['Gallium arsenide phosphide', 1.9], ['Gallium phosphide', 2.26],
        ['Indium gallium nitride', 2.7], ['Gallium nitride', 3.4]].map(([n, g]) => {
        const r = Q.bandGap(g);
        return [n, g + ' eV', Math.round(r.lambdaNM) + ' nm', r.region];
      }), 'Red, orange and green LEDs arrived in the 1960s. Blue took until the 1990s and won a Nobel Prize.'),
    p('Blue was hard because it needs a wide gap, and wide-gap materials are difficult to grow '
      + 'without defects and difficult to dope p-type. Nobody could make a good blue LED for '
      + 'thirty years after the red one.'),
    p('And without blue there is no white LED at all, because a white LED is a blue one with a '
      + 'phosphor coating on top of it. Every white light in your house is downstream of somebody '
      + 'solving that single materials problem.'),
    h3('Run it backwards: a solar cell'),
    p('Same junction, no current applied. A photon with more than the gap energy knocks an electron '
      + 'up into the conduction band, the built-in field sweeps it one way and the hole the other, '
      + 'and you have a current.'),
    p('The gap sets a trade-off with no way round it. A small gap catches plenty of photons, but '
      + 'every photon with more energy than the gap wastes the excess as heat. A large gap wastes '
      + 'nothing, but most of the sunlight sails straight through without being caught at all. '
      + 'The best compromise against the solar spectrum is around 1.3 eV — close enough to '
      + 'silicon’s ' + fmt(1.12, 3) + ' eV that the entire industry ended up built on sand.')
  ));

  /* ===================================================== the strange part */

  odd('entanglement', 'Entanglement', 'The one Einstein would not accept',
    'Two particles can be prepared so that neither has a definite property of its own, but the '
    + 'pair has a definite relationship. Measure one and the other is settled at once, however '
    + 'far away. Experiments show this is not the two of them having agreed in advance.',
    () => frag(
    p('Make two particles together in the right way and they stop having separate states. There is '
      + 'one wavefunction for the pair, and it says things about the pair that it does not say '
      + 'about either half.'),
    p('The standard example: two electrons made in a state of zero total spin. Measure one along '
      + 'any axis and you get up or down at random, fifty-fifty. Measure the other along the same '
      + 'axis and you always get the opposite. Every time, however far apart they are.'),
    h3('Why that alone is not spooky'),
    p('Put a red ball in one box and a blue ball in another, post them to opposite ends of the '
      + 'earth, and open one. Red. You instantly know the other is blue. No physics was violated '
      + 'and nothing travelled — the balls had their colours all along and you merely learned '
      + 'which was which.'),
    p('Einstein’s position, in 1935, was that entanglement must be like the balls: the '
      + 'particles carry predetermined answers, and quantum mechanics is simply an incomplete '
      + 'description that leaves those answers out. It is a thoroughly reasonable position and it '
      + 'held for thirty years, because nobody could think of an experiment to settle it.'),
    h3('Bell’s idea'),
    p('In 1964 John Bell found one. Do not measure both particles along the same axis — '
      + 'measure them along ', em('different'), ' axes, at various angles, and look at how the '
      + 'correlation varies with the angle between them.'),
    p('If the answers were decided in advance, there is a ceiling on how correlated the results can '
      + 'be across a set of four such angle pairs. Bell proved it as a theorem, with no assumptions '
      + 'about the mechanism — any pre-agreed scheme whatsoever obeys it:'),
    qeq('|S| ≤ 2        for anything decided in advance'),
    qeq('|S| = 2√2 = ' + fmt(2 * Math.SQRT2, 5) + '        for the quantum prediction'),
    F.bellFigure(),
    callout(b('The experiment gives 2√2. '), 'Repeatedly, in many labs, with the loopholes '
      + 'closed one by one over fifty years, and with a Nobel Prize for it in 2022. The particles '
      + 'did not carry predetermined answers. There was no fact about the outcome until it was '
      + 'measured, and the correlations between the two sides are stronger than any shared plan '
      + 'could produce.'),
    h3('And no, you cannot send a message with it'),
    p('This gets claimed constantly and it is false. Look at what each experimenter actually sees: '
      + 'a string of random results, fifty-fifty, with no pattern. Nothing the other one does '
      + 'changes that string in any way. The correlation only appears when the two lists are '
      + 'brought together and compared — and bringing them together takes a phone call, at the '
      + 'speed of light like everything else. ', b('Entanglement is a correlation you cannot '
      + 'control, which is exactly why it does not break relativity.'))
  ));

  odd('qubits', 'Quantum computing, honestly', 'What it is, and what it is not',
    'A quantum computer does not try every answer at once and hand you the best one. It arranges '
    + 'for the wrong answers to cancel each other out, like the dark bands in a two-slit '
    + 'pattern, so that what is left when you look is probably right. Cancelling, not parallelism.',
    () => frag(
    p('An ordinary bit is 0 or 1. A qubit is a superposition of both, which gets described as '
      + '"being in both states at once" — a phrase that has done more harm than good. Here is '
      + 'the version that survives contact with the details.'),
    qeq('|ψ⟩ = α|0⟩ + β|1⟩,    |α|² + |β|² = 1'),
    table(['State', 'Chance of reading 0', 'Chance of reading 1'], [
      ['|0⟩', fmt(Q.qubit(0, 0).prob0, 3), fmt(Q.qubit(0, 0).prob1, 3)],
      ['An equal mixture', fmt(Q.qubit(90, 0).prob0, 3), fmt(Q.qubit(90, 0).prob1, 3)],
      ['Mostly 1', fmt(Q.qubit(150, 0).prob0, 3), fmt(Q.qubit(150, 0).prob1, 3)],
      ['|1⟩', fmt(Q.qubit(180, 0).prob0, 3), fmt(Q.qubit(180, 0).prob1, 3)],
    ]),
    callout(b('The thing people get wrong: you cannot read out all those possibilities. '),
      'Measure a qubit and you get one bit — a single 0 or 1 — and the superposition is '
      + 'gone. Fifty qubits hold a superposition of 2⁵⁰ possibilities, and when you look '
      + 'you get fifty ordinary bits. A quantum computer is not a machine that tries every answer '
      + 'in parallel and tells you the right one. If it were, it could solve anything instantly, '
      + 'and it cannot.'),
    h3('What actually gives the advantage'),
    p('Interference. The amplitudes are signed — the cross terms from the superposition page '
      + '— so a well-designed algorithm arranges for the amplitudes of the wrong answers to '
      + 'cancel and the right one to add up. You then measure, and get the right answer with high '
      + 'probability. ', b('The art is cancellation, not parallelism'), ', and it is hard: only a '
      + 'handful of problems are known to have structure that allows it.'),
    table(['Problem', 'Quantum speedup', 'Honest status'], [
      ['Factoring big numbers', 'Exponential (Shor)', 'Would break today’s public-key encryption. Needs far more good qubits than exist.'],
      ['Searching an unsorted list', 'Quadratic (Grover)', 'Real, proven, and modest — √N rather than N'],
      ['Simulating quantum systems', 'Exponential', 'The most likely first genuine use — chemistry, which is what this whole tab is about'],
      ['Most other things', 'None known', 'Including, as far as anyone can prove, the hard optimisation problems people most want solved'],
    ]),
    h3('Why it is so hard to build'),
    p('Decoherence, which is the page on why you never see any of this, turned into an '
      + 'engineering problem. The machine has to keep its superpositions intact, and the universe '
      + 'is extremely good at recording what things are up to. Every stray photon, every '
      + 'vibration, every passing magnetic field leaves a record of which state a qubit was in '
      + '— and a record is a measurement, and a measurement ends the computation.'),
    p('That is why these machines sit in refrigerators a hundredth of a degree above absolute '
      + 'zero, behind layer after layer of shielding. And it is why qubit counts are still in the '
      + 'hundreds rather than the millions that a useful factoring run would need.'),
    p('None of which means the whole thing is hype. It means the hard part is engineering '
      + 'coherence, and that the first real application is likely to be simulating molecules. '
      + 'Which is fitting. Feynman’s original argument for building one of these was simply that '
      + 'nature is not classical, so simulating it on a classical machine is a losing game.')
  ));

  odd('decay', 'Radioactivity, and real randomness',  'Tunnelling with no clock',
    'A radioactive nucleus has no way of knowing how old it is. Its chance of decaying in the '
    + 'next second is the same whether it was made yesterday or a billion years ago. Half-lives '
    + 'are statistics about crowds, and say nothing whatever about any individual atom.',
    () => frag(
    p('An alpha particle inside a uranium nucleus does not have enough energy to climb out over the '
      + 'barrier holding it in. It gets out anyway, by tunnelling — the same effect from the '
      + 'barrier page, happening at nuclear scale.'),
    p('And because tunnelling is a probability per attempt rather than a process that builds up, '
      + 'there is nothing in a nucleus that counts down. A uranium atom made in a supernova five '
      + 'billion years ago is in precisely the same state as one made yesterday, with precisely the '
      + 'same chance of going in the next second.'),
    F.decayFigure(),
    callout(b('Nothing in the picture is ageing, and the curve is still an exponential. '),
      'That is the signature of a memoryless process, and it is why half-life is a meaningful '
      + 'quantity at all. If atoms wore out, the fraction surviving would depend on when they were '
      + 'made, and no simple law would hold.'),
    h3('Which makes the sensitivity to the barrier extraordinary'),
    p('The tunnelling page showed that transmission falls off exponentially with barrier width. In '
      + 'nuclei a small change in the alpha particle’s energy makes a small change in the '
      + 'effective barrier, and the exponential turns that into an enormous change in lifetime:'),
    table(['Isotope', 'Alpha energy', 'Half-life'], [
      ['Uranium-238', '4.3 MeV', '4.5 billion years'],
      ['Uranium-234', '4.9 MeV', '245 thousand years'],
      ['Radium-226', '4.9 MeV', '1600 years'],
      ['Polonium-214', '7.8 MeV', '160 microseconds'],
    ], 'A factor of two in energy; a factor of 10²⁴ in lifetime. Only an exponential does that.'),
    p('Gamow worked this out in 1928, and it was the first time quantum mechanics explained '
      + 'something about the nucleus. The correlation between alpha energy and half-life had been '
      + 'known for twenty years as the Geiger–Nuttall rule, with no explanation. It is '
      + 'tunnelling.'),
    h3('Genuinely random, not merely unpredictable'),
    p('A coin is unpredictable because you do not know enough about the flick. In principle, with '
      + 'enough information, you could call it. Radioactive decay is not like that. By Bell’s '
      + 'theorem on the entanglement page, there is no hidden property of the nucleus determining '
      + 'when it goes — not unknown, ', em('absent'), '.'),
    p('Which is why hardware random number generators point a detector at a weak source. It is the '
      + 'only randomness anyone knows of that is not merely ignorance.')
  ));

  odd('interpretations', 'What any of it means', 'And why chemistry gets to not care',
    'The equations are agreed on and the predictions all work. What is still argued about is '
    + 'what is physically going on underneath, and every answer on offer makes exactly the same '
    + 'predictions. So you can do all of chemistry without ever picking a side.',
    () => frag(
    p('The equations are not in dispute. Every prediction in this tab has been checked, often to '
      + 'ten or twelve figures, and quantum mechanics is the most precisely tested theory anybody '
      + 'has. The argument is about what the mathematics is describing — and it is a hundred '
      + 'years old with no resolution in sight.'),
    p('The seam is the one from the rules page: smooth deterministic evolution between '
      + 'measurements, abrupt random collapse at them, and no statement anywhere about what '
      + 'counts as a measurement.'),
    table(['Interpretation', 'Says', 'Costs you'], [
      ['Copenhagen', 'Collapse is real, and asking what happens between measurements is not a scientific question',
        'A theory whose basic rules lean on a word — "measurement" — that it never defines'],
      ['Many worlds', 'There is no collapse. Everything happens, the observer splits with it',
        'An unimaginable number of unobservable universes, and real difficulty explaining why the probabilities come out right'],
      ['Pilot wave', 'Particles do have definite positions, guided by a real wave',
        'Explicit faster-than-light influence under the hood, though never usable'],
      ['QBism and friends', 'The wavefunction describes your information, not the world',
        'Trouble saying what the world is made of'],
    ], 'Every one of these makes exactly the same predictions. Not nearly — exactly, in all cases tested.'),
    callout(b('Which is why a chemist can get on with it. '), 'The question "which interpretation '
      + 'is right" has no experimental consequence for anything in this tab. The orbital shapes, '
      + 'the bond energies, the spectra, the band gaps — all of it comes out the same. That is '
      + 'not a dodge; it is an honest statement about where the evidence currently runs out.'),
    h3('What is not up for grabs'),
    p('A short list of things the experiments have settled, whatever you think they mean:'),
    table(['Settled', 'By'], [
      ['Energy, angular momentum and spin come in discrete amounts', 'Spectra, Stern–Gerlach, a century of measurement'],
      ['There are no hidden pre-agreed answers', 'Bell tests, closed loophole by loophole, Nobel 2022'],
      ['Interference requires indistinguishable paths, not just small objects', 'Which-path experiments with gentle detectors'],
      ['Superpositions survive to at least the scale of large molecules', 'Diffraction of molecules with thousands of atoms'],
      ['Nothing travels faster than light, entanglement included', 'The no-signalling theorem, and every attempt to beat it'],
    ]),
    p('That is a lot of settled ground for a theory people call mysterious. The mystery is not in '
      + 'the predictions — they are the most reliable in science. It is in the sentence you '
      + 'say afterwards about what was going on, and nobody has found an experiment that tells '
      + 'you which sentence to use.'),
    p('A good place to leave it is where Feynman did: nobody understands quantum mechanics, and it '
      + 'does not matter, because the universe is not obliged to be understandable in terms of '
      + 'things you have held. It is obliged to be consistent, and it is.')
  ));
})();
