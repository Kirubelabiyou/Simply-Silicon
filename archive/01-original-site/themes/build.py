#!/usr/bin/env python3
"""Builds the themed sites from themes/src/pages/*.html, plus the picker at themes/index.html.
Every theme gets the same words, pictures, drawing, figures, map and 3D scenes; only themes/<id>/theme.css differs.
Pages are written to themes/<id>/<page>.html and use <base href="../../"> so every asset path matches the main site.
Run from the repository root:  python3 themes/build.py"""
import html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
THEMES = [
    # id, name, theme-color, one line for the picker, full site?
    ("graphite", "Graphite", "#121315", "Dark charcoal, IBM Plex, the brand blue. The closest to today's site, without the boxes.", False),
    ("cold-aisle", "Cold aisle", "#e6e9ec", "Light cool grey like a server hall, with dark instrument panels for the drawing and the 3D scene.", False),
    ("rack", "Rack", "#0b0c0d", "Black, condensed capitals and amber status lights. Laid out on a rigid rack grid.", False),
    ("safety", "Safety", "#f1efe8", "Facility signage: off-white, black and safety yellow, heavy condensed type.", False),
    ("concrete", "Concrete", "#d8d5cf", "Warm concrete grey and black. Big, tight type and large pictures.", True),
    ("steel", "Steel", "#ffffff", "White with deep steel-blue bands. Calm and corporate, like an infrastructure firm.", False),
    ("ops", "Ops room", "#08090a", "Near-black with green status accents and monospaced labels, like a network operations room.", True),
    ("swiss", "Swiss", "#ffffff", "White, black and one signal red. Huge flush-left type on a strict grid.", True),
]
THREE = '<script type="importmap">{"imports":{"three":"./assets/vendor/three/three.module.min.js"}}</script>'
PAGES = {
    # page: (file, title, description, extra head)
    "home": ("index.html", "Simply Silicon",
             "Secure, localized compute. Private GPU servers and air-gapped fiber for any team. Run any model on hardware only you use. Your data stays with you.", THREE),
    "foundation": ("foundation.html", "Foundation · Simply Silicon",
                   "Foundation brings 12 MW of secure AI capacity to downtown Calgary. Explore the site, its phases and its private fiber network in 3D.",
                   THREE + '\n<link rel="modulepreload" href="assets/vendor/three/three.module.min.js">\n<link rel="modulepreload" href="assets/js/scene.js">'),
    "workloads": ("workloads.html", "Workloads · Simply Silicon",
                  "The AI workloads teams run on Simply Silicon: regulated industries, high-security workloads, software companies and critical AI services.", ""),
    "platform": ("platform.html", "Platform · Simply Silicon",
                 "The internet was not built for inference. Simply Silicon is building a global urban AI network: secure metro sites that put compute, memory and power next to demand.", THREE),
}
HEAD = """<!doctype html>
<html lang="en" data-theme="{ID}">
<head>
<meta charset="utf-8">
<base href="../../">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="{COLOR}">
{EXTRA}
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="themes/fonts/plex-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="themes/src/core.css">
<link rel="stylesheet" href="themes/{ID}/theme.css">
<script>window.SS_PAGES = 'themes/{ID}/';</script>
</head>
<body data-page="{PAGE}" id="top">
<!-- Theme {NUM}, {NAME}: {NOTE} Built from themes/src by themes/build.py; edit the source, not this file. -->
"""

plant = (SRC / "plant.svg.html").read_text()
for i, (tid, name, color, note, full) in enumerate(THEMES, 1):
    (ROOT / tid).mkdir(exist_ok=True)
    for page, (fname, title, desc, extra) in PAGES.items():
        if page != "home" and not full:
            continue
        body = (SRC / "pages" / f"{page}.html").read_text().replace("{{PLANT}}", plant).replace("{{P}}", f"themes/{tid}/")
        head = HEAD.format(ID=tid, TITLE=html.escape(title), DESC=html.escape(desc), COLOR=color, EXTRA=extra,
                           PAGE=page, NUM=i, NAME=name, NOTE=note)
        (ROOT / tid / fname).write_text(head + body + "</body>\n</html>\n")

def item(i, t):
    tid, name, color, note, full = t
    tag = ' <span class="tag">Full site</span>' if full else ""
    return (f'    <li><a href="{tid}/"><span class="sw" style="background:{color}"></span><b>{i}. {html.escape(name)}</b></a>{tag}'
            f'<span class="note">{html.escape(note)}</span></li>')
items = "\n".join(item(i, t) for i, t in enumerate(THEMES, 1))
(ROOT / "index.html").write_text(f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Site themes</title>
<link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
<style>
  body {{ margin: 0; background: #f4f4f2; color: #161616; font: 400 17px/1.55 "Helvetica Neue", Arial, sans-serif; }}
  main {{ max-width: 760px; margin: 0 auto; padding: 48px 16px 64px; }}
  h1 {{ font-size: 30px; margin: 0 0 8px; }}
  main > p {{ color: #5a5a55; margin: 0 0 32px; }}
  ul {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 22px; }}
  a {{ display: inline-flex; align-items: center; gap: 12px; color: #0f5f9a; font-size: 21px; text-decoration: none; min-height: 44px; }}
  a:hover b {{ text-decoration: underline; }}
  .sw {{ width: 22px; height: 22px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.2); }}
  .tag {{ margin-left: 8px; padding: 3px 8px; border-radius: 3px; background: #161616; color: #fff; font-size: 13px; vertical-align: 3px; }}
  .note {{ display: block; color: #5a5a55; padding-left: 34px; }}
</style>
</head>
<body>
<main>
  <h1>Site themes</h1>
  <p>Styles for the Simply Silicon site. Words, pictures, the plant drawing, the figures, the map and the 3D models are the same in each; only the style changes. Themes marked “Full site” have every page: Home, Foundation, Workloads, Platform and Careers.</p>
  <ul>
{items}
  </ul>
</main>
</body>
</html>
""")
print("built", len(THEMES), "themes;", sum(1 for t in THEMES if t[4]), "full sites")
