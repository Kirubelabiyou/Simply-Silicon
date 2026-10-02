/* Simply Silicon: home page (hero racks and How it works) */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- Hero GPU racks ---------- */
  var racks = document.getElementById('racks');
  if (racks) {
    var plan = ['n', 'g', 'g', 'g', 'g', 'n', 'g', 'g', 'g', 'g', 'n'];
    var plans = [plan, plan, plan, plan];
    plans.forEach(function (units, r) {
      var rack = document.createElement('div');
      rack.className = 'rack';
      rack.innerHTML = '<div class="rack-head"><span>R0' + (r + 1) + '</span><span class="rack-led"></span></div>';
      units.forEach(function (u) {
        var el = document.createElement('div');
        el.className = 'unit' + (u === 'g' ? ' gpu' : '');
        for (var i = 0; i < (u === 'g' ? 3 : 2); i++) {
          var led = document.createElement('i');
          led.className = 'led ' + (i === 0 ? 'ok' : Math.random() > .25 ? 'on' : '');
          led.style.setProperty('--d', (1.2 + Math.random() * 2.6).toFixed(2) + 's');
          led.style.setProperty('--dl', (-Math.random() * 3).toFixed(2) + 's');
          el.appendChild(led);
        }
        rack.appendChild(el);
      });
      racks.appendChild(rack);
    });
  }

  /* ---------- Figures ---------- */
  function box(x, y, w, h, cls, t, s) {
    return '<rect class="dg-box ' + (cls || '') + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5"/>' +
      (t ? '<text class="dg-t" x="' + (x + w / 2) + '" y="' + (y + h / 2 + (s ? -3 : 5)) + '" text-anchor="middle">' + t + '</text>' : '') +
      (s ? '<text class="dg-s" x="' + (x + w / 2) + '" y="' + (y + h / 2 + 15) + '" text-anchor="middle">' + s + '</text>' : '');
  }
  var ARROW = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#4db2ef"/></marker>' +
    '<marker id="ahh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#e8594a"/></marker></defs>';

  var FIG = {
    power: function () {
      return '<svg viewBox="0 0 480 270" aria-hidden="true">' + ARROW +
        box(12, 18, 150, 54, '', 'Grid feed A', 'Utility') +
        box(12, 108, 150, 54, '', 'Grid feed B', 'Utility') +
        box(12, 198, 150, 54, '', 'On-site power', 'Backup generation') +
        '<path class="dg-flow sky" d="M162 45 C200 45 200 115 232 118" marker-end="url(#ah)"/>' +
        '<path class="dg-flow sky" d="M162 135 H232" marker-end="url(#ah)"/>' +
        '<path class="dg-flow sky" d="M162 225 C200 225 200 155 232 152" marker-end="url(#ah)" style="opacity:.55"/>' +
        box(236, 92, 124, 86, 'on', 'Utility site', 'Already in the city') +
        '<path class="dg-flow sky" d="M360 135 H392" marker-end="url(#ah)"/>' +
        box(396, 108, 72, 54, 'dark', 'GPUs') +
        '<g transform="translate(236 196)"><rect x="0" y="0" width="124" height="30" rx="15" fill="#e8f4fc"/><text class="dg-s" x="62" y="19" text-anchor="middle" style="fill:#1b6fb8;font-weight:600">n+1 redundant</text></g>' +
        '</svg>';
    },
    compute: function () {
      var s = '<svg viewBox="0 0 480 280" aria-hidden="true">';
      s += '<text class="dg-h" x="110" y="26" text-anchor="middle">Shared cloud</text><text class="dg-h" x="370" y="26" text-anchor="middle" style="fill:#1b6fb8">Bare metal</text>';
      s += '<line x1="240" y1="14" x2="240" y2="266" stroke="#e2eaf2" stroke-width="2"/>';
      // shared: three tenants over a virtualization layer
      [['A', 22], ['B', 84], ['C', 146]].forEach(function (t) { s += box(t[1], 48, 52, 40, '', 'User ' + t[0]).replace('dg-t', 'dg-t sm'); });
      s += box(22, 100, 176, 36, 'warn', 'Virtual layer');
      s += '<g transform="translate(22 148)">' + rackSvg(176, 110, '#9fb1c6') + '</g>';
      // bare metal: one model straight on the hardware
      s += box(282, 48, 176, 88, 'on', 'Your AI model', 'Direct access');
      s += '<g transform="translate(282 148)">' + rackSvg(176, 110, '#4db2ef') + '</g>';
      return s + '</svg>';
    },
    fiber: function () {
      var s = '<svg viewBox="0 0 480 300" aria-hidden="true">';
      // street grid
      var X = [40, 150, 260, 370], Y = [50, 150, 250];
      X.forEach(function (x) { s += '<line x1="' + x + '" y1="20" x2="' + x + '" y2="280" class="dg-street"/>'; });
      Y.forEach(function (y) { s += '<line x1="20" y1="' + y + '" x2="400" y2="' + y + '" class="dg-street"/>'; });
      // fiber runs on the streets from the site
      var runs = ['M260 150 H150 V50 H96', 'M260 150 V50 H316', 'M260 150 H370 V206', 'M260 150 V250 H206', 'M260 150 H150 V250 H96', 'M260 150 H370 V94'];
      runs.forEach(function (d, i) { s += '<path class="dg-fiber" d="' + d + '"/><path class="dg-flow sky" style="animation-delay:-' + (i * .25) + 's" d="' + d + '"/>'; });
      [[96, 50], [316, 50], [370, 206], [206, 250], [96, 250], [370, 94]].forEach(function (p) {
        s += '<rect x="' + (p[0] - 16) + '" y="' + (p[1] - 16) + '" width="32" height="32" rx="4" class="dg-bldg"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#1b6fb8"/>';
      });
      s += '<rect x="234" y="124" width="52" height="52" rx="5" fill="#0d2136"/><text x="260" y="155" text-anchor="middle" class="dg-t" style="fill:#fff">Site</text>';
      // public internet, not connected
      s += '<g transform="translate(430 150)"><circle r="34" fill="#f6fafd" stroke="#c9d6e3" stroke-width="1.5" stroke-dasharray="4 4"/><text class="dg-s" y="-4" text-anchor="middle">Public</text><text class="dg-s" y="10" text-anchor="middle">internet</text></g>';
      s += '<line x1="372" y1="150" x2="394" y2="150" stroke="#e8594a" stroke-width="2" stroke-dasharray="3 4"/><path d="M378 142 L388 158 M388 142 L378 158" stroke="#e8594a" stroke-width="2.4"/>';
      return s + '</svg>';
    },
    security: function () {
      var s = '<svg viewBox="0 0 480 270" aria-hidden="true">';
      s += '<rect x="12" y="30" width="170" height="210" rx="6" fill="#f6fafd" stroke="#c9d6e3" stroke-dasharray="5 5"/>';
      s += '<text class="dg-h" x="97" y="58" text-anchor="middle">Public internet</text>';
      s += '<g transform="translate(97 140)" fill="none" stroke="#9fb1c6" stroke-width="2"><circle r="42"/><ellipse rx="18" ry="42"/><path d="M-42 0 H42 M-37 -20 H37 M-37 20 H37"/></g>';
      s += '<rect x="298" y="30" width="170" height="210" rx="6" fill="#e8f4fc" stroke="#4db2ef" stroke-width="1.5"/>';
      s += '<text class="dg-h" x="383" y="58" text-anchor="middle" style="fill:#1b6fb8">Private network</text>';
      for (var i = 0; i < 4; i++) s += '<rect x="322" y="' + (82 + i * 34) + '" width="122" height="24" rx="5" fill="#0d2136"/><circle cx="432" cy="' + (94 + i * 34) + '" r="3.5" fill="#4db2ef" class="dg-blink" style="animation-delay:-' + (i * .4) + 's"/><rect x="334" y="' + (91 + i * 34) + '" width="60" height="6" rx="3" fill="#2a4460"/>';
      s += '<path d="M182 135 H214" stroke="#c9d6e3" stroke-width="2"/><path d="M266 135 H298" stroke="#4db2ef" stroke-width="2"/>';
      s += '<g transform="translate(240 135)"><circle r="22" fill="#fff" stroke="#e8594a" stroke-width="2"/><path d="M-8 -8 L8 8 M8 -8 L-8 8" stroke="#e8594a" stroke-width="2.6" stroke-linecap="round"/></g>';
      s += '<text class="dg-s" x="240" y="180" text-anchor="middle" style="fill:#c2413a;font-weight:600">Air gap</text><text class="dg-s" x="240" y="196" text-anchor="middle">No cable, no path in</text>';
      return s + '</svg>';
    },
    engineering: function () {
      var s = '<svg viewBox="0 0 480 300" aria-hidden="true">' + ARROW;
      s += box(12, 40, 110, 60, '', 'Power in', 'Electricity');
      s += '<path class="dg-flow sky" d="M122 70 H170" marker-end="url(#ah)"/>';
      s += '<g transform="translate(176 20)"><rect width="128" height="100" rx="5" fill="#0d2136"/>';
      for (var i = 0; i < 4; i++) s += '<rect x="16" y="' + (16 + i * 18) + '" width="96" height="11" rx="3" fill="#1d3a5a"/><circle cx="102" cy="' + (21.5 + i * 18) + '" r="3" fill="#4db2ef" class="dg-blink" style="animation-delay:-' + (i * .3) + 's"/>';
      s += '</g><text class="dg-t" x="240" y="140" text-anchor="middle">GPU racks</text><text class="dg-s" x="240" y="156" text-anchor="middle">Useful AI work</text>';
      s += '<path class="dg-flow heat" d="M304 70 H352" marker-end="url(#ahh)"/>';
      s += box(358, 40, 110, 60, 'heat', 'Heat', 'Captured') ;
      s += '<path class="dg-flow heat" d="M413 100 V200 H330" marker-end="url(#ahh)"/>';
      s += '<g transform="translate(150 178)"><rect width="176" height="48" rx="24" fill="#fdecea"/><text class="dg-t" x="88" y="22" text-anchor="middle" style="fill:#b3372c">Heating loop</text><text class="dg-s" x="88" y="37" text-anchor="middle">Warms nearby buildings</text></g>';
      s += '<path class="dg-flow heat" d="M150 202 H70 V250" style="opacity:.6"/>';
      [[30, 250], [70, 238], [110, 250]].forEach(function (b, k) { s += '<rect x="' + (b[0] + 12) + '" y="' + b[1] + '" width="30" height="' + (290 - b[1]) + '" rx="4" fill="#e2eaf2"/>'; });
      s += '<text class="dg-s" x="300" y="268" text-anchor="middle">Calgary: Foundation sits inside a</text><text class="dg-s" x="300" y="284" text-anchor="middle">district heating plant</text>';
      return s + '</svg>';
    }
  };
  function rackSvg(w, h, led) {
    var s = '<rect width="' + w + '" height="' + h + '" rx="5" fill="#0d2136"/>';
    for (var i = 0; i < 5; i++) s += '<rect x="14" y="' + (12 + i * 19) + '" width="' + (w - 28) + '" height="12" rx="3" fill="#1d3a5a"/><circle cx="' + (w - 24) + '" cy="' + (18 + i * 19) + '" r="3" fill="' + led + '"/>';
    return s;
  }

  /* ---------- Pieces ---------- */
  var P = [
    {
      id: 'power', name: 'Power',
      icon: '<path d="M12 2.5v2.5M8.5 5h7M9.6 5 7 21.5M14.4 5 17 21.5M8.3 13h7.4M7.6 17.5h8.8M9.2 9h5.6M4.5 5h4M15.5 5h4"/>',
      one: 'We start where big power already exists: inside the city.',
      how: [
        'Most new data centres wait years for a grid connection. We skip that wait by using utility sites that already have one.',
        'These sites have <b>large power connections</b>, <b>more than one grid feed</b> and <b>on-site generation</b>. If one source fails, another takes over.',
        'Using power that is already in place is faster and wastes less than building a new plant far away.'
      ],
      terms: [
        ['MW (megawatt)', 'How much power a site can use at once. One megawatt is one million watts.'],
        ['n+1 redundancy', 'One more of every critical part than you need. Any single part can fail and the site keeps running.'],
        ['Redundant grid feeds', 'Two separate power lines from the grid. If one goes down, the other still delivers power.'],
        ['Own-use power', 'Power a site already holds for itself. We turn it into compute instead of leaving it idle.']
      ],
      cap: 'Two grid feeds and on-site power feed one site. n+1 means there is always a spare.'
    },
    {
      id: 'compute', name: 'Compute',
      icon: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><path d="M9.5 3.5V7M12 3.5V7M14.5 3.5V7M9.5 17v3.5M12 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 12H7M3.5 14.5H7M17 9.5h3.5M17 12h3.5M17 14.5h3.5"/>',
      one: 'Dedicated GPU servers that run AI and answer in real time.',
      how: [
        '<b>GPUs</b> are chips that do many calculations at the same time. That is exactly what AI models need.',
        'We run them <b>bare metal</b>. The customer gets the physical machine itself, not a slice shared with strangers through a virtual layer.',
        'Our sites are built for <b>inference</b>: the moment an AI model is used to answer a question, write something or make a decision.'
      ],
      terms: [
        ['GPU', 'Graphics processing unit. A chip that handles thousands of small calculations at once, the workhorse of AI.'],
        ['Inference', 'Using a trained AI model to produce an answer. It is what people feel every time they ask an AI something.'],
        ['Bare metal', 'A physical server dedicated to one customer, with no shared layer in between. More control and steadier speed.'],
        ['Rack', 'A tall steel frame that holds a stack of servers, with shared power and cooling.']
      ],
      cap: 'Shared cloud splits one machine between users. Bare metal gives your model the whole machine.'
    },
    {
      id: 'fiber', name: 'Fiber',
      icon: '<path d="M3 7.5c5 0 6 9 11 9h7M3 12c5 0 6 4.5 11 4.5M3 16.5c5 0 6-9 11-9h7"/><circle cx="21" cy="7.5" r="1"/><circle cx="21" cy="16.5" r="1"/>',
      one: 'Private cables from our sites to the buildings that use them.',
      how: [
        'Each site connects to the buildings around it over <b>private fiber</b> that runs under the streets.',
        'Data does not cross the shared public internet or <b>common carrier networks</b> to reach the servers.',
        'Short, direct paths mean <b>low latency</b>. Answers arrive fast, and they arrive at a steady, predictable speed.'
      ],
      terms: [
        ['Fiber optic cable', 'Thin strands of glass that carry data as light. The fastest way to move data between buildings.'],
        ['Private fiber', 'Fiber used only by us and our customers, never shared with the public.'],
        ['Latency', 'The delay between asking and getting an answer. Lower is better, most of all for live AI.'],
        ['Common carrier network', 'The shared telecom networks everyone else uses.']
      ],
      cap: 'Fiber runs along the streets from the site to each connected building. The public internet is not connected.'
    },
    {
      id: 'security', name: 'Security',
      icon: '<path d="M12 3 19 6v5.5c0 4.6-3 8.2-7 9.5-4-1.3-7-4.9-7-9.5V6z"/><rect x="9.25" y="11.5" width="5.5" height="4.5" rx="1"/><path d="M10.5 11.5V10a1.5 1.5 0 0 1 3 0v1.5"/>',
      one: 'Physically separate from the public internet.',
      how: [
        'An <b>air-gapped network</b> has no connection to the public internet. There is no route in for someone outside.',
        'This is <b>physical separation</b>, not just software rules. A setting can be changed by mistake. A missing cable cannot be hacked.',
        'It suits <b>regulated enterprise</b>, <b>high-security workloads</b>, and AI models too capable for the open internet.'
      ],
      terms: [
        ['Air gap', 'A network with no physical link to outside networks. Data can only move where cables actually run.'],
        ['Physical separation', 'Security that comes from how things are wired and where they sit, not only from software.'],
        ['Regulated enterprise', 'Companies bound by strict rules on data, like banks, utilities and energy producers.']
      ],
      cap: 'The private network and the public internet never touch.'
    },
    {
      id: 'engineering', name: 'Engineering',
      icon: '<path d="M4 17.5a8 8 0 1 1 16 0"/><path d="M12 17.5l4.2-5.2"/><circle cx="12" cy="17.5" r="1.3"/><path d="M6.6 11.8l1 .9M12 9v1.3M17.4 11.8l-1 .9"/>',
      one: 'More useful AI from every megawatt.',
      how: [
        'We design the building, the cooling and the network together, so power goes into AI work, not overhead.',
        'GPUs turn power into heat. We <b>capture that heat</b> instead of wasting it. In Calgary, Foundation sits inside a <b>district heating plant</b>, and its liquid-cooled racks feed a <b>heat exchanger</b> tied to the plant.',
        'We build <b>in phases</b>, so capacity grows with demand. Foundation runs 100 kW today, adds 2 MW in February 2027, and can reach 12 MW.'
      ],
      terms: [
        ['Liquid cooling', 'Cooling servers with liquid instead of air. It removes heat faster and makes the heat easier to reuse.'],
        ['Heat exchanger', 'A set of metal plates that moves heat from one liquid loop to another without mixing them.'],
        ['District heating', 'One central plant heating many buildings through underground pipes.'],
        ['Phased build', 'Adding capacity in steps inside the same site, only as it is needed.']
      ],
      cap: 'Power becomes AI work. The heat left over goes into a heating loop instead of the air.'
    }
  ];

  /* ---------- Hub ---------- */
  // desktop: a wide ring of five cards. phone: the same ring, drawn taller and narrower so it fits the screen
  var hub = document.getElementById('hub');
  var nodes = [], links = [], cur = -1;
  var mq = window.matchMedia('(max-width: 700px)');
  function buildHub() {
    var m = mq.matches;
    var VW = m ? 360 : 760, VH = m ? 422 : 470, cx = VW / 2, cy = m ? 222 : 235, rx = m ? 130 : 280, ry = m ? 168 : 168;
    var CW = m ? 104 : 176, CH = m ? 80 : 64;
    hub.setAttribute('viewBox', '0 0 ' + VW + ' ' + VH);
    hub.classList.toggle('hub--m', m);
    P.forEach(function (p, i) {
      var a = (-90 + i * 72) * Math.PI / 180;
      p.x = cx + rx * Math.cos(a); p.y = cy + ry * Math.sin(a);
    });
    var defs = '<defs><linearGradient id="hubg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16395e"/><stop offset="1" stop-color="#0d2136"/></linearGradient>' +
      '<filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0d2136" flood-opacity=".12"/></filter></defs>';
    hub.innerHTML = defs + '<ellipse class="ring" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="#e2eaf2" stroke-width="1.5" stroke-dasharray="2 8"/>';
    nodes = []; links = [];
    P.forEach(function (p) {
      var l = document.createElementNS(NS, 'path');
      l.setAttribute('d', 'M' + cx + ' ' + cy + ' L' + p.x + ' ' + p.y);
      l.setAttribute('class', 'spoke'); hub.appendChild(l); links.push(l);
    });
    var center = document.createElementNS(NS, 'g');
    center.innerHTML = m
      ? '<rect x="' + (cx - 70) + '" y="' + (cy - 40) + '" width="140" height="80" rx="6" fill="url(#hubg)" filter="url(#sh)"/>' +
        '<text class="center-t" x="' + cx + '" y="' + (cy - 5) + '" text-anchor="middle">simply</text><text class="center-t" x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle">silicon.</text>'
      : '<rect x="' + (cx - 104) + '" y="' + (cy - 44) + '" width="208" height="88" rx="6" fill="url(#hubg)" filter="url(#sh)"/>' +
        '<text class="center-t" x="' + cx + '" y="' + (cy + 9) + '" text-anchor="middle">simply silicon.</text>';
    hub.appendChild(center);
    P.forEach(function (p, i) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'pillar'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'Open ' + p.name); g.setAttribute('aria-expanded', 'false');
      var x = p.x - CW / 2, y = p.y - CH / 2;
      g.innerHTML = m
        ? '<rect class="bg" x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="5" filter="url(#sh)"/>' +
          '<rect class="ic-bg" x="' + (p.x - 18) + '" y="' + (y + 10) + '" width="36" height="36" rx="4"/>' +
          '<g class="ic" transform="translate(' + (p.x - 12) + ' ' + (y + 16) + ')">' + p.icon + '</g>' +
          '<text class="pt" x="' + p.x + '" y="' + (y + CH - 13) + '" text-anchor="middle">' + p.name + '</text>'
        : '<rect class="bg" x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="5" filter="url(#sh)"/>' +
          '<rect class="ic-bg" x="' + (x + 14) + '" y="' + (p.y - 20) + '" width="40" height="40" rx="4"/>' +
          '<g class="ic" transform="translate(' + (x + 22) + ' ' + (p.y - 12) + ')">' + p.icon + '</g>' +
          '<text class="pt" x="' + (x + 64) + '" y="' + (p.y + 6) + '">' + p.name + '</text>';
      g.addEventListener('click', function () { show(i, true); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i, true); } });
      hub.appendChild(g); nodes.push(g);
    });
    mark();
  }
  function mark() {
    nodes.forEach(function (g, k) { g.classList.toggle('on', k === cur); g.setAttribute('aria-expanded', String(k === cur)); });
    links.forEach(function (l, k) { l.classList.toggle('on', k === cur); });
  }
  buildHub();
  if (mq.addEventListener) mq.addEventListener('change', buildHub); else if (mq.addListener) mq.addListener(buildHub);

  /* ---------- Detail (closed until a piece is picked) ---------- */
  var detail = document.getElementById('detail');
  function show(i, scroll) {
    cur = (i + P.length) % P.length;
    var p = P[cur];
    detail.hidden = false;
    mark();
    document.getElementById('dOne').textContent = p.one;
    document.getElementById('dHow').innerHTML = p.how.map(function (h) { return '<p>' + h + '</p>'; }).join('');
    document.getElementById('dFig').innerHTML = FIG[p.id]() + '<figcaption>' + p.cap + '</figcaption>';
    document.getElementById('dNext').innerHTML = 'Next: ' + P[(cur + 1) % P.length].name + ' <span class="arrow" aria-hidden="true">→</span>';
    document.getElementById('dPrev').textContent = '← ' + P[(cur - 1 + P.length) % P.length].name;
    if (scroll) {
      var top = detail.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }
  document.getElementById('dNext').addEventListener('click', function () { show(cur + 1, true); });
  document.getElementById('dPrev').addEventListener('click', function () { show(cur - 1, true); });
})();

/* Investor logos: show a logo only once its file exists in assets/img/backers (svg, then png); otherwise keep the name */
(function () {
  document.querySelectorAll('.marquee-track li[data-logo]').forEach(function (li) {
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
      vel += (target - vel) * Math.min(1, dt * (Math.abs(vel - target) > speed * 2 ? 1.6 : 3));
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
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, lt: performance.now(), moved: false, v: 0, type: e.pointerType };
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
  });
  function end(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.moved) { suppress = true; setTimeout(function () { suppress = false; }, 0); vel = Math.max(-7000, Math.min(7000, drag.v * .8)); if (performance.now() - drag.lt > 120) vel = 0; }
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
