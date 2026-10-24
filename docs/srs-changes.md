# SRS changes

Edits to `The Etiquette Atlas Software Requirements Specification.md` recommended during M5 to M7,
at the launch and in the design changes before v1.0, and places where a decision departs from or
extends its wording (decision 103).
The maintainer decides; one line each: the requirement, its wording, the proposed wording and the
decision behind it.

## Proposed, not applied

From the design changes before v1.0 (`docs/design-changes-kickoff.md`, decisions 111 to 140), 24
October 2026. The site already does what each line says; the SRS is unchanged until the maintainer
accepts them.

| Requirement | Wording now | Proposed wording | Why |
| --- | --- | --- | --- |
| FR-2 | "A persistent header shall link to: Explore (matrix), Societies (fingerprint), Audiences, Change, Story and Method." | "A persistent header shall link, in this order, to Tour (the guided story), Situations (the matrix), Societies (fingerprints), Who's watching (audiences), Then and now (the 2000–2003 comparison) and Method, and shall name the current module at every width." | Decisions 114 and 121; D-24, D-32 |
| FR-3 | "A global society picker shall support type-ahead search by society name and full keyboard use. …" | "A global search shall find societies by name and pairs by their behavior or situation, with type-ahead and full keyboard use; choosing a society selects it, and choosing a pair opens its drill-down with the society kept. …" (the second sentence unchanged) | Decision 122 |
| FR-4 | "A global sample toggle shall switch every view, … between the default sample (All data, 90 societies) and the alternatives in §4. A badge shall show when a non-default sample is active." | "A global sample toggle, under the control bar's Options at every width, shall switch every view, … between the default sample (All data, 90 societies, named "All respondents" on screen) and the alternatives in §4. A badge outside Options shall show whenever a non-default sample is active." | Decisions 111 and 120; D-8, D-33 |
| FR-5 | "A scale toggle shall switch between raw scores and within-society centered scores, so …" | add "While centered scores are shown, every chart shall say so under its title." | Decision 119; D-3 |
| FR-17 | "Below 640 px wide, the matrix shall become a sortable list of the 150 cells with an inline mean bar and disagreement mark." | add ", a control to jump to a behavior in the paper's order and, with a society selected, that society's value in each row" | Decision 128; D-12, D-13 |
| FR-21 | "Society dots shall be coloured by region and their sample size shown in the tooltip." | "Society dots shall be filled by their estimate, as on the map, and shaped by region; their sample size shall be shown in the tooltip." | Decision 116; D-26 |
| FR-22 | "A toggle shall switch between shrunken (default) and raw estimates; societies with small samples shall carry a visible flag." | "A toggle shall switch between estimates adjusted for small samples (shrunken, the default) and unadjusted (raw) estimates, named in those plain words; societies with small samples shall carry a visible flag, whose tooltip says what few respondents do to an estimate." | Decisions 111 and 112; D-8, D-15 |
| FR-25 | "The selected society shall be labelled with its rank, e.g., "12th most accepting of 90"." | "The selected society's result, with its rank counted from the nearer end ("12th most accepting of 90", "10th strictest of 88"), shall sit directly under the page's title, its space reserved." | Decisions 113 and 115; D-1, D-27 |
| FR-31 | "… shall be marked as notably stricter or looser." | "… shall be marked as clearly stricter or looser (§6.5)." | Decisions 111 and 112 |
| FR-64 | "… shall open with the paper's main finding, that norms vary far more across situations than across societies, then annotate …" | "… shall open with the paper's main finding, that norms vary far more across situations than across societies, pictured with the atlas's own All-data averages (the paper's model and its standard deviations on the method page), then annotate …" | Decision 133; D-2 (amends decision 83) |
| FR-81 | "A "Copy link" control shall copy the current permalink." | add "A "Share" control by each page's title shall open the browser's own share sheet where there is one, and copy the link otherwise." | Decision 131; D-28 |
| FR-84 | "Browser back and forward shall move between view states." | "Browser back and forward shall move between pages, societies and comparisons. Changing a sort, sample, scale, estimate, uncertainty or audience filter shall replace the current history entry; the URL still holds the whole view (FR-80)." | Decision 127; D-29 |
| NFR-11 | "Every chart shall have a one-sentence text summary and a "Show as table" control …" | add "In the guided story both may sit inside the step's "About this chart" disclosure." | Decision 133; D-22 |
| AT-11 | "… back and forward restore earlier states." | "… back and forward restore earlier pages, societies and comparisons." | FR-84 |
| Summary, §1.2, §5.6's title, §6.1, §9.3 | "Change since the early 2000s" (Change) | "Then and now" (Change), described as two surveys about 20 years apart; the M5 milestone keeps its name | Decision 114; D-32 |
| §6.1 table | Home: "Title, one-line promise, three quiz questions, one at a time, result reveal" / "Society picker, Skip to the atlas"; Explore: "Etiquette matrix" / "Sort, sample, scale, society"; drill-down: "Raw/shrunken, uncertainty, previous/next"; Societies: "Deviation matrix, most similar societies, facts panel" / "Compare with…, sample, scale"; Audiences: "Who's watching?"; the query parameters "`society`, `sample`, `scale` (`raw` or `centered`), `sort`, `compare`" | Home: "The first question as the title, a one-line promise, three quiz questions one at a time, the result reveal and a summary, then the ways in: the tour, a search for a pair, the societies, the audiences, Then and now" / "Society picker, Skip to the atlas, Take the tour"; Explore: "Situations (the etiquette matrix)" / "Sort, search, scale; sample in Options"; drill-down: "Adjusted or unadjusted estimate, uncertainty, previous/next"; Societies: "The index: a map of the 90 societies by the GSN authors' regions, then the list; a fingerprint: deviation matrix, most similar societies, facts" / "Compare with… by the title, search, scale; sample in Options"; Audiences: "Who's watching"; the query parameters add "and, on their routes, `estimate`, `uncertainty`, `scope`, `actor` and `split`" | Decisions 111, 120 to 123 and 132; D-11, D-31 |
| §6.2 | ≥ 1024 px: "Header with module tabs; control bar under it"; 640–1023 px: "Header collapses to a menu; detail panel moves below the chart"; < 640 px: "society picker stays reachable in a sticky bar" | ≥ 1024 px: "Header with module tabs; control bar under it in one row (search, scale, Options holding the sample, Copy link)"; 640–1023 px: "Header collapses to a menu named after the current module; the control bar keeps the search, with the sample, scale and Copy link under Options; detail panel moves below the chart"; < 640 px: "the search stays reachable in a sticky bar" | Decisions 120 and 121; D-24, D-33 |
| §6.3 | "On touch, the first tap shows the tooltip and the second opens." | "On touch, the first tap shows the tooltip and the second opens, except on a society's mark (the beeswarm, the maps, the quiz's reveal), whose tooltip carries the button that selects the society or the link that opens it; a second tap there closes the tooltip, so a tap on a mark never selects by itself." | Decision 125; D-14 |
| §6.4, share images | "1200 × 630 px, with the view's headline finding, a simplified chart and the attribution line." | "1200 × 630 px, with the view's finding as the headline (an observation, §6.5), one short detail line, a simplified chart and the NFR-40 attribution in two lines." | Decision 136; D-38 |
| §6.4 | (new) | "**Interface colour:** selected states and primary buttons in the text ink, never in the data's colours; links and focus rings in one blue." | Decision 134; D-37 |
| §6.5 | (new) | "Say how sure in words: "clearly higher" or "clearly lower" (or "clearly stricter", "clearly looser") when the 95% interval of a difference excludes 0, and "too close to call" when it includes 0, with one line per page on what "clearly" means; never "significant"." | Decision 112; D-4, D-15 |
| §6.5 | (new) | "Chart titles state what the chart shows, as observations; the subtitle says what is drawn, and scores go in details, tables and axes rather than in the first sentence." | Decisions 113 and 118; D-5, D-6, D-7 |

## Applied

All 28 lines below were accepted by the maintainer on 23 October 2026 and applied in commit 89993c7,
with the SRS's date line moved to 23 October 2026. None was rejected. Two more, proposed at the
launch, were accepted and applied the same day in commit ff12017:

| Requirement | Wording before | Applied wording | Why |
| --- | --- | --- | --- |
| §3.2 | The layout's root folder `etiquette-atlas/` | `EtiquetteAtlas/` | The repository's name, as the slug edit and §11.2 now say |
| §11.2 | "- [ ] Send the GSN authors a courtesy note before launch, …?" | "- [x] … Closed: no note was sent (the maintainer's decision, 23 October 2026); whether the OSF licence covers the 2000–2003 extract stays unasked, and `CHANGE_MODULE=off` removes the module if that is ever questioned (R-6)." | Decision 108 |

### Wording that no longer matched the site

| Requirement | Wording before | Applied wording | Why |
| --- | --- | --- | --- |
| Summary, §6.1, §8.1, HR-1 | `https://<owner>.github.io/etiquette-atlas/`; base path `/etiquette-atlas/` | `https://nathan98000.github.io/EtiquetteAtlas/`; base path `/EtiquetteAtlas` (case-sensitive) | The repository's name sets the free URL (`site/site.config.js`); closes §11.2's slug question |
| FR-4 | "A global sample toggle shall switch every view …" | "… every view except the guided story, which always shows All data …" | Decision 82 |
| FR-51 | "count cells and societies that became more permissive or stricter, beyond their intervals" | "count pairs and societies judged more or less appropriate in 2023–2024 than in 2000–2003, beyond their intervals" | Decision 68: differences between surveys, not change (FR-52) |
| FR-53 | "show the global comparison instead" | "show the societies in both surveys instead" | Decision 71: they are not the 90-society averages |
| FR-60 | "set in a configuration file" | "set in `site/src/lib/quiz/items.ts`" | Decision 78 |
| FR-61 | "among the 90 society estimates" | "among the society estimates of the active sample" | Decision 79: 71 or 80 under the other samples, fewer where too few responded |
| FR-64 | "the largest change since the early 2000s" | "the largest difference between the 2000–2003 and 2023–2024 surveys" | Decision 83, FR-52 |
| §6.1 (home, story rows) | "three quiz questions"; story controls "Next, Skip, progress dots" | "three quiz questions, one at a time"; "Previous, Next, Skip, progress dots" | Decisions 78 and 81 |
| NFR-30 | "Browser storage shall hold only the theme choice (localStorage) and quiz answers (sessionStorage)." | "… and the quiz answers, in one sessionStorage key (`etiquette-atlas:quiz`); SvelteKit's scroll-position keys (`sveltekit:`) are also allowed." | Decisions 43 and 80 |
| NFR-33 | "dependency audits (npm and pip)" | "dependency audits (npm and uv)" | Decision 99: the pipeline is managed by uv |
| R-6 | "a configuration switch that removes the module in one build" | "`CHANGE_MODULE=off` (the repository variable `CHANGE_MODULE` for the deploy) removes the module, its data and every word about it, in one build" | Decisions 75, 85 and 95 |
| AT-4 | "a search of the built files finds no respondent-level 2000–2003 data" | "… the build check finds the 2000–2003 survey only in the three change files, with only their aggregate keys and no group below 10, and the provenance note on every change page" | Decision 76 |
| §4.8 | "Fieldwork ran from 14 July 2023 to 31 May 2024" | "Fieldwork ran from July 2023 to May 2024" | Decision 93: the exact first and last days each describe one respondent's start (decision 17) |
| §3.1 (share images row) | "Rendered at build time from SVG templates (for example Satori with resvg)" | "Card pages drawn by the site's own Svelte components, photographed with Playwright's Chromium in CI and written as 256-colour PNGs" | Decisions 88 and 92: no new dependency |
| §8.4 (deploy row) | "Build (share images restored from cache when data and templates are unchanged)" | "Build (share images built, or restored from cache, by CI's images job and downloaded as an artifact)" | Decision 90 |
| §8.4 (ci.yml row) | "Lint and type-check; …; Lighthouse CI and size budgets" | add "share images; dependency audits; the content review; Firefox, WebKit, iPhone and Pixel smoke tests" | Decisions 90, 98, 99 and 100 |
| §8.5 | "Its docs do not say whether a `*.github.io` hostname is accepted, so this is checked in the first milestone." | "Cloudflare accepted the `github.io` hostname (23 October 2026); GoatCounter is not needed." | `docs/SETUP.md` |
| §11.2 | Open questions on the quiz cells, the slug and the share images' style | Close them: the cells of decision 78, the slug `EtiquetteAtlas`, the quiet editorial style of decision 91 | Decisions 78 and 91 |

### Decisions that refine a requirement

| Requirement | Wording before | Applied wording | Why |
| --- | --- | --- | --- |
| DR-5 | "Intervals shall be 95% percentile bootstrap intervals …" | add "except the shrunken estimate's, an empirical-Bayes interval using the bootstrap variance of the global mean" | Decision 3 |
| DR-14 | "the Pearson correlation of two societies' shrunken, centered cell estimates" | "the Pearson correlation of their fingerprints (shrunken estimate − global cell mean)" | Decision 16: centering does not change a correlation, and raw profiles all correlate near 0.9 |
| FR-23 | "the disagreement interval as a band" | "a band spanning the global mean ± τ, with τ's interval given in the text" | Decision 38 |
| FR-34 | facts panel shows "sites" | leave sites out | Decision 9 and §4.4: sites are quasi-identifying |
| NFR-60 | "a sitemap, a robots.txt and canonical URLs" | "a sitemap and canonical URLs" | Decision 40: crawlers read only the account root's robots.txt |
| FR-82 | home, modules, cells and societies | add "a behavior's audiences page and a society's change page use their module's image" | Decision 89 |
| §6.2 | "details open in a bottom sheet" below 640 px | add "except the slopegraph and the change arrows, whose details sit below the chart or in each row" | Decisions 62 and 69 |
| §2.4, NFR-20 | "the two latest major versions" of each browser | "the current versions, tested automatically, and the previous versions checked by hand before launch" | Decision 98: Playwright ships only current browser builds |
| §9.1 (visual regression) | "Each module at 360, 800 and 1280 px, light and dark" | add "the top 1200 px of each page, against baselines from the Playwright Linux image" | Decision 97 |
| AT-9, AT-10 | "The deployed site …" | add "checked against `build/` on every pull request and against the deployed site after each push" | Decisions 87 and 102 |
