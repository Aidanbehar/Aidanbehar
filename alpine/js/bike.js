/* Alpine Descent — bike.js
   The bicycle and its rider. Human powered throughout: frame, fork, rear shock,
   cranks, chain, knobby tyres and a rider in the attack position. No engine, no
   tank, no exhaust. Parts are merged per material so a whole bike plus rider is
   a handful of draw calls while the moving pieces stay separate. */
(function (root) {
  'use strict';
  var MTB = root.MTB;

  MTB.BIKES = [
    { id:'kestrel', name:'Kestrel XC', klass:'Cross-Country', price:0,
      blurb:'Feather-light race bike. Climbs like nothing else, but the short travel punishes sloppy lines.',
      mass:10.5, pedal:1.32, brakeF:1.00, brakeR:0.92, grip:0.94, travelF:0.075, travelR:0.050,
      susStiff:1.35, susDamp:1.15, airControl:0.92, stability:0.78, topSpeed:21.5,
      geo:{ wheelbase:1.16, headAngle:68, travelLook:0.10, barWidth:0.35 },
      colors:{ frame:0xd8e34a, rim:0x202225 } },
    { id:'ridgeline', name:'Ridgeline 140', klass:'Trail', price:1200,
      blurb:'The do-everything trail bike. Balanced, forgiving and happy anywhere from fire road to chunky singletrack.',
      mass:13.0, pedal:1.12, brakeF:1.06, brakeR:1.00, grip:1.00, travelF:0.140, travelR:0.130,
      susStiff:1.05, susDamp:1.05, airControl:1.00, stability:0.94, topSpeed:23.0,
      geo:{ wheelbase:1.22, headAngle:65.5, travelLook:0.15, barWidth:0.38 },
      colors:{ frame:0x2f7ad6, rim:0x1a1c1f } },
    { id:'boulder', name:'Boulder Enduro', klass:'Enduro', price:3200,
      blurb:'Long, low and slack. Pedals uphill under protest, then eats rock gardens whole on the way down.',
      mass:15.2, pedal:0.94, brakeF:1.12, brakeR:1.08, grip:1.08, travelF:0.170, travelR:0.162,
      susStiff:0.92, susDamp:1.00, airControl:0.98, stability:1.08, topSpeed:25.5,
      geo:{ wheelbase:1.27, headAngle:64, travelLook:0.19, barWidth:0.40 },
      colors:{ frame:0xe2581f, rim:0x2b2118 } },
    { id:'granite', name:'Granite DH', klass:'Downhill', price:6500,
      blurb:'Full downhill race rig with a dual-crown fork. Hopeless on the climbs, unstoppable pointed at the valley floor.',
      mass:17.4, pedal:0.74, brakeF:1.22, brakeR:1.18, grip:1.18, travelF:0.203, travelR:0.200,
      susStiff:0.82, susDamp:0.96, airControl:0.90, stability:1.26, topSpeed:28.5,
      geo:{ wheelbase:1.32, headAngle:62.5, travelLook:0.23, barWidth:0.41, dualCrown:true },
      colors:{ frame:0x1d1f24, rim:0xc8102e } },
    { id:'vapor', name:'Vapor Freeride', klass:'Lightweight Freeride', price:9800,
      blurb:'A slopestyle-bred freeride frame. Light enough to throw sideways mid-air, tough enough to land the drop.',
      mass:12.2, pedal:1.06, brakeF:1.04, brakeR:1.02, grip:1.02, travelF:0.150, travelR:0.120,
      susStiff:1.10, susDamp:1.10, airControl:1.32, stability:0.96, topSpeed:24.5,
      geo:{ wheelbase:1.19, headAngle:65, travelLook:0.16, barWidth:0.37 },
      colors:{ frame:0x9b3fd4, rim:0xe8e8ea } }
  ];

  MTB.FRAME_COLORS = [
    {name:'Sulphur',hex:0xd8e34a},{name:'Glacier',hex:0x2f7ad6},{name:'Magma',hex:0xe2581f},
    {name:'Obsidian',hex:0x1d1f24},{name:'Amethyst',hex:0x9b3fd4},{name:'Moss',hex:0x3f7a45},
    {name:'Bone',hex:0xe9e4d6},{name:'Rust',hex:0x8c3b21},{name:'Cyan Flash',hex:0x25c4c8},
    {name:'Rose Dust',hex:0xd46a8a}];
  MTB.RIM_COLORS = [
    {name:'Stealth',hex:0x1a1c1f},{name:'Silver',hex:0xb9bcc2},{name:'Gold',hex:0xd6a531},
    {name:'Crimson',hex:0xc8102e},{name:'Teal',hex:0x1f8f8f},{name:'White',hex:0xe8e8ea}];
  MTB.KIT_COLORS = [
    {name:'Signal Red',hex:0xd23a2e},{name:'Deep Navy',hex:0x22304f},{name:'Lime',hex:0xa8d63a},
    {name:'Charcoal',hex:0x2c2e33},{name:'Orange',hex:0xe8802a},{name:'Violet',hex:0x7a4fd4},
    {name:'Sky',hex:0x49a8e0},{name:'Sand',hex:0xd9c49a}];
  MTB.HELMETS = [{id:'full',name:'Full Face'},{id:'open',name:'Open Trail'},{id:'halfshell',name:'Half Shell'}];

  /* --- primitives ----------------------------------------------------------- */
  function tube(x1,y1,z1,x2,y2,z2,r,seg) {
    var dx=x2-x1, dy=y2-y1, dz=z2-z1, len=Math.sqrt(dx*dx+dy*dy+dz*dz);
    var g = new THREE.CylinderGeometry(r, r, len, seg||7, 1, false);
    var q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),
            new THREE.Vector3(dx,dy,dz).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3((x1+x2)/2,(y1+y2)/2,(z1+z2)/2), q, new THREE.Vector3(1,1,1)));
    return g;
  }
  function box(w,h,d,x,y,z,rx,ry,rz) {
    var g = new THREE.BoxGeometry(w,h,d);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),
      new THREE.Vector3(1,1,1)));
    return g;
  }
  function sphere(r,x,y,z,sx,sy,sz) {
    var g = new THREE.SphereGeometry(r,10,7);
    g.scale(sx||1,sy||1,sz||1); g.translate(x,y,z); return g;
  }
  function cyl(rt,rb,h,x,y,z,rx,ry,rz,seg) {
    var g = new THREE.CylinderGeometry(rt,rb,h,seg||8);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),
      new THREE.Vector3(1,1,1)));
    return g;
  }
  function mat(c) { return new THREE.MeshLambertMaterial({ color: c }); }
  function meshFrom(geos, material, cast) {
    if (!geos.length) return null;
    var m = new THREE.Mesh(MTB.mergeGeos(geos), material);
    m.castShadow = cast !== false; m.receiveShadow = false;
    return m;
  }

  function buildWheel(R, tireMat, rimMat) {
    var g = new THREE.Group();
    var tire = new THREE.TorusGeometry(R-0.045, 0.050, 7, 26); tire.rotateY(Math.PI/2);
    var knobs = [], rows = [-0.034, 0, 0.034];
    for (var k = 0; k < 26; k++) {
      var a = k/26*Math.PI*2, rr = R-0.045+0.049;
      for (var ri = 0; ri < rows.length; ri++) {
        if (ri === 1 && (k % 2)) continue;
        knobs.push(box(0.036,0.026,0.05, rows[ri], Math.sin(a)*rr, Math.cos(a)*rr, a, 0, 0));
      }
    }
    g.add(meshFrom([tire].concat(knobs), tireMat));
    var rim = new THREE.TorusGeometry(R-0.105, 0.026, 6, 24); rim.rotateY(Math.PI/2);
    var parts = [rim, cyl(0.045,0.045,0.115, 0,0,0, 0,0,Math.PI/2, 9)];
    for (var s = 0; s < 12; s++) {
      var ang = s/12*Math.PI*2, off = (s % 2) ? 0.042 : -0.042;
      parts.push(tube(off, 0.03*Math.sin(ang+0.5), 0.03*Math.cos(ang+0.5),
        0, Math.sin(ang)*(R-0.11), Math.cos(ang)*(R-0.11), 0.006, 4));
    }
    var rotor = new THREE.TorusGeometry(0.095, 0.012, 4, 16);
    rotor.rotateY(Math.PI/2); rotor.translate(0.055, 0, 0); parts.push(rotor);
    g.add(meshFrom(parts, rimMat));
    return g;
  }

  /* --- rider, in the attack position ----------------------------------------- */
  function buildRider(cfg) {
    var jersey = mat(cfg.jersey), pants = mat(cfg.pants), skin = mat(0xc98d63);
    var helmet = mat(cfg.helmet), glove = mat(cfg.gloves), shoe = mat(0x26282c);
    var rider = new THREE.Group();

    var torso = new THREE.Group();
    torso.rotation.x = 1.06;                  // chest down over the bars
    var LEN = 0.52, tg = [];
    tg.push(box(0.32, LEN, 0.21, 0, LEN*0.5, 0));
    tg.push(box(0.36, 0.15, 0.23, 0, LEN-0.02, 0));
    tg.push(box(0.30, 0.14, 0.20, 0, 0.03, 0));
    torso.add(meshFrom(tg, jersey));
    torso.add(meshFrom([box(0.07,LEN*0.8,0.015,-0.10,LEN*0.48,0.108),
                        box(0.07,LEN*0.8,0.015, 0.10,LEN*0.48,0.108)], mat(0x1d1f24)));

    var head = new THREE.Group();
    head.position.set(0, LEN+0.10, 0.02);
    head.rotation.x = -1.06;                  // eyes up the trail
    head.add(meshFrom([cyl(0.055,0.06,0.09, 0,-0.07,0, 0,0,0, 7)], skin));
    head.add(meshFrom([sphere(0.088, 0,0,0, 1,1.06,1.04)], skin));
    var hg = [sphere(0.118, 0,0.014,-0.005, 1,0.96,1.04)];
    if (cfg.helmetStyle === 'full') {
      hg.push(box(0.185,0.105,0.13, 0,-0.055,0.075, 0.20,0,0));
      hg.push(box(0.115,0.09,0.06, 0,-0.02,0.115, 0.10,0,0));
      hg.push(box(0.215,0.042,0.115, 0,0.082,0.085, 0.34,0,0));
    } else if (cfg.helmetStyle === 'open') {
      hg.push(box(0.205,0.035,0.115, 0,0.075,0.085, 0.34,0,0));
    }
    head.add(meshFrom(hg, helmet));
    if (cfg.goggles) {
      head.add(meshFrom([box(0.19,0.058,0.055, 0,0.008,0.078, 0.12,0,0)], mat(0x16181c)));
      head.add(meshFrom([box(0.145,0.036,0.02, 0,0.010,0.103, 0.12,0,0)], mat(0x5f8fb8)));
    }
    torso.add(head);

    function arm(side) {
      var a = new THREE.Group();
      a.position.set(side*0.165, LEN-0.04, 0.03);
      a.rotation.z = side*0.42; a.rotation.x = -1.02;   // reach to the grips
      a.add(meshFrom([cyl(0.048,0.044,0.28, 0,-0.14,0, 0,0,0, 7)], jersey));
      var fore = new THREE.Group();
      fore.position.set(0,-0.28,0); fore.rotation.x = -0.22;
      fore.add(meshFrom([cyl(0.042,0.037,0.26, 0,-0.13,0, 0,0,0, 7)], skin));
      fore.add(meshFrom([box(0.078,0.075,0.10, 0,-0.275,0.012)], glove));
      a.add(fore); a.userData.fore = fore;
      return a;
    }
    var armL = arm(-1), armR = arm(1);
    torso.add(armL); torso.add(armR);
    rider.add(torso);

    function leg(side) {
      var l = new THREE.Group();
      l.position.set(side*0.105, 0, -0.01);
      l.rotation.x = -0.66;                            // thigh forward, knee bent
      l.add(meshFrom([cyl(0.072,0.058,0.38, 0,-0.19,0, 0,0,0, 8)], pants));
      var shin = new THREE.Group();
      shin.position.set(0,-0.38,0); shin.rotation.x = 0.60;
      shin.add(meshFrom([cyl(0.052,0.042,0.36, 0,-0.18,0, 0,0,0, 7)], pants));
      shin.add(meshFrom([box(0.09,0.06,0.22, 0,-0.375,0.025)], shoe));
      l.add(shin); l.userData.shin = shin;
      return l;
    }
    var legL = leg(-1), legR = leg(1);
    rider.add(legL); rider.add(legR);

    rider.userData = {
      torso: torso, head: head, armL: armL, armR: armR, legL: legL, legR: legR,
      base: {
        torsoX: torso.rotation.x, torsoY: torso.position.y, torsoZ: torso.position.z,
        armX: armL.rotation.x, armZ: armL.rotation.z, foreX: armL.userData.fore.rotation.x,
        legX: legL.rotation.x, shinX: legL.userData.shin.rotation.x
      }
    };
    return rider;
  }

  /* --- the whole bicycle ------------------------------------------------------ */
  function buildBike(spec, cfg) {
    cfg = cfg || {};
    var frameMat = mat(cfg.frame !== undefined ? cfg.frame : spec.colors.frame);
    var rimMat = mat(cfg.rim !== undefined ? cfg.rim : spec.colors.rim);
    var darkMat = mat(0x25282d), tireMat = mat(0x17181a), accentMat = mat(0xb9bcc2);

    var R = 0.368, wb = spec.geo.wheelbase;
    var rearZ = -wb*0.36, frontZ = wb*0.64, bbY = 0.335;
    var ha = spec.geo.headAngle * Math.PI/180, hdx = Math.cos(ha), hdy = Math.sin(ha);
    var seatTop = { y: bbY+0.60, z: -0.175 };
    var forkLen = 0.42 + spec.geo.travelLook*0.25;
    var headBot = { y: R + hdy*forkLen, z: frontZ - hdx*forkLen };
    var headTop = { y: headBot.y + hdy*0.20, z: headBot.z - hdx*0.20 };

    var bike = new THREE.Group(); bike.name = 'bike';

    var swing = new THREE.Group(); swing.position.set(0, bbY, 0);
    var sw = [];
    for (var side = -1; side <= 1; side += 2) {
      sw.push(tube(side*0.055,-0.01,-0.04, side*0.068, R-bbY, rearZ, 0.026, 7));
      sw.push(tube(side*0.068, R-bbY, rearZ, side*0.042, seatTop.y-bbY-0.13, seatTop.z+0.03, 0.021, 7));
    }
    sw.push(tube(-0.042, seatTop.y-bbY-0.13, seatTop.z+0.03,
                  0.042, seatTop.y-bbY-0.13, seatTop.z+0.03, 0.019, 6));
    sw.push(box(0.038,0.10,0.055, -0.068, R-bbY, rearZ));
    sw.push(box(0.038,0.10,0.055,  0.068, R-bbY, rearZ));
    swing.add(meshFrom(sw, frameMat));
    var rearWheel = buildWheel(R, tireMat, rimMat);
    rearWheel.position.set(0, R-bbY, rearZ); swing.add(rearWheel);
    swing.add(meshFrom([cyl(0.070,0.070,0.048, -0.048, R-bbY, rearZ, 0,0,Math.PI/2, 12)], accentMat));
    swing.add(meshFrom([
      box(0.030,0.11,0.05, -0.082, R-bbY-0.10, rearZ+0.03),
      cyl(0.030,0.030,0.013, -0.082, R-bbY-0.16, rearZ+0.055, 0,0,Math.PI/2, 8),
      cyl(0.030,0.030,0.013, -0.082, R-bbY-0.16, rearZ-0.005, 0,0,Math.PI/2, 8)], darkMat));
    bike.add(swing);

    var mainFrame = new THREE.Group(), fr = [];
    fr.push(tube(0, bbY+0.015, 0.01, 0, headBot.y+0.02, headBot.z, 0.049, 9));
    fr.push(tube(0, bbY+0.03, -0.02, 0, seatTop.y, seatTop.z, 0.036, 8));
    fr.push(tube(0, seatTop.y-0.035, seatTop.z, 0, headTop.y-0.035, headTop.z, 0.034, 8));
    fr.push(tube(0, headBot.y-0.02, headBot.z+0.008, 0, headTop.y+0.02, headTop.z-0.008, 0.056, 10));
    fr.push(cyl(0.056,0.056,0.125, 0, bbY, 0, 0,0,Math.PI/2, 12));
    fr.push(box(0.105,0.075,0.038, 0, seatTop.y-0.20, seatTop.z+0.05));
    mainFrame.add(meshFrom(fr, frameMat));

    var shock = new THREE.Group(); shock.position.set(0, bbY+0.19, 0.02);
    shock.add(meshFrom([cyl(0.040,0.040,0.17, 0,0.035,-0.06, -0.62,0,0, 10),
                        cyl(0.021,0.021,0.14, 0,-0.075,0.02, -0.62,0,0, 8)], darkMat));
    shock.add(meshFrom([cyl(0.047,0.047,0.05, 0,0.085,-0.085, -0.62,0,0, 10)], accentMat));
    mainFrame.add(shock);

    mainFrame.add(meshFrom([cyl(0.019,0.019,0.22, 0, seatTop.y+0.09, seatTop.z-0.028, -0.13,0,0, 8)], accentMat));
    mainFrame.add(meshFrom([box(0.12,0.045,0.27, 0, seatTop.y+0.215, seatTop.z-0.062, -0.07,0,0),
                            box(0.06,0.03,0.09, 0, seatTop.y+0.228, seatTop.z-0.20, -0.07,0,0)], darkMat));

    var crank = new THREE.Group(); crank.position.set(0, bbY, 0);
    var armL2 = new THREE.Group();
    armL2.add(meshFrom([box(0.026,0.175,0.036, -0.083,-0.0875,0)], accentMat));
    var pedalL = new THREE.Group(); pedalL.position.set(-0.083,-0.175,0);
    pedalL.add(meshFrom([box(0.085,0.020,0.098, 0,0,0)], darkMat)); armL2.add(pedalL);
    var armR2 = new THREE.Group(); armR2.rotation.x = Math.PI;
    armR2.add(meshFrom([box(0.026,0.175,0.036, 0.083,-0.0875,0)], accentMat));
    var pedalR = new THREE.Group(); pedalR.position.set(0.083,-0.175,0);
    pedalR.add(meshFrom([box(0.085,0.020,0.098, 0,0,0)], darkMat)); armR2.add(pedalR);
    crank.add(armL2); crank.add(armR2);
    crank.add(meshFrom([cyl(0.098,0.098,0.009, 0.044,0,0, 0,0,Math.PI/2, 18)], accentMat));
    mainFrame.add(crank);

    var chainLen = Math.abs(rearZ);
    mainFrame.add(meshFrom([box(0.010,0.009,chainLen, 0.046, bbY+0.095, rearZ/2),
                            box(0.010,0.009,chainLen, 0.046, bbY-0.095, rearZ/2)], darkMat));
    bike.add(mainFrame);

    var head = new THREE.Group(); head.position.set(0, headBot.y, headBot.z);
    var steer = new THREE.Group(); head.add(steer);
    var rake = new THREE.Group(); rake.rotation.x = Math.PI/2 - ha; steer.add(rake);
    var upper = [box(0.215,0.055,0.07, 0,-0.01,0)];
    if (spec.geo.dualCrown) upper.push(box(0.22,0.05,0.07, 0,0.21,0));
    upper.push(cyl(0.0235,0.0235,0.42, -0.088,-0.21,0, 0,0,0, 9));
    upper.push(cyl(0.0235,0.0235,0.42,  0.088,-0.21,0, 0,0,0, 9));
    rake.add(meshFrom(upper, accentMat));

    var forkLower = new THREE.Group();
    var restY = -(forkLen - 0.075);
    forkLower.position.set(0, restY, 0);
    forkLower.add(meshFrom([
      cyl(0.035,0.030,0.30, -0.088,-0.085,0, 0,0,0, 9),
      cyl(0.035,0.030,0.30,  0.088,-0.085,0, 0,0,0, 9),
      box(0.034,0.085,0.055, -0.088,-0.248,0.008),
      box(0.034,0.085,0.055,  0.088,-0.248,0.008),
      tube(-0.088,-0.16,0, 0.088,-0.16,0, 0.016, 6)], frameMat));
    var frontWheel = buildWheel(R, tireMat, rimMat);
    frontWheel.position.set(0,-0.248,0.008); forkLower.add(frontWheel);
    rake.add(forkLower);

    var bw = spec.geo.barWidth, barY = 0.165, barZ = 0.045;
    steer.add(meshFrom([
      box(0.058,0.048,0.10, 0, barY-0.015, barZ*0.45),
      tube(-bw,barY,barZ, bw,barY,barZ, 0.0185, 8),
      tube(-bw,barY,barZ, -bw-0.015,barY+0.022,barZ-0.035, 0.0175, 6),
      tube(bw,barY,barZ, bw+0.015,barY+0.022,barZ-0.035, 0.0175, 6)], accentMat));
    steer.add(meshFrom([
      cyl(0.0215,0.0215,0.115, -bw+0.058,barY,barZ, 0,0,Math.PI/2, 9),
      cyl(0.0215,0.0215,0.115,  bw-0.058,barY,barZ, 0,0,Math.PI/2, 9),
      box(0.017,0.026,0.085, -bw+0.125,barY-0.008,barZ+0.045, 0.22,0,0),
      box(0.017,0.026,0.085,  bw-0.125,barY-0.008,barZ+0.045, 0.22,0,0)], darkMat));
    bike.add(head);

    var rider = buildRider({
      jersey: cfg.jersey !== undefined ? cfg.jersey : 0xd23a2e,
      pants: cfg.pants !== undefined ? cfg.pants : 0x2c2e33,
      helmet: cfg.helmetColor !== undefined ? cfg.helmetColor : 0x22304f,
      gloves: cfg.gloves !== undefined ? cfg.gloves : 0x1a1c20,
      helmetStyle: cfg.helmetStyle || 'full',
      goggles: cfg.goggles !== false
    });
    rider.position.set(0, bbY+0.495, -0.32);
    bike.add(rider);

    bike.userData = {
      spec: spec, wheelRadius: R, wheelbase: wb,
      rearWheel: rearWheel, frontWheel: frontWheel, swing: swing, shock: shock,
      forkLower: forkLower, steer: steer, crank: crank, rider: rider,
      mainFrame: mainFrame, bbY: bbY, forkRestY: restY,
      materials: { frame: frameMat, rim: rimMat, tire: tireMat, accent: accentMat }
    };
    return bike;
  }

  function animateBike(bike, st, dt) {
    var u = bike.userData;
    u.frontWheel.rotation.x = st.wheelSpin;
    u.rearWheel.rotation.x = st.wheelSpin;
    u.steer.rotation.y = st.steerAngle;
    u.forkLower.position.y = u.forkRestY + st.susFront * u.spec.travelF;
    u.swing.rotation.x = -(st.susRear * u.spec.travelR) / 0.45;
    u.shock.scale.y = 1 - st.susRear * 0.22;
    u.crank.rotation.x = st.crankAngle;

    // rider body english, layered on top of the attack position
    var r = u.rider.userData, B = r.base, torso = r.torso;
    torso.rotation.x = B.torsoX + st.riderLean*0.42 - st.crouch*0.20;
    torso.position.z = B.torsoZ + st.riderShift*0.14;
    torso.position.y = B.torsoY - st.crouch*0.075;
    r.head.rotation.x = -torso.rotation.x + 0.04;

    var ph = st.crankAngle, sw = st.pedalling ? 1 : 0.12;
    r.legL.rotation.x = B.legX + Math.sin(ph)*0.40*sw;
    r.legL.userData.shin.rotation.x = B.shinX - Math.sin(ph-0.9)*0.44*sw;
    r.legR.rotation.x = B.legX + Math.sin(ph+Math.PI)*0.40*sw;
    r.legR.userData.shin.rotation.x = B.shinX - Math.sin(ph+Math.PI-0.9)*0.44*sw;

    var sa = st.steerAngle*0.5;
    r.armL.rotation.x = B.armX + st.crouch*0.16 - sa*0.22;
    r.armR.rotation.x = B.armX + st.crouch*0.16 + sa*0.22;
    r.armL.rotation.z = -B.armZ - sa*0.55;
    r.armR.rotation.z =  B.armZ - sa*0.55;
    r.armL.userData.fore.rotation.x = B.foreX - st.crouch*0.14;
    r.armR.userData.fore.rotation.x = B.foreX - st.crouch*0.14;
  }

  MTB.buildBike = buildBike;
  MTB.animateBike = animateBike;
  MTB.bikeById = function (id) {
    for (var i = 0; i < MTB.BIKES.length; i++) if (MTB.BIKES[i].id === id) return MTB.BIKES[i];
    return MTB.BIKES[0];
  };
})(window);
