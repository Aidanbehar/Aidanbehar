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
      keywords: 'chemistry matter substance scale atoms',
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
      keywords: 'scientific method evidence experiment hypothesis theory',
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

    /* ------------------------------------------------------------ 1.3 */
    {
      id: 'measuring',
      keywords: 'units SI measurement precision accuracy uncertainty',
      title: 'Measuring things, and why the units are agreed',
      mins: 16,
      builds_on: ['what-chemistry-is'],
      hook() {
        return frag(
          p('In 1999 a spacecraft called the Mars Climate Orbiter flew into the atmosphere of Mars and broke apart. It had cost about 125 million dollars.'),
          p('The cause was units. One team had worked in pounds of force, the other in newtons, and nobody noticed. The numbers were all correct. They just meant different things.'),
          p('That is why chemistry is fussy about units, and it is also why a number without a unit is not an answer. "7" is not a mass.'));
      },
      pages: [
        {
          h: 'A measurement is a number and a unit, always',
          body() {
            return frag(
              p('Every measurement is two things stuck together: how many, and of what. Drop either half and you have nothing usable.'),
              p('And the "of what" is genuinely arbitrary — it is a human decision. There is nothing natural about a metre; somebody chose it. What matters is only that everybody chose the same one.'),
              callout(b('So: never write a bare number. '), 'In this course, an answer without its unit is marked wrong, and that is not pedantry. A mass of "7" could be 7 grams, 7 kilograms or 7 tonnes, and those are a teaspoon, a bag of sugar and a car.'));
          },
        },
        {
          h: 'The seven that everything else is built from',
          body() {
            return frag(
              p('There turn out to be only seven genuinely independent things to measure. Everything else is combinations of them.'),
              table(['Quantity', 'Unit', 'Symbol', 'A feel for it'], [
                ['Length', 'metre', 'm', 'a long stride'],
                ['Mass', 'kilogram', 'kg', 'a bag of sugar'],
                ['Time', 'second', 's', 'a heartbeat'],
                ['Amount of substance', 'mole', 'mol', 'Unit 9 is entirely about this one'],
                ['Temperature', 'kelvin', 'K', 'one kelvin is one celsius degree'],
                ['Electric current', 'ampere', 'A', 'about what a phone charger pushes'],
                ['Light intensity', 'candela', 'cd', 'roughly one candle'],
              ], 'Chemistry uses the first five constantly and the last two hardly at all.'),
              h4('Everything else is these multiplied and divided'),
              p('Volume is length cubed — a cubic metre. Density is mass divided by volume. Speed is length over time. Concentration is moles per litre. Once you see units as things you can multiply and divide, the next lesson but one becomes much easier.'),
              p('A litre, by the way, is not an SI unit at all. It is defined as exactly one cubic decimetre — a cube 10 cm on each side — and it survives because a cubic metre is an inconveniently large bucket for laboratory work.'),
              eq('1 L = 1 dm³ = 1000 cm³ = 1000 mL'),
              p('That last equality is worth knowing cold: ', b('1 mL and 1 cm³ are the same thing'), '. Medical syringes say "cc", which is cubic centimetres, which is millilitres.'));
          },
        },
        {
          h: 'Prefixes, so the numbers stay human-sized',
          body() {
            return frag(
              p('A bacterium is 0.000002 m across. A chemical bond is 0.00000000015 m long. Writing either of those out is asking for a mistake, so the SI system bolts a prefix onto the front of a unit to shift the decimal point.'),
              table(['Prefix', 'Means', 'So'], [
                ['kilo- (k)', '× 1000', '1 kg = 1000 g'],
                ['centi- (c)', '÷ 100', '1 cm = 0.01 m, so 100 cm in a metre'],
                ['milli- (m)', '÷ 1000', '1 mL = 0.001 L, so 1000 mL in a litre'],
                ['micro- (µ)', '÷ 1 000 000', 'a bacterium is about 2 µm'],
                ['nano- (n)', '÷ 1 000 000 000', 'a chemical bond is about 0.15 nm'],
                ['mega- (M)', '× 1 000 000', '1 MJ is roughly the energy in a sandwich'],
              ], 'The full table is in the Reference tab. These six cover almost everything in this course.'),
              callout('The prefix means the same thing whatever it is attached to. A kilogram is a thousand grams, a kilojoule a thousand joules, a kilometre a thousand metres. Learn the prefix once and you have it for every unit.'),
              h4('The one genuinely confusing bit'),
              p('The SI base unit of mass is the ', b('kilogram'), ', not the gram — the only base unit with a prefix already built into it, for historical reasons. In practice chemistry works in grams anyway, so it rarely bites. But it is why you will see "grams per mole" rather than "kilograms per mole".'));
          },
        },
      ],
      checkpoints: [
        {
          kind: 'choice', after: 1,
          q: 'How many millilitres are there in a litre, and why is 1 mL the same as 1 cm³?',
          options: [
            { t: '1000, and because a litre is a cube 10 cm on a side, which is 1000 cm³.', ok: true,
              why: 'Exactly. 10 × 10 × 10 = 1000, so one litre is 1000 cm³ and also 1000 mL. The two units are the same size by construction.' },
            { t: '100, and they are the same because both are small.', ok: false,
              why: 'Milli- always means a thousandth, so there are 1000 mL in a litre. And "both are small" is not a reason — they are equal because of how the litre was defined.' },
            { t: '1000, but a cm³ is a different size from a mL.', ok: false,
              why: 'The first half is right. But a litre is defined as exactly 1 dm³, and a dm³ is 1000 cm³, so a millilitre and a cubic centimetre are exactly equal.' },
          ],
        },
      ],
      quizzes: [
        { kind: 'numeric', q: 'How many grams are there in 2.5 kg?', answer: 2500, unit: 'g', tol: 0.001,
          right: '2500 g. Kilo- means a thousand, so multiply.',
          wrong: 'Kilo- means × 1000. Going from the bigger unit to the smaller one, the number has to get bigger.' },
        { kind: 'numeric', q: 'A beaker holds 250 mL. How many litres is that?', answer: 0.25, unit: 'L', tol: 0.001,
          right: '0.25 L. Milli- means a thousandth, so divide by 1000.',
          wrong: 'There are 1000 mL in a litre. Going to the bigger unit, the number gets smaller.' },
        { kind: 'numeric', q: 'A chemical bond is 0.15 nm long. How many metres is that? Use scientific notation if you like.', answer: 1.5e-10, unit: 'm', tol: 0.01,
          right: '1.5 × 10⁻¹⁰ m. Nano- is 10⁻⁹, so 0.15 nm is 0.15 × 10⁻⁹ = 1.5 × 10⁻¹⁰ m.',
          wrong: 'Nano- means a billionth, 10⁻⁹. So multiply 0.15 by 10⁻⁹.' },
        { kind: 'match',
          q: 'Match each quantity to its SI unit.',
          pairs: [['Mass', 'kilogram'], ['Length', 'metre'], ['Amount of substance', 'mole'], ['Temperature', 'kelvin']],
          right: 'Yes. Those four plus the second cover almost all of chemistry.',
          wrong: 'Watch the mass one — the base unit is the kilogram, not the gram.' },
        { kind: 'choice',
          q: 'Why was the Mars Climate Orbiter lost?',
          options: [
            { t: 'Two teams used different units and nobody converted between them.', ok: true,
              why: 'Right. Every number in the calculation was correct; they just meant different things. It is the most expensive unit error on record and a good reason to write the unit down every time.' },
            { t: 'An arithmetic mistake.', ok: false, why: 'The arithmetic was fine. The units were not.' },
            { t: 'Mars has a thicker atmosphere than expected.', ok: false,
              why: 'No — the spacecraft came in far too low, because the thrust had been calculated in pounds of force and used as newtons.' },
          ] },
        { kind: 'sort',
          q: 'Sort these into base quantities and ones built out of the base quantities.',
          categories: ['A base quantity', 'Built from others'],
          items: [
            { t: 'Mass', cat: 'A base quantity' }, { t: 'Time', cat: 'A base quantity' },
            { t: 'Length', cat: 'A base quantity' }, { t: 'Volume', cat: 'Built from others' },
            { t: 'Density', cat: 'Built from others' }, { t: 'Concentration', cat: 'Built from others' },
          ],
          right: 'Yes. Volume is length cubed, density is mass over volume, concentration is moles over volume. Recognising which are which is what makes the cancel-the-units trick work.',
          wrong: 'Ask whether it can be written as other quantities multiplied or divided.' },
      ],
      practice: 'unit-conversion',
      mistakes: [
        { wrong: 'Writing a bare number as an answer.',
          why: 'A number without a unit does not say anything. It is also the single easiest mark to lose, and in real work it is how spacecraft are lost.' },
        { wrong: 'Thinking centi- means a hundred.',
          why: 'It means a hundredth. A centimetre is smaller than a metre, so there are 100 of them in one. The prefixes below "unity" all make the unit smaller and therefore the count bigger.' },
        { wrong: 'Treating a millilitre and a cubic centimetre as different things that happen to be close.',
          why: 'They are exactly equal, by definition, because a litre is defined as exactly one cubic decimetre. There is no approximation in it.' },
      ],
      recap: [
        'A measurement is a number and a unit. Neither half is optional.',
        'Seven base quantities, of which chemistry leans on mass, length, time, amount and temperature. Everything else — volume, density, concentration — is those multiplied and divided.',
        'Prefixes shift the decimal point and mean the same thing on any unit: kilo- is a thousand times, milli- a thousandth, nano- a billionth.',
        '1 L = 1 dm³ = 1000 cm³ = 1000 mL, and a millilitre is exactly a cubic centimetre.',
      ],
    },

    /* ------------------------------------------------------------ 1.4 */
    {
      id: 'scientific-notation',
      keywords: 'scientific notation standard form powers of ten exponent',
      title: 'Scientific notation, and not counting zeros',
      mins: 14,
      builds_on: ['measuring'],
      hook() {
        return frag(
          p('There are about this many molecules in a teaspoon of water:'),
          eq('602 200 000 000 000 000 000 000'),
          p('Count the zeros. Now count them again and see whether you get the same answer.'),
          p('Nobody can reliably read a number like that, and nobody should have to. There is a better notation, and it is not a shortcut — it is a more honest way of writing the number, because it separates ', b('how big'), ' from ', b('how precisely known'), '.'));
      },
      pages: [
        {
          h: 'How it works',
          body() {
            return frag(
              p('A number in scientific notation is written as a digit, a decimal point, some more digits, times ten to a power.'),
              eq('6.022 × 10²³'),
              p('The first part is always between 1 and 10 — exactly one digit before the point. The power of ten says where the decimal point really belongs.'),
              p('A ', b('positive'), ' power means a big number: move the point right. A ', b('negative'), ' power means a small one: move it left.'),
              table(['Written out', 'Scientific notation', 'Read it as'], [
                ['3000', '3 × 10³', 'three, with the point moved three places right'],
                ['602200000000000000000000', '6.022 × 10²³', 'the number of things in a mole'],
                ['0.0015', '1.5 × 10⁻³', 'one and a half, point moved three places left'],
                ['0.00000000015', '1.5 × 10⁻¹⁰', 'the length of a chemical bond, in metres'],
                ['1', '1 × 10⁰', 'anything to the power zero is one'],
              ]),
              callout(b('The sign of the power tells you at a glance whether the number is big or small. '), 'That is most of the value of the notation. A glance at 10⁻⁹ tells you "tiny" without reading a single zero.'));
          },
        },
        {
          h: 'Converting, in both directions',
          body() {
            return frag(
              worked('Write 47 500 in scientific notation', [
                { q: 'Where does the point have to go?', why: 'Exactly one digit before it, so between the 4 and the 7: 4.75.' },
                { q: 'How far did it move?', why: 'From the end of the number to between the 4 and the 7 is four places, and it moved left. Moving the point left makes the number smaller, so to keep it the same we need a positive power.', maths: '47 500 = 4.75 × 10⁴' },
                { q: 'Check it', why: 'Is 4.75 with the point moved four places right equal to 47 500? 47.5, 475, 4750, 47 500. Yes.' },
              ]),
              worked('Write 0.000 062 in scientific notation', [
                { q: 'Point goes after the first non-zero digit', why: 'So 6.2.' },
                { q: 'How far, and which way?', why: 'From where it is to after the 6 is five places, moving right. Moving right makes the number bigger, so the power has to be negative to bring it back down.', maths: '0.000062 = 6.2 × 10⁻⁵' },
                { q: 'Sanity check', why: 'The original number is less than one, and a negative power means a number less than one. The sign agrees, which is the check worth doing every time.' },
              ]),
              p('That sanity check is the whole trick. ', b('Number bigger than 1, power is positive. Number smaller than 1, power is negative.'), ' If your sign disagrees with that, you have moved the point the wrong way — and a wrong sign is a factor of 10¹⁰ or worse, not a small slip.'));
          },
        },
        {
          h: 'Arithmetic with it, and why the exponent rules are obvious',
          body() {
            return frag(
              p('Multiplying is the easy one: multiply the fronts, add the powers.'),
              eq('(2 × 10⁵) × (3 × 10²) = 6 × 10⁷'),
              p('That is not a rule to learn. 10⁵ means five tens multiplied together, and 10² means two more, so altogether there are seven — hence 10⁷. Adding the powers is just counting how many tens you have.'),
              p('Dividing subtracts them, for the same reason: some of the tens cancel.'),
              eq('(8 × 10⁶) ÷ (2 × 10²) = 4 × 10⁴'),
              h4('Tidying up afterwards'),
              p('Sometimes the front part comes out outside the 1-to-10 range and needs fixing:'),
              eq('(5 × 10⁴) × (4 × 10³) = 20 × 10⁷ = 2 × 10⁸'),
              p('20 is not allowed as the front, so move one factor of ten across: 20 becomes 2 and the power goes up by one. The number has not changed, only the way it is written.'),
              callout(b('On a calculator '), 'this is the ', el('code', { text: 'EE' }), ' or ', el('code', { text: 'EXP' }), ' key. Typing 6.022 EE 23 gets you the right number; typing 6.022 × 10 ^ 23 usually does too, but 6.022 × 10 EE 23 gets you ten times too much, which is a classic.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'You write 0.0043 as 4.3 × 10³. What went wrong?',
          options: [
            { t: 'The sign. The number is less than one, so the power has to be negative.', ok: true,
              why: 'Exactly, and this is the check to do every single time. 4.3 × 10³ is 4300 — out by a factor of a million.' },
            { t: 'The front part should be 43.', ok: false,
              why: 'No, the front part has to be between 1 and 10, so 4.3 is right. It is the sign of the power that is wrong.' },
            { t: 'Nothing, that is correct.', ok: false,
              why: '4.3 × 10³ means 4300. The original was 0.0043. Compare the two and the problem is the sign of the exponent.' },
          ] },
      ],
      quizzes: [
        { kind: 'numeric', q: 'Write 0.000 45 in scientific notation. Type it as 4.5e-4 or 4.5 x 10^-4.', answer: 4.5e-4, tol: 0.001,
          right: '4.5 × 10⁻⁴. Point moves four places right, so the power is negative four.',
          wrong: 'One digit before the point, and the number is below 1 so the power must be negative.' },
        { kind: 'numeric', q: 'Write 8 200 000 in scientific notation.', answer: 8.2e6, tol: 0.001,
          right: '8.2 × 10⁶.',
          wrong: 'Put the point after the 8 and count how many places it moved.' },
        { kind: 'numeric', q: 'What is 3 × 10⁴ multiplied by 2 × 10³?', answer: 6e7, tol: 0.001,
          right: '6 × 10⁷. Multiply the fronts, add the powers.',
          wrong: 'Multiply 3 by 2, then count the tens: four of them and three more is seven.' },
        { kind: 'numeric', q: 'What is 9 × 10⁻³ divided by 3 × 10²?', answer: 3e-5, tol: 0.001,
          right: '3 × 10⁻⁵. Divide the fronts, subtract the powers: −3 − 2 = −5.',
          wrong: 'Dividing subtracts the exponents. Watch the signs: −3 minus 2 is −5, not −1.' },
        { kind: 'numeric', q: '(5 × 10⁵) × (6 × 10⁴) comes out as 30 × 10⁹, which is not in proper form. Write it properly — what is the coefficient?', answer: 3, tol: 0.001,
          right: '3, with the power going up to 10¹⁰. Moving a factor of ten out of the front puts it into the exponent.',
          wrong: '30 is too big for the front. Move one factor of ten across into the power.' },
        { kind: 'order',
          q: 'Put these in order, smallest first.',
          items: ['1.2 × 10⁻⁶', '9.9 × 10⁻³', '4 × 10⁰', '2.5 × 10³', '7 × 10³'],
          right: 'Yes. Compare the exponents first and only look at the fronts when the exponents tie — that is the whole reason the notation is easy to sort.',
          wrong: 'Look at the powers before you look at the numbers in front.' },
        { kind: 'choice',
          q: 'Why is scientific notation more honest than writing the number out?',
          options: [
            { t: 'It separates how big the number is from how precisely it is known.', ok: true,
              why: 'Right — and the next lesson is entirely about that second part. Writing 1200 hides whether you measured two digits or four; writing 1.200 × 10³ says four, unmistakably.' },
            { t: 'It is shorter.', ok: false,
              why: 'Often true and not the main point. 0.0043 is shorter than 4.3 × 10⁻³.' },
            { t: 'Calculators prefer it.', ok: false,
              why: 'They do handle it well, but the notation predates them by centuries.' },
          ] },
      ],
      practice: ['sigfigs', 'unit-conversion'],
      mistakes: [
        { wrong: 'Getting the sign of the exponent backwards.',
          why: 'This is the mistake, and it is never small — it is a factor of 10ⁿ². The check takes two seconds: a number bigger than one has a positive power, a number smaller than one has a negative power.' },
        { wrong: 'Leaving the front part outside 1 to 10.',
          why: '20 × 10⁷ is a correct number and not proper scientific notation. Shift one factor of ten into the exponent: 2 × 10⁸.' },
        { wrong: 'Typing 6.022 × 10 EE 23 into a calculator.',
          why: 'The EE key already means "times ten to the". So that keystroke means 6.022 × 10 × 10²³ — ten times too big. Either 6.022 EE 23, or 6.022 × 10 ^ 23. Never both.' },
      ],
      recap: [
        'A number between 1 and 10, times ten to a power. Positive power for a big number, negative for a small one.',
        'Multiplying adds the exponents and dividing subtracts them, because the exponent is just a count of how many tens you have.',
        'Fix the front part afterwards if it has drifted outside 1 to 10.',
        'And the check that catches almost every mistake: does the sign of the power agree with whether the number is bigger or smaller than one?',
      ],
    },

    /* ------------------------------------------------------------ 1.5 */
    {
      id: 'sig-figs',
      keywords: 'significant figures sig figs rounding precision',
      title: 'Significant figures, and not claiming what you do not know',
      mins: 18,
      builds_on: ['scientific-notation'],
      hook() {
        return frag(
          p('Weigh yourself on bathroom scales and they say 72 kg. Now divide by your height in metres squared, say 1.78², and the calculator says:'),
          eq('22.724403484409796'),
          p('Seventeen digits. But the scales only told you two. Where did the other fifteen come from?'),
          p('They came from nowhere. They are noise the calculator invented, and writing them down is a claim about your body mass index that you have no right to make. Significant figures are the rules for not doing that.'));
      },
      pages: [
        {
          h: 'A measurement carries its own uncertainty',
          body() {
            return frag(
              p('When a balance reads 12.4 g, it is telling you two things. The obvious one is the value. The quiet one is ', b('how sure it is'), ': the last digit it printed is the last one it can stand behind.'),
              p('So 12.4 g means something like "between 12.35 and 12.45". Write 12.40 g instead and you are making a stronger claim — "between 12.395 and 12.405" — which needs a better balance.'),
              callout('This is why 12.4 and 12.40 are the same number and different measurements. The extra zero is not decoration. It is a statement about the equipment.'),
              p('Significant figures are simply a count of how many digits a written number is standing behind. Three, in 12.4. Four, in 12.40.'));
          },
        },
        {
          h: 'Counting them',
          body() {
            return frag(
              p('Three rules, and only the third is awkward.'),
              table(['Rule', 'Why', 'Example'], [
                ['Non-zero digits always count.', 'They were measured.', '4.57 has three'],
                ['Zeros between other digits count.', 'You cannot measure a 7 after a 0 without having measured the 0.', '4.07 has three, 1002 has four'],
                ['Leading zeros never count.', 'They only say where the decimal point is.', '0.0045 has two, not four'],
              ]),
              h4('And the awkward one: trailing zeros'),
              p('A trailing zero counts ', b('only if there is a decimal point somewhere'), '.'),
              table(['Number', 'Significant figures', 'Why'], [
                ['4.500', '4', 'the decimal point is there, so the zeros were measured'],
                ['0.004500', '4', 'leading zeros do not count, trailing ones do'],
                ['4500', '2 by convention', 'no decimal point, so the zeros might just be placeholders'],
                ['4500.', '4', 'that lone decimal point is doing real work'],
              ]),
              p('The 4500 case is a genuine defect in the notation, not a rule with a reason. Nobody can tell from "4500" whether the writer measured to the nearest hundred or the nearest one, so the convention is to assume the fewest.'),
              callout(b('Which is the real reason scientific notation exists. '), '1.2 × 10³ is unmistakably two figures. 1.200 × 10³ is unmistakably four. The ambiguity vanishes entirely, which is why a careful chemist writes 4500 as 4.5 × 10³.'));
          },
        },
        {
          h: 'Carrying them through a calculation',
          body() {
            return frag(
              p('Two rules, and they are different, which catches everybody.'),
              h4('Multiplying and dividing: count the figures'),
              p('The answer gets as many significant figures as the ', b('least precise'), ' number you put in.'),
              worked('4.56 g ÷ 1.2 mL', [
                { q: 'What does the calculator say?', why: '3.7999999...', maths: '4.56 ÷ 1.2 = 3.8' },
                { q: 'How many figures are we allowed?', why: '4.56 has three, 1.2 has two. The weakest link is two, so the answer gets two.' },
                { q: 'Answer', why: 'Two figures, with the unit.', maths: '3.8 g/mL' },
              ]),
              p('The reasoning is a chain-and-weakest-link one. If one of your measurements is only good to two digits, no amount of precision elsewhere can rescue it.'),
              h4('Adding and subtracting: count the decimal places'),
              p('Here it is the ', b('decimal places'), ' that matter, not the significant figures — because adding is about absolute size, not relative.'),
              worked('12.11 g + 3.4 g', [
                { q: 'Calculator', why: '15.51', maths: '12.11 + 3.4 = 15.51' },
                { q: 'Which is less precise?', why: '3.4 is only known to one decimal place. It could be anything from 3.35 to 3.45, so the sum is uncertain in its first decimal place already.' },
                { q: 'Answer', why: 'One decimal place.', maths: '15.5 g' },
              ]),
              p('Notice that 3.4 has two significant figures and the answer has three. That is fine, and it is why adding needs its own rule: an uncertainty of ±0.05 is the same size whether it sits on 3.4 or on 15.5.'),
              callout(b('One exception worth knowing. '), 'Exact numbers do not limit anything. If a problem says "three identical flasks", that 3 is exact — it is a count, not a measurement — and so are conversion factors like 1000 mL per litre. They have infinite significant figures and never weaken an answer.'));
          },
        },
        {
          h: 'Rounding, and when to do it',
          body() {
            return frag(
              p('Look at the first digit you are dropping. Five or more, round up; less than five, round down.'),
              table(['Round this', 'To', 'Gives', 'Because'], [
                ['3.847', '3 figures', '3.85', 'the dropped digit is 7'],
                ['3.843', '3 figures', '3.84', 'the dropped digit is 3'],
                ['0.006 251', '2 figures', '0.0063', 'leading zeros are not figures; the first dropped digit is 5'],
                ['2947', '2 figures', '2.9 × 10³', 'writing 2900 would wrongly suggest two zeros were measured'],
              ], 'That last row is why rounding a large number often forces you into scientific notation.'),
              callout(b('Round once, at the end. '), 'Rounding at every step lets small errors pile up. Keep the extra digits in your calculator all the way through and round only the final answer — this is the single most useful habit in this lesson.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'count', after: 1,
          q: 'How many significant figures does 0.002 050 have?',
          answer: 4,
          right: 'Four. The two leading zeros do not count, the 2 and 5 do, the zero between them does, and the trailing zero counts because there is a decimal point.',
          wrong: 'Leading zeros never count. Zeros between digits always do. A trailing zero counts when there is a decimal point.',
          hints: { 6: 'You have counted the leading zeros. Those only locate the decimal point — 0.002050 and 2.050 are equally precise.',
                   3: 'You have dropped the trailing zero. It counts here, because the decimal point tells you it was measured.',
                   2: 'Only the 2 and the 5? The zero between them counts, and so does the last one.' } },
        { kind: 'choice', after: 2,
          q: '12.11 + 3.4 = 15.51 on the calculator. Why is the answer 15.5 and not 15.51?',
          options: [
            { t: 'Because 3.4 is only known to one decimal place, so the sum cannot be known to two.', ok: true,
              why: 'Exactly. For adding it is decimal places that limit you, not significant figures — an uncertainty of ±0.05 on the 3.4 puts the whole sum in doubt at the first decimal place.' },
            { t: 'Because 3.4 has two significant figures, so the answer gets two.', ok: false,
              why: 'That is the multiplication rule, and using it here would give 16, which is too harsh. Adding goes by decimal places: the answer has three significant figures and one decimal place.' },
            { t: 'Because you always round to one decimal place when adding.', ok: false,
              why: 'Not always — it depends on the inputs. 12.11 + 3.44 would give 15.55, to two decimal places.' },
          ] },
      ],
      quizzes: [
        { kind: 'count', q: 'How many significant figures in 4.500?', answer: 4,
          right: 'Four. The decimal point means those trailing zeros were measured.',
          wrong: 'Trailing zeros count when there is a decimal point.' },
        { kind: 'count', q: 'How many significant figures in 0.0038?', answer: 2,
          right: 'Two — the 3 and the 8. The leading zeros only place the decimal point.',
          wrong: 'Leading zeros never count.', hints: { 4: 'The zeros at the front are placeholders, not measurements.' } },
        { kind: 'count', q: 'How many significant figures in 1002?', answer: 4,
          right: 'Four. Zeros trapped between other digits always count.',
          wrong: 'Those middle zeros are not placeholders — you could not have measured the final 2 without them.',
          hints: { 2: 'The zeros are between two non-zero digits, so they had to be measured.' } },
        { kind: 'count', q: 'By convention, how many significant figures does 6000 have?', answer: 1,
          right: 'One, by convention — and this is exactly why you should write it as 6 × 10³ or 6.000 × 10³ to say what you mean.',
          wrong: 'With no decimal point, trailing zeros are assumed to be placeholders.',
          hints: { 4: 'With no decimal point there is no way to tell that those zeros were measured, so the convention assumes they were not.' } },
        { kind: 'numeric', q: '4.56 ÷ 1.2 = ? Give it to the right number of significant figures.', answer: 3.8, tol: 0.01, sig: 2,
          right: '3.8 — two figures, because 1.2 only has two.',
          wrong: 'The value is 3.8. For dividing, the answer gets as many figures as the weakest input.' },
        { kind: 'numeric', q: '2.50 × 3.2 = ? To the right number of significant figures.', answer: 8.0, tol: 0.01, sig: 2,
          right: '8.0 to two figures. And note you have to write the zero — just "8" would claim only one figure.',
          wrong: 'The value is 8. The question is how many digits you are entitled to: 3.2 has two, so two.' },
        { kind: 'numeric', q: '25.00 g − 3.1 g = ? To the right precision.', answer: 21.9, tol: 0.01,
          right: '21.9 g — one decimal place, because 3.1 only has one.',
          wrong: 'Subtracting goes by decimal places, not significant figures.' },
        { kind: 'choice',
          q: 'A problem says a solution was made in 3 identical flasks. How many significant figures does that 3 have?',
          options: [
            { t: 'It is exact, so it never limits the answer.', ok: true,
              why: 'Right. It is a count, not a measurement — there were exactly three flasks, not 3.0 ± 0.5. Counts and definitions have infinite significant figures.' },
            { t: 'One, so the whole answer is limited to one figure.', ok: false,
              why: 'That would be disastrous, and it is a common trap. The rules are about measurements; a count of objects is not a measurement.' },
            { t: 'It depends how carefully you counted.', ok: false,
              why: 'You cannot count 3.2 flasks. Counting whole objects is exact.' },
          ] },
        { kind: 'choice',
          q: 'Why should you round only at the end of a multi-step calculation?',
          options: [
            { t: 'Because rounding at each step lets small errors accumulate into a big one.', ok: true,
              why: 'Yes. Each rounding throws away a little information, and three or four of them compound. Keep the digits on the calculator and round once.' },
            { t: 'Because it is faster.', ok: false, why: 'It is, but that is not the reason. The reason is accuracy.' },
            { t: 'Because intermediate answers are always exact.', ok: false,
              why: 'They are not exact — they just have not been deliberately degraded yet, which is different.' },
          ] },
      ],
      practice: 'sigfigs',
      mistakes: [
        { wrong: 'Using the significant-figures rule for addition.',
          why: 'Multiplying and dividing count significant figures; adding and subtracting count decimal places. They genuinely are different rules, because relative uncertainty and absolute uncertainty behave differently.' },
        { wrong: 'Dropping a trailing zero that the precision requires.',
          why: 'If a calculation entitles you to two figures and the answer is 8, you have to write 8.0. Writing just "8" throws away a figure you had earned.' },
        { wrong: 'Letting a conversion factor limit the answer.',
          why: '1000 mL per litre is a definition, exact to infinite figures. So is 100 cm per metre. These never weaken your result — only measurements do.' },
        { wrong: 'Rounding after every step.',
          why: 'Errors compound. Round once, at the very end.' },
      ],
      recap: [
        'A written number claims a precision. Significant figures are the count of digits it is standing behind.',
        'Non-zero digits and trapped zeros always count; leading zeros never do; trailing zeros count only with a decimal point present.',
        'Multiplying and dividing: the answer takes the fewest significant figures of its inputs. Adding and subtracting: the fewest decimal places.',
        'Counts and definitions are exact and never limit anything.',
        'Round once, at the end — and if the rounding hides which zeros were measured, switch to scientific notation.',
      ],
    },

    /* ------------------------------------------------------------ 1.6 */
    {
      id: 'dimensional-analysis',
      keywords: 'dimensional analysis unit conversion conversion factor cancelling units',
      title: 'Dimensional analysis: the trick that runs all of chemistry',
      mins: 20,
      builds_on: ['measuring', 'sig-figs'],
      hook() {
        return frag(
          p('Here is a question you can already answer, and the method you use to answer it is the method for every calculation in this entire course.'),
          p(b('A recipe needs 3 eggs per cake. You have 18 eggs. How many cakes?')),
          p('You divided, and you knew to divide rather than multiply because 18 × 3 = 54 would obviously be silly. But how did you know it was silly? Something checked it for you, and that something has a name.'));
      },
      pages: [
        {
          h: 'Units cancel like numbers do',
          body() {
            return frag(
              p('Write the eggs question out with the units attached, as a multiplication by a fraction:'),
              eq('18 eggs × (1 cake / 3 eggs) = 6 cakes'),
              p('Look at what happened to the word "eggs". It appears on the top of the first part and on the bottom of the fraction, so it ', b('cancels'), ' — exactly the way a number would. What is left is "cakes", which is what the question asked for.'),
              p('Now try it the wrong way round on purpose:'),
              eq('18 eggs × (3 eggs / 1 cake) = 54 eggs² / cake'),
              p('Nothing cancels. The answer comes out in units of eggs squared per cake, which is not a thing. That is how you knew it was silly — and you can use that deliberately.'),
              callout(b('This is the whole idea. '), 'Set up every calculation so the units you do not want cancel and the unit you do want survives. If the units come out right, the arithmetic is almost certainly right too. If they come out wrong, you had a fraction upside down.'));
          },
        },
        {
          h: 'A conversion factor is a fraction equal to one',
          body() {
            return frag(
              p('Why is it legitimate to multiply by (1 cake / 3 eggs)? Because that fraction ', b('equals one'), '. One cake and three eggs are the same amount of stuff, described two ways, so their ratio is 1. Multiplying anything by one does not change it.'),
              p('Every conversion factor works like this. Since 1 L = 1000 mL, both of these fractions equal one:'),
              eq('(1000 mL / 1 L) = 1        (1 L / 1000 mL) = 1'),
              p('They are both correct, and which one you use depends on which unit you want to cancel. That is the only decision you ever have to make.'),
              worked('Convert 2.5 L into millilitres', [
                { q: 'What do I want to get rid of?', why: 'Litres. So litres has to end up on the bottom of the fraction, where it can cancel with the litres I already have on top.' },
                { q: 'Which version of the factor does that?', why: '(1000 mL / 1 L) — litres on the bottom.' },
                { q: 'Multiply', why: 'The L cancels and mL survives.', maths: '2.5 L × (1000 mL / 1 L) = 2500 mL' },
              ]),
              p('Notice that you never had to think about whether to multiply or divide. You picked the fraction that cancels, and the arithmetic followed. That is the point of the method — it removes the decision you are most likely to get wrong.'));
          },
        },
        {
          h: 'Chaining them together',
          body() {
            return frag(
              p('The real power shows up when there is no single factor that gets you there. Then you chain several, each cancelling the one before.'),
              worked('A car does 45 miles per gallon. How many kilometres per litre? (1 mile = 1.609 km, 1 gallon = 3.785 L)', [
                { q: 'What am I starting with and what do I want?', why: 'Starting with miles per gallon. I want kilometres per litre. So the miles have to go and become km, and the gallons have to go and become L.' },
                { q: 'Deal with the miles', why: 'Miles is on top, so I need a factor with miles on the bottom: (1.609 km / 1 mile).' },
                { q: 'Deal with the gallons', why: 'Gallons is on the bottom, so to cancel it I need a factor with gallons on top: (1 gallon / 3.785 L).' },
                { q: 'Put it all together', why: 'Miles cancels, gallons cancels, and km per L is what is left.',
                  maths: '45 mile/gal × (1.609 km / 1 mile) × (1 gal / 3.785 L) = 19.1 km/L' },
                { q: 'Check the figures', why: '45 has two significant figures, so the answer gets two: 19 km/L.' },
              ]),
              p('That is a genuinely awkward conversion done without ever wondering which way round anything goes. You laid out the units, made them cancel, and the arithmetic had no choice.'));
          },
        },
        {
          h: 'Why this is the method for the rest of the course',
          body() {
            return frag(
              p('Almost every calculation in chemistry is a conversion in disguise, and the factors are exactly the things the later units are about.'),
              table(['To convert', 'The factor is', 'Which comes from'], [
                ['grams ↔ moles', 'the molar mass, in g/mol', 'Unit 9'],
                ['moles ↔ number of particles', "Avogadro's number, 6.022 × 10²³ per mol", 'Unit 9'],
                ['moles of A ↔ moles of B', 'the coefficients in the balanced equation', 'Units 8 and 9'],
                ['moles ↔ litres of solution', 'the molarity, in mol/L', 'Unit 11'],
                ['moles of gas ↔ volume', '22.4 L/mol at STP, or PV = nRT', 'Unit 10'],
              ], 'Five factors. Chain them and you can get from almost any quantity to almost any other.'),
              callout(b('So the four-step stoichiometry you will meet in Unit 9 '), '— grams to moles, moles to moles, moles to grams — is not a new method. It is this one, with three factors chained. If you are comfortable here, that unit is mostly bookkeeping.'),
              h4('One last habit'),
              p('Write the units in every line of working, not just at the end. It costs a few seconds and it turns your own page into a checking machine: the moment something fails to cancel, you have found your mistake, and you have found it before the answer rather than after.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'You want to turn 500 mL into litres. Which fraction do you multiply by?',
          options: [
            { t: '(1 L / 1000 mL)', ok: true,
              why: 'Right. You have mL on top, so you need mL on the bottom to cancel it, leaving L. And the answer is 0.5 L, which is sensibly smaller — litres are bigger units, so there are fewer of them.' },
            { t: '(1000 mL / 1 L)', ok: false,
              why: 'That puts mL on top as well, so nothing cancels and you get mL² per L. It would also give 500 000, which is the wrong direction — going to a bigger unit must give a smaller number.' },
            { t: 'Either, as long as you divide afterwards.', ok: false,
              why: 'The point of the method is that you never have to decide separately whether to divide. Pick the fraction that cancels and the arithmetic takes care of itself.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'A calculation for a volume comes out with units of g²/mL. What does that tell you?',
          options: [
            { t: 'A factor is upside down — the answer cannot possibly be right.', ok: true,
              why: 'Exactly, and you know it before checking any arithmetic. g²/mL is not a volume, so something did not cancel. Flip whichever factor had grams the wrong way up.' },
            { t: 'The answer is right but needs converting.', ok: false,
              why: 'No conversion turns g²/mL into a volume. Those are not the same kind of quantity, which means the setup is wrong rather than the units.' },
            { t: 'It means the numbers were too big.', ok: false,
              why: 'Size has nothing to do with it. The units say the structure of the calculation is wrong.' },
          ] },
      ],
      quizzes: [
        { kind: 'numeric', q: 'Convert 3.5 kg into grams.', answer: 3500, unit: 'g', tol: 0.001,
          right: '3500 g, using (1000 g / 1 kg) so the kg cancels.',
          wrong: 'Pick the factor with kg on the bottom. Going to a smaller unit, the number gets bigger.' },
        { kind: 'numeric', q: 'Convert 750 mL into litres.', answer: 0.75, unit: 'L', tol: 0.001,
          right: '0.75 L.',
          wrong: 'You want mL to cancel, so mL goes on the bottom of the fraction.' },
        { kind: 'numeric', q: 'A tank holds 12.0 gallons. How many litres? (1 gallon = 3.785 L)', answer: 45.42, tol: 0.01,
          right: '45.4 L to three figures.',
          wrong: 'Multiply by (3.785 L / 1 gallon) so the gallons cancel.' },
        { kind: 'numeric', q: 'A reaction runs at 2.5 g per minute. How many grams in 1.5 hours?', answer: 225, unit: 'g', tol: 0.01,
          right: '225 g. Chain two factors: minutes per hour, then grams per minute.',
          wrong: 'You need (60 min / 1 hour) to turn hours into minutes first, then the rate.' },
        { kind: 'fillstep',
          q: 'Fill in the missing factor in this conversion of 5.0 miles into metres.',
          steps: [
            { text: '5.0 mile × (1609 m / 1 mile) = 8045 m' },
            { text: 'Which to two significant figures is:' },
            { blank: true, before: '', after: ' × 10³ m' },
          ],
          numeric: true, answer: 8.0, tol: 0.02,
          right: '8.0 × 10³ m. Two figures, and scientific notation because "8000" would suggest four.',
          wrong: '8045 to two significant figures. Remember why plain 8000 would be misleading.' },
        { kind: 'choice',
          q: 'Why does multiplying by a conversion factor not change the quantity?',
          options: [
            { t: 'Because the factor equals one — the top and bottom are the same amount written two ways.', ok: true,
              why: 'Exactly, and this is the bit that makes the whole method legitimate rather than a trick. 1000 mL and 1 L are the same volume, so their ratio is 1, and multiplying by 1 changes nothing.' },
            { t: 'Because the units cancel.', ok: false,
              why: 'The cancelling is what makes it useful, but it is not why it is allowed. It is allowed because the fraction is equal to one.' },
            { t: 'It does change the quantity — that is the point.', ok: false,
              why: 'It changes how the quantity is written, not the quantity. 2.5 L and 2500 mL are the same amount of liquid.' },
          ] },
        { kind: 'choice',
          q: 'What is the single best habit from this lesson?',
          options: [
            { t: 'Write the units on every line, so the page checks itself.', ok: true,
              why: 'Right. It costs seconds and it catches an upside-down factor before you have an answer to be wrong about — which is much better than catching it afterwards, or not at all.' },
            { t: 'Memorise the common conversion factors.', ok: false,
              why: 'Useful, but they are all in the Reference tab and most are on the question paper. Knowing how to arrange them is what actually matters.' },
            { t: 'Always divide when the unit is getting bigger.', ok: false,
              why: 'True as a rule of thumb, and the method makes it unnecessary — pick the fraction that cancels and you never have to remember this.' },
          ] },
      ],
      practice: ['unit-conversion', 'grams-moles'],
      mistakes: [
        { wrong: 'Writing the numbers without the units and deciding at the end whether to multiply or divide.',
          why: 'That is exactly the decision the method exists to remove. Keep the units in and the arithmetic has only one way to go.' },
        { wrong: 'Using a factor the right way up but for the wrong quantity.',
          why: 'Units catch this too. If you convert grams with a volume factor, nothing cancels. Look for the cancellation, not just for a plausible number.' },
        { wrong: 'Thinking this is a beginners’ crutch to be outgrown.',
          why: 'Working chemists write their units out. It is not a trick for people who find it hard — it is the fastest way to be sure, and it stays useful right through to the hardest calculations in the course.' },
      ],
      recap: [
        'Units cancel like numbers. Arrange a calculation so the unwanted units cancel and the wanted one survives.',
        'A conversion factor is a fraction that equals one, so multiplying by it changes the writing and not the quantity. Both ways up are correct; pick the one that cancels.',
        'Chain as many factors as the problem needs, each cancelling the last.',
        'Write the units on every line. If they come out wrong, the setup is wrong — and you find out before the answer rather than after.',
        'Almost every calculation in the rest of this course is this method with a chemistry factor in it: molar mass, Avogadro’s number, equation coefficients, molarity, or PV = nRT.',
      ],
    },

    ],
  });
})();
