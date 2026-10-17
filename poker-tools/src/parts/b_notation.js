
/* =====================================================================
   4. RECORD NOTATION  (pure)  -- "PGN for poker", spec in README.md
   GameRecord = { tags:[[key,value]...], hands:[HandRecord] }
   HandRecord = { no, tags:[[k,v]], button, stacks:[[name,stack]], hole:{name:[c,c]|null},
                  posts:[{name,kind,amt}], streets:[{board:[], actions:[{name,type,to}]}],
                  shows:[{name, show, cards}], results:[{name, amt, pot, desc}] }
   ===================================================================== */
const VERBS_WITH_AMOUNT = { a: 1, sb: 1, bb: 1, c: 1, b: 1, r: 1 };
const STREET_TAGS = ['', 'F', 'T', 'R'];

class RecordError extends Error {
  constructor(line, message) { super(`Line ${line}: ${message}`); this.line = line; this.detail = message; }
}

const VARIANTS = {
  NLHE: { game: 'holdem', limit: 'nl', holeCount: 2, name: "No-Limit Hold'em" },
  PLHE: { game: 'holdem', limit: 'pl', holeCount: 2, name: "Pot-Limit Hold'em" },
  NLO: { game: 'omaha', limit: 'nl', holeCount: 4, name: 'No-Limit Omaha' },
  PLO: { game: 'omaha', limit: 'pl', holeCount: 4, name: 'Pot-Limit Omaha' },
  NLO5: { game: 'omaha', limit: 'nl', holeCount: 5, name: 'No-Limit 5-Card Omaha' },
  PLO5: { game: 'omaha', limit: 'pl', holeCount: 5, name: 'Pot-Limit 5-Card Omaha' },
  FLHE: { game: 'holdem', limit: 'fl', holeCount: 2, name: "Limit Hold'em" },
  FLO: { game: 'omaha', limit: 'fl', holeCount: 4, name: 'Limit Omaha' },
  FLO5: { game: 'omaha', limit: 'fl', holeCount: 5, name: 'Limit 5-Card Omaha' },
};

const Notation = {
  /** Variant code for the [Variant] tag, e.g. NLHE, PLO, PLO5. */
  variantCode(game, limit, holeCount) {
    return `${limit === 'pl' ? 'PL' : limit === 'fl' ? 'FL' : 'NL'}${game === 'omaha' ? 'O' : 'HE'}${game === 'omaha' && holeCount === 5 ? '5' : ''}`;
  },

  potLabel(k) { return k === 0 ? 'main pot' : `side pot ${k}`; },

  /** Engine hand -> HandRecord, as seen by `viewer` (player index, or -1 for a spectator). */
  fromHand(h, viewer, mode, opts = {}) {
    const names = h.players.map((p) => p.name);
    const known = (i) => mode === 'All' || i === viewer || h.players[i].shown;
    const rec = {
      no: h.no, button: names[h.button],
      stacks: h.players.map((p) => [p.name, p.startStack]),
      hole: Object.create(null), posts: [], streets: [{ board: [], actions: [] }], shows: [], results: [],
      holeCount: h.holeCount || 2,
    };
    rec.tags = Notation.handTags(rec);
    // Rising blinds: each hand states its own level.
    if (opts.levels) rec.tags.push(['Blinds', `${h.sb}/${h.bb}`], ['Ante', String(h.ante || 0)]);
    // Hands where a bot made decisions say so (only ever present in a "full" record).
    if (h.botNames && h.botNames.length) rec.tags.push(['Bots', h.botNames.join(',')]);
    h.players.forEach((p, i) => { rec.hole[p.name] = known(i) && p.hole ? p.hole.slice() : null; });
    for (const e of h.log) {
      if (e.t === 'post') rec.posts.push({ name: names[e.p], kind: e.kind, amt: e.amt });
      else if (e.t === 'deal') rec.streets.push({ board: e.cards.slice(), actions: [] });
      else if (e.t === 'act') rec.streets[rec.streets.length - 1].actions.push({ name: names[e.p], type: e.type, to: e.type === 'f' || e.type === 'x' ? null : e.to });
      else if (e.t === 'show') rec.shows.push({ name: names[e.p], show: true, cards: e.cards.slice() });
      else if (e.t === 'muck') rec.shows.push({ name: names[e.p], show: false, cards: null });
      else if (e.t === 'win') rec.results.push({ name: names[e.p], amt: e.amt, pot: e.npots > 1 ? Notation.potLabel(e.pot) : null, desc: e.desc || null });
    }
    return rec;
  },

  handTags(rec) {
    return [['Button', rec.button], ['Stacks', rec.stacks.map(([n, s]) => `${n}:${s}`).join(', ')]];
  },

  gameTags(o) {
    return [
      ['Event', o.event], ['Date', o.date], ['Variant', o.variant || 'NLHE'], ['Blinds', `${o.sb}/${o.bb}`],
      ['Ante', String(o.ante || 0)], ['StartingStack', String(o.startingStack)],
      ['Players', o.players.join(',')], ['HoleCards', o.holeCards === 'All' ? 'All' : 'Showdown'],
      // Every other table setting, so the record says exactly how the game was set up.
      ...(o.settings || []).filter(([k, v]) => /^[A-Za-z][A-Za-z0-9_]*$/.test(k) && v != null).map(([k, v]) => [k, String(v).replace(/["\[\]\\]/g, '')]),
    ];
  },

  tagStr(tags) { return tags.map(([k, v]) => `[${k} "${v}"]`).join(' '); },

  serializeHand(r) {
    const cardsFor = (name) => (r.hole[name] ? `[${r.hole[name].join('')}]` : `[${'??'.repeat(r.holeCount || 2)}]`);
    // Hole cards appear once per player: on their first preflop action, else on their first post.
    const placed = new Set();
    const firstAct = Object.create(null);
    r.streets[0].actions.forEach((a, k) => { if (!(a.name in firstAct)) firstAct[a.name] = k; });
    const tok = (name, verb, amt, withCards) => `${name}${withCards ? ' ' + cardsFor(name) : ''} ${verb}${amt != null ? ' ' + amt : ''}`;
    const lines = [`#${r.no} ${Notation.tagStr(r.tags)}`];
    const posts = r.posts.map((p) => {
      const wc = !(p.name in firstAct) && !placed.has(p.name);
      if (wc) placed.add(p.name);
      return tok(p.name, p.kind, p.amt, wc);
    });
    if (posts.length) lines.push(posts.join('; '));
    // Anyone dealt in who neither posted nor acted preflop (cannot happen in legal play).
    const extra = r.stacks.map(([n]) => n).filter((n) => !(n in firstAct) && !placed.has(n) && !r.posts.some((p) => p.name === n));
    const pre = r.streets[0].actions.map((a, k) => tok(a.name, a.type, a.to, firstAct[a.name] === k));
    if (extra.length) pre.unshift(...extra.map((n) => `${n} ${cardsFor(n)} d`));
    if (pre.length) lines.push(pre.join('; '));
    for (let s = 1; s < r.streets.length; s++) {
      const st = r.streets[s];
      lines.push(`${STREET_TAGS[s]}: ${st.board.join(' ')}` + st.actions.map((a) => '; ' + tok(a.name, a.type, a.to, false)).join(''));
    }
    if (r.shows.length) lines.push('SD: ' + r.shows.map((s) => (s.show ? `${s.name} shows [${s.cards.join('')}]` : `${s.name} mucks`)).join('; '));
    lines.push('=> ' + r.results.map((w) => `${w.name} wins ${w.amt}${w.pot ? ' from ' + w.pot : ''}${w.desc ? ' (' + w.desc + ')' : ''}`).join('; '));
    return lines.join('\n');
  },

  serialize(g) {
    const head = g.tags.map(([k, v]) => `[${k} "${v}"]`).join('\n');
    return [head, ...g.hands.map(Notation.serializeHand)].join('\n\n') + '\n';
  },

  /** Parse a record. Tolerates arbitrary whitespace / line breaks. Throws RecordError. */
  parse(text) {
    text = String(text || '').replace(/[“”„″]/g, '"').replace(/[‘’]/g, "'").replace(/ /g, ' ');
    // Collapse whitespace, remembering where every character came from (for line numbers).
    let s = '';
    const map = [];
    let ws = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (/\s/.test(ch)) { if (!ws && s.length) { s += ' '; map.push(i); } ws = true; }
      else { s += ch; map.push(i); ws = false; }
    }
    if (s.endsWith(' ')) { s = s.slice(0, -1); map.pop(); }
    map.push(text.length);
    const lineOf = (pos) => { const o = map[Math.min(pos, map.length - 1)]; let l = 1; for (let i = 0; i < o && i < text.length; i++) if (text[i] === '\n') l++; return l; };
    let pos = 0;
    const fail = (msg, at = pos) => { throw new RecordError(lineOf(at), msg); };
    const skip = () => { while (s[pos] === ' ') pos++; };
    const re = (rx) => { rx.lastIndex = pos; const m = rx.exec(s); if (m) pos = rx.lastIndex; return m; };
    const peekStr = (n = 24) => s.slice(pos, pos + n);
    const readTags = () => {
      const tags = [];
      for (;;) {
        skip();
        if (s[pos] !== '[') break;
        const m = re(/\[\s?([A-Za-z][A-Za-z0-9_]*)\s?"([^"]*)"\s?\]/y);
        if (!m) fail(`Malformed tag near "${peekStr()}" (expected [Key "Value"])`);
        tags.push([m[1], m[2].trim()]);
      }
      return tags;
    };

    if (!s.trim()) fail('The record is empty', 0);
    const g = { tags: readTags(), hands: [] };
    const tag = (k) => (g.tags.find((t) => t[0] === k) || [])[1];
    if (!g.tags.length) fail('A record starts with header tags such as [Event "..."] and [Blinds "1/2"]');
    if (!/^\d+\/\d+$/.test(tag('Blinds') || '')) fail('Missing or invalid [Blinds "SB/BB"] tag', 0);
    const variant = Object.hasOwn(VARIANTS, tag('Variant') || 'NLHE') ? VARIANTS[tag('Variant') || 'NLHE'] : null;
    if (!variant) fail(`Unknown [Variant "${tag('Variant')}"] (supported: ${Object.keys(VARIANTS).join(', ')})`, 0);
    const holeCount = variant.holeCount;
    skip();
    while (pos < s.length) {
      const handStart = pos;
      const hm = re(/#(\d+)/y);
      if (!hm) fail(`Expected a hand header like "#1 [Button ...]" but found "${peekStr()}"`);
      const r = { no: Number(hm[1]), tags: readTags(), hole: Object.create(null), posts: [], streets: [{ board: [], actions: [] }], shows: [], results: [], holeCount };
      const ht = (k) => (r.tags.find((t) => t[0] === k) || [])[1];
      if (ht('Stacks') == null) fail(`Hand #${r.no} is missing its [Stacks "..."] tag`, handStart);
      if (ht('Button') == null) fail(`Hand #${r.no} is missing its [Button "..."] tag`, handStart);
      r.stacks = ht('Stacks').split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
        const k = x.lastIndexOf(':');
        const st = Number(x.slice(k + 1));
        if (k < 1 || !Number.isInteger(st)) fail(`Hand #${r.no}: bad stack entry "${x}" (expected Name:Chips)`, handStart);
        return [x.slice(0, k).trim(), st];
      });
      if (r.stacks.length < 2) fail(`Hand #${r.no} needs at least two players in [Stacks]`, handStart);
      r.button = ht('Button');
      const names = r.stacks.map((x) => x[0]).sort((a, b) => b.length - a.length);
      if (!names.includes(r.button)) fail(`Hand #${r.no}: button player "${r.button}" is not in [Stacks]`, handStart);
      r.stacks.forEach(([n]) => { r.hole[n] = null; });
      const seenCards = new Set();

      const atBoundary = () => { skip(); return pos >= s.length || /^(?:[FTR]:|SD:|=>|#\d)/.test(s.slice(pos, pos + 4)); };
      const readName = () => {
        skip();
        for (const n of names) {
          if (s.startsWith(n, pos) && (s[pos + n.length] === ' ' || s[pos + n.length] === '[')) { pos += n.length; return n; }
        }
        fail(`Unknown player near "${peekStr()}" (players in hand #${r.no}: ${r.stacks.map((x) => x[0]).join(', ')})`);
      };
      const readCardList = (min, max, what) => {
        const out = [];
        for (;;) {
          skip();
          const m = re(/(10|[2-9TJQKAtjqka])([shdcSHDC♠♥♦♣])(?=[\s;\]]|$)/y);
          if (!m) break;
          const c = Cards.parse(m[0]);
          if (seenCards.has(c)) fail(`Card ${c} appears twice in hand #${r.no}`);
          seenCards.add(c);
          out.push(c);
        }
        if (out.length < min || out.length > max) fail(`Expected ${min === max ? min : min + '-' + max} card(s) for ${what}, found ${out.length}`);
        return out;
      };
      /** Reads "[AhKd]" / "[????]". Returns undefined (no bracket), null (hidden) or the cards. */
      const readBracketCards = (name) => {
        skip();
        const at = pos;
        const m = re(/\[([^\]]*)\]/y);
        if (!m) return undefined;
        const inner = m[1].replace(/\s+/g, '');
        if (/^\?+$/.test(inner)) return null;
        const toks = inner.match(/(10|[2-9TJQKA])([shdc♠♥♦♣])/gi) || [];
        if (toks.join('').length !== inner.length || toks.length !== holeCount) fail(`Bad hole cards "[${m[1]}]" for ${name} (expected ${holeCount} cards, e.g. [${['Ah', 'Kd', 'Qs', 'Jc', 'Th'].slice(0, holeCount).join('')}] or [${'??'.repeat(holeCount)}])`, at);
        const cs = toks.map(Cards.parse);
        if (new Set(cs).size !== cs.length) fail(`${name} cannot hold the same card twice`, at);
        if (r.hole[name] && r.hole[name].join() !== cs.join()) fail(`${name} is shown with two different hands`, at);
        for (const c of cs) {
          if (seenCards.has(c) && !(r.hole[name] || []).includes(c)) fail(`Card ${c} appears twice in hand #${r.no}`, at);
          seenCards.add(c);
        }
        r.hole[name] = cs;
        return cs;
      };
      const semi = () => { skip(); if (s[pos] === ';') pos++; };
      const readActions = (street, allowPosts) => {
        while (!atBoundary()) {
          const at = pos;
          const name = readName();
          const cs = readBracketCards(name);
          if (cs !== undefined) { r.holeSeen = r.holeSeen || {}; if (r.holeSeen[name]) fail(`${name}'s hole cards are written twice`, at); r.holeSeen[name] = 1; }
          skip();
          const vm = re(/(sb|bb|a|f|x|c|b|r|d)(?=[\s;]|$)/y);
          if (!vm) fail(`Expected an action (f, x, c, b, r${allowPosts ? ', a, sb, bb' : ''}) after "${name}" but found "${peekStr(10)}"`);
          const verb = vm[1];
          let amt = null;
          if (VERBS_WITH_AMOUNT[verb]) {
            skip();
            const am = re(/(\d+)(?=[\s;]|$)/y);
            if (!am) fail(`"${name} ${verb}" needs a chip amount`);
            amt = Number(am[1]);
          }
          if (verb === 'd') { /* dealt-in marker: cards only */ }
          else if (verb === 'a' || verb === 'sb' || verb === 'bb') {
            if (!allowPosts || r.streets[0].actions.length) fail(`Posting "${verb}" is only allowed before the preflop action`, at);
            r.posts.push({ name, kind: verb, amt });
          } else r.streets[street].actions.push({ name, type: verb, to: amt });
          semi();
        }
      };

      readActions(0, true);
      for (let st = 1; st <= 3; st++) {
        skip();
        if (!s.startsWith(STREET_TAGS[st] + ':', pos)) break;
        pos += 2;
        const board = readCardList(st === 1 ? 3 : 1, st === 1 ? 3 : 1, STREETS[st]);
        r.streets.push({ board, actions: [] });
        semi();
        readActions(st, false);
      }
      skip();
      if (/^[FTR]:/.test(s.slice(pos, pos + 2))) fail(`Street "${s.slice(pos, pos + 2)}" is out of order`);
      if (s.startsWith('SD:', pos)) {
        pos += 3;
        while (!atBoundary()) {
          const name = readName();
          skip();
          if (re(/shows(?=[\s\[])/y)) {
            const cs = readBracketCards(name);
            if (!cs) fail(`"${name} shows" must be followed by the two cards, e.g. [AhKd]`);
            r.shows.push({ name, show: true, cards: cs });
          } else if (re(/mucks(?=[\s;]|$)/y)) r.shows.push({ name, show: false, cards: null });
          else fail(`Expected "shows [cards]" or "mucks" after "${name}"`);
          semi();
        }
      }
      skip();
      if (!s.startsWith('=>', pos)) fail(pos >= s.length ? `Hand #${r.no} has no result line (a line starting with "=>")` : `Hand #${r.no}: expected the result line "=> ..." but found "${peekStr()}"`, pos >= s.length ? handStart : pos);
      pos += 2;
      while (!atBoundary()) {
        const name = readName();
        skip();
        const m = re(/wins (\d+)(?: from (main pot|side pot \d+))?(?: \(([^)]*)\))?(?=[\s;]|$)/y);
        if (!m) fail(`Expected "${name} wins <chips>" in the result line`);
        r.results.push({ name, amt: Number(m[1]), pot: m[2] || null, desc: m[3] ? m[3].trim() : null });
        semi();
      }
      if (!r.results.length) fail(`Hand #${r.no} has an empty result line`);
      delete r.holeSeen;
      g.hands.push(r);
      skip();
    }
    return g;
  },
};

/* =====================================================================
   4b. REPLAY + STATS  (pure; re-simulates records through the Engine)
   ===================================================================== */
const Replay = {
  /** Snapshot-by-snapshot re-simulation of one HandRecord. */
  hand(r, cfg) {
    const issues = [];
    const steps = [];
    const issue = (msg) => issues.push(`Hand #${r.no}: ${msg}`);
    const names = r.stacks.map((x) => x[0]);
    const idx = (n) => names.indexOf(n);
    // A hand may carry its own [Blinds]/[Ante] (rising blind levels).
    const ht = (k) => ((r.tags || []).find((t) => t[0] === k) || [])[1];
    const lvl = { sb: cfg.sb, bb: cfg.bb, ante: cfg.ante };
    if (/^\d+\/\d+$/.test(ht('Blinds') || '')) [lvl.sb, lvl.bb] = ht('Blinds').split('/').map(Number);
    if (/^\d+$/.test(ht('Ante') || '')) lvl.ante = Number(ht('Ante'));
    let h;
    try {
      h = Engine.createHand({
        no: r.no, players: r.stacks.map(([name, stack]) => ({ name, stack })), button: idx(r.button),
        sb: lvl.sb, bb: lvl.bb, ante: lvl.ante, hole: names.map((n) => r.hole[n]),
        game: cfg.game, limit: cfg.limit, holeCount: cfg.holeCount,
      });
    } catch (e) { issue(e.message); return { rec: r, steps, issues, hand: null }; }
    const snap = (label, extra = {}) => steps.push({ label, hand: U.clone(h), street: h.street, ...extra });
    const enginePosts = h.log.filter((e) => e.t === 'post').map((e) => `${names[e.p]} ${e.kind} ${e.amt}`).join('; ');
    const recPosts = r.posts.map((p) => `${p.name} ${p.kind} ${p.amt}`).join('; ');
    if (enginePosts !== recPosts) issue(`posted blinds/antes "${recPosts}" but the rules give "${enginePosts}"`);
    snap('Cards dealt, blinds posted', { kind: 'start' });
    let broken = false;
    for (let s = 0; s < r.streets.length && !broken; s++) {
      const st = r.streets[s];
      if (s > 0) {
        if (h.phase !== 'deal') { issue(`${STREETS[s]} was dealt but ${h.phase === 'betting' ? names[h.toAct] + ' still had to act' : 'the hand was already over'}`); broken = true; break; }
        Engine.dealBoard(h, st.board);
        snap(`${STREETS[s]}: ${st.board.map(Cards.pretty).join(' ')}`, { kind: 'deal' });
      }
      for (const a of st.actions) {
        if (h.phase !== 'betting') { issue(`${a.name} acted after betting on the ${STREETS[s].toLowerCase()} was complete`); broken = true; break; }
        if (h.toAct !== idx(a.name)) { issue(`${a.name} acted out of turn on the ${STREETS[s].toLowerCase()} (${names[h.toAct]} was next)`); broken = true; break; }
        try {
          Engine.applyAction(h, { type: a.type, to: a.to });
          const e = h.log[h.log.length - 1];
          if (e.type !== a.type) issue(`${a.name}'s "${a.type}" should be written "${e.type}"`);
          if (a.type === 'c' && e.to !== a.to) issue(`${a.name} calls to ${a.to} but the call is to ${e.to}`);
          snap(Engine.describeEntry(h, e), { kind: 'act', actor: e.p });
        } catch (err) { issue(`illegal action "${a.name} ${a.type}${a.to != null ? ' ' + a.to : ''}": ${err.message}`); broken = true; break; }
      }
    }
    if (!broken) {
      if (h.phase === 'betting') issue(`the record stops while ${names[h.toAct]} still has to act`);
      else if (h.phase === 'deal') issue(`the record stops before the ${STREETS[h.street + 1].toLowerCase()} is dealt`);
      else {
        const vol = [];
        let plan = [];
        if (h.phase === 'showdown') {
          for (const sh of r.shows) {
            const i = idx(sh.name);
            if (h.players[i].folded) { vol.push(i); continue; }
            plan.push({ p: i, show: sh.show });
          }
          const live = h.players.map((p, i) => i).filter((i) => !h.players[i].folded);
          for (const i of live) if (!plan.some((x) => x.p === i)) { issue(`${names[i]} reached showdown but neither shows nor mucks`); plan.push({ p: i, show: !!h.players[i].hole }); }
          for (const x of plan) if (x.show && !h.players[x.p].hole) issue(`${names[x.p]} shows but the cards are unknown`);
        } else for (const sh of r.shows) vol.push(idx(sh.name));
        Engine.settle(h, plan);
        if (h.results.showdown) snap('Showdown', { kind: 'showdown' });
        for (const i of vol) Engine.showCards(h, i);
        const got = Object.create(null), want = Object.create(null);
        h.log.filter((e) => e.t === 'win').forEach((e) => { got[names[e.p]] = (got[names[e.p]] || 0) + e.amt; });
        r.results.forEach((w) => { want[w.name] = (want[w.name] || 0) + w.amt; });
        const fmt = (o) => Object.keys(o).sort().map((k) => `${k} ${o[k]}`).join(', ');
        if (fmt(got) !== fmt(want)) issue(`result says "${fmt(want)}" but the rules give "${fmt(got)}"`);
        snap(h.log.filter((e) => e.t === 'win').map((e) => Engine.describeEntry(h, e)).join(' · '), { kind: 'result' });
      }
    }
    return { rec: r, steps, issues, hand: h };
  },

  game(g) {
    const tag = (k) => (g.tags.find((t) => t[0] === k) || [])[1];
    const [sb, bb] = (tag('Blinds') || '1/2').split('/').map(Number);
    const v = (Object.hasOwn(VARIANTS, tag('Variant') || 'NLHE') && VARIANTS[tag('Variant') || 'NLHE']) || VARIANTS.NLHE;
    const cfg = { sb, bb, ante: Number(tag('Ante') || 0), game: v.game, limit: v.limit, holeCount: v.holeCount, variant: v };
    const hands = g.hands.map((r) => Replay.hand(r, cfg));
    const notes = [];
    for (let k = 1; k < hands.length; k++) {
      const prev = hands[k - 1].hand;
      if (!prev || prev.phase !== 'done') continue;
      const end = Object.create(null);
      prev.players.forEach((p) => { end[p.name] = p.stack; });
      const diffs = hands[k].rec.stacks.filter(([n, st]) => n in end && end[n] !== st).map(([n, st]) => `${n} ${end[n]}→${st}`);
      if (diffs.length) notes.push(`Before hand #${hands[k].rec.no}: stacks changed between hands (rebuy or adjustment): ${diffs.join(', ')}`);
    }
    return { cfg, hands, notes, issues: hands.flatMap((x) => x.issues) };
  },

  summary(rh) {
    const h = rh.hand;
    if (!h || h.phase !== 'done') return `#${rh.rec.no} · incomplete`;
    const by = Object.create(null);
    h.log.filter((e) => e.t === 'win').forEach((e) => { by[e.p] = (by[e.p] || 0) + e.amt; });
    const parts = Object.keys(by).map((i) => {
      const p = h.players[i];
      const sh = p.hole && (p.shown || h.results.showdown) ? Cards.shorthand(p.hole) : '';
      return `${p.name} wins ${U.fmt(by[i])}${sh && p.shown ? ' with ' + sh : ''}`;
    });
    return `#${rh.rec.no} · ${parts.join(', ')}`;
  },

  /**
   * Per-player and table statistics from replayed hands (public record information only).
   * Every stat has an entry in STAT_KEY explaining exactly how it is counted.
   */
  stats(replay) {
    const P = Object.create(null), order = [];
    const blank = (n) => ({
      name: n, hands: 0, won: 0, net: 0, bbNet: 0, vpip: 0, pfr: 0, limp: 0, foldPre: 0,
      threeBet: 0, threeBetOpp: 0, foldTo3: 0, foldTo3Opp: 0, cbet: 0, cbetOpp: 0, foldToCbet: 0, foldToCbetOpp: 0,
      bets: 0, raises: 0, calls: 0, folds: 0, checks: 0, checkRaise: 0, sawFlop: 0, wtsd: 0, wsd: 0, wonNoSD: 0,
      wonSawFlop: 0, allIn: 0, allInWon: 0, biggest: 0, worst: 0, potsWonTotal: 0, streak: 0, bestStreak: 0, botHands: 0,
    });
    const get = (n) => { if (!P[n]) { P[n] = blank(n); order.push(n); } return P[n]; };
    let biggestPot = 0, biggestPotHand = null, potSum = 0, playersSum = 0, showdowns = 0, splits = 0, total = 0, botHandsTotal = 0;
    const cats = new Array(HAND_CATS.length).fill(0);
    const series = Object.create(null);
    replay.hands.forEach((rh, k) => {
      const h = rh.hand;
      if (!h || h.phase !== 'done') return;
      total++;
      const n = h.players.length;
      const botNames = ((rh.rec.tags || []).find((t) => t[0] === 'Bots') || [, ''])[1].split(',').filter(Boolean);
      if (botNames.length) botHandsTotal++;
      const pot = U.sum(h.log.filter((e) => e.t === 'win').map((e) => e.amt));
      potSum += pot; playersSum += n;
      if (pot > biggestPot) { biggestPot = pot; biggestPotHand = h.no; }
      if (h.results.showdown) showdowns++;
      h.results.pots.forEach((pt) => {
        if (pt.winners.length > 1) splits++;
        if (h.results.showdown) for (const w of pt.winners) { const ev = h.results.evals[w]; if (ev) cats[Math.floor(ev.score / 759375)]++; }
      });
      // Walk the action log once, tracking what each player faced.
      const bets = new Array(n).fill(0), committed = new Array(n).fill(0), allIn = new Array(n).fill(false);
      const vp = new Set(), pr = new Set(), limped = new Set(), foldedPre = new Set();
      let cur = 0, raisesPre = 0, firstRaiser = -1, preRaiser = -1, flopBettor = -1;
      const opp3 = new Set(), oppFoldC = new Set(), checked = new Set();
      const s = h.players.map((p) => get(p.name));
      const commit = (i, amt) => { committed[i] += amt; if (committed[i] >= h.players[i].startStack) allIn[i] = true; };
      for (const e of h.log) {
        if (e.t === 'post') { commit(e.p, e.amt); if (e.kind !== 'a') { bets[e.p] += e.amt; cur = Math.max(cur, bets[e.p]); } continue; }
        if (e.t === 'deal') { bets.fill(0); cur = 0; checked.clear(); continue; }
        if (e.t !== 'act') continue;
        const i = e.p, me = s[i], facing = cur > bets[i];
        if (e.street === 0) {
          if (raisesPre === 1 && i !== firstRaiser && !opp3.has(i)) { opp3.add(i); me.threeBetOpp++; if (e.type === 'r') me.threeBet++; }
          if (i === firstRaiser && raisesPre >= 2 && facing && !opp3.has('f' + i)) { opp3.add('f' + i); me.foldTo3Opp++; if (e.type === 'f') me.foldTo3++; }
          if (raisesPre === 0 && e.type === 'c' && !limped.has(i)) { limped.add(i); me.limp++; }
          if (e.type === 'c' || e.type === 'r' || e.type === 'b') vp.add(i);
          if (e.type === 'r' || e.type === 'b') { pr.add(i); raisesPre++; if (firstRaiser < 0) firstRaiser = i; preRaiser = i; }
          if (e.type === 'f') foldedPre.add(i);
        } else {
          if (e.street === 1) {
            if (i === preRaiser && cur === 0) { me.cbetOpp++; if (e.type === 'b') me.cbet++; }
            if (flopBettor >= 0 && flopBettor === preRaiser && i !== preRaiser && facing && !oppFoldC.has(i)) { oppFoldC.add(i); me.foldToCbetOpp++; if (e.type === 'f') me.foldToCbet++; }
            if (e.type === 'b' && cur === 0) flopBettor = i;
          }
          ({ b: () => me.bets++, r: () => me.raises++, c: () => me.calls++, f: () => me.folds++, x: () => me.checks++ })[e.type]();
          if (e.type === 'x') checked.add(i);
          if (e.type === 'r' && checked.has(i)) { me.checkRaise++; checked.delete(i); }
        }
        if (e.amt) commit(i, e.amt);
        if (e.type === 'c' || e.type === 'b' || e.type === 'r') { bets[i] = e.to; cur = Math.max(cur, e.to); }
      }
      const flop = h.board.length >= 3;
      h.players.forEach((p, i) => {
        const me = s[i], won = h.results.payouts[i], net = p.stack - p.startStack;
        me.hands++; me.net += net; me.bbNet += net / (h.bb || 1);
        if (vp.has(i)) me.vpip++;
        if (pr.has(i)) me.pfr++;
        if (foldedPre.has(i)) me.foldPre++;
        if (botNames.includes(p.name)) me.botHands++;
        if (won > 0) { me.won++; me.potsWonTotal += won; me.streak++; me.bestStreak = Math.max(me.bestStreak, me.streak); if (!h.results.showdown) me.wonNoSD++; }
        else me.streak = 0;
        if (won > me.biggest) me.biggest = won;
        if (net < me.worst) me.worst = net;
        if (allIn[i]) { me.allIn++; if (won > 0) me.allInWon++; }
        if (flop && !foldedPre.has(i)) {
          me.sawFlop++;
          if (won > 0) me.wonSawFlop++;
          if (h.results.showdown && !p.folded) { me.wtsd++; if (won > 0) me.wsd++; }
        }
        series[p.name] = series[p.name] || [];
      });
      for (const nm of Object.keys(series)) {
        const p = h.players.find((q) => q.name === nm);
        series[nm].push(p ? { x: k + 1, y: p.stack, start: p.startStack } : null);
      }
    });
    const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
    const players = order.map((nm) => {
      const m = P[nm], post = m.bets + m.raises + m.calls + m.folds;
      return {
        ...m, winPct: pct(m.won, m.hands), vpipPct: pct(m.vpip, m.hands), pfrPct: pct(m.pfr, m.hands), limpPct: pct(m.limp, m.hands),
        foldPrePct: pct(m.foldPre, m.hands), threeBetPct: pct(m.threeBet, m.threeBetOpp), foldTo3Pct: pct(m.foldTo3, m.foldTo3Opp),
        cbetPct: pct(m.cbet, m.cbetOpp), foldToCbetPct: pct(m.foldToCbet, m.foldToCbetOpp),
        af: m.calls ? +((m.bets + m.raises) / m.calls).toFixed(2) : m.bets + m.raises ? Infinity : null,
        afqPct: pct(m.bets + m.raises, post), wtsdPct: pct(m.wtsd, m.sawFlop), wsdPct: pct(m.wsd, m.wtsd),
        wwsfPct: pct(m.wonSawFlop, m.sawFlop), bb100: m.hands ? +((m.bbNet / m.hands) * 100).toFixed(1) : null,
        avgWon: m.won ? Math.round(m.potsWonTotal / m.won) : 0,
      };
    });
    return {
      players, totalHands: total, biggestPot, biggestPotHand, series, avgPot: total ? Math.round(potSum / total) : 0,
      avgPlayers: total ? +(playersSum / total).toFixed(1) : 0, showdownPct: pct(showdowns, total), splits, botHands: botHandsTotal,
      winningHands: HAND_CATS.map((name, i) => ({ name, count: cats[i] })).filter((x) => x.count),
    };
  },
};

/** Plain-English definitions for every statistic the viewer shows (the "stat key"). */
const STAT_KEY = [
  ['Hands', 'Hands the player was dealt into.'],
  ['Won', 'Hands in which the player won at least part of a pot, and that as a share of hands played.'],
  ['Net', 'Total chips won minus chips lost across all hands (rebuys and stack adjustments are not counted).'],
  ['bb/100', 'Big blinds won per 100 hands: the standard win-rate, comparable across stakes and blind levels.'],
  ['Avg pot won', 'Average size of the pots this player won.'],
  ['Biggest pot', 'The most chips the player collected in a single hand.'],
  ['Worst hand', 'The most chips the player lost in a single hand.'],
  ['Best streak', 'Most hands won in a row.'],
  ['VPIP', 'Voluntarily Put chips In Pot: how often the player called or raised before the flop. Posting a blind does not count. Loose players are high (35%+), tight players low (under 20%).'],
  ['PFR', 'Pre-Flop Raise: how often the player raised before the flop. Close to VPIP means aggressive; far below VPIP means the player calls a lot.'],
  ['3-Bet', 'How often the player re-raised when facing exactly one raise before the flop (out of the times they had the chance).'],
  ['Fold to 3-Bet', 'After making the first raise before the flop and being re-raised, how often the player folded.'],
  ['Limp', 'How often the player just called the big blind when nobody had raised yet.'],
  ['Fold preflop', 'How often the player folded before the flop.'],
  ['AF', 'Aggression Factor after the flop: (bets + raises) ÷ calls. Above 2 is aggressive, below 1 is passive. ∞ means they never called.'],
  ['AFq', 'Aggression Frequency after the flop: bets and raises as a share of all bets, raises, calls and folds.'],
  ['C-Bet', 'Continuation bet: when the player made the last raise before the flop and was first to bet on the flop, how often they bet.'],
  ['Fold to C-Bet', 'When the preflop raiser bet the flop into this player, how often they folded.'],
  ['Check-raise', 'Number of times the player checked and then raised on the same street.'],
  ['Saw flop', 'Hands in which the player had not folded when the flop was dealt.'],
  ['WTSD', 'Went To ShowDown: of the flops the player saw, how often they reached showdown.'],
  ['W$SD', 'Won $ at ShowDown: of the showdowns the player reached, how often they won chips.'],
  ['WWSF', 'Won When Saw Flop: of the flops the player saw, how often they won chips.'],
  ['Won w/o SD', 'Pots won because everyone else folded (no showdown).'],
  ['All-ins', 'Hands in which the player put all their chips in, and how many of those they won chips in.'],
  ['Bot hands', 'Hands in which a bot made this seat\'s decisions (only appears in full records).'],
  ['Avg pot', 'Average total pot size across all hands (table overview).'],
  ['Showdowns', 'Share of hands that reached a showdown (table overview).'],
  ['Split pots', 'Pots shared between two or more players (table overview).'],
  ['Winning hands', 'Which hand categories won pots at showdown (table overview).'],
];

/* ---------- Compact records ----------
   The same record in as few characters as possible. The parsed record is written as tight binary
   (player names become numbers, each card one byte, amounts variable-length), squeezed with the
   browser's built-in DEFLATE, then spelled with 16,384 different Chinese characters, so each character
   carries 14 bits. It starts with ♣. Loading it rebuilds the exact same record: decode(encode(x))
   serializes to the identical text, which the self-tests check. */
const Compact = (() => {
  const PREFIX = '♣', BASE = 0x4E00, BITS = 14;
  // Common tag names and values become one-byte codes.
  const KEYS = ['Event', 'Date', 'Variant', 'Blinds', 'Ante', 'StartingStack', 'Players', 'HoleCards', 'Mode', 'Game', 'MaxSeats', 'ActionTimer',
    'BlindsUp', 'Rebuys', 'Deal', 'HostPlays', 'BotTakeover', 'WaitingRoom', 'Viewers', 'ViewerChat', 'HostCanChangeStacks', 'HostCanRemovePlayers',
    'BotPlayers', 'BotSpeed', 'BotsCheer', 'Button', 'Stacks', 'Bots'];
  const VALS = ['On', 'Off', 'All', 'Showdown', 'Hosted', 'Play vs Bots', 'Never', 'Unlimited', 'None', 'Encrypted', 'Standard', 'main pot',
    'normal', 'fast', 'slow', ...Object.keys(VARIANTS), ...Object.values(VARIANTS).map((v) => v.name)];
  const DECK = Cards.newDeck();
  const POSTS = ['sb', 'bb', 'a'], ACTS = ['f', 'x', 'c', 'b', 'r'];
  const enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: true });

  function writer() {
    const b = [];
    const w = {
      bytes: b,
      u(n) { if (!(Number.isInteger(n) && n >= 0)) throw new Error('bad number'); while (n >= 128) { b.push((n % 128) | 128); n = Math.floor(n / 128); } b.push(n); },
      z(n) { w.u(n >= 0 ? n * 2 : -n * 2 - 1); },
      raw(s) { const x = enc.encode(s); w.u(x.length); for (const y of x) b.push(y); },
      str(s) { const k = VALS.indexOf(s); if (k >= 0) w.u(k + 1); else { w.u(0); w.raw(s); } },
      card(c) { const k = DECK.indexOf(c); if (k < 0) throw new Error('bad card'); b.push(k); },
    };
    return w;
  }
  function reader(bytes) {
    let i = 0;
    const need = () => { if (i >= bytes.length) throw new Error('The compact record is cut off.'); return bytes[i++]; };
    const r = {
      u() { let n = 0, m = 1, x; do { x = need(); n += (x & 127) * m; m *= 128; if (m > 2 ** 56) throw new Error('bad number'); } while (x & 128); return n; },
      z() { const n = r.u(); return n % 2 ? -(n + 1) / 2 : n / 2; },
      raw() { const n = r.u(); if (i + n > bytes.length) throw new Error('The compact record is cut off.'); const s = dec.decode(bytes.subarray(i, i + n)); i += n; return s; },
      str() { const k = r.u(); if (k === 0) return r.raw(); if (k > VALS.length) throw new Error('bad value'); return VALS[k - 1]; },
      card() { const k = need(); if (k >= 52) throw new Error('bad card'); return DECK[k]; },
      done: () => i === bytes.length,
    };
    return r;
  }

  const stackStr = (list) => list.map(([n, s]) => `${n}:${s}`).join(', ');

  /** Parsed record -> bytes. */
  function pack(g) {
    const w = writer();
    // every name, numbered in order of first appearance
    const names = [];
    const nm = (n) => { let k = names.indexOf(n); if (k < 0) { k = names.length; names.push(n); } return k; };
    for (const r of g.hands) for (const [n] of r.stacks) nm(n);
    w.u(names.length); names.forEach((n) => w.raw(n));
    const key = (k) => { const x = KEYS.indexOf(k); if (x >= 0) w.u(x + 1); else { w.u(0); w.raw(k); } };
    w.u(g.tags.length);
    for (const [k, v] of g.tags) { key(k); w.str(v); }
    w.u(g.hands.length);
    let prevNo = 0;
    const last = new Map(); // name -> previous starting stack (stacks are written as changes)
    for (const r of g.hands) {
      w.z(r.no - prevNo - 1); prevNo = r.no;
      w.u(r.tags.length);
      for (const [k, v] of r.tags) {
        key(k);
        // Button and Stacks become name numbers when that rebuilds the exact same text
        if (k === 'Button' && names.includes(v)) { w.u(1); w.u(names.indexOf(v)); }
        else if (k === 'Stacks' && stackStr(r.stacks) === v && r.stacks.every(([n]) => names.includes(n))) {
          w.u(2); w.u(r.stacks.length);
          for (const [n, s] of r.stacks) { w.u(names.indexOf(n)); w.z(s - (last.get(n) || 0)); last.set(n, s); }
        }
        else { w.u(0); w.str(v); }
      }
      // players dealt in, for hole cards (the order of [Stacks])
      w.u(r.stacks.length); for (const [n] of r.stacks) w.u(nm(n));
      w.u(r.holeCount);
      for (const [n] of r.stacks) { const h = r.hole[n]; if (h) { w.u(1); h.forEach(w.card); } else w.u(0); }
      w.u(r.posts.length);
      for (const p of r.posts) { w.u(nm(p.name)); w.u(POSTS.indexOf(p.kind)); w.u(p.amt); }
      w.u(r.streets.length);
      r.streets.forEach((st, s) => {
        if (s > 0) { w.u(st.board.length); st.board.forEach(w.card); }
        w.u(st.actions.length);
        for (const a of st.actions) { w.u(nm(a.name)); const t = ACTS.indexOf(a.type); w.u(t * 2 + (a.to != null ? 1 : 0)); if (a.to != null) w.u(a.to); }
      });
      w.u(r.shows.length);
      for (const s of r.shows) {
        const same = s.cards && r.hole[s.name] && s.cards.join() === r.hole[s.name].join();
        w.u(nm(s.name)); w.u(!s.show ? 0 : same ? 1 : 2);
        if (s.show && !same) { w.u(s.cards.length); s.cards.forEach(w.card); }
      }
      w.u(r.results.length);
      for (const x of r.results) {
        w.u(nm(x.name)); w.u(x.amt);
        const side = x.pot && /^side pot (\d+)$/.exec(x.pot);
        if (x.pot == null) w.u(0); else if (x.pot === 'main pot') w.u(1); else if (side && String(+side[1]) === side[1]) w.u(2 + Number(side[1])); else { w.u(1e9); w.str(x.pot); }
        if (x.desc == null) w.u(0); else { w.u(1); w.str(x.desc); }
      }
    }
    return { bytes: Uint8Array.from(w.bytes), names };
  }

  /** bytes -> a record shaped like Notation.parse's, enough for Notation.serialize. */
  function unpack(bytes) {
    const rd = reader(bytes);
    const names = Array.from({ length: rd.u() }, () => rd.raw());
    const name = () => { const k = rd.u(); if (k >= names.length) throw new Error('bad name'); return names[k]; };
    const key = () => { const x = rd.u(); if (x === 0) return rd.raw(); if (x > KEYS.length) throw new Error('bad tag'); return KEYS[x - 1]; };
    const g = { tags: [], hands: [] };
    const nt = rd.u(); for (let i = 0; i < nt; i++) g.tags.push([key(), rd.str()]);
    const nh = rd.u();
    let prevNo = 0;
    const last = new Map();
    for (let h = 0; h < nh; h++) {
      const r = { no: prevNo + 1 + rd.z(), tags: [], hole: Object.create(null), posts: [], streets: [], shows: [], results: [] };
      prevNo = r.no;
      const ntg = rd.u();
      for (let i = 0; i < ntg; i++) {
        const k = key(), mode = rd.u();
        if (mode === 1) r.tags.push([k, name()]);
        else if (mode === 2) {
          const n = rd.u();
          const list = Array.from({ length: n }, () => { const nm2 = name(), s = (last.get(nm2) || 0) + rd.z(); if (s < 0) throw new Error('bad stack'); last.set(nm2, s); return [nm2, s]; });
          r.tags.push([k, stackStr(list)]);
        }
        else r.tags.push([k, rd.str()]);
      }
      const np = rd.u(); r.stacks = Array.from({ length: np }, () => [name(), 0]);
      r.holeCount = rd.u();
      for (const [n] of r.stacks) r.hole[n] = rd.u() ? Array.from({ length: r.holeCount }, () => rd.card()) : null;
      const npo = rd.u(); for (let i = 0; i < npo; i++) r.posts.push({ name: name(), kind: POSTS[rd.u()], amt: rd.u() });
      const ns = rd.u();
      for (let s = 0; s < ns; s++) {
        const st = { board: [], actions: [] };
        if (s > 0) { const nb = rd.u(); for (let i = 0; i < nb; i++) st.board.push(rd.card()); }
        const na = rd.u();
        for (let i = 0; i < na; i++) { const nmx = name(), t = rd.u(); st.actions.push({ name: nmx, type: ACTS[t >> 1], to: t & 1 ? rd.u() : null }); }
        r.streets.push(st);
      }
      const nsh = rd.u();
      for (let i = 0; i < nsh; i++) {
        const n = name(), m = rd.u();
        r.shows.push({ name: n, show: m > 0, cards: m === 0 ? null : m === 1 ? r.hole[n] : Array.from({ length: rd.u() }, () => rd.card()) });
      }
      const nr = rd.u();
      for (let i = 0; i < nr; i++) {
        const n = name(), amt = rd.u(), p = rd.u();
        const pot = p === 0 ? null : p === 1 ? 'main pot' : p === 1e9 ? rd.str() : `side pot ${p - 2}`;
        r.results.push({ name: n, amt, pot, desc: rd.u() ? rd.str() : null });
      }
      g.hands.push(r);
    }
    if (!rd.done()) throw new Error('The compact record has extra data at the end.');
    return g;
  }

  async function pipe(bytes, stream) {
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
    return new Uint8Array(out);
  }
  /** 14 bits per character; a leading a/b says whether the byte count is even or odd. */
  function toChars(bytes) {
    let s = PREFIX + (bytes.length % 2 ? 'b' : 'a'), acc = 0, n = 0;
    for (const x of bytes) {
      acc = (acc << 8) | x; n += 8;
      while (n >= BITS) { n -= BITS; s += String.fromCharCode(BASE + ((acc >> n) & 16383)); }
      acc &= (1 << n) - 1;
    }
    if (n > 0) s += String.fromCharCode(BASE + ((acc << (BITS - n)) & 16383));
    return s;
  }
  function fromChars(s) {
    s = s.replace(/\s+/g, '');
    if (s[0] !== PREFIX || !'ab'.includes(s[1])) throw new Error('This is not a compact record.');
    const body = s.slice(2), odd = s[1] === 'b';
    let len = Math.floor((body.length * BITS) / 8);
    if (len % 2 !== (odd ? 1 : 0)) len--;
    const out = new Uint8Array(len);
    let acc = 0, n = 0, k = 0;
    for (const ch of body) {
      const v = ch.charCodeAt(0) - BASE;
      if (!(v >= 0 && v < 16384)) throw new Error('The compact record contains a character that does not belong in it.');
      acc = (acc << BITS) | v; n += BITS;
      while (n >= 8 && k < len) { n -= 8; out[k++] = (acc >> n) & 255; }
      acc &= (1 << n) - 1;
    }
    if (k !== len) throw new Error('The compact record is cut off.');
    return out;
  }

  const available = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
  return {
    isCompact: (text) => typeof text === 'string' && text.trimStart().startsWith(PREFIX),
    available,
    /** Record text -> compact string. */
    async encode(text) {
      const g = Notation.parse(text);
      let { bytes } = pack(g);
      bytes = await pipe(bytes, new CompressionStream('deflate-raw'));
      return toChars(bytes);
    },
    /** Compact string -> the record's text. Throws RecordError-style messages. */
    async decode(s) {
      try {
        const bytes = await pipe(fromChars(s), new DecompressionStream('deflate-raw'));
        return Notation.serialize(unpack(bytes));
      } catch (e) {
        throw new RecordError(1, /compact record/.test(e.message) ? e.message : 'This compact record is damaged or incomplete. Copy it again in full.');
      }
    },
    _pack: pack, _unpack: unpack,
  };
})();
