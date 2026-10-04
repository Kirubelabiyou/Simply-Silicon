"""Build the two hero films (Lenovo GPU start, NVIDIA system start) into out/<v>/index.html."""
import pathlib, shutil, json
here = pathlib.Path(__file__).resolve().parent
img = here.parent / 'hero-video' / 'img'
frame, js = (here / 'frame.html').read_text(), (here / 'film.js').read_text()
ANSWER = ("Simply Silicon builds secure, localized AI compute. We turn latent utility infrastructure and own-use power into "
          "bare metal inference compute faster than conventional developers. Our sites connect to nearby buildings over private, "
          "air-gapped fiber. Our long term goal is to link these sites into a second internet for superintelligent models, "
          "so they don't break the internet humans need.")
V = {
  'gpu': dict(n=1, title='Hero Film GPU', name='Starts on the GPU server', file='gpu.webp', shot=dict(src='img/gpu.webp', x=1334, y=1490, px=.66, py=.44, phoneZoom=1.5)),
  'dgx': dict(n=2, title='Hero Film System', name='Starts on the GPU system', file='dgx.webp', shot=dict(src='img/dgx.webp', x=994, y=514, px=.62, py=.4, phoneZoom=1.6)),
}
for k, v in V.items():
    d = here / 'out' / k; (d / 'img').mkdir(parents=True, exist_ok=True)
    html = frame
    for a, b in dict(TITLE=v['title'], NAME=v['name'], N=str(v['n']), ANSWER=json.dumps(ANSWER), SHOT=json.dumps(v['shot']), JS=js).items():
        html = html.replace('{{%s}}' % a, b)
    (d / 'index.html').write_text(html)
    (d / '_test.html').write_text('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + html + '</body></html>')
    shutil.copy(img / v['file'], d / 'img' / v['file'])
    print(k, len(html))
