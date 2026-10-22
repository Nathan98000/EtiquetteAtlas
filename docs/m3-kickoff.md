# Kickoff: The Etiquette Atlas, Milestone M3 (society fingerprint)

You are continuing work on **The Etiquette Atlas**, a free, static site built from aggregates of the
Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. This
session covers **Milestone M3**. Its exit criterion (SRS §10) is that FR-30 to FR-34 pass. The
core explorer from M2 is live, unannounced, at https://nathan98000.github.io/EtiquetteAtlas/, and
M3 ships onto it.

## 1. Read first, in this order

1. `CLAUDE.md`: rules, layout, commands and conventions. It now describes the M2 site; follow it
   throughout.
2. `The Etiquette Atlas Software Requirements Specification.md`, the source of truth:
   - §5.4 in full: the requirements M3 delivers (FR-30 to FR-34);
   - §6.1 (the `/societies` routes and the `compare` parameter), §6.2 to §6.5;
   - §5.1, §5.9 and §7.1 to §7.3 as they apply to a new module; §9.2 and §9.3 (AT-11 covers
     the fingerprint);
   - §4.4 and §4.8: societies, samples, regions and caveats.
3. `data/derived/README.md`, especially `cells-<s>.json` (with `notable_centered`),
   `similarity-<s>.json` and `societies.json`.
4. `docs/decisions.md`, above all 7, 9 to 11, 16, 17, 19 and 24 (the data behind the
   fingerprint) and 25 to 43 (the M2 site). `docs/method-notes.md`: "Notably stricter or looser",
   "Similar societies" and "Society facts".
5. The M2 site you will build on:
   - `site/src/lib/charts/`: `Matrix.svelte`, `MatrixList.svelte`, `matrix-model.ts`,
     `CellDetails.svelte`, `ChartFrame.svelte`, `colors.ts`;
   - `site/src/lib/data/` and `site/src/lib/state/` (`url.ts`, `view.svelte.ts`);
   - `site/src/lib/components/Header.svelte`, `ControlBar.svelte`, `SocietyPicker.svelte`;
   - `site/src/routes/societies/` (the placeholder) and `site/src/routes/sitemap.xml/`;
   - `site/scripts/check-build.js` (`ROUTE_DATA`), `site/e2e/` and `site/lighthouserc.cjs`.

You should not need `docs/reference/gsn-data-profile.md` or the raw files. If you do, the M1
rules in CLAUDE.md still apply.

## 2. What M2 left you

- **Routes:**
  - `/` is an intro;
  - `/explore` holds the matrix, which becomes a list below 640 px;
  - `/explore/[behavior]/[situation]` is the drill-down for each of the 150 cells;
  - `/method` is a draft;
  - `/societies`, `/audiences`, `/change` and `/story` are `noindex` placeholders.

  Every route is prerendered with its own title, description, canonical URL and a one-sentence
  summary built from All data at build time.
- **Data layer:**
  - `files.ts` imports each file with `?url`, and `load.ts` caches it per page session;
  - `model.ts` decodes it: `SocietyCells`, `GlobalCells`, `Societies`;
  - a `Resource` loads data inside a component, with `LoadError` and a retry.
- **State:**
  - `society`, `sample` and `scale` follow the reader across routes; `sort`, `estimate` and
    `uncertainty` stay with their route (decision 31);
  - read `view.state`, change it with `setView`, and build links with
    `withView(resolve('path/'), view.state, KEYS)`;
  - `keysFor` in `url.ts` maps each route to the parameters it keeps.
- **Data you need for M3, already published:**
  - `cells-<s>.json` has `notable` and `notable_centered` (FR-31 on the raw and centered scales,
    decision 24);
  - `similarity-<s>.json` has the top five per society (DR-14, decision 16);
  - `societies.json` has every fact FR-34 needs except sites, which decision 9 leaves out.
- **Facts from the data that should shape the design:**
  - Deviations from the global mean (shrunken estimate − global mean) span −2.8 to +2.6, but 95%
    of them lie within about ±1.0, and within ±0.8 on the centered scale.
  - In all three samples, a cell's `notable` sign always agrees with the sign of its shrunken
    deviation.
  - Societies without enough publishable cells have no similarity rows:
    - All data: Ethiopia, Mongolia, Namibia;
    - Paper's sample: Ethiopia, Mauritius, Peru, Uruguay, Zambia;
    - Attention check: Chile, DR Congo, Sri Lanka, Mozambique, Rwanda.
  - Correlations run from 0.16 to 0.90.
  - Respondents per society run from 16 to 996.
  - 39 societies have some student status unknown.
  - The longest display name has 24 characters.
- **First-load sizes, gzip:**

  | File | gzip |
  | --- | --- |
  | `cells-all.json` | 116 KB |
  | `societies.json` | 3 KB |
  | `global-all.json` | 3 KB |
  | `similarity-all.json` | 2 KB |

  A fingerprint page needs about 124 KB of data, against NFR-1's 300 KB. M2's pages ship 50 to
  88 KB of JS and CSS, against 200 KB, counting each page's HTML because small stylesheets are
  inlined.
- **Checks:**
  - Vitest: 126 tests.
  - Playwright: 50 tests, covering AT-1, AT-2, AT-11, keyboard paths, axe, measured budgets and
    redraw times.
  - Lighthouse CI on five routes. Mobile LCP is 1.5 to 2.0 s, with CLS 0 and TBT 0.
  - Pipeline coverage: 99%, against an 80% floor.

  CI runs all of these on pull requests and before every deploy.
- **Local quirk:** `PORT=4392 npm run test:e2e` (and `npm run lhci`) avoids another project's
  server on 4173.
- **M2 gaps that stay out of scope unless I say otherwise:**
  - the partial FR-1 and FR-82 (decisions 25 and 26);
  - manual screen-reader checks;
  - Firefox and WebKit in Playwright (NFR-20);
  - rank uncertainty (R-3);
  - map crowding over Europe;
  - dev-only `npm audit` findings in `@lhci/cli`;
  - visual regression (decision 41, M7).
- **SRS edits:** those recommended in M0 to M2 are not applied. Follow the SRS as written, as
  amended by `docs/decisions.md`, unless I say otherwise.

## 3. Already decided

- **The society lives in the path.** `/societies/[society]/` is prerendered for all 90 societies,
  with lower-case ISO3 slugs: `/societies/chl/`. Following §6.1, entities that will get a share
  image live in the path. Share images themselves stay in M7.
- **Shared code.** Reuse the M2 matrix, list and table components, generalising them where needed
  rather than copying them. The fingerprint must look and behave like the matrix:
  - the same keyboard model;
  - the same details on hover and focus;
  - a list below 640 px;
  - "About this chart" and "Show as table".
- **Index page.** `/societies/` stops being a placeholder. It loses `noindex`, and it and the 90
  society pages join the sitemap.
- **No new dependencies are expected.** Ask before adding any.

## 4. Non-negotiable rules (also in CLAUDE.md)

- **Static site only:** no server, database, serverless function, cookie or paid service (C-2,
  C-11). The browser fetches nothing from a third party (NFR-31).
- **Hashed assets:** data, JS and CSS ship content-hashed (HR-3). Data goes through `files.ts` and
  `load.ts`; browser code never imports JSON.
- **Nothing below 10 respondents is shown** (DR-9). Status 2 reads "too few responses" and
  status 3 "not asked"; neither is coloured as a deviation or counted as stricter or looser.
- **Wording:**
  - "respondents in Chile", never "Chileans";
  - no causal wording (FR-73, §6.5);
  - a similarity score is a resemblance between answers, not a kinship between cultures;
  - the regions are the GSN authors' grouping (§4.4).
- **Commits and settings:** commit locally in small commits with clear messages. Ask before any
  push, before changing a GitHub setting, and before adding a dependency.
- **Pipeline:** don't change it or `data/derived/` unless the site needs a field it lacks. If it
  does, say so first.
- **Traceability:** cite requirement IDs in comments and test names where code implements them
  (§9.3).

## 5. Start with a plan, then wait

Before writing code, reply with:

- a short plan mapped to the exit criteria in §7 below, in the order you would build it;
- your recommendation on each open decision in the table below, plus any I've missed;
- the routes, components and data loading. Name which files each route loads and when, and what
  you will generalise from M2;
- the first-load budget for `/societies/` and a society route: JS and CSS against 200 KB, data
  against 300 KB (NFR-1);
- a short design note:
  - the deviation scale and its domain, with contrast checks in both themes (NFR-12);
  - how FR-31's marks and missing cells read without colour;
  - the layout at the three breakpoints of §6.2;
  - the dumbbell design, if FR-33 is in.

Then wait for my go-ahead.

| # | Open decision | Proposed default (confirm or change) |
| --- | --- | --- |
| 1 | Picker and links on society routes | On `/societies/[society]/` the path names the society, and `?society=` is not used. The picker moves between society routes, and clearing it goes to `/societies/`. The header's Societies link goes to the selected society's page, or to `/societies/` when none is selected. Leaving a society route carries its society into `?society=`. Sample and scale stay in the query string. |
| 2 | Index page (`/societies/`) | A short intro with the picker, and the 90 societies listed by the authors' region. Each row shows respondents in the active sample, or "not in this sample", and links to its fingerprint. No chart. |
| 3 | Deviation shown (FR-30) | Shrunken estimate minus the global cell mean, the quantity DR-14 correlates (decision 16), on the scale shown. Centered means (shrunken − `offset_shrunk`) − `centered_mean`. Shrunken only, with no raw toggle. |
| 4 | Deviation colour (FR-30, §6.4) | The same blue–orange palette, centred at 0: blue means more appropriate than the global average, orange less. Domain ±1.5, clamped, with values beyond it marked in the legend and the details. Cells with too few responses or not asked get a neutral fill with a "–" glyph. |
| 5 | Notable marks (FR-31) | ▲ notably looser and ▼ notably stricter, from `notable` or `notable_centered` to match the scale. These are the same glyphs as FR-15; the legend explains them. Summary counts give the number of stricter and looser cells. |
| 6 | Second mark in each cell | None: the fingerprint has no disagreement circle. The society's 95% interval and its n appear in the details and the table. |
| 7 | Sorting and the phone list | The same `sort` parameter and orders as the matrix, so rows and columns line up between the two views. Below 640 px, a list of the 150 cells sorted by deviation, each with a bar from 0 and its mark. |
| 8 | Similar societies (FR-32) | The top five, each with its correlation to two decimals, explained in plain words ("1 would mean the same pattern"), and its shared cells. Selecting one opens its fingerprint, keeping sample and scale. Societies with no pairs read "too few pairs with enough responses to compare". |
| 9 | Compare mode (FR-33, Should) | `?compare=jpn` on a society route: a dumbbell list of the 150 cells with the two societies' shrunken estimates, sorted by the gap, with cells either society lacks listed apart. In M3 once the Musts pass; otherwise it slips with a recorded reason. |
| 10 | Facts panel (FR-34) | Respondents in the active sample (and in all three samples), student share and share unknown with decision 11's caveat, interface languages, fieldwork months and region, labelled as the authors' grouping. No sites (decision 9). |
| 11 | Prerendered text (FR-83, FR-87) | Each society route gets the title "Respondents in Chile", a description and a one-sentence summary built from All data on the raw scale. For example: notably stricter in N pairs, notably looser in M, and answers most like those in Uruguay. The index gets a one-sentence summary too. |
| 12 | Tests and CI | Vitest for the fingerprint, compare and facts models and the summaries. Playwright for FR-30 to FR-34 and for AT-11 on the fingerprint: society, sample and scale update every view and the URL, and back and forward restore them. Also a keyboard-only path, axe on `/societies/` and a society route in both themes, and budget and Lighthouse CI entries for a society route. |

## 6. Work for this session

1. **Models.**
   - Fingerprint deviations, marks and counts on either scale.
   - Similar-society lists, the compare gaps and the facts.
   - Summaries built from the decoded files, with Vitest tests on small fixtures. Extend
     `test-fixtures.ts` rather than starting new ones.
2. **Routes and state.**
   - `/societies/` and `/societies/[society]/` with `entries()` for all 90 societies.
   - `+page.server.ts` summaries that read `#lib/server/derived.ts` and return short strings
     (`__data.json` is capped at 2 KB).
   - Update `keysFor`, the picker's behaviour on society routes, the header link and the
     sitemap.
3. **Fingerprint matrix (FR-30, FR-31).**
   - Reuse and generalise the M2 matrix and list.
   - The deviation fill, the notable marks, details on hover and focus that link to the cell's
     drill-down, and the summary and table.
4. **Similar societies (FR-32) and the facts panel (FR-34).**
5. **Compare mode (FR-33, Should),** once the Musts pass.
6. **Accessibility and performance.**
   - Keyboard alone everywhere (NFR-13), 200% zoom and no sideways scroll from 320 px (NFR-14,
     NFR-21).
   - NFR-1 and NFR-2 on the new routes, and NFR-4 redraw times measured there too.
7. **CI and housekeeping.**
   - Extend `check-build.js` (`ROUTE_DATA`), `e2e/budget.e2e.ts`, `e2e/a11y.e2e.ts` and
     `lighthouserc.cjs` to cover the new routes.
   - Keep everything green.
8. **Docs.**
   - Update `CLAUDE.md` and the README where the site's structure changed.
   - Append new decisions to `docs/decisions.md` from 44 onward.
   - Move the method-page text on similarity and facts out of draft where M3 settles it.

## 7. Done when (M3 exit, SRS §10)

- [ ] FR-30, FR-31, FR-32 and FR-34 pass. FR-33 passes or slips with its reason recorded in
  `docs/decisions.md`.
- [ ] AT-11 passes on the fingerprint as an automated Playwright test.
- [ ] axe reports zero serious or critical issues on `/societies/` and a society route in both
  themes, and a keyboard-only user can pick a society, read its fingerprint and open a similar
  society.
- [ ] NFR-1 and NFR-2 hold on the new routes, measured by Lighthouse CI and `check-build.js`, and
  the sizes are reported against the budgets.
- [ ] CI is green locally:
  - site checks: lint, type-check, Vitest, build, `check:build`, Playwright, Lighthouse CI;
  - actionlint;
  - pipeline: Ruff, mypy, pytest with coverage and the privacy scan.
- [ ] The deploy is ready. Ask me before pushing; a push to `main` deploys.

End the session with:
- what was done;
- the decisions taken;
- known gaps against FR-30 to FR-34;
- what's next for M4 ("Who's watching?": FR-40 to FR-43);
- any SRS changes you'd recommend.

## 8. Out of scope for now

- "Who's watching?" (M4), the change module (M5), and the quiz and story (M6).
- Share images and visual regression (M7), and analytics (after the hostname check in
  `docs/SETUP.md`).
- The M2 gaps listed in §2, unless I add them.
- Changes to the pipeline or to `data/derived/` beyond a field the site turns out to need. Ask
  first.
- Any push or GitHub setting change without my OK.
