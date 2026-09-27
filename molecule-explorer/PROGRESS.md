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

### Next, in order
1. Course map + long-form lesson format (multi-page, checkpoints between pages)
2. New question types: numeric, balance, name/formula, order, match, sort,
   fillstep, build-in-Draw
3. Glossary, practice-generator framework
4. `16-calc-naming.js` (inorganic name ⇄ formula), `17-calc-stoich.js`,
   `18-calc-gas.js`, `19-calc-solution.js`
5. Balancer tab → Gas Simulator tab → Tools + Reference tabs
6. Units 1–15, one commit each

Phone and tablet layout is deliberately **not** being done yet, at the user's
request. Seven-plus tabs will need a scrollable tab row before release.
