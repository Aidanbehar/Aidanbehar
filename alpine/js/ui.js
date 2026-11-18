/* Alpine Descent — ui.js : HUD, menus, garage, settings, results, region map. */
(function (root) {
  'use strict';
  var MTB = root.MTB, T = MTB.Terrain;
  var M = MTB.math, clamp = M.clamp;
  var UI = MTB.UI = { el:{}, mapView:{ cx:0, cz:0, scale:0.115 } };
  function $(id) { return document.getElementById(id); }
  UI.$ = $;

  UI.init = function (game) {
    UI.game = game;
    ['loading','loadingBar','loadingText','title','titleStats','panel','panelTitle','panelBody',
     'panelBack','hud','speedVal','altVal','clockVal','phaseVal','distVal','scoreVal','coinVal',
     'cpVal','cpRow','timerRow','timerVal','splitVal','trickPop','toast','compass','minimap',
     'mapOverlay','mapCanvas','mapInfo','pause','pauseInfo','results','resultsBody','resultsTitle',
     'crashMsg','modeTag','weatherTag','objective','biomeVal','gradeVal','fps','stuckHint'
    ].forEach(function (id) { UI.el[id] = $(id); });
    UI.miniCtx = UI.el.minimap ? UI.el.minimap.getContext('2d') : null;
    UI.mapCtx = UI.el.mapCanvas ? UI.el.mapCanvas.getContext('2d') : null;
  };

  UI.screens = ['loading','title','panel','pause','results'];
  UI.showScreen = function (name) {
    UI.screens.forEach(function (s) {
      var e = UI.el[s]; if (e) e.classList.toggle('visible', s === name);
    });
    UI.current = name;
    document.body.classList.toggle('in-menu', !!name);
  };
  UI.hideScreens = function () { UI.showScreen(null); };
  UI.setLoading = function (p, text) {
    if (UI.el.loadingBar) UI.el.loadingBar.style.width = (p*100).toFixed(1) + '%';
    if (UI.el.loadingText) UI.el.loadingText.textContent = text;
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; });
  }
  UI.esc = esc;

  UI.toast = function (title, sub, kind, ms) {
    var wrap = UI.el.toast; if (!wrap) return;
    var d = document.createElement('div');
    d.className = 'toast-item ' + (kind||'');
    d.innerHTML = '<div class="toast-title">'+esc(title)+'</div>' +
      (sub ? '<div class="toast-sub">'+esc(sub)+'</div>' : '');
    wrap.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('in'); });
    setTimeout(function () { d.classList.remove('in'); setTimeout(function () { d.remove(); }, 420); }, ms||3200);
  };

  var trickTimer = 0;
  UI.showTrick = function (r) {
    var e = UI.el.trickPop; if (!e) return;
    e.innerHTML = '<div class="trick-name">'+esc(r.names.length?r.names.join(' + '):'Air')+'</div>' +
      '<div class="trick-pts">+'+r.points.toLocaleString()+'</div>' +
      (r.combo>1 ? '<div class="trick-combo">x'+r.combo+' COMBO</div>' : '');
    e.classList.add('visible'); trickTimer = 1.9;
  };
  UI.showCrash = function (reason) {
    var e = UI.el.crashMsg; if (!e) return;
    e.textContent = { landing:'CASED IT', impact:'HARD LANDING', otb:'OVER THE BARS',
      roll:'WASHED OUT', wall:'INTO THE ROCKS', void:'OFF THE MAP', manual:'RESET'
    }[reason] || 'CRASH';
    e.classList.add('visible');
    setTimeout(function () { e.classList.remove('visible'); }, 1500);
  };

  function fmtTime(t) {
    if (t === null || t === undefined) return '--:--.--';
    var m = Math.floor(t/60), s = t - m*60;
    return m + ':' + (s<10?'0':'') + s.toFixed(2);
  }
  UI.fmtTime = fmtTime;

  var fpsAcc = 0, fpsN = 0, fpsVal = 0;
  UI.updateHUD = function (g, dt) {
    var b = g.bike, e = UI.el;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { fpsVal = Math.round(fpsN/fpsAcc); fpsAcc = 0; fpsN = 0; }
    if (e.fps) e.fps.textContent = fpsVal + ' FPS · ' + g.streamer.stats.chunks + ' chunks · ' +
                                   g.streamer.stats.veg + ' veg';
    if (e.speedVal) e.speedVal.textContent = Math.round(b.speed*3.6);
    if (e.altVal) e.altVal.textContent = Math.round(b.pos.y).toLocaleString();
    if (e.clockVal) e.clockVal.textContent = g.env.clockString();
    if (e.phaseVal) e.phaseVal.textContent = g.env.phaseName();
    if (e.weatherTag) e.weatherTag.textContent = g.env.weather.name;
    if (e.distVal) {
      var km = b.distance/1000;
      e.distVal.textContent = km >= 1 ? km.toFixed(2)+' km' : Math.round(b.distance)+' m';
    }
    if (e.scoreVal) e.scoreVal.textContent = b.sessionScore.toLocaleString();
    if (e.coinVal) e.coinVal.textContent = MTB.Save.data.coins.toLocaleString();
    if (e.biomeVal) e.biomeVal.textContent = T.BIOME_NAMES[T.biomeAt(b.pos.x, b.pos.z, b.pos.y)];
    if (e.gradeVal) {
      var gr = clamp(g.currentGrade, -0.99, 0.99)*100;
      e.gradeVal.textContent = (gr>0?'+':'') + gr.toFixed(0) + '%';
      e.gradeVal.className = 'val ' + (gr < -8 ? 'down' : gr > 8 ? 'up' : '');
    }
    var run = g.run;
    if (e.cpRow) e.cpRow.style.display = run && run.course ? '' : 'none';
    if (e.timerRow) e.timerRow.style.display = run && run.timed ? '' : 'none';
    if (run && run.course && e.cpVal)
      e.cpVal.textContent = run.cpIndex + ' / ' + run.course.checkpoints.length;
    if (run && run.timed) {
      if (e.timerVal) e.timerVal.textContent = fmtTime(run.time);
      if (e.splitVal) {
        if (run.lastSplitDelta !== null && run.lastSplitDelta !== undefined) {
          e.splitVal.textContent = (run.lastSplitDelta>=0?'+':'') + run.lastSplitDelta.toFixed(2);
          e.splitVal.className = 'split ' + (run.lastSplitDelta<0?'good':'bad');
        } else e.splitVal.textContent = '';
      }
    }
    if (e.objective) e.objective.textContent = g.objectiveText || '';
    if (e.modeTag) e.modeTag.textContent = g.modeName;

    UI.drawCompass(g); UI.drawMinimap(g);
    if (trickTimer > 0) { trickTimer -= dt; if (trickTimer <= 0 && e.trickPop) e.trickPop.classList.remove('visible'); }
  };

  UI.drawCompass = function (g) {
    var c = UI.el.compass; if (!c) return;
    var ctx = c.getContext('2d'), w = c.width, h = c.height;
    ctx.clearRect(0,0,w,h);
    ctx.font = '600 11px ui-monospace, monospace'; ctx.textAlign = 'center';
    var head = ((-g.bike.yaw*180/Math.PI)%360 + 360)%360;
    [['N',0],['NE',45],['E',90],['SE',135],['S',180],['SW',225],['W',270],['NW',315]].forEach(function (d) {
      var rel = ((d[1]-head+540)%360)-180;
      if (Math.abs(rel) > 70) return;
      var x = w/2 + (rel/70)*(w/2-14), a = 1 - Math.abs(rel)/80;
      ctx.fillStyle = 'rgba(235,242,255,'+a.toFixed(2)+')';
      ctx.fillText(d[0], x, 14); ctx.fillRect(x-0.5, 18, 1, 5);
    });
    if (MTB.World.waypoint) {
      var wp = MTB.World.waypoint;
      var bear = Math.atan2(wp.x-g.bike.pos.x, wp.z-g.bike.pos.z)*180/Math.PI;
      var rel2 = ((bear - g.bike.yaw*180/Math.PI + 540)%360)-180;
      if (Math.abs(rel2) < 70) {
        var x2 = w/2 + (rel2/70)*(w/2-14);
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath(); ctx.moveTo(x2,24); ctx.lineTo(x2-4,30); ctx.lineTo(x2+4,30);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.fillStyle = '#7fd8ff'; ctx.fillRect(w/2-1, 0, 2, 8);
  };

  /* --- region map --------------------------------------------------------- */
  var baseMap = null, baseSize = 0;
  UI.buildBaseMap = function () {
    var n = T.GRID_N, cv = document.createElement('canvas');
    cv.width = n; cv.height = n;
    var ctx = cv.getContext('2d'), img = ctx.createImageData(n,n), d = img.data, col = [0,0,0];
    for (var gz = 0; gz < n; gz++) for (var gx = 0; gx < n; gx++) {
      var h = T.gridHeight(gx,gz), w = T.gridIndexToWorld(gx,gz);
      var nx = (T.gridHeight(gx-1,gz)-T.gridHeight(gx+1,gz))/(2*T.GRID_STEP);
      var nz = (T.gridHeight(gx,gz-1)-T.gridHeight(gx,gz+1))/(2*T.GRID_STEP);
      var len = Math.sqrt(nx*nx+1+nz*nz); nx/=len; var ny=1/len; nz/=len;
      if (h < T.SEA || T.inLake(w.x,w.z)) { col[0]=0.16; col[1]=0.30; col[2]=0.45; }
      else T.colorAt(w.x, w.z, h, clamp(Math.sqrt(nx*nx+nz*nz)*1.6,0,1), 0, col);
      var shade = 0.42 + clamp(nx*-0.55 + ny*0.62 + nz*-0.55, 0, 1)*0.92;
      var alt = clamp((h-200)/2600, 0, 1), i = (gz*n+gx)*4;
      d[i]   = clamp(col[0]*shade*255 + alt*34, 0, 255);
      d[i+1] = clamp(col[1]*shade*255 + alt*34, 0, 255);
      d[i+2] = clamp(col[2]*shade*255 + alt*40, 0, 255);
      d[i+3] = 255;
    }
    ctx.putImageData(img,0,0);
    var up = document.createElement('canvas'); up.width = up.height = 1024;
    var uc = up.getContext('2d'); uc.imageSmoothingEnabled = true;
    uc.drawImage(cv, 0,0, 1024,1024);
    uc.save(); uc.globalAlpha = 0.20; uc.strokeStyle = '#1a1208'; uc.lineWidth = 1;
    var px = 1024/n;
    for (var lev = 250; lev < 3400; lev += 250) {
      uc.beginPath();
      for (var z2 = 0; z2 < n-1; z2++) for (var x2 = 0; x2 < n-1; x2++) {
        var a = T.gridHeight(x2,z2);
        if ((a<lev) !== (T.gridHeight(x2+1,z2)<lev)) {
          uc.moveTo((x2+0.5)*px,(z2+0.5)*px); uc.lineTo((x2+1.5)*px,(z2+0.5)*px); }
        if ((a<lev) !== (T.gridHeight(x2,z2+1)<lev)) {
          uc.moveTo((x2+0.5)*px,(z2+0.5)*px); uc.lineTo((x2+0.5)*px,(z2+1.5)*px); }
      }
      uc.stroke();
    }
    uc.restore();
    baseMap = up; baseSize = 1024;
  };
  UI.hasBaseMap = function () { return !!baseMap; };

  var TRAIL_COL = { downhill:'#e0503a', singletrack:'#e8b13c', fireroad:'#cfd6df',
    forest:'#63c46a', ridge:'#7fb6ff', canyon:'#d98a4a', hidden:'#c77ff0' };

  UI.drawMap = function (g, ctx, Wd, Ht, view) {
    ctx.save();
    ctx.fillStyle = '#0a0d14'; ctx.fillRect(0,0,Wd,Ht);
    if (!baseMap) { ctx.restore(); return; }
    var scale = view.scale, drawScale = scale / (baseSize/T.WORLD);
    var ox = Wd/2 - (view.cx + T.HALF)*scale, oy = Ht/2 - (view.cz + T.HALF)*scale;
    ctx.drawImage(baseMap, 0,0,baseSize,baseSize, ox,oy, baseSize*drawScale, baseSize*drawScale);
    function tx(x) { return ox + (x + T.HALF)*scale; }
    function ty(z) { return oy + (z + T.HALF)*scale; }

    var Tr = MTB.Trails;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var e = 0; e < Tr.edges.length; e++) {
      var ed = Tr.edges[e];
      if (ed.hidden && !MTB.Save.isDiscovered('trail:'+ed.name)) continue;
      ctx.strokeStyle = TRAIL_COL[ed.kind] || '#ddd';
      ctx.lineWidth = Math.max(0.8, (ed.kind==='fireroad'?2.4:1.5)*clamp(scale*22,0.5,2.4));
      ctx.globalAlpha = 0.88; ctx.beginPath();
      var step = scale < 0.03 ? 8 : 3;
      for (var i = 0; i < ed.pts.length; i += step) {
        var p = ed.pts[i];
        if (i === 0) ctx.moveTo(tx(p.x), ty(p.z)); else ctx.lineTo(tx(p.x), ty(p.z));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (g.run && g.run.course) {
      var cp = g.run.course.pts;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.6, 3*clamp(scale*20,0.6,2.2));
      ctx.globalAlpha = 0.9; ctx.setLineDash([6,5]); ctx.beginPath();
      for (var ci = 0; ci < cp.length; ci += 3) {
        if (ci === 0) ctx.moveTo(tx(cp[ci].x), ty(cp[ci].z)); else ctx.lineTo(tx(cp[ci].x), ty(cp[ci].z));
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      g.run.course.checkpoints.forEach(function (c, idx) {
        ctx.fillStyle = c.passed ? '#5fd37a' : (idx === g.run.cpIndex ? '#ffd24a' : '#fff');
        ctx.beginPath(); ctx.arc(tx(c.x), ty(c.z), 3.6, 0, 6.283); ctx.fill();
      });
    }

    var Wo = MTB.World, labels = scale > 0.020;
    ctx.textAlign = 'center';
    Wo.landmarks.forEach(function (lm) {
      var X = tx(lm.x), Y = ty(lm.z);
      if (X<-40||X>Wd+40||Y<-40||Y>Ht+40) return;
      var known = lm.discovered || MTB.Save.isDiscovered(lm.name);
      ctx.save(); ctx.globalAlpha = known?1:0.42;
      var c2 = { peak:'#fff', lake:'#5fb6e8', viewpoint:'#ffd24a', cabin:'#d9a26a',
        waterfall:'#9fe0ff', cave:'#b79bd8', arch:'#e0b48a', canyon:'#e08a5a',
        bridge:'#c8b18a' }[lm.type] || '#ccc';
      ctx.strokeStyle = c2; ctx.fillStyle = c2; ctx.lineWidth = 1.5;
      if (lm.type === 'peak') {
        ctx.beginPath(); ctx.moveTo(X-6,Y+4); ctx.lineTo(X,Y-6); ctx.lineTo(X+6,Y+4);
        ctx.closePath(); ctx.stroke();
      } else if (lm.type === 'lake') { ctx.beginPath(); ctx.ellipse(X,Y,6,4,0,0,6.283); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(X,Y,3.6,0,6.283); ctx.stroke(); }
      ctx.restore();
      if (labels && known) {
        ctx.font = '600 10px system-ui, sans-serif';
        var tw = ctx.measureText(lm.name).width;
        ctx.fillStyle = 'rgba(12,14,20,0.75)'; ctx.fillRect(X-tw/2-3, Y+7, tw+6, 13);
        ctx.fillStyle = '#f0f4fb'; ctx.fillText(lm.name, X, Y+17);
      }
    });

    Wo.stuntAreas.forEach(function (sa) {
      var X = tx(sa.x), Y = ty(sa.z);
      if (X<-30||X>Wd+30||Y<-30||Y>Ht+30) return;
      ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(X,Y,6,0,6.283); ctx.stroke();
      if (labels) { ctx.font='600 10px system-ui,sans-serif'; ctx.fillStyle='#ffb26b';
        ctx.fillText(sa.name, X, Y-10); }
    });
    Wo.courses.forEach(function (co) {
      var X = tx(co.start.x), Y = ty(co.start.z);
      if (X<-30||X>Wd+30||Y<-30||Y>Ht+30) return;
      ctx.fillStyle = '#7fd8ff';
      ctx.beginPath(); ctx.moveTo(X,Y-6); ctx.lineTo(X+5,Y+4); ctx.lineTo(X-5,Y+4);
      ctx.closePath(); ctx.fill();
      if (labels) { ctx.font='600 10px system-ui,sans-serif'; ctx.fillStyle='#a9e6ff';
        ctx.fillText(co.name, X, Y-9); }
    });

    if (Wo.waypoint) {
      var wx = tx(Wo.waypoint.x), wy = ty(Wo.waypoint.z);
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(wx,wy,8,0,6.283); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx-12,wy); ctx.lineTo(wx+12,wy);
      ctx.moveTo(wx,wy-12); ctx.lineTo(wx,wy+12); ctx.stroke();
    }

    ctx.save();
    ctx.translate(tx(g.bike.pos.x), ty(g.bike.pos.z));
    ctx.rotate(-g.bike.yaw + Math.PI);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0b0e14'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(6,7); ctx.lineTo(0,3.5); ctx.lineTo(-6,7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();
  };

  UI.drawMinimap = function (g) {
    if (!UI.miniCtx || !baseMap) return;
    var c = UI.el.minimap;
    UI.drawMap(g, UI.miniCtx, c.width, c.height,
      { cx:g.bike.pos.x, cz:g.bike.pos.z, scale:0.085 });
    UI.miniCtx.strokeStyle = 'rgba(255,255,255,0.22)'; UI.miniCtx.lineWidth = 2;
    UI.miniCtx.strokeRect(1,1,c.width-2,c.height-2);
  };

  UI.openMap = function (g) {
    var ov = UI.el.mapOverlay; if (!ov) return;
    ov.classList.add('visible');
    UI.mapView.cx = g.bike.pos.x; UI.mapView.cz = g.bike.pos.z;
    UI.mapOpen = true; UI.resizeMap(); UI.renderBigMap(g);
  };
  UI.closeMap = function () {
    if (UI.el.mapOverlay) UI.el.mapOverlay.classList.remove('visible');
    UI.mapOpen = false;
  };
  UI.resizeMap = function () {
    var c = UI.el.mapCanvas; if (!c) return;
    var r = c.parentElement.getBoundingClientRect();
    c.width = Math.floor(r.width); c.height = Math.floor(r.height);
  };
  UI.renderBigMap = function (g) {
    if (!UI.mapOpen || !UI.mapCtx) return;
    var c = UI.el.mapCanvas;
    UI.drawMap(g, UI.mapCtx, c.width, c.height, UI.mapView);
    if (UI.el.mapInfo) {
      var wp = MTB.World.waypoint;
      UI.el.mapInfo.innerHTML =
        '<b>'+esc(T.BIOME_NAMES[T.biomeAt(g.bike.pos.x,g.bike.pos.z,g.bike.pos.y)])+'</b> &middot; ' +
        Math.round(g.bike.pos.y).toLocaleString()+' m &middot; Region ' +
        (T.WORLD/1000).toFixed(1)+' km &times; '+(T.WORLD/1000).toFixed(1)+' km<br>' +
        '<span class="dim">' + (wp ? 'Waypoint '+Math.round(Math.hypot(wp.x-g.bike.pos.x, wp.z-g.bike.pos.z))+' m away'
                                   : 'Click the map to set a waypoint') +
        ' &middot; ' + MTB.Save.discoveredCount()+'/'+MTB.World.landmarks.length+' locations found</span>';
    }
  };

  UI.bindMapControls = function (g) {
    var c = UI.el.mapCanvas; if (!c) return;
    var dragging = false, lx = 0, ly = 0, moved = 0;
    c.addEventListener('mousedown', function (ev) { dragging = true; moved = 0; lx = ev.clientX; ly = ev.clientY; });
    root.addEventListener('mouseup', function (ev) {
      if (dragging && moved < 5) {
        var r = c.getBoundingClientRect(), mx = ev.clientX-r.left, my = ev.clientY-r.top;
        if (mx>=0 && my>=0 && mx<=c.width && my<=c.height) {
          MTB.World.waypoint = { x:(mx-c.width/2)/UI.mapView.scale + UI.mapView.cx,
                                 z:(my-c.height/2)/UI.mapView.scale + UI.mapView.cz };
          g.audio.uiClick(); UI.renderBigMap(g);
        }
      }
      dragging = false;
    });
    root.addEventListener('mousemove', function (ev) {
      if (!dragging) return;
      var dx = ev.clientX-lx, dy = ev.clientY-ly;
      moved += Math.abs(dx)+Math.abs(dy); lx = ev.clientX; ly = ev.clientY;
      UI.mapView.cx -= dx/UI.mapView.scale; UI.mapView.cz -= dy/UI.mapView.scale;
      UI.mapView.cx = clamp(UI.mapView.cx,-T.HALF,T.HALF);
      UI.mapView.cz = clamp(UI.mapView.cz,-T.HALF,T.HALF);
      UI.renderBigMap(g);
    });
    c.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      UI.mapView.scale = clamp(UI.mapView.scale * (ev.deltaY<0?1.18:1/1.18), 0.012, 0.9);
      UI.renderBigMap(g);
    }, { passive:false });
    function on(id, fn) { var e = $(id); if (e) e.onclick = function () { fn(); UI.renderBigMap(g); }; }
    on('mapZoomIn', function () { UI.mapView.scale = clamp(UI.mapView.scale*1.4,0.012,0.9); });
    on('mapZoomOut', function () { UI.mapView.scale = clamp(UI.mapView.scale/1.4,0.012,0.9); });
    on('mapCenter', function () { UI.mapView.cx = g.bike.pos.x; UI.mapView.cz = g.bike.pos.z; UI.mapView.scale = 0.12; });
    on('mapFit', function () {
      var c2 = UI.el.mapCanvas;
      UI.mapView.cx = 0; UI.mapView.cz = 0;
      UI.mapView.scale = Math.min(c2.width, c2.height)/T.WORLD;
    });
    on('mapClearWp', function () { MTB.World.waypoint = null; });
  };

  /* --- panels ------------------------------------------------------------- */
  UI.openPanel = function (title, html, onBack) {
    UI.el.panelTitle.textContent = title;
    UI.el.panelBody.innerHTML = html;
    UI.showScreen('panel');
    UI.el.panelBack.onclick = function () {
      UI.game.audio.uiBack();
      if (onBack) onBack(); else UI.showScreen('title');
    };
  };

  UI.courseList = function (g, mode) {
    var rows = MTB.World.courses.map(function (co) {
      var rec = MTB.Save.data.courseRecords[co.id];
      return '<div class="row"><div class="row-main">' +
        '<div class="row-title">'+esc(co.name)+' <span class="diff '+
          co.difficulty.toLowerCase().replace(' ','-')+'">'+esc(co.difficulty)+'</span></div>' +
        '<div class="row-sub">'+(co.length/1000).toFixed(2)+' km &middot; '+
          Math.round(co.drop)+' m descent &middot; '+co.checkpoints.length+' checkpoints &middot; par '+
          fmtTime(co.parTime)+'</div></div><div class="row-side">' +
        (rec ? '<div class="best">BEST<br><b>'+fmtTime(rec.time)+'</b></div>'
             : '<div class="best dim">NO TIME</div>') +
        '<button class="btn small" data-course="'+co.id+'">RIDE</button></div></div>';
    }).join('');
    UI.openPanel(mode==='timetrial' ? 'TIME TRIAL' : 'DOWNHILL COURSES',
      '<p class="lead">'+(mode==='timetrial'
        ? 'Beat the clock. Every checkpoint split is recorded and your best run is saved.'
        : 'Point it downhill. Miss a checkpoint and you restart from the last one you cleared, not the top.')+
      '</p><div class="list">'+rows+'</div>');
    UI.el.panelBody.querySelectorAll('button[data-course]').forEach(function (b) {
      b.onclick = function () { g.audio.uiClick(); g.startCourse(b.getAttribute('data-course'), mode==='timetrial'); };
    });
  };

  UI.stuntList = function (g) {
    var rows = MTB.World.stuntAreas.map(function (sa) {
      var rec = MTB.Save.data.stuntRecords[sa.id];
      return '<div class="row"><div class="row-main">' +
        '<div class="row-title">'+esc(sa.name)+'</div><div class="row-sub">Target '+
        sa.target.toLocaleString()+' pts &middot; '+sa.duration+'s &middot; reward '+sa.reward+
        ' ¤ &middot; '+Math.round(sa.y)+' m elevation</div></div><div class="row-side">' +
        (rec ? '<div class="best">BEST<br><b>'+rec.score.toLocaleString()+'</b></div>'
             : '<div class="best dim">UNRIDDEN</div>') +
        '<button class="btn small" data-stunt="'+sa.id+'">DROP IN</button></div></div>';
    }).join('');
    UI.openPanel('STUNT CHALLENGES',
      '<p class="lead">Jump lines cut into the mountain. Rack up flips, spins and gaps before the clock runs out.</p>' +
      '<div class="list">'+rows+'</div>');
    UI.el.panelBody.querySelectorAll('button[data-stunt]').forEach(function (b) {
      b.onclick = function () { g.audio.uiClick(); g.startStunt(b.getAttribute('data-stunt')); };
    });
  };

  UI.garage = function (g) {
    var save = MTB.Save.data;
    UI.openPanel('GARAGE',
      '<div class="garage"><div class="garage-view"><canvas id="garageCanvas"></canvas>' +
      '<div class="garage-hint">drag to rotate</div></div><div class="garage-side">' +
      '<div class="tabs"><button class="tab active" data-tab="bikes">BIKES</button>' +
      '<button class="tab" data-tab="paint">PAINT</button>' +
      '<button class="tab" data-tab="rider">RIDER</button></div><div id="garageTab"></div></div></div>');
    g.openGarage();

    function bar(label, v) {
      return '<div class="stat"><span>'+label+'</span><i><u style="width:'+
        Math.round(clamp(v,0,1)*100)+'%"></u></i></div>';
    }
    function render(tab) {
      var host = $('garageTab');
      if (tab === 'bikes') {
        host.innerHTML = MTB.BIKES.map(function (b) {
          var owned = MTB.Save.ownsBike(b.id), active = save.currentBike === b.id;
          return '<div class="bike-card'+(active?' active':'')+'" data-bike="'+b.id+'">' +
            '<div class="bike-head"><b>'+esc(b.name)+'</b><span class="klass">'+esc(b.klass)+'</span></div>'+
            '<div class="blurb">'+esc(b.blurb)+'</div><div class="stats">'+
            bar('SPEED',(b.topSpeed-19)/11)+bar('PEDAL',(b.pedal-0.7)/0.7)+
            bar('BRAKES',(b.brakeF-0.9)/0.4)+bar('GRIP',(b.grip-0.9)/0.35)+
            bar('SUSPENSION',b.travelF/0.21)+bar('STABILITY',(b.stability-0.7)/0.6)+
            bar('AIR',(b.airControl-0.85)/0.5)+'</div><div class="bike-foot">'+
            (owned ? '<button class="btn small" data-select="'+b.id+'">'+(active?'SELECTED':'SELECT')+'</button>'
                   : '<button class="btn small buy'+(save.coins>=b.price?'':' disabled')+
                     '" data-buy="'+b.id+'">UNLOCK &middot; '+b.price.toLocaleString()+' ¤</button>')+
            '</div></div>';
        }).join('');
        host.querySelectorAll('[data-select]').forEach(function (btn) {
          btn.onclick = function () {
            g.audio.uiClick(); save.currentBike = btn.getAttribute('data-select');
            MTB.Save.save(); g.rebuildBike(); render('bikes');
          };
        });
        host.querySelectorAll('[data-buy]').forEach(function (btn) {
          btn.onclick = function () {
            var id = btn.getAttribute('data-buy'), spec = MTB.bikeById(id);
            if (MTB.Save.buyBike(id, spec.price)) {
              g.audio.discover(); UI.toast('Unlocked', spec.name, 'good');
              save.currentBike = id; MTB.Save.save(); g.rebuildBike();
            } else {
              g.audio.uiBack();
              UI.toast('Not enough currency', (spec.price-save.coins).toLocaleString()+' ¤ short', 'bad');
            }
            render('bikes');
          };
        });
        host.querySelectorAll('.bike-card').forEach(function (card) {
          card.onclick = function (ev) {
            if (ev.target.tagName === 'BUTTON') return;
            g.previewBike(card.getAttribute('data-bike'));
          };
        });
      } else if (tab === 'paint') {
        var cur = save.customisation[save.currentBike] || {};
        function sw(list, key, val) {
          return '<div class="swatches">'+list.map(function (c) {
            return '<button class="sw'+(val===c.hex?' on':'')+'" data-'+key+'="'+c.hex+
              '" style="background:#'+c.hex.toString(16).padStart(6,'0')+'" title="'+c.name+'"></button>';
          }).join('')+'</div>';
        }
        host.innerHTML = '<div class="opt-group"><div class="opt-label">FRAME</div>'+
          sw(MTB.FRAME_COLORS,'frame',cur.frame)+'</div>'+
          '<div class="opt-group"><div class="opt-label">WHEELS</div>'+
          sw(MTB.RIM_COLORS,'rim',cur.rim)+'</div>'+
          '<p class="dim small">Paint is cosmetic. Every bike rides exactly as its spec sheet says.</p>';
        ['frame','rim'].forEach(function (key) {
          host.querySelectorAll('[data-'+key+']').forEach(function (b) {
            b.onclick = function () {
              save.customisation[save.currentBike] = save.customisation[save.currentBike] || {};
              save.customisation[save.currentBike][key] = parseInt(b.getAttribute('data-'+key),10);
              MTB.Save.save(); g.rebuildBike(); g.audio.uiClick(); render('paint');
            };
          });
        });
      } else {
        var r = save.rider;
        function kit(label, key, val) {
          return '<div class="opt-group"><div class="opt-label">'+label+'</div><div class="swatches">'+
            MTB.KIT_COLORS.map(function (c) {
              return '<button class="sw'+(val===c.hex?' on':'')+'" data-kit="'+key+'" data-hex="'+c.hex+
                '" style="background:#'+c.hex.toString(16).padStart(6,'0')+'" title="'+c.name+'"></button>';
            }).join('')+'</div></div>';
        }
        host.innerHTML = kit('JERSEY','jersey',r.jersey)+kit('SHORTS','pants',r.pants)+
          kit('HELMET','helmetColor',r.helmetColor)+kit('GLOVES','gloves',r.gloves)+
          '<div class="opt-group"><div class="opt-label">HELMET STYLE</div><div class="chips">'+
          MTB.HELMETS.map(function (h) {
            return '<button class="chip'+(r.helmetStyle===h.id?' on':'')+'" data-helmet="'+h.id+'">'+h.name+'</button>';
          }).join('')+'<button class="chip'+(r.goggles?' on':'')+'" data-goggles="1">Goggles</button></div></div>';
        host.querySelectorAll('[data-kit]').forEach(function (b) {
          b.onclick = function () {
            r[b.getAttribute('data-kit')] = parseInt(b.getAttribute('data-hex'),10);
            MTB.Save.save(); g.rebuildBike(); g.audio.uiClick(); render('rider');
          };
        });
        host.querySelectorAll('[data-helmet]').forEach(function (b) {
          b.onclick = function () {
            r.helmetStyle = b.getAttribute('data-helmet');
            MTB.Save.save(); g.rebuildBike(); g.audio.uiClick(); render('rider');
          };
        });
        var gg = host.querySelector('[data-goggles]');
        if (gg) gg.onclick = function () {
          r.goggles = !r.goggles; MTB.Save.save(); g.rebuildBike(); g.audio.uiClick(); render('rider');
        };
      }
    }
    UI.el.panelBody.querySelectorAll('.tab').forEach(function (t) {
      t.onclick = function () {
        UI.el.panelBody.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active'); g.audio.uiClick(); render(t.getAttribute('data-tab'));
      };
    });
    render('bikes');
    UI.el.panelBack.onclick = function () { g.audio.uiBack(); g.closeGarage(); UI.showScreen('title'); };
  };

  UI.settings = function (g) {
    var s = MTB.Save.data.settings;
    function slider(label, key, min, max, step, val, unit) {
      return '<div class="opt-group"><div class="opt-label">'+label+' <b id="v_'+key+'">'+val+unit+
        '</b></div><input type="range" data-set="'+key+'" data-unit="'+unit+'" min="'+min+'" max="'+max+
        '" step="'+step+'" value="'+val+'"></div>';
    }
    function toggle(label, key, val) {
      return '<div class="opt-group inline"><div class="opt-label">'+label+'</div>'+
        '<button class="chip toggle'+(val?' on':'')+'" data-toggle="'+key+'">'+(val?'ON':'OFF')+'</button></div>';
    }
    function ctl(k, d) { return '<div class="ctl"><kbd>'+k+'</kbd><span>'+d+'</span></div>'; }
    UI.openPanel('SETTINGS',
      '<div class="settings"><div class="opt-group"><div class="opt-label">QUALITY PRESET</div><div class="chips">'+
      ['low','medium','high','ultra'].map(function (p) {
        return '<button class="chip'+(s.quality===p?' on':'')+'" data-preset="'+p+'">'+p.toUpperCase()+'</button>';
      }).join('')+'</div></div>'+
      slider('Draw distance','drawDistance',0.5,2.0,0.05,s.drawDistance,'x')+
      slider('Vegetation density','vegetation',0,2.0,0.05,s.vegetation,'x')+
      toggle('Shadows','shadows',s.shadows)+
      slider('Field of view','fov',55,100,1,s.fov,'°')+
      slider('Camera sensitivity','sensitivity',0.2,2.5,0.05,s.sensitivity,'x')+
      toggle('Invert camera Y','invertY',s.invertY)+
      slider('Sound volume','sfx',0,1,0.05,s.sfx,'')+
      slider('Music volume','music',0,1,0.05,s.music,'')+
      '<div class="opt-group"><div class="opt-label">WEATHER</div><div class="chips">'+
      ['dynamic'].concat(MTB.WEATHER.map(function (w) { return w.id; })).map(function (w) {
        return '<button class="chip'+(s.weather===w?' on':'')+'" data-weather="'+w+'">'+w.toUpperCase()+'</button>';
      }).join('')+'</div></div>'+
      '<div class="opt-group"><div class="opt-label">CONTROLS</div><div class="controls-grid">'+
      ctl('W','Pedal')+ctl('A / D','Steer and lean')+ctl('S','Rear brake')+ctl('SPACE','Front brake')+
      ctl('↑ / ↓','Shift weight — wheelie / nose manual')+ctl('C','Change camera')+ctl('R','Reset bike')+
      ctl('M','Region map')+ctl('T','Skip time of day')+ctl('ESC','Pause')+
      ctl('Air: W / S','Front / back flip')+ctl('Air: A / D','Spin')+ctl('Air: Q / E','Barrel roll')+
      ctl('Mouse','Look around')+'</div></div>'+
      '<div class="opt-group"><button class="btn danger" id="wipeSave">ERASE ALL PROGRESS</button></div></div>');

    UI.el.panelBody.querySelectorAll('input[type=range]').forEach(function (inp) {
      inp.oninput = function () {
        var key = inp.getAttribute('data-set'), v = parseFloat(inp.value);
        s[key] = v;
        var lab = $('v_'+key); if (lab) lab.textContent = v + inp.getAttribute('data-unit');
        g.applySettings();
      };
      inp.onchange = function () { MTB.Save.save(); };
    });
    UI.el.panelBody.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.onclick = function () {
        var key = b.getAttribute('data-toggle');
        s[key] = !s[key]; b.classList.toggle('on', s[key]); b.textContent = s[key]?'ON':'OFF';
        MTB.Save.save(); g.applySettings(); g.audio.uiClick();
      };
    });
    UI.el.panelBody.querySelectorAll('[data-preset]').forEach(function (b) {
      b.onclick = function () { g.applyPreset(b.getAttribute('data-preset')); g.audio.uiClick(); UI.settings(g); };
    });
    UI.el.panelBody.querySelectorAll('[data-weather]').forEach(function (b) {
      b.onclick = function () {
        s.weather = b.getAttribute('data-weather');
        MTB.Save.save(); g.applySettings(); g.audio.uiClick();
        UI.el.panelBody.querySelectorAll('[data-weather]').forEach(function (x) { x.classList.toggle('on', x===b); });
      };
    });
    var wipe = $('wipeSave');
    if (wipe) wipe.onclick = function () {
      if (wipe.dataset.armed) { MTB.Save.reset(); g.rebuildBike(); UI.toast('Progress erased','', 'bad'); UI.settings(g); }
      else { wipe.dataset.armed = '1'; wipe.textContent = 'CLICK AGAIN TO CONFIRM'; }
    };
  };

  UI.showResults = function (title, rows, buttons) {
    UI.el.resultsTitle.textContent = title;
    UI.el.resultsBody.innerHTML =
      '<div class="result-rows">'+rows.map(function (r) {
        return '<div class="result-row'+(r.hi?' hi':'')+'"><span>'+esc(r.k)+'</span><b>'+r.v+'</b></div>';
      }).join('')+'</div><div class="result-buttons">'+buttons.map(function (b) {
        return '<button class="btn" data-act="'+b.act+'">'+esc(b.label)+'</button>';
      }).join('')+'</div>';
    UI.showScreen('results');
  };
  UI.bindResults = function (handler) {
    UI.el.results.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]');
      if (b) handler(b.getAttribute('data-act'));
    });
  };
})(window);
