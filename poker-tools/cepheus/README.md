# Cepheus-style strategy for "Play Against Cepheus"

These are development tools only. The website never runs them. They produce
`poker/cepheus/cepheus-strategy.bin`, which the site downloads only when someone opens
**Play Against Cepheus**.

## What the CFR_plus archive contains

`CFR_plus.tar.bz2` (85 KB, 2014, University of Alberta and Oskari Tammelin) is the CFR+ solver
the Cepheus team released. It contains:

- `cfr.c`, `storage.c` and others: the CFR+ solver, built for a 200-node MPI cluster. It solves
  the whole game without card abstraction.
- `holdem.limit.2p.reverse_blinds.game`: Cepheus's game, heads-up fixed-limit Hold'em. Blinds are
  5/10, bets 10/10/20/20, and the button acts first preflop. At most 3 raises are allowed preflop
  and 4 on later streets; this file counts a bet as a raise. Stacks are unlimited.
- `evalHandTables` and `rankCardset()`: a fast 7-card hand evaluator.
- `recompress.c` and `compressor/`: tools for compressing and indexing a finished strategy.
- Small test games: Kuhn, Leduc, Rhode Island and Royal.

**It does not contain any strategy data.** Cepheus's strategy took a reported
900 core-years to compute. It is more than 10 TB and was never published. The player
program that read it (`cfr_player.c`) is not in the archive either. The Makefile says it
"requires the CPRG code". Running the archive's solver on the full game is far beyond one
machine. So Cepheus's own strategy cannot be included, and the site does not claim to include it.

## What we built instead

`cfrplus_hulhe.c` runs the same algorithm, CFR+, on the exact same betting tree. The tree is
read from the archive's game file and has 6,378 decision points. To keep the result small,
similar hands are grouped together:

| Street | Groups ("buckets") | How hands are grouped |
|---|---|---|
| Preflop | 169 | The 169 distinct starting hands (lossless) |
| Flop | 50 | Percentiles of E[HS²] over all 1,081 turn+river runouts (exact; 1,755 suit-isomorphic flops precomputed) |
| Turn | 50 | Percentiles of E[HS²] over all 46 rivers |
| River | 50 | Percentiles of hand strength against all 990 opponent hands |

Hand strength is kept as exact integers (`2*wins + ties`, summed squares), so the browser engine
recomputes exactly the same bucket for one hand. It does this in about 25 ms.

Training details:

- Public chance sampling: each iteration samples full boards and updates every hand at once.
- Updates alternate between players.
- Regrets are floored at zero (regret matching+).
- The average strategy is weighted by `max(0, t - warmup)`.

Alternation, the zero floor and the weighting are the CFR+ choices used in the archive. Showdown
and fold values handle card removal exactly. `cfrplus_hulhe selftest` checks these against brute
force.

The result is a randomised, equilibrium-style strategy for the abstracted game. It is an
**approximation of Cepheus**, and is labelled that way everywhere in the app and in game records.

## Regenerating

```sh
make cfrplus_hulhe
make prep.bin                      # selftest, flop table (~1 min on 4 cores), bucket thresholds
make train SECONDS=6000 THREADS=4  # resumable: run it again to continue from run/state.bin
make export NOTE="your note"       # writes ../../poker/cepheus/cepheus-strategy.bin
./cfrplus_hulhe eval run/state.bin call 2000   # exact EV against always-call (also: raise, uniform, another state file)
```

Then rebuild `index.html`. The build pins the SHA-256 of the strategy file and the SRI hash of
`cepheus.js`, so the page refuses mismatched files.

## Strategy file format (`CPH1`, little-endian)

1. Magic `CPH1`.
2. JSON metadata, preceded by a u16 length.
3. Blinds as 2×u16.
4. For each round: raise size (u16), first player (u8) and max raises (u8).
5. K for each round (u16).
6. Bucket thresholds as f64.
7. The number of decision nodes in each round (u32).
8. The archive's evaluator tables: oneSuitVal, pairOtherVal and anySuitVal (8192×u16 each), then
   topBit and tripsOtherVal (8192×u8 each).
9. The strategy: decision nodes in depth-first tree order (fold, call, raise). Each bucket has
   `nA-1` probability bytes out of 255; the last action gets the remainder.
10. An FNV-1a checksum (u32).

## Licence

`acpc_eval.h` (the copied `rankCardset`), `evalHandTables`, the game file and the ported tables
in `poker/cepheus/cepheus.js` come from the CFR_plus archive. They are used under its licence,
see `LICENCE-CFR_plus.txt`. Feltroom is not affiliated with or endorsed by the University of
Alberta.
