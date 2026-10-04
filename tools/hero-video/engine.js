/* Shared film engine for the hero loops: canvas sizing, photo framing, the blue dot, grain, and the chat card. */
var FILM = (function () {
  var cv = document.getElementById('film'), ctx = cv.getContext('2d');
  var hero = document.querySelector('.hero');
  var F = { cv: cv, ctx: ctx, W: 1, H: 1, dpr: 1, phone: false };
  F.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  F.size = function () {
    var r = cv.getBoundingClientRect();
    F.W = Math.max(1, r.width); F.H = Math.max(1, r.height); F.dpr = Math.min(1.75, window.devicePixelRatio || 1);
    cv.width = Math.round(F.W * F.dpr); cv.height = Math.round(F.H * F.dpr); F.phone = F.W < 860;
    // on phones the film shows through the band between the chat card and the headline
    F.band = .5; F.bandH = 1;
    if (F.phone) { var cb = document.getElementById('chat').getBoundingClientRect().bottom - r.top, hb = document.querySelector('.copy h1').getBoundingClientRect().top - r.top; F.band = ((cb + hb) / 2) / F.H; F.bandH = Math.max(80, hb - cb) / F.H; }
  };

  F.load = function (map) {
    var keys = Object.keys(map), out = {};
    return Promise.all(keys.map(function (k) {
      return new Promise(function (res) { var im = new Image(); im.onload = function () { out[k] = im; res(); }; im.onerror = function () { res(); }; im.src = map[k]; });
    })).then(function () { return out; });
  };

  /* Frame a photo: point (fx, fy) in image pixels lands at (px, py) of the screen (0..1), at zoom times "cover" scale.
     Returns a mapper so overlays can follow features in the photo. */
  F.frame = function (img, fx, fy, px, py, zoom, mode) {
    var iw = img.naturalWidth, ih = img.naturalHeight, W = F.W, H = F.H;
    var s = (mode === 'height' ? H / ih : Math.max(W / iw, H / ih)) * zoom;
    var ox = px * W - fx * s, oy = py * H - fy * s;
    if (mode !== 'height' && mode !== 'free') { ox = Math.min(0, Math.max(W - iw * s, ox)); oy = Math.min(0, Math.max(H - ih * s, oy)); }
    return { s: s, ox: ox, oy: oy, w: iw * s, h: ih * s, p: function (x, y) { return [ox + x * s, oy + y * s]; } };
  };
  F.draw = function (img, m, a) { if (a <= 0) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(img, m.ox, m.oy, m.w, m.h); ctx.globalAlpha = 1; };

  F.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  F.u = function (t, a, b) { return F.clamp((t - a) / (b - a), 0, 1); };
  F.io = function (u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  F.out = function (u) { return 1 - Math.pow(1 - u, 3); };
  F.inn = function (u) { return u * u * u; };
  F.lerp = function (a, b, u) { return a + (b - a) * u; };
  F.bez = function (p0, p1, p2, p3, u) {
    var v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  };

  function rg(x, y, r, stops) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }

  /* The blue dot: hot core, blue halo, a wide soft spill and a thin anamorphic streak. k is brightness 0..1. */
  F.dot = function (x, y, k, size) {
    if (k <= 0 || !isFinite(x) || !isFinite(y)) return;
    size = size || 1;
    ctx.globalCompositeOperation = 'lighter';
    rg(x, y, 180 * size, [[0, 'rgba(40,140,230,' + .16 * k + ')'], [1, 'rgba(40,140,230,0)']]);
    rg(x, y, 34 * size, [[0, 'rgba(120,200,255,' + .85 * k + ')'], [.4, 'rgba(77,178,239,' + .35 * k + ')'], [1, 'rgba(77,178,239,0)']]);
    var sw = 120 * size * k, g = ctx.createLinearGradient(x - sw, 0, x + sw, 0);
    g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(.5, 'rgba(190,230,255,' + .55 * k + ')'); g.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - sw, y - .8 * size, sw * 2, 1.6 * size);
    ctx.beginPath(); ctx.arc(x, y, 3.2 * size, 0, 6.2832); ctx.fillStyle = 'rgba(240,250,255,' + k + ')'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };
  F.glow = function (x, y, r, a, col) { ctx.globalCompositeOperation = 'lighter'; rg(x, y, r, [[0, 'rgba(' + (col || '77,178,239') + ',' + a + ')'], [1, 'rgba(' + (col || '77,178,239') + ',0)']]); ctx.globalCompositeOperation = 'source-over'; };

  /* A light trail behind a moving dot. pts: array of [x, y], newest last. */
  F.trail = function (pts, k, width) {
    if (pts.length < 2 || k <= 0) return;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (var i = 1; i < pts.length; i++) {
      var f = i / pts.length;
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.strokeStyle = 'rgba(120,200,255,' + (.7 * f * f * k) + ')'; ctx.lineWidth = (width || 3) * f; ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  // film grain and a soft vignette over everything
  var noise = document.createElement('canvas'); noise.width = noise.height = 180;
  (function () { var c = noise.getContext('2d'), d = c.createImageData(180, 180); for (var i = 0; i < d.data.length; i += 4) { var v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } c.putImageData(d, 0, 0); })();
  F.finish = function () {
    var W = F.W, H = F.H, g = ctx.createRadialGradient(W * .55, H * .45, Math.min(W, H) * .3, W * .55, H * .45, Math.max(W, H) * .78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .07;
    var ox = -Math.random() * 180, oy = -Math.random() * 180;
    for (var x = ox; x < W; x += 180) for (var y = oy; y < H; y += 180) ctx.drawImage(noise, x, y);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };

  /* Chat card: words are laid out up front (so the card never jumps) and revealed one token at a time. */
  var chat = document.getElementById('chat'), ans = document.getElementById('ans'), think = document.getElementById('think'), words = [];
  F.chat = {
    el: chat,
    build: function (text) { ans.textContent = ''; text.split(' ').forEach(function (w, i) { var s = document.createElement('span'); s.className = 'w'; s.textContent = w + ' '; ans.appendChild(s); words.push(s); }); },
    count: function () { return words.length; },
    reset: function () { words.forEach(function (w) { w.classList.remove('on'); }); think.classList.add('on'); chat.classList.remove('live'); },
    show: function (n) { if (n > 0) think.classList.remove('on'); for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n); if (F.phone) ans.parentNode.scrollTop = 1e6; },
    all: function () { think.classList.remove('on'); words.forEach(function (w) { w.classList.add('on'); }); if (F.phone) ans.parentNode.scrollTop = 1e6; },
    hide: function (on) { chat.classList.toggle('fade', on); },
    pulse: function () { chat.classList.remove('hit'); void chat.offsetWidth; chat.classList.add('hit'); },
    target: function () { var a = document.getElementById('chatDot').getBoundingClientRect(), c = cv.getBoundingClientRect(); return [a.left + a.width / 2 - c.left, a.top + a.height / 2 - c.top]; }
  };

  /* Run a looping timeline. render(t, loop) draws one frame; t is seconds into the loop, loop counts passes. */
  F.run = function (L, render, still) {
    var t0 = performance.now(), raf = 0, visible = true;
    function tick(now) {
      var T = window.__T != null ? window.__T : (now - t0) / 1000, loop = Math.floor(T / L), t = T - loop * L;
      ctx.setTransform(F.dpr, 0, 0, F.dpr, 0, 0); ctx.clearRect(0, 0, F.W, F.H);
      render(t, loop, T);
      F.finish();
      raf = visible ? requestAnimationFrame(tick) : 0;
    }
    function drawStill() { ctx.setTransform(F.dpr, 0, 0, F.dpr, 0, 0); ctx.clearRect(0, 0, F.W, F.H); still(); F.finish(); }
    F.restart = function () { t0 = performance.now(); if (F.onRestart) F.onRestart(); if (F.reduce) drawStill(); else if (!raf) raf = requestAnimationFrame(tick); };
    F.size();
    if (F.reduce) { drawStill(); F.chat.all(); }
    else { if (F.onRestart) F.onRestart(); raf = requestAnimationFrame(tick); }
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf && !F.reduce) raf = requestAnimationFrame(tick); }).observe(cv);
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { F.size(); if (F.onResize) F.onResize(); if (F.reduce) drawStill(); }, 120); });
    document.getElementById('replay').addEventListener('click', F.restart);
  };
  F.size();
  return F;
})();
