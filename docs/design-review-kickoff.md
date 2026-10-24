# Kickoff: The Etiquette Atlas, design review

You are reviewing the design of **The Etiquette Atlas**, a free, static site built from aggregates of
the Global Study of Everyday Norms (GSN). It is live at https://nathan98000.github.io/EtiquetteAtlas/
and close to its public launch. I'm the sole maintainer. I want a critical, independent evaluation of
its design, not reassurance: assume you have no stake in the current choices, say plainly what does
not work, and back every claim with evidence from the pages themselves.

This session produces a report. It changes no code, data, SRS or setting, and it pushes nothing.

## 1. The four goals

Judge the site against these, in this order of weight:

1. **Understandable to a lay audience.** The primary reader (SRS §2.3) is a curious member of the
   public, often on a phone, arriving through a shared link, with 2–5 minutes and no statistics.
   Within seconds of landing on any page they should know what it shows and what to do next, and
   they should be able to read a chart without the method page. Look hard at jargon (for example
   "shrunken", "centered", "disagreement", "interval", "situated behavior", "Paper's sample",
   "Attention check", scores like +0.8 on a −2.5 to +2.5 scale), at what a number means to a
   reader, and at whether uncertainty is shown in a way a lay reader can use.
2. **Easy to navigate.** A reader should always know where they are, how they got there, what else
   there is and how to get back. Check the header, the links between modules, the global controls
   (society, sample, scale, theme), the back button (every view change is a history entry,
   decision 31), dead ends, and how a shared link lands someone mid-site.
3. **Not too much text on each page.** Measure it (section 4). Find the paragraphs that could be
   cut, shortened, moved behind a disclosure or replaced by a label on the chart. Some text is
   required (section 5): propose a lighter way to carry it rather than dropping it.
4. **Aesthetically pleasing and somewhat distinctive.** Hierarchy, typography, colour, spacing,
   chart styling, consistency across modules, both themes, phone and desktop. Then say what, if
   anything, makes it recognisable rather than a generic dashboard, and how it could become more so
   within the constraints.

Separate usability problems (a reader gets stuck, misreads or gives up) from matters of taste, and
say which each finding is.

## 2. Read first

- `CLAUDE.md`: the rules, layout and conventions.
- `The Etiquette Atlas Software Requirements Specification.md`: §2.3 (who the site is for), §6 (routes,
  layout, interaction, visual design, language and numbers), §7.1 and §7.2 (performance and
  accessibility), and FR-1, FR-2, FR-4, FR-6, FR-7, FR-27, FR-87 and NFR-11.
- `docs/decisions.md`, only to learn why things are as they are (for example 31 on URL state, 34 on
  the colour encodings, 81 and 83 on the story, 91 on the share images). A decision is not a reason
  to keep a design that fails a reader: say so when a decision is the problem.
- `docs/v1.1.md`: known gaps. Raise one again only if it matters more to a lay reader than its place
  there suggests.

Do not open `docs/reference/` or `data/raw/`: they hold respondent-level data. You do not need them.

## 3. What to review

Every module, at a phone width (375 × 812), a tablet width (768) and a desktop width (1280), in the
light and the dark theme:

- `/` (the quiz): before answering, after one answer, and the summary; once with a society chosen.
- `/story/`: every step.
- `/explore/` with no society and with `?society=jpn`; a cell, `/explore/eat/bus/?society=jpn`, and a
  divisive one, `/explore/sing/funeral/`.
- `/societies/`, `/societies/usa/`, `/societies/usa/?compare=jpn`, and `/societies/mng/` (a society
  with nothing to draw).
- `/audiences/` and `/audiences/usemphone/`, with a society and with the gender split.
- `/change/`, `/change/jpn/` and `/change/?society=chl` (a society not in the older survey).
- `/method/`, and the 404 page (any unknown address).
- The share images for a few routes (`/share/home.png`, `/share/explore/sing/funeral.png`,
  `/share/societies/usa.png` under the site's address), as a reader meets them in a social feed.

## 4. How to look

**Without counting page views.** The pages load the Cloudflare Web Analytics beacon. Do not open the
site in an ordinary browser, in the app's built-in browser pane, or from `npm run preview` in a
browser: each sends real page views. Drive the pages with Playwright's Chromium from a script in your
scratchpad, with the beacon stubbed on the browser context before any page loads:

```js
await context.route('https://static.cloudflareinsights.com/**', (r) =>
	r.fulfill({ status: 200, contentType: 'text/javascript', body: '' })
);
await context.route('https://cloudflareinsights.com/**', (r) => r.abort());
```

Use the live site, or `build/` served by `npm run preview` from `site/` (after `npm run build`).
Pages are prerendered and then mount; wait for `document.documentElement` to have the
`data-hydrated` attribute before you measure or click. Firefox will not start in the agent's macOS
sandbox; Chromium is enough here. Keep screenshots in your scratchpad, never in the repository.

**Measure, then judge.** For each route, record:

- visible words on the whole page, on the first screen at 375 px and at 1280 px, and before the first
  chart;
- the longest paragraph, and a reading-ease or grade estimate for the main prose (a simple
  syllable-count heuristic in your script is enough; say it is approximate; add no dependency);
- the jargon a lay reader meets on the first screen;
- how many controls compete for attention on the first screen;
- what the first screen shows at 375 px: is there a chart, a headline finding, or only text and
  controls?

**Walk the reader's tasks.** As a first-time visitor on a phone, arriving at the page named, try each
of these, and record the steps, where you hesitated, what you misread and whether you succeeded:

1. From `/`, in 5 seconds: what is this site, and what can I do here?
2. Answer the quiz and say, in your own words, what the result means.
3. How appropriate do respondents in Japan find eating on a bus, and is that unusual?
4. Arriving cold at `/explore/sing/funeral/` from a shared link: what does this chart say?
5. Which society's answers are most like those of respondents in the United States, and how are
   the two different?
6. Does it matter who is watching when someone uses a mobile phone?
7. Did respondents in Japan judge music on headphones in a library differently in 2023–2024 than in
   2000–2003, and how sure can I be?
8. Is a score for a society with few respondents trustworthy, and how would I know?
9. Switch to "Centered" and explain what changed and whether I should use it.
10. Share the view I'm looking at with a friend, then use Back to return to where I started.

Then do a 5-second test of each module's first screen at 375 px: what it is, what it shows, what to
do next.

**Look at the visual design as a whole.** Compare the modules side by side for consistency. Judge the
type scale, weights and measure; colour and contrast beyond the minimums; spacing and density;
chart labelling and legends; how the two themes feel; focus and hover states; and the share images.
For distinctiveness, compare against well-known editorial data sites from your own knowledge (for
example The Pudding, Our World in Data, the Financial Times' and the New York Times' interactives).
Do not browse them from the review's browser context.

## 5. Constraints your proposals must respect

Propose freely, but mark any proposal that would touch one of these, and never one that breaks a
non-negotiable rule in `CLAUDE.md`:

- **Static and private:** no server, no new third party (the CSP allows only the beacon; fonts must be
  self-hosted, `font-src 'self'`), no cookies. The site uses the system font stack; §6.4 allows one
  self-hosted sans-serif family, which costs first-load budget and is my decision. No new major
  dependency without my agreement.
- **Required content** may be moved, shortened or put behind a disclosure, not removed: the
  attribution footer on every page (FR-6, NFR-40); "About this chart" (FR-7); a one-sentence summary
  and "Show as table" for every chart (NFR-11); the sample badge (FR-4); "too few responses" and "not
  asked" (FR-27, DR-9); the change pages' provenance note (NFR-41, C-6); the method page's privacy
  notice (FR-92, NFR-34); "Skip to the atlas" (FR-1); header links to every module (FR-2); a text
  summary without JavaScript (FR-87).
- **Wording rules,** in any text you suggest: "respondents in Chile", never "Chileans"; observations,
  never causes; the 2000–2003 comparison is a difference between two surveys, never change in anyone;
  the regions are the GSN authors' grouping (FR-73, FR-52, §6.5). `npm run check:content` enforces
  them on the built site.
- **Accessibility:** WCAG 2.2 AA; text 4.5:1 and chart marks 3:1 in both themes; nothing by colour
  alone; full keyboard use; reduced motion; 200% zoom; no sideways scrolling from 320 px (NFR-10 to
  NFR-14, NFR-21).
- **Performance:** at most 200 KB of compressed JS and CSS on any route's first load (NFR-1); LCP
  within 2.5 s and no layout shift (NFR-2): charts' space is reserved and a prerendered summary shows
  first.
- **Colours** come from the tokens in `site/src/app.css` and `site/src/lib/charts/colors.ts`. The
  blue–orange diverging palette (decision 34) may be questioned, but it must stay colour-blind safe.
- **The launch freeze:** the site is about to launch as v1.0, and only fixes go in before then. Mark
  each proposal **before launch** (small, low-risk, and fixing a real comprehension or navigation
  problem) or **v1.1**. I decide; you implement nothing.

## 6. What to deliver

Write the report to `docs/design-review.md` and commit it locally in one commit (no screenshots in
the repository, no push). In it:

1. **Verdict per goal:** a score from 1 to 5 with three or four sentences on why. Be honest; a 3 is
   fine if it is a 3.
2. **The ten changes that would most help a lay reader,** ranked by impact on that reader against
   effort.
3. **Findings,** one table: ID (D-1, D-2, …), route or routes, goal, what is wrong, evidence (a
   measured number, a quote, what a screenshot shows), usability or taste, severity (stops a lay
   reader, slows them, polish), the proposed change, effort (S, M, L), the constraints it touches
   (section 5), and before launch or v1.1.
4. **Page by page:** for each route, the first-screen impression at 375 px and 1280 px, its
   measurements, and what to cut, move or merge.
5. **Text:** the measurements in one table, and the five heaviest passages each rewritten shorter,
   keeping their facts and the wording rules.
6. **Navigation:** how the modules connect today, where readers get lost or stuck (from the tasks),
   and a proposed structure if it should change.
7. **Visual identity:** what reads as generic now, and two or three directions for a more distinctive
   look within the constraints, each with its trade-offs and cost.
8. **What works,** specifically, and should be kept.
9. **Questions for me,** where a choice is mine (for example a self-hosted typeface, or dropping a
   module from the header).

In your final message, list the screenshot paths for the findings you rate as stopping a lay reader,
so I can open them.

## 7. Out of scope

- Changing code, data, the SRS, the decisions or any setting; pushing; publishing anything.
- The data and statistics themselves (estimates, intervals, samples), except how they are presented.
- Re-checking accessibility conformance in full: axe runs in CI. Report an accessibility problem
  only when you meet one in passing.
