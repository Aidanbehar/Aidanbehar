/* Unit 3: Atoms. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, eq, table, worked, figure, goto } = K;
  const el = ME.el;

  ME.course.unit({
    n: 3, id: 'atoms',
    title: 'Atoms',
    blurb: 'What is inside an atom, how anybody worked that out, and the three numbers — protons, neutrons, electrons — that decide everything else.',
    lessons: [

    {
      id: 'atom-story',
      title: 'How we found out what is inside',
      mins: 15,
      builds_on: ['how-we-know'],
      hook() {
        return frag(
          p('In 1909 a student was firing radioactive particles at a sheet of gold foil and counting where they landed. Almost all went straight through, as expected.'),
          p('Then he noticed that about one in eight thousand bounced ', b('backwards'), '.'),
          p('His supervisor, Ernest Rutherford, later said it was "as if you had fired a fifteen-inch shell at a piece of tissue paper and it came back and hit you". That one observation destroyed the accepted picture of the atom and replaced it with something nobody had imagined.'));
      },
      pages: [
        {
          h: 'Four pictures, each forced by a measurement',
          body() {
            return frag(
              p('The atom has been redrawn four times, and each redraw was forced by an experiment the previous picture could not explain. This is the pattern from Unit 1 in action.'),
              table(['Picture', 'What it said', 'What broke it'], [
                ['Dalton, 1808', 'Atoms are indivisible solid spheres, each element with its own mass.',
                 'Thomson found something coming out of them. So they have parts.'],
                ['Thomson, 1897', 'A ball of positive stuff with negative electrons embedded in it, like currants in a bun.',
                 'Rutherford’s foil. A diffuse positive ball could never bounce anything backwards.'],
                ['Rutherford, 1911', 'A tiny dense positive nucleus with electrons somewhere around it, and mostly empty space.',
                 'An orbiting electron should radiate energy and spiral into the nucleus in a fraction of a second. Atoms do not do that.'],
                ['Bohr, 1913, onwards', 'Electrons can only occupy certain fixed energy levels, and do not radiate while they stay in one.',
                 'Nothing, for chemistry. It was replaced by quantum mechanics in the 1920s, and the fixed-energy-levels idea survived and is what this course uses.'],
              ]),
              callout(b('Notice what each step kept. '), 'Nothing was thrown away wholesale. Dalton’s fixed masses are still right. Thomson’s electrons are still there. Rutherford’s nucleus is still there. Each picture absorbed the last one and added the bit it was missing.'));
          },
        },
        {
          h: 'Why the foil experiment was decisive',
          body() {
            return frag(
              p('It is worth seeing exactly why one observation could be so conclusive, because the logic is beautiful.'),
              p('Thomson’s atom had its positive charge spread thinly through the whole volume. A fast, heavy, positive particle flying through that would feel a weak push and be nudged slightly off course. It could never be turned round — there is nothing solid enough anywhere to bounce off.'),
              p('So the fact that some came ', b('straight back'), ' meant they had hit something both very massive and very concentrated. And the fact that this only happened once in eight thousand times meant that whatever they hit was very small — almost all of the foil was clear passage.'),
              eq('mostly empty + occasional violent bounce = tiny dense centre'),
              p('Rutherford did the arithmetic and found the nucleus must be around ten thousand times smaller across than the atom.'),
              callout(b('To scale: '), 'if an atom were a sports stadium, the nucleus would be a pea on the centre spot. Everything else — all the volume of everything you have ever touched — is electrons and empty space. You have never actually touched anything solid; you have felt electrons pushing back on electrons.'));
          },
        },
        {
          h: 'The three particles',
          body() {
            return frag(
              p('What ended up inside, and it is a short list.'),
              table(['Particle', 'Charge', 'Mass', 'Where'], [
                ['Proton', '+1', '1 (about 1.67 × 10⁻²⁷ kg)', 'in the nucleus'],
                ['Neutron', '0', '1, a shade more than a proton', 'in the nucleus'],
                ['Electron', '−1', 'about 1/1836 of a proton', 'around the outside'],
              ], 'Masses are quoted relative to a proton, because the absolute numbers are unhelpfully small.'),
              p('The mass ratio is the striking one. An electron weighs about ', b('one two-thousandth'), ' of a proton, so essentially all of an atom’s mass is in that pea at the centre and essentially all of its volume is the electron cloud around it.'),
              h4('Which leads to the division of labour that runs the rest of this course'),
              p(b('The nucleus has the mass. The electrons do the chemistry.'), ' Chemical reactions never touch the nucleus — rearranging nuclei is nuclear physics, and it takes millions of times more energy. Every reaction you will ever meet is electrons being shared, swapped or shifted, with the nuclei looking on.'),
              p('So the next unit is about electrons, and the nucleus will barely be mentioned again after this one.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'One particle in eight thousand bounced backwards off the gold foil. Why did that rule out Thomson’s picture?',
          options: [
            { t: 'Because positive charge spread thinly through the whole atom could never turn a fast heavy particle round.', ok: true,
              why: 'Exactly. A diffuse charge gives a gentle nudge. Reversing something means hitting a concentrated mass, and the rarity of it means that mass is tiny.' },
            { t: 'Because the particles should all have bounced.', ok: false,
              why: 'Thomson predicted that almost none would bounce, and almost none did. The problem was the few that bounced hard.' },
            { t: 'Because gold is too heavy.', ok: false,
              why: 'Gold was chosen because it can be beaten very thin. Its weight is not the issue — the concentration of that weight is.' },
          ] },
      ],
      quizzes: [
        { kind: 'order', q: 'Put the models of the atom in the order they were proposed.',
          items: ['Indivisible solid spheres', 'Electrons embedded in a positive ball',
                  'A tiny dense nucleus with electrons around it', 'Electrons restricted to fixed energy levels'],
          right: 'Yes — Dalton, Thomson, Rutherford, Bohr. Each was forced by an experiment the one before could not explain.',
          wrong: 'Think about which discovery had to come first for the next model to be necessary.' },
        { kind: 'match', q: 'Match each particle to its charge.',
          pairs: [['Proton', 'positive'], ['Neutron', 'no charge'], ['Electron', 'negative']],
          right: 'Yes. The names help: neutron is neutral, and electron goes with electricity.',
          wrong: 'The neutron is the one with no charge — the name says so.' },
        { kind: 'choice', q: 'Where is nearly all the mass of an atom?',
          options: [
            { t: 'In the nucleus.', ok: true,
              why: 'Right. Protons and neutrons are each about 1836 times an electron, so the nucleus holds essentially all the mass in a fraction of the volume.' },
            { t: 'Spread evenly.', ok: false, why: 'Very far from evenly — that was Thomson’s picture and the foil experiment killed it.' },
            { t: 'In the electrons.', ok: false, why: 'Electrons are about a two-thousandth of a proton each. They contribute almost nothing to the mass.' },
          ] },
        { kind: 'choice', q: 'Which part of the atom does chemistry involve?',
          options: [
            { t: 'The electrons.', ok: true,
              why: 'Every reaction in this course is electrons being shared, swapped or shifted. The nucleus is a spectator, which is why the rest of the course barely mentions it.' },
            { t: 'The nucleus.', ok: false,
              why: 'Rearranging nuclei is nuclear physics and takes millions of times more energy. Chemistry never gets near it.' },
            { t: 'The neutrons.', ok: false,
              why: 'Neutrons affect mass and stability and have essentially no effect on chemical behaviour — which is why isotopes of an element react identically.' },
          ] },
        { kind: 'choice', q: 'If an atom were a sports stadium, how big would the nucleus be?',
          options: [
            { t: 'About the size of a pea on the centre spot.', ok: true,
              why: 'Roughly, yes — the nucleus is about ten thousand times smaller across than the atom. Which means all the stuff you have ever touched is mostly empty space.' },
            { t: 'About the size of the pitch.', ok: false, why: 'Far too big. That would be closer to Thomson’s picture.' },
            { t: 'About the size of a football.', ok: false,
              why: 'Still much too big by a factor of a hundred or so.' },
          ] },
        { kind: 'choice', q: 'Rutherford’s model had a problem: an orbiting electron should radiate energy and fall into the nucleus. How was that resolved?',
          options: [
            { t: 'Bohr proposed that electrons can only sit at certain fixed energies, and do not radiate while they stay at one.', ok: true,
              why: 'Right. It was a bold thing to assert with no explanation, and it worked — it predicted the exact colours of light hydrogen emits. Quantum mechanics later explained why, and kept the fixed levels.' },
            { t: 'The electrons were found not to move.', ok: false,
              why: 'They are not stationary. The resolution was about which energies are allowed, not about stopping.' },
            { t: 'The problem was never resolved.', ok: false,
              why: 'It was, and the resolution is the whole basis of the next unit.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking each model of the atom was simply wrong and discarded.',
          why: 'Each one kept everything that worked and added what was missing. Dalton’s fixed masses, Thomson’s electrons and Rutherford’s nucleus are all still in the picture you will use.' },
        { wrong: 'Picturing electrons in neat planetary orbits.',
          why: 'It is the standard diagram and it is a convenient lie. Electrons occupy regions of probability, not paths. The diagram gets the energy levels right, which is what matters for chemistry, and gets the shape wrong.' },
        { wrong: 'Thinking atoms are solid.',
          why: 'They are overwhelmingly empty. Solidity is electrons repelling other electrons — which is genuinely why you cannot push your hand through a table, and not because there is anything there in the way.' },
      ],
      recap: [
        'The atom was redrawn four times, each time because an experiment broke the previous picture — and each picture kept what worked.',
        'The gold foil experiment showed a tiny, dense, positive nucleus surrounded by mostly empty space, because only a concentrated mass could turn a fast particle round.',
        'Protons (+1), neutrons (0) and electrons (−1), with the electron about 1/1836 of the mass of the others.',
        'The nucleus has the mass; the electrons do the chemistry. Everything after this unit is about electrons.',
      ],
    },

    {
      id: 'atomic-number',
      title: 'Atomic number, mass number, and reading an element’s box',
      mins: 16,
      builds_on: ['atom-story'],
      hook() {
        return frag(
          p('Gold has 79 protons. Platinum has 78. That single proton is the difference between the two most valuable metals on Earth — different colour, different density, different price.'),
          p('Add one proton to a gold atom and you have mercury: a liquid, silver, and poisonous.'),
          p('Nothing else about an atom does that. You can change the neutrons and it is still gold. You can strip electrons off and it is still gold. Change the protons and it is a different element entirely.'));
      },
      pages: [
        {
          h: 'The two numbers',
          body() {
            return frag(
              p('Every atom is described by two counts.'),
              p('The ', b('atomic number'), ', written Z, is the number of protons. It is the atom’s identity — it decides which element it is, and nothing else does. It is also why the periodic table is ordered the way it is: the table is just the elements lined up by proton count.'),
              p('The ', b('mass number'), ', written A, is protons plus neutrons — the total number of heavy particles in the nucleus. It is not the mass in any unit; it is a count.'),
              eq('A = Z + neutrons,    so    neutrons = A − Z'),
              figure('The standard way of writing it. The bottom number identifies the element; the top number counts the nucleus.',
                el('div', { class: 'lesson-eq', html: '<sup>23</sup><sub>11</sub>Na &nbsp;&nbsp; or just &nbsp;&nbsp; sodium-23' })),
              p('You will meet both notations. The written-out form, sodium-23, gives only the mass number — which is enough, because the name already tells you the element and therefore the proton count.'),
              h4('And a neutral atom has as many electrons as protons'),
              p('Charges have to cancel for the atom to be neutral, so a neutral atom has exactly Z electrons. That is the default assumption unless the atom is written as an ion, which is the next lesson.'));
          },
        },
        {
          h: 'Working the three counts out',
          body() {
            return frag(
              worked('How many protons, neutrons and electrons in an atom of ⁴⁰₁₈Ar?', [
                { q: 'Protons', why: 'The bottom number is Z, the proton count. That is the identity of the element, and 18 is argon — which the symbol confirms.', maths: '18 protons' },
                { q: 'Neutrons', why: 'Mass number minus atomic number. The nucleus holds 40 particles altogether, 18 of which are protons.', maths: '40 − 18 = 22 neutrons' },
                { q: 'Electrons', why: 'Nothing says it is charged, so it is neutral, so electrons match protons.', maths: '18 electrons' },
              ]),
              worked('An atom has 26 protons and 30 neutrons. Name it and write it properly.', [
                { q: 'Which element?', why: '26 protons is iron — you can look it up in the Elements tab, or read it off the periodic table, which is ordered by exactly this number.' },
                { q: 'Mass number', why: 'Protons plus neutrons.', maths: '26 + 30 = 56' },
                { q: 'Written out', why: 'Iron-56, or with both numbers stacked.', maths: '⁵⁶₂₆Fe' },
                { q: 'And is it a common one?', why: 'Iron-56 is the commonest isotope of iron and, as it happens, the most tightly bound nucleus there is — which is why iron is where nuclear fusion in stars stops.' },
              ]),
              goto('Look any element up', '#/elements', 'Every element’s atomic number, mass and properties, from PubChem.'));
          },
        },
        {
          h: 'Build one and see',
          body() {
            return frag(
              p('The quickest way to make the relationship stick is to break it deliberately. Add protons and watch the element change under your hands. Add neutrons and watch it stay the same element but become an unusual isotope. Take electrons away and watch it become an ion while remaining the same element.'),
              ME.sims.buildAtom(),
              callout(b('The thing to notice: '), 'only one of those three sliders changes what the substance is.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'count', after: 0,
          q: 'An atom of ³⁹₁₉K. How many neutrons does it have?',
          answer: 20,
          right: 'Twenty. Mass number minus atomic number: 39 − 19.',
          wrong: 'Neutrons = mass number − atomic number.',
          hints: { 39: 'That is the mass number, which counts protons and neutrons together. Subtract the protons.',
                   19: 'That is the proton count. The neutrons are what is left of the 39 after the protons.',
                   58: 'You have added instead of subtracted. The mass number already includes the protons.' } },
        { kind: 'choice', after: 2,
          q: 'You add a neutron to a carbon atom. What have you got?',
          options: [
            { t: 'Still carbon — a heavier isotope of it, with identical chemistry.', ok: true,
              why: 'Right. Only protons decide the element. Carbon-13 behaves chemically exactly like carbon-12; it is just heavier, which is how carbon dating and mass spectrometry work.' },
            { t: 'Nitrogen.', ok: false,
              why: 'That would need an extra proton, not a neutron. Neutrons do not change the element.' },
            { t: 'An ion.', ok: false,
              why: 'Neutrons have no charge, so adding one cannot make an ion. Ions come from changing the electrons.' },
          ] },
      ],
      quizzes: [
        { kind: 'count', q: 'An atom of ⁵⁶₂₆Fe. How many protons?', answer: 26,
          right: '26 — the bottom number, which is what makes it iron.',
          wrong: 'The atomic number is the smaller of the two, and it is the proton count.' },
        { kind: 'count', q: 'An atom of ⁵⁶₂₆Fe. How many neutrons?', answer: 30,
          right: '30. 56 − 26.',
          wrong: 'Mass number minus atomic number.', hints: { 56: 'That is protons and neutrons together.' } },
        { kind: 'count', q: 'A neutral atom of ⁵⁶₂₆Fe. How many electrons?', answer: 26,
          right: '26 — matching the protons, because a neutral atom has to have its charges cancel.',
          wrong: 'A neutral atom has as many electrons as protons.' },
        { kind: 'count', q: 'An atom has 17 protons and 18 neutrons. What is its mass number?', answer: 35,
          right: '35. Protons plus neutrons. It is chlorine-35, the commonest chlorine isotope.',
          wrong: 'Mass number is protons plus neutrons added together.' },
        { kind: 'numeric', q: 'An atom has a mass number of 31 and 16 neutrons. What is its atomic number?', answer: 15, tol: 0.001,
          right: '15, which is phosphorus.',
          wrong: '31 − 16.' },
        { kind: 'choice', q: 'Why is the periodic table ordered by atomic number rather than by atomic mass?',
          options: [
            { t: 'Because atomic number is the element’s identity, and ordering by mass puts a couple of elements in the wrong place.', ok: true,
              why: 'Right. Mendeleev ordered by mass and had to swap two pairs to make the chemistry work. Once protons were discovered, the swaps turned out to be exactly where mass and proton count disagree — tellurium and iodine being the famous pair.' },
            { t: 'Because atomic mass is hard to measure.', ok: false,
              why: 'It was measured long before the proton was discovered. The issue is that it is not quite the right ordering.' },
            { t: 'Because atomic number is always a whole number.', ok: false,
              why: 'True and not the reason. The reason is that it decides the chemistry.' },
          ] },
        { kind: 'choice', q: 'Add one proton to a gold atom. What do you get?',
          options: [
            { t: 'Mercury — a completely different element.', ok: true,
              why: 'Right, and it says everything about why the proton count is the identity. One particle is the difference between a solid yellow metal and a liquid silver one.' },
            { t: 'A heavier kind of gold.', ok: false,
              why: 'That would be adding a neutron. Adding a proton changes the element.' },
            { t: 'A gold ion.', ok: false,
              why: 'Ions come from changing electrons. Changing protons changes the element itself.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking the mass number is the mass.',
          why: 'It is a count of protons and neutrons, so it is a whole number with no units. The actual atomic mass is close to it but never exactly it, for reasons the next lesson gets to.' },
        { wrong: 'Forgetting to subtract when finding neutrons.',
          why: 'The mass number already includes the protons. Neutrons = A − Z, always a subtraction.' },
        { wrong: 'Assuming a neutral atom is the default when the question says otherwise.',
          why: 'If a charge is written, the electron count has changed. Check for a superscript plus or minus before assuming electrons equal protons.' },
      ],
      recap: [
        'Atomic number Z is the proton count, and it is the element’s identity. Nothing else is.',
        'Mass number A is protons plus neutrons — a count, not a mass.',
        'Neutrons = A − Z, and a neutral atom has Z electrons.',
        'The periodic table is ordered by atomic number, which is why it works where ordering by mass did not quite.',
      ],
    },

    {
      id: 'isotopes',
      title: 'Isotopes, and why chlorine weighs 35.45',
      mins: 16,
      builds_on: ['atomic-number'],
      hook() {
        return frag(
          p('Look up chlorine and its atomic mass is 35.45. But mass number is a count of protons and neutrons, and you cannot have 0.45 of a neutron.'),
          p('So what is being counted? Nothing, in a single atom. No chlorine atom anywhere weighs 35.45.'),
          p('The number is an average over a mixture — and once you see that, every non-whole-number mass on the periodic table stops being strange.'));
      },
      pages: [
        {
          h: 'Same element, different mass',
          body() {
            return frag(
              p('An ', term('isotope', 'Atoms of the same element with different numbers of neutrons. Same chemistry, different mass.'), ' is an atom of an element with a different number of neutrons from its siblings. Same protons, so the same element and the same chemistry; different neutrons, so a different mass.'),
              table(['Isotope', 'Protons', 'Neutrons', 'Share of natural chlorine'], [
                ['chlorine-35', '17', '18', 'about 76%'],
                ['chlorine-37', '17', '20', 'about 24%'],
              ]),
              p('Both are ordinary, stable chlorine. Dig up chlorine anywhere on Earth and you get roughly that mixture, which is why the quoted mass is reliable enough to calculate with.'),
              callout(b('And the chemistry really is identical. '), 'Chlorine-35 and chlorine-37 form the same compounds, react at the same rate and taste the same in salt. This is the strongest possible evidence that neutrons do not participate in chemistry — change them and nothing chemical changes at all.'));
          },
        },
        {
          h: 'Working out an average atomic mass',
          body() {
            return frag(
              p('The quoted mass is a ', b('weighted'), ' average — weighted by how common each isotope is. That word matters: a plain average of 35 and 37 would be 36, and the answer is 35.45, because there is three times as much of the light one.'),
              worked('Chlorine is 75.8% chlorine-35 and 24.2% chlorine-37. Find its average atomic mass.', [
                { q: 'Turn the percentages into fractions', why: 'Percentages are per hundred, so divide by 100. This is the step people skip, and it puts the answer out by a factor of a hundred.', maths: '0.758 and 0.242' },
                { q: 'Weight each mass by its share', why: 'Each isotope contributes its own mass times how much of it there is.', maths: '(35 × 0.758) + (37 × 0.242)' },
                { q: 'Work it out', why: 'The first term dominates because there is three times as much chlorine-35.', maths: '26.53 + 8.954 = 35.48' },
                { q: 'Sanity check', why: 'The answer must land between 35 and 37, and closer to 35 because that one is commoner. It does. If your answer comes out outside that range, you have made an arithmetic slip, and the check takes two seconds.' },
              ]),
              p('The published figure is 35.45, using more precise isotope masses than the whole numbers used here. The method is identical.'),
              h4('The sanity check is the whole lesson'),
              p('A weighted average must always lie between the smallest and largest values, and must lean towards whichever is commonest. That single fact catches almost every mistake anyone makes in this calculation.'));
          },
        },
        {
          h: 'What isotopes are used for',
          body() {
            return frag(
              p('Isotopes being chemically identical but physically distinguishable turns out to be enormously useful.'),
              table(['Use', 'Which isotope', 'How it works'], [
                ['Carbon dating', 'carbon-14', 'Living things take in carbon-14 from the air while alive and stop when they die. It decays at a known rate, so the amount left dates the sample. Good to about 50 000 years.'],
                ['Medical imaging', 'technetium-99m', 'Injected, it goes where the body sends it and emits gamma rays that a camera detects. It decays within hours, so it does not linger.'],
                ['Radiotherapy', 'cobalt-60', 'Its radiation kills dividing cells, and tumour cells divide fastest.'],
                ['Nuclear power', 'uranium-235', 'Only about 0.7% of natural uranium, and the only part that will sustain a chain reaction — which is why fuel has to be enriched.'],
                ['Tracing reactions', 'oxygen-18, deuterium', 'Label one atom in a reactant and find out where it ended up. This is how chemists work out reaction mechanisms.'],
              ]),
              p('That last one is quietly the most important for chemistry. If you want to know whether the oxygen in the product came from the acid or the alcohol, you make one of them with heavy oxygen and see where it turns up — and it works precisely ', em('because'), ' the labelled atom behaves chemically like the ordinary one.'),
              callout(b('One clarification. '), 'Not all isotopes are radioactive. Chlorine-35 and chlorine-37 are both perfectly stable, and so are the great majority of isotopes you will meet. Radioactivity is about a nucleus being unstable, which is a separate question from having an unusual number of neutrons.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Chlorine-35 and chlorine-37 form identical compounds and react at identical rates. What does that prove?',
          options: [
            { t: 'That neutrons take no part in chemistry.', ok: true,
              why: 'Exactly, and it is about as direct a piece of evidence as chemistry offers. The only difference between the two atoms is neutrons, and there is no chemical difference at all — so neutrons cannot matter chemically.' },
            { t: 'That they are the same isotope.', ok: false,
              why: 'They are different isotopes, with different masses. They are chemically identical, which is a different claim.' },
            { t: 'That chlorine has no isotopes.', ok: false,
              why: 'It has two common ones, which is exactly why its atomic mass is 35.45 rather than a whole number.' },
          ] },
        { kind: 'numeric', after: 1,
          q: 'An element is 60% of an isotope with mass 10 and 40% of one with mass 11. What is its average atomic mass?',
          answer: 10.4, tol: 0.01,
          right: '10.4 — between 10 and 11 and leaning towards 10, because 10 is commoner. (This is boron, near enough.)',
          wrong: 'Multiply each mass by its fraction and add. The answer has to land between 10 and 11, nearer the commoner one.' },
      ],
      quizzes: [
        { kind: 'choice', q: 'What is different between two isotopes of the same element?',
          options: [
            { t: 'The number of neutrons.', ok: true,
              why: 'Right. Same protons (so same element), same electrons if neutral (so same chemistry), different neutrons (so different mass).' },
            { t: 'The number of protons.', ok: false,
              why: 'That would make it a different element, not a different isotope.' },
            { t: 'The number of electrons.', ok: false,
              why: 'That would make it an ion. Isotopes differ in neutrons.' },
          ] },
        { kind: 'numeric', q: 'An element has two isotopes: 80% at mass 24 and 20% at mass 26. What is its average atomic mass?', answer: 24.4, tol: 0.01,
          right: '24.4. Close to 24, because that one is four times as common.',
          wrong: '(24 × 0.80) + (26 × 0.20). Remember to turn the percentages into fractions.' },
        { kind: 'numeric', q: 'Copper is 69.2% copper-63 and 30.8% copper-65. What is its average atomic mass?', answer: 63.62, tol: 0.01,
          right: 'About 63.6, which is what the periodic table says.',
          wrong: '(63 × 0.692) + (65 × 0.308). The answer must be between 63 and 65 and nearer 63.' },
        { kind: 'choice', q: 'An element’s average atomic mass is 20.2. It has isotopes at 20 and 22. Which is commoner?',
          options: [
            { t: 'Mass 20, by a long way.', ok: true,
              why: 'Right — the average is very close to 20, so almost all of it must be the mass-20 isotope. This is neon, which is about 90% neon-20.' },
            { t: 'Mass 22.', ok: false,
              why: 'Then the average would be nearer 22. A weighted average always leans towards the commoner one.' },
            { t: 'They are equally common.', ok: false,
              why: 'Then the average would be 21. The fact that it is 20.2 tells you the mass-20 one dominates.' },
          ] },
        { kind: 'choice', q: 'How does carbon dating work?',
          options: [
            { t: 'Living things absorb carbon-14 while alive and stop when they die, and it decays at a known rate.', ok: true,
              why: 'Right. The clock starts at death. Measuring how much carbon-14 is left tells you how long ago that was — up to about 50 000 years, after which too little remains to measure.' },
            { t: 'Carbon turns into nitrogen at a rate that depends on temperature.', ok: false,
              why: 'Radioactive decay rates do not depend on temperature, which is exactly what makes them usable as clocks.' },
            { t: 'The amount of carbon in a body falls over time.', ok: false,
              why: 'It is the ratio of carbon-14 to ordinary carbon-12 that changes, not the total.' },
          ] },
        { kind: 'choice', q: 'Are all isotopes radioactive?',
          options: [
            { t: 'No — most of the ones you meet are perfectly stable.', ok: true,
              why: 'Right. Chlorine-35 and chlorine-37 are both stable and both ordinary. Radioactivity is about an unstable nucleus, which is a separate matter from having an unusual neutron count.' },
            { t: 'Yes, that is what makes them isotopes.', ok: false,
              why: 'What makes them isotopes is a different neutron count. Stability is a separate question.' },
            { t: 'Only the heavy ones.', ok: false,
              why: 'There is a rough trend that way, and it is not a rule — carbon-14 is light and radioactive, while lead-208 is heavy and stable.' },
          ] },
        { kind: 'choice', q: 'Why can chemists use a heavy isotope to trace where an atom goes in a reaction?',
          options: [
            { t: 'Because it behaves chemically like the ordinary atom but can be told apart by its mass.', ok: true,
              why: 'Exactly, and both halves are essential. If it behaved differently the experiment would not represent the real reaction; if it could not be told apart there would be nothing to trace.' },
            { t: 'Because it glows.', ok: false, why: 'Isotopes do not glow. They are detected by mass, or by their radiation if radioactive.' },
            { t: 'Because it reacts faster.', ok: false,
              why: 'There is a tiny rate difference for very light atoms, and it is small enough to ignore. Identical chemistry is the point.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Forgetting to divide the percentages by 100.',
          why: 'Multiplying by 75.8 instead of 0.758 gives an answer a hundred times too big. The sanity check catches it instantly: the answer must land between the isotope masses.' },
        { wrong: 'Taking a plain average instead of a weighted one.',
          why: 'For chlorine that gives 36 instead of 35.45. The weighting is the entire point — there is three times as much of the light isotope.' },
        { wrong: 'Thinking isotopes have different chemistry.',
          why: 'They do not, to any degree that matters. Chemistry is electrons, and isotopes have the same electrons.' },
        { wrong: 'Assuming isotope means radioactive.',
          why: 'Most stable elements have several stable isotopes. Radioactivity is about nuclear stability, not neutron count.' },
      ],
      recap: [
        'Isotopes are atoms of one element with different neutron counts: same chemistry, different mass.',
        'A quoted atomic mass is a weighted average over the natural mixture, which is why it is not a whole number — no single atom weighs 35.45.',
        'Multiply each isotope mass by its fractional abundance and add. The answer must lie between the extremes and lean towards the commonest.',
        'Isotopes being chemically identical but physically distinguishable is what makes carbon dating, medical imaging and reaction tracing possible.',
        'Most isotopes are not radioactive.',
      ],
    },

    {
      id: 'ions',
      title: 'Ions: why atoms gain and lose electrons',
      mins: 16,
      builds_on: ['atomic-number'],
      hook() {
        return frag(
          p('Sodium metal reacts violently with water. Chlorine is a poisonous gas. Yet sodium ions and chloride ions dissolved in water are so harmless that they are the main thing in your blood, and you eat them on chips.'),
          p('The difference is a single electron, handed from one atom to the other. And after that handover, neither atom behaves anything like it did before.'),
          p('So: why would an atom give an electron away at all? Nothing is generous about it, and the answer is the reason for nearly all of chemistry.'));
      },
      pages: [
        {
          h: 'Atoms do what lowers their energy',
          body() {
            return frag(
              p('Here is the principle, and it is worth stating plainly because it explains an enormous amount later.'),
              callout(b('Everything in nature settles into the lowest-energy arrangement available to it. '), 'A ball rolls downhill. Water finds its level. And an atom will rearrange its electrons if doing so puts it in a lower-energy state.'),
              p('It turns out that having a ', b('full outer shell'), ' of electrons is a particularly low-energy arrangement. Unit 4 explains why in terms of where the electrons actually sit; for now, take it as the observed fact that it is.'),
              p('For most of the atoms you will meet, a full outer shell means ', b('eight'), ' electrons. So an atom with a nearly-full shell will grab the one or two it needs, and an atom with a nearly-empty shell will dump the one or two it has — because reaching the full shell either way lowers its energy.'),
              h4('Which explains the two directions'),
              table(['Situation', 'Cheaper route', 'Result'], [
                ['One electron in the outer shell (sodium)', 'Lose it. Finding seven more is hopeless.', 'Na⁺, a positive ion'],
                ['Seven in the outer shell (chlorine)', 'Gain one. Losing seven is hopeless.', 'Cl⁻, a negative ion'],
                ['Two in the outer shell (magnesium)', 'Lose both.', 'Mg²⁺'],
                ['Six in the outer shell (oxygen)', 'Gain two.', 'O²⁻'],
                ['Already full (neon)', 'Do nothing.', 'no ion — which is why noble gases do not react'],
                ['Four in the outer shell (carbon)', 'Neither — both are too expensive.', 'shares instead, which is why carbon makes covalent bonds'],
              ]),
              p('That table is the whole of ionic chemistry in one picture, and the last two rows are the interesting ones. Noble gases are unreactive because they have nothing to gain. Carbon shares because it is stuck exactly halfway.'));
          },
        },
        {
          h: 'The signs, which catch everybody',
          body() {
            return frag(
              p('Lose an electron and the atom becomes ', b('positive'), '. That feels backwards the first time — you removed something, so surely it should be less of something.'),
              p('The trick is to remember that the electron is the ', em('negative'), ' one. Take a negative away and what is left is more positive. The protons have not changed; there is simply one less negative charge to cancel them out.'),
              eq('charge = protons − electrons'),
              worked('Sodium loses one electron. What is the ion?', [
                { q: 'What has sodium got?', why: '11 protons, and as a neutral atom, 11 electrons.' },
                { q: 'Lose one electron', why: 'Still 11 protons; now 10 electrons.' },
                { q: 'Net charge', why: 'Eleven positives, ten negatives.', maths: '11 − 10 = +1, so Na⁺' },
                { q: 'Is it still sodium?', why: 'Yes. The protons did not change, and protons are the identity. It is a sodium ion — chemically nothing like sodium metal, and still the element sodium.' },
              ]),
              table(['Name', 'What it is', 'Charge'], [
                ['Cation', 'an ion that has lost electrons', 'positive'],
                ['Anion', 'an ion that has gained electrons', 'negative'],
              ], 'Remember cation with the t as a plus sign, or "paw-sitive cat". Anion has the n of negative.'));
          },
        },
        {
          h: 'Predicting the charge from the table',
          body() {
            return frag(
              p('The best part: you do not have to learn these. The group number on the periodic table tells you how many outer electrons an atom has, and the charge follows.'),
              table(['Group', 'Outer electrons', 'Does what', 'Charge'], [
                ['1', '1', 'loses one', '1+'],
                ['2', '2', 'loses two', '2+'],
                ['13', '3', 'loses three', '3+'],
                ['15', '5', 'gains three', '3−'],
                ['16', '6', 'gains two', '2−'],
                ['17', '7', 'gains one', '1−'],
                ['18', '8 — already full', 'nothing', 'none'],
              ], 'Groups 14 and the transition metals are the exceptions, for reasons the table below explains.'),
              p('Notice the symmetry: the charge is the group number for the metals on the left, and the group number minus 18 for the non-metals on the right. Both are just "how far is it from a full shell, and which way is nearer".'),
              h4('The two sets of exceptions'),
              p(b('Group 14 '), '— carbon and silicon — sits exactly halfway, so neither gaining four nor losing four is affordable. They share instead. This is why carbon builds molecules rather than salts, and therefore why there is an entire branch of chemistry devoted to it.'),
              p(b('The transition metals '), 'genuinely take more than one charge: iron is happy as 2+ or 3+, copper as 1+ or 2+. That is not vagueness on the part of the chemistry — it is a real fact about them, and it is exactly why their names carry Roman numerals. Iron(II) chloride and iron(III) chloride are different compounds, and the numeral is there to say which.'),
              goto('See every element’s charge, with the reason', '#/reference/charges',
                'Derived from each element’s group rather than stored as a list, so it cannot disagree with the table.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'An atom loses an electron. Why does it become positive?',
          options: [
            { t: 'Because the electron was the negative part — taking a negative away leaves a surplus of positive.', ok: true,
              why: 'Exactly. The protons never moved. There is just one fewer negative charge to cancel them, so the balance tips positive.' },
            { t: 'Because it has less mass.', ok: false,
              why: 'It does have very slightly less mass, and mass has nothing to do with charge. It is the loss of a negative that makes it positive.' },
            { t: 'Because it gained a proton.', ok: false,
              why: 'It did not — and if it had, it would be a different element. Ions come from changing electrons only.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'Why do noble gases not form ions?',
          options: [
            { t: 'Their outer shell is already full, so there is nothing to gain by changing.', ok: true,
              why: 'Right, and that is the whole explanation for their unreactivity. Everything else is doing chemistry in order to reach the arrangement they already have.' },
            { t: 'They are too heavy.', ok: false,
              why: 'Helium is the second lightest element there is. Weight is not the reason.' },
            { t: 'They have no electrons to lose.', ok: false,
              why: 'They have plenty — xenon has 54. They are held tightly because the shell is complete.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'Sodium is in group 1. What ion does it form?',
          options: [
            { t: 'Na⁺', ok: true, why: 'One electron in the outer shell, so it loses it. Group 1 always gives 1+.' },
            { t: 'Na⁻', ok: false, why: 'To gain a full shell by taking electrons it would need seven more, which is far harder than losing one.' },
            { t: 'Na²⁺', ok: false, why: 'It has only one outer electron to lose. Taking a second would have to break into a full shell underneath.' },
          ] },
        { kind: 'choice', q: 'Oxygen is in group 16. What ion does it form?',
          options: [
            { t: 'O²⁻', ok: true, why: 'Six outer electrons, two short of eight, so it gains two.' },
            { t: 'O²⁺', ok: false, why: 'Losing six electrons is hopeless when gaining two will do.' },
            { t: 'O⁻', ok: false, why: 'One is not enough — it needs two to complete the shell.' },
          ] },
        { kind: 'count', q: 'An Mg²⁺ ion. How many electrons does it have? (Magnesium has 12 protons.)', answer: 10,
          right: '10. Twelve protons, and it has lost two electrons, so 12 − 2 = 10 — the same as neon, which is the point.',
          wrong: 'Start from the neutral atom’s 12 electrons and remove as many as the positive charge says.',
          hints: { 12: 'That is the neutral atom. The 2+ means two electrons have gone.', 14: 'A positive charge means electrons were lost, not gained.' } },
        { kind: 'count', q: 'A Cl⁻ ion. How many electrons? (Chlorine has 17 protons.)', answer: 18,
          right: '18 — one more than its 17 protons, which is what makes it negative. And 18 is argon’s count, which is exactly what it was after.',
          wrong: 'A negative charge means it gained electrons.',
          hints: { 16: 'Negative means gained, so the count goes up from 17, not down.' } },
        { kind: 'choice', q: 'Why does iron need a Roman numeral in its name but sodium does not?',
          options: [
            { t: 'Because iron genuinely takes more than one charge and sodium only ever takes 1+.', ok: true,
              why: 'Right. Iron(II) and iron(III) compounds are different substances, so the name has to say which. Sodium is 1+ every time, so there is nothing to disambiguate.' },
            { t: 'Because iron is a transition metal and they all need numerals.', ok: false,
              why: 'Nearly all do, and a handful — zinc, silver, cadmium — take only one charge and are named without one. The numeral is there when it is needed.' },
            { t: 'Because iron is heavier.', ok: false, why: 'Weight has nothing to do with it.' },
          ] },
        { kind: 'choice', q: 'Why does carbon not form ions readily?',
          options: [
            { t: 'It has four outer electrons, so gaining four and losing four are both too expensive. It shares instead.', ok: true,
              why: 'Exactly, and that is why carbon builds molecules rather than salts — and therefore why organic chemistry exists as a subject at all.' },
            { t: 'It is unreactive.', ok: false,
              why: 'Carbon is extremely versatile chemically. It just does its chemistry by sharing.' },
            { t: 'Its shell is already full.', ok: false,
              why: 'Four out of eight is exactly half. Being halfway is what makes both routes unattractive.' },
          ] },
        { kind: 'sort', q: 'Sort these into what they form.',
          categories: ['Forms a positive ion', 'Forms a negative ion', 'Forms no ion'],
          items: [
            { t: 'Sodium', cat: 'Forms a positive ion' }, { t: 'Magnesium', cat: 'Forms a positive ion' },
            { t: 'Aluminium', cat: 'Forms a positive ion' }, { t: 'Chlorine', cat: 'Forms a negative ion' },
            { t: 'Oxygen', cat: 'Forms a negative ion' }, { t: 'Nitrogen', cat: 'Forms a negative ion' },
            { t: 'Neon', cat: 'Forms no ion' }, { t: 'Argon', cat: 'Forms no ion' },
          ],
          right: 'Yes. Metals on the left lose; non-metals on the right gain; noble gases already have what everyone else is after.',
          wrong: 'Ask which side of the table it is on, and therefore whether it is nearer a full shell by gaining or by losing.' },
      ],
      practice: 'ion-charge',
      mistakes: [
        { wrong: 'Thinking losing an electron makes an atom negative.',
          why: 'The electron is the negative part. Removing it leaves the positive protons less cancelled, so the ion is positive. Losing a negative makes you more positive.' },
        { wrong: 'Thinking an ion is a different element.',
          why: 'Na and Na⁺ are both sodium — same protons. Only the electrons changed. Their chemistry is utterly different and their identity is the same.' },
        { wrong: 'Trying to predict a transition metal’s charge from its group.',
          why: 'It genuinely varies, which is why the Roman numeral exists. For iron, copper, lead and the rest, you read the charge off the name or work it out backwards from the formula.' },
        { wrong: 'Expecting group 14 to form 4+ or 4− ions.',
          why: 'Both are far too expensive. Carbon and silicon share electrons instead, and that choice is the foundation of organic chemistry.' },
      ],
      recap: [
        'Atoms settle into the lowest-energy arrangement available, and a full outer shell — usually eight electrons — is a low-energy arrangement.',
        'So an atom close to full grabs the electrons it needs, and an atom with almost none dumps what it has. Whichever is cheaper.',
        'Losing electrons makes a positive ion (a cation); gaining them makes a negative one (an anion). Charge = protons − electrons.',
        'The group number tells you the charge for the main-group elements, so there is nothing to memorise.',
        'Group 14 shares instead, and the transition metals genuinely take several charges — which is why their names carry Roman numerals.',
      ],
    },

    ],
  });
})();
