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
      id: 'unsaturation',
      title: 'Degrees of unsaturation',
      body() {
        const f = document.createDocumentFragment();

        f.appendChild(p('The first lesson said a formula tells you almost nothing. That was nearly true — but there is exactly one useful thing you can squeeze out of a bare formula, and it is the first thing a chemist does when an unknown substance comes back from the machine with nothing but a headcount attached.'));
        f.appendChild(p('You can work out ', b('how many rings and double bonds it must contain'), ', without seeing the structure at all. Here is why that is possible.'));

        f.appendChild(h3('How many hydrogens should a molecule have?'));
        f.appendChild(p('Lay some carbons out in a plain row and fill every spare hand with a hydrogen. The two carbons on the ends spend one hand each holding their single neighbour, so they take three hydrogens. Every carbon in the middle spends two hands on its two neighbours, so it takes two.'));
        f.appendChild(alkaneSeries());
        f.appendChild(p('Three and eight. Four and ten. Five and twelve. The pattern is ', b('2 × carbons + 2'), ', and the two extra are the pair of end carbons each getting a third hydrogen instead of a neighbour.'));
        f.appendChild(p('Branching does not change it. Bend the chain, hang a carbon off the side, rearrange it however you like — as long as every carbon still has four single bonds, the hydrogen count comes out the same. A molecule carrying this maximum is ', term('saturated', 'Saturated means the molecule is holding as many hydrogens as it possibly can. There is no room for more, so there is nothing for it to add on to.'), ': full up, with no room for more.'));

        f.appendChild(h3('What a ring or a double bond costs'));
        f.appendChild(p('Now take butane, C₄H₁₀, and do something to it.'));
        f.appendChild(p('Bend it round and join the two ends together. Each end carbon has to free up a hand to hold the other, and a hand that was holding a hydrogen is now holding a carbon. ', b('Two hydrogens gone.')));
        f.appendChild(p('Or leave it straight and make one of the joins a double bond instead. Both carbons at that join give up a hand to the extra shared pair. ', b('Two hydrogens gone.')));
        f.appendChild(unsaturationCost());
        f.appendChild(p('That is the key: a ring and a double bond cost exactly the same thing. From the formula alone they are indistinguishable, which is why the count you are about to meet is sometimes called ', b('double bond equivalents'), ' — it lumps them together on purpose, because a formula genuinely cannot tell them apart.'));

        f.appendChild(h3('The count itself'));
        f.appendChild(p('So: work out how many hydrogens the molecule ', el('em', { text: 'should' }), ' have if it were saturated, subtract how many it ', el('em', { text: 'actually' }), ' has, and halve the difference. Each missing pair is one ring or one double bond.'));
        f.appendChild(p('That number is the ', b('degree of unsaturation'), '. For a molecule of nothing but carbon and hydrogen:'));
        f.appendChild(equation('Degrees of unsaturation', '2C + 2 − H', '2'));
        f.appendChild(p('Try it on benzene, C₆H₆. Six saturated carbons would carry 14 hydrogens; benzene has 6, so it is 8 short, and 8 ÷ 2 = ', b('4'), '. Look at the drawing and there they are: one ring plus three double bonds. A benzene ring is worth four degrees all by itself, which is why an unknown that comes out at four or more is the classic hint that there is a benzene ring hiding in it.'));
        f.appendChild(el('div', { class: 'callout' }, [
          b('A triple bond counts as two. '),
          'It is two shared pairs beyond a single bond, so it costs four hydrogens rather than two. And a ', b('C=O'), ' counts just like any other double bond — people forget that one constantly.',
        ]));

        f.appendChild(h3('What about the other atoms?'));
        f.appendChild(p('Real molecules have oxygens and nitrogens and the odd chlorine in them. Each one either changes the expected hydrogen count or it does not, and which it does follows straight from how many hands it has.'));
        f.appendChild(p(b('Oxygen: ignore it. '), 'Oxygen has two hands, and a spot in the middle of a chain needs exactly two. Drop an oxygen into ethane and you get ethanol: one bond broken, two made, and not a single hydrogen gained or lost. C₂H₆ becomes C₂H₆O — look at the hydrogens, they did not move.'));
        f.appendChild(oxygenFigure());
        f.appendChild(p(b('Halogens: subtract them, like hydrogens. '), 'Fluorine, chlorine, bromine and iodine have one hand each, exactly like a hydrogen, and they sit in exactly the places a hydrogen would. A chlorine is a hydrogen in a heavy coat, so count it as one.'));
        f.appendChild(p(b('Nitrogen: add it. '), 'Nitrogen has three hands. Passing a chain through it only uses two, so the spare hand takes a hydrogen the chain would not otherwise have had. Every nitrogen raises the expected count by one.'));
        f.appendChild(p(b('Phosphorus: add it too, like a nitrogen. '), 'Phosphorus sits directly under nitrogen in the periodic table, and it inherits the same three hands. So it behaves the same way in the count: two hands to pass the chain through, one spare to hold an extra hydrogen, and therefore ', b('+1'), ' apiece — exactly the nitrogen rule, applied to a bigger atom.'));
        f.appendChild(strip('Triphenylphosphine, a phosphorus holding three benzene rings. (2×18 + 2 + 1 − 15) ÷ 2 = 12 — and three benzene rings at four degrees each is twelve.', [
          ['P(c1ccccc1)(c1ccccc1)c1ccccc1', 'Triphenylphosphine', 'C₁₈H₁₅P · 12 degrees'],
        ], { width: 320, height: 230 }));
        f.appendChild(unsatTable());
        f.appendChild(p('Put all of that together and you have the full formula, which is the only thing in this lesson worth committing to memory:'));
        f.appendChild(equation('Degrees of unsaturation', '2C + 2 + N + P − H − X', '2'));
        f.appendChild(p('C is carbons, H is hydrogens, N is nitrogens, P is phosphorus, X is halogens, and oxygen — along with sulfur, which also has two hands — simply does not appear. Nitrogen and phosphorus share a column of the periodic table, so it is no coincidence that they share a term; you are really only learning one rule there, not two.'));
        f.appendChild(h3('The one place phosphorus misbehaves'));
        f.appendChild(p('Phosphorus has a second setting. Unlike nitrogen it can open up and hold ', b('five'), ' things at once, which is exactly what it does in a phosphate — the group that holds DNA together and carries energy around your cells as ATP.'));
        f.appendChild(strip('Phosphoric acid. The three-hand rule predicts 0 degrees; the drawing plainly has one, the P=O.', [
          ['OP(=O)(O)O', 'Phosphoric acid', 'H₃PO₄ · predicted 0, actually 1'],
        ], { xray: 1, width: 300, height: 220 }));
        f.appendChild(p('Run the numbers on H₃PO₄: no carbons, three hydrogens, one phosphorus, and the oxygens are ignored. (0 + 2 + 1 − 3) ÷ 2 = ', b('0'), '. But look at the drawing — there is a P=O sitting right there, which is a double bond, which ought to be one degree. The rule has come up short.'));
        f.appendChild(el('div', { class: 'callout warn' }, [
          b('So: expect a phosphate to read one degree low for each P=O. '),
          'The three-hand rule assumes phosphorus behaves like nitrogen, and a five-bonded phosphorus does not. Some chemists dodge this by drawing the group as P⁺–O⁻ instead of P=O, which has no double bond and puts the count back in agreement — the same molecule, two honest drawings, and the arithmetic follows whichever one you picked. This is a real rough edge, not something this app is glossing over: when a phosphorus turns up, look at the drawing before you trust the number.',
        ]));

        f.appendChild(h3('Worked through: caffeine'));
        f.appendChild(p('Caffeine is C₈H₁₀N₄O₂. Eight carbons, ten hydrogens, four nitrogens, two oxygens we throw away, no halogens.'));
        f.appendChild(equation('Caffeine', '2×8 + 2 + 4 − 10', '2', '= 6'));
        f.appendChild(p('Six. Now check it against the real thing, because a rule you cannot check is a rule you cannot trust:'));
        f.appendChild(xrayFigure('CN1C=NC2=C1C(=O)N(C(=O)N2C)C', 'Caffeine: two rings, two C=O double bonds and two more double bonds inside the rings. Two plus four is six — exactly what the formula predicted.'));
        f.appendChild(p('The arithmetic knew there were six rings-and-double-bonds in there before anyone drew anything.'));

        f.appendChild(h3('What it is good for, and what it is not'));
        f.appendChild(p('A degree count of ', b('0'), ' is the strongest result you can get: no rings, no double bonds, no triple bonds, nothing. The molecule is a plain saturated skeleton, and there is very little it can be.'));
        f.appendChild(p('Anything above zero narrows things down rather than settling them. The count tells you ', b('how many'), '. It never tells you ', b('which'), ', and it never tells you ', b('where'), '. Four degrees might be a benzene ring, or two rings and two double bonds, or four separate C=O groups scattered about.'));
        f.appendChild(el('div', { class: 'callout warn' }, [
          b('Two conditions. '),
          'The molecule has to be neutral — charges and lone ions break the hand-counting the whole derivation rests on — and the formula has to be right. A half-integer answer, like 3.5, is not a strange molecule. It is a wrong formula, and that is genuinely useful: the count catches typos.',
        ]));
        f.appendChild(p('You will meet this under other names, all of them the same arithmetic: ', el('em', { text: 'index of hydrogen deficiency' }), ', ', el('em', { text: 'double bond equivalents' }), ', ', el('em', { text: 'rings plus π bonds' }), '.'));
        return f;
      },
      quizzes: [
        {
          kind: 'count',
          q: 'A compound has the formula C₆H₁₀. How many degrees of unsaturation does it have?',
          answer: 2,
          right: 'Two. Six saturated carbons would carry 2×6 + 2 = 14 hydrogens, this one has 10, so it is four short — and four missing hydrogens is two degrees. Two rings, two double bonds, one of each, or a single triple bond: the formula cannot tell you which, only that there are two.',
          wrong: 'Work out how many hydrogens six saturated carbons would carry, subtract the 10 this molecule actually has, and halve what is left.',
          hints: {
            4: 'That is the number of missing hydrogens, not the number of degrees. Each ring or double bond costs two of them, so halve it.',
            1: 'One degree would mean 12 hydrogens. This one has 10, so there is something else to account for as well.',
            0: 'Zero would mean it is saturated, and six saturated carbons carry 14 hydrogens. This molecule has only 10.',
            14: 'That is how many hydrogens a saturated six-carbon molecule would have. The degrees come from the shortfall, not from the baseline itself.',
            12: 'That is the hydrogen count you would expect for one degree, rather than a count of degrees.',
          },
        },
        {
          kind: 'choice',
          q: 'Chloroethane is C₂H₅Cl. A chlorine has one hand, exactly like a hydrogen. So what do you do with it?',
          options: [
            { t: 'Subtract it, exactly as you would a hydrogen.', ok: true, why: 'Right — a one-handed atom fills a slot a hydrogen would have filled, so it counts as one. That gives (2×2 + 2 − 5 − 1) ÷ 2 = 0, and chloroethane is indeed a plain saturated molecule with no rings and no double bonds.' },
            { t: 'Add it, as you would a nitrogen.', ok: false, why: 'Nitrogen is added because it has three hands — one more than a chain needs to pass through it — so it makes room for an extra hydrogen. A halogen does the opposite: it takes a slot rather than creating one.' },
            { t: 'Ignore it, as you would an oxygen.', ok: false, why: 'Oxygen is ignored because its two hands are exactly what a place in a chain needs, so it changes nothing. A chlorine has one hand, not two, so it cannot sit in a chain at all — it hangs off the end like a hydrogen.' },
            { t: 'Count it as a carbon, since it is a heavy atom.', ok: false, why: 'Weight has nothing to do with it. All that matters is how many hands the atom has, and chlorine has one.' },
          ],
        },
        {
          kind: 'count',
          smiles: 'CN1CCCC1c1cccnc1',
          render: { width: 400, height: 250 },
          q: 'Nicotine is C₁₀H₁₄N₂. How many degrees of unsaturation does it have?',
          answer: 5,
          right: 'Five. (2×10 + 2 + 2 − 14) ÷ 2 = 10 ÷ 2 = 5 — and the drawing agrees. The six-membered ring is aromatic, which is one ring plus three double bonds, so four; the five-membered ring adds the fifth.',
          wrong: 'Ten carbons, fourteen hydrogens, two nitrogens, no halogens and no oxygens to worry about. Remember that each nitrogen is added, not subtracted.',
          hints: {
            4: 'You have left the nitrogens out. Each one has three hands, so it makes room for one extra hydrogen and adds 1 to the top of the fraction.',
            3: 'You have subtracted the nitrogens instead of adding them. Nitrogen makes room for a hydrogen, so it goes on the same side as the carbons; halogens are the ones you subtract.',
            10: 'That is the top of the fraction, before halving. Each ring or double bond costs two hydrogens.',
            6: 'Check the arithmetic: 2×10 + 2 + 2 − 14 comes to 10, and half of 10 is 5.',
            9: 'That is roughly the count of every ring and double bond counted twice somewhere. Work the formula instead: 2C + 2 + N + P − H − X, all over 2.',
          },
        },
        {
          kind: 'choice',
          q: 'Phosphoric acid is H₃PO₄. The formula gives (0 + 2 + 1 − 3) ÷ 2 = 0 degrees, but the usual drawing of it clearly contains a P=O double bond. What has gone wrong?',
          options: [
            { t: 'Nothing is wrong with the arithmetic — the rule assumes phosphorus has three hands, and this one is using five.', ok: true, why: 'Exactly right, and worth remembering. The +1 for phosphorus comes from it sitting under nitrogen with three hands. A phosphate opens up to five bonds, which the rule was never built for, so the count reads one low for every P=O. Draw the same group as P⁺–O⁻ instead and the count agrees again.' },
            { t: 'The formula H₃PO₄ must be wrong.', ok: false, why: 'It is right — phosphoric acid really is H₃PO₄. A wrong formula usually announces itself with a half-integer answer like 3.5, and this one came out as a clean whole number.' },
            { t: 'Oxygen should have been counted after all.', ok: false, why: 'No — oxygen genuinely has two hands and genuinely changes nothing, in a phosphate as anywhere else. The odd one out here is the phosphorus.' },
            { t: 'A P=O does not count as a degree of unsaturation.', ok: false, why: 'It is a double bond like any other, and it counts. The problem is on the prediction side, not the counting side.' },
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

  /* A row of small drawings with a caption under each, which the unsaturation
   * lesson leans on repeatedly to show a formula changing. */
  function strip(caption, items, opts) {
    const row = el('div', { class: 'figure-2up', style: { gridTemplateColumns: 'repeat(' + items.length + ', 1fr)' } });
    items.forEach(([smi, name, sub]) => {
      const cell = el('div', {});
      cell.appendChild(drawing(smi, Object.assign({ xray: 0, width: 200, height: 150, interactive: false }, opts || {})));
      cell.appendChild(el('div', { class: 'lbl', text: name }));
      if (sub) cell.appendChild(el('div', { class: 'note', style: { fontSize: '.78rem' }, text: sub }));
      row.appendChild(cell);
    });
    return fig(caption, row);
  }

  /* Saturated chains, so the 2n + 2 pattern can be read off rather than
   * asserted. Drawn skeletally on purpose: the hydrogens are hidden, and
   * working them out is the skill the previous lessons just taught. */
  function alkaneSeries() {
    return strip('Every hydrogen here is hidden. Count the hands at each corner and they come to eight, ten and twelve.', [
      ['CCC', 'Propane', 'C₃H₈'],
      ['CCCC', 'Butane', 'C₄H₁₀'],
      ['CCCCC', 'Pentane', 'C₅H₁₂'],
    ]);
  }

  /* One ring and one double bond, side by side with the chain they came from,
   * both landing on the same formula. */
  function unsaturationCost() {
    return strip('Two different things done to butane, and the same two hydrogens lost either way. The last two share a formula and share a degree count — one each.', [
      ['CCCC', 'Butane', 'C₄H₁₀ · 0 degrees'],
      ['C=CCC', 'But-1-ene', 'C₄H₈ · 1 degree'],
      ['C1CCC1', 'Cyclobutane', 'C₄H₈ · 1 degree'],
    ]);
  }

  /* Why oxygen drops out of the formula: it slots in without disturbing the
   * hydrogens, so the two structures below have the same H count. */
  function oxygenFigure() {
    return strip('An oxygen dropped into the middle of ethane. Six hydrogens before, six after — so oxygen never appears in the count at all.', [
      ['CC', 'Ethane', 'C₂H₆ · 0 degrees'],
      ['CCO', 'Ethanol', 'C₂H₆O · 0 degrees'],
      ['COC', 'Dimethyl ether', 'C₂H₆O · 0 degrees'],
    ], { xray: 1 });
  }

  /* A displayed equation, set as a real fraction, because the halving is the
   * step people drop. `tail` carries the worked-out answer when there is one. */
  function equation(lhs, num, den, tail) {
    const kids = [
      el('span', { text: lhs }),
      el('span', { text: '=' }),
      el('span', { class: 'frac' }, [
        el('span', { class: 'num', text: num }),
        el('span', { class: 'den', text: den }),
      ]),
    ];
    if (tail) kids.push(el('span', { class: 'eq-tail', text: tail }));
    return el('figure', { class: 'figure' }, [el('div', { class: 'equation' }, kids)]);
  }

  /* Each atom's effect on the count, derived from its hands rather than listed
   * as four things to memorise. */
  function unsatTable() {
    const rows = [
      ['C', 'Carbon', '4', 'Adds 2', 'Two more hands than a place in a chain needs'],
      ['N', 'Nitrogen', '3', 'Adds 1', 'One spare hand, so room for one extra hydrogen'],
      ['P', 'Phosphorus', '3', 'Adds 1', 'Sits under nitrogen, so it inherits the same three hands'],
      ['O', 'Oxygen', '2', 'Nothing', 'Exactly the two hands a place in a chain needs'],
      ['X', 'F, Cl, Br, I', '1', 'Takes 1', 'One hand, so it fills a hydrogen’s slot'],
      ['H', 'Hydrogen', '1', 'Takes 1', 'The thing being counted'],
    ];
    const cols = ['Atom', 'Hands', 'Effect on the count', 'Why'];
    const t = el('table', { class: 'lesson-table reasons' });
    const head = el('tr');
    cols.forEach((h) => head.appendChild(el('th', { text: h })));
    t.appendChild(head);
    rows.forEach(([sym, name, hands, effect, why]) => {
      const tr = el('tr');
      /* The label rides along on each cell so the phone layout, which stacks
       * the row and drops the header, can still say what each line is. */
      tr.appendChild(el('td', { 'data-label': cols[0] }, [el('b', { text: sym }), ' ' + name]));
      tr.appendChild(el('td', { 'data-label': cols[1], text: hands }));
      tr.appendChild(el('td', { 'data-label': cols[2] }, [el('b', { text: effect })]));
      tr.appendChild(el('td', { 'data-label': cols[3], text: why }));
      t.appendChild(tr);
    });
    const fg = el('figure', { class: 'figure' }, [t]);
    fg.appendChild(el('figcaption', { text: 'Every line of this follows from the hands rule in lesson 2. Nothing here is a separate fact.' }));
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

  /* ------------------------------------------------- register as a unit */
  /* The twelve lessons above are the reading-structures half of the organic
   * unit. They register themselves like every other unit, so the course map
   * does not need to know that they were written first and in a different
   * format. */
  ME.course.unit({
    n: 15, id: 'organic-reading',
    title: 'Organic chemistry: reading structures',
    blurb: 'How chemists actually draw molecules, and how to read a drawing at a glance. Start here if you want to understand the pictures.',
    lessons: LESSONS,
  });

  /* ------------------------------------------------------------- progress */
  const St = {
    built: false, host: null, view: null, done: {}, current: null,
  };

  function remembering() { return ME.store.get('remember', true) !== false; }
  function loadProgress() { St.done = remembering() ? (ME.store.get('lessons', {}) || {}) : {}; }
  function saveProgress() { if (remembering()) ME.store.set('lessons', St.done); }
  function forgetStored() {
    ME.store.remove('lessons');
    ME.store.remove('lessonIndex');
    ME.store.remove('lastLesson');
  }
  function resetProgress() {
    St.done = {};
    forgetStored();
    if (St.current) showLesson(St.current.id); else showMap();
  }
  function setRemember(on) {
    ME.store.set('remember', !!on);
    if (!on) forgetStored(); else saveProgress();
  }

  /* Which questions of a lesson have been answered. An old saved value of
   * `true` meant "all of them", so it is read that way rather than throwing
   * somebody's progress away. */
  function passedFor(l) {
    const total = ME.course.questionsOf(l).length;
    const v = St.done[l.id];
    if (v === true) return new Set(Array.from({ length: total }, (_, i) => i));
    if (Array.isArray(v)) return new Set(v.filter((i) => i < total));
    return new Set();
  }
  const lessonComplete = (l) => {
    const t = ME.course.questionsOf(l).length;
    return t > 0 && passedFor(l).size === t;
  };
  function unitProgress(u) {
    let done = 0, total = 0;
    u.lessons.forEach((l) => {
      total += ME.course.questionsOf(l).length;
      done += passedFor(l).size;
    });
    return { done: done, total: total, lessons: u.lessons.filter(lessonComplete).length,
      minutes: u.lessons.reduce((n, l) => n + ME.course.minutesOf(l), 0) };
  }
  function courseProgress() {
    let done = 0, total = 0;
    ME.course.units.forEach((u) => {
      const p = unitProgress(u);
      done += p.done; total += p.total;
    });
    return { done: done, total: total };
  }

  /* ------------------------------------------------------------ the shell */
  function build(host) {
    St.host = host;
    loadProgress();
    St.view = el('div');
    host.appendChild(St.view);
    St.built = true;
  }

  function ensureBuilt(host) { if (!St.built) build(host); }

  /* --------------------------------------------------------- course map */
  function showMap() {
    St.current = null;
    ME.clear(St.view);
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Learn' }));

    const units = ME.course.units;
    const lessons = ME.course.allLessons();
    const prog = courseProgress();
    const totalMins = lessons.reduce((n, l) => n + ME.course.minutesOf(l), 0);

    wrap.appendChild(el('p', { class: 'note cm-intro' },
      'A chemistry course from the very beginning. ' + units.length + ' units, ' + lessons.length +
      ' lessons, about ' + Math.round(totalMins / 60) + ' hours of reading if you do all of it. ' +
      'Nothing assumes you have done chemistry before. Each lesson says which earlier ones it leans on, ' +
      'but nothing is locked — go wherever you like.'));

    /* overall progress and the resume button */
    const top = el('div', { class: 'cm-top' });
    const bar = el('div', { class: 'progress-wrap' });
    const fill = el('i');
    fill.style.width = (prog.total ? Math.round((prog.done / prog.total) * 100) : 0) + '%';
    bar.appendChild(el('div', { class: 'progress-bar' }, [fill]));
    const row = el('div', { class: 'progress-row' });
    row.appendChild(el('div', { class: 'note', style: { fontSize: '.8rem' },
      text: prog.done + ' of ' + prog.total + ' questions answered' }));
    row.appendChild(buildProgressControls());
    bar.appendChild(row);
    top.appendChild(bar);

    const resumeId = ME.store.get('lastLesson', null);
    const resume = resumeId && ME.course.lesson(resumeId);
    const nextUp = resume || firstUnfinished() || lessons[0];
    if (nextUp) {
      const btn = el('button', { class: 'btn btn-primary cm-resume' });
      btn.appendChild(el('span', {}, [
        el('span', { class: 'cm-resume-k', text: resume ? 'Continue where you left off' : 'Start here' }),
        el('span', { class: 'cm-resume-v', text: nextUp.title }),
      ]));
      btn.appendChild(ME.icon('chevron'));
      btn.addEventListener('click', () => showLesson(nextUp.id));
      top.appendChild(btn);
    }
    wrap.appendChild(top);

    /* the units */
    units.forEach((u) => {
      const p = unitProgress(u);
      const card = el('div', { class: 'cm-unit' + (p.total && p.done === p.total ? ' done' : '') });
      const head = el('div', { class: 'cm-unit-head' });
      head.appendChild(el('span', { class: 'cm-unit-n', text: 'Unit ' + u.n }));
      head.appendChild(el('span', { class: 'cm-unit-title', text: u.title }));
      head.appendChild(el('span', { class: 'cm-unit-time', text: Math.round(p.minutes / 5) * 5 + ' min' }));
      card.appendChild(head);
      if (u.blurb) card.appendChild(el('p', { class: 'note cm-unit-blurb', text: u.blurb }));

      const ubar = el('div', { class: 'cm-unit-bar' });
      const ufill = el('i');
      ufill.style.width = (p.total ? Math.round((p.done / p.total) * 100) : 0) + '%';
      ubar.appendChild(ufill);
      card.appendChild(ubar);
      card.appendChild(el('div', { class: 'cm-unit-meta note',
        text: p.lessons + ' of ' + u.lessons.length + ' lessons finished · ' + p.done + '/' + p.total + ' questions' }));

      const list = el('div', { class: 'cm-lessons' });
      u.lessons.forEach((l, i) => {
        const b = el('button', { class: 'cm-lesson' + (lessonComplete(l) ? ' done' : '') });
        b.appendChild(el('span', { class: 'cm-lesson-n', text: lessonComplete(l) ? '✓' : String(i + 1) }));
        const mid = el('span', { class: 'cm-lesson-mid' });
        mid.appendChild(el('span', { class: 'cm-lesson-title', text: l.title }));
        const passed = passedFor(l).size;
        const qtotal = ME.course.questionsOf(l).length;
        mid.appendChild(el('span', { class: 'note cm-lesson-sub',
          text: ME.course.minutesOf(l) + ' min · ' + passed + '/' + qtotal + ' questions' }));
        b.appendChild(mid);
        b.addEventListener('click', () => showLesson(l.id));
        list.appendChild(b);
      });
      card.appendChild(list);
      wrap.appendChild(card);
    });

    St.view.appendChild(wrap);
    window.scrollTo({ top: 0 });
  }

  function firstUnfinished() {
    return ME.course.allLessons().filter((l) => !lessonComplete(l))[0] || null;
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
        : 'Progress will not be saved — reloading starts you fresh');
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
        reset.textContent = 'Reset — sure?';
        reset.classList.add('btn-primary');
        armed = setTimeout(disarm, 4000);
        return;
      }
      disarm();
      const n = courseProgress().total;
      resetProgress();
      ME.toast('All ' + n + ' questions are open again');
    });
    box.appendChild(reset);
    return box;
  }

  /* ------------------------------------------------------- lesson reader */
  function showLesson(id) {
    const l = ME.course.lesson(id);
    if (!l) { showMap(); return; }
    St.current = l;
    if (remembering()) ME.store.set('lastLesson', id);
    ME.clear(St.view);

    const wrap = el('div', { class: 'wrap' });
    /* A column of prose wants a reading measure of around 70 characters, and
     * the crumb has to line up with its left edge, so both go in one holder
     * that is centred rather than left-aligned in a wide page. */
    const reader = el('div', { class: 'ls-reader' });
    wrap.appendChild(reader);
    const all = ME.course.allLessons();
    const index = all.indexOf(l);

    const crumb = el('button', { class: 'btn btn-sm btn-ghost ls-crumb' }, [ME.icon('back'), 'All units']);
    crumb.addEventListener('click', () => showMap());
    reader.appendChild(crumb);

    const art = el('article', { class: 'lesson' });
    art.appendChild(el('div', { class: 'ls-kicker',
      text: 'Unit ' + l.unit.n + ' · ' + l.unit.title + ' · ' + ME.course.minutesOf(l) + ' min' }));
    art.appendChild(el('h2', { text: l.title }));

    /* what it leans on, as a recommendation and never a lock */
    if (l.builds_on && l.builds_on.length) {
      const pre = el('div', { class: 'ls-builds note' });
      pre.appendChild(document.createTextNode('This one goes more easily after '));
      l.builds_on.forEach((pid, i) => {
        const p = ME.course.lesson(pid);
        if (!p) return;
        if (i) pre.appendChild(document.createTextNode(i === l.builds_on.length - 1 ? ' and ' : ', '));
        const a = el('button', { class: 'ls-prereq', text: p.title });
        a.addEventListener('click', () => showLesson(p.id));
        pre.appendChild(a);
      });
      pre.appendChild(document.createTextNode('. You can read it now regardless.'));
      art.appendChild(pre);
    }

    const passed = passedFor(l);
    const onPass = (qi) => {
      if (passed.has(qi)) return;
      passed.add(qi);
      St.done[l.id] = Array.from(passed).sort((a, b) => a - b);
      saveProgress();
    };

    if (l.pages) art.appendChild(renderPaged(l, passed, onPass));
    else art.appendChild(renderSingle(l, passed, onPass));

    /* common mistakes */
    if (l.mistakes && l.mistakes.length) {
      const box = el('section', { class: 'ls-mistakes' });
      box.appendChild(el('h3', {}, [ME.icon('warn'), 'Where people go wrong']));
      box.appendChild(el('p', { class: 'note',
        text: 'Not a list of things to avoid so much as a list of things that are genuinely easy to think. Each one is worth reading even if you are sure you would not.' }));
      l.mistakes.forEach((m) => {
        const item = el('div', { class: 'ls-mistake' });
        item.appendChild(el('div', { class: 'ls-mistake-claim', html: ME.formulaHTML(m.wrong) }));
        item.appendChild(el('div', { class: 'ls-mistake-why', html: ME.formulaHTML(m.why) }));
        box.appendChild(item);
      });
      art.appendChild(box);
    }

    /* the practice set */
    const qs = ME.course.questionsOf(l);
    const endQs = (l.quizzes || (l.quiz ? [l.quiz] : []));
    if (endQs.length) {
      const offset = (l.checkpoints || []).length;
      art.appendChild(quizBlock(l, endQs, offset, passed, onPass,
        l.pages ? 'Practice' : 'Quick check'));
    }

    /* unlimited practice */
    if (l.practice) art.appendChild(practicePanel(l.practice));

    /* recap */
    if (l.recap) {
      const box = el('section', { class: 'ls-recap' });
      box.appendChild(el('h3', { text: 'What you now know' }));
      (Array.isArray(l.recap) ? l.recap : [l.recap]).forEach((t) =>
        box.appendChild(el('p', { html: ME.formulaHTML(t) })));
      art.appendChild(box);
    }

    /* prev and next across the whole course */
    const foot = el('div', { class: 'lesson-foot' });
    if (index > 0) {
      const prev = all[index - 1];
      const b = el('button', { class: 'btn' }, [ME.icon('back'), prev.title]);
      b.addEventListener('click', () => { showLesson(prev.id); scrollUp(); });
      foot.appendChild(b);
    } else foot.appendChild(el('span'));
    if (index < all.length - 1) {
      const next = all[index + 1];
      const b = el('button', { class: 'btn btn-primary' }, [next.title, ME.icon('chevron')]);
      b.addEventListener('click', () => { showLesson(next.id); scrollUp(); });
      foot.appendChild(b);
    }
    art.appendChild(foot);

    reader.appendChild(art);
    St.view.appendChild(wrap);
    ME.bindTips(art);
  }

  /* An old-format lesson: one body, questions at the end. */
  function renderSingle(l, passed, onPass) {
    const body = el('div', { class: 'lesson-body' });
    body.appendChild(l.body());
    return body;
  }

  /* A long-form lesson: a hook, then pages you click through, with
   * checkpoints sitting between them rather than all saved for the end. */
  function renderPaged(l, passed, onPass) {
    const holder = el('div', { class: 'ls-paged' });

    if (l.hook) {
      const hook = el('section', { class: 'ls-hook' });
      hook.appendChild(l.hook());
      holder.appendChild(hook);
    }

    const pagesWrap = el('div', { class: 'lesson-body' });
    holder.appendChild(pagesWrap);

    const dots = el('div', { class: 'ls-dots' });
    holder.appendChild(dots);

    const nav = el('div', { class: 'ls-pagenav' });
    holder.appendChild(nav);

    let at = 0;
    const checkpoints = l.checkpoints || [];

    function drawDots() {
      ME.clear(dots);
      l.pages.forEach((p, i) => {
        const d = el('button', { class: 'ls-dot' + (i === at ? ' on' : '') + (i < at ? ' seen' : ''),
          title: p.h || 'Page ' + (i + 1), 'aria-label': p.h || 'Page ' + (i + 1) });
        d.addEventListener('click', () => go(i));
        dots.appendChild(d);
      });
    }

    function go(i) {
      at = Math.max(0, Math.min(l.pages.length - 1, i));
      ME.clear(pagesWrap);
      const page = l.pages[at];
      const sec = el('section', { class: 'ls-page' });
      sec.appendChild(el('div', { class: 'ls-page-n', text: 'Part ' + (at + 1) + ' of ' + l.pages.length }));
      if (page.h) sec.appendChild(el('h3', { text: page.h }));
      sec.appendChild(page.body());
      pagesWrap.appendChild(sec);

      /* any checkpoint that belongs after this page */
      checkpoints.forEach((q, qi) => {
        if ((q.after === undefined ? -1 : q.after) !== at) return;
        const box = el('div', { class: 'quiz quiz-checkpoint' });
        const head = el('h3');
        head.appendChild(ME.icon('check'));
        head.appendChild(document.createTextNode('Checkpoint'));
        box.appendChild(head);
        box.appendChild(el('p', { class: 'note',
          text: 'One question, here rather than at the end, because this is the bit that has to land before the next part makes sense.' }));
        box.appendChild(ME.quiz.buildQuestion(q, qi, 1, passed.has(qi), () => onPass(qi)));
        pagesWrap.appendChild(box);
      });

      ME.clear(nav);
      if (at > 0) {
        const b = el('button', { class: 'btn btn-sm' }, [ME.icon('back'), 'Back']);
        b.addEventListener('click', () => { go(at - 1); pagesWrap.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
        nav.appendChild(b);
      } else nav.appendChild(el('span'));
      if (at < l.pages.length - 1) {
        const b = el('button', { class: 'btn btn-primary btn-sm' }, ['Next: ' + (l.pages[at + 1].h || 'carry on'), ME.icon('chevron')]);
        b.addEventListener('click', () => { go(at + 1); pagesWrap.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
        nav.appendChild(b);
      } else {
        nav.appendChild(el('span', { class: 'note', text: 'That is the reading. The questions are below.' }));
      }
      drawDots();
      ME.bindTips(pagesWrap);
    }
    go(0);
    return holder;
  }

  function quizBlock(l, qs, offset, passed, onPass, title) {
    const box = el('div', { class: 'quiz' });
    const head = el('h3');
    head.appendChild(ME.icon('check'));
    head.appendChild(document.createTextNode(title));
    const tally = el('span', { class: 'quiz-tally' });
    head.appendChild(tally);
    box.appendChild(head);

    if (qs.length > 1) {
      box.appendChild(el('p', { class: 'note quiz-intro' },
        'Get one wrong and it will explain why before letting you try again.'));
    }
    function sync() {
      const mine = qs.map((q, i) => offset + i).filter((i) => passed.has(i)).length;
      tally.textContent = mine + ' / ' + qs.length;
      tally.classList.toggle('all', mine === qs.length);
    }
    qs.forEach((q, i) => {
      const qi = offset + i;
      box.appendChild(ME.quiz.buildQuestion(q, i, qs.length, passed.has(qi), () => { onPass(qi); sync(); }));
    });
    sync();
    return box;
  }

  /* -------------------------------------------------- unlimited practice */
  function practicePanel(spec) {
    const keys = Array.isArray(spec) ? spec : [spec];
    const box = el('section', { class: 'ls-practice' });
    box.appendChild(el('h3', { text: 'Practice more' }));
    box.appendChild(el('p', { class: 'note',
      text: 'Fresh problems, as many as you want, with new numbers and new compounds every time. Nothing is scored — this is for the repetition, which is the only thing that makes this stuff automatic.' }));

    const chooser = el('div', { class: 'ls-practice-kinds' });
    let active = keys[0];
    if (keys.length > 1) {
      keys.forEach((k) => {
        const b = el('button', { class: 'btn btn-sm' + (k === active ? ' on' : ''), text: practiceName(k) });
        b.addEventListener('click', () => {
          active = k;
          ME.$$('.btn', chooser).forEach((x) => x.classList.toggle('on', x.textContent === practiceName(k)));
          fresh();
        });
        chooser.appendChild(b);
      });
      box.appendChild(chooser);
    }

    const slot = el('div', { class: 'ls-practice-slot' });
    box.appendChild(slot);

    const acts = el('div', { class: 'ls-practice-acts' });
    const another = el('button', { class: 'btn btn-primary btn-sm', text: 'Another one' });
    another.addEventListener('click', () => fresh());
    acts.appendChild(another);
    const showBtn = el('button', { class: 'btn btn-sm', text: 'Show me the working' });
    acts.appendChild(showBtn);
    box.appendChild(acts);

    let current = null;
    function fresh() {
      current = ME.practice.generate(active);
      ME.clear(slot);
      if (!current) { slot.appendChild(el('p', { class: 'note', text: 'Could not make one — try again.' })); return; }
      slot.appendChild(ME.quiz.buildQuestion(current, 0, 1, false, null));
    }
    showBtn.addEventListener('click', () => {
      if (!current || !current.solution) return;
      const existing = ME.$('.ls-solution', slot);
      if (existing) { existing.parentNode.removeChild(existing); return; }
      const sol = el('div', { class: 'ls-solution' });
      sol.appendChild(el('h4', { text: 'Worked through' }));
      const list = el('ol');
      current.solution.forEach((s) => list.appendChild(el('li', { html: ME.formulaHTML(typeof s === 'string' ? s : s.text) })));
      sol.appendChild(list);
      slot.appendChild(sol);
    });
    fresh();
    return box;
  }

  function practiceName(key) {
    const g = ME.practice.generate(key, 1);
    return (g && g.name) || key.replace(/-/g, ' ');
  }

  function scrollUp() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  ME.learn = {
    ensureBuilt, LESSONS, resetProgress, setRemember, remembering,
    showMap, showLesson,
    get current() { return St.current; },
  };
})();
