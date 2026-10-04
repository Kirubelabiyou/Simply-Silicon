/* Timeline (seconds)
   0.0  the rack; one point of light comes on in the middle bay
   1.7  the rack falls away to black, only the light remains
   2.4  the light moves through the dark, a fine trail behind it
   3.1  it enters the fiber: a bundle of glass strands, the camera riding along one of them
   4.3  the bundle straightens into horizontal strands
   6.0  the light leaves the fiber and settles as the chat's mark; the panel opens
   7.1  the question is typed and sent, the answer streams in
   15.6 fade, repeat */
(function () {
  var cv = document.getElementById('film'), ctx = cv.getContext('2d');
  var panel = document.getElementById('panel'), mark = document.getElementById('mark'), composer = document.getElementById('composer'), typed = document.getElementById('typed'), send = document.getElementById('send');
  var answer = document.getElementById('answer'), ans = document.getElementById('ans'), copy = document.getElementById('copy');
  var QUESTION = 'What is Simply Silicon?', L = 16.8, W = 1, H = 1, dpr = 1, phone = false, img, t0 = performance.now(), raf = 0, visible = true;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T = { lit: .4, dark0: 1.7, dark1: 2.4, fib0: 3.1, morph0: 4.3, morph1: 5.1, fib1: 6.0, panel0: 6.2, panel1: 6.9, type0: 7.15, chr: .055, press: 8.6, up: 8.75, ans: 9.2, w0: 9.45, tok: .07, out0: 15.6, out1: 16.4 };
  var SRC = [1280, 934];

  var words = ANSWER.split(' ').map(function (w) { var s = document.createElement('span'); s.className = 'w'; s.textContent = w + ' '; ans.appendChild(s); return s; });

  function size() { var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(1.75, devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); phone = W < 860; build(); }
  function u(t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }
  function io(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function out(x) { return 1 - Math.pow(1 - x, 3); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function bez(p, x) { var v = 1 - x; return [v * v * v * p[0][0] + 3 * v * v * x * p[1][0] + 3 * v * x * x * p[2][0] + x * x * x * p[3][0], v * v * v * p[0][1] + 3 * v * v * x * p[1][1] + 3 * v * x * x * p[2][1] + x * x * x * p[3][1]]; }
  function rg(x, y, r, stops) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function rnd(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* The light: a hot white core with a cool halo, never saturated. */
  function dot(x, y, k, s) {
    if (k <= 0) return; s = s || 1; ctx.globalCompositeOperation = 'lighter';
    rg(x, y, 160 * s, [[0, 'rgba(150,190,240,' + .12 * k + ')'], [1, 'rgba(150,190,240,0)']]);
    rg(x, y, 26 * s, [[0, 'rgba(225,240,255,' + .95 * k + ')'], [.35, 'rgba(170,205,250,' + .4 * k + ')'], [1, 'rgba(170,205,250,0)']]);
    var sw = 70 * s * k, g = ctx.createLinearGradient(x - sw, 0, x + sw, 0);
    g.addColorStop(0, 'rgba(200,225,255,0)'); g.addColorStop(.5, 'rgba(225,238,255,' + .45 * k + ')'); g.addColorStop(1, 'rgba(200,225,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - sw, y - .6 * s, sw * 2, 1.2 * s);
    ctx.beginPath(); ctx.arc(x, y, 3.4 * s, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,' + k + ')'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  /* The fiber bundle. Each strand has two shapes: sweeping up through the frame, and running flat across it. */
  var strands = [];
  function build() {
    var R = rnd(11), N = phone ? 44 : 70; strands = [];
    for (var i = 0; i < N; i++) {
      var o = (i / (N - 1)) * 2 - 1 + (R() - .5) * .06, z = R(), j = (R() - .5) * .04;
      if (i === Math.floor(N / 2)) { o = 0; z = 1; j = 0; }
      var A = [[.62 + .8 * o, 1.15], [.52 + .38 * o + j, .76], [.47 + .1 * o, .26 + j], [.55 + .03 * o, -.18]];
      var B = [[-.12, .52 + .5 * o], [.35, .5 + .13 * o + j], [.7, .5 + .035 * o], [1.12, .5 + .3 * o + j]];
      strands.push({ o: o, z: z, A: A, B: B, ph: R(), sp: .35 + R() * .5, hero: o === 0 });
    }
  }
  function shape(s, m) { var p = []; for (var k = 0; k < 4; k++) p.push([lerp(s.A[k][0], s.B[k][0], m) * W, lerp(s.A[k][1], s.B[k][1], m) * H]); return p; }
  function stroke(P, a, b, n, col, w) { ctx.beginPath(); for (var k = 0; k <= n; k++) { var q = bez(P, lerp(a, b, k / n)); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); }
  function fibers(t, fa, m, ud) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var hero = null;
    strands.forEach(function (s) {
      var P = shape(s, m);
      if (s.hero) { hero = P; return; }
      var near = s.z < .14; // strands close to the lens, soft and out of focus
      var a = (near ? .035 : .05 + .28 * s.z * s.z) * fa, w = near ? 7 + 10 * s.z : .5 + 1.3 * s.z;
      stroke(P, -.35, 1.35, 48, 'rgba(205,222,245,' + a * .55 + ')', w * 3.2 + 2);
      stroke(P, -.35, 1.35, 48, 'rgba(205,222,245,' + a + ')', w);
      // light travelling back along the glass, so the camera feels like it is moving forward
      for (var d = 0; d < 2; d++) {
        var c = ((s.ph + d * .5 - t * s.sp * .5) % 1 + 1) % 1, len = .06 + .05 * s.z;
        stroke(P, Math.max(0, c - len), c, 8, 'rgba(230,240,255,' + (near ? .03 : .08 + .26 * s.z) * fa + ')', near ? w : w + .3);
      }
    });
    if (hero) {
      stroke(hero, -.35, 1.35, 56, 'rgba(215,230,250,' + .4 * fa + ')', 1.4);
      stroke(hero, Math.max(0, ud - .3), ud, 30, 'rgba(170,205,250,' + .25 * fa + ')', 6);
      stroke(hero, Math.max(0, ud - .3), ud, 30, 'rgba(240,247,255,' + .85 * fa + ')', 1.6);
    }
    ctx.globalCompositeOperation = 'source-over';
    return hero;
  }

  function frame(zoom) {
    var iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(W / iw, H / ih) * zoom * (phone ? 1.3 : 1);
    var ox = W * .5 - SRC[0] * s, oy = H * .46 - SRC[1] * s;
    ox = Math.min(0, Math.max(W - iw * s, ox)); oy = Math.min(0, Math.max(H - ih * s, oy));
    return { ox: ox, oy: oy, w: iw * s, h: ih * s, s: s, p: [ox + SRC[0] * s, oy + SRC[1] * s] };
  }
  function markPos() { var r = mark.getBoundingClientRect(), c = cv.getBoundingClientRect(); return [r.left + r.width / 2 - c.left, r.top + r.height / 2 - c.top]; }

  var state = {};
  function set(k, v, fn) { if (state[k] !== v) { state[k] = v; fn(v); } }
  function dom(t) {
    var pv = Math.round(io(u(t, T.panel0, T.panel1)) * (1 - u(t, T.out0, T.out1)) * 40) / 40;
    set('panel', pv, function (v) { panel.style.opacity = v; panel.style.transform = 'scale(' + (.985 + .015 * v) + ')'; });
    set('mark', t > T.panel1 - .25, function (v) { mark.style.transition = 'opacity .5s'; mark.style.opacity = v ? 1 : 0; });
    set('copy', t > T.panel0 + .4 && t < T.out0, function (v) { copy.classList.toggle('on', v); });
    var n = Math.max(0, Math.min(QUESTION.length, Math.floor((t - T.type0) / T.chr)));
    set('typed', t < T.type0 ? -1 : n, function (n) { typed.innerHTML = n < 0 ? '<span class="ph">Ask anything</span><span class="caret"></span>' : QUESTION.slice(0, n) + (t < T.press ? '<span class="caret"></span>' : ''); });
    set('caretoff', t > T.press, function (v) { if (v) typed.textContent = QUESTION; });
    set('ready', n > 0, function (v) { send.classList.toggle('ready', v); });
    set('press', t > T.press && t < T.press + .16, function (v) { send.classList.toggle('press', v); });
    set('up', t > T.up, function (v) { composer.classList.toggle('up', v); });
    set('ans', t > T.ans, function (v) { answer.classList.toggle('on', v); });
    var k = Math.max(0, Math.floor((t - T.w0) / T.tok) + 1);
    set('busy', t > T.ans && k <= words.length, function (v) { answer.classList.toggle('busy', v); });
    set('words', Math.min(k, words.length), function (k) { for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < k); });
  }

  function render(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    var f = frame(lerp(1.04, 1.16, io(u(t, 0, T.dark1)))), p1 = f.p;
    // 1. the rack
    var photo = u(t, 0, .6) * (1 - io(u(t, T.dark0, T.dark1)));
    if (photo > 0) { ctx.globalAlpha = photo; ctx.drawImage(img, f.ox, f.oy, f.w, f.h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; rg(p1[0], p1[1], 260 * f.s, [[0, 'rgba(170,205,250,' + .16 * photo * out(u(t, T.lit, T.lit + .5)) + ')'], [1, 'rgba(170,205,250,0)']]); ctx.globalCompositeOperation = 'source-over'; }
    var lit = out(u(t, T.lit, T.lit + .5)), flash = Math.max(0, 1 - Math.abs(t - T.lit - .2) / .2) * .4;
    // where the light meets the fiber, and the path it takes through the dark to get there
    var ud = lerp(.5, .68, u(t, T.fib0, T.fib1)), m = io(u(t, T.morph0, T.morph1));
    var heroS = strands.filter(function (s) { return s.hero; })[0], D2 = bez(shape(heroS, 0), .5);
    var path = [p1, [p1[0] - W * .14, p1[1] + H * .34], [D2[0] - W * .12, D2[1] + H * .3], D2];
    var x = io(u(t, T.dark1, T.fib0 + .1)), pos;
    if (t < T.dark1) pos = p1;
    else if (t < T.fib0 + .1) pos = bez(path, x);
    else pos = bez(shape(heroS, m), ud);
    // 2. the trail through the dark
    var ta = (t > T.dark1 ? 1 : 0) * (1 - u(t, T.fib0, T.fib0 + .6));
    if (ta > 0 && x > 0) {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (var i = 1; i <= 30; i++) { var a = bez(path, Math.max(0, x - .5 + (i - 1) * .5 / 30)), b = bez(path, Math.max(0, x - .5 + i * .5 / 30)), g = i / 30; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = 'rgba(225,238,255,' + .7 * g * g * ta + ')'; ctx.lineWidth = .6 + 1.4 * g; ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    // 3. the fiber
    var fa = u(t, T.fib0, T.fib0 + .55) * (1 - u(t, T.fib1 - .1, T.fib1 + .5));
    if (fa > 0) {
      fibers(t, fa, m, ud);
      var hp = bez(shape(heroS, m), ud), vg = ctx.createRadialGradient(hp[0], hp[1], Math.min(W, H) * .08, hp[0], hp[1], Math.max(W, H) * .75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(.6, 'rgba(0,0,0,' + .45 * fa + ')'); vg.addColorStop(1, 'rgba(0,0,0,' + .8 * fa + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    // 4. the light leaves the fiber and becomes the chat's mark
    var mp = markPos(), lx = io(u(t, T.fib1, T.panel1 - .15));
    if (lx > 0) { var from = bez(shape(heroS, 1), lerp(.5, .68, 1)); pos = [lerp(from[0], mp[0], lx), lerp(from[1], mp[1], lx) - Math.sin(lx * Math.PI) * H * .06]; }
    var k = Math.min(1, lit + flash) * (1 - u(t, T.panel1 - .3, T.panel1 + .1));
    dot(pos[0], pos[1], k, t > T.dark1 ? 1.1 : .9);
    dom(t);
  }
  function tick(now) {
    var S = window.__T != null ? window.__T : (now - t0) / 1000, loop = Math.floor(S / L), t = S - loop * L;
    if (state.loop !== loop) state = { loop: loop };
    render(t);
    raf = visible ? requestAnimationFrame(tick) : 0;
  }
  function still() { state = {}; render(L - 2.5); }
  function restart() { t0 = performance.now(); state = {}; if (reduce) still(); else if (!raf) raf = requestAnimationFrame(tick); }
  img = new Image();
  img.onload = function () {
    size();
    if (reduce) still(); else raf = requestAnimationFrame(tick);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf && !reduce) raf = requestAnimationFrame(tick); }).observe(cv);
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); if (reduce) still(); }, 120); });
    document.getElementById('replay').addEventListener('click', restart);
  };
  img.src = 'img/rack.webp';
})();
