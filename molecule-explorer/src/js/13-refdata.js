/* The reference tables a first chemistry course needs.
 *
 * Provenance matters here, so it is marked per table:
 *
 *   VERIFIED  the polyatomic ions come from PubChem at build time, formula and
 *             charge both cross-checked, and the build fails on a mismatch.
 *             Atomic masses, symbols and electron configurations likewise.
 *   DERIVED   monatomic ion charges are worked out from an element's group,
 *             which comes from the verified element table. No second list.
 *   LITERATURE the solubility rules, the activity series, the strong acid and
 *             base lists, and the specific heats are textbook data with no
 *             free machine-readable source. They are kept here, in one place,
 *             short, and the app says where they came from rather than
 *             implying they were checked against anything.
 */
(function () {
  'use strict';

  const ME = window.ME;

  /* ------------------------------------------------- VERIFIED: the ion table */
  let IONS = [];
  const ION_BY_NAME = new Map();
  const ION_BY_FORMULA = new Map();

  function setIons(list) {
    IONS = list || [];
    ION_BY_NAME.clear();
    ION_BY_FORMULA.clear();
    IONS.forEach((ion) => {
      ION_BY_NAME.set(ion.n.toLowerCase(), ion);
      (ion.syn || []).forEach((s) => {
        if (!ION_BY_NAME.has(s.toLowerCase())) ION_BY_NAME.set(s.toLowerCase(), ion);
      });
      /* Keyed on the canonical atom counts, so HCO3 and CHO3 both find it. */
      const p = ME.formula.parse(ion.f);
      if (p.ok) ION_BY_FORMULA.set(p.text + '|' + ion.c, ion);
    });
  }

  function ionByName(name) {
    if (!name) return null;
    const k = String(name).toLowerCase().trim();
    return ION_BY_NAME.get(k) || null;
  }

  /* Find the polyatomic ion matching a set of atoms and a charge. */
  function ionByFormula(formulaText, charge) {
    const p = ME.formula.parse(formulaText);
    if (!p.ok) return null;
    return ION_BY_FORMULA.get(p.text + '|' + charge) || null;
  }

  /* --------------------------------------- DERIVED: monatomic ion charges */
  /* Which charge a main-group element takes, and why. Group 1 has one electron
   * in its outer shell and loses it; group 17 is one short and takes one. So
   * this is read off the periodic table rather than stored as a second table
   * that could disagree with it.
   *
   * The transition metals are left out on purpose: they genuinely take several
   * charges, which is the whole reason Roman numerals exist in their names. */
  const el = (sym) => { const e = ME.chem.element(sym); return e ? e.name : sym; };

  function typicalCharge(sym) {
    const e = ME.chem.element(sym);
    if (!e) return null;
    const pos = ME.chem.ptPosition(e.z);
    const group = pos ? pos[1] : null;
    const block = String(e.block || '').toLowerCase();

    if (sym === 'H') return { charge: 1, why: 'Hydrogen has one electron and usually hands it over, leaving a bare proton.' };
    if (block === 'noble gas') return { charge: 0, why: 'A full outer shell already. It has no reason to gain or lose anything.' };

    /* A true transition metal, or an f-block metal. These genuinely take more
     * than one charge, which is the whole reason Roman numerals exist in their
     * names. Matched exactly rather than by substring, because "post-transition
     * metal" contains the word and aluminium is not one - Al is always 3+. */
    if (FIXED_D_BLOCK[sym] !== undefined) {
      return { charge: FIXED_D_BLOCK[sym], why: el(sym) + ' sits in the d-block but only ever turns up as ' +
        FIXED_D_BLOCK[sym] + '+, so by convention its name is written without a Roman numeral.' };
    }
    if (block === 'transition metal' || block === 'lanthanide' || block === 'actinide') {
      return { charge: null, variable: true, why: 'A transition metal, and it genuinely takes more than one charge \u2014 iron is happy as 2+ or 3+. That is exactly why its name carries a Roman numeral: the numeral is there to tell you which one this time.' };
    }

    const metallic = block === 'alkali metal' || block === 'alkaline earth metal' ||
      block === 'post-transition metal';

    if (group === 1) return { charge: 1, why: 'One electron in the outer shell. Losing it leaves a full shell underneath, which is a far easier trade than finding seven more.' };
    if (group === 2) return { charge: 2, why: 'Two electrons in the outer shell, and losing both leaves a full shell underneath.' };
    if (group === 13) {
      if (sym === 'Tl') return { charge: null, variable: true, why: 'Thallium takes 1+ or 3+, so its name needs a Roman numeral like a transition metal.' };
      return { charge: 3, why: 'Three electrons in the outer shell, and it gives all three away.' };
    }
    if (group === 14) {
      if (metallic) return { charge: null, variable: true, why: 'Tin and lead each take 2+ or 4+, so their names carry a Roman numeral.' };
      return { charge: null, variable: true, why: 'Halfway. Gaining four electrons or losing four are both hard, so group 14 shares instead \u2014 which is why carbon makes covalent bonds rather than ions.' };
    }
    if (group === 15) {
      /* Nitrogen and phosphorus take three electrons; bismuth, a metal, gives
       * three away. Same group, opposite sign, because one is a nonmetal. */
      if (metallic) return { charge: 3, why: 'A metal in group 15, so it gives its three outer electrons away rather than taking three.' };
      if (block === 'metalloid') return { charge: null, variable: true, why: 'A metalloid, sitting on the fence: it will go either way depending on what it is up against.' };
      return { charge: -3, why: 'Three short of eight, so it takes three.' };
    }
    if (group === 16) {
      if (metallic || block === 'metalloid') return { charge: null, variable: true, why: 'Down group 16 the elements turn metallic and stop forming a tidy 2\u2212 ion.' };
      return { charge: -2, why: 'Two short of eight, so it takes two.' };
    }
    if (group === 17) return { charge: -1, why: 'One short of a full shell. Taking a single electron finishes the job, which is why the halogens are so reactive.' };
    if (block === 'metalloid') return { charge: null, variable: true, why: 'A metalloid, halfway between a metal and a nonmetal, and it behaves like whichever suits the situation.' };
    return { charge: null, why: 'This one does not follow a simple rule.' };
  }

  /* -------------- LITERATURE: transition metals with only one charge */
  /* A handful of metals in the d-block take just one charge in practice, and
   * every first course names them without a Roman numeral: zinc oxide, not
   * zinc(II) oxide. Strict modern IUPAC would write the numeral anyway, but a
   * beginner who writes "zinc(II) oxide" will be marked wrong, so the app
   * follows the convention it is teaching. This is convention, not a
   * measurement, which is why it is a list rather than a derivation. */
  const FIXED_D_BLOCK = { Zn: 2, Cd: 2, Ag: 1, Sc: 3, Y: 3, La: 3 };

  /* ------------------------------ LITERATURE: the -ide stems for anions */
  /* Language, not chemistry. Most element names just lose their ending, but
   * enough are irregular that they have to be written down. */
  const IDE_STEM = {
    H: 'hydr', C: 'carb', N: 'nitr', O: 'ox', F: 'fluor', P: 'phosph', S: 'sulf',
    Cl: 'chlor', Se: 'selen', Br: 'brom', As: 'arsen', Te: 'tellur', I: 'iod',
    B: 'bor', Si: 'silic', At: 'astat', Sb: 'antimon', Ge: 'german', Sn: 'stann', Pb: 'plumb',
  };
  function ideName(sym) {
    const stem = IDE_STEM[sym];
    if (stem) return stem + 'ide';
    const e = ME.chem.element(sym);
    if (!e) return null;
    /* The regular case: drop a trailing -ine, -ium, -en, -on and add -ide. */
    return e.name.toLowerCase().replace(/(ine|ium|ogen|on|um|us|y)$/, '') + 'ide';
  }

  /* Metals with a long-standing Latin name that the older -ous/-ic system used.
   * Worth knowing because bottles and older books still use them. */
  const LATIN = {
    Fe: 'ferr', Cu: 'cupr', Sn: 'stann', Pb: 'plumb', Au: 'aur', Ag: 'argent',
    Hg: 'mercur', Sb: 'stib', W: 'wolfram', Na: 'natr', K: 'kal',
  };

  /* ------------------------------------- LITERATURE: solubility rules */
  /* The standard first-course set. Useful, approximate, and honest about it. */
  const SOLUBILITY = {
    source: 'The standard first-course solubility rules. They are rules of thumb that get the common cases right, not laws — every one has exceptions, and the exceptions are listed.',
    rules: [
      { ions: ['NO3'], soluble: true, text: 'All nitrates dissolve.', exceptions: [],
        why: 'No common nitrate is insoluble, which makes nitrates the go-to way to get a metal ion into solution.' },
      { ions: ['C2H3O2'], soluble: true, text: 'All acetates dissolve.', exceptions: ['silver acetate is only slightly soluble'],
        why: 'Same idea as nitrates — a reliable way to dissolve a metal.' },
      { ions: ['Na', 'K', 'NH4', 'Li'], soluble: true, text: 'Anything with sodium, potassium, lithium or ammonium dissolves.', exceptions: [],
        why: 'These ions are small or spread-out enough that water always wins against the lattice.' },
      { ions: ['Cl', 'Br', 'I'], soluble: true, text: 'Chlorides, bromides and iodides dissolve — except with silver, lead or mercury(I).', exceptions: ['AgCl', 'PbCl2', 'Hg2Cl2', 'AgBr', 'PbBr2', 'AgI', 'PbI2'],
        why: 'Those three exceptions come up constantly in precipitation tests, so they are worth knowing by name rather than by rule.' },
      { ions: ['SO4'], soluble: true, text: 'Sulfates dissolve — except with barium, lead, calcium, strontium or silver.', exceptions: ['BaSO4', 'PbSO4', 'CaSO4', 'SrSO4', 'Ag2SO4'],
        why: 'Barium sulfate is so insoluble it is safe to drink as a medical X-ray dye, which is a striking way to remember it.' },
      { ions: ['OH'], soluble: false, text: 'Hydroxides do not dissolve — except with group 1 metals, and partly with calcium, strontium and barium.', exceptions: ['NaOH', 'KOH', 'LiOH', 'Ca(OH)2', 'Sr(OH)2', 'Ba(OH)2'],
        why: 'This is why a metal hydroxide usually appears as a cloudy precipitate the moment you add a base.' },
      { ions: ['CO3', 'PO4', 'SO3'], soluble: false, text: 'Carbonates, phosphates and sulfites do not dissolve — except with group 1 metals or ammonium.', exceptions: ['Na2CO3', 'K2CO3', '(NH4)2CO3', 'Na3PO4'],
        why: 'A charge of 2− or 3− grips its metal hard, and water cannot pull the lattice apart.' },
      { ions: ['S'], soluble: false, text: 'Sulfides do not dissolve — except with group 1, group 2 or ammonium.', exceptions: ['Na2S', 'K2S', '(NH4)2S', 'CaS', 'BaS'],
        why: 'Metal sulfides are the ores most metals are actually mined as, precisely because they do not wash away.' },
    ],
  };

  /* --------------------------------------- LITERATURE: activity series */
  /* Most reactive metal first. The order is the standard teaching series, set
   * by measured reduction potentials; the potentials themselves have no free
   * machine-readable source, so the order is given without them. */
  const ACTIVITY = {
    source: 'The standard activity series as printed in first-course textbooks, ordered by measured reduction potential.',
    note: 'A metal higher in this list will push a metal lower down out of its compound. Anything above hydrogen will push hydrogen out of an acid, which is why it fizzes.',
    metals: ['Li', 'K', 'Ba', 'Sr', 'Ca', 'Na', 'Mg', 'Al', 'Mn', 'Zn', 'Cr', 'Fe', 'Cd',
             'Co', 'Ni', 'Sn', 'Pb', 'H', 'Cu', 'Ag', 'Hg', 'Pt', 'Au'],
    halogens: ['F', 'Cl', 'Br', 'I'],
  };

  function moreReactive(a, b) {
    const i = ACTIVITY.metals.indexOf(a), j = ACTIVITY.metals.indexOf(b);
    if (i < 0 || j < 0) return null;
    return i < j;
  }

  /* ------------------------------- LITERATURE: strong acids and bases */
  const STRONG_ACIDS = {
    source: 'The six strong acids every first course asks you to know, plus the note that everything else is weak.',
    list: [
      { f: 'HCl', n: 'Hydrochloric acid' }, { f: 'HBr', n: 'Hydrobromic acid' },
      { f: 'HI', n: 'Hydroiodic acid' }, { f: 'HNO3', n: 'Nitric acid' },
      { f: 'H2SO4', n: 'Sulfuric acid', note: 'Strong for its first hydrogen only; the second comes off reluctantly.' },
      { f: 'HClO4', n: 'Perchloric acid' },
    ],
    why: 'Strong means it hands its hydrogen over completely, every molecule, rather than most of them holding on. It is not the same as concentrated, and mixing the two up is the single most common mistake in this whole topic.',
  };

  const STRONG_BASES = {
    source: 'The group 1 and heavier group 2 hydroxides.',
    list: [
      { f: 'LiOH', n: 'Lithium hydroxide' }, { f: 'NaOH', n: 'Sodium hydroxide' },
      { f: 'KOH', n: 'Potassium hydroxide' }, { f: 'RbOH', n: 'Rubidium hydroxide' },
      { f: 'CsOH', n: 'Caesium hydroxide' },
      { f: 'Ca(OH)2', n: 'Calcium hydroxide' }, { f: 'Sr(OH)2', n: 'Strontium hydroxide' },
      { f: 'Ba(OH)2', n: 'Barium hydroxide' },
    ],
    why: 'These come apart completely in water and release every hydroxide they have.',
  };

  /* ------------------------------------- LITERATURE: specific heats */
  /* In J per gram per kelvin, at around room temperature. */
  const SPECIFIC_HEAT = {
    source: 'Standard tabulated values near 25 °C, in J g⁻¹ K⁻¹.',
    values: {
      'water (liquid)': 4.184, 'water (ice)': 2.09, 'water (steam)': 2.01,
      ethanol: 2.44, aluminium: 0.897, iron: 0.449, copper: 0.385,
      gold: 0.129, lead: 0.128, silver: 0.235, glass: 0.84,
      'air (dry)': 1.005, granite: 0.79, wood: 1.7, 'olive oil': 1.97,
    },
    why: 'Water’s value is enormous compared with a metal’s, which is why the sea takes all summer to warm up and a saucepan handle burns you in seconds.',
  };

  /* Latent heats of water, which the heating-curve lesson needs, in J/g. */
  const LATENT = {
    source: 'Standard values for water at its normal melting and boiling points, in J g⁻¹.',
    fusion: 334, vaporisation: 2257,
    why: 'Both are the flat parts of a heating curve: energy going in with the temperature refusing to budge, because it is breaking the particles apart instead of speeding them up.',
  };

  /* Freezing-point and boiling-point constants, for the colligative lesson.
   * Literature values — there is no free machine-readable source for these,
   * so they are stated as learned rather than verified, like the solubility
   * rules and the activity series. */
  const COLLIGATIVE = {
    source: 'Standard cryoscopic and ebullioscopic constants, in °C kg mol⁻¹.',
    solvents: {
      water: { Kf: 1.86, Kb: 0.512, mp: 0, bp: 100 },
      benzene: { Kf: 5.12, Kb: 2.53, mp: 5.5, bp: 80.1 },
      'acetic acid': { Kf: 3.90, Kb: 3.07, mp: 16.6, bp: 118 },
      cyclohexane: { Kf: 20.0, Kb: 2.79, mp: 6.5, bp: 80.7 },
    },
    why: 'Water’s 1.86 means a solution of one mole of particles per kilogram freezes 1.86 °C lower. Cyclohexane’s 20.0 is why it is used to measure molar masses this way — the same solution shifts its freezing point ten times further, so the measurement is ten times easier to read.',
  };

  /* PubChem's element table uses American spellings, and the rest of the app
   * is written in British English. Rather than let generated names say
   * "aluminum sulfate" in the middle of a lesson that says aluminium, the two
   * differing names are mapped once, here, and every generated name goes
   * through it. The symbols and all the numbers are untouched. */
  const SPELLING = { Aluminum: 'Aluminium', Cesium: 'Caesium' };
  function elementName(sym) {
    const e = ME.chem.element(sym);
    if (!e) return sym;
    return SPELLING[e.name] || e.name;
  }
  /* Lower case, for use inside a compound name. */
  function elementNameLower(sym) { return elementName(sym).toLowerCase(); }

  /* SI prefixes, which are definitions rather than measurements. */
  const PREFIXES = [
    ['tera', 'T', 12], ['giga', 'G', 9], ['mega', 'M', 6], ['kilo', 'k', 3],
    ['hecto', 'h', 2], ['deca', 'da', 1], ['—', '', 0], ['deci', 'd', -1],
    ['centi', 'c', -2], ['milli', 'm', -3], ['micro', 'µ', -6],
    ['nano', 'n', -9], ['pico', 'p', -12], ['femto', 'f', -15],
  ];

  ME.ref = {
    setIons, get ions() { return IONS; }, ionByName, ionByFormula,
    typicalCharge, ideName, IDE_STEM, LATIN, FIXED_D_BLOCK,
    SOLUBILITY, ACTIVITY, moreReactive, STRONG_ACIDS, STRONG_BASES,
    SPECIFIC_HEAT, LATENT, COLLIGATIVE, PREFIXES,
    elementName, elementNameLower, SPELLING,
  };
})();
