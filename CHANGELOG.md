# Changelog

Releases of The Etiquette Atlas, https://nathan98000.github.io/EtiquetteAtlas/. Requirement IDs
and milestones come from `The Etiquette Atlas Software Requirements Specification.md`; decisions
from `docs/decisions.md`. What comes next is in `docs/v1.1.md`.

The tag names the site's release. The pipeline keeps its own version (`pyproject.toml`, shown on
the method page with the build date), which changes only when the pipeline does.

## v1.0.0: public launch (unreleased)

The first public release: a free, static atlas of how appropriate respondents in 90 societies
judge 15 everyday behaviors in 10 situations, built from aggregates of the Global Study of Everyday
Norms (Eriksson et al. 2025, OSF sh4rb, CC BY 4.0). Every module had been live, unannounced, since
M7. Before the release a design review (`docs/design-review.md`) found the site hard going for a
lay reader on a phone, and all 39 of its findings were built (decisions 111 to 140); otherwise the
launch adds only fixes (SRS §10).

### What the site does

- **Home and quiz** (`/`; FR-1, FR-60 to FR-63): opens on the first of three questions, "How would
  you answer?", each placing the reader's answer among the societies' averages and, with a society
  chosen, among its respondents' answers; then a summary with one takeaway and a strip per
  question. Under the quiz, five ways in: the tour, a search for a behavior in a situation, the
  societies, Who's watching and Then and now. The answers stay in the tab (C-12).
- **Tour** (`/story/`; FR-64, FR-65): six steps of about 50 words and one chart each, from the
  paper's finding that norms vary more across situations than across societies, pictured with the
  atlas's own averages, to the most and least disputed pairs, an audience effect and the largest
  difference between the two surveys.
- **Situations** (`/explore/`; FR-10 to FR-27): the 15 × 10 matrix of global averages with
  disagreement as a ring, sortable, with a society's clearly stricter or looser pairs; on phones a
  list with "Jump to a behavior" and the society's own values. A page for each of the 150 pairs
  opens with the selected society's result and rank, then the pair's finding, a beeswarm of the
  societies, a linked dot map and the behavior's strip across situations, with estimates adjusted
  for small samples or not, intervals, and "too few responses" or "not asked" where a society
  cannot be shown.
- **Societies** (`/societies/`; FR-30 to FR-34): an index that opens with a map of the 90
  societies by the GSN authors' regions, and a fingerprint for each, opening on its largest
  differences, with its clearly stricter or looser pairs, the five most similar societies,
  "Compare with…" and the facts about its respondents.
- **Who's watching** (`/audiences/`; FR-40 to FR-43): each behavior alone, in front of colleagues
  or classmates and in front of management or professors, globally or for one society, with the
  actor's gender and, globally, the respondents' gender; the index opens on the largest drop.
- **Then and now** (`/change/`; FR-50 to FR-53): the 26 societies in both the 2000–2003 survey
  (Gelfand et al. 2011) and the GSN, as differences between two surveys, "clearly higher",
  "clearly lower" or "too close to call", with their provenance; one build setting removes the
  module (R-6).
- **Method** (`/method/`; FR-70 to FR-73): "How to read the atlas" in five lines, then what each
  chart shows, the paper's model, the three samples, what the atlas cannot tell you, the privacy
  notice, the OSF files' versions and checksums, and every society's respondents, student share,
  languages and fieldwork period.
- **Throughout:** one search for societies and behaviors in situations; sample (all respondents,
  the paper's sample, those who passed the attention check) and scale (as answered, or relative to
  each society's average) toggles that follow the reader; every view in the URL, with Back for
  each page, society or comparison; a Share button by every title; chart titles that state their
  finding; a share image for the home page, each module, every pair and every society (247); a
  text summary on every page for readers without JavaScript; light and dark themes.

### Changed before release: the design review

- **Words** (D-1 to D-10, D-15, D-27, D-34, D-35): findings first, in the response labels;
  disagreement and ranks in words ("10th strictest of 88"); "clearly" and "too close to call" for
  how sure; plain names for the toggles and samples; one decimal everywhere.
- **Order** (D-5, D-16 to D-23, D-33, D-36): every module's main chart on the first phone screen,
  with summaries, tables and notes under it; shorter ledes and notes; a one-row control bar with
  the sample under Options.
- **Navigation** (D-11 to D-14, D-21, D-24, D-28, D-29, D-31): the header reads Tour, Situations,
  Societies, Who's watching, Then and now, Method, and names the module on phones; the hub and the
  search; on touch a tap on a society's dot shows its tip, whose button selects it; Back steps
  through pages, societies and comparisons, not toggles; a map on the societies index.
- **The quiz and the tour** (D-2, D-9, D-10, D-22): the reveal brings its chart into view; the
  summary has a takeaway; the tour's first step has a new picture and every step is shorter.
- **The look** (D-25, D-26, D-37 to D-39): paper and ink, the palette as a band and a tile, marks
  in one ink, beeswarm dots coloured as on the map, more colour near the middle of the dark ramp,
  and share cards headed by findings, with the credit in two lines.
- What happened to each finding is in section 10 of `docs/design-review.md`; the SRS lines these
  changes need are proposed in `docs/srs-changes.md`.

### How it is built

- An offline Python pipeline verifies the OSF files, rebuilds the paper's samples (25,422
  respondents in 90 societies; 18,656 in 71; 15,599 in 80) and publishes only aggregates: nothing
  respondent-level, and nothing describing fewer than 10 respondents (DR-9, DR-16).
- A static SvelteKit site on GitHub Pages: 289 pages, about 34 MB, no server, database or cookie.
  The only third party is Cloudflare Web Analytics, which sets no cookie (NFR-31, C-11).
- Checked on every pull request: the pipeline's tests and privacy scan, unit and end-to-end tests,
  axe in both themes (WCAG 2.2 AA, NFR-10), Lighthouse budgets, the content review (AT-12), the
  share images' credits, five browsers, visual regression, and on phones a chart on every module's
  first screen with no layout shift as a link's query applies.

### Fixed at launch

- The privacy notice now says the analytics record which page is open, a society's or pair's page
  included, but not the query string or the quiz answers (decision 105).
- The method page says how to report an accessibility problem (decision 106).
- The method page, the story and each society's facts panel are corrected where the GSN paper or
  the data say otherwise: the paper's model, recruitment, student status, measurement invariance,
  the shrunken estimate's interval, and the 2026 audience analysis's author list (findings L-2 to
  L-17 in `docs/launch.md`).
- The content review catches a causal phrase wrapped across two lines (L-19).

### Not checked before release

- Screen readers (VoiceOver, NVDA), a real iPhone and each browser's previous version were not
  checked by hand (NFR-13, NFR-20; decision 109). Automated accessibility and browser tests stood
  in, and these checks come first in `docs/v1.1.md`.
- The method page was reviewed by an AI agent rather than a human second reader (§9.4; decision
  110).

### Milestones

| Milestone | Date | Exit criteria (SRS §10) |
| --- | --- | --- |
| M0 Setup and data check | 22 October 2026 | Repository, CI, placeholder page, the paper's counts reproduced |
| M1 Pipeline and privacy gate | 22 October 2026 | All data outputs; estimator tests and privacy scan |
| M2 Core live, not announced | 22 October 2026 | FR-1 to FR-27, FR-80 to FR-87; AT-1, AT-2, AT-11 |
| M3 Society fingerprint | 22 October 2026 | FR-30 to FR-34 |
| M4 Who's watching? | 22 October 2026 | FR-40 to FR-43 |
| M5 Change since the early 2000s | 22 October 2026 | FR-50 to FR-53; AT-4 |
| M6 Quiz and guided story | 23 October 2026 | FR-60 to FR-65; AT-3 |
| M7 Polish | 23 October 2026 | Share images, method page, audits; AT-5 to AT-10, AT-12 |
| Design changes | 24 October 2026 | The design review's 39 findings; decisions 111 to 140 |
| Public launch | — | Launch checklist (§9.4) complete |
