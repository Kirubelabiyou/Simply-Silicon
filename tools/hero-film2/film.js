/* Timeline (seconds): rack and the GPU's dot, the room goes black, the dot crosses the dark,
   the chat opens out of it, the question is typed and sent, the answer streams in, hold, fade, repeat. */
(function () {
  var cv = document.getElementById('film'), ctx = cv.getContext('2d');
  var chat = document.getElementById('chat'), composer = document.getElementById('composer'), typed = document.getElementById('typed'), send = document.getElementById('send');
  var q = document.getElementById('q'), av = document.getElementById('av'), ans = document.getElementById('ans');
  var QUESTION = 'What is Simply Silicon?', L = 15, W = 1, H = 1, dpr = 1, phone = false, img, t0 = performance.now(), raf = 0, visible = true;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T = { lit: .5, dark0: 1.8, dark1: 2.6, move1: 3.7, open1: 4.35, type0: 4.55, chr: .055, press: 6.05, ask: 6.25, ans0: 6.75, tok: .068, out0: 14.1, out1: 14.8 };

  var words = ANSWER.split(' ').map(function (w) { var s = document.createElement('span'); s.className = 'w'; s.textContent = w + ' '; ans.appendChild(s); return s; });

  function size() { var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(1.75, devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); phone = W < 860; }
  function u(t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }
  function io(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function out(x) { return 1 - Math.pow(1 - x, 3); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function bez(p0, p1, p2, p3, x) { var v = 1 - x; return [v * v * v * p0[0] + 3 * v * v * x * p1[0] + 3 * v * x * x * p2[0] + x * x * x * p3[0], v * v * v * p0[1] + 3 * v * v * x * p1[1] + 3 * v * x * x * p2[1] + x * x * x * p3[1]]; }
  function rg(x, y, r, stops) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }

  // the photo is framed so the GPU's port sits where the dot starts
  function frame(zoom) {
    var iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(W / iw, H / ih) * zoom * (phone ? SHOT.phoneZoom : 1);
    var px = phone ? .5 : SHOT.px, py = phone ? .42 : SHOT.py, ox = px * W - SHOT.x * s, oy = py * H - SHOT.y * s;
    ox = Math.min(0, Math.max(W - iw * s, ox)); oy = Math.min(0, Math.max(H - ih * s, oy));
    return { s: s, ox: ox, oy: oy, w: iw * s, h: ih * s, p: [ox + SHOT.x * s, oy + SHOT.y * s] };
  }
  function dot(x, y, k, size) {
    if (k <= 0) return; size = size || 1; ctx.globalCompositeOperation = 'lighter';
    rg(x, y, 200 * size, [[0, 'rgba(40,140,230,' + .16 * k + ')'], [1, 'rgba(40,140,230,0)']]);
    rg(x, y, 36 * size, [[0, 'rgba(130,205,255,' + .9 * k + ')'], [.4, 'rgba(77,178,239,' + .35 * k + ')'], [1, 'rgba(77,178,239,0)']]);
    var sw = 130 * size * k, g = ctx.createLinearGradient(x - sw, 0, x + sw, 0);
    g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(.5, 'rgba(195,232,255,' + .55 * k + ')'); g.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - sw, y - .8 * size, sw * 2, 1.6 * size);
    ctx.beginPath(); ctx.arc(x, y, 3.3 * size, 0, 6.2832); ctx.fillStyle = 'rgba(242,250,255,' + k + ')'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  function target() { var r = composer.getBoundingClientRect(), c = cv.getBoundingClientRect(); return [r.left + r.width / 2 - c.left, r.top + r.height / 2 - c.top]; }

  var state = {};
  function set(k, v, fn) { if (state[k] !== v) { state[k] = v; fn(v); } }
  function chatAt(t) {
    // typing
    var n = Math.max(0, Math.min(QUESTION.length, Math.floor((t - T.type0) / T.chr)));
    set('typed', t < T.type0 ? -1 : n, function (n) { typed.innerHTML = n < 0 ? '<span class="ph">Ask anything</span><span class="caret"></span>' : QUESTION.slice(0, n).replace(/&/g, '&amp;') + '<span class="caret"></span>'; });
    set('ready', n > 0, function (v) { send.classList.toggle('ready', v); });
    set('press', t > T.press && t < T.press + .18, function (v) { send.classList.toggle('press', v); });
    set('gone', t > T.press + .12, function (v) { composer.classList.toggle('gone', v); });
    set('ask', t > T.ask, function (v) { q.classList.toggle('on', v); });
    set('av', t > T.ans0 - .25, function (v) { av.classList.toggle('on', v); });
    var k = Math.max(0, Math.floor((t - T.ans0) / T.tok) + 1);
    set('busy', t > T.ans0 - .25 && k <= words.length, function (v) { av.classList.toggle('busy', v); });
    set('words', Math.min(k, words.length), function (k) { for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < k); });
    set('fade', t > T.out0 ? Math.round(u(t, T.out0, T.out1) * 20) : 0, function (f) { chat.style.opacity = 1 - f / 20; });
  }

  function render(t, loop) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    var m = frame(lerp(1.16, 1.3, io(u(t, 0, T.dark1)))), p = m.p, c = [W * (phone ? .24 : .27), H * (phone ? .3 : .34)];
    // 1. the rack, then darkness
    var photo = u(t, 0, .7) * (1 - io(u(t, T.dark0, T.dark1)));
    if (photo > 0) { ctx.globalAlpha = photo; ctx.drawImage(img, m.ox, m.oy, m.w, m.h); ctx.globalAlpha = 1; }
    // 2. the dot: lit in the GPU, then alone in the dark, then across it
    var lit = out(u(t, T.lit, T.lit + .5)), flash = Math.max(0, 1 - Math.abs(t - T.lit - .25) / .2) * .45;
    var x = io(u(t, T.dark1, T.move1)), c1 = [p[0] + W * (phone ? .2 : .1), p[1] - H * (phone ? .22 : .3)], c2 = [c[0] + W * (phone ? .25 : .22), c[1] - H * (phone ? .2 : .28)], d = bez(p, c1, c2, c, x);
    if (photo > 0) { ctx.globalCompositeOperation = 'lighter'; rg(p[0], p[1], 320 * m.s, [[0, 'rgba(77,178,239,' + .22 * lit * photo + ')'], [1, 'rgba(77,178,239,0)']]); ctx.globalCompositeOperation = 'source-over'; }
    // the fiber: a fine glass strand out of the GPU's port, visible once the room is dark; the dot lights it from inside
    var fa = u(t, T.dark0 - .3, T.dark1 - .2) * (1 - u(t, T.move1 + .1, T.open1));
    if (fa > 0) {
      var P = []; for (var i = 0; i <= 80; i++) P.push(bez(p, c1, c2, c, i / 80));
      var line = function (a, b, col, w) { ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); for (var j = a + 1; j <= b; j++) ctx.lineTo(P[j][0], P[j][1]); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      line(0, 80, 'rgba(77,178,239,' + .05 * fa + ')', 12);
      line(0, 80, 'rgba(150,180,210,' + .28 * fa + ')', 2.6);
      line(0, 80, 'rgba(235,244,252,' + .45 * fa + ')', .8);
      var head = Math.round(x * 80);
      if (head > 0) {
        ctx.globalCompositeOperation = 'lighter';
        for (var k = 1; k <= head; k++) { var age = (head - k) / 80, g = Math.max(0, 1 - age * 2.2) * fa; if (g <= 0) continue; line(k - 1, k, 'rgba(77,178,239,' + .32 * g + ')', 7); line(k - 1, k, 'rgba(175,228,255,' + .95 * g + ')', 1.8); }
        // light scattering inside the glass just behind the dot
        for (var sp = 0; sp < 5; sp++) { var kk = Math.max(0, head - 2 - sp * 3 - Math.floor((t * 40 + sp * 7) % 3)); var pp = P[kk]; ctx.fillStyle = 'rgba(210,240,255,' + (.7 - sp * .12) * fa + ')'; ctx.fillRect(pp[0] - 1, pp[1] - 1, 2, 2); }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // 3. the chat opens out of the dot
    var o = io(u(t, T.move1, T.open1)), R = Math.hypot(Math.max(c[0], W - c[0]), Math.max(c[1], H - c[1])) + 4, r = o * R;
    var dk = Math.min(1, lit + flash) * (t < T.move1 ? 1 : 1 - u(t, T.move1, T.move1 + .35));
    dot(d[0], d[1], dk, t > T.dark1 ? 1.15 : 1);
    if (o > 0 && o < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(c[0], c[1], r + 1.5, 0, 6.2832); ctx.strokeStyle = 'rgba(120,200,255,' + .55 * (1 - o) + ')'; ctx.lineWidth = 2; ctx.stroke(); rg(c[0], c[1], r + 60, [[Math.max(0, r / (r + 60) - .02), 'rgba(77,178,239,0)'], [r / (r + 60), 'rgba(77,178,239,' + .18 * (1 - o) + ')'], [1, 'rgba(77,178,239,0)']]); ctx.globalCompositeOperation = 'source-over'; }
    set('clip', Math.round(r), function (rr) { chat.style.clipPath = 'circle(' + rr + 'px at ' + Math.round(c[0]) + 'px ' + Math.round(c[1]) + 'px)'; chat.style.webkitClipPath = chat.style.clipPath; });
    chatAt(t);
  }
  function tick(now) {
    var S = window.__T != null ? window.__T : (now - t0) / 1000, loop = Math.floor(S / L), t = S - loop * L;
    if (state.loop !== loop) { state = { loop: loop }; chat.style.opacity = 1; }
    render(t, loop);
    raf = visible ? requestAnimationFrame(tick) : 0;
  }
  function still() { state = {}; render(L - 2, 0); }
  function restart() { t0 = performance.now(); state = {}; if (reduce) still(); else if (!raf) raf = requestAnimationFrame(tick); }
  img = new Image();
  img.onload = function () {
    size();
    if (reduce) still(); else raf = requestAnimationFrame(tick);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf && !reduce) raf = requestAnimationFrame(tick); }).observe(cv);
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); state.clip = null; if (reduce) still(); }, 120); });
    document.getElementById('replay').addEventListener('click', restart);
  };
  img.src = SHOT.src;
})();
