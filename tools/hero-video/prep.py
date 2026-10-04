"""Grade the source photos for the hero video loops.
Real photos only: the Lenovo GPU server, the NVIDIA DGX front, a fiber macro, and the Foundation plant.
Brand marks are painted out, everything is graded to one dark, cool night look, and the GPU shots get a
shallow depth of field around the point where the blue dot starts."""
import pathlib
import numpy as np, cv2
from PIL import Image, ImageFilter

here = pathlib.Path(__file__).resolve().parent
src, out = here / 'src', here / 'img'
out.mkdir(exist_ok=True)


def load(n):
    return np.array(Image.open(src / n).convert('RGB')).astype(np.float32) / 255


def save(a, n, q=82):
    Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(out / n, quality=q, method=6)
    print(n, a.shape[1], a.shape[0])


def inpaint(a, boxes):
    u8 = (a * 255).astype(np.uint8)
    m = np.zeros(u8.shape[:2], np.uint8)
    for x0, y0, x1, y1 in boxes:
        m[y0:y1, x0:x1] = 255
    return cv2.inpaint(u8, m, 7, cv2.INPAINT_TELEA).astype(np.float32) / 255


def grade(a, sat=.28, gain=.62, gamma=1.35, tint=(.86, .97, 1.12)):
    l = (a * [.2126, .7152, .0722]).sum(-1, keepdims=True)
    a = l + (a - l) * sat                       # quiet the colour
    a = np.power(np.clip(a * gain, 0, 1), gamma)  # darker, deeper blacks
    a = a * np.array(tint)                       # cool night tint
    return np.clip(a, 0, 1)


def upscale(a, f):
    im = Image.fromarray((a * 255).astype(np.uint8))
    im = im.resize((int(im.width * f), int(im.height * f)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 40, 2))
    return np.array(im).astype(np.float32) / 255


def dof(a, cx, cy, r, blur=9):
    b = cv2.GaussianBlur(a, (0, 0), blur)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx - cx) ** 2 + ((yy - cy) * 1.25) ** 2) / r
    m = np.clip((d - .45) / .9, 0, 1)[..., None] ** 1.4
    return a * (1 - m) + b * m


def vignette(a, k=.55):
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    return a * (1 - k * np.clip(d - .35, 0, 1) ** 1.6)[..., None]


# 1. Lenovo GPU server. The dot starts at the port on GPU slot 5 (667, 745 in the source).
a = load('lenovo.png')
a = inpaint(a, [(1118, 330, 1205, 362), (0, 24, 26, 128), (0, 900, 80, 940), (1230, 900, 1280, 940)])
a = grade(a, sat=.22, gain=.6, gamma=1.4)
F = 2
a = upscale(a, F)
a = dof(a, 667 * F, 745 * F, 520 * F, blur=7 * F)
save(vignette(a, .5), 'gpu.webp')

# 2. NVIDIA DGX front. Logo strip below y=1300 is cropped away. The dot starts at the status light at (994, 514).
a = load('dgx.png')[:1290]
a = grade(a, sat=.18, gain=.58, gamma=1.45)
a = dof(a, 994, 514, 900, blur=8)
save(vignette(a, .6), 'dgx.webp')

# 3. Fiber macro, scaled up and softened so it holds full screen.
a = load('fiber.png')
a = cv2.GaussianBlur(a, (0, 0), .8)
a = upscale(a, 3)
a = np.clip(np.power(a, 1.08) * 1.05, 0, 1)
save(a, 'fiber.webp')

# 4. Foundation plant, day to night. The clear sky is keyed out and replaced with a night gradient,
#    the steel is darkened and cooled, and the window bands carry a faint glow.
a = load('foundation.jpg')
h, w = a.shape[:2]
r, g, b = a[..., 0], a[..., 1], a[..., 2]
sky = np.clip(((b - np.maximum(r, g)) - .12) / .12, 0, 1)
sky[int(h * .74):] = 0
sky = cv2.GaussianBlur(sky, (0, 0), 1.2)[..., None]
yy = np.linspace(0, 1, h)[:, None, None]
night = np.concatenate([.012 + .03 * yy, .02 + .05 * yy, .045 + .1 * yy], -1) * np.ones((1, w, 1))
body = grade(a, sat=.2, gain=.42, gamma=1.5, tint=(.84, .95, 1.14))
lum = (a * [.2126, .7152, .0722]).sum(-1, keepdims=True)
rim = np.clip((lum - .7) / .3, 0, 1) * np.array([.55, .7, .85]) * .55   # bright steel catches a cool rim light
body = np.clip(body + rim, 0, 1)
a = body * (1 - sky) + night * sky
save(upscale(a, 2), 'foundation.webp')
