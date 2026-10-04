/* Option 1: Simply Silicon's private fiber routes trace out from Foundation across a night map of downtown Calgary.
   Data: City of Calgary street centrelines, building footprints, the Bow River, and the fiber routes from gosimply.ai's network map. */
(function () {
  var cv = document.getElementById('fiber'), ctx = cv.getContext('2d');
  var CAL = window.SS_CALGARY, STR = window.SS_STREETS, BLD = window.SS_BLD || [];
  var LNG0 = CAL.foundation.coordinate[0], LAT0 = CAL.foundation.coordinate[1];
  var KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KY = 110574;
  function P(c) { return [(c[0] - LNG0) * KX, -(c[1] - LAT0) * KY]; }
  function dec(a, start) { var pts = [], x = 0, z = 0; for (var i = start; i < a.length; i += 2) { x += a[i]; z += a[i + 1]; pts.push([x / 10, z / 10]); } return pts; }
  var roads = STR.s.map(function (a) { return { c: a[0], pts: dec(a, 3) }; });
  var blds = BLD.map(function (a) { return { h: a[0] / 10, pts: dec(a, 1) }; });
  function len(p) { var L = 0, c = [0]; for (var i = 1; i < p.length; i++) { L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); c.push(L); } return { L: L, cum: c }; }
  var routes = CAL.routes.map(function (r) {
    var p = r.c.map(P); if (Math.hypot(p[p.length - 1][0], p[p.length - 1][1]) < Math.hypot(p[0][0], p[0][1])) p.reverse();
    var m = len(p); return { pts: p, L: m.L, cum: m.cum, trunk: !!r.trunk, near: Math.hypot(p[0][0], p[0][1]) };
  });
  var maxNear = Math.max.apply(null, routes.map(function (r) { return r.near; }));
  routes.forEach(function (r) { r.t0 = .5 + (r.near / maxNear) * 1.5; r.dur = Math.max(.5, Math.min(1.6, r.L / 700)); });
  var ends = CAL.endpoints.map(function (e) { var p = P(e.c); return { p: p, name: e.name, t: 0 }; });
  ends.forEach(function (e) { // light each endpoint when the nearest route end reaches it
    var best = 9e9, tt = 3.2;
    routes.forEach(function (r) { var q = r.pts[r.pts.length - 1], d = Math.hypot(q[0] - e.p[0], q[1] - e.p[1]); if (d < best) { best = d; tt = r.t0 + r.dur; } });
    e.t = best < 60 ? tt : 2.4 + Math.hypot(e.p[0], e.p[1]) / 1200;
  });
  var RIVER = STR.r || [];

  var W = 1, H = 1, dpr = 1, S = 1, ox = 0, oy = 0, base = document.createElement('canvas');
  function X(p) { return ox + p[0] * S; } function Y(p) { return oy + p[1] * S; }
  function size() {
    var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; base.width = cv.width; base.height = cv.height;
    var phone = W < 860;
    S = Math.max(W / (phone ? 1500 : 2700), H / (phone ? 1900 : 1500));
    ox = W * (phone ? .58 : .7); oy = H * (phone ? .2 : .5);
    drawBase();
  }
  function path(c, pts) { c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p)); }); }
  function drawBase() {
    var c = base.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    // river
    if (RIVER.length) {
      c.beginPath(); RIVER.forEach(function (r, i) { var p = [r[0], r[1]]; i ? c.lineTo(X(p), Y(p)) : c.moveTo(X(p), Y(p)); });
      for (var i = RIVER.length - 1; i >= 0; i--) c.lineTo(X([RIVER[i][0], RIVER[i][2]]), Y([RIVER[i][0], RIVER[i][2]]));
      c.closePath(); c.fillStyle = '#0a1422'; c.fill();
    }
    // streets, by class
    roads.forEach(function (r) { path(c, r.pts); c.strokeStyle = r.c <= 2 ? 'rgba(160,180,205,.16)' : 'rgba(160,180,205,.09)'; c.lineWidth = Math.max(.6, (r.c <= 2 ? 9 : 5) * S); c.lineCap = 'round'; c.stroke(); });
    // buildings, taller ones a touch lighter
    blds.forEach(function (b) { path(c, b.pts); c.closePath(); var k = Math.min(1, b.h / 180); c.fillStyle = 'rgba(' + (16 + k * 18) + ',' + (20 + k * 20) + ',' + (28 + k * 26) + ',.95)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.04)'; c.lineWidth = .6; c.stroke(); });
  }
  function partial(r, f) { // points of the route up to fraction f
    var target = r.L * f, out = [r.pts[0]];
    for (var i = 1; i < r.pts.length; i++) {
      if (r.cum[i] <= target) { out.push(r.pts[i]); continue; }
      var a = r.pts[i - 1], b = r.pts[i], u = (target - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1]); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); break;
    }
    return out;
  }
  function at(r, d) { d = ((d % r.L) + r.L) % r.L; for (var i = 1; i < r.pts.length; i++) if (r.cum[i] >= d) { var a = r.pts[i - 1], b = r.pts[i], u = (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; } return r.pts[r.pts.length - 1]; }
  var ease = function (u) { return 1 - Math.pow(1 - u, 3); };
  var t0 = performance.now(), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, raf = 0, visible = true;
  function frame(now) {
    var t = reduce ? 99 : (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, t / .8); ctx.drawImage(base, 0, 0, W, H); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    routes.forEach(function (r) {
      var f = Math.max(0, Math.min(1, (t - r.t0) / r.dur)); if (f <= 0) return;
      var pts = partial(r, ease(f));
      path(ctx, pts); ctx.strokeStyle = 'rgba(42,163,245,.16)'; ctx.lineWidth = Math.max(5, (r.trunk ? 30 : 22) * S); ctx.stroke();
      path(ctx, pts); ctx.strokeStyle = 'rgba(77,178,239,.55)'; ctx.lineWidth = Math.max(2, (r.trunk ? 9 : 6) * S); ctx.stroke();
      path(ctx, pts); ctx.strokeStyle = 'rgba(210,238,255,.95)'; ctx.lineWidth = Math.max(.9, (r.trunk ? 3 : 2) * S); ctx.stroke();
      if (f < 1) { var h = pts[pts.length - 1], g = ctx.createRadialGradient(X(h), Y(h), 0, X(h), Y(h), 26); g.addColorStop(0, 'rgba(220,242,255,.95)'); g.addColorStop(1, 'rgba(77,178,239,0)'); ctx.fillStyle = g; ctx.fillRect(X(h) - 26, Y(h) - 26, 52, 52); }
      else if (!reduce) { // ambient pulses once the network is lit
        for (var k = 0; k < (r.trunk ? 3 : 2); k++) { var q = at(r, (t - r.t0 - r.dur) * 160 + k * r.L / (r.trunk ? 3 : 2)), g2 = ctx.createRadialGradient(X(q), Y(q), 0, X(q), Y(q), 9); g2.addColorStop(0, 'rgba(230,246,255,.9)'); g2.addColorStop(1, 'rgba(77,178,239,0)'); ctx.fillStyle = g2; ctx.fillRect(X(q) - 9, Y(q) - 9, 18, 18); }
      }
    });
    ends.forEach(function (e) {
      var f = Math.max(0, Math.min(1, (t - e.t) / .6)); if (f <= 0) return;
      var x = X(e.p), y = Y(e.p), r = 5 + 10 * ease(f), g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
      g.addColorStop(0, 'rgba(160,220,255,' + (.75 * f) + ')'); g.addColorStop(1, 'rgba(77,178,239,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(235,248,255,' + f + ')'; ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    // Foundation
    var fx = X([0, 0]), fy = Y([0, 0]), pulse = reduce ? .5 : (t * .7) % 1;
    ctx.beginPath(); ctx.arc(fx, fy, 6 + pulse * 26, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(77,178,239,' + (.6 * (1 - pulse)) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI * 2); ctx.fillStyle = '#4db2ef'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#05070b'; ctx.stroke();
    var ph = W < 860, lx = ph ? fx - 14 : fx + 14; ctx.textAlign = ph ? 'right' : 'left';
    ctx.font = '600 13px Instrument Sans, sans-serif'; ctx.fillStyle = 'rgba(244,244,245,' + Math.min(1, t / 1.2) + ')'; ctx.fillText('Foundation', lx, fy + 4.5);
    ctx.font = '500 11px Instrument Sans, sans-serif'; ctx.fillStyle = 'rgba(160,170,184,' + Math.min(1, Math.max(0, t - 3.4)) + ')'; ctx.fillText(ph ? '7 km private fiber' : '7 km private fiber · 25+ connected buildings', lx, fy + 22); ctx.textAlign = 'left';
    if (!reduce && visible) raf = requestAnimationFrame(frame); else raf = 0;
  }
  function start() { t0 = performance.now(); if (!raf) raf = requestAnimationFrame(frame); }
  size(); start();
  addEventListener('resize', function () { size(); if (!raf) raf = requestAnimationFrame(frame); });
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(cv);
  document.getElementById('replay').addEventListener('click', start);
})();
