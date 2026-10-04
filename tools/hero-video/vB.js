/* Film B, minimal black. One GPU system in a pool of light. Its status light turns blue, and a single thread of light
   runs out across the dark, along downtown Calgary's roofline to another building, and up into the chat. */
(function () {
  var F = FILM, ctx = F.ctx, L = 6.6, IMG, SK, SPOT, PATH, chatState = {};
  var LED = [994, 514];
  F.chat.build(ANSWER);

  function layout() {
    var p = F.phone, W = F.W, H = F.H;
    SK = SKY.render({ W: W, H: H, dpr: F.dpr, mode: 'line', base: p ? F.band + F.bandH * .45 : .88, hmax: p ? F.bandH * .5 : .3, span: p ? 2.2 : 1.05, left: p ? -.8 : .36, tx0: p ? .5 : .66, tx1: p ? .9 : .84 });
    // the system in its spotlight, rendered once
    var cx = W * (p ? .5 : .53), cy = H * (p ? F.band - F.bandH * .12 : .3), r = p ? Math.min(W * .3, H * F.bandH * .45) : Math.min(W * .16, H * .3);
    var c = document.createElement('canvas'); c.width = Math.round(W * F.dpr); c.height = Math.round(H * F.dpr);
    var g = c.getContext('2d'); g.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
    var s = (r * 2.4) / IMG.dgx.naturalWidth;
    g.drawImage(IMG.dgx, cx - LED[0] * s, cy - LED[1] * s, IMG.dgx.naturalWidth * s, IMG.dgx.naturalHeight * s);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = .45;
    g.drawImage(IMG.dgx, cx - LED[0] * s, cy - LED[1] * s, IMG.dgx.naturalWidth * s, IMG.dgx.naturalHeight * s);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // cover the original amber light so the blue one reads clean
    g.beginPath(); g.arc(cx, cy, 5 * s * 3, 0, 6.283); g.fillStyle = 'rgba(14,16,20,1)'; g.fill();
    g.globalCompositeOperation = 'destination-in';
    var m = g.createRadialGradient(cx, cy - r * .15, r * .1, cx, cy, r * 1.1); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(.45, 'rgba(0,0,0,.7)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, W, H);
    SPOT = { canvas: c, cx: cx, cy: cy, r: r };
    // one continuous thread: out of the light, down to the street, along it, up the tower, into the chat
    var tg = SK.target, ch = F.chat.target(), pts = [], seg = [];
    var ground = [Math.min(tg.x - (p ? 60 : 160), W * (p ? .25 : .5)), SK.base - 1];
    seg.push(function (u) { return F.bez([cx, cy], [cx + r * .3, cy + r * .9], [ground[0] - 120, ground[1]], ground, u); });
    seg.push(function (u) { return [F.lerp(ground[0], tg.x, u), ground[1]]; });
    seg.push(function (u) { return [tg.x, F.lerp(ground[1], tg.top + 1, u)]; });
    seg.push(function (u) { return F.bez([tg.x, tg.top + 1], [tg.x, tg.top - H * .14], [ch[0] - 20, ch[1] + H * .12], ch, u); });
    seg.forEach(function (f) { for (var i = (pts.length ? 1 : 0); i <= 60; i++) pts.push(f(i / 60)); });
    var cum = [0]; for (var i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    PATH = { pts: pts, cum: cum, L: cum[cum.length - 1] };
  }
  function at(d) { var P = PATH; for (var i = 1; i < P.pts.length; i++) if (P.cum[i] >= d) { var a = P.pts[i - 1], b = P.pts[i], u = (d - P.cum[i - 1]) / (P.cum[i] - P.cum[i - 1] || 1); return [F.lerp(a[0], b[0], u), F.lerp(a[1], b[1], u)]; } return P.pts[P.pts.length - 1]; }
  function thread(d, a) {
    var P = PATH; if (d <= 0 || a <= 0) return;
    ctx.beginPath(); ctx.moveTo(P.pts[0][0], P.pts[0][1]);
    for (var i = 1; i < P.pts.length && P.cum[i] < d; i++) ctx.lineTo(P.pts[i][0], P.pts[i][1]);
    var h = at(d); ctx.lineTo(h[0], h[1]);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(42,150,235,' + .18 * a + ')'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = 'rgba(150,215,255,' + .75 * a + ')'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    return h;
  }
  function render(t, loop, T) {
    var on = loop === 0 ? F.out(F.u(t, 0, 1)) : 1, drift = 1 + .025 * Math.sin(T * .35);
    ctx.globalAlpha = on * .95; var S = SPOT;
    ctx.drawImage(S.canvas, S.cx - S.cx * drift, S.cy - S.cy * drift, F.W * drift, F.H * drift); ctx.globalAlpha = 1;
    ctx.globalAlpha = on; ctx.drawImage(SK.canvas, 0, 0, F.W, F.H); ctx.globalAlpha = 1;
    var ig = F.out(F.u(t, .6, 1.2)) * (1 - .6 * F.u(t, 5.9, 6.5)), flash = Math.max(0, 1 - Math.abs(t - .9) / .2) * .4;
    F.glow(S.cx, S.cy, S.r * .9, .12 * ig);
    F.dot(S.cx, S.cy, Math.min(1, ig + flash), .8);
    var u = F.io(F.u(t, 1.25, 4.9)), fade = 1 - F.u(t, 5.3, 6.2);
    var h = thread(u * PATH.L, fade);
    if (u > 0 && u < 1 && h) F.dot(h[0], h[1], 1, .9);
    if (t >= 4.9 && chatState.loop !== loop) {
      chatState.loop = loop;
      if (chatState.start == null) chatState.start = T; else F.chat.pulse();
    }
    if (t > 4.9) { var c = PATH.pts[PATH.pts.length - 1]; F.glow(c[0], c[1], 90, .5 * (1 - F.u(t, 4.9, 5.6))); }
    if (chatState.start != null) F.chat.show(Math.floor((T - chatState.start) / (3.4 / F.chat.count())) + 1);
  }
  F.onRestart = function () { chatState = {}; F.chat.reset(); };
  F.onResize = layout;
  F.load({ dgx: 'img/dgx.webp' }).then(function (im) {
    IMG = im; F.size(); layout(); setTimeout(layout, 2200);
    F.run(L, render, function () { render(4.2, 1, 99); });
  });
})();
