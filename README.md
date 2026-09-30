# Simply Silicon

Website for Simply Silicon: secure, localized AI compute, starting with Foundation in downtown Calgary.

Built as a pitch. Facts and numbers come from [gosimply.ai](https://gosimply.ai).

## Pages

- `index.html` – Home: hero, world network map with glowing site nodes, Foundation 3D view, what we do, who it's for, growth.
- `about.html` – How it works: five core pieces (Power, Compute, Fiber, Security, Engineering), each explained in layers.

## Structure

```
assets/css/site.css          Styles and design tokens
assets/js/site.js            Home page: racks, map, Foundation overlay
assets/js/map-data.js        Dotted world map (Natural Earth 1:50m land)
assets/js/foundation3d.js    Foundation 3D model (Three.js)
assets/js/about.js           How it works explainer
assets/vendor/three/         Three.js r160 (MIT)
assets/img/                  Real site photos go here (e.g. phase1.jpeg)
```

## Network map status

| Status | Cities |
|---|---|
| Online | Calgary |
| In development | Montreal, Bogotá, Amsterdam, Paris |
| Coming soon | London, Addis Ababa, Mumbai, Sydney, Buenos Aires |

Edit the `SITES` list in `assets/js/site.js` to change cities or status.

## Run locally

Any static server works:

```
python3 -m http.server
```
