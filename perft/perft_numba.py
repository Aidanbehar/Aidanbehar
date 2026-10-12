"""perft_numba.py - optional Numba backend for perft.py (--backend numba).

Same algorithm as the pure-Python engine (strictly legal generation with
check/pin masks, en passant verified by make-and-test, bulk counting at the
leaves, Zobrist-keyed transposition table), but compiled with Numba:

* native uint64 bitboards, magic-bitboard slider lookups (the magics are
  found at start-up by a compiled search with a fixed seed),
* copy-make on a per-ply state stack (no allocation in the search),
* a lock-free transposition table in numpy arrays shared by all threads:
  each slot holds (key1 ^ count, key2 ^ count, count), so a slot torn by a
  concurrent write reads as a miss (two independent 64-bit Zobrist keys,
  ~128 bits of key in total),
* parallelism with numba.prange over the root tasks (no GIL).

The root is split exactly as in perft.py (breadth-first expansion that merges
identical positions) using the pure-Python move generator, so the frontier
positions are produced by independent code.

Compiled code is cached on disk (cache=True), so only the first run pays the
compile time (~10-20 s).
"""

import os
import sys
import time

import numpy as np
import numba
from numba import njit, prange

import perft as P

U = np.uint64
U0 = U(0)
U1 = U(1)
FULL = U(0xFFFFFFFFFFFFFFFF)
NOT_A = U(0xFEFEFEFEFEFEFEFE)
NOT_H = U(0x7F7F7F7F7F7F7F7F)
RANK1 = U(0xFF)
RANK2 = U(0xFF << 8)
RANK3 = U(0xFF << 16)
RANK4 = U(0xFF << 24)
RANK5 = U(0xFF << 32)
RANK6 = U(0xFF << 40)
RANK7 = U(0xFF << 48)
RANK8 = U(0xFF << 56)
M1 = U(0x5555555555555555)
M2 = U(0x3333333333333333)
M4 = U(0x0F0F0F0F0F0F0F0F)
H01 = U(0x0101010101010101)
DEBRUIJN = U(0x03F79D71B4CB0A89)
_db = np.zeros(64, dtype=np.int64)
for _i in range(64):
    _db[((1 << _i) * 0x03F79D71B4CB0A89 & 0xFFFFFFFFFFFFFFFF) >> 58] = _i
DB_INDEX = _db

# State row layout (uint64): 12 piece boards (white P N B R Q K, black ...),
# side, castling rights, en passant square (64 = none), two Zobrist keys.
SIDE, CR, EP, H1, H2 = 12, 13, 14, 15, 16
NSTATE = 17
MAXPLY = 64
MAXMOVES = 256

# Offsets into the single table array T.
OFF_KN = 0
OFF_KG = 64
OFF_PW = 128
OFF_PB = 192
OFF_RMASK = 256
OFF_RMAG = 320
OFF_RSH = 384
OFF_ROFF = 448
OFF_BMASK = 512
OFF_BMAG = 576
OFF_BSH = 640
OFF_BOFF = 704
OFF_BTW = 768
OFF_LINE = OFF_BTW + 4096
OFF_Z1 = OFF_LINE + 4096          # [color*6+piece]*64 + sq
OFF_Z2 = OFF_Z1 + 768
OFF_ZC1 = OFF_Z2 + 768            # 16 castling states
OFF_ZC2 = OFF_ZC1 + 16
OFF_ZE1 = OFF_ZC2 + 16            # 8 ep files
OFF_ZE2 = OFF_ZE1 + 8
OFF_ZS1 = OFF_ZE2 + 8             # side to move
OFF_ZS2 = OFF_ZS1 + 1
OFF_ZD1 = OFF_ZS2 + 1             # 64 depth keys
OFF_ZD2 = OFF_ZD1 + 64
OFF_CRM = OFF_ZD2 + 64
OFF_SLIDE = OFF_CRM + 64          # rook tables, then bishop tables


# --------------------------------------------------------------------- basics

@njit(cache=True, inline="always")
def popcnt(x):
    x = x - ((x >> U1) & M1)
    x = (x & M2) + ((x >> U(2)) & M2)
    x = (x + (x >> U(4))) & M4
    return np.int64((x * H01) >> U(56))


@njit(cache=True, inline="always")
def lsb(x):
    return DB_INDEX[np.int64(((x & (~x + U1)) * DEBRUIJN) >> U(58))]


@njit(cache=True, inline="always")
def bit(s):
    return U1 << U(s)


@njit(cache=True, inline="always")
def rook_att(T, s, occ):
    idx = ((occ & T[OFF_RMASK + s]) * T[OFF_RMAG + s]) >> T[OFF_RSH + s]
    return T[OFF_SLIDE + np.int64(T[OFF_ROFF + s]) + np.int64(idx)]


@njit(cache=True, inline="always")
def bishop_att(T, s, occ):
    idx = ((occ & T[OFF_BMASK + s]) * T[OFF_BMAG + s]) >> T[OFF_BSH + s]
    return T[OFF_SLIDE + np.int64(T[OFF_BOFF + s]) + np.int64(idx)]


# --------------------------------------------------------------- magic search

@njit(cache=True)
def _xorshift(state):
    x = state[0]
    x ^= x >> U(12)
    x ^= x << U(25)
    x ^= x >> U(27)
    state[0] = x
    return x * U(2685821657736338717)


@njit(cache=True)
def _find_magic(mask, occs, atts, nbits, rng, used, out):
    n = occs.shape[0]
    shift = U(64 - nbits)
    size = 1 << nbits
    for _ in range(100000000):
        m = _xorshift(rng) & _xorshift(rng) & _xorshift(rng)
        if popcnt((mask * m) & U(0xFF00000000000000)) < 6:
            continue
        for i in range(size):
            used[i] = U0
        ok = True
        for i in range(n):
            idx = np.int64((occs[i] * m) >> shift)
            if used[idx] == U0:
                used[idx] = atts[i]
            elif used[idx] != atts[i]:
                ok = False
                break
        if ok:
            for i in range(size):
                out[i] = used[i]
            return m
    return U0


def _subsets(mask):
    out = []
    sub = 0
    while True:
        out.append(sub)
        sub = (sub - mask) & mask
        if sub == 0:
            return out


def build_tables(seed=0x5EEDC0DE):
    rng = np.array([U(seed)], dtype=np.uint64)
    heads = np.zeros(OFF_SLIDE, dtype=np.uint64)
    slide = []
    offset = 0
    for kind, masks, tables, o_mask, o_mag, o_sh, o_off in (
            ("rook", P.RM, P.RT, OFF_RMASK, OFF_RMAG, OFF_RSH, OFF_ROFF),
            ("bishop", P.BM, P.BT, OFF_BMASK, OFF_BMAG, OFF_BSH, OFF_BOFF)):
        for s in range(64):
            mask = masks[s]
            nbits = bin(mask).count("1")
            subs = _subsets(mask)
            occs = np.array(subs, dtype=np.uint64)
            atts = np.array([tables[s][o] for o in subs], dtype=np.uint64)
            used = np.zeros(1 << nbits, dtype=np.uint64)
            out = np.zeros(1 << nbits, dtype=np.uint64)
            mag = _find_magic(U(mask), occs, atts, nbits, rng, used, out)
            if mag == 0:
                raise RuntimeError("magic search failed")
            heads[o_mask + s] = mask
            heads[o_mag + s] = mag
            heads[o_sh + s] = 64 - nbits
            heads[o_off + s] = offset
            slide.append(out)
            offset += 1 << nbits
    for s in range(64):
        heads[OFF_KN + s] = P.NA[s]
        heads[OFF_KG + s] = P.KA[s]
        heads[OFF_PW + s] = P.PAW[s]
        heads[OFF_PB + s] = P.PAB[s]
        heads[OFF_CRM + s] = P.CRM[s]
        for t in range(64):
            heads[OFF_BTW + s * 64 + t] = P.BTW[s][t]
            heads[OFF_LINE + s * 64 + t] = P.LN[s][t]
    r = np.random.RandomState(20240611)

    def rand(n):
        return r.randint(0, 2 ** 63, size=n, dtype=np.int64).astype(np.uint64) * U(2) + \
            r.randint(0, 2, size=n, dtype=np.int64).astype(np.uint64)
    heads[OFF_Z1:OFF_Z1 + 768] = rand(768)
    heads[OFF_Z2:OFF_Z2 + 768] = rand(768)
    heads[OFF_ZC1:OFF_ZC1 + 16] = rand(16)
    heads[OFF_ZC2:OFF_ZC2 + 16] = rand(16)
    heads[OFF_ZC1] = 0
    heads[OFF_ZC2] = 0
    heads[OFF_ZE1:OFF_ZE1 + 8] = rand(8)
    heads[OFF_ZE2:OFF_ZE2 + 8] = rand(8)
    heads[OFF_ZS1:OFF_ZS1 + 2] = rand(2)
    heads[OFF_ZD1:OFF_ZD1 + 128] = rand(128)
    return np.concatenate([heads] + slide)


# ------------------------------------------------------------- attacks, hash

@njit(cache=True, inline="always")
def attacked(T, st, s, occ, them):
    """Is square s attacked by side `them` given occupancy occ?"""
    b = them * 6
    if T[OFF_KN + s] & st[b + 1]:
        return True
    pa = OFF_PW if them == 1 else OFF_PB  # their pawns attack s from our pawn-attack squares
    if T[pa + s] & st[b]:
        return True
    if T[OFF_KG + s] & st[b + 5]:
        return True
    if rook_att(T, s, occ) & (st[b + 3] | st[b + 4]):
        return True
    if bishop_att(T, s, occ) & (st[b + 2] | st[b + 4]):
        return True
    return False


@njit(cache=True)
def full_hash(T, st):
    h1 = U0
    h2 = U0
    for p in range(12):
        x = st[p]
        while x:
            s = lsb(x)
            x &= x - U1
            h1 ^= T[OFF_Z1 + p * 64 + s]
            h2 ^= T[OFF_Z2 + p * 64 + s]
    cr = np.int64(st[CR])
    h1 ^= T[OFF_ZC1 + cr]
    h2 ^= T[OFF_ZC2 + cr]
    if st[EP] != U(64):
        f = np.int64(st[EP]) & 7
        h1 ^= T[OFF_ZE1 + f]
        h2 ^= T[OFF_ZE2 + f]
    if st[SIDE]:
        h1 ^= T[OFF_ZS1]
        h2 ^= T[OFF_ZS2]
    return h1, h2


# -------------------------------------------------------------- en passant

@njit(cache=True)
def ep_legal(T, st, fr, to):
    """Make-and-test for an en passant capture fr->to by the side to move."""
    us = np.int64(st[SIDE])
    them = 1 - us
    capsq = to - 8 if us == 0 else to + 8
    occ = U0
    for p in range(12):
        occ |= st[p]
    occ = occ ^ bit(fr) ^ bit(to) ^ bit(capsq)
    k = lsb(st[us * 6 + 5])
    b = them * 6
    if T[OFF_KN + k] & st[b + 1]:
        return False
    pa = OFF_PW if us == 0 else OFF_PB
    if T[pa + k] & (st[b] & ~bit(capsq)):
        return False
    if rook_att(T, k, occ) & (st[b + 3] | st[b + 4]):
        return False
    if bishop_att(T, k, occ) & (st[b + 2] | st[b + 4]):
        return False
    return True


# --------------------------------------------------------- move generation

@njit(cache=True, inline="always")
def _emit(mv, n, fr, targets, flag):
    while targets:
        t = lsb(targets)
        targets &= targets - U1
        mv[n] = fr | (t << 6) | (flag << 12)
        n += 1
    return n


@njit(cache=True)
def gen(T, st, mv, count_only):
    """Legal moves of st.  count_only: just return their number (bulk count
    with popcounts); otherwise write move codes into mv and return n."""
    us = np.int64(st[SIDE])
    them = 1 - us
    ub = us * 6
    tb_ = them * 6
    uP = st[ub]
    uN = st[ub + 1]
    uD = st[ub + 2] | st[ub + 4]
    uO = st[ub + 3] | st[ub + 4]
    uKb = st[ub + 5]
    tP = st[tb_]
    tN = st[tb_ + 1]
    tD = st[tb_ + 2] | st[tb_ + 4]
    tO = st[tb_ + 3] | st[tb_ + 4]
    tK = st[tb_ + 5]
    uA = uP | uN | uD | uO | uKb
    tA = tP | tN | tD | tO | tK
    occ = uA | tA
    empty = ~occ
    k = lsb(uKb)
    pa_us = OFF_PW if us == 0 else OFF_PB
    chk = (T[OFF_KN + k] & tN) | (T[pa_us + k] & tP) | \
        (rook_att(T, k, occ) & tO) | (bishop_att(T, k, occ) & tD)
    # pins: their sliders seeing the king through exactly one of our pieces
    pinned = U0
    sn = (rook_att(T, k, tA) & tO) | (bishop_att(T, k, tA) & tD)
    while sn:
        s = lsb(sn)
        sn &= sn - U1
        b = T[OFF_BTW + k * 64 + s] & occ
        if b and (b & (b - U1)) == U0 and (b & uA):
            pinned |= b
    n = 0
    # king
    kt = T[OFF_KG + k] & ~uA
    occ2 = occ ^ uKb
    while kt:
        t = lsb(kt)
        kt &= kt - U1
        if not attacked(T, st, t, occ2, them):
            if not count_only:
                mv[n] = k | (t << 6)
            n += 1
    # en passant (make-and-test; valid in any check state)
    ep = np.int64(st[EP])
    if ep != 64:
        pa_them = OFF_PB if us == 0 else OFF_PW
        c = T[pa_them + ep] & uP
        while c:
            f = lsb(c)
            c &= c - U1
            if ep_legal(T, st, f, ep):
                if not count_only:
                    mv[n] = f | (ep << 6) | (8 << 12)
                n += 1
    if chk & (chk - U1):
        return n  # double check: king moves only
    if chk:
        tg = T[OFF_BTW + k * 64 + lsb(chk)] | chk
    else:
        tg = ~uA
        # castling (rights imply king and rook at home)
        cr = np.int64(st[CR])
        if us == 0:
            if (cr & 1) and not (occ & U(0x60)) and not attacked(T, st, 5, occ, 1) \
                    and not attacked(T, st, 6, occ, 1):
                if not count_only:
                    mv[n] = 4 | (6 << 6) | (16 << 12)
                n += 1
            if (cr & 2) and not (occ & U(0x0E)) and not attacked(T, st, 3, occ, 1) \
                    and not attacked(T, st, 2, occ, 1):
                if not count_only:
                    mv[n] = 4 | (2 << 6) | (16 << 12)
                n += 1
        else:
            if (cr & 4) and not (occ & U(0x6000000000000000)) and not attacked(T, st, 61, occ, 0) \
                    and not attacked(T, st, 62, occ, 0):
                if not count_only:
                    mv[n] = 60 | (62 << 6) | (16 << 12)
                n += 1
            if (cr & 8) and not (occ & U(0x0E00000000000000)) and not attacked(T, st, 59, occ, 0) \
                    and not attacked(T, st, 58, occ, 0):
                if not count_only:
                    mv[n] = 60 | (58 << 6) | (16 << 12)
                n += 1
    # knights (pinned knights cannot move)
    x = uN & ~pinned
    while x:
        s = lsb(x)
        x &= x - U1
        a = T[OFF_KN + s] & tg
        if count_only:
            n += popcnt(a)
        else:
            n = _emit(mv, n, s, a, 0)
    # sliders
    x = uD
    while x:
        s = lsb(x)
        x &= x - U1
        a = bishop_att(T, s, occ) & tg
        if pinned & bit(s):
            a &= T[OFF_LINE + k * 64 + s]
        if count_only:
            n += popcnt(a)
        else:
            n = _emit(mv, n, s, a, 0)
    x = uO
    while x:
        s = lsb(x)
        x &= x - U1
        a = rook_att(T, s, occ) & tg
        if pinned & bit(s):
            a &= T[OFF_LINE + k * 64 + s]
        if count_only:
            n += popcnt(a)
        else:
            n = _emit(mv, n, s, a, 0)
    # pawns: unpinned ones as a set, then each pinned one on its pin line
    rest = uP & pinned
    pp = uP & ~pinned
    pm = tg
    while True:
        if us == 0:
            s1 = (pp << U(8)) & empty
            s2 = ((s1 & RANK3) << U(8)) & empty & pm
            cl = ((pp & NOT_A) << U(7)) & tA & pm
            cx = ((pp & NOT_H) << U(9)) & tA & pm
            prom = RANK8
            d1, dl, dr = 8, 7, 9
        else:
            s1 = (pp >> U(8)) & empty
            s2 = ((s1 & RANK6) >> U(8)) & empty & pm
            cl = ((pp & NOT_A) >> U(9)) & tA & pm
            cx = ((pp & NOT_H) >> U(7)) & tA & pm
            prom = RANK1
            d1, dl, dr = -8, -9, -7
        s1 &= pm
        if count_only:
            n += popcnt(s1) + popcnt(s2) + popcnt(cl) + popcnt(cx) + \
                3 * (popcnt(s1 & prom) + popcnt(cl & prom) + popcnt(cx & prom))
        else:
            for targets, delta in ((s1, d1), (cl, dl), (cx, dr)):
                y = targets
                while y:
                    t = lsb(y)
                    y &= y - U1
                    f = t - delta
                    if bit(t) & prom:
                        for pr in range(4, 0, -1):
                            mv[n] = f | (t << 6) | (pr << 12)
                            n += 1
                    else:
                        mv[n] = f | (t << 6)
                        n += 1
            y = s2
            while y:
                t = lsb(y)
                y &= y - U1
                mv[n] = (t - 2 * d1) | (t << 6)
                n += 1
        if not rest:
            break
        s = lsb(rest)
        pp = bit(s)
        rest &= rest - U1
        pm = tg & T[OFF_LINE + k * 64 + s]
    return n


# ---------------------------------------------------------------- make move

@njit(cache=True)
def make(T, S, ply, m):
    src = S[ply]
    dst = S[ply + 1]
    for i in range(NSTATE):
        dst[i] = src[i]
    fr = m & 63
    to = (m >> 6) & 63
    fl = m >> 12
    us = np.int64(src[SIDE])
    them = 1 - us
    fb = bit(fr)
    tbit = bit(to)
    h1 = src[H1] ^ T[OFF_ZS1]
    h2 = src[H2] ^ T[OFF_ZS2]
    if src[EP] != U(64):
        f = np.int64(src[EP]) & 7
        h1 ^= T[OFF_ZE1 + f]
        h2 ^= T[OFF_ZE2 + f]
    dst[EP] = U(64)
    piece = 0
    for p in range(6):
        if src[us * 6 + p] & fb:
            piece = p
            break
    # capture
    if fl == 8:
        capsq = to - 8 if us == 0 else to + 8
        i = them * 6
        dst[i] ^= bit(capsq)
        h1 ^= T[OFF_Z1 + i * 64 + capsq]
        h2 ^= T[OFF_Z2 + i * 64 + capsq]
    else:
        for p in range(5):
            i = them * 6 + p
            if src[i] & tbit:
                dst[i] ^= tbit
                h1 ^= T[OFF_Z1 + i * 64 + to]
                h2 ^= T[OFF_Z2 + i * 64 + to]
                break
    # move (and promote)
    i = us * 6 + piece
    dst[i] ^= fb
    h1 ^= T[OFF_Z1 + i * 64 + fr]
    h2 ^= T[OFF_Z2 + i * 64 + fr]
    if 1 <= fl <= 4:
        i = us * 6 + fl
    dst[i] |= tbit
    h1 ^= T[OFF_Z1 + i * 64 + to]
    h2 ^= T[OFF_Z2 + i * 64 + to]
    if fl == 16:  # castling: move the rook too
        if to > fr:
            rf, rt = fr + 3, fr + 1
        else:
            rf, rt = fr - 4, fr - 1
        i = us * 6 + 3
        dst[i] ^= bit(rf) | bit(rt)
        h1 ^= T[OFF_Z1 + i * 64 + rf] ^ T[OFF_Z1 + i * 64 + rt]
        h2 ^= T[OFF_Z2 + i * 64 + rf] ^ T[OFF_Z2 + i * 64 + rt]
    cr = np.int64(src[CR])
    ncr = cr & np.int64(T[OFF_CRM + fr]) & np.int64(T[OFF_CRM + to])
    if ncr != cr:
        h1 ^= T[OFF_ZC1 + cr] ^ T[OFF_ZC1 + ncr]
        h2 ^= T[OFF_ZC2 + cr] ^ T[OFF_ZC2 + ncr]
        dst[CR] = U(ncr)
    dst[SIDE] = U(them)
    # double push: record ep only if a capture is actually legal
    if piece == 0 and (to - fr == 16 or fr - to == 16):
        e = (fr + to) // 2
        pa = OFF_PW if us == 0 else OFF_PB
        c = T[pa + e] & dst[them * 6]
        legal = False
        while c:
            f = lsb(c)
            c &= c - U1
            if ep_legal(T, dst, f, e):
                legal = True
                break
        if legal:
            dst[EP] = U(e)
            h1 ^= T[OFF_ZE1 + (e & 7)]
            h2 ^= T[OFF_ZE2 + (e & 7)]
    dst[H1] = h1
    dst[H2] = h2


# --------------------------------------------------------------------- perft

@njit(cache=True, inline="always")
def _tt_store(TK1, TK2, TV, i, k1, k2, total):
    w = U(total)
    TV[i] = w
    TK1[i] = k1 ^ w
    TK2[i] = k2 ^ w


@njit(cache=True)
def perft_iter(T, S, MV, depth, TK1, TK2, TV, mask, stats, NM, IX, TOT, SL, KK):
    """Depth-first perft with an explicit stack (Numba cannot cache
    recursive functions reliably).  stats = [nodes, tt probes, tt hits]."""
    if depth == 1:
        stats[0] += 1
        return gen(T, S[0], MV[0], True)
    ply = 0
    descend = True
    while True:
        if descend:
            d = depth - ply
            stats[0] += 1
            stats[1] += 1
            k1 = S[ply, H1] ^ T[OFF_ZD1 + d]
            k2 = S[ply, H2] ^ T[OFF_ZD2 + d]
            i = np.int64(k1 & mask)
            v = TV[i]
            if (TK1[i] ^ v) == k1 and (TK2[i] ^ v) == k2:
                stats[2] += 1
                val = np.int64(v)
                if ply == 0:
                    return val
                ply -= 1
                TOT[ply] += val
                descend = False
                continue
            n = gen(T, S[ply], MV[ply], False)
            if d == 2:  # children are leaves: bulk count each
                tot = np.int64(0)
                for j in range(n):
                    make(T, S, ply, MV[ply, j])
                    stats[0] += 1
                    tot += gen(T, S[ply + 1], MV[ply + 1], True)
                _tt_store(TK1, TK2, TV, i, k1, k2, tot)
                if ply == 0:
                    return tot
                ply -= 1
                TOT[ply] += tot
                descend = False
                continue
            NM[ply] = n
            IX[ply] = 0
            TOT[ply] = 0
            SL[ply] = i
            KK[ply, 0] = k1
            KK[ply, 1] = k2
            descend = False
        if IX[ply] < NM[ply]:
            make(T, S, ply, MV[ply, IX[ply]])
            IX[ply] += 1
            ply += 1
            descend = True
        else:
            tot = TOT[ply]
            _tt_store(TK1, TK2, TV, SL[ply], KK[ply, 0], KK[ply, 1], tot)
            if ply == 0:
                return tot
            ply -= 1
            TOT[ply] += tot


@njit(cache=True, parallel=True)
def perft_tasks(T, roots, mults, depth, TK1, TK2, TV, mask, stats_out):
    ntask = roots.shape[0]
    results = np.zeros(ntask, dtype=np.int64)
    for t in prange(ntask):
        S = np.zeros((MAXPLY + 1, NSTATE), dtype=np.uint64)
        MV = np.zeros((MAXPLY + 1, MAXMOVES), dtype=np.int64)
        st = np.zeros(3, dtype=np.int64)
        NM = np.zeros(MAXPLY + 1, dtype=np.int64)
        IX = np.zeros(MAXPLY + 1, dtype=np.int64)
        TOT = np.zeros(MAXPLY + 1, dtype=np.int64)
        SL = np.zeros(MAXPLY + 1, dtype=np.int64)
        KK = np.zeros((MAXPLY + 1, 2), dtype=np.uint64)
        for i in range(NSTATE):
            S[0, i] = roots[t, i]
        if depth == 0:
            r = np.int64(1)
        else:
            r = perft_iter(T, S, MV, depth, TK1, TK2, TV, mask, st, NM, IX, TOT, SL, KK)
        results[t] = r * mults[t]
        for i in range(3):
            stats_out[t, i] = st[i]
    return results


@njit(cache=True)
def legal_moves(T, root):
    S = np.zeros((2, NSTATE), dtype=np.uint64)
    for i in range(NSTATE):
        S[0, i] = root[i]
    mv = np.zeros(MAXMOVES, dtype=np.int64)
    n = gen(T, S[0], mv, False)
    return mv[:n].copy()


@njit(cache=True)
def child(T, root, m):
    S = np.zeros((2, NSTATE), dtype=np.uint64)
    for i in range(NSTATE):
        S[0, i] = root[i]
    make(T, S, 0, m)
    return S[1].copy()


@njit(cache=True)
def hash_of(T, st):
    return full_hash(T, st)


# ----------------------------------------------------------------- Python API

_T = None


def tables():
    global _T
    if _T is None:
        _T = build_tables()
    return _T


def to_state(pos):
    """perft.py position -> numba state row."""
    stm, a = pos
    us, them = a[:6], a[6:12]
    w, b = (us, them) if stm == 0 else (them, us)
    st = np.zeros(NSTATE, dtype=np.uint64)
    for c, (Pb, Nb, Db, Ob, Ksq, _A) in enumerate((w, b)):
        for i, bb in enumerate((Pb, Nb, Db & ~Ob, Ob & ~Db, Db & Ob, 1 << Ksq)):
            st[c * 6 + i] = U(bb)
    st[SIDE] = U(stm)
    st[CR] = U(a[12])
    st[EP] = U(a[13].bit_length() - 1 if a[13] else 64)
    h1, h2 = hash_of(tables(), st)
    st[H1] = h1
    st[H2] = h2
    return st


class NumbaEngine:
    """Drop-in replacement for perft.Engine using the compiled backend."""

    def __init__(self, jobs=None, tt_mb=P.DEFAULT_TT_MB, stats=False, progress=True):
        self.jobs = max(1, min(jobs or os.cpu_count() or 1, numba.config.NUMBA_NUM_THREADS))
        numba.set_num_threads(self.jobs)
        self.stats = stats
        self.progress = progress
        self.nodes = self.probes = self.hits = 0
        self.worker_rss = {}
        self.T = tables()
        slots = 1 << max(int(tt_mb * 1_000_000 // 24).bit_length() - 1, 10)
        self.mask = U(slots - 1)
        self.TK1 = np.zeros(slots, dtype=np.uint64)
        self.TK2 = np.zeros(slots, dtype=np.uint64)
        self.TV = np.zeros(slots, dtype=np.uint64)

    def close(self):
        pass

    def clear(self):
        self.TK1[:] = 0
        self.TK2[:] = 0
        self.TV[:] = 0

    def run(self, pos, depth):
        if depth <= 0:
            return 1
        # Same split as perft.Engine: breadth-first, merging transpositions.
        frontier = {pos: 1}
        ply = 0
        want = self.jobs * 16 if self.jobs > 1 else 1
        while ply < depth - 2 and len(frontier) < want:
            frontier = P.expand(frontier, 1)
            ply += 1
        if not frontier:
            return 0
        items = list(frontier.items())
        roots = np.stack([to_state(p) for p, _ in items])
        mults = np.array([m for _, m in items], dtype=np.int64)
        st = np.zeros((len(items), 3), dtype=np.int64)
        res = perft_tasks(self.T, roots, mults, depth - ply, self.TK1, self.TK2, self.TV,
                          self.mask, st)
        tot = st.sum(axis=0)
        self.nodes += int(tot[0])
        self.probes += int(tot[1])
        self.hits += int(tot[2])
        return int(res.sum())


def selftest(out=sys.stdout):
    eng = NumbaEngine(progress=False, tt_mb=256)
    ok = True
    t0 = time.perf_counter()
    for name, fen, counts in P.KNOWN:
        pos = P.parse_fen(fen)
        for d in range(1, len(counts) + 1):
            if counts[d - 1] > 200_000_000:
                break
            got = eng.run(pos, d)
            good = got == counts[d - 1]
            ok &= good
            out.write("  %-11s depth %d: %15s  %s\n" % (name, d, format(got, ","), "ok" if good else "FAIL"))
    out.write("numba selftest %s in %.2fs\n" % ("PASSED" if ok else "FAILED", time.perf_counter() - t0))
    return ok


def main(args):
    """Entry point used by perft.py --backend numba (args from argparse)."""
    if args.selftest:
        return 0 if selftest() else 1
    t0 = time.perf_counter()
    engine = NumbaEngine(jobs=args.jobs, tt_mb=args.tt_size, stats=args.stats,
                         progress=not args.no_progress)
    engine.run(P.parse_fen(P.START_FEN), 3)  # load/compile before timing
    sys.stderr.write("numba backend ready in %.1fs (%d threads)\n" % (time.perf_counter() - t0, engine.jobs))
    if args.bench:
        P.bench(engine)
        return 0
    if args.N is None:
        sys.stderr.write("N is required (or use --selftest / --bench)\n")
        return 2
    pos = P.parse_fen(args.fen)
    if args.divide:
        return P._divide(engine, pos, args.N)
    return P._table(engine, pos, args.N, args.stats)
