/* Alpine Descent — trails.js
   The MTB trail network, cut into the terrain rather than drawn on top of it.

   A cost-based A* across the coarse grid hates steep fall-line grades and hates
   cliff bands (which it sees through the fine-scale roughness grid), so forced
   to descend without going straight down a face it traverses, and switchbacks
   fall out on their own. The route is splined, resampled to an even 7.5 m, and
   its profile smoothed across ~150 m before being clamped back onto the
   hillside — that is a bench cut, and it is what gets a bike down a rock band. */
(function (root) {
  'use strict';
  var MTB = root.MTB, T = MTB.Terrain;
  var M = MTB.math, clamp = M.clamp, lerp = M.lerp, smoothstep = M.smoothstep;

  var Tr = MTB.Trails = { nodes: [], edges: [], hash: null, CELL: 96, totalLength: 0 };

  /* --- binary heap --------------------------------------------------------- */
  function Heap() { this.ids = []; this.keys = []; }
  Heap.prototype.push = function (id, key) {
    var ids = this.ids, ks = this.keys, i = ids.length;
    ids.push(id); ks.push(key);
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (ks[p] <= ks[i]) break;
      var t = ids[p]; ids[p] = ids[i]; ids[i] = t;
      var k = ks[p]; ks[p] = ks[i]; ks[i] = k;
      i = p;
    }
  };
  Heap.prototype.pop = function () {
    var ids = this.ids, ks = this.keys, top = ids[0];
    var li = ids.pop(), lk = ks.pop();
    if (ids.length) {
      ids[0] = li; ks[0] = lk;
      var i = 0, n = ids.length;
      for (;;) {
        var l = 2 * i + 1, r = l + 1, s = i;
        if (l < n && ks[l] < ks[s]) s = l;
        if (r < n && ks[r] < ks[s]) s = r;
        if (s === i) break;
        var t = ids[s]; ids[s] = ids[i]; ids[i] = t;
        var k = ks[s]; ks[s] = ks[i]; ks[i] = k;
        i = s;
      }
    }
    return top;
  };
  Heap.prototype.size = function () { return this.ids.length; };

  /* --- routing -------------------------------------------------------------- */
  var NB = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

  function moveCost(h0, h1, dist, jitter, rough) {
    var grade = (h1 - h0) / dist, c = dist;
    if (grade > 0) {
      c += (h1 - h0) * 7.0;
      // Above a rideable climbing grade the penalty has to be close to
      // prohibitive, not merely large: a finite cost here means A* happily
      // takes a wall rather than a long contour, and the profile smoother is
      // then asked to move tens of metres of earth, which it can only do by
      // digging a trench whose own side walls stop the rider. Make the router
      // switchback instead and there is almost nothing left to flatten.
      if (grade > 0.18) c += (grade - 0.18) * dist * 60;
      if (grade > 0.26) c += (grade - 0.26) * dist * 900;
    } else {
      var g = -grade;
      if (g > 0.30) c += (g - 0.30) * dist * 85;
      else c -= dist * g * 0.35;
      if (g > 0.58) c += (g - 0.58) * dist * 700;
    }
    // fine-scale cliffiness the coarse grid cannot resolve
    if (rough > 0.45) c += (rough - 0.45) * dist * 130;
    if (rough > 0.95) c += (rough - 0.95) * dist * 420;
    c *= (1 + jitter * 0.55);
    return Math.max(c, dist * 0.05);
  }

  var _g = null, _came = null, _stamp = null, _epoch = 0;

  function route(sx, sz, ex, ez, seed) {
    var n = T.GRID_N;
    if (!_g) { _g = new Float32Array(n * n); _came = new Int32Array(n * n); _stamp = new Int32Array(n * n); }
    _epoch++;
    var a = T.worldToGrid(sx, sz), b = T.worldToGrid(ex, ez);
    var startI = a.gz * n + a.gx, goalI = b.gz * n + b.gx;
    if (startI === goalI) return null;

    var minX = Math.max(1, Math.min(a.gx, b.gx) - 34), maxX = Math.min(n - 2, Math.max(a.gx, b.gx) + 34);
    var minZ = Math.max(1, Math.min(a.gz, b.gz) - 34), maxZ = Math.min(n - 2, Math.max(a.gz, b.gz) + 34);
    var step = T.GRID_STEP, heap = new Heap();
    _g[startI] = 0; _stamp[startI] = _epoch; _came[startI] = -1;
    heap.push(startI, 0);

    var guard = 0, found = false;
    while (heap.size() && guard++ < 260000) {
      var cur = heap.pop();
      if (cur === goalI) { found = true; break; }
      var cx = cur % n, cz = (cur / n) | 0, ch = T.grid[cur], cg = _g[cur];
      for (var k = 0; k < 8; k++) {
        var nx = cx + NB[k][0], nz = cz + NB[k][1];
        if (nx < minX || nx > maxX || nz < minZ || nz > maxZ) continue;
        var ni = nz * n + nx, nh = T.grid[ni];
        if (nh < T.SEA + 1.5) continue;
        var wpx = -T.HALF + (nx + 0.5) * step, wpz = -T.HALF + (nz + 0.5) * step;
        if (T.inLake(wpx, wpz)) continue;
        var d = (NB[k][0] && NB[k][1]) ? step * 1.41421 : step;
        var tent = cg + moveCost(ch, nh, d, MTB.rand2(nx * 3 + seed, nz * 7 - seed, seed),
                                 T.roughAt(wpx, wpz));
        if (_stamp[ni] !== _epoch || tent < _g[ni]) {
          _stamp[ni] = _epoch; _g[ni] = tent; _came[ni] = cur;
          var hx = (nx - b.gx) * step, hz = (nz - b.gz) * step;
          heap.push(ni, tent + Math.sqrt(hx * hx + hz * hz) * 0.92);
        }
      }
    }
    if (!found) return null;
    var path = [], c2 = goalI, safety = 0;
    while (c2 !== -1 && safety++ < 100000) {
      var w = T.gridIndexToWorld(c2 % n, (c2 / n) | 0);
      path.push({ x: w.x, z: w.z });
      c2 = _came[c2];
    }
    path.reverse();
    return path.length > 2 ? path : null;
  }

  /* --- spline + profile ------------------------------------------------------ */
  function catmull(p0, p1, p2, p3, t, o) {
    var t2 = t * t, t3 = t2 * t;
    o.x = 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
    o.z = 0.5 * ((2*p1.z) + (-p0.z+p2.z)*t + (2*p0.z-5*p1.z+4*p2.z-p3.z)*t2 + (-p0.z+3*p1.z-3*p2.z+p3.z)*t3);
    return o;
  }

  function resample(path, spacing) {
    var p = path, pass, i;
    for (pass = 0; pass < 2; pass++) {          // Chaikin rounds the grid staircase
      var q = [p[0]];
      for (i = 0; i < p.length - 1; i++) {
        var A = p[i], B = p[i + 1];
        q.push({ x: A.x*0.75+B.x*0.25, z: A.z*0.75+B.z*0.25 });
        q.push({ x: A.x*0.25+B.x*0.75, z: A.z*0.25+B.z*0.75 });
      }
      q.push(p[p.length - 1]); p = q;
    }
    var acc = [], tmp = { x: 0, z: 0 };
    for (var s = 0; s < p.length - 1; s++) {
      var p0 = p[Math.max(0, s-1)], p1 = p[s], p2 = p[s+1], p3 = p[Math.min(p.length-1, s+2)];
      var steps = Math.max(1, Math.round(Math.hypot(p2.x-p1.x, p2.z-p1.z) / 6));
      for (var st = 0; st < steps; st++) { catmull(p0,p1,p2,p3, st/steps, tmp); acc.push({x:tmp.x,z:tmp.z}); }
    }
    acc.push({ x: p[p.length-1].x, z: p[p.length-1].z });

    var cum = new Float64Array(acc.length);
    for (i = 1; i < acc.length; i++) cum[i] = cum[i-1] + Math.hypot(acc[i].x-acc[i-1].x, acc[i].z-acc[i-1].z);
    var total = cum[acc.length-1], out = [], cursor = 1;
    for (var d = 0; d <= total; d += spacing) {
      while (cursor < acc.length - 1 && cum[cursor] < d) cursor++;
      var A2 = acc[cursor-1], B2 = acc[cursor], segL = cum[cursor] - cum[cursor-1];
      var tt = segL > 1e-6 ? (d - cum[cursor-1]) / segL : 0;
      out.push({ x: lerp(A2.x,B2.x,tt), z: lerp(A2.z,B2.z,tt) });
    }
    var tail = acc[acc.length-1], last = out[out.length-1];
    if (!last || Math.hypot(tail.x-last.x, tail.z-last.z) > spacing*0.35) out.push({x:tail.x,z:tail.z});
    else { last.x = tail.x; last.z = tail.z; }
    return out;
  }

  var MAX_CUT = 21, MAX_FILL = 15;
  function laplacian(y, n, passes, k) {
    for (var p = 0; p < passes; p++)
      for (var i = 1; i < n - 1; i++) y[i] += ((y[i-1] + y[i+1]) * 0.5 - y[i]) * k;
  }

  function buildProfile(pts) {
    var i, n = pts.length, raw = new Float32Array(n);
    for (i = 0; i < n; i++) raw[i] = T.baseHeight(pts[i].x, pts[i].z);

    // Wide triangular moving average: spreads a short cliff step across ~150 m
    // of trail. It deliberately does NOT impose a global maximum grade — on this
    // mountain that is not achievable, and forcing it just saturates the profile
    // and puts the kinks straight back in.
    var sm = new Float32Array(n), W = 10;
    for (i = 0; i < n; i++) {
      var s = 0, c = 0;
      for (var k = -W; k <= W; k++) {
        var j = i + k; if (j < 0 || j >= n) continue;
        var w = 1 - Math.abs(k) / (W + 1); s += raw[j] * w; c += w;
      }
      sm[i] = s / c;
    }
    laplacian(sm, n, 4, 0.6);
    function clampDev(cut, fill) {
      for (var q = 0; q < n; q++) {
        var dv = sm[q] - raw[q];
        if (dv > fill) sm[q] = raw[q] + fill; else if (dv < -cut) sm[q] = raw[q] - cut;
      }
    }
    clampDev(MAX_CUT, MAX_FILL);
    laplacian(sm, n, 6, 0.55);
    clampDev(MAX_CUT * 1.35, MAX_FILL * 1.35);
    laplacian(sm, n, 4, 0.5);

    // Smoothing alone is not enough, and clampDev is what undoes it: wherever
    // the cut needed exceeds the allowance it drags the tread back onto raw
    // ground and puts a step straight across the trail. Measured rides stalled
    // dead against +0.9 to +1.3 grades rising out of an otherwise flat tread.
    // So the LAST word belongs to a slope-limited reconstruction, not to a
    // deviation clamp. Alternating forward/backward sweeps lower a too-high
    // point and raise a too-low one until every segment is rideable; it is a
    // local repair, so it does not saturate the way a global grade cap did.
    var ds = new Float32Array(n);
    for (i = 1; i < n; i++) {
      var ddx = pts[i].x - pts[i-1].x, ddz = pts[i].z - pts[i-1].z;
      ds[i] = Math.max(Math.sqrt(ddx*ddx + ddz*ddz), 0.5);
    }
    function limitGrade(maxUp, maxDown, passes) {
      for (var q = 0; q < passes; q++) {
        var moved = 0, j;
        for (j = 1; j < n; j++) {
          var up = maxUp*ds[j], dn = maxDown*ds[j], d = sm[j] - sm[j-1];
          if (d > up) { sm[j] -= (d-up)*0.5; sm[j-1] += (d-up)*0.5; moved++; }
          else if (d < -dn) { sm[j] += (-dn-d)*0.5; sm[j-1] -= (-dn-d)*0.5; moved++; }
        }
        for (j = n-1; j >= 1; j--) {
          var up2 = maxUp*ds[j], dn2 = maxDown*ds[j], d2 = sm[j] - sm[j-1];
          if (d2 > up2) { sm[j] -= (d2-up2)*0.5; sm[j-1] += (d2-up2)*0.5; moved++; }
          else if (d2 < -dn2) { sm[j] += (-dn2-d2)*0.5; sm[j-1] -= (-dn2-d2)*0.5; moved++; }
        }
        if (!moved) break;
      }
    }
    // a trail may climb gently and descend hard, but never present a wall
    limitGrade(0.24, 0.62, 40);
    clampDev(MAX_CUT * 2.4, MAX_FILL * 2.4);
    limitGrade(0.26, 0.66, 24);
    // Trails are NOT forced back onto raw ground at their ends: that puts the
    // cliff the smoothing just removed right at the trailhead, the one place a
    // rider is guaranteed to meet it. The carve blends over a wide skirt, so
    // junctions still join cleanly.
    for (i = 0; i < n; i++) { pts[i].y = sm[i]; pts[i].cut = sm[i] - raw[i]; }
    return pts;
  }

  /* --- spatial hash + carve --------------------------------------------------- */
  function Hash(cell) { this.cell = cell; this.map = new Map(); }
  Hash.prototype.key = function (cx, cz) { return cx * 65536 + cz; };
  Hash.prototype.insert = function (seg) {
    var c = this.cell;
    var x0 = Math.floor(Math.min(seg.x1,seg.x2)/c)-1, x1 = Math.floor(Math.max(seg.x1,seg.x2)/c)+1;
    var z0 = Math.floor(Math.min(seg.z1,seg.z2)/c)-1, z1 = Math.floor(Math.max(seg.z1,seg.z2)/c)+1;
    for (var cx = x0; cx <= x1; cx++) for (var cz = z0; cz <= z1; cz++) {
      var k = this.key(cx, cz), arr = this.map.get(k);
      if (!arr) { arr = []; this.map.set(k, arr); }
      arr.push(seg);
    }
  };

  Tr.buildHash = function () {
    var h = new Hash(Tr.CELL), total = 0;
    for (var e = 0; e < Tr.edges.length; e++) {
      var edge = Tr.edges[e], pts = edge.pts;
      for (var i = 0; i < pts.length - 1; i++) {
        var A = pts[i], B = pts[i+1];
        var dx = B.x-A.x, dz = B.z-A.z, L = Math.sqrt(dx*dx+dz*dz);
        if (L < 0.01) continue;
        total += L;
        h.insert({ x1:A.x, z1:A.z, y1:A.y, x2:B.x, z2:B.z, y2:B.y,
                   dx:dx, dz:dz, len2:dx*dx+dz*dz, w:edge.width, edge:edge,
                   cut: Math.max(Math.abs(A.cut||0), Math.abs(B.cut||0)) });
      }
    }
    Tr.hash = h; Tr.totalLength = total;
  };

  var _probe = { w:0, h:0, edge:null, d:1e9, cut:0 };
  // The tread height is a distance-WEIGHTED BLEND of every segment in range,
  // not the nearest one. Taking the nearest made the carve winner-take-all, so
  // where two trails crossed at different elevations the height jumped straight
  // from one trail's profile to the other's along the line equidistant between
  // them -- a sheer step across the tread, a hill standing inside the hill.
  // Blending merges a crossing into a saddle both trails ride through.
  Tr.probe = function (x, z) {
    _probe.edge = null; _probe.d = 1e9; _probe.cut = 0; _probe.w = 0; _probe.h = 0;
    var hs = Tr.hash; if (!hs) return _probe;
    var c = hs.cell, cx = Math.floor(x/c), cz = Math.floor(z/c);
    var bD = 1e9, bH = 0, bE = null, bW = 0, bC = 0, sumW = 0, sumH = 0;
    for (var ox = -1; ox <= 1; ox++) for (var oz = -1; oz <= 1; oz++) {
      var arr = hs.map.get(hs.key(cx+ox, cz+oz)); if (!arr) continue;
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i];
        var t = ((x-s.x1)*s.dx + (z-s.z1)*s.dz) / s.len2;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        var px = s.x1+s.dx*t, pz = s.z1+s.dz*t;
        var d = Math.hypot(x-px, z-pz);
        var sh = s.y1 + (s.y2-s.y1)*t;
        if (d < bD) { bD = d; bH = sh; bE = s.edge; bW = s.w; bC = s.cut||0; }
        // influence radius: this segment's own tread plus its blend skirt
        var ri = s.w*2.6 + (s.cut||0)*1.35;
        if (d < ri) { var wi = 1 - d/ri; wi *= wi; sumW += wi; sumH += sh*wi; }
      }
    }
    _probe.d = bD; _probe.edge = bE; _probe.w = bW; _probe.cut = bC;
    _probe.h = sumW > 1e-6 ? sumH/sumW : bH;
    return _probe;
  };

  var carveNoise = null;
  function carveFn(x, z, h) {
    if (!Tr.hash) return h;
    var p = Tr.probe(x, z);
    if (!p.edge) return h;
    var half = p.w * 0.5, blend = p.w * 2.1 + p.cut * 1.35;
    if (p.d > half + blend) return h;
    var t = 1 - smoothstep(half, half + blend, p.d), target = p.h;
    // a berm lip just outside the tread, so corners hold you in
    if (p.d > half * 0.75 && p.d < half + blend * 0.55) {
      target += smoothstep(half*0.75, half, p.d) *
                (1 - smoothstep(half, half + blend*0.55, p.d)) * 1.15;
    }
    if (p.d < half) target -= 0.28 * (1 - (p.d/half)*(p.d/half));   // crowned tread
    var out = lerp(h, target, t * t * (3 - 2*t));
    if (p.d < half + blend * 0.5) {
      if (!carveNoise) carveNoise = new MTB.Noise(T.seed + 5150);
      out += (carveNoise.noise2(x*0.42, z*0.42)*0.10 + carveNoise.noise2(x*0.09, z*0.09)*0.22) * t;
    }
    return out;
  }
  Tr.carveFn = carveFn;

  /* --- network construction ---------------------------------------------------- */
  var KINDS = [
    { kind:'downhill', width:6.0, label:'Downhill' },
    { kind:'singletrack', width:3.1, label:'Singletrack' },
    { kind:'fireroad', width:9.5, label:'Fire Road' },
    { kind:'forest', width:4.2, label:'Forest Trail' },
    { kind:'ridge', width:4.0, label:'Ridge Line' },
    { kind:'canyon', width:5.0, label:'Canyon Trail' },
    { kind:'hidden', width:2.4, label:'Hidden Trail' }
  ];
  MTB.TRAIL_KINDS = KINDS;

  var NA = ['Ravenstone','Coldwater','Bitterroot','Ironvein','Larkspur','Windless','Sablecrest',
    'Highwire','Thornfield','Quartzfall','Emberline','Greywolf','Silverpine','Hollowbrook',
    'Dustdevil','Frostgate','Redscree','Mossback','Talonridge','Sunbleach','Glacierhorn',
    'Pinewhistle','Blackspur','Cinderpath','Wolverine','Aspenlight','Stormcut','Driftwood'];
  var NB2 = ['Descent','Chute','Traverse','Run','Line','Spine','Drop','Switchbacks','Gully','Cut',
    'Scramble','Plunge','Reach','Shortcut','Passage','Fall','Corridor','Skyline'];

  // A summit is a spire of loose rock — you do not bench a trailhead on the apex.
  function snapToBuildable(x, z, maxR, preferHigh) {
    var best = null, bestScore = -1e9;
    for (var ring = 0; ring <= 6; ring++) {
      var r = ring * (maxR / 6), steps = ring === 0 ? 1 : 8 + ring * 4;
      for (var a = 0; a < steps; a++) {
        var ang = (a/steps)*Math.PI*2 + ring*0.4;
        var px = x + Math.cos(ang)*r, pz = z + Math.sin(ang)*r;
        if (Math.max(Math.abs(px), Math.abs(pz)) > T.HALF*0.82) continue;
        var h = T.gridSample(px, pz); if (h < T.SEA + 4) continue;
        var rough = T.roughAt(px, pz);
        var score = -rough*100 + (preferHigh ? h*0.12 : -h*0.12) - r*0.05;
        if (rough < 0.45) score += 260;
        if (score > bestScore) { bestScore = score; best = { x:px, z:pz, h:h }; }
      }
    }
    return best || { x:x, z:z, h:T.gridSample(x,z) };
  }

  Tr.buildNodes = function (rng) {
    var nodes = [];
    T.findPeaks(16, 1250).forEach(function (p) {
      var s = snapToBuildable(p.x, p.z, 320, true);
      nodes.push({ x:s.x, z:s.z, h:s.h, kind:'peak', id:nodes.length,
                   summitX:p.x, summitZ:p.z, summitH:p.h });
    });
    T.findBasins(11, 1500).forEach(function (b) {
      var s = snapToBuildable(b.x, b.z, 200, false);
      nodes.push({ x:s.x, z:s.z, h:s.h, kind:'basin', id:nodes.length });
    });
    var tries = 0, want = 34, base = nodes.length;
    while (nodes.length < base + want && tries++ < 4000) {
      var x = (rng()*2-1)*T.HALF*0.74, z = (rng()*2-1)*T.HALF*0.74;
      var h = T.gridSample(x, z);
      if (h < T.SEA+40 || h > 2450) continue;
      if (T.roughAt(x, z) > 0.62) continue;
      var ok = true;
      for (var i = 0; i < nodes.length; i++)
        if (Math.hypot(nodes[i].x-x, nodes[i].z-z) < 880) { ok = false; break; }
      if (ok) nodes.push({ x:x, z:z, h:h, kind:'junction', id:nodes.length });
    }
    Tr.nodes = nodes;
    return nodes;
  };

  Tr.planEdges = function (rng) {
    var nodes = Tr.nodes, plan = [], seen = {};
    for (var i = 0; i < nodes.length; i++) {
      var cand = [];
      for (var j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        var d = Math.hypot(nodes[j].x-nodes[i].x, nodes[j].z-nodes[i].z);
        if (d <= 3400) cand.push({ j:j, d:d });
      }
      cand.sort(function (a, b) { return a.d - b.d; });
      var links = nodes[i].kind === 'basin' ? 2 : 3;
      for (var k = 0; k < Math.min(links, cand.length); k++) {
        var a = Math.min(i, cand[k].j), b = Math.max(i, cand[k].j), key = a+':'+b;
        if (!seen[key]) { seen[key] = 1; plan.push({ a:a, b:b }); }
      }
    }
    for (var n = 0; n < 8; n++) {
      var ai = (rng()*nodes.length)|0, bi = (rng()*nodes.length)|0;
      if (ai === bi) continue;
      var k2 = Math.min(ai,bi)+':'+Math.max(ai,bi);
      if (!seen[k2]) { seen[k2] = 1; plan.push({ a:Math.min(ai,bi), b:Math.max(ai,bi) }); }
    }
    Tr._plan = plan;
    return plan;
  };

  Tr.buildEdge = function (index, rng) {
    var plan = Tr._plan[index]; if (!plan) return false;
    var A = Tr.nodes[plan.a], B = Tr.nodes[plan.b];
    var path = route(A.x, A.z, B.x, B.z, (index * 977) & 0xffff);
    if (!path) return false;
    var pts = resample(path, 7.5);
    if (pts.length < 8) return false;
    buildProfile(pts);

    var len = 0, i;
    for (i = 0; i < pts.length - 1; i++) len += Math.hypot(pts[i+1].x-pts[i].x, pts[i+1].z-pts[i].z);
    var hi = -1e9, lo = 1e9;
    for (i = 0; i < pts.length; i++) { if (pts[i].y > hi) hi = pts[i].y; if (pts[i].y < lo) lo = pts[i].y; }
    var drop = hi - lo, grade = drop / Math.max(len, 1);
    var mid = pts[(pts.length/2)|0], kind;
    if (grade > 0.20) kind = 'downhill';
    else if (mid.y > 1900) kind = 'ridge';
    else if (mid.y < 420) kind = 'canyon';
    else if (T.biomeAt(mid.x, mid.z, mid.y) === T.BIOME.PINE) kind = 'forest';
    else kind = 'singletrack';
    if (rng() < 0.13) kind = 'fireroad';
    if (rng() < 0.09) kind = 'hidden';
    var meta = KINDS.filter(function (m) { return m.kind === kind; })[0];

    Tr.edges.push({
      a: plan.a, b: plan.b, pts: pts, len: len, drop: drop, kind: kind,
      width: meta.width * (0.85 + rng() * 0.4),
      name: NA[(rng()*NA.length)|0] + ' ' + NB2[(rng()*NB2.length)|0],
      label: meta.label, hidden: kind === 'hidden',
      difficulty: kind === 'fireroad' ? 'Green'
                : (grade > 0.24 || kind === 'hidden') ? 'Double Black'
                : grade > 0.16 ? 'Black' : grade > 0.09 ? 'Blue' : 'Green'
    });
    return true;
  };

  Tr.finalize = function () { Tr.buildHash(); };

  Tr.surfaceAt = function (x, z) {
    var p = Tr.probe(x, z);
    if (p.edge && p.d < p.w * 0.65) return { onTrail:1, grip:1.0, roll:1.0, edge:p.edge };
    if (p.edge && p.d < p.w * 1.2) {
      var t = 1 - (p.d - p.w*0.65) / (p.w*0.55);
      return { onTrail:t, grip:0.86+0.14*t, roll:0.88+0.12*t, edge:p.edge };
    }
    return { onTrail:0, grip:0.84, roll:0.82, edge:null };
  };

  Tr.nearestTrailPoint = function (x, z, maxR) {
    var best = null, bestD = maxR || 400;
    for (var e = 0; e < Tr.edges.length; e++) {
      var pts = Tr.edges[e].pts;
      for (var i = 0; i < pts.length; i += 4) {
        var d = Math.hypot(pts[i].x-x, pts[i].z-z);
        if (d < bestD) { bestD = d; best = { p:pts[i], edge:Tr.edges[e], i:i }; }
      }
    }
    return best;
  };
})(window);
