/* Alpine Descent — chunks.js
   Quadtree LOD terrain streaming, and scatter that is deliberately NOT tied to it.

   Two rules here, both learned the hard way:

   1. A chunk is only replaced by its children once ALL of them exist. Removing a
      parent the moment the quadtree decides to subdivide, while the children sit
      behind a per-frame build budget, leaves a hole you see distant terrain
      through — which reads as a mountain inside a mountain. The planner below
      returns a complete cover or nothing, so the ground is never torn.

   2. Vegetation lives on a fixed world grid, not on terrain chunks. When scatter
      was generated per chunk and seeded from the chunk's own size and position,
      crossing a LOD boundary re-rolled every tree and rock in sight. A tree's
      position must depend on where it is, never on how closely you are looking. */
(function (root) {
  'use strict';
  var MTB = root.MTB, T = MTB.Terrain;
  var M = MTB.math, clamp = M.clamp;

  var GRID = 24;               // segments per chunk mesh
  var TOP_SIZE = T.WORLD / 2;  // four top-level cells cover the region
  var MAX_DEPTH = 6;           // 8192 -> 128 m leaves, ~5.3 m vertices
  var SCATTER_CELL = 256;

  /* --- small geometry helpers ------------------------------------------------ */
  function paint(geo, r, g, b) {
    var n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { col[i*3] = r; col[i*3+1] = g; col[i*3+2] = b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }
  function mergeGeos(list) {
    var total = 0, arrs = [], i, g;
    for (i = 0; i < list.length; i++) {
      g = list[i].index ? list[i].toNonIndexed() : list[i];
      if (!g.attributes.normal) g.computeVertexNormals();
      arrs.push(g); total += g.attributes.position.count;
    }
    var pos = new Float32Array(total*3), nor = new Float32Array(total*3), col = new Float32Array(total*3);
    var off = 0;
    for (i = 0; i < arrs.length; i++) {
      g = arrs[i];
      pos.set(g.attributes.position.array, off*3);
      nor.set(g.attributes.normal.array, off*3);
      if (g.attributes.color) col.set(g.attributes.color.array, off*3);
      else col.fill(1, off*3, off*3 + g.attributes.position.count*3);
      off += g.attributes.position.count;
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }
  MTB.mergeGeos = mergeGeos;
  MTB.paintGeo = paint;

  /* --- streamer -------------------------------------------------------------- */
  function Streamer(scene, opts) {
    this.scene = scene;
    this.group = new THREE.Group(); this.group.name = 'terrain';
    this.scatterGroup = new THREE.Group(); this.scatterGroup.name = 'scatter';
    scene.add(this.group); scene.add(this.scatterGroup);

    this.cache = new Map();        // terrain chunks
    this.shown = new Set();
    this.scatter = new Map();      // fixed-grid vegetation cells
    this.pending = [];
    this.frame = 0;

    this.opts = Object.assign({
      lodFactor: 2.6, budget: 4, vegDensity: 1.0, vegDistance: 760,
      shadows: true, maxCached: 500
    }, opts || {});

    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.matScatter = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.matTuft = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this._assets();
    this.stats = { chunks: 0, queued: 0, veg: 0 };
  }

  Streamer.prototype._assets = function () {
    var parts = [], i;
    var trunk = new THREE.CylinderGeometry(0.32, 0.48, 4.2, 5);
    trunk.translate(0, 2.1, 0); paint(trunk, 0.24, 0.17, 0.11); parts.push(trunk);
    var sh = [6.4, 5.0, 3.6], sr = [3.1, 2.35, 1.5], sy = [2.6, 6.0, 9.0];
    for (i = 0; i < 3; i++) {
      var c = new THREE.ConeGeometry(sr[i], sh[i], 7);
      c.translate(0, sh[i]*0.5 + sy[i], 0);
      paint(c, 0.10+i*0.02, 0.26+i*0.03, 0.12+i*0.01); parts.push(c);
    }
    this.geoPine = mergeGeos(parts);

    parts = [];
    var t2 = new THREE.CylinderGeometry(0.22, 0.34, 2.6, 5);
    t2.translate(0, 1.3, 0); paint(t2, 0.31, 0.23, 0.15); parts.push(t2);
    var blob = new THREE.IcosahedronGeometry(2.1, 0);
    blob.scale(1.15, 0.85, 1.15); blob.translate(0, 3.5, 0);
    paint(blob, 0.26, 0.38, 0.17); parts.push(blob);
    this.geoBush = mergeGeos(parts);

    var rock = new THREE.IcosahedronGeometry(1.0, 0);
    var p = rock.attributes.position;
    var jr = MTB.makeRNG(99);
    for (i = 0; i < p.count; i++) {
      p.setXYZ(i, p.getX(i)*(1+(jr()-0.5)*0.30), p.getY(i)*(1+(jr()-0.5)*0.30),
                  p.getZ(i)*(1+(jr()-0.5)*0.30));
    }
    rock.computeVertexNormals(); paint(rock, 0.46, 0.44, 0.41);
    this.geoRock = rock;

    var g1 = new THREE.PlaneGeometry(1.5, 1.1); g1.translate(0, 0.55, 0);
    var g2 = g1.clone(); g2.rotateY(Math.PI/2);
    this.geoTuft = paint(mergeGeos([g1, g2]), 0.40, 0.48, 0.24);
  };

  /* --- terrain chunk mesh ----------------------------------------------------- */
  var _col = [0, 0, 0];
  Streamer.prototype._build = function (key, ix, iz, size, depth) {
    var n = GRID, vpr = n + 1, verts = vpr * vpr;
    var skirtCount = vpr * 4, totalVerts = verts + skirtCount;
    var pos = new Float32Array(totalVerts*3), col = new Float32Array(totalVerts*3);
    var step = size / n;
    var cx = (ix + 0.5) * size, cz = (iz + 0.5) * size;
    var x0 = cx - size*0.5, z0 = cz - size*0.5;
    var heights = new Float32Array(verts);
    var i, j, idx, minY = 1e9, maxY = -1e9;

    // One height function, full detail, at every level. Vertex SPACING is the
    // only thing LOD changes, so neighbouring levels agree along their edge.
    for (j = 0; j <= n; j++) {
      var wz = z0 + j*step;
      for (i = 0; i <= n; i++) heights[j*vpr+i] = T.height(x0 + i*step, wz);
    }

    for (j = 0; j <= n; j++) {
      for (i = 0; i <= n; i++) {
        idx = j*vpr+i;
        var h = heights[idx];
        if (h < minY) minY = h; if (h > maxY) maxY = h;
        var wx = x0 + i*step, wz2 = z0 + j*step;
        pos[idx*3] = wx - cx; pos[idx*3+1] = h; pos[idx*3+2] = wz2 - cz;

        // slope from the fixed-scale roughness grid, never from vertex spacing
        var slope01 = clamp(T.roughAt(wx, wz2) / 1.15, 0, 1);
        var onTrail = 0;
        if (MTB.Trails && MTB.Trails.hash && size <= 512) {
          var pr = MTB.Trails.probe(wx, wz2);
          if (pr.edge) onTrail = 1 - M.smoothstep(pr.w*0.35, pr.w*0.7, pr.d);
        }
        T.colorAt(wx, wz2, h, slope01, onTrail, _col);
        col[idx*3] = _col[0]; col[idx*3+1] = _col[1]; col[idx*3+2] = _col[2];
      }
    }

    var triCount = n*n*2 + n*4*2;
    var index = (totalVerts > 65535) ? new Uint32Array(triCount*3) : new Uint16Array(triCount*3);
    var ii = 0;
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
      var a = j*vpr+i, b = a+1, c = a+vpr, d = c+1;
      index[ii++]=a; index[ii++]=c; index[ii++]=b;
      index[ii++]=b; index[ii++]=c; index[ii++]=d;
    }

    var drop = Math.min(14, Math.max(2.5, size*0.035));
    var skirtSrc = new Int32Array(skirtCount), sBase = verts;
    function addRow(get, count) {
      var start = sBase;
      for (var k = 0; k < count; k++) {
        var src = get(k);
        skirtSrc[sBase-verts] = src;
        pos[sBase*3] = pos[src*3];
        pos[sBase*3+1] = pos[src*3+1] - drop;
        pos[sBase*3+2] = pos[src*3+2];
        col[sBase*3] = col[src*3]; col[sBase*3+1] = col[src*3+1]; col[sBase*3+2] = col[src*3+2];
        sBase++;
      }
      return start;
    }
    var sTop = addRow(function (k) { return k; }, vpr);
    var sBot = addRow(function (k) { return n*vpr+k; }, vpr);
    var sLef = addRow(function (k) { return k*vpr; }, vpr);
    var sRig = addRow(function (k) { return k*vpr+n; }, vpr);
    function stitch(edge, s0, count, flip) {
      for (var k = 0; k < count-1; k++) {
        var e0 = edge(k), e1 = edge(k+1), a0 = s0+k, a1 = s0+k+1;
        if (flip) { index[ii++]=e0; index[ii++]=a0; index[ii++]=e1;
                    index[ii++]=e1; index[ii++]=a0; index[ii++]=a1; }
        else      { index[ii++]=e0; index[ii++]=e1; index[ii++]=a0;
                    index[ii++]=e1; index[ii++]=a1; index[ii++]=a0; }
      }
    }
    stitch(function (k) { return k; }, sTop, vpr, false);
    stitch(function (k) { return n*vpr+k; }, sBot, vpr, true);
    stitch(function (k) { return k*vpr; }, sLef, vpr, true);
    stitch(function (k) { return k*vpr+n; }, sRig, vpr, false);

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(index.subarray(0, ii), 1));
    geo.computeVertexNormals();
    // skirt vertices inherit the normal of the edge above them, so the curtain
    // shades exactly like the ground and never shows as a crease
    var nrm = geo.attributes.normal.array;
    for (var sv = 0; sv < skirtCount; sv++) {
      var dst = (verts+sv)*3, src2 = skirtSrc[sv]*3;
      nrm[dst]=nrm[src2]; nrm[dst+1]=nrm[src2+1]; nrm[dst+2]=nrm[src2+2];
    }
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, (minY+maxY)*0.5, 0),
      Math.sqrt(size*size*0.5 + Math.pow((maxY-minY)*0.5 + drop, 2)));

    var mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(cx, 0, cz);
    mesh.receiveShadow = this.opts.shadows && size <= 256;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    return { key: key, mesh: mesh, size: size, lastUsed: this.frame };
  };

  /* --- scatter on a fixed world grid ------------------------------------------ */
  var _m4 = null, _q = null, _v = null;
  Streamer.prototype._buildScatter = function (key, sx, sz) {
    if (!_m4) { _m4 = new THREE.Matrix4(); _q = new THREE.Quaternion(); _v = new THREE.Vector3(); }
    var S = SCATTER_CELL, x0 = sx*S, z0 = sz*S;
    // seeded only by the cell's place in the world
    var rng = MTB.makeRNG(((sx*73856093) ^ (sz*19349663) ^ 0x9e3779b9) >>> 0);
    var samples = Math.floor((S*S) / 210 * this.opts.vegDensity);
    samples = Math.min(samples, 620);

    var pine=[], bush=[], rocks=[], tufts=[];
    var pineC=[], bushC=[], rockC=[], tuftC=[];
    var up = new THREE.Vector3(0, 1, 0);

    for (var s = 0; s < samples; s++) {
      var wx = x0 + rng()*S, wz = z0 + rng()*S;
      var h = T.height(wx, wz);
      if (h < T.SEA + 1.0) continue;
      if (MTB.Trails && MTB.Trails.hash) {
        var pr = MTB.Trails.probe(wx, wz);
        if (pr.edge && pr.d < pr.w*0.85) continue;      // never plant on the tread
      }
      var slope = T.roughAt(wx, wz);
      var biome = T.biomeAt(wx, wz, h), r = rng();
      if (slope > 1.05) { if (r < 0.35) pushRock(wx, h, wz, 1.4); continue; }

      switch (biome) {
        case T.BIOME.PINE:
          if (r < 0.62) pushTree(pine, pineC, wx, h, wz, 0.75 + rng()*0.65);
          else if (r < 0.74) pushTree(bush, bushC, wx, h, wz, 0.8 + rng()*0.5);
          else if (r < 0.80) pushRock(wx, h, wz, 0.9);
          else pushTuft(wx, h, wz, 0.30, 0.42, 0.20);
          break;
        case T.BIOME.ALPINE:
          if (r < 0.10) pushTree(pine, pineC, wx, h, wz, 0.45 + rng()*0.35);
          else if (r < 0.38) pushRock(wx, h, wz, 1.15);
          else if (r < 0.62) pushTuft(wx, h, wz, 0.34, 0.38, 0.22);
          break;
        case T.BIOME.SNOW:
          if (r < 0.22) pushRock(wx, h, wz, 1.25);
          break;
        case T.BIOME.DESERT:
          if (r < 0.22) pushTree(bush, bushC, wx, h, wz, 0.55 + rng()*0.4);
          else if (r < 0.42) pushRock(wx, h, wz, 1.3);
          else if (r < 0.55) pushTuft(wx, h, wz, 0.52, 0.46, 0.24);
          break;
        case T.BIOME.DRY:
          if (r < 0.16) pushTree(pine, pineC, wx, h, wz, 0.55 + rng()*0.4);
          else if (r < 0.30) pushTree(bush, bushC, wx, h, wz, 0.9);
          else if (r < 0.42) pushRock(wx, h, wz, 1.0);
          else pushTuft(wx, h, wz, 0.56, 0.50, 0.26);
          break;
        default:
          if (r < 0.26) pushTree(bush, bushC, wx, h, wz, 0.9 + rng()*0.6);
          else if (r < 0.34) pushTree(pine, pineC, wx, h, wz, 0.8);
          else if (r < 0.40) pushRock(wx, h, wz, 0.8);
          else pushTuft(wx, h, wz, 0.34, 0.50, 0.22);
      }
    }

    function pushTree(list, cols, x, y, z, scale) {
      var m = new THREE.Matrix4();
      _q.setFromAxisAngle(up, rng()*Math.PI*2);
      m.compose(new THREE.Vector3(x, y-0.3, z), _q,
        new THREE.Vector3(scale*(0.85+rng()*0.3), scale, scale*(0.85+rng()*0.3)));
      list.push(m);
      var v = 0.82 + rng()*0.36;
      cols.push([v, v*(0.95+rng()*0.12), v*0.92]);
    }
    function pushRock(x, y, z, scale) {
      var m = new THREE.Matrix4();
      _q.setFromEuler(new THREE.Euler(rng()*0.9-0.45, rng()*6.28, rng()*0.9-0.45));
      // The icosahedron has unit radius, so the composed scale is a RADIUS and
      // the axis jitter multiplies it again: the old range put 7 m boulders
      // next to a 1.8 m rider, close enough to the camera to black out half
      // the screen. Keep a boulder boulder-sized.
      var sc = Math.min(scale * (0.25 + rng()*0.75), 1.2);
      m.compose(new THREE.Vector3(x, y-sc*0.28, z), _q,
        new THREE.Vector3(sc*(0.8+rng()*0.6), sc*(0.6+rng()*0.5), sc*(0.8+rng()*0.6)));
      rocks.push(m);
      var v = 0.78 + rng()*0.44;
      rockC.push([v, v, v*(0.95+rng()*0.1)]);
    }
    function pushTuft(x, y, z, r2, g2, b2) {
      var m = new THREE.Matrix4();
      _q.setFromAxisAngle(up, rng()*Math.PI*2);
      var sc = 0.7 + rng()*0.9;
      m.compose(new THREE.Vector3(x, y-0.1, z), _q, new THREE.Vector3(sc, sc, sc));
      tufts.push(m);
      var v = 0.8 + rng()*0.45;
      tuftC.push([r2*v*2.2, g2*v*2.2, b2*v*2.2]);
    }

    var group = new THREE.Group();
    group.matrixAutoUpdate = false;
    var self = this;
    function add(geo, mat, list, cols, cast) {
      if (!list.length) return;
      var im = new THREE.InstancedMesh(geo, mat, list.length);
      var carr = new Float32Array(list.length*3);
      for (var i = 0; i < list.length; i++) {
        im.setMatrixAt(i, list[i]);
        carr[i*3]=cols[i][0]; carr[i*3+1]=cols[i][1]; carr[i*3+2]=cols[i][2];
      }
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor = new THREE.InstancedBufferAttribute(carr, 3);
      im.castShadow = cast && self.opts.shadows;
      // Cull against a sphere that covers the INSTANCES, not the base geometry.
      // geometry.computeBoundingSphere() describes one rock sitting at the
      // origin -- radius about a metre -- while the instances are scattered
      // over a 256 m cell. Three.js then frustum-culled the whole batch the
      // moment that origin left the view, so entire stands of trees and fields
      // of boulders blinked out and back as the rider turned. InstancedMesh's
      // own bounding sphere must cover them. Three r150 has no InstancedMesh
      // computeBoundingSphere, and the base geometry is shared between every
      // cell so its sphere cannot be widened for one of them. The scatter
      // already lives on a fixed world grid with a bounded resident ring, so
      // that grid does the culling and these batches opt out of the frustum
      // test entirely -- a hundred or so draw calls, and nothing blinks.
      im.frustumCulled = false;
      group.add(im);
    }
    add(this.geoPine, this.matScatter, pine, pineC, true);
    add(this.geoBush, this.matScatter, bush, bushC, true);
    add(this.geoRock, this.matScatter, rocks, rockC, true);
    add(this.geoTuft, this.matTuft, tufts, tuftC, false);

    return { key: key, group: group, cx: x0 + S*0.5, cz: z0 + S*0.5, count: group.children.length };
  };

  /* --- selection -------------------------------------------------------------- */
  Streamer.prototype.update = function (camPos, dt) {
    this.frame++;
    var self = this, lodF = this.opts.lodFactor;
    var cache = this.cache, frame = this.frame;
    var queue = [];

    // Returns true only if it appended a COMPLETE cover for this cell. A subtree
    // that cannot be fully covered is rolled back and the parent stands in, so
    // the ground is never both torn and never doubled.
    function plan(ix, iz, size, depth, out) {
      var cx = (ix + 0.5) * size, cz = (iz + 0.5) * size;
      var dx = Math.max(0, Math.abs(camPos.x - cx) - size*0.5);
      var dz = Math.max(0, Math.abs(camPos.z - cz) - size*0.5);
      var dist = Math.sqrt(dx*dx + dz*dz);

      if (depth < MAX_DEPTH && dist < size * lodF) {
        var mark = out.length, ok = true;
        for (var c = 0; c < 4; c++) {
          if (!plan(ix*2 + (c & 1), iz*2 + (c >> 1), size*0.5, depth+1, out)) ok = false;
        }
        if (ok) return true;
        out.length = mark;        // roll back the partial cover
      }
      var key = size + '|' + ix + '|' + iz;
      var ch = cache.get(key);
      if (ch) { ch.lastUsed = frame; out.push(ch); return true; }
      queue.push({ key: key, ix: ix, iz: iz, size: size, depth: depth, d: dist });
      return false;
    }

    var cover = [];
    for (var tx = -1; tx <= 0; tx++) for (var tz = -1; tz <= 0; tz++) {
      plan(tx, tz, TOP_SIZE, 0, cover);
    }

    // show exactly the planned cover
    var want = new Set();
    for (var i = 0; i < cover.length; i++) {
      var c = cover[i]; want.add(c.key);
      if (!c.mesh.parent) this.group.add(c.mesh);
    }
    this.shown.forEach(function (k) {
      if (!want.has(k)) {
        var ch = cache.get(k);
        if (ch && ch.mesh.parent) self.group.remove(ch.mesh);
      }
    });
    this.shown = want;

    // build nearest-first within budget
    queue.sort(function (a, b) { return a.d - b.d; });
    var built = 0;
    for (var b = 0; b < queue.length && built < this.opts.budget; b++) {
      var q = queue[b];
      if (cache.has(q.key)) continue;
      cache.set(q.key, this._build(q.key, q.ix, q.iz, q.size, q.depth));
      built++;
    }
    this.stats.queued = Math.max(0, queue.length - built);
    this.stats.chunks = want.size;

    this._updateScatter(camPos, built < this.opts.budget);
    this._evict();
    return this.stats.queued;
  };

  Streamer.prototype._updateScatter = function (camPos, mayBuild) {
    var S = SCATTER_CELL, R = this.opts.vegDistance;
    if (this.opts.vegDensity <= 0) {
      if (this.scatterGroup.children.length) this.scatterGroup.clear();
      this.stats.veg = 0;
      return;
    }
    var cx0 = Math.floor((camPos.x - R)/S), cx1 = Math.floor((camPos.x + R)/S);
    var cz0 = Math.floor((camPos.z - R)/S), cz1 = Math.floor((camPos.z + R)/S);
    var want = new Set(), missing = null, missD = 1e18;
    for (var sx = cx0; sx <= cx1; sx++) {
      for (var sz = cz0; sz <= cz1; sz++) {
        var ccx = (sx + 0.5)*S, ccz = (sz + 0.5)*S;
        var dx = ccx - camPos.x, dz = ccz - camPos.z;
        var d2 = dx*dx + dz*dz;
        if (d2 > (R + S)*(R + S)) continue;
        var key = sx + ',' + sz;
        want.add(key);
        var cell = this.scatter.get(key);
        if (cell) { if (!cell.group.parent) this.scatterGroup.add(cell.group); }
        else if (d2 < missD) { missD = d2; missing = { key: key, sx: sx, sz: sz }; }
      }
    }
    // one cell per frame keeps the hitch small; they persist once built
    if (mayBuild && missing) {
      var c = this._buildScatter(missing.key, missing.sx, missing.sz);
      this.scatter.set(c.key, c);
      if (c.count) this.scatterGroup.add(c.group);
    }
    var self = this;
    this.scatter.forEach(function (cell, key) {
      if (!want.has(key)) {
        if (cell.group.parent) self.scatterGroup.remove(cell.group);
        if (Math.hypot(cell.cx - camPos.x, cell.cz - camPos.z) > R * 2.2) {
          cell.group.children.forEach(function (m) { m.dispose && m.dispose(); });
          self.scatter.delete(key);
        }
      }
    });
    this.stats.veg = want.size;
  };

  Streamer.prototype._evict = function () {
    if (this.cache.size <= this.opts.maxCached) return;
    var arr = [], self = this;
    this.cache.forEach(function (c, k) { if (!self.shown.has(k)) arr.push(c); });
    arr.sort(function (a, b) { return a.lastUsed - b.lastUsed; });
    var kill = Math.min(arr.length, this.cache.size - this.opts.maxCached);
    for (var i = 0; i < kill; i++) {
      var c = arr[i];
      if (c.mesh.parent) this.group.remove(c.mesh);
      c.mesh.geometry.dispose();
      this.cache.delete(c.key);
    }
  };

  Streamer.prototype.rebuild = function () {
    var self = this;
    this.cache.forEach(function (c) {
      if (c.mesh.parent) self.group.remove(c.mesh);
      c.mesh.geometry.dispose();
    });
    this.cache.clear(); this.shown.clear();
    this.scatter.forEach(function (c) {
      if (c.group.parent) self.scatterGroup.remove(c.group);
      c.group.children.forEach(function (m) { m.dispose && m.dispose(); });
    });
    this.scatter.clear();
  };

  Streamer.prototype.prime = function (camPos, iterations) {
    var old = this.opts.budget;
    this.opts.budget = 96;
    for (var i = 0; i < (iterations || 10); i++) if (this.update(camPos, 0) === 0) break;
    this.opts.budget = old;
  };

  MTB.Streamer = Streamer;
  MTB.SCATTER_CELL = SCATTER_CELL;
})(window);
