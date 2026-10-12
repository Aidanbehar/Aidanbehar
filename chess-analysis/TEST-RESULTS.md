# Test results

Actual output of `tests/run-all.sh`, run on 2026-10-12 (Linux x86-64, Node 22.22, Chromium 141 via Playwright 1.56, Emscripten 6.0.12 build). The full logs are in `tests/results/`.

**Total: 140 passed, 0 failed.**

## Rules, FEN, sequence counter, PGN, openings, evaluation (Node) — 32 passed, 0 failed, 0 skipped

- PASS — starting position: 20 legal moves, correct FEN
- PASS — checkmate: Fool's Mate
- PASS — stalemate
- PASS — castling rules
- PASS — en passant
- PASS — promotion generates four moves per destination
- PASS — pinned pieces and check evasions
- PASS — FEN validation explains problems
- PASS — FEN import/export round trip
- PASS — sequence counter: start position 20 / 400 / 8,902 (and 197,281)
- PASS — sequence counter: N2 equals sum over moves of legal replies (definition)
- PASS — sequence counter matches published perft: Kiwipete
- PASS — sequence counter matches published perft: Position 3
- PASS — sequence counter matches published perft: Position 4
- PASS — sequence counter matches published perft: Position 5
- PASS — sequence counter: terminal positions and forced moves
- PASS — sequence counter: special moves are counted separately
- PASS — BigInt formatting and exact arithmetic
- PASS — PGN: headers, moves, comments, NAGs, result
- PASS — PGN: nested variations, suffix annotations, multiple games
- PASS — PGN: malformed input is reported clearly
- PASS — PGN: FEN header and export round trip with variations
- PASS — game tree navigation and synchronisation helpers
- PASS — openings: exact sequence match
- PASS — openings: broader classification after leaving the book
- PASS — openings: identification follows the move sequence, not just the position
- PASS — openings: custom start positions and database errors
- PASS — openings database: every entry replays legally and is unique
- PASS — score conversion to White's point of view and formatting
- PASS — move classification thresholds, perspective and mates
- PASS — UCI info parsing
- PASS — PV to SAN stops at the first illegal move (stale-line protection)

## Stockfish 19 acceptance (Node, the shipped WebAssembly files) — 28 passed, 0 failed, 0 skipped

  - PASS — engine loads, identifies as Stockfish 19, uci -> uciok, isready -> readyok
  - PASS — position startpos + go depth 10: genuine info output and a legal bestmove
  - PASS — NNUE network loaded (nn-1a298aa575a0.nnue)
  - PASS — FEN analysis (Kiwipete) gives legal moves and a valid PV
  - PASS — mate scores: mate in 1 is reported as "score mate 1"
  - PASS — MultiPV 3 returns three distinct candidate lines
  - PASS — search cancellation: go infinite + stop returns a legal bestmove promptly
  - PASS — a new search after stop works, and output belongs to the new position
  - PASS — rapid position changes: 25 short searches with stop, no hang, all results legal
  - PASS — repeated depth searches (10x) complete without hanging
  - PASS — go perft (independent move generator) matches published counts
  - PASS — multi-threaded search (Threads=2) works
- PASS — Stockfish 19 (simd build) acceptance
  - PASS — engine loads, identifies as Stockfish 19, uci -> uciok, isready -> readyok
  - PASS — position startpos + go depth 10: genuine info output and a legal bestmove
  - PASS — NNUE network loaded (nn-1a298aa575a0.nnue)
  - PASS — FEN analysis (Kiwipete) gives legal moves and a valid PV
  - PASS — mate scores: mate in 1 is reported as "score mate 1"
  - PASS — MultiPV 3 returns three distinct candidate lines
  - PASS — search cancellation: go infinite + stop returns a legal bestmove promptly
  - PASS — a new search after stop works, and output belongs to the new position
  - PASS — rapid position changes: 25 short searches with stop, no hang, all results legal
  - PASS — repeated depth searches (10x) complete without hanging
  - PASS — go perft (independent move generator) matches published counts
  - PASS — multi-threaded search (Threads=2) works
- PASS — Stockfish 19 (relaxed build) acceptance
- PASS — missing NNUE file is reported, not silently ignored
- PASS — shipped files: NNUE parts reassemble to the SHA-256 recorded in nnue.sha256

## Learning Center content (rules + Stockfish 19) — 62 passed, 0 failed, 0 skipped

- PASS — 51 per-lesson checks (all 51 lessons: positions valid, example moves legal, exercise solvable and non-trivial, quiz valid)
- PASS — learning center has all required sections with lessons
- PASS — puzzle kr-mate: legal and solvable
- PASS — puzzle arabian: legal and solvable
- PASS — puzzle smothered: legal and solvable
- PASS — puzzle legal: legal and solvable
- PASS — puzzle opposition: legal and solvable
- PASS — puzzle elephant: legal and solvable
- PASS — puzzle skewer: legal and solvable
- PASS — puzzle underpromotion: legal and solvable
- PASS — rule-derived answers match hand analysis
- PASS — line exercises and puzzles are confirmed by Stockfish 19

## Browser end-to-end (Chromium) — 18 passed, 0 failed, 0 skipped

- PASS — app loads offline-capable, cross-origin isolated, engine identifies as Stockfish 19
- PASS — board: click and drag moves, SAN move list, legal count, FEN sync, undo/redo, flip, promotion, check
- PASS — analysis controls: MultiPV, depth limit, stop, explore line, no stale results while navigating
- PASS — FEN and PGN: validation messages, multi-game import, navigation, export
- PASS — sequence counter in the browser: 8,902 for 3 plies, cross-check with Stockfish, cancel, stale protection
- PASS — game review with Stockfish 19: classifications, summary, critical moments
- PASS — openings tab identifies the line from the move sequence
- PASS — position editor: validation and applying a position
- PASS — learning center: lesson, rule-verified exercise, quiz, progress, puzzle mode
- PASS — missing NNUE file: clear error, no fake analysis, recovery offered
- PASS — corrupt NNUE file is detected by its SHA-256
- PASS — missing engine script: reported as a missing file
- PASS — missing opening database: useful error instead of fake recognition
- PASS — without cross-origin isolation the app explains how to start it and still works without the engine
- PASS — worker clean-up and preference persistence
- PASS — engine crash is reported and the engine can be restarted
- PASS — tab clicks leave the arrow keys for move navigation
- PASS — Perl fallback server serves the app with cross-origin isolation
## Key verified facts

- **Engine identity.** Both shipped builds answer `id name Stockfish 19`, with `uciok` and `readyok`. The unmodified sf_19 wasm build reproduces the official bench signature, 2497913.
- **NNUE.** The engine prints `NNUE evaluation using nn-1a298aa575a0.nnue (109MiB, (86896, 1024, 32, 32, 1))`. The two net parts reassemble to SHA-256 `1a298aa5…dfc2`.
- **Search.** `go depth 10` produces real `info` lines and a legal `bestmove` from the start position and from FENs. Mate-in-one is reported as `score mate 1`, and MultiPV 3 gives 3 distinct lines.
- **Cancellation and restarts.** `stop` returns a legal `bestmove` within 3 s. 25 rapid position changes with stop and 10 repeated searches all completed. `Threads=2` works.
- **Stale results.** In the browser, 20 rapid navigations with continuous analysis never displayed analysis for a different position.
- **Responsiveness.** While Stockfish searched, the page's event-loop lag stayed under 250 ms (test threshold).
- **Sequence counter.**
  - Start position: 20 (1 ply), 400 (2 plies), 8,902 (3 plies) and 197,281 (4 plies).
  - The 3-ply count of 8,902 was verified three independent ways: a separately written reference that only uses chess.js's public API and rebuilds every position from its FEN; Stockfish 19's own `go perft 3`, in Node and from the app's "Cross-check" button in Chromium; and the published perft value.
  - The Kiwipete, CPW position 3, 4 and 5 counts match their published perft values (castling, en passant, promotions, checks, pins).
  - Additional measurement (not an assertion): 5 plies from the start = 4,865,609 in about 9 s, and Kiwipete 4 plies = 4,085,603 in about 8.5 s (Node).
- **Learning Center.** Every move-based exercise and puzzle is within Stockfish 19's best-move tolerance. For example, `Ke3` is the only winning opposition move (+6.42), the square-of-the-pawn moves Ke1/Ke2/Ke3 hold the draw (0.00), and Kg3 loses (−10.49). Scores per move are in `tests/results/lessons-engine.txt`.
- **Errors.** Missing network (HTTP 404), corrupt network (SHA-256 mismatch), missing engine script, a missing opening database, a page that is not cross-origin isolated, and an engine crash (with restart) are each reported in the interface. No evaluation is shown in any of these cases.
- **Offline.** During the browser tests every request to a host other than localhost was blocked and recorded. None was made.

## Not tested

- Safari and Firefox: only Chromium was available.
- The macOS `.command` launcher itself, since there is no macOS here. `serve.py` and `serve.pl`, which it runs, were tested on Linux, including the full app in Chromium on each.
- Counts larger than `Number.MAX_SAFE_INTEGER`. They would need about 12 plies from the start position, which cannot be enumerated in practice. Exact `BigInt` arithmetic and formatting beyond 2^53 are unit-tested separately.
