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
M7; the launch adds only fixes (SRS §10).

### What the site does

- **Quiz** (`/`; FR-60 to FR-63): three questions, one at a time, each placing the reader's answer
  among the societies' estimates and, with a society chosen, among its respondents' answers. The
  answers stay in the tab (C-12).
- **Guided story** (`/story/`; FR-64, FR-65): six steps, from the paper's finding that norms vary
  more across situations than across societies to the most and least disputed pairs, an audience
  effect and the largest difference between the two surveys.
- **Explore** (`/explore/`; FR-10 to FR-27): the 15 × 10 matrix of global means and disagreement,
  sortable, with a society's stricter or looser pairs; a page for each of the 150 pairs with a
  beeswarm of the societies, a linked dot map, the selected society's rank, intervals, shrunken or
  raw estimates, the behavior's strip across situations and "too few responses" or "not asked"
  where a society cannot be shown.
- **Societies** (`/societies/`; FR-30 to FR-34): an index by the GSN authors' regions and a
  fingerprint for each of the 90 societies, with notably stricter or looser pairs, the five most
  similar societies, a facts panel and a compare mode.
- **Who's watching?** (`/audiences/`; FR-40 to FR-43): each behavior alone, in front of colleagues
  or classmates and in front of management or professors, globally or for one society, with the
  actor's gender and, globally, the respondents' gender.
- **Change since the early 2000s** (`/change/`; FR-50 to FR-53): the 26 societies in both the
  2000–2003 survey (Gelfand et al. 2011) and the GSN, as differences between surveys with their
  provenance; one build setting removes the module (R-6).
- **Method** (`/method/`; FR-70 to FR-73): what each chart shows, the three samples, what the atlas
  cannot tell you, the privacy notice, the OSF files' versions and checksums, and every society's
  respondents, student share, languages and fieldwork period.
- **Throughout:** a society picker and sample (All data, the paper's sample, attention check) and
  scale (raw or centered within each society) toggles that follow the reader; every view in the
  URL, with back and forward; a share image for the home page, each module, every pair and every
  society (247); a text summary on every page for readers without JavaScript; light and dark
  themes.

### How it is built

- An offline Python pipeline verifies the OSF files, rebuilds the paper's samples (25,422
  respondents in 90 societies; 18,656 in 71; 15,599 in 80) and publishes only aggregates: nothing
  respondent-level, and nothing describing fewer than 10 respondents (DR-9, DR-16).
- A static SvelteKit site on GitHub Pages: 289 pages, about 36 MB, no server, database or cookie.
  The only third party is Cloudflare Web Analytics, which sets no cookie (NFR-31, C-11).
- Checked on every pull request: the pipeline's tests and privacy scan, unit and end-to-end tests,
  axe in both themes (WCAG 2.2 AA, NFR-10), Lighthouse budgets, the content review (AT-12), the
  share images' credits, five browsers and visual regression.

### Fixed at launch

- The privacy notice now says the analytics record which page is open, a society's or pair's page
  included, but not the query string or the quiz answers (decision 105).
- The method page says how to report an accessibility problem (decision 106).

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
| Public launch | — | Launch checklist (§9.4) complete |
