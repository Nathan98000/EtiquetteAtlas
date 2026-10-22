# The Etiquette Atlas: Software Requirements Specification

Oct 22, 2026 · @Nathan Nguyen

## Summary

The Etiquette Atlas v1 is a free, static Svelte and D3 website on GitHub Pages, at `https://<owner>.github.io/etiquette-atlas/`, that lets the public explore how appropriate 15 everyday behaviors are in 10 situations across 90 societies. It is built from aggregates of the Global Study of Everyday Norms; no respondent-level data, server or purchased domain is involved.

| Decision | v1 choice |
| --- | --- |
| Modules | Etiquette matrix, cell drill-down with a linked dot map, society fingerprint, "Who's watching?", change since the early 2000s, quiz and guided story |
| Default data | All data: 25,422 respondents in 90 societies; the paper's sample (71 societies) and the attention-check sample (80) as toggles |
| Statistics | Respondent-level bootstrap 95% intervals, empirical-Bayes shrinkage, nothing shown below 10 respondents |
| Stack | SvelteKit (static) and D3; Python pipeline run by hand, committing only aggregates |
| Hosting | GitHub Pages through GitHub Actions; Cloudflare Workers as fallback; no domain purchased |
| Privacy | No cookies; quiz answers stay on the device; cookie-less Cloudflare Web Analytics, with GoatCounter as fallback |
| Audience and language | General public first; English only |
| Sharing | A permalink for every view and about 250 prebuilt share images; no data downloads |
| Licensing | Code under MIT; data credited under CC BY 4.0 on every page and image |
| Effort | About 270 hours: public launch in about 18 weeks at 15 hours a week |

Four facts from the data shaped the spec. The contexts file holds three audiences plus the actor's gender, not five audiences. The comparison survey dates from 2000–2003. The paper's main sample covers only 71 societies, hence the All-data default. And norms vary far more across situations than across societies, which the story leads with.

## 1. Introduction

### 1.1 Purpose

This document specifies version 1 of The Etiquette Atlas, a free, public, interactive website built from the Global Study of Everyday Norms (GSN). It is the single reference for building, testing and accepting v1. Its readers are the developer and maintainer, any future contributors, and anyone reviewing the method, such as the GSN authors.

### 1.2 Scope

The Etiquette Atlas lets a general audience explore how appropriate 15 everyday behaviors are judged in 10 situations across 90 societies. It shows where societies agree and disagree, how one society differs from the rest, how an audience changes the answer, and how judgments compare with a survey from the early 2000s. A short quiz and guided story introduce the explorer.

v1 is a static website: all data processing happens offline, and the site ships only aggregated, de-identified summaries. It runs on a free hosting tier at the free subdomain that host provides; no domain is purchased.

**In scope for v1**

- Etiquette matrix, cell drill-down, society picker and method notes (the core explorer)
- Linked dot map of societies
- Society fingerprint with most-similar societies
- "Who's watching?" audience view
- "Change since the early 2000s" comparison, built from aggregates only
- Opening quiz and guided scroll story
- Permalinks for every view and prebuilt share images
- Cookie-less visitor analytics

**Out of scope for v1**

- Any server, database, user account or login
- Storing or sending quiz answers anywhere
- Data downloads (readers are pointed to the OSF repository instead)
- Interface languages other than English
- Respondent-level views, free-text content or any non-aggregated data
- Causal claims about why societies differ

### 1.3 Definitions and acronyms

| Term | Meaning in this document |
| --- | --- |
| GSN | Global Study of Everyday Norms (Eriksson et al. 2025) and its OSF data deposit |
| Behavior | One of the 15 everyday actions rated (e.g., using a mobile phone, shouting in anger) |
| Situation | One of the 10 settings in which behaviors are rated (e.g., a funeral, a party) |
| Cell | One behavior–situation pair; the matrix has 150 cells |
| Society | The unit GSN reports results for; usually a country (exact definition in §4) |
| Site | A data-collection location; several sites can belong to one society |
| Appropriateness | A respondent's rating of a behavior in a situation, recoded by GSN to −2.5 (very inappropriate) to +2.5 (very appropriate) |
| Global mean | The mean of society means for a cell, each society weighted equally |
| Disagreement | The spread of society means for a cell (between-society standard deviation), with an interval |
| Shrinkage | Pulling a small society's estimate toward the global mean in proportion to its uncertainty (empirical Bayes) |
| Bootstrap CI | A 95% interval from resampling respondents within a society |
| Audience | Who is present when the behavior happens, in the GSN contexts file (alone, colleagues or classmates, management or professors) |
| 2000–2003 survey | The Gelfand et al. (2011) survey, collected in 2000–2003, that the GSN authors compare against; used here only as aggregates |
| Permalink | A URL that restores the exact view (module, cell, society, toggles) |
| Share image | A prebuilt image shown when a permalink is posted on social media (Open Graph image) |
| FR / NFR / DR / C | Functional, non-functional, data requirement; design constraint |

### 1.4 References

- Eriksson, K., Strimling, P., Vartanova, I., Simpson, B., et al. (2025). Everyday norms have become more permissive over time and vary across cultures. *Communications Psychology* 3:145. [doi:10.1038/s44271-025-00324-4](https://www.nature.com/articles/s44271-025-00324-4)
- GSN data and code, OSF project sh4rb, CC BY 4.0: [osf.io/sh4rb](https://osf.io/sh4rb/)
- Companion tightness repository, OSF xv2g6: [README](https://osf.io/download/wpq5r/)
- ISO/IEC/IEEE 29148:2018, Requirements engineering (structure of this SRS)
- W3C Web Content Accessibility Guidelines (WCAG) 2.2
- Creative Commons Attribution 4.0 International license: [creativecommons.org/licenses/by/4.0](https://creativecommons.org/licenses/by/4.0/)

### 1.5 Conventions

Each requirement has an ID (FR-, NFR-, DR-, C-) and a priority: **Must** (v1 is not accepted without it), **Should** (expected in v1, may slip to v1.1 with a recorded reason) or **Could** (only if time allows). "Shall" marks a binding requirement. Every Must requirement maps to at least one acceptance test in §9.

## 2. Overall description

### 2.1 Product perspective

The Etiquette Atlas is a new, standalone static website. It depends on one upstream source, the GSN deposit on OSF, which an offline pipeline turns into a small bundle of aggregate files at build time. The browser never contacts OSF; it loads only files served by the free host.

The product complements the GSN paper rather than replacing it. The paper reports means and models in static figures; the atlas adds explicit disagreement with intervals, per-society drill-downs, a reader's own position, the audience dimension and per-society change. Every view links back to the paper and data for method details.

### 2.2 Product functions

1. Show all 150 cells as a matrix of global appropriateness, with disagreement between societies marked in each cell.
2. Drill into one cell to see all 90 society estimates with intervals, on a beeswarm and a linked dot map.
3. Pick a society and see it highlighted everywhere, plus its fingerprint against the global mean and its most similar societies.
4. Show how acceptability shifts with the audience present.
5. Compare GSN with the 2000–2003 survey for the 26 overlapping societies and 120 overlapping cells.
6. Open with a three-question quiz and a short guided story, then hand over to the explorer.
7. Encode every view in the URL and offer a prebuilt share image for key views.
8. Explain samples, uncertainty and limits in plain language, with toggles for alternative samples.

### 2.3 User classes

| User class | Goal | Typical session | Priority |
| --- | --- | --- | --- |
| Curious reader | "Is that rude where I live?" Quick, shareable insight | 2–5 min, often on a phone, arrives via a shared link | Primary |
| Engaged explorer | Compare societies and find surprises | 10–30 min on a laptop | Primary |
| Educator or student | Use views in class on culture and norms | 15–45 min, projector or laptop | Secondary |
| Journalist or researcher | Check a claim, read the method, cite the source | 5–15 min, reads method notes | Secondary |
| Maintainer (you) | Rebuild data, fix bugs, deploy | Occasional | Internal |

The interface is designed for the general public first: plain-language labels and a story on top, method and uncertainty one click away.

### 2.4 Operating environment

- **Browsers:** the two latest major versions of Chrome, Edge, Firefox and Safari, including Safari on iOS and Chrome on Android.
- **Screens:** 320 px to 2560 px wide; touch, mouse and keyboard input.
- **Network:** usable on a mid-range phone over a 4G connection.
- **Build:** Python 3.12 or later for the data pipeline; Node.js active LTS for the site build; both run locally and in GitHub Actions.
- **Runtime:** no server code. The host serves static files over HTTPS.

### 2.5 Design and implementation constraints

| ID | Constraint |
| --- | --- |
| C-1 | Hosting shall use a free tier only, at the host's free subdomain. No domain is purchased. |
| C-2 | The site shall be fully static: no backend, database, serverless function or paid service. |
| C-3 | The front end shall use Svelte (SvelteKit with static prerendering) and D3 for charts. |
| C-4 | The data pipeline shall be written in Python. |
| C-5 | Only aggregates shall be published. No respondent-level row, free text or exact identifier from GSN shall reach the repository or the site. |
| C-6 | The 2000–2003 survey shall be used only as society-cell aggregates, labelled with their provenance; no row of that file shall be published. |
| C-7 | Attribution under CC BY 4.0 shall appear on every page and in every share image. |
| C-8 | The interface shall be English only. |
| C-9 | There shall be no data downloads in v1. |
| C-10 | The code repository shall be public under the MIT license. |
| C-11 | The site shall set no cookies and collect no personal data; analytics shall be cookie-less (Cloudflare Web Analytics). |
| C-12 | Quiz answers shall stay in the browser and never be transmitted. |
| C-13 | The plan assumes one developer working 10–20 hours a week. |

### 2.6 Assumptions and dependencies

- The OSF files remain available and unchanged; the pipeline pins file versions by checksum and fails loudly if they change.
- The paper's sample definitions can be reproduced from flags in the data (confirmed in §4).
- The chosen host's free tier, and Cloudflare Web Analytics, stay free on their current terms (§8).
- Society names, coordinates and regions come from the GSN files; map outlines come from a public-domain source (Natural Earth).
- Fonts are self-hosted or system fonts, so no third-party font service is contacted.

## 3. System architecture

&#91;embedded content: system architecture · 3 stages, 12 components\]

The privacy gate is the one point every number passes through: nothing reaches the repository, and so nothing reaches the site, unless it is an aggregate above the minimum sample size.

### 3.1 Technology choices

| Layer | Choice | Reason |
| --- | --- | --- |
| Front end | Svelte 5 with SvelteKit and its static adapter | Prerendered routes for share cards; small bundles |
| Charts | D3 modules (scale, shape, axis, geo, force for the beeswarm) | Custom charts with full control of marks and accessibility |
| Map | d3-geo with Natural Earth 1:110m outlines as TopoJSON | Public domain and small |
| Data pipeline | Python 3.12+, DuckDB and pandas, NumPy | Fast enough for 850,000-row files on a laptop |
| Validation | pandera schemas and pytest | Fails the run on any schema, count or privacy breach |
| Share images | Rendered at build time from SVG templates (for example Satori with resvg) | Static PNGs; no server |
| Tests | pytest, Vitest, Playwright, axe-core, Lighthouse CI | See §9 |
| Hosting | GitHub Pages through GitHub Actions | See §8 |
| Analytics | Cloudflare Web Analytics (GoatCounter as fallback) | Free and cookie-less |

### 3.2 Repository layout

```text
etiquette-atlas/
  pipeline/            Python package: download, validate, estimate, export
  data/raw/            OSF downloads (git-ignored, never committed)
  data/derived/        committed aggregate JSON (the DR outputs in §4)
  site/                SvelteKit app
    src/routes/        one folder per route in §6.1
    src/lib/charts/    D3 chart components
    static/            map TopoJSON, fonts, favicon
  tests/               pytest, Vitest and Playwright suites
  .github/workflows/   ci.yml, deploy.yml, pipeline.yml
  LICENSE              MIT
```

## 4. Data requirements

All figures in this section were measured from the OSF files on 22 October 2026, after checking each download against OSF's MD5 hash. The deposit's README is incomplete and names files that do not exist, so file names here follow the OSF listing ([OSF API](https://api.osf.io/v2/nodes/sh4rb/files/osfstorage/)).

### 4.1 Source files

The GSN deposit is CC BY 4.0, DOI [10.17605/OSF.IO/SH4RB](https://doi.org/10.17605/OSF.IO/SH4RB). The pipeline reads five of its 17 files.

| File | Rows × columns | Size | Used for | MD5 to pin |
| --- | --- | --- | --- | --- |
| [gsn-situations-clean-long.csv](https://osf.io/download/q3hcv/) | 851,121 × 81 | 366.9 MB | Appropriateness ratings, one row per respondent × situated behavior | `8996033995a219a5cfb3c4a51699bcf4` |
| [gsn-contexts-clean-long.csv](https://osf.io/download/u6bvf/) | 421,332 × 54 | 107.3 MB | Audience and actor-gender ratings | `9d4608680300453ecc4fe25191896f0f` |
| [everyday-norms-2011-clean.csv](https://osf.io/download/udy8q/) | 647,466 × 8 | 25.1 MB | 2000–2003 comparison (aggregates only) | `9f8df6d61154102e49e99e09885bb202` |
| [imputed-ind-data-attention-check.csv](https://osf.io/download/2g5m3/) | 15,599 × 43 | 2.6 MB | Respondent list of the attention-check sample (cross-check) | Read from the OSF API at pin time |
| [individual-data-prereg.csv](https://osf.io/download/25qup/) | 17,288 × 44 | 3.2 MB | Respondent list of the paper's model sample (cross-check) | Read from the OSF API at pin time |

The exact wording of every item is in the survey instrument `GSEN_survey.pdf` on the companion OSF project [xv2g6](https://osf.io/xv2g6/).

### 4.2 The grid: 15 behaviors × 10 situations

Cells are keyed by `behavior` and `situation` IDs, never by item numbers. Item text is "\[behavior phrase\] \[situation phrase\]", stored in `scenario`.

| `behavior` | Wording in items | In 2000–2003 data |
| --- | --- | --- |
| argue | argue | Yes |
| laugh | laugh out loud | Yes |
| curse | curse/swear (use foul language) | Yes |
| kiss | kiss (on the mouth) | Yes |
| cry | cry (shed tears) | Yes |
| sing | sing | Yes |
| talk | talk (have a conversation) | Yes |
| flirt | flirt | Yes |
| listen | listen to music on headphones | Yes |
| bargain | bargain (exchange goods, services, or privileges) | Yes |
| readnewspaper | read the newspaper | Yes |
| eat | eat | Yes |
| rest | rest (stay still, close one's eyes, and relax) | No |
| shout | shout in anger | No |
| usemphone | use a mobile phone | No |

| `situation` | Wording in items |
| --- | --- |
| funeral | at a funeral ceremony |
| sidewalk | on a city sidewalk |
| library | in the library |
| workplace | at the workplace |
| job\_interview | in a job interview |
| restaurant | in a restaurant |
| public\_park | in a public park |
| bus | on a bus |
| movies | at the movies |
| party | at a party |

URL slugs use these IDs with hyphens, for example `/explore/usemphone/funeral` and `/explore/kiss/job-interview`.

### 4.3 Response scale

Respondents rated each situated behavior from 1 to 6: extremely inappropriate, very inappropriate, somewhat inappropriate, somewhat appropriate, very appropriate, extremely appropriate. Both GSN files store 1–6; the pipeline recodes them as `rating − 3.5`, giving −2.5 to +2.5 as in the paper. The 2000–2003 file is already recoded.

There is no neutral option: 0 falls between "somewhat inappropriate" and "somewhat appropriate". The colour scale is centred there, and the plain-language metric is the share choosing 4, 5 or 6 ("appropriate").

### 4.4 Societies, regions and samples

- **Society key:** `code`, ISO 3166 alpha-3 plus `XKX` for Kosovo. "Caribbean" is one pooled society (Trinidad and Tobago, Jamaica, Grenada, Belize) coded `TTO`. Display names follow the authors: "Mainland China" and "Somaliland" (the Somalia site is Hargeisa).
- **Keying traps:** Namibia's ISO2 code is the literal `NA`, which R writes for missing values; the WVS file uses non-ISO codes; Kosovo has no coordinates, so its map position is added manually.
- **Regions:** the authors' four-way grouping (Africa 16, Asia 22, Latin America 14, West 38 societies) is used only for colour and labelled as the authors' grouping. It is a convenience recode with known oddities (Russia and Israel in West, Turkey in Asia).
- **Sites:** the 125 collection sites (2 to 659 respondents) are never shown; they are quasi-identifying.
- **Student status:** the `student` field has no question in the instrument and is mostly constant within a site, so it is shown only as each society's student share, never as a filter.

| Sample (toggle label) | Respondents | Societies | Rule | Default |
| --- | --- | --- | --- | --- |
| All data | 25,422 | 90 | Everyone with at least one appropriateness rating | Yes |
| Paper's sample | 18,656 | 71 | Started before 1 March 2024 (Stockholm time), excluding Kuwait; the sample behind the paper's Figs. 2, 3 and 5 and Table 1 | No |
| Attention check | 15,599 | 80 | `att_check_commit == 1`, excluding the 10 societies the authors dropped (Benin, Mauritius, Central African Republic, Mongolia, Peru, Chad, Ethiopia, Somalia, Algeria, Namibia) | No |

The paper's mixed models use a further complete-case sample (17,288 respondents, 71 societies); the method page mentions it, but it is not a toggle. When the paper's sample is active, the 19 societies outside it show as "not in this sample".

### 4.5 Data requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| DR-1 | The pipeline shall verify each input file's MD5 against the pinned value and stop on any mismatch. | Must |
| DR-2 | GSN ratings shall be recoded as `rating − 3.5`; the 2000–2003 file shall be used as stored. | Must |
| DR-3 | The pipeline shall rebuild the three samples in 4.4 and stop unless it reproduces 25,422 / 90, 18,656 / 71 and 15,599 / 80. | Must |
| DR-4 | For each sample × society × cell it shall output n, mean, SD and the count of each of the six responses. | Must |
| DR-5 | Intervals shall be 95% percentile bootstrap intervals with 2,000 replicates and a fixed seed, resampling respondents within each society, so that a respondent's many ratings move together. | Must |
| DR-6 | Society–cell means shall be shrunk toward the global cell mean by empirical Bayes: weight = τ² / (τ² + SE²), where τ² is that cell's between-society variance estimated by the method of moments (floored at 0). Raw and shrunken values shall both be output. | Must |
| DR-7 | The global cell mean shall be the unweighted mean of society means, as in the paper, with a bootstrap interval. | Must |
| DR-8 | Disagreement for a cell shall be τ, the between-society SD after removing sampling error, with a bootstrap interval; the raw SD of society means shall also be output. | Must |
| DR-9 | No published value may describe fewer than 10 respondents. Society–cell estimates with n from 10 to 29 shall carry a small-sample flag. Under All data, 376 of 13,468 society–cells (2.8%) fall below 10; Mongolia (16 respondents) and Namibia (18) fall below 10 in nearly every cell. | Must |
| DR-10 | A centered score shall subtract each society's mean over all its cells and add back the overall mean, for the scale toggle (FR-5). The method page shall note that this is the atlas's addition; the paper applies no scale-use correction. | Should |
| DR-11 | Each society–cell and global cell shall also carry the share of ratings of 4–6. | Must |
| DR-12 | Context aggregates shall cover 15 behaviors × 5 contexts: three audiences (alone, colleagues/classmates, management/professors) and two actor genders (a man, a woman). They shall be output globally and per society, and by respondent gender only globally. | Must |
| DR-13 | Change aggregates shall cover the overlapping 12 behaviors × 10 situations in 26 societies (22 in the paper's sample): n, mean and SD per wave and the difference with a bootstrap interval. No 2000–2003 row shall be exported. | Must |
| DR-14 | Society similarity shall be the Pearson correlation of two societies' shrunken, centered cell estimates over cells both have (at least 120 of 150); the top five per society shall be output. | Must |
| DR-15 | Society metadata shall hold code, display name, region, map coordinates, respondents by sample, student share, interface languages and fieldwork period (first and last month). UNDP, IMF and WVS covariates shall not be shipped in v1, as their terms are unverified. | Must |
| DR-16 | No output shall contain ResponseId, StartDate, EndDate, Duration, Progress, the free-text `belief_god_orig`, `site`, `country_carib`, exact age or any respondent-level row. The privacy scan shall fail the build if any appears. | Must |

### 4.6 Derived outputs and sizes

| Output | Grain | Rows (All data) | Compressed size |
| --- | --- | --- | --- |
| Society–cell estimates and response counts | sample × society × cell | 13,468 | About 135 KB per sample as columnar JSON, including response counts |
| Global cell summaries | sample × cell | 150 | About 5 KB |
| Context aggregates | society × behavior × context | 6,735 | About 36 KB |
| Change aggregates | society × cell, overlapping only | 3,119 (2,639 in the paper's sample) | About 35 KB per sample |
| Similarity lists | sample × society | 90 | Under 5 KB |
| Society metadata | society | 90 | About 6 KB |

The core payload for the default sample is about 215 KB compressed; all three samples together are under 1 MB, loaded per sample on demand. Map outlines are extra.

### 4.7 What the data cannot support in v1

- **Concern and commonness by society:** about 3–4 respondents per society–cell, so these are left out of v1 (they could appear globally later, with 310–396 respondents per cell).
- **Respondent gender within a society:** median 11 respondents per society × behavior × context cell, so gender splits are global only.
- **Change in individuals:** the 2000–2003 and 2023–2024 data are different people, instruments and eras, so the module shows differences between surveys.

### 4.8 Caveats the method page must state

- Samples are mostly convenience samples and student-heavy (about 55% students); labels say "respondents in Chile", not "Chileans".
- Fieldwork ran from 14 July 2023 to 31 May 2024; the comparison data were collected in 2000–2003 (Gelfand et al. 2011).
- The paper found norms vary "far more across situations than across societies": in its model the society SD is 0.19, against 0.31 for situated behaviors and 1.11 residual. The story shall lead with this finding.
- Measurement invariance was tested only for the values scale, not for appropriateness ratings.
- The companion README calls the Gelfand individual-level file "not public (it was provided privately)", which is why only aggregates of it are shown ([xv2g6 README](https://osf.io/download/wpq5r/)).

## 5. Functional requirements

Requirements are grouped by module. Data definitions (behavior and situation labels, audiences, samples, estimators) are in §4; interface layout is in §6.

### 5.1 App shell and global controls

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The home route shall open the quiz entry, with a visible "Skip to the atlas" link that goes straight to the matrix. | Must |
| FR-2 | A persistent header shall link to: Explore (matrix), Societies (fingerprint), Audiences, Change, Story and Method. | Must |
| FR-3 | A global society picker shall support type-ahead search by society name and full keyboard use. The selected society shall be highlighted in every view and kept in the URL. | Must |
| FR-4 | A global sample toggle shall switch every view between the default sample (All data, 90 societies) and the alternatives in §4. A badge shall show when a non-default sample is active. | Must |
| FR-5 | A scale toggle shall switch between raw scores and within-society centered scores, so differences in how societies use the scale are not mistaken for culture. | Should |
| FR-6 | Every page shall show the attribution footer defined in NFR-40. | Must |
| FR-7 | Every chart shall have an "About this chart" control that opens the matching method note. | Should |

### 5.2 Etiquette matrix (Explore)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-10 | The matrix shall show 15 behaviors × 10 situations. Each cell's fill shall encode the global mean appropriateness on a diverging scale centred on the scale midpoint. | Must |
| FR-11 | Each cell shall also encode disagreement (the between-society spread, §4) with a second mark that does not depend on colour alone. | Must |
| FR-12 | Rows and columns shall be sortable by paper order, mean, disagreement and name. | Must |
| FR-13 | Hover or keyboard focus on a cell shall show: behavior, situation, global mean with 95% interval, disagreement with 95% interval, number of societies and total respondents. | Must |
| FR-14 | Click, tap or Enter on a cell shall open its drill-down (5.3). | Must |
| FR-15 | With a society selected, each cell shall show whether that society is stricter, looser or close to the global mean. | Should |
| FR-16 | The most universal and most culture-dependent cells shall be labelled on the matrix. | Should |
| FR-17 | Below 640 px wide, the matrix shall become a sortable list of the 150 cells with an inline mean bar and disagreement mark. | Must |

### 5.3 Cell drill-down and map

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-20 | A beeswarm shall place each society by its estimate for the cell, with its 95% interval shown on hover or focus, and as whiskers when "Show uncertainty" is on. | Must |
| FR-21 | Society dots shall be coloured by region and their sample size shown in the tooltip. | Must |
| FR-22 | A toggle shall switch between shrunken (default) and raw estimates; societies with small samples shall carry a visible flag. | Must |
| FR-23 | The global mean shall be drawn as a reference line, with the disagreement interval as a band. | Must |
| FR-24 | A dot map shall place each society at its GSN coordinates, coloured by the same estimate; hover and selection shall be linked both ways with the beeswarm. | Must |
| FR-25 | The selected society shall be labelled with its rank, e.g., "12th most accepting of 90". | Must |
| FR-26 | A strip shall show the same behavior across all 10 situations, and next/previous controls shall move between cells. | Should |
| FR-27 | A society–cell estimate below the minimum sample size (DR-9) shall be shown as "too few responses", not plotted. | Must |

### 5.4 Society fingerprint (Societies)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-30 | For the selected society, a 15 × 10 matrix shall show each cell's deviation from the global mean on a diverging scale. | Must |
| FR-31 | Cells where the society's interval excludes the global mean shall be marked as notably stricter or looser. | Must |
| FR-32 | The five most similar societies (DR-14) shall be listed with a similarity score; selecting one switches the view. | Must |
| FR-33 | A compare mode shall show two societies cell by cell as a dumbbell list. | Should |
| FR-34 | A facts panel shall show the society's respondents, sites, student share, interface languages and fieldwork period. | Must |

### 5.5 "Who's watching?" (Audiences)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-40 | For a selected behavior, a slopegraph shall show acceptability across the three audiences in the contexts file: alone, colleagues or classmates, and management or professors (§4). | Must |
| FR-41 | Small multiples shall show all behaviors, sortable by the size of the audience effect. | Must |
| FR-42 | Filters shall switch between the global view and one society. A toggle shall compare the behavior done by a man versus a woman, labelled as actor gender, not as an audience. A respondent-gender split shall be offered for the global view only (DR-12). | Should |
| FR-43 | The module shall credit the 2026 *American Sociological Review* analysis of these audience effects. | Must |

### 5.6 "Change since the early 2000s" (Change)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-50 | For overlapping societies and cells, an arrow or dumbbell shall run from the 2000–2003 aggregate to the 2023–2024 aggregate. | Must |
| FR-51 | A summary shall count cells and societies that became more permissive or stricter, beyond their intervals. | Must |
| FR-52 | The module shall state that samples, instruments and eras differ, that values are survey-to-survey differences rather than change in individuals, and that only aggregates of the 2000–2003 data are shown. | Must |
| FR-53 | When the selected society has no 2000–2003 data, the module shall say so and show the global comparison instead. | Must |

### 5.7 Quiz and guided story

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-60 | The quiz shall ask the reader to rate three situated behaviors on the GSN response scale. The three items shall be set in a configuration file. | Must |
| FR-61 | After each answer, the page shall show where it falls among the 90 society estimates and, if a society is chosen, among that society's response distribution. | Must |
| FR-62 | The reader may pick their society before the quiz, or skip it. | Should |
| FR-63 | Answers shall live only in page memory (and sessionStorage, to survive a reload). They shall never be sent, logged or included in analytics or URLs. | Must |
| FR-64 | A guided story of four to six scroll steps shall open with the paper's main finding, that norms vary far more across situations than across societies, then annotate the most universal cell, the most culture-dependent cell, the audience effect and the largest change since the early 2000s, and hand over to the explorer. | Must |
| FR-65 | The story shall be skippable at every step, fully keyboard operable, and shall respect reduced-motion settings. | Must |

### 5.8 Method and about

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-70 | A method page shall explain, in plain language, the data source, samples, scale, estimators, intervals, shrinkage, disagreement, the 2000–2003 comparison and the limits of convenience samples. | Must |
| FR-71 | The method page shall include per-society sample size, student share and interface languages, and the effect of each sample toggle. | Must |
| FR-72 | The method page shall list the OSF file versions and checksums, the pipeline version and the build date. | Should |
| FR-73 | No text on the site shall claim a cause for differences between societies. | Must |

### 5.9 URLs, sharing and navigation

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-80 | Every view's state (module, cell, society, sample, scale, sort) shall be encoded in the URL, and opening that URL shall restore the view exactly. | Must |
| FR-81 | A "Copy link" control shall copy the current permalink. | Must |
| FR-82 | Share images shall be prebuilt for the home page, each module, each of the 150 cells and each of the 90 societies. | Must |
| FR-83 | Each prerendered route shall carry its own title, description and share-image meta tags, readable without JavaScript. | Must |
| FR-84 | Browser back and forward shall move between view states. | Must |
| FR-85 | A custom 404 page shall link back to the atlas. | Must |
| FR-86 | If a data file fails to load, the view shall show a plain message and a retry control. | Must |
| FR-87 | Without JavaScript, each route shall show a prerendered text summary and a note that the charts need JavaScript. | Should |

### 5.10 Analytics

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-90 | Every page shall load the Cloudflare Web Analytics beacon, which sets no cookies, to count page views. | Must |
| FR-91 | No custom analytics event shall carry quiz answers or any reader input. | Must |
| FR-92 | The method page shall state what analytics collects and link to Cloudflare's privacy terms. | Must |

## 6. User interface and interaction

### 6.1 Routes and screens

Entities that need their own share image (cells, societies, behaviors) live in the URL path, because prerendered meta tags cannot vary by query string. Toggles live in the query string. All routes sit under the host's base path (for example `/etiquette-atlas/` on a project site).

| Route | Screen | Main content | Key controls |
| --- | --- | --- | --- |
| `/` | Home and quiz | Title, one-line promise, three quiz questions, result reveal | Society picker, Skip to the atlas |
| `/story` | Guided story | Four to six annotated scroll steps | Next, Skip, progress dots |
| `/explore` | Etiquette matrix | 15 × 10 matrix (list on phones), cell summary panel | Sort, sample, scale, society |
| `/explore/[behavior]/[situation]` | Cell drill-down | Beeswarm, dot map, behavior strip across situations | Raw/shrunken, uncertainty, previous/next |
| `/societies` and `/societies/[society]` | Society fingerprint | Deviation matrix, most similar societies, facts panel | Compare with…, sample, scale |
| `/audiences` and `/audiences/[behavior]` | Who's watching? | Small multiples, focused slopegraph | Society/global, gender, sort |
| `/change` and `/change/[society]` | Change since the early 2000s | Arrow chart of overlapping cells, summary counts, provenance note | Society, sort |
| `/method` | Method and about | Plain-language method, per-society table, versions, attribution, analytics note | Anchored sections |
| `/404` | Not found | Message and link home | — |

Query parameters: `society`, `sample`, `scale` (`raw` or `centered`), `sort`, `compare`. Unknown or invalid values fall back to defaults without an error.

### 6.2 Layout and breakpoints

| Width | Layout |
| --- | --- |
| ≥ 1024 px | Header with module tabs; control bar under it; main chart left, detail panel right (about 320 px) |
| 640–1023 px | Header collapses to a menu; detail panel moves below the chart |
| < 640 px | Matrix becomes a list; details open in a bottom sheet; society picker stays reachable in a sticky bar; map shrinks to full width under the beeswarm |

No view shall scroll horizontally at any width from 320 px.

### 6.3 Interaction rules

- Hover or focus previews; click, tap or Enter selects or opens. On touch, the first tap shows the tooltip and the second opens.
- Escape closes tooltips, sheets and the compare picker.
- Every interactive mark is reachable by keyboard in a logical order, with a visible focus ring.
- Selecting a society, sample or scale updates all linked views and the URL together.
- Transitions last 300 ms or less and are switched off under `prefers-reduced-motion`.

### 6.4 Visual design

- **Appropriateness colour:** a colour-blind-safe diverging palette (for example blue for appropriate, orange for inappropriate), neutral at the scale midpoint, identical across modules.
- **Disagreement:** encoded by size or a ring, never by a second hue alone.
- **Regions:** four categorical colours, also distinguishable in greyscale or by shape on the map.
- **Themes:** light and dark, following the system setting, with a manual switch.
- **Type:** one self-hosted sans-serif family or the system font stack; body text at least 16 px.
- **Share images:** 1200 × 630 px, with the view's headline finding, a simplified chart and the attribution line.

### 6.5 Language and numbers

- Use the GSN response labels ("extremely inappropriate" to "extremely appropriate", §4.3) rather than raw scores wherever possible.
- Show scores on the −2.5 to +2.5 scale with one decimal, and alongside them the share of respondents choosing one of the three "appropriate" points.
- Name societies as "respondents in Chile", not "Chileans", to reflect convenience samples.
- Write headlines as observations ("Phones at funerals divide societies most"), never as causes.

## 7. Non-functional requirements

### 7.1 Performance

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-1 | Any route's first load shall transfer at most 200 KB of compressed JavaScript and CSS and at most 300 KB of compressed data. | Must |
| NFR-2 | On Lighthouse's mobile profile, every route shall score Largest Contentful Paint ≤ 2.5 s, Cumulative Layout Shift ≤ 0.1 and Total Blocking Time ≤ 200 ms. | Must |
| NFR-3 | Data for the map, audiences, change and response distributions shall load only when a view needs it. | Must |
| NFR-4 | Changing the society, sample or scale shall redraw all visible views within 100 ms on a laptop and 300 ms on a mid-range phone. | Should |
| NFR-5 | The whole deployed site, including share images, shall stay under 60 MB, with no single file over 5 MB. | Must |

### 7.2 Accessibility

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-10 | The site shall conform to WCAG 2.2 level AA. | Must |
| NFR-11 | Every chart shall have a one-sentence text summary and a "Show as table" control that renders its values as an accessible table. | Must |
| NFR-12 | Text shall meet 4.5:1 contrast and chart marks 3:1 against their background; no information shall rely on colour alone. | Must |
| NFR-13 | All functions shall work by keyboard alone, and core flows shall be checked with VoiceOver and NVDA. | Must |
| NFR-14 | Pages shall stay usable at 200% zoom and respect reduced-motion and colour-scheme settings. | Must |

### 7.3 Compatibility

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-20 | The site shall work in the browsers listed in §2.4. | Must |
| NFR-21 | The site shall work at widths from 320 px to 2560 px without horizontal scrolling. | Must |

### 7.4 Privacy and security

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-30 | The site shall set no cookies. Browser storage shall hold only the theme choice (localStorage) and quiz answers (sessionStorage). | Must |
| NFR-31 | Apart from the analytics beacon, the site shall make no request to any third party. | Must |
| NFR-32 | A Content Security Policy shall limit scripts and connections to the site itself and the analytics beacon. Where the host cannot set headers, it shall be set by a meta tag. | Must |
| NFR-33 | Continuous integration shall run dependency audits (npm and pip) and automated dependency updates. | Should |
| NFR-34 | The method page shall carry a short privacy notice covering analytics, storage and the absence of personal data. | Must |

### 7.5 Licensing and attribution

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-40 | Every page and share image shall attribute the data: authors, title, year, OSF link, the CC BY 4.0 license with a link, and a note that values are aggregated and modelled by the atlas. | Must |
| NFR-41 | The change module shall credit Gelfand et al. (2011) and the GSN authors for the 2000–2003 comparison data. | Must |
| NFR-42 | The repository shall carry an MIT LICENSE file and a list of third-party licenses (Svelte, D3, Natural Earth and others used). | Must |

### 7.6 Reliability and maintainability

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-50 | The pipeline shall be deterministic: fixed random seeds, pinned dependencies and identical outputs for identical inputs. | Must |
| NFR-51 | The pipeline shall validate input schemas and reproduce the paper's sample counts and selected published values within tolerance, or stop the build. | Must |
| NFR-52 | Raw OSF files shall stay out of the repository; only derived aggregates (DR outputs) are committed. | Must |
| NFR-53 | The front end shall use TypeScript, linting and formatting; the pipeline shall use Ruff and type hints. Estimator code shall have unit tests covering at least 80% of lines. | Should |
| NFR-54 | The README shall document setup, running the pipeline, building, deploying and how to change quiz items. | Must |

### 7.7 Discoverability

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-60 | The build shall emit a sitemap, a robots.txt and canonical URLs on the free subdomain. | Should |
| NFR-61 | Share images shall render correctly in the major social-card validators before launch. | Should |

## 8. Hosting and deployment

### 8.1 Decision

The atlas shall be hosted on **GitHub Pages** from a public repository, deployed by a custom GitHub Actions workflow, at `https://<owner>.github.io/etiquette-atlas/`. This costs nothing, needs no account beyond GitHub, and needs no purchased domain; HTTPS comes with the github.io subdomain ([GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)).

The fallback is **Cloudflare Workers static assets** at `<worker>.<account>.workers.dev`, deployable from the same workflow. It is used only if traffic outgrows GitHub's soft bandwidth limit, because changing hosts without a custom domain changes the URL.

Other free hosts were rejected: Netlify Free pauses every site on the account at about 300 credits a month; Vercel Hobby is non-commercial and blocks organisation repositories; Codeberg's older Pages service stops serving on 31 December 2026; Hugging Face Spaces treats "irrelevant data" as abuse.

### 8.2 Free-tier limits that bind the design

| Limit (GitHub Pages and GitHub) | Value | Atlas budget | Source |
| --- | --- | --- | --- |
| Published site size | 1 GB | ≤ 60 MB (NFR-5) | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| Bandwidth | About 100 GB a month (soft) | 1–2 MB per typical visit, so roughly 50,000–100,000 visits a month | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| Deploy timeout | 10 minutes | Build finishes in under 5 minutes; share images cached | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| Builds per hour | 10 (soft), not applied to custom Actions workflows | Deploy only on merges to `main` | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| Repository visibility | Public required on GitHub Free | Public, MIT licensed (C-10) | [About Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) |
| File size in Git | Blocked above 100 MiB; Git LFS cannot serve Pages | No served file over 5 MB; no LFS | [Large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) |
| Actions minutes | Free for public repositories | All CI and pipeline jobs | [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| Use restriction | Not for online business or e-commerce | Non-commercial, informational site | [About Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) |

### 8.3 Hosting requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| HR-1 | All asset, data and link URLs shall respect the `/etiquette-atlas/` base path (SvelteKit `paths.base`). | Must |
| HR-2 | The build shall use SvelteKit's static adapter with one prerendered `index.html` per route and a root `404.html`. | Must |
| HR-3 | All JavaScript, CSS and data files shall have content-hashed names, because GitHub Pages fixes `Cache-Control` at `max-age=600` and allows no custom headers. | Must |
| HR-4 | Data shall ship as minified JSON or CSV so GitHub Pages' gzip applies; no served file shall exceed 5 MB. | Must |
| HR-5 | Redirects, if ever needed, shall be client-side pages; the app shall not rely on server rewrites. | Must |
| HR-6 | "Enforce HTTPS" shall be enabled in the repository's Pages settings. | Must |
| HR-7 | The Content Security Policy shall be set with a `<meta>` tag, since GitHub Pages cannot send headers. | Must |
| HR-8 | The privacy notice shall state that GitHub, as host, logs visitor IP addresses. | Must |
| HR-9 | The deploy workflow shall also be able to publish the same build to the Cloudflare fallback, with its token stored as a repository secret. | Could |

The compression, cache and plain-HTTP behaviours above were observed on live github.io sites in October 2026, not documented guarantees.

### 8.4 Workflows

| Workflow | Trigger | Steps |
| --- | --- | --- |
| `ci.yml` | Every pull request | Lint and type-check; Python and Vitest unit tests; build; Playwright end-to-end, visual and axe tests; Lighthouse CI and size budgets |
| `deploy.yml` | Merge to `main` | Build (share images restored from cache when data and templates are unchanged) → `upload-pages-artifact` → `deploy-pages` |
| `pipeline.yml` | Manual | Download OSF files → verify checksums → run the pipeline and validations → open a pull request that updates `data/derived/` only |

Raw OSF files are cached privately in GitHub Actions or kept locally; they are never committed (NFR-52).

### 8.5 Analytics setup

Cloudflare Web Analytics is free, sets no cookies and works on sites not hosted by Cloudflare through a JavaScript beacon, for up to 10 such sites ([Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/); [limits](https://developers.cloudflare.com/web-analytics/limits/)). Its docs do not say whether a `*.github.io` hostname is accepted, so this is checked in the first milestone.

If it is not accepted, the site shall switch to GoatCounter, which is also free and cookie-less and works on any host ([GoatCounter](https://www.goatcounter.com/)). The CSP shall allow only the chosen beacon's script and reporting hosts.

## 9. Verification and acceptance

v1 is accepted when every Must requirement passes its test below and the launch checklist (9.4) is complete.

### 9.1 Test levels

| Level | What it checks | Tooling | When |
| --- | --- | --- | --- |
| Estimator unit tests | Means, bootstrap intervals, shrinkage, disagreement and similarity on small synthetic fixtures with known answers | pytest | Every commit |
| Pipeline validation | Sample counts, 90 societies, 150 cells, selected published values within ±0.02, output schemas | pytest and schema checks | Every pipeline run |
| Privacy scan | No forbidden columns (IDs, free text, exact age, location below society) and no cell below the minimum n in any output | Custom script | Every pipeline run and build |
| Front-end unit tests | URL state round trip, sorting, number formatting, similarity ranking | Vitest | Every commit |
| End-to-end tests | Quiz → story → explore; permalink restore; back and forward; keyboard-only path | Playwright | Every pull request |
| Visual regression | Each module at 360, 800 and 1280 px, light and dark | Playwright screenshots | Every pull request |
| Accessibility | Zero serious or critical findings; manual screen-reader checklist | axe-core in Playwright; VoiceOver and NVDA | Every pull request; manual before launch |
| Performance | Budgets in NFR-1, NFR-2 and NFR-5 on five representative routes | Lighthouse CI; size check | Every pull request |
| Links and metadata | Every route has a title, description and existing share image; no broken links | Build script; link checker | Every build |

### 9.2 Acceptance tests

| ID | Test | Verifies |
| --- | --- | --- |
| AT-1 | Open `/explore` under Lighthouse's mobile profile: Largest Contentful Paint ≤ 2.5 s, and the list shows all 150 cells with mean and disagreement marks. | FR-10, FR-11, FR-17, NFR-2 |
| AT-2 | Open a cell URL with `society` and `sample` set in a fresh browser: that society is highlighted and ranked, the sample badge shows, and suppressed societies read "too few responses". | FR-4, FR-20–FR-27, FR-80 |
| AT-3 | Answer the three quiz items: positions are shown; the network log contains no request carrying an answer; a reload keeps the answers and a new tab does not. | FR-60–FR-63, NFR-30, NFR-31 |
| AT-4 | Open `/change`: arrows, summary counts and the provenance note appear; a search of the built files finds no respondent-level 2000–2003 data. | FR-50–FR-53, C-6 |
| AT-5 | An automated check finds the attribution footer on every prerendered page; a manual check finds it on a sample of share images. | NFR-40, C-7 |
| AT-6 | axe-core reports zero serious or critical issues on every module route; a keyboard-only user completes quiz, story, matrix and drill-down. | NFR-10–NFR-13 |
| AT-7 | Share images exist for the home page, each module, all 150 cells and all 90 societies, and each route's meta tags point to its image. | FR-82, FR-83 |
| AT-8 | Two pipeline runs on the same inputs give byte-identical outputs, and the sample counts match the paper. | NFR-50, NFR-51 |
| AT-9 | The deployed site sets no cookie, and its only third-party requests go to the analytics beacon. | C-11, NFR-30–NFR-32, FR-90 |
| AT-10 | The deployed site is under 60 MB and its largest file under 5 MB. | NFR-5, C-1 |
| AT-11 | Selecting another society, sample or scale updates every visible view and the URL together; back and forward restore earlier states. | FR-3–FR-5, FR-84 |
| AT-12 | A content review of every page finds no causal wording and the "respondents in X" phrasing throughout. | FR-73 |

### 9.3 Traceability

| Area | Requirements | Acceptance tests |
| --- | --- | --- |
| App shell and global controls | FR-1–FR-7 | AT-2, AT-11 |
| Etiquette matrix | FR-10–FR-17 | AT-1 |
| Cell drill-down and map | FR-20–FR-27 | AT-2 |
| Society fingerprint | FR-30–FR-34 | AT-11, visual regression |
| Audiences | FR-40–FR-43 | End-to-end and visual regression |
| Change since the early 2000s | FR-50–FR-53, C-6 | AT-4 |
| Quiz and story | FR-60–FR-65 | AT-3, AT-6 |
| Method | FR-70–FR-73 | AT-12 |
| URLs and sharing | FR-80–FR-87 | AT-2, AT-7, AT-11 |
| Analytics and privacy | FR-90–FR-92, NFR-30–NFR-34 | AT-3, AT-9 |
| Performance | NFR-1–NFR-5 | AT-1, AT-10 |
| Accessibility | NFR-10–NFR-14 | AT-6 |
| Data integrity | DR-1–DR-16, NFR-50–NFR-52 | AT-8, privacy scan |
| Hosting | HR-1–HR-9, C-1, C-2 | AT-9, AT-10, link and metadata checks |

### 9.4 Launch checklist

- [ ] All Must requirements pass their tests
- [ ] Lighthouse, size and accessibility budgets met on the deployed URL
- [ ] Method page reviewed by a second reader for accuracy and plain language
- [ ] Attribution checked on pages and share images
- [ ] Analytics confirmed counting, with no cookies set
- [ ] Social cards checked for the home page, one cell and one society
- [ ] Optional courtesy note sent to the GSN authors with the link

## 10. Release plan

&#91;embedded content: release plan · 8 milestones over 18 weeks\]

The plan assumes about 15 hours a week, roughly 270 hours in all; at 10 hours a week it stretches to about 27 weeks, at 20 hours to about 14. The core explorer goes live without announcement in week 8, so every later module ships onto a working site.

| Milestone | Week | Exit criteria |
| --- | --- | --- |
| M0 Setup and data check | 2 | Repository, CI and a placeholder page on GitHub Pages; the paper's sample counts reproduced; analytics hostname confirmed (§8.5) |
| M1 Pipeline and privacy gate | 4 | All DR outputs generated; estimator tests and privacy scan pass |
| M2 Core live, not announced | 8 | FR-1 to FR-27 and FR-80 to FR-87 Must items pass; AT-1, AT-2, AT-11 |
| M3 Society fingerprint | 10 | FR-30 to FR-34 pass |
| M4 Who's watching? | 12 | FR-40 to FR-43 pass |
| M5 Change since the early 2000s | 13 | FR-50 to FR-53 pass; AT-4 |
| M6 Quiz and guided story | 15 | FR-60 to FR-65 pass; AT-3 |
| M7 Polish | 17 | Share images, method page, accessibility and performance audits; AT-5 to AT-10, AT-12 |
| Public launch | 18 | Launch checklist (§9.4) complete |

If the schedule slips, Should items move to v1.1 first; Must items and the launch checklist do not move.

## 11. Risks and open questions

### 11.1 Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R-1 | All four extra modules plus share images outgrow a 10–20 h/week schedule | High | Medium | Build in the milestone order of §10; Should items may slip to v1.1; Change and Audiences come after the core is live |
| R-2 | Readers take convenience, student-heavy samples as national norms | High | High | "Respondents in X" phrasing, each society's student share, method notes on every chart, no causal wording (FR-73) |
| R-3 | Small society samples give noisy estimates and unstable ranks | Medium | High | Shrinkage, intervals, minimum-n suppression (DR-9), and rank shown with its uncertainty |
| R-4 | Societies use the response scale differently, or translations shift meaning | Medium | Medium | Within-society centered toggle; method note on measurement invariance as reported by the authors |
| R-5 | The paper's samples cannot be rebuilt exactly from the data flags | Low | Medium | Reproduce counts first (NFR-51); use the authors' R scripts as reference; otherwise default to all respondents and say so |
| R-6 | The 2000–2003 comparison raises provenance or permission concerns | Medium | Medium | Aggregates only (C-6), clear provenance label, and a configuration switch that removes the module in one build |
| R-7 | The free host changes its terms or limits | Low | Medium | Plain static output that can move to another free host within an hour; no host-specific features in the app |
| R-8 | Moving hosts later breaks shared links | Low | Medium | Choose the host once at launch; if a move is needed, leave a redirect page at the old address |
| R-9 | Generating about 250 share images slows every build | Medium | Low | Generate them in a cached step that reruns only when data or templates change |
| R-10 | Beeswarm and map are hard to use with assistive technology | Medium | Medium | Text summaries and table views for every chart (NFR-11); manual screen-reader checks |
| R-11 | OSF files change or disappear | Low | High | Checksums in the pipeline, a private local archive of the raw inputs, and committed aggregates so the site still builds |
| R-12 | Ad blockers undercount analytics | High | Low | Accept; analytics is for rough trends only |
| R-13 | Someone publishes a similar interactive before launch | Low | Medium | Check again before launch; differentiate on disagreement, audiences and the reader's own position |

### 11.2 Open questions

- [ ] Which three cells should the quiz use? Proposal: decide after the first pipeline run, choosing one near-universal cell, one highly divisive cell and one with a surprising audience or change effect.
- [ ] Confirm the project slug `etiquette-atlas`, which sets the free URL.
- [ ] Send the GSN authors a courtesy note before launch, offering a preview and asking whether the OSF CC BY license covers the 2000–2003 extract? (Recommended; the license itself does not require it.)
- [ ] Share-image visual style: a quiet editorial look or a bolder, social-first look?

## Sources

Pages opened while writing this specification; data facts in §4 were measured from the OSF files on 22 October 2026.

**Data and paper**

- [GSN data and code, OSF sh4rb (CC BY 4.0)](https://osf.io/sh4rb/) · [file listing (OSF API)](https://api.osf.io/v2/nodes/sh4rb/files/osfstorage/) · [README](https://osf.io/download/asvz9/)
- [Eriksson et al. 2025, *Communications Psychology* 3:145](https://www.nature.com/articles/s44271-025-00324-4)
- [Main ratings file](https://osf.io/download/q3hcv/) · [Contexts file](https://osf.io/download/u6bvf/) · [2000–2003 comparison file](https://osf.io/download/udy8q/) · [Attention-check respondent list](https://osf.io/download/2g5m3/) · [Model-sample respondent list](https://osf.io/download/25qup/)
- [Companion tightness project, OSF xv2g6](https://osf.io/xv2g6/) · [its README](https://osf.io/download/wpq5r/)

**Hosting and analytics**

- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [Securing GitHub Pages with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [Custom 404 pages on GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)
- [Custom GitHub Actions workflows for Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) · [Git LFS and Pages](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/) · [billing and limits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) · [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/) · [limits](https://developers.cloudflare.com/web-analytics/limits/)
- [GoatCounter](https://www.goatcounter.com/)

**Licensing**

- [CC BY 4.0 deed](https://creativecommons.org/licenses/by/4.0/) · [legal code](https://creativecommons.org/licenses/by/4.0/legalcode.en) · [recommended attribution practice](https://wiki.creativecommons.org/wiki/Recommended_practices_for_attribution)
