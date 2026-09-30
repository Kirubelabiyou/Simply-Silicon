/* Simply Silicon: Foundation scene.
   Downtown Calgary in 3D from City of Calgary open data (real footprints and rooftop heights),
   Foundation's private fiber on the real streets (routes and buildings from gosimply.ai's network map),
   and the plant itself, modelled after gosimply.ai's published plant model, phase by phase.
   Usage: mountScene(element, { side: 'right' }) */
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';
import { RoomEnvironment } from '../vendor/three/addons/RoomEnvironment.js';

const S = 4.2; // metres per plant-model unit
const COL = {
  ground: 0x97a3b0, sidewalk: 0xb8c2cc, road: 0x3e4751, lane: 0xf4f4f0, river: 0x9fc6e2,
  roof: 0xc9cfd6, roofDark: 0xaab3bd,
  fiber: 0x2aa3f5, fiberHot: 0xbfe8ff, trench: 0x2b3847,
  glass: 0x9fd0ef, mullion: 0x4e5966, plantRoof: 0x2d333b, steel: 0xaeb7c1, stainless: 0xd5dbe1, copper: 0xc27a4a,
  boiler: 0xc8423a, valve: 0x2f6fd6, rack: 0x1b2230, led: 0x4fb3f0, fan: 0x36df8c,
  cyan: 0x5ee5ff, cyanBright: 0x7fd6f5, blue: 0x3d7bff, amber: 0xffb45e, heat: 0xe8513c
};

export function mountScene(host, opts = {}) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAL = window.SS_CALGARY, BLD = window.SS_BUILDINGS || [];
  const phoneNow = () => host.clientWidth < 700;
  host.innerHTML = '';
  host.classList.add('scene--live');
  const loading = el('div', 'scene-loading', 'Loading 3D view');
  host.appendChild(loading);

  /* ---------- renderer, camera, light ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phoneNow() ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const labelLayer = el('div', 'scene-labels'); host.appendChild(labelLayer);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdfe8f1, 3200, 7000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 1, 9000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = 22; controls.maxDistance = 3200;
  controls.maxPolarAngle = Math.PI * .46;
  controls.screenSpacePanning = false;

  scene.add(new THREE.HemisphereLight(0xeaf3ff, 0xa9b4bf, .7));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(phoneNow() ? 1024 : 2048, phoneNow() ? 1024 : 2048);
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .5;
  scene.add(sun); scene.add(sun.target);
  function shadowAround(cx, cz, half) {
    sun.position.set(cx - half * .75, half * 1.35, cz - half * .95);
    sun.target.position.set(cx, 0, cz);
    const c = sun.shadow.camera; c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 1; c.far = half * 5; c.updateProjectionMatrix();
  }

  const tick = [];
  const mats = {};
  const mat = (k, color, o = {}) => (mats[k] = mats[k] || new THREE.MeshStandardMaterial({ color, roughness: .8, metalness: .05, ...o }));

  /* ---------- projection: metres from Foundation, x = east, z = south ---------- */
  const LNG0 = CAL.foundation.coordinate[0], LAT0 = CAL.foundation.coordinate[1];
  const KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KY = 110574;
  const P = (lng, lat) => [(lng - LNG0) * KX, -(lat - LAT0) * KY];

  /* ---------- building index (for road clearance, trees, connected buildings) ---------- */
  const PLANT_ZONE = { x0: -32, x1: 62, z0: -20, z1: 42 };
  const blds = [];
  BLD.forEach((b, i) => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, cx = 0, cz = 0;
    b.p.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); cx += x; cz += z; });
    cx /= b.p.length; cz /= b.p.length;
    if (cx > PLANT_ZONE.x0 && cx < PLANT_ZONE.x1 && cz > PLANT_ZONE.z0 && cz < PLANT_ZONE.z1) return; // Foundation itself is modelled separately
    blds.push({ i, p: b.p, h: Math.max(3, b.h), bb: [x0, x1, z0, z1], cx, cz });
  });
  const CELL = 60, grid = new Map();
  blds.forEach((b, k) => {
    for (let gx = Math.floor(b.bb[0] / CELL); gx <= Math.floor(b.bb[1] / CELL); gx++)
      for (let gz = Math.floor(b.bb[2] / CELL); gz <= Math.floor(b.bb[3] / CELL); gz++) {
        const key = gx + ',' + gz; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(k);
      }
  });
  function inPoly(x, z, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
  function bldAt(x, z) {
    const list = grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)); if (!list) return -1;
    for (const k of list) { const b = blds[k]; if (x < b.bb[0] || x > b.bb[1] || z < b.bb[2] || z > b.bb[3]) continue; if (inPoly(x, z, b.p)) return k; }
    return -1;
  }
  const inPlant = (x, z, m = 0) => x > PLANT_ZONE.x0 - m && x < PLANT_ZONE.x1 + m && z > PLANT_ZONE.z0 - m && z < PLANT_ZONE.z1 + m;

  /* ---------- connected buildings ---------- */
  const eps = CAL.endpoints.map(e => ({ ...e, p: P(e.c[0], e.c[1]) }));
  const connected = new Set();
  eps.forEach(e => {
    let k = bldAt(e.p[0], e.p[1]);
    if (k < 0) { let best = 1e9; blds.forEach((b, j) => { const d = Math.hypot(b.cx - e.p[0], b.cz - e.p[1]); if (d < best && d < 35) { best = d; k = j; } }); }
    e.b = k; e.top = k >= 0 ? blds[k].h : 0;
    if (k >= 0 && !e.generic) connected.add(k);
  });

  /* ---------- ground, river, roads ---------- */
  const city = new THREE.Group(); scene.add(city);
  {
    const gs = new THREE.Shape(); gs.moveTo(-4000, -4000); gs.lineTo(4000, -4000); gs.lineTo(4000, 4000); gs.lineTo(-4000, 4000); gs.lineTo(-4000, -4000);
    const hole = new THREE.Path(); const hb = { x0: -4.5 * S, x1: 6.85 * S, z0: -2.85 * S, z1: 2.85 * S };
    hole.moveTo(hb.x0, hb.z0); hole.lineTo(hb.x0, hb.z1); hole.lineTo(hb.x1, hb.z1); hole.lineTo(hb.x1, hb.z0); hole.lineTo(hb.x0, hb.z0); gs.holes.push(hole);
    const ground = new THREE.Mesh(new THREE.ShapeGeometry(gs).rotateX(Math.PI / 2), mat('ground', COL.ground, { roughness: 1, side: THREE.DoubleSide }));
    ground.receiveShadow = true; city.add(ground);
  }
  const RIVER = [[-114.0790, 51.0536], [-114.0680, 51.0546], [-114.0620, 51.0539], [-114.0570, 51.0526], [-114.0530, 51.0510], [-114.0495, 51.0499], [-114.0420, 51.0492]];
  const RIVER_HALF = 0.00042;
  const riverLatAt = lng => { for (let i = 1; i < RIVER.length; i++) if (lng <= RIVER[i][0]) { const a = RIVER[i - 1], b = RIVER[i], t = (lng - a[0]) / (b[0] - a[0]); return a[1] + t * (b[1] - a[1]); } return RIVER[RIVER.length - 1][1]; };
  {
    const top = RIVER.map(([lng, lat]) => P(lng, lat + RIVER_HALF)), bot = RIVER.map(([lng, lat]) => P(lng, lat - RIVER_HALF)).reverse();
    const rs = new THREE.Shape(); top.concat(bot).forEach((p, i) => i ? rs.lineTo(p[0], p[1]) : rs.moveTo(p[0], p[1]));
    const river = new THREE.Mesh(new THREE.ShapeGeometry(rs).rotateX(Math.PI / 2), mat('river', COL.river, { roughness: .15, metalness: .2, side: THREE.DoubleSide }));
    river.position.y = .2; river.receiveShadow = true; city.add(river);
  }
  const route = id => CAL.routes.find(r => r.id === id).c;
  function fitAve(pts) {
    const n = pts.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const b = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), a = (sy - b * sx) / n; return lng => a + b * lng;
  }
  const ave5 = fitAve(route('fifth-avenue-spine')), ave6 = fitAve(route('sixth-avenue-east').slice(0, 5));
  const ave8 = fitAve(route('eighth-avenue-west').concat(route('eighth-avenue-east'))), ave9 = fitAve(route('ninth-avenue-trunk'));
  const ave7 = lng => (ave6(lng) + ave8(lng)) / 2;
  const ave4 = lng => ave5(lng) + .00122, ave3 = lng => ave5(lng) + .00244;
  const ave10 = lng => ave9(lng) - .00105, ave11 = lng => ave9(lng) - .00198, ave12 = lng => ave9(lng) - .00291, ave13 = lng => ave9(lng) - .00384;
  const AVES = [['3 Ave', ave3], ['4 Ave', ave4], ['5 Ave', ave5], ['6 Ave', ave6], ['7 Ave', ave7], ['8 Ave', ave8], ['9 Ave', ave9], ['10 Ave', ave10], ['11 Ave', ave11], ['12 Ave', ave12], ['13 Ave', ave13]];
  const STREETS = [-114.07505, -114.07261, -114.07017, -114.06776, -114.06531, -114.06285, -114.06038, -114.05793, -114.05548, -114.05308, -114.05063, -114.04843, -114.04600];
  const roadRuns = [];
  {
    const roadM = mat('road', COL.road, { roughness: .92 }), walkM = mat('walk', COL.sidewalk, { roughness: .95 });
    const lineM = new THREE.MeshBasicMaterial({ color: COL.lane }); lineM.userData.lane = true;
    const stripQ = new Map(), dummy = new THREE.Object3D(), unitPlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    function strip(a, b, w, y, m) {
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 1) return;
      dummy.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); dummy.rotation.set(0, -Math.atan2(dz, dx), 0); dummy.scale.set(L + .6, 1, w); dummy.updateMatrix();
      if (!stripQ.has(m)) stripQ.set(m, []); stripQ.get(m).push([unitPlane, dummy.matrix.clone()]);
    }
    function clear(x, z, nx, nz, half) { return bldAt(x, z) < 0 && bldAt(x + nx * half, z + nz * half) < 0 && bldAt(x - nx * half, z - nz * half) < 0 && !inPlant(x, z, half); }
    function layLine(pts, w) {
      // walk the line in 6 m steps and keep only runs that are clear of buildings
      let run = [];
      const flush = () => { if (run.length > 2) { roadRuns.push(run); for (let i = 1; i < run.length; i++) { strip(run[i - 1], run[i], w + 7, .22, walkM); strip(run[i - 1], run[i], w, .3, roadM); } } run = []; };
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .1) continue;
        const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
        for (let d = 0; d <= L; d += 6) { const x = a[0] + (b[0] - a[0]) * d / L, z = a[1] + (b[1] - a[1]) * d / L; if (clear(x, z, nx, nz, w * .42)) run.push([x, z]); else flush(); }
      }
      flush();
    }
    AVES.forEach(([, f]) => { const pts = []; for (let lng = -114.0770; lng <= -114.0430; lng += .0008) { const lat = f(lng); if (lat < riverLatAt(lng) - RIVER_HALF - .00015) pts.push(P(lng, lat)); } layLine(pts, 20); });
    STREETS.forEach(lng => { const north = Math.min(ave3(lng) + .0008, riverLatAt(lng) - RIVER_HALF - .00015); layLine([P(lng, ave13(lng) - .0006), P(lng, north)], 18); });
    stripQ.forEach((list, m) => { const mesh = new THREE.Mesh(mergeGeos(list), m); mesh.receiveShadow = true; city.add(mesh); });
    // lane dashes
    const dashG = new THREE.PlaneGeometry(3.2, .45).rotateX(-Math.PI / 2);
    const dashes = new THREE.InstancedMesh(dashG, lineM, 6000); let dn = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    roadRuns.forEach(run => { for (let i = 1; i < run.length && dn < 6000; i++) { const a = run[i - 1], b = run[i]; q.setFromAxisAngle(up, -Math.atan2(b[1] - a[1], b[0] - a[0])); m4.compose(new THREE.Vector3((a[0] + b[0]) / 2, .34, (a[1] + b[1]) / 2), q, new THREE.Vector3(1, 1, 1)); dashes.setMatrixAt(dn++, m4); } });
    dashes.count = dn; city.add(dashes);
  }

  /* ---------- facade textures ---------- */
  function tex(draw, w = 256, h = 256) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  let rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const FAC = {
    glass: { size: [12, 12], t: tex((g, w, h) => { // curtain wall: 8 panels x 3 floors
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a9b6c3'); gr.addColorStop(1, '#6d7b8a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { g.fillStyle = `rgba(${rnd() > .5 ? '255,255,255' : '20,40,60'},${(rnd() * .12).toFixed(2)})`; g.fillRect(c * w / 8, r * h / 3, w / 8, h / 3); }
      g.fillStyle = '#6b7887'; for (let c = 0; c <= 8; c++) g.fillRect(c * w / 8 - 1, 0, 2, h); for (let r = 0; r <= 3; r++) g.fillRect(0, r * h / 3 - 3, w, 6);
    }), m: { roughness: .2, metalness: .25, envMapIntensity: .75 } },
    granite: { size: [12, 12], t: tex((g, w, h) => { // polished red granite with vertical window strips
      g.fillStyle = '#9b4a45'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${rnd() > .5 ? '40,15,15' : '230,170,160'},.14)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
      for (let c = 0; c < 6; c++) { g.fillStyle = '#2f3740'; g.fillRect(c * w / 6 + w / 24, 0, w / 12, h); g.fillStyle = 'rgba(170,200,225,.25)'; g.fillRect(c * w / 6 + w / 24 + 2, 0, w / 36, h); }
    }), m: { roughness: .3, metalness: .15, envMapIntensity: .9 } },
    dark: { size: [12, 12], t: tex((g, w, h) => {
      g.fillStyle = '#3e4b59'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { g.fillStyle = `rgba(160,190,215,${(.25 + rnd() * .2).toFixed(2)})`; g.fillRect(c * w / 6 + 5, r * h / 3 + 10, w / 6 - 10, h / 3 - 26); }
    }), m: { roughness: .35, metalness: .35, envMapIntensity: .8 } },
    office: { size: [12, 12], t: tex((g, w, h) => { // stone with ribbon windows
      g.fillStyle = '#cfc8bc'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < 3; r++) { const y = r * h / 3 + h / 3 * .28; g.fillStyle = '#556b80'; g.fillRect(0, y, w, h / 3 * .46); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y, w, 4); g.fillStyle = '#3f5061'; for (let c = 0; c <= 8; c++) g.fillRect(c * w / 8 - 1, y, 2, h / 3 * .46); }
    }), m: { roughness: .7, metalness: .05, envMapIntensity: .6 } },
    brick: { size: [12, 12], t: tex((g, w, h) => { // warm brick with punched windows
      g.fillStyle = '#b48468'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${rnd() > .5 ? '90,50,35' : '230,190,160'},.12)`; g.fillRect(rnd() * w, rnd() * h, 6, 3); }
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = c * w / 4 + w / 16, y = r * h / 3 + h / 14; g.fillStyle = '#e9e2d8'; g.fillRect(x - 2, y + h / 3 * .56, w / 8 + 4, 5); g.fillStyle = '#3b4a58'; g.fillRect(x, y, w / 8, h / 3 * .56); g.fillStyle = 'rgba(180,210,235,.35)'; g.fillRect(x + 2, y + 2, w / 16, h / 3 * .2); }
    }), m: { roughness: .85, metalness: 0, envMapIntensity: .4 } },
    conn: { size: [12, 12], t: tex((g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(1, '#2f9ff0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#3f7fb3'; for (let c = 0; c <= 8; c++) g.fillRect(c * w / 8 - 1, 0, 2, h); for (let r = 0; r <= 3; r++) g.fillRect(0, r * h / 3 - 2, w, 4);
    }), m: { roughness: .35, metalness: .1, envMapIntensity: .6, emissive: 0x1a8ae6, emissiveIntensity: .6 } }
  };
  function hash(i) { let x = (i * 2654435761) >>> 0; return (x % 1000) / 1000; }
  // Landmarks, matched to their real footprints (closest-assumption colours from public photos)
  const LANDMARKS = [
    { name: 'The Bow', ll: [-114.0620, 51.0478], kind: 'glass', tint: [.86, .9, .95], roof: [.5, .53, .57] },
    { name: 'Brookfield Place', ll: [-114.0660, 51.0472], kind: 'glass', tint: [.5, .64, .86], roof: [.42, .45, .5] },
    { name: 'Telus Sky', ll: [-114.0635, 51.0468], kind: 'glass', tint: [.93, .97, 1], roof: [.8, .82, .85] },
    { name: 'Suncor Energy Centre', ll: [-114.0641, 51.0479], kind: 'granite', tint: [1, 1, 1], roof: [.36, .3, .3] },
    { name: 'Bankers Hall', ll: [-114.0690, 51.0452], kind: 'office', tint: [1, .9, .76], roof: [.42, .6, .52] },
    { name: 'Calgary Tower', ll: [-114.0630, 51.0443], tower: true }
  ];
  const landmarkOf = new Map();
  LANDMARKS.forEach(L => {
    const [lx, lz] = P(L.ll[0], L.ll[1]); let best = -1, bd = 45;
    blds.forEach((b, k) => { if (b.h < 100) return; const d = Math.hypot(b.cx - lx, b.cz - lz); if (d < bd) { bd = d; best = k; } });
    if (best >= 0) landmarkOf.set(best, L);
  });
  const PAL = {
    glass: [[.62, .74, .9], [.58, .8, .8], [.88, .9, .93], [.9, .78, .62], [.5, .62, .8], [.72, .84, .92]],
    dark: [[.62, .68, .76], [.5, .55, .62], [.72, .66, .6]],
    office: [[1, .93, .82], [.95, .94, .9], [.86, .87, .88], [.98, .88, .74]],
    brick: [[.95, .72, .62], [1, .88, .74], [.8, .62, .56], [.9, .82, .72]],
    granite: [[1, 1, 1]], conn: [[1, 1, 1]]
  };
  const ROOF = [[.4, .42, .45], [.28, .3, .34], [.66, .68, .71], [.47, .45, .42], [.36, .45, .34]];
  function styleFor(b, k) {
    const L = landmarkOf.get(k);
    if (connected.has(k)) return { kind: 'conn', tint: [1, 1, 1], roof: [.2, .62, 1] };
    if (L && !L.tower) return L;
    const r = hash(b.i);
    const kind = b.h > 90 ? (r < .8 ? 'glass' : 'dark') : b.h > 35 ? (r < .5 ? 'glass' : r < .72 ? 'office' : 'dark') : b.h > 14 ? (r < .5 ? 'office' : r < .85 ? 'brick' : 'glass') : (r < .6 ? 'brick' : 'office');
    const pal = PAL[kind], tint = pal[Math.floor(hash(b.i * 5 + 1) * pal.length)];
    const rr = hash(b.i * 3 + 7), roof = kind === 'glass' || kind === 'dark' ? ROOF[1] : rr < .06 ? ROOF[4] : ROOF[Math.floor(rr * 4)];
    return { kind, tint, roof };
  }

  /* ---------- buildings (merged by facade type, near and far groups) ---------- */
  const NEAR = 170;
  let towerAt = null;
  const buckets = {};
  const bucket = key => (buckets[key] = buckets[key] || { pos: [], nrm: [], uv: [], col: [], roofPos: [], roofIdx: [], roofCol: [], edges: [] });
  blds.forEach((b, k) => {
    const L0 = landmarkOf.get(k); if (L0 && L0.tower) { towerAt = b; b.h = Math.min(b.h, 22); }
    const st = styleFor(b, k), kind = st.kind, near = Math.hypot(b.cx, b.cz) < NEAR;
    const B = bucket(kind + (near ? ':near' : ':far'));
    let p = b.p.slice();
    let area = 0; for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; area += x1 * z2 - x2 * z1; }
    if (area < 0) p.reverse(); // make winding consistent so walls face outward
    const [sw, sh] = FAC[kind].size;
    const tc = st.tint;
    let u = 0;
    for (let i = 0; i < p.length; i++) {
      const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length], L = Math.hypot(x2 - x1, z2 - z1); if (L < .05) continue;
      const nx = (z2 - z1) / L, nz = -(x2 - x1) / L; // outward for this winding
      const u0 = u / sw, u1 = (u + L) / sw, v1 = b.h / sh;
      B.pos.push(x1, 0, z1, x2, 0, z2, x2, b.h, z2, x1, 0, z1, x2, b.h, z2, x1, b.h, z1);
      for (let n = 0; n < 6; n++) { B.nrm.push(nx, 0, nz); B.col.push(tc[0], tc[1], tc[2]); }
      B.uv.push(u0, 0, u1, 0, u1, v1, u0, 0, u1, v1, u0, v1);
      u += L;
    }
    // roof (triangulated footprint)
    const shp = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const tris = THREE.ShapeUtils.triangulateShape(shp.getPoints(), []);
    const base = B.roofPos.length / 3;
    const rc = st.roof;
    p.forEach(([x, z]) => { B.roofPos.push(x, b.h, z); B.roofCol.push(rc[0], rc[1], rc[2]); });
    tris.forEach(t => B.roofIdx.push(base + t[0], base + t[2], base + t[1]));
    if (kind === 'conn') p.forEach(([x, z], i) => { const [x2, z2] = p[(i + 1) % p.length]; B.edges.push(x, b.h + .3, z, x2, b.h + .3, z2); });
  });
  const nearMats = [];
  const buildingMeshes = [];
  Object.entries(buckets).forEach(([key, B]) => {
    const [kind, zone] = key.split(':');
    const f = FAC[kind];
    const wallMat = new THREE.MeshStandardMaterial({ map: f.t, color: 0xffffff, vertexColors: true, ...f.m });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, metalness: .05, vertexColors: true, ...(kind === 'conn' ? { emissive: 0x1f93ec, emissiveIntensity: .35 } : {}) });
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    wg.setAttribute('normal', new THREE.Float32BufferAttribute(B.nrm, 3));
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
    wg.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
    const walls = new THREE.Mesh(wg, wallMat); walls.castShadow = true; walls.receiveShadow = true; city.add(walls);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(B.roofPos, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(B.roofCol, 3)); rg.setIndex(B.roofIdx); rg.computeVertexNormals();
    const roofs = new THREE.Mesh(rg, roofMat); roofs.castShadow = true; roofs.receiveShadow = true; city.add(roofs);
    buildingMeshes.push(walls, roofs);
    if (B.edges.length) {
      const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(B.edges, 3));
      city.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x9fe0ff })));
    }
    if (zone === 'near') nearMats.push(wallMat, roofMat);
  });
  // Calgary Tower: concrete shaft with the observation pod and red crown
  if (towerAt) {
    const T = new THREE.Group(); T.position.set(towerAt.cx, 22, towerAt.cz); city.add(T);
    const conc = mat('towerConc', 0xd9d4ca, { roughness: .8 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 8.5, 136, 20), conc); shaft.position.y = 68; T.add(shaft);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(14, 12, 9, 28), mat('towerPod', 0x3a4450, { roughness: .2, metalness: .6 })); pod.position.y = 140; T.add(pod);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 2.2, 28), mat('towerDeck', 0xe8e4dc, { roughness: .6 })); deck.position.y = 145.5; T.add(deck);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 13.5, 7, 28), mat('towerRed', 0xb3262d, { roughness: .45 })); crown.position.y = 150; T.add(crown);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.7, 1.4, 20, 8), mat('towerMast', 0xc9ced3, { metalness: .6, roughness: .3 })); mast.position.y = 163; T.add(mast);
    T.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  // rooftop plant on taller buildings
  {
    const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, .5, 0);
    const im = new THREE.InstancedMesh(g, mat('rtu', 0xb4bcc5, { roughness: .6, metalness: .3 }), 900); let n = 0; const m4 = new THREE.Matrix4();
    blds.forEach(b => {
      if (b.h < 18 || n > 880) return;
      const w = b.bb[1] - b.bb[0], d = b.bb[3] - b.bb[2], cnt = Math.min(4, 1 + Math.floor(hash(b.i + 3) * 4));
      for (let j = 0; j < cnt; j++) {
        const x = b.cx + (hash(b.i * 7 + j) - .5) * w * .4, z = b.cz + (hash(b.i * 13 + j) - .5) * d * .4;
        if (!inPoly(x, z, b.p)) continue;
        m4.compose(new THREE.Vector3(x, b.h, z), new THREE.Quaternion(), new THREE.Vector3(3 + hash(b.i + j) * 5, 1.6 + hash(b.i * 3 + j) * 2.2, 3 + hash(b.i * 5 + j) * 5));
        im.setMatrixAt(n++, m4);
      }
    });
    im.count = n; im.castShadow = true; city.add(im);
  }
  // street trees
  {
    const trunkG = new THREE.CylinderGeometry(.25, .35, 3, 6); trunkG.translate(0, 1.5, 0);
    const crownG = new THREE.IcosahedronGeometry(2.6, 1); crownG.translate(0, 4.6, 0);
    const trunks = new THREE.InstancedMesh(trunkG, mat('trunk', 0x7b6a58), 700), crowns = new THREE.InstancedMesh(crownG, mat('crown', 0xffffff, { roughness: .9 }), 700);
    let n = 0; const m4 = new THREE.Matrix4(), col = new THREE.Color();
    roadRuns.forEach(run => {
      for (let i = 2; i < run.length - 1 && n < 700; i += 3) {
        const a = run[i - 1], b = run[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
        [1, -1].forEach(sgn => {
          if (n >= 700 || hash(i * 31 + n) < .35) return;
          const x = b[0] + nx * 13 * sgn, z = b[1] + nz * 13 * sgn;
          if (bldAt(x, z) >= 0 || inPlant(x, z, 4)) return;
          const s = .8 + hash(n * 17) * .5;
          m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
          trunks.setMatrixAt(n, m4); crowns.setMatrixAt(n, m4);
          crowns.setColorAt(n, col.setHSL(.27 + hash(n) * .06, .32, .45 + hash(n * 3) * .1)); n++;
        });
      }
    });
    trunks.count = crowns.count = n; crowns.castShadow = true; city.add(trunks, crowns);
  }

  /* ---------- fiber: underground conduits, seen through the street, with current travelling through them ---------- */
  const fiber = new THREE.Group(); scene.add(fiber);
  const DEPTH = -3.2;
  {
    const glowTex = radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    const coreM = new THREE.MeshBasicMaterial({ color: 0x1f93ec, transparent: true, opacity: 1, depthWrite: false });
    const trunkCoreM = new THREE.MeshBasicMaterial({ color: 0x0f7fd8, transparent: true, opacity: 1, depthWrite: false });
    const sleeveM = new THREE.MeshBasicMaterial({ color: 0x4db2ef, transparent: true, opacity: .26, depthWrite: false });
    const ends = [];
    CAL.routes.forEach(r => {
      const pts = r.c.map(([lng, lat]) => P(lng, lat)).filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > .2);
      if (pts.length < 2) return;
      const curve = new THREE.CurvePath();
      for (let i = 1; i < pts.length; i++) curve.add(new THREE.LineCurve3(new THREE.Vector3(pts[i - 1][0], DEPTH, pts[i - 1][1]), new THREE.Vector3(pts[i][0], DEPTH, pts[i][1])));
      const L = curve.getLength(), seg = Math.max(6, Math.round(L / 5));
      fiber.add(new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r.trunk ? 2.4 : 1.6, 8, false), r.trunk ? trunkCoreM : coreM));
      fiber.add(new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r.trunk ? 7.5 : 5.5, 8, false), sleeveM));
      ends.push(pts[0], pts[pts.length - 1]);
      if (!reduce) {
        const count = Math.max(1, Math.round(L / (r.trunk ? 60 : 95)));
        for (let k = 0; k < count; k++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xe6f7ff, transparent: true, depthWrite: false, sizeAttenuation: false }));
          s.scale.set(r.trunk ? .03 : .022, r.trunk ? .03 : .022, 1); fiber.add(s);
          const off = k / count, speed = (r.trunk ? 95 : 70) / L;
          tick.push(t => { const u = (t * speed + off) % 1; s.position.copy(curve.getPointAt(u)); });
        }
      }
    });
    // manhole covers on the street where runs meet
    const lidG = new THREE.CylinderGeometry(1.5, 1.5, .12, 20), lidM = mat('lid', 0x39424c, { roughness: .45, metalness: .6 });
    const lids = new THREE.InstancedMesh(lidG, lidM, ends.length); const m4 = new THREE.Matrix4();
    ends.forEach((p, i) => { m4.makeTranslation(p[0], .42, p[1]); lids.setMatrixAt(i, m4); }); lids.receiveShadow = true; fiber.add(lids);
    // risers: light carried up from the conduit into each connected building
    const beamM = new THREE.MeshBasicMaterial({ color: COL.fiber, transparent: true, opacity: .6, depthWrite: false });
    eps.forEach(e => {
      const top = e.generic ? 6 : Math.max(8, e.top);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, top - DEPTH, 8), beamM); beam.position.set(e.p[0], (top + DEPTH) / 2, e.p[1]); fiber.add(beam);
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.6, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COL.fiber, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
      ring.position.set(e.p[0], top + .6, e.p[1]); fiber.add(ring);
      if (!reduce) { const ph = hash(e.id.length * 9 + e.p[0]); tick.push(t => { const f = (t * .6 + ph) % 1, sc = 1 + f * .9; ring.scale.set(sc, 1, sc); ring.material.opacity = .9 * (1 - f); }); }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, .8, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); cap.position.set(e.p[0], top + .4, e.p[1]); fiber.add(cap);
    });
  }
  // draw the fiber after the street so its glow reads through it; buildings still hide it
  fiber.traverse(o => { o.renderOrder = 6; });
  // let the fiber read through the street: ground, sidewalks and roads are slightly see-through
  ['ground', 'road', 'walk'].forEach(k => { const m = mats[k]; if (m) { m.transparent = true; m.opacity = k === 'road' ? .95 : .97; m.depthWrite = false; } });
  // layer the see-through street surfaces in a fixed order: ground, sidewalks, roads, lane paint, then fiber glow
  const layer = new Map([[mats.ground, 1], [mats.walk, 2], [mats.road, 3]]);
  city.traverse(o => { if (!o.isMesh && !o.isInstancedMesh) return; if (layer.has(o.material)) o.renderOrder = layer.get(o.material); if (o.material && o.material.userData.lane) { o.material.transparent = true; o.material.depthWrite = false; o.renderOrder = 4; } });

  /* ---------- the plant ---------- */
  const plant = buildPlant(mat, tick);
  plant.root.scale.setScalar(S);
  scene.add(plant.root);
  plant.root.traverse(o => { if (o.isPointLight) { o.distance *= S; o.intensity *= S * S; } });

  /* ---------- labels (screen space, never overlapping) ---------- */
  const labels = [];
  function addLabel(text, pos, cls, modes, onClick) {
    const d = el('div', 's-lbl ' + (cls || ''), text); labelLayer.appendChild(d);
    if (onClick) { d.classList.add('click'); d.setAttribute('role', 'button'); d.tabIndex = 0; d.addEventListener('click', onClick); d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }); }
    labels.push({ d, pos: new THREE.Vector3(...pos), modes, w: 0 });
  }
  addLabel('Foundation', [0, 34, 0], 'main', ['net'], () => setView(1));
  eps.forEach(e => { if (!e.generic) addLabel(e.name, [e.p[0], Math.max(8, e.top) + 6, e.p[1]], '', ['net']); });
  AVES.slice(2, 8).forEach(([name, f]) => { const lng = -114.0712; const p = P(lng, f(lng)); addLabel(name, [p[0], 1, p[1]], 'street', ['net']); });
  [[-114.06285, 'Centre St'], [-114.05308, '4 St SE'], [-114.06531, '1 St SW']].forEach(([lng, name]) => { const lat = (ave9(lng) + ave10(lng)) / 2; const p = P(lng, lat); addLabel(name, [p[0], 1, p[1]], 'street', ['net']); });
  { const p = P(-114.0655, riverLatAt(-114.0655)); addLabel('Bow River', [p[0], 1, p[1]], 'street', ['net']); }
  const tmp = new THREE.Vector3();
  function placeLabels() {
    const W = host.clientWidth, H = host.clientHeight, boxes = [];
    const cr = card.getBoundingClientRect(), hr = host.getBoundingClientRect();
    if (!card.hidden) boxes.push({ x: cr.left - hr.left, y: cr.top - hr.top, w: cr.width, h: cr.height });
    const order = labels.slice().sort((a, b) => (b.d.classList.contains('main') - a.d.classList.contains('main')));
    order.forEach(l => {
      if (!l.modes.includes(mode)) { l.d.style.opacity = 0; l.d.style.pointerEvents = 'none'; return; }
      tmp.copy(l.pos).project(camera);
      const x = (tmp.x + 1) / 2 * W, y = (1 - tmp.y) / 2 * H;
      const w = l.w || (l.w = l.d.offsetWidth || 80), h = l.d.offsetHeight || 24;
      const street = l.d.classList.contains('street');
      const bx = { x: x - w / 2, y: street ? y - h / 2 : y - h - 8, w, h };
      const off = tmp.z > 1 || bx.x < 4 || bx.x + w > W - 4 || bx.y < 4 || bx.y + h > H - 60;
      const hit = boxes.some(o => bx.x < o.x + o.w + 4 && bx.x + bx.w + 4 > o.x && bx.y < o.y + o.h + 3 && bx.y + bx.h + 3 > o.y);
      const far = !street && !l.d.classList.contains('main') && camera.position.distanceTo(l.pos) > 2300;
      if (off || hit || far) { l.d.style.opacity = 0; l.d.style.pointerEvents = 'none'; return; }
      boxes.push(bx);
      l.d.style.opacity = 1; l.d.style.pointerEvents = l.d.classList.contains('click') ? 'auto' : 'none';
      l.d.style.transform = 'translate(' + bx.x.toFixed(1) + 'px,' + bx.y.toFixed(1) + 'px)';
    });
  }

  /* ---------- UI ---------- */
  const card = el('div', 'scene-card'); host.appendChild(card);
  const ui = el('div', 'scene-ui'); host.appendChild(ui);
  const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'View'); ui.appendChild(seg);
  const hint = el('span', 'scene-hint', 'Drag to rotate · pinch or scroll to zoom · tap Foundation to go inside'); ui.appendChild(hint);
  const VIEWS = {
    net: { name: 'Network', title: 'Foundation', sub: 'Calgary, Alberta', chip: ['chip--live', 'dot--live', 'Online'],
      text: 'Foundation brings 12 MW of secure AI capacity to downtown Calgary.',
      kv: [['12 MW', 'n+1 redundant power'], ['7 km', 'Private fiber'], ['25+', 'Connected buildings'], ['100 kW', 'Phase 1, online']],
      cam: [260, 760, 900], tgt: [-420, 0, -120], show: [], floor: true, roof: true, fade: false },
    1: { name: 'Phase 1', title: 'Phase 1', sub: 'Foundation', chip: ['chip--live', 'dot--live', 'Online'], text: 'Ground floor. 100 kW of air-cooled GPU racks, running now.',
      cam: [-20, 36, -68], tgt: [-6, 4, 0], show: ['p1'], floor: true, roof: false, fade: true },
    2: { name: 'Phase 2', title: 'Phase 2', sub: 'Foundation', chip: ['chip--dev', 'dot--dev', 'Feb 2027'], text: '2 MW. Liquid-cooled racks in the basement, with a plate heat exchanger tied to the plant.',
      cam: [12, 62, -38], tgt: [5, -7, 1], show: ['p1', 'p2'], floor: false, roof: false, fade: true },
    3: { name: 'Phase 3', title: 'Phase 3', sub: 'Foundation', chip: ['chip--soon', 'dot--soon', 'Full build'], text: '12 MW. Rooftop dry coolers and liquid-cooled racks across the plant.',
      cam: [70, 70, -80], tgt: [8, 10, 4], show: ['p1', 'p2', 'p3'], floor: true, roof: true, fade: true }
  };
  ['net', 1, 2, 3].forEach(k => {
    const b = el('button', '', VIEWS[k].name); b.type = 'button'; b.dataset.v = k;
    b.addEventListener('click', () => setView(k)); seg.appendChild(b);
  });
  let mode = 'net', camAnim = null;
  function setView(k, instant) {
    const V = VIEWS[k]; mode = k === 'net' ? 'net' : 'phase';
    ['p1', 'p2', 'p3'].forEach(g => { plant.groups[g].visible = V.show.includes(g); });
    plant.groups.floorFront.visible = V.floor; plant.groups.roof.visible = V.roof;
    nearMats.forEach(m => { m.transparent = V.fade; m.opacity = V.fade ? .12 : 1; m.depthWrite = !V.fade; m.needsUpdate = true; });
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(k))));
    card.innerHTML = '<div class="t"><div><b>' + V.title + '</b><span class="sub">' + V.sub + '</span></div><span class="chip ' + V.chip[0] + '"><i class="dot ' + V.chip[1] + '"></i>' + V.chip[2] + '</span></div><p>' + V.text + '</p>' +
      (V.kv ? '<div class="kv">' + V.kv.map(x => '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('') + '</div>' : '') +
      '';
    if (mode === 'net') shadowAround(-380, 40, 1150); else shadowAround(0, 0, 110);
    const s = phoneNow() ? (k === 'net' ? 1.45 : 1.6) : 1;
    const tp = new THREE.Vector3(...V.tgt), cp = new THREE.Vector3(...V.cam).sub(tp).multiplyScalar(s).add(tp);
    if (instant || reduce) { camera.position.copy(cp); controls.target.copy(tp); controls.update(); return; }
    camAnim = { t0: performance.now(), fp: camera.position.clone(), ft: controls.target.clone(), cp, tp, ms: 1700 };
  }
  controls.addEventListener('start', () => { camAnim = null; });

  // tap the plant to go inside
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    if (pickPlant(e) && mode === 'net') setView(1);
  });
  renderer.domElement.addEventListener('pointermove', e => { if (mode === 'net' && !e.buttons) renderer.domElement.style.cursor = pickPlant(e) ? 'pointer' : ''; });
  function pickPlant(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects([plant.root, ...buildingMeshes], true);
    return hits.length && !buildingMeshes.includes(hits[0].object);
  }

  function size() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < 700 ? 50 : 38; camera.updateProjectionMatrix();
  }
  const ro = 'ResizeObserver' in window ? new ResizeObserver(size) : null;
  if (ro) ro.observe(host); else window.addEventListener('resize', size);
  size();
  setView(opts.view || 'net', true);
  const reveal = () => { loading.remove(); host.classList.add('scene--ready'); };
  let firstFrame = true;

    let compiled = false;
  (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve()).catch(() => {}).then(() => { compiled = true; if (window.__prof) console.log('PROF compiled', Math.round(performance.now()), renderer.info.programs.length); });
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
    if (!compiled) return;
    renderer.render(scene, camera);
    placeLabels();
    if (firstFrame) { firstFrame = false; if (window.__prof) console.log('PROF frame', Math.round(performance.now()), JSON.stringify(renderer.info.render), renderer.info.memory.geometries); requestAnimationFrame(reveal); }
  })();

  return {
    setView,
    destroy() { alive = false; if (ro) ro.disconnect(); if (io) io.disconnect(); controls.dispose(); renderer.dispose(); pmrem.dispose(); host.innerHTML = ''; }
  };
}

function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text) d.textContent = text; return d; }
function radial(a, b) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, a); r.addColorStop(1, b); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function noiseTex(base, amt) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2200; i++) { const v = Math.random() > .5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${amt})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function mergeGeos(list) {
  // list of [geometry, matrix]; returns one non-indexed geometry with position + normal
  const pos = [], nrm = [];
  list.forEach(([g, m]) => {
    const gg = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
    pos.push(...gg.attributes.position.array); nrm.push(...gg.attributes.normal.array);
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}
function heatSignTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 220; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 220); gr.addColorStop(0, '#9ea5ad'); gr.addColorStop(1, '#858d96'); g.fillStyle = gr; g.fillRect(0, 0, 512, 220);
  g.fillStyle = '#f4f6f8'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = '700 92px "Arial Black", Arial, sans-serif'; g.fillText('CALGARY', 26, 112);
  g.font = '600 58px Arial, sans-serif'; g.fillText('district heating', 28, 180);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function signTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#1e2329'; g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#4db2ef'; g.font = '700 92px Quicksand, Nunito, "Varela Round", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('simply silicon.', 512, 68);
  g.fillStyle = '#9fb3c8'; g.font = '500 30px Arial, sans-serif';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- Plant model (units; scaled into metres by the caller) ---------- */
function buildPlant(mat, tick) {
  const root = new THREE.Group();
  const groups = { base: new THREE.Group(), p1: new THREE.Group(), p2: new THREE.Group(), p3: new THREE.Group(), roof: new THREE.Group(), floorFront: new THREE.Group() };
  Object.values(groups).forEach(g => root.add(g));
  const HALL = { w: -5.8, e: 8.45, f: -3.45, r: 3.3, R: 2.7, H: 3.2 };
  const BASE = { x0: -4.5, x1: 6.85, z0: -2.85, z1: 2.85, depth: 2.3 };
  function box(w, h, d, m, x = 0, y = 0, z = 0, parent) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; }
  function cyl(r, h, m, x, y, z, parent, seg = 24) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); c.position.set(x, y + h / 2, z); c.castShadow = true; c.receiveShadow = true; parent.add(c); return c; }
  function pipe(points, r, m, parent) { const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0); const t = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), r, 10, false), m); t.castShadow = true; parent.add(t); return t; }
  function hallShape(inset = 0) {
    const { w, e, f, r, R } = HALL; const s = new THREE.Shape();
    const W0 = w + inset, E0 = e - inset, F0 = f + inset, R0 = r - inset, RR = R - inset;
    s.moveTo(W0, R0); s.lineTo(W0, F0 + RR); s.absarc(W0 + RR, F0 + RR, RR, Math.PI, Math.PI * 1.5, false);
    s.lineTo(E0 - RR, F0); s.absarc(E0 - RR, F0 + RR, RR, Math.PI * 1.5, Math.PI * 2, false); s.lineTo(E0, R0); s.lineTo(W0, R0); return s;
  }
  const B = groups.base;
  const concrete = new THREE.MeshStandardMaterial({ map: noiseTex('#cfd4d9', .05), roughness: .9 });
  const floorM = new THREE.MeshStandardMaterial({ map: noiseTex('#c2c9d0', .06), roughness: .75 });
  // site: plaza, yard, curb
  { const ps = new THREE.Shape(); ps.moveTo(-7.1, -4.8); ps.lineTo(9.7, -4.8); ps.lineTo(9.7, 5.2); ps.lineTo(-7.1, 5.2); ps.lineTo(-7.1, -4.8);
    const ph = new THREE.Path(); ph.moveTo(BASE.x0, BASE.z0); ph.lineTo(BASE.x0, BASE.z1); ph.lineTo(BASE.x1, BASE.z1); ph.lineTo(BASE.x1, BASE.z0); ph.lineTo(BASE.x0, BASE.z0); ps.holes.push(ph);
    const pad = new THREE.Mesh(new THREE.ExtrudeGeometry(ps, { depth: .1, bevelEnabled: false }).rotateX(Math.PI / 2), mat('pad0', 0xe8ecf0, { roughness: .95 })); pad.position.y = .1; pad.receiveShadow = true; B.add(pad); }
  box(8.4, .12, 5.6, mat('yard', 0xd5dbe1), 9.8, 0, 6.2, B).castShadow = false;
  // glass hall with mullions
  {
    const pts = hallShape().getPoints(32), edge = pts.slice(0, pts.length - 1), ribbon = [];
    for (let i = 0; i < edge.length; i++) { if (i > 0 && edge[i].y > HALL.r - .01 && edge[i - 1].y > HALL.r - .01) break; ribbon.push(edge[i]); }
    const pos = [], idx = [];
    ribbon.forEach((p, i) => { pos.push(p.x, .12, p.y, p.x, HALL.H, p.y); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    B.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xb9dcf2, transparent: true, opacity: .28, roughness: .04, metalness: .1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false })));
    const mm = mat('mullion', COL.mullion, { metalness: .7, roughness: .35 });
    const path = new THREE.CurvePath(); for (let i = 1; i < ribbon.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(ribbon[i - 1].x, 0, ribbon[i - 1].y), new THREE.Vector3(ribbon[i].x, 0, ribbon[i].y)));
    const n = Math.round(path.getLength() / .75);
    const mg = new THREE.BoxGeometry(.045, HALL.H - .12, .06), ml = [];
    for (let i = 0; i <= n; i++) { const p = path.getPointAt(i / n); ml.push([mg, new THREE.Matrix4().makeTranslation(p.x, .12 + (HALL.H - .12) / 2, p.z)]); }
    B.add(new THREE.Mesh(mergeGeos(ml), mm));
    [.12, 1.05, 2.1, HALL.H - .04].forEach(y => pipe(ribbon.map(p => [p.x, y, p.y]), .028, mm, B));
    box(HALL.e - HALL.w, HALL.H, .2, concrete, (HALL.w + HALL.e) / 2, 0, HALL.r - .1, B);
    box(BASE.x1 - BASE.x0, .12, BASE.z1, floorM, (BASE.x0 + BASE.x1) / 2, -.12, BASE.z1 / 2, B);
    box(BASE.x1 - BASE.x0, .12, -BASE.z0, floorM, (BASE.x0 + BASE.x1) / 2, -.12, BASE.z0 / 2, groups.floorFront);
    const hs = hallShape(); const hh = new THREE.Path(); hh.moveTo(BASE.x0, BASE.z0); hh.lineTo(BASE.x0, BASE.z1); hh.lineTo(BASE.x1, BASE.z1); hh.lineTo(BASE.x1, BASE.z0); hh.lineTo(BASE.x0, BASE.z0); hs.holes.push(hh);
    const hsm = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: .12, bevelEnabled: false }).rotateX(Math.PI / 2), floorM); hsm.position.y = .12; hsm.receiveShadow = true; B.add(hsm);
    const roofG = new THREE.ExtrudeGeometry(hallShape(.05), { depth: .22, bevelEnabled: false }).rotateX(Math.PI / 2);
    const roof = new THREE.Mesh(roofG, mat('proof', 0x3a4048, { roughness: .7 })); roof.position.y = HALL.H + .26; roof.castShadow = true; roof.receiveShadow = true; groups.roof.add(roof);
    const bs = hallShape(); bs.holes.push(hallShape(.3));
    const band = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: .34, bevelEnabled: false }).rotateX(Math.PI / 2), mat('band', 0x1e2329, { roughness: .45, metalness: .3 })); band.position.y = HALL.H + .34; band.castShadow = true; B.add(band);
    // Calgary District Heating sign on the roof edge (the plant's own name), Simply Silicon below on the band
    const eM = mat('signEdge', 0x7c848d, { metalness: .4, roughness: .5 }), hsM = [eM, eM, eM, eM, new THREE.MeshStandardMaterial({ map: heatSignTex(), roughness: .5, metalness: .2 }), eM];
    const heatSign = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.25, .22), hsM); heatSign.position.set(-2.4, HALL.H + .34 + .62, HALL.f + .35); heatSign.rotation.y = Math.PI; heatSign.castShadow = true; B.add(heatSign);
    const ss = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .27), new THREE.MeshBasicMaterial({ map: signTex() })); ss.position.set(3.4, HALL.H + .17, HALL.f - .006); ss.rotation.y = Math.PI; B.add(ss);
    box(2.55, 1.7, 3.0, concrete, HALL.e + 1.35, 0, 1.4, B);
    box(1.2, 1.25, .04, mat('door', 0x8a939d, { metalness: .6, roughness: .35 }), HALL.e + 1.35, 0, -.12, B);
    for (let y = .1; y < 1.25; y += .1) box(1.2, .012, .05, mat('doorline', 0x6c7681), HALL.e + 1.35, y, -.13, B).castShadow = false;
  }
  { // plant equipment
    const boilerM = mat('boiler', COL.boiler, { roughness: .45, metalness: .35 });
    const steelM = mat('steel', COL.steel, { metalness: .85, roughness: .28 });
    const valveM = mat('valve', COL.valve, { metalness: .4, roughness: .4 });
    [-4.9, -2.8, -.7].forEach(x => { box(1.9, 1.38, 1.34, boilerM, x + .9, .12, 2.3, B); box(1.95, .08, 1.4, steelM, x + .9, 1.5, 2.3, B); cyl(.14, .9, steelM, x + .4, 1.58, 2.3, B, 16); });
    [[1.9, 2.4], [3.1, 2.4]].forEach(([x, z]) => {
      box(1.0, .12, .7, steelM, x, .12, z, B);
      cyl(.18, .5, mat('motor', 0x3b4450, { metalness: .5 }), x - .2, .24, z, B, 16).rotation.z = Math.PI / 2;
      const w = new THREE.Mesh(new THREE.TorusGeometry(.14, .025, 8, 20), valveM); w.position.set(x + .3, .75, z - .36); B.add(w);
    });
    [5.2, 6.4, 7.6].forEach(x => { cyl(.52, 1.82, mat('tank', 0xe4e8ec, { metalness: .6, roughness: .22 }), x, .12, 2.3, B, 32); const cap = new THREE.Mesh(new THREE.SphereGeometry(.52, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('tank', 0xe4e8ec)); cap.position.set(x, 1.94, 2.3); cap.scale.y = .35; B.add(cap); });
    pipe([[-5.4, 2.6, 2.95], [8.2, 2.6, 2.95]], .09, steelM, B);
    pipe([[-5.4, 2.85, 2.95], [8.2, 2.85, 2.95]], .07, mat('hotpipe', COL.heat, { roughness: .45 }), B);
    box(2.4, 1.5, 1.6, mat('sub', 0x8e99a5, { metalness: .55, roughness: .4 }), 7.2, .12, 6.2, B);
    for (let i = 0; i < 6; i++) box(.05, 1.2, 1.64, mat('fin', 0x77828e, { metalness: .5 }), 6.2 + i * .36, .27, 6.2, B).castShadow = false;
    const fenceM = mat('fence', 0x9aa4ae, { metalness: .6, roughness: .4 });
    [[5.6, 4.6, 8.6, .04], [5.6, 7.8, 8.6, .04]].forEach(([x0, z, x1]) => box(x1 - x0 + 5, .9, .03, fenceM, (x0 + x1 + 5) / 2, .12, z, B).castShadow = false);
    const gen = cyl(.55, 2.4, mat('gen', 0xd9dde1, { metalness: .5, roughness: .35 }), 10.9, -.65, 6.2, B); gen.rotation.z = Math.PI / 2; gen.position.y = .72;
    box(2.6, .15, 1.0, steelM, 10.9, .12, 6.2, B);
    const stackM = mat('stack', 0xa3adb8, { metalness: .75, roughness: .28 });
    const steamTex = radial('rgba(255,255,255,.9)', 'rgba(255,255,255,0)');
    const frameM = mat('stackFrame', 0xf4f6f8, { roughness: .45, metalness: .2 }), fl = [];
    const post = new THREE.BoxGeometry(.06, 2.3, .06), bar = new THREE.BoxGeometry(.72, .05, .05);
    [-4.2, -2.9, -1.6, -.3].forEach(x => {
      const y0 = HALL.H + .34, w = .36, lv = [0, .77, 1.54, 2.3];
      [[-w, -w], [w, -w], [w, w], [-w, w]].forEach(([dx, dz]) => fl.push([post, new THREE.Matrix4().makeTranslation(x + dx, y0 + 1.15, 2.6 + dz)]));
      for (let l = 0; l < 3; l++) {
        const ya = y0 + lv[l], yb = y0 + lv[l + 1], len = Math.hypot(.72, yb - ya), ang = Math.atan2(yb - ya, .72);
        const dg = new THREE.BoxGeometry(len, .045, .045);
        [[0, -w], [0, w]].forEach(([dx, dz]) => { [ang, -ang].forEach(a => fl.push([dg, new THREE.Matrix4().makeTranslation(x, (ya + yb) / 2, 2.6 + dz).multiply(new THREE.Matrix4().makeRotationZ(a))])); });
        [[-w, 0], [w, 0]].forEach(([dx]) => { [ang, -ang].forEach(a => fl.push([dg, new THREE.Matrix4().makeTranslation(x + dx, (ya + yb) / 2, 2.6).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationZ(a))])); });
        [[0, -w], [0, w]].forEach(([dx, dz]) => fl.push([bar, new THREE.Matrix4().makeTranslation(x, yb, 2.6 + dz)]));
        [[-w, 0], [w, 0]].forEach(([dx]) => fl.push([bar, new THREE.Matrix4().makeTranslation(x + dx, yb, 2.6).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))]));
      }
    });
    const frames = new THREE.Mesh(mergeGeos(fl), frameM); frames.castShadow = true; B.add(frames);
    [-4.2, -2.9, -1.6, -.3].forEach((x, i) => {
      cyl(.3, 4.2, mat('stack', 0xc4cbd2, { metalness: .85, roughness: .22 }), x, HALL.H, 2.6, B, 24);
      [1.2, 2.6, 4.0].forEach(yy => { const r = new THREE.Mesh(new THREE.TorusGeometry(.31, .035, 8, 24), mat('capring', 0x6c7682, { metalness: .6 })); r.rotation.x = Math.PI / 2; r.position.set(x, HALL.H + yy, 2.6); B.add(r); });
      for (let k = 0; k < 6; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xeef3f8, transparent: true, depthWrite: false, opacity: 0 }));
        B.add(s); const off = (k / 6 + i * .13) % 1;
        tick.push(t => { const u = (t * .1 + off) % 1; s.position.set(x + u * 1.2, HALL.H + 4.3 + u * 3.6, 2.6 + u * .5); const sc = .7 + u * 2.6; s.scale.set(sc, sc, 1); s.material.opacity = Math.sin(u * Math.PI) * .6; });
      }
    });
    box(2.2, 1.1, 2.0, mat('vault', 0xaab2bb, { transparent: true, opacity: .55 }), -3.6, -1.6, -4.6, groups.p2).castShadow = false;
    [[COL.cyan, .09, -.45], [COL.blue, .11, -.15], [COL.amber, .08, .15], [COL.cyanBright, .07, .42]].forEach(([c, r, dx]) => {
      pipe([[-3.6 + dx, -1.0, -9], [-3.6 + dx, -1.0, -4.6], [-3.6 + dx, -1.0, BASE.z0 + .2], [-3.6 + dx, -.5, BASE.z0 + .6]], r, mat('cond' + c, c, { roughness: .4, emissive: c, emissiveIntensity: .2 }), groups.p2);
    });
  }
  const rackQ = new Map(); // parent -> { body: [], led: [[], []], color }
  function rack(w, h, d, x, z, y, parent, ledColor = COL.led) {
    let q = rackQ.get(parent); if (!q) { q = { body: [], led: [[], []], color: ledColor }; rackQ.set(parent, q); }
    q.body.push([new THREE.BoxGeometry(w, h, d), new THREE.Matrix4().makeTranslation(x, y + h / 2, z)]);
    const n = Math.max(3, Math.round(h / .2)), lg = new THREE.BoxGeometry(w * .65, .018, .01);
    for (let i = 0; i < n; i++) q.led[(((i + Math.round(x * 10)) % 2) + 2) % 2].push([lg, new THREE.Matrix4().makeTranslation(x, y + .15 + i * (h - .3) / (n - 1), z - d / 2 - .012)]);
  }
  function flushRacks() {
    rackQ.forEach((q, parent) => {
      const body = new THREE.Mesh(mergeGeos(q.body), mat('rack', COL.rack, { roughness: .4, metalness: .6 })); body.castShadow = true; body.receiveShadow = true; parent.add(body);
      q.led.forEach((list, k) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeos(list), new THREE.MeshBasicMaterial({ color: q.color })); parent.add(m); tick.push(t => { m.visible = Math.sin(t * (2.2 + k * 1.3) + k) > -.7; }); });
    });
    rackQ.clear();
  }
  { // Phase 1
    const g = groups.p1;
    box(4.35, .44, 3.55, floorM, -2.6, -.12, .4, g);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) rack(.46, 1.66, .78, -4.2 + i * .62, -.35 + row * 1.5, .32, g);
    box(3.3, .05, .5, mat('tray', 0x9fb3c6, { metalness: .6 }), -2.96, 2.1, .4, g);
    const fanM = mat('fanb', COL.fan, { roughness: .5 });
    [-4.2, -2.6, -1.0].forEach(x => {
      box(.9, .9, .5, mat('fanbox', 0xcfd6dd, { metalness: .5, roughness: .3 }), x, .32, 1.95, g);
      const blades = new THREE.Group(); blades.position.set(x, .77, 1.69);
      for (let b = 0; b < 4; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.34, .08, .02), fanM); bl.rotation.z = b * Math.PI / 2; bl.position.set(Math.cos(b * Math.PI / 2) * .15, Math.sin(b * Math.PI / 2) * .15, 0); blades.add(bl); }
      g.add(blades); tick.push(t => { blades.rotation.z = -t * 6; });
    });
    const pl = new THREE.PointLight(0x7fd0ff, 6, 6, 2); pl.position.set(-2.6, 1.6, -1.2); g.add(pl);
  }
  { // Phase 2
    const g = groups.p2, y0 = -BASE.depth;
    const conc = new THREE.MeshStandardMaterial({ map: noiseTex('#bcc3cb', .07), roughness: .95 });
    box(BASE.x1 - BASE.x0, .14, BASE.z1 - BASE.z0, conc, (BASE.x0 + BASE.x1) / 2, y0 - .14, 0, g);
    box(BASE.x1 - BASE.x0, BASE.depth, .16, conc, (BASE.x0 + BASE.x1) / 2, y0, BASE.z1 - .08, g);
    box(.16, BASE.depth, BASE.z1 - BASE.z0, conc, BASE.x0 + .08, y0, 0, g);
    box(.16, BASE.depth, BASE.z1 - BASE.z0, conc, BASE.x1 - .08, y0, 0, g);
    box(BASE.x1 - BASE.x0, BASE.depth, .1, mat('bcut', 0xb7bec6, { transparent: true, opacity: .16, depthWrite: false }), (BASE.x0 + BASE.x1) / 2, y0, BASE.z0 + .05, g).castShadow = false;
    for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) rack(.38, .96, .48, -3.9 + i * .5, 1.2 + row * .75, y0, g, COL.cyan);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) rack(.47, 1.34, .82, -3.9 + i * .6, -1.5 + row * 1.1, y0, g, COL.cyan);
    for (let i = 0; i < 13; i++) box(.06, 1.1, .7, mat(i % 2 ? 'cu' : 'ss', i % 2 ? COL.copper : COL.stainless, { metalness: .9, roughness: .25 }), 1.8 + i * .09, y0 + .2, -1.4, g);
    box(1.5, .2, .9, mat('skid', 0x6f7985, { metalness: .6 }), 2.35, y0, -1.4, g);
    const cyanM = mat('cyanp', COL.cyanBright, { roughness: .3, metalness: .3, emissive: COL.cyan, emissiveIntensity: .15 });
    const hotM = mat('hotp', COL.heat, { roughness: .35, metalness: .3 });
    box(1.0, .3, .6, mat('pskid', 0x59636e, { metalness: .5 }), 4.4, y0, -1.4, g);
    cyl(.18, 1.6, cyanM, 5.6, y0, 1.2, g); cyl(.13, 1.6, hotM, 6.1, y0, 1.2, g);
    pipe([[-3.9, y0 + 1.6, .9], [5.6, y0 + 1.6, .9], [5.6, y0 + 1.6, 1.2]], .05, cyanM, g);
    pipe([[-3.9, y0 + 1.75, .7], [6.1, y0 + 1.75, .7], [6.1, y0 + 1.75, 1.2]], .05, hotM, g);
    pipe([[2.9, y0 + .9, -1.4], [4.4, y0 + .9, -1.4], [5.6, y0 + .9, 1.2]], .05, cyanM, g);
    pipe([[6.1, y0 + 1.6, 1.2], [6.1, y0 + 1.6, 2.6], [6.1, 2.85, 2.6], [6.1, 2.85, 2.95]], .06, hotM, g);
    const pl = new THREE.PointLight(0x7feaff, 5, 7, 2); pl.position.set(.5, y0 + 1.8, -1.2); g.add(pl);
  }
  { // Phase 3
    const g = groups.p3, y = HALL.H + .48;
    const frameM = mat('frame', 0x8b96a2, { metalness: .7, roughness: .35 });
    [[0.5, -1.4], [3.0, -1.4], [0.5, .6], [3.0, .6]].forEach(([x, z]) => {
      box(2.05, .5, 1.2, frameM, x, y + .06, z, g);
      box(2.05, .16, 1.2, mat('coolerTop', 0xdfe4e9, { metalness: .5, roughness: .3 }), x, y + .56, z, g);
      [-.5, .5].forEach(dx => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.36, .04, 8, 24), frameM); ring.rotation.x = Math.PI / 2; ring.position.set(x + dx, y + .75, z); g.add(ring);
        const blades = new THREE.Group(); blades.position.set(x + dx, y + .74, z);
        for (let b = 0; b < 5; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.3, .015, .09), mat('blade', 0x4a5561)); bl.position.x = .15; const piv = new THREE.Group(); piv.rotation.y = b * Math.PI * 2 / 5; piv.add(bl); blades.add(piv); }
        g.add(blades); tick.push(t => { blades.rotation.y = t * 5; });
      });
    });
    pipe([[-.8, y + .2, -2.4], [4.4, y + .2, -2.4], [4.4, y + .2, 1.6], [-.8, y + .2, 1.6]], .06, mat('cyanp', COL.cyanBright), g);
    const railM = mat('rail', 0xf2b233, { metalness: .3 });
    const rp = hallShape(.2).getPoints(24);
    pipe(rp.map(p => [p.x, y + .9, p.y]), .025, railM, g);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) rack(.47, 1.72, .84, 1.4 + i * .6, -1.8 + row * 1.2, .24, g, COL.cyan);
  }
  flushRacks();
  return { root, groups };
}
