# Simply Silicon

The website for Simply Silicon: secure, localized AI compute, starting with Foundation in downtown Calgary.

**Live:** https://kirubelabiyou.github.io/Simply-Silicon/ (GitHub Pages, from the `main` branch)
**Deploy anywhere else:** send `deploy/simply-silicon-site.zip`. It contains the whole site and `DEPLOY.md` with the steps.

## The site

A static site with no build step. Open `index.html`, or run a local server from this folder:

```
python3 -m http.server 8000      # then visit http://localhost:8000
```

| Page | What's on it |
|---|---|
| `index.html` | Home: hero drawing of the plant, comparison, the two services, getting started, who it's for, the Foundation 3D loop, investors. Careers lives at `index.html#careers`. |
| `foundation.html` | Foundation: the 3D model of downtown Calgary, key numbers, the three phases, the site. |
| `workloads.html` | Workloads: who it serves and what every workload gets. |
| `platform.html` | Platform: the world map (tap Calgary for 3D), one physical platform, the internet vs inference, the paper. |
| `404.html` | Page-not-found page. |

### Look

- Black ground with white type, and heavy Archivo headings.
- Sections are told apart by two shades of black and a soft light at the top of each.
- Behind every page is a field of faint dots that slowly light and fade (`assets/js/dots.js`). Visitors who ask for reduced motion see it still.
- Blue appears only in the hero's plant drawing and the 3D model.
- Green (Online) and lime (In development) appear only on the status markers.
- All text passes WCAG AAA contrast (7:1) against its background.

### Files

```
assets/css/site.css, design.css   the base styles
assets/css/mono.css               the black-and-white theme (loaded last; colour, type, spacing)
assets/kit/                       hero entrance and cursor light
assets/js/common.js               header, phone menu, contact form, footer
assets/js/home.js                 plant drawing, service figures, investor strip, Foundation loop
assets/js/careers.js              careers list (reads assets/data/positions.json)
assets/js/network.js              Platform world map
assets/js/scene.js                3D model of downtown Calgary (Three.js)
assets/js/calgary-*.js            City of Calgary open data: buildings, streets, parks; fiber routes
assets/js/map-data.js             world map (Natural Earth, simplified)
assets/js/dots.js                 the dot-field background
assets/js/typeset.js              keeps the last two words of a line together
assets/vendor/three/              Three.js r160 (MIT)
assets/fonts/                     Archivo, IBM Plex Sans and Mono, Instrument Sans, Martian Mono, Quicksand (SIL OFL)
tools/                            rebuild the Calgary data files; package.py makes the deploy zip and QR code
deploy/                           simply-silicon-site.zip, DEPLOY.md inside it, qr-code.png / .svg
archive/                          every earlier version of the site, kept for reference (see archive/README.md)
```

### Updating

- **Words and numbers:** edit them in the `.html` files.
- **Open roles:** add them to `assets/data/positions.json`. See `DEPLOY.md` for the format.
- **After any change:** run `python3 tools/package.py` to refresh the deploy zip and QR code.

## Facts used on the site

These are the same on every page and in the 3D model:

- 12 MW at full build, with n+1 power and cooling
- 14 MVA n+1 from dual grid feeds and on-site generation
- 7 km of private air-gapped fiber to 25+ buildings
- 435 9 Ave SE, Calgary, inside a district heating plant
- Phase 1 is 100 kW and online; Phase 2 is 2 MW in February 2027; Phase 3 is the full 12 MW
- Pipeline: 15+ sites, 200 MW+ and 12+ major cities

Earlier versions note that the facts come from gosimply.ai.
