# Kickoff: The Etiquette Atlas, Milestone M5 (Change since the early 2000s)

You are continuing work on **The Etiquette Atlas**, a free, static site built from aggregates of the
Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. This
session covers **Milestone M5**. Its exit criterion (SRS §10) is that FR-50 to FR-53 pass, with
AT-4. The explorer, the society fingerprints and the audiences module from M2 to M4 are live,
unannounced, at https://nathan98000.github.io/EtiquetteAtlas/, and M5 ships onto them.

## 1. Read first, in this order

1. `CLAUDE.md`: rules, layout, commands and conventions. It now describes the M4 site; follow it
   throughout.
2. `The Etiquette Atlas Software Requirements Specification.md`, the source of truth:
   - §5.6 in full: the requirements M5 delivers (FR-50 to FR-53);
   - DR-13 and DR-2 (§4.5), C-6 (§2.5), §4.7 ("change in individuals") and §4.8 (the caveats the
     method page must state);
   - NFR-41 (§7.5), R-6 (§11.1: a switch that removes the module in one build) and the open
     question in §11.2 about a courtesy note to the GSN authors;
   - §6.1 (the `/change` routes and their controls), §6.2 to §6.5;
   - §5.1, §5.9 and §7.1 to §7.3 as they apply to a new module; §9.2 and §9.3 (AT-4, AT-6 on
     every module route, AT-11);
   - §4.2 (which behaviors the 2000–2003 survey asked) and §4.4 (societies, samples, regions).
3. `data/derived/README.md`, especially `change-<s>.json`.
4. `docs/decisions.md`, above all:
   - 13 (doubled 2000–2003 keys; a cell's n counts ratings), 12 (the paper's Table 1, NFR-51),
     22 (intervals treat the societies as fixed);
   - 27 and 28 (data delivery, prerendered strings), 31 and 44 (URL state, entities in the path);
   - 46 to 49 (a difference's colour, notable marks, the dumbbell's ● and ○), 53 and 63 (nothing
     to show, a society outside the sample);
   - 57 to 66 (the M4 site: 57 on filters that stay within a module, 59 on telling lines apart by
     shape, 60 on raw scores whatever the scale, 61 on prerendered strings).

   `docs/method-notes.md`: "Change since the early 2000s".
5. The site you will build on:
   - `site/src/lib/charts/`: `ChartFrame.svelte`, `DataTable.svelte`, `Dumbbell.svelte` with
     `compare-model.ts` (two values per row, ● and ○, the gap, largest gaps first, then "Show
     all"), `SeriesKey.svelte`, `Grid.svelte` and `BarList.svelte`, `colors.ts`
     (`deviationStyle`), and the `*-model.ts` files with their specs;
   - `site/src/lib/data/` (`files.ts`, `load.ts`, `model.ts`, where `ContextCells` is the newest
     decoder to follow, `test-fixtures.ts`, `derive.ts`, `society.ts`) and `site/src/lib/state/`
     (`url.ts` with `keysFor`, `sortKeysFor` and `idle`, and `view.svelte.ts` with `societyHref`
     and `audiencesHref`);
   - `site/src/lib/components/`: `Header.svelte`, `ControlBar.svelte`, `SocietyPicker.svelte`,
     `Segmented.svelte`, `Toggle.svelte`, `SortSelect.svelte`, `StepLinks.svelte`, and
     `AudienceFilters.svelte` (a society-or-all switch with a notice for a society outside the
     sample);
   - `site/src/routes/societies/` (entities in the path, `?society=` replaced by the path),
     `site/src/routes/audiences/` (the newest module), `site/src/routes/change/` (the
     placeholder) and `site/src/routes/sitemap.xml/`;
   - `site/src/lib/attribution.ts` (the Gelfand et al. 2011 credit and its DOI are already there),
     `site/scripts/check-build.js` (`ROUTE_DATA`, `kindOf`), `site/e2e/` (`helpers.ts`,
     `audiences.e2e.ts`) and `site/lighthouserc.cjs`.

You should not need `docs/reference/gsn-data-profile.md` or the raw files, and you must not open
`everyday-norms-2011-clean.csv` (C-6). If you need anything from the raw files, the M1 rules in
CLAUDE.md still apply.

## 2. What M4 left you

- **Routes:**
  - `/` is an intro; `/explore` the matrix, a list below 640 px; `/explore/[behavior]/[situation]`
    the drill-down for each of the 150 cells;
  - `/societies/` lists the 90 societies by region; `/societies/[society]/` is each society's
    fingerprint, with facts, similar societies and compare mode (`?compare=`);
  - `/audiences/` shows 15 small multiples; `/audiences/[behavior]/` each behavior's
    slopegraph, with a society-or-all switch, the actor's gender and, for all societies, women
    and men respondents;
  - `/method` is a draft with a section per chart; `/change` and `/story` are `noindex`
    placeholders.

  Every route is prerendered with its own title, description, canonical URL and text built from
  All data at build time. The sitemap lists 260 URLs.
- **Shared code:**
  - `ChartFrame`, `DataTable`, `Grid`, `BarList`, `Dumbbell`, `SeriesKey` and `Slopegraph` for
    charts; `Segmented`, `Toggle`, `SortSelect`, `StepLinks` and `SocietyPicker` for controls;
    `Resource` and `LoadError` for loading;
  - lines and series are told apart by shape and line style in the text colour, never by hue,
    because blue and orange mean appropriateness and the four region colours mean regions
    (decisions 49 and 59).
- **State:**
  - `society`, `sample` and `scale` follow the reader across routes; `sort`, `compare`,
    `estimate`, `uncertainty` and the audiences' `scope`, `actor` and `split` stay with their
    routes (decisions 31 and 57);
  - an entity with its own page lives in the path (decision 44). `keysFor` and `sortKeysFor` map
    each route to the parameters and sort orders it keeps; `idle` in `url.ts` drops parameters
    that change nothing in a view, so one view keeps one URL.
- **Tests:** Playwright specs import `test` and `expect` from `e2e/helpers.ts`, which waits for
  the app to mount after every page load. Do the same in new specs, and wait for a picker's
  option to appear before pressing Enter.
- **The change data, already published (DR-13):**
  - `grid` has 12 behaviors (the first 12 of §4.2; rest, shout and usemphone were not asked in
    2000–2003) × 10 situations, behavior-major. A change cell's index happens to equal its index
    in the 150-cell grid, but check the IDs in the decoder rather than rely on it;
  - `cells` (societies × 120) holds `n0`, `mean0`, `sd0` (2000–2003) and `n1`, `mean1`, `sd1`
    (GSN), and `diff` (GSN − 2000–2003) with `diff_minus` and `diff_plus`. A cell missing from
    either survey is null throughout;
  - there is **no `status`, no share and no shrunken or centered value** in this file.
    `mean1` equals the raw `mean` of `cells-<s>.json` for every society–cell;
  - `societies` holds `n0` (2000–2003 respondents), each society's mean `diff` over its cells
    with offsets, and `n_cells`;
  - `global` (120 rows) holds `n_societies`, `mean0`, `mean1` and `diff` with offsets. These
    average **only the overlapping societies**, not all 90: just 4 of the 120 `mean1` values match
    `global-<s>.json`;
  - `behaviors` (12 rows) holds each behavior's mean change with offsets, its SD across
    societies and `increased` (societies whose change is above 0). For the paper's sample it
    reproduces the paper's Table 1 (NFR-51);
  - `source` states the provenance (C-6, NFR-41).
- **Facts from the data that should shape the design (All data unless stated):**
  - 26 societies are in both surveys: Australia, Brazil, Estonia, France, Germany, Greece,
    Hungary, Iceland, India, Israel, Italy, Japan, Mainland China, Malaysia, Mexico, the
    Netherlands, New Zealand, Pakistan, Poland, Portugal, Singapore, South Korea, Spain, Turkey,
    the United Kingdom and the United States. By the authors' regions: 16 West, 8 Asia, 2 Latin
    America, none in Africa.
  - The paper's sample keeps 22 (South Korea, the Netherlands, Portugal and Turkey drop out);
    Attention check keeps all 26. So 64 of the 90 societies have no 2000–2003 data (FR-53).
  - 3,119 of 3,120 society–cells are shown. The missing one is Israel, laughing out loud at a
    party, which the older survey lacks; Israel's `n_cells` is 119.
  - A society–cell rests on 107 to 312 ratings in 2000–2003 and 31 to 217 GSN respondents
    (median 67). Under Attention check the GSN side drops to 18 to 164, and 177 society–cells
    rest on 10 to 29: small samples the site must flag from `n1`, since the file has no status.
  - Differences run from −2.26 (the Netherlands, bargaining in a restaurant) to +2.89 (Mainland
    China, eating in a restaurant), median +0.05. Beyond their 95% intervals: 980 higher in the
    GSN survey, 747 lower, 1,392 neither.
  - Societies' mean differences run from −0.32 (Australia) to +0.68 (Malaysia). 13 are higher
    beyond their intervals and 6 lower (Australia, Brazil, Estonia, Germany, Poland, Turkey); 7
    are neither.
  - Overlapping-society averages per cell run from −0.73 (arguing in a public park) to +1.33
    (music on headphones in the library), mean +0.06. 63 cells are higher beyond their
    intervals, 46 lower and 11 neither.
  - By behavior: crying +0.60 (higher in all 26 societies), music on headphones +0.49 (25),
    eating +0.28 (23) and reading the newspaper +0.21 (23); flirting −0.33 and arguing −0.27
    (higher in 4 each).
- **First-load sizes, gzip:**

  | File or route | Size |
  | --- | --- |
  | `change-all.json` | 36 KB (Paper's sample 30 KB, Attention check 36 KB) |
  | `societies.json` | 3 KB |
  | `/audiences/` after M4 | 87 KB of JS and CSS, 44 KB of data |
  | Pages so far | 53 to 87 KB of JS and CSS, against 200 KB |

  A change page needs about 40 KB of data, against NFR-1's 300 KB.
- **Checks:**
  - Vitest: 203 tests. Playwright: 109 tests, covering AT-1, AT-2 and AT-11 (matrix,
    drill-down, fingerprint, audiences), keyboard paths, axe, measured budgets and redraw times.
  - Lighthouse CI on nine routes: mobile LCP 1.5 to 1.8 s, CLS 0.010 at most, TBT 0.
  - Pipeline coverage: 99%, against an 80% floor.

  CI runs all of these on pull requests and before every deploy.
- **Local quirks:**
  - `PORT=4392 npm run test:e2e` (and `npm run lhci`) avoids another project's server on 4173;
  - if `svelte-check` reports that a new route's path does not type-check in `resolve()`, run
    `npx svelte-kit sync` to regenerate the route types.
- **Gaps that stay out of scope unless I say otherwise:**
  - the partial FR-1 and FR-82 (decisions 25 and 26), so no share images;
  - manual screen-reader checks; Firefox and WebKit in Playwright (NFR-20);
  - rank uncertainty (R-3); map crowding over Europe; dev-only `npm audit` findings in
    `@lhci/cli`; visual regression (decision 41, M7);
  - collection sites in FR-34 (decision 9), the subtle dark-theme fills of small differences on
    the fingerprint;
  - from M4: no interval for the audience effect (decision 60), and the small layout shift when
    a `?society=` URL replaces the prerendered all-societies text after mount (decision 31).
- **SRS edits:** those recommended in M0 to M4 are not applied. Follow the SRS as written, as
  amended by `docs/decisions.md`, unless I say otherwise.

## 3. Already decided

- **The society lives in the path.** `/change/[society]/` is prerendered at lower-case ISO3
  codes, following §6.1 and decision 44, and `/change/` is the module's overview. Which
  societies get a page is open (decision 1 below). Both lose `noindex` and join the sitemap.
- **Shared code.** Reuse `ChartFrame`, `DataTable`, the picker, `Segmented`, `SortSelect`,
  `SeriesKey`, the `Resource` loading and Dumbbell's way of drawing two values per row. Generalise
  rather than copy: if the change chart needs what `compare-model.ts` does, share it.
- **Data.** `change-<s>.json` is added to `files.ts`, decoded in `model.ts` and loaded only on the
  change routes (NFR-3). The decoder checks the 12-behavior grid against `BEHAVIORS` by ID.
- **Credit.** NFR-41's credit for Gelfand et al. (2011) and the GSN authors comes from
  `attribution.ts`, which already holds the citation and its DOI. Don't write any other citation
  from memory; ask me.
- **No new dependencies are expected.** Ask before adding any.

## 4. Non-negotiable rules (also in CLAUDE.md)

- **Static site only:** no server, database, serverless function, cookie or paid service (C-2,
  C-11). The browser fetches nothing from a third party (NFR-31).
- **Hashed assets:** data, JS and CSS ship content-hashed (HR-3). Data goes through `files.ts` and
  `load.ts`; browser code never imports JSON.
- **The 2000–2003 survey is used only as society–cell aggregates, labelled with their
  provenance** (C-6). No row of that file reaches the repository or the site, and you never open
  the raw file.
- **Nothing below 10 respondents is shown** (DR-9). The file already leaves out such cells; flag
  those resting on 10 to 29 as small samples.
- **Wording:**
  - differences between two surveys, never change in individuals (FR-52, §4.7): different
    people, recruited differently, with different instruments, two decades apart;
  - no causal wording (FR-73, §6.5): the data show how two surveys' respondents judged a
    behavior, not why they differ;
  - "respondents in Chile", never "Chileans"; the regions are the GSN authors' grouping (§4.4).
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
  you will reuse or generalise from M2 to M4;
- the first-load budget for `/change/` and a society route: JS and CSS against 200 KB, data
  against 300 KB (NFR-1);
- a short design note:
  - the chart's axis, marks and direction (FR-50: "an arrow or dumbbell shall run from the
    2000–2003 aggregate to the 2023–2024 aggregate"), with contrast checks in both themes
    (NFR-12);
  - how the two surveys read without colour, given that compare mode already uses ● for the
    page's society and ○ for the other (decision 49);
  - how small samples, the missing cell, a society outside the sample and a society without
    2000–2003 data show;
  - the layout of 120 rows at the three breakpoints of §6.2.

Then wait for my go-ahead.

| # | Open decision | Proposed default (confirm or change) |
| --- | --- | --- |
| 1 | Routes | `/change/` shows the overlapping societies' averages for the 120 cells, the 26 societies with their mean differences, and the 12 behaviors. `/change/[society]/` is prerendered for the 26 societies only. Picking a society without 2000–2003 data keeps the reader on `/change/?society=…`, which says so and shows the comparison for the overlapping societies (FR-53). The header's Change link opens the selected society's page when it has one. The alternative is prerendering all 90, 64 of them with the FR-53 notice. |
| 2 | The chart (FR-50) | A row per cell, as in compare mode: ○ 2000–2003 and ● 2023–2024 on the −2.5 to +2.5 axis, joined by a line with an arrowhead at the 2023–2024 end, so direction reads without colour. The 25 largest differences first, then "Show all". Cells link to their drill-down. |
| 3 | "Beyond their intervals" (FR-51) | A cell or society counts when the 95% interval of its difference excludes 0. The summary counts both: "Of the 120 pairs both surveys asked, respondents in Japan in 2023–2024 judged 22 more appropriate and 38 less appropriate than respondents in 2000–2003, beyond their intervals." (Japan's real counts under All data; 60 are within.) The overview also counts societies. |
| 4 | Wording (FR-51, FR-52, FR-73) | "Judged more (or less) appropriate in 2023–2024 than in 2000–2003", never "became". "More permissive" and "stricter" appear only with that framing. A provenance note on every change page (FR-52) says the samples, instruments and eras differ, that values are survey-to-survey differences, and that only aggregates of the 2000–2003 data are shown, with the NFR-41 credit. |
| 5 | The comparison without a society (FR-53) | The `global` rows, labelled "the 26 societies in both surveys" (22 in the paper's sample), never "all societies", since they are not the 90-society mean. |
| 6 | Estimate and scale | Raw means on both sides, since the file has no shrunken or centered value (decision 32's shrunken default does not apply). The scale toggle changes nothing here and stays in the URL, with a note, as in decision 60. |
| 7 | Small samples | Flagged when `n1` (or `n0`) is 10 to 29, as decision 32 does elsewhere: only under Attention check, 177 society–cells. Named in the details and the table, drawn the way the map and the slopegraph draw them (a dashed outline). |
| 8 | Sorting | `sort` on the change routes: largest difference first (`difference`, as compare mode orders its gaps), paper order and name. The default is left out of the URL. |
| 9 | The 12 behaviors | On `/change/`, the `behaviors` rows as a short list or strip with each behavior's mean difference and how many societies were higher, noting that for the paper's sample they reproduce the paper's Table 1. |
| 10 | R-6 switch | A build setting in `site.config.js` (for example `CHANGE_MODULE=off`) that removes the change routes, the header link, the sitemap entries and the data imports in one build. Checked by `check-build.js` in both settings. |
| 11 | Prerendered text (FR-83, FR-87) | From All data: the overview's summary and counts, and per society a title, a description and its one-sentence summary. Short strings only, under the 2 KB cap. |
| 12 | Links | The fingerprint of an overlapping society links to its change page; the drill-down of an overlapping cell links to the change for that cell or society. The header link carries society, sample and scale. |
| 13 | AT-4 | `check-build.js` confirms that the only built files holding 2000–2003 values are the three change files, that they carry aggregates only (no respondent-level key; every `n0` null or at least 10), and that every change page carries the provenance note. |
| 14 | Tests and CI | Vitest for the change decoder, differences, counts, orders and summaries on small fixtures (extend `test-fixtures.ts`). Playwright for FR-50 to FR-53, AT-4 and AT-11 on the change routes: society, sample and scale update every view and the URL, and back and forward restore them. Also a keyboard-only path, axe on `/change/` and a society route in both themes, and budget, redraw and Lighthouse CI entries for both. |

## 6. Work for this session

1. **Models.**
   - A `ChangeCells` decoder for `change-<s>.json`, checked like the others.
   - Differences, beyond-interval counts for cells and societies, orders, small-sample flags and
     the summaries, with Vitest tests on small fixtures. Extend `test-fixtures.ts` rather than
     starting new ones.
2. **Routes and state.**
   - `/change/` and `/change/[society]/` with `entries()`.
   - `+page.server.ts` summaries that read `#lib/server/derived.ts` and return short strings.
   - Query parameters in `url.ts`, `keysFor` and `sortKeysFor`; the header link; the sitemap;
     the R-6 switch.
3. **The arrow or dumbbell chart (FR-50)** with details on hover and focus, a summary and a table.
4. **Summary counts (FR-51)** for cells and societies.
5. **Provenance and credit (FR-52, NFR-41)** on every change page, and a `/method/#change`
   section.
6. **The comparison without a society (FR-53).**
7. **Accessibility and performance.**
   - Keyboard alone everywhere (NFR-13), 200% zoom and no sideways scroll from 320 px (NFR-14,
     NFR-21).
   - NFR-1 and NFR-2 on the new routes, and NFR-4 redraw times measured there too.
8. **CI and housekeeping.**
   - Extend `check-build.js` (`ROUTE_DATA`, the AT-4 check), `e2e/budget.e2e.ts`,
     `e2e/a11y.e2e.ts`, `e2e/redraw.e2e.ts` and `lighthouserc.cjs` to cover the new routes.
   - Keep everything green.
9. **Docs.**
   - Update `CLAUDE.md` and the README where the site's structure changed.
   - Append new decisions to `docs/decisions.md` from 67 onward.
   - Move the method-page text on the 2000–2003 comparison out of draft where M5 settles it.

## 7. Done when (M5 exit, SRS §10)

- [ ] FR-50 to FR-53 pass, and AT-4 passes as an automated check.
- [ ] AT-11 passes on the change routes as an automated Playwright test.
- [ ] axe reports zero serious or critical issues on `/change/` and a society route in both themes
  (AT-6), and a keyboard-only user can pick a society, read its differences, open a cell, and
  switch to the overlapping societies' comparison.
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
- known gaps against FR-50 to FR-53 and AT-4;
- what's next for M6 ("Quiz and guided story": FR-60 to FR-65 and AT-3);
- any SRS changes you'd recommend.

## 8. Out of scope for now

- The quiz and story (M6).
- Share images and visual regression (M7), and analytics (after the hostname check in
  `docs/SETUP.md`).
- The gaps listed in §2, unless I add them.
- Changes to the pipeline or to `data/derived/` beyond a field the site turns out to need. Ask
  first. Never open the 2000–2003 raw file.
- The courtesy note to the GSN authors (§11.2): that is my call, and nothing is sent from this
  session.
- Any push or GitHub setting change without my OK.
