# Chess Analysis — powered by the official Stockfish 19

An offline chess analysis application for macOS (and any desktop with a modern browser). It includes:

- an interactive board;
- real **Stockfish 19** analysis in the browser (WebAssembly, NNUE, multi-threaded);
- exact legal-move and move-sequence counters;
- PGN import and full-game review;
- opening identification from a local database;
- a learning centre with 51 lessons and puzzles.

After the folder is on your Mac, nothing is downloaded from the internet: the engine, its neural network, the opening database and all lessons are stored locally.

## Quick start (macOS)

1. Download or clone this folder (`chess-analysis/`).
2. Double-click **`Launch Chess Analysis.command`**.
   - The first time, macOS may refuse to open a downloaded script. If so, right-click it → *Open* → *Open*. Alternatively, run `xattr -d com.apple.quarantine "Launch Chess Analysis.command"` in Terminal.
3. Your browser opens at `http://localhost:8719/index.html` (the next free port is used if 8719 is busy). Keep the small Terminal window open while you use the app. Close it, or press Ctrl+C, to stop.

The launcher uses `python3` if it is installed, otherwise Perl (`/usr/bin/perl`, which ships with macOS). If neither is available, install Apple's Command Line Tools with `xcode-select --install`.

Manual start from Terminal:

```
cd chess-analysis
python3 serve.py          # or: perl serve.pl
```

**Why not just open `index.html`?** Stockfish 19 runs multi-threaded WebAssembly. Browsers only allow that on pages served with special security headers (cross-origin isolation), and a `file://` page cannot have them. The included server adds these headers and listens only on your own computer (127.0.0.1). If you open the file directly, the app shows a notice explaining this.

### Browsers

| Browser | Status |
|---|---|
| Google Chrome / Microsoft Edge (Chromium) | **Tested**: all automated end-to-end tests run in Chromium. |
| Safari 17+, Firefox | Expected to work (WebAssembly SIMD, `SharedArrayBuffer` and nested workers are supported) but **not tested** — no Safari or Firefox was available in the build environment. If the engine does not start in Safari, use Chrome. |

The first engine start reads the 98.5 MB neural network from disk. This takes about 2–3 s, and the progress is shown in the panel.

## Features

### Analysis tab

- **Board**
  - Click-to-move and drag-and-drop.
  - Legal-destination dots, plus selected-square, last-move and check highlights.
  - A promotion picker.
  - Flip, undo/redo, reset, and a typed move box (SAN such as `Nf3` or UCI such as `g1f3`).
- **Moves and navigation**
  - A move list in SAN with variations, comments and annotation symbols.
  - Click any move to jump to it.
  - Keyboard: ← → previous/next, Home/↑ start, End/↓ end, F flip, Space start/stop analysis, Esc leave a previewed line.
  - A game progress bar.
- **Stockfish 19 controls**
  - Engine on/off.
  - Analyze / Stop / Reanalyze.
  - Infinite, depth or time limits.
  - 1–5 candidate lines (MultiPV), threads and hash size.
  - "Continuous" mode re-analyses every position you visit.
- **Engine output**
  - Evaluation from White's point of view (`+0.35`, `−1.20`, `M3` = mate in 3), with an evaluation bar.
  - Best move, depth/selective depth, nodes, nodes per second, and win/draw/loss estimates.
  - Each candidate line shows its evaluation and full principal variation in SAN. For each line you can:
    - **Play** its first move;
    - **Explore** it: step through it on the board, then *Return* or *Add to moves*;
    - click any move in the line to preview that position;
    - compare it with the best line (the panel shows each line's distance from the best, in win %).
- **Legal moves**: the exact count for the current position, from the rules library.
- **FEN & PGN**
  - Load, copy and export.
  - Multi-game PGN files can be imported, with a game picker.
  - Malformed PGN or FEN is explained.
- **Exact move-sequence counter**
  - Counts every legal move sequence of exactly *N* plies (1–6) by exhaustive enumeration, using exact `BigInt` arithmetic.
  - Shows progress, can be cancelled, and gives a per-move breakdown.
  - "Cross-check with Stockfish" re-counts with Stockfish 19's own `go perft`.
  - Counts grow about 30× per ply. 5 plies takes seconds to minutes; 6 plies can take many minutes.
- **Position editor (✎)**
  - Place, move and delete pieces.
  - Set the side to move, castling rights, the en passant square and the move counters.
  - Load and export FEN.
  - Invalid or unanalysable positions are rejected with a reason, for example a missing king, pawns on the first or eighth rank, the side not to move being in check, or castling rights without the king and rook on their home squares.

### Game Review tab

Import a game, choose the per-position depth or time, then press **Start review**. Every main-line position is searched by Stockfish 19.

- **For each move** you get:
  - its class: Best / Excellent / Good / Book / Forced / Inaccuracy / Mistake / Blunder;
  - the engine's preferred move and alternatives;
  - the evaluations before and after the move, and the loss;
  - the best line and the engine's reply line;
  - short factual notes derived from the engine lines and the rules, such as "Stockfish's best reply Bxh5 captures the queen on h5" or "allows mate in 2". The app never guesses a player's motives.
- **For the whole game**:
  - a summary table per player;
  - an evaluation graph (click it to jump);
  - links to the critical moments.
- The review can be paused, resumed and restarted.

**Classification method.** A move's class comes from the drop in the mover's expected score (win %, using the Lichess logistic model on centipawns, with mates mapped to 0/100) between the engine's best line before the move and the position after it.

| Class | Rule |
|---|---|
| Best | Stockfish's first choice |
| Excellent | loss < 2 points |
| Good | loss < 10 |
| Inaccuracy | loss < 20 |
| Mistake | loss < 30 |
| Blunder | loss ≥ 30 |
| Forced | the only legal move |
| Book | still inside the local opening database |

The inaccuracy, mistake and blunder bands follow Lichess's published thresholds. This is **not** Chess.com's proprietary classifier, and results depend on the search depth.

### Openings tab

The opening is identified from the **actual move sequence**, using the [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) database. That database contains 3,865 named lines, is released under CC0 (public domain), and is stored in `data/openings.json`; the source TSVs are in `data/openings-src/`.

- The tab shows:
  - the ECO code, opening family and variation;
  - the matching database line;
  - whether the match is an **exact sequence match** or a **broader classification** (the game has left the named line);
  - transpositions (the same position reached by a different move order);
  - clickable book continuations.
- You can also search the database.
- If the database file is missing, the tab says so instead of guessing.

### Learn tab

The learning centre has **51 lessons** in six sections:

- fundamentals;
- tactical patterns;
- positional chess;
- opening principles;
- endgames;
- calculation and decision-making.

Every lesson has:

- an explanation;
- a diagram;
- a step-through worked example;
- an interactive exercise (except *Managing the clock* and *Plans instead of memorisation*, where a board exercise is not practical);
- a solution with an explanation;
- a review question.

Exercises are verified with the rules library, not by matching a hard-coded square:

- **Mates**: any mating move is accepted.
- **Wrong moves**: feedback explains stalemates, hanging pieces, or "allows mate".
- **Counting and square-selection answers**: computed from the position (legal moves, checks, captures, isolated or passed pawns, outposts, open files, bad bishops, loose pieces…).

Every move-based exercise is also confirmed by Stockfish 19 in the test suite. **Puzzle mode** collects all puzzles. Progress is stored in your browser.

### General

- Light and dark themes.
- Preferences (theme, analysis settings, engine on/off, board orientation) are remembered locally.
- A responsive layout for smaller windows.
- Everything that does not need the engine keeps working when the engine is off or unavailable, and features that need the engine say so.

## Engine error handling

The app tells you when:

- engine files are missing (HTTP errors are reported);
- the network is corrupt (it is SHA-256 checked) or failed to load;
- the browser lacks SIMD, `SharedArrayBuffer` or cross-origin isolation;
- the engine worker crashes or exits;
- the UCI handshake times out;
- the engine identifies itself as anything other than "Stockfish 19".

Each error shows a banner with a **Restart engine** button.

Engine results are protected against mismatches:

- Each search is tied to the FEN it was started for.
- A new search waits for the previous `bestmove` before sending the next position.
- Any principal variation whose first move is illegal in that position is discarded.
- The UI only displays results whose FEN equals the board.

Positions are validated before they reach Stockfish, because Stockfish treats an unsupported position as a fatal error.

## Project layout

```
index.html, css/app.css         interface
js/                             application modules (ES modules, no build step)
  app.js board.js tree.js pgn.js chess-util.js
  engine.js                     Stockfish client (search ids, stale-result protection)
  analysis-panel.js review.js openings.js openings-panel.js editor.js
  perft-core.js perft-worker.js counter-panel.js   exact sequence counter
  learn.js learn-rules.js lessons/*.js              learning centre
engine/engine-worker.js         Web Worker hosting Stockfish 19
engine/stockfish-19/            official Stockfish 19 WebAssembly build + NNUE network
vendor/chess.js                 chess.js 1.4.0 (BSD-2-Clause) — rules, SAN, FEN
data/openings.json              opening database (CC0), built by tools/build-openings.mjs
assets/pieces/                  cburnett piece set (GPLv2+, via Lichess)
build/                          Stockfish build script and patch
serve.py, serve.pl              local servers; "Launch Chess Analysis.command" launcher
tests/                          automated tests; tests/results/ holds the latest output
docs/STOCKFISH19-BUILD.md       exact engine source and build method
TEST-RESULTS.md                 summary of the actual test runs
```

## Running the tests

These require Node.js 20+ and, for the browser suite, Playwright with Chromium (`npm install`, then `npx playwright install chromium`):

```
tests/run-all.sh             # all suites; output in tests/results/*.txt
SKIP_E2E=1 tests/run-all.sh  # without the browser suite
```

## Rebuilding the engine or the opening database

```
build/build-stockfish.sh        # needs an activated emsdk; see docs/STOCKFISH19-BUILD.md
node tools/build-openings.mjs   # regenerates data/openings.json from data/openings-src/*.tsv
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Banner: "not cross-origin isolated" | Start with the launcher or `python3 serve.py`; don't open `index.html` directly or through another web server. |
| "Engine error: NNUE file … HTTP 404" | The `engine/stockfish-19/nn-1a298aa575a0.nnue.part*` files are missing. Re-download the folder, or run `build/build-stockfish.sh`. If you cloned with Git LFS or a partial clone, make sure the large files were fetched. |
| "NNUE checksum mismatch" | A network part is incomplete or corrupt; re-download it. |
| Engine never starts in Safari | Use Chrome or Edge (Safari is untested). |
| The `.command` file won't open | Right-click → Open, or `chmod +x "Launch Chess Analysis.command"`. |
| Port already in use | The server automatically tries the next port; use the address it prints. |
| Analysis is slow | Increase *Threads* (up to your core count) and *Hash*. The browser build is slower than native Stockfish. |

## Status

### Completed and tested

- **Engine**
  - The official Stockfish 19 (sf_19, commit edb0d9d) compiled to WebAssembly in two variants (SIMD and relaxed SIMD).
  - The NNUE network is SHA-256 checked when it loads.
  - All mandatory engine acceptance tests pass.
- **Board**: the interactive board, move list with variations, navigation, undo/redo, flip, and FEN/PGN import and export (including multi-game files, comments, variations and annotation symbols).
- **Position editor** with validation.
- **Engine analysis**
  - Infinite, depth and time limits; MultiPV; threads and hash; continuous mode; on/off.
  - Evaluation bar, candidate lines (play, explore, compare), mate scores.
  - Stale-result protection and error handling with recovery.
- **Counters**
  - The exact legal-move counter.
  - The exact 1–6 ply sequence counter: BigInt arithmetic, worker-based, cancellable, with progress, and cross-checked against Stockfish's perft.
- **Game review**: classifications, the summary, the evaluation graph, critical moments, and pause/resume/restart.
- **Openings**: identification from the move sequence using a local CC0 database, distinguishing exact matches from broader classifications and showing transpositions.
- **Learning centre**: 51 lessons, puzzle mode and local progress.
- **Interface and delivery**: light/dark themes, remembered preferences, a responsive layout, keyboard navigation, offline operation, and the macOS launcher with Python and Perl servers.

See **TEST-RESULTS.md** for the actual test runs: 140 tests, all passing.

### Known limitations

- Only Chromium was tested. Safari and Firefox are expected to work but are unverified, and the macOS launcher could not be run on macOS in the build environment.
- The app is a small folder served locally, not a single HTML file. Stockfish 19's threaded WebAssembly requires cross-origin isolation, which `file://` pages cannot provide, and the 98.5 MB network cannot reasonably be embedded in a page.
- WebAssembly is slower than native Stockfish (roughly 0.6–1 million nodes/s per thread in testing), so depths are lower for the same thinking time. Syzygy tablebases are not included: the official wasm target disables them.
- Move classifications use a documented win-%-loss method and depend on the depth you choose. They are not Chess.com's proprietary "Brilliant"/"Great" system. The written notes are limited to facts that can be verified from engine lines and the rules (captures, mates, missed mates); the app does not invent human-style explanations.
- Game review analyses the main line only, not side variations.
- The sequence counter is exact but exhaustive, so depth 6 from complex positions can take a long time. Counts beyond 2^53 are supported arithmetically but are unreachable in practice.
- Opening identification only applies to games that start from the standard position.

## Licences

| Component | Licence |
|---|---|
| Stockfish 19 | GPL-3.0 |
| chess.js | BSD-2-Clause |
| cburnett pieces | GPLv2+ |
| Opening database | CC0 |

Because it ships Stockfish, this app as a whole is distributed under GPL-3.0-or-later.
