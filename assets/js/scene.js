/* Simply Silicon: Foundation scene.
   Downtown Calgary in 3D with Foundation's private fiber on the real streets
   (routes and buildings from gosimply.ai's published network map), and the plant itself,
   modelled after the published plant model, which you can zoom into phase by phase.
   Usage: mountScene(element, { compact: false }) */
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';

const COL = {
  sky: 0xe9f1f8, ground: 0xeef2f6, road: 0xd3dbe4, roadLine: 0xffffff, block: 0xf7f9fb,
  bldg: 0xe4eaf0, bldgTop: 0xf3f6f9, conn: 0xcfe6f7, connEdge: 0x4db2ef, river: 0xbfdcf1,
  fiber: 0x2f9ae6, fiberGlow: 0x7fd0ff,
  glass: 0x9fd0ef, mullion: 0x55606d, roof: 0x2d333b, steel: 0xaeb7c1, stainless: 0xd5dbe1, copper: 0xc27a4a,
  boiler: 0xc8423a, valve: 0x2f6fd6, rack: 0x1b2230, led: 0x4fb3f0, fan: 0x36df8c,
  cyan: 0x5ee5ff, cyanBright: 0x7fd6f5, blue: 0x3d7bff, amber: 0xffb45e, heat: 0xe8513c
};
const S = 4.2; // metres per plant-model unit (hall is ~60 m wide, matching the site footprint)

export function mountScene(host, opts = {}) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAL = window.SS_CALGARY;
  host.innerHTML = '';
  const loading = el('div', 'scene-loading', 'Loading 3D view');
  host.appendChild(loading);

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const labelLayer = el('div', 'scene-labels'); host.appendChild(labelLayer);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.sky);
  scene.fog = new THREE.Fog(COL.sky, 1600, 3400);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 9000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = 25; controls.maxDistance = 2600;
  controls.maxPolarAngle = Math.PI * .47;
  controls.screenSpacePanning = false;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdd6e0, 1.35));
  const sun = new THREE.DirectionalLight(0xfff3e2, 2.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .6;
  scene.add(sun); scene.add(sun.target);
  function shadowAround(cx, cz, half) {
    sun.position.set(cx - half * .9, half * 1.6, cz - half * .5);
    sun.target.position.set(cx, 0, cz);
    const c = sun.shadow.camera; c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 1; c.far = half * 5; c.updateProjectionMatrix();
  }

  const tick = [];
  const mats = {};
  const mat = (k, color, o = {}) => (mats[k] = mats[k] || new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: .05, ...o }));

  /* ---------- projection: metres from Foundation, x = east, z = south ---------- */
  const LNG0 = CAL.foundation.coordinate[0], LAT0 = CAL.foundation.coordinate[1];
  const KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KY = 110574;
  const P = (lng, lat) => [(lng - LNG0) * KX, -(lat - LAT0) * KY];

  /* ---------- street grid, derived from the fiber routes (which follow real streets) ---------- */
  const W0 = -114.0738, E0 = -114.0452;
  function fitAve(pts) { // least-squares lat = a + b*lng
    const n = pts.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const b = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), a = (sy - b * sx) / n;
    return lng => a + b * lng;
  }
  const route = id => CAL.routes.find(r => r.id === id).c;
  const ave5 = fitAve(route('fifth-avenue-spine'));
  const ave6 = fitAve(route('sixth-avenue-east').slice(0, 5));
  const ave8 = fitAve(route('eighth-avenue-west').concat(route('eighth-avenue-east')));
  const ave9 = fitAve(route('ninth-avenue-trunk'));
  const ave7 = lng => (ave6(lng) + ave8(lng)) / 2;
  const step = ave8(-114.055) - ave9(-114.055);
  const ave4 = lng => ave5(lng) + (ave5(lng) - ave6(lng));
  const ave3 = lng => ave4(lng) + (ave5(lng) - ave6(lng));
  const ave10 = lng => ave9(lng) - step * 1.1, ave11 = lng => ave10(lng) - step, ave12 = lng => ave11(lng) - step;
  const AVES = [['3 Ave', ave3], ['4 Ave', ave4], ['5 Ave', ave5], ['6 Ave', ave6], ['7 Ave', ave7], ['8 Ave', ave8], ['9 Ave', ave9], ['10 Ave', ave10], ['11 Ave', ave11], ['12 Ave', ave12]];
  // street spacing read from the corners along 5 Ave; Centre St and 4 St SE anchor the names
  const STREETS = [-114.0726, -114.0702, -114.0678, -114.0653, -114.0628, -114.0604, -114.0579, -114.0555, -114.0531, -114.0507, -114.0484, -114.0460];
  const STREET_NAME = { '-114.0628': 'Centre St', '-114.0531': '4 St SE' };
  // Bow River, approximate course along the north edge of downtown
  const RIVER = [[-114.0760, 51.0538], [-114.0680, 51.0546], [-114.0620, 51.0539], [-114.0570, 51.0526], [-114.0530, 51.0510], [-114.0495, 51.0499], [-114.0450, 51.0493]];
  const riverLatAt = lng => { for (let i = 1; i < RIVER.length; i++) if (lng <= RIVER[i][0]) { const a = RIVER[i - 1], b = RIVER[i], t = (lng - a[0]) / (b[0] - a[0]); return a[1] + t * (b[1] - a[1]); } return RIVER[RIVER.length - 1][1]; };
  const RIVER_HALF = 0.00042; // ~46 m each side

  const city = new THREE.Group(); scene.add(city);
  {
    // ground with an opening over the plant basement
    const gs = new THREE.Shape(); gs.moveTo(-3000, -3000); gs.lineTo(3000, -3000); gs.lineTo(3000, 3000); gs.lineTo(-3000, 3000); gs.lineTo(-3000, -3000);
    const hole = new THREE.Path(); const b = { x0: -4.5 * S, x1: 6.85 * S, z0: -2.85 * S, z1: 2.85 * S };
    hole.moveTo(b.x0, b.z0); hole.lineTo(b.x0, b.z1); hole.lineTo(b.x1, b.z1); hole.lineTo(b.x1, b.z0); hole.lineTo(b.x0, b.z0); gs.holes.push(hole);
    const ground = new THREE.Mesh(new THREE.ShapeGeometry(gs).rotateX(Math.PI / 2), mat('ground', COL.ground, { roughness: 1, side: THREE.DoubleSide }));
    ground.receiveShadow = true; city.add(ground);
    // river
    const top = RIVER.map(([lng, lat]) => P(lng, lat + RIVER_HALF)), bot = RIVER.map(([lng, lat]) => P(lng, lat - RIVER_HALF)).reverse();
    const rs = new THREE.Shape(); top.concat(bot).forEach((p, i) => i ? rs.lineTo(p[0], p[1]) : rs.moveTo(p[0], p[1]));
    const river = new THREE.Mesh(new THREE.ShapeGeometry(rs).rotateX(Math.PI / 2), mat('river', COL.river, { roughness: .25, metalness: .1, side: THREE.DoubleSide }));
    river.position.y = .15; river.receiveShadow = true; city.add(river);
    // roads
    const roadM = mat('road', COL.road, { roughness: .95 });
    const lineM = new THREE.MeshBasicMaterial({ color: COL.roadLine });
    function road(a, b, w) {
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L, w).rotateX(-Math.PI / 2), roadM);
      m.position.set((a[0] + b[0]) / 2, .3, (a[1] + b[1]) / 2); m.rotation.y = -Math.atan2(dz, dx); m.receiveShadow = true; city.add(m);
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(L, .6).rotateX(-Math.PI / 2), lineM);
      ln.position.set(m.position.x, .35, m.position.z); ln.rotation.y = m.rotation.y; city.add(ln);
    }
    AVES.forEach(([, f]) => {
      const pts = []; for (let lng = W0; lng <= E0 + 1e-9; lng += (E0 - W0) / 20) { const lat = f(lng); if (Math.abs(lat - riverLatAt(lng)) > RIVER_HALF + .0002 && lat < riverLatAt(lng)) pts.push(P(lng, lat)); else pts.push(null); }
      for (let i = 1; i < pts.length; i++) if (pts[i - 1] && pts[i]) road(pts[i - 1], pts[i], 18);
    });
    STREETS.forEach(lng => {
      const north = Math.min(ave3(lng), riverLatAt(lng) - RIVER_HALF - .0002), south = ave12(lng);
      road(P(lng, south), P(lng, north), 16);
    });
  }

  /* ---------- buildings ---------- */
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const eps = CAL.endpoints.map(e => ({ ...e, p: P(e.c[0], e.c[1]) }));
  const avoid = eps.map(e => e.p);
  const known = { telus: 222, intact: 110, andrew: 40, 'bow-valley': 45, arts: 42, municipal: 50, library: 30, hilton: 45, 'st-louis': 14, hillier: 12, 'music-centre': 30, platform: 24, atc: 28, pulse: 60, fuse: 55, 'river-house': 45, simmons: 12, verve: 95, murdoch: 40, salvation: 20, parkade: 22 };
  {
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, .5, 0);
    const PAL = [0xe6ecf2, 0xdfe7ef, 0xeef1f4, 0xd6e1ec, 0xe9edf1, 0xd9e6f2];
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55, metalness: .1 }), 600);
    im.castShadow = true; im.receiveShadow = true;
    let n = 0; const m4 = new THREE.Matrix4();
    const lats = AVES.map(a => a[1]);
    for (let si = 0; si < STREETS.length - 1; si++) {
      for (let ai = 0; ai < lats.length - 1; ai++) {
        const lngA = STREETS[si], lngB = STREETS[si + 1];
        const mid = (lngA + lngB) / 2;
        const latN = lats[ai](mid), latS = lats[ai + 1](mid);
        if (latN > riverLatAt(mid) - RIVER_HALF - .0002) continue;
        const pA = P(lngA, latN), pB = P(lngB, latS);
        const x0 = pA[0] + 12, x1 = pB[0] - 12, z0 = pA[1] + 13, z1 = pB[1] - 13;
        if (x1 - x0 < 20 || z1 - z0 < 20) continue;
        const core = mid < -114.0595 && latS > ave9(mid);
        const south = latN < ave9(mid) - .0001;
        const cols = 2, rows = 2;
        for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
          if (rnd() < .18) continue;
          const bw = (x1 - x0) / cols - 6, bd = (z1 - z0) / rows - 6;
          const cx = x0 + (c + .5) * (x1 - x0) / cols, cz = z0 + (r + .5) * (z1 - z0) / rows;
          if (avoid.some(a => Math.abs(a[0] - cx) < bw / 2 + 22 && Math.abs(a[1] - cz) < bd / 2 + 22)) continue;
          if (Math.abs(cx - 5) < bw / 2 + 60 && Math.abs(cz) < bd / 2 + 45) continue;
          const h = core ? 30 + rnd() * rnd() * 150 : south ? 8 + rnd() * 26 : 12 + rnd() * 45;
          m4.compose(new THREE.Vector3(cx, 0, cz), new THREE.Quaternion(), new THREE.Vector3(bw * (.75 + rnd() * .25), h, bd * (.75 + rnd() * .25)));
          im.setMatrixAt(n, m4); im.setColorAt(n++, new THREE.Color(PAL[Math.floor(rnd() * PAL.length)]));
        }
      }
    }
    im.count = n; city.add(im);
    // connected buildings: tinted, with a light cap
    const connM = mat('conn', COL.conn, { roughness: .35, metalness: .15 });
    const edgeM = new THREE.LineBasicMaterial({ color: COL.connEdge, transparent: true, opacity: .9 });
    eps.forEach(e => {
      if (e.generic) return;
      const h = known[e.id] || 30;
      const w = 26, d = 24;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), connM);
      b.position.set(e.p[0], h / 2, e.p[1]); b.castShadow = true; b.receiveShadow = true; city.add(b);
      const ed = new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), edgeM); b.add(ed);
      e.top = h;
    });
  }

  /* ---------- fiber ---------- */
  const fiber = new THREE.Group(); scene.add(fiber);
  {
    const glowTex = radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    const tubeM = new THREE.MeshStandardMaterial({ color: COL.fiber, emissive: COL.fiber, emissiveIntensity: .55, roughness: .4 });
    const trunkM = new THREE.MeshStandardMaterial({ color: 0x1b6fb8, emissive: 0x1b6fb8, emissiveIntensity: .5, roughness: .4 });
    CAL.routes.forEach(r => {
      const pts = r.c.map(([lng, lat]) => { const p = P(lng, lat); return new THREE.Vector3(p[0], 1.4, p[1]); });
      const curve = new THREE.CurvePath();
      for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > .1) curve.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
      if (!curve.curves.length) return;
      const L = curve.getLength();
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, Math.round(L / 6)), r.trunk ? 1.6 : 1.1, 6, false), r.trunk ? trunkM : tubeM);
      fiber.add(tube);
      if (!reduce) {
        const count = Math.max(1, Math.round(L / 180));
        for (let k = 0; k < count; k++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: COL.fiberGlow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
          s.scale.set(22, 22, 1); fiber.add(s);
          const off = k / count, speed = 60 / L;
          tick.push(t => { const u = (t * speed + off) % 1; s.position.copy(curve.getPointAt(u)); s.position.y = 3; });
        }
      }
    });
    // endpoint markers
    const pinM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.fiber, emissiveIntensity: .25 });
    eps.forEach(e => {
      const y = (e.top || 0) + 2;
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(e.generic ? 4 : 5.5, e.generic ? 4 : 5.5, 2, 20), pinM);
      pin.position.set(e.p[0], y, e.p[1]); fiber.add(pin);
      const ring = new THREE.Mesh(new THREE.RingGeometry(7, 9.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COL.fiber, transparent: true, opacity: .8, side: THREE.DoubleSide }));
      ring.position.set(e.p[0], y + 1.1, e.p[1]); fiber.add(ring);
      if (!e.generic && e.top) { const riser = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, e.top, 6), tubeM); riser.position.set(e.p[0] + 13.2, e.top / 2, e.p[1]); fiber.add(riser); }
    });
  }

  /* ---------- the plant ---------- */
  const plant = buildPlant(mat, tick);
  plant.root.scale.setScalar(S);
  scene.add(plant.root);
  plant.root.traverse(o => { if (o.isPointLight) { o.distance *= S; o.intensity *= S * S; } });

  /* ---------- labels (screen space, never overlapping) ---------- */
  const labels = [];
  function addLabel(text, pos, cls, modes) { const d = el('div', 's-lbl ' + (cls || ''), text); labelLayer.appendChild(d); labels.push({ d, pos: new THREE.Vector3(...pos), modes, w: 0 }); }
  addLabel('Foundation', [0, 26, 0], 'main', ['net']);
  eps.forEach(e => { if (!e.generic) addLabel(e.name, [e.p[0], (e.top || 0) + 6, e.p[1]], '', ['net']); });
  AVES.slice(2, 7).forEach(([name, f]) => { const p = P(-114.0715, f(-114.0715)); addLabel(name, [p[0], 1, p[1]], 'street', ['net']); });
  Object.keys(STREET_NAME).forEach(k => { const lng = +k; const lat = (ave9(lng) + ave10(lng)) / 2 - .0006; const p = P(lng, lat); addLabel(STREET_NAME[k], [p[0], 1, p[1]], 'street', ['net']); });
  { const p = P(-114.0655, riverLatAt(-114.0655)); addLabel('Bow River', [p[0], 1, p[1]], 'street', ['net']); }
  const tmp = new THREE.Vector3();
  function placeLabels() {
    const W = host.clientWidth, H = host.clientHeight, boxes = [];
    const order = labels.slice().sort((a, b) => (b.d.classList.contains('main') - a.d.classList.contains('main')));
    order.forEach(l => {
      if (!l.modes.includes(mode)) { l.d.style.opacity = 0; return; }
      tmp.copy(l.pos).project(camera);
      const x = (tmp.x + 1) / 2 * W, y = (1 - tmp.y) / 2 * H;
      const w = l.w || (l.w = l.d.offsetWidth || 80), h = 24;
      const street = l.d.classList.contains('street');
      const bx = { x: x - w / 2, y: street ? y - h / 2 : y - h - 10, w, h };
      const off = tmp.z > 1 || x < -20 || x > W + 20 || y < 0 || y > H;
      const hit = boxes.some(o => bx.x < o.x + o.w + 4 && bx.x + bx.w + 4 > o.x && bx.y < o.y + o.h + 2 && bx.y + bx.h + 2 > o.y);
      const tooFar = !street && !l.d.classList.contains('main') && camera.position.distanceTo(l.pos) > 1900;
      if (off || hit || tooFar) { l.d.style.opacity = 0; return; }
      boxes.push(bx);
      l.d.style.opacity = 1;
      l.d.style.transform = 'translate(' + (x - w / 2).toFixed(1) + 'px,' + (street ? y - h / 2 : y - h - 6).toFixed(1) + 'px)';
    });
  }

  /* ---------- UI ---------- */
  const card = el('div', 'scene-card'); host.appendChild(card);
  const ui = el('div', 'scene-ui'); host.appendChild(ui);
  const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'View'); ui.appendChild(seg);
  const hint = el('span', 'scene-hint', 'Drag to rotate · pinch or scroll to zoom'); ui.appendChild(hint);
  const VIEWS = {
    net: { name: 'Fiber network', title: 'Foundation · Calgary', chip: ['chip--live', 'dot--live', 'Online'],
      text: 'Our first site, in a district heating plant downtown. Private fiber runs under the streets to 25+ connected buildings.',
      kv: [['12 MW', 'AI capacity at full build'], ['100 kW', 'Online now'], ['7 km', 'Private fiber'], ['25+', 'Connected buildings']],
      cam: [520, 780, 1180], tgt: [-330, 0, -210], show: [], floor: true, roof: true },
    1: { name: 'Phase 1', title: 'Phase 1', chip: ['chip--live', 'dot--live', 'Online'], text: 'Ground floor. 100 kW of air-cooled GPU racks, running now.',
      cam: [-18, 34, -64], tgt: [-6, 4, 0], show: ['p1'], floor: true, roof: false },
    2: { name: 'Phase 2', title: 'Phase 2', chip: ['chip--dev', 'dot--dev', 'Feb 2027'], text: '2 MW in the basement. Liquid-cooled racks and a plate heat exchanger tied to the plant.',
      cam: [12, 62, -36], tgt: [5, -7, 1], show: ['p1', 'p2'], floor: false, roof: false },
    3: { name: 'Phase 3', title: 'Phase 3', chip: ['chip--soon', 'dot--soon', 'Full build'], text: 'The full 12 MW site. Rooftop dry coolers and more liquid-cooled racks across the plant.',
      cam: [62, 64, -70], tgt: [6, 10, 0], show: ['p1', 'p2', 'p3'], floor: true, roof: true }
  };
  const keys = opts.compact ? ['net', 1, 2, 3] : ['net', 1, 2, 3];
  keys.forEach(k => {
    const b = el('button', '', k === 'net' ? 'Network' : VIEWS[k].name); b.type = 'button'; b.dataset.v = k;
    b.addEventListener('click', () => setView(k)); seg.appendChild(b);
  });
  let mode = 'net', camAnim = null;
  function setView(k, instant) {
    const V = VIEWS[k]; mode = k === 'net' ? 'net' : 'phase';
    ['p1', 'p2', 'p3'].forEach(g => { plant.groups[g].visible = V.show.includes(g); });
    plant.groups.floorFront.visible = V.floor; plant.groups.roof.visible = V.roof;
    fiber.visible = k === 'net' || k === 3;
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(k))));
    card.innerHTML = '<div class="t"><b>' + V.title + '</b><span class="chip ' + V.chip[0] + '"><i class="dot ' + V.chip[1] + '"></i>' + V.chip[2] + '</span></div><p>' + V.text + '</p>' +
      (V.kv ? '<div class="kv">' + V.kv.map(x => '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('') + '</div>' : '') +
      (opts.link && k === 'net' ? '<a class="btn btn--primary btn--sm" style="margin-top:12px;width:100%" href="' + opts.link + '">Open Foundation</a>' : '');
    if (mode === 'net') shadowAround(-300, -200, 1100); else shadowAround(0, 0, 90);
    const phone = host.clientWidth < 700;
    const s = phone ? (k === 'net' ? 1.35 : 1.55) : 1;
    const tp = new THREE.Vector3(...V.tgt), cp = new THREE.Vector3(...V.cam).sub(tp).multiplyScalar(s).add(tp);
    if (instant || reduce) { camera.position.copy(cp); controls.target.copy(tp); controls.update(); return; }
    camAnim = { t0: performance.now(), fp: camera.position.clone(), ft: controls.target.clone(), cp, tp, ms: 1600 };
  }
  controls.addEventListener('start', () => { camAnim = null; });

  function size() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < 700 ? 48 : 38; camera.updateProjectionMatrix();
  }
  const ro = 'ResizeObserver' in window ? new ResizeObserver(size) : null;
  if (ro) ro.observe(host); else window.addEventListener('resize', size);
  size();
  setView('net', true);
  loading.remove();

  let visible = true, alive = true;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }) : null;
  if (io) io.observe(host);
  const clock = new THREE.Clock();
  (function loop() {
    if (!alive) return;
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = clock.getElapsedTime();
    if (!reduce) tick.forEach(f => f(t));
    if (camAnim) {
      const u = Math.min(1, (performance.now() - camAnim.t0) / camAnim.ms), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      camera.position.lerpVectors(camAnim.fp, camAnim.cp, e);
      controls.target.lerpVectors(camAnim.ft, camAnim.tp, e);
      if (u >= 1) camAnim = null;
    }
    controls.update();
    renderer.render(scene, camera);
    placeLabels();
  })();

  return {
    setView,
    destroy() { alive = false; if (ro) ro.disconnect(); if (io) io.disconnect(); controls.dispose(); renderer.dispose(); host.innerHTML = ''; }
  };
}

function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text) d.textContent = text; return d; }
function radial(a, b) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, a); r.addColorStop(1, b); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/* ---------- Plant model (units; scaled into metres by the caller) ---------- */
function buildPlant(mat, tick) {
  const root = new THREE.Group();
  const groups = { base: new THREE.Group(), p1: new THREE.Group(), p2: new THREE.Group(), p3: new THREE.Group(), roof: new THREE.Group(), floorFront: new THREE.Group() };
  Object.values(groups).forEach(g => root.add(g));
  const HALL = { w: -5.8, e: 8.45, f: -3.45, r: 3.3, R: 2.7, H: 3.2 };
  const BASE = { x0: -4.5, x1: 6.85, z0: -2.85, z1: 2.85, depth: 2.3 };
  function box(w, h, d, m, x = 0, y = 0, z = 0, parent) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y + h / 2, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b;
  }
  function cyl(r, h, m, x, y, z, parent, seg = 24) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
    c.position.set(x, y + h / 2, z); c.castShadow = true; c.receiveShadow = true; parent.add(c); return c;
  }
  function pipe(points, r, m, parent) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0);
    const t = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), r, 10, false), m);
    t.castShadow = true; parent.add(t); return t;
  }
  function hallShape(inset = 0) {
    const { w, e, f, r, R } = HALL;
    const s = new THREE.Shape();
    const W0 = w + inset, E0 = e - inset, F0 = f + inset, R0 = r - inset, RR = R - inset;
    s.moveTo(W0, R0); s.lineTo(W0, F0 + RR); s.absarc(W0 + RR, F0 + RR, RR, Math.PI, Math.PI * 1.5, false);
    s.lineTo(E0 - RR, F0); s.absarc(E0 - RR, F0 + RR, RR, Math.PI * 1.5, Math.PI * 2, false);
    s.lineTo(E0, R0); s.lineTo(W0, R0);
    return s;
  }
  const B = groups.base;
  // site pad and service yard
  box(16.5, .08, 9.6, mat('pad0', 0xe6ebf0), 1.3, 0, -.1, B).castShadow = false;
  box(8.4, .1, 5.6, mat('yard', 0xd8dde3), 9.8, 0, 6.2, B).castShadow = false;
  // glass hall
  {
    const pts = hallShape().getPoints(24);
    const edge = pts.slice(0, pts.length - 1), ribbon = [];
    for (let i = 0; i < edge.length; i++) { if (i > 0 && edge[i].y > HALL.r - .01 && edge[i - 1].y > HALL.r - .01) break; ribbon.push(edge[i]); }
    const pos = [], idx = [];
    ribbon.forEach((p, i) => { pos.push(p.x, .12, p.y, p.x, HALL.H, p.y); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    B.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: COL.glass, transparent: true, opacity: .24, roughness: .05, metalness: 0, side: THREE.DoubleSide, depthWrite: false })));
    const mm = mat('mullion', COL.mullion, { metalness: .6, roughness: .4 });
    const path = new THREE.CurvePath(); for (let i = 1; i < ribbon.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(ribbon[i - 1].x, 0, ribbon[i - 1].y), new THREE.Vector3(ribbon[i].x, 0, ribbon[i].y)));
    const n = Math.round(path.getLength() / .9);
    for (let i = 0; i <= n; i++) { const p = path.getPointAt(i / n); box(.05, HALL.H - .12, .05, mm, p.x, .12, p.z, B).castShadow = false; }
    [1.05, 2.1, HALL.H - .04].forEach(y => pipe(ribbon.map(p => [p.x, y, p.y]), .025, mm, B));
    const wallM = mat('wall', 0xd8dde2);
    box(HALL.e - HALL.w, HALL.H, .18, wallM, (HALL.w + HALL.e) / 2, 0, HALL.r - .09, B);
    const floorM = mat('floor', 0xc4cbd3, { roughness: .7 });
    box(BASE.x1 - BASE.x0, .12, BASE.z1, floorM, (BASE.x0 + BASE.x1) / 2, -.12, BASE.z1 / 2, B);
    box(BASE.x1 - BASE.x0, .12, -BASE.z0, floorM, (BASE.x0 + BASE.x1) / 2, -.12, BASE.z0 / 2, groups.floorFront);
    const hs = hallShape(); const hh = new THREE.Path(); hh.moveTo(BASE.x0, BASE.z0); hh.lineTo(BASE.x0, BASE.z1); hh.lineTo(BASE.x1, BASE.z1); hh.lineTo(BASE.x1, BASE.z0); hh.lineTo(BASE.x0, BASE.z0); hs.holes.push(hh);
    const hsm = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: .12, bevelEnabled: false }).rotateX(Math.PI / 2), floorM); hsm.position.y = .12; hsm.receiveShadow = true; B.add(hsm);
    const roofG = new THREE.ExtrudeGeometry(hallShape(), { depth: .28, bevelEnabled: false }).rotateX(Math.PI / 2);
    const roof = new THREE.Mesh(roofG, mat('roof', COL.roof, { roughness: .6 })); roof.position.y = HALL.H + .28; roof.castShadow = true; roof.receiveShadow = true; groups.roof.add(roof);
    const bs = hallShape(); bs.holes.push(hallShape(.35));
    const band = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: .3, bevelEnabled: false }).rotateX(Math.PI / 2), mat('band', 0x1e2329)); band.position.y = HALL.H + .3; band.castShadow = true; B.add(band);
    box(2.55, 1.7, 3.0, wallM, HALL.e + 1.35, 0, 1.4, B);
    box(1.2, 1.25, .04, mat('door', 0x8a939d, { metalness: .5, roughness: .4 }), HALL.e + 1.35, 0, -.12, B);
  }
  // equipment
  {
    const boilerM = mat('boiler', COL.boiler, { roughness: .5, metalness: .3 });
    const steelM = mat('steel', COL.steel, { metalness: .7, roughness: .35 });
    const valveM = mat('valve', COL.valve, { metalness: .4, roughness: .4 });
    [-4.9, -2.8, -.7].forEach(x => { box(1.9, 1.38, 1.34, boilerM, x + .9, .12, 2.3, B); cyl(.14, .9, steelM, x + .4, 1.5, 2.3, B, 12); });
    [[1.9, 2.4], [3.1, 2.4]].forEach(([x, z]) => {
      box(1.0, .12, .7, steelM, x, .12, z, B);
      cyl(.18, .5, mat('motor', 0x3b4450, { metalness: .5 }), x - .2, .24, z, B, 16).rotation.z = Math.PI / 2;
      const w = new THREE.Mesh(new THREE.TorusGeometry(.14, .025, 8, 20), valveM); w.position.set(x + .3, .75, z - .36); B.add(w);
    });
    [5.2, 6.4, 7.6].forEach(x => cyl(.52, 1.82, mat('tank', 0xe4e8ec, { metalness: .5, roughness: .3 }), x, .12, 2.3, B));
    pipe([[-5.4, 2.6, 2.95], [8.2, 2.6, 2.95]], .09, steelM, B);
    pipe([[-5.4, 2.85, 2.95], [8.2, 2.85, 2.95]], .07, mat('hotpipe', COL.heat, { roughness: .5 }), B);
    box(2.4, 1.5, 1.6, mat('sub', 0x8e99a5, { metalness: .5, roughness: .45 }), 7.2, .1, 6.2, B);
    for (let i = 0; i < 6; i++) box(.05, 1.2, 1.64, mat('fin', 0x77828e), 6.2 + i * .36, .25, 6.2, B).castShadow = false;
    const gen = cyl(.55, 2.4, mat('gen', 0xd9dde1, { metalness: .4, roughness: .4 }), 10.9, -.65, 6.2, B); gen.rotation.z = Math.PI / 2; gen.position.y = .7;
    box(2.6, .15, 1.0, steelM, 10.9, .1, 6.2, B);
    const stackM = mat('stack', 0x9aa5b1, { metalness: .6, roughness: .35 });
    const steamTex = radial('rgba(255,255,255,.9)', 'rgba(255,255,255,0)');
    [-4.2, -2.9, -1.6, -.3].forEach((x, i) => {
      cyl(.3, 4.2, stackM, x, HALL.H, 2.6, B, 20);
      for (let k = 0; k < 5; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xdfe6ee, transparent: true, depthWrite: false, opacity: 0 }));
        B.add(s); const off = (k / 5 + i * .13) % 1;
        tick.push(t => { const u = (t * .12 + off) % 1; s.position.set(x + u * .9, HALL.H + 4.3 + u * 3.2, 2.6 + u * .4); const sc = .6 + u * 2.2; s.scale.set(sc, sc, 1); s.material.opacity = Math.sin(u * Math.PI) * .55; });
      }
    });
    box(2.2, 1.1, 2.0, mat('vault', 0xaab2bb, { transparent: true, opacity: .55 }), -3.6, -1.6, -4.6, groups.p2).castShadow = false;
    [[COL.cyan, .09, -.45], [COL.blue, .11, -.15], [COL.amber, .08, .15], [COL.cyanBright, .07, .42]].forEach(([c, r, dx]) => {
      pipe([[-3.6 + dx, -1.0, -9], [-3.6 + dx, -1.0, -4.6], [-3.6 + dx, -1.0, BASE.z0 + .2], [-3.6 + dx, -.5, BASE.z0 + .6]], r, mat('cond' + c, c, { roughness: .4, emissive: c, emissiveIntensity: .15 }), groups.p2);
    });
  }
  function rack(w, h, d, x, z, y, parent, ledColor = COL.led) {
    box(w, h, d, mat('rack', COL.rack, { roughness: .45, metalness: .5 }), x, y, z, parent);
    const n = Math.max(3, Math.round(h / .22));
    for (let i = 0; i < n; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(w * .7, .02, .01), new THREE.MeshBasicMaterial({ color: ledColor }));
      l.position.set(x, y + .15 + i * (h - .3) / (n - 1), z - d / 2 - .006); parent.add(l);
      if (Math.random() > .5) { const ph = Math.random() * 6; tick.push(t => { l.visible = Math.sin(t * 3 + ph) > -.6; }); }
    }
  }
  { // Phase 1
    const g = groups.p1;
    box(4.35, .44, 3.55, mat('p1pad', 0xc4cbd3, { roughness: .7 }), -2.6, -.12, .4, g);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) rack(.46, 1.66, .78, -4.2 + i * .62, -.35 + row * 1.5, .32, g);
    const fanM = mat('fanb', COL.fan, { roughness: .5 });
    [-4.2, -2.6, -1.0].forEach(x => {
      box(.9, .9, .5, mat('fanbox', 0xcfd6dd, { metalness: .4 }), x, .32, 1.95, g);
      const blades = new THREE.Group(); blades.position.set(x, .77, 1.69);
      for (let b = 0; b < 4; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.34, .08, .02), fanM); bl.rotation.z = b * Math.PI / 2; bl.position.set(Math.cos(b * Math.PI / 2) * .15, Math.sin(b * Math.PI / 2) * .15, 0); blades.add(bl); }
      g.add(blades); tick.push(t => { blades.rotation.z = -t * 6; });
    });
    const pl = new THREE.PointLight(0x7fd0ff, 6, 6, 2); pl.position.set(-2.6, 1.6, -1.2); g.add(pl);
  }
  { // Phase 2
    const g = groups.p2, y0 = -BASE.depth;
    const conc = mat('bconc', 0xbcc3cb, { roughness: .95 });
    box(BASE.x1 - BASE.x0, .14, BASE.z1 - BASE.z0, conc, (BASE.x0 + BASE.x1) / 2, y0 - .14, 0, g);
    box(BASE.x1 - BASE.x0, BASE.depth, .16, conc, (BASE.x0 + BASE.x1) / 2, y0, BASE.z1 - .08, g);
    box(.16, BASE.depth, BASE.z1 - BASE.z0, conc, BASE.x0 + .08, y0, 0, g);
    box(.16, BASE.depth, BASE.z1 - BASE.z0, conc, BASE.x1 - .08, y0, 0, g);
    box(BASE.x1 - BASE.x0, BASE.depth, .1, mat('bcut', 0xb7bec6, { transparent: true, opacity: .18, depthWrite: false }), (BASE.x0 + BASE.x1) / 2, y0, BASE.z0 + .05, g).castShadow = false;
    for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) rack(.38, .96, .48, -3.9 + i * .5, 1.2 + row * .75, y0, g, COL.cyan);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) rack(.47, 1.34, .82, -3.9 + i * .6, -1.5 + row * 1.1, y0, g, COL.cyan);
    for (let i = 0; i < 13; i++) box(.06, 1.1, .7, mat(i % 2 ? 'cu' : 'ss', i % 2 ? COL.copper : COL.stainless, { metalness: .8, roughness: .3 }), 1.8 + i * .09, y0 + .2, -1.4, g);
    box(1.5, .2, .9, mat('skid', 0x6f7985, { metalness: .5 }), 2.35, y0, -1.4, g);
    const cyanM = mat('cyanp', COL.cyanBright, { roughness: .35, emissive: COL.cyan, emissiveIntensity: .12 });
    const hotM = mat('hotp', COL.heat, { roughness: .4 });
    box(1.0, .3, .6, mat('pskid', 0x59636e), 4.4, y0, -1.4, g);
    cyl(.18, 1.6, cyanM, 5.6, y0, 1.2, g); cyl(.13, 1.6, hotM, 6.1, y0, 1.2, g);
    pipe([[-3.9, y0 + 1.6, .9], [5.6, y0 + 1.6, .9], [5.6, y0 + 1.6, 1.2]], .05, cyanM, g);
    pipe([[-3.9, y0 + 1.75, .7], [6.1, y0 + 1.75, .7], [6.1, y0 + 1.75, 1.2]], .05, hotM, g);
    pipe([[2.9, y0 + .9, -1.4], [4.4, y0 + .9, -1.4], [5.6, y0 + .9, 1.2]], .05, cyanM, g);
    pipe([[6.1, y0 + 1.6, 1.2], [6.1, y0 + 1.6, 2.6], [6.1, 2.85, 2.6], [6.1, 2.85, 2.95]], .06, hotM, g);
    const pl = new THREE.PointLight(0x7feaff, 5, 7, 2); pl.position.set(.5, y0 + 1.8, -1.2); g.add(pl);
  }
  { // Phase 3
    const g = groups.p3, y = HALL.H + .28;
    const frameM = mat('frame', 0x8b96a2, { metalness: .6, roughness: .4 });
    [[0.5, -1.4], [3.0, -1.4], [0.5, .6], [3.0, .6]].forEach(([x, z]) => {
      box(2.05, .5, 1.2, frameM, x, y + .06, z, g);
      box(2.05, .16, 1.2, mat('coolerTop', 0xdfe4e9, { metalness: .4 }), x, y + .56, z, g);
      [-.5, .5].forEach(dx => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.36, .04, 8, 24), frameM); ring.rotation.x = Math.PI / 2; ring.position.set(x + dx, y + .75, z); g.add(ring);
        const blades = new THREE.Group(); blades.position.set(x + dx, y + .74, z);
        for (let b = 0; b < 5; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.3, .015, .09), mat('blade', 0x4a5561)); bl.position.x = .15; const piv = new THREE.Group(); piv.rotation.y = b * Math.PI * 2 / 5; piv.add(bl); blades.add(piv); }
        g.add(blades); tick.push(t => { blades.rotation.y = t * 5; });
      });
    });
    pipe([[-.8, y + .2, -2.4], [4.4, y + .2, -2.4], [4.4, y + .2, 1.6], [-.8, y + .2, 1.6]], .06, mat('cyanp', COL.cyanBright), g);
    const railM = mat('rail', 0xf2b233, { metalness: .3 });
    const rp = hallShape(.2).getPoints(20);
    pipe(rp.map(p => [p.x, y + .9, p.y]), .025, railM, g);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) rack(.47, 1.72, .84, 1.4 + i * .6, -1.8 + row * 1.2, .24, g, COL.cyan);
  }
  return { root, groups };
}
