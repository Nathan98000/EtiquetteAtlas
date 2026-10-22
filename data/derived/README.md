# data/derived

Aggregate outputs of the pipeline (SRS §4.6), committed and served by the site. Nothing here may
describe fewer than 10 respondents or carry a respondent-level field (DR-9, DR-16):
`uv run pipeline privacy-scan` checks every file in this folder, and CI runs it on every pull
request. Only JSON and CSV data files (plus this note) belong here.

Every JSON file is written by `uv run pipeline build`; never edit one by hand. A rebuild from the
same inputs and pipeline commit gives byte-identical files (NFR-50, AT-8). Import them through
Vite so they ship content-hashed (HR-3).

## Files

`<s>` is the sample: `all` (All data, the default), `paper` (Paper's sample) or `attention`
(Attention check). Sizes are gzip, All data.

| File | Rows | Loaded by | gzip |
| --- | --- | --- | --- |
| `manifest.json` | build settings and OSF checksums (FR-72) | method page | 1 KB |
| `societies.json` | 90 societies, plus per-sample facts (DR-15) | every route | 3 KB |
| `global-<s>.json` | 150 cells (DR-7, DR-8, DR-10, DR-11) | matrix | 3 KB |
| `cells-<s>.json` | societies × 150 cells (DR-4 to DR-6, DR-9, DR-11, FR-31) | drill-down, fingerprint | 113 KB |
| `distributions-<s>.json` | societies × 150 cells: SD and c1–c6 (DR-4) | quiz, on demand (NFR-3) | 90 KB |
| `similarity-<s>.json` | up to 5 pairs per society (DR-14) | fingerprint | 2 KB |
| `contexts-<s>.json` | societies × 15 behaviors × 5 contexts (DR-12) | audiences, on demand | 41 KB |
| `change-<s>.json` | overlapping societies × 120 cells (DR-13) | change, on demand | 37 KB |

## Conventions

- **Columnar tables.** A table is an object of equal-length arrays, one entry per row.
- **Dense grids.** A society × cell table has one row per society and cell, society-major:
  row `i` is society `societies.code[i // cells]` and cell `i % cells`. Cells are
  behavior-major in the `grid` order (`cell = behavior × width + situation`), which is the
  SRS order (§4.2) and the paper's order.
- **Scale.** Scores are on the −2.5 to +2.5 scale (DR-2); 0 lies between "somewhat
  inappropriate" and "somewhat appropriate".
- **Intervals** are 95% and stored as offsets from their estimate: the interval of `mean` is
  `[mean − mean_minus, mean + mean_plus]`; `shrunk_pm` is symmetric. Raw means, global means,
  τ and differences use bootstrap percentiles (DR-5); the shrunken estimate uses an
  empirical-Bayes interval (see `docs/method-notes.md`).
- **Rounding.** Scores, offsets, SDs and correlations to 2 decimals; shares (`share`,
  `student_share`, `student_unknown`) are whole percents; coordinates to 2 decimals.
- **Suppression (DR-9).** In a row with fewer than 10 respondents every value is null except
  `status`. Group sizes (`n`, `n0`, `n1`) are null or at least 10.
- **Status** (`cells` and `contexts`): `0` at least 30 respondents, `1` small sample (10–29,
  flag it), `2` too few responses (FR-27), `3` not asked (Kuwait: kiss and flirt; Saudi Arabia:
  kiss).
- **Months** are `YYYY-MM`; no file holds a time of day.

## Fields

`cells-<s>.json`
- `societies`: `code`, and the centering offsets `offset` (raw) and `offset_shrunk` (DR-10).
  The centered score (FR-5) is the estimate minus its society's offset; shift its interval the
  same way.
- `cells`: `n`, `mean`, `mean_minus`, `mean_plus`, `shrunk`, `shrunk_pm`, `share` (% rating 4–6),
  `status`, `notable` (FR-31: `1` notably looser, `-1` notably stricter, `0` neither; the
  interval of the society's difference from the global mean excludes 0).

`distributions-<s>.json`: `cells` holds `n`, `sd` and `c1`–`c6`, the number choosing each point
of the 1–6 scale; `c1`–`c6` add up to `n`.

`global-<s>.json`: per cell `n_societies` (societies with any rating, all of which count toward
the global values), `n` (respondents), `mean` and its offsets, `share` (mean of society shares),
`tau` and its offsets (disagreement, DR-8), `sd_between` (raw SD of society means), and the same
on the centered scale: `centered_mean`, `centered_tau` and its offsets, `centered_sd_between`.

`similarity-<s>.json`: `pairs` with `code`, `rank` (1–5), `other`, `r` (Pearson correlation of
the two fingerprints) and `n_cells` (shared publishable cells, at least 120). Societies with
fewer than 120 publishable cells have no rows.

`contexts-<s>.json`: `grid.contexts` lists the three audiences and two actor genders. `cells`
(societies × 75) holds `n`, `mean` and offsets, `share` and `status`; `global` (75 rows) and
`by_gender` (`gender` = `Woman` or `Man`, 75 rows each; respondent gender, global only) hold
`n_societies`, `n`, `mean` and offsets, and `share`.

`change-<s>.json`: `source` states the provenance (C-6, NFR-41). `cells` (societies × 120)
holds per wave `n0`, `mean0`, `sd0` (2000–2003) and `n1`, `mean1`, `sd1` (GSN), and `diff`
(GSN − 2000–2003) with offsets; a society–cell missing from either wave is null. `societies`
holds `n0` (2000–2003 respondents), the society's mean `diff` over its cells with offsets, and
`n_cells`. `global` (120 cells) holds `n_societies`, `mean0`, `mean1` and `diff` with offsets
(FR-53). `behaviors` (12 rows) reproduces the paper's Table 1 for the paper's sample: `mean`
change with offsets, `sd` across societies and `increased` (societies whose change is above 0).

`societies.json`: `societies` holds `code`, `name`, `region` (the authors' four-way grouping),
`lat` and `lon`. `samples.<s>` holds, in the same order, `n` (respondents, null when the society
is not in the sample), `student_share` and `student_unknown` (as stored in the GSN files),
`first_month` and `last_month` (the first and last month with at least 10 respondents starting),
and `languages` (interface languages used by at least 10 respondents, most used first).
