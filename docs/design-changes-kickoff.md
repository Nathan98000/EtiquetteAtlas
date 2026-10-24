# Kickoff: The Etiquette Atlas, design changes before v1.0

You are continuing work on **The Etiquette Atlas**, a free, static site built from aggregates of the
Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. A design
review (`docs/design-review.md`) judged the site against four goals: plain for a lay reader, easy to
navigate, light on text, pleasing and somewhat distinctive. It scored them 2, 3, 2 and 3 out of 5.
This session implements the review: **all 39 findings (D-1 to D-39), its ten ranked changes, its
rewritten passages and the navigation structure it proposes**, before v1.0 is tagged. The site is
live, unannounced, at https://nathan98000.github.io/EtiquetteAtlas/.

## 1. Read first, in this order

1. `CLAUDE.md`: rules, layout, commands and conventions. Follow it throughout.
2. `docs/design-review.md`, the brief for the work: the verdicts (section 1), the ranked changes (2),
   the findings table (3), page by page (4), the measurements and rewrites (5), the reader tasks and
   the proposed structure (6), the identity directions (7), what to keep (8) and the questions (9),
   which section 3 below answers.
3. `The Etiquette Atlas Software Requirements Specification.md`: §2.3 (who the site is for), §5.1,
   §5.7, §5.9 (FR-1 to FR-7, FR-60 to FR-65, FR-80 to FR-87), §6 (routes, layout, interaction, visual
   design, language and numbers), §7.1 and §7.2 (performance and accessibility), §10.
4. `docs/decisions.md`, above all 31 (URL state), 34 to 36 (encodings, beeswarm, map), 37 (the
   centered global mean), 44, 57 and 67 (route state), 78 to 83 (home, story), 88 to 92 (share images)
   and 95 (the change module's words). Several are amended below.
5. `docs/srs-changes.md` and `CHANGELOG.md`: how SRS edits are proposed and how v1.0.0 is described.
6. `docs/v1.1.md`: gaps this work closes (the dark fingerprint fills, possibly the `?society=`
   shift) come off it.

You do not need `docs/reference/` or `data/raw/`; this work changes neither the pipeline nor
`data/derived/`.

## 2. What the review found, in one screen

- **Four findings stop a lay reader:** a society's own result is the last block on a pair's page,
  under a global sentence that reads as the society's (D-1); the tour opens with a chart of a model's
  standard deviations whose longest bar undercuts its headline (D-2); switching to Centered changes
  nothing visible on the matrix and nothing shows it is on (D-3); the change pages give a direction
  but no way to say "how sure" (D-4).
- **Text:** 87 to 157 words on the first phone screen of every module, no chart there on 18 of 20
  routes, 76 to 288 words before the first chart, module prose at grade 9 to 13 (approximate).
- **Navigation:** 150-row phone lists in paper order with no way to jump, the compare picker 13
  screens down, scale and Copy link hidden in Options, no visible module name on phones, a tap on a
  dot that replaces the reader's society, and a home page that sends readers to the matrix rather than
  the tour.
- **Look:** clean and consistent but generic (system font, grey bar, boxed panels, one blue for links,
  selected states and "appropriate"); the disagreement dots dominate the matrix and flip ink.
- **Keep** what section 8 of the review lists: the wording discipline, the chart frame, the back
  links, URL state, compare mode, the bottom sheet, the uncertainty view, the empty states, the dark
  theme, no sideways scrolling.

## 3. Already decided (the maintainer, 23 October 2026)

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Scope | Everything in the review: D-1 to D-39, the ten ranked changes, section 5's rewrites (and the two most-read sentences), section 6's proposed structure. |
| 2 | Release | All of it before v1.0. The launch freeze is lifted for this work only; v1.0.0 stays unreleased until it is done, and `CHANGELOG.md`'s v1.0.0 entry ("the launch adds only fixes") is rewritten to say what changed. |
| 3 | Story step 1 (D-2) | Replace the standard-deviation chart with a concrete picture from All data; the paper's three standard deviations move to `/method/#story`. FR-64's opening finding and the link to the paper stay; the 1.11 stays "single ratings beyond what the model explains" and the quote stays the paper's conclusion (findings L-2, L-16). Amends decision 83. |
| 4 | Dot tap (D-14) | On touch, the first tap on a society's mark shows its tip only; a button in the tip selects the society. Mouse click and Enter keep selecting (§6.3). Applies to the beeswarm, the quiz's reveal and the map. |
| 5 | Labels (D-8) | Rename them all now: the estimate toggle, the scale toggle, the sample names, "notably" → "clearly", the beeswarm's "shrunken estimate" title; define "pair" once where it first appears. URL values (`estimate=raw`, `scale=centered`, `sample=paper`, `sample=attention`) and method-page anchors stay, so links keep working. Wording in section 5, decision 1. |
| 6 | Identity | Direction A, "a printed atlas": tokens and CSS only, the system font, no new dependency. With it: D-25 (one-ink disagreement mark), D-26 (beeswarm dots coloured by estimate, small samples marked one way), D-37 (a neutral accent for selected states and primary buttons), D-39 (the dark ramp near 0). The societies index gets the map (D-31), not thumbnails. |
| 7 | The change module's name (D-32) | "Then and now": the h1 "Then and now: two surveys about 20 years apart", the header label "Then and now". The `/change/` paths stay. Its words live in `change-text.ts`, so `CHANGE_MODULE=off` still removes every trace. |
| 8 | Default orders (D-12) | Telling-first on every width: fingerprints default to `difference`, the audiences index to `effect`; the matrix and its list keep paper order; the change routes already default to `difference`. Paper order stays an option everywhere. Amends decision 31's defaults (`defaultsFor`). |
| 9 | History (D-29) | A new route, a new society or a new `compare` adds a history entry; sort, scale, sample, estimate, uncertainty and the audiences' `scope`, `actor` and `split` replace the current one. The URL still holds the whole view. Amends decision 31; FR-84 needs an SRS edit. |
| 10 | Sample toggle | In Options at every width; the desktop bar shows the society (search), the scale and Copy link in one row (D-33). The FR-4 badge stays visible outside Options whenever a non-default sample is on. |
| 11 | Navigation (review section 6) | Home becomes a hub under the quiz (the tour, "Look up a situation", "Look up a society", the audiences, Then and now). One search for pairs and societies in the control bar. The header, in order: Tour, Situations, Societies, Who's watching, Then and now, Method; Method stays in the header (FR-2). The current module is named on phones (D-24). "Skip to the atlas" stays (FR-1). |
| 12 | Share cards (D-38) | Finding headlines for the 150 cell and 90 society cards (observations only), one short detail line, the NFR-40 credit tightened to two lines with every element kept; one decimal (D-35). Amends decision 91. |

## 4. Non-negotiable rules (also in CLAUDE.md)

- **Static and private:** no server, database, serverless function, cookie, paid service or new
  third party (C-2, C-11, NFR-31); the CSP keeps only the beacon's two hosts; no custom analytics
  event (FR-91). A share button may use the browser's own share sheet, which sends nothing to a third
  party. No new dependency without my agreement.
- **Quiz answers never leave the browser** (C-12, FR-63): the new summary may draw the reader's
  answers, but nothing that shares, links to or encodes them. A share button on the quiz shares the
  page only.
- **Nothing below 10 respondents** is shown, on a page or a card (DR-9); "too few responses" and "not
  asked" stay (FR-27). The 2000–2003 survey appears only as society–pair aggregates with its
  provenance (C-6, NFR-41), shortened, never removed.
- **Required content** may be moved, shortened or put behind a disclosure, not removed: the footer
  (FR-6, NFR-40), "About this chart" (FR-7), a one-sentence summary and "Show as table" for every
  chart (NFR-11), the sample badge (FR-4), the provenance note (NFR-41, FR-52), the privacy notice
  (FR-92, NFR-34), "Skip to the atlas" (FR-1), header links to every module (FR-2), a text summary
  without JavaScript (FR-87).
- **Wording:** "respondents in Chile", never "Chileans"; observations, never causes (FR-73, §6.5);
  the 2000–2003 comparison is a difference between two surveys, never change in anyone (FR-52); the
  regions are the GSN authors' grouping. On cards too. `npm run check:content` stays green, and
  `check:build` with `CHANGE_MODULE=off` still refuses any mention of the 2000–2003 survey.
- **Accessibility:** WCAG 2.2 AA; text 4.5:1 and marks 3:1 in both themes (`colors.spec.ts` checks
  the palettes); nothing by colour alone; full keyboard use; reduced motion; 200% zoom; no sideways
  scrolling from 320 px. The combined search is an ARIA 1.2 combobox like the society picker.
- **Performance:** at most 200 KB of compressed JS and CSS on any route's first load and 300 KB of
  data (NFR-1); LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms on Lighthouse's mobile profile (NFR-2). Anything
  moved above a chart reserves its space in the prerendered page; the hub and the search load only what
  they need (NFR-3). Build-time text comes through `src/lib/server/derived.ts` as short strings
  (`__data.json` ≤ 2 KB).
- **Numbers on screen come from `data/derived/` through the decoders**; this work adds no pipeline
  output. Ranks, "clearly", "too close to call" and the story's new picture are computed from what
  the files already hold.
- **Commits:** small local commits with clear messages, requirement IDs and D-IDs in comments and
  test names (§9.3). Ask before any push (a push to `main` deploys), tag, release or GitHub setting.
  New decisions go into `docs/decisions.md` from 111 onward. The SRS changes only through lines in
  `docs/srs-changes.md` that I accept.
- **Share images** are never committed; rebuild them with `npm run cards:docker`. **Visual
  baselines** change deliberately here: update them with `npm run test:visual:update` once per phase
  that changes the look, and say which.

## 5. Start with a plan, then wait

Before writing code, reply with:

- the phases below as you would run them, with what each touches (routes, components, decisions,
  tests) and where you see risk to NFR-1 or NFR-2;
- your recommendation on each open decision in the table below, plus any I've missed;
- the SRS lines you will propose in `docs/srs-changes.md` (at least FR-2's labels and order, FR-4's
  toggle placement, FR-22's labels, FR-64's opening chart, FR-84's history, §5.6's title, §6.1's
  table, §6.4's share-image line, §6.5 if "clearly" and "too close to call" need a rule);
- how you will show me each phase's result (screenshots at 375 and 1280 in both themes, from
  Playwright with the beacon stubbed, kept out of the repository) and re-measure (decision 7).

Then wait for my go-ahead.

| # | Open decision | Proposed default (confirm or change) |
| --- | --- | --- |
| 1 | Label wording | Estimate: "Adjusted for small samples" (default) / "Unadjusted". Scale: "As answered" (default) / "Relative to each society". Sample: "Everyone" (default) / "The paper's sample" / "Passed the attention check", and the badge to match ("The paper's sample: 71 societies"). "Notably stricter" → "clearly stricter". Beeswarm title: "Every society's average answer". Method headings follow; anchors stay. |
| 2 | "How sure" words (D-4, D-15) | "Clearly higher in 2023–2024" ▲, "clearly lower" ▼, "too close to call" (the 95% interval of the difference includes 0), with one line per page: "Clearly means the gap is bigger than the surveys' margin of error (a 95% interval)." A hollow mark's tip: "Only N respondents: this estimate is pulled toward the global average, and the true average could be anywhere from A to B." |
| 3 | Story step 1's picture (D-2) | Two strips on the same −2.5 to +2.5 axis, computed at build time from All data: one behavior's 10 situations (global means) and one of its pairs across the 90 societies. The behavior and the pair are picked by a rule stated on the method page (the median behavior by spread across situations, and that behavior's median pair by spread across societies), so the example is typical, not extreme. |
| 4 | The combined search (decision 11) | On every width the control bar's society box becomes "Search societies and situations", one combobox with two groups (Societies; Behaviors in situations, matched on either word, e.g. "bus", "eat"). Choosing a society sets it as now; choosing a pair opens its page with the society kept. The quiz's picker stays society-only. The pair list comes from `grid.ts`, no new data. |
| 5 | The hub (decision 11) | Under the quiz on `/`: five entry cards, each a question with a small static preview drawn in CSS from tokens (no images): "Take the 2-minute tour", "Look up a situation" (focuses the search), "Look up a society", "Does it matter who's watching?", "Then and now" (guarded by `CHANGE_MODULE`). The quiz's first answer is on the first phone screen (D-11). |
| 6 | Where outcomes are recorded | A new section 10 in `docs/design-review.md`, "What happened to each finding": D-ID, outcome (done, changed, dropped with a reason), commit. Findings never silently dropped. |
| 7 | Measuring the result | A first-screen test in `e2e/` (Chromium, 375 × 812, beacon stubbed by `helpers.ts`): on every module route, the main chart's reserved box starts within the first screen and no lede exceeds 45 words. Re-run the review's measurements (method at the top of `docs/design-review.md`) and its ten reader tasks at the end, and add the before and after numbers to section 10. Targets: a chart on the first phone screen of every module route; at most 60 words before the first chart on module pages; module prose at grade 9 or less (approximate). |
| 8 | Phasing and pushes | One phase at a time, each ending with every local check green and screenshots for me; nothing pushed until I approve, then the deployed checks (`npm run test:deployed && npm run check:deployed`). |

## 6. Work for this session

Each phase ends with `npm run lint && npm run check && npm run test:unit -- --run`, both builds
with `check:build`, `check:content`, Playwright in every project (Firefox in Docker), and, where the
phase changes the look, new visual baselines. Lighthouse CI (`npm run lhci`) after phases 3, 4 and 6.

1. **What stops a reader.** D-1 (the society's box under the title, its space reserved on every
   pair's page), D-27 ("10th strictest of 88" in the lower half), D-3 (a scale chip and sentence while
   centered; the matrix says the global averages barely move), D-4 and D-15 (decision 2's words), D-34
   (intervals that round to a point), D-9 (the reveal scrolls its chart into view, the new sentence,
   one dot colour, the label clear of the marker, no "shrinkage" in the note).
2. **Words.** The label renames (decision 5); the ledes and summaries as observations with response
   labels first and numbers in details and axes (D-5, D-6, D-7, D-16); section 5's rewrites (the
   provenance note with its disclosure, the change lede, the audiences note and lede, the cell lede, the
   quiz's sentence); D-18 to D-20's text; the "Then and now" rename (decision 7); D-35 (one decimal); D-30
   (a "How to read the atlas" box at the top of the method page and its contents in five groups).
3. **Order and layout.** D-5 (beeswarm before the strip, its controls under it); D-20 (the fingerprint
   or its largest differences before the facts, facts collapsed); D-21 (a "Compare with…" button by
   the title); D-17 (response labels on the phone slopegraph); D-33 and decision 10 (one-row bar, the
   sample in Options, Options below 1024 px); D-36 (one empty-state block); D-19 (the notice first, the
   26 societies to pick from); D-23 checked by decision 7's test.
4. **Navigation.** D-14 (tap previews; select by the tip's button); decision 11 (the header's labels and
   order, the module named on phones, the hub, the combined search); decision 9 (history); decision 8
   (defaults); D-12 ("Jump to a behavior" on the phone lists); D-13 (the society's value in each phone
   row); D-28 (a Share button: the browser's share sheet, falling back to Copy link); D-31 (the
   societies index opens with the map of the 90 societies by the GSN authors' regions, loaded lazily).
5. **The quiz and the story.** D-10 (a summary with one takeaway line, a three-row strip of the
   reader's answers against each pair's spread of society averages, the chosen society's share per
   question, "Take the 2-minute tour" as the main button; nothing shareable that carries answers);
   D-2 (decision 3's picture, the bars moved to the method page); D-22 (about 50 words and one chart
   per step, step 5 showing the five largest differences, one "About this chart ▸" per step).
6. **The look.** Direction A (decision 6): a warm paper surface and ink colours as tokens in both
   themes, the seven-stop band under the header, a small 3 × 3 tile mark beside the wordmark, rules
   instead of boxed panels, chart titles that state findings with the unit in a subtitle; D-37, D-25,
   D-26, D-39. Re-run `colors.spec.ts` and check the palette's midpoint against the new surfaces in
   both themes.
7. **Share cards.** Decision 12 for the 240 cell and society cards (the headline rule written into
   `cards.ts` from the same summaries the pages use), the module cards where their headlines are not
   yet findings, the tightened credit (the script still checks NFR-40), one decimal; `npm run
   cards:docker`, and I re-run the social-card validators (NFR-61) after the push.
8. **Documents.** Decisions from 111 for every amended or new choice (83, 31, 34 to 36, 91 and
   anything else); the SRS lines in `docs/srs-changes.md` under "Proposed, not applied"; section 10 of
   `docs/design-review.md` (decision 6); `CHANGELOG.md`'s v1.0.0 entry; `docs/v1.1.md` with what this
   work closed taken off; `CLAUDE.md`'s layout, routes and conventions where they changed (the header
   names, new components, history, defaults), and this brief added to its list of briefs.

## 7. Done when

- [ ] Every finding D-1 to D-39 is done, or changed or dropped with a reason I accepted, in section 10
  of `docs/design-review.md`.
- [ ] Decision 7's first-screen test passes, and the re-measured numbers meet its targets or say why
  not; the ten reader tasks are re-run and each succeeds, with the steps recorded.
- [ ] Every rule in section 4 holds: `check:content`, both builds' `check:build`, the privacy gate,
  axe on every route in both themes, NFR-1 and NFR-2 in Lighthouse CI, no sideways scrolling at 320
  px.
- [ ] CI is green locally (site checks, both builds, share images in Docker, Playwright in every
  project, visual regression with the new baselines, Lighthouse CI, actionlint, the pipeline tests
  and the privacy scan), and on the deploy I approve, with the deployed checks passing.
- [ ] The decisions, the proposed SRS lines, `CHANGELOG.md`, `docs/v1.1.md` and `CLAUDE.md` are
  current.
- [ ] Nothing is pushed, tagged or released without my OK.

End the session with: what was done, phase by phase; the decisions taken; what happened to each
finding; the before and after measurements; the SRS lines waiting for me; and anything left before
v1.0.0 can be tagged.

## 8. Out of scope

- The pipeline, `data/derived/` and the estimates themselves; only how they are presented.
- A self-hosted typeface (direction C) and the tile language with fingerprint thumbnails (direction
  B); they were not chosen.
- New modules, and any third party, cookie or server-side feature.
- Tagging v1.0.0, a GitHub release, the announcement or any post; any push, tag push or settings
  change without my OK.
- Editing the SRS beyond the lines I accept.
