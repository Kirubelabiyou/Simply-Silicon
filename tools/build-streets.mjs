// Builds assets/js/calgary-streets.js from City of Calgary "Street Centreline" extracts in tools/data/v2/s_*.txt.
// Source: data.calgary.ca dataset 4dx8-rtm5 (Open Government Licence - City of Calgary).
// Output: polylines in metres from Foundation (x east, z south), with a road class code.
import fs from 'fs';
const LNG0 = -114.0538766, LAT0 = 51.0440134;
const KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KY = 110574;
const CLASS = { 'Skeletal Road': 0, 'Parkway': 1, 'Arterial Street': 2, 'Urban Boulevard': 3, 'Neighbourhood Boulevard': 4, 'Collector': 5, 'Residential Street': 6, 'Lanes (Alleys)': 7 };
const names = [], nameIx = new Map(), out = [];
let bad = 0, n = 0;
for (const f of fs.readdirSync('tools/data/v2').filter(f => /^s_\d+\.txt$/.test(f))) {
  for (let line of fs.readFileSync('tools/data/v2/' + f, 'utf8').split('\n')) {
    line = line.replace(/−/g, '-').trim(); if (!line) continue;
    const parts = line.split('|'); if (parts.length < 3) { bad++; continue; }
    const ci = parts.findIndex((x, i) => i >= 2 && /-?\d+\.\d+,\d/.test(x));
    if (ci < 0) { bad++; continue; }
    const cls = parts[0], name = parts[1], oneway = ci === 3 ? parts[2] : '', coords = parts.slice(ci).join('|');
    if (!(cls in CLASS)) { bad++; continue; }
    for (const ring of coords.split(' / ')) {
      const pts = ring.split(';').map(s => s.split(',').map(Number)).filter(a => a.length === 2 && isFinite(a[0]) && isFinite(a[1]));
      if (pts.length < 2) { bad++; continue; }
      if (pts.some(([lng, lat]) => lng < -114.09 || lng > -114.03 || lat < 51.03 || lat > 51.06)) { bad++; continue; }
      const xy = pts.map(([lng, lat]) => [Math.round((lng - LNG0) * KX * 10) / 10, Math.round(-(lat - LAT0) * KY * 10) / 10]);
      const q = xy.some(() => 0); void q;
      // reject transcription glitches: any single step longer than 400 m
      if (xy.some((p, i) => i && Math.hypot(p[0] - xy[i - 1][0], p[1] - xy[i - 1][1]) > 400)) { bad++; continue; }
      let ni = -1; if (name) { if (!nameIx.has(name)) { nameIx.set(name, names.length); names.push(name); } ni = nameIx.get(name); }
      out.push({ c: CLASS[cls], o: oneway === 'B' ? 0 : 1, ni, xy, south: / S[EW]$/.test(name), north: / N[EW]$/.test(name) }); n++;
    }
  }
}

// Bow River: it runs between the north-side streets (NE/NW) and the south-side streets (SE/SW).
// For each 20 m column, take the southernmost north-side point and the northernmost south-side point,
// then centre the water between them with a realistic width, leaving the rest as riverbank park.
const COLS = [];
for (let x = -1880; x <= 1000; x += 20) {
  let sb = -Infinity, nb = Infinity; // z grows southward: south bank = smallest z of south streets
  let sMin = Infinity, nMax = -Infinity;
  out.forEach(r => { if (r.c === 7) return; r.xy.forEach(([px, pz]) => { if (Math.abs(px - x) > 30) return; if (r.south) sMin = Math.min(sMin, pz); if (r.north) nMax = Math.max(nMax, pz); }); });
  if (isFinite(sMin) && isFinite(nMax) && sMin - nMax > 60) COLS.push([x, nMax, sMin]);
}
// smooth the bank lines
const sm = (arr, k) => arr.map((v, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - k); j <= Math.min(arr.length - 1, i + k); j++) { s += arr[j]; n++; } return s / n; });
const nArr = sm(COLS.map(c => c[1]), 3), sArr = sm(COLS.map(c => c[2]), 3);
const river = COLS.map((c, i) => { const mid = (nArr[i] + sArr[i]) / 2, gap = sArr[i] - nArr[i], half = Math.max(40, Math.min(75, gap * .3)); return [c[0], Math.round((mid - half) * 10) / 10, Math.round((mid + half) * 10) / 10, Math.round(nArr[i] * 10) / 10, Math.round(sArr[i] * 10) / 10]; });
console.log('river columns', river.length, 'x', river[0] && river[0][0], '..', river.length && river[river.length - 1][0]);
const enc = xy => { const d = xy.map(([x, z]) => [Math.round(x * 10), Math.round(z * 10)]); return d.flatMap((q, i) => i ? [q[0] - d[i - 1][0], q[1] - d[i - 1][1]] : q); };
const js = '/* Downtown Calgary street centrelines.\n   Source: City of Calgary Open Data, "Street Centreline" (4dx8-rtm5).\n   s = [class, oneWay, nameIndex, x0, z0, dx1, dz1, ...] in decimetres from Foundation (x east, z south), delta encoded.\n   r = Bow River columns [x, waterNorthZ, waterSouthZ, northBankZ, southBankZ] in metres.\n   class: 0 skeletal, 1 parkway, 2 arterial, 3 urban boulevard, 4 neighbourhood boulevard, 5 collector, 6 residential, 7 lane. */\nwindow.SS_STREETS={n:' + JSON.stringify(names) + ',s:' + JSON.stringify(out.map(r => [r.c, r.o, r.ni, ...enc(r.xy)])) + ',r:' + JSON.stringify(river) + '};\n';
fs.writeFileSync('assets/js/calgary-streets.js', js);
console.log('segments', n, 'rejected', bad, 'names', names.length, 'bytes', js.length);
