# Kickoff: The Etiquette Atlas, Milestone M6 (Quiz and guided story)

You are continuing work on **The Etiquette Atlas**, a free, static site built from aggregates of the
Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. This
session covers **Milestone M6**. Its exit criterion (SRS §10) is that FR-60 to FR-65 pass, with
AT-3. The explorer, the society fingerprints, the audiences module and the change module from M2
to M5 are live, unannounced, at https://nathan98000.github.io/EtiquetteAtlas/, and M6 ships onto
them.

## 1. Read first, in this order

1. `CLAUDE.md`: rules, layout, commands and conventions. It now describes the M5 site; follow it
   throughout.
2. `The Etiquette Atlas Software Requirements Specification.md`, the source of truth:
   - §5.7 in full: the requirements M6 delivers (FR-60 to FR-65);
   - FR-1 (§5.1, the home route), FR-3 and FR-4 as they apply to a quiz and a story, FR-91
     (§5.10), C-12 (§2.5), NFR-30 and NFR-31 (§7.4);
   - §4.3 (the response scale: six points, no neutral, recoded −2.5 to +2.5), §4.8 (the paper's
     main finding, which the story must lead with) and the open question in §11.2 about which
     three cells the quiz uses;
   - §6.1 (the `/` and `/story` rows and their controls), §6.2 to §6.5;
   - §5.9 and §7.1 to §7.3 as they apply to two new routes; §9.1 ("Quiz → story → explore") and
     §9.2 (AT-3, AT-6 including "a keyboard-only user completes quiz, story, matrix and
     drill-down", AT-11);
   - NFR-54 (the README must say how to change quiz items).
3. `data/derived/README.md`, especially `distributions-<s>.json`, which no browser code reads
   yet, and `cells-<s>.json`.
4. `docs/decisions.md`, above all:
   - 25 (the home route in M2, a partial FR-1 that M6 closes), 29 (placeholders), 43
     (sessionStorage and NFR-30);
   - 27 and 28 (data delivery, prerendered strings), 31 and 44 (URL state, entities in the path);
   - 32 and 33 (the estimate shown, ranks and "most accepting"), 34 and 35 (encodings, the
     beeswarm), 46 and 47 (colour of a difference, ▲ and ▼);
   - 58 to 61 and 66 (the audiences' effect, lines, raw scores and the 2026 credit);
   - 67 to 77 (the M5 change module), especially 68 (wording of differences between surveys),
     69 (the arrow chart), 70 (provenance and credit) and 75 (the R-6 switch).

   `docs/method-notes.md`: "The scale", "The global picture", "Disagreement", "Who's watching?"
   and "Change since the early 2000s".
5. The site you will build on:
   - `site/src/routes/+page.svelte` (the intro that the quiz replaces) and
     `site/src/routes/story/+page.svelte` (the placeholder), `site/src/routes/+layout.svelte`
     (when the app counts as mounted) and `site/src/routes/sitemap.xml/`;
   - `site/src/lib/charts/`: `Beeswarm.svelte` with `drill-model.ts`, `DotMap.svelte`
     (lazy), `Matrix.svelte`, `Slopegraph.svelte` with `audience-model.ts`, `Dumbbell.svelte`
     with `change-model.ts` (arrows), `ChartFrame.svelte`, `DataTable.svelte`,
     `SeriesKey.svelte` and `colors.ts`;
   - `site/src/lib/data/` (`files.ts`, `change-files.ts`, `load.ts`, `model.ts`, where
     `ChangeCells` is the newest decoder to follow, `test-fixtures.ts`, `derive.ts` with
     `extremes`, `rank` and `rankText`, `format.ts` with `RESPONSES` and `responseLabel`) and
     `site/src/lib/state/` (`url.ts` with `keysFor`, `defaultsFor` and `idle`; `view.svelte.ts`
     with `setView`, `withView`, `societyHref`, `audiencesHref` and `changeHref`;
     `theme.svelte.ts`, the only code that touches browser storage today);
   - `site/src/lib/components/`: `SocietyPicker.svelte`, `Segmented.svelte`, `StepLinks.svelte`,
     `SampleNotice.svelte`, `ChangeProvenance.svelte`, `AudienceCredit.svelte`, `Header.svelte`;
   - `site/src/lib/change-module.ts` (`CHANGE_MODULE`, R-6) and `site/src/lib/attribution.ts`;
   - `site/scripts/check-build.js` (`ROUTE_DATA`, `kindOf`, the AT-4 and R-6 checks),
     `site/e2e/` (`helpers.ts`, `change.e2e.ts`, `state.e2e.ts`, `a11y.e2e.ts`,
     `budget.e2e.ts`, `redraw.e2e.ts`) and `site/lighthouserc.cjs`.

You should not need `docs/reference/gsn-data-profile.md` or the raw files. If you need anything
from the raw files, the M1 rules in CLAUDE.md still apply.

## 2. What M5 left you

- **Routes:**
  - `/` is a short intro with "Skip to the atlas" (decision 25); `/story` is a `noindex`
    placeholder; everything else is a module:
  - `/explore` the matrix (a list below 640 px) and `/explore/[behavior]/[situation]` the 150
    drill-downs; `/societies/` and `/societies/[society]/` the 90 fingerprints with compare mode;
    `/audiences/` and `/audiences/[behavior]/`; `/change/` and `/change/[society]/` for the 26
    societies in both surveys; `/method` a draft.

  Every route is prerendered with its own title, description, canonical URL and text built from
  All data at build time. The sitemap lists 287 URLs.
- **Shared code:**
  - charts: `ChartFrame`, `DataTable`, `Grid`, `BarList`, `Beeswarm`, `DotMap`, `Slopegraph`,
    `Dumbbell` (two values per row, with arrows for the change module), `ChangeStrip`,
    `SeriesKey`;
  - controls: `Segmented`, `Toggle`, `SortSelect`, `StepLinks`, `SocietyPicker`,
    `SampleNotice`; loading: `Resource` and `LoadError`;
  - series and surveys are told apart by shape and line style in the text colour, never by hue,
    because blue and orange mean appropriateness and the four region colours mean regions
    (decisions 49, 59 and 69).
- **State:**
  - `society`, `sample` and `scale` follow the reader across routes; other parameters stay with
    their route or module (decisions 31, 57 and 67); routes can have their own defaults
    (`defaultsFor`);
  - an entity with its own page lives in the path (decisions 44 and 67);
  - the only browser storage the site writes is the theme (localStorage) and SvelteKit's own
    `sveltekit:` scroll keys in sessionStorage (decision 43).
- **R-6:** `CHANGE_MODULE=off` builds the site without the change module (decision 75). Anything
  of it outside `src/routes/change/` is guarded by `CHANGE_MODULE`, and `check-build.js` checks
  the off build.
- **Tests:** Playwright specs import `test` and `expect` from `e2e/helpers.ts`, which waits for
  the app to mount after every page load. Do the same in new specs, and wait for a picker's
  option to appear before pressing Enter.
- **The data the quiz and story can use (All data unless stated):**
  - `distributions-<s>.json`: societies × 150 cells with `n`, `sd` and `c1`–`c6` (the number of
    respondents choosing each point of the 1–6 scale; they add up to `n`). 13,092 of the 13,500
    society–cells have counts; the rest have too few responses or were not asked, and are null.
    There is no decoder or loader for it yet.
  - `cells-<s>.json` gives each society's shrunken and raw estimate per cell with intervals and
    a status (decision 32 shows the shrunken one by default).
  - The response scale has no neutral point: answer k is k − 3.5 on the −2.5 to +2.5 scale, and
    0 falls between "somewhat inappropriate" and "somewhat appropriate" (§4.3).
- **Facts from the data that should shape the design (All data, raw scale):**
  - The most universal cell (lowest disagreement τ, FR-16) is shouting in anger in a job
    interview: τ 0.16, global mean −1.92, 5% chose an appropriate answer. The most
    culture-dependent is singing at a funeral: τ 0.89, mean −0.86, 31% appropriate; flirting at a
    party (0.87) and kissing at a party (0.83) follow.
  - The most and least appropriate cells: eating in a restaurant (+2.06, 95%), kissing in a job
    interview (−1.99, 4%).
  - Audience effect (alone minus management or professors, decision 58), all societies: music on
    headphones 2.97, kissing 2.90, using a mobile phone 2.62; the smallest is talking, 0.77,
    which is out of the audiences' order.
  - Change module: the largest difference averaged over the 26 societies in both surveys is
    music on headphones in the library, 0.03 in 2000–2003 against 1.36 in 2023–2024 (+1.33);
    crying in the library follows (+1.00). The largest for one society is Mainland China, eating
    in a restaurant (+2.89).
  - Candidate quiz cells, with the societies that have an estimate and the range of their
    shrunken estimates: shouting in anger in a job interview (87 of 90, −2.20 to −1.52), eating
    in a restaurant (87, +0.93 to +2.42), singing at a funeral (88, −2.31 to +1.19), music on
    headphones in the library (87, −0.79 to +2.11). Each has distributions for the same
    societies.
  - The paper's main finding, as §4.8 states it: norms vary "far more across situations than
    across societies"; in its model the society SD is 0.19, against 0.31 for situated behaviors
    and 1.11 residual. The atlas does not compute these model values: quote them as the paper's,
    from §4.8 only.
- **First-load sizes, gzip:**

  | File or route | Size |
  | --- | --- |
  | `cells-all.json` | 113 KB (Paper's sample 90 KB, Attention check 104 KB) |
  | `distributions-all.json` | 87 KB (Paper's sample 68 KB, Attention check 74 KB) |
  | `global-all.json`, `societies.json`, `contexts-all.json`, `change-all.json` | 2, 3, 41 and 37 KB |
  | `/` today | 54 KB of JS and CSS, no data |
  | Pages so far | 54 to 94 KB of JS and CSS, against 200 KB; data up to 145 KB |

  Loading `cells-` and `distributions-<s>` together costs about 200 KB, within NFR-1's 300 KB
  but a lot for a landing page that every visitor opens.
- **Checks:**
  - Vitest: 241 tests. Playwright: 134 tests, covering AT-1, AT-2, AT-4 and AT-11, keyboard
    paths, axe in both themes, measured budgets and redraw times.
  - Lighthouse CI on eleven routes: mobile LCP 1.5 to 2.0 s, CLS 0.012 at most, TBT 0.
  - Pipeline coverage: 99%, against an 80% floor.

  CI runs all of these on pull requests and before every deploy, and builds the site twice, with
  and without the change module.
- **Local quirks:**
  - `PORT=4392 npm run test:e2e` (and `npm run lhci`) avoids another project's server on 4173;
  - actionlint runs in Docker, so Docker Desktop must be running;
  - if `svelte-check` reports that a new route's path does not type-check in `resolve()`, run
    `npx svelte-kit sync`;
  - `npm run preview` sends `cache-control: max-age=600`, so add a throwaway query parameter when
    reloading a rebuilt page in a browser.
- **Gaps that stay out of scope unless I say otherwise:**
  - the partial FR-82 (decision 26), so no share images; visual regression (decision 41, M7);
  - manual screen-reader checks; Firefox and WebKit in Playwright (NFR-20);
  - rank uncertainty (R-3); map crowding over Europe; dev-only `npm audit` findings in
    `@lhci/cli`; collection sites in FR-34 (decision 9); the subtle dark-theme fills of small
    differences on the fingerprint;
  - from M4 and M5: no interval for the audience effect (decision 60); the small layout shift
    when a `?society=` URL replaces prerendered text after mount, on the audiences and on
    `/change/?society=…` (decision 31); other routes fetching All data's file before a URL's
    `?sample=` applies (fixed on the change routes only, decision 67); dead change-section text
    left in the method page's JavaScript in a build without the change module (decision 75);
  - completing the method page (FR-70 to FR-72) and analytics (FR-90 to FR-92), both later.
- **SRS edits:** those recommended in M0 to M5 are not applied. Follow the SRS as written, as
  amended by `docs/decisions.md`, unless I say otherwise.

## 3. Already decided

- **The home route becomes the quiz entry** (FR-1), closing decision 25's partial FR-1. "Skip to
  the atlas" stays visible without scrolling, at every width. `/story` loses `noindex` and joins
  the sitemap.
- **Quiz items live in one configuration file** (FR-60), by behavior and situation ID, checked by
  a Vitest test (three items, each a real cell). The README's "Changing the quiz items" section
  says where it is and how to change it (NFR-54).
- **Answers never leave the tab** (FR-63, C-12, NFR-30, NFR-31, FR-91): page memory, plus one
  sessionStorage key so a reload keeps them. They never appear in a URL, a request, a log, an
  error message or analytics. The society a reader picks is not an answer and may stay in the
  URL as `?society=`.
- **Data** goes through `files.ts` and `load.ts` with a decoder in `model.ts`:
  `distributions-<s>.json` gets one, following `ChangeCells`, and loads only when a view needs it
  (NFR-3). Every number on screen comes from `data/derived/`.
- **Credits and provenance:** a story step that shows audience data carries the 2026 *American
  Sociological Review* credit (FR-43, decision 66); a step that shows 2000–2003 data carries the
  provenance note and the Gelfand et al. (2011) credit (FR-52, NFR-41, decision 70), counts
  toward the AT-4 check, and disappears in a build without the change module (R-6, decision 75).
- **The paper's numbers** come from §4.8 and `pipeline/published.toml` only, credited through
  `attribution.ts`. Don't write any citation, quotation or published number from memory; ask me.
- **No new dependencies are expected**, including no scrollytelling library: use
  IntersectionObserver. Ask before adding any.

## 4. Non-negotiable rules (also in CLAUDE.md)

- **Static site only:** no server, database, serverless function, cookie or paid service (C-2,
  C-11). The browser fetches nothing from a third party (NFR-31).
- **Hashed assets:** data, JS and CSS ship content-hashed (HR-3). Data goes through `files.ts` and
  `load.ts`; browser code never imports JSON.
- **Quiz answers stay in the browser** (C-12, FR-63): sessionStorage is the only place they are
  written, and nothing reads them back except the quiz.
- **Nothing below 10 respondents is shown** (DR-9): a society with too few responses or not asked
  reads so and is not ranked or charted (FR-27).
- **Wording:**
  - an individual's answer is not a society's average: compare the reader's answer with
    "the average answer of respondents in Chile", never with "Chileans" or "Chile";
  - no verdicts on the reader (no "polite", "rude", "normal"), and no causal wording (FR-73,
    §6.5): the data show how respondents judged a behavior, not why;
  - differences between the 2000–2003 and 2023–2024 surveys are differences between surveys,
    never change in individuals (FR-52, decision 68);
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
  you will reuse or generalise from M2 to M5;
- the first-load budget for `/` and `/story`: JS and CSS against 200 KB, data against 300 KB
  (NFR-1), and what loads later;
- a short design note:
  - how an answer is shown among the society estimates and within a society's distribution
    (FR-61), without colour alone (NFR-12), and how small samples, too few responses and "not
    asked" show;
  - the quiz's flow and focus order, including skipping the society and starting again;
  - the story's steps, how scrolling, Next, Skip and the progress dots work together, and what
    happens under reduced motion (FR-65);
  - the layouts at the three breakpoints of §6.2.

Then wait for my go-ahead.

| # | Open decision | Proposed default (confirm or change) |
| --- | --- | --- |
| 1 | The three quiz items (§11.2) | One near-universal cell, one divisive cell and one with a surprising change or audience effect: shouting in anger in a job interview (τ 0.16) or eating in a restaurant, singing at a funeral (τ 0.89), and music on headphones in the library (the largest difference since 2000–2003, and the behavior with the largest audience effect). The file is `site/src/lib/quiz/items.ts`. I pick; you check my pick against the data. |
| 2 | Where an answer falls (FR-61) | The answer k becomes k − 3.5 and is placed among the societies' shrunken estimates for the active sample on the raw scale (decision 32), as a marked line on the cell's beeswarm, with text such as "Your answer, somewhat appropriate, is above the average answer of respondents in 58 of 87 societies". Societies with too few responses or not asked are left out and counted apart (FR-27). The scale toggle does not apply to one person's answer; a note says so. |
| 3 | A chosen society's distribution (FR-61, FR-62) | That society's c1–c6 for the cell as six bars labelled with the GSN responses, each with its percent, the reader's answer marked by an outline and by text ("23% of respondents in Chile chose the same answer"). Small samples are flagged; too few responses or not asked reads so. The society is picked with `SocietyPicker` before or during the quiz, or skipped, and kept as `?society=`. |
| 4 | Data loading on `/` | Nothing on first load. `cells-<s>` is fetched when the reader starts the quiz (preloaded on hover or focus of the start control), and `distributions-<s>` only once a society is chosen. The alternative, a small build-time quiz file emitted by Vite from `data/derived/`, would need a new convention; propose it only if the numbers show a problem. |
| 5 | Quiz flow (FR-60, FR-61, FR-62) | One question at a time on `/`, the six responses as a radio group, a reveal right after each answer, then Next; after the third, a summary with links to each cell's drill-down, the story and the explorer, and "Start again", which clears the answers. Focus moves to each question's heading and to the reveal. Without JavaScript: the title, the promise, the questions' wording, a note that the quiz needs JavaScript and "Skip to the atlas" (FR-87). |
| 6 | Storage (FR-63, NFR-30) | One sessionStorage key (`etiquette-atlas:quiz`) holding only the item IDs and answers 1–6, written when an answer is given, read once on load, removed by "Start again"; every access in try/catch, so the quiz still works when storage is blocked. sessionStorage is per tab, so a new tab starts empty (AT-3). |
| 7 | Story structure (FR-64, FR-65, §6.1) | Five or six steps on `/story`, each a section with an anchor (`#universal`), a heading, two or three sentences and one chart reused from the modules, loaded when its step nears the screen (NFR-3). Scrolling moves through the steps (IntersectionObserver); Next and Previous buttons and progress dots do the same and move focus to the step's heading; "Skip to the atlas" is on every step. No scroll-jacking; from 1024 px the chart stays beside the text, below that it follows the text. Steps do not add history entries. |
| 8 | Story steps (FR-64) | (1) The paper's finding: situated behaviors vary more than societies (§4.8's 0.31 against 0.19), with the matrix as the picture. (2) The most universal cell, shouting in anger in a job interview, on its beeswarm. (3) The most culture-dependent cell, singing at a funeral, on its beeswarm. (4) The audience effect, music on headphones alone against in front of management or professors, on its slopegraph, with the 2026 credit. (5) The largest difference since the early 2000s, music on headphones in the library among the 26 societies in both surveys, as an arrow, with the provenance note; left out without the change module. (6) The hand-over to the explorer, a fingerprint, the audiences and the change module. |
| 9 | Story and the global controls (FR-3, FR-4) | The story shows All data and says so: its steps are chosen from All data, so a sample switch could change which cell is most universal. It has no control bar; links out of it keep the reader's society, sample and scale. FR-4 says the sample toggle switches every view, so record this as a decision. |
| 10 | Prerendered text (FR-83, FR-87) | `/`: the questions' wording and the six response labels. `/story`: every step's text, with numbers from All data at build time; the prose lives in the component and only the numbers come from `+page.server.ts`, within decision 28's 2 KB cap. Charts reserve their space (NFR-2). |
| 11 | Motion (§6.3, FR-65, NFR-14) | Transitions of 300 ms or less; none, and no smooth scrolling, under `prefers-reduced-motion`. Nothing animates on its own. |
| 12 | AT-3 as an automated check | A Playwright test answers the three items and records every request after the page loads, with its URL and body: none carries an answer or the storage key, no request is made that a page without the quiz would not make, the URL never changes with an answer, and `document.cookie` is empty. A reload keeps the answers; a new page in the same browser context starts empty. |
| 13 | Tests and CI | Vitest for the quiz configuration, the distributions decoder, an answer's position and share, storage (with a fake storage that can throw) and the story's steps, including their R-6 variant. Playwright for FR-60 to FR-65, AT-3, a keyboard-only quiz and story (AT-6), axe on `/` after an answer and on `/story` in both themes, no sideways scroll from 320 px, and budget and Lighthouse CI entries for both routes. `check-build.js` learns the new routes' data and checks the story's provenance when the module is on and its absence when it is off. |
| 14 | Indexing (NFR-60) | `/story` joins the sitemap (288 URLs). |

## 6. Work for this session

1. **Models.**
   - A decoder for `distributions-<s>.json`, checked like the others, and a loader.
   - The quiz configuration and a quiz model: recoding, an answer's position among the society
     estimates, the share of a society's respondents giving each answer, and the summaries, with
     Vitest tests on small fixtures. Extend `test-fixtures.ts` rather than starting new ones.
   - A story model: each step's cell or behavior and its numbers, from All data, with its R-6
     variant.
2. **The quiz on `/`** (FR-1, FR-60 to FR-63): the society choice, the three questions, the
   reveals and the summary, storage, and the hand-over to the story and the explorer.
3. **The story on `/story`** (FR-64, FR-65): the steps, their charts, Next, Skip and the progress
   dots, the credits and the provenance note.
4. **Privacy (AT-3):** answers in memory and sessionStorage only; no request, URL or log carries
   them.
5. **Accessibility and performance.**
   - Keyboard alone everywhere (NFR-13), 200% zoom and no sideways scroll from 320 px (NFR-14,
     NFR-21), reduced motion (FR-65).
   - NFR-1 and NFR-2 on the new routes.
6. **CI and housekeeping.**
   - Extend `check-build.js` (`ROUTE_DATA`, the provenance and R-6 checks), `e2e/budget.e2e.ts`,
     `e2e/a11y.e2e.ts` and `lighthouserc.cjs` to cover the new routes.
   - Keep everything green, in both builds.
7. **Docs.**
   - Update `CLAUDE.md` and the README where the site's structure changed, including the
     README's "Changing the quiz items" section (NFR-54).
   - Append new decisions to `docs/decisions.md` from 78 onward.
   - Add method notes for the quiz and the story to `docs/method-notes.md` where they need one.

## 7. Done when (M6 exit, SRS §10)

- [ ] FR-60 to FR-65 pass, and AT-3 passes as an automated check.
- [ ] axe reports zero serious or critical issues on `/` (with an answer revealed) and `/story`
  in both themes (AT-6), and a keyboard-only user can complete the quiz and the story and reach
  the matrix and a drill-down from them.
- [ ] NFR-1 and NFR-2 hold on the new routes, measured by Lighthouse CI and `check-build.js`, and
  the sizes are reported against the budgets.
- [ ] CI is green locally:
  - site checks: lint, type-check, Vitest, both builds with `check:build`, Playwright,
    Lighthouse CI;
  - actionlint;
  - pipeline: Ruff, mypy, pytest with coverage and the privacy scan.
- [ ] The deploy is ready. Ask me before pushing; a push to `main` deploys.

End the session with:
- what was done;
- the decisions taken;
- known gaps against FR-60 to FR-65 and AT-3;
- what's next for M7 ("Polish": share images, the method page, accessibility and performance
  audits; AT-5 to AT-10 and AT-12);
- any SRS changes you'd recommend.

## 8. Out of scope for now

- Share images and visual regression (M7), completing the method page (M7), and analytics (after
  the hostname check in `docs/SETUP.md`).
- The gaps listed in §2, unless I add them.
- Changes to the pipeline or to `data/derived/` beyond a field the site turns out to need. Ask
  first.
- The courtesy note to the GSN authors (§11.2): that is my call, and nothing is sent from this
  session.
- Any push or GitHub setting change without my OK.
