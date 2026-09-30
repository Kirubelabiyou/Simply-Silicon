/* Simply Silicon: Network page
   World view: dotted world map, site nodes with names, details open on tap.
   Calgary view: the private fiber network around Foundation, from gosimply.ai's published map data. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var stage = document.getElementById('stage');
  var canvas = document.getElementById('dots');
  var ctx = canvas.getContext('2d');
  var svgW = document.getElementById('world');
  var svgC = document.getElementById('calgary');
  var sheet = document.getElementById('sheet');
  var backBtn = document.getElementById('back');
  var hudTitle = document.getElementById('hudTitle');
  var hudSub = document.getElementById('hudSub');
  var legend = document.getElementById('legend');
  function vis(el, on) { if (on) el.removeAttribute('hidden'); else el.setAttribute('hidden', ''); }

  var SITES = [
    { id: 'calgary', city: 'Calgary', country: 'Canada · Alberta', region: 'North America', status: 'online', ll: [51.0447, -114.0719] },
    { id: 'montreal', city: 'Montreal', country: 'Canada · Quebec', region: 'North America', status: 'dev', ll: [45.5019, -73.5674] },
    { id: 'bogota', city: 'Bogotá', country: 'Colombia', region: 'South America', status: 'dev', ll: [4.711, -74.0721] },
    { id: 'amsterdam', city: 'Amsterdam', country: 'Netherlands', region: 'Western Europe', status: 'dev', ll: [52.3676, 4.9041] },
    { id: 'paris', city: 'Paris', country: 'France', region: 'Western Europe', status: 'dev', ll: [48.8566, 2.3522] },
    { id: 'london', city: 'London', country: 'United Kingdom', region: 'Western Europe', status: 'soon', ll: [51.5074, -0.1278] },
    { id: 'addis', city: 'Addis Ababa', country: 'Ethiopia', region: 'Africa', status: 'soon', ll: [9.0301, 38.7578] },
    { id: 'mumbai', city: 'Mumbai', country: 'India', region: 'Asia', status: 'soon', ll: [19.076, 72.8777] },
    { id: 'sydney', city: 'Sydney', country: 'Australia', region: 'Oceania', status: 'soon', ll: [-33.8688, 151.2093] },
    { id: 'buenosaires', city: 'Buenos Aires', country: 'Argentina', region: 'South America', status: 'soon', ll: [-34.6037, -58.3816] }
  ];
  var STATUS = {
    online: { label: 'Online', chip: 'chip--live', dot: 'dot--live' },
    dev: { label: 'In development', chip: 'chip--dev', dot: 'dot--dev' },
    soon: { label: 'Coming soon', chip: 'chip--soon', dot: 'dot--soon' }
  };
  var TEXT = {
    dev: 'This city is in development. It is part of the next wave of sites joining the network.',
    soon: 'This city is coming soon. It is planned for a future wave as the network grows city by city.'
  };
  SITES.forEach(function (s) { s.x = window.SS_CITY_XY[s.id][0]; s.y = window.SS_CITY_XY[s.id][1]; });
  var DOTS = window.SS_MAP.dots.split(' ').map(function (p) { var a = p.split(','); return [+a[0], +a[1]]; });

  /* ---------- view state ---------- */
  var mode = 'world';
  var W = 0, H = 0, dpr = 1;
  var vb = { x: 0, y: 0, w: 1000 };      // current view: x, y = top-left in view units, w = width in units
  var LIM = { world: [50, 1600], calgary: [120, 4200] };
  function upp() { return vb.w / W; }     // units per pixel
  function toPx(x, y) { var k = W / vb.w; return [(x - vb.x) * k, (y - vb.y) * k]; }
  function isPhone() { return W < 700; }
  function sheetOpen() { return !sheet.hidden; }
  function sideInset() { return sheetOpen() && !isPhone() ? 412 : 0; }
  function bottomInset() {
    if (!sheetOpen() || !isPhone()) return 0;
    var st = stage.getBoundingClientRect(), sh = sheet.getBoundingClientRect();
    var top = window.innerHeight - sh.height;
    return Math.max(0, Math.min(H * .6, st.bottom - top));
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    var cx = vb.x + vb.w / 2, cy = vb.y + (vb.w * (H / W || .5)) / 2;
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    [svgW, svgC].forEach(function (s) { s.setAttribute('viewBox', '0 0 ' + W + ' ' + H); });
    if (!resize.done) { resize.done = true; return; }
    vb.x = cx - vb.w / 2; vb.y = cy - (vb.w * H / W) / 2;
    draw();
  }

  /* ---------- world ---------- */
  function worldFit() {
    var aspect = H / W;
    if (isPhone()) { var w = 800; return { x: 560 - w / 2, y: 250 - w * aspect / 2, w: w }; }
    var w2 = Math.max(1000, 460 / aspect) * 1.02;
    return { x: 500 - w2 / 2, y: 252 - w2 * aspect / 2, w: w2 };
  }
  function drawDots() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (mode !== 'world') return;
    var k = W / vb.w;
    var r = Math.max(.9, Math.min(4.5, 2.1 * k));
    ctx.fillStyle = '#c7d5e3';
    var x0 = vb.x - 6, x1 = vb.x + vb.w + 6, y0 = vb.y - 6, y1 = vb.y + H * upp() + 6;
    ctx.beginPath();
    for (var i = 0; i < DOTS.length; i++) {
      var d = DOTS[i];
      if (d[0] < x0 || d[0] > x1 || d[1] < y0 || d[1] > y1) continue;
      var px = (d[0] - vb.x) * k, py = (d[1] - vb.y) * k;
      ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, 6.2832);
    }
    ctx.fill();
  }

  var selected = null;
  function drawWorld() {
    var hub = SITES[0], hp = toPx(hub.x, hub.y);
    var out = '';
    // arcs from Calgary
    SITES.slice(1).forEach(function (s) {
      var p = toPx(s.x, s.y);
      var mx = (hp[0] + p[0]) / 2, my = (hp[1] + p[1]) / 2;
      var len = Math.hypot(p[0] - hp[0], p[1] - hp[1]);
      out += '<path class="arc arc--' + s.status + '" d="M' + hp[0].toFixed(1) + ' ' + hp[1].toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + (my - Math.min(160, len * .22)).toFixed(1) + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + '"/>';
    });
    // cluster by screen distance
    var pts = SITES.map(function (s) { var p = toPx(s.x, s.y); return { s: s, x: p[0], y: p[1] }; });
    var groups = [];
    pts.forEach(function (p) {
      var g = null;
      groups.forEach(function (gr) { if (!g && Math.hypot(gr.x - p.x, gr.y - p.y) < 34) g = gr; });
      if (g) { g.m.push(p); g.x = g.m.reduce(function (a, b) { return a + b.x; }, 0) / g.m.length; g.y = g.m.reduce(function (a, b) { return a + b.y; }, 0) / g.m.length; }
      else groups.push({ x: p.x, y: p.y, m: [p] });
    });
    var boxes = [];
    function place(x, y, w) {
      var opts = [[x + 13, y - 8], [x - 13 - w, y - 8], [x - w / 2, y + 12], [x - w / 2, y - 28]];
      for (var i = 0; i < opts.length; i++) {
        var b = { x: opts[i][0], y: opts[i][1], w: w, h: 17 };
        if (b.x < 4 || b.x + b.w > W - 4) continue;
        var hit = boxes.some(function (o) { return b.x < o.x + o.w + 4 && b.x + b.w + 4 > o.x && b.y < o.y + o.h && b.y + b.h > o.y; });
        if (!hit) { boxes.push(b); return b; }
      }
      return null;
    }
    // node circles first reserve space
    groups.forEach(function (g) { boxes.push({ x: g.x - 9, y: g.y - 9, w: 18, h: 18 }); });
    var nodes = '';
    groups.forEach(function (g, gi) {
      if (g.x < -40 || g.x > W + 40 || g.y < -40 || g.y > H + 40) return;
      if (g.m.length > 1) {
        var name = g.m[0].s.region;
        var b = place(g.x + 4, g.y, name.length * 7 + 6);
        nodes += '<g class="node node--cluster" tabindex="0" role="button" data-g="' + gi + '" aria-label="' + name + ', ' + g.m.length + ' sites">' +
          '<circle class="hit" cx="' + g.x + '" cy="' + g.y + '" r="24"/><circle class="core" cx="' + g.x + '" cy="' + g.y + '" r="13"/>' +
          '<text class="cn" x="' + g.x + '" y="' + (g.y + 4) + '" text-anchor="middle">' + g.m.length + '</text>' +
          (b ? '<text class="nl" x="' + b.x + '" y="' + (b.y + 13) + '">' + name + '</text>' : '') + '</g>';
      } else {
        var s = g.m[0].s, x = g.x, y = g.y;
        var lb = place(x, y, s.city.length * 7.2 + 4);
        var r = s.status === 'online' ? 8 : 6.5;
        nodes += '<g class="node node--' + s.status + (selected === s ? ' sel' : '') + '" tabindex="0" role="button" data-s="' + s.id + '" aria-label="' + s.city + ', ' + STATUS[s.status].label + '">' +
          '<circle class="hit" cx="' + x + '" cy="' + y + '" r="22"/>' +
          (s.status === 'online' ? '<circle class="halo" cx="' + x + '" cy="' + y + '" r="16"/>' : '') +
          (s.status !== 'soon' ? '<circle class="pulse" cx="' + x + '" cy="' + y + '" r="' + r + '"/>' : '') +
          '<circle class="core" cx="' + x + '" cy="' + y + '" r="' + r + '"/>' +
          (lb ? '<text class="nl" x="' + lb.x + '" y="' + (lb.y + 13) + '">' + s.city + '</text>' : '') + '</g>';
      }
    });
    svgW.innerHTML = out + nodes;
    svgW._groups = groups;
  }

  svgW.addEventListener('click', function (e) {
    if (dragMoved) return;
    var n = e.target.closest('.node'); if (!n) return;
    activateNode(n);
  });
  svgW.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var n = e.target.closest('.node'); if (!n) return;
    e.preventDefault(); activateNode(n);
  });
  function activateNode(n) {
    if (n.hasAttribute('data-g')) {
      var g = svgW._groups[+n.getAttribute('data-g')];
      var xs = g.m.map(function (p) { return p.s.x; }), ys = g.m.map(function (p) { return p.s.y; });
      var cx = (Math.min.apply(0, xs) + Math.max.apply(0, xs)) / 2, cy = (Math.min.apply(0, ys) + Math.max.apply(0, ys)) / 2;
      var spread = Math.max(Math.max.apply(0, xs) - Math.min.apply(0, xs), Math.max.apply(0, ys) - Math.min.apply(0, ys));
      flyTo(around(cx, cy, Math.max(60, spread * (isPhone() ? 5 : 8))), 1000);
      return;
    }
    openSite(byId(n.getAttribute('data-s')));
  }
  function byId(id) { for (var i = 0; i < SITES.length; i++) if (SITES[i].id === id) return SITES[i]; }

  function around(x, y, w) {
    // centre the point inside the area not covered by the sheet
    var aspect = H / W;
    var sx = sideInset() / W * w, sy = bottomInset() / W * w;
    return { x: x - (w - sx) / 2, y: y - (w * aspect - sy) / 2, w: w };
  }

  function openSite(s) {
    selected = s;
    if (s.status === 'online') { showSheet(sheetCalgaryIntro()); }
    else showSheet(sheetCity(s));
    backBtn.hidden = false;
    hudTitle.textContent = s.city; hudSub.textContent = STATUS[s.status].label;
    flyTo(around(s.x, s.y, s.status === 'online' ? 70 : 90), 1200);
  }

  function fmt(ll) {
    return Math.abs(ll[0]).toFixed(2) + '° ' + (ll[0] >= 0 ? 'N' : 'S') + ' · ' + Math.abs(ll[1]).toFixed(2) + '° ' + (ll[1] >= 0 ? 'E' : 'W');
  }
  function head(country, title, st) {
    return '<div class="sheet-head"><span class="country">' + country + '</span><h2>' + title + '</h2><span class="chip ' + STATUS[st].chip + '"><i class="dot ' + STATUS[st].dot + '"></i>' + STATUS[st].label + '</span><button class="sheet-x" type="button" aria-label="Close details">×</button></div>';
  }
  function sheetCity(s) {
    return head(s.country, s.city, s.status) +
      '<div class="sheet-body"><p>' + TEXT[s.status] + '</p><p class="coords num">' + fmt(s.ll) + '</p>' +
      '<div class="sheet-actions" style="margin-top:18px"><button class="btn btn--primary" type="button" data-act="calgary">Explore Calgary, our live site</button><button class="btn" type="button" data-act="world">Back to world map</button></div></div>';
  }
  function sheetCalgaryIntro() {
    return head('Canada · Alberta', 'Calgary', 'online') +
      '<div class="sheet-body"><p>Foundation is live in downtown Calgary. It sits in an existing district heating plant and connects to the buildings around it over private fiber.</p>' +
      '<div class="kv"><div><b>12 MW</b><span>AI capacity at full build</span></div><div><b>100 kW</b><span>Phase 1, online now</span></div><div><b>7 km</b><span>Private fiber</span></div><div><b>25+</b><span>Connected buildings</span></div></div>' +
      '<div class="sheet-actions"><button class="btn btn--primary" type="button" data-act="calgary">Explore the Calgary fiber network →</button><a class="btn" href="foundation.html">Tour Foundation in 3D</a></div></div>';
  }
  sheet.addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]');
    if (e.target.closest('.sheet-x')) { closeSheet(); return; }
    if (!a) {
      var b = e.target.closest('[data-ep]'); if (b) selectEndpoint(b.getAttribute('data-ep'), true);
      return;
    }
    var act = a.getAttribute('data-act');
    if (act === 'calgary') enterCalgary();
    if (act === 'world') toWorld();
  });
  function showSheet(html) { sheet.innerHTML = html; sheet.hidden = false; }
  function closeSheet() {
    sheet.hidden = true; selected = null;
    if (mode === 'world') { hudTitle.textContent = 'The network'; hudSub.textContent = 'Tap a city to open it'; }
    draw();
  }

  /* ---------- Calgary fiber view ---------- */
  var CAL = window.SS_CALGARY;
  var LNG0 = CAL.foundation.coordinate[0], LAT0 = CAL.foundation.coordinate[1];
  var KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KY = 110574;
  function m(c) { return [(c[0] - LNG0) * KX, -(c[1] - LAT0) * KY]; }
  var routes = CAL.routes.map(function (r) { return { id: r.id, trunk: !!r.trunk, pts: r.c.map(m) }; });
  var eps = CAL.endpoints.map(function (e, i) { var p = m(e.c); return { id: e.id, name: e.name, generic: !!e.generic, d: e.d, x: p[0], y: p[1] }; });
  var fnd = { pts: CAL.foundation.footprint.map(m), x: 0, y: 0 };
  var bounds = (function () {
    var xs = [], ys = [];
    routes.forEach(function (r) { r.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
    return { x0: Math.min.apply(0, xs), x1: Math.max.apply(0, xs), y0: Math.min.apply(0, ys), y1: Math.max.apply(0, ys) };
  })();

  // Graph for the path from Foundation to each building
  var graph = (function () {
    var segs = [];
    routes.forEach(function (r) { for (var i = 1; i < r.pts.length; i++) segs.push([r.pts[i - 1], r.pts[i]]); });
    var ends = [];
    routes.forEach(function (r) { ends.push(r.pts[0], r.pts[r.pts.length - 1]); });
    eps.forEach(function (e) { ends.push([e.x, e.y]); }); ends.push([0, 0]);
    ends.forEach(function (p) {
      for (var i = 0; i < segs.length; i++) {
        var a = segs[i][0], b = segs[i][1], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
        if (!L) continue;
        var t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L));
        var q = [a[0] + t * dx, a[1] + t * dy];
        if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 6 && t > .001 && t < .999) { segs.splice(i, 1, [a, q], [q, b]); break; }
      }
    });
    var nodes = [], adj = [];
    function nid(p) { for (var i = 0; i < nodes.length; i++) if (Math.hypot(nodes[i][0] - p[0], nodes[i][1] - p[1]) < 2) return i; nodes.push(p); adj.push([]); return nodes.length - 1; }
    segs.forEach(function (s) { var i = nid(s[0]), j = nid(s[1]), w = Math.hypot(s[0][0] - s[1][0], s[0][1] - s[1][1]); adj[i].push([j, w]); adj[j].push([i, w]); });
    var src = nid([0, 0]), dist = nodes.map(function () { return Infinity; }), prev = nodes.map(function () { return -1; }), done = [];
    dist[src] = 0;
    for (;;) {
      var u = -1, best = Infinity;
      for (var i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0) break; done[u] = true;
      adj[u].forEach(function (e) { if (dist[u] + e[1] < dist[e[0]]) { dist[e[0]] = dist[u] + e[1]; prev[e[0]] = u; } });
    }
    return { nodes: nodes, prev: prev, nearest: function (x, y) { var b = 0, bd = Infinity; nodes.forEach(function (n, i) { var d = Math.hypot(n[0] - x, n[1] - y); if (d < bd) { bd = d; b = i; } }); return b; } };
  })();
  function pathTo(ep) {
    var i = graph.nearest(ep.x, ep.y), out = [];
    while (i >= 0) { out.push(graph.nodes[i]); i = graph.prev[i]; }
    return out;
  }

  var selEp = null;
  function calFit() {
    var pad = 60;
    var w = bounds.x1 - bounds.x0 + pad * 2, h = bounds.y1 - bounds.y0 + pad * 2;
    var availW = W - sideInset(), availH = H - bottomInset() - (isPhone() ? 70 : 90);
    var unitsW = Math.max(w / availW, h / availH) * W;
    var cx = (bounds.x0 + bounds.x1) / 2, cy = (bounds.y0 + bounds.y1) / 2;
    var o = around(cx, cy, unitsW);
    o.y -= (isPhone() ? 20 : 30) * unitsW / W;
    return o;
  }
  function poly(pts) { return pts.map(function (p, i) { var q = toPx(p[0], p[1]); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(''); }

  function drawCalgary() {
    var k = W / vb.w;
    var out = '';
    // streets under the fiber (the routes follow real streets)
    out += '<g>' + routes.map(function (r) { return '<path class="cal-street" style="stroke-width:' + Math.max(6, 16 * k).toFixed(1) + 'px" d="' + poly(r.pts) + '"/>'; }).join('') + '</g>';
    out += '<g>' + routes.map(function (r) { return '<path class="cal-route' + (r.trunk ? ' trunk' : '') + '" d="' + poly(r.pts) + '"/>'; }).join('') + '</g>';
    if (!reduce) out += '<g>' + routes.filter(function (r) { return r.trunk; }).map(function (r) { return '<path class="cal-flow" d="' + poly(r.pts) + '"/>'; }).join('') + '</g>';
    if (selEp) out += '<path class="cal-route hl" d="' + poly(pathTo(selEp)) + '"/>';
    // Foundation
    var fp = toPx(0, 0);
    out += '<path class="cal-fnd" d="' + poly(fnd.pts) + 'Z"/>';
    out += '<circle cx="' + fp[0] + '" cy="' + fp[1] + '" r="' + Math.max(9, 10) + '" fill="#0b1b2e" stroke="#fff" stroke-width="3"/><circle cx="' + fp[0] + '" cy="' + fp[1] + '" r="3.5" fill="#4fb3f0"/>';
    // label placement with collision checks
    var boxes = [{ x: fp[0] - 12, y: fp[1] - 12, w: 24, h: 24 }];
    eps.forEach(function (e) { var p = toPx(e.x, e.y); boxes.push({ x: p[0] - 9, y: p[1] - 9, w: 18, h: 18 }); });
    function place(x, y, w, forced) {
      var opts = [[x + 12, y - 8], [x - 12 - w, y - 8], [x - w / 2, y + 12], [x - w / 2, y - 28]];
      for (var i = 0; i < opts.length; i++) {
        var b = { x: opts[i][0], y: opts[i][1], w: w, h: 17 };
        if (b.x < 4 || b.x + b.w > W - sideInset() - 4) continue;
        var hit = boxes.some(function (o) { return b.x < o.x + o.w + 3 && b.x + b.w + 3 > o.x && b.y < o.y + o.h && b.y + b.h > o.y; });
        if (!hit || forced) { boxes.push(b); return b; }
      }
      return null;
    }
    var labels = '';
    var fl = place(fp[0], fp[1], 96, true);
    if (fl) labels += '<text class="cal-fnd-l" x="' + fl.x + '" y="' + (fl.y + 13) + '">Foundation</text>';
    if (selEp) { var sp = toPx(selEp.x, selEp.y); var sb = place(sp[0], sp[1], selEp.name.length * 7 + 6, true); if (sb) labels += '<text class="lbl" x="' + sb.x + '" y="' + (sb.y + 13) + '" style="font:700 12px var(--body);fill:#1673c8;paint-order:stroke;stroke:#fff;stroke-width:4px">' + selEp.name + '</text>'; }
    var showAll = k > (isPhone() ? .55 : .42);
    var epsOut = '';
    eps.forEach(function (e) {
      var p = toPx(e.x, e.y);
      var lb = null;
      if (showAll && !e.generic && e !== selEp) lb = place(p[0], p[1], e.name.length * 6.6 + 4);
      epsOut += '<g class="cal-ep' + (selEp === e ? ' sel' : '') + '" data-ep="' + e.id + '" tabindex="0" role="button" aria-label="' + e.name + ', ' + e.d + ' metres of fiber from Foundation">' +
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="16" fill="transparent"/>' +
        '<circle class="' + (e.generic ? 'g' : 'b') + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (e.generic ? 4.5 : 6.5) + '"/>' +
        (lb ? '<text class="lbl" x="' + lb.x + '" y="' + (lb.y + 13) + '">' + e.name + '</text>' : '') + '</g>';
    });
    // scale bar and north marker
    var target = 200, px = target * k;
    if (px < 50) { target = 500; px = target * k; }
    if (px > 180) { target = 100; px = target * k; }
    var sy = isPhone() ? 150 : 158;
    var scale = '<g class="cal-scale" transform="translate(' + (W - sideInset() - px - 24) + ' ' + sy + ')"><path d="M0 -5 V0 H' + px.toFixed(1) + ' V-5"/><text x="' + (px / 2).toFixed(1) + '" y="-9" text-anchor="middle">' + target + ' m</text></g>';
    var north = '<g transform="translate(' + (W - sideInset() - 34) + ' ' + (isPhone() ? 96 : 104) + ')"><circle r="15" fill="#fff" stroke="#d9e3ee"/><path d="M0 -9 L5 5 L0 2 L-5 5Z" fill="#0b1b2e"/><text class="cal-n" y="-20" text-anchor="middle">N</text></g>';
    svgC.innerHTML = out + epsOut + labels + scale + north;
  }
  svgC.addEventListener('click', function (e) {
    if (dragMoved) return;
    var g = e.target.closest('.cal-ep'); if (g) selectEndpoint(g.getAttribute('data-ep'), false);
  });
  svgC.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var g = e.target.closest('.cal-ep'); if (!g) return;
    e.preventDefault(); selectEndpoint(g.getAttribute('data-ep'), false);
  });

  function sheetCalgaryNet() {
    var list = eps.slice().sort(function (a, b) { return a.d - b.d; });
    var named = list.filter(function (e) { return !e.generic; }).length;
    return head('Calgary · Downtown', 'Foundation fiber', 'online') +
      '<div class="sheet-body"><div id="epInfo"><p>Private fiber runs from Foundation under downtown streets to the buildings around it. Tap a building to trace its route.</p></div>' +
      '<div class="kv"><div><b>7 km</b><span>Private fiber</span></div><div><b>25+</b><span>Connected buildings</span></div><div><b class="num">' + list.length + '</b><span>Endpoints on this map</span></div><div><b class="num">' + (list[list.length - 1].d / 1000).toFixed(1) + ' km</b><span>Longest mapped route</span></div></div>' +
      '<h4>Connected buildings · distance by fiber</h4><ul class="blist">' +
      list.map(function (e, i) { return '<li><button type="button" data-ep="' + e.id + '" aria-pressed="false"><span class="i">' + String(i + 1).padStart(2, '0') + '</span><span class="n">' + e.name + '</span><span class="m">' + fmtM(e.d) + '</span></button></li>'; }).join('') +
      '</ul><p class="coords" style="margin-top:14px;line-height:1.5">' + named + ' named buildings plus network endpoints, from Simply Silicon\'s published map. Distances are measured along the mapped routes.</p>' +
      '<div class="sheet-actions" style="margin-top:14px"><a class="btn btn--primary" href="foundation.html">Tour Foundation in 3D</a></div></div>';
  }
  function fmtM(d) { return d >= 1000 ? (d / 1000).toFixed(2) + ' km' : d + ' m'; }

  function selectEndpoint(id, fromList) {
    var e = null; eps.forEach(function (x) { if (x.id === id) e = x; });
    if (!e) return;
    selEp = selEp === e && !fromList ? null : e;
    sheet.querySelectorAll('[data-ep]').forEach(function (b) { b.setAttribute('aria-pressed', String(selEp && b.getAttribute('data-ep') === selEp.id)); });
    var info = document.getElementById('epInfo');
    if (info) info.innerHTML = selEp
      ? '<p><b style="color:#0b1b2e;font-size:18px">' + selEp.name + '</b><br>' + fmtM(selEp.d) + ' of private fiber from Foundation, following the route shown in blue.</p>'
      : '<p>Private fiber runs from Foundation under downtown streets to the buildings around it. Tap a building to trace its route.</p>';
    if (selEp && isPhone() && fromList) sheet.querySelector('.sheet-body').scrollTo({ top: 0, behavior: 'smooth' });
    draw();
  }

  function enterCalgary(instant) {
    var cal = byId('calgary');
    selected = cal;
    backBtn.hidden = false;
    legend.hidden = true;
    hudTitle.textContent = 'Calgary fiber network';
    hudSub.textContent = 'Downtown · tap a building';
    var go = function () {
      mode = 'calgary';
      vis(svgW, false); vis(svgC, true);
      showSheet(sheetCalgaryNet());
      var fit = calFit();
      vb = { x: fit.x - fit.w, y: fit.y - fit.w * H / W, w: fit.w * 3 };
      flyTo(calFit(), instant ? 1 : 900);
      try { history.replaceState(null, '', '#calgary'); } catch (e) {}
    };
    if (instant || mode === 'calgary') { go(); return; }
    flyTo(around(cal.x, cal.y, 16), 900, go);
  }

  function toWorld() {
    var wasCal = mode === 'calgary';
    mode = 'world'; selEp = null; selected = null;
    vis(svgC, false); vis(svgW, true); legend.hidden = false;
    sheet.hidden = true; backBtn.hidden = true;
    hudTitle.textContent = 'The network'; hudSub.textContent = 'Tap a city to open it';
    if (wasCal) { var c = byId('calgary'); vb = { x: c.x - 8, y: c.y - 8 * H / W, w: 16 }; }
    flyTo(worldFit(), 1100);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }
  backBtn.querySelector('button').addEventListener('click', function () {
    if (mode === 'calgary') { toWorld(); return; }
    toWorld();
  });

  /* ---------- drawing and motion ---------- */
  function draw() {
    drawDots();
    if (mode === 'world') drawWorld(); else drawCalgary();
  }
  var anim = null;
  function flyTo(t, ms, done) {
    if (anim) cancelAnimationFrame(anim);
    var f = { x: vb.x, y: vb.y, w: vb.w };
    if (reduce) ms = 1;
    var t0 = performance.now(), aspect = H / W;
    function ease(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
    function step(now) {
      var u = Math.min(1, (now - t0) / ms), e = ease(u);
      vb.w = Math.exp(Math.log(f.w) + (Math.log(t.w) - Math.log(f.w)) * e);
      var fcx = f.x + f.w / 2, fcy = f.y + f.w * aspect / 2, tcx = t.x + t.w / 2, tcy = t.y + t.w * aspect / 2;
      vb.x = fcx + (tcx - fcx) * e - vb.w / 2; vb.y = fcy + (tcy - fcy) * e - vb.w * aspect / 2;
      draw();
      if (u < 1) anim = requestAnimationFrame(step); else { anim = null; if (done) done(); }
    }
    anim = requestAnimationFrame(step);
  }
  function zoomAt(f, px, py) {
    var lim = LIM[mode];
    var nw = Math.max(lim[0], Math.min(lim[1], vb.w / f));
    var ux = vb.x + px * upp(), uy = vb.y + py * upp();
    var k = nw / vb.w;
    vb.x = ux - (ux - vb.x) * k; vb.y = uy - (uy - vb.y) * k; vb.w = nw;
    draw();
  }
  document.getElementById('zoom').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var f = +b.getAttribute('data-z'), lim = LIM[mode], nw = Math.max(lim[0], Math.min(lim[1], vb.w / f));
    var cx = vb.x + (W - sideInset()) / 2 * upp(), cy = vb.y + (H - bottomInset()) / 2 * upp();
    var k = nw / vb.w;
    flyTo({ x: cx - (cx - vb.x) * k, y: cy - (cy - vb.y) * k, w: nw }, 350);
  });
  stage.addEventListener('wheel', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.target.closest('.sheet')) return;
    e.preventDefault();
    var r = stage.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * .0025), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // drag to pan
  var drag = null, dragMoved = false;
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.sheet, .net-hud, .zoom, .net-back')) return;
    drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, id: e.pointerId };
    dragMoved = false;
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragMoved && Math.hypot(dx, dy) < 6) return;
    if (!dragMoved && e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
    dragMoved = true; stage.classList.add('dragging');
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    vb.x = drag.vx - dx * upp(); vb.y = drag.vy - dy * upp();
    draw();
  });
  window.addEventListener('pointerup', function () {
    if (drag) stage.classList.remove('dragging');
    drag = null;
    setTimeout(function () { dragMoved = false; }, 0);
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { if (mode === 'calgary') toWorld(); else closeSheet(); } });

  /* ---------- site list under the map ---------- */
  var order = { online: 0, dev: 1, soon: 2 };
  var list = document.getElementById('siteList');
  SITES.slice().sort(function (a, b) { return order[a.status] - order[b.status]; }).forEach(function (s) {
    var li = document.createElement('li');
    li.innerHTML = '<button type="button"><i class="dot ' + STATUS[s.status].dot + '"></i><span><span class="nm">' + s.city + '</span><span class="ct">' + s.country.split(' · ')[0] + ' · ' + STATUS[s.status].label + '</span></span></button>';
    li.querySelector('button').addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      if (mode === 'calgary') { mode = 'world'; vis(svgC, false); vis(svgW, true); legend.hidden = false; vb = worldFit(); }
      setTimeout(function () { openSite(s); }, reduce ? 0 : 300);
    });
    list.appendChild(li);
  });

  /* ---------- start ---------- */
  resize();
  vb = worldFit();
  if (location.hash === '#calgary') enterCalgary(true); else draw();
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
})();
