/* Unit 10: Gases. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, goto } = K;

  ME.course.unit({
    n: 10, id: 'gases',
    title: 'Gases',
    blurb: 'The one state of matter that obeys a single equation almost regardless of what it is made of — and the reason why.',
    lessons: [

    {
      id: 'kinetic-theory',
      title: 'What a gas is doing, and what pressure is',
      keywords: 'kinetic molecular theory pressure absolute zero kelvin real gas ideal',
      mins: 15,
      builds_on: ['states', 'the-mole'],
      hook() {
        return frag(
          p('There is about a tonne of air pressing on your shoulders right now. You cannot feel it, because the same pressure is pushing out from inside you and the two cancel.'),
          p('Take that away — suck the air out of a sealed steel drum — and the drum crumples like paper. The pressure was always there; what changed was that nothing was pushing back.'),
          p('So what ', em('is'), ' that push? It is not the air leaning on you. It is billions of tiny collisions per second, and understanding that makes every gas law obvious rather than memorised.'));
      },
      pages: [
        {
          h: 'Pressure is collisions',
          body() {
            return frag(
              p('A gas is particles moving fast, in straight lines, in random directions, hardly ever meeting each other — because in a gas the particles are separated by something like ten times their own diameter, so most of the volume is empty space.'),
              p('When one hits a wall it bounces off, and bouncing means a push. One collision is nothing. A great many collisions per second, over the whole wall, adds up to a steady force, and force spread over area is ', term('pressure', 'Force per unit area. In a gas it is produced by particles colliding with the walls — many small impacts averaging out into a steady push.'), '.'),
              eq('pressure = force ÷ area'),
              callout(b('And that is the sentence to hold on to. '), 'Pressure goes up if the collisions become more frequent, or harder, or both. Every gas law in the next lesson is one of those two things changing, which is why there is really only one idea here and not four.'),
              h4('Which explains the crumpling drum'),
              p('Air pressure at sea level is about 101 kPa — roughly 10 tonnes on every square metre. A sealed drum normally has that pushing in from outside and the same pushing out from inside, and the two cancel exactly.'),
              p('Pump the inside out and the outside push has nothing opposing it. Nothing was added; the balance was removed.'),
              ME.sims.statesOfMatter({ start: 95 }),
              p('Turn the temperature right up and watch how far apart the particles get and how rarely they meet each other. That emptiness is why gases compress and solids do not.'));
          },
        },
        {
          h: 'Temperature is average kinetic energy',
          body() {
            return frag(
              p('Temperature seems like a separate idea from motion until you look at what it actually measures: the ', b('average kinetic energy'), ' of the particles.'),
              p('Not the speed — the energy, which is ½ mv² and so depends on mass as well. That distinction turns out to matter a great deal.'),
              okCallout(b('At the same temperature, all gases have the same average kinetic energy. '), 'So a heavy molecule must be moving more slowly than a light one to have the same energy. At room temperature a hydrogen molecule averages about 1,900 m/s and a sulfur hexafluoride molecule about 225 m/s — both at the same temperature, both with the same average energy.'),
              p('This explains a fact that looks impossible at first: a mole of hydrogen and a mole of SF₆, which is seventy times heavier, take up exactly the same volume at the same pressure and temperature. The heavy one hits the wall less often and harder; the light one hits more often and softer; and the two effects cancel exactly.'),
              h4('And why kelvin is not optional'),
              p('If temperature measures average kinetic energy, then zero temperature ought to mean zero energy — no motion at all. That point is ', b('absolute zero'), ', −273.15 °C, and it is the coldest anything can get, because you cannot have less motion than none.'),
              warnCallout(b('Which is why every gas calculation uses kelvin. '), 'Celsius puts its zero at the freezing point of water, which is an arbitrary place with nothing physical about it. Doubling a temperature from 10 °C to 20 °C does not double the energy — it goes from 283 K to 293 K, a rise of 3.5 %. Using Celsius in a gas law gives an answer that is not slightly wrong but nonsense, and at 0 °C you would be dividing by zero.'),
              eq('K = °C + 273.15'),
              goto('The full gas simulator', '#/gas', 'Particles, a piston, wall-hit flashes, and PV = nRT computed live in whatever units you pick.'));
          },
        },
        {
          h: 'The assumptions, said out loud',
          body() {
            return frag(
              p('The picture above is called the ', term('kinetic molecular theory', 'The model of a gas as many small particles in constant random motion, with negligible volume and no forces between them except during collisions.'), ', and it makes four assumptions. Naming them is worth doing, because knowing where a model is lying tells you when it will fail.'),
              table(['Assumption', 'How true it is'], [
                ['Particles have negligible volume', 'Nearly true at ordinary pressure, because a gas is mostly empty space. Squeeze it hard and the particles’ own volume stops being negligible.'],
                ['No forces between particles except in collisions', 'A decent approximation, and not exact — the same attractions that condense a gas into a liquid are always there, just usually overwhelmed by the motion.'],
                ['Collisions lose no energy', 'Genuinely true. If they were not, a sealed gas would gradually cool by itself, and it does not.'],
                ['Average kinetic energy depends only on temperature', 'True, and it is the assumption that does the most work — it is why gases behave the same regardless of what they are.'],
              ]),
              p('A gas that obeyed all four perfectly would be an ', term('ideal gas', 'A gas that exactly obeys PV = nRT. Real gases approximate it well at ordinary temperatures and pressures, and depart from it when compressed or cooled towards condensing.'), '. Real gases behave almost ideally at ordinary temperatures and pressures, which is why one simple equation works so well.'),
              p('They stop behaving ideally in exactly the two places you would predict from the list: at ', b('high pressure'), ', where the particles’ own volume matters, and at ', b('low temperature'), ', where the attractions between them stop being negligible. Both are the conditions under which a gas is about to become a liquid — which is the clue that the assumptions are what is failing.'),
              callout(b('This is what a good model looks like. '), 'Not "always right", but "right under stated conditions, wrong in predictable ways outside them". The simulator has a real-gas comparison you can switch on to see the size of the error.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'What actually causes gas pressure?',
          options: [
            { t: 'Particles colliding with the walls — many small impacts averaging into a steady push.', ok: true,
              why: 'Right, and holding it that way makes the gas laws obvious: pressure rises if the collisions get more frequent or harder, and there is nothing else it can be.' },
            { t: 'The weight of the gas pressing down.', ok: false,
              why: 'Gas pressure pushes equally in every direction, including upwards, which weight cannot do. It is collisions.' },
            { t: 'Particles pushing each other apart.', ok: false,
              why: 'In a gas the particles hardly interact at all — they are about ten diameters apart. What matters is their collisions with the walls.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Why must gas calculations use kelvin?',
          options: [
            { t: 'Because temperature measures average kinetic energy, and only the kelvin scale has its zero where the energy is zero.', ok: true,
              why: 'Right. The laws say volume is proportional to temperature, and a proportionality is meaningless on a scale whose zero is arbitrary — at 0 °C you would be dividing by zero.' },
            { t: 'Because kelvin is the SI unit and it is convention.', ok: false,
              why: 'It is the SI unit, and the reason here is physical rather than conventional: the proportionality only holds from absolute zero.' },
            { t: 'Because kelvin values are larger and easier to work with.', ok: false,
              why: 'Size has nothing to do with it. Where the zero sits is everything.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'Why does a sealed drum crumple when you pump the air out?',
          options: [
            { t: 'The outside air was always pushing in; what changed is that nothing is pushing back.', ok: true,
              why: 'Right — about 10 tonnes per square metre, permanently. Nothing was added. Removing the balance was enough.' },
            { t: 'The vacuum pulls the walls inwards.', ok: false,
              why: 'A vacuum is nothing, and nothing cannot pull. The push is all from outside.' },
            { t: 'The metal contracts.', ok: false,
              why: 'The metal is unchanged. It is the pressure difference that folds it.' },
          ] },
        { kind: 'choice', q: 'What does temperature measure?',
          options: [
            { t: 'The average kinetic energy of the particles.', ok: true,
              why: 'Right — energy rather than speed, which is why a heavy molecule at the same temperature moves more slowly.' },
            { t: 'The average speed of the particles.', ok: false,
              why: 'Close and importantly different. Energy is ½ mv², so a heavy molecule at the same temperature moves slower — which is exactly why all gases behave alike.' },
            { t: 'How much heat a substance contains.', ok: false,
              why: 'A swimming pool at 20 °C contains far more heat than a cup at 80 °C. Temperature is the average per particle, not the total.' },
          ] },
        { kind: 'choice', q: 'A mole of hydrogen and a mole of SF₆ are at the same pressure and temperature. Which takes up more volume?',
          options: [
            { t: 'Neither — exactly the same volume, despite SF₆ being 70 times heavier.', ok: true,
              why: 'Right, and the reason is the cancellation: the heavy molecule hits less often but harder, the light one more often but softer, and the two effects exactly balance.' },
            { t: 'Hydrogen, because it is lighter.', ok: false,
              why: 'Volume at a given pressure and temperature depends on the number of particles, not their mass. This is Avogadro’s law.' },
            { t: 'SF₆, because its molecules are bigger.', ok: false,
              why: 'The molecules’ own size is negligible — a gas is almost entirely empty space.' },
          ] },
        { kind: 'numeric', q: 'Convert 25 °C to kelvin.', answer: 298.15, tol: 0.2,
          right: '298.15 K — add 273.15. This is close enough to room temperature that 298 K turns up constantly.',
          wrong: 'Add 273.15 to the Celsius value.' },
        { kind: 'choice', q: 'Under what conditions does a real gas stop behaving ideally?',
          options: [
            { t: 'High pressure and low temperature — the two conditions under which it is about to condense.', ok: true,
              why: 'Right, and it follows straight from the assumptions: pressure makes the particles’ own volume matter, and cold makes the attractions between them matter.' },
            { t: 'High temperature and low pressure.', ok: false,
              why: 'Those are the conditions where it behaves most ideally — fast-moving and far apart.' },
            { t: 'Only for heavy gases.', ok: false,
              why: 'Every gas departs from ideal under the right conditions, including helium.' },
          ] },
        { kind: 'choice', q: 'Which kinetic-theory assumption does high pressure break?',
          options: [
            { t: 'That the particles’ own volume is negligible.', ok: true,
              why: 'Right — squeeze hard enough and the space the particles themselves occupy becomes a real fraction of the container, so the gas resists more than the ideal law predicts.' },
            { t: 'That collisions lose no energy.', ok: false,
              why: 'That one is genuinely true at all pressures — otherwise a sealed gas would cool by itself.' },
            { t: 'That the particles move randomly.', ok: false,
              why: 'Random motion survives compression perfectly well.' },
          ] },
        { kind: 'choice', q: 'At room temperature a hydrogen molecule averages about 1,900 m/s. Why so fast?',
          options: [
            { t: 'It is very light, so it needs a high speed to have the same average kinetic energy as anything else at that temperature.', ok: true,
              why: 'Right. Energy is ½ mv², so a small m needs a large v. It is also why hydrogen leaks through everything and escapes from the atmosphere altogether.' },
            { t: 'Because hydrogen is a very hot gas.', ok: false,
              why: 'It is at the same temperature as everything else in the room. Its speed comes from its mass.' },
            { t: 'Because hydrogen molecules repel each other strongly.', ok: false,
              why: 'They barely interact. The speed is set by mass and temperature alone.' },
          ] },
      ],
      practice: 'unit-conversion',
      mistakes: [
        { wrong: 'Thinking a vacuum pulls.',
          why: 'Nothing cannot pull. The push is always from the side that has gas, and removing the opposing push is what crumples the drum.' },
        { wrong: 'Confusing temperature with total heat.',
          why: 'Temperature is the average energy per particle. A swimming pool at 20 °C holds far more energy than a cup of tea at 80 °C.' },
        { wrong: 'Using Celsius in a gas law.',
          why: 'The laws are proportionalities from absolute zero. Using Celsius gives nonsense, and at 0 °C you are dividing by zero.' },
        { wrong: 'Expecting heavier gases to occupy more volume.',
          why: 'Volume depends on the number of particles. The heavy molecule moves slower, which exactly cancels its extra mass.' },
      ],
      recap: [
        'A gas is fast particles in mostly empty space, and pressure is their collisions with the walls averaged into a steady push.',
        'Pressure rises only if collisions become more frequent or harder — which is every gas law, stated once.',
        'Temperature measures average kinetic energy, so a heavy molecule at the same temperature moves more slowly, and all gases behave alike.',
        'Kelvin is required because the laws are proportionalities from absolute zero, where the motion really is zero.',
        'Kinetic theory’s assumptions fail at high pressure and low temperature — exactly where a gas is about to condense.',
      ],
    },

    {
      id: 'gas-laws',
      title: 'The gas laws are one law',
      mins: 16,
      builds_on: ['kinetic-theory'],
      hook() {
        return frag(
          p('Four laws with four names, four formulas and four people to remember: Boyle, Charles, Gay-Lussac, Avogadro.'),
          p('They are the same statement. Each one takes the single relationship between pressure, volume, temperature and amount, pins two of the four still, and reports what the other two do.'),
          p('Learn the one relationship and the four names become descriptions rather than facts.'));
      },
      pages: [
        {
          h: 'One relationship, four views',
          body() {
            return frag(
              p('Pressure, volume, temperature and amount are tied together. Change one and something else must move — and which one moves depends entirely on what you hold still.'),
              table(['Law', 'Held still', 'Relationship', 'In words'], [
                ['Boyle', 'T and n', 'P₁V₁ = P₂V₂', 'squeeze it and the pressure rises in exact proportion'],
                ['Charles', 'P and n', 'V₁/T₁ = V₂/T₂', 'heat it freely and it expands in proportion to the kelvin temperature'],
                ['Gay-Lussac', 'V and n', 'P₁/T₁ = P₂/T₂', 'heat it in a rigid box and the pressure climbs instead'],
                ['Avogadro', 'P and T', 'V₁/n₁ = V₂/n₂', 'twice as much gas takes twice the space, whatever the gas is'],
              ]),
              p('Notice that Charles and Gay-Lussac are the same experiment with the escape route open or closed. Heat a gas and the collisions get harder; if the container can grow, it grows, and if it cannot, the pressure goes up. One idea, two outcomes.'),
              callout(b('And the direction is always predictable from collisions. '), 'Squeezing means less distance between wall hits, so more hits per second, so more pressure. Heating means faster particles, so harder and more frequent hits. You never need to remember which way a law goes — you can reason it out from the picture in the last lesson.'),
              p('Pick a law below and drag its one free variable. The graph is the point: whether the line passes through the origin tells you whether the relationship is proportional or inverse.'),
              ME.sims.gasLaw({ law: 'boyle' }));
          },
        },
        {
          h: 'Using them, and the one trap',
          body() {
            return frag(
              p('The arithmetic is the easy part. You rearrange, substitute and solve.'),
              worked('A 2.0 L balloon at 1.0 atm is squeezed to 0.5 L at constant temperature. What is the pressure?', [
                { q: 'Which law?', why: 'Temperature and amount are constant and pressure and volume are changing, so Boyle.' },
                { q: 'Substitute', why: 'P₁V₁ = P₂V₂, so 1.0 × 2.0 = P₂ × 0.5.', maths: 'P₂ = 2.0 / 0.5 = 4.0 atm' },
                { q: 'Sanity check', why: 'The volume went down by a factor of four, so the pressure must go up by a factor of four. If your answer had gone down, you had the relationship upside down.' },
              ]),
              worked('A gas occupies 3.0 L at 27 °C. What volume at 127 °C, at constant pressure?', [
                { q: 'Convert to kelvin first', why: 'Before anything else, because this is where the mistakes live.', maths: '27 °C = 300.15 K,  127 °C = 400.15 K' },
                { q: 'Charles: V₁/T₁ = V₂/T₂', why: 'So V₂ = V₁ × T₂/T₁.', maths: '3.0 × 400.15/300.15 = 4.00 L' },
                { q: 'And see what Celsius would have done', why: 'Using 27 and 127 directly gives 3.0 × 127/27 = 14.1 L — wrong by a factor of three and a half. The ratio of Celsius temperatures is not the ratio of anything physical.' },
              ]),
              warnCallout(b('That second worked example is the whole trap. '), 'A Celsius ratio looks like a temperature ratio and is not. 127 °C is not four and a bit times hotter than 27 °C in any sense that matters — it is 400 K against 300 K, a third more. Converting to kelvin is the first line of every gas calculation, before you decide anything else.'),
              h4('And the combined law'),
              p('If more than one thing changes, you do not need a new law — just keep the whole ratio constant.'),
              eq('P1V1 / (n1 T1) = P2V2 / (n2 T2)'),
              p('Every one of the four named laws is this with two of the terms cancelling because they did not change. Which is a much smaller thing to remember than five formulas.'),
              goto('Gas law calculator', '#/tools/gas-laws', 'Any variable, any units, with every conversion shown.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Charles’s law and Gay-Lussac’s law describe what difference?',
          options: [
            { t: 'The same heating, with the container free to expand or held rigid.', ok: true,
              why: 'Right. Heat a gas and the hits get harder; if the box can grow it grows, and if it cannot the pressure rises instead. One idea, two outcomes.' },
            { t: 'Different gases.', ok: false,
              why: 'Both apply to any gas. What differs is what is held still.' },
            { t: 'Heating versus cooling.', ok: false,
              why: 'Both work in both directions. The difference is whether the volume is free to change.' },
          ] },
        { kind: 'numeric', after: 1,
          q: 'A gas at 2.0 atm in 6.0 L is compressed to 2.0 L at constant temperature. What is the new pressure, in atm?',
          answer: 6, tol: 0.05,
          right: '6.0 atm. The volume fell to a third, so the pressure tripled — and checking the direction that way catches an upside-down rearrangement instantly.',
          wrong: 'P₁V₁ = P₂V₂. And check the direction: a smaller volume must mean a higher pressure.' },
      ],
      quizzes: [
        { kind: 'match', q: 'Match each law to what it holds still.',
          pairs: [['Boyle', 'temperature and amount'], ['Charles', 'pressure and amount'],
                  ['Gay-Lussac', 'volume and amount'], ['Avogadro', 'pressure and temperature']],
          right: 'Yes. Each law pins two of the four variables and reports what the other two do.',
          wrong: 'Each law leaves two variables free. Boyle varies P and V, Charles V and T, Gay-Lussac P and T, Avogadro V and n.' },
        { kind: 'choice', q: 'Why does squeezing a gas raise its pressure?',
          options: [
            { t: 'The particles have less distance to travel between wall hits, so the hits come more often.', ok: true,
              why: 'Right — and nothing about the particles changed. They are moving exactly as fast; the wall is simply closer.' },
            { t: 'The particles speed up.', ok: false,
              why: 'At constant temperature they do not. Only the frequency of hits changes.' },
            { t: 'The particles get hotter.', ok: false,
              why: 'Not at constant temperature. Compressing a gas quickly does heat it, which is a different experiment — Boyle’s law assumes the temperature is held.' },
          ] },
        { kind: 'choice', q: 'A gas goes from 27 °C to 127 °C. By what factor does its volume grow at constant pressure?',
          options: [
            { t: 'About 1.33 — 300 K to 400 K.', ok: true,
              why: 'Right. The kelvin ratio is what counts, and it is only a third more rather than the four-and-a-bit that Celsius suggests.' },
            { t: 'About 4.7 — 127 divided by 27.', ok: false,
              why: 'That is the Celsius ratio, and it corresponds to nothing physical. This is the single commonest error in the topic.' },
            { t: 'It does not change.', ok: false,
              why: 'At constant pressure a gas expands when heated — which is Charles’s law.' },
          ] },
        { kind: 'choice', q: 'Why does an aerosol can say "do not incinerate"?',
          options: [
            { t: 'Gay-Lussac: the volume cannot change, so heating turns entirely into pressure until the can fails.', ok: true,
              why: 'Right — rigid container, no escape route, so all the extra collision energy becomes pressure.' },
            { t: 'The contents are flammable.', ok: false,
              why: 'Often true and not the reason for that particular warning. An empty steel can with any gas in it would still burst.' },
            { t: 'The metal melts.', ok: false,
              why: 'The can bursts long before steel or aluminium gets anywhere near melting.' },
          ] },
        { kind: 'numeric', q: 'A gas occupies 5.0 L at 300 K. What volume at 600 K, at constant pressure?', answer: 10, tol: 0.1,
          right: '10 L — double the kelvin temperature, double the volume. This is the case where the Celsius trap is invisible, because the kelvin values are clean.',
          wrong: 'V₁/T₁ = V₂/T₂. Both temperatures are already in kelvin.' },
        { kind: 'choice', q: 'What is the combined gas law good for?',
          options: [
            { t: 'Cases where more than one variable changes — and it contains all four named laws as special cases.', ok: true,
              why: 'Right, and it is the better thing to remember. Each named law is the combined law with two terms cancelling because they did not change.' },
            { t: 'Only for gases that behave ideally.', ok: false,
              why: 'True of all of them — the named laws assume ideality just as much.' },
            { t: 'It replaces PV = nRT.', ok: false,
              why: 'It is PV = nRT applied twice, with R cancelling. PV = nRT is the more general statement.' },
          ] },
        { kind: 'choice', q: 'Avogadro’s law says equal volumes of any gas contain equal numbers of particles. What is startling about that?',
          options: [
            { t: 'That it does not depend on what the gas is — hydrogen and SF₆ behave identically.', ok: true,
              why: 'Right, and it follows from temperature being average kinetic energy: the heavy molecule moves slower by exactly enough to cancel its mass.' },
            { t: 'That it only works for light gases.', ok: false,
              why: 'It works for all of them, which is exactly the surprising part.' },
            { t: 'That volume depends on temperature.', ok: false,
              why: 'It does, and Avogadro’s law holds temperature still. The surprise is the independence from the gas’s identity.' },
          ] },
      ],
      practice: 'gas-law',
      mistakes: [
        { wrong: 'Using Celsius.',
          why: 'The laws are proportionalities from absolute zero. 127 °C over 27 °C is 4.7 and 400 K over 300 K is 1.33, and only the second means anything.' },
        { wrong: 'Memorising four laws as four separate facts.',
          why: 'They are one relationship with two variables pinned. Reason the direction out from collisions instead — smaller box means more frequent hits means more pressure.' },
        { wrong: 'Not checking the direction of the answer.',
          why: 'Cut the volume to a quarter and the pressure must quadruple. If your answer moved the other way, the rearrangement was upside down, and the check takes two seconds.' },
        { wrong: 'Forgetting that Boyle’s law assumes constant temperature.',
          why: 'Compressing a gas quickly does heat it — which is why a bicycle pump gets warm. That is a different experiment from the one Boyle’s law describes.' },
      ],
      recap: [
        'One relationship ties P, V, T and n. Each named law pins two of them and reports the other two.',
        'Charles and Gay-Lussac are the same heating with the container free or rigid.',
        'You never need to remember a direction: squeezing means more frequent hits, heating means harder ones.',
        'Convert to kelvin on the first line, every time. A Celsius ratio corresponds to nothing physical.',
        'The combined law covers all four, because each is the combined law with two terms cancelling.',
      ],
    },

    {
      id: 'ideal-gas',
      title: 'PV = nRT, and gases in reactions',
      keywords: 'ideal gas law gas constant R molar volume STP partial pressure dalton gas stoichiometry density',
      mins: 17,
      builds_on: ['gas-laws', 'stoichiometry'],
      hook() {
        return frag(
          p('The combined law compares a gas with itself before and after. But often there is no "before" — you have one gas, in one state, and you want to know how much of it there is.'),
          p('One equation covers that, and it covers all four named laws at the same time. It is the single most used equation in chemistry after the definition of the mole.'));
      },
      pages: [
        {
          h: 'The equation, and where R comes from',
          body() {
            return frag(
              eq('P V = n R T'),
              p('Pressure times volume equals moles times the gas constant times temperature. Know any three and the fourth follows, with no before-and-after needed.'),
              p('The interesting part is ', b('R'), ', which is not a fudge factor. Since 2019 both Avogadro’s number and the Boltzmann constant are exact by definition, and R is simply their product:'),
              eq('R = NA × kB = 8.31446261815324 J/(mol K)'),
              callout(b('Which is why this app computes R rather than storing it. '), 'It multiplies two defined constants together and then converts into whatever units you are using. A looked-up decimal could be stale or rounded; a product of two exact definitions cannot be.'),
              h4('And why R has so many values'),
              p('It does not — there is one R, expressed in different units. Which value you need depends on what units P and V are in.'),
              table(['If pressure is in…', 'and volume in…', 'R is'], [
                ['atm', 'L', '0.08206 L atm / (mol K)'],
                ['kPa', 'L', '8.314 L kPa / (mol K)'],
                ['Pa', 'm³', '8.314 J / (mol K)'],
                ['mmHg', 'L', '62.36 L mmHg / (mol K)'],
              ]),
              p('Every row is the same physical constant. Mixing up which one you need is a common error and a completely avoidable one — write the units into the calculation and they will tell you.'),
              warnCallout(b('Temperature is always kelvin, in every row. '), 'There is no version of R that takes Celsius, and there never could be, for the reason the last lesson gave.'));
          },
        },
        {
          h: 'Molar volume, and gas stoichiometry',
          body() {
            return frag(
              p('Put one mole at 0 °C and 1 atm into the equation and you get a number worth knowing.'),
              eq('V = nRT/P = (1)(0.08206)(273.15)/(1) = 22.4 L'),
              p('One mole of ', em('any'), ' gas occupies 22.4 L at 0 °C and 1 atm — conditions called ', b('STP'), '. That is a cube about 28 cm on a side, and it holds 6 × 10²³ molecules.'),
              okCallout(b('Which turns gas stoichiometry into ordinary stoichiometry. '), 'Unit 9’s four stations were grams, moles, moles, grams. For a gas, the outer steps use the molar volume or PV = nRT instead of the molar mass — and the middle step, the mole ratio, is completely unchanged. You have not learned a new method; you have swapped the currency at the ends.'),
              worked('What volume of CO₂ at STP comes from burning 32 g of methane?', [
                { q: 'Grams to moles', why: 'Methane is 16.04 g/mol.', maths: '32 / 16.04 = 2.00 mol CH₄' },
                { q: 'Mole ratio', why: 'CH₄ + 2 O₂ → CO₂ + 2 H₂O gives one CO₂ per methane.', maths: '2.00 mol CO₂' },
                { q: 'Moles to volume', why: 'At STP, one mole is 22.4 L — and this is the only step that differs from Unit 9.', maths: '2.00 × 22.4 = 44.8 L' },
              ]),
              p('If the conditions are not STP, use PV = nRT for that last step instead. Same shape, one extra substitution.'),
              h4('And it gives you gas densities'),
              p('Rearranging PV = nRT with n = mass / molar mass gives the density of any gas:'),
              eq('density = (molar mass × P) / (R T)'),
              p('So at a given pressure and temperature, a gas’s density is proportional to its molar mass. Which explains why helium balloons rise (4 g/mol against air’s 29), why carbon dioxide pools in the bottom of a cellar (44 g/mol), and why a gas leak of something heavy is dangerous at floor level rather than ceiling level.'),
              goto('Everything at once', '#/gas', 'Set any three variables and the simulator recomputes the fourth, with the conversions shown.'));
          },
        },
        {
          h: 'Mixtures: partial pressures',
          body() {
            return frag(
              p('Air is not one gas. It is about 78 % nitrogen, 21 % oxygen and 1 % argon, and each of those contributes its own share of the pressure.'),
              p('Because the particles barely interact, each gas behaves as if the others were not there. So the total pressure is simply the sum of what each would exert alone — its ', term('partial pressure', 'The pressure one gas in a mixture would exert if it occupied the container alone. The total pressure is the sum of the partial pressures.'), '.'),
              eq('P_total = P1 + P2 + P3 + ...'),
              p('And each gas’s share is just its fraction of the molecules. At sea level, where the total is about 101 kPa, oxygen’s partial pressure is about 21 kPa.'),
              h4('Which is what altitude sickness actually is'),
              p('At 5,500 m the air is still 21 % oxygen — the proportions do not change with height. What changes is the total pressure, which has halved. So oxygen’s partial pressure is about 10 kPa instead of 21.'),
              p('And your lungs do not respond to percentages. Oxygen crosses into your blood because of a pressure difference, so halving its partial pressure halves the driving force, whatever the percentage says.'),
              callout(b('This is why a diver’s problem is the mirror image. '), 'At 40 m down the total pressure is five times sea level, so ordinary air gives a nitrogen partial pressure five times normal — and nitrogen that would be harmless at the surface starts dissolving into tissue and causing real trouble. Same gas, same percentage, different partial pressure.'),
              p('So partial pressure, not percentage, is the thing that matters biologically. It is a good example of a simple idea — each gas acts as if alone — with consequences that are not at all obvious until you have it.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'numeric', after: 1,
          q: 'How many moles of gas occupy 44.8 L at STP?',
          answer: 2, tol: 0.05,
          right: 'Two — 22.4 L per mole at STP, whatever the gas is.',
          wrong: 'One mole is 22.4 L at STP.' },
        { kind: 'choice', after: 2,
          q: 'At 5,500 m the air is still 21 % oxygen. Why is breathing hard?',
          options: [
            { t: 'The total pressure has halved, so oxygen’s partial pressure has halved — and that pressure is what drives it into your blood.', ok: true,
              why: 'Right, and it is the key point: percentages are not what your lungs respond to. The driving force is a pressure difference.' },
            { t: 'There is less oxygen as a percentage.', ok: false,
              why: 'The proportions barely change with altitude. It is the total pressure that falls.' },
            { t: 'The air is colder.', ok: false,
              why: 'It is, and that is not why breathing is hard. Warm the air and the partial pressure is unchanged.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What is R in PV = nRT?',
          options: [
            { t: 'The product of Avogadro’s number and the Boltzmann constant, both exact by definition.', ok: true,
              why: 'Right, which is why the app computes it rather than storing a decimal. It is 8.31446261815324 J/(mol K) exactly, and then converted into whatever units are in use.' },
            { t: 'An experimentally measured fudge factor.', ok: false,
              why: 'It was measured historically, and since 2019 it is exact by definition — the product of two defined constants.' },
            { t: 'A different constant for each gas.', ok: false,
              why: 'The same for every gas, which is the whole point of the ideal gas law.' },
          ] },
        { kind: 'numeric', q: 'What volume does 3.0 mol of any gas occupy at STP, in litres?', answer: 67.2, tol: 0.3,
          right: '67.2 L — three times 22.4. And it does not matter which gas.',
          wrong: 'One mole is 22.4 L at STP.' },
        { kind: 'choice', q: 'Why does R have several different numerical values?',
          options: [
            { t: 'It does not — there is one constant, expressed in different units depending on what P and V are measured in.', ok: true,
              why: 'Right. Write the units into the calculation and they tell you which form you need, which makes this a completely avoidable error.' },
            { t: 'Because different gases need different values.', ok: false,
              why: 'Every gas uses the same R. That independence is what "ideal" means.' },
            { t: 'Because it changes with temperature.', ok: false,
              why: 'It is a constant. Temperature is the T in the equation, not something hidden in R.' },
          ] },
        { kind: 'choice', q: 'Why does carbon dioxide pool at the bottom of a cellar?',
          options: [
            { t: 'Gas density is proportional to molar mass, and CO₂ at 44 g/mol is much denser than air at 29.', ok: true,
              why: 'Right, and it comes straight from rearranging PV = nRT. It is why a CO₂ leak is dangerous at floor level and a helium leak is not.' },
            { t: 'Because it is a toxic gas.', ok: false,
              why: 'It suffocates by displacing oxygen rather than by poisoning, and either way that does not explain why it sinks.' },
            { t: 'Because it is cold.', ok: false,
              why: 'It sinks at any temperature, because of its molar mass.' },
          ] },
        { kind: 'numeric', q: 'Air is about 21 % oxygen. At a total pressure of 100 kPa, what is oxygen’s partial pressure, in kPa?',
          answer: 21, tol: 0.5,
          right: '21 kPa — each gas’s share of the pressure is its share of the molecules.',
          wrong: 'Multiply the total pressure by the fraction of molecules that are oxygen.' },
        { kind: 'choice', q: 'How does gas stoichiometry differ from ordinary stoichiometry?',
          options: [
            { t: 'Only at the ends — the outer conversions use molar volume or PV = nRT instead of molar mass. The mole ratio is unchanged.', ok: true,
              why: 'Right, and that is worth noticing: you are not learning a new method, only swapping the currency at the ends of the same four stations.' },
            { t: 'It needs a completely different approach.', ok: false,
              why: 'The middle step, which is the chemistry, is identical. Only the unit conversions change.' },
            { t: 'The mole ratio has to be adjusted for volume.', ok: false,
              why: 'The mole ratio comes from the coefficients and never changes.' },
          ] },
        { kind: 'choice', q: 'Why does a diver breathing ordinary air at 40 m get into trouble with nitrogen?',
          options: [
            { t: 'The total pressure is about five times sea level, so nitrogen’s partial pressure is five times normal and it starts dissolving into tissue.', ok: true,
              why: 'Right — the mirror image of altitude sickness. Same gas, same percentage, and the partial pressure is what matters.' },
            { t: 'The air mixture is different underwater.', ok: false,
              why: 'It is the same air. The pressure it is delivered at is what changes.' },
            { t: 'Nitrogen becomes toxic when cold.', ok: false,
              why: 'Temperature is not the mechanism. Pressure driving it into solution is.' },
          ] },
        { kind: 'choice', q: 'One mole of gas occupies 22.4 L at STP. Does that depend on which gas?',
          options: [
            { t: 'No — any gas, because PV = nRT contains nothing about the gas’s identity.', ok: true,
              why: 'Right, and that is the most remarkable thing about the equation: it works for helium and for sulfur hexafluoride identically.' },
            { t: 'Yes — heavier gases take more space.', ok: false,
              why: 'Mass does not appear in PV = nRT. Only the number of particles matters.' },
            { t: 'Yes — it depends on the molecule’s size.', ok: false,
              why: 'The molecules’ own volume is negligible. A gas is almost entirely empty space.' },
          ] },
      ],
      practice: ['gas-law', 'unit-conversion'],
      mistakes: [
        { wrong: 'Using the wrong form of R.',
          why: 'There is one R in several units. Write the units into the calculation and they tell you which you need.' },
        { wrong: 'Using 22.4 L/mol away from STP.',
          why: 'It is the answer to PV = nRT at 0 °C and 1 atm specifically. At other conditions, solve the equation instead.' },
        { wrong: 'Thinking altitude sickness is about the percentage of oxygen.',
          why: 'The percentage barely changes. The total pressure halves, so oxygen’s partial pressure halves, and partial pressure is the driving force.' },
        { wrong: 'Treating gas stoichiometry as a separate topic.',
          why: 'Same four stations, same mole ratio. Only the conversions at the ends change.' },
      ],
      recap: [
        'PV = nRT handles one gas in one state, with no before-and-after needed, and contains all four named laws.',
        'R is Avogadro’s number times the Boltzmann constant, both exact by definition — so it is computed, not looked up.',
        'One mole of any gas is 22.4 L at STP, which makes gas stoichiometry the same four stations with a different conversion at the ends.',
        'Gas density is proportional to molar mass, which is why helium rises and carbon dioxide pools on the floor.',
        'In a mixture each gas acts as if alone, so partial pressures add — and partial pressure, not percentage, is what matters at altitude and underwater.',
      ],
    },

    ],
  });
})();
