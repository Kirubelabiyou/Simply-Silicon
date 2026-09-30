/* Foundation: illustrative 3D model of the Calgary site, built from published details.
   Plant with stack, 14 MVA n+1 power yard with dual grid feeds, Phase 1 compute (live),
   Phase 2 and 3 volumes (planned), 7 km private fiber to 25+ buildings, district heating loop. */
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '../vendor/three/addons/CSS2DRenderer.js';

const stage = document.getElementById('fndStage');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let started = false, running = false;
let renderer, labelRenderer, scene, camera, controls, clock;
const layers = {};
const animators = [];

const C = {
  ground: 0x070b12, road: 0x101826, block: 0x243148, blockEdge: 0x3b4f6e,
  plant: 0x232d3d, plantEdge: 0x4a5d7a, heat: 0xff6b2c, hot: 0xffd2b0, amber: 0xf3b642, steel: 0x8093ad, feed: 0x7fb6ff
};

function mat(color, opts = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: .15, ...opts }); }
function edges(mesh, color, opacity = .6) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  mesh.add(e); return e;
}
function box(w, h, d, m, x, z, y = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y + h / 2, z); return b;
}
function label(text, sub, cls = '') {
  const el = document.createElement('div');
  el.className = 'fnd-label ' + cls;
  el.innerHTML = '<b>' + text + '</b>' + (sub ? '<span>' + sub + '</span>' : '');
  return new CSS2DObject(el);
}
function group(name) { const g = new THREE.Group(); g.name = name; scene.add(g); layers[name] = g; return g; }

function injectLabelCSS() {
  const s = document.createElement('style');
  s.textContent = `.fnd-label{font:600 11px/1.25 "JetBrains Mono",ui-monospace,monospace;color:#e9eef5;letter-spacing:.05em;text-transform:uppercase;background:#0c121ccc;border:1px solid #1f2a3a;padding:5px 7px;border-radius:2px;white-space:nowrap;transform:translateY(-14px);pointer-events:none}
.fnd-label span{display:block;color:#8093ad;font-weight:500;font-size:10px;margin-top:2px}
.fnd-label.live{border-color:#ff6b2c88}.fnd-label.live b{color:#ffb38c}
@media (max-width:600px){.fnd-label{font-size:9px;padding:4px 5px}.fnd-label span{font-size:8px}.fnd-label.minor{display:none}}`;
  document.head.appendChild(s);
}

function build() {
  injectLabelCSS();
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.ground, 220, 520);

  // Lights: cool night sky, warm spill from the plant
  scene.add(new THREE.HemisphereLight(0xb4c8e6, 0x0a0f18, 1.4));
  const moon = new THREE.DirectionalLight(0xc8d8f0, 1.6);
  moon.position.set(-120, 200, 90); scene.add(moon);
  const warm = new THREE.PointLight(C.heat, 900, 140, 2);
  warm.position.set(8, 16, 4); scene.add(warm);

  // Ground and street grid (downtown blocks)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), mat(C.ground, { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const grid = new THREE.GridHelper(1200, 120, 0x111a28, 0x0d1520);
  grid.position.y = .02; scene.add(grid);

  const BLOCK = 46, ROAD = 12;
  const roads = new THREE.Group(); scene.add(roads);
  const roadMat = mat(C.road, { roughness: .95 });
  for (let i = -5; i <= 5; i++) {
    const p = i * (BLOCK + ROAD) - (BLOCK + ROAD) / 2;
    const a = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, 700), roadMat); a.rotation.x = -Math.PI / 2; a.position.set(p, .05, 0); roads.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(700, ROAD), roadMat); b.rotation.x = -Math.PI / 2; b.position.set(0, .05, p); roads.add(b);
  }

  // City: surrounding downtown buildings. Pick 25+ to link on fiber.
  const city = group('city');
  const blockMat = mat(C.block, { roughness: .6, metalness: .35 });
  const buildings = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let gx = -4; gx <= 4; gx++) {
    for (let gz = -4; gz <= 4; gz++) {
      if (gx === 0 && gz === 0) continue; // plant block
      const cx = gx * (BLOCK + ROAD), cz = gz * (BLOCK + ROAD);
      const dist = Math.hypot(gx, gz);
      const n = rnd() > .5 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const w = 14 + rnd() * 16, d = 14 + rnd() * 16;
        const tall = gz < 0 && gx < 2 ? 1.9 : 1; // taller core to the north-west (downtown core)
        const h = (8 + rnd() * 42 * tall) * (dist < 1.5 ? .45 : Math.max(.4, 1.05 - dist * .08));
        const ox = n === 1 ? 0 : (k ? 1 : -1) * 10;
        const b = box(w, h, d, blockMat, cx + ox + (rnd() - .5) * 6, cz + (rnd() - .5) * 8);
        edges(b, C.blockEdge, .35);
        city.add(b); buildings.push(b);
      }
    }
  }

  // Plant: district heating base plant with utility-grade stack
  const plant = group('plant');
  const plantMat = mat(C.plant, { roughness: .7, metalness: .25 });
  const hall = box(34, 18, 26, plantMat, -2, 0); edges(hall, C.plantEdge, .7); plant.add(hall);
  const annex = box(16, 11, 14, plantMat, 20, 6); edges(annex, C.plantEdge, .7); plant.add(annex);
  // Window bands with a faint warm glow
  const bandMat = new THREE.MeshBasicMaterial({ color: 0x3a2618 });
  for (let i = 0; i < 3; i++) { const band = new THREE.Mesh(new THREE.BoxGeometry(34.2, 1.2, 26.2), bandMat); band.position.set(-2, 5 + i * 4.5, 0); plant.add(band); }
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 62, 20), mat(0x3a4659, { roughness: .5, metalness: .5 }));
  stack.position.set(-12, 31, -8); edges(stack, C.plantEdge, .25); plant.add(stack);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x55657f });
  [20, 40, 58].forEach(y => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.95, .18, 6, 20), ringMat); r.rotation.x = Math.PI / 2; r.position.set(-12, y, -8); plant.add(r); });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.55, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  beacon.position.set(-12, 62.4, -8); plant.add(beacon);
  animators.push(t => { beacon.visible = Math.floor(t * 1.1) % 2 === 0; });
  const lStack = label('Stack', 'Utility-grade'); lStack.position.set(-12, 66, -8); plant.add(lStack);
  const lPlant = label('Base plant', 'District heating', 'minor'); lPlant.position.set(-2, 21, 12); plant.add(lPlant);

  // Power: 14 MVA n+1 yard, dual redundant grid feeds, on-site generation
  const power = group('power');
  const trMat = mat(0x3b4759, { roughness: .6, metalness: .6 });
  for (let i = 0; i < 3; i++) {
    const t = box(5, 5.5, 4, trMat, -14 + i * 7, 20); edges(t, 0x6a7d99, .5); power.add(t);
    for (let f = 0; f < 3; f++) { const fin = box(.3, 4.5, 4.4, trMat, -16.2 + i * 7 + f * 1.1, 20); power.add(fin); }
  }
  const gen = box(9, 4, 4.5, mat(0x2d3a4d), 8, 22); edges(gen, 0x6a7d99, .5); power.add(gen);
  const lPower = label('Power', '14 MVA n+1', 'minor'); lPower.position.set(-7, 9, 20); power.add(lPower);
  // Two grid feeds arriving from different directions
  const feedMat = new THREE.LineBasicMaterial({ color: C.feed, transparent: true, opacity: .9 });
  const feeds = [
    [new THREE.Vector3(-300, 0.4, 20 + 29), new THREE.Vector3(-29, .4, 49), new THREE.Vector3(-29, .4, 20), new THREE.Vector3(-17, .4, 20)],
    [new THREE.Vector3(29, .4, -300), new THREE.Vector3(29, .4, 29), new THREE.Vector3(-3, .4, 29), new THREE.Vector3(-3, .4, 22)]
  ];
  feeds.forEach(pts => {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)), feedMat);
    power.add(line);
    addPulses(power, curve, C.feed, 3, .08, .7);
  });

  // Compute: Phase 1 live, Phase 2 and 3 as planned volumes
  const compute = group('compute');
  const p1 = box(9, 6, 7, mat(0x1b2230, { emissive: C.heat, emissiveIntensity: .18 }), 20, -12);
  edges(p1, C.heat, .95); compute.add(p1);
  // rack rows inside Phase 1 with blinking lights
  const ledGeo = new THREE.BoxGeometry(.5, .25, .08);
  const leds = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const m = new THREE.MeshBasicMaterial({ color: C.heat });
    const l = new THREE.Mesh(ledGeo, m); l.position.set(16.2 + c * 1.5, 1 + r * 1.2, -8.45); compute.add(l); leds.push({ l, p: Math.random() * 6, s: .8 + Math.random() * 2.4 });
  }
  animators.push(t => leds.forEach(o => { o.l.visible = Math.sin(t * o.s + o.p) > -.3; }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: C.heat, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .8 }));
  glow.scale.set(26, 26, 1); glow.position.set(20, 4, -12); compute.add(glow);
  animators.push(t => { glow.material.opacity = .6 + Math.sin(t * 1.6) * .15; });
  const lP1 = label('Phase 1 · Online', '100 kW', 'live'); lP1.position.set(20, 8, -12); compute.add(lP1);

  const ghost = (w, h, d, x, z, color, op) => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
    g.position.set(x, h / 2, z); edges(g, color, .8); return g;
  };
  const p2 = ghost(12, 8, 10, 20, -26, C.amber, .06); compute.add(p2);
  const lP2 = label('Phase 2', '2 MW · Feb 2027', 'minor'); lP2.position.set(20, 10, -26); compute.add(lP2);
  const p3 = ghost(46, 22, 18, -2, -27 - 14, C.steel, .03); compute.add(p3);
  const lP3 = label('Phase 3', '12 MW', 'minor'); lP3.position.set(-10, 24, -41); compute.add(lP3);

  // Fiber: 7 km private fiber, 25+ connected buildings, routed along streets
  const fiber = group('fiber');
  const fMat = new THREE.LineBasicMaterial({ color: C.amber, transparent: true, opacity: .75 });
  const targets = buildings
    .map(b => ({ b, d: Math.hypot(b.position.x, b.position.z) }))
    .sort((a, b) => a.d - b.d).slice(0, 26).map(o => o.b);
  const lanes = [-29, 29];
  targets.forEach((b, i) => {
    const lx = lanes[i % 2], y = .35;
    const bx = b.position.x, bz = b.position.z;
    const roadX = Math.round((bx + 29) / 58) * 58 - 29;
    const pts = [new THREE.Vector3(8, y, lx * .4), new THREE.Vector3(lx, y, lx * .4), new THREE.Vector3(lx, y, bz), new THREE.Vector3(roadX, y, bz), new THREE.Vector3(bx, y, bz)];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0);
    fiber.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), fMat));
    if (i % 2 === 0) addPulses(fiber, curve, C.amber, 1, .05 + (i % 5) * .01, .55);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(b.geometry.parameters.width + .3, .5, b.geometry.parameters.depth + .3), new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: .22, depthWrite: false }));
    cap.scale.y = .2; cap.position.set(bx, b.geometry.parameters.height + .1, bz); edges(cap, C.amber, .9); fiber.add(cap);
  });
  const lF = label('Private fiber', '7 km · 25+ buildings'); lF.position.set(-29, 4, 70); fiber.add(lF);

  // Heat: district heating loop, below grade
  const heat = group('heat');
  const loopPts = [[-6, 30], [-6, 90], [-120, 90], [-120, -90], [60, -90], [60, 30]].map(([x, z]) => new THREE.Vector3(x, -.2, z));
  const loop = new THREE.CatmullRomCurve3(loopPts, true, 'catmullrom', .05);
  const pipe = new THREE.Mesh(new THREE.TubeGeometry(loop, 200, .9, 8, true), new THREE.MeshBasicMaterial({ color: C.heat, transparent: true, opacity: .55 }));
  heat.add(pipe);
  addPulses(heat, loop, C.hot, 6, .035, .9);
  const lH = label('Heating', 'District loop', 'minor'); lH.position.set(-120, 3, 0); heat.add(lH);

  camera = new THREE.PerspectiveCamera(42, 1, 1, 2000);
  camera.position.set(150, 120, 170);
}

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}
let _glow;
function addPulses(parent, curve, color, count, speed, size) {
  _glow = _glow || glowTex();
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glow, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(size * 6, size * 6, 1); parent.add(s);
    const off = i / count;
    animators.push(t => { const u = (t * speed + off) % 1; s.position.copy(curve.getPointAt(u)); s.position.y += .4; });
  }
}

function buildLayerButtons() {
  const wrap = document.getElementById('fndLayers');
  const defs = [['compute', 'Compute', '#ff6b2c'], ['power', 'Power', '#7fb6ff'], ['fiber', 'Fiber', '#f3b642'], ['heat', 'Heat loop', '#ffd2b0'], ['city', 'City', '#8093ad']];
  defs.forEach(([k, name, col]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-pressed', 'true');
    b.innerHTML = '<i style="background:' + col + '"></i>' + name;
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      layers[k].visible = on;
    });
    wrap.appendChild(b);
  });
}

function size() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w < 600 ? 52 : 42;
  camera.updateProjectionMatrix();
}

function start() {
  started = true;
  build();
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(C.ground, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  stage.prepend(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  stage.insertBefore(labelRenderer.domElement, renderer.domElement.nextSibling);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(4, 6, -6);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.minDistance = 45;
  controls.maxDistance = 420;
  controls.maxPolarAngle = Math.PI * .47;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = .45;
  controls.enablePan = false;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  buildLayerButtons();
  clock = new THREE.Clock();
  window.addEventListener('resize', () => running && size());
  if ('ResizeObserver' in window) new ResizeObserver(() => running && size()).observe(stage);
  introFlight();
}

function introFlight() {
  // fly in from high over the city to the plant
  const from = new THREE.Vector3(300, 360, 340), to = new THREE.Vector3(150, 125, 175);
  if (stage.clientWidth < 600) to.set(150, 135, 180);
  camera.position.copy(reduce ? to : from);
  const t0 = performance.now(), ms = reduce ? 0 : 2200;
  (function step() {
    const t = ms ? Math.min(1, (performance.now() - t0) / ms) : 1;
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(from, to, e);
    if (t < 1 && running) requestAnimationFrame(step);
  })();
}

function loop() {
  if (!running) return;
  requestAnimationFrame(loop);
  const t = clock.getElapsedTime();
  if (!reduce) animators.forEach(a => a(t));
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

window.addEventListener('foundation:open', () => {
  running = true;
  const first = !started;
  if (first) start();
  requestAnimationFrame(() => { size(); loop(); });
  if (!first) introFlight();
});
window.addEventListener('foundation:close', () => { running = false; });
