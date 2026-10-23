# SRS changes

Edits to `The Etiquette Atlas Software Requirements Specification.md` recommended during M5 to M7
and at the launch, and places where a decision departs from or extends its wording (decision 103).
The maintainer decides; one line each: the requirement, its wording, the proposed wording and the
decision behind it.

## Proposed, not applied

None.

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
