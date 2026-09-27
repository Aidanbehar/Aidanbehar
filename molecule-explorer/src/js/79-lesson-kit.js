/* Shared building blocks for lesson content.
 *
 * Every unit file needs paragraphs, tables, worked examples and callouts, so
 * they live here once rather than at the top of fifteen files. Nothing here
 * knows any chemistry; it is all layout.
 */
(function () {
  'use strict';

  const ME = window.ME;
  const el = ME.el;

  const p = (...kids) => el('p', {}, kids.flat());
  const b = (t) => el('strong', { text: t });
  const em = (t) => el('em', { text: t });
  const h4 = (t) => el('h4', { text: t });
  const code = (t) => el('code', { text: t });

  function frag(...kids) {
    const f = document.createDocumentFragment();
    kids.flat().forEach((k) => { if (k) f.appendChild(k); });
    return f;
  }

  /* A term with its definition one tap away. Pulls from the shared glossary
   * when the word is in it, so a word is defined the same way everywhere. */
  function term(word, definition) {
    const def = definition || (ME.reference && ME.reference.define(word));
    return el('span', { class: 'term', 'data-tip': def || word, text: word });
  }

  const callout = (...kids) => el('div', { class: 'callout' }, kids.flat());
  const warnCallout = (...kids) => el('div', { class: 'callout warn' }, kids.flat());
  const okCallout = (...kids) => el('div', { class: 'callout ok' }, kids.flat());
  const eq = (text) => el('div', { class: 'lesson-eq', html: ME.formulaHTML(text) });

  function table(head, rows, caption) {
    const t = el('table', { class: 'lesson-table reasons' });
    const hr = el('tr');
    head.forEach((h) => hr.appendChild(el('th', { text: h })));
    t.appendChild(hr);
    rows.forEach((r) => {
      const tr = el('tr');
      r.forEach((c, i) => {
        const td = el('td', { 'data-label': head[i] });
        if (typeof c === 'string') td.innerHTML = ME.formulaHTML(c);
        else if (c) td.appendChild(c);
        tr.appendChild(td);
      });
      t.appendChild(tr);
    });
    const fg = el('figure', { class: 'figure' }, [t]);
    if (caption) fg.appendChild(el('figcaption', { text: caption }));
    return fg;
  }

  /* A worked example, laid out so the reasoning is the big part and the
   * arithmetic is the small part. */
  function worked(title, lines) {
    const box = el('div', { class: 'lesson-worked' });
    box.appendChild(el('div', { class: 'lw-title', text: title }));
    lines.forEach((line) => {
      const row = el('div', { class: 'lw-step' });
      if (line.q) row.appendChild(el('div', { class: 'lw-q', html: ME.formulaHTML(line.q) }));
      if (line.why) row.appendChild(el('div', { class: 'lw-why', html: ME.formulaHTML(line.why) }));
      if (line.maths) row.appendChild(el('div', { class: 'lw-maths', html: ME.formulaHTML(line.maths) }));
      box.appendChild(row);
    });
    return box;
  }

  /* A molecule drawing, for the chemistry lessons that want one. */
  function drawing(smiles, opts) {
    const mol = ME.chem.fromSmiles(smiles);
    ME.chem.ensureCoordinates(mol);
    return ME.render2d.render(mol, Object.assign({ width: 360, height: 220, interactive: false }, opts || {}));
  }

  function figure(caption, ...kids) {
    const f = el('figure', { class: 'figure' }, kids.flat());
    if (caption) f.appendChild(el('figcaption', { text: caption }));
    return f;
  }

  /* Several small drawings in a row with labels under each. */
  function strip(caption, items, opts) {
    const row = el('div', { class: 'figure-2up', style: { gridTemplateColumns: 'repeat(' + items.length + ', 1fr)' } });
    items.forEach((it) => {
      const cell = el('div', {});
      cell.appendChild(it.node || drawing(it.smiles, Object.assign({ width: 200, height: 150 }, opts || {})));
      if (it.label) cell.appendChild(el('div', { class: 'lbl', text: it.label }));
      if (it.sub) cell.appendChild(el('div', { class: 'note', style: { fontSize: '.78rem' }, text: it.sub }));
      row.appendChild(cell);
    });
    return figure(caption, row);
  }

  /* A link into one of the app's other tabs, so a lesson can hand the reader
   * straight to the tool it has just been talking about. */
  function goto(label, hash, note) {
    const box = el('div', { class: 'ls-goto' });
    const btn = el('button', { class: 'btn btn-primary btn-sm' }, [label, ME.icon('chevron')]);
    btn.addEventListener('click', () => ME.router.go(hash));
    box.appendChild(btn);
    if (note) box.appendChild(el('span', { class: 'note', text: note }));
    return box;
  }

  ME.kit = {
    p, b, em, h4, code, frag, term, callout, warnCallout, okCallout, eq,
    table, worked, drawing, figure, strip, goto, el,
  };
})();
