"""Assemble the three hero films from frame.html into out/vX/index.html, with their images and data."""
import pathlib, shutil
here = pathlib.Path(__file__).resolve().parent
root = here.parent.parent
frame = (here / 'frame.html').read_text()
read = lambda n: (here / n).read_text()
ANSWER = ("Simply Silicon builds secure, localized AI compute. We turn latent utility infrastructure and own-use power into "
          "bare metal inference compute faster than conventional developers. Our sites connect to nearby buildings over private, "
          "air-gapped fiber. Our long term goal is to link these sites into a second internet for superintelligent models, "
          "so they don't break the internet humans need.")
DATA = ['assets/js/calgary-data.js', 'assets/js/calgary-buildings.js']
V = {
  'A': dict(n=1, title='Hero Film Cinematic', name='Cinematic', imgs=['foundation.webp', 'gpu.webp', 'fiber.webp'], data=DATA, js=['skyline.js', 'vA.js']),
  'B': dict(n=2, title='Hero Film Minimal', name='Minimal black', imgs=['dgx.webp'], data=DATA, js=['skyline.js', 'vB.js']),
  'C': dict(n=3, title='Hero Film Token Stream', name='Token stream', imgs=['gpu.webp'], data=[], js=['vC.js']),
}
for k, v in V.items():
    if not all((here / j).exists() for j in v['js']): continue
    d = here / 'out' / ('v' + k); (d / 'img').mkdir(parents=True, exist_ok=True)
    body = ''.join('<script src="%s"></script>\n' % p for p in v['data'])
    body += '<script>\nvar ANSWER = %r;\n' % ANSWER + read('engine.js') + ''.join(read(j) for j in v['js']) + '</script>'
    html = frame
    for a, b in dict(TITLE=v['title'], NAME=v['name'], N=str(v['n']), CSS='', BODY=body).items():
        html = html.replace('{{%s}}' % a, b)
    (d / 'index.html').write_text(html)
    (d / '_test.html').write_text('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + html + '</body></html>')
    for f in v['imgs']: shutil.copy(here / 'img' / f, d / 'img' / f)
    for f in v['data']: (d / f).parent.mkdir(parents=True, exist_ok=True); shutil.copy(root / f, d / f)
    print(k, len(html))
