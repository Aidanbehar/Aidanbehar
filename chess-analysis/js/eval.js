// Evaluation conventions shared by the analysis panel and game review.
//
// A score is { type: 'cp' | 'mate', value, bound? } ALWAYS from White's point of
// view (positive = good for White). Stockfish reports scores from the side to
// move, so engine.js converts them with toWhitePov() as lines arrive.

export function toWhitePov(score, sideToMove) {
  if (!score) return null;
  return sideToMove === 'w' ? { ...score } : { ...score, value: -score.value };
}

/** Text such as "+1.24", "-0.30", "M3", "-M5", "#" (mate on board). */
export function formatScore(score) {
  if (!score) return '…';
  if (score.type === 'mate') {
    if (score.value === 0) return '#';
    return `${score.value > 0 ? '' : '-'}M${Math.abs(score.value)}`;
  }
  const v = score.value / 100;
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;
}

/**
 * Expected score for White in percent (0..100), using the logistic model
 * popularised by Lichess (fit to rated games): 50 + 50 * (2 / (1 + e^(-0.00368208·cp)) − 1).
 * Mate scores map to 100 / 0.
 */
export function whiteWinPercent(score) {
  if (!score) return 50;
  if (score.type === 'mate') {
    if (score.value > 0) return 100;
    if (score.value < 0) return 0;
    return score.matedSide === 'w' ? 0 : score.matedSide === 'b' ? 100 : 50;
  }
  const cp = Math.max(-1000, Math.min(1000, score.value));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Win percentage from the point of view of `color` ('w' | 'b'). */
export function winPercentFor(score, color) {
  const w = whiteWinPercent(score);
  return color === 'w' ? w : 100 - w;
}

/** Eval-bar fill for White in percent. Mate = full bar. */
export function barPercent(score) {
  return whiteWinPercent(score);
}

/** Score of a finished game position (no engine needed). */
export function terminalScore(chess) {
  if (chess.isCheckmate()) return { type: 'mate', value: 0, matedSide: chess.turn() };
  return { type: 'cp', value: 0, terminal: true };
}

// ---- Move classification --------------------------------------------------
//
// Method: compare the mover's expected score (win %) in the position before the
// move (engine's best line) with the position after the played move. The loss in
// percentage points decides the class. Thresholds follow Lichess's published
// win-%-based inaccuracy/mistake/blunder cut-offs (10/20/30 points); "Best",
// "Excellent" and "Good" are this app's own bands. Results depend on engine
// depth and on this method — they are not Chess.com's proprietary classifier.
export const CLASS_THRESHOLDS = [
  { key: 'excellent', label: 'Excellent', max: 2 },
  { key: 'good', label: 'Good', max: 10 },
  { key: 'inaccuracy', label: 'Inaccuracy', max: 20 },
  { key: 'mistake', label: 'Mistake', max: 30 },
  { key: 'blunder', label: 'Blunder', max: Infinity },
];

export const CLASS_INFO = {
  best: { label: 'Best', symbol: '★', color: 'var(--c-best)' },
  excellent: { label: 'Excellent', symbol: '!', color: 'var(--c-excellent)' },
  good: { label: 'Good', symbol: '✓', color: 'var(--c-good)' },
  forced: { label: 'Forced', symbol: '□', color: 'var(--c-forced)' },
  book: { label: 'Book', symbol: '📖', color: 'var(--c-book)' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', color: 'var(--c-inaccuracy)' },
  mistake: { label: 'Mistake', symbol: '?', color: 'var(--c-mistake)' },
  blunder: { label: 'Blunder', symbol: '??', color: 'var(--c-blunder)' },
};

/**
 * Classify one move.
 *   before : White-POV score of the position before the move (engine best)
 *   after  : White-POV score of the position after the played move
 *   mover  : 'w' | 'b'
 *   playedUci, bestUci, legalCount
 */
export function classifyMove({ before, after, mover, playedUci, bestUci, legalCount }) {
  const winBefore = winPercentFor(before, mover);
  const winAfter = winPercentFor(after, mover);
  const loss = Math.max(0, winBefore - winAfter);
  let cls;
  if (legalCount === 1) cls = 'forced';
  else if (bestUci && playedUci === bestUci) cls = 'best';
  else {
    cls = CLASS_THRESHOLDS.find((t) => loss < t.max).key;
    // A move that keeps a forced mate (only slower) is never worse than "good".
    if (before?.type === 'mate' && after?.type === 'mate' && Math.sign(before.value) === Math.sign(after.value)
      && (mover === 'w' ? before.value > 0 : before.value < 0) && ['inaccuracy', 'mistake', 'blunder'].includes(cls)) cls = 'good';
  }
  return { cls, loss, winBefore, winAfter };
}
