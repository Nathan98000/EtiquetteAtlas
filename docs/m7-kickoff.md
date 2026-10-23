# Kickoff: The Etiquette Atlas, Milestone M7 (Polish)

You are continuing work on **The Etiquette Atlas**, a free, static site built from aggregates of the
Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. This
session covers **Milestone M7**. Its exit criterion (SRS §10) is share images, the method page,
and accessibility and performance audits, with AT-5 to AT-10 and AT-12. Every module is live,
unannounced, at https://nathan98000.github.io/EtiquetteAtlas/: the quiz, the story, the explorer,
the fingerprints, the audiences and the change module. After M7 comes the public launch, whose
checklist (§9.4) is mostly mine.

## 1. Read first, in this order

1. `CLAUDE.md`: rules, layout, commands and conventions. It now describes the M6 site; follow it
   throughout.
2. `The Etiquette Atlas Software Requirements Specification.md`, the source of truth:
   - FR-82 and FR-83 (§5.9), C-7 (§2.5), §3.1 (the suggested share-image tooling), §6.4 (share
     images: 1200 × 630 px, the view's headline finding, a simplified chart, the attribution
     line), NFR-5, NFR-40, NFR-61, R-9 (§11.1) and the open question in §11.2 on the share
     images' style;
   - §5.8 in full (FR-70 to FR-73), §4.8 (the caveats the method page must state), NFR-34 and
     HR-8 (the privacy notice), §5.10 and §8.5 (analytics);
   - §7.1 to §7.3 (performance, accessibility, compatibility), §2.4 (the browsers), NFR-33
     (dependency audits and updates), NFR-42 (third-party licences);
   - §9.1 (visual regression among the test levels), §9.2 (AT-5 to AT-10 and AT-12) and §9.4 (the
     launch checklist).
3. `data/derived/README.md`, especially `manifest.json` (build settings and OSF checksums for
   FR-72), which no browser code reads yet, and `societies.json` (the per-society facts FR-71
   asks for).
4. `docs/decisions.md`, above all:
   - 26 (meta tags without `og:image` until M7), 28 (prerendered strings and the 2 KB cap), 30
     (the draft method page), 40, 56, 65, 77 and 84 (indexing);
   - 34 (visual encodings), 41 (visual regression deferred to M7, Linux baselines), 43
     (sessionStorage and NFR-30);
   - 75 and 85 (the change module switch: share images and method text must follow it);
   - 78 to 86 (the M6 quiz and story).

   `docs/method-notes.md` in full: it holds the drafts the method page is built from.
5. The site you will build on:
   - `site/src/lib/components/Seo.svelte` (the meta tags), `site/src/routes/method/+page.svelte`
     (the draft), `site/src/lib/attribution.ts` (every credit), `site/src/routes/sitemap.xml/`;
   - `site/scripts/check-build.js` (what it checks today, including AT-4, R-6 and the NFR-40
     footer text), `site/scripts/serve-pages.js`, `site/e2e/` (`helpers.ts`, `smoke.e2e.ts`,
     `a11y.e2e.ts`, `budget.e2e.ts`), `site/lighthouserc.cjs` and `site/playwright.config.ts`;
   - `.github/workflows/ci.yml` and `deploy.yml` (the R-6 build, the `CHANGE_MODULE` repository
     variable), `docs/SETUP.md` (the manual steps, some still open), `THIRD_PARTY_LICENSES.md`.

You should not need `docs/reference/gsn-data-profile.md` or the raw files, except to run the
`needs_raw` tests for AT-8 (the raw files are in `data/raw/` locally). If you need anything else
from them, the M1 rules in CLAUDE.md still apply.

## 2. What M6 left you

- **Routes:** `/` opens with the three-question quiz and "Skip to the atlas"; `/story/` is the
  guided story (six steps, five without the change module); `/explore` and its 150 drill-downs;
  `/societies/` and 90 fingerprints; `/audiences/` and 15 behavior pages; `/change/` and 26
  society pages; `/method` (still a draft with a "Draft" banner). 289 pages in all; the sitemap
  lists 288 URLs.
- **Meta tags:** every route has its own title, description, canonical URL, `og:title`,
  `og:description`, `og:url` and `twitter:card` (`summary`), but no `og:image` (decision 26).
- **Shared code:** charts (`ChartFrame`, `DataTable`, `Grid`, `BarList`, `Beeswarm` with an
  answer marker, `DotMap`, `Slopegraph`, `Dumbbell` with arrows, `Distribution`, `ChangeStrip`,
  `SeriesKey`), controls (`SocietyPicker`, `Segmented`, `Toggle`, `SortSelect`, `StepLinks`,
  `SampleNotice`), `StoryStep`, `Resource` and `LoadError`. Colours come from `colors.ts` and the
  tokens in `app.css`; series are told apart by shape and line style, never by hue alone.
- **Privacy and storage:** no cookies; localStorage holds only the theme; sessionStorage holds
  SvelteKit's `sveltekit:` scroll keys and, if the reader takes the quiz, one key
  `etiquette-atlas:quiz` (decisions 43 and 80). The CSP allows no third party.
- **R-6:** `CHANGE_MODULE=off` removes the change module in one build (decisions 75 and 85); CI
  builds and checks both settings. Anything M7 adds that shows 2000–2003 data, a share image or
  method text included, must follow the switch.
- **Method page:** sections drafted from `docs/method-notes.md` for every chart, the quiz and the
  change module; a privacy section (theme, quiz storage, GitHub logging IP addresses). Missing:
  the per-society table and the effect of each sample toggle (FR-71), OSF file versions and
  checksums, the pipeline version and the build date (FR-72), the analytics note (FR-92), and a
  final plain-language pass (FR-70).
- **Sizes:**

  | What | Size |
  | --- | --- |
  | `build/` | 24.6 MB with the change module (NFR-5: 60 MB, including share images) |
  | Largest file | `cells-all.json`, 0.5 MB (HR-4 and NFR-5: 5 MB) |
  | First loads | 62 to 98 KB of JS and CSS (budget 200 KB); data up to 145 KB (budget 300 KB) |
  | Share images to come | home, six modules, 150 cells, 90 societies: about 247 at 1200 × 630 |

  At about 60 KB an image, 247 images add about 15 MB, which leaves room under 60 MB.
- **Checks:**
  - Vitest: 269 tests. Playwright: 154 tests (AT-1 to AT-4, AT-11, keyboard paths including the
    quiz and story, axe on every module route in both themes, measured budgets, redraw times).
  - Lighthouse CI on twelve routes: mobile LCP 1.5 to 2.0 s, CLS 0.012 at most, TBT 0.
  - Pipeline coverage: 99%, against an 80% floor. Privacy scan clean.
  - `check-build.js`: base path, hashed assets, sizes, CSP, no third-party resources, the NFR-40
    footer on every page, titles, descriptions and canonical URLs, NFR-1 budgets, AT-4 and R-6.
- **Local quirks:**
  - `PORT=4392 npm run test:e2e` (and `npm run lhci`) avoids another project's server on 4173;
  - actionlint runs in Docker, so Docker Desktop must be running; the same goes for Linux
    screenshot baselines (decision 41);
  - `npx svelte-kit sync` when a new route's path does not type-check in `resolve()`;
  - `npm run preview` sends `cache-control: max-age=600`: add a throwaway query parameter when
    reloading a rebuilt page in a browser.
- **Manual steps still open in `docs/SETUP.md`:** the analytics hostname check (Cloudflare Web
  Analytics with the `github.io` hostname, or GoatCounter), and allowing Actions to open pull
  requests for `pipeline.yml`. I'll tell you the outcome of the first if I have done it.
- **Known gaps carried from M2 to M6** (out of scope unless I pick them in decision 12 below):
  - the layout shift when a `?society=` URL replaces prerendered text after mount, on the
    audiences and on `/change/?society=…` (decision 31);
  - routes other than the change routes fetching All data's file before a URL's `?sample=`
    applies (decision 67);
  - dead change-module text in the method page's and the story's JavaScript in a build without
    the module (decisions 75 and 85);
  - the story's audience chart table gives two values in a sentence, not the full table;
  - no redraw-time measurement on `/`; rank uncertainty (R-3); map crowding over Europe; the
    subtle dark-theme fills of small differences on the fingerprint; collection sites in FR-34
    (decision 9); no interval for the audience effect (decision 60); dev-only `npm audit`
    findings in `@lhci/cli`.
- **SRS edits recommended in M5 and M6, not applied** (earlier ones are reflected in
  `docs/decisions.md`):
  - FR-51: "were judged more or less appropriate in 2023–2024 than in 2000–2003" instead of
    "became more permissive or stricter";
  - FR-53: "the societies in both surveys" instead of "the global comparison";
  - FR-64: "the largest difference between the 2000–2003 and 2023–2024 surveys";
  - FR-4: allow the story to show a fixed sample (decision 82);
  - FR-61: "among the society estimates" rather than "the 90";
  - NFR-30: name the quiz's sessionStorage key and allow SvelteKit's scroll keys (decision 43);
  - FR-60: name the configuration file; §6.1: Previous among the story's controls, questions one
    at a time;
  - R-6: name the switch and the repository variable; AT-4: the checks decision 76 automates.

## 3. Already decided

- **Share images come in M7** for the home page, each module (Explore, Societies, Audiences,
  Change, Story and Method), each of the 150 cells and each of the 90 societies (FR-82), at
  1200 × 630 px with the view's headline finding, a simplified chart and the attribution line
  (§6.4, NFR-40, C-7). Every prerendered route gets `og:image` (absolute URL), its dimensions and
  alt text, and `twitter:card` becomes `summary_large_image` (FR-83, AT-7). Numbers on an image
  come from `data/derived/` through the decoders, like everything else.
- **The method page loses its "Draft" banner** once FR-70 to FR-72 are met. The per-society
  table, the file versions and checksums, the pipeline version and the build date come from
  `societies.json` and `manifest.json`. The text keeps to plain language, states §4.8's caveats,
  and names no cause (FR-73).
- **No new dependencies are expected.** Generating images without one is preferred; if the plan
  needs one (for example Satori and resvg, as §3.1 suggests, or a self-hosted font file), say why
  and ask first. Any new third-party software or asset goes into `THIRD_PARTY_LICENSES.md`
  (NFR-42).
- **The deployed site is measured after a push I approve.** AT-9 and AT-10, and the launch
  checklist's "budgets met on the deployed URL", are checked against
  https://nathan98000.github.io/EtiquetteAtlas/ once M7 is deployed; until then against
  `build/` served like Pages.
- **Manual checks stay mine:** VoiceOver and NVDA (NFR-13), the social-card validators (NFR-61),
  the second reader of the method page and the courtesy note to the GSN authors (§9.4, §11.2).
  You prepare short checklists for them; nothing is sent from this session.

## 4. Non-negotiable rules (also in CLAUDE.md)

- **Static site only:** no server, database, serverless function, cookie or paid service (C-2,
  C-11). The browser fetches nothing from a third party (NFR-31), unless I confirm the analytics
  beacon (decision 1 below); then only its hosts, added to the CSP.
- **Hashed assets:** data, JS and CSS ship content-hashed (HR-3). Share images may keep stable
  names (`check-build.js` already allows images); data still goes through `files.ts` and
  `load.ts`, and browser code never imports JSON.
- **Nothing below 10 respondents is shown, on a page or on an image** (DR-9); quiz answers never
  leave the browser (C-12); the 2000–2003 survey appears only as society–pair aggregates with
  its provenance (C-6).
- **Wording:** "respondents in Chile", never "Chileans"; no causal wording (FR-73, §6.5);
  differences between two surveys, never change in individuals (FR-52); the regions are the GSN
  authors' grouping. This holds on share images too.
- **Commits and settings:** commit locally in small commits with clear messages. Ask before any
  push, before changing a GitHub setting (including enabling Dependabot or Pages options), and
  before adding a dependency.
- **Pipeline:** don't change it or `data/derived/` unless the site needs a field it lacks. If it
  does, say so first.
- **Traceability:** cite requirement IDs in comments and test names where code implements them
  (§9.3).

## 5. Start with a plan, then wait

Before writing code, reply with:

- a short plan mapped to the exit criteria in §7 below, in the order you would build it;
- your recommendation on each open decision in the table below, plus any I've missed;
- how share images are generated, cached and checked: the tool, where templates live, how a
  build without the change module handles them, how long it adds to CI and the deploy (the
  Pages deploy has a 10-minute limit, §8.2), and the total size against NFR-5;
- the method page's new parts and where their data come from, within decision 28's 2 KB cap;
- the audits: what is automated, what you will report, and what is left to me;
- a short design note for the share images: layout, type, the simplified chart per kind of page,
  contrast, and how the attribution line fits (NFR-40 asks for authors, title, year, OSF link,
  licence and the atlas note on every image).

Then wait for my go-ahead.

| # | Open decision | Proposed default (confirm or change) |
| --- | --- | --- |
| 1 | Analytics (FR-90 to FR-92, §8.5, AT-9) | If I have done the hostname check, add the chosen beacon (Cloudflare Web Analytics, else GoatCounter) to every page with its script and reporting hosts in the CSP, no custom events (FR-91), the method page's analytics note (FR-92), and AT-9 asserting that the only third-party requests go to the beacon. If I haven't, FR-90 stays a gap at launch, AT-9 asserts no third-party request at all, and the method page says the site counts no visits. I'll tell you which at the go-ahead. |
| 2 | Share-image tool (FR-82, §3.1) | No new dependency: card pages rendered by the site's own Svelte components at 1200 × 630 and photographed with the Playwright Chromium already used for tests, in a script (`npm run cards`). The alternative is Satori with resvg and a self-hosted font, as §3.1 suggests, which needs new dependencies and a font licence. |
| 3 | Where images are built and kept (R-9, NFR-50) | Generated in CI on Linux, so text renders the same every time, cached by a hash of `data/derived/`, the card templates and the attribution, and restored by the deploy; not committed to git, so data updates don't grow the repository's history. `npm run cards` builds them locally for review (in the Playwright Docker image for identical output). |
| 4 | Which routes get their own image | The 247 FR-82 asks for. The 15 behavior pages and the 26 change society pages use their module's image; the 404 page has none. Without the change module, the Change image is not built and no page points to it. |
| 5 | Share-image style (§11.2) | A quiet editorial look matching the site: light background, the system font stack as Chromium renders it on Linux, one headline finding in a sentence, one simplified chart (the matrix as a grid of colours for Explore, a beeswarm for a cell, the fingerprint's grid for a society, a slopegraph for Audiences, an arrow for Change), and the attribution line in small type at the foot. Light theme only. |
| 6 | Image alt text and headlines (FR-83, §6.5) | Built from the same summaries the pages prerender, as observations only ("Respondents in Chile were notably stricter than the global average in 23 of the 150 pairs"); alt text says what the chart shows. |
| 7 | Method page (FR-70 to FR-72, FR-92, NFR-34) | Settle every section's text from `docs/method-notes.md`, add §4.8's caveats where they are missing, and remove the banner. The per-society table (90 rows: respondents in each sample, student share, languages, fieldwork period) is drawn in the browser from `societies.json` with its rows reserved, like `/societies/`, since 90 rows would exceed decision 28's cap; a short note gives each sample toggle's effect. File versions, checksums, the pipeline version and the build date come from `manifest.json` at build time. |
| 8 | Visual regression (§9.1, decision 41) | Playwright screenshots of each module route at 360, 800 and 1280 px in both themes, with baselines from the Playwright Docker image matching the installed version, run in CI in that image. Tolerances small enough to catch a moved chart, large enough to ignore anti-aliasing. |
| 9 | Compatibility (NFR-20, §2.4) | Add Playwright's Firefox and WebKit projects for a smoke subset (each route loads and draws, the quiz and story work, no console errors), plus a WebKit phone profile for Safari on iOS; Chromium keeps the full suite, which also covers Edge and Chrome on Android. |
| 10 | Dependency audits and updates (NFR-33) | `npm audit --omit=dev` in CI (the dev-only `@lhci/cli` findings stay known), a Python audit through `uv` if it needs no new dependency (else ask), and a `.github/dependabot.yml` for npm, uv and GitHub Actions. Turning on Dependabot alerts is a setting I change. |
| 11 | AT-12 content review | A `check-build.js` (or separate script) pass over the built HTML for causal wording ("because", "due to", "caused", "leads to"…) and nationality nouns in place of "respondents in", with an allowlist for the method page's explanations, plus a page-by-page list for my own read. |
| 12 | Known gaps to close in M7 | Fix the double fetch on routes other than the change routes (the change routes' pattern), and the story's audience table. Leave the decision-31 shifts, rank uncertainty, map crowding and the rest for v1.1 unless the audit finds them failing a requirement. |
| 13 | SRS edits | Collect every recommended edit, from §2 above and from `docs/decisions.md` where a decision departs from or extends the SRS, in `docs/srs-changes.md`: one line each with the requirement, the current wording, the proposed wording and the decision behind it. Don't edit the SRS; I'll decide. |
| 14 | Launch readiness | A `docs/launch.md` that maps §9.4's checklist to what is done, what is automated, and what is left to me, with the manual checklists for screen readers and social cards. |

## 6. Work for this session

1. **Share images** (FR-82, FR-83, AT-7): templates, generation, caching in CI and the deploy,
   meta tags on every route, and checks that each route's image exists, has the right size and
   carries the attribution (AT-5's manual sample is mine).
2. **Method page** (FR-70 to FR-73, FR-92, NFR-34, HR-8): settled text, the per-society table,
   versions, checksums and the build date, the analytics note, no banner.
3. **Audits.**
   - Accessibility: axe as now, plus a manual-check list for me (NFR-13); fix what the audit
     finds.
   - Performance: Lighthouse CI as now, sizes against NFR-1 and NFR-5 including the images.
   - Compatibility: Firefox and WebKit runs (decision 9).
   - Content: the AT-12 pass (decision 11).
4. **Acceptance tests:** AT-5 to AT-10 and AT-12 as automated checks where they can be (AT-8
   through the `needs_raw` tests with the local raw files; AT-9 and AT-10 against `build/` now
   and the deployed URL after the push).
5. **Visual regression** (decision 8) and **dependency audits** (decision 10).
6. **The gaps you agree to close** (decision 12).
7. **Docs.**
   - Update `CLAUDE.md`, the README and `docs/SETUP.md` where the site or the manual steps
     changed, including how to rebuild the share images.
   - Append new decisions to `docs/decisions.md` from 87 onward.
   - Write `docs/srs-changes.md` and `docs/launch.md` (decisions 13 and 14).

## 7. Done when (M7 exit, SRS §10)

- [ ] Share images exist for the home page, each module, the 150 cells and the 90 societies, and
  every route's meta tags point to an existing image (FR-82, FR-83, AT-7).
- [ ] The method page meets FR-70 to FR-72 (and FR-92 if analytics is in), without the banner.
- [ ] AT-5, AT-6, AT-8, AT-10 and AT-12 pass as automated checks; AT-7 likewise; AT-9 passes
  against `build/` and, after the push, the deployed site.
- [ ] axe reports zero serious or critical issues on every route checked in both themes; visual
  regression and the Firefox and WebKit runs are in CI and green.
- [ ] NFR-1, NFR-2 and NFR-5 hold, measured by Lighthouse CI and `check-build.js`, with the
  images counted, and the sizes are reported against the budgets.
- [ ] CI is green locally:
  - site checks: lint, type-check, Vitest, both builds with `check:build`, the share images,
    Playwright (including visual regression and the new browsers), Lighthouse CI;
  - actionlint;
  - pipeline: Ruff, mypy, pytest with coverage, the `needs_raw` tests and the privacy scan.
- [ ] The deploy is ready. Ask me before pushing; a push to `main` deploys.

End the session with:
- what was done;
- the decisions taken;
- known gaps against AT-5 to AT-10 and AT-12, and against any Must requirement;
- what is left before the public launch, from `docs/launch.md`;
- any SRS changes you'd recommend, pointing to `docs/srs-changes.md`.

## 8. Out of scope for now

- Announcing the site, sending the courtesy note to the GSN authors, and any manual check that is
  mine (§3 above).
- The Cloudflare fallback (HR-9, a Could) and a custom domain (C-1).
- Changes to the pipeline or to `data/derived/` beyond a field the site turns out to need. Ask
  first.
- Editing the SRS itself; collect proposals instead (decision 13).
- Any push or GitHub setting change without my OK.
