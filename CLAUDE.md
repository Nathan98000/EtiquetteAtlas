# The Etiquette Atlas

A free, static, interactive site showing how appropriate 15 everyday behaviors are judged in 10
situations across 90 societies, built from aggregates of the Global Study of Everyday Norms (GSN,
OSF sh4rb, CC BY 4.0). One maintainer; Claude pairs.

- Source of truth: `The Etiquette Atlas Software Requirements Specification.md`. Requirement IDs
  (FR-, NFR-, DR-, HR-, C-, AT-) and the milestones (§10) come from it.
- Column-level data notes: `docs/reference/gsn-data-profile.md`. It is local only (git-ignored)
  because it quotes respondent-level values: never commit it or copy values out of it.
- Briefs: `docs/claude-code-kickoff.md` (M0), `docs/m1-kickoff.md` (M1), `docs/m2-kickoff.md`
  (M2), `docs/m3-kickoff.md` (M3), `docs/m4-kickoff.md` (M4), `docs/m5-kickoff.md` (M5),
  `docs/m6-kickoff.md` (M6), `docs/m7-kickoff.md` (M7), `docs/launch-kickoff.md` (public launch).
  Manual GitHub and analytics steps:
  `docs/SETUP.md`. What is left before the public launch: `docs/launch.md`. Proposed SRS edits
  (not applied): `docs/srs-changes.md`.
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
  C-11). Quiz answers never leave the browser (C-12). The browser fetches nothing from a third
  party but the Cloudflare Web Analytics beacon (NFR-31): its script host and reporting host are
  the only ones in the CSP, and no custom event is ever sent to it (FR-91).
- The site shows nothing below 10 respondents: status 2 reads "too few responses", status 3
  "not asked"; neither is plotted or ranked (DR-9, FR-27). Write "respondents in Chile", never
  "Chileans", and no causes (FR-73, §6.5).
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
- `site/`: SvelteKit 3 app. `site.config.js` sets the base path, origin, change switch and the
  analytics beacon's URL, token and hosts; `vite.config.ts` holds the SvelteKit config, including
  the CSP, the card build (`CARDS=on`) and the plugin that publishes the share images.
  `scripts/serve-pages.js` serves `build/` like GitHub Pages (gzip included);
  `scripts/check-build.js` checks the artifact, the share images and the NFR-1 budgets;
  `scripts/check-content.js` is the AT-12 content review; `scripts/check-deployed.js` measures
  the deployed site; `scripts/share-images.js` (with `png.js`, `share-inputs.js`) photographs the
  cards; `scripts/in-docker.sh` runs a command in the Playwright Linux image. `e2e/` holds
  Playwright tests, which import `test` and `expect` from `e2e/helpers.ts` so every page load
  waits for the app to mount and the analytics beacon is stubbed; `@compat` tests also run in
  Firefox, WebKit, an iPhone and a Pixel; `visual.e2e.ts` (only with `VISUAL=1`) compares against
  `e2e/visual-baselines/`. `lighthouserc.cjs` configures Lighthouse CI. Vitest specs sit next to the
  code as `*.spec.ts` (and `scripts/*.spec.js`).
  - `src/cards/`: the share-image cards, a separate route tree built only by `npm run cards`:
    `cards.ts` (what each card says and draws, from the server-side data), `model.ts` (their
    types), `Card.svelte` (the frame and the NFR-40 credit) and `charts/`.
  - `src/lib/share.ts`: which card each route shares, the image size and the modules' alt
    texts; it has no imports, so the Node scripts read it too.
  - `src/lib/change-text.ts`: every word of the change module used outside its routes; a build
    without the module swaps it for `change-text.off.ts`.
  - `src/lib/data/`: `grid.ts` (IDs, slugs, wording), `files.ts` (`?url` imports; the change
    files sit apart in `change-files.ts`, which the R-6 switch swaps out), `model.ts` (decoders,
    typed tables and `CHANGE_SOCIETIES`), `load.ts` (cache and retry), `resource.svelte.ts` (a load in a
    component), `derive.ts` (sorts, ranks, summaries), `format.ts` (numbers and phrases),
    `society.ts` (facts and similar societies in words), `method.ts` (the method page's sample
    effects, student share and versions).
  - `src/lib/state/`: `url.ts` (query-string state), `view.svelte.ts` (reading it, `setView`,
    `withView`, `societyHref` for fingerprints, `audiencesHref` for the audiences and `changeHref`
    for the change pages), `theme.svelte.ts`.
  - `src/lib/charts/`: `Grid.svelte`, `BarList.svelte` and `DataTable.svelte` are the shared 15 ×
    10 grid (keyboard, details), phone list and table; the matrix (`Matrix*`) and the fingerprint
    (`Fingerprint*`) wrap them. `Slopegraph.svelte` draws the audiences' focused chart and small
    panels (`audience-model.ts`, `AudienceDetails.svelte`); `SeriesKey.svelte` tells lines apart
    by shape and line style. `Dumbbell.svelte` draws two values per row for compare mode (lazy)
    and, with arrows, for the change routes (`ChangeArrows.svelte`, `ChangeStrip.svelte`,
    `change-model.ts`). Also beeswarm, map (lazy), strip, legends and tables; `*-model.ts` hold
    their pure logic; `colors.ts` the palettes.
  - `src/lib/components/`: header, control bar, society picker, facts panel, similar-societies
    list, the audiences' filters, the change pages' provenance note and scale note, the quiz's
    reveal (`QuizReveal`, loaded on first interaction), the story's steps (`StoryStep`,
    `StoryChange`), and shared controls (`Segmented`, `Toggle`, `SortSelect`, `StepLinks`,
    `SampleNotice`).
  - `src/lib/quiz/`: `items.ts` (the three quiz items, FR-60), `quiz-model.ts` (an answer among
    the society estimates and a society's responses) and `quiz-store.ts` (the one sessionStorage
    key). `src/lib/story/story-model.ts` picks the story's steps from All data.
  - `src/lib/server/derived.ts`: All-data aggregates for build-time summaries only;
    `server/change.ts` holds the change file's, read only by the change routes; `server/method.ts`
    the manifest and the other samples' global cells, for the method page.
  - `src/lib/change-module.ts`: `CHANGE_MODULE`, whether this build has the change module (R-6).
  - Routes: `/` (the quiz), `/story` (the guided story), `/explore` (matrix), `/explore/[behavior]/[situation]` (150 cells),
    `/societies` (index) and `/societies/[society]` (90 fingerprints, with `?compare=`),
    `/audiences` (15 small multiples) and `/audiences/[behavior]` (15 slopegraphs), `/change`
    (the 26 societies in both surveys) and `/change/[society]` (26 pages), and `/method`.
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
npm run cards:docker            # the 247 share images, in the Playwright Linux image (Docker running)
npm run build && npm run check:build && npm run check:content
CHANGE_MODULE=off npm run build && CHANGE_MODULE=off npm run check:build  # R-6: without the change module
npm run preview                 # serves build/ like Pages: http://localhost:4173/EtiquetteAtlas/
npm run lint && npm run check && npm run test:unit -- --run
npm run test:e2e -- --project=chromium  # builds, serves, runs Playwright (once: npx playwright install)
PORT=4392 npm run test:e2e      # all five browsers, on another port if 4173 is taken
npm run test:visual             # visual regression in Docker; test:visual:update after a deliberate change
npm run lhci                    # Lighthouse CI on build/ (12 routes, mobile profile; also honours PORT)
npm run test:deployed && npm run check:deployed  # after a push: AT-9, AT-10 on the live site
```

Firefox will not start inside the agent's macOS sandbox; run the firefox project in Docker
(`sh scripts/in-docker.sh npx playwright test --project=firefox`).

Pipeline coverage as CI runs it: `uv run pytest -m "not needs_raw" --cov` (80% floor, NFR-53).

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
- Share images (decisions 88 to 92): never commit them. `npm run cards:docker` rebuilds them
  after changing the data, `src/cards/` or anything in `src/lib/`; CI rebuilds them when those
  inputs change and the deploy downloads them. Card text follows the site's wording rules; every
  number comes from the decoders. Each image carries the NFR-40 credit, which the script checks.
- Ship data, JS and CSS content-hashed (HR-3): import them through Vite, not `static/`. A
  data file is added to `src/lib/data/files.ts` with `?url` and loaded through `load.ts`;
  browser code never imports JSON directly. Build-time text comes from `+page.server.ts` through
  `src/lib/server/derived.ts`; return only short strings (`__data.json` is capped at 2 KB).
- Every number on screen comes from `data/derived/` through the decoders in `model.ts`. Charts
  render in the browser; prerendered pages carry a text summary (FR-87) and reserve the charts'
  space so nothing shifts (NFR-2).
- View state lives in the URL (decision 31): read `view.state`, change it with `setView`, build
  links with `withView(resolve('path/'), view.state, KEYS)`. Use the path form of `resolve` with a
  trailing slash, as the routes are prerendered with one. On `/societies/[society]` the society is
  the path, not the query (decision 44): link to a fingerprint with `societyHref(code, state)`,
  and `setView({ society })` there moves between fingerprints. The audiences' `scope`, `actor`
  and `split` follow the reader within that module only (decision 57): link there with
  `audiencesHref(behavior, state)`. A change page's society is its path too (decision 67): link
  with `changeHref(code, state)`, which opens the overview with `?society=` for a society without
  2000–2003 data; pass `withSort` false from outside the module. Routes may have their own
  defaults (`defaultsFor`): the change routes sort by difference unless the URL says otherwise.
  Load a sample's files only once the URL applies: `new Resource(() => (view.ready ?
  loadX(view.state.sample) : undefined))` (decision 96).
- The change module can be removed in one build (`CHANGE_MODULE=off`, R-6, decisions 75, 85
  and 95): guard anything of it outside `src/routes/change/` with `CHANGE_MODULE`, keep its data
  in `change-files.ts` and `server/change.ts` and its words in `change-text.ts`, list components
  only it uses in `vite.config.ts`'s `withoutChangeModule`, and check the off build with
  `check:build`, which refuses any mention of the 2000–2003 survey in it.
- Quiz answers are read and written only through `quiz-store.ts` (FR-63, C-12, decision 80):
  never in a URL, request, log or error message. The story shows All data whatever the sample
  toggle (decision 82).
- Colours come from `charts/colors.ts` and the tokens in `app.css`: pass `scoreStyle()` or
  `regionStyle()` and the `score` or `region` class, which pick the theme's colour. Check new
  colours for 3:1 (marks) and 4.5:1 (text) in both themes; `colors.spec.ts` does so for the
  palettes.
- The inline theme script in `src/app.html` gets its CSP hash in `vite.config.ts`; keep scripts
  out of `static/` and add no other inline script. The beacon tag in `app.html` must match
  `analytics` in `site.config.js`, which the CSP and `check-build.js` read.
- A `@playwright/test` update also needs the image tag in `ci.yml` (two jobs and a check) and new
  visual baselines (`npm run test:visual:update`).
- Python: Ruff (line length 100), strict mypy, type hints. Front end: TypeScript, Prettier,
  ESLint. Typographic `–`, `−` and `×` are fine in Python comments.
