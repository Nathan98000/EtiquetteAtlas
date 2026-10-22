# The Etiquette Atlas

A free, static, interactive site showing how appropriate 15 everyday behaviors are judged in 10
situations across 90 societies, built from aggregates of the Global Study of Everyday Norms (GSN,
OSF sh4rb, CC BY 4.0). One maintainer; Claude pairs.

- Source of truth: `The Etiquette Atlas Software Requirements Specification.md`. Requirement IDs
  (FR-, NFR-, DR-, HR-, C-, AT-) and the milestones (§10) come from it.
- Column-level data notes: `docs/reference/gsn-data-profile.md`. It is local only (git-ignored)
  because it quotes respondent-level values: never commit it or copy values out of it.
- Briefs: `docs/claude-code-kickoff.md` (M0), `docs/m1-kickoff.md` (M1). Manual GitHub and
  analytics steps: `docs/SETUP.md`.
- Decisions where the SRS was open: `docs/decisions.md` (cited in code as "decision N").
  Method-page drafts: `docs/method-notes.md`. Output formats: `data/derived/README.md`.

## Non-negotiable rules

- No raw or respondent-level data in git, logs or chat. OSF downloads live in `data/raw/`
  (git-ignored). Never commit, print or paste `ResponseId`, `StartDate`, `EndDate`,
  `Duration__in_seconds_`, `Progress`, `belief_god_orig`, `site`, `country_carib`, exact `age`
  (or `age_sc`), or any row of `everyday-norms-2011-clean.csv` (DR-16, C-5, C-6).
- Look at raw data only through counts and aggregates: no `SELECT *`, `head` or row samples.
  Raw-data tests assert on counts, never on collections of IDs or rows. Pytest runs with
  `--tb=short` because long tracebacks print function arguments; never use `-l`/`--showlocals`
  with raw data. Errors from raw reads go through `raw.scrub()`.
- Nothing describing fewer than 10 respondents is published (DR-9). Everything in
  `data/derived/` must pass `uv run pipeline privacy-scan`.
- Static site only: no server, database, serverless function, cookies or paid service (C-2,
  C-11). Quiz answers never leave the browser (C-12).
- Commit locally in small commits with clear messages. Ask before any push, before changing a
  GitHub setting, and before adding a major dependency.
- Cite requirement IDs in comments and test names where code implements them (§9.3).

## Layout

- `pipeline/`: Python package and `pipeline` CLI.
  - Inputs: `sources.toml` pins the OSF files; `sources.py` downloads and verifies; `raw.py`
    loads CSVs with DuckDB; `samples.py` rebuilds the samples.
  - Reviewed reference data: `societies.toml` (display names, Kosovo's position, language
    names) and `published.toml` (the paper's values for NFR-51), read by `reference.py`.
  - Estimators, one module each: `ratings.py` (one sample's ratings as integer arrays),
    `cells.py` (DR-4, DR-9, DR-11), `bootstrap.py` (DR-5), `estimates.py` (DR-6 to DR-8,
    DR-10, FR-31), `similarity.py` (DR-14), `contexts.py` (DR-12), `change.py` (DR-13),
    `metadata.py` (DR-15).
  - Output: `export.py` (JSON documents), `schemas.py` (pandera), `validate.py` (NFR-51,
    §4.6 counts), `build.py` (`pipeline build`); `privacy.py` is the privacy gate.
- `tests/`: pytest. `synthetic.py` builds fake raw files, a small full-grid population and
  `RatingSet`s; `needs_raw` tests use the real files.
- `data/raw/` (ignored) holds the OSF downloads; `data/derived/` holds committed aggregates.
- `site/`: SvelteKit 3 app. `site.config.js` sets the base path and origin; `vite.config.ts`
  holds the SvelteKit config, including the CSP. `scripts/serve-pages.js` serves `build/` like
  GitHub Pages; `scripts/check-build.js` checks the artifact; `e2e/` holds Playwright tests;
  Vitest specs sit next to the code as `*.spec.ts`.
- `.github/workflows/`: `ci.yml` (pull requests; reused by deploy), `deploy.yml` (push to `main`
  → GitHub Pages), `pipeline.yml` (manual).

## Commands

Pipeline, from the repo root (uv; Python 3.14 pinned, 3.12+ supported):

```sh
uv sync
uv run pipeline download        # fetch + verify the five OSF files into data/raw/
uv run pipeline verify          # re-check sizes and MD5s (DR-1)
uv run pipeline samples         # rebuild the samples; non-zero exit on any mismatch (DR-3)
uv run pipeline build           # verify, estimate, validate, write data/derived/ (about 15 s)
uv run pipeline build --out DIR # the same into another folder, e.g. to compare two runs
uv run pipeline privacy-scan    # scan data/derived/ (DR-9, DR-16)
uv run pytest                   # needs_raw tests skip when data/raw/ is absent
uv run ruff check && uv run ruff format --check && uv run mypy
```

Site, from `site/` (npm; Node 26 in CI, 24+ locally):

```sh
npm ci
npm run dev                     # dev server under /EtiquetteAtlas/
npm run build && npm run check:build
npm run preview                 # serves build/ like Pages: http://localhost:4173/EtiquetteAtlas/
npm run lint && npm run check && npm run test:unit -- --run
npm run test:e2e                # builds, serves, runs Playwright (once: npx playwright install chromium)
```

Workflows: `docker run --rm -v "$PWD:/repo" --workdir /repo rhysd/actionlint:1.7.12 -color`.

## Conventions

- Key societies on `code` (ISO3; `XKX` Kosovo, `TTO` the pooled Caribbean), never `iso2`:
  Namibia's ISO2 is the literal `NA`, R's missing-value marker. The contexts and 2000–2003 files
  have no `code`; join them on `country`.
- GSN ratings are recoded `rating − 3.5` (−2.5 to +2.5); the 2000–2003 file is used as stored
  (DR-2).
- Samples (DR-3): All data 25,422 / 90; Paper's sample 18,656 / 71 (started at or before
  2024-02-29T23:00:00Z, Kuwait excluded, no complete-case drop); Attention check 15,599 / 80. The
  complete-case 17,288 / 71 sample is a cross-check only.
- Privacy gate: group sizes (`n`, `n_*`, `*_n`, `respondents`, `count`, …) must be null or at
  least 10; 0 fails, so encode "absent" as null. Response counts `c1`–`c6` only on rows with
  n ≥ 10. New entries in `privacy.NOT_RESPONDENT_COUNTS` need a stated reason.
- `data/derived/` is written only by `uv run pipeline build`; commit it in its own commit. The
  build date is the date of the last commit that changed `pipeline/`, `pyproject.toml` or
  `uv.lock`, so after changing any of them rebuild and commit the outputs: a `needs_raw` test
  checks that a fresh build matches the committed files byte for byte.
- Respondent-level arrays (`RatingSet`, bootstrap internals) have counts-only reprs. Never print
  them or put them in assertion messages; tests on them assert on counts and aggregates.
- Bootstrap streams are seeded per (output, sample, society) from `bootstrap.SEED`; a new
  resampled quantity gets its own key so existing outputs do not move.
- Base path `/EtiquetteAtlas` (case-sensitive) comes from `site/site.config.js` or `BASE_PATH`.
  Internal links use `resolve()` from `$app/paths`; off-site links carry `rel="external"`.
- Ship data, JS and CSS content-hashed (HR-3): import them through Vite, not `static/`.
- Add the analytics beacon's hosts to the CSP in `site/vite.config.ts` when the beacon lands
  (M2).
- Python: Ruff (line length 100), strict mypy, type hints. Front end: TypeScript, Prettier,
  ESLint. Typographic `–`, `−` and `×` are fine in Python comments.
