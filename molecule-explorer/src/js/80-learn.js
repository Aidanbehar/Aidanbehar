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
      quiz: {
        kind: 'choice',
        q: 'Ethanol and dimethyl ether both have the formula C₂H₆O. What does that tell you?',
        options: [
          { t: 'They are the same substance written two ways.', ok: false, why: 'Not quite — they behave completely differently. One is drinkable; the other is a gas.' },
          { t: 'They contain the same atoms, but joined up differently.', ok: true, why: 'Exactly. Same shopping list, different assembly. That is why we draw structures at all.' },
          { t: 'One of the two formulas must be written down wrong.', ok: false, why: 'Both are correct. Two different molecules really can share a formula — chemists call them isomers.' },
        ],
      },
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
      quiz: {
        kind: 'clickatom',
        mol: impossibleCarbon,
        xray: 0,
        q: 'Somebody has drawn this molecule wrongly: one atom here has more bonds than it has hands. Click that atom.',
        test: (a) => a.bondCount === 5,
        right: 'That is the one. Count the lines meeting there: five. Carbon has only four hands, so there is no way for it to hold five things \u2014 this molecule cannot exist as drawn.',
        wrong: 'Not that one. Go round the drawing counting the lines that meet at each corner, and find the one where more lines meet than that atom has hands. Every atom here is a carbon, and carbon has four.',
        note: 'Every corner and line end in this drawing is a carbon.',
      },
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
      quiz: {
        kind: 'clickatom',
        smiles: 'CCCO',
        xray: 1,
        q: 'Click the oxygen in this drawing.',
        test: (a) => a.sym === 'O',
        right: 'That is the oxygen. Notice it has two lines: one to a carbon, one to a hydrogen. Two hands, both full.',
        wrong: 'Not that one. The oxygen is labelled O — and it is the atom with exactly two bonds, one of them to a hydrogen.',
      },
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
      quiz: {
        kind: 'choice',
        q: 'Which drawing is CH₃CH₂CH₂OH?',
        optionsBuilder() {
          return [
            { node: drawing('CCCO', { xray: 1, width: 240, height: 150, interactive: false }), ok: true, why: 'Yes — three carbons in a row, with the OH on the end.' },
            { node: drawing('CCOC', { xray: 1, width: 240, height: 150, interactive: false }), ok: false, why: 'Look where the oxygen is: it is in the middle of the chain here, not on the end. That is an ether, not an alcohol.' },
            { node: drawing('CC(C)O', { xray: 1, width: 240, height: 150, interactive: false }), ok: false, why: 'Close, but the OH here is on the middle carbon. The condensed formula for this one would be CH₃CH(OH)CH₃.' },
          ];
        },
      },
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
      quiz: {
        kind: 'count',
        smiles: 'CCCCCC',
        q: 'How many carbon atoms are in this drawing?',
        answer: 6,
        right: 'Six. Four corners plus the two line ends — the ends count too, and they are the ones people forget.',
        wrong: 'Count the corners, then remember that both ends of the line are carbons as well.',
      },
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
        f.appendChild(p('A carbon at the end of a chain has one line, so three hydrogens. A carbon in the middle has two lines, so two hydrogens. A carbon where three chains meet has one hydrogen. A carbon with four lines has none — its hands are all full.'));
        f.appendChild(p('Careful with double bonds: a double bond is ', b('two'), ' of the four, drawn as two lines between the same pair of atoms. So a carbon with one double bond and one single bond has used three and has one hydrogen left.'));
        f.appendChild(xrayFigure('CC(C)CCO', '4-methylbutan-1-ol. Try to predict each carbon before you slide.'));
        f.appendChild(p('Hover over the corners in that drawing. Each one will tell you what it is carrying, so you can check yourself immediately.'));
        return f;
      },
      quiz: {
        kind: 'clickatom',
        smiles: 'CC(C)CCO',
        xray: 0,
        q: 'Click the carbon that has no hydrogens at all — the one where three chains meet.',
        test: (a) => a.sym === 'C' && a.hydrogens === 1 && a.bondCount === 3,
        testFallback: (a) => a.sym === 'C' && a.bondCount === 3,
        right: 'That is the branch point. Three lines meet there, so three of its four hands are used, leaving exactly one hydrogen.',
        wrong: 'Look for the corner where three separate lines come together — the place the molecule branches.',
        note: 'A carbon with three bonds drawn has one hydrogen left, not none. There is no zero-hydrogen carbon in this molecule — clicking the branch point is the right answer.',
      },
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
      quiz: {
        kind: 'count',
        smiles: 'C=CC=C',
        q: 'This is buta-1,3-diene. How many hydrogens does the whole molecule have?',
        answer: 6,
        right: 'Six. The two end carbons carry two each, and the two middle carbons one each — their double bonds have taken up the rest.',
        wrong: 'Work through it carbon by carbon: count the lines at each one, and subtract from four. Remember a double bond counts as two.',
      },
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
      quiz: {
        kind: 'clickatom',
        smiles: 'CCCN',
        xray: 0,
        q: 'Click the heteroatom in this skeletal drawing.',
        test: (a) => a.sym !== 'C' && a.sym !== 'H',
        right: 'The nitrogen. It is the only atom with a letter on it, and that is exactly the signal — anything spelled out in a skeletal drawing is worth your attention.',
        wrong: 'The bare corners are carbons, which the drawing leaves out on purpose. The heteroatom is the one that has been given a letter.',
      },
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
      quiz: {
        kind: 'count',
        smiles: 'c1ccccc1',
        q: 'How many hydrogens are on a benzene ring?',
        answer: 6,
        right: 'Six — one per carbon. Each carbon has two bonds to its ring neighbours plus half of a double bond, using three of its four hands.',
        wrong: 'Each carbon in the ring is joined to two neighbours, and one of those joins is a double bond. That is three of its four hands used up.',
      },
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
      quiz: {
        kind: 'choice',
        q: 'A molecule contains a C=O with an O–H attached to the same carbon. What is that group?',
        options: [
          { t: 'An alcohol.', ok: false, why: 'An alcohol is an O–H on its own, with no C=O next to it. The double-bonded oxygen changes the behaviour completely.' },
          { t: 'A carboxylic acid.', ok: true, why: 'Right. C=O plus O–H on the same carbon is the acid group — the sour in vinegar, lemon juice and aspirin.' },
          { t: 'A ketone.', ok: false, why: 'A ketone is a C=O with carbons on both sides and no O–H. Acetone is the everyday one.' },
          { t: 'An ether.', ok: false, why: 'An ether is an oxygen bridging two carbons, with no double bond and no hydrogen on it.' },
        ],
      },
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
      quiz: {
        kind: 'clickatom',
        smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
        xray: 0,
        q: 'Click any one of caffeine’s four nitrogens.',
        test: (a) => a.sym === 'N',
        right: 'That is one of them. Four nitrogens, all spelled out, exactly as the heteroatom rule promises.',
        wrong: 'The nitrogens are the atoms labelled N. The unlabelled corners are all carbons.',
      },
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
  function buildQuiz(lesson, onPass) {
    const q = lesson.quiz;
    const box = el('div', { class: 'quiz' });
    const head = el('h3');
    head.appendChild(ME.icon('check'));
    head.appendChild(document.createTextNode('Quick check'));
    box.appendChild(head);
    box.appendChild(el('div', { class: 'quiz-q', text: q.q }));
    const feedback = el('div', { class: 'quiz-feedback' });

    function settle(ok, message) {
      feedback.classList.add('show');
      ME.clear(feedback);
      feedback.appendChild(el('div', { class: 'callout ' + (ok ? 'ok' : 'warn'), text: message }));
      if (ok) onPass();
    }

    if (q.kind === 'choice') {
      const opts = q.optionsBuilder ? q.optionsBuilder() : q.options;
      const list = el('div', { class: 'quiz-opts' });
      const buttons = [];
      opts.forEach((o) => {
        const btn = el('button', { class: 'quiz-opt' });
        if (o.node) btn.appendChild(o.node); else btn.textContent = o.t;
        btn.addEventListener('click', () => {
          buttons.forEach((x) => { x.disabled = true; });
          btn.classList.add(o.ok ? 'right' : 'wrong');
          if (!o.ok) {
            const correct = buttons[opts.findIndex((x) => x.ok)];
            if (correct) correct.classList.add('right');
          }
          settle(o.ok, o.why);
        });
        buttons.push(btn);
        list.appendChild(btn);
      });
      box.appendChild(list);
    } else if (q.kind === 'count') {
      if (q.smiles) box.appendChild(drawing(q.smiles, { xray: 0, width: 360, height: 200 }));
      const row = el('div', { class: 'quiz-count' });
      const input = el('input', { type: 'number', min: '0', 'aria-label': 'Your answer' });
      const go = el('button', { class: 'btn btn-primary btn-sm', text: 'Check' });
      const submit = () => {
        const v = parseInt(input.value, 10);
        if (isNaN(v)) return;
        settle(v === q.answer, v === q.answer ? q.right : q.wrong);
      };
      go.addEventListener('click', submit);
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') submit(); });
      row.appendChild(input); row.appendChild(go);
      box.appendChild(row);
    } else if (q.kind === 'clickatom') {
      /* `mol` lets a lesson supply a structure no SMILES could describe, such
       * as the deliberately over-bonded carbon in lesson 2. */
      const mol = q.mol ? q.mol() : molOf(q.smiles);
      const holder = el('div', { class: 'clickmol' });
      let answered = false;
      const info = ME.render2d.describe(mol, {});
      holder.appendChild(ME.render2d.render(mol, {
        xray: q.xray || 0, width: q.width || 440, height: q.height || 290,
        onAtomClick(i, atom) {
          if (answered) return;
          const enriched = Object.assign({}, atom, { bondCount: info.atoms[i].bonds.length });
          let ok = q.test(enriched);
          if (!ok && q.testFallback) ok = q.testFallback(enriched);
          if (ok) answered = true;
          settle(ok, ok ? q.right : q.wrong);
        },
      }));
      box.appendChild(holder);
      box.appendChild(el('p', { class: 'note', style: { marginTop: '6px' }, text: 'Click an atom in the drawing above.' }));
      if (q.note) box.appendChild(el('p', { class: 'note', style: { fontSize: '.8rem' }, text: q.note }));
    }

    box.appendChild(feedback);
    return box;
  }

  /* -------------------------------------------------------------- view */
  const St = { built: false, index: 0, done: {}, navNode: null, bodyNode: null, barNode: null };

  function loadProgress() { St.done = ME.store.get('lessons', {}) || {}; }
  function saveProgress() { ME.store.set('lessons', St.done); }

  function build(host) {
    loadProgress();
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Learn' }));
    wrap.appendChild(el('p', { class: 'note', style: { maxWidth: '64ch', marginBottom: '18px' } },
      'Eleven short lessons. Start at the top; each one assumes the one before it. There is a small check at the end of each so you can tell whether it landed.'));

    const prog = el('div', { class: 'progress-wrap' });
    St.barNode = el('i');
    prog.appendChild(el('div', { class: 'progress-bar' }, [St.barNode]));
    St.progText = el('div', { class: 'note', style: { fontSize: '.8rem', marginTop: '5px' } });
    prog.appendChild(St.progText);
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
    const saved = ME.store.get('lessonIndex', 0);
    showLesson(Math.min(LESSONS.length - 1, Math.max(0, saved)));
  }

  function syncNav() {
    ME.$$('.lesson-link', St.navNode).forEach((link, i) => {
      link.classList.toggle('on', i === St.index);
      link.classList.toggle('done', !!St.done[LESSONS[i].id]);
    });
    const n = Object.keys(St.done).filter((k) => St.done[k]).length;
    const pct = Math.round((n / LESSONS.length) * 100);
    St.barNode.style.width = pct + '%';
    St.progText.textContent = `${n} of ${LESSONS.length} checks passed`;
  }

  function showLesson(i) {
    St.index = i;
    ME.store.set('lessonIndex', i);
    const lesson = LESSONS[i];
    ME.clear(St.bodyNode);

    const art = el('article', { class: 'lesson' });
    art.appendChild(el('div', { class: 'note', style: { fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: '700' }, text: `Lesson ${i + 1} of ${LESSONS.length}` }));
    art.appendChild(el('h2', { text: lesson.title }));
    const body = el('div', { class: 'lesson-body' });
    body.appendChild(lesson.body());
    art.appendChild(body);

    art.appendChild(buildQuiz(lesson, () => {
      if (!St.done[lesson.id]) { St.done[lesson.id] = true; saveProgress(); syncNav(); }
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

  ME.learn = { ensureBuilt, LESSONS };
})();
