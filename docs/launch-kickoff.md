# Kickoff: The Etiquette Atlas, public launch

You are continuing work on **The Etiquette Atlas**, a free, static site built from aggregates of the
Global Study of Everyday Norms (GSN). I'm the sole developer and maintainer; you're my pair. This
session covers the last step of the release plan (SRS §10): the **public launch**, whose exit
criterion is the launch checklist (§9.4) complete. Every module has been live, unannounced, at
https://nathan98000.github.io/EtiquetteAtlas/ since M7 was deployed on 23 October 2026. Most of the
checklist is mine: manual checks, a second reader, the announcement. Your part is to run what can
be automated, turn my findings into fixes, keep the site and the documents in order, and leave a
clean v1.0 behind, with v1.1 written down.

## 1. Read first, in this order

1. `CLAUDE.md`: rules, layout, commands and conventions. It describes the M7 site; follow it
   throughout.
2. `docs/launch.md`: the §9.4 checklist mapped to what is done, automated and left to me, the
   acceptance tests' state, the first deploy's results and the manual checklists. This session works
   from it.
3. `The Etiquette Atlas Software Requirements Specification.md`, the source of truth: §9.2 (the
   acceptance tests), §9.4 (the launch checklist), §10 (the release plan: "If the schedule slips,
   Should items move to v1.1 first; Must items and the launch checklist do not move"), §11.1 (risks,
   above all R-7, R-8, R-12 and R-13) and §11.2 (open questions).
4. `docs/srs-changes.md`: every SRS edit recommended in M5 to M7, unapplied. I will mark the ones I
   accept (decision 3 below).
5. `docs/decisions.md`, above all 87 to 104 (M7): the share images (88 to 92), the method page (93,
   94), the change module's words (95), visual regression (97), other browsers (98), audits (99),
   the content review (100) and the deployed checks (102).
6. `docs/SETUP.md`: the manual steps, some still open (Dependabot alerts, the analytics dashboard,
   the pipeline's pull-request permission).

You should not need `docs/reference/gsn-data-profile.md` or the raw files. If you need anything
from them, the M1 rules in CLAUDE.md still apply.

## 2. What M7 left you

- **The site:** 289 pages (288 in the sitemap), the quiz, the story, the explorer and 150 cells,
  90 fingerprints, the audiences and the change module, and a complete method page. Every route
  has its own share image tags; 247 images (11 MB) are built in CI and never committed. Every page
  loads the Cloudflare Web Analytics beacon, the only third party in the CSP.
- **Deployed checks** (commit e83dfed, 23 October 2026), all passing:
  - `npm run test:deployed` (AT-9): only the beacon's two hosts, no cookie, nothing stored. The
    beacon reports each page view, and a client-side navigation (a view change) sends further
    reports, so view changes probably count as page views.
  - `npm run check:deployed` (AT-10): 940 files, 35.98 MB of 60 MB, largest 0.50 MB.
  - `LHCI_DEPLOYED=1 npm run lhci` (NFR-2): LCP 0.87–1.16 s, CLS ≤ 0.012, TBT ≤ 1 ms,
    accessibility 1.00, on 12 routes. The beacon adds 10.5 KB, so the largest first load is about
    110 KB of JS and CSS (budget 200 KB).
- **Checks in CI** (`ci.yml`, reused by `deploy.yml`):
  - pipeline: Ruff, mypy, pytest with coverage (99%, floor 80%), privacy scan, `uv audit`;
  - images: the share images, in the Playwright Linux image, cached by their inputs and handed on
    as an artifact;
  - site: `npm audit --omit=dev`, lint, type-check, Vitest (284), both builds with `check:build`,
    `check:content` (AT-12), Playwright in Chromium (204 tests: end-to-end, axe on 18 routes in both
    themes, budgets, share images, analytics), Lighthouse CI;
  - browsers: the `@compat` tests in Firefox, WebKit, an iPhone and a Pixel;
  - visual: 66 screenshots against baselines from the Playwright Linux image;
  - actionlint. Dependabot opens weekly grouped updates for npm, uv and Actions.
- **Not pushed:** commit 8ec5779 (docs only: the deployed results in `docs/launch.md`). Push it with
  the first change of this session.
- **Left for later in M7:** axe against the deployed URL (the command is in `docs/launch.md`).
- **Local quirks:**
  - Docker Desktop must be running for `npm run cards:docker`, `npm run test:visual` and actionlint.
  - After changing the data, `src/cards/` or anything in `src/lib/`, run `npm run cards:docker`;
    `check:build` warns when the images are older than their inputs.
  - Firefox will not start inside the agent's macOS sandbox; run it in Docker
    (`sh scripts/in-docker.sh npx playwright test --project=firefox`).
  - `PORT=4392 npm run test:e2e` (and `npm run lhci`) avoids another project's server on 4173.
  - A page opened from `npm run preview` in an ordinary browser sends Cloudflare a page view for
    `localhost`; review built pages through Playwright, which stubs the beacon.
  - A `@playwright/test` update also needs the image tag in `ci.yml` (two jobs and a check) and new
    visual baselines (`npm run test:visual:update`).
  - The card build uses SvelteKit's deprecated `files.routes` option (decision 88).
- **Known gaps carried to v1.1** unless my findings show a Must failing:
  - the layout shift when a `?society=` URL replaces prerendered text after mount, on the audiences
    and on `/change/?society=…` (decision 31);
  - rank uncertainty (R-3); map crowding over Europe; the subtle dark-theme fills of small
    differences on the fingerprint; collection sites in FR-34 (decision 9); no interval for the
    audience effect (decision 60); no redraw-time measurement on `/`;
  - dev-only `npm audit` findings, all under `@lhci/cli`;
  - visual baselines take 10 MB in git;
  - automated runs cover only the browsers' current versions (decision 98).

## 3. Already decided

- **The launch is a freeze, not a milestone of new features.** Only fixes: anything that fails a Must
  requirement, a factual or wording error, an accessibility problem my checks find, a broken share
  card. Should items and improvements go to v1.1 (SRS §10).
- **My manual checks come to you as findings.** I will work through `docs/launch.md`'s checklists
  (screen readers, real devices, the share-image sample, the social-card validators, the reading list,
  the method page's second reader) and paste what I find. You triage each one against the SRS, fix
  what blocks the launch and log the rest.
- **The announcement, the courtesy note and any social post are mine.** Nothing is sent or published
  from this session. You may draft text for me.
- **No new dependencies, no new third parties, no change to the pipeline or `data/derived/`**
  unless a finding shows a data error. Say so first.
- **The deployed site is checked after each push I approve**, with the commands in `docs/launch.md`.

## 4. Non-negotiable rules (also in CLAUDE.md)

- **Static site only:** no server, database, serverless function, cookie or paid service (C-2,
  C-11). The only third party is the Cloudflare beacon, with its two hosts in the CSP (NFR-31,
  NFR-32); no custom analytics event (FR-91).
- **Nothing below 10 respondents is shown, on a page or an image** (DR-9); quiz answers never leave
  the browser (C-12); the 2000–2003 survey appears only as society–pair aggregates with its
  provenance (C-6), and `CHANGE_MODULE=off` still removes every trace of it (R-6).
- **Wording:** "respondents in Chile", never "Chileans"; no causal wording (FR-73, §6.5);
  differences between two surveys, never change in individuals (FR-52); the regions are the GSN
  authors' grouping. On share images too. `npm run check:content` must stay green.
- **Commits and settings:** commit locally in small commits with clear messages. Ask before any
  push (a push to `main` deploys), before pushing a tag, before creating a GitHub release, and
  before changing a GitHub setting.
- **The SRS** changes only where I accept an edit (decision 3 below).
- **Traceability:** cite requirement IDs in comments and test names where code implements them
  (§9.3). New decisions go into `docs/decisions.md` from 105 onward.

## 5. Start with a plan, then wait

Before writing code, reply with:

- the order you would work in, from axe on the deployed URL to a v1.0.0 that is ready to tag;
- your recommendation on each open decision in the table below, plus any I've missed;
- how you will triage my findings: the categories, what blocks the launch and what goes to v1.1,
  and where each one is recorded;
- anything in `docs/launch.md` that is out of date or that you think is missing from the checklist.

Then wait for my go-ahead.

| # | Open decision | Proposed default (confirm or change) |
| --- | --- | --- |
| 1 | Where findings live | A table in `docs/launch.md` (finding, page, requirement, launch-blocking or v1.1, fix or reason, commit), so the checklist and its outcomes stay in one place. Each fix gets a test where one can catch it again. |
| 2 | axe on the deployed URL | Run it first: `DEPLOYED_ORIGIN=https://nathan98000.github.io npx playwright test e2e/a11y.e2e.ts --project=chromium` (the beacon stubbed). Zero serious or critical issues, as on `build/`. |
| 3 | SRS edits | I mark each line of `docs/srs-changes.md` accepted or rejected. You apply the accepted ones to the SRS only, with its date line updated, move them to an "Applied" section with the commit, and leave the rejected ones listed with my reason. |
| 4 | View changes counted as page views | Check Cloudflare's Web Analytics documentation (not memory) for a setting that counts only full page loads. If one exists, propose it and ask before changing the snippet in `app.html` (the token and hosts must stay as they are); if not, accept it as R-12's rough trends and say so on the method page if the counts mislead. |
| 5 | Marking v1.0 | A `CHANGELOG.md` with v1.0.0 (what the site does, by module, with the SRS milestones), and an annotated tag `v1.0.0` on the launch commit, created locally. Pushing the tag and creating a GitHub release are mine to approve. |
| 6 | v1.1 backlog | `docs/v1.1.md`: the known gaps above, every finding deferred from this session, the Should items that only partly hold, and the maintenance items (the `files.routes` migration, the baselines' size, the dev-only audit findings), each with its requirement or decision and a one-line reason. |
| 7 | The courtesy note | You draft it from `docs/launch.md`'s points, in the chat or in a git-ignored file, never committed (the repository is public). I edit and send it. |
| 8 | After the launch | A short "After the launch" section in `docs/SETUP.md`: what to watch (the Cloudflare dashboard, Pages' soft bandwidth limit of about 100 GB a month and HR-9's fallback, Dependabot pull requests, issues), how to roll back a bad deploy (revert the commit and push, which redeploys), and how to rebuild after an OSF change (`pipeline.yml`). |
| 9 | R-13 (a similar interactive published before launch) | Mine to check; you search the web only if I ask, and report sources. |
| 10 | Accessibility contact | A sentence in the method page's About section on how to report an accessibility problem (an issue on GitHub), since NFR-10 claims WCAG 2.2 AA and the manual checks may not catch everything. |

## 6. Work for this session

1. **Deployed accessibility check** (decision 2), and push 8ec5779 with the first change.
2. **My findings**, as they arrive: triage, fix, test, record (decision 1). Re-run the affected
   checks, and the deployed checks after each push I approve.
3. **Analytics counting** (decision 4) once I report what the dashboard shows.
4. **SRS edits** I accept (decision 3).
5. **Docs:** `CHANGELOG.md`, `docs/v1.1.md`, "After the launch" in `docs/SETUP.md`, the README's
   status line, `CLAUDE.md` where anything changed, decisions from 105 onward, and `docs/launch.md`
   kept current.
6. **v1.0.0** ready to tag (decision 5).

## 7. Done when (public launch, SRS §10)

- [ ] Every Must requirement passes its test, on `build/` and, where it applies, on the deployed
  site; axe finds zero serious or critical issues on the deployed URL.
- [ ] Every finding from my checks is fixed, or recorded in `docs/v1.1.md` with its reason; no
  launch-blocking finding is open.
- [ ] `docs/launch.md` shows each §9.4 item done, or waiting only on me with what is left.
- [ ] The accepted SRS edits are applied; `docs/srs-changes.md` says what happened to each.
- [ ] `CHANGELOG.md`, `docs/v1.1.md` and the docs are current; the tag `v1.0.0` exists locally.
- [ ] CI is green locally (site checks, both builds, share images, Playwright in every project,
  visual regression, Lighthouse CI, actionlint, the pipeline and the privacy scan) and on the last
  deploy, with the deployed checks passing.
- [ ] Nothing is announced or sent from this session.

End the session with:
- what was done, and the findings with what happened to each;
- the decisions taken;
- the state of the §9.4 checklist, item by item;
- what is left before I announce;
- the v1.1 list, pointing to `docs/v1.1.md`.

## 8. Out of scope for now

- Announcing the site, the courtesy note and any post; you only draft.
- New features or modules, and Should items that slip (they go to `docs/v1.1.md`).
- The Cloudflare fallback (HR-9, a Could) and a custom domain (C-1), unless traffic forces the
  question; then say so and stop.
- Changes to the pipeline or `data/derived/` beyond a data error a finding shows. Ask first.
- Editing the SRS beyond the edits I accept.
- Any push, tag push, release or GitHub setting change without my OK.
