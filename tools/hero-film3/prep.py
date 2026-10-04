"""Grade the full Lenovo front for the opening shot: logo painted out, dark and cool, orange tabs kept but quieter."""
import pathlib, sys
here = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(here.parent / 'hero-video'))
import numpy as np
from PIL import Image
import prep as P   # reuses the grading helpers (and refreshes the other graded photos)
a = P.load('lenovo.png')
a = P.inpaint(a, [(1118, 330, 1205, 362), (0, 24, 26, 128), (0, 900, 80, 940), (1230, 900, 1280, 940)])
a = P.grade(a, sat=.42, gain=.5, gamma=1.45, tint=(.9, .97, 1.08))
a = P.upscale(a, 2)
a = P.dof(a, 640 * 2, 470 * 2, 900 * 2, blur=6)
a = P.vignette(a, .65)
Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(here / 'img' / 'rack.webp', quality=84, method=6)
print('rack.webp', a.shape)
