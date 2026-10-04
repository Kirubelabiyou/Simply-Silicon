/* Option 4: thousands of points of light stream in like tokens and settle into the downtown Calgary skyline,
   seen from the south, built from the City of Calgary's building heights. Foundation glows in the logo blue. */
(function () {
  var cv = document.getElementById('tokens'), ctx = cv.getContext('2d');
  var CAL = window.SS_CALGARY, BLD = window.SS_BLD || [];
  var LNG0 = CAL.foundation.coordinate[0], LAT0 = CAL.foundation.coordinate[1], KX = 111320 * Math.cos(LAT0 * Math.PI / 180);
  function dec(a) { var pts = [], x = 0, z = 0; for (var i = 1; i < a.length; i += 2) { x += a[i]; z += a[i + 1]; pts.push([x / 10, z / 10]); } return pts; }
  var blds = BLD.map(function (a) { var p = dec(a), xs = p.map(function (q) { return q[0]; }), zs = p.map(function (q) { return q[1]; }); return { h: a[0] / 10, x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), z: (Math.min.apply(null, zs) + Math.max.apply(null, zs)) / 2 }; })
    .filter(function (b) { return b.x0 > -1900 && b.x1 < 700 && b.z > -900 && b.z < 500 && b.h > 6; });
  var towerX = (-114.0630 - LNG0) * KX; // Calgary Tower, 191 m
  var W = 1, H = 1, dpr = 1, N = 0, px, py, tx, ty, sx, sy, del, kind, tw;
  function build() {
    var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    var phone = W < 860, left = phone ? W * .04 : W * .36, right = W * (phone ? .96 : .97), baseY = H * (phone ? .36 : .8);
    var sx0 = (right - left) / 2600, sy0 = (H * (phone ? .25 : .52)) / 200;
    var off = document.createElement('canvas'), ow = Math.ceil(W), oh = Math.ceil(H); off.width = ow; off.height = oh;
    var o = off.getContext('2d');
    function X(x) { return left + (x + 1900) * sx0; }
    blds.sort(function (a, b) { return b.z - a.z; }).forEach(function (b) { o.fillStyle = Math.abs(b.x0 + b.x1) < 120 && Math.abs(b.z) < 80 ? '#00f' : '#fff'; o.fillRect(X(b.x0), baseY - b.h * sy0, Math.max(1.5, (b.x1 - b.x0) * sx0), b.h * sy0); });
    o.fillStyle = '#fff'; o.fillRect(X(towerX) - 2, baseY - 160 * sy0, 4, 160 * sy0); o.beginPath(); o.ellipse(X(towerX), baseY - 165 * sy0, 9, 7, 0, 0, Math.PI * 2); o.fill(); o.fillRect(X(towerX) - 1, baseY - 191 * sy0, 2, 26 * sy0);
    o.fillStyle = '#00f'; o.fillRect(X(-40), baseY - 14 * sy0, 80 * sx0, 14 * sy0); // Foundation, low and wide, in blue
    var img = o.getImageData(0, 0, ow, oh).data, pts = [], step = phone ? 4 : 3.2;
    for (var y = 0; y < oh; y += step) for (var x = 0; x < ow; x += step) { var i = ((y | 0) * ow + (x | 0)) * 4; if (img[i + 3] > 0) pts.push([x + (Math.random() - .5) * 1.2, y + (Math.random() - .5) * 1.2, img[i] < 10 ? 1 : 0]); }
    var max = phone ? 3600 : 9000; if (pts.length > max) { for (var k = pts.length - 1; k > 0; k--) { var j = (Math.random() * (k + 1)) | 0, t = pts[k]; pts[k] = pts[j]; pts[j] = t; } pts.length = max; }
    // ground line of points
    for (var gx = left; gx < right; gx += step * 1.6) pts.push([gx, baseY + 2, 2]);
    N = pts.length; px = new Float32Array(N); py = new Float32Array(N); tx = new Float32Array(N); ty = new Float32Array(N); sx = new Float32Array(N); sy = new Float32Array(N); del = new Float32Array(N); kind = new Uint8Array(N); tw = new Float32Array(N);
    for (var n = 0; n < N; n++) {
      tx[n] = pts[n][0]; ty[n] = pts[n][1]; kind[n] = pts[n][2];
      sx[n] = W + 20 + Math.random() * W * .5; sy[n] = ty[n] + (Math.random() - .5) * H * .5; // streams in from the right, like tokens
      del[n] = (1 - (tx[n] - left) / (right - left)) * .9 + Math.random() * .7; tw[n] = Math.random() * 6.28;
    }
  }
  var t0 = 0, raf = 0, visible = true, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now) {
    var t = reduce ? 99 : (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var n = 0; n < N; n++) {
      var u = Math.max(0, Math.min(1, (t - del[n]) / 1.9)), e = 1 - Math.pow(1 - u, 4);
      var x = sx[n] + (tx[n] - sx[n]) * e, y = sy[n] + (ty[n] - sy[n]) * e + Math.sin(u * 3.14) * -18;
      var a = u <= 0 ? 0 : (u < 1 ? .25 + .6 * e : .55 + .35 * Math.sin(t * 1.4 + tw[n]) * .5 + .2);
      if (a <= 0) continue;
      if (kind[n] === 1) { ctx.fillStyle = 'rgba(110,200,255,' + Math.min(1, a + .25) + ')'; ctx.fillRect(x - 1.1, y - 1.1, 2.4, 2.4); }
      else if (kind[n] === 2) { ctx.fillStyle = 'rgba(77,178,239,' + (a * .5) + ')'; ctx.fillRect(x, y, 1.4, 1.4); }
      else { ctx.fillStyle = 'rgba(214,226,240,' + (a * .78) + ')'; ctx.fillRect(x - .7, y - .7, 1.5, 1.5); }
      if (u > 0 && u < 1) { ctx.fillStyle = 'rgba(140,205,250,' + (.18 * (1 - u)) + ')'; ctx.fillRect(x + 6 * (1 - e), y, 8 * (1 - e), 1); }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!reduce && visible) raf = requestAnimationFrame(frame); else raf = 0;
  }
  function start() { t0 = performance.now(); if (!raf) raf = requestAnimationFrame(frame); }
  build(); start();
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); if (!raf) raf = requestAnimationFrame(frame); }, 150); });
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(cv);
  document.getElementById('replay').addEventListener('click', start);
})();
