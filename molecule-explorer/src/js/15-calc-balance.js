/* Balancing a chemical equation.
 *
 * Balancing is linear algebra wearing a lab coat. Every element gives one
 * equation — "the number of these atoms on the left equals the number on the
 * right" — and the coefficients are the unknowns. Charge gives one more
 * equation, which is what makes redox half-reactions work.
 *
 * The solving is done in exact fractions rather than decimals, because
 * floating point turns 1/3 into 0.33333 and then a coefficient of 3 into
 * 2.99999, and a chemistry app that sometimes says 2.99999 is worthless.
 *
 * Three outcomes matter, and all three get explained rather than thrown:
 *   one answer        the usual case
 *   no answer         the equation cannot be balanced as written
 *   many answers      more than one independent balancing exists
 */
(function () {
  'use strict';

  const ME = window.ME;

  /* --------------------------------------------------------- exact fractions */
  /* BigInt numerator over BigInt denominator, always in lowest terms with a
   * positive denominator. Small and boring on purpose. */
  function gcd(a, b) {
    a = a < 0n ? -a : a; b = b < 0n ? -b : b;
    while (b) { const t = a % b; a = b; b = t; }
    return a;
  }
  function fr(n, d) {
    n = BigInt(n); d = d === undefined ? 1n : BigInt(d);
    if (d === 0n) throw new Error('divide by zero');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    return { n: n / g, d: d / g };
  }
  const isZero = (x) => x.n === 0n;
  const add = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => fr(a.n * b.n, a.d * b.d);
  const div = (a, b) => fr(a.n * b.d, a.d * b.n);
  const neg = (a) => fr(-a.n, a.d);
  const ZERO = fr(0), ONE = fr(1);

  /* ------------------------------------------------------------- the parser */
  const ARROWS = [
    '<=>', '<->', '==>', '-->', '=>', '->', '→', '⇒', '⇌', '⇄', '↔', '=',
  ];

  /* Which arrow was used, and where. Longest spellings are tried first so
   * "==>" is not read as "=" followed by rubbish, and an arrow with space
   * around it beats one without, so the minus sign in "MnO4- -> Mn2+" is not
   * mistaken for the start of the arrow. */
  function findArrow(text) {
    let fallback = null;
    for (const a of ARROWS) {
      let from = 0, i;
      while ((i = text.indexOf(a, from)) >= 0) {
        const spaced = (i === 0 || /\s/.test(text[i - 1])) &&
          (i + a.length >= text.length || /\s/.test(text[i + a.length]));
        if (spaced) return { at: i, len: a.length, text: a };
        if (!fallback) fallback = { at: i, len: a.length, text: a };
        from = i + 1;
      }
    }
    return fallback;
  }

  /* Splitting one side of an equation into its substances.
   *
   * The catch is that "+" does two different jobs here: it separates
   * substances, and it is the sign on a positive ion. In "MnO4- + Fe2+ + H+"
   * three of the four plus signs are charges. Splitting on every "+" turns
   * Fe2+ into Fe2 and throws the charge away without saying so, which then
   * makes perfectly good redox half-equations look unbalanceable.
   *
   * So: a "+" separates substances when it has space on BOTH sides. That is
   * how anyone writing charges actually types it, because "MnO4-+Fe2+" is
   * unreadable. And if no plus on this side has space on both sides, then no
   * charges are being written with spaces either, so every "+" separates
   * except one sitting at the very end. */
  function splitSide(text) {
    const s = text.trim();
    const bothSides = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== '+') continue;
      if (i > 0 && /\s/.test(s[i - 1]) && i + 1 < s.length && /\s/.test(s[i + 1])) bothSides.push(i);
    }
    const cuts = bothSides.length ? bothSides : (function () {
      const out = [];
      for (let i = 0; i < s.length; i++) {
        if (s[i] !== '+') continue;
        if (i === s.length - 1) continue;              /* a trailing charge */
        if (s[i + 1] === '+' || (i > 0 && s[i - 1] === '+')) continue;   /* Ca++ */
        out.push(i);
      }
      return out;
    })();

    const parts = [];
    let start = 0;
    cuts.forEach((i) => { parts.push(s.slice(start, i)); start = i + 1; });
    parts.push(s.slice(start));
    return parts.map((x) => x.trim()).filter((x) => x !== '');
  }

  const STATES = { s: 'solid', l: 'liquid', g: 'gas', aq: 'dissolved in water' };

  /* One species: an optional coefficient, a formula, an optional state. */
  function parseSpecies(raw) {
    let text = String(raw).trim();
    if (!text) return { ok: false, error: 'There is a + with nothing after it.' };

    let coefficient = null;
    const lead = text.match(/^(\d+)\s*(?=[A-Za-z(\[])/);
    if (lead) { coefficient = parseInt(lead[1], 10); text = text.slice(lead[0].length).trim(); }

    /* A state symbol goes last, and has to come off before the formula parser
     * sees it, because "(s)" would otherwise read as a bracketed sulfur. */
    let state = null;
    const st = text.match(/\((s|l|g|aq)\)\s*$/i);
    if (st) { state = st[1].toLowerCase(); text = text.slice(0, st.index).trim(); }

    const f = ME.formula.parse(text);
    if (!f.ok) return { ok: false, error: f.error, fixes: f.fixes, input: raw, formulaText: text };
    return { ok: true, coefficient: coefficient, state: state, formula: f, input: raw };
  }

  function parseEquation(text) {
    const src = String(text == null ? '' : text).trim();
    if (!src) return { ok: false, error: 'Type an equation to balance.' };

    const arrow = findArrow(src);
    if (!arrow) {
      return {
        ok: false,
        error: 'I cannot find the arrow. Put the reactants on the left and the products on the right, with an arrow between them — you can write it as ->, =, or →.',
      };
    }
    const leftText = src.slice(0, arrow.at).trim();
    const rightText = src.slice(arrow.at + arrow.len).trim();
    if (!leftText) return { ok: false, error: 'There is nothing before the arrow. What are the starting materials?' };
    if (!rightText) return { ok: false, error: 'There is nothing after the arrow. What does the reaction make?' };

    const leftRaw = splitSide(leftText), rightRaw = splitSide(rightText);
    if (!leftRaw.length || !rightRaw.length) return { ok: false, error: 'Each side needs at least one substance.' };

    const problems = [];
    const parseSide = (list, side) => list.map((r) => {
      const sp = parseSpecies(r);
      if (!sp.ok) problems.push({ side: side, input: r, error: sp.error, fixes: sp.fixes || [] });
      return sp;
    });
    const left = parseSide(leftRaw, 'left');
    const right = parseSide(rightRaw, 'right');
    if (problems.length) return { ok: false, error: problems[0].error, problems: problems, arrow: arrow.text };

    return { ok: true, left: left, right: right, arrow: arrow.text };
  }

  /* --------------------------------------------------------------- solving */
  /* Rows are elements (plus one row for charge when anything is charged),
   * columns are species. Products count negative, so a balanced equation is
   * exactly a vector in the null space of this matrix. */
  function buildMatrix(eq) {
    const species = eq.left.concat(eq.right);
    const nLeft = eq.left.length;
    const elements = [];
    species.forEach((sp) => {
      Object.keys(sp.formula.counts).forEach((s) => { if (elements.indexOf(s) < 0) elements.push(s); });
    });
    const charged = species.some((sp) => sp.formula.charge !== 0);
    const rows = elements.map((el) =>
      species.map((sp, i) => fr((sp.formula.counts[el] || 0) * (i < nLeft ? 1 : -1))));
    if (charged) {
      rows.push(species.map((sp, i) => fr(sp.formula.charge * (i < nLeft ? 1 : -1))));
    }
    return { rows: rows, elements: elements.concat(charged ? ['charge'] : []), species: species, nLeft: nLeft };
  }

  /* Reduced row echelon form, exactly. */
  function rref(rows, width) {
    const m = rows.map((r) => r.slice());
    const pivots = [];
    let row = 0;
    for (let col = 0; col < width && row < m.length; col++) {
      let pick = -1;
      for (let r = row; r < m.length; r++) if (!isZero(m[r][col])) { pick = r; break; }
      if (pick < 0) continue;
      const t = m[row]; m[row] = m[pick]; m[pick] = t;
      const lead = m[row][col];
      for (let c = 0; c < width; c++) m[row][c] = div(m[row][c], lead);
      for (let r = 0; r < m.length; r++) {
        if (r === row || isZero(m[r][col])) continue;
        const factor = m[r][col];
        for (let c = 0; c < width; c++) m[r][c] = sub(m[r][c], mul(factor, m[row][c]));
      }
      pivots.push(col);
      row++;
    }
    return { m: m, pivots: pivots };
  }

  /* Every basis vector of the null space, scaled to whole numbers. */
  function nullSpace(rows, width) {
    const { m, pivots } = rref(rows, width);
    const free = [];
    for (let c = 0; c < width; c++) if (pivots.indexOf(c) < 0) free.push(c);
    return free.map((f) => {
      const v = new Array(width).fill(ZERO);
      v[f] = ONE;
      pivots.forEach((p, r) => { v[p] = neg(m[r][f]); });
      return toIntegers(v);
    });
  }

  /* Clear the denominators, then divide out the common factor, so the answer
   * is the smallest whole numbers rather than any old multiple of them. */
  function toIntegers(v) {
    let lcm = 1n;
    v.forEach((x) => { lcm = (lcm * x.d) / (gcd(lcm, x.d) || 1n); });
    const ints = v.map((x) => (x.n * lcm) / x.d);
    let g = 0n;
    ints.forEach((x) => { g = gcd(g, x); });
    if (g === 0n) g = 1n;
    return ints.map((x) => x / g);
  }

  function balance(text) {
    const eq = parseEquation(text);
    if (!eq.ok) return eq;

    const mat = buildMatrix(eq);
    const width = mat.species.length;
    if (width < 2) return { ok: false, error: 'An equation needs at least one substance on each side.', equation: eq };

    const basis = nullSpace(mat.rows, width);

    if (!basis.length) {
      return {
        ok: false, equation: eq, elements: mat.elements, kind: 'impossible',
        error: 'This one cannot be balanced as written. ' + whyImpossible(mat),
      };
    }

    if (basis.length > 1) {
      /* More than one independent balancing. Real, and worth explaining: it
       * happens when the equation is really two reactions written as one. */
      return {
        ok: false, equation: eq, elements: mat.elements, kind: 'ambiguous', choices: basis.length,
        error: 'This equation has more than one valid set of coefficients — ' + basis.length +
          ' independent ones, which can be mixed in any proportion. That almost always means two separate reactions have been written as a single equation. Split them and balance each one on its own.',
      };
    }

    let v = basis[0].slice();
    if (v.every((x) => x <= 0n)) v = v.map((x) => -x);
    if (v.some((x) => x <= 0n)) {
      const wrongSide = mat.species
        .map((sp, i) => ({ sp: sp, i: i, c: v[i] }))
        .filter((x) => x.c <= 0n)
        .map((x) => x.sp.formula.display);
      return {
        ok: false, equation: eq, elements: mat.elements, kind: 'sides',
        error: 'This cannot be balanced with every substance where it is. Balancing it would need a negative amount of ' +
          wrongSide.join(' and ') + ', which means ' + (wrongSide.length === 1 ? 'it is' : 'they are') +
          ' on the wrong side of the arrow — or is a leftover that does not belong in this reaction at all.',
      };
    }

    const coefficients = v.map((x) => Number(x));
    const left = mat.species.slice(0, mat.nLeft);
    const right = mat.species.slice(mat.nLeft);
    const result = {
      ok: true, equation: eq, elements: mat.elements,
      coefficients: coefficients,
      left: left.map((sp, i) => ({ species: sp, coefficient: coefficients[i] })),
      right: right.map((sp, i) => ({ species: sp, coefficient: coefficients[mat.nLeft + i] })),
      alreadyBalanced: mat.species.every((sp, i) => (sp.coefficient || 1) === coefficients[i]),
    };
    result.tally = tally(result);
    result.mass = massCheck(result);
    result.text = writeEquation(result);
    result.ratios = ratios(result);
    result.type = classify(result);
    return result;
  }

  /* Why no solution exists, in words. Almost always an element that appears on
   * only one side, which no amount of counting can fix. */
  function whyImpossible(mat) {
    const orphans = [];
    mat.elements.forEach((el, r) => {
      if (el === 'charge') return;
      const row = mat.rows[r];
      const onLeft = row.slice(0, mat.nLeft).some((x) => !isZero(x));
      const onRight = row.slice(mat.nLeft).some((x) => !isZero(x));
      if (onLeft !== onRight) orphans.push({ el: el, side: onLeft ? 'left' : 'right' });
    });
    if (orphans.length) {
      const names = orphans.map((o) => {
        const e = ME.chem.element(o.el);
        return (e ? e.name.toLowerCase() : o.el) + ' appears only on the ' + o.side;
      });
      return names.join(', and ') + '. Atoms are never created or destroyed, so every element has to turn up on both sides. Something is missing from the equation.';
    }
    return 'Every element does appear on both sides, so the counts simply cannot be made to match with any whole numbers. Check the formulas themselves — a wrong subscript is the usual culprit.';
  }

  /* -------------------------------------------------------------- reporting */
  /* Atoms of each element on each side, which is the thing the reader should
   * be watching go green. */
  function tally(result) {
    const rows = [];
    const all = result.left.concat(result.right);
    const elements = [];
    all.forEach((x) => Object.keys(x.species.formula.counts).forEach((s) => {
      if (elements.indexOf(s) < 0) elements.push(s);
    }));
    elements.forEach((el) => {
      const side = (list) => list.reduce((n, x) => n + (x.species.formula.counts[el] || 0) * x.coefficient, 0);
      const l = side(result.left), r = side(result.right);
      rows.push({ element: el, left: l, right: r, ok: l === r });
    });
    const anyCharge = all.some((x) => x.species.formula.charge !== 0);
    if (anyCharge) {
      const side = (list) => list.reduce((n, x) => n + x.species.formula.charge * x.coefficient, 0);
      const l = side(result.left), r = side(result.right);
      rows.push({ element: 'charge', left: l, right: r, ok: l === r, isCharge: true });
    }
    return rows;
  }

  /* Conservation of mass, made into a number the reader can check. */
  function massCheck(result) {
    const side = (list) => list.reduce((n, x) => n + x.species.formula.mass * x.coefficient, 0);
    const l = side(result.left), r = side(result.right);
    return { left: l, right: r, ok: Math.abs(l - r) < 1e-6 * Math.max(1, l) };
  }

  /* Written out with the formulas spelled the way the reader spelled them.
   * Internally everything is compared in Hill order, where NaOH is HNaO and
   * Ca(OH)2 is CaH2O2 — correct, canonical, and unrecognisable to somebody
   * who is learning. An answer nobody recognises is not an answer, so what
   * comes back out is the reader's own spelling with the coefficients added. */
  function writeEquation(result) {
    const part = (x) => (x.coefficient === 1 ? '' : x.coefficient) + x.species.formula.display +
      (x.species.state ? '(' + x.species.state + ')' : '');
    return result.left.map(part).join(' + ') + ' → ' + result.right.map(part).join(' + ');
  }

  function ratios(result) {
    return result.left.concat(result.right).map((x) => ({
      name: x.species.formula.display, coefficient: x.coefficient,
      side: result.left.indexOf(x) >= 0 ? 'left' : 'right',
    }));
  }

  /* ------------------------------------------------------- reaction type */
  /* Recognising the five types a first course cares about, with the reason
   * spelled out, because "it is a single replacement" teaches nothing on its
   * own. */
  function classify(result) {
    const L = result.left.map((x) => x.species.formula);
    const Rr = result.right.map((x) => x.species.formula);
    const isElement = (f) => Object.keys(f.counts).filter((k) => f.counts[k]).length === 1 && f.charge === 0;
    const same = (f, text) => f.text === text;
    const hasO2 = L.some((f) => same(f, 'O2'));
    const makesCO2 = Rr.some((f) => same(f, 'CO2'));
    const makesWater = Rr.some((f) => same(f, 'H2O'));
    const burnsFuel = L.some((f) => f.counts.C && f.counts.H);

    if (hasO2 && makesCO2 && makesWater && burnsFuel) {
      return { key: 'combustion', label: 'Combustion',
        why: 'Something containing carbon and hydrogen reacts with oxygen, and the products are carbon dioxide and water. That is burning.' };
    }
    if (hasO2 && (makesCO2 || makesWater) && L.length === 2) {
      return { key: 'combustion', label: 'Combustion',
        why: 'Something is burning in oxygen and the products are its oxides. It does not have to contain carbon to count — anything that reacts with O₂ and gives out energy is combusting.' };
    }
    /* Nothing actually happening. Worth saying out loud rather than filing
     * under "other", because it is almost always a typo. */
    const setOf = (list) => list.map((f) => f.text).sort().join(' ');
    if (setOf(L) === setOf(Rr)) {
      return { key: 'none', label: 'No reaction written here',
        why: 'The same substances appear on both sides, so nothing has changed. Balanced, technically, but this equation does not describe anything happening.' };
    }
    if (L.length === 1 && Rr.length > 1) {
      return { key: 'decomposition', label: 'Decomposition',
        why: 'One substance goes in and several come out, so a single compound is breaking apart. Usually heat, light or electricity drives it.' };
    }
    if (L.length > 1 && Rr.length === 1) {
      return { key: 'synthesis', label: 'Synthesis',
        why: 'Several substances go in and one comes out, so smaller pieces are joining into a single bigger compound.' };
    }
    if (L.length === 2 && Rr.length === 2) {
      const lElem = L.filter(isElement).length, rElem = Rr.filter(isElement).length;
      if (lElem === 1 && rElem === 1) {
        return { key: 'single', label: 'Single replacement',
          why: 'A lone element on each side: the free element has pushed one of the elements out of the compound and taken its place. Which one wins is what the activity series tells you.' };
      }
      if (lElem === 0 && rElem === 0) {
        if (makesWater) {
          return { key: 'double', label: 'Double replacement (neutralisation)',
            why: 'Two compounds swap partners, and one of the products is water — that is an acid and a base cancelling each other out.' };
        }
        return { key: 'double', label: 'Double replacement',
          why: 'Two compounds trade partners. The pairs that were together at the start end up crossed over, which happens when one new pair is insoluble, a gas, or water.' };
      }
    }
    return { key: 'other', label: 'Not one of the five basic types',
      why: 'It does not fit the five patterns a first course sorts reactions into. Plenty of real chemistry does not — the patterns are a filing system, not a law.' };
  }

  /* ------------------------------------------------------- the walkthrough */
  /* How a person would do it by hand. The order is the thing being taught:
   * start where there is least choice, and leave hydrogen and oxygen until
   * last because they turn up everywhere and so pin down nothing early. */
  function explain(result) {
    if (!result.ok) return null;
    const all = result.left.concat(result.right);
    const counts = {};
    result.tally.forEach((t) => { if (!t.isCharge) counts[t.element] = 0; });
    const appearsIn = {};
    Object.keys(counts).forEach((el) => {
      appearsIn[el] = all.filter((x) => x.species.formula.counts[el]).length;
    });

    const order = Object.keys(counts).sort((a, b) => {
      const lastA = (a === 'H' || a === 'O') ? 1 : 0;
      const lastB = (b === 'H' || b === 'O') ? 1 : 0;
      if (lastA !== lastB) return lastA - lastB;
      if (appearsIn[a] !== appearsIn[b]) return appearsIn[a] - appearsIn[b];
      return a < b ? -1 : 1;
    });

    const steps = [];
    steps.push({
      heading: 'First, leave the formulas alone',
      body: 'Balancing means changing how many of each substance there are, never what they are. You can put a number in front of H₂O; you can never turn it into H₂O₂. Changing a subscript makes it a different chemical, and the equation would then be about a different reaction.',
    });

    const namesOf = (el) => all.filter((x) => x.species.formula.counts[el])
      .map((x) => x.species.formula.display);

    order.forEach((el, idx) => {
      const e = ME.chem.element(el);
      const name = e ? e.name.toLowerCase() : el;
      const where = namesOf(el);
      let reason;
      if (idx === 0) {
        reason = 'Start with ' + name + '. It turns up in ' + (where.length === 2
          ? 'just one substance on each side, so there is nothing to juggle'
          : 'only ' + where.length + ' of the substances here') +
          ', and the fewer places an element appears, the less choice you have about it — which is exactly what you want first.';
      } else if (el === 'H' || el === 'O') {
        reason = 'Leave ' + name + ' until near the end. It is in almost everything, so fixing it early just gets undone by the next step. Once the rest is settled it usually falls into place on its own.';
      } else {
        reason = 'Now ' + name + ', which appears in ' + where.length + ' of the substances.';
      }
      const t = result.tally.filter((x) => x.element === el)[0];
      steps.push({
        heading: 'Balance the ' + name,
        body: reason,
        element: el,
        final: t ? t.left : null,
        detail: where.join(' and '),
      });
    });

    const anyEven = result.coefficients.some((c) => c % 2 === 0);
    if (anyEven) {
      steps.push({
        heading: 'If you ever need half of something',
        body: 'Working through, you may find you want a coefficient of one and a half — that happens a lot with oxygen, because O₂ comes in pairs and the molecule you are burning may need an odd number of oxygen atoms. You cannot have half a molecule in a balanced equation, so double everything. Doubling every coefficient keeps the equation balanced and clears the fraction in one move.',
      });
    }

    steps.push({
      heading: 'Check it, every element, both sides',
      body: 'Count each element on the left and on the right and make sure the two agree. This is not a formality — it is the only way to know you are done, and it catches the one element you forgot about. The table below does it for you, and every row has to match.',
    });

    steps.push({
      heading: 'Finally, make the numbers as small as they go',
      body: 'If every coefficient shares a common factor, divide it out: 2, 4 → 2, 2 should be written 1, 2 → 1, 1. The convention is the smallest whole numbers that work.',
      result: result.text,
    });
    return steps;
  }

  /* What the reader gets while they are adjusting coefficients themselves. */
  function hint(result, guesses) {
    if (!result.ok) return null;
    const all = result.left.concat(result.right);
    const rows = [];
    const elements = [];
    all.forEach((x) => Object.keys(x.species.formula.counts).forEach((s) => {
      if (elements.indexOf(s) < 0) elements.push(s);
    }));
    elements.forEach((el) => {
      let l = 0, r = 0;
      all.forEach((x, i) => {
        const n = (x.species.formula.counts[el] || 0) * (guesses[i] || 0);
        if (i < result.left.length) l += n; else r += n;
      });
      rows.push({ element: el, left: l, right: r, ok: l === r });
    });
    const off = rows.filter((x) => !x.ok);
    if (!off.length) {
      const factor = smallestFactor(guesses);
      if (factor > 1) {
        return { done: false, rows: rows, message: 'Every element matches — well done. One thing left: every coefficient shares a factor of ' + factor + ', so divide them all through to get the smallest whole numbers.' };
      }
      return { done: true, rows: rows, message: 'Balanced, and in the smallest whole numbers. Every element matches on both sides.' };
    }
    const worst = off[0];
    const e = ME.chem.element(worst.element);
    const name = e ? e.name.toLowerCase() : worst.element;
    const more = worst.left > worst.right ? 'left' : 'right';
    const fewer = more === 'left' ? 'right' : 'left';
    return {
      done: false, rows: rows,
      message: 'Not yet. There ' + (Math.max(worst.left, worst.right) === 1 ? 'is' : 'are') + ' ' +
        Math.max(worst.left, worst.right) + ' ' + name + ' on the ' + more + ' and ' +
        Math.min(worst.left, worst.right) + ' on the ' + fewer + '. Raise a coefficient on the ' + fewer +
        ' that contains ' + name + ', and watch what else moves when you do.',
    };
  }

  function smallestFactor(nums) {
    let g = 0n;
    nums.forEach((n) => { g = gcd(g, BigInt(Math.max(0, Math.round(n)))); });
    return Number(g || 1n);
  }

  ME.balance = {
    balance, parseEquation, parseSpecies, explain, hint, classify, smallestFactor,
    findArrow, splitSide, ARROWS, STATES,
  };
})();
