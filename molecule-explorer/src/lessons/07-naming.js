/* Unit 7: Naming compounds. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, goto } = K;

  ME.course.unit({
    n: 7, id: 'naming',
    title: 'Naming compounds',
    blurb: 'A system that lets you write down a compound you have never met from its name alone, and say the name of one you have never seen. It is rules, not memory.',
    lessons: [

    {
      id: 'ionic-names',
      keywords: 'naming ionic compounds roman numerals criss cross charge balance ide ending',
      title: 'Naming ionic compounds',
      mins: 16,
      builds_on: ['why-bond', 'valence'],
      hook() {
        return frag(
          p('A chemist in Tokyo writes "magnesium nitride" and a chemist in Lagos writes Mg₃N₂, and they mean the same thing without having discussed it.'),
          p('That works because the name is not a label somebody chose. It is an instruction for building the formula, and it is reversible — so you can name a compound you have never met and write one you have never seen.'),
          p('Learning the system is a few hours. Memorising compounds one at a time is a lifetime, and there are millions.'));
      },
      pages: [
        {
          h: 'Two names, and the second one changes',
          body() {
            return frag(
              p('An ionic compound is a metal and a non-metal. The name has two words, in that order.'),
              eq('metal first, unchanged  +  non-metal with its ending swapped for -ide'),
              table(['Element', 'As an ion it is called'], [
                ['chlorine', 'chloride'],
                ['oxygen', 'oxide'],
                ['sulfur', 'sulfide'],
                ['nitrogen', 'nitride'],
                ['phosphorus', 'phosphide'],
                ['hydrogen', 'hydride'],
              ]),
              p('So NaCl is sodium chloride, MgO is magnesium oxide, K₂S is potassium sulfide. The metal keeps its name; the non-metal takes ', b('‑ide'), '.'),
              p('It is worth asking why the non-metal changes at all. The point is that "chloride" tells you it is chlorine ', em('as an ion'), ', not chlorine the green gas. The name marks the difference between the element and the ion, which are chemically nothing alike.'),
              h4('And the numbers are not in the name'),
              p('Magnesium chloride is MgCl₂, and the name says nothing about the 2. It does not need to: magnesium is always 2+ and chloride is always 1−, so the only way to balance the charges is two chlorides per magnesium.'),
              callout(b('That is the key idea for the whole lesson. '), 'An ionic formula is whatever ratio makes the charges cancel. The name gives you the ions, the periodic table gives you the charges, and the ratio follows — so it does not need to be stated.'));
          },
        },
        {
          h: 'From the name to the formula',
          body() {
            return frag(
              p('Three steps, and the third is arithmetic.'),
              table(['Step', 'What you do'], [
                ['1', 'Write both ions with their charges, from their groups in the periodic table.'],
                ['2', 'Find the smallest whole numbers of each that make the total charge zero.'],
                ['3', 'Write the metal first, with subscripts, and drop any subscript of 1.'],
              ]),
              worked('Write the formula for aluminium oxide.', [
                { q: 'The ions', why: 'Aluminium is in group 13, so 3 valence electrons to lose: Al³⁺. Oxygen is in group 16, two short of eight: O²⁻.' },
                { q: 'Balance the charges', why: 'One of each gives +3 − 2 = +1, which is not neutral. You need the smallest number of each that cancels — which is the lowest common multiple of 3 and 2, namely 6. Six units of charge means two Al³⁺ and three O²⁻.' },
                { q: 'Write it', why: 'Metal first.', maths: 'Al₂O₃' },
                { q: 'Check', why: '2 × (+3) + 3 × (−2) = +6 − 6 = 0. Neutral, as every compound must be.' },
              ]),
              h4('The criss-cross shortcut, and what it actually is'),
              p('People are often taught to write the charges and swap them diagonally: Al³⁺ and O²⁻ gives Al₂O₃. It works, and it is worth knowing that it is not a trick.'),
              p('Swapping the numbers gives you 3 × 2 = 6 units of positive charge and 2 × 3 = 6 units of negative — the same total either way, which is exactly what balance requires. It is the lowest common multiple, arrived at sideways.'),
              warnCallout(b('And it is why you must simplify afterwards. '), 'Criss-crossing Mg²⁺ and O²⁻ gives Mg₂O₂, and the compound is MgO. The shortcut finds ', em('a'), ' balancing ratio, not the simplest one, so always divide through if you can.'),
              p('The app does this both ways, and shows the working rather than just the answer:'),
              goto('Name ⇄ formula, with the rules spelled out', '#/tools/name-formula', 'Type either one and see how the other is worked out.'));
          },
        },
        {
          h: 'When the metal has a choice: Roman numerals',
          body() {
            return frag(
              p('Sodium is always 1+ and magnesium is always 2+, so their names need no extra information. Iron is not: it forms Fe²⁺ and Fe³⁺, both common, and "iron chloride" would be ambiguous.'),
              p('Unit 4 explained why. Iron’s configuration is [Ar] 4s² 3d⁶: the two 4s electrons come off first, and a 3d electron can go too without much extra cost. Two arrangements, nearly equal in energy, both real — which is what the transition metals do generally.'),
              p('So the name states the charge, as a Roman numeral in brackets:'),
              table(['Formula', 'Name', 'Why'], [
                ['FeCl₂', 'iron(II) chloride', 'two 1− chlorides, so the iron must be 2+'],
                ['FeCl₃', 'iron(III) chloride', 'three 1− chlorides, so the iron must be 3+'],
                ['CuO', 'copper(II) oxide', 'one 2− oxide, so the copper must be 2+'],
                ['Cu₂O', 'copper(I) oxide', 'one 2− oxide shared between two coppers, so 1+ each'],
              ]),
              okCallout(b('The Roman numeral is the charge on the metal, not the number of atoms. '), 'Cu₂O is copper(I) oxide even though there are two coppers. Reading it as "two" is the commonest mistake in the topic.'),
              h4('Working it out backwards'),
              p('Given a formula, you can always recover the metal’s charge, because the compound must be neutral. The anion charge is fixed and known, so the metal’s charge is whatever makes the total zero.'),
              worked('What is Fe₂O₃ called?', [
                { q: 'The part you know', why: 'Oxide is always 2−, and there are three of them.', maths: '3 × (−2) = −6' },
                { q: 'So the irons must supply +6 between them', why: 'And there are two of them.', maths: '+6 ÷ 2 = +3 each' },
                { q: 'The name', why: 'Iron at 3+ is iron(III).', maths: 'iron(III) oxide' },
              ]),
              p('A few d-block metals only ever appear with one charge and are named without a numeral — zinc, cadmium, silver, scandium, yttrium. That is a short list worth knowing, and the app marks it as learned rather than derived, because there is no rule to read it off from.'),
              goto('Ion charges read off the periodic table', '#/reference/charges', 'Which ones are derived, and which are exceptions.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'name', mode: 'formula', after: 1,
          q: 'Write the formula for calcium bromide.',
          answer: 'CaBr2',
          right: 'CaBr₂. Calcium is group 2 so 2+, bromide is 1−, so two bromides per calcium.',
          wrong: 'Calcium is in group 2 and bromine in group 17. What ratio makes the charges cancel?' },
        { kind: 'choice', after: 2,
          q: 'Cu₂O is copper(I) oxide. What does the (I) mean?',
          options: [
            { t: 'That each copper ion carries a 1+ charge.', ok: true,
              why: 'Right. One oxide at 2− shared between two coppers means 1+ each. The numeral is always the charge, never the count.' },
            { t: 'That there is one copper atom.', ok: false,
              why: 'There are two — that is what the subscript says. The numeral is the charge on each one.' },
            { t: 'That there is one oxygen atom.', ok: false,
              why: 'There is, and the numeral refers to the metal’s charge rather than any atom count.' },
          ] },
      ],
      quizzes: [
        { kind: 'name', mode: 'name', q: 'What is MgO called?', answer: 'magnesium oxide',
          right: 'Magnesium oxide. Metal unchanged, non-metal takes ‑ide, and magnesium’s charge is fixed so no numeral is needed.',
          wrong: 'Metal name first, then the non-metal with an ‑ide ending.' },
        { kind: 'name', mode: 'formula', q: 'Write the formula for potassium sulfide.', answer: 'K2S',
          right: 'K₂S — potassium is 1+ and sulfide is 2−, so two potassiums per sulfide.',
          wrong: 'Potassium is group 1 and sulfur is group 16. Balance the charges.' },
        { kind: 'name', mode: 'formula', q: 'Write the formula for aluminium sulfide.', answer: 'Al2S3',
          right: 'Al₂S₃. Al³⁺ and S²⁻: six units of charge each way.',
          wrong: 'Group 13 and group 16, so 3+ and 2−. The lowest common multiple of 3 and 2 is 6.' },
        { kind: 'name', mode: 'name', q: 'What is FeCl₃ called?', answer: 'iron(III) chloride',
          also: ['iron (III) chloride', 'iron iii chloride'],
          right: 'Iron(III) chloride. Three chlorides at 1− means the iron must be 3+.',
          wrong: 'Iron has more than one possible charge, so the name has to state it. Work it out from the chlorides.' },
        { kind: 'choice', q: 'Why does chlorine become "chloride" in a compound name?',
          options: [
            { t: 'To mark that it is the ion, which behaves nothing like the element.', ok: true,
              why: 'Right — chlorine is a toxic green gas and chloride is what you eat on chips. The ending is doing real work.' },
            { t: 'For historical reasons with no meaning.', ok: false,
              why: 'The ending genuinely distinguishes the ion from the element, which is a distinction worth having.' },
            { t: 'Because it is the second word.', ok: false,
              why: 'Position and ending are separate conventions. Polyatomic anions come second too and keep their own endings.' },
          ] },
        { kind: 'choice', q: 'Why does magnesium chloride not need a number in its name?',
          options: [
            { t: 'Both ions have fixed charges, so only one ratio balances and it can be worked out.', ok: true,
              why: 'Right — the formula is recoverable from the name, so stating the ratio would be redundant. Only a metal with a choice needs a numeral.' },
            { t: 'Because there is only one chloride.', ok: false,
              why: 'There are two: MgCl₂. The point is that you can deduce it.' },
            { t: 'Because the ratio is always 1:1.', ok: false,
              why: 'It varies. Al₂O₃ is 2:3, and neither number appears in the name.' },
          ] },
        { kind: 'choice', q: 'Criss-crossing Mg²⁺ and O²⁻ gives Mg₂O₂. What went wrong?',
          options: [
            { t: 'Nothing, except that it is not the simplest ratio — divide through and you get MgO.', ok: true,
              why: 'Right. The shortcut finds a balancing ratio rather than the simplest one, so always simplify afterwards.' },
            { t: 'The charges were wrong.', ok: false,
              why: 'Both are correct: group 2 gives 2+ and group 16 gives 2−. The arithmetic just needs reducing.' },
            { t: 'Mg₂O₂ is right.', ok: false,
              why: 'An ionic formula is the simplest whole-number ratio, so MgO it is.' },
          ] },
        { kind: 'name', mode: 'name', q: 'What is Cr₂O₃ called?', answer: 'chromium(III) oxide',
          also: ['chromium (III) oxide', 'chromium iii oxide'],
          right: 'Chromium(III) oxide. Three oxides at 2− is −6, shared between two chromiums, so 3+ each.',
          wrong: 'Chromium is a transition metal so the name needs a numeral. Work it out from the oxides: three at 2− each.' },
      ],
      practice: ['formula-to-name', 'name-to-formula'],
      mistakes: [
        { wrong: 'Reading the Roman numeral as a count of atoms.',
          why: 'It is the charge on the metal. Cu₂O is copper(I) oxide with two coppers, and CuO is copper(II) oxide with one.' },
        { wrong: 'Forgetting to simplify after criss-crossing.',
          why: 'Mg₂O₂ reduces to MgO. The shortcut gives a balancing ratio; an ionic formula is the simplest one.' },
        { wrong: 'Putting a Roman numeral after a fixed-charge metal.',
          why: '"Sodium(I) chloride" is not wrong exactly, and it is redundant — sodium has no other option. Numerals are for metals with a genuine choice.' },
        { wrong: 'Leaving the non-metal ending alone.',
          why: 'It is sodium chloride, not sodium chlorine. The ‑ide ending marks the ion, which is a different substance from the element.' },
      ],
      recap: [
        'Metal first with its name unchanged, then the non-metal with ‑ide — which marks that it is the ion, not the element.',
        'The formula is whatever simplest ratio makes the charges cancel, so the numbers never appear in the name.',
        'Criss-crossing is the lowest common multiple arrived at sideways. It works, and it needs simplifying afterwards.',
        'A Roman numeral gives the charge on a metal that has a choice — and you can always recover it from the formula, because the compound must be neutral.',
      ],
    },

    {
      id: 'polyatomic',
      keywords: 'polyatomic ions ate ite per hypo hydroxide nitrate sulfate carbonate ammonium brackets',
      title: 'Polyatomic ions',
      mins: 15,
      builds_on: ['ionic-names'],
      hook() {
        return frag(
          p('Sodium hydroxide is NaOH, and calcium hydroxide is Ca(OH)₂ — with brackets, because the OH sticks together as a unit.'),
          p('That unit is a ', b('polyatomic ion'), ': several atoms covalently bonded to each other, carrying a charge as a group. There are a few dozen worth knowing, and they turn up constantly — in fertiliser, in baking soda, in your blood, in limestone, in every battery.'),
          p('Most of this lesson is a system for the names, so that a few dozen becomes about six things to remember.'));
      },
      pages: [
        {
          h: 'A group that travels together',
          body() {
            return frag(
              p('In sulfate, SO₄²⁻, one sulfur and four oxygens are held together by covalent bonds — firmly enough that the whole group moves as one and behaves like a single ion with a 2− charge.'),
              p('So there are two kinds of bonding in one compound. Inside the sulfate the bonding is covalent; between the sulfate and the sodium it is ionic. Na₂SO₄ has both.'),
              callout(b('Which is why the brackets matter. '), 'Ca(OH)₂ means two hydroxide units. CaOH₂ would mean one oxygen and two hydrogens, which is a different thing entirely. Brackets say "two of this whole group", and leaving them out changes the formula.'),
              h4('The ones you will meet most'),
              table(['Ion', 'Formula', 'Where you meet it'], [
                ['hydroxide', 'OH⁻', 'every base — drain cleaner, soap making'],
                ['nitrate', 'NO₃⁻', 'fertiliser, explosives, cured meat'],
                ['carbonate', 'CO₃²⁻', 'limestone, chalk, eggshells, antacids'],
                ['hydrogen carbonate', 'HCO₃⁻', 'baking soda, and your blood’s pH buffer'],
                ['sulfate', 'SO₄²⁻', 'gypsum, Epsom salts, car batteries'],
                ['phosphate', 'PO₄³⁻', 'DNA’s backbone, bone, fertiliser'],
                ['ammonium', 'NH₄⁺', 'the one common positive polyatomic ion'],
              ]),
              p('Ammonium is worth flagging because it breaks the pattern: it is the only common polyatomic ion with a ', b('positive'), ' charge, so it sits where the metal usually goes. NH₄Cl is ammonium chloride, with no metal in it at all.'),
              goto('The full table, verified against PubChem', '#/reference/ions', '34 ions, grouped by charge, each checked at build time.'));
          },
        },
        {
          h: 'The ‑ate and ‑ite system',
          body() {
            return frag(
              p('The names look arbitrary until you see the pattern, and then most of them come for free.'),
              p('Take a family that differs only in how many oxygens it has. The one you meet most often gets ', b('‑ate'), '. The one with one fewer oxygen gets ', b('‑ite'), '.'),
              table(['Ending', 'Meaning', 'Example'], [
                ['‑ate', 'the common one', 'sulfate SO₄²⁻, nitrate NO₃⁻'],
                ['‑ite', 'one oxygen fewer', 'sulfite SO₃²⁻, nitrite NO₂⁻'],
              ]),
              p('The charge does not change — sulfate and sulfite are both 2−. Only the oxygen count moves, and the ending tracks it.'),
              h4('And two prefixes for the extremes'),
              p('The chlorine family has four members, so ‑ate and ‑ite are not enough. Two prefixes extend it:'),
              table(['Name', 'Formula', 'Reading'], [
                ['perchlorate', 'ClO₄⁻', 'per‑ = one more than ‑ate'],
                ['chlorate', 'ClO₃⁻', 'the reference point'],
                ['chlorite', 'ClO₂⁻', 'one fewer than ‑ate'],
                ['hypochlorite', 'ClO⁻', 'hypo‑ = one fewer than ‑ite'],
              ]),
              p('Read top to bottom and each step down removes one oxygen. Four names, one idea.'),
              okCallout(b('And hypochlorite is household bleach. '), 'Sodium hypochlorite, NaClO. It is a good oxidising agent precisely because that single oxygen is loosely held and readily handed to something else — which is what bleaching is.'),
              h4('Hydrogen in front'),
              p('Add a hydrogen to an anion and it cancels one unit of negative charge, because the hydrogen arrives as H⁺.'),
              eq('CO3 2- + H+  ->  HCO3-'),
              p('So carbonate’s 2− becomes hydrogen carbonate’s 1−. Same for sulfate to hydrogen sulfate. The older names — bicarbonate, bisulfate — mean the same thing and are still in common use on packets.'),
              p('Which is why baking soda, sodium hydrogen carbonate, is NaHCO₃ and not Na₂CO₃: the hydrogen has taken one of the two places a sodium would have filled.'));
          },
        },
        {
          h: 'Naming compounds that contain them',
          body() {
            return frag(
              p('Nothing new — the polyatomic ion keeps its own name and slots straight into the pattern from the last lesson.'),
              table(['Formula', 'Name'], [
                ['NaNO₃', 'sodium nitrate'],
                ['CaCO₃', 'calcium carbonate'],
                ['(NH₄)₂SO₄', 'ammonium sulfate'],
                ['Fe₂(SO₄)₃', 'iron(III) sulfate'],
                ['Mg(OH)₂', 'magnesium hydroxide'],
              ]),
              p('The charge balancing is identical too — the only difference is that you wrap the group in brackets before adding a subscript.'),
              worked('Write the formula for iron(III) sulfate.', [
                { q: 'The ions', why: 'The numeral tells you the iron is Fe³⁺. Sulfate is SO₄²⁻ — that one has to be known, and it is in the Reference tab.' },
                { q: 'Balance', why: 'The lowest common multiple of 3 and 2 is 6, so two Fe³⁺ and three SO₄²⁻.' },
                { q: 'Write it, with brackets', why: 'Three whole sulfate groups, so the subscript goes outside the bracket.', maths: 'Fe₂(SO₄)₃' },
                { q: 'Check', why: '2 × (+3) + 3 × (−2) = 0. And the atom count is 2 iron, 3 sulfur, 12 oxygen.' },
              ]),
              warnCallout(b('Never change what is inside the brackets. '), 'Three sulfates is (SO₄)₃, not SO₁₂ or S₃O₄. The group is a unit and its internal formula is fixed — all that changes is how many of them there are.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'Sulfate is SO₄²⁻. What is sulfite?',
          options: [
            { t: 'SO₃²⁻ — one oxygen fewer, same charge.', ok: true,
              why: 'Right. The ‑ite ending means one fewer oxygen than ‑ate, and the charge is untouched.' },
            { t: 'SO₄⁻ — same oxygens, smaller charge.', ok: false,
              why: 'The ending tracks the oxygen count, not the charge. Both are 2−.' },
            { t: 'SO₅²⁻ — one oxygen more.', ok: false,
              why: 'That direction is per‑. ‑ite is one fewer.' },
          ] },
        { kind: 'name', mode: 'formula', after: 2,
          q: 'Write the formula for calcium nitrate.',
          answer: 'Ca(NO3)2',
          right: 'Ca(NO₃)₂. Calcium is 2+ and nitrate is 1−, so two whole nitrate groups — hence the brackets.',
          wrong: 'Calcium is 2+ and nitrate is NO₃⁻. You need two nitrates, and a group being multiplied needs brackets.' },
      ],
      quizzes: [
        { kind: 'choice', q: 'Why does Ca(OH)₂ need brackets?',
          options: [
            { t: 'Because there are two whole hydroxide units, and without brackets the 2 would apply only to the hydrogen.', ok: true,
              why: 'Right — CaOH₂ would mean one oxygen and two hydrogens, which is a different formula. Brackets say "two of this group".' },
            { t: 'To make it easier to read.', ok: false,
              why: 'They change the meaning rather than the readability.' },
            { t: 'Because hydroxide has two atoms.', ok: false,
              why: 'Brackets are needed when a multi-atom group is multiplied. NaOH has hydroxide and needs none, because there is only one.' },
          ] },
        { kind: 'choice', q: 'What does hypochlorite, ClO⁻, have to do with chlorate, ClO₃⁻?',
          options: [
            { t: 'It is two oxygens fewer: hypo‑ means one fewer than ‑ite, which is itself one fewer than ‑ate.', ok: true,
              why: 'Right, and that is the whole four-member family: perchlorate, chlorate, chlorite, hypochlorite, losing an oxygen each step down.' },
            { t: 'It has a different charge.', ok: false,
              why: 'All four members of the family are 1−. Only the oxygen count changes.' },
            { t: 'It contains no chlorine.', ok: false,
              why: 'The Cl is right there in the formula — every member of the family has exactly one chlorine, and only the oxygen count varies.' },
          ] },
        { kind: 'count', q: 'Carbonate is 2−. What is the size of the charge on hydrogen carbonate?', answer: 1,
          right: '1−. The hydrogen arrives as H⁺ and cancels one unit of the negative charge.',
          wrong: 'Adding H⁺ to a 2− ion changes the total charge. By how much?' },
        { kind: 'name', mode: 'name', q: 'What is Na₂CO₃ called?', answer: 'sodium carbonate',
          right: 'Sodium carbonate — washing soda. Two sodiums at 1+ balance one carbonate at 2−.',
          wrong: 'The polyatomic ion keeps its own name, and the metal comes first as usual.' },
        { kind: 'name', mode: 'formula', q: 'Write the formula for ammonium sulfate.', answer: '(NH4)2SO4',
          right: '(NH₄)₂SO₄. Ammonium is NH₄⁺ and sulfate is SO₄²⁻, so two ammoniums — and being a group, it needs brackets.',
          wrong: 'Ammonium is the positive one here, so it goes first. Two of them balance one sulfate.' },
        { kind: 'choice', q: 'What is unusual about ammonium among the common polyatomic ions?',
          options: [
            { t: 'It is positive, so it sits where a metal normally would.', ok: true,
              why: 'Right — NH₄Cl is an ionic compound with no metal in it at all, which is worth knowing when you are trying to spot the cation.' },
            { t: 'It contains no oxygen.', ok: false,
              why: 'True, and cyanide and hydroxide-free ions exist too. Being positive is the rarer feature.' },
            { t: 'It has a 2+ charge.', ok: false,
              why: 'Ammonium is 1+ — nitrogen brings five valence electrons, four go into bonds to hydrogen, and the fifth place is paid for by giving one up.' },
          ] },
        { kind: 'match', q: 'Match each ion to its formula.',
          pairs: [['nitrate', 'NO₃⁻'], ['sulfate', 'SO₄²⁻'], ['carbonate', 'CO₃²⁻'], ['phosphate', 'PO₄³⁻']],
          right: 'Yes. These four cover a very large fraction of the compounds you will meet.',
          wrong: 'The charges go 1−, 2−, 2−, 3− in the order nitrate, sulfate, carbonate, phosphate.' },
        { kind: 'choice', q: 'Two kinds of bonding appear in Na₂SO₄. Which, and where?',
          options: [
            { t: 'Covalent inside the sulfate group, ionic between the sulfate and the sodiums.', ok: true,
              why: 'Right — and it is why the sulfate survives dissolving intact. The ionic part comes apart in water; the covalent part does not.' },
            { t: 'Ionic throughout.', ok: false,
              why: 'The S–O bonds inside the sulfate are covalent. That is what makes the group hold together as a unit.' },
            { t: 'Covalent throughout.', ok: false,
              why: 'Sodium to sulfate is a metal to a negative ion — ionic. Which is why it conducts when dissolved.' },
          ] },
      ],
      practice: ['formula-to-name', 'ion-charge'],
      mistakes: [
        { wrong: 'Dropping the brackets.',
          why: 'Ca(OH)₂ and CaOH₂ are different formulas. When a group is multiplied, the bracket is what says the whole group is multiplied.' },
        { wrong: 'Changing the inside of the bracket.',
          why: 'Three sulfates is (SO₄)₃. The group’s internal formula is fixed; only the count outside moves.' },
        { wrong: 'Thinking ‑ate and ‑ite differ in charge.',
          why: 'They differ by one oxygen. Sulfate and sulfite are both 2−; nitrate and nitrite are both 1−.' },
        { wrong: 'Looking for a metal to identify the cation.',
          why: 'Ammonium compounds have none. NH₄Cl is ionic, with a polyatomic cation.' },
      ],
      recap: [
        'A polyatomic ion is a covalently bonded group carrying a charge as a unit — so a compound like Na₂SO₄ has covalent bonding inside and ionic bonding outside.',
        'Brackets are not decoration: Ca(OH)₂ has two hydroxide groups and CaOH₂ would be something else.',
        '‑ate is the common form, ‑ite is one oxygen fewer, per‑ is one more than ‑ate and hypo‑ is one fewer than ‑ite. The charge never changes.',
        'A hydrogen in front cancels one unit of negative charge, because it arrives as H⁺ — carbonate 2− becomes hydrogen carbonate 1−.',
        'Ammonium, NH₄⁺, is the one common positive polyatomic ion, so its compounds are ionic with no metal in them.',
      ],
    },

    {
      id: 'covalent-names',
      keywords: 'greek prefixes mono di tri covalent naming acids hydro ic ous',
      title: 'Naming covalent compounds, and acids',
      mins: 16,
      builds_on: ['polyatomic', 'covalent'],
      hook() {
        return frag(
          p('Carbon and oxygen make two compounds. One is a harmless gas plants live on; the other kills people in their sleep because it binds to haemoglobin two hundred times more tightly than oxygen does.'),
          p('CO₂ and CO. One oxygen apart, and the names have to tell them apart — which is why covalent naming works completely differently from ionic naming.'));
      },
      pages: [
        {
          h: 'Here the numbers must be said out loud',
          body() {
            return frag(
              p('In an ionic compound the ratio is forced by the charges, so the name can leave it out. Two non-metals have no fixed charges — they share, and they can share in several different proportions.'),
              p('Nitrogen and oxygen alone give NO, NO₂, N₂O, N₂O₃, N₂O ₄ and N₂O₅, all real compounds with different properties. So the name has to state the count, and it does that with Greek prefixes.'),
              table(['Number', 'Prefix'], [
                ['1', 'mono‑'], ['2', 'di‑'], ['3', 'tri‑'], ['4', 'tetra‑'],
                ['5', 'penta‑'], ['6', 'hexa‑'], ['7', 'hepta‑'], ['8', 'octa‑'],
              ]),
              p('The pattern: prefix + first element, then prefix + second element with an ‑ide ending.'),
              table(['Formula', 'Name'], [
                ['CO', 'carbon monoxide'],
                ['CO₂', 'carbon dioxide'],
                ['N₂O₄', 'dinitrogen tetroxide'],
                ['P₄O₁₀', 'tetraphosphorus decoxide'],
                ['SF₆', 'sulfur hexafluoride'],
                ['CCl₄', 'carbon tetrachloride'],
              ]),
              callout(b('Two conventions that look like exceptions and are not. '), 'The first element drops mono‑: it is carbon dioxide, not monocarbon dioxide, because one is the default. And a prefix ending in a vowel drops it before another vowel — "monooxide" becomes monoxide, "tetraoxide" becomes tetroxide. Both are about how the words sound rather than about chemistry.'),
              p('So carbon monoxide has mono‑ in it and carbon dioxide has no mono‑ at all, and both are following the same rule.'));
          },
        },
        {
          h: 'Telling ionic and covalent apart before you start',
          body() {
            return frag(
              p('The two systems give different answers, so the first question about any formula is which one it is. The test is simple.'),
              table(['What you see', 'Which system', 'Example'], [
                ['metal + non-metal', 'ionic — no prefixes, numerals if the metal varies', 'FeCl₃, iron(III) chloride'],
                ['two non-metals', 'covalent — Greek prefixes', 'CCl₄, carbon tetrachloride'],
                ['a polyatomic ion', 'ionic — the group keeps its name', 'NaNO₃, sodium nitrate'],
                ['H at the front, in water', 'acid — see the next page', 'HCl, hydrochloric acid'],
              ]),
              warnCallout(b('Get this wrong and you get a wrong name, not a slightly odd one. '), 'CCl₄ named ionically would be "carbon chloride", which loses the crucial fact that there are four chlorines. FeCl₃ named covalently would be "iron trichloride", which nobody says. The metal test is worth doing first, every time.'),
              p('The one genuinely awkward case is a metalloid, which can go either way depending on what it is up against. SiO₂ is usually called silicon dioxide, treating it as covalent, which matches the fact that it really is a covalent network rather than a lattice of ions.'));
          },
        },
        {
          h: 'Acids: three patterns',
          body() {
            return frag(
              p('An acid is a compound that releases H⁺ in water — Unit 12 does this properly. For naming purposes, an acid is a formula starting with hydrogen, and what you call it depends on what the hydrogen is attached to.'),
              h4('1. No oxygen: hydro‑...‑ic acid'),
              table(['Formula', 'Name'], [
                ['HCl', 'hydrochloric acid'],
                ['HBr', 'hydrobromic acid'],
                ['H₂S', 'hydrosulfuric acid'],
              ]),
              p('The pattern is hydro‑, then the non-metal stem, then ‑ic acid. Both parts are needed: HCl is hydrochloric acid, and the "hydro" is what says there is no oxygen in it.'),
              h4('2. From an ‑ate ion: ‑ic acid'),
              h4('3. From an ‑ite ion: ‑ous acid'),
              p('When the anion contains oxygen, the ion’s ending decides the acid’s ending, and there is no hydro‑.'),
              table(['Ion', 'Acid', 'Name'], [
                ['sulfate SO₄²⁻', 'H₂SO₄', 'sulfuric acid'],
                ['sulfite SO₃²⁻', 'H₂SO₃', 'sulfurous acid'],
                ['nitrate NO₃⁻', 'HNO₃', 'nitric acid'],
                ['nitrite NO₂⁻', 'HNO₂', 'nitrous acid'],
                ['carbonate CO₃²⁻', 'H₂CO₃', 'carbonic acid'],
                ['phosphate PO₄³⁻', 'H₃PO₄', 'phosphoric acid'],
              ]),
              okCallout(b('The rhyme people use is worth knowing. '), '"‑ate becomes ‑ic, ‑ite becomes ‑ous." So if you can name the ion, you can name the acid, and the polyatomic table from the last lesson does double duty.'),
              p('Note how many hydrogens each needs: enough to cancel the anion’s charge. Sulfate is 2− so sulfuric acid is H₂SO₄; phosphate is 3− so phosphoric acid is H₃PO₄. Same balancing as any other compound, with H⁺ as the cation.'),
              p('Everything in this unit is in the app both directions, with the reasoning shown rather than just the answer:'),
              goto('Try the naming tool', '#/tools/name-formula', 'Ionic, covalent, acids and hydrates, both ways.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why is it "carbon dioxide" and not "monocarbon dioxide"?',
          options: [
            { t: 'The first element drops mono‑, because one is the default.', ok: true,
              why: 'Right. Which is also why carbon monoxide keeps its mono‑ — that prefix is on the second element, where it is doing real work.' },
            { t: 'Because there is more than one carbon.', ok: false,
              why: 'There is exactly one. The prefix is dropped by convention, not because it would be wrong.' },
            { t: 'Because carbon is a metal.', ok: false,
              why: 'Carbon is a non-metal, which is why this is a covalent name with prefixes at all.' },
          ] },
        { kind: 'name', mode: 'name', after: 1,
          q: 'What is P₂O₅ called?',
          answer: 'diphosphorus pentoxide',
          also: ['diphosphorus pentaoxide'],
          right: 'Diphosphorus pentoxide — two non-metals, so prefixes, and penta‑ drops its "a" before the vowel of oxide.',
          wrong: 'Two non-metals means Greek prefixes on both elements, and the second takes ‑ide.' },
      ],
      quizzes: [
        { kind: 'name', mode: 'name', q: 'What is N₂O₄ called?', answer: 'dinitrogen tetroxide',
          also: ['dinitrogen tetraoxide'],
          right: 'Dinitrogen tetroxide. Two nitrogens, four oxygens, and tetra‑ loses its "a" before oxide.',
          wrong: 'Both elements get a prefix here, because neither count is one.' },
        { kind: 'name', mode: 'formula', q: 'Write the formula for sulfur hexafluoride.', answer: 'SF6',
          right: 'SF₆ — and no prefix on the sulfur means one of it.',
          wrong: 'Hexa‑ is six, and the absent prefix on the first element means one.' },
        { kind: 'choice', q: 'How do you know whether to use prefixes or Roman numerals?',
          options: [
            { t: 'Prefixes for two non-metals, numerals for a metal with more than one possible charge.', ok: true,
              why: 'Right, and it is the first check to make. The two systems give genuinely different names, so guessing costs you the answer.' },
            { t: 'Prefixes are for bigger molecules.', ok: false,
              why: 'CO has two atoms and uses a prefix; Fe₂(SO₄)₃ has seventeen and does not. It is about the elements involved.' },
            { t: 'Numerals are the modern system and prefixes are old-fashioned.', ok: false,
              why: 'Both are current. They apply to different kinds of compound.' },
          ] },
        { kind: 'name', mode: 'name', q: 'H₂SO₃ contains the sulfite ion. What is it called?',
          answer: 'sulfurous acid', also: ['sulphurous acid'],
          right: 'Sulfurous acid — ‑ite becomes ‑ous.',
          wrong: 'The ion is sulfite. An ‑ite ion gives an ‑ous acid.' },
        { kind: 'name', mode: 'name', q: 'HNO₃ contains the nitrate ion. What is it called?',
          answer: 'nitric acid',
          right: 'Nitric acid — ‑ate becomes ‑ic.',
          wrong: 'The ion is nitrate. An ‑ate ion gives an ‑ic acid.' },
        { kind: 'choice', q: 'Why is HCl called hydrochloric acid rather than chloric acid?',
          options: [
            { t: 'The hydro‑ says there is no oxygen. Chloric acid is HClO₃, which is a different compound.', ok: true,
              why: 'Right — and the two really are different substances, so the prefix is carrying information rather than decorating.' },
            { t: 'Because it contains hydrogen and the others do not.', ok: false,
              why: 'Every acid contains hydrogen. Hydro‑ specifically means the anion has no oxygen in it.' },
            { t: 'They are two names for the same thing.', ok: false,
              why: 'HCl and HClO₃ are different compounds with different names.' },
          ] },
        { kind: 'count', q: 'Phosphate is 3−. How many hydrogens does phosphoric acid have?', answer: 3,
          right: 'Three — H₃PO₄. Enough H⁺ to cancel the 3−, exactly like any other charge balance.',
          wrong: 'Enough to make the compound neutral, with H⁺ as the cation.' },
        { kind: 'choice', q: 'CO and CO₂ differ by one oxygen. Does the name have to distinguish them?',
          options: [
            { t: 'Yes — two non-metals can combine in several ratios, so the name must state which one.', ok: true,
              why: 'Right, and the stakes are real: one is what plants breathe and the other binds to haemoglobin two hundred times more tightly than oxygen. Same two elements.' },
            { t: 'No — the charges force the ratio.', ok: false,
              why: 'That is true of ionic compounds. Non-metals share, and can share in more than one proportion.' },
            { t: 'No — CO is not a real compound.', ok: false,
              why: 'It is very real, and lethal.' },
          ] },
      ],
      practice: ['formula-to-name', 'name-to-formula'],
      mistakes: [
        { wrong: 'Putting mono‑ on the first element.',
          why: 'It is carbon dioxide, not monocarbon dioxide. One is the default for the first element, which is why carbon monoxide keeps the prefix on its second.' },
        { wrong: 'Writing "monooxide" or "tetraoxide".',
          why: 'A prefix ending in a vowel drops it before another vowel: monoxide, tetroxide, pentoxide. It is about how the word sounds.' },
        { wrong: 'Using prefixes on an ionic compound.',
          why: '"Iron trichloride" is not how it is said. A metal plus a non-metal gets a Roman numeral if it needs one, and never a Greek prefix.' },
        { wrong: 'Mixing up ‑ic and ‑ous.',
          why: '‑ate gives ‑ic and ‑ite gives ‑ous. Sulfate to sulfuric, sulfite to sulfurous — the more oxygen, the shorter the ending.' },
      ],
      recap: [
        'Two non-metals means Greek prefixes, because the ratio is not forced by anything and could be several things.',
        'The first element drops mono‑, and a prefix ending in a vowel loses it before another vowel: monoxide, tetroxide.',
        'Check for a metal before you start: metal plus non-metal is ionic with numerals, non-metal plus non-metal is covalent with prefixes.',
        'Acids with no oxygen are hydro‑...‑ic; from an ‑ate ion, ‑ic; from an ‑ite ion, ‑ous.',
        'The number of hydrogens in an acid is whatever cancels the anion’s charge — the same balancing as everything else in the unit.',
      ],
    },

    ],
  });
})();
