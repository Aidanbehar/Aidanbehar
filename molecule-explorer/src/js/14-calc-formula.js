/* Reading a chemical formula, and weighing it.
 *
 * Every tool in the app that takes a formula typed by a person comes through
 * here: the molar mass calculator, the balancer, the naming practice, the gas
 * simulator's grams-to-moles conversion. So it has to cope with what people
 * actually type — Ca(OH)2, CuSO4.5H2O, SO4^2-, h2o — and when it cannot, it
 * has to say what is wrong and offer the fix rather than just refusing.
 *
 * Atomic masses come from the element table PubChem supplies at build time and
 * the build cross-checks against OpenChemLib. Nothing here is typed from
 * memory.
 */
(function () {
  'use strict';

  const ME = window.ME;

  /* Unicode subscripts and superscripts, so a formula pasted from a web page
   * or typed on a phone keyboard still reads. */
  const SUBS = '₀₁₂₃₄₅₆₇₈₉';
  const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

  function normalise(text) {
    let s = String(text == null ? '' : text);
    for (let d = 0; d < 10; d++) {
      s = s.split(SUBS[d]).join(String(d));
      s = s.split(SUPS[d]).join('^' + d);
    }
    return s
      .replace(/−|–|—/g, '-')     /* minus signs and dashes */
      .replace(/⁻/g, '^-').replace(/⁺/g, '^+')
      .replace(/[·•∙×]/g, '·')  /* hydrate dots */
      .replace(/\s*·\s*/g, '·')
      .replace(/\{|〔/g, '(').replace(/\}|〕/g, ')')
      .replace(/\s+/g, '')
      .trim();
  }

  /* Is this a real element symbol, spelled with the right capitals? */
  function isSymbol(s) {
    const e = ME.chem.element(s);
    return !!(e && e.sym === s);
  }

  /* -------------------------------------------------------------- parsing */
  /* A formula is a sequence of groups. A group is an element symbol or a
   * bracketed sub-formula, each with an optional count after it. */
  function parseSegment(src, counts, multiplier, report) {
    let i = 0;
    const n = src.length;
    let sawSomething = false;

    function readCount() {
      let j = i, num = '';
      while (j < n && src[j] >= '0' && src[j] <= '9') { num += src[j]; j++; }
      if (!num) return 1;
      i = j;
      const v = parseInt(num, 10);
      return v === 0 ? 0 : v;
    }

    while (i < n) {
      const c = src[i];

      if (c === '(' || c === '[') {
        const close = c === '(' ? ')' : ']';
        let depth = 0, j = i;
        for (; j < n; j++) {
          if (src[j] === '(' || src[j] === '[') depth++;
          else if (src[j] === ')' || src[j] === ']') { depth--; if (depth === 0) break; }
        }
        if (j >= n) { report('There is an opening bracket with nothing closing it.'); return false; }
        const inner = src.slice(i + 1, j);
        if (!inner) { report('There is an empty pair of brackets.'); return false; }
        i = j + 1;
        const mult = readCount();
        if (!parseSegment(inner, counts, multiplier * mult, report)) return false;
        sawSomething = true;
        continue;
      }
      if (c === ')' || c === ']') { report('There is a closing bracket with nothing opening it.'); return false; }

      if (c >= 'A' && c <= 'Z') {
        /* Two letters first: Co is cobalt, and C followed by o is nothing. */
        const two = src.slice(i, i + 2);
        let sym = null;
        if (two.length === 2 && two[1] >= 'a' && two[1] <= 'z' && isSymbol(two)) sym = two;
        else if (isSymbol(c)) sym = c;
        if (!sym) {
          if (two.length === 2 && two[1] >= 'a' && two[1] <= 'z') {
            report('"' + two + '" is not an element, and neither is "' + c + '" on its own.');
          } else {
            report('"' + c + '" is not an element symbol.');
          }
          return false;
        }
        i += sym.length;
        const count = readCount();
        counts[sym] = (counts[sym] || 0) + count * multiplier;
        sawSomething = true;
        continue;
      }

      if (c >= 'a' && c <= 'z') {
        report('"' + c + '" is lower case where an element symbol has to start with a capital.');
        return false;
      }
      if (c >= '0' && c <= '9') {
        report('There is a number where an element symbol should be. A count goes after what it counts, as in H2O.');
        return false;
      }
      report('I do not know what to do with the character "' + c + '".');
      return false;
    }
    if (!sawSomething) { report('There is nothing here to read.'); return false; }
    return true;
  }

  /* Trailing charge, in any of the ways it gets written. */
  function splitCharge(s) {
    let m;
    /* Explicit: SO4^2-, Fe^3+, Cl^- */
    m = s.match(/^(.*?)\^(\d*)([+-])$/);
    if (m) return { body: m[1], charge: (m[2] ? parseInt(m[2], 10) : 1) * (m[3] === '-' ? -1 : 1) };
    /* Bracketed: SO4(2-) */
    m = s.match(/^(.*?)\((\d*)([+-])\)$/);
    if (m) return { body: m[1], charge: (m[2] ? parseInt(m[2], 10) : 1) * (m[3] === '-' ? -1 : 1) };
    /* Repeated signs: Ca++ */
    m = s.match(/^(.*?)([+]{1,6}|[-]{1,6})$/);
    if (m && !/\d$/.test(m[1])) {
      return { body: m[1], charge: m[2].length * (m[2][0] === '-' ? -1 : 1) };
    }
    /* Digits then a bare sign, which is how almost everyone actually types an
     * ion: Fe3+, NH4+, SO42-, Cr2O72-. Genuinely ambiguous, because a digit
     * there could be a subscript or a charge, so it is resolved the way the
     * notation resolves it in practice:
     *
     *   two or more digits  the last one is the charge, the rest a subscript
     *                       (SO42- is sulfate, Cr2O72- is dichromate)
     *   exactly one digit   the charge if what is left is a lone element, so
     *                       Fe3+ is iron(III); otherwise a subscript with a
     *                       charge of one, so NH4+ is ammonium and NO3- is
     *                       nitrate
     *
     * Getting this wrong is not a small matter: an earlier version read NH4+
     * as nitrogen, one hydrogen and a charge of +4. */
    m = s.match(/^(.*?)(\d+)([+-])$/);
    if (m) {
      const sign = m[3] === '-' ? -1 : 1;
      const digits = m[2];
      if (digits.length >= 2) {
        return { body: m[1] + digits.slice(0, -1), charge: parseInt(digits.slice(-1), 10) * sign };
      }
      if (isSymbol(m[1])) return { body: m[1], charge: parseInt(digits, 10) * sign };
      /* A digit straight after a closing bracket at the very end is a charge,
       * not a multiplier: [Fe(CN)6]3- is hexacyanoferrate, and reading the 3
       * as "three of everything in the brackets" triples the whole complex. */
      if (/[)\]]$/.test(m[1])) return { body: m[1], charge: parseInt(digits, 10) * sign };
      return { body: m[1] + digits, charge: sign };
    }
    /* A bare sign on its own means a single charge: Cl-, OH-, H3O+. */
    return { body: s, charge: 0 };
  }

  /* Hill order: carbon, then hydrogen, then everything else alphabetically.
   * It is what PubChem prints, so formulas built here and formulas that came
   * from the database are directly comparable. */
  function hillOrder(counts) {
    const syms = Object.keys(counts).filter((s) => counts[s] > 0);
    const hasC = syms.indexOf('C') >= 0;
    if (!hasC) return syms.sort();
    const rest = syms.filter((s) => s !== 'C' && s !== 'H').sort();
    return ['C'].concat(syms.indexOf('H') >= 0 ? ['H'] : []).concat(rest);
  }

  function formulaText(counts, charge) {
    let out = hillOrder(counts).map((s) => s + (counts[s] === 1 ? '' : counts[s])).join('');
    if (charge) {
      const mag = Math.abs(charge);
      /* With a caret, so the charge cannot be misread as part of the last
       * subscript, and so the text round-trips back through parse(). */
      out += '^' + (mag === 1 ? '' : String(mag)) + (charge < 0 ? '-' : '+');
    }
    return out;
  }

  function massOfCounts(counts) {
    let total = 0;
    for (const sym in counts) {
      if (!counts[sym]) continue;
      const e = ME.chem.element(sym);
      if (!e || !e.mass) return null;
      total += e.mass * counts[sym];
    }
    return total;
  }

  /* ------------------------------------------------------------ suggestions */
  /* When a strict parse fails, work out what the person probably meant. The
   * usual cause is capitals: "naCl", "H2o", "NACL". Segment the letters
   * ignoring case, in every way that gives real elements, and offer those. */
  function suggest(text) {
    const s = normalise(text).replace(/[()\[\]·^+-]/g, '');
    if (!s || s.length > 24) return [];
    const runs = s.split(/(\d+)/);
    const options = [];

    function segment(letters) {
      const results = [];
      (function walk(pos, acc) {
        if (results.length > 6) return;
        if (pos === letters.length) { results.push(acc.slice()); return; }
        for (const len of [2, 1]) {
          if (pos + len > letters.length) continue;
          const piece = letters.slice(pos, pos + len);
          const canon = piece[0].toUpperCase() + piece.slice(1).toLowerCase();
          if (isSymbol(canon)) { acc.push(canon); walk(pos + len, acc); acc.pop(); }
        }
      })(0, []);
      return results;
    }

    /* Only the common case is worth solving: a single alphabetic run, or runs
     * separated by counts. Anything more tangled, the message alone must do. */
    const perRun = runs.map((r) => (/^\d+$/.test(r) ? [[r]] : (r ? segment(r) : [[]])));
    if (perRun.some((x) => x.length === 0)) return [];
    const combos = [[]];
    for (const choices of perRun) {
      const next = [];
      for (const base of combos) {
        for (const ch of choices) {
          if (next.length > 8) break;
          next.push(base.concat(ch));
        }
      }
      combos.length = 0;
      combos.push.apply(combos, next);
    }
    combos.forEach((parts) => {
      const candidate = parts.join('');
      if (candidate === s) return;                 /* not a fix, that is the input */
      /* `noSuggest` matters: parse() asks suggest() for fixes when it fails,
       * and suggest() checks its candidates with parse(). Without the flag the
       * two call each other until the stack runs out, which an input as
       * ordinary as "2" was enough to trigger. */
      if (options.indexOf(candidate) < 0 && parse(candidate, { noSuggest: true }).ok) options.push(candidate);
    });
    return options.slice(0, 4);
  }

  /* ---------------------------------------------------------------- parse */
  /* The one entry point. Always returns an object; never throws. */
  function parse(text, opts) {
    const noSuggest = !!(opts && opts.noSuggest);
    const raw = String(text == null ? '' : text);
    const s = normalise(raw);
    if (!s) return { ok: false, error: 'Nothing typed yet.', input: raw };

    /* An electron, for redox half-equations. */
    if (/^e-?$|^e\^-$/i.test(s)) {
      return { ok: true, counts: {}, charge: -1, mass: 0, electron: true, text: 'e-', display: 'e-', html: 'e<sup>−</sup>', input: raw, parts: [] };
    }

    const { body, charge } = splitCharge(s);
    if (!body) return { ok: false, error: 'There is a charge here but nothing carrying it.', input: raw };

    /* Hydrates: CuSO4.5H2O. Written with a centre dot, and a leading number on
     * the water that multiplies only that piece. */
    const chunks = body.replace(/\.(?=\d*[A-Za-z])/g, '·').split('·').filter((x) => x !== '');
    if (!chunks.length) return { ok: false, error: 'There is nothing here to read.', input: raw };

    const counts = {};
    const parts = [];
    let failure = null;
    const report = (msg) => { if (!failure) failure = msg; };

    for (const chunk of chunks) {
      const lead = chunk.match(/^(\d+)(.*)$/);
      const mult = lead ? parseInt(lead[1], 10) : 1;
      const rest = lead ? lead[2] : chunk;
      if (!rest) { report('There is a number with no formula after it.'); break; }
      const own = {};
      if (!parseSegment(rest, own, 1, report)) break;
      for (const k in own) counts[k] = (counts[k] || 0) + own[k] * mult;
      parts.push({ text: rest, mult: mult, counts: own });
    }

    if (failure) {
      return { ok: false, error: failure, fixes: noSuggest ? [] : suggest(raw), input: raw };
    }

    const mass = massOfCounts(counts);
    if (mass === null) return { ok: false, error: 'One of those elements has no atomic mass in the table.', input: raw };

    return {
      ok: true, counts: counts, charge: charge, mass: mass, parts: parts,
      /* `text` is Hill order, for comparing two formulas to each other.
       * `display` is the reader's own spelling, for showing back to them.
       * NaOH is HNaO in one and NaOH in the other, and both are needed. */
      text: formulaText(counts, charge), display: displayText(parts, charge), input: raw,
      html: prettyHTML(parts, charge),
      atoms: Object.keys(counts).reduce((n, k) => n + counts[k], 0),
    };
  }

  /* The formula as typed, tidied up: a canonical hydrate dot, and the charge
   * written with a caret so it cannot be misread as a subscript. */
  function displayText(parts, charge) {
    let out = parts.map((p) => (p.mult > 1 ? p.mult : '') + p.text).join('·');
    if (charge) {
      const mag = Math.abs(charge);
      out += '^' + (mag === 1 ? '' : String(mag)) + (charge < 0 ? '-' : '+');
    }
    return out;
  }

  /* Write it back out the way it was typed, with proper subscripts, so the
   * live preview confirms what the app understood. */
  function prettyHTML(parts, charge) {
    const piece = (p) => (p.mult > 1 ? p.mult : '') +
      ME.esc(p.text).replace(/(\d+)/g, '<sub>$1</sub>');
    let out = parts.map(piece).join('<span class="hydrate-dot">·</span>');
    if (charge) {
      const mag = Math.abs(charge);
      out += '<sup>' + (mag === 1 ? '' : mag) + (charge < 0 ? '−' : '+') + '</sup>';
    }
    return out;
  }

  /* Molar mass with its working shown, for the calculator and the lessons. */
  function molarMass(text) {
    const p = parse(text);
    if (!p.ok) return p;
    const rows = hillOrder(p.counts).map((sym) => {
      const e = ME.chem.element(sym);
      return { sym: sym, name: e.name, count: p.counts[sym], mass: e.mass, total: e.mass * p.counts[sym] };
    });
    return { ok: true, formula: p, rows: rows, mass: p.mass };
  }

  /* Percent by mass of each element, which Unit 9 needs. */
  function percentComposition(text) {
    const m = molarMass(text);
    if (!m.ok) return m;
    return {
      ok: true, mass: m.mass,
      rows: m.rows.map((r) => Object.assign({}, r, { percent: (r.total / m.mass) * 100 })),
    };
  }

  ME.formula = {
    normalise, parse, molarMass, percentComposition, suggest, displayText,
    massOfCounts, formulaText, hillOrder, isSymbol, prettyHTML,
  };
})();
