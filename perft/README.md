# perft.py — exact chess perft in Python

`perft.py` counts the **number of distinct legal move sequences of exactly N
plies** from a chess position (the standard initial position by default).
A ply is one player's move: `1. e4` is one ply, `1. e4 e5` is two.

```
$ python3 perft.py 7
N (moves) |         Sequences | Time (s)
----------+-------------------+---------
        1 |                20 |     0.00
        2 |               400 |     0.00
        3 |             8,902 |     0.00
        4 |           197,281 |     0.04
        5 |         4,865,609 |     0.55
        6 |       119,060,324 |     3.05
        7 |     3,195,901,860 |    26.98

Total elapsed: 30.62s
```

Each row is printed as soon as that depth finishes. Long depths show a live
progress line (percentage, elapsed, estimated time left) on stderr.

## Running it on a Mac

Nothing to install beyond Python **3.10 or newer** (it uses
`int.bit_count()`; 3.11+ is noticeably faster). The `python3` that comes with
Apple's command line tools is 3.9, so install a current one first:
`brew install python` (or the python.org installer), then check `python3
--version`.

```sh
cd perft
python3 perft.py 6                 # table for depths 1..6
python3 perft.py 7 --stats         # + nodes, nodes/s, TT hit rate, peak memory
python3 perft.py 5 --fen "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1"
python3 perft.py 3 --divide        # count under each first move (debugging)
python3 perft.py --selftest        # known-answer tests (~2 s)
python3 perft.py --bench           # start pos depths 1-6 + Kiwipete 1-4
```

Options:

| flag | meaning |
|---|---|
| `N` | depth in plies; the table shows every depth 1..N |
| `--fen "<FEN>"` | start from another position |
| `--divide` | per-first-move counts at depth N |
| `--stats` | nodes visited, nodes/s, leaf sequences/s, TT probes/hit rate, peak memory |
| `--jobs J` | worker processes (default: all cores). Depths < 6 always run in one process. |
| `--tt-size MB` | transposition-table budget in MB, total over all processes (default 2048, fine for 8–16 GB laptops; use 4096+ for N = 8 on a 16 GB+ machine) |
| `--tt-kind auto/dict/array` | single-process table: Python dicts, or a flat array (7× denser). `auto` uses dicts while the working set fits the budget. |
| `--private-tt` | give each worker its own table instead of one shared table (only for comparison; slower) |
| `--backend numba` | optional compiled backend (see below); falls back to pure Python if Numba is missing |
| `--no-progress` | no progress line |

Tests:

```sh
python3 -m pip install pytest chess     # chess = python-chess, used only as a cross-check
python3 -m pytest -q tests              # ~45 s
PERFT_SLOW=1 python3 -m pytest -q tests # + perft 6/7, Kiwipete 5, position 3 depth 6
```

### PyPy

```sh
brew install pypy3.10        # or whatever `brew search pypy` lists as newest
pypy3 perft.py 7
```

It runs under PyPy and passes the self-test and the test suite (43 passed;
the python-chess and Numba tests skip when those packages are absent), but **PyPy is not faster for this
program** (see the benchmarks and the explanation below). Use CPython with
all cores, or the Numba backend.

### Numba backend (optional)

```sh
python3 -m pip install numba
python3 perft.py 8 --backend numba
```

The first run compiles for ~20 s and caches the machine code in
`__pycache__`; later runs start in about a second. If Numba is not installed
the flag prints a notice and the pure-Python engine runs instead.

## What is counted (rules)

Standard perft conventions, matched exactly:

* Only sequences of exactly N legal plies count. A line that ends early in
  checkmate or stalemate contributes nothing at deeper depths.
* Full legality: no move may leave the mover's king in check.
* Castling: not out of, through, or into check; the squares between king and
  rook must be empty; rights are lost when the king or that rook moves, or
  when the rook is captured on its home square.
* En passant, including the case where the capture removes both pawns from a
  rank and exposes the king to a rook or queen along it.
* Promotions: each of the four promotion pieces is a separate move (also when
  promoting with a capture).
* **Ignored, as standard perft does:** the 50-move rule, threefold
  repetition, and insufficient material. A position is never "drawn" here;
  the halfmove/fullmove fields of a FEN are read but have no effect.

Counts grow about **30× per ply** in the opening (20, 400, 8,902, 197,281,
4.9 M, 119 M, 3.2 G, 85 G, 2.4 T for N = 9), so every extra ply costs roughly
25–30× more time, minus what transpositions save.

## Correctness

* `--selftest` and `tests/` check the start position (1–5 fast, 6–7 slow),
  Kiwipete (1–4; 5 slow), CPW position 3 (1–5; 6 slow), positions 4, 5 and 6,
  and 14 well-known edge-case positions (en passant pins along a rank and a
  diagonal, en passant that gives check, castling that gives check, castling
  rights after rook captures, promotion out of and into check,
  under-promotion, stalemate and mate traps).
* The full start-position table through **N = 8 (84,998,978,956)** was run
  and matches.
* python-chess (tests only, never in the counting code) cross-checks every
  legal move *and every resulting position* field by field (boards, castling
  rights, en-passant square) on 400 positions from random games, plus perft
  2–3 counts on 60 more.
* The incremental Zobrist key is compared with a from-scratch hash on every
  node of several 2-ply trees.
* The Numba backend is checked move by move and child by child against the
  Python engine on ~1,300 positions, and on all known counts.
* Transposition-table keys are wide enough that a false hit is not a practical
  concern: the dict tables compare the full 128-bit Zobrist key; the array
  table checks 64 key bits plus the ~20–27 bits that pick the slot (~2⁻⁸⁵
  per probe); the Numba table checks two independent 64-bit keys.

## How it works / optimization techniques

**Board.** Bitboards as Python ints. Each side is `(P, N, D, O, K, A)`:
pawns, knights, *diagonal* sliders (bishops+queens), *orthogonal* sliders
(rooks+queens), king square, all pieces. A queen is in both `D` and `O`, so
bishops and queens share one loop and rooks and queens another, with no
separate queen code.

**Attack tables.** Knight, king and pawn attacks are 64-entry lists. Sliding
pieces use a per-square dict keyed by the masked occupancy,
`RT[sq][occ & RM[sq]]` — a perfect hash that needs no magic multiply.
Benchmarked per lookup on CPython 3.13:

| slider lookup | ns |
|---|---|
| per-square dict keyed by masked occupancy (kept) | 161 |
| magic multiply into a list | 219 |
| ray tables + nearest-blocker scan | 774 |

The tables are built from per-direction tables in ~0.1 s at start-up (also
in each worker).

**Strictly legal generation.** Once per node: checkers, pinned pieces (via
"snipers": enemy sliders on the king's lines, kept only when exactly one of
our pieces is between), and a check mask (`between(king, checker) | checker`,
or only king moves in double check). Pinned pieces move only along
`line(king, piece)`; pinned knights never move. King moves are tested
against attacks with the king removed from the occupancy. Only en passant is
verified by make-and-test (it is rare and has the horizontal-pin trap).

**Code generation.** The hot functions are generated source. One template is
specialised for white and for black (shift directions, ranks, tables and
castling constants baked in, so there are no colour branches), and for each
role: interior node, depth-2 node, leaf counter, a statistics variant, and a
"collect" variant that returns the child positions (used for root splitting,
`--divide` and tests). The tables are bound as closure cells. On 3.13 this
measured the same as module globals; both beat attribute lookups.

**Copy-make, no move objects.** A child position is just the argument list
of the recursive call: `gen_B(tP, tN, …, uN ^ mv, …, uA ^ mv, cr, 0, h ^ …,
d - 1)`. There is no unmake, no undo stack and no move list in the hot path.
Moves are only encoded, as ints `from | to << 6 | flags << 12`, in the
collect variant. Measured cost of producing a child and entering it:

| method | ns per child |
|---|---|
| copy-make through call arguments (kept) | 382 |
| copy-make with a flat tuple | 454 |
| make/unmake on a list with an undo record | 1,247 |

**Incremental Zobrist.** The 128-bit key is updated by XOR in the same
expression that builds the child. Pawn moves use precomputed from/to pair
keys. The en-passant file is hashed only when an en-passant capture is
actually *legal* (checked when the double push is made), so positions that
differ only in a useless e.p. square merge.

**Bulk counting at the leaves.** At depth 1 nothing is generated. Each
piece's target set is popcounted with `int.bit_count()`: unpinned pawns are
handled as whole sets (pushes, double pushes, both capture directions,
promotions ×4), and pinned pawns individually on their pin line.

**Transposition table.**
* Single process: one dict per remaining depth, keyed by the Zobrist key
  (side to move folded in). Depth *d* may use `budget / 2^d` entries, which
  bounds the total. A full dict is cleared ("flush" replacement), so the
  deep, valuable dicts survive while the leaf dict churns. Measured cost:
  ~122 bytes per entry.
* The leaf table is probed **inline in the depth-2 node** before calling the
  leaf counter, so a hit costs one dict lookup and no call.
* When the working set would not fit the budget as dicts (`--tt-kind auto`),
  or in parallel runs: a flat array of 16-byte slots
  `(key_hi ^ count, count)` with separate leaf and interior regions
  (Hyatt's lock-free XOR trick). In CPython a probe costs ~2× a dict probe,
  but it is 7× denser and can live in shared memory.
* The table persists across the depths of the table run. Honest note: with a
  fixed side to move per ply, a position can only recur at the same
  remaining depth four plies later, so cross-depth reuse is tiny. Almost all
  hits are transpositions inside one depth.

**Breadth-first variant.** Tried: expand to ply N−1 merging identical
positions into `{position: multiplicity}`, then bulk-count each.

| start position | DFS + TT (kept) | BFS with multiplicities |
|---|---|---|
| N = 5 | 0.57 s, 36 MB | 0.83 s, 62 MB |
| N = 6 | 8.8 s, 129 MB | 11.8 s, 461 MB |

N = 7 would need ~10 M position tuples (several GB). DFS + TT gets the same
merging for less, so BFS is used only as a **hybrid at the root**: the first
few plies are expanded breadth-first with multiplicities to make
de-duplicated parallel tasks.

**Parallelism.** `multiprocessing` with the spawn start method (macOS's
default, used everywhere for consistency), with the entry point guarded by
`if __name__ == "__main__":`. The root is expanded (merging transpositions)
until there are ~48 tasks per worker. Chunks go through the pool's work
queue (`imap_unordered`), and the results are summed with their
multiplicities. Each worker builds the lookup tables once (~0.3 s).

The brief suggested a private table per worker. I measured that and
replaced it: with private tables, workers re-search each other's
transpositions (3× the nodes at N = 7). Workers now share **one lock-free
array table in `multiprocessing.shared_memory`**. A slot torn by two
simultaneous writers fails the XOR check and reads as a miss, so results
stay exact. The table is sized to the job (from the previous depth's count,
capped by `--tt-size`), because touching gigabytes of fresh shared memory
costs real time in page faults in every worker (N = 6 took 7.0 s with a
2 GB table, 3.2 s with 64 MB).

| N = 7, 4 workers | time |
|---|---|
| private dict TT per worker (`--private-tt`) | 79.6 s |
| one shared array TT (kept) | 27.2 s |

**Profiling.** cProfile showed the leaf counter (`cnt_*`) at ~77% of the
time and the depth-2 node (`gen2_*`) at most of the rest. The sampling
profiler py-spy could not attach in the Linux container I used (ptrace is
not permitted), so line-level attribution was done by timing variants of
the generated leaf counter with sections removed, over 74,116 real
positions (~7 µs per call):

| section of the leaf counter | µs per call |
|---|---|
| sliding pieces (dict lookups + popcounts) | ~2.8 |
| king moves (attack test per target square) | ~1.5 |
| checkers + pins prologue | ~1.7 incl. call |
| pawns / knights / castling | ~0.6–1.0 each |

What changed because of it: the leaf TT probe moved into the parent, the
king's slider rays are only looked up when an enemy slider is on one of
its lines, and attack tests skip the slider dict lookups when no enemy
slider is aligned with the square. Tried and rejected (no measurable gain):
binding `dict.get` to a local, pre-filtering king squares with bulk pawn
attacks, square indexes via a dict instead of `bit_length()`, and a cached
square-list per piece set (+3%, unbounded memory).

## Benchmarks

Measured on the machine available to me: a **Linux VM, 4 cores (Intel Xeon
@ 2.8 GHz), 16 GB, CPython 3.13, PyPy 3.11 v7.3.20, Numba 0.62**. **These
are not Mac numbers.** An Apple-silicon Mac is typically 1.3–2× faster per
core than this VM and has more cores, so expect proportionally better
results there. Times vary ±10% run to run on this VM.

### Runtime per depth (start position)

Seconds for that depth alone (the table's "Time" column). `4 proc` = 4
worker processes / threads. N = 1–4 take under 0.05 s (PyPy: up to 0.3 s
while its JIT warms up).

| N | sequences | CPython 1 proc | CPython 4 proc | PyPy 1 proc | PyPy 4 proc | Numba 1 thread | Numba 4 threads |
|---|---|---|---|---|---|---|---|
| 5 | 4,865,609 | 0.79 | 0.51 | 1.35 | 1.33 | 0.03 | 0.02 |
| 6 | 119,060,324 | 8.99 | 3.12 | 12.2 | 5.49 | 0.36 | 0.12 |
| 7 | 3,195,901,860 | 108 | 28.9 | 126 | 40.5 | 5.2 | 1.6 |
| 8 | 84,998,978,956 | 1,568 (26 min) | 412 (6.9 min) | – | – | 72 | 17–26 |
| 9 | 2,439,530,234,167 | – | – | – | – | – | 222 (`--tt-size 4096`) |

All of these counts were produced by the program and match the published
values. CPython 4 proc at N = 8 used the default 2 GB shared table; peak
total memory was about 4 GB.
Small depths (≤ 5) always run in one process, so the 4-proc column there
mostly shows run-to-run noise.

### What each optimization bought (CPython, one process)

Start position N = 6 (119 M sequences); Kiwipete N = 5 (194 M); best of
2–3 runs:

| stage | start N = 6 | Kiwipete N = 5 |
|---|---|---|
| legal generator, make every leaf move, no TT | 181.7 s | – |
| + bulk counting at depth 1 (popcounts, no move made) | 34.9 s | – |
| + transposition table (dicts per depth, leaf TT in the counter) | 10.2 s | 19.3 s |
| + leaf TT probed inline in depth-2 nodes | 9.1 s | 18.0 s |
| + lazy king-ray lookups, slider quick-reject in attack tests | **8.8 s** | **16.5 s** |

Overall: 20× faster than the plain legal generator at N = 6 (which itself
already avoids make-and-test legality checking). Parallel, N = 7 on 4 cores:

| stage | start N = 7 |
|---|---|
| 1 process | 108 s |
| 4 workers, private TT each (the original design) | 79.6 s |
| 4 workers, one shared lock-free TT, sized to the job | **27.2 s** |


### `--bench`

CPython 3.13, `python3 perft.py --bench` (4 workers; depth 6 is the only
row big enough to go parallel), "leaves/s" = counted sequences per second:

```
position  depth           count  time (s)       leaves/s
start         1              20     0.000        460,617
start         2             400     0.000      2,240,143
start         3           8,902     0.002      3,981,839
start         4         197,281     0.044      4,517,174
start         5       4,865,609     0.518      9,398,923
start         6     119,060,324     3.293     36,154,480
kiwipete      1              48     0.000        736,851
kiwipete      2           2,039     0.001      3,659,959
kiwipete      3          97,862     0.029      3,403,285
kiwipete      4       4,085,603     0.654      6,247,400
total 4.54s
```

With `--jobs 1` the start-position depth 6 row is 8.5 s (14 M leaves/s) and
the whole suite 9.7 s. Nodes visited per second (`--stats`) is ~0.3 M/s
per core: almost every node is a bulk-counted leaf parent worth ~25–30
sequences, and the TT skips about half of them.

### Why PyPy is not faster here

PyPy's JIT is fastest on machine-word integers. Here, every bitboard that
contains square h8 (bit 63) — black's occupancy for most of a game — and
every 128-bit hash key is a big integer in PyPy, which is slow. On a
micro-benchmark, PyPy is 12× faster than CPython on ints below 2⁶³ but only
3.5× faster at or above it. The generated code is also very branchy:
PyPy spent 4.3 s of a 7.4 s run compiling 825 traces and bridges. Even with
62-bit test hashes and no 2⁶⁴−1 masks, PyPy stayed slower than CPython. A
PyPy-friendly engine would need a different board encoding (e.g. 32-bit
halves or a mailbox), i.e. a second engine. The Numba backend is the better
route to compiled speed.

## How far can you go?

| | practical limit |
|---|---|
| CPython, 1 process | N = 7 in ~2 minutes; N = 8 in ~26 min |
| CPython, all cores | N = 8 in ~7 min on 4 cores (a few minutes on an 8–10-core Mac). N = 9 would take many hours and needs far more TT than a laptop has. |
| PyPy | about the same as CPython or slower; not recommended |
| Numba backend | N = 8 in ~20 s, N = 9 in ~4 min on 4 cores; N = 10 is hours and wants a much larger table |

Rule of thumb: each ply is ~25–30× more work, so if N takes t, N+1 takes
~25t.

## Files

* `perft.py` — the engine, CLI, self-test and benchmark (single file).
* `perft_numba.py` — optional Numba backend (imported only with `--backend numba`).
* `tests/test_perft.py` — pytest suite.
