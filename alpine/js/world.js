/* Alpine Descent — world.js
   Sky and atmosphere, the day/night cycle, weather, water, the jumps that are
   cut into the height field, landmarks, downhill courses and stunt arenas. */
(function (root) {
  'use strict';
  var MTB = root.MTB, T = MTB.Terrain, Tr = MTB.Trails;
  var M = MTB.math, clamp = M.clamp, lerp = M.lerp, smoothstep = M.smoothstep;

  var W = MTB.World = { landmarks:[], courses:[], stuntAreas:[], features:[],
                        featureHash:null, waypoint:null };

  /* --- jumps, carved into the terrain ---------------------------------------- */
  var FCELL = 64;
  function buildFeatureHash() {
    var map = new Map();
    function key(cx, cz) { return cx*65536 + cz; }
    W.features.forEach(function (f) {
      var r = f.reach;
      for (var cx = Math.floor((f.x-r)/FCELL); cx <= Math.floor((f.x+r)/FCELL); cx++)
        for (var cz = Math.floor((f.z-r)/FCELL); cz <= Math.floor((f.z+r)/FCELL); cz++) {
          var k = key(cx,cz), a = map.get(k);
          if (!a) { a = []; map.set(k,a); } a.push(f);
        }
    });
    W.featureHash = { map:map, key:key, cell:FCELL };
  }

  function featureHeight(x, z) {
    var H = W.featureHash; if (!H) return 0;
    var arr = H.map.get(H.key(Math.floor(x/FCELL), Math.floor(z/FCELL)));
    if (!arr) return 0;
    var add = 0;
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i], dx = x-f.x, dz = z-f.z;
      var u = dx*f.dx + dz*f.dz, v = -dx*f.dz + dz*f.dx;
      if (u < -f.len*0.5-2 || u > f.len*0.5+2) continue;
      var av = Math.abs(v);
      if (av > f.width*0.5+2.5) continue;
      var across = 1 - smoothstep(f.width*0.4, f.width*0.5+2.5, av);
      // t is clamped before it reaches any pow(): a negative base with a
      // fractional exponent is NaN, and one NaN here poisons the height field
      var t = clamp((u + f.len*0.5)/f.len, 0, 1), prof = 0;
      if (f.type === 'kicker') {
        prof = t < 0.78 ? Math.pow(t/0.78, 1.8) : clamp(1 - (t-0.78)/0.22, 0, 1);
      } else if (f.type === 'table') {
        if (t < 0.34) prof = Math.pow(t/0.34, 1.7);
        else if (t < 0.66) prof = 1;
        else prof = Math.pow(clamp(1 - (t-0.66)/0.34, 0, 1), 1.4);
      } else if (f.type === 'roller') prof = Math.sin(t*Math.PI);
      else if (f.type === 'drop') prof = t < 0.5 ? 1 : 0;
      add += prof * f.height * across;
    }
    return add;
  }

  W.installCarve = function () {
    T.carve = function (x, z, h) { return Tr.carveFn(x, z, h) + featureHeight(x, z); };
  };

  W.placeFeatures = function (rng) {
    W.features = [];
    Tr.edges.forEach(function (edge) {
      var pts = edge.pts;
      if (pts.length < 30) return;
      var spacingMin = edge.kind === 'downhill' ? 26 : 48, i = 14;
      while (i < pts.length - 16) {
        var A = pts[i], B = pts[i+6];
        var grade = (A.y - B.y)/Math.max(1, Math.hypot(B.x-A.x, B.z-A.z));
        var r = rng(), place = false, type = 'roller', height = 1.0, len = 11;
        if (grade > 0.10 && r < (edge.kind === 'downhill' ? 0.40 : 0.20)) {
          place = true;
          var pick = rng();
          if (pick < 0.34) { type='kicker'; height=1.2+rng()*1.6; len=13+rng()*8; }
          else if (pick < 0.62) { type='table'; height=1.1+rng()*1.4; len=20+rng()*14; }
          else if (pick < 0.82) { type='roller'; height=0.7+rng()*1.0; len=9+rng()*6; }
          else { type='drop'; height=1.0+rng()*1.7; len=10+rng()*5; }
        } else if (r < 0.10) { place = true; type='roller'; height=0.5+rng()*0.8; len=8+rng()*5; }

        if (place) {
          var dx = B.x-A.x, dz = B.z-A.z, L = Math.hypot(dx,dz) || 1;
          var nx = dx/L, nz = dz/L;
          // A jump is only fun if there is something to land on: refuse to build
          // one where the ground beyond the lip falls away into a face.
          var steepest = 0;
          for (var la = 12; la <= 38; la += 6)
            steepest = Math.max(steepest, T.roughAt(A.x + nx*la, A.z + nz*la));
          if (steepest > 0.85) { i += 6; continue; }
          if (grade > 0.26) { if (type==='kicker'||type==='drop') type='roller'; height *= 0.55; }
          height *= clamp(1 - grade*1.1, 0.40, 1);
          W.features.push({ x:A.x, z:A.z, dx:nx, dz:nz, type:type, height:height, len:len,
            width:Math.max(edge.width*1.5, 5), reach:Math.max(len, edge.width*1.5)*0.75+4 });
          i += Math.ceil(len/7.5) + 6;
        }
        i += Math.ceil(spacingMin/7.5);
      }
    });
    buildFeatureHash();
  };

  var STUNT_NAMES = ['Vulture Bowl','The Sawtooth Hip','Dustpan Gap','Thunder Shelf',
    'Kestrel Step-Down','Amphitheatre','The Ribcage','Copper Kicker Line',
    'Cathedral Drop','Slagheap Send'];

  W.buildStuntAreas = function (rng) {
    W.stuntAreas = []; var used = [];
    for (var s = 0; s < STUNT_NAMES.length; s++) {
      var found = null;
      for (var t = 0; t < 900 && !found; t++) {
        var e = Tr.edges[(rng()*Tr.edges.length)|0];
        if (!e || e.pts.length < 60) continue;
        var i = 20 + ((rng()*(e.pts.length-45))|0);
        var A = e.pts[i], B = e.pts[i+10];
        if ((A.y-B.y)/Math.max(1, Math.hypot(B.x-A.x,B.z-A.z)) < 0.10) continue;
        var ok = true;
        for (var u = 0; u < used.length; u++)
          if (Math.hypot(used[u].x-A.x, used[u].z-A.z) < 1400) { ok = false; break; }
        if (ok) found = { A:A, edge:e, i:i };
      }
      if (!found) continue;
      var cursor = 0, jumps = 3 + ((rng()*3)|0);
      for (var j = 0; j < jumps; j++) {
        var idx = Math.min(found.edge.pts.length-2, found.i + cursor);
        var P = found.edge.pts[idx], P2 = found.edge.pts[Math.min(found.edge.pts.length-1, idx+5)];
        var ddx = P2.x-P.x, ddz = P2.z-P.z, LL = Math.hypot(ddx,ddz)||1;
        W.features.push({ x:P.x, z:P.z, dx:ddx/LL, dz:ddz/LL,
          type: j%3===1 ? 'table' : 'kicker', height: 1.8 + j*0.6 + rng()*0.9,
          len: 14 + j*3.5, width: 13 + j*2, reach: 26 + j*4, stunt:true });
        cursor += 9 + ((rng()*5)|0);
      }
      used.push({ x:found.A.x, z:found.A.z });
      W.stuntAreas.push({ id:'stunt'+s, name:STUNT_NAMES[s], x:found.A.x, z:found.A.z,
        y:found.A.y, radius:210, target:2500 + s*1400, duration:90, reward:260 + s*90,
        edge:found.edge, startIndex:Math.max(0, found.i-12) });
    }
    buildFeatureHash();
  };

  /* --- landmarks -------------------------------------------------------------- */
  var PEAKS = ['Mount Verrick','The Gaunt','Ashspire','Kelvin Horn','Saint Ondra',
    'Blackbriar Peak','The Anvil','Halewind','Corvid Tooth','Mount Selwyn','Palefinger',
    'The Sentinel','Orrin Massif','Wraithcap','Mount Tallow','Hollowmoon'];
  var LAKES = ['Lake Isolde','Mirrorpool','Cobalt Tarn','Still Hannah','Lake Verity',
    'Whisper Basin','Sunken Bell','Grey Glass Lake'];
  var CABINS = ['Dunmore Hut','The Wayhouse','Kettle Cabin','Old Marrow Shelter',
    'Pinewhistle Bothy','Tinder Lodge','Harrow Rest','Nine Mile Cabin'];
  var VIEWS = ['Eagle Shelf','The Long Look','Skyward Ledge','Vantage Cairn','Widow Rock',
    'Cloudbreak Point','The Balcony','Last Light Overlook'];
  var CANYONS = ['Ironvein Gorge','The Split','Dryhollow Canyon','Serpent Cut'];
  var FALLS = ['Thundershirt Falls','Veil Cascade','Coldmouth Falls','Silver Ladder'];
  var CAVES = ['The Lantern Hollow','Bearclaw Cave','Echo Mouth','Deepcut Grotto'];
  var ARCHES = ['Windbone Arch','The Keyhole','Stonegate'];

  function LM(type, name, x, z, y, radius, reward, extra) {
    var o = { type:type, name:name, x:x, z:z, y:y, radius:radius||120,
              reward:reward||120, discovered:false, mesh:null };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function farFrom(x, z, d) {
    for (var i = 0; i < W.landmarks.length; i++)
      if (Math.hypot(W.landmarks[i].x-x, W.landmarks[i].z-z) < d) return false;
    return true;
  }

  W.buildLandmarks = function (rng) {
    W.landmarks = []; var i;
    T.findPeaks(PEAKS.length, 1250).forEach(function (p, k) {
      var y = T.height(p.x, p.z);
      W.landmarks.push(LM('peak', PEAKS[k], p.x, p.z, y, 150, 180 + Math.floor(y/12), { elevation:y }));
    });
    T.lakes.forEach(function (lk, k) {
      lk.name = LAKES[k % LAKES.length];
      W.landmarks.push(LM('lake', lk.name, lk.x, lk.z, lk.level, lk.r + 90, 150, { lake:lk }));
    });

    var vi = 0;
    for (var a = 0; a < 3000 && vi < VIEWS.length; a++) {
      var vx = (rng()*2-1)*T.HALF*0.7, vz = (rng()*2-1)*T.HALF*0.7;
      var vy = T.gridSample(vx, vz);
      if (vy < 1350 || T.slopeAt(vx, vz) > 0.48) continue;
      var drop = 0;
      for (var d8 = 0; d8 < 8; d8++) {
        var ang = d8/8*Math.PI*2;
        drop = Math.max(drop, vy - T.gridSample(vx+Math.cos(ang)*420, vz+Math.sin(ang)*420));
      }
      if (drop < 280 || !farFrom(vx, vz, 700)) continue;
      W.landmarks.push(LM('viewpoint', VIEWS[vi++], vx, vz, T.height(vx,vz), 110, 220, { drop:drop }));
    }

    var ci = 0;
    for (var a2 = 0; a2 < 4000 && ci < CABINS.length; a2++) {
      var e = Tr.edges[(rng()*Tr.edges.length)|0];
      if (!e || e.pts.length < 40) continue;
      var pt = e.pts[20 + ((rng()*(e.pts.length-40))|0)];
      if (T.slopeAt(pt.x, pt.z) > 0.24) continue;
      var cy2 = T.height(pt.x, pt.z);
      if (cy2 < T.SEA+20 || cy2 > 2200 || !farFrom(pt.x, pt.z, 950)) continue;
      var ox = pt.x + (rng()<0.5?-1:1)*(12+rng()*8), oz = pt.z + (rng()<0.5?-1:1)*(12+rng()*8);
      W.landmarks.push(LM('cabin', CABINS[ci++], ox, oz, T.height(ox,oz), 70, 200));
    }

    function scatter(names, type, test, radius, reward) {
      var k = 0;
      for (var tries = 0; tries < 4000 && k < names.length; tries++) {
        var x = (rng()*2-1)*T.HALF*0.76, z = (rng()*2-1)*T.HALF*0.76;
        var y = T.gridSample(x, z);
        if (!test(x,z,y) || !farFrom(x,z,800)) continue;
        W.landmarks.push(LM(type, names[k++], x, z, T.height(x,z), radius, reward));
      }
    }
    scatter(CANYONS, 'canyon', function (x,z,y) {
      if (y > 900) return false;
      var rim = 0;
      for (var a3 = 0; a3 < 6; a3++) {
        var an = a3/6*Math.PI*2;
        rim = Math.max(rim, T.gridSample(x+Math.cos(an)*260, z+Math.sin(an)*260) - y);
      }
      return rim > 260;
    }, 200, 240);
    scatter(FALLS, 'waterfall', function (x,z,y) { return y>700 && y<2100 && T.slopeAt(x,z)>0.74; }, 110, 260);
    scatter(CAVES, 'cave', function (x,z,y) { return y>500 && y<1900 && T.slopeAt(x,z)>0.62; }, 90, 280);
    scatter(ARCHES, 'arch', function (x,z,y) {
      var s = T.slopeAt(x,z); return y>600 && y<1800 && s>0.30 && s<0.62; }, 110, 300);

    // Trestles where the tread is built out above natural ground — exactly where
    // a trail crew would bridge rather than haul in dirt.
    var bridges = 0;
    for (var be = 0; be < Tr.edges.length && bridges < 8; be++) {
      var ed = Tr.edges[be], bestI = -1, bestFill = 3.2;
      for (var pi = 14; pi < ed.pts.length-14; pi += 2) {
        var sustained = Math.min(ed.pts[pi].cut||0, ed.pts[pi-3].cut||0, ed.pts[pi+3].cut||0);
        if (sustained > bestFill) { bestFill = sustained; bestI = pi; }
      }
      if (bestI < 0) continue;
      var bp = ed.pts[bestI];
      if (!farFrom(bp.x, bp.z, 600)) continue;
      W.landmarks.push(LM('bridge', 'Trestle on ' + ed.name, bp.x, bp.z, bp.y, 70, 160,
        { edge:ed, index:bestI }));
      bridges++;
    }
    return W.landmarks;
  };

  /* --- downhill courses --------------------------------------------------------- */
  var COURSE_NAMES = ['Cutbank Sprint','Widowmaker','Slate Run','The Long Grey',
    'Timberfall Descent','Rockjaw','Sunspill Line','The Deep Cut','Thunderhead Plunge',
    'Vertical Mile','Ashfall Marathon','The Whole Mountain'];

  function dirOf(edge, fwd, entry) {
    var p = edge.pts, n = p.length, a, b;
    if (entry) { a = fwd ? p[0] : p[n-1]; b = fwd ? p[Math.min(n-1,4)] : p[Math.max(0,n-5)]; }
    else { a = fwd ? p[Math.max(0,n-5)] : p[Math.min(n-1,4)]; b = fwd ? p[n-1] : p[0]; }
    var dx = b.x-a.x, dz = b.z-a.z, l = Math.hypot(dx,dz)||1;
    return { x:dx/l, z:dz/l };
  }

  function chainFrom(startNode, maxLen, used) {
    var chain = [], current = startNode, total = 0, guard = 0, visited = {}, prevDir = null;
    visited[current] = 1;
    while (total < maxLen && guard++ < 40) {
      var best = null, bestScore = -1e9, bestFwd = true;
      for (var i = 0; i < Tr.edges.length; i++) {
        var e = Tr.edges[i], other = -1;
        if (e.a === current) other = e.b; else if (e.b === current) other = e.a; else continue;
        if (visited[other] || Tr.nodes[other].h >= Tr.nodes[current].h) continue;
        var fwd = e.a === current;
        var score = (Tr.nodes[current].h - Tr.nodes[other].h) - (used[i] ? 200 : 0);
        // Prefer to carry straight on through a junction: stitching a course
        // through a near-hairpin gives a corner nobody can hold.
        if (prevDir) {
          var ed = dirOf(e, fwd, true);
          var turn = prevDir.x*ed.x + prevDir.z*ed.z;
          if (turn < -0.15) continue;
          score += turn * 260;
        }
        if (score > bestScore) { bestScore = score; best = { e:e, i:i, other:other }; bestFwd = fwd; }
      }
      if (!best) break;
      chain.push({ edge:best.e, index:best.i, forward:bestFwd });
      total += best.e.len; visited[best.other] = 1;
      prevDir = dirOf(best.e, bestFwd, false);
      current = best.other;
    }
    return { chain:chain, length:total };
  }

  W.buildCourses = function () {
    W.courses = [];
    var used = {}, targets = [700,900,1200,1500,1800,2200,2600,3200,3800,4600,6000,9000];
    var order = Tr.nodes.map(function (n,i) { return {i:i,h:n.h}; })
                        .sort(function (a,b) { return b.h - a.h; });

    for (var c = 0; c < COURSE_NAMES.length && c < order.length; c++) {
      var res = chainFrom(order[Math.min(order.length-1,c)].i, targets[c], used);
      if (!res.chain.length || res.length < 260) continue;
      res.chain.forEach(function (l) { used[l.index] = 1; });

      var pts = [];
      res.chain.forEach(function (link) {
        var p = link.edge.pts, i;
        if (link.forward) for (i = 0; i < p.length; i++) pts.push(p[i]);
        else for (i = p.length-1; i >= 0; i--) pts.push(p[i]);
      });
      if (pts.length < 30) continue;

      // A course must begin on ground you can roll away from: pointing downhill,
      // on a holdable grade, with no cliff and no jump lip in the way.
      var s0 = 0;
      while (s0 < pts.length - 40) {
        var jj = Math.min(pts.length-1, s0+5);
        var hd = Math.hypot(pts[jj].x-pts[s0].x, pts[jj].z-pts[s0].z);
        var gr = hd > 0.5 ? (pts[jj].y - pts[s0].y)/hd : 0;
        var worst = 0;
        for (var wi = s0; wi < Math.min(pts.length-1, s0+14); wi++) {
          var wd = Math.hypot(pts[wi+1].x-pts[wi].x, pts[wi+1].z-pts[wi].z);
          if (wd > 0.5) worst = Math.max(worst, Math.abs(pts[wi+1].y-pts[wi].y)/wd);
        }
        var ddx = pts[s0+1].x-pts[s0].x, ddz = pts[s0+1].z-pts[s0].z;
        var dl = Math.hypot(ddx,ddz) || 1, h0 = T.height(pts[s0].x, pts[s0].z);
        var step1 = T.height(pts[s0].x+ddx/dl*1.5, pts[s0].z+ddz/dl*1.5) - h0;
        var step2 = T.height(pts[s0].x+ddx/dl*5.0, pts[s0].z+ddz/dl*5.0) - h0;
        if (gr < -0.02 && gr > -0.50 && worst < 0.75 && step1 < 0.45 && step2 < 0.9) break;
        s0++;
      }
      if (s0 > 0) pts = pts.slice(s0);
      if (pts.length < 30) continue;

      // and it should not END with a grind back uphill
      var s1 = pts.length - 1;
      while (s1 > 30) {
        var kk = Math.max(0, s1-5);
        var hd2 = Math.hypot(pts[s1].x-pts[kk].x, pts[s1].z-pts[kk].z);
        if ((hd2 > 0.5 ? (pts[s1].y-pts[kk].y)/hd2 : 0) < 0.015) break;
        s1--;
      }
      if (s1 < pts.length-1) pts = pts.slice(0, s1+1);
      if (pts.length < 30) continue;

      var len = 0;
      for (var li = 1; li < pts.length; li++)
        len += Math.hypot(pts[li].x-pts[li-1].x, pts[li].z-pts[li-1].z);

      var checkpoints = [], acc = 0, cpSpacing = Math.max(180, len/14);
      for (var i2 = 1; i2 < pts.length; i2++) {
        acc += Math.hypot(pts[i2].x-pts[i2-1].x, pts[i2].z-pts[i2-1].z);
        if (acc >= cpSpacing && i2 < pts.length-8) {
          acc = 0;
          var nx2 = Math.min(pts.length-1, i2+3);
          checkpoints.push({ x:pts[i2].x, z:pts[i2].z, y:pts[i2].y,
            yaw:Math.atan2(pts[nx2].x-pts[i2].x, pts[nx2].z-pts[i2].z), index:i2, passed:false });
        }
      }
      // the finish sits a few metres short of the very end, so the rider rolls
      // through it rather than fighting for the last stride of trail
      var lastIdx = Math.max(6, pts.length-5), last = pts[lastIdx];
      checkpoints.push({ x:last.x, z:last.z, y:last.y,
        yaw:Math.atan2(last.x-pts[lastIdx-3].x, last.z-pts[lastIdx-3].z),
        index:lastIdx, passed:false, finish:true });

      var drop = pts[0].y - last.y, grade = drop/Math.max(len,1);
      var descent = 0, climb = 0;
      for (var di = 1; di < pts.length; di++) {
        var dd = pts[di].y - pts[di-1].y;
        if (dd < 0) descent -= dd; else climb += dd;
      }
      W.courses.push({
        id:'course'+c, name:COURSE_NAMES[c], pts:pts, length:len, drop:drop,
        descent:descent, climb:climb, grade:grade,
        start:{ x:pts[0].x, z:pts[0].z, y:pts[0].y,
                yaw:Math.atan2(pts[3].x-pts[0].x, pts[3].z-pts[0].z) },
        checkpoints:checkpoints,
        difficulty: grade>0.29 ? 'Double Black' : grade>0.22 ? 'Black'
                  : grade>0.14 ? 'Blue' : 'Green',
        reward: Math.floor(len/8 + drop/2), parTime: len/11.5
      });
    }
    W.courses.sort(function (a,b) { return a.length - b.length; });
    return W.courses;
  };

  /* --- sky ---------------------------------------------------------------------- */
  var SKY_V = ['varying vec3 vW;','void main(){ vW = normalize(position);',
    'vec4 mv = modelViewMatrix * vec4(position,1.0);',
    'gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w; }'].join('\n');
  var SKY_F = [
    'uniform vec3 topColor, midColor, botColor, sunDir, sunColor, moonDir;',
    'uniform float sunSize, haze, starAmount;',
    'varying vec3 vW;',
    'float hash(vec3 p){ p = fract(p*0.3183099+vec3(0.71,0.113,0.419)); p *= 17.0;',
    '  return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }',
    'void main(){',
    '  vec3 d = normalize(vW); float y = clamp(d.y,-1.0,1.0); vec3 col;',
    '  if (y > 0.0) col = mix(midColor, topColor, pow(y,0.55));',
    '  else col = mix(midColor, botColor, pow(-y,0.45));',
    '  col = mix(col, midColor, pow(1.0-abs(y),6.0)*haze);',
    '  float sd = max(dot(d, normalize(sunDir)),0.0);',
    '  col += sunColor*(pow(sd,180.0)*0.6 + pow(sd,9.0)*0.28 + pow(sd,2.5)*0.10);',
    '  col = mix(col, sunColor*1.5, smoothstep(1.0-sunSize, 1.0-sunSize*0.35, sd));',
    '  float md = max(dot(d, normalize(moonDir)),0.0);',
    '  col = mix(col, vec3(0.92,0.94,1.0), smoothstep(0.9993,0.9997,md)*starAmount);',
    '  col += vec3(0.55,0.6,0.8)*pow(md,260.0)*0.25*starAmount;',
    '  if (starAmount > 0.01 && y > -0.05) {',
    '    float h = hash(floor(d*420.0));',
    '    col += vec3(step(0.9975,h)*starAmount*(0.65+0.35*sin(h*90.0)));',
    '  }',
    '  gl_FragColor = vec4(col,1.0); }'].join('\n');

  var DAY = [
    {t:0.00,top:0x060a18,mid:0x0d1426,bot:0x05070f,sun:0x30405a,amb:0x151d33,dir:0x2a3554,haze:0.30,stars:1.0,fog:0x0c1222,fogD:0.000055},
    {t:0.21,top:0x1c2b52,mid:0x4a4368,bot:0x2a2436,sun:0x8a6a70,amb:0x2e3350,dir:0x6a5a70,haze:0.55,stars:0.55,fog:0x3a3550,fogD:0.000085},
    {t:0.27,top:0x2f5aa0,mid:0xd4906a,bot:0x7a5a52,sun:0xffb070,amb:0x4a4a5a,dir:0xf8c6a4,haze:0.85,stars:0.0,fog:0xd9a07e,fogD:0.000095},
    {t:0.35,top:0x2668c8,mid:0xa8cbe8,bot:0x6a7a90,sun:0xfff0c8,amb:0x6a7690,dir:0xffeec6,haze:0.62,stars:0.0,fog:0xa9c2dc,fogD:0.000068},
    {t:0.50,top:0x1f63d8,mid:0x9ec6ee,bot:0x64758c,sun:0xffffff,amb:0x7e8ca6,dir:0xfff6e2,haze:0.50,stars:0.0,fog:0xa6c3e0,fogD:0.000058},
    {t:0.68,top:0x2a68c4,mid:0xb4cbe0,bot:0x6e7a8c,sun:0xfff0d2,amb:0x76829a,dir:0xffeccc,haze:0.58,stars:0.0,fog:0xb0c6de,fogD:0.000062},
    {t:0.78,top:0x2d4f92,mid:0xe3a874,bot:0x8a6450,sun:0xff9a4a,amb:0x5c5464,dir:0xf2ac78,haze:0.92,stars:0.0,fog:0xe8a878,fogD:0.000090},
    {t:0.84,top:0x18244a,mid:0x6a4468,bot:0x35283c,sun:0x9a5a68,amb:0x2f2f4a,dir:0x6a4a62,haze:0.60,stars:0.45,fog:0x4a3a56,fogD:0.000082},
    {t:1.00,top:0x060a18,mid:0x0d1426,bot:0x05070f,sun:0x30405a,amb:0x151d33,dir:0x2a3554,haze:0.30,stars:1.0,fog:0x0c1222,fogD:0.000055}];

  var WEATHER = MTB.WEATHER = [
    {id:'clear', name:'Clear', fogMul:1.0, light:1.00, sat:1.00, precip:null, cloud:0.10},
    {id:'cloudy',name:'Cloudy',fogMul:1.6, light:0.72, sat:0.86, precip:null, cloud:0.75},
    {id:'fog',   name:'Mountain Fog', fogMul:5.2, light:0.62, sat:0.70, precip:null, cloud:0.85},
    {id:'rain',  name:'Rain', fogMul:2.9, light:0.55, sat:0.75, precip:'rain', cloud:0.95},
    {id:'snow',  name:'Snowfall', fogMul:3.4, light:0.68, sat:0.80, precip:'snow', cloud:0.90}];

  function sampleDay(t) {
    t -= Math.floor(t);
    var a = DAY[0], b = DAY[DAY.length-1];
    for (var i = 0; i < DAY.length-1; i++)
      if (t >= DAY[i].t && t <= DAY[i+1].t) { a = DAY[i]; b = DAY[i+1]; break; }
    var f = (t-a.t)/Math.max(1e-6, b.t-a.t); f = f*f*(3-2*f);
    function mc(x,y) { return new THREE.Color(x).lerp(new THREE.Color(y), f); }
    return { top:mc(a.top,b.top), mid:mc(a.mid,b.mid), bot:mc(a.bot,b.bot),
             sun:mc(a.sun,b.sun), amb:mc(a.amb,b.amb), dir:mc(a.dir,b.dir), fog:mc(a.fog,b.fog),
             haze:lerp(a.haze,b.haze,f), stars:lerp(a.stars,b.stars,f), fogD:lerp(a.fogD,b.fogD,f) };
  }

  function Environment(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.timeOfDay = 0.33; this.daySpeed = 1/900;
    this.weather = WEATHER[0];

    this.uniforms = {
      topColor:{value:new THREE.Color(0x2a6ad4)}, midColor:{value:new THREE.Color(0x9fc4e8)},
      botColor:{value:new THREE.Color(0x54637a)}, sunDir:{value:new THREE.Vector3(0,1,0)},
      moonDir:{value:new THREE.Vector3(0,-1,0)}, sunColor:{value:new THREE.Color(0xfff2d0)},
      sunSize:{value:0.004}, haze:{value:0.55}, starAmount:{value:0} };
    var sky = new THREE.Mesh(new THREE.SphereGeometry(1,32,20),
      new THREE.ShaderMaterial({ uniforms:this.uniforms, vertexShader:SKY_V, fragmentShader:SKY_F,
        side:THREE.BackSide, depthWrite:false, depthTest:false, fog:false }));
    sky.renderOrder = -1000; sky.frustumCulled = false;
    scene.add(sky); this.sky = sky;

    this.hemi = new THREE.HemisphereLight(0xbcd2f0, 0x4a4438, 0.55); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sun.castShadow = true;
    var S = 260;
    this.sun.shadow.camera.left=-S; this.sun.shadow.camera.right=S;
    this.sun.shadow.camera.top=S; this.sun.shadow.camera.bottom=-S;
    this.sun.shadow.camera.near=1; this.sun.shadow.camera.far=1400;
    this.sun.shadow.mapSize.set(2048,2048);
    this.sun.shadow.bias=-0.0009; this.sun.shadow.normalBias=0.6;
    scene.add(this.sun); scene.add(this.sun.target);
    this.ambient = new THREE.AmbientLight(0x404858, 0.35); scene.add(this.ambient);
    scene.fog = new THREE.FogExp2(0xa6c3e0, 0.000058);

    var COUNT = 3600, pos = new Float32Array(COUNT*3);
    for (var i = 0; i < COUNT; i++) {
      pos[i*3]=(Math.random()-0.5)*90; pos[i*3+1]=Math.random()*60; pos[i*3+2]=(Math.random()-0.5)*90;
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos,3));
    this.rainMat = new THREE.PointsMaterial({ color:0xaac4de, size:0.34, transparent:true,
      opacity:0, sizeAttenuation:true, depthWrite:false, fog:false });
    this.precip = new THREE.Points(pg, this.rainMat);
    this.precip.frustumCulled = false; this.precip.visible = false; scene.add(this.precip);

    // flat-shaded on purpose: lambert clouds become dark blobs with the sun behind
    this.cloudMat = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true,
      opacity:0, depthWrite:false, fog:false });
    var cg = new THREE.Group(), rng = MTB.makeRNG(4242);
    for (var ci = 0; ci < 34; ci++) {
      var geos = [], blobs = 3 + ((rng()*4)|0);
      for (var b2 = 0; b2 < blobs; b2++) {
        var sp = new THREE.SphereGeometry(160 + rng()*220, 7, 5);
        sp.scale(1.5,0.42,1.2);
        sp.translate((rng()-0.5)*620, (rng()-0.5)*70, (rng()-0.5)*460);
        geos.push(sp);
      }
      var cm = new THREE.Mesh(MTB.mergeGeos(geos), this.cloudMat);
      var ang2 = rng()*Math.PI*2, rad = 1200 + rng()*7200;
      cm.position.set(Math.cos(ang2)*rad, 3400 + rng()*900, Math.sin(ang2)*rad);
      cg.add(cm);
    }
    cg.visible = false; this.clouds = cg; scene.add(cg);
    this.sunDir = new THREE.Vector3(0,1,0);
  }

  Environment.prototype.setWeather = function (id) {
    for (var i = 0; i < WEATHER.length; i++) if (WEATHER[i].id === id) this.weather = WEATHER[i];
  };

  Environment.prototype.update = function (dt, camPos, quality) {
    this.timeOfDay += dt * this.daySpeed;
    if (this.timeOfDay > 1) this.timeOfDay -= 1;
    var d = sampleDay(this.timeOfDay), w = this.weather;
    var ang = (this.timeOfDay - 0.25)*Math.PI*2;
    var elev = Math.sin(ang);
    this.sunDir.set(Math.cos(ang)*0.62, elev, 0.55).normalize();
    var dayF = clamp(elev*2.2 + 0.22, 0, 1);
    this.dayFactor = dayF;

    var u = this.uniforms;
    u.topColor.value.copy(d.top); u.midColor.value.copy(d.mid); u.botColor.value.copy(d.bot);
    u.sunColor.value.copy(d.sun); u.sunDir.value.copy(this.sunDir);
    u.moonDir.value.set(-this.sunDir.x,-this.sunDir.y,-this.sunDir.z);
    u.haze.value = d.haze*(0.7 + w.cloud*0.8);
    u.starAmount.value = d.stars*(1 - w.cloud*0.85);
    if (w.sat < 1) [u.topColor.value,u.midColor.value,u.botColor.value].forEach(function (c) {
      var g = (c.r+c.g+c.b)/3;
      c.lerp(new THREE.Color(g*0.92,g*0.94,g), 1-w.sat);
    });

    this.sun.color.copy(d.dir);
    this.sun.intensity = (0.14 + dayF*1.10)*w.light;
    this.hemi.color.copy(d.mid); this.hemi.groundColor.setHex(0x3b352c);
    this.hemi.intensity = (0.26 + dayF*0.40)*w.light;
    this.ambient.color.copy(d.amb);
    this.ambient.intensity = 0.38 + (1-dayF)*0.26;

    var sd = 420;
    this.sun.position.set(camPos.x + this.sunDir.x*sd, camPos.y + this.sunDir.y*sd,
                          camPos.z + this.sunDir.z*sd);
    this.sun.target.position.copy(camPos); this.sun.target.updateMatrixWorld();

    var fog = d.fog.clone();
    if (w.sat < 1) { var g2 = (fog.r+fog.g+fog.b)/3; fog.lerp(new THREE.Color(g2,g2,g2*1.02), 1-w.sat); }
    this.scene.fog.color.copy(fog);
    this.scene.fog.density = d.fogD * w.fogMul / ((quality && quality.drawDistance) || 1);
    this.renderer.setClearColor(fog);

    var co = w.cloud*0.85;
    this.clouds.visible = co > 0.02 && (!quality || quality.clouds !== false);
    this.cloudMat.opacity = co;
    this.cloudMat.color.copy(d.mid).lerp(new THREE.Color(0xffffff), 0.35 + dayF*0.5);
    this.clouds.position.x = camPos.x*0.85; this.clouds.position.z = camPos.z*0.85;

    if (w.precip) {
      this.precip.visible = true;
      this.precip.position.set(camPos.x, camPos.y-12, camPos.z);
      var snow = w.precip === 'snow';
      this.rainMat.opacity = snow ? 0.85 : 0.5;
      this.rainMat.size = snow ? 0.55 : 0.30;
      this.rainMat.color.setHex(snow ? 0xffffff : 0xaac4de);
      var arr = this.precip.geometry.attributes.position.array;
      var fall = (snow ? 5.5 : 34)*dt;
      var drift = snow ? Math.sin(performance.now()*0.0007)*3.2*dt : 0;
      for (var i = 0; i < arr.length; i += 3) {
        arr[i+1] -= fall; arr[i] += drift;
        if (arr[i+1] < 0) { arr[i+1] += 60;
          arr[i] = (Math.random()-0.5)*90; arr[i+2] = (Math.random()-0.5)*90; }
      }
      this.precip.geometry.attributes.position.needsUpdate = true;
    } else this.precip.visible = false;

    this.sky.position.copy(camPos);
  };

  Environment.prototype.clockString = function () {
    var mins = Math.floor(this.timeOfDay*24*60), h = Math.floor(mins/60), m = mins%60;
    var ap = h < 12 ? 'AM' : 'PM', hh = h%12 || 12;
    return hh + ':' + (m<10?'0':'') + m + ' ' + ap;
  };
  Environment.prototype.phaseName = function () {
    var t = this.timeOfDay;
    return t<0.22?'Night':t<0.30?'Sunrise':t<0.45?'Morning':t<0.62?'Midday'
         :t<0.74?'Afternoon':t<0.83?'Sunset':t<0.90?'Dusk':'Night';
  };

  /* --- water + landmark meshes --------------------------------------------------- */
  W.buildWater = function (scene) {
    var group = new THREE.Group();
    var mat = new THREE.MeshLambertMaterial({ color:0x2d5f86, transparent:true, opacity:0.82 });
    group.userData.mat = mat;
    T.lakes.forEach(function (lk) {
      var g = new THREE.CircleGeometry(lk.r*1.25, 34); g.rotateX(-Math.PI/2);
      var m = new THREE.Mesh(g, mat);
      m.position.set(lk.x, lk.level, lk.z); m.renderOrder = 1;
      group.add(m);
    });
    var sg = new THREE.PlaneGeometry(T.WORLD, T.WORLD, 1, 1); sg.rotateX(-Math.PI/2);
    var sea = new THREE.Mesh(sg, mat); sea.position.y = T.SEA; group.add(sea);
    scene.add(group);
    return group;
  };

  function cabinMesh() {
    var g = new THREE.Group(), wood = new THREE.MeshLambertMaterial({color:0x6b4a30});
    var logs = [], Wd = 5.2, D = 4.0, H = 3.0;
    function cx2(len,r,x,y,z){var c=new THREE.CylinderGeometry(r,r,len,6);c.rotateZ(Math.PI/2);c.translate(x,y,z);return c;}
    function cz2(len,r,x,y,z){var c=new THREE.CylinderGeometry(r,r,len,6);c.rotateX(Math.PI/2);c.translate(x,y,z);return c;}
    for (var i = 0; i < 7; i++) {
      var y = 0.28 + i*0.40;
      logs.push(cx2(Wd,0.20,0,y,-D/2), cx2(Wd,0.20,0,y,D/2),
                cz2(D,0.20,-Wd/2,y,0), cz2(D,0.20,Wd/2,y,0));
    }
    var bm = new THREE.Mesh(MTB.mergeGeos(logs), wood); bm.castShadow = true; g.add(bm);
    var r1 = new THREE.BoxGeometry(Wd+1,0.22,D*0.85); r1.rotateX(0.62); r1.translate(0,H+0.45,-D*0.27);
    var r2 = new THREE.BoxGeometry(Wd+1,0.22,D*0.85); r2.rotateX(-0.62); r2.translate(0,H+0.45,D*0.27);
    var rm = new THREE.Mesh(MTB.mergeGeos([r1,r2]), new THREE.MeshLambertMaterial({color:0x3d3a38}));
    rm.castShadow = true; g.add(rm);
    var win = new THREE.Mesh(new THREE.BoxGeometry(0.75,0.65,0.1),
      new THREE.MeshLambertMaterial({color:0xe8c06a}));
    win.position.set(1.6,1.6,D/2+0.05); g.add(win);
    return g;
  }
  function cairnMesh() {
    var g = new THREE.Group(), cs = [];
    for (var s = 0; s < 8; s++) {
      var ic = new THREE.IcosahedronGeometry(0.8-s*0.07, 0);
      ic.scale(1.1,0.55,1.1);
      ic.translate((Math.random()-0.5)*0.25, 0.25+s*0.42, (Math.random()-0.5)*0.25);
      cs.push(ic);
    }
    var m = new THREE.Mesh(MTB.mergeGeos(cs), new THREE.MeshLambertMaterial({color:0x6d675e}));
    m.castShadow = true; g.add(m);
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4,6),
      new THREE.MeshLambertMaterial({color:0x30302e}));
    pole.position.y = 4.3; g.add(pole);
    var flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.7),
      new THREE.MeshLambertMaterial({color:0xd8462f, side:THREE.DoubleSide}));
    flag.position.set(0.62,5.1,0); g.add(flag);
    return g;
  }
  function viewpointMesh() {
    var g = new THREE.Group(), parts = [];
    for (var i = 0; i < 6; i++) {
      var a = i/6*Math.PI*2;
      var c = new THREE.CylinderGeometry(0.10,0.10,1.1,6);
      c.translate(Math.cos(a)*1.5, 0.55, Math.sin(a)*1.5); parts.push(c);
    }
    var rail = new THREE.TorusGeometry(1.5,0.055,5,16);
    rail.rotateX(Math.PI/2); rail.translate(0,1.05,0); parts.push(rail);
    var m = new THREE.Mesh(MTB.mergeGeos(parts), new THREE.MeshLambertMaterial({color:0x7a5a3c}));
    m.castShadow = true; g.add(m);
    return g;
  }
  function archMesh() {
    var parts = [], R2 = 16;
    for (var i = 0; i <= 14; i++) {
      var a = Math.PI*(i/14);
      var s = new THREE.BoxGeometry(7+Math.random()*3, 8+Math.random()*4, 9);
      s.rotateZ(-a + Math.PI/2);
      s.translate(-Math.cos(a)*R2, Math.sin(a)*R2, 0);
      parts.push(s);
    }
    var m = new THREE.Mesh(MTB.mergeGeos(parts), new THREE.MeshLambertMaterial({color:0x7a6a58}));
    m.castShadow = true; m.receiveShadow = true;
    var g = new THREE.Group(); g.add(m); return g;
  }
  function caveMesh() {
    var g = new THREE.Group(), parts = [];
    for (var i = 0; i < 7; i++) {
      var ic = new THREE.IcosahedronGeometry(5+Math.random()*5, 0);
      ic.scale(1.3,0.9,1.1);
      ic.translate((Math.random()-0.5)*11, Math.random()*4, (Math.random()-0.5)*8);
      parts.push(ic);
    }
    var m = new THREE.Mesh(MTB.mergeGeos(parts), new THREE.MeshLambertMaterial({color:0x5f574c}));
    m.castShadow = true; g.add(m);
    var mouth = new THREE.Mesh(new THREE.SphereGeometry(3.3,12,8,0,Math.PI*2,0,Math.PI/2),
      new THREE.MeshBasicMaterial({color:0x08090c}));
    mouth.rotation.x = Math.PI/2; mouth.position.set(0,2.0,6.0); g.add(mouth);
    return g;
  }
  function fallMesh() {
    var g = new THREE.Group(), h = 60;
    var geo = new THREE.PlaneGeometry(7,h,1,8); geo.translate(0,-h/2,0);
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:0xdff0ff, transparent:true,
      opacity:0.72, side:THREE.DoubleSide })));
    var mist = new THREE.Mesh(new THREE.SphereGeometry(7,10,7),
      new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.22}));
    mist.position.y = -h; mist.scale.set(1.4,0.5,1.4); g.add(mist);
    return g;
  }
  function bridgeMesh(edge, index) {
    var g = new THREE.Group(), pts = edge.pts;
    var A = pts[Math.max(0,index-4)], B = pts[Math.min(pts.length-1,index+4)];
    var len = Math.hypot(B.x-A.x, B.z-A.z), parts = [new THREE.BoxGeometry(edge.width*0.9,0.28,len)];
    for (var s = -1; s <= 1; s += 2) {
      var rail = new THREE.BoxGeometry(0.12,0.10,len);
      rail.translate(s*edge.width*0.42, 1.0, 0); parts.push(rail);
      for (var p = 0; p < 6; p++) {
        var post = new THREE.BoxGeometry(0.12,1.0,0.12);
        post.translate(s*edge.width*0.42, 0.5, -len/2 + len*(p/5)); parts.push(post);
      }
    }
    var m = new THREE.Mesh(MTB.mergeGeos(parts), new THREE.MeshLambertMaterial({color:0x6a4d33}));
    m.castShadow = true; m.receiveShadow = true; g.add(m);
    g.position.set((A.x+B.x)/2, (A.y+B.y)/2 + 0.05, (A.z+B.z)/2);
    g.rotation.y = Math.atan2(B.x-A.x, B.z-A.z);
    return g;
  }

  W.buildLandmarkMeshes = function (scene) {
    var group = new THREE.Group(); group.name = 'landmarks';
    W.landmarks.forEach(function (lm) {
      var mesh = null;
      switch (lm.type) {
        case 'cabin': mesh = cabinMesh(); break;
        case 'viewpoint': mesh = viewpointMesh(); break;
        case 'arch': mesh = archMesh(); break;
        case 'cave': mesh = caveMesh(); break;
        case 'waterfall': mesh = fallMesh(); break;
        case 'bridge': mesh = bridgeMesh(lm.edge, lm.index); break;
        case 'peak': mesh = cairnMesh(); break;
      }
      if (!mesh) return;
      if (lm.type !== 'bridge') {
        mesh.position.set(lm.x, T.height(lm.x, lm.z) + (lm.type==='waterfall'?2:0), lm.z);
        mesh.rotation.y = Math.random()*Math.PI*2;
      }
      mesh.visible = false; lm.mesh = mesh; group.add(mesh);
    });
    scene.add(group); W.landmarkGroup = group;
    return group;
  };

  W.updateLandmarkVisibility = function (camPos, range) {
    var r2 = (range||2200)*(range||2200);
    for (var i = 0; i < W.landmarks.length; i++) {
      var lm = W.landmarks[i];
      if (!lm.mesh) continue;
      var dx = lm.x-camPos.x, dz = lm.z-camPos.z;
      lm.mesh.visible = (dx*dx + dz*dz) < r2;
    }
  };

  W.Environment = Environment;
})(window);
