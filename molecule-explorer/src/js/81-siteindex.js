/* An index of everything in this app that is not a molecule.
 *
 * The search box was built to find molecules, which left the course, the
 * calculators, the reference tables and the glossary reachable only by
 * knowing which tab they were in. A reader who types "limiting reactant" or
 * "Le Chatelier" or "entropy" is asking a perfectly good question and was
 * getting "no match" back.
 *
 * The index is built on first use rather than at load, because it reads the
 * course, tools and reference registries, and those are populated by modules
 * that load after this one.
 */
(function () {
  'use strict';

  const ME = window.ME;

  let INDEX = null;

  /* The fixed destinations: the tabs themselves, with the words someone might
   * plausibly reach for. Nothing here is guessed from a registry, so it is
   * written out. */
  const PLACES = [
    { kind: 'tool', title: 'Balancer', hash: '#/balancer',
      sub: 'Balance any equation, with the working and the atom tally',
      terms: 'balance balancing equation coefficients atom tally conservation of mass unbalanceable' },
    { kind: 'tool', title: 'Gas Simulator', hash: '#/gas',
      sub: 'Particles, a piston, and PV = nRT computed live',
      terms: 'gas simulator piston pressure volume temperature moles pv nrt boyle charles gay-lussac avogadro ideal van der waals' },
    { kind: 'tool', title: 'Draw', hash: '#/draw',
      sub: 'Draw a molecule and read its formula, mass and shape back',
      terms: 'draw drawing editor sketch structure bonds atoms build molecule' },
    { kind: 'tool', title: 'Elements', hash: '#/elements',
      sub: 'The periodic table, with shells, orbitals and properties',
      terms: 'periodic table elements element shells orbitals trends atomic radius electronegativity ionisation' },
    { kind: 'tool', title: 'Gallery', hash: '#/gallery',
      sub: 'Molecules grouped by what they are for',
      terms: 'gallery browse molecules categories pharmaceuticals household plastics psychoactive inorganic solvents' },
    { kind: 'lesson', title: 'Course map', hash: '#/learn',
      sub: 'All fifteen units, in order',
      terms: 'course lessons learn units syllabus contents start beginning' },
  ];

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function build() {
    const out = PLACES.map((e) => Object.assign({}, e));

    /* The course: every unit and every lesson. A lesson's searchable text is
     * its title, its unit, and its recap lines — which is a fair summary of
     * what it covers, written for a reader rather than for an index. */
    if (ME.course && ME.course.units) {
      ME.course.units.forEach((u) => {
        out.push({
          kind: 'unit', title: 'Unit ' + u.n + ': ' + u.title, hash: '#/learn',
          sub: (u.lessons || []).length + ' lessons · ' + (u.blurb || ''),
          terms: [u.title, u.blurb, (u.lessons || []).map((l) => l.title).join(' ')].join(' '),
        });
        (u.lessons || []).forEach((l) => {
          /* The lesson's own words: title, its keywords, its recap, the
           * mistakes it warns about, and the text of every question it asks.
           * The questions matter more than they look — a named principle often
           * appears only in the question that asks you to state it, and
           * someone searching for it has no other way in. */
          let questions = '';
          try {
            questions = ME.course.questionsOf(l).map((q) => q.q || '').join(' ');
          } catch (e) { /* a lesson with an unbuildable question set is still findable */ }
          out.push({
            kind: 'lesson', title: l.title, hash: '#/learn/' + l.id,
            sub: 'Unit ' + u.n + ' · ' + u.title + (l.mins ? ' · ' + l.mins + ' min' : ''),
            keywords: l.keywords || '',
            terms: [l.title, u.title, l.keywords || '', (l.recap || []).join(' '),
              (l.mistakes || []).map((m) => m.wrong).join(' '), questions].join(' '),
          });
        });
      });
    }

    /* The reaction animations are findable by what they are about: typing
     * "thermite" should reach the one that plays it, not only the molecules. */
    if (ME.reactionsim && ME.reactionsim.REACTIONS) {
      ME.reactionsim.REACTIONS.forEach((r) => {
        out.push({
          kind: 'tool', title: r.name, hash: '#/reactions/' + r.id,
          sub: 'An animation of ' + r.eq.replace(/->/g, '\u2192'),
          terms: [r.name, r.id.replace(/-/g, ' '), r.group, r.eq, r.note].join(' '),
        });
      });
    }

    if (ME.tools && ME.tools.TOOLS) {
      ME.tools.TOOLS.forEach((t) => {
        out.push({
          kind: 'tool', title: t.name, hash: '#/tools/' + t.key,
          sub: t.blurb || 'A calculator that shows its working',
          terms: [t.name, t.blurb, t.key.replace(/-/g, ' ')].join(' '),
        });
      });
    }

    if (ME.reference && ME.reference.SECTIONS) {
      ME.reference.SECTIONS.forEach((sec) => {
        out.push({
          kind: 'reference', title: sec.name, hash: '#/reference/' + sec.key,
          sub: 'Reference table',
          terms: [sec.name, sec.key.replace(/-/g, ' ')].join(' '),
        });
      });
      (ME.reference.GLOSSARY || []).forEach((entry) => {
        out.push({
          kind: 'glossary', title: entry[0],
          hash: '#/reference/glossary/' + encodeURIComponent(entry[0]),
          sub: entry[1],
          terms: entry[0] + ' ' + entry[1],
        });
      });
    }

    out.forEach((e) => {
      e._t = norm(e.title);
      e._kw = norm(e.keywords || '');
      e._all = norm(e.title + ' ' + (e.sub || '') + ' ' + (e.terms || ''));
    });
    return out;
  }

  function all() {
    if (!INDEX) INDEX = build();
    return INDEX;
  }

  /* Ranked, so an exact title beats a word buried in a recap line. A match has
   * to be worth showing: every query word must appear somewhere in the entry,
   * which keeps a two-word query from matching everything containing "the". */
  function search(query, limit) {
    const q = norm(query);
    if (!q) return [];
    const words = q.split(' ').filter(Boolean);
    const scored = [];

    /* A one- or two-letter query has to match a whole word. Otherwise "pH"
     * finds every lesson with "physical" or "phase" in it, and the short
     * queries are exactly the ones where that noise is worst. */
    const present = (w, text) => (w.length <= 2
      ? new RegExp('\\b' + w + '\\b').test(text)
      : text.indexOf(w) >= 0);

    all().forEach((e) => {
      if (!words.every((w) => present(w, e._all))) return;
      let score = 0;
      if (e._t === q) score += 100;
      else if (e._t.indexOf(q) === 0) score += 60;
      else if (e._t.indexOf(q) >= 0) score += 40;
      else if (norm(e.sub).indexOf(q) >= 0) score += 14;
      /* Keywords are the terms a lesson is about but does not have in its
       * title, so a phrase found there should beat a lesson that merely
       * happens to contain both words separately. Without this, searching
       * "hydrogen bonding" finds the polyatomic-ions lesson, which mentions
       * hydrogen carbonate and bonding in unrelated sentences. */
      if (e._kw && e._kw.indexOf(q) >= 0) score += 30;
      words.forEach((w) => {
        if (new RegExp('\\b' + w).test(e._t)) score += 8;
        else if (e._t.indexOf(w) >= 0) score += 4;
        if (e._kw && new RegExp('\\b' + w).test(e._kw)) score += 6;
      });
      /* A glossary word is usually the most direct answer to a one-word
       * query, and a lesson is the most useful answer to a longer one. */
      if (e.kind === 'glossary' && words.length === 1) score += 6;
      if (e.kind === 'lesson') score += 3;
      if (e.kind === 'unit') score -= 2;
      scored.push({ entry: e, score: score });
    });

    scored.sort((a, b) => b.score - a.score || a.entry.title.length - b.entry.title.length);
    return scored.slice(0, limit || 8).map((x) => x.entry);
  }

  const LABEL = {
    lesson: 'Lesson', unit: 'Unit', tool: 'Tool',
    reference: 'Reference', glossary: 'Glossary',
  };

  ME.siteIndex = { search, all, label: (k) => LABEL[k] || '', norm: norm };
})();
