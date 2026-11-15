#!/usr/bin/env python3
"""Builds concrete/: the published Simply Silicon site, unchanged except for its theme.
 1. Copies the site as downloaded from the artifact (the folder given on the command line).
 2. Recolours every blue in the styles, drawings and map (the 3D model keeps its own colours) into the Concrete palette
    (warm blacks, concrete greys and off-whites); other colours (warm lights, amber, red warnings, green LEDs) stay.
 3. Adds assets/css/concrete.css, the Concrete theme: concrete-grey page, black ink, Archivo headings, black closing band,
    dark instrument panels for the drawings, map and 3D scenes.
Words, layout, pictures and scripts are not touched.
Run from the repository root:  python3 themes/make_concrete.py <downloaded-site-folder> [--report]"""
import colorsys, pathlib, re, shutil, sys

REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1]).resolve()
OUT = REPO / "concrete"
REPORT = "--report" in sys.argv
WARM_H = 38 / 360  # the hue of concrete: a little warm

KIND = "css"
def concrete(r, g, b):
    """A blue (or blue-grey) becomes the Concrete tone of matching weight; anything else is returned unchanged."""
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    deg = h * 360
    if not (175 <= deg <= 255) or s < 0.06 or max(r, g, b) - min(r, g, b) < 10:
        return None
    if s < 0.35 or l < 0.25:            # blue-greys and the dark slate panels: same lightness, warm grey
        nl, ns = l, min(s, 0.06)
    elif l < 0.5 and KIND == "css":      # deep blue used as the accent on light grounds: Concrete's black ink
        return (18, 17, 16)
    elif l < 0.5:                        # deep blues inside the 3D scene and map (sky light, glass): warm grey of the same weight
        nl, ns = l, 0.06
    else:                                # bright blues on dark grounds (lines, glows, LEDs, fiber): off-white concrete
        nl, ns = min(0.97, 0.80 + (l - 0.5) * 0.4), 0.10
    rr, gg, bb = colorsys.hls_to_rgb(WARM_H, nl, ns)
    return tuple(round(x * 255) for x in (rr, gg, bb))

changes = {}
def note(old, new):
    changes[old] = new

def hex6(m):
    v = m.group(1)
    r, g, b = int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)
    c = concrete(r, g, b)
    if not c: return m.group(0)
    out = "#%02x%02x%02x" % c
    if v.isupper(): out = out.upper()
    note(m.group(0), out); return out

def hex3(m):
    v = m.group(1)
    c = concrete(*(int(ch * 2, 16) for ch in v))
    if not c: return m.group(0)
    out = "#%02x%02x%02x" % c; note(m.group(0), out); return out

def hex0x(m):
    v = m.group(1)
    c = concrete(int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16))
    if not c: return m.group(0)
    out = "0x%02x%02x%02x" % c; note(m.group(0), out); return out

def rgba(m):
    fn, r, g, b, rest = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4)), m.group(5)
    c = concrete(r, g, b)
    if not c: return m.group(0)
    sep = ", " if ", " in m.group(0) else ","
    out = f"{fn}({c[0]}{sep}{c[1]}{sep}{c[2]}{rest})"; note(m.group(0), out); return out

def frac3(m):
    v = [float(x) for x in m.groups()]
    if any(x > 1 for x in v) or "." not in m.group(0): return m.group(0)
    c = concrete(*(round(x * 255) for x in v))
    if not c: return m.group(0)
    out = "[" + ", ".join(f"{x / 255:.2f}".lstrip("0") if x < 255 else "1" for x in c) + "]"
    note(m.group(0), out); return out

def recolor(text, kind):
    global KIND; KIND = kind
    text = re.sub(r"#([0-9a-fA-F]{6})\b", hex6, text)
    if kind != "js":  # in scripts a 3-letter #name is usually an element id, so only 6-digit colours are changed there
        text = re.sub(r"#([0-9a-fA-F]{3})\b(?![0-9a-fA-F-])", hex3, text)
    text = re.sub(r"\b0x([0-9a-fA-F]{6})\b", hex0x, text)
    if kind == "js":  # colour triplets written as fractions, e.g. tint: [.5, .64, .86] in the 3D scene
        text = re.sub(r"\[\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*\]", frac3, text)
    text = re.sub(r"\b(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*((?:,\s*[\d.]+\s*)?)\)", rgba, text)
    return text

if OUT.exists(): shutil.rmtree(OUT)
shutil.copytree(SRC, OUT)
SKIP = ("assets/vendor/", "assets/img/backers/")  # Three.js itself and the investors' own logos
for p in sorted(OUT.rglob("*")):
    rel = str(p.relative_to(OUT))
    if not p.is_file() or rel.startswith(SKIP) or p.suffix not in (".css", ".js", ".html", ".svg"): continue
    if rel == "assets/img/favicon.svg": continue  # the brand mark keeps its blue
    if rel == "assets/js/scene.js": continue  # the 3D model keeps its own colours, as asked
    t = p.read_text()
    if p.suffix == ".css":  # rules that style the 3D model itself (its sky and its labels) keep their colours
        n = "".join(l if re.match(r"\s*\.(scene\.scene--ready|s-lbl)\b", l) else recolor(l, "css") for l in t.splitlines(True))
    else:
        n = recolor(t, "js" if p.suffix == ".js" else "css")
    if p.suffix == ".html" and "assets/css/design.css" in n:
        n = n.replace('<link rel="stylesheet" href="assets/kit/motion/motion.css">',
                      '<link rel="stylesheet" href="assets/kit/motion/motion.css">\n<link rel="stylesheet" href="assets/css/concrete.css">', 1)
        n = re.sub(r'<meta name="theme-color" content="[^"]*">', '<meta name="theme-color" content="#d8d5cf">', n)
    if n != t: p.write_text(n)

shutil.copy(REPO / "themes" / "concrete-site.css", OUT / "assets" / "css" / "concrete.css")
if REPORT:
    for k, v in sorted(changes.items()): print(f"{k:32} -> {v}")
print(f"concrete/ built: {len(changes)} distinct blues recoloured")
