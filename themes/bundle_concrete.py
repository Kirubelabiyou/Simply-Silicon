#!/usr/bin/env python3
"""Packs the Concrete site (concrete/) into ONE self-contained file, concrete/preview.html, so the whole site
can be opened and clicked through with no web server (for example in a chat preview pane).
Every asset (styles, fonts, pictures, scripts, Three.js, data) is embedded once and turned into data URLs at run
time; each page is shown in a frame and the menu links swap pages inside the file.
Run from the repository root after make_concrete.py:  python3 themes/bundle_concrete.py"""
import base64, json, mimetypes, pathlib, re

REPO = pathlib.Path(__file__).resolve().parent.parent / "concrete"
THEMES = [("concrete", "Concrete")]
PAGES = {"home": "index.html", "foundation": "foundation.html", "workloads": "workloads.html", "platform": "platform.html"}
OUT = REPO / "preview.html"

assets = {}  # key -> {"t": mime, "b": base64} (binary) or {"t": mime, "s": text} (text that may hold %%A:key%% refs)

def ph(key):
    return "%%A:" + key + "%%"

def add_bin(path):
    key = str(path)
    if key not in assets:
        mime = mimetypes.guess_type(key)[0] or "application/octet-stream"
        if key.endswith(".woff2"): mime = "font/woff2"
        if key.endswith(".webp"): mime = "image/webp"
        assets[key] = {"t": mime, "b": base64.b64encode((REPO / key).read_bytes()).decode()}
    return ph(key)

def css_urls(text, base):
    def sub(m):
        u = m.group(2)
        if u.startswith(("data:", "#", "http")): return m.group(0)
        p = (REPO / base / u).resolve().relative_to(REPO)
        return f'url("{add_bin(p)}")'
    return re.sub(r'url\((["\']?)([^)"\']+)\1\)', sub, text)

# styles, in the order the pages load them
CSS = ["assets/css/site.css", "assets/css/design.css", "assets/kit/motion/motion.css", "assets/css/concrete.css", "assets/kit/moments/cursor-spotlight/moment.css"]
for c in CSS:
    assets[c] = {"t": "text/css", "s": css_urls((REPO / c).read_text(), str(pathlib.Path(c).parent))}

# scripts: point module imports at bare names the import map resolves
def js(name, text=None):
    text = text if text is not None else (REPO / name).read_text()
    text = text.replace("import('./scene.js')", "import('ss-scene')")
    text = text.replace("'../vendor/three/addons/OrbitControls.js'", "'three-orbit'").replace("'../vendor/three/addons/RoomEnvironment.js'", "'three-room'")
    assets[name] = {"t": "text/javascript", "s": text}
    return ph(name)

for f in ["three.module.min.js", "addons/OrbitControls.js", "addons/RoomEnvironment.js"]:
    js("assets/vendor/three/" + f)
for f in sorted((REPO / "assets/js").glob("*.js")):
    t = f.read_text()
    if f.name == "careers.js":  # read the route from the shim, since sandboxed frames may not allow #hash navigation in about:srcdoc
        assert "var on = location.hash === '#careers';" in t
        t = t.replace("var on = location.hash === '#careers';", "var on = (window.__ssHash != null ? window.__ssHash : location.hash) === '#careers';")
    js(str(f.relative_to(REPO)), t)
m = (REPO / "assets/kit/moments/moments.js").read_text()
for old, new in [("import * as lib from './lib.js';", "import * as lib from 'ss-mlib';"),
                 ("const BASE = new URL('./', import.meta.url);", "const BASE = null;"),
                 ("css(new URL(`${id}/moment.css`, BASE).href)", "css(window.__D['assets/kit/moments/' + id + '/moment.css'])"),
                 ("import(new URL(`${id}/moment.js`, BASE).href)", "import(window.__D['assets/kit/moments/' + id + '/moment.js'])")]:
    assert old in m, old; m = m.replace(old, new)
js("assets/kit/moments/moments.js", m)
for f in ["assets/kit/moments/lib.js", "assets/kit/moments/cursor-spotlight/moment.js", "assets/kit/motion/motion.js"]:
    js(f)
IMPORTMAP = json.dumps({"imports": {"ss-mlib": ph("assets/kit/moments/lib.js"), "three": ph("assets/vendor/three/three.module.min.js"),
                                    "three-orbit": ph("assets/vendor/three/addons/OrbitControls.js"),
                                    "three-room": ph("assets/vendor/three/addons/RoomEnvironment.js"),
                                    "ss-scene": ph("assets/js/scene.js")}})

# files that scripts load by path at run time (logos, data, Calgary scripts, careers list)
dynamic = ["assets/data/positions.json"] + [str(p.relative_to(REPO)) for p in sorted((REPO / "assets/img/backers").glob("*")) if p.suffix in (".svg", ".webp", ".png")]
for d in dynamic: add_bin(pathlib.Path(d))
DYN = {**{d: ph(d) for d in dynamic}, **{k: ph(k) for k in ["assets/kit/moments/cursor-spotlight/moment.css", "assets/kit/moments/cursor-spotlight/moment.js"]}, **{f"assets/js/calgary-{n}.js": ph(f"assets/js/calgary-{n}.js") for n in ("data", "buildings", "streets", "parks")}}

def page(tid, fname):
    h = (REPO / fname).read_text()
    h = re.sub(r'<link rel="(preload|modulepreload|icon)"[^>]*>\n?', "", h)
    h = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: f'<link rel="stylesheet" href="{ph(m.group(1))}">', h)
    if '<script type="importmap">' in h:
        h = re.sub(r'<script type="importmap">.*?</script>', lambda m: f'<script type="importmap">{IMPORTMAP}</script>', h, flags=re.S)
    else:
        h = h.replace("<head>", f'<head>\n<script type="importmap">{IMPORTMAP}</script>', 1)
    h = h.replace("from './assets/js/scene.js'", "from 'ss-scene'")
    h = re.sub(r'<script (type="module" )?src="(assets/[^"]+)">', lambda m: f'<script {m.group(1) or ""}src="{ph(m.group(2))}">', h)
    h = re.sub(r'(?<=[" ,])(assets/(?:img|docs)/[^" ,]+)', lambda m: add_bin(pathlib.Path(m.group(1))), h)
    h = re.sub(r"<head>(\s*<meta charset=\"utf-8\">)?", lambda m: m.group(0) + "\n<script>%%SHIM%%</script>", h, count=1)
    return h

pages = {tid: {p: page(tid, f) for p, f in PAGES.items()} for tid, _ in THEMES}

# Runs first inside every page: maps run-time file paths to the embedded copies and turns site links into page swaps
SHIM = r"""
(function () {
  var D = window.__D || {}, T = window.__T, P = window.__P;
  function map(u) { if (typeof u !== 'string') return u; var k = u.replace(/^\.?\//, ''); return D[k] || u; }
  [[HTMLImageElement, 'src'], [HTMLScriptElement, 'src']].forEach(function (x) {
    var d = Object.getOwnPropertyDescriptor(x[0].prototype, x[1]);
    Object.defineProperty(x[0].prototype, x[1], { configurable: true, get: d.get, set: function (v) { d.set.call(this, map(v)); } });
  });
  var f = window.fetch; window.fetch = function (u, o) { return f.call(this, map(u), o); };
  var pages = { '': 'home', 'index.html': 'home', 'careers.html': 'careers', 'foundation.html': 'foundation', 'workloads.html': 'workloads', 'platform.html': 'platform' };
  window.__ssHash = window.__H || '';
  function setHash(h) { window.__ssHash = h; try { history.replaceState(null, '', h || location.pathname); } catch (e) {} window.dispatchEvent(new Event('hashchange')); }
  function go(hash) {
    var inCareers = window.__ssHash === '#careers';
    if (hash === '#careers') { if (!inCareers) setHash('#careers'); return; }
    if (inCareers) setHash('');
    var t = hash && hash.length > 1 && document.getElementById(hash.slice(1));
    if (t) setTimeout(function () { scrollTo({ top: t.getBoundingClientRect().top + scrollY - 72, behavior: inCareers ? 'auto' : 'smooth' }); }, inCareers ? 30 : 0);
    else scrollTo(0, 0);
  }
  // arrived from another page with a #section (or #careers) in the link
  if (window.__H && window.__H !== '#careers') window.addEventListener('load', function () { setTimeout(function () { go(window.__H); }, 50); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var raw = a.getAttribute('href');
    if (raw.charAt(0) === '#' && P === 'home' && (raw === '#careers' || window.__ssHash === '#careers')) { e.preventDefault(); e.stopImmediatePropagation(); go(raw); return; }
    if (/^(https?:|mailto:|tel:)/.test(raw)) { e.preventDefault(); window.open(raw, '_blank', 'noopener'); return; }
    if (raw.charAt(0) === '#') return;
    var m = raw.match(/^()(?:\.\/)?([\w.-]*)(#.*)?$/); if (!m || !(m[2] in pages)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var page = pages[m[2]], hash = m[3] || '';
    if (page === 'careers') { page = 'home'; hash = '#careers'; }
    if (page === P) go(hash || '#'); else parent.postMessage({ ssNav: page, hash: hash }, '*');
  }, true);
})();
"""

shell = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Simply Silicon</title>
<style>
  html, body { margin: 0; height: 100%; background: #d8d5cf; }
  body { display: flex; flex-direction: column; font: 500 13px/1 -apple-system, "Helvetica Neue", Arial, sans-serif; }
  nav { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: #111; color: #9a9a9a; flex: none; overflow-x: auto; }
  nav span { margin-right: 6px; white-space: nowrap; }
  nav button { font: inherit; color: #ddd; background: none; border: 0; border-radius: 4px; padding: 8px 12px; cursor: pointer; white-space: nowrap; }
  nav button[aria-pressed="true"] { background: #fff; color: #111; }
  iframe { flex: 1; width: 100%; border: 0; background: #d8d5cf; }
</style>
</head>
<body>
<iframe id="site" title="Site preview"></iframe>
<script id="ss-data" type="application/json">%%DATA%%</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById('ss-data').textContent);
  var url = {}, A = data.assets;
  function fill(s) { return s.replace(/%%A:([^%]+)%%/g, function (_, k) { return url[k] || k; }); }
  // data: URLs rather than blob: URLs, so the file also works inside sandboxed preview frames
  function b64(t) { var u = new TextEncoder().encode(t), s = ''; for (var i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }
  Object.keys(A).forEach(function (k) { if (A[k].b != null) url[k] = 'data:' + A[k].t + ';base64,' + A[k].b; });
  // text assets can refer to binary ones (fonts and pictures in CSS)
  Object.keys(A).forEach(function (k) { if (A[k].s != null) url[k] = 'data:' + A[k].t + ';charset=utf-8;base64,' + b64(fill(A[k].s)); });
  var dyn = {}; Object.keys(data.dyn).forEach(function (k) { dyn[k] = fill(data.dyn[k]); });
  var frame = document.getElementById('site'), theme = data.themes[0], cur = 'home';
  function show(page, hash) {
    cur = page;
    var head = 'window.__D=' + JSON.stringify(dyn) + ';window.__T=' + JSON.stringify(theme) + ';window.__P=' + JSON.stringify(page) + ';window.__H=' + JSON.stringify(hash || '') + ';' + data.shim;
    frame.srcdoc = fill(data.pages[theme][page]).replace('%%SHIM%%', function () { return head; });
    document.querySelectorAll('nav button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.t === theme ? 'true' : 'false'); });
  }
  window.addEventListener('message', function (e) {
    if (e.source !== frame.contentWindow || !e.data || !e.data.ssNav) return;
    show(e.data.ssNav, e.data.hash);
  });
  document.querySelectorAll('nav button').forEach(function (b) { b.addEventListener('click', function () { theme = b.dataset.t; show(cur); }); });
  show('home');
})();
</script>
</body>
</html>
"""

buttons = "".join(f'<button type="button" data-t="{tid}">{name}</button>' for tid, name in THEMES)
data = json.dumps({"assets": assets, "pages": pages, "dyn": DYN, "shim": SHIM, "themes": [t for t, _ in THEMES]})
data = data.replace("</", "<\\/")  # keep the JSON from closing its script tag
OUT.write_text(shell.replace("%%BUTTONS%%", buttons).replace("%%DATA%%", data))
print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size / 1e6:.1f} MB)")
