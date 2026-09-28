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
- **Unit 15 — Organic chemistry: reading structures** (the original 12 lessons,
  kept working unchanged)

58 lessons, 139 pages, 450 questions, about 12.5 hours of reading.

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

**Simulations added for these units**
- The Lewis-structure builder: type any formula, including impossible ones,
  and it refuses with a reason rather than drawing something wrong.
- The stoichiometry road map: four stations, with each conversion written on
  the arrow that performs it, computed by `ME.stoich.massToMass` — the same
  code the Tools tab and the graders use. It runs across on a wide screen and
  turns the corner downwards on a narrow one.
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

### Next, in order
1. Unit 10 gases, 11 solutions, 12 acids and bases, 13 thermochemistry,
   14 rates and equilibrium — one commit each
2. The nine remaining Unit 15 organic lessons (IUPAC naming, functional groups
   in depth, isomers, cis/trans and E/Z, chirality, reaction types, polymers,
   biomolecules)
3. Remaining simulations embedded in their lessons; reaction-type animations
   and a calorimetry sim
4. Lessons, tools, reference sections and glossary terms findable from the top
   search bar

Phone and tablet layout is deliberately **not** being done yet, at the user's
request. Seven-plus tabs will need a scrollable tab row before release.

---

## Note on organic naming

OpenChemLib has no IUPAC name generator, and writing a correct one is a
research-grade problem, so the app does not pretend to have one. Organic naming
practice will draw on a build-time pool verified against PubChem instead — 684
of the 688 database molecules already carry PubChem's own IUPAC name. Inorganic
naming, which really is just rules, has a genuine bidirectional engine.
