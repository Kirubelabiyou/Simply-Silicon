/* Simply Silicon: world network map (Platform page).
   Tap a city for its status. Tap Calgary to fly into the Foundation 3D scene. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage = document.getElementById('stage');
  var canvas = document.getElementById('dots');
  var ctx = canvas.getContext('2d');
  var svg = document.getElementById('world');
  var pop = document.getElementById('pop');
  var net3d = document.getElementById('net3d');

  var SITES = [
    { id: 'calgary', city: 'Calgary', country: 'Canada', region: 'North America', status: 'online' },
    { id: 'montreal', city: 'Montreal', country: 'Canada', region: 'North America', status: 'dev' },
    { id: 'bogota', city: 'Bogotá', country: 'Colombia', region: 'South America', status: 'dev' },
    { id: 'amsterdam', city: 'Amsterdam', country: 'Netherlands', region: 'Western Europe', status: 'dev' },
    { id: 'paris', city: 'Paris', country: 'France', region: 'Western Europe', status: 'dev' },
    { id: 'london', city: 'London', country: 'United Kingdom', region: 'Western Europe', status: 'soon' },
    { id: 'addis', city: 'Addis Ababa', country: 'Ethiopia', region: 'Africa', status: 'soon' },
    { id: 'mumbai', city: 'Mumbai', country: 'India', region: 'Asia', status: 'soon' },
    { id: 'sydney', city: 'Sydney', country: 'Australia', region: 'Oceania', status: 'soon' },
    { id: 'buenosaires', city: 'Buenos Aires', country: 'Argentina', region: 'South America', status: 'soon' }
  ];
  var STATUS = {
    online: { label: 'Online', chip: 'chip--live', dot: 'dot--live' },
    dev: { label: 'In development', chip: 'chip--dev', dot: 'dot--dev', text: 'In the next wave of sites joining the network.' },
    soon: { label: 'Coming soon', chip: 'chip--soon', dot: 'dot--soon', text: 'Planned for a future wave as the network grows.' }
  };
  SITES.forEach(function (s) { s.x = window.SS_CITY_XY[s.id][0]; s.y = window.SS_CITY_XY[s.id][1]; });
  var DOTS = window.SS_MAP.dots.split(' ').map(function (p) { var a = p.split(','); return [+a[0], +a[1]]; });

  var W = 1, H = 1, dpr = 1, vb = { x: 0, y: 0, w: 1000 };
  function upp() { return vb.w / W; }
  function toPx(x, y) { var k = W / vb.w; return [(x - vb.x) * k, (y - vb.y) * k]; }
  function phone() { return W < 700; }
  function fit() {
    var a = H / W;
    if (phone()) { var w = 800; return { x: 560 - w / 2, y: 250 - w * a / 2, w: w }; }
    var w2 = Math.max(1000, 460 / a) * 1.04;
    return { x: 500 - w2 / 2, y: 252 - w2 * a / 2, w: w2 };
  }
  function resize() {
    var r = stage.getBoundingClientRect();
    var cx = vb.x + vb.w / 2, cy = vb.y + vb.w * (H / W) / 2, first = W === 1;
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    if (first) vb = fit(); else { vb.x = cx - vb.w / 2; vb.y = cy - vb.w * H / W / 2; }
    draw();
  }

  var sel = null;
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var k = W / vb.w, r = Math.max(.9, Math.min(4.5, 2.0 * k));
    ctx.fillStyle = '#c3d3e2';
    ctx.beginPath();
    var x0 = vb.x - 6, x1 = vb.x + vb.w + 6, y0 = vb.y - 6, y1 = vb.y + H * upp() + 6;
    for (var i = 0; i < DOTS.length; i++) {
      var d = DOTS[i]; if (d[0] < x0 || d[0] > x1 || d[1] < y0 || d[1] > y1) continue;
      var px = (d[0] - vb.x) * k, py = (d[1] - vb.y) * k;
      ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, 6.2832);
    }
    ctx.fill();

    var hp = toPx(SITES[0].x, SITES[0].y), out = '';
    SITES.slice(1).forEach(function (s) {
      var p = toPx(s.x, s.y), len = Math.hypot(p[0] - hp[0], p[1] - hp[1]);
      out += '<path class="arc arc--' + s.status + '" d="M' + hp[0].toFixed(1) + ' ' + hp[1].toFixed(1) + ' Q' + ((hp[0] + p[0]) / 2).toFixed(1) + ' ' + ((hp[1] + p[1]) / 2 - Math.min(160, len * .22)).toFixed(1) + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + '"/>';
    });
    var groups = [];
    SITES.forEach(function (s) {
      var p = toPx(s.x, s.y), g = null;
      groups.forEach(function (gr) { if (!g && Math.hypot(gr.x - p[0], gr.y - p[1]) < 34) g = gr; });
      if (g) { g.m.push(s); g.x = (g.x * (g.m.length - 1) + p[0]) / g.m.length; g.y = (g.y * (g.m.length - 1) + p[1]) / g.m.length; }
      else groups.push({ x: p[0], y: p[1], m: [s] });
    });
    var boxes = groups.map(function (g) { return { x: g.x - 10, y: g.y - 10, w: 20, h: 20 }; });
    function place(x, y, w) {
      var o = [[x + 14, y - 9], [x - 14 - w, y - 9], [x - w / 2, y + 13], [x - w / 2, y - 30]];
      for (var i = 0; i < o.length; i++) {
        var b = { x: o[i][0], y: o[i][1], w: w, h: 18 };
        if (b.x < 4 || b.x + w > W - 4) continue;
        if (!boxes.some(function (q) { return b.x < q.x + q.w + 4 && b.x + b.w + 4 > q.x && b.y < q.y + q.h && b.y + b.h > q.y; })) { boxes.push(b); return b; }
      }
      return null;
    }
    var nodes = '';
    groups.forEach(function (g, gi) {
      if (g.x < -40 || g.x > W + 40 || g.y < -40 || g.y > H + 40) return;
      if (g.m.length > 1) {
        var name = g.m[0].region, b = place(g.x + 4, g.y, name.length * 7.4 + 6);
        nodes += '<g class="node node--cluster" tabindex="0" role="button" data-g="' + gi + '" aria-label="' + name + ', ' + g.m.length + ' sites"><circle class="hit" cx="' + g.x + '" cy="' + g.y + '" r="24"/><circle class="core" cx="' + g.x + '" cy="' + g.y + '" r="14"/><text class="cn" x="' + g.x + '" y="' + (g.y + 4) + '" text-anchor="middle">' + g.m.length + '</text>' + (b ? '<text class="nl" x="' + b.x + '" y="' + (b.y + 14) + '">' + name + '</text>' : '') + '</g>';
      } else {
        var s = g.m[0], lb = place(g.x, g.y, s.city.length * 7.6 + 4), rr = s.status === 'online' ? 8.5 : 7;
        nodes += '<g class="node node--' + s.status + (sel === s ? ' sel' : '') + '" tabindex="0" role="button" data-s="' + s.id + '" aria-label="' + s.city + ', ' + STATUS[s.status].label + '"><circle class="hit" cx="' + g.x + '" cy="' + g.y + '" r="22"/>' +
          (s.status === 'online' ? '<circle class="halo" cx="' + g.x + '" cy="' + g.y + '" r="18"/>' : '') +
          (s.status !== 'soon' ? '<circle class="pulse" cx="' + g.x + '" cy="' + g.y + '" r="' + rr + '"/>' : '') +
          '<circle class="core" cx="' + g.x + '" cy="' + g.y + '" r="' + rr + '"/>' + (lb ? '<text class="nl" x="' + lb.x + '" y="' + (lb.y + 14) + '">' + s.city + '</text>' : '') + '</g>';
      }
    });
    svg.innerHTML = out + nodes;
    svg._groups = groups;
    if (sel && !pop.hidden) placePop();
  }

  function activate(n) {
    if (n.hasAttribute('data-g')) {
      var g = svg._groups[+n.getAttribute('data-g')];
      var xs = g.m.map(function (s) { return s.x; }), ys = g.m.map(function (s) { return s.y; });
      var cx = (Math.min.apply(0, xs) + Math.max.apply(0, xs)) / 2, cy = (Math.min.apply(0, ys) + Math.max.apply(0, ys)) / 2;
      var spread = Math.max(Math.max.apply(0, xs) - Math.min.apply(0, xs), Math.max.apply(0, ys) - Math.min.apply(0, ys), 4);
      closePop(); flyTo(around(cx, cy, Math.max(55, spread * (phone() ? 5 : 8))), 900);
      return;
    }
    var s = SITES.filter(function (x) { return x.id === n.getAttribute('data-s'); })[0];
    if (s.status === 'online') { openCalgary(s); return; }
    sel = s;
    pop.innerHTML = '<button class="pop-x" type="button" aria-label="Close">×</button><div class="country">' + s.country + '</div><h3>' + s.city + '</h3><span class="chip ' + STATUS[s.status].chip + '"><i class="dot ' + STATUS[s.status].dot + '"></i>' + STATUS[s.status].label + '</span><p>' + STATUS[s.status].text + '</p>';
    pop.hidden = false;
    pop.querySelector('.pop-x').addEventListener('click', closePop);
    draw();
  }
  function placePop() {
    var p = toPx(sel.x, sel.y), pw = pop.offsetWidth, ph = pop.offsetHeight;
    var x = p[0] + 24, y = p[1] - ph / 2;
    if (x + pw > W - 14) x = p[0] - 24 - pw;
    if (phone()) { x = (W - pw) / 2; y = H - ph - 70; }
    x = Math.max(14, Math.min(W - pw - 14, x)); y = Math.max(14, Math.min(H - ph - 14, y));
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function closePop() { pop.hidden = true; sel = null; draw(); }
  function around(x, y, w) { var a = H / W; return { x: x - w / 2, y: y - w * a / 2, w: w }; }

  svg.addEventListener('click', function (e) { if (moved) return; var n = e.target.closest('.node'); if (n) activate(n); });
  svg.addEventListener('keydown', function (e) { if (e.key !== 'Enter' && e.key !== ' ') return; var n = e.target.closest('.node'); if (n) { e.preventDefault(); activate(n); } });

  /* ---------- Calgary: straight into the 3D scene ---------- */
  var scene = null;
  function openCalgary(s) {
    closePop();
    flyTo(around(s.x, s.y, 14), reduce ? 1 : 900, function () {
      net3d.hidden = false;
      import('./scene.js').then(function (m) {
        if (!scene) scene = m.mountScene(document.getElementById('calScene'), { link: 'foundation.html' });
        else scene.setView('net');
      }).catch(function (err) { console.error(err); document.getElementById('calScene').innerHTML = '<div class="scene-loading">The 3D view could not load. Open the Foundation page instead.</div>'; });
    });
  }
  document.getElementById('back3d').addEventListener('click', function () { net3d.hidden = true; flyTo(fit(), 1000); });

  /* ---------- motion, zoom and pan ---------- */
  var anim = null;
  function flyTo(t, ms, done) {
    if (anim) cancelAnimationFrame(anim);
    var f = { x: vb.x, y: vb.y, w: vb.w }, t0 = performance.now(), a = H / W;
    if (reduce) ms = 1;
    function step(now) {
      var u = Math.min(1, (now - t0) / ms), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      vb.w = Math.exp(Math.log(f.w) + (Math.log(t.w) - Math.log(f.w)) * e);
      var cx = f.x + f.w / 2 + (t.x + t.w / 2 - f.x - f.w / 2) * e, cy = f.y + f.w * a / 2 + (t.y + t.w * a / 2 - f.y - f.w * a / 2) * e;
      vb.x = cx - vb.w / 2; vb.y = cy - vb.w * a / 2;
      draw();
      if (u < 1) anim = requestAnimationFrame(step); else { anim = null; if (done) done(); }
    }
    anim = requestAnimationFrame(step);
  }
  document.getElementById('zoom').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var nw = Math.max(40, Math.min(1500, vb.w / +b.getAttribute('data-z')));
    var cx = vb.x + vb.w / 2, cy = vb.y + vb.w * H / W / 2;
    flyTo(around(cx, cy, nw), 350);
  });
  stage.addEventListener('wheel', function (e) {
    if (!(e.ctrlKey || e.metaKey) || !net3d.hidden) return;
    e.preventDefault();
    var r = stage.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    var nw = Math.max(40, Math.min(1500, vb.w * Math.exp(e.deltaY * .0025))), ux = vb.x + px * upp(), uy = vb.y + py * upp(), k = nw / vb.w;
    vb.x = ux - (ux - vb.x) * k; vb.y = uy - (uy - vb.y) * k; vb.w = nw; draw();
  }, { passive: false });
  var drag = null, moved = false;
  stage.addEventListener('pointerdown', function (e) {
    if (!net3d.hidden || e.target.closest('.pop, .zoom, .net-legend')) return;
    drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, id: e.pointerId }; moved = false;
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 6) return;
    if (!moved && e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
    moved = true; stage.classList.add('dragging');
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    vb.x = drag.vx - dx * upp(); vb.y = drag.vy - dy * upp(); draw();
  });
  window.addEventListener('pointerup', function () { if (drag) stage.classList.remove('dragging'); drag = null; setTimeout(function () { moved = false; }, 0); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!net3d.hidden) { net3d.hidden = true; flyTo(fit(), 900); } else if (!pop.hidden) closePop(); } });

  resize();
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
})();
