/* Alpine Descent — game.js : boot, world generation, cameras, modes, main loop. */
(function (root) {
  'use strict';
  var MTB = root.MTB, T = MTB.Terrain, Tr = MTB.Trails, W = MTB.World, UI = MTB.UI;
  var M = MTB.math, clamp = M.clamp, lerp = M.lerp;

  var PRESETS = {
    low:    { drawDistance:0.55, vegetation:0.35, shadows:false, lodFactor:1.6, shadowMap:1024,
              pixelRatio:0.85, clouds:false, budget:3, vegDistance:420 },
    medium: { drawDistance:0.85, vegetation:0.7,  shadows:true,  lodFactor:2.1, shadowMap:1024,
              pixelRatio:1.0, clouds:true, budget:4, vegDistance:600 },
    high:   { drawDistance:1.0,  vegetation:1.0,  shadows:true,  lodFactor:2.6, shadowMap:2048,
              pixelRatio:1.0, clouds:true, budget:4, vegDistance:760 },
    ultra:  { drawDistance:1.4,  vegetation:1.5,  shadows:true,  lodFactor:3.2, shadowMap:4096,
              pixelRatio:1.0, clouds:true, budget:5, vegDistance:1000 }
  };
  var CAMS = [
    { id:'third', name:'Third Person', dist:5.7, height:2.2, lag:5.5, fovAdd:0, look:7 },
    { id:'close', name:'Close Chase',  dist:3.5, height:1.5, lag:8.5, fovAdd:4, look:5 },
    { id:'first', name:'First Person', dist:0,   height:0,   lag:22,  fovAdd:6, look:14 },
    { id:'cine',  name:'Cinematic',    dist:15.5,height:6.2, lag:2.2, fovAdd:-6, look:12 }
  ];

  function Game() {
    this.mode = 'freeride'; this.modeName = 'FREE RIDE'; this.objectiveText = '';
    this.run = null; this.camIndex = 0; this.lookYaw = 0; this.lookPitch = 0;
    this.lookActive = 0; this.currentGrade = 0; this.paused = false; this.started = false;
    this.discoverTimer = 0; this.coinFrac = 0; this.stuckTimer = 0; this.gateGroup = null;
  }

  Game.prototype.init = function () {
    var self = this;
    MTB.Save.load();
    var canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true,
      powerPreference:'high-performance' });
    this.renderer.setPixelRatio(Math.min(root.devicePixelRatio||1, 1.5));
    this.renderer.setSize(root.innerWidth, root.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.ColorManagement) THREE.ColorManagement.enabled = true;
    if (this.renderer.outputColorSpace !== undefined) this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(MTB.Save.data.settings.fov,
      root.innerWidth/root.innerHeight, 0.35, 26000);
    this.audio = new MTB.Audio();
    UI.init(this);
    this.bindInput();
    root.addEventListener('resize', function () { self.onResize(); });
    UI.showScreen('loading');
    this.generate();
  };

  Game.prototype.onResize = function () {
    this.camera.aspect = root.innerWidth/root.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(root.innerWidth, root.innerHeight);
    if (UI.mapOpen) { UI.resizeMap(); UI.renderBigMap(this); }
  };

  Game.prototype.generate = function () {
    var self = this, seed = 20260913, rng = MTB.makeRNG(seed ^ 0x5f3a);
    var steps = [], edgeIndex = 0;

    steps.push(['Seeding the mountain region', function () { T.init(seed); }]);
    steps.push(['Raising mountain ranges', function () { return T.buildGridStep(22) < 1; }]);
    steps.push(['Filling alpine lakes', function () { T.placeLakes(6); }]);
    steps.push(['Surveying cliff bands', function () { return T.buildRoughStep(18) < 1; }]);
    steps.push(['Scouting trailheads', function () { Tr.buildNodes(rng); Tr.planEdges(rng); }]);
    steps.push(['Cutting singletrack', function () {
      var budget = 3;
      while (budget-- > 0 && edgeIndex < Tr._plan.length) { Tr.buildEdge(edgeIndex, rng); edgeIndex++; }
      self.genSub = edgeIndex / Tr._plan.length;
      return edgeIndex < Tr._plan.length;
    }]);
    steps.push(['Packing the tread', function () { Tr.finalize(); }]);
    steps.push(['Shaping jumps and drops', function () {
      W.placeFeatures(rng); W.buildStuntAreas(rng); W.installCarve();
    }]);
    steps.push(['Naming the summits', function () { W.buildLandmarks(rng); }]);
    steps.push(['Marking downhill courses', function () { W.buildCourses(); }]);
    steps.push(['Building the region map', function () { UI.buildBaseMap(); }]);
    steps.push(['Planting forests', function () {
      self.env = new W.Environment(self.scene, self.renderer);
      self.water = W.buildWater(self.scene);
      W.buildLandmarkMeshes(self.scene);
      self.streamer = new MTB.Streamer(self.scene, {});
      self.applyPreset(MTB.Save.data.settings.quality, true);
    }]);
    steps.push(['Rolling out the bike', function () {
      self.bike = new MTB.BikePhysics(MTB.bikeById(MTB.Save.data.currentBike));
      self.rebuildBike();
      self.spawnFreeRide();
    }]);
    steps.push(['Streaming terrain', function () {
      var left = self.streamer.update(self.bike.pos, 0.016);
      self.genSub = 1 - clamp(left/90, 0, 1);
      return left > 0;
    }]);

    var i = 0;
    function tick() {
      if (i >= steps.length) { self.onGenerated(); return; }
      self.genSub = 0;
      var repeat = steps[i][1]();
      UI.setLoading(clamp(i/steps.length + (self.genSub || (repeat?0.4:1))/steps.length, 0, 1), steps[i][0]);
      if (!repeat) i++;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  Game.prototype.onGenerated = function () {
    var self = this;
    UI.setLoading(1, 'Ready to ride');
    var hi = 0, name = '';
    W.landmarks.forEach(function (l) { if (l.type==='peak' && l.y > hi) { hi = l.y; name = l.name; } });
    var stats = document.getElementById('titleStats');
    if (stats) stats.innerHTML =
      '<span>'+(T.WORLD/1000).toFixed(1)+' &times; '+(T.WORLD/1000).toFixed(1)+' km of rideable mountain</span>'+
      '<span>'+Math.round(hi).toLocaleString()+' m &mdash; '+UI.esc(name)+'</span>'+
      '<span>'+Math.round(Tr.totalLength/1000)+' km of trail &middot; '+Tr.edges.length+' trails</span>'+
      '<span>'+W.courses.length+' downhill courses &middot; '+W.stuntAreas.length+
      ' stunt zones &middot; '+W.landmarks.length+' landmarks</span>';
    setTimeout(function () {
      UI.showScreen('title'); self.started = true;
      self.bindMenus(); UI.bindMapControls(self);
      UI.bindResults(function (a) { self.onResultAction(a); });
      self.loop();
    }, 380);
  };

  /* --- bike ---------------------------------------------------------------- */
  function disposeTree(o) {
    o.traverse(function (n) {
      if (n.geometry) n.geometry.dispose();
      if (n.material) { if (Array.isArray(n.material)) n.material.forEach(function (m) { m.dispose(); });
                        else n.material.dispose(); }
    });
  }
  Game.prototype.rebuildBike = function () {
    var save = MTB.Save.data, spec = MTB.bikeById(save.currentBike);
    var cust = save.customisation[spec.id] || {};
    if (this.bikeMesh) { this.scene.remove(this.bikeMesh); disposeTree(this.bikeMesh); }
    this.bikeMesh = MTB.buildBike(spec, {
      frame:cust.frame, rim:cust.rim, jersey:save.rider.jersey, pants:save.rider.pants,
      helmetColor:save.rider.helmetColor, gloves:save.rider.gloves,
      helmetStyle:save.rider.helmetStyle, goggles:save.rider.goggles });
    this.bikeMesh.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    this.scene.add(this.bikeMesh);
    if (this.bike) { this.bike.setSpec(spec); this.attachBikeEvents(); }
    if (this.garageOpen) this.previewBike(spec.id);
  };

  Game.prototype.attachBikeEvents = function () {
    var self = this;
    this.bike.onLand = function (impact, ok, trick) {
      self.audio.land(impact);
      if (trick) { UI.showTrick(trick); self.audio.trick(trick.points); }
    };
    this.bike.onTakeoff = function () { self.audio.hop(); };
    this.bike.onCrash = function (reason) {
      self.audio.crash(); UI.showCrash(reason);
      if (self.run) self.run.crashes++;
    };
  };

  /* --- spawning and modes ---------------------------------------------------- */
  Game.prototype.spawnFreeRide = function () {
    var best = null;
    for (var i = 0; i < Tr.nodes.length; i++) {
      var n = Tr.nodes[i];
      if (n.kind === 'peak' && (!best || n.h > best.h)) best = n;
    }
    if (!best) best = Tr.nodes[0];
    var near = Tr.nearestTrailPoint(best.x, best.z, 700);
    if (near) {
      // walk along the tread until the bike is standing on a surface rather
      // than straddling a lip, and always face it downhill
      var pts = near.edge.pts, idx = near.i, yaw = 0, ok = false;
      for (var tryI = 0; tryI < 40 && !ok; tryI++) {
        idx = Math.min(pts.length - 6, near.i + tryI*2);
        var p0 = pts[idx], p1 = pts[Math.min(pts.length-1, idx+4)];
        yaw = Math.atan2(p1.x-p0.x, p1.z-p0.z);
        if (p1.y > p0.y) yaw += Math.PI;
        ok = this.bike.standable(p0.x, p0.z, yaw);
      }
      this.bike.placeAt(pts[idx].x, pts[idx].z, yaw);
    } else this.bike.placeAt(best.x, best.z, 0);
  };

  Game.prototype.startFreeRide = function (fresh) {
    this.mode = 'freeride'; this.modeName = 'FREE RIDE';
    this.objectiveText = 'Ride anywhere. Find the landmarks.';
    this.clearRun();
    if (fresh) this.spawnFreeRide();
    this.enterPlay();
  };

  Game.prototype.startCourse = function (id, timed) {
    var course = null;
    for (var i = 0; i < W.courses.length; i++) if (W.courses[i].id === id) course = W.courses[i];
    if (!course) return;
    this.mode = timed ? 'timetrial' : 'downhill';
    this.modeName = timed ? 'TIME TRIAL' : 'DOWNHILL';
    this.clearRun();
    course.checkpoints.forEach(function (c) { c.passed = false; });
    this.run = { course:course, timed:true, time:0, cpIndex:0, splits:[], lastSplitDelta:null,
      progress:0, nearestDist:0, crashes:0, started:false, finished:false,
      startScore:this.bike.sessionScore, startDist:this.bike.distance, isTimeTrial:!!timed,
      lastCheckpoint:{ x:course.start.x, z:course.start.z, yaw:course.start.yaw } };
    this.buildGates(course);
    this.bike.placeAt(course.start.x, course.start.z, course.start.yaw);
    this.enterPlay();
    UI.toast(course.name, (course.length/1000).toFixed(2)+' km · '+Math.round(course.drop)+
      ' m descent · '+course.difficulty, 'info', 4200);
  };

  Game.prototype.startStunt = function (id) {
    var area = null;
    for (var i = 0; i < W.stuntAreas.length; i++) if (W.stuntAreas[i].id === id) area = W.stuntAreas[i];
    if (!area) return;
    this.mode = 'stunt'; this.modeName = 'STUNT CHALLENGE';
    this.clearRun();
    var pts = area.edge.pts, si = clamp(area.startIndex, 0, pts.length-6);
    var p = pts[si], p2 = pts[si+4];
    var yaw = Math.atan2(p2.x-p.x, p2.z-p.z);
    if (p2.y > p.y) yaw += Math.PI;
    this.run = { stunt:area, timed:true, time:0, remaining:area.duration,
      startScore:this.bike.sessionScore, score:0, finished:false, crashes:0,
      lastCheckpoint:{ x:p.x, z:p.z, yaw:yaw } };
    this.bike.placeAt(p.x, p.z, yaw);
    this.enterPlay();
    UI.toast(area.name, 'Target '+area.target.toLocaleString()+' points in '+area.duration+'s', 'info', 4200);
  };

  Game.prototype.clearRun = function () {
    this.run = null;
    if (this.gateGroup) { this.scene.remove(this.gateGroup); disposeTree(this.gateGroup); this.gateGroup = null; }
  };

  Game.prototype.enterPlay = function () {
    UI.hideScreens(); UI.closeMap();
    this.paused = false;
    this.audio.init(); this.audio.resume(); this.audio.duck(false);
    this.closeGarage();
    if (UI.el.hud) UI.el.hud.classList.add('visible');
    this.streamer.prime(this.bike.pos, 8);
    this.snapCamera();
  };

  Game.prototype.buildGates = function (course) {
    var g = new THREE.Group();
    var postMat = new THREE.MeshLambertMaterial({ color:0xe8e8ea });
    course.checkpoints.forEach(function (cp, i) {
      var gate = new THREE.Group(), Wd = 7.0, H = 4.6;
      var p1 = new THREE.CylinderGeometry(0.14,0.16,H,7); p1.translate(-Wd/2,H/2,0);
      var p2 = new THREE.CylinderGeometry(0.14,0.16,H,7); p2.translate(Wd/2,H/2,0);
      var top = new THREE.BoxGeometry(Wd,0.2,0.2); top.translate(0,H,0);
      var posts = new THREE.Mesh(MTB.mergeGeos([p1,p2,top]), postMat);
      posts.castShadow = true; gate.add(posts);
      var banner = new THREE.Mesh(new THREE.PlaneGeometry(Wd,1.5),
        new THREE.MeshLambertMaterial({ color: cp.finish?0x5fd37a:0xffd24a,
          side:THREE.DoubleSide, transparent:true, opacity:0.65 }));
      banner.position.set(0, H-0.85, 0); gate.add(banner);
      gate.position.set(cp.x, T.height(cp.x, cp.z), cp.z);
      gate.rotation.y = cp.yaw;
      gate.userData = { cp:cp, banner:banner, index:i };
      g.add(gate);
    });
    this.scene.add(g); this.gateGroup = g;
  };

  /* --- input ----------------------------------------------------------------- */
  Game.prototype.bindInput = function () {
    var self = this, keys = this.keys = {};
    this.input = { pedal:false, brakeRear:false, brakeFront:false, steer:0,
      leanBack:false, leanFwd:false, flipBack:false, flipFwd:false, airRoll:0 };
    root.addEventListener('keydown', function (e) {
      if (!e.repeat) { keys[e.code] = true; self.onKey(e); }
      if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    });
    root.addEventListener('keyup', function (e) { keys[e.code] = false; });
    root.addEventListener('blur', function () { for (var k in keys) keys[k] = false; });

    var canvas = document.getElementById('scene');
    canvas.addEventListener('mousedown', function () {
      if (self.inPlay() && !UI.mapOpen && canvas.requestPointerLock) canvas.requestPointerLock();
    });
    document.addEventListener('mousemove', function (e) {
      if (document.pointerLockElement !== canvas) return;
      var s = MTB.Save.data.settings;
      self.lookYaw = clamp(self.lookYaw - e.movementX*0.0022*s.sensitivity, -2.6, 2.6);
      self.lookPitch = clamp(self.lookPitch + (s.invertY?-1:1)*e.movementY*0.0018*s.sensitivity, -0.95, 1.15);
      self.lookActive = 1.2;
    });
  };

  Game.prototype.onKey = function (e) {
    switch (e.code) {
      case 'KeyC':
        if (this.inPlay()) {
          this.camIndex = (this.camIndex+1) % CAMS.length;
          UI.toast('Camera', CAMS[this.camIndex].name, 'info', 1300);
          this.audio.uiClick(); this.snapCamera();
        }
        break;
      case 'KeyR': if (this.inPlay()) this.resetBike(true); break;
      case 'KeyM':
        if (this.started && !UI.current) {
          if (UI.mapOpen) { UI.closeMap(); this.audio.uiBack(); }
          else { UI.openMap(this); this.audio.uiClick(); }
        }
        break;
      case 'KeyT':
        if (this.inPlay()) {
          this.env.timeOfDay = (this.env.timeOfDay + 0.08) % 1;
          UI.toast('Time', this.env.clockString()+' · '+this.env.phaseName(), 'info', 1400);
        }
        break;
      case 'Escape':
        if (UI.mapOpen) { UI.closeMap(); if (this.menuMapMode) { this.menuMapMode=false; UI.showScreen('title'); } return; }
        if (UI.current === 'panel') { UI.el.panelBack.onclick(); return; }
        if (UI.current === 'pause') { this.resume(); return; }
        if (UI.current === 'title' || UI.current === 'results') return;
        this.pause();
        break;
    }
  };

  Game.prototype.inPlay = function () { return this.started && !UI.current && !this.paused; };

  Game.prototype.readInput = function () {
    var k = this.keys, inp = this.input;
    if (!this.inPlay() || UI.mapOpen) {
      inp.pedal = inp.brakeRear = inp.brakeFront = false;
      inp.steer = 0; inp.leanBack = inp.leanFwd = false;
      inp.flipBack = inp.flipFwd = false; inp.airRoll = 0;
      return inp;
    }
    var air = !this.bike.grounded;
    inp.steer = (k.KeyD||k.ArrowRight ? 1 : 0) - (k.KeyA||k.ArrowLeft ? 1 : 0);
    inp.leanBack = !!k.ArrowUp; inp.leanFwd = !!k.ArrowDown;
    if (air) {
      inp.pedal = inp.brakeRear = inp.brakeFront = false;
      inp.flipBack = !!(k.KeyS || k.ArrowUp);
      inp.flipFwd = !!(k.KeyW || k.ArrowDown);
      inp.airRoll = (k.KeyE?1:0) - (k.KeyQ?1:0);
    } else {
      inp.pedal = !!k.KeyW; inp.brakeRear = !!k.KeyS; inp.brakeFront = !!k.Space;
      inp.flipBack = inp.flipFwd = false; inp.airRoll = 0;
    }
    return inp;
  };

  /* --- menus ------------------------------------------------------------------ */
  Game.prototype.bindMenus = function () {
    var self = this;
    function on(id, fn) {
      var e = document.getElementById(id);
      if (e) e.onclick = function () { self.audio.init(); self.audio.resume(); self.audio.uiClick(); fn(); };
    }
    on('btnPlay', function () { self.startFreeRide(true); });
    on('btnFreeRide', function () { self.startFreeRide(true); });
    on('btnDownhill', function () { UI.courseList(self, 'downhill'); });
    on('btnTimeTrial', function () { UI.courseList(self, 'timetrial'); });
    on('btnStunt', function () { UI.stuntList(self); });
    on('btnGarage', function () { UI.garage(self); });
    on('btnMap', function () { UI.hideScreens(); UI.openMap(self); self.menuMapMode = true; });
    on('btnSettings', function () { UI.settings(self); });
    on('btnResume', function () { self.resume(); });
    on('btnRestart', function () { self.restartRun(); });
    on('btnQuit', function () { self.quitToMenu(); });
    on('btnPauseMap', function () { UI.openMap(self); });
    on('btnPauseSettings', function () { UI.settings(self); });
    var cm = document.getElementById('mapClose');
    if (cm) cm.onclick = function () {
      UI.closeMap(); self.audio.uiBack();
      if (self.menuMapMode) { self.menuMapMode = false; UI.showScreen('title'); }
    };
  };

  Game.prototype.pause = function () {
    if (!this.inPlay()) return;
    this.paused = true; UI.showScreen('pause'); this.audio.duck(true);
    var info = document.getElementById('pauseInfo');
    if (info) info.innerHTML = '<div>'+UI.esc(this.modeName)+'</div><div class="dim">Altitude '+
      Math.round(this.bike.pos.y).toLocaleString()+' m · '+(this.bike.distance/1000).toFixed(2)+
      ' km ridden · '+this.bike.sessionScore.toLocaleString()+' stunt points</div>';
  };
  Game.prototype.resume = function () { this.paused = false; UI.hideScreens(); this.audio.duck(false); };
  Game.prototype.restartRun = function () {
    if (this.run && this.run.course) this.startCourse(this.run.course.id, this.run.isTimeTrial);
    else if (this.run && this.run.stunt) this.startStunt(this.run.stunt.id);
    else { this.spawnFreeRide(); this.enterPlay(); }
  };
  Game.prototype.quitToMenu = function () {
    this.clearRun(); this.paused = false;
    UI.showScreen('title'); UI.closeMap();
    if (UI.el.hud) UI.el.hud.classList.remove('visible');
    this.audio.duck(true); MTB.Save.save();
  };
  Game.prototype.onResultAction = function (a) {
    if (a === 'retry') this.restartRun();
    else if (a === 'free') { this.clearRun(); this.startFreeRide(false); }
    else if (a === 'menu') this.quitToMenu();
    else if (a === 'courses') UI.courseList(this, this.mode==='timetrial'?'timetrial':'downhill');
    else if (a === 'stunts') UI.stuntList(this);
  };

  /* --- settings --------------------------------------------------------------- */
  Game.prototype.applyPreset = function (name, silent) {
    var p = PRESETS[name] || PRESETS.high, s = MTB.Save.data.settings;
    s.quality = name; s.drawDistance = p.drawDistance;
    s.vegetation = p.vegetation; s.shadows = p.shadows;
    this._preset = p; MTB.Save.save(); this.applySettings();
    if (!silent) UI.toast('Quality', name.toUpperCase(), 'info', 1600);
  };

  Game.prototype.applySettings = function () {
    var s = MTB.Save.data.settings, p = this._preset || PRESETS[s.quality] || PRESETS.high;
    this.camera.fov = s.fov; this.camera.updateProjectionMatrix();
    this.renderer.shadowMap.enabled = !!s.shadows;
    this.renderer.setPixelRatio(Math.min(root.devicePixelRatio||1, 1.5)*(p.pixelRatio||1));
    this.renderer.setSize(root.innerWidth, root.innerHeight);
    if (this.env) {
      this.env.sun.castShadow = !!s.shadows;
      if (this.env.sun.shadow.mapSize.width !== p.shadowMap) {
        this.env.sun.shadow.mapSize.set(p.shadowMap, p.shadowMap);
        if (this.env.sun.shadow.map) { this.env.sun.shadow.map.dispose(); this.env.sun.shadow.map = null; }
      }
      if (s.weather !== 'dynamic') this.env.setWeather(s.weather);
    }
    if (this.streamer) {
      var o = this.streamer.opts;
      var lod = (p.lodFactor||2.6) * clamp(s.drawDistance, 0.4, 2.2);
      var vegD = (p.vegDistance||760) * clamp(s.drawDistance, 0.5, 1.8);
      var need = Math.abs(o.vegDensity - s.vegetation) > 0.01 ||
                 Math.abs(o.lodFactor - lod) > 0.01 || o.shadows !== !!s.shadows;
      o.lodFactor = lod; o.vegDensity = s.vegetation; o.vegDistance = vegD;
      o.shadows = !!s.shadows; o.budget = p.budget||4;
      o.maxCached = s.drawDistance > 1.2 ? 700 : 500;
      if (need && this.bike) { this.streamer.rebuild(); this.streamer.prime(this.bike.pos, 6); }
    }
    this.audio.setVolumes(s.sfx, s.music);
    this.quality = { drawDistance:s.drawDistance, clouds:p.clouds };
  };

  /* --- garage ------------------------------------------------------------------ */
  Game.prototype.openGarage = function () {
    var self = this;
    this.garageOpen = true;
    if (!this.garageScene) {
      this.garageScene = new THREE.Scene();
      this.garageScene.background = new THREE.Color(0x11141b);
      var key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3,5,4);
      this.garageScene.add(key);
      var fill = new THREE.DirectionalLight(0x8fb4e0, 0.7); fill.position.set(-4,2,-3);
      this.garageScene.add(fill);
      this.garageScene.add(new THREE.AmbientLight(0x6a7488, 1.3));
      var floor = new THREE.Mesh(new THREE.CircleGeometry(3.0,48),
        new THREE.MeshLambertMaterial({ color:0x2a3140 }));
      floor.rotation.x = -Math.PI/2; this.garageScene.add(floor);
      var grid = new THREE.GridHelper(6,12,0x4a5568,0x333d4d);
      grid.position.y = 0.004; this.garageScene.add(grid);
      this.garageCam = new THREE.PerspectiveCamera(34,1,0.1,60);
      this.garageAngle = 0.7;
    }
    this.previewBike(MTB.Save.data.currentBike);
    var cv = document.getElementById('garageCanvas');
    if (cv) {
      var dragging = false, lastX = 0;
      cv.onmousedown = function (e) { dragging = true; lastX = e.clientX; };
      root.addEventListener('mouseup', function () { dragging = false; });
      cv.onmousemove = function (e) {
        if (!dragging) return;
        self.garageAngle -= (e.clientX - lastX)*0.012; lastX = e.clientX;
      };
    }
  };
  Game.prototype.closeGarage = function () {
    this.garageOpen = false;
    if (this.garageBike) { this.garageScene.remove(this.garageBike); disposeTree(this.garageBike); this.garageBike = null; }
    if (this.garageRenderer) { this.garageRenderer.dispose(); this.garageRenderer = null; }
  };
  Game.prototype.previewBike = function (id) {
    if (!this.garageScene) return;
    var save = MTB.Save.data, spec = MTB.bikeById(id), cust = save.customisation[spec.id] || {};
    if (this.garageBike) { this.garageScene.remove(this.garageBike); disposeTree(this.garageBike); }
    this.garageBike = MTB.buildBike(spec, {
      frame:cust.frame, rim:cust.rim, jersey:save.rider.jersey, pants:save.rider.pants,
      helmetColor:save.rider.helmetColor, gloves:save.rider.gloves,
      helmetStyle:save.rider.helmetStyle, goggles:save.rider.goggles });
    this.garageScene.add(this.garageBike);
  };
  Game.prototype.renderGarage = function (dt) {
    var cv = document.getElementById('garageCanvas');
    if (!cv || !this.garageBike) return;
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    // its own renderer on its own canvas: blitting out of the main one copied
    // from the wrong corner, because WebGL's viewport origin is bottom-left
    if (!this.garageRenderer || this.garageRenderer.domElement !== cv) {
      if (this.garageRenderer) this.garageRenderer.dispose();
      this.garageRenderer = new THREE.WebGLRenderer({ canvas:cv, antialias:true });
      this.garageRenderer.setPixelRatio(Math.min(root.devicePixelRatio||1, 2));
    }
    this.garageAngle += dt*0.24;
    var r = 3.6;
    this.garageCam.aspect = w/h; this.garageCam.updateProjectionMatrix();
    this.garageCam.position.set(Math.sin(this.garageAngle)*r, 1.18, Math.cos(this.garageAngle)*r);
    this.garageCam.up.set(0,1,0);
    this.garageCam.lookAt(0, 0.68, 0);
    MTB.animateBike(this.garageBike, { wheelSpin:0, steerAngle:Math.sin(this.garageAngle*0.7)*0.12,
      susFront:0.22, susRear:0.22, crankAngle:1.57, riderLean:0, riderShift:0,
      crouch:0.15, pedalling:false }, dt);
    this.garageRenderer.setSize(w, h, false);
    this.garageRenderer.render(this.garageScene, this.garageCam);
  };

  /* --- camera ------------------------------------------------------------------ */
  var _ct = new THREE.Vector3(), _look = new THREE.Vector3(), _tv = new THREE.Vector3();
  Game.prototype.snapCamera = function () { this.camSmooth = null; this.updateCamera(1, true); };

  Game.prototype.updateCamera = function (dt, snap) {
    var cam = CAMS[this.camIndex], b = this.bike, s = MTB.Save.data.settings;
    if (this.lookActive > 0) this.lookActive -= dt;
    else {
      var decay = 1 - Math.exp(-2.2*dt);
      this.lookYaw = lerp(this.lookYaw, 0, decay);
      this.lookPitch = lerp(this.lookPitch, 0, decay);
    }
    var speed01 = clamp(b.speed/24, 0, 1);
    this.camera.fov = lerp(this.camera.fov, s.fov + cam.fovAdd + speed01*13,
      snap ? 1 : 1 - Math.exp(-4*dt));
    this.camera.updateProjectionMatrix();

    if (cam.id === 'first') {
      var head = _tv.set(0, 1.30, 0.12).applyQuaternion(b.quat).add(b.pos);
      this.camera.position.copy(head);
      var q = new THREE.Quaternion().copy(b.quat).multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(this.lookPitch*0.8, this.lookYaw, 0, 'YXZ')));
      if (snap) this.camera.quaternion.copy(q);
      else this.camera.quaternion.slerp(q, 1 - Math.exp(-cam.lag*dt));
      return;
    }

    var yaw = b.yaw + this.lookYaw, pitchOff = this.lookPitch;
    var dist = cam.dist*(1 + speed01*0.22), height = cam.height + speed01*0.5;
    var offX = -Math.sin(yaw)*Math.cos(pitchOff), offZ = -Math.cos(yaw)*Math.cos(pitchOff);
    var offY = Math.sin(pitchOff)*0.9;

    // Shorten the boom around terrain rather than climbing above the rider, but
    // never so far that the camera ends up inside the bike.
    var CLEAR = 1.15, minDist = Math.max(dist*0.45, 2.6), useDist = dist, lift = 0;
    for (var i = 0; i < 8; i++) {
      var tx = b.pos.x + offX*useDist, tz = b.pos.z + offZ*useDist;
      var ty = b.pos.y + height + offY*useDist + lift;
      if (ty > T.height(tx, tz) + CLEAR) break;
      if (useDist > minDist) useDist = Math.max(minDist, useDist*0.8);
      else lift += 1.1;
      if (lift > 9) break;
    }
    _ct.set(b.pos.x + offX*useDist, b.pos.y + height + offY*useDist + lift, b.pos.z + offZ*useDist);
    var groundAt = T.height(_ct.x, _ct.z) + CLEAR;
    if (_ct.y < groundAt) _ct.y = groundAt;

    if (!this.camSmooth || snap) this.camSmooth = _ct.clone();
    else this.camSmooth.lerp(_ct, 1 - Math.exp(-cam.lag*dt));
    this.camera.position.copy(this.camSmooth);

    _look.copy(b.pos); _look.y += 1.0;
    if (b.speed > 2) _look.add(_tv.copy(b.vel).normalize().multiplyScalar(Math.min(cam.look, b.speed*0.5)));
    this.camera.lookAt(_look);
  };

  Game.prototype.resetBike = function (manual) {
    this.bike.crashed = false; this.bike.crashTimer = 0;
    this.bike.respawn(this.run && this.run.lastCheckpoint ? this.run.lastCheckpoint : null);
    this.snapCamera();
    if (manual) { UI.showCrash('manual'); this.audio.uiBack(); }
  };

  /* --- run logic ---------------------------------------------------------------- */
  Game.prototype.updateRun = function (dt) {
    var run = this.run, b = this.bike;
    if (!run || run.finished) return;

    if (run.course) {
      if (!run.started && b.speed > 1.2) run.started = true;
      if (run.started) run.time += dt;

      // Progress along the course line drives the gates. Judging purely on
      // proximity misses gates you fly past at speed or clear from above.
      var cpts = run.course.pts, from = run.progress || 0;
      var bestI = from, bestD = 1e9;
      for (var pi = from; pi < Math.min(cpts.length, from+120); pi++) {
        var dx = cpts[pi].x - b.pos.x, dz = cpts[pi].z - b.pos.z;
        var d2 = dx*dx + dz*dz;
        if (d2 < bestD) { bestD = d2; bestI = pi; }
      }
      if (bestD < 70*70) run.progress = bestI;
      run.nearestDist = Math.sqrt(bestD);

      var cp = run.course.checkpoints[run.cpIndex];
      if (cp) {
        var d = Math.hypot(b.pos.x-cp.x, b.pos.z-cp.z), dy = Math.abs(b.pos.y-cp.y);
        if ((d < 18 && dy < 45) || (run.progress >= cp.index-2 && bestD < 70*70)) {
          cp.passed = true;
          run.lastCheckpoint = { x:cp.x, z:cp.z, yaw:cp.yaw };
          run.splits.push(run.time);
          var rec = MTB.Save.data.courseRecords[run.course.id];
          run.lastSplitDelta = (rec && rec.splits && rec.splits[run.cpIndex] !== undefined)
            ? run.time - rec.splits[run.cpIndex] : null;
          run.cpIndex++;
          this.audio.checkpoint();
          if (cp.finish) this.finishCourse();
          else UI.toast('Checkpoint '+run.cpIndex+'/'+run.course.checkpoints.length,
                        UI.fmtTime(run.time), 'good', 1600);
        }
      }
      if (run.cpIndex < run.course.checkpoints.length) {
        var nx = run.course.checkpoints[run.cpIndex];
        this.objectiveText = (nx.finish ? 'Finish' : 'Checkpoint '+(run.cpIndex+1)) + ' — ' +
          Math.round(Math.hypot(b.pos.x-nx.x, b.pos.z-nx.z)) + ' m' +
          (run.nearestDist > 60 ? '  ·  off course' : '');
      } else this.objectiveText = 'Finish!';
    }

    if (run.stunt) {
      run.time += dt;
      run.remaining = Math.max(0, run.stunt.duration - run.time);
      run.score = b.sessionScore - run.startScore;
      this.objectiveText = Math.ceil(run.remaining)+'s left · '+run.score.toLocaleString()+
        ' / '+run.stunt.target.toLocaleString()+' pts';
      if (run.remaining <= 0) this.finishStunt();
    }
  };

  Game.prototype.finishCourse = function () {
    var run = this.run, course = run.course;
    run.finished = true;
    var stats = { avgSpeed:(this.bike.distance-run.startDist)/Math.max(run.time,0.01)*3.6,
                  crashes:run.crashes };
    var prev = MTB.Save.data.courseRecords[course.id];
    var better = MTB.Save.recordCourse(course.id, run.time, stats);
    if (better) MTB.Save.data.courseRecords[course.id].splits = run.splits;
    var bonus = Math.max(30, Math.floor(course.reward*(run.time < course.parTime ? 1.5 : 1.0)) - run.crashes*12);
    MTB.Save.addCoins(bonus); MTB.Save.save(); this.audio.discover();
    UI.showResults(better ? 'NEW RECORD — '+course.name : course.name+' COMPLETE', [
      { k:'Time', v:UI.fmtTime(run.time), hi:true },
      { k:'Previous best', v: prev ? UI.fmtTime(prev.time) : '—' },
      { k:'Course length', v:(course.length/1000).toFixed(2)+' km' },
      { k:'Descent', v:Math.round(course.drop).toLocaleString()+' m' },
      { k:'Average speed', v:stats.avgSpeed.toFixed(1)+' km/h' },
      { k:'Crashes', v:String(run.crashes) },
      { k:'Stunt points', v:(this.bike.sessionScore-run.startScore).toLocaleString() },
      { k:'Earned', v:bonus.toLocaleString()+' ¤', hi:true }
    ], [{act:'retry',label:'RIDE AGAIN'},{act:'courses',label:'COURSE LIST'},
        {act:'free',label:'FREE RIDE'},{act:'menu',label:'MAIN MENU'}]);
    this.audio.duck(true);
  };

  Game.prototype.finishStunt = function () {
    var run = this.run, area = run.stunt, score = run.score;
    run.finished = true;
    MTB.Save.recordStunt(area.id, score);
    var hit = score >= area.target;
    var reward = Math.floor(score/22) + (hit ? area.reward : 0);
    MTB.Save.addCoins(reward); MTB.Save.save(); this.audio.discover();
    UI.showResults(hit ? 'TARGET SMASHED — '+area.name : area.name, [
      { k:'Score', v:score.toLocaleString(), hi:true },
      { k:'Target', v:area.target.toLocaleString() },
      { k:'Best', v:MTB.Save.data.stuntRecords[area.id].score.toLocaleString() },
      { k:'Crashes', v:String(run.crashes) },
      { k:'Earned', v:reward.toLocaleString()+' ¤', hi:true }
    ], [{act:'retry',label:'TRY AGAIN'},{act:'stunts',label:'STUNT LIST'},
        {act:'free',label:'FREE RIDE'},{act:'menu',label:'MAIN MENU'}]);
    this.audio.duck(true);
  };

  Game.prototype.checkDiscovery = function () {
    var b = this.bike;
    for (var i = 0; i < W.landmarks.length; i++) {
      var lm = W.landmarks[i];
      if (lm.discovered || MTB.Save.isDiscovered(lm.name)) { lm.discovered = true; continue; }
      if (Math.hypot(lm.x-b.pos.x, lm.z-b.pos.z) < lm.radius) {
        lm.discovered = true;
        MTB.Save.discover(lm.name); MTB.Save.addCoins(lm.reward); this.audio.discover();
        UI.toast('Discovered: '+lm.name,
          (lm.type==='peak' ? Math.round(lm.y).toLocaleString()+' m summit · ' : '')+lm.reward+' ¤',
          'good', 4200);
      }
    }
    var s = b.surface;
    if (s && s.edge && s.edge.hidden && s.onTrail > 0.4 && !MTB.Save.isDiscovered('trail:'+s.edge.name)) {
      MTB.Save.discover('trail:'+s.edge.name); MTB.Save.addCoins(140); this.audio.discover();
      UI.toast('Hidden trail found', s.edge.name+' · 140 ¤', 'good', 4000);
    }
  };

  /* --- main loop ----------------------------------------------------------------- */
  Game.prototype.loop = function () {
    var self = this, last = performance.now(), mapTimer = 0;
    var accumulator = 0, FIXED = 1/60;

    function frame(now) {
      var elapsed = Math.min((now-last)/1000, 0.25);   // real time, for physics
      var dt = Math.min(elapsed, 0.05);                 // visuals, kept small
      last = now;
      requestAnimationFrame(frame);

      if (self.garageOpen && UI.current === 'panel') { self.renderGarage(dt); return; }

      var playing = self.inPlay() && !UI.mapOpen;
      var input = self.readInput(), b = self.bike, simDt = 0;

      // Fixed timestep: physics must not slow down on a hard frame, and the
      // suspension spring needs a stable step to stay well behaved.
      if (playing) {
        accumulator = Math.min(accumulator + elapsed, 0.30);
        var steps = 0;
        while (accumulator >= FIXED && steps < 18) {
          b.update(FIXED, input, self);
          accumulator -= FIXED; steps++; simDt += FIXED;
          if (b.crashed && b.crashTimer > 2.1) break;
        }
      } else accumulator = 0;

      if (simDt > 0) {
        self.updateRun(simDt);
        self.discoverTimer -= simDt;
        if (self.discoverTimer <= 0) { self.discoverTimer = 0.25; self.checkDiscovery(); }

        var earned = b.sessionScore;
        self.coinFrac += Math.max(0, earned - (self.lastScore||0))/45;
        self.lastScore = earned;
        if (self.coinFrac >= 1) { var c = Math.floor(self.coinFrac); self.coinFrac -= c; MTB.Save.addCoins(c); }
        MTB.Save.addDistance(b.distance - (self.lastDist||0));
        self.lastDist = b.distance;

        if (b.crashed && b.crashTimer > 2.1) {
          b.crashed = false;
          b.respawn(self.run && self.run.lastCheckpoint ? self.run.lastCheckpoint : null);
          self.snapCamera();
        }

        // tell the rider when they have wedged themselves into a bank
        if (b.grounded && !b.crashed && b.speed < 0.5 && (input.pedal || input.steer !== 0))
          self.stuckTimer += simDt;
        else self.stuckTimer = 0;
        if (UI.el.stuckHint) UI.el.stuckHint.classList.toggle('visible', self.stuckTimer > 3.5);

        var cy = Math.cos(b.yaw), sy = Math.sin(b.yaw);
        self.currentGrade = (T.height(b.pos.x+sy*6, b.pos.z+cy*6) -
                             T.height(b.pos.x-sy*6, b.pos.z-cy*6))/12;
      }

      if (self.bikeMesh) {
        self.bikeMesh.position.copy(b.pos);
        self.bikeMesh.quaternion.copy(b.quat);
        MTB.animateBike(self.bikeMesh, b.visualState(), dt);
      }
      self.updateCamera(dt > 0 ? dt : 0.016, false);

      var camPos = self.camera.position;
      self.streamer.update(camPos, dt);
      self.env.update(dt, camPos, self.quality);
      W.updateLandmarkVisibility(camPos, 2600);
      if (self.water) self.water.userData.mat.color.setHSL(0.55, 0.45, 0.24 + 0.05*self.env.dayFactor);

      if (self.gateGroup && self.run && self.run.course) {
        for (var gi = 0; gi < self.gateGroup.children.length; gi++) {
          var gate = self.gateGroup.children[gi];
          gate.visible = Math.hypot(gate.position.x-b.pos.x, gate.position.z-b.pos.z) < 900;
          if (gate.userData.index === self.run.cpIndex) {
            gate.userData.banner.material.opacity = 0.55 + Math.sin(now*0.006)*0.30;
            gate.scale.setScalar(1 + Math.sin(now*0.006)*0.02);
          } else gate.scale.setScalar(1);
        }
      }

      var rough = b.grounded
        ? clamp((1-(b.surface?b.surface.onTrail:0))*0.8 + Math.abs(b.susFront-b.susRear)*1.2 +
                b.lastImpact*0.01, 0, 1) : 0;
      self.audio.update(dt, { speed:b.speed, grounded:b.grounded && !b.crashed,
        airborne:!b.grounded, crashed:b.crashed,
        braking:input.brakeFront||input.brakeRear, pedalling:b.pedalling, roughness:rough });

      if (UI.el.hud && UI.el.hud.classList.contains('visible')) UI.updateHUD(self, dt);
      if (UI.mapOpen) { mapTimer -= dt; if (mapTimer <= 0) { mapTimer = 0.12; UI.renderBigMap(self); } }

      self.renderer.render(self.scene, self.camera);
    }
    requestAnimationFrame(frame);
  };

  root.addEventListener('DOMContentLoaded', function () {
    if (typeof THREE === 'undefined') {
      var t = document.getElementById('loadingText');
      if (t) t.textContent = 'Could not load the 3D library.';
      return;
    }
    var g = new Game();
    MTB.game = g;
    g.init();
  });
  MTB.Game = Game;
})(window);
