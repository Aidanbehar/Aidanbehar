/* Unit 16: Organic naming and isomers. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, drawing, strip, figure, goto } = K;

  ME.course.unit({
    n: 16, id: 'organic-naming',
    title: 'Organic naming and isomers',
    blurb: 'A naming system that describes a structure precisely enough to rebuild it — and the reason two molecules with the same formula can be completely different substances.',
    lessons: [

    {
      id: 'iupac-basics',
      title: 'Naming a carbon skeleton',
      mins: 18,
      builds_on: ['skeletal', 'hidden'],
      keywords: 'iupac naming alkane methyl ethyl propyl substituent longest chain numbering prefix suffix',
      hook() {
        return frag(
          p('There are 75 different molecules with the formula C₁₀H₂₂. All of them are decane-ish; only one is decane.'),
          p('So a formula is not a name, and "some kind of C₁₀ alkane" is not a description. The naming system exists because organic chemistry needs a way of saying exactly which arrangement you mean — precisely enough that someone else can draw it from the words alone.'));
      },
      pages: [
        {
          h: 'The stems, and why they are worth learning once',
          body() {
            return frag(
              p('The backbone length gives the stem of the name. There are ten to know and after that they are Greek numbers, so it is a small investment.'),
              table(['Carbons', 'Stem', 'The alkane'], [
                ['1', 'meth-', 'methane'], ['2', 'eth-', 'ethane'], ['3', 'prop-', 'propane'],
                ['4', 'but-', 'butane'], ['5', 'pent-', 'pentane'], ['6', 'hex-', 'hexane'],
                ['7', 'hept-', 'heptane'], ['8', 'oct-', 'octane'], ['9', 'non-', 'nonane'],
                ['10', 'dec-', 'decane'],
              ]),
              p('The first four are historical and the rest are the Greek numbers you already met in Unit 7’s covalent prefixes. Hexane and hexafluoride share a root for the same reason.'),
              p('The ending says what kind of compound it is. ', b('-ane'), ' means single bonds only, which is an ', term('alkane', 'A hydrocarbon with single bonds only. Alkanes are the least reactive organic family, which is why they make good fuels and poor reagents.'), '.'),
              strip('The first three, drawn as line-angle formulas.', [
                { smiles: 'C', label: 'methane', sub: 'CH₄' },
                { smiles: 'CC', label: 'ethane', sub: 'C₂H₆' },
                { smiles: 'CCC', label: 'propane', sub: 'C₃H₈' },
              ]),
              callout(b('And note what the name already tells you. '), '"Octane" says eight carbons in a chain with single bonds and as many hydrogens as they can hold. From four syllables you can draw the whole molecule — which is the point of the system, and the standard a name has to meet.'));
          },
        },
        {
          h: 'Branches: the four rules',
          body() {
            return frag(
              p('Most molecules are not straight chains. A branch is named as a ', term('substituent', 'A group hanging off the main chain, named from its own carbon count with an -yl ending: methyl, ethyl, propyl.'), ' — same stem, ending in ', b('-yl'), '.'),
              table(['Branch', 'Called'], [
                ['one carbon', 'methyl'], ['two carbons', 'ethyl'], ['three carbons', 'propyl'], ['four carbons', 'butyl'],
              ]),
              p('The procedure has four steps and they have to be done in order, because each one depends on the last.'),
              table(['Step', 'Rule', 'Why it is that way'], [
                ['1', 'Find the longest continuous chain of carbons. That is the parent.', 'It is the unambiguous choice — there is only one longest chain, and everyone finds the same one.'],
                ['2', 'Number it from the end that gives the substituents the lowest numbers.', 'Both ends are equally valid starting points, so a tie-break is needed, and lowest-numbers is the convention.'],
                ['3', 'Name each branch with its position number.', 'Position is the whole point — 2-methyl and 3-methyl are different molecules.'],
                ['4', 'List the branches alphabetically, with di-, tri- for repeats.', 'Alphabetical order makes the name reproducible; the multiplying prefixes are ignored when alphabetising.'],
              ]),
              worked('Name this: a five-carbon chain with a methyl group on the second carbon.', [
                { q: 'Longest chain', why: 'Five carbons, so the parent is pentane.' },
                { q: 'Number it', why: 'From the left the methyl is on carbon 2; from the right it is on carbon 4. Lowest wins.' },
                { q: 'Assemble', why: 'The substituent goes in front with its number, and a hyphen joins them.', maths: '2-methylpentane' },
              ]),
              drawing('CC(C)CCC', { width: 300, height: 170 }),
              warnCallout(b('Step 1 catches people, because the longest chain is often not the one drawn horizontally. '), 'A structure drawn as a four-carbon row with a two-carbon branch may well contain a five-carbon chain running diagonally. Count along every path before deciding, not just the one the drawing happens to lay flat.'));
          },
        },
        {
          h: 'Why the rules are the rules',
          body() {
            return frag(
              p('Every one of the four steps exists to remove an ambiguity, and it is worth seeing which.'),
              p(b('Longest chain. '), 'Without it, the same molecule could be "a butane with an ethyl branch" or "a hexane with a methyl branch" — both describing the same thing. Picking the longest makes the answer unique.'),
              p(b('Lowest numbers. '), 'Number 2-methylpentane from the other end and you get 4-methylpentane, which describes the same molecule with different words. The rule picks one.'),
              p(b('Alphabetical listing. '), 'Otherwise "3-ethyl-2-methylhexane" and "2-methyl-3-ethylhexane" are both defensible, and a catalogue could not be sorted.'),
              okCallout(b('So a correct IUPAC name is unique in both directions. '), 'One structure gives exactly one name, and one name gives exactly one structure. That is a strong property and it is what makes a chemical database possible — without it you could not look a compound up, or be sure two papers meant the same substance.'),
              h4('And the names you actually hear'),
              p('Plenty of common names survive because they are older and shorter. Acetic acid is ethanoic acid. Acetone is propanone. Toluene is methylbenzene. Glycerol is propane-1,2,3-triol.'),
              p('Both are in use and both are correct in context, and the systematic name is the one that tells you the structure. When you meet an unfamiliar common name, the systematic one is the way to find out what it is.'),
              warnCallout(b('One honest limitation of this app. '), 'It does not generate IUPAC names from structures, because a correct name generator is a research-grade piece of software and a wrong one would be worse than none. What it does instead is show you PubChem’s own IUPAC name for the 684 database molecules that carry one — a verified name rather than a guessed one.'),
              goto('Look one up', '#/m/cid:2519', 'Caffeine, with its systematic name from PubChem.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'Why number the chain from the end that gives the lowest substituent numbers?',
          options: [
            { t: 'Because both ends are equally valid starting points, so a tie-break is needed — and this is the agreed one.', ok: true,
              why: 'Right. 2-methylpentane and 4-methylpentane describe the same molecule, and the rule picks which words to use.' },
            { t: 'Because lower numbers mean a smaller molecule.', ok: false,
              why: 'The molecule is the same either way. Only the numbering changes.' },
            { t: 'Because the substituent is nearer that end.', ok: false,
              why: 'It is, and that is the consequence of the rule rather than its reason. The reason is that a convention is needed at all.' },
          ] },
        { kind: 'name', mode: 'name', after: 1,
          q: 'A four-carbon chain with a methyl group on carbon 2. What is it called?',
          answer: '2-methylpropane',
          also: ['isobutane', '2 methylpropane', 'methylpropane'],
          right: '2-methylpropane — and here is the catch: the longest chain is only three carbons, because the fourth is the branch. It is also called isobutane, which is the older name.',
          wrong: 'Careful with step 1. Count the longest continuous chain, which may be shorter than the total number of carbons.' },
      ],
      quizzes: [
        { kind: 'count', q: 'How many carbons are in an octane chain?', answer: 8,
          right: 'Eight — oct- is the Greek eight, the same root as in hexafluoride and octahedral.',
          wrong: 'The stems from pent- onwards are the Greek numbers.' },
        { kind: 'match', q: 'Match each carbon count to its stem.',
          pairs: [['1', 'meth-'], ['3', 'prop-'], ['5', 'pent-'], ['8', 'oct-']],
          right: 'Yes. The first four are historical; from pent- onwards they are Greek numbers you already know.',
          wrong: 'meth, eth, prop, but, then pent, hex, hept, oct.' },
        { kind: 'choice', q: 'What does the -yl ending mean?',
          options: [
            { t: 'A group hanging off the main chain rather than being the main chain.', ok: true,
              why: 'Right — methane is a molecule, methyl is a one-carbon branch. Same stem, different role.' },
            { t: 'A double bond.', ok: false,
              why: 'That is -ene. The -yl ending marks a substituent.' },
            { t: 'An alcohol.', ok: false, why: 'That is -ol, which the next lesson covers.' },
          ] },
        { kind: 'choice', q: 'Why does a correct IUPAC name matter beyond exams?',
          options: [
            { t: 'Because one structure gives exactly one name and one name gives exactly one structure, which is what makes a chemical database possible.', ok: true,
              why: 'Right. Without that uniqueness you could not look a compound up or be sure two papers meant the same substance.' },
            { t: 'Because common names are wrong.', ok: false,
              why: 'They are correct in context — acetic acid is a perfectly good name. They just do not tell you the structure.' },
            { t: 'Because it is shorter.', ok: false,
              why: 'Usually longer. Propane-1,2,3-triol is not an improvement on glycerol for conversation.' },
          ] },
        { kind: 'choice', q: 'A structure is drawn as a row of four carbons with a two-carbon branch. What should you check first?',
          options: [
            { t: 'Whether a longer chain runs diagonally through the branch.', ok: true,
              why: 'Right — this is the commonest error in the topic. The longest chain is often not the one the drawing lays flat.' },
            { t: 'How many hydrogens there are.', ok: false,
              why: 'Those follow from the skeleton. The chain length comes first.' },
            { t: 'Whether it is an alkane.', ok: false,
              why: 'Worth knowing and step 1 is still finding the parent chain.' },
          ] },
        { kind: 'choice', q: 'Why does this app not generate IUPAC names from structures?',
          options: [
            { t: 'Because a correct name generator is research-grade software, and a wrong one would be worse than none.', ok: true,
              why: 'Right — so it shows PubChem’s own verified name for the database molecules instead of guessing. Inorganic naming really is just rules, so that one has a genuine engine.' },
            { t: 'Because organic compounds do not have systematic names.', ok: false,
              why: 'They all do. Producing them mechanically is the hard part.' },
            { t: 'Because it would make the file too large.', ok: false,
              why: 'Size is not the obstacle. Correctness is.' },
          ] },
        { kind: 'choice', q: 'Acetic acid’s systematic name is ethanoic acid. What does that tell you that "acetic" does not?',
          options: [
            { t: 'That it has two carbons — eth- — and a carboxylic acid group.', ok: true,
              why: 'Right, and that is the whole argument for systematic names: you can draw it from the word.' },
            { t: 'Nothing — they are just two names.', ok: false,
              why: '"Ethanoic" encodes the structure and "acetic" encodes its history, as the acid in vinegar.' },
            { t: 'That it is stronger.', ok: false, why: 'Same substance, same strength.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Taking the horizontal chain as the longest one.',
          why: 'The longest continuous chain often runs diagonally through what looks like a branch. Count every path before choosing the parent.' },
        { wrong: 'Numbering from the left out of habit.',
          why: 'Number from whichever end gives the lower substituent positions. Both ends are legitimate until the rule decides.' },
        { wrong: 'Alphabetising with the multiplying prefixes.',
          why: 'Ignore di-, tri- and tetra- when ordering. "Diethyl" files under e, not d.' },
        { wrong: 'Assuming every carbon in the formula is in the chain.',
          why: 'C₄H₁₀ can be butane or 2-methylpropane, where the longest chain is only three carbons.' },
      ],
      recap: [
        'The chain length gives the stem — ten to learn, and from pent- onwards they are Greek numbers you already know.',
        'A branch is named from its own carbon count with an -yl ending, and its position number is part of the name.',
        'Four rules in order: longest chain, lowest numbers, name the branches with positions, list them alphabetically.',
        'Each rule removes an ambiguity, which is what makes a correct name unique in both directions — and that is what makes a chemical database possible.',
        'Common names survive and are fine in context; the systematic name is the one you can draw from.',
      ],
    },

    {
      id: 'iupac-groups',
      title: 'Naming molecules with functional groups',
      mins: 17,
      builds_on: ['iupac-basics', 'groups'],
      keywords: 'iupac suffix priority alcohol ol aldehyde al ketone one carboxylic acid oic amine ene yne locant',
      hook() {
        return frag(
          p('Ethanol, ethanal, ethanoic acid and ethanamine all have two carbons. The stem is identical and the endings are doing all the work — and each ending names a completely different substance, from drinkable to corrosive.'),
          p('So the suffix is not decoration. It is the part of the name that says what the molecule does.'));
      },
      pages: [
        {
          h: 'One ending per family',
          body() {
            return frag(
              table(['Family', 'Ending', 'Two carbons gives', 'What it is'], [
                ['alkane', '-ane', 'ethane', 'a gas, burns, little else'],
                ['alkene', '-ene', 'ethene', 'has a double bond, reactive, makes polythene'],
                ['alkyne', '-yne', 'ethyne', 'has a triple bond — welding gas'],
                ['alcohol', '-ol', 'ethanol', 'what is in a drink'],
                ['aldehyde', '-al', 'ethanal', 'a sharp-smelling reactive liquid'],
                ['ketone', '-one', 'propanone (acetone)', 'nail varnish remover'],
                ['carboxylic acid', '-oic acid', 'ethanoic acid', 'vinegar'],
                ['amine', '-amine', 'ethanamine', 'fishy-smelling, basic'],
              ]),
              p('Note that there is no two-carbon ketone: a ketone needs a carbon on each side of its C=O, so the smallest is propanone. Which is a nice example of a name being impossible because the structure is.'),
              strip('The same two carbons, four different endings.', [
                { smiles: 'CC', label: 'ethane', sub: '-ane' },
                { smiles: 'CCO', label: 'ethanol', sub: '-ol' },
                { smiles: 'CC=O', label: 'ethanal', sub: '-al' },
                { smiles: 'CC(=O)O', label: 'ethanoic acid', sub: '-oic acid' },
              ]),
              callout(b('And this is why the functional group is the interesting part. '), 'The carbon skeleton is largely inert; the group is where the chemistry happens. Which is why the name puts it in the ending, where it cannot be missed, rather than treating it as another branch.'));
          },
        },
        {
          h: 'Numbers, and where they go',
          body() {
            return frag(
              p('When a group could sit in more than one place, the name says where — with a number, counted from the end that gives the group the lowest one.'),
              table(['Name', 'Structure'], [
                ['propan-1-ol', 'the OH on an end carbon'],
                ['propan-2-ol', 'the OH on the middle carbon — rubbing alcohol'],
                ['but-1-ene', 'the double bond between carbons 1 and 2'],
                ['but-2-ene', 'the double bond between carbons 2 and 3'],
              ]),
              strip('Same formula, different position, different substance.', [
                { smiles: 'CCCO', label: 'propan-1-ol', sub: 'boils at ' + ME.ref.boilingPoint('propan-1-ol') },
                { smiles: 'CC(O)C', label: 'propan-2-ol', sub: 'boils at ' + ME.ref.boilingPoint('propan-2-ol') },
              ]),
              warnCallout(b('The functional group outranks the branches for numbering. '), 'This is the one rule that differs from the last lesson. Where a plain alkane numbers to give the ', em('branches'), ' the lowest numbers, a molecule with a functional group numbers to give the ', b('group'), ' the lowest number first, and the branches take whatever follows. The group is the more important feature, so it gets first claim.'),
              h4('And a double bond is named by its first carbon'),
              p('"But-2-ene" means the double bond starts at carbon 2, so it runs between carbons 2 and 3. One number does for two carbons, because a bond between 2 and 3 is the only thing "2" could mean when the chain is numbered consecutively.'),
              p('For a double bond between 1 and 2 it is but-1-ene, and the older style writes the number in front: 1-butene. Both are in use and both are unambiguous.'));
          },
        },
        {
          h: 'When there is more than one group',
          body() {
            return frag(
              p('Real molecules often have several. Then one group becomes the suffix and the rest become prefixes, and there is an order of precedence deciding which.'),
              table(['Priority, highest first', 'As a suffix', 'As a prefix'], [
                ['carboxylic acid', '-oic acid', 'carboxy-'],
                ['ester', '-oate', '—'],
                ['aldehyde', '-al', 'oxo-'],
                ['ketone', '-one', 'oxo-'],
                ['alcohol', '-ol', 'hydroxy-'],
                ['amine', '-amine', 'amino-'],
                ['alkene / alkyne', '-ene / -yne', '—'],
              ]),
              p('So a molecule with both an acid and an alcohol is named as the acid, with the OH demoted to "hydroxy-". Lactic acid is 2-hydroxypropanoic acid: a three-carbon acid with an OH on carbon 2.'),
              drawing('CC(O)C(=O)O', { width: 280, height: 170 }),
              okCallout(b('And the priority order is not arbitrary. '), 'It runs roughly from the most oxidised carbon downwards — acid, then aldehyde and ketone, then alcohol. That is also the order in which those groups dominate a molecule’s chemistry, so the naming convention is tracking something real.'),
              h4('Reading a long name backwards'),
              p('A name like 3-methylbutan-2-one looks forbidding and comes apart cleanly if you read the ending first:'),
              table(['Piece', 'Says'], [
                ['-one', 'it is a ketone — a C=O with carbons on both sides'],
                ['butan-', 'four carbons in the main chain'],
                ['2-', 'the C=O is on carbon 2'],
                ['3-methyl', 'a one-carbon branch on carbon 3'],
              ]),
              p('Ending first, then stem, then numbers. Four pieces, and the structure follows.'),
              goto('Functional groups, with drawings', '#/learn/groups', 'The lesson that introduces each family.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'What is the difference between propan-1-ol and propan-2-ol?',
          options: [
            { t: 'Which carbon the OH is on — an end one or the middle one. Same formula, different substances.', ok: true,
              why: 'Right, and they boil 14 degrees apart. Propan-2-ol is rubbing alcohol; propan-1-ol is not the same thing.' },
            { t: 'The number of carbons.', ok: false, why: 'Both have three — that is what propan- says.' },
            { t: 'One is an alcohol and one is not.', ok: false,
              why: 'Both end in -ol, so both are alcohols. Only the position differs.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'A molecule has a carboxylic acid group and an alcohol group. How is it named?',
          options: [
            { t: 'As the acid, with the alcohol demoted to a "hydroxy-" prefix.', ok: true,
              why: 'Right — lactic acid is 2-hydroxypropanoic acid. The acid outranks the alcohol, so it takes the suffix.' },
            { t: 'As the alcohol, with the acid as a prefix.', ok: false,
              why: 'The other way round. Acid is the highest priority group in the table.' },
            { t: 'With two suffixes.', ok: false,
              why: 'Only one group can be the suffix. The rest become prefixes.' },
          ] },
      ],
      quizzes: [
        { kind: 'match', q: 'Match each ending to its family.',
          pairs: [['-ol', 'alcohol'], ['-al', 'aldehyde'], ['-one', 'ketone'], ['-oic acid', 'carboxylic acid']],
          right: 'Yes — and each names a different substance from the same carbon skeleton.',
          wrong: 'The ending is what says which family it is.' },
        { kind: 'choice', q: 'Why is there no two-carbon ketone?',
          options: [
            { t: 'A ketone needs a carbon on each side of its C=O, so the smallest possible one has three.', ok: true,
              why: 'Right — with only two carbons the C=O would be at the end, which makes it an aldehyde instead. The name is impossible because the structure is.' },
            { t: 'Because it would be too reactive.', ok: false,
              why: 'It simply cannot be built. Structure, not stability.' },
            { t: 'Because it has not been discovered.', ok: false,
              why: 'It cannot exist — there is nowhere for the second carbon to go.' },
          ] },
        { kind: 'choice', q: 'In a molecule with a functional group, what gets the lowest number?',
          options: [
            { t: 'The functional group — it outranks the branches.', ok: true,
              why: 'Right, and it is the one rule that differs from plain alkanes. The group is the more important feature, so it has first claim on the numbering.' },
            { t: 'The branches, as in an alkane.', ok: false,
              why: 'That rule applies only when there is no functional group to prioritise.' },
            { t: 'Whichever comes first alphabetically.', ok: false,
              why: 'Alphabetical order decides listing, not numbering.' },
          ] },
        { kind: 'choice', q: 'But-2-ene: where is the double bond?',
          options: [
            { t: 'Between carbons 2 and 3.', ok: true,
              why: 'Right — one number does for two carbons, because consecutive numbering makes "2" unambiguous.' },
            { t: 'On carbon 2 only.', ok: false,
              why: 'A bond needs two atoms. The number names the first of the pair.' },
            { t: 'Between carbons 1 and 2.', ok: false, why: 'That would be but-1-ene.' },
          ] },
        { kind: 'name', mode: 'name', q: 'A three-carbon chain with a C=O on the middle carbon. What is it called?',
          answer: 'propanone', also: ['propan-2-one', 'acetone', '2-propanone'],
          right: 'Propanone — or acetone, the common name. The 2 is often left off because there is nowhere else the C=O could be in a three-carbon ketone.',
          wrong: 'Three carbons and a C=O with carbons on both sides. What family is that, and what is its ending?' },
        { kind: 'choice', q: 'How should you read 3-methylbutan-2-one?',
          options: [
            { t: 'Ending first: a ketone, four carbons, C=O on carbon 2, methyl on carbon 3.', ok: true,
              why: 'Right — ending, stem, numbers. Long names come apart cleanly if you start at the back.' },
            { t: 'Left to right, in order.', ok: false,
              why: 'It works and leaves you holding a methyl group with nothing to attach it to yet. The ending tells you what kind of molecule you are building.' },
            { t: 'It is a name you have to recognise as a whole.', ok: false,
              why: 'Every part is doing work, and reading them in the right order makes it mechanical.' },
          ] },
        { kind: 'choice', q: 'Why is the priority order not arbitrary?',
          options: [
            { t: 'It runs roughly from the most oxidised carbon down, which is also the order in which those groups dominate a molecule’s chemistry.', ok: true,
              why: 'Right — acid, then aldehyde and ketone, then alcohol. The convention tracks something real about which group matters most.' },
            { t: 'It is alphabetical.', ok: false, why: 'Alcohol would come first if it were.' },
            { t: 'It is by how common the group is.', ok: false,
              why: 'Alcohols are far more common than acids and rank lower.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Numbering for the branches when there is a functional group.',
          why: 'The group has first claim. Branches take whatever numbers are left after the group has its lowest.' },
        { wrong: 'Giving a molecule two suffixes.',
          why: 'One group becomes the suffix and the rest become prefixes, decided by the priority order.' },
        { wrong: 'Ignoring the position number.',
          why: 'Propan-1-ol and propan-2-ol are different substances with different boiling points. "Propanol" is incomplete.' },
        { wrong: 'Reading a long name from the front.',
          why: 'Start at the ending. It tells you what kind of molecule you are building before you start attaching things to it.' },
      ],
      recap: [
        'The ending names the family: -ane, -ene, -yne, -ol, -al, -one, -oic acid, -amine.',
        'A position number says where the group is, and a double bond is named by the first of its two carbons.',
        'The functional group outranks the branches for numbering — the one rule that differs from plain alkanes.',
        'With several groups, one becomes the suffix by priority and the rest become prefixes: an acid plus an alcohol is a hydroxy- acid.',
        'Read a long name from the ending backwards: family, then stem, then numbers.',
      ],
    },

    {
      id: 'structural-isomers',
      title: 'Same formula, different molecule',
      mins: 16,
      builds_on: ['iupac-basics', 'unsaturation'],
      keywords: 'isomer structural isomer chain isomer position isomer functional group isomer branching boiling point',
      hook() {
        return frag(
          p('C₂H₆O is two substances. One is ethanol, which people drink. The other is dimethyl ether, a gas that was once used as an anaesthetic.'),
          p('Identical formula, identical mass, identical elemental analysis. Completely different substances, because the atoms are joined up differently — and no amount of counting atoms will tell them apart.'));
      },
      pages: [
        {
          h: 'What an isomer is, and the three kinds',
          body() {
            return frag(
              p(term('Isomers', 'Molecules with the same molecular formula but different structures. Because structure decides properties, isomers can be entirely different substances.'), ' have the same formula and different structures. Since Unit 6 established that shape decides function, that is enough to make them different substances.'),
              table(['Kind', 'What differs', 'Example with C₄H₁₀ or C₃H₈O'], [
                ['chain (skeletal)', 'how the carbon backbone is branched', 'butane and 2-methylpropane'],
                ['position', 'where a group sits on the same backbone', 'propan-1-ol and propan-2-ol'],
                ['functional group', 'which family it belongs to entirely', 'propan-1-ol and methoxyethane'],
              ]),
              strip('Chain isomers of C₄H₁₀ — the only two there are.', [
                { smiles: 'CCCC', label: 'butane', sub: 'boils at ' + ME.ref.boilingPoint('butane') },
                { smiles: 'CC(C)C', label: '2-methylpropane', sub: 'boils at ' + ME.ref.boilingPoint('2-methylpropane') },
              ]),
              p('That eleven-degree gap in boiling point from the same atoms is worth explaining, because it makes the point that structure is physical rather than notational. (Those two numbers, and the others in this unit, are literature values — the app’s verified molecule database carries structures and masses but not boiling points, so they are stated once in the Reference tab and marked as learned rather than checked.)'),
              callout(b('A straight chain can lie alongside its neighbours down its whole length; a branched one cannot. '), 'More contact means more dispersion forces holding the molecules together, so the straight-chain isomer takes more energy to separate. Branching makes a molecule more compact and less sticky, and the boiling point falls.'),
              p('Which is a direct payoff from Unit 6: the intermolecular force is the same in both, and the ', em('shape'), ' decides how much of it there is.'));
          },
        },
        {
          h: 'How the count explodes',
          body() {
            return frag(
              p('The number of possible isomers grows extraordinarily fast with chain length.'),
              table(['Carbons', 'Alkane isomers'], [
                ['1 to 3', '1 each — no choice available'],
                ['4', '2'],
                ['5', '3'],
                ['6', '5'],
                ['10', '75'],
                ['15', '4,347'],
                ['20', '366,319'],
                ['30', 'over 4 billion'],
              ]),
              okCallout(b('This is most of the answer to "why is organic chemistry a separate subject". '), 'Carbon makes four strong bonds, including to other carbons, in chains and branches and rings of any length. The result is a combinatorial explosion that no other element comes close to — which is why there are tens of millions of known carbon compounds and a few hundred thousand of everything else put together.'),
              p('And it is why life is built from carbon. You need an enormous number of distinct, stable, specific molecules to run a cell, and only carbon offers that many.'),
              h4('Counting isomers without missing any'),
              p('Work down from the longest chain, shortening it by one each time and placing the spare carbons as branches. Then check each candidate is genuinely new rather than the same molecule drawn differently.'),
              worked('Find all the isomers of C₅H₁₂.', [
                { q: 'Five in a row', why: 'Pentane.' },
                { q: 'Four in a row, one branch', why: 'The methyl can only go on carbon 2 — on carbon 3 it gives the same molecule read from the other end, and on carbon 1 it just makes a five-chain again.', maths: '2-methylbutane' },
                { q: 'Three in a row, two branches', why: 'Both methyls on carbon 2 is the only option.', maths: '2,2-dimethylpropane' },
                { q: 'So three altogether', why: 'And the duplicate check is where the work is. 3-methylbutane is not a fourth isomer — it is 2-methylbutane numbered from the wrong end, which the lowest-numbers rule forbids.' },
              ]));
          },
        },
        {
          h: 'Why it matters practically',
          body() {
            return frag(
              table(['Isomers', 'Difference'], [
                ['straight-chain and branched octanes', 'branched ones resist pre-ignition better — which is what the octane rating on a fuel pump measures'],
                ['glucose and fructose', 'same C₆H₁₂O₆, different sweetness, different metabolism'],
                ['ethanol and dimethyl ether', 'a drink and an anaesthetic gas'],
                ['straight and branched fatty acids', 'affects melting point, so whether a fat is solid or liquid'],
              ]),
              p('The octane rating is a good one. It is literally an isomer measurement: the scale is set by 2,2,4-trimethylpentane at 100 and heptane at 0, and a fuel’s rating says how it compares. Branching resists knocking, so a branched fuel can take more compression before igniting on its own.'),
              h4('And why a formula is not an identification'),
              p('A mass spectrometer gives you a formula. For anything beyond a few carbons, that leaves many candidates — for C₁₀H₂₂ alone there are 75, and adding functional groups multiplies it further.'),
              p('Which is why identifying an unknown organic compound needs structural information: NMR to see which carbons neighbour which, infrared to see which groups are present, and often a synthesis to confirm. A formula narrows the field and does not close it.'),
              goto('Degrees of unsaturation', '#/learn/unsaturation', 'The calculation that tells you how many rings and double bonds a formula must contain — which narrows the field a great deal further.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why does butane boil 11 degrees higher than 2-methylpropane?',
          options: [
            { t: 'A straight chain can lie alongside its neighbours down its whole length, so there is more contact and more dispersion force to overcome.', ok: true,
              why: 'Right, and it is a direct payoff from Unit 6: the force is the same in both, and the shape decides how much of it there is.' },
            { t: 'Butane is heavier.', ok: false,
              why: 'Identical formula, identical mass. Only the shape differs.' },
            { t: 'Butane is more polar.', ok: false,
              why: 'Both are essentially non-polar hydrocarbons. Dispersion is the only force available to either.' },
          ] },
        { kind: 'count', after: 1,
          q: 'How many structural isomers does C₅H₁₂ have?',
          answer: 3,
          right: 'Three: pentane, 2-methylbutane and 2,2-dimethylpropane. The work is in checking that nothing is a duplicate drawn differently.',
          wrong: 'Work down from the five-carbon chain, shortening by one and placing the spare carbons as branches — then check for duplicates.',
          hints: { 4: 'One of your four is probably a duplicate. 3-methylbutane is 2-methylbutane numbered from the other end.',
                   2: 'There is a third — try putting both spare carbons on the middle of a three-carbon chain.' } },
      ],
      quizzes: [
        { kind: 'choice', q: 'What are isomers?',
          options: [
            { t: 'Molecules with the same formula and different structures — and therefore different properties.', ok: true,
              why: 'Right, and the second half follows from the first, because structure decides properties.' },
            { t: 'Molecules with similar formulas.', ok: false,
              why: 'Identical formulas. That is what makes them interesting.' },
            { t: 'Different forms of the same element.', ok: false,
              why: 'Those are allotropes — diamond and graphite. Isomers are compounds.' },
          ] },
        { kind: 'match', q: 'Match each pair to the kind of isomerism.',
          pairs: [['butane / 2-methylpropane', 'chain'], ['propan-1-ol / propan-2-ol', 'position'],
                  ['ethanol / dimethyl ether', 'functional group']],
          right: 'Yes — the backbone differs, the position differs, or the family differs entirely.',
          wrong: 'Ask what is different: the shape of the skeleton, where a group sits, or which family it belongs to.' },
        { kind: 'choice', q: 'Why does branching lower a boiling point?',
          options: [
            { t: 'A branched molecule is more compact, so neighbours touch over less of their surface and the dispersion forces are weaker.', ok: true,
              why: 'Right — same force, less of it, because of shape. Which is Unit 6 arriving from a different direction.' },
            { t: 'Branched molecules are lighter.', ok: false,
              why: 'Isomers have identical mass.' },
            { t: 'Branched molecules have weaker bonds.', ok: false,
              why: 'The bonds inside are essentially the same. Boiling breaks nothing inside the molecule.' },
          ] },
        { kind: 'count', q: 'How many structural isomers does C₄H₁₀ have?', answer: 2,
          right: 'Two: butane and 2-methylpropane. Four carbons is the shortest chain where any choice exists.',
          wrong: 'Try a four-carbon chain, then a three-carbon chain with a branch.' },
        { kind: 'choice', q: 'Why is organic chemistry a separate subject?',
          options: [
            { t: 'Carbon’s four bonds to other carbons give a combinatorial explosion — over four billion isomers at thirty carbons.', ok: true,
              why: 'Right, and it is why there are tens of millions of known carbon compounds against a few hundred thousand of everything else combined.' },
            { t: 'Because carbon is the most abundant element.', ok: false,
              why: 'It is not — it is about the fifteenth by mass in the Earth’s crust. Versatility rather than abundance.' },
            { t: 'Because organic compounds come from living things.', ok: false,
              why: 'The historical reason for the name, and long obsolete — most organic compounds are now made in factories.' },
          ] },
        { kind: 'choice', q: 'What does the octane rating on a fuel pump measure?',
          options: [
            { t: 'How the fuel compares with 2,2,4-trimethylpentane at 100 and heptane at 0 — a literal isomer scale.', ok: true,
              why: 'Right, and branching is what resists pre-ignition, so a branched fuel takes more compression before igniting on its own.' },
            { t: 'The percentage of octane in the fuel.', ok: false,
              why: 'Petrol contains very little actual octane. The number is a comparison against two reference isomers.' },
            { t: 'The energy content.', ok: false,
              why: 'Energy per litre barely varies between grades. The rating is about resistance to knocking.' },
          ] },
        { kind: 'choice', q: 'A mass spectrometer gives you C₁₀H₂₂. What have you learned?',
          options: [
            { t: 'That it is one of 75 possible molecules — the field is narrowed, not closed.', ok: true,
              why: 'Right, and it is why identifying an organic compound needs structural methods: NMR for which carbons neighbour which, infrared for which groups are present.' },
            { t: 'Exactly which compound it is.', ok: false,
              why: '75 different substances share that formula. A formula counts atoms and says nothing about how they are joined.' },
            { t: 'Nothing useful.', ok: false,
              why: 'It is very useful — it rules out everything with a different formula, and with the degree of unsaturation it narrows things a great deal further.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Counting the same isomer twice.',
          why: '3-methylbutane is 2-methylbutane numbered from the other end. Renumber every candidate by the rules before deciding it is new.' },
        { wrong: 'Thinking isomers are much the same substance.',
          why: 'Ethanol and dimethyl ether share a formula and nothing else that matters. Structure decides properties.' },
        { wrong: 'Expecting isomers to have the same boiling point because they have the same mass.',
          why: 'Mass sets the dispersion force per contact; shape sets how much contact there is. Butane and 2-methylpropane differ by 11 degrees.' },
        { wrong: 'Treating a formula as an identification.',
          why: 'C₁₀H₂₂ is 75 substances. A formula narrows the field; NMR and infrared close it.' },
      ],
      recap: [
        'Isomers share a formula and differ in structure, which is enough to make them different substances.',
        'Three kinds: the backbone differs, a group’s position differs, or the family differs entirely.',
        'Branching lowers a boiling point, because a compact molecule touches its neighbours over less surface.',
        'Isomer counts explode with chain length — 75 at ten carbons, over four billion at thirty — which is most of why organic chemistry is its own subject and why life is built from carbon.',
        'A formula narrows the field and never closes it, which is why structural methods exist.',
      ],
    },

    {
      id: 'stereoisomers',
      title: 'Cis, trans, and bonds that will not turn',
      mins: 16,
      builds_on: ['structural-isomers', 'multiple'],
      keywords: 'cis trans stereoisomer geometric isomer E Z double bond rotation rigid unsaturated fat',
      hook() {
        return frag(
          p('Two molecules can have the same formula, the same atoms joined to the same atoms, the same everything — and still be different substances, because one part of them is turned the other way round.'),
          p('And the reason it counts is that some bonds spin freely and others cannot turn at all.'));
      },
      pages: [
        {
          h: 'A single bond spins; a double bond does not',
          body() {
            return frag(
              p('A single bond is one shared pair, and a shared pair does not care how the two ends are oriented relative to each other. So a single bond rotates freely — billions of times a second at room temperature.'),
              p('Which means all the ways you could draw a rotation of a single bond are the same molecule. There is nothing to separate and nothing to name.'),
              p('A double bond is different. Its second shared pair sits above and below the line between the atoms, and twisting would have to tear it apart — which costs far more energy than room temperature has available. So a double bond is locked.'),
              ME.sims.bondRotation(),
              callout(b('Try to turn each one. '), 'One spins and every position is the same substance. The other refuses, and the two arrangements are genuinely different molecules that cannot become each other.'));
          },
        },
        {
          h: 'Cis and trans',
          body() {
            return frag(
              p('When a locked double bond has different groups on each end, there are two distinct arrangements.'),
              table(['Name', 'Means', 'From'], [
                ['cis', 'the two groups of interest are on the same side', 'Latin for "on this side"'],
                ['trans', 'they are on opposite sides', 'Latin for "across"'],
              ]),
              strip('But-2-ene, both ways. Same formula, different substances.', [
                { smiles: 'C/C=C\\C', label: 'cis-but-2-ene', sub: 'boils at ' + ME.ref.boilingPoint('cis-but-2-ene') },
                { smiles: 'C/C=C/C', label: 'trans-but-2-ene', sub: 'boils at ' + ME.ref.boilingPoint('trans-but-2-ene') },
              ]),
              p('These are ', term('stereoisomers', 'Isomers with the same atoms joined in the same order, differing only in how those atoms are arranged in space.'), ': same connectivity, different arrangement in space. Which makes them a different thing from the structural isomers of the last lesson, where the connectivity itself differed.'),
              h4('And it needs two conditions'),
              p('Cis/trans isomerism requires a bond that cannot rotate ', b('and'), ' different groups on each end of it. If either end carries two identical groups, flipping changes nothing and there is only one molecule.'),
              warnCallout(b('So propene has no cis and trans forms. '), 'One end of its double bond carries two hydrogens, so there is nothing to be on one side or the other of. Checking that condition first saves inventing isomers that do not exist.'),
              h4('E and Z, for the awkward cases'),
              p('"Same side" gets ambiguous when there are four different groups, so the modern system ranks the groups at each end by atomic number and asks whether the two higher-ranked ones are together.'),
              table(['Label', 'From German', 'Means'], [
                ['Z', 'zusammen', 'the higher-priority groups are together — roughly cis'],
                ['E', 'entgegen', 'they are opposite — roughly trans'],
              ]),
              p('For the simple cases E and Z agree with trans and cis. The point of the newer system is that it still gives an answer when there is no obvious "the two groups of interest".'));
          },
        },
        {
          h: 'Why this is on food packaging',
          body() {
            return frag(
              p('Fats are long chains with carboxylic acid groups, and whether the chains have double bonds in them — and which arrangement — decides almost everything about how the fat behaves.'),
              table(['Fat', 'Chains', 'Result'], [
                ['saturated', 'no double bonds, so straight and flexible', 'packs tightly, solid at room temperature — butter, lard'],
                ['cis-unsaturated', 'a cis double bond puts a permanent kink in the chain', 'cannot pack tightly, liquid — olive oil, most vegetable oils'],
                ['trans-unsaturated', 'a trans double bond leaves the chain nearly straight', 'packs almost like a saturated fat — solid, and long shelf life'],
              ]),
              p('That middle row is the whole mechanism. A cis double bond bends the chain by about 30 degrees, and a bent chain cannot lie alongside its neighbours — so the dispersion forces are weaker and the fat stays liquid. The same argument as branching lowering a boiling point, in the last lesson.'),
              okCallout(b('Which is why trans fats were made deliberately. '), 'Partially hydrogenating vegetable oil converts some cis double bonds to trans, turning a cheap liquid oil into a solid that spreads like butter and keeps for months. It was a genuinely clever piece of process chemistry.'),
              p('And then it turned out that trans fats raise LDL cholesterol and lower HDL — worse for cardiovascular risk than the saturated fats they replaced. They are now restricted or banned in many countries.'),
              callout(b('Same atoms, same formula, one double bond turned the other way, and a public health regulation. '), 'It is hard to find a better argument that stereochemistry is not a technicality.'),
              p('It is also worth noting how the story went: a real improvement in one respect, adopted widely, with a consequence nobody had looked for. The chemistry was correct throughout; the question being asked was too narrow.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why can a double bond not rotate?',
          options: [
            { t: 'Its second shared pair sits above and below the bond axis, and twisting would have to break it.', ok: true,
              why: 'Right, and the energy needed is far more than room temperature provides — which is why the two arrangements are permanently distinct molecules.' },
            { t: 'Because it is shorter.', ok: false,
              why: 'It is shorter, and that is not what stops the rotation. The second pair is.' },
            { t: 'Because the atoms are heavier.', ok: false,
              why: 'Same atoms as the single-bonded version.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Does propene have cis and trans forms?',
          options: [
            { t: 'No — one end of its double bond carries two hydrogens, so there is nothing to be on one side or the other of.', ok: true,
              why: 'Right. Cis/trans needs a locked bond AND different groups on each end, and checking the second condition first saves inventing isomers that do not exist.' },
            { t: 'Yes, like all alkenes.', ok: false,
              why: 'Only alkenes with different groups on both ends of the double bond.' },
            { t: 'Yes, but they are very similar.', ok: false,
              why: 'There is only one propene. Flipping two identical hydrogens changes nothing.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What is a stereoisomer?',
          options: [
            { t: 'Same atoms joined in the same order, arranged differently in space.', ok: true,
              why: 'Right, and that is what distinguishes it from a structural isomer, where the connectivity itself differs.' },
            { t: 'Same formula, different connectivity.', ok: false,
              why: 'That is a structural isomer. Stereoisomers have identical connectivity.' },
            { t: 'Different formula, same shape.', ok: false, why: 'Isomers always share a formula.' },
          ] },
        { kind: 'choice', q: 'What does cis mean?',
          options: [
            { t: 'The two groups of interest are on the same side of the double bond.', ok: true,
              why: 'Right — Latin for "on this side". Trans is "across".' },
            { t: 'The groups are opposite.', ok: false,
              why: 'That is trans, from the Latin for "across". Cis is "on this side", and the two words are doing exactly opposite jobs.' },
            { t: 'The molecule is bent.', ok: false,
              why: 'A cis double bond does put a kink in a chain, and the word describes the arrangement of the groups.' },
          ] },
        { kind: 'choice', q: 'Why is a cis-unsaturated fat liquid at room temperature?',
          options: [
            { t: 'The cis double bond kinks the chain, so it cannot pack tightly and the dispersion forces are weaker.', ok: true,
              why: 'Right — the same argument as branching lowering a boiling point. Shape decides how much contact there is.' },
            { t: 'Because it has fewer hydrogens.', ok: false,
              why: 'It does have fewer, and the melting point comes from packing rather than from the hydrogen count.' },
            { t: 'Because double bonds are weaker.', ok: false,
              why: 'They are stronger. Melting breaks nothing inside the molecule.' },
          ] },
        { kind: 'choice', q: 'Why does a trans fat behave like a saturated one?',
          options: [
            { t: 'A trans double bond leaves the chain nearly straight, so it packs almost as tightly.', ok: true,
              why: 'Right — which is exactly why partial hydrogenation was used to turn cheap oil into a butter-like solid.' },
            { t: 'Because it has no double bonds.', ok: false,
              why: 'It has them — they are just arranged so the chain stays straight.' },
            { t: 'Because it is a different molecule entirely.', ok: false,
              why: 'Same formula and same connectivity as its cis isomer. Only the arrangement differs.' },
          ] },
        { kind: 'choice', q: 'What is the difference between E/Z and cis/trans?',
          options: [
            { t: 'E/Z ranks the groups by priority, so it still works when there is no obvious "the two groups of interest".', ok: true,
              why: 'Right, and for the simple cases they agree — Z is roughly cis and E roughly trans.' },
            { t: 'They are completely different phenomena.', ok: false,
              why: 'The same phenomenon, with a more general labelling system.' },
            { t: 'E/Z is for single bonds.', ok: false,
              why: 'Single bonds rotate, so there is nothing to label.' },
          ] },
        { kind: 'choice', q: 'Why does a single bond not give stereoisomers?',
          options: [
            { t: 'It rotates freely, so every arrangement is the same molecule at a different instant.', ok: true,
              why: 'Right — billions of times a second. There is nothing to separate and nothing to name.' },
            { t: 'Because single bonds are too weak.', ok: false,
              why: 'Strong enough to hold the molecule together. Rotation is the point, not strength.' },
            { t: 'They do, but the isomers are unstable.', ok: false,
              why: 'They genuinely do not exist as separate substances — free rotation means one molecule.' },
          ] },
        { kind: 'choice', q: 'What is the broader lesson of the trans fat story?',
          options: [
            { t: 'The chemistry was correct throughout, and the question being asked was too narrow.', ok: true,
              why: 'Right — partial hydrogenation solved the problem it was aimed at, and nobody had looked for the cardiovascular consequence. Worth remembering as a pattern.' },
            { t: 'That food chemistry should be avoided.', ok: false,
              why: 'Rather pessimistic. The lesson is about which questions get asked.' },
            { t: 'That the original chemistry was wrong.', ok: false,
              why: 'It worked exactly as intended. The unintended effect was elsewhere.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Assuming every alkene has cis and trans forms.',
          why: 'It needs different groups on both ends of the double bond. Propene has two hydrogens on one end and therefore only one form.' },
        { wrong: 'Thinking a single bond can give stereoisomers.',
          why: 'It rotates freely, so every arrangement is the same molecule.' },
        { wrong: 'Treating cis/trans as a technicality.',
          why: 'One double bond turned the other way is the difference between olive oil and a restricted food additive.' },
        { wrong: 'Thinking trans fats were a mistake in the chemistry.',
          why: 'Partial hydrogenation did exactly what it was designed to do. The problem was a consequence nobody had thought to look for.' },
      ],
      recap: [
        'A single bond rotates freely, so all its arrangements are one molecule. A double bond cannot turn, so its arrangements are separate substances.',
        'Cis means the groups of interest are on the same side, trans means opposite — and it needs different groups on both ends to exist at all.',
        'E and Z generalise it by ranking the groups, for cases where "the two groups of interest" is not obvious.',
        'A cis double bond kinks a fat’s chain so it cannot pack; a trans one leaves it straight, which is why partial hydrogenation turns oil into a spread.',
        'That one flipped bond is the difference between olive oil and a restricted additive, which is a strong argument that stereochemistry is not a technicality.',
      ],
    },

    {
      id: 'chirality',
      title: 'Mirror images that are not the same',
      mins: 17,
      builds_on: ['stereoisomers', 'shapes'],
      keywords: 'chirality chiral enantiomer mirror image optical isomer handedness thalidomide racemic carvone',
      hook() {
        return frag(
          p('Your left and right hands have the same parts connected the same way, in the same proportions. They are mirror images — and you cannot put a left glove on your right hand.'),
          p('Molecules can be handed in exactly that way. And in 1957 a drug was sold as a mixture of both hands, when only one of them was the medicine.'));
      },
      pages: [
        {
          h: 'What makes a molecule handed',
          body() {
            return frag(
              p('A ', term('chiral', 'Not superimposable on its own mirror image — handed, like a glove. A carbon with four different groups attached is the usual cause.'), ' molecule is one that cannot be laid on top of its own mirror image, however you turn it.'),
              p('The usual cause is a single carbon with ', b('four different groups'), ' attached. Four different things at the corners of a tetrahedron can be arranged in two ways that are mirror images, and no rotation converts one into the other.'),
              p('Test it: hold your hands palm to palm and they match as mirror images. Now try to lay one on the other, both palms down. They do not fit. That failure is chirality.'),
              table(['Condition', 'Result'], [
                ['a carbon with four different groups', 'chiral — two mirror-image forms exist'],
                ['a carbon with two identical groups', 'not chiral — the mirror image is the same molecule turned round'],
              ]),
              strip('Alanine, an amino acid, in both hands. Identical atoms, identical bonds, not superimposable.', [
                { smiles: 'C[C@@H](N)C(=O)O', label: 'L-alanine', sub: 'the one your proteins use' },
                { smiles: 'C[C@H](N)C(=O)O', label: 'D-alanine', sub: 'rare in biology' },
              ]),
              p('The two forms are called ', b('enantiomers'), '. They have identical melting points, boiling points, solubilities and spectra — every property that does not itself involve handedness is the same.'),
              callout(b('Which makes them extraordinarily hard to tell apart, and easy to separate in principle. '), 'The only things that distinguish them are other chiral things: they rotate polarised light in opposite directions, and they interact differently with anything handed — which includes every enzyme in your body.'));
          },
        },
        {
          h: 'Why biology cares so much',
          body() {
            return frag(
              p('An enzyme works by having a pocket shaped to fit one molecule. A shaped pocket is itself handed, so it fits one enantiomer and not the other — for the same reason a left glove fits one hand.'),
              p('So in a biological setting, two enantiomers can behave entirely differently.'),
              table(['Pair', 'One hand', 'The other'], [
                ['carvone', 'smells of spearmint', 'smells of caraway'],
                ['limonene', 'smells of oranges', 'smells of turpentine'],
                ['asparagine', 'tastes sweet', 'tastes bitter'],
                ['ibuprofen', 'active painkiller', 'essentially inactive'],
                ['thalidomide', 'effective sedative', 'causes severe birth defects'],
              ]),
              p('The two carvones are worth pausing on. Your nose contains receptors that are proteins, which are made of handed amino acids, so the receptors are handed — and one hand of carvone fits a spearmint receptor while the other fits a caraway one. The same atoms, connected identically, smell of two different things because your nose is made of left-handed parts.'),
              h4('And life uses one hand almost exclusively'),
              p('Nearly every amino acid in every living thing is the left-handed form. Nearly every sugar is the right-handed one. Why is an open question — but the consequence is not: your enzymes are built for one hand and are largely useless on the other.'),
              okCallout(b('Which is why a mirror-image nutrient may be no use at all. '), 'Not because it is harmful, but because the enzyme that would process it cannot get hold of it. It is a lock-and-key failure rather than a poison.'));
          },
        },
        {
          h: 'Thalidomide, and what changed',
          body() {
            return frag(
              p('Thalidomide was marketed from 1957 as a sedative, and prescribed to pregnant women for morning sickness. It is chiral, and it was sold as a ', term('racemic mixture', 'An equal mixture of both enantiomers. Ordinary synthesis produces one, because a non-chiral starting point has no reason to prefer either hand.'), ' — equal amounts of both hands, which is what ordinary synthesis produces.'),
              p('One enantiomer was the sedative. The other caused severe birth defects, and around ten thousand children were affected before it was withdrawn in 1961.'),
              warnCallout(b('And separating the hands would not have been enough. '), 'This is the part usually left out, and it matters: in the body, thalidomide ', em('interconverts'), ' between its two forms. Giving only the safe enantiomer would have produced the harmful one anyway. The problem was not merely a manufacturing oversight.'),
              h4('What it changed'),
              p('Almost every element of modern drug regulation traces to this. Testing in pregnancy became mandatory. Regulators gained the power to demand evidence before approval rather than after. And the two enantiomers of a chiral drug are now treated as two different substances, each needing its own evidence.'),
              p('It also drove a whole field of chemistry: making one enantiomer rather than both. That is genuinely difficult, because an ordinary reaction between non-chiral starting materials has no reason to prefer either hand, and it produces a 50:50 mixture. Achieving otherwise requires a chiral catalyst or a chiral starting material — something already handed to pass its handedness on.'),
              okCallout(b('Which won the 2001 Nobel Prize in Chemistry. '), 'Catalytic asymmetric synthesis: making one hand on purpose. It is now routine in pharmaceutical manufacturing, and it exists in that form largely because of what happened in 1961.'),
              p('So this lesson is where a geometric detail about tetrahedral carbon turns into the reason drug approval works the way it does. Shape decides function, and handedness is a kind of shape.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'What usually makes a molecule chiral?',
          options: [
            { t: 'A carbon with four different groups attached.', ok: true,
              why: 'Right — four different things at the corners of a tetrahedron can be arranged two ways that are mirror images, and no rotation converts one to the other.' },
            { t: 'A double bond.', ok: false,
              why: 'That gives cis/trans isomerism, which is a different kind of stereoisomerism.' },
            { t: 'A ring.', ok: false,
              why: 'Rings can be chiral and are not chiral by virtue of being rings.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Why do the two carvones smell different?',
          options: [
            { t: 'Your smell receptors are proteins made of handed amino acids, so they are handed — and each hand of carvone fits a different receptor.', ok: true,
              why: 'Right, and it is the clearest everyday demonstration of chirality. Same atoms, same bonds, two smells, because your nose is built from left-handed parts.' },
            { t: 'One is more volatile.', ok: false,
              why: 'Enantiomers have identical boiling points and volatilities. Only handed interactions can tell them apart.' },
            { t: 'They are different compounds.', ok: false,
              why: 'Same formula, same connectivity. Only the arrangement in space differs.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What does chiral mean?',
          options: [
            { t: 'Not superimposable on its own mirror image — handed, like a glove.', ok: true,
              why: 'Right. Hold your hands palm to palm and they match; lay one on the other palm-down and they do not. That failure is chirality.' },
            { t: 'Having a mirror plane.', ok: false,
              why: 'The opposite — a molecule with a mirror plane is not chiral, because its reflection is itself.' },
            { t: 'Containing a double bond.', ok: false,
              why: 'A double bond gives cis/trans isomerism, which is a different kind of handedness in space. Chirality usually comes from a carbon with four different groups.' },
          ] },
        { kind: 'choice', q: 'How do two enantiomers differ physically?',
          options: [
            { t: 'Only in handed interactions — they rotate polarised light oppositely and fit chiral pockets differently.', ok: true,
              why: 'Right. Melting point, boiling point, solubility and spectra are identical, which is what makes them so hard to separate.' },
            { t: 'In melting point and solubility.', ok: false,
              why: 'Those are identical. Only handed properties differ.' },
            { t: 'In molecular formula.', ok: false, why: 'Identical formulas — they are isomers.' },
          ] },
        { kind: 'choice', q: 'Why does an enzyme distinguish two enantiomers?',
          options: [
            { t: 'Its binding pocket is itself handed, so it fits one and not the other.', ok: true,
              why: 'Right — a left glove fits one hand for the same reason. It is a shape argument, which is Unit 6 again.' },
            { t: 'Because one is more reactive.', ok: false,
              why: 'They are equally reactive towards anything that is not itself handed.' },
            { t: 'Because one is larger.', ok: false, why: 'Identical size and mass.' },
          ] },
        { kind: 'choice', q: 'What is a racemic mixture?',
          options: [
            { t: 'Equal amounts of both enantiomers — what an ordinary synthesis produces.', ok: true,
              why: 'Right, and that is the key point: a reaction between non-chiral starting materials has no reason to prefer either hand, so it makes both.' },
            { t: 'A mixture of two different compounds.', ok: false,
              why: 'Two forms of the same compound, in equal amounts.' },
            { t: 'An impure sample.', ok: false,
              why: 'It can be perfectly pure and still be 50:50 in handedness.' },
          ] },
        { kind: 'choice', q: 'Would selling only the safe enantiomer of thalidomide have solved the problem?',
          options: [
            { t: 'No — the body interconverts the two forms, so the harmful one would have appeared anyway.', ok: true,
              why: 'Right, and this is the part usually left out. It makes the case less a manufacturing oversight and more a reason to test properly.' },
            { t: 'Yes, and the technology did not exist.', ok: false,
              why: 'It did not exist at the time, and it would not have been enough either, because of the interconversion.' },
            { t: 'Yes — that is what is done now.', ok: false,
              why: 'Single-enantiomer drugs are now common, and for thalidomide specifically it would not have helped.' },
          ] },
        { kind: 'choice', q: 'Why is making a single enantiomer difficult?',
          options: [
            { t: 'A reaction between non-chiral starting materials has no reason to prefer either hand, so you need something already handed to pass its handedness on.', ok: true,
              why: 'Right — a chiral catalyst or a chiral starting material. Working out how to do that reliably won the 2001 Nobel Prize.' },
            { t: 'Because enantiomers are unstable.', ok: false,
              why: 'They are perfectly stable. The difficulty is making one rather than both.' },
            { t: 'Because they are hard to purify.', ok: false,
              why: 'True, and the deeper problem is producing a preference in the first place.' },
          ] },
        { kind: 'choice', q: 'Nearly all amino acids in living things are left-handed. What follows?',
          options: [
            { t: 'Your enzymes are built for one hand and are largely useless on the mirror image.', ok: true,
              why: 'Right — which is why a mirror-image nutrient can be no use at all. A lock-and-key failure rather than a poison.' },
            { t: 'That right-handed amino acids are toxic.', ok: false,
              why: 'Usually just unusable. Not harmful, merely ignored.' },
            { t: 'That left-handed ones are more stable.', ok: false,
              why: 'Identically stable. Why life chose one hand is an open question.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking enantiomers differ in ordinary physical properties.',
          why: 'Melting point, boiling point, solubility and spectra are identical. Only handed interactions distinguish them.' },
        { wrong: 'Calling a carbon chiral when two of its groups are the same.',
          why: 'It needs four different groups. With two the same, the mirror image is the original turned round.' },
        { wrong: 'Thinking the thalidomide problem was just impure manufacturing.',
          why: 'The body interconverts the two forms, so a pure single enantiomer would have produced the other anyway.' },
        { wrong: 'Assuming one enantiomer can be made as easily as both.',
          why: 'An ordinary reaction has no reason to prefer a hand. Producing one takes a chiral catalyst or starting material, and working out how won a Nobel Prize.' },
      ],
      recap: [
        'A chiral molecule cannot be laid on its own mirror image, usually because a carbon carries four different groups.',
        'Enantiomers share every property that does not involve handedness, which makes them very hard to tell apart.',
        'Handed things can tell them apart, and every enzyme is handed — so two enantiomers can smell, taste and act completely differently.',
        'Ordinary synthesis makes both hands equally, because non-chiral starting materials have no reason to prefer either.',
        'Thalidomide is why drug regulation looks the way it does, and why single-enantiomer synthesis became a field — though for that drug even a pure enantiomer would not have helped, because the body interconverts them.',
      ],
    },

    ],
  });
})();
