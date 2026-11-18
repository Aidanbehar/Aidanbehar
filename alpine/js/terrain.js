/* Alpine Descent — terrain.js
   The mountain region as one analytic height field.

   There is exactly ONE height function and everything uses it: physics, the
   mesher at every level of detail, the map, object placement. An earlier build
   varied the octave count with the chunk's LOD, which meant a near chunk and
   the coarse one beside it evaluated different heights along their shared edge
   and every LOD boundary showed up as a step. Detail is a property of a place,
   never of how closely you happen to be looking at it. */
(function (root) {
  'use strict';
  var MTB = root.MTB;
  var M = MTB.math, clamp = M.clamp, lerp = M.lerp, smoothstep = M.smoothstep;

  var T = MTB.Terrain = {
    WORLD: 16384, HALF: 8192, SEA: 96,
    seed: 1337, lakes: [], carve: null, ready: false
  };

  var N1, N2, N3, N4;

  // Gradient noise is zero at every lattice point. Sampling each layer through
  // its own rotated domain stops those lattices lining up into a visible grid.
  var ROT = [];
  (function () {
    var ang = [0.37, 1.13, 2.29, 0.81, 1.91, 2.74, 0.53];
    for (var i = 0; i < ang.length; i++) ROT.push({ c: Math.cos(ang[i]), s: Math.sin(ang[i]) });
  })();
  function rx(i, x, z) { return x * ROT[i].c - z * ROT[i].s; }
  function rz(i, x, z) { return x * ROT[i].s + z * ROT[i].c; }

  T.init = function (seed) {
    T.seed = seed >>> 0;
    N1 = new MTB.Noise(seed);
    N2 = new MTB.Noise(seed + 7717);
    N3 = new MTB.Noise(seed + 31337);
    N4 = new MTB.Noise(seed + 90211);
    T.lakes = [];
    T.ready = true;
  };

  // Where mountain ranges exist at all: two crossing belts, so the region has
  // elongated cordilleras rather than an even field of bumps.
  function rangeMask(x, z) {
    var wx = x + N3.noise2(x * 0.00007, z * 0.00007) * 2600;
    var wz = z + N3.noise2(x * 0.00007 + 51.3, z * 0.00007 - 17.1) * 2600;
    var m = smoothstep(-0.22, 0.42, N1.fbm(wx * 0.000062, wz * 0.000062, 4));
    var ax = (x * 0.866 - z * 0.5), az = (x * 0.5 + z * 0.866);
    var m2 = smoothstep(0.02, 0.55, N1.fbm(ax * 0.000051 + 300, az * 0.000051 - 120, 3));
    return clamp(m * 0.78 + m2 * 0.52, 0, 1);
  }

  /* --- the height field ------------------------------------------------- */
  T.baseHeight = function (x, z) {
    var mask = rangeMask(x, z);
    var h = 300 + N1.fbm(x * 0.000045, z * 0.000045, 4) * 430;

    // main ranges: ridged multifractal, domain warped and rotated
    var wx = rx(0, x, z) + N3.noise2(x * 0.00022, z * 0.00022) * 520;
    var wz = rz(0, x, z) + N3.noise2(x * 0.00022 + 9.7, z * 0.00022 + 4.1) * 520;
    h += Math.pow(N2.ridged(wx * 0.00016, wz * 0.00016, 7, 2.02, 0.40), 1.12) * 2450 * mask;

    // secondary ranges and foothills
    var fx = rx(1, x, z), fz = rz(1, x, z);
    h += Math.pow(N2.ridged(fx * 0.00042 + 88, fz * 0.00042 - 40, 5, 2.02, 0.38), 1.45) *
         (250 + 400 * mask);

    // valley network: inverted ridges carve the drainages
    var vx = x + N3.noise2(x * 0.00013 + 200, z * 0.00013) * 700;
    var vz = z + N3.noise2(x * 0.00013, z * 0.00013 + 200) * 700;
    var vr = N3.ridged(vx * 0.000098, vz * 0.000098, 4);
    h -= smoothstep(0.30, 0.86, vr) * (330 + 420 * mask);
    h -= smoothstep(0.62, 0.95, vr) * smoothstep(0.25, 0.6, mask) * 260;

    var alt01 = clamp((h - 300) / 2400, 0, 1);
    var flatten = 1 - alt01 * 0.15;

    // medium: ridges, ravines, benches
    var mx = rx(2, x, z), mz = rz(2, x, z);
    h += N4.fbm(mx * 0.0013, mz * 0.0013, 4) * (52 + 58 * mask) * flatten;

    var ax2 = rx(3, x, z) + N4.noise2(x * 0.0009, z * 0.0009) * 260;
    var az2 = rz(3, x, z) + N4.noise2(x * 0.0009 + 71, z * 0.0009 - 33) * 260;
    h += (N2.ridged(ax2 * 0.0026 + 17, az2 * 0.0026 + 31, 3, 2.02, 0.40) - 0.5) *
         34 * (0.35 + 0.65 * mask);

    h += N4.fbm(rx(4, x, z) * 0.0042 + 210, rz(4, x, z) * 0.0042 - 130, 3) * 21 * flatten;

    // benched shelves at altitude, with smooth risers (rounding outright would
    // put a literal vertical step in the height field)
    var terr = N4.noise2(x * 0.00055 - 400, z * 0.00055 + 260);
    var tAmt = smoothstep(0.15, 0.55, terr) * smoothstep(900, 1500, h) *
               (1 - smoothstep(2100, 2500, h));
    if (tAmt > 0.001) {
      var step = 46, f = h / step, fi = Math.floor(f);
      h = lerp(h, (fi + smoothstep(0.18, 0.82, f - fi)) * step, tAmt * 0.5);
    }

    // MTB scale: what you feel through the bars
    h += N4.fbm(rx(5, x, z) * 0.014, rz(5, x, z) * 0.014, 3) * 2.6;
    h += N4.fbm(rx(6, x, z) * 0.045 + 60, rz(6, x, z) * 0.045 - 60, 3) * 1.15;
    h += N4.billow(rx(0, x, z) * 0.105, rz(0, x, z) * 0.105, 2) * 0.55;
    var rg = N4.noise2(x * 0.0038 + 700, z * 0.0038 - 700);
    if (rg > 0.35) h += (rg - 0.35) * N4.billow(x * 0.105, z * 0.105, 2) * 7.0 * alt01;

    // lake basins
    for (var i = 0; i < T.lakes.length; i++) {
      var L = T.lakes[i];
      var dx = x - L.x, dz = z - L.z, d = Math.sqrt(dx * dx + dz * dz);
      if (d < L.r * 1.9) {
        var t2 = 1 - smoothstep(L.r * 0.85, L.r * 1.9, d);
        h = lerp(h, Math.min(h, L.level - 26 * (1 - clamp(d / (L.r * 0.9), 0, 1))), t2);
      }
    }

    // the region is ringed by impassable giants rather than an edge you fall off
    var edge = Math.max(Math.abs(x), Math.abs(z)) / T.HALF;
    if (edge > 0.80) {
      var e = smoothstep(0.80, 1.0, edge);
      h = lerp(h, h + 1500, e * e);
    }
    return h;
  };

  T.height = function (x, z) {
    var h = T.baseHeight(x, z);
    return T.carve ? T.carve(x, z, h) : h;
  };

  var _n = { x: 0, y: 1, z: 0 };
  T.normal = function (x, z, eps, out) {
    eps = eps || 1.5;
    var hl = T.height(x - eps, z), hr = T.height(x + eps, z);
    var hd = T.height(x, z - eps), hu = T.height(x, z + eps);
    var nx = hl - hr, ny = 2 * eps, nz = hd - hu;
    var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    out = out || _n;
    out.x = nx / len; out.y = ny / len; out.z = nz / len;
    return out;
  };
  T.slopeAt = function (x, z) {
    var n = T.normal(x, z, 2.0, {});
    return Math.acos(clamp(n.y, -1, 1));
  };

  /* --- biomes and colour -------------------------------------------------- */
  var B = T.BIOME = { SNOW: 0, ALPINE: 1, PINE: 2, DRY: 3, DESERT: 4, VALLEY: 5, WATER: 6 };
  T.BIOME_NAMES = ['Snowfield', 'Alpine', 'Pine Forest', 'Dry Mountain',
                   'High Desert', 'Valley Floor', 'Water'];

  T.moisture = function (x, z) {
    return N4.fbm(x * 0.000068 + 1200, z * 0.000068 - 800, 3) * 0.5 + 0.5;
  };
  T.snowLine = function (x, z) {
    return 2180 + N4.noise2(x * 0.0004, z * 0.0004) * 190;
  };

  T.biomeAt = function (x, z, h) {
    if (h === undefined) h = T.height(x, z);
    if (h < T.SEA - 0.4) return B.WATER;
    var moist = T.moisture(x, z);
    if (h > T.snowLine(x, z)) return B.SNOW;
    if (h > 1720) return B.ALPINE;
    if (moist < 0.40) return h > 620 ? B.DESERT : B.DRY;
    if (h > 780) return B.PINE;
    if (h > 300) return moist > 0.56 ? B.PINE : B.DRY;
    return B.VALLEY;
  };

  var C = {
    snow: [0.82, 0.86, 0.94], rock: [0.42, 0.40, 0.38], rock2: [0.54, 0.50, 0.46],
    scree: [0.50, 0.47, 0.43], alpine: [0.36, 0.42, 0.30],
    pine: [0.20, 0.32, 0.18], pine2: [0.26, 0.38, 0.21],
    dry: [0.62, 0.56, 0.32], dry2: [0.70, 0.63, 0.38],
    desert: [0.66, 0.50, 0.34], desert2: [0.75, 0.60, 0.42],
    valley: [0.32, 0.44, 0.24], dirt: [0.45, 0.34, 0.23], sand: [0.78, 0.72, 0.55]
  };
  T.PALETTE = C;
  function mix3(a, b, t, o) {
    o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t;
    o[2] = a[2] + (b[2] - a[2]) * t; return o;
  }
  var _c = [0, 0, 0];

  // slope01 must be measured at a fixed world scale by the caller, never at the
  // chunk's vertex spacing, or LOD boundaries show as panels of different colour.
  T.colorAt = function (x, z, h, slope01, onTrail, out) {
    out = out || _c;
    var moist = T.moisture(x, z);
    var v = N4.noise2(x * 0.0032, z * 0.0032) * 0.55 +
            N4.noise2(x * 0.019, z * 0.019) * 0.30 +
            N4.noise2(x * 0.085, z * 0.085) * 0.15;
    var snowLine = T.snowLine(x, z);

    if (h < T.SEA + 2.5) {
      mix3(C.sand, C.valley, smoothstep(T.SEA - 1, T.SEA + 3, h), out);
    } else if (h > snowLine) {
      mix3(C.scree, C.snow, smoothstep(snowLine, snowLine + 160, h), out);
      // wind-scoured ribs, so a high peak is not a smooth white dome
      var scour = N4.noise2(x * 0.0022 + 900, z * 0.0022 - 900) * 0.6 +
                  N4.noise2(x * 0.0075 - 300, z * 0.0075 + 300) * 0.4;
      var bare = clamp((scour + 0.18) * 1.5, 0, 1) * smoothstep(0.10, 0.42, slope01) +
                 clamp((scour - 0.32) * 2.0, 0, 0.55);
      mix3(out, C.rock, clamp(bare, 0, 0.88), out);
      mix3(out, C.rock2, clamp(slope01 * 1.35 - 0.25, 0, 0.8), out);
    } else if (h > 1700) {
      mix3(C.alpine, C.scree, smoothstep(1700, 2100, h), out);
      mix3(out, C.rock, clamp(slope01 * 1.4 - 0.15, 0, 0.9), out);
    } else if (moist < 0.40 && h > 600) {
      mix3(C.desert, C.desert2, v * 0.5 + 0.5, out);
      mix3(out, C.rock2, clamp(slope01 * 1.5 - 0.2, 0, 0.85), out);
    } else if (h > 760 && moist >= 0.40) {
      mix3(C.pine, C.pine2, v * 0.5 + 0.5, out);
      mix3(out, C.rock, clamp(slope01 * 1.6 - 0.35, 0, 0.9), out);
    } else if (moist < 0.52) {
      mix3(C.dry, C.dry2, v * 0.5 + 0.5, out);
      mix3(out, C.rock2, clamp(slope01 * 1.5 - 0.3, 0, 0.8), out);
    } else {
      mix3(C.valley, C.pine, smoothstep(300, 800, h), out);
      mix3(out, C.rock, clamp(slope01 * 1.6 - 0.35, 0, 0.85), out);
    }

    var tint = 1 + v * 0.26, hue = N4.noise2(x * 0.0011 + 500, z * 0.0011 - 500) * 0.05;
    out[0] = clamp(out[0] * tint * (1 + hue), 0, 1);
    out[1] = clamp(out[1] * tint, 0, 1);
    out[2] = clamp(out[2] * tint * (1 - hue), 0, 1);
    if (onTrail > 0.01) mix3(out, C.dirt, clamp(onTrail, 0, 1) * 0.88, out);
    return out;
  };

  /* --- coarse grids ------------------------------------------------------- */
  T.GRID_N = 320;
  T.GRID_STEP = T.WORLD / T.GRID_N;
  T.grid = null;

  T.gridIndexToWorld = function (gx, gz) {
    return { x: -T.HALF + (gx + 0.5) * T.GRID_STEP, z: -T.HALF + (gz + 0.5) * T.GRID_STEP };
  };
  T.worldToGrid = function (x, z) {
    return {
      gx: clamp(Math.floor((x + T.HALF) / T.GRID_STEP), 0, T.GRID_N - 1),
      gz: clamp(Math.floor((z + T.HALF) / T.GRID_STEP), 0, T.GRID_N - 1)
    };
  };
  T.buildGridStep = function (rows) {
    var n = T.GRID_N;
    if (!T.grid) { T.grid = new Float32Array(n * n); T._row = 0; }
    var end = Math.min(n, T._row + rows);
    for (var gz = T._row; gz < end; gz++) {
      var wz = -T.HALF + (gz + 0.5) * T.GRID_STEP;
      for (var gx = 0; gx < n; gx++) {
        T.grid[gz * n + gx] = T.baseHeight(-T.HALF + (gx + 0.5) * T.GRID_STEP, wz);
      }
    }
    T._row = end;
    return end / n;
  };
  T.gridHeight = function (gx, gz) {
    var n = T.GRID_N;
    gx = gx < 0 ? 0 : (gx >= n ? n - 1 : gx);
    gz = gz < 0 ? 0 : (gz >= n ? n - 1 : gz);
    return T.grid[gz * n + gx];
  };
  T.gridSample = function (x, z) {
    var fx = (x + T.HALF) / T.GRID_STEP - 0.5, fz = (z + T.HALF) / T.GRID_STEP - 0.5;
    var x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
    return lerp(lerp(T.gridHeight(x0, z0), T.gridHeight(x0 + 1, z0), tx),
                lerp(T.gridHeight(x0, z0 + 1), T.gridHeight(x0 + 1, z0 + 1), tx), tz);
  };

  // Roughness: the coarse grid cannot see a 30 m cliff band inside one cell, so
  // this probes at MTB scale and records the steepest local gradient. The trail
  // router treats high values as expensive, and terrain colouring reads its
  // slope from here so colour never depends on the chunk's vertex spacing.
  T.ROUGH_N = 192;
  T.ROUGH_STEP = T.WORLD / 192;
  T.rough = null;
  T.buildRoughStep = function (rows) {
    var n = T.ROUGH_N, step = T.ROUGH_STEP, EPS = 12;
    if (!T.rough) { T.rough = new Float32Array(n * n); T._rrow = 0; }
    var end = Math.min(n, T._rrow + rows);
    for (var gz = T._rrow; gz < end; gz++) {
      var wz = -T.HALF + (gz + 0.5) * step;
      for (var gx = 0; gx < n; gx++) {
        var wx = -T.HALF + (gx + 0.5) * step;
        var c = T.baseHeight(wx, wz);
        T.rough[gz * n + gx] = Math.max(
          Math.abs(T.baseHeight(wx + EPS, wz) - c) / EPS,
          Math.abs(T.baseHeight(wx, wz + EPS) - c) / EPS);
      }
    }
    T._rrow = end;
    return end / n;
  };
  T.roughAt = function (x, z) {
    if (!T.rough) return 0;
    var n = T.ROUGH_N;
    var fx = (x + T.HALF) / T.ROUGH_STEP - 0.5, fz = (z + T.HALF) / T.ROUGH_STEP - 0.5;
    var x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
    function g(a, b) {
      a = a < 0 ? 0 : (a >= n ? n - 1 : a); b = b < 0 ? 0 : (b >= n ? n - 1 : b);
      return T.rough[b * n + a];
    }
    return lerp(lerp(g(x0, z0), g(x0 + 1, z0), tx), lerp(g(x0, z0 + 1), g(x0 + 1, z0 + 1), tx), tz);
  };

  /* --- features in the landscape ------------------------------------------ */
  T.placeLakes = function (count) {
    var n = T.GRID_N, best = [];
    for (var gz = 12; gz < n - 12; gz += 3) {
      for (var gx = 12; gx < n - 12; gx += 3) {
        var h = T.gridHeight(gx, gz);
        if (h < 180 || h > 2000) continue;
        var ring = 0;
        for (var a = 0; a < 8; a++) {
          var ang = a / 8 * Math.PI * 2;
          ring += T.gridHeight(gx + Math.round(Math.cos(ang) * 5),
                               gz + Math.round(Math.sin(ang) * 5)) - h;
        }
        if (ring / 8 > 30) best.push({ gx: gx, gz: gz, h: h, s: ring / 8 });
      }
    }
    best.sort(function (a, b) { return b.s - a.s; });
    var chosen = [];
    for (var i = 0; i < best.length && chosen.length < count; i++) {
      var w = T.gridIndexToWorld(best[i].gx, best[i].gz), ok = true;
      for (var j = 0; j < chosen.length; j++) {
        if (Math.hypot(chosen[j].x - w.x, chosen[j].z - w.z) < 1900) { ok = false; break; }
      }
      if (ok) chosen.push({ x: w.x, z: w.z, r: 150 + Math.min(260, best[i].s * 3), 
                            level: best[i].h + 6, name: null });
    }
    T.lakes = chosen;
    return chosen;
  };

  T.inLake = function (x, z) {
    for (var i = 0; i < T.lakes.length; i++) {
      var L = T.lakes[i];
      if (Math.hypot(x - L.x, z - L.z) < L.r * 1.1) return L;
    }
    return null;
  };

  function findExtrema(count, minSep, wantMax, loH, hiH, radius) {
    var n = T.GRID_N, out = [];
    for (var gz = 6; gz < n - 6; gz++) {
      for (var gx = 6; gx < n - 6; gx++) {
        var h = T.gridHeight(gx, gz);
        if (h < loH || h > hiH) continue;
        var ok = true;
        for (var oz = -radius; oz <= radius && ok; oz++) {
          for (var ox = -radius; ox <= radius; ox++) {
            if (!ox && !oz) continue;
            var o = T.gridHeight(gx + ox, gz + oz);
            if (wantMax ? o > h : o < h) { ok = false; break; }
          }
        }
        if (!ok) continue;
        var w = T.gridIndexToWorld(gx, gz);
        if (Math.max(Math.abs(w.x), Math.abs(w.z)) > T.HALF * 0.78) continue;
        out.push({ x: w.x, z: w.z, h: h });
      }
    }
    out.sort(function (a, b) { return wantMax ? b.h - a.h : a.h - b.h; });
    var res = [];
    for (var i = 0; i < out.length && res.length < count; i++) {
      var good = true;
      for (var j = 0; j < res.length; j++) {
        if (Math.hypot(res[j].x - out[i].x, res[j].z - out[i].z) < minSep) { good = false; break; }
      }
      if (good) res.push(out[i]);
    }
    return res;
  }
  T.findPeaks = function (c, sep) { return findExtrema(c, sep || 900, true, 1500, 1e9, 2); };
  T.findBasins = function (c, sep) { return findExtrema(c, sep || 1100, false, -1e9, 900, 3); };
})(window);
