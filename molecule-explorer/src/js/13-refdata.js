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
  /* Specific heats, in J g⁻¹ K⁻¹, grouped so the table can be read rather
   * than just looked up. Literature values at or near 25 °C — there is no
   * free machine-readable source for these, so like the solubility rules and
   * the activity series they are marked as learned rather than verified.
   *
   * Gases are quoted at constant pressure (c_p), which is the figure q = mcΔT
   * wants for anything heated in the open. Heating a gas in a sealed rigid
   * container takes noticeably less, because none of the energy goes into
   * pushing the surroundings out of the way.
   *
   * Some of these are properties of a pure substance and some are averages
   * over something variable — wood, soil, food — so the variable ones are
   * quoted to two figures and say so. Four significant figures for "bread"
   * would be a lie about how well it is known. */
  const SPECIFIC_HEAT_GROUPS = [
    {
      name: 'Water, in all its forms',
      drill: true,
      note: 'Liquid water has a higher specific heat than almost anything else that is not a gas, because energy goes into stretching and breaking hydrogen bonds instead of into speeding the molecules up. Note that ice and steam are roughly half the liquid value — melting and boiling change the number, so a heating curve needs three of them.',
      items: [
        ['water (liquid)', 4.184],
        ['heavy water, D₂O', 4.22],
        ['seawater', 3.99, 'about 4 % less than pure water, because of the dissolved salt'],
        ['water (ice)', 2.09, 'measured at −10 °C — ice is not quite the same below that'],
        ['water (steam)', 2.01, 'at 100 °C and constant pressure'],
      ],
    },
    {
      name: 'Metals and alloys',
      drill: true,
      note: 'Every one is far below water, which is why a metal pan heats in seconds and the water in it does not. Down a group the value falls roughly as the atomic mass rises — the same energy is being shared among fewer, heavier atoms per gram.',
      items: [
        ['lithium', 3.58, 'by far the highest of any metal — it is the lightest, so a gram is a great many atoms'],
        ['beryllium', 1.825],
        ['magnesium', 1.023],
        ['sodium', 1.228],
        ['potassium', 0.757],
        ['calcium', 0.647],
        ['titanium', 0.523],
        ['aluminium', 0.897],
        ['manganese', 0.479],
        ['chromium', 0.449],
        ['iron', 0.449],
        ['steel (mild)', 0.466],
        ['stainless steel', 0.50],
        ['cast iron', 0.46],
        ['cobalt', 0.421],
        ['nickel', 0.444],
        ['zinc', 0.388],
        ['copper', 0.385],
        ['brass', 0.38],
        ['bronze', 0.435],
        ['silver', 0.235],
        ['tin', 0.227],
        ['mercury', 0.140, 'a liquid metal, and the lowest of any common liquid'],
        ['platinum', 0.133],
        ['tungsten', 0.132],
        ['gold', 0.129],
        ['lead', 0.128],
        ['uranium', 0.116, 'the lowest of any common element — the heaviest atoms, so the fewest per gram'],
      ],
    },
    {
      name: 'Gases, at constant pressure',
      drill: true,
      note: 'Hydrogen and helium are startling: hydrogen takes more than three times as much energy per gram as liquid water. Both are light, so a gram is an enormous number of molecules, and each one has to be sped up. These are cₚ values — heating a gas in a sealed rigid box takes less, because none of the energy goes into pushing the surroundings aside.',
      items: [
        ['hydrogen', 14.30, 'the highest specific heat of any substance at ordinary temperatures'],
        ['helium', 5.193],
        ['methane', 2.22],
        ['ammonia (gas)', 2.19],
        ['neon', 1.030],
        ['nitrogen', 1.040],
        ['air (dry)', 1.005],
        ['oxygen', 0.918],
        ['carbon dioxide', 0.844],
        ['argon', 0.520],
        ['chlorine', 0.479],
        ['krypton', 0.248],
        ['xenon', 0.158],
      ],
    },
    {
      name: 'Liquids and solvents',
      drill: true,
      items: [
        ['ammonia (liquid)', 4.70, 'higher than water — it hydrogen-bonds too, and its molecules are lighter'],
        ['propan-2-ol', 2.68],
        ['methanol', 2.53],
        ['ethanol', 2.44],
        ['glycerol', 2.43],
        ['ethylene glycol (antifreeze)', 2.36],
        ['hexane', 2.26],
        ['petrol', 2.22],
        ['acetone', 2.17],
        ['olive oil', 1.97],
        ['diesel', 1.75],
        ['benzene', 1.74],
        ['chloroform', 0.96],
        ['carbon tetrachloride', 0.85],
      ],
    },
    {
      name: 'Non-metal elements and minerals',
      drill: true,
      items: [
        ['phosphorus (white)', 0.769],
        ['sulfur', 0.71],
        ['carbon (graphite)', 0.709],
        ['silicon', 0.705],
        ['carbon (diamond)', 0.509, 'lower than graphite — same atoms, and a much stiffer lattice'],
        ['sodium chloride', 0.864],
        ['calcium carbonate', 0.82],
        ['silica (quartz)', 0.74],
        ['iodine', 0.214],
      ],
    },
    {
      name: 'Building and everyday materials',
      drill: true,
      note: 'Most of these are mixtures rather than pure substances, so they are quoted to two figures. The exact value depends on what is in the sample and how wet it is.',
      items: [
        ['cork', 2.0],
        ['wood', 1.7, 'varies from about 1.2 to 2.9 with species and moisture'],
        ['rubber', 1.9],
        ['paper', 1.4],
        ['asphalt', 0.92],
        ['concrete', 0.88],
        ['marble', 0.88],
        ['glass', 0.84],
        ['brick', 0.84],
        ['sand (dry)', 0.83],
        ['soil (dry)', 0.80, 'wet soil is much higher, which is why damp ground warms up slowly in spring'],
        ['granite', 0.79],
        ['Pyrex glass', 0.75],
      ],
    },
    {
      name: 'Plastics',
      drill: true,
      note: 'A polymer’s value depends on its chain length and how much it has crystallised, so these are typical rather than exact.',
      items: [
        ['polyethylene', 2.30],
        ['polypropylene', 1.92],
        ['nylon', 1.7],
        ['polystyrene', 1.3],
        ['PTFE (Teflon)', 1.0],
        ['PVC', 0.90],
      ],
    },
    {
      name: 'Food and living tissue',
      drill: false,
      note: 'These track water content almost entirely — the wetter something is, the closer it sits to 4.18. They vary from sample to sample, so two figures is as far as they are worth quoting, and they are left out of the practice questions for that reason.',
      items: [
        ['milk', 3.9],
        ['apple', 3.6],
        ['blood', 3.6],
        ['lean meat', 3.4],
        ['potato', 3.4],
        ['human body (average)', 3.5, 'why a fever of two degrees takes a surprising amount of energy to produce'],
        ['bread', 2.8],
        ['butter', 2.0],
      ],
    },
  ];

  /* The flat lookup every calculator and simulation uses. Derived from the
   * groups, so there is one place a value is written down. */
  const SPECIFIC_HEAT_VALUES = {};
  SPECIFIC_HEAT_GROUPS.forEach((g) => {
    g.items.forEach((row) => { SPECIFIC_HEAT_VALUES[row[0]] = row[1]; });
  });

  const SPECIFIC_HEAT = {
    source: 'Standard tabulated values at or near 25 \u00b0C, in J g\u207b\u00b9 K\u207b\u00b9, with gases at constant pressure. Literature values \u2014 there is no free machine-readable source for these, so they are stated as learned rather than verified against anything.',
    groups: SPECIFIC_HEAT_GROUPS,
    values: SPECIFIC_HEAT_VALUES,
    /* The substances sensible to set a q = mc\u0394T question about: everything
     * except the food, whose values are too sample-dependent to drill on. */
    drillable: SPECIFIC_HEAT_GROUPS.filter((g) => g.drill)
      .reduce((out, g) => out.concat(g.items.map((row) => row[0])), []),
    note(name) {
      for (let i = 0; i < SPECIFIC_HEAT_GROUPS.length; i++) {
        const hit = SPECIFIC_HEAT_GROUPS[i].items.filter((row) => row[0] === name)[0];
        if (hit) return hit[2] || null;
      }
      return null;
    },
    why: 'Water\u2019s value is enormous compared with a metal\u2019s, which is why the sea takes all summer to warm up and a saucepan handle burns you in seconds. The full range here runs from uranium at 0.116 to hydrogen at 14.30 \u2014 a factor of more than a hundred, for the same one degree in the same one gram.',
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

  /* Boiling points of a handful of small organic molecules, for the isomer
   * lessons. The molecule database carries structures and masses but not
   * boiling points, so these are literature values — stated here, once,
   * marked as such, rather than typed into a lesson where nothing could check
   * them. The lessons read them from here and a test pins them, so a number
   * on the page and a number in the table cannot drift apart.
   *
   * Every pair below exists to make one point: the isomers have identical
   * formulas and different boiling points, because shape decides how much
   * contact a molecule makes with its neighbours. */
  const ORGANIC_BP = {
    source: 'Standard boiling points at 1 atm, in °C, from the usual reference tables. Literature values — the molecule database this app verifies against does not carry boiling points.',
    values: {
      'butane': -0.5,
      '2-methylpropane': -11.7,
      'pentane': 36.1,
      '2-methylbutane': 27.8,
      '2,2-dimethylpropane': 9.5,
      'propan-1-ol': 97.2,
      'propan-2-ol': 82.6,
      'cis-but-2-ene': 3.7,
      'trans-but-2-ene': 0.9,
      'ethanol': 78.4,
      'dimethyl ether': -24.0,
      'ethanoic acid': 118.0,
    },
    why: 'Every pair here has one formula and two boiling points. Straight chains lie alongside their neighbours down their whole length; branched and kinked ones cannot, so there is less contact, weaker dispersion forces, and a lower boiling point.',
  };
  /* Formatted for a lesson, with a real minus sign. */
  function boilingPoint(name) {
    const v = ORGANIC_BP.values[name];
    return v === undefined ? null : ME.fmt.fmtSigned(v, 3) + ' \u00b0C';
  }

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

  /* Standard enthalpies of formation, \u0394H\u00b0f at 298 K in kJ/mol.
   *
   * This is what makes a general reaction-energy tool possible: rather than
   * storing the enthalpy of each reaction, which would be a list that only
   * ever covers what somebody thought to add, store the formation enthalpy of
   * each substance and compute any reaction from
   *
   *   \u0394H\u00b0rxn = \u03a3 \u0394H\u00b0f(products) \u2212 \u03a3 \u0394H\u00b0f(reactants)
   *
   * which is Hess\u2019s law in its most useful form.
   *
   * The state matters enormously and is part of the key: water as a liquid is
   * \u2212285.8 and as a gas \u2212241.8, a difference of 44 kJ/mol, which is exactly
   * the energy it takes to boil it. A reaction written without states gets the
   * substance\u2019s standard state, and the tool says which one it used.
   *
   * An element in its standard state is zero by definition \u2014 that is what
   * "formation" is measured from. Those zeroes are listed explicitly rather
   * than applied as a rule, because the rule has exceptions: ozone is +142.7
   * and diamond is +1.9, and both are single elements.
   *
   * Literature values, like the solubility rules and the activity series.
   * There is no free machine-readable source for them, so they are marked as
   * learned rather than verified, and they are taken from one consistent set
   * so that a calculation combining several of them stays self-consistent. */
  const FORMATION_GROUPS = [
    {
      name: 'Elements in their standard state',
      note: 'Zero by definition \u2014 formation enthalpy is measured from here. The two entries that are not zero are the ones that are not the standard state.',
      items: [
        ['H2', 'g', 0, 'hydrogen'], ['O2', 'g', 0, 'oxygen'], ['N2', 'g', 0, 'nitrogen'],
        ['F2', 'g', 0, 'fluorine'], ['Cl2', 'g', 0, 'chlorine'], ['Br2', 'l', 0, 'bromine'],
        ['I2', 's', 0, 'iodine'], ['C', 's', 0, 'carbon, as graphite'],
        ['S', 's', 0, 'sulfur, rhombic'], ['S8', 's', 0, 'sulfur, as the S8 ring'],
        ['P4', 's', 0, 'phosphorus, white'],
        ['Na', 's', 0, 'sodium'], ['K', 's', 0, 'potassium'], ['Li', 's', 0, 'lithium'],
        ['Mg', 's', 0, 'magnesium'], ['Ca', 's', 0, 'calcium'], ['Ba', 's', 0, 'barium'],
        ['Al', 's', 0, 'aluminium'], ['Fe', 's', 0, 'iron'], ['Cu', 's', 0, 'copper'],
        ['Zn', 's', 0, 'zinc'], ['Pb', 's', 0, 'lead'], ['Ag', 's', 0, 'silver'],
        ['Sn', 's', 0, 'tin'], ['Ti', 's', 0, 'titanium'], ['Si', 's', 0, 'silicon'],
        ['Hg', 'l', 0, 'mercury'], ['He', 'g', 0, 'helium'], ['Ne', 'g', 0, 'neon'],
        ['Ar', 'g', 0, 'argon'],
        ['O3', 'g', 142.7, 'ozone \u2014 oxygen, and not the standard state'],
        ['C', 's-diamond', 1.895, 'diamond \u2014 carbon, and not the standard state'],
      ],
    },
    {
      name: 'Water and simple oxides',
      items: [
        ['H2O', 'l', -285.83, 'water'],
        ['H2O', 'g', -241.82, 'steam \u2014 44 kJ/mol above the liquid, which is what boiling costs'],
        ['H2O2', 'l', -187.78, 'hydrogen peroxide'],
        ['CO2', 'g', -393.51, 'carbon dioxide'],
        ['CO', 'g', -110.53, 'carbon monoxide'],
        ['SO2', 'g', -296.83, 'sulfur dioxide'],
        ['SO3', 'g', -395.72, 'sulfur trioxide'],
        ['NO', 'g', 90.25, 'nitrogen monoxide \u2014 positive, so making it costs energy'],
        ['NO2', 'g', 33.18, 'nitrogen dioxide'],
        ['N2O', 'g', 82.05, 'dinitrogen monoxide'],
        ['N2O4', 'g', 9.16, 'dinitrogen tetroxide'],
        ['CaO', 's', -635.09, 'quicklime'],
        ['MgO', 's', -601.70, 'magnesium oxide'],
        ['Al2O3', 's', -1675.7, 'aluminium oxide \u2014 one of the most negative there is'],
        ['Fe2O3', 's', -824.2, 'iron(III) oxide, rust'],
        ['Fe3O4', 's', -1118.4, 'magnetite'],
        ['FeO', 's', -272.0, 'iron(II) oxide'],
        ['CuO', 's', -157.3, 'copper(II) oxide'],
        ['Cu2O', 's', -168.6, 'copper(I) oxide'],
        ['ZnO', 's', -348.28, 'zinc oxide'],
        ['PbO', 's', -219.0, 'lead(II) oxide'],
        ['TiO2', 's', -944.0, 'titanium dioxide'],
        ['SiO2', 's', -910.94, 'silica, as quartz'],
        ['P4O10', 's', -2984.0, 'phosphorus(V) oxide'],
      ],
    },
    {
      name: 'Hydrocarbons and fuels',
      note: 'The fuels are all mildly negative. Almost all the energy of burning them comes from how deeply negative CO\u2082 and water are, not from the fuel itself.',
      items: [
        ['CH4', 'g', -74.81, 'methane \u2014 natural gas'],
        ['C2H6', 'g', -84.68, 'ethane'],
        ['C3H8', 'g', -103.85, 'propane'],
        ['C4H10', 'g', -126.15, 'butane'],
        ['C8H18', 'l', -249.9, 'octane \u2014 the reference for petrol'],
        ['C2H4', 'g', 52.26, 'ethene \u2014 positive, which is part of why it polymerises so readily'],
        ['C2H2', 'g', 226.73, 'ethyne \u2014 strongly positive, which is why it burns so hot'],
        ['C6H6', 'l', 49.0, 'benzene'],
      ],
    },
    {
      name: 'Alcohols, acids and sugars',
      items: [
        ['CH3OH', 'l', -238.66, 'methanol'],
        ['C2H5OH', 'l', -277.69, 'ethanol'],
        ['CH3COOH', 'l', -484.5, 'ethanoic acid \u2014 vinegar'],
        ['C6H12O6', 's', -1273.3, 'glucose'],
        ['C12H22O11', 's', -2226.1, 'sucrose \u2014 table sugar'],
        ['CH2O2', 'l', -424.72, 'methanoic acid'],
      ],
    },
    {
      name: 'Acids, bases and salts',
      note: 'The (aq) values use the usual convention for dissolved species, so a neutralisation worked out from them comes to about \u221256 kJ per mole of water made \u2014 the figure a school experiment measures is near \u221257.',
      items: [
        ['NH3', 'g', -46.11, 'ammonia'],
        ['HCl', 'g', -92.31, 'hydrogen chloride gas'],
        ['HCl', 'aq', -167.16, 'hydrochloric acid'],
        ['HBr', 'g', -36.40, 'hydrogen bromide'],
        ['HI', 'g', 26.48, 'hydrogen iodide'],
        ['H2S', 'g', -20.63, 'hydrogen sulfide'],
        ['H2SO4', 'l', -813.99, 'sulfuric acid'],
        ['HNO3', 'l', -174.10, 'nitric acid'],
        ['NaOH', 's', -425.61, 'sodium hydroxide'],
        ['NaOH', 'aq', -470.11, 'sodium hydroxide solution'],
        ['NaCl', 's', -411.15, 'table salt'],
        ['NaCl', 'aq', -407.27, 'salt in solution'],
        ['KCl', 's', -436.75, 'potassium chloride'],
        ['NaBr', 's', -361.06, 'sodium bromide'],
        ['LiCl', 's', -408.61, 'lithium chloride'],
        ['AgCl', 's', -127.07, 'silver chloride'],
        ['CaCl2', 's', -795.8, 'calcium chloride'],
        ['CaCO3', 's', -1206.9, 'limestone, as calcite'],
        ['MgCO3', 's', -1095.8, 'magnesium carbonate'],
        ['Na2CO3', 's', -1130.68, 'washing soda'],
        ['NaHCO3', 's', -950.81, 'sodium hydrogen carbonate \u2014 baking soda'],
        ['Ca(OH)2', 's', -986.09, 'slaked lime'],
        ['Mg(OH)2', 's', -924.54, 'magnesium hydroxide'],
        ['CaSO4', 's', -1434.11, 'calcium sulfate'],
        ['BaSO4', 's', -1473.2, 'barium sulfate'],
        ['NH4Cl', 's', -314.43, 'ammonium chloride'],
        ['NH4NO3', 's', -365.56, 'ammonium nitrate'],
        ['KNO3', 's', -494.63, 'potassium nitrate'],
      ],
    },
    {
      name: 'Other compounds',
      items: [
        ['CCl4', 'l', -135.44, 'carbon tetrachloride'],
        ['CHCl3', 'l', -134.47, 'chloroform'],
        ['CS2', 'l', 89.70, 'carbon disulfide'],
        ['PCl3', 'l', -319.7, 'phosphorus trichloride'],
        ['PCl5', 's', -443.5, 'phosphorus pentachloride'],
        ['SF6', 'g', -1209.0, 'sulfur hexafluoride'],
      ],
    },
  ];

  /* Keyed by the formula in Hill order and the state, so HOH and H2O land on
   * the same entry and liquid water and steam do not.
   *
   * Built on first use rather than at load, because the key is produced by
   * ME.formula.parse and this file is concatenated before the formula parser.
   * Doing it eagerly left ME.formula undefined and stopped the app booting. */
  let FORMATION_INDEX = null;
  let FORMATION_DEFAULT = null;
  function buildFormationIndex() {
    FORMATION_INDEX = {};
    FORMATION_DEFAULT = {};
    FORMATION_GROUPS.forEach((g) => {
      g.items.forEach((row) => {
        const parsed = ME.formula.parse(row[0]);
        const key = parsed.ok ? parsed.text : row[0];
        FORMATION_INDEX[key + '|' + row[1]] = { f: row[0], hill: key, state: row[1], dh: row[2], name: row[3] };
        /* The first state listed for a substance is its standard one, which is
         * what a reaction written without state labels gets. */
        if (FORMATION_DEFAULT[key] === undefined) FORMATION_DEFAULT[key] = row[1];
      });
    });
  }

  const FORMATION = {
    source: 'Standard enthalpies of formation at 298 K, in kJ/mol, from one consistent set of tabulated values. Literature data \u2014 there is no free machine-readable source for these, so they are stated as learned rather than verified against anything.',
    groups: FORMATION_GROUPS,
    why: 'Store one number per substance and you can work out any reaction between them, because \u0394H\u00b0rxn is the products\u2019 formation enthalpies minus the reactants\u2019. That is Hess\u2019s law doing real work: a reaction nobody has ever run can be costed from substances that have each been measured once.',
    /* Look a species up. `state` may be null, in which case the standard
     * state is used and the caller is told which that was. */
    lookup(formulaText, state) {
      if (!FORMATION_INDEX) buildFormationIndex();
      const parsed = ME.formula.parse(formulaText);
      if (!parsed.ok) return null;
      const want = state || FORMATION_DEFAULT[parsed.text];
      if (want === undefined) return null;
      const hit = FORMATION_INDEX[parsed.text + '|' + want];
      if (!hit) return null;
      return {
        dh: hit.dh, state: hit.state, name: hit.name,
        display: parsed.display,
        assumedState: !state,
      };
    },
    has(formulaText, state) { return FORMATION.lookup(formulaText, state) !== null; },
    get count() {
      if (!FORMATION_INDEX) buildFormationIndex();
      return Object.keys(FORMATION_INDEX).length;
    },
  };

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
    SPECIFIC_HEAT, LATENT, COLLIGATIVE, ORGANIC_BP, boilingPoint, FORMATION, PREFIXES,
    elementName, elementNameLower, SPELLING,
  };
})();
