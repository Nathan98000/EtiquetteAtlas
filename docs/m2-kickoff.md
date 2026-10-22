# Kickoff: The Etiquette Atlas, Milestone M2 (core explorer, live but not announced)

You are continuing work on **The Etiquette Atlas**, a free, static site built from aggregates of the
Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. This
session covers **Milestone M2**. Its exit criteria (SRS §10) are: the Must items of FR-1 to FR-27
and FR-80 to FR-87 pass, with the scope changes in §3 below, and so do AT-1, AT-2 and AT-11. The
core explorer then goes live at https://nathan98000.github.io/EtiquetteAtlas/ without
announcement, so every later module ships onto a working site.

## 1. Read first, in this order

1. `CLAUDE.md`: rules, layout, commands and conventions. Follow it throughout.
2. `The Etiquette Atlas Software Requirements Specification.md`, the source of truth:
   - §5.1–§5.3 and §5.9 in full: the requirements M2 delivers;
   - §6 in full: routes, layout, interaction, visual design, language;
   - §7.1–§7.3, §8.3 and §9: budgets, accessibility, compatibility, hosting, and AT-1, AT-2,
     AT-11;
   - §2.4 and §4.4, §4.8: environment, societies and samples, caveats.
3. `data/derived/README.md`: the data contract. Every number the site shows comes from these
   files, in the layout described there.
4. `docs/decisions.md` (decisions 1–23, cited in code as "decision N") and
   `docs/method-notes.md` (plain-language method drafts).
5. The site as M0 left it: `site/site.config.js`, `site/vite.config.ts` (SvelteKit config and
   CSP), `site/src/routes/`, `site/src/lib/`, `site/scripts/check-build.js`,
   `site/scripts/serve-pages.js`, `site/e2e/smoke.e2e.ts` and `site/playwright.config.ts`.

You should not need `docs/reference/gsn-data-profile.md` or the raw files. If you do, the M1
rules in CLAUDE.md still apply.

## 2. What M1 left you

- `uv run pipeline build` regenerates `data/derived/` in about 15 seconds. It is byte-identical
  across runs and stops on any failed check. The files are committed. Don't edit them by hand,
  and don't change the pipeline unless the site needs a field it lacks. If it does, say so first.
- 20 files: per sample (`all`, `paper`, `attention`), `cells`, `distributions`, `global`,
  `similarity`, `contexts` and `change`; plus the shared `societies.json` and `manifest.json`.
- Measured gzip sizes, All data:

  | File | gzip |
  | --- | --- |
  | `societies.json` | 3 KB |
  | `global-all.json` | 3 KB |
  | `cells-all.json` | 113 KB |
  | `distributions-all.json` | 90 KB |
  | `contexts-all.json` | 41 KB |
  | `change-all.json` | 37 KB |

  The matrix plus drill-down need 119 KB before map outlines, against NFR-1's 300 KB for data.
- Conventions to build on:
  - **Layout.** Tables are columnar and the grids are dense and society-major (row
    `i` → society `i // 150`, cell `i % 150`, cells behavior-major in SRS order).
  - **Intervals** are offsets from their estimate (`mean_minus`, `mean_plus`, `shrunk_pm`).
  - **Status codes:** 0 ok, 1 small sample, 2 too few responses, 3 not asked. Every value is
    null in rows below 10 respondents.
  - **Centered scale** (FR-5): the estimate minus its society's `offset` (raw) or
    `offset_shrunk`.
  - **`notable`** is −1, 0 or +1 against the global mean (the FR-31 test).
  - **Societies:** names come from `societies.json`; region is the authors' four-way grouping.
- The site is a placeholder: a home page, the attribution footer (NFR-40), a custom 404, a CSP
  in a meta tag, the `/EtiquetteAtlas` base path and every route prerendered. CI runs on pull
  requests and before every deploy.
- The SRS edits recommended in M0 and M1 are not applied. Follow the SRS as written, as amended
  by `docs/decisions.md`, unless I say otherwise.
- **Local quirk:** another project's preview server sometimes holds port 4173 on this machine,
  and Playwright then reuses it and times out. `scripts/serve-pages.js` honours `PORT`. Make the
  Playwright port configurable the same way rather than stopping that server.

## 3. Already decided

- **Share images (FR-82, FR-83).** Every prerendered route gets its own title, description and
  canonical URL in M2. Share-image meta tags may point at a placeholder image or be left out,
  and this is recorded as a known gap. The prebuilt images themselves move to M7, as in §10.
- **Home route (FR-1).** In M2, `/` is a short static intro: the title, a one-line promise and a
  prominent "Skip to the atlas" link to `/explore`. M6 replaces it with the quiz entry. Record
  this partial FR-1 as a decision.
- **Analytics (FR-90 to FR-92).** Not in M2. Keep the CSP closed to third parties. The beacon
  arrives after I finish the hostname check in `docs/SETUP.md`.
- **Dependencies you may add without asking:**
  - D3 modules: `d3-scale`, `d3-shape`, `d3-axis`, `d3-geo`, `d3-force`, plus the small helpers
    they need, such as `d3-array` and `d3-selection`;
  - `topojson-client`, and `world-atlas` for the Natural Earth 1:110m outlines;
  - `@axe-core/playwright` and `@lhci/cli`;
  - `pytest-cov`, as a Python dev dependency.

  Pin them in the lockfiles and add each to the third-party licence list (NFR-42). Ask before
  any other dependency.

## 4. Non-negotiable rules (also in CLAUDE.md)

- **Static site only:** no server, database, serverless function, cookie or paid service (C-2,
  C-11). Apart from what M2 itself ships, the browser fetches nothing from any third party
  (NFR-31).
- **Hashed assets:** data, JS and CSS ship content-hashed (HR-3). Import data and map files
  through Vite; never put them in `static/` and never inline the data into the JS bundles.
- **Base path:** internal links use `resolve()` from `$app/paths`; off-site links carry
  `rel="external"`. Every route works under `/EtiquetteAtlas`.
- **Nothing below 10 respondents is shown** (DR-9). Show status 2 as "too few responses" and
  status 3 as "not asked" (FR-27). Never plot or rank either.
- **Wording:** "respondents in Chile", not "Chileans", and no causal wording (FR-73, §6.5). Use
  the GSN response labels wherever possible.
- **Commits and settings:** commit locally in small commits with clear messages. Ask before any
  push, before changing a GitHub setting, and before adding a dependency not listed in §3.
- Cite requirement IDs in comments and test names where code implements them (§9.3).

## 5. Start with a plan, then wait

Before writing code, reply with:

- a short plan mapped to the exit criteria in §7 below, in the order you would build it;
- your recommendation on each open decision in the table below, plus any I've missed;
- the route, component and data-loading architecture. Name which files each route loads, and
  when.
- the first-load budget per route: JS and CSS against 200 KB, data against 300 KB (NFR-1),
  with estimates for D3 and the map outlines;
- a short design note:
  - the diverging and region palettes, with contrast checks for marks (3:1) and text (4.5:1)
    in light and dark themes (NFR-12);
  - the type scale;
  - the layout at the three breakpoints of §6.2;
  - how the matrix encodes disagreement without relying on colour (FR-11).

Then wait for my go-ahead.

| # | Open decision | Proposed default (confirm or change) |
| --- | --- | --- |
| 1 | Data delivery | Fetch content-hashed JSON from `?url` imports, cached in memory per sample. Load `distributions`, `contexts`, `change` and the map only when a view needs them (NFR-3). |
| 2 | Prerendered text (FR-83, FR-87) | Prerender `/`, `/explore` and all 150 cell routes with a one-sentence text summary built from `data/derived/` at build time. Charts render client-side. Keep each page's HTML small: no serialized datasets. |
| 3 | Header links to modules built later (FR-2) | Short prerendered "coming soon" pages for Societies, Audiences, Change and Story, so no link 404s. Leave them out of any sitemap. |
| 4 | Method links (FR-7) | A `/method` stub with anchored sections drafted from `docs/method-notes.md` and marked as a draft. FR-70 completes it in M7. |
| 5 | URL state (FR-80) | `society` as lowercase ISO3 (`?society=chl`); `sample=paper` or `sample=attention` (All data omitted); `scale=centered`; `sort=…`. Beyond §6.1's list, add `estimate=raw` and `uncertainty=on` for the drill-down toggles. Invalid values fall back silently. |
| 6 | Society–cell estimate shown | Shrunken by default, with a raw toggle (FR-22), in the drill-down and the FR-15 marks. Small-sample cells carry a visible flag in both. |
| 7 | Stricter, looser or close (FR-15) | Use the published `notable` flag, the same test as FR-31. |
| 8 | Rank (FR-25) | Rank among the societies shown for the current sample, estimate and scale; ties share a rank ("tied 12th most accepting of 87"). |
| 9 | Matrix encodings (FR-10, FR-11, §6.4) | A colour-blind-safe diverging fill centred at 0 (blue for appropriate, orange for inappropriate). Disagreement as circle area, with the CI on hover or focus. Under the centered scale, use the `centered_*` fields. |
| 10 | Beeswarm and map (FR-20, FR-24) | A deterministic d3-force layout (fixed iterations, stable order) so screenshots are stable. Map: Equal Earth projection, GSN coordinates, region shown by shape as well as colour. Linked hover and focus both ways. |
| 11 | Should items in M2 | In scope: FR-5, FR-7 (via the stub), FR-15, FR-16, FR-26, FR-87; measure NFR-4. FR-33 and the other module Shoulds wait for their milestones. |
| 12 | Tests and CI | Playwright tests for AT-1, AT-2 and AT-11, a keyboard-only path through matrix and drill-down, and axe with zero serious or critical findings. Lighthouse CI on five representative routes. Data and size budgets in `check-build.js`. Visual regression at 360, 800 and 1280 px in light and dark, added once the design settles. Python coverage of estimator modules enforced at 80% with `pytest-cov`. |

## 6. Work for this session

1. **Data layer.** Typed loaders and decoders for each `data/derived/` file, with the dense-grid
   indexing, offsets-to-interval helpers, status handling and centered values. Cover them with
   Vitest tests on small fixtures. A failed load shows a plain message with a retry control
   (FR-86).
2. **App shell (FR-1 to FR-7).** The intro home page and the header with module links. A society
   picker: an accessible combobox with type-ahead and full keyboard use, kept in the URL. The
   sample toggle with its badge for non-default samples, the scale toggle and the theme switch.
   The theme follows the system with a manual override stored in localStorage only (NFR-30).
   Keep the attribution footer on every page.
3. **Etiquette matrix, `/explore` (FR-10 to FR-17).** Mean and disagreement marks; sorting by
   paper order, mean, disagreement and name; and tooltips that show on hover and focus (FR-13).
   Enter opens the drill-down. Mark the selected society's stricter or looser cells. Label the
   most universal and most culture-dependent cells. Below 640 px, a sortable list of the 150
   cells.
4. **Cell drill-down, `/explore/[behavior]/[situation]` (FR-20 to FR-27).** URL slugs use
   hyphens, as in §4.2.
   - A beeswarm with intervals on hover and as whiskers when "Show uncertainty" is on, coloured
     by region, with n in the tooltip.
   - The raw and shrunken toggle, with small-sample flags.
   - The global mean as a line and the disagreement interval as a band.
   - A dot map linked with the beeswarm both ways, and the selected society's rank.
   - A strip of the behavior across situations, with previous and next controls.
   - "Too few responses" and "not asked" listed, not plotted.
5. **URLs and navigation (FR-80 to FR-87).** View state round-trips through the URL. Copy link.
   Per-route title, description and canonical URL. Back and forward move between states, the
   404 links home, and every route has its no-JavaScript summary. Redirects, if any, are
   client-side (HR-5).
6. **Accessibility and performance.** Every chart has a one-sentence summary and a "Show as
   table" control (NFR-11). Keyboard alone works everywhere (NFR-13), the pages hold up at 200%
   zoom and respect reduced motion (NFR-14), and nothing scrolls horizontally from 320 px
   (NFR-21). Meet NFR-1 and NFR-2 on the M2 routes, and redraws within NFR-4's targets.
7. **CI and housekeeping.**
   - Extend `ci.yml` with Lighthouse CI, axe, the size budgets and Python coverage. Pin any new
     third-party action by commit.
   - Make the Playwright port configurable.
   - Add the third-party licence list (NFR-42).
   - Keep `check-build.js` passing, and extend it to cover the new routes.
8. **Docs.** Update `CLAUDE.md` and the README (site structure, data loading, how to add a
   route). Append new decisions to `docs/decisions.md` from 24 onward.

## 7. Done when (M2 exit, SRS §10)

- [ ] The Must items of FR-1 to FR-27 and FR-80 to FR-87 pass, except where §3 changes their
  scope (the FR-1 intro page, FR-82 images in M7). Each exception is recorded in
  `docs/decisions.md`.
- [ ] AT-1, AT-2 and AT-11 pass as automated Playwright tests.
- [ ] axe reports zero serious or critical issues on `/`, `/explore` and a cell route, and a
  keyboard-only user can reach and use the matrix and the drill-down.
- [ ] NFR-1 and NFR-2 hold on the M2 routes, measured by Lighthouse CI and `check-build.js`, and
  the sizes are reported against the budgets.
- [ ] CI is green locally: the site checks (lint, type-check, Vitest, build, check:build,
  Playwright), actionlint, and Ruff, mypy, pytest with coverage and the privacy scan for the
  pipeline.
- [ ] The deploy is ready. Ask me before pushing; a push to `main` deploys.

End the session with:
- what was done;
- the decisions taken;
- known gaps against FR-1 to FR-27 and FR-80 to FR-87;
- what's next for M3 (society fingerprint: FR-30 to FR-34);
- any SRS changes you'd recommend.

## 8. Out of scope for now

- The society fingerprint (M3), "Who's watching?" (M4), the change module (M5), and the quiz
  and story (M6). The society picker and its URL state are in scope because every view uses
  them.
- Share images (M7) and analytics (after the hostname check).
- Changes to the pipeline or to `data/derived/` beyond a field the site turns out to need. Ask
  first.
- Any push or GitHub setting change without my OK.
