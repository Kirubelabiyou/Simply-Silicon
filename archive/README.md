# Earlier versions

Every version of the site built before the current one, kept for reference. Nothing here is linked from the live site.

To view one, run a server from the repository root and open its folder in a browser:

```
python3 -m http.server 8000
```

Then visit, for example, `http://localhost:8000/archive/02-artifact-site/`.

| Folder | What it is |
|---|---|
| `01-original-site/` | The first site from this repository: dark with blue accents. Holds its pages, a Blueprint edition (`blueprint/`) and an audit (`reviews/`). |
| `01-original-site/versions/` | The first redesign round: three versions, A, B and C (`versions/index.html`). |
| `01-original-site/themes/` | The eight theme options for the home page (`themes/index.html` is the picker). Concrete, Ops room and Swiss are full sites. |
| `02-artifact-site/` | The site as built in the Claude Artifact Center. The current site started from this copy. |
| `03-white-version/` | The white, black-and-white version (Concrete and Swiss design). `options/` holds the text-colour and spacing comparisons, and `preview.html` is the whole site in one file. |
| `build-scripts/` | The scripts and stylesheets that turned `02-artifact-site` into the white version and the current black site. |

The current site lives at the repository root.
