/* The guided lessons.
 *
 * Each lesson is a short read with one hands-on check at the end. Progress is
 * kept in localStorage, guarded, so it survives a reload but nothing breaks
 * when storage is unavailable.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  /* -------------------------------------------------------- tiny helpers */
  const p = (...kids) => el('p', {}, kids.flat());
  const h3 = (t) => el('h3', { text: t });
  const b = (t) => el('strong', { text: t });

  /* A term explained the moment it appears, rather than in a glossary. */
  function term(word, definition) {
    return el('span', { class: 'term', 'data-tip': definition, text: word });
  }

  function molOf(smiles) {
    const m = ME.chem.fromSmiles(smiles);
    ME.chem.ensureCoordinates(m);
    return m;
  }

  function fig(caption, ...kids) {
    const f = el('figure', { class: 'figure' }, kids.flat());
    if (caption) f.appendChild(el('figcaption', { text: caption }));
    return f;
  }

  function drawing(smiles, opts) {
    return ME.render2d.render(molOf(smiles), Object.assign({ width: 400, height: 240, interactive: true }, opts || {}));
  }

  function drawMol(mol, opts) {
    return ME.render2d.render(mol, Object.assign({ width: 400, height: 240, interactive: true }, opts || {}));
  }

  /* Two hydrogens sharing one pair, laid out by hand so the bond sits
   * horizontally instead of at whatever angle the layout engine picks. */
  function hydrogenMolecule() {
    const M = ME.drawModel;
    const g = M.emptyGraph();
    const a = M.addAtom(g, 0, 0, 'H');
    const b2 = M.addAtom(g, 1, 0, 'H');
    M.addBond(g, a, b2, 1);
    return M.toMolecule(g);
  }

  function twoUp(a, labelA, c, labelC) {
    return el('div', { class: 'figure-2up' }, [
      el('div', {}, [a, el('div', { class: 'lbl', text: labelA })]),
      el('div', {}, [c, el('div', { class: 'lbl', text: labelC })]),
    ]);
  }

  function xrayFigure(smiles, caption, opts) {
    const holder = el('figure', { class: 'figure' });
    ME.render2d.mountXray(holder, molOf(smiles), Object.assign({ width: 420, height: 260, xray: 0 }, opts || {}));
    if (caption) holder.appendChild(el('figcaption', { text: caption }));
    return holder;
  }

  /* ------------------------------------------------------------- lessons */
  const LESSONS = [
    {
      id: 'why',
      title: 'Why draw molecules at all',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('Here is a chemical formula: ', b('C₂H₆O'), '. Two carbons, six hydrogens, one oxygen. That is a complete headcount of the atoms, and it tells you almost nothing useful.'));
        f.appendChild(p('Two completely different substances have that formula. One is the alcohol in wine. The other is a gas once used as a refrigerant. Same atoms, same headcount, joined up differently — and that difference is everything.'));
        f.appendChild(fig('Both are C₂H₆O. The one on the left you can drink. The one on the right is a gas that boils at −24°C.',
          twoUp(drawing('CCO', { xray: 1, width: 300, height: 200 }), 'Ethanol', drawing('COC', { xray: 1, width: 300, height: 200 }), 'Dimethyl ether')));
        f.appendChild(p('Look at where the oxygen sits. In ethanol it is on the ', term('end', 'An atom at the end of a chain is bonded to only one other heavy atom, so it has spare bonds for hydrogens.'), ', carrying a hydrogen. In dimethyl ether it is stuck in the middle, between the two carbons. That single change of position is the difference between a drink and a gas.'));
        f.appendChild(p('So a formula is a shopping list. A ', b('structure'), ' is the assembled thing. Chemists draw structures because the arrangement, not the headcount, decides how a molecule behaves — what it dissolves in, what it reacts with, what it smells like, whether your body can use it.'));
        f.appendChild(p('Everything else in this section is about how to read and write those drawings quickly.'));
        return f;
      },
      quizzes: [
        {
          kind: 'choice',
          q: 'Ethanol and dimethyl ether both have the formula C\u2082H\u2086O. What does that tell you?',
          options: [
            { t: 'They are the same substance written two ways.', ok: false, why: 'They behave completely differently \u2014 one is the alcohol in wine, the other is a gas that boils at \u221224\u00b0C. A shared formula does not make two things the same.' },
            { t: 'They contain the same atoms, but joined up differently.', ok: true, why: 'Exactly. Same shopping list, different assembly. That is the whole reason chemists draw structures instead of writing formulas.' },
            { t: 'One of the two formulas must be written down wrong.', ok: false, why: 'Both are right. Two different molecules really can share a formula; chemists call them isomers, and there is nothing unusual about it.' },
          ],
        },
        {
          kind: 'choice',
          q: 'Which of these can you work out from the formula C\u2082H\u2086O on its own?',
          options: [
            { t: 'Which atoms are in it, and how many of each.', ok: true, why: 'That is all a formula is: a headcount. Useful, but it stops there.' },
            { t: 'Whether it is a liquid or a gas at room temperature.', ok: false, why: 'Not from the formula. Ethanol is a liquid and dimethyl ether is a gas, and they share this formula exactly.' },
            { t: 'How the atoms are joined to each other.', ok: false, why: 'That is precisely what a formula leaves out, and precisely why the drawings in the next lessons exist.' },
            { t: 'What it smells like.', ok: false, why: 'Smell depends on shape, which the formula says nothing about.' },
          ],
        },
        {
          kind: 'clickatom',
          smiles: 'CCO',
          xray: 1,
          q: 'This is ethanol, drawn in full. Click the one atom that is neither carbon nor hydrogen.',
          test: (a) => a.sym !== 'C' && a.sym !== 'H',
          right: 'That is the oxygen. Notice where it sits: on the end of the chain, carrying a hydrogen. Move it into the middle and you would have dimethyl ether instead.',
          wrong: 'Look for the letter that is not a C or an H.',
        },
      ],
    },

    {
      id: 'hands',
      title: 'Bonds, and how many "hands" each atom has',
      body() {
        const f = document.createDocumentFragment();

        f.appendChild(p('Before you can read a drawing you need to know what the lines mean, and why each atom only ever has a certain number of them.'));

        f.appendChild(h3('What a line actually is'));
        f.appendChild(p('Atoms hold on to each other by ', b('sharing a pair of electrons'), '. One shared pair is one ', b('bond'), ', and chemists draw it as a single line. That is the whole notation: a line between two letters means those two atoms are sharing a pair.'));
        f.appendChild(fig('The simplest molecule there is: two hydrogen atoms sharing one pair of electrons. One line, one bond.',
          drawMol(hydrogenMolecule(), { xray: 1, width: 340, height: 170, maxScale: 64, interactive: false })));

        f.appendChild(h3('Each atom wants a fixed number of bonds'));
        f.appendChild(p('Here is the part that makes everything else possible. Each kind of atom wants a specific number of bonds, and it is remarkably stubborn about it. Think of it as ', b('hands'), ': carbon has four hands and is not satisfied until all four are holding something.'));
        f.appendChild(handsFigure());

        f.appendChild(h3('Why those particular numbers'));
        f.appendChild(p('Atoms are most stable with a full outer shell of electrons. For most of the atoms you will meet, a full shell means ', b('eight'), '. So count how many an atom already brings, subtract from eight, and that is how many it still needs to borrow \u2014 which is how many bonds it makes.'));
        f.appendChild(handsTable());
        f.appendChild(p('Hydrogen is the exception, and a simple one: its shell is the small innermost one, which only holds ', b('two'), '. It brings one electron, so it needs one more, so it makes exactly one bond. That is why hydrogen is always at the edge of a molecule and never in the middle \u2014 with only one hand, it can never hold two things at once.'));
        f.appendChild(el('div', { class: 'callout' }, [
          b('Carbon 4  \u00b7  Nitrogen 3  \u00b7  Oxygen 2  \u00b7  Hydrogen 1  \u00b7  Fluorine, chlorine, bromine and iodine 1'),
        ]));

        f.appendChild(h3('Hydrogen is the default filler'));
        f.appendChild(p('This is the rule that makes the shorthand drawings work later, so it is worth pausing on.'));
        f.appendChild(p('If an atom has a hand free and nothing more interesting is on offer, a ', b('hydrogen'), ' takes it. Hydrogen is the smallest and most abundant atom around, and it only needs one hand itself, so it is the perfect gap-filler. In practice that means: ', b('any hand not accounted for by a drawn line is holding a hydrogen.')));
        f.appendChild(p('So a drawing does not have to show you everything. If you can see how many lines an atom has, and you know how many hands it wants, the difference is hydrogens \u2014 and you can work that out yourself without being told.'));

        f.appendChild(h3('Working one out'));
        f.appendChild(p('Take this molecule, ethylamine. Look at the nitrogen.'));
        f.appendChild(fig('Ethylamine, with every atom drawn. The nitrogen on the left is holding three things: one carbon and two hydrogens.',
          drawing('CCN', { xray: 1, width: 420, height: 250 })));
        f.appendChild(p('Read it step by step. Nitrogen wants ', b('three'), ' bonds. In this molecule it holds one carbon and, once you look, two hydrogens \u2014 three hands, all full. Now cover the hydrogens with your thumb: you would see nitrogen with a single line to a carbon, you would know nitrogen wants three, and you could say with confidence that two hydrogens must be there. Nobody had to draw them.'));
        f.appendChild(p('The same works for every atom in the picture. The carbon on the left has one line to its neighbour, so three hands are spare, so three hydrogens. The middle carbon has two lines, so two hydrogens. Hover any atom to check yourself.'));

        f.appendChild(h3('One warning about double lines'));
        f.appendChild(p('Sometimes two atoms share ', el('em', { text: 'two' }), ' pairs of electrons instead of one. That is drawn as two parallel lines, and it uses up ', b('two'), ' hands from each atom, not one. So when you count, count ', b('lines'), ', not neighbours: a carbon with one double bond and two single bonds has used all four hands and has no hydrogens left.'));
        f.appendChild(fig('Ethene. Both carbons have all four hands used up: two of them in the double bond, and two holding hydrogens.',
          drawing('C=C', { xray: 1, width: 360, height: 210, interactive: false })));
        f.appendChild(p('Lesson 7 comes back to double and triple bonds properly. For now, just remember that a double line counts twice.'));

        f.appendChild(h3('Why this is worth memorising'));
        f.appendChild(p('These five numbers are the single most useful thing in the subject. They let you check whether a drawing is even possible, fill in everything it left out, and spot the moment something unusual is going on. Every shortcut in the next few lessons is built on top of them.'));
        return f;
      },
      quizzes: [
        {
          kind: 'clickatom',
          mol: impossibleCarbon,
          xray: 0,
          q: 'Somebody has drawn this molecule wrongly: one atom here has more bonds than it has hands. Click that atom.',
          test: (a) => a.bondCount === 5,
          right: 'That is the one. Count the lines meeting there: five. Carbon has only four hands, so there is no way for it to hold five things \u2014 this molecule cannot exist as drawn.',
          wrong: 'Carbon has four hands, so look for the corner where more than four lines meet.',
          note: 'Every corner and line end in this drawing is a carbon.',
        },
        {
          kind: 'count',
          q: 'An oxygen in a molecule is drawn with a single line to a carbon, and nothing else. How many hydrogens are on it?',
          answer: 1,
          right: 'One. Oxygen wants two bonds, one is drawn, so a hydrogen is filling the other hand. That is an O\u2013H \u2014 an alcohol group.',
          wrong: 'Oxygen has two hands. Count how many are already holding something, and the rest are hydrogens.',
          hints: {
            0: 'Oxygen wants two bonds and only one is drawn, so one hand is still free \u2014 and a free hand means a hydrogen.',
            2: 'That would give oxygen three bonds in total. Oxygen has only two hands.',
            3: 'Oxygen has two hands altogether, not three or more.',
          },
        },
        {
          kind: 'choice',
          q: 'Why does carbon make exactly four bonds?',
          options: [
            { t: 'It has four electrons of its own and needs four more to fill its shell.', ok: true, why: 'That is it. Four short of a full shell of eight, so it borrows four by sharing \u2014 four bonds, four hands.' },
            { t: 'Because it is the biggest of the common atoms.', ok: false, why: 'Size has nothing to do with it. Chlorine is much bigger than carbon and makes only one bond.' },
            { t: 'Because four is the most bonds any atom can make.', ok: false, why: 'Not so \u2014 sulfur manages six, and phosphorus five. Four is simply what carbon needs.' },
          ],
        },
      ],
    },

    {
      id: 'full',
      title: 'Full structural formulas',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('The most honest way to draw a molecule is to draw all of it: every atom labelled, every bond as a line. Nothing assumed, nothing left out.'));
        f.appendChild(fig('Propan-1-ol, drawn in full. Ten atoms, nine bonds, no guessing required.',
          drawing('CCCO', { xray: 1, width: 420, height: 240 })));
        f.appendChild(p('This is a ', b('full structural formula'), '. It is unambiguous and it is how you should think about a molecule while you are learning.'));
        f.appendChild(p('It is also completely impractical. That drawing has ten atoms. Caffeine has twenty-four, and glucose twenty-four, and a protein has thousands. Drawing every hydrogen by hand, every time, is a lot of ink spent on the least interesting atoms in the molecule.'));
        f.appendChild(p('So chemists built shortcuts. The next two lessons are those shortcuts, and the whole logic of both is: ', b('if a rule lets the reader work something out, stop drawing it.')));
        return f;
      },
      quizzes: [
        {
          kind: 'clickatom',
          smiles: 'CCCO',
          xray: 1,
          q: 'Click the oxygen in this drawing.',
          test: (a) => a.sym === 'O',
          right: 'That is the oxygen. It has two lines: one to a carbon, one to a hydrogen. Two hands, both full.',
          wrong: 'The oxygen is labelled O, and it is the atom with exactly two bonds, one of them to a hydrogen.',
        },
        {
          kind: 'count',
          smiles: 'CCCO',
          render: { xray: 1, width: 380, height: 240 },
          q: 'How many atoms are in this drawing altogether \u2014 every letter you can see?',
          answer: 12,
          right: 'Twelve: three carbons, one oxygen and eight hydrogens. And ten of those twelve are the boring ones, which is exactly why the shortcuts in the next lessons exist.',
          wrong: 'Count every letter in the picture, hydrogens included.',
          hints: {
            4: 'That is just the carbons and the oxygen. A full structural formula shows the hydrogens too, and there are eight of them.',
            3: 'That is only the carbons. Count the oxygen and all the hydrogens as well.',
            8: 'That is the hydrogens on their own. Add the three carbons and the oxygen.',
            11: 'Very close. Check the end of the chain \u2014 it is easy to miss one hydrogen there.',
          },
        },
        {
          kind: 'choice',
          q: 'Full structural formulas are clear and unambiguous. So why do chemists not use them for everything?',
          options: [
            { t: 'They spend most of their ink on the least interesting atoms.', ok: true, why: 'Right. Caffeine has twenty-four atoms and ten of them are hydrogens sitting on carbons, all perfectly predictable. Drawing them adds nothing.' },
            { t: 'They are not accurate enough.', ok: false, why: 'The opposite \u2014 they are the most complete drawing there is. The problem is effort, not accuracy.' },
            { t: 'They only work for small molecules.', ok: false, why: 'You can draw any molecule this way. It just becomes an enormous amount of work for no extra information.' },
          ],
        },
      ],
    },

    {
      id: 'condensed',
      title: 'Condensed formulas: the molecule on one line',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('The first shortcut is for writing rather than drawing. Instead of a picture, walk along the molecule and write each atom with its hydrogens tucked in beside it.'));
        f.appendChild(fig('Ethanol, the same molecule two ways.',
          twoUp(drawing('CCO', { xray: 1, width: 300, height: 180 }), 'Full structural',
            el('div', { class: 'formula-big mono', style: { padding: '48px 0', fontSize: '1.6rem' }, text: 'CH₃CH₂OH' }), 'Condensed')));
        f.appendChild(p('Read it left to right. ', b('CH₃'), ' is a carbon with three hydrogens. ', b('CH₂'), ' is a carbon with two. ', b('OH'), ' is an oxygen with one. The bonds between the groups are implied by writing them next to each other.'));
        f.appendChild(p('It fits on one line, which is why you see it in the middle of a sentence or on a bottle label. Its weakness is that it can only really describe a chain. As soon as a molecule has a ring, or branches in several directions, a condensed formula gets so full of brackets that a picture is easier.'));
        f.appendChild(el('div', { class: 'callout' }, [
          'Branches go in brackets: ', b('CH₃CH(CH₃)CH₃'), ' is a three-carbon chain with a fourth carbon hanging off the middle one.',
        ]));
        return f;
      },
      quizzes: [
        {
          kind: 'choice',
          q: 'Which drawing is CH\u2083CH\u2082CH\u2082OH?',
          optionsBuilder() {
            return [
              { node: drawing('CCCO', { xray: 1, width: 240, height: 150, interactive: false }), ok: true, why: 'Yes \u2014 three carbons in a row, with the OH on the end.' },
              { node: drawing('CCOC', { xray: 1, width: 240, height: 150, interactive: false }), ok: false, why: 'Look where the oxygen is: in the middle of the chain, between two carbons, with no hydrogen on it. That is an ether. Written out it would be CH\u2083CH\u2082OCH\u2083.' },
              { node: drawing('CC(C)O', { xray: 1, width: 240, height: 150, interactive: false }), ok: false, why: 'The OH here is on the middle carbon, not the end one. Written out it would be CH\u2083CH(OH)CH\u2083.' },
            ];
          },
        },
        {
          kind: 'count',
          q: 'How many carbon atoms does CH\u2083CH\u2082CH\u2082CH\u2082CH\u2083 have?',
          answer: 5,
          right: 'Five. Every C in the line is one carbon; the subscripts after the H count hydrogens, not carbons.',
          wrong: 'Count the C symbols. The little numbers belong to the hydrogens.',
          hints: {
            12: 'You have added up the hydrogens as well. Count only the C symbols \u2014 the subscripts after each H are hydrogen counts.',
            3: 'Count every C along the line, including the two CH\u2083 groups at the ends.',
            4: 'One more \u2014 it is easy to miss a CH\u2082 in the middle of a run of them.',
            17: 'That is every atom in the molecule. The question asks only for the carbons.',
          },
        },
        {
          kind: 'choice',
          q: 'What does CH\u2083CH(CH\u2083)CH\u2083 describe?',
          options: [
            { t: 'A chain of three carbons, with a fourth carbon hanging off the middle one.', ok: true, why: 'Right. The brackets mean "this hangs off the atom just before it", so the middle carbon carries a CH\u2083 branch. That molecule is isobutane.' },
            { t: 'A chain of four carbons in a row.', ok: false, why: 'That would be written CH\u2083CH\u2082CH\u2082CH\u2083, with no brackets. Brackets always signal a branch.' },
            { t: 'A ring of four carbons.', ok: false, why: 'Condensed formulas cannot show rings at all \u2014 that is their main weakness, and why skeletal drawings exist.' },
          ],
        },
      ],
    },

    {
      id: 'skeletal',
      title: 'Line-angle formulas: the working drawing',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('Here is the shortcut chemists actually use, and once it clicks you will never want to go back.'));
        f.appendChild(p('Start from an observation: in organic molecules, carbon is ', b('everywhere'), '. It is the backbone of essentially every structure you will meet. Writing the letter C over and over adds no information at all — it is like labelling every brick in a wall "brick". So chemists agreed to stop.'));
        f.appendChild(el('div', { class: 'callout' }, [
          el('div', {}, [b('Rule 1. '), 'Every corner in the chain, and every end of a line, is a carbon.']),
          el('div', { style: { marginTop: '6px' } }, [b('Rule 2. '), 'The hydrogens on those carbons are not drawn. Carbon has four hands; count the lines, and the rest are hydrogens.']),
          el('div', { style: { marginTop: '6px' } }, [b('Rule 3. '), 'Any atom that is not carbon or its hydrogens ', el('em', { text: 'is' }), ' written, always. Those are the interesting ones.']),
        ]));
        f.appendChild(p('Drag the slider below. It fades the hidden atoms in and out of the same drawing, so you can see exactly what the shorthand is leaving to you.'));
        f.appendChild(xrayFigure('CCCCCC', 'Hexane. On the left of the slider: five corners, six carbons, fourteen hydrogens, none of them written. On the right: all of it.'));
        f.appendChild(p('The zig-zag is not decoration. Carbon’s four bonds push away from each other, so a real chain genuinely does zig-zag at roughly 109° rather than lying flat in a line. The drawing is a reasonable picture of the shape.'));
        f.appendChild(p('Hover any corner in a skeletal drawing anywhere in this app and it will tell you what is hiding there.'));
        return f;
      },
      quizzes: [
        {
          kind: 'count',
          smiles: 'CCCCCC',
          q: 'How many carbon atoms are in this drawing?',
          answer: 6,
          right: 'Six. Four corners plus the two line ends \u2014 and the ends are the ones people forget.',
          wrong: 'Count the corners, then remember that both ends of the line are carbons as well.',
          hints: {
            4: 'That is the corners only. Each end of the zig-zag is a carbon too, which brings it to six.',
            5: 'So close \u2014 you have counted one of the two ends. Both of them are carbons.',
            14: 'That is the hydrogen count. The question asks for carbons.',
            20: 'That is every atom, hydrogens included. Just the carbons this time.',
          },
        },
        {
          kind: 'choice',
          q: 'In a skeletal drawing, what sits at every corner and every line end?',
          options: [
            { t: 'A carbon atom.', ok: true, why: 'Yes. Carbon is so common in these molecules that writing the letter every time adds nothing, so it is left out and the corner stands for it.' },
            { t: 'Nothing \u2014 the corners are just where the line changes direction.', ok: false, why: 'They look like that, but every corner really is an atom. The zig-zag is not decoration: carbon\u2019s bonds genuinely splay out at about 109\u00b0.' },
            { t: 'A hydrogen atom.', ok: false, why: 'Hydrogens are the ones being left out. The corners are the carbons those hydrogens are sitting on.' },
          ],
        },
        {
          kind: 'clickatom',
          smiles: 'CCCCC',
          xray: 0,
          q: 'Click a carbon at one of the two ends of this chain.',
          test: (a) => a.sym === 'C' && a.bondCount === 1,
          right: 'That is an end carbon. It has only one line, so three of its four hands are free \u2014 which means three hydrogens, making it a CH\u2083 group.',
          wrong: 'An end carbon has just one line touching it. The ones in the middle have two.',
        },
      ],
    },

    {
      id: 'hidden',
      title: 'Counting the hidden hydrogens',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('This is the one skill worth drilling, because everything else depends on it. Given a corner in a skeletal drawing, how many hydrogens are on it?'));
        f.appendChild(el('div', { class: 'callout ok' }, [
          b('Count the lines touching the carbon. Subtract from four. That is your answer.'),
        ]));
        f.appendChild(p('So: a carbon at the end of a chain has one line, and three hydrogens. A carbon in the middle of a chain has two lines, and two hydrogens. A branch point has three lines, and one hydrogen. And a carbon with four lines has none at all — every hand is already holding something.'));
        f.appendChild(p('Careful with double bonds: a double bond is ', b('two'), ' of the four, drawn as two lines between the same pair of atoms. So a carbon with one double bond and one single bond has used three and has one hydrogen left.'));
        f.appendChild(xrayFigure('CC(C)CCO', '3-methylbutan-1-ol. Work out each corner before you slide, then check yourself.'));
        f.appendChild(p('Hover over the corners in that drawing. Each one will tell you what it is carrying, so you can check yourself immediately.'));
        return f;
      },
      quizzes: [
        {
          /* 2,2-dimethylpropan-1-ol, chosen because exactly one of its carbons
           * really does carry no hydrogens. */
          kind: 'clickatom',
          smiles: 'CC(C)(C)CO',
          xray: 0,
          q: 'Every corner in this drawing is a carbon. Click the one that has no hydrogens at all.',
          test: (a) => a.sym === 'C' && a.hydrogens === 0,
          right: 'That is the one. Four lines meet there, so all four of carbon\u2019s hands are already holding another carbon and there is no room left for a hydrogen. It is the only carbon here like that.',
          wrong: 'You are after the corner with nothing left over: count the lines and take them from four.',
          note: 'Count the lines at each corner, then subtract from four.',
        },
        {
          kind: 'count',
          smiles: 'CCCC',
          q: 'How many hydrogens are hidden in this drawing altogether?',
          answer: 10,
          right: 'Ten. The two end carbons carry three each, and the two middle ones carry two each: 3 + 2 + 2 + 3.',
          wrong: 'Go carbon by carbon. Count the lines at each one, subtract from four, then add up your four answers.',
          hints: {
            4: 'That is the number of carbons, not hydrogens. Each of those carbons is carrying several.',
            8: 'You may have given every carbon two hydrogens. The two on the ends have only one line each, so they carry three apiece.',
            12: 'That would be three hydrogens on every carbon. The two in the middle already have two lines, so they can only take two more.',
            14: 'That is the answer for a six-carbon chain. This one has four.',
          },
        },
        {
          kind: 'clickatom',
          smiles: 'CC(C)CCO',
          xray: 0,
          q: 'Click the carbon that is carrying exactly one hidden hydrogen.',
          test: (a) => a.sym === 'C' && a.hydrogens === 1,
          right: 'That is the branch point. Three lines meet there, so three of its four hands are taken and exactly one hydrogen fills the last.',
          wrong: 'One hydrogen means three of the four hands are already used, so look for the corner with three lines meeting it.',
          note: 'The oxygen has a hydrogen too, but the question asks for a carbon.',
        },
      ],
    },

    {
      id: 'multiple',
      title: 'Double and triple bonds',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('Two atoms can share more than one pair of electrons. Share two pairs and you get a ', b('double bond'), ', drawn as two parallel lines. Share three and you get a ', b('triple bond'), ', drawn as three.'));
        f.appendChild(fig('Two carbons, joined three different ways.', el('div', { class: 'figure-2up', style: { gridTemplateColumns: 'repeat(3, 1fr)' } }, [
          el('div', {}, [drawing('CC', { xray: 1, width: 200, height: 150, interactive: false }), el('div', { class: 'lbl', text: 'Ethane — single' })]),
          el('div', {}, [drawing('C=C', { xray: 1, width: 200, height: 150, interactive: false }), el('div', { class: 'lbl', text: 'Ethene — double' })]),
          el('div', {}, [drawing('C#C', { xray: 1, width: 200, height: 150, interactive: false }), el('div', { class: 'lbl', text: 'Ethyne — triple' })]),
        ])));
        f.appendChild(p('Notice what happens to the hydrogens. Ethane has six, ethene has four, ethyne has two. Every extra shared pair is a hand that is no longer free to hold a hydrogen. The "four hands" rule is doing all the work.'));
        f.appendChild(h3('Why it matters beyond the bookkeeping'));
        f.appendChild(p('A single bond can rotate freely — the two ends spin like a joint. A double bond ', b('cannot'), '. It locks the two ends in place. That rigidity is why fats with double bonds have permanent kinks in them and stay liquid, while straight saturated fats stack neatly and go solid. Olive oil and butter, from one bond.'));
        f.appendChild(p('A triple bond goes further and forces the atoms into a straight line. You will never see a bend at a triple bond.'));
        return f;
      },
      quizzes: [
        {
          kind: 'count',
          smiles: 'C=CC=C',
          q: 'This is buta-1,3-diene. How many hydrogens does the whole molecule have?',
          answer: 6,
          right: 'Six. The two end carbons carry two each, and the two middle carbons one each \u2014 their double bonds have used up the rest.',
          wrong: 'Work through it carbon by carbon: count the lines at each one and subtract from four. A double bond counts as two lines.',
          hints: {
            10: 'You have treated the double bonds as single ones. Each double bond uses two hands, not one.',
            8: 'Check the middle two carbons. Each has a double bond on one side and a single bond on the other, which is three hands gone, leaving room for only one hydrogen each.',
            4: 'Check the end carbons. Each has only a double bond, so two hands are free and each takes two hydrogens.',
          },
        },
        {
          kind: 'choice',
          q: 'What can a single bond do that a double bond cannot?',
          options: [
            { t: 'Twist, so the two ends can rotate freely.', ok: true, why: 'Exactly. A double bond is locked, and that rigidity is why fats with double bonds have permanent kinks and stay liquid, while straight saturated fats stack neatly and go solid.' },
            { t: 'Hold a hydrogen.', ok: false, why: 'Both can \u2014 it is the atoms at the ends that hold hydrogens, not the bond itself.' },
            { t: 'Join two carbons together.', ok: false, why: 'Both do that. The difference is how many pairs of electrons are shared, and whether the join can rotate.' },
          ],
        },
        {
          kind: 'clickatom',
          smiles: 'CC#CC',
          xray: 0,
          q: 'Click one of the two carbons joined by the triple bond.',
          test: (a) => a.sym === 'C' && a.hydrogens === 0,
          right: 'That is one of them. A triple bond uses three of its four hands, and the fourth holds the neighbouring carbon \u2014 so it has no hydrogens, and the four atoms in a row are forced into a straight line.',
          wrong: 'The triple bond is the one drawn as three parallel lines. Click a carbon at either end of it.',
        },
      ],
    },

    {
      id: 'hetero',
      title: 'Heteroatoms: the ones you always write',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('Anything in an organic molecule that is not carbon or hydrogen is called a ', term('heteroatom', 'Hetero- is Greek for "other". A heteroatom is any atom in an organic molecule that is not carbon or hydrogen — usually oxygen, nitrogen, sulfur, phosphorus or a halogen.'), '. Oxygen, nitrogen, sulfur, phosphorus, the halogens.'));
        f.appendChild(p('These are always written out, with their own letters, and their hydrogens are written too. That is not an inconsistency — it follows from the same logic as everything else. Carbon is left out ', el('em', { text: 'because' }), ' it is predictable. Heteroatoms are not predictable, and they are where almost all the chemistry happens, so they get labelled.'));
        f.appendChild(xrayFigure('CCN', 'Ethylamine. Two bare corners for the carbons, and the nitrogen spelled out.'));
        f.appendChild(p('There is a second reason heteroatoms earn their letters: they have ', b('lone pairs'), ' — electrons not being shared with anyone. Oxygen has two lone pairs, nitrogen has one. Those spare electrons are what make a molecule grab a proton, dissolve in water, or stick to a receptor in your brain. A drawing that hid them would be hiding the point.'));
        f.appendChild(fig('Water, with its two lone pairs shown as dots. They push the two hydrogens down into a bend — and that bend is why water behaves like nothing else.',
          drawing('O', { xray: 1, lonePairs: true, width: 300, height: 200 })));
        return f;
      },
      quizzes: [
        {
          kind: 'clickatom',
          smiles: 'CCCN',
          xray: 0,
          q: 'Click the heteroatom in this skeletal drawing.',
          test: (a) => a.sym !== 'C' && a.sym !== 'H',
          right: 'The nitrogen. It is the only atom with a letter on it, and that is exactly the signal \u2014 anything spelled out in a skeletal drawing is worth your attention.',
          wrong: 'The bare corners are carbons, which the drawing leaves out on purpose. The heteroatom is the one that has been given a letter.',
        },
        {
          kind: 'choice',
          q: 'Carbons get left out of skeletal drawings but heteroatoms never do. Why the difference?',
          options: [
            { t: 'Carbon is predictable, and heteroatoms are where the chemistry happens.', ok: true, why: 'That is the whole logic. You can always work a carbon out from the lines, and you would gain nothing by drawing it. A nitrogen or an oxygen you could never guess, and it is the part that reacts.' },
            { t: 'Heteroatoms are larger, so they are easier to draw.', ok: false, why: 'Size does not come into it. Oxygen is actually smaller than carbon.' },
            { t: 'There are usually more carbons than heteroatoms.', ok: false, why: 'True, but that is not the reason. Even a molecule with one carbon and six oxygens would still write the oxygens out.' },
          ],
        },
        {
          kind: 'count',
          smiles: 'CC(=O)Oc1ccccc1C(=O)O',
          render: { width: 400, height: 250 },
          q: 'This is aspirin. How many heteroatoms does it have \u2014 atoms that are neither carbon nor hydrogen?',
          answer: 4,
          right: 'Four, all of them oxygens. Everything else in the drawing is carbon or a hidden hydrogen. Those four oxygens are the whole of aspirin\u2019s chemistry.',
          wrong: 'Count only the atoms that have been given a letter, and ignore any H.',
          hints: {
            2: 'Look again at both ends of the molecule \u2014 there are two oxygens at each, not one.',
            9: 'That is the carbon count. Heteroatoms are the ones that are not carbon.',
            13: 'That is every atom that is not a hydrogen, carbons included.',
            3: 'One more. It is easy to miss a double-bonded O next to a single-bonded one.',
          },
        },
      ],
    },

    {
      id: 'rings',
      title: 'Rings, and the strange case of benzene',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('Carbon chains can join their own tails and form rings. The rules do not change: every corner is still a carbon, hidden hydrogens still fill the gaps.'));
        f.appendChild(xrayFigure('C1CCCCC1', 'Cyclohexane: six carbons in a ring, twelve hydrogens hidden.'));
        f.appendChild(p('Six-membered rings are everywhere, because six carbons make a ring with almost no strain — the angles come out close to what carbon wants anyway. Three- and four-membered rings are forced into tight angles and are correspondingly twitchy and reactive.'));
        f.appendChild(h3('Benzene'));
        f.appendChild(p('Now the famous one. Benzene is six carbons in a ring with three double bonds, alternating.'));
        f.appendChild(xrayFigure('c1ccccc1', 'Benzene. Six carbons, six hydrogens, three double bonds.'));
        f.appendChild(p('Except it is not really that. If benzene had three real double bonds and three real single bonds, the ring would be lopsided, since double bonds are shorter. Measure it and every bond is exactly the same length — partway between the two.'));
        f.appendChild(p('What is actually happening is that those electrons are not sitting in three fixed places. They are spread evenly all the way around the ring, shared by all six carbons at once. That arrangement is unusually stable, which chemists call ', term('aromatic', 'An aromatic ring is a flat ring whose electrons are spread evenly around it rather than fixed in place. The name is historical — the first ones found happened to smell strong — but it now means this specific, very stable electron arrangement.'), '.'));
        f.appendChild(p('You will see benzene drawn two ways: with alternating double bonds, or with a plain circle inside the hexagon. The circle is more honest about the physics; the double bonds are easier to count hydrogens from. This app draws the double bonds, so the counting rules keep working.'));
        return f;
      },
      quizzes: [
        {
          kind: 'count',
          smiles: 'c1ccccc1',
          q: 'How many hydrogens are on a benzene ring?',
          answer: 6,
          right: 'Six \u2014 one per carbon. Each carbon holds two ring neighbours, and one of those joins is a double bond, using three of its four hands.',
          wrong: 'Each carbon in the ring is joined to two neighbours, and one of those joins is a double bond. Work out how many hands that leaves.',
          hints: {
            12: 'That would be two hydrogens per carbon, which is cyclohexane. Benzene\u2019s double bonds each take an extra hand.',
            0: 'The carbons are not quite full: each uses three hands on the ring, leaving one for a hydrogen.',
            3: 'Every carbon in the ring gets one, not every other one. The double bonds alternate, but the hydrogens do not.',
          },
        },
        {
          kind: 'count',
          smiles: 'c1ccc2ccccc2c1',
          q: 'This is naphthalene, the smell of mothballs. How many carbons are in it?',
          answer: 10,
          right: 'Ten. Two six-membered rings sharing an edge \u2014 and the two carbons on that shared edge belong to both rings, so it is ten and not twelve.',
          wrong: 'Count the corners of both rings, and be careful with the two where the rings meet.',
          hints: {
            12: 'You have counted the shared edge twice. The two carbons where the rings join belong to both of them.',
            6: 'That is one ring. There are two here, fused along an edge.',
            8: 'Count right around the outside, then add the two carbons in the middle where the rings meet.',
          },
        },
        {
          kind: 'choice',
          q: 'Measure benzene and every bond in the ring turns out to be exactly the same length. Why?',
          options: [
            { t: 'The electrons are spread evenly around the whole ring instead of sitting in three fixed double bonds.', ok: true, why: 'Yes. That even spreading is what makes benzene unusually stable, and it is what chemists mean by aromatic. The alternating double bonds are a drawing convention, not a picture of where the electrons sit.' },
            { t: 'The double bonds swap places so fast that the lengths average out.', ok: false, why: 'A tempting picture, but no \u2014 there is nothing swapping. The electrons are genuinely spread out all the time.' },
            { t: 'Benzene has no double bonds at all.', ok: false, why: 'It has the electrons for three of them. They are just not parked in three particular places.' },
          ],
        },
      ],
    },

    {
      id: 'groups',
      title: 'Functional groups: the interesting parts',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('A long carbon chain is dull. It is greasy, it does not dissolve in water, and it barely reacts with anything. It is scaffolding.'));
        f.appendChild(p('The chemistry lives in the small clusters bolted onto that scaffolding — an oxygen here, a nitrogen there. These are ', b('functional groups'), ', and chemists recognise molecules by them the way you recognise a face by its features rather than by measuring the skull.'));
        f.appendChild(groupGallery());
        f.appendChild(p('Here is the payoff. Once you can spot these, you can predict a lot without knowing anything else about a molecule. An ', b('alcohol'), ' will dissolve in water reasonably well, because that O–H can hold hands with water molecules. A ', b('carboxylic acid'), ' will taste sour and react with baking soda. An ', b('amine'), ' will smell of fish and behave as a base.'));
        f.appendChild(fig('Aspirin, with its groups picked out. One carboxylic acid, one ester, one aromatic ring — and that is the whole molecule described.',
          highlighted('CC(=O)Oc1ccccc1C(=O)O')));
        f.appendChild(p('Every molecule page in this app highlights its functional groups like that. It is worth looking at a few and seeing the same handful of patterns turn up again and again.'));
        return f;
      },
      quizzes: [
        {
          kind: 'choice',
          q: 'A molecule contains a C=O with an O\u2013H attached to the same carbon. What is that group?',
          options: [
            { t: 'An alcohol.', ok: false, why: 'An alcohol is an O\u2013H on its own, with no C=O beside it. The double-bonded oxygen changes the behaviour completely \u2014 ethanol is not sour, vinegar is.' },
            { t: 'A carboxylic acid.', ok: true, why: 'Right. C=O plus O\u2013H on the same carbon is the acid group \u2014 the sour in vinegar, lemon juice and aspirin.' },
            { t: 'A ketone.', ok: false, why: 'A ketone is a C=O with carbons on both sides and no O\u2013H anywhere. Acetone, in nail polish remover, is the simplest one.' },
            { t: 'An ether.', ok: false, why: 'An ether is an oxygen bridging two carbons, with no double bond and no hydrogen on it.' },
          ],
        },
        {
          kind: 'choice',
          q: 'Which of these drawings is a ketone?',
          optionsBuilder() {
            return [
              { node: highlighted('CC(=O)C', 230, 140), ok: true, why: 'Yes \u2014 a C=O with a carbon on each side. This one is acetone.' },
              { node: highlighted('CC=O', 230, 140), ok: false, why: 'This C=O sits at the end of the chain, so it also carries a hydrogen. That makes it an aldehyde, not a ketone.' },
              { node: highlighted('CCO', 230, 140), ok: false, why: 'That is an O\u2013H on a carbon with no double bond \u2014 an alcohol. This one is ethanol.' },
            ];
          },
        },
        {
          kind: 'choice',
          q: 'You meet a molecule with a long carbon chain and a single \u2013COOH group on the end. What would you expect of it?',
          options: [
            { t: 'It will taste sour and react with baking soda.', ok: true, why: 'That is the payoff of learning the groups. \u2013COOH is a carboxylic acid, so it is sour and it fizzes with bicarbonate \u2014 and you knew that without being told anything else about the molecule.' },
            { t: 'It will be completely unreactive.', ok: false, why: 'The long chain is unreactive, but the group on the end is not. The interesting behaviour always lives in the group.' },
            { t: 'It will smell strongly of fish.', ok: false, why: 'That is an amine \u2014 a nitrogen with carbons on it. An acid group behaves quite differently.' },
          ],
        },
      ],
    },

    {
      id: 'caffeine',
      title: 'Capstone: reading caffeine',
      body() {
        const f = document.createDocumentFragment();
        f.appendChild(p('Time to read a real molecule with no help. This is caffeine, the reason a great many people can function before nine in the morning.'));
        f.appendChild(xrayFigure('CN1C=NC2=C1C(=O)N(C(=O)N2C)C', 'Caffeine. Slide it open and watch twenty-four atoms appear out of eight corners.'));
        f.appendChild(h3('Walk it through'));
        f.appendChild(p(b('Two rings, fused. '), 'A six-membered ring sharing an edge with a five-membered ring. That fused double ring is called a purine, and you will meet it again in DNA.'));
        f.appendChild(p(b('Four nitrogens. '), 'They are written out, because heteroatoms always are. Three of them carry a methyl group — a CH₃ shown as a short line going nowhere. That line ends in a carbon, and that carbon has three hidden hydrogens.'));
        f.appendChild(p(b('Two C=O groups. '), 'A C=O with nitrogens either side is an amide. These two, plus the ring, are what let caffeine slot neatly into the place in your brain where a molecule called adenosine normally sits.'));
        f.appendChild(p(b('No O–H anywhere. '), 'Nothing sour, nothing alcoholic. Caffeine is a fairly neutral, flat little molecule, and its flatness is exactly what lets it stack into that receptor.'));
        f.appendChild(el('div', { class: 'callout' },
          'Adenosine builds up in your brain all day and makes you feel tired. Caffeine is close enough in shape to sit in adenosine’s parking space without doing anything — so the tiredness signal never arrives. It does not give you energy. It hides the fact that you have run out.'));
        f.appendChild(p('That is the whole skill: look at a drawing, find the heteroatoms, name the groups, count the hidden hydrogens where you need them. You now know how to read essentially any organic structure you will meet.'));
        f.appendChild(p('Go and try the Draw section, or open something from the Gallery and slide its X-ray control.'));
        return f;
      },
      quizzes: [
        {
          kind: 'clickatom',
          smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
          xray: 0,
          q: 'Click any one of caffeine\u2019s four nitrogens.',
          test: (a) => a.sym === 'N',
          right: 'That is one of them. Four nitrogens, all spelled out, exactly as the heteroatom rule promises.',
          wrong: 'The nitrogens are the atoms labelled N. Every unlabelled corner is a carbon.',
        },
        {
          kind: 'count',
          smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
          render: { width: 400, height: 260 },
          q: 'How many carbons does caffeine have?',
          answer: 8,
          right: 'Eight. Five in the two rings, and three more on the ends of those short lines going nowhere \u2014 the methyl groups. Each of those three is a CH\u2083.',
          wrong: 'Count every unlabelled corner and every line end. The atoms marked N and O do not count.',
          hints: {
            5: 'You have the ring carbons. Do not forget the three short lines going nowhere \u2014 each one ends in a carbon.',
            3: 'Those are the methyl groups on their own. The two fused rings hold five carbons as well.',
            14: 'That is every heavy atom, nitrogens and oxygens included. Just the carbons this time.',
            10: 'The two atoms where the rings meet are shared, so do not count them twice. And the N and O atoms are not carbons.',
          },
        },
        {
          kind: 'choice',
          q: 'Caffeine does not give you energy. So what does it actually do?',
          options: [
            { t: 'It sits in the space where adenosine, the molecule that makes you feel tired, normally docks.', ok: true, why: 'Exactly. Caffeine is close enough in shape to occupy adenosine\u2019s parking space without doing anything, so the tiredness signal never arrives. It hides the fact that you have run out.' },
            { t: 'It burns as fuel in your muscles.', ok: false, why: 'It is not a fuel at all \u2014 you get essentially no calories from it. Its whole effect comes from its shape fitting a receptor.' },
            { t: 'It makes your body produce more sugar.', ok: false, why: 'No. The effect is about blocking a signal, not about making anything.' },
          ],
        },
      ],
    },
  ];

  /* The hands rule, shown rather than asserted: the simplest compound each
   * atom forms with hydrogen, so the count of lines is the count of hands. */
  function handsFigure() {
    const items = [
      [null, 'Hydrogen', '1 hand'],
      ['F', 'Fluorine', '1 hand'],
      ['O', 'Oxygen', '2 hands'],
      ['N', 'Nitrogen', '3 hands'],
      ['C', 'Carbon', '4 hands'],
    ];
    const grid = el('figure', { class: 'figure' });
    const row = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '10px' } });
    items.forEach(([smi, name, hands]) => {
      const cell = el('div', { style: { textAlign: 'center' } });
      const node = smi === null
        ? drawMol(hydrogenMolecule(), { xray: 1, width: 150, height: 128, maxScale: 34, interactive: false })
        : drawing(smi, { xray: 1, width: 150, height: 128, maxScale: 34, interactive: false });
      cell.appendChild(node);
      cell.appendChild(el('div', { class: 'lbl', text: name }));
      cell.appendChild(el('div', { class: 'note', style: { fontSize: '.78rem' }, text: hands }));
      row.appendChild(cell);
    });
    grid.appendChild(row);
    grid.appendChild(el('figcaption', { text: 'Each atom holding as many hydrogens as it has hands. Count the lines: one, one, two, three, four.' }));
    return grid;
  }

  /* Where the numbers come from, rather than a list to memorise. */
  function handsTable() {
    const rows = [
      ['Carbon', 'C', 4, 4],
      ['Nitrogen', 'N', 5, 3],
      ['Oxygen', 'O', 6, 2],
      ['Fluorine', 'F', 7, 1],
    ];
    const t = el('table', { class: 'lesson-table' });
    const head = el('tr');
    ['Atom', 'Electrons it brings', 'Still needs', 'Hands'].forEach((h) => head.appendChild(el('th', { text: h })));
    t.appendChild(head);
    rows.forEach(([name, sym, has, hands]) => {
      const tr = el('tr');
      tr.appendChild(el('td', {}, [el('b', { text: sym }), ' ' + name]));
      tr.appendChild(el('td', { text: String(has) }));
      tr.appendChild(el('td', { text: '8 \u2212 ' + has + ' = ' + hands }));
      tr.appendChild(el('td', {}, [el('b', { text: String(hands) })]));
      t.appendChild(tr);
    });
    const fg = el('figure', { class: 'figure' }, [t]);
    fg.appendChild(el('figcaption', { text: 'Eight minus what the atom already has. That is the whole derivation.' }));
    return fg;
  }

  /* A deliberately impossible molecule for the lesson 2 check: a carbon drawn
   * with five bonds. It has to be built by hand, because no SMILES string can
   * describe a structure that cannot exist. */
  function impossibleCarbon() {
    const M = ME.drawModel;
    const g = M.emptyGraph();
    const centre = M.addAtom(g, 0, 0, 'C');
    /* Five arms, spread out so the crowding is obvious at a glance. */
    const angles = [150, 210, 30, 330, 90];
    const arms = angles.map((deg) => {
      const a = (deg * Math.PI) / 180;
      const i = M.addAtom(g, Math.cos(a), Math.sin(a), 'C');
      M.addBond(g, centre, i, 1);
      return { i, a };
    });
    /* Extend two of them, so it reads as a molecule and not as a star. */
    [0, 1].forEach((k) => {
      const arm = arms[k];
      const a = arm.a + (k === 0 ? -0.9 : 0.9);
      const j = M.addAtom(g, g.atoms[arm.i].x + Math.cos(a), g.atoms[arm.i].y + Math.sin(a), 'C');
      M.addBond(g, arm.i, j, 1);
    });
    return M.toMolecule(g);
  }

  function groupGallery() {
    const items = [
      ['CCO', 'Alcohol', 'O–H on a carbon. Dissolves in water.'],
      ['CC(=O)O', 'Carboxylic acid', 'C=O plus O–H. Sour.'],
      ['CCN', 'Amine', 'Nitrogen with carbons. Basic, often smelly.'],
      ['CC(=O)C', 'Ketone', 'C=O with carbons both sides.'],
      ['CC=O', 'Aldehyde', 'C=O at the end of a chain.'],
      ['CC(=O)OC', 'Ester', 'Acid with the H swapped for a carbon. Fruity.'],
    ];
    const grid = el('div', { class: 'figure', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px' } });
    items.forEach(([smi, name, note]) => {
      const cell = el('div', { style: { textAlign: 'center' } });
      cell.appendChild(highlighted(smi, 150, 110));
      cell.appendChild(el('div', { class: 'lbl', text: name }));
      cell.appendChild(el('div', { class: 'note', style: { fontSize: '.78rem' }, text: note }));
      grid.appendChild(cell);
    });
    return grid;
  }

  function highlighted(smiles, w, h) {
    const mol = molOf(smiles);
    let groups = [];
    try { groups = ME.chem.findGroups(mol); } catch (e) { groups = []; }
    return ME.render2d.render(mol, {
      xray: 0, width: w || 400, height: h || 240, interactive: false,
      highlight: groups.map((g) => ({ atoms: g.atoms, color: g.color })),
    });
  }

  /* --------------------------------------------------------- quiz render */
  /* Each lesson carries a short set of questions rather than a single one.
   *
   * A wrong answer is never just "no". It says what was actually chosen, why
   * that is not the answer, and leaves the question open to try again, because
   * the point is to make the rule stick rather than to score anybody. */

  function questionsOf(lesson) {
    return lesson.quizzes || (lesson.quiz ? [lesson.quiz] : []);
  }

  /* Small numbers read better as words in a sentence. */
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const spell = (n) => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));
  const plural = (n, word) => spell(n) + ' ' + word + (n === 1 ? '' : 's');

  /* What did they actually click? Said back to them in the lesson's own terms. */
  function describeClick(a) {
    if (a.sym !== 'C') {
      const h = a.hydrogens ? ', holding ' + plural(a.hydrogens, 'hydrogen') : '';
      return 'That is the ' + ME.chem.elementName(a.sym).toLowerCase() + h + '. ';
    }
    const lines = plural(a.bondCount, 'line');
    if (a.hydrogens === 0) {
      return 'That carbon has ' + lines + ' meeting it, so all four of its hands are used and it has no hydrogens. ';
    }
    return 'That carbon has ' + lines + ' meeting it, so it is carrying ' +
      plural(a.hydrogens, 'hidden hydrogen') + '. ';
  }

  function buildQuizBlock(lesson, passed, onPass) {
    const qs = questionsOf(lesson);
    const box = el('div', { class: 'quiz' });

    const head = el('h3');
    head.appendChild(ME.icon('check'));
    head.appendChild(document.createTextNode(qs.length > 1 ? 'Quick check' : 'Quick check'));
    const tally = el('span', { class: 'quiz-tally' });
    head.appendChild(tally);
    box.appendChild(head);

    if (qs.length > 1) {
      box.appendChild(el('p', { class: 'note quiz-intro' },
        'Get one wrong and it will explain why before letting you try again.'));
    }

    function syncTally() {
      tally.textContent = passed.size + ' / ' + qs.length;
      tally.classList.toggle('all', passed.size === qs.length);
    }

    qs.forEach((q, i) => {
      box.appendChild(buildQuestion(q, i, qs.length, passed.has(i), () => {
        if (passed.has(i)) return;
        passed.add(i);
        syncTally();
        onPass(i);
      }));
    });
    syncTally();
    return box;
  }

  function buildQuestion(q, index, total, alreadyPassed, onSolved) {
    const item = el('div', { class: 'quiz-item' + (alreadyPassed ? ' solved' : '') });
    const numBadge = total > 1
      ? el('span', { class: 'quiz-num', text: alreadyPassed ? '\u2713' : String(index + 1) })
      : null;
    if (numBadge) item.appendChild(numBadge);

    const body = el('div', { class: 'quiz-body' });
    item.appendChild(body);
    body.appendChild(el('div', { class: 'quiz-q', text: q.q }));

    const feedback = el('div', { class: 'quiz-feedback' });

    let solved = alreadyPassed;
    function say(ok, message) {
      feedback.classList.add('show');
      ME.clear(feedback);
      feedback.appendChild(el('div', { class: 'callout ' + (ok ? 'ok' : 'warn'), text: message }));
      if (ok && !solved) {
        solved = true;
        item.classList.add('solved');
        if (numBadge) numBadge.textContent = '\u2713';
        onSolved();
      }
    }

    if (q.kind === 'choice') buildChoice(q, body, say);
    else if (q.kind === 'count') buildCount(q, body, say);
    else if (q.kind === 'clickatom') buildClickAtom(q, body, say);

    if (q.note) body.appendChild(el('p', { class: 'note quiz-hint', text: q.note }));
    body.appendChild(feedback);
    return item;
  }

  /* ---- pick one of several answers ---- */
  function buildChoice(q, body, say) {
    const opts = q.optionsBuilder ? q.optionsBuilder() : q.options;
    const list = el('div', { class: 'quiz-opts' });
    const buttons = [];
    opts.forEach((o, i) => {
      const btn = el('button', { class: 'quiz-opt' });
      if (o.node) btn.appendChild(o.node); else btn.textContent = o.t;
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        if (o.ok) {
          buttons.forEach((x) => { x.disabled = true; });
          btn.classList.add('right');
          say(true, o.why);
        } else {
          /* Rule out just this one and explain it, so the question stays open. */
          btn.classList.add('wrong');
          btn.disabled = true;
          say(false, o.why);
          const left = buttons.filter((x) => !x.disabled);
          if (left.length === 1) {
            const correct = opts.findIndex((x) => x.ok);
            buttons[correct].classList.add('right');
          }
        }
      });
      buttons.push(btn);
      list.appendChild(btn);
    });
    body.appendChild(list);
  }

  /* ---- type a number ---- */
  function buildCount(q, body, say) {
    if (q.smiles) body.appendChild(drawing(q.smiles, Object.assign({ xray: 0, width: 360, height: 220 }, q.render || {})));
    const row = el('div', { class: 'quiz-count' });
    const input = el('input', { type: 'number', min: '0', 'aria-label': 'Your answer' });
    const go = el('button', { class: 'btn btn-primary btn-sm', text: 'Check' });
    const submit = () => {
      const v = parseInt(input.value, 10);
      if (isNaN(v)) return;
      if (v === q.answer) { say(true, q.right); return; }
      /* Explain the specific mistake where we can name it, and otherwise at
       * least say which way they are out. Never hand over the number. */
      const named = q.hints && q.hints[v];
      const direction = v < q.answer ? 'Too few. ' : 'Too many. ';
      say(false, direction + (named || q.wrong));
    };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') submit(); });
    row.appendChild(input);
    row.appendChild(go);
    body.appendChild(row);
  }

  /* ---- click the right atom in a drawing ---- */
  function buildClickAtom(q, body, say) {
    const mol = q.mol ? q.mol() : molOf(q.smiles);
    const info = ME.render2d.describe(mol, {});
    const holder = el('div', { class: 'clickmol' });
    holder.appendChild(ME.render2d.render(mol, {
      xray: q.xray || 0, width: q.width || 440, height: q.height || 290,
      onAtomClick(i, atom) {
        /* Still answers after it has been got right, so the drawing stays
         * something you can poke at; it just will not be counted twice. */
        const enriched = Object.assign({}, atom, { bondCount: info.atoms[i].bonds.length });
        if (q.test(enriched)) say(true, q.right);
        else say(false, describeClick(enriched) + q.wrong);
      },
    }));
    body.appendChild(holder);
    body.appendChild(el('p', { class: 'note', text: 'Click an atom in the drawing above.' }));
  }

  /* -------------------------------------------------------------- view */
  const St = { built: false, index: 0, done: {}, navNode: null, bodyNode: null, barNode: null };

  /* Progress is kept between visits by default, but that is the reader's call.
   * With remembering switched off nothing is written at all and the answers
   * live only in this tab, so reloading starts the questions over. */
  function remembering() { return ME.store.get('remember', true) !== false; }

  function loadProgress() {
    St.done = remembering() ? (ME.store.get('lessons', {}) || {}) : {};
  }
  function saveProgress() {
    if (remembering()) ME.store.set('lessons', St.done);
  }
  function forgetStored() {
    ME.store.remove('lessons');
    ME.store.remove('lessonIndex');
  }

  /* Wipe the answers and put every question back on the board. */
  function resetProgress() {
    St.done = {};
    forgetStored();
    showLesson(St.index);
    syncNav();
  }

  function setRemember(on) {
    ME.store.set('remember', !!on);
    /* Switching it off should not leave yesterday's answers sitting on disk. */
    if (!on) forgetStored();
    else saveProgress();
  }

  /* Which questions of a lesson have been answered. Progress used to be a
   * single true/false per lesson, so an old saved value is read as "all of
   * them" rather than throwing the reader's progress away. */
  function passedFor(lesson) {
    const total = questionsOf(lesson).length;
    const v = St.done[lesson.id];
    if (v === true) return new Set(Array.from({ length: total }, (_, i) => i));
    if (Array.isArray(v)) return new Set(v.filter((i) => i < total));
    return new Set();
  }
  function totalQuestions() {
    return LESSONS.reduce((n, l) => n + questionsOf(l).length, 0);
  }
  function totalPassed() {
    return LESSONS.reduce((n, l) => n + passedFor(l).size, 0);
  }
  function lessonComplete(lesson) {
    const total = questionsOf(lesson).length;
    return total > 0 && passedFor(lesson).size === total;
  }

  function build(host) {
    loadProgress();
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Learn' }));
    wrap.appendChild(el('p', { class: 'note', style: { maxWidth: '64ch', marginBottom: '18px' } },
      'Eleven short lessons. Start at the top; each one assumes the one before it. Each ends with a few questions, and a wrong answer explains itself rather than just marking you down.'));

    const prog = el('div', { class: 'progress-wrap' });
    St.barNode = el('i');
    prog.appendChild(el('div', { class: 'progress-bar' }, [St.barNode]));

    const row = el('div', { class: 'progress-row' });
    St.progText = el('div', { class: 'note', style: { fontSize: '.8rem' } });
    row.appendChild(St.progText);
    row.appendChild(buildProgressControls());
    prog.appendChild(row);
    wrap.appendChild(prog);

    const layout = el('div', { class: 'learn-layout' });
    St.navNode = el('nav', { class: 'lesson-nav', 'aria-label': 'Lessons' });
    St.bodyNode = el('div');
    layout.appendChild(St.navNode);
    layout.appendChild(St.bodyNode);
    wrap.appendChild(layout);
    host.appendChild(wrap);

    LESSONS.forEach((l, i) => {
      const link = el('button', { class: 'lesson-link' });
      link.appendChild(el('span', { class: 'lesson-num', text: String(i + 1) }));
      link.appendChild(el('span', { text: l.title }));
      link.addEventListener('click', () => showLesson(i));
      St.navNode.appendChild(link);
    });

    St.built = true;
    const saved = remembering() ? ME.store.get('lessonIndex', 0) : 0;
    showLesson(Math.min(LESSONS.length - 1, Math.max(0, saved)));
  }

  function buildProgressControls() {
    const box = el('div', { class: 'progress-controls' });

    const remember = el('label', { class: 'switch', title: 'Turn this off and your answers are forgotten as soon as you reload' });
    const cb = el('input', { type: 'checkbox' });
    cb.checked = remembering();
    cb.addEventListener('change', () => {
      setRemember(cb.checked);
      ME.toast(cb.checked
        ? 'Your progress will be remembered on this device'
        : 'Progress will not be saved \u2014 reloading starts you fresh');
    });
    remember.appendChild(cb);
    remember.appendChild(el('span', { text: 'Remember my progress' }));
    box.appendChild(remember);

    /* Two taps rather than a dialog: the first asks, the second does it. */
    let armed = null;
    const reset = el('button', { class: 'btn btn-sm', text: 'Reset answers' });
    const disarm = () => {
      clearTimeout(armed); armed = null;
      reset.textContent = 'Reset answers';
      reset.classList.remove('btn-primary');
    };
    reset.addEventListener('click', () => {
      if (!armed) {
        reset.textContent = 'Reset \u2014 sure?';
        reset.classList.add('btn-primary');
        armed = setTimeout(disarm, 4000);
        return;
      }
      disarm();
      resetProgress();
      ME.toast('All 33 questions are open again');
    });
    box.appendChild(reset);
    return box;
  }

  function syncNav() {
    ME.$$('.lesson-link', St.navNode).forEach((link, i) => {
      link.classList.toggle('on', i === St.index);
      link.classList.toggle('done', lessonComplete(LESSONS[i]));
    });
    const n = totalPassed();
    const total = totalQuestions();
    St.barNode.style.width = Math.round((n / total) * 100) + '%';
    St.progText.textContent = `${n} of ${total} questions answered`;
  }

  function showLesson(i) {
    St.index = i;
    if (remembering()) ME.store.set('lessonIndex', i);
    const lesson = LESSONS[i];
    ME.clear(St.bodyNode);

    const art = el('article', { class: 'lesson' });
    art.appendChild(el('div', { class: 'note', style: { fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: '700' }, text: `Lesson ${i + 1} of ${LESSONS.length}` }));
    art.appendChild(el('h2', { text: lesson.title }));
    const body = el('div', { class: 'lesson-body' });
    body.appendChild(lesson.body());
    art.appendChild(body);

    const passed = passedFor(lesson);
    art.appendChild(buildQuizBlock(lesson, passed, () => {
      St.done[lesson.id] = Array.from(passed).sort((a, b) => a - b);
      saveProgress();
      syncNav();
    }));

    const foot = el('div', { class: 'lesson-foot' });
    if (i > 0) {
      const prev = el('button', { class: 'btn' }, [ME.icon('back'), LESSONS[i - 1].title]);
      prev.addEventListener('click', () => { showLesson(i - 1); scrollUp(); });
      foot.appendChild(prev);
    } else foot.appendChild(el('span'));
    if (i < LESSONS.length - 1) {
      const next = el('button', { class: 'btn btn-primary' }, [LESSONS[i + 1].title, ME.icon('chevron')]);
      next.addEventListener('click', () => { showLesson(i + 1); scrollUp(); });
      foot.appendChild(next);
    }
    art.appendChild(foot);

    St.bodyNode.appendChild(art);
    ME.bindTips(art);
    syncNav();
  }

  function scrollUp() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function ensureBuilt(host) { if (!St.built) build(host); }

  ME.learn = { ensureBuilt, LESSONS, resetProgress, setRemember, remembering };
})();
