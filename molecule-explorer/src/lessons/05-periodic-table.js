/* Unit 5: The periodic table. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, eq, table, worked, figure, goto } = K;

  ME.course.unit({
    n: 5, id: 'periodic-table',
    title: 'The periodic table',
    blurb: 'Not a list of elements. A map of valence electrons, which is why it predicts things nobody had measured yet.',
    lessons: [

    {
      id: 'why-this-shape',
      keywords: 'periodic table mendeleev period group block shape prediction',
      title: 'Why the table is shaped the way it is',
      mins: 15,
      builds_on: ['valence'],
      hook() {
        return frag(
          p('In 1869 Mendeleev laid out the known elements by mass, noticed the properties repeating, and did something braver than sorting: he left ', b('gaps'), '.'),
          p('He said there was a missing element under silicon, and predicted its mass, its density, its colour, what its oxide would look like and how its chloride would boil. Fifteen years later germanium was found, and every prediction was close.'),
          p('That is not what a filing system does. A filing system cannot tell you about a drawer that is empty. The table was telling him something real — and the reason it could is the subject of this lesson.'));
      },
      pages: [
        {
          h: 'The repeating pattern',
          body() {
            return frag(
              p('Write the elements out in order of atomic number and watch what happens to their behaviour.'),
              p('Hydrogen, then helium — which is completely unreactive. Then lithium, a violently reactive soft metal. Beryllium, boron, carbon, nitrogen, oxygen, fluorine — fluorine is violently reactive too, but in the opposite direction. Then neon, unreactive again. Then sodium: a violently reactive soft metal, just like lithium.'),
              p('Then the whole sequence runs again. Reactive metal, through the middle, to a reactive non-metal, then an unreactive gas, then a reactive metal again.'),
              callout(b('That repetition is what "periodic" means. '), 'Properties come back round at regular intervals, and the table is simply the list cut into lengths and stacked so that the matching elements line up in columns.'),
              h4('And Unit 4 has already told you why'),
              p('The repetition is the shells filling. Lithium and sodium behave the same because both end in a single electron in a fresh s orbital. Fluorine and chlorine behave the same because both are one electron short. Neon and argon do nothing because both are full.'),
              p('So the columns are not a similarity someone spotted. They are the same valence configuration, appearing again each time a shell refills.'),
              eq('a column = the same number of valence electrons = the same chemistry'));
          },
        },
        {
          h: 'Rows, columns and blocks',
          body() {
            return frag(
              p('Three words, and they mean different things, so it is worth pinning them down.'),
              table(['Term', 'What it is', 'What it tells you'], [
                ['Period', 'a row, read left to right', 'which energy level is being filled — period 3 is filling level 3'],
                ['Group', 'a column, read top to bottom', 'how many valence electrons — and therefore the chemistry'],
                ['Block', 'a region: s, p, d or f', 'which type of orbital the last electron went into'],
              ]),
              p('The period number is the outer shell number, which means you can read an element’s outer level straight off the table. Potassium is in period 4, so its outer electron is in level 4.'),
              p('And the block widths are the orbital capacities from the last unit, put on a map:'),
              table(['Block', 'Width', 'Why'], [
                ['s', '2 columns', 'one s orbital, two electrons'],
                ['p', '6 columns', 'three p orbitals, six electrons'],
                ['d', '10 columns', 'five d orbitals, ten electrons'],
                ['f', '14 columns', 'seven f orbitals, fourteen electrons — the two rows pulled out underneath'],
              ]),
              callout(b('So the table’s outline is not a design decision. '), 'Its width in each region is the number of electrons that region’s orbitals can hold. Draw the orbitals, and the shape of the table falls out of them.'),
              p('The two rows floating below are the f block, cut out and parked there purely to stop the page being 32 columns wide. They belong in the main body, between the s and d blocks.'));
          },
        },
        {
          h: 'Why it could predict',
          body() {
            return frag(
              p('Back to Mendeleev’s gaps, because the reason they worked is the real lesson here.'),
              p('If the table were an arbitrary arrangement, a gap would mean nothing — just a place nobody had written in. But the table is an arrangement by a repeating physical cause. A gap in a column means: there ought to be an element with this many valence electrons, in this shell, and everything we know about that column says what it will do.'),
              p('So he could predict germanium’s properties by reading its neighbours. Its mass had to be between gallium’s and arsenic’s. Its chemistry had to look like silicon’s, one row up. Its density had to fit the pattern down the column.'),
              warnCallout(b('And where the mass order and the property order disagreed, he trusted the properties. '), 'Tellurium is heavier than iodine, but iodine clearly belongs with the halogens, so he put tellurium first and was accused of fudging his data. He was right: the real ordering is by proton number, not mass, and tellurium has one fewer proton. Nobody knew protons existed for another forty years.'),
              p('You can colour the whole table by one property at a time in the Elements tab and watch the patterns move across it — which is exactly the view Mendeleev was reasoning from, without the data.'),
              goto('Open the periodic table', '#/elements', 'Every element, with its shells, orbitals and properties.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why do all the elements in a column behave similarly?',
          options: [
            { t: 'They have the same number of valence electrons, and valence electrons are what does the chemistry.', ok: true,
              why: 'Right — and that is the whole reason the table works. Everything else about an element can differ wildly down a column and the chemistry stays recognisable.' },
            { t: 'They have similar masses.', ok: false,
              why: 'Down a column the masses differ enormously — lithium is 7 and caesium is 133 — and the chemistry is still alike.' },
            { t: 'They were discovered together.', ok: false,
              why: 'They were discovered centuries apart in most cases. The grouping is physical.' },
          ] },
        { kind: 'count', after: 1,
          q: 'The d block is how many columns wide?',
          answer: 10,
          right: '10 — five d orbitals holding two electrons each. The table’s width in each region is just orbital capacity drawn out.',
          wrong: 'Count the d orbitals and double it.',
          hints: { 5: 'That is the number of d orbitals. Each holds two electrons, and each electron is an element.' } },
      ],
      quizzes: [
        { kind: 'choice', q: 'What does a period number tell you?',
          options: [
            { t: 'Which energy level the outer electrons are in.', ok: true,
              why: 'Right. Potassium is in period 4, so its outer electron is in level 4 — readable straight off the table with nothing to look up.' },
            { t: 'How many valence electrons the element has.', ok: false,
              why: 'That is the group number. The period is the row, and gives the shell.' },
            { t: 'How reactive the element is.', ok: false,
              why: 'Reactivity varies across a period from one extreme to the other — sodium and chlorine are in the same one.' },
          ] },
        { kind: 'choice', q: 'Why is the p block six columns wide?',
          options: [
            { t: 'Three p orbitals, two electrons each.', ok: true,
              why: 'Yes. Every block width in the table is an orbital capacity. Nothing about the outline was chosen.' },
            { t: 'Because six elements were known when it was drawn.', ok: false,
              why: 'The width is physical, not historical — and it would still be six if we had found only three of them.' },
            { t: 'Because p orbitals hold six electrons each.', ok: false,
              why: 'Each orbital holds two. There are three of them, which is where six comes from.' },
          ] },
        { kind: 'choice', q: 'Mendeleev put tellurium before iodine even though tellurium is heavier. Why was he right?',
          options: [
            { t: 'The real ordering is by proton number, and tellurium has one fewer proton than iodine.', ok: true,
              why: 'Exactly, and he had no way of knowing that — protons were forty years away. He trusted the chemistry over the masses and the chemistry was reading the proton count all along.' },
            { t: 'His mass measurement was wrong.', ok: false,
              why: 'The masses were right. Tellurium really is heavier, because it has more neutrons on average.' },
            { t: 'It was a lucky guess.', ok: false,
              why: 'It was a judgement that the repeating pattern of properties was more fundamental than mass, and that judgement was correct.' },
          ] },
        { kind: 'count', q: 'Which period is potassium in, given that its outer electron is in level 4?', answer: 4,
          right: '4. Period number and outer shell number are the same thing.',
          wrong: 'The period number is the outer energy level.' },
        { kind: 'choice', q: 'Why are the f-block rows printed separately underneath?',
          options: [
            { t: 'Purely to save width — they belong between the s and d blocks and the table would be 32 columns wide with them in place.', ok: true,
              why: 'Right. It is a typesetting decision, not a chemical one. A few wall charts do print the full-width version.' },
            { t: 'Because they are not really elements.', ok: false,
              why: 'They are entirely real — uranium and the rest of the actinides are in there.' },
            { t: 'Because they were discovered last.', ok: false,
              why: 'Some were, but the reason they are parked below is the page width.' },
          ] },
        { kind: 'match', q: 'Match each word to what it means.',
          pairs: [['Period', 'a row, giving the outer shell'], ['Group', 'a column, giving the valence count'], ['Block', 'the orbital type being filled']],
          right: 'Yes. Period, group, block — row, column, region.',
          wrong: 'One is a row, one is a column, and one is a region of the table.' },
        { kind: 'choice', q: 'What does "periodic" actually mean here?',
          options: [
            { t: 'That properties repeat at regular intervals as you go up in atomic number.', ok: true,
              why: 'Right — and the repeat is a shell refilling. Cut the list at each repeat and stack it, and you have the table.' },
            { t: 'That the table is updated periodically.', ok: false,
              why: 'A natural reading of the word and not the chemical one. It means recurring at intervals, like a periodic function.' },
            { t: 'That elements decay over time.', ok: false, why: 'That is radioactivity, and most elements do not.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking the table is ordered by mass.',
          why: 'It is ordered by proton number. They mostly agree, and in a few places — tellurium and iodine, argon and potassium, cobalt and nickel — they do not, and the proton order is the one that gets the chemistry right.' },
        { wrong: 'Reading the block widths as arbitrary.',
          why: '2, 6, 10 and 14 are the capacities of s, p, d and f. The shape of the table is a picture of orbital capacity.' },
        { wrong: 'Treating the f block as separate from the table.',
          why: 'It sits between the s and d blocks and is only printed below to keep the page a sensible width.' },
      ],
      recap: [
        'Properties repeat as atomic number rises, because shells keep refilling — that repetition is what "periodic" means.',
        'A column is a valence count and therefore a chemistry; a row is an outer shell; a block is an orbital type.',
        'Block widths are orbital capacities: s is 2, p is 6, d is 10, f is 14. The table’s outline is drawn by the orbitals.',
        'Because the arrangement has a physical cause, a gap in it is a prediction — which is how Mendeleev described germanium before anyone had seen it.',
      ],
    },

    {
      id: 'families',
      keywords: 'alkali metals alkaline earth halogens noble gases transition metals metalloids reactivity',
      title: 'The families: who does what',
      mins: 16,
      builds_on: ['why-this-shape'],
      hook() {
        return frag(
          p('Drop a pea-sized lump of sodium into water and it fizzes across the surface and usually catches fire. Do the same with potassium and it ignites immediately. Caesium explodes.'),
          p('Same column, same reaction, and it gets steadily more violent all the way down. That is not a coincidence of three metals — it is a trend with a cause, and once you know the cause you can predict the next one without trying it.'));
      },
      pages: [
        {
          h: 'The main families',
          body() {
            return frag(
              table(['Family', 'Group', 'Valence', 'What they do'], [
                ['Alkali metals', '1', '1', 'Lose one electron easily. Soft, light, stored under oil, react with water — harder the further down you go.'],
                ['Alkaline earth metals', '2', '2', 'Lose two. Reactive but less dramatic; magnesium and calcium are the familiar ones.'],
                ['Transition metals', 'the d block', '1 or 2, usually', 'Hard, dense, high-melting, often coloured compounds, variable charges. Iron, copper, chromium, nickel.'],
                ['Halogens', '17', '7', 'Gain one. Aggressively reactive non-metals; fluorine is the most reactive element there is.'],
                ['Noble gases', '18', '8', 'Full shells. Essentially no chemistry at all.'],
              ]),
              p('Hydrogen sits awkwardly at the top of group 1 and is not an alkali metal — it is a gas, and a non-metal. It is there because it has one valence electron, which is all group 1 means. Some tables float it above the whole thing to avoid the implication.'),
              callout(b('Every row in that table is the valence count, restated. '), 'One valence electron means give it away, so group 1 is a reactive metal. Seven means take one, so group 17 is a reactive non-metal. Eight means do nothing.'));
          },
        },
        {
          h: 'Why the alkali metals get more violent downwards',
          body() {
            return frag(
              p('All of group 1 does the same reaction with water: the metal gives up its electron, hydrogen gas comes off, and you are left with an alkaline solution.'),
              eq('2 Na + 2 H2O -> 2 NaOH + H2'),
              p('So why is caesium so much worse than lithium, when they are doing the same thing?'),
              p('Because the whole reaction is about losing that one electron, and how easily it comes off depends on how tightly it is held. Going down the group, two things happen and both weaken the grip:'),
              table(['Going down group 1', 'Effect on the outer electron'], [
                ['Each row adds a whole new shell, so the outer electron is further from the nucleus', 'attraction falls off with distance, so the grip weakens'],
                ['There are more inner shells between the nucleus and the outer electron', 'they shield it from the positive charge, so it feels less pull'],
              ]),
              p('The nucleus does gain protons going down, which pulls harder — but the extra distance and shielding win comfortably. So caesium’s outer electron is barely attached, and it will hand it over to anything.'),
              callout(b('And the halogens run the opposite way for the same reason. '), 'Group 17 is about ', em('gaining'), ' an electron, and a small atom with little shielding grabs hardest. So fluorine, the smallest, is the most reactive halogen, and reactivity falls going down — exactly the reverse of group 1, from exactly the same physics.'));
          },
        },
        {
          h: 'Metals, non-metals and the staircase',
          body() {
            return frag(
              p('There is a stepped line running down the right of the table, from boron towards astatine. Metals to the left of it, non-metals to the right.'),
              table(['', 'Metals', 'Non-metals'], [
                ['Electrons', 'lose them', 'gain or share them'],
                ['Appearance', 'shiny, usually solid', 'dull, often gas or brittle solid'],
                ['Conduction', 'conduct heat and electricity', 'mostly insulators'],
                ['Working them', 'bend and stretch without breaking', 'shatter'],
                ['Their oxides', 'basic', 'acidic'],
              ]),
              p('Every one of those differences comes from the same root: metals hold their outer electrons loosely. Loose electrons can move, which is conduction. Loose electrons are shared across the whole lump rather than fixed between pairs of atoms, which is why a metal bends instead of shattering — the atoms can slide and the bonding follows them.'),
              h4('And the elements sitting on the line'),
              p('The ones right on the staircase — boron, silicon, germanium, arsenic, antimony, tellurium — are the ', term('metalloids', 'Elements on the metal/non-metal boundary, with properties of both. Silicon is the important one: it conducts, but badly and controllably, which is what makes it a semiconductor.'), ', and they behave like both.'),
              p('Silicon is the one that matters. It conducts, but poorly, and — crucially — how well it conducts can be controlled by adding tiny amounts of other elements. That controllability is what a transistor is, which is what a computer is. The entire semiconductor industry sits on one column of the periodic table being on the boundary rather than clearly on one side.'),
              warnCallout(b('The line is a boundary, not a wall. '), 'Aluminium is on the metal side and its oxide reacts with both acids and bases. Elements near the line hedge, which is what you would expect of a gradual trend that we have drawn a line through for convenience.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'Fluorine is the most reactive halogen and caesium is nearly the most reactive alkali metal. They are at opposite corners. Why both?',
          options: [
            { t: 'Group 1 is about losing an electron, which is easiest when it is held loosely; group 17 is about gaining one, which is easiest when the atom is small and pulls hard.', ok: true,
              why: 'Exactly. Same physics, opposite goals, so the trends run in opposite directions — and the two extremes end up in opposite corners of the table.' },
            { t: 'They are both very small atoms.', ok: false,
              why: 'Fluorine is tiny and caesium is one of the largest atoms there is. Size matters here, but in opposite directions for the two groups.' },
            { t: 'Coincidence.', ok: false,
              why: 'It falls straight out of distance and shielding — one group wants a weak grip, the other wants a strong pull.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'Why can you bend a metal but not a ceramic?',
          options: [
            { t: 'A metal’s electrons are shared across the whole lump, so atoms can slide and the bonding follows them.', ok: true,
              why: 'Right. In a brittle solid the bonds are fixed between particular atoms, so sliding breaks them and the thing shatters. Loose electrons are the difference.' },
            { t: 'Metals are softer.', ok: false,
              why: 'Steel is much harder than chalk and still bends rather than shatters. Hardness and brittleness are different properties.' },
            { t: 'Metals are heavier.', ok: false, why: 'Lithium floats on water and still behaves as a metal.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'Why is potassium more reactive with water than sodium?',
          options: [
            { t: 'Its outer electron is further out and more shielded, so it is held less tightly and comes off more easily.', ok: true,
              why: 'Right, and the same reasoning predicts rubidium and caesium being worse still without anyone having to try it.' },
            { t: 'It has more protons pulling harder.', ok: false,
              why: 'It does have more protons, and that would hold the electron tighter — the extra distance and shielding outweigh it.' },
            { t: 'It is denser.', ok: false, why: 'Potassium is actually less dense than sodium, and density is not what drives this.' },
          ] },
        { kind: 'choice', q: 'Why does fluorine react more aggressively than iodine?',
          options: [
            { t: 'It is much smaller, so an incoming electron gets close to the nucleus and is pulled hard.', ok: true,
              why: 'Right. Halogen reactivity falls going down, because the atom that wants an electron gets worse at holding one the bigger it gets.' },
            { t: 'It has more electrons.', ok: false, why: 'Iodine has far more. Fluorine wins by being small.' },
            { t: 'It is a gas and iodine is a solid.', ok: false,
              why: 'A consequence of their sizes rather than a cause of the reactivity.' },
          ] },
        { kind: 'choice', q: 'Why is hydrogen at the top of group 1 when it is not a metal?',
          options: [
            { t: 'Because it has one valence electron, which is what group 1 means — but it behaves nothing like the metals below it.', ok: true,
              why: 'Right, and it is genuinely awkward. Some tables float hydrogen above everything to avoid implying it is an alkali metal.' },
            { t: 'Because it is a metal under enough pressure.', ok: false,
              why: 'Metallic hydrogen is real at enormous pressures and is not why it is placed there.' },
            { t: 'Because it is the lightest element.', ok: false, why: 'Position is by proton count and valence, not mass.' },
          ] },
        { kind: 'match', q: 'Match each family to its behaviour.',
          pairs: [['Alkali metals', 'lose one electron, very reactive'], ['Halogens', 'gain one electron, very reactive'], ['Noble gases', 'full shell, no chemistry'], ['Transition metals', 'hard, dense, variable charges']],
          right: 'Yes — and each one is just its valence count expressed as behaviour.',
          wrong: 'Work from the valence electron count in each case.' },
        { kind: 'choice', q: 'Why does silicon matter so much technologically?',
          options: [
            { t: 'It is on the metal/non-metal boundary, so it conducts badly — and how badly can be controlled, which is what a transistor needs.', ok: true,
              why: 'Right. A good conductor is always on and an insulator is always off. A semiconductor can be switched, and the whole computing industry is built on that.' },
            { t: 'It is the best conductor available.', ok: false,
              why: 'Copper and silver are far better. Being a poor, controllable conductor is exactly the point.' },
            { t: 'It is cheap.', ok: false,
              why: 'It is, being most of sand, and that is a bonus rather than the reason.' },
          ] },
        { kind: 'order', q: 'Order these group 1 metals by reactivity with water, least first.',
          items: ['Lithium', 'Sodium', 'Potassium', 'Caesium'],
          right: 'Yes — reactivity rises going down, because the outer electron gets further away and more shielded, and so comes off more easily.',
          wrong: 'The further down the group, the more loosely the outer electron is held.' },
        { kind: 'choice', q: 'Which of these is a property of non-metals?',
          options: [
            { t: 'Their oxides are acidic.', ok: true,
              why: 'Right — carbon dioxide dissolved in water is carbonic acid, sulfur dioxide gives sulfurous acid. Metal oxides are basic, which is the mirror image.' },
            { t: 'They conduct electricity well.', ok: false,
              why: 'Mostly insulators, with graphite as the famous exception.' },
            { t: 'They bend without breaking.', ok: false,
              why: 'They shatter, because their bonds are fixed between particular atoms rather than shared across the whole solid.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking reactivity increases down every group.',
          why: 'It increases down group 1 and decreases down group 17. The direction depends on whether the element is trying to lose an electron or gain one.' },
        { wrong: 'Calling hydrogen an alkali metal.',
          why: 'It is in group 1 because it has one valence electron, and it is a non-metal gas that behaves nothing like sodium.' },
        { wrong: 'Treating the metal/non-metal line as sharp.',
          why: 'It is a gradual change with a line drawn through it. The metalloids sit on it and behave like both, and even aluminium hedges.' },
      ],
      recap: [
        'Each family is its valence count expressed as behaviour: 1 loses, 7 gains, 8 does nothing.',
        'Group 1 gets more reactive downwards because the outer electron gets further away and more shielded, so it is easier to lose.',
        'Group 17 gets less reactive downwards, from the same physics — gaining an electron needs a small atom with a strong pull.',
        'Metals lose electrons loosely, which explains conduction, malleability, shine and basic oxides all at once.',
        'The metalloids on the boundary behave like both, and silicon’s controllable poor conduction is the basis of every computer chip.',
      ],
    },

    {
      id: 'trends',
      keywords: 'periodic trends atomic radius ionisation energy electronegativity ionic radius shielding',
      title: 'Periodic trends, and the two forces behind all of them',
      mins: 18,
      builds_on: ['families'],
      hook() {
        return frag(
          p('There are four trends usually set for memorisation: atomic radius, ionisation energy, electronegativity and ionic radius. Eight facts, since each has two directions, and they are easy to mix up under pressure.'),
          p('There are really only two ideas, and everything else is a consequence. Learn the two and you can derive all eight in your head, including the exceptions.'));
      },
      pages: [
        {
          h: 'The two forces',
          body() {
            return frag(
              p(b('One: more protons pull harder. '), 'Going across a period, the proton count rises while the electrons all go into the same shell. More positive charge pulling on the same shell means a tighter grip.'),
              p(b('Two: distance and shielding weaken the pull. '), 'Going down a group, each row adds a shell. The outer electrons are further away, and the inner shells sit between them and the nucleus, blocking some of the attraction. Both make the grip weaker.'),
              callout(b('That is the whole unit. '), 'Across a period, the pull on the outer electrons gets stronger. Down a group, it gets weaker. Everything below is those two sentences applied to a particular measurement.'),
              h4('Atomic radius'),
              p('Down a group: atoms get bigger, because you are adding shells. Obvious.'),
              p('Across a period: atoms get ', b('smaller'), ', which surprises people. You are adding electrons, so surely it should grow — but the electrons are going into the same shell while protons pile up in the nucleus, so the stronger pull reels the whole shell in. Sodium is much bigger than chlorine, despite chlorine having six more electrons.'),
              h4('Ionisation energy'),
              p('The energy needed to pull one electron off completely. It is the direct measurement of how tightly the outer electron is held, so it follows the pull exactly: it rises across a period and falls down a group.'),
              p('Which is why the noble gases sit at the top — hardest to strip, and unreactive for the same reason — and caesium near the bottom.'),
              h4('Electronegativity'),
              p('How hard an atom pulls on electrons it is ', em('sharing'), ' with another atom. Same two forces, so the same pattern: up across, down a group.'),
              p('Fluorine is top right and is the most electronegative element there is. The noble gases are usually left out, because an atom that does not share electrons has no meaningful pull on shared ones.'));
          },
        },
        {
          h: 'The map',
          body() {
            return frag(
              ME.sims.trendMap(),
              p('Switch between the properties above and watch the direction change. Radius is dark bottom-left; electronegativity and ionisation energy are dark top-right. They are mirror images, because they are measuring the same grip from opposite ends.'),
              p('Melting point is in there as a deliberate contrast. It does not follow the pattern at all — it peaks in the middle of the transition metals and collapses at the noble gases — because it is not about the grip on one electron. It is about how strongly whole atoms hold on to each other, which is a different question.'),
              callout(b('Worth noticing. '), 'Not every property is periodic in the neat way the four trends are. The ones that are, are the ones that depend directly on the pull on the outer electrons.'));
          },
        },
        {
          h: 'Ionic radius, and the trap',
          body() {
            return frag(
              p('One more, and this is the one that catches people, because it does not follow the neutral atoms.'),
              table(['Ion', 'Compared with its atom', 'Why'], [
                ['A positive ion (metal)', 'much smaller', 'It has lost its entire outer shell, so the remaining electrons are in a shell closer in — and the same protons now pull on fewer electrons.'],
                ['A negative ion (non-metal)', 'larger', 'It has gained electrons with no extra protons, so the same nucleus is holding more electrons and each is held less well. They also repel each other more.'],
              ]),
              worked('Sodium has a radius of about 186 pm. Na⁺ is about 102 pm. Where did half the atom go?', [
                { q: 'What did sodium lose?', why: 'Its single 3s electron — which was its whole third shell. Na⁺ has the configuration of neon: 1s² 2s² 2p⁶.' },
                { q: 'So which shell is now the outside?', why: 'Level 2, which was always much closer in. The radius drops to the size of that shell, not to a slightly shrunken level 3.' },
                { q: 'And the 11 protons?', why: 'Still 11, now pulling on 10 electrons instead of 11. The grip on each is tighter, so level 2 is pulled in further than it was in neutral sodium.', maths: '186 pm → 102 pm' },
              ]),
              warnCallout(b('So a sodium ion is much smaller than a sodium atom — and a chloride ion is much bigger than a chlorine atom. '), 'Cl is about 99 pm and Cl⁻ about 181 pm. This is why you cannot read ion sizes off the neutral-atom trend: losing a shell and gaining electrons move the size in opposite directions.'),
              h4('A useful check'),
              p('Na⁺, Mg²⁺, F⁻, O²⁻ and Ne all have exactly ten electrons. Same electrons, different nuclei — so the one with the most protons is smallest. That puts them in order Mg²⁺ < Na⁺ < Ne < F⁻ < O²⁻, purely by proton count.'),
              p('If you can reason that out rather than recall it, the trends are yours.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why do atoms get smaller across a period even though electrons are being added?',
          options: [
            { t: 'The new electrons go into the same shell while protons pile up, so the stronger pull draws the shell in.', ok: true,
              why: 'Right. No new shell is being added, so the only thing changing is the strength of the pull — and it goes up.' },
            { t: 'Electrons are being removed.', ok: false, why: 'Electrons are added going across, one per element.' },
            { t: 'The atoms lose neutrons.', ok: false,
              why: 'Neutron count rises too, and neutrons have no charge, so they do not affect the pull on electrons.' },
          ] },
        { kind: 'order', after: 2,
          q: 'Na⁺, Mg²⁺, F⁻ and O²⁻ all have ten electrons. Order them smallest first.',
          items: ['Mg²⁺', 'Na⁺', 'F⁻', 'O²⁻'],
          right: 'Yes — same ten electrons throughout, so the one with the most protons pulls them in tightest. Magnesium has 12, sodium 11, fluorine 9, oxygen 8.',
          wrong: 'The electron count is identical for all four, so the only thing that can differ is the proton count pulling on them.' },
      ],
      quizzes: [
        { kind: 'choice', q: 'Which is larger, a sodium atom or a sodium ion?',
          options: [
            { t: 'The atom, by a long way — the ion has lost an entire shell.', ok: true,
              why: 'Right: 186 pm down to 102 pm. Na⁺ is neon-sized, because it now has neon’s electrons.' },
            { t: 'The ion, because it has a charge.', ok: false,
              why: 'Charge does not add size. Losing the outer shell removes a whole layer.' },
            { t: 'They are the same.', ok: false, why: 'An outer shell disappeared, so the size changes substantially.' },
          ] },
        { kind: 'choice', q: 'Which is larger, a chlorine atom or a chloride ion?',
          options: [
            { t: 'The ion — an extra electron with no extra protons means a weaker grip on each one.', ok: true,
              why: 'Right: 99 pm up to 181 pm. Negative ions grow and positive ones shrink, which is why ion sizes cannot be read off the neutral trend.' },
            { t: 'The atom.', ok: false,
              why: 'That is the pattern for positive ions. Gaining electrons without gaining protons makes an atom bigger.' },
            { t: 'They are the same.', ok: false, why: 'Nearly doubling, in fact.' },
          ] },
        { kind: 'choice', q: 'Why do the noble gases have the highest ionisation energies in their periods?',
          options: [
            { t: 'They are the smallest atoms in their period with the most protons, so they hold their electrons hardest.', ok: true,
              why: 'Right, and it is the same fact as their unreactivity, seen from a different angle. Nothing is going to take an electron off them cheaply.' },
            { t: 'They have the most electrons.', ok: false,
              why: 'Within a period the noble gas does have the most, and what matters is how tightly each is held.' },
            { t: 'They are gases.', ok: false, why: 'Being a gas is a consequence of their unreactivity, not the cause of it.' },
          ] },
        { kind: 'order', q: 'Order these by atomic radius, smallest first.',
          items: ['F', 'O', 'N', 'Li'],
          right: 'Yes — all in period 2, so radius falls going right as protons pile up. Fluorine is the smallest and lithium the largest.',
          wrong: 'They are all in period 2. Across a period, more protons pull the same shell in tighter.' },
        { kind: 'order', q: 'Order these by electronegativity, lowest first.',
          items: ['K', 'Mg', 'C', 'O'],
          right: 'Yes. Electronegativity rises going right and up, so a group 1 metal near the bottom is lowest and oxygen near the top right is highest.',
          wrong: 'Up and to the right means a stronger pull on shared electrons.' },
        { kind: 'choice', q: 'Melting point does not follow the neat periodic pattern. Why not?',
          options: [
            { t: 'It depends on how strongly whole atoms hold each other, not on the pull on a single outer electron.', ok: true,
              why: 'Right, and it is a useful reminder that "periodic trend" applies to the properties driven by that pull — not to everything an element does.' },
            { t: 'The measurements are unreliable.', ok: false,
              why: 'They are very well measured. The pattern is genuinely different because the underlying cause is different.' },
            { t: 'It does follow it, on a different table.', ok: false,
              why: 'It peaks mid-transition-metals and collapses at the noble gases, which is nothing like the radius or ionisation pattern.' },
          ] },
        { kind: 'choice', q: 'Going down a group, why does the pull on the outer electrons weaken?',
          options: [
            { t: 'They are further from the nucleus, and the inner shells shield them from its charge.', ok: true,
              why: 'Both at once, and together they outweigh the extra protons — which is why caesium gives its electron away so readily.' },
            { t: 'The nucleus loses protons.', ok: false, why: 'It gains them. Distance and shielding win anyway.' },
            { t: 'The electrons slow down.', ok: false, why: 'Speed is not what sets the attraction; distance and shielding are.' },
          ] },
        { kind: 'choice', q: 'What single idea explains radius, ionisation energy and electronegativity together?',
          options: [
            { t: 'How strongly the nucleus pulls on the outer electrons — stronger across a period, weaker down a group.', ok: true,
              why: 'Right, and it is worth holding it that way rather than as eight separate directions. Derive them and you cannot mix them up.' },
            { t: 'The number of electrons.', ok: false,
              why: 'Electron count rises in both directions across the table, while the trends run opposite ways — so it cannot be the explanation.' },
            { t: 'Atomic mass.', ok: false,
              why: 'Mass rises steadily in every direction and explains none of the reversals.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Expecting atoms to get bigger across a period because electrons are being added.',
          why: 'The electrons go into a shell that already exists while protons accumulate, so the pull tightens and the atom shrinks. A new shell is what makes an atom bigger, and that only happens on a new row.' },
        { wrong: 'Reading ion sizes off the neutral-atom trend.',
          why: 'Positive ions are much smaller than their atoms because a whole shell has gone; negative ions are bigger because the same nucleus is holding more electrons.' },
        { wrong: 'Memorising eight arrows.',
          why: 'There are two ideas — more protons pull harder, distance and shielding weaken the pull — and every arrow follows. Under exam pressure, derived beats remembered.' },
        { wrong: 'Assuming every property is periodic.',
          why: 'Melting point is not, because it depends on bonding between atoms rather than the grip on one electron.' },
      ],
      recap: [
        'Two ideas: more protons pull harder, and distance plus shielding weaken the pull. Every trend is one of these two applied to a measurement.',
        'Across a period: atoms shrink, ionisation energy rises, electronegativity rises. Down a group: all three reverse.',
        'Positive ions are much smaller than their atoms — a whole shell is gone. Negative ions are larger.',
        'For ions with the same electron count, the one with the most protons is smallest, which is a pure proton-count argument.',
        'Melting point deliberately breaks the pattern, because it is about bonding between atoms rather than the grip on one electron.',
      ],
    },

    ],
  });
})();
