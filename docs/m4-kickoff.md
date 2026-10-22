# Kickoff: The Etiquette Atlas, Milestone M4 (Who's watching?)

You are continuing work on **The Etiquette Atlas**, a free, static site built from aggregates of the
Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. This
session covers **Milestone M4**. Its exit criterion (SRS §10) is that FR-40 to FR-43 pass. The
explorer and the society fingerprints from M2 and M3 are live, unannounced, at
https://nathan98000.github.io/EtiquetteAtlas/, and M4 ships onto them.

## 1. Read first, in this order

1. `CLAUDE.md`: rules, layout, commands and conventions. It now describes the M3 site; follow it
   throughout.
2. `The Etiquette Atlas Software Requirements Specification.md`, the source of truth:
   - §5.5 in full: the requirements M4 delivers (FR-40 to FR-43);
   - DR-12 (§4.5) and §4.7 (why respondent gender is split only globally);
   - §6.1 (the `/audiences` routes and their controls), §6.2 to §6.5;
   - §5.1, §5.9 and §7.1 to §7.3 as they apply to a new module; §9.2 and §9.3 (the Audiences
     row, and AT-6: axe on every module route);
   - §4.2 (the 15 behaviors) and §4.4 (societies, samples, regions).
3. `data/derived/README.md`, especially `contexts-<s>.json`.
4. `docs/decisions.md`, above all 6, 18 and 23 (the contexts data), 25 to 43 (the M2 site) and
   44 to 56 (the M3 site: 44 on entities in the path, 46 on colour, 49 on telling two series
   apart by shape, 51 on prerendered strings). `docs/method-notes.md`: "Who's watching? Audiences
   and actor gender".
5. The site you will build on:
   - `site/src/lib/charts/`: `ChartFrame.svelte`, `DataTable.svelte`, `Grid.svelte`,
     `BarList.svelte`, `Dumbbell.svelte` (two series told apart by shape), `colors.ts`, and the
     `*-model.ts` files with their specs;
   - `site/src/lib/data/` (`files.ts`, `load.ts`, `model.ts`, `society.ts`, `test-fixtures.ts`)
     and `site/src/lib/state/` (`url.ts` with `keysFor` and `sortKeysFor`, `view.svelte.ts`);
   - `site/src/lib/components/`: `Header.svelte`, `ControlBar.svelte`, `SocietyPicker.svelte`,
     `Segmented.svelte`;
   - `site/src/routes/societies/` (an index plus prerendered entries, the pattern to follow),
     `site/src/routes/audiences/` (the placeholder) and `site/src/routes/sitemap.xml/`;
   - `site/scripts/check-build.js` (`ROUTE_DATA`), `site/e2e/` and `site/lighthouserc.cjs`.

You should not need `docs/reference/gsn-data-profile.md` or the raw files. If you do, the M1
rules in CLAUDE.md still apply.

## 2. What M3 left you

- **Routes:**
  - `/` is an intro; `/explore` the matrix, a list below 640 px; `/explore/[behavior]/[situation]`
    the drill-down for each of the 150 cells;
  - `/societies/` lists the 90 societies by region; `/societies/[society]/` is each society's
    fingerprint, with its facts, five most similar societies and compare mode (`?compare=`);
  - `/method` is a draft with a section per chart;
  - `/audiences`, `/change` and `/story` are `noindex` placeholders.

  Every route is prerendered with its own title, description, canonical URL and text built from
  All data at build time.
- **Shared code:**
  - `Grid.svelte`, `BarList.svelte` and `DataTable.svelte` are the generic 15 × 10 grid
    (keyboard model, details on hover and focus), phone list and table; `ChartFrame.svelte` gives
    every chart its summary, "About this chart" and "Show as table";
  - `Dumbbell.svelte` draws two societies' values per row, ● and ○, told apart by shape rather
    than hue, because blue and orange mean appropriateness and the four region colours mean
    regions.
- **State:**
  - `society`, `sample` and `scale` follow the reader across routes; `sort`, `compare`,
    `estimate` and `uncertainty` stay with their route (decision 31);
  - an entity with its own page lives in the path: cells under `/explore`, societies under
    `/societies` (decision 44). `keysFor` and `sortKeysFor` in `url.ts` map each route to the
    parameters and sort orders it keeps;
  - read `view.state`, change it with `setView`, build links with `withView(…)`, or
    `societyHref(code, state)` for a fingerprint.
- **The contexts data, already published (DR-12):**
  - `contexts-<s>.json` has `grid.contexts` in the order alone, colleagues/classmates,
    management/professors, woman, man. The last two are the actor's gender, not audiences;
  - `cells` (societies × 15 behaviors × 5 contexts) holds `n`, `mean` with `mean_minus` and
    `mean_plus`, `share` and `status`; `global` (75 rows) adds `n_societies`; `by_gender` holds
    women and men respondents, global only (decision 18);
  - there is no shrunken estimate, no centered value and no `notable` flag in this file.
- **Facts from the data that should shape the design (All data unless stated):**
  - Status: 5,724 society–cells shown, 829 small samples (10 to 29), 182 too few responses, 15
    not asked (Kuwait: kissing and flirting; Saudi Arabia: kissing, across all five contexts).
  - A society–cell rests on 10 to 217 respondents, median 55; a global cell on 5,453 to 5,642
    respondents in 88 to 90 societies.
  - 83 of the 90 societies can show all 15 behaviors in all three audiences.
  - Globally, every behavior is judged less appropriate in front of management or professors
    than alone: the drop runs from 0.77 to 2.97, largest for music on headphones, kissing on the
    mouth, using a mobile phone and resting. Per society it runs from −1.64 to +4.16 and is
    reversed in 7 of 1,303 society–behaviors.
  - Talking is the one behavior whose audiences are not in order: with colleagues 1.05, alone
    0.90, with management 0.13. "Alone minus management" and "the range across the three" rank
    it differently.
  - Actor gender (done by a woman minus done by a man) is small except for shouting in anger
    (0.64 globally) and arguing (0.53).
  - Respondent gender (women minus men), global only, runs from −0.37 to +0.53.
- **First-load sizes, gzip:**

  | File or route | Size |
  | --- | --- |
  | `contexts-all.json` | 41 KB (Paper's sample 33 KB, Attention check 38 KB) |
  | `societies.json` | 3 KB |
  | `/societies/chl/` after M3 | 78 KB of JS and CSS, 134 KB of data |
  | Pages so far | 51 to 89 KB of JS and CSS, against 200 KB |

  An audiences page needs about 45 KB of data, against NFR-1's 300 KB.
- **Checks:**
  - Vitest: 165 tests. Playwright: 81 tests, covering AT-1, AT-2, AT-11 (matrix, drill-down and
    fingerprint), keyboard paths, axe, measured budgets and redraw times.
  - Lighthouse CI on seven routes: mobile LCP 1.5 to 2.0 s, CLS 0, TBT 0.
  - Pipeline coverage: 99%, against an 80% floor.

  CI runs all of these on pull requests and before every deploy.
- **Local quirk:** `PORT=4392 npm run test:e2e` (and `npm run lhci`) avoids another project's
  server on 4173.
- **Gaps that stay out of scope unless I say otherwise:**
  - the partial FR-1 and FR-82 (decisions 25 and 26), so no share images;
  - manual screen-reader checks; Firefox and WebKit in Playwright (NFR-20);
  - rank uncertainty (R-3); map crowding over Europe; dev-only `npm audit` findings in
    `@lhci/cli`; visual regression (decision 41, M7);
  - collection sites in FR-34 (decision 9), and the subtle dark-theme fills of small differences
    on the fingerprint.
- **SRS edits:** those recommended in M0 to M3 are not applied. Follow the SRS as written, as
  amended by `docs/decisions.md`, unless I say otherwise.

## 3. Already decided

- **The behavior lives in the path.** `/audiences/[behavior]/` is prerendered for the 15
  behaviors with the hyphenated slugs of §4.2 (`/audiences/usemphone/`), following §6.1:
  entities that will get a share image live in the path. `/audiences/` holds the small
  multiples (FR-41). Both lose `noindex` and join the sitemap. The society stays in the query.
- **Shared code.** Reuse `ChartFrame`, `DataTable`, the picker, `Segmented` and the `Resource`
  loading, and Dumbbell's way of telling series apart by shape. Generalise rather than copy.
- **Data.** `contexts-<s>.json` is added to `files.ts`, decoded in `model.ts` and loaded only on
  the audiences routes (NFR-3).
- **No new dependencies are expected.** Ask before adding any.
- **FR-43's citation is not in the repository.** It is the 2026 *American Sociological Review*
  analysis of these audience effects. Ask me for the authors, title and DOI before writing the
  credit; never write one from memory.

## 4. Non-negotiable rules (also in CLAUDE.md)

- **Static site only:** no server, database, serverless function, cookie or paid service (C-2,
  C-11). The browser fetches nothing from a third party (NFR-31).
- **Hashed assets:** data, JS and CSS ship content-hashed (HR-3). Data goes through `files.ts` and
  `load.ts`; browser code never imports JSON.
- **Nothing below 10 respondents is shown** (DR-9). Status 2 reads "too few responses" and
  status 3 "not asked"; neither is plotted, ranked or counted in an effect.
- **Respondent gender is split globally only** (DR-12, §4.7): never within a society.
- **Actor gender is not an audience** (FR-42): "done by a woman" and "done by a man" are labelled
  as who does the behavior, never drawn as a fourth or fifth audience.
- **Wording:**
  - "respondents in Chile", never "Chileans";
  - no causal wording (FR-73, §6.5): the data show how respondents judged a behavior in front of
    each audience, not why, and not how anyone feels when watched;
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
  you will reuse or generalise from M2 and M3;
- the first-load budget for `/audiences/` and a behavior route: JS and CSS against 200 KB, data
  against 300 KB (NFR-1);
- a short design note:
  - the slopegraph's axis, marks and lines, with contrast checks in both themes (NFR-12);
  - how the series (a society and the global view, women and men respondents, actor gender)
    read without colour;
  - how small samples, too few responses and not asked show;
  - the small multiples' layout at the three breakpoints of §6.2.

Then wait for my go-ahead.

| # | Open decision | Proposed default (confirm or change) |
| --- | --- | --- |
| 1 | Routes and links | `/audiences/` shows 15 small multiples; each opens `/audiences/[behavior]/`, which has the focused slopegraph and previous and next links between behaviors in §4.2 order. The header's Audiences link carries society, sample and scale. A fingerprint links to the audiences for its society. |
| 2 | Audience effect (FR-41) | Alone minus management or professors, on the view shown: the two ends of the audience ladder, signed so reversals show. Talking, whose middle audience is highest, gets a note. The alternative is the range across the three audiences. |
| 3 | Global or one society (FR-42) | With no society selected, the global view. With one selected, its three points and lines, with the global view as a faint reference, and a "All societies / Respondents in Chile" switch (`?scope=global`) that keeps the society selected for other routes. |
| 4 | Actor gender (FR-42, Should) | A toggle (`?actor=on`) adds, beside each slopegraph, a separate pair of marks "done by a woman" and "done by a man", on the same score axis but outside the audience lines and labelled as actor gender. |
| 5 | Respondent gender (FR-42, Should) | A toggle (`?split=gender`) in the global view only: two series, women and men respondents, told apart by line style and shape. Disabled with a reason when a society is in view. "Other / prefer not to answer" is left out of the split (decision 18), and a note says so. |
| 6 | Scale toggle (FR-5) | The contexts file has no centered values, so audiences show raw means whatever the scale. The parameter stays in the URL so it follows the reader, and a note beside the chart says the audience views use raw scores. |
| 7 | Estimate shown | The raw mean with its 95% interval, since DR-12 outputs no shrunken value. Small samples (10 to 29) are hollow and named in the details; too few and not asked are listed, not drawn. Intervals show on hover and focus and in the table. |
| 8 | Colour and marks | Points filled by the same blue–orange appropriateness scale as the matrix, with the ink that contrasts; lines and series told apart by shape and line style, not hue. |
| 9 | Sorting (FR-41) | `sort` on `/audiences/`: paper order (default), largest audience effect first, and name. The small multiples and their table follow it. |
| 10 | Prerendered text (FR-83, FR-87) | From All data, global view: the index summary ("every behavior is judged less appropriate in front of management or professors than alone; the drop is largest for … and smallest for …") and a one-sentence summary and title per behavior. Short strings only, under the 2 KB cap. |
| 11 | Credit (FR-43) | A credit line on `/audiences/` and every behavior page, and a method section `#audiences` that cites the analysis and links its DOI, with the citation I supply. |
| 12 | Tests and CI | Vitest for the contexts decoder, effects, orders and summaries on small fixtures (extend `test-fixtures.ts`). Playwright for FR-40 to FR-43 and AT-11 on the audiences routes: society, sample and scale update every view and the URL, and back and forward restore them. Also a keyboard-only path, axe on `/audiences/` and a behavior route in both themes, and budget and Lighthouse CI entries for both. |

## 6. Work for this session

1. **Models.**
   - A `ContextCells` decoder for `contexts-<s>.json`, checked like the others.
   - Audience effects, orders, the actor-gender and respondent-gender pairs, and the summaries,
     with Vitest tests on small fixtures. Extend `test-fixtures.ts` rather than starting new ones.
2. **Routes and state.**
   - `/audiences/` and `/audiences/[behavior]/` with `entries()` for the 15 behaviors.
   - `+page.server.ts` summaries that read `#lib/server/derived.ts` and return short strings.
   - New query parameters in `url.ts`, `keysFor` and `sortKeysFor`; the header link; the
     sitemap.
3. **Focused slopegraph (FR-40)** with details on hover and focus, a summary and a table.
4. **Small multiples (FR-41)**, sortable by the audience effect, each opening its behavior.
5. **Filters (FR-42, Should):** global or one society, actor gender, and the respondent-gender
   split in the global view.
6. **Credit (FR-43)** on both routes and on the method page.
7. **Accessibility and performance.**
   - Keyboard alone everywhere (NFR-13), 200% zoom and no sideways scroll from 320 px (NFR-14,
     NFR-21).
   - NFR-1 and NFR-2 on the new routes, and NFR-4 redraw times measured there too.
8. **CI and housekeeping.**
   - Extend `check-build.js` (`ROUTE_DATA`), `e2e/budget.e2e.ts`, `e2e/a11y.e2e.ts`,
     `e2e/redraw.e2e.ts` and `lighthouserc.cjs` to cover the new routes.
   - Keep everything green.
9. **Docs.**
   - Update `CLAUDE.md` and the README where the site's structure changed.
   - Append new decisions to `docs/decisions.md` from 57 onward.
   - Move the method-page text on audiences and actor gender out of draft where M4 settles it.

## 7. Done when (M4 exit, SRS §10)

- [ ] FR-40, FR-41 and FR-43 pass. FR-42 passes or slips with its reason recorded in
  `docs/decisions.md`.
- [ ] AT-11 passes on the audiences routes as an automated Playwright test.
- [ ] axe reports zero serious or critical issues on `/audiences/` and a behavior route in both
  themes (AT-6), and a keyboard-only user can open a behavior, read its slopegraph, switch
  between the global view and a society, and move to the next behavior.
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
- known gaps against FR-40 to FR-43;
- what's next for M5 ("Change since the early 2000s": FR-50 to FR-53 and AT-4);
- any SRS changes you'd recommend.

## 8. Out of scope for now

- The change module (M5), and the quiz and story (M6).
- Share images and visual regression (M7), and analytics (after the hostname check in
  `docs/SETUP.md`).
- The gaps listed in §2, unless I add them.
- Changes to the pipeline or to `data/derived/` beyond a field the site turns out to need. Ask
  first.
- Any push or GitHub setting change without my OK.
