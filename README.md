# Simply Silicon

Website for Simply Silicon: secure, localized AI compute, starting with Foundation in downtown Calgary.

Built as a pitch. Facts and numbers come from [gosimply.ai](https://gosimply.ai).

## Pages

- `index.html` – Home: hero, how it works (five core pieces)
- `foundation.html` – Foundation: 3D downtown Calgary with the private fiber network and the plant by phase
- `workloads.html` – Workloads: who it serves and why
- `platform.html` – Platform: world network map (Calgary opens the 3D scene), pipeline and vision

## Structure

```
assets/css/site.css          Theme tokens, header, menu, footer
assets/css/pages.css         Page components
assets/js/common.js          Shared header, phone menu and footer
assets/js/home.js            GPU racks and How it works
assets/js/network.js         World map (Platform)
assets/js/scene.js           3D scene: Calgary streets, fiber, plant (Three.js)
assets/js/map-data.js        World map paths (Natural Earth 1:50m, simplified)
assets/js/calgary-data.js    Calgary fiber routes and connected buildings (from gosimply.ai)
assets/js/calgary-buildings.js Downtown Calgary footprints and heights (City of Calgary Open Data, 3D Buildings - Citywide)
tools/build-buildings.mjs    Rebuilds calgary-buildings.js from tools/data
assets/vendor/three/         Three.js r160 (MIT)
assets/img/hero.jpg          Home hero background (add the photo here)
```

## Network map status

| Status | Cities |
|---|---|
| Online | Calgary |
| In development | Montreal, Bogotá, Amsterdam, Paris |
| Coming soon | London, Addis Ababa, Mumbai, Sydney, Buenos Aires |

Edit the `SITES` list in `assets/js/network.js` to change cities or status.

## Run locally

Any static server works:

```
python3 -m http.server
```
