/* The page background: a field of small, dim dots; a few at a time slowly brighten and fade again.
   Made to cost almost nothing:
   - the resting dots are the canvas's CSS background, never redrawn;
   - one transparent canvas draws only the few lit dots, clearing just the tiny squares they use, about 20 times a second;
   - it pauses while a 3D view is on screen (the 3D model gets the device to itself), when the tab is hidden,
     and stays still for visitors who ask for reduced motion. */
(function () {
  var GAP = 22, R = 1, PEAK = .42, BOX = 8;
  // the canvas is fixed to the screen; its CSS background draws the resting dots (see .dot-field in mono.css)
  var cv = document.createElement('canvas');
  cv.className = 'dot-field'; cv.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(cv, document.body.firstChild);
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx = cv.getContext('2d'), dpr, cols, rows, lit = [], last = 0, sceneOn = 0, running = false;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / GAP); rows = Math.ceil(H / GAP); lit = [];
  }
  function cx(d) { return d.x * GAP + GAP / 2; }
  function cy(d) { return d.y * GAP + GAP / 2; }
  function clear(d) { ctx.clearRect(cx(d) - BOX / 2, cy(d) - BOX / 2, BOX, BOX); }
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (t - last < 50) return; last = t;            // about 20 frames a second is plenty for a slow fade
    var want = Math.round(cols * rows * .012);
    while (lit.length < want) lit.push({ x: (Math.random() * cols) | 0, y: (Math.random() * rows) | 0, t0: t - Math.random() * 1500, d: 1800 + Math.random() * 2600, p: .5 + Math.random() * .5 });
    lit = lit.filter(function (d) {
      var k = (t - d.t0) / d.d; clear(d);
      if (k >= 1) return false;
      var a = Math.sin(k * Math.PI) * PEAK * d.p;   // fades in, then out
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(cx(d), cy(d), R + a * 1.2, 0, 6.2832); ctx.fill();
      return true;
    });
  }
  function update() {
    var go = !document.hidden && sceneOn === 0;
    if (go && !running) { running = true; requestAnimationFrame(frame); }
    if (!go && running) { running = false; }
  }
  size();
  window.addEventListener('resize', function () { clearTimeout(size.t); size.t = setTimeout(function () { ctx.clearRect(0, 0, cv.width, cv.height); size(); }, 150); });
  document.addEventListener('visibilitychange', update);
  // pause while any 3D view is on screen
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var was = e.target.__on; e.target.__on = e.isIntersecting; if (was !== e.isIntersecting) sceneOn += e.isIntersecting ? 1 : (was ? -1 : 0); });
      update();
    });
    document.querySelectorAll('.scene, #loopScene, .net-3d').forEach(function (s) { io.observe(s); });
  }
  update();
})();
