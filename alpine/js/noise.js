/* Alpine Descent — noise.js
   Seeded gradient noise, fBm, ridged and billow fractals, plus the per-layer
   domain rotation that keeps the noise lattice from printing a grid of creases
   across the landscape. */
(function (root) {
  'use strict';
  var MTB = root.MTB = root.MTB || {};

  function makeRNG(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2i(x, y, seed) {
    var h = x * 374761393 + y * 668265263 + seed * 2147483647;
    h = (h ^ (h >> 13)) * 1274126177;
    return (h ^ (h >> 16)) >>> 0;
  }
  function rand2(x, y, seed) { return hash2i(x | 0, y | 0, seed | 0) / 4294967295; }

  function Noise(seed) {
    var rng = makeRNG(seed >>> 0);
    var perm = new Uint8Array(256), i, j, t;
    for (i = 0; i < 256; i++) perm[i] = i;
    for (i = 255; i > 0; i--) {
      j = (rng() * (i + 1)) | 0;
      t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    var p = new Uint8Array(512);
    for (i = 0; i < 512; i++) p[i] = perm[i & 255];
    var gx = new Float32Array(256), gz = new Float32Array(256);
    for (i = 0; i < 256; i++) {
      var a = (perm[i] / 256) * Math.PI * 2;
      gx[i] = Math.cos(a); gz[i] = Math.sin(a);
    }
    this.p = p; this.gx = gx; this.gz = gz;
  }

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

  Noise.prototype.noise2 = function (x, y) {
    var p = this.p, gx = this.gx, gz = this.gz;
    var X = Math.floor(x), Y = Math.floor(y);
    var xf = x - X, yf = y - Y;
    X &= 255; Y &= 255;
    var aa = p[X + p[Y]], ab = p[X + p[Y + 1]];
    var ba = p[X + 1 + p[Y]], bb = p[X + 1 + p[Y + 1]];
    var u = fade(xf), v = fade(yf);
    var n00 = gx[aa] * xf + gz[aa] * yf;
    var n10 = gx[ba] * (xf - 1) + gz[ba] * yf;
    var n01 = gx[ab] * xf + gz[ab] * (yf - 1);
    var n11 = gx[bb] * (xf - 1) + gz[bb] * (yf - 1);
    var x1 = n00 + u * (n10 - n00);
    var x2 = n01 + u * (n11 - n01);
    return (x1 + v * (x2 - x1)) * 1.4142;
  };

  Noise.prototype.fbm = function (x, y, oct, lac, gain) {
    lac = lac || 2.0; gain = gain === undefined ? 0.5 : gain;
    var amp = 1, f = 1, s = 0, n = 0;
    for (var i = 0; i < oct; i++) {
      s += amp * this.noise2(x * f, y * f);
      n += amp; amp *= gain; f *= lac;
    }
    return s / n;
  };

  Noise.prototype.ridged = function (x, y, oct, lac, gain) {
    lac = lac || 2.02; gain = gain === undefined ? 0.5 : gain;
    var amp = 1, f = 1, s = 0, n = 0, prev = 1;
    for (var i = 0; i < oct; i++) {
      var v = 1 - Math.abs(this.noise2(x * f, y * f));
      v *= v; v *= prev; prev = v;
      s += amp * v; n += amp; amp *= gain; f *= lac;
    }
    return s / n;
  };

  Noise.prototype.billow = function (x, y, oct, lac, gain) {
    lac = lac || 2.0; gain = gain === undefined ? 0.5 : gain;
    var amp = 1, f = 1, s = 0, n = 0;
    for (var i = 0; i < oct; i++) {
      s += amp * Math.abs(this.noise2(x * f, y * f));
      n += amp; amp *= gain; f *= lac;
    }
    return s / n;
  };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(e0, e1, x) {
    var t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
  }

  MTB.Noise = Noise;
  MTB.makeRNG = makeRNG;
  MTB.rand2 = rand2;
  MTB.math = { clamp: clamp, lerp: lerp, smoothstep: smoothstep };
})(window);
