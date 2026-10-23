# The Etiquette Atlas

A free, interactive website about everyday manners around the world: how appropriate respondents
in 90 societies judge 15 everyday behaviors (eating, kissing, using a phone…) in 10 situations
(a funeral, a bus, a job interview…). It is built from aggregates of the
[Global Study of Everyday Norms](https://doi.org/10.17605/OSF.IO/SH4RB) and published at
**https://nathan98000.github.io/EtiquetteAtlas/**.

Status: milestone M5 (change since the early 2000s, live but not announced). The etiquette
matrix, the drill-down for each of the 150 behavior–situation pairs, a fingerprint for each of
the 90 societies, the audiences module (each behavior alone, in front of colleagues or
classmates and in front of management or professors) and the change module (26 societies
against a survey from 2000–2003) work, with the society picker, sample and scale toggles,
compare mode and permalinks; the quiz and story arrive in M6. The requirements are in
[`The Etiquette Atlas Software Requirements Specification.md`](<The Etiquette Atlas Software Requirements Specification.md>).

## How it works

An offline Python pipeline downloads the GSN files from OSF, checks them against pinned
checksums, rebuilds the paper's samples and computes aggregates: per-society scores with
bootstrap intervals and empirical-Bayes shrinkage, global means and disagreement, similar
societies, audience effects and change since the early 2000s. Only aggregates that
pass a privacy gate are committed to `data/derived/`: nothing respondent-level, and nothing that
describes fewer than 10 respondents. A static SvelteKit site, deployed to GitHub Pages, reads
those aggregates. There is no server, database or cookie.

```text
pipeline/            Python package and `pipeline` CLI: download, verify, samples, build, scan
data/raw/            OSF downloads (git-ignored, never committed)
data/derived/        committed aggregate outputs
site/                SvelteKit app (static adapter)
tests/               pytest suites for the pipeline (site tests live in site/)
.github/workflows/   ci.yml, deploy.yml, pipeline.yml
docs/                decisions, method-note drafts, kickoff notes and manual setup steps
```

## Setup

You need:

- [uv](https://docs.astral.sh/uv/), which installs the pinned Python (3.14; 3.12 or later works);
- Node.js 26 (the active LTS; Node 24 also works) with npm.

```sh
uv sync                        # Python environment and dev tools
cd site
npm ci                         # site dependencies
npx playwright install chromium  # browser for the end-to-end tests (once)
```

## Running the pipeline

```sh
uv run pipeline download       # fetch the five OSF files into data/raw/ (about 505 MB)
uv run pipeline verify         # check every file's size and MD5 against pipeline/sources.toml
uv run pipeline samples        # rebuild the samples and cross-check them; exits non-zero on mismatch
uv run pipeline build          # verify, estimate, validate and write data/derived/
uv run pipeline privacy-scan   # scan data/derived/ for forbidden fields and counts below 10
```

`download` streams each file, verifies it, skips files that are already verified, and fails
loudly on any mismatch. If OSF publishes a new version of a file, both `download` and `verify`
fail until `pipeline/sources.toml` is reviewed and updated by hand.

`samples` should print:

| Sample | Respondents | Societies |
| --- | --- | --- |
| All data | 25,422 | 90 |
| Paper's sample | 18,656 | 71 |
| Attention check | 15,599 | 80 |
| Complete case (cross-check) | 17,288 | 71 |

`build` runs the whole pipeline in about 15 seconds on a laptop, and stops without touching
`data/derived/` on any failure. In order, it:

1. verifies the files (DR-1) and rebuilds the samples (DR-3);
2. computes every output for all three samples, with 2,000 bootstrap replicates;
3. checks the paper's Table 1 and the §4.6 row counts (NFR-51);
4. validates each table against its schema and runs the privacy scan on a staging folder;
5. replaces the files and prints their sizes against the NFR-1 budget.

Two runs on the same inputs and code give byte-identical files. The formats are described in
[`data/derived/README.md`](data/derived/README.md), the method in
[`docs/method-notes.md`](docs/method-notes.md) and the choices behind it in
[`docs/decisions.md`](docs/decisions.md). Commit regenerated outputs on their own.

Tests and checks:

```sh
uv run pytest                  # unit tests; tests marked needs_raw skip without data/raw/
uv run pytest -m needs_raw     # checks against the real OSF files
uv run ruff check && uv run ruff format --check && uv run mypy
```

## Building the site

From `site/`:

```sh
npm run dev                    # development server at http://localhost:5173/EtiquetteAtlas/
npm run build                  # static site in site/build/
npm run check:build            # checks the build and reports first-load sizes against NFR-1
npm run preview                # serves build/ like GitHub Pages at http://localhost:4173/EtiquetteAtlas/
npm run lint && npm run check && npm run test:unit -- --run
npm run test:e2e               # builds, serves and runs the Playwright tests, axe included
npm run lhci                   # Lighthouse CI on eleven routes under the mobile profile
```

`npm run preview`, `npm run test:e2e` and `npm run lhci` use port 4173; set `PORT` to use
another (`PORT=4392 npm run test:e2e`).

The site lives under the base path `/EtiquetteAtlas`, set in `site/site.config.js`. To serve it
elsewhere, change that line or set `BASE_PATH` (and `SITE_ORIGIN`) when building.

`CHANGE_MODULE=off npm run build` builds the site without the change module: no change pages,
links, sitemap entries, method section, 2000–2003 credit or data (SRS R-6).
`CHANGE_MODULE=off npm run check:build` checks that nothing of it is left. To deploy that way,
set the repository variable `CHANGE_MODULE` to `off` (see [`docs/SETUP.md`](docs/SETUP.md)).

### How the site is put together

- **Routes** (`site/src/routes/`): `/` is a short intro, `/explore` the matrix (a list below
  640 px), `/explore/[behavior]/[situation]` the drill-down for each of the 150 cells,
  `/societies` an index of the 90 societies and `/societies/[society]` each society's
  fingerprint (its difference from the global average in every cell, its most similar
  societies, its facts and a comparison with any other society), `/audiences` small multiples
  of the 15 behaviors by audience and `/audiences/[behavior]` each behavior's slopegraph,
  `/change` the 26 societies in both the 2000–2003 survey and the GSN and `/change/[society]`
  each of them, pair by pair, and `/method` a draft method page. `/story` is a placeholder until
  M6. Every route is prerendered to its own `index.html` with
  its title, description, canonical URL and a one-sentence summary built from All data at build
  time, so it reads without JavaScript.
- **Data** (`site/src/lib/data/`): each file in `data/derived/` is imported with `?url` in
  `files.ts`, so Vite ships it content-hashed, and fetched by `load.ts` only when a view needs it:
  the matrix loads `societies.json` and `global-<sample>.json`, plus `cells-<sample>.json` once a
  society is selected; the drill-down loads `cells-<sample>.json`, and the map's code and
  outlines when the map nears the screen; a fingerprint loads `global-`, `cells-` and
  `similarity-<sample>.json`, and the dumbbell's code only in compare mode; the audiences routes
  load `contexts-<sample>.json` and the change routes `change-<sample>.json` (listed apart in
  `change-files.ts`), and nothing else. Each file is decoded once (`model.ts` checks its shape)
  and kept in memory; a failed load shows a message with a retry.
- **State**: the society, sample, scale, sort, comparison, the drill-down's toggles and the
  audiences' filters live in the query string (`src/lib/state/`), except on a fingerprint or a
  society's change page, whose society is its path (`/societies/chl/`, `/change/jpn/`). Every
  control navigates, so back and forward step through views and any URL can be shared.
- **Charts** (`site/src/lib/charts/`): Svelte components drawing HTML and SVG, with D3 for
  scales and the map projection. The matrix and the fingerprint share one grid component, phone
  list and table; the audiences' panels and focused chart share one slopegraph; compare mode and
  the change routes' arrows share one paired-rows chart. Each chart has a one-sentence summary,
  an "About this chart" link and a "Show as table" view.

### Adding a route

1. Create `site/src/routes/<name>/+page.svelte` and render `<Seo title=… description=… />` for
   its meta tags. Prerendering is on for every route (`+layout.ts`).
2. For text built from the data at build time, add a `+page.server.ts` that reads
   `#lib/server/derived.ts` and returns short strings only. For a route with parameters, export
   `entries` listing every value.
3. In the browser, load data with `new Resource(() => loadX(view.state.sample))` and show
   `LoadError` on failure. Add new data files to `files.ts`; never import JSON in browser code.
4. Link to it with `withView(resolve('<name>/'), view.state, GLOBAL_KEYS)`; add it to the header
   in `Header.svelte` and to `sitemap.xml` if it should be indexed.
5. If it loads data on first view, add it to `ROUTE_DATA` in `scripts/check-build.js` and to the
   routes in `e2e/budget.e2e.ts`, and add it to `lighthouserc.cjs` and `e2e/a11y.e2e.ts` if it is a
   main route.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`. It runs every CI check (`ci.yml`), builds
the site and publishes it to GitHub Pages. The one-time repository settings are listed in
[`docs/SETUP.md`](docs/SETUP.md). `pipeline.yml` is a manual workflow: it downloads the OSF
files, runs `pipeline build` and the raw-data tests, and, if `data/derived/` changed, opens a
pull request that changes only that folder. GitHub does not run CI on pull requests opened by
the workflow's token, so close and reopen that pull request to run CI before merging.

CI (`ci.yml`) runs Ruff, mypy, pytest with coverage and the privacy scan for the pipeline; lint,
type-check, Vitest, the build check (once without the change module, once with it),
Playwright (end-to-end, axe, budgets, redraw times) and Lighthouse CI for the site; and
actionlint for the workflows.

## Changing the quiz items

The quiz (FR-60) arrives in milestone M6, with its three items set in a configuration file. This
section will then say where that file lives and how to change it.

## Licences and credit

Code: [MIT](LICENSE). Third-party software and data, with their licences:
[`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).

Data: Eriksson, K., Strimling, P., Vartanova, I., Simpson, B., et al. (2025). Everyday norms have
become more permissive over time and vary across cultures. *Communications Psychology* 3:145
([doi:10.1038/s44271-025-00324-4](https://doi.org/10.1038/s44271-025-00324-4)). Global Study of
Everyday Norms data on OSF ([doi:10.17605/OSF.IO/SH4RB](https://doi.org/10.17605/OSF.IO/SH4RB)),
licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 2000–2003 comparison data:
Gelfand et al. (2011), *Science* 332:1100–1104. Values on the site are aggregated and modelled by
The Etiquette Atlas.
