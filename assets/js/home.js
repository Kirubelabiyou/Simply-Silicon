/* Simply Silicon: home page (GPU racks and the how-it-works explainer) */
(function () {
  'use strict';

  // Hero GPU racks
  var racks = document.getElementById('racks');
  if (racks) {
    [['n','g','g','g','g','n','g','g','n'],['n','g','g','g','g','g','g','n','g','g'],['n','g','g','g','n','g','g','g','n']].forEach(function (units, r) {
      var rack = document.createElement('div');
      rack.className = 'rack';
      rack.innerHTML = '<div class="rack-head"><span>R0' + (r + 1) + '</span><span>GPU</span></div>';
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

  function cells() {
    // 12 MW drawn as 120 cells of 100 kW each. To scale.
    var s = '', i = 0;
    for (var r = 0; r < 10; r++) for (var c = 0; c < 12; c++) {
      var x = 24 + c * 26, y = 20 + r * 17;
      var cls = i === 0 ? 'fill="#4fb3f0"' : i < 20 ? 'fill="#fdf2de" stroke="#e79a17" stroke-width="1"' : 'fill="#f3f7fb" stroke="#c6d4e2" stroke-width="1"';
      s += '<rect x="' + x + '" y="' + y + '" width="22" height="13" ' + cls + (i === 0 ? ' class="dg-blink"' : '') + '/>';
      i++;
    }
    return s;
  }

  var P = [
    {
      id: 'power', name: 'Power', icon: 'M13 2 4 14h7l-1 8 9-12h-7z',
      one: 'We start where big power already exists: inside the city.',
      how: [
        'Most new data centres wait years for a grid connection. We skip that wait by using sites that already have one.',
        'Foundation sits in an existing <b>district heating plant</b> in downtown Calgary. It already has <b>14 MVA</b> of power, <b>two separate grid feeds</b> and <b>on-site generation</b>. If one source fails, another takes over.',
        'Using power that is already there is faster and wastes less than building a new plant. The site is also tied into a <b>district heating loop</b>, a network of pipes built to move heat around downtown. Heat is what GPUs make most.'
      ],
      terms: [
        ['MW (megawatt)', 'A measure of how much power a site can use at once. Foundation is planned for 12 MW of AI capacity.'],
        ['MVA', 'The size of an electrical connection. Foundation\'s base plant has 14 MVA.'],
        ['n+1 redundancy', 'One more of every critical part than you need. Any single part can fail and the site keeps running.'],
        ['Dual redundant grid feeds', 'Two separate power lines from the grid. If one goes down, the other still delivers power.'],
        ['Own-use power', 'Power a site already has for its own use. We turn it into compute instead of leaving it idle.'],
        ['District heating', 'One central plant heats many buildings through underground pipes.']
      ],
      cap: 'Two grid feeds and on-site generation feed the plant. n+1 means one spare of everything.',
      fig: function () {
        return '<svg viewBox="0 0 360 250" aria-hidden="true">' +
          '<rect class="dg-box" x="10" y="20" width="96" height="40"/><text class="dg-t" x="22" y="38">Grid feed A</text><text class="dg-s" x="22" y="52">Utility</text>' +
          '<rect class="dg-box" x="10" y="105" width="96" height="40"/><text class="dg-t" x="22" y="123">Grid feed B</text><text class="dg-s" x="22" y="137">Utility</text>' +
          '<rect class="dg-box" x="10" y="190" width="96" height="40"/><text class="dg-t" x="22" y="208">On-site gen</text><text class="dg-s" x="22" y="222">Backup</text>' +
          '<path class="dg-flow sky" d="M106 40 H150 V110 H190"/><path class="dg-flow sky" d="M106 125 H190"/><path class="dg-flow sky" d="M106 210 H150 V140 H190" style="opacity:.6"/>' +
          '<rect class="dg-box on" x="190" y="85" width="110" height="80"/><text class="dg-t" x="202" y="110">Base plant</text><text class="dg-s" x="202" y="126">14 MVA · n+1</text><text class="dg-s" x="202" y="142">District heating</text>' +
          '<path class="dg-flow sky" d="M300 125 H350"/><text class="dg-s" x="300" y="182">→ GPUs</text>' +
          '</svg>';
      }
    },
    {
      id: 'compute', name: 'Compute', icon: 'M4 5h16v14H4zM8 9h8M8 13h8M8 17h4',
      one: 'Rooms of GPU servers that run AI and answer in real time.',
      how: [
        '<b>GPUs</b> are chips that do many calculations at the same time. That is exactly what AI models need.',
        'We run them <b>bare metal</b>. The customer gets the physical machine itself, not a slice shared with strangers through a cloud layer.',
        'Foundation is built for <b>inference</b>: the moment an AI model is used to answer a question, write something or make a decision. <b>Phase 1 runs 100 kW today.</b> Phase 2 adds 2 MW in February 2027, and the plant can hold 12 MW in total.'
      ],
      terms: [
        ['GPU', 'Graphics processing unit. A chip that handles thousands of small calculations at once, which makes it the workhorse of AI.'],
        ['Inference', 'Using a trained AI model to produce an answer. Training builds the model. Inference is what users feel every time they ask it something.'],
        ['Bare metal', 'A physical server dedicated to one customer, with no shared layer in between. More control, more predictable speed.'],
        ['kW and MW', '1,000 kilowatts make 1 megawatt. Phase 1 is 100 kW. The full site is 12 MW, 120 times more.'],
        ['Phased build', 'The site grows in steps inside the same plant, so capacity comes online without waiting for the full build.']
      ],
      cap: 'Each square is 100 kW. Blue: Phase 1, online. Amber: Phase 2 (2 MW). Grey: Phase 3 (12 MW).',
      fig: function () { return '<svg viewBox="0 0 360 200" aria-hidden="true">' + cells() + '</svg>'; }
    },
    {
      id: 'fiber', name: 'Fiber', icon: 'M3 12c4-6 8 6 12 0s4-4 6-2M3 18c4-6 8 6 12 0',
      one: 'Our own cables, under the street, to the buildings that use us.',
      how: [
        'Foundation connects to <b>25+ downtown buildings</b> over <b>7 km of private fiber</b>.',
        'Data does not cross the shared public internet or <b>common carrier networks</b> to reach the servers. It stays on our own glass.',
        'Short, direct paths mean <b>low latency</b>. Answers arrive fast, and just as important, they arrive at a steady, predictable speed.'
      ],
      terms: [
        ['Fiber optic cable', 'Thin strands of glass that carry data as light. The fastest way to move data between buildings.'],
        ['Private fiber', 'Fiber used only by us and our customers, not shared with the public.'],
        ['Latency', 'The delay between asking and getting an answer. Lower is better, and it matters most for live, real-time AI.'],
        ['Latency SLA', 'A written promise on the maximum delay a customer will see.'],
        ['Common carrier network', 'The shared telecom networks everyone else uses. We keep sensitive traffic off them.']
      ],
      cap: '7 km of private fiber from Foundation to 25+ connected buildings.',
      fig: function () {
        var b = [[40, 40], [150, 24], [290, 36], [320, 130], [290, 214], [170, 226], [40, 210], [18, 124]];
        var s = '<svg viewBox="0 0 360 250" aria-hidden="true">';
        b.forEach(function (p, i) { s += '<path class="dg-flow amber" style="animation-delay:-' + (i * .2) + 's" d="M180 125 L' + p[0] + ' ' + p[1] + '"/>'; });
        b.forEach(function (p) { s += '<rect class="dg-box" x="' + (p[0] - 12) + '" y="' + (p[1] - 12) + '" width="24" height="24"/>'; });
        s += '<rect class="dg-box on" x="146" y="103" width="68" height="44"/><text class="dg-t" x="154" y="122">Foundation</text><text class="dg-s" x="154" y="137">7 km fiber</text></svg>';
        return s;
      }
    },
    {
      id: 'security', name: 'Security', icon: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z',
      one: 'Physically separate from the public internet.',
      how: [
        'An <b>air-gapped network</b> has no connection to the public internet. There is no route in for someone outside.',
        'This is <b>physical separation</b>, not just software rules. A firewall can be misconfigured. A missing cable cannot be hacked.',
        'It suits <b>regulated enterprise</b> like banks, utilities and energy companies, <b>high-security workloads</b>, and AI models too capable for the open internet.'
      ],
      terms: [
        ['Air gap', 'A network with no physical link to outside networks. Data can only move where cables actually run.'],
        ['Physical separation', 'Security that comes from how things are wired and where they sit, not only from software.'],
        ['Regulated enterprise', 'Companies bound by strict rules on data, like banks, utilities and energy producers.'],
        ['High-security workload', 'Computing work where a leak or intrusion would be unacceptable.']
      ],
      cap: 'No cable, no path. The air gap keeps the public internet out.',
      fig: function () {
        return '<svg viewBox="0 0 360 230" aria-hidden="true">' +
          '<rect class="dg-box" x="10" y="60" width="120" height="110" stroke-dasharray="4 4"/><text class="dg-t" x="24" y="110">Public</text><text class="dg-t" x="24" y="126">internet</text>' +
          '<path class="dg-line" d="M130 115 H160"/><path class="dg-line" d="M196 115 H226"/>' +
          '<path d="M165 100 L191 130 M191 100 L165 130" stroke="#e8513c" stroke-width="2.5"/><text class="dg-s" x="154" y="152">Air gap</text>' +
          '<rect class="dg-box on" x="226" y="40" width="124" height="150"/><text class="dg-t" x="238" y="62">Simply Silicon</text><text class="dg-s" x="238" y="77">Air-gapped</text>' +
          '<rect class="dg-box" x="240" y="92" width="96" height="16"/><rect class="dg-box" x="240" y="114" width="96" height="16"/><rect class="dg-box" x="240" y="136" width="96" height="16"/>' +
          '<circle fill="#1673c8" class="dg-blink" cx="326" cy="100" r="3"/><circle fill="#1673c8" class="dg-blink" cx="326" cy="122" r="3" style="animation-delay:-.6s"/><circle fill="#1673c8" class="dg-blink" cx="326" cy="144" r="3" style="animation-delay:-1.1s"/>' +
          '<text class="dg-s" x="238" y="176">Private fiber in</text></svg>';
      }
    },
    {
      id: 'engineering', name: 'Engineering', icon: 'M4 20h16M6 20V10l6-5 6 5v10M10 20v-5h4v5',
      one: 'We rebuilt the data centre and its network from the ground up.',
      how: [
        'Instead of a huge new campus far from users, we convert <b>latent utility infrastructure</b> in the city into compute. That is faster than conventional developers.',
        'We build <b>one phase at a time</b> inside existing plants, and design the network and the building together, not as separate projects.',
        'Every site is built to link to the next. Foundation is the <b>first node</b> in a global urban AI network: <b>15+ sites</b> in the pipeline, <b>200+ MW</b> planned, across <b>12+ major cities</b>.'
      ],
      terms: [
        ['Latent infrastructure', 'Power, buildings and pipes that already exist but are underused.'],
        ['Metro site', 'A data centre inside a city, close to the people and companies using it.'],
        ['Node', 'One site in the network. Foundation in Calgary is node one.'],
        ['Pipeline', 'Sites being evaluated or prepared to join the network.']
      ],
      cap: 'Foundation is node one. More city sites link in over time.',
      fig: function () {
        var n = [[60, 70, 'on'], [150, 50, 'dev'], [250, 80, 'dev'], [310, 160, 'soon'], [200, 190, 'soon'], [90, 180, 'soon']];
        var s = '<svg viewBox="0 0 360 240" aria-hidden="true">';
        for (var i = 1; i < n.length; i++) s += '<path class="' + (n[i][2] === 'dev' ? 'dg-flow amber' : 'dg-line') + '" ' + (n[i][2] === 'soon' ? 'stroke-dasharray="2 5"' : '') + ' d="M' + n[0][0] + ' ' + n[0][1] + ' L' + n[i][0] + ' ' + n[i][1] + '"/>';
        n.forEach(function (p, i) {
          if (p[2] === 'on') s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="14" fill="#4fb3f033"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="#4fb3f0" stroke="#fff" stroke-width="2"/>';
          else if (p[2] === 'dev') s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="#e79a17"/>';
          else s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="#fff" stroke="#8fa2b8" stroke-width="1.5"/>';
        });
        s += '<text class="dg-t" x="40" y="102">Calgary</text><text class="dg-s" x="40" y="116">Node 01 · online</text></svg>';
        return s;
      }
    }
  ];

  var cur = 0;
  var NS = 'http://www.w3.org/2000/svg';
  var hub = document.getElementById('hub');
  var tabs = document.getElementById('tabs');

  // Hub diagram
  var cx = 320, cy = 220, rx = 240, ry = 160;
  var spokes = [], pills = [], tabBtns = [];
  P.forEach(function (p, i) {
    var a = (-90 + i * 72) * Math.PI / 180;
    p.x = cx + rx * Math.cos(a); p.y = cy + ry * Math.sin(a);
    var l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', cx); l.setAttribute('y1', cy); l.setAttribute('x2', p.x); l.setAttribute('y2', p.y);
    l.setAttribute('class', 'spoke'); hub.appendChild(l); spokes.push(l);
  });
  var center = document.createElementNS(NS, 'g');
  center.innerHTML = '<circle class="center-c" cx="' + cx + '" cy="' + cy + '" r="82"/>' +
    '<text class="center-t" x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle">Simply</text>' +
    '<text class="center-t" x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle">Silicon</text>' +
    '<text class="center-s" x="' + cx + '" y="' + (cy + 44) + '" text-anchor="middle">5 core pieces</text>';
  hub.appendChild(center);
  P.forEach(function (p, i) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'pillar'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
    g.setAttribute('aria-label', 'Open ' + p.name);
    g.innerHTML = '<circle class="bg" cx="' + p.x + '" cy="' + p.y + '" r="54"/>' +
      '<g transform="translate(' + (p.x - 12) + ' ' + (p.y - 30) + ')"><path class="ic" d="' + p.icon + '"/></g>' +
      '<text class="pt" x="' + p.x + '" y="' + (p.y + 14) + '" text-anchor="middle">' + p.name + '</text>' +
      '<text class="pn" x="' + p.x + '" y="' + (p.y + 32) + '" text-anchor="middle">0' + (i + 1) + '</text>';
    g.addEventListener('click', function () { show(i, true); });
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i, true); } });
    hub.appendChild(g); pills.push(g);

    var t = document.createElement('button');
    t.type = 'button'; t.setAttribute('role', 'tab'); t.textContent = '0' + (i + 1) + ' ' + p.name;
    t.addEventListener('click', function () { show(i, false); });
    tabs.appendChild(t); tabBtns.push(t);
  });

  function show(i, scroll) {
    cur = (i + P.length) % P.length;
    var p = P[cur];
    pills.forEach(function (g, k) { g.classList.toggle('on', k === cur); });
    spokes.forEach(function (l, k) { l.classList.toggle('on', k === cur); });
    tabBtns.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === cur)); });
    document.getElementById('dKicker').textContent = '0' + (cur + 1) + ' · ' + p.name;
    document.getElementById('dOne').textContent = p.one;
    document.getElementById('dHow').innerHTML = p.how.map(function (h) { return '<p>' + h + '</p>'; }).join('');
    var terms = document.getElementById('dTerms');
    terms.innerHTML = '';
    p.terms.forEach(function (t, k) {
      var d = document.createElement('div'); d.className = 'term';
      var id = 'term-' + p.id + '-' + k;
      d.innerHTML = '<button type="button" aria-expanded="false" aria-controls="' + id + '"><span class="tn">' + t[0] + '</span><span class="tx" aria-hidden="true">+</span></button><p class="td" id="' + id + '" hidden>' + t[1] + '</p>';
      var b = d.querySelector('button'), body = d.querySelector('.td');
      b.addEventListener('click', function () { var o = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', String(!o)); body.hidden = o; });
      terms.appendChild(d);
    });
    document.getElementById('dFig').innerHTML = p.fig() + '<figcaption>' + p.cap + '</figcaption>';
    document.getElementById('dNext').innerHTML = 'Next: ' + P[(cur + 1) % P.length].name + ' <span class="arrow" aria-hidden="true">→</span>';
    document.getElementById('dPrev').textContent = '← ' + P[(cur - 1 + P.length) % P.length].name;
    var tb = tabBtns[cur]; tabs.scrollLeft = tb.offsetLeft - (tabs.clientWidth - tb.offsetWidth) / 2;
    if (scroll) { var tt = document.getElementById('tabs').getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top: tt, behavior: 'smooth' }); }
    
  }
  document.getElementById('dNext').addEventListener('click', function () { show(cur + 1, true); });
  document.getElementById('dPrev').addEventListener('click', function () { show(cur - 1, true); });

  var start = 0;
  
  show(start, false);
})();
