// Learning Center content registry.
import fundamentals from './fundamentals.js';
import tactics from './tactics.js';
import positional from './positional.js';
import openings from './openings.js';
import endgames from './endgames.js';
import calculation from './calculation.js';

export const SECTIONS = [
  { id: 'fundamentals', title: 'Chess fundamentals' },
  { id: 'tactics', title: 'Tactical patterns' },
  { id: 'positional', title: 'Positional chess' },
  { id: 'openings', title: 'Opening principles' },
  { id: 'endgames', title: 'Endgames' },
  { id: 'calculation', title: 'Calculation & decisions' },
];

export const LESSONS = [...fundamentals, ...tactics, ...positional, ...openings, ...endgames, ...calculation];

// Extra puzzles for Puzzle mode (in addition to every lesson exercise of type
// mate/line). All are verified with Stockfish 19 by tests/lessons.test.mjs.
export const EXTRA_PUZZLES = [
  { id: 'kr-mate', title: 'Rook mate on the edge', type: 'mate', fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', prompt: 'Mate in one.', explanation: 'Rh8#: the king covers a7 and b7.' },
  { id: 'arabian', title: 'Rook and knight', type: 'mate', fen: '7k/R7/5N2/8/8/8/8/6K1 w - - 0 1', prompt: 'Mate in one.' },
  { id: 'smothered', title: 'Smothered', type: 'line', fen: '5r1k/6pp/4Q2N/8/8/8/6PP/6K1 w - - 0 1', prompt: 'Mate in two.', solution: ['Qg8+', 'Rxg8', 'Nf7#'] },
  { id: 'legal', title: 'Légal\'s Mate', type: 'line', fen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6', prompt: 'Mate in two.', solution: ['Bxf7+', 'Ke7', 'Nd5#'] },
  { id: 'opposition', title: 'Opposition', type: 'line', fen: '8/8/8/4k3/8/8/4PK2/8 w - - 0 1', prompt: 'Only one move wins.', solution: ['Ke3'] },
  { id: 'elephant', title: 'Elephant Trap', type: 'line', fen: 'r1bBkb1r/pppn1ppp/8/3n4/3P4/8/PP2PPPP/R2QKBNR b KQkq - 0 7', prompt: 'Black to move wins material.', solution: ['Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'] },
  { id: 'skewer', title: 'Skewer', type: 'line', fen: '8/8/8/8/3k3q/8/6PP/R5K1 w - - 0 1', prompt: 'Win the queen.', solution: ['Ra4+', 'Ke5', 'Rxh4'] },
  { id: 'underpromotion', title: 'Underpromotion', type: 'line', fen: '8/2P5/1q1k4/8/8/8/6P1/7K w - - 0 1', prompt: 'Promote cleverly.', solution: ['c8=N+'] },
];
