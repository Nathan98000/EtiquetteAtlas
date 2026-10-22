# The Etiquette Atlas

A free, interactive website about everyday manners around the world: how appropriate respondents
in 90 societies judge 15 everyday behaviors (eating, kissing, using a phone…) in 10 situations
(a funeral, a bus, a job interview…). It is built from aggregates of the
[Global Study of Everyday Norms](https://doi.org/10.17605/OSF.IO/SH4RB) and published at
**https://nathan98000.github.io/EtiquetteAtlas/**.

Status: milestone M1 (pipeline and privacy gate). The pipeline produces every aggregate the site
needs, in `data/derived/`; the site is still a placeholder until the explorer arrives in M2. The requirements are in
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
npm run check:build            # checks the build: 404 page, hashing, CSP, attribution, sizes
npm run preview                # serves build/ like GitHub Pages at http://localhost:4173/EtiquetteAtlas/
npm run lint && npm run check && npm run test:unit -- --run
npm run test:e2e               # builds, serves and runs the Playwright tests
```

The site lives under the base path `/EtiquetteAtlas`, set in `site/site.config.js`. To serve it
elsewhere, change that line or set `BASE_PATH` (and `SITE_ORIGIN`) when building.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`. It runs every CI check (`ci.yml`), builds
the site and publishes it to GitHub Pages. The one-time repository settings are listed in
[`docs/SETUP.md`](docs/SETUP.md). `pipeline.yml` is a manual workflow: it downloads the OSF
files, runs `pipeline build` and the raw-data tests, and, if `data/derived/` changed, opens a
pull request that changes only that folder. GitHub does not run CI on pull requests opened by
the workflow's token, so close and reopen that pull request to run CI before merging.

## Changing the quiz items

The quiz (FR-60) arrives in milestone M6, with its three items set in a configuration file. This
section will then say where that file lives and how to change it.

## Licences and credit

Code: [MIT](LICENSE).

Data: Eriksson, K., Strimling, P., Vartanova, I., Simpson, B., et al. (2025). Everyday norms have
become more permissive over time and vary across cultures. *Communications Psychology* 3:145
([doi:10.1038/s44271-025-00324-4](https://doi.org/10.1038/s44271-025-00324-4)). Global Study of
Everyday Norms data on OSF ([doi:10.17605/OSF.IO/SH4RB](https://doi.org/10.17605/OSF.IO/SH4RB)),
licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 2000–2003 comparison data:
Gelfand et al. (2011), *Science* 332:1100–1104. Values on the site are aggregated and modelled by
The Etiquette Atlas.
