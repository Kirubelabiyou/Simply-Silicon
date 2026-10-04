"""Assemble the five hero-option pages from frame.html.
Each page is written to out/optN/index.html; data and engine files are copied next to it for local testing
(the published artifacts copy them server side from the main site preview)."""
import pathlib, shutil
here = pathlib.Path(__file__).resolve().parent
root = here.parent.parent
frame = (here / 'frame.html').read_text()
read = lambda n: (here / n).read_text()
DATA = ['assets/js/calgary-data.js', 'assets/js/calgary-buildings.js', 'assets/js/calgary-streets.js', 'assets/js/calgary-parks.js']
ENGINE = ['assets/js/scene.js', 'assets/vendor/three/three.module.min.js', 'assets/vendor/three/addons/OrbitControls.js', 'assets/vendor/three/addons/RoomEnvironment.js',
          'assets/img/scene-poster-wide.webp', 'assets/img/scene-poster-tall.webp']
data_tags = ''.join('<script src="%s"></script>\n' % p for p in DATA)

OPTS = {
  1: dict(title='Fiber City Hero', name='Fiber lighting up the city', files=DATA,
          stage='<canvas id="fiber"></canvas>', head='', css='',
          body=data_tags + '<script>\n' + read('opt1.js') + '</script>'),
  2: dict(title='Night Plant Hero', name='The 3D plant at night', files=DATA + ENGINE,
          stage='<div class="scene" id="scene3d"></div>',
          head='<script type="importmap">{"imports":{"three":"./assets/vendor/three/three.module.min.js"}}</script>',
          css='''
.scene { position: absolute; inset: 0; overflow: hidden; background: #070b12 url("assets/img/scene-poster-wide.webp") 70% 50% / cover no-repeat; }
@media (max-width: 860px) { .scene { background-image: url("assets/img/scene-poster-tall.webp"); background-position: 50% 30%; } }
.scene canvas { display: block; width: 100%; height: 100%; opacity: 0; transition: opacity 1.6s var(--ease); }
.scene.scene--ready { background: linear-gradient(180deg, #03060c 0%, #0a1424 34%, #132a46 60%, #1c3a5c 76%); }
.scene.scene--ready canvas, .scene.scene--ready .scene-labels { opacity: 1; }
.scene-loading, .scene-card, .scene-ui, .scene-zoom { display: none !important; }
.scene-labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; opacity: 0; transition: opacity 1.6s var(--ease); }
.s-lbl { position: absolute; left: 0; top: 0; opacity: 0; white-space: nowrap; font: 600 13px/1 var(--body); color: #09090b; background: #f4f4f5; padding: 8px 11px; border-radius: 6px; transition: opacity .5s var(--ease); }
.s-lbl:not(.main) { display: none; }
.scene--cinematic canvas { cursor: grab; } .scene--cinematic canvas:active { cursor: grabbing; }
.stage { z-index: -2; }
@media (max-width: 860px) { .stage { bottom: 42%; } .scrim { background: linear-gradient(0deg, var(--bg) 40%, rgba(5,7,11,.7) 56%, rgba(5,7,11,0) 70%); } }''',
          body=data_tags + '<script type="module">\n' + read('opt2.js') + '</script>'),
  3: dict(title='Plant Drawing Hero', name='The plant drawing itself', files=[],
          stage='<div class="draw">' + read('opt3.svg.html') + '</div>', head='',
          css='''
.draw { position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-end; padding: 40px var(--gut) 60px 34%; }
.draw svg { width: 100%; height: auto; max-height: 100%; }
@media (max-width: 860px) { .draw { align-items: flex-start; justify-content: center; padding: 28px 0 0; } .draw svg { width: 128%; flex: none; } }
#plantSvg .lines path { stroke-dasharray: 1; stroke-dashoffset: 0; }
#plantSvg.play .lines path { stroke-dashoffset: 1; animation: draw 1.5s var(--ease) forwards; animation-delay: calc(var(--i) * .1s); }
#plantSvg .fills, #plantSvg .fan-marks, #plantSvg .rooffans, #plantSvg .sign, #plantSvg .cap { opacity: 1; }
#plantSvg.play .fills { opacity: 0; animation: fade 1.8s ease 2.4s forwards; }
#plantSvg.play .fan-marks, #plantSvg.play .rooffans { opacity: 0; animation: fade 1s ease 3s forwards; }
#plantSvg.play .sign, #plantSvg.play .cap { opacity: 0; animation: fade 1.2s ease 3.4s forwards; }
#plantSvg .hose { stroke-dasharray: 1; stroke-dashoffset: 0; }
#plantSvg.play .hose { stroke-dashoffset: 1; animation: draw 1.6s var(--ease) 3.1s forwards; }
#plantSvg .steam circle { opacity: 0; transform-box: fill-box; transform-origin: center; }
#plantSvg.play .steam circle { animation: steam 5s ease-in-out 3.6s infinite; }
#plantSvg.play .steam circle:nth-child(2) { animation-delay: 4.4s; } #plantSvg.play .steam circle:nth-child(3) { animation-delay: 5.1s; } #plantSvg.play .steam circle:nth-child(4) { animation-delay: 5.8s; }
#plantSvg .glow-strip { filter: drop-shadow(0 0 6px rgba(160,220,255,.9)); }
#plantSvg .glow-warm { filter: drop-shadow(0 0 10px rgba(255,220,160,.7)); }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes fade { to { opacity: 1; } }
@keyframes steam { 0% { opacity: 0; transform: translateY(0) scale(.6); } 30% { opacity: .9; } 100% { opacity: 0; transform: translateY(-70px) scale(2); } }
@media (prefers-reduced-motion: reduce) { #plantSvg.play * { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; } }''',
          body='<script>\n' + read('opt3.js') + '</script>'),
  4: dict(title='Token Skyline Hero', name='Tokens becoming the city', files=DATA,
          stage='<canvas id="tokens"></canvas>', head='', css='',
          body=data_tags + '<script>\n' + read('opt4.js') + '</script>'),
  5: dict(title='Power to Compute Hero', name='Power, connectivity, compute in motion', files=[],
          stage='<div class="draw">' + read('opt5.svg.html') + '</div>', head='',
          css='''
.draw { position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-end; padding: 40px var(--gut) 60px 36%; }
.draw svg { width: 100%; height: auto; max-height: 100%; }
@media (max-width: 860px) { .draw { align-items: flex-start; justify-content: center; padding: 20px 0 0; } .draw svg { width: 104%; flex: none; } #flowSvg text.sub, #flowSvg text.sitename { display: none; } #flowSvg text.lbl { font-size: 32px; } }
#flowSvg .lbl { font: 600 17px var(--display); fill: var(--ink); letter-spacing: -.01em; }
#flowSvg .sub { font: 400 12.5px var(--body); fill: var(--ink-3); }
#flowSvg .sitename { font: 600 13px var(--body); fill: var(--ink-2); }
#flowSvg .fiber { fill: none; stroke: rgba(77,178,239,.35); stroke-width: 1.4; }
#flowSvg .flow { stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 6 26; animation: run 1.6s linear infinite; filter: url(#soft); }
#flowSvg .flow--power { stroke: #ffd29a; }
#flowSvg .flow--fiber { stroke: #9bd8ff; animation-duration: 1.2s; }
#flowSvg .led { fill: #4db2ef; filter: url(#soft); }
@keyframes run { to { stroke-dashoffset: -64; } }
#flowSvg.play .s1 { opacity: 0; animation: fadein 1s var(--ease) .3s forwards; }
#flowSvg.play .site { opacity: .35; animation: fadein 1s var(--ease) 1.2s forwards; }
#flowSvg.play .s2 { opacity: 0; animation: fadein 1s var(--ease) 2.1s forwards; }
#flowSvg.play .s3 { opacity: 0; animation: fadein 1s var(--ease) 3.1s forwards; }
#flowSvg.play .led { opacity: 0; animation: ledon .5s ease forwards; animation-delay: calc(3s + var(--i) * .05s); }
#flowSvg.play .fiber { stroke-dasharray: 400; stroke-dashoffset: 400; animation: line 1.2s var(--ease) 2.1s forwards; }
@keyframes fadein { to { opacity: 1; } }
@keyframes ledon { to { opacity: 1; } }
@keyframes line { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { #flowSvg * { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; } }''',
          body='<script>\n' + read('opt5.js') + '</script>'),
}
out = here / 'out'
for n, o in OPTS.items():
    d = out / ('opt%d' % n); d.mkdir(parents=True, exist_ok=True)
    html = frame
    for k, v in dict(TITLE=o['title'], NAME=o['name'], N=str(n), STAGE=o['stage'], HEAD=o['head'], CSS=o['css'], BODY=o['body']).items():
        html = html.replace('{{%s}}' % k, v)
    (d / 'index.html').write_text(html)
    for f in o['files']:
        (d / f).parent.mkdir(parents=True, exist_ok=True); shutil.copy(root / f, d / f)
    print(n, o['title'], len(html))
