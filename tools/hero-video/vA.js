/* Film A, cinematic. Foundation at night, then inside: one GPU lights a blue dot. It leaves through the port,
   races down the fiber, crosses downtown Calgary to another building, and lands in the chat as the answer. */
(function () {
  var F = FILM, ctx = F.ctx, L = 7.2, IMG, SK, chatState = { start: -1 };
  F.chat.build(ANSWER);
  function sky() { var p = F.phone; SK = SKY.render({ W: F.W, H: F.H, dpr: F.dpr, mode: 'night', base: p ? F.band + F.bandH * .42 : .8, hmax: p ? F.bandH * .75 : .5, span: p ? 2.4 : 1.3, left: p ? -.75 : -.08, tx0: p ? .35 : .55, tx1: p ? .85 : .86 }); }

  var PORT = [1334, 1490], WIN = [690, 1196], TIPS = [1065, 612], STRAND0 = [0, 618];

  function bgNight() { var g = ctx.createLinearGradient(0, 0, 0, F.H); g.addColorStop(0, '#020409'); g.addColorStop(1, '#0b1626'); ctx.fillStyle = g; ctx.fillRect(0, 0, F.W, F.H); }
  function sceneFoundation(t, a) {
    if (a <= 0) return null;
    var push = F.lerp(1.02, 1.16, F.inn(F.u(t, 0, 1.3)));
    var m = F.frame(IMG.foundation, WIN[0], WIN[1], F.phone ? .5 : .7, F.phone ? F.band : .64, push * 1.06, 'height');
    ctx.globalAlpha = a; bgNight(); ctx.globalAlpha = 1;
    F.draw(IMG.foundation, m, a);
    // feather the photo edges into the night
    var e = Math.min(160, m.w * .25);
    [[m.ox, m.ox + e, 1], [m.ox + m.w, m.ox + m.w - e, 1]].forEach(function (s) {
      var g = ctx.createLinearGradient(s[0], 0, s[1], 0); g.addColorStop(0, 'rgba(5,9,16,' + a + ')'); g.addColorStop(1, 'rgba(5,9,16,0)'); ctx.fillStyle = g;
      ctx.fillRect(Math.min(s[0], s[1]) - (s[0] < s[1] ? 2 : 0), 0, e + 2, F.H);
    });
    var w = m.p(WIN[0], WIN[1]), k = F.out(F.u(t, .55, 1.15)) * a;
    F.dot(w[0], w[1], k * .7, .7);
    return w;
  }
  function sceneGPU(t, a) {
    if (a <= 0) return;
    var m = F.frame(IMG.gpu, PORT[0], PORT[1], F.phone ? .5 : .64, F.phone ? F.band : .46, F.lerp(1.2, 1.38, F.io(F.u(t, 1.1, 3.2))) * (F.phone ? 1.25 : 1), F.phone ? 'free' : '');
    F.draw(IMG.gpu, m, a);
    var p = m.p(PORT[0], PORT[1]), ig = F.out(F.u(t, 1.4, 1.85)), flash = Math.max(0, 1 - Math.abs(t - 1.62) / .18) * .5;
    var hold = t < 2.45 ? 1 + .08 * Math.sin(t * 9) : 1;
    F.glow(p[0], p[1], 300 * m.s, .22 * ig * a);
    var u = F.inn(F.u(t, 2.45, 3.1)), q = F.bez(p, [p[0] + F.W * .2, p[1] - 10], [F.W * .9, p[1] - F.H * .05], [F.W + 80, p[1] - F.H * .08], u);
    if (u > 0) { var tr = []; for (var i = 0; i <= 14; i++) tr.push(F.bez(p, [p[0] + F.W * .2, p[1] - 10], [F.W * .9, p[1] - F.H * .05], [F.W + 80, p[1] - F.H * .08], Math.max(0, u - .2 + i * .2 / 14))); F.trail(tr, a, 4); }
    F.dot(q[0], q[1], Math.min(1, (ig * hold + flash)) * a, 1.15);
  }
  function sceneFiber(t, a) {
    if (a <= 0) return;
    var m = F.frame(IMG.fiber, TIPS[0], TIPS[1], F.phone ? .62 : .6, F.phone ? F.band : .27, F.lerp(1.5, 1.62, F.u(t, 2.95, 4.8)));
    F.draw(IMG.fiber, m, a * .6);
    var s0 = [-40, m.p(0, STRAND0[1])[1]], tip = m.p(TIPS[0], TIPS[1]), u = F.io(F.u(t, 3.05, 4.15)), q, tr = [];
    if (t < 4.15) { q = [F.lerp(s0[0], tip[0], u), F.lerp(s0[1], tip[1], u)]; for (var i = 0; i <= 12; i++) { var v = Math.max(0, u - .18 + i * .18 / 12); tr.push([F.lerp(s0[0], tip[0], v), F.lerp(s0[1], tip[1], v)]); } }
    else { var w = F.inn(F.u(t, 4.15, 4.7)); q = [F.lerp(tip[0], F.W + 80, w), F.lerp(tip[1], tip[1] - F.H * .04, w)]; tr = [tip, q]; }
    // the strands light up behind the dot as it passes
    [[0, .14], [30, .14], [60, .12], [90, .1]].forEach(function (s) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Math.max(0, q[0] - s[0]), F.H); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; F.draw(IMG.fiber, m, a * s[1]); ctx.restore(); }); ctx.globalCompositeOperation = 'source-over';
    F.glow(q[0], q[1], 220, .35 * a);
    var burst = Math.max(0, 1 - Math.abs(t - 4.18) / .35);
    F.glow(tip[0], tip[1], 260 * m.s * 1.4, .5 * burst * a, '150,210,255');
    F.trail(tr, a, 6); F.dot(q[0], q[1], a, 1.6); F.dot(q[0], q[1], a * .6, .6);
  }
  function sceneSky(t, a, loop, T) {
    if (a <= 0) return;
    var z = F.lerp(1, 1.045, F.u(t, 4.6, 7.2)), cx = F.W * .62, cy = SK.base;
    function Z(p) { return [cx + (p[0] - cx) * z, cy + (p[1] - cy) * z]; }
    ctx.globalAlpha = a; ctx.drawImage(SK.canvas, cx - cx * z, cy - cy * z, F.W * z, F.H * z); ctx.globalAlpha = 1;
    var tg = SK.target, b = [tg.x, tg.base - 3], top = [tg.x, tg.top + 2], q, tr = [];
    if (t < 4.7) return;
    var c = F.chat.target();
    if (t < 5.6) { var u = F.io(F.u(t, 4.7, 5.6)); q = Z([F.lerp(-40, b[0], u), b[1]]); tr = [Z([F.lerp(-40, b[0], Math.max(0, u - .25)), b[1]]), q]; }
    else if (t < 6.0) { var v = F.io(F.u(t, 5.6, 6.0)); q = Z([b[0], F.lerp(b[1], top[1], v)]); tr = [Z(b), q]; }
    else { var w = F.io(F.u(t, 6.02, 6.85)), p0 = Z(top), c1 = [p0[0], p0[1] - F.H * .2], c2 = [c[0] - F.W * .05, c[1] + F.H * .1]; q = F.bez(p0, c1, c2, c, w); for (var i = 0; i <= 14; i++) tr.push(F.bez(p0, c1, c2, c, Math.max(0, w - .3 + i * .3 / 14))); }
    // the tower wakes up as the dot climbs it
    var wake = F.u(t, 5.55, 6.1) * (1 - F.u(t, 6.6, 7.2) * .6), tt = Z(top), bb = Z(b);
    if (wake > 0) { ctx.globalCompositeOperation = 'lighter'; var g = ctx.createLinearGradient(0, bb[1], 0, tt[1]); g.addColorStop(0, 'rgba(77,178,239,0)'); g.addColorStop(1, 'rgba(120,200,255,' + .1 * wake + ')'); ctx.fillStyle = g; ctx.fillRect(tt[0] - tg.w * z / 2, tt[1], tg.w * z, bb[1] - tt[1]); ctx.globalCompositeOperation = 'source-over'; F.glow(tt[0], tt[1], 120, .3 * wake * a); }
    var fade = 1 - F.u(t, 6.85, 7.05);
    F.trail(tr, a * fade, 4); F.dot(q[0], q[1], a * fade, 1);
    if (t >= 6.85 && loop >= 0 && chatState.loop !== loop) {
      chatState.loop = loop;
      if (chatState.start < 0) chatState.start = T; else F.chat.pulse();
      F.glow(c[0], c[1], 140, .6);
    }
  }
  function render(t, loop, T) {
    var x = function (a, b, c, d) { return Math.min(F.u(t, a, b), 1 - F.u(t, c, d)); };
    if (loop > 0 && t < .4) sceneSky(7.19, 1 - F.u(t, 0, .4), -1, T);
    sceneFoundation(t, (loop === 0 ? F.u(t, 0, .5) : F.u(t, 0, .4)) * (1 - F.u(t, 1.1, 1.3)));
    if (t > 1.1) sceneGPU(t, x(1.1, 1.3, 2.95, 3.15));
    if (t > 2.95) sceneFiber(t, x(2.95, 3.15, 4.6, 4.8));
    if (t > 4.6) sceneSky(t, F.u(t, 4.6, 4.8), loop, T);
    if (chatState.start >= 0) F.chat.show(Math.floor((T - chatState.start) / (3.4 / F.chat.count())) + 1);
  }
  F.onRestart = function () { chatState = { start: -1 }; F.chat.reset(); };
  F.onResize = sky;
  F.load({ foundation: 'img/foundation.webp', gpu: 'img/gpu.webp', fiber: 'img/fiber.webp' }).then(function (im) {
    IMG = im; F.size(); sky();
    F.run(L, render, function () { sceneGPU(2.2, 1); });
  });
})();
