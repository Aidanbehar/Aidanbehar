// Calculation and decision-making.
const PHILIDOR_LEGACY = '5rk1/6pp/8/6N1/8/8/6PP/3Q2K1 w - - 0 1';
const LOOSE = 'r1bqkb1r/pppp1ppp/2n2n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4';

export default [
  {
    id: 'candidate-moves',
    section: 'calculation',
    title: 'Candidate moves',
    level: 'Beginner',
    body: `
<p>Strong players do not calculate every move. They first pick a short list of <strong>candidate moves</strong> — usually 2 to 4 — and then calculate each one.</p>
<p>A good candidate list includes:</p>
<ul>
<li>All <strong>forcing moves</strong> (checks, captures, threats).</li>
<li>The move your <strong>plan</strong> suggests.</li>
<li>A move that deals with the opponent's <strong>threat</strong>.</li>
</ul>
<p>Only then compare the candidates. The <em>Lines</em> setting in the Analysis tab shows Stockfish 19's own candidate moves (MultiPV) side by side — compare your list with it.</p>`,
    keyPoints: ['List candidates before calculating.', 'Include every forcing move.', 'Compare, then decide.'],
    diagram: {
      fen: LOOSE,
      caption: 'White to move. Candidates include Nxc6, Nxf7, Nf3, d3 and Nc3 — the captures must be on the list.',
    },
    example: {
      title: 'Checking the captures',
      fen: LOOSE,
      steps: [
        { move: 'Nxc6', text: 'A capture from the candidate list: it trades off the attacker of e5…' },
        { move: 'dxc6', text: '…and after the recapture Black\'s knight on f6 still attacks e4, so White must look again.' },
        { move: 'd3', text: 'Defending e4. Stockfish 19 rates Nxc6 as White\'s best move here.' },
      ],
    },
    exercise: {
      type: 'count',
      kind: 'captures',
      fen: LOOSE,
      prompt: 'Forcing moves first: how many legal captures does White have?',
      explanation: 'The rules library lists every capture, so none is overlooked.',
    },
    quiz: {
      q: 'What belongs on every candidate list?',
      options: ['Only quiet moves', 'All checks, captures and threats', 'Only king moves', 'Only the first move you see'],
      answer: 1,
      explain: 'Forcing moves can change everything and must always be considered.',
    },
  },
  {
    id: 'cct',
    section: 'calculation',
    title: 'Checks, captures and threats',
    level: 'Beginner',
    body: `
<p>A simple, powerful habit: on every move, look at <strong>all checks, all captures and all threats</strong> — first yours, then your opponent's. This "CCT" scan catches most tactics in practical games.</p>
<p>Why this order? Checks are the most forcing (the opponent must respond), captures change material, and threats force a reaction. Forcing moves limit the opponent's replies, which makes calculation manageable.</p>`,
    keyPoints: ['Checks → captures → threats.', 'Scan for both sides.', 'Forcing moves keep calculation short.'],
    diagram: {
      fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',
      caption: 'The Opera Game, move 16. Scanning White\'s checks reveals Qb8+!',
    },
    example: {
      title: 'A check that wins',
      fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',
      steps: [
        { move: 'Qb8+', text: 'The very first check on the list.' },
        { move: 'Nxb8', text: '' },
        { move: 'Rd8#', text: 'Found by systematically checking the checks.' },
      ],
    },
    exercise: {
      type: 'count',
      kind: 'checks',
      fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',
      prompt: 'How many checking moves does White have?',
      explanation: 'Counted by the rules library: every legal move that gives check.',
    },
    quiz: {
      q: 'In what order does the CCT scan look at moves?',
      options: ['Threats, captures, checks', 'Checks, captures, threats', 'Pawn moves first', 'Random order'],
      answer: 1,
      explain: 'From most forcing to least forcing.',
    },
  },
  {
    id: 'forcing-variations',
    section: 'calculation',
    title: 'Forcing variations',
    level: 'Intermediate',
    body: `
<p>A <strong>forcing variation</strong> is a sequence in which every move leaves the opponent with only one (or very few) sensible replies — typically a series of checks and captures. Because the tree of possibilities stays narrow, such lines can be calculated deep and accurately.</p>
<p>Calculate forcing lines <em>to the end</em>: stop only at a position you can evaluate clearly (mate, material win, or a quiet position you understand). Write the line down mentally move by move — "I go here, he must go there".</p>`,
    keyPoints: ['Checks and captures narrow the tree.', 'Calculate to a clear final position.', 'Check every opponent reply, especially checks.'],
    diagram: {
      fen: PHILIDOR_LEGACY,
      caption: 'White mates by force with a sequence of checks.',
    },
    example: {
      title: 'Philidor\'s legacy',
      fen: PHILIDOR_LEGACY,
      steps: [
        { move: 'Qd5+', text: 'Check.' },
        { move: 'Kh8', text: '' },
        { move: 'Nf7+', text: 'Check.' },
        { move: 'Kg8', text: 'Forced.' },
        { move: 'Nh6+', text: 'Double check!' },
        { move: 'Kh8', text: 'Forced.' },
        { move: 'Qg8+', text: 'The queen sacrifice.' },
        { move: 'Rxg8', text: 'Forced.' },
        { move: 'Nf7#', text: 'Smothered mate. Every white move was a check, so the line could be calculated completely.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: PHILIDOR_LEGACY,
      prompt: 'Find the forced mate. Every move is a check.',
      solution: ['Qd5+', 'Kh8', 'Nf7+', 'Kg8', 'Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'],
      accept: [['Qb3+']],
      hint: 'Start with a queen check on the a2–g8 diagonal.',
      explanation: 'Qd5+ (or Qb3+) Kh8 Nf7+ Kg8 Nh6+ Kh8 Qg8+ Rxg8 Nf7# — Stockfish 19 confirms a forced mate.',
    },
    quiz: {
      q: 'Why are forcing variations easier to calculate?',
      options: ['They are shorter', 'The opponent has very few legal or sensible replies', 'Engines like them', 'They always win'],
      answer: 1,
      explain: 'Fewer branches means you can look deeper with confidence.',
    },
  },
  {
    id: 'opponent-replies',
    section: 'calculation',
    title: 'Calculating your opponent\'s replies',
    level: 'Intermediate',
    body: `
<p>The most common calculation error is <strong>"hope chess"</strong>: playing a move and hoping the opponent replies as expected. For every candidate, ask: <em>what is my opponent's best answer?</em> — especially their checks, captures and threats.</p>
<p>Likewise, after each opponent move, ask <em>why</em> it was played and what it threatens. Often the threat is a mate or a capture you would otherwise overlook.</p>`,
    keyPoints: ['Assume the best reply, not the hoped-for one.', 'Ask "what does their last move threaten?"', 'Blunder-check before moving.'],
    diagram: {
      fen: '6k1/5ppp/3b4/8/7q/8/5PPP/3Q1RK1 w - - 0 1',
      caption: 'Black\'s queen and bishop both aim at h2: …Qxh2 would be mate.',
      arrows: ['h4h2', 'd6h2'],
      marks: { h2: 'bad' },
    },
    example: {
      title: 'Seeing the threat',
      fen: '6k1/5ppp/3b4/8/7q/8/5PPP/3Q1RK1 w - - 0 1',
      steps: [
        { move: 'g3', text: 'Blocking the bishop and attacking the queen at the same time.' },
        { move: 'Qh3', text: 'The queen stays near the king…' },
        { move: 'Qf3', text: '…and White covers the light squares around the king. The mate threat is gone.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'no-mate-in-1',
      fen: '6k1/5ppp/3b4/8/7q/8/5PPP/3Q1RK1 w - - 0 1',
      prompt: 'Black threatens mate in one. Stop it.',
      solutionText: 'For example g3, h3, f4 or Re1 (giving the king f1). The app checks every Black reply for mate.',
      explanation: 'Good defence starts with seeing the opponent\'s threat.',
    },
    quiz: {
      q: 'What is "hope chess"?',
      options: ['Playing a move without checking the opponent\'s best reply', 'Playing for a draw', 'Resigning early', 'Playing only openings you know'],
      answer: 0,
      explain: 'Always assume your opponent finds the best reply.',
    },
  },
  {
    id: 'blunder-check',
    section: 'calculation',
    title: 'Avoiding one-move blunders',
    level: 'Beginner',
    body: `
<p>Most games below master level are decided by <strong>one-move blunders</strong>: leaving a piece unprotected, or missing a simple tactic. A short blunder check before every move prevents most of them:</p>
<ol>
<li>Which of my pieces are <strong>attacked</strong>? Are they defended enough?</li>
<li>Which of my pieces are <strong>loose</strong> (undefended)? Loose pieces drop off to forks and double attacks.</li>
<li>After my intended move, what are my opponent's <strong>checks and captures</strong>?</li>
</ol>`,
    keyPoints: ['"Loose pieces drop off."', 'Check what your move leaves undefended.', 'Run the CCT scan for the opponent.'],
    diagram: {
      fen: LOOSE,
      caption: 'White\'s knight on e5 and pawn on e4 are attacked and undefended.',
      marks: { e5: 'bad', e4: 'bad' },
    },
    example: {
      title: 'Protecting what is attacked',
      fen: LOOSE,
      steps: [
        { move: 'Nxc6', text: 'White removes one attacker…' },
        { move: 'dxc6', text: '' },
        { move: 'd3', text: '…and protects the e4-pawn. Nothing is hanging any more.' },
      ],
    },
    exercise: {
      type: 'squares',
      kind: 'hanging',
      color: 'w',
      fen: LOOSE,
      prompt: 'Select every white piece or pawn that is attacked and not defended.',
      explanation: 'The app checks attackers and defenders of each square with the rules library.',
    },
    quiz: {
      q: 'What does "loose pieces drop off" mean?',
      options: ['Undefended pieces are easy targets for tactics', 'Pieces fall off the board', 'Pawns promote', 'Rooks are weak'],
      answer: 0,
      explain: 'Undefended pieces are the typical victims of forks and double attacks.',
    },
  },
  {
    id: 'evaluating-positions',
    section: 'calculation',
    title: 'Evaluating the resulting position',
    level: 'Intermediate',
    body: `
<p>Calculation is only useful if you can judge the position at the end of the line. Evaluate with a checklist:</p>
<ol>
<li><strong>Material</strong> (with values 1/3/3/5/9, plus the bishop pair).</li>
<li><strong>King safety</strong> for both sides.</li>
<li><strong>Piece activity</strong>.</li>
<li><strong>Pawn structure</strong> — weaknesses and, above all, <strong>passed pawns</strong>.</li>
<li>Who has the <strong>initiative</strong> (whose threats come first)?</li>
</ol>
<p>In endgames the passed-pawn count often decides. Stockfish's numeric evaluation (+1.00 ≈ a pawn's worth of advantage for White) is a useful cross-check — the Analysis tab shows it from White's point of view.</p>`,
    keyPoints: ['Material, king safety, activity, structure, initiative.', 'Passed pawns weigh heavily in endgames.', 'Cross-check with the engine afterwards.'],
    diagram: {
      fen: '8/5pk1/6p1/1P6/3P4/6P1/5PK1/8 w - - 0 1',
      caption: 'White has four pawns against two, and two of them (b5 and d4) are passed and far from the black king.',
    },
    example: {
      title: 'Passed pawns decide',
      fen: '8/5pk1/6p1/1P6/3P4/6P1/5PK1/8 w - - 0 1',
      steps: [
        { move: 'b6', text: 'The b-pawn runs.' },
        { move: 'Kf6', text: '' },
        { move: 'b7', text: 'The black king is far too slow; b8 comes next.' },
      ],
    },
    exercise: {
      type: 'squares',
      kind: 'passed',
      color: 'w',
      fen: '8/5pk1/6p1/1P6/3P4/6P1/5PK1/8 w - - 0 1',
      prompt: 'Which white pawns are passed? Select them.',
      explanation: 'A pawn is passed if no enemy pawn stands in front of it on its own or an adjacent file.',
    },
    quiz: {
      q: 'Stockfish shows +1.50. What does it mean?',
      options: ['Black is better by 1.5 pawns', 'White is better by about one and a half pawns', 'White has 1.5 more pieces', 'The game is drawn'],
      answer: 1,
      explain: 'Positive values favour White; 1.00 corresponds roughly to a pawn.',
    },
  },
  {
    id: 'clock',
    section: 'calculation',
    title: 'Managing the clock',
    level: 'Beginner',
    body: `
<p>In timed games, the clock is part of the position. Practical guidelines:</p>
<ul>
<li><strong>Budget</strong> your time: a rough target is to spend your time evenly over the first 40 moves, with extra in critical moments.</li>
<li>Spend time when the position is <strong>critical</strong>: a big decision, a pawn break, an exchange that changes the structure, or when many tactics are in the air. Play quickly when the move is obvious or forced.</li>
<li>Use the opponent's time to think about general plans.</li>
<li>Avoid perfectionism: a good move now is better than a perfect move with no time left.</li>
<li>In time trouble, prefer <strong>safe, simple</strong> moves and keep the pieces protected.</li>
<li>Know the <strong>increment</strong>: with increment, you can never completely run out if you move fast enough.</li>
</ul>
<p>(This lesson has no board exercise: clock decisions are about your own habits. Practise them in real games.)</p>`,
    keyPoints: ['Budget time; invest it at critical moments.', 'Move fast when moves are forced.', 'In time trouble: safe and simple.'],
    diagram: {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      caption: 'Opening moves you know well should cost little time, saving it for the middlegame.',
    },
    quiz: {
      q: 'When is it most worth spending extra time?',
      options: ['On forced recaptures', 'At critical moments that change the character of the position', 'In the first three moves', 'Never'],
      answer: 1,
      explain: 'Big, irreversible decisions deserve the most thought.',
    },
  },
];
