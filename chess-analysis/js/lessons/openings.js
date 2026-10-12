// Opening principles.
import { after } from './util.js';

export default [
  {
    id: 'center-control',
    section: 'openings',
    title: 'Controlling the centre',
    level: 'Beginner',
    body: `
<p>The four central squares — <strong>d4, e4, d5 and e5</strong> — are the most valuable on the board. Pieces in the centre reach both wings quickly, and a player who controls the centre restricts the opponent.</p>
<p>You can control the centre by <strong>occupying</strong> it with pawns (1.e4, 1.d4) or by <strong>influencing</strong> it from a distance with pieces (Nf3, c4, a fianchettoed bishop on g2). Modern "hypermodern" openings deliberately allow the opponent to occupy the centre and then attack it.</p>`,
    keyPoints: ['d4, e4, d5, e5 are the key squares.', 'Occupy with pawns or control with pieces.', 'Central pawns also open lines for your pieces.'],
    diagram: {
      fen: after('e4', 'e5'),
      caption: 'Both sides have staked a claim in the centre with a pawn.',
      marks: { d4: 'info', e4: 'good', d5: 'info', e5: 'good' },
    },
    example: {
      title: 'Building and challenging a centre',
      fen: after(),
      steps: [
        { move: 'e4', text: 'Occupies e4 and controls d5 and f5.' },
        { move: 'c5', text: 'The Sicilian: Black controls d4 from the side instead of mirroring.' },
        { move: 'Nf3', text: 'Developing and preparing d4.' },
        { move: 'd6', text: '' },
        { move: 'd4', text: 'White strikes in the centre…' },
        { move: 'cxd4', text: '…and Black trades a flank pawn for a central one, a typical Sicilian idea.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'center-pawn',
      fen: after(),
      prompt: 'Make a first move that puts a pawn in the centre.',
      solutionText: '1.e4 or 1.d4 (each places a pawn on a central square).',
      explanation: 'Moves like 1.Nf3 or 1.c4 also fight for the centre — but from a distance.',
    },
    quiz: {
      q: 'Which squares form the centre?',
      options: ['a1, h1, a8, h8', 'd4, e4, d5, e5', 'c3, f3, c6, f6', 'e1, e8, d1, d8'],
      answer: 1,
      explain: 'The four central squares are d4, e4, d5 and e5.',
    },
  },
  {
    id: 'developing-pieces',
    section: 'openings',
    title: 'Developing your pieces',
    level: 'Beginner',
    body: `
<p>In the opening, aim to get all minor pieces out within roughly the first 8–10 moves. Practical guidelines:</p>
<ul>
<li>Knights usually go to f3/c3 (f6/c6), where they control the centre.</li>
<li>Bishops go to active diagonals (c4, b5, g5, f4, or fianchetto on g2/b2).</li>
<li>Develop with <strong>threats</strong> or <strong>tempo</strong> when possible: the opponent then has to react instead of developing.</li>
<li>Do not grab pawns at the cost of falling far behind in development — but do take free material when it is safe.</li>
</ul>`,
    keyPoints: ['Minor pieces out quickly.', 'Develop with tempo.', 'Every move should improve a piece.'],
    diagram: {
      fen: after('e4', 'e5', 'Nf3', 'Nc6'),
      caption: 'White to move. Bc4, Bb5, Nc3 and d4 are all natural developing choices.',
    },
    example: {
      title: 'The Ruy Lopez',
      fen: after(),
      steps: [
        { move: 'e4', text: '' }, { move: 'e5', text: '' },
        { move: 'Nf3', text: 'Develops with a threat to e5.' },
        { move: 'Nc6', text: 'Develops while defending.' },
        { move: 'Bb5', text: 'Develops and pressures the defender of e5.' },
        { move: 'a6', text: 'Black asks the bishop a question.' },
        { move: 'Ba4', text: 'The bishop keeps the pin-like pressure.' },
        { move: 'Nf6', text: 'Black develops with an attack on e4.' },
        { move: 'O-O', text: 'White castles: e4 is indirectly protected because …Nxe4 runs into Re1 and d4 ideas.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'develop',
      fen: after('e4', 'e5', 'Nf3', 'Nc6'),
      prompt: 'Develop another minor piece.',
      solutionText: 'Bc4, Bb5, Nc3 (or Be2, Bd3…) — any knight or bishop leaving the first rank.',
      explanation: 'Prefer active squares like c4 or b5.',
    },
    quiz: {
      q: 'What does "developing with tempo" mean?',
      options: ['Moving very fast', 'Developing a piece while creating a threat the opponent must answer', 'Moving pawns first', 'Castling twice'],
      answer: 1,
      explain: 'The opponent spends a move responding, so you gain time.',
    },
  },
  {
    id: 'castling-opening',
    section: 'openings',
    title: 'Castling in the opening',
    level: 'Beginner',
    body: `
<p>Castling achieves two goals with one move: the <strong>king</strong> leaves the centre, where files open first, and a <strong>rook</strong> comes towards the centre. Most opening systems castle within the first ten moves.</p>
<p>Signs that you must castle <em>now</em>: the centre is about to open (pawn exchanges on d4/e5), the opponent's queen or bishops point at your king, or a rook is ready to come to the e-file.</p>
<p>Castling on <strong>opposite sides</strong> usually leads to sharp races where both sides throw pawns at the enemy king.</p>`,
    keyPoints: ['Castle before the centre opens.', 'Kingside castling is usually quicker.', 'Opposite-side castling = pawn storms.'],
    diagram: {
      fen: after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'),
      caption: 'White is ready to castle; the planned d4 will open the centre.',
    },
    example: {
      title: 'Punishing an uncastled king',
      fen: after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4', 'exd4'),
      steps: [
        { move: 'O-O', text: 'White castles first and only then opens lines…' },
        { move: 'Nxe4', text: 'Black grabs a pawn but keeps the king in the centre.' },
        { move: 'Re1', text: 'The rook pins the knight on the e-file against the uncastled black king.' },
        { move: 'd5', text: 'Black defends the pinned knight.' },
        { move: 'Bxd5', text: 'Max Lange-style tactics follow; Black\'s uncastled king is the reason.' },
      ],
    },
    exercise: {
      type: 'predicate',
      predicate: 'castle',
      fen: after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'),
      prompt: 'Get your king to safety.',
      solutionText: 'O-O.',
      explanation: 'With the king safe, White can play d4 with confidence.',
    },
    quiz: {
      q: 'When is castling usually most urgent?',
      options: ['When the centre is about to open', 'When the queens are traded', 'In a pawn endgame', 'Never'],
      answer: 0,
      explain: 'An uncastled king in an open centre is very vulnerable.',
    },
  },
  {
    id: 'early-queen',
    section: 'openings',
    title: 'Avoiding premature queen adventures',
    level: 'Beginner',
    body: `
<p>Bringing the queen out early is tempting — it attacks a lot. But the queen is also easy to <strong>harass</strong>: every minor piece or pawn that attacks it gains a tempo while developing, and the queen must keep moving.</p>
<p>Early queen raids such as the "Scholar's Mate" attempt (2.Qh5 and 3.Bc4 aiming at f7) only work against careless defence. Against correct defence they leave the attacker behind in development.</p>
<p>Defend calmly: cover the threatened square (often f7/f2) and then develop with gain of time by attacking the queen.</p>`,
    keyPoints: ['The queen is easily chased → lost tempi.', 'Know the f7/f2 weakness.', 'Defend, then develop with tempo against the queen.'],
    diagram: {
      fen: after('e4', 'e5', 'Qh5', 'Nc6', 'Bc4'),
      caption: 'White threatens Qxf7#. Black must defend f7 — but carefully.',
      arrows: ['h5f7', 'c4f7'],
      marks: { f7: 'bad' },
    },
    example: {
      title: 'Refuting the early queen',
      fen: after('e4', 'e5', 'Qh5', 'Nc6', 'Bc4'),
      steps: [
        { move: 'g6', text: 'Blocks the queen\'s line to f7 and attacks the queen.' },
        { move: 'Qf3', text: 'Renewing the threat against f7.' },
        { move: 'Nf6', text: 'Defends f7 again and develops. Black is fine, and the white queen will be a target (…Nd4).' },
      ],
    },
    exercise: {
      type: 'line',
      fen: after('e4', 'e5', 'Qh5', 'Nc6', 'Bc4'),
      prompt: 'Stop the threat of Qxf7# with a sound move.',
      solution: ['g6'],
      accept: [['Qe7', 'Qf6']],
      hint: 'f7 is attacked twice. Block the queen or defend f7.',
      explanation: '…g6 (or …Qe7/…Qf6) holds. The natural-looking …Nf6?? loses at once to Qxf7#.',
    },
    quiz: {
      q: 'Why is an early queen sortie often a mistake?',
      options: ['The queen cannot capture early', 'Opponent pieces develop with tempo by attacking it', 'It is against the rules', 'It forces a draw'],
      answer: 1,
      explain: 'Each attack on the queen is a free developing move for the opponent.',
    },
  },
  {
    id: 'opening-traps',
    section: 'openings',
    title: 'Recognising opening traps',
    level: 'Intermediate',
    body: `
<p>Opening traps punish natural-looking but careless moves. Knowing the common ones protects you — and teaches the tactical motifs behind them.</p>
<ul>
<li><strong>Légal's Mate</strong>: a "pinned" knight moves anyway, sacrificing the queen for a mate with minor pieces.</li>
<li><strong>Elephant Trap</strong> (QGD): see the Zwischenzug lesson.</li>
<li><strong>Fool's Mate</strong> (1.f3 e5 2.g4?? Qh4#) — weakening the king's diagonal.</li>
<li><strong>Scholar's Mate</strong> — Qxf7# against a careless defence of f7.</li>
</ul>
<p>The general lesson: a pin to the queen is only a <em>relative</em> pin, and f7/f2 are the weakest points at the start.</p>`,
    keyPoints: ['Relative pins can be broken with a tactic.', 'f7/f2 are weak early on.', 'Check every capture of a "free" queen.'],
    diagram: {
      fen: after('e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1'),
      caption: 'Black has just taken the queen. White mates in two.',
    },
    example: {
      title: 'Légal\'s Mate',
      fen: after(),
      steps: [
        { move: 'e4', text: '' }, { move: 'e5', text: '' }, { move: 'Nf3', text: '' }, { move: 'd6', text: '' },
        { move: 'Bc4', text: '' }, { move: 'Bg4', text: 'Black pins the f3-knight to the queen.' },
        { move: 'Nc3', text: '' }, { move: 'g6', text: 'A slow move.' },
        { move: 'Nxe5', text: 'The "pinned" knight moves! The pin was only relative.' },
        { move: 'Bxd1', text: 'Black greedily takes the queen.' },
        { move: 'Bxf7+', text: 'Bishop check…' },
        { move: 'Ke7', text: 'The only move.' },
        { move: 'Nd5#', text: 'Checkmate with three minor pieces.' },
      ],
    },
    exercise: {
      type: 'line',
      fen: after('e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1'),
      prompt: 'Black has just taken your queen. Mate in two.',
      solution: ['Bxf7+', 'Ke7', 'Nd5#'],
      explanation: 'Bxf7+ Ke7 Nd5#. Stockfish 19 confirms mate in 2.',
    },
    quiz: {
      q: 'Why could the f3-knight move in Légal\'s Mate even though it was "pinned"?',
      options: ['Because the pin was only to the queen (relative), not to the king', 'Because knights ignore pins', 'Because the bishop was pinned instead', 'It was an illegal move'],
      answer: 0,
      explain: 'Moving a relatively pinned piece is legal; here it led to mate.',
    },
  },
  {
    id: 'opening-plans',
    section: 'openings',
    title: 'Plans instead of memorisation',
    level: 'Intermediate',
    body: `
<p>Memorising long variations helps only until the opponent deviates. Understanding <strong>why</strong> moves are played lets you find good moves on your own.</p>
<p>For every opening you play, learn:</p>
<ol>
<li>The typical <strong>pawn structure(s)</strong> it leads to.</li>
<li>Where each piece <strong>belongs</strong> in that structure.</li>
<li>The main <strong>pawn breaks</strong> for both sides (e.g. …c5 and …f5 against a d4–e5 chain).</li>
<li>Typical <strong>middlegame plans</strong> (minority attack, kingside pawn storm, pressure on an isolated pawn).</li>
<li>One or two model games.</li>
</ol>
<p>Use this app's <strong>Openings</strong> tab to see which named line you are in and where the game left theory, then compare your moves with Stockfish 19.</p>`,
    keyPoints: ['Structure → piece placement → pawn breaks → plans.', 'Study model games, not just move orders.', 'Know where your theory ends.'],
    diagram: {
      fen: after('d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5'),
      caption: 'The Carlsbad structure (QGD Exchange). White\'s typical plan is the minority attack b4–b5 against Black\'s c6/b7 pawns.',
    },
    example: {
      title: 'French Defence: attack the chain at its base',
      fen: after('e4', 'e6', 'd4', 'd5', 'e5'),
      intro: 'The Advance French creates a pawn chain d4–e5 against e6–d5.',
      steps: [
        { move: 'c5', text: 'Black strikes at the base of the chain (d4) — the standard break.' },
        { move: 'c3', text: 'White supports d4.' },
        { move: 'Nc6', text: 'Black adds pressure on d4…' },
        { move: 'Nf3', text: '' },
        { move: 'Qb6', text: '…and the queen joins the attack on d4/b2. Knowing this plan matters more than memorising the order of moves.' },
      ],
    },
    quiz: {
      q: 'In a pawn chain, where should you usually attack it?',
      options: ['At its head (the most advanced pawn)', 'At its base (the rearmost pawn)', 'Nowhere', 'With the king'],
      answer: 1,
      explain: 'Nimzowitsch\'s rule: attack the chain at its base.',
    },
  },
];
