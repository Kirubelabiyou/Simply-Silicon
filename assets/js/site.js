/* Simply Silicon: home page behaviour (racks, network map, phases, Foundation view) */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero racks ---------- */
  var racks = document.getElementById('racks');
  if (racks) {
    var layouts = [
      ['n', 'g', 'g', 'g', 'g', 'n', 'g', 'g', 'n'],
      ['n', 'g', 'g', 'g', 'g', 'g', 'g', 'n', 'g', 'g'],
      ['n', 'g', 'g', 'g', 'n', 'g', 'g', 'g', 'n']
    ];
    layouts.forEach(function (units, r) {
      var rack = document.createElement('div');
      rack.className = 'rack';
      rack.innerHTML = '<div class="rack-head"><span>R0' + (r + 1) + '</span><span>GPU</span></div>';
      units.forEach(function (u) {
        var el = document.createElement('div');
        el.className = 'unit' + (u === 'g' ? ' gpu' : '');
        var n = u === 'g' ? 3 : 2;
        for (var i = 0; i < n; i++) {
          var led = document.createElement('i');
          var roll = Math.random();
          led.className = 'led ' + (i === 0 ? 'ok' : roll > .25 ? 'on' : '');
          led.style.setProperty('--d', (1.2 + Math.random() * 2.6).toFixed(2) + 's');
          led.style.setProperty('--dl', (-Math.random() * 3).toFixed(2) + 's');
          el.appendChild(led);
        }
        rack.appendChild(el);
      });
      racks.appendChild(rack);
    });
  }

  /* ---------- Phase bars (drawn to scale out of 12 MW) ---------- */
  document.querySelectorAll('.phase .fill').forEach(function (f) {
    var mw = parseFloat(f.getAttribute('data-mw'));
    f.style.width = (mw / 12 * 100) + '%';
  });

  /* ---------- Network map ---------- */
  var SITES = [
    { id: 'calgary', city: 'Calgary', country: 'Canada · Alberta', status: 'online', ll: [51.0447, -114.0719] },
    { id: 'montreal', city: 'Montreal', country: 'Canada · Quebec', status: 'dev', ll: [45.5019, -73.5674] },
    { id: 'bogota', city: 'Bogotá', country: 'Colombia', status: 'dev', ll: [4.711, -74.0721] },
    { id: 'amsterdam', city: 'Amsterdam', country: 'Netherlands', status: 'dev', ll: [52.3676, 4.9041] },
    { id: 'paris', city: 'Paris', country: 'France', status: 'dev', ll: [48.8566, 2.3522] },
    { id: 'london', city: 'London', country: 'United Kingdom', status: 'soon', ll: [51.5074, -0.1278] },
    { id: 'addis', city: 'Addis Ababa', country: 'Ethiopia', status: 'soon', ll: [9.0301, 38.7578] },
    { id: 'mumbai', city: 'Mumbai', country: 'India', status: 'soon', ll: [19.076, 72.8777] },
    { id: 'sydney', city: 'Sydney', country: 'Australia', status: 'soon', ll: [-33.8688, 151.2093] },
    { id: 'buenosaires', city: 'Buenos Aires', country: 'Argentina', status: 'soon', ll: [-34.6037, -58.3816] }
  ];
  var STATUS = {
    online: { label: 'Online', badge: 'badge--online', text: 'Foundation is live. Phase 1 is running now, with room to grow to 12 MW inside the same plant.' },
    dev: { label: 'In development', badge: 'badge--dev', text: 'In development. This city is in the next wave of sites joining the network.' },
    soon: { label: 'Coming soon', badge: 'badge--soon', text: 'Coming soon. Planned for a future wave as the network grows city by city.' }
  };

  var svg = document.getElementById('map');
  var shell = document.getElementById('mapShell');
  if (!svg || !window.SS_MAP) return;
  var NS = 'http://www.w3.org/2000/svg';
  var XY = window.SS_CITY_XY;
  SITES.forEach(function (s) { s.x = XY[s.id][0]; s.y = XY[s.id][1]; });

  var WORLD = { x: 0, y: 20, w: 1000 };
  var ASPECT = 470 / 1000;
  var vb = { x: WORLD.x, y: WORLD.y, w: WORLD.w };

  // Canvas for the land dots (cheap to redraw while zooming)
  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  shell.insertBefore(canvas, svg);
  svg.style.position = 'relative';
  var ctx = canvas.getContext('2d');
  var dots = window.SS_MAP.dots.split(' ').map(function (p) { var a = p.split(','); return [+a[0], +a[1]]; });

  // Layers in the SVG
  var gArcs = document.createElementNS(NS, 'g');
  var gNodes = document.createElementNS(NS, 'g');
  svg.appendChild(gArcs); svg.appendChild(gNodes);

  var hub = SITES[0];
  SITES.slice(1).forEach(function (s) {
    var p = document.createElementNS(NS, 'path');
    var mx = (hub.x + s.x) / 2, my = (hub.y + s.y) / 2;
    var dx = s.x - hub.x, dy = s.y - hub.y, len = Math.hypot(dx, dy);
    var lift = Math.min(90, len * .28);
    var cx = mx + (dy / len) * lift * (dx > 0 ? 1 : -1) * 0, cy = my - lift;
    p.setAttribute('d', 'M' + hub.x + ' ' + hub.y + ' Q' + cx + ' ' + cy + ' ' + s.x + ' ' + s.y);
    p.setAttribute('class', 'arc arc--' + s.status);
    p.setAttribute('vector-effect', 'non-scaling-stroke');
    gArcs.appendChild(p);
  });

  SITES.forEach(function (s) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'node node--' + s.status);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', s.city + ', ' + STATUS[s.status].label);
    g.innerHTML =
      '<circle class="hit" r="16"></circle>' +
      (s.status === 'online' ? '<circle class="glow" r="9"></circle>' : '') +
      '<circle class="pulse" r="3.4"></circle>' +
      '<circle class="ring" r="7"></circle>' +
      '<circle class="core" r="' + (s.status === 'online' ? 4 : 3.2) + '"></circle>' +
      '<text class="node-label" x="11" y="3">' + s.city + '<tspan class="st" x="11" dy="9">' + STATUS[s.status].label + '</tspan></text>';
    g.addEventListener('click', function () { select(s); });
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(s); } });
    s.el = g; s.label = g.querySelector('.node-label');
    gNodes.appendChild(g);
  });

  // Node list under the map (reliable tapping on phones)
  var list = document.getElementById('nodeList');
  var order = { online: 0, dev: 1, soon: 2 };
  SITES.slice().sort(function (a, b) { return order[a.status] - order[b.status]; }).forEach(function (s) {
    var li = document.createElement('li');
    li.innerHTML = '<button type="button"><i class="sw sw--' + s.status + '"></i><span><span class="nm">' + s.city + '</span><span class="ct">' + STATUS[s.status].label + '</span></span></button>';
    li.querySelector('button').addEventListener('click', function () {
      shell.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      setTimeout(function () { select(s, true); }, reduce ? 0 : 350);
    });
    list.appendChild(li);
  });

  var counts = { online: 0, dev: 0, soon: 0 };
  SITES.forEach(function (s) { counts[s.status]++; });
  document.getElementById('hudRight').textContent = counts.online + ' online · ' + counts.dev + ' in development · ' + counts.soon + ' coming soon';

  function pxPerUnit() { return svg.getBoundingClientRect().width / vb.w; }

  function draw() {
    var rect = shell.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.round(rect.width), H = Math.round(svg.getBoundingClientRect().height);
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var k = W / vb.w;
    var r = Math.max(.7, Math.min(4.2, 1.35 * Math.pow(1000 / vb.w, .55) * Math.max(.75, W / 1100)));
    var zoomed = vb.w < 700;
    ctx.fillStyle = zoomed ? '#34466180' : '#2a3950';
    var fs = zoomed ? '#3a4d6b' : '#2a3950';
    ctx.fillStyle = fs;
    var x0 = vb.x - 10, x1 = vb.x + vb.w + 10, y0 = vb.y - 10, y1 = vb.y + vb.w * ASPECT + 10;
    ctx.beginPath();
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (d[0] < x0 || d[0] > x1 || d[1] < y0 || d[1] > y1) continue;
      var px = (d[0] - vb.x) * k, py = (d[1] - vb.y) * k;
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
    ctx.fill();

    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + (vb.w * ASPECT));
    var s = 1 / pxPerUnit();
    var small = W < 640;
    SITES.forEach(function (site) {
      site.el.setAttribute('transform', 'translate(' + site.x + ' ' + site.y + ') scale(' + (s * (small ? .72 : 1.3)) + ')');
      var show = vb.w < 400 || site.status === 'online' || (!small && site.hover);
      site.label.style.display = show ? '' : 'none';
    });
  }

  SITES.forEach(function (s) {
    s.el.addEventListener('mouseenter', function () { s.hover = true; draw(); });
    s.el.addEventListener('mouseleave', function () { s.hover = false; draw(); });
  });

  var anim = null;
  function flyTo(target, ms, done) {
    if (anim) cancelAnimationFrame(anim);
    var from = { x: vb.x, y: vb.y, w: vb.w };
    if (reduce) ms = 1;
    var t0 = performance.now();
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    // zoom along a log path so scale changes evenly
    function step(now) {
      var t = Math.min(1, (now - t0) / ms), e = ease(t);
      var lw = Math.log(from.w) + (Math.log(target.w) - Math.log(from.w)) * e;
      vb.w = Math.exp(lw);
      var fcx = from.x + from.w / 2, fcy = from.y + from.w * ASPECT / 2;
      var tcx = target.x + target.w / 2, tcy = target.y + target.w * ASPECT / 2;
      var cx = fcx + (tcx - fcx) * e, cy = fcy + (tcy - fcy) * e;
      vb.x = cx - vb.w / 2; vb.y = cy - vb.w * ASPECT / 2;
      draw();
      if (t < 1) anim = requestAnimationFrame(step); else { anim = null; if (done) done(); }
    }
    anim = requestAnimationFrame(step);
  }
  function around(x, y, w) { return { x: x - w / 2, y: y - w * ASPECT / 2, w: w }; }

  var card = document.getElementById('cityCard');
  var back = document.getElementById('mapBack');
  var hudLeft = document.getElementById('hudLeft');

  function fmt(ll) {
    var lat = Math.abs(ll[0]).toFixed(2) + '° ' + (ll[0] >= 0 ? 'N' : 'S');
    var lon = Math.abs(ll[1]).toFixed(2) + '° ' + (ll[1] >= 0 ? 'E' : 'W');
    return lat + ' · ' + lon;
  }

  function showCard(s) {
    var st = STATUS[s.status];
    card.innerHTML =
      '<span class="cc-country">' + s.country + '</span>' +
      '<h3>' + s.city + '</h3>' +
      '<span class="badge ' + st.badge + '">' + st.label + '</span>' +
      '<p>' + st.text + '</p>' +
      '<div class="coords num">' + fmt(s.ll) + '</div>' +
      (s.status === 'online' ? '<button class="btn btn--heat" type="button" data-open-foundation>Enter Foundation →</button>' : '');
    card.hidden = false;
    var b = card.querySelector('[data-open-foundation]');
    if (b) b.addEventListener('click', openFoundation);
  }

  var level = 'world';
  function select(s, direct) {
    // In world view, crowded spots (Europe) zoom to the group first
    if (level === 'world' && !direct) {
      var near = SITES.filter(function (o) { return Math.hypot(o.x - s.x, o.y - s.y) < 24; });
      if (near.length > 1) {
        var cx = 0, cy = 0; near.forEach(function (o) { cx += o.x; cy += o.y; });
        cx /= near.length; cy /= near.length;
        level = 'cluster';
        card.hidden = true;
        back.hidden = false;
        hudLeft.textContent = 'Western Europe · pick a city';
        flyTo(around(cx, cy, 70), 1100);
        return;
      }
    }
    level = 'city';
    back.hidden = false;
    hudLeft.textContent = s.city + ' · ' + STATUS[s.status].label;
    card.hidden = true;
    var w = s.status === 'online' ? 34 : 60;
    flyTo(around(s.x, s.y, w), 1400, function () {
      showCard(s);
      if (s.status === 'online') setTimeout(openFoundation, reduce ? 0 : 450);
    });
  }

  function toWorld() {
    level = 'world';
    card.hidden = true;
    back.hidden = true;
    hudLeft.textContent = 'Global network';
    flyTo(WORLD, 1100);
  }
  back.querySelector('button').addEventListener('click', toWorld);

  window.addEventListener('resize', draw);
  if ('ResizeObserver' in window) new ResizeObserver(draw).observe(shell);
  draw();

  /* ---------- Foundation overlay ---------- */
  var fnd = document.getElementById('foundation');
  var lastFocus = null;
  function openFoundation(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!fnd.hidden) return;
    lastFocus = document.activeElement;
    fnd.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('foundation:open'));
    document.getElementById('fndClose').focus({ preventScroll: true });
  }
  function closeFoundation() {
    fnd.hidden = true;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    window.dispatchEvent(new CustomEvent('foundation:close'));
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.getElementById('fndClose').addEventListener('click', closeFoundation);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !fnd.hidden) closeFoundation(); });
  document.querySelectorAll('a[data-open-foundation]').forEach(function (a) { a.addEventListener('click', openFoundation); });
  if (location.hash === '#foundation') setTimeout(openFoundation, 200);

  // Site photos: shown only if the files exist in assets/img
  var photos = [
    { src: 'assets/img/phase1.jpeg', cap: 'Phase 1 · online' }
  ];
  var holder = document.getElementById('fndPhotos');
  photos.forEach(function (p) {
    var img = new Image();
    img.onload = function () {
      var f = document.createElement('figure');
      img.alt = 'Foundation ' + p.cap;
      f.appendChild(img);
      var c = document.createElement('figcaption'); c.textContent = p.cap; f.appendChild(c);
      holder.appendChild(f); holder.hidden = false;
      if (!holder.previousElementSibling || holder.previousElementSibling.tagName !== 'H4') {
        var h = document.createElement('h4'); h.textContent = 'On site'; holder.parentNode.insertBefore(h, holder);
      }
    };
    img.src = p.src;
  });
})();
