/* Unit 4: Electrons and where they live. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, eq, table, worked, figure, goto } = K;
  const el = ME.el;

  ME.course.unit({
    n: 4, id: 'electrons',
    title: 'Electrons and where they live',
    blurb: 'The electrons do all the chemistry, so where they sit decides everything. This unit is the one that makes the periodic table stop being a list.',
    lessons: [

    {
      id: 'energy-levels',
      keywords: 'energy level shell emission spectrum flame test quantised',
      title: 'Energy levels: why electrons cannot sit anywhere',
      mins: 16,
      builds_on: ['atom-story'],
      hook() {
        return frag(
          p('Heat sodium in a flame and it glows a particular orange — the same orange as an old street lamp. Heat copper and you get green. Heat lithium and you get crimson.'),
          p('Not a spread of colours. One specific colour, the same every time, precise enough that astronomers use it to work out what distant stars are made of.'),
          p('If electrons could have any energy at all, heating an atom would give a smear across the whole spectrum. Sharp single colours mean the energies available are not continuous. They come in steps.'));
      },
      pages: [
        {
          h: 'The staircase, not the ramp',
          body() {
            return frag(
              p('An electron in an atom cannot have just any energy. It can only have one of a specific set of values — like standing on a staircase rather than a ramp. There are steps, and there is nothing in between them.'),
              p('These allowed energies are ', b('energy levels'), ', or shells. They are numbered outwards from the nucleus: level 1 is closest and lowest in energy, level 2 next, and so on.'),
              p('Why lowest at the bottom? Because the nucleus is positive and the electron is negative, so they attract. Being close is comfortable and low-energy. Getting further away means fighting that attraction, which costs energy — in the same way that lifting something costs energy against gravity.'),
              h4('And that is where the colours come from'),
              p('Give an atom energy — heat it, or pass electricity through it — and an electron can jump up a level. It does not stay there; it falls back almost immediately, and as it falls it releases the energy it gained as light.'),
              callout(b('And here is the point. '), 'The gap between two specific levels is a specific amount of energy, and a specific amount of energy is a specific colour of light. So a sodium atom can only emit certain colours, because it only has certain gaps. That orange street-lamp glow is one particular electron falling one particular step, in every sodium atom, every time.'),
              p('Which is why this is so useful: every element has its own set of gaps, and therefore its own fingerprint of colours. Split the light from a star and you can read off which elements are in it, from here. Helium was discovered in the Sun before anybody found it on Earth.'));
          },
        },
        {
          h: 'How many fit in each level',
          body() {
            return frag(
              p('Each level holds a limited number of electrons, and once it is full the next electron has to go further out.'),
              table(['Level', 'Holds up to', 'Full when the element is'], [
                ['1', '2', 'helium'],
                ['2', '8', 'neon'],
                ['3', '8 in practice for the first 20 elements', 'argon'],
                ['4', '8, then more once the d-block starts filling', 'krypton'],
              ], 'The pattern 2, 8, 8 will get you correctly through the first twenty elements, which is most of what school chemistry needs.'),
              p('The third level is the one that is more complicated than it looks. It can hold 18 in total, but the first 8 go in, then level 4 starts, and only then does level 3 finish. That out-of-order filling is what produces the transition metals, and the next lesson explains why.'),
              callout(b('For now: 2, 8, 8. '), 'It is not the whole truth and it is right for every element up to calcium, which covers the vast majority of the chemistry in this course.'),
              h4('Which explains the periodic table’s shape'),
              p('Count the levels and their capacities and the table’s rows appear on their own. Two elements before level 1 is full — hence a first row of only two. Eight more before level 2 is full — hence a row of eight. Eight more again — another row of eight.'),
              p('The table is not a convenient arrangement somebody chose. It is what happens when you write the elements out in order and start a new line every time a shell fills up.'));
          },
        },
        {
          h: 'And why this makes a full shell special',
          body() {
            return frag(
              p('The last unit asserted that a full outer shell is a low-energy arrangement, and asked you to take it on trust. Here is the reason.'),
              p('Electrons fill from the bottom up, because low is comfortable. Once a level is complete, the next electron has no choice but to start a new level, much further out — which is a big jump in energy, and therefore a substantial cost.'),
              p('So a full shell sits at the bottom of a steep step. Adding to it is expensive because the next place is far away; taking from it is expensive because you are pulling an electron out of a comfortable, tightly held arrangement.'),
              eq('full shell = at the bottom of a step, with the next step a long way up'),
              p('That is what stability means here. Not that the atom is inert by nature, but that both of its options — gain or lose — cost more energy than they return.'),
              callout(b('And it explains the group 1 metals’ violence. '), 'Sodium has one lonely electron in a brand new level, sitting at the top of the step, a long way from the nucleus and shielded from it by everything underneath. It is barely held on at all. Which is why sodium will hand it to almost anything, including water, with a bang.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why does sodium glow one specific orange rather than a spread of colours?',
          options: [
            { t: 'Because the gap between two of its energy levels is one specific size, and one specific energy is one specific colour.', ok: true,
              why: 'Exactly. Sharp lines are direct evidence that the allowed energies come in steps. A ramp would give a smear; a staircase gives lines.' },
            { t: 'Because sodium is orange.', ok: false,
              why: 'Sodium metal is silvery. The orange is emitted light, from electrons falling between levels.' },
            { t: 'Because the flame is orange.', ok: false,
              why: 'A gas flame is blue. Drop sodium in and it turns orange, and drop lithium in and it turns crimson — the colour comes from the metal.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'Why is sodium so reactive?',
          options: [
            { t: 'Its single outer electron sits in a new level, far from the nucleus and shielded from it, so it is barely held.', ok: true,
              why: 'Right. Being at the top of a step with everything underneath getting in the way makes that electron cheap to give away — which is exactly what sodium does, violently.' },
            { t: 'Because it is a soft metal.', ok: false,
              why: 'It is soft, and that is a consequence of weak metallic bonding rather than the cause of its reactivity.' },
            { t: 'Because it has a lot of electrons.', ok: false,
              why: 'It has eleven, which is not many. What matters is where the outermost one sits.' },
          ] },
      ],
      quizzes: [
        { kind: 'count', q: 'How many electrons fit in the first energy level?', answer: 2,
          right: 'Two — which is why helium, with two, is already full and completely unreactive.',
          wrong: 'The first level is the small one.', hints: { 8: 'That is the second level. The first is smaller.' } },
        { kind: 'count', q: 'How many electrons fit in the second energy level?', answer: 8,
          right: 'Eight — which is why the second row of the periodic table has eight elements in it.',
          wrong: 'Think about how many elements there are in the second row of the table.' },
        { kind: 'choice', q: 'What happens when an electron falls from a higher level to a lower one?',
          options: [
            { t: 'It releases the energy difference as light.', ok: true,
              why: 'Right, and the colour of that light is set by the size of the gap. It is how flame tests work, how neon signs work, and how we know what stars are made of.' },
            { t: 'It absorbs energy.', ok: false, why: 'Absorbing energy makes it jump up. Falling releases.' },
            { t: 'Nothing observable.', ok: false, why: 'It is extremely observable — it is light.' },
          ] },
        { kind: 'choice', q: 'Why does an electron further from the nucleus have more energy?',
          options: [
            { t: 'Because it has been moved against the nucleus’s attraction, which costs energy.', ok: true,
              why: 'Yes — the same logic as lifting something against gravity. Further out means more energy stored.' },
            { t: 'Because it moves faster.', ok: false,
              why: 'Outer electrons actually move more slowly on average. The energy is in the separation.' },
            { t: 'Because it is bigger.', ok: false, why: 'Electrons are all identical. Only their position and energy differ.' },
          ] },
        { kind: 'choice', q: 'Helium was discovered in the Sun before it was found on Earth. How?',
          options: [
            { t: 'Its emission lines appeared in sunlight and matched no known element.', ok: true,
              why: 'Right — in 1868, during an eclipse. Every element has its own set of energy gaps and therefore its own fingerprint of colours, which is readable from 150 million kilometres away.' },
            { t: 'A probe brought some back.', ok: false, why: 'Nothing has ever been to the Sun and back. This was done with a prism.' },
            { t: 'It was predicted mathematically.', ok: false,
              why: 'It was seen, in the spectrum. The name comes from helios, the Greek for sun.' },
          ] },
        { kind: 'choice', q: 'What does it actually mean to say a full outer shell is "stable"?',
          options: [
            { t: 'That both gaining and losing an electron would cost more energy than they return.', ok: true,
              why: 'Right, and that is a much more useful way to hold it than "atoms want eight electrons". Nothing wants anything — it is simply that neither option pays.' },
            { t: 'That the atom cannot react at all.', ok: false,
              why: 'Xenon can be made to react under pressure with fluorine. Stability is about cost, not impossibility.' },
            { t: 'That the electrons stop moving.', ok: false, why: 'They do not stop. Stability is about energy, not motion.' },
          ] },
        { kind: 'order', q: 'Order these by energy, lowest first.',
          items: ['An electron in level 1', 'An electron in level 2', 'An electron in level 3', 'An electron removed from the atom entirely'],
          right: 'Yes. Each step out costs energy, and removing it altogether costs the most — that cost is the ionisation energy, which Unit 5 measures.',
          wrong: 'Further from the nucleus means more energy, because you have worked against the attraction to get there.' },
      ],
      mistakes: [
        { wrong: 'Thinking atoms "want" a full shell.',
          why: 'Convenient shorthand and worth unlearning. Atoms do not want anything. They end up in low-energy arrangements for the same reason water ends up at the bottom of a hill, and a full shell happens to be one.' },
        { wrong: 'Picturing energy levels as physical orbits at fixed distances.',
          why: 'They are energies, not paths. The next lesson gets closer to what the shape really is, and the important thing here is the ordering: higher level, more energy, further out on average.' },
        { wrong: 'Assuming the 2, 8, 8 rule holds for every element.',
          why: 'It is right up to calcium and then the third level goes back to filling. That out-of-order filling is what makes the transition metals, and it is the next lesson.' },
      ],
      recap: [
        'Electrons can only have certain energies — a staircase, not a ramp. The evidence is that heated atoms emit sharp single colours rather than a smear.',
        'The gap between two levels is a fixed energy, and a fixed energy is a fixed colour. So every element has its own fingerprint of colours, readable across the galaxy.',
        'Levels fill from the bottom up: 2, then 8, then 8 for the first twenty elements. That is why the periodic table has the rows it has.',
        'A full shell is stable because it sits at the bottom of a steep step — adding means starting a distant new level, and removing means pulling from a tightly held one.',
      ],
    },

    {
      id: 'orbitals',
      keywords: 's p d f orbital shape probability cloud',
      title: 'Orbitals: the shapes electrons actually occupy',
      mins: 16,
      builds_on: ['energy-levels'],
      hook() {
        return frag(
          p('The picture of electrons circling the nucleus like planets is on every textbook cover, and it is wrong in an interesting way.'),
          p('It is not wrong about the energies. It is wrong about the paths — because electrons do not have paths. You cannot say where an electron is; you can only say where it probably is.'),
          p('And the shapes of those probability regions turn out to matter enormously, because they are the reason molecules have shapes at all.'));
      },
      pages: [
        {
          h: 'A region, not a route',
          body() {
            return frag(
              p('An ', term('orbital', 'A region around the nucleus where an electron is likely to be found, with a definite shape and a definite energy. It holds at most two electrons.'), ' is a region where an electron is likely to be. Not a track it runs along — a cloud of probability, denser where the electron spends more of its time.'),
              p('This is genuinely strange and worth being honest about. It is not that we do not know where the electron is and could find out with better equipment. On the scale of an atom, having a definite position is simply not something an electron does. That is uncomfortable, it is what the experiments say, and for chemistry the consequence is manageable: work with the regions and their shapes.'),
              callout(b('Every orbital holds at most two electrons. '), 'Two, and no more, ever. That one fact drives the whole filling pattern, and therefore the whole periodic table.'));
          },
        },
        {
          h: 'The four shapes',
          body() {
            return frag(
              p('Orbitals come in a few shapes, labelled with letters for historical reasons.'),
              table(['Type', 'Shape', 'How many of them', 'Electrons held'], [
                ['s', 'a sphere', '1 per level', '2'],
                ['p', 'a dumbbell, two lobes either side of the nucleus', '3 per level, at right angles to each other', '6'],
                ['d', 'four lobes, mostly', '5 per level', '10'],
                ['f', 'complicated', '7 per level', '14'],
              ]),
              p('The s orbital is spherical, so an electron in one is equally likely in any direction. The p orbitals are the first ones with a direction: three of them, pointing along x, y and z, at right angles.'),
              callout(b('And that is where molecular shape comes from. '), 'The p orbitals point at right angles, so the bonds an atom makes using them point in particular directions too — which is why water is bent and methane is a tetrahedron rather than everything being flat and arbitrary. Unit 6 builds shapes properly, and this is the foundation of it.'),
              p('You can see the real shapes, rotating, in the Elements tab: each element shows the orbital types it actually uses.'),
              goto('See the 3D orbitals', '#/elements/C', 'Carbon uses s and p. Drag them round.'));
          },
        },
        {
          h: 'Why the levels hold the numbers they do',
          body() {
            return frag(
              p('The capacities from the last lesson — 2, 8, 8 — now stop being arbitrary. They are just the orbitals added up.'),
              table(['Level', 'Orbitals available', 'Electrons'], [
                ['1', 'one s', '2'],
                ['2', 'one s, three p', '2 + 6 = 8'],
                ['3', 'one s, three p, five d', '2 + 6 + 10 = 18'],
                ['4', 'one s, three p, five d, seven f', '2 + 6 + 10 + 14 = 32'],
              ], 'Two electrons per orbital, every time. The capacities follow.'),
              p('So level 2 holds eight because it has four orbitals, and four orbitals hold eight electrons. Nothing was decided; it was counted.'),
              h4('And the out-of-order filling'),
              p('Level 3 can hold 18, but the row of the periodic table it belongs to has only 8 elements. The reason is that the 3d orbitals are ', b('higher in energy than the 4s'), ' — the levels overlap.'),
              p('Electrons fill lowest-energy first, so after 3s and 3p are full, the next cheapest place is 4s, not 3d. Only when 4s is full do the 3d orbitals start filling — and those ten elements are the first row of transition metals.'),
              callout(b('So the transition metals are the d orbitals filling late. '), 'That is the whole explanation for that block of the table existing, and for it being ten wide.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'count', after: 1,
          q: 'How many electrons can a single orbital hold?',
          answer: 2,
          right: 'Two. Always, whatever type it is — and this one fact generates the whole filling pattern.',
          wrong: 'The same number for every orbital, whatever its shape.',
          hints: { 8: 'That is a whole level of s and p together, not one orbital.',
                   6: 'That is all three p orbitals together. One on its own holds fewer.',
                   1: 'One more than that — two electrons can share an orbital.' } },
        { kind: 'choice', after: 2,
          q: 'Why does the third row of the periodic table have 8 elements when level 3 can hold 18 electrons?',
          options: [
            { t: 'Because the 3d orbitals are higher in energy than the 4s, so level 4 starts before level 3 finishes.', ok: true,
              why: 'Exactly. Electrons take the cheapest available place, and after 3p that is 4s. The 3d orbitals fill afterwards, and those ten elements are the first transition metals.' },
            { t: 'Because level 3 only holds 8.', ok: false,
              why: 'It holds 18 — one s, three p and five d. It just does not fill all at once.' },
            { t: 'Because the table was drawn that way for convenience.', ok: false,
              why: 'The shape is forced by the filling order, not chosen. The overlap between levels 3 and 4 is a real energy fact.' },
          ] },
      ],
      quizzes: [
        { kind: 'match', q: 'Match each orbital type to its shape.',
          pairs: [['s', 'a sphere'], ['p', 'a dumbbell with two lobes'], ['d', 'usually four lobes'], ['f', 'complicated']],
          right: 'Yes. The s is the only spherical one, which is why it has no direction and the p orbitals do.',
          wrong: 'The simplest shape goes with the simplest letter.' },
        { kind: 'count', q: 'How many p orbitals are there in a given energy level?', answer: 3,
          right: 'Three, at right angles to each other along x, y and z — which is where molecular shapes come from.',
          wrong: 'Think about how many directions are at right angles in three dimensions.',
          hints: { 6: 'That is how many electrons three p orbitals hold. The question is how many orbitals.' } },
        { kind: 'count', q: 'How many electrons can the five d orbitals hold altogether?', answer: 10,
          right: '10 — five orbitals, two each. Which is why there are ten transition metals in each row.',
          wrong: 'Five orbitals, two electrons each.' },
        { kind: 'choice', q: 'Why is water a bent molecule rather than a straight one?',
          options: [
            { t: 'Because the orbitals oxygen uses point in particular directions rather than anywhere.', ok: true,
              why: 'Right — this is the foundation and Unit 6 finishes the job. If orbitals had no directions, molecular shape would be arbitrary, and it is not.' },
            { t: 'Because the hydrogens repel each other.', ok: false,
              why: 'They do repel, and that alone would push them to opposite sides and make it straight. The directional orbitals are why it is bent.' },
            { t: 'Because water is a liquid.', ok: false, why: 'The shape of the molecule is the same in ice, water and steam.' },
          ] },
        { kind: 'choice', q: 'What does it mean to say an electron has no definite position?',
          options: [
            { t: 'That having a definite position is not something an electron does, not merely that we cannot measure it.', ok: true,
              why: 'Right, and it is worth sitting with how odd that is. Better instruments would not help. What an orbital gives you is a probability distribution, and that turns out to be enough for all of chemistry.' },
            { t: 'That our instruments are not good enough yet.', ok: false,
              why: 'This is the natural reading and it is not what the physics says. The indefiniteness is a property of the electron, not of the equipment.' },
            { t: 'That electrons move too fast to see.', ok: false,
              why: 'Speed is not the issue. Even in principle, with unlimited time, there is no definite position to find.' },
          ] },
        { kind: 'numeric', q: 'A level has one s, three p and five d orbitals. How many electrons can it hold in total?', answer: 18, tol: 0.001,
          right: '18. Nine orbitals, two electrons each.',
          wrong: 'Count the orbitals first, then double it.' },
        { kind: 'choice', q: 'Why do the transition metals exist as a block ten elements wide?',
          options: [
            { t: 'Because the five d orbitals hold ten electrons, and they fill after the s orbital of the next level up.', ok: true,
              why: 'Right — ten electrons to place means ten elements in the block, and the late filling is why it sits where it does in the table.' },
            { t: 'Because there are ten useful metals.', ok: false,
              why: 'The number comes from orbital capacity, not from usefulness.' },
            { t: 'Because they all have ten outer electrons.', ok: false,
              why: 'They have one or two outer electrons; it is the d orbitals underneath that are filling.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Picturing electrons on circular tracks.',
          why: 'There are no tracks. An orbital is a region of probability with a shape. The planetary picture gets the energies right and the geometry wrong, and the geometry is what shapes molecules.' },
        { wrong: 'Thinking an orbital and an energy level are the same thing.',
          why: 'A level contains several orbitals. Level 2 has four of them — one s and three p — which is why it holds eight electrons rather than two.' },
        { wrong: 'Assuming levels fill strictly in order.',
          why: '4s fills before 3d, because it is lower in energy. The overlap is exactly what creates the transition metals.' },
      ],
      recap: [
        'An orbital is a region of probability with a definite shape and energy, and it holds at most two electrons — always two.',
        'Shapes: s is a sphere, p is a dumbbell and there are three of them at right angles, d has five, f has seven.',
        'The level capacities 2, 8, 18, 32 are just the orbitals counted and doubled.',
        'The p orbitals pointing in particular directions is why molecules have shapes at all.',
        '4s is lower in energy than 3d, so levels overlap — and that late d filling is exactly what the transition metals are.',
      ],
    },

    {
      id: 'configurations',
      keywords: 'electron configuration filling order aufbau noble gas shorthand diagonal rule',
      title: 'Electron configurations, and the filling order',
      mins: 18,
      builds_on: ['orbitals'],
      hook() {
        return frag(
          p('There is an exam question that looks like memorisation and is not: "write the electron configuration of iron".'),
          p('The answer is 1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d⁶, and you can work it out from a diagram you can draw from scratch in ten seconds.'),
          p('More usefully, once you can do it, the periodic table’s entire shape and most of its chemistry becomes obvious rather than something to learn.'));
      },
      pages: [
        {
          h: 'The notation',
          body() {
            return frag(
              p('A configuration is a list of which orbitals hold how many electrons, written in filling order.'),
              eq('1s² 2s² 2p⁶'),
              p('Read it as three pieces of information each time: the ', b('number'), ' is the energy level, the ', b('letter'), ' is the orbital type, and the ', b('superscript'), ' is how many electrons are in it.'),
              p('So 2p⁶ means: level 2, the p orbitals, holding six electrons. Since there are three p orbitals and each holds two, six means they are full.'),
              table(['Element', 'Electrons', 'Configuration'], [
                ['hydrogen', '1', '1s¹'],
                ['helium', '2', '1s² — level 1 is now full'],
                ['lithium', '3', '1s² 2s¹ — a new level starts'],
                ['carbon', '6', '1s² 2s² 2p²'],
                ['neon', '10', '1s² 2s² 2p⁶ — level 2 full'],
                ['sodium', '11', '1s² 2s² 2p⁶ 3s¹ — a new level again'],
              ]),
              callout(b('Look at lithium and sodium. '), 'Both end in a lone electron in a brand new s orbital. That is why they behave so similarly, and why they are in the same group. The configuration explains the family.'));
          },
        },
        {
          h: 'The filling order, and a diagram you can draw',
          body() {
            return frag(
              p('Electrons fill the lowest-energy orbital available. The awkward part is that the order is not simply 1, 2, 3 — because 4s is below 3d, as the last lesson explained.'),
              p('The actual order is:'),
              eq('1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d'),
              p('Nobody memorises that. You get it from a diagram: write the levels in rows, with the orbital types each one has, then read the diagonals.'),
              figure('Write the rows, then read diagonally down-left to up-right. Each arrow gives the next few orbitals in order.',
                el('pre', { class: 'lesson-pre', text:
'1s\n2s 2p\n3s 3p 3d\n4s 4p 4d 4f\n5s 5p 5d 5f\n6s 6p 6d\n7s 7p' })),
              p('Follow the diagonals and out comes 1s, then 2s, then 2p and 3s, then 3p and 4s, then 3d and 4p and 5s, and so on. It takes ten seconds to draw and removes any need to remember the sequence.'),
              h4('Two rules for filling within a set'),
              p(b('One at a time first. '), 'Given three empty p orbitals and three electrons, they go one into each rather than two into one. Electrons repel, so spreading out is lower in energy. Only when every orbital in the set has one does pairing start.'),
              p(b('Two per orbital, no more. '), 'Which is the rule from the last lesson, and sets every capacity.'),
              p('You can see both rules drawn out for any element in the Elements tab, as boxes with arrows.'));
          },
        },
        {
          h: 'Working them out, including the shorthand',
          body() {
            return frag(
              worked('Write the configuration of sulfur, which has 16 electrons.', [
                { q: 'Fill in order from the diagonal diagram', why: '1s takes 2, leaving 14. 2s takes 2, leaving 12. 2p takes 6, leaving 6. 3s takes 2, leaving 4. 3p can take 6 and only 4 are left, so it gets 4.' },
                { q: 'Write it out', why: 'Check the superscripts add to 16.', maths: '1s² 2s² 2p⁶ 3s² 3p⁴' },
                { q: 'What does it tell you?', why: 'The outer level has 2 + 4 = 6 electrons, two short of eight. So sulfur gains two electrons and forms S²⁻ — which you could also have read off its group.' },
              ]),
              worked('Write the configuration of iron, which has 26 electrons.', [
                { q: 'Follow the order, watching the 4s and 3d swap', why: '1s² 2s² 2p⁶ 3s² 3p⁶ accounts for 18. Next in order is 4s, which takes 2, leaving 6. Then 3d, which takes the remaining 6.' },
                { q: 'Write it out', why: '2+2+6+2+6+2+6 = 26.', maths: '1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d⁶' },
                { q: 'And why iron can be 2+ or 3+', why: 'Its outermost electrons are the two in 4s, which come off first to give Fe²⁺. A 3d electron can also be removed without much extra cost, giving Fe³⁺. That near-equal cost is the whole reason transition metals have variable charges.' },
              ]),
              h4('The noble gas shorthand'),
              p('Writing out the first eighteen every time is tedious, so you can abbreviate any full noble-gas core in square brackets.'),
              eq('iron:  [Ar] 4s² 3d⁶'),
              p('[Ar] stands for argon’s entire configuration, 1s² 2s² 2p⁶ 3s² 3p⁶. This is not just laziness — it puts the chemically interesting electrons at the front where you can see them, and buries the ones that never do anything.'),
              goto('See any element’s configuration, drawn out', '#/elements/Fe',
                'With the shell diagram and the orbital boxes, and the noble-gas core expanded.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'You have three empty p orbitals and three electrons to place. Where do they go?',
          options: [
            { t: 'One in each, because electrons repel and spreading out is lower in energy.', ok: true,
              why: 'Right. Pairing two into one orbital forces two negative charges into the same region, which costs energy. They only pair up once every orbital in the set has one.' },
            { t: 'Two in the first, one in the second.', ok: false,
              why: 'That pairs two electrons unnecessarily while an orbital sits empty. Spreading out first is cheaper.' },
            { t: 'All three in the first.', ok: false, why: 'An orbital holds two at most, whatever else is going on.' },
          ] },
        { kind: 'fillstep', after: 2,
          q: 'Complete the configuration of chlorine, which has 17 electrons.',
          steps: [
            { text: '1s² 2s² 2p⁶ 3s² accounts for 12 electrons.' },
            { text: 'That leaves 5, and the next orbitals in order are the 3p set.' },
            { blank: true, before: 'So the configuration ends in 3p', after: '' },
          ],
          numeric: true, answer: 5, tol: 0.001,
          right: '3p⁵. Five electrons in the p orbitals — one short of the six that would fill them, which is exactly why chlorine grabs one electron and forms Cl⁻.',
          wrong: '17 electrons, and 12 are used up before the 3p set. How many are left?' },
      ],
      quizzes: [
        { kind: 'name', mode: 'name', q: 'Write the electron configuration of nitrogen, which has 7 electrons. Superscripts are optional — type them plainly if that is easier.',
          answer: '1s2 2s2 2p3', also: ['1s² 2s² 2p³', '1s22s22p3'],
          right: '1s² 2s² 2p³. And note the three p electrons sit one in each orbital, which is what makes nitrogen form three bonds.',
          wrong: 'Fill 1s, then 2s, then 2p, and check the superscripts add to 7.' },
        { kind: 'name', mode: 'name', q: 'Write the electron configuration of calcium (20 electrons).',
          answer: '1s2 2s2 2p6 3s2 3p6 4s2', also: ['1s² 2s² 2p⁶ 3s² 3p⁶ 4s²', '[Ar] 4s2', '[Ar]4s2'],
          right: '1s² 2s² 2p⁶ 3s² 3p⁶ 4s², or [Ar] 4s² for short. The 4s fills before the 3d.',
          wrong: 'After 3p⁶ you have 18 electrons. The next orbital in the filling order is 4s, not 3d.' },
        { kind: 'count', q: 'How many electrons are in the outer level of an atom with configuration 1s² 2s² 2p⁶ 3s² 3p⁴?', answer: 6,
          right: 'Six — the 3s² and 3p⁴ together. Two short of eight, so this element gains two electrons. It is sulfur.',
          wrong: 'Add up the electrons in the highest-numbered level.',
          hints: { 4: 'The 3s electrons are in the outer level too, not just the 3p ones.',
                   16: 'That is the total for the whole atom. The question is about the outermost level only.' } },
        { kind: 'choice', q: 'Why does 4s fill before 3d?',
          options: [
            { t: 'Because 4s is lower in energy than 3d, and electrons take the cheapest place available.', ok: true,
              why: 'Right. The levels overlap in energy, so the level number is not a reliable guide to the order — which is exactly why the diagonal diagram exists.' },
            { t: 'Because 4s is closer to the nucleus.', ok: false,
              why: 'It is further out on average. Energy, not distance, decides the order — and the two do not always agree.' },
            { t: 'Because 3d does not exist until later.', ok: false,
              why: 'The orbitals exist regardless; the question is only which one an electron goes into first.' },
          ] },
        { kind: 'choice', q: 'What does [Ne] 3s² 3p⁵ mean?',
          options: [
            { t: 'Argon’s... no — neon’s ten electrons, plus seven more in level 3. It is chlorine.', ok: true,
              why: 'Right: 10 + 2 + 5 = 17, which is chlorine. The shorthand hides the ten electrons that never do any chemistry and shows the seven that do.' },
            { t: 'An atom with only seven electrons.', ok: false,
              why: 'The bracket stands for a full ten electrons of neon on top of the seven shown.' },
            { t: 'Neon bonded to something.', ok: false,
              why: 'It is a shorthand for a configuration, not a compound. Neon does not bond.' },
          ] },
        { kind: 'choice', q: 'Lithium is 1s² 2s¹ and sodium is 1s² 2s² 2p⁶ 3s¹. Why do they behave so similarly?',
          options: [
            { t: 'Both end in a single electron in a fresh s orbital, and the outer electrons are what does the chemistry.', ok: true,
              why: 'Exactly. The inner electrons differ and never take part, so the two elements behave almost identically — which is the whole reason the periodic table has groups.' },
            { t: 'They have similar masses.', ok: false,
              why: 'Sodium is over three times heavier. Mass has no bearing on chemical family.' },
            { t: 'Coincidence.', ok: false,
              why: 'It is the deepest pattern in chemistry. Same outer configuration means same behaviour, every time.' },
          ] },
        { kind: 'numeric', q: 'An atom has configuration 1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p³. How many electrons does it have altogether?', answer: 33, tol: 0.001,
          right: '33, which is arsenic. Add the superscripts: 2+2+6+2+6+2+10+3.',
          wrong: 'Add all the superscripts together.' },
      ],
      mistakes: [
        { wrong: 'Filling 3d before 4s.',
          why: '4s is lower in energy, so it goes first. This is the single commonest mistake in the topic, and the diagonal diagram prevents it.' },
        { wrong: 'Pairing electrons before every orbital in a set has one.',
          why: 'Electrons repel, so three p electrons go one into each p orbital. Pairing only starts when there is no empty orbital left in the set.' },
        { wrong: 'Forgetting that the superscripts must add to the electron count.',
          why: 'It is a free check and it catches nearly every slip. Iron has 26 electrons, so the superscripts of its configuration must total 26.' },
        { wrong: 'Thinking the noble-gas shorthand is just an abbreviation.',
          why: 'It is also a statement about which electrons matter. [Ar] 4s² 3d⁶ puts the chemically active electrons where you can see them and hides the eighteen that never do anything.' },
      ],
      recap: [
        'A configuration lists which orbitals hold how many electrons: the number is the level, the letter the type, the superscript the count.',
        'Electrons fill lowest energy first, and the order is not 1, 2, 3 — 4s comes before 3d. The diagonal diagram gives the order in ten seconds.',
        'Within a set of orbitals, one electron each before any pairing, because electrons repel.',
        'Check your answer by adding the superscripts: they must equal the electron count.',
        'The noble-gas shorthand puts the chemically interesting electrons at the front, which is what makes iron’s [Ar] 4s² 3d⁶ explain its 2+ and 3+ charges.',
      ],
    },

    {
      id: 'valence',
      keywords: 'valence electrons dot diagram lewis symbol group number core electrons',
      title: 'Valence electrons, and dot diagrams',
      mins: 15,
      builds_on: ['configurations'],
      hook() {
        return frag(
          p('A uranium atom has 92 electrons. When uranium does chemistry, ', b('six'), ' of them are involved. The other 86 are spectators and might as well not be there.'),
          p('Chlorine has 17 electrons and uses 7. Sodium has 11 and uses 1.'),
          p('So if only the outer few matter, most of an electron configuration is irrelevant — and there is a much quicker way to write down the part that counts.'));
      },
      pages: [
        {
          h: 'Only the outer shell does chemistry',
          body() {
            return frag(
              p(term('Valence electrons', 'The electrons in the outermost energy level. They are the ones involved in bonding, and almost everything about an element’s chemistry follows from how many it has.'), ' are the electrons in the outermost level. Everything underneath is the ', b('core'), ', and the core takes no part.'),
              p('The reason is distance and shielding. The core electrons are close to the nucleus and tightly held, and they also sit between the nucleus and the outer electrons, getting in the way. So when two atoms approach, it is their outer electrons that meet, and the cores never come near each other.'),
              table(['Element', 'Total electrons', 'Valence electrons', 'Which explains'], [
                ['sodium', '11', '1', 'it gives one away, forming Na⁺'],
                ['magnesium', '12', '2', 'it gives two away, forming Mg²⁺'],
                ['carbon', '6', '4', 'it shares four — four bonds, which is all of organic chemistry'],
                ['nitrogen', '7', '5', 'it makes three bonds, needing three more for eight'],
                ['oxygen', '8', '6', 'it makes two bonds'],
                ['chlorine', '17', '7', 'it takes one, forming Cl⁻'],
                ['neon', '10', '8', 'it does nothing at all'],
              ]),
              callout(b('And the group number gives it to you. '), 'For the main-group elements, the valence electron count is the group number — or the group number minus 10 for groups 13 to 18. Group 1 has one, group 2 has two, group 16 has six, group 17 has seven. Nothing to learn.'));
          },
        },
        {
          h: 'Dot diagrams',
          body() {
            return frag(
              p('Since only the outer electrons matter, there is a notation that shows only those: the element symbol with one dot per valence electron around it.'),
              figure('Four dots for carbon, one for each valence electron, spread around the symbol before any pairing.',
                el('div', { class: 'lesson-eq', html: '&middot;C&middot; with a dot above and below &nbsp;&nbsp;&mdash;&nbsp;&nbsp; four in all' })),
              p('The convention is to put one dot on each of the four sides first and only then start doubling up — the same one-at-a-time logic as filling orbitals, and for the same reason.'),
              table(['Element', 'Valence electrons', 'Dots'], [
                ['sodium', '1', 'one dot'],
                ['magnesium', '2', 'two dots, on opposite sides'],
                ['carbon', '4', 'four dots, one per side'],
                ['nitrogen', '5', 'four sides used, one side doubled'],
                ['oxygen', '6', 'two sides doubled'],
                ['chlorine', '7', 'three sides doubled, one single'],
                ['neon', '8', 'all four sides doubled — full, and inert'],
              ]),
              p('The single dots are the ones available for bonding. Nitrogen with five dots has one pair and three singles, so it makes three bonds — which is exactly what the organic chemistry unit says about nitrogen having three hands.'),
              callout(b('This is where Unit 6 starts. '), 'A covalent bond is drawn as two atoms sharing a pair of dots, and the whole of Lewis structures is bookkeeping with these diagrams. Getting the dot counts right now makes that unit much easier.'));
          },
        },
        {
          h: 'Why this is the single most useful idea so far',
          body() {
            return frag(
              p('Almost every chemical property of an element follows from its valence electron count, and this is worth laying out explicitly because it is the payoff for the whole unit.'),
              table(['If an element has…', 'Then it…', 'Because'], [
                ['1 or 2 valence electrons', 'is a reactive metal that loses them', 'losing one or two is far cheaper than finding six or seven'],
                ['4', 'shares, forming four bonds', 'gaining four and losing four are both too expensive'],
                ['5, 6 or 7', 'is a reactive non-metal that gains electrons', 'it only needs a few to complete the shell'],
                ['8', 'does nothing', 'there is nothing to gain either way'],
              ]),
              p('And the same reasoning explains the groups. Elements in a column have the same valence count, so they do the same chemistry — which is why fluorine and chlorine and bromine all form 1− ions, all react with metals to make salts, and all sit in the same column.'),
              callout(b('So the periodic table is a map of valence electrons. '), 'Which is exactly what the next unit is about, and why it comes after this one rather than before.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'count', after: 0,
          q: 'Sulfur is in group 16. How many valence electrons does it have?',
          answer: 6,
          right: 'Six. Group 16, so 16 − 10 = 6 — which is two short of eight, so sulfur gains two and forms S²⁻.',
          wrong: 'For groups 13 to 18, subtract 10 from the group number.',
          hints: { 16: 'That is the group number. For the later groups, subtract 10 to get the valence count.',
                   2: 'That is how many it needs, not how many it has. Six plus two is eight.' } },
        { kind: 'choice', after: 1,
          q: 'Nitrogen has five valence electrons. Why does it form three bonds?',
          options: [
            { t: 'Because three of its five are unpaired, and it needs three more to reach eight.', ok: true,
              why: 'Exactly. Five dots means one pair and three singles, so three bonding slots — which is the "three hands" the organic unit talks about, explained.' },
            { t: 'Because it has three electrons.', ok: false, why: 'It has five valence electrons and seven altogether.' },
            { t: 'Because it is in group 3.', ok: false, why: 'Nitrogen is in group 15. Five valence electrons.' },
          ] },
      ],
      quizzes: [
        { kind: 'count', q: 'How many valence electrons does oxygen have?', answer: 6,
          right: 'Six — group 16. Two short of eight, so it forms two bonds or takes two electrons.',
          wrong: 'Oxygen is in group 16, so subtract 10.' },
        { kind: 'count', q: 'How many valence electrons does aluminium have?', answer: 3,
          right: 'Three — group 13, so 13 − 10. Which is why it forms Al³⁺.',
          wrong: 'Aluminium is in group 13.' },
        { kind: 'count', q: 'Uranium has 92 electrons. How many take part in its chemistry, roughly?', answer: 6,
          right: 'About six. The other 86 are core electrons and spectators — which is the whole point of the valence idea.',
          wrong: 'Only the outermost ones do chemistry, and for uranium that is a handful.',
          hints: { 92: 'Almost all of those are buried in the core and never meet another atom.' } },
        { kind: 'match', q: 'Match each element to its number of valence electrons.',
          pairs: [['Sodium', '1'], ['Carbon', '4'], ['Oxygen', '6'], ['Neon', '8']],
          right: 'Yes. And each of those numbers explains the element: gives one away, shares four, takes two, does nothing.',
          wrong: 'Use the group number — subtracting 10 for groups 13 and above.' },
        { kind: 'choice', q: 'Why do core electrons take no part in chemistry?',
          options: [
            { t: 'They are close to the nucleus, tightly held, and shielded from other atoms by the outer electrons.', ok: true,
              why: 'Right. When two atoms meet it is their outermost electrons that come into contact; the cores never get near each other.' },
            { t: 'They are not really there.', ok: false, why: 'They are entirely real and hold the atom together. They just do not react.' },
            { t: 'They have no charge.', ok: false, why: 'Every electron has a charge of −1. Position is what makes them inactive.' },
          ] },
        { kind: 'choice', q: 'Why do fluorine, chlorine and bromine behave so similarly?',
          options: [
            { t: 'They all have seven valence electrons, and the valence count is what sets the chemistry.', ok: true,
              why: 'Exactly, and it is why they share a column. All three need one more electron, all three form 1− ions, all three make salts with metals.' },
            { t: 'They are all gases.', ok: false,
              why: 'Fluorine and chlorine are gases, bromine is a liquid and iodine a solid — and all four behave chemically alike, which shows that state is not the connection.' },
            { t: 'They have similar masses.', ok: false,
              why: 'Iodine is over six times heavier than fluorine and behaves the same way chemically.' },
          ] },
        { kind: 'choice', q: 'In a dot diagram, why is the first dot put on each side before any side gets two?',
          options: [
            { t: 'Because electrons repel, so spreading out is lower in energy — the same rule as filling orbitals.', ok: true,
              why: 'Right, and it matters practically: it is the single dots that are available for bonding, so getting the pairing right tells you how many bonds the atom will make.' },
            { t: 'Because it looks tidier.', ok: false, why: 'It does, and the reason is physical.' },
            { t: 'Because there are four orbitals.', ok: false,
              why: 'There are four in the outer level (one s and three p), which is related — but the one-at-a-time rule comes from repulsion.' },
          ] },
        { kind: 'choice', q: 'An element has 2 valence electrons. What is it likely to do?',
          options: [
            { t: 'Lose both, forming a 2+ ion — it is a reactive metal.', ok: true,
              why: 'Right. Losing two is far cheaper than finding six, so group 2 elements are reactive metals forming 2+ ions. Magnesium and calcium are the everyday examples.' },
            { t: 'Gain six.', ok: false,
              why: 'Six is a great deal to gather. Losing two gets to the same place for much less.' },
            { t: 'Share two, forming two bonds.', ok: false,
              why: 'Possible in principle, and metals that far to the left find losing far cheaper. Sharing is what group 14 does.' },
          ] },
      ],
      practice: 'ion-charge',
      mistakes: [
        { wrong: 'Counting all the electrons rather than just the outer ones.',
          why: 'Chlorine has 17 electrons and 7 valence electrons, and it is the 7 that matter. The core is a spectator.' },
        { wrong: 'Using the group number directly for groups 13 to 18.',
          why: 'Subtract 10. Group 16 has six valence electrons, not sixteen. The older numbering used I to VIII for exactly this reason.' },
        { wrong: 'Pairing dots up before all four sides have one.',
          why: 'It gives the wrong bond count. Nitrogen’s five dots are one pair and three singles, which is why it makes three bonds — pair them differently and you would predict the wrong number.' },
      ],
      recap: [
        'Valence electrons are the outermost ones, and they do all the chemistry. Everything underneath is a spectator.',
        'The group number gives the count directly — subtracting 10 for groups 13 to 18 — so there is nothing to memorise.',
        'A dot diagram shows only the valence electrons, one dot per side before any doubling, and the single dots are the bonding slots.',
        'Almost every chemical property of an element follows from its valence count: 1 or 2 loses, 4 shares, 5 to 7 gains, 8 does nothing.',
        'Elements in a column share a valence count, which is why they share their chemistry — and why the periodic table works.',
      ],
    },

    ],
  });
})();
