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
  fiber: 0x2aa3f5, mullion: 0x4e5966, steel: 0xaeb7c1, stainless: 0xd5dbe1, copper: 0xc27a4a,
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
  const PHONE = phoneNow();
  host.innerHTML = '';
  host.classList.add('scene--live');
  const loading = el('div', 'scene-loading', 'Loading 3D view');
  host.appendChild(loading);

  /* ---------- renderer, camera, light ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const DPR = window.devicePixelRatio || 1;
  let pixelRatio = Math.min(DPR, PHONE ? 1.5 : 1.6);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // the city is static: shadows are redrawn only when the view changes
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const labelLayer = el('div', 'scene-labels'); host.appendChild(labelLayer);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdfe8f1, 3200, 7600);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 4, 9000); // near plane at 4 m keeps distant ground layers from shimmering
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = 22; controls.maxDistance = 3200;
  controls.maxPolarAngle = Math.PI * .46;
  controls.screenSpacePanning = false;

  scene.add(new THREE.HemisphereLight(0xeaf3ff, 0xa9b4bf, .62));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
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
  {
    const gs = new THREE.Shape(); gs.moveTo(-4500, -4500); gs.lineTo(4500, -4500); gs.lineTo(4500, 4500); gs.lineTo(-4500, 4500); gs.lineTo(-4500, -4500);
    const hole = new THREE.Path(); const hb = { x0: -4.5 * S, x1: 6.85 * S, z0: -2.85 * S, z1: 2.85 * S };
    hole.moveTo(hb.x0, hb.z0); hole.lineTo(hb.x0, hb.z1); hole.lineTo(hb.x1, hb.z1); hole.lineTo(hb.x1, hb.z0); hole.lineTo(hb.x0, hb.z0); gs.holes.push(hole);
    const ground = new THREE.Mesh(new THREE.ShapeGeometry(gs).rotateX(Math.PI / 2), flatMat('ground', COL.ground, 1));
    ground.receiveShadow = true; city.add(ground);
  }
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
    const grass = new THREE.Mesh(band(3, 4), mat('grass', COL.grass, { roughness: 1 })); grass.position.y = .06; grass.receiveShadow = true; city.add(grass);
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
  const flat = (arr, m) => {
    if (!arr.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const n = new Float32Array(arr.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; city.add(mesh); return mesh;
  };
  flat(ribbons.walk, flatMat('walk', COL.sidewalk, 2));
  flat(ribbons.alley, flatMat('alley', COL.alley, 3));
  flat(ribbons.road, flatMat('road', COL.road, 3));
  flat(ribbons.bed, flatMat('bed', COL.bed, 4));

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
    const trunks = new THREE.InstancedMesh(trunkG, mat('trunk', 0x7b6a58), MAXT), crowns = new THREE.InstancedMesh(crownG, mat('crown', 0xffffff, { roughness: .9 }), MAXT);
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
            crowns.setColorAt(n, col.setHSL(.25 + hash(n) * .07, .3, .42 + hash(n * 3) * .1)); n++;
          });
        }
        carry = (carry - L) % 13; if (carry < 0) carry += 13;
      }
    });
    trunks.count = crowns.count = n; crowns.castShadow = true; city.add(trunks, crowns);
  }

  PROF('trees');
  /* ---------- fiber: underground conduits, seen through the street, with light travelling through them ---------- */
  const fiber = new THREE.Group(); scene.add(fiber);
  const DEPTH = -3.2;
  {
    const coreM = new THREE.MeshBasicMaterial({ color: 0x1f93ec, transparent: true, opacity: 1, depthWrite: false });
    const trunkCoreM = new THREE.MeshBasicMaterial({ color: 0x0f7fd8, transparent: true, opacity: 1, depthWrite: false });
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
    const tubeMesh = (list, m) => { if (!list.length) return; const g = mergeGeos(list.map(g => [g, null])); fiber.add(new THREE.Mesh(g, m)); };
    tubeMesh(tubes.trunk, trunkCoreM); tubeMesh(tubes.core, coreM); tubeMesh(tubes.sleeve, sleeveM);
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
    fiber.add(new THREE.Mesh(mergeGeos(beams), new THREE.MeshBasicMaterial({ color: COL.fiber, transparent: true, opacity: .6, depthWrite: false })));
    fiber.add(new THREE.Mesh(mergeGeos(caps), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    const rings = new THREE.InstancedMesh(new THREE.RingGeometry(3.2, 4.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }), ringTops.length);
    const rc = new THREE.Color(COL.fiber), c2 = new THREE.Color(), v = new THREE.Vector3(), sv = new THREE.Vector3(), q = new THREE.Quaternion();
    const setRings = t => ringTops.forEach(([x, y, z, ph], i) => { const f = reduce ? 0 : (t * .6 + ph) % 1, s = 1 + f * .9; m4.compose(v.set(x, y, z), q, sv.set(s, 1, s)); rings.setMatrixAt(i, m4); rings.setColorAt(i, c2.copy(rc).multiplyScalar(1.4 * (1 - f))); });
    setRings(0); fiber.add(rings);
    if (!reduce) tick.push(t => { setRings(t); rings.instanceMatrix.needsUpdate = true; rings.instanceColor.needsUpdate = true; });
  }
  // draw the fiber after the street so its glow reads through it; buildings still hide it
  fiber.traverse(o => { o.renderOrder = 6; });
  city.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.material && o.material.userData && o.material.userData.order) o.renderOrder = o.material.userData.order; });

  PROF('fiber');
  /* ---------- the plant ---------- */
  const plant = buildPlant(mat, tick);
  plant.root.scale.setScalar(S);
  scene.add(plant.root);

  PROF('plant');
  /* ---------- labels (screen space, never overlapping) ---------- */
  const labels = [];
  function addLabel(text, pos, cls, modes, onClick) {
    const d = el('div', 's-lbl ' + (cls || ''), text); labelLayer.appendChild(d);
    if (onClick) { d.classList.add('click'); d.setAttribute('role', 'button'); d.tabIndex = 0; d.addEventListener('click', onClick); d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }); }
    labels.push({ d, pos: new THREE.Vector3(...pos), modes, w: 0, h: 0, vis: false, x: 0, y: 0 });
  }
  addLabel('Foundation', [0, 34, 0], 'main', ['net'], () => setView(1));
  eps.forEach(e => { if (!e.generic) addLabel(e.name, [e.p[0], Math.max(8, e.top) + 6, e.p[1]], '', ['net']); });
  // street names from the City data, placed on the point of each street nearest the core
  const pretty = n => n.replace(/\bAV\b/, 'Ave').replace(/\bST\b/, 'St').replace(/\bTR\b/, 'Tr').replace(/\bDR\b/, 'Dr').replace(/\b([A-Z])([A-Z]+)\b/g, (m, a, b) => /^(SE|SW|NE|NW)$/.test(m) ? m : a + b.toLowerCase());
  [['5 AV SW', [-700, -300]], ['7 AV SW', [-760, -200]], ['9 AV SE', [-160, 0]], ['11 AV SE', [-160, 210]], ['CENTRE ST S', [-620, 60]], ['MACLEOD TR SE', [-290, 120]], ['4 ST SE', [100, 120]], ['1 ST SW', [-830, 60]], ['RIVERFRONT AV SE', [-300, -560]], ['MEMORIAL DR NE', [-200, -780]]].forEach(([name, ref]) => {
    let best = null, bd = 1e9; roads.forEach(r => { if (r.name !== name) return; r.pts.forEach(p => { const d = Math.hypot(p[0] - ref[0], p[1] - ref[1]); if (d < bd) { bd = d; best = p; } }); });
    if (best && bd < 400) addLabel(pretty(name), [best[0], 1, best[1]], 'street', ['net']);
  });
  { const r = riverAt(-650); if (r) addLabel('Bow River', [-650, 1, (r[0] + r[1]) / 2], 'street', ['net']); }
  const tmp = new THREE.Vector3(), lastCam = new THREE.Matrix4();
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
      tmp.copy(l.pos).project(camera);
      const x = (tmp.x + 1) / 2 * W, y = (1 - tmp.y) / 2 * H;
      if (!l.w) { l.w = l.d.offsetWidth || 80; l.h = l.d.offsetHeight || 24; }
      const w = l.w, h = l.h, street = l.d.classList.contains('street');
      const bx = { x: x - w / 2, y: street ? y - h / 2 : y - h - 8, w, h };
      const off = tmp.z > 1 || bx.x < 4 || bx.x + w > W - 4 || bx.y < 4 || bx.y + h > H - 60;
      const hit = boxes.some(o => bx.x < o.x + o.w + 4 && bx.x + bx.w + 4 > o.x && bx.y < o.y + o.h + 3 && bx.y + bx.h + 3 > o.y);
      const far = !street && !l.d.classList.contains('main') && camera.position.distanceTo(l.pos) > 2300;
      if (off || hit || far) return hide();
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
  let mode = 'net', camAnim = null, lastMove = performance.now();
  function setView(k, instant) {
    const V = VIEWS[k]; mode = k === 'net' ? 'net' : 'phase';
    ['p1', 'p2', 'p3'].forEach(g => { plant.groups[g].visible = V.show.includes(g); });
    plant.groups.floorFront.visible = V.floor; plant.groups.roof.visible = V.roof;
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
    camAnim = { t0: performance.now(), fp: camera.position.clone(), ft: controls.target.clone(), cp, tp, ms: 1700 };
  }
  controls.addEventListener('start', () => { camAnim = null; });
  controls.addEventListener('change', () => { lastMove = performance.now(); });

  // tap the plant to go inside
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), plantBox = new THREE.Box3();
  let down = null, hoverQueued = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    if (mode === 'net' && pickPlant(e)) setView(1);
  });
  renderer.domElement.addEventListener('pointermove', e => { if (mode !== 'net' || e.buttons || e.pointerType === 'touch') return; hoverQueued = e; });
  function pickPlant(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    plantBox.setFromObject(plant.groups.base);
    return !!ray.ray.intersectBox(plantBox, tmp);
  }

  function size() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < 700 ? 50 : 38; camera.updateProjectionMatrix();
    cardBox = null; labelsDirty = true; labels.forEach(l => { l.w = 0; });
  }
  const ro = 'ResizeObserver' in window ? new ResizeObserver(size) : null;
  if (ro) ro.observe(host); else window.addEventListener('resize', size);
  size();
  setView(opts.view || 'net', true);
  const reveal = () => { loading.remove(); host.classList.add('scene--ready'); };

  // expose a small debug hook for profiling
  window.__ssinfo = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, programs: renderer.info.programs.length, pr: renderer.getPixelRatio() });

  PROF('ui');
  let compiled = false;
  (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve()).catch(() => {}).then(() => { compiled = true; PROF('compile'); });
  let visible = true, alive = true, firstFrame = true, frame = 0;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }) : null;
  if (io) io.observe(host);
  const clock = new THREE.Clock();
  // adaptive resolution: if frames are slow on this device, step the pixel ratio down
  const ft = []; let lastT = 0, tuned = 0;
  function adapt(now) {
    if (lastT) ft.push(now - lastT); lastT = now;
    if (ft.length < 50) return;
    const sorted = ft.slice().sort((a, b) => a - b), med = sorted[ft.length >> 1]; ft.length = 0;
    if (med > 26 && pixelRatio > 1 && tuned < 3) { pixelRatio = Math.max(1, pixelRatio - .25); renderer.setPixelRatio(pixelRatio); size(); tuned++; }
  }
  (function loop(now) {
    if (!alive) return;
    requestAnimationFrame(loop);
    if (!visible || !compiled) return;
    frame++;
    const t = clock.getElapsedTime();
    if (camAnim) {
      const u = Math.min(1, (performance.now() - camAnim.t0) / camAnim.ms), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      camera.position.lerpVectors(camAnim.fp, camAnim.cp, e);
      controls.target.lerpVectors(camAnim.ft, camAnim.tp, e);
      if (u >= 1) camAnim = null;
      lastMove = performance.now();
    }
    controls.update();
    // when nobody is moving the camera, the ambient animation runs at half rate to save battery
    const idle = !camAnim && performance.now() - lastMove > 1200;
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
      q.led.forEach((list, k) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeos(list), new THREE.MeshBasicMaterial({ color: q.color })); m.userData.dyn = true; parent.add(m); tick.push(t => { m.visible = Math.sin(t * (2.2 + k * 1.3) + k) > -.7; }); });
    });
    rackQ.clear();
  }
  { // Phase 1
    const g = groups.p1;
    box(4.35, .44, 3.55, floorM, -2.6, -.12, .4, g);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) rack(.46, 1.66, .78, -4.2 + i * .62, -.35 + row * 1.5, .32, g);
    box(3.3, .05, .5, mat('tray', 0x9fb3c6, { metalness: .6 }), -2.96, 2.1, .4, g);
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
  }
  { // Phase 3
    const g = groups.p3, y = HALL.H + .48;
    const frameM = mat('frame', 0x8b96a2, { metalness: .7, roughness: .35 }), bladeM = mat('blade', 0x4a5561);
    [[0.5, -1.4], [3.0, -1.4], [0.5, .6], [3.0, .6]].forEach(([x, z]) => {
      box(2.05, .5, 1.2, frameM, x, y + .06, z, g);
      box(2.05, .16, 1.2, mat('coolerTop', 0xdfe4e9, { metalness: .5, roughness: .3 }), x, y + .56, z, g);
      [-.5, .5].forEach(dx => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.36, .04, 8, 24), frameM); ring.rotation.x = Math.PI / 2; ring.position.set(x + dx, y + .75, z); g.add(ring);
        const blades = new THREE.Group(); blades.position.set(x + dx, y + .74, z); blades.userData.dyn = true;
        for (let b = 0; b < 5; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.3, .015, .09), bladeM); bl.position.x = .15; const piv = new THREE.Group(); piv.rotation.y = b * Math.PI * 2 / 5; piv.add(bl); blades.add(piv); }
        g.add(blades); tick.push(t => { blades.rotation.y = t * 5; });
      });
    });
    pipe([[-.8, y + .2, -2.4], [4.4, y + .2, -2.4], [4.4, y + .2, 1.6], [-.8, y + .2, 1.6]], .06, mat('cyanp', COL.cyanBright), g);
    const railM = mat('rail2', 0xf2b233, { metalness: .3 });
    const rp = hallShape(.2).getPoints(24);
    pipe(rp.map(p => [p.x, y + .9, p.y]), .025, railM, g);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) rack(.47, 1.72, .84, 1.4 + i * .6, -1.8 + row * 1.2, .24, g, COL.cyan);
  }
  flushRacks();
  // animated parts never cast shadows (shadows are drawn once per view)
  root.traverse(o => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.dyn) { o.castShadow = false; break; } });
  Object.values(groups).forEach(mergeStatic);
  return { root, groups };
}
