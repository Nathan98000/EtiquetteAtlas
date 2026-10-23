# Launch readiness

The public launch follows M7 once SRS §9.4's checklist is complete (decision 104). This page maps
each item to what is done, what runs automatically and what is left to the maintainer, records the
launch checks' findings and what happened to each, then gives the manual checklists. Nothing here
is sent or published from a coding session.

## §9.4 checklist

| Item | Status | Automated | Left to the maintainer |
| --- | --- | --- | --- |
| All Must requirements pass their tests | Passing on `build/` (below) and, for AT-6's axe check, AT-9 and AT-10, on the deployed site. FR-34 (no collection sites, decision 9) and §2.4 (current browser versions tested automatically, the previous ones by hand, decision 98) pass as the SRS now words them (89993c7). Waived for v1.0 by the maintainer, not passed: the screen-reader checks (NFR-13), a real iPhone and the previous browser versions (NFR-20; decision 109) | CI on every pull request and deploy | Real devices: Chrome on Android and the current desktop browsers (NFR-20) |
| Lighthouse, size and accessibility budgets met on the deployed URL | Met on both deploys of 23 October 2026 (below); on the second (6632baa): median LCP 0.88–1.35 s, CLS ≤ 0.012, TBT ≤ 79 ms, Lighthouse accessibility 1.00 on 12 routes; 35.98 MB of 60 MB, largest file 0.50 MB; axe finds no serious or critical issue on 18 routes in both themes | The four commands below | — (they run again on the launch commit) |
| Method page reviewed by a second reader | Text settled (decision 93); the privacy notice corrected (L-1, decision 105); reviewed by a fresh agent in place of a human reader, a departure from §9.4 (decision 110), its findings below | — | — |
| Attribution checked on pages and share images | Every page (`check-build.js`) and every image (`share-images.js`) carry the full credit; the four DOIs resolve, and their registered titles, journals, years and volumes match the credits (23 October 2026) | Both, in CI | Look at a sample of images (AT-5, below) |
| Analytics confirmed counting, with no cookies set | Beacon on every page; on the deployed site it reports (`cdn-cgi/rum` answers 204), sets no cookie or storage, and sends no query string (decision 105). View changes count as page views but not as visits, and trends are read from Visits (decision 107) | `npm run test:deployed` | Check that page views reach the Cloudflare dashboard (`docs/SETUP.md`) |
| Social cards checked for the home page, one cell and one society | Tags and images on every route (AT-7) | — | The validators below (NFR-61) |
| Optional courtesy note to the GSN authors | Not sent: the maintainer's decision (decision 108); the change module stays on, and `CHANGE_MODULE=off` removes it in one deploy (R-6) | — | — |

## Findings

Findings from the launch checks, the maintainer's and the coding session's, with what happened to
each. Each is one of:

- **launch-blocking**: fails a Must; a factual, data-wording or wording-rule error (FR-73, FR-52,
  §6.5); an accessibility problem; a broken or wrongly credited share card (NFR-40, AT-5, FR-82); a
  privacy problem (DR-9, C-12, NFR-30 to NFR-34); something broken in a §2.4 browser. Fixed before
  the announcement, with a test where one can catch it again.
- **v1.1**: a Should that only partly holds, an improvement, a cosmetic issue that does not hurt
  reading, anything needing a new feature. Listed in `docs/v1.1.md` under the same ID.
- **not a defect**: behaviour a requirement or decision sets, with its reference.
- **data error**: the pipeline and `data/derived/` change only once the maintainer agrees.

| ID | Finding | Page | Requirement | Category | Fix or reason | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| L-1 | The privacy notice said nothing chosen in the atlas is sent to the analytics, but a society's or pair's page has it in the path the beacon records | `/method/#privacy` | FR-92, NFR-34 | Launch-blocking (factual) | The notice now says the address names the page, and that the query string's choices and the quiz answers are not sent; `npm run test:deployed` fails on a query string in what the beacon sends, after a view change too (decision 105) | 8bd7fae, 8cc1038 |

## After the push

From `site/`, once the Deploy workflow has finished, with `build/` built from the deployed commit
(`npm run build`):

```sh
npm run test:deployed          # AT-9: the live beacon, its two hosts only, no cookies or storage
npm run check:deployed         # AT-10: every file fetched; total under 60 MB, largest under 5 MB
LHCI_DEPLOYED=1 npm run lhci   # NFR-2 on the deployed URL, beacon included
DEPLOYED_ORIGIN=https://nathan98000.github.io npx playwright test e2e/a11y.e2e.ts --project=chromium
```

The first three each count a few page views in the analytics; the axe run stubs the beacon.

Results of the first M7 deploy (commit e83dfed, 23 October 2026):

- `npm run test:deployed`: 2 passed. Only the beacon's two hosts contacted, no cookie, nothing
  stored; the beacon reported each page view, and a client-side navigation (a view change) sent
  further reports, so view changes probably count as page views.
- `npm run check:deployed`: 940 files, 35.98 MB of 60 MB, largest 0.50 MB, no cookies. Only the
  HTML differed from a local build, by SvelteKit's version marker; the share images were identical
  to the local Docker render.
- `LHCI_DEPLOYED=1 npm run lhci`: every assertion met (figures in the table above). The beacon
  transfers 10.5 KB, so the largest first load is about 110 KB of JS and CSS against NFR-1's
  200 KB.

Launch checks on the same deploy (23 October 2026):

- axe on the deployed URL (the last command above): 40 passed. No serious or critical issue on the
  18 routes in both themes, nothing scrolls sideways at 320, 640 or 1024 px, and transitions are
  off under reduced motion.
- Off-site links (SRS §9.1), checked once from `build/` rather than in CI, where outside sites would
  fail it intermittently: the 12 links a reader can follow (the four DOIs, the OSF deposit's five
  downloads, the licence, the repository and Cloudflare's privacy policy) resolve. science.org and
  SAGE answer a script with 403 after doi.org redirects to them, as they do any client that is not
  a browser.
- The beacon (version 2026.10.1) removes the query string and fragment from the page address and
  the referrer before sending them (decision 105).

Results of the second deploy (commit 6632baa, 23 October 2026: L-1's fix, the accessibility contact
and the launch docs), with every CI job green:

- `npm run test:deployed`: 2 passed. The beacon's reports named the page by its path
  (`/EtiquetteAtlas/explore/`) and carried no query string, after a view change too; the check now
  requires such a report (322454c).
- `npm run check:deployed`: 940 files, 35.98 MB of 60 MB, largest 0.50 MB, no cookies. Only the 289
  HTML files differed from a local build, by SvelteKit's version marker and the CSP hash of the
  inline script that carries it; the other 651 files, the share images included, matched.
- `LHCI_DEPLOYED=1 npm run lhci`: every assertion met. Medians over three runs: LCP 0.88–1.35 s,
  CLS ≤ 0.012, TBT ≤ 79 ms (budget 200 ms), accessibility 1.00. TBT was higher than on the first
  deploy (≤ 1 ms) though the only change was the method page's text: the laptop was busy (load
  average 6 to 13), and single runs of an unchanged route ranged from 0 to 110 ms.
- axe on the deployed URL: 40 passed.

Still to do:

- [ ] confirm page views reach the Cloudflare dashboard (`docs/SETUP.md`); how view changes count
  is settled (decision 107);
- [ ] turn on Dependabot alerts (`docs/SETUP.md`);
- [x] run axe on the deployed URL (above).

## Before the announcement

What the launch needs beyond §9.4's list:

- [ ] **R-13** (maintainer): check again that no similar interactive has been published.
- [ ] **R-8:** the address is final. The account's and repository's names set it
  (`https://nathan98000.github.io/EtiquetteAtlas/`, case-sensitive), so neither is renamed after
  the announcement; if the site ever moves, a redirect page stays at the old address.
- [x] The SRS edits the maintainer accepted (all 28) are applied (89993c7, `docs/srs-changes.md`).
- [ ] Every launch-blocking finding is fixed, and the rest are in `docs/v1.1.md`.
- [ ] The launch commit is deployed with CI green and the four commands above pass on it;
  `v1.0.0` is tagged on it locally. Pushing the tag and creating a GitHub release are the
  maintainer's (`CHANGELOG.md`).

## Acceptance tests

| Test | How it is checked | State (launch) |
| --- | --- | --- |
| AT-1 | Lighthouse CI on `/explore` (mobile); Playwright checks the 150-row list | Pass |
| AT-2 | Playwright: a cell URL with `society` and `sample` | Pass |
| AT-3 | Playwright: the quiz's requests, storage and reload | Pass |
| AT-4 | `check-build.js` and Playwright on `/change/` | Pass |
| AT-5 | `check-build.js` (every page); `share-images.js` (every image's text) | Automated part passes; manual sample left |
| AT-6 | axe on 18 routes in both themes; keyboard paths in Playwright | Pass on `build/`, and axe on the deployed site; screen readers left |
| AT-7 | `check-build.js` (every route, 247 images); `e2e/share.e2e.ts` | Pass |
| AT-8 | `uv run pytest -m needs_raw` (a fresh build matches the committed files; the paper's counts) | Pass (local raw files) |
| AT-9 | `e2e/analytics.e2e.ts` on `build/`; `npm run test:deployed` | Pass on `build/` and on the deployed site |
| AT-10 | `check-build.js` on `build/`; `npm run check:deployed` | Pass on `build/` and on the deployed site (35.98 MB, largest 0.50 MB) |
| AT-11 | Playwright | Pass |
| AT-12 | `npm run check:content`; the reading list below | Automated part passes; reading left |

## Screen readers (NFR-13)

Not run before the v1.0 launch: the maintainer waived them (decision 109), and running them comes
first in `docs/v1.1.md`. The list stays for that run.

Use VoiceOver with Safari on a Mac and on an iPhone, and NVDA with Firefox or Chrome on Windows.
For each task, note anything unannounced, announced twice, out of order or unreachable.

- [ ] **Home and quiz:** the heading, "Skip to the atlas", the society picker; answer the three
  questions with the arrow keys; each reveal is announced (where the answer falls, the society's
  responses); "Start again".
- [ ] **Story:** the step bar and its dots ("Step 3 of 6", the current step announced); Next and
  Previous move to the step's heading; "Skip to the atlas"; each chart's summary and "Show as table".
- [ ] **Matrix:** move through the grid with the arrow keys; each cell's label (behavior,
  situation, mean, interval, disagreement); sort; open a cell with Enter. On a phone, the list.
- [ ] **Drill-down:** the beeswarm's dots in order; a society's rank; "Show uncertainty"; the map;
  previous and next pairs; the table views.
- [ ] **Society picker:** type-ahead, arrow keys, Enter, Escape; the selection announced.
- [ ] **Global controls:** the sample, scale and theme controls announce their name and state, and
  the views' change is announced or reachable; each chart's "About this chart" link lands on its
  method section (FR-7).
- [ ] **Fingerprint and compare:** the grid's ▲ ▼ announced in words; the similar societies; the
  compare picker and the dumbbell rows.
- [ ] **Audiences and change:** the slopegraph's columns with the arrow keys; the arrows' rows and
  "Show all"; the provenance note.
- [ ] **Method:** the contents links; the society table's headers (row and column) read with each
  cell; the checksums table.
- [ ] **Everywhere:** "Skip to content"; one h1 per page and a sensible heading outline; focus
  never hidden behind the story's sticky bar or a bottom sheet (WCAG 2.4.11); 200% zoom; reduced
  motion; Windows High Contrast (forced colours) keeps marks and focus visible.

## Real devices (NFR-20)

For v1.0 the maintainer checks Chrome on Android and the current desktop browsers; a real iPhone and
the previous versions are waived (decision 109).

Automated runs cover Playwright's current Chromium, Firefox and WebKit, an emulated iPhone and an
emulated Pixel. Before launch, open the home page, a cell, a fingerprint, the story and the method
page on:

- [ ] an iPhone (Safari) and an Android phone (Chrome), portrait and landscape;
- [ ] desktop Safari, Firefox, Chrome and Edge, and the previous major version of each (§2.4:
  the current versions are tested automatically, the previous ones by hand before launch).

## Share images (AT-5, NFR-61)

- [ ] **Attribution on a sample.** Run `npm run cards:docker` (or download the `share-images`
  artifact from a CI run) and open, in `site/share-images/`: `home.png`, `explore.png`,
  `story.png`, `method.png`, `change.png`, `societies.png`, `explore/kiss/job-interview.png`,
  `explore/talk/party.png`, `societies/usa.png` and `societies/mng.png`. On each, read the credit
  at the foot: authors, year, title, journal, the OSF DOI, CC BY 4.0 with its link, "Values shown
  are aggregated and modelled by The Etiquette Atlas" (and Gelfand et al. 2011 on the change card).
- [ ] **Social-card validators** for https://nathan98000.github.io/EtiquetteAtlas/,
  https://nathan98000.github.io/EtiquetteAtlas/explore/sing/funeral/ and
  https://nathan98000.github.io/EtiquetteAtlas/societies/chl/: Facebook's Sharing Debugger
  (https://developers.facebook.com/tools/debug/), LinkedIn's Post Inspector
  (https://www.linkedin.com/post-inspector/), and a draft post (not sent) on Bluesky, Mastodon or X
  to see each preview. The card should show the image, title and description; validators cache
  images by URL, so ask them to re-scrape after a change.

## Reading list (AT-12)

`npm run check:content` catches causal words and nationality nouns. Read these for anything it
cannot: a claim of why societies differ, a society's people described rather than its respondents,
a difference between surveys described as change.

- [ ] `/` and the quiz's reveal and summary, with and without a society chosen.
- [ ] `/story/`, every step.
- [ ] `/explore/`, with and without a society selected (the details panel).
- [ ] `/explore/sing/funeral/` and `/explore/kiss/job-interview/?society=kwt` (not asked).
- [ ] `/societies/`, `/societies/chl/`, `/societies/mng/` (nothing to draw), and compare mode.
- [ ] `/audiences/` and `/audiences/usemphone/`, with a society and with the gender split.
- [ ] `/change/`, `/change/jpn/` and `/change/?society=chl` (not in the 2000–2003 survey).
- [ ] `/method/` in full.
- [ ] The 404 page, and the share images listed above.

## Method page: second reader (§9.4)

For v1.0 a fresh agent reviews the page against this list in place of a human reader (decision
110); its findings are in the table above.

Ask the reader to check, against the GSN paper and `docs/method-notes.md`:

- [ ] each section says what the chart shows in plain language, and no section claims a cause;
- [ ] the samples' counts and the societies each one leaves out;
- [ ] the caveats of SRS §4.8: convenience samples and the student share, the fieldwork period,
  the paper's finding with its standard deviations, measurement invariance, and the 2000–2003
  survey's provenance;
- [ ] the privacy notice (analytics, storage, GitHub's logs) and the versions and checksums;
- [ ] that the About section's statement of independence and the citation are right.

## Courtesy note to the GSN authors (optional, §11.2)

Not sent (decision 108). The points a note would have covered are in this file's history.
