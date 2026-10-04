/* Downtown Calgary seen from the south at night, built from the City of Calgary's building footprints and heights.
   Returns an offscreen canvas and the screen position of a destination tower for the dot to reach. */
var SKY = (function () {
  var CAL = window.SS_CALGARY, BLD = window.SS_BLD || [];
  var LNG0 = CAL.foundation.coordinate[0], LAT0 = CAL.foundation.coordinate[1], KX = 111320 * Math.cos(LAT0 * Math.PI / 180);
  function dec(a) { var x = 0, z = 0, xs = [], zs = []; for (var i = 1; i < a.length; i += 2) { x += a[i]; z += a[i + 1]; xs.push(x / 10); zs.push(z / 10); } return { x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), z0: Math.min.apply(null, zs), z1: Math.max.apply(null, zs) }; }
  var blds = BLD.map(function (a) { var b = dec(a); b.h = a[0] / 10; b.z = (b.z0 + b.z1) / 2; return b; })
    .filter(function (b) { return b.x0 > -2000 && b.x1 < 900 && b.z > -1100 && b.z < 600 && b.h > 5; })
    .sort(function (a, b) { return a.z - b.z; }); // far (north) first
  var towerX = (-114.0630 - LNG0) * KX;
  function rnd(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* opts: {W, H, base (0..1), span (screen widths covered), left (0..1 offset), hmax (fraction of H for 200 m), mode: 'night'|'line'} */
  function render(o) {
    var W = o.W, H = o.H, dpr = o.dpr || 1, c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sx = W * o.span / 2900, sy = H * o.hmax / 200, base = H * o.base, left = W * o.left;
    function X(x) { return left + (x + 2000) * sx; }
    var R = rnd(7);
    if (o.mode === 'night') {
      var sk = g.createLinearGradient(0, 0, 0, base); sk.addColorStop(0, '#020409'); sk.addColorStop(.7, '#07101d'); sk.addColorStop(1, '#122338');
      g.fillStyle = sk; g.fillRect(0, 0, W, H);
      var glow = g.createRadialGradient(W * .6, base, 0, W * .6, base, W * .7); glow.addColorStop(0, 'rgba(90,120,160,.22)'); glow.addColorStop(1, 'rgba(90,120,160,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    }
    var tops = new Float32Array(Math.ceil(W) + 1).fill(base), target = null, best = -1;
    blds.forEach(function (b) {
      var x0 = X(b.x0), x1 = X(b.x1), top = base - b.h * sy, d = (b.z + 1100) / 1700; // 0 far .. 1 near
      if (x1 < -4 || x0 > W + 4) return;
      for (var px = Math.max(0, x0 | 0); px <= Math.min(W, x1); px++) tops[px] = Math.min(tops[px], top);
      if (o.mode === 'night') {
        var l = 14 + (1 - d) * 22; g.fillStyle = 'rgb(' + (l * .8 | 0) + ',' + (l * .95 | 0) + ',' + (l * 1.3 | 0) + ')';
        g.fillRect(x0, top, Math.max(1, x1 - x0), b.h * sy + 2);
        g.fillStyle = 'rgba(255,255,255,' + (.03 + (1 - d) * .03) + ')'; g.fillRect(x0, top, Math.max(1, x1 - x0), 1);
        var fl = Math.max(4, 3.8 * sy), cw = Math.max(3, 3.4 * sx * 1.6);
        for (var y = top + fl * .6; y < base - fl * .5; y += fl) for (var x = x0 + cw * .5; x < x1 - cw * .4; x += cw) {
          var r = R(); if (r > .14) continue;
          g.fillStyle = r < .03 ? 'rgba(150,200,255,' + (.35 + R() * .3) + ')' : 'rgba(255,214,160,' + (.18 + R() * .35) + ')';
          g.fillRect(x, y, Math.max(1, cw * .45), Math.max(1, fl * .32));
        }
      }
      var sxm = (x0 + x1) / 2;
      if (b.h > 90 && sxm > W * o.tx0 && sxm < W * o.tx1 && b.h > best) { best = b.h; target = { x: sxm, top: top, base: base, w: x1 - x0 }; }
    });
    // Calgary Tower
    var tx = X(towerX);
    if (o.mode === 'night') {
      g.fillStyle = '#1a2230'; g.fillRect(tx - 3, base - 160 * sy, 6, 160 * sy);
      g.beginPath(); g.ellipse(tx, base - 165 * sy, 12, 8, 0, 0, 6.283); g.fill();
      g.fillRect(tx - 1, base - 191 * sy, 2, 26 * sy);
      g.fillStyle = 'rgba(255,90,80,.9)'; g.fillRect(tx - 1, base - 191 * sy - 2, 2, 2);
      var ground = g.createLinearGradient(0, base, 0, H); ground.addColorStop(0, '#0a1220'); ground.addColorStop(1, '#030509'); g.fillStyle = ground; g.fillRect(0, base, W, H - base);
      var haze = g.createLinearGradient(0, base - H * .16, 0, base + 4); haze.addColorStop(0, 'rgba(120,150,190,0)'); haze.addColorStop(1, 'rgba(120,150,190,.14)'); g.fillStyle = haze; g.fillRect(0, base - H * .16, W, H * .16 + 4);
    }
    for (var px = Math.max(0, (tx - 3) | 0); px <= tx + 3; px++) if (px < tops.length) tops[px] = Math.min(tops[px], base - 160 * sy);
    if (o.mode === 'line') {
      g.beginPath(); g.moveTo(0, tops[0]);
      for (var i = 1; i < tops.length; i++) g.lineTo(i, tops[i]);
      g.strokeStyle = 'rgba(170,200,230,.22)'; g.lineWidth = 1; g.stroke();
      g.lineTo(W, base); g.lineTo(0, base); g.closePath();
      var f = g.createLinearGradient(0, base - H * .3, 0, base); f.addColorStop(0, 'rgba(120,160,200,.04)'); f.addColorStop(1, 'rgba(120,160,200,0)'); g.fillStyle = f; g.fill();
      g.beginPath(); g.moveTo(0, base + .5); g.lineTo(W, base + .5); g.strokeStyle = 'rgba(170,200,230,.12)'; g.stroke();
    }
    return { canvas: c, target: target || { x: W * .7, top: base - H * .3, base: base, w: 20 }, base: base };
  }
  return { render: render };
})();
