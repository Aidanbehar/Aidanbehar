// Positional chess. Exercises here are verified by rules computed from the
// position (outposts, open files, pawn islands, mobility…) in learn-rules.js.
import { after } from './util.js';

const OUTPOST_POS = 'r2q1rk1/pp2bppp/2np1n2/4p3/4P3/1NN1B3/PPP2PPP/R2Q1RK1 w - - 0 1';
const WEAK_POS = 'r1bq1rk1/pp3ppp/3p1n2/2p1p3/2P1P3/2NP4/PP3PPP/R2QKB1R w KQ - 0 1';

export default [
  {
    id: 'piece-activity',
    section: 'positional',
    title: 'Piece activity',
    level: 'Beginner',
    body: `
<p>A piece is <strong>active</strong> when it controls many squares, especially central squares and squares in the enemy camp; it is <strong>passive</strong> when it is hemmed in by pawns, stuck on the edge, or tied to defence.</p>
<p>Material counts (knight = 3) are averages. An active knight on a central square can be worth much more than a knight on the rim. "A knight on the rim is dim": in a corner a knight has only 2 moves, in the centre up to 8.</p>
<p>A simple measure of activity is <strong>mobility</strong> — the number of legal moves a piece has. The rules library counts it exactly.</p>`,
    keyPoints: ['Centralised pieces control more squares.', 'Mobility (legal moves) is a quick activity check.', 'A passive piece is a target for improvement.'],
    diagram: {
      fen: '6k1/5ppp/8/8/3N4/8/5PPP/N5K1 w - - 0 1',
      caption: 'Same piece, different value: the knight on d4 has 8 squares, the knight on a1 only 2.',
      marks: { d4: 'good', a1: 'bad' },
    },
    example: {
      title: 'Rerouting a rim knight',
      fen: '6k1/5ppp/8/8/8/3B4/5PPP/N5K1 w - - 0 1',
      steps: [
        { move: 'Nc2', text: 'From a1 the knight heads for the centre.' },
        { move: 'Kf8', text: '' },
        { move: 'Nd4', text: 'On d4 the knight controls eight squares, including e6, f5 and c6 in Black\'s half.' },
      ],
    },
    exercise: {
      type: 'count',
      kind: 'mobility:a1',
      fen: '6k1/5ppp/8/8/8/3B4/5PPP/N5K1 w - - 0 1',
      prompt: 'How many legal moves does the knight on a1 have?',
      explanation: 'Only b3 and c2. Compare that with eight from a central square.',
    },
    quiz: {
      q: 'Why is "a knight on the rim dim"?',
      options: ['Knights cannot move on the edge', 'An edge knight controls far fewer squares than a central one', 'It can be captured by the king', 'Edge squares are always weak'],
      answer: 1,
      explain: 'A knight on the edge has at most 4 moves (2 in a corner) instead of up to 8.',
    },
  },
  {
    id: 'development',
    section: 'positional',
    title: 'Development',
    level: 'Beginner',
    body: `
<p><strong>Development</strong> means bringing pieces from their starting squares into play. In the opening, the side with more pieces developed usually has the initiative.</p>
<ul>
<li>Develop knights and bishops early — usually knights before bishops, towards the centre.</li>
<li>Move each piece once if possible; repeated moves with the same piece cost time ("tempi").</li>
<li>Don't block your central pawns or other pieces (e.g. a bishop on d3 in front of an unmoved d2-pawn).</li>
<li>Connect your rooks by castling and moving the queen off the back rank.</li>
</ul>`,
    keyPoints: ['Minor pieces first, towards the centre.', 'Count tempi: every move should add something.', 'Castle and connect the rooks.'],
    diagram: {
      fen: after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'O-O'),
      caption: 'Italian Game: both sides have developed knights and bishops; White has already castled.',
    },
    example: {
      title: 'Natural development',
      fen: after(),
      steps: [
        { move: 'e4', text: 'A central pawn opens lines for the queen and bishop.' },
        { move: 'e5', text: '' },
        { move: 'Nf3', text: 'A knight comes out with a threat (e5).' },
        { move: 'Nc6', text: 'Black develops while defending.' },
        { move: 'Bc4', text: 'The bishop takes an active diagonal towards f7.' },
        { move: 'Bc5', text: 'Black mirrors.' },
        { move: 'O-O', text: 'White castles: the king is safe and the rook joins the game.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'develop',
      fen: after('e4', 'e5', 'Nf3', 'Nc6'),
      prompt: 'Develop a minor piece (a knight or a bishop).',
      solutionText: 'For example Bc4, Bb5 or Nc3 — any knight or bishop leaving the first rank counts.',
      explanation: 'Developing moves bring new pieces into the game; pawn moves and queen moves usually wait.',
    },
    quiz: {
      q: 'Which move is generally the worst choice in the opening?',
      options: ['Developing a knight', 'Moving the same piece three times without reason', 'Castling', 'Occupying the centre with a pawn'],
      answer: 1,
      explain: 'Repeated moves lose time while the opponent develops.',
    },
  },
  {
    id: 'king-safety',
    section: 'positional',
    title: 'King safety',
    level: 'Beginner',
    body: `
<p>In the opening and middlegame the king is a liability: a single exposed king can lose the game regardless of material. The main tools for keeping it safe:</p>
<ul>
<li><strong>Castle early</strong>, before the centre opens.</li>
<li>Keep the <strong>pawn shield</strong> (f, g, h pawns for a kingside castle) intact; every pawn move there creates permanent weaknesses.</li>
<li>Keep a <strong>defending minor piece</strong> nearby — a knight on f3/f6 is a classic defender of h2/h7.</li>
<li>Watch open files and diagonals pointing at your king.</li>
</ul>
<p>In the <strong>endgame</strong> the situation reverses: with queens off, the king becomes a strong fighting piece and should march to the centre.</p>`,
    keyPoints: ['Castle before the centre opens.', 'Pawn shield + defending knight.', 'In the endgame, activate the king.'],
    diagram: {
      fen: after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'),
      caption: 'White should castle now: the e-file may open after d4.',
    },
    example: {
      title: 'Castle before opening the centre',
      fen: after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'),
      steps: [
        { move: 'O-O', text: 'King to safety first.' },
        { move: 'O-O', text: 'Black too.' },
        { move: 'd4', text: 'Only now does White open the centre.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'castle',
      fen: after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'),
      prompt: 'Secure your king.',
      solutionText: 'O-O (kingside castling).',
      explanation: 'Castling connects the rooks and moves the king away from the centre, where files are about to open.',
    },
    quiz: {
      q: 'In a queenless endgame, what should the king usually do?',
      options: ['Stay in the corner', 'Become active and head for the centre', 'Hide behind pawns', 'Castle'],
      answer: 1,
      explain: 'Without queens, mating attacks are rare and the king is a strong piece.',
    },
  },
  {
    id: 'pawn-structure',
    section: 'positional',
    title: 'Pawn structure',
    level: 'Intermediate',
    body: `
<p>Pawns cannot move backwards, so pawn weaknesses are often <strong>permanent</strong>. The pawn structure largely decides where the pieces belong and which plans make sense.</p>
<ul>
<li><strong>Isolated pawn</strong> — no friendly pawn on either neighbouring file. It cannot be protected by pawns, and the square in front of it is a good blockading post for the opponent.</li>
<li><strong>Doubled pawns</strong> — two pawns on the same file. They cannot protect each other and are hard to advance.</li>
<li><strong>Backward pawn</strong> — a pawn behind its neighbours that cannot safely advance.</li>
<li><strong>Passed pawn</strong> — no enemy pawn can stop it on its own or neighbouring files; a strength, especially in endgames.</li>
<li><strong>Pawn islands</strong> — groups of connected pawns; fewer islands is generally better.</li>
</ul>`,
    keyPoints: ['Pawn weaknesses last.', 'Isolated and doubled pawns are targets.', 'Passed pawns are assets.'],
    diagram: {
      fen: '4k3/p2p1ppp/8/8/3P4/8/P4PPP/4K3 w - - 0 1',
      caption: 'White\'s a2- and d4-pawns are isolated: no white pawns on the b-, c- or e-files.',
      marks: { a2: 'bad', d4: 'bad' },
    },
    example: {
      title: 'Doubling pawns by exchange',
      fen: after('e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'),
      steps: [
        { move: 'Bxc6', text: 'In the Exchange Ruy Lopez White gives up the bishop…' },
        { move: 'dxc6', text: '…and Black gets doubled c-pawns (in return Black gets the bishop pair and open lines).' },
      ],
    },
    exercise: {
      type: 'squares',
      kind: 'isolated',
      color: 'w',
      fen: '4k3/p2p1ppp/8/8/3P4/8/P4PPP/4K3 w - - 0 1',
      prompt: 'Select all of White\'s isolated pawns.',
      explanation: 'A pawn is isolated when there is no friendly pawn on either adjacent file.',
    },
    quiz: {
      q: 'Why is the square in front of an isolated pawn often good for the opponent?',
      options: ['Because no pawn can ever attack a piece placed there', 'Because it is always a light square', 'Because the king must stand there', 'It isn\'t'],
      answer: 0,
      explain: 'With no pawns on the neighbouring files, a blockading piece there can only be challenged by pieces.',
    },
  },
  {
    id: 'weak-squares',
    section: 'positional',
    title: 'Weak squares',
    level: 'Intermediate',
    body: `
<p>A <strong>weak square</strong> (or "hole") is a square that can no longer be defended by a pawn, because the pawns on the neighbouring files have advanced past it or disappeared. Pieces placed on such squares cannot be chased away by pawns.</p>
<p>Weak squares typically appear after pawn moves like …e5 and …d6 with the c-pawn gone (d5 becomes weak) or after …g6 and …h6 (f6 and h6 weaken). Plan: <em>identify the hole, then bring a piece — ideally a knight — to it.</em></p>`,
    keyPoints: ['Weak square = no pawn can defend it any more.', 'Knights love weak squares in the enemy camp.', 'Think twice before pushing pawns that guard key squares.'],
    diagram: {
      fen: WEAK_POS,
      caption: 'After …c5, …d6 and …e5, the d5-square can never be attacked by a black pawn.',
      marks: { d5: 'good' },
    },
    example: {
      title: 'Occupying the hole',
      fen: WEAK_POS,
      steps: [
        { move: 'Nd5', text: 'The knight lands on d5, supported by the c4- and e4-pawns. No black pawn can ever drive it away.' },
        { move: 'Nxd5', text: 'Black can trade it…' },
        { move: 'cxd5', text: '…but after cxd5 White has a protected, space-gaining pawn on d5 and pressure down the half-open c-file. Often the defender must give up a good piece just to remove such a knight.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'outpost-occupy',
      fen: WEAK_POS,
      prompt: 'Put a piece on the weak square in Black\'s camp.',
      solutionText: 'Nd5 — d5 is supported by your pawns and can never be attacked by a black pawn.',
      explanation: 'The app computes the weak squares from the pawn structure, not from a stored answer.',
    },
    quiz: {
      q: 'After Black plays …e5 and …c5 (with no b- or f-pawn issues), which square tends to become weak?',
      options: ['d5', 'h8', 'a1', 'e5'],
      answer: 0,
      explain: 'The d5-square can no longer be covered by the c- or e-pawn.',
    },
  },
  {
    id: 'open-files',
    section: 'positional',
    title: 'Open files',
    level: 'Beginner',
    body: `
<p>A file with <strong>no pawns</strong> is <em>open</em>; a file with only enemy pawns is <em>half-open</em> (for you). Rooks belong on open and half-open files, where they can penetrate to the 7th rank or pressure weak pawns.</p>
<p>Fights for an open file are common: the side that <strong>doubles rooks</strong> on it (or controls the entry squares) usually wins the file.</p>`,
    keyPoints: ['Open file: no pawns. Half-open: only enemy pawns.', 'Rooks belong on (half-)open files.', 'Double rooks to win a file.'],
    diagram: {
      fen: '2r2rk1/pp3ppp/4p3/8/8/4P3/PP3PPP/2R2RK1 w - - 0 1',
      caption: 'The c- and d-files are open (no pawns at all).',
    },
    example: {
      title: 'Taking the open file',
      fen: '6k1/pp3ppp/4p3/8/8/4P3/PP3PPP/R5K1 w - - 0 1',
      steps: [
        { move: 'Rc1', text: 'The rook moves to the open c-file.' },
        { move: 'Kf8', text: '' },
        { move: 'Rc7', text: 'And invades the 7th rank, attacking the b7-pawn.' },
      ],
    },
    exercise: {
      type: 'squares',
      kind: 'open-files',
      fen: '2r2rk1/pp3ppp/4p3/8/8/4P3/PP3PPP/2R2RK1 w - - 0 1',
      prompt: 'Click a square on every open file (a file with no pawns).',
      explanation: 'Open files are computed from the pawns on the board.',
    },
    quiz: {
      q: 'What is a half-open file for White?',
      options: ['A file with no pawns', 'A file with only black pawns on it', 'A file with only white pawns', 'A file with a rook on it'],
      answer: 1,
      explain: 'White has no pawn there, so White\'s rooks can attack along it.',
    },
  },
  {
    id: 'outposts',
    section: 'positional',
    title: 'Outposts',
    level: 'Intermediate',
    body: `
<p>An <strong>outpost</strong> is a square in or near the enemy half that is <em>protected by your pawn</em> and <em>cannot be attacked by an enemy pawn</em>. A knight on an outpost is often stronger than a rook.</p>
<p>The app uses this precise definition: a square on your 4th–6th rank, defended by one of your pawns, with no enemy pawn left on a neighbouring file that could still advance to attack it.</p>`,
    keyPoints: ['Protected by your pawn.', 'Never attackable by an enemy pawn.', 'Best occupied by a knight.'],
    diagram: {
      fen: OUTPOST_POS,
      caption: 'The d5-square: protected by the e4-pawn, and Black has no c- or e-pawn left that could attack it.',
      marks: { d5: 'good' },
    },
    example: {
      title: 'Heading for the outpost',
      fen: OUTPOST_POS,
      steps: [
        { move: 'Nd5', text: 'The knight occupies d5, eyeing c7, e7, f6 and b6.' },
        { move: 'Nxd5', text: '' },
        { move: 'Qxd5', text: 'If Black exchanges, White recaptures and keeps control of the square.' },
      ],
    },
    exercise: {
      type: 'squares',
      kind: 'outposts',
      color: 'w',
      fen: OUTPOST_POS,
      prompt: 'Select every outpost square for White (4th–6th rank, protected by a white pawn, never attackable by a black pawn).',
      explanation: 'The answer is computed from the pawn structure.',
    },
    quiz: {
      q: 'Which piece benefits most from an outpost?',
      options: ['The king', 'The knight', 'The rook', 'Pawns'],
      answer: 1,
      explain: 'Knights are short-range pieces that need stable advanced squares.',
    },
  },
  {
    id: 'space',
    section: 'positional',
    title: 'Space',
    level: 'Intermediate',
    body: `
<p><strong>Space</strong> is the territory you control. Advanced pawns (especially central ones) give your pieces more room to manoeuvre behind them and restrict the opponent's pieces.</p>
<p>The side with less space should seek <strong>exchanges</strong> (fewer pieces need less room) and <strong>pawn breaks</strong> that challenge the advanced pawns. The side with more space should avoid exchanges and keep the opponent cramped.</p>
<p>A rough measure: count the squares in the opponent's half that your pawns attack.</p>`,
    keyPoints: ['Advanced central pawns gain space.', 'Cramped side: trade pieces and break with pawns.', 'More space: avoid trades.'],
    diagram: {
      fen: 'r1bq1rk1/pp1nbppp/2pp1n2/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 1',
      caption: 'White\'s pawns on c4, d5 and e4 claim space; Black\'s pieces have less room.',
    },
    example: {
      title: 'Grabbing space',
      fen: after('d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'),
      steps: [
        { move: 'f4', text: 'The Four Pawns Attack against the King\'s Indian: White grabs maximum space…' },
        { move: 'O-O', text: '…and Black prepares a counter-strike in the centre (…c5 or …e5), the typical answer to a space advantage.' },
      ],
    },
    exercise: {
      type: 'count',
      kind: 'space',
      fen: 'r1bq1rk1/pp1nbppp/2pp1n2/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 1',
      prompt: 'How many squares in Black\'s half of the board (ranks 5–8) are attacked by White\'s pawns?',
      explanation: 'Count each square once, even if two pawns attack it.',
    },
    quiz: {
      q: 'You have less space. What is usually a good idea?',
      options: ['Avoid all exchanges', 'Exchange some pieces and prepare a pawn break', 'Move your king forward', 'Push all your pawns'],
      answer: 1,
      explain: 'Exchanges relieve the cramp; pawn breaks challenge the opponent\'s space.',
    },
  },
  {
    id: 'bishops',
    section: 'positional',
    title: 'Good and bad bishops',
    level: 'Intermediate',
    body: `
<p>A bishop's quality depends on <strong>your own pawns</strong>. If most of your pawns stand on the same colour as your bishop, they block it: that is a <strong>bad bishop</strong>. A bishop whose pawns are on the other colour is a <strong>good bishop</strong>.</p>
<p>Practical consequences:</p>
<ul>
<li>Put your pawns on the opposite colour of your remaining bishop.</li>
<li>Try to exchange your bad bishop, or activate it outside the pawn chain.</li>
<li>The <strong>bishop pair</strong> (both bishops) is an advantage in open positions.</li>
</ul>
<p>The app's check: a bishop is called "bad" when at least three of your pawns, and more than half of them, stand on its colour.</p>`,
    keyPoints: ['Pawns on the bishop\'s colour make it bad.', 'Place pawns on the other colour.', 'The bishop pair shines in open positions.'],
    diagram: {
      fen: '4k3/8/4p3/3pP3/3P1P2/2P5/4B3/2B1K3 w - - 0 1',
      caption: 'All four white pawns stand on dark squares: the dark-squared bishop on c1 is bad, the light-squared one on e2 is good.',
      marks: { c1: 'bad', e2: 'good' },
    },
    example: {
      title: 'Activating a bad bishop',
      fen: '4k3/8/4p3/3pP3/3P1P2/2P5/4B3/2B1K3 w - - 0 1',
      steps: [
        { move: 'Bd2', text: 'The c1-bishop is stuck behind its pawns.' },
        { move: 'Kd7', text: '' },
        { move: 'Kd1', text: 'The king makes room on e1.' },
        { move: 'Kc7', text: '' },
        { move: 'Be1', text: 'A typical manoeuvre: via e1…' },
        { move: 'Kd7', text: '' },
        { move: 'Bh4', text: '…the bishop reaches h4, outside the pawn chain, where it finally has scope.' },
      ],
    },
    exercise: {
      type: 'squares',
      kind: 'bad-bishop',
      color: 'w',
      fen: '4k3/8/4p3/3pP3/3P1P2/2P5/4B3/2B1K3 w - - 0 1',
      prompt: 'Select White\'s bad bishop(s).',
      explanation: 'Compare the bishop\'s square colour with the colour of White\'s pawns.',
    },
    quiz: {
      q: 'Your remaining bishop is light-squared. Where should your pawns usually go?',
      options: ['Light squares', 'Dark squares', 'It doesn\'t matter', 'Only on the edge'],
      answer: 1,
      explain: 'Pawns on dark squares leave the light squares open for the bishop and cover the squares it cannot.',
    },
  },
  {
    id: 'rook-activity',
    section: 'positional',
    title: 'Rook activity',
    level: 'Beginner',
    body: `
<p>Rooks are powerful but need <strong>open lines</strong>. Rules of thumb:</p>
<ul>
<li>Put rooks on open or half-open files.</li>
<li>A rook on the <strong>7th rank</strong> (2nd for Black) attacks pawns from the side and confines the enemy king.</li>
<li><strong>Rooks belong behind passed pawns</strong> — your own (to push them) and the opponent's (to stop them).</li>
<li>In endgames, an active rook is often worth a pawn: avoid passive defence.</li>
</ul>`,
    keyPoints: ['Open files and the 7th rank.', 'Behind passed pawns.', 'Active rook > passive rook, even at the cost of a pawn.'],
    diagram: {
      fen: '6k1/pp3ppp/4p3/8/8/4P3/PP3PPP/R5K1 w - - 0 1',
      caption: 'The c- and d-files are open. The rook on a1 is doing nothing.',
    },
    example: {
      title: 'To the 7th rank',
      fen: '6k1/pp3ppp/4p3/8/8/4P3/PP3PPP/R5K1 w - - 0 1',
      steps: [
        { move: 'Rd1', text: 'The rook takes the open d-file.' },
        { move: 'Kf8', text: '' },
        { move: 'Rd7', text: 'On the 7th rank it attacks b7 and a7 and cuts off the black king.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'rook-open-file',
      fen: '6k1/pp3ppp/4p3/8/8/4P3/PP3PPP/R5K1 w - - 0 1',
      prompt: 'Activate your rook: move it to an open file.',
      solutionText: 'Rc1 or Rd1 — the c- and d-files have no pawns.',
      explanation: 'The app checks that the destination file contains no pawns at all.',
    },
    quiz: {
      q: 'Where does a rook usually belong relative to a passed pawn?',
      options: ['In front of it', 'Behind it', 'Next to it', 'On the first rank'],
      answer: 1,
      explain: 'Behind the pawn, the rook\'s scope grows as the pawn advances (Tarrasch\'s rule).',
    },
  },
  {
    id: 'prophylaxis',
    section: 'positional',
    title: 'Prophylaxis',
    level: 'Intermediate',
    body: `
<p><strong>Prophylaxis</strong> means asking "what does my opponent want to do?" and preventing it before it happens. Nimzowitsch made it a cornerstone of positional play; Karpov and Petrosian were masters of it.</p>
<p>Everyday prophylaxis: making luft before a back-rank mate becomes possible, covering an entry square, or moving the king off a dangerous diagonal before the opponent opens it.</p>
<p>Make it a habit: after every opponent move, ask <em>what is the threat?</em> — and before your own move, <em>what will they do next?</em></p>`,
    keyPoints: ['Ask what the opponent wants.', 'Prevent threats before they are executed.', 'Luft, covering entry squares, king safety.'],
    diagram: {
      fen: '4r1k1/2R2ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
      caption: 'Black threatens …Re1, checkmate on the back rank.',
      arrows: ['e8e1'],
      marks: { e1: 'bad' },
    },
    example: {
      title: 'Luft in time',
      fen: '4r1k1/2R2ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
      steps: [
        { move: 'h3', text: 'White creates an escape square on h2.' },
        { move: 'Re1+', text: 'The check is now harmless…' },
        { move: 'Kh2', text: '…because the king simply steps aside.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'no-mate-in-1',
      fen: '4r1k1/2R2ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
      prompt: 'Black threatens mate in one. Play a move that stops it.',
      solutionText: 'For example h3, g3, h4, f3 or Kf1 — after any of these Black has no mating move. The app checks every Black reply.',
      explanation: 'Prophylactic thinking: find the opponent\'s threat first.',
    },
    quiz: {
      q: 'What is the first question of prophylactic thinking?',
      options: ['How can I attack?', 'What does my opponent want to do?', 'Which piece is worth most?', 'How much time is left?'],
      answer: 1,
      explain: 'Understanding the opponent\'s plan lets you prevent it.',
    },
  },
  {
    id: 'worst-piece',
    section: 'positional',
    title: 'Improving the worst-placed piece',
    level: 'Intermediate',
    body: `
<p>When there are no tactics and no obvious plan, a reliable method (often attributed to Silman and to Karpov's style) is: <strong>find your worst-placed piece and improve it.</strong></p>
<p>The worst piece is usually the one with the fewest useful moves — stuck behind pawns, on the rim, or with no targets. Rerouting it, even over several moves, often improves the whole position.</p>
<p>In this exercise the app finds your least mobile piece (fewest legal moves, kings and pawns excluded) and accepts a move of that piece that increases its mobility.</p>`,
    keyPoints: ['No plan? Improve your worst piece.', 'Mobility is a useful indicator.', 'Manoeuvres may take several moves.'],
    diagram: {
      fen: '6k1/5ppp/8/8/8/3B4/5PPP/N5K1 w - - 0 1',
      caption: 'The bishop is fine; the knight on a1 is White\'s worst piece.',
      marks: { a1: 'bad' },
    },
    example: {
      title: 'A knight journey',
      fen: '6k1/5ppp/8/8/8/3B4/5PPP/N5K1 w - - 0 1',
      steps: [
        { move: 'Nb3', text: 'The knight starts its journey.' },
        { move: 'Kf8', text: '' },
        { move: 'Nd4', text: 'Centralised, it now controls key squares on both wings.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'improve-worst',
      fen: '6k1/5ppp/8/8/8/3B4/5PPP/N5K1 w - - 0 1',
      prompt: 'Improve your worst-placed piece.',
      solutionText: 'Nb3 or Nc2 — the knight on a1 has only 2 moves; on b3 or c2 it has 6.',
      explanation: 'Mobility is computed by the rules library before and after your move.',
    },
    quiz: {
      q: 'Which piece is usually the "worst-placed"?',
      options: ['The one with the fewest useful moves', 'The queen', 'Always the king', 'The one that moved last'],
      answer: 0,
      explain: 'A piece with little scope contributes least; improving it helps most.',
    },
  },
];
