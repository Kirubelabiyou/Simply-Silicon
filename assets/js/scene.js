/* Simply Silicon: Foundation scene.
   Downtown Calgary in 3D, built from City of Calgary open data:
   real building footprints and rooftop heights (3D Buildings - Citywide) and the real street network
   (Street Centreline), with the Bow River placed between the streets on each bank and the CTrain on 7 Ave.
   Foundation's private fiber follows the routes on gosimply.ai's network map, and the plant is modelled
   after gosimply.ai's published plant model, phase by phase.
   Performance: shadows are drawn once per view (not every frame), static parts are merged into a handful
   of draw calls, moving lights are point sprites, and resolution adapts to the device.
   Usage: mountScene(element, { view: 'net' }) */
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';
import { RoomEnvironment } from '../vendor/three/addons/RoomEnvironment.js';

const S = 4.2; // metres per plant-model unit
const COL = {
  ground: 0xa9adb0, sidewalk: 0xc6c9cc, road: 0x3c4148, alley: 0x5d636b, lane: 0xf2f2ee, yellow: 0xe3bf45,
  water: 0x5f8fb3, grass: 0x8fa77a, bed: 0x666b71, rail: 0xb9c0c7,
  fiber: 0x2aa3f5, mullion: 0xd3d9df, steel: 0xaeb7c1, stainless: 0xd5dbe1, copper: 0xc27a4a,
  boiler: 0xc8423a, valve: 0x2f6fd6, rack: 0x1b2230, led: 0x4fb3f0, fan: 0x36df8c,
  cyan: 0x5ee5ff, cyanBright: 0x7fd6f5, blue: 0x3d7bff, amber: 0xffb45e, heat: 0xe8513c
};
// carriageway width and sidewalk width per road class (skeletal, parkway, arterial, urban blvd, neighbourhood blvd, collector, residential, lane)
const WR = [20, 14, 13, 13, 12, 11, 9.5, 5];
const WS = [0, 2.5, 4, 4.5, 4, 3.5, 3, 0];

export function mountScene(host, opts = {}) {
  const T0 = performance.now(); let TL = T0; const PROF = n => { if (window.__prof) { const t = performance.now(); console.log('PROF', n, Math.round(t - TL)); TL = t; } };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAL = window.SS_CALGARY;
  const BLD = decodeBuildings(window.SS_BLD || []);
  const STR = window.SS_STREETS || { n: [], s: [], r: [] };
  const phoneNow = () => host.clientWidth < 700;
  const PHONE = opts.phone != null ? !!opts.phone : phoneNow();
  const CINE = !!opts.cinematic;
  const NIGHT = opts.day ? false : true; // evening look, as in gosimply.ai's own model // home hero: no controls on screen, a slow orbit, the page keeps scrolling
  host.innerHTML = '';
  host.classList.add('scene--live');
  const loading = el('div', 'scene-loading', 'Loading 3D view');
  host.appendChild(loading);

  /* ---------- renderer, camera, light ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const DPR = window.devicePixelRatio || 1;
  let pixelRatio = Math.min(DPR, PHONE ? 1.5 : 1.6), tuned = 0, canDraw = false;
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.day ? .86 : .62;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // the city is static: shadows are redrawn only when the view changes
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const labelLayer = el('div', 'scene-labels'); host.appendChild(labelLayer);

  const scene = new THREE.Scene();
  scene.fog = NIGHT ? new THREE.Fog(0x0e1a2c, 2000, 6800) : new THREE.Fog(0xe3e9ef, 2600, 7000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  if (NIGHT) scene.environmentIntensity = .35; // three r163+; older builds ignore it

  const camera = new THREE.PerspectiveCamera(38, 1, 4, 9000); // near plane at 4 m keeps distant ground layers from shimmering
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = 22; controls.maxDistance = 3200;
  controls.maxPolarAngle = Math.PI * .46;
  controls.screenSpacePanning = false;
  controls.zoomSpeed = 2.4;        // each scroll step or pinch moves noticeably
  controls.zoomToCursor = true;     // zoom toward what is under the pointer
  if (CINE) {
    host.classList.add('scene--cinematic');
    controls.enableZoom = false; controls.enablePan = false;           // scrolling stays with the page
    controls.autoRotate = !reduce; controls.autoRotateSpeed = .28;      // one slow revolution every few minutes
    controls.minPolarAngle = Math.PI * .22; controls.maxPolarAngle = Math.PI * .4;
    if (PHONE || !opts.interactive) { controls.enableRotate = false; renderer.domElement.style.touchAction = 'pan-y'; renderer.domElement.style.cursor = 'pointer'; }
  }

  scene.add(NIGHT ? new THREE.HemisphereLight(0x3d5688, 0x0a0d14, .42) : new THREE.HemisphereLight(0xeaf3ff, 0xa9b4bf, .62));
  const sun = NIGHT ? new THREE.DirectionalLight(0xa9bcff, .38) : new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.castShadow = true;
  const maxTex = renderer.capabilities.maxTextureSize;
  const SM = PHONE ? 2048 : Math.min(4096, maxTex);
  sun.shadow.mapSize.set(SM, SM);
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .6;
  scene.add(sun); scene.add(sun.target);
  function shadowAround(cx, cz, half) {
    sun.position.set(cx - half * .85, half * 1.15, cz + half * .8); // afternoon sun from the south-west, as in Calgary
    sun.target.position.set(cx, 0, cz);
    const c = sun.shadow.camera; c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 1; c.far = half * 5; c.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }

  const tick = [], pulseClouds = [];
  const mats = {};
  const mat = (k, color, o = {}) => (mats[k] = mats[k] || new THREE.MeshStandardMaterial({ color, roughness: .8, metalness: .05, ...o }));
  let rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  // tileable surface textures (near white, so the material colour sets the hue)
  const surf = (size, draw) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; };
  const speck = (g, n, size, lo, hi, a, w = 1.4) => { for (let i = 0; i < n; i++) { const v = Math.round(lo + rnd() * (hi - lo)); g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(rnd() * size, rnd() * size, w, w); } };
  const TEX = {
    asphalt: surf(256, (g, n) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, n, n); speck(g, 5200, n, 120, 255, .22); speck(g, 900, n, 40, 90, .25, 1); for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(0,0,0,.05)'; g.beginPath(); g.ellipse(rnd() * n, rnd() * n, 10 + rnd() * 30, 6 + rnd() * 18, rnd() * 3, 0, 7); g.fill(); } }),
    slab: surf(256, (g, n) => { g.fillStyle = '#f4f3f0'; g.fillRect(0, 0, n, n); speck(g, 2600, n, 150, 255, .18); g.fillStyle = 'rgba(70,70,70,.32)'; for (let k = 0; k <= 4; k++) { g.fillRect(k * n / 4 - 1, 0, 2, n); g.fillRect(0, k * n / 4 - 1, n, 2); } for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(0,0,0,${(rnd() * .06).toFixed(3)})`; g.fillRect(Math.floor(rnd() * 4) * n / 4, Math.floor(rnd() * 4) * n / 4, n / 4, n / 4); } }),
    ground: surf(256, (g, n) => { g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, n, n); speck(g, 4200, n, 110, 255, .16, 1.8); for (let i = 0; i < 26; i++) { const v = rnd() > .5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},.05)`; g.beginPath(); g.arc(rnd() * n, rnd() * n, 8 + rnd() * 28, 0, 7); g.fill(); } }),
    grass: surf(256, (g, n) => { g.fillStyle = '#eef2ea'; g.fillRect(0, 0, n, n); for (let i = 0; i < 7000; i++) { const v = 150 + rnd() * 105; g.fillStyle = `rgba(${v * .85},${v},${v * .7},.22)`; g.fillRect(rnd() * n, rnd() * n, 1, 2.5); } for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${rnd() > .5 ? '255,255,230' : '40,60,20'},.06)`; g.beginPath(); g.arc(rnd() * n, rnd() * n, 12 + rnd() * 30, 0, 7); g.fill(); } })
  };
  const planarUV = (g, tile) => { const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / tile; uv[i * 2 + 1] = p.getZ(i) / tile; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; };

  /* ---------- projection: metres from Foundation, x = east, z = south ---------- */
  const LNG0 = CAL.foundation.coordinate[0], LAT0 = CAL.foundation.coordinate[1];
  const KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KY = 110574;
  const P = (lng, lat) => [(lng - LNG0) * KX, -(lat - LAT0) * KY];

  PROF('bi');
  /* ---------- building index ---------- */
  const PLANT_ZONE = { x0: -32, x1: 62, z0: -20, z1: 42 };
  const blds = [];
  BLD.forEach((b, i) => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, cx = 0, cz = 0, area = 0, per = 0;
    b.p.forEach(([x, z], k) => {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); cx += x; cz += z;
      const [x2, z2] = b.p[(k + 1) % b.p.length]; area += x * z2 - x2 * z; per += Math.hypot(x2 - x, z2 - z);
    });
    cx /= b.p.length; cz /= b.p.length; area = Math.abs(area / 2);
    if (cx > PLANT_ZONE.x0 && cx < PLANT_ZONE.x1 && cz > PLANT_ZONE.z0 && cz < PLANT_ZONE.z1) return; // Foundation itself is modelled separately
    const h = Math.max(3, b.h);
    // +15 skywalks: long, thin and low. They are bridges between towers, so lift them off the street.
    const thin = 2 * area / per;
    const y0 = thin < 5.5 && per > 28 && h >= 6 && h < 22 ? Math.max(3.5, h - 4.4) : 0;
    blds.push({ i, p: b.p, h, y0, bb: [x0, x1, z0, z1], cx, cz });
  });
  const CELL = 60, grid = new Map();
  const buildGrid = () => {
    grid.clear();
    blds.forEach((b, k) => {
      if (b.y0) return; // skywalks do not block the street
      for (let gx = Math.floor(b.bb[0] / CELL); gx <= Math.floor(b.bb[1] / CELL); gx++)
        for (let gz = Math.floor(b.bb[2] / CELL); gz <= Math.floor(b.bb[3] / CELL); gz++) {
          const key = gx + ',' + gz; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(k);
        }
    });
  };
  buildGrid();
  function bldAt(x, z) {
    const list = grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)); if (!list) return -1;
    for (const k of list) { const b = blds[k]; if (x < b.bb[0] || x > b.bb[1] || z < b.bb[2] || z > b.bb[3]) continue; if (inPoly(x, z, b.p)) return k; }
    return -1;
  }
  // keep a skywalk only if a building touches at least one end; otherwise it would float in mid-air
  const drop = new Set();
  blds.forEach((b, k) => {
    if (!b.y0) return;
    let a = b.p[0], c = b.p[0], best = 0;
    b.p.forEach(p1 => b.p.forEach(p2 => { const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]); if (d > best) { best = d; a = p1; c = p2; } }));
    const ux = (c[0] - a[0]) / best, uz = (c[1] - a[1]) / best;
    const touches = bldAt(a[0] - ux * 3, a[1] - uz * 3) >= 0 || bldAt(c[0] + ux * 3, c[1] + uz * 3) >= 0;
    if (!touches) drop.add(k);
  });
  if (drop.size) { const keep = blds.filter((b, k) => !drop.has(k)); blds.length = 0; blds.push(...keep); buildGrid(); }
  const inPlant = (x, z, m = 0) => x > PLANT_ZONE.x0 - m && x < PLANT_ZONE.x1 + m && z > PLANT_ZONE.z0 - m && z < PLANT_ZONE.z1 + m;

  /* ---------- connected buildings ---------- */
  const eps = CAL.endpoints.map(e => ({ ...e, p: P(e.c[0], e.c[1]) }));
  const connected = new Set();
  eps.forEach(e => {
    let k = bldAt(e.p[0], e.p[1]);
    if (k < 0) { let best = 1e9; blds.forEach((b, j) => { if (b.y0) return; const d = Math.hypot(b.cx - e.p[0], b.cz - e.p[1]); if (d < best && d < 35) { best = d; k = j; } }); }
    e.b = k; e.top = k >= 0 ? blds[k].h : 0;
    if (k >= 0 && !e.generic) connected.add(k);
  });

  PROF('conn');
  /* ---------- ground, river, streets ---------- */
  const city = new THREE.Group(); scene.add(city);
  const groundMats = [];
  const flatMat = (k, color, order) => { const m = mat(k, color, { roughness: .95, envMapIntensity: .45, side: THREE.DoubleSide, transparent: true, opacity: .965, depthWrite: false }); m.userData.order = order; groundMats.push(m); return m; };
  // Bow River and its park banks, from the street lines on each side
  const RC = (STR.r || []).slice();
  if (RC.length) { const a = RC[0], b = RC[RC.length - 1]; RC.unshift([a[0] - 900, a[1], a[2], a[3], a[4]]); RC.push([b[0] + 900, b[1] + 120, b[2] + 120, b[3] + 120, b[4] + 120]); }
  function riverAt(x) { // [waterN, waterS, bankN, bankS] at x, or null
    if (!RC.length || x < RC[0][0] || x > RC[RC.length - 1][0]) return null;
    for (let i = 1; i < RC.length; i++) if (x <= RC[i][0]) { const a = RC[i - 1], b = RC[i], t = (x - a[0]) / (b[0] - a[0] || 1); return [1, 2, 3, 4].map(k => a[k] + (b[k] - a[k]) * t); }
    return null;
  }
  if (RC.length) {
    const band = (ka, kb) => { const s = new THREE.Shape(); RC.forEach((c, i) => i ? s.lineTo(c[0], -c[ka]) : s.moveTo(c[0], -c[ka])); RC.slice().reverse().forEach(c => s.lineTo(c[0], -c[kb])); return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2); };
    const grass = new THREE.Mesh(planarUV(band(3, 4), 14), mat('grass', COL.grass, { roughness: 1, map: TEX.grass })); grass.position.y = .06; grass.receiveShadow = true; city.add(grass);
    const water = new THREE.Mesh(band(1, 2), mat('water', COL.water, { roughness: .1, metalness: .15, envMapIntensity: 1.1 })); water.position.y = .12; water.receiveShadow = true; city.add(water);
  }
  const inWater = (x, z) => { const r = riverAt(x); return r && z > r[0] - 2 && z < r[1] + 2; };

  // streets: decode, then lay sidewalks, carriageways and alleys as merged ribbons
  const roads = STR.s.map(a => { const pts = []; let x = 0, z = 0; for (let i = 3; i < a.length; i += 2) { x += a[i]; z += a[i + 1]; pts.push([x / 10, z / 10]); } return { c: a[0], one: a[1], name: a[2] >= 0 ? STR.n[a[2]] : '', pts }; });
  const ribbons = { walk: [], road: [], alley: [], bed: [] };
  function ribbon(out, pts, hw, y) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < .05) continue;
      const nx = -dz / L * hw, nz = dx / L * hw;
      out.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz);
    }
    // round joints and caps so corners and intersections close up
    const N = hw > 6 ? 9 : 6;
    for (let i = 0; i < pts.length; i++) {
      if (i > 0 && i < pts.length - 1) {
        const [ax, az] = pts[i - 1], [bx, bz] = pts[i], [cx, cz] = pts[i + 1];
        const a1 = Math.atan2(bz - az, bx - ax), a2 = Math.atan2(cz - bz, cx - bx); let d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d;
        if (d < .12) continue;
      }
      const [px, pz] = pts[i];
      for (let k = 0; k < N; k++) { const t0 = k / N * Math.PI * 2, t1 = (k + 1) / N * Math.PI * 2; out.push(px, y, pz, px + Math.cos(t0) * hw, y, pz + Math.sin(t0) * hw, px + Math.cos(t1) * hw, y, pz + Math.sin(t1) * hw); }
    }
  }
  roads.forEach(r => {
    const w = WR[r.c];
    if (r.c === 7) { ribbon(ribbons.alley, r.pts, w / 2, .2); return; }
    if (WS[r.c]) ribbon(ribbons.walk, r.pts, w / 2 + WS[r.c], .14);
    ribbon(ribbons.road, r.pts, w / 2, .24);
  });
  // CTrain: the 7 Avenue transit mall, from the West End to City Hall
  const ctrain = (() => {
    const pts = [];
    roads.filter(r => /^7 AV S[EW]$/.test(r.name)).forEach(r => r.pts.forEach(p => { if (p[0] > -1730 && p[0] < -175) pts.push(p); }));
    pts.sort((a, b) => a[0] - b[0]);
    const path = []; pts.forEach(p => { const l = path[path.length - 1]; if (!l || p[0] - l[0] > 6) path.push(p); });
    return path.length > 4 ? path : null;
  })();
  if (ctrain) ribbon(ribbons.bed, ctrain, 4.6, .3);
  const flat = (arr, m, tile) => {
    if (!arr.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const n = new Float32Array(arr.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    if (tile) planarUV(g, tile);
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; city.add(mesh); return mesh;
  };
  const texMat = (k, color, order, map) => { const m = flatMat(k, color, order); m.map = map; return m; };
  flat(ribbons.walk, texMat('walk', COL.sidewalk, 2, TEX.slab), 6);
  flat(ribbons.alley, texMat('alley', COL.alley, 3, TEX.asphalt), 12);
  flat(ribbons.road, texMat('road', COL.road, 3, TEX.asphalt), 12);
  flat(ribbons.bed, texMat('bed', COL.bed, 4, TEX.asphalt), 12);

  /* ---------- ground cover: lawns, river grass, plazas and surface parking ---------- */
  // A road mask (4 m cells) keeps parking lots and trees off the streets.
  const RM = { x0: -2600, z0: -1700, c: 4, w: 1050, h: 700 }; RM.a = new Uint8Array(RM.w * RM.h);
  const rmIdx = (x, z) => { const i = Math.floor((x - RM.x0) / RM.c), j = Math.floor((z - RM.z0) / RM.c); return i < 0 || j < 0 || i >= RM.w || j >= RM.h ? -1 : j * RM.w + i; };
  roads.forEach(r => {
    const hw = WR[r.c] / 2 + WS[r.c] + 1, rc = Math.ceil(hw / RM.c);
    for (let i = 1; i < r.pts.length; i++) {
      const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i], L = Math.hypot(bx - ax, bz - az);
      for (let d = 0; d <= L; d += 2) {
        const x = ax + (bx - ax) * d / (L || 1), z = az + (bz - az) * d / (L || 1), ci = Math.floor((x - RM.x0) / RM.c), cj = Math.floor((z - RM.z0) / RM.c);
        for (let u = -rc; u <= rc; u++) for (let v = -rc; v <= rc; v++) { const ii = ci + u, jj = cj + v; if (ii >= 0 && jj >= 0 && ii < RM.w && jj < RM.h && (u * u + v * v) * RM.c * RM.c <= hw * hw) RM.a[jj * RM.w + ii] = 1; }
      }
    }
  });
  const onRoad = (x, z) => { const k = rmIdx(x, z); return k >= 0 && RM.a[k] === 1; };
  // Parks from City of Calgary open data, when present (same compact encoding as buildings)
  const PARKS = decodeBuildings(window.SS_PARKS || []).map(p => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; p.p.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }); return { p: p.p, paved: p.h > .5, bb: [x0, x1, z0, z1] }; });
  const parkAt = (x, z) => PARKS.find(k => x >= k.bb[0] && x <= k.bb[1] && z >= k.bb[2] && z <= k.bb[3] && inPoly(x, z, k.p));
  const inPark = (x, z) => { const k = parkAt(x, z); return !!k && !k.paved; };
  // the parks themselves, with crisp edges: lawn for green parks, light pavers for plazas
  if (PARKS.length) {
    const green = [], paved = [];
    PARKS.forEach(k => { const shp = new THREE.Shape(k.p.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(shp).rotateX(-Math.PI / 2); (k.paved ? paved : green).push([g, null]); });
    const lay = (list, m, y) => { if (!list.length) return; const g = planarUV(mergeGeos(list), 14); const mesh = new THREE.Mesh(g, m); mesh.position.y = y; mesh.receiveShadow = true; city.add(mesh); };
    lay(green, mat('parkGrass', 0x6f9a4e, { roughness: 1, map: TEX.grass }), .13); // above the water, so Prince's and St. Patrick's islands show
    lay(paved, mat('plaza', 0xc9c3b8, { roughness: .9, map: TEX.slab }), .13);
  }
  const C = { lawn: [[.4, .52, .27], [.46, .57, .3], [.36, .48, .25], [.5, .55, .33]], park: [.36, .53, .25], conc: [.6, .59, .56], plaza: [.67, .65, .61], asph: [.33, .34, .36] };
  // where the City's building data has no buildings at all, open ground is unknown rather than parking
  const COV = new Set(); blds.forEach(b => COV.add(Math.floor(b.cx / 100) + ',' + Math.floor(b.cz / 100)));
  const covered = (x, z) => { const i = Math.floor(x / 100), j = Math.floor(z / 100); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (COV.has((i + a) + ',' + (j + b))) return true; return false; };
  const DIRS = [[1, 0], [.7, .7], [0, 1], [-.7, .7], [-1, 0], [-.7, -.7], [0, -1], [.7, -.7]];
  const lawnAt = [];
  function cover(x, z) { // returns [r, g, b, kind]
    const h = hash(Math.round(x * 3.1 + z * 7.7) & 0xffff), lawn = C.lawn[Math.floor(h * 4) % 4];
    if (inPark(x, z)) return [...C.park, 'park'];
    const r = riverAt(x);
    if (r && z < r[2] - 4) return [...lawn, 'lawn']; // north of the Bow: Bridgeland, Crescent Heights, Sunnyside (lawns and trees)
    if (r && z < r[3] + 55) return [...lawn.map(c => c * 1.02), 'bank']; // riverwalk and Eau Claire promenade
    const core = x > -1900 && x < 950 && z < 760 && covered(x, z);
    // open ground downtown with no building nearby is almost always surface parking
    let near = 0; for (const [dx, dz] of DIRS) { if (bldAt(x + dx * 11, z + dz * 11) >= 0) near++; if (bldAt(x + dx * 24, z + dz * 24) >= 0) near++; }
    if (!onRoad(x, z) && near <= 1) return core ? [...C.asph, 'parking'] : [...lawn.map((c, i) => c * .7 + C.conc[i] * .3), 'lawn'];
    if (!core) return [...lawn.map((c, i) => c * .45 + C.conc[i] * .55), 'mixed'];
    return near > 6 ? [...C.plaza, 'plaza'] : [...C.conc, 'conc'];
  }
  {
    const hb = { x0: -4.5 * S, x1: 6.85 * S, z0: -2.85 * S, z1: 2.85 * S }, G = { x0: -2400, x1: 1400, z0: -1500, z1: 1000, c: 20 };
    const axis = (a, b, c, e) => { const v = []; for (let t = a; t <= b; t += c) v.push(t); e.forEach(q => v.push(q)); return [...new Set(v)].sort((p, q) => p - q); };
    const xs = axis(G.x0, G.x1, G.c, [hb.x0, hb.x1]), zs = axis(G.z0, G.z1, G.c, [hb.z0, hb.z1]);
    const pos = [], col = [], idx = [], NX = xs.length;
    zs.forEach(z => xs.forEach(x => {
      const c = cover(x, z), j = .94 + hash(Math.round(x * 13 + z * 3) & 0xffff) * .1;
      pos.push(x, 0, z); col.push(Math.pow(c[0] * j, 2.2), Math.pow(c[1] * j, 2.2), Math.pow(c[2] * j, 2.2)); // sRGB to linear
      if (c[3] === 'lawn' || c[3] === 'park' || c[3] === 'bank') lawnAt.push([x, z, c[3]]);
    }));
    for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
      if (cx > hb.x0 && cx < hb.x1 && cz > hb.z0 && cz < hb.z1) continue; // the plant's basement opening
      const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3)); planarUV(g, 22);
    const gm = flatMat('ground', 0xffffff, 1); gm.vertexColors = true; gm.map = TEX.ground;
    const ground = new THREE.Mesh(g, gm); ground.receiveShadow = true; city.add(ground);
    // beyond the mapped area: a soft mix of lawn and pavement that fades into the haze
    const fs = new THREE.Shape(); fs.moveTo(-9000, -9000); fs.lineTo(9000, -9000); fs.lineTo(9000, 9000); fs.lineTo(-9000, 9000); fs.lineTo(-9000, -9000);
    const fh = new THREE.Path(); fh.moveTo(G.x0, G.z0); fh.lineTo(G.x0, G.z1); fh.lineTo(G.x1, G.z1); fh.lineTo(G.x1, G.z0); fh.lineTo(G.x0, G.z0); fs.holes.push(fh);
    const far = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(fs).rotateX(Math.PI / 2), 22), texMat('groundFar', 0x8d9877, 1, TEX.ground)); far.receiveShadow = true; city.add(far);
  }

  PROF('ribbons');
  // intersections (for crosswalks and to keep trees off corners)
  const nodes = new Map();
  roads.forEach((r, ri) => {
    if (r.c > 6) return;
    [0, r.pts.length - 1].forEach(end => {
      const p = r.pts[end], key = Math.round(p[0] / 3) + ',' + Math.round(p[1] / 3);
      if (!nodes.has(key)) nodes.set(key, { p, inc: [] });
      const q = r.pts[end === 0 ? 1 : end - 1]; nodes.get(key).inc.push({ r, dir: [q[0] - p[0], q[1] - p[1]] });
    });
  });
  const NG = 16, nodeGrid = new Map();
  nodes.forEach(n => { const k = Math.floor(n.p[0] / NG) * 4096 + Math.floor(n.p[1] / NG); if (!nodeGrid.has(k)) nodeGrid.set(k, []); nodeGrid.get(k).push(n.p); });
  const nearNode = (x, z, d) => {
    const gx = Math.floor(x / NG), gz = Math.floor(z / NG);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = nodeGrid.get((gx + i) * 4096 + gz + j); if (l) for (const p of l) if (Math.abs(p[0] - x) < d && Math.abs(p[1] - z) < d && Math.hypot(p[0] - x, p[1] - z) < d) return true; }
    return false;
  };
  const CORE = (x, z) => x > -1800 && x < 800 && z > -950 && z < 720;

  // road markings, crosswalks: instanced, one draw call each
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const lineM = flatMat('lanePaint', COL.lane, 5), yelM = flatMat('yellowPaint', COL.yellow, 5);
    const dashG = new THREE.PlaneGeometry(3, .22).rotateX(-Math.PI / 2);
    const MAXD = PHONE ? 7000 : 14000;
    const white = new THREE.InstancedMesh(dashG, lineM, MAXD), yellow = new THREE.InstancedMesh(dashG, yelM, MAXD);
    let nw = 0, ny = 0;
    function dashes(pts, off, mesh, isY, gap) {
      let carry = gap / 2;
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < .5) continue;
        const ux = dx / L, uz = dz / L, ang = -Math.atan2(dz, dx); q.setFromAxisAngle(up, ang);
        for (let d = carry; d < L; d += gap) {
          const x = ax + ux * d - uz * off, z = az + uz * d + ux * off;
          if (!CORE(x, z) || nearNode(x, z, 9)) continue;
          if (isY ? ny >= MAXD : nw >= MAXD) return;
          m4.compose(v.set(x, .32, z), q, one); mesh.setMatrixAt(isY ? ny++ : nw++, m4);
        }
        carry = (carry - L) % gap; if (carry < 0) carry += gap;
      }
    }
    roads.forEach(r => {
      if (r.c > 6 || WR[r.c] < 9) return;
      if (!r.one) dashes(r.pts, 0, yellow, true, 9);
      else { const o = WR[r.c] / 6; dashes(r.pts, o, white, false, 9); dashes(r.pts, -o, white, false, 9); }
    });
    white.count = nw; yellow.count = ny; city.add(white, yellow);
    // zebra crosswalks on each approach to a junction
    const barG = new THREE.PlaneGeometry(2.8, .5).rotateX(-Math.PI / 2);
    const MAXB = PHONE ? 4000 : 9000, bars = new THREE.InstancedMesh(barG, lineM, MAXB); let nb = 0;
    nodes.forEach(n => {
      if (n.inc.length < 3 || !CORE(n.p[0], n.p[1])) return;
      n.inc.forEach(({ r, dir }) => {
        const L = Math.hypot(dir[0], dir[1]); if (L < 14) return;
        const ux = dir[0] / L, uz = dir[1] / L, hw = WR[r.c] / 2, ang = -Math.atan2(uz, ux); q.setFromAxisAngle(up, ang);
        const cx = n.p[0] + ux * 9.5, cz = n.p[1] + uz * 9.5;
        for (let s = -hw + .6; s <= hw - .5 && nb < MAXB; s += 1.05) { m4.compose(v.set(cx - uz * s, .33, cz + ux * s), q, one); bars.setMatrixAt(nb++, m4); }
      });
    });
    bars.count = nb; city.add(bars);
  }
  PROF('marks');
  // CTrain rails and two trains running the mall
  if (ctrain) {
    const railG = [], box = new THREE.BoxGeometry(1, .16, .12);
    const seg = (a, b, off) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L; const m = new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2 - uz * off, .38, (a[1] + b[1]) / 2 + ux * off), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(dz, dx)), new THREE.Vector3(L + .05, 1, 1)); railG.push([box, m]); };
    for (let i = 1; i < ctrain.length; i++) [-2.7, -1.27, 1.27, 2.7].forEach(o => seg(ctrain[i - 1], ctrain[i], o));
    city.add(new THREE.Mesh(mergeGeos(railG), mat('rail', COL.rail, { metalness: .8, roughness: .3 })));
    // path sampler
    const cum = [0]; for (let i = 1; i < ctrain.length; i++) cum.push(cum[i - 1] + Math.hypot(ctrain[i][0] - ctrain[i - 1][0], ctrain[i][1] - ctrain[i - 1][1]));
    const LEN = cum[cum.length - 1];
    const at = d => { d = Math.max(0, Math.min(LEN, d)); let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), a = ctrain[i - 1], b = ctrain[i]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]; };
    // a 3-car Calgary Transit train: white body, red band, dark windows
    const carParts = [];
    const add = (w, h, d, x, y, z, c) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); const col = new THREE.Color(c); const n = g.attributes.position.count, ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.toArray(ca, i * 3); g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); carParts.push(g.toNonIndexed()); };
    for (let k = 0; k < 3; k++) { const x = (k - 1) * 25; add(24, 3.1, 2.65, x, 2.05, 0, 0xf4f5f6); add(24.05, .55, 2.7, x, 1.05, 0, 0xc8102e); add(23.2, .95, 2.7, x, 2.75, 0, 0x26303a); add(23, .2, 2.4, x, 3.7, 0, 0xcfd4d9); }
    const trainG = mergeColored(carParts), trainM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, metalness: .15 });
    [[-1.98, 0, 1], [1.98, .55, -1]].forEach(([off, phase, dir]) => {
      const tr = new THREE.Mesh(trainG, trainM); tr.castShadow = false; city.add(tr); tr.userData.dyn = true;
      const run = LEN / 11, dwell = 6, cycle = 2 * (run + dwell);
      const place = t => {
        let u = ((t / cycle + phase) % 1) * cycle, d;
        if (u < run) d = u / run; else if (u < run + dwell) d = 1; else if (u < 2 * run + dwell) d = 1 - (u - run - dwell) / run; else d = 0;
        if (dir < 0) d = 1 - d;
        const e = d * d * (3 - 2 * d) * .12 + d * .88; // gentle start and stop
        const [x, z, a] = at(38 + e * (LEN - 76)); tr.position.set(x - Math.sin(a) * off, 0, z + Math.cos(a) * off); tr.rotation.y = -a;
      };
      place(0); tick.push(place);
    });
  }

  PROF('ctrain');
  /* ---------- facade textures ---------- */
  function tex(draw, w = 256, h = 256) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
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
  // Landmarks, matched to their real footprints (colours from public photos)
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
    if (b.y0) return { kind: 'glass', tint: [.8, .88, .95], roof: ROOF[2] }; // skywalk
    const r = hash(b.i);
    const kind = b.h > 90 ? (r < .8 ? 'glass' : 'dark') : b.h > 35 ? (r < .5 ? 'glass' : r < .72 ? 'office' : 'dark') : b.h > 14 ? (r < .5 ? 'office' : r < .85 ? 'brick' : 'glass') : (r < .6 ? 'brick' : 'office');
    const pal = PAL[kind], tint = pal[Math.floor(hash(b.i * 5 + 1) * pal.length)];
    const rr = hash(b.i * 3 + 7), roof = kind === 'glass' || kind === 'dark' ? ROOF[1] : rr < .06 ? ROOF[4] : ROOF[Math.floor(rr * 4)];
    return { kind, tint, roof };
  }

  PROF('tex');
  /* ---------- buildings (merged by facade type, near and far groups) ---------- */
  const NEAR = 170;
  let towerAt = null;
  const buckets = {};
  const bucket = key => (buckets[key] = buckets[key] || { pos: [], uv: [], col: [], nrm: [], roofPos: [], roofIdx: [], roofCol: [], edges: [] });
  const AO = .52, AOH = 7; // darker at street level, like light falling off between buildings
  blds.forEach((b, k) => {
    const L0 = landmarkOf.get(k); if (L0 && L0.tower) { towerAt = b; b.h = Math.min(b.h, 22); }
    const st = styleFor(b, k), kind = st.kind, near = Math.hypot(b.cx, b.cz) < NEAR;
    const B = bucket(kind + (near ? ':near' : ':far'));
    let p = b.p.slice();
    let area = 0; for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; area += x1 * z2 - x2 * z1; }
    if (area < 0) p.reverse(); // consistent winding so walls face outward
    const [sw, sh] = FAC[kind].size, tc = st.tint, y0 = b.y0, y1 = b.h, ya = y0 ? y1 : Math.min(y1, AOH);
    let u = 0;
    const quad = (x1, z1, x2, z2, ya_, yb_, ca, cb, u0, u1, nx, nz) => {
      // wound so the front face looks outward
      B.pos.push(x1, ya_, z1, x2, yb_, z2, x2, ya_, z2, x1, ya_, z1, x1, yb_, z1, x2, yb_, z2);
      const A = [tc[0] * ca, tc[1] * ca, tc[2] * ca], Bc = [tc[0] * cb, tc[1] * cb, tc[2] * cb];
      B.col.push(...A, ...Bc, ...A, ...A, ...Bc, ...Bc);
      for (let n = 0; n < 6; n++) B.nrm.push(nx, 0, nz);
      const v0 = ya_ / sh, v1 = yb_ / sh; B.uv.push(u0, v0, u1, v1, u1, v0, u0, v0, u0, v1, u1, v1);
    };
    for (let i = 0; i < p.length; i++) {
      const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length], L = Math.hypot(x2 - x1, z2 - z1); if (L < .05) continue;
      const nx = (z2 - z1) / L, nz = -(x2 - x1) / L;
      const u0 = u / sw, u1 = (u + L) / sw;
      if (y0) quad(x1, z1, x2, z2, y0, y1, 1, 1, u0, u1, nx, nz);
      else { quad(x1, z1, x2, z2, 0, ya, AO, 1, u0, u1, nx, nz); if (y1 > ya) quad(x1, z1, x2, z2, ya, y1, 1, 1, u0, u1, nx, nz); }
      u += L;
    }
    const shp = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const tris = THREE.ShapeUtils.triangulateShape(shp.getPoints(), []);
    const base = B.roofPos.length / 3, rc = st.roof;
    p.forEach(([x, z]) => { B.roofPos.push(x, y1, z); B.roofCol.push(rc[0], rc[1], rc[2]); });
    // roof faces up: (b - a) x (c - a) must have a positive y component, which in x/z is a negative 2D cross
    const up = t => { const [ax, az] = p[t[0]], [bx, bz] = p[t[1]], [cx, cz] = p[t[2]]; return (bx - ax) * (cz - az) - (bz - az) * (cx - ax) < 0; };
    tris.forEach(t => { if (up(t)) B.roofIdx.push(base + t[0], base + t[1], base + t[2]); else B.roofIdx.push(base + t[0], base + t[2], base + t[1]); });
    if (y0) { const b2 = B.roofPos.length / 3; p.forEach(([x, z]) => { B.roofPos.push(x, y0, z); B.roofCol.push(.55, .58, .62); }); tris.forEach(t => { if (up(t)) B.roofIdx.push(b2 + t[0], b2 + t[2], b2 + t[1]); else B.roofIdx.push(b2 + t[0], b2 + t[1], b2 + t[2]); }); }
    if (kind === 'conn') p.forEach(([x, z], i) => { const [x2, z2] = p[(i + 1) % p.length]; B.edges.push(x, y1 + .3, z, x2, y1 + .3, z2); });
  });
  const nearMats = [];
  const litTex = NIGHT ? tex((g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) {
      const v = rnd(); if (v > .38) continue;
      g.fillStyle = v < .08 ? 'rgba(170,215,255,.85)' : `rgba(255,${200 + Math.round(rnd() * 30)},${140 + Math.round(rnd() * 40)},${(.45 + rnd() * .45).toFixed(2)})`;
      g.fillRect(c * w / 8 + 4, r * h / 6 + 6, w / 8 - 8, h / 6 - 14);
    }
  }) : null;
  Object.entries(buckets).forEach(([key, B]) => {
    const [kind, zone] = key.split(':');
    const f = FAC[kind];
    const wallMat = new THREE.MeshStandardMaterial({ map: f.t, color: 0xffffff, vertexColors: true, ...f.m, ...(NIGHT ? { emissiveMap: litTex, emissive: 0xffffff, emissiveIntensity: 1.25 } : {}) });
    const roofMat = new THREE.MeshStandardMaterial({ color: NIGHT ? 0x8a929c : 0xffffff, roughness: .85, metalness: .05, vertexColors: true, ...(kind === 'conn' ? { emissive: 0x1f93ec, emissiveIntensity: .35 } : {}) });
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    wg.setAttribute('normal', new THREE.Float32BufferAttribute(B.nrm, 3));
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
    wg.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
    const walls = new THREE.Mesh(wg, wallMat); walls.castShadow = true; walls.receiveShadow = true; city.add(walls);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(B.roofPos, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(B.roofCol, 3)); rg.setIndex(B.roofIdx); rg.computeVertexNormals();
    const roofs = new THREE.Mesh(rg, roofMat); roofs.castShadow = true; roofs.receiveShadow = true; city.add(roofs);
    if (B.edges.length) {
      const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(B.edges, 3));
      city.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x9fe0ff })));
    }
    if (zone === 'near') nearMats.push(wallMat, roofMat);
  });
  PROF('bldg');
  // Calgary Tower: concrete shaft with the observation pod and red crown
  if (towerAt) {
    const T = new THREE.Group(); T.position.set(towerAt.cx, 22, towerAt.cz);
    const conc = mat('towerConc', 0xd9d4ca, { roughness: .8 });
    const part = (g, m, y) => { const o = new THREE.Mesh(g, m); o.position.y = y; o.castShadow = true; o.receiveShadow = true; T.add(o); };
    part(new THREE.CylinderGeometry(5.6, 8.5, 136, 20), conc, 68);
    part(new THREE.CylinderGeometry(14, 12, 9, 28), mat('towerPod', 0x3a4450, { roughness: .2, metalness: .6 }), 140);
    part(new THREE.CylinderGeometry(15, 15, 2.2, 28), mat('towerDeck', 0xe8e4dc, { roughness: .6 }), 145.5);
    part(new THREE.CylinderGeometry(10.5, 13.5, 7, 28), mat('towerRed', 0xb3262d, { roughness: .45 }), 150);
    part(new THREE.CylinderGeometry(.7, 1.4, 20, 8), mat('towerMast', 0xc9ced3, { metalness: .6, roughness: .3 }), 163);
    city.add(T); mergeStatic(T);
  }
  // rooftop plant on taller buildings
  {
    const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, .5, 0);
    const im = new THREE.InstancedMesh(g, mat('rtu', 0xb4bcc5, { roughness: .6, metalness: .3 }), 1100); let n = 0; const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Quaternion();
    blds.forEach(b => {
      if (b.h < 18 || b.y0 || n > 1080) return;
      const w = b.bb[1] - b.bb[0], d = b.bb[3] - b.bb[2], cnt = Math.min(4, 1 + Math.floor(hash(b.i + 3) * 4));
      for (let j = 0; j < cnt; j++) {
        const x = b.cx + (hash(b.i * 7 + j) - .5) * w * .4, z = b.cz + (hash(b.i * 13 + j) - .5) * d * .4;
        if (!inPoly(x, z, b.p)) continue;
        m4.compose(v.set(x, b.h, z), q, s.set(3 + hash(b.i + j) * 5, 1.6 + hash(b.i * 3 + j) * 2.2, 3 + hash(b.i * 5 + j) * 5));
        im.setMatrixAt(n++, m4);
      }
    });
    im.count = n; im.castShadow = true; city.add(im);
  }
  PROF('rtu');
  // street trees on the sidewalks, kept clear of corners, buildings and the river
  {
    const MAXT = PHONE ? 600 : 1300;
    const trunkG = new THREE.CylinderGeometry(.25, .35, 3, 4, 1, true); trunkG.translate(0, 1.5, 0);
    const crownG = new THREE.SphereGeometry(2.6, 7, 5); crownG.translate(0, 4.6, 0);
    const trunks = new THREE.InstancedMesh(trunkG, mat('trunk', 0x7b6a58), MAXT), crowns = new THREE.InstancedMesh(crownG, mat('crown', 0x5f7f42, { roughness: .9 }), MAXT);
    let n = 0; const m4 = new THREE.Matrix4(), col = new THREE.Color(), v = new THREE.Vector3(), sv = new THREE.Vector3(), q = new THREE.Quaternion();
    roads.forEach((r, ri) => {
      if (r.c < 1 || r.c > 6 || n >= MAXT) return;
      const off = WR[r.c] / 2 + Math.max(1.6, WS[r.c] * .55);
      let carry = 6;
      for (let i = 1; i < r.pts.length && n < MAXT; i++) {
        const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < 1) continue;
        const ux = dx / L, uz = dz / L;
        for (let d = carry; d < L && n < MAXT; d += 13) {
          [1, -1].forEach(sg => {
            if (n >= MAXT || hash(ri * 131 + i * 17 + Math.round(d) + (sg > 0 ? 7 : 0)) < .42) return;
            const x = ax + ux * d - uz * off * sg, z = az + uz * d + ux * off * sg;
            if (!CORE(x, z) || nearNode(x, z, 13) || bldAt(x, z) >= 0 || inPlant(x, z, 6) || inWater(x, z)) return;
            const s = .8 + hash(n * 17) * .5;
            m4.compose(v.set(x, 0, z), q, sv.set(s, s, s)); trunks.setMatrixAt(n, m4); crowns.setMatrixAt(n, m4);
            crowns.setColorAt(n, col.setRGB(.8 + hash(n) * .4, .85 + hash(n * 3) * .3, .75 + hash(n * 5) * .3)); n++;
          });
        }
        carry = (carry - L) % 13; if (carry < 0) carry += 13;
      }
    });
    trunks.count = crowns.count = n; crowns.castShadow = true; city.add(trunks, crowns);
  }

  PROF('trees');
  // trees across the lawns, parks and riverbanks: a mix of spruce and leafy trees, as in Calgary's older neighbourhoods
  {
    const MAXL = PHONE ? 700 : 1800;
    const leafG = new THREE.SphereGeometry(3, 6, 4); leafG.translate(0, 5.6, 0);
    const spruceG = new THREE.ConeGeometry(2.6, 9, 7); spruceG.translate(0, 6.2, 0);
    const stemG = new THREE.CylinderGeometry(.28, .4, 3.4, 4, 1, true); stemG.translate(0, 1.7, 0);
    const leaf = new THREE.InstancedMesh(leafG, mat('leaf', 0x5a7a3e, { roughness: .92 }), MAXL);
    const spruce = new THREE.InstancedMesh(spruceG, mat('spruce', 0x2f4a2c, { roughness: .95 }), MAXL);
    const stems = new THREE.InstancedMesh(stemG, mat('trunk', 0x7b6a58), MAXL * 2);
    let nl = 0, ns = 0, nt = 0; const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), sv = new THREE.Vector3(), q = new THREE.Quaternion(), col = new THREE.Color();
    const density = { lawn: .55, park: .85, bank: .5 };
    lawnAt.forEach(([gx, gz, kind], i) => {
      const tries = kind === 'park' ? 4 : 2;
      for (let t = 0; t < tries; t++) {
        if (nl + ns >= MAXL || hash(i * 7 + t * 131) > density[kind]) continue;
        const x = gx + (hash(i * 31 + t * 17) - .5) * 19, z = gz + (hash(i * 53 + t * 29) - .5) * 19;
        if (onRoad(x, z) || bldAt(x, z) >= 0 || inWater(x, z) || inPlant(x, z, 8)) continue;
        const sc = .75 + hash(i * 11 + t) * .6;
        m4.compose(v.set(x, 0, z), q.setFromAxisAngle(sv.set(0, 1, 0), hash(i + t) * 6.28), sv.set(sc, sc * (.9 + hash(i * 3 + t) * .3), sc));
        if (hash(i * 97 + t * 5) < .28) { spruce.setMatrixAt(ns, m4); spruce.setColorAt(ns, col.setRGB(.85 + hash(i) * .25, .85 + hash(i * 5) * .25, .85 + hash(i * 9) * .2)); ns++; }
        else { leaf.setMatrixAt(nl, m4); leaf.setColorAt(nl, col.setRGB(.8 + hash(i * 7) * .45, .82 + hash(i * 13) * .3, .7 + hash(i * 3) * .3)); nl++; }
        stems.setMatrixAt(nt++, m4);
      }
    });
    leaf.count = nl; spruce.count = ns; stems.count = nt;
    leaf.castShadow = spruce.castShadow = true; city.add(leaf, spruce, stems);
  }
  /* ---------- fiber: underground conduits, seen through the street, with light travelling through them ---------- */
  const fiber = new THREE.Group(); scene.add(fiber);
  const beamMeshes = []; // the tall light beams over connected buildings: shown in the network view only
  const DEPTH = -3.2;
  {
    const coreM = new THREE.MeshBasicMaterial({ color: 0x2aa8ff, transparent: true, opacity: 1, depthWrite: false });
    const trunkCoreM = new THREE.MeshBasicMaterial({ color: 0x1a96f5, transparent: true, opacity: 1, depthWrite: false });
    const sleeveM = new THREE.MeshBasicMaterial({ color: 0x4db2ef, transparent: true, opacity: .26, depthWrite: false });
    const tubes = { core: [], trunk: [], sleeve: [] }, ends = [], pulses = { trunk: [], branch: [] };
    CAL.routes.forEach(r => {
      const pts = r.c.map(([lng, lat]) => P(lng, lat)).filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > .2);
      if (pts.length < 2) return;
      const curve = new THREE.CurvePath();
      for (let i = 1; i < pts.length; i++) curve.add(new THREE.LineCurve3(new THREE.Vector3(pts[i - 1][0], DEPTH, pts[i - 1][1]), new THREE.Vector3(pts[i][0], DEPTH, pts[i][1])));
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum[cum.length - 1], seg = Math.max(6, Math.round(L / 6));
      tubes[r.trunk ? 'trunk' : 'core'].push(new THREE.TubeGeometry(curve, seg, r.trunk ? 2.4 : 1.6, 6, false));
      tubes.sleeve.push(new THREE.TubeGeometry(curve, seg, r.trunk ? 7.5 : 5.5, 8, false));
      ends.push(pts[0], pts[pts.length - 1]);
      const count = Math.max(1, Math.round(L / (r.trunk ? 60 : 95)));
      for (let k = 0; k < count; k++) pulses[r.trunk ? 'trunk' : 'branch'].push({ pts, cum, L, off: k / count, speed: (r.trunk ? 95 : 70) / L });
    });
    const tubeMesh = (list, m) => { if (!list.length) return null; const g = mergeGeos(list.map(g => [g, null])); const mesh = new THREE.Mesh(g, m); fiber.add(mesh); return mesh; };
    tubeMesh(tubes.trunk, trunkCoreM); tubeMesh(tubes.core, coreM);
    const sleeve = tubeMesh(tubes.sleeve, sleeveM); if (sleeve) beamMeshes.push(sleeve); // the wide glow reads well from far away, not up close
    // light pulses: one point cloud per size, positions updated each frame
    if (!reduce) {
      const glowTex = radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
      Object.entries(pulses).forEach(([kind, list]) => {
        if (!list.length) return;
        const pos = new Float32Array(list.length * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pm = new THREE.PointsMaterial({ map: glowTex, color: 0xe6f7ff, size: kind === 'trunk' ? 26 : 19, sizeAttenuation: false, transparent: true, depthWrite: false });
        const pts = new THREE.Points(g, pm); pts.frustumCulled = false; pts.userData.px = pm.size; fiber.add(pts); pulseClouds.push(pts);
        tick.push(t => {
          list.forEach((p, i) => {
            const d = ((t * p.speed + p.off) % 1) * p.L; let j = 1; while (j < p.cum.length - 1 && p.cum[j] < d) j++;
            const a = p.pts[j - 1], b = p.pts[j], u = (d - p.cum[j - 1]) / (p.cum[j] - p.cum[j - 1] || 1);
            pos[i * 3] = a[0] + (b[0] - a[0]) * u; pos[i * 3 + 1] = DEPTH; pos[i * 3 + 2] = a[1] + (b[1] - a[1]) * u;
          });
          g.attributes.position.needsUpdate = true;
        });
      });
    }
    // manhole covers where runs meet
    const lids = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.5, 1.5, .12, 16), mat('lid', 0x39424c, { roughness: .45, metalness: .6 }), ends.length); const m4 = new THREE.Matrix4();
    ends.forEach((p, i) => { m4.makeTranslation(p[0], .4, p[1]); lids.setMatrixAt(i, m4); }); lids.receiveShadow = true; fiber.add(lids);
    // risers carry the light up into each connected building, with a ring pulsing on the roof
    const beams = [], caps = [], beamG = new THREE.CylinderGeometry(.45, .45, 1, 8), capG = new THREE.CylinderGeometry(1.6, 1.6, .8, 16);
    const ringTops = [];
    eps.forEach(e => {
      const top = e.generic ? 6 : Math.max(8, e.top);
      beams.push([beamG, new THREE.Matrix4().compose(new THREE.Vector3(e.p[0], (top + DEPTH) / 2, e.p[1]), new THREE.Quaternion(), new THREE.Vector3(1, top - DEPTH, 1))]);
      caps.push([capG, new THREE.Matrix4().makeTranslation(e.p[0], top + .4, e.p[1])]);
      ringTops.push([e.p[0], top + .6, e.p[1], hash(e.id.length * 9 + Math.round(e.p[0]))]);
    });
    // bright core beam plus a soft outer glow, both additive so they read as light
    const beamCore = new THREE.Mesh(mergeGeos(beams), new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
    fiber.add(beamCore); beamMeshes.push(beamCore);
    const beamGlow = (new THREE.Mesh(mergeGeos(beams.map(([g, mm]) => [new THREE.CylinderGeometry(1.7, 1.7, 1, 12, 1, true), mm])), new THREE.MeshBasicMaterial({ color: 0x2aa3f5, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    fiber.add(beamGlow); beamMeshes.push(beamGlow);
    fiber.add(new THREE.Mesh(mergeGeos(caps), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    const rings = new THREE.InstancedMesh(new THREE.RingGeometry(3.6, 6.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }), ringTops.length);
    const rc = new THREE.Color(0x4fc0ff), c2 = new THREE.Color(), v = new THREE.Vector3(), sv = new THREE.Vector3(), q = new THREE.Quaternion();
    const setRings = t => ringTops.forEach(([x, y, z, ph], i) => { m4.compose(v.set(x, y, z), q, sv.set(1.2, 1, 1.2)); rings.setMatrixAt(i, m4); rings.setColorAt(i, c2.copy(rc).multiplyScalar(.55)); });
    setRings(0); fiber.add(rings);
    // a halo of light on every connected roof
    const haloTex = radial('rgba(255,255,255,1)', 'rgba(120,200,255,0)');
    const hpos = new Float32Array(ringTops.length * 3); ringTops.forEach(([x, y, z], i) => { hpos[i * 3] = x; hpos[i * 3 + 1] = y + 1.5; hpos[i * 3 + 2] = z; });
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hpos, 3));
    const halo = new THREE.Points(hg, new THREE.PointsMaterial({ map: haloTex, color: 0x9fdcff, size: PHONE ? 18 : 30, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.userData.px = PHONE ? 18 : 30; pulseClouds.push(halo); fiber.add(halo);
    halo.material.opacity = .7; // rings and halos stay still: no pulsing light
  }
  // draw the fiber after the street so its glow reads through it; buildings still hide it
  fiber.traverse(o => { o.renderOrder = 6; });
  city.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.material && o.material.userData && o.material.userData.order) o.renderOrder = o.material.userData.order; });

  PROF('fiber');
  /* ---------- the plant ---------- */
  const plant = buildPlant(mat, tick);
  plant.root.scale.setScalar(S);
  // at night the plant's pale concrete and white panels sit lower, so its lights carry the scene
  if (NIGHT) { const seen = new Set(); plant.root.traverse(o => { const m = o.material; if (!m || Array.isArray(m) || seen.has(m) || !m.color || m.isMeshBasicMaterial || (m.emissive && m.emissiveIntensity > .3 && m.emissive.getHex())) return; seen.add(m); m.color.multiplyScalar(.62); }); }
  scene.add(plant.root);

  PROF('plant');
  /* ---------- labels (screen space, never overlapping) ---------- */
  const labels = [];
  function addLabel(text, pos, cls, modes, onClick, own = -2) {
    const d = el('div', 's-lbl ' + (cls || ''), text); labelLayer.appendChild(d);
    if (onClick) { d.classList.add('click'); d.setAttribute('role', 'button'); d.tabIndex = 0; d.addEventListener('click', onClick); d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }); }
    labels.push({ d, pos: new THREE.Vector3(...pos), modes, own, w: 0, h: 0, vis: false, x: 0, y: 0 });
  }
  addLabel('Foundation', [0, 34, 0], 'main', ['net'], () => setView(1));
  eps.forEach(e => { if (!e.generic) addLabel(e.name, [e.p[0], Math.max(8, e.top) + 6, e.p[1]], '', ['net'], null, e.b); });
  // a name tag hides when another building stands between the camera and the building it names
  const occ = new THREE.Vector3();
  function occluded(l) {
    const c = camera.position, d = c.distanceTo(l.pos), n = Math.min(160, Math.ceil(d / 7));
    for (let i = 1; i < n; i++) {
      occ.lerpVectors(c, l.pos, i / n); if (occ.y > 260 || occ.y < 0) continue;
      const k = bldAt(occ.x, occ.z); if (k >= 0 && k !== l.own && occ.y < blds[k].h) return true;
    }
    return false;
  }
  // street names are painted on the street itself, so buildings hide them and they never float over rooftops
  const pretty = n => n.replace(/\bAV\b/, 'Ave').replace(/\bST\b/, 'St').replace(/\bTR\b/, 'Tr').replace(/\bDR\b/, 'Dr').replace(/\b([A-Z])([A-Z]+)\b/g, (m, a, b) => /^(SE|SW|NE|NW)$/.test(m) ? m : a + b.toLowerCase());
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  // all street names share one texture atlas and one mesh: a single draw call and a single upload
  const labelQ = [];
  function groundLabel(text, x, z, dx, dz, h, y, alpha) {
    const L = Math.hypot(dx, dz) || 1;
    if (dx < -.2 * L || (Math.abs(dx) <= .2 * L && dz > 0)) { dx = -dx; dz = -dz; } // read west to east, or south to north
    labelQ.push({ text, x, z, a: Math.atan2(dz, dx), h, y, alpha });
  }
  function flushLabels() {
    if (!labelQ.length) return;
    const F = 96, RH = 128, AW = 2048, font = '600 ' + F + 'px "Instrument Sans", "Helvetica Neue", Arial, sans-serif';
    const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = font;
    let cx = 0, cy = 0; labelQ.forEach(l => { l.w = Math.ceil(g.measureText(l.text).width) + 48; if (cx + l.w > AW) { cx = 0; cy += RH; } l.u = cx; l.v = cy; cx += l.w; });
    c.width = AW; c.height = Math.pow(2, Math.ceil(Math.log2(cy + RH)));
    g.font = font; g.textBaseline = 'middle'; g.textAlign = 'center';
    labelQ.forEach(l => { g.fillStyle = 'rgba(255,255,255,' + l.alpha + ')'; g.fillText(l.text, l.u + l.w / 2, l.v + 66); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
    const pos = [], uv = [], H = c.height;
    labelQ.forEach(l => {
      const ph = l.h * RH / F * .78, pw = ph * l.w / RH, ca = Math.cos(l.a), sa = Math.sin(l.a);
      const corner = (px, pz) => [l.x + px * ca - pz * sa, l.y, l.z + px * sa + pz * ca]; // px along the street, pz across (negative = left of reading direction)
      const p0 = corner(-pw / 2, ph / 2), p1 = corner(pw / 2, ph / 2), p2 = corner(pw / 2, -ph / 2), p3 = corner(-pw / 2, -ph / 2);
      const u0 = l.u / AW, u1 = (l.u + l.w) / AW, v0 = 1 - (l.v + RH) / H, v1 = 1 - l.v / H;
      pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3); uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.renderOrder = 5; city.add(m); labelQ.length = 0;
  }
  const STREET_LABELS = [['4 AV SW', [-900, -400]], ['5 AV SW', [-760, -300]], ['6 AV SW', [-900, -240]], ['7 AV SW', [-980, -180]], ['8 AV SW', [-900, -110]], ['9 AV SE', [-170, 0]], ['10 AV SW', [-760, 90]], ['11 AV SE', [-150, 210]], ['12 AV SE', [-450, 300]],
    ['CENTRE ST S', [-620, 150]], ['1 ST SW', [-830, 150]], ['2 ST SW', [-990, 150]], ['4 ST SW', [-1235, 150]], ['1 ST SE', [-460, 150]], ['MACLEOD TR SE', [-290, 150]], ['4 ST SE', [110, 150]], ['RIVERFRONT AV SE', [-300, -560]], ['MEMORIAL DR NE', [-150, -790]]];
  const paintNames = () => { try {
    // up to three labels per street, on open road (not under a building), mid-block, spaced well apart
    STREET_LABELS.forEach(([name, ref]) => {
      const cand = [];
      roads.forEach(r => { if (r.name !== name) return; for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], b = r.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 34) continue; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (!CORE(mx, mz) || bldAt(mx, mz) >= 0 || nearNode(mx, mz, 18)) continue; cand.push([mx, mz, b[0] - a[0], b[1] - a[1], Math.hypot(mx - ref[0], mz - ref[1])]); } });
      cand.sort((a, b) => a[4] - b[4]);
      const chosen = [];
      cand.forEach(c => { if (chosen.length < 3 && c[4] < 900 && chosen.every(o => Math.hypot(o[0] - c[0], o[1] - c[1]) > 380)) chosen.push(c); });
      chosen.forEach(c => groundLabel(pretty(name), c[0], c[1], c[2], c[3], 6.5, .36, .9));
    });
    const at = -650, r = riverAt(at), r2 = riverAt(at + 60);
    if (r && r2) groundLabel('Bow River', at, (r[0] + r[1]) / 2, 60, (r2[0] + r2[1]) / 2 - (r[0] + r[1]) / 2, 22, .2, .7);
    flushLabels();
  } catch (err) { console.error('street names', err); } };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintNames, paintNames); else paintNames();
  const tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), lastCam = new THREE.Matrix4();
  let cardBox = null, labelsDirty = true;
  function placeLabels() {
    camera.updateMatrixWorld();
    if (!labelsDirty && lastCam.equals(camera.matrixWorld)) return;
    lastCam.copy(camera.matrixWorld); labelsDirty = false;
    const W = host.clientWidth, H = host.clientHeight, boxes = [];
    if (!cardBox) { const cr = card.getBoundingClientRect(), hr = host.getBoundingClientRect(); cardBox = { x: cr.left - hr.left, y: cr.top - hr.top, w: cr.width, h: cr.height }; }
    if (!card.hidden) boxes.push(cardBox);
    const order = labels.slice().sort((a, b) => (b.d.classList.contains('main') - a.d.classList.contains('main')));
    order.forEach(l => {
      const hide = () => { if (l.vis) { l.vis = false; l.d.style.opacity = 0; l.d.style.pointerEvents = 'none'; } };
      if (!l.modes.includes(mode)) return hide();
      camera.getWorldDirection(fwd); if (fwd.dot(tmp.copy(l.pos).sub(camera.position)) <= 0) return hide(); // behind the camera
      tmp.copy(l.pos).project(camera);
      const x = (tmp.x + 1) / 2 * W, y = (1 - tmp.y) / 2 * H;
      if (!l.w) { l.w = l.d.offsetWidth || 80; l.h = l.d.offsetHeight || 24; }
      const w = l.w, h = l.h, street = l.d.classList.contains('street');
      const bx = { x: x - w / 2, y: street ? y - h / 2 : y - h - 8, w, h };
      const off = tmp.z > 1 || bx.x < 4 || bx.x + w > W - 4 || bx.y < 4 || bx.y + h > H - 60;
      const hit = boxes.some(o => bx.x < o.x + o.w + 4 && bx.x + bx.w + 4 > o.x && bx.y < o.y + o.h + 3 && bx.y + bx.h + 3 > o.y);
      const far = !street && !l.d.classList.contains('main') && camera.position.distanceTo(l.pos) > 2300;
      if (off || hit || far || (l.own > -2 && occluded(l))) return hide();
      boxes.push(bx);
      if (!l.vis) { l.vis = true; l.d.style.opacity = 1; l.d.style.pointerEvents = l.d.classList.contains('click') ? 'auto' : 'none'; }
      if (Math.abs(bx.x - l.x) > .3 || Math.abs(bx.y - l.y) > .3) { l.x = bx.x; l.y = bx.y; l.d.style.transform = 'translate(' + bx.x.toFixed(1) + 'px,' + bx.y.toFixed(1) + 'px)'; }
    });
  }

  /* ---------- UI ---------- */
  const card = el('div', 'scene-card'); host.appendChild(card);
  const ui = el('div', 'scene-ui'); host.appendChild(ui);
  const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'View'); ui.appendChild(seg);
  const hint = el('span', 'scene-hint', 'Drag to rotate · pinch or scroll to zoom · tap Foundation to go inside'); ui.appendChild(hint);
  const zoomBox = el('div', 'scene-zoom'); host.appendChild(zoomBox);
  [['+', 'Zoom in', .45], ['−', 'Zoom out', 2.2]].forEach(([t, label, f]) => {
    const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-label', label);
    b.addEventListener('click', () => {
      const off = camera.position.clone().sub(controls.target), d = Math.max(controls.minDistance, Math.min(controls.maxDistance, off.length() * f));
      camAnim = { t0: performance.now(), fp: camera.position.clone(), ft: controls.target.clone(), cp: controls.target.clone().add(off.setLength(d)), tp: controls.target.clone(), ms: 650, ease: 'out' };
    });
    zoomBox.appendChild(b);
  });
  const VIEWS = {
    site: { name: 'Foundation', title: 'Foundation', sub: 'Calgary, Alberta', chip: ['chip--live', 'dot--live', 'Online'],
      text: 'Foundation brings 12 MW of secure AI capacity to downtown Calgary.',
      kv: [['12 MW', 'n+1 redundant power'], ['7 km', 'Private fiber'], ['25+', 'Connected buildings'], ['100 kW', 'Phase 1, online']],
      cam: [64, 30, -78], tgt: [6, 8, 2], show: ['p1'], floor: true, roof: true, fade: true },
    net: { name: 'Network', title: 'Foundation', sub: 'Calgary, Alberta', chip: ['chip--live', 'dot--live', 'Online'],
      text: 'Foundation brings 12 MW of secure AI capacity to downtown Calgary.',
      kv: [['12 MW', 'n+1 redundant power'], ['7 km', 'Private fiber'], ['25+', 'Connected buildings'], ['100 kW', 'Phase 1, online']],
      cam: [260, 760, 900], tgt: [-420, 0, -120], show: [], floor: true, roof: true, fade: false },
    1: { name: 'Phase 1', title: 'Phase 1', sub: 'Foundation', chip: ['chip--live', 'dot--live', 'Online'], text: 'Online. 100 kW.',
      cam: [-20, 36, -68], tgt: [-6, 4, 0], show: ['p1'], floor: true, roof: false, fade: true },
    2: { name: 'Phase 2', title: 'Phase 2', sub: 'Foundation', chip: ['chip--dev', 'dot--dev', 'Feb 2027'], text: 'February 2027. 2 MW.',
      cam: [12, 62, -38], tgt: [5, -7, 1], show: ['p1', 'p2'], floor: false, roof: false, fade: true },
    3: { name: 'Phase 3', title: 'Phase 3', sub: 'Foundation', chip: ['chip--soon', 'dot--soon', 'Full Foundation'], text: 'Full Foundation. 12 MW.',
      cam: [70, 70, -80], tgt: [8, 10, 4], show: ['p1', 'p2', 'p3'], floor: true, roof: true, fade: true }
  };
  ['site', 1, 2, 3, 'net'].forEach(k => {
    const b = el('button', '', VIEWS[k].name); b.type = 'button'; b.dataset.v = k;
    b.addEventListener('click', () => setView(k)); seg.appendChild(b);
  });
  let mode = 'net', camAnim = null, lastMove = performance.now();
  function setView(k, instant) {
    const V = VIEWS[k]; mode = k === 'net' ? 'net' : 'phase';
    beamMeshes.forEach(b => { b.visible = k === 'net'; });
    ['p1', 'p2', 'p3'].forEach(g => { plant.groups[g].visible = V.show.includes(g); });
    plant.groups.floorFront.visible = V.floor; plant.groups.roof.visible = true;
    plant.groups.roof.traverse(o => { if (!o.material) return; const ghost = !V.roof; if (o.material.transparent !== ghost) { o.material.transparent = ghost; o.material.depthWrite = !ghost; o.material.needsUpdate = true; } o.material.opacity = ghost ? .14 : 1; });
    nearMats.forEach(m => { if (m.transparent !== V.fade) { m.transparent = V.fade; m.depthWrite = !V.fade; m.needsUpdate = true; } m.opacity = V.fade ? .12 : 1; });
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(k))));
    card.innerHTML = '<div class="t"><div><b>' + V.title + '</b><span class="sub">' + V.sub + '</span></div><span class="chip ' + V.chip[0] + '"><i class="dot ' + V.chip[1] + '"></i>' + V.chip[2] + '</span></div><p>' + V.text + '</p>' +
      (V.kv ? '<div class="kv">' + V.kv.map(x => '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('') + '</div>' : '');
    cardBox = null; labelsDirty = true;
    if (mode === 'net') shadowAround(-380, 40, 1150); else shadowAround(0, 0, 110);
    const s = phoneNow() ? (k === 'net' ? 1.45 : 1.6) : 1;
    const tp = new THREE.Vector3(...V.tgt), cp = new THREE.Vector3(...V.cam).sub(tp).multiplyScalar(s).add(tp);
    lastMove = performance.now();
    if (instant || reduce) { camera.position.copy(cp); controls.target.copy(tp); controls.update(); return; }
    camAnim = { t0: performance.now(), fp: camera.position.clone(), ft: controls.target.clone(), cp, tp, ms: 2100 };
  }
  controls.addEventListener('start', () => { camAnim = null; });
  controls.addEventListener('change', () => { lastMove = performance.now(); });

  // tap the plant to go inside
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), plantBox = new THREE.Box3();
  let down = null, hoverQueued = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    if (!CINE && mode === 'net' && pickPlant(e)) setView(1);
  });
  renderer.domElement.addEventListener('pointermove', e => { if (CINE || mode !== 'net' || e.buttons || e.pointerType === 'touch') return; hoverQueued = e; });
  function pickPlant(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    plantBox.setFromObject(plant.groups.base);
    return !!ray.ray.intersectBox(plantBox, tmp);
  }

  function size() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    // big canvases (like the full-width map stage) start at a lower resolution so the first frames stay smooth
    if (!tuned) { const cap = PHONE ? 1.5 : (w * h > 1.1e6 ? 1.2 : 1.6); if (Math.abs(Math.min(DPR, cap) - pixelRatio) > .01) { pixelRatio = Math.min(DPR, cap); renderer.setPixelRatio(pixelRatio); } }
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < 700 ? 50 : 38;
    // cinematic on wide screens: shift the frame so the city sits to the right of the headline
    if (CINE && opts.frameRight && w >= 900) camera.setViewOffset(w, h, -w * .17, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    cardBox = null; labelsDirty = true; labels.forEach(l => { l.w = 0; });
  }
  // a resized canvas is blank until it is drawn again, so redraw straight away instead of flashing the background
  const resized = () => { size(); if (canDraw) renderer.render(scene, camera); };
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resized) : null;
  if (ro) ro.observe(host); else window.addEventListener('resize', resized);
  size();
  setView(opts.view || 'site', true);
  const reveal = () => {
    loading.remove(); host.classList.add('scene--ready');
    // cinematic: a slow push in from high above, easing to rest
    if (CINE && !reduce) {
      const tp = controls.target.clone(), cp = camera.position.clone();
      const fp = cp.clone().sub(tp).multiplyScalar(1.55).add(tp); fp.y *= 1.2;
      camera.position.copy(fp); controls.update();
      camAnim = { t0: performance.now(), fp, ft: tp.clone(), cp, tp, ms: 5200, ease: 'out' };
    }
  };

  // expose a small debug hook for profiling
  window.__sscam = (cp, tp) => { camAnim = null; camera.position.set(...cp); controls.target.set(...tp); controls.update(); lastMove = performance.now(); };
  window.__ssinfo = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, programs: renderer.info.programs.length, pr: renderer.getPixelRatio() });

  PROF('ui');
  let compiled = false;
  (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve()).catch(() => {}).then(() => { compiled = true; canDraw = true; PROF('compile'); });
  let visible = true, alive = true, firstFrame = true, frame = 0;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }) : null;
  if (io) io.observe(host);
  const clock = new THREE.Clock();
  // adaptive resolution: if frames are slow on this device, step the pixel ratio down
  const ft = []; let lastT = 0;
  function adapt(now) {
    if (lastT) ft.push(now - lastT); lastT = now;
    if (ft.length < 50) return;
    const sorted = ft.slice().sort((a, b) => a - b), med = sorted[ft.length >> 1]; ft.length = 0;
    if (med > 26 && pixelRatio > 1 && tuned < 3) { pixelRatio = Math.max(1, pixelRatio - .25); renderer.setPixelRatio(pixelRatio); size(); renderer.render(scene, camera); tuned++; }
  }
  (function loop(now) {
    if (!alive) return;
    requestAnimationFrame(loop);
    if (!visible || !compiled) return;
    frame++;
    const t = clock.getElapsedTime();
    if (camAnim) {
      const u = Math.min(1, (performance.now() - camAnim.t0) / camAnim.ms), e = camAnim.ease === 'out' ? 1 - Math.pow(1 - u, 4) : (u < .5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2);
      camera.position.lerpVectors(camAnim.fp, camAnim.cp, e);
      controls.target.lerpVectors(camAnim.ft, camAnim.tp, e);
      if (u >= 1) camAnim = null;
      lastMove = performance.now();
    }
    controls.update();
    // when nobody is moving the camera, the ambient animation runs at half rate to save battery
    const idle = CINE ? !camAnim : !camAnim && performance.now() - lastMove > 1200; // the slow orbit is smooth at half rate
    if (idle && frame % 2) return;
    if (hoverQueued) { renderer.domElement.style.cursor = pickPlant(hoverQueued) ? 'pointer' : ''; hoverQueued = null; }
    if (!reduce) tick.forEach(f => f(t));
    pulseClouds.forEach(p => { p.material.size = p.userData.px * pixelRatio / 1.5; });
    renderer.render(scene, camera);
    placeLabels();
    if (firstFrame) { firstFrame = false; PROF('frame1'); requestAnimationFrame(reveal); }
    else if (now && tuned < 3) adapt(now);
  })();

  return {
    setView,
    destroy() { alive = false; if (ro) ro.disconnect(); if (io) io.disconnect(); controls.dispose(); renderer.dispose(); pmrem.dispose(); host.innerHTML = ''; }
  };
}
/* ---------- helpers ---------- */
function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text) d.textContent = text; return d; }
function inPoly(x, z, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
function decodeBuildings(arr) { return arr.map(a => { const p = []; let x = 0, z = 0; for (let i = 1; i < a.length; i += 2) { x += a[i]; z += a[i + 1]; p.push([x / 10, z / 10]); } return { h: a[0] / 10, p }; }); }
function radial(a, b) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, a); r.addColorStop(1, b); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function noiseTex(base, amt) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { const v = Math.random() > .5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${amt})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// merge [geometry, matrix|null] pairs into one non-indexed geometry (position, normal, uv)
function mergeGeos(list) {
  let n = 0; const parts = list.map(([g, m]) => { const gg = g.index ? g.toNonIndexed() : g.clone(); if (m) gg.applyMatrix4(m); n += gg.attributes.position.count; return gg; });
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  parts.forEach(g => { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nrm.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += c; g.dispose(); });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}
function mergeColored(parts) {
  let n = 0; parts.forEach(g => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  parts.forEach(g => { pos.set(g.attributes.position.array, o * 3); nrm.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
// Merge every static mesh under `group` into one mesh per material. Meshes flagged userData.dyn
// (or inside a flagged parent) are animated and stay separate.
function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map(), victims = [];
  group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    for (let p = o; p && p !== group; p = p.parent) if (p.userData.dyn) return;
    const key = o.material.uuid + (o.castShadow ? 's' : '') + (o.receiveShadow ? 'r' : '');
    if (!byMat.has(key)) byMat.set(key, { m: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] });
    byMat.get(key).list.push([o.geometry, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)]);
    victims.push(o);
  });
  victims.forEach(o => o.parent.remove(o));
  byMat.forEach(({ m, cast, recv, list }) => { const mesh = new THREE.Mesh(mergeGeos(list), m); mesh.castShadow = cast; mesh.receiveShadow = recv; group.add(mesh); });
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
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// steam: one point cloud with per-particle size and fade
function steamCloud(n) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { map: { value: radial('rgba(255,255,255,.9)', 'rgba(255,255,255,0)') }, uScale: { value: 600 } },
    vertexShader: 'attribute float aSize; attribute float aAlpha; varying float vA; uniform float uScale; void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; varying float vA; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(0.93, 0.95, 0.97, c.a * vA); }',
    transparent: true, depthWrite: false
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.dyn = true;
  p.onBeforeRender = (r, s, cam) => { const v = new THREE.Vector2(); r.getDrawingBufferSize(v); m.uniforms.uScale.value = v.y / (2 * Math.tan(cam.fov * Math.PI / 360)); };
  return p;
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
  function pipe(points, r, m, parent) { const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0); const t = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(72, Math.max(16, points.length * 6)), r, 8, false), m); t.castShadow = true; parent.add(t); return t; }
  function hallShape(inset = 0) {
    const { w, e, f, r, R } = HALL; const s = new THREE.Shape();
    const W0 = w + inset, E0 = e - inset, F0 = f + inset, R0 = r - inset, RR = R - inset;
    const RE = Math.max(.02, .12 - inset * .5); // as on gosimply.ai: the west end is rounded, the east end square
    s.moveTo(W0, R0); s.lineTo(W0, F0 + RR); s.absarc(W0 + RR, F0 + RR, RR, Math.PI, Math.PI * 1.5, false);
    s.lineTo(E0 - RE, F0); s.absarc(E0 - RE, F0 + RE, RE, Math.PI * 1.5, Math.PI * 2, false); s.lineTo(E0, R0); s.lineTo(W0, R0); return s;
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
    // light lines along the glass, as in the official model: a cool strip at the base and a white line under the roof band
    const lineM = (c, k) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: .5 });
    pipe(ribbon.map(p => [p.x, .2, p.y]), .035, lineM(0xcfefff, 1.0), B);
    pipe(ribbon.map(p => [p.x, HALL.H - .16, p.y]), .022, lineM(0xffffff, .9), B);
    // warm ceiling panels inside the hall, seen through the glass
    const ceil = lineM(0xfff1d6, .85), cp = [];
    for (let x = HALL.w + 1.2; x < HALL.e - .6; x += 1.5) for (let z = HALL.f + 1.0; z < HALL.r - .6; z += 1.6) {
      const dx = x - (HALL.w + HALL.R), dz = z - (HALL.f + HALL.R);
      if (x < HALL.w + HALL.R && z < HALL.f + HALL.R && Math.hypot(dx, dz) > HALL.R - .7) continue; // keep inside the rounded end
      cp.push([new THREE.BoxGeometry(.9, .03, .22), new THREE.Matrix4().makeTranslation(x, HALL.H - .1, z)]);
    }
    const panels = new THREE.Mesh(mergeGeos(cp), ceil); B.add(panels);
    box(HALL.e - HALL.w, HALL.H, .2, concrete, (HALL.w + HALL.e) / 2, 0, HALL.r - .1, B);
    box(BASE.x1 - BASE.x0, .12, BASE.z1, floorM, (BASE.x0 + BASE.x1) / 2, -.12, BASE.z1 / 2, B);
    box(BASE.x1 - BASE.x0, .12, -BASE.z0, floorM, (BASE.x0 + BASE.x1) / 2, -.12, BASE.z0 / 2, groups.floorFront);
    const hs = hallShape(); const hh = new THREE.Path(); hh.moveTo(BASE.x0, BASE.z0); hh.lineTo(BASE.x0, BASE.z1); hh.lineTo(BASE.x1, BASE.z1); hh.lineTo(BASE.x1, BASE.z0); hh.lineTo(BASE.x0, BASE.z0); hs.holes.push(hh);
    const hsm = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: .12, bevelEnabled: false }).rotateX(Math.PI / 2), floorM); hsm.position.y = .12; hsm.receiveShadow = true; B.add(hsm);
    const roofG = new THREE.ExtrudeGeometry(hallShape(.05), { depth: .22, bevelEnabled: false }).rotateX(Math.PI / 2);
    const roof = new THREE.Mesh(roofG, mat('proof', 0x08090b, { roughness: .92 })); roof.position.y = HALL.H + .26; roof.castShadow = true; roof.receiveShadow = true; groups.roof.add(roof);
    const bs = hallShape(); bs.holes.push(hallShape(.3));
    const band = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: .34, bevelEnabled: false }).rotateX(Math.PI / 2), mat('band', 0x0b0d10, { roughness: .4, metalness: .3 })); band.position.y = HALL.H + .34; band.castShadow = true; B.add(band);
    // Calgary District Heating sign on the roof edge (the plant's own name), Simply Silicon below on the band
    const eM = mat('signEdge', 0x7c848d, { metalness: .4, roughness: .5 }), hsM = [eM, eM, eM, eM, new THREE.MeshStandardMaterial({ map: heatSignTex(), roughness: .5, metalness: .2 }), eM];
    const heatSign = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.25, .22), hsM); heatSign.scale.set(.72, .72, 1); heatSign.position.set(HALL.e + .14, 2.35, 1.4); heatSign.rotation.y = Math.PI / 2; heatSign.castShadow = true; B.add(heatSign);
    const ss = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .27), new THREE.MeshBasicMaterial({ map: signTex() })); ss.position.set(3.4, HALL.H + .17, HALL.f - .006); ss.rotation.y = Math.PI; B.add(ss);
    { // street front, after the official model
      const white = mat('fwhite', 0xeef1f4, { roughness: .55 }), dark = mat('fdark', 0x111317, { roughness: .6 });
      const glow = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff1c8, emissiveIntensity: 1.1, roughness: .6 });
      const zF = HALL.f;
      box(1.55, 2.5, .34, white, HALL.e - .86, .12, zF - .17, B);                       // entrance block
      box(1.0, 1.55, .02, glow, HALL.e - .86, .55, zF - .35, B).castShadow = false;       // lit louvre panel
      for (let i = 0; i < 9; i++) box(1.0, .035, .04, white, HALL.e - .86, .62 + i * .16, zF - .37, B).castShadow = false;
      for (let i = 0; i < 6; i++) cyl(.07, .5, dark, HALL.e - .25 - i * .32, .12, zF - .78, B, 12);   // bollards
      box(3.5, 1.5, .1, white, HALL.e - 3.75, .3, zF - .1, B);                            // exhaust-fan sign frame
      box(3.2, 1.22, .02, mat('fred', 0xc8323a, { roughness: .5 }), HALL.e - 3.75, .44, zF - .155, B).castShadow = false;
      box(3.12, 1.14, .02, white, HALL.e - 3.75, .48, zF - .165, B).castShadow = false;
      const grill = mat('fgrill', 0x2a2e34, { roughness: .5 }), bladeW = mat('fblade', 0xe9edf1, { roughness: .4 });
      [-1.0, 0, 1.0].forEach(dx => {
        const fx = HALL.e - 3.75 + dx;
        box(.86, .86, .06, grill, fx, .62, zF - .2, B);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.33, .025, 8, 28), bladeW); ring.position.set(fx, 1.05, zF - .24); B.add(ring);
        [0, Math.PI / 2].forEach(a => { const bar = new THREE.Mesh(new THREE.BoxGeometry(.62, .04, .012), bladeW); bar.position.set(fx, 1.05, zF - .245); bar.rotation.z = a; B.add(bar); });
      });
      const vents = [0x15171a, 0x3a2a20, 0x5a3a24, 0x23262b, 0x15171a, 0x1e3a2c, 0x24402e, 0x15171a];
      vents.forEach((c, i) => box(.34, .05, .3, mat('vent' + i, c, { roughness: .7 }), HALL.e - 2.4 - i * .52, .1, zF - .95, B).castShadow = false);
    }
    { // street light at the east corner
      const poleM = mat('pole', 0xb9c1c9, { metalness: .6, roughness: .35 });
      cyl(.045, 3.4, poleM, HALL.e + .5, .12, HALL.f - 1.1, B, 10);
      box(.5, .06, .14, poleM, HALL.e + .3, 3.5, HALL.f - 1.1, B);
      box(.3, .025, .1, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 1.2 }), HALL.e + .2, 3.47, HALL.f - 1.1, B).castShadow = false;
    }
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
    const tankM = mat('tank', 0xe4e8ec, { metalness: .6, roughness: .22 });
    [5.2, 6.4, 7.6].forEach(x => { cyl(.52, 1.82, tankM, x, .12, 2.3, B, 32); const cap = new THREE.Mesh(new THREE.SphereGeometry(.52, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tankM); cap.position.set(x, 1.94, 2.3); cap.scale.y = .35; B.add(cap); });
    pipe([[-5.4, 2.6, 2.95], [8.2, 2.6, 2.95]], .09, steelM, B);
    pipe([[-5.4, 2.85, 2.95], [8.2, 2.85, 2.95]], .07, mat('hotpipe', COL.heat, { roughness: .45 }), B);
    box(2.4, 1.5, 1.6, mat('sub', 0x8e99a5, { metalness: .55, roughness: .4 }), 7.2, .12, 6.2, B);
    for (let i = 0; i < 6; i++) box(.05, 1.2, 1.64, mat('fin', 0x77828e, { metalness: .5 }), 6.2 + i * .36, .27, 6.2, B).castShadow = false;
    const fenceM = mat('fence', 0x9aa4ae, { metalness: .6, roughness: .4 });
    [[5.6, 4.6, 8.6], [5.6, 7.8, 8.6]].forEach(([x0, z, x1]) => box(x1 - x0 + 5, .9, .03, fenceM, (x0 + x1 + 5) / 2, .12, z, B).castShadow = false);
    const gen = cyl(.55, 2.4, mat('gen', 0xd9dde1, { metalness: .5, roughness: .35 }), 10.9, -.65, 6.2, B); gen.rotation.z = Math.PI / 2; gen.position.y = .72;
    box(2.6, .15, 1.0, steelM, 10.9, .12, 6.2, B);
    // white lattice frames around the four stainless stacks
    const frameM = mat('stackFrame', 0xf4f6f8, { roughness: .45, metalness: .2 }), fl = [];
    const post = new THREE.BoxGeometry(.06, 2.3, .06), bar = new THREE.BoxGeometry(.72, .05, .05);
    [-4.2, -2.9, -1.6, -.3].forEach(x => {
      const y0 = HALL.H + .34, w = .36, lv = [0, .77, 1.54, 2.3];
      [[-w, -w], [w, -w], [w, w], [-w, w]].forEach(([dx, dz]) => fl.push([post, new THREE.Matrix4().makeTranslation(x + dx, y0 + 1.15, 2.6 + dz)]));
      for (let l = 0; l < 3; l++) {
        const ya = y0 + lv[l], yb = y0 + lv[l + 1], len = Math.hypot(.72, yb - ya), ang = Math.atan2(yb - ya, .72);
        const dg = new THREE.BoxGeometry(len, .045, .045);
        [[0, -w], [0, w]].forEach(([, dz]) => { [ang, -ang].forEach(a => fl.push([dg, new THREE.Matrix4().makeTranslation(x, (ya + yb) / 2, 2.6 + dz).multiply(new THREE.Matrix4().makeRotationZ(a))])); });
        [[-w, 0], [w, 0]].forEach(([dx]) => { [ang, -ang].forEach(a => fl.push([dg, new THREE.Matrix4().makeTranslation(x + dx, (ya + yb) / 2, 2.6).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationZ(a))])); });
        [[0, -w], [0, w]].forEach(([, dz]) => fl.push([bar, new THREE.Matrix4().makeTranslation(x, yb, 2.6 + dz)]));
        [[-w, 0], [w, 0]].forEach(([dx]) => fl.push([bar, new THREE.Matrix4().makeTranslation(x + dx, yb, 2.6).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))]));
      }
    });
    const frames = new THREE.Mesh(mergeGeos(fl), frameM); frames.castShadow = true; B.add(frames);
    const stackM = mat('stack', 0xc4cbd2, { metalness: .85, roughness: .22 }), capRingM = mat('capring', 0x6c7682, { metalness: .6 });
    const steam = steamCloud(24); B.add(steam);
    const sp = steam.geometry.attributes.position.array, ss = steam.geometry.attributes.aSize.array, sa = steam.geometry.attributes.aAlpha.array;
    [-4.2, -2.9, -1.6, -.3].forEach(x => {
      cyl(.3, 4.2, stackM, x, HALL.H, 2.6, B, 24);
      [1.2, 2.6, 4.0].forEach(yy => { const r = new THREE.Mesh(new THREE.TorusGeometry(.31, .035, 8, 24), capRingM); r.rotation.x = Math.PI / 2; r.position.set(x, HALL.H + yy, 2.6); B.add(r); });
    });
    tick.push(t => {
      [-4.2, -2.9, -1.6, -.3].forEach((x, i) => {
        for (let k = 0; k < 6; k++) {
          const j = i * 6 + k, u = (t * .1 + (k / 6 + i * .13) % 1) % 1;
          sp[j * 3] = x + u * 1.2; sp[j * 3 + 1] = HALL.H + 4.3 + u * 3.6; sp[j * 3 + 2] = 2.6 + u * .5;
          ss[j] = (.7 + u * 2.6) * S; sa[j] = Math.sin(u * Math.PI) * .6;
        }
      });
      steam.geometry.attributes.position.needsUpdate = steam.geometry.attributes.aSize.needsUpdate = steam.geometry.attributes.aAlpha.needsUpdate = true;
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
      q.led.forEach((list, k) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeos(list), new THREE.MeshBasicMaterial({ color: q.color })); m.userData.dyn = true; parent.add(m); });
    });
    rackQ.clear();
  }
  { // Phase 1
    const g = groups.p1;
    box(4.35, .44, 3.55, floorM, -2.6, -.12, .4, g);
    for (let i = 0; i < 4; i++) rack(.46, 1.66, .78, -3.9 + i * .62, .4, .32, g);
    box(2.6, .05, .5, mat('tray', 0x9fb3c6, { metalness: .6 }), -2.97, 2.1, .4, g);
    const fanM = mat('fanb', COL.fan, { roughness: .5, emissive: COL.fan, emissiveIntensity: .25 });
    [-4.2, -2.6, -1.0].forEach(x => {
      box(.9, .9, .5, mat('fanbox', 0xcfd6dd, { metalness: .5, roughness: .3 }), x, .32, 1.95, g);
      const blades = new THREE.Group(); blades.position.set(x, .77, 1.69); blades.userData.dyn = true;
      for (let b = 0; b < 4; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.34, .08, .02), fanM); bl.rotation.z = b * Math.PI / 2; bl.position.set(Math.cos(b * Math.PI / 2) * .15, Math.sin(b * Math.PI / 2) * .15, 0); blades.add(bl); }
      g.add(blades); tick.push(t => { blades.rotation.z = -t * 6; });
    });
  }
  { // Phase 2
    const g = groups.p2, y0 = -BASE.depth;
    const conc = new THREE.MeshStandardMaterial({ map: noiseTex('#bcc3cb', .07), roughness: .95 });
    box(BASE.x1 - BASE.x0, .14, BASE.z1 - BASE.z0, conc, (BASE.x0 + BASE.x1) / 2, y0 - .14, 0, g);
    box(BASE.x1 - BASE.x0, BASE.depth, .16, conc, (BASE.x0 + BASE.x1) / 2, y0, BASE.z1 - .08, g);
    box(.16, BASE.depth, BASE.z1 - BASE.z0, conc, BASE.x0 + .08, y0, 0, g);
    box(.16, BASE.depth, BASE.z1 - BASE.z0, conc, BASE.x1 - .08, y0, 0, g);
    box(BASE.x1 - BASE.x0, BASE.depth, .1, mat('bcut', 0xb7bec6, { transparent: true, opacity: .16, depthWrite: false }), (BASE.x0 + BASE.x1) / 2, y0, BASE.z0 + .05, g).castShadow = false;
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) rack(.47, 1.34, .82, -3.9 + i * .6, -1.5 + row * 1.1, y0, g, COL.cyan);
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
  }
  // a V-type dry cooler: dark box, a tilted face with two fans, fins on the front
  const yR = HALL.H + .27;
  function dryCooler(x, z, g) {
    const body = mat('dcBody', 0x3b4148, { roughness: .5, metalness: .4 }), face = mat('dcFace', 0x52595f, { roughness: .45, metalness: .5 });
    const ringM = mat('dcRing', 0x1a1d21, { roughness: .5 }), bladeM = mat('dcBlade', 0xe6eaee, { roughness: .4 }), finM = mat('dcFin', 0xc9d0d6, { metalness: .5 });
    box(1.4, .42, .82, body, x, yR, z, g);
    box(1.4, .36, .12, body, x, yR + .42, z + .35, g);
    for (let i = 0; i < 10; i++) box(.02, .3, .02, finM, x - .6 + i * .133, yR + .05, z - .42, g).castShadow = false;
    const tilt = new THREE.Group(); tilt.position.set(x, yR + .6, z); tilt.rotation.x = -.5; g.add(tilt);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.4, .05, .86), face); panel.castShadow = true; tilt.add(panel);
    [-.35, .35].forEach(dx => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .03, 24), ringM); disc.position.set(dx, .03, 0); tilt.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.3, .022, 8, 24), bladeM); ring.rotation.x = Math.PI / 2; ring.position.set(dx, .05, 0); tilt.add(ring);
      const bl = new THREE.Group(); bl.position.set(dx, .06, 0); bl.userData.dyn = true;
      for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.24, .012, .06), bladeM); b.position.x = .13; const pv = new THREE.Group(); pv.rotation.y = k * Math.PI / 3; pv.add(b); bl.add(pv); }
      tilt.add(bl); tick.push(t => { bl.rotation.y = t * 4; });
    });
    // railing in front of this cooler
    const railM = mat('dcRail', 0xe9edf1, { metalness: .4, roughness: .4 });
    for (let i = 0; i < 4; i++) box(.03, .42, .03, railM, x - .7 + i * .467, yR, z - .78, g).castShadow = false;
    [.22, .42].forEach(h => box(1.46, .025, .025, railM, x, yR + h, z - .78, g).castShadow = false);
  }
  const COOLER_X = [-4.5, -3.0, -1.5, 0.0], COOLER_Z = -.95;
  { // the cooling loop along the front of the roof (Phase 3)
    const g = groups.p3;
    pipe([[-5.0, yR + .05, -2.55], [-2.4, yR + .14, -2.78], [1.2, yR + .14, -2.78], [3.4, yR + .05, -2.5]], .06, mat('coolLoop', 0xc7ecf8, { roughness: .3, emissive: 0x7fd2f2, emissiveIntensity: .25 }), g);
  }
  { // Phase 3: the full roof, more racks across the ground floor, and the hot loop to the plant
    const g = groups.p3;
    COOLER_X.forEach(x => dryCooler(x, COOLER_Z, g));
    pipe([[-5.1, yR + .1, 1.9], [-2.6, yR + .3, 1.55], [.1, yR + .25, 1.7], [1.1, yR + .15, 2.3], [1.35, yR - .1, 3.25]], .075, mat('hotHose', 0xe0563a, { roughness: .5 }), g);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 8; i++) rack(.47, 1.72, .84, 1.2 + i * .6, -2.3 + row * 1.15, .24, g, COL.cyan);
  }
  flushRacks();
  // animated parts never cast shadows (shadows are drawn once per view)
  root.traverse(o => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.dyn) { o.castShadow = false; break; } });
  Object.values(groups).forEach(mergeStatic);
  return { root, groups };
}
