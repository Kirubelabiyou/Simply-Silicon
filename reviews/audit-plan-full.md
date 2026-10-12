# Full Spectrum Audit: Simply Silicon website

**Date**: 2026-10-12
**Mode**: Repo Health (static marketing site)
**Source**: `main` working tree: `index.html`, `foundation.html`, `workloads.html`, `platform.html`, `assets/css/site.css`, `assets/js/*.js`
**Lenses Run**: 8/10, plus the web-animation and frontend-design lenses folded into Design Engineer
**Lenses Skipped**: Backend Engineer (no server or Rust code: the site is static HTML, CSS and JS), DX Engineer (not a developer tool)

Method: every page was loaded in a headless browser at 1440 px and 390 px and checked automatically for heading order, image alt text, form labels, tap target size, colour contrast of every text node, console errors and failed requests. The source files were then reviewed by hand.

---

## Master Verdict: APPROVE WITH CHANGES

The site is structurally sound, loads with no errors or broken requests, and respects reduced motion. The audit found three accessibility failures, missing sharing metadata and some motion and code hygiene issues. All of these were fixed in this pass. One launch blocker remains, and only the owner can resolve it: the contact form has no destination email, so every "Request access" ends in "copy your message and send it on LinkedIn".

## Verdict by Lens

| # | Lens | Verdict | Critical | Recommendations |
|---|------|---------|----------|-----------------|
| 1 | Design Engineer (+ animation, frontend-design) | Approve with changes | 0 | 4 (3 fixed) |
| 2 | UX Engineer | Approve with changes | 1 | 2 (1 fixed) |
| 3 | Frontend Engineer | Approve with changes | 0 | 2 (1 partly fixed) |
| 4 | Backend Engineer | Skipped | – | – |
| 5 | Structural Engineer | Approve | 0 | 1 |
| 6 | Repo Maintainer | Approve with changes | 0 | 3 (1 fixed) |
| 7 | Production Readiness | Approve with changes | 1 (same as UX) | 4 (2 fixed) |
| 8 | DX Engineer | Skipped | – | – |
| 9 | Performance Engineer | Approve | 0 | 2 |
| 10 | Accessibility Engineer | Approve with changes | 3 (all fixed) | 1 |

## All Critical Issues (Must Fix)

| # | Issue | Lens(es) | File(s) | Impact | Fix | Status |
|---|-------|----------|---------|--------|-----|--------|
| 1 | Contact form has no destination. `CONTACT_EMAIL` is empty, so "Request access" ends in copy and paste to LinkedIn | UX, Production | `assets/js/common.js` | Leads drop off at the main call to action | Set `CONTACT_EMAIL` to the company inbox, or connect a form service | **Open: needs the address** |
| 2 | Small grey text on dark backgrounds failed WCAG AA (about 4.1:1, needs 4.5:1). This covered labels, captions, footer links and figure text | Accessibility, Design | `site.css` (`--text-3`) | Hard to read for many visitors and fails AA | `--text-3` raised from `#71717a` to `#8a8a94` (about 5.5:1), including the dark figure panels | Fixed |
| 3 | No skip link. Keyboard users had to tab through the whole header on every page | Accessibility | `common.js` | Slow keyboard navigation | "Skip to content" link added, visible on focus | Fixed |
| 4 | Heading order skipped from h2 to h4 in the footer on every page, and footer links were under 24 px tall | Accessibility | `common.js`, `site.css` | Screen reader outline broken, small tap targets | Footer headings changed to h3, links given at least 24 px of height | Fixed |

## Cross-Cutting Concerns

| Concern | Flagged By | Root Cause | Unified Fix |
|---------|-----------|------------|-------------|
| Stylesheet built from 12 stacked override layers (V10 to V13.1, about 88 KB) | Frontend, Repo Maintainer, Design | Many rounds of iteration appended overrides instead of editing the base rules | Removed 42 lines of dead rules now. Next: fold each override back into its base rule and drop the version layers |
| Call to action wording differed: header said "Connect", page buttons said "Request access" | UX, Design | Header predates the new copy | Header button now says "Request access" and opens the form with that topic | 
| Concept site behaviour versus a real launch | Production, Repo Maintainer | noindex, the experiments in `tools/`, and a careers editor that only works in the claude.ai preview | Before launch, remove noindex, move `tools/` to a branch, and choose a jobs backend |

## All Recommendations

| # | Recommendation | Lens | File(s) | Fix | Status |
|---|---------------|------|---------|-----|--------|
| 1 | Add a favicon and social sharing tags (Open Graph, Twitter card) | Production, Design | all pages | SVG favicon, a 1200×630 preview image and tags added | Fixed |
| 2 | Add a 404 page for GitHub Pages | Production, UX | `404.html` | Branded page with links home | Fixed |
| 3 | Shorten motion. Reveals took 1.4 s and moved 28 px, hovers took 0.5 to 0.6 s | Design (animation) | `site.css` | Reveals now 0.9 s and 16 px, hovers 0.2 s with ease-out, no lift on touch screens | Fixed |
| 4 | Remove dead code: map strip script and unused styles (essay, pair, checklist, statline, eyebrow) | Repo Maintainer | `home.js`, `site.css` | Removed | Fixed |
| 5 | Consolidate the CSS override layers | Frontend, Repo Maintainer | `site.css` | One refactor pass, no visual change | Open |
| 6 | Lazy-load `map-data.js` (238 KB) only when the map nears the screen | Performance | `platform.html`, `network.js` | IntersectionObserver loader, like the home 3D loop | Open |
| 7 | Move `tools/` (hero experiments) off `main`, since GitHub Pages serves it publicly | Repo Maintainer | `tools/` | Keep it on a `lab` branch | Open |
| 8 | At launch, remove `noindex` and point `og:url` to the real domain | Production | all pages | Edit 5 meta tags | Open (intentional for now) |

---

# Lens Reports

---

## 1. Design Engineer

**Verdict**: APPROVE WITH CHANGES

**Files reviewed**: all four pages and `site.css`.

**Design system compliance**
- Tokens are consistent: one accent (`#4db2ef` on dark, `#1673b8` on light), one display face (Archivo), one body face (Instrument Sans) and the Quicksand logo. Light sections redefine tokens correctly, and dark panels inside light sections redefine them back.
- Each layout pattern is now used once: comparison table, step timeline, icon tiles, service cards, workloads list, statement paragraph, story with margin labels, facing panels, toolkit list, numbers band. This matches the owner's rule of one style per idea.
- The closing band is the one repeated pattern, and it is intentional.

**Visual state coverage**

| Element | Default | Hover | Focus | Active | Reduced motion |
|---|---|---|---|---|---|
| Buttons | yes | yes | yes (accent outline) | – | yes |
| Tiles, cards | yes | yes (lift, border) | n/a (not links) | – | yes |
| Links | yes | yes | yes | – | yes |
| Hero drawing | yes | – | – | – | yes (drawn instantly, fans paused) |

**Animation (web-animation lens)**
- Reveal and hero entrance motion was long for a marketing page: 1.4 to 1.6 s with a 28 px travel. It is now 0.9 to 1 s with 16 px travel, using the existing ease-out curve.
- Hover transitions were 0.5 to 0.6 s, which feels sluggish. They are now 0.2 s with ease-out. Tile lift is disabled on touch screens, where hover sticks.
- Continuous motion is limited to the roof fans (SMIL rotation, paused under reduced motion) and the investor strip, which pauses on hover and is draggable. No flashing.

**Frontend-design lens**: the hero, the blueprint drawing and the editorial type give the site a distinctive look. Recommendation: keep the remaining sections editorial and resist adding more boxed card patterns.

**Verdict details**: token fidelity good, state coverage good, contrast fixed, animation fixed, consistency good.

---

## 2. UX Engineer

**Verdict**: APPROVE WITH CHANGES

**User journey map**
1. A visitor lands on Home and reads the one-sentence pitch.
2. They see the comparison with public AI clouds, the two services, how it works and who it is for, with Foundation as proof.
3. They press **Request access**. The form opens with the topic already chosen.
4. They submit, and are asked to copy the message and send it on LinkedIn. **This is the break in the journey**, because there is no inbox to send it to. This is critical issue 1.

**Issues**
- Critical: the contact destination (see above).
- Fixed: the header said "Connect" while every page said "Request access". It is now consistent.
- Fixed: there was no 404 page, so a mistyped link showed GitHub's default page.

**Interaction consistency**: all calls to action open the same form, buttons share a style, and the PDF link opens in a new tab on the live site.

---

## 3. Frontend Engineer

**Verdict**: APPROVE WITH CHANGES

**Render path**: static HTML, with the header and footer injected by `common.js`. Reveals use one IntersectionObserver. Scroll handlers are passive and throttled with requestAnimationFrame. The home 3D loop loads only within 600 px of the viewport.

**Issues**
- `site.css` has 12 appended override layers. Later rules depend on cascade order, so editing a base rule can be silently overridden. 42 lines of dead rules were removed. The full consolidation is open.
- The dead `mapStrip` block in `home.js` was removed.

**Type safety**: not applicable (vanilla JS). All four scripts parse cleanly, and no page logs runtime errors.

---

## 4. Backend Engineer

**Skipped**: the site has no server code. It is static files on GitHub Pages.

---

## 5. Structural Engineer

**Verdict**: APPROVE

**Dependency map**
- `common.js` is shared by every page: header, footer, contact form, reveals, pinned steps, header height measurement and the PDF fallback.
- `home.js`: hero drawing, figures, investor strip, 3D loop loader.
- `careers.js`: jobs list and editor.
- `network.js` with `map-data.js`: the Platform map.
- `scene.js`: the 3D model, loaded as a module.

Boundaries are clean and each page loads only what it needs. Recommendation: Platform-only logic in `common.js` (pinned steps) could move to `network.js`, but the guard clauses make this harmless.

---

## 6. Repo Maintainer

**Verdict**: APPROVE WITH CHANGES

**Convention checklist**
- Commits are descriptive and attributed.
- Generated output (`tools/*/out/`) and caches are git-ignored.
- `tools/` holds hero experiments and is published by GitHub Pages. It should move to a branch before launch.
- CSS layering, as covered under Frontend.

**Reuse**: the button, section intro and closing band styles are shared correctly across pages.

---

## 7. Production Readiness

**Verdict**: APPROVE WITH CHANGES (one open blocker)

**Failure mode analysis**

| Scenario | Behaviour |
|---|---|
| WebGL unavailable | Poster image stays in place |
| JS disabled | Content readable; reveals show (no-js rule); header and footer missing |
| Contact submit | Prepares text; no email destination (**blocker**) |
| Careers on the live site | Shows "no open positions"; the editor only works in the claude.ai preview |
| Missing page | New branded 404 |
| Shared link preview | New preview image and title |

**Environment checklist**: noindex is on, which is intentional for a concept. `og:url` points to GitHub Pages. Fonts are self-hosted. There are no third-party scripts.

---

## 8. DX Engineer

**Skipped**: this is a marketing site, not a developer tool.

---

## 9. Performance Engineer

**Verdict**: APPROVE

**Resource budget**

| Page | Requests | Heaviest assets |
|---|---|---|
| Home | 23 | Three.js, about 670 KB, lazy, only near the 3D card |
| Foundation | 15 | Three.js and scene.js, which is the page's purpose |
| Workloads | 6 | none |
| Platform | 17 | map-data.js, 238 KB |

**Hot paths**: one scroll listener per page (passive and throttled), one IntersectionObserver for reveals, and the 3D render loop pauses off screen. Recommendation: lazy-load `map-data.js`.

---

## 10. Accessibility Engineer

**Verdict**: APPROVE WITH CHANGES (all critical items fixed)

**Keyboard walkthrough**: **Skip to content** is now the first tab stop. It is followed by the logo, the navigation, Request access, the page content and the footer. The contact dialog closes on Escape and returns focus.

**Checklist**

| Check | Before | After |
|---|---|---|
| One h1 per visible page, no heading level skips | footer jumped h2→h4 | fixed |
| Images have alt text | pass | pass |
| SVG figures labelled or hidden | pass | pass |
| Form fields labelled | pass | pass |
| Tap targets at least 24 px | footer links failed | fixed |
| Text contrast at least 4.5:1 | 18 to 22 failures per page | 0 real failures |
| Skip link | missing | added |
| Reduced motion | pass | pass |

Remaining checker warnings are false positives. The Platform "Internet" panel and the 3D "Online" chip sit on semi-transparent backgrounds that the checker treated as solid. They were verified visually.
