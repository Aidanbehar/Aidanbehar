/* =====================================================================
   7h. TRAINING DRILLS  (Learn → Training drills)
   Quick-fire questions generated fresh every time, each with four levels
   (Beginner, Intermediate, Advanced, Expert). Every answer is worked out exactly
   by the same hand evaluator and maths the game uses, and explained.
   A question is { q: html, opts: [text], a: index of the right one, why: html }.
   ===================================================================== */
const Drills = (() => {
  const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  const TIMER = [0, 0, 30, 15];          // seconds per question (Advanced and Expert are timed)
  const PER_SESSION = 10;
  const rnd = () => Math.random();
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));       // integer in [a, b]
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const deal = (n, dead = []) => shuffle(Cards.newDeck().filter((c) => !dead.includes(c))).slice(0, n);
  const pct = (x, d = 0) => `${(x * 100).toFixed(d)}%`;
  const fmt = (x) => U.fmt(Math.round(x));
  const cs = (arr, size = 34) => `<span class="crow">${arr.map((c) => cardHtml(c, '', `--cw:${size}px`)).join('')}</span>`;
  const CAT = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
  const best = (game, hole, board) => Eval.forGame(game, hole, board);
  const name = (e) => Eval.describe(e);

  /** Options from a right answer and wrong ones (text), shuffled, duplicates removed. */
  function choose(right, wrong, n = 4) {
    const w = [...new Set(wrong.filter((x) => x !== right))];
    const opts = shuffle([right, ...shuffle(w).slice(0, n - 1)]);
    return { opts, a: opts.indexOf(right) };
  }
  /** Numeric options around the right value: distinct, never negative, shown with show(). */
  function numeric(right, steps, show, n = 4, min = 0) {
    // The right answer lands anywhere in the (sorted) list, so its position gives nothing away.
    const st = [...new Set(steps)].sort((a, b) => a - b);
    const below = st.map((s) => right - s).filter((x) => x >= min), above = st.map((s) => right + s);
    let k = Math.floor(rnd() * n);
    k = Math.min(k, below.length);
    const vals = new Set([right, ...below.slice(0, k), ...above.slice(0, n - 1 - k)]);
    let extra = 2; while (vals.size < n) vals.add(right + st[st.length - 1] * extra++);
    const sorted = [...vals].sort((a, b) => a - b);
    const texts = sorted.map(show);
    if (new Set(texts).size !== texts.length) { const u = [...new Set(texts)]; return { opts: u, a: u.indexOf(show(right)) }; }
    return { opts: texts, a: sorted.indexOf(right) };
  }

  /** Exact chance that `hole` beats `opp` (ties count half) with the rest of the board to come. */
  function exactEquity(hole, opp, board, game = 'holdem') {
    const left = Cards.newDeck().filter((c) => ![...hole, ...opp, ...board].includes(c));
    const need = 5 - board.length;
    let w = 0, n = 0;
    const run = (b) => { const a = best(game, hole, b).score, o = best(game, opp, b).score; w += a > o ? 1 : a === o ? 0.5 : 0; n++; };
    if (need === 0) run(board);
    else if (need === 1) for (const c of left) run([...board, c]);
    else if (need === 2) for (let i = 0; i < left.length; i++) for (let j = i + 1; j < left.length; j++) run([...board, left[i], left[j]]);
    else return Learn.equity([hole, opp], board, game, 4000).eq[0];
    return w / n;
  }

  const D = [];

  /* ---------------- Hands ---------------- */
  D.push({
    id: 'winner', group: 'Reading hands', title: 'Who wins?', blurb: 'Spot the winning hand, including kickers, split pots and Omaha.',
    gen(lv) {
      if (lv === 0) {
        for (;;) {
          const d = deal(10), A = Eval.eval5(d.slice(0, 5)), B = Eval.eval5(d.slice(5));
          if (A.cat === B.cat) continue;
          const win = A.score > B.score ? 'Hand A' : 'Hand B';
          return { q: `<p>Which five-card hand is higher?</p><div class="dr-hands"><div><b>Hand A</b>${cs(d.slice(0, 5))}</div><div><b>Hand B</b>${cs(d.slice(5))}</div></div>`, opts: ['Hand A', 'Hand B'], a: win === 'Hand A' ? 0 : 1, why: `Hand A is <b>${name(A)}</b>; Hand B is <b>${name(B)}</b>. ${CAT[Math.max(A.cat, B.cat)]} beats ${CAT[Math.min(A.cat, B.cat)].toLowerCase()}.` };
        }
      }
      const omaha = lv === 3, hc = omaha ? 4 : 2, np = lv === 1 ? 2 : 3;
      for (let tries = 0; ; tries++) {
        const d = deal(5 + hc * np), board = d.slice(0, 5), holes = Array.from({ length: np }, (_, i) => d.slice(5 + i * hc, 5 + (i + 1) * hc));
        const ev = holes.map((h) => best(omaha ? 'omaha' : 'holdem', h, board));
        const top = Math.max(...ev.map((e) => e.score)), winners = ev.map((e, i) => (e.score === top ? i : -1)).filter((i) => i >= 0);
        const cats = ev.map((e) => e.cat).sort((a, b) => b - a);
        if (lv >= 2 && cats[0] !== cats[1] && tries < 60) continue;            // keep it close: same category at the top
        if (lv === 1 && winners.length === 1 && rnd() < 0.15 && tries < 40) continue; // now and then, look for a split
        const names = holes.map((_, i) => `Player ${'ABC'[i]}`);
        const opts = [...names, 'Split pot'];
        const right = winners.length > 1 ? 'Split pot' : names[winners[0]];
        return {
          q: `<p>${omaha ? '<b>Omaha</b>: each player must use <b>exactly two</b> hole cards and three from the board. ' : ''}Who wins at showdown?</p>
            <div class="dr-board"><b>Board</b>${cs(board)}</div><div class="dr-hands">${holes.map((h, i) => `<div><b>${names[i]}</b>${cs(h)}</div>`).join('')}</div>`,
          opts, a: opts.indexOf(right),
          why: holes.map((h, i) => `${names[i]}: <b>${name(ev[i])}</b> ${cs(ev[i].best, 20)}`).join('<br>') + `<br>${winners.length > 1 ? 'Their best five cards are equal, so the pot is split.' : `${names[winners[0]]} wins.`}`,
        };
      }
    },
  });

  D.push({
    id: 'name', group: 'Reading hands', title: 'Name your hand', blurb: 'Find your best five-card hand from your cards and the board.',
    gen(lv) {
      const omaha = lv === 3, hc = omaha ? 4 : 2;
      for (;;) {
        const d = deal(hc + 5), hole = d.slice(0, hc), board = d.slice(hc);
        const e = best(omaha ? 'omaha' : 'holdem', hole, board);
        if (lv <= 1 && e.cat === 0 && rnd() < 0.7) continue; // more interesting hands
        let right, wrong;
        if (lv === 0) { right = CAT[e.cat]; wrong = CAT.filter((_, i) => Math.abs(i - e.cat) <= 2); }
        else {
          right = name(e);
          const alt = [Eval.evaluate([...hole, ...board]), Eval.evaluate(board), Eval.evaluate([hole[0], ...board]), Eval.evaluate([hole[1], ...board])].map(name);
          // believable wrong answers: what other hole cards would make on this board, and easy slips
          const others = Array.from({ length: 8 }, () => name(best(omaha ? 'omaha' : 'holdem', deal(hc, [...hole, ...board]), board)));
          const r = e.ranks, tweak = [];
          if (e.cat === 2) tweak.push(`Two Pair, ${Eval.plural(r[0])} and ${Eval.plural(r[2] || 2)}`);
          if (e.cat === 6) tweak.push(`Full House, ${Eval.plural(r[1])} over ${Eval.plural(r[0])}`);
          wrong = [...tweak, ...alt, ...others];
        }
        const o = choose(right, wrong);
        if (o.opts.length < 3) continue;
        return {
          q: `<p>${omaha ? '<b>Omaha</b> (exactly two of your cards plus three from the board). ' : ''}What is your best hand?</p><div class="dr-hands"><div><b>You</b>${cs(hole)}</div><div><b>Board</b>${cs(board)}</div></div>`,
          ...o,
          why: `<b>${name(e)}</b>, using ${cs(e.best, 22)}.${omaha && Eval.evaluate([...hole, ...board]).score !== e.score ? ` Careful: in Hold'em these cards would make ${name(Eval.evaluate([...hole, ...board]))}, but Omaha forces exactly two hole cards.` : ''}`,
        };
      }
    },
  });

  D.push({
    id: 'outs', group: 'Reading hands', title: 'Count your outs', blurb: 'How many cards improve your hand? Flush draws, straight draws, combo draws, then against a shown hand.',
    gen(lv) {
      for (let tries = 0; tries < 4000; tries++) {
        const street = lv === 3 ? 4 : 3;
        const d = deal(2 + street + (lv === 3 ? 2 : 0)), hole = d.slice(0, 2), board = d.slice(2, 2 + street);
        const opp = lv === 3 ? d.slice(2 + street) : null;
        const left = Cards.newDeck().filter((c) => ![...hole, ...board, ...(opp || [])].includes(c));
        const now = Eval.evaluate([...hole, ...board]);
        let outs, target, ok;
        if (lv === 3) {
          const o = Eval.evaluate([...opp, ...board]);
          if (now.score >= o.score) continue; // you are behind now
          outs = left.filter((c) => Eval.evaluate([...hole, ...board, c]).score > Eval.evaluate([...opp, ...board, c]).score);
          ok = outs.length >= 2 && outs.length <= 16; target = `beat your opponent's ${cs(opp, 22)} on the river`;
        } else {
          const want = lv === 0 ? 5 : 4;
          if (now.cat >= want) continue;
          outs = left.filter((c) => Eval.evaluate([...hole, ...board, c]).cat >= want);
          if (lv === 0) { outs = left.filter((c) => [5, 8].includes(Eval.evaluate([...hole, ...board, c]).cat)); ok = outs.length === 9 && hole[0][1] === hole[1][1]; }
          else if (lv === 1) ok = (outs.length === 8 || outs.length === 4) && outs.every((c) => Eval.evaluate([...hole, ...board, c]).cat === 4);
          else ok = outs.length >= 12;
          target = lv === 0 ? 'make a flush' : lv === 1 ? 'make a straight' : 'make a straight or better';
        }
        if (!ok) continue;
        const n = outs.length;
        return {
          q: `<p>How many cards (outs) ${target}${lv === 3 ? '' : ' on the next card'}?</p><div class="dr-hands"><div><b>You</b>${cs(hole)}</div><div><b>Board</b>${cs(board)}</div>${opp ? `<div><b>Opponent</b>${cs(opp)}</div>` : ''}</div>`,
          ...numeric(n, [1, 2, 3, 4, 5], String, 4, 1),
          why: `<b>${n} outs</b>: ${cs(outs, 18)}${lv === 3 ? '<br>Only cards that make you <b>win</b> count: a card that helps you but helps them more is not an out.' : ''}`,
        };
      }
      return D.find((x) => x.id === 'outs').gen(Math.max(0, lv - 1));
    },
  });

  /* ---------------- Maths ---------------- */
  D.push({
    id: 'rule24', group: 'Poker maths', title: 'Odds of hitting', blurb: 'Turn outs into a chance of hitting, with the rule of 2 and 4, exact percentages and odds against.',
    gen(lv) {
      const outs = ri(lv === 0 ? 4 : 3, 15), two = lv === 1 ? rnd() < 0.5 : lv !== 3 || rnd() < 0.5;
      const exact = two ? Learn.hitTwo(outs) : Learn.hitOne(outs);
      const when = two ? 'on the flop with the turn and river to come' : 'on the turn with only the river to come';
      if (lv <= 1) {
        const est = outs * (two ? 4 : 2);
        return { q: `<p>You have <b>${outs} outs</b> ${when}. Using the rule of 2 and 4, about how likely are you to hit?</p>`, ...numeric(est, two ? [outs, outs * 2, 6] : [outs, 4, 8], (x) => `about ${x}%`),
          why: `Multiply your outs by <b>${two ? 4 : 2}</b> ${two ? 'with two cards to come' : 'with one card to come'}: ${outs} × ${two ? 4 : 2} = <b>${est}%</b>. The exact figure is ${pct(exact, 1)}.` };
      }
      if (lv === 2) {
        const right = Math.round(exact * 100);
        return { q: `<p>You have <b>${outs} outs</b> ${when}. What is the exact chance you hit?</p>`, ...numeric(right, [5, 9, 13], (x) => `${x}%`, 4, 1),
          why: two ? `Chance of missing both cards: (${47 - outs}/47) × (${46 - outs}/46). One minus that is <b>${pct(exact, 1)}</b>.` : `${outs} good cards out of 46 unseen: <b>${pct(exact, 1)}</b>.` };
      }
      const against = (1 - exact) / exact, right = Math.round(against * 10) / 10;
      return { q: `<p>You have <b>${outs} outs</b> ${when}. What are the odds <b>against</b> hitting, as "x to 1"?</p>`, ...numeric(right, [0.8, 1.5, 2.5], (x) => `${x.toFixed(1)} to 1`, 4, 0.1),
        why: `Hit ${pct(exact, 1)}, miss ${pct(1 - exact, 1)}. Miss ÷ hit = <b>${against.toFixed(1)} to 1</b>.` };
    },
  });

  D.push({
    id: 'potodds', group: 'Poker maths', title: 'Pot odds', blurb: 'How often a call has to win, from easy bet sizes to calling a raise.',
    gen(lv) {
      let pot, bet, call, story;
      if (lv === 0) { pot = pick([60, 80, 100, 120, 200]); const f = pick([[1, 2], [1, 1], [1, 3], [3, 4], [2, 1]]); bet = pot * f[0] / f[1]; call = bet; story = `The pot is <b>${fmt(pot)}</b> and your opponent bets <b>${fmt(bet)}</b>.`; }
      else if (lv === 1) { pot = ri(4, 40) * 10; bet = ri(2, Math.round(pot / 10 * 1.3)) * 10; call = bet; story = `The pot is <b>${fmt(pot)}</b> and your opponent bets <b>${fmt(bet)}</b>.`; }
      else if (lv === 2) { pot = ri(4, 30) * 10; bet = ri(2, 20) * 10; const callers = ri(1, 2); call = bet; story = `The pot is <b>${fmt(pot)}</b>. One player bets <b>${fmt(bet)}</b> and ${callers === 1 ? 'one player calls' : 'two players call'}.`; pot += bet * callers; }
      else { pot = ri(4, 20) * 10; const mine = ri(2, 10) * 10; const to = mine * pick([2.5, 3, 3.5, 4]); call = to - mine; story = `The pot was <b>${fmt(pot)}</b>. You bet <b>${fmt(mine)}</b> and your opponent raises to <b>${fmt(to)}</b>.`; pot += mine; bet = to; }
      const total = lv === 2 ? pot + bet : pot + bet; // the pot you can win once their bet is in
      const need = call / (total + call), right = Math.round(need * 100);
      return { q: `<p>${story} What share of the time must your call win to break even?</p>`, ...numeric(right, [4, 8, 12, 17], (x) => `${x}%`, 4, 1),
        why: `You call <b>${fmt(call)}</b> to win a pot of <b>${fmt(total)}</b> (everything in the middle, their bet included). ${fmt(call)} ÷ (${fmt(total)} + ${fmt(call)}) = <b>${pct(need, 1)}</b>.` };
    },
  });

  D.push({
    id: 'callfold', group: 'Poker maths', title: 'Call or fold?', blurb: 'Your opponent is all-in and shows their hand. Compare your chances with the price.',
    gen(lv) {
      const margin = [0.15, 0.08, 0.04, 0.015][lv];
      for (let tries = 0; tries < 300; tries++) {
        const street = lv <= 1 ? 4 : 3, d = deal(4 + street), hole = d.slice(0, 2), opp = d.slice(2, 4), board = d.slice(4);
        const eq = exactEquity(hole, opp, board);
        if (eq < 0.08 || eq > 0.85) continue;
        const pot = ri(5, 30) * 10;
        // pick a bet so the price sits on the chosen side of your chances, by at least the margin
        const callIt = rnd() < 0.5, need = Math.max(0.05, Math.min(0.48, eq + (callIt ? -1 : 1) * (margin + rnd() * margin)));
        if (lv >= 2 && Math.abs(need - eq) > margin * 2.5) continue;
        const bet = Math.max(10, Math.round((need * pot) / (1 - 2 * need) / 5) * 5);
        const real = bet / (pot + 2 * bet);
        if (Math.abs(real - eq) < margin * 0.7) continue;
        const right = eq > real ? 'Call' : 'Fold';
        return {
          q: `<p>The pot is <b>${fmt(pot)}</b>. Your opponent goes all-in for <b>${fmt(bet)}</b> and shows their cards. Call or fold?</p><div class="dr-hands"><div><b>You</b>${cs(hole)}</div><div><b>Opponent</b>${cs(opp)}</div><div><b>Board</b>${cs(board)}</div></div>`,
          opts: ['Call', 'Fold'], a: right === 'Call' ? 0 : 1,
          why: `You win <b>${pct(eq, 1)}</b> of the time (worked out exactly over every ${street === 3 ? 'turn and river' : 'river card'}). Calling ${fmt(bet)} to win ${fmt(pot + bet)} needs <b>${pct(real, 1)}</b>. ${right === 'Call' ? 'Your chances are better than the price: call.' : 'The price is higher than your chances: fold.'}`,
        };
      }
      return D.find((x) => x.id === 'callfold').gen(0);
    },
  });

  D.push({
    id: 'bluff', group: 'Poker maths', title: 'Bluffing maths', blurb: 'How often a bluff must work, how often to defend, and what a bluff earns.',
    gen(lv) {
      const pot = lv === 0 ? pick([50, 100, 200]) : ri(4, 40) * 10;
      const bet = lv === 0 ? pot * pick([0.5, 1, 0.25, 2]) : ri(2, 40) * 10;
      if (lv <= 1) {
        const a = bet / (pot + bet), right = Math.round(a * 100);
        return { q: `<p>You bluff <b>${fmt(bet)}</b> into a pot of <b>${fmt(pot)}</b>. How often must your opponent fold for the bluff to break even?</p>`, ...numeric(right, [5, 10, 15, 20], (x) => `${x}%`, 4, 1),
          why: `You risk ${fmt(bet)} to win ${fmt(pot)}: ${fmt(bet)} ÷ (${fmt(pot)} + ${fmt(bet)}) = <b>${pct(a, 1)}</b>.` };
      }
      if (lv === 2) {
        const m = pot / (pot + bet), right = Math.round(m * 100);
        return { q: `<p>Your opponent bets <b>${fmt(bet)}</b> into <b>${fmt(pot)}</b>. To stop them profiting with any two cards, how much of your range should you keep (call or raise)?</p>`, ...numeric(right, [6, 12, 18], (x) => `${x}%`, 4, 1),
          why: `Minimum defence frequency = pot ÷ (pot + bet) = ${fmt(pot)} ÷ ${fmt(pot + bet)} = <b>${pct(m, 1)}</b>.` };
      }
      const fold = ri(2, 8) / 10, ev = fold * pot - (1 - fold) * bet, right = Math.round(ev);
      const step = Math.max(10, Math.round((pot + bet) / 8 / 5) * 5);
      return { q: `<p>You bluff <b>${fmt(bet)}</b> into <b>${fmt(pot)}</b>. Your opponent folds <b>${pct(fold)}</b> of the time (when they call you always lose). What is the bluff worth on average?</p>`, ...numeric(right, [step, step * 2, step * 3], (x) => `${x > 0 ? '+' : ''}${U.fmt(x)}`, 4, -1e9),
        why: `${pct(fold)} × ${fmt(pot)} won − ${pct(1 - fold)} × ${fmt(bet)} lost = <b>${right > 0 ? '+' : ''}${U.fmt(right)}</b>.` };
    },
  });

  D.push({
    id: 'ev', group: 'Poker maths', title: 'Expected value', blurb: 'What a call is worth on average, then with implied odds.',
    gen(lv) {
      const pot = lv === 0 ? pick([100, 200, 300]) : ri(5, 40) * 10, call = lv === 0 ? pick([50, 100]) : ri(2, 30) * 10;
      const eq = lv === 0 ? pick([0.2, 0.25, 0.4, 0.5]) : ri(10, 60) / 100;
      const extra = lv === 3 ? ri(2, 20) * 10 : 0;
      const val = eq * (pot + extra) - (1 - eq) * call, right = Math.round(val);
      const step = Math.max(5, Math.round((pot + call) / 10 / 5) * 5);
      if (lv === 2) {
        return { q: `<p>The pot is <b>${fmt(pot)}</b> (their bet included) and it costs <b>${fmt(call)}</b> to call. You win <b>${pct(eq)}</b> of the time. Is calling profitable?</p>`,
          opts: ['Yes, calling makes money', 'No, calling loses money'], a: val > 0 ? 0 : 1,
          why: `EV = ${pct(eq)} × ${fmt(pot)} − ${pct(1 - eq)} × ${fmt(call)} = <b>${right > 0 ? '+' : ''}${U.fmt(right)}</b>. The call needs ${pct(call / (pot + call), 1)}.` };
      }
      return { q: `<p>The pot is <b>${fmt(pot)}</b> (their bet included) and it costs <b>${fmt(call)}</b> to call. You win <b>${pct(eq)}</b> of the time${extra ? `, and when you win you expect to win <b>${fmt(extra)}</b> more on later streets` : ''}. What is the call worth on average?</p>`,
        ...numeric(right, [step, step * 2, step * 3], (x) => `${x > 0 ? '+' : ''}${U.fmt(x)}`, 4, -1e9),
        why: `EV = ${pct(eq)} × ${fmt(pot + extra)} won − ${pct(1 - eq)} × ${fmt(call)} lost = <b>${right > 0 ? '+' : ''}${U.fmt(right)}</b>.` };
    },
  });

  D.push({
    id: 'combos', group: 'Poker maths', title: 'Counting combos', blurb: 'How many ways a hand can be dealt, and how the cards you see remove some.',
    gen(lv) {
      const R = 'AKQJT98765432';
      const count = (test, dead) => { const d = Cards.newDeck().filter((c) => !dead.includes(c)); let n = 0; for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) if (test(d[i], d[j])) n++; return n; };
      const pair = (r) => (a, b) => a[0] === r && b[0] === r;
      const two = (x, y, kind) => (a, b) => ((a[0] === x && b[0] === y) || (a[0] === y && b[0] === x)) && (kind === 'any' || (kind === 's') === (a[1] === b[1]));
      const label = (x, y, kind) => `${x === 'T' ? '10' : x}${y === 'T' ? '10' : y}${kind === 's' ? ' suited' : kind === 'o' ? ' offsuit' : ''}`;
      if (lv <= 1) {
        const opts = lv === 0 ? [['pair'], ['any']] : [['pair'], ['s'], ['o'], ['any']];
        const k = pick(opts)[0], x = pick(R.split('')), y = pick(R.split('').filter((c) => c !== x));
        const test = k === 'pair' ? pair(x) : two(x, y, k), what = k === 'pair' ? `a pocket pair of ${Eval.plural(Cards.rank(x + 's'))}` : label(x, y, k);
        const n = count(test, []);
        return { q: `<p>How many different ways (combos) can you be dealt <b>${what}</b>?</p>`, ...numeric(n, [2, 4, 6, 8], String, 4, 1),
          why: k === 'pair' ? 'Choose 2 of the 4 cards of that rank: 4 × 3 ÷ 2 = <b>6</b>.' : k === 's' ? 'One per suit: <b>4</b>.' : k === 'o' ? '4 × 4 = 16 pairings, minus the 4 suited ones = <b>12</b>.' : '4 × 4 = <b>16</b> (4 suited + 12 offsuit).' };
      }
      // blockers: cards you can see remove combos
      const x = pick('AKQJ'.split('')), y = pick('AKQJT'.split('').filter((c) => c !== x));
      const hands = lv === 2 ? [[`${label(x, y, 'any')}`, two(x, y, 'any')]] : [[`pocket ${Eval.plural(Cards.rank(x + 's'))}`, pair(x)], [`pocket ${Eval.plural(Cards.rank(y + 's'))}`, pair(y)], [label(x, y, 'any'), two(x, y, 'any')]];
      for (;;) {
        const seen = deal(lv === 2 ? 3 : 5);
        if (!seen.some((c) => c[0] === x || c[0] === y)) continue;
        const n = hands.reduce((s, [, t]) => s + count(t, seen), 0);
        const full = hands.reduce((s, [, t]) => s + count(t, []), 0);
        return { q: `<p>You can see these cards: ${cs(seen, 26)}<br>How many combos of <b>${hands.map((h) => h[0]).join(' + ')}</b> can your opponent still hold?</p>`, ...numeric(n, [1, 2, 3, 5], String, 4, 0),
          why: `Without blockers there would be ${full}. Each ${x === 'T' ? '10' : x} or ${y === 'T' ? '10' : y} you can see is a card they cannot have, leaving <b>${n}</b>.` };
      }
    },
  });

  /* ---------------- Rules ---------------- */
  D.push({
    id: 'potlimit', group: 'Rules', title: 'Pot-limit maximum', blurb: 'The largest bet or raise allowed in pot limit, from an empty pot to multiway raises.',
    gen(lv) {
      if (lv === 0) { const pot = ri(3, 40) * 10; return { q: `<p>Pot limit. The pot is <b>${fmt(pot)}</b> and nobody has bet. What is the most you can bet?</p>`, ...numeric(pot, [pot / 2, pot, 20], fmt, 4, 10), why: `With no bet to call, the most you can bet is the pot: <b>${fmt(pot)}</b>.` }; }
      if (lv === 1) { const pot = ri(3, 30) * 10, bet = ri(1, 20) * 10, to = pot + 3 * bet; return { q: `<p>Pot limit. The pot is <b>${fmt(pot)}</b> and your opponent bets <b>${fmt(bet)}</b>. What is the most you can raise to?</p>`, ...numeric(to, [bet, 2 * bet, 20], fmt, 4, bet * 2), why: `Call ${fmt(bet)} first (the pot becomes ${fmt(pot + 2 * bet)}), then raise by that much: ${fmt(bet)} + ${fmt(pot + 2 * bet)} = <b>${fmt(to)}</b>. Shortcut: pot + 3 × bet.` }; }
      if (lv === 2) { const bb = pick([2, 10, 20]), sb = bb / 2, to = bb + (sb + bb + bb); return { q: `<p>Pot limit, blinds <b>${sb}/${bb}</b>. You are first to act before the flop. What is the most you can raise to?</p>`, ...numeric(to, [bb, 2 * bb, sb], (x) => U.fmt(x), 4, bb * 2), why: `Call the big blind (${bb}); the pot is then ${sb} + ${bb} + ${bb} = ${sb + 2 * bb}. Raise by that: ${bb} + ${sb + 2 * bb} = <b>${to}</b> (3.5 big blinds).` }; }
      const pot = ri(3, 20) * 10, bet = ri(2, 10) * 10, callers = ri(1, 2), mine = 0;
      const middle = pot + bet * (1 + callers), to = bet + (middle + bet - mine);
      return { q: `<p>Pot limit. The pot is <b>${fmt(pot)}</b>. A player bets <b>${fmt(bet)}</b> and ${callers === 1 ? 'one player calls' : 'two players call'}. What is the most you can raise to?</p>`, ...numeric(to, [bet, 2 * bet, 3 * bet], fmt, 4, bet * 2),
        why: `Everything in the middle is ${fmt(middle)}. After your call of ${fmt(bet)} it is ${fmt(middle + bet)}; raise by that: ${fmt(bet)} + ${fmt(middle + bet)} = <b>${fmt(to)}</b>.` };
    },
  });

  D.push({
    id: 'sidepots', group: 'Rules', title: 'Side pots', blurb: 'Work out the main pot and side pots when players are all-in for different amounts.',
    gen(lv) {
      const names = ['Ann', 'Ben', 'Cat', 'Dev'];
      const n = lv === 0 ? 2 : lv === 1 ? 3 : 4;
      for (;;) {
        const amts = Array.from({ length: n }, () => ri(1, 30) * 10);
        if (new Set(amts).size < n) continue;
        const folded = amts.map(() => false);
        if (lv === 3) folded[amts.indexOf(Math.min(...amts))] = true; // someone put chips in and then folded
        let pots = Engine.computePots(amts, folded), back = null;
        // chips nobody matched are not a pot: they go straight back
        if (pots.length && pots[pots.length - 1].eligible.length === 1) { back = pots[pots.length - 1]; pots = pots.slice(0, -1); }
        if (lv >= 1 && pots.length < 2) continue;
        const story = amts.map((a, i) => `<b>${names[i]}</b> ${folded[i] ? `put in ${fmt(a)} and then folded` : `is all-in for ${fmt(a)}`}`).join(', ');
        const show = (ps) => ps.map((p, k) => `${k ? `side pot ${k}` : 'main pot'} ${U.fmt(p)}`).join(' · ');
        if (lv === 0) {
          const small = amts.indexOf(Math.min(...amts)), most = amts[small] * 2;
          return { q: `<p>${story}. What is the most <b>${names[small]}</b> can win?</p>`, ...numeric(most, [amts[small], 20, 50], fmt, 4, 10),
            why: `${names[small]} can only win what they matched from each player: ${fmt(amts[small])} × 2 = <b>${fmt(most)}</b>. The rest goes back to ${names[1 - small]}.` };
        }
        const right = pots.map((p) => p.amount);
        const wrong = [];
        const tot = U.sum(pots.map((p) => p.amount));
        wrong.push([tot]);
        wrong.push(right.map((x, i) => (i === 0 ? x + 10 * ri(1, 5) : Math.max(10, x - 10 * ri(1, 3)))));
        const live = amts.filter((_, i) => !folded[i]);
        wrong.push([Math.min(...live) * n, Math.max(10, tot - Math.min(...live) * n)]);
        wrong.push(right.slice().reverse());
        const o = choose(show(right), wrong.map(show));
        return { q: `<p>${story}. How are the pots split?</p>`, ...o,
          why: `Main pot: everyone's chips up to the smallest stack still in. Each side pot takes the next layer from the players who put in more.<br>${pots.map((p, k) => `${k ? `Side pot ${k}` : 'Main pot'} <b>${fmt(p.amount)}</b>, for ${p.eligible.map((i) => names[i]).join(', ')}`).join('<br>')}${back ? `<br>The last ${fmt(back.amount)} from ${names[back.eligible[0]]} is not matched by anyone, so it goes straight back to them.` : ''}${lv === 3 ? '<br>Folded chips stay in the pot, but the player who folded cannot win any of it.' : ''}` };
      }
    },
  });

  /* ---------------- Strategy ---------------- */
  // A common 6-handed opening guide: share of starting hands to open-raise when everyone has folded to you.
  const OPEN = [['Under the gun', 0.15], ['Hijack', 0.2], ['Cutoff', 0.27], ['Button', 0.45], ['Small blind', 0.36]];
  D.push({
    id: 'preflop', group: 'Strategy', title: 'Open or fold?', blurb: 'Everyone folds to you before the flop. Raise or fold, by position (a common 6-handed guide).',
    gen(lv) {
      const margin = [0.2, 0.1, 0.05, 0.015][lv];
      const wantRaise = rnd() < 0.5;
      for (;;) {
        const [pos, w] = pick(OPEN), hole = deal(2), p = Bots.holdemPct(hole);
        if ((p <= w) !== wantRaise) continue;
        if (Math.abs(p - w) < margin || (lv < 3 && Math.abs(p - w) > margin * 3 + 0.25)) continue;
        const right = p <= w ? 'Raise' : 'Fold';
        return { q: `<p>Six-handed, everyone has folded to you in the <b>${pos}</b>. Raise or fold?</p><div class="dr-hands"><div><b>You</b>${cs(hole)}</div></div>`, opts: ['Raise', 'Fold'], a: right === 'Raise' ? 0 : 1,
          why: `${Cards.shorthand(hole)} is in the <b>top ${pct(p)}</b> of starting hands. From the ${pos.toLowerCase()} a common guide opens about the top <b>${pct(w)}</b>, so <b>${right.toLowerCase()}</b>. The later your position, the more hands you can play, because fewer players are left to act behind you.` };
      }
    },
  });

  D.push({
    id: 'matchup', group: 'Strategy', title: 'Preflop matchups', blurb: 'Who is ahead before the flop, and by how much? Pairs, overcards, dominated hands, three-way pots.',
    gen(lv) {
      const n = lv === 3 ? 3 : 2;
      const holes = (() => { const d = deal(2 * n); return Array.from({ length: n }, (_, i) => d.slice(2 * i, 2 * i + 2)); })();
      const eq = Learn.equity(holes, [], 'holdem', 3000).eq;
      const names = ['Hand A', 'Hand B', 'Hand C'].slice(0, n);
      const q = `<div class="dr-hands">${holes.map((h, i) => `<div><b>${names[i]}</b>${cs(h)}</div>`).join('')}</div>`;
      const why = `All in before the flop: ${holes.map((h, i) => `${names[i]} wins <b>${pct(eq[i])}</b>`).join(', ')} (ties split, from 3,000 simulated boards).`;
      if (lv === 0 || lv === 3) {
        const top = eq.indexOf(Math.max(...eq));
        if (lv === 0 && Math.abs(eq[0] - eq[1]) < 0.06) return { q: `<p>All-in before the flop. Who is the favourite?</p>${q}`, opts: [...names, 'About even'], a: n, why };
        return { q: `<p>All-in before the flop. Who is the favourite?</p>${q}`, opts: names, a: top, why };
      }
      const buckets = lv === 1 ? [0.2, 0.35, 0.5, 0.65, 0.8] : [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85];
      const near = buckets.reduce((a, b) => (Math.abs(b - eq[0]) < Math.abs(a - eq[0]) ? b : a));
      const i = buckets.indexOf(near), start = Math.max(0, Math.min(i - ri(0, 3), buckets.length - 4));
      const shown = buckets.slice(start, start + 4);
      return { q: `<p>All-in before the flop. About how often does <b>Hand A</b> win?</p>${q}`, opts: shown.map((x) => `about ${pct(x)}`), a: shown.indexOf(near), why };
    },
  });

  const byId = Object.fromEntries(D.map((d) => [d.id, d]));
  const BEST = 'drillBest';
  const bestOf = (id, lv) => (Prefs.get(BEST, {})[`${id}:${lv}`] ?? null);
  const saveBest = (id, lv, score) => { const b = Prefs.get(BEST, {}); const k = `${id}:${lv}`; if (b[k] == null || score > b[k]) { b[k] = score; Prefs.set(BEST, b); return true; } return false; };
  return { LEVELS, TIMER, PER_SESSION, LIST: D, byId, bestOf, saveBest, exactEquity, numeric, choose };
})();

/* ----- Learn → Training drills: the list ----- */
function DrillsScreen(head) {
  const groups = [...new Set(Drills.LIST.map((d) => d.group))];
  App.root.innerHTML = `<div class="page"><div class="page-inner learn">${head(`${icon('calc')} Training drills`)}
    <p class="muted" style="margin-top:0">Quick-fire questions, made fresh every time and explained after each answer. Pick a drill and a level: <b>Beginner</b> and <b>Intermediate</b> are untimed, <b>Advanced</b> gives you ${Drills.TIMER[2]} seconds a question and <b>Expert</b> ${Drills.TIMER[3]}. Each round is ${Drills.PER_SESSION} questions; your best score for each level is kept on this device.</p>
    ${groups.map((g) => `<section class="lchap"><h3>${U.esc(g)}</h3><div class="dr-list">${Drills.LIST.filter((d) => d.group === g).map((d) => `<div class="card-ui dr-item"><div><b>${U.esc(d.title)}</b><p class="hint">${U.esc(d.blurb)}</p></div>
      <div class="dr-levels">${Drills.LEVELS.map((L, lv) => { const b = Drills.bestOf(d.id, lv); return `<a class="btn sm ${b === Drills.PER_SESSION ? 'primary' : ''}" href="#/learn/drill/${d.id}/${lv}">${L}${b != null ? ` <span class="dr-best">${b}/${Drills.PER_SESSION}</span>` : ''}</a>`; }).join('')}</div></div>`).join('')}</div></section>`).join('')}
  </div></div>`;
  bindThemeToggles(App.root);
  return { destroy() { document.body.classList.remove('scroll'); } };
}

/* ----- One round of a drill ----- */
function DrillScreen(id, lv, head) {
  const d = Drills.byId[id];
  lv = Math.max(0, Math.min(3, Number(lv) || 0));
  if (!d) { location.hash = '#/learn/drills'; return {}; }
  const S = { n: 0, right: 0, streak: 0, bestStreak: 0, q: null, answered: false, timer: null, dead: false };
  App.root.innerHTML = `<div class="page"><div class="page-inner learn">${head(`${U.esc(d.title)} · ${Drills.LEVELS[lv]}`)}
    <div class="dr-top"><span id="dr-count"></span><span class="grow"></span><span id="dr-streak"></span><span id="dr-score"></span></div>
    <div class="dr-time hidden"><span id="dr-tbar"></span></div>
    <section class="card-ui dr-card" id="dr-card"></section></div></div>`;
  bindThemeToggles(App.root);
  const card = $('#dr-card');
  const stopTimer = () => { clearInterval(S.timer); S.timer = null; };
  function top() {
    $('#dr-count').textContent = `Question ${Math.min(S.n + 1, Drills.PER_SESSION)} of ${Drills.PER_SESSION}`;
    $('#dr-score').textContent = `${S.right} right`;
    $('#dr-streak').textContent = S.streak >= 2 ? `🔥 ${S.streak} in a row` : '';
  }
  function next() {
    if (S.dead) return;
    if (S.n >= Drills.PER_SESSION) return finish();
    let q;
    try { q = d.gen(lv); } catch (e) { console.warn(e); q = d.gen(0); }
    S.q = q; S.answered = false;
    top();
    card.innerHTML = `<div class="dr-q">${q.q}</div><div class="dr-opts">${q.opts.map((o, i) => `<button class="btn" data-o="${i}"><kbd>${i + 1}</kbd>${U.esc(o)}</button>`).join('')}</div><div class="dr-why hidden"></div>`;
    const secs = Drills.TIMER[lv];
    $('.dr-time').classList.toggle('hidden', !secs);
    if (secs) {
      const end = Date.now() + secs * 1000, bar = $('#dr-tbar');
      stopTimer();
      S.timer = setInterval(() => {
        const left = end - Date.now();
        bar.style.width = `${Math.max(0, (100 * left) / (secs * 1000))}%`;
        bar.classList.toggle('low', left < 5000);
        if (left <= 0) answer(-1);
      }, 100);
    }
  }
  function answer(i) {
    if (S.answered || S.dead) return;
    S.answered = true; stopTimer();
    const q = S.q, ok = i === q.a;
    S.n++;
    if (ok) { S.right++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); Sound.play('chip'); } else { S.streak = 0; Sound.play('fold'); }
    $$('[data-o]', card).forEach((b) => { b.disabled = true; const k = +b.dataset.o; if (k === q.a) b.classList.add('primary'); else if (k === i) b.classList.add('danger'); else b.classList.add('dr-dim'); });
    const w = $('.dr-why', card);
    w.innerHTML = `${ok ? '<b class="ok-text">Correct.</b>' : i < 0 ? '<b class="err-text">Out of time.</b>' : '<b class="err-text">Not quite.</b>'} ${q.why}
      <div style="margin-top:12px"><button class="btn primary" id="dr-next">${S.n >= Drills.PER_SESSION ? 'See my score' : 'Next question'} <kbd>Enter</kbd></button></div>`;
    w.classList.remove('hidden');
    $('#dr-next').addEventListener('click', next);
    $('#dr-next').focus();
    top();
  }
  function finish() {
    stopTimer();
    const newBest = Drills.saveBest(id, lv, S.right), P = Drills.PER_SESSION;
    const msg = S.right === P ? 'Perfect round!' : S.right >= 8 ? 'Great work.' : S.right >= 5 ? 'Good progress. Read the explanations and go again.' : 'Keep at it: try the level below first if this felt hard.';
    if (S.right >= 8) Sound.play('win');
    card.innerHTML = `<div class="dr-end"><div class="rv-big">${S.right}<small>/${P}</small></div><h3>${msg}</h3>
      <p class="hint">Longest streak: ${S.bestStreak}${newBest ? ' · <b>New best score!</b>' : ` · Best: ${Drills.bestOf(id, lv)}/${P}`}</p>
      <div class="dr-opts"><a class="btn primary" href="#/learn/drill/${id}/${lv}" id="dr-again">${icon('history')}Go again</a>
      ${lv < 3 ? `<a class="btn" href="#/learn/drill/${id}/${lv + 1}">Try ${Drills.LEVELS[lv + 1]}</a>` : ''}
      <a class="btn" href="#/learn/drills">All drills</a></div></div>`;
    $('#dr-again').addEventListener('click', (e) => { e.preventDefault(); Object.assign(S, { n: 0, right: 0, streak: 0, bestStreak: 0 }); next(); });
  }
  card.addEventListener('click', (e) => { const b = e.target.closest('[data-o]'); if (b) answer(+b.dataset.o); });
  const onKey = (e) => {
    if ($('.modal-back')) return;
    if (S.answered && e.key === 'Enter' && $('#dr-next')) { e.preventDefault(); next(); return; }
    const k = Number(e.key);
    if (!S.answered && k >= 1 && k <= S.q.opts.length) answer(k - 1);
  };
  addEventListener('keydown', onKey);
  next();
  window.scrollTo(0, 0);
  return { destroy() { S.dead = true; stopTimer(); removeEventListener('keydown', onKey); document.body.classList.remove('scroll'); } };
}

/* =====================================================================
   7i. PRACTICE SCENARIOS  (Learn → Practice scenarios)
   The same kind of spot, dealt again and again against bots. Each scenario fixes the
   table (players, stacks, position, opponents' styles) and, where it matters, what
   happened before your first decision; the cards are new every time. After each hand
   every decision you made is graded the same way as the hand review.
   ===================================================================== */
const Scenarios = (() => {
  const R = 'AKQJT98765432';
  const rk = Cards.rank;
  const topPct = (w) => (h) => Bots.holdemPct(h) <= w;
  const suited = (h) => h[0][1] === h[1][1];
  const pairOf = (lo, hi) => (h) => h[0][0] === h[1][0] && rk(h[0]) >= lo && rk(h[0]) <= hi;
  const flush4 = (hole, b) => { const s = hole[0][1]; return suited(hole) && b.filter((c) => c[1] === s).length === 2; };
  const best = (cs) => Eval.evaluate(cs);
  /*
   * n: players · hero: position · bb: stacks in big blinds (hero, others) · start: street of your first decision
   * pre: what happens before you act ({ raiser, to (in bb), callers }), opp: bots' level and style(s)
   * hole(hole) / flop(hole, board): conditions on your cards and the board
   */
  const LIST = [
    { id: 'steal', group: 'Before the flop', title: 'Button steal', blurb: 'Everyone folds to you on the button with 100 big blinds. Raise to steal the blinds, or let weak hands go?', n: 6, hero: 'BTN', bb: [100, 100], start: 0, opp: ['extreme', 'balanced'] },
    { id: 'bbdefend', group: 'Before the flop', title: 'Defending the big blind', blurb: 'The button raises to 2.5 big blinds and it is up to you in the big blind: fold, call or re-raise.', n: 6, hero: 'BB', bb: [100, 100], start: 0, pre: { raiser: 'BTN', to: 2.5 }, opp: ['extreme', 'looseaggr'] },
    { id: 'pushfold', group: 'Before the flop', title: 'Push or fold (10 big blinds)', blurb: 'Tournament endgame: 10 big blinds left, folded to you in the small blind. All-in or fold.', n: 6, hero: 'SB', bb: [10, 30], start: 0, opp: ['extreme', 'balanced'] },
    { id: 'short', group: 'Before the flop', title: 'Short stack (20 big blinds)', blurb: 'You have 20 big blinds in the cutoff. Pick your spots before the blinds eat you.', n: 6, hero: 'CO', bb: [20, 60], start: 0, opp: ['extreme', 'balanced'] },
    { id: 'threebet', group: 'Before the flop', title: 'Facing an open: 3-bet or not?', blurb: 'The cutoff raises to 3 big blinds; you are on the button with a strong hand.', n: 6, hero: 'BTN', bb: [100, 100], start: 0, pre: { raiser: 'CO', to: 3 }, hole: topPct(0.2), opp: ['extreme', 'tightaggr'] },
    { id: 'setmine', group: 'Before the flop', title: 'Small pairs: set mining', blurb: 'Early position raises; you hold a small pair. Call to hit a set, or fold?', n: 6, hero: 'CO', bb: [100, 100], start: 0, pre: { raiser: 'UTG', to: 3 }, hole: pairOf(2, 8), opp: ['extreme', 'tightpassive'] },
    { id: 'flushdraw', group: 'After the flop', title: 'Playing a flush draw', blurb: 'You called a raise from the big blind and flopped a flush draw. Check, bet or raise it?', n: 6, hero: 'BB', bb: [100, 100], start: 1, pre: { raiser: 'BTN', to: 2.5, callers: ['BB'] }, hole: suited, flop: (h, b) => flush4(h, b) && best([...h, ...b]).cat === 0, opp: ['extreme', 'balanced'] },
    { id: 'toppair', group: 'After the flop', title: 'Top pair against an aggressive player', blurb: 'You raised on the button and flopped top pair. The big blind is a loose-aggressive player.', n: 6, hero: 'BTN', bb: [100, 100], start: 1, pre: { raiser: 'BTN', to: 2.5, callers: ['BB'] }, hole: topPct(0.45), flop: (h, b) => { const e = best([...h, ...b]); return e.cat === 1 && e.ranks[0] === Math.max(...b.map(rk)) && h.some((c) => rk(c) === e.ranks[0]); }, opp: ['extreme', 'looseaggr'] },
    { id: 'overpair', group: 'After the flop', title: 'Overpair on a scary board', blurb: 'You have a pocket pair bigger than every board card, but the flop has straight and flush possibilities.', n: 6, hero: 'CO', bb: [100, 100], start: 1, pre: { raiser: 'CO', to: 2.5, callers: ['BB'] }, hole: pairOf(9, 14), flop: (h, b) => b.every((c) => rk(c) < rk(h[0])) && (Bots.analyzeBoard(b).wetness > 0.45), opp: ['extreme', 'balanced'] },
    { id: 'multiway', group: 'After the flop', title: 'Multiway pot with middle pair', blurb: 'Four players limped and the flop gives you middle pair. Careful: more players means stronger hands.', n: 6, hero: 'BB', bb: [100, 100], start: 1, pre: { callers: ['HJ', 'CO', 'BTN', 'SB', 'BB'] }, flop: (h, b) => { const e = best([...h, ...b]), r = b.map(rk).sort((x, y) => y - x); return e.cat === 1 && e.ranks[0] === r[1] && h.some((c) => rk(c) === r[1]); }, opp: ['advanced', 'loosepassive'] },
    { id: 'bluffcatch', group: 'After the flop', title: 'River bluff catcher', blurb: 'It is checked to the river and you hold one pair. Your opponent bluffs a lot. Call their bet, or fold?', n: 2, hero: 'BB', bb: [100, 100], start: 3, pre: { callers: ['BTN', 'BB'] }, flop: (h, b, full) => best([...h, ...full]).cat === 1, opp: ['extreme', 'maniac'] },
    { id: 'headsup', group: 'Whole hands', title: 'Heads-up, 50 big blinds', blurb: 'One opponent, every hand from the start. The Elite bot plays a balanced style.', n: 2, hero: 'BTN', bb: [50, 50], start: 0, opp: ['elite', 'balanced'], anyPos: true },
    { id: 'station', group: 'Whole hands', title: 'Beating a calling station', blurb: 'Three-handed against players who call too much. Bet your good hands for value and stop bluffing.', n: 3, hero: 'BTN', bb: [60, 60], start: 0, opp: ['intermediate', 'loosepassive'], anyPos: true },
    { id: 'maniac', group: 'Whole hands', title: 'Surviving a maniac', blurb: 'Three-handed against wildly aggressive players. Tighten up and let them bluff into you.', n: 3, hero: 'BTN', bb: [60, 60], start: 0, opp: ['advanced', 'maniac'], anyPos: true },
    { id: 'plo', group: 'Whole hands', title: 'Pot-limit Omaha', blurb: 'Four-handed PLO with 100 big blinds. Hands run closer, and the nuts matter more.', n: 4, hero: 'BTN', bb: [100, 100], start: 0, game: 'omaha', limit: 'pl', opp: ['advanced', 'balanced'], anyPos: true },
  ];
  /** Seat index of a position name, with the button at seat 0. */
  function seatOf(n, pos) {
    if (n === 2) return pos === 'BB' ? 1 : 0;
    const mid = n - 3, tail = ['HJ', 'CO'].slice(-Math.min(2, mid)), lead = mid > 2 ? ['UTG', ...new Array(mid - 3).fill('MP')] : [];
    const names = ['BTN', 'SB', 'BB', ...lead, ...tail];
    const map = { BTN: 0, SB: 1, BB: 2 };
    if (pos in map) return map[pos];
    const k = names.indexOf(pos);
    return k >= 0 ? k : n - 1;
  }
  /** A new deal for a scenario: who sits where, your cards and the whole board, matching its conditions. */
  function setup(sc) {
    const n = sc.n, hero = sc.anyPos ? Math.floor(Math.random() * n) : seatOf(n, sc.hero), hc = sc.game === 'omaha' ? 4 : 2;
    for (let tries = 0; tries < 20000; tries++) {
      const d = Cards.shuffle(Cards.newDeck());
      const holes = Array.from({ length: n }, (_, i) => d.slice(i * hc, (i + 1) * hc)), board = d.slice(n * hc, n * hc + 5);
      if (sc.hole && !sc.hole(holes[hero])) continue;
      if (sc.flop && !sc.flop(holes[hero], board.slice(0, 3), board)) continue;
      return { hero, holes, board };
    }
    throw new Error('Could not deal this scenario');
  }
  return { LIST, byId: Object.fromEntries(LIST.map((s) => [s.id, s])), seatOf, setup };
})();

function ScenariosScreen(head) {
  const groups = [...new Set(Scenarios.LIST.map((s) => s.group))];
  const stats = Prefs.get('scenarioStats', {});
  App.root.innerHTML = `<div class="page"><div class="page-inner learn">${head(`${icon('play')} Practice scenarios`)}
    <p class="muted" style="margin-top:0">Pick a spot and play it as many times as you like against bots. The table and the story stay the same, the cards are new every time. After each hand, every decision you made is graded with a short explanation.</p>
    ${groups.map((g) => `<section class="lchap"><h3>${U.esc(g)}</h3><div class="llist">${Scenarios.LIST.filter((s) => s.group === g).map((s) => { const st = stats[s.id]; return `<a class="litem sc-item" href="#/learn/scenario/${s.id}"><span><b>${U.esc(s.title)}</b><span class="hint" style="display:block">${U.esc(s.blurb)}</span>${st ? `<span class="hint" style="display:block">You: ${st.hands} hand${st.hands === 1 ? '' : 's'}, ${st.net >= 0 ? '+' : ''}${(st.net).toFixed(1)} big blinds${st.graded ? `, ${Math.round((100 * st.good) / st.graded)}% good decisions` : ''}</span>` : ''}</span>${icon('chevron')}</a>`; }).join('')}</div></section>`).join('')}
  </div></div>`;
  bindThemeToggles(App.root);
  return { destroy() { document.body.classList.remove('scroll'); } };
}

function ScenarioScreen(id, head) {
  const sc = Scenarios.byId[id];
  if (!sc) { location.hash = '#/learn/scenarios'; return {}; }
  document.body.classList.remove('scroll');
  App.root.innerHTML = `<div class="page"><div class="page-inner learn sc-page">${head(U.esc(sc.title))}
    <p class="hint" style="margin:-10px 0 10px">${U.esc(sc.blurb)}</p>
    <div class="table-stage sc-stage" id="sc-stage"></div>
    <div class="action-bar sc-bar" id="sc-bar"></div>
    <div class="sc-info"><div class="sc-tally" id="sc-tally"></div><div id="sc-feedback"></div></div>
  </div></div>`;
  bindThemeToggles(App.root);
  const table = new TableView($('#sc-stage'), { mobileHeight: (w) => Math.round(Math.max(360, Math.min(innerHeight * 0.58, w * 1.35))) });
  const bar = $('#sc-bar');
  const S = { h: null, hero: 0, board: [], spots: [], no: 0, dead: false, busy: false, raise: null };
  const all = Prefs.get('scenarioStats', {});
  const T = all[id] || (all[id] = { hands: 0, net: 0, good: 0, close: 0, mistake: 0, graded: 0 });
  const me = U.sanitizeName(Prefs.get('name', '')) || 'Hero';
  const names = Cards.shuffle(Bots.NAMES.filter((x) => x !== me));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function view() {
    const h = S.h, done = h.phase === 'done';
    const cur = {};
    for (const e of h.log) if (e.t === 'act' && e.street === h.street) cur[e.p] = e;
    const wins = {};
    if (done) h.log.filter((e) => e.t === 'win').forEach((e) => { wins[e.p] = (wins[e.p] || 0) + e.amt; });
    const winCards = new Set();
    if (done && h.results.showdown) h.results.pots.forEach((pt) => pt.winners.forEach((w) => { const ev = h.results.evals[w]; if (ev) ev.best.forEach((c) => winCards.add(c)); }));
    const ps = !done ? Engine.collectedPots(h) : [];
    return {
      maxSeats: h.players.length, mySeat: S.hero, handKey: `s${S.no}`, readOnly: false, canSit: false, feltText: sc.title,
      seats: h.players.map((p, i) => {
        const mine = i === S.hero, open = mine || (done && p.shown);
        return {
          seat: i, name: p.name, stack: p.stack, bet: done ? 0 : p.bet, isBot: !mine, botLabel: mine ? null : Bots.LABELS[sc.opp[0]],
          cards: p.folded && !mine ? null : open ? p.hole.slice() : new Array(h.holeCount).fill(null),
          folded: p.folded, allIn: p.allIn && !done, button: i === h.button, sb: i === h.sbIdx && h.street === 0 && !done, bb: i === h.bbIdx && h.street === 0 && !done,
          toAct: h.phase === 'betting' && h.toAct === i, won: wins[i] || 0, shown: open, isYou: mine,
          handName: open && !p.folded && h.board.length >= 3 ? Eval.describe(Eval.forGame(h.game, p.hole, h.board)) : null,
          lastAction: cur[i] ? cur[i].type : null,
        };
      }),
      board: h.board.slice(), street: done ? (h.results.showdown ? 'Showdown' : STREETS[h.street]) : STREETS[h.street],
      pots: ps.map((pt, k) => ({ label: ps.length > 1 ? (k === 0 ? 'Main' : `Side ${k}`) : 'Pot', amount: pt.amount })),
      results: done ? { winCards: [...winCards], lines: h.log.filter((e) => e.t === 'win').map((e) => Engine.describeEntry(h, e)) } : null,
      timer: null,
    };
  }
  const draw = (animate = true) => { if (!S.dead) table.render(view(), { animate }); };

  function tally() {
    const g = T.graded;
    $('#sc-tally').innerHTML = `<div class="summary">
      <div class="sum-tile"><b>${T.hands}</b><span>Hands played</span></div>
      <div class="sum-tile"><b class="${T.net > 0 ? 'net-pos' : T.net < 0 ? 'net-neg' : ''}">${T.net >= 0 ? '+' : ''}${T.net.toFixed(1)}</b><span>Big blinds won</span></div>
      <div class="sum-tile"><b>${g ? Math.round((100 * T.good) / g) + '%' : '–'}</b><span>Good decisions</span></div>
      <div class="sum-tile"><b>${T.mistake}</b><span>Mistakes</span></div></div>
      <button class="btn sm ghost" id="sc-reset" style="margin-top:8px">Reset these numbers</button>`;
    $('#sc-reset').addEventListener('click', () => { Object.assign(T, { hands: 0, net: 0, good: 0, close: 0, mistake: 0, graded: 0 }); Prefs.set('scenarioStats', all); tally(); });
  }

  /** Bots: the level and style the scenario names; the first style for everyone (two styles: they alternate). */
  function botAct() {
    const h = S.h, i = h.toAct, p = h.players[i];
    const ctx = Bots.contextFor(h, i, { difficulty: sc.opp[0], personality: p.style, traits: p.traits, work: 0.6 });
    return Bots.decideAsync(ctx).then((a) => { try { Engine.applyAction(h, a); } catch { const L = Engine.legal(h); Engine.applyAction(h, { type: L.canCheck ? 'check' : 'call' }); } });
  }
  /** The scripted story before your first decision. */
  function scripted(i) {
    const h = S.h, L = Engine.legal(h), pre = sc.pre || {}, pos = (name) => Scenarios.seatOf(sc.n, name);
    const inHand = (pre.callers || []).map(pos), raiser = pre.raiser ? pos(pre.raiser) : -1;
    if (h.street > 0) return { type: L.canCheck ? 'check' : 'call' };
    if (i === raiser && h.currentBet === h.bb) return { type: 'raise', to: Math.round(pre.to * h.bb) };
    if (i === raiser || inHand.includes(i)) return { type: L.canCheck ? 'check' : 'call' };
    return { type: L.canCheck ? 'check' : 'fold' };
  }
  /** Still inside the scenario's story (the scripted part before your first real decision)? */
  function story() {
    const h = S.h;
    if (S.storyDone || sc.anyPos) return false;
    if (sc.start > 0 ? h.street >= sc.start : h.toAct === S.hero) { S.storyDone = true; return false; }
    return true;
  }

  async function deal() {
    if (S.dead) return;
    S.no++;
    const st = Scenarios.setup(sc);
    S.hero = st.hero; S.board = st.board.slice(); S.spots = []; S.storyDone = false;
    const BB = 2, players = Array.from({ length: sc.n }, (_, i) => ({ name: i === S.hero ? me : names[i % names.length], stack: (i === S.hero ? sc.bb[0] : sc.bb[1]) * BB }));
    S.h = Engine.createHand({ no: S.no, players, button: 0, sb: BB / 2, bb: BB, hole: st.holes, game: sc.game || 'holdem', limit: sc.limit || 'nl', holeCount: sc.game === 'omaha' ? 4 : 2 });
    S.h.players.forEach((p, i) => { if (i !== S.hero) { p.style = sc.opp[1]; p.traits = Bots.makeTraits(sc.opp[1]); } });
    $('#sc-feedback').innerHTML = '';
    draw();
    await run();
  }

  async function run() {
    const h = S.h;
    while (!S.dead) {
      if (h.phase === 'betting') {
        const i = h.toAct, pre = story();
        if (i === S.hero && !pre) { renderBar(); return; }
        renderBar();
        await wait(pre ? 160 : 520);
        if (S.dead) return;
        if (pre) { try { Engine.applyAction(h, scripted(i)); } catch { const L = Engine.legal(h); Engine.applyAction(h, { type: L.canCheck ? 'check' : 'call' }); } }
        else await botAct();
      } else if (h.phase === 'deal') {
        await wait(260);
        const k = h.board.length;
        Engine.dealBoard(h, S.board.slice(k, k + h.pendingDeal));
      } else if (h.phase === 'showdown') { await wait(300); Engine.settle(h, Engine.planShowdown(h, () => false)); }
      else if (h.phase === 'settle') Engine.settle(h);
      else if (h.phase === 'done') { draw(); return finish(); }
      draw();
    }
  }

  function heroAct(a) {
    const h = S.h;
    if (S.busy || h.phase !== 'betting' || h.toAct !== S.hero) return;
    const snap = U.clone(h);
    snap.players.forEach((p, j) => { if (j !== S.hero) { p.hole = null; p.shown = false; } });
    try { Engine.applyAction(h, a); } catch (e) { return toast(e.message, 'error'); }
    const e = h.log[h.log.length - 1];
    S.spots.push({ no: S.no, hand: snap, i: S.hero, act: { type: e.type, to: e.to }, prior: [] });
    draw();
    renderBar();
    run();
  }

  async function finish() {
    const h = S.h, me = h.players[S.hero], net = (me.stack - me.startStack) / h.bb;
    T.hands++; T.net += net; Prefs.set('scenarioStats', all);
    renderBar();
    const fb = $('#sc-feedback');
    fb.innerHTML = `<p><b>${net > 0 ? `You won ${net.toFixed(1)} big blinds.` : net < 0 ? `You lost ${(-net).toFixed(1)} big blinds.` : 'You broke even.'}</b> ${S.spots.length ? 'Checking your decisions…' : 'You had no decisions to make in this hand (everything before your turn is part of the scenario).'}</p>`;
    if (net > 0) Sound.play('win');
    const items = [];
    for (const sp of S.spots) {
      if (S.dead || S.h !== h) return;
      try { items.push(await HandReview.analyse(sp, { work: 0.5 })); } catch (e) { console.warn('scenario review', e); }
    }
    if (S.dead || S.h !== h) return; // "Deal again" was pressed while the review was running
    for (const x of items) { T.graded++; T[x.grade === 'good' ? 'good' : x.grade === 'close' ? 'close' : 'mistake']++; }
    Prefs.set('scenarioStats', all);
    tally();
    const G = { good: ['Good', 'rv-good'], close: ['Close', 'rv-close'], mistake: ['Mistake', 'rv-bad'] };
    const did = (x) => `${{ fold: 'Fold', check: 'Check', call: 'Call', raise: x.did.type === 'b' ? 'Bet' : 'Raise' }[x.mine]}${x.mine === 'raise' && x.did.to ? ' to ' + U.fmt(x.did.to) : ''}`;
    if (items.length) fb.innerHTML = fb.innerHTML.replace('Checking your decisions…', 'Your decisions:') + items.map((x) => `<div class="rv-spot"><div class="rv-head"><span class="rv-tag ${G[x.grade][1]}">${G[x.grade][0]}</span><b>${STREETS[x.street]}</b><span class="grow"></span><span class="hint">You: <b>${did(x)}</b></span></div><p>${U.esc(x.why)}</p><p class="hint">${x.facts.map(U.esc).join(' ')}</p></div>`).join('');
  }

  function renderBar() {
    const h = S.h;
    if (!h) return;
    if (h.phase === 'done') { bar.innerHTML = `<div class="ab-msg"><button class="btn primary lg" id="sc-next">${icon('play')}Deal again <kbd>Enter</kbd></button><a class="btn" href="#/learn/scenarios">Other scenarios</a></div>`; $('#sc-next').addEventListener('click', deal); return; }
    if (h.phase !== 'betting' || h.toAct !== S.hero || !S.storyDone && !sc.anyPos) { bar.innerHTML = `<div class="ab-msg"><div class="spinner" style="width:20px;height:20px;border-width:2px"></div>${!S.storyDone && !sc.anyPos ? 'Setting up the scenario…' : 'Waiting for the other players…'}</div>`; return; }
    const L = Engine.legal(h);
    const cl = (x) => Math.max(L.minTo, Math.min(L.maxTo, Math.round(x)));
    const pot = L.pot + L.toCall, base = L.myBet + L.toCall;
    const sizes = [['½ pot', cl(base + pot / 2)], ['¾ pot', cl(base + (pot * 3) / 4)], ['Pot', cl(base + pot)], ...(L.capped ? [] : [['All-in', L.maxTo]])];
    if (S.raise == null || S.raise < L.minTo || S.raise > L.maxTo) S.raise = L.minTo;
    bar.innerHTML = `<div class="ab-wrap">
      ${L.canRaise && L.maxTo > L.minTo ? `<div class="ab-raise"><div class="quick">${sizes.map(([l, v]) => `<button class="btn sm" data-q="${v}">${l}</button>`).join('')}</div>
        <div class="slider-row"><input type="range" id="sc-range" min="${L.minTo}" max="${L.maxTo}" step="1" value="${S.raise}" aria-label="Bet amount"><input class="input amt-input" id="sc-amt" type="number" min="${L.minTo}" max="${L.maxTo}" value="${S.raise}" aria-label="Bet amount"></div></div>` : ''}
      <div class="ab-buttons"><button class="act fold" data-a="fold">Fold<small>F</small></button>
        <button class="act call" data-a="${L.canCheck ? 'check' : 'call'}">${L.canCheck ? 'Check' : `${L.toCall >= L.stack ? 'All-in' : 'Call'} ${U.fmt(L.toCall)}`}<small>C</small></button>
        ${L.canRaise ? `<button class="act raise" data-a="raise" id="sc-raise">${L.isBet ? 'Bet' : 'Raise to'} ${U.fmt(S.raise)}<small>R</small></button>` : ''}</div></div>`;
  }
  const setRaise = (x) => {
    const L = Engine.legal(S.h); if (!L) return;
    S.raise = Math.max(L.minTo, Math.min(L.maxTo, Math.round(Number(x) || L.minTo)));
    const r = $('#sc-range'), i = $('#sc-amt'), b = $('#sc-raise');
    if (r) r.value = S.raise; if (i) i.value = S.raise;
    if (b) b.innerHTML = `${S.raise === L.maxTo && !L.capped ? 'All-in' : L.isBet ? 'Bet' : 'Raise to'} ${U.fmt(S.raise)}<small>R</small>`;
  };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.q) return setRaise(b.dataset.q);
    const a = b.dataset.a; if (!a) return;
    if (a === 'raise') { const L = Engine.legal(S.h); heroAct({ type: L.isBet ? 'bet' : 'raise', to: S.raise }); }
    else heroAct({ type: a });
  });
  bar.addEventListener('input', (e) => { if (e.target.id === 'sc-range' || e.target.id === 'sc-amt') setRaise(e.target.value); });
  const onKey = (e) => {
    if ($('.modal-back') || /INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'range') return;
    const h = S.h; if (!h) return;
    if (h.phase === 'done' && e.key === 'Enter') { e.preventDefault(); deal(); return; }
    if (h.phase !== 'betting' || h.toAct !== S.hero) return;
    const L = Engine.legal(h), k = e.key.toLowerCase();
    if (k === 'f') heroAct({ type: L.canCheck ? 'check' : 'fold' });
    else if (k === 'c') heroAct({ type: L.canCheck ? 'check' : 'call' });
    else if (k === 'r' && L.canRaise) heroAct({ type: L.isBet ? 'bet' : 'raise', to: S.raise });
  };
  addEventListener('keydown', onKey);
  tally();
  deal().catch((e) => { $('#sc-feedback').innerHTML = `<div class="err-box">${icon('alert')}<div>${U.esc(e.message)}</div></div>`; });
  return { destroy() { S.dead = true; removeEventListener('keydown', onKey); table.destroy(); } };
}
