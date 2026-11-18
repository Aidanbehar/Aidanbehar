/* Alpine Descent — audio.js
   Everything synthesised. There are no engine sounds anywhere in this game
   because there is no engine: what you hear is tyre roar on dirt, wind over the
   helmet, the freewheel ticking when you coast, disc brakes and chain slap. */
(function (root) {
  'use strict';
  var MTB = root.MTB;

  function Audio() {
    this.ctx = null; this.ready = false; this.muted = false;
    this.volSfx = 0.8; this.volMusic = 0.35; this.freewheelNext = 0;
  }

  Audio.prototype.init = function () {
    if (this.ready) return;
    var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return;
    var ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = this.volSfx; this.sfxGain.connect(this.master);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = this.volMusic; this.musicGain.connect(this.master);

    var len = Math.floor(ctx.sampleRate * 2.5);
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = this.noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random()*2 - 1;

    function loop(self, filters, gainVal) {
      var src = ctx.createBufferSource(); src.buffer = self.noiseBuf; src.loop = true;
      var node = src;
      filters.forEach(function (f) { node.connect(f); node = f; });
      var g = ctx.createGain(); g.gain.value = gainVal;
      node.connect(g); g.connect(self.sfxGain); src.start();
      return g;
    }
    var bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=620; bp.Q.value=0.75;
    var lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2400;
    this.tyre = { gain: loop(this, [bp, lp], 0), bp:bp, lp:lp };
    var lp2 = ctx.createBiquadFilter(); lp2.type='lowpass'; lp2.frequency.value=190;
    this.rumble = { gain: loop(this, [lp2], 0) };
    var hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=160;
    var lp3 = ctx.createBiquadFilter(); lp3.type='lowpass'; lp3.frequency.value=450;
    this.wind = { gain: loop(this, [hp, lp3], 0), lp:lp3 };

    var osc = ctx.createOscillator(); osc.type='sawtooth'; osc.frequency.value=1850;
    var bbp = ctx.createBiquadFilter(); bbp.type='bandpass'; bbp.frequency.value=2400; bbp.Q.value=9;
    var bg = ctx.createGain(); bg.gain.value = 0;
    osc.connect(bbp); bbp.connect(bg); bg.connect(this.sfxGain); osc.start();
    this.brake = { gain:bg, osc:osc };

    this.voices = [];
    [110, 164.81, 220, 246.94].forEach(function (f, i) {
      var o = ctx.createOscillator(); o.type = i%2 ? 'sine' : 'triangle'; o.frequency.value = f;
      var g = ctx.createGain(); g.gain.value = 0;
      var l = ctx.createBiquadFilter(); l.type='lowpass'; l.frequency.value=900;
      o.connect(l); l.connect(g); g.connect(this.musicGain); o.start();
      this.voices.push({ o:o, g:g, base:f, phase:Math.random()*6.28 });
    }, this);
    this.ready = true;
  };

  Audio.prototype.resume = function () { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); };

  Audio.prototype.blip = function (freq, dur, type, vol, to) {
    if (!this.ready || this.muted) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = type||'sine';
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20,to), t+dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol||0.25, t+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t+dur+0.05);
  };
  Audio.prototype.noiseBurst = function (dur, freq, q, vol, to) {
    if (!this.ready || this.muted) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random()*0.5;
    var f = ctx.createBiquadFilter(); f.type='bandpass';
    f.frequency.setValueAtTime(freq, t); f.Q.value = q||1.2;
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(30,to), t+dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol||0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t, Math.random()); src.stop(t+dur+0.02);
  };

  Audio.prototype.land = function (impact) {
    var v = Math.min(1, impact/20);
    this.noiseBurst(0.16+v*0.2, 90+v*50, 0.8, 0.22+v*0.45, 55);
    this.blip(70+v*30, 0.16, 'sine', 0.16+v*0.3, 40);
  };
  Audio.prototype.crash = function () {
    this.noiseBurst(0.55, 380, 0.6, 0.55, 90);
    this.blip(140, 0.32, 'square', 0.16, 50);
    var s = this; setTimeout(function () { s.noiseBurst(0.35, 220, 0.9, 0.3, 70); }, 110);
  };
  Audio.prototype.checkpoint = function () {
    this.blip(880, 0.09, 'triangle', 0.22);
    var s = this; setTimeout(function () { s.blip(1320, 0.16, 'triangle', 0.20); }, 85);
  };
  Audio.prototype.discover = function () {
    var s = this;
    [523,659,784,1047].forEach(function (f,i) { setTimeout(function () { s.blip(f,0.22,'sine',0.17); }, i*95); });
  };
  Audio.prototype.trick = function (p) {
    var b = 520 + Math.min(600, p*0.12);
    this.blip(b, 0.10, 'triangle', 0.17);
    var s = this; setTimeout(function () { s.blip(b*1.5, 0.14, 'triangle', 0.15); }, 80);
  };
  Audio.prototype.uiClick = function () { this.blip(660, 0.045, 'square', 0.07); };
  Audio.prototype.uiBack = function () { this.blip(330, 0.06, 'square', 0.06); };
  Audio.prototype.hop = function () { this.noiseBurst(0.08, 700, 1.5, 0.10, 400); };

  Audio.prototype.update = function (dt, st) {
    if (!this.ready) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var sp01 = Math.min(1, (st.speed||0)/22), mute = this.muted;
    var tyre = st.grounded ? (0.035 + sp01*0.30)*(0.55 + st.roughness*0.8) : 0;
    if (st.crashed) tyre *= 0.4;
    this.tyre.gain.gain.setTargetAtTime(mute?0:tyre, t, 0.05);
    this.tyre.bp.frequency.setTargetAtTime(420 + sp01*900 + st.roughness*350, t, 0.08);
    this.tyre.lp.frequency.setTargetAtTime(1200 + sp01*3200, t, 0.08);
    this.rumble.gain.gain.setTargetAtTime(mute?0:(st.grounded?sp01*st.roughness*0.30:0), t, 0.06);
    this.wind.gain.gain.setTargetAtTime(mute?0:(0.012 + Math.pow(sp01,1.8)*0.26 + (st.airborne?0.05:0)), t, 0.12);
    this.wind.lp.frequency.setTargetAtTime(280 + sp01*900, t, 0.15);

    var br = 0;
    if (st.braking && st.grounded && st.speed > 1.2)
      br = 0.018 * Math.min(1, st.speed/10) * (st.speed < 9 ? 1 : 0.35);
    this.brake.gain.gain.setTargetAtTime(mute?0:br, t, 0.04);
    this.brake.osc.frequency.setTargetAtTime(1500 + st.speed*45, t, 0.1);

    // the freewheel ticks when you coast — that is what a bicycle does
    if (st.grounded && !st.pedalling && st.speed > 0.8 && !st.crashed && !mute) {
      if (t > this.freewheelNext) {
        this.freewheelNext = t + Math.max(0.02, 0.42/Math.max(st.speed, 0.5));
        this.noiseBurst(0.018, 2600, 6, 0.035 + Math.min(0.04, st.speed*0.003), 2100);
      }
    }
    if (st.grounded && st.roughness > 0.5 && st.speed > 5 && Math.random() < dt*5*st.roughness)
      this.noiseBurst(0.05, 1700, 3.5, 0.045, 900);

    var target = (!mute) ? 0.16 : 0;
    for (var i = 0; i < this.voices.length; i++) {
      var v = this.voices[i];
      v.phase += dt*(0.06 + i*0.017);
      v.g.gain.setTargetAtTime(target*(0.45 + 0.55*(0.5 + 0.5*Math.sin(v.phase))), t, 0.9);
      v.o.frequency.setTargetAtTime(v.base*(1 + Math.sin(v.phase*0.4)*0.004), t, 1.2);
    }
  };
  Audio.prototype.setVolumes = function (s, m) {
    this.volSfx = s; this.volMusic = m;
    if (this.sfxGain) this.sfxGain.gain.value = s;
    if (this.musicGain) this.musicGain.gain.value = m;
  };
  Audio.prototype.duck = function (on) {
    if (this.master) this.master.gain.setTargetAtTime(on?0.25:1.0, this.ctx.currentTime, 0.12);
  };
  MTB.Audio = Audio;
})(window);
