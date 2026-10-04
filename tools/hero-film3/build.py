"""Build the hero film into out/index.html (plus a local test wrapper)."""
import pathlib, shutil, json
here = pathlib.Path(__file__).resolve().parent
ANSWER = ("Simply Silicon builds secure, localized AI compute. We turn latent utility infrastructure and own-use power into "
          "bare metal inference compute faster than conventional developers. Our sites connect to nearby buildings over private, "
          "air-gapped fiber. Our long term goal is to link these sites into a second internet for superintelligent models, "
          "so they don't break the internet humans need.")
html = (here / 'frame.html').read_text().replace('{{ANSWER}}', json.dumps(ANSWER)).replace('{{JS}}', (here / 'film.js').read_text())
d = here / 'out'; (d / 'img').mkdir(parents=True, exist_ok=True)
(d / 'index.html').write_text(html)
(d / '_test.html').write_text('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + html + '</body></html>')
shutil.copy(here / 'img' / 'rack.webp', d / 'img' / 'rack.webp')
print(len(html))
