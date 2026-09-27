/* Unit 8: Chemical reactions. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, goto } = K;

  ME.course.unit({
    n: 8, id: 'reactions',
    title: 'Chemical reactions',
    blurb: 'What a reaction actually is, how to write one down so the bookkeeping is honest, and how to predict what comes out before you mix anything.',
    lessons: [

    {
      id: 'what-is-a-reaction',
      title: 'What a reaction is, and conservation of mass',
      mins: 15,
      builds_on: ['why-bond', 'physical-chemical'],
      hook() {
        return frag(
          p('Burn a log and you are left with a handful of ash. It looks like almost everything was destroyed — which is exactly what people believed for most of history.'),
          p('Weigh the log, the oxygen it consumed, the ash, the smoke and the water vapour, and the totals match to the last milligram.'),
          p('Nothing was destroyed. It left as gas, which nobody thought to weigh for two thousand years, and that single measurement is where modern chemistry begins.'));
      },
      pages: [
        {
          h: 'Atoms get rearranged, never made or destroyed',
          body() {
            return frag(
              p('A chemical reaction breaks some bonds and makes others. The atoms are the same atoms throughout — they have only changed partners.'),
              p('Which immediately gives you a law you can hold everything else against. If the atoms are conserved, the mass is conserved.'),
              eq('mass of everything you started with = mass of everything you end up with'),
              p('This is ', term('conservation of mass', 'In any chemical reaction, the total mass of the reactants equals the total mass of the products, because the atoms are merely rearranged.'), ', and it is not a rule chemists agreed on. It is a consequence of atoms being indestructible on the scale of a chemical reaction.'),
              h4('Why it took so long to notice'),
              p('Because gases are invisible and weigh very little. Burning looked like destruction because the carbon dioxide and water vapour walked away unmeasured, and rusting looked like creation because the iron gained oxygen from the air.'),
              p('Lavoisier settled it in the 1770s by doing his reactions in ', b('sealed'), ' containers, so nothing could leave. The mass never changed. He weighed the closed vessel before and after, and that was the whole experiment — a beautiful piece of work whose insight was entirely about what not to let escape.'),
              callout(b('And it is why every equation has to balance. '), 'A balanced equation is a statement that no atoms were invented or lost. An unbalanced one is claiming something impossible, however chemically sensible it looks.'));
          },
        },
        {
          h: 'How you know a reaction happened',
          body() {
            return frag(
              p('Unit 2 separated physical from chemical change. Here is the practical version: what do you actually see?'),
              table(['Sign', 'What it means', 'A caution'], [
                ['A gas is produced', 'new substance formed', 'Boiling also makes gas, and no reaction has occurred.'],
                ['A solid appears from two clear liquids', 'a precipitate — a new insoluble substance', 'Something crystallising out as it cools is not a reaction.'],
                ['A colour change', 'different substances absorb light differently', 'Diluting a dye changes the shade, not the substance.'],
                ['Heat or light released or absorbed', 'bonds broke and formed with different energies', 'Dissolving something also gets hot or cold without reacting.'],
                ['A smell appears', 'a new volatile substance', 'Warming something already present can release a smell.'],
              ]),
              p('The cautions are the useful part. None of these signs is proof on its own — each has a physical impostor. What distinguishes a reaction is that the substances present afterwards are ', em('different substances'), ', with different properties, and usually not easy to get back.'),
              okCallout(b('The most reliable test is reversibility. '), 'If gentle cooling, evaporating or filtering brings the original back, it was physical. If getting back needs another reaction, it was chemical. Steam becomes water when it cools; carbon dioxide does not become a log.'));
          },
        },
        {
          h: 'Writing one down',
          body() {
            return frag(
              p('An equation has reactants on the left, products on the right, and an arrow that means "becomes" rather than "equals".'),
              eq('CH4 + 2 O2 -> CO2 + 2 H2O'),
              p('Read it as a recipe with a ratio: one methane and two oxygens give one carbon dioxide and two waters. The big numbers in front are ', term('coefficients', 'The numbers in front of each substance in a balanced equation. They give the ratio in which the substances react, and they are the only numbers you may change when balancing.'), ', and they say how many of each.'),
              warnCallout(b('Coefficients go in front. Subscripts never change. '), 'The subscript in H₂O is part of what water ', em('is'), '. Changing it to H₂O₂ does not balance anything — it swaps water for hydrogen peroxide, which is bleach. You may adjust how many molecules you have, never what each molecule is.'),
              h4('The state labels'),
              table(['Label', 'Means'], [
                ['(s)', 'solid'],
                ['(l)', 'liquid'],
                ['(g)', 'gas'],
                ['(aq)', 'aqueous — dissolved in water'],
              ]),
              p('These matter more than they look. "NaCl(s)" and "NaCl(aq)" behave completely differently: the solid is a locked lattice and the solution is free ions. The label is often the difference between a reaction happening and not.'),
              p('The app has a full balancer, and it explains its reasoning rather than just returning coefficients:'),
              goto('Open the Balancer', '#/balancer', 'Type an equation in words or formulas. It will also tell you when one cannot be balanced, and why.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'A log burns down to a small pile of ash. What happened to the mass?',
          options: [
            { t: 'Nothing — most of it left as carbon dioxide and water vapour, which nobody weighed.', ok: true,
              why: 'Right, and that is why conservation of mass took so long to establish. Lavoisier settled it by working in sealed vessels so nothing could escape unmeasured.' },
            { t: 'It was destroyed by the fire.', ok: false,
              why: 'Mass is not destroyed in a chemical reaction. The atoms all still exist — they have just left the fireplace.' },
            { t: 'It turned into energy.', ok: false,
              why: 'Nuclear reactions convert a tiny amount of mass to energy; chemical ones do not measurably. The missing mass is gas.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'To balance H₂ + O₂ → H₂O, could you write H₂ + O₂ → H₂O₂?',
          options: [
            { t: 'No — that changes what the product is. H₂O₂ is hydrogen peroxide, a different substance.', ok: true,
              why: 'Right. Balancing means changing how many molecules you have, never what each one is. Only coefficients may move.' },
            { t: 'Yes, it balances and that is what matters.', ok: false,
              why: 'It does balance arithmetically, and it is now an equation about bleach rather than water. Correct arithmetic about the wrong substances is no use.' },
            { t: 'Yes, because subscripts and coefficients are interchangeable.', ok: false,
              why: 'They are completely different. A coefficient counts molecules; a subscript is part of the molecule’s identity.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'Why must every chemical equation balance?',
          options: [
            { t: 'Because atoms are neither created nor destroyed, so an unbalanced equation claims something impossible.', ok: true,
              why: 'Right — balancing is not a formatting convention, it is a statement that the bookkeeping is honest.' },
            { t: 'Because it looks tidier.', ok: false,
              why: 'It is a physical requirement. An unbalanced equation is a false claim about what happened.' },
            { t: 'Because the numbers must be whole.', ok: false,
              why: 'They do come out whole, and that is a consequence rather than the reason.' },
          ] },
        { kind: 'choice', q: 'Which is the most reliable test of whether a change was chemical?',
          options: [
            { t: 'Whether the original comes back easily — by cooling, evaporating or filtering.', ok: true,
              why: 'Right. Every visible sign has a physical impostor, and reversibility cuts through them: steam becomes water when it cools, and carbon dioxide does not become a log.' },
            { t: 'Whether a gas is produced.', ok: false,
              why: 'Boiling produces gas with no reaction at all. It is suggestive, not conclusive.' },
            { t: 'Whether the colour changed.', ok: false,
              why: 'Diluting a dye changes the shade without changing any substance.' },
          ] },
        { kind: 'choice', q: 'What does (aq) mean, and why does it matter?',
          options: [
            { t: 'Dissolved in water — and it matters because dissolved ionic compounds are free ions, which behave completely differently from a solid lattice.', ok: true,
              why: 'Right. NaCl(s) conducts nothing and reacts with little; NaCl(aq) is free Na⁺ and Cl⁻ and behaves quite differently. The label is often the difference between a reaction and no reaction.' },
            { t: 'Aqueous, meaning it contains water as one of its atoms.', ok: false,
              why: 'It means dissolved in water, which is a state rather than part of the formula.' },
            { t: 'A liquid.', ok: false,
              why: 'That is (l). A liquid is the pure substance melted; (aq) is dissolved in water.' },
          ] },
        { kind: 'choice', q: 'What is a coefficient?',
          options: [
            { t: 'The number in front of a substance, saying how many of it take part.', ok: true,
              why: 'Right — and it is the only number you may change when balancing.' },
            { t: 'The small number inside a formula.', ok: false,
              why: 'That is a subscript, and it is part of the substance’s identity. Changing it changes the substance.' },
            { t: 'The charge on an ion.', ok: false, why: 'A charge is written as a superscript and is a different thing again.' },
          ] },
        { kind: 'choice', q: 'Why did it take until the 1770s to establish conservation of mass?',
          options: [
            { t: 'Gases are invisible and light, so burning looked like destruction and rusting looked like creation.', ok: true,
              why: 'Right. Lavoisier’s contribution was mostly methodological: seal the vessel so nothing can leave, then weigh it before and after.' },
            { t: 'Balances were not accurate enough.', ok: false,
              why: 'Balances were good enough long before. The problem was what was being left out of the weighing.' },
            { t: 'Nobody had thought of weighing things.', ok: false,
              why: 'Weighing was ancient. Weighing the gases was the new idea.' },
          ] },
        { kind: 'choice', q: 'Iron rusts and gets heavier. Does that break conservation of mass?',
          options: [
            { t: 'No — it has gained oxygen from the air, and the air lost exactly that much.', ok: true,
              why: 'Right, and it is the mirror image of the burning log. Both look like violations until you weigh what comes and goes as gas.' },
            { t: 'Yes, which is why the law has exceptions.', ok: false,
              why: 'There are no chemical exceptions. The extra mass is oxygen, and you can measure the air losing it.' },
            { t: 'No, because rust is not a chemical reaction.', ok: false,
              why: 'It very much is: iron plus oxygen and water gives iron oxide, a genuinely different substance.' },
          ] },
        { kind: 'count', q: 'In 2 H₂ + O₂ → 2 H₂O, how many oxygen atoms are on the left?', answer: 2,
          right: 'Two — one O₂ molecule with two atoms in it. And two on the right, in the two waters. Balanced.',
          wrong: 'The coefficient is 1 and the subscript is 2. Multiply them.',
          hints: { 1: 'That counts the molecules. The question is about atoms, and O₂ has two.' } },
      ],
      mistakes: [
        { wrong: 'Changing a subscript to make an equation balance.',
          why: 'That changes what the substance is. Turning H₂O into H₂O₂ swaps water for bleach, and now the equation is about a different reaction.' },
        { wrong: 'Taking one visible sign as proof of a reaction.',
          why: 'Every sign has a physical impostor — boiling makes gas, dissolving gets hot, dilution changes colour. Reversibility is the more reliable test.' },
        { wrong: 'Treating conservation of mass as a rule with exceptions.',
          why: 'Burning and rusting look like exceptions until you weigh the gases. In a sealed vessel the mass never changes.' },
        { wrong: 'Ignoring the state labels.',
          why: 'NaCl(s) and NaCl(aq) behave completely differently, and whether a reaction happens at all often depends on which one you have.' },
      ],
      recap: [
        'A reaction rearranges atoms into new combinations. Nothing is created or destroyed, which is why mass is conserved.',
        'Burning and rusting look like violations only because gases are invisible and light. Seal the vessel and the mass is constant.',
        'Every visible sign of reaction has a physical impostor. The most reliable test is whether the original comes back easily.',
        'Coefficients go in front and may be changed; subscripts are part of the substance and may not.',
        'The state labels (s), (l), (g) and (aq) often decide whether a reaction happens at all.',
      ],
    },

    {
      id: 'balancing',
      title: 'Balancing equations',
      mins: 18,
      builds_on: ['what-is-a-reaction'],
      hook() {
        return frag(
          p('Balancing gets taught as a puzzle you solve by trial and error, and that framing is why people find it unpleasant.'),
          p('It is not a puzzle. Every element gives you one equation, the coefficients are the unknowns, and the whole thing is a small piece of simultaneous algebra with a guaranteed answer.'),
          p('There is also a running order that turns most of them into thirty seconds of arithmetic.'));
      },
      pages: [
        {
          h: 'The running order',
          body() {
            return frag(
              p('Trial and error works, and it works much faster if you go in the right order. The order is about leaving yourself the most freedom.'),
              table(['Step', 'Do this', 'Because'], [
                ['1', 'Balance the element that appears in the fewest substances first.', 'It has the fewest knock-on effects, so you are not undoing your own work.'],
                ['2', 'Leave elements that appear on their own until last.', 'A lone O₂ or H₂ can absorb any leftover, so it is a free variable you want to keep in hand.'],
                ['3', 'Treat a polyatomic ion that survives intact as one unit.', 'If sulfate appears on both sides unchanged, balance "sulfate" rather than sulfur and oxygen separately.'],
                ['4', 'If you end up needing a half, double everything.', 'A half is a correct answer written at the wrong scale.'],
              ]),
              worked('Balance the combustion of propane: C₃H₈ + O₂ → CO₂ + H₂O', [
                { q: 'Carbon first — it is in two substances', why: 'Three carbons on the left, so three CO₂ on the right.', maths: 'C3H8 + O2 -> 3 CO2 + H2O' },
                { q: 'Hydrogen next', why: 'Eight hydrogens on the left, and water has two each, so four waters.', maths: 'C3H8 + O2 -> 3 CO2 + 4 H2O' },
                { q: 'Oxygen last, because it is on its own', why: 'The right now has 3 × 2 = 6 in the CO₂ and 4 × 1 = 4 in the water, so 10 oxygen atoms. O₂ gives two at a time, so five of them.', maths: 'C3H8 + 5 O2 -> 3 CO2 + 4 H2O' },
                { q: 'Check every element', why: 'Carbon 3 and 3. Hydrogen 8 and 8. Oxygen 10 and 10. Done — and note how oxygen last meant it never had to be revisited.' },
              ]),
              callout(b('The order is the whole technique. '), 'Had you started with oxygen you would have fixed it, then broken it with carbon, then broken it again with hydrogen. Leaving the flexible element until last means nothing gets undone.'));
          },
        },
        {
          h: 'Why it always works',
          body() {
            return frag(
              p('Worth knowing, because it turns balancing from a hopeful search into something with a guarantee.'),
              p('Put an unknown coefficient in front of each substance: a, b, c, d. Now each element gives you an equation. For propane:'),
              table(['Element', 'Equation'], [
                ['carbon', '3a = c'],
                ['hydrogen', '8a = 2d'],
                ['oxygen', '2b = 2c + d'],
              ]),
              p('Three equations, four unknowns — so there is a family of solutions, all multiples of each other. Which is exactly right: 1, 5, 3, 4 works and so does 2, 10, 6, 8. Both describe the same reaction at different scales, and by convention we take the smallest whole numbers.'),
              p('This also explains the two odd outcomes:'),
              table(['What happens', 'What it means'], [
                ['No solution at all', 'An element appears on only one side, so the equation is describing something impossible. Usually a missing product.'],
                ['Two genuinely independent solutions', 'Two different reactions have been written as one equation, and the coefficients are not determined.'],
              ]),
              okCallout(b('And it is why the app uses exact fractions rather than decimals. '), 'Solving with floating-point numbers gives you 2.9999999 and then you have to guess whether it means 3. Exact arithmetic gives 3, and the app can say for certain whether an equation balances rather than "close enough".'));
          },
        },
        {
          h: 'Your turn',
          body() {
            return frag(
              p('There are three to work through in the question set below, using the steppers. The table underneath each one turns green element by element, so you can see which one you are still fighting rather than only whether you have finished.'),
              p('Start with whichever element is in the fewest places, and leave anything appearing on its own until the end. If you end up needing a half, double everything.'),
              p('And when you want an equation the app has not set you, the Balancer takes anything — including equations that cannot be balanced, which it explains rather than rejecting.'),
              goto('Open the Balancer', '#/balancer', 'With a by-hand walkthrough, an atom tally and a try-it-yourself mode.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'balance', after: 0,
          q: 'Balance the formation of water from hydrogen and oxygen.',
          equation: 'H2 + O2 -> H2O',
          right: 'Yes — 2 H₂ + O₂ → 2 H₂O. The classic: one water needs one oxygen atom, and oxygen only comes in pairs, so you need two waters to use a whole O₂.' },
        { kind: 'choice', after: 1,
          q: 'An equation turns out to have no solution at all. What does that usually mean?',
          options: [
            { t: 'An element appears on only one side, so something is missing from the equation.', ok: true,
              why: 'Right — the algebra is telling you the chemistry is wrong. Usually a product has been left out.' },
            { t: 'You need fractional coefficients.', ok: false,
              why: 'Fractions always scale up to whole numbers, so that is never a reason for no solution.' },
            { t: 'The numbers are too large.', ok: false,
              why: 'Size is not an obstacle — some real equations need coefficients in the dozens and still solve.' },
          ] },
      ],
      quizzes: [
        { kind: 'balance', q: 'Balance the rusting of iron: Fe + O2 gives Fe2O3.',
          equation: 'Fe + O2 -> Fe2O3',
          right: '4 Fe + 3 O₂ → 2 Fe₂O₃. Iron and oxygen both come as lone elements here, so the trick is to work from the compound outwards — and you need an even number of Fe₂O₃ to make the oxygens come out even.' },
        { kind: 'balance', q: 'Balance the combustion of ethane, C2H6.',
          equation: 'C2H6 + O2 -> CO2 + H2O',
          right: '2 C₂H₆ + 7 O₂ → 4 CO₂ + 6 H₂O. One ethane needs three and a half oxygens, so double everything — a half is a correct answer at the wrong scale.' },
        { kind: 'balance', q: 'Balance aluminium reacting with hydrochloric acid.',
          equation: 'Al + HCl -> AlCl3 + H2',
          right: '2 Al + 6 HCl → 2 AlCl₃ + 3 H₂. Hydrogen comes out as H₂, so you need an even number, which forces the doubling.' },
        { kind: 'choice', q: 'Why balance the element that appears in the fewest substances first?',
          options: [
            { t: 'It has the fewest knock-on effects, so fixing it will not undo work you have already done.', ok: true,
              why: 'Right — and the mirror image is to leave a lone element until last, because it can absorb whatever is left over.' },
            { t: 'Because it is usually the most important element.', ok: false,
              why: 'Importance does not come into it. The order is purely about not undoing your own work.' },
            { t: 'Because it is usually carbon.', ok: false,
              why: 'Often it is, in organic reactions. The rule is about how many substances it appears in.' },
          ] },
        { kind: 'choice', q: 'You balance an equation and get 1, 3.5, 2, 3. What now?',
          options: [
            { t: 'Double everything: 2, 7, 4, 6.', ok: true,
              why: 'Right — a half is a correct answer written at the wrong scale, and doubling clears it. Fractional coefficients are used deliberately in thermochemistry, incidentally, where you want one mole of a particular substance.' },
            { t: 'Round 3.5 to 4.', ok: false,
              why: 'That breaks the balance. Rounding a coefficient means the atoms no longer match.' },
            { t: 'Start over — you have made a mistake.', ok: false,
              why: 'A half is not a mistake. It only means the scale needs doubling.' },
          ] },
        { kind: 'choice', q: 'If sulfate appears unchanged on both sides, what should you do?',
          options: [
            { t: 'Balance it as one unit rather than balancing sulfur and oxygen separately.', ok: true,
              why: 'Right — it saves a lot of work, and it reflects what is physically happening: the sulfate group never comes apart.' },
            { t: 'Balance sulfur first, then oxygen.', ok: false,
              why: 'It works and makes much more work, because the two are locked together anyway.' },
            { t: 'Ignore it.', ok: false, why: 'Everything must balance. Treating it as a unit is a shortcut, not an exemption.' },
          ] },
        { kind: 'choice', q: 'Why does the app balance with exact fractions rather than decimals?',
          options: [
            { t: 'So a coefficient is never 2.9999999, and it can say for certain whether an equation balances.', ok: true,
              why: 'Right. With floating point you have to guess whether a number means 3, and a teaching tool that guesses is worse than no tool.' },
            { t: 'Because fractions are faster.', ok: false,
              why: 'They are slower. Correctness is the reason.' },
            { t: 'Because chemists prefer fractions.', ok: false,
              why: 'The output is whole numbers either way. It is the working that needs to be exact.' },
          ] },
      ],
      practice: 'balance',
      mistakes: [
        { wrong: 'Starting with the element that appears everywhere.',
          why: 'Usually oxygen or hydrogen, and it means every later step undoes what you just did. Start with the rarest and finish with the lone element.' },
        { wrong: 'Rounding a fractional coefficient.',
          why: 'Rounding breaks the balance. Double the whole equation instead — a half is a right answer at the wrong scale.' },
        { wrong: 'Balancing polyatomic ions atom by atom.',
          why: 'If the group survives intact, balance it as one unit. Much less arithmetic, and it matches what is actually happening.' },
        { wrong: 'Assuming an equation that will not balance means you are bad at balancing.',
          why: 'Sometimes the equation itself is wrong. If an element appears on only one side, no coefficients will fix it — a product is missing.' },
      ],
      recap: [
        'Balancing is small-scale simultaneous algebra: one equation per element, coefficients as unknowns, and a guaranteed family of solutions.',
        'Order matters: rarest element first, lone elements last, polyatomic groups as units.',
        'A fractional coefficient means double everything, not round.',
        'No solution means the chemistry is wrong — usually a missing product. Several independent solutions mean two reactions have been written as one.',
        'Only coefficients may change. A subscript is part of what the substance is.',
      ],
    },

    {
      id: 'reaction-types',
      title: 'The five reaction types',
      mins: 17,
      builds_on: ['balancing'],
      hook() {
        return frag(
          p('There are millions of known reactions. Almost all of the ones you will meet in a first course fall into five patterns.'),
          p('Which is worth more than it sounds, because recognising the pattern lets you predict the products. You do not have to be told what happens — you can work it out.'));
      },
      pages: [
        {
          h: 'The five patterns',
          body() {
            return frag(
              table(['Type', 'Pattern', 'Example'], [
                ['Synthesis', 'A + B → AB', '2 Na + Cl₂ → 2 NaCl'],
                ['Decomposition', 'AB → A + B', '2 H₂O₂ → 2 H₂O + O₂'],
                ['Single replacement', 'A + BC → AC + B', 'Zn + CuSO₄ → ZnSO₄ + Cu'],
                ['Double replacement', 'AB + CD → AD + CB', 'AgNO₃ + NaCl → AgCl + NaNO₃'],
                ['Combustion', 'fuel + O₂ → CO₂ + H₂O', 'CH₄ + 2 O₂ → CO₂ + 2 H₂O'],
              ]),
              p('Two things to notice. The first two are opposites: building one substance from parts, and breaking one into parts. The middle two are about swapping partners, either one swap or two.'),
              p('And combustion is really a special case of synthesis — something combining with oxygen — that gets its own name because it is so common and so useful. A hydrocarbon burning in plenty of oxygen always gives carbon dioxide and water, which means you can write the products of any hydrocarbon combustion without being told them.'),
              warnCallout(b('In short supply of oxygen, combustion gives carbon monoxide instead. '), 'This is called incomplete combustion, and it is why a blocked flue or a badly-adjusted burner is dangerous: the same fuel, the same fire, a lethal product instead of a harmless one. Faulty appliances kill people this way every year.'));
          },
        },
        {
          h: 'Predicting products: single replacement',
          body() {
            return frag(
              p('Drop a strip of zinc into blue copper sulfate solution and the blue fades while a brown coating grows on the zinc. The zinc has taken the sulfate and the copper has been dumped out as metal.'),
              eq('Zn + CuSO4 -> ZnSO4 + Cu'),
              p('But drop copper into zinc sulfate and nothing whatsoever happens. Same two metals, same sulfate, and the reaction goes one way only.'),
              h4('Why one way'),
              p('Because the reaction is a competition for the sulfate, and the metal that holds its electrons more loosely wins. Zinc gives up electrons more readily than copper, so zinc displaces copper and copper cannot displace zinc.'),
              p('That ordering has a name — the ', term('activity series', 'Metals ranked by how readily they give up electrons. A metal higher in the series will displace any metal below it from a compound.'), ' — and it lets you predict any single replacement: ', b('a metal will displace any metal below it in the series, and none above it'), '.'),
              table(['Roughly, most reactive first', 'Consequence'], [
                ['K, Na, Ca, Mg, Al, Zn, Fe', 'these displace most things, and the top few react with water'],
                ['Pb, H, Cu, Ag, Au', 'these displace little; gold displaces nothing at all'],
              ]),
              p('Hydrogen sits in the middle deliberately, and it settles a common question: which metals react with acid? Any metal above hydrogen displaces it from an acid and gives off hydrogen gas. Any metal below it does not — which is why copper does not dissolve in hydrochloric acid and zinc fizzes vigorously.'),
              goto('The activity series', '#/reference/activity', 'With the caveat that it is literature data, not something the app can verify.'));
          },
        },
        {
          h: 'Predicting products: double replacement',
          body() {
            return frag(
              p('Two solutions, both clear, are mixed and a solid appears out of nowhere. That solid is a ', term('precipitate', 'An insoluble solid that forms when two solutions are mixed. It appears because one of the possible new combinations of ions does not dissolve.'), ', and it is the commonest reason a double replacement happens at all.'),
              p('The logic runs like this. Dissolve silver nitrate and you have Ag⁺ and NO₃⁻ floating around; dissolve sodium chloride and you have Na⁺ and Cl⁻. Mix them and all four ions are in the same beaker, free to pair up however they like.'),
              p('Three of the four possible pairings stay dissolved. One — silver chloride — does not, and it drops out as a white solid.'),
              eq('AgNO3(aq) + NaCl(aq) -> AgCl(s) + NaNO3(aq)'),
              callout(b('And that is the whole driving force. '), 'A double replacement happens when one of the new combinations leaves the solution — as a precipitate, as a gas, or as water. If every possible product stays dissolved, nothing has changed: the ions were mixed before and they are mixed after, and there was no reaction.'),
              h4('So you need to know what dissolves'),
              p('The solubility rules are the guide. The useful short version:'),
              table(['Rule', 'Meaning'], [
                ['Group 1 and ammonium salts dissolve', 'sodium, potassium and NH₄⁺ compounds are nearly always soluble'],
                ['Nitrates dissolve', 'every nitrate, without exception'],
                ['Chlorides dissolve, except silver, lead and mercury', 'which is why AgCl precipitates'],
                ['Sulfates dissolve, except barium, lead and calcium', 'BaSO₄ is the classic precipitate'],
                ['Carbonates, phosphates and hydroxides do not dissolve, except with group 1 or ammonium', 'so most carbonates precipitate'],
              ]),
              p('Notice the pattern of the exceptions: silver, lead and barium keep turning up. Learning those three names does most of the work.'),
              goto('The solubility rules', '#/reference/solubility', 'With their exceptions listed, and their provenance stated.'),
              p('And the app will classify any equation you give it, with its reasoning:'),
              goto('Identify a reaction type', '#/tools/reaction-type', 'Paste an equation and see which pattern it matches and why.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'Will copper displace zinc from zinc sulfate?',
          options: [
            { t: 'No — zinc is above copper in the activity series, so copper cannot displace it.', ok: true,
              why: 'Right. The reaction goes one way only: zinc into copper sulfate works, copper into zinc sulfate does nothing at all.' },
            { t: 'Yes, because they are both metals.', ok: false,
              why: 'Being a metal is not enough. It has to be the more reactive of the two, which copper is not.' },
            { t: 'Yes, but slowly.', ok: false,
              why: 'Not slowly — not at all. The products would be higher in energy than the reactants, so there is no reason for it to go.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'Mixing NaCl(aq) and KNO₃(aq) gives nothing. Why not?',
          options: [
            { t: 'All four possible products dissolve, so the ions are mixed before and after and nothing has changed.', ok: true,
              why: 'Right — a double replacement needs something to leave the solution. With nothing to precipitate, bubble off or turn into water, there is no reaction to have.' },
            { t: 'Sodium and potassium are too similar.', ok: false,
              why: 'Similarity is not the obstacle. The obstacle is that nothing produced would leave the solution.' },
            { t: 'Because neither is an acid.', ok: false,
              why: 'Double replacements do not need an acid. They need a product that removes itself from solution.' },
          ] },
      ],
      quizzes: [
        { kind: 'match', q: 'Match each pattern to its type.',
          pairs: [['A + B → AB', 'synthesis'], ['AB → A + B', 'decomposition'],
                  ['A + BC → AC + B', 'single replacement'], ['AB + CD → AD + CB', 'double replacement']],
          right: 'Yes. The first two are opposites; the second two are one swap and two swaps.',
          wrong: 'Count how many substances go in and how many come out, then look at what swaps.' },
        { kind: 'choice', q: 'What are the products of burning any hydrocarbon in plenty of oxygen?',
          options: [
            { t: 'Carbon dioxide and water, always.', ok: true,
              why: 'Right, and that is why combustion is so useful to recognise: you can write the products of a reaction nobody has told you about.' },
            { t: 'Carbon monoxide and water.', ok: false,
              why: 'That is incomplete combustion, which happens when oxygen is short — and is what makes faulty appliances lethal.' },
            { t: 'It depends on the hydrocarbon.', ok: false,
              why: 'The coefficients depend on it; the products do not. Carbon goes to CO₂ and hydrogen to H₂O every time.' },
          ] },
        { kind: 'choice', q: 'Why does zinc fizz in hydrochloric acid while copper does nothing?',
          options: [
            { t: 'Zinc is above hydrogen in the activity series and copper is below it.', ok: true,
              why: 'Right — which is exactly why hydrogen is in the series at all. It is the dividing line for whether a metal dissolves in acid.' },
            { t: 'Copper is too hard.', ok: false,
              why: 'Hardness is irrelevant. Sodium is soft enough to cut and reacts violently.' },
            { t: 'Copper is not a metal.', ok: false, why: 'It very much is — just an unreactive one.' },
          ] },
        { kind: 'choice', q: 'What drives a double replacement reaction?',
          options: [
            { t: 'One of the new combinations leaving the solution — as a precipitate, a gas, or water.', ok: true,
              why: 'Right. If everything stays dissolved, the ions were mixed before and after and no reaction has occurred.' },
            { t: 'The ions attracting each other.', ok: false,
              why: 'They all attract each other in every direction. Something has to remove itself for anything to change.' },
            { t: 'Heat being released.', ok: false,
              why: 'Some do release heat, and that is a consequence rather than the driver.' },
          ] },
        { kind: 'choice', q: 'Mixing AgNO₃(aq) and NaCl(aq) gives a white solid. Which one?',
          options: [
            { t: 'AgCl — chlorides dissolve except silver, lead and mercury.', ok: true,
              why: 'Right, and it is the standard test for chloride ions. Sodium nitrate stays dissolved, because group 1 salts and nitrates both always do.' },
            { t: 'NaNO₃ — sodium compounds precipitate.', ok: false,
              why: 'Group 1 salts are nearly always soluble, and every nitrate is. NaNO₃ fails both tests for precipitating.' },
            { t: 'Both.', ok: false, why: 'Only silver chloride comes out. The other pairing stays in solution.' },
          ] },
        { kind: 'choice', q: 'Why is incomplete combustion dangerous?',
          options: [
            { t: 'Short of oxygen, carbon goes to carbon monoxide instead of carbon dioxide, and CO binds to haemoglobin far more tightly than oxygen does.', ok: true,
              why: 'Right — same fuel, same flame, and a lethal product rather than a harmless one. It is why blocked flues and badly adjusted burners kill people.' },
            { t: 'Because it produces more heat.', ok: false,
              why: 'It produces less, having not burned the fuel fully. The danger is the product.' },
            { t: 'Because it produces more carbon dioxide.', ok: false,
              why: 'Less, in fact. The carbon that does not reach CO₂ comes out as CO.' },
          ] },
        { kind: 'choice', q: 'Which of these is soluble in water?',
          options: [
            { t: 'Potassium carbonate — carbonates mostly do not dissolve, but group 1 salts almost always do, and that rule wins.', ok: true,
              why: 'Right, and it shows how the rules are used: when two apply, the group 1 / ammonium rule is the strong one.' },
            { t: 'Barium sulfate.', ok: false,
              why: 'Sulfates dissolve except barium, lead and calcium. BaSO₄ is the classic insoluble sulfate — so insoluble it is safe to drink for X-ray imaging.' },
            { t: 'Silver chloride.', ok: false,
              why: 'Silver is one of the three chloride exceptions, which is what makes it the standard test for chloride ions.' },
          ] },
        { kind: 'choice', q: 'Why is combustion given its own name if it is a kind of synthesis?',
          options: [
            { t: 'Because it is so common and so predictable that recognising it immediately gives you the products.', ok: true,
              why: 'Right — a hydrocarbon plus plenty of oxygen always gives CO₂ and H₂O, so naming the category saves real work.' },
            { t: 'Because it is not really a chemical reaction.', ok: false,
              why: 'It is a very thorough one.' },
            { t: 'Because it does not conserve mass.', ok: false,
              why: 'It does. That is exactly the burning-log case Lavoisier settled.' },
          ] },
      ],
      practice: 'reaction-type',
      mistakes: [
        { wrong: 'Expecting every metal to displace every other.',
          why: 'Only a metal above another in the activity series displaces it. Copper into zinc sulfate does nothing at all — not slowly, not at all.' },
        { wrong: 'Writing a double replacement whenever two solutions are mixed.',
          why: 'If all the possible products dissolve, nothing has happened. Something must leave the solution for there to be a reaction.' },
        { wrong: 'Forgetting incomplete combustion.',
          why: 'Short of oxygen, the products change to carbon monoxide, and the practical consequences are lethal.' },
        { wrong: 'Trying to memorise the solubility rules exception by exception.',
          why: 'Silver, lead and barium account for most of them. Learn those three names and the rules become much shorter.' },
      ],
      recap: [
        'Five patterns: synthesis, decomposition, single replacement, double replacement and combustion — and the last is a special case of the first.',
        'Any hydrocarbon burning in plenty of oxygen gives carbon dioxide and water, so the products come for free. Short of oxygen it gives carbon monoxide, which kills.',
        'A single replacement goes only if the incoming metal is above the outgoing one in the activity series. Hydrogen’s position tells you which metals dissolve in acid.',
        'A double replacement needs a product that leaves the solution — a precipitate, a gas or water. Otherwise nothing has changed.',
        'Most solubility exceptions involve silver, lead or barium, and the group 1 / ammonium rule beats the others when they conflict.',
      ],
    },

    ],
  });
})();
