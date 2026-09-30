/* Foundation: 3D model of the Calgary plant.
   Layout follows the published plant model on gosimply.ai (src/plantWidget.js):
   rounded glass hall, three boilers, pump skids, storage tanks, substation, backup generator,
   four roof stacks, a below-grade conduit vault, and the three build phases. */
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';

const view = document.getElementById('fndView');
const loading = document.getElementById('fndLoading');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COL = {
  bg: 0xeef3f8, ground: 0xf4f6f8, concrete: 0xc9cfd6, concreteDark: 0x9aa3ad, asphalt: 0x5b6470, sidewalk: 0xdde2e7,
  glass: 0x9fd0ef, mullion: 0x55606d, roof: 0x2d333b, steel: 0xaeb7c1, stainless: 0xd5dbe1, copper: 0xc27a4a,
  boiler: 0xc8423a, valve: 0x2f6fd6, rack: 0x1b2230, led: 0x4fb3f0, fan: 0x36df8c,
  cyan: 0x5ee5ff, cyanBright: 0x7fd6f5, blue: 0x3d7bff, amber: 0xffb45e, heat: 0xe8513c, green: 0x12b886
};

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.bg);
scene.fog = new THREE.Fog(COL.bg, 45, 90);

const camera = new THREE.PerspectiveCamera(40, 1, .1, 300);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .08;
controls.minDistance = 7; controls.maxDistance = 48;
controls.maxPolarAngle = Math.PI * .495;
controls.enablePan = false;

// Light: bright overcast sky with a low sun for soft shadows
scene.add(new THREE.HemisphereLight(0xffffff, 0xc6ced8, 1.25));
const sun = new THREE.DirectionalLight(0xfff4e6, 2.1);
sun.position.set(-14, 22, -10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18; sun.shadow.camera.right = 18; sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;
scene.add(sun);

const mats = {};
function mat(key, color, o = {}) {
  if (!mats[key]) mats[key] = new THREE.MeshStandardMaterial({ color, roughness: .8, metalness: .1, ...o });
  return mats[key];
}
function box(w, h, d, m, x = 0, y = 0, z = 0, parent) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y + h / 2, z); b.castShadow = true; b.receiveShadow = true;
  (parent || scene).add(b); return b;
}
function cyl(r, h, m, x, y, z, parent, seg = 24) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
  c.position.set(x, y + h / 2, z); c.castShadow = true; c.receiveShadow = true;
  (parent || scene).add(c); return c;
}
function pipe(points, r, m, parent) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0);
  const t = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), r, 10, false), m);
  t.castShadow = true; (parent || scene).add(t); return t;
}
const groups = { base: new THREE.Group(), p1: new THREE.Group(), p2: new THREE.Group(), p3: new THREE.Group(), roof: new THREE.Group(), floorFront: new THREE.Group() };
Object.values(groups).forEach(g => scene.add(g));
const tick = [];

// ---------- Site ----------
const HALL = { w: -5.8, e: 8.45, f: -3.45, r: 3.3, R: 2.7, H: 3.2 };
const BASE = { x0: -4.5, x1: 6.85, z0: -2.85, z1: 2.85, depth: 2.3 };
{
  // ground slab with an opening over the basement (the floor above it is a separate piece)
  const s = new THREE.Shape();
  s.moveTo(-14, -9); s.lineTo(14, -9); s.lineTo(14, 10); s.lineTo(-14, 10); s.lineTo(-14, -9);
  const hole = new THREE.Path();
  hole.moveTo(BASE.x0, BASE.z0); hole.lineTo(BASE.x0, BASE.z1); hole.lineTo(BASE.x1, BASE.z1); hole.lineTo(BASE.x1, BASE.z0); hole.lineTo(BASE.x0, BASE.z0);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: .18, bevelEnabled: false });
  g.rotateX(Math.PI / 2); g.translate(0, 0, 0);
  const slab = new THREE.Mesh(g, mat('ground', COL.ground, { roughness: .95 }));
  slab.receiveShadow = true; groups.base.add(slab);
  // big surrounding ground plane
  const fs = new THREE.Shape(); fs.moveTo(-100, -100); fs.lineTo(100, -100); fs.lineTo(100, 100); fs.lineTo(-100, 100); fs.lineTo(-100, -100);
  const fh = new THREE.Path(); fh.moveTo(-14, -9); fh.lineTo(-14, 10); fh.lineTo(14, 10); fh.lineTo(14, -9); fh.lineTo(-14, -9); fs.holes.push(fh);
  const plane = new THREE.Mesh(new THREE.ShapeGeometry(fs).rotateX(Math.PI / 2), mat('far', 0xe9eef3, { roughness: 1, side: THREE.DoubleSide }));
  plane.position.y = -.01; plane.receiveShadow = true; scene.add(plane);
  // street (9 Ave SE), sidewalk, lane marks
  box(28, .08, 3.15, mat('asphalt', COL.asphalt, { roughness: .9 }), 0, 0, -6.1, groups.base).castShadow = false;
  box(28, .12, 1.8, mat('sidewalk', COL.sidewalk), 0, 0, -3.95 - .5, groups.base).castShadow = false;
  for (let x = -13; x < 14; x += 2.2) box(1.1, .01, .08, mat('lane', 0xf2f2f2, { roughness: .6 }), x, .08, -6.1, groups.base).castShadow = false;
  // service yard and corner plaza
  box(8.4, .1, 5.6, mat('yard', 0xd3d8de), 13.4 - 8.4 / 2 + .6, 0, 6.2, groups.base).castShadow = false;
  box(3.0, .12, 4.3, mat('plaza', 0xe6e9ec), -8.2, 0, -.8, groups.base).castShadow = false;
  // trees along the sidewalk
  const trunkM = mat('trunk', 0x7b6a58), leafM = mat('leaf', 0x8fbf8a, { roughness: .9 });
  [-12, -9.5, 10, 12.5].forEach(x => {
    cyl(.08, 1.2, trunkM, x, 0, -4.3, groups.base, 8);
    const l = new THREE.Mesh(new THREE.SphereGeometry(.75, 14, 10), leafM); l.position.set(x, 1.8, -4.3); l.castShadow = true; groups.base.add(l);
  });
  // neighbouring buildings across the street and behind, kept plain so the plant reads first
  const nb = mat('nb', 0xdfe5eb, { roughness: .85 });
  [[-11.5, 5, 7, 4.5], [0, 3.8, 14, 8], [-6, 6, 14, 5.5]].forEach(([x, w, z, h]) => box(w, h, 3.8, nb, x, 0, z, groups.base));
}

// Hall outline: rounded front corners, glass on the street and sides
function hallShape(inset = 0) {
  const { w, e, f, r, R } = HALL;
  const s = new THREE.Shape();
  const W0 = w + inset, E0 = e - inset, F0 = f + inset, R0 = r - inset, RR = R - inset;
  s.moveTo(W0, R0); s.lineTo(W0, F0 + RR); s.absarc(W0 + RR, F0 + RR, RR, Math.PI, Math.PI * 1.5, false);
  s.lineTo(E0 - RR, F0); s.absarc(E0 - RR, F0 + RR, RR, Math.PI * 1.5, Math.PI * 2, false);
  s.lineTo(E0, R0); s.lineTo(W0, R0);
  return s;
}
{
  const pts = hallShape().getPoints(24).map(p => new THREE.Vector2(p.x, p.y));
  // glass ribbon (skip the rear edge, which is a solid wall)
  const pos = [], idx = [];
  const edge = pts.slice(0, pts.length - 1);
  const ribbon = [];
  for (let i = 0; i < edge.length; i++) { if (i > 0 && edge[i].y > HALL.r - .01 && edge[i - 1].y > HALL.r - .01) break; ribbon.push(edge[i]); }
  ribbon.forEach((p, i) => { pos.push(p.x, .12, p.y, p.x, HALL.H, p.y); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const glass = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: COL.glass, transparent: true, opacity: .22, roughness: .05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }));
  groups.base.add(glass);
  // mullions and transoms
  const mm = mat('mullion', COL.mullion, { metalness: .6, roughness: .4 });
  const path = new THREE.CurvePath(); for (let i = 1; i < ribbon.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(ribbon[i - 1].x, 0, ribbon[i - 1].y), new THREE.Vector3(ribbon[i].x, 0, ribbon[i].y)));
  const L = path.getLength(), n = Math.round(L / .9);
  for (let i = 0; i <= n; i++) { const p = path.getPointAt(i / n); const m = box(.05, HALL.H - .12, .05, mm, p.x, .12, p.z, groups.base); m.castShadow = false; }
  [1.05, 2.1, HALL.H - .04].forEach(y => pipe(ribbon.map(p => [p.x, y, p.y]), .025, mm, groups.base));
  // rear wall, east wall, hall floor (rear half fixed, front half removable for the basement cutaway)
  const wallM = mat('wall', 0xd8dde2);
  box(HALL.e - HALL.w, HALL.H, .18, wallM, (HALL.w + HALL.e) / 2, 0, HALL.r - .09, groups.base);
  const floorM = mat('floor', 0xbfc6ce, { roughness: .7 });
  box(BASE.x1 - BASE.x0, .12, BASE.z1, floorM, (BASE.x0 + BASE.x1) / 2, -.12, BASE.z1 / 2, groups.base);
  box(BASE.x1 - BASE.x0, .12, -BASE.z0, floorM, (BASE.x0 + BASE.x1) / 2, -.12, BASE.z0 / 2, groups.floorFront);
  const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(hallShape(), { depth: .12, bevelEnabled: false }).rotateX(Math.PI / 2), floorM);
  ring.position.y = .12; ring.receiveShadow = true;
  // hall slab outside the basement opening: use shape with hole
  const hs = hallShape(); const hh = new THREE.Path(); hh.moveTo(BASE.x0, BASE.z0); hh.lineTo(BASE.x0, BASE.z1); hh.lineTo(BASE.x1, BASE.z1); hh.lineTo(BASE.x1, BASE.z0); hh.lineTo(BASE.x0, BASE.z0); hs.holes.push(hh);
  const hsm = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: .12, bevelEnabled: false }).rotateX(Math.PI / 2), floorM);
  hsm.position.y = .12; hsm.receiveShadow = true; groups.base.add(hsm);
  // roof: black band and slab (shown in Phase 3; cut away for Phases 1 and 2)
  const roofG = new THREE.ExtrudeGeometry(hallShape(), { depth: .28, bevelEnabled: false }).rotateX(Math.PI / 2);
  const roof = new THREE.Mesh(roofG, mat('roof', COL.roof, { roughness: .6 })); roof.position.y = HALL.H + .28; roof.castShadow = true; roof.receiveShadow = true;
  groups.roof.add(roof);
  const bs = hallShape(); bs.holes.push(hallShape(.35));
  const band = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: .3, bevelEnabled: false }).rotateX(Math.PI / 2), mat('band', 0x1e2329));
  band.position.y = HALL.H + .3; band.castShadow = true; groups.base.add(band);
  // annex service wing with loading bay
  const annex = box(2.55, 1.7, 3.0, wallM, HALL.e + 1.35, 0, 1.4, groups.base);
  box(1.2, 1.25, .04, mat('door', 0x8a939d, { metalness: .5, roughness: .4 }), HALL.e + 1.35, 0, -.12, groups.base);
  for (let y = .1; y < 1.25; y += .12) box(1.2, .015, .05, mat('doorline', 0x6c7681), HALL.e + 1.35, y, -.13, groups.base).castShadow = false;
  annex.name = 'annex';
}

// ---------- Plant equipment (base) ----------
{
  const boilerM = mat('boiler', COL.boiler, { roughness: .5, metalness: .3 });
  const steelM = mat('steel', COL.steel, { metalness: .7, roughness: .35 });
  const valveM = mat('valve', COL.valve, { metalness: .4, roughness: .4 });
  // three boilers along the rear wall, west side
  [-4.9, -2.8, -.7].forEach(x => {
    box(1.9, 1.38, 1.34, boilerM, x + .9, .12, 2.3, groups.base);
    cyl(.14, .9, steelM, x + .4, 1.5, 2.3, groups.base, 12);
  });
  // pump skids with valve wheels
  [[1.9, 2.4], [3.1, 2.4]].forEach(([x, z]) => {
    box(1.0, .12, .7, steelM, x, .12, z, groups.base);
    cyl(.18, .5, mat('motor', 0x3b4450, { metalness: .5 }), x - .2, .24, z, groups.base, 16).rotation.z = Math.PI / 2;
    const w = new THREE.Mesh(new THREE.TorusGeometry(.14, .025, 8, 20), valveM); w.position.set(x + .3, .75, z - .36); groups.base.add(w);
  });
  // storage tanks, east side
  [5.2, 6.4, 7.6].forEach(x => cyl(.52, 1.82, mat('tank', 0xe4e8ec, { metalness: .5, roughness: .3 }), x, .12, 2.3, groups.base));
  // header pipes along the rear wall
  pipe([[-5.4, 2.6, 2.95], [8.2, 2.6, 2.95]], .09, steelM, groups.base);
  pipe([[-5.4, 2.85, 2.95], [8.2, 2.85, 2.95]], .07, mat('hotpipe', COL.heat, { roughness: .5 }), groups.base);
  // yard: substation and backup generator
  const sub = box(2.4, 1.5, 1.6, mat('sub', 0x8e99a5, { metalness: .5, roughness: .45 }), 7.2, .1, 6.2, groups.base);
  for (let i = 0; i < 6; i++) box(.05, 1.2, 1.64, mat('fin', 0x77828e), 6.2 + i * .36, .25, 6.2, groups.base).castShadow = false;
  const gen = cyl(.55, 2.4, mat('gen', 0xd9dde1, { metalness: .4, roughness: .4 }), 10.9, -.65, 6.2, groups.base);
  gen.rotation.z = Math.PI / 2; gen.position.y = .7;
  box(2.6, .15, 1.0, steelM, 10.9, .1, 6.2, groups.base);
  // four roof stacks with steam
  const stackM = mat('stack', 0x9aa5b1, { metalness: .6, roughness: .35 });
  const steamTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  [-4.2, -2.9, -1.6, -.3].forEach((x, i) => {
    cyl(.3, 4.2, stackM, x, HALL.H, 2.6, groups.base, 20);
    const cap = new THREE.Mesh(new THREE.TorusGeometry(.3, .05, 8, 20), mat('capring', 0x6c7682)); cap.rotation.x = Math.PI / 2; cap.position.set(x, HALL.H + 4.2, 2.6); groups.base.add(cap);
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xdfe6ee, transparent: true, depthWrite: false, opacity: .0 }));
      groups.base.add(s);
      const off = (k / 5 + i * .13) % 1;
      tick.push(t => { const u = (t * .12 + off) % 1; s.position.set(x + u * .9, HALL.H + 4.3 + u * 3.2, 2.6 + u * .4); const sc = .6 + u * 2.2; s.scale.set(sc, sc, 1); s.material.opacity = Math.sin(u * Math.PI) * .55; });
    }
  });
  // below-grade conduit vault from the street: power, fiber and thermal conduits
  const vault = box(2.2, 1.1, 2.0, mat('vault', 0xaab2bb, { transparent: true, opacity: .55 }), -3.6, -1.6, -4.6, groups.p2);
  vault.castShadow = false;
  [[COL.cyan, .09, -.45], [COL.blue, .11, -.15], [COL.amber, .08, .15], [COL.cyanBright, .07, .42]].forEach(([c, r, dx]) => {
    pipe([[-3.6 + dx, -1.0, -9], [-3.6 + dx, -1.0, -4.6], [-3.6 + dx, -1.0, BASE.z0 + .2], [-3.6 + dx, -.5, BASE.z0 + .6]], r, mat('cond' + c, c, { roughness: .4, emissive: c, emissiveIntensity: .15 }), groups.p2);
  });
}

// ---------- Phase 1: ground floor, air-cooled racks (online) ----------
function rack(w, h, d, x, z, y, parent, ledColor = COL.led) {
  const r = box(w, h, d, mat('rack', COL.rack, { roughness: .45, metalness: .5 }), x, y, z, parent);
  const n = Math.max(3, Math.round(h / .22));
  for (let i = 0; i < n; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(w * .7, .02, .01), new THREE.MeshBasicMaterial({ color: ledColor }));
    l.position.set(x, y + .15 + i * (h - .3) / (n - 1), z - d / 2 - .006); parent.add(l);
    if (Math.random() > .5) tick.push(t => { l.visible = Math.sin(t * (1 + Math.random() * .02) * 3 + i) > -.6; });
  }
  return r;
}
{
  const g = groups.p1;
  box(4.35, .44, 3.55, mat('pad', 0xbfc6ce, { roughness: .7 }), -2.6, -.12, .4, g);
  box(4.2, .02, 3.4, mat('padline', 0x9fb3c6), -2.6, .32, .4, g).castShadow = false;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) rack(.46, 1.66, .78, -4.2 + i * .62, -.35 + row * 1.5, .32, g);
  const fanM = new THREE.MeshStandardMaterial({ color: COL.fan, roughness: .5 });
  [-4.2, -2.6, -1.0].forEach(x => {
    box(.9, .9, .5, mat('fanbox', 0xcfd6dd, { metalness: .4 }), x, .32, 1.95, g);
    const blades = new THREE.Group(); blades.position.set(x, .77, 1.69);
    for (let b = 0; b < 4; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.34, .08, .02), fanM); bl.rotation.z = b * Math.PI / 2; bl.position.set(Math.cos(b * Math.PI / 2) * .15, Math.sin(b * Math.PI / 2) * .15, 0); blades.add(bl); }
    g.add(blades); tick.push(t => { blades.rotation.z = -t * 6; });
  });
  const pl = new THREE.PointLight(0x7fd0ff, 6, 6, 2); pl.position.set(-2.6, 1.6, -1.2); g.add(pl);
}

// ---------- Phase 2: basement, liquid-cooled racks, heat exchanger (Feb 2027) ----------
{
  const g = groups.p2;
  const y0 = -BASE.depth;
  const conc = mat('bconc', 0xb7bec6, { roughness: .95 });
  box(BASE.x1 - BASE.x0, .14, BASE.z1 - BASE.z0, conc, (BASE.x0 + BASE.x1) / 2, y0 - .14, 0, g);
  box(BASE.x1 - BASE.x0, BASE.depth, .16, conc, (BASE.x0 + BASE.x1) / 2, y0, BASE.z1 - .08, g);
  box(.16, BASE.depth, BASE.z1 - BASE.z0, conc, BASE.x0 + .08, y0, 0, g);
  box(.16, BASE.depth, BASE.z1 - BASE.z0, conc, BASE.x1 - .08, y0, 0, g);
  const cut = mat('bcut', 0xb7bec6, { transparent: true, opacity: .18, depthWrite: false });
  box(BASE.x1 - BASE.x0, BASE.depth, .1, cut, (BASE.x0 + BASE.x1) / 2, y0, BASE.z0 + .05, g).castShadow = false;
  // two rows of 8 compact liquid-cooled racks and two rows of 7 larger racks
  for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) rack(.38, .96, .48, -3.9 + i * .5, 1.2 + row * .75, y0, g, COL.cyan);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) rack(.47, 1.34, .82, -3.9 + i * .6, -1.5 + row * 1.1, y0, g, COL.cyan);
  // plate heat exchanger: 13 plates, stainless and copper
  for (let i = 0; i < 13; i++) box(.06, 1.1, .7, mat(i % 2 ? 'cu' : 'ss', i % 2 ? COL.copper : COL.stainless, { metalness: .8, roughness: .3 }), 1.8 + i * .09, y0 + .2, -1.4, g);
  box(1.5, .2, .9, mat('skid', 0x6f7985, { metalness: .5 }), 2.35, y0, -1.4, g);
  // pump skid, manifolds and loops
  const cyanM = mat('cyanp', COL.cyanBright, { roughness: .35, emissive: COL.cyan, emissiveIntensity: .12 });
  const hotM = mat('hotp', COL.heat, { roughness: .4 });
  box(1.0, .3, .6, mat('pskid', 0x59636e), 4.4, y0, -1.4, g);
  cyl(.18, 1.6, cyanM, 5.6, y0, 1.2, g); cyl(.13, 1.6, hotM, 6.1, y0, 1.2, g);
  pipe([[-3.9, y0 + 1.6, .9], [5.6, y0 + 1.6, .9], [5.6, y0 + 1.6, 1.2]], .05, cyanM, g);
  pipe([[-3.9, y0 + 1.75, .7], [6.1, y0 + 1.75, .7], [6.1, y0 + 1.75, 1.2]], .05, hotM, g);
  pipe([[2.9, y0 + .9, -1.4], [4.4, y0 + .9, -1.4], [5.6, y0 + .9, 1.2]], .05, cyanM, g);
  // heat recovery line up to the plant's hot header
  pipe([[6.1, y0 + 1.6, 1.2], [6.1, y0 + 1.6, 2.6], [6.1, 2.85, 2.6], [6.1, 2.85, 2.95]], .06, hotM, g);
  [[3.0, -1.0], [4.0, -1.0]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.TorusGeometry(.13, .025, 8, 20), mat('valve', COL.valve)); w.position.set(x, y0 + 1.0, z); w.rotation.y = Math.PI / 2; g.add(w); });
  const pl = new THREE.PointLight(0x7feaff, 5, 7, 2); pl.position.set(.5, y0 + 1.8, -1.2); g.add(pl);
}

// ---------- Phase 3: rooftop dry coolers, more racks (12 MW) ----------
{
  const g = groups.p3;
  const frameM = mat('frame', 0x8b96a2, { metalness: .6, roughness: .4 });
  const y = HALL.H + .28;
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
  // rooftop cold loop and guard rail
  pipe([[-.8, y + .2, -2.4], [4.4, y + .2, -2.4], [4.4, y + .2, 1.6], [-.8, y + .2, 1.6]], .06, mat('cyanp', COL.cyanBright), g);
  const railM = mat('rail', 0xf2b233, { metalness: .3 });
  const rp = hallShape(.2).getPoints(20);
  pipe(rp.map(p => [p.x, y + .9, p.y]), .025, railM, g);
  rp.forEach((p, i) => { if (i % 3 === 0) box(.03, .9, .03, railM, p.x, y, p.y, g).castShadow = false; });
  // two rows of 6 liquid-cooled racks on the east side of the hall
  for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) rack(.47, 1.72, .84, 1.4 + i * .6, -1.8 + row * 1.2, .24, g, COL.cyan);
}

// ---------- Phases and camera ----------
const PHASES = {
  1: { title: 'Phase 1', chip: ['chip--live', 'dot--live', 'Online'], text: 'Ground floor. 100 kW of air-cooled GPU racks, running now.', show: ['p1'], floor: true, roof: false,
    cam: [-3.5, 7.5, -15], tgt: [-1.5, 1.2, 0] },
  2: { title: 'Phase 2', chip: ['chip--dev', 'dot--dev', 'Feb 2027'], text: '2 MW in the basement. Liquid-cooled racks and a plate heat exchanger tied to the plant. Street conduits bring in power and fiber.', show: ['p1', 'p2'], floor: false, roof: false,
    cam: [3, 10.5, -11.5], tgt: [1.2, -1.4, .2] },
  3: { title: 'Phase 3', chip: ['chip--soon', 'dot--soon', 'Full build'], text: 'The full 12 MW site. Rooftop dry coolers and more liquid-cooled racks across the plant.', show: ['p1', 'p2', 'p3'], floor: true, roof: true,
    cam: [13, 14, -15], tgt: [1.4, 2.4, 0] }
};
let camAnim = null;
function setPhase(n, instant) {
  const P = PHASES[n];
  ['p1', 'p2', 'p3'].forEach(k => { groups[k].visible = P.show.includes(k); });
  groups.floorFront.visible = P.floor; groups.roof.visible = P.roof;
  document.getElementById('pTitle').textContent = P.title;
  const chip = document.getElementById('pChip');
  chip.className = 'chip ' + P.chip[0]; chip.innerHTML = '<i class="dot ' + P.chip[1] + '"></i>' + P.chip[2];
  document.getElementById('pText').textContent = P.text;
  document.querySelectorAll('[data-phase]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.phase === String(n))));
  const phone = view.clientWidth < 700;
  const s = phone ? 1.45 : 1;
  const tp = new THREE.Vector3(...P.tgt);
  const cp = new THREE.Vector3(...P.cam).sub(tp).multiplyScalar(s).add(tp);
  if (instant || reduce) { camera.position.copy(cp); controls.target.copy(tp); controls.update(); return; }
  camAnim = { t0: performance.now(), fp: camera.position.clone(), ft: controls.target.clone(), cp, tp };
}
document.querySelectorAll('[data-phase]').forEach(b => b.addEventListener('click', () => setPhase(+b.dataset.phase)));
controls.addEventListener('start', () => { camAnim = null; });

function size() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < 700 ? 50 : 40; camera.updateProjectionMatrix();
}
window.addEventListener('resize', size);
if ('ResizeObserver' in window) new ResizeObserver(size).observe(view);
size();
setPhase(1, true);
loading.remove();

// render only while visible
let visible = true;
if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(view);
const clock = new THREE.Clock();
(function loop() {
  requestAnimationFrame(loop);
  if (!visible) return;
  const t = clock.getElapsedTime();
  if (!reduce) tick.forEach(f => f(t));
  if (camAnim) {
    const u = Math.min(1, (performance.now() - camAnim.t0) / 1300), e = 1 - Math.pow(1 - u, 3);
    camera.position.lerpVectors(camAnim.fp, camAnim.cp, e);
    controls.target.lerpVectors(camAnim.ft, camAnim.tp, e);
    if (u >= 1) camAnim = null;
  }
  controls.update();
  renderer.render(scene, camera);
})();
