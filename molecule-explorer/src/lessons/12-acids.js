/* Unit 12: Acids and bases. */
(function () {
  'use strict';
  const ME = window.ME;
  const K = ME.kit;
  const { p, b, em, h4, frag, term, callout, warnCallout, okCallout, eq, table, worked, goto } = K;

  ME.course.unit({
    n: 12, id: 'acids',
    title: 'Acids and bases',
    blurb: 'One particle — a bare proton — and a scale that runs over fourteen orders of magnitude. This is the chemistry your blood regulates to two decimal places.',
    lessons: [

    {
      id: 'acid-base-basics',
      title: 'What acids and bases actually are',
      keywords: 'acid base arrhenius bronsted lowry proton donor acceptor conjugate pair amphoteric hydronium',
      mins: 16,
      builds_on: ['dissolving', 'covalent-names'],
      hook() {
        return frag(
          p('Vinegar, lemon juice, stomach acid, car battery acid and the rain that dissolves limestone are all doing the same chemical thing, and it comes down to one particle: a hydrogen atom that has lost its electron.'),
          p('A bare proton. No electron cloud, nothing shielding it, the smallest positive charge chemistry has — which is precisely why it is so reactive, and why a single idea explains such a range of substances.'));
      },
      pages: [
        {
          h: 'Two definitions, and why the second replaced the first',
          body() {
            return frag(
              p('The first useful definition was Arrhenius’s: an acid releases H⁺ in water, and a base releases OH⁻.'),
              eq('HCl -> H+ + Cl-        NaOH -> Na+ + OH-'),
              p('That works for the obvious cases, and it has a hole: ammonia, NH₃, is unmistakably a base — it turns litmus blue, it neutralises acids — and it contains no oxygen at all, so it cannot release hydroxide.'),
              p('The fix was to stop talking about what a substance ', em('contains'), ' and talk about what it ', em('does'), '.'),
              table(['Brønsted–Lowry', 'Definition'], [
                ['acid', 'a proton donor — it gives H⁺ away'],
                ['base', 'a proton acceptor — it takes H⁺'],
              ]),
              p('Now ammonia is a base with no difficulty: its nitrogen has a lone pair, and a lone pair is exactly what a bare proton needs.'),
              eq('NH3 + H2O -> NH4+ + OH-'),
              callout(b('And this is where Unit 6 pays off. '), 'Ammonia’s lone pair was drawn in the Lewis structure lesson — the leftover pair on the nitrogen after three bonds to hydrogen. That pair is why ammonia is a base. The dot that looked like bookkeeping turns out to be the whole explanation.'),
              p('Which also means acid–base behaviour is relative: it takes two. Nothing donates a proton into a vacuum. An acid needs a base to accept from it, and whether a substance acts as one or the other can depend on what it is up against.'));
          },
        },
        {
          h: 'Conjugate pairs, and water going both ways',
          body() {
            return frag(
              p('If an acid donates a proton, what is left is a species that could take one back — so it is a base. The two are a ', term('conjugate pair', 'An acid and the base you get by removing its proton. They differ by exactly one H⁺, and every acid–base reaction has two such pairs in it.'), ', differing by exactly one H⁺.'),
              table(['Acid', 'loses H⁺ to give', 'its conjugate base'], [
                ['HCl', '→', 'Cl⁻'],
                ['H₂O', '→', 'OH⁻'],
                ['NH₄⁺', '→', 'NH₃'],
                ['CH₃COOH', '→', 'CH₃COO⁻'],
              ]),
              p('Note the third row: ammonium is an acid and ammonia is its conjugate base. The same nitrogen, one proton apart, on opposite sides of the definition.'),
              h4('Water is both'),
              p('Look at the second row. Water can lose a proton to become OH⁻, which makes it an acid. It can also gain one to become H₃O⁺, which makes it a base. Something that can do either is ', b('amphoteric'), ', and water is the standard example.'),
              p('Which leads somewhere surprising. If water can be both, then water can react with itself:'),
              eq('H2O + H2O -> H3O+ + OH-'),
              okCallout(b('So pure water is not purely H₂O. '), 'A tiny fraction of it has swapped protons, so there are always some H₃O⁺ and OH⁻ ions present — in exactly equal numbers, since each event makes one of each. At 25 °C the concentration of each is 10⁻⁷ mol/L, which is about one molecule in 550 million.'),
              p('That number is where the pH scale comes from, and it is the subject of the next lesson.'),
              warnCallout(b('A note on H⁺ versus H₃O⁺. '), 'A bare proton does not last any measurable time in water — it attaches immediately to a water molecule to give H₃O⁺, the hydronium ion. Writing H⁺ is a convenient shorthand for that, and it is worth knowing the shorthand is what it is.'));
          },
        },
        {
          h: 'What they do, and where you meet them',
          body() {
            return frag(
              table(['Acids', 'Bases'], [
                ['taste sour — vinegar, lemon', 'taste bitter and feel slippery — soap'],
                ['turn litmus red', 'turn litmus blue'],
                ['react with metals above hydrogen to give H₂', 'react with fats to make soap'],
                ['react with carbonates to give CO₂', 'neutralise acids'],
                ['donate protons', 'accept protons'],
              ]),
              p('The carbonate reaction is worth remembering because it is so visible: drop acid on limestone, chalk or a carbonate rock and it fizzes, because carbonic acid forms and immediately falls apart into water and carbon dioxide.'),
              eq('CaCO3 + 2 HCl -> CaCl2 + H2O + CO2'),
              p('It is what makes acid rain dissolve statues, what makes an antacid tablet fizz, and what geologists use in the field to identify limestone.'),
              h4('And why "feels slippery" is a warning, not a feature'),
              p('Bases feel slippery because they react with the fats and proteins in your skin — the same reaction that turns fat into soap. That is your skin being chemically dismantled, slowly.'),
              warnCallout(b('Which is why a strong base is more dangerous than people expect. '), 'A strong acid causes immediate sharp pain, which makes you wash it off. A strong base numbs the nerve endings as it works, so it can do far more damage before you notice. Oven cleaner and drain cleaner deserve more respect than vinegar, not less.'),
              p('For reference, the app keeps a list of the strong acids and bases — short enough to know by sight, and the next lesson explains why the list matters.'),
              goto('Strong acids and bases', '#/reference/acids', 'The short list, and why it is short.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Why did the Brønsted–Lowry definition replace Arrhenius’s?',
          options: [
            { t: 'Because ammonia is clearly a base and contains no hydroxide to release, so a definition based on what a substance contains fails.', ok: true,
              why: 'Right — the fix was to define acids and bases by what they do. Ammonia accepts a proton using its lone pair, which is all "base" needs to mean.' },
            { t: 'Because Arrhenius was wrong about HCl.', ok: false,
              why: 'He was right about HCl. His definition just could not cover everything that behaves like a base.' },
            { t: 'Because it is easier to remember.', ok: false,
              why: 'It is more abstract, and it is broader — which is what earns it.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'What is the conjugate base of NH₄⁺?',
          options: [
            { t: 'NH₃ — remove one proton.', ok: true,
              why: 'Right, and it is a good illustration: ammonium is an acid and ammonia is its conjugate base, one proton apart, on opposite sides of the definition.' },
            { t: 'NH₄ — remove the charge.', ok: false,
              why: 'You cannot remove a charge on its own. Removing H⁺ takes away a proton and its charge together, which gives NH₃.' },
            { t: 'OH⁻.', ok: false,
              why: 'A conjugate pair differs by exactly one H⁺ from each other, and there is no oxygen in ammonium.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'In Brønsted–Lowry terms, what is an acid?',
          options: [
            { t: 'A proton donor.', ok: true,
              why: 'Right, and defining it by behaviour rather than contents is what lets it cover ammonia and every other awkward case.' },
            { t: 'Something containing hydrogen.', ok: false,
              why: 'Methane contains four hydrogens and is not remotely acidic. Donating one is the test.' },
            { t: 'Something that releases hydroxide.', ok: false, why: 'That is a base, in the Arrhenius sense.' },
          ] },
        { kind: 'choice', q: 'What makes ammonia a base despite containing no oxygen?',
          options: [
            { t: 'Its nitrogen has a lone pair, which is exactly what a bare proton attaches to.', ok: true,
              why: 'Right — and that lone pair was drawn back in the Lewis structure lesson, where it looked like bookkeeping. It turns out to be the whole explanation.' },
            { t: 'It dissolves in water.', ok: false,
              why: 'So does sugar, which is neither an acid nor a base.' },
            { t: 'It has a strong smell.', ok: false, why: 'Smell has nothing to do with proton transfer.' },
          ] },
        { kind: 'choice', q: 'What does amphoteric mean, and what is the standard example?',
          options: [
            { t: 'Able to act as either an acid or a base — and water is the example.', ok: true,
              why: 'Right. Water can lose a proton to give OH⁻ or gain one to give H₃O⁺, which is why it can react with itself.' },
            { t: 'Neither acidic nor basic.', ok: false,
              why: 'That is neutral. Amphoteric means capable of both, which is a stronger claim.' },
            { t: 'Strongly acidic.', ok: false, why: 'Nothing about strength — it is about which role a substance can play.' },
          ] },
        { kind: 'choice', q: 'Why is writing H⁺ in water a shorthand?',
          options: [
            { t: 'Because a bare proton attaches to a water molecule immediately, giving H₃O⁺.', ok: true,
              why: 'Right — a naked proton has no measurable lifetime in water. H⁺ is a convenient way of writing hydronium.' },
            { t: 'Because H⁺ does not exist.', ok: false,
              why: 'It exists — it is a proton, and there are plenty in a nucleus. It just does not stay bare in water.' },
            { t: 'Because it is really H₂.', ok: false,
              why: 'H₂ is hydrogen gas, which is neutral and quite different.' },
          ] },
        { kind: 'choice', q: 'Why does acid fizz on limestone?',
          options: [
            { t: 'The carbonate becomes carbonic acid, which falls apart into water and carbon dioxide.', ok: true,
              why: 'Right, and it is a genuinely useful field test — geologists carry dilute acid to identify limestone. It is also what dissolves statues.' },
            { t: 'The limestone melts.', ok: false,
              why: 'Nothing melts. A new gas is being produced, which is what the fizzing is.' },
            { t: 'Oxygen is released.', ok: false,
              why: 'The gas is carbon dioxide, from the carbonate.' },
          ] },
        { kind: 'choice', q: 'Why is a strong base arguably more dangerous than a strong acid?',
          options: [
            { t: 'It numbs nerve endings as it dismantles skin, so it can do more damage before you notice.', ok: true,
              why: 'Right — and the slippery feel is that reaction happening. A strong acid hurts immediately, which at least makes you wash it off.' },
            { t: 'Bases are more concentrated.', ok: false,
              why: 'Concentration is independent of which it is. The difference is in how quickly you notice.' },
            { t: 'Bases are more common.', ok: false,
              why: 'Both are common enough. The hazard difference is about the warning signal.' },
          ] },
        { kind: 'match', q: 'Match each acid to its conjugate base.',
          pairs: [['HCl', 'Cl⁻'], ['H₂O', 'OH⁻'], ['NH₄⁺', 'NH₃'], ['CH₃COOH', 'CH₃COO⁻']],
          right: 'Yes — each pair differs by exactly one H⁺, and every acid–base reaction contains two such pairs.',
          wrong: 'Remove one H⁺ from the acid. That takes away a proton and its positive charge together.' },
      ],
      mistakes: [
        { wrong: 'Thinking anything containing hydrogen is an acid.',
          why: 'Methane has four hydrogens and no acidity at all. What matters is whether it will let one go as H⁺.' },
        { wrong: 'Thinking a base must contain OH.',
          why: 'Ammonia has none and is definitively a base. The Brønsted–Lowry definition exists precisely to cover it.' },
        { wrong: 'Removing the charge instead of the proton when finding a conjugate base.',
          why: 'H⁺ takes its charge with it. NH₄⁺ minus H⁺ is NH₃, not NH₄.' },
        { wrong: 'Assuming strong bases are safer than strong acids.',
          why: 'They can be worse, because they anaesthetise while they work. The slippery feel is your skin being converted to soap.' },
      ],
      recap: [
        'The whole topic turns on one particle: H⁺, a bare proton, the smallest positive charge in chemistry.',
        'Brønsted–Lowry defines an acid as a proton donor and a base as a proton acceptor — behaviour rather than contents, which is what lets it cover ammonia.',
        'A conjugate pair differs by exactly one H⁺, so every acid has a base waiting on the other side of it.',
        'Water is amphoteric and reacts with itself, giving 10⁻⁷ mol/L each of H₃O⁺ and OH⁻ in pure water at 25 °C.',
        'H⁺ in water is shorthand for H₃O⁺, because a bare proton attaches to a water molecule instantly.',
      ],
    },

    {
      id: 'ph',
      title: 'The pH scale, and why it is logarithmic',
      keywords: 'pH pOH Kw water ionisation buffer logarithm acid rain ocean acidification',
      mins: 16,
      builds_on: ['acid-base-basics', 'scientific-notation'],
      hook() {
        return frag(
          p('Stomach acid is about pH 1.5. Blood is 7.4. Household ammonia is 11.'),
          p('Those look like small differences on a scale of fourteen. They are not: stomach acid has about eight hundred thousand times more H⁺ than blood does.'),
          p('The scale hides that on purpose, and understanding why is most of what makes pH make sense.'));
      },
      pages: [
        {
          h: 'A scale for a quantity that spans fourteen orders of magnitude',
          body() {
            return frag(
              p('Hydrogen ion concentrations in ordinary solutions run from about 1 mol/L down to 10⁻¹⁴ mol/L. Writing those out is unusable, and comparing them by eye is worse.'),
              p('So we take the negative logarithm:'),
              eq('pH = −log[H+]'),
              p('The minus sign is there just to make the answers positive, since the concentrations are all small. The log is the part doing real work — it turns "times ten" into "plus one".'),
              table(['[H⁺] in mol/L', 'pH', 'Roughly'], [
                ['1', '0', 'battery acid'],
                ['10⁻²', '2', 'lemon juice'],
                ['10⁻⁴', '4', 'wine, acid rain'],
                ['10⁻⁷', '7', 'pure water'],
                ['10⁻⁹', '9', 'baking soda solution'],
                ['10⁻¹²', '12', 'household ammonia'],
                ['10⁻¹⁴', '14', 'drain cleaner'],
              ]),
              callout(b('Each pH unit is a factor of ten. '), 'So pH 3 is ten times more acidic than pH 4 and a hundred times more than pH 5. This is the single thing people most often miss, and it is exactly why the scale exists — to make enormous ratios comparable.'),
              p('And the sign is worth watching: ', b('lower pH means more acidic'), ', because the minus sign flips the direction. A large H⁺ concentration gives a small pH.'),
              ME.sims.phScale());
          },
        },
        {
          h: 'Why 7 is the middle, and why it is not always',
          body() {
            return frag(
              p('7 is not an arbitrary midpoint. It comes out of water’s self-ionisation from the last lesson.'),
              p('In pure water at 25 °C, each of H₃O⁺ and OH⁻ sits at 10⁻⁷ mol/L. So the pH is −log(10⁻⁷) = 7, and that is what neutral means: equal amounts of the two.'),
              p('Multiply the two concentrations together and you get a constant:'),
              eq('Kw = [H+][OH-] = 1.0 × 10⁻¹⁴ at 25 °C'),
              p('This is the most useful fact in the lesson, because it means the two are locked together. Push H⁺ up and OH⁻ must come down, by exactly the factor needed to keep the product at 10⁻¹⁴. There is no such thing as a solution with a lot of both.'),
              eq('pH + pOH = 14'),
              okCallout(b('Which means you only ever have to measure one of them. '), 'Know the pH and the pOH follows, and so do both concentrations. One measurement, four numbers.'),
              warnCallout(b('And that "at 25 °C" is not decoration. '), 'Kᵤᵥ rises with temperature, because heating pushes the self-ionisation along. At 50 °C neutral water has a pH of about 6.6 — and it is still neutral, because H⁺ and OH⁻ are still equal. So neutral means equal amounts, not pH 7. Body temperature water is slightly below 7 and perfectly neutral.'),
              h4('A quick way to read a pH without a calculator'),
              p('If [H⁺] = 1 × 10⁻ⁿ, the pH is exactly n. If the number in front is not 1, the pH sits between n−1 and n — so 5 × 10⁻⁴ gives a pH of about 3.3, since 5 is most of the way to 10.'),
              p('That estimate is enough to catch a calculator slip, which is the main thing worth having.'));
          },
        },
        {
          h: 'Where pH matters, and how tightly',
          body() {
            return frag(
              p('pH is one of those quantities where a small number hides a large consequence, and a few examples make the point better than a general statement.'),
              table(['System', 'pH', 'What happens if it moves'], [
                ['blood', '7.35 to 7.45', 'outside about 6.8 to 7.8 is fatal — a range of one pH unit total'],
                ['stomach', '1.5 to 3.5', 'too high and you cannot digest protein; too low and you get ulcers'],
                ['ocean surface', 'about 8.1, down from 8.2', 'a 0.1 drop is already a 26 % rise in H⁺, and it dissolves the shells of marine organisms'],
                ['swimming pool', '7.2 to 7.8', 'outside it, chlorine stops working or the water stings'],
                ['soil', 'crop-dependent', 'a plant in the wrong pH cannot take up iron, whatever the soil contains'],
              ]),
              p('The ocean row is the one worth sitting with. A change from 8.2 to 8.1 sounds negligible. On a log scale it is a 26 % increase in hydrogen ion concentration, and it is enough to make it measurably harder for shellfish and corals to build calcium carbonate. Reading the scale correctly changes what you conclude from the number.'),
              h4('And your blood does it with a buffer'),
              p('Blood holds its pH within about 0.1 unit despite your constantly producing acid. It manages that with a ', term('buffer', 'A solution that resists pH change, because it contains both a weak acid and its conjugate base — so it can absorb added H⁺ or OH⁻.'), ': a mixture of carbonic acid and hydrogen carbonate.'),
              p('The mechanism is neat. Add acid and the hydrogen carbonate mops up the extra H⁺. Add base and the carbonic acid gives up an H⁺ to replace what was removed. Having both halves of a conjugate pair present means there is something ready to absorb a change in either direction.'),
              eq('H2CO3 + H2O <-> HCO3- + H3O+'),
              p('Which is also why you breathe faster when you exercise. The CO₂ your muscles produce becomes carbonic acid in your blood, and breathing it off is how you get rid of the acid. Your respiratory rate is, among other things, a pH control system.'),
              goto('pH calculator', '#/tools/ph', 'Between pH, pOH, [H⁺] and [OH⁻], with the working shown.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'How much more acidic is pH 3 than pH 6?',
          options: [
            { t: 'A thousand times — three factors of ten.', ok: true,
              why: 'Right. Each pH unit is a factor of ten, so three units is 10³. Reading the scale as linear is the commonest mistake in the topic.' },
            { t: 'Twice as acidic.', ok: false,
              why: 'That would be a linear scale. pH is logarithmic, so each unit multiplies by ten.' },
            { t: 'Three times.', ok: false,
              why: 'Three pH units, and each one is a factor of ten, so 10 × 10 × 10.' },
          ] },
        { kind: 'numeric', after: 1,
          q: 'A solution has a pOH of 4. What is its pH?',
          answer: 10, tol: 0.05,
          right: '10 — pH + pOH = 14. And a pH of 10 means basic, which fits a low pOH.',
          wrong: 'pH + pOH = 14 at 25 °C, because the product of the two concentrations is fixed.' },
      ],
      quizzes: [
        { kind: 'numeric', q: 'What is the pH of a solution with [H⁺] = 1 × 10⁻³ mol/L?', answer: 3, tol: 0.05,
          right: 'pH 3 — the negative log of 10⁻³.',
          wrong: 'pH = −log[H⁺], and for a clean power of ten the pH is just the exponent without its sign.' },
        { kind: 'numeric', q: 'What is the pOH of a solution with pH 2?', answer: 12, tol: 0.05,
          right: '12 — they add to 14.',
          wrong: 'pH + pOH = 14.' },
        { kind: 'choice', q: 'Why is pH logarithmic?',
          options: [
            { t: 'Because hydrogen ion concentrations span fourteen orders of magnitude, and a log scale makes those ratios comparable.', ok: true,
              why: 'Right — from about 1 mol/L to 10⁻¹⁴. A linear scale would be unusable, and the cost is that people misread the differences as small.' },
            { t: 'To make the numbers smaller.', ok: false,
              why: 'It does, and the reason is the range. Compressing an enormous range into a readable one is the job.' },
            { t: 'Because acids are logarithmic.', ok: false,
              why: 'Acids are not anything of the sort. The scale is a choice about how to report a concentration.' },
          ] },
        { kind: 'choice', q: 'What does pH 7 mean, exactly?',
          options: [
            { t: 'That [H⁺] is 10⁻⁷ mol/L, which is where pure water sits at 25 °C.', ok: true,
              why: 'Right — and it is neutral at that temperature because H⁺ and OH⁻ are equal there. Neutral means equal, and pH 7 is where that happens at 25 °C.' },
            { t: 'That the solution contains no ions.', ok: false,
              why: 'It contains 10⁻⁷ mol/L of each — small but not zero, and enough to define the whole scale.' },
            { t: 'That it is exactly neutral at every temperature.', ok: false,
              why: 'Neutral water at 50 °C has a pH of about 6.6. Neutral means equal amounts, not the number 7.' },
          ] },
        { kind: 'choice', q: 'Can a solution have a high concentration of both H⁺ and OH⁻?',
          options: [
            { t: 'No — their product is fixed at 10⁻¹⁴, so raising one forces the other down.', ok: true,
              why: 'Right, and that is why one measurement gives you all four numbers. They are locked together.' },
            { t: 'Yes, in a concentrated solution.', ok: false,
              why: 'Concentration does not release them from Kᵤᵥ. The product stays fixed.' },
            { t: 'Yes, in a buffer.', ok: false,
              why: 'A buffer holds a weak acid and its conjugate base, which is a different thing. Kᵤᵥ still applies.' },
          ] },
        { kind: 'choice', q: 'The ocean has gone from pH 8.2 to 8.1. Why does that matter?',
          options: [
            { t: 'Because on a log scale that is a 26 % rise in H⁺, which measurably impedes shell building.', ok: true,
              why: 'Right, and it is a good example of the scale changing what you conclude. 0.1 sounds like nothing and is not.' },
            { t: 'It does not — 0.1 is within measurement error.', ok: false,
              why: 'Ocean pH is measured far more precisely than that, and the change is a real 26 % in concentration.' },
            { t: 'Because 8.1 is acidic.', ok: false,
              why: 'It is still basic. What matters is the direction and size of the change.' },
          ] },
        { kind: 'choice', q: 'How does a buffer resist pH change?',
          options: [
            { t: 'It contains both a weak acid and its conjugate base, so there is something ready to absorb added H⁺ or OH⁻.', ok: true,
              why: 'Right — both halves of a conjugate pair present at once, which is exactly why conjugate pairs were worth learning.' },
            { t: 'It is very dilute.', ok: false,
              why: 'Dilution makes a solution easier to shift, not harder. A buffer is usually reasonably concentrated.' },
            { t: 'It is exactly at pH 7.', ok: false,
              why: 'Blood’s buffer sits at 7.4, and buffers can be made at any pH. What matters is having both halves of a pair.' },
          ] },
        { kind: 'choice', q: 'Why do you breathe faster when you exercise?',
          options: [
            { t: 'Partly to remove CO₂, which becomes carbonic acid in your blood — so breathing is a pH control system.', ok: true,
              why: 'Right, and it is the nicest illustration of the buffer in action. Getting rid of the CO₂ is getting rid of the acid.' },
            { t: 'Only to take in more oxygen.', ok: false,
              why: 'That is part of it, and CO₂ removal is what your brainstem actually monitors most closely — via blood pH.' },
            { t: 'To cool down.', ok: false,
              why: 'Panting cools some animals, and human breathing rate is driven by blood CO₂ and pH.' },
          ] },
      ],
      practice: 'ph',
      mistakes: [
        { wrong: 'Reading the pH scale as linear.',
          why: 'pH 3 is a thousand times more acidic than pH 6, not twice. Every unit is a factor of ten, and this is the mistake the scale invites.' },
        { wrong: 'Forgetting the minus sign’s effect.',
          why: 'Lower pH means more acidic, because a bigger concentration gives a smaller negative log.' },
        { wrong: 'Thinking neutral always means pH 7.',
          why: 'Neutral means equal H⁺ and OH⁻. That happens at pH 7 only at 25 °C; at 50 °C neutral water is about 6.6.' },
        { wrong: 'Thinking pure water contains no ions.',
          why: 'It contains 10⁻⁷ mol/L of each, which is what defines the middle of the scale.' },
      ],
      recap: [
        'pH = −log[H⁺], and the log exists because concentrations span fourteen orders of magnitude.',
        'One pH unit is a factor of ten, so pH 3 is a thousand times more acidic than pH 6.',
        'Kᵤᵥ = [H⁺][OH⁻] = 10⁻¹⁴ at 25 °C, so pH + pOH = 14 and one measurement gives you all four numbers.',
        'Neutral means equal H⁺ and OH⁻, which is pH 7 only at 25 °C.',
        'A buffer holds both halves of a conjugate pair, which is how blood stays within 0.1 of pH 7.4.',
      ],
    },

    {
      id: 'strength-titration',
      title: 'Strong and weak, and finding out how much',
      keywords: 'strong weak acid base titration neutralisation salt indicator endpoint buffer region',
      mins: 17,
      builds_on: ['ph', 'concentration'],
      hook() {
        return frag(
          p('Concentrated vinegar is a weak acid. Very dilute hydrochloric acid is a strong acid. And the dilute strong one has a lower pH than the concentrated weak one.'),
          p('So "strong" and "concentrated" are different words for different things, and mixing them up is the most consequential vocabulary error in the subject.'));
      },
      pages: [
        {
          h: 'Strength is about the fraction that ionises',
          body() {
            return frag(
              table(['', 'Means', 'You change it by'], [
                ['strong / weak', 'what fraction of the molecules give up their proton', 'nothing — it is a property of the substance'],
                ['concentrated / dilute', 'how much of it there is per litre', 'adding water or more acid'],
              ]),
              p('A ', b('strong'), ' acid ionises essentially completely. Put HCl in water and virtually every molecule hands over its proton.'),
              eq('HCl + H2O -> H3O+ + Cl-        (goes to completion)'),
              p('A ', b('weak'), ' acid ionises only partly, and sits at an equilibrium. In vinegar, well under 1 % of the acetic acid molecules have given up their proton at any moment; the rest are intact — and which ones they are keeps changing.'),
              eq('CH3COOH + H2O <-> H3O+ + CH3COO-      (an equilibrium)'),
              callout(b('Notice the arrows. '), 'A single arrow means it goes and does not come back. A double arrow means both directions are happening at once, with the balance sitting mostly on the left. That double arrow is Unit 14’s entire subject, and weak acids are the first place it genuinely matters.'),
              h4('So you can have any combination'),
              table(['', 'Strong', 'Weak'], [
                ['Concentrated', '6 M HCl — dangerous', 'glacial acetic acid — also dangerous, for a different reason'],
                ['Dilute', '0.001 M HCl — harmless, pH 3', '0.001 M vinegar — harmless, pH about 4.1'],
              ]),
              okCallout(b('The strong acid list is short, which is the useful thing about it. '), 'Six of them cover everything a first course asks: HCl, HBr, HI, HNO₃, H₂SO₄ and HClO₄. Everything else is weak — so learning six things tells you about all the rest by elimination. Sulfuric acid is a partial case worth knowing: strong for its first proton and distinctly reluctant about its second.'),
              p('And it matters practically: for a strong acid the pH follows directly from the concentration, because ionisation is complete. For a weak one you need the equilibrium constant as well, which is why the calculation is harder.'));
          },
        },
        {
          h: 'Neutralisation, and what salt means here',
          body() {
            return frag(
              p('Put an acid and a base together and the H⁺ and the OH⁻ combine into water. What is left is the other two ions — a salt.'),
              eq('HCl + NaOH -> NaCl + H2O'),
              p('"Salt" in chemistry means any ionic compound from an acid–base reaction, not specifically sodium chloride. Potassium nitrate is a salt; so is copper sulfate.'),
              p('And the reaction releases heat, which is worth knowing before you mix anything concentrated. Neutralising a strong acid with a strong base is quite capable of boiling the mixture.'),
              h4('The neutral point is not always pH 7'),
              p('This is the part that surprises people. Neutralising a weak acid with a strong base does not land on 7.'),
              p('The reason follows from conjugate pairs. Neutralise acetic acid with sodium hydroxide and you get sodium acetate — and acetate is the conjugate base of a weak acid, so it is itself a weak base. It reacts with water and pushes the pH above 7.'),
              table(['Acid + base', 'Salt', 'pH at the end'], [
                ['strong + strong', 'neither ion reacts with water', '7'],
                ['weak acid + strong base', 'the anion is a weak base', 'above 7'],
                ['strong acid + weak base', 'the cation is a weak acid', 'below 7'],
              ]),
              warnCallout(b('So "neutralised" means the acid and base have been used up, not that the pH is 7. '), 'Those are two different claims, and only the first is what the word means.'));
          },
        },
        {
          h: 'Titration: measuring a concentration',
          body() {
            return frag(
              p('If you know one concentration exactly, you can find an unknown one by adding measured amounts until they have exactly cancelled. That is a ', term('titration', 'Adding a solution of known concentration to one of unknown concentration until they have exactly reacted, then working the unknown out from the volume used.'), ', and it is the standard way concentrations are measured.'),
              p('The trick is knowing when you have arrived. Around the exact cancellation point the pH swings enormously for a tiny addition — several units from one drop — so an indicator that changes colour in that range makes the endpoint sharp and unmistakable.'),
              ME.sims.titration(),
              p('Overshoot it deliberately. The steepness of the jump is the thing to see: away from the endpoint, a whole millilitre barely moves the pH, and at the endpoint one drop moves it several units.'),
              h4('Why the curve has that shape'),
              p('Before the endpoint there is plenty of acid left, so each drop of base neutralises some and barely changes the ratio. After the endpoint there is excess base, and each drop adds to a lot of it, so again little changes. Exactly at the endpoint there is almost nothing left of either, so a single drop swings the balance completely.'),
              p('And for a weak acid the curve has a flat stretch partway up, which is a buffer region — the acid and its conjugate base are both present in quantity there, which is exactly the buffer from the last lesson appearing on its own.'),
              worked('25.0 mL of an unknown HCl needs 27.4 mL of 0.100 M NaOH. What is its concentration?', [
                { q: 'Moles of base used', why: '0.0274 L × 0.100 M.', maths: '2.74 × 10⁻³ mol' },
                { q: 'Mole ratio', why: 'HCl + NaOH → NaCl + H₂O is 1:1, so the same number of moles of acid.', maths: '2.74 × 10⁻³ mol HCl' },
                { q: 'Divide by the acid’s volume', why: 'Moles per litre.', maths: '2.74 × 10⁻³ / 0.0250 = 0.110 M' },
              ]),
              warnCallout(b('And check the ratio rather than assuming 1:1. '), 'Sulfuric acid gives two protons per molecule, so it needs two moles of hydroxide per mole of acid. Assuming 1:1 there halves your answer, and nothing about the titration will tell you — the arithmetic just comes out wrong.'),
              goto('Titration arithmetic', '#/tools/concentration', 'And the dilution tool next door, for preparing the standard solution.'));
          },
        },
      ],
      checkpoints: [
        { kind: 'choice', after: 0,
          q: 'Which has the lower pH: 0.001 M HCl or 1 M acetic acid?',
          options: [
            { t: 'The acetic acid — it is weak, but there is a thousand times more of it, and a small fraction of a lot beats all of very little.', ok: true,
              why: 'Right, and this is exactly why the two words must be kept apart. 1 M acetic acid measures about pH 2.4 and 0.001 M HCl is pH 3. Strength and concentration are independent, and either can win.' },
            { t: 'The HCl, because it is a strong acid.', ok: false,
              why: 'Strong means it ionises fully, and there is very little of it here. Full ionisation of 0.001 M gives exactly pH 3, and the weak acid still beats it because a small fraction of a much larger amount is more.' },
            { t: 'They are the same.', ok: false,
              why: 'They differ by about half a pH unit, which is a factor of three in H⁺.' },
          ] },
        { kind: 'choice', after: 1,
          q: 'You neutralise acetic acid with exactly the right amount of NaOH. What is the pH?',
          options: [
            { t: 'Above 7 — the acetate left behind is the conjugate base of a weak acid, so it is itself a weak base.', ok: true,
              why: 'Right, and it follows straight from conjugate pairs. "Neutralised" means used up, not pH 7.' },
            { t: 'Exactly 7, by definition.', ok: false,
              why: 'Only when both are strong. Here the salt’s anion reacts with water and pushes the pH up.' },
            { t: 'Below 7, because it started acidic.', ok: false,
              why: 'The acid is gone. What is left is its conjugate base, which is basic.' },
          ] },
      ],
      quizzes: [
        { kind: 'choice', q: 'What does "strong acid" mean?',
          options: [
            { t: 'It ionises essentially completely — nearly every molecule gives up its proton.', ok: true,
              why: 'Right, and it says nothing about how much of it there is. Strength is a property of the substance; concentration is how much you put in.' },
            { t: 'It is very concentrated.', ok: false,
              why: 'That is concentration, and it is independent. You can have dilute strong acid and concentrated weak acid.' },
            { t: 'It is very dangerous.', ok: false,
              why: 'Often, and concentrated weak acids are dangerous too. Glacial acetic acid will burn you.' },
          ] },
        { kind: 'choice', q: 'What does the double arrow in a weak acid’s equation mean?',
          options: [
            { t: 'Both directions are happening at once, with the balance sitting mostly on the left.', ok: true,
              why: 'Right — only about 1 % of acetic acid molecules are ionised at any moment, and which 1 % keeps changing. This is the equilibrium Unit 14 is about.' },
            { t: 'The reaction can be run either way if you choose.', ok: false,
              why: 'It is running both ways simultaneously, without anyone choosing.' },
            { t: 'The reaction is slow.', ok: false,
              why: 'Rate and position of equilibrium are different things. Proton transfer is very fast.' },
          ] },
        { kind: 'choice', q: 'What is a salt, in the acid–base sense?',
          options: [
            { t: 'Any ionic compound formed when an acid and a base react.', ok: true,
              why: 'Right — potassium nitrate and copper sulfate are salts too. Sodium chloride is just the famous one.' },
            { t: 'Sodium chloride specifically.', ok: false,
              why: 'That is table salt. The chemical sense is much broader.' },
            { t: 'Anything that tastes salty.', ok: false,
              why: 'Plenty of salts taste bitter, metallic or of nothing, and some are poisonous.' },
          ] },
        { kind: 'choice', q: 'Why is a titration curve nearly vertical at the endpoint?',
          options: [
            { t: 'Almost nothing is left of either reactant there, so one drop swings the balance completely.', ok: true,
              why: 'Right — and away from the endpoint a whole millilitre barely moves it, because there is plenty in excess to absorb the change.' },
            { t: 'Because the indicator changes colour.', ok: false,
              why: 'The indicator responds to the swing rather than causing it. The chemistry would do the same with no indicator present.' },
            { t: 'Because the reaction speeds up there.', ok: false,
              why: 'The rate is not what changes. What changes is how much of each is left to buffer the addition.' },
          ] },
        { kind: 'numeric', q: '20.0 mL of HCl needs 25.0 mL of 0.200 M NaOH. What is the acid’s concentration, in mol/L?',
          answer: 0.25, tol: 0.005,
          right: '0.250 M. The base supplied 5.00 × 10⁻³ mol, the ratio is 1:1, and that in 0.0200 L is 0.250 M.',
          wrong: 'Moles of base, then the 1:1 ratio, then divide by the acid’s volume in litres.' },
        { kind: 'choice', q: 'Why does sulfuric acid need twice as much base per mole?',
          options: [
            { t: 'It has two protons to donate, so one mole of it needs two moles of hydroxide.', ok: true,
              why: 'Right, and assuming 1:1 halves your answer with nothing in the experiment to warn you. Always check the equation.' },
            { t: 'It is a stronger acid.', ok: false,
              why: 'Strength is about how completely it ionises. The factor of two comes from having two protons.' },
            { t: 'It is more concentrated.', ok: false,
              why: 'Concentration is whatever you make it. The 2:1 ratio is fixed by the formula.' },
          ] },
        { kind: 'choice', q: 'What is the flat stretch partway up a weak acid’s titration curve?',
          options: [
            { t: 'A buffer region — the acid and its conjugate base are both present in quantity, so the pH resists change.', ok: true,
              why: 'Right, and it is the buffer from the last lesson appearing without anyone setting one up. Halfway to the endpoint is where a buffer works best.' },
            { t: 'A measurement artefact.', ok: false,
              why: 'It is entirely real and reproducible, and it is how buffers are made in practice.' },
            { t: 'The endpoint.', ok: false,
              why: 'The endpoint is the steep part. The flat stretch comes before it.' },
          ] },
        { kind: 'choice', q: 'Does "neutralised" mean pH 7?',
          options: [
            { t: 'No — it means the acid and base have been used up, which only lands on 7 when both were strong.', ok: true,
              why: 'Right. Weak acid plus strong base finishes above 7, because the salt’s anion is a weak base.' },
            { t: 'Yes, that is the definition.', ok: false,
              why: 'Two different claims. Neutralising acetic acid with NaOH ends up around pH 8.7.' },
            { t: 'Only for weak acids.', ok: false,
              why: 'The other way round — strong with strong is the case that gives 7.' },
          ] },
      ],
      practice: ['ph', 'molarity'],
      mistakes: [
        { wrong: 'Using "strong" and "concentrated" interchangeably.',
          why: 'They are independent. Dilute strong acid can have a higher pH than concentrated weak acid, and usually does.' },
        { wrong: 'Assuming a 1:1 ratio in a titration.',
          why: 'Sulfuric acid needs two hydroxides per molecule. Assuming 1:1 halves the answer and nothing in the experiment will warn you.' },
        { wrong: 'Thinking neutralised means pH 7.',
          why: 'It means the acid and base are used up. Only strong-with-strong lands on 7.' },
        { wrong: 'Thinking a single arrow and a double arrow are stylistic.',
          why: 'A double arrow says both directions run at once, which is what makes weak acids weak and is the whole of Unit 14.' },
      ],
      recap: [
        'Strength is the fraction that ionises and is a property of the substance; concentration is how much there is. They are independent.',
        'Strong acids ionise completely (single arrow); weak ones sit at an equilibrium (double arrow) with most molecules intact.',
        'The strong acid list is short, so knowing it tells you that everything else is weak.',
        'Neutralisation gives a salt and water, and "neutralised" means used up — which lands on pH 7 only when both were strong.',
        'A titration finds an unknown concentration from the volume needed to cancel it, and the curve is steep at the endpoint because almost nothing is left to absorb a drop.',
      ],
    },

    ],
  });
})();
