/* Unit 9: The mole and stoichiometry. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, goto } = K;
  const f = (x, s) => ME.fmt.fmt(x, s || 4);

  ME.course.unit({
    n: 9, id: 'mole',
    title: 'The mole and stoichiometry',
    blurb: 'The bridge between what an equation counts and what a balance weighs. Get this and quantitative chemistry stops being guesswork.',
    lessons: [

    {
      id: 'the-mole',
      title: 'The mole: counting things you cannot see',
      mins: 16,
      builds_on: ['balancing', 'atomic-number'],
      hook() {
        return frag(
          p('An equation says one methane reacts with two oxygens. Your balance says 16 grams and 64 grams.'),
          p('Those are different kinds of statement. One counts molecules, the other weighs matter, and you cannot do the arithmetic until you have something that translates between them.'),
          p('That something is the mole, and it is the most useful idea in quantitative chemistry — which is why it is worth understanding rather than just using.'));
      },
      pages: [
        {
          h: 'A counting word, like a dozen',
          body() {
            return frag(
              p('A ', term('mole', 'A fixed number of things: 6.02214076 × 10²³ of them. It is a counting word, like a dozen, chosen so that one mole of an element weighs its atomic mass in grams.'), ' is just a number of things. A dozen is 12 of anything; a mole is 602,214,076,000,000,000,000,000 of anything.'),
              eq('1 mole = 6.02214076 × 10²³ things'),
              p('There is nothing chemical about it. A mole of grains of sand, a mole of footballs, a mole of atoms — the word only says how many. It is called ', term('Avogadro’s number', 'The number of things in one mole, 6.02214076 × 10²³. Since 2019 it is exact by definition rather than measured.'), ', and since 2019 it is exact by definition: the SI system fixed the value and built the mole on it.'),
              h4('Why such an awkward number'),
              p('Because it was not chosen for elegance. It was chosen so that the numbers already on the periodic table would work out in grams.'),
              p('Carbon has an atomic mass of 12. One mole of carbon atoms weighs 12 grams. Oxygen is 16, and a mole of oxygen atoms weighs 16 grams. Water is 18, and a mole of water weighs 18 grams.'),
              callout(b('That is the whole point, and it is worth pausing on. '), 'A number was reverse-engineered so that the mass of one atom in atomic mass units and the mass of a mole of them in grams would be the ', em('same number'), '. Read a mass off the periodic table, put "grams" after it, and you have a mole. Nothing to convert, nothing to look up.'),
              p('So the awkwardness is doing work. A rounder number — 10²³, say — would have meant a conversion factor on every calculation forever.'));
          },
        },
        {
          h: 'How big it actually is',
          body() {
            return frag(
              p('The number is easy to write and nearly impossible to feel, and getting some sense of the scale is worth a page, because it explains why chemistry needs the mole at all.'),
              table(['One mole of…', 'Is about'], [
                ['grains of sand', 'enough to bury the entire surface of the Earth several metres deep'],
                ['seconds', 'about 19 thousand million million years — a million times the age of the universe'],
                ['sheets of paper', 'a stack that would reach beyond the nearest hundred stars'],
                ['pennies', 'enough to give every person alive about 80 thousand million million each'],
              ]),
              p('And yet a mole of water is 18 grams — about a tablespoon, which you can hold in your hand.'),
              okCallout(b('Both facts at once is the point. '), 'Atoms are so small that an unremarkable amount of matter contains an unimaginable number of them. Which is exactly why chemists count in moles: the real count is useless to work with, and the mass is not, and the mole is the word that connects them.'),
              h4('And it is why chemistry is statistical'),
              p('With that many particles involved, you never care what any individual one does. Everything you measure — temperature, pressure, rate, pH — is an average over an enormous number, which is why the measurements are so reproducible. Individual randomness disappears entirely at this scale.'));
          },
        },
        {
          h: 'Moles, grams and particles',
          body() {
            return frag(
              p('There are two conversions and both are a single multiplication or division.'),
              eq('moles = grams ÷ molar mass        particles = moles × 6.022 × 10²³'),
              p('The ', term('molar mass', 'What one mole of a substance weighs, in grams per mole. It is numerically the same as the formula mass, so you read it straight off the periodic table.'), ' is what one mole weighs, in grams per mole. For an element it is the atomic mass; for a compound, add up the atoms.'),
              worked('How many moles are there in 25 g of water?', [
                { q: 'Molar mass of H₂O', why: 'Two hydrogens at 1.008 and one oxygen at 15.999.', maths: '2(1.008) + 15.999 = 18.015 g/mol' },
                { q: 'Divide', why: 'Grams divided by grams per mole leaves moles — and checking that the units cancel is the best guard against dividing the wrong way round.', maths: '25 g ÷ 18.015 g/mol = 1.388 mol' },
                { q: 'Sanity check', why: 'A mole of water is about 18 g, so 25 g should be a bit more than one mole. It is. If you had got 0.72 you would have divided upside down.' },
              ]),
              warnCallout(b('Which way up? Let the units decide. '), 'Molar mass is in g/mol. To get moles from grams you need the grams to cancel, so you divide. Writing the units in and cancelling them is not pedantry — it is the only reliable way to catch an upside-down division, and it works every time.'),
              p('The app does all of this and shows the working. Move the numbers around and watch which way the arithmetic goes:'),
              goto('Grams ⇄ moles ⇄ particles', '#/tools/grams-moles', 'With the unit cancelling written out.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why is Avogadro’s number such an awkward value?',
          options: [
            { t: 'It was chosen so that an element’s atomic mass in grams is exactly one mole of it.', ok: true,
              why: 'Right — the number was reverse-engineered to make the periodic table directly usable in grams. A rounder number would have meant a conversion factor on every calculation forever.' },
            { t: 'It was measured and that is how it came out.', ok: false,
              why: 'It was measured for a long time, and the target it was measuring was set by the gram-and-atomic-mass connection. Since 2019 the value is exact by definition.' },
            { t: 'It is the number of atoms in a gram.', ok: false,
              why: 'That depends on the element. A gram of hydrogen has far more atoms than a gram of lead.' },
          ] },
        { kind: 'numeric', after: 2,
          q: 'How many moles are there in 44 g of carbon dioxide? (Molar mass 44.0 g/mol.)',
          answer: 1, tol: 0.03,
          right: 'One mole — which is the case worth remembering, because it shows what molar mass means: 44 g/mol means 44 grams is exactly one mole.',
          wrong: 'Grams divided by grams per mole. Write the units in and let them cancel.' },
      ],
      quizzes: [
        { kind: 'choice', q: 'What is a mole?',
          options: [
            { t: 'A fixed number of things — 6.022 × 10²³ of them — like a dozen but much bigger.', ok: true,
              why: 'Right. Nothing about it is chemical; it is a counting word. A mole of footballs is a perfectly sensible quantity, just a wildly impractical one.' },
            { t: 'A unit of mass.', ok: false,
              why: 'A mole of lead and a mole of hydrogen weigh very different amounts. It counts particles, not grams.' },
            { t: 'The mass of one atom.', ok: false,
              why: 'That is the atomic mass. A mole is a number of atoms.' },
          ] },
        { kind: 'numeric', q: 'How many moles are there in 36 g of water? (Molar mass 18.0 g/mol.)', answer: 2, tol: 0.03,
          right: 'Two moles. 36 ÷ 18 = 2.',
          wrong: 'Divide the mass by the molar mass.' },
        { kind: 'numeric', q: 'What does 0.5 mol of sodium chloride weigh, in grams? (Molar mass 58.44 g/mol.)', answer: 29.22, tol: 0.05,
          right: '29.22 g — moles times molar mass, which is the reverse direction.',
          wrong: 'This one goes the other way: moles × g/mol leaves grams.' },
        { kind: 'choice', q: 'Why does chemistry not simply count the particles?',
          options: [
            { t: 'Because the numbers are unusably large — a tablespoon of water is 6 × 10²³ molecules — while the mass is easy to measure.', ok: true,
              why: 'Right, and that is exactly the gap the mole fills: a word that connects the count you care about to the mass you can weigh.' },
            { t: 'Because particles cannot be counted at all.', ok: false,
              why: 'They can be, indirectly and very precisely. The issue is that the resulting number is impractical to work with.' },
            { t: 'Because particle counts are not useful.', ok: false,
              why: 'The count is exactly what an equation gives you. It just has to be expressed in a manageable unit.' },
          ] },
        { kind: 'choice', q: 'One mole of water is 18 g, about a tablespoon. What should you take from that?',
          options: [
            { t: 'That atoms are so small that an ordinary amount of matter contains an extraordinary number of them.', ok: true,
              why: 'Right, and it is why every measurement in chemistry is an average over a vast number — which is why chemical measurements are so reproducible.' },
            { t: 'That water is unusually light.', ok: false,
              why: 'Water is fairly typical. Any mole is a handleable amount, which is the whole design of the unit.' },
            { t: 'That Avogadro’s number is smaller than it looks.', ok: false,
              why: 'It is every bit as large as it looks. The atoms are simply that small.' },
          ] },
        { kind: 'count', q: 'How many moles of oxygen atoms are there in one mole of O₂ molecules?', answer: 2,
          right: 'Two — each molecule has two atoms, so a mole of molecules is two moles of atoms. Worth being careful about: "a mole of oxygen" is ambiguous unless you say atoms or molecules.',
          wrong: 'Each O₂ molecule contains two atoms.' },
        { kind: 'choice', q: 'Why is Avogadro’s number now exact rather than measured?',
          options: [
            { t: 'Because the SI system fixed its value by definition in 2019 and built the mole on it.', ok: true,
              why: 'Right — the same redefinition that fixed the Boltzmann constant, which is why the app computes the gas constant R from those two rather than looking it up.' },
            { t: 'Because measurement got good enough to know it perfectly.', ok: false,
              why: 'No measurement is ever perfect. The redefinition made the number the definition, so what is measured now is the mass of a carbon-12 atom instead.' },
            { t: 'Because it was rounded.', ok: false,
              why: 'The exact value is 6.02214076 × 10²³, which is not a round number — it is the previous best measurement, frozen.' },
          ] },
      ],
      practice: 'grams-moles',
      mistakes: [
        { wrong: 'Treating the mole as a mass.',
          why: 'It is a count. A mole of hydrogen weighs 2 g and a mole of lead weighs 207 g, and both are the same number of particles.' },
        { wrong: 'Dividing the wrong way round.',
          why: 'Write the units and cancel them. Molar mass is g/mol, so grams ÷ (g/mol) leaves mol. Check against the rough answer too: 25 g of water must be a bit over one mole.' },
        { wrong: 'Saying "a mole of oxygen" without specifying.',
          why: 'A mole of O₂ molecules is two moles of O atoms. The ambiguity causes real errors, so say which you mean.' },
        { wrong: 'Thinking Avogadro’s number was chosen for convenience of size.',
          why: 'It was chosen to make the periodic table’s numbers work directly in grams. The size is a consequence of how small atoms are.' },
      ],
      recap: [
        'A mole is a count — 6.02214076 × 10²³ of anything — and nothing about it is chemical.',
        'The value was reverse-engineered so that an element’s atomic mass in grams is one mole of it, which is why you can read molar masses straight off the table.',
        'The number is unimaginably large and a mole of water is a tablespoon, and both facts together are why chemistry counts in moles.',
        'moles = grams ÷ molar mass, and particles = moles × Avogadro’s number. Write the units in and let them cancel.',
        'Since 2019 Avogadro’s number is exact by definition, and the mole is built on it.',
      ],
    },

    {
      id: 'molar-mass',
      title: 'Molar mass, and formulas from data',
      mins: 17,
      builds_on: ['the-mole'],
      hook() {
        return frag(
          p('A sample arrives in a lab with no label. Burn a weighed amount, catch the products, weigh them, and you can work out what it is made of — and then what its formula is.'),
          p('That was how every formula in the periodic table’s neighbourhood got established in the first place, long before anyone could see a molecule. It is the mole doing detective work.'));
      },
      pages: [
        {
          h: 'Adding up a molar mass',
          body() {
            return frag(
              p('For a compound, add the atomic masses of every atom in the formula. That is all there is to it, and the only real skill is not losing track of a bracket.'),
              worked('Find the molar mass of calcium nitrate, Ca(NO₃)₂.', [
                { q: 'What is actually in there?', why: 'The subscript 2 is outside the bracket, so it multiplies the whole nitrate group. One calcium, two nitrogens, six oxygens.' },
                { q: 'Add them up', why: 'Ca 40.078, N 14.007 each, O 15.999 each.', maths: '40.078 + 2(14.007) + 6(15.999) = 164.088 g/mol' },
                { q: 'Sanity check', why: 'Nothing small should come out at hundreds, and nothing with a heavy metal should come out at tens. 164 for a compound of this size is reasonable.' },
              ]),
              p('The bracket is the whole difficulty. Ca(NO₃)₂ has six oxygens, not three, and getting that wrong throws off everything downstream.'),
              h4('Percent composition'),
              p('Once you have the molar mass, you know what fraction of the mass each element contributes.'),
              eq('% of an element = (mass of that element in one mole ÷ molar mass) × 100'),
              p('For calcium nitrate, the oxygen is 6 × 15.999 = 95.994 out of 164.088, so 58.5 % of the mass is oxygen. Which is a genuinely useful thing to know when you are buying fertiliser by the tonne.'),
              goto('Molar mass, atom by atom', '#/tools/molar-mass', 'Type any formula and see each element’s contribution.'));
          },
        },
        {
          h: 'Working backwards: empirical formulas',
          body() {
            return frag(
              p('Now reverse it. You have percentages from an analysis and you want the formula. The route is: percentages → grams → moles → ratio.'),
              p('The trick is the middle step, and it is worth seeing why it is necessary.'),
              callout(b('A formula is a ratio of atoms, not of masses. '), 'So percentages by mass are the wrong currency, and the first job is to convert to moles — which ', em('are'), ' a count of atoms. Skip that step and you get a ratio of masses, which means nothing.'),
              worked('A compound is 40.0 % carbon, 6.7 % hydrogen and 53.3 % oxygen. What is its formula?', [
                { q: 'Assume 100 g, so the percentages become grams', why: 'A legitimate move, because a ratio does not care how much you have. 40.0 g C, 6.7 g H, 53.3 g O.' },
                { q: 'Convert each to moles', why: 'Divide by each atomic mass.', maths: 'C: 40.0/12.011 = 3.33   H: 6.7/1.008 = 6.65   O: 53.3/15.999 = 3.33' },
                { q: 'Divide by the smallest', why: 'That turns the moles into a ratio starting at 1.', maths: 'C 1.00 : H 2.00 : O 1.00' },
                { q: 'Write it', why: 'The simplest whole-number ratio is the empirical formula.', maths: 'CH₂O' },
              ]),
              p('That is the ', term('empirical formula', 'The simplest whole-number ratio of atoms in a compound. It is what a mass analysis gives you directly, and it may not be the actual molecule.'), ' — and notice that it may not be the real molecule. CH₂O is formaldehyde, but glucose is C₆H₁₂O₆, which is the same ratio six times over. Both fit the analysis perfectly.'),
              h4('So you need one more measurement'),
              p('To get from the ratio to the actual molecule you need the real molar mass, from a separate experiment. Divide it by the empirical formula mass and you get the multiplier.'),
              eq('glucose: 180 ÷ 30 = 6, so (CH2O)6 = C6H12O6'),
              warnCallout(b('And what if the ratio comes out at 1 : 1.5? '), 'Multiply through rather than rounding. 1 : 1.5 is 2 : 3, and rounding 1.5 to 2 would give you the wrong compound. Common awkward values are .5, .33 and .25, needing ×2, ×3 and ×4. Anything within about 0.02 of a whole number really is that number — that is experimental error.'),
              goto('Empirical formula from percentages', '#/tools/empirical', 'Enter percentages or masses and watch the ratio come out.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'numeric', after: 0,
          q: 'What is the molar mass of Ca(OH)₂, in g/mol? (Ca 40.078, O 15.999, H 1.008.)',
          answer: 74.09, tol: 0.15,
          right: '74.09 g/mol — one calcium, two oxygens and two hydrogens, because the bracket subscript multiplies the whole OH group.',
          wrong: 'The 2 is outside the bracket, so there are two oxygens and two hydrogens, not one of each.' },
        { kind: 'choice', after: 1,
          q: 'An analysis gives the ratio CH₂O. What compound is it?',
          options: [
            { t: 'Cannot tell — formaldehyde, acetic acid and glucose all have that ratio. You need the real molar mass.', ok: true,
              why: 'Right. An empirical formula is a ratio, and several different molecules can share one. The molar mass from a separate measurement gives the multiplier.' },
            { t: 'Formaldehyde, because that is CH₂O.', ok: false,
              why: 'It fits, and so does glucose at C₆H₁₂O₆ and acetic acid at C₂H₄O₂. The analysis alone cannot separate them.' },
            { t: 'Glucose, because it is the commonest.', ok: false,
              why: 'Commonness is not evidence. You need the molar mass to pick between them.' },
          ] },
      ],
      quizzes: [
        { kind: 'numeric', q: 'What is the molar mass of H₂SO₄, in g/mol? (H 1.008, S 32.06, O 15.999.)',
          answer: 98.08, tol: 0.15,
          right: '98.08 g/mol. Two hydrogens, one sulfur, four oxygens.',
          wrong: 'Add up 2 hydrogens, 1 sulfur and 4 oxygens.' },
        { kind: 'numeric', q: 'What is the molar mass of Al₂(SO₄)₃, in g/mol? (Al 26.982, S 32.06, O 15.999.)',
          answer: 342.16, tol: 0.5,
          right: '342.16 g/mol — two aluminiums, three sulfurs and twelve oxygens. The bracket is doing a lot of work here.',
          wrong: 'The 3 is outside the bracket, so there are three sulfates: 3 sulfurs and 12 oxygens.' },
        { kind: 'choice', q: 'Why must you convert percentages to moles before finding a formula?',
          options: [
            { t: 'Because a formula is a ratio of atoms, and moles count atoms while grams do not.', ok: true,
              why: 'Right — skip the conversion and you get a ratio of masses, which corresponds to no formula at all.' },
            { t: 'Because percentages are unreliable.', ok: false,
              why: 'They can be very accurate. The problem is that they are the wrong currency for counting atoms.' },
            { t: 'Because moles are smaller numbers.', ok: false,
              why: 'Sometimes they are. Convenience is not the reason — correctness is.' },
          ] },
        { kind: 'choice', q: 'A ratio comes out as 1 : 1.33. What do you do?',
          options: [
            { t: 'Multiply through by 3 to get 3 : 4.', ok: true,
              why: 'Right. 1.33 is a third, so ×3 clears it. Rounding to 1 would give a completely different compound.' },
            { t: 'Round to 1 : 1.', ok: false,
              why: 'That is a 33 % error, far beyond experimental noise, and it gives the wrong formula.' },
            { t: 'Round to 1 : 2.', ok: false,
              why: 'Rounding in either direction is wrong at this distance. Clear the fraction instead.' },
          ] },
        { kind: 'numeric', q: 'A compound’s empirical formula is CH₂ (mass 14.03) and its real molar mass is 42.08 g/mol. What is the multiplier?',
          answer: 3, tol: 0.05,
          right: 'Three, so the molecule is C₃H₆ — propene.',
          wrong: 'Divide the real molar mass by the empirical formula mass.' },
        { kind: 'choice', q: 'What fraction of calcium nitrate, Ca(NO₃)₂, is oxygen by mass? (Molar mass 164.09.)',
          options: [
            { t: 'About 58 % — six oxygens at 15.999 is 95.99 out of 164.09.', ok: true,
              why: 'Right, and the six is the part people miss. The bracket subscript multiplies the three oxygens in each nitrate.' },
            { t: 'About 29 %, from three oxygens.', ok: false,
              why: 'There are six: three in each of two nitrate groups.' },
            { t: 'About 10 %, from one oxygen.', ok: false,
              why: 'There are six oxygens in the formula. Check the bracket.' },
          ] },
        { kind: 'choice', q: 'Why does an analysis give the empirical formula rather than the molecular one?',
          options: [
            { t: 'Because it measures how much of each element there is, which fixes the ratio but not the scale.', ok: true,
              why: 'Right — the analysis cannot tell CH₂O from C₆H₁₂O₆, because the proportions are identical. The scale needs a molar mass measurement.' },
            { t: 'Because analyses are not precise enough.', ok: false,
              why: 'Even a perfect analysis would have this limitation, because the two formulas have identical composition.' },
            { t: 'Because molecules break up during the analysis.', ok: false,
              why: 'They do, in combustion analysis, and that is not the reason. The ratio survives; the scale was never in the data.' },
          ] },
      ],
      practice: ['molar-mass', 'percent-composition', 'empirical'],
      mistakes: [
        { wrong: 'Missing a bracket when adding up a molar mass.',
          why: 'Ca(NO₃)₂ has six oxygens, not three, and Al₂(SO₄)₃ has twelve. The subscript outside multiplies everything inside.' },
        { wrong: 'Finding a ratio from grams instead of moles.',
          why: 'A formula counts atoms. Grams are a ratio of masses, which corresponds to no formula.' },
        { wrong: 'Rounding an awkward ratio.',
          why: '1 : 1.5 is 2 : 3 and 1 : 1.33 is 3 : 4. Multiply through. Only values within about 0.02 of a whole number are experimental error.' },
        { wrong: 'Reporting an empirical formula as the molecule.',
          why: 'CH₂O could be formaldehyde, acetic acid or glucose. You need a separate molar mass to fix the scale.' },
      ],
      recap: [
        'A molar mass is the atomic masses added up, and the only real difficulty is the brackets.',
        'Percent composition is each element’s share of the molar mass, and it is genuinely useful when buying anything by the tonne.',
        'To go from analysis to formula: percentages to grams to moles to ratio. The moles step is essential, because a formula counts atoms.',
        'Divide by the smallest, then clear any fraction by multiplying — never by rounding.',
        'An empirical formula is a ratio; the molecular formula needs a separately measured molar mass to fix the scale.',
      ],
    },

    {
      id: 'stoichiometry',
      title: 'Stoichiometry: four stations, every time',
      mins: 18,
      builds_on: ['molar-mass', 'balancing'],
      hook() {
        return frag(
          p('An airbag has to inflate in about 30 milliseconds, to a volume of roughly 60 litres, with a gas that is not going to hurt anyone. It does it by detonating a precisely weighed amount of sodium azide.'),
          p('Get the mass wrong by 20 % and the bag either fails to protect or bursts. Whoever specified it worked out how much solid gives how much gas — which is this lesson, and it is the same four steps you are about to do on paper.'));
      },
      pages: [
        {
          h: 'Why it is always four steps',
          body() {
            return frag(
              p('A balanced equation tells you a ratio of ', b('molecules'), '. A balance tells you ', b('grams'), '. So a question of the form "how much of this gives how much of that" always has the same shape:'),
              eq('grams  →  moles  →  moles  →  grams'),
              table(['Step', 'What it does', 'What you need'], [
                ['grams → moles', 'turn what you weighed into a count', 'the molar mass of what you started with'],
                ['moles → moles', 'use the reaction', 'the coefficients from the balanced equation'],
                ['moles → grams', 'turn the count back into something weighable', 'the molar mass of the product'],
              ]),
              callout(b('Only the middle step is chemistry. '), 'The two outer steps are unit conversions you could do in your sleep. The middle one is where the reaction enters, and it is the only place the balanced equation is used — which is why balancing first is not optional.'),
              p('Move the slider and watch the four stations. The outer numbers change; the middle ratio never does.'),
              ME.sims.stoichMap());
          },
        },
        {
          h: 'Doing one by hand',
          body() {
            return frag(
              worked('How much carbon dioxide comes from burning 100 g of methane?', [
                { q: 'Balance it first', why: 'Without this, step three is a guess.', maths: 'CH₄ + 2 O₂ → CO₂ + 2 H₂O' },
                { q: 'Grams to moles', why: 'Methane’s molar mass is 16.04 g/mol.', maths: '100 g ÷ 16.04 g/mol = 6.23 mol CH₄' },
                { q: 'Use the equation', why: 'One methane gives one CO₂, so the ratio is 1:1 and the number does not change. Notice that this is a coincidence of this reaction rather than a rule.', maths: '6.23 mol CH₄ × (1 mol CO₂ / 1 mol CH₄) = 6.23 mol CO₂' },
                { q: 'Moles to grams', why: 'CO₂ is 44.01 g/mol.', maths: '6.23 × 44.01 = 274 g CO₂' },
                { q: 'Sanity check', why: '100 g of methane gives 274 g of carbon dioxide — nearly three times the mass. That is not a mistake: the carbon picked up two oxygens on the way, and the oxygen came from the air. It is also, incidentally, why burning fossil fuels produces so much more CO₂ by weight than the fuel itself.' },
              ]),
              p('That last check is worth dwelling on, because a product heavier than the reactant looks wrong until you remember that the other reactant had mass too. Conservation of mass is over the ', em('whole'), ' equation, not between one reactant and one product.'),
              h4('Working with moles directly'),
              p('Not every question starts in grams. If you are given moles, skip step one; if you are asked for moles, skip step three. The middle step is the only one that is always there, and everything else is conversion into and out of the currency the equation speaks.'),
              goto('The stoichiometry tool', '#/tools/stoichiometry', 'Any equation, any two substances, with the road map drawn.'));
          },
        },
        {
          h: 'Limiting reactant: what runs out first',
          body() {
            return frag(
              p('Real reactions are rarely given exactly balanced amounts. Usually one substance runs out and the reaction stops, leaving some of the other unused.'),
              p('The one that runs out is the ', term('limiting reactant', 'The reactant that runs out first and therefore decides how much product can form. Everything else is in excess, and some of it is left over.'), ', and it alone decides the yield. The rest is in excess.'),
              warnCallout(b('And you cannot tell which it is by looking at the masses. '), 'The question is not who has less mass — it is who has fewer moles ', em('relative to what the equation asks for'), '. A reaction needing three of something will run out of it first even if you have more of it.'),
              worked('10 g of hydrogen and 10 g of oxygen. Which runs out?', [
                { q: 'The equation', why: 'Two hydrogens per oxygen.', maths: '2 H₂ + O₂ → 2 H₂O' },
                { q: 'Moles of each', why: 'H₂ is 2.016 g/mol and O₂ is 32.00.', maths: 'H₂: 10/2.016 = 4.96 mol   O₂: 10/32.00 = 0.3125 mol' },
                { q: 'Divide each by its coefficient', why: 'This is the step that makes it comparable — it asks how many times over each reactant could run the reaction.', maths: 'H₂: 4.96/2 = 2.48   O₂: 0.3125/1 = 0.3125' },
                { q: 'The smaller one runs out', why: 'Oxygen, easily. It can only run the reaction 0.3125 times over, and the hydrogen could manage 2.48.' },
                { q: 'So the yield comes from the oxygen', why: '0.3125 mol O₂ gives 0.625 mol water, which is 11.26 g. Making that water uses 0.625 mol of hydrogen — only 1.26 g of it — so 8.74 g of the hydrogen is left over completely unused.' },
              ]),
              okCallout(b('Notice the shape of that. '), 'Equal masses, and one reactant is in nearly eightfold excess, because hydrogen is so light that 10 g of it is a great many molecules. Mass is a poor guide to molecule count when the molar masses differ this much — which is exactly why the mole exists.'),
              h4('And percent yield'),
              p('What the calculation says you should get is the theoretical yield. What you actually get is always less, because reactions are incomplete, products are lost in transferring and filtering, and side reactions happen.'),
              eq('percent yield = (actual ÷ theoretical) × 100'),
              p('A yield over 100 % is not a triumph — it means your product is wet, or contaminated, or you weighed the filter paper. It is one of the most useful error signals in practical chemistry.'),
              goto('Limiting reactant', '#/tools/limiting', 'Which runs out, what you get, and what is left over.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Which step of a stoichiometry problem needs the balanced equation?',
          options: [
            { t: 'Only the middle one, moles to moles.', ok: true,
              why: 'Right — the outer two are unit conversions using molar masses. The equation enters exactly once, which is why an unbalanced equation makes the whole thing meaningless.' },
            { t: 'All of them.', ok: false,
              why: 'The grams-to-moles conversions need only molar masses, which come from the periodic table.' },
            { t: 'The first one.', ok: false,
              why: 'That one needs a molar mass. The equation is used for the mole ratio in the middle.' },
          ] },
        { kind: 'numeric', after: 2,
          q: 'A reaction should give 40.0 g of product and you actually collect 32.0 g. What is the percent yield?',
          answer: 80, tol: 0.5,
          right: '80 %. Actual over theoretical, times 100.',
          wrong: 'What you got, divided by what you should have got, times 100.' },
      ],
      quizzes: [
        { kind: 'choice', q: 'What are the four stations of a stoichiometry problem?',
          options: [
            { t: 'grams, moles, moles, grams.', ok: true,
              why: 'Right, and it is the same shape every time. Learn the shape and the only thing that changes between problems is the numbers.' },
            { t: 'grams, grams, moles, moles.', ok: false,
              why: 'Grams cannot talk to grams, because the equation counts molecules. You have to go through moles in the middle.' },
            { t: 'moles, grams, grams, moles.', ok: false,
              why: 'That inverts it. You start and end with what you can weigh, and go through moles to use the equation.' },
          ] },
        { kind: 'choice', q: 'Burning 100 g of methane gives 274 g of carbon dioxide. Is that a mistake?',
          options: [
            { t: 'No — the carbon picked up oxygen from the air, and that oxygen has mass too.', ok: true,
              why: 'Right. Conservation of mass applies across the whole equation, not between one reactant and one product. It is also why burning fuel produces so much more CO₂ by weight than the fuel weighed.' },
            { t: 'Yes — mass cannot increase.', ok: false,
              why: 'The total does not increase. One product can easily outweigh one reactant, because the other reactant contributed mass as well.' },
            { t: 'Yes — the arithmetic must be wrong.', ok: false,
              why: 'The arithmetic is right. 6.23 mol of CO₂ at 44 g/mol really is 274 g.' },
          ] },
        { kind: 'choice', q: 'How do you find the limiting reactant?',
          options: [
            { t: 'Convert each to moles, divide each by its coefficient, and the smallest result runs out first.', ok: true,
              why: 'Right — dividing by the coefficient is the step that makes them comparable, because it asks how many times over each reactant could run the reaction.' },
            { t: 'Whichever has the smaller mass.', ok: false,
              why: 'Mass is a poor guide when molar masses differ. 10 g of hydrogen is far more molecules than 10 g of oxygen.' },
            { t: 'Whichever has fewer moles.', ok: false,
              why: 'Closer, and still wrong when the coefficients differ. A reactant needed three at a time runs out faster than its mole count suggests.' },
          ] },
        { kind: 'choice', q: 'You calculate a percent yield of 105 %. What has happened?',
          options: [
            { t: 'The product is wet or contaminated, or something was weighed that is not product.', ok: true,
              why: 'Right — and it is a genuinely useful signal. You cannot make more than the atoms allow, so above 100 % always means an error in the measurement rather than in the chemistry.' },
            { t: 'The reaction was unusually efficient.', ok: false,
              why: '100 % is the ceiling set by the atoms available. Nothing can beat it.' },
            { t: 'The equation was unbalanced.', ok: false,
              why: 'That would give a wrong theoretical yield, and the usual cause of over 100 % is a wet or impure product.' },
          ] },
        { kind: 'numeric', q: '2 H₂ + O₂ → 2 H₂O. How many moles of water come from 6 mol of hydrogen with oxygen to spare?',
          answer: 6, tol: 0.05,
          right: '6 mol — the ratio of H₂ to H₂O is 2:2, which is 1:1.',
          wrong: 'Look at the coefficients of H₂ and H₂O.',
          hints: { 3: 'That is the number of moles of oxygen used. The question asks about water, whose coefficient is 2, the same as hydrogen’s.' } },
        { kind: 'numeric', q: 'N₂ + 3 H₂ → 2 NH₃. How many moles of hydrogen are needed for 4 mol of nitrogen?',
          answer: 12, tol: 0.05,
          right: '12 mol — three hydrogens per nitrogen.',
          wrong: 'The coefficients are 1 and 3.' },
        { kind: 'choice', q: 'Why do you have to balance the equation before doing any stoichiometry?',
          options: [
            { t: 'Because the mole ratio in the middle step comes from the coefficients, and unbalanced coefficients are the wrong ratio.', ok: true,
              why: 'Right — and an unbalanced equation gives an answer that looks perfectly reasonable and is simply wrong, which is the dangerous kind of mistake.' },
            { t: 'Because unbalanced equations are untidy.', ok: false,
              why: 'The consequence is a wrong number, not an untidy one.' },
            { t: 'Only for reactions involving gases.', ok: false,
              why: 'Every single time. The ratio is always taken from the coefficients.' },
          ] },
        { kind: 'choice', q: '10 g of hydrogen and 10 g of oxygen react. Why is so much hydrogen left over?',
          options: [
            { t: 'Hydrogen is so light that 10 g of it is nearly eight times more molecules than the oxygen can use.', ok: true,
              why: 'Right, and it is the clearest demonstration of why mass is a bad proxy for count. 10 g of H₂ is 4.96 mol and 10 g of O₂ is 0.31 mol.' },
            { t: 'Hydrogen reacts slowly.', ok: false,
              why: 'It reacts explosively. The leftover is about amounts, not rates.' },
            { t: 'Because oxygen is in excess.', ok: false,
              why: 'The other way round — the oxygen runs out, which is why it is the limiting reactant.' },
          ] },
      ],
      practice: ['stoichiometry', 'limiting'],
      mistakes: [
        { wrong: 'Going straight from grams to grams.',
          why: 'The equation counts molecules, not mass. You must pass through moles, and the mole ratio is the only place the equation is used.' },
        { wrong: 'Deciding the limiting reactant from the masses.',
          why: 'Convert to moles, then divide by the coefficient. Mass is a poor proxy for count when the molar masses differ, and the coefficient matters too.' },
        { wrong: 'Thinking a product cannot outweigh a reactant.',
          why: 'It very often does, because the other reactant also brought mass. Conservation of mass applies to the whole equation.' },
        { wrong: 'Being pleased by a yield over 100 %.',
          why: 'It means a wet or impure product, or a weighing error. The atoms available set a hard ceiling at 100 %.' },
      ],
      recap: [
        'Every stoichiometry problem is grams → moles → moles → grams, and only the middle step uses the balanced equation.',
        'One product can easily outweigh one reactant, because the other reactant contributed mass too.',
        'The limiting reactant is found by converting to moles and dividing each by its coefficient — not by comparing masses.',
        'The limiting reactant alone sets the yield, and the excess is simply left over.',
        'Percent yield is actual over theoretical. Over 100 % is always a measurement error, never a good result.',
      ],
    },

    ],
  });
})();
