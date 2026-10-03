/* The Balancer tab.
 *
 * One box, type an equation loosely, get it balanced. Everything on this page
 * is meant to teach rather than just answer: the atom table you watch go
 * green, the mass check that makes conservation of mass a number you can see,
 * a walkthrough of how to do it by hand, and a mode where you set the
 * coefficients yourself and get nudged.
 *
 * All the actual chemistry is in ME.balance and ME.formula. This file is the
 * face of it.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  const EXAMPLES = [
    { group: 'Start here', items: [
      { eq: 'H2 + O2 -> H2O', why: 'Hydrogen burning. The simplest one worth doing.' },
      { eq: 'Na + Cl2 -> NaCl', why: 'Sodium and chlorine making table salt.' },
      { eq: 'CH4 + O2 -> CO2 + H2O', why: 'Natural gas burning — the equation you will meet most often.' },
      { eq: 'Fe + O2 -> Fe2O3', why: 'Iron rusting. Needs bigger numbers than it looks like it should.' },
    ] },
    { group: 'Getting harder', items: [
      { eq: 'C3H8 + O2 -> CO2 + H2O', why: 'Propane. Save the oxygen until last and it falls out.' },
      { eq: 'C8H18 + O2 -> CO2 + H2O', why: 'Petrol. This is the one where you have to double everything.' },
      { eq: 'Al + CuSO4 -> Al2(SO4)3 + Cu', why: 'Brackets, and a whole sulfate group that moves as one lump.' },
      { eq: 'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O', why: 'Two bracketed groups at once.' },
      { eq: 'NH3 + O2 -> NO + H2O', why: 'No carbon anywhere, so the usual order of attack changes.' },
    ] },
    { group: 'Tricky', items: [
      { eq: 'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', why: 'Six substances and chlorine in three of them.' },
      { eq: 'CuSO4·5H2O -> CuSO4 + H2O', why: 'A hydrate. The dot means water inside the crystal.' },
      { eq: 'MnO4- + Fe2+ + H+ -> Mn2+ + Fe3+ + H2O', why: 'Ions, so the charge has to balance as well as the atoms.' },
      { eq: 'Cr2O72- + H+ + e- -> Cr3+ + H2O', why: 'A half-equation with electrons written in.' },
    ] },
    { group: 'These ones cannot be balanced', items: [
      { eq: 'CH4 + O2 -> CO2', why: 'The hydrogen has nowhere to go.' },
      { eq: 'C + O2 -> CO + CO2', why: 'Two reactions written as one, so there is no single answer.' },
    ] },
  ];

  const St = { built: false, host: null, input: null, history: [], mode: 'auto', guesses: null, last: null };

  /* --------------------------------------------------------------- build */
  function build(host) {
    St.host = host;
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(el('h1', { text: 'Balancer' }));
    wrap.appendChild(el('p', { class: 'note bal-intro' },
      'Type an equation however you like — arrows as -> or = or →, spaces or no spaces, state symbols if you want them. You can use names instead of formulas too: try "methane + oxygen -> carbon dioxide + water".'));

    /* the input */
    const box = el('div', { class: 'bal-box' });
    St.input = el('textarea', {
      class: 'bal-input', rows: '2', spellcheck: 'false',
      autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off',
      placeholder: 'CH4 + O2 -> CO2 + H2O',
      'aria-label': 'Chemical equation to balance',
    });
    box.appendChild(St.input);
    St.preview = el('div', { class: 'bal-preview', 'aria-live': 'polite' });
    box.appendChild(St.preview);
    wrap.appendChild(box);

    const row = el('div', { class: 'bal-actions' });
    const goBtn = el('button', { class: 'btn btn-primary' }, [ME.icon('check'), 'Balance it']);
    goBtn.addEventListener('click', () => submit());
    row.appendChild(goBtn);
    const clearBtn = el('button', { class: 'btn' }, [ME.icon('x'), 'Clear']);
    clearBtn.addEventListener('click', () => { St.input.value = ''; onInput(); St.input.focus(); });
    row.appendChild(clearBtn);
    row.appendChild(el('span', { class: 'bal-spacer' }));
    St.exampleBtn = el('button', { class: 'btn' }, [ME.icon('book'), 'Examples']);
    St.exampleBtn.addEventListener('click', () => toggleExamples());
    row.appendChild(St.exampleBtn);
    wrap.appendChild(row);

    St.examples = el('div', { class: 'bal-examples' });
    buildExamples(St.examples);
    wrap.appendChild(St.examples);

    St.result = el('div', { class: 'bal-result', 'aria-live': 'polite' });
    wrap.appendChild(St.result);

    St.historyNode = el('div', { class: 'bal-history' });
    wrap.appendChild(St.historyNode);

    host.appendChild(wrap);
    St.built = true;

    St.input.addEventListener('input', ME.debounce(onInput, 90));
    St.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    });
    onInput();
  }

  function buildExamples(node) {
    EXAMPLES.forEach((g) => {
      node.appendChild(el('div', { class: 'bal-ex-group', text: g.group }));
      const list = el('div', { class: 'bal-ex-list' });
      g.items.forEach((x) => {
        const b = el('button', { class: 'bal-ex' });
        b.appendChild(el('code', { html: prettyEquation(x.eq) }));
        b.appendChild(el('span', { class: 'note', text: x.why }));
        b.addEventListener('click', () => {
          St.input.value = x.eq;
          onInput();
          submit();
          toggleExamples(false);
        });
        list.appendChild(b);
      });
      node.appendChild(list);
    });
  }

  function toggleExamples(force) {
    const on = force === undefined ? !St.examples.classList.contains('open') : force;
    St.examples.classList.toggle('open', on);
    St.exampleBtn.classList.toggle('on', on);
  }

  /* --------------------------------------------------- live preview */
  /* Show what the app has understood, as they type. A formula that does not
   * parse is marked, with the fix offered as a button rather than a telling-off. */
  function onInput() {
    const raw = St.input.value;
    ME.clear(St.preview);
    if (!raw.trim()) { St.preview.classList.remove('show'); return; }
    St.preview.classList.add('show');

    const arrow = ME.balance.findArrow(raw);
    if (!arrow) {
      St.preview.appendChild(el('span', { class: 'note',
        text: 'Add an arrow between the starting materials and the products — -> or = will do.' }));
      return;
    }

    const eq = ME.balance.parseEquation(resolveNames(raw).text);
    if (eq.ok) {
      St.preview.appendChild(renderEquation(eq.left, eq.right, null));
      return;
    }

    /* Something did not parse. Name the piece and offer the fixes. */
    const line = el('div', { class: 'bal-problem' });
    line.appendChild(el('span', { class: 'bal-x', html: '&#9888;' }));
    line.appendChild(el('span', { text: eq.error }));
    St.preview.appendChild(line);

    (eq.problems || []).forEach((p) => {
      if (!p.fixes || !p.fixes.length) return;
      const fixRow = el('div', { class: 'bal-fixes' });
      fixRow.appendChild(el('span', { class: 'note', text: 'Did you mean' }));
      p.fixes.forEach((f) => {
        const b = el('button', { class: 'btn btn-sm' });
        b.appendChild(el('code', { html: ME.formulaHTML(f) }));
        b.addEventListener('click', () => {
          /* Replace just the offending piece, leaving the rest alone. */
          St.input.value = St.input.value.replace(p.input, f);
          onInput();
          St.input.focus();
        });
        fixRow.appendChild(b);
      });
      St.preview.appendChild(fixRow);
    });
  }

  /* Swap any recognised compound names for their formulas, showing the reader
   * what the formula is so the name teaches them something. */
  function resolveNames(raw) {
    const arrow = ME.balance.findArrow(raw);
    if (!arrow) return { text: raw, swaps: [] };
    const left = raw.slice(0, arrow.at);
    const right = raw.slice(arrow.at + arrow.len);
    const swaps = [];

    const doSide = (side) => ME.balance.splitSide(side).map((piece) => {
      const trimmed = piece.trim();
      if (!trimmed) return piece;
      /* Already a formula? Leave it completely alone. */
      if (ME.formula.parse(trimmed).ok) return trimmed;
      const found = lookupName(trimmed);
      if (found) { swaps.push({ from: trimmed, to: found.formula, source: found.source }); return found.formula; }
      return trimmed;
    }).join(' + ');

    return { text: doSide(left) + ' -> ' + doSide(right), swaps: swaps };
  }

  /* Seven elements do not go around as lone atoms. Typing "oxygen" into an
   * equation means O2, and reading it as a single O atom silently balances a
   * reaction that does not happen — methane + oxygen came out as
   * "CH4 + 4O → CO2 + 2H2O", which is neatly balanced and complete
   * nonsense. Phosphorus and sulfur are here for the same reason. */
  const ELEMENTAL_FORM = {
    H: 'H2', N: 'N2', O: 'O2', F: 'F2', Cl: 'Cl2', Br: 'Br2', I: 'I2',
    P: 'P4', S: 'S8',
  };
  const ELEMENTAL_WHY = {
    H2: 'hydrogen goes around as H\u2082, two atoms sharing a pair \u2014 a lone H atom is far too reactive to exist on its own',
    N2: 'nitrogen goes around as N\u2082, held by a triple bond, which is why the air is four-fifths nitrogen and nothing much happens',
    O2: 'oxygen goes around as O\u2082, not as lone atoms',
    F2: 'fluorine goes around as F\u2082',
    Cl2: 'chlorine goes around as Cl\u2082',
    Br2: 'bromine goes around as Br\u2082',
    I2: 'iodine goes around as I\u2082',
    P4: 'white phosphorus is a P\u2084 tetrahedron',
    S8: 'sulfur is an S\u2088 ring, which is why it is yellow and crumbly rather than a gas',
  };

  /* A name, from the naming rules first and then the offline molecule
   * database. Both are already verified, so either is trustworthy. */
  function lookupName(text) {
    const byRule = ME.naming.formulaOf(text);
    if (byRule.ok) {
      const better = ELEMENTAL_FORM[byRule.formula];
      if (better) return { formula: better, source: 'naming rules', why: ELEMENTAL_WHY[better] };
      return { formula: byRule.formula, source: 'naming rules' };
    }
    const hits = ME.search.search(text);
    if (hits.results && hits.results.length) {
      const m = hits.results[0].m;
      if (m.f && ME.formula.parse(m.f).ok) return { formula: m.f, source: m.n };
    }
    return null;
  }

  /* ------------------------------------------------------------- submit */
  function submit() {
    const raw = St.input.value.trim();
    if (!raw) return;
    const resolved = resolveNames(raw);
    const result = ME.balance.balance(resolved.text);
    St.last = result;
    St.mode = 'auto';
    St.guesses = null;
    render(result, resolved);
    if (result.ok) remember(raw, result);
  }

  function remember(raw, result) {
    St.history = St.history.filter((h) => h.text !== result.text);
    St.history.unshift({ raw: raw, text: result.text, type: result.type.label });
    St.history = St.history.slice(0, 12);
    renderHistory();
  }

  function renderHistory() {
    ME.clear(St.historyNode);
    if (!St.history.length) return;
    St.historyNode.appendChild(el('h3', { class: 'section-head', text: 'Balanced this session' }));
    const list = el('div', { class: 'bal-hist-list' });
    St.history.forEach((h) => {
      const b = el('button', { class: 'bal-hist' });
      b.appendChild(el('code', { html: prettyEquation(h.text) }));
      b.appendChild(el('span', { class: 'chip', text: h.type }));
      b.addEventListener('click', () => { St.input.value = h.raw; onInput(); submit(); });
      list.appendChild(b);
    });
    St.historyNode.appendChild(list);
  }

  /* ------------------------------------------------------------- render */
  function render(result, resolved) {
    ME.clear(St.result);

    if (resolved && resolved.swaps.length) {
      const note = el('div', { class: 'callout bal-swaps' });
      note.appendChild(el('strong', { text: 'Names turned into formulas: ' }));
      resolved.swaps.forEach((s, i) => {
        if (i) note.appendChild(document.createTextNode(', '));
        note.appendChild(document.createTextNode(s.from + ' = '));
        note.appendChild(el('code', { html: ME.formulaHTML(s.to) }));
      });
      note.appendChild(document.createTextNode('. Worth learning these \u2014 formulas are how the rest of chemistry talks.'));
      const whys = resolved.swaps.filter((s) => s.why);
      if (whys.length) {
        note.appendChild(el('div', { class: 'note', style: { marginTop: '6px' },
          text: 'Note ' + whys.map((s) => s.why).join('; and ') + '.' }));
      }
      St.result.appendChild(note);
    }

    if (!result.ok) { renderFailure(result); return; }

    /* the answer, big */
    const card = el('div', { class: 'card card-pad bal-answer' });
    if (result.alreadyBalanced) {
      card.appendChild(el('div', { class: 'bal-label', text: 'Already balanced' }));
    } else {
      card.appendChild(el('div', { class: 'bal-label', text: 'Balanced' }));
    }
    card.appendChild(renderEquation(result.left, result.right, 'big'));

    const typeRow = el('div', { class: 'bal-type' });
    typeRow.appendChild(el('span', { class: 'chip chip-type', text: result.type.label }));
    typeRow.appendChild(el('span', { class: 'note', text: result.type.why }));
    card.appendChild(typeRow);

    const acts = el('div', { class: 'bal-answer-acts' });
    const copy = el('button', { class: 'btn btn-sm' }, [ME.icon('copy'), 'Copy']);
    copy.addEventListener('click', () => ME.copy(result.text, 'equation'));
    acts.appendChild(copy);
    const how = el('button', { class: 'btn btn-sm' }, [ME.icon('book'), 'Show me how']);
    const tryIt = el('button', { class: 'btn btn-sm' }, [ME.icon('pencil'), 'Let me try']);
    acts.appendChild(how);
    acts.appendChild(tryIt);
    card.appendChild(acts);
    St.result.appendChild(card);

    /* atom table + mass */
    const panels = el('div', { class: 'bal-panels' });
    panels.appendChild(atomTable(result.tally, result.left, result.right));
    panels.appendChild(massPanel(result.mass));
    St.result.appendChild(panels);

    /* mole ratios */
    St.result.appendChild(ratioPanel(result));

    const extra = el('div', { class: 'bal-extra' });
    St.result.appendChild(extra);
    how.addEventListener('click', () => {
      const open = extra.dataset.mode === 'how';
      ME.clear(extra);
      extra.dataset.mode = open ? '' : 'how';
      how.classList.toggle('on', !open);
      tryIt.classList.remove('on');
      if (!open) extra.appendChild(walkthrough(result));
    });
    tryIt.addEventListener('click', () => {
      const open = extra.dataset.mode === 'try';
      ME.clear(extra);
      extra.dataset.mode = open ? '' : 'try';
      tryIt.classList.toggle('on', !open);
      how.classList.remove('on');
      if (!open) extra.appendChild(tryPanel(result));
    });
  }

  function renderFailure(result) {
    const card = el('div', { class: 'card card-pad bal-fail' });
    const heads = {
      impossible: 'This one cannot be balanced',
      ambiguous: 'This one has more than one answer',
      sides: 'Something is on the wrong side',
    };
    card.appendChild(el('div', { class: 'bal-label warn', text: heads[result.kind] || 'I could not read that' }));
    card.appendChild(el('p', { class: 'bal-fail-why', text: result.error }));

    /* Even a failure shows the atom counts, because seeing which element does
     * not appear on both sides is the whole lesson. */
    if (result.equation && result.equation.ok) {
      const fake = {
        left: result.equation.left.map((s) => ({ species: s, coefficient: s.coefficient || 1 })),
        right: result.equation.right.map((s) => ({ species: s, coefficient: s.coefficient || 1 })),
      };
      const rows = [];
      const elements = [];
      fake.left.concat(fake.right).forEach((x) =>
        Object.keys(x.species.formula.counts).forEach((s) => { if (elements.indexOf(s) < 0) elements.push(s); }));
      elements.forEach((e) => {
        const side = (list) => list.reduce((n, x) => n + (x.species.formula.counts[e] || 0) * x.coefficient, 0);
        const l = side(fake.left), r = side(fake.right);
        rows.push({ element: e, left: l, right: r, ok: l === r, orphan: (l === 0) !== (r === 0) });
      });
      card.appendChild(el('p', { class: 'note', text: 'With one of each, the counts stand like this — an element with a zero on one side is the giveaway:' }));
      card.appendChild(atomTable(rows, fake.left, fake.right, true));
    }
    St.result.appendChild(card);
  }

  /* An equation as DOM, with the coefficients picked out in colour. */
  function renderEquation(left, right, size) {
    const node = el('div', { class: 'bal-eq' + (size === 'big' ? ' big' : '') });
    const part = (x) => {
      const sp = x.species || x;
      const coefficient = x.coefficient;
      const piece = el('span', { class: 'bal-sp' });
      /* A coefficient is worth printing only when it is a number above one.
       * A freshly parsed species carries null when the reader typed no
       * leading number, which is the ordinary case — and null passes both an
       * `!== undefined` and an `!== 1` test, which is how the live preview
       * came to read "nullH2 + nullO2". */
      if (typeof coefficient === 'number' && isFinite(coefficient) && coefficient !== 1) {
        piece.appendChild(el('span', { class: 'bal-coef', text: String(coefficient) }));
      }
      piece.appendChild(el('span', { class: 'bal-f', html: sp.formula.html }));
      if (sp.state) piece.appendChild(el('span', { class: 'bal-state', text: '(' + sp.state + ')' }));
      return piece;
    };
    left.forEach((x, i) => {
      if (i) node.appendChild(el('span', { class: 'bal-plus', text: '+' }));
      node.appendChild(part(x));
    });
    node.appendChild(el('span', { class: 'bal-arrow', html: '&#8594;' }));
    right.forEach((x, i) => {
      if (i) node.appendChild(el('span', { class: 'bal-plus', text: '+' }));
      node.appendChild(part(x));
    });
    return node;
  }

  function atomTable(rows, left, right, plain) {
    const card = el('div', { class: 'card card-pad bal-atoms' });
    card.appendChild(el('h3', { class: 'section-head', text: 'Atoms on each side' }));
    card.appendChild(el('p', { class: 'note', text: plain
      ? 'Every row has to match for the equation to be balanced.'
      : 'Every row matches, which is what balanced means. Nothing was created and nothing was destroyed.' }));
    const t = el('table', { class: 'bal-table' });
    const head = el('tr');
    ['', 'Left', 'Right', ''].forEach((h) => head.appendChild(el('th', { text: h })));
    t.appendChild(head);
    rows.forEach((r) => {
      const tr = el('tr', { class: r.ok ? 'ok' : 'bad' });
      const e = ME.chem.element(r.element);
      const label = r.isCharge || r.element === 'charge'
        ? el('td', {}, [el('strong', { text: 'charge' })])
        : el('td', {}, [el('strong', { text: r.element }), ' ' + (e ? e.name.toLowerCase() : '')]);
      tr.appendChild(label);
      tr.appendChild(el('td', { class: 'num', text: fmtSigned(r.left, r.isCharge || r.element === 'charge') }));
      tr.appendChild(el('td', { class: 'num', text: fmtSigned(r.right, r.isCharge || r.element === 'charge') }));
      tr.appendChild(el('td', { class: 'mark', html: r.ok ? '&#10003;' : '&#10007;' }));
      t.appendChild(tr);
    });
    card.appendChild(t);
    return card;
  }

  const fmtSigned = (n, signed) => (signed && n > 0 ? '+' + n : String(n));

  function massPanel(mass) {
    const card = el('div', { class: 'card card-pad bal-mass' });
    card.appendChild(el('h3', { class: 'section-head', text: 'Conservation of mass' }));
    card.appendChild(el('p', { class: 'note',
      text: 'Atoms are not created or destroyed, so the total mass cannot change either. Here it is, weighed on both sides:' }));
    const grid = el('div', { class: 'bal-mass-grid' });
    grid.appendChild(el('div', {}, [
      el('div', { class: 'lbl', text: 'Reactants' }),
      el('div', { class: 'val', text: ME.fmt.fmt(mass.left, 6) + ' g/mol' }),
    ]));
    grid.appendChild(el('div', { class: 'eqsign', text: mass.ok ? '=' : '≠' }));
    grid.appendChild(el('div', {}, [
      el('div', { class: 'lbl', text: 'Products' }),
      el('div', { class: 'val', text: ME.fmt.fmt(mass.right, 6) + ' g/mol' }),
    ]));
    card.appendChild(grid);
    card.classList.toggle('ok', mass.ok);
    if (mass.ok) {
      card.appendChild(el('p', { class: 'note',
        text: 'The same to six figures, and it has to be — the products are the same atoms, rearranged.' }));
    }
    return card;
  }

  function ratioPanel(result) {
    const card = el('div', { class: 'card card-pad bal-ratios' });
    card.appendChild(el('h3', { class: 'section-head', text: 'What the numbers mean' }));
    card.appendChild(el('p', { class: 'note',
      text: 'Read the coefficients as a recipe. They are not masses — they count molecules, or just as well, moles.' }));
    const line = el('div', { class: 'bal-ratio-line' });
    result.ratios.forEach((r, i) => {
      if (i) line.appendChild(el('span', { class: 'sep', text: ':' }));
      const b = el('span', { class: 'bal-ratio' });
      b.appendChild(el('span', { class: 'n', text: String(r.coefficient) }));
      b.appendChild(el('span', { class: 'f', html: ME.formulaHTML(r.name) }));
      line.appendChild(b);
    });
    card.appendChild(line);

    const first = result.left[0], firstProduct = result.right[0];
    card.appendChild(el('p', { class: 'note bal-ratio-read' }, [
      'So for every ',
      el('strong', { text: String(first.coefficient) }),
      ' ' + spell(first.coefficient, 'molecule') + ' of ',
      el('code', { html: first.species.formula.html }),
      ' you get ',
      el('strong', { text: String(firstProduct.coefficient) }),
      ' of ',
      el('code', { html: firstProduct.species.formula.html }),
      '. Double one and you double the other, which is the whole of stoichiometry in one sentence.',
    ]));
    return card;
  }

  const spell = (n, w) => w + (n === 1 ? '' : 's');

  /* ------------------------------------------------------- walkthrough */
  function walkthrough(result) {
    const steps = ME.balance.explain(result);
    const card = el('div', { class: 'card card-pad bal-how' });
    card.appendChild(el('h3', { text: 'How to do this one by hand' }));
    card.appendChild(el('p', { class: 'note',
      text: 'The order matters more than the arithmetic. Here is the order, and why it is that order.' }));
    const list = el('ol', { class: 'bal-steps' });
    steps.forEach((s) => {
      const li = el('li');
      li.appendChild(el('div', { class: 'bal-step-head', text: s.heading }));
      li.appendChild(el('div', { class: 'bal-step-body', text: s.body }));
      if (s.detail) li.appendChild(el('div', { class: 'note bal-step-detail' }, [
        'It appears in ', el('code', { html: ME.formulaHTML(s.detail) }),
        s.final !== null && s.final !== undefined ? ', and ends up at ' + s.final + ' on each side.' : '.',
      ]));
      if (s.result) {
        li.appendChild(el('div', { class: 'bal-step-result' }, [el('code', { html: prettyEquation(s.result) })]));
      }
      list.appendChild(li);
    });
    card.appendChild(list);
    return card;
  }

  /* --------------------------------------------------------- try it mode */
  function tryPanel(result) {
    const all = result.left.concat(result.right);
    const guesses = all.map(() => 1);
    const card = el('div', { class: 'card card-pad bal-try' });
    card.appendChild(el('h3', { text: 'Your turn' }));
    card.appendChild(el('p', { class: 'note',
      text: 'Set the coefficients yourself. The counts update as you go, and every row has to match. There is no penalty for poking at it — that is how everybody learns this.' }));

    const steppers = el('div', { class: 'bal-steppers' });
    const nodes = [];
    all.forEach((x, i) => {
      if (i === result.left.length) steppers.appendChild(el('span', { class: 'bal-arrow', html: '&#8594;' }));
      else if (i) steppers.appendChild(el('span', { class: 'bal-plus', text: '+' }));
      const cell = el('div', { class: 'bal-stepper' });
      const minus = el('button', { class: 'btn btn-sm', text: '−', 'aria-label': 'fewer' });
      const val = el('span', { class: 'bal-stepval', text: '1' });
      const plus = el('button', { class: 'btn btn-sm', text: '+', 'aria-label': 'more' });
      cell.appendChild(minus);
      cell.appendChild(val);
      cell.appendChild(plus);
      const f = el('div', { class: 'bal-stepf', html: x.species.formula.html });
      const holder = el('div', { class: 'bal-stepwrap' }, [cell, f]);
      minus.addEventListener('click', () => { if (guesses[i] > 1) { guesses[i]--; val.textContent = guesses[i]; sync(); } });
      plus.addEventListener('click', () => { if (guesses[i] < 40) { guesses[i]++; val.textContent = guesses[i]; sync(); } });
      nodes.push({ val: val });
      steppers.appendChild(holder);
    });
    card.appendChild(steppers);

    const feedback = el('div', { class: 'bal-try-feedback' });
    const table = el('div', { class: 'bal-try-table' });
    card.appendChild(feedback);
    card.appendChild(table);

    const acts = el('div', { class: 'bal-try-acts' });
    const reset = el('button', { class: 'btn btn-sm', text: 'Start over' });
    reset.addEventListener('click', () => {
      all.forEach((x, i) => { guesses[i] = 1; nodes[i].val.textContent = '1'; });
      sync();
    });
    const reveal = el('button', { class: 'btn btn-sm', text: 'Show me the answer' });
    reveal.addEventListener('click', () => {
      result.coefficients.forEach((c, i) => { guesses[i] = c; nodes[i].val.textContent = String(c); });
      sync();
    });
    acts.appendChild(reset);
    acts.appendChild(reveal);
    card.appendChild(acts);

    function sync() {
      const h = ME.balance.hint(result, guesses);
      ME.clear(feedback);
      feedback.appendChild(el('div', { class: 'callout ' + (h.done ? 'ok' : 'warn'), text: h.message }));
      ME.clear(table);
      table.appendChild(atomTable(h.rows, result.left, result.right, !h.done));
      card.classList.toggle('solved', h.done);
    }
    sync();
    return card;
  }

  /* A plain-text equation with subscripts, for buttons and history. */
  function prettyEquation(text) {
    return ME.esc(text)
      .replace(/([A-Za-z\)\]])(\d+)/g, '$1<sub>$2</sub>')
      .replace(/-&gt;|=&gt;|--&gt;/g, '→')
      .replace(/\^(\d*)([+-])/g, '<sup>$1$2</sup>');
  }

  function ensureBuilt(host) { if (!St.built) build(host); }

  /* So a lesson can drop the whole balancer into itself. */
  function load(equation, andBalance) {
    if (!St.built) return;
    St.input.value = equation;
    onInput();
    if (andBalance !== false) submit();
  }

  ME.balancer = { ensureBuilt, load, EXAMPLES };
})();
