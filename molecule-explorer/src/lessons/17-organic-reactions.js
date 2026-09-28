/* Unit 17: Organic reactions and big molecules. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, drawing, strip, goto } = K;

  ME.course.unit({
    n: 17, id: 'organic-reactions',
    title: 'Organic reactions and big molecules',
    blurb: 'The handful of things organic molecules actually do, and what happens when you join thousands of them together — which turns out to be both the plastics industry and you.',
    lessons: [

    {
      id: 'organic-reaction-types',
      title: 'What organic molecules do',
      mins: 16,
      builds_on: ['iupac-groups', 'reaction-types'],
      keywords: 'addition substitution elimination combustion oxidation organic reaction mechanism alkene alkane reactive',
      hook() {
        return frag(
          p('There are tens of millions of known organic compounds and an unlimited number of possible reactions between them. A first course covers about four.'),
          p('Which is not a simplification so much as a genuine feature of the subject: the same few things keep happening, to different molecules, and recognising which one you are looking at tells you what the products will be.'));
      },
      pages: [
        {
          h: 'The four, drawn',
          body() {
            return frag(
              p('Each of these is a shape of transformation rather than a specific reaction, and each one is identifiable by counting molecules in and out.'),
              table(['Type', 'Molecules in → out', 'Signature'], [
                ['addition', '2 → 1', 'a double bond opens and both pieces join on — no by-product'],
                ['substitution', '2 → 2', 'one group swaps for another, and the displaced one leaves'],
                ['elimination', '1 → 2', 'two groups leave from neighbouring carbons and a double bond forms'],
                ['combustion', 'anything → CO₂ + H₂O', 'everything burns to the same two products'],
              ]),
              ME.sims.organicReaction(),
              callout(b('Note the arithmetic in the second column. '), 'Addition takes two molecules and returns one, so nothing is discarded. Elimination is the mirror image. Substitution keeps the count and swaps a piece. You can often identify the type from the molecule count alone, before looking at what changed.'));
          },
        },
        {
          h: 'Why the functional group decides everything',
          body() {
            return frag(
              p('An alkane is almost inert. An alkene reacts readily. Both are carbon and hydrogen, and the difference is entirely the double bond.'),
              p('The reason is that a reaction needs somewhere to start. An alkane’s electrons are all in strong single bonds, tucked between nuclei where nothing can reach them. An alkene’s second shared pair sits above and below the bond axis, exposed — so anything short of electrons attacks there.'),
              table(['Group', 'What it invites'], [
                ['C=C double bond', 'addition — exposed electrons, easy to attack'],
                ['C–O–H alcohol', 'oxidation to an aldehyde then an acid; elimination to an alkene'],
                ['C=O carbonyl', 'addition across the double bond, and the carbon is electron-poor so it attracts the opposite kind of attacker'],
                ['C–halogen', 'substitution — the halogen leaves readily, taking the electrons with it'],
                ['benzene ring', 'substitution, never addition — addition would destroy the ring’s spread-out electrons'],
              ]),
              okCallout(b('That last row is worth noting. '), 'Benzene has three double bonds in the drawing and refuses to do addition reactions, because its electrons are spread evenly round the ring and adding across one bond would break that up. It does substitution instead, keeping the ring intact. Which is exactly the resonance from Unit 6 having a visible chemical consequence.'),
              h4('The oxidation ladder'),
              p('One sequence is worth knowing because it turns up constantly, in laboratories and in your liver.'),
              eq('alcohol -> aldehyde -> carboxylic acid'),
              strip('Each step removes hydrogen or adds oxygen — the same carbon, progressively more oxidised.', [
                { smiles: 'CCO', label: 'ethanol', sub: 'alcohol' },
                { smiles: 'CC=O', label: 'ethanal', sub: 'aldehyde' },
                { smiles: 'CC(=O)O', label: 'ethanoic acid', sub: 'carboxylic acid' },
              ]),
              p('And it is the reason a hangover feels the way it does. Your liver oxidises ethanol to ethanal, which is considerably more toxic, and then oxidises the ethanal to ethanoic acid, which is harmless. The second step is the slower one, so ethanal accumulates — and most of the unpleasantness is that intermediate rather than the alcohol itself.'),
              warnCallout(b('Which also explains why methanol is so dangerous. '), 'The same enzymes oxidise it to methanal and then methanoic acid, and both of those are far more damaging than ethanal — methanoic acid attacks the optic nerve. The poison is not the methanol; it is what your own liver turns it into. Treatment is to give ethanol, which occupies the enzyme and lets the methanol leave unconverted.'));
          },
        },
        {
          h: 'Recognising one you have not seen',
          body() {
            return frag(
              p('The practical skill is not remembering reactions but classifying an unfamiliar one, and there is a procedure.'),
              table(['Step', 'Ask'], [
                ['1', 'Count the molecules on each side. 2→1 suggests addition, 1→2 elimination, 2→2 substitution.'],
                ['2', 'Look for a double bond appearing or disappearing. Appearing points to elimination; disappearing to addition.'],
                ['3', 'Check whether oxygen was gained or hydrogen lost. If so, it is an oxidation, whatever else it is.'],
                ['4', 'Look at what left. A small by-product like H₂O or HCl is the signature of substitution or elimination.'],
              ]),
              worked('Classify: CH₃CH₂OH + HBr → CH₃CH₂Br + H₂O', [
                { q: 'Count', why: 'Two molecules in, two out. That points to substitution.' },
                { q: 'Double bonds?', why: 'None appearing or disappearing, which rules out addition and elimination.' },
                { q: 'What swapped?', why: 'The OH group was replaced by Br, and the displaced OH left as water with the incoming hydrogen.' },
                { q: 'So', why: 'A substitution. And notice the by-product tells you as much as the product does.' },
              ]),
              p('The app will classify an inorganic equation for you and explain why, and the same counting logic is what it uses:'),
              goto('Reaction type, with the reasoning', '#/tools/reaction-type', 'Paste an equation and see which pattern it matches.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'A reaction takes two molecules and gives one. Which type is it likely to be?',
          options: [
            { t: 'Addition — nothing is left over, so both reactants joined.', ok: true,
              why: 'Right, and it is the quickest identification available. Counting molecules often settles the type before you look at what changed.' },
            { t: 'Substitution.', ok: false,
              why: 'Substitution keeps the count at two, because something always leaves.' },
            { t: 'Elimination.', ok: false, why: 'That is the reverse shape — one in, two out.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Why is a hangover largely caused by ethanal rather than ethanol?',
          options: [
            { t: 'Your liver oxidises ethanol to ethanal quickly and ethanal onwards slowly, so the more toxic intermediate builds up.', ok: true,
              why: 'Right — the bottleneck is the second step. It is also why methanol is so dangerous: the same enzymes turn it into something far worse.' },
            { t: 'Because ethanol is not toxic.', ok: false,
              why: 'It is, in quantity. The point is that its first oxidation product is worse and accumulates.' },
            { t: 'Because ethanal is in the drink.', ok: false,
              why: 'Only in traces. Most of it is made inside you.' },
          ] },
      ],
      quizzes: [
        { kind: 'match', q: 'Match each type to its molecule count.',
          pairs: [['addition', '2 in, 1 out'], ['elimination', '1 in, 2 out'], ['substitution', '2 in, 2 out'],
                  ['combustion', 'anything in, CO₂ and H₂O out']],
          right: 'Yes — and counting is often enough to identify the type before you look at what changed.',
          wrong: 'Count what goes in and what comes out.' },
        { kind: 'choice', q: 'Why is an alkene far more reactive than an alkane?',
          options: [
            { t: 'Its second shared pair sits outside the bond axis, exposed, so anything short of electrons can attack it.', ok: true,
              why: 'Right — an alkane’s electrons are all tucked between nuclei where nothing can reach them, which is why alkanes make good fuels and poor reagents.' },
            { t: 'Because double bonds are weaker.', ok: false,
              why: 'A double bond is stronger overall. It is the exposure of the second pair that matters, not the strength.' },
            { t: 'Because alkenes have fewer hydrogens.', ok: false,
              why: 'True and not the reason. The reactivity is about where the electrons are.' },
          ] },
        { kind: 'choice', q: 'Benzene has three double bonds in the drawing. Why does it not do addition reactions?',
          options: [
            { t: 'Its electrons are spread evenly round the ring, and adding across one bond would break that up — so it substitutes instead.', ok: true,
              why: 'Right, and it is the resonance from Unit 6 showing up as chemistry. The spread-out arrangement is worth keeping, so the ring survives every reaction.' },
            { t: 'Its double bonds are too strong.', ok: false,
              why: 'Individually they are ordinary. It is the spread-out arrangement that is worth keeping.' },
            { t: 'It does — that is how polystyrene is made.', ok: false,
              why: 'Polystyrene comes from the vinyl group attached to the ring, and the ring itself survives intact.' },
          ] },
        { kind: 'order', q: 'Put the oxidation ladder in order, least oxidised first.',
          items: ['alcohol', 'aldehyde', 'carboxylic acid'],
          right: 'Yes. Each step removes hydrogen or adds oxygen, and it is the sequence your liver runs on ethanol.',
          wrong: 'Each step makes the carbon more oxidised — more bonds to oxygen, fewer to hydrogen.' },
        { kind: 'choice', q: 'Why is the treatment for methanol poisoning to give ethanol?',
          options: [
            { t: 'Ethanol occupies the same enzymes, so the methanol leaves the body unconverted — and it is the conversion products that do the damage.', ok: true,
              why: 'Right, and it is a striking piece of reasoning: the treatment is to stop your own metabolism from making the poison.' },
            { t: 'Ethanol neutralises methanol chemically.', ok: false,
              why: 'They do not react with each other. The competition is for the enzyme.' },
            { t: 'To dilute it.', ok: false,
              why: 'Dilution is not the mechanism. Enzyme competition is.' },
          ] },
        { kind: 'choice', q: 'Classify: CH₃CH₂OH + HBr → CH₃CH₂Br + H₂O',
          options: [
            { t: 'Substitution — two in, two out, with OH swapped for Br and the displaced group leaving as water.', ok: true,
              why: 'Right, and the by-product is as informative as the product. A small leaving group like H₂O or HCl is the signature.' },
            { t: 'Addition.', ok: false,
              why: 'Addition gives one product from two reactants. Here there are two products.' },
            { t: 'Elimination.', ok: false,
              why: 'Elimination starts from one molecule and produces a double bond. Neither happens here.' },
          ] },
        { kind: 'choice', q: 'Why does a first course cover only about four reaction types?',
          options: [
            { t: 'Because the same few transformations keep recurring on different molecules, so recognising the type predicts the products.', ok: true,
              why: 'Right — it is a real feature of the subject rather than a simplification for beginners.' },
            { t: 'Because the others are too advanced.', ok: false,
              why: 'There are many more, and almost all of them are variations on these shapes.' },
            { t: 'Because organic chemistry is mostly memorisation.', ok: false,
              why: 'Rather the opposite — the point of the four types is that classification replaces memorisation.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Expecting benzene to behave like an alkene.',
          why: 'It has double bonds in the drawing and does substitution rather than addition, because addition would break up its evenly spread electrons.' },
        { wrong: 'Ignoring the by-product when classifying.',
          why: 'A small leaving group like H₂O or HCl is the signature of substitution or elimination. Addition has none at all.' },
        { wrong: 'Thinking alcohol is toxic and its oxidation products are not.',
          why: 'The other way round for both ethanol and methanol. In each case the poison is what your liver makes from it.' },
        { wrong: 'Trying to remember reactions rather than classify them.',
          why: 'Count the molecules, look for a double bond appearing or disappearing, check for oxygen gained. The type then tells you the products.' },
      ],
      recap: [
        'Four shapes cover most of a first course: addition (2→1), substitution (2→2), elimination (1→2) and combustion.',
        'The functional group decides what a molecule will do, because a reaction needs somewhere accessible to start.',
        'An alkene reacts where an alkane does not, because its second shared pair is exposed outside the bond axis.',
        'Benzene substitutes rather than adds, to keep its spread-out electrons — resonance with a visible consequence.',
        'The oxidation ladder runs alcohol → aldehyde → acid, and it is why hangovers happen and why methanol blinds people.',
      ],
    },

    {
      id: 'polymers',
      title: 'Joining thousands of molecules together',
      mins: 16,
      builds_on: ['organic-reaction-types', 'intermolecular'],
      keywords: 'polymer monomer addition polymerisation condensation polyethylene polythene pet nylon plastic recycling',
      hook() {
        return frag(
          p('Ethene is a gas you could not build anything from. Join a few thousand of them end to end and you get polythene — a solid tough enough for a water pipe.'),
          p('Nothing was added. The same atoms, in the same proportions, joined differently — and the properties are unrecognisable.'));
      },
      pages: [
        {
          h: 'One unit, repeated',
          body() {
            return frag(
              p('A ', term('polymer', 'A very large molecule made by joining many small ones — monomers — into a long chain. The properties come as much from the chain length and how the chains pack as from the monomer itself.'), ' is a long chain of repeating units. The small molecule it is built from is the ', term('monomer', 'The small molecule that repeats to make a polymer. Its structure sets what the polymer can be, and the conditions set how long the chains get.'), '.'),
              p('There are two ways to join them, and the difference is whether anything is discarded.'),
              table(['Route', 'What happens', 'By-product'], [
                ['addition polymerisation', 'double bonds open and the units join directly', 'none — every atom of the monomer ends up in the polymer'],
                ['condensation polymerisation', 'two different groups react and eliminate a small molecule each time', 'usually water'],
              ]),
              p('Addition polymerisation needs a monomer with a double bond, and the monomers are all in the verified database:'),
              strip('Four addition monomers, and what they become.', [
                { smiles: 'C=C', label: 'ethene', sub: '→ polythene' },
                { smiles: 'C=C(C)', label: 'propene', sub: '→ polypropylene' },
                { smiles: 'C=Cc1ccccc1', label: 'styrene', sub: '→ polystyrene' },
                { smiles: 'C=CCl', label: 'vinyl chloride', sub: '→ PVC' },
              ]),
              callout(b('Every one of those is an addition reaction from the last lesson, repeated thousands of times. '), 'The double bond opens, the unit joins on, and the growing chain still has a reactive end — so it does it again. That is the whole mechanism, and it is why a monomer with no double bond cannot polymerise this way.'),
              warnCallout(b('One honest note about the drawings. '), 'The polymers themselves are not in this app’s database, because PubChem has no single record for them — a polymer is not one molecule with one formula but a distribution of chain lengths. So the monomers are shown, verified, and the polymers are described. That is the same decision the build script forced everywhere else: show what can be checked.'));
          },
        },
        {
          h: 'Why chain length and packing decide the properties',
          body() {
            return frag(
              p('Polythene and candle wax are both chains of CH₂ units. One is a milk bottle and the other you can dent with a fingernail, and the only difference is how long the chains are.'),
              p('Longer chains mean more contact between neighbours, so more dispersion force holding them together — the same argument as Unit 6, scaled up enormously. A twenty-carbon chain is a soft wax; a twenty-thousand-carbon chain is a structural material.'),
              table(['Same monomer, different conditions', 'Result'], [
                ['low-density polythene: branched chains, loosely packed', 'flexible, low melting point — carrier bags, cling film'],
                ['high-density polythene: straight chains, tightly packed', 'rigid and strong — milk bottles, water pipes'],
              ]),
              okCallout(b('Identical monomer, identical chemistry, different catalyst. '), 'The whole difference between a carrier bag and a water pipe is how much the chains branch, because branching decides how closely they can pack. Which is the branched-isomer boiling point argument from Unit 16, at industrial scale.'),
              h4('And condensation polymers'),
              p('These need two reactive groups per monomer, so each unit can join at both ends. An acid and an alcohol give an ', b('ester'), ' link and eliminate water; an acid and an amine give an ', b('amide'), ' link.'),
              table(['Polymer', 'Built from', 'Link', 'Used for'], [
                ['PET', 'terephthalic acid + ethylene glycol', 'ester', 'drinks bottles, polyester fabric'],
                ['nylon', 'adipic acid + a diamine', 'amide', 'rope, gears, stockings'],
                ['Kevlar', 'an aromatic acid + an aromatic diamine', 'amide', 'body armour'],
              ]),
              p('Kevlar is worth a sentence: its chains are straight and hydrogen-bond strongly to each other in sheets, which is why it is stronger than steel by weight. The strength is not in the covalent bonds along the chain but in the intermolecular forces between chains — which is Unit 6 again, doing something startling.'),
              goto('Terephthalic acid, verified', '#/m/cid:7489', 'One half of every PET bottle.'));
          },
        },
        {
          h: 'And why they last so long',
          body() {
            return frag(
              p('A polymer’s backbone is a chain of C–C single bonds, which are strong and non-polar and offer nothing for an enzyme or a water molecule to attack.'),
              p('Nothing in nature had any reason to evolve a way of breaking them, because until about 1950 there was nothing to break. So a polythene bag has no biological route of decay at all, and degrades only by slow physical fragmentation into smaller pieces.'),
              callout(b('Which is the whole problem, stated chemically. '), 'The durability that makes a polymer useful is the same property that makes it persistent. You cannot have one without the other, because both are the same C–C backbone.'),
              table(['Approach', 'How it works', 'The limit'], [
                ['mechanical recycling', 'melt and reform', 'the chains shorten each cycle, so quality falls'],
                ['chemical recycling', 'break the polymer back to monomers', 'works well for condensation polymers, whose links were made by eliminating water and can be reversed by adding it'],
                ['biodegradable polymers', 'build in ester links that water can attack', 'they need the right conditions, and often that means industrial composting rather than a hedgerow'],
              ]),
              okCallout(b('Note the asymmetry in the second row. '), 'A condensation polymer can be unzipped, because its links were formed by removing water and can be broken by putting it back. An addition polymer cannot — its backbone is plain C–C, and there is no reverse reaction to run. Which is why PET recycles far better than polythene, and the difference traces directly to how the polymer was made.'),
              p('That is a satisfying place for this unit to arrive: a recycling policy question whose answer is a mechanism from two pages ago.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'What does a monomer need in order to polymerise by addition?',
          options: [
            { t: 'A double bond, which opens so the unit can join on — leaving the chain end still reactive.', ok: true,
              why: 'Right, and it is why ethene, propene, styrene and vinyl chloride all work: every one has a C=C. Without it, addition polymerisation has nothing to start from.' },
            { t: 'Two reactive groups.', ok: false,
              why: 'That is what condensation polymerisation needs, so each unit can join at both ends.' },
            { t: 'A ring.', ok: false,
              why: 'Some ring monomers do polymerise, by opening. It is not the requirement for addition.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Low-density and high-density polythene come from the same monomer. What differs?',
          options: [
            { t: 'How much the chains branch, which decides how closely they can pack.', ok: true,
              why: 'Right — the difference between a carrier bag and a water pipe is branching, set by the catalyst. Which is the branched-isomer argument from Unit 16 at industrial scale.' },
            { t: 'The monomer is slightly different.', ok: false,
              why: 'Identical monomer. Only the conditions differ.' },
            { t: 'One has double bonds left over.', ok: false,
              why: 'Both consume their double bonds fully in the polymerisation.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What is the difference between addition and condensation polymerisation?',
          options: [
            { t: 'Addition discards nothing; condensation eliminates a small molecule, usually water, at every join.', ok: true,
              why: 'Right, and that difference decides whether the polymer can be chemically recycled — a link made by removing water can be broken by putting it back.' },
            { t: 'Addition makes longer chains.', ok: false,
              why: 'Both can make very long chains. The difference is whether anything is discarded.' },
            { t: 'Condensation needs heat.', ok: false,
              why: 'Both usually do. The distinction is the by-product.' },
          ] },
        { kind: 'choice', q: 'Polythene and candle wax are both CH₂ chains. Why is one a milk bottle?',
          options: [
            { t: 'The chains are far longer, so there is much more contact between neighbours and much more dispersion force.', ok: true,
              why: 'Right — Unit 6’s weakest force, scaled up enormously. A twenty-carbon chain is a wax; twenty thousand carbons is a structural material.' },
            { t: 'Polythene has stronger bonds.', ok: false,
              why: 'The same C–C bonds in both. What differs is how many, and therefore how much the chains grip each other.' },
            { t: 'Wax is a different compound.', ok: false,
              why: 'Chemically very similar — just much shorter chains.' },
          ] },
        { kind: 'choice', q: 'Why is Kevlar stronger than steel by weight?',
          options: [
            { t: 'Its straight chains hydrogen-bond to each other in sheets, so the strength is between the chains rather than along them.', ok: true,
              why: 'Right, and it is a startling result for a force Unit 6 introduced as the weak one. Enough of them, arranged well, beats steel.' },
            { t: 'Its covalent bonds are unusually strong.', ok: false,
              why: 'Ordinary amide links. The arrangement between chains is what does it.' },
            { t: 'It contains metal.', ok: false, why: 'Entirely organic — carbon, hydrogen, nitrogen and oxygen.' },
          ] },
        { kind: 'match', q: 'Match each polymer to its monomer.',
          pairs: [['polythene', 'ethene'], ['PVC', 'vinyl chloride'], ['polystyrene', 'styrene'], ['polypropylene', 'propene']],
          right: 'Yes — every one an addition polymer, and every monomer has a C=C.',
          wrong: 'The polymer name usually contains the monomer name.' },
        { kind: 'choice', q: 'Why does PET recycle chemically better than polythene?',
          options: [
            { t: 'Its ester links were made by eliminating water, so adding water back breaks them — while polythene’s backbone is plain C–C with no reverse reaction available.', ok: true,
              why: 'Right, and it means a recycling policy question has a mechanistic answer. How the polymer was made decides whether it can be unmade.' },
            { t: 'PET is softer.', ok: false,
              why: 'It is harder than polythene. The difference is the chemistry of its links.' },
            { t: 'PET is more common.', ok: false,
              why: 'Polythene is far more common. Reversibility is the reason.' },
          ] },
        { kind: 'choice', q: 'Why does a polythene bag not biodegrade?',
          options: [
            { t: 'Its C–C backbone is strong and non-polar, and nothing evolved a way to attack it because until about 1950 there was nothing to attack.', ok: true,
              why: 'Right, and it states the problem exactly: the durability that makes it useful is the same property that makes it persistent.' },
            { t: 'Because it is toxic to bacteria.', ok: false,
              why: 'It is not toxic. It is simply not food — nothing has the enzyme.' },
            { t: 'Because it is too large for bacteria.', ok: false,
              why: 'Bacteria break down far larger things, including wood and cellulose. The issue is the bond type.' },
          ] },
        { kind: 'choice', q: 'Why are the polymers themselves not in this app’s molecule database?',
          options: [
            { t: 'Because a polymer is a distribution of chain lengths rather than one molecule with one formula, so there is no single verifiable record.', ok: true,
              why: 'Right — so the monomers are shown, verified, and the polymers described. The same decision the build script forced everywhere else: show what can be checked.' },
            { t: 'Because they are too large to draw.', ok: false,
              why: 'A repeating unit draws perfectly well. The issue is that there is no one formula to verify.' },
            { t: 'Because they are not really molecules.', ok: false,
              why: 'They are, very much so — just not one definite one.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking a polymer has a single molecular formula.',
          why: 'It is a distribution of chain lengths. That is why polymers have no single PubChem record and why their properties depend on the conditions they were made under.' },
        { wrong: 'Expecting addition polymerisation from a monomer with no double bond.',
          why: 'The double bond is what opens to let the unit join. Without one, the route is condensation, which needs two reactive groups instead.' },
        { wrong: 'Thinking a polymer’s strength is in its covalent bonds.',
          why: 'For Kevlar and for high-density polythene, it is largely in the forces between chains. Which is why the same bonds give a bag or a pipe depending on packing.' },
        { wrong: 'Assuming all plastics recycle alike.',
          why: 'A condensation polymer can be unzipped by reversing the elimination that made it. An addition polymer cannot, because plain C–C has no reverse reaction.' },
      ],
      recap: [
        'A polymer is a long chain of repeating monomers, and its properties come as much from chain length and packing as from the monomer.',
        'Addition polymerisation needs a C=C and discards nothing; condensation needs two reactive groups and eliminates water at each join.',
        'Longer chains and straighter chains mean more contact and more dispersion force — which is the whole difference between wax and a water pipe, and between a carrier bag and a pipe.',
        'Kevlar’s strength is between its chains rather than along them, which is hydrogen bonding doing something remarkable.',
        'Durability and persistence are the same property. Condensation polymers can be unzipped by putting the water back; addition polymers cannot.',
      ],
    },

    {
      id: 'biomolecules',
      title: 'The four molecules you are made of',
      mins: 18,
      builds_on: ['polymers', 'chirality'],
      keywords: 'biomolecule protein carbohydrate lipid nucleic acid DNA amino acid peptide glucose starch cellulose fat',
      hook() {
        return frag(
          p('Everything alive is built from four kinds of molecule. Not four hundred — four.'),
          p('And three of the four are polymers, made by joining small units with condensation reactions and eliminating water — exactly the chemistry of the last lesson. Life invented the plastics industry first, by about four billion years.'));
      },
      pages: [
        {
          h: 'The four families',
          body() {
            return frag(
              table(['Family', 'Built from', 'Job'], [
                ['carbohydrates', 'sugars, joined by eliminating water', 'energy, and structure in plants'],
                ['proteins', 'amino acids, joined by eliminating water', 'almost everything — enzymes, structure, signals, transport'],
                ['nucleic acids', 'nucleotides, joined by eliminating water', 'storing and copying the instructions'],
                ['lipids', 'not polymers — fatty acids and glycerol', 'membranes, energy storage, some signalling'],
              ]),
              p('Three of the four are condensation polymers. Lipids are the exception: they are assembled from a few pieces rather than repeated indefinitely, which is why they do not form chains.'),
              okCallout(b('And notice the same reaction three times. '), 'Sugar to sugar, amino acid to amino acid, nucleotide to nucleotide — each one joins by eliminating a water molecule, and each one comes apart by putting it back. Digestion is that reverse reaction, run deliberately, with enzymes to make it fast enough.'),
              p('Which is why you can be built from polymers and still break down your food: the links were made by removing water, so water can break them. Exactly the asymmetry that makes PET recyclable and polythene not.'));
          },
        },
        {
          h: 'Proteins, and why the shape is everything',
          body() {
            return frag(
              p('There are 20 amino acids in ordinary use. Each has the same backbone — an amine group, a carbon, and a carboxylic acid group — and a different side chain hanging off the middle carbon.'),
              strip('The simplest two. Glycine’s side chain is a hydrogen; alanine’s is a methyl group.', [
                { smiles: 'NCC(=O)O', label: 'glycine', sub: 'side chain: H' },
                { smiles: 'C[C@@H](N)C(=O)O', label: 'alanine', sub: 'side chain: CH₃' },
              ]),
              p('The acid of one joins the amine of the next, eliminating water and forming an ', b('amide'), ' link — called a peptide bond in this context, and chemically the same link as in nylon.'),
              p('So a protein is a nylon-like chain with twenty different possible units in any order. With 20 choices at each of, say, 300 positions, the number of possible proteins is 20³⁰⁰ — vastly more than the number of atoms in the observable universe.'),
              h4('And then it folds'),
              p('The chain does not stay a chain. The side chains attract and repel each other — hydrogen bonds, ionic attractions, and the tendency of non-polar side chains to hide from water — and the whole thing folds into one specific shape.'),
              callout(b('The shape is the function. '), 'An enzyme works by having a pocket that fits one molecule. Haemoglobin works by having a pocket that holds iron that holds oxygen. Change one amino acid and the fold can change and the function can be lost — which is what sickle cell anaemia is: one amino acid substitution out of 146.'),
              warnCallout(b('And heat destroys the fold without touching the bonds. '), 'The fold is held by intermolecular forces, which are ten to a hundred times weaker than the peptide bonds along the chain. Heat breaks the fold, the shape is lost, the function goes, and it does not come back — which is frying an egg. Every covalent bond in that egg survives; only the folding changed.'),
              p('Which is the thermochemistry unit’s point about intermolecular forces, arriving where it matters most.'));
          },
        },
        {
          h: 'Carbohydrates, lipids, and one striking case',
          body() {
            return frag(
              h4('Carbohydrates: one difference, two entirely different materials'),
              p('Starch and cellulose are both long chains of glucose. You can digest one and not the other.'),
              strip('Glucose, the unit of both.', [
                { smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O', label: 'glucose', sub: 'C₆H₁₂O₆' },
              ]),
              p('The difference is the orientation of one link. In starch the glucose units are joined in one arrangement; in cellulose they alternate, which makes a straight ribbon that hydrogen-bonds into rigid fibres.'),
              okCallout(b('And your enzymes are shaped for one orientation only. '), 'Amylase fits the starch link and not the cellulose one, so you digest bread and not paper — which is what dietary fibre is. Cows manage it only by hosting bacteria that have the other enzyme. One link turned round is the difference between food and not-food, which is the chirality lesson’s point in a different setting.'),
              h4('Lipids: the odd family out'),
              p('A fat is three fatty acids joined to one glycerol, by — again — eliminating water three times. Not a polymer, because it stops there.'),
              p('The important property is that a fat molecule has a polar head and long non-polar tails, so it cannot decide which world it belongs to. Put enough of them in water and they arrange themselves with tails inwards and heads outwards, forming a sheet two molecules thick.'),
              callout(b('That sheet is a cell membrane, and it assembles itself. '), 'Nothing builds it. The molecules arrange that way because it is the lowest-energy option available — heads with the water, tails away from it. Every cell in every living thing is bounded by a structure that forms spontaneously from Unit 6’s like-dissolves-like.'),
              p('And it makes the membrane a non-polar barrier, which is why getting a drug into a cell is hard: too polar and it cannot cross, too non-polar and it will not dissolve in blood. Most of drug design is that balance — the point the polarity lesson made, now with the mechanism behind it.'),
              h4('Where this leaves you'),
              p('Every idea in this course turns up in these four families. Polarity decides what dissolves and what forms a membrane. Shape decides what an enzyme catalyses. Handedness decides which sugars and amino acids are usable. Intermolecular forces hold proteins folded and DNA zipped. Equilibrium and rates govern every reaction in a cell, and thermodynamics says which ones can happen at all.'),
              okCallout(b('Which is the honest answer to "what is chemistry for". '), 'Not that it explains life away, but that the rules turn out to be the same rules — the ones you can work out from a periodic table and a few arguments about energy and shape.'),
              goto('Back to the course map', '#/learn', 'Seventeen units, and every one of them turns up in this lesson.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Three of the four biomolecule families are polymers joined the same way. Which way?',
          options: [
            { t: 'Condensation — each link forms by eliminating a water molecule, and comes apart by putting it back.', ok: true,
              why: 'Right, and that is why digestion is possible: the links were made by removing water, so water can break them. Exactly the asymmetry that makes PET recyclable and polythene not.' },
            { t: 'Addition, like polythene.', ok: false,
              why: 'Addition needs a C=C and discards nothing. These all eliminate water, which is what makes them breakable.' },
            { t: 'Ionic attraction.', ok: false,
              why: 'The backbone links are covalent. Ionic attractions matter for how proteins fold, not for joining the chain.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Frying an egg makes it set irreversibly. What has broken?',
          options: [
            { t: 'The intermolecular forces holding each protein folded — every covalent bond survives.', ok: true,
              why: 'Right, and the strength difference is the reason: the fold is held by forces ten to a hundred times weaker than the peptide bonds along the chain.' },
            { t: 'The peptide bonds along the chains.', ok: false,
              why: 'Those survive easily. Cooking unfolds proteins rather than dismantling them.' },
            { t: 'The amino acids themselves.', ok: false,
              why: 'They are intact — which is why a cooked egg is still nutritious.' },
          ] },
      ],
      quizzes: [
        { kind: 'match', q: 'Match each family to what it is built from.',
          pairs: [['proteins', 'amino acids'], ['carbohydrates', 'sugars'],
                  ['nucleic acids', 'nucleotides'], ['lipids', 'fatty acids and glycerol']],
          right: 'Yes — and the first three are polymers while lipids stop after a few pieces.',
          wrong: 'Three are polymers of a repeating unit; one is assembled from a small fixed number of pieces.' },
        { kind: 'choice', q: 'Why can you digest starch and not cellulose?',
          options: [
            { t: 'The glucose units are joined in a different orientation, and your enzyme is shaped for only one of them.', ok: true,
              why: 'Right — one link turned round is the difference between food and dietary fibre. Cows manage cellulose only by hosting bacteria with the other enzyme.' },
            { t: 'Cellulose is a different sugar.', ok: false,
              why: 'Both are glucose. Only the linkage orientation differs.' },
            { t: 'Cellulose chains are longer.', ok: false,
              why: 'Length varies in both. The orientation of the link is what your enzyme cannot handle.' },
          ] },
        { kind: 'choice', q: 'What holds a protein in its folded shape?',
          options: [
            { t: 'Intermolecular forces between the side chains — hydrogen bonds, ionic attractions, and non-polar groups hiding from water.', ok: true,
              why: 'Right, and because those are far weaker than the backbone bonds, heat can destroy the shape without touching the chain.' },
            { t: 'The peptide bonds.', ok: false,
              why: 'Those hold the chain together in sequence. The three-dimensional fold is held by the weaker forces between side chains.' },
            { t: 'Covalent bonds between every pair of side chains.', ok: false,
              why: 'A few disulfide bridges exist and most of the fold is intermolecular, which is why it can be undone by heat.' },
          ] },
        { kind: 'choice', q: 'Why does a cell membrane form by itself?',
          options: [
            { t: 'Lipids have polar heads and non-polar tails, so heads-out-tails-in is the lowest-energy arrangement available in water.', ok: true,
              why: 'Right — nothing builds it. Every cell in every living thing is bounded by a structure that assembles from like-dissolves-like.' },
            { t: 'Proteins assemble it.', ok: false,
              why: 'Proteins sit in it and do not build it. The arrangement is spontaneous.' },
            { t: 'It is held by covalent bonds between the lipids.', ok: false,
              why: 'There are none between them — which is why a membrane is fluid and can heal.' },
          ] },
        { kind: 'choice', q: 'Sickle cell anaemia comes from one amino acid change out of 146. Why does that matter so much?',
          options: [
            { t: 'Because the fold depends on the side chains, so changing one can change the shape — and the shape is the function.', ok: true,
              why: 'Right. It is the sharpest possible demonstration that a protein is its shape rather than its sequence.' },
            { t: 'Because that amino acid is essential to the chain.', ok: false,
              why: 'The chain holds together fine. It is the folding that changes.' },
            { t: 'Because it changes the molecular formula.', ok: false,
              why: 'It does slightly, and a formula change of that size would be irrelevant on its own. The fold is what matters.' },
          ] },
        { kind: 'choice', q: 'Why is getting a drug into a cell difficult?',
          options: [
            { t: 'The membrane is a non-polar barrier, so a drug must be non-polar enough to cross it and polar enough to dissolve in blood.', ok: true,
              why: 'Right, and most of drug design is that balance — the polarity lesson’s point, now with the mechanism behind it.' },
            { t: 'Cells actively reject drugs.', ok: false,
              why: 'Some do pump things out, and the basic obstacle is the non-polar barrier itself.' },
            { t: 'Drugs are too large.', ok: false,
              why: 'Many are small. Polarity is the usual constraint rather than size.' },
          ] },
        { kind: 'choice', q: 'Proteins are chemically the same kind of polymer as which industrial material?',
          options: [
            { t: 'Nylon — both are chains of amide links made by eliminating water.', ok: true,
              why: 'Right. A peptide bond is an amide bond, and life got there about four billion years before the chemical industry did.' },
            { t: 'Polythene.', ok: false,
              why: 'That is an addition polymer with a plain C–C backbone and no links to break.' },
            { t: 'PVC.', ok: false, why: 'Also an addition polymer, from vinyl chloride.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking a protein’s sequence is its function.',
          why: 'The sequence determines the fold and the fold is the function. One substitution out of 146 gives sickle cell anaemia.' },
        { wrong: 'Thinking cooking breaks peptide bonds.',
          why: 'It unfolds proteins. The fold is held by forces far weaker than the backbone, which is why heat destroys the shape and leaves the chain intact.' },
        { wrong: 'Assuming starch and cellulose differ in their sugar.',
          why: 'Both are glucose. One link orientation is the entire difference between food and fibre.' },
        { wrong: 'Thinking something must build a cell membrane.',
          why: 'It assembles itself, because heads-out-tails-in is the lowest-energy arrangement available in water.' },
      ],
      recap: [
        'Four families: carbohydrates, proteins, nucleic acids and lipids — and the first three are condensation polymers joined by eliminating water.',
        'That is why digestion works: links made by removing water can be broken by putting it back.',
        'A protein is a nylon-like chain of 20 possible units that folds into one shape held by intermolecular forces — and the shape is the function.',
        'Starch and cellulose are both glucose, and one link orientation decides whether you can eat it.',
        'A cell membrane assembles itself from polar heads and non-polar tails, which is like-dissolves-like building the boundary of every living thing.',
      ],
    },

    ],
  });
})();
