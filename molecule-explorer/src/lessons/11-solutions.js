/* Unit 11: Solutions. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, goto } = K;

  ME.course.unit({
    n: 11, id: 'solutions',
    title: 'Solutions',
    blurb: 'Almost all the chemistry that matters to living things happens in water. This is how dissolving works, how to say how much is dissolved, and why salt on the roads melts ice.',
    lessons: [

    {
      id: 'dissolving',
      title: 'What dissolving actually is',
      mins: 16,
      builds_on: ['polarity', 'intermolecular'],
      hook() {
        return frag(
          p('Stir salt into water and it disappears. Not melted, not destroyed — boil the water off and every grain comes back, the same weight as before.'),
          p('So where did it go? And why will exactly the same experiment fail with sand, or chalk, or candle wax?'));
      },
      pages: [
        {
          h: 'Water takes the lattice apart',
          body() {
            return frag(
              p('Salt is a lattice of Na⁺ and Cl⁻ ions, held by their attraction in every direction. Water is a bent, polar molecule with a δ− oxygen end and two δ+ hydrogens.'),
              p('When water meets the lattice, its negative ends are attracted to the sodium ions and its positive ends to the chlorides. Each ion gets surrounded by water molecules oriented towards it — a process called ', term('hydration', 'The surrounding of a dissolved ion by water molecules, oriented so their opposite charges face it. The energy released doing this is what pays for breaking the lattice apart.'), ' — and once wrapped, the ion is held away from its old neighbours and drifts off.'),
              p('So the lattice comes apart one ion at a time, and each departing ion leaves with a coat of water molecules.'),
              eq('NaCl(s) -> Na+(aq) + Cl-(aq)'),
              callout(b('And that is what (aq) means. '), 'Not "mixed with water" but "surrounded by water, as separate ions". Which is why salt water conducts electricity and solid salt does not: the charges are now free to move.'),
              h4('It is a transaction, and it has to pay'),
              p('Breaking up a lattice costs energy — it is held together strongly. Hydrating the ions releases energy. Dissolving happens when the second is enough to cover the first.'),
              table(['If hydration releases…', 'Then'], [
                ['more than breaking the lattice costs', 'it dissolves, and the solution gets warmer'],
                ['slightly less', 'it can still dissolve, taking heat from the surroundings — which is how an instant cold pack works'],
                ['much less', 'it does not dissolve. Sand and chalk are in this group.'],
              ]),
              p('The middle row is worth pausing on: dissolving can be uphill in energy and still happen, because spreading out is itself favourable. Unit 13 explains why that counts, and for now the honest version is that energy is most of the story and not all of it.'));
          },
        },
        {
          h: 'Like dissolves like, and the exceptions',
          body() {
            return frag(
              p('Unit 6 gave the rule: polar dissolves polar, non-polar dissolves non-polar. Here is the version with the mechanism attached.'),
              p('A polar solvent can do for a polar solute what water does for salt — surround it with opposite charges and hold it apart. A non-polar solvent cannot, because it has no charges to offer, so there is nothing to pay for breaking the solute apart.'),
              p('And the other direction: dropping something non-polar into water forces the water molecules to give up hydrogen bonds to make room, and gets nothing back in return. So the water squeezes it out.'),
              table(['Solute', 'Dissolves in water?', 'Why'], [
                ['sodium chloride', 'yes', 'ions, and water can hydrate them'],
                ['sugar', 'yes', 'covalent, but covered in –OH groups that hydrogen-bond to water'],
                ['ethanol', 'completely', 'small with an –OH group — it joins water’s network rather than disturbing it'],
                ['oil', 'no', 'long non-polar chains with nothing to offer water'],
                ['calcium carbonate', 'no', 'ionic, and the lattice is far too strong for hydration to pay for'],
              ]),
              warnCallout(b('So "ionic means soluble" is wrong. '), 'Chalk, barium sulfate and silver chloride are all ionic and all essentially insoluble, because their lattices are held too strongly. Ionic compounds with highly charged, small ions hold on hardest — which is exactly the pattern behind the solubility rules from Unit 8.'),
              h4('And solubility has a limit'),
              p('Keep adding salt to water and eventually no more dissolves. The solution is ', term('saturated', 'Holding as much dissolved solute as it can at that temperature. Add more and it simply sits at the bottom.'), ': ions are leaving the crystal and rejoining it at the same rate, so nothing appears to change.'),
              p('It is worth noticing that a saturated solution is not inactive — it is two opposite processes running at the same speed. That is the first appearance of an idea Unit 14 is entirely about.'),
              p('And solubility usually rises with temperature, which is why hot tea takes more sugar. Dissolve as much as possible in hot water and cool it carefully and you can get a ', b('supersaturated'), ' solution, holding more than it should — which will crystallise all at once if disturbed. That is exactly how a reusable hand warmer works.'),
              ME.sims.solutionMixer());
          },
        },
        {
          h: 'Electrolytes, and why it matters to you',
          body() {
            return frag(
              p('A substance whose solution conducts electricity is an ', term('electrolyte', 'A substance that produces ions when dissolved, so its solution conducts electricity. Salts and strong acids are electrolytes; sugar is not.'), '. It conducts because dissolving produced free ions.'),
              table(['Type', 'What happens', 'Example'], [
                ['strong electrolyte', 'dissolves and separates into ions completely', 'NaCl, HCl'],
                ['weak electrolyte', 'dissolves, and only a small fraction separates into ions', 'acetic acid — vinegar'],
                ['non-electrolyte', 'dissolves as whole molecules, no ions', 'sugar, ethanol'],
              ]),
              p('Sugar water does not conduct at all, even though the sugar has completely disappeared. Dissolving and ionising are different things, and conduction needs the second.'),
              h4('Which is why "electrolytes" is on the sports drink'),
              p('Your nerves work by moving sodium and potassium ions across cell membranes. Your muscles contract when calcium ions are released. The electrical signal that fires your heart is ions moving.'),
              p('So the ion concentrations in your blood are regulated tightly, and sweating loses both water and ions. Replacing the water without the ions dilutes what is left, which is why drinking large amounts of pure water after heavy exertion can be genuinely dangerous — a condition called hyponatraemia, low blood sodium.'),
              okCallout(b('So the marketing is, unusually, about real chemistry. '), 'The claim is not that electrolytes are magic; it is that you lose ions in sweat and your nervous system depends on their concentration. A pinch of salt in water does the same job.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why does salt water conduct electricity when solid salt does not?',
          options: [
            { t: 'Dissolving separates the lattice into free ions, and free charges can move.', ok: true,
              why: 'Right — the charges were always there, locked in place. Freeing them is what (aq) means.' },
            { t: 'Water conducts electricity and salt makes it better at it.', ok: false,
              why: 'Pure water barely conducts at all. The ions do the conducting.' },
            { t: 'Dissolving turns the ions back into atoms.', ok: false,
              why: 'They stay ions — that is precisely why the solution conducts.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'Calcium carbonate is ionic and does not dissolve in water. Why not?',
          options: [
            { t: 'Its lattice is held so strongly that hydrating the ions does not release enough to pay for breaking it.', ok: true,
              why: 'Right — dissolving is a transaction. Small, highly charged ions hold each other hardest, which is the pattern behind the whole solubility rules table.' },
            { t: 'Because it is not really ionic.', ok: false,
              why: 'It is: Ca²⁺ and CO₃²⁻. Being ionic does not guarantee solubility.' },
            { t: 'Because it is a solid.', ok: false,
              why: 'So is sodium chloride, which dissolves readily.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What does (aq) actually describe?',
          options: [
            { t: 'The substance surrounded by water molecules — for an ionic compound, as separate hydrated ions.', ok: true,
              why: 'Right, and it is a much more specific claim than "mixed with water". It is why the solution conducts and why reactions between solutions happen at all.' },
            { t: 'That it is wet.', ok: false,
              why: 'Sand can be wet without dissolving. Dissolving means individual particles surrounded by solvent.' },
            { t: 'That it has reacted with water.', ok: false,
              why: 'Usually it has not. Dissolving and reacting are different, though some substances do both.' },
          ] },
        { kind: 'choice', q: 'Sugar dissolves in water but its solution does not conduct. Why?',
          options: [
            { t: 'Sugar dissolves as whole molecules, so there are no free charges.', ok: true,
              why: 'Right — dissolving and ionising are separate things. Conduction needs ions, and sugar does not produce any.' },
            { t: 'Sugar does not really dissolve.', ok: false,
              why: 'It dissolves completely — it just does so as neutral molecules.' },
            { t: 'Sugar solutions are too thick.', ok: false,
              why: 'A dilute sugar solution is as thin as water and still does not conduct.' },
          ] },
        { kind: 'choice', q: 'An instant cold pack gets cold when the contents dissolve. What does that tell you?',
          options: [
            { t: 'Breaking the lattice cost more than hydration released, so the difference came from the surroundings.', ok: true,
              why: 'Right — and it shows dissolving does not have to be downhill in energy to happen. Spreading out is favourable on its own account, which Unit 13 takes up.' },
            { t: 'That a chemical reaction absorbed heat.', ok: false,
              why: 'Nothing reacted — the salt just dissolved. The energy went into pulling the lattice apart.' },
            { t: 'That the pack was refrigerated.', ok: false,
              why: 'It works at room temperature, which is the point of it.' },
          ] },
        { kind: 'choice', q: 'Why does oil not dissolve in water?',
          options: [
            { t: 'Making room for it costs water its hydrogen bonds and returns nothing, so the water squeezes it out.', ok: true,
              why: 'Right, and note the framing: it is not repulsion but a transaction that does not pay. Water does far better holding on to water.' },
            { t: 'Oil and water repel each other.', ok: false,
              why: 'There is a weak attraction. It is just far weaker than water-to-water.' },
            { t: 'Oil molecules are too big.', ok: false,
              why: 'Sugar molecules are larger than many oils and dissolve readily, because they are covered in –OH groups.' },
          ] },
        { kind: 'choice', q: 'What is happening in a saturated solution?',
          options: [
            { t: 'Ions are leaving the crystal and rejoining it at the same rate, so nothing appears to change.', ok: true,
              why: 'Right — and that is the first appearance of dynamic equilibrium, which Unit 14 is entirely about. Nothing has stopped; two opposite processes are simply matched.' },
            { t: 'Dissolving has stopped completely.', ok: false,
              why: 'It has not. It is exactly balanced by the reverse, which is a different and more interesting situation.' },
            { t: 'The water is full up.', ok: false,
              why: 'A useful picture and not what is happening. Heating the same water lets it hold more, without adding any room.' },
          ] },
        { kind: 'choice', q: 'Why can drinking a lot of pure water after heavy exertion be dangerous?',
          options: [
            { t: 'Sweat loses ions as well as water, and replacing only the water dilutes the ions your nerves depend on.', ok: true,
              why: 'Right — it is called hyponatraemia, and it is why "just drink more water" is not always the right advice. A pinch of salt fixes it.' },
            { t: 'Because water is a poor thirst-quencher.', ok: false,
              why: 'It quenches thirst well. The problem is what it does to the ion concentrations.' },
            { t: 'Because pure water is not sterile.', ok: false,
              why: 'A separate issue entirely. The chemistry here is about ion concentration.' },
          ] },
        { kind: 'choice', q: 'What makes a reusable hand warmer suddenly get hot when you click it?',
          options: [
            { t: 'It holds a supersaturated solution, and disturbing it makes the whole lot crystallise at once, releasing the energy that dissolving absorbed.', ok: true,
              why: 'Right — boil it afterwards to redissolve everything and it resets. A supersaturated solution is holding more than it should, and it only needs a trigger.' },
            { t: 'A chemical reaction starts.', ok: false,
              why: 'Nothing reacts — which is why it can be reset by boiling. A reaction would not be reversible that easily.' },
            { t: 'Friction from the clicking.', ok: false,
              why: 'The click only provides a nucleation site. The heat comes from crystallisation.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking all ionic compounds dissolve in water.',
          why: 'Chalk, barium sulfate and silver chloride are ionic and essentially insoluble, because their lattices are held too strongly for hydration to pay for.' },
        { wrong: 'Assuming anything that dissolves conducts.',
          why: 'Sugar dissolves completely and conducts nothing, because it dissolves as whole molecules. Conduction needs ions.' },
        { wrong: 'Treating a saturated solution as inactive.',
          why: 'Dissolving and crystallising are both still happening, at matched rates. That is equilibrium, not stasis.' },
        { wrong: 'Saying oil and water repel.',
          why: 'They attract weakly. Water simply does much better with water, so the oil gets excluded.' },
      ],
      recap: [
        'Dissolving an ionic solid means water surrounding each ion with its opposite charge and carrying it away — which is what (aq) means.',
        'It is a transaction: hydration must release enough to pay for breaking the lattice. When it nearly does, the solution gets cold instead.',
        'Like dissolves like, because a solvent has to be able to offer the solute what the solute is giving up.',
        'A saturated solution is dissolving and crystallising at matched rates — the first equilibrium in the course.',
        'Electrolytes conduct because dissolving made ions. Sugar dissolves completely and conducts nothing.',
      ],
    },

    {
      id: 'concentration',
      title: 'Concentration and dilution',
      mins: 16,
      builds_on: ['dissolving', 'the-mole'],
      hook() {
        return frag(
          p('A hospital gives drugs by concentration, not by mass. "Two grams of potassium chloride" is meaningless without knowing what it is dissolved in and how fast it goes in — and getting it wrong has killed people.'),
          p('Concentration is how much is dissolved per unit of solution, and there are several ways to say it, each used where it is most convenient.'));
      },
      pages: [
        {
          h: 'Molarity',
          body() {
            return frag(
              p('The standard measure in chemistry is ', term('molarity', 'Moles of solute per litre of solution, written M. It is the standard measure of concentration because it counts particles, which is what reactions care about.'), ': moles of solute per litre of solution.'),
              eq('M = moles of solute ÷ litres of solution'),
              p('A 1 M solution has one mole per litre. The reason chemistry prefers it over grams per litre is the reason Unit 9 gave: reactions count particles, so a measure in moles can go straight into a mole ratio without conversion.'),
              warnCallout(b('Per litre of solution, not per litre of water. '), 'To make 1 L of 1 M NaCl you do not add a mole of salt to a litre of water — you add it to less water and then top up to exactly one litre, because the salt itself takes up room. For dilute solutions the difference is small; for concentrated ones it is not.'),
              worked('What is the molarity of 20.0 g of NaOH in 500 mL of solution?', [
                { q: 'Grams to moles', why: 'NaOH is 40.00 g/mol.', maths: '20.0 / 40.00 = 0.500 mol' },
                { q: 'Volume in litres', why: 'Molarity is per litre, so convert first — forgetting this gives an answer 1000 times out.', maths: '500 mL = 0.500 L' },
                { q: 'Divide', why: 'Moles per litre.', maths: '0.500 / 0.500 = 1.00 M' },
              ]),
              h4('And the other measures'),
              table(['Measure', 'Definition', 'Used because'], [
                ['molarity (M)', 'mol solute / L solution', 'reactions count particles'],
                ['mass percent', 'mass solute / total mass × 100', 'easy to measure with a balance; used on bottles'],
                ['ppm', 'mass solute / total mass × 10⁶', 'for very dilute things — pollutants, water quality'],
                ['molality (m)', 'mol solute / kg solvent', 'does not change with temperature, because kilograms do not expand'],
              ]),
              p('Molality is the odd one out and has a real advantage: molarity changes slightly when you heat a solution, because the volume expands while the moles do not. Molality is per kilogram of solvent, and a kilogram is a kilogram at any temperature — which is why the next lesson uses it.'),
              goto('Concentration, four ways', '#/tools/concentration', 'Molarity from moles or grams, mass percent, ppm and molality.'));
          },
        },
        {
          h: 'Dilution: the moles do not change',
          body() {
            return frag(
              p('Adding water to a solution changes its concentration and not the amount of solute. That single sentence is the whole of dilution.'),
              p('Moles before equals moles after. And since moles = M × V:'),
              eq('M1 V1 = M2 V2'),
              callout(b('Which is why the formula works and is worth understanding rather than memorising. '), 'Both sides are the same number of moles, counted before and after. If you ever forget the formula, you can rebuild it from "the solute did not go anywhere".'),
              worked('How much 2.0 M HCl do you need to make 250 mL of 0.50 M HCl?', [
                { q: 'How many moles does the target contain?', why: '0.250 L × 0.50 M.', maths: '0.125 mol' },
                { q: 'What volume of the stock holds that?', why: '0.125 mol ÷ 2.0 M.', maths: '0.0625 L = 62.5 mL' },
                { q: 'So', why: 'Measure out 62.5 mL of the 2.0 M acid and add water up to 250 mL. Note that you top up to the mark rather than adding 250 mL of water.' },
                { q: 'Sanity check', why: 'You diluted by a factor of four in concentration, so the volume must grow by a factor of four: 62.5 × 4 = 250. It does.' },
              ]),
              warnCallout(b('And with concentrated acid, the order matters. '), 'Add the acid to the water, never water to the acid. Diluting concentrated sulfuric acid releases a lot of heat, and a small amount of water landing on a lot of acid can boil and spit acid back at you. A lot of water absorbs that heat safely. The mnemonic is that acid goes in the water, and it is a genuine safety rule rather than a formality.'),
              goto('Dilution calculator', '#/tools/dilution', 'Leave any one box empty and it fills it in.'));
          },
        },
        {
          h: 'Solutions in reactions',
          body() {
            return frag(
              p('Most reactions you meet in a lab happen between solutions, so stoichiometry needs one more entry point: from a volume and a concentration to moles.'),
              eq('moles = M × V(in litres)'),
              p('Which slots straight into Unit 9’s four stations, in place of grams-to-moles. The mole ratio in the middle is untouched, as always.'),
              worked('What volume of 0.100 M NaOH neutralises 25.0 mL of 0.150 M HCl?', [
                { q: 'The equation', why: 'One-to-one, which you should check rather than assume — sulfuric acid would be 1:2.', maths: 'HCl + NaOH → NaCl + H₂O' },
                { q: 'Moles of acid', why: '0.0250 L × 0.150 M.', maths: '3.75 × 10⁻³ mol' },
                { q: 'Mole ratio', why: '1:1, so the same number of moles of base.', maths: '3.75 × 10⁻³ mol NaOH' },
                { q: 'Back to a volume', why: 'Moles ÷ molarity.', maths: '3.75 × 10⁻³ / 0.100 = 0.0375 L = 37.5 mL' },
              ]),
              p('That calculation is a ', b('titration'), ', and it is how concentrations are measured in practice: react a solution of unknown concentration with a measured volume of known one, find the exact point where they have just cancelled, and work backwards. Unit 12 does the acid–base part properly.'),
              okCallout(b('Notice how little new there is here. '), 'Units 9, 10 and 11 all use the same four stations. Only the conversion at the ends changes: molar mass for a solid, molar volume or PV = nRT for a gas, and concentration times volume for a solution. That is the payoff for having learned the shape.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'numeric', after: 0,
          q: 'What is the molarity of 0.25 mol of solute in 500 mL of solution?',
          answer: 0.5, tol: 0.01,
          right: '0.50 M — 0.25 mol in 0.500 L. Converting mL to L first is the step that catches people.',
          wrong: 'Moles per litre — and 500 mL is not 500 L.' },
        { kind: 'numeric', after: 1,
          q: 'How many mL of 6.0 M HCl are needed to make 300 mL of 1.0 M HCl?',
          answer: 50, tol: 0.5,
          right: '50 mL, topped up to 300 mL. You diluted sixfold in concentration, so the volume grew sixfold.',
          wrong: 'M₁V₁ = M₂V₂, and the moles are the same on both sides.' },
      ],
      quizzes: [
        { kind: 'choice', q: 'Why does chemistry prefer molarity over grams per litre?',
          options: [
            { t: 'Because reactions count particles, so a concentration in moles goes straight into a mole ratio.', ok: true,
              why: 'Right — the same reason the mole exists at all. Grams per litre would need converting before you could use an equation.' },
            { t: 'Because moles are smaller numbers.', ok: false,
              why: 'Sometimes larger, sometimes smaller. Usability with equations is the reason.' },
            { t: 'Because grams are not precise.', ok: false,
              why: 'A balance is one of the most precise instruments in a lab. The issue is what the number can be used for.' },
          ] },
        { kind: 'choice', q: 'To make 1 L of 1 M solution, do you add one mole to one litre of water?',
          options: [
            { t: 'No — add it to less water and top up to exactly one litre, because the solute takes up room too.', ok: true,
              why: 'Right. Molarity is per litre of solution, not of solvent. For dilute solutions the difference is small; for concentrated ones it matters.' },
            { t: 'Yes, that is what 1 M means.', ok: false,
              why: 'That would give slightly more than a litre of solution, so slightly under 1 M.' },
            { t: 'No — add it to one litre and then remove some.', ok: false,
              why: 'You cannot remove solvent selectively. Make it up to the mark instead.' },
          ] },
        { kind: 'choice', q: 'Why does M₁V₁ = M₂V₂ work?',
          options: [
            { t: 'Both sides are the same number of moles — diluting adds solvent and no solute.', ok: true,
              why: 'Right, and that means you can rebuild the formula from the idea if you ever forget it: the solute did not go anywhere.' },
            { t: 'Because volume and concentration are always inversely proportional.', ok: false,
              why: 'They are here, and that is the consequence of the moles being fixed rather than a separate fact.' },
            { t: 'It is an empirical rule.', ok: false,
              why: 'It follows exactly from moles = M × V with the moles unchanged.' },
          ] },
        { kind: 'numeric', q: 'How many moles are in 250 mL of 0.40 M solution?', answer: 0.1, tol: 0.005,
          right: '0.10 mol — 0.250 L × 0.40 M.',
          wrong: 'moles = M × V in litres.' },
        { kind: 'choice', q: 'Why use molality rather than molarity in some situations?',
          options: [
            { t: 'Because it is per kilogram of solvent, which does not change with temperature, while a volume expands.', ok: true,
              why: 'Right — and it is why the next lesson’s freezing-point and boiling-point calculations use molality. A 1 M solution is not quite 1 M when you heat it.' },
            { t: 'Because it is more accurate.', ok: false,
              why: 'Both are exact definitions. One is simply temperature-independent.' },
            { t: 'Because it is easier to measure.', ok: false,
              why: 'Molarity is usually easier, since volumetric flasks are quick. Molality wins on temperature stability.' },
          ] },
        { kind: 'choice', q: 'When diluting concentrated sulfuric acid, which goes into which?',
          options: [
            { t: 'Acid into water — a lot of water absorbs the heat safely.', ok: true,
              why: 'Right, and it is a real safety rule. A little water on a lot of acid can boil instantly and spit acid back at you.' },
            { t: 'Water into acid, so the concentration falls gradually.', ok: false,
              why: 'This is the dangerous order. The first drops of water land on concentrated acid, heat violently and spit.' },
            { t: 'Either way, as long as it is slow.', ok: false,
              why: 'Slowness helps and does not fix it. The order is what controls where the heat goes.' },
          ] },
        { kind: 'numeric', q: 'What volume of 0.200 M NaOH neutralises 50.0 mL of 0.100 M HCl, in mL?',
          answer: 25, tol: 0.3,
          right: '25.0 mL. The acid contains 5.00 × 10⁻³ mol, the ratio is 1:1, and that many moles of a twice-as-concentrated base takes half the volume.',
          wrong: 'Find the moles of acid, use the 1:1 ratio, then divide by the base’s molarity.' },
        { kind: 'choice', q: 'How does solution stoichiometry differ from the four stations of Unit 9?',
          options: [
            { t: 'Only in the conversions at the ends — concentration times volume instead of molar mass.', ok: true,
              why: 'Right, and it is the same story as gases. Three units, one method, three different currencies at the ends.' },
            { t: 'The mole ratio changes with concentration.', ok: false,
              why: 'The mole ratio comes from the coefficients and never changes.' },
            { t: 'It needs a completely different method.', ok: false,
              why: 'The middle step is identical. Only the entry and exit conversions differ.' },
          ] },
      ],
      practice: ['molarity', 'dilution'],
      mistakes: [
        { wrong: 'Forgetting to convert mL to L.',
          why: 'Molarity is per litre. Using mL directly puts the answer out by a factor of a thousand, and that is the single commonest error in the topic.' },
        { wrong: 'Adding solute to a litre of water.',
          why: 'Molarity is per litre of solution. Dissolve in less and top up to the mark.' },
        { wrong: 'Adding water to concentrated acid.',
          why: 'The reverse. Acid into water, so the heat is absorbed by a large volume rather than concentrated where the first drops land.' },
        { wrong: 'Assuming a 1:1 mole ratio in a titration.',
          why: 'Check the equation. Sulfuric acid needs two moles of base per mole of acid, and assuming 1:1 halves the answer.' },
      ],
      recap: [
        'Molarity is moles per litre of solution — of solution, not of solvent — and chemistry prefers it because reactions count particles.',
        'Mass percent and ppm are convenient to measure; molality is per kilogram of solvent and so does not shift with temperature.',
        'M₁V₁ = M₂V₂ because diluting adds solvent and no solute, so both sides are the same number of moles.',
        'Acid into water, always. The heat of dilution is real and the order decides whether it is safe.',
        'Solution stoichiometry is Unit 9’s four stations with concentration times volume at the ends.',
      ],
    },

    {
      id: 'colligative',
      title: 'Why salt melts ice',
      mins: 14,
      builds_on: ['concentration', 'phase-changes'],
      hook() {
        return frag(
          p('Councils spread salt on roads in winter and it melts ice at temperatures well below zero. Antifreeze stops a car’s coolant freezing at −35 °C and stops it boiling at 120 °C — both ends, from the same bottle.'),
          p('And the striking part is that it hardly matters what you dissolve. What matters is ', em('how many particles'), ' you dissolved.'));
      },
      pages: [
        {
          h: 'Properties that only count particles',
          body() {
            return frag(
              p('A ', term('colligative property', 'A property of a solution that depends only on how many solute particles are dissolved, not on what they are. Freezing point, boiling point and osmotic pressure are the main ones.'), ' depends on the number of dissolved particles and not on their identity.'),
              p('There are four, and the first two are the ones you meet daily:'),
              table(['Property', 'What the solute does'], [
                ['freezing point', 'lowered'],
                ['boiling point', 'raised'],
                ['vapour pressure', 'lowered'],
                ['osmotic pressure', 'raised'],
              ]),
              h4('Why freezing is harder'),
              p('Freezing means water molecules locking into the ordered hexagonal arrangement of ice. Dissolved particles get in the way of that: they are scattered through the liquid and do not fit the pattern, so the molecules have to find each other around the obstacles.'),
              p('So freezing happens more slowly at any given temperature, and you have to go colder before it can happen at all. That is the freezing point being depressed.'),
              p('Meanwhile the solid ice that does form is pure water — the salt is excluded — so as more ice forms the remaining solution gets saltier and harder still to freeze. Which is why salting a road works for a while and then stops as the brine gets diluted by melting.'),
              h4('And why boiling is harder too'),
              p('Boiling means molecules escaping from the surface. Solute particles occupy some of the surface and do not evaporate, so fewer water molecules are positioned to leave. The escape rate falls, so you need a higher temperature to reach the same vapour pressure.'),
              callout(b('Same cause, opposite directions. '), 'In both cases the solute interferes with water molecules leaving the liquid — either into a solid or into a gas. So the liquid range gets wider at both ends, which is exactly what antifreeze is sold for.'));
          },
        },
        {
          h: 'How much, and why ionic compounds win',
          body() {
            return frag(
              p('The size of the effect is proportional to the concentration of ', b('particles'), ':'),
              eq('ΔT = i × K × m'),
              p('where m is the molality, K is a constant for the solvent, and ', b('i'), ' is the number of particles each formula unit produces on dissolving. That last factor is the interesting one.'),
              table(['Solute', 'i', 'Because'], [
                ['sugar', '1', 'dissolves as whole molecules'],
                ['NaCl', '2', 'gives Na⁺ and Cl⁻'],
                ['CaCl₂', '3', 'gives Ca²⁺ and two Cl⁻'],
                ['MgCl₂', '3', 'gives Mg²⁺ and two Cl⁻'],
              ]),
              okCallout(b('So one mole of CaCl₂ does three times the work of one mole of sugar. '), 'Which is exactly why road salt is a salt and not sugar, and why calcium chloride is used where it is very cold: more particles per formula unit, so more depression per kilogram spread. It also works down to about −30 °C where sodium chloride gives up around −10.'),
              p('For water, the freezing-point constant is 1.86 °C per molal. So a 1 m solution of sugar freezes at −1.86 °C, and a 1 m solution of NaCl at −3.72 °C — twice as much, from the same number of moles, because it made twice as many particles. Calcium chloride at the same molality gives −5.58 °C.'),
              p('The app works the particle count out from the formula rather than being told it, so you can try any solute:'),
              goto('Freezing and boiling points', '#/tools/colligative', 'Type a solute and a molality and it reads the particle count off the formula.'),
              warnCallout(b('This also explains why the effect uses molality. '), 'Cooling a solution towards freezing shrinks it slightly, so its molarity drifts. Molality is per kilogram of solvent and does not, which matters when the whole calculation is about a temperature change.'),
              goto('The constants, and where they came from', '#/reference/colligative', 'Four solvents, with a note that these are literature values.'));
          },
        },
        {
          h: 'Osmosis, and why it matters more than the rest',
          body() {
            return frag(
              p('Put pure water on one side of a membrane that lets water through but not solute, and a solution on the other. Water moves into the solution.'),
              p('The reason is simply that water can cross and solute cannot, so water crosses in both directions but more of it leaves the pure side, where there is more water per unit volume. The flow is called ', term('osmosis', 'The movement of solvent through a membrane that solvent can cross but solute cannot, from the more dilute side towards the more concentrated one.'), ', and the pressure needed to stop it is the osmotic pressure.'),
              p('It is a colligative property like the others, and it is the one your body cannot ignore.'),
              table(['Situation', 'What osmosis does'], [
                ['a cell in pure water', 'water floods in and it can burst — which is why a drip is saline, not water'],
                ['a cell in concentrated salt', 'water leaves and it shrivels — which is how salting preserves meat and how salt kills slugs'],
                ['your kidneys', 'concentration gradients pull water back out of the filtrate, which is how urine gets concentrated'],
                ['plant roots', 'the root interior is more concentrated than the soil water, so water is drawn in'],
                ['drinking seawater', 'it is saltier than your blood, so water leaves your tissues to dilute it — you dehydrate faster than if you had drunk nothing'],
              ]),
              callout(b('The seawater case is the one worth remembering. '), 'It is not that seawater fails to hydrate you. It is that it actively takes water out of you, because osmosis runs from dilute towards concentrated and your blood is the dilute side.'),
              p('And it is why an intravenous drip is 0.9 % saline: matched to blood so that water does not rush into or out of the cells. Pure water into a vein would burst red blood cells. A colligative property is not an academic curiosity here — it is a clinical constraint.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 1,
          q: 'Why is calcium chloride better than sodium chloride for very cold roads?',
          options: [
            { t: 'It gives three particles per formula unit rather than two, so the same amount depresses the freezing point further.', ok: true,
              why: 'Right — Ca²⁺ plus two Cl⁻. It works down to about −30 °C where NaCl gives up around −10.' },
            { t: 'It is heavier.', ok: false,
              why: 'Mass is not what counts. Colligative properties count particles.' },
            { t: 'It dissolves faster.', ok: false,
              why: 'It does dissolve readily and releases heat, which helps in practice. The main reason is the particle count.' },
          ] },
        { kind: 'choice', after: 2,
          q: 'Why does drinking seawater dehydrate you?',
          options: [
            { t: 'It is saltier than your blood, so osmosis pulls water out of your tissues to dilute it.', ok: true,
              why: 'Right — and that means it is worse than drinking nothing. Osmosis runs from dilute to concentrated, and your blood is the dilute side.' },
            { t: 'Because salt is toxic.', ok: false,
              why: 'You need salt. The problem is the concentration gradient it creates.' },
            { t: 'Because it makes you thirstier.', ok: false,
              why: 'It does, and that is the symptom. The mechanism is water leaving your tissues.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What does "colligative" mean?',
          options: [
            { t: 'Depending only on how many solute particles are dissolved, not on what they are.', ok: true,
              why: 'Right — which is genuinely surprising. Sugar and salt lower the freezing point by the same amount per particle, despite being completely different substances.' },
            { t: 'Depending on the chemical nature of the solute.', ok: false,
              why: 'The opposite. Identity is exactly what these properties ignore.' },
            { t: 'Depending on temperature.', ok: false,
              why: 'These properties change temperatures rather than depending on it.' },
          ] },
        { kind: 'choice', q: 'Why does dissolved salt lower water’s freezing point?',
          options: [
            { t: 'The dissolved particles get in the way of water molecules locking into the ice structure, so it has to be colder before they can.', ok: true,
              why: 'Right — and the ice that does form is pure water, so the remaining solution gets saltier and harder still to freeze.' },
            { t: 'Salt releases heat as it dissolves.', ok: false,
              why: 'Sodium chloride actually absorbs a little. The effect is about interfering with the ice structure, and it works for any solute.' },
            { t: 'Salt lowers water’s specific heat.', ok: false,
              why: 'Not the mechanism, and colligative properties would not care which solute it was if it were.' },
          ] },
        { kind: 'count', q: 'How many particles does one formula unit of CaCl₂ give on dissolving?', answer: 3,
          right: 'Three — one Ca²⁺ and two Cl⁻. Which is why it beats sodium chloride per mole.',
          wrong: 'Count the ions the formula produces.',
          hints: { 2: 'That is NaCl. Calcium chloride has two chlorides.' } },
        { kind: 'numeric', q: 'Water’s freezing constant is 1.86 °C/m. By how many degrees does a 1.0 m sugar solution drop? (i = 1.)',
          answer: 1.86, tol: 0.05,
          right: '1.86 °C, so it freezes at −1.86 °C. Sugar stays whole, so i = 1.',
          wrong: 'ΔT = i × K × m, with i = 1 for a molecular solute.' },
        { kind: 'numeric', q: 'Same constant. By how many degrees does a 1.0 m NaCl solution drop? (i = 2.)',
          answer: 3.72, tol: 0.05,
          right: '3.72 °C — twice as much as sugar from the same number of moles, because it made twice as many particles.',
          wrong: 'ΔT = i × K × m, and NaCl gives two particles.' },
        { kind: 'choice', q: 'Why is an intravenous drip 0.9 % saline rather than pure water?',
          options: [
            { t: 'To match blood, so osmosis does not drive water into the cells and burst them.', ok: true,
              why: 'Right — pure water into a vein would burst red blood cells. A colligative property as a clinical constraint.' },
            { t: 'To provide salt as a nutrient.', ok: false,
              why: 'It does supply some, and the concentration is chosen to match blood rather than to feed you.' },
            { t: 'To keep it sterile.', ok: false,
              why: 'Sterility is achieved separately. 0.9 % is not enough to preserve anything.' },
          ] },
        { kind: 'choice', q: 'Why does antifreeze both lower the freezing point and raise the boiling point?',
          options: [
            { t: 'Both come from the solute interfering with water molecules leaving the liquid — into a solid or into a gas.', ok: true,
              why: 'Right, one cause and two directions, which is why the same bottle widens the liquid range at both ends.' },
            { t: 'It contains two different additives.', ok: false,
              why: 'One substance does both, because both effects have the same cause.' },
            { t: 'It only really does the first.', ok: false,
              why: 'A car’s coolant genuinely runs above 100 °C, which is part of why the system works.' },
          ] },
        { kind: 'choice', q: 'Why do colligative calculations use molality rather than molarity?',
          options: [
            { t: 'Because the whole calculation is about a temperature change, and molarity shifts with temperature while molality does not.', ok: true,
              why: 'Right — volume expands and contracts, and a kilogram of solvent does not. Using molarity would mean the concentration changing as you approached the temperature you were calculating.' },
            { t: 'Because molality is easier to measure.', ok: false,
              why: 'Molarity is usually easier. Temperature stability is the reason.' },
            { t: 'Because molality gives bigger numbers.', ok: false,
              why: 'For dilute aqueous solutions they are nearly the same. The difference is temperature dependence.' },
          ] },
      ],
      mistakes: [
        { wrong: 'Thinking the identity of the solute matters.',
          why: 'Colligative properties count particles. What changes between solutes is how many particles each formula unit produces, not what they are.' },
        { wrong: 'Forgetting the i factor.',
          why: 'NaCl gives two particles and CaCl₂ three, so per mole they do two and three times the work of sugar. Leaving i out halves or thirds the answer.' },
        { wrong: 'Thinking salt melts ice by releasing heat.',
          why: 'Sodium chloride absorbs a little as it dissolves. It works by making freezing harder, and any solute would do the same.' },
        { wrong: 'Believing seawater is merely useless to drink.',
          why: 'It is worse than useless. It pulls water out of your tissues, so you dehydrate faster than if you had drunk nothing at all.' },
      ],
      recap: [
        'Colligative properties depend on how many solute particles there are, not on what they are.',
        'Freezing point falls and boiling point rises from one cause: the solute interferes with water molecules leaving the liquid.',
        'ΔT = i × K × m, and i is the particles per formula unit — which is why CaCl₂ beats NaCl beats sugar, mole for mole.',
        'Molality is used because the calculation is about temperature, and a volume changes with temperature while a kilogram does not.',
        'Osmosis runs from dilute towards concentrated, which sets the salinity of a drip, preserves meat, and makes seawater actively dehydrating.',
      ],
    },

    ],
  });
})();
