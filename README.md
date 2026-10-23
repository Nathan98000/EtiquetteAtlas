# The Etiquette Atlas

A free, interactive website about everyday manners around the world: how appropriate respondents
in 90 societies judge 15 everyday behaviors (eating, kissing, using a phone…) in 10 situations
(a funeral, a bus, a job interview…). It is built from aggregates of the
[Global Study of Everyday Norms](https://doi.org/10.17605/OSF.IO/SH4RB) and published at
**https://nathan98000.github.io/EtiquetteAtlas/**.

Status: milestone M7 (polish, live but not announced; the public launch follows
[`docs/launch.md`](docs/launch.md)). The home page opens with a three-question quiz, and a guided
story walks through the main findings. The etiquette matrix, the drill-down for each of the 150
behavior–situation pairs, a fingerprint for each of the 90 societies, the audiences module (each
behavior alone, in front of colleagues or classmates and in front of management or professors)
and the change module (26 societies against a survey from 2000–2003) work, with the society
picker, sample and scale toggles, compare mode and permalinks. Every page has a share image,
the method page is complete, and pages count visits with cookie-free Cloudflare Web Analytics.
The requirements are in
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
npx playwright install chromium firefox webkit  # browsers for the end-to-end tests (once)
```

Docker (Docker Desktop on a Mac) is needed for the share images and the visual regression
baselines, which are made in the Playwright Linux image CI uses (below).

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
npm run check:build            # checks the build, the share images and first-load sizes (NFR-1, NFR-5)
npm run check:content          # AT-12: no causal wording or nationality nouns in the built text
npm run preview                # serves build/ like GitHub Pages at http://localhost:4173/EtiquetteAtlas/
npm run lint && npm run check && npm run test:unit -- --run
npm run test:e2e               # builds, serves and runs the Playwright tests in five browsers
npm run test:e2e -- --project=chromium  # the full suite in Chromium only, as CI's site job
npm run test:visual            # visual regression, in Docker (test:visual:update for new baselines)
npm run lhci                   # Lighthouse CI on twelve routes under the mobile profile
```

`npm run preview`, `npm run test:e2e` and `npm run lhci` use port 4173; set `PORT` to use
another (`PORT=4392 npm run test:e2e`). The built pages load the Cloudflare analytics beacon;
the tests stub it and Lighthouse CI blocks it, but a page opened from `npm run preview` in an
ordinary browser sends Cloudflare a page view for `localhost`.

### Share images

Every page's meta tags point to a 1200 × 630 share image (FR-82, FR-83): the home page, the
six modules, the 150 cells and the 90 societies have their own; behavior and change society
pages use their module's. The images are not committed. Build them once, and again after
changing the data, `src/cards/` or code they import:

```sh
npm run cards:docker           # in the Playwright Linux image, exactly as CI makes them
npm run cards                  # with your own Chromium, for a quick look (Arial for Liberation Sans)
```

Both build the card pages in `src/cards/` (`CARDS=on vite build`, into `.cards/`), then
`scripts/share-images.js` checks and photographs each one into `share-images/` with a manifest;
`npm run build` publishes them under `build/share/`. Without them `check:build` fails, and it
warns when they are older than their inputs. To change a card, edit `src/cards/cards.ts` (the
words and numbers) or the components in `src/cards/` (the layout), run `npm run cards:docker`
and look at the PNGs in `share-images/`. CI rebuilds them only when those inputs change.

The site lives under the base path `/EtiquetteAtlas`, set in `site/site.config.js`. To serve it
elsewhere, change that line or set `BASE_PATH` (and `SITE_ORIGIN`) when building.

`CHANGE_MODULE=off npm run build` builds the site without the change module: no change pages,
links, sitemap entries, method section, 2000–2003 credit or data (SRS R-6).
`CHANGE_MODULE=off npm run check:build` checks that nothing of it is left. To deploy that way,
set the repository variable `CHANGE_MODULE` to `off` (see [`docs/SETUP.md`](docs/SETUP.md)).

### How the site is put together

- **Routes** (`site/src/routes/`): `/` opens with the quiz, `/story` is the guided story,
  `/explore` the matrix (a list below
  640 px), `/explore/[behavior]/[situation]` the drill-down for each of the 150 cells,
  `/societies` an index of the 90 societies and `/societies/[society]` each society's
  fingerprint (its difference from the global average in every cell, its most similar
  societies, its facts and a comparison with any other society), `/audiences` small multiples
  of the 15 behaviors by audience and `/audiences/[behavior]` each behavior's slopegraph,
  `/change` the 26 societies in both the 2000–2003 survey and the GSN and `/change/[society]`
  each of them, pair by pair, and `/method` the method, its limits, privacy, versions and every
  society's facts. Every route is prerendered to its own `index.html` with its title,
  description, canonical URL, share image and a one-sentence summary built from All data at
  build time, so it reads without JavaScript.
- **Data** (`site/src/lib/data/`): each file in `data/derived/` is imported with `?url` in
  `files.ts`, so Vite ships it content-hashed, and fetched by `load.ts` only when a view needs it:
  the matrix loads `societies.json` and `global-<sample>.json`, plus `cells-<sample>.json` once a
  society is selected; the drill-down loads `cells-<sample>.json`, and the map's code and
  outlines when the map nears the screen; a fingerprint loads `global-`, `cells-` and
  `similarity-<sample>.json`, and the dumbbell's code only in compare mode; the audiences routes
  load `contexts-<sample>.json` and the change routes `change-<sample>.json` (listed apart in
  `change-files.ts`). The quiz loads `global-` and `cells-<sample>.json` once the reader turns to
  a question and `distributions-<sample>.json` once a society is chosen; the story loads each
  step's file as the step nears the screen. Each file is decoded once (`model.ts` checks its shape)
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
   its meta tags. Prerendering is on for every route (`+layout.ts`). Give it a share image in
   `shareCard()` (`src/lib/share.ts`): its module's, or a card of its own in `src/cards/cards.ts`.
2. For text built from the data at build time, add a `+page.server.ts` that reads
   `#lib/server/derived.ts` and returns short strings only. For a route with parameters, export
   `entries` listing every value.
3. In the browser, load data with
   `new Resource(() => (view.ready ? loadX(view.state.sample) : undefined))`, which waits for the
   URL's sample, and show `LoadError` on failure. Add new data files to `files.ts`; never import JSON in browser code.
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

CI (`ci.yml`) runs Ruff, mypy, pytest with coverage, the privacy scan and `uv audit` for the
pipeline; builds the share images in the Playwright Linux image when their inputs changed; runs
`npm audit` for production dependencies, lint, type-check, Vitest, the build check (once without
the change module, once with it), the content review, Playwright in Chromium (end-to-end, axe,
budgets, redraw times, share images, analytics) and Lighthouse CI for the site; the smoke tests
in Firefox, WebKit, an iPhone and a Pixel; visual regression; and actionlint for the workflows.
Dependabot opens weekly update pull requests.

After a push, check the deployed site (AT-9, AT-10 and the launch checklist):

```sh
npm run test:deployed          # analytics beacon live: only its two hosts, no cookies or storage
npm run check:deployed         # every file fetched from GitHub Pages: total size, largest file
LHCI_DEPLOYED=1 npm run lhci   # Lighthouse on the deployed URL, beacon included
```

## Changing the quiz items

The quiz's three items (FR-60) are set in
[`site/src/lib/quiz/items.ts`](site/src/lib/quiz/items.ts), asked in the order listed. Each item
is a behavior and a situation, by the IDs in SRS §4.2 (also in `site/src/lib/data/grid.ts`):

```ts
export const QUIZ_ITEMS: readonly QuizItem[] = [
	{ behavior: 'eat', situation: 'restaurant' },
	{ behavior: 'sing', situation: 'funeral' },
	{ behavior: 'listen', situation: 'library' }
];
```

To change one, edit its IDs and run `npm run test:unit -- --run` from `site/`: the tests refuse
anything but three different cells, and check that each item has estimates and response counts
for most societies in every sample. The question's wording ("How appropriate is it to eat in a
restaurant?") is built from the item's behavior and situation, so nothing else needs editing.
Then update the expected texts in `site/e2e/quiz.e2e.ts`, which name the current items, and
run `npm run test:e2e`.

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
