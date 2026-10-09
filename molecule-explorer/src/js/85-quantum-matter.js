/* Atoms, molecules, and light.
 *
 * The payoff pages. Everything before this is machinery; this is where the
 * machinery turns into the periodic table, the covalent bond and the colour
 * of things — the parts a chemist uses every day without usually being told
 * they are quantum mechanics.
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
  const atom = (id, n, bl, sh, f) => ME.quantumPage('Atoms and the table', id, n, bl, sh, f);
  const mol = (id, n, bl, sh, f) => ME.quantumPage('Molecules', id, n, bl, sh, f);
  const light = (id, n, bl, sh, f) => ME.quantumPage('Light and matter', id, n, bl, sh, f);

  /* ===================================================== atoms */

  atom('multielectron', 'Atoms with more than one electron', 'Where the exact answer runs out',
    'Hydrogen can be solved exactly. Helium cannot, and never will be, because each electron '
    + 'depends on where the other one happens to be. The fix is to pretend each electron sees a '
    + 'nucleus partly hidden by the others — which is where shielding comes from.',
    () => frag(
    p('Hydrogen is solved exactly. Helium is not, and never will be — not because nobody has '
      + 'been clever enough, but because the problem does not have a closed-form answer. Two '
      + 'electrons and a nucleus is a three-body problem, and each electron’s wavefunction '
      + 'depends on where the other one is, which depends on where the first one is.'),
    callout(b('Every atom but hydrogen is approximate. '), 'This is not a footnote; it is the '
      + 'central fact of computational chemistry. Everything from helium up is solved by '
      + 'approximation — usually by pretending each electron moves in an averaged cloud made '
      + 'by all the others, then iterating until the answer stops changing. That is what a '
      + 'quantum chemistry program spends its time doing.'),
    h3('Shielding, and why the s/p degeneracy breaks'),
    p('In hydrogen, 2s and 2p have exactly the same energy. Add a second electron and they do not, '
      + 'and the reason is worth getting right. An s orbital has a small but real probability of '
      + 'being found right at the nucleus; a p orbital has a node there and is never found at the '
      + 'centre at all. So an s electron spends part of its time inside the other electrons’ '
      + 'cloud, where it feels the full nuclear charge rather than a screened one.'),
    p('More time close in means lower energy. So 2s drops below 2p, 3s below 3p below 3d, and so '
      + 'on — and that one effect is what gives the periodic table its shape:'),
    table(['Electron', 'Nuclear charge', 'Screened by', 'Feels about'], [
      ['A 3s in sodium', '11', '10 inner electrons, almost completely',
        fmt(Q.effectiveCharge(11, 10, 0).zEff, 3) + ' — which is why it comes off so easily'],
      ['A 3p in chlorine', '17', '10 inner, plus 6 others in its own shell, partly',
        fmt(Q.effectiveCharge(17, 10, 6).zEff, 3) + ' — much more tightly held'],
      ['A 2p in fluorine', '9', '2 inner, plus 6 in its own shell',
        fmt(Q.effectiveCharge(9, 2, 6).zEff, 3)],
    ], 'Slater\'s rough rules: an inner electron screens about a whole charge, one in your own shell about a third.'),
    p('Read across a period and Z goes up by one each time while the screening barely changes, so '
      + 'the effective charge climbs steadily and the atoms get smaller and greedier. Read down a '
      + 'group and a whole new shell appears, screening jumps, and the outer electron is suddenly '
      + 'far away and loosely held. ', b('Both periodic trends, from one number.')),
    h3('Hund’s rule'),
    p('Given three p orbitals and three electrons, they go in singly with parallel spins rather '
      + 'than pairing up. The usual reason given is that electrons repel, so they avoid sharing an '
      + 'orbital — true but incomplete. The deeper reason is the sign flip from the exclusion '
      + 'page: electrons with parallel spins have an antisymmetric spatial wavefunction, which '
      + 'means it goes to zero where they coincide, which means they automatically stay apart. '
      + 'They are not being careful. They are incapable of being in the same place.')
  ));

  atom('periodic', 'Why the table is that shape', 'Blocks, periods, and 2, 6, 10, 14',
    'The periodic table is not a chart somebody designed. Its shape is the list of how many '
    + 'electrons fit in each kind of orbital — 2, 6, 10 and 14 — which comes from counting the '
    + 'orientations of a wave and doubling for spin. The blocks are that arithmetic, drawn.',
    () => frag(
    p('The periodic table was built by chemists who sorted elements by behaviour and had no idea '
      + 'why the pattern existed. Quantum mechanics explains the whole shape — the width of '
      + 'every block, the length of every period, where the awkward gaps are — from two facts '
      + 'you already have.'),
    p('Fact one: there are 2ℓ+1 orientations for each ℓ. Fact two: each holds two '
      + 'electrons, because spin has two states. Multiply:'),
    table(['Subshell', 'Orientations', '× 2 for spin', 'Block width'], [
      ['s (ℓ = 0)', '1', '2', 'groups 1–2'],
      ['p (ℓ = 1)', '3', '6', 'groups 13–18'],
      ['d (ℓ = 2)', '5', '10', 'the transition metals'],
      ['f (ℓ = 3)', '7', '14', 'the lanthanides and actinides'],
    ], 'The table is 2 + 6 + 10 + 14 wide because angular momentum is quantised and spin is a half.'),
    h3('The filling order, which is not n'),
    p('4s fills before 3d, which looks like a mistake until you see where it comes from. The order '
      + 'is by increasing n + ℓ, and ties go to the smaller n — and the reason is '
      + 'shielding again: a higher ℓ means more angular momentum, which keeps the electron '
      + 'further out and better screened, which costs energy.'),
    table(['Order', 'Subshell', 'n + ℓ', 'Holds'],
      Q.aufbauOrder(14).map((x, i) => [String(i + 1), x.label, String(x.nPlusL), String(x.capacity)]),
      'Read it off the diagonal arrows if you like, but the arrows are a mnemonic for this.'),
    p('And the exceptions are real: chromium is 4s¹ 3d⁵ rather than 4s² 3d⁴, '
      + 'copper is 4s¹ 3d¹⁰. A half-full or full d shell is worth more than the '
      + 'bookkeeping suggests, because of the Hund effect from the last page. The rule is a good '
      + 'rule with about twenty known exceptions, and the exceptions have reasons.'),
    h3('Why periods are 2, 8, 8, 18, 18, 32'),
    p('Count what gets filled between one noble gas and the next. Period 1 is just 1s: two '
      + 'elements. Period 2 is 2s and 2p: eight. Period 4 picks up 3d as well: eighteen. The '
      + 'lengths are not arbitrary and they are not 2n² either — they are whatever the '
      + 'n + ℓ ordering happens to collect before the next s shell starts.'),
    callout(b('And this is why chemistry repeats. '), 'An element’s behaviour is set almost '
      + 'entirely by its outermost electrons, and the filling order brings you back to the same '
      + 'outer arrangement again and again. Sodium and potassium both end in a lone s electron '
      + 'outside a closed shell, so they behave the same way. Mendeleev saw the repetition sixty '
      + 'years before anyone could say what was repeating.')
  ));

  atom('xray', 'X-rays and the order of the elements', 'Moseley, and the number that matters',
    'Knock out an innermost electron and the X-ray that comes out has an energy that depends '
    + 'cleanly on the nuclear charge. That gave each element a number you could measure rather '
    + 'than argue about, and it is why the table is ordered by protons and not by weight.',
    () => frag(
    p('Before 1913 the periodic table was ordered by atomic weight, and there were places where '
      + 'that clearly did not work — put tellurium before iodine by weight and the chemistry '
      + 'comes out wrong. Nobody could say what the right ordering principle was, because nobody '
      + 'knew the nucleus had a countable charge.'),
    p('Moseley fired electrons at metal targets and measured the X-rays that came back. Knock an '
      + 'electron out of the innermost shell and one from the next shell falls in to replace it, '
      + 'emitting a photon of exactly that energy gap. For a heavy atom the gap is thousands of '
      + 'electronvolts, so the photon is an X-ray.'),
    qeq('E ≈ (Z − 1)² × 10.2 eV'),
    p('The (Z − 1) is beautiful: the falling electron sees the full nuclear charge minus the '
      + 'one electron still left in the innermost shell, screening it. So this is the hydrogen '
      + 'formula with a screened nuclear charge, and it works:'),
    table(['Element', 'Z', 'Predicted Kα', 'Wavelength'], [
      ['Calcium', '20', fmt(Q.moseley(20).energyEV / 1000, 4) + ' keV', fmt(Q.moseley(20).lambdaNM, 4) + ' nm'],
      ['Iron', '26', fmt(Q.moseley(26).energyEV / 1000, 4) + ' keV', fmt(Q.moseley(26).lambdaNM, 4) + ' nm'],
      ['Copper', '29', fmt(Q.moseley(29).energyEV / 1000, 4) + ' keV', fmt(Q.moseley(29).lambdaNM, 4) + ' nm'],
      ['Molybdenum', '42', fmt(Q.moseley(42).energyEV / 1000, 4) + ' keV', fmt(Q.moseley(42).lambdaNM, 4) + ' nm'],
      ['Silver', '47', fmt(Q.moseley(47).energyEV / 1000, 4) + ' keV', fmt(Q.moseley(47).lambdaNM, 4) + ' nm'],
    ], 'Copper\'s real Kα is 8.05 keV and molybdenum\'s is 17.5 keV — a one-parameter formula, within a per cent or two.'),
    callout(b('Which settled the ordering question for good. '), 'Plot √E against position in '
      + 'the table and you get a straight line with no gaps and no ambiguity. Tellurium and iodine '
      + 'fall in the chemically correct order. Four predicted elements were missing from the line '
      + 'and all four were later found. The quantity that orders the elements is the nuclear '
      + 'charge, which is a whole number you can count — and Moseley could count it two years '
      + 'before anyone named the proton.'),
    p('The copper and molybdenum rows are not historical curiosities. They are the two standard '
      + 'X-ray sources in every crystallography lab in the world, and the wavelengths in that table '
      + 'are why: around 0.1 nm, which is the spacing between atoms in a crystal, which is exactly '
      + 'what you need to diffract off one.')
  ));

  /* ===================================================== molecules */

  mol('bonding', 'Where a covalent bond comes from', 'Two waves, added and subtracted',
    'Bring two atoms together and their electron waves overlap. Add them and the electron '
    + 'spends more time between the two nuclei, which pulls them together: a bond. Subtract them '
    + 'and it is pushed out of the middle, which is the opposite. Same two atoms, one sign.',
    () => frag(
    p('Two hydrogen atoms stick together and release energy. The usual school answer is that they '
      + '"share electrons to fill their shells", which describes the result without explaining '
      + 'anything. The actual reason is the sign of a wave.'),
    p('Bring two 1s orbitals close and their wavefunctions overlap. Being waves, there are two '
      + 'ways to combine them — add or subtract — and both are legitimate solutions:'),
    table(['Combination', 'Between the nuclei', 'Energy', 'Called'], [
      ['ψ₁ + ψ₂', 'The two waves reinforce, so electron density builds up there',
        'Lower than either atom alone', 'bonding'],
      ['ψ₁ − ψ₂', 'They cancel exactly — a node right between the nuclei',
        'Higher than either atom alone', 'antibonding'],
    ]),
    p('Electron density between two nuclei is what a bond ', em('is'), ': negative charge sitting '
      + 'where it can pull on both positive nuclei at once, and shield them from each other. The '
      + 'antibonding case puts a node there instead, so the nuclei see each other bare and push '
      + 'apart.'),
    F.lcaoFigure(),
    h3('The asymmetry, and why there is no He₂'),
    p('Drag the electron count in that figure. Two electrons go into the bonding level and you get '
      + 'H₂, comfortably bound. Four electrons — two helium atoms — and the extra '
      + 'pair has nowhere to go but the antibonding level, which sits ', b('further above'), ' the '
      + 'atomic level than the bonding one sits below it. The books cancel and then go negative.'),
    callout(b('That asymmetry is not a detail, it is the whole explanation of noble gases. '),
      'It comes from the overlap sitting in a denominator: the drop is divided by (1 + S) '
      + 'and the rise by (1 − S), so the rise always wins. Helium does not refuse to bond '
      + 'because its shell is full in some bookkeeping sense. It refuses because filling '
      + 'both levels is energetically worse than not bonding.'),
    h3('Bond order, which now means something'),
    p('(bonding electrons − antibonding electrons) / 2. For H₂ that is '
      + Q.bondOrder(2, 0) + '. For He₂ it is ' + Q.bondOrder(2, 2) + ', which is the model '
      + 'saying "no bond" rather than a convention. For O₂ it comes out as 2 with two '
      + 'electrons left unpaired in separate antibonding orbitals — which predicts that oxygen '
      + 'is magnetic, and it is. Liquid oxygen sticks to a magnet. No Lewis structure predicts '
      + 'that; this does.')
  ));

  mol('hybrid', 'Hybridisation', 'Not a thing atoms do — a thing we do',
    'Carbon does not promote an electron and then mix its orbitals in preparation for bonding. '
    + 'Hybrid orbitals are a bookkeeping choice we make, because adding the atomic waves together '
    + 'in that particular combination gives a description that points the right way for methane.',
    () => frag(
    p('Methane has four identical bonds at 109.5°. Carbon’s outer electrons are in one 2s '
      + 'and three 2p orbitals, which are not identical and are at 90°. The usual fix is to '
      + 'say the carbon "hybridises" its orbitals into four sp³ ones, and it is worth being '
      + 'clear about what that sentence means.'),
    callout(b('Nothing happens to the atom. '), 'Hybridisation is not a physical process. The '
      + 'carbon does not promote an electron, then mix orbitals, then bond — that story is a '
      + 'teaching sequence, not a timeline. What is really going on is that s and p are one '
      + 'convenient basis for describing the wavefunction, and four sp³ combinations are '
      + 'another, and they describe exactly the same thing. We change basis because tetrahedral '
      + 'coordinates make tetrahedral molecules easy to talk about.'),
    p('An analogy that holds up: you can give a position as "three metres east, four north" or as '
      + '"five metres, 37° north of east". Nothing moved when you switched. One description '
      + 'suits a street grid and the other suits a compass. Hybrid orbitals are the compass.'),
    h3('The three cases, and what fixes them'),
    table(['Mix', 'Orbitals out', 'Angle', 'Left over', 'Shape'], [
      ['sp³', '4', '109.5°', 'none', 'tetrahedral — methane'],
      ['sp²', '3', '120°', 'one p, perpendicular', 'trigonal planar — ethene, benzene'],
      ['sp', '2', '180°', 'two p', 'linear — ethyne, CO₂'],
    ], 'The count is fixed by how many σ bonds and lone pairs the atom has to point at things — which is VSEPR, arriving from the other direction.'),
    p('The leftover p orbitals are the useful part. In ethene the two unhybridised p orbitals '
      + 'overlap sideways to make the π bond, which is why the double bond is rigid — '
      + 'twist it and you tear that sideways overlap apart. In benzene six of them merge into a '
      + 'ring of delocalised electrons above and below the plane, which is why benzene is flat, '
      + 'unusually stable, and not two alternating structures flickering back and forth.'),
    h3('When to stop believing it'),
    p('Hybridisation is a model, and it creaks. It does badly for the heavier elements, where '
      + 'mixing s and p costs more energy and the bond angles stay nearer 90°. Hydrogen '
      + 'sulfide has a bond angle of 92°, not 109.5°, and calling it sp³ is simply a '
      + 'fiction. For anything serious, chemists compute orbitals over the whole molecule and '
      + 'never mention hybrids at all. ', b('It is a very good language for drawing organic '
      + 'molecules on paper and a poor description of what the electrons are doing.'))
  ));

  mol('colour', 'Why things are coloured', 'The box, applied to a real molecule',
    'A molecule absorbs the colours whose photons match the gap between its filled and empty '
    + 'levels, and you see what is left over. For a chain of alternating double bonds you can '
    + 'predict that gap with the particle in a box — the longer the chain, the redder the colour.',
    () => frag(
    p('Carrots are orange, blood is red and leaves are green, and all three are the same physics: '
      + 'a molecule has a gap between its filled and empty levels, and light whose photons match '
      + 'that gap gets absorbed. What you see is what is left.'),
    p('The remarkable part is that you can predict the gap with the particle in a box, which you '
      + 'derived by hand five pages ago. A conjugated molecule — alternating single and double '
      + 'bonds — has π electrons that are not stuck on one bond; they run the length of '
      + 'the chain. So treat the chain as a box and the electrons as particles in it.'),
    worked('Butadiene, four carbons, two double bonds', [
      { q: 'How many π electrons', why: 'Two per double bond', maths: '4' },
      { q: 'Which levels they fill', why: 'Two per level, so n = 1 and n = 2 are full',
        maths: 'HOMO is n = 2, LUMO is n = 3' },
      { q: 'How long is the box', why: 'About one bond length (0.14 nm) per bond along the chain',
        maths: fmt(Q.conjugatedBox(2).lengthNM, 3) + ' nm' },
      { q: 'The gap', why: '(3² − 2²) h²/8mL²',
        maths: fmt(Q.conjugatedBox(2).gapEV, 4) + ' eV' },
      { q: 'So it absorbs at', why: '1239.8 divided by that',
        maths: Math.round(Q.conjugatedBox(2).lambdaNM) + ' nm' },
      { q: 'Measured', why: 'Butadiene absorbs at 217 nm', maths: 'within 5%' },
    ]),
    p('That is a genuinely startling result. A model with no chemistry in it at all — no '
      + 'carbon, no bonds, just a box of the right length — predicts a real absorption '
      + 'spectrum to within a few per cent.'),
    h3('Longer chains, and where the model breaks'),
    table(['Double bonds', 'Box length', 'Predicted', 'Measured', ''],
      [[2, 217], [3, 258], [4, 290], [5, 334]].map(([k, real]) => {
        const r = Q.conjugatedBox(k);
        return [String(k), fmt(r.lengthNM, 3) + ' nm', Math.round(r.lambdaNM) + ' nm',
          real + ' nm', Math.abs(r.lambdaNM - real) / real < 0.1 ? 'good' : 'drifting'];
      }), 'Excellent for butadiene, and steadily worse after that. The failure is informative.'),
    callout(b('Why it drifts: the box is too flat. '), 'A real conjugated chain is not a smooth '
      + 'floor — single and double bonds alternate, so the potential has a gentle ripple in '
      + 'it. That ripple opens an extra gap the box model knows nothing about, and the longer the '
      + 'chain the more it matters. The honest version of this model gives a prediction that is '
      + 'excellent at four carbons and increasingly too red after that, and the discrepancy is '
      + 'measuring the bond alternation.'),
    h3('And the general rule you can keep'),
    p('Longer conjugation, smaller gap, redder absorption. A longer box has lower levels packed '
      + 'closer together, so less energy gets an electron across, so the light it swallows is '
      + 'redder. That one sentence covers an enormous amount of chemistry.'),
    p('β-carotene has eleven double bonds in a row. Long box, small gap, so it absorbs blue '
      + 'light — and a carrot that has had the blue taken out of it looks orange. '
      + 'Chlorophyll’s big conjugated ring takes red and blue and leaves green, which is the '
      + 'colour of almost every plant on the planet. Adding rings to a dye walks its colour '
      + 'along the spectrum for the same reason.'),
    p('And it explains the other half of the world, the colourless half. Ethene has just one '
      + 'double bond. Tiny box, huge gap, so its absorption sits far out in the ultraviolet where '
      + 'your eyes have nothing to see with. It is not that ethene fails to absorb light. It is '
      + 'that it absorbs light you cannot see, and anything that absorbs nothing in the visible '
      + 'range looks clear.')
  ));

  /* ===================================================== light and matter */

  light('transitions', 'Absorption and emission', 'And the rules about which jumps happen',
    'An atom will only take a photon whose energy exactly matches a gap it has. That is why a '
    + 'gas is see-through at almost every colour and solidly opaque at a few. Some exactly '
    + 'matching jumps still do not happen, because the photon has to hand over its spin as well.',
    () => frag(
    p('An atom in a low state meets a photon of exactly the right energy and takes it, jumping up. '
      + 'Later it drops back and emits one. That is the basic exchange, and two things about it '
      + 'are less obvious than they look.'),
    h3('Why the energy has to match exactly'),
    p('Not approximately — exactly. A photon of 10.1 eV meeting a hydrogen atom whose first '
      + 'gap is ' + fmt(Math.abs(Q.hydrogenEnergy(2).eV - Q.hydrogenEnergy(1).eV), 5) + ' eV does '
      + 'nothing at all. It does not get partly absorbed, and it does not heat the atom a little. '
      + 'There is no state to arrive in, so there is no transition. This is why a gas is '
      + 'transparent to almost all light and opaque at a handful of precise wavelengths, and why '
      + 'you can identify an element from a star by the gaps in its spectrum.'),
    h3('And why some matching jumps still do not happen'),
    p('The photon carries one unit of angular momentum, and angular momentum is conserved. So the '
      + 'electron’s has to change by exactly one to absorb it:'),
    qeq('Δℓ = ±1        Δm = 0 or ±1        Δn = anything'),
    table(['Jump', 'Allowed?', 'Why'], [
      ['1s → 2p', Q.allowed(0, 1, 0, 0).allowed ? 'yes' : 'no', Q.allowed(0, 1, 0, 0).why],
      ['1s → 2s', Q.allowed(0, 0, 0, 0).allowed ? 'yes' : 'no', Q.allowed(0, 0, 0, 0).why],
      ['1s → 3d', Q.allowed(0, 2, 0, 0).allowed ? 'yes' : 'no', Q.allowed(0, 2, 0, 0).why],
      ['2p → 3d', Q.allowed(1, 2, 0, 1).allowed ? 'yes' : 'no', Q.allowed(1, 2, 0, 1).why],
    ], 'Δn is unrestricted, which is why the Lyman series runs all the way up.'),
    p('A state that cannot easily get rid of its energy is called ', term('metastable',
      'An excited state with no allowed route down, so it survives far longer than a normal '
      + 'excited state.'), ', and it lasts far longer than the usual nanoseconds — '
      + 'milliseconds, sometimes minutes. That is not a curiosity: it is the single ingredient a '
      + 'laser cannot do without, and it is why things glow in the dark.'),
    h3('Three things a photon can do, not two'),
    table(['Process', 'What happens', 'Rate depends on'], [
      ['Absorption', 'Photon in, atom goes up', 'How many photons, and how many atoms are low'],
      ['Spontaneous emission', 'Atom drops on its own, photon out in a random direction',
        'Only how many atoms are up — nothing you can do about it'],
      ['Stimulated emission', 'A passing photon makes an excited atom drop, and the new photon is '
        + 'identical to it — same direction, same phase', 'How many photons, and how many atoms are up'],
    ], 'Einstein worked out in 1917 that the third one has to exist, purely from thermodynamics.'),
    p('That third row was a theoretical necessity for forty years before anyone built anything with '
      + 'it. One photon in, two identical photons out — and the next page is about what happens '
      + 'when you arrange for that to run away with itself.')
  ));

  light('lasers', 'Lasers', 'Why you have to fight thermodynamics to build one',
    'A photon passing an excited atom can knock it down and make a second photon identical to '
    + 'itself. Do that over and over and you get a laser. The hard part is that you need more '
    + 'atoms excited than not, and no temperature in the universe will give you that.',
    () => frag(
    p('Stimulated emission multiplies photons: one goes in, two come out, identical. Do that '
      + 'over and over and you get an avalanche of photons all in step with each other. That is '
      + 'what laser light is. And being in step is why a laser stays a narrow beam over a '
      + 'kilometre while a torch has spread out after ten metres.'),
    p('There is one problem, and it is fundamental. Stimulated emission needs atoms in the upper '
      + 'state. Absorption needs atoms in the lower one. Both processes have the same rate '
      + 'constant, so whichever population is bigger wins — and at equilibrium the lower one '
      + 'always is:'),
    qeq('N₂/N₁ = e^(−ΔE/kT)'),
    table(['Transition', 'Gap', 'Upper-state fraction at 25 °C'], [
      ['A visible laser line', '2.2 eV', ME.fmt.sciUnicode(Q.boltzmannRatio(2.2, 298).ratio, 3)],
      ['An infrared vibration', '0.25 eV', ME.fmt.sciUnicode(Q.boltzmannRatio(0.25, 298).ratio, 3)],
      ['A microwave rotation', '0.001 eV', fmt(Q.boltzmannRatio(0.001, 298).ratio, 5)],
    ], 'kT at room temperature is only ' + fmt(Q.boltzmannRatio(1, 298).thermalEV * 1000, 4) + ' meV, which is tiny next to a visible photon.'),
    callout(b('That first number is the whole difficulty. '), 'For a visible transition, roughly '
      + 'one atom in 10³⁷ is excited at room temperature. In a mole there are 10²³ '
      + 'atoms. So in any normal sample of anything, at any temperature you can survive, the number '
      + 'of excited atoms is zero — not "few", zero. Absorption beats stimulated emission by '
      + 'an unimaginable margin, which is why the world does not spontaneously lase.'),
    h3('Population inversion, and why it needs three levels'),
    p('To make a laser you need more atoms up than down — a ', term('population inversion',
      'More atoms in an excited state than in the lower one. Impossible at equilibrium at any '
      + 'temperature, so it has to be pumped.'), ' — and no temperature can give you that. '
      + 'Look at the formula: the ratio only reaches one as T goes to infinity, and never exceeds '
      + 'it. An inversion is not a hot system; it is not a thermal system at all.'),
    p('So you pump it, and the trick is to use three levels rather than two. Pump hard from the '
      + 'ground state to a high level that decays quickly into a metastable one. Atoms pile up in '
      + 'the metastable state because they cannot easily leave, and the inversion builds between '
      + 'that state and the ground state. With only two levels you can never get past half and half '
      + '— the same light that pumps atoms up stimulates them back down at the same rate.'),
    p('Put that medium between two mirrors so the photons pass through many times, let one mirror '
      + 'leak slightly, and the leak is the beam. Every photon in it is a copy of every other: same '
      + 'wavelength, same direction, same phase. ', b('That is the entire design, and it rests on '
      + 'a process Einstein deduced from thermodynamics in 1917.'))
  ));

  light('spectroscopy', 'Reading a spectrum', 'What a chemist actually does with all this',
    'Almost everything known about any molecule was learnt by shining light at it and seeing '
    + 'what came back. Each region of the spectrum has the right size of energy to move a '
    + 'different thing — rotations, vibrations, electrons, inner shells — so each answers a '
    + 'different question.',
    () => frag(
    p('Nearly everything known about any molecule was found by shining something at it and '
      + 'seeing what came back. You cannot look at a molecule. But you can find out which '
      + 'photons it is willing to accept, and that turns out to be nearly as good.'),
    p('Which photons those are depends on what you are trying to move. Spinning a whole molecule '
      + 'round is easy and needs very little energy. Stretching a bond costs more. Shifting an '
      + 'electron between orbitals costs much more again, and knocking out an inner-shell '
      + 'electron costs enormously more. So each region of the spectrum answers a different '
      + 'question, and the four of them barely overlap:'),
    table(['Region', 'Photon energy', 'What it moves', 'What it tells you'], [
      ['Microwave', fmt(Q.photonFromNM(1e7).eV * 1000, 3) + ' meV',
        'Whole-molecule rotation', 'Bond lengths, to astonishing precision'],
      ['Infrared', fmt(Q.photonFromNM(5000).eV, 4) + ' eV',
        'Bond vibration', 'Which functional groups are present'],
      ['Visible / UV', fmt(Q.photonFromNM(400).eV, 4) + ' eV',
        'Electrons between orbitals', 'Conjugation, colour, concentration'],
      ['X-ray', fmt(Q.photonFromNM(0.15).eV / 1000, 4) + ' keV',
        'Inner-shell electrons, and diffraction', 'Which elements, and where every atom sits'],
    ], 'Four orders of magnitude in energy, four completely different questions answered.'),
    h3('Beer–Lambert, and why absorbance is a logarithm'),
    p('Picture the solution as a stack of thin slices. Each slice absorbs the same ',
      em('fraction'), ' of whatever light arrives at it — not the same amount, the same '
      + 'fraction, because a photon only cares how many molecules it has to get past. Halve the '
      + 'light at the first slice, halve what is left at the second, and so on.'),
    p('Fractions multiply rather than add, so the brightness falls away exponentially with '
      + 'depth. And the thing that undoes an exponential is a logarithm. So chemists take the log '
      + 'and get a quantity that goes up in a straight line with concentration:'),
    qeq('A = εcl,    and the light that gets through is 10⁻ᴬ'),
    table(['Absorbance', 'Light getting through', 'Reading it'], [
      ['0.1', fmt(Q.beerLambert(0.1, 1, 1).percent, 3) + '%', 'a pale solution'],
      ['0.5', fmt(Q.beerLambert(0.5, 1, 1).percent, 3) + '%', 'the comfortable middle of the scale'],
      ['1.0', fmt(Q.beerLambert(1, 1, 1).percent, 3) + '%', 'a tenth gets through, by definition'],
      ['2.0', fmt(Q.beerLambert(2, 1, 1).percent, 3) + '%', 'getting hard to measure accurately'],
      ['3.0', fmt(Q.beerLambert(3, 1, 1).percent, 3) + '%', 'the instrument is now mostly measuring stray light'],
    ]),
    p('Which is why a spectrophotometer is only trusted between about 0.1 and 1.5, and why you '
      + 'dilute a dark sample rather than believing a reading of 3.'),
    callout(b('And ε is a quantum number in disguise. '), 'The molar absorptivity measures how '
      + 'strongly a molecule couples to light at that wavelength — which is the selection '
      + 'rules again, quantitatively. A fully allowed transition gives ε of tens of thousands; '
      + 'a forbidden one that only happens because the molecule is slightly distorted gives '
      + 'ε of ten. That is the difference between a dye and a faintly tinted transition metal '
      + 'salt, and you can read it straight off the intensity.')
  ));
})();
