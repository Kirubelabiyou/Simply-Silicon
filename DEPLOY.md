# Deploying the Simply Silicon website

This is a finished static website: plain HTML, CSS and JavaScript. There is nothing to install or build, and no server code, database or third-party service.

## Steps

1. Unzip `simply-silicon-site.zip`.
2. Upload everything inside the `simply-silicon-site` folder to the web root of the domain, keeping the folder structure as it is.
3. Open the domain. `index.html` is the home page.

It runs on any static host, such as Netlify, Vercel, Cloudflare Pages, GitHub Pages, Amazon S3 with CloudFront, nginx or Apache. It also works from a subfolder, because every link and file path is relative.

## Optional

- **Page not found:** set `404.html` as the host's "not found" page.
- **Link previews:** two tags in each page's `<head>` point at the old GitHub address:
  - `og:url` and `og:image` currently use `https://kirubelabiyou.github.io/Simply-Silicon/`.
  - Replace that address with the new domain so shared links show the right preview.
- **HTTPS:** turn it on at the host. The site loads nothing from other domains.

## Contents

| Path | What it is |
|---|---|
| `index.html` | Home. Careers is part of it, at `index.html#careers`. |
| `foundation.html`, `workloads.html`, `platform.html` | The other pages. |
| `careers.html` | Redirects to the careers section. |
| `assets/` | Styles, fonts, images, scripts, the 3D model's data and Three.js. |

## Careers list

Open roles are read from `assets/data/positions.json`, which is empty right now (`[]`). To list a role, add an entry in this format:

```json
[{ "title": "Data centre technician", "team": "Operations", "location": "Calgary, Alberta", "type": "Full-time", "description": "…", "open": true, "created": "2026-11-15" }]
```
