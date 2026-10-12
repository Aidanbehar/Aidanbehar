// Tactical patterns. Exercise positions were checked with Stockfish 19 (see
// tests/lessons.test.mjs, which re-verifies them on every test run).
const TWO_KNIGHTS = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const OPERA_16 = '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16';
const ELEPHANT_7 = 'r1bBkb1r/pppn1ppp/8/3n4/3P4/8/PP2PPPP/R2QKBNR b KQkq - 0 7';

export default [
  {
    id: 'forks',
    section: 'tactics',
    title: 'Forks',
    level: 'Beginner',
    body: `
<p>A <strong>fork</strong> is a single move that attacks two or more enemy pieces at once. The opponent can usually save only one of them.</p>
<p>Any piece can fork, but <strong>knights</strong> are the classic forking piece because their attack pattern is unusual and cannot be blocked. The most powerful forks include a <em>check</em> (the king must be dealt with first) or attack undefended pieces.</p>
<p>How to look for forks: find enemy pieces that are <em>loose</em> (undefended) or more valuable than your attacker, then ask which square attacks two of them at once — and whether you can safely reach it.</p>`,
    keyPoints: ['One move, two (or more) targets.', 'Forks with check are the most forcing.', 'Loose pieces and the enemy king are typical targets.'],
    diagram: {
      fen: 'r3k3/pp3ppp/8/1N6/8/8/PP3PPP/4K3 w - - 0 1',
      caption: 'From c7 the knight would attack both the king on e8 and the rook on a8.',
      arrows: ['b5c7'],
      marks: { e8: 'bad', a8: 'bad' },
    },
    example: {
      title: 'The Fried Liver fork',
      fen: TWO_KNIGHTS,
      intro: 'Two Knights Defence: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6.',
      steps: [
        { move: 'Ng5', text: 'The knight joins the bishop in attacking f7, which only the king defends.' },
        { move: 'd5', text: 'Black blocks the bishop\'s diagonal (the main line).' },
        { move: 'exd5', text: 'White captures.' },
        { move: 'Nxd5', text: 'Recapturing with the knight is risky (…Na5 is the main line).' },
        { move: 'Nxf7', text: '<strong>Fork!</strong> The knight on f7 attacks the queen on d8 and the rook on h8. Black usually answers Kxf7, accepting a dangerous king walk — the "Fried Liver Attack".' },
      ],
    },
    exercise: {
      type: 'line',
      fen: 'r3k3/pp3ppp/8/1N6/8/8/PP3PPP/4K3 w - - 0 1',
      prompt: 'Win material with a fork.',
      solution: ['Nc7+', 'Kd7', 'Nxa8'],
      notes: ['Check! The king must move, leaving the rook.', ''],
      hint: 'Which square attacks e8 and a8 at the same time?',
      explanation: 'Nc7+ forks king and rook; after the king moves, Nxa8 wins the rook (Stockfish 19 evaluates the position as winning for White).',
    },
    quiz: {
      q: 'Why is a fork with check especially strong?',
      options: ['Checks are worth extra points', 'The opponent must answer the check, so the second target cannot be saved', 'A checking piece cannot be captured', 'It ends the game'],
      answer: 1,
      explain: 'The king has to be protected first, which usually leaves the other attacked piece en prise.',
    },
  },
  {
    id: 'pins',
    section: 'tactics',
    title: 'Pins',
    level: 'Beginner',
    body: `
<p>A <strong>pin</strong> attacks a piece that cannot (or should not) move because a more valuable piece stands behind it on the same line. Only long-range pieces — bishops, rooks and queens — can pin.</p>
<ul>
<li><strong>Absolute pin</strong>: the piece behind is the king. Moving the pinned piece off the line is illegal.</li>
<li><strong>Relative pin</strong>: the piece behind is valuable (often the queen). Moving is legal but loses material.</li>
</ul>
<p>Exploit a pin by <em>piling up</em> on the pinned piece — attack it again, especially with a pawn — because it cannot run away.</p>`,
    keyPoints: ['Absolute pin (king behind) = the piece cannot legally leave the line.', 'Attack pinned pieces again.', 'Break pins by moving the piece behind, blocking, or counter-attacking.'],
    diagram: {
      fen: '4k3/8/8/4q3/8/8/5KPP/4R3 b - - 1 1',
      caption: 'After Re1 the black queen is pinned to the king on e8. It can only move along the e-file.',
      arrows: ['e1e5'],
      marks: { e5: 'bad', e8: 'info' },
    },
    example: {
      title: 'A relative pin in the Queen\'s Gambit',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      steps: [
        { move: 'd4', text: '1.d4' },
        { move: 'd5', text: '1…d5' },
        { move: 'c4', text: 'The Queen\'s Gambit.' },
        { move: 'e6', text: 'Black declines the gambit.' },
        { move: 'Nc3', text: 'Developing and adding pressure on d5.' },
        { move: 'Nf6', text: 'The knight defends d5.' },
        { move: 'Bg5', text: '<strong>Pin!</strong> The knight on f6 is pinned to the queen on d8: if it moves, Bxd8. This is a relative pin — moving the knight is legal, just costly.', arrows: ['g5d8'] },
      ],
    },
    exercise: {
      type: 'line',
      fen: '4k3/8/8/4q3/8/8/5KPP/R7 w - - 0 1',
      prompt: 'Win the black queen.',
      solution: ['Re1'],
      hint: 'The queen and king share a file.',
      explanation: 'Re1 pins the queen to the king. The best Black can do is Qxe1+ Kxe1, giving the queen for a rook.',
    },
    quiz: {
      q: 'Which pieces can create a pin?',
      options: ['Knights and pawns', 'Only the queen', 'Bishops, rooks and queens', 'Kings'],
      answer: 2,
      explain: 'Pins need a line, so only long-range pieces can pin.',
    },
  },
  {
    id: 'skewers',
    section: 'tactics',
    title: 'Skewers',
    level: 'Beginner',
    body: `
<p>A <strong>skewer</strong> is a "reverse pin": a long-range piece attacks a valuable piece, and when that piece moves out of the way, the piece <em>behind</em> it on the same line is captured.</p>
<p>The most common skewer is a <strong>check</strong> against a king with the queen or a rook behind it. Skewers often appear in endgames where kings and major pieces are exposed on open lines.</p>`,
    keyPoints: ['Valuable piece in front, target behind.', 'Checks make skewers forcing.', 'Watch for your king and queen on the same line.'],
    diagram: {
      fen: '8/8/8/8/R2k3q/8/6PP/6K1 b - - 1 1',
      caption: 'Ra4+ skewers the king on d4 and the queen on h4 along the 4th rank.',
      arrows: ['a4h4'],
      marks: { d4: 'bad', h4: 'bad' },
    },
    example: {
      title: 'Skewer along a rank',
      fen: '8/8/8/8/3k3q/8/6PP/R5K1 w - - 0 1',
      steps: [
        { move: 'Ra4+', text: 'Check along the fourth rank. The king must step off the rank…' },
        { move: 'Ke5', text: '…and now the queen behind it is undefended on the same line.' },
        { move: 'Rxh4', text: 'The rook collects the queen.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '8/8/8/8/3k3q/8/6PP/R5K1 w - - 0 1',
      prompt: 'Win the queen with a skewer.',
      solution: ['Ra4+', 'Ke5', 'Rxh4'],
      explanation: 'Ra4+ forces the king off the 4th rank; Rxh4 follows. Stockfish 19 rates White as winning.',
    },
    quiz: {
      q: 'In a skewer, which piece is in front?',
      options: ['The less valuable piece', 'The more valuable piece (often the king)', 'Always a pawn', 'The attacking piece'],
      answer: 1,
      explain: 'The more valuable piece is attacked first and must move, exposing the piece behind.',
    },
  },
  {
    id: 'discovered-attacks',
    section: 'tactics',
    title: 'Discovered attacks',
    level: 'Intermediate',
    body: `
<p>A <strong>discovered attack</strong> happens when one piece moves out of the way and <em>uncovers</em> an attack by a long-range piece behind it. Two threats arise at once: the uncovered attack and whatever the moving piece does.</p>
<p>When the uncovered piece gives check it is a <strong>discovered check</strong> — then the moving piece is free to capture almost anything, because the opponent must first deal with the check.</p>
<p>Look for your own pieces that stand <em>in front of</em> your bishops, rooks or queen, pointing at valuable enemy targets.</p>`,
    keyPoints: ['Move the front piece, unleash the piece behind.', 'The moving piece should create a second threat.', 'Discovered checks are devastating.'],
    diagram: {
      fen: '3q2k1/5ppp/8/8/8/3B4/5PPP/3R2K1 w - - 0 1',
      caption: 'The bishop on d3 blocks the rook\'s attack on the queen. If it moves with a threat, the rook is unleashed.',
      arrows: ['d1d8', 'd3h7'],
    },
    example: {
      title: 'Bishop moves, rook strikes',
      fen: '3q2k1/5ppp/8/8/8/3B4/5PPP/3R2K1 w - - 0 1',
      steps: [
        { move: 'Bxh7+', text: 'The bishop captures with check, uncovering the rook\'s attack on d8.' },
        { move: 'Kxh7', text: 'Black takes the bishop, but…' },
        { move: 'Rxd8', text: '…the rook wins the queen.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '3q2k1/5ppp/8/8/8/3B4/5PPP/3R2K1 w - - 0 1',
      prompt: 'Use a discovered attack to win the queen.',
      solution: ['Bxh7+', 'Kxh7', 'Rxd8'],
      hint: 'The bishop must move with a threat so strong that Black has no time to save the queen.',
      explanation: 'Only a bishop move with check works: after quieter moves Black simply plays …Qxd1+.',
    },
    quiz: {
      q: 'What makes a discovered check so strong?',
      options: ['It cannot be blocked', 'The moving piece can make its own threat while the opponent must answer the check', 'It always mates', 'It wins the opponent\'s queen automatically'],
      answer: 1,
      explain: 'The opponent has to parry the check, so the second threat usually succeeds.',
    },
  },
  {
    id: 'double-check',
    section: 'tactics',
    title: 'Double check',
    level: 'Intermediate',
    body: `
<p>A <strong>double check</strong> is a discovered check in which the moving piece <em>also</em> gives check. The king is attacked by two pieces at once.</p>
<p>Because you cannot block two lines or capture two pieces in one move, the <strong>only</strong> defence against double check is to <strong>move the king</strong>. If the king has no safe square, it is checkmate — even if the checking pieces are hanging.</p>`,
    keyPoints: ['Two checking pieces at once.', 'Only a king move can answer it.', 'A boxed-in king is mated.'],
    diagram: {
      fen: '3qkb2/3p4/8/8/4B3/8/5PPP/4R1K1 w - - 0 1',
      caption: 'The bishop blocks the rook\'s e-file. Black\'s own pieces box in the king.',
      arrows: ['e1e8'],
    },
    example: {
      title: 'Réti vs. Tartakower, Vienna 1910',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      steps: [
        { move: 'e4', text: '' }, { move: 'c6', text: 'Caro-Kann Defence.' }, { move: 'd4', text: '' }, { move: 'd5', text: '' },
        { move: 'Nc3', text: '' }, { move: 'dxe4', text: '' }, { move: 'Nxe4', text: '' }, { move: 'Nf6', text: '' },
        { move: 'Qd3', text: '' }, { move: 'e5', text: '' }, { move: 'dxe5', text: '' }, { move: 'Qa5+', text: '' },
        { move: 'Bd2', text: '' }, { move: 'Qxe5', text: '' },
        { move: 'O-O-O', text: 'The rook on d1 now faces the black king along the d-file.' },
        { move: 'Nxe4', text: 'Black grabs a knight.' },
        { move: 'Qd8+', text: 'A stunning queen sacrifice.' },
        { move: 'Kxd8', text: 'Forced: the king must take.' },
        { move: 'Bg5+', text: '<strong>Double check!</strong> The bishop checks from g5 and uncovers the rook on d1. Only a king move is possible.' },
        { move: 'Kc7', text: 'Ke8 would allow Rd8#.' },
        { move: 'Bd8#', text: 'Checkmate — the bishop returns to d8.' },
      ],
    },
    exercise: {
      type: 'mate',
      fen: '3qkb2/3p4/8/8/4B3/8/5PPP/4R1K1 w - - 0 1',
      prompt: 'Checkmate in one move with a double check.',
      hint: 'Move the bishop so that it checks along the f7–e8 diagonal while uncovering the rook.',
      explanation: 'Bg6# checks from the bishop and the rook at once. Single checks fail because Black could block with …Be7 or …Qe7.',
    },
    quiz: {
      q: 'How can a player answer a double check?',
      options: ['Block one of the checks', 'Capture one checking piece', 'Only by moving the king', 'By castling'],
      answer: 2,
      explain: 'Blocking or capturing deals with only one checker, so the king must move.',
    },
  },
  {
    id: 'removing-defender',
    section: 'tactics',
    title: 'Removing the defender',
    level: 'Intermediate',
    body: `
<p>If an enemy piece is protected only once, <strong>capture (or chase away) its defender</strong> first. Then the piece itself is left hanging. This is also called <em>undermining</em>.</p>
<p>Method: list what each enemy piece is defending. A piece that defends something important is a target — trading it off, even at a small material cost, can win more.</p>`,
    keyPoints: ['Count attackers and defenders.', 'Eliminate the only defender.', 'The trade can be "equal" and still win material.'],
    diagram: {
      fen: '6k1/pp1p1ppp/2n5/1B2b3/8/8/PPP2PPP/4R1K1 w - - 0 1',
      caption: 'The bishop on e5 is attacked by the rook and defended only by the knight on c6.',
      arrows: ['e1e5', 'b5c6'],
      marks: { e5: 'bad', c6: 'info' },
    },
    example: {
      title: 'Take the defender, then the piece',
      fen: '6k1/pp1p1ppp/2n5/1B2b3/8/8/PPP2PPP/4R1K1 w - - 0 1',
      steps: [
        { move: 'Bxc6', text: 'The bishop removes the knight that defended e5.' },
        { move: 'dxc6', text: 'Black recaptures…' },
        { move: 'Rxe5', text: '…and the bishop on e5 falls. White is a piece up.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '6k1/pp1p1ppp/2n5/1B2b3/8/8/PPP2PPP/4R1K1 w - - 0 1',
      prompt: 'Win a piece by removing a defender.',
      solution: ['Bxc6', 'dxc6', 'Rxe5'],
      explanation: 'Bxc6 eliminates the only defender of e5; Black cannot both recapture and save the bishop.',
    },
    quiz: {
      q: 'An enemy knight is defended only by a bishop, and you can capture that bishop. What is the idea called?',
      options: ['Removing the defender', 'A skewer', 'Zwischenzug', 'Stalemate'],
      answer: 0,
      explain: 'Capturing the defender leaves the knight unprotected.',
    },
  },
  {
    id: 'deflection',
    section: 'tactics',
    title: 'Deflection',
    level: 'Intermediate',
    body: `
<p><strong>Deflection</strong> forces an enemy piece away from an important duty — guarding a square, a piece or the back rank — usually with a capture, a check or a sacrifice that it must accept.</p>
<p>Ask: <em>which enemy piece is doing an essential job?</em> Then look for a forcing move that drags it elsewhere.</p>
<p>Morphy's famous Opera Game (1858) ends with a queen sacrifice that deflects a knight from guarding d8.</p>`,
    keyPoints: ['Identify a piece with an essential duty.', 'Force it away with a check, capture or sacrifice.', 'Then exploit what it was guarding.'],
    diagram: {
      fen: OPERA_16,
      caption: 'The knight on d7 is the only piece guarding d8 against Rd8+.',
      marks: { d7: 'bad', d8: 'info' },
    },
    example: {
      title: 'Morphy\'s finish',
      fen: OPERA_16,
      steps: [
        { move: 'Qb8+', text: 'The queen offers itself with check. The only legal reply is to capture with the knight.' },
        { move: 'Nxb8', text: 'Deflected! The knight no longer guards d8.' },
        { move: 'Rd8#', text: 'The rook, protected by the bishop on g5, delivers mate.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: OPERA_16,
      prompt: 'Find Morphy\'s mate in two.',
      solution: ['Qb8+', 'Nxb8', 'Rd8#'],
      hint: 'The d7-knight guards d8. Make it move.',
      explanation: 'Qb8+! Nxb8 Rd8# — Stockfish 19 confirms mate in 2.',
    },
    quiz: {
      q: 'What is the purpose of a deflection?',
      options: ['To trade queens', 'To drive a defender away from a key square or piece', 'To castle faster', 'To repeat moves'],
      answer: 1,
      explain: 'Once the defender is gone, the square or piece it guarded can be exploited.',
    },
  },
  {
    id: 'decoy',
    section: 'tactics',
    title: 'Decoys',
    level: 'Intermediate',
    body: `
<p>A <strong>decoy</strong> lures an enemy piece — often the king — <em>onto</em> a particular square where it can be attacked, forked or mated. Deflection pulls a piece <em>away</em> from a square; a decoy pulls it <em>to</em> one.</p>
<p>The most famous decoy is <strong>Philidor's legacy</strong>: a queen sacrifice on g8 forces a rook onto g8, where it blocks its own king's escape square, and a knight delivers a <em>smothered mate</em>.</p>`,
    keyPoints: ['Lure a piece to a bad square.', 'Often a sacrifice the opponent must accept.', 'Smothered mates are typical decoy finishes.'],
    diagram: {
      fen: '5r1k/6pp/4Q2N/8/8/8/6PP/6K1 w - - 0 1',
      caption: 'Qg8+! forces Rxg8 (the king cannot take because of the knight), and Nf7# follows.',
      arrows: ['e6g8', 'h6f7'],
    },
    example: {
      title: 'Smothered mate',
      fen: '5r1k/6pp/4Q2N/8/8/8/6PP/6K1 w - - 0 1',
      steps: [
        { move: 'Qg8+', text: 'The decoy: the queen goes to g8 with check.' },
        { move: 'Rxg8', text: 'Forced — g8 is guarded by the knight, so the king cannot capture.' },
        { move: 'Nf7#', text: 'The king is surrounded by its own pieces: smothered mate.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '5r1k/6pp/4Q2N/8/8/8/6PP/6K1 w - - 0 1',
      prompt: 'Mate in two.',
      solution: ['Qg8+', 'Rxg8', 'Nf7#'],
      explanation: 'Qg8+ decoys the rook to g8; Nf7 is then smothered mate.',
    },
    quiz: {
      q: 'In Philidor\'s legacy, why does the rook have to capture on g8?',
      options: ['Because it is the only legal move — the king cannot take a protected queen', 'Because rooks must always capture', 'Because the knight is pinned', 'It doesn\'t; the king can take'],
      answer: 0,
      explain: 'The knight on h6 protects g8, so Kxg8 is illegal and Rxg8 is forced.',
    },
  },
  {
    id: 'zwischenzug',
    section: 'tactics',
    title: 'Zwischenzug (in-between move)',
    level: 'Intermediate',
    body: `
<p>A <strong>zwischenzug</strong> (German for "in-between move") is an unexpected move — usually a check or a big threat — played <em>instead of</em> the "obvious" recapture. The recapture is still available afterwards, but the position has changed in your favour.</p>
<p>Before making an automatic recapture, always ask: <em>do I have a check or a threat first?</em> And when calculating your own combinations, look for the opponent's in-between moves.</p>
<p>The classic trap is the <strong>Elephant Trap</strong> in the Queen's Gambit Declined: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.cxd5 exd5 6.Nxd5? Nxd5! 7.Bxd8 and now Black does <em>not</em> recapture at once.</p>`,
    keyPoints: ['Before recapturing, look for checks and threats.', 'The in-between move changes the position before the recapture.', 'Anticipate your opponent\'s zwischenzugs.'],
    diagram: {
      fen: ELEPHANT_7,
      caption: 'White has just taken the queen on d8. The automatic recapture is …Kxd8 — but there is something better first.',
    },
    example: {
      title: 'The Elephant Trap',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      steps: [
        { move: 'd4', text: '' }, { move: 'd5', text: '' }, { move: 'c4', text: '' }, { move: 'e6', text: '' },
        { move: 'Nc3', text: '' }, { move: 'Nf6', text: '' }, { move: 'Bg5', text: 'Pinning the knight to the queen.' },
        { move: 'Nbd7', text: 'Setting the trap: the knight on d7 now protects f6 — and the queen is no longer the only defender.' },
        { move: 'cxd5', text: '' }, { move: 'exd5', text: '' },
        { move: 'Nxd5', text: 'Greedy: White thinks the f6-knight is pinned.' },
        { move: 'Nxd5', text: 'Black gives the queen!' },
        { move: 'Bxd8', text: 'White takes it…' },
        { move: 'Bb4+', text: '<strong>Zwischenzug!</strong> Before recapturing on d8, Black checks.' },
        { move: 'Qd2', text: 'White\'s only reasonable answer.' },
        { move: 'Bxd2+', text: 'Black wins the white queen back with check…' },
        { move: 'Kxd2', text: '' },
        { move: 'Kxd8', text: '…and only now recaptures on d8. Black is a piece up.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: ELEPHANT_7,
      prompt: 'White just played Bxd8, taking your queen. Find the in-between move that wins material.',
      solution: ['Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'],
      hint: 'A check comes first.',
      explanation: 'Bb4+ Qd2 Bxd2+ Kxd2 Kxd8 leaves Black a piece up (Stockfish 19: about −5.8). Recapturing at once with …Kxd8 would leave Black a piece down.',
    },
    quiz: {
      q: 'What should you ask yourself before making an "obvious" recapture?',
      options: ['Is there a check or strong threat I can play first?', 'Can I offer a draw?', 'Which piece is prettier?', 'Nothing — always recapture immediately'],
      answer: 0,
      explain: 'An in-between check or threat can change the outcome of an exchange.',
    },
  },
  {
    id: 'back-rank',
    section: 'tactics',
    title: 'Back-rank tactics',
    level: 'Beginner',
    body: `
<p>A king that has castled behind three unmoved pawns (f, g, h) has no escape squares. A rook or queen landing on the back rank then gives <strong>back-rank mate</strong>.</p>
<p>Back-rank weakness also enables other tactics: a defender of the back rank is often <em>overloaded</em>, and a sacrifice can remove or deflect it.</p>
<p>Defensive habit: when the middlegame calms down, make <strong>luft</strong> ("air") with a pawn move such as h3 (or …h6), or keep a piece guarding the back rank.</p>`,
    keyPoints: ['Three unmoved pawns in front of the king = danger.', 'Count back-rank defenders vs attackers.', 'Make luft in time.'],
    diagram: {
      fen: '4r1k1/3q1ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1',
      caption: 'The rook on e8 guards Black\'s back rank, and only the queen on d7 protects it.',
      marks: { e8: 'bad' },
    },
    example: {
      title: 'Overloading the back-rank defender',
      fen: '4r1k1/3q1ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1',
      steps: [
        { move: 'Qxe8+', text: 'The queen takes the rook with check.' },
        { move: 'Qxe8', text: 'Black must recapture…' },
        { move: 'Rxe8#', text: '…and the back rank collapses: checkmate.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '4r1k1/3q1ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1',
      prompt: 'Mate in two.',
      solution: ['Qxe8+', 'Qxe8', 'Rxe8#'],
      explanation: 'Qxe8+ Qxe8 Rxe8#. Black\'s king is trapped by its own pawns.',
    },
    quiz: {
      q: 'Which pawn move typically gives a castled king "luft"?',
      options: ['a3', 'h3 (or g3)', 'e4', 'c4'],
      answer: 1,
      explain: 'Moving the h- or g-pawn creates an escape square for the king.',
    },
  },
  {
    id: 'mating-patterns',
    section: 'tactics',
    title: 'Basic mating patterns',
    level: 'Beginner',
    body: `
<p>Most checkmates follow a small number of recurring patterns. Recognising them lets you see mates instantly instead of calculating from scratch:</p>
<ul>
<li><strong>Back-rank mate</strong> — a rook or queen mates a king trapped behind its own pawns.</li>
<li><strong>Smothered mate</strong> — a knight mates a king surrounded by its own pieces.</li>
<li><strong>Arabian mate</strong> — rook and knight: the rook mates next to the king while the knight guards the rook and the remaining escape square.</li>
<li><strong>Queen and king (or support) mate</strong> — the queen checks next to the king, protected by another piece.</li>
<li><strong>Anastasia's mate</strong> — knight and rook trap the king on the edge.</li>
<li><strong>Boden's mate</strong> — two bishops on crossing diagonals mate a king castled queenside.</li>
</ul>`,
    keyPoints: ['Learn patterns, not just individual puzzles.', 'Edge and corner kings are most vulnerable.', 'Count the escape squares.'],
    diagram: {
      fen: '7k/R7/5N2/8/8/8/8/6K1 w - - 0 1',
      caption: 'Arabian mate: Rh7# — the knight on f6 covers g8 and protects h7.',
      arrows: ['a7h7'],
      marks: { g8: 'info', h7: 'good' },
    },
    example: {
      title: 'Queen and king mate',
      fen: '6k1/8/6K1/8/8/8/8/1Q6 w - - 0 1',
      steps: [
        { move: 'Qb8#', text: 'The queen checks along the back rank. f7, g7 and h7 are covered by the white king, so this is mate.' },
      ],
    },
    exercise: {
      type: 'mate',
      fen: '7k/R7/5N2/8/8/8/8/6K1 w - - 0 1',
      prompt: 'Mate in one (the Arabian mate).',
      explanation: 'Rh7#: the rook checks from h7, protected by the knight, which also controls g8.',
    },
    quiz: {
      q: 'Which pattern features a knight mating a king boxed in by its own pieces?',
      options: ['Back-rank mate', 'Smothered mate', 'Boden\'s mate', 'Anastasia\'s mate'],
      answer: 1,
      explain: 'A smothered mate is delivered by a knight to a king with no free squares.',
    },
  },
];
