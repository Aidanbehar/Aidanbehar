/* Alpine Descent — physics.js
   Arcade downhill mountain-bike physics. Gravity is the engine; pedalling is a
   modest top-up that fades with speed, climbing bleeds momentum, and the two
   brakes behave differently. You crash for landing inverted or for a drop big
   enough to fold the bike — everything short of that is paid for in momentum,
   because a mountain this rough would be unplayable otherwise. */
(function (root) {
  'use strict';
  var MTB = root.MTB, T = MTB.Terrain;
  var M = MTB.math, clamp = M.clamp, lerp = M.lerp;
  var G = 9.81, R = 0.368;

  function Bike(spec) {
    this.spec = spec;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.angVel = new THREE.Vector3();
    this.grounded = true; this.airTime = 0;
    this.wheelSpin = 0; this.crankAngle = 0; this.steerAngle = 0;
    this.susFront = 0.22; this.susRear = 0.22;
    this.riderLean = 0; this.riderShift = 0; this.crouch = 0;
    this.pedalling = false; this.speed = 0; this.distance = 0; this.pushTime = 0;
    this._lastRespawn = null; this._respawnRetry = 0;
    this.crashed = false; this.crashTimer = 0; this.crashReason = '';
    this.lastImpact = 0; this.drift = 0; this.wheelie = 0; this.wheelieTime = 0;
    this.surface = { onTrail:0, grip:1, roll:1, edge:null };
    this.trick = { active:false, yawAcc:0, pitchAcc:0, rollAcc:0, startY:0,
                   startPos:new THREE.Vector3(), airtime:0, maxHeight:0 };
    this.lastTrick = null; this.combo = 0; this.comboTimer = 0;
    this.score = 0; this.sessionScore = 0;
    this._e = new THREE.Euler();
    this._n = { x:0, y:1, z:0 };
  }

  Bike.prototype.setSpec = function (s) { this.spec = s; };
  Bike.prototype.updateQuat = function () {
    this._e.set(this.pitch, this.yaw, this.roll, 'YXZ');
    this.quat.setFromEuler(this._e);
  };
  Bike.prototype.placeAt = function (x, z, yaw) {
    // Sit the bike at the height the contact model will agree with: the mean of
    // the two wheel samples, not the height under the centre. Dropping it in by
    // the centre height can leave it metres below where the wheels say the
    // ground is, and the suspension spring then launches it into orbit.
    var hw = this.spec.geo.wheelbase * 0.5;
    var cy = Math.cos(yaw||0), sy = Math.sin(yaw||0);
    var gF = T.height(x + sy*hw, z + cy*hw), gR = T.height(x - sy*hw, z - cy*hw);
    this.pos.set(x, (gF + gR)*0.5 + R + this.spec.travelF*0.22*0.5 + 0.02, z);
    this.vel.set(0,0,0);
    this.yaw = yaw || 0; this.pitch = 0; this.roll = 0;
    this.angVel.set(0,0,0);
    this.grounded = true; this.crashed = false; this.crashTimer = 0;
    this.airTime = 0; this.trick.active = false; this.combo = 0; this.wheelie = 0;
    this.updateQuat();
  };

  var _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(),
      _t = new THREE.Vector3(), _t2 = new THREE.Vector3();

  Bike.prototype.update = function (dt, input, env) {
    var spec = this.spec;
    dt = Math.min(dt, 1/30);
    if (this.crashed) { this._crashStep(dt); return; }

    var wb = spec.geo.wheelbase, halfWB = wb * 0.5;
    this.updateQuat();
    _f.set(0,0,1).applyQuaternion(this.quat);
    _r.set(1,0,0).applyQuaternion(this.quat);

    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    var gF = T.height(this.pos.x + sy*halfWB, this.pos.z + cy*halfWB);
    var gR = T.height(this.pos.x - sy*halfWB, this.pos.z - cy*halfWB);
    var gC = T.height(this.pos.x, this.pos.z);
    var n = T.normal(this.pos.x, this.pos.z, 2.2, this._n);
    this.surface = MTB.Trails.surfaceAt(this.pos.x, this.pos.z);

    var sagF = spec.travelF*0.22, sagR = spec.travelR*0.22;
    var contactY = (gF + gR)*0.5 + R + sagF*0.5;
    var gap = this.pos.y - contactY;

    // The wheels stay in touch anywhere inside the suspension travel plus slop.
    // Without that margin the chassis skips down the hill in a permanent
    // micro-hop instead of rolling.
    var reach = Math.max(spec.travelF, spec.travelR)*1.5 + 0.30;
    var wasGrounded = this.grounded;
    var contact = wasGrounded ? (gap < reach) : (gap < reach*0.45);

    if (contact) {
      if (!wasGrounded) this._land(n, input);
      this.grounded = true; this.airTime = 0;

      // near-critically damped spring to the wheels' rest height; a ramp pushes
      // contactY up faster than the spring follows, which is what launches you
      var k = 240 * spec.susStiff, c = 2*Math.sqrt(k)*0.92*spec.susDamp;
      var travel = Math.max(spec.travelF, spec.travelR), maxDefl = travel*2.5 + 0.12;
      var dy = contactY - this.pos.y;
      // A spring only pushes over the distance it can actually travel. Left
      // unbounded, a chassis that ends up well below the ground — spawned on a
      // lip, shoved into a step — sees a deflection of metres and gets fired
      // off the mountain at terminal velocity. Past full compression the
      // chassis is PLACED, not accelerated.
      if (dy > maxDefl) {
        this.pos.y = contactY - maxDefl;
        if (this.vel.y < 0) this.vel.y = 0;
        dy = maxDefl;
      } else if (dy < -maxDefl) dy = -maxDefl;
      // Damp the chassis against the GROUND, not against the world. On a 50%
      // descent the ground falls away at several metres a second and the bike
      // is supposed to go down with it; damping absolute vertical velocity
      // caps how fast the chassis may sink, the gap opens, and the bike skips
      // down the hill permanently airborne instead of riding it.
      // n.y is floored well above zero: on a near-vertical face this term would
      // otherwise report a sink rate several times the real one and the damper
      // would DRIVE the chassis into the hill instead of merely letting it fall.
      var groundVy = clamp(-(n.x*this.vel.x + n.z*this.vel.z) / Math.max(n.y, 0.45),
                           -14, 2);
      this.vel.y += (dy*k - (this.vel.y - groundVy)*c) * dt;
      // and it cannot eject the rider faster than a hard pop off a lip
      this.vel.y = clamp(this.vel.y, -32, Math.max(groundVy, 0) + 9);
      if (this.pos.y > contactY + reach*0.9) {
        this.pos.y = contactY + reach*0.9;
        if (this.vel.y > 0) this.vel.y *= 0.35;
      }

      // Clamped: at the lip of a drop the front wheel samples ground metres
      // below the rear, and unclamped the bike would pitch straight down and
      // case every landing.
      var pitchTarget = clamp(Math.atan2(gF - gR, wb), -0.62, 0.62);
      var spd = this.vel.length();
      var weight = (input.leanBack ? 1 : 0) - (input.leanFwd ? 1 : 0);
      if (weight > 0 && input.pedal && spd > 1.5) this.wheelie = Math.min(1, this.wheelie + dt*1.9);
      else if (weight > 0 && spd > 3) this.wheelie = Math.min(0.75, this.wheelie + dt*1.2);
      else this.wheelie = Math.max(0, this.wheelie - dt*2.6);
      this.wheelieTime = this.wheelie > 0.35 ? this.wheelieTime + dt : 0;
      pitchTarget += this.wheelie*0.55;
      if (input.brakeFront) pitchTarget -= clamp(spd/14, 0, 1) * 0.42;
      this.pitch = lerp(this.pitch, pitchTarget, 1 - Math.exp(-14*dt));

      var crossSlope = clamp(Math.atan2(-(n.x*cy - n.z*sy), n.y), -0.75, 0.75);
      this.roll = lerp(this.roll,
        -input.steer * clamp(spd/9, 0, 1) * 0.40 + crossSlope*0.7, 1 - Math.exp(-11*dt));

      // gravity along the surface
      _t.set(n.x, n.y, n.z); _t2.set(0, -G, 0);
      _t2.addScaledVector(_t, -_t2.dot(_t));
      this.vel.addScaledVector(_t2, dt);

      var fwdSpeed = this.vel.dot(_f);
      var rollDecel = 0.34 + (1 - this.surface.roll)*1.7;
      this.pedalling = false;
      if (input.pedal && !input.brakeRear && !input.brakeFront) {
        var fade = 1 - clamp(fwdSpeed/spec.topSpeed, 0, 1);
        var power = 7.4 * spec.pedal * fade * fade;
        var grade = (gF - gR)/wb;
        // climbing is hard, but you can always grind a pitch out of the saddle
        if (grade > 0) power *= clamp(1 - grade*1.05, 0.22, 1);
        if (fwdSpeed < 1.2) power *= 1.55;
        // A rider is never weaker than the ground they are standing on. Soft
        // dirt costs more in rolling resistance than the floored-out climbing
        // power above could deliver, which left the bike pinned at a dead stop
        // on mild gradients with the pedal held down.
        if (fwdSpeed < 2.5 && grade < 1.1)
          power = Math.max(power, rollDecel + 1.35 + Math.max(0, grade)*2.2);

        // Hike-a-bike. A real rider who stalls on a pitch too steep to pedal
        // gets off and pushes, so no gradient anywhere on this mountain can
        // trap them. It only engages below walking pace, so it is worth
        // nothing as a climbing shortcut -- it just means "stuck" is never a
        // state the rider cannot leave.
        this.pushTime = fwdSpeed < 1.0 ? (this.pushTime || 0) + dt : 0;
        if (this.pushTime > 0.5) {
          var walk = 1.8;
          if (fwdSpeed < walk)
            power = Math.max(power, Math.min((walk - fwdSpeed)/Math.max(dt, 1e-4), 7.0));
        }
        this.vel.addScaledVector(_f, power*dt);
        this.pedalling = power > 0.4;
        this.crankAngle += dt * (2.4 + clamp(fwdSpeed, 0, 9)*0.85);
      } else this.pushTime = 0;

      var brake = 0;
      if (input.brakeRear) brake += 3.6 * spec.brakeR;
      if (input.brakeFront) brake += 6.8 * spec.brakeF;
      if (brake > 0) {
        var grip = this.surface.grip * spec.grip;
        if (input.brakeRear && !input.brakeFront) grip *= 0.80;   // the rear locks
        var decel = Math.min(brake*grip, Math.abs(fwdSpeed)/Math.max(dt, 1e-4));
        this.vel.addScaledVector(_f, -Math.sign(fwdSpeed)*decel*dt);
      }

      // Rolling resistance and aero drag as decelerations. Drag is scaled from
      // the bike's own top-speed rating, so that number means something and no
      // bicycle runs away to speeds no rider has ever seen.
      var dragDecel = (5.2/(spec.topSpeed*spec.topSpeed)) * fwdSpeed*fwdSpeed;
      var lossV = (rollDecel + dragDecel) * dt, vlen = this.vel.length();
      if (vlen > 1e-4) this.vel.multiplyScalar(Math.max(0, 1 - Math.min(lossV, vlen)/vlen));

      // A rider can always pivot the bike, even at walking pace — without this
      // floor, stopping while pointed at a bank is terminal.
      var sft = clamp(Math.abs(fwdSpeed), 0, 30);
      var steerRate = input.steer * (2.35/(1 + sft*0.085)) * (1/spec.stability) *
                      Math.max(clamp(sft/2.2, 0, 1), 0.30);
      if (fwdSpeed < -0.2) steerRate = -steerRate;
      this.yaw += steerRate * dt;
      this.steerAngle = lerp(this.steerAngle, -input.steer*0.42, 1 - Math.exp(-13*dt));

      var lat = this.vel.dot(_r), maxLat = 2.4 + sft*0.06;
      var killed = lat * clamp(this.surface.grip*spec.grip*12*dt, 0, 1);
      if (Math.abs(lat) > maxLat) killed *= 0.55;
      this.vel.addScaledVector(_r, -killed);
      this.drift = clamp(Math.abs(lat)/maxLat, 0, 1.6);

      var frontC = this.pos.y + Math.sin(this.pitch)*halfWB;
      var rearC = this.pos.y - Math.sin(this.pitch)*halfWB;
      var tF = clamp((gF + R + sagF - frontC)/spec.travelF + 0.22, 0, 1);
      var tR = clamp((gR + R + sagR - rearC)/spec.travelR + 0.22, 0, 1);
      if (input.brakeFront) tF = clamp(tF + 0.30*clamp(spd/12, 0, 1), 0, 1);
      if (this.wheelie > 0.2) tR = clamp(tR + this.wheelie*0.35, 0, 1);
      this.susFront = crit(this.susFront, tF, dt, 26*spec.susDamp);
      this.susRear = crit(this.susRear, tR, dt, 24*spec.susDamp);

      this.riderLean = lerp(this.riderLean,
        clamp(this.pitch*1.1 + ((input.brakeFront||input.brakeRear) ? 0.30 : 0), -0.7, 0.7),
        1 - Math.exp(-9*dt));
      this.riderShift = lerp(this.riderShift,
        ((input.brakeFront||input.brakeRear) ? -0.55 : 0) + (input.pedal ? 0.25 : 0) +
        (weight > 0 ? -0.5 : 0) + (weight < 0 ? 0.4 : 0), 1 - Math.exp(-8*dt));
      this.crouch = lerp(this.crouch,
        clamp((this.susFront + this.susRear)*0.5 - 0.2, 0, 1)*0.9, 1 - Math.exp(-12*dt));

      if (this.pitch < -1.15 && spd > 9 && input.brakeFront) this.crash('otb');
      if (Math.abs(this.roll) > 1.35) this.crash('roll');

    } else {
      if (wasGrounded) this._takeoff();
      this.grounded = false; this.airTime += dt; this.wheelie = 0;
      this.vel.y -= G*dt;

      // Aero drag does not stop at the lip. Without it a long descent with any
      // airtime in it accelerates unopposed and the bike arrives at the next
      // landing at a speed no bicycle reaches.
      var av = this.vel.length();
      if (av > 1e-4) {
        var aLoss = (5.2/(spec.topSpeed*spec.topSpeed)) * av*av * dt;
        this.vel.multiplyScalar(Math.max(0, 1 - Math.min(aLoss, av)/av));
      }

      var ac = spec.airControl;
      var flip = (input.flipBack ? 1 : 0) - (input.flipFwd ? 1 : 0);
      var spin = input.steer, rollIn = input.airRoll || 0;
      this.angVel.x += flip * 9.2 * ac * dt;
      this.angVel.y += spin * 6.4 * ac * dt;
      this.angVel.z += rollIn * 4.6 * ac * dt;

      // Rider instinct: with no trick input the rider spots the landing and
      // brings the bike level with the slope below. Blended out as they commit
      // to a rotation, so a nudge of air steering does not cost the landing.
      var intent = Math.max(Math.abs(flip), Math.min(1, Math.abs(spin)/0.6), Math.abs(rollIn));
      var levelAmt = 1 - clamp(intent, 0, 1);
      // Letting go of the trick key means "that is enough".
      this.angVel.multiplyScalar(1 - (1.2 + 7.0*levelAmt)*dt);
      var mr = 11.0;
      this.angVel.x = clamp(this.angVel.x, -mr, mr);
      this.angVel.y = clamp(this.angVel.y, -mr, mr);
      this.angVel.z = clamp(this.angVel.z, -mr, mr);

      this.pitch += this.angVel.x*dt;
      this.yaw += this.angVel.y*dt;
      this.roll += this.angVel.z*dt;

      if (levelAmt > 0.02 && this.airTime > 0.12) {
        var gn = T.normal(this.pos.x, this.pos.z, 7.0, {});
        var cy2 = Math.cos(this.yaw), sy2 = Math.sin(this.yaw);
        var k2 = 1 - Math.exp(-4.4*levelAmt*dt);
        this.pitch = lerp(this.pitch, Math.asin(clamp(-(gn.x*sy2 + gn.z*cy2), -1, 1)), k2);
        this.roll = lerp(this.roll, Math.atan2(-(gn.x*cy2 - gn.z*sy2), gn.y), k2);
      }

      var tr = this.trick;
      if (tr.active) {
        tr.pitchAcc += this.angVel.x*dt; tr.yawAcc += this.angVel.y*dt;
        tr.rollAcc += this.angVel.z*dt; tr.airtime = this.airTime;
        tr.maxHeight = Math.max(tr.maxHeight, this.pos.y - tr.startY);
      }

      this.susFront = crit(this.susFront, 0.02, dt, 9);
      this.susRear = crit(this.susRear, 0.02, dt, 9);
      this.steerAngle = lerp(this.steerAngle, -input.steer*0.5, 1 - Math.exp(-7*dt));
      this.crouch = lerp(this.crouch, 0.42, 1 - Math.exp(-5*dt));
      this.riderLean = lerp(this.riderLean, 0.15, 1 - Math.exp(-5*dt));
      this.riderShift = lerp(this.riderShift, 0, 1 - Math.exp(-5*dt));
      if (this.pos.y < gC - 8) this.crash('void');
    }

    var bx = this.pos.x, bz = this.pos.z;
    this.pos.addScaledVector(this.vel, dt);
    this.speed = this.vel.length();
    this.distance += Math.hypot(this.pos.x - bx, this.pos.z - bz);

    // Ground rising sharply ahead resists at any speed — otherwise pedalling
    // into a bank too steep to climb leaves the rider pinned there, pedal force
    // and hillside in a perfect stalemate. The rise has to be SUSTAINED: a
    // roller or a jump lip climbs then drops away, and you ride over it.
    if (this.grounded) {
      var ahead = 2.2;
      var hN = T.height(this.pos.x + sy*ahead, this.pos.z + cy*ahead);
      var hF = T.height(this.pos.x + sy*5.0, this.pos.z + cy*5.0);
      var aheadGrade = Math.min(hN - gC, hF - gC) / ahead;
      if (aheadGrade > 0.8) {
        var hardness = clamp((aheadGrade - 0.8)/0.6, 0, 1);
        // Resistance scales with how fast you are arriving. Riding at a bank
        // still stops you dead, but a rider already at a standstill is not
        // shoved backwards any more: the push-back used to be a flat 11 m/s^2,
        // which beat anything the rider could do and made a few spots on the
        // mountain permanent traps -- walking the bike over them was not
        // merely slow, it was impossible.
        var bite = clamp(this.speed/2.5, 0, 1);
        this.vel.multiplyScalar(1 - hardness*0.80*bite);
        this.vel.addScaledVector(_f, -hardness*11.0*bite*dt);
        this.pos.y = Math.max(this.pos.y, gC + R*0.6);
        if (hardness > 0.95 && this.speed > 16) this.crash('wall');
      }
    }

    // Hard floor, the last word every step. contactY is the MEAN of the two
    // wheel heights, so anywhere the ground between the wheels stands higher
    // than that mean -- a crest, a rut lip, a water bar -- the chassis was
    // free to sit inside the hill, and the spring clamp allowed a further
    // 0.3 m below even that. Measured over five descents the bike sank up to
    // 1.3 m under the surface and spent a fifth of its frames submerged.
    // Nothing below this line is reachable: the ground under the bike is the
    // floor, grounded or airborne, which also means a fast rider can never
    // tunnel through a face between two steps.
    // sampled HERE, at the position the step actually ended on: gC was taken
    // before the bike moved, and on a rise it is already metres out of date
    var floorY = T.height(this.pos.x, this.pos.z) + R*0.78;
    if (this.pos.y < floorY) {
      this.pos.y = floorY;
      // The fall stops here whether or not the wheels were already down:
      // letting a grounded chassis keep its downward velocity at the floor
      // measured worse on every count -- more crashes, less of each course
      // ridden -- because it spends the next steps driving back into the hill.
      if (this.vel.y < 0) this.vel.y = 0;
    }

    var lim = T.HALF - 60;
    if (Math.abs(this.pos.x) > lim) { this.pos.x = clamp(this.pos.x,-lim,lim); this.vel.x *= -0.2; }
    if (Math.abs(this.pos.z) > lim) { this.pos.z = clamp(this.pos.z,-lim,lim); this.vel.z *= -0.2; }

    this.wheelSpin += (this.vel.dot(_f)/R) * dt;
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    this.updateQuat();
  };

  function crit(cur, target, dt, rate) { return cur + (target-cur)*(1 - Math.exp(-rate*dt)); }

  Bike.prototype._takeoff = function () {
    var tr = this.trick;
    tr.active = true; tr.yawAcc = 0; tr.pitchAcc = 0; tr.rollAcc = 0;
    tr.airtime = 0; tr.maxHeight = 0; tr.startY = this.pos.y; tr.startPos.copy(this.pos);
    this.angVel.set(0,0,0);
    this.onTakeoff && this.onTakeoff();
  };

  Bike.prototype._land = function (n, input) {
    var tr = this.trick, impact = -this.vel.y;
    this.lastImpact = impact;
    // judged against a deliberately coarse normal: every rock and rut under the
    // wheel is not a verdict on the landing
    var ln = T.normal(this.pos.x, this.pos.z, 6.5, {});
    _u.set(0,1,0).applyQuaternion(this.quat);
    var align = _u.x*ln.x + _u.y*ln.y + _u.z*ln.z;
    _f.set(0,0,1).applyQuaternion(this.quat);
    var hv = _t.set(this.vel.x, 0, this.vel.z);
    var travelAlign = hv.lengthSq() > 4
      ? _f.clone().setY(0).normalize().dot(hv.clone().normalize()) : 1;
    this.lastAlign = align;

    // Coming down on a near-vertical face is a wall hit, not a wipeout: it costs
    // almost all your speed, which is punishment enough.
    // A low align score means the bike's wheels and the ground disagree -- but
    // that happens for TWO quite different reasons, and conflating them was a
    // bug: either the rider is inverted, or the ground is a cliff face. Here
    // ln.y says which. Coming down upright onto a near-vertical face at any
    // survivable speed is a wall hit; it was being read as "inverted" and
    // crashing the rider, who then respawned into the same face and hit it
    // again, over and over, with no way out.
    var wallFace = ln.y < 0.45 && _u.y > 0.25 && impact < 34 && this.airTime < 2.5;
    if (wallFace || (align < 0.12 && _u.y > 0.30 && impact < 18 && this.airTime < 1.8)) {
      this.vel.multiplyScalar(0.18);
      this.angVel.set(0,0,0);
      this.susFront = 1; this.susRear = 1;
      this.onLand && this.onLand(impact, true, null);
      tr.active = false; this.combo = 0;
      return;
    }

    // inversion is a fact about the BIKE, so a cliff face underneath cannot
    // make an upright rider "inverted"
    var inverted = _u.y < 0.10 || (align < 0.10 && ln.y > 0.45);
    var tooHard = impact > 27 + this.spec.travelF*50;
    if ((inverted && this.airTime > 0.45 && impact > 5) || tooHard) {
      this.onLand && this.onLand(impact, false, null);
      this.crash(inverted ? 'landing' : 'impact');
      return;
    }

    var cased = align < 0.55 && this.airTime > 0.35;
    var absorb = clamp(impact/28, 0, 1);
    if (cased) absorb = clamp(absorb + 0.35, 0, 1);
    this.susFront = clamp(this.susFront + absorb*1.1, 0, 1);
    this.susRear = clamp(this.susRear + absorb*1.1, 0, 1);
    this.vel.y *= -0.08;
    this.vel.multiplyScalar(clamp(1 - absorb*(1-align)*1.9 - (1-travelAlign)*0.45, 0.30, 1));
    this.angVel.set(0,0,0);

    var result = null;
    if (tr.active && this.airTime > 0.35) result = this._score();
    tr.active = false;
    this.onLand && this.onLand(impact, true, result);
  };

  var NAMES = { back1:'Backflip', back2:'Double Backflip', back3:'Triple Backflip',
    front1:'Frontflip', front2:'Double Frontflip', spin180:'180', spin360:'360',
    spin540:'540', spin720:'720', spin900:'900', spin1080:'1080',
    roll1:'Barrel Roll', roll2:'Double Barrel Roll' };

  Bike.prototype._score = function () {
    var tr = this.trick, pts = 0, names = [];
    var flips = Math.floor(Math.abs(tr.pitchAcc)/(Math.PI*2) + 0.18);
    if (flips > 0) {
      var back = tr.pitchAcc > 0;
      names.push(NAMES[(back?'back':'front') + Math.min(flips,3)] ||
                 (flips + 'x ' + (back?'Backflip':'Frontflip')));
      pts += flips * 520 * (back ? 1.0 : 1.15);
    }
    var spins = Math.floor(Math.abs(tr.yawAcc)/Math.PI + 0.22);
    if (spins > 0) { names.push(NAMES['spin'+(spins*180)] || (spins*180 + ' Spin')); pts += spins*190; }
    var rolls = Math.floor(Math.abs(tr.rollAcc)/(Math.PI*2) + 0.20);
    if (rolls > 0) { names.push(NAMES['roll'+Math.min(rolls,2)] || (rolls+'x Barrel Roll')); pts += rolls*610; }

    var dist = Math.hypot(this.pos.x - tr.startPos.x, this.pos.z - tr.startPos.z);
    pts += Math.floor(tr.airtime*42) + Math.floor(Math.max(0, tr.maxHeight)*8) +
           (dist > 12 ? Math.floor((dist-12)*7) : 0);
    if (tr.airtime > 1.6 && !names.length) names.push('Big Air');
    else if (!names.length && dist > 18) names.push('Gap Jump');
    if (pts < 12) return null;

    this.combo++; this.comboTimer = 3.4;
    var mult = 1 + (this.combo-1)*0.25;
    pts = Math.floor(pts*mult);
    this.score += pts; this.sessionScore += pts;
    this.lastTrick = { points:pts, names:names, combo:this.combo, mult:mult,
                       airtime:tr.airtime, distance:dist };
    return this.lastTrick;
  };

  Bike.prototype.crash = function (reason) {
    if (this.crashed) return;
    this.crashed = true; this.crashTimer = 0; this.crashReason = reason;
    this.combo = 0; this.trick.active = false;
    this.crashSpin = new THREE.Vector3((Math.random()-0.5)*7, (Math.random()-0.5)*5,
                                       (Math.random()-0.5)*8);
    this.onCrash && this.onCrash(reason);
  };

  Bike.prototype._crashStep = function (dt) {
    this.crashTimer += dt;
    this.vel.y -= G*dt;
    this.vel.multiplyScalar(1 - 1.8*dt);
    this.pos.addScaledVector(this.vel, dt);
    var g = T.height(this.pos.x, this.pos.z);
    if (this.pos.y < g + 0.30) {
      this.pos.y = g + 0.30;
      this.vel.y = Math.abs(this.vel.y) > 2.5 ? -this.vel.y*0.25 : 0;
      this.vel.x *= 0.72; this.vel.z *= 0.72;
      this.crashSpin.multiplyScalar(0.80);
    }
    this.pitch += this.crashSpin.x*dt; this.yaw += this.crashSpin.y*dt;
    this.roll += this.crashSpin.z*dt;
    this.speed = this.vel.length();
    this.susFront = crit(this.susFront, 0.5, dt, 8);
    this.susRear = crit(this.susRear, 0.5, dt, 8);
    this.updateQuat();
  };

  // True when the two wheel samples agree closely enough that the bike is on a
  // surface rather than straddling an edge.
  Bike.prototype.standable = function (x, z, yaw) {
    var hw = this.spec.geo.wheelbase * 0.5;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    return Math.abs(T.height(x + sy*hw, z + cy*hw) - T.height(x - sy*hw, z - cy*hw)) < 1.6;
  };

  Bike.prototype.respawn = function (target) {
    var x, z, yaw = this.yaw;
    if (target) { x = target.x; z = target.z; if (target.yaw !== undefined) yaw = target.yaw; }
    else {
      // Respawning is deterministic, so putting the rider back on the same
      // point means they ride the same line into the same feature and crash
      // again, forever. Each repeat crash in the same place steps the restart
      // further back up the trail, which gives a different approach and a way
      // out of the loop.
      if (this._lastRespawn &&
          Math.abs(this._lastRespawn.x - this.pos.x) < 90 &&
          Math.abs(this._lastRespawn.z - this.pos.z) < 90) this._respawnRetry++;
      else this._respawnRetry = 0;
      this._lastRespawn = { x: this.pos.x, z: this.pos.z };

      var near = MTB.Trails.nearestTrailPoint(this.pos.x, this.pos.z, 600);
      if (near) {
        var pts = near.edge.pts;
        // Step back up the trail on a repeat crash -- but at the head of an
        // edge there is nothing behind to step to, so go FORWARD instead and
        // put the rider past the feature rather than back onto it.
        var off = this._respawnRetry * 5, i0;
        if (near.i >= off) i0 = near.i - off;
        else i0 = Math.min(Math.max(pts.length - 4, 0), near.i + (off - near.i));
        i0 = Math.max(0, Math.min(i0, pts.length - 1));
        var i2 = Math.min(pts.length-1, i0+3);
        x = pts[i0].x; z = pts[i0].z;
        near = { p: pts[i0], i: i0, edge: near.edge };
        yaw = Math.atan2(pts[i2].x - near.p.x, pts[i2].z - near.p.z);
        if (pts[i2].y > near.p.y) yaw += Math.PI;    // always face downhill
      } else {
        // Off-piste with no trail in range, the old code put the rider back on
        // the exact spot they just crashed on, which for a bad patch of
        // mountain is an inescapable loop. Search outward instead for the
        // flattest standable ground nearby, widening the ring on each repeat.
        x = this.pos.x; z = this.pos.z;
        var bestS = 1e9, bx = x, bz = z, bYaw = yaw;
        var reach = 30 + this._respawnRetry * 45;
        for (var a = 0; a < 24; a++) {
          var ang = a * (Math.PI*2/24);
          for (var rr = 0.35; rr <= 1.0; rr += 0.325) {
            var tx = this.pos.x + Math.sin(ang)*reach*rr;
            var tz = this.pos.z + Math.cos(ang)*reach*rr;
            var sl = T.slopeAt(tx, tz);
            // face straight down the local fall line
            var hc = T.height(tx, tz), dStep = 6;
            var ty = Math.atan2(T.height(tx+dStep,tz)-hc, 0) * 0;
            var gx = T.height(tx+dStep,tz) - T.height(tx-dStep,tz);
            var gz = T.height(tx,tz+dStep) - T.height(tx,tz-dStep);
            var downYaw = Math.atan2(-gx, -gz);
            if (sl < bestS && this.standable(tx, tz, downYaw)) {
              bestS = sl; bx = tx; bz = tz; bYaw = downYaw;
            }
          }
        }
        x = bx; z = bz; yaw = bYaw;
      }
    }
    for (var t = 0; t < 10; t++) {
      if (T.slopeAt(x, z) < 0.75 && this.standable(x, z, yaw)) break;
      x += (Math.random()-0.5)*14; z += (Math.random()-0.5)*14;
    }
    this.placeAt(x, z, yaw);
  };

  Bike.prototype.visualState = function () {
    return { wheelSpin:this.wheelSpin, steerAngle:this.steerAngle,
             susFront:this.susFront, susRear:this.susRear, crankAngle:this.crankAngle,
             riderLean:this.riderLean, riderShift:this.riderShift,
             crouch:this.crouch, pedalling:this.pedalling };
  };

  MTB.BikePhysics = Bike;
})(window);
