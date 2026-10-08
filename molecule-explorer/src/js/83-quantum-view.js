/* The pages of the Schrödinger tab.
 *
 * One idea per page, in the order the reasoning actually goes, which is not
 * the order a textbook uses. A textbook states the equation and then explains
 * the terms; this starts from the problem the equation was invented to solve,
 * because a reader who knows what question is being answered can follow the
 * answer.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const el = ME.el;
  const K = ME.kit;
  const Q = ME.quantum;
  const F = ME.quantumFigures;
  const { p, b, em, callout, figure, table, worked, term } = K;
  const { qeq, h3 } = ME.quantumInternals;
  const fmt = (x, s) => ME.fmt.fmt(x, s || 4);
  const frag = (...kids) => K.frag(kids.flat());

  /* ======================================================== the pages ==== */
  const PAGES = [];
  const page = (id, name, blurb, build) => PAGES.push({ id, name, blurb, build });

  page('why', 'Why there is an equation', 'The problem it was invented to solve', () => frag(
    p('By 1925 everybody could see that something was quantised. Heat a gas and it glows at ',
      em('particular'), ' wavelengths — sharp lines, with nothing in between. Hydrogen gives a red '
      + 'line at 656 nm, a blue-green one at 486, and a handful more, always the same ones, in '
      + 'every star and every discharge tube. If electrons could have any energy they liked, you '
      + 'would get a smear. You get lines instead, so they cannot.'),
    p('Bohr had a rule that produced hydrogen’s lines correctly: the electron’s angular '
      + 'momentum comes in whole multiples of ℏ. It worked, and it explained nothing. Why '
      + 'whole multiples? Ask that and the answer was "because then the numbers come out right", '
      + 'which is not an answer. And the moment you tried it on helium it fell apart.'),
    p('The move that worked was to stop asking ', em('where the electron is'), ' and start asking ',
      em('what it is doing'), '. Suppose an electron is not a tiny ball on a track but something '
      + 'spread out, with a wave-like amplitude. Then confining it does what confining any wave '
      + 'does.'),
    callout(b('Think of a guitar string. '), 'Clamp it at both ends and it cannot vibrate at just '
      + 'any frequency. There is a fundamental, then an octave, then a fifth above that — a ladder '
      + 'of specific notes with nothing in between. Nobody finds that mysterious, and nobody says '
      + 'the string "chooses" allowed frequencies. The clamps make everything else impossible: any '
      + 'other wavelength would have to be non-zero at a point that is physically pinned to zero.'),
    p('That is the whole idea, and it is worth sitting with for a second because everything else '
      + 'follows from it. ', b('Quantisation is not a rule added on top of physics. It is what you '
      + 'get when you make a wave fit inside a boundary.'), ' Bohr’s whole numbers were whole '
      + 'numbers of waves all along.'),
    p('So the job becomes: find the equation that says how this amplitude behaves, then find which '
      + 'shapes fit the atom. That equation is Schrödinger’s. The energies come out as the '
      + 'shapes that fit, and the ones that do not fit simply are not solutions — the same way a '
      + 'string has no note between the fundamental and the octave.'),
    callout(b('Honest aside. '), 'Nobody derived this equation from something deeper. '
      + 'Schrödinger guessed it, guided by the wave equations he already knew and by de '
      + 'Broglie’s suggestion that matter has a wavelength. It is a postulate, like F = ma. '
      + 'We keep it because a hundred years of predictions have come out right, not because it was '
      + 'proved. That is how the deepest laws usually arrive.')
  ));

  page('psi', 'What ψ actually is', 'An amplitude, not a position and not a cloud', () => frag(
    p('ψ — psi — is a number attached to every point in space. Feed it a position and it '
      + 'returns a value, which can be positive, negative, or complex. It is the amplitude of the '
      + 'wave at that point, in exactly the sense that the height of a water wave is its amplitude.'),
    p('What you can measure is not ψ but ', b('|ψ|²'), ', and that is a '),
    p(term('probability density', 'The probability per unit volume of finding a particle at a '
      + 'point. Multiply it by a small volume to get an actual probability.'),
      ': multiply it by a small volume and you get the chance of finding the particle in that '
      + 'volume if you look. Not a fraction of the particle — the whole particle, with that '
      + 'probability. An electron is never partly anywhere.'),
    h3('Why squared'),
    p('Because ψ can be negative, and a probability cannot. That is really all. But the sign '
      + 'is not a nuisance to be squared away — it is doing essential work:'),
    callout(b('This is where bonding comes from. '), 'Bring two atoms together and their ψ’s '
      + 'overlap. Where both are positive, or both negative, they add and the amplitude between '
      + 'the nuclei grows — more electron density in the middle, which is a bond. Where one is '
      + 'positive and the other negative, they cancel, leaving a gap between the nuclei: an '
      + 'antibond. Same two atoms, same two waves, and the only difference is a sign. If '
      + '|ψ|² were all there was, chemistry would have no way to tell those two apart.'),
    h3('Why it has to add up to one'),
    p('The particle is definitely somewhere, so adding up the chance of finding it everywhere has '
      + 'to give certainty:'),
    qeq('∫ |ψ|² dV  =  1   over all space'),
    p('That is bookkeeping rather than physics — but it has a real consequence. It fixes the height '
      + 'of the wave, which is otherwise undetermined, and it is exactly where the '
      + '√(2/L) in front of the particle-in-a-box wavefunction comes from. You will derive '
      + 'that one by hand in a couple of pages.'),
    h3('The part nobody can tell you'),
    p('What is ψ, physically? There is no agreed answer. It is not a density of matter, it is '
      + 'not a field you could put a probe in, and it lives in a space with three dimensions per '
      + 'particle rather than three dimensions in total. A hundred years of argument has not '
      + 'settled it, and the argument is philosophy, not chemistry.'),
    p('Which is genuinely fine, and worth saying plainly rather than hiding. You can do every bit '
      + 'of chemistry on this basis: ', b('ψ is the amplitude; |ψ|² is the chance; '
      + 'the sign matters when waves meet.'), ' If that feels like a slightly unsatisfying place to '
      + 'stand, you are in good company — Feynman said the same, at greater length.')
  ));

  page('equation', 'The equation, term by term', 'What each piece is doing, and why the i', () => frag(
    p('Here it is, in one dimension, which is where every idea in it can be seen clearly:'),
    qeq('iℏ ∂ψ/∂t  =  −(ℏ²/2m) ∂²ψ/∂x²  +  V(x) ψ'),
    p('Read the right-hand side first. It is the energy.'),
    h3('The easy term'),
    p('V(x)ψ is potential energy: the potential at that point, times the amplitude there. '
      + 'Nothing surprising — it is the same V you would write in any mechanics problem. V is where '
      + 'you describe the situation: zero inside a box and infinite outside, a parabola for a bond, '
      + '−e²/4πε₀r for an electron near a proton. ', b('Everything specific '
      + 'about your problem lives in V.'), ' The rest of the equation never changes.'),
    h3('The term that makes it all click'),
    p('−(ℏ²/2m)∂²ψ/∂x² is kinetic energy. And the reason it '
      + 'is a ', em('second'), ' derivative is the single most useful thing to understand here, '
      + 'because a second derivative measures ', b('curvature'), ' — how sharply a curve bends.'),
    callout(b('So the equation says: kinetic energy is curvature. '), 'A wave that wiggles tightly '
      + 'is sharply curved, and that means a lot of kinetic energy. A gently sloping wave has '
      + 'little. Once you have that, you can read answers off a graph without calculating '
      + 'anything: the n = 4 wave in a box wiggles four times in the same width as n = 1 wiggles '
      + 'once, so it is far more curved, so it has far more energy. That is the whole reason the '
      + 'levels climb.'),
    p('And it is not a new idea, just a usable version of an old one. de Broglie said short '
      + 'wavelength means fast — λ = h/p. Short wavelength is exactly what tight curvature '
      + 'means. The second derivative is de Broglie written so you can do calculus to it.'),
    p('The minus sign is there to keep the answer positive. Differentiate sin(kx) twice and you get '
      + '−k²sin(kx) — curvature comes out negative for a hump — so the minus flips it back.'),
    h3('The left-hand side, and the i'),
    p('iℏ ∂ψ/∂t says how fast the amplitude is changing. The i is the strange '
      + 'part, and it has a specific job.'),
    p('Without it you would have ℏ∂ψ/∂t = (energy)ψ, which is the shape of '
      + 'a growth or decay equation — the same shape as heat spreading out or a population '
      + 'exploding. Solutions grow or shrink exponentially. That would be a disaster: the total '
      + 'probability would not stay at one, so the particle would gradually stop existing, or '
      + 'start existing twice.'),
    callout(b('What the i does is turn growth into rotation. '), 'Multiplying by i is a quarter '
      + 'turn in the complex plane, so instead of running away, the amplitude goes round in a '
      + 'circle: e^(−iEt/ℏ) rather than e^(−Et/ℏ). Its size never changes, only '
      + 'its direction. That is what keeps the total probability pinned at one forever, and it is '
      + 'why quantum mechanics needs complex numbers rather than merely tolerating them.'),
    h3('The compact version'),
    p('Bundle the whole right-hand side into one symbol, Ĥ, called the Hamiltonian — it is '
      + '"the thing that works out the energy" — and the equation becomes:'),
    qeq('iℏ ∂ψ/∂t  =  Ĥψ'),
    p('Which reads: how fast the wave changes is set by its energy. Hold onto that sentence; the '
      + 'next page is entirely about what happens when you ask for the states where it does not '
      + 'change at all.')
  ));

  page('tdse-tise', 'TDSE and TISE', 'Where the second one comes from, and which to use', () => frag(
    p('These are not two rival equations. One is the law; the other is the law asked a narrower '
      + 'question. Seeing how the second drops out of the first takes about five lines, and it is '
      + 'worth every one of them, because the answer explains what an orbital is.'),
    h3('The question'),
    p('The time-dependent equation — the ', b('TDSE'), ' — is the real law. It governs everything, '
      + 'the way F = ma does. But most of chemistry does not want to know how things change. It '
      + 'wants energies, orbital shapes, spectral lines: things that sit still. So ask the narrow '
      + 'question: ', em('are there states whose shape never changes?')),
    h3('The separation, in five lines'),
    p('Guess that the answer is a fixed shape multiplied by something that depends only on time:'),
    qeq('ψ(x,t)  =  φ(x) · f(t)'),
    p('Put that into the TDSE and divide the whole thing by φf:'),
    qeq('iℏ (1/f) df/dt  =  (1/φ) [ −(ℏ²/2m) d²φ/dx² + Vφ ]'),
    p('Now look hard at that. The left side depends only on t. The right side depends only on x. '
      + 'They are equal for every x and every t. The only way a function of time can equal a '
      + 'function of position everywhere is if neither of them is really a function of anything — '
      + 'they are both the same constant. Call that constant E, because it is going to turn out to '
      + 'be the energy.'),
    p('Split them apart and you have two separate problems. The time half:'),
    qeq('iℏ df/dt  =  E f        →        f(t)  =  e^(−iEt/ℏ)'),
    p('and the space half:'),
    qeq('−(ℏ²/2m) d²φ/dx² + Vφ  =  Eφ        or just        Ĥφ = Eφ'),
    p('That second one is the ', b('TISE'), ', the time-independent equation. It is the TDSE with '
      + 'the time taken out, valid for exactly those states that have one definite energy.'),
    h3('The payoff'),
    p('Look at what f(t) turned out to be. It is e to the power of an imaginary number, which is a '
      + 'point going round a circle — and its magnitude is 1, always. So when you square the whole '
      + 'wavefunction, the time factor contributes nothing at all:'),
    qeq('|ψ(x,t)|²  =  |φ(x)|² · |e^(−iEt/ℏ)|²  =  |φ(x)|²'),
    callout(b('That is what "stationary state" means. '), 'The wave underneath is spinning — it has '
      + 'to be, that is the TDSE — but the probability cloud it produces is completely frozen. '
      + 'Nothing you could measure about the distribution changes, ever. ',
      b('An orbital is this. '), 'When you see a picture of a 2p orbital, you are looking at '
      + '|φ|² for one solution of the TISE, and the reason a still picture is honest is '
      + 'that the real thing genuinely does not move.'),
    p('Watch it happen. The blue and grey curves below are the real and imaginary parts of ψ, '
      + 'spinning into each other; the green curve is |ψ|², which is what an experiment '
      + 'could see. Then switch to a mixture of two states and watch the green curve come alive:'),
    F.stationaryFigure(),
    p('That second case is important and often skipped. A mixture of n = 1 and n = 2 is not a state '
      + 'of definite energy, so it is not stationary — the two pieces rotate at different rates '
      + '(E₂ is four times E₁, so it goes round four times as fast), the interference '
      + 'between them keeps changing, and the cloud sloshes from side to side. ', b('Motion, built '
      + 'entirely out of two things that individually never move.'), ' That is how anything in '
      + 'quantum mechanics ever gets anywhere.'),
    h3('So which one do you use?'),
    table(['You want', 'Use', 'Because'], [
      ['Energy levels, orbital shapes, spectral lines, bond geometry', 'TISE',
        'All of these are properties of states that do not change. This is almost all of chemistry.'],
      ['A molecule during a laser pulse', 'TDSE',
        'V itself is changing while you watch, so there are no stationary states to find.'],
      ['A wave packet travelling and spreading', 'TDSE',
        'Spreading is change over time, which is the one thing a single TISE solution never does.'],
      ['How fast a transition happens', 'TDSE',
        'The TISE gives you the two levels and so the wavelength, but not the rate.'],
      ['Tunnelling probability in steady state', 'TISE',
        'Steady state means nothing changes with time. Put the barrier in V and solve.'],
    ], 'The rule of thumb: if the question contains the word "when", you need the TDSE.'),
    callout(b('And the two connect. '), 'Any state at all can be written as a sum of TISE '
      + 'solutions, and in that sum each piece evolves by just picking up its own phase '
      + 'e^(−iEₙt/ℏ). So solving the TISE once, for all its levels, gives you '
      + 'everything you need to work out any time evolution you like. That is why chemists solve '
      + 'the time-independent equation and almost never touch the other one: the hard work is in '
      + 'the levels, and the time part is free once you have them.')
  ));

  page('box', 'Doing it by hand', 'The particle in a box, every step', () => frag(
    p('Here is the whole method, start to finish, on the one problem simple enough to do on paper. '
      + 'Six lines of algebra and you have derived quantised energy from scratch. Everything '
      + 'harder than this — real atoms, real molecules — is the same five steps with worse algebra '
      + 'and usually a computer.'),
    h3('Step 1: write down V'),
    p('A particle on a line, free to move between 0 and L, with walls it cannot get through:'),
    qeq('V = 0 inside (0 < x < L),    V = ∞ outside'),
    p('Infinite potential outside means the particle cannot be there at all, so ψ = 0 outside. '
      + 'And ψ has to be continuous — a jump in the amplitude would mean infinite curvature, '
      + 'which would mean infinite kinetic energy. So:'),
    qeq('φ(0) = 0    and    φ(L) = 0'),
    p('Those two conditions are the clamps on the guitar string, and they are the only place '
      + 'quantisation is going to come from. Nothing else below is quantum-specific.'),
    h3('Step 2: solve the TISE where V = 0'),
    p('With V = 0 the equation is just:'),
    qeq('−(ℏ²/2m) d²φ/dx²  =  Eφ        →        d²φ/dx²  =  −k²φ,   where k² = 2mE/ℏ²'),
    p('"What function, differentiated twice, gives minus itself?" Sine and cosine. So:'),
    qeq('φ(x)  =  A sin(kx)  +  B cos(kx)'),
    h3('Step 3: apply the boundary conditions'),
    p('At x = 0, sin(0) = 0 but cos(0) = 1, so φ(0) = B. For that to be zero, ',
      b('B = 0'), ' — the cosine is gone, and we are left with a sine.'),
    p('At x = L we need sin(kL) = 0, and sine is zero at multiples of π:'),
    qeq('kL = nπ        →        k = nπ/L,    n = 1, 2, 3, …'),
    callout(b('That is the quantisation, and that is all it was. '), 'Not a postulate, not a rule '
      + 'about angular momentum — just the observation that only whole numbers of half-waves fit '
      + 'between two fixed ends. Note what n = 0 would give: sin(0) = 0 everywhere, so ψ is '
      + 'zero at every point and there is no particle. That is why the counting starts at one, and '
      + 'it is why the lowest energy is not zero.'),
    h3('Step 4: read off the energy'),
    p('We had k² = 2mE/ℏ², so E = ℏ²k²/2m. Put in k = nπ/L and '
      + 'tidy up (ℏ = h/2π does the tidying):'),
    qeq('Eₙ  =  n²h² / 8mL²'),
    p('Three things worth reading straight off that. The energy goes as n², so the levels get '
      + 'further apart as you climb. It goes as 1/L², so squeezing the box is expensive. And '
      + 'it goes as 1/m, so a heavier particle has lower levels — which is why nobody notices '
      + 'quantum mechanics in everyday objects.'),
    h3('Step 5: normalise'),
    p('A is still undetermined, and that is what ∫|ψ|² = 1 is for:'),
    qeq('∫₀ᶠ A² sin²(nπx/L) dx  =  A² · L/2  =  1        →        A = √(2/L)'),
    p('The sin² averages to a half over any whole number of half-waves, which is where the L/2 '
      + 'comes from. So the finished answer, both halves of it:'),
    qeq('φₙ(x) = √(2/L) sin(nπx/L)        Eₙ = n²h²/8mL²'),
    F.boxFigure(),
    h3('With numbers in it'),
    worked('An electron in a box 1 nm across — roughly the size of a small molecule', [
      { q: 'Level n = 1', why: 'E₁ = h²/8mL² with L = 1 × 10⁻⁹ m',
        maths: fmt(Q.boxEnergy(1, 1).eV, 4) + ' eV' },
      { q: 'Level n = 2', why: 'Four times E₁, because the energy goes as n²',
        maths: fmt(Q.boxEnergy(2, 1).eV, 4) + ' eV' },
      { q: 'Level n = 3', why: 'Nine times E₁ — the gaps are widening',
        maths: fmt(Q.boxEnergy(3, 1).eV, 4) + ' eV' },
      { q: 'Photon for the 2 → 1 drop', why: 'ΔE = '
          + fmt(Q.boxTransition(1, 2, 1).deltaEV, 4) + ' eV, then λ = hc/ΔE = 1239.8/ΔE nm',
        maths: fmt(Q.boxTransition(1, 2, 1).lambdaNM, 4) + ' nm, in the '
          + Q.boxTransition(1, 2, 1).region },
      { q: 'Chance of finding it in the middle third, n = 1',
        why: 'Integrate (2/L)sin²(πx/L) from L/3 to 2L/3',
        maths: fmt(Q.boxProbability(1, 1, 1 / 3, 2 / 3), 3) },
    ]),
    p('That last number deserves a look. A classical particle rattling between two walls spends '
      + 'equal time everywhere, so it would be in the middle third a third of the time. The '
      + 'electron in its lowest state is there ', b(fmt(Q.boxProbability(1, 1, 1 / 3, 2 / 3) * 100, 3)
      + '% of the time'), ' — it strongly prefers the middle, because that is where the one '
      + 'allowed hump is fattest. Move up to n = 2 and the middle becomes the ',
      em('least'), ' likely place, because that is where the node is. Same box, opposite habit.')
  ));

  page('lessons', 'What the box is telling you', 'Four results that generalise', () => frag(
    h3('1. You cannot make it hold still'),
    p('The lowest energy is E₁ = h²/8mL², and that is not zero. There is no state of '
      + 'rest. This is ', term('zero-point energy', 'The energy a confined system still has in its '
      + 'lowest possible state, which is never zero.'), ', and the reason for it is a shape '
      + 'argument rather than anything about measurement: a particle at rest would have a flat '
      + 'wavefunction, and a flat function that is zero at both walls is zero everywhere, which is '
      + 'no particle at all. ', b('Holding still is not one of the available shapes.')),
    p('Heisenberg says the same thing from the other direction. Confine it to a width L and its '
      + 'momentum is uncertain by at least ℏ/2L, so it has at least that much momentum to be '
      + 'uncertain about, so it has kinetic energy. Two routes, one conclusion.'),
    h3('2. Confinement is expensive, and quadratically so'),
    p('E goes as 1/L². Halve the box and every level quadruples. This is the single most '
      + 'useful number-free fact in the whole topic, because it tells you the energy scale of '
      + 'anything just from its size:'),
    table(['Confine an electron to', 'Lowest energy comes out around', 'So you see'], [
      ['1 nm — a small molecule', fmt(Q.boxEnergy(1, 1).eV, 3) + ' eV',
        'visible and ultraviolet light; this is chemistry'],
      ['0.1 nm — one atom', fmt(Q.boxEnergy(1, 0.1).eV, 3) + ' eV',
        'the tens of electronvolts it takes to ionise an atom'],
      ['10 nm — a quantum dot', fmt(Q.boxEnergy(1, 10).eV, 3) + ' eV',
        'colour you can tune by changing the size of the dot, and nothing else'],
    ], 'Nothing in this table was looked up. It is one formula and three widths.'),
    p('The quantum dot row is worth a second. Those are nanocrystals used in displays, and the '
      + 'reason a bigger dot glows redder is exactly this: a bigger box means lower levels, '
      + 'closer together, so a smaller energy gap and a longer wavelength. Same material '
      + 'throughout. The colour is the size.'),
    h3('3. Nodes count the energy'),
    p('The n-th state has n − 1 nodes inside the box — places where ψ passes through '
      + 'zero. More nodes means more wiggles in the same width, which means tighter curvature, '
      + 'which (from the kinetic energy term) means more energy. So you can rank states by energy '
      + 'just by counting their zero crossings, without evaluating anything.'),
    p('That trick survives everywhere. It is why 2s sits above 1s, why a π* orbital costs more '
      + 'than a π, and why you can glance at two molecular orbital diagrams and tell which is '
      + 'higher.'),
    h3('4. The spacing pattern is specific to the box'),
    p('In a box the gaps widen as you go up, because E ∝ n². That is not universal. In a '
      + 'harmonic oscillator the gaps are all identical; in a hydrogen atom they narrow and pile up '
      + 'towards a limit. The spacing pattern is a fingerprint of the potential, which means a '
      + 'spectrum tells you what shape of trap the electron is in.'),
    callout(b('Which is the real reason spectroscopy works. '), 'You cannot see a molecule. But '
      + 'you can see which photons it accepts, and the pattern of those is set by the shape of V. '
      + 'Evenly spaced lines in the infrared say "something is vibrating like a spring". A '
      + 'converging series says "an electron is being held by a 1/r pull". The spectrum is the '
      + 'shape of the trap, read out in light.')
  ));

  page('tunnel', 'Getting through walls', 'What happens when V is finite', () => frag(
    p('Make the walls finite instead of infinite and something appears that has no classical '
      + 'version at all. Suppose the particle has energy E and the wall is V₀ high, with '
      + 'E < V₀. Classically it bounces, every time, full stop. Look at the equation instead:'),
    qeq('d²φ/dx²  =  +κ²φ,    where κ = √(2m(V₀−E))/ℏ'),
    p('That plus sign changes everything. Before, inside the box, we had d²φ/dx² = '
      + '−k²φ and the answer was a sine — something that oscillates. Now it is plus, '
      + 'and the function that gives back ', em('plus'), ' itself when differentiated twice is an '
      + 'exponential. Inside the wall the wave does not oscillate and it does not stop. ',
      b('It decays.')),
    p('And a decaying exponential never actually reaches zero. So if the wall has a far side, there '
      + 'is still some amplitude left when you get there — and amplitude means probability. The '
      + 'particle can be found on the other side of a wall it could never climb.'),
    qeq('T  =  1 / [ 1 + V₀² sinh²(κk a) / 4E(V₀−E) ]'),
    p('(a is the thickness.) The shape of that matters more than the formula. sinh grows like a '
      + 'doubling exponential, so T collapses as the barrier thickens. Drag the thickness slider '
      + 'and watch how violently:'),
    F.tunnelFigure(),
    h3('The cliff, in numbers'),
    table(['Thickness', 'Chance of getting through', 'Compared with 0.1 nm'], [
      ['0.1 nm', fmt(Q.tunnel(1, 5, 0.1).T * 100, 3) + '%', '—'],
      ['0.2 nm', fmt(Q.tunnel(1, 5, 0.2).T * 100, 3) + '%',
        'about ' + Math.round(Q.tunnel(1, 5, 0.1).T / Q.tunnel(1, 5, 0.2).T) + '× less likely'],
      ['0.5 nm', ME.fmt.sciUnicode(Q.tunnel(1, 5, 0.5).T, 3),
        'about ' + ME.fmt.sciUnicode(Q.tunnel(1, 5, 0.1).T / Q.tunnel(1, 5, 0.5).T, 2) + '× less likely'],
      ['1.0 nm', ME.fmt.sciUnicode(Q.tunnel(1, 5, 1).T, 3),
        'about ' + ME.fmt.sciUnicode(Q.tunnel(1, 5, 0.1).T / Q.tunnel(1, 5, 1).T, 2) + '× less likely'],
    ], 'A 1 eV electron against a 5 eV barrier. Ten times the thickness, and the odds fall by a factor of a hundred million.'),
    p('That steepness is not a mathematical curiosity, it is the useful part. A ',
      term('scanning tunnelling microscope', 'A microscope that images single atoms by measuring '
      + 'the tunnelling current between a sharp tip and a surface.'), ' holds a needle above a '
      + 'surface and measures the tunnelling current across the gap. Because the current depends '
      + 'so savagely on distance, a change of a tenth of an atom’s width changes the current '
      + 'measurably — which is how a blunt instrument gets a picture of individual atoms.'),
    p('It also explains alpha decay, which had been a puzzle: an alpha particle in a nucleus does '
      + 'not have enough energy to escape over the barrier holding it in, yet uranium decays. It '
      + 'tunnels. And because the probability is so brutally sensitive to the barrier, tiny '
      + 'differences between nuclei turn into half-lives ranging from microseconds to billions of '
      + 'years.')
  ));

  page('well', 'When there is no formula', 'The finite well, and why computers do this', () => frag(
    p('Keep the walls finite and ask for the bound states — the ones that stay in. The method is '
      + 'identical in spirit: sine inside, decaying exponential outside, and then demand that '
      + 'φ and its slope join up smoothly at each wall. Do the algebra and you arrive at:'),
    qeq('even states:   u tan u = √(R² − u²)'),
    qeq('odd  states:  −u cot u = √(R² − u²)'),
    p('with u set by the energy and R by the depth and width together. And now the trouble: ',
      b('you cannot rearrange those for u.'), ' There is no formula for the answer. The energies '
      + 'are real and well defined, and no amount of algebra will produce an expression for them.'),
    p('So you find them numerically — the app does it by bisection, narrowing in on each crossing '
      + 'branch by branch. Which is worth meeting now rather than later, because it sets '
      + 'expectations honestly:'),
    callout(b('The particle in a box is the unusual case, not the normal one. '), 'Almost no real '
      + 'potential has a closed-form solution. Hydrogen does, and it is the only atom that does. '
      + 'Helium — two electrons, one nucleus — has no exact solution and never will, because the '
      + 'two electrons each depend on where the other one is. Every molecular orbital you have '
      + 'ever seen came out of a computer doing approximately this, several million times.'),
    F.wellFigure(),
    h3('Two things to notice'),
    p('Every level sits ', em('lower'), ' than the matching level of a perfect box of the same '
      + 'width. The reason follows from the kinetic-energy-is-curvature idea: the wave leaks a '
      + 'little way into the walls instead of being cut dead, so it is effectively in a slightly '
      + 'wider box, so it curves a little less, so it costs a little less. For a '
      + '5 eV well 1 nm wide the ground state comes out at ',
      b(fmt(Q.finiteWell(5, 1).levels[0].eV, 3) + ' eV'), ' against ',
      b(fmt(Q.boxEnergy(1, 1).eV, 3) + ' eV'), ' for the ideal box.'),
    p('And the ladder stops. Above the top of the well the particle is free and the energies become '
      + 'continuous, so a finite well holds a finite number of bound states — '
      + Q.finiteWell(5, 1).count + ' for that same well. Make it shallower and you lose them one '
      + 'by one, down to exactly one. ', b('Never zero, though:'), ' in one dimension a well '
      + 'always holds at least one bound state, no matter how feeble. Try to drag the depth down '
      + 'far enough to empty it and you will find you cannot.')
  ));

  page('oscillator', 'A bond as a spring', 'Where infrared spectra come from', () => frag(
    p('Two atoms joined by a bond sit at a comfortable distance. Push them closer and they resist; '
      + 'pull them apart and they pull back. Near the bottom, any restoring force looks like a '
      + 'spring — so put a parabola in for V and solve:'),
    qeq('V = ½ k x²        →        Eₙ = (n + ½) ℏω,    ω = √(k/μ)'),
    p('The algebra is longer than the box (the solutions involve Hermite polynomials) but the '
      + 'answer is the simplest on this page, and it has two features worth more than the formula.'),
    h3('The rungs are evenly spaced'),
    p('Every gap is ℏω. Not n², not converging — identical, all the way up. That is '
      + 'why an infrared spectrum shows ', b('one strong band per vibration'), ' rather than a '
      + 'ladder of them: every jump of one rung costs the same, so they all land on the same '
      + 'wavelength.'),
    h3('The bottom rung is not the floor'),
    p('Put n = 0 in and you get E₀ = ½ℏω, not zero. Cool a molecule to absolute '
      + 'zero and its bonds are still vibrating, with energy that cannot be removed. Same argument '
      + 'as the box: a bond held perfectly still would have both a known position and a known '
      + 'momentum, which is not available.'),
    F.oscillatorFigure(),
    h3('Reduced mass, and why deuterium gives it away'),
    p('μ = m₁m₂/(m₁+m₂) — the two atoms on one spring behave like a single '
      + 'mass of that size, because what matters is how the separation changes, not how the pair '
      + 'drifts. It is the same substitution that fixes the hydrogen atom on the next page, for the '
      + 'same reason.'),
    p('And it makes a prediction you can check in an afternoon. Swap hydrogen for deuterium in '
      + 'H–Cl: the bond is chemically identical, the force constant is unchanged, but μ '
      + 'nearly doubles. ω goes as 1/√μ, so the band should drop by a factor of '
      + 'about √2:'),
    table(['Bond', 'Predicted', 'Observed'], [
      ['H–Cl', Math.round(Q.oscillator(516, Q.reducedMass(1.00783, 34.9689)).wavenumber) + ' cm⁻¹', '2886 cm⁻¹'],
      ['D–Cl', Math.round(Q.oscillator(516, Q.reducedMass(2.0141, 34.9689)).wavenumber) + ' cm⁻¹', '2091 cm⁻¹'],
    ], 'Same force constant for both, because it is the same bond. Only the mass changed.'),
    p('Both predictions sit about 3% above the observed bands, and in the same direction, which is '
      + 'the model telling you where it breaks. A real bond is not a spring: stretch it far enough '
      + 'and it gets ', em('easier'), ' to stretch, and eventually it snaps. A spring never snaps. '
      + 'So the real levels bunch up slightly as you climb instead of staying evenly spaced, and '
      + 'the first gap is a little smaller than the parabola predicts. That effect is called '
      + 'anharmonicity, and the ratio of the two numbers is the first thing a spectroscopist '
      + 'measures to find out how strong the bond really is.')
  ));

  page('hydrogen', 'The hydrogen atom', 'Where orbitals and quantum numbers come from', () => frag(
    p('Now the one that mattered. One proton, one electron, and the pull between them:'),
    qeq('V(r)  =  −e² / 4πε₀ r'),
    p('This is in three dimensions, so the curvature term has three parts instead of one. The '
      + 'trick that cracks it is the same one that gave us the TISE: separate the variables. '
      + 'Because V depends only on the distance r and not on direction, you can write'),
    qeq('ψ(r,θ,φ)  =  R(r) · Y(θ,φ)'),
    p('— a radial part and an angular part — and the equation splits into two independent problems, '
      + 'exactly as before.'),
    h3('Where the quantum numbers come from'),
    p('And here is the thing that is usually presented as a list of rules to memorise. The quantum '
      + 'numbers are not rules. They are ', b('boundary conditions'), ', one per dimension, and '
      + 'each one is the same kind of statement as "the wave must be zero at the wall":'),
    table(['Number', 'Comes from', 'What it is counting'], [
      ['n', 'The radial equation — the wave must die away at large r rather than blowing up',
        'How many radial wiggles, so mostly the energy'],
      ['ℓ', 'The polar angle — the wave must be well behaved at the poles',
        'How much angular structure: 0 is a sphere, 1 has a dumbbell axis, and so on'],
      ['m', 'Going round the atom — after a full turn the wave must join back up with itself',
        'Which way the angular structure points'],
    ], 'Three dimensions, three conditions, three integers. Not a postulate between them.'),
    p('The m one is the easiest to feel. Walk once around the nucleus and you end up where you '
      + 'started, so the wave has to meet itself — which means a whole number of wavelengths '
      + 'around the circuit. That is the same sentence as the guitar string, bent into a circle. '
      + 'And it is precisely Bohr’s whole-number rule, finally with a reason attached.'),
    h3('The energies'),
    qeq('Eₙ  =  −' + fmt(Q.ionisationEV(1), 6) + ' eV / n²'),
    p('That number is not typed in anywhere in this app — it is mμe⁴/8ε₀²h² '
      + 'evaluated from the defined constants, which is what the equation gives when you solve it. '
      + 'The fact that it matches the measured ionisation energy of hydrogen to five figures is '
      + 'why anybody believed any of this.'),
    F.hydrogenFigure(),
    p('Two details about that formula are worth more attention than they usually get. First, the '
      + 'negative sign: zero is defined as the electron free and infinitely far away, so every '
      + 'bound state is below it, and the energy ', em('needed to remove'), ' the electron is '
      + fmt(Q.ionisationEV(1), 5) + ' eV. Second — and this one is a genuine fluke — ',
      b('the energy depends only on n.'), ' 2s and 2p come out at exactly the same energy. That is '
      + 'special to the 1/r shape of the potential and it is true of no other atom: add a second '
      + 'electron and the shielding breaks the tie, 2s drops below 2p, and the whole structure of '
      + 'the periodic table follows from that split.'),
    h3('So what is an orbital?'),
    callout(b('An orbital is one solution of the time-independent Schrödinger equation for one '
      + 'electron in an atom. '), 'That is the entire definition. The shapes are |ψ|² for '
      + 'particular n, ℓ and m; the labels s, p, d are just names for ℓ = 0, 1, 2; and '
      + 'the reason a textbook can print a still picture of a 2p orbital is the result from three '
      + 'pages back — it is a stationary state, so the cloud genuinely does not move.'),
    p('Which also settles a question that bothers a lot of people: if the electron is not orbiting, '
      + 'why does it not fall into the nucleus? Because falling in would mean being localised at a '
      + 'point, and from the box argument, squeezing something into a tiny space costs enormous '
      + 'kinetic energy — far more than the potential energy it would gain. The atom’s size is '
      + 'the compromise between those two, and you can estimate it to within a factor of two with '
      + 'nothing but ΔxΔp ≥ ℏ/2. The electron is not held up by its motion. It '
      + 'is held up by not fitting.')
  ));

  page('examples', 'Worked examples', 'Eight, done the long way', () => {
    const box = Q.boxEnergy(1, 0.5);
    const t21 = Q.boxTransition(1, 2, 0.5);
    const ha = Q.hydrogenTransition(3, 2);
    const hb = Q.hydrogenTransition(4, 2);
    const co = Q.oscillator(1902, Q.reducedMass(12, 15.9949));
    const tun = Q.tunnel(2, 6, 0.25);
    const unc = Q.uncertainty(0.05);
    const dot = Q.boxEnergy(1, 6);
    return frag(
      p('Every number below is computed by the same code that grades the problems on the next page, '
        + 'so a worked answer and a marked answer can never disagree.'),
      worked('1. Energy of an electron in a 0.5 nm box, level 1', [
        { q: 'What is given', why: 'n = 1, L = 0.5 nm = 5 × 10⁻¹⁰ m, mass of an electron' },
        { q: 'Formula', why: 'E = n²h²/8mL² — nothing else is needed' },
        { q: 'Numerator', why: 'h² = (6.626 × 10⁻³⁴)²',
          maths: ME.fmt.sciUnicode(Math.pow(ME.fmt.CONST.h, 2), 4) + ' J²s²' },
        { q: 'Denominator', why: '8 × 9.109 × 10⁻³¹ × (5 × 10⁻¹⁰)²',
          maths: ME.fmt.sciUnicode(8 * ME.fmt.CONST.me * 2.5e-19, 4) },
        { q: 'Divide', why: 'and convert joules to electronvolts by dividing by 1.602 × 10⁻¹⁹',
          maths: fmt(box.eV, 5) + ' eV' },
        { q: 'Sense check', why: 'Half the width of the 1 nm box, so four times the energy of '
            + fmt(Q.boxEnergy(1, 1).eV, 4) + ' eV. It is.' },
      ]),
      worked('2. The photon from a 2 → 1 drop in that box', [
        { q: 'The gap', why: 'E₂ − E₁ = (4 − 1)E₁ = 3E₁',
          maths: fmt(t21.deltaEV, 5) + ' eV' },
        { q: 'Turn energy into wavelength', why: 'λ = hc/ΔE, and in these units hc = '
            + fmt(Q.HC_EV_NM, 6) + ' eV·nm, so just divide',
          maths: fmt(t21.lambdaNM, 5) + ' nm' },
        { q: 'What that is', why: 'Short enough to be ' + t21.region + ' — this box is small enough '
            + 'to absorb visible light, which is why molecules have colours at all' },
      ]),
      worked('3. Where is the electron likely to be? (n = 2, middle half)', [
        { q: 'Set up', why: 'Integrate |ψ|² = (2/L)sin²(2πx/L) from L/4 to 3L/4' },
        { q: 'Use the closed form', why: 'P = (b−a)/L − [sin(4πb/L) − sin(4πa/L)]/4π',
          maths: fmt(Q.boxProbability(2, 1, 0.25, 0.75), 4) },
        { q: 'Compare with n = 1', why: 'The same region, lowest state',
          maths: fmt(Q.boxProbability(1, 1, 0.25, 0.75), 4) },
        { q: 'Why they differ', why: 'n = 2 has its node dead centre, so the middle is where it is '
            + 'least likely to be found. n = 1 has its peak there. A classical particle would say '
            + '0.5 for both, and be wrong about both.' },
      ]),
      worked('4. Hydrogen’s red line', [
        { q: 'Which transition', why: 'The brightest visible hydrogen line is n = 3 → 2' },
        { q: 'The gap', why: '13.598 × (1/2² − 1/3²) = 13.598 × 0.1389',
          maths: fmt(ha.deltaEV, 5) + ' eV' },
        { q: 'Wavelength', why: fmt(Q.HC_EV_NM, 6) + ' ÷ ' + fmt(ha.deltaEV, 5),
          maths: fmt(ha.lambdaNM, 5) + ' nm' },
        { q: 'Against the real thing', why: 'Tables usually say 656.3 nm, and that is not a '
            + 'disagreement — tables quote the wavelength in air, and light slows slightly in air. '
            + 'In vacuum the line really is at ' + fmt(ha.lambdaNM, 5) + ' nm.' },
      ]),
      worked('5. And the blue-green one', [
        { q: 'Transition', why: 'n = 4 → 2, the next line up the Balmer series' },
        { q: 'Gap and wavelength', why: fmt(hb.deltaEV, 5) + ' eV',
          maths: fmt(hb.lambdaNM, 5) + ' nm, which is ' + hb.region },
        { q: 'The pattern', why: 'The lines crowd together as you climb, because the levels do. '
            + 'They converge on ' + fmt(Q.hydrogenTransition(1000, 2).lambdaNM, 5) + ' nm — the '
            + 'series limit, which is an electron falling in from free.' },
      ]),
      worked('6. Where the C–O stretch appears', [
        { q: 'Reduced mass', why: '(12 × 15.995)/(12 + 15.995) u',
          maths: fmt(Q.reducedMass(12, 15.9949), 5) + ' u' },
        { q: 'In kilograms', why: '× 1.6605 × 10⁻²⁷',
          maths: ME.fmt.sciUnicode(Q.reducedMass(12, 15.9949) * ME.fmt.CONST.amu, 4) + ' kg' },
        { q: 'Angular frequency', why: 'ω = √(k/μ) with k = 1902 N/m',
          maths: ME.fmt.sciUnicode(co.omega, 5) + ' rad/s' },
        { q: 'As a wavenumber', why: 'ω/2πc, with c in cm/s',
          maths: Math.round(co.wavenumber) + ' cm⁻¹' },
        { q: 'Zero-point energy', why: '½ℏω, the vibration that survives absolute zero',
          maths: fmt(co.zeroPointEV, 4) + ' eV' },
      ]),
      worked('7. Tunnelling through a thin barrier', [
        { q: 'Set up', why: 'A 2 eV electron, a 6 eV barrier, 0.25 nm thick' },
        { q: 'Decay constant', why: 'κ = √(2m(V₀−E))/ℏ with V₀−E = 4 eV',
          maths: ME.fmt.sciUnicode(tun.kappa, 5) + ' m⁻¹' },
        { q: 'How many decay lengths', why: 'κ × 0.25 nm',
          maths: fmt(tun.kappa * 0.25e-9, 4) },
        { q: 'Transmission', why: 'Into T = 1/(1 + V₀²sinh²(κa)/4E(V₀−E))',
          maths: fmt(tun.T, 4) + ', about ' + fmt(tun.T * 100, 3) + '%' },
        { q: 'Sanity', why: 'Classically zero. Quantum mechanically about one in '
            + Math.round(1 / tun.T) + '. Thicken the barrier to 1 nm and it falls to '
            + ME.fmt.sciUnicode(Q.tunnel(2, 6, 1).T, 3) + '.' },
      ]),
      worked('8. Why atoms are the size they are', [
        { q: 'Pin an electron down to 0.05 nm', why: 'Roughly half an atom’s radius' },
        { q: 'Minimum momentum spread', why: 'Δp = ℏ/2Δx',
          maths: ME.fmt.sciUnicode(unc.dp, 4) + ' kg·m/s' },
        { q: 'Which is a speed of', why: 'Δp/m for an electron',
          maths: Math.round(unc.speed / 1000) + ' km/s' },
        { q: 'And a kinetic energy of at least', why: '(Δp)²/2m',
          maths: fmt(unc.energyEV, 4) + ' eV' },
        { q: 'The point', why: 'Squeezing an electron to atomic size forces electronvolts of energy '
            + 'on it, and electronvolts is exactly the scale of chemical bonds. Chemistry happens '
            + 'at the energies it does because atoms are the size they are, and atoms are that size '
            + 'because of this trade-off.' },
      ]),
      callout(b('One more, for scale. '), 'A quantum dot 6 nm across gives a ground state of '
        + fmt(dot.eV, 4) + ' eV, and gaps of a few tenths of an electronvolt — right in the visible. '
        + 'Grow the dot and the colour shifts red. Nothing changes but the size of the box, and the '
        + 'whole effect is the formula you derived by hand four pages ago.')
    );
  });

  page('problems', 'Problems', 'Fifteen kinds, endlessly regenerated', () => {
    const wrap = el('div');
    wrap.appendChild(p('Each of these is generated fresh, and the answer is computed by the engine '
      + 'rather than stored — so the number you are marked against is the number the worked '
      + 'examples would give. Press for new ones as often as you like.'));

    const GROUPS = [
      ['Reading the equation', ['qm-which-equation', 'qm-psi-meaning']],
      ['The box', ['qm-box-energy', 'qm-box-jump', 'qm-box-probability', 'qm-box-nodes', 'qm-box-thinking']],
      ['Light', ['qm-photon', 'qm-hydrogen-line', 'qm-hydrogen-series', 'qm-hydrogen-level']],
      ['Bonds and barriers', ['qm-oscillator', 'qm-tunnel', 'qm-tunnel-thinking', 'qm-uncertainty']],
    ];

    GROUPS.forEach(([name, keys]) => {
      wrap.appendChild(h3(name));
      const holder = el('div', { class: 'qm-problems' });
      let seed = (Math.random() * 1e9) | 0;
      const fill = () => {
        ME.clear(holder);
        keys.forEach((k, i) => {
          const q = ME.practice.generate(k, seed + i * 7919);
          if (q) holder.appendChild(ME.quiz.buildQuestion(q, i, keys.length, false, null));
        });
      };
      const again = el('button', { class: 'btn btn-sm', text: 'New set' });
      again.addEventListener('click', () => { seed = (Math.random() * 1e9) | 0; fill(); });
      wrap.appendChild(holder);
      wrap.appendChild(again);
      fill();
    });
    return wrap;
  });

  /* ===================================================== the tab shell === */
  const St = { built: false, host: null, panel: null, nav: null, current: null, raf: null,
    last: 0, running: false };

  function build(host) {
    St.host = host;
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'The Schrödinger equation' }));
    wrap.appendChild(el('p', { class: 'note' },
      'Twelve pages on one equation, from the problem it was invented to solve through to doing it by '
      + 'hand. Separate from the course on purpose: nothing here is required for anything else, '
      + 'and it goes deeper than a first chemistry class needs.'));

    const layout = el('div', { class: 'qm-layout' });
    St.nav = el('nav', { class: 'qm-nav', 'aria-label': 'Pages' });
    PAGES.forEach((pg, i) => {
      const btn = el('button', { class: 'qm-navbtn', 'data-page': pg.id });
      btn.appendChild(el('span', { class: 'qm-navnum', text: String(i + 1) }));
      const txt = el('span', { class: 'qm-navtext' });
      txt.appendChild(el('span', { class: 'qm-navname', text: pg.name }));
      txt.appendChild(el('span', { class: 'note', text: pg.blurb }));
      btn.appendChild(txt);
      btn.addEventListener('click', () => { show(pg.id); ME.revealTop(St.panel); });
      St.nav.appendChild(btn);
    });
    layout.appendChild(St.nav);
    St.panel = el('div', { class: 'qm-panel' });
    layout.appendChild(St.panel);
    wrap.appendChild(layout);
    host.appendChild(wrap);
    St.built = true;
    show(PAGES[0].id);
  }

  function show(id) {
    const pg = PAGES.filter((x) => x.id === id)[0] || PAGES[0];
    St.current = pg;
    /* Figures from the page being left stop being painted. */
    ME.quantumInternals.LIVE.length = 0;
    ME.$$('.qm-navbtn', St.host).forEach((x) => x.classList.toggle('on', x.dataset.page === pg.id));
    ME.clear(St.panel);

    const card = el('div', { class: 'card card-pad qm-page' });
    card.appendChild(el('h2', { text: pg.name }));
    card.appendChild(pg.build());

    /* Previous and next, because ten pages in an order is a sequence even if
     * it is not a course. */
    const i = PAGES.indexOf(pg);
    const nav = el('div', { class: 'qm-pagenav' });
    if (i > 0) {
      const prev = el('button', { class: 'btn btn-sm', text: '← ' + PAGES[i - 1].name });
      prev.addEventListener('click', () => { show(PAGES[i - 1].id); ME.revealTop(St.panel, 0); });
      nav.appendChild(prev);
    }
    if (i < PAGES.length - 1) {
      const next = el('button', { class: 'btn btn-sm btn-primary', text: PAGES[i + 1].name + ' →' });
      next.addEventListener('click', () => { show(PAGES[i + 1].id); ME.revealTop(St.panel, 0); });
      nav.appendChild(next);
    }
    card.appendChild(nav);
    St.panel.appendChild(card);
    ME.bindTips(St.panel);
    paintAll();
    resume();
  }

  function paintAll() { ME.quantumInternals.LIVE.forEach((s) => s.paint()); }

  function step(now) {
    St.raf = null;
    if (!St.running) return;
    const dt = St.last ? Math.min(0.05, (now - St.last) / 1000) : 0;
    St.last = now;
    let anyAnimated = false;
    ME.quantumInternals.LIVE.forEach((s) => {
      if (!s.animated) return;
      anyAnimated = true;
      s.t += dt * 2.2;
      s.paint();
    });
    /* Nothing on this page moves, so there is nothing to keep a frame loop
     * alive for. */
    if (!anyAnimated) { St.running = false; return; }
    St.raf = requestAnimationFrame(step);
  }

  function resume() {
    if (!St.built || St.raf) return;
    St.running = true;
    St.last = 0;
    St.raf = requestAnimationFrame(step);
  }
  function pause() {
    St.running = false;
    if (St.raf) cancelAnimationFrame(St.raf);
    St.raf = null;
  }
  function ensureBuilt(host) {
    if (!St.built) build(host);
    paintAll();
  }

  window.addEventListener('resize', ME.debounce(() => { if (St.built) paintAll(); }, 150));

  ME.quantumview = { ensureBuilt, show, resume, pause, PAGES,
    get state() { return St; } };
})();
