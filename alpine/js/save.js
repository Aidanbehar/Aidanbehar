/* Alpine Descent — save.js : local progression. Everything is earned by riding. */
(function (root) {
  'use strict';
  var MTB = root.MTB, KEY = 'alpine-descent-save-v2';
  var DEFAULTS = {
    coins:0, totalDistance:0, totalScore:0, bestScore:0, ridesCompleted:0,
    ownedBikes:['kestrel'], currentBike:'kestrel',
    customisation:{ kestrel:{}, ridgeline:{}, boulder:{}, granite:{}, vapor:{} },
    rider:{ jersey:0xd23a2e, pants:0x2c2e33, helmetColor:0x22304f, gloves:0x1a1c20,
            helmetStyle:'full', goggles:true },
    discovered:{}, courseRecords:{}, stuntRecords:{},
    settings:{ quality:'high', vegetation:1.0, shadows:true, drawDistance:1.0, fov:68,
               sensitivity:1.0, sfx:0.8, music:0.35, invertY:false, weather:'dynamic' }
  };
  function merge(t, s) {
    for (var k in s) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) t[k] = merge(t[k]||{}, s[k]);
      else if (t[k] === undefined) t[k] = s[k];
    }
    return t;
  }
  var S = MTB.Save = {
    data:null,
    load: function () {
      var d = null;
      try { var raw = root.localStorage.getItem(KEY); if (raw) d = JSON.parse(raw); } catch (e) {}
      this.data = merge(d || {}, JSON.parse(JSON.stringify(DEFAULTS)));
      return this.data;
    },
    save: function () {
      try { root.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    },
    reset: function () { this.data = JSON.parse(JSON.stringify(DEFAULTS)); this.save(); },
    addCoins: function (n) { this.data.coins += Math.max(0, Math.floor(n)); this.save(); return this.data.coins; },
    spend: function (n) { if (this.data.coins < n) return false; this.data.coins -= n; this.save(); return true; },
    ownsBike: function (id) { return this.data.ownedBikes.indexOf(id) !== -1; },
    buyBike: function (id, price) {
      if (this.ownsBike(id)) return true;
      if (!this.spend(price)) return false;
      this.data.ownedBikes.push(id); this.save(); return true;
    },
    discover: function (n) {
      if (this.data.discovered[n]) return false;
      this.data.discovered[n] = Date.now(); this.save(); return true;
    },
    isDiscovered: function (n) { return !!this.data.discovered[n]; },
    discoveredCount: function () { return Object.keys(this.data.discovered).length; },
    recordCourse: function (id, time, stats) {
      var rec = this.data.courseRecords[id], better = !rec || time < rec.time;
      if (better) this.data.courseRecords[id] = { time:time, date:Date.now(),
        avgSpeed: stats?stats.avgSpeed:0, crashes: stats?stats.crashes:0 };
      this.data.ridesCompleted++; this.save(); return better;
    },
    recordStunt: function (id, score) {
      var rec = this.data.stuntRecords[id], better = !rec || score > rec.score;
      if (better) this.data.stuntRecords[id] = { score:score, date:Date.now() };
      this.save(); return better;
    },
    addDistance: function (m) { this.data.totalDistance += m; },
    addScore: function (s2) { this.data.totalScore += s2; if (s2 > this.data.bestScore) this.data.bestScore = s2; }
  };
})(window);
