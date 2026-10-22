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
