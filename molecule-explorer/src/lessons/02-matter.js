/* Unit 2: Matter and its states. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, eq, table, worked, figure, strip, goto } = K;
  const el = ME.el;

  ME.course.unit({
    n: 2, id: 'matter',
    title: 'Matter and its states',
    blurb: 'What counts as a substance, what counts as a change, and why a solid is a solid — all of which comes down to how fast the particles are moving.',
    lessons: [

    {
      id: 'what-matter-is',
      title: 'What matter is, and the particle idea',
      mins: 14,
      builds_on: ['what-chemistry-is'],
      hook() {
        return frag(
          p('Blow up a balloon. It gets bigger, and it gets heavier — by about a fifth of a gram, which a good balance can detect.'),
          p('That is worth pausing on. Air feels like nothing. You cannot see it, and you walk through it all day without noticing. But it has mass, it takes up room, and you can weigh it.'),
          p('Anything with mass that takes up room is ', b('matter'), ', and the whole of chemistry is about matter. So the first job is to be clear about what that actually means.'));
      },
      pages: [
        {
          h: 'Mass and volume, not weight and size',
          body() {
            return frag(
              p('Matter has two defining properties: it has ', b('mass'), ', and it occupies ', b('volume'), '.'),
              p('Mass is how much stuff there is. It does not change if you take it to the Moon. ', term('Weight', 'The force gravity pulls on something with. Weight depends on where you are; mass does not.'), ' does — weight is the pull of gravity on that mass, and the Moon pulls about a sixth as hard. In everyday speech the two words are swapped freely, and in chemistry they are not the same thing.'),
              p('Volume is how much room it takes up. For a liquid you read it off a measuring cylinder; for a regular solid you multiply its sides; for an awkwardly shaped solid you drop it in water and see how much the water rises.'),
              callout(b('Light is not matter. '), 'Nor is heat, or sound, or a magnetic field. They are all real, they all carry energy, and none of them has mass or occupies volume. Chemistry is about the stuff, not about everything that exists.'));
          },
        },
        {
          h: 'Everything is particles, and there is space between them',
          body() {
            return frag(
              p('The single most useful idea in this course is that matter is made of tiny separate particles with nothing in between them.'),
              p('It sounds like a detail. It is not — it explains a whole shelf of otherwise unrelated facts at once.'),
              table(['Something you already know', 'The particle explanation'], [
                ['A gas can be squashed into a smaller cylinder; a liquid cannot.',
                 'In a gas the particles are far apart, so there is plenty of empty space to squeeze out. In a liquid they are already touching.'],
                ['A drop of ink spreads through a glass of water on its own.',
                 'The particles are moving constantly and randomly, so they wander through the gaps until they are spread evenly. Nobody stirred it.'],
                ['You can smell dinner from another room.',
                 'Particles have broken away from the food and travelled through the gaps between the air particles.'],
                ['Mix 50 mL of water and 50 mL of alcohol and you get about 97 mL, not 100.',
                 'The particles are different sizes and pack into each other’s gaps. There was space in there to lose.'],
              ], 'Four unrelated observations, one idea.'),
              p('That last one is worth dwelling on. It is genuinely strange until you accept that liquids have gaps in them, and then it is obvious.'));
          },
        },
        {
          h: 'How small, actually',
          body() {
            return frag(
              p('Numbers this extreme stop meaning anything, so here they are with something to compare them to.'),
              p('A single water molecule is about 0.3 nanometres across — that is 3 × 10⁻¹⁰ m. A glass of water holds roughly 10²⁵ of them.'),
              callout('If you could count water molecules at one per second, counting the ones in a single drop would take about a million times the age of the universe.'),
              p('This is the reason for the mole, which Unit 9 is entirely about. Particles are so absurdly numerous that counting them individually is not merely impractical, it is impossible — so chemists count them by weighing instead.'),
              p('It is also why chemistry works at all. Any measurement you make is an average over an unimaginable number of particles, so the randomness cancels out completely and the behaviour is utterly reliable. A single particle is unpredictable; 10²³ of them are not.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'Mix 50 mL of water with 50 mL of ethanol and you get about 97 mL. Why?',
          options: [
            { t: 'The particles are different sizes and pack into each other’s gaps, so some empty space is lost.', ok: true,
              why: 'Yes. Liquids have gaps between their particles, and two different liquids can interlock better than either does with itself. Nothing was destroyed — the mass is exactly 100 g worth.' },
            { t: 'Some of the alcohol evaporates.', ok: false,
              why: 'A little would over time, but the volume shrinks immediately on mixing. And you can do it in a sealed container and get the same result.' },
            { t: 'Some of the water turns into alcohol.', ok: false,
              why: 'No reaction happens — this is a physical change. Both substances are still there, just packed more efficiently.' },
          ] },
      ],
      quizzes: [
        { kind: 'sort', q: 'Sort these into matter and not-matter.',
          categories: ['Matter', 'Not matter'],
          items: [
            { t: 'Air', cat: 'Matter' }, { t: 'Water vapour', cat: 'Matter' },
            { t: 'A helium balloon', cat: 'Matter' }, { t: 'Light', cat: 'Not matter' },
            { t: 'Heat', cat: 'Not matter' }, { t: 'Sound', cat: 'Not matter' },
          ],
          right: 'Yes. The test is mass and volume. Air has both; light has neither, however real it is.',
          wrong: 'Ask whether it has mass and takes up room.' },
        { kind: 'choice', q: 'What is the difference between mass and weight?',
          options: [
            { t: 'Mass is how much stuff there is; weight is the force gravity pulls on it with.', ok: true,
              why: 'Right. Take a kilogram to the Moon and it is still a kilogram of stuff, but it weighs about a sixth as much.' },
            { t: 'They are the same thing measured in different units.', ok: false,
              why: 'They are different quantities. Mass is in kilograms, weight is a force and is in newtons.' },
            { t: 'Weight is for solids and mass is for liquids.', ok: false, why: 'Both apply to everything with mass.' },
          ] },
        { kind: 'choice', q: 'A gas can be compressed into a much smaller volume. A liquid can barely be compressed at all. Why?',
          options: [
            { t: 'In a gas the particles are far apart with space to lose; in a liquid they are already touching.', ok: true,
              why: 'Exactly. Compressing something means removing empty space, and a liquid has hardly any to remove.' },
            { t: 'Gas particles are smaller than liquid particles.', ok: false,
              why: 'They are the same particles — steam and water are both H₂O. What differs is the spacing.' },
            { t: 'Gas particles are softer.', ok: false,
              why: 'Particles do not squash. The gas squashes because the gaps close up.' },
          ] },
        { kind: 'numeric', q: 'A water molecule is about 3 × 10⁻¹⁰ m across. How many would you need in a line to span 1 mm? Give it in scientific notation.', answer: 3.33e6, tol: 0.05,
          right: 'About 3.3 × 10⁶ — three million of them to cross a millimetre.',
          wrong: 'Divide 1 mm (which is 10⁻³ m) by the size of one molecule.' },
        { kind: 'choice', q: 'Why does chemistry give reliable results even though individual particles move randomly?',
          options: [
            { t: 'Because any measurement averages over an enormous number of them, so the randomness cancels.', ok: true,
              why: 'Right, and it is a deep point. Nobody can say what one molecule will do; nobody needs to, because you are always looking at 10²³ of them at once.' },
            { t: 'Because the particles are not really random.', ok: false,
              why: 'They genuinely are. Randomness at the small scale plus vast numbers gives certainty at the large scale.' },
            { t: 'Because laboratory equipment is very precise.', ok: false,
              why: 'It helps, but the reliability comes from the averaging, not the instruments.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Air is not really anything.',
          why: 'A cubic metre of air weighs about 1.2 kg. You do not notice it because you are floating in it, in the same way a fish does not notice water.' },
        { wrong: 'Using mass and weight interchangeably.',
          why: 'They are different quantities in different units. In chemistry you almost always mean mass — and bathroom scales, despite the name, actually report a mass.' },
        { wrong: 'Thinking the particles in a liquid are packed solid with no gaps.',
          why: 'They are touching but not neatly stacked, and the gaps are real — which is why 50 mL plus 50 mL can come to 97.' },
      ],
      recap: [
        'Matter is anything with mass that takes up room. Light, heat and sound are real and are not matter.',
        'Mass is how much stuff; weight is gravity’s pull on it. Chemistry cares about mass.',
        'Everything is made of tiny separate moving particles with space between them, and that one idea explains compression, diffusion, smell and shrinking volumes on mixing.',
        'The particles are unimaginably small and numerous, which is why chemists count them by weighing, and why measurements on them are so reliable.',
      ],
    },

    {
      id: 'pure-and-mixtures',
      title: 'Pure substances and mixtures',
      mins: 15,
      builds_on: ['what-matter-is'],
      hook() {
        return frag(
          p('A bottle of water says "pure". So does a bag of sugar, and a bottle of olive oil labelled "100% pure".'),
          p('Only one of those is pure in the chemical sense, and it is not the water — tap water and bottled water are both mixtures. Olive oil is a mixture of dozens of different molecules.'),
          p('Chemistry uses "pure" to mean ', b('one single substance and nothing else'), ', which is much stricter than the label on a bottle. The distinction matters because pure substances behave predictably and mixtures do not.'));
      },
      pages: [
        {
          h: 'The family tree',
          body() {
            return frag(
              p('All matter splits two ways, and then each half splits again.'),
              table(['Category', 'What it is', 'Examples'], [
                ['Element', 'One kind of atom only. Cannot be split chemically.', 'copper, oxygen, helium, carbon'],
                ['Compound', 'Two or more elements chemically joined, in a fixed ratio.', 'water, salt, sugar, carbon dioxide'],
                ['Homogeneous mixture', 'Several substances mixed so evenly you cannot see the difference. Also called a solution.', 'salt water, air, brass, vinegar'],
                ['Heterogeneous mixture', 'Several substances you can see are separate.', 'sand in water, salad, granite, oil and water'],
              ]),
              p('The first two are ', b('pure substances'), ': one thing, all the way through, with a definite composition. The last two are mixtures.'),
              h4('The test that actually distinguishes them'),
              p('A compound and a mixture can look identical. The difference is what happens when you try to separate them.'),
              p('You can separate a ', b('mixture'), ' by physical means — filtering, evaporating, distilling, using a magnet. No chemistry needed. Salt water boils down to salt and water.'),
              p('You cannot separate a ', b('compound'), ' that way, no matter how hard you try. Water does not filter into hydrogen and oxygen. Splitting it takes a chemical reaction, in this case electricity.'),
              callout(b('And the ratio. '), 'A compound has a fixed ratio, always. Water is always exactly two hydrogens to one oxygen. A mixture can be any ratio you like — salt water can be barely salty or nearly saturated, and it is still salt water.'));
          },
        },
        {
          h: 'Alloys, air and other surprises',
          body() {
            return frag(
              p('Some everyday things are filed less obviously than you would guess.'),
              table(['Substance', 'Which category', 'Why it surprises people'], [
                ['Air', 'homogeneous mixture', 'Mostly nitrogen and oxygen in no fixed ratio. It is not a compound, and its composition varies with altitude and weather.'],
                ['Brass', 'homogeneous mixture', 'Copper and zinc melted together. An alloy is a mixture, which is exactly why you can vary the recipe to change the properties.'],
                ['Steel', 'homogeneous mixture', 'Iron with a little carbon. Change the carbon from 0.2% to 1% and you go from soft to brittle.'],
                ['Sugar', 'compound', 'A single molecule, C₁₂H₂₂O₁₁, always in exactly that ratio.'],
                ['Tap water', 'homogeneous mixture', 'Water plus dissolved minerals and chlorine. Distil it and you get the pure compound.'],
                ['Granite', 'heterogeneous mixture', 'You can see the different crystals with the naked eye — that is what the speckles are.'],
                ['Milk', 'heterogeneous mixture', 'It looks uniform, but it is fat droplets suspended in water. Leave it long enough and it separates.'],
              ]),
              p('Alloys being mixtures is the useful one. It is why there is no single "steel" but hundreds of them — if steel were a compound, its recipe would be fixed and you could not engineer it.'));
          },
        },
        {
          h: 'Separating a mixture',
          body() {
            return frag(
              p('Since a mixture is held together by nothing but proximity, every separation method is really about finding one property the components differ in and exploiting it.'),
              table(['Method', 'Exploits a difference in', 'Used for'], [
                ['Filtering', 'particle size', 'sand out of water'],
                ['Evaporating', 'boiling point — one leaves, one does not', 'getting salt back from salt water'],
                ['Distilling', 'boiling point — collecting the vapour', 'separating alcohol from water, or purifying seawater'],
                ['Chromatography', 'how strongly each sticks to a surface', 'separating the dyes in a felt pen'],
                ['Using a magnet', 'magnetism', 'iron filings out of sand'],
                ['Centrifuging', 'density', 'separating blood cells from plasma'],
              ], 'Every one of these is a physical process. None of them breaks a chemical bond.'),
              callout('That is the practical payoff of the distinction. If you can separate it without chemistry, it was a mixture. If you cannot, it was a compound — and you will need a reaction.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'What is the surest way to tell a compound from a mixture?',
          options: [
            { t: 'Try to separate it physically. A mixture will separate; a compound will not.', ok: true,
              why: 'Yes. Filtering, evaporating or distilling will pull a mixture apart because nothing is chemically joined. A compound needs a reaction, which is a much bigger intervention.' },
            { t: 'Look at it — a mixture looks uneven.', ok: false,
              why: 'Sometimes, but salt water and brass look perfectly uniform and are mixtures. Appearance is not reliable.' },
            { t: 'Check whether it contains more than one element.', ok: false,
              why: 'Water contains two elements and is a compound. It is the joining and the fixed ratio that matter, not the number of elements.' },
          ] },
      ],
      quizzes: [
        { kind: 'sort', q: 'Sort each one into what it is.',
          categories: ['Element', 'Compound', 'Mixture'],
          items: [
            { t: 'Copper', cat: 'Element' }, { t: 'Helium', cat: 'Element' },
            { t: 'Water', cat: 'Compound' }, { t: 'Table salt', cat: 'Compound' },
            { t: 'Air', cat: 'Mixture' }, { t: 'Brass', cat: 'Mixture' },
            { t: 'Seawater', cat: 'Mixture' }, { t: 'Carbon dioxide', cat: 'Compound' },
          ],
          right: 'Yes. Brass is the one that catches people — an alloy is a mixture, which is why the recipe can be varied.',
          wrong: 'One kind of atom is an element. Elements chemically joined in a fixed ratio is a compound. Anything else is a mixture.' },
        { kind: 'choice', q: 'Why is there no single "steel" but hundreds of different steels?',
          options: [
            { t: 'Because steel is a mixture, so the ratio of iron to carbon can be varied.', ok: true,
              why: 'Right, and that variability is the entire point — it lets you tune hardness, springiness and rust resistance. A compound could not be tuned like that, because its ratio is fixed.' },
            { t: 'Because different factories make it differently by mistake.', ok: false,
              why: 'The variation is deliberate and controlled. It is possible because steel is a mixture.' },
            { t: 'Because steel is a compound with several forms.', ok: false,
              why: 'A compound has one fixed composition. Steel does not, which is what makes it a mixture.' },
          ] },
        { kind: 'match', q: 'Match each separation method to the difference it exploits.',
          pairs: [['Filtering', 'particle size'], ['Distilling', 'boiling point'],
                  ['Using a magnet', 'magnetism'], ['Centrifuging', 'density']],
          right: 'Yes. Every separation method is about finding one property the components differ in.',
          wrong: 'Ask what physical property the method is actually testing.' },
        { kind: 'choice', q: 'Salt water is 3% salt. Another sample is 5% salt. Are they the same substance?',
          options: [
            { t: 'They are both salt water, because a mixture has no fixed ratio.', ok: true,
              why: 'Right. Varying the ratio is exactly what a mixture allows — and it is why "salt water" is not a chemical formula.' },
            { t: 'No, they are different compounds.', ok: false,
              why: 'Neither is a compound. If salt water were a compound, only one ratio would be possible.' },
            { t: 'Only if they have the same density.', ok: false,
              why: 'They will not have the same density, and it does not matter — both are salt water.' },
          ] },
        { kind: 'choice', q: 'Water is always exactly two hydrogens to one oxygen. What does that tell you?',
          options: [
            { t: 'It is a compound — a fixed ratio is the signature.', ok: true,
              why: 'Yes. You never find water that is 2.1 hydrogens to one oxygen. That impossibility is a compound’s defining feature, and it was one of the original clues that atoms exist.' },
            { t: 'It is a mixture with a favoured ratio.', ok: false,
              why: 'Mixtures have no favoured ratio. The fixedness is what rules a mixture out.' },
            { t: 'It is an element.', ok: false, why: 'Two different kinds of atom, so not an element.' },
          ] },
        { kind: 'choice', q: 'Milk looks completely uniform. Why is it a heterogeneous mixture?',
          options: [
            { t: 'Because it is fat droplets suspended in water, which will separate given time.', ok: true,
              why: 'Right — the droplets are just too small to see individually. Left standing, cream rises, which is the giveaway.' },
            { t: 'Because it contains several compounds.', ok: false,
              why: 'So does air, and air is homogeneous. The question is whether the components are in genuinely separate regions.' },
            { t: 'Because it goes off.', ok: false, why: 'That is a chemical change, and unrelated to the classification.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking "pure" on a label means chemically pure.',
          why: 'Pure orange juice is a mixture of hundreds of substances. In chemistry pure means one single substance, which almost nothing in a supermarket is.' },
        { wrong: 'Calling an alloy a compound.',
          why: 'Alloys are mixtures, with no fixed ratio — which is why brass, bronze and steel come in adjustable recipes.' },
        { wrong: 'Assuming anything that looks uniform is a pure substance.',
          why: 'Salt water, air and brass all look perfectly uniform. Looking is not the test; trying to separate it is.' },
      ],
      recap: [
        'Pure substances are elements and compounds. Everything else is a mixture.',
        'A compound has a fixed ratio and needs a chemical reaction to take apart. A mixture has any ratio and comes apart physically.',
        'Homogeneous mixtures look uniform; heterogeneous ones do not. Air and brass are homogeneous mixtures; granite and milk are heterogeneous.',
        'Every separation method exploits one physical property the components differ in — size, boiling point, density, magnetism.',
      ],
    },

    {
      id: 'physical-chemical',
      title: 'Physical and chemical change',
      mins: 15,
      builds_on: ['pure-and-mixtures'],
      hook() {
        return frag(
          p('Tear a piece of paper in half. Now burn one of the halves.'),
          p('Both are changes, and you can undo neither with sticky tape and good intentions. But one of them is fundamentally recoverable and the other is not, and the difference is not about how hard it would be.'),
          p('The torn paper is still paper — the same molecules, in two pieces. The burnt paper is not paper at all any more; it is carbon dioxide, water vapour and ash, and the paper molecules no longer exist.'));
      },
      pages: [
        {
          h: 'The dividing line',
          body() {
            return frag(
              p('A ', b('physical change'), ' alters the form of a substance and not its identity. The same molecules are there afterwards.'),
              p('A ', b('chemical change'), ' turns one substance into a different one. The atoms are rearranged into new molecules, so what you have at the end is genuinely not what you started with.'),
              table(['Change', 'Which', 'What happened to the molecules'], [
                ['Ice melting', 'physical', 'Still H₂O. They have only moved further apart and started sliding.'],
                ['Water boiling', 'physical', 'Still H₂O. Steam is water, just spread out.'],
                ['Sugar dissolving', 'physical', 'Still sugar molecules, now surrounded by water. Boil it off and the sugar comes back.'],
                ['Paper tearing', 'physical', 'Same molecules, fewer held together.'],
                ['Iron rusting', 'chemical', 'Iron and oxygen atoms have joined into a new compound. There is no iron left in the rust.'],
                ['Wood burning', 'chemical', 'Molecules broken up and recombined with oxygen into CO₂ and water.'],
                ['Baking a cake', 'chemical', 'New molecules formed, which is why you cannot get the batter back.'],
                ['Digesting food', 'chemical', 'Large molecules broken into smaller ones your cells can use.'],
              ]),
              callout(b('Melting and boiling are physical, which surprises people. '), 'A change of state is dramatic to watch and completely superficial chemically — nothing about the molecule changes at all. Steam, water and ice are the same substance with different amounts of energy.'));
          },
        },
        {
          h: 'How to tell, in practice',
          body() {
            return frag(
              p('There are signs that a chemical change has happened. None is conclusive on its own, and together they are usually decisive.'),
              table(['Sign', 'Why it suggests chemistry', 'But careful'], [
                ['A colour change', 'New substances usually absorb light differently.', 'Mixing two coloured liquids changes the colour and is physical.'],
                ['A gas produced', 'A new substance in a new state.', 'Boiling makes a gas and is physical.'],
                ['A solid appearing from two clear liquids', 'Something new was formed — a precipitate.', 'Fairly reliable, this one.'],
                ['Heat given out or taken in', 'Bonds broke and formed, and that always moves energy.', 'Dissolving also moves heat and is physical.'],
                ['Light or a smell appearing', 'A new substance.', 'Quite reliable.'],
                ['It cannot easily be reversed', 'New substances do not spontaneously un-form.', 'Some chemical changes reverse easily; some physical ones are awkward.'],
              ]),
              h4('The question that actually settles it'),
              p(b('Is there a new substance here?'), ' Not "does it look different", not "was it hard to do" — is the stuff at the end chemically different stuff? If yes, chemical. If the same molecules are present in a new arrangement or a new state, physical.'));
          },
        },
        {
          h: 'Properties, and which ones you can safely measure',
          body() {
            return frag(
              p('There is a matching distinction for properties, and it has a practical sting in it.'),
              p('A ', b('physical property'), ' can be measured without changing what the substance is: colour, melting point, density, hardness, how well it conducts, whether it dissolves.'),
              p('A ', b('chemical property'), ' describes how it reacts — flammability, whether it rusts, whether it fizzes in acid. You can only measure one by destroying some of your sample.'),
              callout(b('That is the sting. '), 'To find out whether something is flammable, you have to set it on fire, and then you no longer have it. Chemical properties always cost you the sample; physical ones do not.'),
              h4('Intensive and extensive'),
              p('One more split, and it earns its keep in the density lesson. An ', b('extensive'), ' property depends on how much you have: mass, volume, length. An ', b('intensive'), ' property does not: density, colour, melting point, temperature.'),
              p('Intensive properties are the useful ones for identifying something, because they are the same for a speck and for a tonne. A block of aluminium and an aluminium foil scrap have wildly different masses and exactly the same density — which is why density identifies a metal and mass does not.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Ice melting is a physical change. Why, when it looks so dramatic?',
          options: [
            { t: 'Because it is still H₂O afterwards — the molecules have only moved apart.', ok: true,
              why: 'Exactly. How dramatic a change looks has nothing to do with whether it is chemical. The test is whether there is a new substance, and melting produces none.' },
            { t: 'Because it can be reversed by freezing.', ok: false,
              why: 'True and not the reason. Some chemical changes reverse easily too. The reason is that the substance is unchanged.' },
            { t: 'Because no energy is involved.', ok: false,
              why: 'Melting takes a lot of energy — 334 joules per gram. Energy moving does not make a change chemical.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'Why is density more useful than mass for identifying an unknown metal?',
          options: [
            { t: 'Because density is intensive — it is the same whatever size the sample is.', ok: true,
              why: 'Right. Every piece of aluminium has a density of 2.7 g/cm³, from a foil scrap to a ship’s hull. Mass tells you only how big your piece happens to be.' },
            { t: 'Because density is easier to measure.', ok: false,
              why: 'It is harder — you need both mass and volume. It is worth the extra work because it identifies the substance.' },
            { t: 'Because mass changes over time.', ok: false, why: 'It does not. The problem is that mass depends on how much you have.' },
          ] },
      ],
      quizzes: [
        { kind: 'sort', q: 'Sort these changes.',
          categories: ['Physical change', 'Chemical change'],
          items: [
            { t: 'Ice melting', cat: 'Physical change' }, { t: 'Sugar dissolving', cat: 'Physical change' },
            { t: 'Water boiling', cat: 'Physical change' }, { t: 'Cutting paper', cat: 'Physical change' },
            { t: 'Iron rusting', cat: 'Chemical change' }, { t: 'Wood burning', cat: 'Chemical change' },
            { t: 'Milk souring', cat: 'Chemical change' }, { t: 'Baking bread', cat: 'Chemical change' },
          ],
          right: 'Yes. The changes of state are the ones worth getting right — they look the most dramatic and are the most superficial.',
          wrong: 'Ask only one question: is there a new substance at the end?' },
        { kind: 'sort', q: 'Sort these properties.',
          categories: ['Physical property', 'Chemical property'],
          items: [
            { t: 'Melting point', cat: 'Physical property' }, { t: 'Density', cat: 'Physical property' },
            { t: 'Colour', cat: 'Physical property' }, { t: 'Conducts electricity', cat: 'Physical property' },
            { t: 'Flammable', cat: 'Chemical property' }, { t: 'Rusts in damp air', cat: 'Chemical property' },
            { t: 'Fizzes with acid', cat: 'Chemical property' },
          ],
          right: 'Yes. And notice you can measure every one in the left column without destroying anything, and none in the right.',
          wrong: 'Can you measure it and still have the substance afterwards?' },
        { kind: 'choice', q: 'Two clear liquids are mixed and a white solid appears. Physical or chemical?',
          options: [
            { t: 'Chemical — a new, insoluble substance has formed.', ok: true,
              why: 'Right. A precipitate appearing from two clear solutions is one of the most reliable signs, because there is something present that was not there before.' },
            { t: 'Physical — nothing was heated.', ok: false,
              why: 'Heat has nothing to do with it. Plenty of chemical changes happen at room temperature the instant you mix things.' },
            { t: 'Physical — the solid was dissolved in one of them.', ok: false,
              why: 'Then it would have stayed dissolved. A solid forming on mixing means a new compound that does not dissolve.' },
          ] },
        { kind: 'choice', q: 'Why can you only measure a chemical property by using up some of your sample?',
          options: [
            { t: 'Because a chemical property is about what it turns into, so finding out means turning it into that.', ok: true,
              why: 'Exactly. "Is it flammable" can only be answered by burning some. The measurement and the destruction are the same event.' },
            { t: 'Because chemical properties need special equipment.', ok: false,
              why: 'Not necessarily — a match will do. The issue is that the test consumes the sample.' },
            { t: 'Because chemical properties are less accurate.', ok: false,
              why: 'Accuracy is not the issue. The issue is that you cannot test one without changing the substance.' },
          ] },
        { kind: 'choice', q: 'Is dissolving salt in water physical or chemical?',
          options: [
            { t: 'Physical — boil the water off and the salt comes back unchanged.', ok: true,
              why: 'Right, and that recovery is the proof. The sodium and chloride ions were pulled apart and surrounded by water, but no new substance was made. (Unit 11 looks at what "pulled apart" means here.)' },
            { t: 'Chemical — the salt disappears.', ok: false,
              why: 'It does not disappear, it disperses. The mass is unchanged and you can get every grain back.' },
            { t: 'Chemical — the solution conducts electricity and the solid did not.', ok: false,
              why: 'A fair observation and it is still physical, because no new substance formed. The conduction is the ions being free to move, not evidence of a reaction.' },
          ] },
        { kind: 'sort', q: 'Sort these into intensive and extensive.',
          categories: ['Intensive — independent of amount', 'Extensive — depends on amount'],
          items: [
            { t: 'Density', cat: 'Intensive — independent of amount' },
            { t: 'Melting point', cat: 'Intensive — independent of amount' },
            { t: 'Temperature', cat: 'Intensive — independent of amount' },
            { t: 'Mass', cat: 'Extensive — depends on amount' },
            { t: 'Volume', cat: 'Extensive — depends on amount' },
          ],
          right: 'Yes. Intensive properties identify a substance; extensive ones only tell you how much of it you have.',
          wrong: 'Ask whether cutting the sample in half would change the number.' },
      ],
      mistakes: [
        { wrong: 'Thinking melting and boiling are chemical changes.',
          why: 'They are the most visually dramatic physical changes there are. The molecule is untouched — steam, water and ice are all H₂O.' },
        { wrong: 'Using "irreversible" as the test.',
          why: 'Tearing paper is irreversible and physical. Melting iron is reversible and physical. Some chemical changes reverse easily. The only reliable test is whether there is a new substance.' },
        { wrong: 'Thinking dissolving is chemical because the solid vanishes.',
          why: 'It has dispersed, not reacted. Evaporate the water and every gram comes back.' },
      ],
      recap: [
        'Physical change alters form, not identity — the same molecules are there afterwards. Chemical change makes new substances.',
        'Melting, boiling, dissolving and tearing are all physical, however dramatic they look.',
        'Colour changes, gases, precipitates, heat and light suggest chemistry, but the question that settles it is simply: is there a new substance here?',
        'Physical properties can be measured without destroying the sample; chemical ones cannot.',
        'Intensive properties (density, melting point) identify a substance. Extensive ones (mass, volume) only say how much you have.',
      ],
    },

    {
      id: 'states',
      title: 'Solid, liquid, gas — and why',
      mins: 16,
      builds_on: ['what-matter-is'],
      hook() {
        return frag(
          p('Water can be a rock-hard solid, a liquid you can swim in, or an invisible gas. Same molecule every time, doing nothing different chemically.'),
          p('So what actually changes? Only one thing: ', b('how much energy the particles have'), ', and therefore how fast they are moving and whether they can escape each other.'),
          p('Drag the slider below and watch the same particles behave as all three states.'));
      },
      pages: [
        {
          h: 'Three states, one variable',
          body() {
            return frag(
              ME.sims.statesOfMatter({ start: 90 }),
              p('There is a tug of war in every substance. The particles attract each other, which pulls them together. Their motion tries to scatter them. Temperature decides which wins.'),
              table(['State', 'Who is winning', 'What you observe'], [
                ['Solid', 'attraction wins easily', 'Particles are locked in a fixed arrangement and can only vibrate. Fixed shape, fixed volume, cannot be compressed.'],
                ['Liquid', 'roughly a draw', 'Particles can slide past each other but not escape. Fixed volume, takes the shape of its container, barely compressible.'],
                ['Gas', 'motion wins easily', 'Particles fly apart and mostly ignore each other. Fills its container, easily compressed.'],
              ]),
              callout(b('So the states are not three kinds of substance. '), 'They are three outcomes of one competition, and which one you get depends on the temperature and on how strongly that particular substance’s particles attract each other.'));
          },
        },
        {
          h: 'Which is why different substances melt at different temperatures',
          body() {
            return frag(
              p('If states come from a tug of war, then a substance whose particles attract each other strongly will need more heat to break them apart — and so will melt and boil at a higher temperature.'),
              table(['Substance', 'Melts at', 'Boils at', 'What that says'], [
                ['Helium', '−272 °C', '−269 °C', 'Almost no attraction at all. It is a gas everywhere except within four degrees of absolute zero.'],
                ['Water', '0 °C', '100 °C', 'Unusually strong attraction for such a small molecule. Unit 6 explains why, and it is the reason there is liquid water on this planet.'],
                ['Table salt', '801 °C', '1413 °C', 'Full electrical charges pulling on each other — far stronger than anything between molecules.'],
                ['Iron', '1538 °C', '2862 °C', 'Metal atoms sharing a sea of electrons, which grips hard.'],
                ['Diamond', 'about 3550 °C', '—', 'Every atom covalently bonded to four others in one continuous network. To melt it you have to break actual chemical bonds.'],
              ], 'The melting point is a direct readout of how strongly the particles hold on to each other.'),
              p('So the state something is in at room temperature is not an intrinsic fact about it. It is a statement about how its attraction compares with the energy available at 20 °C.'),
              goto('Open the Elements tab', '#/elements', 'Every element has its real melting and boiling point there, from PubChem. Compare a few across a row and down a column.'));
          },
        },
        {
          h: 'And plasma, which is a fourth one',
          body() {
            return frag(
              p('Heat a gas far enough and something new happens: the collisions get violent enough to knock electrons off the atoms altogether. What you have then is a mixture of free electrons and positive ions, and it is called a ', term('plasma', 'A gas hot enough that its atoms have been stripped of electrons, so it is a mixture of ions and free electrons. It conducts electricity and responds to magnetic fields.'), '.'),
              p('It behaves quite differently from a gas: it conducts electricity, it glows, and magnets push it around. A fluorescent tube, a lightning bolt, a welding arc and the entire Sun are plasma.'),
              callout(b('Most of the visible universe is plasma, '), 'by a wide margin — stars are made of it. The three states you meet at home are the unusual case, and they are unusual because Earth is extremely cold by cosmic standards.'),
              p('There is a fifth state too, the Bose-Einstein condensate, which exists a hair above absolute zero and does genuinely strange things. It has no bearing on any chemistry you will meet, and it is a good thing to know exists.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'What is actually different between ice, water and steam?',
          options: [
            { t: 'How much energy the particles have, and so whether attraction or motion is winning.', ok: true,
              why: 'Exactly. Same molecules, same chemistry, different energy. Everything else about the three states follows from that one difference.' },
            { t: 'The molecules are a different shape in each.', ok: false,
              why: 'The H₂O molecule is identical in all three. Only the spacing and motion change.' },
            { t: 'Steam contains more oxygen.', ok: false,
              why: 'It does not — steam is H₂O. You may be thinking of the bubbles in boiling water, which are water vapour, not air.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Salt melts at 801 °C and water at 0 °C. What does that tell you?',
          options: [
            { t: 'The particles in salt attract each other far more strongly than those in water.', ok: true,
              why: 'Right, and that is the whole reading of a melting point. Salt is held by full electrical charges; water by a weaker attraction between neutral molecules.' },
            { t: 'Salt particles are heavier.', ok: false,
              why: 'They are, and that is not the reason — mercury atoms are far heavier than water molecules and mercury is liquid at room temperature. Strength of attraction is what matters.' },
            { t: 'Salt is a bigger molecule.', ok: false,
              why: 'Salt is not made of molecules at all — it is a lattice of ions, which is precisely why it grips so hard.' },
          ] },
      ],
      quizzes: [
        { kind: 'match', q: 'Match each state to what it does.',
          pairs: [['Solid', 'fixed shape and fixed volume'],
                  ['Liquid', 'fixed volume, takes the container’s shape'],
                  ['Gas', 'fills the container completely'],
                  ['Plasma', 'conducts electricity and glows']],
          right: 'Yes. And all four differences come from how much energy the particles have.',
          wrong: 'Think about whether the particles can slide, escape, or have lost electrons.' },
        { kind: 'choice', q: 'Why can a gas be compressed but not a liquid?',
          options: [
            { t: 'Because a gas is mostly empty space and a liquid is not.', ok: true,
              why: 'Right. Compressing means removing empty space. In air at room pressure the particles occupy about a thousandth of the volume; in water they are touching.' },
            { t: 'Because gas particles are springy.', ok: false, why: 'Particles do not squash. The gaps close.' },
            { t: 'Because gases are lighter.', ok: false, why: 'Mass has nothing to do with it — spacing does.' },
          ] },
        { kind: 'order', q: 'Order these by how much energy the particles have, least first.',
          items: ['Solid', 'Liquid', 'Gas', 'Plasma'],
          right: 'Yes — and each boundary is where the next thing becomes possible: sliding, escaping, then losing electrons.',
          wrong: 'Think about what each state can do that the one before it cannot.' },
        { kind: 'choice', q: 'Helium is a gas down to −269 °C. What does that say about helium atoms?',
          options: [
            { t: 'They barely attract each other at all.', ok: true,
              why: 'Right. Helium has a full outer shell and no charge and no lopsidedness, so there is almost nothing for a neighbour to hold on to. It takes four degrees above absolute zero before the attraction can win.' },
            { t: 'They are very light.', ok: false,
              why: 'They are, and hydrogen is lighter yet boils 16 degrees higher. Attraction, not mass, sets the boiling point.' },
            { t: 'They move unusually fast.', ok: false,
              why: 'At a given temperature they do move fast, being light. But the boiling point is about how hard they hold on, not how fast they go.' },
          ] },
        { kind: 'choice', q: 'Most of the visible matter in the universe is plasma. Why do we hardly ever meet it?',
          options: [
            { t: 'Because plasma needs to be extremely hot, and Earth is cold by cosmic standards.', ok: true,
              why: 'Right. Stars are plasma; planets are the cold leftovers. The three familiar states are the local oddity.' },
            { t: 'Because plasma is rare.', ok: false,
              why: 'It is the commonest state of visible matter by a wide margin. It is rare on Earth, which is not the same thing.' },
            { t: 'Because it is invisible.', ok: false, why: 'Plasma glows — that is what a neon sign and a lightning bolt are.' },
          ] },
        { kind: 'choice', q: 'Iron is solid at room temperature and mercury is liquid, and both are metals. What does that tell you?',
          options: [
            { t: 'The attraction between mercury atoms is much weaker than between iron atoms.', ok: true,
              why: 'Yes — mercury’s metallic bonding is unusually feeble, which is the whole reason it is the one liquid metal at room temperature. It has nothing to do with mercury being heavy; it is heavier than iron.' },
            { t: 'Mercury is not really a metal.', ok: false,
              why: 'It is — it conducts, it is shiny, it forms metallic bonds. Just weakly.' },
            { t: 'Mercury atoms are smaller.', ok: false, why: 'They are considerably bigger. Strength of attraction is the deciding factor.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking the bubbles in boiling water are air.',
          why: 'They are water vapour — water that has turned to gas. Dissolved air does come out when you first heat water, in much smaller bubbles, well before boiling.' },
        { wrong: 'Thinking a heavier substance must melt at a higher temperature.',
          why: 'Mercury is heavier than iron and melts at −39 °C. The melting point measures how strongly the particles attract, not how much they weigh.' },
        { wrong: 'Treating the state as a property of the substance itself.',
          why: 'Being a gas is not a fact about oxygen; it is a fact about oxygen at 20 °C. At −200 °C oxygen is a pale blue liquid.' },
      ],
      recap: [
        'The three familiar states are three outcomes of one competition: attraction between particles against their motion.',
        'Temperature decides which wins, so a change of state is a change in energy and nothing else — the molecule is untouched.',
        'A melting point is a direct readout of how strongly a substance’s particles hold on to each other, which is why they range from −272 °C to 3550 °C.',
        'Plasma is a fourth state, hot enough to strip electrons off the atoms, and it is most of the visible universe.',
      ],
    },

    {
      id: 'phase-changes',
      title: 'Phase changes, and why the temperature stops',
      mins: 18,
      builds_on: ['states'],
      hook() {
        return frag(
          p('Put a pan of ice water on a hob with a thermometer in it and turn the heat on. The thermometer reads 0 °C.'),
          p('Wait. It still reads 0 °C. Wait longer. Still 0 °C — and the hob has been pouring energy in the whole time.'),
          p('Then the last of the ice goes, and the temperature immediately starts climbing. So where did all that energy go while the thermometer was stuck? It did not vanish, and it did not warm anything up.'));
      },
      pages: [
        {
          h: 'The names, and the two that get forgotten',
          body() {
            return frag(
              p('Six transitions, and four of them have familiar names.'),
              table(['From', 'To', 'Called', 'Everyday example'], [
                ['solid', 'liquid', 'melting', 'ice on a pavement'],
                ['liquid', 'solid', 'freezing', 'water in an ice tray'],
                ['liquid', 'gas', 'boiling or evaporating', 'a kettle, or a puddle drying'],
                ['gas', 'liquid', 'condensing', 'mist on a cold window'],
                ['solid', 'gas', 'sublimation', 'dry ice smoking; frost disappearing without melting'],
                ['gas', 'solid', 'deposition', 'frost forming on a car overnight'],
              ]),
              p('Sublimation is the one people forget exists. Dry ice — solid carbon dioxide — never melts at ordinary pressure; it goes straight to gas, which is why the fog machine leaves no puddle. Frost on a cold morning also often disappears without ever being water.'),
              h4('Boiling and evaporating are not the same'),
              p('Evaporating happens from the surface, at any temperature, whenever a particle at the top happens to have enough energy to break free. That is why a puddle dries at 15 °C.'),
              p('Boiling happens throughout the liquid, at one particular temperature, when bubbles of vapour can form and survive in the middle of it. That is a stricter condition, which is why it needs a specific temperature.'));
          },
        },
        {
          h: 'Where the energy goes while the temperature is stuck',
          body() {
            return frag(
              ME.sims.heatingCurve(),
              p('Those two flat stretches are the answer to the hook. Energy is going in and the temperature is not moving, and the reason is that the energy is not being used to speed the particles up. It is being used to ', b('pull them apart'), '.'),
              p('Temperature measures the average kinetic energy of the particles — how fast they are moving. Breaking particles away from their neighbours takes energy and does not make them faster. So during melting, every joule goes into separation, none into speed, and the thermometer has nothing to report.'),
              callout(b('The numbers are startling. '), 'Warming one gram of water from 0 to 100 °C takes about 418 J. Boiling that same gram takes ', b('2257 J'), ' — more than five times as much, all at a constant 100 °C. Getting the particles completely away from each other is far harder than merely speeding them up.'),
              h4('Which is why steam burns are so bad'),
              p('When steam condenses on your skin it gives back all 2257 J per gram, instantly, before it has even begun to cool. That is why a steam burn is far worse than boiling water at the same temperature — the temperature is identical and the energy delivered is not.'),
              p('It is also why sweating cools you. Every gram of sweat that evaporates takes about 2400 J away with it, and it takes that energy from your skin.'));
          },
        },
        {
          h: 'Reading a heating curve',
          body() {
            return frag(
              p('A heating curve is energy in on the horizontal axis and temperature on the vertical, and it has a characteristic staircase shape.'),
              table(['Part of the curve', 'What is happening', 'What sets the slope'], [
                ['Sloping up', 'A single state is warming. Particles are speeding up.', 'The specific heat: how much energy one gram needs to warm by one degree.'],
                ['Flat', 'A phase change. Particles are being separated, not sped up.', 'Nothing — it is flat. Its length is set by the latent heat.'],
                ['Steeper slope', 'A state with a lower specific heat.', 'Ice and steam warm about twice as fast per joule as liquid water.'],
              ]),
              p('So you can read the whole thermal personality of a substance off the shape: two flats tell you its melting and boiling points, the lengths of the flats tell you its latent heats, and the slopes tell you its specific heats.'),
              goto('Try the heat calculator', '#/tools', 'The q = mcΔT tool will do the sloping parts for you, and show the working.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'Ice at 0 °C is absorbing energy from a hob and its temperature is not rising. Where is the energy going?',
          options: [
            { t: 'Into pulling the particles away from each other, which does not make them faster.', ok: true,
              why: 'Exactly. Temperature reports speed, and separation is not speed. Until the last of the ice has broken free, every joule goes into separation and the thermometer has nothing to say.' },
            { t: 'It is being lost to the room.', ok: false,
              why: 'Some always is, and that is not what is happening here. Even perfectly insulated, the temperature would stay at 0 °C until all the ice had melted.' },
            { t: 'The thermometer is not sensitive enough.', ok: false,
              why: 'The temperature genuinely is not changing. This is a real effect, not a measurement limitation.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Why is a steam burn worse than a boiling-water burn, when both are at 100 °C?',
          options: [
            { t: 'Because condensing steam releases 2257 J per gram before it even starts to cool.', ok: true,
              why: 'Right — the temperature is the same and the energy delivered is not. All the latent heat of vaporisation comes back out into your skin the moment it condenses.' },
            { t: 'Because steam is hotter than boiling water.', ok: false,
              why: 'At normal pressure both are at 100 °C. That is exactly what makes this a good question.' },
            { t: 'Because steam sticks to skin.', ok: false,
              why: 'It condenses on skin, which is the mechanism by which it dumps its latent heat. The energy is the reason, not the sticking.' },
          ] },
      ],
      quizzes: [
        { kind: 'match', q: 'Match each transition to its name.',
          pairs: [['Solid to liquid', 'melting'], ['Liquid to gas', 'boiling'],
                  ['Gas to liquid', 'condensing'], ['Solid straight to gas', 'sublimation']],
          right: 'Yes. Sublimation is the one people forget, and dry ice does it constantly.',
          wrong: 'Watch the solid-to-gas one — it skips the liquid altogether.' },
        { kind: 'numeric', q: 'How much energy does it take to warm 100 g of water from 20 °C to 80 °C? Water’s specific heat is 4.184 J/(g·K). Answer in joules.', answer: 25104, unit: 'J', tol: 0.01,
          right: '25 100 J, or about 25 kJ. q = mcΔT, with ΔT = 60.',
          wrong: 'q = mcΔT. The temperature change is 60, not 80.' },
        { kind: 'numeric', q: 'How much energy does it take to melt 50 g of ice at 0 °C? The latent heat of fusion is 334 J/g. Answer in joules.', answer: 16700, unit: 'J', tol: 0.01,
          right: '16 700 J. Note there is no ΔT in this one — the temperature does not change at all.',
          wrong: 'Multiply the mass by the latent heat. There is no temperature change to include.' },
        { kind: 'choice', q: 'Why does sweating cool you down?',
          options: [
            { t: 'Evaporating sweat takes its latent heat from your skin.', ok: true,
              why: 'Right — about 2400 J per gram, and it comes out of you. Which is why a humid day is unbearable: the sweat cannot evaporate, so the mechanism stops working.' },
            { t: 'Because sweat is cooler than your skin.', ok: false,
              why: 'It comes out at body temperature. The cooling is the evaporation, not the liquid.' },
            { t: 'Because it opens the pores.', ok: false, why: 'The cooling is thermodynamic, not anatomical.' },
          ] },
        { kind: 'choice', q: 'What does a flat stretch on a heating curve mean?',
          options: [
            { t: 'A phase change — energy going in, particles separating, temperature not moving.', ok: true,
              why: 'Yes. And the length of the flat tells you the latent heat: water’s boiling flat is over five times as long as its melting flat.' },
            { t: 'No energy is being added.', ok: false,
              why: 'Energy is being added the whole time — the horizontal axis is energy. That is what makes it interesting.' },
            { t: 'The substance has stopped absorbing energy.', ok: false,
              why: 'It absorbs a great deal during a flat. It just does not get hotter.' },
          ] },
        { kind: 'choice', q: 'Why does a puddle dry up at 15 °C, well below water’s boiling point?',
          options: [
            { t: 'Evaporation happens from the surface at any temperature, whenever a particle there has enough energy to escape.', ok: true,
              why: 'Right. The particles have a spread of speeds, and the fastest ones at the surface can leave. Boiling is the stricter condition of forming bubbles throughout, and that does need 100 °C.' },
            { t: 'The pavement heats the water to 100 °C.', ok: false,
              why: 'It does not get anywhere near. Evaporation needs no particular temperature.' },
            { t: 'The water soaks into the ground.', ok: false,
              why: 'Some does, and a puddle on a sealed surface still dries. Evaporation is the mechanism.' },
          ] },
        { kind: 'choice', q: 'Dry ice leaves no puddle. What is it doing?',
          options: [
            { t: 'Subliming — going straight from solid to gas without ever being liquid.', ok: true,
              why: 'Right. Carbon dioxide has no liquid phase at ordinary pressure, so it skips it entirely. Which is exactly why it is used in fog machines and to ship frozen goods.' },
            { t: 'Melting very quickly.', ok: false, why: 'There is no liquid stage at all — that is what makes it dry.' },
            { t: 'Evaporating.', ok: false,
              why: 'Close, and evaporating means leaving a liquid. Going from solid straight to gas is sublimation.' },
          ] },
      ],
      practice: 'heat',
      mistakes: [
        { wrong: 'Using q = mcΔT for a phase change.',
          why: 'There is no ΔT during a phase change — that is the whole point. Use the latent heat instead: q = m × L. Mixing the two up is the commonest error in this topic.' },
        { wrong: 'Thinking the energy is wasted during a flat stretch.',
          why: 'It is doing the hardest job in the whole process: separating particles that are holding on to each other. It takes over five times as much energy to boil a gram of water as to heat it from 0 to 100 °C.' },
        { wrong: 'Thinking boiling and evaporating are the same thing.',
          why: 'Evaporation is from the surface at any temperature. Boiling is throughout the liquid at one temperature. A drying puddle is the first; a kettle is the second.' },
      ],
      recap: [
        'Six transitions, including sublimation and deposition, which skip the liquid entirely.',
        'During a phase change the temperature does not move, because the energy is separating particles rather than speeding them up — and temperature only reports speed.',
        'The latent heats are large: boiling a gram of water takes over five times the energy of heating it from 0 to 100 °C. That is why steam burns badly and sweating works.',
        'On a heating curve, slopes are one state warming and flats are phase changes. The slopes come from specific heats, the flats from latent heats.',
        'q = mcΔT is for the slopes only. For a flat, use q = mL.',
      ],
    },

    {
      id: 'density',
      title: 'Density, and why ice floats',
      mins: 14,
      builds_on: ['physical-chemical', 'states'],
      hook() {
        return frag(
          p('Almost every substance in the universe is denser as a solid than as a liquid. Cool it, the particles slow down, they pack closer, it sinks in its own melt.'),
          p('Water does the opposite. Ice floats. And if it did not — if ice sank the way everything else does — lakes and oceans would freeze from the bottom up, nothing in them would survive a winter, and there would very likely be no life on this planet.'),
          p('That one anomaly is worth understanding, and it needs density first.'));
      },
      pages: [
        {
          h: 'Density is mass per volume, and it identifies things',
          body() {
            return frag(
              p('Density is simply how much mass is packed into a given volume.'),
              eq('density = mass ÷ volume'),
              p('The usual units are grams per cubic centimetre for solids and liquids, and grams per litre for gases — because a litre of gas contains so little mass that g/cm³ would be all zeros.'),
              p('It is an ', b('intensive'), ' property, as the last lesson but one put it: a speck of gold and a bar of gold have the same density. That is what makes it useful for identification, and mass useless.'),
              table(['Substance', 'Density (g/cm³)', 'So'], [
                ['Air', '0.0012', 'a litre of it weighs 1.2 g'],
                ['Ice', '0.917', 'less than water — hence floating'],
                ['Water', '1.000', 'the reference point, at 4 °C'],
                ['Aluminium', '2.70', 'light for a metal, which is why aircraft use it'],
                ['Iron', '7.87', 'about three times aluminium'],
                ['Lead', '11.3', 'the traditional benchmark for heavy'],
                ['Gold', '19.3', 'nearly twice lead; a gold brick is startling to pick up'],
                ['Osmium', '22.6', 'the densest element there is'],
              ], 'Every one of these is measured, and every one is in the Elements tab for the elements.'),
              callout('The classic use: Archimedes was asked whether a crown was solid gold. He did not need to melt it — he only needed its mass and its volume, because density identifies a substance and no amount of clever shaping can fake it.'));
          },
        },
        {
          h: 'Floating is a comparison, not a property',
          body() {
            return frag(
              p('Nothing floats or sinks on its own. It floats or sinks ', b('relative to the fluid it is in'), ', and the rule is simply: less dense floats.'),
              p('Which is why the same object can do both. A steel ball sinks in water and floats in mercury, because mercury is 13.6 g/cm³ and steel is about 7.9.'),
              worked('Will a 250 g block that measures 5 cm × 4 cm × 2 cm float in water?', [
                { q: 'Volume first', why: 'Multiply the three sides.', maths: '5 × 4 × 2 = 40 cm³' },
                { q: 'Then density', why: 'Mass divided by volume.', maths: '250 g ÷ 40 cm³ = 6.25 g/cm³' },
                { q: 'Compare with water', why: 'Water is 1.00 g/cm³, and 6.25 is a great deal more than that. It sinks, and quickly.' },
              ]),
              h4('And why a steel ship floats'),
              p('Steel is eight times as dense as water, and ships are made of it. The trick is that a ship is not solid steel — it is mostly air. What matters is the ', b('average'), ' density of the whole hull including the space inside it, and that comes out below 1. Puncture the hull so the air is replaced by water and the average density rises past 1, which is precisely what sinking is.'));
          },
        },
        {
          h: 'Why ice is the exception',
          body() {
            return frag(
              p('Here is the answer to the hook, and it is a structural accident.'),
              p('In liquid water, the molecules are jumbled together and can get quite close. As it cools towards freezing they slow down, and each molecule starts to lock into a specific arrangement with its neighbours — held by the particular attraction between the hydrogen of one and the oxygen of the next, which Unit 6 will name as hydrogen bonding.'),
              p('That arrangement is a hexagonal lattice, and it has ', b('holes in it'), '. It is a less efficient way of filling space than the jumble was. So the molecules end up further apart, the same mass takes up more room, and the density falls by about 9%.'),
              callout(b('Water is densest at 4 °C, not at 0 °C. '), 'Cool it below 4 and it starts expanding again as the lattice begins to assemble. Freeze it and it expands sharply. That is why a forgotten bottle in the freezer splits, and why water pipes burst in winter — the expanding ice has nowhere to go.'),
              h4('What that does for the planet'),
              p('Because ice floats, a freezing lake forms a lid. The lid insulates what is underneath, so the water below stays liquid and everything in it lives. If ice sank, each winter’s ice would go to the bottom and stay there, and lakes would fill with ice from below and never fully thaw.'),
              p('It is a good example of something worth noticing in chemistry generally: a small structural detail — the shape of one molecule and where its attractions point — with consequences the size of a biosphere.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'numeric', after: 0,
          q: 'A rock has a mass of 48 g and a volume of 12 cm³. What is its density, in g/cm³?',
          answer: 4, tol: 0.01,
          right: '4 g/cm³ — mass divided by volume. And since that is more than 1, it sinks in water.',
          wrong: 'Density is mass ÷ volume. Check which way round you divided: a rock denser than water should come out above 1.' },
        { kind: 'choice', after: 2,
          q: 'Why does ice float when almost every other solid sinks in its own liquid?',
          options: [
            { t: 'Because freezing locks the molecules into a lattice with holes in it, which takes up more room than the liquid jumble.', ok: true,
              why: 'Exactly. The arrangement is held by a specific attraction pointing in specific directions, and it is a less efficient packing than the disordered liquid. Same mass, more volume, lower density.' },
            { t: 'Because ice is colder, and cold things float.', ok: false,
              why: 'Cold usually makes things denser, which is why this is an exception worth explaining. Temperature alone would predict the opposite.' },
            { t: 'Because ice has air trapped in it.', ok: false,
              why: 'Ice made carefully from degassed water still floats. The lattice itself is less dense; trapped air is a separate effect.' },
          ] },
      ],
      quizzes: [
        { kind: 'numeric', q: 'A block of mass 270 g has a volume of 100 cm³. What is its density, in g/cm³?', answer: 2.7, tol: 0.01,
          right: '2.7 g/cm³, which is aluminium.',
          wrong: 'Mass ÷ volume.' },
        { kind: 'numeric', q: 'Mercury has a density of 13.6 g/cm³. What is the mass of 25.0 cm³ of it, in grams?', answer: 340, unit: 'g', tol: 0.01,
          right: '340 g. Rearranging: mass = density × volume.',
          wrong: 'Rearrange density = mass ÷ volume to get mass = density × volume.' },
        { kind: 'numeric', q: 'A liquid has a density of 0.79 g/cm³. What volume does 100 g of it occupy, in cm³?', answer: 126.6, tol: 0.02,
          right: 'About 127 cm³. Volume = mass ÷ density. Note it is more than 100, which is right for something less dense than water.',
          wrong: 'Volume = mass ÷ density. Sanity check: something lighter than water should take up more room than 100 cm³.' },
        { kind: 'choice', q: 'A steel ball sinks in water and floats in mercury. What does that show?',
          options: [
            { t: 'Floating is a comparison with the fluid, not a property of the object.', ok: true,
              why: 'Exactly. Steel is denser than water and less dense than mercury, so it does both. Nothing "is" a floater.' },
            { t: 'Mercury is not a liquid.', ok: false, why: 'It is — the only metal that is liquid at room temperature.' },
            { t: 'The ball changes density.', ok: false, why: 'It does not change at all. What changes is what it is being compared with.' },
          ] },
        { kind: 'choice', q: 'How does a steel ship float when steel is eight times denser than water?',
          options: [
            { t: 'Because the hull is mostly air, so the average density of the whole ship is below 1.', ok: true,
              why: 'Right — and it is exactly why a hole sinks it. Water replacing the air raises the average density past 1.' },
            { t: 'Because it is moving.', ok: false, why: 'A ship floats perfectly well at anchor.' },
            { t: 'Because steel floats in seawater.', ok: false,
              why: 'A solid lump of steel sinks in any water. The shape and the trapped air are what matter.' },
          ] },
        { kind: 'choice', q: 'Water is densest at 4 °C rather than 0 °C. Why does that matter?',
          options: [
            { t: 'It means the coldest water in a lake rises rather than sinking, so lakes freeze from the top.', ok: true,
              why: 'Yes, and that lid of ice insulates everything below it. Combined with ice floating, it is why lakes do not freeze solid and why anything survives in them.' },
            { t: 'It means water is hard to measure accurately.', ok: false,
              why: 'It is a minor nuisance for precision work and not the point. The consequence is ecological.' },
            { t: 'It is why water pipes burst.', ok: false,
              why: 'Pipes burst because ice expands on freezing, which is related but a different step. The 4 °C maximum is about how lakes stratify.' },
          ] },
        { kind: 'choice', q: 'Why is gas density quoted in g/L rather than g/cm³?',
          options: [
            { t: 'Because in g/cm³ the numbers would be tiny and awkward — air is 0.0012.', ok: true,
              why: 'Right. Choosing units that keep numbers human-sized is the same instinct behind the SI prefixes. Air at 1.2 g/L reads much better than 0.0012 g/cm³.' },
            { t: 'Because gases are measured differently.', ok: false, why: 'Density is mass over volume for everything.' },
            { t: 'Because gases have no fixed volume.', ok: false,
              why: 'True and separate — a gas density has to state its temperature and pressure. The unit choice is about the size of the number.' },
          ] },
      ],
      practice: 'unit-conversion',
      mistakes: [
        { wrong: 'Dividing volume by mass.',
          why: 'Density is mass ÷ volume. The sanity check: anything denser than water must come out above 1 in g/cm³. If you get 0.24 for a rock, you have it upside down — and writing the units out would have caught it.' },
        { wrong: 'Saying something "is" a floater or a sinker.',
          why: 'It depends entirely on the fluid. Steel sinks in water and floats in mercury.' },
        { wrong: 'Thinking ice floats because of trapped air bubbles.',
          why: 'Bubble-free ice floats just as well. The lattice itself is about 9% less dense than liquid water, because it has holes in it.' },
      ],
      recap: [
        'Density is mass ÷ volume, and it is intensive — the same for a speck as for a tonne — which is what makes it identify a substance.',
        'Floating is a comparison with the surrounding fluid. Less dense floats. A steel ship floats because the hull is mostly air.',
        'Water is the great exception: freezing locks it into a lattice with holes, so ice is about 9% less dense than water and floats.',
        'Water is densest at 4 °C, so lakes freeze from the top down and the ice insulates the life underneath.',
      ],
    },

    ],
  });
})();
