// Chess fundamentals. Every position, example move and exercise is checked by
// tests/lessons.test.mjs (legality with chess.js; engine checks with Stockfish 19).
export default [
  {
    id: 'piece-movement',
    section: 'fundamentals',
    title: 'How the pieces move',
    level: 'Beginner',
    body: `
<p>Each side starts with sixteen pieces: a king, a queen, two rooks, two bishops, two knights and eight pawns. White always moves first, and the players then alternate, one move each.</p>
<ul>
<li><strong>King</strong> — one square in any direction. It may never move to a square attacked by the opponent.</li>
<li><strong>Queen</strong> — any number of squares in a straight line: along ranks, files or diagonals. It is the strongest piece (worth about 9 pawns).</li>
<li><strong>Rook</strong> — any number of squares along a rank or file (about 5 pawns).</li>
<li><strong>Bishop</strong> — any number of squares diagonally, so it stays on one square colour for the whole game (about 3 pawns).</li>
<li><strong>Knight</strong> — an "L": two squares in one direction and one square sideways. It is the only piece that jumps over other pieces (about 3 pawns).</li>
<li><strong>Pawn</strong> — one square straight forward (two from its starting square), but it <em>captures</em> one square diagonally forward. Pawns never move backwards.</li>
</ul>
<p>Queens, rooks and bishops are <em>long-range</em> pieces: they are blocked by any piece in their path. A piece captures by moving onto a square occupied by an enemy piece, which is removed from the board.</p>`,
    keyPoints: ['Only the knight jumps.', 'Pawns move straight but capture diagonally.', 'Approximate values: pawn 1, knight 3, bishop 3, rook 5, queen 9.'],
    diagram: {
      fen: '8/8/8/8/3N4/8/8/4K2k w - - 0 1',
      caption: 'The knight on d4 attacks the eight highlighted squares — an "L" shape in every direction.',
      marks: { c6: 'good', e6: 'good', f5: 'good', f3: 'good', e2: 'good', c2: 'good', b3: 'good', b5: 'good' },
    },
    example: {
      title: 'Pieces coming into play',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      steps: [
        { move: 'e4', text: 'A pawn on its starting square may advance two squares. This opens lines for the queen and the f1-bishop.' },
        { move: 'e5', text: 'Black does the same. The pawns now block each other: pawns cannot capture straight ahead.' },
        { move: 'Nf3', text: 'The knight jumps over the pawns. From f3 it attacks the pawn on e5.' },
        { move: 'Nc6', text: 'Black defends e5 with a knight.' },
        { move: 'Bc4', text: 'The bishop travels diagonally from f1 to c4, aiming at f7.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '4k3/8/8/3r4/8/4N3/8/4K3 w - - 0 1',
      prompt: 'The black rook on d5 is undefended. Capture it with your knight.',
      solution: ['Nxd5'],
      explanation: 'From e3 the knight attacks c2, c4, d1, d5, f1, f5, g2 and g4 — d5 is one of its "L" squares.',
    },
    quiz: {
      q: 'Which piece can jump over other pieces?',
      options: ['The queen', 'The knight', 'The bishop', 'The rook'],
      answer: 1,
      explain: 'Only the knight jumps. All other pieces are blocked by pieces in their path.',
    },
  },
  {
    id: 'legal-moves',
    section: 'fundamentals',
    title: 'Legal moves and pins',
    level: 'Beginner',
    body: `
<p>A move is <strong>legal</strong> when the piece moves according to its rules <em>and</em> your own king is not left in check afterwards. That second condition is easy to forget:</p>
<ul>
<li>You may not move your king onto an attacked square.</li>
<li>A piece that shields your king from an enemy line-piece is <strong>pinned</strong>: moving it off that line would expose the king, so such moves are illegal.</li>
<li>When you are in check, the only legal moves are those that end the check.</li>
</ul>
<p>Counting legal moves is a good habit for spotting how restricted a position is. This app's <em>Legal moves</em> counter (Analysis tab) is computed by the rules library, never estimated: in the starting position there are exactly 20 (16 pawn moves and 4 knight moves).</p>`,
    keyPoints: ['A move that leaves your own king in check is illegal.', 'An absolutely pinned piece can only move along the pin line, if at all.'],
    diagram: {
      fen: '4r1k1/8/8/8/8/8/4B3/4K3 w - - 0 1',
      caption: 'The bishop on e2 is pinned by the rook on e8: if it moved, the white king would be in check.',
      arrows: ['e8e2'],
      marks: { e2: 'bad' },
    },
    example: {
      title: 'Why some moves are missing',
      fen: '4r1k1/8/8/8/8/8/4B3/4K3 w - - 0 1',
      intro: 'White has a king and a bishop.',
      steps: [
        { move: null, text: 'The bishop normally has many diagonal moves, but every one of them would leave the e-file open and put the white king in check. So the bishop has <strong>zero</strong> legal moves.' },
        { move: 'Kd2', text: 'The king can still move: d1, d2, f1 and f2 are not attacked. Here White plays Kd2 — now the bishop is no longer pinned.' },
        { move: 'Kf7', text: 'Black brings the king closer.' },
        { move: 'Bc4+', text: 'With the king off the e-file, the bishop is free again and even gives check.' },
      ],
    },
    exercise: {
      type: 'count',
      kind: 'legal',
      fen: '4r1k1/8/8/8/8/8/4B3/4K3 w - - 0 1',
      prompt: 'How many legal moves does White have in this position?',
      explanation: 'Only king moves are legal (d1, d2, f1, f2): the pinned bishop cannot move at all.',
    },
    quiz: {
      q: 'Your knight stands between your king and an enemy bishop on the same diagonal. What can the knight do?',
      options: ['Move anywhere it likes', 'Nothing: every knight move leaves the diagonal and exposes the king', 'Only capture pieces', 'Move one square'],
      answer: 1,
      explain: 'A knight always leaves the line it stands on, so an absolutely pinned knight has no legal moves.',
    },
  },
  {
    id: 'check-mate-stalemate',
    section: 'fundamentals',
    title: 'Check, checkmate and stalemate',
    level: 'Beginner',
    body: `
<p><strong>Check</strong>: the king is attacked. The player in check must get out of it immediately, in one of three ways: <em>move</em> the king to a safe square, <em>capture</em> the checking piece, or <em>block</em> the line of a long-range checker.</p>
<p><strong>Checkmate</strong>: the king is in check and there is no legal way out. The game ends and the side that delivered mate wins.</p>
<p><strong>Stalemate</strong>: the side to move is <em>not</em> in check but has <em>no legal move</em>. The game ends immediately in a <strong>draw</strong> — a common way to throw away a winning position, especially with a queen against a lone king.</p>`,
    keyPoints: ['In check: move, capture or block.', 'Checkmate = check + no legal move.', 'Stalemate = no check + no legal move = draw.'],
    diagram: {
      fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
      caption: 'Stalemate! Black to move is not in check, but every king move (g8, g7, h7) is attacked. The game is drawn.',
      marks: { h8: 'info', g8: 'bad', g7: 'bad', h7: 'bad' },
    },
    example: {
      title: 'How NOT to finish',
      fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1',
      intro: 'White has king and queen against a lone king and wants to finish the game.',
      steps: [
        { move: 'Qf7', text: 'A natural-looking move — but a blunder. Black is not in check, and g8, g7 and h7 are all covered. Black has no legal move: <strong>stalemate</strong>, and the game is a draw. Compare with the exercise below, where the right move mates.' },
      ],
    },
    exercise: {
      type: 'mate',
      fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1',
      prompt: 'Deliver checkmate in one move. Beware of stalemate!',
      hint: 'The black king is stuck on the edge. Check it along the back rank or on the diagonal, while your king guards the escape squares.',
      explanation: 'For example Qf8# (back rank: g7 and h7 are covered by your king) or Qb1-type checks fail because the king escapes. Qf7 would be stalemate.',
    },
    quiz: {
      q: 'Black has only a king. It is Black to move, Black is not in check, and every king move is to an attacked square. What is the result?',
      options: ['White wins by checkmate', 'Black must pass', 'Draw by stalemate', 'Black loses on time'],
      answer: 2,
      explain: 'No legal move without being in check is stalemate, which is a draw.',
    },
  },
  {
    id: 'castling',
    section: 'fundamentals',
    title: 'Castling',
    level: 'Beginner',
    body: `
<p>Castling is a special move of the king and a rook, made in one turn: the king moves <strong>two squares</strong> towards a rook, and that rook jumps to the square the king passed over. Kingside castling is written <code>O-O</code>, queenside <code>O-O-O</code>.</p>
<p>Castling is allowed only when <strong>all</strong> of these are true:</p>
<ol>
<li>Neither the king nor that rook has moved earlier in the game.</li>
<li>All squares between the king and the rook are empty.</li>
<li>The king is not in check.</li>
<li>The king does not pass through, or land on, a square attacked by the opponent. (The rook may pass an attacked square — on the queenside the b-file square can be attacked.)</li>
</ol>
<p>Castling tucks the king away from the centre and brings a rook towards the middle, so it is usually played early in the game.</p>`,
    keyPoints: ['King moves two squares; the rook jumps over it.', 'Not out of, through, or into check.', 'King and rook must not have moved.'],
    diagram: {
      fen: '4k3/8/8/8/2b5/8/PPP2PPP/R3K2R w KQ - 0 1',
      caption: 'The black bishop attacks f1, so White may NOT castle kingside (the king would pass through f1). Queenside castling is legal.',
      arrows: ['c4f1'],
      marks: { f1: 'bad' },
    },
    example: {
      title: 'Both sides castle',
      fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1',
      steps: [
        { move: 'O-O', text: 'White castles kingside: the king goes e1→g1 and the rook h1→f1.' },
        { move: 'O-O-O', text: 'Black castles queenside: the king goes e8→c8 and the rook a8→d8. The kings now stand on opposite wings.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'castle',
      fen: '4k3/8/8/8/2b5/8/PPP2PPP/R3K2R w KQ - 0 1',
      prompt: 'Castle on the side where it is legal.',
      solutionText: 'O-O-O is the only legal castling move: kingside castling would take the king through f1, which the bishop attacks.',
      explanation: 'The board only offers legal moves, so try dragging the king two squares to each side.',
    },
    quiz: {
      q: 'Your king is in check. Can you castle to escape?',
      options: ['Yes, castling always escapes check', 'No, you may not castle out of check', 'Only queenside', 'Only if the rook has not moved'],
      answer: 1,
      explain: 'Castling is illegal while in check, and also if the king would pass through or land on an attacked square.',
    },
  },
  {
    id: 'en-passant',
    section: 'fundamentals',
    title: 'En passant',
    level: 'Beginner',
    body: `
<p>When a pawn advances <strong>two squares</strong> from its starting square and lands right beside an enemy pawn, that enemy pawn may capture it <em>as if it had moved only one square</em>. This is <strong>en passant</strong> ("in passing").</p>
<ul>
<li>The capturing pawn moves diagonally to the square the other pawn skipped over.</li>
<li>The captured pawn is removed from the square where it actually stands.</li>
<li>The capture must be made <strong>immediately</strong>, on the very next move, or the right is lost.</li>
</ul>
<p>In FEN notation the fourth field shows the en passant target square (for example <code>d6</code>) right after a two-square pawn move.</p>`,
    keyPoints: ['Only pawns, only right after a two-square advance.', 'Capture onto the skipped square.', 'Now or never.'],
    diagram: {
      fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
      caption: 'Black just played d7–d5. The white pawn on e5 may capture en passant: exd6.',
      arrows: ['e5d6'],
      marks: { d5: 'bad' },
    },
    example: {
      title: 'The en passant capture',
      fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1',
      steps: [
        { move: 'd5', text: 'Black advances two squares, trying to slip past the white pawn on e5.' },
        { move: 'exd6', text: 'White captures en passant: the pawn goes to d6 and the black pawn on d5 is removed.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
      prompt: 'Black has just played …d7–d5. Capture the pawn en passant.',
      solution: ['exd6'],
      explanation: 'exd6 removes the d5-pawn. If White waits one move, the chance is gone.',
    },
    quiz: {
      q: 'A black pawn moved two squares last turn and you did not capture it en passant. Can you do it later?',
      options: ['Yes, any time', 'Only if it is check', 'No, the right expires after one move', 'Only with a knight'],
      answer: 2,
      explain: 'En passant is only possible on the move immediately after the two-square advance.',
    },
  },
  {
    id: 'promotion',
    section: 'fundamentals',
    title: 'Pawn promotion',
    level: 'Beginner',
    body: `
<p>A pawn that reaches the last rank must be <strong>promoted</strong>: it is replaced by a queen, rook, bishop or knight of the same colour (never a king or a pawn). You may promote to a piece even if you still have the original one, so you can have two or more queens.</p>
<p>Almost always you choose a queen. Choosing anything else is an <strong>underpromotion</strong>; it is right when:</p>
<ul>
<li>a <strong>knight</strong> gives a check or fork that a queen cannot, or</li>
<li>a queen would cause <strong>stalemate</strong>, but a rook or bishop does not.</li>
</ul>
<p>In this app, moving a pawn to the last rank opens a small promotion picker.</p>`,
    keyPoints: ['Promotion is compulsory on the last rank.', 'Queen is usually best — but check for knight forks and stalemate.'],
    diagram: {
      fen: '8/2P5/1q1k4/8/8/8/6P1/7K w - - 0 1',
      caption: 'Promoting to a queen gains little here — but a knight on c8 would check the king on d6 and attack the queen on b6.',
      marks: { c8: 'good', d6: 'bad', b6: 'bad' },
    },
    example: {
      title: 'A pawn walks to promotion',
      fen: '8/8/8/8/8/1P5k/8/K7 w - - 0 1',
      steps: [
        { move: 'b4', text: 'The black king is far away on h3.' },
        { move: 'Kg4', text: '' },
        { move: 'b5', text: '' },
        { move: 'Kf5', text: '' },
        { move: 'b6', text: '' },
        { move: 'Ke6', text: '' },
        { move: 'b7', text: '' },
        { move: 'Kd7', text: 'Too late.' },
        { move: 'b8=Q', text: 'The pawn promotes to a queen. Whether a king can catch a pawn is calculated with the "square of the pawn" (Endgames section).' },
      ],
    },
    exercise: {
      type: 'line',
      fen: '8/2P5/1q1k4/8/8/8/6P1/7K w - - 0 1',
      prompt: 'Promote the pawn in the strongest way.',
      solution: ['c8=N+'],
      hint: 'Which piece would attack both the king on d6 and the queen on b6 from c8?',
      explanation: 'c8=N+ forks king and queen; after the king moves, Nxb6 wins the queen. Stockfish 19 rates c8=N+ as winning, while c8=Q leads only to an equal queen ending.',
    },
    quiz: {
      q: 'Which pieces may a pawn promote to?',
      options: ['Queen only', 'Queen, rook, bishop or knight', 'Any piece including a king', 'Any piece you have lost'],
      answer: 1,
      explain: 'Queen, rook, bishop or knight, regardless of which pieces are still on the board.',
    },
  },
  {
    id: 'draws',
    section: 'fundamentals',
    title: 'Draws and repetition',
    level: 'Beginner',
    body: `
<p>A game can end in a draw in several ways:</p>
<ul>
<li><strong>Stalemate</strong> — the side to move has no legal move and is not in check.</li>
<li><strong>Insufficient material</strong> — neither side can possibly checkmate: king vs king, king + bishop vs king, king + knight vs king, or king + bishop vs king + bishop with bishops on the same colour.</li>
<li><strong>Threefold repetition</strong> — the same position (same pieces, same side to move, same castling and en passant rights) occurs three times; the player to move can claim a draw. Under FIDE rules a <em>fivefold</em> repetition ends the game automatically.</li>
<li><strong>Fifty-move rule</strong> — see the next lesson.</li>
<li><strong>Agreement</strong> — both players agree to a draw.</li>
</ul>
<p>Repetition is often reached through <strong>perpetual check</strong>: a side that is losing material keeps checking the enemy king and the opponent cannot escape the checks.</p>`,
    keyPoints: ['Stalemate and insufficient material end the game at once.', 'Threefold repetition can be claimed; fivefold is automatic (FIDE).'],
    diagram: {
      fen: '8/8/4k3/8/8/2KB4/8/8 w - - 0 1',
      caption: 'King and bishop against king: checkmate is impossible, so the game is drawn by insufficient material.',
    },
    example: {
      title: 'Repetition by perpetual check',
      fen: '6k1/6p1/5p2/7Q/8/r7/1q4PP/7K w - - 0 1',
      intro: 'Black is a rook up, but the black king is exposed.',
      steps: [
        { move: 'Qe8+', text: 'Check. The only legal reply is Kh7.' },
        { move: 'Kh7', text: '' },
        { move: 'Qh5+', text: 'Check again; the only legal reply is Kg8.' },
        { move: 'Kg8', text: 'The starting position has occurred for the second time.' },
        { move: 'Qe8+', text: '' },
        { move: 'Kh7', text: '' },
        { move: 'Qh5+', text: '' },
        { move: 'Kg8', text: 'Third occurrence of the same position: White can claim a draw by threefold repetition. Black cannot escape the checks — a <strong>perpetual check</strong>.' },
      ],
    },
    exercise: {
      type: 'classify',
      fen: '8/8/4k3/8/8/2KB4/8/8 w - - 0 1',
      prompt: 'Decide the status of each position. The app checks your answer with the rules library.',
      positions: [
        { fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', explain: 'Black is not in check and has no legal move: stalemate.' },
        { fen: '8/8/4k3/8/8/2KB4/8/8 w - - 0 1', explain: 'King and bishop cannot force (or even help) mate against a bare king.' },
        { fen: '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1', explain: 'The queen on g7 checks, is protected by the king, and h8 has no escape: checkmate.' },
        { fen: '8/8/4k3/8/8/2KN4/8/7R w - - 0 1', explain: 'A rook is enough to mate, so play continues.' },
      ],
      explanation: 'These verdicts come from the rules library, the same one that drives the board.',
    },
    quiz: {
      q: 'Which of these is NOT automatically a draw?',
      options: ['King vs king', 'Stalemate', 'King + rook vs king', 'King + knight vs king'],
      answer: 2,
      explain: 'King and rook can force checkmate, so the game continues.',
    },
  },
  {
    id: 'fifty-move',
    section: 'fundamentals',
    title: 'The fifty-move rule',
    level: 'Beginner',
    body: `
<p>If <strong>fifty consecutive moves by each player</strong> (100 half-moves) are made without any pawn move and without any capture, a player may claim a draw. Under FIDE rules, after <strong>75 moves</strong> each (150 half-moves) the game is drawn automatically.</p>
<p>The rule stops a game from going on forever when one side cannot make progress. It matters in long endgames such as king + rook vs king + bishop, and you must know how to mate with king + queen or king + rook well within 50 moves.</p>
<p>FEN records the count in its fifth field, the <strong>half-move clock</strong>: it resets to 0 after any pawn move or capture and otherwise increases by one every half-move.</p>`,
    keyPoints: ['50 moves each = 100 half-moves with no pawn move or capture.', 'Claimable at 50, automatic at 75 (FIDE).', 'The FEN half-move clock tracks it.'],
    diagram: {
      fen: '8/8/4k3/8/8/3K4/8/7R w - - 100 120',
      caption: 'The half-move clock (fifth FEN field) reads 100: a draw can be claimed even though White has an extra rook.',
    },
    example: {
      title: 'What resets the clock',
      fen: '8/4k3/8/8/8/2K5/4P3/7R w - - 40 80',
      intro: 'Half-move clock: 40.',
      steps: [
        { move: 'Rh7+', text: 'A rook move: the half-move clock becomes 41.' },
        { move: 'Kd6', text: 'A king move: 42.' },
        { move: 'e4', text: 'A pawn move: the clock resets to 0. A capture would also reset it.' },
      ],
    },
    exercise: {
      type: 'classify',
      fen: '8/8/4k3/8/8/3K4/8/7R w - - 100 120',
      prompt: 'Look at the half-move clock in each position (shown below the board as part of the FEN in the Analysis tab, and in the note) and pick the status.',
      positions: [
        { fen: '8/8/4k3/8/8/3K4/8/7R w - - 100 120', note: 'half-move clock 100', explain: 'With 100 half-moves without pawn moves or captures, a draw can be claimed.' },
        { fen: '8/8/4k3/8/8/3K4/8/7R w - - 99 120', note: 'half-move clock 99', explain: 'Not yet: the claim needs 100 half-moves.' },
      ],
      explanation: 'The rules library reads the half-move clock directly from the FEN.',
    },
    quiz: {
      q: 'Which move resets the fifty-move counter?',
      options: ['A king move', 'Castling', 'A pawn move or any capture', 'A check'],
      answer: 2,
      explain: 'Only pawn moves and captures reset the count.',
    },
  },
];
