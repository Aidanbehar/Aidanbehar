// Helpers for lesson data: positions are derived from move lists with the
// rules library, so a typo in a move list fails loudly instead of producing a
// silently wrong diagram.
import { Chess } from '../../vendor/chess.js';

/** FEN after playing the given SAN moves from the standard starting position. */
export function after(...moves) {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c.fen();
}
