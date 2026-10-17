/*
 * CFR+ for heads-up limit Texas Hold'em on a card abstraction, for Feltroom's
 * "Play Against Cepheus" mode.
 *
 * What this is: the CFR+ algorithm of Tammelin/Bowling/Burch/Johanson (the
 * algorithm the University of Alberta used to compute Cepheus, and the one in
 * the CFR_plus archive), run on the exact betting tree of the archive's
 * holdem.limit.2p.reverse_blinds.game, with card information abstracted:
 *   - preflop: the 169 strategically distinct starting hands (lossless)
 *   - flop/turn: K buckets of E[HS^2] (expected squared hand strength against
 *     a uniform random hand, rolled out to the river)
 *   - river: K buckets of hand strength
 * Bucket boundaries are percentiles, so each bucket holds about the same share
 * of hands. Buckets use only the current round's cards (imperfect recall).
 *
 * What this is NOT: Cepheus's own strategy. Cepheus solved the game without
 * any card abstraction; its strategy is over 10 TB and was never published.
 *
 * Iterations: public chance sampling. Each iteration samples a full board and
 * updates every hand at once with vector arithmetic. Updates alternate between
 * players, regrets are floored at zero (regret matching+), and the average
 * strategy is weighted by max(0, t - warmup). All three are as in the archive.
 *
 * Hand strength is kept as exact integers, so the browser (which recomputes
 * one hand at a time) gets exactly the same buckets:
 *   river v  = 2*(opponent hands beaten) + (opponent hands tied), over 990 hands
 *   turn  f  = sum over the 46 river cards of v^2
 *   flop  f  = sum over the 1081 turn+river pairs of v^2
 *
 * Usage:
 *   cfrplus_hulhe tree                       print the betting tree size
 *   cfrplus_hulhe prep K                     flop table + bucket thresholds -> prep.bin
 *   cfrplus_hulhe train SECONDS THREADS DIR  run CFR+ (resumes from DIR/state.bin)
 *   cfrplus_hulhe eval A B BOARDS            exact EV of A vs B on sampled boards
 *                                            (A,B = strategy file | call | raise | uniform)
 *   cfrplus_hulhe export DIR OUT.bin         write the browser strategy file
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <pthread.h>
#include "acpc_eval.h"

#define NROUNDS 4
#define NH 1326
#define MAXN 1081 /* hands disjoint from a 5-card board */
#define MAXDEPTH 40

/* ---------------------------------------------------------------- game */
static int g_blind[2], g_raise[NROUNDS], g_first[NROUNDS], g_maxRaises[NROUNDS];

static void readGame(const char *path) {
  FILE *f = fopen(path, "r");
  if (!f) { perror(path); exit(1); }
  char line[256];
  while (fgets(line, sizeof line, f)) {
    if (!strncmp(line, "blind", 5)) sscanf(line, "blind = %d %d", &g_blind[0], &g_blind[1]);
    else if (!strncmp(line, "raiseSize", 9)) sscanf(line, "raiseSize = %d %d %d %d", &g_raise[0], &g_raise[1], &g_raise[2], &g_raise[3]);
    else if (!strncmp(line, "firstPlayer", 11)) { sscanf(line, "firstPlayer = %d %d %d %d", &g_first[0], &g_first[1], &g_first[2], &g_first[3]); }
    else if (!strncmp(line, "maxRaises", 9)) sscanf(line, "maxRaises = %d %d %d %d", &g_maxRaises[0], &g_maxRaises[1], &g_maxRaises[2], &g_maxRaises[3]);
  }
  fclose(f);
  for (int r = 0; r < NROUNDS; r++) g_first[r]--; /* file is 1-based */
}

/* ---------------------------------------------------------------- betting tree */
enum { DEC = 0, FOLD = 1, SHOW = 2 };
enum { A_FOLD = 0, A_CALL = 1, A_RAISE = 2 };
typedef struct {
  int8_t kind, round, player, nA;
  int8_t act[3];
  int child[3];
  int spent[2];
  int folder;
  int idx; /* decision-node number within its round */
} Node;
static Node g_nodes[20000];
static int g_nNodes, g_nDec[NROUNDS];

static int build(int round, int s0, int s1, int raises, int acted, int player) {
  int id = g_nNodes++;
  Node *n = &g_nodes[id];
  memset(n, 0, sizeof *n);
  n->kind = DEC; n->round = round; n->player = player; n->spent[0] = s0; n->spent[1] = s1;
  n->idx = g_nDec[round]++;
  int sp[2] = { s0, s1 }, mx = s0 > s1 ? s0 : s1;
  int k = 0;
  if (sp[player] < mx) n->act[k++] = A_FOLD;
  n->act[k++] = A_CALL;
  if (raises < g_maxRaises[round]) n->act[k++] = A_RAISE;
  n->nA = k;
  for (int a = 0; a < k; a++) {
    int c;
    if (n->act[a] == A_FOLD) {
      c = g_nNodes++;
      Node *t = &g_nodes[c]; memset(t, 0, sizeof *t);
      t->kind = FOLD; t->round = round; t->spent[0] = s0; t->spent[1] = s1; t->folder = player; t->idx = -1;
    } else if (n->act[a] == A_CALL) {
      int q[2] = { s0, s1 }; q[player] = mx;
      int ac = acted | (1 << player);
      if (ac == 3 && q[0] == q[1]) {
        if (round == NROUNDS - 1) {
          c = g_nNodes++;
          Node *t = &g_nodes[c]; memset(t, 0, sizeof *t);
          t->kind = SHOW; t->round = round; t->spent[0] = q[0]; t->spent[1] = q[1]; t->idx = -1;
        } else c = build(round + 1, q[0], q[1], 0, 0, g_first[round + 1]);
      } else c = build(round, q[0], q[1], raises, ac, 1 - player);
    } else {
      int q[2] = { s0, s1 }; q[player] = mx + g_raise[round];
      c = build(round, q[0], q[1], raises + 1, 1 << player, 1 - player);
    }
    g_nodes[id].child[a] = c; /* g_nodes may not move (static), but n may be stale after recursion */
    n = &g_nodes[id];
  }
  return id;
}

/* ---------------------------------------------------------------- cards */
static int g_hc[NH][2], g_hidx[52][52];
static inline int rank7(const int *c, int n) {
  Cardset s; s.cards = 0;
  for (int i = 0; i < n; i++) s.cards |= (uint64_t)1 << (((c[i] & 3) << 4) + (c[i] >> 2));
  return rankCardset(s);
}
static int preflopClass(int a, int b) {
  int ra = a >> 2, rb = b >> 2;
  if (ra == rb) return ra;
  int hi = ra > rb ? ra : rb, lo = ra > rb ? rb : ra;
  int k = hi * (hi - 1) / 2 + lo;
  return ((a & 3) == (b & 3) ? 13 : 91) + k;
}
static void initCards(void) {
  int k = 0;
  for (int a = 0; a < 52; a++) for (int b = a + 1; b < 52; b++) { g_hc[k][0] = a; g_hc[k][1] = b; g_hidx[a][b] = g_hidx[b][a] = k; k++; }
}

/* River values for every hand in list[] (hands disjoint from board5):
   v = 2*beaten + tied over the 990 opponent hands. rk[] receives ranks. */
typedef struct { int key; int i; } RK;
static int cmpRK(const void *x, const void *y) { return ((const RK *)x)->key - ((const RK *)y)->key; }
static void riverValues(const int *b5, const int *list, int n, int *v, int *rk, RK *tmp) {
  int c[7]; memcpy(c, b5, 5 * sizeof(int));
  for (int i = 0; i < n; i++) { c[5] = g_hc[list[i]][0]; c[6] = g_hc[list[i]][1]; rk[i] = rank7(c, 7); tmp[i].key = rk[i]; tmp[i].i = i; }
  qsort(tmp, n, sizeof(RK), cmpRK);
  int cardLess[52] = { 0 }, cumLess = 0;
  for (int g0 = 0; g0 < n;) {
    int g1 = g0; while (g1 < n && tmp[g1].key == tmp[g0].key) g1++;
    int cardEq[52] = { 0 };
    for (int j = g0; j < g1; j++) { int h = list[tmp[j].i]; cardEq[g_hc[h][0]]++; cardEq[g_hc[h][1]]++; }
    int G = g1 - g0;
    for (int j = g0; j < g1; j++) {
      int h = list[tmp[j].i], a = g_hc[h][0], b = g_hc[h][1];
      int less = cumLess - cardLess[a] - cardLess[b];
      int eq = G - cardEq[a] - cardEq[b] + 1;
      v[tmp[j].i] = 2 * less + eq;
    }
    for (int j = 0; j < 52; j++) cardLess[j] += cardEq[j];
    cumLess += G; g0 = g1;
  }
}
/* turn feature for every hand disjoint from b4: sum over rivers of v^2 */
static void turnFeatures(const int *b4, uint64_t *feat /* [NH] */) {
  static __thread int list[MAXN], v[MAXN], rk[MAXN]; static __thread RK tmp[MAXN];
  uint64_t used = 0; for (int i = 0; i < 4; i++) used |= 1ULL << b4[i];
  for (int h = 0; h < NH; h++) feat[h] = 0;
  int b5[5]; memcpy(b5, b4, 4 * sizeof(int));
  for (int x = 0; x < 52; x++) {
    if (used >> x & 1) continue;
    b5[4] = x; uint64_t u5 = used | 1ULL << x;
    int n = 0;
    for (int h = 0; h < NH; h++) if (!((u5 >> g_hc[h][0]) & 1) && !((u5 >> g_hc[h][1]) & 1)) list[n++] = h;
    riverValues(b5, list, n, v, rk, tmp);
    for (int i = 0; i < n; i++) feat[list[i]] += (uint64_t)v[i] * v[i];
  }
}
static void flopFeatures(const int *b3, uint64_t *feat) {
  static __thread int list[MAXN], v[MAXN], rk[MAXN]; static __thread RK tmp[MAXN];
  uint64_t used = 0; for (int i = 0; i < 3; i++) used |= 1ULL << b3[i];
  for (int h = 0; h < NH; h++) feat[h] = 0;
  int b5[5]; memcpy(b5, b3, 3 * sizeof(int));
  for (int x = 0; x < 52; x++) {
    if (used >> x & 1) continue;
    for (int y = x + 1; y < 52; y++) {
      if (used >> y & 1) continue;
      b5[3] = x; b5[4] = y; uint64_t u5 = used | 1ULL << x | 1ULL << y;
      int n = 0;
      for (int h = 0; h < NH; h++) if (!((u5 >> g_hc[h][0]) & 1) && !((u5 >> g_hc[h][1]) & 1)) list[n++] = h;
      riverValues(b5, list, n, v, rk, tmp);
      for (int i = 0; i < n; i++) feat[list[i]] += (uint64_t)v[i] * v[i];
    }
  }
}

/* ---------------------------------------------------------------- flop isomorphism */
static int g_perm[24][4];
static int g_flopCanon[52 * 52 * 52], g_flopPerm[52 * 52 * 52]; /* by sorted raw cards */
static int g_nCanon, g_canonCards[1755][3], g_canonMult[1755];
static inline int pc(int c, int p) { return (c & ~3) | g_perm[p][c & 3]; }
static void sort3(int *c) { int t; if (c[0] > c[1]) { t = c[0]; c[0] = c[1]; c[1] = t; } if (c[1] > c[2]) { t = c[1]; c[1] = c[2]; c[2] = t; } if (c[0] > c[1]) { t = c[0]; c[0] = c[1]; c[1] = t; } }
static void initIso(void) {
  int k = 0;
  for (int a = 0; a < 4; a++) for (int b = 0; b < 4; b++) for (int c = 0; c < 4; c++) for (int d = 0; d < 4; d++)
    if (a != b && a != c && a != d && b != c && b != d && c != d) { g_perm[k][0] = a; g_perm[k][1] = b; g_perm[k][2] = c; g_perm[k][3] = d; k++; }
  static int keyToCanon[52 * 52 * 52];
  memset(keyToCanon, -1, sizeof keyToCanon);
  g_nCanon = 0;
  for (int a = 0; a < 52; a++) for (int b = a + 1; b < 52; b++) for (int c = b + 1; c < 52; c++) {
    int best = 1 << 30, bp = 0;
    for (int p = 0; p < 24; p++) {
      int x[3] = { pc(a, p), pc(b, p), pc(c, p) }; sort3(x);
      int key = (x[0] * 52 + x[1]) * 52 + x[2];
      if (key < best) { best = key; bp = p; }
    }
    if (keyToCanon[best] < 0) {
      keyToCanon[best] = g_nCanon;
      g_canonCards[g_nCanon][0] = best / 2704; g_canonCards[g_nCanon][1] = best / 52 % 52; g_canonCards[g_nCanon][2] = best % 52;
      g_canonMult[g_nCanon] = 0; g_nCanon++;
    }
    int id = (a * 52 + b) * 52 + c;
    g_flopCanon[id] = keyToCanon[best]; g_flopPerm[id] = bp; g_canonMult[keyToCanon[best]]++;
  }
}

/* ---------------------------------------------------------------- abstraction data */
static int g_K[NROUNDS];
static double *g_thr[NROUNDS]; /* K-1 thresholds per post-flop round */
static uint8_t *g_flopBucket; /* [canon][NH] */
static int bucketOf(int r, double f) { /* number of thresholds <= f */
  int lo = 0, hi = g_K[r] - 1;
  while (lo < hi) { int m = (lo + hi) / 2; if (g_thr[r][m] <= f) lo = m + 1; else hi = m; }
  return lo;
}

static inline uint64_t xr(uint64_t *s) { uint64_t x = *s; x ^= x << 13; x ^= x >> 7; x ^= x << 17; return *s = x; }
static void randBoard(uint64_t *s, int *b, int n) {
  uint64_t used = 0;
  for (int i = 0; i < n;) { int c = xr(s) % 52; if (used >> c & 1) continue; used |= 1ULL << c; b[i++] = c; }
}

typedef struct { double f; double w; } FW;
static int cmpFW(const void *x, const void *y) { double a = ((const FW *)x)->f, b = ((const FW *)y)->f; return a < b ? -1 : a > b; }
static void thresholds(FW *v, size_t n, int K, double *out) {
  qsort(v, n, sizeof(FW), cmpFW);
  double tot = 0; for (size_t i = 0; i < n; i++) tot += v[i].w;
  double cum = 0; int j = 1;
  for (size_t i = 0; i < n && j < K; i++) {
    cum += v[i].w;
    while (j < K && cum >= tot * j / K) { out[j - 1] = (i + 1 < n) ? v[i + 1].f : v[i].f + 1; j++; }
  }
  while (j < K) { out[j - 1] = v[n - 1].f + 1; j++; }
}

static uint64_t *g_flopFeat;
static int g_nextCanon;
static pthread_mutex_t g_mu = PTHREAD_MUTEX_INITIALIZER;
static void *flopWorker(void *arg) {
  (void)arg;
  for (;;) {
    pthread_mutex_lock(&g_mu); int c = g_nextCanon++; pthread_mutex_unlock(&g_mu);
    if (c >= g_nCanon) return NULL;
    flopFeatures(g_canonCards[c], g_flopFeat + (size_t)c * NH);
  }
}

static void prep(int K, int threads) {
  g_flopFeat = calloc((size_t)g_nCanon * NH, sizeof(uint64_t));
  FILE *cf = fopen("flopfeat.cache", "rb");
  if (cf && fread(g_flopFeat, sizeof(uint64_t), (size_t)g_nCanon * NH, cf) == (size_t)g_nCanon * NH) fprintf(stderr, "flop features: from cache\n");
  else {
    time_t t0 = time(NULL);
    pthread_t th[64];
    for (int i = 0; i < threads; i++) pthread_create(&th[i], NULL, flopWorker, NULL);
    for (int i = 0; i < threads; i++) pthread_join(th[i], NULL);
    fprintf(stderr, "flop features for %d canonical flops: %lds\n", g_nCanon, (long)(time(NULL) - t0));
    FILE *o = fopen("flopfeat.cache", "wb"); fwrite(g_flopFeat, sizeof(uint64_t), (size_t)g_nCanon * NH, o); fclose(o);
  }
  if (cf) fclose(cf);
  for (int r = 1; r < NROUNDS; r++) { g_K[r] = K; g_thr[r] = calloc(K, sizeof(double)); }
  /* flop: exact distribution, every (flop, hand) weighted by the flop's multiplicity */
  size_t n = 0; FW *v = malloc(sizeof(FW) * (size_t)g_nCanon * NH);
  for (int c = 0; c < g_nCanon; c++) {
    uint64_t used = 1ULL << g_canonCards[c][0] | 1ULL << g_canonCards[c][1] | 1ULL << g_canonCards[c][2];
    for (int h = 0; h < NH; h++) if (!((used >> g_hc[h][0]) & 1) && !((used >> g_hc[h][1]) & 1)) { v[n].f = (double)g_flopFeat[(size_t)c * NH + h]; v[n].w = g_canonMult[c]; n++; }
  }
  thresholds(v, n, K, g_thr[1]);
  /* turn and river: sampled boards (fixed seed, so prep is reproducible) */
  uint64_t s = 12345;
  const int NT = 6000, NRV = 60000;
  n = 0; FW *tv = malloc(sizeof(FW) * (size_t)NT * NH); uint64_t feat[NH];
  for (int t = 0; t < NT; t++) {
    int b[4]; randBoard(&s, b, 4); turnFeatures(b, feat);
    uint64_t used = 0; for (int i = 0; i < 4; i++) used |= 1ULL << b[i];
    for (int h = 0; h < NH; h++) if (!((used >> g_hc[h][0]) & 1) && !((used >> g_hc[h][1]) & 1)) { tv[n].f = (double)feat[h]; tv[n].w = 1; n++; }
  }
  thresholds(tv, n, K, g_thr[2]);
  n = 0; FW *rv = malloc(sizeof(FW) * (size_t)NRV * MAXN);
  static int list[MAXN], vv[MAXN], rk[MAXN]; static RK tmp[MAXN];
  for (int t = 0; t < NRV; t++) {
    int b[5]; randBoard(&s, b, 5);
    uint64_t used = 0; for (int i = 0; i < 5; i++) used |= 1ULL << b[i];
    int m = 0; for (int h = 0; h < NH; h++) if (!((used >> g_hc[h][0]) & 1) && !((used >> g_hc[h][1]) & 1)) list[m++] = h;
    riverValues(b, list, m, vv, rk, tmp);
    for (int i = 0; i < m; i++) { rv[n].f = vv[i]; rv[n].w = 1; n++; }
  }
  thresholds(rv, n, K, g_thr[3]);
  FILE *o = fopen("prep.bin", "wb");
  fwrite(&K, sizeof K, 1, o);
  for (int r = 1; r < NROUNDS; r++) fwrite(g_thr[r], sizeof(double), K - 1, o);
  /* flop buckets for each canonical flop */
  uint8_t *fb = malloc((size_t)g_nCanon * NH);
  for (int c = 0; c < g_nCanon; c++) for (int h = 0; h < NH; h++) fb[(size_t)c * NH + h] = bucketOf(1, (double)g_flopFeat[(size_t)c * NH + h]);
  fwrite(fb, 1, (size_t)g_nCanon * NH, o);
  fclose(o);
  fprintf(stderr, "thresholds written (K=%d). flop thr[0..2]=%.0f %.0f %.0f  river thr[0..2]=%.0f %.0f %.0f\n", K, g_thr[1][0], g_thr[1][1], g_thr[1][2], g_thr[3][0], g_thr[3][1], g_thr[3][2]);
}
static void loadPrep(void) {
  FILE *f = fopen("prep.bin", "rb");
  if (!f) { fprintf(stderr, "run prep first\n"); exit(1); }
  int K; if (fread(&K, sizeof K, 1, f) != 1) exit(1);
  g_K[0] = 169;
  for (int r = 1; r < NROUNDS; r++) { g_K[r] = K; g_thr[r] = calloc(K, sizeof(double)); if (fread(g_thr[r], sizeof(double), K - 1, f) != (size_t)K - 1) exit(1); }
  g_flopBucket = malloc((size_t)g_nCanon * NH);
  if (fread(g_flopBucket, 1, (size_t)g_nCanon * NH, f) != (size_t)g_nCanon * NH) exit(1);
  fclose(f);
}

/* ---------------------------------------------------------------- per-board data */
typedef struct {
  int n, ha[MAXN], hb[MAXN];
  uint8_t bucket[NROUNDS][MAXN];
  int order[MAXN], grpEnd[MAXN]; /* hands sorted by river rank; grpEnd[j] = end of j's tie group */
} Board;

static void setupBoard(Board *B, const int *b5) {
  static __thread int list[MAXN], v[MAXN], rk[MAXN]; static __thread RK tmp[MAXN];
  static __thread uint64_t tf[NH];
  uint64_t used = 0; for (int i = 0; i < 5; i++) used |= 1ULL << b5[i];
  int n = 0;
  for (int h = 0; h < NH; h++) if (!((used >> g_hc[h][0]) & 1) && !((used >> g_hc[h][1]) & 1)) list[n++] = h;
  B->n = n;
  riverValues(b5, list, n, v, rk, tmp); /* tmp is now sorted by rank */
  turnFeatures(b5, tf);
  int f3[3] = { b5[0], b5[1], b5[2] }; sort3(f3);
  int fid = (f3[0] * 52 + f3[1]) * 52 + f3[2], canon = g_flopCanon[fid], p = g_flopPerm[fid];
  for (int i = 0; i < n; i++) {
    int a = g_hc[list[i]][0], b = g_hc[list[i]][1];
    B->ha[i] = a; B->hb[i] = b;
    B->bucket[0][i] = preflopClass(a, b);
    B->bucket[1][i] = g_flopBucket[(size_t)canon * NH + g_hidx[pc(a, p)][pc(b, p)]];
    B->bucket[2][i] = bucketOf(2, (double)tf[list[i]]);
    B->bucket[3][i] = bucketOf(3, v[i]);
  }
  for (int j = 0; j < n; j++) B->order[j] = tmp[j].i;
  for (int j = 0; j < n;) { int k = j; while (k < n && tmp[k].key == tmp[j].key) k++; for (int q = j; q < k; q++) B->grpEnd[q] = k; j = k; }
}

/* ---------------------------------------------------------------- strategy storage */
static size_t g_off[NROUNDS], g_entries; /* entry index = off[r] + (idx*K + b)*3 + a */
static double *g_regret, *g_avg;
static inline size_t ent(int r, int idx, int b) { return g_off[r] + ((size_t)idx * g_K[r] + b) * 3; }
static void initStorage(void) {
  g_entries = 0;
  for (int r = 0; r < NROUNDS; r++) { g_off[r] = g_entries; g_entries += (size_t)g_nDec[r] * g_K[r] * 3; }
}
/* current strategy (regret matching+) for one (node, bucket) */
static inline void rmPlus(const double *R, int nA, double *s) {
  double t = 0; for (int a = 0; a < nA; a++) t += R[a] > 0 ? R[a] : 0;
  if (t > 0) for (int a = 0; a < nA; a++) s[a] = (R[a] > 0 ? R[a] : 0) / t;
  else for (int a = 0; a < nA; a++) s[a] = 1.0 / nA;
}

/* ---------------------------------------------------------------- terminal values */
/* cfv for the traverser's hands given opponent reach; card removal handled exactly */
static void foldValues(const Board *B, const double *opp, double amount, double *out) {
  double tot = 0, card[52] = { 0 };
  for (int i = 0; i < B->n; i++) { tot += opp[i]; card[B->ha[i]] += opp[i]; card[B->hb[i]] += opp[i]; }
  for (int i = 0; i < B->n; i++) out[i] = amount * (tot - card[B->ha[i]] - card[B->hb[i]] + opp[i]);
}
static void showValues(const Board *B, const double *opp, double amount, double *out) {
  double cum = 0, card[52] = { 0 };
  int n = B->n;
  /* ascending: mass of weaker opponent hands */
  for (int j = 0; j < n;) {
    int k = B->grpEnd[j];
    for (int q = j; q < k; q++) { int i = B->order[q]; out[i] = cum - card[B->ha[i]] - card[B->hb[i]]; }
    for (int q = j; q < k; q++) { int i = B->order[q]; cum += opp[i]; card[B->ha[i]] += opp[i]; card[B->hb[i]] += opp[i]; }
    j = k;
  }
  cum = 0; memset(card, 0, sizeof card);
  for (int j = n - 1; j >= 0;) {
    int k = j; while (k >= 0 && B->grpEnd[k] == B->grpEnd[j]) k--;
    for (int q = j; q > k; q--) { int i = B->order[q]; out[i] = amount * (out[i] - (cum - card[B->ha[i]] - card[B->hb[i]])); }
    for (int q = j; q > k; q--) { int i = B->order[q]; cum += opp[i]; card[B->ha[i]] += opp[i]; card[B->hb[i]] += opp[i]; }
    j = k;
  }
}

/* ---------------------------------------------------------------- CFR+ walk */
typedef struct {
  double *regD, *avgD; /* thread-local deltas */
  double buf[MAXDEPTH][5][MAXN];
  double w; int p;
  Board B;
  uint64_t rng;
} Ctx;

static void walk(Ctx *C, int id, const double *own, const double *opp, double *out, int d) {
  const Node *n = &g_nodes[id];
  const Board *B = &C->B;
  int N = B->n, p = C->p;
  if (n->kind == FOLD) { foldValues(B, opp, n->folder == p ? -n->spent[p] : n->spent[1 - p], out); return; }
  if (n->kind == SHOW) { showValues(B, opp, n->spent[p], out); return; }
  int r = n->round, K = g_K[r], nA = n->nA;
  const uint8_t *bk = B->bucket[r];
  double sig[169][3];
  for (int b = 0; b < K; b++) rmPlus(&g_regret[ent(r, n->idx, b)], nA, sig[b]);
  double *nr = C->buf[d][3];
  if (n->player == p) {
    double *cv[3] = { C->buf[d][0], C->buf[d][1], C->buf[d][2] };
    for (int a = 0; a < nA; a++) {
      for (int i = 0; i < N; i++) nr[i] = own[i] * sig[bk[i]][a];
      walk(C, n->child[a], nr, opp, cv[a], d + 1);
    }
    for (int i = 0; i < N; i++) {
      const double *s = sig[bk[i]];
      double v = 0; for (int a = 0; a < nA; a++) v += s[a] * cv[a][i];
      out[i] = v;
      double *R = &C->regD[ent(r, n->idx, bk[i])];
      for (int a = 0; a < nA; a++) R[a] += cv[a][i] - v;
    }
    if (C->w > 0) {
      double *bsum = C->buf[d][4];
      for (int b = 0; b < K; b++) bsum[b] = 0;
      for (int i = 0; i < N; i++) bsum[bk[i]] += own[i];
      for (int b = 0; b < K; b++) if (bsum[b] > 0) { double *A = &C->avgD[ent(r, n->idx, b)]; for (int a = 0; a < nA; a++) A[a] += C->w * bsum[b] * sig[b][a]; }
    }
  } else {
    double *cv = C->buf[d][0];
    for (int i = 0; i < N; i++) out[i] = 0;
    for (int a = 0; a < nA; a++) {
      double any = 0;
      for (int i = 0; i < N; i++) { nr[i] = opp[i] * sig[bk[i]][a]; any += nr[i]; }
      if (any <= 0) continue;
      walk(C, n->child[a], own, nr, cv, d + 1);
      for (int i = 0; i < N; i++) out[i] += cv[i];
    }
  }
}

/* ---------------------------------------------------------------- training */
static int g_threads, g_boardsPerThread = 2;
static Ctx **g_ctx;
static void *trainWorker(void *arg) {
  Ctx *C = arg;
  memset(C->regD, 0, g_entries * sizeof(double));
  if (C->w > 0) memset(C->avgD, 0, g_entries * sizeof(double));
  static __thread double ones[MAXN], out[MAXN];
  for (int k = 0; k < g_boardsPerThread; k++) {
    int b5[5]; randBoard(&C->rng, b5, 5);
    setupBoard(&C->B, b5);
    for (int i = 0; i < C->B.n; i++) ones[i] = 1;
    walk(C, 0, ones, ones, out, 0);
  }
  return NULL;
}
static int g_iter, g_warm = 200;
static void saveState(const char *dir) {
  char p[512]; snprintf(p, sizeof p, "%s/state.bin", dir);
  char tmpp[520]; snprintf(tmpp, sizeof tmpp, "%s.tmp", p);
  FILE *f = fopen(tmpp, "wb");
  fwrite(&g_iter, sizeof g_iter, 1, f); fwrite(&g_entries, sizeof g_entries, 1, f);
  fwrite(g_regret, sizeof(double), g_entries, f); fwrite(g_avg, sizeof(double), g_entries, f);
  fclose(f); rename(tmpp, p);
}
static int loadState(const char *path) {
  FILE *f = fopen(path, "rb"); if (!f) return 0;
  size_t e; int it;
  if (fread(&it, sizeof it, 1, f) != 1 || fread(&e, sizeof e, 1, f) != 1 || e != g_entries) { fclose(f); fprintf(stderr, "state does not match tree\n"); exit(1); }
  if (fread(g_regret, sizeof(double), e, f) != e || fread(g_avg, sizeof(double), e, f) != e) exit(1);
  fclose(f); g_iter = it; return 1;
}
static void train(double seconds, int threads, const char *dir) {
  g_regret = calloc(g_entries, sizeof(double)); g_avg = calloc(g_entries, sizeof(double));
  char sp[512]; snprintf(sp, sizeof sp, "%s/state.bin", dir);
  if (loadState(sp)) fprintf(stderr, "resumed at iteration %d\n", g_iter);
  g_threads = threads;
  g_ctx = malloc(sizeof(Ctx *) * threads);
  for (int t = 0; t < threads; t++) {
    g_ctx[t] = calloc(1, sizeof(Ctx));
    g_ctx[t]->regD = malloc(g_entries * sizeof(double)); g_ctx[t]->avgD = malloc(g_entries * sizeof(double));
    g_ctx[t]->rng = 0x1234567ULL * (t + 1) + (uint64_t)time(NULL) * 2654435761ULL + g_iter;
  }
  struct timespec t0, t1; clock_gettime(CLOCK_MONOTONIC, &t0);
  double lastSave = 0;
  for (;;) {
    g_iter++;
    for (int p = 0; p < 2; p++) {
      double w = g_iter > g_warm ? g_iter - g_warm : 0;
      pthread_t th[64];
      for (int t = 0; t < threads; t++) { g_ctx[t]->p = p; g_ctx[t]->w = w; pthread_create(&th[t], NULL, trainWorker, g_ctx[t]); }
      for (int t = 0; t < threads; t++) pthread_join(th[t], NULL);
      /* apply: regret matching+ floors regrets at zero after each update */
      for (int r = 0; r < NROUNDS; r++) {
        for (int id = 0; id < g_nNodes; id++) {
          const Node *n = &g_nodes[id];
          if (n->kind != DEC || n->round != r || n->player != p) continue;
          for (int b = 0; b < g_K[r]; b++) {
            size_t e = ent(r, n->idx, b);
            for (int a = 0; a < n->nA; a++) {
              double s = 0, sa = 0;
              for (int t = 0; t < threads; t++) { s += g_ctx[t]->regD[e + a]; if (w > 0) sa += g_ctx[t]->avgD[e + a]; }
              double R = g_regret[e + a] + s; g_regret[e + a] = R > 0 ? R : 0;
              g_avg[e + a] += sa;
            }
          }
        }
      }
    }
    clock_gettime(CLOCK_MONOTONIC, &t1);
    double el = (t1.tv_sec - t0.tv_sec) + (t1.tv_nsec - t0.tv_nsec) / 1e9;
    if (g_iter % 50 == 0) fprintf(stderr, "iter %d  %.0fs\n", g_iter, el);
    if (el - lastSave > 300) { saveState(dir); lastSave = el; }
    if (el >= seconds) break;
  }
  saveState(dir);
  fprintf(stderr, "done: iteration %d\n", g_iter);
}

/* ---------------------------------------------------------------- strategies for eval/export */
static void avgToStrategy(double *S) { /* normalise g_avg per (node, bucket) into S */
  for (int id = 0; id < g_nNodes; id++) {
    const Node *n = &g_nodes[id]; if (n->kind != DEC) continue;
    for (int b = 0; b < g_K[n->round]; b++) {
      size_t e = ent(n->round, n->idx, b); double t = 0;
      for (int a = 0; a < n->nA; a++) t += g_avg[e + a];
      for (int a = 0; a < n->nA; a++) S[e + a] = t > 0 ? g_avg[e + a] / t : 1.0 / n->nA;
    }
  }
}
static double *loadStrategy(const char *spec) {
  double *S = calloc(g_entries, sizeof(double));
  if (!strcmp(spec, "call") || !strcmp(spec, "raise") || !strcmp(spec, "uniform")) {
    for (int id = 0; id < g_nNodes; id++) {
      const Node *n = &g_nodes[id]; if (n->kind != DEC) continue;
      for (int b = 0; b < g_K[n->round]; b++) {
        size_t e = ent(n->round, n->idx, b);
        for (int a = 0; a < n->nA; a++) S[e + a] = !strcmp(spec, "uniform") ? 1.0 / n->nA
          : !strcmp(spec, "call") ? (n->act[a] == A_CALL) : (n->act[a] == (n->act[n->nA - 1] == A_RAISE ? A_RAISE : A_CALL));
      }
    }
    return S;
  }
  g_regret = calloc(g_entries, sizeof(double)); g_avg = calloc(g_entries, sizeof(double));
  if (!loadState(spec)) { fprintf(stderr, "cannot read %s\n", spec); exit(1); }
  avgToStrategy(S); free(g_regret); free(g_avg);
  return S;
}
/* EV for seat 0 of the pair (S0 in seat 0, S1 in seat 1), summed over hand pairs */
static double evWalk(const Board *B, int id, double *const S[2], const double *r0, const double *r1, double (*buf)[3][MAXN], int d) {
  const Node *n = &g_nodes[id]; int N = B->n;
  if (n->kind != DEC) {
    double *cv = buf[d][0];
    if (n->kind == FOLD) foldValues(B, r1, n->folder == 0 ? -n->spent[0] : n->spent[1], cv); else showValues(B, r1, n->spent[0], cv);
    double s = 0; for (int i = 0; i < N; i++) s += r0[i] * cv[i]; return s;
  }
  int q = n->player, r = n->round; const uint8_t *bk = B->bucket[r];
  double tot = 0;
  for (int a = 0; a < n->nA; a++) {
    double *nr = buf[d][1 + (a & 1)], any = 0; /* children are evaluated one at a time */
    const double *src = q == 0 ? r0 : r1;
    for (int i = 0; i < N; i++) { nr[i] = src[i] * S[q][ent(r, n->idx, bk[i]) + a]; any += nr[i]; }
    if (any <= 0) continue;
    tot += q == 0 ? evWalk(B, n->child[a], S, nr, r1, buf, d + 1) : evWalk(B, n->child[a], S, r0, nr, buf, d + 1);
  }
  return tot;
}
static void evalCmd(const char *a, const char *b, int boards) {
  double *SA = loadStrategy(a), *SB = loadStrategy(b);
  static Board B; static double buf[MAXDEPTH][3][MAXN], ones[MAXN];
  uint64_t s = 777; double sum = 0, sum2 = 0;
  for (int k = 0; k < boards; k++) {
    int b5[5]; randBoard(&s, b5, 5); setupBoard(&B, b5);
    for (int i = 0; i < B.n; i++) ones[i] = 1;
    double *p1[2] = { SA, SB }, *p2[2] = { SB, SA };
    double pairs = (double)B.n * 990;
    double ev = (evWalk(&B, 0, p1, ones, ones, buf, 0) - evWalk(&B, 0, p2, ones, ones, buf, 0)) / 2 / pairs;
    sum += ev; sum2 += ev * ev;
  }
  double m = sum / boards, var = sum2 / boards - m * m, sd = sqrt(var > 0 ? var : 0) / sqrt(boards);
  double bb = g_blind[0] > g_blind[1] ? g_blind[0] : g_blind[1];
  printf("%s vs %s: %+.1f +/- %.1f mbb/hand (%d boards, both seats, all hands)\n", a, b, m / bb * 1000, 1.96 * sd / bb * 1000, boards);
}

/* ---------------------------------------------------------------- export for the browser */
static uint32_t fnv(const uint8_t *p, size_t n) { uint32_t h = 2166136261u; for (size_t i = 0; i < n; i++) { h ^= p[i]; h *= 16777619u; } return h; }
static void exportCmd(const char *dir, const char *out, const char *note) {
  char sp[512]; snprintf(sp, sizeof sp, "%s/state.bin", dir);
  double *S = loadStrategy(sp);
  size_t cap = 1 << 24, n = 0; uint8_t *o = malloc(cap);
#define PUT8(x) (o[n++] = (uint8_t)(x))
#define PUT16(x) do { uint16_t _v = (x); memcpy(o + n, &_v, 2); n += 2; } while (0)
#define PUT32(x) do { uint32_t _v = (x); memcpy(o + n, &_v, 4); n += 4; } while (0)
  memcpy(o, "CPH1", 4); n = 4;
  char meta[256]; int ml = snprintf(meta, sizeof meta, "{\"iterations\":%d,\"warmup\":%d,\"note\":\"%s\"}", g_iter, g_warm, note);
  PUT16(ml); memcpy(o + n, meta, ml); n += ml;
  PUT16(g_blind[0]); PUT16(g_blind[1]);
  for (int r = 0; r < NROUNDS; r++) { PUT16(g_raise[r]); PUT8(g_first[r]); PUT8(g_maxRaises[r]); }
  for (int r = 0; r < NROUNDS; r++) PUT16(g_K[r]);
  for (int r = 1; r < NROUNDS; r++) for (int j = 0; j < g_K[r] - 1; j++) { double t = g_thr[r][j]; memcpy(o + n, &t, 8); n += 8; }
  for (int r = 0; r < NROUNDS; r++) PUT32(g_nDec[r]);
  /* hand-evaluator tables (from the archive's evalHandTables) */
  for (int i = 0; i < 8192; i++) PUT16(oneSuitVal[i]);
  for (int i = 0; i < 8192; i++) PUT16(pairOtherVal[i]);
  for (int i = 0; i < 8192; i++) PUT16(anySuitVal[i]);
  for (int i = 0; i < 8192; i++) PUT8(topBit[i]);
  for (int i = 0; i < 8192; i++) PUT8(tripsOtherVal[i]);
  /* strategy: decision nodes in tree (depth-first) order; per bucket, nA-1 bytes (the last is 255 - sum) */
  for (int id = 0; id < g_nNodes; id++) {
    const Node *nd = &g_nodes[id]; if (nd->kind != DEC) continue;
    for (int b = 0; b < g_K[nd->round]; b++) {
      size_t e = ent(nd->round, nd->idx, b);
      int q[3], tot = 0; double fr[3];
      for (int a = 0; a < nd->nA; a++) { double x = S[e + a] * 255; q[a] = (int)floor(x); fr[a] = x - q[a]; tot += q[a]; }
      while (tot < 255) { int best = 0; for (int a = 1; a < nd->nA; a++) if (fr[a] > fr[best]) best = a; q[best]++; fr[best] = -1; tot++; }
      for (int a = 0; a < nd->nA - 1; a++) PUT8(q[a]);
    }
  }
  uint32_t h = fnv(o, n); PUT32(h);
  FILE *f = fopen(out, "wb"); fwrite(o, 1, n, f); fclose(f);
  fprintf(stderr, "wrote %s: %zu bytes (iteration %d)\n", out, n, g_iter);
}

/* brute-force checks of the fast vector code */
static int selftest(void) {
  uint64_t s = 99; int bad = 0;
  static int list[MAXN], v[MAXN], rk[MAXN]; static RK tmp[MAXN]; static Board B; static double opp[MAXN], out[MAXN];
  for (int t = 0; t < 20; t++) {
    int b5[5]; randBoard(&s, b5, 5);
    uint64_t used = 0; for (int i = 0; i < 5; i++) used |= 1ULL << b5[i];
    int n = 0; for (int h = 0; h < NH; h++) if (!((used >> g_hc[h][0]) & 1) && !((used >> g_hc[h][1]) & 1)) list[n++] = h;
    riverValues(b5, list, n, v, rk, tmp);
    for (int i = 0; i < n; i += 37) {
      int w = 0, cnt = 0;
      for (int j = 0; j < n; j++) {
        int a = g_hc[list[i]][0], b = g_hc[list[i]][1], c = g_hc[list[j]][0], d = g_hc[list[j]][1];
        if (a == c || a == d || b == c || b == d) continue;
        cnt++; w += rk[i] > rk[j] ? 2 : rk[i] == rk[j];
      }
      if (w != v[i] || cnt != 990) bad++;
    }
    setupBoard(&B, b5);
    for (int i = 0; i < B.n; i++) opp[i] = (xr(&s) % 1000) / 1000.0;
    showValues(&B, opp, 1, out);
    int c7[7]; memcpy(c7, b5, 20);
    for (int i = 0; i < B.n; i += 53) {
      double e = 0; c7[5] = B.ha[i]; c7[6] = B.hb[i]; int ri = rank7(c7, 7);
      for (int j = 0; j < B.n; j++) {
        if (B.ha[i] == B.ha[j] || B.ha[i] == B.hb[j] || B.hb[i] == B.ha[j] || B.hb[i] == B.hb[j]) continue;
        c7[5] = B.ha[j]; c7[6] = B.hb[j]; int rj = rank7(c7, 7); c7[5] = B.ha[i]; c7[6] = B.hb[i];
        e += opp[j] * (ri > rj ? 1 : ri < rj ? -1 : 0);
      }
      if (fabs(e - out[i]) > 1e-9) bad++;
    }
    foldValues(&B, opp, 1, out);
    for (int i = 0; i < B.n; i += 53) {
      double e = 0;
      for (int j = 0; j < B.n; j++) if (!(B.ha[i] == B.ha[j] || B.ha[i] == B.hb[j] || B.hb[i] == B.ha[j] || B.hb[i] == B.hb[j])) e += opp[j];
      if (fabs(e - out[i]) > 1e-9) bad++;
    }
  }
  int seen[169] = { 0 }, k = 0; for (int h = 0; h < NH; h++) seen[preflopClass(g_hc[h][0], g_hc[h][1])]++;
  for (int c = 0; c < 169; c++) if (seen[c]) k++;
  printf("selftest: %s (%d mismatches; %d preflop classes)\n", bad || k != 169 ? "FAIL" : "ok", bad, k);
  return bad || k != 169;
}

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "see the comment at the top of this file\n"); return 1; }
  readGame("holdem.limit.2p.reverse_blinds.game");
  build(0, g_blind[0], g_blind[1], 0, 0, g_first[0]);
  initCards(); initIso();
  if (!strcmp(argv[1], "tree")) {
    int nd[NROUNDS] = { 0 }, nf = 0, ns = 0;
    for (int i = 0; i < g_nNodes; i++) { if (g_nodes[i].kind == DEC) nd[g_nodes[i].round]++; else if (g_nodes[i].kind == FOLD) nf++; else ns++; }
    printf("blinds %d/%d raise %d %d %d %d first %d %d %d %d maxRaises %d %d %d %d\n", g_blind[0], g_blind[1], g_raise[0], g_raise[1], g_raise[2], g_raise[3], g_first[0], g_first[1], g_first[2], g_first[3], g_maxRaises[0], g_maxRaises[1], g_maxRaises[2], g_maxRaises[3]);
    printf("nodes %d: decision %d/%d/%d/%d, fold %d, showdown %d; canonical flops %d\n", g_nNodes, nd[0], nd[1], nd[2], nd[3], nf, ns, g_nCanon);
    return 0;
  }
  if (!strcmp(argv[1], "prep")) { prep(atoi(argv[2]), argc > 3 ? atoi(argv[3]) : 4); return 0; }
  if (getenv("WARMUP")) g_warm = atoi(getenv("WARMUP"));
  loadPrep(); initStorage();
  if (!strcmp(argv[1], "selftest")) return selftest();
  if (!strcmp(argv[1], "vectors")) { /* bucket test cases for the browser engine */
    static Board B; uint64_t rs = 4242; const char *R = "23456789TJQKA", *S = "shdc";
    for (int k = 0; k < atoi(argv[2]); k++) {
      int b5[5]; randBoard(&rs, b5, 5); setupBoard(&B, b5);
      int i = xr(&rs) % B.n;
      for (int j = 0; j < 5; j++) printf("%c%c ", R[b5[j] >> 2], S[b5[j] & 3]);
      printf("%c%c %c%c %d %d %d %d\n", R[B.ha[i] >> 2], S[B.ha[i] & 3], R[B.hb[i] >> 2], S[B.hb[i] & 3], B.bucket[0][i], B.bucket[1][i], B.bucket[2][i], B.bucket[3][i]);
    }
    return 0;
  }
  if (!strcmp(argv[1], "probe")) { /* random tree spots: history, seat, bucket, quantized probabilities (as exported) */
    char sp[512]; snprintf(sp, sizeof sp, "%s/state.bin", argv[2]);
    double *S = loadStrategy(sp); uint64_t rs = 31337;
    for (int k = 0; k < atoi(argv[3]); k++) {
      int id = 0; char hist[4][16] = { "", "", "", "" }; int depth = xr(&rs) % 12;
      for (int st = 0; st < depth; st++) {
        const Node *n = &g_nodes[id]; int a = xr(&rs) % n->nA;
        if (n->act[a] == A_FOLD) a = (a + 1) % n->nA;
        int c = n->child[a]; if (g_nodes[c].kind != DEC) break;
        strncat(hist[n->round], &"fcr"[n->act[a]], 1); id = c;
      }
      const Node *n = &g_nodes[id]; int b = xr(&rs) % g_K[n->round]; size_t e = ent(n->round, n->idx, b);
      int q[3], tot = 0; double fr[3];
      for (int a = 0; a < n->nA; a++) { double x = S[e + a] * 255; q[a] = (int)floor(x); fr[a] = x - q[a]; tot += q[a]; }
      while (tot < 255) { int best = 0; for (int a = 1; a < n->nA; a++) if (fr[a] > fr[best]) best = a; q[best]++; fr[best] = -1; tot++; }
      printf("%d %d %d", n->round, n->player, b);
      for (int r = 0; r <= n->round; r++) printf(" [%s]", hist[r]);
      printf(" |"); for (int a = 0; a < n->nA; a++) printf(" %c=%d", "fcr"[n->act[a]], q[a]); printf("\n");
    }
    return 0;
  }
  if (!strcmp(argv[1], "bench")) {
    static Board B; uint64_t rs = 5; struct timespec a, b;
    clock_gettime(CLOCK_MONOTONIC, &a);
    for (int k = 0; k < 100; k++) { int b5[5]; randBoard(&rs, b5, 5); setupBoard(&B, b5); }
    clock_gettime(CLOCK_MONOTONIC, &b);
    printf("setupBoard: %.2f ms\n", ((b.tv_sec - a.tv_sec) * 1e3 + (b.tv_nsec - a.tv_nsec) / 1e6) / 100);
    return 0;
  }
  if (!strcmp(argv[1], "train")) { train(atof(argv[2]), atoi(argv[3]), argv[4]); return 0; }
  if (!strcmp(argv[1], "eval")) { evalCmd(argv[2], argv[3], atoi(argv[4])); return 0; }
  if (!strcmp(argv[1], "export")) { exportCmd(argv[2], argv[3], argc > 4 ? argv[4] : ""); return 0; }
  return 1;
}
