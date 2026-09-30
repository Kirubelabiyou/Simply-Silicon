// Builds assets/js/calgary-buildings.js from City of Calgary "3D Buildings - Citywide" extracts in tools/data.
// Source: data.calgary.ca dataset cchr-krqg (Open Government Licence - City of Calgary).
import fs from 'fs';
const LNG0 = -114.0538766, LAT0 = 51.0440134;
const KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KY = 110574;
const seen = new Map();
for (const f of fs.readdirSync('tools/data').filter(f => f.endsWith('.txt')).sort()) {
  for (const line of fs.readFileSync('tools/data/' + f, 'utf8').split('\n')) {
    const p = line.trim().split('|'); if (p.length !== 4) continue;
    const [id, roof, ground, coords] = p;
    const pts = coords.split(';').map(s => s.split(',').map(Number)).filter(a => a.length === 2 && !isNaN(a[0]) && !isNaN(a[1]));
    if (pts.length < 3) continue;
    const last = pts[pts.length - 1], first = pts[0];
    if (Math.abs(last[0] - first[0]) < 1e-9 && Math.abs(last[1] - first[1]) < 1e-9) pts.pop();
    const h = +roof - +ground;
    if (!(h > 1)) continue;
    const xy = pts.map(([lng, lat]) => [Math.round((lng - LNG0) * KX * 10) / 10, Math.round(-(lat - LAT0) * KY * 10) / 10]);
    // drop consecutive near-duplicates (<0.4 m)
    const clean = [];
    xy.forEach(q => { const l = clean[clean.length - 1]; if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 0.4) clean.push(q); });
    if (clean.length < 3) continue;
    // area check
    let a = 0; for (let i = 0; i < clean.length; i++) { const [x1, y1] = clean[i], [x2, y2] = clean[(i + 1) % clean.length]; a += x1 * y2 - x2 * y1; }
    if (Math.abs(a / 2) < 6) continue;
    seen.set(id, { h: Math.round(h * 10) / 10, g: Math.round((+ground - 1043) * 10) / 10, p: clean });
  }
}
const list = [...seen.values()];
const out = '/* Downtown Calgary building footprints and heights.\n   Source: City of Calgary Open Data, "3D Buildings - Citywide" (cchr-krqg).\n   p = footprint in metres from Foundation (x east, z south), h = height (rooftop minus ground), g = ground offset. */\nwindow.SS_BUILDINGS=' + JSON.stringify(list) + ';\n';
fs.writeFileSync('assets/js/calgary-buildings.js', out);
const hs = list.map(b => b.h).sort((a, b) => b - a);
console.log('buildings', list.length, 'bytes', out.length, 'tallest', hs.slice(0, 8));
