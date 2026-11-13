#!/usr/bin/env python3
"""Builds one home page per theme from themes/src/home.html, plus the picker at themes/index.html.
Every theme gets the same words, pictures, drawing, figures and 3D scene; only themes/<id>/theme.css differs.
Run from the repository root:  python3 themes/build.py"""
import html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
THEMES = [
    # id, name, theme-color, one line for the picker
    ("graphite", "Graphite", "#111214", "Dark charcoal, IBM Plex, the brand blue. The closest to today's site, without the boxes."),
    ("cold-aisle", "Cold aisle", "#e6e9ec", "Light cool grey like a server hall, with dark instrument panels for the drawing and the 3D scene."),
    ("rack", "Rack", "#0b0c0d", "Black, condensed capitals and amber status lights. Laid out on a rigid rack grid."),
    ("safety", "Safety", "#f1efe8", "Facility signage: off-white, black and safety yellow, heavy condensed type."),
    ("concrete", "Concrete", "#d8d5cf", "Warm concrete grey and black. Big, tight type and large pictures."),
    ("steel", "Steel", "#ffffff", "White with deep steel-blue bands. Calm and corporate, like an infrastructure firm."),
    ("ops", "Ops room", "#08090a", "Near-black with green status accents and monospaced labels, like a network operations room."),
    ("swiss", "Swiss", "#ffffff", "White, black and one signal red. Huge flush-left type on a strict grid."),
]
FONTS = '<link rel="preload" href="themes/fonts/plex-sans.woff2" as="font" type="font/woff2" crossorigin>'

src = (ROOT / "src" / "home.html").read_text()
plant = (ROOT / "src" / "plant.svg.html").read_text()
for i, (tid, name, color, note) in enumerate(THEMES, 1):
    out = (src.replace("{{PLANT}}", plant).replace("{{ID}}", tid).replace("{{NAME}}", name)
              .replace("{{NUM}}", str(i)).replace("{{NOTE}}", note).replace("{{THEME_COLOR}}", color).replace("{{FONTS}}", FONTS))
    (ROOT / tid).mkdir(exist_ok=True)
    (ROOT / tid / "index.html").write_text(out)

items = "\n".join(
    f'    <li><a href="{tid}/"><span class="sw" style="background:{color}"></span><b>{i}. {html.escape(name)}</b></a><span class="note">{html.escape(note)}</span></li>'
    for i, (tid, name, color, note) in enumerate(THEMES, 1))
(ROOT / "index.html").write_text(f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Home page themes</title>
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
  .note {{ display: block; color: #5a5a55; padding-left: 34px; }}
</style>
</head>
<body>
<main>
  <h1>Home page themes</h1>
  <p>{len(THEMES)} styles for the same home page. Words, pictures, the plant drawing, the fiber figure and the 3D model are the same in each; only the style changes.</p>
  <ul>
{items}
  </ul>
</main>
</body>
</html>
""")
print("built", len(THEMES), "themes")
