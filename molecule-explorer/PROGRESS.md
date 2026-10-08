# Molecule Explorer — chemistry course build

One self-contained `dist/molecule-explorer.html`, working fully offline. Rebuild
with `npm run build` (needs no internet). `npm run build-db` re-verifies the
molecule and element data against PubChem and *does* need internet.

Run everything with `npm test` — `test/unit.mjs` and `test/engine.mjs` are
logic tests, `test/smoke.mjs` drives the real built file in a browser with the
network switched off.

---

## Stage 1 — shared infrastructure

### Done

**`src/js/12-format.js` — numbers, units, answer checking**
- Physical constants derived, not copied: N<sub>A</sub> and k<sub>B</sub> are
  exact by SI definition, so `R` is their product rather than a looked-up
  decimal. `gasConstant(p, v, n)` returns R in whatever units the reader picked.
- Unit registry for pressure, volume, temperature, amount, mass, energy and
  length, each unit as `base = v * factor + offset` so temperature needs no
  special case. Every conversion round-trips to within 1e-9.
- Significant figures read from the *written* text, so `100` and `100.0` are the
  same number and different claims.
- `checkAnswer` grades a typed answer: accepts any unit of the right dimension,
  distinguishes a wrong unit from an unrecognised one, optionally enforces
  significant figures, and names the two mistakes people actually make (out by a
  power of ten, or the answer upside down).

**`src/js/14-calc-formula.js` — formula parsing and molar mass**
- Handles nested brackets, hydrates (`CuSO4·5H2O`, `.`, `*`), unicode
  subscripts, charges in every spelling (`SO4^2-`, `SO42-`, `Fe3+`, `Ca++`,
  `[Fe(CN)6]3-`), and the electron `e-` for half-equations.
- Two spellings per formula: `text` in Hill order for comparing, `display` in
  the reader's own spelling for showing. NaOH is HNaO in one and NaOH in the
  other, and both are needed.
- Case is chemistry, so `CO` and `Co` are never confused; a wrong case gets a
  one-tap fix offered (`h2o` → `H2O`, `NACL` → `NaCl`) instead of a refusal.
- Atomic masses come from the PubChem element table the build already verifies.
- Percent composition, for Unit 9.

**`src/js/15-calc-balance.js` — the balancer**
- Exact rational arithmetic (BigInt fractions), never floating point, so a
  coefficient is never 2.99999.
- Elements give one row each, charge gives one more, and a balanced equation is
  a vector in the null space. Smallest whole numbers always.
- Three outcomes, all explained in words: one answer; none (and which element
  appears on only one side); or several independent ones (two reactions written
  as one).
- Also: a substance on the wrong side of the arrow, atom tally per element,
  conservation-of-mass check, reaction-type classification with a reason,
  mole ratios, a hand-balancing walkthrough, and live hints for try-it-yourself
  mode.

### Bugs found and fixed while building this
- `NH4+` parsed as charge **+4** — a trailing digit was always read as the
  charge. Now: two or more digits means the last is the charge (`SO42-`), one
  digit means the charge only if what is left is a lone element (`Fe3+`),
  otherwise it is a subscript and the charge is one (`NH4+`).
- `+` is both the species separator and the cation sign, so `Fe2+ -> Fe3+ + e-`
  lost every charge and all redox half-equations looked unbalanceable.
- `[Cu(NH3)4]2+` read the `2` as a multiplier, tripling the complex.
- `parse` called `suggest` which called `parse`: an input of `2` overflowed the
  stack and would have crashed the Balancer.
- Balanced equations were printed in Hill order, turning `Ca(OH)2` into
  `CaH2O2`. Correct, canonical, and unrecognisable to a learner.

**`src/data/ions.js` + `src/js/13-refdata.js` — the reference tables**
- 34 polyatomic ions, every one resolved against PubChem at build time with
  **both** formula and charge cross-checked. Four of my guessed CIDs were wrong
  and the tripwires caught all four (phosphine for peroxide, bromic acid for
  thiosulfate). PubChem has no record for the peroxide(2−) ion at all — only
  superoxide O₂⁻ and O₂⁴⁻ — so peroxide is **dropped** rather than invented, and
  silicate and borate became the forms PubChem actually has (SiO₄⁴⁻, B₄O₇²⁻).
- Monatomic ion charges are **derived** from an element's group, not listed, so
  they cannot disagree with the periodic table. Each comes with its reason.
- Everything that genuinely has no free machine-readable source is marked
  `LITERATURE` in the file and states its provenance in the app: solubility
  rules, activity series, strong acid and base lists, specific heats, latent
  heats, the −ide stems, and the handful of d-block metals named without a
  Roman numeral.

**`src/js/16-calc-naming.js` — inorganic naming, both directions**
- Formula → name for ionic compounds (fixed and variable charge), covalent
  compounds with Greek prefixes, acids, hydrates, and bare ions. 47/47 on the
  test set.
- Name → formula, including criss-crossing charges. 20/20, and 27/27 full
  round-trips.
- Every answer carries its reasoning: the Roman numeral is *worked out* from
  charge balance and the working is shown, and criss-crossing is explained as
  the lowest common multiple arrived at sideways rather than a trick.
- Declines organic names rather than guessing — see the note on naming below.

### More bugs found while building this
- Aluminium read as a variable-charge transition metal, because PubChem's block
  for it is "post-transition metal" and a substring test for "transition"
  matched. Al is always 3+.
- `splitIonic` looked for the metal to decide what the cation was. KMnO₄ has a
  metal inside its *anion* and NH₄Cl has no metal at all, so both failed. It now
  works from the anion outwards, trying polyatomic ions biggest-first so NaHCO₃
  finds hydrogen carbonate rather than carbonate with a spare hydrogen.
- "carbon monoxide" gave CO with no oxygen: `mono` ate the `o` of `oxide`,
  leaving the stem `xide`. Prefixes are now tried both ways round.
- "dinitrogen pentoxide" gave N₂O, because only `penta` was readable and not the
  elided `pent`.
- Names came out capitalised ("Iron(III) sulfate") from the element table.
- `hydrosulfuric acid` would not read back to H₂S — its acid stem is longer than
  its −ide stem.

## Stage 2 — the four new tabs

### Done
- **Balancer tab** (`73-balancer.js`). One box, loose input, live formatted
  preview. Accepts names as well as formulas. Atom table that goes green, mass
  check, reaction type with a reason, mole ratios, a by-hand walkthrough, and a
  try-it-yourself mode with +/− steppers and live hints. Examples menu from easy
  to unbalanceable, session history, copy button. Unbalanceable and
  multiple-answer equations are explained, not errored.
- **Gas Simulator tab** (`74-gassim.js` + `18-calc-gas.js`). Canvas of particles
  with a draggable piston and visible wall-hit flashes. Slider *and* number box
  for P, V, T, n, each with its **own** unit dropdown (7 pressure, 7 volume, 3
  temperature, 4 amount including grams), remembered between visits. Hold-still
  locks with one-click Boyle / Charles / Gay-Lussac / Avogadro presets, each
  explained. 13 gases with real molar masses; heavier ones visibly move slower.
  Live PV=nRT panel with the right R for the chosen units and every conversion
  shown, including why temperature must be kelvin. Four live graphs. Absolute
  zero blocked with the reason. Optional van der Waals comparison. Six real
  scenarios.
- **Tools tab** (`75-tools.js` + `17-calc-stoich.js`, `19-calc-solution.js`).
  17 calculators, every one showing its working in the teacher voice: molar
  mass, percent composition, g⇄mol⇄particles, stoichiometry with the
  grams→moles→moles→grams road map, limiting reactant, percent yield, empirical
  formula, gas laws, concentration, dilution, pH/pOH, q=mcΔT, ΔG, name⇄formula,
  reaction type, unit converter, significant figures.
- **Reference tab** (`76-reference.js`). Nine sections: polyatomic ions grouped
  by charge, ion charges read off the periodic table, solubility rules, activity
  series, strong acids and bases, constants, SI prefixes, specific heats, and a
  49-entry searchable glossary. Every table states its provenance.
- Nav now carries nine tabs on one row, with Balancer and Gas Simulator
  immediately after Elements as specified.

### Bugs found and fixed
- `oxygen` typed into the balancer resolved to a lone **O** atom, so
  "methane + oxygen" balanced as `CH4 + 4O → CO2 + 2H2O` — arithmetically
  perfect and chemically nonsense. The seven diatomic elements plus P₄ and S₈
  now resolve to their real molecular forms, and the app says why.
- The simulator's starting state was written with all four numbers by hand, so
  it violated PV=nRT by 1.4% from the first frame. A gas has three degrees of
  freedom, so one variable is now always recomputed from the other three. Same
  for every scenario preset.
- Nine tabs pushed the search box onto a second row.

## Stage 3 — the course itself

### Done
- **Course engine** (`77-course.js`), **practice generators** (`78-generators.js`,
  18 of them), **lesson kit** (`79-lesson-kit.js`) and **simulations**
  (`79b-sims.js`, 10 of them). The reader is the course map at `#/learn` and a
  long-form lesson at `#/learn/<id>`: hook, multi-page body with a checkpoint
  between pages, worked examples, common mistakes, a question set, unlimited
  randomised practice and a recap.
- **Unit 1 — What is chemistry?** (6 lessons)
- **Unit 2 — Matter and its states** (6 lessons; states-of-matter and
  heating-curve simulations)
- **Unit 3 — Atoms** (4 lessons; build-an-atom simulation)
- **Unit 4 — Electrons and where they live** (4 lessons)
- **Unit 5 — The periodic table** (3 lessons; trend-map simulation)
- **Unit 6 — Chemical bonding** (5 lessons: why atoms bond and ionic bonding,
  covalent bonding and Lewis structures, VSEPR shapes, polarity, and forces
  between molecules; the Lewis builder appears in three of them)
- **Unit 7 — Naming compounds** (3 lessons: ionic names and Roman numerals,
  polyatomic ions and the -ate/-ite system, covalent prefixes and acids)
- **Unit 8 — Chemical reactions** (3 lessons: what a reaction is and
  conservation of mass, balancing, and the five reaction types with the
  activity series and solubility rules used to predict products)
- **Unit 9 — The mole and stoichiometry** (3 lessons: the mole, molar mass and
  formulas from analysis, and stoichiometry with limiting reactant and percent
  yield; embeds the new road-map simulation)
- **Unit 10 — Gases** (3 lessons: kinetic theory and what pressure is, the
  four gas laws shown to be one law, and PV = nRT with gas stoichiometry and
  partial pressures; embeds the new one-law-at-a-time simulation)
- **Unit 11 — Solutions** (3 lessons: what dissolving actually is, concentration
  and dilution, and colligative properties — why salt melts ice and why
  seawater dehydrates you)
- **Unit 12 — Acids and bases** (3 lessons: what they actually are, the pH
  scale and why it is logarithmic, and strong versus weak with titration;
  embeds the pH-scale and titration simulations)
- **Unit 13 — Energy in reactions** (3 lessons: heat and q = mcΔT, enthalpy
  with bond energies and Hess's law, and entropy with ΔG; embeds the new
  calorimetry simulation and the energy diagram)
- **Unit 14 — Rates and equilibrium** (3 lessons: what sets a reaction's speed,
  equilibrium as two matched rates, and Le Chatelier; embeds the energy-diagram
  and equilibrium simulations)
- **Unit 15 — Organic chemistry: reading structures** (the original 12 lessons,
  kept working unchanged)

- **Unit 16 — Organic naming and isomers** (5 lessons: naming a carbon
  skeleton, naming with functional groups, structural isomers, cis/trans, and
  chirality; embeds the bond-rotation simulation)

The nine extra organic lessons the spec asked for did not fit under one unit
heading — Unit 15 would have had 21 lessons — so organic is split across
three units: 15 for reading structures (unchanged), 16 for naming and
isomers, and 17 for reactions and big molecules.

- **Unit 17 — Organic reactions and big molecules** (3 lessons: what organic
  molecules do, polymers, and the four biomolecule families; embeds the new
  reaction-type viewer)

**All seventeen units are written.** 72 lessons, 181 pages, 579 questions,
about 16 hours of reading, 19 simulations, 21 practice generators, 18
calculators, 11 reference tables and a 49-word glossary.

**`src/js/20-calc-lewis.js` — Lewis structures and VSEPR**
- Runs the counting method and returns electron totals, bond orders, lone
  pairs, formal charges, shape, bond angle, a polarity verdict and the numbered
  working, so a lesson's drawing cannot disagree with its arithmetic.
- The two families of exception are handled explicitly: boron and beryllium
  settle for six and four, and period 3 and below expand their octets when the
  count gives too few bonds for the outer atoms. It refuses, with a reason,
  where the method cannot honestly go: NF₅, the NO radical, a d-block metal.
- 27 molecules with settled textbook answers are pinned in the engine tests,
  along with electron conservation, formal charges summing to the species
  charge, and resonance detection.

**`ME.solution.particlesPerUnit`, `freezingPoint`, `boilingPoint`**
- ΔT = i K m, where i — the number of particles one formula unit produces — is
  read off the formula by the naming engine rather than supplied, so it cannot
  disagree with what the compound actually is. Twelve solutes are pinned in the
  tests, from sugar at 1 to Al₂(SO₄)₃ at 5.
- Cryoscopic and ebullioscopic constants for four solvents, marked LITERATURE,
  with a new Reference section and a Tools calculator.
- PubChem's element table spells aluminium and caesium the American way, so
  generated names read "aluminum sulfate" in the middle of a lesson that says
  aluminium. `ME.ref.elementName` maps the two differing names once and every
  generated name goes through it; both spellings are still accepted as input,
  and a test checks both halves.

**`ME.ref.ORGANIC_BP` — boiling points, marked as learned**
- The isomer lessons compare boiling points, and the verified molecule
  database carries structures and masses but not boiling points. The numbers
  were typed from memory into the lesson first, which is exactly what this
  project's build script exists to prevent. They now live in one marked
  literature table with a Reference section, the lessons read them from there,
  and a test pins both the values and the direction of every comparison.

**`src/js/81-siteindex.js` — the search bar finds the course too**
- The search box was built for molecules, which left 64 lessons, 18
  calculators, 10 reference tables and a 49-word glossary reachable only by
  knowing which tab they lived in. Typing "limiting reactant" or
  "Le Chatelier" returned nothing at all.
- A lesson's searchable text is its title, an explicit `keywords` field, its
  recap, the mistakes it warns about, and **the text of every question it
  asks** — which matters more than it looks, since a named principle often
  appears only in the question asking you to state it.
- Molecules still come first everywhere, because that is what most queries
  are; the app results follow, and a concept query has nothing above them but
  a one-line "no match".
- A glossary hit links to that one word, highlighted, via a new third part in
  the reference route.
- Ranking was wrong twice while building it: "hydrogen bonding" found the
  polyatomic-ions lesson, which mentions hydrogen carbonate and bonding in
  unrelated sentences (fixed by scoring keyword phrases above scattered word
  matches), and "pH" matched every lesson containing "physical" or "phase"
  (fixed by requiring a whole-word match for queries of one or two letters).
- 17 real queries are pinned in the tests, along with the assertion that every
  lesson, tool, table and glossary word is in the index and that every
  indexed link resolves.

**Simulations added for these units**
- The Lewis-structure builder: type any formula, including impossible ones,
  and it refuses with a reason rather than drawing something wrong.
- The stoichiometry road map: four stations, with each conversion written on
  the arrow that performs it, computed by `ME.stoich.massToMass` — the same
  code the Tools tab and the graders use. It runs across on a wide screen and
  turns the corner downwards on a narrow one.
- Calorimetry: drop something hot into water and see where the two
  temperatures meet, and that it is never halfway. `ME.solution.mixTemperatures`
  solves conservation of energy for the final temperature rather than
  iterating, so it is exact, and the test asserts the two q values cancel.
- The organic reaction viewer: the four reaction types drawn as real
  structures, with the equation underneath **balanced from the formulas the
  drawings themselves report** — so a typo in a SMILES string shows up as an
  unbalanced equation rather than as a plausible-looking lie.
- One gas law at a time: two variables pinned, one dragged, the fourth forced,
  with the relationship plotted so it is visible whether the line reaches the
  origin — which is the whole difference between Boyle and Charles. Every
  point comes from `ME.gas.combined`.

### Bugs found and fixed
- The practice generators loaded *before* the course engine, because the
  bundler concatenates `src/js/*.js` in filename order and the engine was
  numbered 79. `ME.practice` was undefined and the app did not boot.
- The gas-law generator picked all four variables independently and produced
  5469 K plasma states. It now picks P, n and T in sensible ranges, derives V,
  and then rebuilds the answer from the *rounded* numbers the question prints,
  so the shown answer and the grader can never drift apart.
- The reaction-type generator returned null about one time in ten for redox
  equations.
- Structure tests could not see a typo inside a page body, because a body is a
  function nobody had called. Two tests now render **every** page, hook and
  question for real and fail on an exception, an empty render, or a stray
  `undefined` reaching the text.
- A bonds-only polarity rule called H₂S and PH₃ non-polar, because sulfur and
  phosphorus sit within 0.4 of hydrogen on the electronegativity scale. A lone
  pair is a lump of charge on one side whatever the bonds do.
- **Every number in every lesson was being mangled.** `formulaHTML` subscripts
  every digit and superscripts every plus, which is right for a bare formula
  and wrong for prose: "109.5°" rendered as 109 with a subscript 5, and
  "2 + 6 = 8" got a superscript plus. There is now a separate `chemHTML` for
  prose, which subscripts a digit run only after a letter or closing bracket
  and treats a plus or minus as a charge only when what precedes it looks
  chemical and no word follows — so decimals, dates, ranges, arithmetic and
  hyphenated words are left alone. Every lesson, question, table, worked
  example and Tools step now goes through it, and a test pins both what must
  be marked up and what must not.
- Two numbers in Unit 9's worked examples were wrong by hand: the leftover
  hydrogen in the limiting-reactant example (9.7 g, actually 8.74) and
  calcium nitrate's molar mass in the last decimal. Every number those
  worked examples print is now checked against the engine in a test. The
  same test now covers Unit 10's gas numbers.
- The gas-law simulation's slider ran in SI, where the whole volume range is
  0.005 to 0.09 m³, and a range input snapped the value to a step that no
  longer matched the readout beside it. It now runs in the reader's own units
  and reads back whatever the input actually landed on.
- Its graph started at the low end of the slider, which cropped out the one
  thing worth seeing: whether the line reaches the origin. A proportional law
  is now plotted from zero and an inverse one from the slider's low end,
  because an inverse law is not defined at zero.
- A lesson linking to `#/m/sodium-chloride` reached nothing: molecule links
  need `cid:` or `n:` because the database is keyed by neither a slug nor a
  title. A test now renders every lesson and checks that every hand-written
  link resolves — the view exists, and the lesson, tool, element or molecule
  it names exists too.

## Stage 4 — asked for after the course was finished

### Done
- **Specific heats**, asked for as "way more": 96 substances in eight groups,
  up from the handful the heat tool started with. Grouped or ranked, with the
  ranked view making the point the table exists to make — uranium 0.116 to
  hydrogen 14.30, a factor of more than a hundred. The values live in the
  groups and the flat lookup is derived from them, so each number is written
  down in exactly one place.
- **Reaction energy tool.** Any equation the Balancer can balance, answered
  either per equation or for the amounts you have. Built on 104 enthalpies of
  formation and Hess's law rather than a list of reaction enthalpies, so it
  covers reactions nobody thought to add. Amounts read as moles or grams, and
  the limiting reactant sets the scale.
- **Templates** on both Reaction energy (24, in five groups) and Stoichiometry
  (20, in four), so each tool opens with something real on screen. Every chip
  is clicked by a test.
- **Formation enthalpies** added to Reference as its twelfth table, marked
  LITERATURE, with a button through to the tool that uses it.
- **Mix two solutions.** Two beakers, each a substance at a molarity or a pH
  typed in, and the pH once they meet. One charge-balance equation rather than
  a formula per case, so buffers, equivalence points, half-equivalence, the
  second proton of sulfuric acid and 10⁻⁸ M acid are all the same code. 26
  templates, and a pKa table in Reference as its thirteenth section.

- **Reactions**, a tenth tab and the first thing here built for fun rather
  than for a syllabus: 22 reactions animated atom by atom, with play, speed,
  loop and a scrubber for stopping on the frame where the bonds break. Every
  frame is derived — balancer for the coefficients, OpenChemLib for the
  structures, formation enthalpies for the flash — and findable from the
  search bar by name.

- **Quantum**, an eleventh tab at the far right and separate from the course.
  Began as twelve pages on the Schrödinger equation and was then generalised to
  the subject: **43 pages in ten groups**, from the experiments that broke
  classical physics through the equation, the rules underneath it, spin, atoms,
  molecules, light, many-particle statistics and solids, to entanglement and
  what any of it means. Sixteen live figures, 34 kinds of generated problem.
  Every number derives from the defined constants — there is no 13.6, no
  5.67 × 10⁻⁸ and no 0.0529 typed anywhere.
  - The page list lives in a shared registry (`ME.quantumPage`) that content
    files push to as they load, so the pages are split across six files and
    none of them knows about the others. Reading order is registration order,
    which is filename order.

- **The database grew from 688 molecules to 1007**, and from 466 gallery
  entries to 729. 341 entries went in; 34 were rejected by the build's own
  tripwires and fixed or dropped. Nothing structural was hand-written.

### Bugs found and fixed
- The Balancer's live preview printed `nullH₂ + nullO₂ → nullH₂O` (reported
  with a screenshot). A species parsed from an equation with no leading number
  carries `null`, which passes both `!== undefined` and `!== 1` — the two
  tests the preview was using to decide whether a coefficient was worth
  printing. It now requires an actual finite number above one.
- Adding the formation table stopped the app booting. The index is keyed on
  what `ME.formula.parse` makes of each formula, and `13-refdata.js` is
  concatenated before the formula parser, so building the index eagerly read
  `ME.formula` while it was still undefined. It is built on first use instead.
  This is the third boot failure caused by build-order coupling between files.
- The first templates asked for 16 g of methane and got 0.9973 mol, because
  16 is not methane's molar mass. The amount fields now take moles or grams,
  defaulting to moles.
- The headline said "Releases" for endothermic reactions too: a `.replace()`
  applied to the wrong string. Caught before it shipped, pinned by a test that
  photosynthesis absorbs and respiration releases, exactly mirroring each other.
- The table displayed slaked lime as `CaH2O2` and baking soda as `CHNaO3` —
  Hill order, which is what the parser produces and what no student would
  recognise. Stored formulas are now written the conventional way; the index
  still keys on the parse, so either spelling finds the row.
- Picking a tool from the side list while scrolled down left the reader
  looking at the middle of a tool they had not asked for, or at nothing at
  all when the new panel was shorter than the old one (reported). Both the
  Tools and Reference lists now pull the top of the panel back under the nav
  bar. It only moves the page when the panel top is actually off screen, so
  picking a tool while already at the top is still a no-op, and it follows
  the reader's reduced-motion setting.
- The reaction player drew iron(III) oxide carrying six hydrogen atoms, because
  OpenChemLib applies valence rules to a bare `[Fe]` and `[Al]`. Ionic oxides
  are written as ions now, lone atoms are built directly rather than through
  SMILES, and a tripwire refuses to draw any structure whose atoms do not match
  its own formula.
- Water came out of that layout straight rather than bent, which contradicts a
  page of Unit 6. Hydrogens on an atom with nothing else attached are now
  fanned at the angle VSEPR calls for, counting lone pairs — so water is 109.5°
  and ammonia is pyramidal.
- The second line of every double bond was drawn four bond-lengths above the
  molecule: the offset was computed in pixels and applied to coordinates that
  had not been scaled yet.
- The atom matching between the two sides chose purely by distance, which tore
  the acetate group apart in vinegar and baking soda. It now optimises for
  bonds kept whole, with distance only as a tie-breaker.
- A canvas label called table salt `ClNa`, the same Hill-order wart as the
  formation table. Structures are looked up by Hill text; labels use what the
  reader wrote.
- Every worked example on the quantum pages was missing its answer. The lesson
  kit's `worked()` renders `q`, `why` and `maths`; I wrote the answers under a
  field called `a`, which it silently ignores. Eight examples, all of them
  showing their reasoning and none of them showing a number.
- A figure that wrapped its own draw function to update a readout alongside the
  canvas never ran the wrapper, because `paint()` closed over the original
  argument rather than reading it back off the state object. The readouts were
  simply empty.
- Hydrogen came out 0.05% wrong because it used the electron mass rather than
  the reduced mass of electron and proton. Small, and the difference between
  13.606 eV and the measured 13.598 — a number a reader could check against any
  data table.
- The eleventh tab pushed the theme button onto a row of its own at 1280 px,
  which reads as a layout mistake rather than a tight fit. The search box gives
  up the width instead, and the test now checks the whole bar rather than just
  the search box.
- Things the database tripwires caught in the 341 new entries, all of them my
  memory rather than the code: ammonium phosphate is the diammonium salt in
  PubChem, not the triammonium one; thiamine pyrophosphate and
  S-adenosylmethionine were each one hydrogen out; "glycogen" resolves to a
  four-glucose fragment and "fibrin" to something that is not fibrin; elemental
  aluminium's SMILES reads back as AlH₃ through OpenChemLib, the same valence
  trap the reaction player hit with iron. Polymers and proteins were dropped
  rather than relabelled.
- Things the render test caught in the 31 new quantum pages, all of them mine:
  a DOM node concatenated into a string with `+` instead of `,`, which printed
  `[object HTMLElement]` mid-sentence; raw numbers passed as table cells, which
  the lesson kit's `table()` tries to `appendChild` and throws on; and the
  literal word "undefined" in prose, twice, which the same test flags because
  it cannot tell that case from a failed interpolation. The first two were
  bugs; for the third I reworded the prose rather than weakening the test.
- The first LCAO implementation put the antibonding level *below* the bonding
  one, because I tried to get absolute energies out of a two-parameter model.
  Rewritten as a splitting about the atomic level, which is what an MO diagram
  shows anyway, with a test that asserts the direction.
- Gallium nitride was classified as an insulator, because the semiconductor
  cutoff was at 3 eV. Every blue LED is made of it.
- `pH 7` printed where `pH 7.00` belonged. pH is not a significant-figures
  quantity — the digits in front of the point are the exponent of a
  concentration — so trimming the trailing zero threw away the part that
  counts. pH now always prints to two decimals.
- A field labelled "or its pH" came out as "OR ITS PH", because every field
  label is uppercased. pH means something and PH does not, so a label can now
  opt out.
- The working said "runs the reaction 1 times over", which is the kind of
  phrase that makes a reader stop and reread. Both counters now say it in
  English.

### Still open
Phone and tablet layout is deliberately **not** being done yet, at the user's
request. The ten tabs now on one row will need either a scrollable tab row or
a "More" menu before release — they still fit a laptop, and a test checks that,
but there is no room left for an eleventh.

---

## Note on organic naming

OpenChemLib has no IUPAC name generator, and writing a correct one is a
research-grade problem, so the app does not pretend to have one. Organic naming
practice will draw on a build-time pool verified against PubChem instead — 684
of the 688 database molecules already carry PubChem's own IUPAC name. Inorganic
naming, which really is just rules, has a genuine bidirectional engine.
