"""Correctness tests for perft.py.

Fast by default (~1 minute).  Set PERFT_SLOW=1 to also run the expensive
cases (start position depth 6-7, Kiwipete depth 5, ...).

python-chess (pip install chess) is used as an independent cross-check when
it is installed; those tests are skipped otherwise.
"""

import os
import random
import subprocess
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

import perft as P  # noqa: E402

try:
    import chess  # noqa: E402
except ImportError:  # pragma: no cover
    chess = None

SLOW = bool(os.environ.get("PERFT_SLOW"))
needs_chess = pytest.mark.skipif(chess is None, reason="python-chess not installed")
slow = pytest.mark.skipif(not SLOW, reason="set PERFT_SLOW=1")

START = [20, 400, 8902, 197281, 4865609, 119060324, 3195901860, 84998978956]
KIWIPETE = [48, 2039, 97862, 4085603, 193690690]
POS3 = [14, 191, 2812, 43238, 674624, 11030083]

# Well-known edge-case positions (en passant pins, castling through check,
# promotions out of / into check, stalemate, ...), with reference counts.
TRICKY = [
    ("3k4/3p4/8/K1P4r/8/8/8/8 b - - 0 1", 6, 1134888),         # illegal ep (rank pin)
    ("8/8/4k3/8/2p5/8/B2P2K1/8 w - - 0 1", 6, 1015133),        # illegal ep (diag pin)
    ("8/8/1k6/2b5/2pP4/8/5K2/8 b - d3 0 1", 6, 1440467),       # ep capture gives check
    ("5k2/8/8/8/8/8/8/4K2R w K - 0 1", 6, 661072),             # short castle gives check
    ("3k4/8/8/8/8/8/8/R3K3 w Q - 0 1", 6, 803711),             # long castle gives check
    ("r3k2r/1b4bq/8/8/8/8/7B/R3K2R w KQkq - 0 1", 4, 1274206),  # castling rights
    ("r3k2r/8/3Q4/8/8/5q2/8/R3K2R b KQkq - 0 1", 4, 1720476),  # castling prevented
    ("2K2r2/4P3/8/8/8/8/8/3k4 w - - 0 1", 6, 3821001),         # promote out of check
    ("8/8/1P2K3/8/2n5/1q6/8/5k2 b - - 0 1", 5, 1004658),       # discovered check
    ("4k3/1P6/8/8/8/8/K7/8 w - - 0 1", 6, 217342),             # promote to give check
    ("8/P1k5/K7/8/8/8/8/8 w - - 0 1", 6, 92683),               # under-promote to check
    ("K1k5/8/P7/8/8/8/8/8 w - - 0 1", 6, 2217),                # self stalemate
    ("8/k1P5/8/1K6/8/8/8/8 w - - 0 1", 7, 567584),             # stalemate and mate
    ("8/8/2k5/5q2/5n2/8/5K2/8 b - - 0 1", 4, 23527),           # mate and stalemate
    (P.POS4_FEN, 4, 422333),
    (P.POS5_FEN, 4, 2103487),
    (P.POS6_FEN, 3, 89890),
]


def count(fen, depth):
    P.clear_tt()
    return P.perft(P.parse_fen(fen), depth)


# ---------------------------------------------------------------- known answers

@pytest.mark.parametrize("depth", range(1, 6))
def test_start(depth):
    assert count(P.START_FEN, depth) == START[depth - 1]


@pytest.mark.parametrize("depth", range(1, 5))
def test_kiwipete(depth):
    assert count(P.KIWIPETE_FEN, depth) == KIWIPETE[depth - 1]


@pytest.mark.parametrize("depth", range(1, 6))
def test_position3(depth):
    assert count(P.POS3_FEN, depth) == POS3[depth - 1]


@pytest.mark.parametrize("fen,depth,expected", TRICKY)
def test_tricky(fen, depth, expected):
    assert count(fen, depth) == expected


def test_tt_reuse_across_depths_and_positions():
    # Same answers with a warm, shared table (and with a tiny one that is
    # constantly flushed).
    P.clear_tt()
    pos = P.parse_fen(P.KIWIPETE_FEN)
    assert [P.perft(pos, d) for d in range(1, 5)] == KIWIPETE[:4]
    assert P.perft(P.parse_fen(P.START_FEN), 5) == START[4]
    try:
        P.set_tt_size(0.01)
        P.clear_tt()
        assert P.perft(pos, 4) == KIWIPETE[3]
    finally:
        P.set_tt_size(P.DEFAULT_TT_MB)


def test_stats_variant_matches():
    P.clear_tt()
    P.STATS[:] = [0, 0, 0]
    assert P.perft(P.parse_fen(P.KIWIPETE_FEN), 3, stats=True) == KIWIPETE[2]
    assert P.STATS[0] > 0 and P.STATS[1] >= P.STATS[2]


def test_split_and_merge_matches_dfs():
    pos = P.parse_fen(P.KIWIPETE_FEN)
    frontier = P.expand({pos: 1}, 2)
    assert sum(frontier.values()) == KIWIPETE[1]
    assert len(frontier) < KIWIPETE[1]  # some transpositions merged
    P.clear_tt()
    assert sum(m * P.perft(p, 2) for p, m in frontier.items()) == KIWIPETE[3]


def test_engine_parallel():
    eng = P.Engine(jobs=2, tt_mb=64, progress=False, parallel_min_depth=3)
    try:
        assert eng.run(P.parse_fen(P.START_FEN), 4) == START[3]
        assert eng.run(P.parse_fen(P.KIWIPETE_FEN), 3) == KIWIPETE[2]
    finally:
        eng.close()


@slow
@pytest.mark.parametrize("depth", [6, 7])
def test_start_slow(depth):
    eng = P.Engine(progress=False)
    try:
        assert eng.run(P.parse_fen(P.START_FEN), depth) == START[depth - 1]
    finally:
        eng.close()


@slow
def test_kiwipete5_pos3_6():
    eng = P.Engine(progress=False)
    try:
        assert eng.run(P.parse_fen(P.KIWIPETE_FEN), 5) == KIWIPETE[4]
        assert eng.run(P.parse_fen(P.POS3_FEN), 6) == POS3[5]
    finally:
        eng.close()


# ---------------------------------------------------------- FEN / hash / make

def test_fen_roundtrip():
    for fen in [P.START_FEN, P.KIWIPETE_FEN, P.POS3_FEN, P.POS4_FEN, P.POS5_FEN]:
        pos = P.parse_fen(fen)
        assert P.parse_fen(P.to_fen(pos)) == pos


def test_ep_square_only_kept_when_capture_legal():
    # d3 is not capturable at all -> dropped; positions merge.
    a = P.parse_fen("4k3/8/8/8/3P4/8/8/4K3 b - d3 0 1")
    b = P.parse_fen("4k3/8/8/8/3P4/8/8/4K3 b - - 0 1")
    assert a == b
    # Capturable but illegal (rank pin through both pawns) -> dropped.
    a = P.parse_fen("8/8/8/KPp4r/8/8/8/4k3 w - c6 0 1")
    assert a[1][13] == 0
    # Legal -> kept, and hashed.
    a = P.parse_fen("4k3/8/8/2Pp4/8/8/8/4K3 w - d6 0 1")
    b = P.parse_fen("4k3/8/8/2Pp4/8/8/8/4K3 w - - 0 1")
    assert a[1][13] and a[1][14] != b[1][14]


def _walk(pos, depth, seen):
    for _m, ch in P.children(pos):
        seen.append(ch)
        if depth > 1:
            _walk(ch, depth - 1, seen)


def test_incremental_hash_equals_scratch_hash():
    seen = []
    for fen in [P.KIWIPETE_FEN, P.POS4_FEN, P.POS5_FEN, P.POS3_FEN,
                "r3k2r/8/3Q4/8/8/5q2/8/R3K2R b KQkq - 0 1",
                "2K2r2/4P3/8/8/8/8/8/3k4 w - - 0 1"]:
        _walk(P.parse_fen(fen), 2, seen)
    assert len(seen) > 5000
    for stm, a in seen:
        assert a[14] == P.compute_hash(stm, a), P.to_fen((stm, a))


# ------------------------------------------------- python-chess cross-checks

def _random_positions(n, seed=1234, max_plies=120):
    rng = random.Random(seed)
    out = []
    starts = [P.START_FEN, P.KIWIPETE_FEN, P.POS3_FEN, P.POS4_FEN, P.POS5_FEN,
              "r3k2r/1b4bq/8/8/8/8/7B/R3K2R w KQkq - 0 1", "4k3/1P6/8/8/8/8/K7/8 w - - 0 1"]
    while len(out) < n:
        board = chess.Board(rng.choice(starts))
        for _ in range(rng.randrange(max_plies)):
            moves = list(board.legal_moves)
            if not moves:
                break
            # Prefer captures/pawn moves now and then to reach odd positions.
            board.push(rng.choice(moves))
            if board.is_game_over():
                break
            out.append(board.fen())
    return out[:n]


def _pc_perft(board, depth):
    if depth == 1:
        return board.legal_moves.count()
    n = 0
    for m in board.legal_moves:
        board.push(m)
        n += _pc_perft(board, depth - 1)
        board.pop()
    return n


@needs_chess
def test_moves_and_children_match_python_chess():
    """Every legal move and every resulting position, field by field."""
    fens = _random_positions(400)
    for fen in fens:
        board = chess.Board(fen)
        pos = P.parse_fen(fen)
        ours = {P.move_uci(m): ch for m, ch in P.children(pos)}
        theirs = {m.uci(): m for m in board.legal_moves}
        assert set(ours) == set(theirs), fen
        for uci, m in theirs.items():
            board.push(m)
            expected = P.parse_fen(board.fen())
            board.pop()
            assert ours[uci] == expected, (fen, uci)


@needs_chess
def test_counts_match_python_chess():
    fens = _random_positions(60, seed=99)
    for fen in fens:
        board = chess.Board(fen)
        assert count(fen, 1) == board.legal_moves.count(), fen
        assert count(fen, 2) == _pc_perft(board, 2), fen
    for fen in fens[:12]:
        assert count(fen, 3) == _pc_perft(chess.Board(fen), 3), fen


# ------------------------------------------------------------------------- CLI

def _cli(*args):
    return subprocess.run([sys.executable, os.path.join(ROOT, "perft.py")] + list(args),
                          capture_output=True, text=True, timeout=600)


def test_cli_table():
    r = _cli("4", "--no-progress")
    assert r.returncode == 0, r.stderr
    lines = r.stdout.splitlines()
    assert lines[0] == "N (moves) |         Sequences | Time (s)"
    assert lines[1] == "----------+-------------------+---------"
    assert lines[2].startswith("        1 |                20 |")
    assert lines[5].startswith("        4 |           197,281 |")
    assert any(l.startswith("Total elapsed:") for l in lines)


def test_cli_stats_and_fen():
    r = _cli("3", "--fen", P.KIWIPETE_FEN, "--stats", "--no-progress")
    assert r.returncode == 0, r.stderr
    assert "97,862" in r.stdout
    for key in ("Nodes visited", "Nodes/second", "hit rate", "Peak memory"):
        assert key in r.stdout


def test_cli_divide():
    r = _cli("3", "--divide", "--fen", P.POS3_FEN, "--no-progress")
    assert r.returncode == 0, r.stderr
    assert "Total: 2,812" in r.stdout
    assert "Moves: 14" in r.stdout


def test_cli_selftest():
    r = _cli("--selftest")
    assert r.returncode == 0, r.stdout + r.stderr
    assert "PASSED" in r.stdout


def test_cli_bad_fen():
    r = _cli("2", "--fen", "not a fen")
    assert r.returncode != 0
