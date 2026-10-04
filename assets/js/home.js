/* Simply Silicon: home page. Draws the five architecture figures, mounts the hero city, runs the investor strip. */
(function () {
  'use strict';
  function box(x, y, w, h, cls, t, s) {
    return '<rect class="f-box ' + (cls || '') + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6"/>' +
      (t ? '<text class="f-t" x="' + (x + w / 2) + '" y="' + (y + h / 2 + (s ? -3 : 5)) + '" text-anchor="middle">' + t + '</text>' : '') +
      (s ? '<text class="f-s" x="' + (x + w / 2) + '" y="' + (y + h / 2 + 14) + '" text-anchor="middle">' + s + '</text>' : '');
  }
  function rack(x, y, w, h, led) {
    var s = '<rect class="f-box f-box--solid" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6"/>';
    var n = Math.floor((h - 20) / 19);
    for (var i = 0; i < n; i++) s += '<rect class="f-slot" x="' + (x + 14) + '" y="' + (y + 12 + i * 19) + '" width="' + (w - 40) + '" height="10" rx="2"/><circle class="' + (led ? 'f-led' : 'f-led f-led--dim') + '" cx="' + (x + w - 16) + '" cy="' + (y + 17 + i * 19) + '" r="2.4"/>';
    return s;
  }
  var DEFS = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#4db2ef"/></marker>' +
    '<marker id="ahw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#d9a273"/></marker></defs>';

  var FIG = {
    power: function () {
      return '<svg viewBox="0 0 480 270" role="img" aria-label="Two grid feeds and on-site power supply one utility site, which powers the GPUs">' + DEFS +
        box(10, 20, 148, 54, '', 'Grid feed A', 'Utility') +
        box(10, 108, 148, 54, '', 'Grid feed B', 'Utility') +
        box(10, 196, 148, 54, 'f-box--ghost', 'On-site power', 'Backup generation') +
        '<path class="f-flow" d="M158 47 C196 47 196 115 230 120" marker-end="url(#ah)"/>' +
        '<path class="f-flow" d="M158 135 H230" marker-end="url(#ah)"/>' +
        '<path class="f-flow" d="M158 223 C196 223 196 155 230 150" marker-end="url(#ah)" stroke-dasharray="3 5"/>' +
        box(234, 92, 124, 86, 'f-box--on', 'Utility site', 'Already in the city') +
        '<path class="f-flow" d="M358 135 H392" marker-end="url(#ah)"/>' +
        box(396, 108, 74, 54, 'f-box--solid', 'GPUs') +
        '<text class="f-s f-acc" x="296" y="204" text-anchor="middle">n+1 redundant</text>' +
        '</svg>';
    },
    compute: function () {
      var s = '<svg viewBox="0 0 480 290" role="img" aria-label="Shared cloud splits a machine between users through a virtual layer. Bare metal gives one model the whole machine.">';
      s += '<text class="f-h" x="110" y="22" text-anchor="middle">Shared cloud</text><text class="f-h f-acc" x="370" y="22" text-anchor="middle">Bare metal</text>';
      s += '<line class="f-line" x1="240" y1="10" x2="240" y2="280"/>';
      [['A', 22], ['B', 84], ['C', 146]].forEach(function (t) { s += box(t[1], 44, 52, 40, '', 'User ' + t[0]).replace('f-t"', 'f-t f-t--sm"'); });
      s += box(22, 96, 176, 36, 'f-box--heat', 'Virtual layer');
      s += rack(22, 146, 176, 128, false);
      s += box(282, 44, 176, 88, 'f-box--on', 'Your AI model', 'Direct access');
      s += rack(282, 146, 176, 128, true);
      return s + '</svg>';
    },
    fiber: function () {
      var s = '<svg viewBox="0 0 480 300" role="img" aria-label="Private fiber runs along the streets from the site to six connected buildings. The public internet is not connected.">';
      var X = [40, 150, 260, 370], Y = [50, 150, 250];
      X.forEach(function (x) { s += '<line class="f-line" x1="' + x + '" y1="18" x2="' + x + '" y2="282" stroke-width="8" stroke-linecap="round" style="stroke:rgba(255,255,255,.05)"/>'; });
      Y.forEach(function (y) { s += '<line class="f-line" x1="18" y1="' + y + '" x2="402" y2="' + y + '" stroke-width="8" stroke-linecap="round" style="stroke:rgba(255,255,255,.05)"/>'; });
      ['M260 150 H150 V50 H96', 'M260 150 V50 H316', 'M260 150 H370 V206', 'M260 150 V250 H206', 'M260 150 H150 V250 H96', 'M260 150 H370 V94'].forEach(function (d) { s += '<path class="f-flow" d="' + d + '"/>'; });
      [[96, 50], [316, 50], [370, 206], [206, 250], [96, 250], [370, 94]].forEach(function (p) {
        s += '<rect class="f-box f-box--solid" x="' + (p[0] - 15) + '" y="' + (p[1] - 15) + '" width="30" height="30" rx="5"/><circle class="f-dot" cx="' + p[0] + '" cy="' + p[1] + '" r="3.5"/>';
      });
      s += '<rect class="f-box f-box--on" x="232" y="122" width="56" height="56" rx="7"/><text class="f-t" x="260" y="155" text-anchor="middle">Site</text>';
      s += '<g transform="translate(440 150)"><circle r="32" class="f-box f-box--ghost"/><text class="f-s" y="-3" text-anchor="middle">Public</text><text class="f-s" y="11" text-anchor="middle">internet</text></g>';
      s += '<path class="f-warn" d="M378 150 H402" stroke-dasharray="2 4"/><path class="f-warn" d="M385 143 L395 157 M395 143 L385 157"/>';
      return s + '</svg>';
    },
    security: function () {
      var s = '<svg viewBox="0 0 480 270" role="img" aria-label="The private network and the public internet are separated by an air gap with no cable between them.">';
      s += '<rect class="f-box f-box--ghost" x="10" y="26" width="172" height="218" rx="8"/><text class="f-h" x="96" y="56" text-anchor="middle">Public internet</text>';
      s += '<g transform="translate(96 146)" class="f-line"><circle r="42"/><ellipse rx="18" ry="42"/><path d="M-42 0 H42 M-37 -20 H37 M-37 20 H37"/></g>';
      s += '<rect class="f-box f-box--on" x="298" y="26" width="172" height="218" rx="8"/><text class="f-h f-acc" x="384" y="56" text-anchor="middle">Private network</text>';
      for (var i = 0; i < 4; i++) s += '<rect class="f-box f-box--solid" x="322" y="' + (80 + i * 36) + '" width="124" height="25" rx="4"/><rect class="f-slot" x="334" y="' + (89 + i * 36) + '" width="60" height="7" rx="2"/><circle class="f-led" cx="432" cy="' + (92.5 + i * 36) + '" r="3"/>';
      s += '<path class="f-line" d="M182 135 H214"/><path class="f-flow" d="M266 135 H298"/>';
      s += '<g transform="translate(240 135)"><circle r="21" class="f-box"/><path class="f-warn" d="M-7 -7 L7 7 M7 -7 L-7 7"/></g>';
      s += '<text class="f-s f-red" x="240" y="182" text-anchor="middle" style="font-weight:600">Air gap</text><text class="f-s" x="240" y="198" text-anchor="middle">No cable, no path in</text>';
      return s + '</svg>';
    },
    engineering: function () {
      var s = '<svg viewBox="0 0 480 300" role="img" aria-label="Power goes into the GPU racks. The heat they make is captured and sent into a heating loop that warms nearby buildings.">' + DEFS;
      s += box(10, 40, 112, 60, '', 'Power in', 'Electricity');
      s += '<path class="f-flow" d="M122 70 H170" marker-end="url(#ah)"/>';
      s += rack(176, 20, 128, 100, true);
      s += '<text class="f-t" x="240" y="142" text-anchor="middle">GPU racks</text><text class="f-s" x="240" y="158" text-anchor="middle">Useful AI work</text>';
      s += '<path class="f-heat" d="M304 70 H352" marker-end="url(#ahw)"/>';
      s += box(358, 40, 112, 60, 'f-box--heat', 'Heat', 'Captured');
      s += '<path class="f-heat" d="M414 100 V202 H332" marker-end="url(#ahw)"/>';
      s += '<rect class="f-box f-box--heat" x="150" y="180" width="178" height="46" rx="23"/><text class="f-t" x="239" y="201" text-anchor="middle">Heating loop</text><text class="f-s" x="239" y="216" text-anchor="middle">Warms nearby buildings</text>';
      s += '<path class="f-heat" d="M150 203 H76 V246" stroke-dasharray="3 5"/>';
      [[30, 252], [70, 240], [110, 252]].forEach(function (b) { s += '<rect class="f-box f-box--solid" x="' + (b[0] + 10) + '" y="' + b[1] + '" width="30" height="' + (292 - b[1]) + '" rx="3"/>'; });
      return s + '</svg>';
    }
  };
  document.querySelectorAll('[data-fig]').forEach(function (f) {
    var k = f.getAttribute('data-fig'); if (!FIG[k]) return;
    f.insertAdjacentHTML('afterbegin', FIG[k]());
  });
})();

/* Investor logos: show a logo only once its file exists in assets/img/backers (svg, then png); otherwise keep the name */
(function () {
  document.querySelectorAll('li[data-logo]').forEach(function (li) {
    var file = li.getAttribute('data-logo'), name = li.textContent, hidden = li.parentNode.hasAttribute('aria-hidden');
    var tryLoad = function (exts) {
      if (!exts.length) return;
      var img = new Image();
      img.onload = function () { img.alt = hidden ? '' : name; var host = li.querySelector('a') || li; host.insertBefore(img, host.firstChild); li.classList.add('has-logo'); };
      img.onerror = function () { tryLoad(exts.slice(1)); };
      img.src = 'assets/img/backers/' + exts[0];
    };
    tryLoad([file]);
  });
})();

/* Investor strip: flows on its own, can be dragged or flicked by hand (mouse, finger or trackpad), then eases back to its normal flow */
(function () {
  var mq = document.querySelector('.backers .marquee');
  if (!mq || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  mq.classList.add('is-js');
  mq.querySelectorAll('a, img').forEach(function (n) { n.setAttribute('draggable', 'false'); });
  var x = 0, vel = 0, half = 1, speed = 30, hover = false, drag = null, suppress = false, visible = true, last = performance.now();
  function measure() { half = mq.scrollWidth / 2 || 1; speed = half / 60; }
  function wrap() { x = x % half; if (x > 0) x -= half; }
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!drag) {
      var target = hover ? 0 : -speed;
      // after a flick the strip coasts with light friction (like a scroll), then settles back into its normal flow
      vel += (target - vel) * Math.min(1, dt * (Math.abs(vel - target) > speed * 2 ? 1.05 : 3));
      x += vel * dt;
    }
    wrap();
    mq.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    if (visible) requestAnimationFrame(frame); else raf = 0;
  }
  var raf = 0;
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  measure(); vel = -speed; start();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }).observe(mq);

  mq.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
  mq.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });
  mq.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, lt: performance.now(), moved: false, v: 0, type: e.pointerType, pts: [] };
  });
  mq.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      if (drag.type === 'touch' && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }   // vertical swipe: let the page scroll
      drag.moved = true; mq.classList.add('is-dragging');
      try { mq.setPointerCapture(e.pointerId); } catch (_) {}
    }
    var now = performance.now(), step = e.clientX - drag.lx;
    x += step;
    drag.v = drag.v * .6 + (step / Math.max(1, now - drag.lt) * 1000) * .4;
    drag.lx = e.clientX; drag.lt = now;
    drag.pts.push([now, e.clientX]); while (drag.pts.length > 2 && now - drag.pts[0][0] > 100) drag.pts.shift();
  });
  function end(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.moved) { suppress = true; setTimeout(function () { suppress = false; }, 0); var p0 = drag.pts[0], p1 = drag.pts[drag.pts.length - 1], fv = p0 && p1[0] > p0[0] ? (p1[1] - p0[1]) / (p1[0] - p0[0]) * 1000 : drag.v; vel = Math.max(-9000, Math.min(9000, fv * 1.5)); if (performance.now() - drag.lt > 150) vel = 0; }
    mq.classList.remove('is-dragging');
    drag = null;
  }
  mq.addEventListener('pointerup', end);
  mq.addEventListener('pointercancel', end);
  mq.addEventListener('lostpointercapture', end);
  // a drag should never open a logo's link
  mq.addEventListener('click', function (e) { if (suppress) { e.preventDefault(); e.stopPropagation(); } }, true);
  mq.addEventListener('dragstart', function (e) { e.preventDefault(); });
  // sideways trackpad swipes move the strip too
  mq.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); x -= e.deltaX; vel = 0;
  }, { passive: false });
})();

/* How it works: the step in view lights up its part of the pinned diagram */
(function () {
  var steps = [].slice.call(document.querySelectorAll('.pin-step')), parts = document.querySelectorAll('.pin-fig .g-part');
  if (!steps.length) return;
  function set(k) {
    steps.forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-step') === String(k)); });
    parts.forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-k') === String(k)); });
  }
  set(0);
  if (!('IntersectionObserver' in window)) { steps.forEach(function (s) { s.classList.add('on'); }); parts.forEach(function (p) { p.classList.add('on'); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) set(e.target.getAttribute('data-step')); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(function (s) { io.observe(s); });
})();

/* Metro platform: Calgary online, North America and Europe as pipeline regions (as stated on gosimply.ai) */
(function () {
  var box = document.getElementById('mapStrip'); if (!box || !window.SS_WORLD) return;
  var c = window.SS_CITY_XY.calgary;
  var svg = '<svg viewBox="110 52 540 200" role="img" aria-label="Map: Calgary online; North America and Europe pipeline regions">' +
    '<path class="ms-land" d="' + window.SS_WORLD.land + '"/>' +
    '<ellipse class="ms-region" cx="262" cy="168" rx="100" ry="58"/><ellipse class="ms-region" cx="518" cy="140" rx="44" ry="30"/>' +
    '<text class="ms-region-l" x="262" y="236" text-anchor="middle">North America</text><text class="ms-region-l" x="518" y="182" text-anchor="middle">Europe</text>' +
    '<circle class="ms-halo" cx="' + c[0] + '" cy="' + c[1] + '" r="8"/><circle class="ms-site" cx="' + c[0] + '" cy="' + c[1] + '" r="3"/>' +
    '<text class="ms-l" x="' + (c[0] + 7) + '" y="' + (c[1] - 5) + '">Calgary</text></svg>';
  box.insertAdjacentHTML('afterbegin', svg);
})();

/* Explore Foundation: a quiet live 3D loop, loaded only when it comes near the screen */
(function () {
  var host = document.getElementById('loopScene'); if (!host) return;
  var started = false;
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.body.appendChild(s); }); }
  function start() {
    if (started) return; started = true;
    ['assets/js/calgary-data.js', 'assets/js/calgary-buildings.js', 'assets/js/calgary-streets.js', 'assets/js/calgary-parks.js'].reduce(function (p, src) { return p.then(function () { return load(src); }); }, Promise.resolve())
      .then(function () { return import('./scene.js'); })
      .then(function (m) { m.mountScene(host, { cinematic: true, view: 'site', phone: window.innerWidth < 900 }); })
      .catch(function (e) { console.error(e); });
  }
  if (!('IntersectionObserver' in window)) { start(); return; }
  var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '600px 0px' });
  io.observe(host);
})();
