# Decisions

Decisions taken where the SRS was open or needed interpretation. Code comments and the method
notes cite them as "decision N". Decisions 1–14 were posed in `docs/m1-kickoff.md`; 15–23 were
added during M1 planning; 24 onward were agreed in M2 planning (`docs/m2-kickoff.md`). All were
agreed by the maintainer on 22 October 2026.

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Small society–cells and global values | Society–cells with n < 10 count toward the global mean (DR-7), τ (DR-8) and the shrinkage target (DR-6), as in the paper; they are never shown on their own. |
| 2 | Shrinkage SE and τ² | SE² = the cell's within-society variance pooled over societies ÷ n, not each society–cell's own SD (undefined at n = 1, zero when all agree). τ² = max(0, var of society means − mean SE²). |
| 3 | Interval of the shrunken estimate | Empirical Bayes: shrunken ± z √(w·SE² + (1 − w)²·var(global)), var(global) from the bootstrap; not percentiles of the shrunken value across replicates. Departs from DR-5's "percentile" wording for this one interval. |
| 4 | Centering with missing cells (DR-10) | A society's offset is its mean deviation from the global cell means over the cells it has. |
| 5 | Global share of 4–6 (DR-11) | Unweighted mean of society shares. |
| 6 | Samples in the contexts file (DR-12) | Samples are defined once from the main file; the 21 respondents found only in the contexts file are in no sample. |
| 7 | Societies with no publishable cells | Kept in the metadata; left out of similarity (DR-14). |
| 8 | Cells never asked | "Not asked" (Kuwait: kiss, flirt; Saudi Arabia: kiss) is a status of its own, separate from "too few responses" (FR-27). |
| 9 | Sites in the facts panel (FR-34) | Site counts are left out, following §4.4. |
| 10 | Interface languages (DR-15) | Codes are merged by language name, then listed when used by at least 10 respondents in the society. |
| 11 | Student share | As stored in sh4rb (the xv2g6 recode of the Philippines and Bolivia is not applied), with a method note and a share unknown. |
| 12 | NFR-51 published values | The paper's Table 1 (mean and SD to ±0.02, the percentage as an exact count of 22 societies) and the Fig. 2 and Fig. 3 caption counts, in `pipeline/published.toml`. The data profile's global-cell extremes are not published values and stay out of the repository. |
| 13 | Doubled 2000–2003 keys | Each country + ResponseId is one bootstrap cluster; a cell's n counts ratings. |
| 14 | Display names (DR-15) | Reviewed mapping in `pipeline/societies.toml`, with Kosovo's coordinates added by hand. |
| 15 | τ interval (DR-8) | Each replicate subtracts the sampling noise twice (once for the data, once for the resampling); a plain percentile interval centres on the raw variance and missed the estimate in 45 of 150 cells. |
| 16 | Similarity (DR-14) | Pearson correlation of fingerprints (shrunken estimate − global cell mean) over cells both societies can publish, at least 120. DR-10 centering does not change a correlation, and raw profiles all correlate near 0.9. |
| 17 | Fieldwork months (DR-15) | First and last month in which at least 10 respondents started, so no month describes fewer than 10 people. |
| 18 | Respondent gender (DR-12) | The global split shows women and men; "Other / prefer not to answer" is left out of the split but counts elsewhere. Global values are means of society means. |
| 19 | Notable cells (FR-31) | Computed in the pipeline from the percentile interval of (society − global mean). |
| 20 | Build date (FR-72) | `SOURCE_DATE_EPOCH`, else the date of the last commit that changed the pipeline or its dependencies, so reruns are byte-identical. |
| 21 | Pipeline pull requests | Opened by a separate job with the preinstalled `gh` CLI; no new third-party action. CI must be triggered by closing and reopening the pull request. |
| 22 | Interval scope | Bootstrap intervals treat the set of societies as fixed. |
| 23 | Contexts per sample | Context aggregates are produced for each sample, like every other output. |
| 24 | Notable cells on the centered scale (FR-5, FR-15) | `notable` tests raw values, so under the centered scale it mostly reflects how a society uses the scale. The pipeline also outputs `notable_centered`: the percentile interval of (centered society value − centered global mean) excludes 0, from the same replicates. |
| 25 | Home route in M2 (FR-1) | `/` is a short static intro: the title, a one-line promise and a prominent "Skip to the atlas" link to `/explore`. M6 replaces it with the quiz entry; until then FR-1 is met only in part. |
| 26 | Share images and meta tags (FR-82, FR-83) | Every prerendered route has its own title, description, canonical URL, `og:title`, `og:description`, `og:url` and `twitter:card` (`summary`). There is no `og:image` until M7 prebuilds the images, a known gap against FR-82 and FR-83. |
| 27 | Data delivery (NFR-3, FR-86) | Each data file is imported with `?url`, so it ships content-hashed, and is fetched when a view needs it, decoded once and kept in memory for the page session. A failed load is forgotten, so Retry fetches it again. The matrix loads `societies` and `global-<s>`, and `cells-<s>` only once a society is selected (preloaded when a cell is hovered or focused); the drill-down loads `cells-<s>`; the map's code and outlines load when the map nears the screen. M2 loads no `distributions`, `contexts` or `change` file. |
| 28 | Prerendered summaries (FR-83, FR-87) | Built from All data at build time in `+page.server.ts`; charts render in the browser and no dataset is serialized into a page. SvelteKit writes a `__data.json` per route holding only the title and summary strings; `check-build.js` allows it unhashed, like the HTML, and caps it at 2 KB. |
| 29 | Header links to later modules (FR-2) | Short "coming soon" pages for Societies, Audiences, Change and Story, so no header link fails. They carry `noindex` and stay out of the sitemap. |
| 30 | Method links (FR-7) | `/method` is a draft with anchored sections taken from `docs/method-notes.md`; each chart's "About this chart" opens its section. FR-70 completes the page in M7. |
| 31 | URL state (FR-80, FR-84) | `society` (lower-case ISO3), `sample` (`paper`, `attention`), `scale` (`centered`), `sort` (`mean`, `disagreement`, `name`) and, on the drill-down, `estimate` (`raw`) and `uncertainty` (`on`). Defaults are left out and parameters keep a fixed order, so one view has one URL; invalid values fall back silently. `sort` orders rows and columns together, in one direction (most appropriate, most disagreement, A–Z). Society, sample and scale follow the reader across routes; the other parameters stay with their route. Every change is a navigation with its own history entry. Prerendered pages cannot read their query string, so the URL's values apply once the app has mounted. |
| 32 | Society–cell estimate shown (FR-22) | Shrunken by default, with a raw toggle on the drill-down; the matrix's details and FR-15 marks use the shrunken estimate. Small samples (10–29) are hollow in the beeswarm, dashed on the map and named in tooltips and tables. |
| 33 | Rank (FR-25) | Among the societies plotted for the current sample, estimate and scale, compared in hundredths (the data's precision); ties share a rank: "tied 12th most accepting of 87". Societies with too few responses, not asked or outside the sample are not ranked. |
| 34 | Visual encodings (§6.4, NFR-12) | Appropriateness: a seven-stop blue–orange diverging scale per theme, interpolated in OkLab, neutral at 0. Disagreement: a circle whose area is proportional to τ (domain 0–1) in whichever of a dark or light ink contrasts more with the fill (at least 4:1). Cells carry a 3:1 outline. Regions: four colours that avoid blue and orange, each with a shape (Africa ▲, Asia ■, Latin America ◆, West ●). FR-15: ▲ looser, ▼ stricter, no mark when close, – when too few or not asked. FR-16: a solid ring for the most universal cell, a double ring for the most culture-dependent. Type: system fonts, 16 px body, 14 px only for chart labels, legends and the footer. |
| 35 | Beeswarm (FR-20) | A greedy dodge layout instead of d3-force: each dot keeps its exact x and takes the free y nearest the axis, in a fixed order, so it is deterministic and overlap-free. The axis is fixed at −2.5 to +2.5 so cells compare. "Show uncertainty" gives each society its own row with its 95% whisker; otherwise the interval shows on hover or focus. |
| 36 | Map (FR-24) | Equal Earth, Natural Earth 1:110m land without borders, cropped to 75° N–50° S, dots at the GSN coordinates, filled by the same estimate and shaped by region. Rendered with d3-geo in the browser from the TopoJSON (21 KB gzip). |
| 37 | Interval of the centered global mean (FR-13) | `global-<s>.json` has no interval for `centered_mean`; it reuses the raw mean's offsets, since the two means differ by at most 0.01 in every sample. |
| 38 | Disagreement band (FR-23) | The band spans the global mean ± τ, where societies typically fall; τ's own 95% interval is given in the text. |
| 39 | Previous and next (FR-26) | Paper order across all 150 cells (the next situation, then the next behavior), wrapping at the ends. |
| 40 | Indexing (NFR-60) | The site is indexable. `sitemap.xml` lists `/`, `/explore`, the 150 cells and `/method`. There is no `robots.txt`: on a project site crawlers read only the account root's, so one under `/EtiquetteAtlas/` would do nothing. |
| 41 | Visual regression (§9.1) | Deferred to M7, when the shell stops changing. Baselines must come from Linux (the Playwright Docker image), because macOS renders text differently from CI. |
| 42 | Should items in M2 | In scope: FR-5, FR-7 (through the method stub), FR-15, FR-16, FR-26, FR-87, NFR-60's sitemap and NFR-4, which is measured. FR-33 and the other module Shoulds wait for their milestones. |
| 43 | sessionStorage (NFR-30) | SvelteKit's router keeps scroll positions and snapshots per history entry in sessionStorage under `sveltekit:` keys, which restores the scroll position on back and forward. They hold no personal data and never leave the tab. The site itself stores only the theme, in localStorage. NFR-30's wording should allow them (see the M2 report). |
