/* Numbers, units and answer checking.
 *
 * This is the bottom of the calculation engine. Everything that shows a number
 * to the reader — a worked example, a tool, the gas simulator, a graded answer
 * — goes through here, so a number can never be formatted one way in a lesson
 * and judged another way by the grader.
 *
 * Nothing in this file knows about chemistry. It knows about digits.
 */
(function () {
  'use strict';

  const ME = window.ME;

  /* ------------------------------------------------------------- constants */
  /* Since 2019 the SI fixes both of these exactly, by definition, so R is not
   * a measured quantity to be looked up — it is a product of two defined ones.
   * Deriving it here means there is no third-hand number to get wrong. */
  const AVOGADRO = 6.02214076e23;          /* mol^-1, exact by definition */
  const BOLTZMANN = 1.380649e-23;          /* J/K,    exact by definition */
  const R_SI = AVOGADRO * BOLTZMANN;       /* J/(mol K) = 8.31446261815324 */
  const ATM_IN_PA = 101325;                /* exact by definition */
  const ZERO_C = 273.15;                   /* exact by definition */

  const CONST = {
    NA: AVOGADRO,
    kB: BOLTZMANN,
    R: R_SI,
    atmInPa: ATM_IN_PA,
    zeroC: ZERO_C,
    /* Water's ion product at 25 °C. This one IS measured, not defined. */
    Kw: 1.0e-14,
    molarVolumeSTP: (R_SI * ZERO_C) / ATM_IN_PA * 1000,   /* L/mol at 0 °C, 1 atm */
  };

  /* --------------------------------------------------------------- units */
  /* Every unit converts to its dimension's base unit as  base = v * f + o.
   * Only temperature needs the offset, but carrying it everywhere costs
   * nothing and keeps one code path. */
  const U = (f, o) => ({ f: f, o: o || 0 });

  const UNITS = {
    pressure: {
      base: 'Pa',
      units: {
        atm: U(ATM_IN_PA),
        kPa: U(1000),
        Pa: U(1),
        bar: U(100000),
        /* A torr is defined as exactly 1/760 atm. A millimetre of mercury is
         * defined from the density of mercury and standard gravity. They agree
         * to about two parts in ten million, which no lesson will ever notice,
         * but they are not the same definition so they are not the same entry. */
        torr: U(ATM_IN_PA / 760),
        mmHg: U(133.322387415),
        psi: U(4.4482216152605 / (0.0254 * 0.0254)),   /* lbf per square inch */
      },
    },
    volume: {
      base: 'm3',
      units: {
        L: U(1e-3),
        mL: U(1e-6),
        m3: U(1),
        cm3: U(1e-6),
        dm3: U(1e-3),
        /* The US liquid gallon is defined as exactly 231 cubic inches. */
        gal: U(231 * Math.pow(0.0254, 3)),
        ft3: U(Math.pow(0.3048, 3)),
      },
    },
    temperature: {
      base: 'K',
      units: {
        K: U(1, 0),
        C: U(1, ZERO_C),
        /* K = F*5/9 + (273.15 - 32*5/9) */
        F: U(5 / 9, ZERO_C - 32 * 5 / 9),
      },
    },
    amount: {
      base: 'mol',
      units: {
        mol: U(1),
        mmol: U(1e-3),
        umol: U(1e-6),
        particles: U(1 / AVOGADRO),
      },
    },
    mass: {
      base: 'g',
      units: { g: U(1), kg: U(1000), mg: U(1e-3), ug: U(1e-6), lb: U(453.59237), oz: U(28.349523125) },
    },
    energy: {
      base: 'J',
      units: { J: U(1), kJ: U(1000), cal: U(4.184), kcal: U(4184), eV: U(1.602176634e-19) },
    },
    length: {
      base: 'm',
      units: { m: U(1), cm: U(0.01), mm: U(1e-3), km: U(1000), um: U(1e-6), nm: U(1e-9), pm: U(1e-12), A: U(1e-10), in: U(0.0254), ft: U(0.3048) },
    },
  };

  /* How each unit should be written when it is shown back to the reader. */
  const LABEL = {
    m3: 'm³', cm3: 'cm³', dm3: 'dm³', ft3: 'ft³',
    C: '°C', F: '°F', A: 'Å',
    umol: 'µmol', ug: 'µg', um: 'µm',
    particles: 'particles', gal: 'gal',
  };
  const unitLabel = (u) => LABEL[u] || u;

  /* Spellings a reader might reasonably type for each unit. */
  const ALIAS = {
    atm: 'atm', atmosphere: 'atm', atmospheres: 'atm',
    kpa: 'kPa', pa: 'Pa', pascal: 'Pa', pascals: 'Pa', bar: 'bar', bars: 'bar',
    mmhg: 'mmHg', torr: 'torr', psi: 'psi',
    l: 'L', liter: 'L', litre: 'L', liters: 'L', litres: 'L',
    ml: 'mL', milliliter: 'mL', millilitre: 'mL',
    m3: 'm3', 'm^3': 'm3', 'm³': 'm3', cm3: 'cm3', 'cm^3': 'cm3', 'cm³': 'cm3', cc: 'cm3',
    dm3: 'dm3', 'dm^3': 'dm3', 'dm³': 'dm3', ft3: 'ft3', 'ft^3': 'ft3', 'ft³': 'ft3',
    gal: 'gal', gallon: 'gal', gallons: 'gal',
    k: 'K', kelvin: 'K', kelvins: 'K',
    c: 'C', '°c': 'C', degc: 'C', celsius: 'C', centigrade: 'C',
    f: 'F', '°f': 'F', degf: 'F', fahrenheit: 'F',
    mol: 'mol', mole: 'mol', moles: 'mol', mmol: 'mmol', umol: 'umol',
    particles: 'particles', particle: 'particles', atoms: 'particles', molecules: 'particles',
    g: 'g', gram: 'g', grams: 'g', kg: 'kg', kilogram: 'kg', mg: 'mg', ug: 'ug',
    lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb', oz: 'oz', ounce: 'oz',
    j: 'J', joule: 'J', joules: 'J', kj: 'kJ', cal: 'cal', calorie: 'cal', kcal: 'kcal', ev: 'eV',
    m: 'm', cm: 'cm', mm: 'mm', km: 'km', nm: 'nm', pm: 'pm',
    'a': 'A', angstrom: 'A', in: 'in', inch: 'in', inches: 'in', ft: 'ft', foot: 'ft', feet: 'ft',
  };

  /* Which dimension a unit belongs to, worked out once from UNITS itself so
   * the two can never drift apart. */
  const DIM_OF = {};
  Object.keys(UNITS).forEach((dim) => {
    Object.keys(UNITS[dim].units).forEach((u) => { if (!(u in DIM_OF)) DIM_OF[u] = dim; });
  });

  function canonicalUnit(text, dim) {
    if (text == null) return null;
    const raw = String(text).trim();
    if (!raw) return null;
    /* An exact match on a real unit name wins before any lowercasing, because
     * "C" and "c" would otherwise collide, as would "K" and "k". */
    if (dim && UNITS[dim] && UNITS[dim].units[raw]) return raw;
    if (!dim && DIM_OF[raw]) return raw;
    const key = raw.toLowerCase().replace(/\s+/g, '');
    const hit = ALIAS[key];
    if (!hit) return null;
    if (dim && !UNITS[dim].units[hit]) return null;
    return hit;
  }

  function dimensionOf(unit) { return DIM_OF[unit] || null; }

  /* Convert a value between two units of the same dimension. */
  function convert(value, from, to) {
    const f = canonicalUnit(from), t = canonicalUnit(to);
    if (f === null || t === null) throw new Error('unknown unit: ' + (f === null ? from : to));
    const dim = DIM_OF[f];
    if (DIM_OF[t] !== dim) throw new Error('cannot convert ' + f + ' to ' + t + ': different quantities');
    if (f === t) return value;
    const a = UNITS[dim].units[f], b = UNITS[dim].units[t];
    const base = value * a.f + a.o;          /* into the base unit */
    return (base - b.o) / b.f;               /* and back out again */
  }

  function unitsFor(dim) { return Object.keys(UNITS[dim].units); }

  /* ------------------------------------------------------ significant figures */
  /* How many significant figures a written number claims. This reads the text,
   * not the value, because "100" and "100.0" are the same number and different
   * claims about how carefully it was measured. */
  function sigFigs(text) {
    const s = String(text).trim().replace(/[,\s_]/g, '');
    const m = s.match(/^[+-]?(\d*\.?\d*)(?:[eE][+-]?\d+|\s*[x×]\s*10\^?[+-]?\d+)?$/);
    if (!m || m[1] === '' || m[1] === '.') return null;
    const mant = m[1];
    const hasPoint = mant.indexOf('.') >= 0;
    let digits = mant.replace('.', '');
    /* Leading zeros are only placeholders: 0.00120 has three. */
    digits = digits.replace(/^0+/, '');
    if (digits === '') return 1;             /* the number is zero */
    if (!hasPoint) digits = digits.replace(/0+$/, '') || '0';
    return digits.length;
  }

  /* Whether a written number's trailing zeros leave its precision unclear:
   * "1200" could be two, three or four figures and there is no way to tell. */
  function sigFigsAmbiguous(text) {
    const s = String(text).trim().replace(/[,\s_]/g, '');
    return /^[+-]?\d*[1-9]0+$/.test(s);
  }

  function roundSig(x, n) {
    if (!isFinite(x) || x === 0 || !n || n < 1) return x;
    const mag = Math.ceil(Math.log10(Math.abs(x)));
    const factor = Math.pow(10, n - mag);
    /* Scale, round, unscale. Done in one step to keep the float error down. */
    return Math.round(x * factor + (x > 0 ? 1e-9 : -1e-9) * Math.abs(x * factor)) / factor;
  }

  /* --------------------------------------------------------------- display */
  /* Write a number the way a chemist would: plain digits in the range a person
   * reads comfortably, and scientific notation outside it. */
  function fmt(x, sig) {
    if (x === null || x === undefined || (typeof x === 'number' && !isFinite(x))) return '—';
    const n = sig || 4;
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a >= 1e6 || a < 1e-4) return sciText(x, n);
    const r = roundSig(x, n);
    /* Show only the digits the precision justifies, and drop a trailing dot. */
    const decimals = Math.max(0, n - Math.ceil(Math.log10(Math.abs(r) || 1)));
    let s = r.toFixed(Math.min(20, decimals));
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  function sciParts(x, sig) {
    if (x === 0) return { mant: 0, exp: 0, mantText: '0' };
    const exp = Math.floor(Math.log10(Math.abs(x)));
    let mant = x / Math.pow(10, exp);
    mant = roundSig(mant, sig || 4);
    /* Rounding 9.99 to two figures gives 10, which is not a mantissa. */
    if (Math.abs(mant) >= 10) { mant /= 10; return { mant: mant, exp: exp + 1, mantText: trim(mant) }; }
    return { mant: mant, exp: exp, mantText: trim(mant) };
  }
  function trim(v) {
    let s = String(v);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  function sciText(x, sig) {
    const p = sciParts(x, sig);
    return p.mantText + ' × 10^' + p.exp;
  }
  /* The same thing with a real superscript, for anywhere HTML is allowed. */
  function sciHTML(x, sig) {
    const p = sciParts(x, sig);
    return ME.esc(p.mantText) + ' × 10<sup>' + p.exp + '</sup>';
  }

  function withUnit(x, unit, sig) {
    return fmt(x, sig) + (unit ? ' ' + unitLabel(unit) : '');
  }

  /* ---------------------------------------------------------- reading input */
  /* Accept the several ways a person might type a number: 1200, 1.2e3,
   * "1.2 x 10^3", "1,200", and a stray unit on the end. */
  function parseQuantity(text) {
    if (text === null || text === undefined) return null;
    let s = String(text).trim().replace(/,/g, '').replace(/−/g, '-');
    if (!s) return null;

    let value = null, numText = null, rest = '';
    let m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\s*(?:[x×*]\s*10\s*\^?\s*([+-]?\d+)|[eE]\s*([+-]?\d+))?\s*(.*)$/);
    if (!m) return null;
    numText = m[1];
    const exp = m[2] !== undefined ? m[2] : m[3];
    value = parseFloat(numText);
    if (exp !== undefined && exp !== null && exp !== '') {
      value *= Math.pow(10, parseInt(exp, 10));
      numText = numText + 'e' + exp;
    }
    rest = (m[4] || '').trim();
    if (!isFinite(value)) return null;
    return { value: value, unit: rest || null, text: numText, raw: s };
  }

  /* ------------------------------------------------------------- grading */
  /* Judge a typed answer. `want` carries the expected value and, where the
   * lesson cares, the unit and the number of significant figures.
   *
   * The reply always explains itself, because a bare "wrong" teaches nothing.
   */
  function checkAnswer(input, want) {
    const q = parseQuantity(input);
    if (!q) return { ok: false, why: 'That does not read as a number. Type a value like 2.5, or 3.0e-4.' };

    const wantUnit = want.unit ? canonicalUnit(want.unit) : null;
    const dim = wantUnit ? dimensionOf(wantUnit) : null;
    let value = q.value;

    if (q.unit) {
      /* Resolve the unit without insisting on the expected dimension first, so
       * that answering a volume question in atmospheres can be told apart from
       * answering it in gibberish. The two need different messages. */
      const given = canonicalUnit(q.unit);
      if (!given) {
        if (!wantUnit) return { ok: false, why: 'I did not recognise the unit "' + q.unit + '".' };
        return { ok: false, why: 'I did not recognise the unit "' + q.unit + '". This answer wants ' + unitLabel(wantUnit) + '.' };
      }
      if (wantUnit && dimensionOf(given) !== dim) {
        return { ok: false, why: unitLabel(given) + ' measures ' + dimensionOf(given) + ', but this answer is a ' + dim + '. Check what the question is actually asking for.' };
      }
      if (wantUnit) value = convert(q.value, given, wantUnit);
    } else if (want.unitRequired) {
      return { ok: false, why: 'Right kind of number, but a measurement needs its unit. Add ' + unitLabel(wantUnit) + '.' };
    }

    /* Relative tolerance by default, because a 1% slip means the same thing
     * whether the answer is 0.02 or 20000. Near zero it has to be absolute. */
    const tol = want.tol === undefined ? 0.01 : want.tol;
    const scale = Math.abs(want.value);
    const slack = want.abs !== undefined ? want.abs : Math.max(scale * tol, scale === 0 ? tol : 0);
    const off = Math.abs(value - want.value);
    if (off > slack + 1e-12) {
      const ratio = scale > 0 ? value / want.value : 0;
      let hint = value > want.value ? 'That is too big.' : 'That is too small.';
      /* The two mistakes that actually happen: a factor of ten, or upside down. */
      if (scale > 0) {
        /* The reciprocal is checked before the power of ten, because an answer
         * of 0.1 where 10 was wanted is both, and "you have it upside down" is
         * the more useful of the two things to be told. */
        const reciprocal = 1 / want.value;
        if (Math.abs(value - reciprocal) <= Math.abs(reciprocal) * 0.01) {
          hint = 'That is the answer upside down — you have divided where you needed to multiply, or used a conversion factor the wrong way round.';
        } else if (ratio > 0) {
          const decades = Math.log10(Math.abs(ratio));
          if (Math.abs(decades - Math.round(decades)) < 0.02 && Math.round(decades) !== 0) {
            hint = 'You are out by a factor of ' + fmt(Math.pow(10, Math.abs(Math.round(decades))), 3) +
              '. That is usually a slipped decimal point, or a prefix like milli- or kilo- going the wrong way.';
          }
        }
      }
      return { ok: false, why: hint, value: value };
    }

    if (want.sig) {
      const got = sigFigs(q.text);
      if (got !== null && got !== want.sig) {
        return {
          ok: false, closeButPrecision: true, value: value,
          why: 'The value is right, but it is written to ' + got + ' significant figure' + (got === 1 ? '' : 's') +
            ' and this answer should have ' + want.sig + '. Your answer cannot claim more precision than the measurements you started from.',
        };
      }
    }
    return { ok: true, value: value };
  }

  ME.fmt = {
    CONST, UNITS, convert, canonicalUnit, dimensionOf, unitsFor, unitLabel,
    sigFigs, sigFigsAmbiguous, roundSig,
    fmt, sciParts, sciText, sciHTML, withUnit, parseQuantity, checkAnswer,
    /* R in whichever units the reader is working in, derived not looked up. */
    gasConstant(pUnit, vUnit, nUnit) {
      const p = canonicalUnit(pUnit, 'pressure') || 'Pa';
      const v = canonicalUnit(vUnit, 'volume') || 'm3';
      const n = canonicalUnit(nUnit, 'amount') || 'mol';
      /* R has units of pressure x volume / (amount x temperature). Convert one
       * unit of each and the factor falls out. */
      return R_SI * (convert(1, 'Pa', p) * convert(1, 'm3', v)) / convert(1, 'mol', n);
    },
  };
})();
