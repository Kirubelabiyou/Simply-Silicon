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

  var W = 1, H = 1, dpr = 1, vb = { x: 0, y: 0, w: 1000 };
  function upp() { return vb.w / W; }
  function toPx(x, y) { var k = W / vb.w; return [(x - vb.x) * k, (y - vb.y) * k]; }
  function phone() { return W < 700; }
  function fit() {
    var a = H / W;
    if (phone()) { var w = 820; return { x: 525 - w / 2, y: 262 - w * a / 2, w: w }; }
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
  // map colours come from CSS, so the dark Platform theme can restyle the map
  var cs = getComputedStyle(stage), cv = function (n, d) { var v = cs.getPropertyValue(n).trim(); return v || d; };
  var MAP = { land: cv('--map-land', '#fbfdff'), border: cv('--map-border', '#d3e0ec'), coast: cv('--map-coast', '#c3d4e4'), grat: cv('--map-grat', 'rgba(27,111,184,.10)'), shadow: cv('--map-shadow', 'rgba(13,33,54,.18)'), dark: document.body.classList.contains('theme-dark') };
  var WORLD = window.SS_WORLD, LAND = new Path2D(WORLD.land), BORD = new Path2D(WORLD.borders), GRAT = new Path2D(WORLD.grat), SPH = new Path2D(WORLD.sphere);
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var k = W / vb.w;
    ctx.setTransform(k * dpr, 0, 0, k * dpr, -vb.x * k * dpr, -vb.y * k * dpr);
    ctx.lineWidth = .6 / k; ctx.strokeStyle = MAP.grat; ctx.stroke(GRAT);
    ctx.save(); ctx.shadowColor = MAP.shadow; ctx.shadowBlur = 14 * dpr; ctx.shadowOffsetY = 3 * dpr;
    ctx.fillStyle = MAP.land; ctx.fill(LAND); ctx.restore();
    ctx.lineWidth = .7 / k; ctx.strokeStyle = MAP.border; ctx.stroke(BORD);
    ctx.lineWidth = 1 / k; ctx.strokeStyle = MAP.coast; ctx.stroke(LAND);
    // on the dark map, each live or planned site throws light onto the land around it
    if (MAP.dark) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'lighter';
      SITES.forEach(function (st) {
        if (st.status === 'soon') return;
        var q = toPx(st.x, st.y), r = st.status === 'online' ? 70 : 42, c = st.status === 'online' ? '77,178,239' : '240,122,46';
        var g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); g.addColorStop(0, 'rgba(' + c + ',.55)'); g.addColorStop(.35, 'rgba(' + c + ',.18)'); g.addColorStop(1, 'rgba(' + c + ',0)');
        ctx.fillStyle = g; ctx.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
      });
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var hp = toPx(SITES[0].x, SITES[0].y), out = '';
    SITES.slice(1).forEach(function (s) {
      var p = toPx(s.x, s.y), len = Math.hypot(p[0] - hp[0], p[1] - hp[1]);
      out += '<path class="arc arc--' + s.status + '" d="M' + hp[0].toFixed(1) + ' ' + hp[1].toFixed(1) + ' Q' + ((hp[0] + p[0]) / 2).toFixed(1) + ' ' + ((hp[1] + p[1]) / 2 - Math.min(160, len * .22)).toFixed(1) + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + '"/>';
    });
    // every city is its own node; crowded ones (London, Amsterdam, Paris) get callout labels with leader lines
    var pts = SITES.map(function (s) { var p = toPx(s.x, s.y); return { s: s, x: p[0], y: p[1] }; });
    var CALL = { london: [-22, -42], amsterdam: [34, -34], paris: [34, 24] };
    var boxes = pts.map(function (q) { return { x: q.x - 9, y: q.y - 9, w: 18, h: 18 }; });
    function place(x, y, w) {
      var o = [[x + 13, y - 9], [x - 13 - w, y - 9], [x - w / 2, y + 12], [x - w / 2, y - 29]];
      for (var i = 0; i < o.length; i++) {
        var bx = { x: o[i][0], y: o[i][1], w: w, h: 18 };
        if (bx.x < 4 || bx.x + w > W - 4) continue;
        if (!boxes.some(function (q) { return bx.x < q.x + q.w + 3 && bx.x + bx.w + 3 > q.x && bx.y < q.y + q.h && bx.y + bx.h > q.y; })) { boxes.push(bx); return bx; }
      }
      return null;
    }
    var leaders = '', nodes = '';
    pts.forEach(function (q) {
      var crowded = pts.some(function (o) { return o !== q && Math.hypot(o.x - q.x, o.y - q.y) < 44; });
      q.call = crowded && CALL[q.s.id];
    });
    pts.forEach(function (q) {
      var s = q.s;
      if (q.x < -40 || q.x > W + 40 || q.y < -40 || q.y > H + 40) return;
      var rr = s.status === 'online' ? 8.5 : (q.call ? 5.5 : 7), w = s.city.length * 7.6 + 4, lb;
      if (q.call) {
        var ax = q.x + q.call[0], ay = q.y + q.call[1];
        lb = { x: q.call[0] < 0 ? ax - w : ax + 4, y: ay - 9, w: w, h: 18 };
        boxes.push(lb);
        leaders += '<path class="leader" d="M' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ' L' + ax.toFixed(1) + ' ' + ay.toFixed(1) + '"/><circle class="leader-end" cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) + '" r="2"/>';
      } else lb = place(q.x, q.y, w);
      nodes += '<g class="node node--' + s.status + (sel === s ? ' sel' : '') + '" tabindex="0" role="button" data-s="' + s.id + '" aria-label="' + s.city + ', ' + STATUS[s.status].label + '"><circle class="hit" cx="' + q.x + '" cy="' + q.y + '" r="' + (q.call ? 12 : 22) + '"/>' +
        (s.status === 'online' ? '<circle class="halo" cx="' + q.x + '" cy="' + q.y + '" r="18"/>' : '') +
        (s.status !== 'soon' ? '<circle class="pulse" cx="' + q.x + '" cy="' + q.y + '" r="' + rr + '"/>' : '') +
        '<circle class="core" cx="' + q.x + '" cy="' + q.y + '" r="' + rr + '"/>' +
        (lb ? (q.call ? '<rect class="hit" x="' + lb.x + '" y="' + lb.y + '" width="' + lb.w + '" height="18"/>' : '') + '<text class="nl" x="' + lb.x + '" y="' + (lb.y + 14) + '">' + s.city + '</text>' : '') + '</g>';
    });
    nodes = leaders + nodes;
    svg.innerHTML = out + nodes;
    if (sel && !pop.hidden) placePop();
  }

  function activate(n) {
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
      net3d.hidden = false; stage.classList.add('is-3d');
      import('./scene.js').then(function (m) {
        if (!scene) scene = m.mountScene(document.getElementById('calScene'), { phone: phone() });
        else scene.setView('net');
      }).catch(function (err) { console.error(err); document.getElementById('calScene').innerHTML = '<div class="scene-loading">The 3D view could not load. Open the Foundation page instead.</div>'; });
    });
  }
  document.getElementById('back3d').addEventListener('click', function () { net3d.hidden = true; stage.classList.remove('is-3d'); flyTo(fit(), 1000); });

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
    // trackpad pinch arrives as small ctrl+wheel steps, so it gets a stronger factor than a mouse wheel notch
    var f = Math.abs(e.deltaY) < 40 ? .02 : .006, nw = Math.max(40, Math.min(1500, vb.w * Math.exp(Math.max(-120, Math.min(120, e.deltaY)) * f))), ux = vb.x + px * upp(), uy = vb.y + py * upp(), k = nw / vb.w;
    vb.x = ux - (ux - vb.x) * k; vb.y = uy - (uy - vb.y) * k; vb.w = nw; draw();
  }, { passive: false });
  // double-click (or double-tap) zooms in on that spot
  stage.addEventListener('dblclick', function (e) {
    if (!net3d.hidden || e.target.closest('.pop, .zoom, .net-legend, .node')) return;
    var r = stage.getBoundingClientRect(), ux = vb.x + (e.clientX - r.left) * upp(), uy = vb.y + (e.clientY - r.top) * upp();
    flyTo(around(ux, uy, Math.max(40, vb.w / 2.5)), 400);
  });
  // two-finger pinch on phones and tablets
  var pinch = null;
  stage.addEventListener('touchstart', function (e) {
    if (!net3d.hidden || e.touches.length !== 2) return;
    var a = e.touches[0], c = e.touches[1], r = stage.getBoundingClientRect();
    pinch = { d: Math.hypot(a.clientX - c.clientX, a.clientY - c.clientY), w: vb.w, mx: (a.clientX + c.clientX) / 2 - r.left, my: (a.clientY + c.clientY) / 2 - r.top, vx: vb.x, vy: vb.y };
    drag = null;
  }, { passive: true });
  stage.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    var a = e.touches[0], c = e.touches[1], d = Math.hypot(a.clientX - c.clientX, a.clientY - c.clientY);
    var nw = Math.max(40, Math.min(1500, pinch.w * pinch.d / d)), ux = pinch.vx + pinch.mx * pinch.w / W, uy = pinch.vy + pinch.my * pinch.w / W;
    vb.w = nw; vb.x = ux - pinch.mx * nw / W; vb.y = uy - pinch.my * nw / W; draw();
  }, { passive: false });
  stage.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
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
  // warm up the 3D view in the background so tapping Calgary opens it fast
  (window.requestIdleCallback || function (f) { setTimeout(f, 1500); })(function () {
    import('./scene.js').then(function (m) {
      // on larger screens, build the Calgary scene in the background (it does not draw until it is shown)
      if (!scene && !phone() && (navigator.hardwareConcurrency || 4) >= 4) setTimeout(function () { if (!scene) scene = m.mountScene(document.getElementById('calScene'), { phone: false }); }, 1200);
    }).catch(function () {});
  }, { timeout: 4000 });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
})();
