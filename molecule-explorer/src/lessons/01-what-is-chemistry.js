/* Unit 1: What is chemistry?
 *
 * Six lessons, starting from nothing at all. The maths lessons at the end of
 * the unit are the ones everything later depends on, so they get the most
 * space and the most practice.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;
  const p = (...kids) => el('p', {}, kids.flat());
  const b = (t) => el('strong', { text: t });
  const em = (t) => el('em', { text: t });
  const h4 = (t) => el('h4', { text: t });
  const frag = (...kids) => {
    const f = document.createDocumentFragment();
    kids.flat().forEach((k) => f.appendChild(k));
    return f;
  };
  const term = (w, d) => el('span', { class: 'term', 'data-tip': d, text: w });
  const callout = (...kids) => el('div', { class: 'callout' }, kids.flat());
  const eq = (text) => el('div', { class: 'lesson-eq', text: text });

  /* A small table, for the unit-conversion and prefix lessons. */
  function table(head, rows, caption) {
    const t = el('table', { class: 'lesson-table reasons' });
    const hr = el('tr');
    head.forEach((h) => hr.appendChild(el('th', { text: h })));
    t.appendChild(hr);
    rows.forEach((r) => {
      const tr = el('tr');
      r.forEach((c, i) => {
        const td = el('td', { 'data-label': head[i] });
        if (typeof c === 'string') td.innerHTML = ME.formulaHTML(c); else td.appendChild(c);
        tr.appendChild(td);
      });
      t.appendChild(tr);
    });
    const fg = el('figure', { class: 'figure' }, [t]);
    if (caption) fg.appendChild(el('figcaption', { text: caption }));
    return fg;
  }

  /* A worked example, laid out so the reasoning is the visible part and the
   * arithmetic is the small part. */
  function worked(title, lines) {
    const box = el('div', { class: 'lesson-worked' });
    box.appendChild(el('div', { class: 'lw-title', text: title }));
    lines.forEach((line) => {
      const row = el('div', { class: 'lw-step' });
      if (line.q) row.appendChild(el('div', { class: 'lw-q', html: ME.formulaHTML(line.q) }));
      if (line.why) row.appendChild(el('div', { class: 'lw-why', html: ME.formulaHTML(line.why) }));
      if (line.maths) row.appendChild(el('div', { class: 'lw-maths', html: ME.formulaHTML(line.maths) }));
      box.appendChild(row);
    });
    return box;
  }

  ME.course.unit({
    n: 1, id: 'basics',
    title: 'What is chemistry?',
    blurb: 'What the subject is actually about, how anyone found any of it out, and the handful of number skills that everything else quietly assumes you already have.',
    lessons: [

    /* ------------------------------------------------------------ 1.1 */
    {
      id: 'what-chemistry-is',
      title: 'What chemistry is, and why it is everywhere',
      mins: 15,
      hook() {
        return frag(
          p('Put a slice of bread in a toaster and it comes out brown, dry and smelling of something that was not there before. Leave a bicycle out in the rain and in a month there is orange dust where there was shiny metal. Mix baking soda into vinegar and the whole thing foams over the edge of the bowl.'),
          p('Three everyday things, and all three are the same thing happening: ', b('the stuff changed into different stuff'), '. That is what chemistry studies. Not the toaster, not the bicycle — the change.'));
      },
      pages: [
        {
          h: 'Everything is made of a few dozen things',
          body() {
            return frag(
              p('Start with the one fact the whole subject is built on. Everything around you — the air, the chair, the water in the tap, the tissue you are made of — is built out of about ninety different kinds of stuff, and they combine in different ways to make everything else.'),
              p('Those ninety-odd are the ', term('elements', 'A substance made of only one kind of atom. Gold, oxygen and carbon are elements; water and salt are not, because each is two elements joined.'), '. Gold is one. Oxygen is one. Carbon is one. An element cannot be broken into anything simpler by chemical means — that is what makes it an element.'),
              p('Everything else is elements joined together. Water is hydrogen joined to oxygen. Table salt is sodium joined to chlorine. The sugar in your tea is carbon, hydrogen and oxygen in a particular arrangement. A few dozen ingredients, and from them the entire material world.'),
              callout(b('This is genuinely surprising when you stop on it. '), 'A living cell, a granite cliff and a plastic bottle are all made from the same short list of ingredients. What makes them different is which ones, how many, and how they are joined.'),
              p('The app has the whole list of them in the ', b('Elements'), ' tab, with what each one is like. It is worth a look now, before anything else — not to learn, just to see how short the list is.'));
          },
        },
        {
          h: 'Chemistry is about change',
          body() {
            return frag(
              p('Knowing what things are made of is only half of it. The half that makes chemistry useful is that the ingredients can be taken apart and put back together differently, and when they are, you get something with completely different properties.'),
              p('Sodium on its own is a soft grey metal that catches fire in water. Chlorine on its own is a green gas that was used as a weapon in the First World War. Join them and you get ', b('table salt'), ', which you put on chips.'),
              p('That is not a trick or an exception. It is the normal situation. The properties of a compound have almost nothing to do with the properties of the elements in it, because the joining changes everything about how the atoms behave.'),
              h4('Why this makes chemistry predictive and not just descriptive'),
              p('If changes were arbitrary, chemistry would be a very long list of things that happen. It is not arbitrary. There are reasons, and the reasons come from what the atoms are doing — which is why this course spends its early units on atoms and electrons before it gets to reactions. Once you know why sodium gives an electron away and chlorine takes one, you do not have to be told that they make salt. You can see it coming.'));
          },
        },
        {
          h: 'Where you have already met it today',
          body() {
            return frag(
              p('Chemistry has a reputation for happening in laboratories. Almost none of it does.'),
              table(['Something ordinary', 'The chemistry in it'], [
                ['Cooking', 'Heat breaks some molecules apart and lets others join. Browning meat, baking bread and caramelising onions are all the same family of reactions, and none of them happens at room temperature.'],
                ['Digestion', 'Your gut takes apart molecules too big to get into a cell and rebuilds them into ones that fit. It uses acid to do it, at about pH 2, which is roughly battery acid.'],
                ['Breathing', 'Oxygen goes in, gets handed to a molecule that burns sugar, and carbon dioxide comes back out. You are running a slow, extremely well-controlled fire.'],
                ['Cleaning', 'Soap works because one end of the molecule likes water and the other end likes grease. It is a shape problem, and Unit 6 explains it properly.'],
                ['A phone battery', 'Lithium ions moving from one side to the other and back. Charging pushes them one way, using it lets them come back.'],
                ['Rust', 'Iron reacting with oxygen and water. The orange stuff is a different substance from the metal, and it takes up more room, which is why it flakes off.'],
              ], 'None of these needs a laboratory. All of them need the same set of ideas.'),
              p('So the aim of this course is not to prepare you for a lab. It is to let you look at the toast, the rust and the fizzing bowl and know roughly what is going on — and, where the numbers matter, work them out.'));
          },
        },
      ],
      checkpoints: [
        {
          kind: 'choice', after: 1,
          q: 'Sodium is a metal that catches fire in water. Chlorine is a poisonous green gas. Together they make table salt. What does that tell you?',
          options: [
            { t: 'A compound’s properties are not the properties of the elements in it.', ok: true,
              why: 'Exactly, and this is the single most useful thing to take from this lesson. Joining atoms together changes how they behave completely, so you can never predict a compound from its ingredients by averaging them.' },
            { t: 'Salt must be dangerous in small amounts.', ok: false,
              why: 'It is not — you eat it. Once sodium and chlorine are joined, neither behaves the way it did on its own. That is the whole point.' },
            { t: 'Sodium and chlorine cancel each other out.', ok: false,
              why: 'Nothing is cancelled. Both atoms are still there in the salt, just changed by being joined. "Cancelling out" is not a thing atoms do.' },
          ],
        },
      ],
      quizzes: [
        {
          kind: 'choice',
          q: 'Which of these is an element?',
          options: [
            { t: 'Carbon', ok: true, why: 'Yes. One kind of atom, nothing simpler inside it as far as chemistry is concerned.' },
            { t: 'Water', ok: false, why: 'Water is two elements joined — hydrogen and oxygen. You can split it back into those two, which an element could never do.' },
            { t: 'Air', ok: false, why: 'Air is a mixture of several different substances, mostly nitrogen and oxygen, not even a compound. Unit 2 sorts out the difference.' },
            { t: 'Steel', ok: false, why: 'Steel is mostly iron with some carbon mixed in — a mixture, and one whose recipe can be varied.' },
          ],
        },
        {
          kind: 'choice',
          q: 'Roughly how many elements are there?',
          options: [
            { t: 'About 90 that occur naturally, and a few more made in laboratories', ok: true,
              why: 'Right — 118 are known, but the ones past about 92 are made artificially and mostly fall apart in seconds. Everything ordinary is built from the first 90 or so.' },
            { t: 'Thousands', ok: false, why: 'There are millions of known compounds, but only about 90 natural elements to build them from. That ratio is the interesting part.' },
            { t: 'Four — earth, air, fire and water', ok: false,
              why: 'That was the Greek answer and it held for two thousand years. It was wrong, but it was the right kind of idea: that everything is made from a small number of basic things.' },
            { t: 'Twenty-six', ok: false, why: 'No — you may be thinking of the alphabet. There are 118 known elements.' },
          ],
        },
        {
          kind: 'sort',
          q: 'Sort these into things chemistry explains and things it does not.',
          categories: ['Chemistry explains it', 'Not really chemistry'],
          items: [
            { t: 'Why bread goes brown in a toaster', cat: 'Chemistry explains it' },
            { t: 'Why iron rusts but gold does not', cat: 'Chemistry explains it' },
            { t: 'Why soap gets grease off a plate', cat: 'Chemistry explains it' },
            { t: 'Why a battery goes flat', cat: 'Chemistry explains it' },
            { t: 'Why the Earth orbits the Sun', cat: 'Not really chemistry' },
            { t: 'Why a dropped plate falls', cat: 'Not really chemistry' },
          ],
          right: 'Yes. Chemistry is about what substances are and how they change into other substances. Gravity and orbits are physics — the same universe, a different question.',
          wrong: 'The test is whether the question is about one substance turning into another.',
        },
        {
          kind: 'choice',
          q: 'What is the difference between a physicist and a chemist looking at a glass of water?',
          options: [
            { t: 'The chemist asks what it is made of and what it will react with; the physicist asks how it moves and how it carries heat.', ok: true,
              why: 'A fair summary. The boundary is blurry and gets blurrier the deeper you go — the reason atoms bond at all turns out to be physics — but that is the everyday split.' },
            { t: 'The chemist works with liquids and the physicist works with solids.', ok: false,
              why: 'Neither is true. Both work with all of it.' },
            { t: 'There is no difference.', ok: false,
              why: 'They overlap enormously, and the overlap has its own name, physical chemistry. But the starting questions are different.' },
          ],
        },
      ],
      mistakes: [
        { wrong: '"Chemicals" are the artificial, dangerous things, as opposed to natural ones.',
          why: 'Everything is chemicals. Water is a chemical; so is caffeine, so is the DNA in your cells. The word says nothing at all about whether something is safe, natural or made in a factory — and the most poisonous substances known are made by living things.' },
        { wrong: 'If a compound contains a dangerous element, the compound is dangerous.',
          why: 'Table salt contains chlorine, and chlorine gas will kill you. Salt will not. Once atoms are joined, the compound has its own properties, unrelated to its ingredients’ properties.' },
        { wrong: 'Chemistry is mostly about memorising.',
          why: 'There is a little to learn by heart — some ion charges, some names. Almost everything else follows from a handful of reasons, and this course leads with the reasons on purpose. If a topic feels like memorising, you have probably missed a why.' },
      ],
      recap: [
        'Everything is built from about ninety naturally occurring elements, and everything else is those elements joined up in different ways.',
        'Chemistry studies how substances change into other substances — and a compound’s properties have essentially nothing to do with the properties of the elements in it.',
        'It is not a laboratory subject. Cooking, rust, breathing, cleaning and batteries are all in scope.',
        'And it is mostly not memorising. The rest of this course leads with the reason and lets the rule fall out.',
      ],
    },

    /* ------------------------------------------------------------ 1.2 */
    {
      id: 'how-we-know',
      title: 'How anyone found any of this out',
      mins: 15,
      builds_on: ['what-chemistry-is'],
      hook() {
        return frag(
          p('Nobody has ever seen an atom with their eyes. They are far too small — smaller than the wavelength of light, which means light cannot make a picture of one even in principle.'),
          p('So how are we so confident they exist? And why should you believe any of the things this course is about to tell you?'),
          p('That question deserves an answer before the content starts, because the answer is the most transferable thing in the whole subject.'));
      },
      pages: [
        {
          h: 'You can measure what you cannot see',
          body() {
            return frag(
              p('Here is how it was actually done, and it is worth following because the shape of the argument comes up again and again.'),
              p('Around 1800, chemists noticed something odd about the masses in reactions. When hydrogen and oxygen make water, the masses that combine are always in the same ratio — 1 gram of hydrogen to 8 grams of oxygen. Not roughly. Always. Use more oxygen and the extra is simply left over.'),
              p('Then they found something stranger. Carbon and oxygen make two different compounds. In one, 3 grams of carbon takes 4 grams of oxygen. In the other, 3 grams of carbon takes 8 grams of oxygen. And 8 is exactly twice 4.'),
              callout('Ratios of small whole numbers, turning up over and over in the masses. That is not what you would expect if matter were a smooth continuous stuff you could divide however you liked. It is exactly what you would expect if matter came in fixed lumps, and compounds were made of a fixed number of lumps each.'),
              p('So: atoms. Not seen, but the only explanation that accounts for whole-number mass ratios. That is how most of science works — you find the explanation that the measurements force on you.'));
          },
        },
        {
          h: 'Observation, hypothesis, test',
          body() {
            return frag(
              p('The general shape of it:'),
              table(['Step', 'What it means', 'In the atom story'], [
                ['Observation', 'Something measurable that keeps happening.', 'Masses combine in ratios of small whole numbers.'],
                ['Hypothesis', 'A guess at why, specific enough to be wrong.', 'Matter comes in indivisible lumps of fixed mass.'],
                ['Prediction', 'Something the guess says must also be true, which nobody has checked yet.', 'Then there should be compounds where the ratio is 1:3, 2:3, and so on — but never 1:2.5.'],
                ['Test', 'Go and look.', 'They looked. The ratios were always whole numbers.'],
              ], 'The prediction step is the one that matters. A guess that explains what you already knew and predicts nothing new is not worth much.'),
              p('The word ', b('specific enough to be wrong'), ' is doing real work there. "Things are made of stuff" explains everything and forbids nothing, so it is useless. "Matter comes in fixed lumps" forbids a mass ratio of 1:2.5, which makes it testable — and therefore worth something.'));
          },
        },
        {
          h: 'A law is not a theory, and a theory is not a guess',
          body() {
            return frag(
              p('These three words get used loosely in ordinary speech and precisely in science, which causes endless confusion.'),
              table(['Word', 'What it means here', 'Example'], [
                ['Law', 'A description of what always happens. It says what, not why.', 'Mass is conserved in a reaction: the products weigh exactly what the reactants weighed.'],
                ['Theory', 'An explanation of why the laws are the way they are. Tested, and currently the best account we have.', 'Atomic theory: matter is made of atoms, which are rearranged but never created or destroyed — which is why mass is conserved.'],
                ['Hypothesis', 'A specific, testable guess, not yet established.', '"This white powder is a carbonate, so it will fizz with acid."'],
              ]),
              callout(b('A theory does not get promoted to a law. '), 'They are different kinds of thing. A law is a pattern; a theory is an explanation of the pattern. Saying "it is only a theory" is a bit like saying "it is only a reason".'),
              h4('And they do change'),
              p('The atom of 1808 was an indivisible sphere. By 1911 it had a tiny dense nucleus with electrons around it. By 1926 the electrons were not really orbiting at all. Each version explained everything the last one did and more.'),
              p('This is not a weakness, and it is worth being straight about because this course will teach you the high-school picture of the atom, which is not the final word. It is a real picture: it makes correct predictions about essentially all of chemistry. A better picture exists, and it is harder, and it does not change any of the answers you are about to learn.'));
          },
        },
      ],
      checkpoints: [
        {
          kind: 'choice', after: 0,
          q: 'Carbon and oxygen make one compound with a 3:4 mass ratio and another with 3:8. Why did that pattern point towards atoms?',
          options: [
            { t: 'Because 8 is exactly twice 4, and whole-number ratios are what you get if matter comes in fixed lumps.', ok: true,
              why: 'Exactly. If oxygen could be divided however finely you liked, a ratio of 3:5.7 should be as possible as 3:4. The fact that only whole-number multiples turn up says the oxygen is arriving in indivisible pieces.' },
            { t: 'Because it showed oxygen is heavier than carbon.', ok: false,
              why: 'It is, but that was not the clue. The clue was the exact doubling — the *ratio between the ratios* being a whole number.' },
            { t: 'Because two compounds means two kinds of atom.', ok: false,
              why: 'Two compounds from the same pair of elements is interesting, but the argument comes from the numbers: 8 is twice 4, exactly.' },
          ],
        },
        {
          kind: 'match', after: 2,
          q: 'Match each word to what it actually is.',
          pairs: [
            ['Law', 'a description of what always happens'],
            ['Theory', 'an explanation of why it happens'],
            ['Hypothesis', 'a specific guess, not yet tested'],
          ],
          right: 'Yes. And notice that a theory is the most substantial of the three, not the least — the opposite of how the word is used in everyday speech.',
          wrong: 'The trap is "theory". In science it means a tested explanation, not a guess.',
        },
      ],
      quizzes: [
        {
          kind: 'choice',
          q: 'Someone says "evolution is only a theory, not a law". What is wrong with that sentence?',
          options: [
            { t: 'Laws and theories are different kinds of thing, so a theory cannot be promoted to a law.', ok: true,
              why: 'Right. A law describes a pattern; a theory explains it. Neither outranks the other, and a theory never "graduates" into a law.' },
            { t: 'Nothing — theories become laws once enough evidence piles up.', ok: false,
              why: 'This is the common picture and it is not how the words work. Gravity has both: a law that says how strong the attraction is, and a theory that explains why.' },
            { t: 'Evolution is actually a law.', ok: false,
              why: 'No — it is a theory, and that is the right word for it, because it is an explanation.' },
          ],
        },
        {
          kind: 'choice',
          q: 'Which of these is a testable hypothesis?',
          options: [
            { t: 'This colourless liquid is an acid, so it will turn blue litmus paper red.', ok: true,
              why: 'Specific, and it forbids something — if the paper stays blue the guess is wrong. That is what makes it useful.' },
            { t: 'Chemical reactions are complicated.', ok: false,
              why: 'True, and it forbids nothing, so there is no way to find out whether it is wrong. Not a hypothesis.' },
            { t: 'This substance has some kind of energy in it.', ok: false,
              why: 'Too vague to test. What would it look like if it were false?' },
          ],
        },
        {
          kind: 'order',
          q: 'Put the steps in the order they actually happen.',
          items: ['Notice a pattern in what you measure', 'Guess an explanation, specific enough to be wrong',
                  'Work out something the guess says must also be true', 'Go and check whether it is'],
          right: 'That is the loop, and it runs continuously — the last step usually throws up a new pattern and it starts again.',
          wrong: 'Think about which one cannot happen until the one before it has.',
        },
        {
          kind: 'choice',
          q: 'This course will teach you a picture of the atom that physicists know is not the final word. Is that a problem?',
          options: [
            { t: 'No — it makes correct predictions about essentially all of chemistry, which is what a model is for.', ok: true,
              why: 'Right, and this is worth being comfortable with. A model is a tool, judged by whether it gets the right answers in the range you are using it. The high-school atom does.' },
            { t: 'Yes — you should only ever learn things that are exactly true.', ok: false,
              why: 'Then you would never learn anything, because nothing in science is finished. Worse, the exact version is far harder and gives the same answers here.' },
            { t: 'Only if you plan to study physics.', ok: false,
              why: 'Even then it is fine. Physicists use the simple picture constantly when it is good enough, which for chemistry it almost always is.' },
          ],
        },
      ],
      mistakes: [
        { wrong: '"It is just a theory."',
          why: 'In science a theory is a tested explanation, which is about as strong as it gets. The word for an untested guess is hypothesis.' },
        { wrong: 'Science proves things.',
          why: 'Mathematics proves things. Science accumulates evidence and rules explanations out. A theory that has survived a century of attempts to break it is extremely trustworthy, and still not proved in the mathematical sense — which is exactly why it can improve.' },
        { wrong: 'If a model is not exactly right, it is useless.',
          why: 'Every model is wrong somewhere; the question is whether it is wrong anywhere that matters for what you are doing. Treating a gas as tiny non-interacting dots is wrong, and it predicts the behaviour of the air in this room to better than a percent.' },
      ],
      recap: [
        'Atoms were worked out, not seen: whole-number mass ratios in reactions are what you would get if matter came in fixed lumps, and nothing else explains them.',
        'The loop is observation, hypothesis, prediction, test — and the prediction step is what makes it more than storytelling. A guess that forbids nothing cannot be checked.',
        'A law says what happens. A theory says why. A hypothesis is a specific guess. None of them turns into another.',
        'Models get replaced by better models, and a model that is not final can still be completely trustworthy inside its range.',
      ],
    },

    ],
  });
})();
