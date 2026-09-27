/* The course: units, long-form lessons, question types and practice.
 *
 * Three things live here.
 *
 * ME.course   a registry. Units and lessons register themselves from the
 *             src/lessons files, so adding a unit means adding one file and
 *             nothing else.
 * ME.quiz     every kind of question the course can ask, in one place, so a
 *             lesson author picks a `kind` and gets grading, explanation and
 *             retry behaviour for free.
 * ME.practice generators that make unlimited fresh problems. Each one asks the
 *             calculation engine for the answer rather than carrying one, so a
 *             generated question and its worked solution cannot disagree.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  /* ============================================================ registry */
  const UNITS = [];
  const BY_LESSON = new Map();

  function unit(spec) {
    const u = Object.assign({ lessons: [] }, spec);
    u.lessons.forEach((l) => { l.unit = u; BY_LESSON.set(l.id, l); });
    UNITS.push(u);
    UNITS.sort((a, b) => a.n - b.n);
    return u;
  }

  function allLessons() {
    const out = [];
    UNITS.forEach((u) => u.lessons.forEach((l) => out.push(l)));
    return out;
  }
  const lesson = (id) => BY_LESSON.get(id) || null;

  /* How many questions a lesson holds, whichever format it is written in. */
  function questionsOf(l) {
    if (!l) return [];
    if (l.__questions) return l.__questions;
    const out = [];
    (l.checkpoints || []).forEach((q) => out.push(q));
    (l.quizzes || (l.quiz ? [l.quiz] : [])).forEach((q) => out.push(q));
    l.__questions = out;
    return out;
  }

  /* Roughly how long a lesson takes, for the course map. */
  function minutesOf(l) {
    if (l.mins) return l.mins;
    const pages = (l.pages || []).length || 1;
    return Math.max(6, Math.round(pages * 4 + questionsOf(l).length * 1.2));
  }

  /* ========================================================== questions */
  /* Every kind renders into a container and calls `say(ok, message)`.
   * A wrong answer is never just "no": it says what was chosen, why that is
   * not it, and leaves the question open. */

  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const spell = (n) => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));
  const plural = (n, w) => spell(n) + ' ' + w + (n === 1 ? '' : 's');

  const KINDS = {};

  /* ---- pick one of several ---- */
  KINDS.choice = function (q, body, say) {
    const opts = q.optionsBuilder ? q.optionsBuilder() : q.options;
    const list = el('div', { class: 'quiz-opts' });
    const buttons = [];
    opts.forEach((o, i) => {
      const btn = el('button', { class: 'quiz-opt' });
      if (o.node) btn.appendChild(o.node); else btn.innerHTML = ME.formulaHTML(o.t);
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        if (o.ok) {
          buttons.forEach((x) => { x.disabled = true; });
          btn.classList.add('right');
          say(true, o.why);
        } else {
          btn.classList.add('wrong');
          btn.disabled = true;
          say(false, o.why);
          const left = buttons.filter((x) => !x.disabled);
          if (left.length === 1) {
            const correct = opts.findIndex((x) => x.ok);
            buttons[correct].classList.add('right');
          }
        }
      });
      buttons.push(btn);
      list.appendChild(btn);
    });
    body.appendChild(list);
  };

  /* ---- type a whole number ---- */
  KINDS.count = function (q, body, say) {
    if (q.smiles) body.appendChild(drawing(q.smiles, Object.assign({ xray: 0, width: 360, height: 220 }, q.render || {})));
    const row = el('div', { class: 'quiz-count' });
    const input = el('input', { type: 'number', min: '0', 'aria-label': 'Your answer' });
    const go = el('button', { class: 'btn btn-primary btn-sm', text: 'Check' });
    const submit = () => {
      const v = parseInt(input.value, 10);
      if (isNaN(v)) return;
      if (v === q.answer) { say(true, q.right); return; }
      const named = q.hints && q.hints[v];
      const direction = v < q.answer ? 'Too few. ' : 'Too many. ';
      say(false, direction + (named || q.wrong));
    };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    row.appendChild(input);
    row.appendChild(go);
    body.appendChild(row);
  };

  /* ---- a measured number, with units and a tolerance ---- */
  KINDS.numeric = function (q, body, say) {
    const row = el('div', { class: 'quiz-numeric' });
    const input = el('input', { type: 'text', inputmode: 'decimal', class: 'quiz-numinput',
      placeholder: q.placeholder || '', 'aria-label': 'Your answer', spellcheck: 'false' });
    const go = el('button', { class: 'btn btn-primary btn-sm', text: 'Check' });
    if (q.unit && !q.unitRequired) {
      row.appendChild(input);
      row.appendChild(el('span', { class: 'quiz-unit', text: ME.fmt.unitLabel(q.unit) }));
    } else {
      row.appendChild(input);
    }
    row.appendChild(go);
    const submit = () => {
      const r = ME.fmt.checkAnswer(input.value, {
        value: q.answer, unit: q.unit, unitRequired: q.unitRequired,
        tol: q.tol, sig: q.sig, abs: q.abs,
      });
      if (r.ok) { say(true, q.right || 'That is it.'); return; }
      say(false, r.why + (q.wrong ? ' ' + q.wrong : ''));
    };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    body.appendChild(row);
    if (q.sig) {
      body.appendChild(el('p', { class: 'note quiz-hint',
        text: 'Give it to ' + q.sig + ' significant figures.' }));
    }
  };

  /* ---- balance an equation with steppers ---- */
  KINDS.balance = function (q, body, say) {
    const result = ME.balance.balance(q.equation);
    if (!result.ok) { body.appendChild(el('p', { class: 'note', text: 'This question is broken: ' + result.error })); return; }
    const all = result.left.concat(result.right);
    const guesses = all.map(() => 1);
    const steppers = el('div', { class: 'bal-steppers quiz-balance' });
    const vals = [];
    all.forEach((x, i) => {
      if (i === result.left.length) steppers.appendChild(el('span', { class: 'bal-arrow', html: '&#8594;' }));
      else if (i) steppers.appendChild(el('span', { class: 'bal-plus', text: '+' }));
      const cell = el('div', { class: 'bal-stepper' });
      const minus = el('button', { class: 'btn btn-sm', text: '−', 'aria-label': 'fewer' });
      const val = el('span', { class: 'bal-stepval', text: '1' });
      const plus = el('button', { class: 'btn btn-sm', text: '+', 'aria-label': 'more' });
      cell.appendChild(minus); cell.appendChild(val); cell.appendChild(plus);
      minus.addEventListener('click', () => { if (guesses[i] > 1) { guesses[i]--; val.textContent = guesses[i]; check(); } });
      plus.addEventListener('click', () => { if (guesses[i] < 30) { guesses[i]++; val.textContent = guesses[i]; check(); } });
      vals.push(val);
      steppers.appendChild(el('div', { class: 'bal-stepwrap' }, [cell,
        el('div', { class: 'bal-stepf', html: x.species.formula.html })]));
    });
    body.appendChild(steppers);
    const tally = el('div', { class: 'quiz-balance-tally' });
    body.appendChild(tally);

    let solved = false;
    function check() {
      const h = ME.balance.hint(result, guesses);
      ME.clear(tally);
      const t = el('table', { class: 'bal-table' });
      const head = el('tr');
      ['', 'Left', 'Right', ''].forEach((x) => head.appendChild(el('th', { text: x })));
      t.appendChild(head);
      h.rows.forEach((r) => {
        const tr = el('tr', { class: r.ok ? 'ok' : 'bad' });
        tr.appendChild(el('td', {}, [el('strong', { text: r.element })]));
        tr.appendChild(el('td', { class: 'num', text: String(r.left) }));
        tr.appendChild(el('td', { class: 'num', text: String(r.right) }));
        tr.appendChild(el('td', { class: 'mark', html: r.ok ? '&#10003;' : '&#10007;' }));
        t.appendChild(tr);
      });
      tally.appendChild(t);
      if (h.done && !solved) { solved = true; say(true, q.right || h.message); }
      else if (!h.done) say(false, h.message);
    }
    check();
  };

  /* ---- name this compound, or write the formula ---- */
  KINDS.name = function (q, body, say) {
    const row = el('div', { class: 'quiz-numeric' });
    const input = el('input', { type: 'text', class: 'quiz-numinput wide', spellcheck: 'false',
      autocomplete: 'off', autocapitalize: 'off',
      placeholder: q.mode === 'formula' ? 'a formula' : 'a name', 'aria-label': 'Your answer' });
    const go = el('button', { class: 'btn btn-primary btn-sm', text: 'Check' });
    row.appendChild(input); row.appendChild(go);
    body.appendChild(row);

    const submit = () => {
      const given = String(input.value || '').trim();
      if (!given) return;
      if (q.mode === 'formula') {
        /* Compare the atoms, not the spelling, so CaCl2 and Cl2Ca both pass. */
        const a = ME.formula.parse(given);
        const b = ME.formula.parse(q.answer);
        if (!a.ok) { say(false, a.error + (a.fixes && a.fixes.length ? ' Did you mean ' + a.fixes.join(' or ') + '?' : '')); return; }
        if (a.text === b.text && a.charge === b.charge) { say(true, q.right || 'That is it: ' + b.display + '.'); return; }
        say(false, diagnoseFormula(a, b) + (q.wrong ? ' ' + q.wrong : ''));
      } else {
        const norm = (x) => String(x).toLowerCase().replace(/[\s\-()]/g, '').replace(/aluminum/, 'aluminium').replace(/sulph/g, 'sulf');
        const accepted = [q.answer].concat(q.also || []);
        if (accepted.some((x) => norm(x) === norm(given))) { say(true, q.right || 'That is the name.'); return; }
        /* Nearly right is worth saying so. */
        if (accepted.some((x) => norm(x).replace(/[ivx]+/g, '') === norm(given).replace(/[ivx]+/g, ''))) {
          say(false, 'The two halves of the name are right, but the Roman numeral is not. Work the metal’s charge out backwards from the fact that the whole compound is neutral.');
          return;
        }
        say(false, (q.wrong || 'Not quite.') + ' The answer has the shape "' + shapeOf(q.answer) + '".');
      }
    };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  };

  function diagnoseFormula(got, want) {
    const keys = Array.from(new Set(Object.keys(got.counts).concat(Object.keys(want.counts))));
    const missing = keys.filter((k) => !got.counts[k] && want.counts[k]);
    const extra = keys.filter((k) => got.counts[k] && !want.counts[k]);
    const wrong = keys.filter((k) => got.counts[k] && want.counts[k] && got.counts[k] !== want.counts[k]);
    if (missing.length) return 'There is no ' + missing.map((k) => ME.chem.element(k).name.toLowerCase()).join(' or ') + ' in what you wrote, and there should be.';
    if (extra.length) return 'You have ' + extra.map((k) => ME.chem.element(k).name.toLowerCase()).join(' and ') + ' in there, which does not belong.';
    if (wrong.length) {
      const k = wrong[0];
      return 'The elements are right but the numbers are not — you have ' + got.counts[k] + ' ' +
        ME.chem.element(k).name.toLowerCase() + ' and it needs ' + want.counts[k] +
        '. Check the charges: they have to cancel exactly.';
    }
    if (got.charge !== want.charge) return 'The atoms are right but the charge is not.';
    return 'Not quite.';
  }

  const shapeOf = (name) => String(name).replace(/[a-z]+/g, '…').replace(/…+/g, '…');

  /* ---- drag into order ---- */
  KINDS.order = function (q, body, say) {
    const items = shuffle(q.items.map((t, i) => ({ t: t, i: i })));
    const list = el('div', { class: 'quiz-order' });
    items.forEach((it) => {
      const row = el('div', { class: 'quiz-order-item', draggable: 'true' });
      row.dataset.index = it.i;
      row.appendChild(el('span', { class: 'grip', html: '&#8942;&#8942;' }));
      row.appendChild(el('span', { html: ME.formulaHTML(it.t) }));
      list.appendChild(row);
    });
    body.appendChild(list);
    const go = el('button', { class: 'btn btn-primary btn-sm', text: 'Check the order' });
    go.addEventListener('click', () => {
      const got = ME.$$('.quiz-order-item', list).map((n) => Number(n.dataset.index));
      const right = got.every((v, i) => v === i);
      if (right) { say(true, q.right || 'That is the right order.'); return; }
      const firstWrong = got.findIndex((v, i) => v !== i);
      say(false, (q.wrong || 'Not in the right order yet.') + ' Look at position ' + (firstWrong + 1) + '.');
    });
    body.appendChild(go);
    makeSortable(list);
  };

  /* ---- drag to match pairs ---- */
  KINDS.match = function (q, body, say) {
    const rights = shuffle(q.pairs.map((p, i) => ({ t: p[1], i: i })));
    const grid = el('div', { class: 'quiz-match' });
    const chosen = {};
    q.pairs.forEach((p, i) => {
      const row = el('div', { class: 'quiz-match-row' });
      row.appendChild(el('div', { class: 'quiz-match-left', html: ME.formulaHTML(p[0]) }));
      const sel = el('select', { class: 'tl-select', 'aria-label': 'match for ' + p[0] });
      sel.appendChild(el('option', { value: '', text: 'choose…' }));
      rights.forEach((r) => sel.appendChild(el('option', { value: String(r.i), text: r.t })));
      sel.addEventListener('change', () => { chosen[i] = sel.value; });
      row.appendChild(sel);
      grid.appendChild(row);
    });
    body.appendChild(grid);
    const go = el('button', { class: 'btn btn-primary btn-sm', text: 'Check' });
    go.addEventListener('click', () => {
      const answered = q.pairs.map((p, i) => chosen[i]);
      if (answered.some((x) => x === undefined || x === '')) { say(false, 'Match all of them first.'); return; }
      const wrong = answered.filter((v, i) => Number(v) !== i).length;
      if (!wrong) { say(true, q.right || 'All matched.'); return; }
      say(false, plural(wrong, 'pair') + ' still wrong. ' + (q.wrong || ''));
    });
    body.appendChild(go);
  };

  /* ---- sort into categories ---- */
  KINDS.sort = function (q, body, say) {
    const items = shuffle(q.items.slice());
    const pool = el('div', { class: 'quiz-sort-pool' });
    const bins = {};
    const wrap = el('div', { class: 'quiz-sort' });
    q.categories.forEach((c) => {
      const bin = el('div', { class: 'quiz-sort-bin' });
      bin.appendChild(el('div', { class: 'quiz-sort-head', text: c }));
      const drop = el('div', { class: 'quiz-sort-drop' });
      drop.dataset.cat = c;
      bin.appendChild(drop);
      bins[c] = drop;
      wrap.appendChild(bin);
      makeDropTarget(drop);
    });
    items.forEach((it) => {
      const chip = el('button', { class: 'quiz-sort-item', draggable: 'true' });
      chip.dataset.cat = it.cat;
      chip.innerHTML = ME.formulaHTML(it.t);
      /* Clicking cycles through the bins, so it works without dragging. */
      chip.addEventListener('click', () => {
        const here = chip.parentNode.dataset ? chip.parentNode.dataset.cat : null;
        const idx = here ? q.categories.indexOf(here) : -1;
        const next = q.categories[(idx + 1) % q.categories.length];
        bins[next].appendChild(chip);
      });
      pool.appendChild(chip);
    });
    body.appendChild(pool);
    makeDropTarget(pool);
    body.appendChild(wrap);
    const go = el('button', { class: 'btn btn-primary btn-sm', text: 'Check' });
    go.addEventListener('click', () => {
      const left = ME.$$('.quiz-sort-item', pool).length;
      if (left) { say(false, plural(left, 'item') + ' still to sort. Drag them, or just click one to move it along.'); return; }
      const wrong = [];
      q.categories.forEach((c) => {
        ME.$$('.quiz-sort-item', bins[c]).forEach((n) => { if (n.dataset.cat !== c) wrong.push(n.textContent); });
      });
      if (!wrong.length) { say(true, q.right || 'All sorted correctly.'); return; }
      say(false, plural(wrong.length, 'item') + ' in the wrong place: ' + wrong.slice(0, 3).join(', ') +
        '. ' + (q.wrong || ''));
    });
    body.appendChild(go);
  };

  /* ---- fill in one step of a worked solution ---- */
  KINDS.fillstep = function (q, body, say) {
    const list = el('ol', { class: 'quiz-steps' });
    let input = null;
    q.steps.forEach((s) => {
      const li = el('li');
      if (s.blank) {
        li.appendChild(el('span', { text: s.before || '' }));
        input = el('input', { type: 'text', class: 'quiz-blank', spellcheck: 'false',
          'aria-label': 'the missing step' });
        li.appendChild(input);
        li.appendChild(el('span', { text: s.after || '' }));
      } else {
        li.innerHTML = ME.formulaHTML(s.text);
      }
      list.appendChild(li);
    });
    body.appendChild(list);
    const go = el('button', { class: 'btn btn-primary btn-sm', text: 'Check' });
    go.addEventListener('click', () => {
      if (!input) return;
      const r = q.numeric
        ? ME.fmt.checkAnswer(input.value, { value: q.answer, tol: q.tol || 0.02 })
        : { ok: String(input.value).trim().toLowerCase() === String(q.answer).toLowerCase(),
            why: q.wrong || 'Not that.' };
      if (r.ok) say(true, q.right || 'Yes — that is the step.');
      else say(false, r.why);
    });
    body.appendChild(go);
  };

  /* ---- click an atom in a drawing ---- */
  KINDS.clickatom = function (q, body, say) {
    const mol = q.mol ? q.mol() : molOf(q.smiles);
    const info = ME.render2d.describe(mol, {});
    const holder = el('div', { class: 'clickmol' });
    holder.appendChild(ME.render2d.render(mol, {
      xray: q.xray || 0, width: q.width || 440, height: q.height || 290,
      onAtomClick(i, atom) {
        const enriched = Object.assign({}, atom, { bondCount: info.atoms[i].bonds.length });
        if (q.test(enriched)) say(true, q.right);
        else say(false, describeClick(enriched) + q.wrong);
      },
    }));
    body.appendChild(holder);
    body.appendChild(el('p', { class: 'note', text: 'Click an atom in the drawing above.' }));
  };

  /* ---- draw it in the editor, checked by structure ---- */
  KINDS.build = function (q, body, say) {
    const box = el('div', { class: 'quiz-build' });
    box.appendChild(el('p', { class: 'note',
      text: 'Draw it in the Draw section, then come back and press Check. The check ignores how it is laid out on the page — only the structure matters.' }));
    const acts = el('div', { class: 'quiz-build-acts' });
    const open = el('button', { class: 'btn btn-sm' }, [ME.icon('pencil'), 'Open Draw']);
    open.addEventListener('click', () => ME.router.go('#/draw'));
    const check = el('button', { class: 'btn btn-primary btn-sm', text: 'Check what I drew' });
    check.addEventListener('click', () => {
      let mol = null;
      try { mol = ME.draw.currentMolecule ? ME.draw.currentMolecule() : null; } catch (e) { mol = null; }
      if (!mol || !mol.getAllAtoms()) { say(false, 'There is nothing in the Draw canvas yet.'); return; }
      const wantMol = molOf(q.smiles);
      const gotID = ME.chem.canonicalID(mol);
      const wantID = ME.chem.canonicalID(wantMol);
      if (gotID && gotID === wantID) { say(true, q.right || 'That is it.'); return; }
      /* Say how close it is, rather than just no. */
      const a = mol.getMolecularFormula().formula, b = wantMol.getMolecularFormula().formula;
      if (a === b) {
        say(false, 'The formula is right — ' + a + ' — but the atoms are joined up differently. Same atoms, different structure, which makes it a different substance. Look again at what is bonded to what.');
      } else {
        say(false, 'You have drawn ' + a + ' and the target is ' + b + '. ' + (q.wrong || ''));
      }
    });
    acts.appendChild(open); acts.appendChild(check);
    box.appendChild(acts);
    body.appendChild(box);
  };

  function describeClick(a) {
    if (a.sym !== 'C') {
      const h = a.hydrogens ? ', holding ' + plural(a.hydrogens, 'hydrogen') : '';
      return 'That is the ' + ME.chem.elementName(a.sym).toLowerCase() + h + '. ';
    }
    const lines = plural(a.bondCount, 'line');
    if (a.hydrogens === 0) return 'That carbon has ' + lines + ' meeting it, so all four of its hands are used and it has no hydrogens. ';
    return 'That carbon has ' + lines + ' meeting it, so it is carrying ' + plural(a.hydrogens, 'hidden hydrogen') + '. ';
  }

  /* ---------------------------------------------------------- rendering */
  function buildQuestion(q, index, total, alreadyPassed, onSolved) {
    const item = el('div', { class: 'quiz-item' + (alreadyPassed ? ' solved' : '') });
    const numBadge = total > 1
      ? el('span', { class: 'quiz-num', text: alreadyPassed ? '✓' : String(index + 1) })
      : null;
    if (numBadge) item.appendChild(numBadge);

    const body = el('div', { class: 'quiz-body' });
    item.appendChild(body);
    body.appendChild(el('div', { class: 'quiz-q', html: ME.formulaHTML(q.q) }));
    if (q.figure) body.appendChild(q.figure());

    const feedback = el('div', { class: 'quiz-feedback' });
    let solved = alreadyPassed;
    function say(ok, message) {
      feedback.classList.add('show');
      ME.clear(feedback);
      feedback.appendChild(el('div', { class: 'callout ' + (ok ? 'ok' : 'warn'), html: ME.formulaHTML(message) }));
      if (ok && !solved) {
        solved = true;
        item.classList.add('solved');
        if (numBadge) numBadge.textContent = '✓';
        if (onSolved) onSolved();
      }
    }

    const fn = KINDS[q.kind];
    if (fn) fn(q, body, say);
    else body.appendChild(el('p', { class: 'note', text: 'Unknown question type: ' + q.kind }));

    if (q.note) body.appendChild(el('p', { class: 'note quiz-hint', text: q.note }));
    body.appendChild(feedback);
    return item;
  }

  /* ------------------------------------------------------------ helpers */
  function molOf(smiles) {
    const m = ME.chem.fromSmiles(smiles);
    ME.chem.ensureCoordinates(m);
    return m;
  }
  function drawing(smiles, opts) {
    return ME.render2d.render(molOf(smiles), Object.assign({ width: 400, height: 240, interactive: true }, opts || {}));
  }

  function shuffle(a) {
    const out = a.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /* Drag and drop, kept deliberately simple, and always with a click
   * alternative so nothing depends on being able to drag. */
  let dragged = null;
  function makeSortable(list) {
    ME.$$('.quiz-order-item', list).forEach((row) => {
      row.addEventListener('dragstart', () => { dragged = row; row.classList.add('dragging'); });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); dragged = null; });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!dragged || dragged === row) return;
        const rect = row.getBoundingClientRect();
        const after = (e.clientY - rect.top) > rect.height / 2;
        list.insertBefore(dragged, after ? row.nextSibling : row);
      });
      /* click to move up, so it works without a mouse drag */
      row.addEventListener('click', () => {
        if (row.previousSibling) list.insertBefore(row, row.previousSibling);
        else list.appendChild(row);
      });
    });
  }
  function makeDropTarget(node) {
    node.addEventListener('dragover', (e) => { e.preventDefault(); node.classList.add('over'); });
    node.addEventListener('dragleave', () => node.classList.remove('over'));
    node.addEventListener('drop', (e) => {
      e.preventDefault();
      node.classList.remove('over');
      if (dragged) node.appendChild(dragged);
    });
  }
  document.addEventListener('dragstart', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('quiz-sort-item')) dragged = e.target;
  });

  /* ========================================================== practice */
  /* A seeded random number generator, so a generated problem can be
   * reproduced exactly - which is what makes them testable. */
  function rng(seed) {
    let s = seed >>> 0 || 1;
    const next = () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
    return {
      next: next,
      int: (a, b) => a + Math.floor(next() * (b - a + 1)),
      pick: (list) => list[Math.floor(next() * list.length)],
      round: (x, dp) => Math.round(x * Math.pow(10, dp)) / Math.pow(10, dp),
    };
  }

  const GENERATORS = {};
  function generator(key, spec) { GENERATORS[key] = spec; }
  function generate(key, seed) {
    const g = GENERATORS[key];
    if (!g) return null;
    const r = rng(seed === undefined ? (Math.random() * 1e9) | 0 : seed);
    const out = g.make(r);
    if (out) { out.key = key; out.seed = seed; }
    return out;
  }

  ME.course = {
    unit, allLessons, lesson, questionsOf, minutesOf,
    get units() { return UNITS; },
  };
  ME.quiz = { buildQuestion, KINDS, shuffle, plural, spell, describeClick, molOf, drawing };
  ME.practice = { generator, generate, rng, get keys() { return Object.keys(GENERATORS); } };
})();
