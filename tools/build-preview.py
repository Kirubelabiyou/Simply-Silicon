"""Build the claude.ai preview copy in a dist folder.
The preview host wraps the home page in its own document, so index.html loses its doctype, <head> and <body> tags,
and a tiny script restores the body attributes. The other pages are copied as they are."""
import re, shutil, sys, pathlib
src = pathlib.Path(__file__).resolve().parent.parent
dst = pathlib.Path(sys.argv[1])
if dst.exists(): shutil.rmtree(dst)
shutil.copytree(src / 'assets', dst / 'assets', ignore=shutil.ignore_patterns('README.md'))
for p in ['foundation.html', 'workloads.html', 'platform.html']: shutil.copy(src / p, dst / p)
s = (src / 'index.html').read_text()
s = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*', '', s, flags=re.I)
s = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', s)
s = s.replace('</head>\n', '')
s = re.sub(r'<body[^>]*>', '<script>document.body.setAttribute("data-page","home");document.body.id="top";</script>', s)
s = s.replace('</body>\n</html>\n', '').replace('</body>', '').replace('</html>', '')
(dst / 'index.html').write_text(s)
print('built', dst)
