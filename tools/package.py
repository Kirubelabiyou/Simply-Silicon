#!/usr/bin/env python3
"""Packages the website for hand-off and makes its QR code.

  python3 tools/package.py [site-url]

Writes:
  deploy/simply-silicon-site.zip   the whole website (pages + assets) and DEPLOY.md: the one file to send a web team
  deploy/qr-code.png, qr-code.svg  a QR code that opens the site (default: the GitHub Pages address)
  deploy/qr-trailer.png, .svg      a QR code that opens the trailer page (trailer/); replace trailer/trailer.mp4 to change the video
Needs: pip install qrcode"""
import pathlib, sys, zipfile
import qrcode, qrcode.image.svg

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = sys.argv[1] if len(sys.argv) > 1 else "https://kirubelabiyou.github.io/Simply-Silicon/"
OUT = ROOT / "deploy"
SITE = ["index.html", "foundation.html", "workloads.html", "platform.html", "careers.html", "404.html", "DEPLOY.md"]

OUT.mkdir(exist_ok=True)
zpath = OUT / "simply-silicon-site.zip"
with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
    for name in SITE:
        z.write(ROOT / name, f"simply-silicon-site/{name}")
    for f in sorted((ROOT / "assets").rglob("*")):
        if f.is_file():
            z.write(f, f"simply-silicon-site/{f.relative_to(ROOT)}")
print(f"wrote {zpath.relative_to(ROOT)} ({zpath.stat().st_size / 1e6:.1f} MB)")

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=16, border=4)
qr.add_data(URL); qr.make(fit=True)
qr.make_image(fill_color="black", back_color="white").save(OUT / "qr-code.png")
qrcode.make(URL, image_factory=qrcode.image.svg.SvgPathImage).save(OUT / "qr-code.svg")
print(f"wrote deploy/qr-code.png and deploy/qr-code.svg for {URL}")

TRAILER = URL.rstrip("/") + "/trailer/"
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=16, border=4)
qr.add_data(TRAILER); qr.make(fit=True)
qr.make_image(fill_color="black", back_color="white").save(OUT / "qr-trailer.png")
qrcode.make(TRAILER, image_factory=qrcode.image.svg.SvgPathImage).save(OUT / "qr-trailer.svg")
print(f"wrote deploy/qr-trailer.png and deploy/qr-trailer.svg for {TRAILER}")
