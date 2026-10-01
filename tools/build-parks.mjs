// Builds assets/js/calgary-parks.js from City of Calgary "Parks Sites" extracts (tools/data/v2/parks_*.txt).
// Source: data.calgary.ca dataset kami-qbfh (Open Government Licence - City of Calgary).
// Each entry: [kind * 10, x0, z0, dx1, dz1, ...] in decimetres from Foundation; kind 0 = green park, 1 = paved plaza.
import fs from 'fs';
const LNG0 = -114.0538766, LAT0 = 51.0440134;
const KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KY = 110574;
const SKIP = /DEPOT|DEVONIAN GARDENS|CIVIC BUILDING/; // depots, an indoor garden and a civic building are not open ground
const PAVED = /PLAZA|PIAZZA|PROMENADE/;
const out = [], seen = new Set(); let n = 0;
for (const f of fs.readdirSync('tools/data/v2').filter(f => /^parks_.*\.txt$/.test(f)).sort()) {
  for (let line of fs.readFileSync('tools/data/v2/' + f, 'utf8').split('\n')) {
    line = line.replace(/−/g, '-').trim(); if (!line) continue;
    const p = line.split('|'); if (p.length < 3) continue;
    const name = p[0], coords = p.slice(2).join('|');
    if (SKIP.test(name) || seen.has(coords)) continue; seen.add(coords);
    const kind = PAVED.test(name) && !/PRINCE'S ISLAND PROMENADE|SIEN LOK RIVERFRONT/.test(name) ? 1 : 0;
    coords.split(' / ').forEach(ring => {
      const pts = ring.split(';').map(s => s.split(',').map(Number)).filter(a => a.length === 2 && isFinite(a[0]) && isFinite(a[1]));
      if (pts.length < 3) return;
      const d = pts.map(([lng, lat]) => [Math.round((lng - LNG0) * KX * 10), Math.round(-(lat - LAT0) * KY * 10)]);
      out.push([kind * 10, ...d.flatMap((q, i) => i ? [q[0] - d[i - 1][0], q[1] - d[i - 1][1]] : q)]); n++;
    });
  }
}
const js = '/* Downtown Calgary parks and plazas.\n   Source: City of Calgary Open Data, "Parks Sites" (kami-qbfh).\n   Each entry: [kind*10, x0, z0, dx1, dz1, ...] in decimetres from Foundation; kind 0 = green park, 1 = paved plaza. */\nwindow.SS_PARKS=' + JSON.stringify(out) + ';\n';
fs.writeFileSync('assets/js/calgary-parks.js', js);
console.log('park polygons', n, 'bytes', js.length);
