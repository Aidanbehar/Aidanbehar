/* Unit 13: Thermochemistry. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, goto } = K;

  ME.course.unit({
    n: 13, id: 'thermochemistry',
    title: 'Energy in reactions',
    blurb: 'Why some reactions get hot, why others need a match to start, and why a reaction that releases energy can still refuse to happen.',
    lessons: [

    {
      id: 'heat-and-energy',
      title: 'Heat, temperature, and q = mcΔT',
      keywords: 'specific heat capacity calorimetry calorimeter joule calorie q mcdeltat',
      mins: 16,
      builds_on: ['phase-changes', 'kinetic-theory'],
      hook() {
        return frag(
          p('Take a cake tin out of a 200 °C oven and you can touch the foil lid for a moment without harm. Touch the metal tin and you will burn yourself instantly.'),
          p('Both were at 200 °C. Same temperature, completely different outcome — which means temperature is not what burns you.'));
      },
      pages: [
        {
          h: 'Temperature and heat are different quantities',
          body() {
            return frag(
              table(['', 'Temperature', 'Heat'], [
                ['What it is', 'the average kinetic energy of the particles', 'energy transferred because of a temperature difference'],
                ['Depends on the amount?', 'no', 'yes'],
                ['Unit', 'K or °C', 'J'],
              ]),
              p('A cup of tea at 80 °C is hotter than a swimming pool at 20 °C, and the pool contains vastly more energy. Temperature is an average per particle; heat is a total.'),
              callout(b('Which settles the foil. '), 'The foil is at 200 °C and weighs almost nothing, so it holds very little energy and gives you very little. The tin is at the same temperature and holds a great deal. Temperature tells you which way energy will flow; it does not tell you how much there is to flow.'),
              h4('And heat only flows one way by itself'),
              p('Energy moves from hotter to colder, always, without exception and without anything having to drive it. Never the other way round on its own — a fridge moves heat the wrong way and needs a motor and a power supply to do it.'),
              p('It is worth noticing there is no such thing as cold flowing in. When ice cools your drink, energy is leaving the drink and entering the ice. "Cold" is not a substance, and framing it as one makes phase changes much harder to reason about later.'));
          },
        },
        {
          h: 'Specific heat: why water is the odd one out',
          body() {
            return frag(
              p('Different substances need different amounts of energy to warm up by the same amount. The ', term('specific heat', 'The energy needed to raise one gram of a substance by one degree. Water’s is unusually large, which is why it moderates temperatures so effectively.'), ' is how much it takes per gram per degree.'),
              table(['Substance', 'Specific heat, J/(g·K)'], [
                ['water', '4.184'],
                ['ethanol', '2.44'],
                ['air', '1.005'],
                ['glass', '0.84'],
                ['aluminium', '0.897'],
                ['iron', '0.449'],
                ['lead', '0.128'],
              ]),
              p('Water’s value is enormous, and by now you know why: hydrogen bonds. Energy going into water partly goes into stretching and breaking them rather than into speeding molecules up, so the temperature climbs slowly.'),
              okCallout(b('And that one number shapes the planet. '), 'The oceans absorb vast amounts of energy for a small temperature change, which is why coastal climates are mild and continental interiors swing between extremes. It is also why the sea is still cold in June and still warm in October, and why sweating cools you so effectively.'),
              h4('The equation'),
              eq('q = m c ΔT'),
              p('Energy transferred equals mass times specific heat times temperature change. Three things multiplied, in the order you would guess: how much stuff, what the stuff is, and how far the temperature moved.'),
              worked('How much energy warms 250 g of water from 20 °C to 100 °C?', [
                { q: 'Identify the three', why: 'm = 250 g, c = 4.184 J/(g·K), ΔT = 80.' },
                { q: 'Multiply', why: 'And the units cancel to leave joules.', maths: '250 × 4.184 × 80 = 83,680 J ≈ 84 kJ' },
                { q: 'Sanity check', why: 'A 2 kW kettle delivers 2000 J every second, so this should take about 42 seconds. A kettle does take about that long, so the number is believable.' },
              ]),
              warnCallout(b('ΔT is the same number in °C and in K. '), 'A rise of 80 degrees is a rise of 80 kelvin — the two scales differ in where zero sits, and a difference does not care where you started. So q = mcΔT is one of the few places you may leave Celsius alone, unlike everything in Unit 10.'),
              goto('The heat calculator', '#/tools/heat', 'With a substance list and the working shown.'));
          },
        },
        {
          h: 'Calorimetry: measuring it',
          body() {
            return frag(
              p('You cannot see energy, so you measure it by what it does to something whose specific heat you know — usually water. That is ', term('calorimetry', 'Measuring energy transfer by the temperature change it causes in something of known mass and specific heat, usually water.'), ', and it is how every number in a food label and every enthalpy in a data book was obtained.'),
              p('Drop a hot object into cool water and they meet somewhere. The interesting part is that they do not meet halfway.'),
              ME.sims.calorimeter(),
              p('Set a 500 g lead block against 25 g of water and then reverse the masses. The final temperature moves towards whichever side has the larger mass times specific heat, because that side has more capacity to absorb or release energy per degree.'),
              h4('The logic, and its one assumption'),
              p('Energy is conserved, so what the hot thing loses the cold thing gains, and there is nowhere else for it to go:'),
              eq('m1 c1 (Tf - T1) + m2 c2 (Tf - T2) = 0'),
              p('Rearranged, the answer is a weighted average of the two starting temperatures, weighted by mc. Which explains the asymmetry directly: the side with the bigger mc pulls the result towards itself.'),
              warnCallout(b('The assumption is that the container absorbs nothing. '), 'It does absorb something, which is why a real calorimeter is measured and corrected for — its "calorimeter constant". A polystyrene cup gets close enough for teaching, and a proper bomb calorimeter accounts for it explicitly. The app assumes a perfect container and says so.'),
              p('This is also how food energy is measured: burn a weighed sample in oxygen inside a sealed vessel surrounded by water, and see how much the water warms. A dietary calorie is a kilocalorie, 4184 J — so the numbers on a packet come out of exactly this equation.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Which contains more energy: a cup of tea at 80 °C or a swimming pool at 20 °C?',
          options: [
            { t: 'The pool, by an enormous margin — temperature is an average per particle and heat is a total.', ok: true,
              why: 'Right, and it is why the foil and the tin behave so differently at the same temperature. Temperature tells you which way energy flows, not how much there is.' },
            { t: 'The tea, because it is hotter.', ok: false,
              why: 'Hotter means higher average energy per particle. The pool has vastly more particles.' },
            { t: 'They contain the same amount.', ok: false,
              why: 'Not remotely — the pool holds millions of times more.' },
          ] },
        { kind: 'numeric', after: 1,
          q: 'How much energy warms 100 g of water by 25 °C? Answer in J. (c = 4.184.)',
          answer: 10460, tol: 20,
          right: '10,460 J, or about 10.5 kJ. q = mcΔT, straight multiplication.',
          wrong: 'Multiply the mass, the specific heat and the temperature change.' },
      ],
      quizzes: [
        { kind: 'choice', q: 'Why does water moderate climate so effectively?',
          options: [
            { t: 'Its specific heat is unusually large, so it absorbs a lot of energy for a small temperature change.', ok: true,
              why: 'Right, and the reason behind the reason is hydrogen bonding — energy goes into stretching bonds rather than into speeding molecules up.' },
            { t: 'Because it is transparent.', ok: false,
              why: 'Light penetration matters for other reasons and not for this.' },
            { t: 'Because it evaporates.', ok: false,
              why: 'Evaporation does carry energy away, and the moderating effect is mostly the specific heat.' },
          ] },
        { kind: 'numeric', q: 'How much energy warms 50.0 g of aluminium by 40 °C? In J. (c = 0.897.)',
          answer: 1794, tol: 5,
          right: '1,794 J. Note how much less than the same mass of water would need — about a fifth.',
          wrong: 'q = mcΔT.' },
        { kind: 'choice', q: 'Why can you leave temperatures in Celsius for q = mcΔT?',
          options: [
            { t: 'Because ΔT is a difference, and a difference is the same number on both scales.', ok: true,
              why: 'Right — the scales differ in where zero sits, and a gap of 80 degrees is a gap of 80 kelvin. Gas laws are different because they use the temperature itself, not a difference.' },
            { t: 'Because specific heats are quoted in Celsius.', ok: false,
              why: 'They are quoted per kelvin, which is the same size of degree — which is the actual reason it works.' },
            { t: 'You cannot — it must be kelvin.', ok: false,
              why: 'For a difference either works. It is gas laws that genuinely require kelvin.' },
          ] },
        { kind: 'choice', q: 'When ice cools a drink, what is happening?',
          options: [
            { t: 'Energy is leaving the drink and entering the ice. There is no such thing as cold flowing in.', ok: true,
              why: 'Right, and getting this the right way round matters — "cold" is not a substance, and treating it as one makes phase changes much harder to reason about.' },
            { t: 'Cold moves from the ice into the drink.', ok: false,
              why: 'The natural way to describe it and not what happens. Heat flows out of the drink; nothing flows in.' },
            { t: 'The ice absorbs the drink’s temperature.', ok: false,
              why: 'Temperature is not a substance either. What moves is energy.' },
          ] },
        { kind: 'choice', q: 'A hot metal block is dropped into water. Where does the final temperature sit?',
          options: [
            { t: 'Much closer to the water’s starting temperature, because water’s mc is far larger.', ok: true,
              why: 'Right — it is a weighted average, weighted by mass times specific heat, so the bigger mc pulls the answer towards itself.' },
            { t: 'Exactly halfway between them.', ok: false,
              why: 'Only if both sides had the same mc, which is nearly never true — water’s specific heat is around ten times a metal’s.' },
            { t: 'At the metal’s starting temperature.', ok: false,
              why: 'The metal cools substantially. It just does not warm the water much.' },
          ] },
        { kind: 'choice', q: 'What does a calorimeter measure directly?',
          options: [
            { t: 'A temperature change in something of known mass and specific heat, from which the energy is calculated.', ok: true,
              why: 'Right — you never measure energy directly. Every enthalpy in a data book and every number on a food label came from this.' },
            { t: 'Energy, directly.', ok: false,
              why: 'There is no instrument that reads joules off a reaction. You read a thermometer and calculate.' },
            { t: 'The mass of the products.', ok: false,
              why: 'That is a different measurement, and useful for other purposes.' },
          ] },
        { kind: 'choice', q: 'What does a calorimetry calculation assume?',
          options: [
            { t: 'That the container absorbs nothing, which is why real calorimeters are calibrated.', ok: true,
              why: 'Right — the correction is the calorimeter constant. A polystyrene cup is close enough for teaching, and a bomb calorimeter accounts for it explicitly.' },
            { t: 'That the reaction goes to completion.', ok: false,
              why: 'A separate assumption, and often a fair one. The container is the one being made here.' },
            { t: 'That water’s specific heat is constant.', ok: false,
              why: 'It varies only slightly over normal ranges, and that is a much smaller error than the container.' },
          ] },
      ],
      practice: 'heat',
      mistakes: [
        { wrong: 'Using temperature and heat as the same word.',
          why: 'A swimming pool at 20 °C holds far more energy than a cup at 80 °C. Temperature is an average per particle; heat is a total transfer.' },
        { wrong: 'Saying cold flows in.',
          why: 'Only energy moves, and it moves from hot to cold. "Cold" is not a substance, and treating it as one causes real confusion in phase changes.' },
        { wrong: 'Converting ΔT to kelvin.',
          why: 'Harmless but unnecessary — a difference is the same number on both scales. It is the gas laws that need the absolute temperature.' },
        { wrong: 'Expecting a mixture to settle halfway.',
          why: 'It is a weighted average by mass times specific heat. A hot spanner in a bucket of water barely warms the water.' },
      ],
      recap: [
        'Temperature is an average per particle; heat is an energy total. The 200 °C foil and the 200 °C tin differ in the second, not the first.',
        'Energy flows from hot to cold on its own, and never the other way without something driving it. Cold does not flow.',
        'Specific heat is the energy per gram per degree. Water’s is unusually large because of hydrogen bonding, and that one number moderates the climate.',
        'q = mcΔT, and ΔT may be left in Celsius because a difference is the same on both scales.',
        'Calorimetry measures energy by the temperature change it causes in water — and assumes the container absorbs nothing, which real instruments correct for.',
      ],
    },

    {
      id: 'enthalpy',
      title: 'Enthalpy, bond energies and Hess’s law',
      keywords: 'enthalpy delta H exothermic endothermic bond energy hess law activation energy energy diagram',
      mins: 17,
      builds_on: ['heat-and-energy', 'why-bond'],
      hook() {
        return frag(
          p('Petrol burning releases energy. Making petrol from carbon dioxide and water absorbs it. Same molecules, opposite directions, and the amounts are identical — nature keeps exact books.'),
          p('And here is the question that unlocks the topic: if breaking bonds always costs energy, and making them always releases it, why does any reaction come out net exothermic?'));
      },
      pages: [
        {
          h: 'Bonds broken, bonds made',
          body() {
            return frag(
              p('Every reaction does two things. It breaks the reactants’ bonds, which costs energy, and it makes the products’ bonds, which releases energy. Whether you end up ahead depends on which is larger.'),
              eq('ΔH ≈ (energy to break the bonds) − (energy released making the new ones)'),
              table(['If the new bonds are…', 'Then', 'Called'], [
                ['stronger than the old ones', 'energy is left over and comes out as heat', 'exothermic, ΔH negative'],
                ['weaker than the old ones', 'energy must be supplied and stays in', 'endothermic, ΔH positive'],
              ]),
              p('So the answer to the hook is: a reaction is exothermic when it ends up with ', b('stronger'), ' bonds than it started with. Nothing is getting energy out of breaking bonds; the profit is in the bonds being made.'),
              callout(b('Which is why combustion releases so much. '), 'C–H and C–C bonds in a fuel are moderately strong. The C=O bonds in carbon dioxide and the O–H bonds in water are ', em('very'), ' strong. Burning is a trade of good bonds for excellent ones, and the difference comes out as heat.'),
              h4('The sign convention, and why it is that way round'),
              p('ΔH is negative for an exothermic reaction, which strikes everyone as backwards at first. The convention is from the reaction’s point of view: if the reaction gave energy away, it has less than it started with, so the change is negative.'),
              p('Energy released to you is energy lost by the system, and ΔH tracks the system.'),
              ME.sims.energyDiagram());
          },
        },
        {
          h: 'Activation energy: why a match is needed',
          body() {
            return frag(
              p('Petrol and oxygen sitting together in a car’s tank release an enormous amount of energy when they react, and they sit there for months doing nothing.'),
              p('Because before any bond can be made, some have to be broken — and that costs energy up front. The reaction has to climb before it can descend.'),
              p('The size of the climb is the ', term('activation energy', 'The energy barrier a reaction must get over before it can proceed, because bonds have to break before new ones form. It sets the rate, and has nothing to do with whether the reaction releases energy overall.'), ', and it is what a match supplies.'),
              okCallout(b('So two completely separate questions. '), b('ΔH'), ' asks whether the products are lower than the reactants — does the reaction release energy overall? ', b('Activation energy'), ' asks how big the hill in between is — how fast it goes. A reaction can be strongly exothermic with an enormous barrier, and that is exactly what petrol is.'),
              p('Drag the barrier in the diagram above without changing the products’ level and watch: the reaction becomes slower and releases exactly as much energy. The two are independent, and confusing them is the commonest mistake in the next unit as well.'),
              h4('And once it starts'),
              p('An exothermic reaction releases energy, which supplies the activation energy for the next bit. That is why a fire spreads: each patch that burns provides the energy to ignite its neighbour. One match starts a forest fire because the reaction pays for its own continuation.'),
              p('An endothermic reaction cannot do that, which is why it stops the moment you stop heating it.'));
          },
        },
        {
          h: 'Hess’s law: adding reactions up',
          body() {
            return frag(
              p('Some enthalpy changes cannot be measured. Burning carbon to carbon monoxide always makes some carbon dioxide too, so you can never get a clean number for it.'),
              p('But you can get there another way, because enthalpy depends only on where you start and where you finish — not on the route.'),
              callout(b('Which is the whole content of Hess’s law. '), 'Walking up a hill by the steep path or the gentle one, you gain the same altitude. Enthalpy is like altitude: it is a property of the state, so any route between two states involves the same change.'),
              worked('Find ΔH for C + ½ O₂ → CO, which cannot be measured directly.', [
                { q: 'What can be measured', why: 'Carbon burning all the way to CO₂ gives −393 kJ/mol, and carbon monoxide burning to CO₂ gives −283 kJ/mol. Both are clean measurements.' },
                { q: 'Set up the route', why: 'Going C → CO₂ directly is −393. Going C → CO → CO₂ must total the same, because both start at C and end at CO₂.' },
                { q: 'So', why: 'x + (−283) = −393.', maths: 'x = −393 + 283 = −110 kJ/mol' },
                { q: 'Check it is sensible', why: 'Burning carbon partway should release less than burning it fully, and −110 is indeed less than −393. Most of the energy comes out in the second step.' },
              ]),
              p('Two rules for rearranging, and both follow from the same idea:'),
              table(['If you…', 'Then ΔH…', 'Because'], [
                ['reverse a reaction', 'changes sign', 'going back down a hill loses exactly the altitude you gained'],
                ['multiply a reaction by n', 'multiplies by n', 'twice as much reacting releases twice as much energy'],
              ]),
              h4('Why this matters beyond exam questions'),
              p('It means the entire table of enthalpies in a data book can be built from a manageable number of measurements, with everything else derived. And it means you can predict the energy of a reaction nobody has ever run, which is how a process is costed before anyone builds the plant.'),
              goto('Gibbs free energy', '#/tools/gibbs', 'Which adds the other half of the story — the next lesson.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why is a combustion reaction exothermic, if breaking bonds costs energy?',
          options: [
            { t: 'Because the bonds it makes — C=O and O–H — are stronger than the ones it broke, so there is energy left over.', ok: true,
              why: 'Right. Nothing gets energy out of breaking bonds. The profit is entirely in the new bonds being better than the old ones.' },
            { t: 'Because breaking bonds releases energy.', ok: false,
              why: 'Breaking always costs. This is the misconception the whole lesson is built to dislodge.' },
            { t: 'Because oxygen is very reactive.', ok: false,
              why: 'True and not an explanation — oxygen is reactive because the bonds it forms are so strong, which is the same point.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Petrol is strongly exothermic with oxygen and sits in a tank unreacted. Why?',
          options: [
            { t: 'The activation energy is high, and that is a separate question from how much energy the reaction releases.', ok: true,
              why: 'Right — ΔH says where the products sit, activation energy says how big the hill is. Petrol is a big drop behind a big hill.' },
            { t: 'Because ΔH is actually positive.', ok: false,
              why: 'It is strongly negative. The barrier is what holds it back.' },
            { t: 'Because there is not enough oxygen in the tank.', ok: false,
              why: 'Open the cap and it still will not ignite without a spark.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What does a negative ΔH mean?',
          options: [
            { t: 'The reaction released energy — exothermic — so the system ended up with less than it started with.', ok: true,
              why: 'Right, and that is why the sign looks backwards: it is written from the system’s point of view, and the system lost energy.' },
            { t: 'The reaction absorbed energy.', ok: false,
              why: 'That is positive ΔH. The system gained, so the change is up.' },
            { t: 'The reaction is fast.', ok: false,
              why: 'Nothing to do with rate. That is activation energy, and it is independent.' },
          ] },
        { kind: 'choice', q: 'What is activation energy?',
          options: [
            { t: 'The barrier that has to be climbed first, because bonds must break before new ones form.', ok: true,
              why: 'Right, and it sets the rate rather than the energy released. A match supplies it; it does not add to the total.' },
            { t: 'The energy the reaction releases.', ok: false,
              why: 'That is ΔH. The two are genuinely independent quantities.' },
            { t: 'The energy needed to make the products.', ok: false,
              why: 'Making bonds releases energy. The barrier is about breaking them first.' },
          ] },
        { kind: 'choice', q: 'Why does one match start a forest fire?',
          options: [
            { t: 'The reaction is exothermic, so each patch that burns supplies the activation energy for its neighbour.', ok: true,
              why: 'Right — the reaction pays for its own continuation. An endothermic reaction stops the moment you stop heating it.' },
            { t: 'Because the activation energy is zero.', ok: false,
              why: 'It is not — which is why you need the match at all. Once started, the reaction supplies its own.' },
            { t: 'Because wood is unstable.', ok: false,
              why: 'Wood sits about for decades. What makes fire spread is the energy released feeding the next step.' },
          ] },
        { kind: 'choice', q: 'What does Hess’s law say?',
          options: [
            { t: 'The enthalpy change depends only on the start and end states, not the route taken.', ok: true,
              why: 'Right, like altitude gained on a hill. It is what lets you calculate enthalpies that cannot be measured directly.' },
            { t: 'Energy is always conserved.', ok: false,
              why: 'True and more general. Hess’s law is the specific consequence that the route does not matter.' },
            { t: 'Exothermic reactions are faster.', ok: false,
              why: 'Not related, and not generally true — rate comes from the barrier.' },
          ] },
        { kind: 'numeric', q: 'A reaction has ΔH = −100 kJ/mol. What is ΔH for the reverse reaction, in kJ/mol?',
          answer: 100, tol: 0.5,
          right: '+100 — reversing a reaction flips the sign, because going back down a hill loses exactly the altitude you gained.',
          wrong: 'Reversing a reaction reverses the energy flow.' },
        { kind: 'numeric', q: 'C → CO₂ is −393 kJ/mol and CO → CO₂ is −283 kJ/mol. What is ΔH for C → CO, in kJ/mol? (Give the magnitude.)',
          answer: 110, tol: 1,
          right: '−110 kJ/mol. The two routes to CO₂ must total the same, so x + (−283) = −393.',
          wrong: 'Both routes start at carbon and end at CO₂, so they must add to the same total.' },
        { kind: 'choice', q: 'Why can a reaction be strongly exothermic and still not happen at room temperature?',
          options: [
            { t: 'Because the activation barrier is too high for the available energy to get over.', ok: true,
              why: 'Right, and petrol in a tank is the everyday demonstration. Nothing about being exothermic makes a reaction go.' },
            { t: 'Because exothermic reactions are always slow.', ok: false,
              why: 'Some are explosively fast. The barrier is what decides, not the sign of ΔH.' },
            { t: 'Because it needs a catalyst by definition.', ok: false,
              why: 'A catalyst lowers the barrier, and heat can get over it instead. Neither is required by definition.' },
          ] },
        { kind: 'choice', q: 'Why is Hess’s law useful in practice, not just in exams?',
          options: [
            { t: 'It lets you predict the energy of a reaction nobody has run, which is how a process is costed before it is built.', ok: true,
              why: 'Right, and it means a whole data book can be built from a manageable number of measurements with the rest derived.' },
            { t: 'It makes reactions more efficient.', ok: false,
              why: 'It predicts rather than changes. The enthalpy is what it is.' },
            { t: 'It speeds reactions up.', ok: false,
              why: 'Nothing to do with rate.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking breaking bonds releases energy.',
          why: 'Breaking always costs and making always releases. A reaction is exothermic when the new bonds are stronger than the old ones.' },
        { wrong: 'Confusing ΔH with activation energy.',
          why: 'One is where the products sit and the other is how big the hill is. Petrol has a large drop behind a large hill, which is why it is both energetic and safe to store.' },
        { wrong: 'Getting the sign of ΔH backwards.',
          why: 'Negative means exothermic, because the system gave energy away and so has less. The convention is from the system’s point of view.' },
        { wrong: 'Forgetting to flip the sign when reversing a step in a Hess calculation.',
          why: 'Reversing a reaction reverses the energy flow. It is the single commonest slip in these calculations.' },
      ],
      recap: [
        'Breaking bonds costs energy and making them releases it, so a reaction is exothermic when the new bonds are stronger than the old.',
        'Combustion releases so much because it trades good C–H and C–C bonds for excellent C=O and O–H ones.',
        'ΔH is negative for exothermic, because the convention is written from the system’s point of view.',
        'Activation energy is the hill in between, and it is independent of ΔH — which is why petrol is both energetic and safe to store.',
        'Hess’s law: enthalpy depends on the start and end states, not the route, so unmeasurable changes can be calculated from measurable ones.',
      ],
    },

    {
      id: 'spontaneity',
      title: 'Entropy, and why some things happen anyway',
      keywords: 'entropy gibbs free energy delta G spontaneous second law thermodynamics',
      mins: 16,
      builds_on: ['enthalpy', 'dissolving'],
      hook() {
        return frag(
          p('An instant cold pack gets cold. Ice melts on a warm day by absorbing energy. Ammonium nitrate dissolving takes heat from its surroundings.'),
          p('All three absorb energy — they are uphill in enthalpy — and all three happen entirely by themselves.'),
          p('So releasing energy cannot be the only thing that makes a process go. Something else is pushing, and it is worth knowing what.'));
      },
      pages: [
        {
          h: 'The other thing that matters',
          body() {
            return frag(
              p('Shuffle a new pack of cards and it comes out disordered. Shuffle it again and it does not come back in order. Nothing forbids it — there is just one ordered arrangement and about 10⁶⁸ disordered ones, so the ordered outcome never turns up.'),
              p('That is ', term('entropy', 'A measure of how many ways the particles and their energy can be arranged. A process is favoured when it increases the number of arrangements available, because more arrangements means a more likely outcome.'), ': not "disorder" exactly, but the number of arrangements available. Processes go towards states with more arrangements, because those states are overwhelmingly more likely.'),
              table(['Entropy increases when…', 'Because'], [
                ['a solid melts, or a liquid boils', 'the particles can be in far more places and positions'],
                ['a solid dissolves', 'ions spread through the whole solution instead of sitting in a lattice'],
                ['a reaction makes more molecules than it consumed', 'more particles means more ways to arrange them'],
                ['a gas expands into a larger space', 'more room, more positions'],
                ['temperature rises', 'more energy to spread among the particles, in more ways'],
              ]),
              callout(b('And that resolves the hook. '), 'A cold pack absorbs energy, which is unfavourable. But it turns an ordered solid into ions spread through a solution, which is a large increase in arrangements. The second effect wins, so it happens — and the energy it needs is taken from your hand.'),
              p('It also explains the odd fact that the dissolving is the ', em('cause'), ' of the cooling rather than a side effect. The process is driven by entropy and pays for itself with your body heat.'));
          },
        },
        {
          h: 'Weighing the two against each other',
          body() {
            return frag(
              p('So there are two independent pushes: downhill in energy, and towards more arrangements. Gibbs free energy combines them into one number.'),
              eq('ΔG = ΔH − TΔS'),
              p('ΔH is the energy term and TΔS is the entropy term. If ΔG comes out negative, the process happens by itself — it is ', b('spontaneous'), '.'),
              table(['ΔH', 'ΔS', 'Spontaneous?'], [
                ['negative (releases energy)', 'positive (more arrangements)', 'always — both pushing the same way'],
                ['positive', 'negative', 'never — both opposing'],
                ['negative', 'negative', 'only at low temperature, where the energy term dominates'],
                ['positive', 'positive', 'only at high temperature, where T makes the entropy term dominate'],
              ]),
              okCallout(b('Look at the T. '), 'It multiplies the entropy term only, so raising the temperature always makes entropy matter more. Which is why the last two rows have a crossover temperature, at T = ΔH/ΔS — and why ice melts above 0 °C and not below. Melting is uphill in energy and up in entropy, and 0 °C is precisely where the two balance.'),
              p('That is a genuinely satisfying result: the melting point is not an arbitrary property of a substance. It is the temperature at which its ΔG for melting crosses zero.'),
              goto('The ΔG calculator', '#/tools/gibbs', 'With the crossover temperature worked out.'));
          },
        },
        {
          h: 'Spontaneous does not mean fast',
          body() {
            return frag(
              p('This distinction is worth a page on its own, because the word is badly chosen and misleads people for years.'),
              warnCallout(b('Spontaneous means it can happen without outside help. It says nothing about when. '), 'Diamond turning into graphite has a negative ΔG at room temperature and takes vastly longer than the age of the universe, because the activation barrier is enormous. Diamonds are thermodynamically doomed and kinetically immortal.'),
              table(['Question', 'Answered by', 'Which is'], [
                ['Will it go at all, left alone?', 'ΔG', 'thermodynamics'],
                ['How fast?', 'activation energy', 'kinetics — the next unit'],
              ]),
              p('Two separate sciences, two separate questions, and they genuinely do not constrain each other. A spontaneous reaction can be immeasurably slow, and a non-spontaneous one can be made to go quickly if you push it hard enough.'),
              h4('And the second law, in the version that is actually true'),
              p('The second law of thermodynamics says the entropy of the ', b('universe'), ' always increases. Not of a system — of everything.'),
              p('Which is what makes life possible. You are a highly ordered arrangement, and maintaining that order is a local decrease in entropy. It is paid for by a larger increase outside: you eat ordered food, break it down into disordered small molecules, and radiate heat into your surroundings.'),
              okCallout(b('So nothing about being alive breaks the second law. '), 'A local decrease is fine as long as the total goes up, and it does — comfortably. This is worth knowing because the claim that life violates thermodynamics gets made surprisingly often, and it rests on applying the law to a system rather than the universe.'),
              p('And it is why you have to keep eating. Maintaining order is not free, and it is not a one-off payment.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'An instant cold pack absorbs energy and still works by itself. Why?',
          options: [
            { t: 'It turns an ordered solid into ions spread through a solution, and that increase in arrangements outweighs the energy cost.', ok: true,
              why: 'Right — and the energy it needs comes from your hand, which is why it feels cold. The cooling is the cost of the process, not a side effect.' },
            { t: 'Because it is actually exothermic.', ok: false,
              why: 'It is endothermic — that is what makes it cold. Entropy is what drives it.' },
            { t: 'Because a chemical reaction pushes it.', ok: false,
              why: 'Nothing reacts; the salt dissolves. The driver is the increase in arrangements.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Why does ice melt above 0 °C and not below?',
          options: [
            { t: 'Melting is uphill in energy and up in entropy, and 0 °C is where TΔS exactly cancels ΔH.', ok: true,
              why: 'Right, and that is a lovely result: a melting point is not an arbitrary property but the temperature where ΔG for melting crosses zero.' },
            { t: 'Because 0 °C is where water’s bonds break.', ok: false,
              why: 'Hydrogen bonds break at any temperature and re-form. What changes at 0 °C is which way ΔG points.' },
            { t: 'Because the definition of melting point says so.', ok: false,
              why: 'The definition describes it; the crossover explains it.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What is entropy, put carefully?',
          options: [
            { t: 'A measure of how many arrangements the particles and their energy can take.', ok: true,
              why: 'Right — "disorder" is a rough shorthand for it. Processes go towards more arrangements because those outcomes are overwhelmingly more likely.' },
            { t: 'The amount of heat in something.', ok: false,
              why: 'That is closer to thermal energy. Entropy is about how many ways things can be arranged.' },
            { t: 'How fast a reaction goes.', ok: false, why: 'Nothing to do with rate.' },
          ] },
        { kind: 'choice', q: 'What does a negative ΔG tell you?',
          options: [
            { t: 'The process happens without outside help — but not how quickly.', ok: true,
              why: 'Right, and the second half is the part people miss. Diamond to graphite has a negative ΔG and takes longer than the universe has existed.' },
            { t: 'The reaction is fast.', ok: false,
              why: 'Rate is set by the activation barrier, which ΔG says nothing about.' },
            { t: 'The reaction is exothermic.', ok: false,
              why: 'That is ΔH. A reaction can have positive ΔH and negative ΔG if entropy is doing the work.' },
          ] },
        { kind: 'choice', q: 'Why does raising the temperature make entropy matter more?',
          options: [
            { t: 'Because the entropy term is TΔS — the temperature multiplies it, and the enthalpy term is untouched.', ok: true,
              why: 'Right, and it is why there is a crossover temperature at ΔH/ΔS for the two mixed cases.' },
            { t: 'Because hot things are more disordered.', ok: false,
              why: 'True, and the equation’s T is what does the work here: it weights the entropy term directly.' },
            { t: 'It does not — temperature affects both equally.', ok: false,
              why: 'Look at the equation: T multiplies ΔS only.' },
          ] },
        { kind: 'choice', q: 'Which of these increases entropy?',
          options: [
            { t: 'A solid dissolving into ions spread through a solution.', ok: true,
              why: 'Right — from one lattice arrangement to a vast number of positions in the solution.' },
            { t: 'A gas condensing into a liquid.', ok: false,
              why: 'That decreases it — the particles lose most of their freedom.' },
            { t: 'Two gases combining into one molecule.', ok: false,
              why: 'Fewer particles means fewer arrangements, so entropy falls.' },
          ] },
        { kind: 'choice', q: 'Diamond turning into graphite is spontaneous. Should you worry about your ring?',
          options: [
            { t: 'No — the barrier is enormous, so it takes far longer than the age of the universe.', ok: true,
              why: 'Right, and it is the best illustration of the distinction. Thermodynamically doomed, kinetically immortal.' },
            { t: 'Yes — spontaneous means it will happen soon.', ok: false,
              why: 'Spontaneous means no outside help is needed. It says nothing at all about when.' },
            { t: 'No — it is not really spontaneous.', ok: false,
              why: 'ΔG really is negative at room temperature. Graphite is the stable form.' },
          ] },
        { kind: 'choice', q: 'Does life violate the second law of thermodynamics?',
          options: [
            { t: 'No — the law applies to the universe, and your local order is paid for by a larger increase outside.', ok: true,
              why: 'Right. You eat ordered food, break it into disordered small molecules and radiate heat, and the total goes up comfortably. It is also why you have to keep eating.' },
            { t: 'Yes, and biology is an exception.', ok: false,
              why: 'There are no exceptions. The claim comes from applying the law to a system rather than to everything.' },
            { t: 'No, because living things do not have entropy.', ok: false,
              why: 'They certainly do. It is the accounting boundary that matters.' },
          ] },
        { kind: 'match', q: 'Match each question to what answers it.',
          pairs: [['Will it go at all?', 'ΔG — thermodynamics'], ['How fast will it go?', 'activation energy — kinetics'],
                  ['Does it release energy?', 'ΔH'], ['Does it spread out more?', 'ΔS']],
          right: 'Yes — four separate questions, and answering one tells you nothing about the others.',
          wrong: 'ΔG decides whether, activation energy decides how fast, and ΔH and ΔS are the two halves of ΔG.' },
        { kind: 'choice', q: 'A reaction has positive ΔH and positive ΔS. When is it spontaneous?',
          options: [
            { t: 'At high temperature, where TΔS grows large enough to beat ΔH.', ok: true,
              why: 'Right — and the crossover is at T = ΔH/ΔS. Melting and boiling are both in this category, which is why they have threshold temperatures.' },
            { t: 'At low temperature.', ok: false,
              why: 'At low temperature the entropy term is small and the positive ΔH wins, so it does not go.' },
            { t: 'Never.', ok: false,
              why: 'Raising T always helps a positive-ΔS process. Ice melting is exactly this case.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking only exothermic processes happen by themselves.',
          why: 'Ice melting, cold packs and most dissolving are endothermic and entirely spontaneous. Entropy is the other half of the answer.' },
        { wrong: 'Reading "spontaneous" as "fast".',
          why: 'It means no outside help is needed. Diamond to graphite is spontaneous and takes longer than the universe has existed.' },
        { wrong: 'Calling entropy disorder and stopping there.',
          why: 'It is the number of available arrangements. That framing explains why processes go that way — more arrangements means a more likely outcome — and "disorder" does not.' },
        { wrong: 'Applying the second law to a system instead of the universe.',
          why: 'Local order is fine as long as the total increases. Every living thing is a local decrease in entropy paid for elsewhere.' },
      ],
      recap: [
        'Two things drive a process: downhill in energy, and towards more available arrangements.',
        'Entropy counts arrangements. Processes go that way because those outcomes are overwhelmingly more likely, not because of a force.',
        'ΔG = ΔH − TΔS, and a negative ΔG means it goes by itself. T multiplies only the entropy term, which is why temperature can change the answer.',
        'A melting point is the temperature where ΔG for melting crosses zero — not an arbitrary property.',
        'Spontaneous says nothing about speed, and the second law applies to the universe, not to a system — which is why life does not violate it.',
      ],
    },

    ],
  });
})();
