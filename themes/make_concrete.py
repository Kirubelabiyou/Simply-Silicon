#!/usr/bin/env python3
"""Builds concrete/: the published Simply Silicon site in a black-and-white Concrete and Swiss design.
 1. Copies the site as downloaded from the artifact (the folder given on the command line).
 2. Recolours every blue and red in the styles, figures and map into black, white and greys.
    Left as they were: the data centre drawing in the home hero, the 3D model, warm lights and the amber "in development" key.
 3. Adds assets/css/concrete.css (from themes/concrete-site.css): white page, black ink, Concrete's heavy Archivo type,
    Swiss rules and grid, no background grid lines or boxes, black closing band, black panels for the figures and map.
Words, sections, pictures and scripts are not touched.
Run from the repository root:  python3 themes/make_concrete.py <downloaded-site-folder> [--report]"""
import colorsys, pathlib, re, shutil, sys

REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1]).resolve()
OUT = REPO / "concrete"
REPORT = "--report" in sys.argv
GREY_H = 0  # greys are neutral: black and white, nothing tinted

KIND = "css"
def concrete(r, g, b):
    """A blue (or blue-grey) or a red becomes a neutral of matching weight; anything else is returned unchanged."""
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    deg = h * 360
    if max(r, g, b) - min(r, g, b) < 10 or s < 0.06:
        return None
    if (deg <= 15 or deg >= 345) and s >= 0.35 and 0.3 <= l <= 0.8:   # red warnings: a mid grey
        nl = 0.6
    elif not (175 <= deg <= 255):
        return None
    elif s < 0.35 or l < 0.25:          # blue-greys and dark slate panels: the same lightness in grey
        nl = l
    elif l < 0.5 and KIND == "css":      # deep blue used as the accent on light grounds: black ink
        return (17, 17, 17)
    elif l < 0.5:
        nl = l
    else:                                # bright blues on dark grounds (lines, glows, LEDs, fiber): near white
        nl = min(0.97, 0.82 + (l - 0.5) * 0.4)
    v = round(nl * 255)
    return (v, v, v)

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
    if p.suffix == ".css":  # rules for the 3D model (its sky and labels) and the hero's data centre drawing keep their colours
        keep = r"\s*(\.scene\.scene--ready|\.s-lbl|#plantSvg|\.hx-stage \{)"
        n = "".join(l if re.match(keep, l) else recolor(l, "css") for l in t.splitlines(True))
    elif rel == "index.html":  # the data centre drawing in the hero keeps its own colours
        a = t.index('<svg id="plantSvg"'); b = t.index("</svg>", a) + 6
        n = recolor(t[:a], "css") + t[a:b] + recolor(t[b:], "css")
    else:
        n = recolor(t, "js" if p.suffix == ".js" else "css")
    if p.suffix == ".html" and "assets/css/design.css" in n:
        n = n.replace('<link rel="stylesheet" href="assets/kit/motion/motion.css">',
                      '<link rel="stylesheet" href="assets/kit/motion/motion.css">\n<link rel="stylesheet" href="assets/css/concrete.css">', 1)
        n = re.sub(r'<meta name="theme-color" content="[^"]*">', '<meta name="theme-color" content="#ffffff">', n)
    if n != t: p.write_text(n)

shutil.copy(REPO / "themes" / "concrete-site.css", OUT / "assets" / "css" / "concrete.css")
if REPORT:
    for k, v in sorted(changes.items()): print(f"{k:32} -> {v}")
print(f"concrete/ built: {len(changes)} distinct colours changed")
