#!/usr/bin/env python3
"""Builds concrete/: the published Simply Silicon site in a black-and-white Concrete and Swiss design.
 1. Copies the site as downloaded from the artifact (the folder given on the command line).
 2. Recolours every blue and red in the styles, figures and map into black, white and greys.
    Left as they were: the data centre drawing in the home hero, the 3D model, warm lights and the amber "in development" key.
 3. Adds assets/css/concrete.css (from themes/concrete-site.css): white page, black ink, Concrete's heavy Archivo type,
    Swiss rules and grid, no background grid lines or boxes, black closing band, black panels for the figures and map.
Words, sections, pictures and scripts are not touched.
With --mono it builds mono/ instead: the same edits on a mostly black ground (themes/mono-site.css), white bands on a
few sections, the investors' logos in their original files, and the original's column bars and table lines.
Run from the repository root:  python3 themes/make_concrete.py <downloaded-site-folder> [--mono] [--report]"""
import colorsys, pathlib, re, shutil, sys
from PIL import Image, ImageEnhance

REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1]).resolve()
MONO = "--mono" in sys.argv
OUT = REPO / ("mono" if MONO else "concrete")
CSS_SRC = REPO / "themes" / ("mono-site.css" if MONO else "concrete-site.css")
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
        n = re.sub(r'<meta name="theme-color" content="[^"]*">', '<meta name="theme-color" content="' + ('#0a0a0a' if MONO else '#ffffff') + '">', n)
    if n != t: p.write_text(n)

# Home: wording asked for by the owner
hp = OUT / "index.html"; t = hp.read_text()
ACTIVITY = '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />'
for old_, new_ in [
    ("AI without giving up control<span", "Compute without giving up control<span"),
    ("Keep your data and run your own models<span", "Keep your data. Run your own model<span"),
    # the team tiles take the names and lines the Workloads page already uses
    ("<h3>Banking</h3><p>Use AI on client data without a public cloud.</p>",
     "<h3>Regulated enterprise</h3><p>Banks, healthcare and government teams with strict rules about where data can go.</p>"),
    ('<path d="M11 2v2" /> <path d="M5 2v2" /> <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" /> <path d="M8 15a6 6 0 0 0 12 0v-3" /> <circle cx="20" cy="10" r="2" /> </svg><h3>Healthcare</h3><p>Keep patient data private while your teams use the latest models.</p>',
     ACTIVITY + ' </svg><h3>Critical AI services</h3><p>Emergency response, public safety, security, and other services with no tolerance for unreliable inference.</p>'),
    ("<h3>Government</h3><p>Run sensitive work on hardware you control.</p>",
     "<h3>High-security workloads</h3><p>Superintelligent models, defence systems, and government environments where network exposure matters.</p>"),
    # Dedicated bare metal: a brightened copy of the same rack photo
    ('src="assets/img/rack-1280.webp" srcset="assets/img/rack-1280.webp 1280w, assets/img/rack.webp 2560w"',
     'src="assets/img/rack-1280-bright.webp" srcset="assets/img/rack-1280-bright.webp 1280w, assets/img/rack-bright.webp 2560w"'),
]:
    assert old_ in t, old_[:60]; t = t.replace(old_, new_)
hp.write_text(t)
# the rack photo with its shadows lifted (gamma), so the hardware can be seen; the original files stay as they are
for name in ("rack-1280", "rack"):
    im = Image.open(OUT / f"assets/img/{name}.webp").convert("RGB")
    im = im.point([round(255 * ((i / 255) ** 0.5)) for i in range(256)] * 3)
    ImageEnhance.Contrast(im).enhance(1.12).save(OUT / f"assets/img/{name}-bright.webp", "WEBP", quality=86)

# Investors' logos for a light ground: the files are made for a dark ground (white lettering), so only their white and
# pale-grey parts are turned dark; every coloured part keeps its own colour. Microsoft's pale wordmark takes its usual grey.
for f in ([] if MONO else sorted((OUT / "assets/img/backers").glob("*.webp"))):
    im = Image.open(f).convert("RGBA"); px = im.load()
    x0 = im.size[1] + 4 if f.stem == "heartland-generation" else 0  # Heartland's round emblem keeps its white centre
    for y in range(im.size[1]):
        for x in range(x0, im.size[0]):
            r, g, b, a = px[x, y]
            if not a: continue
            mx, mn = max(r, g, b), min(r, g, b)
            if mx > 140 and (mx - mn) / mx < 0.22:   # white or pale grey lettering
                v = round(28 + (255 - mx) * 0.25)
                px[x, y] = (v, v, v, a)
    im.save(f, "WEBP", lossless=True)
ms = OUT / "assets/img/backers/microsoft.svg"
if not MONO: ms.write_text(ms.read_text().replace('fill="#e8f8fb"', 'fill="#737373"'))

# Platform: the sections from "The industry is already rebuilding around locality" to "Built for machines" are removed
pf = OUT / "platform.html"; t = pf.read_text()
a = t.index('  <section class="sec">\n    <div class="wrap">\n      <div class="sec-intro">\n        <h2 data-rv>The industry is already rebuilding')
b = t.index('  <section class="sec sec--light">\n    <div class="wrap">\n      <blockquote')
t = t[:a] + t[b:]
a = t.index("<script>\n  (function () {\n    var rows = [[1, 50]"); b = t.index("</script>", a) + len("</script>\n")
t = t[:a] + t[b:]
pf.write_text(t)
# the map can be drawn light: it reads --map-dark from CSS instead of always lighting the land as a night map
nj = OUT / "assets/js/network.js"; t = nj.read_text()
assert "shadow: cv('--map-shadow', 'rgba(34,34,34,.18)'), dark: true };" in t
nj.write_text(t.replace("dark: true };", "dark: cv('--map-dark', '1') !== '0' };"))

# mono: a few sections become white bands (class band-w) on the otherwise black site
if MONO:
    BANDS = {"index.html": ["Compute without giving up control<span", "How it works<span"], "foundation.html": ["About the site"],
             "workloads.html": ["What every workload gets"], "platform.html": ["Two different physical problems"]}
    for page, heads in BANDS.items():
        f = OUT / page; t = f.read_text()
        for h in heads:
            i = t.index(h); j = t.rindex('<section class="', 0, i) + len('<section class="')
            t = t[:j] + "band-w " + t[j:]
        f.write_text(t)
shutil.copy(CSS_SRC, OUT / "assets" / "css" / "concrete.css")
if REPORT:
    for k, v in sorted(changes.items()): print(f"{k:32} -> {v}")
print(f"{OUT.name}/ built: {len(changes)} distinct colours changed")
