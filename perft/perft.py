#!/usr/bin/env python3
"""perft.py - exact chess perft (move-path enumeration) in pure Python.

    python3 perft.py N              table for depths 1..N from the start position
    python3 perft.py N --stats      also nodes, nodes/s, TT hit rate, peak memory
    python3 perft.py N --fen FEN    start from another position
    python3 perft.py N --divide     per-first-move counts at depth N
    python3 perft.py --selftest     known-answer tests
    python3 perft.py --bench        benchmark suite

Design (see README.md for the full story and measurements):

* Bitboards are plain Python ints. A side is (P, N, D, O, K, A): pawns,
  knights, diagonal sliders (bishops+queens), orthogonal sliders
  (rooks+queens), king square, all pieces.  A queen sits in both D and O.
* Sliding attacks come from per-square dicts keyed by the masked occupancy
  (``RT[sq][occ & RM[sq]]``) - a perfect hash that needs no magic multiply.
* Moves are generated strictly legally with a check mask and pin mask
  computed once per node; only en passant is verified by make-and-test.
* The hot functions are *generated source*: one template is specialised for
  white and for black (shift directions, tables and constants baked in), and
  for three uses: counting (with TT), counting with statistics, and
  collecting the child positions (root splitting, --divide, tests).
  Generated code does copy-make: the child position is just the argument list
  of the recursive call, so there is no unmake and no move object at all.
* Leaves are bulk counted with popcounts; a transposition table keyed on an
  incrementally updated 128-bit Zobrist key stores exact subtree counts.
* Work is split across processes at a shallow ply after merging identical
  positions (breadth-first with multiplicities), then each worker runs
  depth-first with its own transposition table.
"""

import os
import re
import sys
import time
import random
import string

FULL = (1 << 64) - 1
NOT_A = 0xFEFEFEFEFEFEFEFE
NOT_H = 0x7F7F7F7F7F7F7F7F
RANK1 = 0xFF
RANK2 = 0xFF << 8
RANK3 = 0xFF << 16
RANK6 = 0xFF << 40
RANK7 = 0xFF << 48
RANK8 = 0xFF << 56

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
KIWIPETE_FEN = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1"
POS3_FEN = "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1"
POS4_FEN = "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1"
POS5_FEN = "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8"
POS6_FEN = "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10"


# ---------------------------------------------------------------------------
# Lookup tables (built once per process; ~0.1 s)
# ---------------------------------------------------------------------------

def _leaper(deltas):
    t = []
    for s in range(64):
        f, r = s & 7, s >> 3
        b = 0
        for df, dr in deltas:
            ff, rr = f + df, r + dr
            if 0 <= ff < 8 and 0 <= rr < 8:
                b |= 1 << (rr * 8 + ff)
        t.append(b)
    return t


NA = _leaper([(1, 2), (2, 1), (2, -1), (1, -2), (-1, -2), (-2, -1), (-2, 1), (-1, 2)])
KA = _leaper([(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)])
PAW = _leaper([(-1, 1), (1, 1)])     # squares a white pawn on s attacks
PAB = _leaper([(-1, -1), (1, -1)])   # squares a black pawn on s attacks

ROOK_DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]
BISHOP_DIRS = [(1, 1), (1, -1), (-1, 1), (-1, -1)]


def _ray(s, df, dr):
    f, r = s & 7, s >> 3
    out = []
    f += df
    r += dr
    while 0 <= f < 8 and 0 <= r < 8:
        out.append(r * 8 + f)
        f += df
        r += dr
    return out


def _dir_table(s, df, dr):
    """{masked occupancy along one ray: attack set along that ray}."""
    ray = _ray(s, df, dr)
    rel = ray[:-1]  # the last square never blocks anything beyond it
    table = {}
    for bits in range(1 << len(rel)):
        occ = 0
        for i, sq in enumerate(rel):
            if bits >> i & 1:
                occ |= 1 << sq
        att = 0
        for sq in ray:
            att |= 1 << sq
            if occ >> sq & 1:
                break
        table[occ] = att
    return table


def _slider_tables(dirs):
    masks, tables, empty = [], [], []
    for s in range(64):
        combined = {0: 0}
        for df, dr in dirs:
            t = _dir_table(s, df, dr)
            combined = {k1 | k2: v1 | v2 for k1, v1 in combined.items() for k2, v2 in t.items()}
        m = 0
        e = 0
        for df, dr in dirs:
            ray = _ray(s, df, dr)
            for sq in ray[:-1]:
                m |= 1 << sq
            for sq in ray:
                e |= 1 << sq
        masks.append(m)
        tables.append(combined)
        empty.append(e)
    return masks, tables, empty


RM, RT, RE = _slider_tables(ROOK_DIRS)
BM, BT, BE = _slider_tables(BISHOP_DIRS)

# BTW[a][b]: squares strictly between aligned a and b.  LN[a][b]: the whole
# line through a and b (edge to edge), 0 if they are not aligned.
BTW = [[0] * 64 for _ in range(64)]
LN = [[0] * 64 for _ in range(64)]
for _a in range(64):
    for _df, _dr in ROOK_DIRS + BISHOP_DIRS:
        _fwd = _ray(_a, _df, _dr)
        _line = (1 << _a)
        for _sq in _fwd + _ray(_a, -_df, -_dr):
            _line |= 1 << _sq
        _between = 0
        for _sq in _fwd:
            BTW[_a][_sq] = _between
            LN[_a][_sq] = _line
            _between |= 1 << _sq

# Castling-rights masks: rights bits 1=K 2=Q 4=k 8=q.  A move touching one of
# these squares (from or to) clears the associated rights.
CRM = [15] * 64
CRM[0], CRM[4], CRM[7] = 13, 12, 14
CRM[56], CRM[60], CRM[63] = 7, 3, 11
CORNERS = (1 << 0) | (1 << 7) | (1 << 56) | (1 << 63)

# ---------------------------------------------------------------------------
# Zobrist keys (128-bit: a false TT hit is ~2^-128 per probe, i.e. never)
# ---------------------------------------------------------------------------

_rng = random.Random(0x5EED_C4E55)


def _rand():
    return _rng.getrandbits(128)


PIECES = "PNBRQK"
ZW = [[_rand() for _ in range(64)] for _ in PIECES]
ZB = [[_rand() for _ in range(64)] for _ in PIECES]
ZW_P, ZW_N, ZW_B, ZW_R, ZW_Q, ZW_K = ZW
ZB_P, ZB_N, ZB_B, ZB_R, ZB_Q, ZB_K = ZB
ZCR = [_rand() for _ in range(16)]
ZCR[0] = 0
ZEP = [_rand() for _ in range(8)]
ZBLACK = _rand()


def _pair(z, delta):
    return [z[s + delta] ^ z[s] if 0 <= s + delta < 64 else 0 for s in range(64)]


# Hash deltas for pawn moves, indexed by destination square.
ZPUSH_W, ZPUSH2_W = _pair(ZW_P, -8), _pair(ZW_P, -16)
ZCAPL_W, ZCAPR_W = _pair(ZW_P, -7), _pair(ZW_P, -9)
ZPUSH_B, ZPUSH2_B = _pair(ZB_P, 8), _pair(ZB_P, 16)
ZCAPL_B, ZCAPR_B = _pair(ZB_P, 9), _pair(ZB_P, 7)


def _castle_consts(base, ZK, ZR):
    # (empty mask, check sq 1, check sq 2, king dest, rook xor, all xor, hash)
    e, g, f, d, c, b, a, h = (base + i for i in (4, 6, 5, 3, 2, 1, 0, 7))
    ks = ((1 << f) | (1 << g), f, g, g, (1 << h) | (1 << f),
          (1 << e) | (1 << f) | (1 << g) | (1 << h),
          ZK[e] ^ ZK[g] ^ ZR[h] ^ ZR[f])
    qs = ((1 << b) | (1 << c) | (1 << d), d, c, c, (1 << a) | (1 << d),
          (1 << a) | (1 << c) | (1 << d) | (1 << e),
          ZK[e] ^ ZK[c] ^ ZR[a] ^ ZR[d])
    return ks, qs


(KSE_W, KS1_W, KS2_W, KST_W, KSR_W, KSA_W, KSH_W), \
    (QSE_W, QS1_W, QS2_W, QST_W, QSR_W, QSA_W, QSH_W) = _castle_consts(0, ZW_K, ZW_R)
(KSE_B, KS1_B, KS2_B, KST_B, KSR_B, KSA_B, KSH_B), \
    (QSE_B, QS1_B, QS2_B, QST_B, QSR_B, QSA_B, QSH_B) = _castle_consts(56, ZB_K, ZB_R)


# ---------------------------------------------------------------------------
# En passant: the one case verified by make-and-test (it is rare)
# ---------------------------------------------------------------------------

def ep_captures(uP, uN, uD, uO, uK, uA, tP, tN, tD, tO, tK, tA, ep, white):
    """Bitboards of our pawns that can legally capture en passant onto ep."""
    es = ep.bit_length() - 1
    if white:
        capb = ep >> 8
        cands = PAB[es] & uP
        pa = PAW
    else:
        capb = ep << 8
        cands = PAW[es] & uP
        pa = PAB
    res = []
    if not cands:
        return res
    occ = uA | tA
    k = uK
    tP2 = tP ^ capb
    while cands:
        fb = cands & -cands
        cands ^= fb
        o = occ ^ fb ^ ep ^ capb
        if (NA[k] & tN or pa[k] & tP2 or RT[k][o & RM[k]] & tO
                or BT[k][o & BM[k]] & tD):
            continue
        res.append(fb)
    return res


# ---------------------------------------------------------------------------
# Code generation for the hot functions
# ---------------------------------------------------------------------------
#
# Template conventions
#   $X / ${X}     colour-specific token (see _TOKENS)
#   @CAP          line macro: classify the captured piece on tb/ts into
#                 cP cN cD cO (their new boards), ccr (rights), hx (hash delta)
#   @ATK(s,o)     "square s is attacked by them with occupancy o"
#   ##P ##S ##L   line tags: perft / stats-only / collect-only lines
#   ##M expr      a child call; in the collect variant it becomes
#                 out.append((move_code, child_args)) using expr as move code
#
# Function signature (all variants):
#   (uP, uN, uD, uO, uK, uA, tP, tN, tD, tO, tK, tA, cr, ep, h, d)
#   u* = side to move, t* = opponent, K = king square, A = all pieces,
#   cr = castling rights, ep = en passant target bitboard (only set if an
#   en passant capture is legal), h = Zobrist key, d = remaining depth.

_TOKENS = {
    "W": dict(C="W", O="B", PUSH1="<< 8", BACK1=">> 8", BACK2=">> 16",
              CAPL="((pp & NOT_A) << 7)", BACKL=">> 7",
              CAPR="((pp & NOT_H) << 9)", BACKR=">> 9",
              FROM1="- 8", FROML="- 7", FROMR="- 9",
              R3="RANK3", R7="RANK7", R8="RANK8", PAU="PAW",
              KEEP="12", CRU="3", CK="1", CQ="2", SIDE="",
              ZU="ZW", ZT="ZB", WHITE="True", OSIDE=" ^ ZBLACK", NWHITE="False", EPSH=">> 8"),
    "B": dict(C="B", O="W", PUSH1=">> 8", BACK1="<< 8", BACK2="<< 16",
              CAPL="((pp & NOT_A) >> 9)", BACKL="<< 9",
              CAPR="((pp & NOT_H) >> 7)", BACKR="<< 7",
              FROM1="+ 8", FROML="+ 9", FROMR="+ 7",
              R3="RANK6", R7="RANK2", R8="RANK1", PAU="PAB",
              KEEP="3", CRU="12", CK="4", CQ="8", SIDE=" ^ ZBLACK",
              ZU="ZB", ZT="ZW", WHITE="False", OSIDE="", NWHITE="True", EPSH="<< 8"),
}

_CAP = """\
if tb & tP:
    cP = tP ^ tb; cN = tN; cD = tD; cO = tO; ccr = cr; hx = ${ZT}_P[ts]
elif tb & tN:
    cP = tP; cN = tN ^ tb; cD = tD; cO = tO; ccr = cr; hx = ${ZT}_N[ts]
elif tb & tO:
    cP = tP; cN = tN; cO = tO ^ tb; ccr = cr
    if tb & tD:
        cD = tD ^ tb; hx = ${ZT}_Q[ts]
    else:
        cD = tD; hx = ${ZT}_R[ts]
        if cr and tb & CORNERS:
            ccr = cr & CRM[ts]; hx ^= ZCR[cr] ^ ZCR[ccr]
else:
    cP = tP; cN = tN; cD = tD ^ tb; cO = tO; ccr = cr; hx = ${ZT}_B[ts]
"""

# Shared prologue: checkers, pins, check mask.
_PROLOGUE = """\
    occ = uA | tA
    k = uK
    ra = RT[k][occ & RM[k]]
    ba = BT[k][occ & BM[k]]
    chk = (NA[k] & tN) | ($PAU[k] & tP) | (ra & tO) | (ba & tD)
    btk = BTW[k]
    pinned = 0
    sn = (RE[k] & tO & ~ra) | (BE[k] & tD & ~ba)
    while sn:
        b = sn & -sn
        sn ^= b
        x = btk[b.bit_length() - 1] & occ
        if x & uA and not x & (x - 1):
            pinned |= x
    empty = FULL ^ occ
"""

_GEN = """\
def ${NAME}_$C(uP, uN, uD, uO, uK, uA, tP, tN, tD, tO, tK, tA, cr, ep, h, d):
    STATS[0] += 1  ##S
    STATS[1] += 1  ##S
    key = h$SIDE  ##PD
    t = TT[d]  ##PD
    v = t.get(key)  ##PD
    if v is not None:  ##PD
        STATS[2] += 1  ##SD
        return v  ##PD
    key = h ^ ZD_$C[d]  ##PA
    ti = key & IM2  ##PA
    v = TA2[ti + 1]  ##PA
    if TA2[ti] ^ v == key >> 64:  ##PA
        STATS[2] += 1  ##SA
        return v  ##PA
    total = 0  ##P
    out = []  ##L
    d1 = d - 1  ##PG
    f = ${NAME2}_$O if d1 == 2 else ${NAME}_$O  ##PG
$PROLOGUE
    if ep:
        h0 = h ^ ZEP[(ep.bit_length() - 1) & 7]
    else:
        h0 = h
    if not chk & (chk - 1):
        if chk:
            tg = btk[chk.bit_length() - 1] | chk
        else:
            tg = FULL ^ uA
        lnk = LN[k]
        # ---- knights (pinned knights never move)
        x = uN & ~pinned
        while x:
            fb = x & -x
            x ^= fb
            fs = fb.bit_length() - 1
            a = NA[fs] & tg
            hq = h0 ^ ${ZU}_N[fs]
            q = a & empty
            while q:
                tb = q & -q
                q ^= tb
                mv = fb | tb
                total += f(tP, tN, tD, tO, tK, tA, uP, uN ^ mv, uD, uO, uK, uA ^ mv, cr, 0, hq ^ ${ZU}_N[tb.bit_length() - 1], d1)  ##M fs | (tb.bit_length() - 1) << 6
            a &= tA
            while a:
                tb = a & -a
                a ^= tb
                ts = tb.bit_length() - 1
                @CAP
                mv = fb | tb
                total += f(cP, cN, cD, cO, tK, tA ^ tb, uP, uN ^ mv, uD, uO, uK, uA ^ mv, ccr, 0, hq ^ hx ^ ${ZU}_N[ts], d1)  ##M fs | ts << 6
        # ---- diagonal sliders (bishops, queens)
        x = uD
        while x:
            fb = x & -x
            x ^= fb
            fs = fb.bit_length() - 1
            a = BT[fs][occ & BM[fs]] & tg
            if fb & pinned:
                a &= lnk[fs]
            if fb & uO:
                z = ${ZU}_Q
                qm = FULL
            else:
                z = ${ZU}_B
                qm = 0
            hq = h0 ^ z[fs]
            q = a & empty
            while q:
                tb = q & -q
                q ^= tb
                mv = fb | tb
                total += f(tP, tN, tD, tO, tK, tA, uP, uN, uD ^ mv, uO ^ (mv & qm), uK, uA ^ mv, cr, 0, hq ^ z[tb.bit_length() - 1], d1)  ##M fs | (tb.bit_length() - 1) << 6
            a &= tA
            while a:
                tb = a & -a
                a ^= tb
                ts = tb.bit_length() - 1
                @CAP
                mv = fb | tb
                total += f(cP, cN, cD, cO, tK, tA ^ tb, uP, uN, uD ^ mv, uO ^ (mv & qm), uK, uA ^ mv, ccr, 0, hq ^ hx ^ z[ts], d1)  ##M fs | ts << 6
        # ---- orthogonal sliders (rooks, queens)
        x = uO
        while x:
            fb = x & -x
            x ^= fb
            fs = fb.bit_length() - 1
            a = RT[fs][occ & RM[fs]] & tg
            if fb & pinned:
                a &= lnk[fs]
            if fb & uD:
                z = ${ZU}_Q
                qm = FULL
            else:
                z = ${ZU}_R
                qm = 0
            rm = CRM[fs]
            ncr = cr & rm
            hb = h0 ^ z[fs]
            hq = hb ^ ZCR[cr] ^ ZCR[ncr]
            q = a & empty
            while q:
                tb = q & -q
                q ^= tb
                mv = fb | tb
                total += f(tP, tN, tD, tO, tK, tA, uP, uN, uD ^ (mv & qm), uO ^ mv, uK, uA ^ mv, ncr, 0, hq ^ z[tb.bit_length() - 1], d1)  ##M fs | (tb.bit_length() - 1) << 6
            a &= tA
            while a:
                tb = a & -a
                a ^= tb
                ts = tb.bit_length() - 1
                @CAP
                mv = fb | tb
                fcr = ccr & rm
                total += f(cP, cN, cD, cO, tK, tA ^ tb, uP, uN, uD ^ (mv & qm), uO ^ mv, uK, uA ^ mv, fcr, 0, hb ^ hx ^ ZCR[ccr] ^ ZCR[fcr] ^ z[ts], d1)  ##M fs | ts << 6
        # ---- pawns: unpinned ones as a set, then each pinned one on its line
        pp = uP & ~pinned
        pm = tg
        rest = uP & pinned
        while True:
            s1 = (pp $PUSH1) & empty
            s2 = ((s1 & $R3) $PUSH1) & empty & pm
            s1 &= pm
            pr = s1 & $R8
            s1 ^= pr
            while s1:
                tb = s1 & -s1
                s1 ^= tb
                ts = tb.bit_length() - 1
                mv = tb | (tb $BACK1)
                total += f(tP, tN, tD, tO, tK, tA, uP ^ mv, uN, uD, uO, uK, uA ^ mv, cr, 0, h0 ^ ZPUSH_$C[ts], d1)  ##M (ts $FROM1) | ts << 6
            while s2:
                tb = s2 & -s2
                s2 ^= tb
                ts = tb.bit_length() - 1
                mv = tb | (tb $BACK2)
                eb = tb $BACK1
                hz = h0 ^ ZPUSH2_$C[ts]
                ne = 0
                if $PAU[ts $FROM1] & tP:
                    if ep_captures(tP, tN, tD, tO, tK, tA, uP ^ mv, uN, uD, uO, uK, uA ^ mv, eb, $NWHITE):
                        ne = eb
                        hz ^= ZEP[ts & 7]
                total += f(tP, tN, tD, tO, tK, tA, uP ^ mv, uN, uD, uO, uK, uA ^ mv, cr, ne, hz, d1)  ##M (ts $FROM1 $FROM1) | ts << 6
            while pr:
                tb = pr & -pr
                pr ^= tb
                ts = tb.bit_length() - 1
                fb = tb $BACK1
                hb = h0 ^ ${ZU}_P[ts $FROM1]
                nP = uP ^ fb
                nA = uA ^ fb ^ tb
                total += f(tP, tN, tD, tO, tK, tA, nP, uN, uD | tb, uO | tb, uK, nA, cr, 0, hb ^ ${ZU}_Q[ts], d1)  ##M (ts $FROM1) | ts << 6 | 4 << 12
                total += f(tP, tN, tD, tO, tK, tA, nP, uN | tb, uD, uO, uK, nA, cr, 0, hb ^ ${ZU}_N[ts], d1)  ##M (ts $FROM1) | ts << 6 | 1 << 12
                total += f(tP, tN, tD, tO, tK, tA, nP, uN, uD | tb, uO, uK, nA, cr, 0, hb ^ ${ZU}_B[ts], d1)  ##M (ts $FROM1) | ts << 6 | 2 << 12
                total += f(tP, tN, tD, tO, tK, tA, nP, uN, uD, uO | tb, uK, nA, cr, 0, hb ^ ${ZU}_R[ts], d1)  ##M (ts $FROM1) | ts << 6 | 3 << 12
$PAWNCAPS
            if not rest:
                break
            pp = rest & -rest
            rest ^= pp
            pm = tg & lnk[pp.bit_length() - 1]
    # ---- en passant (make-and-test; also valid under double check)
    if ep:
        cb = ep $EPSH
        es = ep.bit_length() - 1
        for fb in ep_captures(uP, uN, uD, uO, uK, uA, tP, tN, tD, tO, tK, tA, ep, $WHITE):
            fs = fb.bit_length() - 1
            mv = fb | ep
            total += f(tP ^ cb, tN, tD, tO, tK, tA ^ cb, uP ^ mv, uN, uD, uO, uK, uA ^ mv, cr, 0, h0 ^ ${ZU}_P[fs] ^ ${ZU}_P[es] ^ ${ZT}_P[cb.bit_length() - 1], d1)  ##M fs | es << 6 | 8 << 12
    # ---- king
    tKb = 1 << tK
    kt = KA[k] & ~uA
    if kt:
        o2 = occ ^ (1 << k)
        ncr = cr & $KEEP
        hb = h0 ^ ${ZU}_K[k]
        hq = hb ^ ZCR[cr] ^ ZCR[ncr]
        while kt:
            tb = kt & -kt
            kt ^= tb
            ts = tb.bit_length() - 1
            if @ATK(ts,o2):
                continue
            mv = (1 << k) | tb
            if tb & tA:
                @CAP
                fcr = ccr & $KEEP
                total += f(cP, cN, cD, cO, tK, tA ^ tb, uP, uN, uD, uO, ts, uA ^ mv, fcr, 0, hb ^ hx ^ ZCR[ccr] ^ ZCR[fcr] ^ ${ZU}_K[ts], d1)  ##M k | ts << 6
            else:
                total += f(tP, tN, tD, tO, tK, tA, uP, uN, uD, uO, ts, uA ^ mv, ncr, 0, hq ^ ${ZU}_K[ts], d1)  ##M k | ts << 6
    # ---- castling (rights imply king and rook on their home squares)
    if cr & $CRU and not chk:
        if cr & $CK and not occ & KSE_$C and not @ATK(KS1_$C,occ) and not @ATK(KS2_$C,occ):
            total += f(tP, tN, tD, tO, tK, tA, uP, uN, uD, uO ^ KSR_$C, KST_$C, uA ^ KSA_$C, cr & $KEEP, 0, h0 ^ KSH_$C ^ ZCR[cr] ^ ZCR[cr & $KEEP], d1)  ##M k | KST_$C << 6 | 16 << 12
        if cr & $CQ and not occ & QSE_$C and not @ATK(QS1_$C,occ) and not @ATK(QS2_$C,occ):
            total += f(tP, tN, tD, tO, tK, tA, uP, uN, uD, uO ^ QSR_$C, QST_$C, uA ^ QSA_$C, cr & $KEEP, 0, h0 ^ QSH_$C ^ ZCR[cr] ^ ZCR[cr & $KEEP], d1)  ##M k | QST_$C << 6 | 16 << 12
    if len(t) >= CAPS[d]:  ##PD
        t.clear()  ##PD
    t[key] = total  ##PD
    TA2[ti + 1] = total  ##PA
    TA2[ti] = (key >> 64) ^ total  ##PA
    return total  ##P
    return out  ##L
"""

_PAWNCAP_ONE = """\
            c = $CAP_EXPR & tA & pm
            prc = c & $R8
            c ^= prc
            while c:
                tb = c & -c
                c ^= tb
                ts = tb.bit_length() - 1
                @CAP
                mv = tb | (tb $BACK_)
                total += f(cP, cN, cD, cO, tK, tA ^ tb, uP ^ mv, uN, uD, uO, uK, uA ^ mv, ccr, 0, h0 ^ hx ^ $ZTAB[ts], d1)  ##M (ts $FROM_) | ts << 6
            while prc:
                tb = prc & -prc
                prc ^= tb
                ts = tb.bit_length() - 1
                @CAP
                fb = tb $BACK_
                hb = h0 ^ hx ^ ${ZU}_P[ts $FROM_]
                nP = uP ^ fb
                nA = uA ^ fb ^ tb
                tA2 = tA ^ tb
                total += f(cP, cN, cD, cO, tK, tA2, nP, uN, uD | tb, uO | tb, uK, nA, ccr, 0, hb ^ ${ZU}_Q[ts], d1)  ##M (ts $FROM_) | ts << 6 | 4 << 12
                total += f(cP, cN, cD, cO, tK, tA2, nP, uN | tb, uD, uO, uK, nA, ccr, 0, hb ^ ${ZU}_N[ts], d1)  ##M (ts $FROM_) | ts << 6 | 1 << 12
                total += f(cP, cN, cD, cO, tK, tA2, nP, uN, uD | tb, uO, uK, nA, ccr, 0, hb ^ ${ZU}_B[ts], d1)  ##M (ts $FROM_) | ts << 6 | 2 << 12
                total += f(cP, cN, cD, cO, tK, tA2, nP, uN, uD, uO | tb, uK, nA, ccr, 0, hb ^ ${ZU}_R[ts], d1)  ##M (ts $FROM_) | ts << 6 | 3 << 12
"""

_CNT = """\
def ${CNT}_$C(uP, uN, uD, uO, uK, uA, tP, tN, tD, tO, tK, tA, cr, ep, h, d):
    STATS[0] += 1  ##S
$PROLOGUE
    n = 0
    if not chk & (chk - 1):
        if chk:
            tg = btk[chk.bit_length() - 1] | chk
        else:
            tg = FULL ^ uA
        x = uN & ~pinned
        while x:
            b = x & -x
            x ^= b
            n += (NA[b.bit_length() - 1] & tg).bit_count()
        if pinned:
            lnk = LN[k]
            x = uD
            while x:
                b = x & -x
                x ^= b
                s = b.bit_length() - 1
                if b & pinned:
                    n += (BT[s][occ & BM[s]] & tg & lnk[s]).bit_count()
                else:
                    n += (BT[s][occ & BM[s]] & tg).bit_count()
            x = uO
            while x:
                b = x & -x
                x ^= b
                s = b.bit_length() - 1
                if b & pinned:
                    n += (RT[s][occ & RM[s]] & tg & lnk[s]).bit_count()
                else:
                    n += (RT[s][occ & RM[s]] & tg).bit_count()
        else:
            x = uD
            while x:
                b = x & -x
                x ^= b
                s = b.bit_length() - 1
                n += (BT[s][occ & BM[s]] & tg).bit_count()
            x = uO
            while x:
                b = x & -x
                x ^= b
                s = b.bit_length() - 1
                n += (RT[s][occ & RM[s]] & tg).bit_count()
        pp = uP & ~pinned
        pm = tg
        rest = uP & pinned
        while True:
            s1 = (pp $PUSH1) & empty
            s2 = ((s1 & $R3) $PUSH1) & empty
            a = tA & pm
            c = $CAPL & a
            cx = $CAPR & a
            a = (s1 | s2) & pm | c
            n += a.bit_count() + cx.bit_count()
            if pp & $R7:
                n += 3 * ((a & $R8).bit_count() + (cx & $R8).bit_count())
            if not rest:
                break
            pp = rest & -rest
            rest ^= pp
            pm = tg & LN[k][pp.bit_length() - 1]
    if ep:
        n += len(ep_captures(uP, uN, uD, uO, uK, uA, tP, tN, tD, tO, tK, tA, ep, $WHITE))
    tKb = 1 << tK
    kt = KA[k] & ~uA
    if kt:
        o2 = occ ^ (1 << k)
        while kt:
            b = kt & -kt
            kt ^= b
            s = b.bit_length() - 1
            if not @ATK(s,o2):
                n += 1
    if cr & $CRU and not chk:
        if cr & $CK and not occ & KSE_$C and not @ATK(KS1_$C,occ) and not @ATK(KS2_$C,occ):
            n += 1
        if cr & $CQ and not occ & QSE_$C and not @ATK(QS1_$C,occ) and not @ATK(QS2_$C,occ):
            n += 1
    if len(T1) >= CAP1:  ##PD
        T1.clear()  ##PD
    T1[h$SIDE] = n  ##PD
    key = h ^ Z1_$C  ##PA
    ti = key & IM1  ##PA
    TA1[ti + 1] = n  ##PA
    TA1[ti] = (key >> 64) ^ n  ##PA
    return n
"""

_ATK_RE = re.compile(r"@ATK\((\w+),(\w+)\)")
_MOVE_RE = re.compile(r"^(\s*)total \+= f\((.*), d1\)  ##M (.*)$")
_TAG_RE = re.compile(r"^(.*?)  ##([A-Z]+)$")


def _split_args(s):
    out, depth, cur = [], 0, ""
    for ch in s:
        if ch == "," and depth == 0:
            out.append(cur.strip())
            cur = ""
            continue
        depth += ch in "([" and 1 or ch in ")]" and -1 or 0
        cur += ch
    out.append(cur.strip())
    return out


def _render(template, color, variant, names):
    """Specialise a template for a colour and a variant.

    variant letters: P perft (with TT), G interior node, Q node whose
    children are leaves (probes the leaf TT inline, then bulk counts),
    S statistics counters, L collect children instead of counting,
    D / A transposition table in dicts / in a flat (shareable) array."""
    tok = dict(_TOKENS[color])
    tok.update(names)
    pawncaps = []
    for side in ("L", "R"):
        pawncaps.append(_PAWNCAP_ONE
                        .replace("$CAP_EXPR", "$CAP" + side)
                        .replace("$BACK_", "$BACK" + side)
                        .replace("$FROM_", "$FROM" + side)
                        .replace("$ZTAB", ("ZCAPL_" if side == "L" else "ZCAPR_") + color))
    src = (template.replace("$PROLOGUE\n", _PROLOGUE)
           .replace("$PAWNCAPS\n", "".join(pawncaps)))
    lines = []
    for line in src.split("\n"):
        if line.strip() == "@CAP":
            indent = line[:len(line) - len(line.lstrip())]
            lines.extend(indent + l for l in _CAP.rstrip("\n").split("\n"))
        else:
            lines.append(line)
    src = string.Template("\n".join(lines)).substitute(tok)
    pau = tok["PAU"]
    src = _ATK_RE.sub(
        lambda m: "(NA[{0}] & tN or {2}[{0}] & tP or KA[{0}] & tKb or RT[{0}][{1} & RM[{0}]] & tO"
                  " or BT[{0}][{1} & BM[{0}]] & tD)".format(m.group(1), m.group(2), pau), src)
    lines = []
    for line in src.split("\n"):
        m = _MOVE_RE.match(line)
        if m:
            ind = m.group(1)
            if "L" in variant:
                lines.append("%sout.append((%s, (%s)))" % (ind, m.group(3), m.group(2)))
            elif "Q" in variant:
                a = _split_args(m.group(2))
                assert len(a) == 15, a
                lines.append("%shc = %s" % (ind, a[14]))
                if "S" in variant:
                    lines.append("%sSTATS[1] += 1" % ind)
                if "A" in variant:
                    lines.append("%sk1 = hc ^ Z1_%s" % (ind, tok["O"]))
                    lines.append("%stj = k1 & IM1" % ind)
                    lines.append("%sv = TA1[tj + 1]" % ind)
                    lines.append("%sif TA1[tj] ^ v != k1 >> 64:" % ind)
                else:
                    lines.append("%sv = T1.get(hc%s)" % (ind, tok["OSIDE"]))
                    lines.append("%sif v is None:" % ind)
                lines.append("%s    v = %s_%s(%s, hc, 1)" % (ind, tok["CNT"], tok["O"], ", ".join(a[:14])))
                if "S" in variant:
                    lines.append("%selse:" % ind)
                    lines.append("%s    STATS[2] += 1" % ind)
                lines.append("%stotal += v" % ind)
            else:
                lines.append("%stotal += f(%s, d1)" % (ind, m.group(2)))
            continue
        m = _TAG_RE.match(line)
        if m:
            if set(m.group(2)) <= set(variant):
                lines.append(m.group(1))
            continue
        lines.append(line)
    return "\n".join(lines)


def _prefix(stats, kind):
    return ("s" if stats else "") + ("a" if kind == "array" else "")


def _build_source(stats=False, kind="dict"):
    v = "P" + ("S" if stats else "") + ("A" if kind == "array" else "D")
    p = _prefix(stats, kind)
    names = dict(NAME=p + "gen", NAME2=p + "gen2", CNT=p + "cnt")
    parts = []
    for color in "WB":
        parts.append(_render(_GEN, color, v + "G", names))
        parts.append(_render(_GEN, color, v + "Q", dict(names, NAME=names["NAME2"])))
        parts.append(_render(_CNT, color, v, names))
    return "\n\n".join(parts)


def _build_collect_source():
    names = dict(NAME="col", NAME2="col", CNT="col")
    return "\n\n".join(_render(_GEN, c, "L", names) for c in "WB")


# Names the generated code may reference; they are bound as closure cells
# (LOAD_DEREF) by wrapping the generated functions in a factory function.
_SHARED = """NA KA PAW PAB RM RT RE BM BT BE BTW LN CRM CORNERS FULL NOT_A NOT_H
RANK1 RANK2 RANK3 RANK6 RANK7 RANK8 ZW_P ZW_N ZW_B ZW_R ZW_Q ZW_K ZB_P ZB_N
ZB_B ZB_R ZB_Q ZB_K ZCR ZEP ZBLACK ZPUSH_W ZPUSH2_W ZCAPL_W ZCAPR_W ZPUSH_B
ZPUSH2_B ZCAPL_B ZCAPR_B KSE_W KS1_W KS2_W KST_W KSR_W KSA_W KSH_W QSE_W QS1_W
QS2_W QST_W QSR_W QSA_W QSH_W KSE_B KS1_B KS2_B KST_B KSR_B KSA_B KSH_B QSE_B
QS1_B QS2_B QST_B QSR_B QSA_B QSH_B ep_captures TT T1 CAPS CAP1 STATS
ZD_W ZD_B Z1_W Z1_B TA1 TA2 IM1 IM2""".split()


def _compile(src, func_names, env):
    params = [n for n in _SHARED if n in env]
    body = "\n".join("    " + l if l else l for l in src.split("\n"))
    factory = "def _factory(%s):\n%s\n    return (%s,)\n" % (
        ", ".join(params), body, ", ".join(func_names))
    ns = {}
    filename = "<perft-generated>"
    dump = os.environ.get("PERFT_DUMP_DIR")
    if dump:  # write the generated code out so profilers can show its lines
        filename = os.path.join(dump, "perft_gen_%s.py" % func_names[0])
        with open(filename, "w") as fh:
            fh.write(factory)
    exec(compile(factory, filename, "exec"), ns)
    return ns["_factory"](*[env[p] for p in params])


# ---------------------------------------------------------------------------
# Transposition table: one dict per remaining depth, each with its own cap.
# Depth d gets cap/2^d of the budget (so the total is bounded by the budget);
# a full dict is simply cleared ("flush" replacement), which keeps the
# deeper - more valuable - tables intact.
# ---------------------------------------------------------------------------

BYTES_PER_ENTRY = 120          # measured CPython cost of one TT entry
DEFAULT_TT_MB = 2048           # total across all worker processes
MAXD = 64
TT = [dict() for _ in range(MAXD + 1)]
T1 = TT[1]
CAPS = [0] * (MAXD + 1)
STATS = [0, 0, 0]              # nodes, TT probes, TT hits (stats variant)


def set_tt_size(megabytes):
    entries = max(int(megabytes * 1_000_000 // BYTES_PER_ENTRY), 1024)
    for dd in range(MAXD + 1):
        CAPS[dd] = max(entries >> max(dd, 1), 256)
    global CAP1
    CAP1 = CAPS[1]
    _rebuild()


def clear_tt():
    for t in TT:
        t.clear()


CAP1 = 0
_HOT = {}
col_W = col_B = None

# Array TT: two regions of 16-byte slots (check word, count) - one for
# depth-1 entries, one for deeper ones so leaves never evict subtrees.  The
# check word is (key >> 64) ^ count (Hyatt's lockless hashing): a slot torn
# by a concurrent write from another process simply reads as a miss.
ZD_W = [_rand() for _ in range(MAXD + 1)]
ZD_B = [_rand() for _ in range(MAXD + 1)]
Z1_W, Z1_B = ZD_W[1], ZD_B[1]
TA1 = TA2 = None
IM1 = IM2 = 0


def _compile_hot(stats, kind):
    p = _prefix(stats, kind)
    names = [p + n + "_" + c for c in "WB" for n in ("gen", "gen2", "cnt")]
    _HOT.update(zip(names, _compile(_build_source(stats, kind), names, globals())))


def _rebuild():
    """(Re)compile the hot functions (CAP1 is baked in as a closure cell)."""
    global col_W, col_B
    for stats in (False, True):
        _compile_hot(stats, "dict")
    col_W, col_B = _compile(_build_collect_source(), ["col_W", "col_B"], globals())


def attach_array_tt(buf):
    """Use `buf` (bytearray / shared memory) as the array transposition table."""
    global TA1, TA2, IM1, IM2
    slots = len(buf) // 16
    n1 = 1 << max((slots * 3 // 4).bit_length() - 1, 4)
    n2 = 1 << max((slots - n1).bit_length() - 1, 4)
    if (n1 + n2) * 16 > len(buf):
        raise ValueError("array TT buffer too small")
    mv = memoryview(buf)
    TA1 = mv[:n1 * 16].cast("Q")
    TA2 = mv[n1 * 16:(n1 + n2) * 16].cast("Q")
    IM1, IM2 = (n1 - 1) << 1, (n2 - 1) << 1
    for stats in (False, True):
        _compile_hot(stats, "array")


def detach_array_tt():
    global TA1, TA2
    for k in [k for k in _HOT if k.startswith(("a", "sa"))]:
        del _HOT[k]
    for v in (TA1, TA2):
        if v is not None:
            v.release()
    TA1 = TA2 = None


set_tt_size(DEFAULT_TT_MB)


# ---------------------------------------------------------------------------
# Positions
# ---------------------------------------------------------------------------
# A position is (stm, args) with stm 0=white 1=black and
# args = (uP, uN, uD, uO, uK, uA, tP, tN, tD, tO, tK, tA, cr, ep, h)
# from the side to move's point of view.

def parse_fen(fen):
    parts = fen.split()
    if len(parts) < 4:
        raise ValueError("FEN needs at least 4 fields: %r" % fen)
    board, side, castling, ep = parts[:4]
    bb = {c: 0 for c in "PNBRQKpnbrqk"}
    rows = board.split("/")
    if len(rows) != 8:
        raise ValueError("bad FEN board: %r" % board)
    for i, row in enumerate(rows):
        r = 7 - i
        f = 0
        for ch in row:
            if ch.isdigit():
                f += int(ch)
            else:
                if ch not in bb or f > 7:
                    raise ValueError("bad FEN board: %r" % board)
                bb[ch] |= 1 << (r * 8 + f)
                f += 1
        if f != 8:
            raise ValueError("bad FEN row: %r" % row)
    if bb["K"].bit_count() != 1 or bb["k"].bit_count() != 1:
        raise ValueError("FEN must have exactly one king per side")
    cr = 0
    if castling != "-":
        for ch in castling:
            cr |= {"K": 1, "Q": 2, "k": 4, "q": 8}[ch]
    # Drop rights whose king/rook is not on its home square.
    if not (bb["K"] >> 4 & 1):
        cr &= ~3
    if not (bb["R"] >> 7 & 1):
        cr &= ~1
    if not (bb["R"] & 1):
        cr &= ~2
    if not (bb["k"] >> 60 & 1):
        cr &= ~12
    if not (bb["r"] >> 63 & 1):
        cr &= ~4
    if not (bb["r"] >> 56 & 1):
        cr &= ~8
    epb = 0
    if ep != "-":
        epb = 1 << ((int(ep[1]) - 1) * 8 + "abcdefgh".index(ep[0]))

    def side_boards(P, N, B, R, Q, K):
        return (P, N, B | Q, R | Q, K.bit_length() - 1, P | N | B | R | Q | K)

    w = side_boards(bb["P"], bb["N"], bb["B"], bb["R"], bb["Q"], bb["K"])
    b = side_boards(bb["p"], bb["n"], bb["b"], bb["r"], bb["q"], bb["k"])
    stm = 0 if side == "w" else 1
    us, them = (w, b) if stm == 0 else (b, w)
    if epb and not ep_captures(*us, *them, epb, stm == 0):
        epb = 0
    args = us + them + (cr, epb, 0)
    h = compute_hash(stm, args)
    return stm, args[:14] + (h,)


def compute_hash(stm, args):
    """Zobrist key from scratch (only used at the root and in tests)."""
    uP, uN, uD, uO, uK, uA, tP, tN, tD, tO, tK, tA, cr, ep = args[:14]
    h = 0
    for color, (P, N, D, O, K) in ((stm, (uP, uN, uD, uO, uK)), (1 - stm, (tP, tN, tD, tO, tK))):
        Z = ZW if color == 0 else ZB
        boards = (P, N, D & ~O, O & ~D, D & O, 1 << K)
        for pi, bbd in enumerate(boards):
            while bbd:
                b = bbd & -bbd
                bbd ^= b
                h ^= Z[pi][b.bit_length() - 1]
    h ^= ZCR[cr]
    if ep:
        h ^= ZEP[(ep.bit_length() - 1) & 7]
    return h


def to_fen(pos):
    stm, a = pos
    us, them = a[:6], a[6:12]
    w, b = (us, them) if stm == 0 else (them, us)
    grid = [None] * 64

    def put(side, letters):
        P, N, D, O, K, _ = side
        for bbd, ch in ((P, "P"), (N, "N"), (D & ~O, "B"), (O & ~D, "R"), (D & O, "Q"), (1 << K, "K")):
            while bbd:
                x = bbd & -bbd
                bbd ^= x
                grid[x.bit_length() - 1] = ch if letters == "upper" else ch.lower()
    put(w, "upper")
    put(b, "lower")
    rows = []
    for r in range(7, -1, -1):
        row, e = "", 0
        for f in range(8):
            ch = grid[r * 8 + f]
            if ch is None:
                e += 1
            else:
                if e:
                    row += str(e)
                    e = 0
                row += ch
        if e:
            row += str(e)
        rows.append(row)
    cr = a[12]
    cs = "".join(c for bit, c in ((1, "K"), (2, "Q"), (4, "k"), (8, "q")) if cr & bit) or "-"
    ep = a[13]
    eps = "-"
    if ep:
        s = ep.bit_length() - 1
        eps = "abcdefgh"[s & 7] + str((s >> 3) + 1)
    return "%s %s %s %s 0 1" % ("/".join(rows), "wb"[stm], cs, eps)


def move_uci(m):
    fs, ts, fl = m & 63, (m >> 6) & 63, m >> 12
    s = "abcdefgh"[fs & 7] + str((fs >> 3) + 1) + "abcdefgh"[ts & 7] + str((ts >> 3) + 1)
    if 1 <= fl <= 4:
        s += "nbrq"[fl - 1]
    return s


def children(pos):
    """[(move_code, child_position)] for every legal move."""
    stm, a = pos
    fn = col_W if stm == 0 else col_B
    return [(m, (1 - stm, ch)) for m, ch in fn(*a, 0)]


def legal_moves(pos):
    return [m for m, _ in children(pos)]


def perft(pos, depth, stats=False, kind="dict"):
    """Number of legal move sequences of exactly `depth` plies."""
    stm, a = pos
    if depth <= 0:
        return 1
    name = _prefix(stats, kind) + ("cnt", "gen2", "gen")[min(depth, 3) - 1] + "_" + "WB"[stm]
    return _HOT[name](*a, depth)


def expand(roots, plies):
    """Breadth-first expansion that merges identical positions.

    roots: {position: multiplicity}.  Returns the same for `plies` deeper."""
    cur = roots
    for _ in range(plies):
        nxt = {}
        get = nxt.get
        for pos, mult in cur.items():
            for _m, ch in children(pos):
                nxt[ch] = get(ch, 0) + mult
        cur = nxt
    return cur


# ---------------------------------------------------------------------------
# Parallel driver
# ---------------------------------------------------------------------------

def _peak_rss_bytes():
    try:
        import resource
    except ImportError:
        return 0
    r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return r if sys.platform == "darwin" else r * 1024


_SHM = None
_SHM_NAME = None


def _attach_shared(name):
    from multiprocessing import shared_memory
    try:
        return shared_memory.SharedMemory(name=name, track=False)  # 3.13+
    except TypeError:
        shm = shared_memory.SharedMemory(name=name)
        try:  # older Pythons: stop the tracker from unlinking it at exit
            from multiprocessing import resource_tracker
            resource_tracker.unregister(shm._name, "shared_memory")
        except Exception:
            pass
        return shm


def _worker_init():
    set_tt_size(16)  # workers use the (shared) array table, not the dicts


def _worker_use_table(name, private_bytes):
    """Attach this worker to the current transposition table."""
    global _SHM, _SHM_NAME
    if name is not None and name == _SHM_NAME:
        return
    detach_array_tt()
    if _SHM is not None:
        _SHM.close()
        _SHM = None
    _SHM_NAME = name
    if name is not None:
        _SHM = _attach_shared(name)
        attach_array_tt(_SHM.buf)
    else:  # no shared memory on this platform: a private table per worker
        if TA1 is None:
            attach_array_tt(bytearray(private_bytes))


def _worker_run(job):
    tasks, depth, stats, table, private_bytes = job
    _worker_use_table(table, private_bytes)
    if stats:
        STATS[0] = STATS[1] = STATS[2] = 0
    total = 0
    for pos, mult in tasks:
        total += mult * perft(pos, depth, stats, "array")
    return total, len(tasks), tuple(STATS) if stats else (0, 0, 0), (os.getpid(), _peak_rss_bytes())


class Engine:
    """Runs perft, single-process or on a pool of worker processes.

    Parallel runs expand the root breadth-first (merging transpositions)
    into a few hundred tasks per worker, which are handed out in chunks from a
    work queue.  All workers share one lock-free array transposition table
    in shared memory.  It is sized to the job (capped by tt_mb), because
    touching gigabytes of fresh shared memory costs real time in page faults
    in every worker."""

    def __init__(self, jobs=None, tt_mb=DEFAULT_TT_MB, stats=False, progress=True,
                 parallel_min_depth=6):
        self.jobs = max(1, jobs or os.cpu_count() or 1)
        self.tt_mb = tt_mb
        self.stats = stats
        self.progress = progress and sys.stderr.isatty()
        self.parallel_min_depth = parallel_min_depth
        self.pool = None
        self.shm = None
        self.shm_bytes = 0
        self.shm_ok = True
        self.nodes = self.probes = self.hits = 0
        self.worker_rss = {}
        self.last = {}  # (position, depth) -> count, used for sizing the table
        set_tt_size(tt_mb)

    def close(self):
        if self.pool is not None:
            self.pool.close()
            self.pool.join()
            self.pool = None
        self._free_shm()

    def _free_shm(self):
        if self.shm is not None:
            self.shm.close()
            try:
                self.shm.unlink()
            except FileNotFoundError:
                pass
            self.shm = None
            self.shm_bytes = 0

    def _get_pool(self):
        if self.pool is None:
            import multiprocessing as mp
            ctx = mp.get_context("spawn")  # what macOS uses anyway
            self.pool = ctx.Pool(self.jobs, initializer=_worker_init)
            # The parent only runs small depths now; free its big dicts.
            set_tt_size(min(self.tt_mb, 64))
            clear_tt()
        return self.pool

    def _table_for(self, est_leaf_parents):
        """Shared table big enough for ~est entries (power-of-two growth)."""
        cap = max(int(self.tt_mb * 1_000_000), 1 << 20)
        want = 1 << 24  # 16 MB minimum
        while want < est_leaf_parents * 16 and want * 2 <= cap:
            want *= 2
        want = min(want, cap) // 16 * 16
        if self.shm_ok and (self.shm is None or self.shm_bytes < want):
            try:
                from multiprocessing import shared_memory
                new = shared_memory.SharedMemory(create=True, size=want)
            except Exception as e:  # pragma: no cover - exotic platforms
                sys.stderr.write("shared memory unavailable (%s); using per-worker tables\n" % e)
                self.shm_ok = False
            else:
                self._free_shm()  # workers keep their mapping until they switch
                self.shm, self.shm_bytes = new, want
        if self.shm is None:
            return None, max(want // self.jobs // 16 * 16, 1 << 20)
        return self.shm.name, 0

    def _progress(self, done, total, t0):
        if self.progress:
            el = time.perf_counter() - t0
            eta = el / done * (total - done) if done else 0
            sys.stderr.write("\r  depth progress: %5.1f%%  (%d/%d)  %.0fs elapsed, ~%.0fs left   "
                             % (100.0 * done / total, done, total, el, eta))
            sys.stderr.flush()

    def _clear_progress(self):
        if self.progress:
            sys.stderr.write("\r" + " " * 78 + "\r")
            sys.stderr.flush()

    def _account(self, st):
        self.nodes += st[0]
        self.probes += st[1]
        self.hits += st[2]

    def run(self, pos, depth):
        n = self._run(pos, depth)
        self.last[(pos, depth)] = n
        return n

    def _run(self, pos, depth):
        if depth <= 0:
            return 1
        parallel = self.jobs > 1 and depth >= self.parallel_min_depth
        if not parallel and depth < 6:
            return self._single(pos, depth)
        # Split: expand breadth-first (merging transpositions) until there is
        # plenty of work to balance, keeping >= 3 plies for the workers.
        want = (self.jobs * 48) if parallel else 64
        frontier = {pos: 1}
        ply = 0
        paths = 1
        while ply < depth - 3 and len(frontier) < want:
            frontier = expand(frontier, 1)
            ply += 1
            paths = sum(frontier.values())
        tasks = list(frontier.items())
        if not tasks:
            return 0
        rem = depth - ply
        t0 = time.perf_counter()
        total = 0
        if not parallel:
            for i, (p, mult) in enumerate(tasks):
                total += mult * self._single(p, rem)
                if i % 4 == 0:
                    self._progress(i + 1, len(tasks), t0)
            self._clear_progress()
            return total
        # Positions one ply above the leaves ~ perft(depth - 1): take it from
        # the previous run if we have it, else extrapolate the branching.
        est = self.last.get((pos, depth - 1))
        if est is None:
            b = max(paths, 2) ** (1.0 / max(ply, 1))
            est = b ** (depth - 1)
        table, private_bytes = self._table_for(est * 0.25)
        pool = self._get_pool()
        nchunks = self.jobs * 8
        size = max(1, -(-len(tasks) // nchunks))
        jobs = [(tasks[i:i + size], rem, self.stats, table, private_bytes)
                for i in range(0, len(tasks), size)]
        done = 0
        for sub, n, st, (pid, rss) in pool.imap_unordered(_worker_run, jobs):
            total += sub
            done += n
            self._account(st)
            self.worker_rss[pid] = max(self.worker_rss.get(pid, 0), rss)
            self._progress(done, len(tasks), t0)
        self._clear_progress()
        return total

    def _single(self, pos, depth):
        if self.stats:
            STATS[0] = STATS[1] = STATS[2] = 0
            r = perft(pos, depth, True)
            self._account(STATS)
            return r
        return perft(pos, depth)


# ---------------------------------------------------------------------------
# Self test and benchmark
# ---------------------------------------------------------------------------

KNOWN = [
    ("start", START_FEN, [20, 400, 8902, 197281, 4865609, 119060324, 3195901860, 84998978956]),
    ("kiwipete", KIWIPETE_FEN, [48, 2039, 97862, 4085603, 193690690]),
    ("position 3", POS3_FEN, [14, 191, 2812, 43238, 674624, 11030083]),
    ("position 4", POS4_FEN, [6, 264, 9467, 422333, 15833292]),
    ("position 5", POS5_FEN, [44, 1486, 62379, 2103487, 89941194]),
    ("position 6", POS6_FEN, [46, 2079, 89890, 3894594, 164075551]),
]

SELFTEST_DEPTH = {"start": 5, "kiwipete": 4, "position 3": 5, "position 4": 4,
                  "position 5": 4, "position 6": 3}


def selftest(out=sys.stdout):
    ok = True
    t0 = time.perf_counter()
    for name, fen, counts in KNOWN:
        pos = parse_fen(fen)
        for d in range(1, SELFTEST_DEPTH[name] + 1):
            clear_tt()
            got = perft(pos, d)
            exp = counts[d - 1]
            status = "ok" if got == exp else "FAIL"
            ok &= got == exp
            out.write("  %-11s depth %d: %15s  expected %15s  %s\n"
                      % (name, d, format(got, ","), format(exp, ","), status))
    out.write("selftest %s in %.2fs\n" % ("PASSED" if ok else "FAILED", time.perf_counter() - t0))
    return ok


def bench(engine, out=sys.stdout):
    rows = [("start", START_FEN, d) for d in range(1, 7)] + \
           [("kiwipete", KIWIPETE_FEN, d) for d in range(1, 5)]
    out.write("%-9s %5s %15s %9s %14s\n" % ("position", "depth", "count", "time (s)", "leaves/s"))
    t_all = time.perf_counter()
    for name, fen, d in rows:
        pos = parse_fen(fen)
        clear_tt()
        t0 = time.perf_counter()
        n = engine.run(pos, d)
        el = time.perf_counter() - t0
        out.write("%-9s %5d %15s %9.3f %14s\n" % (name, d, format(n, ","), el,
                                                  format(int(n / el), ",") if el > 0 else "-"))
        out.flush()
    out.write("total %.2fs\n" % (time.perf_counter() - t_all))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _fmt_bytes(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return "%.1f %s" % (n, unit)
        n /= 1024.0


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Exact chess perft (number of legal move sequences).")
    ap.add_argument("N", nargs="?", type=int, help="depth in plies")
    ap.add_argument("--fen", default=START_FEN, help="start position (default: initial position)")
    ap.add_argument("--divide", action="store_true", help="print the count under each first move at depth N")
    ap.add_argument("--stats", action="store_true", help="nodes visited, nodes/s, TT hit rate, peak memory")
    ap.add_argument("--jobs", type=int, default=os.cpu_count() or 1, help="worker processes (default: all cores)")
    ap.add_argument("--tt-size", type=float, default=DEFAULT_TT_MB,
                    help="transposition table budget in MB, total over all processes (default %d)" % DEFAULT_TT_MB)
    ap.add_argument("--backend", choices=["python", "numba"], default="python",
                    help="move generator backend (numba is optional; falls back to python)")
    ap.add_argument("--selftest", action="store_true", help="run known-answer tests")
    ap.add_argument("--bench", action="store_true", help="benchmark: start 1-6 and Kiwipete 1-4")
    ap.add_argument("--no-progress", action="store_true", help="no progress indicator")
    args = ap.parse_args(argv)

    if args.backend == "numba":
        try:
            import perft_numba
        except ImportError as e:
            sys.stderr.write("numba backend unavailable (%s); using pure Python\n" % e)
        else:
            return perft_numba.main(args)

    if args.selftest:
        return 0 if selftest() else 1

    engine = Engine(jobs=args.jobs, tt_mb=args.tt_size, stats=args.stats,
                    progress=not args.no_progress)
    try:
        if args.bench:
            bench(engine)
            return 0
        if args.N is None:
            ap.error("N is required (or use --selftest / --bench)")
        try:
            pos = parse_fen(args.fen)
        except (ValueError, KeyError, IndexError) as e:
            ap.error("invalid FEN: %s" % e)
        if args.divide:
            return _divide(engine, pos, args.N)
        return _table(engine, pos, args.N, args.stats)
    finally:
        engine.close()


def _divide(engine, pos, depth):
    if depth < 1:
        print("depth must be >= 1")
        return 1
    t0 = time.perf_counter()
    total = 0
    rows = sorted(children(pos), key=lambda mc: move_uci(mc[0]))
    for m, ch in rows:
        n = engine.run(ch, depth - 1)
        total += n
        print("%-6s %s" % (move_uci(m), format(n, ",")), flush=True)
    print("\nMoves: %d" % len(rows))
    print("Total: %s" % format(total, ","))
    print("Time:  %.2fs" % (time.perf_counter() - t0))
    return 0


def _table(engine, pos, n_max, stats):
    print("N (moves) |         Sequences | Time (s)")
    print("----------+-------------------+---------")
    sys.stdout.flush()
    t_start = time.perf_counter()
    grand = 0
    for d in range(1, n_max + 1):
        t0 = time.perf_counter()
        n = engine.run(pos, d)
        el = time.perf_counter() - t0
        grand += n
        print("%9d | %17s | %8.2f" % (d, format(n, ","), el), flush=True)
    total_t = time.perf_counter() - t_start
    print("\nTotal elapsed: %.2fs" % total_t)
    if stats:
        rate = engine.hits / engine.probes if engine.probes else 0.0
        print("Nodes visited:       %s" % format(engine.nodes, ","))
        print("Nodes/second:        %s" % format(int(engine.nodes / total_t) if total_t else 0, ","))
        print("Leaf sequences/sec:  %s" % format(int(grand / total_t) if total_t else 0, ","))
        print("TT probes / hits:    %s / %s  (hit rate %.1f%%)" % (
            format(engine.probes, ","), format(engine.hits, ","), 100 * rate))
        print("Peak memory (main):  %s" % _fmt_bytes(_peak_rss_bytes()))
        if engine.worker_rss:
            print("Peak memory (workers, sum of %d): %s" % (
                len(engine.worker_rss), _fmt_bytes(sum(engine.worker_rss.values()))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
