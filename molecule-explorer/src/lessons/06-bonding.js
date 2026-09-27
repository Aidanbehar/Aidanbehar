/* Unit 6: Chemical bonding. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, drawing, strip, figure, goto } = K;

  ME.course.unit({
    n: 6, id: 'bonding',
    title: 'Chemical bonding',
    blurb: 'Why atoms stick together at all, the three ways they do it, and how the way they do it decides the shape — and therefore almost everything else.',
    lessons: [

    {
      id: 'why-bond',
      title: 'Why atoms bond, and ionic bonding',
      mins: 17,
      builds_on: ['valence', 'families'],
      hook() {
        return frag(
          p('Sodium is a metal soft enough to cut with a knife and it explodes on contact with water. Chlorine is a green gas that was used as a chemical weapon.'),
          p('Put them together and you get table salt, which you eat.'),
          p('Nothing was added and nothing was taken away — the same atoms are there afterwards. So whatever happened, it happened to the ', b('electrons'), ', and it changed the substance completely.'));
      },
      pages: [
        {
          h: 'Bonding is not something atoms want',
          body() {
            return frag(
              p('It is tempting to say atoms bond because they want full shells. Unit 4 pushed back on that and here is the payoff: atoms bond when the result is ', b('lower in energy'), ' than being apart. That is the only reason, and it is the only one you need.'),
              p('Think about what happens as two atoms approach. The electrons of one start to feel the nucleus of the other, and since electrons and nuclei attract, that is a downhill move — energy is released. But push too close and the two nuclei, both positive, start to repel hard, and the electrons crowd each other.'),
              p('So there is a sweet spot: a separation where the attraction has paid off as much as it is going to and the repulsion has not yet taken over. That distance is the ', term('bond length', 'The separation at which two bonded atoms sit: close enough for the attraction to have paid off, far enough that the nuclei are not fighting each other.'), ', and the energy released getting there is the ', term('bond energy', 'How much energy was released when the bond formed, and therefore how much you must put back in to break it.'), '.'),
              callout(b('Which is why breaking bonds always costs energy. '), 'A bond exists because forming it released energy. Getting back to where you started means putting that energy back. There is no such thing as a bond that is free to break — a point Unit 13 leans on heavily.'),
              h4('And it explains why the noble gases do not bother'),
              p('For helium and neon, approaching another atom does not pay. Their shells are full, so there is no low-energy arrangement available that is better than staying apart. No downhill move, no bond.'));
          },
        },
        {
          h: 'Ionic bonding: one atom takes the electron',
          body() {
            return frag(
              p('When a metal meets a non-metal, the cheapest arrangement is usually a straight handover. The metal holds its outer electron loosely; the non-metal pulls hard and is one or two short. So the electron moves across.'),
              p('Sodium loses one and becomes Na⁺. Chlorine gains one and becomes Cl⁻. Both now have full shells, and — this is the part that does the bonding — they now have opposite charges, so they attract.'),
              eq('Na + Cl -> Na+ + Cl- -> NaCl'),
              p('An ', term('ionic bond', 'The attraction between oppositely charged ions after one atom has transferred electrons to another. It is not a link between two particular atoms — it pulls in every direction at once.'), ' is that electrostatic attraction. And it has a property that matters enormously: it pulls in ', b('every direction'), '.'),
              h4('So there is no such thing as a molecule of salt'),
              p('A Na⁺ ion does not attract one particular Cl⁻. It attracts every chloride ion near it, and is repelled by every sodium ion. The result is not a pair but a repeating three-dimensional grid — a ', term('lattice', 'A repeating three-dimensional arrangement of ions, each one surrounded by ions of the opposite charge. An ionic compound is one continuous lattice, not a collection of molecules.'), ' — with each sodium surrounded by six chlorides and each chloride by six sodiums, repeating for the whole crystal.'),
              warnCallout(b('So "NaCl" is a ratio, not a molecule. '), 'It says there is one sodium for every chlorine. A grain of salt is one enormous ionic lattice containing something like 10¹⁸ ions, and the formula is the simplest ratio in it. This is why ionic formulas are called ', em('formula units'), ' rather than molecules.'),
              p('You can see the difference in the Gallery: the covalent entries are molecules you could count, while sodium chloride is a section of an endless grid.'),
              goto('Sodium chloride in the gallery', '#/m/sodium-chloride', 'The lattice, not a molecule.'));
          },
        },
        {
          h: 'What the lattice explains',
          body() {
            return frag(
              p('Almost everything about an ionic compound follows from "one continuous grid of charges pulling in every direction".'),
              table(['Property', 'Why the lattice gives it'], [
                ['High melting point', 'Melting means breaking the grid apart, and every ion is held by several neighbours at once. Salt melts at 801 °C.'],
                ['Hard but brittle', 'The grid resists being squeezed — but hit it hard enough to slide one layer by one ion, and suddenly like charges are facing each other. The crystal splits cleanly along a plane.'],
                ['Does not conduct as a solid', 'The charges are there, but locked in place. Nothing can move, so nothing flows.'],
                ['Conducts when molten or dissolved', 'Free the ions and you have charged particles that can move. This is what makes salt water conduct and pure water barely conduct at all.'],
                ['Often soluble in water', 'Water molecules are polar, so they can surround each ion and hold it away from the lattice. Unit 11 does this properly.'],
              ]),
              okCallout(b('That brittleness explanation is worth pausing on. '), 'It is the one that makes the lattice picture feel real. A metal bends because its electrons are shared everywhere and the atoms can slide. An ionic crystal cannot slide at all, because sliding puts like next to like — so it shatters instead. Same push, opposite outcome, and the difference is entirely in how the electrons are arranged.'),
              h4('Metallic bonding, in passing'),
              p('The third kind belongs here because it is the other extreme. In a metal, every atom lets go of its outer electrons and they spread out across the whole lump — a lattice of positive ions sitting in a shared sea of electrons.'),
              p('Nothing is transferred to anywhere in particular and nothing is shared between two particular atoms. That is why metals conduct (the electrons are free to move), why they are shiny (free electrons absorb and re-emit light across the spectrum), and why they bend rather than shatter (the ions can slide and the electron sea just flows around them).'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why do two atoms settle at a particular distance rather than collapsing together?',
          options: [
            { t: 'Closer in, the two positive nuclei repel; further out, the attraction has not paid off yet. The bond length is where the two balance.', ok: true,
              why: 'Right. A bond is a compromise, and the energy released reaching that compromise is the bond energy — which is exactly what you have to put back to break it.' },
            { t: 'They are held apart by their electron shells touching.', ok: false,
              why: 'A reasonable picture, and electron crowding is part of the repulsion — but the nuclei repelling each other is the bigger term.' },
            { t: 'Because bonds have a fixed standard length.', ok: false,
              why: 'Bond lengths vary a lot with the atoms involved and with bond order. The balance point is what sets each one.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Why is it wrong to talk about a molecule of sodium chloride?',
          options: [
            { t: 'Because the attraction pulls in every direction, so the ions form one continuous lattice rather than pairs.', ok: true,
              why: 'Right, and NaCl is therefore a ratio: one sodium for every chlorine in a grid of about 10¹⁸ ions per grain. That is why it is called a formula unit.' },
            { t: 'Because sodium and chlorine do not really bond.', ok: false,
              why: 'They bond strongly — salt melts at 801 °C. It is the shape of the bonding that is different.' },
            { t: 'Because the formula should be Na2Cl2.', ok: false,
              why: 'The formula gives the simplest ratio, and doubling it would not make it a molecule either.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What is the actual reason two atoms bond?',
          options: [
            { t: 'The bonded arrangement is lower in energy than the separated one.', ok: true,
              why: 'Right, and this one sentence covers ionic, covalent and metallic bonding at once. "Wanting a full shell" is a shorthand for a particular case of it.' },
            { t: 'Atoms want full outer shells.', ok: false,
              why: 'The shorthand, and it fails for the cases where eight electrons is not the answer — boron settling for six, sulfur holding twelve. Energy is the real criterion.' },
            { t: 'Opposite charges always attract.', ok: false,
              why: 'True of ionic bonding and not of covalent, where nothing is charged at all.' },
          ] },
        { kind: 'choice', q: 'Why does solid salt not conduct electricity, while molten salt does?',
          options: [
            { t: 'The charges exist either way, but only in the liquid can they move.', ok: true,
              why: 'Right — conduction needs charges that are free to travel. In the solid they are locked in the lattice; melt it and they can move.' },
            { t: 'Melting turns the ions back into atoms.', ok: false,
              why: 'The ions stay ions. Only their freedom to move changes.' },
            { t: 'Solid salt has no charges in it.', ok: false,
              why: 'It is made entirely of charged particles. They just cannot go anywhere.' },
          ] },
        { kind: 'choice', q: 'Why is an ionic crystal brittle when a metal is malleable?',
          options: [
            { t: 'Sliding an ionic layer by one position puts like charges face to face, so it splits instead; a metal’s shared electrons let its ions slide freely.', ok: true,
              why: 'Right, and it is the best evidence that the lattice picture is real. Same push, opposite outcome, and the only difference is how the electrons are held.' },
            { t: 'Ionic compounds are harder.', ok: false,
              why: 'Hardness and brittleness are different things — steel is very hard and not at all brittle.' },
            { t: 'Metals are held together more weakly.', ok: false,
              why: 'Tungsten melts at 3422 °C. Metallic bonding can be extremely strong and still allow sliding.' },
          ] },
        { kind: 'choice', q: 'Why are metals shiny?',
          options: [
            { t: 'Their free electrons absorb and re-emit light across the whole visible spectrum.', ok: true,
              why: 'Right. It is the same free electrons that give conduction — one feature of metallic bonding explaining two properties.' },
            { t: 'Their surfaces are very smooth.', ok: false,
              why: 'A polished ceramic is smoother and is not shiny in the metallic way. The shine comes from the electrons.' },
            { t: 'They reflect heat.', ok: false, why: 'They do conduct heat well, which is a separate consequence of the same free electrons.' },
          ] },
        { kind: 'choice', q: 'Breaking a chemical bond always:',
          options: [
            { t: 'costs energy, because forming it released energy.', ok: true,
              why: 'Right, and this is worth locking in now — Unit 13 is built on it. A reaction that releases energy overall still has to pay to break its bonds first.' },
            { t: 'releases energy, which is why reactions get hot.', ok: false,
              why: 'This is the single commonest misconception in thermochemistry. Breaking costs; making releases. A reaction gets hot when the bonds it makes are stronger than the ones it broke.' },
            { t: 'has no energy cost if the bond is weak.', ok: false,
              why: 'A weak bond is cheap to break, not free. If it cost nothing it would not be a bond.' },
          ] },
        { kind: 'count', q: 'In a sodium chloride lattice, how many chloride ions surround each sodium ion?', answer: 6,
          right: 'Six — one in each direction along the three axes. And each chloride has six sodiums around it, repeating throughout the crystal.',
          wrong: 'Think about a three-dimensional grid: how many directions are there from one point along three axes?',
          hints: { 1: 'That would make it a molecule. The attraction is not directional, so it pulls on every neighbour.',
                   4: 'That is the tetrahedral arrangement some other lattices take. Sodium chloride is a simple cubic grid.' } },
        { kind: 'choice', q: 'Sodium is explosive and chlorine is toxic, but salt is edible. Why?',
          options: [
            { t: 'Both were reactive because of one loose electron and one gap; after the transfer, neither has anything left to do.', ok: true,
              why: 'Exactly. Sodium’s danger was that spare electron and chlorine’s was that missing one. Trade them and the reason for the reactivity is gone — which is why a compound tells you almost nothing about its elements.' },
            { t: 'The dangerous parts cancel out.', ok: false,
              why: 'Nearly right in spirit, and worth being precise: the reactivity was the loose electron and the gap, and the transfer removes both.' },
            { t: 'The amounts are too small to matter.', ok: false,
              why: 'A grain of salt contains plenty of both elements. It is genuinely a different substance.' },
          ] },
      ],
      practice: 'ion-charge',
      mistakes: [
        { wrong: 'Saying atoms bond because they want full shells.',
          why: 'They bond because the result is lower in energy. Full shells are usually what that looks like, and the cases where it is not — boron with six, sulfur with twelve — are exactly where the shorthand fails.' },
        { wrong: 'Thinking breaking bonds releases energy.',
          why: 'Backwards, and it is the mistake that wrecks thermochemistry later. A bond formed because energy came out; breaking it means putting that energy back.' },
        { wrong: 'Treating NaCl as a molecule.',
          why: 'It is a ratio in a continuous lattice. Ionic attraction has no direction, so there is nothing to draw a molecule around.' },
        { wrong: 'Expecting a compound to behave like its elements.',
          why: 'Sodium chloride is the standard counterexample: two of the more alarming elements on the table, combining into something you sprinkle on chips.' },
      ],
      recap: [
        'Atoms bond when the bonded arrangement is lower in energy. That is the whole criterion, and it covers all three bond types.',
        'Bond length is the balance between attraction paying off and nuclei repelling. Bond energy is what was released getting there — and what it costs to break.',
        'Ionic bonding is a transfer, and the resulting attraction has no direction, so ions build a continuous lattice rather than molecules.',
        'High melting point, brittleness, insulating when solid and conducting when molten are all consequences of that lattice.',
        'Metallic bonding is positive ions in a shared sea of electrons, which explains conduction, shine and malleability together.',
      ],
    },

    {
      id: 'covalent',
      title: 'Covalent bonding and Lewis structures',
      mins: 20,
      builds_on: ['why-bond'],
      hook() {
        return frag(
          p('Two chlorine atoms both want an electron. Neither will give one up. So what happens when they meet?'),
          p('They share. One electron from each, held between them, counted by both — and each atom now gets to call its shell full while giving up nothing outright.'),
          p('That trick, a shared pair counted twice, is the whole of covalent bonding, and it is how every molecule in your body is held together.'));
      },
      pages: [
        {
          h: 'A shared pair, counted twice',
          body() {
            return frag(
              p('When two non-metals meet, neither can win the tug of war outright, so they compromise: a pair of electrons sits between the two nuclei, attracted to both, and each atom counts the pair towards its own shell.'),
              p('That double-counting is not a cheat. The pair really is near both nuclei, so both really do feel it. And it is why the arithmetic works: two chlorine atoms bring seven valence electrons each, share one pair, and both end up counting eight.'),
              eq('Cl(7) + Cl(7), sharing one pair -> each counts 8'),
              p('A shared pair is one ', b('single bond'), ', drawn as a line. Share two pairs and it is a double bond; three pairs is a triple bond.'),
              strip('Three bond orders, all real, all in molecules you have met.', [
                { smiles: 'CC', label: 'ethane', sub: 'C–C single bond' },
                { smiles: 'C=C', label: 'ethene', sub: 'C=C double bond' },
                { smiles: 'C#C', label: 'ethyne', sub: 'C≡C triple bond' },
              ]),
              p('More shared pairs means more attraction holding the two nuclei together, so a double bond is shorter and stronger than a single one, and a triple bond shorter and stronger still. That is a prediction you can check against real measurements, and it holds.'),
              callout(b('And this is why covalent bonding gives molecules. '), 'Unlike the ionic case, a shared pair sits between ', em('two particular atoms'), '. It has a direction. So covalent substances are made of discrete molecules with definite formulas and definite shapes — and the shape is the subject of the next lesson.'));
          },
        },
        {
          h: 'Drawing them: the counting method',
          body() {
            return frag(
              p('A ', term('Lewis structure', 'A drawing showing every valence electron in a molecule: bonds as lines, everything else as pairs of dots. It is electron bookkeeping, and it is how you work out a molecule’s shape.'), ' shows every valence electron — bonds as lines, the rest as pairs of dots. There is a method, and it is arithmetic rather than guesswork.'),
              table(['Step', 'What you do'], [
                ['1. Count what you have', 'Add up the valence electrons of every atom. Adjust for charge: a 2− ion has gained two electrons, so add two.'],
                ['2. Count what they need', 'Eight each, except hydrogen at two. This is what they would need if none of them shared.'],
                ['3. Subtract', 'Needed minus available is the number of electrons that have to be shared. Divide by two for the number of bonds.'],
                ['4. Place the bonds', 'One to each outer atom first, then spend anything left over making some of them double or triple.'],
                ['5. Everything else is lone pairs', 'Fill the outer atoms to eight, then whatever is left sits on the central atom.'],
              ]),
              p('Step 3 is the one worth understanding rather than following. Why does needed minus available give the ', em('shared'), ' electrons? Because a shared pair gets counted twice — once by each atom — so the gap between what they collectively need and what actually exists is exactly the double-counting, which is exactly the sharing.'),
              worked('Draw carbon dioxide, CO₂.', [
                { q: 'Count what you have', why: 'Carbon brings 4, each oxygen brings 6.', maths: '4 + 12 = 16 electrons' },
                { q: 'Count what they need', why: 'Three atoms, eight each.', maths: '24 electrons' },
                { q: 'Subtract, and halve', why: '24 − 16 = 8 electrons shared, and a shared pair is one bond.', maths: '4 bonds' },
                { q: 'Place them', why: 'One bond to each oxygen uses two, and the two left over make each of those bonds a double. O=C=O.' },
                { q: 'Lone pairs', why: '16 available, 8 in bonds, 8 left. Each oxygen needs two more pairs to reach eight, which uses all eight. Carbon gets none — its four bonds already give it eight.' },
              ]),
              p('Everything in that worked example came out of the app’s own Lewis code, which is the same code that marks your answers. Run any formula you like through it:'),
              ME.sims.lewis({ start: 'CO2' }));
          },
        },
        {
          h: 'When eight is not the answer',
          body() {
            return frag(
              p('The octet rule is a good rule with three honest exceptions, and knowing them is more useful than pretending they do not exist.'),
              h4('Too few: boron and beryllium'),
              p('Run BF₃ through the counting method with eight-for-everyone and you get four bonds for three fluorines, which is impossible. The reason is that boron genuinely settles for six electrons. It is in group 13 with three valence electrons, and finding five more is expensive enough that six is the better deal.'),
              p('This is not a footnote — it is why BF₃ is such an aggressive electron-grabber. It has a gap, and anything with a lone pair to offer will be seized on.'),
              h4('Too many: expanded octets'),
              p('SF₆ exists, and there is no way to draw it with eight electrons on the sulfur. It has twelve. PCl₅ has ten on the phosphorus.'),
              p('This is only possible below period 2, because only then are there d orbitals close enough in energy to be usable. Nitrogen cannot do it — NF₅ does not exist — and phosphorus, directly below, can. Same group, different answer, and the difference is having d orbitals available.'),
              h4('An odd number: radicals'),
              p('Nitrogen monoxide, NO, has eleven valence electrons. An odd number cannot be arranged in pairs, so one electron is left unpaired. Such a species is a ', term('radical', 'A species with an unpaired electron. Radicals are usually very reactive, because pairing that electron up is a strong incentive.'), ', and it is usually extremely reactive for exactly that reason.'),
              p('NO is a real molecule that does real work — your blood vessels use it as a signal to relax — and it does not obey the octet rule at all.'),
              warnCallout(b('The app will tell you which case you are in. '), 'Type NF5 into the builder and it explains that period 2 cannot expand. Type NO and it says the electron count is odd. A tool that refuses with a reason teaches more than one that produces a confident wrong drawing.'));
          },
        },
        {
          h: 'Resonance: when one drawing is not enough',
          body() {
            return frag(
              p('Carbonate, CO₃²⁻, comes out of the counting method as one double bond and two single bonds to three identical oxygens.'),
              p('Which immediately raises a problem: which oxygen gets the double bond? Nothing tells them apart. Any answer would be arbitrary.'),
              p('And measurement settles it: all three bonds in carbonate are the ', b('same length'), ', and that length is between a single and a double C–O bond. So none of the three drawings is right, and the real molecule is not flicking between them either.'),
              callout(b('The molecule is the average. '), 'The extra pair is spread over all three bonds equally, giving three identical bonds of order about one and a third. Drawing several structures and saying "average these" is called ', em('resonance'), ', and it is an admission that Lewis structures — which put every electron in a definite place — cannot quite express a molecule where some electrons are spread out.'),
              p('It is worth being clear that resonance is a limitation of the ', em('notation'), ', not something the molecule does. Carbonate is not oscillating. Our drawing system simply cannot show a pair of electrons in three places at once, so we draw three pictures and average them.'),
              h4('Where you will meet it again'),
              p('Benzene is the famous case: six carbons in a ring, alternating double bonds in the drawing, all six bonds identical in reality. That spread-out sharing makes benzene remarkably stable and is the reason aromatic compounds behave as their own category — Unit 15 returns to it.'),
              drawing('c1ccccc1', { width: 240, height: 200 }),
              p('The app flags resonance when it finds identical outer atoms with unequal bonds, so you can see which structures need the caveat.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why is a double bond shorter than a single bond?',
          options: [
            { t: 'Two shared pairs pull the nuclei together harder than one.', ok: true,
              why: 'Right, and stronger too. More shared electrons between the same two nuclei means more attraction, so the balance point moves closer in.' },
            { t: 'Because the atoms are smaller.', ok: false,
              why: 'The atoms are the same. What changes is how hard they are pulled together.' },
            { t: 'Because there is no room for more.', ok: false,
              why: 'Triple bonds exist and are shorter still, so room is not the constraint.' },
          ] },
        { kind: 'fillstep', after: 1,
          q: 'Work through ammonia, NH₃.',
          steps: [
            { text: 'Nitrogen brings 5 valence electrons and each hydrogen brings 1, so 8 are available.' },
            { text: 'Separately they would need 8 + 2 + 2 + 2 = 14.' },
            { text: '14 − 8 = 6 electrons must be shared.' },
            { blank: true, before: 'A shared pair is one bond, so that is', after: 'bonds' },
          ],
          numeric: true, answer: 3, tol: 0.001,
          right: 'Three bonds, one to each hydrogen — and the 8 − 6 = 2 electrons left over are the lone pair on the nitrogen that makes ammonia a base.',
          wrong: 'Six shared electrons, two per bond.' },
        { kind: 'choice', after: 2,
          q: 'Why can sulfur hold twelve electrons when nitrogen cannot hold ten?',
          options: [
            { t: 'Sulfur is in period 3, so it has d orbitals near enough in energy to use. Nitrogen, in period 2, has none.', ok: true,
              why: 'Right, and it is a clean prediction: PCl₅ exists and NCl₅ does not, from the same group, purely because of what orbitals are available.' },
            { t: 'Sulfur is bigger, so more atoms fit round it.', ok: false,
              why: 'Size helps, and the real constraint is orbitals rather than space — electrons need somewhere to go, not just room.' },
            { t: 'Sulfur has more protons.', ok: false,
              why: 'Chlorine has more protons than sulfur and expands less readily. It is the available orbitals that decide.' },
          ] },
      ],
      quizzes: [
        { kind: 'count', q: 'How many electrons are in one single covalent bond?', answer: 2,
          right: 'Two — one shared pair, counted by both atoms. That double-counting is the whole trick.',
          wrong: 'A bond is one shared pair.' },
        { kind: 'count', q: 'How many valence electrons are there altogether in water, H₂O?', answer: 8,
          right: '8 — six from oxygen and one from each hydrogen. Four bonds’ worth of pairs: two bonds and two lone pairs.',
          wrong: 'Add the group-number valence count for each atom.',
          hints: { 10: 'That is the total number of electrons in the molecule. Only the valence ones count here — oxygen’s inner two are core.' } },
        { kind: 'choice', q: 'Why does covalent bonding give molecules while ionic bonding gives lattices?',
          options: [
            { t: 'A shared pair sits between two particular atoms, so it has a direction. Ionic attraction pulls every way at once.', ok: true,
              why: 'Right, and it is the reason covalent compounds have shapes at all — which turns out to decide nearly everything about how they behave.' },
            { t: 'Covalent bonds are weaker.', ok: false,
              why: 'Diamond is covalent throughout and is the hardest natural substance. Strength is not the difference; direction is.' },
            { t: 'Covalent compounds have fewer atoms.', ok: false,
              why: 'Proteins have tens of thousands. The difference is that the bonding is directional.' },
          ] },
        { kind: 'choice', q: 'What does resonance actually mean?',
          options: [
            { t: 'That the electrons are spread out over several bonds, and our drawing system cannot show that, so we draw several structures and average them.', ok: true,
              why: 'Right — it is a limitation of the notation, not something the molecule does. All three carbonate bonds are identical and always have been.' },
            { t: 'That the molecule flips rapidly between the structures.', ok: false,
              why: 'The standard misreading. There is no flipping: the bonds are all the same length all the time, and that length is between single and double.' },
            { t: 'That the molecule vibrates.', ok: false,
              why: 'Molecules do vibrate, and that is a different phenomenon with nothing to do with resonance structures.' },
          ] },
        { kind: 'choice', q: 'BF₃ has only six electrons around the boron. What does that predict about its behaviour?',
          options: [
            { t: 'It will grab anything with a lone pair to offer, because it has a gap.', ok: true,
              why: 'Right, and it does exactly that — BF₃ is a textbook electron-pair acceptor. The exception to the octet rule is the whole reason for its chemistry.' },
            { t: 'It will be unreactive, because it is stable as it is.', ok: false,
              why: 'The opposite. Six is the best boron can manage on its own, and it will take eight if anything offers.' },
            { t: 'It will lose its remaining electrons.', ok: false,
              why: 'Boron is not metallic enough for that. It accepts a pair instead.' },
          ] },
        { kind: 'choice', q: 'NO has eleven valence electrons. What follows?',
          options: [
            { t: 'One electron must be unpaired, so NO is a radical and very reactive.', ok: true,
              why: 'Right — an odd number cannot be arranged in pairs. And it is a real, useful molecule: your blood vessels use it as a signal.' },
            { t: 'It cannot exist.', ok: false,
              why: 'It exists and matters biologically. It just does not obey the octet rule.' },
            { t: 'One atom must have nine electrons.', ok: false,
              why: 'The problem is parity, not distribution. Eleven electrons cannot all be paired however you arrange them.' },
          ] },
        { kind: 'numeric', q: 'For CH₄, how many electrons must be shared? (Available: 8. Needed separately: 16.)', answer: 8, tol: 0.001,
          right: '8 shared electrons, which is 4 bonds — one to each hydrogen, and no lone pairs anywhere.',
          wrong: 'Needed minus available.' },
        { kind: 'choice', q: 'Why does "needed minus available" give the number of shared electrons?',
          options: [
            { t: 'Because a shared pair is counted twice, once by each atom, so the shortfall is exactly the double-counting.', ok: true,
              why: 'Right, and this is the bit worth understanding rather than memorising — it turns a recipe into a reason.' },
            { t: 'It is a rule that happens to work.', ok: false,
              why: 'It works for a reason, and the reason is the double-counting. Knowing it means you can tell when the method is about to fail.' },
            { t: 'Because electrons come in pairs.', ok: false,
              why: 'They do pair up, and that explains the division by two rather than the subtraction.' },
          ] },
      ],
      practice: 'valence-count',
      mistakes: [
        { wrong: 'Counting a shared pair once.',
          why: 'Both atoms count it. That is what sharing means, and it is why two chlorines with seven each can both claim eight.' },
        { wrong: 'Forcing eight electrons onto boron or beryllium.',
          why: 'They settle for six and four. Insisting on eight gives BF₃ four bonds for three fluorines, which is impossible — and it hides the reason BF₃ is so reactive.' },
        { wrong: 'Getting the charge adjustment backwards.',
          why: 'A negative ion has gained electrons, so add them. CO₃²⁻ has two more than its neutral atoms bring, not two fewer.' },
        { wrong: 'Thinking a resonance structure is something the molecule does.',
          why: 'It is a limitation of the drawing. Carbonate’s three bonds are identical and unchanging; we just cannot draw a pair of electrons in three places at once.' },
      ],
      recap: [
        'A covalent bond is a shared pair, counted by both atoms — which is why two atoms with seven electrons each can both reach eight.',
        'More shared pairs means shorter and stronger: triple beats double beats single.',
        'The counting method is: available, needed, subtract for shared, place bonds, everything else is lone pairs. The subtraction works because sharing is double-counting.',
        'Three honest exceptions: boron and beryllium take fewer, period 3 and below can take more, and an odd electron count makes a radical.',
        'Resonance means the electrons are spread out and Lewis notation cannot show it, so we average several drawings. The molecule is not flipping between them.',
      ],
    },

    {
      id: 'shapes',
      title: 'Molecular shapes: VSEPR',
      mins: 17,
      builds_on: ['covalent'],
      hook() {
        return frag(
          p('Carbon dioxide is a straight line. Water is bent at 104.5°. Both are one central atom with two others attached.'),
          p('That difference in angle is why CO₂ drifts out of a fizzy drink while water forms oceans; why ice floats; why water dissolves salt and CO₂ does not. Almost everything about water comes from that bend.'),
          p('And the bend is caused by two pairs of electrons you cannot see.'));
      },
      pages: [
        {
          h: 'One rule, honestly',
          body() {
            return frag(
              p('The whole of molecular shape at this level comes from one idea: ', b('groups of electrons around an atom repel each other, so they get as far apart as they can'), '.'),
              p('That is it. The name is ', term('VSEPR', 'Valence Shell Electron Pair Repulsion: the idea that electron groups around a central atom spread out as far as possible, which fixes the shape.'), ', and the only skill is counting groups.'),
              p('A "group" is anything holding electrons around the central atom: a single bond, a double bond, a triple bond, or a lone pair. A double bond counts as ', em('one'), ' group, not two — both pairs are in the same place, pointing the same way, so they push as one.'),
              table(['Groups', 'Furthest apart is', 'Angle'], [
                ['2', 'opposite ends of a line', '180°'],
                ['3', 'a flat triangle', '120°'],
                ['4', 'the corners of a tetrahedron', '109.5°'],
                ['5', 'a trigonal bipyramid', '90° and 120°'],
                ['6', 'an octahedron', '90°'],
              ]),
              warnCallout(b('Four groups are not a flat cross. '), 'This is the one that catches everybody. On paper you draw methane as a cross at 90°, because paper is flat. In three dimensions, four things get further apart at the corners of a tetrahedron, 109.5° apart. Methane is a tetrahedron, and drawing it as a cross is a compromise with the page.'));
          },
        },
        {
          h: 'Lone pairs count, then disappear',
          body() {
            return frag(
              p('Here is the part that produces every interesting shape. Lone pairs take up room and push the bonds around — but they are not atoms, so the shape is ', b('named after the atoms you can see'), '.'),
              p('Methane, ammonia and water all have four groups around the central atom, so all three have a tetrahedral ', em('arrangement'), '. They have completely different shapes:'),
              table(['Molecule', 'Bonds', 'Lone pairs', 'Shape you see', 'Angle'], [
                ['CH₄', '4', '0', 'tetrahedral', '109.5°'],
                ['NH₃', '3', '1', 'trigonal pyramidal', '107°'],
                ['H₂O', '2', '2', 'bent', '104.5°'],
              ]),
              p('Notice the angle shrinking: 109.5, then 107, then 104.5. Each lone pair squeezes the bonds a little closer together.'),
              p('The reason is that a lone pair is held by only one nucleus, while a bonding pair is shared between two and therefore pulled tighter and thinner. So a lone pair is fatter, takes up more angular room, and pushes the bonding pairs in.'),
              callout(b('Which makes the angles a prediction rather than a list. '), 'You can predict that a molecule with two lone pairs will have a smaller angle than one with one, before looking anything up. And the measurements agree.'),
              p('Use the builder below and turn the lone pairs off. The drawing becomes the shape the name describes — which is exactly the point.'),
              ME.sims.lewis({ start: 'NH3', presets: ['CH4', 'NH3', 'H2O', 'CO2', 'SO2', 'CH2O', 'BF3', 'PCl5', 'SF4', 'ClF3', 'XeF4', 'SF6'] }));
          },
        },
        {
          h: 'Why the shape matters this much',
          body() {
            return frag(
              p('It is fair to ask why anyone should care whether a molecule is bent by 104.5° or straight. The answer is that shape decides function, and there are three levels to it.'),
              h4('1. Shape decides whether a molecule is polar'),
              p('CO₂ and H₂O both have polar bonds — oxygen pulls harder than carbon or hydrogen in each. But CO₂ is straight, so the two pulls point in exactly opposite directions and cancel. Water is bent, so they do not.'),
              p('Result: water is polar and CO₂ is not, purely because of shape. The next lesson is about what that gets you, and it is a great deal.'),
              h4('2. Shape decides how molecules pack and stick'),
              p('Whether a substance is a gas, a liquid or a solid at room temperature depends on how well its molecules cling to one another, and that depends on their shapes fitting together. Straight-chain molecules stack neatly and have higher boiling points than their branched isomers, which is why the shape of a fat determines whether it is butter or oil.'),
              h4('3. Shape decides biology'),
              p('Enzymes work by having a pocket shaped to fit one particular molecule. A drug works by fitting a receptor. Your sense of smell is molecules fitting into shaped receptors in your nose.'),
              p('Which is why two molecules with the same formula and different shapes can have utterly different effects — the point Unit 15 makes with mirror-image molecules, where one version is a medicine and the other is useless or worse.'),
              okCallout(b('So VSEPR is not a shape-naming exercise. '), 'It is the step between a formula and everything a substance actually does. Count the groups, get the shape, and the properties follow.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'A carbon has two single bonds and one double bond. How many groups is that?',
          options: [
            { t: 'Three — a double bond is one group, because both pairs point the same way.', ok: true,
              why: 'Right, so the shape is trigonal planar at 120°. This is the rule people forget, and it changes the answer completely.' },
            { t: 'Four, because the double bond has two pairs.', ok: false,
              why: 'Both pairs of a double bond sit between the same two atoms, pointing in the same direction, so they push as one group.' },
            { t: 'Two, because you only count different atoms.', ok: false,
              why: 'Every bond counts as a group, whatever its order. There are three bonds here, so three groups.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Water’s angle is 104.5°, not the tetrahedral 109.5°. Why?',
          options: [
            { t: 'Its two lone pairs are held by one nucleus each, so they are fatter than bonding pairs and squeeze the bonds closer together.', ok: true,
              why: 'Right, and it makes the ordering a prediction: methane 109.5, ammonia with one lone pair 107, water with two 104.5. Each lone pair costs a couple of degrees.' },
            { t: 'Because water only has two bonds.', ok: false,
              why: 'Two bonds with nothing else would be a straight line at 180°. It is the lone pairs that make it bent, and that make it 104.5 rather than 109.5.' },
            { t: 'Because oxygen is small.', ok: false,
              why: 'Size affects bond lengths more than angles. The squeeze comes from the lone pairs.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What single idea is VSEPR?',
          options: [
            { t: 'Electron groups around an atom repel, so they get as far apart as possible.', ok: true,
              why: 'Right, and everything else is counting. Once you can count groups and lone pairs, every shape in the course falls out.' },
            { t: 'Atoms arrange themselves to look symmetric.', ok: false,
              why: 'Symmetry is often the outcome, and the cause is repulsion — which is why lone pairs break the symmetry.' },
            { t: 'Bonds always point at 90° to each other.', ok: false,
              why: 'Only in the octahedral case. Four groups sit at 109.5°, three at 120°, two at 180°.' },
          ] },
        { kind: 'choice', q: 'Why is methane a tetrahedron rather than a flat cross?',
          options: [
            { t: 'In three dimensions, four groups get further apart at the corners of a tetrahedron (109.5°) than in a plane (90°).', ok: true,
              why: 'Right. The flat cross is a compromise with the page, and it costs you nearly twenty degrees of reality.' },
            { t: 'Because carbon is tetrahedral by nature.', ok: false,
              why: 'Carbon is tetrahedral when it has four groups and trigonal planar when it has three, as in ethene. The groups decide, not the element.' },
            { t: 'Because the hydrogens are different sizes.', ok: false,
              why: 'All four hydrogens are identical, so nothing distinguishes the corners. The tetrahedron comes from four equal groups getting as far apart as three dimensions allow.' },
          ] },
        { kind: 'choice', q: 'SO₂ has one lone pair on the sulfur, two bonded oxygens, and an angle of about 118°. Why not 120°?',
          options: [
            { t: 'Three groups would be a flat triangle at 120°, but one is a lone pair, which is fatter and squeezes the bonds slightly closer.', ok: true,
              why: 'Right — the arrangement is trigonal planar, the visible shape is bent, and the lone pair costs a couple of degrees.' },
            { t: 'Because it has double bonds.', ok: false,
              why: 'Double bonds are slightly fatter than single ones, and the lone pair is the main effect here.' },
            { t: 'The measurement is imprecise.', ok: false,
              why: 'It is measured very precisely. The deviation from 120° is real and has a cause.' },
          ] },
        { kind: 'order', q: 'Order these bond angles, smallest first.',
          items: ['H₂O (2 lone pairs)', 'NH₃ (1 lone pair)', 'CH₄ (no lone pairs)', 'CO₂ (2 groups)'],
          right: 'Yes: 104.5, 107, 109.5, 180. Each lone pair squeezes the angle a little, and two groups with no lone pairs go straight to a line.',
          wrong: 'More lone pairs means a smaller angle — and a molecule with only two groups and no lone pairs is straight.' },
        { kind: 'choice', q: 'CO₂ and H₂O both have polar bonds, but only water is a polar molecule. Why?',
          options: [
            { t: 'CO₂ is straight, so the two pulls point exactly opposite and cancel. Water is bent, so they do not.', ok: true,
              why: 'Right, and this is the whole reason shape matters. Two molecules with the same kind of bonds behave completely differently because of an angle.' },
            { t: 'Carbon dioxide has no polar bonds.', ok: false,
              why: 'Oxygen pulls much harder than carbon, so each C=O bond is distinctly polar. They cancel because of the geometry.' },
            { t: 'Water has more atoms.', ok: false, why: 'Both have three atoms.' },
          ] },
        { kind: 'choice', q: 'Why is a lone pair "fatter" than a bonding pair?',
          options: [
            { t: 'It is held by one nucleus rather than two, so it is not pulled thin between them and spreads out more.', ok: true,
              why: 'Right, and that is what makes the angle predictions work. A fatter group takes more angular room and pushes the others in.' },
            { t: 'It has more electrons.', ok: false, why: 'Both are pairs — two electrons each.' },
            { t: 'It is further from the nucleus.', ok: false,
              why: 'It sits at a similar distance. The difference is that only one nucleus is pulling on it.' },
          ] },
        { kind: 'choice', q: 'Why does molecular shape matter biologically?',
          options: [
            { t: 'Enzymes, receptors and smell all work by a molecule fitting a shaped pocket, so shape decides function.', ok: true,
              why: 'Right — which is why two molecules with the same formula and different shapes can be a medicine and a useless impurity.' },
            { t: 'Because rounder molecules diffuse faster.', ok: false,
              why: 'Shape affects diffusion a little, and the dominant effect is fitting into binding sites.' },
            { t: 'It does not — biology depends on formulas.', ok: false,
              why: 'Mirror-image molecules have identical formulas and can differ completely in effect. Shape is the whole story.' },
          ] },
      ],
      practice: 'shape',
      mistakes: [
        { wrong: 'Counting a double bond as two groups.',
          why: 'Both pairs point the same way, so they repel as one. Formaldehyde’s carbon has three groups and is trigonal planar, not four groups and tetrahedral.' },
        { wrong: 'Drawing four groups as a flat 90° cross.',
          why: 'Four groups get further apart at 109.5° in three dimensions. The cross is what a flat page forces on you.' },
        { wrong: 'Including lone pairs in the shape name.',
          why: 'Water has a tetrahedral arrangement and a bent shape. The arrangement counts everything; the name counts only the atoms.' },
        { wrong: 'Ignoring lone pairs when predicting the angle.',
          why: 'They are why the angle is 104.5° rather than 109.5°. Counting them for the arrangement and leaving them out of the name is not a contradiction — it is the whole method.' },
      ],
      recap: [
        'One rule: electron groups repel and get as far apart as they can. Everything else is counting.',
        'A group is a bond of any order or a lone pair. A double bond is one group, because both pairs point the same way.',
        '2 groups is linear, 3 is trigonal planar, 4 is tetrahedral at 109.5°, 5 is a trigonal bipyramid, 6 is octahedral.',
        'Lone pairs count towards the arrangement but are left out of the name, and each one squeezes the angle by a couple of degrees because it is fatter than a bonding pair.',
        'Shape decides polarity, decides how molecules pack, and decides biology — so it is the step between a formula and what a substance actually does.',
      ],
    },

    {
      id: 'polarity',
      title: 'Polarity: when sharing is not equal',
      mins: 16,
      builds_on: ['shapes', 'trends'],
      hook() {
        return frag(
          p('Oil and water do not mix, and no amount of shaking fixes it. Salt dissolves in water and not in oil. Petrol dissolves grease and water does not.'),
          p('One idea explains all of that, and it is not about how strong the bonds are. It is about whether the sharing inside each molecule is even.'));
      },
      pages: [
        {
          h: 'Unequal sharing makes a polar bond',
          body() {
            return frag(
              p('A covalent bond between two identical atoms is a fair split — Cl–Cl has no reason to favour either end. But in H–Cl, chlorine is much more electronegative, so the shared pair spends more of its time nearer the chlorine.'),
              p('Nothing has been transferred. There are no ions. But there is now a slight negative end and a slight positive end, written δ− and δ+, where δ means "a bit of".'),
              eq('H—Cl  becomes  δ+H—Clδ−'),
              p('That is a ', term('polar bond', 'A covalent bond where the two atoms pull unequally on the shared pair, leaving one end slightly negative and the other slightly positive.'), ', and how polar it is depends on the electronegativity difference — which you already know how to read off the periodic table from Unit 5.'),
              table(['Electronegativity difference', 'What you have', 'Example'], [
                ['0 to about 0.4', 'essentially non-polar covalent', 'C–H, at 0.35'],
                ['about 0.4 to 1.7', 'polar covalent', 'O–H, at 1.24'],
                ['above about 1.7', 'ionic — the pull is so unequal the electron has effectively moved', 'Na–Cl, at 2.23'],
              ]),
              callout(b('So bonding is a spectrum, not three boxes. '), 'Pure covalent at one end, ionic at the other, and most real bonds somewhere in between. The boundaries above are conventions for talking, not facts about nature — there is nothing special that happens at exactly 1.7.'));
          },
        },
        {
          h: 'A polar molecule needs polar bonds and the wrong shape',
          body() {
            return frag(
              p('This is the step that separates people who have understood the topic from people who have learned it.'),
              p('A molecule is polar if it has an overall positive end and negative end. For that you need two things: the bonds must be polar, ', b('and'), ' the shape must not cancel them out.'),
              p('A bond dipole has a direction, so several of them add up like arrows. Point them symmetrically and they cancel to nothing.'),
              table(['Molecule', 'Bonds', 'Shape', 'Molecule'], [
                ['CO₂', 'polar', 'linear — pulls exactly opposite', 'non-polar'],
                ['H₂O', 'polar', 'bent — pulls do not cancel', 'polar'],
                ['CCl₄', 'polar', 'tetrahedral — symmetric', 'non-polar'],
                ['CHCl₃', 'polar', 'tetrahedral but one corner is different', 'polar'],
                ['CH₄', 'barely polar', 'tetrahedral', 'non-polar'],
                ['NH₃', 'polar', 'pyramidal — lone pair on top', 'polar'],
              ]),
              warnCallout(b('Polar bonds, non-polar molecule. '), 'CCl₄ has four distinctly polar bonds and no overall polarity at all, because a tetrahedron with four identical corners pulls equally in every direction. Swap one chlorine for a hydrogen and the symmetry breaks and it becomes polar — same kinds of bond, different answer.'),
              p('There is one more case worth knowing: a lone pair is itself a lump of charge on one side. PH₃ has almost non-polar bonds — phosphorus and hydrogen are nearly identical in electronegativity — and it is still a polar molecule, because the lone pair sticks out.'),
              p('Try it. Every verdict below is computed from the shape and the electronegativities, not looked up:'),
              ME.sims.lewis({ start: 'CCl4', presets: ['CCl4', 'H2O', 'CO2', 'NH3', 'PH3', 'BF3', 'CH2O', 'SF6', 'SF4', 'H2S', 'OF2', 'SO3'] }));
          },
        },
        {
          h: 'Like dissolves like',
          body() {
            return frag(
              p('Now the payoff, and it is one of the most useful rules in chemistry.'),
              p('Polar molecules stick to polar molecules, because a δ+ end has a δ− end to find. Non-polar molecules stick to each other too, but only weakly and for a different reason (next lesson). What does not work is mixing the two: a polar molecule dropped among non-polar ones gains nothing, and breaking up the polar network to let it in costs energy.'),
              eq('like dissolves like'),
              p('So water dissolves salt and sugar and alcohol — all polar or charged. Petrol and oil dissolve grease and wax and tar — all non-polar. And water and oil separate, not because they repel each other, but because each does better with its own kind.'),
              h4('The useful consequences'),
              table(['Situation', 'What polarity explains'], [
                ['Soap works', 'A soap molecule has a polar head and a long non-polar tail, so it can hold on to water at one end and grease at the other. It is a translator between the two worlds.'],
                ['Vitamin C versus vitamin D', 'Vitamin C is polar, dissolves in water and leaves the body quickly, so you need it daily. Vitamin D is non-polar, stores in fat, and can be overdosed.'],
                ['Dry cleaning', 'Non-polar solvents remove the greasy stains water cannot touch.'],
                ['Getting a drug into a cell', 'A cell membrane is a non-polar layer. A drug that is too polar cannot cross it; too non-polar and it will not dissolve in blood. Most of drug design is that balance.'],
              ]),
              okCallout(b('Which is a good moment to notice how far one angle has taken you. '), 'Water is bent, so it is polar, so it dissolves ionic things, so it carries the chemistry of every living cell. Change 104.5° to 180° and there is no biology.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'What makes a bond polar?',
          options: [
            { t: 'The two atoms pull unequally on the shared pair, because their electronegativities differ.', ok: true,
              why: 'Right, and the size of the difference tells you how polar. Under about 0.4 it hardly counts; over about 1.7 the electron has effectively moved and you call it ionic.' },
            { t: 'One atom has taken the electron completely.', ok: false,
              why: 'That is the ionic end of the spectrum. A polar bond is still shared, just unevenly.' },
            { t: 'The bond is bent.', ok: false,
              why: 'Bonds are not bent — molecules are. Bond polarity is about the two atoms; molecular polarity brings shape into it.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'CCl₄ has four polar bonds and is a non-polar molecule. Why?',
          options: [
            { t: 'The tetrahedral shape has four identical corners, so the four pulls cancel exactly.', ok: true,
              why: 'Right, and it is the case that separates understanding from memorising. Swap one chlorine for a hydrogen and the symmetry breaks and it becomes polar.' },
            { t: 'The C–Cl bonds are not really polar.', ok: false,
              why: 'Chlorine is much more electronegative than carbon; each bond is clearly polar. The geometry is what cancels them.' },
            { t: 'The chlorines cancel each other chemically.', ok: false,
              why: 'It is a vector cancellation, not a chemical one — four equal pulls arranged symmetrically sum to zero.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What two things does a molecule need in order to be polar?',
          options: [
            { t: 'Polar bonds, and a shape that does not cancel them.', ok: true,
              why: 'Right — or, failing polar bonds, a lone pair sticking out on one side. Both conditions matter, and forgetting the shape is the usual slip.' },
            { t: 'Polar bonds, and that is enough.', ok: false,
              why: 'CO₂ and CCl₄ both have clearly polar bonds and no overall polarity, because their shapes cancel.' },
            { t: 'An asymmetric shape, and that is enough.', ok: false,
              why: 'Nearly — a shape can only fail to cancel something that is there. Though a lone pair alone can do it, as in PH₃.' },
          ] },
        { kind: 'choice', q: 'Why does oil not mix with water?',
          options: [
            { t: 'Water molecules do much better holding on to each other than to non-polar oil, so they exclude it.', ok: true,
              why: 'Right — and note it is not that they repel. Each does better with its own kind, so they separate.' },
            { t: 'Oil and water repel each other.', ok: false,
              why: 'The common phrasing and slightly wrong. There is a weak attraction; it is just far weaker than water-to-water.' },
            { t: 'Oil is lighter than water.', ok: false,
              why: 'It is, which is why it floats rather than why it separates. Something denser and non-polar would still not mix.' },
          ] },
        { kind: 'choice', q: 'Why does soap clean grease?',
          options: [
            { t: 'It has a polar head and a non-polar tail, so it holds water at one end and grease at the other.', ok: true,
              why: 'Right — a translator between the two worlds. The tails bury themselves in the grease and the heads face the water, and the whole droplet gets carried off.' },
            { t: 'It dissolves grease chemically.', ok: false,
              why: 'It does not react with it. It surrounds it, using a molecule with one end of each kind.' },
            { t: 'It makes water less polar.', ok: false,
              why: 'Water is unchanged. Soap bridges the gap rather than altering either side.' },
          ] },
        { kind: 'choice', q: 'PH₃ has almost non-polar bonds and is a polar molecule. How?',
          options: [
            { t: 'The lone pair on the phosphorus is a lump of charge on one side, which gives the molecule a direction on its own.', ok: true,
              why: 'Right, and it is the case a bonds-only rule gets wrong. Electronegativity is not the only way to be lopsided.' },
            { t: 'The P–H bonds are actually strongly polar.', ok: false,
              why: 'Phosphorus is 2.19 and hydrogen 2.20 — as close to equal as you will find. The lone pair does the work.' },
            { t: 'It is not polar.', ok: false,
              why: 'It has a measured dipole moment of about 0.58 D. Small, but real.' },
          ] },
        { kind: 'choice', q: 'Why can you overdose on vitamin D but not easily on vitamin C?',
          options: [
            { t: 'D is non-polar and stores in fat; C is polar, dissolves in water and leaves in urine.', ok: true,
              why: 'Right — a polarity argument with a direct medical consequence. Anything that stores can accumulate.' },
            { t: 'Vitamin D is more toxic per molecule.', ok: false,
              why: 'The difference is accumulation rather than intrinsic toxicity — and accumulation is a polarity question.' },
            { t: 'Vitamin C is not absorbed.', ok: false,
              why: 'It is absorbed perfectly well. It just does not stay.' },
          ] },
        { kind: 'choice', q: 'A bond has an electronegativity difference of 2.2. What is it best called?',
          options: [
            { t: 'Ionic — the pull is so unequal the electron has effectively moved across.', ok: true,
              why: 'Right, above about 1.7 by convention. Though the boundary is a convention for talking, not something that happens in nature at exactly 1.7.' },
            { t: 'Polar covalent.', ok: false,
              why: 'That is roughly 0.4 to 1.7. At 2.2 the sharing has stopped being sharing.' },
            { t: 'Non-polar covalent.', ok: false, why: 'That is under about 0.4 — nearly equal pulling.' },
          ] },
        { kind: 'choice', q: 'Why is "like dissolves like" true?',
          options: [
            { t: 'A polar molecule among non-polar ones gains nothing, and breaking up the polar network to admit it costs energy.', ok: true,
              why: 'Right — dissolving has to pay for itself. It is an energy argument, which is why the rule has exceptions when other factors are large.' },
            { t: 'Similar molecules have similar sizes.', ok: false,
              why: 'Size matters a little, and polarity is what the rule is about. Methane and water are similar in size and do not mix well.' },
            { t: 'It is a coincidence of common substances.', ok: false,
              why: 'It follows from the energy of the interactions, which is why it generalises so reliably.' },
          ] },
        { kind: 'choice', q: 'What does bonding being a spectrum mean in practice?',
          options: [
            { t: 'That "ionic" and "covalent" are the two ends, and most real bonds sit somewhere in between.', ok: true,
              why: 'Right. Sorting every bond into one of two boxes hides the fact that an Al–Cl bond and an Na–Cl bond are not the same kind of thing.' },
            { t: 'That any bond can become any other.', ok: false,
              why: 'A given bond has a given character, set by the electronegativity difference. The spectrum is about the range that exists, not about switching.' },
            { t: 'That the categories are useless.', ok: false,
              why: 'They are very useful shorthand. They are just the ends of a continuum rather than separate species.' },
          ] },
      ],
      practice: 'polarity',
      mistakes: [
        { wrong: 'Assuming polar bonds mean a polar molecule.',
          why: 'CO₂ and CCl₄ are the standard counterexamples. Symmetric shapes cancel their bond dipoles exactly.' },
        { wrong: 'Thinking oil and water repel each other.',
          why: 'They attract weakly. The point is that water attracts water much more strongly, so the water squeezes the oil out.' },
        { wrong: 'Forgetting that a lone pair can make a molecule polar on its own.',
          why: 'PH₃ has essentially non-polar bonds and a real dipole, because a lone pair is charge sitting on one side.' },
        { wrong: 'Treating 1.7 as a law of nature.',
          why: 'It is a convention for deciding what to call a bond. Nothing changes abruptly at 1.7, and plenty of compounds sit awkwardly on the line.' },
      ],
      recap: [
        'A polar bond is unequal sharing, caused by an electronegativity difference, giving a δ+ end and a δ− end.',
        'Bonding is a spectrum: under about 0.4 is effectively non-polar, up to 1.7 is polar covalent, above that is ionic — with the boundaries being conventions.',
        'A polar molecule needs polar bonds and a shape that does not cancel them. CCl₄ fails the second test; PH₃ passes on a lone pair alone.',
        'Like dissolves like, because dissolving has to pay for itself in energy.',
        'That rule explains soap, dry cleaning, why vitamin D accumulates and vitamin C does not, and most of what makes drug design hard.',
      ],
    },

    {
      id: 'intermolecular',
      title: 'Forces between molecules, and why water is strange',
      mins: 18,
      builds_on: ['polarity'],
      hook() {
        return frag(
          p('Hydrogen sulfide, H₂S, is a gas at room temperature. Water, H₂O, is a liquid. They are the same shape, the same kind of bonding, and sulfur is the heavier atom — which normally means a higher boiling point, not a lower one.'),
          p('Water should boil at about −70 °C on the pattern its neighbours set. It boils at 100.'),
          p('That 170-degree anomaly is why there are oceans rather than a permanent atmosphere of steam, and it comes from a force ', em('between'), ' molecules rather than inside them.'));
      },
      pages: [
        {
          h: 'Inside a molecule, and between molecules',
          body() {
            return frag(
              p('There are two completely different strengths of attraction in play, and confusing them is behind most mistakes in this topic.'),
              table(['', 'Inside a molecule', 'Between molecules'], [
                ['What holds it', 'covalent bonds', 'intermolecular forces'],
                ['Strength', 'hundreds of kJ per mole', 'a few to tens of kJ per mole'],
                ['What breaks it', 'a chemical reaction', 'melting or boiling'],
              ]),
              callout(b('So boiling does not break any bonds. '), 'Boiling water separates H₂O molecules from each other. Every molecule survives intact — steam is still H₂O. To break the O–H bonds you would need something like electrolysis, which is a different and far more expensive operation.'),
              p('Which means melting and boiling points tell you about ', b('intermolecular'), ' forces, not about bond strengths. A substance with a high boiling point has molecules that cling to each other, not necessarily strong bonds inside them.'),
              h4('The one exception worth flagging'),
              p('Some substances have no separate molecules at all — diamond is one continuous covalent network, and so is quartz. To melt them you really do have to break covalent bonds, which is why diamond does not melt until about 3550 °C. Same idea, applied honestly: the melting point reflects whatever has to break.'));
          },
        },
        {
          h: 'The three forces, weakest first',
          body() {
            return frag(
              h4('1. Dispersion forces — every substance has them'),
              p('Electrons move. At any instant, purely by chance, they might be slightly more on one side of a molecule than the other, which makes a momentary δ+ and δ−. That instant dipole induces one in a neighbour, and the two attract.'),
              p('It is fleeting and weak, and it is happening constantly in every substance there is. Crucially it gets stronger with more electrons, because a bigger, floppier electron cloud is easier to distort.'),
              p('Which explains a pattern you can check: down the halogens, F₂ and Cl₂ are gases, Br₂ is a liquid, I₂ is a solid — identical bonding, increasing electron count, increasing stickiness.'),
              h4('2. Dipole–dipole — for polar molecules'),
              p('A permanently polar molecule has a δ+ end and a δ− end all the time, so neighbours line up and attract. Stronger than dispersion for molecules of similar size, and it is why polar substances generally boil higher than non-polar ones of the same mass.'),
              h4('3. Hydrogen bonding — the strong one'),
              p('A special and much stronger case of dipole–dipole, and it needs a specific setup: a hydrogen bonded to nitrogen, oxygen or fluorine, and a lone pair on an N, O or F nearby.'),
              p('Why those three? Because they are the most electronegative elements that also carry lone pairs. Attached to one of them, hydrogen’s single electron is dragged so far away that what is left is nearly a bare proton — tiny, highly concentrated positive charge — which can get extremely close to a neighbouring lone pair.'),
              eq('N, O or F — H ··· lone pair on N, O or F'),
              warnCallout(b('It is not a bond, despite the name. '), 'A hydrogen bond is roughly 20 kJ/mol, against around 460 for the O–H covalent bond inside water. Strong for an intermolecular force, weak next to a real bond — and the name misleads people for years.'));
          },
        },
        {
          h: 'Which is why water behaves the way it does',
          body() {
            return frag(
              p('Water is the extreme case, because each molecule has two hydrogens to donate ', em('and'), ' two lone pairs to accept with. So every water molecule can hydrogen-bond to four others, and liquid water is an enormous, constantly rearranging network.'),
              p('Nearly every unusual thing about water follows from that.'),
              table(['Water does this', 'Because'], [
                ['Boils at 100 °C instead of about −70', 'Separating the molecules means breaking a whole network of hydrogen bonds, not just pulling two apart.'],
                ['Ice floats', 'Freezing locks the network into an open hexagonal arrangement that holds the molecules further apart than jostling does in the liquid. Almost every other substance is denser as a solid.'],
                ['Has enormous heat capacity', 'Energy goes into stretching and breaking hydrogen bonds rather than into speeding molecules up, so the temperature climbs slowly.'],
                ['Has high surface tension', 'A molecule at the surface is pulled inwards by its network with nothing above to balance it — which is what lets insects walk on ponds.'],
                ['Dissolves ionic solids', 'Its polarity lets it surround an ion and hold it away from the lattice.'],
              ]),
              okCallout(b('And ice floating is not a curiosity. '), 'It means a freezing lake makes a lid rather than filling with ice from the bottom, so the water underneath stays liquid and things survive the winter. If water behaved like a normal substance, life in cold climates would have a much harder time.'),
              h4('The same force holds you together'),
              p('DNA’s two strands are held by hydrogen bonds between the bases, which is exactly the right strength: firm enough to keep the code stable, weak enough that the cell can unzip it to read or copy it. A covalent bond would be unusable — far too strong to open on demand.'),
              p('Protein folding is the same story. A protein is a chain that folds into a specific shape held largely by hydrogen bonds, and the shape is the function. Heat it and the hydrogen bonds break, the shape is lost, and it does not come back — which is what happens to an egg white in a frying pan.'),
              p('Every covalent bond in that egg is still intact. Only the folding changed.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'When water boils, what breaks?',
          options: [
            { t: 'The attractions between molecules. Every H₂O molecule survives — steam is still water.', ok: true,
              why: 'Right, and it is worth being firm about: boiling separates molecules, it does not break them. Breaking O–H bonds needs electrolysis and far more energy.' },
            { t: 'The O–H covalent bonds.', ok: false,
              why: 'Those are about 460 kJ/mol and survive boiling easily. If they broke you would get hydrogen and oxygen gas, not steam.' },
            { t: 'Both, about equally.', ok: false,
              why: 'Only the intermolecular forces. The covalent bonds are more than twenty times stronger.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Why does hydrogen bonding need N, O or F specifically?',
          options: [
            { t: 'They are the most electronegative elements that also have lone pairs, so the hydrogen is left nearly bare and there is somewhere for it to go.', ok: true,
              why: 'Right — both halves matter. Chlorine is electronegative and has lone pairs, but it is much bigger, so the charge is spread out and the effect is far weaker.' },
            { t: 'They are the smallest elements.', ok: false,
              why: 'Small size helps concentrate the charge, and electronegativity plus an available lone pair is what defines the case.' },
            { t: 'They are the only elements that bond to hydrogen.', ok: false,
              why: 'Hydrogen bonds to carbon, sulfur, chlorine and much else. Those bonds just do not leave it exposed enough.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'Why does H₂O boil so much higher than H₂S?',
          options: [
            { t: 'Water hydrogen-bonds and H₂S does not, because sulfur is not electronegative enough to strip the hydrogen bare.', ok: true,
              why: 'Right — a 170-degree difference from one intermolecular force. Sulfur is bigger and less electronegative, so its hydrogens stay clothed.' },
            { t: 'Water molecules are heavier.', ok: false,
              why: 'H₂S is nearly twice the mass. On mass alone it should boil higher, which is exactly what makes water anomalous.' },
            { t: 'Water has stronger covalent bonds.', ok: false,
              why: 'It does, and boiling does not break covalent bonds, so that is not what sets the boiling point.' },
          ] },
        { kind: 'order', q: 'Order these intermolecular forces, weakest first.',
          items: ['Dispersion forces', 'Dipole–dipole', 'Hydrogen bonding'],
          right: 'Yes — though dispersion wins in a big enough molecule. Iodine is held together by dispersion alone and is a solid.',
          wrong: 'Hydrogen bonding is the special strong case; dispersion is the universal weak one.' },
        { kind: 'choice', q: 'Why are F₂ and Cl₂ gases while I₂ is a solid?',
          options: [
            { t: 'Iodine has far more electrons, so its cloud distorts more easily and its dispersion forces are much stronger.', ok: true,
              why: 'Right, and it is clean evidence that dispersion is real and scales with electron count. Identical bonding throughout the group, completely different states.' },
            { t: 'Iodine is more polar.', ok: false,
              why: 'I₂ is two identical atoms — perfectly non-polar, like all of them. Dispersion is the only force available.' },
            { t: 'Iodine has stronger covalent bonds.', ok: false,
              why: 'Weaker, in fact — the I–I bond is the weakest of the four. What holds the solid together is between molecules.' },
          ] },
        { kind: 'choice', q: 'Why does ice float?',
          options: [
            { t: 'Freezing locks the hydrogen-bonded network into an open hexagonal arrangement that holds molecules further apart than the liquid does.', ok: true,
              why: 'Right, and it is nearly unique. Almost every other substance is denser solid than liquid — and the consequence is that lakes freeze from the top, so life under them survives.' },
            { t: 'Ice has air trapped in it.', ok: false,
              why: 'Pure ice with no bubbles still floats. The structure itself is less dense.' },
            { t: 'Ice is colder, and cold things float.', ok: false,
              why: 'Cold usually makes things denser, which is why this is an anomaly rather than the rule.' },
          ] },
        { kind: 'choice', q: 'What happens when you fry an egg?',
          options: [
            { t: 'Heat breaks the hydrogen bonds holding each protein folded, the shapes are lost, and they do not come back.', ok: true,
              why: 'Right — and every covalent bond in the egg is still intact. Only the folding changed, which is why it is irreversible without being a chemical reaction in the usual sense.' },
            { t: 'The covalent bonds in the proteins break.', ok: false,
              why: 'They survive. Cooking unfolds proteins rather than dismantling them.' },
            { t: 'Water is driven off, leaving the solids.', ok: false,
              why: 'Some water leaves, and a hard-boiled egg in its shell loses almost none and still sets. The setting is unfolding.' },
          ] },
        { kind: 'choice', q: 'Why is hydrogen bonding the right strength for DNA?',
          options: [
            { t: 'Firm enough to hold the code stable, weak enough that the cell can unzip the strands to read them.', ok: true,
              why: 'Right — covalent bonds between the strands would be unusable, because nothing in the cell could open them on demand.' },
            { t: 'Because it is the strongest force available.', ok: false,
              why: 'Covalent bonds are twenty times stronger. The point is that hydrogen bonding is deliberately not the strongest.' },
            { t: 'Because DNA contains hydrogen.', ok: false,
              why: 'So does almost everything. What matters is hydrogen attached to nitrogen and oxygen, with lone pairs opposite.' },
          ] },
        { kind: 'choice', q: 'Diamond melts at about 3550 °C. What does that tell you?',
          options: [
            { t: 'That it has no separate molecules — melting it means breaking covalent bonds throughout a continuous network.', ok: true,
              why: 'Right, and it shows the general principle honestly: a melting point reflects whatever has to break, and for a network solid that is real bonds.' },
            { t: 'That its intermolecular forces are extremely strong.', ok: false,
              why: 'There are no separate molecules to have forces between. The whole crystal is one covalent structure.' },
            { t: 'That carbon atoms are heavy.', ok: false,
              why: 'Carbon is light. Graphite, made of the same atoms, flakes apart in your fingers — the difference is entirely structural.' },
          ] },
        { kind: 'choice', q: 'A substance has a high boiling point. What does that most directly tell you?',
          options: [
            { t: 'That its molecules cling to each other strongly.', ok: true,
              why: 'Right — boiling point measures intermolecular forces, not bond strengths. Two substances with identical bonds inside can boil hundreds of degrees apart.' },
            { t: 'That its bonds are strong.', ok: false,
              why: 'The common conflation. Boiling does not break bonds, so bond strength is not what is being measured.' },
            { t: 'That it is a heavy molecule.', ok: false,
              why: 'Mass correlates loosely via dispersion forces, and water beats much heavier molecules because of hydrogen bonding.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking boiling breaks covalent bonds.',
          why: 'It separates whole molecules. Steam is still H₂O, and the O–H bonds — about twenty times stronger than the forces between molecules — are untouched.' },
        { wrong: 'Calling a hydrogen bond a bond.',
          why: 'Its name is bad. About 20 kJ/mol against 460 for the covalent O–H. Strong for an intermolecular force, weak next to a real bond.' },
        { wrong: 'Expecting hydrogen bonding wherever there is hydrogen.',
          why: 'It needs hydrogen attached to N, O or F, and a lone pair on an N, O or F to reach. Methane has four hydrogens and none of it.' },
        { wrong: 'Reading boiling point as bond strength.',
          why: 'It reads intermolecular forces — unless there are no separate molecules at all, as in diamond or quartz, where melting really does break bonds.' },
      ],
      recap: [
        'Forces between molecules are ten to a hundred times weaker than the bonds inside them, and melting and boiling break only the former.',
        'Dispersion forces exist in everything and grow with electron count — which is why F₂ is a gas and I₂ is a solid.',
        'Dipole–dipole works for permanently polar molecules; hydrogen bonding is the strong special case, needing H on N, O or F and a lone pair opposite.',
        'Water can make four hydrogen bonds per molecule, which explains its boiling point, floating ice, heat capacity, surface tension and solvent power together.',
        'The same force holds DNA’s strands and keeps proteins folded — strong enough to be stable, weak enough to be undone, which is exactly what biology needs.',
      ],
    },

    ],
  });
})();
