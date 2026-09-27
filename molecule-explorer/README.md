# Molecule Explorer

An interactive organic chemistry teaching app. The finished product is **one
HTML file** that works with the internet unplugged.

- **`dist/molecule-explorer.html`** — the whole app, 3.3 MB, no installation.
  Copy it anywhere, double-click it, and it opens in a browser.

Everything is inlined: the styles, the JavaScript, the chemistry libraries, the
icons, and a database of 513 molecules verified against PubChem. There are no
CDN links, no external fonts, no asset folders, no server, and no Node needed
to *run* it. Nothing in it costs money and nothing needs an account.

The single exception is the **Search online (PubChem)** section, which fetches
extra molecules when there is a connection, and says so plainly when there is
not. Everything else — Learn, Draw, Gallery, search of the built-in database,
molecule pages, the X-ray slider, the 3D viewer, validation and recognition —
runs entirely from the file.

---

## Rebuilding it

You only need this if you want to change the app. To *use* it, just open
`dist/molecule-explorer.html`.

```bash
cd molecule-explorer
npm install          # OpenChemLib, 3Dmol.js, esbuild, Playwright
npm run build-db     # needs internet: verifies all 513 molecules against PubChem
npm run build        # writes dist/molecule-explorer.html
npm test             # unit tests + a real-browser run with the network off
```

`npm run build-db` is only needed when `src/data/seed.js` changes. The built
database is committed, so day-to-day you just run `npm run build`.

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

**`npm test`** runs both suites:

- `test/unit.mjs` — 46 logic tests (search by case, typo, synonym, formula and
  SMILES; the five-bond-carbon message; twenty-odd valid ions and hypervalent
  species that must *not* be flagged; formula and molar mass against known
  values; drawing → recognition; label spacing in the drawings; crowding in the
  editor; plus a sweep confirming every database entry's stored formula and mass
  agree with its structure).
- `test/smoke.mjs` — 57 checks in a real browser, loaded from `file://` with
  the network switched off, covering all eleven lessons, the X-ray slider, the
  molecule page, the gallery, the drawing editor, the periodic table and dark
  mode. It asserts the page makes **zero** network requests. A final phase
  re-enables the network and exercises the PubChem path; it is skipped, not
  failed, on a machine with no connection.

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
  js/10-core.js         DOM helpers, storage, toasts, tooltips, icons, theme
  js/20-chem.js         valence rules, functional groups, condensed formulas,
                        plain-English validation
  js/30-render2d.js     the SVG renderer and the X-ray slider
  js/35-render3d.js     3Dmol wrapper and offline conformer generation
  js/40-search.js       the offline index: names, synonyms, formulas, structures
  js/45-pubchem.js      the only module that touches the network
  js/50-molpage.js      the molecule page
  js/60/61/62-draw-*.js the editor's model, its canvas painter, and its UI
  js/70-gallery.js      the gallery
  js/72-searchview.js   search results and the suggestion dropdown
  js/80-learn.js        the eleven lessons
  js/90-app.js          shell, router, navigation
  data/seed.js          names, categories, facts and formula tripwires
  data/molecules.json   generated: the verified database
scripts/
  build-db.js           PubChem verification
  build.js              the single-file bundler
  ocl.js                shared OpenChemLib loader for build scripts
test/
  unit.mjs              logic tests
  smoke.mjs             offline browser run
```

Each JS file is its own IIFE hanging off a shared `ME` namespace, so
concatenation order is the only coupling between them.

---

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

- **Hydrogens are placed for the whole molecule at once**, not atom by atom.
  Deciding each atom's hydrogen directions independently is what makes drawings
  unreadable: two bonded carbons both see the same roomy gap between them, both
  put a hydrogen in it, and the letters land on top of each other.
  `placeAllHydrogens` scores every candidate direction against a shared map of
  what is already on the page, placing the most constrained atoms first.
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

Any current Chrome, Firefox, Safari or Edge, on desktop, tablet or phone. The
drawing canvas takes touch input. The 3D viewer needs WebGL and says so if it
is unavailable. Lesson progress uses `localStorage`, wrapped in `try`/`catch`,
so private-browsing modes degrade to "progress is not remembered" rather than
breaking.
