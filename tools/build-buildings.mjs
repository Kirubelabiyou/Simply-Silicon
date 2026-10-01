// Builds assets/js/calgary-buildings.js from City of Calgary "3D Buildings - Citywide" extracts
// (tools/data/*.txt and, where newer and more detailed, tools/data/v2/b_*.txt).
// Source: data.calgary.ca dataset cchr-krqg (Open Government Licence - City of Calgary).
// Output is compact: each building is [height in dm, x0, z0, dx1, dz1, ...] with footprint
// coordinates in decimetres from Foundation (x east, z south), delta encoded.
import fs from 'fs';
const LNG0 = -114.0538766, LAT0 = 51.0440134;
const KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KY = 110574;
const files = fs.readdirSync('tools/data').filter(f => f.endsWith('.txt')).sort().map(f => 'tools/data/' + f)
  .concat(fs.existsSync('tools/data/v2') ? fs.readdirSync('tools/data/v2').filter(f => /^b_\d+\.txt$/.test(f)).map(f => 'tools/data/v2/' + f) : []);
const seen = new Map();
for (const f of files) {
  for (let line of fs.readFileSync(f, 'utf8').split('\n')) {
    line = line.replace(/−/g, '-').trim();
    const p = line.split('|'); if (p.length !== 4) continue;
    const [id, roof, ground, coords] = p;
    const pts = coords.split(' / ')[0].split(';').map(s => s.split(',').map(Number)).filter(a => a.length === 2 && isFinite(a[0]) && isFinite(a[1]));
    if (pts.length < 3) continue;
    if (pts.some(([lng, lat]) => lng < -114.09 || lng > -114.03 || lat < 51.03 || lat > 51.06)) continue;
    const last = pts[pts.length - 1], first = pts[0];
    if (Math.abs(last[0] - first[0]) < 1e-9 && Math.abs(last[1] - first[1]) < 1e-9) pts.pop();
    const h = +roof - +ground;
    if (!(h > 1) || h > 300) continue;
    const xy = pts.map(([lng, lat]) => [Math.round((lng - LNG0) * KX * 10), Math.round(-(lat - LAT0) * KY * 10)]);
    const clean = [];
    xy.forEach(q => { const l = clean[clean.length - 1]; if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 4) clean.push(q); });
    if (clean.length > 3 && Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) <= 4) clean.pop();
    if (clean.length < 3) continue;
    let a = 0; for (let i = 0; i < clean.length; i++) { const [x1, y1] = clean[i], [x2, y2] = clean[(i + 1) % clean.length]; a += x1 * y2 - x2 * y1; }
    if (Math.abs(a / 2) < 600) continue; // under 6 m2
    if (clean.some((q, i) => i && Math.hypot(q[0] - clean[i - 1][0], q[1] - clean[i - 1][1]) > 3000)) continue; // transcription glitch guard (>300 m edge)
    seen.set(id, [Math.round(h * 10), ...clean.flatMap((q, i) => i ? [q[0] - clean[i - 1][0], q[1] - clean[i - 1][1]] : q)]);
  }
}
const list = [...seen.values()];
const out = '/* Downtown Calgary building footprints and heights.\n   Source: City of Calgary Open Data, "3D Buildings - Citywide" (cchr-krqg).\n   Each entry: [height dm, x0, z0, dx1, dz1, ...], footprint in decimetres from Foundation (x east, z south), delta encoded. */\nwindow.SS_BLD=' + JSON.stringify(list) + ';\n';
fs.writeFileSync('assets/js/calgary-buildings.js', out);
console.log('buildings', list.length, 'bytes', out.length);
