
/* =====================================================================
   9. LEARN POKER  (#/learn): lessons from the rules to the maths, each
   with worked examples and a short quiz, plus calculators. Hand names,
   pots, raise limits and probabilities in the examples are computed by
   the same engine the game uses, so they can't disagree with the table.
   ===================================================================== */
const Learn = (() => {
  // ---------- small maths helpers (also used by the calculators) ----------
  const C = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
  const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
  const hitTwo = (outs) => 1 - C(47 - outs, 2) / C(47, 2); // flop to river, two cards to come
  const hitOne = (outs, unseen = 46) => outs / unseen;       // one card to come
  const potOdds = (pot, call) => call / (pot + call);         // pot already includes the bet you face
  const ev = (eq, pot, call) => eq * pot - (1 - eq) * call;   // EV of calling: win the pot, or lose the call
  const alpha = (pot, bet) => bet / (pot + bet);              // how often a bluff must work
  const mdf = (pot, bet) => pot / (pot + bet);                // how often you must continue vs a bet
  const fmt = (x) => U.fmt(Math.round(x * 100) / 100);

  /** Monte Carlo equity of two or more Hold'em/Omaha hands, optionally with some board cards. */
  function equity(hands, board = [], game = 'holdem', iters = 20000) {
    const dead = new Set([...hands.flat(), ...board]);
    const deck = Cards.newDeck().filter((c) => !dead.has(c));
    const wins = hands.map(() => 0); let ties = 0;
    const need = 5 - board.length;
    for (let it = 0; it < iters; it++) {
      // partial Fisher–Yates for the cards we need (simulation only: Math.random is fine here)
      for (let i = 0; i < need; i++) { const j = i + Math.floor(Math.random() * (deck.length - i)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      const b = board.concat(deck.slice(0, need));
      const sc = hands.map((h) => Eval.forGame(game, h, b).score);
      const best = Math.max(...sc), w = sc.filter((s) => s === best).length;
      if (w > 1) ties++;
      sc.forEach((s, i) => { if (s === best) wins[i] += 1 / w; });
    }
    return { eq: wins.map((x) => x / iters), tie: ties / iters, iters };
  }

  // ---------- content helpers ----------
  const cards = (s, size = 34) => `<span class="crow">${s.split(/\s+/).filter(Boolean).map((c) => (c === '?' ? cardHtml(null, '', `--cw:${size}px`) : cardHtml(c, '', `--cw:${size}px`))).join('')}</span>`;
  const hand = (hole, board, game = 'holdem', label = '') => {
    const e = Eval.forGame(game, hole.split(' '), board.split(' '));
    return `<div class="lhand">${label ? `<b>${label}</b>` : ''}${cards(hole)}<span class="muted">+</span>${cards(board, 30)}<span class="lres">= ${U.esc(Eval.describe(e))}</span><span class="lbest">best five: ${cards(e.best.join(' '), 26)}</span></div>`;
  };
  const rule = (h) => `<div class="lrule"><b>Rule</b><div>${h}</div></div>`;
  const formula = (h, note = '') => `<div class="lform"><code>${h}</code>${note ? `<span>${note}</span>` : ''}</div>`;
  const ex = (title, h) => `<div class="lex"><div class="lex-t">${icon('play')} Example: ${title}</div>${h}</div>`;
  const tip = (h) => `<div class="ltip"><b>Tip</b> ${h}</div>`;
  const table = (head, rows) => `<div class="ltable-wrap"><table class="ltable"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  // ---------- the course ----------
  const CHAPTERS = [
    { id: 'basics', title: 'The basics', blurb: 'Cards, hands and how a hand of poker is played.' },
    { id: 'rules', title: 'Rules in depth', blurb: 'Raises, all-ins, side pots, showdowns, pot limit and Omaha.' },
    { id: 'math', title: 'Poker maths', blurb: 'Outs, odds, expected value, bet sizes and combinations.' },
    { id: 'strategy', title: 'Putting it together', blurb: 'Position, starting hands and stack sizes.' },
  ];

  const L = [];
  const lesson = (o) => L.push(o);

  /* ===== 1. Basics ===== */
  lesson({
    id: 'deck', ch: 'basics', title: 'The deck and the goal',
    body: () => `
      <p>Poker uses a standard <b>52-card deck</b>: 13 ranks in each of 4 suits. From lowest to highest the ranks are
      2, 3, 4, 5, 6, 7, 8, 9, 10 (written <b>T</b>), Jack, Queen, King, Ace. Suits (♠ spades, ♥ hearts, ♦ diamonds, ♣ clubs) are all equal: no suit beats another.</p>
      ${cards('2c 5d 9h Ts Jc Qd Kh As')}
      ${rule('You win a hand in one of two ways: <b>everyone else folds</b>, or you have the <b>best five-card hand at the showdown</b>.')}
      <p>Card names in this app use a rank and a suit letter: <code>As</code> is the ace of spades, <code>Td</code> the ten of diamonds, <code>7c</code> the seven of clubs.</p>
      ${ex('reading cards', `<p>${cards('Ah Kh')} is "ace-king of hearts", written <code>AhKh</code>, or <b>AKs</b> for short (s = suited). ${cards('Qs Qd')} is a pair of queens, <b>QQ</b>. ${cards('Jc 9d')} is <b>J9o</b> (o = offsuit).</p>`)}
      ${tip('An ace can also play low, but only in the straight A-2-3-4-5 (the "wheel").')}`,
    quiz: [
      { q: 'How many cards are in a poker deck?', opts: ['48', '52', '54'], a: 1, why: '13 ranks × 4 suits = 52. No jokers.' },
      { q: 'Which suit is highest?', opts: ['Spades', 'Hearts', 'None: suits are equal'], a: 2, why: 'In Hold\'em and Omaha suits never break ties. Equal hands split the pot.' },
    ],
  });

  lesson({
    id: 'rankings', ch: 'basics', title: 'Hand rankings',
    body: () => {
      const rows = [
        ['Royal flush', 'As Ks Qs Js Ts', 'A-K-Q-J-T all one suit', 4],
        ['Straight flush', '9h 8h 7h 6h 5h', 'Five in a row, one suit', 36],
        ['Four of a kind', 'Qc Qd Qh Qs 7d', 'Four cards of one rank', 624],
        ['Full house', 'Kc Kd Kh 4s 4d', 'Three of a kind plus a pair', 3744],
        ['Flush', 'Ad Jd 8d 6d 2d', 'Five of one suit', 5108],
        ['Straight', 'Tc 9d 8s 7h 6c', 'Five in a row, mixed suits', 10200],
        ['Three of a kind', '7c 7d 7s Kh 2c', 'Three cards of one rank', 54912],
        ['Two pair', 'Jh Jc 4d 4s As', 'Two different pairs', 123552],
        ['One pair', 'Th Tc Ks 8d 3h', 'Two cards of one rank', 1098240],
        ['High card', 'Ah Qc 9d 6s 3c', 'None of the above', 1302540],
      ];
      const total = C(52, 5);
      return `<p>Every poker hand is exactly <b>five cards</b>. From best to worst:</p>
      ${table(['Hand', 'Example', 'What it is', 'Ways to make it', 'Chance in 5 cards'], rows.map(([n, c, d, k]) => [`<b>${n}</b>`, cards(c, 26), d, U.fmt(k), pct(k / total, 4)]))}
      ${formula(`C(52, 5) = 52! ÷ (5! × 47!) = ${U.fmt(total)}`, 'different five-card hands; each row counts how many of them make that hand')}
      ${ex('why a flush beats a straight', `<p>There are ${U.fmt(10200)} straights but only ${U.fmt(5108)} flushes. Rarer hands rank higher. Counting flushes: ${formula('4 suits × C(13, 5) − 40 straight flushes = 4 × 1,287 − 40 = 5,108')}</p>`)}
      ${ex('the wheel', `<p>${cards('5s 4d 3h 2c Ac')} is a straight, <b>${U.esc(Eval.describe(Eval.evaluate(['5s', '4d', '3h', '2c', 'Ac'])))}</b>: the ace plays low. It is the lowest straight; ${cards('6s 5s 4d 3h 2c', 26)} beats it.</p>`)}
      ${tip('Straights do not "wrap around": Q-K-A-2-3 is not a straight.')}`;
    },
    quiz: [
      { q: 'Which hand is better?', opts: ['Full house', 'Flush'], a: 0, why: 'Full house ranks above a flush (3,744 ways versus 5,108).' },
      { q: 'Is K-A-2-3-4 a straight?', opts: ['Yes', 'No'], a: 1, why: 'Straights don\'t wrap. The ace is high (10-J-Q-K-A) or low (A-2-3-4-5), never in the middle.' },
      { q: 'Which is more common in five cards?', opts: ['Two pair', 'Three of a kind'], a: 0, why: 'Two pair: 123,552 ways. Three of a kind: 54,912. Rarer = stronger, so trips beat two pair.' },
    ],
  });

  lesson({
    id: 'flow', ch: 'basics', title: 'How a hand of Hold\'em is played',
    body: () => `
      <p>Each hand has up to <b>four betting rounds</b>. The <b>button</b> (dealer marker) moves one seat to the left every hand.</p>
      <ol class="lsteps">
        <li><b>Blinds.</b> The two players left of the button post forced bets: the <b>small blind</b> and the <b>big blind</b>. They make sure there's something to win.</li>
        <li><b>Preflop.</b> Everyone gets two face-down <b>hole cards</b>. Betting starts with the player left of the big blind.</li>
        <li><b>Flop.</b> Three shared <b>community cards</b> are dealt face up. Betting starts with the first active player left of the button.</li>
        <li><b>Turn.</b> A fourth community card, then another betting round.</li>
        <li><b>River.</b> The fifth and last community card, then the final betting round.</li>
        <li><b>Showdown.</b> If two or more players are left, hands are shown and the best five-card hand wins the pot.</li>
      </ol>
      ${rule('A betting round ends when every player still in has either put in the same amount or is all-in, and everyone has had a chance to act.')}
      ${ex('a full hand, blinds 1/2', `
        <p>Alice is on the button, Bob is the small blind (posts 1), Cat the big blind (posts 2).</p>
        <p><b>Preflop:</b> Alice ${cards('Ah Qh', 28)} raises to 6. Bob folds. Cat ${cards('9c 9d', 28)} calls 4 more. Pot: 6 + 6 + 1 = <b>13</b>.</p>
        <p><b>Flop</b> ${cards('Qs 7d 2c', 28)}: Cat checks, Alice bets 8, Cat calls. Pot <b>29</b>.</p>
        <p><b>Turn</b> ${cards('4h', 28)}: both check. <b>River</b> ${cards('Kc', 28)}: both check.</p>
        <p><b>Showdown:</b> ${hand('Ah Qh', 'Qs 7d 2c 4h Kc', 'holdem', 'Alice')} ${hand('9c 9d', 'Qs 7d 2c 4h Kc', 'holdem', 'Cat')} Alice wins the 29 chip pot.</p>`)}
      ${tip('Heads-up (two players) is special: the button posts the small blind and acts <b>first</b> before the flop, then <b>last</b> on every later street.')}`,
    quiz: [
      { q: 'How many community cards are dealt on the flop?', opts: ['1', '3', '5'], a: 1, why: 'Flop = 3 cards, turn = 1, river = 1: five in total.' },
      { q: 'Who acts first after the flop (3+ players)?', opts: ['The player left of the big blind', 'The first active player left of the button', 'The button'], a: 1, why: 'Preflop starts left of the big blind; on every later street the first active player left of the button starts.' },
    ],
  });

  lesson({
    id: 'actions', ch: 'basics', title: 'Your options: fold, check, call, bet, raise',
    body: () => `
      ${table(['Action', 'When you can', 'What it means'], [
        ['<b>Fold</b>', 'Any time it\'s your turn', 'Give up the hand and anything you put in the pot.'],
        ['<b>Check</b>', 'Nobody has bet this round (or you already matched)', 'Pass without putting in chips.'],
        ['<b>Bet</b>', 'Nobody has bet this round', 'Put chips in that others must match to stay in.'],
        ['<b>Call</b>', 'Someone has bet', 'Match the current bet.'],
        ['<b>Raise</b>', 'Someone has bet', 'Increase the bet. Others must match the new amount.'],
        ['<b>All-in</b>', 'Any time', 'Put in all your chips. You can only win what you matched from each player (see side pots).'],
      ])}
      ${rule('<b>Table stakes:</b> you can only bet the chips in front of you when the hand starts. You can never be forced out of a hand for lack of chips; you go all-in instead.')}
      ${ex('one betting round', `<p>Blinds 1/2. The player under the gun <b>calls</b> 2. The next player <b>raises to 8</b>. Everyone else must now put in 8 in total (fold, call 8, or raise again). The first player has 2 in, so a call costs them 6 more.</p>`)}
      ${tip('Keyboard shortcuts at the table: <b>F</b> fold, <b>C</b> check or call, <b>R</b> raise.')}`,
    quiz: [
      { q: 'Someone bet 10 before you. Can you check?', opts: ['Yes', 'No'], a: 1, why: 'Checking is only allowed when there is nothing to call. Facing a bet you fold, call or raise.' },
      { q: 'You have 30 chips and face a bet of 50. What can you do?', opts: ['Only fold', 'Call all-in for 30, or fold', 'Borrow 20 more'], a: 1, why: 'Table stakes: you can call for everything you have. You can then only win 30 from each opponent.' },
    ],
  });

  lesson({
    id: 'best5', ch: 'basics', title: 'Making the best five-card hand',
    body: () => `
      <p>In Hold'em you make the best five-card hand from <b>any combination</b> of your two hole cards and the five community cards: both, one, or none of yours.</p>
      ${rule('Only five cards count. A sixth or seventh card never matters, even if it\'s an ace.')}
      ${ex('using both hole cards', hand('9h 8h', 'Th Jh 2c 7d Qs'))}
      ${ex('using one hole card', hand('Ad 3c', 'Kd 9d 4d 2d Js'))}
      ${ex('playing the board (using none)', `${hand('2c 3d', 'Ts Js Qs Kd Ah')}<p>The board itself is a straight. Anyone still in the hand ties unless they can beat it.</p>`)}
      ${ex('a hidden full house', hand('7s 7c', '7d Kh Kc 2s 9h'))}`,
    quiz: [
      { q: 'Board: Ts Js Qs Kd Ah. You hold 2c 3d, your opponent holds 4h 5h. Who wins?', opts: ['You', 'Your opponent', 'Split pot'], a: 2, why: 'Both play the board straight (A-K-Q-J-T). Neither hand improves it, so the pot is split.' },
      { q: 'Can you use just one of your hole cards?', opts: ['Yes, in Hold\'em', 'No, you must use both'], a: 0, why: 'In Hold\'em any five of the seven cards play. (Omaha is different: there you must use exactly two.)' },
    ],
  });

  lesson({
    id: 'kickers', ch: 'basics', title: 'Kickers, ties and split pots',
    body: () => {
      const b = 'As 9c 7d 4h 2s';
      const a = Eval.forGame('holdem', ['Ah', 'Kd'], b.split(' ')), q = Eval.forGame('holdem', ['Ad', 'Qc'], b.split(' '));
      return `
      <p>When two players have the same kind of hand, compare the cards that make it, highest first. Unused cards in the five are called <b>kickers</b>, and they break ties.</p>
      ${rule('Compare rank by rank down the five cards. If all five match, the hands tie and the pot is <b>split</b> equally. Odd chips go to the first winner left of the button.')}
      ${ex('a kicker decides it', `${hand('Ah Kd', b, 'holdem', 'Alice')}${hand('Ad Qc', b, 'holdem', 'Bob')}
        <p>Both have a pair of aces. Next card: Alice's king beats Bob's queen, so Alice wins (${a.score > q.score ? 'confirmed by the engine' : 'engine disagrees!'}).</p>`)}
      ${ex('kickers that don\'t play', `${hand('Ah 3d', 'Ks Kd Qc Qh Jc', 'holdem', 'Alice')}${hand('Ac 2s', 'Ks Kd Qc Qh Jc', 'holdem', 'Bob')}
        <p>Both make kings and queens with an ace kicker. The 3 and the 2 are the sixth and seventh cards and don't count: <b>split pot</b>.</p>`)}
      ${ex('the board\'s kicker counts too', `${hand('Kh 2c', 'Ks 9d 8c 6h 4s', 'holdem', 'Alice')}${hand('Kd 3c', 'Ks 9d 8c 6h 4s', 'holdem', 'Bob')}<p>Pair of kings with 9-8-6 kickers for both: split. Neither small card makes the best five.</p>`)}
      ${tip('Two pair compares the higher pair first, then the lower pair, then the kicker. A full house compares the three-of-a-kind first.')}`;
    },
    quiz: [
      { q: 'Board A♠ 9♣ 7♦ 4♥ 2♠. A K vs A J. Who wins?', opts: ['A K', 'A J', 'Split'], a: 0, why: 'Both have a pair of aces; the king kicker beats the jack.' },
      { q: 'Board K K Q Q J. Ace-three vs ace-two. Result?', opts: ['Ace-three wins', 'Split pot'], a: 1, why: 'Best five for both: K K Q Q A. The 3 and 2 don\'t play.' },
    ],
  });

  /* ===== 2. Rules in depth ===== */
  lesson({
    id: 'positions', ch: 'rules', title: 'Blinds, button and positions',
    body: () => `
      <p>Seats are named by where they sit relative to the button. Acting <b>later</b> is an advantage: you see what others did first.</p>
      ${table(['Position', 'Where', 'Acts preflop', 'Acts after the flop'], [
        ['SB, small blind', '1 left of button', 'second to last', 'first'],
        ['BB, big blind', '2 left of button', 'last', 'second'],
        ['UTG, "under the gun"', '3 left of button', 'first', 'early'],
        ['MP / HJ, middle / hijack', 'middle seats', 'middle', 'middle'],
        ['CO, cutoff', '1 right of button', 'late', 'second to last'],
        ['BTN, button', 'dealer seat', 'late', '<b>last</b>'],
      ])}
      ${rule('<b>Heads-up</b> (two players): the button posts the <b>small</b> blind and acts first preflop; the other player posts the big blind. After the flop the button acts last.')}
      ${rule('<b>Antes</b> are small forced bets from every player, posted before the blinds. They make the pot bigger before anyone acts.')}
      ${ex('who posts what', '<p>Six players, blinds 2/4, ante 1. Before any cards are dealt the pot already holds 6 × 1 + 2 + 4 = <b>12</b> chips.</p>')}
      ${tip('With "blinds go up" turned on, the blinds and ante multiply by 2×, 3×, 5×, 8×… every few hands. Each hand in the record states its own level.')}`,
    quiz: [
      { q: 'Heads-up, who posts the small blind?', opts: ['The button', 'The other player'], a: 0, why: 'Heads-up the button is the small blind and acts first preflop, last after the flop.' },
      { q: 'Which seat acts last after the flop?', opts: ['Big blind', 'Button', 'Under the gun'], a: 1, why: 'The button acts last on the flop, turn and river: the best seat at the table.' },
    ],
  });

  lesson({
    id: 'minraise', ch: 'rules', title: 'Minimum raises (no limit)',
    body: () => {
      const h = Engine.createHand({ no: 1, players: ['A', 'B', 'C', 'D'].map((name) => ({ name, stack: 500 })), button: 0, sb: 1, bb: 2 });
      const l0 = Engine.legal(h); Engine.applyAction(h, { type: 'raise', to: 6 }); const l1 = Engine.legal(h); Engine.applyAction(h, { type: 'raise', to: 20 }); const l2 = Engine.legal(h);
      return `
      ${rule('A raise must be at least as big as the <b>last bet or raise</b> in the same round. The first bet must be at least one big blind.')}
      ${formula('minimum raise to = current bet + size of the last raise')}
      ${ex('raises getting bigger', `<p>Blinds 1/2 (the big blind counts as the first "bet" of 2).</p>
        <ul class="lsteps"><li>First raiser: min raise to = 2 + 2 = <b>${l0.minTo}</b>. They raise to 6 (a raise of 4).</li>
        <li>Next player: min re-raise to = 6 + 4 = <b>${l1.minTo}</b>. They raise to 20 (a raise of 14).</li>
        <li>Next player: min re-raise to = 20 + 14 = <b>${l2.minTo}</b>.</li></ul>
        <p class="hint">These limits come straight from the game engine.</p>`)}
      ${rule('In no limit the maximum is always your whole stack: all-in.')}`;
    },
    quiz: [
      { q: 'Blinds 5/10. Someone raises to 35. What is the minimum re-raise to?', opts: ['45', '60', '70'], a: 1, why: 'The raise was 25 (from 10 to 35). Minimum re-raise to = 35 + 25 = 60.' },
      { q: 'On the flop nobody has bet. Blinds 1/2. Smallest legal bet?', opts: ['1', '2', 'Anything'], a: 1, why: 'The first bet in a round must be at least one big blind (or all-in for less).' },
    ],
  });

  lesson({
    id: 'sidepots', ch: 'rules', title: 'All-ins and side pots',
    body: () => {
      const pots = Engine.computePots([50, 150, 300], [false, false, false]);
      return `
      <p>An all-in player can only win from each opponent as much as they put in themselves. Anything extra goes into a <b>side pot</b> they can't win.</p>
      ${rule('Build pots from the smallest all-in up: the <b>main pot</b> takes the smallest stack from everyone; each <b>side pot</b> takes the next layer from those who have more. Any bet nobody could call is simply returned.')}
      ${formula('main pot = smallest all-in × number of players in it', 'then repeat with what is left')}
      ${ex('three players all-in for 50, 150 and 300', `
        ${table(['Pot', 'Amount', 'Who can win it'], pots.map((p, k) => [k === 0 ? 'Main pot' : p.eligible.length === 1 ? 'Returned (uncalled)' : `Side pot ${k}`, U.fmt(p.amount), p.eligible.map((i) => ['Ann (50)', 'Ben (150)', 'Cy (300)'][i]).join(', ')]))}
        <p>Main: 50 × 3 = 150. Side: (150 − 50) × 2 = 200. Cy's last 150 can't be called, so it goes back to Cy. If Ann has the best hand she wins 150; the best of Ben and Cy wins the side pot of 200.</p>`)}
      ${tip('Each pot is decided on its own, so one player can win the main pot while another wins the side pot.')}`;
    },
    quiz: [
      { q: 'Ann is all-in for 40; Ben and Cy each put in 100. How big is the main pot?', opts: ['120', '200', '240'], a: 0, why: 'Main pot = 40 × 3 = 120. The side pot is (100 − 40) × 2 = 120, which only Ben and Cy can win.' },
      { q: 'Ann (all-in, smallest) has the best hand. Does she win everything?', opts: ['Yes', 'Only the main pot'], a: 1, why: 'She can only win what she could match. The side pot goes to the better of the others.' },
    ],
  });

  lesson({
    id: 'shortallin', ch: 'rules', title: 'Short all-ins and reopening the betting',
    body: () => `
      ${rule('An all-in that is <b>less than a full raise</b> does not reopen the betting for players who have already acted. They may call or fold, but not raise again.')}
      ${ex('the betting stays closed', `<p>Blinds 5/10. Ann bets 100 on the flop. Ben calls 100. Cy goes all-in for 130, a raise of only 30, less than the 100 needed for a full raise.</p>
        <p>Back to Ann: she can call 30 more or fold, but <b>cannot re-raise</b>, because Cy's all-in wasn't a full raise. If Cy had gone all-in for 200 or more, Ann could raise again.</p>`)}
      ${tip('The table shows this as "raising is closed" when it applies.')}`,
    quiz: [
      { q: 'You bet 50, someone goes all-in for 70 (a raise of 20). Can you re-raise?', opts: ['Yes', 'No, only call or fold'], a: 1, why: 'A 20 raise is less than a full raise of 50, so the betting isn\'t reopened for you.' },
    ],
  });

  lesson({
    id: 'showdown', ch: 'rules', title: 'Showdown: who shows first, mucking',
    body: () => `
      ${rule('At the showdown, the <b>last player to bet or raise on the river shows first</b>. If everyone checked, the first player left of the button shows first. The others then show in turn, clockwise.')}
      ${rule('Once a better hand is shown, you may <b>muck</b> (throw away without showing). A mucked hand cannot win. When players are all-in with no more betting possible, every hand is turned face up.')}
      ${ex('who shows', `<p>On the river Ben bets and Cy calls. Ben must show first. If Ben shows ${cards('Ks Kd', 26)} and Cy's hand is worse, Cy can muck without revealing it.</p>`)}
      ${tip('Your "auto-muck" setting mucks clearly beaten hands for you. Turn it off if you like to show every hand. You can also show your cards voluntarily after any hand.')}`,
    quiz: [
      { q: 'River: everyone checked. Who shows first?', opts: ['The big blind', 'The first player left of the button', 'The last caller'], a: 1, why: 'With no river bet, showing starts left of the button and goes clockwise.' },
    ],
  });

  lesson({
    id: 'potlimit', ch: 'rules', title: 'Pot limit',
    body: () => {
      const h = Engine.createHand({ no: 1, players: ['A', 'B', 'C'].map((name) => ({ name, stack: 1000 })), button: 0, sb: 1, bb: 2, limit: 'pl' });
      const l0 = Engine.legal(h); Engine.applyAction(h, { type: 'raise', to: l0.maxTo }); const l1 = Engine.legal(h);
      return `
      <p>In pot limit the most you can bet or raise is the size of the pot, counted <b>as if you had called first</b>.</p>
      ${formula('maximum raise to = current bet + pot + amount to call', 'pot = everything in the middle, including bets this round')}
      ${ex('raising the pot preflop, blinds 1/2', `<p>First to act: current bet 2, pot 1 + 2 = 3, amount to call 2.</p>
        ${formula(`max raise to = 2 + 3 + 2 = ${l0.maxTo}`)}
        <p>They raise to ${l0.maxTo}. The small blind (1 already in) now faces: current bet ${l1.currentBet}, pot ${l1.pot}, call ${l1.toCall}.</p>
        ${formula(`max raise to = ${l1.currentBet} + ${l1.pot} + ${l1.toCall} = ${l1.maxTo}`)}
        <p class="hint">Both numbers are what the game engine allows.</p>`)}
      ${ex('a pot-size bet after the flop', '<p>Pot is 60 and nobody has bet: the maximum bet is 60. If someone bets 60, the next player can raise to at most 60 + (60 + 60 + 60) = 240: their call of 60 makes the pot 180, and they may raise by that much.</p>')}
      ${tip('Minimum raises work exactly as in no limit.')}`;
    },
    quiz: [
      { q: 'Pot limit. Pot is 100 (no bets yet this round). Largest bet?', opts: ['50', '100', '200'], a: 1, why: 'With nothing to call, the maximum bet is simply the pot: 100.' },
      { q: 'Pot is 100 and someone bets 50 (pot now 150). Largest raise to?', opts: ['150', '250', '300'], a: 1, why: 'Max raise to = current bet 50 + pot 150 + call 50 = 250.' },
    ],
  });

  lesson({
    id: 'omaha', ch: 'rules', title: 'Omaha: exactly two plus three',
    body: () => `
      <p>Omaha deals each player <b>four</b> hole cards (five in 5-Card Omaha). Everything else plays like Hold'em except one big rule:</p>
      ${rule('Your hand must use <b>exactly two</b> of your hole cards and <b>exactly three</b> board cards. Not one, not three: two.')}
      ${ex('four hearts on the board, one in your hand', `${hand('Ah Kc 2c 3d', 'Qh Jh 9h 5h 4c', 'omaha')}<p>In Hold'em the A♥ would make a flush. In Omaha you need <b>two</b> hearts in your hand, so this is not a flush.</p>`)}
      ${ex('two hearts in hand', hand('Ah Kh 2c 3d', 'Qh Jh 9h 5s 4c', 'omaha'))}
      ${ex('four of a kind on the board', `${hand('As Kd 7c 2h', 'Qs Qd Qh Qc 3d', 'omaha')}<p>In Hold'em everyone would have four queens. In Omaha you may use only three board cards, so the best you can do is three queens with your two best cards.</p>`)}
      ${tip('With four hole cards you have C(4,2) = 6 two-card combinations to combine with C(5,3) = 10 three-card boards: 60 possible hands. Five hole cards give 10 × 10 = 100.')}`,
    quiz: [
      { q: 'Omaha. Board has four spades. You hold one spade. Do you have a flush?', opts: ['Yes', 'No'], a: 1, why: 'You must use exactly two hole cards, so you need two spades in your hand.' },
      { q: 'How many two-card combinations from four hole cards?', opts: ['4', '6', '12'], a: 1, why: 'C(4, 2) = 4 × 3 ÷ 2 = 6.' },
    ],
  });

  /* ===== 3. Maths ===== */
  lesson({
    id: 'outs', ch: 'math', title: 'Counting outs',
    body: () => `
      <p>An <b>out</b> is an unseen card that would make your hand (probably) the best. Count them, then turn them into a probability.</p>
      ${table(['Draw', 'Example (hand + flop)', 'Outs'], [
        ['Flush draw', `${cards('Ah 7h', 24)} ${cards('Kh 9h 2c', 24)}`, '9 (13 hearts − 4 seen)'],
        ['Open-ended straight draw', `${cards('9c 8d', 24)} ${cards('7s 6h 2c', 24)}`, '8 (four 5s + four 10s)'],
        ['Gutshot (inside) straight draw', `${cards('9c 8d', 24)} ${cards('6s 5h Kc', 24)}`, '4 (four 7s)'],
        ['Two overcards', `${cards('Ac Kd', 24)} ${cards('9s 6h 2c', 24)}`, '6 (three aces + three kings)'],
        ['Pocket pair to a set', `${cards('7c 7d', 24)} ${cards('Ks 9h 2c', 24)}`, '2'],
        ['Flush draw + open-ended', `${cards('9h 8h', 24)} ${cards('7h 6c 2h', 24)}`, '15 (9 hearts + 6 more straight cards)'],
      ])}
      ${rule('Never count a card twice: in the combo draw, the 5♥ and 10♥ already count as hearts, so the straight adds 8 − 2 = 6.')}
      ${tip('Discount "dirty" outs: a card that completes your straight but also puts a flush on the board may not be good.')}`,
    quiz: [
      { q: 'You hold two hearts and the flop has two hearts. How many outs to a flush?', opts: ['8', '9', '13'], a: 1, why: '13 hearts − 4 you can see = 9.' },
      { q: 'You hold 9-8 on a 7-6-2 flop. Straight outs?', opts: ['4', '8', '12'], a: 1, why: 'Any 5 or any 10 makes a straight: 4 + 4 = 8 (open-ended).' },
    ],
  });

  lesson({
    id: 'rule24', ch: 'math', title: 'From outs to odds: the rule of 2 and 4',
    body: () => {
      const rows = [2, 4, 6, 8, 9, 12, 15].map((o) => [o, pct(hitOne(o, 47)), `${o * 2}%`, pct(hitTwo(o)), `${o * 4}%`]);
      return `
      <p>After the flop, 47 cards are unseen (52 − your 2 − 3 on the board). After the turn, 46.</p>
      ${formula('one card to come:   P(hit) = outs ÷ unseen cards')}
      ${formula('two cards (flop to river):   P(hit) = 1 − C(47 − outs, 2) ÷ C(47, 2)', 'one minus the chance of missing twice')}
      ${rule('<b>Quick estimate:</b> multiply your outs by <b>2</b> for one card to come, by <b>4</b> for two cards (flop, with all-in so you see both). Above about 8 outs the ×4 rule overestimates a little.')}
      ${table(['Outs', 'Exact, next card', 'Rule of 2', 'Exact, by the river', 'Rule of 4'], rows)}
      ${ex('a flush draw', `<p>9 outs on the flop. Exact chance to hit by the river:</p>${formula(`1 − C(38, 2) ÷ C(47, 2) = 1 − ${C(38, 2)} ÷ ${C(47, 2)} = ${pct(hitTwo(9))}`)}<p>The rule of 4 says 36%: close enough at the table.</p>`)}
      ${tip('If someone can still bet on the turn, use the one-card number: you only know you\'ll see one more card.')}`;
    },
    quiz: [
      { q: 'You have 8 outs on the turn. Roughly what are your odds on the river?', opts: ['8%', '16% (about 17% exactly)', '32%'], a: 1, why: 'One card to come: 8 × 2 ≈ 16%. Exactly 8 ÷ 46 = 17.4%.' },
      { q: 'Using the rule of 4, a gutshot (4 outs) on the flop, all-in?', opts: ['8%', '16%', '24%'], a: 1, why: '4 × 4 = 16%. Exactly: 1 − C(43,2)/C(47,2) = 16.5%.' },
    ],
  });

  lesson({
    id: 'potodds', ch: 'math', title: 'Pot odds: is the call worth it?',
    body: () => `
      ${formula('required equity = amount to call ÷ (pot after the bet + amount to call)', 'call if your chance of winning is higher')}
      ${ex('the classic', `<p>The pot is 100. Your opponent bets 50, so the pot is now 150 and you must call 50.</p>
        ${formula(`50 ÷ (150 + 50) = ${pct(potOdds(150, 50))}`)}
        <p>You're risking 50 to win 150: odds of <b>3 to 1</b>. You need to win at least 25% of the time.</p>`)}
      ${ex('a flush draw on the turn', `<p>You have 9 outs with one card to come: ${pct(hitOne(9))}. The pot is 80 and your opponent bets 40.</p>
        ${formula(`required = 40 ÷ (120 + 40) = ${pct(potOdds(120, 40))}`)}
        <p>${pct(hitOne(9))} &lt; ${pct(potOdds(120, 40))}, so calling loses money in the long run, unless you'll win more later (next lesson).</p>`)}
      ${table(['Bet size', 'Your odds', 'Equity needed to call'], [[0.25, '1/4 pot'], [0.33, '1/3 pot'], [0.5, '1/2 pot'], [0.75, '3/4 pot'], [1, 'pot'], [2, '2× pot']].map(([b, l]) => [l, `${fmt((1 + b) / b)} : 1`, pct(potOdds(1 + b, b))]))}
      ${tip('Converting: odds of X : 1 mean you need 1 ÷ (X + 1). 3 : 1 → 25%; 2 : 1 → 33%.')}`,
    quiz: [
      { q: 'Pot 60, opponent bets 60 (pot now 120). Equity needed to call?', opts: ['25%', '33%', '50%'], a: 1, why: '60 ÷ (120 + 60) = 33.3%: a pot-size bet always needs one third.' },
      { q: 'You have 20% equity and face a half-pot bet (needs 25%). Call?', opts: ['Yes', 'Not on pot odds alone'], a: 1, why: '20% is less than the 25% required. Only implied odds (future winnings) could justify it.' },
    ],
  });

  lesson({
    id: 'ev', ch: 'math', title: 'Expected value (EV)',
    body: () => `
      <p><b>Expected value</b> is what a decision wins or loses on average if you could repeat it many times.</p>
      ${formula('EV(call) = equity × pot − (1 − equity) × call', 'pot = what you win: everything already in the middle, including the bet you face')}
      ${ex('a profitable call', `<p>Pot 150 (after a 50 bet), call 50, equity 35%.</p>${formula(`EV = 0.35 × 150 − 0.65 × 50 = ${fmt(ev(0.35, 150, 50))} chips`)}<p>Positive: calling wins about ${fmt(ev(0.35, 150, 50))} chips on average.</p>`)}
      ${ex('a losing call', `<p>Same pot, equity 19.6% (flush draw, one card to come).</p>${formula(`EV = 0.196 × 150 − 0.804 × 50 = ${fmt(ev(0.196, 150, 50))} chips`)}`)}
      ${ex('EV of a bluff', `<p>Pot 100. You bet 75 as a bluff that never wins if called. Your opponent folds 50% of the time.</p>${formula('EV = P(fold) × pot − P(call) × bet = 0.5 × 100 − 0.5 × 75 = 12.5')}<p>A bluff with no showdown value is profitable if they fold more than 75 ÷ (100 + 75) = ${pct(alpha(100, 75))} of the time.</p>`)}
      ${rule('EV = 0 exactly at the pot-odds break-even point: solve EV(call) = 0 and you get equity = call ÷ (pot + call).')}`,
    quiz: [
      { q: 'Pot 200, call 100, equity 30%. EV of calling?', opts: ['−10', '+10', '+60'], a: 0, why: '0.30 × 200 − 0.70 × 100 = 60 − 70 = −10.' },
    ],
  });

  lesson({
    id: 'implied', ch: 'math', title: 'Implied odds and reverse implied odds',
    body: () => {
      const eq = hitOne(4), P = 30, c = 10, X = c / eq - P - c;
      return `
      <p><b>Implied odds</b> count chips you expect to win <b>later</b> when you hit. They can make a call right that pot odds alone say is wrong.</p>
      ${formula('extra you must win later (X) ≥ call ÷ equity − pot − call')}
      ${ex('a gutshot', `<p>Turn. Pot 30 after a 10 bet; you need 10 to call; 4 outs → ${pct(eq)}.</p>
        ${formula(`X ≥ 10 ÷ ${eq.toFixed(3)} − 30 − 10 = ${fmt(X)}`)}
        <p>You need to win about <b>${Math.ceil(X)}</b> more chips on the river, on average, when you hit. Against a deep opponent who will pay you off, that's realistic; against a short stack it isn't.</p>`)}
      ${rule('<b>Reverse implied odds:</b> when you make a weak version of a hand (a small flush, a straight that a bigger straight beats), you can lose extra chips later. Discount those draws.')}`;
    },
    quiz: [
      { q: 'Implied odds matter most when stacks are…', opts: ['Short', 'Deep'], a: 1, why: 'Deep stacks mean there is plenty left to win after you hit.' },
    ],
  });

  lesson({
    id: 'sizing', ch: 'math', title: 'Bet sizing: how often a bluff must work, how often to defend',
    body: () => `
      <p>The same numbers seen from the bettor's side.</p>
      ${formula('bluff break-even (α) = bet ÷ (pot + bet)', 'how often opponents must fold for a pure bluff to profit')}
      ${formula('minimum defence frequency (MDF) = pot ÷ (pot + bet)', 'how often you must continue so an any-two-cards bluff doesn\'t profit')}
      ${formula('balanced river bluffs = bet ÷ (pot + 2 × bet)', 'the share of bluffs in a betting range that makes the caller indifferent')}
      ${table(['Bet', 'α (bluff needs folds)', 'MDF (defend at least)', 'Bluffs in a balanced range'], [[0.33, '1/3 pot'], [0.5, '1/2 pot'], [0.75, '3/4 pot'], [1, 'pot'], [2, '2× pot']].map(([b, l]) => [l, pct(alpha(1, b)), pct(mdf(1, b)), pct(b / (1 + 2 * b))]))}
      ${ex('half-pot bet', `<p>Pot 100, bet 50. α = 50 ÷ 150 = ${pct(alpha(100, 50))}: the bluff profits if they fold more than a third of the time. MDF = 100 ÷ 150 = ${pct(mdf(100, 50))}: the defender should continue with about two thirds of their range.</p>`)}
      ${tip('A bigger bet needs <b>more</b> folds to break even as a bluff, but a balanced betting range can then contain <b>more</b> bluffs.')}`,
    quiz: [
      { q: 'Pot-size bluff. How often must it work to break even?', opts: ['33%', '50%', '67%'], a: 1, why: 'α = 100 ÷ (100 + 100) = 50%.' },
      { q: 'Facing a pot-size bet, minimum defence frequency?', opts: ['33%', '50%', '67%'], a: 1, why: 'MDF = pot ÷ (pot + bet) = 100 ÷ 200 = 50%.' },
    ],
  });

  lesson({
    id: 'combos', ch: 'math', title: 'Combinations and blockers',
    body: () => `
      <p>Counting the ways a hand can be dealt (its <b>combinations</b>) tells you what your opponent is likely to have.</p>
      ${formula('pocket pair: C(4, 2) = 6 combos', 'e.g. 6 ways to be dealt AA')}
      ${formula('unpaired hand: 4 × 4 = 16 combos', '4 suited + 12 offsuit')}
      ${formula('all starting hands: C(52, 2) = 1,326', '169 different "types": 13 pairs, 78 suited, 78 offsuit')}
      ${ex('card removal on the board', `<p>Board ${cards('Ah 8c 3d', 26)}. How many ways can someone hold AA? One ace is on the board, so only 3 are left: C(3, 2) = <b>3</b> combos (not 6). AK: 3 aces × 4 kings = <b>12</b> combos (not 16).</p>`)}
      ${ex('blockers', `<p>You hold ${cards('As Qc', 26)} on ${cards('Kd Jd 4c', 26)}. Your opponent's possible AK: 3 aces left × 4 kings = 12 combos instead of 16. Holding the ace <b>blocks</b> a quarter of their AK combos, and holding the ace of spades blocks the nut flush on a spade board.</p>`)}
      ${ex('value versus bluffs', '<p>Your opponent bets the river and you think they have either a set of eights (pairs: 3 combos left if one 8 is on the board) or a missed flush draw like suited J-T (4 combos). That\'s 3 value combos against 4 bluffs: they are bluffing 4 ÷ 7 = 57% of the time.</p>')}`,
    quiz: [
      { q: 'How many combinations of AK are there before the flop?', opts: ['4', '12', '16'], a: 2, why: '4 aces × 4 kings = 16 (4 suited, 12 offsuit).' },
      { q: 'A king is on the board. How many combos of KK remain?', opts: ['3', '4', '6'], a: 0, why: 'Only 3 kings are unseen: C(3, 2) = 3.' },
    ],
  });

  lesson({
    id: 'probs', ch: 'math', title: 'Useful probabilities',
    body: () => {
      const T = C(52, 2);
      const set = 1 - C(48, 3) / C(50, 3), fl = C(11, 3) / C(50, 3), fd = (C(11, 2) * 39) / C(50, 3);
      return `
      ${table(['Event', 'Formula', 'Chance'], [
        ['Dealt any pocket pair', '13 × 6 ÷ 1,326', `${pct(78 / T)} (1 in 17)`],
        ['Dealt AA (or any one pair)', '6 ÷ 1,326', `${pct(6 / T, 2)} (1 in 221)`],
        ['Dealt suited cards', '4 × 78 ÷ 1,326', pct(312 / T)],
        ['Dealt AK (any suits)', '16 ÷ 1,326', pct(16 / T, 2)],
        ['Pocket pair flops a set or better', '1 − C(48, 3) ÷ C(50, 3)', pct(set)],
        ['Suited cards flop a flush', 'C(11, 3) ÷ C(50, 3)', pct(fl, 2)],
        ['Suited cards flop a flush draw', 'C(11, 2) × 39 ÷ C(50, 3)', pct(fd)],
        ['Flush draw completes by the river', '1 − C(38, 2) ÷ C(47, 2)', pct(hitTwo(9))],
        ['Open-ended draw completes by the river', '1 − C(39, 2) ÷ C(47, 2)', pct(hitTwo(8))],
      ])}
      ${ex('why sets are worth chasing cheaply', `<p>A small pair flops a set ${pct(set)} of the time, about 1 in 8.5. Calling a raise just to "set mine" pays when you can win roughly 15 times the call or more when you hit (the implied odds rule of thumb).</p>`)}`;
    },
    quiz: [
      { q: 'How often are you dealt a pocket pair?', opts: ['About 1 in 17', 'About 1 in 50', 'About 1 in 221'], a: 0, why: '78 of the 1,326 starting hands are pairs: 5.9%, 1 in 17. Any specific pair is 1 in 221.' },
    ],
  });

  lesson({
    id: 'equity', ch: 'math', title: 'Equity: classic matchups',
    body: () => `
      <p><b>Equity</b> is your share of the pot if all the cards were dealt out with no more betting. These numbers are worked out on your device right now by dealing thousands of random boards with the game's own hand evaluator.</p>
      <div id="eq-table">${table(['Matchup', 'Hand 1', 'Hand 2'], [
        ['AA vs KK', 'As Ad', 'Kc Kh', 'Overpair vs underpair'],
        ['QQ vs AK', 'Qs Qd', 'Ac Kh', 'The "coin flip"'],
        ['AK vs AQ', 'Ad Kc', 'As Qh', 'Domination (shared ace)'],
        ['22 vs AK', '2c 2d', 'Ah Ks', 'Small pair vs two overcards'],
        ['JTs vs AK', 'Jh Th', 'Ac Kd', 'Connected suited vs big cards'],
        ['AA vs 87s', 'Ac Ad', '8s 7s', 'Strongest vs a suited connector'],
      ].map(([n, a, b, d]) => [`<b>${n}</b><div class="hint">${d}</div>`, `${cards(a, 24)} <span class="eqv" data-h1="${a}" data-h2="${b}" data-i="0">…</span>`, `${cards(b, 24)} <span class="eqv" data-h1="${a}" data-h2="${b}" data-i="1">…</span>`, '']).map((r) => r.slice(0, 3)))}</div>
      ${rule('A pair against two higher cards is roughly a coin flip (about 55/45). A hand that shares a card with a better hand ("dominated") wins only about a quarter of the time.')}
      ${tip('Try your own matchups with the equity calculator in the Tools lesson.')}`,
    after(root) {
      const cells = $$('.eqv', root);
      const done = new Set();
      cells.forEach((el) => {
        const key = el.dataset.h1 + '|' + el.dataset.h2;
        if (done.has(key)) return;
        done.add(key);
        setTimeout(() => {
          const r = equity([el.dataset.h1.split(' '), el.dataset.h2.split(' ')], [], 'holdem', 12000);
          $$(`.eqv[data-h1="${el.dataset.h1}"][data-h2="${el.dataset.h2}"]`, root).forEach((x) => { x.textContent = pct(r.eq[+x.dataset.i]); });
        }, 30);
      });
    },
    quiz: [
      { q: 'QQ against AK (all-in preflop) is roughly…', opts: ['80/20', '55/45', '30/70'], a: 1, why: 'A pair against two overcards is close to a coin flip, slightly in favour of the pair.' },
    ],
  });

  /* ===== 4. Strategy ===== */
  lesson({
    id: 'position', ch: 'strategy', title: 'Position and starting hands',
    body: () => `
      <p>Acting last is worth a lot: you see what everyone else does before you decide. Play <b>fewer hands early</b> and <b>more hands late</b>.</p>
      ${table(['Position', 'A sensible opening range (full table)', 'Roughly'], [
        ['Early (UTG)', 'Pairs 77+, AJs+, KQs, AQo+', '10%'],
        ['Middle', 'Pairs 55+, ATs+, KJs+, QJs, JTs, AJo+, KQo', '15%'],
        ['Cutoff', 'Pairs 22+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, ATo+, KJo+', '25%'],
        ['Button', 'Pairs 22+, most suited aces, kings and connectors, A8o+, KTo+, QTo+, JTo', '40%'],
        ['Small blind', 'Similar to the cutoff when it\'s folded to you', '25–35%'],
      ])}
      ${rule('Raise rather than limp (just call the big blind) when you enter a pot first. It gives you two ways to win: everyone folds now, or you win at showdown.')}
      ${ex('the same hand, two seats', `<p>${cards('Kh Jc', 26)} is a fold under the gun at a full table (it's often dominated by AK, AJ, KQ) but a standard raise on the button.</p>`)}
      ${tip('These are starting points, not laws. Tighten up against aggressive tables and loosen up when others fold too much.')}`,
    quiz: [
      { q: 'Where should you play the most hands?', opts: ['Under the gun', 'On the button'], a: 1, why: 'The button acts last after the flop: the best seat at the table.' },
    ],
  });

  lesson({
    id: 'spr', ch: 'strategy', title: 'Stack-to-pot ratio and effective stacks',
    body: () => `
      ${formula('effective stack = the smaller of your stack and your opponent\'s', 'you can never win or lose more than that from them')}
      ${formula('SPR = effective stack ÷ pot on the flop')}
      ${table(['SPR', 'What it means'], [
        ['Under 3', 'Top pair or better is usually happy to get all-in.'],
        ['3 to 10', 'Top pair is a good hand but often not worth stacking off. Think before going all-in.'],
        ['Over 10', 'Deep: big hands (sets, straights, flushes) and good draws gain value; one pair is often just a bluff-catcher.'],
      ])}
      ${ex('working it out', '<p>You have 400, your opponent 250. Effective stack: 250. The pot on the flop is 60, so SPR = 250 ÷ 60 ≈ 4.2. With top pair, you should be willing to play a big pot but not automatically all of it.</p>')}`,
    quiz: [
      { q: 'You have 1,000, they have 300, pot 100. SPR?', opts: ['3', '10', '13'], a: 0, why: 'Effective stack is 300 (the smaller). 300 ÷ 100 = 3.' },
    ],
  });

  lesson({
    id: 'tools', ch: 'strategy', title: 'Tools: calculators',
    body: () => `
      <p>Plug in your own numbers. Everything runs on this device.</p>
      <div class="ltools">
        <section class="card-ui ltool"><h4>${icon('calc')} Pot odds and EV</h4>
          <div class="two"><label class="field"><span>Pot (including the bet you face)</span><input class="input num" id="t-pot" type="number" min="0" value="150"></label>
          <label class="field"><span>Amount to call</span><input class="input num" id="t-call" type="number" min="0" value="50"></label></div>
          <label class="field"><span>Your equity (%)</span><input class="input num" id="t-eq" type="number" min="0" max="100" value="35"></label>
          <div class="lout" id="t-po"></div></section>
        <section class="card-ui ltool"><h4>${icon('calc')} Outs to odds</h4>
          <label class="field"><span>Outs</span><input class="input num" id="t-outs" type="number" min="0" max="30" value="9"></label>
          <div class="lout" id="t-oo"></div></section>
        <section class="card-ui ltool"><h4>${icon('calc')} Bet size</h4>
          <div class="two"><label class="field"><span>Pot</span><input class="input num" id="t-bp" type="number" min="1" value="100"></label>
          <label class="field"><span>Bet</span><input class="input num" id="t-bb" type="number" min="1" value="75"></label></div>
          <div class="lout" id="t-bs"></div></section>
        <section class="card-ui ltool"><h4>${icon('calc')} Equity calculator</h4>
          <div class="two"><label class="field"><span>Hand 1</span><input class="input" id="t-h1" value="Ah Kh" autocomplete="off"></label>
          <label class="field"><span>Hand 2</span><input class="input" id="t-h2" value="Qs Qd" autocomplete="off"></label></div>
          <div class="two"><label class="field"><span>Board (0, 3, 4 or 5 cards)</span><input class="input" id="t-bd" value="" placeholder="e.g. Kd 7h 2c" autocomplete="off"></label>
          <div class="field"><span>Game</span><select class="input" id="t-g"><option value="holdem">Hold'em</option><option value="omaha">Omaha (4 or 5 cards)</option></select></div></div>
          <button class="btn primary" id="t-run" type="button">${icon('play')}Run 20,000 deals</button>
          <div class="lout" id="t-eqo"></div></section>
      </div>`,
    after(root) {
      const n = (id) => Math.max(0, Number($(id, root).value) || 0);
      const upd = () => {
        const pot = n('#t-pot'), call = n('#t-call'), eq = Math.min(100, n('#t-eq')) / 100;
        $('#t-po', root).innerHTML = call > 0 ? `You need <b>${pct(potOdds(pot, call))}</b> equity (odds ${fmt(pot / call)} : 1).<br>EV of calling at ${pct(eq, 0)}: <b>${ev(eq, pot, call) >= 0 ? '+' : ''}${fmt(ev(eq, pot, call))}</b> chips → ${ev(eq, pot, call) >= 0 ? 'call' : 'fold (unless implied odds make up the difference)'}.` : 'Nothing to call: checking is free.';
        const o = Math.min(30, Math.floor(n('#t-outs')));
        $('#t-oo', root).innerHTML = `Next card (flop→turn): <b>${pct(hitOne(o, 47))}</b> · (turn→river): <b>${pct(hitOne(o, 46))}</b><br>By the river from the flop: <b>${pct(hitTwo(o))}</b> (rule of 4 says ${Math.min(100, o * 4)}%)`;
        const bp = n('#t-bp') || 1, bb = n('#t-bb') || 1;
        $('#t-bs', root).innerHTML = `That's ${pct(bb / bp, 0)} of the pot.<br>A pure bluff needs folds <b>${pct(alpha(bp, bb))}</b> of the time.<br>The caller needs <b>${pct(potOdds(bp + bb, bb))}</b> equity and should defend at least <b>${pct(mdf(bp, bb))}</b> of their range.`;
      };
      $$('input', root).forEach((i) => i.addEventListener('input', upd));
      upd();
      const parse = (s) => (String(s).match(/(10|[2-9TJQKA])[shdc♠♥♦♣]/gi) || []).map((x) => Cards.parse(x)).filter(Boolean);
      $('#t-run', root).addEventListener('click', () => {
        const game = $('#t-g', root).value, h1 = parse($('#t-h1', root).value), h2 = parse($('#t-h2', root).value), bd = parse($('#t-bd', root).value);
        const all = [...h1, ...h2, ...bd], out = $('#t-eqo', root);
        const hc = game === 'omaha' ? [4, 5] : [2];
        if (!hc.includes(h1.length) || h1.length !== h2.length) return void (out.innerHTML = `<span class="err-text">Enter ${game === 'omaha' ? '4 or 5' : '2'} cards for each hand, like <code>Ah Kh</code>.</span>`);
        if (![0, 3, 4, 5].includes(bd.length)) return void (out.innerHTML = '<span class="err-text">The board needs 0, 3, 4 or 5 cards.</span>');
        if (new Set(all).size !== all.length) return void (out.innerHTML = '<span class="err-text">The same card appears twice.</span>');
        out.textContent = 'Dealing…';
        setTimeout(() => {
          const r = equity([h1, h2], bd, game, bd.length === 5 ? 1 : 20000);
          out.innerHTML = `${cards(h1.join(' '), 24)} <b>${pct(r.eq[0])}</b> &nbsp; ${cards(h2.join(' '), 24)} <b>${pct(r.eq[1])}</b><br><span class="hint">Ties ${pct(r.tie)} (counted as half a win each) · ${U.fmt(r.iters)} deal${r.iters === 1 ? '' : 's'}</span>`;
        }, 20);
      });
    },
    quiz: [],
  });

  return { CHAPTERS, LESSONS: L, equity, C, hitTwo, hitOne, potOdds, ev, alpha, mdf };
})();

function LearnScreen(id) {
  document.title = TitleFlash.base = 'Learn Poker · Feltroom';
  document.body.classList.add('scroll');
  const prog = () => Prefs.get('learn', { done: [] });
  const isDone = (lid) => prog().done.includes(lid);
  const markDone = (lid) => { const p = prog(); if (!p.done.includes(lid)) { p.done.push(lid); Prefs.set('learn', p); } };
  const L = Learn.LESSONS;
  const idx = L.findIndex((x) => x.id === id);
  const head = (title) => `<div class="page-head"><a class="btn ghost icon-btn" href="${idx >= 0 ? '#/learn' : '#/'}" aria-label="Back">${icon('back')}</a><h2>${title}</h2><span class="grow"></span>${topIconButtons()}</div>`;

  if (idx < 0) {
    const done = prog().done.filter((x) => L.some((l) => l.id === x)).length;
    App.root.innerHTML = `<div class="page"><div class="page-inner">${head(`${icon('book')} Learn Poker`)}
      <p class="muted" style="margin-top:0">From the rules of the game to the maths behind every decision. Each lesson has worked examples and a short quiz. Your progress stays on this device.</p>
      <div class="lprog"><div class="lprog-bar"><span style="width:${(done / L.length) * 100}%"></span></div><span>${done} of ${L.length} lessons done</span></div>
      ${Learn.CHAPTERS.map((ch, ci) => `<section class="lchap"><h3><span class="lnum">${ci + 1}</span>${ch.title}</h3><p class="hint">${ch.blurb}</p>
        <div class="llist">${L.filter((l) => l.ch === ch.id).map((l) => `<a class="litem ${isDone(l.id) ? 'done' : ''}" href="#/learn/${l.id}"><span class="lcheck">${isDone(l.id) ? icon('check') : ''}</span><span>${U.esc(l.title)}</span>${icon('chevron')}</a>`).join('')}</div></section>`).join('')}
    </div></div>`;
    bindThemeToggles(App.root);
    return { destroy() { document.body.classList.remove('scroll'); } };
  }

  const l = L[idx], ch = Learn.CHAPTERS.find((c) => c.id === l.ch);
  const prev = L[idx - 1], next = L[idx + 1];
  App.root.innerHTML = `<div class="page"><div class="page-inner learn">${head(U.esc(l.title))}
    <div class="hint" style="margin:-14px 0 14px">${U.esc(ch.title)} · Lesson ${idx + 1} of ${L.length}</div>
    <article class="lbody">${l.body()}</article>
    ${l.quiz.length ? `<section class="lquiz card-ui"><h3>${icon('check')} Check yourself</h3>${l.quiz.map((q, qi) => `<div class="lq" data-q="${qi}"><p><b>${qi + 1}.</b> ${U.esc(q.q)}</p><div class="lopts">${q.opts.map((o, oi) => `<button class="btn sm" data-o="${oi}">${U.esc(o)}</button>`).join('')}</div><div class="lwhy hidden"></div></div>`).join('')}</section>` : ''}
    <nav class="lnav">${prev ? `<a class="btn" href="#/learn/${prev.id}">${icon('back')}${U.esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a class="btn primary" href="#/learn/${next.id}">${U.esc(next.title)} ${icon('chevron')}</a>` : '<a class="btn primary" href="#/learn">All lessons</a>'}</nav>
  </div></div>`;
  bindThemeToggles(App.root);
  if (l.after) l.after(App.root);
  if (!l.quiz.length) markDone(l.id);
  let right = 0;
  $$('.lq', App.root).forEach((el) => {
    const q = l.quiz[+el.dataset.q];
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-o]');
      if (!b || el.dataset.answered) return;
      el.dataset.answered = '1';
      const ok = +b.dataset.o === q.a;
      if (ok) right++;
      $$('[data-o]', el).forEach((x) => { x.disabled = true; if (+x.dataset.o === q.a) x.classList.add('primary'); });
      if (!ok) b.classList.add('danger');
      const w = $('.lwhy', el);
      w.innerHTML = `${ok ? '<b class="ok-text">Correct.</b>' : '<b class="err-text">Not quite.</b>'} ${U.esc(q.why)}`;
      w.classList.remove('hidden');
      if ($$('.lq[data-answered]', App.root).length === l.quiz.length) {
        markDone(l.id);
        toast(right === l.quiz.length ? 'Lesson complete: all correct!' : `Lesson complete: ${right} of ${l.quiz.length} correct.`, right === l.quiz.length ? 'success' : 'info');
      }
    });
  });
  window.scrollTo(0, 0);
  return { destroy() { document.body.classList.remove('scroll'); } };
}
