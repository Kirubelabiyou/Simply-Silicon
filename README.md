# Simply Silicon

Website for Simply Silicon: secure, localized AI compute, starting with Foundation in downtown Calgary.

Built as a pitch. Facts and numbers come from [gosimply.ai](https://gosimply.ai).

## Pages

- `index.html` – Home: hero, how it works (five core pieces), request journey
- `foundation.html` – Foundation: 3D plant model by phase, specs
- `network.html` – Network: world map of sites, Calgary private fiber map (`#calgary`)
- `workloads.html` – Workloads: who it serves and why
- `platform.html` – Platform: pipeline and long-term vision

## Structure

```
assets/css/site.css          Theme tokens, header, menu, footer
assets/css/pages.css         Page components
assets/js/common.js          Shared header, phone menu and footer
assets/js/home.js            GPU racks and the explainer
assets/js/network.js         World map and Calgary fiber map
assets/js/map-data.js        Dotted world map (Natural Earth 1:50m land)
assets/js/calgary-data.js    Calgary buildings and fiber routes (from gosimply.ai)
assets/js/foundation3d.js    Foundation 3D model (Three.js)
assets/vendor/three/         Three.js r160 (MIT)
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
