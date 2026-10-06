"""Draw the data centre racks seen through the glass of the plant drawing, and swap them into the SVG files."""
import re, random, sys, pathlib
random.seed(4)
X0, W, GAP, N, TOP, BOT = 476, 36, 4, 8, 296, 424
out = ['    <g class="racks">',
       '      <rect x="468" y="286" width="350" height="140" fill="url(#gHall)"/>',
       # overhead cable tray and fiber
       f'      <rect x="{X0-4}" y="{TOP-9}" width="{N*(W+GAP)+4}" height="4" fill="#1a2029" stroke="#2c343f" stroke-width=".6"/>',
       f'      <path d="M{X0} {TOP-6} H{X0+N*(W+GAP)-4}" stroke="#f2b233" stroke-opacity=".55" stroke-width=".8"/>',
       f'      <path d="M{X0} {TOP-4.5} H{X0+N*(W+GAP)-4}" stroke="#4db2ef" stroke-opacity=".7" stroke-width=".8"/>']
leds = []
for i in range(N):
    x = X0 + i * (W + GAP)
    out.append(f'      <rect x="{x}" y="{TOP}" width="{W}" height="{BOT-TOP}" rx="1.2" fill="#07090d" stroke="#343c47" stroke-width=".9"/>')
    out.append(f'      <rect x="{x}" y="{TOP}" width="{W}" height="6" fill="#121720"/><rect x="{x+4}" y="{TOP+2}" width="10" height="2" fill="#2a323d"/>')
    out.append(f'      <path d="M{x+2.5} {TOP+8} V{BOT-4} M{x+W-2.5} {TOP+8} V{BOT-4}" stroke="#262d37" stroke-width="1"/>')
    y = TOP + 9
    blanks = set(random.sample(range(12), 2))
    k = 0
    while y + 9 <= BOT - 6:
        if k in blanks:
            out.append(f'      <rect x="{x+4}" y="{y}" width="{W-8}" height="4" fill="#0f131a" stroke="#1d232c" stroke-width=".5"/>')
            y += 5.2; k += 1; continue
        out.append(f'      <rect x="{x+4}" y="{y}" width="{W-8}" height="8.4" rx=".6" fill="#151a23" stroke="#2a313c" stroke-width=".5"/>')
        out.append(f'      <rect x="{x+6}" y="{y+1.4}" width="{W-19}" height="5.6" fill="url(#gMesh)"/>')
        out.append(f'      <path d="M{x+5} {y+1.6} V{y+6.8} M{x+W-5} {y+1.6} V{y+6.8}" stroke="#3a424e" stroke-width=".7"/>')
        c = '#7cc8f5' if random.random() > .18 else '#74e0a5'
        leds.append(f'<circle cx="{x+W-9.5}" cy="{y+3.2}" r=".95" fill="{c}"/>')
        if random.random() > .35: leds.append(f'<circle cx="{x+W-9.5}" cy="{y+5.6}" r=".75" fill="#7cc8f5" fill-opacity=".7"/>')
        y += 9.6; k += 1
    out.append(f'      <rect x="{x}" y="{BOT-4}" width="{W}" height="4" fill="#0d1117"/>')
out.append('      <g class="leds">' + ''.join(leds) + '</g>')
out.append(f'      <rect x="{X0-6}" y="{BOT-2}" width="{N*(W+GAP)+8}" height="3" fill="#4db2ef" fill-opacity=".18"/>')
out.append('    </g>')
racks = '\n'.join(out)
mesh = '<pattern id="gMesh" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><circle cx="1.1" cy="1.1" r=".55" fill="#2b3340"/></pattern>'
for p in sys.argv[1:]:
    s = pathlib.Path(p).read_text()
    s = re.sub(r'    <g class="racks">.*?\n    </g>', lambda m: racks, s, flags=re.S)
    if 'id="gMesh"' not in s: s = s.replace('<pattern id="gGrid"', mesh + '\n    <pattern id="gGrid"')
    pathlib.Path(p).write_text(s); print('racks ->', p)
