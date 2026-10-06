# Molecule Explorer

An interactive chemistry course and toolkit. The finished product is **one HTML
file** that works with the internet unplugged.

- **`dist/molecule-explorer.html`** — the whole app, 4.99 MB, no installation.
  Copy it anywhere, double-click it, and it opens in a browser.

Everything is inlined: the styles, the JavaScript, the chemistry libraries, the
icons, and a database of 688 molecules verified against PubChem. There are no
CDN links, no external fonts, no asset folders, no server, and no Node needed
to *run* it. Nothing in it costs money and nothing needs an account.

What is in it:

| | |
|---|---|
| **Learn** | A chemistry course from the beginning: 17 units, 72 lessons, 579 questions, about 18 hours of reading. Long-form lessons with a hook, a multi-page body, checkpoints between pages, worked examples, a common-mistakes section, a question set, unlimited randomised practice and a recap. |
| **Draw** | A structure editor that reads back the formula, mass, shape and functional groups of whatever you draw. |
| **Elements** | All 118 elements with shells, orbital diagrams, 3D orbital shapes and properties. |
| **Balancer** | Balances any equation in exact arithmetic, with the working, an atom tally, a by-hand walkthrough and a try-it-yourself mode. |
| **Gas Simulator** | Particles with a draggable piston, PV = nRT computed live in whatever units you pick, four graphs and a real-gas comparison. |
| **Reactions** | 22 reactions animated atom by atom, with a scrubber to stop on the frame where the bonds break. |
| **Tools** | 20 calculators, every one showing its working, several with worked templates to start from. |
| **Reference** | 13 tables, each stating where its data came from, and a 49-word glossary. |
| **Gallery** | 688 molecules grouped by what they are for. |
| **Search** | Molecules by name, nickname, formula or SMILES — and lessons, calculators, tables and glossary words. |

19 interactive simulations are embedded in the lessons that need them.

The single exception to working offline is the **Search online (PubChem)**
section, which fetches extra molecules when there is a connection, and says so
plainly when there is not. Everything else runs entirely from the file.

---

## Rebuilding it

You only need this if you want to change the app. To *use* it, just open
`dist/molecule-explorer.html`.

```bash
cd molecule-explorer
npm install          # OpenChemLib, 3Dmol.js, esbuild, Playwright
npm run build-db     # needs internet: verifies all 688 molecules against PubChem
npm run build        # writes dist/molecule-explorer.html
npm test             # unit tests + a real-browser run with the network off
```

`npm run build-db` is only needed when `src/data/seed.js` or `src/data/ions.js`
changes. The built database is committed, so day-to-day you just run
`npm run build`.

### What each step does

**`npm run build-db`** resolves every entry in `src/data/seed.js` against
PubChem and writes `src/data/molecules.json`. Nothing structural is hand-typed:
the seed file contains only a query name, a category, a one-line fact and an
expected molecular formula. The SMILES, formula, InChIKey, IUPAC name and 3D
coordinates all come from PubChem. Three checks must pass for every entry, and
any failure aborts the build without writing anything:

1. PubChem's formula must match the seed's expected formula.
2. Every entry must *have* an expected formula. (Without this rule a bad name
   resolution ships silently — asking PubChem for "silicone" returns elemental
   silicon.)
3. PubChem's SMILES, re-parsed through the exact OpenChemLib build that ships
   in the app, must describe the same set of atoms PubChem reported.

Responses are cached under `.cache/`, so re-runs are fast and only new queries
touch the network. Run `node scripts/build-db.js --only caffe` to work on a
subset.

**`npm run build`** concatenates `src/css/*.css` and `src/js/*.js` in filename
order, inlines the two libraries and the database, and fills the placeholders in
`src/index.html`. Before writing the output it asserts the result is genuinely
self-contained: any surviving `src=`/`href=` pointing outside the file, any
`<link rel=stylesheet>`, any `@import url()`, or any `fetch()` outside the
PubChem module fails the build.

**`npm test`** runs three suites — 167 logic tests and 175 browser checks:

- `test/unit.mjs` — 73 tests on search (by case, typo, synonym, formula and
  SMILES), the five-bond-carbon message, twenty-odd valid ions and hypervalent
  species that must *not* be flagged, formula and molar mass against known
  values, drawing → recognition, label spacing, crowding in the editor, plus a
  sweep confirming every database entry's stored formula and mass agree with
  its structure.
- `test/engine.mjs` — 94 tests on the calculation engine, run inside the real
  built file. Every number a lesson shows and every answer a lesson grades
  comes out of this code, so these tests are the guarantee that the app cannot
  teach one thing and mark another. They cover:
  - the physical constants, derived from the SI definitions rather than copied;
  - every unit conversion, in both directions, for every dimension;
  - significant figures read from the written text;
  - formula parsing and molar mass, including charges, brackets and hydrates;
  - equation balancing, including the unbalanceable and ambiguous cases;
  - inorganic naming, both directions, and every name round-tripping;
  - Lewis structures and VSEPR shapes for 27 molecules with settled textbook
    answers, plus electron conservation and formal charges;
  - stoichiometry, limiting reactant, percent yield, all four gas laws,
    PV = nRT, concentration, dilution, pH/pOH and q = mcΔT, each with cases
    checkable by hand;
  - freezing- and boiling-point shifts, with the particle count read off the
    formula rather than supplied;
  - answer grading, including a wrong unit, an answer out by a power of ten and
    an answer upside down;
  - every practice generator, run many times, with each problem re-derived a
    second independent way;
  - every course page, hook and question, **rendered for real** — because a
    typo inside a page body is invisible to a structural check;
  - every simulation, built for real;
  - every hand-written link in a lesson, checked to resolve;
  - the search index, with 17 real queries pinned.
- `test/smoke.mjs` — 175 checks in a real browser, loaded from `file://` with
  the network switched off, covering the course reader, the X-ray slider, the
  molecule page, the gallery, the drawing editor, the periodic table, the four
  newer tabs, the search bar and dark mode. It asserts the page makes **zero**
  network requests. A final phase re-enables the network and exercises the
  PubChem path; it is skipped, not failed, on a machine with no connection.

---

## Libraries

| Need | Library | Why |
|---|---|---|
| Structures, SMILES, formulas, valence, 2D layout, canonical IDs, SMARTS | [OpenChemLib](https://github.com/cheminfo/openchemlib-js) 9 (BSD-3) | The only mature pure-JS chemistry toolkit. Its canonical ID code is what makes "you drew ethanol!" work, and its valence model is what keeps validation honest. |
| 3D ball-and-stick | [3Dmol.js](https://3dmol.csb.pitt.edu/) 2 (BSD-3) | Self-contained WebGL viewer that reads molfiles directly. |
| 3D coordinates offline | OpenChemLib's conformer generator | Lets the app work out a 3D shape for anything you draw, with no connection. |
| Bundling | esbuild (build time only) | Converts OpenChemLib's ES module into a plain script, because `file://` pages cannot use ES modules. |

Fuzzy search is about forty lines of trigram-and-edit-distance code rather than
a dependency, and every icon is an inline SVG path.

---

## Source layout

```
src/
  index.html            shell with the build's placeholders
  css/01-tokens.css …   design tokens, base, nav, components, per-view styles
  js/10-core.js         DOM helpers, storage, toasts, tooltips, icons, theme,
                        and the two formula-markup renderers
  js/12-format.js       constants, units, significant figures, answer grading
  js/13-refdata.js      reference tables, each marked VERIFIED, DERIVED or
                        LITERATURE
  js/14-calc-formula.js formula parsing and molar mass
  js/15-calc-balance.js the balancer, in exact rational arithmetic
  js/16-calc-naming.js  inorganic naming, both directions
  js/17-calc-stoich.js  stoichiometry, limiting reactant, empirical formulas
  js/18-calc-gas.js     the gas laws and PV = nRT in any units
  js/19-calc-solution.js concentration, dilution, pH, heat, colligative, ΔG
  js/20-chem.js         valence rules, functional groups, condensed formulas,
                        plain-English validation
  js/21-calc-lewis.js   Lewis structures and VSEPR shapes
  js/30-render2d.js     the SVG renderer and the X-ray slider
  js/35-render3d.js     3Dmol wrapper and offline conformer generation
  js/40-search.js       the offline molecule index
  js/45-pubchem.js      the only module that touches the network
  js/50-molpage.js      the molecule page
  js/60/61/62-draw-*.js the editor's model, its canvas painter, and its UI
  js/66-orbitals.js     configuration parsing, shell and orbital diagrams
  js/68-elements.js     the periodic table and the element pages
  js/70-gallery.js      the gallery
  js/72-searchview.js   search results and the suggestion dropdown
  js/73-balancer.js     the Balancer tab
  js/74-gassim.js       the Gas Simulator tab
  js/75-tools.js        the 18 calculators
  js/76-reference.js    the reference tables and the glossary
  js/77-course.js       the course engine and the question types
  js/78-generators.js   the 21 practice generators
  js/79-lesson-kit.js   the helpers lesson files are written with
  js/79b-sims.js        the 19 simulations
  js/80-learn.js        the course map, the lesson reader, and Unit 15
  js/81-siteindex.js    the search index for lessons, tools and glossary words
  js/90-app.js          shell, router, navigation
  lessons/01-…-17-…js   one file per unit of course content
  data/seed.js          names, categories, facts and formula tripwires
  data/ions.js          the polyatomic ions, with formula and charge tripwires
  data/molecules.json   generated: the verified database
scripts/
  build-db.js           PubChem verification
  build.js              the single-file bundler
  ocl.js                shared OpenChemLib loader for build scripts
test/
  unit.mjs              logic tests
  engine.mjs            the calculation engine, tested inside the built file
  smoke.mjs             offline browser run
```

Each JS file is its own IIFE hanging off a shared `ME` namespace, so
concatenation order is the only coupling between them. `src/js/*.js` are
concatenated in filename order and `src/lessons/*.js` follow, so a lesson file
can register itself with the course engine.

The lesson content is in `src/lessons/` rather than `src/js/` for one practical
reason: there is a great deal of it, and mixing it in with the app code buries
the app code.

---

## The periodic table

A section of its own between Draw and Gallery. All 118 elements laid out in the
conventional 18 columns, colour-coded by category, with the f-block on its own
two rows. Clicking an element gives its atomic number and mass, electron
configuration, usual charges, electronegativity, atomic radius, ionization
energy, electron affinity, melting and boiling points (kelvin and celsius),
density and year of discovery — plus how many bonds it wants, read off the same
table the drawing validator uses, and every molecule in the built-in database
that contains it, each one a link to its page.

None of those numbers is typed from memory. `build-db.js` fetches PubChem's own
periodic table, cross-checks all 118 symbols against the chemistry library that
ships in the app, and fails the build on any disagreement or on anything other
than 118 rows. Only the prose is the app's own: a "where you have met this"
line for the ~45 elements a beginner is likely to run into, and a sentence on
what each category means. Elements without a note simply show their data rather
than being given invented colour.

Each element page also carries three things worked out from its configuration
rather than looked up:

- **How many bonds it wants**, with the reasoning. Where the drawing editor's
  valence table has an entry that is the source of truth, so the two can never
  disagree; beyond it the answer comes from the outer-shell count. Crucially it
  does not pretend the rule is universal: sodium is described as *giving away*
  an electron rather than wanting one bond, and iron says plainly that the
  four-hands picture does not carry over to the d-block, then gives its actual
  charges.
- **An electron configuration diagram** — concentric shells with the electrons
  on them and the outer shell picked out, beside an orbital box diagram filling
  one electron per box before any pairing. The noble-gas core in a string like
  `[Ar]4s2 3d6` is expanded by looking up argon's own configuration in the same
  data and recursing, so there is no hand-typed table of cores. A test confirms
  the expansion by checking that every element's electrons add up to its atomic
  number.
- **The orbital shapes in 3D.** Lobe directions are real 3D vectors, rotated
  and projected every frame and sorted back to front, so you can drag to turn
  them round. Only the types the element actually fills are shown, with a short
  note on what an orbital is. The ten heaviest elements have only a *predicted*
  configuration, and their pages say so rather than presenting it as measured.

Deep links work: `#/elements/Fe` and `#/elements/26` both open iron. The Draw
tool's element picker shares the same layout, categories and data, so the two
tables cannot drift apart.

## The course

17 units, 72 lessons, 579 questions. Progress is counted in questions rather
than lessons, and kept in `localStorage`.

Each lesson has the same shape: a hook that opens on something concrete, a body
of two to four pages with a checkpoint question between them, worked examples,
a "where people go wrong" section, a question set, unlimited randomised
practice where a generator exists, and a recap.

**Every number a lesson prints comes from the app's own calculation code**, or,
where no free machine-readable source exists, from one reference table that
says so. That rule is enforced by tests: the worked examples' figures are
re-computed from the engine, and a table marked LITERATURE has its provenance
shown in the Reference tab rather than being presented as verified.

Two tests exist because structural checks could not catch what they catch:
one renders **every** page, hook and question for real and fails on an
exception, an empty render, or a stray `undefined` reaching the text; the other
builds every simulation. A page body is a function nobody has called until a
reader opens it.

A wrong answer never just says no:

- **Multiple choice** rules out only the option you picked, explains what is
  wrong with *that* option specifically, and leaves the question open.
- **Counting** says whether you are too high or too low and, where the mistake
  is a predictable one, names it — "that is the corners only; each end of the
  zig-zag is a carbon too". Hints are keyed to the exact number entered. The
  answer is never given away.
- **Click-an-atom** describes the atom you actually clicked in the lesson's own
  terms — "that carbon has one line meeting it, so it is carrying three hidden
  hydrogens" — and then points you at what to look for.

Progress is yours to throw away. Above the lessons there is a **Reset answers**
button, which asks once and then puts all 579 questions back on the board, and a
**Remember my progress** switch. Turn the switch off and nothing is written to
the browser at all: answers still count while the tab is open, but reloading
starts you fresh. Switching it off also deletes whatever was already saved. The
theme preference is separate and neither control touches it.

Tests enforce that every question is answerable: each click-an-atom question
must have at least one correct atom and must not accept every atom, each
counting question must match its own molecule, and no question may ask for
something its accepted answer does not have.

## The four newer tabs

**Balancer.** One box, loose input — formulas or names, in any spelling. The
arithmetic is exact rational (BigInt fractions), never floating point, so a
coefficient is never 2.99999 and the app can say for certain whether an
equation balances. Three outcomes are all explained in words: one answer; none,
and which element appears on only one side; or several independent ones, which
means two reactions have been written as one. Also an atom table that goes
green element by element, a conservation-of-mass check, the reaction type with
a reason, mole ratios, a by-hand walkthrough and a try-it-yourself mode.

Typing a name resolves the seven diatomic elements plus P₄ and S₈ to their real
molecular forms, and says why. Before that fix, "methane + oxygen" balanced as
CH₄ + 4O → CO₂ + 2H₂O: arithmetically perfect and chemically nonsense.

**Gas Simulator.** Particles in a box with a draggable piston and visible
wall-hit flashes. A slider *and* a number box for P, V, T and n, each with its
own unit dropdown, remembered between visits. Hold-still locks with one-click
Boyle, Charles, Gay-Lussac and Avogadro presets. 13 gases with real molar
masses, so the heavy ones visibly move more slowly. A live PV = nRT panel using
the right R for the chosen units, with every conversion shown. Absolute zero is
blocked, with the reason.

A gas has three degrees of freedom, not four, so one variable is always
recomputed from the other three — including at startup, which is how the first
version came to violate PV = nRT by 1.4% on its opening frame.

**Reactions.** Pick one of 22 reactions and watch the atoms rearrange. Nothing
here is hand-choreographed, because hand-choreographing twenty reactions means
twenty chances to draw a molecule that does not exist. The whole animation is
derived: the equation goes through the balancer for its coefficients, each
species through OpenChemLib for a real structure with real coordinates, and the
reaction through the formation enthalpies for the size of the flash at the end.
A test checks the first of those directly — every species' drawn atoms must
match its formula, element for element. That check earns its keep: OpenChemLib
will happily hand a bare `[Al]` three implicit hydrogens, and the first build of
this animated aluminium hydride under a label reading "aluminium".

Which bonds survive the reaction is computed rather than decided. Each atom on
the left is matched to an atom of the same element on the right, and a bond
whose two atoms stay together is drawn unbroken the whole way through; only the
ones that really break get to fade and turn red. The matching optimises for
keeping bonds intact, with travel distance as a tie-breaker, which is both
prettier and closer to the truth than the nearest-atom matching it started as —
that one tore the acetate group apart in vinegar and baking soda, a group the
reaction never touches.

What the animation honestly shows is that atoms are conserved and rearranged,
which is the whole idea of a chemical reaction. What it does not show is
mechanism: the path each atom takes between its old molecule and its new one is
drawn, not computed. The page says so rather than letting a pretty animation
imply more than it knows. Where the enthalpy table cannot supply a number, it
says which substance is missing instead of quietly showing no energy at all.

**Tools.** 20 calculators, all sharing the engine the lessons and the graders
use, so an answer here and an answer there can never disagree. Each one shows
its working in the same voice as the lessons.

The **Reaction energy** tool takes any equation the Balancer can balance and
says how much energy it gives out, either for the equation as written or for
the amounts you actually have. It does not store reaction enthalpies: it stores
one enthalpy of formation per *substance* and applies Hess's law,
ΔH°rxn = ΣΔH°f(products) − ΣΔH°f(reactants). The difference matters — a
list of reactions only ever covers what somebody thought to add, while 104
substances cover an unbounded number of reactions between them, including ones
nobody has run. A substance missing from the table is named and refused rather
than quietly dropped from the sum, because a dropped term gives a confident
wrong answer instead of no answer. Amounts are read as moles or grams, and the
scale is set by whichever reactant runs out first, through the same
limiting-reactant code the stoichiometry tool uses — not by whichever one you
happened to name. The answer comes with something to picture it against: how
long a 2 kW kettle would have to run, and how much water that would bring to
the boil.

The **Mix two solutions** tool takes two beakers — a substance and a molarity
each, or a pH typed straight in — and says what the pH is once they meet. It is
built the same way the energy tool is: not a formula per case, but one equation
that covers every case. The textbook approach needs a different formula for
strong + strong, for a buffer, for an equivalence point, and those formulas
disagree at the seams — the buffer one does not know what to do when the base
runs out, and the equivalence-point one does not know it is one drop early.
What this solves instead is the thing physics actually enforces, that a beaker
has no net charge:

    [H⁺] − [OH⁻] + Σ (what each dissolved thing contributes) = 0

Every substance is written the same way — the charge of its fully protonated
form, and a pKa for each proton it can lose — so its average charge is a
function of [H⁺] alone, and the left-hand side rises monotonically with [H⁺].
Chloride is a −1 that never changes; acetic acid is a 0 that becomes −1 as the
pH climbs past 4.76; ammonium is a +1 that becomes 0 past 9.25. Bisection then
finds the one root the equation has and cannot miss it.

Buffers, half-equivalence sitting exactly on the pKa, a weak acid landing at
8.73 rather than 7, sulfuric acid's second proton, 10⁻⁸ M hydrochloric acid
coming out at 6.98 rather than 8 — none of those is a special case in the code.
They are the same equation with different numbers in it, which is the honest
reason they behave the way they do. A classifier does run afterwards, but only
to decide what the reader is *told*: it can be wrong about the wording, never
about the number.

Both Reaction energy and Stoichiometry open with a row of templates — 24 and
20 of them, grouped by what the reaction is for — so the first thing a reader
sees is the tool doing something real, rather than an empty box and a question
mark. A test clicks every one of them and fails if any produces an error, a
blank or a NaN.

**Reference.** 13 tables, and each one states its provenance, because that
genuinely differs: the polyatomic ions are re-verified against PubChem on every
build, the monatomic ion charges are *derived* from the periodic table so they
cannot contradict it, and the solubility rules, activity series, specific
heats, colligative constants, formation enthalpies, pKa values and organic
boiling points are literature values with no free machine-readable source — so
they say so. Plus a 49-word glossary,
searchable, and linkable to a single word from the search bar.

The specific-heat table is the largest of these: 96 substances in eight groups
— water in all its forms, metals and alloys, gases, liquids and solvents,
non-metal elements and minerals, building materials, plastics, and food. It
reads either grouped or ranked highest to lowest, which is the view that makes
the point: the range runs from uranium at 0.116 to hydrogen at 14.30, a factor
of more than a hundred for the same degree in the same gram. Values are printed
at the precision they are known to rather than padded to a fixed width, the
variable ones (wood, soil, food) are quoted to two figures and say why, and the
food group is excluded from the practice generator because its values track
water content rather than being properties of a substance.

The formation-enthalpy table is the one that does the most work for its size:
104 substances in six groups, from which the Reaction energy tool computes any
reaction between them. It is also where the point of the whole scale shows up
most plainly — every element in its standard state is zero by definition, which
is why ozone and diamond, single elements both, are not.

The pKa table is the one whose numbers cannot be verified at all: pKa appears
in PubChem only as unstructured text, so there is nothing free and
machine-readable to check against. What *can* be checked is the arithmetic
built on them, so the engine tests pin twenty-two textbook answers — 0.1 M
acetic acid at 2.88, 0.1 M ammonia at 11.12, a half-neutralised weak acid
landing exactly on its pKa — along with structural facts a typo would break:
successive protons must come off harder than the one before, an acid must come
out acidic, two acids mixed must never produce a base. A transposed digit in a
pKa and a polyprotic acid listed out of order were both introduced deliberately
to confirm the tests catch them.

## Notes on the chemistry

- **Organic vs inorganic** follows the usual teaching convention: carbon bonded
  to hydrogen or to other carbons. Carbonates, cyanides, CO and CO₂ contain
  carbon but are counted as inorganic, as textbooks do.
- **Validation** allows every legitimate exception it should: charged atoms,
  hypervalent sulfur and phosphorus, metals, noble-gas compounds and ionic
  compounds all pass without a warning. The test suite pins this down with
  twenty-odd species that must stay unflagged.
- **Skeletal drawings are refused** where they would mean nothing. A molecule
  with no carbon–carbon backbone gets an explanation instead of a picture.
- **Spare bonds are filled with hydrogens**, so a lone carbon is methane and a
  lone oxygen is water. That is the convention every structure editor uses, and
  it is what lesson 2 teaches. The crossed-out **H** tool overrides it per atom:
  click an atom to strip its hydrogens or put them back, or click empty space to
  drop a bare atom. A stripped atom shows a dot for each hand left empty, which
  is how an unpaired electron is drawn.
- **Radicals keep their unpaired electron.** Nitric oxide, nitrogen dioxide and
  one carbon in vitamin B12 are radicals, and opening them in the editor used to
  fill the gap with a hydrogen — NO silently became HNO. The editor now carries
  the radical state across, and a test checks all 513 database molecules survive
  a round trip through it with their formula unchanged.
- **3D is not invented.** For a salt, whose ions have no fixed arrangement
  relative to one another, the viewer says so rather than generating a shape.
- **Benzene** is drawn Kekulé (alternating double bonds) rather than with a
  circle, so the hydrogen-counting rules the lessons teach keep working. Lesson
  9 explains why both conventions exist.

## Notes on legibility

Two things that are easy to get wrong and are pinned down by tests:

- **Every mark is placed for the whole molecule at once**, not atom by atom.
  Hydrogens, the dots showing hands left empty, and lone pairs all go through
  one pass (`placeDecorations`) against a single shared map of what is already
  on the page.
  Deciding directions per atom is what makes drawings unreadable: two bonded
  carbons both see the same roomy gap between them, both put a mark in it, and
  the two land on top of each other — as a single merged blob, in the case of
  the dots. The pass scores every candidate direction against everything
  already placed, most-constrained atoms first.
- **A tap is never a drag.** The pointer has to travel half a bond length
  before the editor treats a click as a drag. Below that threshold every wobble
  from a trackpad or a fingertip used to spawn a second, bonded atom, which made
  it almost impossible to place a single atom on purpose.
- **A hydrogen tucked in beside its atom still clears it.** Every label sits on
  a small disc that masks the bonds behind it, so a hydrogen placed too close
  disappears under its own atom's disc. The collapsed distance is computed from
  how much angular room the hydrogens actually got, so a lone water molecule
  reads as H O H rather than a smudge.
- **The editor refuses to stack atoms.** New atoms, dropped atoms and dropped
  rings are all pushed out to a minimum separation, a drag that ends near an
  existing atom bonds to it rather than landing on top of it, and the
  next-bond-angle suggestion scores every tidy angle against the whole drawing,
  so a chain cannot fold back onto itself. A 30-carbon chain grown one click at
  a time keeps every atom a full bond length from every other.

Remaining crowding in a handful of very large structures (insulin, vancomycin,
the peptide hormones) comes from OpenChemLib's own 2D layout placing heavy atoms
close together, not from hydrogen placement. Those molecules are better read in
the 3D viewer.

## Browser support

Any current Chrome, Firefox, Safari or Edge on a desktop or a laptop. The
drawing canvas takes touch input. The 3D viewer needs WebGL and says so if it
is unavailable. Progress uses `localStorage`, wrapped in `try`/`catch`, so
private-browsing modes degrade to "progress is not remembered" rather than
breaking.

**A phone and tablet layout has not been done yet**, at the user's explicit
request to leave it until later. The nav carries nine tabs on one row, which
needs a scrollable tab row or a "More" menu before the app is comfortable on a
small screen. Everything works on a small screen; some of it is cramped.
