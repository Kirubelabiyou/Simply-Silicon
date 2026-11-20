#!/usr/bin/env python3
"""Puts a new video behind the "Simply Silicon short video" QR code.

  python3 tools/update-video.py path/to/new-video.mp4

Copies the video to trailer/trailer.mp4 (set up to start playing quickly on phones, same quality),
and stamps the page with the video's fingerprint, so phones load the new video instead of an old saved copy.
Then commit and push to main: the printed QR code plays the new video a few minutes later.
Needs ffmpeg."""
import hashlib, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__)
dst = ROOT / "trailer" / "trailer.mp4"
tmp = dst.with_name("trailer.tmp.mp4")   # written first, so the old video is never touched until the new one is ready
try:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-c", "copy", "-movflags", "+faststart", str(tmp)], check=True)
except (OSError, subprocess.CalledProcessError):
    shutil.copyfile(src, tmp)   # no ffmpeg: copy as is
if tmp.stat().st_size < src.stat().st_size * 0.9:
    tmp.unlink(); sys.exit("The new file came out much smaller than the original; nothing was changed.")
tmp.replace(dst)
v = hashlib.sha256(dst.read_bytes()).hexdigest()[:10]
# a still from the video, shown before it plays (phones otherwise show an empty black box)
try:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "3", "-i", str(dst), "-frames:v", "1", "-q:v", "4", str(dst.with_name("poster.jpg"))], check=True)
except (OSError, subprocess.CalledProcessError):
    pass
page = ROOT / "trailer" / "index.html"
html = re.sub(r'src="trailer\.mp4(\?v=[0-9a-f]+)?"', f'src="trailer.mp4?v={v}"', page.read_text())
html = re.sub(r'poster="poster\.jpg(\?v=[0-9a-f]+)?"', f'poster="poster.jpg?v={v}"', html)
page.write_text(html)
print(f"trailer/trailer.mp4 updated ({dst.stat().st_size / 1e6:.1f} MB, version {v}). Now commit and push to main.")
