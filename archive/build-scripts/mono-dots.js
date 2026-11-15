/* mono: the page background is a field of small, dim dots; a few at a time slowly brighten and fade again.
   One fixed canvas behind the content. Still dots only when the visitor asks for reduced motion. */
(function () {
  var cv = document.createElement('canvas');
  cv.className = 'dot-field'; cv.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext('2d'), GAP = 22, R = 1, BASE = .09, PEAK = .42;
  var dpr, W, H, cols, rows, base, lit = [], last = 0;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cols = Math.ceil(W / GAP) + 1; rows = Math.ceil(H / GAP) + 1;
    // the resting dots are drawn once, then copied each frame
    base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height;
    var b = base.getContext('2d'); b.scale(dpr, dpr); b.fillStyle = 'rgba(255,255,255,' + BASE + ')';
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) { b.beginPath(); b.arc(x * GAP + GAP / 2, y * GAP + GAP / 2, R, 0, 6.2832); b.fill(); }
    lit = []; draw(0);
  }
  function spawn(t) { lit.push({ x: (Math.random() * cols) | 0, y: (Math.random() * rows) | 0, t0: t, d: 1800 + Math.random() * 2600, p: .5 + Math.random() * .5 }); }
  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lit = lit.filter(function (d) {
      var k = (t - d.t0) / d.d; if (k >= 1) return false;
      var a = Math.sin(k * Math.PI) * PEAK * d.p;   // fades in, then out
      ctx.fillStyle = 'rgba(255,255,255,' + (BASE + a).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(d.x * GAP + GAP / 2, d.y * GAP + GAP / 2, R + a * 1.2, 0, 6.2832); ctx.fill();
      return true;
    });
  }
  function frame(t) {
    if (t - last > 33) {   // about 30 frames a second is plenty for a slow fade
      var want = Math.round(cols * rows * .012);
      while (lit.length < want) spawn(t - Math.random() * 1500);
      draw(t); last = t;
    }
    requestAnimationFrame(frame);
  }
  size();
  window.addEventListener('resize', function () { clearTimeout(size.t); size.t = setTimeout(size, 150); });
  if (!still) requestAnimationFrame(frame);
})();
