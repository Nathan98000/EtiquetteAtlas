# Kickoff: The Etiquette Atlas, Milestone M1 (pipeline and privacy gate)

You are continuing work on **The Etiquette Atlas**, a free, static site built from aggregates of the
Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. This
session covers **Milestone M1**. Its exit criteria (SRS §10) are: all DR outputs generated, and
the estimator tests and privacy scan pass.

## 1. Read first, in this order

1. `CLAUDE.md`: rules, layout, commands and conventions. Follow it throughout.
2. `The Etiquette Atlas Software Requirements Specification.md`: the source of truth. Read §4 in
   full (data requirements), §9 (verification) and every FR that consumes M1 outputs (FR-10 to
   FR-34, FR-40 to FR-53, FR-61, FR-71).
3. `docs/reference/gsn-data-profile.md` (local only, git-ignored): §2.2, §2.3, §4, §6 and §7. It
   adds detail; where it seems to conflict with the SRS, tell me rather than choosing.
4. The M0 code: `pipeline/raw.py`, `pipeline/samples.py`, `pipeline/privacy.py` and their tests.

## 2. What M0 left you

- `uv run pipeline download | verify | samples | privacy-scan` work. The samples reproduce
  25,422 / 90, 18,656 / 71 and 15,599 / 80 exactly, and the 17,288 / 71 complete-case set
  matches the authors' list.
- `raw.py` builds these DuckDB tables. Respondent IDs never leave DuckDB.
  - `ratings(rid, code, behavior, situation, rating)`, recoded to −2.5…+2.5;
  - `respondents(rid, code, country, region, started_utc, att_check_commit, complete_case, n_ratings)`;
  - `context_ratings(rid, country, behavior, context, rating)`, recoded; it has no `code` column;
  - `gelfand_ratings(country, rid_in_country, behavior, situation, rating)`, as stored; it has
    no `code` column.
- `samples.py` defines the three site samples as SQL predicates (`SITE_SAMPLES`) and builds a
  per-society table.
- The privacy gate is settled. Group sizes (`n`, `n_*`, `*_n`, `respondents`, `count`, …) must be
  null or ≥ 10, and 0 fails, so encode "absent" as null. `c1`–`c6` are allowed only on rows
  with n ≥ 10. Counts of non-people need an entry in `privacy.NOT_RESPONDENT_COUNTS`, with a
  stated reason.
- The site is live at https://nathan98000.github.io/EtiquetteAtlas/ (a placeholder). CI runs on
  pull requests and before every deploy.
- Recommended SRS edits from M0 are not applied yet: base path, test layout, robots.txt, and the
  wording of DR-9 and DR-16. Follow the SRS as written unless I say otherwise.

## 3. Non-negotiable rules (also in CLAUDE.md)

- **No raw or respondent-level data in git, logs or chat.** Look at raw data only through counts
  and aggregates. Raw-data tests assert on counts only. Never print a DataFrame or row sample
  that holds respondent rows, and never pass raw frames into code whose errors print them.
- **Nothing describing fewer than 10 respondents is published** (DR-9). Every output passes
  `pipeline privacy-scan` before it is written to `data/derived/` or committed.
- Ask before adding a dependency not in the stack (for example `pytest-cov` for the NFR-53
  coverage target), before any push, and before changing a GitHub setting.
- Commit locally in small commits, and cite requirement IDs in code comments and test names.

## 4. Start with a plan, then wait

Before writing code, reply with:

- a short plan mapped to the exit criteria in §6 below;
- your recommendation on each open decision in the table below, plus any I've missed;
- the output files you propose, with their grain, columns, layout and estimated gzipped size,
  checked against §4.6 and the first-load budget in NFR-1 and NFR-3;
- a bootstrap design and an estimate of its run time on a laptop.

Then wait for my go-ahead.

| # | Open decision | Proposed default (confirm or change) |
| --- | --- | --- |
| 1 | Do society–cells with n < 10 still count toward the global mean (DR-7), τ (DR-8) and shrinkage (DR-6)? | Yes, as in the paper (the NFR-51 checks depend on it); they are never shown individually |
| 2 | DR-6: the SE behind the shrinkage weight, and the τ² estimator | Analytic SD/√n; τ² = max(0, var of society means − mean SE²); document both |
| 3 | Interval for the shrunken estimate (FR-20 shows one) | Apply the shrinkage inside each bootstrap replicate and take percentiles |
| 4 | DR-10 centering for societies with missing cells (Kuwait 130, Saudi Arabia 140) | Subtract the society's mean deviation from the global cell means over the cells it has |
| 5 | DR-11 global share of ratings 4–6 | Unweighted mean of society shares, matching DR-7 |
| 6 | DR-12 sample membership for the contexts file (21 IDs appear in only one file) | Define samples once from the main file and apply those IDs to contexts |
| 7 | Societies with no publishable cells (Mongolia, Namibia; Ethiopia about half) | Keep them in metadata; omit them from similarity (DR-14) and say so; §4.6's 90 rows become ≤ 88 |
| 8 | Cells a society never asked (Kuwait: kiss, flirt; Saudi Arabia: kiss) | Flag "not asked" separately from "too few responses" (FR-27) |
| 9 | FR-34 "sites" vs §4.4 "never shown" (DR-15 omits sites) | Leave site counts out |
| 10 | DR-15 interface languages | List only languages used by ≥ 10 respondents in that society |
| 11 | Student share: sh4rb as stored, or the xv2g6 recode (Philippines → yes, Bolivia → NA)? | As stored, with a method note; my decision needed |
| 12 | NFR-51 "selected published values" | Table 1 (12 behaviors, 22 societies, paper's sample, Israel laugh × party dropped) and the global-cell extremes in profile §6, as a committed fixture of published numbers, checked to ±0.02 |
| 13 | DR-13: the five doubled 2000–2003 respondent keys | Treat each country + ResponseId as one bootstrap cluster; report the count |
| 14 | Display names (DR-15): "Mainland China" and "Somaliland" per the SRS; also `DRCongo` and others | A reviewed mapping file in `pipeline/`; Kosovo's coordinates added by hand there |

## 5. Work for this session

1. **Estimators** (DR-4 to DR-8, DR-11, DR-14), each in its own small module with type hints and
   unit tests on synthetic fixtures with known answers (§9.1):
   - per sample × society × cell: n, mean, SD, `c1`–`c6`, share 4–6, the small-sample flag for n
     10–29, and suppression below 10;
   - 95% percentile bootstrap intervals: 2,000 replicates, fixed seeds, resampling respondents
     within each society so that each respondent's ratings move together;
   - empirical-Bayes shrinkage (raw and shrunken values both output), the global cell mean, τ
     and the raw SD of society means, all with intervals;
   - the centered score (DR-10, Should) and society similarity (top five, ≥ 120 shared cells).
2. **Context and change aggregates** (DR-12, DR-13): context aggregates globally and per society,
   split by respondent gender globally only. Change aggregates for the 26 overlapping societies
   (22 in the paper's sample) and 120 cells, with the bootstrap difference. Join both files on
   `country`, and export no 2000–2003 row (C-6).
3. **Society metadata** (DR-15): code, display name, region, coordinates, respondents by sample,
   student share, interface languages, and fieldwork first and last month. Months only, never
   timestamps. No UNDP, IMF or WVS covariates.
4. **Export** (§4.6): one `pipeline build` command that verifies the inputs (DR-1), rebuilds the
   samples (DR-3), computes everything and writes minified JSON to `data/derived/`.
   - Make outputs deterministic: sorted keys, fixed rounding and stable order, so two runs give
     byte-identical files (NFR-50, AT-8).
   - Give each output a pandera schema.
   - Run the privacy scan before writing anything, and stop on any failure.
   - Write a small `data/derived/manifest.json` with the OSF checksums, pipeline version and
     build date (FR-72), dates only.
5. **Validation** (NFR-51): reproduce the published values in decision 12 within ±0.02, or stop
   the run. Add `needs_raw` tests for the counts in §4.6: 13,468 society–cells under All data,
   376 of them below 10, 6,735 context rows, and 3,119 / 2,639 change rows.
6. **Workflow**: extend `pipeline.yml` to run `pipeline build` and open a pull request that
   changes only `data/derived/`. Pin any new third-party action by commit. Opening that pull
   request needs a repository setting I must turn on (`docs/SETUP.md`), so ask me first.
7. **Docs**: update `CLAUDE.md`, the README and the method notes the outputs need, and draft the
   method-page text for each estimator in plain language (FR-70 will use it in M2).

## 6. Done when (M1 exit, SRS §10)

- [ ] `uv run pipeline build` writes every §4.6 output for all three samples to
  `data/derived/`, and a second run is byte-identical.
- [ ] Estimator unit tests pass on synthetic fixtures, with at least 80% line coverage of
  estimator code if you get my OK for `pytest-cov` (NFR-53).
- [ ] The NFR-51 published-value checks pass, and the §4.6 row counts match.
- [ ] `pipeline privacy-scan` passes on `data/derived/`, and so does the needs_raw audit of
  tracked files.
- [ ] The derived payload sizes are reported against §4.6 and NFR-1.
- [ ] CI is green locally: Ruff, mypy, pytest, and the site checks, which are unchanged.

End the session with what was done, the decisions taken, what's next for M2 (core explorer:
FR-1 to FR-27, FR-80 to FR-87) and any SRS changes you'd recommend.

## 7. Out of scope for now

- Loading data in the site, charts, the quiz, share images and analytics code (M2 onward).
- Choosing the quiz items (decide after this pipeline run, per SRS §11.2).
- Any push or GitHub setting change without my OK.
