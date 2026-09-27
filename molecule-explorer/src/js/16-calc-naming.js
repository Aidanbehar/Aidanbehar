/* Naming inorganic compounds, and turning a name back into a formula.
 *
 * Naming is one of the few parts of chemistry that really is just rules, which
 * is good news: a rule engine can do it, and can show its working. Everything
 * here is driven by the verified element table and the verified polyatomic ion
 * table, so a name and the formula it describes cannot drift apart.
 *
 * What it covers is what a first course covers: ionic compounds (including
 * transition metals with Roman numerals), covalent compounds with prefixes,
 * acids, and hydrates. It does not attempt organic names — those are a much
 * harder problem and the app gets them from PubChem instead.
 */
(function () {
  'use strict';

  const ME = window.ME;

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const FROM_ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };

  /* The Greek prefixes, for compounds of two nonmetals. */
  const PREFIX = ['', 'mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'];
  const FROM_PREFIX = {};
  PREFIX.forEach((p, i) => { if (p) FROM_PREFIX[p] = i; });
  /* A prefix ending in a vowel drops it before another vowel, so the name
   * "dinitrogen pentoxide" carries "pent", not "penta". Every clipped form has
   * to be readable or the name comes back as N2O instead of N2O5. */
  PREFIX.forEach((p, i) => {
    if (p && /[ao]$/.test(p)) FROM_PREFIX[p.slice(0, -1)] = i;
  });

  const HYDRATE_PREFIX = PREFIX;

  function isMetalSym(sym) {
    const e = ME.chem.element(sym);
    if (!e) return false;
    const b = String(e.block || '').toLowerCase();
    return b === 'alkali metal' || b === 'alkaline earth metal' ||
      b === 'transition metal' || b === 'post-transition metal' ||
      b === 'lanthanide' || b === 'actinide';
  }

  function isVariableMetal(sym) {
    const t = ME.ref.typicalCharge(sym);
    return !!(t && t.variable && isMetalSym(sym));
  }

  /* ------------------------------------------------------ formula -> name */
  /* Work out how a formula splits into a positive part and a negative part.
   *
   * This is the step everything else depends on, and it cannot be done by
   * looking for the metal. Two counterexamples settle that: KMnO4 has a metal
   * inside its *anion*, and NH4Cl has no metal at all. So instead it works
   * from the anion outwards — try each known negative ion, see whether it
   * divides evenly into the formula, and check that what is left over is a
   * single cation whose charge cancels it.
   *
   * Polyatomic ions are tried before single atoms, biggest first, so NaHCO3
   * finds hydrogen carbonate rather than carbonate with a spare hydrogen.
   */
  function positiveIons() {
    return ME.ref.ions.filter((i) => i.c > 0);
  }

  function negativeCandidates() {
    const poly = ME.ref.ions.filter((i) => i.c < 0).map((ion) => {
      const p = ME.formula.parse(ion.f);
      return p.ok ? { ion: ion, counts: p.counts, charge: ion.c, name: ion.n.toLowerCase(), size: p.atoms } : null;
    }).filter(Boolean);
    poly.sort((a, b) => b.size - a.size);

    /* Then every nonmetal that forms a simple -ide. */
    const mono = [];
    ME.chem.elements.forEach((e) => {
      const t = ME.ref.typicalCharge(e.sym);
      if (!t || t.charge === null || t.charge >= 0) return;
      const counts = {}; counts[e.sym] = 1;
      mono.push({ sym: e.sym, counts: counts, charge: t.charge, name: ME.ref.ideName(e.sym), size: 1 });
    });
    return poly.concat(mono);
  }

  /* Does `part` go into `counts` a whole number of times, using it up? */
  function divideOut(counts, part) {
    const keys = Object.keys(part);
    let n = null;
    for (const k of keys) {
      if (!counts[k]) return null;
      const ratio = counts[k] / part[k];
      if (!Number.isInteger(ratio) || ratio < 1) return null;
      if (n === null) n = ratio; else if (n !== ratio) return null;
    }
    const rest = {};
    Object.keys(counts).forEach((k) => {
      const used = (part[k] || 0) * n;
      if (counts[k] - used > 0) rest[k] = counts[k] - used;
      else if (counts[k] - used < 0) rest.__bad = true;
    });
    if (rest.__bad) return null;
    return { n: n, rest: rest };
  }

  function splitIonic(counts) {
    const candidates = negativeCandidates();
    const cations = positiveIons();

    for (const cand of candidates) {
      const d = divideOut(counts, cand.counts);
      if (!d) continue;
      const restKeys = Object.keys(d.rest);
      if (!restKeys.length) continue;

      /* Option one: what is left is a polyatomic cation, whole times over. */
      for (const pc of cations) {
        const p = ME.formula.parse(pc.f);
        if (!p.ok) continue;
        const dc = divideOut(d.rest, p.counts);
        if (!dc || Object.keys(dc.rest).length) continue;
        if (pc.c * dc.n + cand.charge * d.n !== 0) continue;
        return {
          cation: { ion: pc, count: dc.n, charge: pc.c, name: pc.n.toLowerCase() },
          anion: Object.assign({}, cand, { count: d.n }),
        };
      }

      /* Option two: what is left is a single metal. */
      if (restKeys.length !== 1) continue;
      const sym = restKeys[0];
      if (!isMetalSym(sym) && sym !== 'H') continue;
      const cationCount = d.rest[sym];
      const t = ME.ref.typicalCharge(sym);
      const needed = -(cand.charge * d.n);
      if (needed <= 0) continue;
      if (t && t.charge !== null && !t.variable) {
        if (t.charge * cationCount !== needed) continue;
      } else {
        /* A variable metal: its charge is whatever makes the compound
         * neutral, which is exactly how a reader has to work it out too. */
        if (needed % cationCount !== 0) continue;
      }
      return {
        cation: { sym: sym, count: cationCount },
        anion: Object.assign({}, cand, { count: d.n }),
      };
    }
    return null;
  }

  /* An ionic name, with the reasoning attached so a lesson can show it. */
  function nameIonic(parsed) {
    const split = splitIonic(parsed.counts);
    if (!split) return null;
    const { cation, anion } = split;
    const steps = [];

    /* A polyatomic cation — ammonium, in practice — keeps its own name and
     * has nothing to work out. */
    if (cation.ion) {
      steps.push({ text: 'The positive part is ' + cation.name + ', ' + cation.ion.f +
        '\u207a, which is a polyatomic ion in its own right and keeps its name as it is.' });
      steps.push({ text: 'The negative part is ' + anion.name + '.' });
      return {
        name: cation.name + ' ' + anion.name, kind: 'ionic', steps: steps,
        cation: cation, anion: anion,
      };
    }

    const el = ME.chem.element(cation.sym);
    /* The metal keeps its own name, unchanged apart from the case: a compound
     * name is lower case unless it starts a sentence. */
    let cationName = el.name.toLowerCase();
    let charge = null;

    const t = ME.ref.typicalCharge(cation.sym);
    if (t && t.charge !== null && !t.variable) {
      charge = t.charge;
      steps.push({
        text: 'The metal is ' + el.name.toLowerCase() + ', and a metal keeps its own name unchanged. ' +
          el.name + ' is always ' + charge + '+, so there is no Roman numeral to work out.',
      });
    } else {
      /* A variable metal, so the charge has to be worked backwards out of the
       * formula: the compound is neutral, so the positives must cancel the
       * negatives exactly. This is the step people find hardest. */
      const totalNegative = anion.charge * anion.count;
      const perCation = -totalNegative / cation.count;
      if (!Number.isInteger(perCation) || perCation <= 0) return null;
      charge = perCation;
      cationName = el.name.toLowerCase() + '(' + (ROMAN[perCation] || perCation) + ')';
      steps.push({
        text: 'The metal is ' + el.name.toLowerCase() + ', which takes more than one charge, so the name has to say which. ' +
          'Work it backwards from the fact that the compound has no overall charge: ' +
          (anion.count === 1 ? 'one ' : anion.count + ' ') + anion.name +
          ' at ' + anion.charge + ' each is ' + totalNegative + ' in total, so the ' +
          (cation.count === 1 ? 'single ' : cation.count + ' ') + el.name.toLowerCase() +
          ' must supply ' + (-totalNegative) + ' between them — that is ' + perCation + '+ each, so it is ' +
          el.name.toLowerCase() + '(' + ROMAN[perCation] + ').',
      });
    }

    steps.push({
      text: anion.ion
        ? 'The negative part is ' + anion.name + ', ' + anion.ion.f + (anion.ion.c === -1 ? '⁻' : '') +
          ', which is a polyatomic ion and keeps its own name exactly as it is.'
        : 'The negative part is a single ' + ME.chem.element(anion.sym).name.toLowerCase() +
          ' atom. A lone nonmetal anion takes the element name with its ending swapped for -ide, so it becomes ' + anion.name + '.',
    });
    steps.push({ text: 'Positive part first, negative part second, and no prefixes — the charges already fix how many of each there are, so saying it again would be redundant.' });

    return {
      name: cationName + ' ' + anion.name,
      kind: 'ionic', steps: steps,
      cation: { sym: cation.sym, count: cation.count, charge: charge },
      anion: anion,
    };
  }

  /* Two nonmetals: the one with prefixes. */
  function nameCovalent(parsed) {
    const syms = ME.formula.hillOrder(parsed.counts);
    if (syms.length !== 2) return null;
    if (syms.some(isMetalSym)) return null;

    /* Convention puts the less electronegative element first. Electronegativity
     * comes from the verified element table, so this is not a memorised order. */
    const [a, b] = syms;
    const ea = ME.chem.element(a), eb = ME.chem.element(b);
    if (!ea || !eb) return null;
    let first = a, second = b;
    if (ea.en !== null && eb.en !== null && ea.en > eb.en) { first = b; second = a; }

    const nFirst = parsed.counts[first], nSecond = parsed.counts[second];
    if (nFirst > 10 || nSecond > 10) return null;

    const firstEl = ME.chem.element(first), secondEl = ME.chem.element(second);
    /* "mono" is left off the first element. Carbon monoxide, not
     * monocarbon monoxide. */
    const p1 = nFirst === 1 ? '' : PREFIX[nFirst];
    let p2 = PREFIX[nSecond];
    /* A prefix ending in a vowel loses it before a vowel: monooxide is written
     * monoxide, pentaoxide is pentoxide. */
    const stem = ME.ref.ideName(second);
    if (/[ao]$/.test(p2) && /^[aeiou]/.test(stem)) p2 = p2.slice(0, -1);

    const name = (p1 + firstEl.name.toLowerCase()) + ' ' + p2 + stem;
    return {
      name: name, kind: 'covalent',
      steps: [
        { text: 'Both elements are nonmetals, so this is a molecule rather than a lattice of ions. There are no charges doing the bookkeeping for us, which means the name has to say how many of each atom there are — that is what the Greek prefixes are for.' },
        { text: firstEl.name + ' goes first because it is the less electronegative of the two, which is the convention. ' + (nFirst === 1 ? 'There is one of it, and "mono" is always left off the first element — carbon monoxide, not monocarbon monoxide.' : 'There are ' + nFirst + ' of it, so it takes the prefix ' + PREFIX[nFirst] + '-.') },
        { text: 'The second element takes a prefix and an -ide ending: ' + nSecond + ' → ' + PREFIX[nSecond] + '-, and ' + secondEl.name.toLowerCase() + ' → ' + stem + '.' + (p2 !== PREFIX[nSecond] ? ' The final vowel of ' + PREFIX[nSecond] + ' drops before the vowel of ' + stem + ', which is why it is ' + p2 + stem + ' rather than ' + PREFIX[nSecond] + stem + '.' : '') },
      ],
    };
  }

  /* Acids. Which name an acid takes depends on its anion, which is the whole
   * point of the -ic / -ous pattern. */
  function nameAcid(parsed) {
    if (!parsed.counts.H) return null;
    const rest = {};
    Object.keys(parsed.counts).forEach((s) => { if (s !== 'H') rest[s] = parsed.counts[s]; });
    const restSyms = Object.keys(rest).filter((s) => rest[s] > 0);
    if (!restSyms.length) return null;
    if (restSyms.some(isMetalSym)) return null;

    /* No oxygen: hydro- ... -ic acid. */
    if (!rest.O) {
      if (restSyms.length !== 1) return null;
      const sym = restSyms[0];
      const t = ME.ref.typicalCharge(sym);
      if (!t || t.charge === null || t.charge >= 0) return null;
      let stem = ME.ref.IDE_STEM[sym] || String(ME.chem.element(sym).name).toLowerCase().replace(/(ine|ium|ogen|on|um|us|y)$/, '');
      /* Sulfur and phosphorus keep their full names in acid form: it is
       * hydrosulfuric acid, never hydrosulfic. */
      const ACID_STEM = { sulf: 'sulfur', phosph: 'phosphor' };
      stem = ACID_STEM[stem] || stem;
      return {
        name: 'hydro' + stem + 'ic acid', kind: 'acid',
        steps: [
          { text: 'Hydrogen with a single nonmetal and no oxygen. Dissolved in water it lets that hydrogen go, which is what makes it an acid.' },
          { text: 'No oxygen means the hydro- ... -ic pattern: the -ide name ' + ME.ref.ideName(sym) + ' becomes hydro' + stem + 'ic acid. That is why HCl is hydrochloric acid and not "chloric acid" — chloric acid is something else entirely, ClO₃⁻ with a hydrogen.' },
        ],
      };
    }

    /* With oxygen, find the matching oxyanion. -ate becomes -ic, -ite becomes
     * -ous. The pattern is worth stating because it is otherwise arbitrary. */
    for (let nH = parsed.counts.H; nH >= 1; nH--) {
      const anionCounts = Object.assign({}, parsed.counts);
      anionCounts.H -= nH;
      if (anionCounts.H <= 0) delete anionCounts.H;
      const text = ME.formula.formulaText(anionCounts);
      const ion = ME.ref.ionByFormula(text, -nH);
      if (!ion) continue;
      const base = ion.n.toLowerCase();
      let acidName = null, why = null;
      if (/ate$/.test(base)) {
        acidName = base.replace(/ate$/, 'ic') + ' acid';
        why = 'The anion is ' + base + ', and an -ate anion gives an -ic acid.';
      } else if (/ite$/.test(base)) {
        acidName = base.replace(/ite$/, 'ous') + ' acid';
        why = 'The anion is ' + base + ', and an -ite anion gives an -ous acid — one oxygen fewer than the -ic one.';
      } else continue;
      /* sulfate -> sulfuric, not sulfic; phosphate -> phosphoric. */
      acidName = acidName.replace(/^sulfic/, 'sulfuric').replace(/^sulfous/, 'sulfurous')
        .replace(/^phosphic/, 'phosphoric').replace(/^phosphous/, 'phosphorous')
        .replace(/^carbic/, 'carbonic').replace(/^nitric acid$/, 'nitric acid');
      return {
        name: acidName, kind: 'acid',
        steps: [
          { text: 'Hydrogen, oxygen and one other element: an oxyacid. Strip the hydrogens off and what is left is a polyatomic ion you already know.' },
          { text: why + ' So ' + parsed.display + ' is ' + acidName + '.' },
          { text: 'The pair to remember is -ate → -ic and -ite → -ous. Sulfate gives sulfuric acid; sulfite gives sulfurous acid, with one oxygen fewer.' },
        ],
      };
    }
    return null;
  }

  /* The one entry point: name whatever this formula is, if it can. */
  function nameOf(text) {
    const parsed = typeof text === 'string' ? ME.formula.parse(text) : text;
    if (!parsed || !parsed.ok) return { ok: false, error: (parsed && parsed.error) || 'Could not read that formula.' };

    /* A hydrate names its anhydrous part and then counts the waters. */
    if (parsed.parts && parsed.parts.length > 1) {
      const water = parsed.parts[parsed.parts.length - 1];
      const wp = ME.formula.parse(water.text);
      if (wp.ok && wp.text === 'H2O') {
        const head = parsed.parts.slice(0, -1).map((p) => (p.mult > 1 ? p.mult : '') + p.text).join('');
        const inner = nameOf(head);
        if (inner.ok) {
          const n = water.mult;
          return {
            ok: true, kind: 'hydrate',
            name: inner.name + ' ' + (HYDRATE_PREFIX[n] || n + '-') + 'hydrate',
            steps: inner.steps.concat([{
              text: 'The dot and the water at the end mean this is a hydrate: ' + n + ' water molecule' + (n === 1 ? '' : 's') +
                ' sitting inside the crystal, part of the structure rather than wet. Name the compound, then add the Greek prefix for how many waters and the word hydrate — so ' +
                (HYDRATE_PREFIX[n] || n) + 'hydrate.',
            }]),
          };
        }
      }
    }

    if (parsed.charge !== 0) {
      const ion = ME.ref.ionByFormula(parsed.text, parsed.charge);
      if (ion) {
        return { ok: true, kind: 'ion', name: ion.n.toLowerCase(),
          steps: [{ text: 'That is the ' + ion.n.toLowerCase() + ' ion. ' + (ion.note || '') }] };
      }
      const syms = Object.keys(parsed.counts).filter((s) => parsed.counts[s] > 0);
      if (syms.length === 1 && parsed.counts[syms[0]] === 1) {
        const e = ME.chem.element(syms[0]);
        const mag = Math.abs(parsed.charge);
        if (parsed.charge > 0) {
          return { ok: true, kind: 'ion',
            name: e.name.toLowerCase() + (isVariableMetal(syms[0]) ? '(' + ROMAN[mag] + ')' : '') + ' ion',
            steps: [{ text: 'A metal that has lost ' + mag + ' electron' + (mag === 1 ? '' : 's') + ' keeps its own name.' }] };
        }
        return { ok: true, kind: 'ion', name: ME.ref.ideName(syms[0]),
          steps: [{ text: 'A single nonmetal atom that has gained electrons takes the -ide ending.' }] };
      }
      return { ok: false, error: 'That is an ion I do not have a name rule for.' };
    }

    const acid = nameAcid(parsed);
    if (acid) return Object.assign({ ok: true }, acid);
    const ionic = nameIonic(parsed);
    if (ionic) return Object.assign({ ok: true }, ionic);
    const covalent = nameCovalent(parsed);
    if (covalent) return Object.assign({ ok: true }, covalent);

    /* An element on its own. */
    const syms = Object.keys(parsed.counts).filter((s) => parsed.counts[s] > 0);
    if (syms.length === 1) {
      const e = ME.chem.element(syms[0]);
      const n = parsed.counts[syms[0]];
      return { ok: true, kind: 'element', name: e.name.toLowerCase(),
        steps: [{ text: n > 1
          ? 'An element on its own. ' + e.name + ' goes around as ' + parsed.display + ' rather than single atoms, but it is still just ' + e.name.toLowerCase() + '.'
          : 'A single element, so its name is just its name.' }] };
    }

    return { ok: false, error: 'I can name ionic compounds, simple covalent compounds, acids and hydrates. This one does not fit those rules — organic compounds especially, which have a naming system all of their own.' };
  }

  /* ------------------------------------------------------ name -> formula */
  /* The other direction. Tokenise the name, find a cation and an anion, then
   * criss-cross the charges to balance them. */
  function formulaOf(name) {
    const raw = String(name == null ? '' : name).trim().toLowerCase();
    if (!raw) return { ok: false, error: 'Type a name.' };

    /* Hydrate suffix first. */
    const hyd = raw.match(/^(.*?)\s*(mono|di|tri|tetra|penta|hexa|hepta|octa|nona|deca)hydrate$/);
    if (hyd) {
      const inner = formulaOf(hyd[1]);
      if (!inner.ok) return inner;
      const n = FROM_PREFIX[hyd[2]];
      return { ok: true, formula: inner.formula + '·' + (n > 1 ? n : '') + 'H2O',
        steps: inner.steps.concat(['Then ' + hyd[2] + 'hydrate adds ' + n + ' water' + (n === 1 ? '' : 's') + ' after a dot.']) };
    }

    /* Acids. */
    if (/\bacid$/.test(raw)) return acidFormula(raw);

    const words = raw.replace(/\s+/g, ' ').split(' ');
    if (words.length < 2) {
      /* Might be a single element or a lone ion name. */
      const e = elementByName(words[0]);
      if (e) return { ok: true, formula: e.sym, steps: ['That is an element: ' + e.name + ' is ' + e.sym + '.'] };
      const ion = ME.ref.ionByName(words[0]);
      if (ion) return { ok: true, formula: ion.f, steps: ['That is the ' + ion.n.toLowerCase() + ' ion, ' + ion.f + '.'] };
      return { ok: false, error: 'A compound name has at least two parts — the positive part and the negative part.' };
    }

    /* Covalent: the giveaway is a Greek prefix on either word. */
    const cov = covalentFormula(words);
    if (cov) return cov;

    return ionicFormula(words, raw);
  }

  function elementByName(word) {
    if (!word) return null;
    const w = word.replace(/\(.*\)$/, '').trim();
    const list = ME.chem.elements;
    for (const e of list) {
      if (e.name.toLowerCase() === w) return e;
    }
    /* A couple of spellings that differ by country. */
    const ALT = { aluminum: 'Al', cesium: 'Cs', sulphur: 'S', caesium: 'Cs', aluminium: 'Al' };
    if (ALT[w]) return ME.chem.element(ALT[w]);
    return null;
  }

  function covalentFormula(words) {
    if (words.length !== 2) return null;

    /* Every way this word could split into a prefix and a stem.
     *
     * It has to be every way, not the longest match, because the prefix and
     * the stem share a letter when a vowel is elided: "monoxide" is mono +
     * oxide with one o doing both jobs. Reading it as "mono" + "xide" leaves a
     * stem that is not a word, and carbon monoxide then fails to parse at all.
     * So generate the candidates and let the element table decide. */
    function splits(w) {
      const out = [];
      const keys = Object.keys(FROM_PREFIX).sort((x, y) => y.length - x.length);
      keys.forEach((k) => {
        if (w.length <= k.length || w.slice(0, k.length) !== k) return;
        out.push({ n: FROM_PREFIX[k], rest: w.slice(k.length), prefix: k });
        /* The elided-vowel reading: put the shared vowel back on the stem. */
        if (/[ao]$/.test(k)) out.push({ n: FROM_PREFIX[k], rest: k.slice(-1) + w.slice(k.length), prefix: k.slice(0, -1) });
      });
      out.push({ n: 1, rest: w, prefix: '' });
      return out;
    }

    const firstOptions = splits(words[0]);
    const secondOptions = splits(words[1]);
    for (const a of firstOptions) {
      const first = elementByName(a.rest);
      if (!first) continue;
      for (const b of secondOptions) {
        const second = anionElement(b.rest);
        if (!second) continue;
        /* Without a prefix anywhere this is not a covalent name at all, and
         * should be read as an ionic one instead. */
        if (a.n === 1 && b.n === 1 && !a.prefix && !b.prefix) continue;
        const f = first.sym + (a.n > 1 ? a.n : '') + second.sym + (b.n > 1 ? b.n : '');
        return { ok: true, formula: f, steps: [
          'The Greek prefixes mean this is a covalent compound, and they say the atom counts outright rather than leaving you to work them out from charges.',
          a.rest + ' is ' + first.sym + ', and ' + (a.n === 1 ? 'there is one of it' : PREFIX[a.n] + '- means ' + a.n) + '.',
          b.rest + ' is ' + second.sym + ', and ' + (b.n === 1 ? 'there is one of it' : PREFIX[b.n] + '- means ' + b.n) + '.',
          'So the formula is ' + f + '.',
        ] };
      }
    }
    return null;
  }

  /* An -ide word back to its element. */
  function anionElement(word) {
    const w = word.replace(/ide$/, '');
    for (const sym in ME.ref.IDE_STEM) {
      if (ME.ref.IDE_STEM[sym] === w) return ME.chem.element(sym);
    }
    const list = ME.chem.elements;
    for (const e of list) {
      if (ME.ref.ideName(e.sym) === word) return e;
    }
    return null;
  }

  function ionicFormula(words, raw) {
    /* The cation is the first word, possibly with a Roman numeral. */
    const roman = raw.match(/\(([ivx]+)\)/);
    const cationWord = words[0].replace(/\(.*$/, '');
    const cation = elementByName(cationWord);
    if (!cation) {
      const ion = ME.ref.ionByName(cationWord);
      if (ion && ion.c > 0) {
        return withCharges({ f: ion.f, c: ion.c, label: ion.n.toLowerCase() }, words.slice(1).join(' '), raw);
      }
      return { ok: false, error: 'I do not recognise "' + cationWord + '" as a metal or a positive ion.' };
    }
    let charge;
    if (roman) {
      charge = FROM_ROMAN[roman[1].toLowerCase()];
      if (!charge) return { ok: false, error: 'I cannot read the Roman numeral "' + roman[1] + '".' };
    } else {
      const t = ME.ref.typicalCharge(cation.sym);
      if (!t || t.charge === null) {
        return { ok: false, error: cation.name + ' takes more than one charge, so the name needs a Roman numeral — ' +
          cation.name.toLowerCase() + '(II) chloride, for instance — to say which one you mean.' };
      }
      charge = t.charge;
    }
    return withCharges({ f: cation.sym, c: charge, label: cation.name.toLowerCase() }, words.slice(1).join(' '), raw);
  }

  function withCharges(cation, anionPhrase, raw) {
    const phrase = anionPhrase.replace(/\(.*?\)/g, '').trim();
    let anion = null;
    const ion = ME.ref.ionByName(phrase);
    if (ion && ion.c < 0) anion = { f: ion.f, c: ion.c, label: ion.n.toLowerCase(), poly: true };
    if (!anion) {
      const e = anionElement(phrase);
      if (e) {
        const t = ME.ref.typicalCharge(e.sym);
        if (t && t.charge !== null && t.charge < 0) anion = { f: e.sym, c: t.charge, label: ME.ref.ideName(e.sym) };
      }
    }
    if (!anion) return { ok: false, error: 'I do not recognise "' + phrase + '" as a negative ion.' };

    /* Criss-cross: the number of each ion is the other one's charge, then
     * divide out any common factor. The reason it works is that it is just the
     * lowest common multiple, arrived at sideways. */
    const a = Math.abs(cation.c), b = Math.abs(anion.c);
    const g = gcd(a, b);
    const nCation = b / g, nAnion = a / g;
    const wrap = (f, n) => {
      if (n === 1) return f;
      /* A polyatomic ion needs brackets before its count, or the count looks
       * like it belongs to the last element: Mg(NO3)2, never MgNO32. */
      return (/^[A-Z][a-z]?$/.test(f) ? f : '(' + f + ')') + n;
    };
    const formula = wrap(cation.f, nCation) + wrap(anion.f, nAnion);
    return {
      ok: true, formula: formula,
      steps: [
        'The positive part is ' + cation.label + ', charge ' + cation.c + '+.',
        'The negative part is ' + anion.label + ', charge ' + anion.c + '.',
        'A compound has no overall charge, so the positives and negatives have to cancel exactly. ' +
          (a === b
            ? 'Both charges are ' + a + ', so one of each does it.'
            : 'The smallest number that ' + a + ' and ' + b + ' both divide into is ' + (a * b / g) + ', which needs ' +
              nCation + ' ' + cation.label + ' and ' + nAnion + ' ' + anion.label + '. Swapping the two charges over and writing each as the other’s subscript gets you there in one move — that is the criss-cross trick, and this is why it works.'),
        'So the formula is ' + formula + '.',
      ],
    };
  }

  function acidFormula(raw) {
    let m = raw.match(/^hydro(.+?)ic acid$/);
    if (m) {
      /* The acid form of a couple of stems is longer than the -ide form:
       * sulfide gives hydrosulfuric acid, not hydrosulfic. Undo that here, or
       * the name cannot be read back into a formula. */
      const UNDO_ACID = { sulfur: 'sulf', phosphor: 'phosph' };
      const stem = UNDO_ACID[m[1]] || m[1];
      for (const sym in ME.ref.IDE_STEM) {
        if (ME.ref.IDE_STEM[sym] === stem) {
          const t = ME.ref.typicalCharge(sym);
          const n = t && t.charge ? Math.abs(t.charge) : 1;
          const f = 'H' + (n > 1 ? n : '') + sym;
          return { ok: true, formula: f, steps: [
            'hydro- and -ic with no oxygen means hydrogen plus one nonmetal.',
            stem + ' is ' + sym + ', which carries a charge of ' + t.charge + ', so it needs ' + n + ' hydrogen' + (n === 1 ? '' : 's') + '.',
            'So the formula is ' + f + '.'] };
        }
      }
      return { ok: false, error: 'I do not recognise the element in "' + raw + '".' };
    }
    m = raw.match(/^(.+?)(ic|ous) acid$/);
    if (m) {
      let stem = m[1];
      const suffix = m[2] === 'ic' ? 'ate' : 'ite';
      /* Undo the spelling tweaks that go the other way. */
      const UNDO = { sulfur: 'sulf', phosphor: 'phosph', carbon: 'carbon', nitr: 'nitr' };
      const tries = [stem, UNDO[stem] || stem, stem.replace(/ur$/, ''), stem.replace(/or$/, '')];
      for (const t of tries) {
        const ion = ME.ref.ionByName(t + suffix);
        if (ion) {
          const n = Math.abs(ion.c);
          /* The anion appears exactly once in an acid, so it never needs
           * brackets; the count that follows H is the hydrogen count. */
          const f = 'H' + (n > 1 ? n : '') + ion.f;
          return { ok: true, formula: f, steps: [
            'An -' + m[2] + ' acid comes from the -' + suffix + ' anion: ' + t + suffix + ', which is ' + ion.f + ' with a charge of ' + ion.c + '.',
            'It needs ' + n + ' hydrogen' + (n === 1 ? '' : 's') + ' to cancel that charge.',
            'So the formula is ' + f + '.'] };
        }
      }
      return { ok: false, error: 'I do not recognise the anion behind "' + raw + '".' };
    }
    return { ok: false, error: 'I can read acid names of the form hydro...ic acid, ...ic acid and ...ous acid.' };
  }

  function gcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a || 1; }

  ME.naming = { nameOf, formulaOf, splitIonic, isMetalSym, isVariableMetal, ROMAN, PREFIX };
})();
