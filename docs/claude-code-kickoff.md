# Kickoff: The Etiquette Atlas

You are starting work on **The Etiquette Atlas**, a free, static, interactive website that lets the public explore how appropriate 15 everyday behaviors are judged in 10 situations across 90 societies, built from the Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. This session covers **Milestone M0 (setup and data check)** and the scaffolding that M1 builds on.

## 1. Read first, in this order

1. `The Etiquette Atlas Software Requirements Specification.md` (repo root). This is the source of truth. Read all of it. Requirement IDs (FR-, NFR-, DR-, HR-, C-, AT-) are referenced below.
2. `docs/reference/gsn-data-profile.md`. Column-level data dictionary, sample rules, keying traps and identifiers for the GSN files. It adds detail; where it seems to conflict with the SRS, tell me rather than choosing.

## 2. Non-negotiable rules

- **No raw or respondent-level data in git, ever.** OSF downloads go to `data/raw/` (git-ignored). Only aggregates that pass the privacy gate go to `data/derived/`. Never commit, print into logs, or paste into chat: `ResponseId`, `StartDate`, `EndDate`, `Duration__in_seconds_`, `Progress`, `belief_god_orig`, `site`, `country_carib`, exact `age`, or any row of `everyday-norms-2011-clean.csv` (DR-16, C-5, C-6).
- **Nothing describing fewer than 10 respondents is published** (DR-9).
- **Static site only:** no server, database, serverless function, cookies or paid service (C-2, C-11). Quiz answers never leave the browser (C-12).
- **Hosting:** GitHub Pages via GitHub Actions. The repo is `github.com/Nathan98000/EtiquetteAtlas`, so the site URL is `https://nathan98000.github.io/EtiquetteAtlas/` and the base path is `/EtiquetteAtlas` (case-sensitive). The SRS's `/etiquette-atlas/` slug predates the repo; read the base path from config (e.g. a `BASE_PATH` env var) so a later rename is a one-line change.
- **Stack (C-3, C-4, §3.1):** SvelteKit with Svelte 5, TypeScript and `@sveltejs/adapter-static`; D3 for charts; Node.js active LTS. Python 3.12+ managed with `uv`; DuckDB and pandas; pandera for schemas; pytest; Ruff. Front-end tests with Vitest and Playwright. Pick one Node package manager and document it. Ask before adding any major dependency not listed here.
- **Git:** small commits with clear messages; commit locally. **Ask me before the first push** and before changing anything in GitHub settings.
- Where code or a test implements a requirement, cite its ID in a comment or test name, so §9.3 traceability holds.

## 3. Start with a plan, then wait

Before writing code, reply with:
- a short plan for this session, mapped to the M0 exit criteria (§5 below);
- any blocking questions;
- anything in the SRS or the data profile that looks inconsistent or underspecified.

Then wait for my go-ahead.

## 4. Work for this session

1. **Project memory.** Create a concise `CLAUDE.md` with the commands, layout, conventions and the non-negotiable rules above, so later sessions inherit them.
2. **Scaffold** per SRS §3.2:
   - `pipeline/`, `data/raw/` (git-ignored), `data/derived/`, `site/`, `tests/`, `.github/workflows/`;
   - a `LICENSE` (MIT; take the copyright name from `git config user.name`, or ask me);
   - a `.gitignore`;
   - a README covering setup, running the pipeline, building and deploying (NFR-54).
3. **Download and verify (DR-1).**
   - A `pipeline download` command fetches the five OSF files listed in SRS §4.1 into `data/raw/`.
   - Pin every file in a manifest (e.g. `pipeline/sources.toml`) with URL, byte size and MD5. Three MD5s are in §4.1; read the other two from the OSF API (`https://api.osf.io/v2/nodes/sh4rb/files/osfstorage/`).
   - It must be idempotent: skip files that are already present and verified, and fail loudly on any mismatch.
   - The main CSV is 367 MB, so stream downloads.
4. **Load, recode and rebuild the samples (DR-2, DR-3).**
   - Read the CSVs with DuckDB rather than loading them whole into pandas.
   - Recode GSN ratings as `rating − 3.5`. Leave the 2000–2003 file as stored.
   - Key societies on `code`, not `iso2`: Namibia's ISO2 is the literal string `NA`. Kosovo is `XKX`, and the pooled Caribbean society is `TTO`.
   - Rebuild the three samples exactly as in data profile §4.3:

     | Sample | Respondents | Societies | Notes |
     |---|---|---|---|
     | All data | 25,422 | 90 | |
     | Paper's sample | 18,656 | 71 | `StartDate` ≤ `2024-02-29T23:00:00Z`, i.e. before 1 March 2024 Stockholm time; excludes Kuwait; no complete-case drop |
     | Attention check | 15,599 | 80 | `att_check_commit == 1`, minus the 10 listed societies |

   - Also reproduce the 17,288 / 71 complete-case sample as a cross-check against `individual-data-prereg.csv`, and the 15,599 against `imputed-ind-data-attention-check.csv`.
   - A `pipeline samples` command prints the counts and exits non-zero on any mismatch.
5. **Privacy gate skeleton (DR-9, DR-16).**
   - A function and CLI that scans everything in `data/derived/`.
   - It fails if any forbidden column name appears, or if any `n` (or any count-like field) is below 10.
   - Cover it with unit tests on small synthetic fixtures.
6. **Tests.**
   - Unit tests use synthetic fixtures and run anywhere.
   - Tests that need the raw files carry a pytest marker (e.g. `needs_raw`) and are skipped when `data/raw/` is absent, so CI passes without the data.
7. **Site skeleton (HR-1 to HR-7).** SvelteKit with the static adapter and the configurable base path. It needs:
   - a prerendered placeholder home page carrying the attribution footer (NFR-40; suggested text in data profile §7);
   - a root `404.html`;
   - a Content Security Policy as a `<meta>` tag;
   - content-hashed assets;
   - a system font stack.

   It must build, and preview correctly under `/EtiquetteAtlas/`.
8. **Workflows (§8.4).**
   - `ci.yml` on pull requests: Ruff, pytest (unit only), type-check, Vitest and build.
   - `deploy.yml` on pushes to `main`: build, `actions/upload-pages-artifact`, then `actions/deploy-pages`.
   - `pipeline.yml`: a `workflow_dispatch` stub that will later download, verify, run and open a PR updating `data/derived/` only.
   - Validate the workflow syntax if `actionlint` is available.
9. **Manual steps for me.** Write `docs/SETUP.md` listing what only I can do:
   - set Pages "Source" to GitHub Actions;
   - enable "Enforce HTTPS";
   - confirm the repo is public;
   - create a Cloudflare Web Analytics site for `nathan98000.github.io` and check that it is accepted (fallback: GoatCounter, §8.5);
   - add any repository secrets.

## 5. Done when (M0 exit, SRS §10)

- [ ] `pipeline download` and `pipeline samples` reproduce 25,422/90, 18,656/71 and 15,599/80, and the cross-checks match.
- [ ] `pytest` and the front-end checks pass locally; tests that need raw data skip cleanly without it.
- [ ] The site builds and previews at the base path with the attribution footer and the 404 page.
- [ ] The three workflow files exist and pass syntax checks.
- [ ] `CLAUDE.md`, the README and `docs/SETUP.md` are written.
- [ ] Nothing under `data/raw/` and no forbidden field is tracked by git.

End the session with:
- what was done;
- what's next for M1 (the estimators in DR-4 to DR-8 and DR-11 to DR-15, and the derived outputs in §4.6);
- any SRS changes you'd recommend.

## 6. Out of scope for now

- Charts, the quiz, share images and analytics code.
- Choosing the quiz items.
- Any GitHub setting changes or pushes without my OK.
