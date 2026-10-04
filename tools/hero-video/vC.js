/* Film C, token stream. A slow push into one GPU. The question arrives, the GPU lights, and the answer streams out
   of it as a line of blue points, one per token. Each point that lands becomes the next word in the chat. */
(function () {
  var F = FILM, ctx = F.ctx, L = 12.5, IMG, N, EMIT0 = 1.1, EMIT1 = 7.2, FLY = .8, PORT = [1334, 1490], st = {};
  F.chat.build(ANSWER); N = F.chat.count();
  function route(p, c) { return [p, [p[0] + (c[0] - p[0]) * .25, p[1] + F.H * .02], [c[0] - (c[0] - p[0]) * .3, c[1] + F.H * .16], c]; }
  function render(t, loop, T) {
    var m = F.frame(IMG.gpu, PORT[0], PORT[1], F.phone ? .5 : .6, F.phone ? F.band : .4, F.lerp(1.28, 1.44, F.u(t, 0, L)) * (F.phone ? 1.25 : 1), F.phone ? 'free' : '');
    F.draw(IMG.gpu, m, loop === 0 ? F.u(t, 0, .6) : 1);
    var p = m.p(PORT[0], PORT[1]), c = F.chat.target(), R = route(p, c);
    if (st.loop !== loop) { st.loop = loop; F.chat.reset(); F.chat.hide(false); }
    var ig = F.out(F.u(t, .5, 1.1)) * (1 - F.u(t, 11.4, 12.3)), busy = t > EMIT0 && t < EMIT1 + .2;
    F.glow(p[0], p[1], 280 * m.s, (.2 + (busy ? .06 * Math.sin(t * 22) : 0)) * ig);
    F.dot(p[0], p[1], ig * (busy ? 1 : .8 + .12 * Math.sin(t * 2.4)), 1.1);
    // the faint fiber the tokens ride on
    var pa = F.u(t, .9, 1.6) * (1 - F.u(t, 10.8, 11.8));
    if (pa > 0) {
      ctx.beginPath(); for (var i = 0; i <= 48; i++) { var q = F.bez(R[0], R[1], R[2], R[3], i / 48); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(77,178,239,' + .1 * pa + ')'; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = 'rgba(150,215,255,' + .28 * pa + ')'; ctx.lineWidth = 1; ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    }
    var landed = 0, gap = (EMIT1 - EMIT0) / N;
    for (var k = 0; k < N; k++) {
      var e = EMIT0 + k * gap, u = (t - e) / FLY;
      if (u >= 1) { landed++; continue; }
      if (u <= 0) break;
      var w = F.io(u), q = F.bez(R[0], R[1], R[2], R[3], w), q2 = F.bez(R[0], R[1], R[2], R[3], Math.max(0, w - .05));
      F.trail([q2, q], 1, 2.4); F.dot(q[0], q[1], .9, .55);
    }
    var lastLand = EMIT0 + (landed - 1) * gap + FLY;
    if (landed > 0 && t - lastLand < .25) F.glow(c[0], c[1], 60, .5 * (1 - (t - lastLand) / .25));
    F.chat.show(landed);
    if (t > 11.2 && !st.faded) { st.faded = true; F.chat.hide(true); }
    if (t < 11.2) st.faded = false;
  }
  F.onRestart = function () { st = {}; F.chat.reset(); F.chat.hide(false); };
  F.load({ gpu: 'img/gpu.webp' }).then(function (im) {
    IMG = im; F.size();
    F.run(L, render, function () { var m = F.frame(IMG.gpu, PORT[0], PORT[1], F.phone ? .5 : .6, F.phone ? F.band : .4, 1.3); F.draw(IMG.gpu, m, 1); var p = m.p(PORT[0], PORT[1]); F.glow(p[0], p[1], 280 * m.s, .2); F.dot(p[0], p[1], 1, 1.1); });
  });
})();
