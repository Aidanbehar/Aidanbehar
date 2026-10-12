// Endgames. Line exercises are checked with Stockfish 19 in the test suite.
export default [
  {
    id: 'kp-fundamentals',
    section: 'endgames',
    title: 'King and pawn fundamentals',
    level: 'Beginner',
    body: `
<p>King and pawn against king is the foundation of all endgames. The defending king tries to get <strong>in front of the pawn</strong>; the attacking king tries to <strong>lead the pawn</strong>.</p>
<ul>
<li>If the attacking king reaches the 6th rank in front of its (non-rook) pawn, it wins regardless of who is to move.</li>
<li>The king should usually go <strong>in front of</strong> the pawn, not behind it.</li>
<li>Rook pawns (a- and h-pawns) are the exception: if the defending king reaches the corner, it is a draw.</li>
<li><strong>Key squares</strong>: for a pawn on the 5th rank or below, the attacker wins if his king reaches one of the squares two ranks in front of the pawn (and the adjacent files).</li>
</ul>`,
    keyPoints: ['King in front of the pawn.', 'King on the 6th in front of a non-rook pawn wins.', 'Rook pawns are drawish.'],
    diagram: {
      fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
      caption: 'The white king on e6 controls the key squares d7, e7 and f7. White wins with either side to move.',
      marks: { d7: 'good', e7: 'good', f7: 'good' },
    },
    example: {
      title: 'Escorting the pawn',
      fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
      steps: [
        { move: 'Kd6', text: 'The king steps aside, keeping control of e7 and d7.' },
        { move: 'Kf7', text: '' },
        { move: 'Kd7', text: 'Now the pawn is escorted all the way.' },
        { move: 'Kf8', text: '' },
        { move: 'e6', text: '' },
        { move: 'Kg7', text: '' },
        { move: 'e7', text: 'And e8 next.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
      prompt: 'White to move and win. Choose the first move.',
      solution: ['Kd6'],
      accept: [['Kf6']],
      hint: 'Pushing the pawn too early lets the black king into the corner squares in front of it.',
      explanation: 'Kd6 (or Kf6) keeps the key squares. 1.e6? gives Black drawing chances; Stockfish 19 rates Kd6 and Kf6 as winning.',
    },
    quiz: {
      q: 'Which pawns are hardest to win with in K+P vs K?',
      options: ['Centre pawns', 'Rook pawns (a- and h-pawns)', 'Knight pawns', 'Bishop pawns'],
      answer: 1,
      explain: 'With a rook pawn the defending king reaches the corner and cannot be driven out.',
    },
  },
  {
    id: 'opposition',
    section: 'endgames',
    title: 'Opposition',
    level: 'Intermediate',
    body: `
<p>Two kings stand in <strong>opposition</strong> when they face each other with one square between them (same file, rank or diagonal). The side <em>not</em> to move "has the opposition": the other king must give way.</p>
<p>In king and pawn endings, gaining the opposition decides whether the attacking king can reach the key squares. With a pawn far behind, the attacker can also use a <strong>spare pawn move</strong> to pass the move to the opponent.</p>
<p>Rule of thumb: when your king is in front of your pawn, step to the square that takes the direct opposition (or the distant opposition, with an odd number of squares between the kings).</p>`,
    keyPoints: ['Kings face each other with one square between.', 'The side NOT to move has the opposition.', 'Spare pawn moves can win the opposition.'],
    diagram: {
      fen: '8/8/8/4k3/8/4K3/4P3/8 b - - 0 1',
      caption: 'The kings on e3 and e5 are in direct opposition. With Black to move, White has the opposition.',
      marks: { e3: 'good', e5: 'bad' },
    },
    example: {
      title: 'Taking the opposition',
      fen: '8/8/8/4k3/8/8/4PK2/8 w - - 0 1',
      steps: [
        { move: 'Ke3', text: 'White takes the opposition: the kings face each other and Black must move.' },
        { move: 'Kf5', text: 'Black gives way on one side…' },
        { move: 'Kd4', text: '…and White goes round on the other, heading for the key squares in front of the pawn.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '8/8/8/4k3/8/8/4PK2/8 w - - 0 1',
      prompt: 'White to move. Only one move wins — find it.',
      solution: ['Ke3'],
      hint: 'Face the black king with one square between you.',
      explanation: 'Ke3 takes the opposition and wins (Stockfish 19: winning). Kf3 or Ke1 allow Black to take the opposition and draw.',
    },
    quiz: {
      q: 'Kings on e4 and e6, White to move. Who has the opposition?',
      options: ['White', 'Black', 'Neither', 'Both'],
      answer: 1,
      explain: 'The side that does NOT have to move has the opposition — here Black.',
    },
  },
  {
    id: 'square-of-pawn',
    section: 'endgames',
    title: 'The square of the pawn',
    level: 'Beginner',
    body: `
<p>Can a king catch a passed pawn without help? Imagine a <strong>square</strong> whose side runs from the pawn to its promotion square. If the defending king can step <em>into</em> that square on its move, it catches the pawn; otherwise the pawn promotes.</p>
<p>Equivalent counting rule (used by this app's checker): with the pawn to move next, the king catches the pawn if it is no more king-moves away from the promotion square than the number of moves the pawn needs. Remember that a pawn on its starting rank may advance two squares.</p>`,
    keyPoints: ['Draw the square from the pawn to its queening square.', 'Step inside it = catch the pawn.', 'Beware the double-step from the starting rank.'],
    diagram: {
      fen: '7k/8/8/p7/8/8/5K2/8 w - - 0 1',
      caption: 'The square of the a5-pawn runs a5–a1–e1–e5. The white king must enter it now.',
      marks: { a1: 'info', b1: 'info', c1: 'info', d1: 'info', e1: 'info', e2: 'info', e3: 'info', e4: 'info', e5: 'info' },
    },
    example: {
      title: 'Catching the pawn',
      fen: '7k/8/8/p7/8/8/5K2/8 w - - 0 1',
      steps: [
        { move: 'Ke3', text: 'Into the square.' },
        { move: 'a4', text: '' },
        { move: 'Kd3', text: 'The square shrinks with the pawn, and the king stays inside it.' },
        { move: 'a3', text: '' },
        { move: 'Kc2', text: '' },
        { move: 'a2', text: '' },
        { move: 'Kb2', text: 'The pawn is caught.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'into-square',
      pawn: 'a5',
      fen: '7k/8/8/p7/8/8/5K2/8 w - - 0 1',
      prompt: 'Stop the a-pawn: move your king into the square of the pawn.',
      solutionText: 'Ke1, Ke2 or Ke3 — each is within 4 king moves of a1, and the pawn needs 4 moves.',
      explanation: 'Stockfish 19 evaluates these king moves as a draw; other moves lose.',
    },
    quiz: {
      q: 'A black pawn on a7 (its starting square) — how many moves does it need to promote?',
      options: ['6', '5 (thanks to the double step)', '7', '4'],
      answer: 1,
      explain: 'a7–a5 is one move, then a4, a3, a2, a1: five moves.',
    },
  },
  {
    id: 'passed-pawns',
    section: 'endgames',
    title: 'Passed pawns',
    level: 'Intermediate',
    body: `
<p>A <strong>passed pawn</strong> has no enemy pawns in front of it on its own or neighbouring files. "Passed pawns must be pushed" — every advance increases the burden on the defender.</p>
<ul>
<li><strong>Outside passed pawn</strong>: far from the other pawns, it decoys the enemy king away.</li>
<li><strong>Protected passed pawn</strong>: defended by another pawn; the enemy king cannot simply capture it.</li>
<li><strong>Connected passed pawns</strong>: two adjacent passers; extremely strong.</li>
<li><strong>Breakthrough</strong>: a pawn sacrifice that creates a passed pawn by force, as in the classic three-against-three below.</li>
</ul>`,
    keyPoints: ['Push passed pawns (with support).', 'Outside passers deflect the king.', 'Look for breakthroughs with pawn majorities.'],
    diagram: {
      fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1',
      caption: 'Three against three with both kings far away: White wins with a breakthrough.',
    },
    example: {
      title: 'The breakthrough',
      fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1',
      steps: [
        { move: 'b6', text: 'Offering the middle pawn.' },
        { move: 'axb6', text: '(…cxb6 a6! bxa6 c6 is symmetrical.)' },
        { move: 'c6', text: 'A second sacrifice.' },
        { move: 'bxc6', text: '' },
        { move: 'a6', text: 'Now nothing can stop the a-pawn.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1',
      prompt: 'Create a passed pawn by force.',
      solution: ['b6', 'axb6', 'c6', 'bxc6', 'a6'],
      hint: 'Sacrifice the middle pawn first.',
      explanation: 'b6! and c6! clear the way for the a-pawn (Stockfish 19: winning).',
    },
    quiz: {
      q: 'What is an outside passed pawn good for?',
      options: ['Nothing special', 'Luring the enemy king away from the other pawns', 'Protecting your own king', 'Forcing stalemate'],
      answer: 1,
      explain: 'While the enemy king stops it, your king wins pawns on the other side.',
    },
  },
  {
    id: 'rook-endings',
    section: 'endgames',
    title: 'Basic rook endings',
    level: 'Intermediate',
    body: `
<p>Rook endings are the most common endings in practice. Two positions every player should know:</p>
<ul>
<li><strong>Lucena position</strong> (winning): the attacking king is in front of its pawn on the 7th rank, cut off on one side. White wins by <em>building a bridge</em>: bringing the rook to the 4th rank to shield the king from checks.</li>
<li><strong>Philidor position</strong> (drawing): the defender keeps the rook on the 6th rank (his 3rd) until the pawn advances, then goes behind and checks from far away.</li>
</ul>
<p>General rules: keep your rook <strong>active</strong>; put it <strong>behind passed pawns</strong>; cut the enemy king off along a rank or file.</p>`,
    keyPoints: ['Lucena: build a bridge.', 'Philidor: third-rank defence, then check from behind.', 'Activity first.'],
    diagram: {
      fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
      caption: 'A Lucena position: the white king must leave b8 without being chased by checks forever.',
    },
    example: {
      title: 'Building a bridge',
      fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
      steps: [
        { move: 'Rd1+', text: 'First the black king is pushed one more file away.' },
        { move: 'Ke7', text: '' },
        { move: 'Rd4', text: 'The rook goes to the 4th rank — the "bridge".' },
        { move: 'Ra1', text: '' },
        { move: 'Kc7', text: 'The king comes out.' },
        { move: 'Rc1+', text: '' },
        { move: 'Kb6', text: '' },
        { move: 'Rb1+', text: '' },
        { move: 'Rb4', text: 'The bridge: the rook blocks the checks and the pawn queens.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
      prompt: 'Lucena position, White to move. Play a winning first move.',
      solution: ['Rd1+'],
      accept: [['Rc4', 'Rb1']],
      explanation: 'Rd1+ (cutting the king off further) and the immediate bridge Rc4 both win according to Stockfish 19.',
    },
    quiz: {
      q: 'In the Philidor defence, where does the defending rook wait?',
      options: ['On its third rank (blocking the attacker\'s king)', 'Behind its own king', 'On the first rank', 'In the corner'],
      answer: 0,
      explain: 'On the third rank it stops the attacking king from advancing; once the pawn advances, it checks from behind.',
    },
  },
  {
    id: 'basic-mates',
    section: 'endgames',
    title: 'Fundamental checkmates',
    level: 'Beginner',
    body: `
<p>Every player must be able to mate with <strong>king + queen</strong> and <strong>king + rook</strong> against a lone king — and do it well within the fifty-move limit.</p>
<ul>
<li><strong>King and queen</strong>: use the queen to restrict the enemy king to a shrinking box (a knight's move away is a good distance), then bring your king close and mate on the edge. <em>Always check for stalemate</em> when the king has few squares.</li>
<li><strong>King and rook</strong>: cut the king off along a rank or file, bring your king into opposition, and check along the edge. Use waiting rook moves to "pass".</li>
</ul>
<p>Two bishops can also force mate; bishop and knight can too, but that takes up to 33 moves and careful technique.</p>`,
    keyPoints: ['Restrict, approach, mate on the edge.', 'Watch for stalemate.', 'K+R: cut off, opposition, check.'],
    diagram: {
      fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1',
      caption: 'Mate in one — but some queen moves (like Qc7) would be stalemate!',
    },
    example: {
      title: 'King and rook',
      fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
      steps: [
        { move: 'Rh8#', text: 'The kings are in a "side opposition" on the edge; the rook checks along the 8th rank and the white king covers a7 and b7.' },
      ],
    },
    exercise: {
      type: 'mate',
      fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1',
      prompt: 'Checkmate in one with the queen. Avoid stalemate!',
      explanation: 'Qh8# is the mate: the queen checks along the 8th rank while your king covers a7 and b7. Qc7 would be stalemate, and Qb8+ simply loses the queen to Kxb8.',
    },
    quiz: {
      q: 'King + queen vs king: the opponent\'s king has one free square and you play a quiet queen move covering it. What must you check?',
      options: ['Whether it is stalemate', 'Whether it is castling', 'Whether the queen is pinned', 'Nothing'],
      answer: 0,
      explain: 'Taking the last square without giving check is stalemate.',
    },
  },
  {
    id: 'converting',
    section: 'endgames',
    title: 'Converting a material advantage',
    level: 'Intermediate',
    body: `
<p>Being material up is not the same as winning. Classical technique for <strong>converting</strong> an advantage:</p>
<ul>
<li><strong>Trade pieces, not pawns.</strong> Each piece trade increases the relative value of your extra material; each pawn trade brings the opponent closer to a drawn ending.</li>
<li>Know which endings are <strong>won</strong>: an extra pawn in a pure pawn ending is usually decisive.</li>
<li>Eliminate counterplay before pushing for more ("do not hurry").</li>
<li>Activate the king.</li>
</ul>`,
    keyPoints: ['Trade pieces, keep pawns.', 'Head for won pawn endings.', 'Remove counterplay first.'],
    diagram: {
      fen: '3r4/4k2p/6p1/8/4PP2/5KP1/8/3R4 w - - 0 1',
      caption: 'White is a pawn up. Trading rooks leads to a winning pawn ending.',
    },
    example: {
      title: 'Simplifying',
      fen: '3r4/4k2p/6p1/8/4PP2/5KP1/8/3R4 w - - 0 1',
      steps: [
        { move: 'Rxd8', text: 'Trade the rooks.' },
        { move: 'Kxd8', text: '' },
        { move: 'Kg4', text: 'The king becomes active. With an extra pawn and the more active king, White wins the pawn ending.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '3r4/4k2p/6p1/8/4PP2/5KP1/8/3R4 w - - 0 1',
      prompt: 'Find the clearest way to convert your extra pawn.',
      solution: ['Rxd8'],
      explanation: 'Rxd8 Kxd8 reaches a pawn ending Stockfish 19 evaluates as winning (around +6), much better than keeping rooks (around +1.7).',
    },
    quiz: {
      q: 'You are a piece up. Which trades help you most?',
      options: ['Pawn trades', 'Piece trades', 'No trades', 'Queen for rook'],
      answer: 1,
      explain: 'Trading pieces simplifies toward an ending where the extra piece decides.',
    },
  },
];
