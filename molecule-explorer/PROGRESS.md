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

### Next, in order
1. Course map + long-form lesson format (multi-page, checkpoints between pages)
2. New question types: numeric, balance, name/formula, order, match, sort,
   fillstep, build-in-Draw
3. Glossary, practice-generator framework
4. `17-calc-stoich.js`, `18-calc-gas.js`, `19-calc-solution.js`
5. Balancer tab → Gas Simulator tab → Tools + Reference tabs
6. Units 1–15, one commit each

Phone and tablet layout is deliberately **not** being done yet, at the user's
request. Seven-plus tabs will need a scrollable tab row before release.

---

## Note on organic naming

OpenChemLib has no IUPAC name generator, and writing a correct one is a
research-grade problem, so the app does not pretend to have one. Organic naming
practice will draw on a build-time pool verified against PubChem instead — 684
of the 688 database molecules already carry PubChem's own IUPAC name. Inorganic
naming, which really is just rules, has a genuine bidirectional engine.
