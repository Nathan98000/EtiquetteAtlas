# Design review

An independent review of The Etiquette Atlas's design against its four goals, as briefed in
`docs/design-review-kickoff.md`. It changes nothing; every proposal is marked **before launch** or
**v1.1**, and the decision is the maintainer's.

**What was reviewed.** The build of `site/` at `9c40ff9` (no site source has changed since it was
built), copied out of `build/` and served by a copy of `scripts/serve-pages.js`. Pages were driven
with Playwright 1.64.1's Chromium from scripts outside the repository, with the analytics beacon
stubbed on every browser context before any page loaded, and measured only after
`data-hydrated`. Widths: 375 × 812 (twice the pixel density, touch, mobile), 768 × 1024 and
1280 × 800, each in the light and the dark theme (`prefers-color-scheme`). Twenty routes (section 4),
the ten reader tasks (section 6) and the share images in `build/share/`. Screenshots are in the
review session's scratchpad, not in the repository; paths below are relative to
`/private/tmp/claude-501/-Users-nathann-Downloads-Projects-EtiquetteAtlas/05140669-f010-4811-90a1-3ddc932e86e2/scratchpad/`.

**How the numbers were made.** Visible words are the words in text nodes that render, excluding
screen-reader-only text and including the header, control bar, footer (62 words) and chart labels.
"First screen" counts text whose first line starts above the fold. "Before the first chart" counts
text that ends above the first chart's drawing area. Reading ease (Flesch) and grade
(Flesch–Kincaid) use a syllable-count heuristic on paragraphs and list items of six words or more:
they are approximate and only good for comparing pages with each other. A lay target is ease 60 or
more and grade 8 or less.

## 1. Verdict per goal

| Goal | Score | Why |
| --- | --- | --- |
| 1. Understandable to a lay audience | **2 / 5** | The response labels ("somewhat inappropriate") and the careful "respondents in Japan" sentences carry a lot, but the pages lead with the model's numbers (−0.9 on a −2.5 to +2.5 scale, disagreement 0.89, "beyond their 95% intervals") and its names (Shrunken, Centered, Paper's sample, notably, pair) exactly where a reader decides whether to stay. The most personal question, "what about my society?", is answered at the bottom of the drill-down, under a first sentence about the global average that reads as if it were the society's (D-1). The guided tour, the natural on-ramp, opens with a chart of a model's standard deviations whose longest bar undercuts its own headline (D-2). Uncertainty is shown everywhere, but as intervals, which a lay reader cannot turn into "how sure" (D-4). |
| 2. Easy to navigate | **3 / 5** | The skeleton is sound: a persistent header, "← All 150 pairs"-style back links on every child page, links between modules where they matter, URLs that restore a view exactly and a Back button that retraces every step. On a phone the reach breaks down: 150-row lists in paper order with no way to jump (eating on a bus is ten screens down), the compare picker thirteen screens down, the scale and Copy link inside "Options", no visible module name, and a tap on a dot that silently replaces the reader's society (D-12, D-14, D-21, D-24). The home page sends a first-time reader to the densest view, the matrix, and never offers the tour until the quiz ends (D-11). |
| 3. Not too much text | **2 / 5** | Every module puts 87 to 157 words on the first phone screen, and 18 of 20 routes have no chart there; the readers meet 76 to 288 words before the first chart (section 5). Module prose reads at grade 9 to 13 (approximate). Much of the weight is repeated boilerplate (the 113-word provenance note on four pages, the 56-word audiences credit on sixteen, a 63-word note explaining the axes) and summaries that restate the chart in numbers instead of saying what it means. |
| 4. Pleasing and somewhat distinctive | **3 / 5** | Clean, consistent and careful: one chart frame everywhere, a colour-blind-safe palette used consistently, honest empty states, both themes worked through, no sideways scrolling at 375 px on any route. But it reads as a well-made documentation site or dashboard: system font, grey control bar, boxed panels, bordered grey buttons, and a blue that means both "link" and "appropriate". The share cards, with their palette band and finding headlines, are more distinctive than the site they advertise. |

## 2. The ten changes that would most help a lay reader

Ranked by impact on the primary reader (a phone, a shared link, 2–5 minutes) against effort.

| Rank | Change | Findings | Effort | When |
| --- | --- | --- | --- | --- |
| 1 | **Lead with the reader's society when one is chosen.** On a drill-down, move the society's box (rank, value, stricter or looser) to just under the title, and say it in the first line: "Respondents in Japan: somewhat inappropriate (−0.6), stricter than the global average; 10th strictest of 88." In the phone list, show the society's value in each row, not only ▲ ▼. | D-1, D-13, D-27 | S (box), M (rows) | Box and rank wording before launch; rows v1.1 |
| 2 | **Say the finding first, in words; put the numbers second.** Each lede and share card opens with an observation ("Societies disagree about singing at a funeral ceremony more than about any other pair"), uses the response labels and the share choosing an appropriate answer, and moves signed scores and disagreement values into the details and axes. | D-5, D-6, D-7, D-16, D-38 | M | Cell-page order before launch; wording sweep v1.1 |
| 3 | **Fix the tour's first step and offer the tour from home.** Rewrite step 1 in plain words now (section 5); for v1.1, replace the standard-deviation bars with a concrete picture and move them to the method page. Add "or take the 2-minute tour" beside the quiz. | D-2, D-11, D-22 | S now, M later | Text and link before launch; new chart v1.1 |
| 4 | **Make the quiz pay off.** After "See where your answer falls", scroll the chart into view and say the result in a sentence a reader can repeat; end with a summary that has a takeaway, the chosen society and one picture. | D-9, D-10 | S (reveal), M (summary) | Reveal before launch; summary v1.1 |
| 5 | **Say how sure in words.** "Clearly higher", "clearly lower", "too close to call" next to ▲ ▼, one plain sentence on what a 95% interval means, and a tip on a hollow dot that says what few respondents do to an estimate. | D-4, D-15 | S | Before launch |
| 6 | **Show which scale is on, and name the toggles plainly.** A visible chip by the chart title whenever Centered is on, a sentence saying what it does (and that the matrix hardly changes), and v1.1 labels such as "As answered / Adjusted for small samples". | D-3, D-8 | S, then M | Chip and sentence before launch; renames v1.1 |
| 7 | **Halve the boilerplate.** One visible sentence of the provenance note, the audiences credit and the facts panel's notes, the rest behind a disclosure; drop restated numbers from chart summaries. | D-18, D-19, D-20, D-22, section 5 | S | Before launch |
| 8 | **Make phone lists findable.** "Jump to a behavior" on the 150-row lists, interesting-first default orders (largest differences on a fingerprint, largest drop on the audiences), a "Compare with…" button near the top of a fingerprint. | D-12, D-21, D-31 | M | Compare button before launch; the rest v1.1 |
| 9 | **On touch, a tap previews; it does not replace the reader's society.** First tap shows the tip with a button to select; selection stays a deliberate act (§6.3). | D-14 | M | Before launch |
| 10 | **Let the colour speak.** A lighter disagreement mark in one ink on the matrix, the same estimate colouring for beeswarm dots as on the map and the share card, and a UI accent that is not the data's blue. | D-25, D-26, D-37 | M | v1.1 |

## 3. Findings

Goal: 1 lay reader, 2 navigation, 3 text, 4 look. Kind: usability (a reader gets stuck, misreads or
gives up) or taste. Constraints (brief §5): **Static** (static and private), **Req** (required
content, named), **Words** (wording rules), **A11y**, **Perf** (NFR-1, NFR-2), **Colour** (tokens and
palettes), plus any decision or SRS item the change would amend.

| ID | Route(s) | Goal | What is wrong | Evidence | Kind | Severity | Proposed change | Effort | Constraints | When |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D-1 | `/explore/[b]/[s]/?society=` | 1, 2 | With a society chosen, the drill-down opens with the global average and puts the society's answer at the very end, so the first sentence reads as the society's. | Society box reads "Japan"; the lede below it: "On average, respondents in 90 societies judged eating on a bus somewhat inappropriate (−0.1; …)". Japan's box ("79th most accepting of 88, −0.6") starts at y = 2,390 px of a 3.8-screen page, the last block before the footer; at 1280 it is on the second screen. Task 3. `shots/cell-eat-bus-jpn/phone-light-s01.png`, `shots/cell-eat-bus-jpn/phone-light-s04.png`, `shots/tasks/t3-4-cell-first-screen.png` | Usability | **Stops** (misread) | Move the "Respondents in Japan" box (or its first two lines) directly under the title on every width, and reserve its height on all cell pages, showing "Pick a society to see where it stands" without one, as the box already does at the bottom. | S | Perf (NFR-2: reserve the box; the v1.1 `?society=` shift gap) | Before launch |
| D-2 | `/story/` step 1 | 1 | The tour opens with the paper's model: bars of standard deviations whose longest bar ("Single ratings, beyond what the model explains", 1.11) dwarfs the two the headline is about, so the picture contradicts "Situations matter more than societies". | Bars 0.31, 0.19, 1.11 in black; step text 60 words with "standard deviation", "situated behaviors", "beyond what the model explains"; first chart at y = 1,084 px on a phone; story prose grade ≈ 10. `shots/story/phone-light-s01.png`, `shots/story/phone-light-s02.png`, `shots/story/desktop-light-first.png` | Usability | **Stops** | Now: the shorter step text in section 5 and bar labels a reader can say aloud ("Two situations, typically", "Two societies, typically"). v1.1: open with a concrete picture from All data (one behavior's 10 situations beside the spread of 90 societies on one pair) and move the model's bars behind "How the paper measured this" or to `/method/#story`. | S now, M later | Decision 83, FR-64 (the opening finding stays), Req (NFR-11 table, FR-7) | Text before launch; chart v1.1 |
| D-3 | All routes with the control bar, mostly `/explore/` | 1, 2 | Switching to Centered changes nothing a reader can see on the matrix, and after "Options" closes on a phone nothing says the scale is centered. | Summary before and after differs only in its last words ("…least about shouting in anger in a job interview" → "…least about eating in a restaurant"); the fills cannot move, since the centered and raw global means differ by at most 0.01 (decision 37); the legend still reads "Extremely inappropriate … Extremely appropriate"; the only "center" words on the page are inside the closed Options panel. Task 9 failed. `shots/tasks/t9-2-centered.png`, `shots/tasks/t9-3-centered-closed.png` | Usability | **Stops** | A chip by each chart title while centered ("Centered scale: each society's own average is 0 · Back to answers as given") and one sentence under it saying what changes; on the matrix, say that the global averages barely move and point to the fingerprints, where centering matters. v1.1: plainer toggle labels (D-8). | S | Req (FR-5 toggle stays), Words | Before launch |
| D-4 | `/change/`, `/change/[society]/`, `/story/` step 5 | 1 | A reader can see the direction of a difference but cannot answer "how sure can I be?". | Row: "+1.6 ▲ · 2000–2003 −0.2 · 2023–2024 +1.4"; the legend: "Blue arrows and ▲: judged more appropriate in 2023–2024, beyond the 95% interval of the difference … Grey: within the interval"; the interval's values only in "Show as table"; "interval" appears 27 times on `/change/jpn/`. Task 7, second half failed. `shots/tasks/t7-3-row.png`, `shots/change-jpn/phone-light-s02.png` | Usability | **Stops** | Words beside the marks: "▲ clearly higher in 2023–2024", "▼ clearly lower", "too close to call", with one line once per page: "Clearly means the gap is bigger than the surveys' margin of error (a 95% interval)." v1.1: draw each pair's interval as a faint band behind the arrow. | S (words), M (band) | Words (a difference between surveys), A11y (keep ▲ ▼, not colour alone) | Words before launch; band v1.1 |
| D-5 | `/explore/[b]/[s]/` (150 pages) | 1, 3 | The headline is the topic, the first chart is the behavior's strip, and the cell's own finding (who is strictest, who loosest, how much societies disagree) arrives on the second or third screen. | h1 "Singing at a funeral ceremony"; first chart "Sing in each situation"; the beeswarm's drawing starts at y = 1,626 px on a phone (third screen) and 1,111 px at 1280; the finding sentence ("run from −2.3 among respondents in Saudi Arabia to +1.2 among respondents in the Caribbean") at about y = 1,450 px. Task 4. `shots/cell-sing-funeral/phone-light-s01.png`, `shots/cell-sing-funeral/phone-light-s02.png` | Usability | Slows | Beeswarm first, strip after it; the lede is the finding (rewrite in section 5); the Shrunken / Raw and uncertainty controls go under the beeswarm, not above it. | S | Perf (reserved heights move with the charts), visual baselines | Before launch |
| D-6 | `/`, `/explore/`, cells, `/audiences/*`, `/change/*`, `/story/` | 1 | Signed scores on a −2.5 to +2.5 scale lead the prose, and the scale is rarely introduced where they appear. | First phone screen of a cell page carries six signed scores (−0.1, +2.1, −1.8, −0.5, +0.6, −1.1); `/explore/` opens with "−2.0 … +2.1"; the quiz says "very appropriate (+1.5)"; the scale is stated only in a small note on the audiences and change pages ("Raw scores, from −2.5 …"). §6.5 already prefers the response labels. | Usability | Slows | Lead with the label and the share choosing an appropriate answer ("somewhat inappropriate; 49% chose an appropriate answer"); keep scores in details, tables and axes; where a score must appear, give the scale once beside it ("on a scale from −2.5, extremely inappropriate, to +2.5"). | M | Words, `check:content` | v1.1 (the quiz's sentence before launch, D-9) |
| D-7 | `/explore/`, cells, `/story/` | 1 | "Disagreement" is shown as a bare number with no meaning for a lay reader. | "disagreement between societies is 0.89, the highest of the 150 pairs"; legend circles "0.20 0.50 0.80"; "Most universal: Shouting in anger in a job interview (0.16)". | Usability | Slows | Say it as a rank and in words ("societies disagree about this more than about any other pair"; "about as much as a typical pair, 70th of 150"); legend "less ← → more disagreement" without numbers; the value stays in details. | S–M | Words | v1.1 |
| D-8 | All modules | 1 | Jargon in control labels and chart titles: "Estimate: Shrunken / Raw", "Every society's shrunken estimate", "Global mean ± disagreement", "Paper's sample", "Attention check", "notably", "fingerprint", "Similarity is the correlation of two fingerprints". | Desktop's control bar shows "Paper's sample", "Attention check", "Raw scores", "Centered" on every module's first screen; the fingerprint's facts panel: "All data: 829 · Paper's sample: 829 · Attention check: 756". | Usability | Slows | Now: the beeswarm title "Every society's average answer" (the toggle says which estimate). v1.1: "As answered / Adjusted for small samples"; "Everyone / The paper's sample / Passed the attention check"; "notably" → "clearly"; define "pair" once ("a behavior in a situation"). | S now, M later | Words, Req (FR-4 badge, FR-22 toggle), method page and tests | Title before launch; renames v1.1 |
| D-9 | `/` (reveal) | 1, 3 | The reveal's sentence is hard to restate, the chart is below the fold when it appears, and the chart's shapes and colours are not explained. | After the tap, the reveal's heading sits at y ≈ 572 of an 812-px screen and the chart about a screen lower; "Your answer, very appropriate (+1.5), is above the average answer of respondents in 4 of 87 societies and below it in 83; 3 societies have too few responses or were not asked." (37 words; "below it in 83" means those societies were more approving); no region key; "Global mean +2.1" overlaps the "Your answer" line; the note says "estimated with shrinkage". Task 2. `shots/tasks/quiz/none-q1-after-click.png`, `shots/tasks/quiz/none-q1-reveal-2.png` | Usability | Slows | Scroll so the chart's top is in view; the sentence in section 5; one colour for the dots (or the estimate fill), so no key is needed; nudge the global-mean label off the marker; drop "estimated with shrinkage" from the note. | S | Words, A11y (focus moves with the scroll) | Before launch |
| D-10 | `/` (summary) | 1, 2 | The end of the quiz, the moment to hook a reader, is three long repetitive sentences with no takeaway, no picture, nothing to share, and no word about the society the reader chose. | Three 37-word sentences; with Japan chosen, the summary never mentions Japan; links read "See every society for this pair". `shots/tasks/quiz/none-summary-1.png` | Usability | Slows | One takeaway line ("On 2 of 3, most societies' average answers were more approving than yours"), a three-row strip (your answer against the spread of society averages), the chosen society's share per question, then "Take the 2-minute tour" as the main button. | M | Words, C-12 (answers stay in the page), FR-63 | v1.1 |
| D-11 | `/` | 1, 2, 4 | The only filled button above the fold leads away from the quiz; no answer is on the first phone screen; the tour is not offered. | "Skip to the atlas" is the primary blue button; the first answer starts at y = 821 px on an 812-px screen; the wordmark and the h1 both say "The Etiquette Atlas"; the 37-word intro sits between. `shots/home/phone-light-first.png` | Usability | Slows | Make the first question the hero (h1 or directly under a one-line promise), cut the intro to one sentence ("Rate three situations; your answers stay in this tab."), show "Skip to the atlas" as a secondary link and add "or take the 2-minute tour". | S | Req (FR-1: Skip stays visible), C-12 | Before launch |
| D-12 | `/explore/`, `/societies/[s]/`, `/societies/`, `/audiences/` on phones | 2 | 150-row lists (and the 15 panels, and the 90-society index) run in paper or regional order with no way to jump. | Eating on a bus is at y = 8,047 px of 10,464 on `/explore/` (≈ ten screens down); a fingerprint's list fills screens 3 to 13; "United States" is ≈ 6.6 screens down the index; "Use a mobile phone" is the fourth screen of the audiences. Tasks 3, 5, 6. `shots/tasks/t3-2-eat-bus-row.png` | Usability | Slows | Group the phone lists by behavior with a "Jump to a behavior" select (or collapsed groups of ten); default a fingerprint to "Largest differences first" and the audiences to "Largest drop first"; keep paper order as an option. | M | Decision 31 (route defaults via `defaultsFor`) | v1.1 |
| D-13 | `/explore/?society=` on phones | 1 | With a society chosen, each row still shows the global value; the society only shows as ▲ ▼. | Row "Eat · Bus · −0.1 ▼" with Japan chosen; Japan's −0.6 only in the bottom sheet. `shots/tasks/t3-2-eat-bus-row.png`, `shots/tasks/t3-3-after-first-tap.png` | Usability | Slows | Show the society's value in the row ("Japan −0.6 ▼ · all −0.1"), or draw the society's bar with a tick for the global mean. | M | A11y (row label), Perf (data already loaded) | v1.1 |
| D-14 | Cells, the quiz's reveal, the map | 2 | On a phone, the first tap on a dot replaces the reader's chosen society; a second tap clears it. Each tap is a history entry. | On `/explore/sing/funeral/?society=jpn` one tap on a dot → `?society=som` and the Society box reads "Somaliland"; the next tap → no society. §6.3: "On touch, the first tap shows the tooltip and the second opens." `shots/tasks/phone-dot-tap.png`, `shots/tasks/phone-dot-tap2.png` | Usability | Slows | On touch, the first tap shows the tip only, with a button ("Show respondents in Somaliland" / "Compare"); selection by Enter and by that button. | M | §6.3, FR-3, A11y | Before launch |
| D-15 | Cells | 1 | Small samples are flagged but not explained where a reader looks. | Legend "Hollow: small sample (10–29 respondents)"; whiskers only after "Show uncertainty"; a hollow dot's tip gives its interval and count, but nowhere says that a shrunken estimate with few respondents is pulled toward the global mean. Task 8, partly. `shots/tasks/t8-1-uncertainty-on.png` | Usability | Slows | In a hollow dot's tip: "Only 18 respondents: this estimate is pulled toward the global average, and the true average could be anywhere from −1.6 to −0.8." | S | Words | Before launch |
| D-16 | `/audiences/` | 1, 3 | The module's finding is in a chart summary; the lede describes the survey; the 15 panels look alike and have no axis labels. | Lede (31 words) describes the questions; the finding ("every one of the 15 behaviors less appropriate in front of management or professors than when alone") is the chart's summary; first panels at y = 1,224 px on a phone and at the fold (800 px) at 1280; a 63-word note explains the axes. `shots/tasks/t6-1-audiences-first.png`, `shots/tasks/t6-2-phone-panel.png` | Usability | Slows | The finding as the lede (it is already the share card's headline); "Alone · Colleagues · Management" once above the grid and the axis ends on the first panel; the note cut to one line (section 5). | S | Req (FR-43 credit) | Before launch |
| D-17 | `/audiences/[b]/` on phones | 1 | The phone's slopegraph labels its axis with numbers; desktop labels it with the response labels. The primary reader gets the harder version. | Phone: "+2.5 +1.5 +0.5 −0.5 −1.5 −2.5"; 1280: "Extremely appropriate … Extremely inappropriate". `shots/aud-usemphone/phone-light-s02.png` | Usability | Slows | Response labels on phones too, abbreviated if needed ("very appr."), or words at +2.5, 0 and −2.5 only. | S | A11y | Before launch |
| D-18 | `/change/`, `/change/[s]/`, `/story/` step 5 | 3 | Heavy text before the first chart. | `/change/`: 260 words before the first chart on a phone (chart at y = 1,548 px), a 66-word lede with "beyond their 95% intervals" twice, then the 113-word provenance note, repeated on `/change/jpn/` and in the story. `shots/change/phone-light-first.png` | Usability | Slows | The lede as one sentence; the provenance note's first two sentences visible and the rest behind "About the 2000–2003 data" (section 5). | S | Req (NFR-41, C-6, FR-52: shortened, not removed), Words | Before launch |
| D-19 | `/change/?society=` (not in both surveys) | 2 | The notice that the society is not in the older survey comes after the 66-word lede, and its action reads "Clear the society". | `shots/change-chl/phone-light-s01.png` | Usability | Slows | The notice first, with the 26 societies to pick from (or a picker limited to them); "Show all 26 societies" instead of "Clear the society". | S | FR-53, Perf (the v1.1 `?society=` shift gap) | Before launch |
| D-20 | `/societies/[s]/` | 1, 3 | The facts panel and the similarity explanation come before the fingerprint. | Chart at y = 2,011 px on a phone (third screen) and 1,196 px at 1280; 288 and 343 words before it; facts include "Flagged as students 86%", the three samples' counts and a 35-word note on how student status was recorded. `shots/soc-usa/phone-light-first.png`, `shots/soc-usa/desktop-light-s01.png` | Usability | Slows | The fingerprint (or its five largest differences as a short list) first; similar societies next; facts collapsed under "About these 829 respondents". | S–M | Req (FR-34 facts stay), Perf | v1.1 |
| D-21 | `/societies/[s]/` on phones | 2 | The "Compare with another society" picker is the last thing on the page. | Picker at y = 10,550 px (≈ 13 screens down). The "Compare" links in the similar list do jump straight to `#compare`, which works well. `shots/soc-usa/phone-light-s14.png` | Usability | Slows | A "Compare with…" button by the title that opens the picker and jumps to `#compare`. | S | — | Before launch |
| D-22 | `/story/` | 3 | The tour is long for "a few steps" on a phone. | 1,104 words and 10.6 phone screens; each step repeats "Show as table" and "About this chart"; step 5 lists 20 of 26 societies (three screens) before "Show all 26 societies"; no chart on the first screen. `shots/story/phone-light-s08.png` | Usability | Slows | About 50 words and one chart per step; step 5 shows the five largest differences; one "About this chart ▸" per step holding the table toggle. | M | Req (NFR-11, FR-7, provenance in step 5) | v1.1 |
| D-23 | All routes | 1, 3 | The first screen rarely shows a chart. | 375 px: no chart on the first screen of 18 of 20 routes; the two cell pages show only the top of the strip. 1280 × 800: the story's chart and the cells' strip; `/explore/` shows only the matrix's column labels; the control bar takes 151 px at 1280 and 256 px at 768. | Usability | Slows | Follows from D-1, D-5, D-11, D-16, D-18, D-20 and D-33: shorter ledes, charts before panels and one-row chrome. | — | Perf (reserved space) | With those findings |
| D-24 | All routes on phones | 2 | A reader cannot see which module they are in. | The phone bar reads "The Etiquette Atlas · Menu" everywhere; h1s such as "How appropriate is it?" and "Who's watching?" do not name the module; only desktop underlines the current tab. | Usability | Slows | Name the current module in the bar ("Explore ▾" in place of "Menu") or as a small label over the h1. | S | Req (FR-2) | Before launch |
| D-25 | `/explore/` (and fingerprint legends) | 1, 4 | The disagreement dots dominate the cells and change colour with the fill, which looks like a code. | Light theme: 149 dark dots and 1 white; dark theme: 36 dark and 114 light on the same matrix; the dots cover roughly a quarter to a half of each cell, so the fill, the main message, reads second. `shots/explore/desktop-light-s02.png`, `mont/explore-desk-dark-matrix.png` | Usability | Slows | A thin ring or a small corner mark sized by disagreement, in one ink with a 1-px halo, so the fill reads first and no mark changes colour. | M | Decision 34, A11y (3:1), Colour, visual baselines | v1.1 |
| D-26 | Cells | 1, 4 | Three encodings of the same societies: the beeswarm colours dots by region (hollow = small sample), the map fills them by estimate with region as shape (dashed outline = small sample), the share card colours the beeswarm by estimate. | `shots/cell-eat-bus-jpn/phone-light-s02.png`, `shots/cell-eat-bus-jpn/phone-light-s03.png`, `share/sing-funeral.png` | Usability | Slows | Colour beeswarm dots by estimate as the card and map do (region stays as shape), and mark small samples one way everywhere (dashed outline). | M | Decisions 34–36, Colour, A11y | v1.1 |
| D-27 | Cells | 1 | "79th most accepting of 88" makes a reader invert the rank. | Japan, eating on a bus. | Usability | Slows | In the lower half say "10th strictest of 88"; keep "most accepting" in the upper half. | S | FR-25 (its example wording), the rank's v1.1 uncertainty gap | Before launch |
| D-28 | All routes on phones | 2 | Copy link is inside "Options"; there is no share button. | Task 10: found on the second look; "Link copied" then worked and the link restored the view. `shots/tasks/t10-1-after-copy.png` | Usability | Slows | A "Share" button by the title that uses the browser's own share sheet where there is one and falls back to copying. | S | Static (the share sheet sends nothing to a third party), FR-81 | v1.1 |
| D-29 | All routes | 2 | Back steps through every sort and toggle, so leaving a page after a few changes takes many presses. | Four Back presses to return home after choosing Japan, a sort and Centered on `/explore/`; each restores its state exactly (decision 31). | Usability | Slows (minor) | Replace the history entry for sort and toggle changes within a route; push for a new page or society. | S–M | Decision 31, FR-84 | v1.1 |
| D-30 | `/method/` | 3 | The method is long and has no short "how to read" for a lay reader. | 5,132 words and 40 phone screens; a 30-link contents list; longest paragraph 131 words (on the quiz); grade ≈ 12. `shots/method/phone-light-first.png` | Usability | Slows | A five-line "How to read the atlas" box at the top (the scale, the colours, what an average and an interval are, small samples) and the contents grouped under five headings. | M | Req (FR-70, FR-92), L-18 | v1.1 |
| D-31 | `/societies/` | 2, 4 | The index is a list of 90 links with no picture and no finding. | US entry ≈ 6.6 screens down on a phone; the picker above helps. `shots/tasks/t5-2-societies-index.png` | Taste | Slows | The map of the 90 societies (the cell page already draws one) or a small fingerprint thumbnail beside each name. | M–L | Perf (NFR-3, data budget) | v1.1 |
| D-32 | `/change/*`, header | 1 | The module is called "Change", while the wording rule (and its own note) says it is not change in anyone. | h1 "Change since the early 2000s"; header "Change"; the note then says "not a change in anyone's views". | Taste | Polish | "Then and now: two surveys about 20 years apart", header "Then and now" (paths stay). | S | Words, FR-2 and §5.6 naming, `check:content` | v1.1 (question 3) |
| D-33 | All routes with the control bar | 4 | The bar's layout wastes space: at 1280 "Copy link" wraps to a second row (151 px); at 768 every control stacks (256 px); in the phone's Options the Sample control wraps raggedly. | `shots/explore/desktop-light-first.png`, `shots/explore/tablet-light-first.png`, `shots/tasks/t9-1-options-open.png` | Taste | Polish | One row at 1280 with Copy link at the end; "Options" below 1024 too; Sample as a vertical list in the phone panel. | S | A11y (200% zoom) | Before launch |
| D-34 | Cells, matrix details | 1 | Intervals that round to a point read as errors. | "−0.1 (95% interval −0.1 to −0.1)"; "−1.8 (95% interval −1.8 to −1.8)". `shots/tasks/t3-3-after-first-tap.png` | Usability | Polish | When both ends round equal, "(95% interval narrower than 0.1)", or omit it for the global mean. | S | — | Before launch |
| D-35 | `/change/` strips, the audiences card | 1 | Precision varies: two decimals in the change strips ("+0.60", "−0.01") and the audiences card ("2.97", "0.77") against one decimal elsewhere, including the same drops on the page ("3.0", "0.8"). | `shots/change/phone-light-s08.png`, `share/audiences.png`; §6.5 asks for one decimal. | Taste | Polish | One decimal everywhere a reader sees a score or difference. | S | Share images rebuilt (`npm run cards:docker`) | Pages before launch; card with the next card build |
| D-36 | `/societies/mng/` | 2 | A society with nothing to draw still shows an empty chart frame with Sort, Show as table and About this chart, and a compare picker. | `shots/soc-mng/phone-light-s02.png` | Taste | Polish | One empty-state block (the existing sentence plus links to its region's societies); hide sort, table and compare. | S | Req (FR-27 wording) | v1.1 |
| D-37 | All routes | 4 | The UI accent is the data's blue: primary buttons, selected segments ("All data", "Raw scores", "Shrunken"), focus rings and links use `--accent` #1f5fa8, while blue means "appropriate" in every chart and "more appropriate in 2023–2024" in the change arrows. | `site/src/app.css` tokens; any control bar screenshot. | Taste | Polish | A neutral ink (near-black, near-white in dark) for selected states and primary buttons; links can keep a blue. | S–M | Colour, A11y (contrast) | v1.1 |
| D-38 | Share images | 1, 4 | Cell and society cards headline the topic and carry the full lede in small type; the credit band (≈ 88 of 630 px) is unreadable at feed size. | `share/sing-funeral.png` headline "Singing at a funeral ceremony" under a 32-word detail; compare `share/audiences.png`, whose headline is a finding. `mont/share-feed.png` | Taste | Polish | A finding headline per cell and society ("Societies disagree most about singing at a funeral ceremony"), one short detail line, the NFR-40 credit tightened to two lines. | M | Req (NFR-40), decision 91, Words | v1.1 |
| D-39 | `/explore/`, fingerprints, dark theme | 4 | Near-zero fills read as murky browns and slates in the dark theme. | `mont/explore-desk-dark-matrix.png`; the fingerprint case is already a v1.1 gap. | Taste | Polish | More chroma or lightness next to 0 in the dark ramp, checked by `colors.spec.ts`. | M | Colour, A11y, decision 46 | v1.1 |

## 4. Page by page

Measurements are in section 5's table. "5 s" is the five-second test at 375 px: what it is, what it
shows, what to do next.

**`/` (quiz).** 375: wordmark, the title again, a two-line promise, the blue "Skip to the atlas",
"How would you answer?" with a 37-word intro, the society picker and the first question's
heading; no answer is on screen. 1280: the same column with the first question's answers in view.
5 s: a site about etiquette with a quiz (clear); shows text only; the obvious action leaves the
quiz. After one answer the chart is a screen below the button; the summary is three long sentences.
With Japan chosen, the reveal's "8% of respondents in Japan chose very appropriate, as you did"
is the clearest sentence in the quiz. Cut: the repeated title, the intro to one line. Move: Skip to
a secondary link; the tour link beside it. Merge: the summary's three sentences into one strip and
one takeaway (D-9 to D-11).

**`/story/`.** 375: "A guided tour" and a 37-word intro about All data, the sticky step bar,
step 1's heading and text; the first chart is on the second screen. 1280: the step bar and step 1
text beside its chart. Every step: steps 2 and 3 (beeswarms of the most universal and most
culture-dependent pairs) read well; step 4's slopegraph reads well on desktop with response
labels; step 5's arrows run three phone screens; step 6 is a clean list of links. 5 s: clear what
it is and what to do (Next step), not what it shows. Cut: step 1's model language, the 56-word
audiences credit to one line, step 5's list to five rows. Move: the provenance note's detail behind
a disclosure (D-2, D-22).

**`/explore/`.** 375: control bar, "How appropriate is it?", a 34-word description of what colour and
circle mean (before the reader has seen either), chart title, sort, table toggle, a 41-word
summary and the legend; the list starts on screen 2 with "Argue · Funeral". 1280: the same, with the
matrix's column labels at the fold and an empty Details panel at right. With `?society=jpn` the
matrix gains ▲ ▼ and the details gain Japan's line, which works well on desktop. 5 s: "How
appropriate is it?" does not say what "it" is; no chart; next step unclear. Cut: the description to
one line under the legend; the summary to its finding. Move: the legend's numbers off; on phones,
jump-to-behavior above the list (D-6, D-7, D-12, D-25).

**`/explore/eat/bus/?society=jpn` and `/explore/sing/funeral/`.** 375: "← All 150 pairs", the
pair's name, a 32-word global lede, the strip's title, table toggle, summary and the strip's
first row. 1280: the same plus the strip; the beeswarm, map and the society's box are on screen 2.
5 s: clear topic; the screen shows the global average and another chart; the reader's society is
nowhere in sight. The beeswarm with uncertainty on (a ranked dot-and-whisker list) is the best chart
on the site. Cut: "Estimate: Shrunken / Raw" above the chart; "Global mean ± disagreement" (say "where
most societies fall"). Move: the society's box under the title, the beeswarm before the strip, the
links to the audiences and change pages under the beeswarm (D-1, D-5, D-15, D-26, D-27).

**`/societies/`.** 375: title, a 17-word line, a 40-word description and the first region's
societies; no picture. 1280: four columns of names with respondent counts. 5 s: clear; pick one.
Cut: the description to "Pick a society to see where its respondents were stricter or looser than
the average." Add: a picture (D-31).

**`/societies/usa/` and `?compare=jpn`.** 375: the title "Respondents in the United States" and a
lede that already answers task 5's first half ("most like those of respondents in Canada"), then
the facts panel. 1280: title, lede, facts and similar list side by side; the fingerprint is on
screen 2. Compare mode is clear: dumbbells sorted by gap, "differ by 0.5 on average, most of all
about talking in a job interview (+1.4 against −0.8)"; the sign of "+2.2" is not explained (which
society minus which). 5 s: clear who; the screen shows facts, not the fingerprint. Move: chart
before facts; Compare button to the top. Cut: the student-status note to a link (D-20, D-21).

**`/societies/mng/`.** 375: the title and "No pair was rated by 10 or more respondents in Mongolia, so
none can be shown." (clear and honest), the facts, then empty frames with controls. Merge the
empty pieces into one block (D-36).

**`/audiences/`.** 375: "Who's watching?", a 31-word description of the questions, two checkboxes,
a scale note and the chart's title; panels start on screen 2. 1280: the same; panels at the fold.
5 s: clear question, finding not stated, next step unclear. Swap the lede for the finding (D-16).

**`/audiences/usemphone/` (with a society, with the gender split).** 375: a 55-word lede that does
answer task 6, the filters and a scale note; the slopegraph on screen 2 with a numeric axis.
1280: the lede, filters and the chart title; the chart on screen 2 with response labels. With
`?society=jpn` the lede switches to Japan's values and the chart adds Japan's line; with the gender
split the two lines nearly coincide and their end labels touch. 5 s: clear topic, clear answer in
the lede, chart off screen. Cut: the 56-word credit to one line with a link; the Details panel's
"Each difference is between two means; it has no interval of its own" to the About section
(D-17, section 5).

**`/change/`, `/change/jpn/` and `/change/?society=chl`.** 375: a 66-word statistical lede, then
the 113-word provenance note; the arrows start on screen 2. 1280: lede and note fill the screen.
Japan's page reads better: two respondent counts and "Pairs in both 120" are clear facts. Arrows on
phones are short and the dual "2000–2003 −0.2 · 2023–2024 +1.4" line under each repeats them in
text, which helps. The per-behavior strip's "higher in 26 of 26 societies" is the plainest
certainty statement in the module and a model for D-4. 5 s: a page about two surveys; numbers and a
warning; next step unclear. Cut and move per D-18 and D-19.

**`/method/`.** 375: title, a 41-word intro and a 30-link contents list. 1280: two columns of
contents. It is a reference page and its length is defensible; what is missing is the 60-second
version for a lay reader (D-30).

**404.** Two sentences and two links; the best-written page on the site.

**Dark theme.** Carefully done: surfaces, text and the palettes hold up, and the beeswarm's region
colours are brighter and easier to tell apart than in light. The matrix's ink flip (D-25) and the
murky near-zero fills (D-39) are the only problems seen.

**768 px.** The header collapses to Menu as §6.2 says, but the control bar does not (256 px of
stacked controls). The matrix fits well at this width and is arguably its best layout.

**Share images.** In a feed at 500 px wide: the home card ("Is it fine to eat on a bus, or to use a
phone at a funeral?") and the audiences card are strong; the change card's headline is a statistic;
the cell and society cards headline the topic. The cell card's beeswarm, coloured by estimate, is
clearer than the site's own (D-26). The credit is legible at full size and unreadable in a feed.

## 5. Text

### Measurements

Approximate (see the top). Words include the header, control bar and the 62-word footer. Controls
are header + page, counting links, buttons, inputs and selects that are visible on the first screen.

| Route | Words, page (375) | Phone screens | 1st screen, 375 | 1st screen, 1280 | Before 1st chart, 375 / 1280 | Longest paragraph | Ease / grade | Controls, 375 / 1280 | Chart on 1st screen, 375 / 1280 | Lay-hard terms on the 1st phone screen |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 181 | 1.9 | 102 | 116 | – / – | 37 | 61 / 8.9 | 2+2 / 8+6 | none | — |
| `/story/` | 1,104 | 10.6 | 133 | 207 | 172 / 99 | 60 | 45 / 10.1 | 2+9 / 8+13 | no / yes | situated behaviors, standard deviation |
| `/explore/` | 841 | 12.7 | 109 | 189 | 135 / 179 | 41 | 60 / 6.8 | 2+5 / 8+6 | no / labels only | disagreement, pair, −2.0, +2.1 |
| `/explore/?society=jpn` | 864 | 12.9 | 109 | 202 | 158 / 202 | 41 | 61 / 6.7 | 2+6 / 8+7 | no / no | same |
| `/explore/eat/bus/?society=jpn` | 370 | 3.8 | 93 | 143 | 76 / 96 | 32 | 41 / 12.1 | 2+16 / 8+21 | strip only | disagreement 0.45, score, six signed scores |
| `/explore/sing/funeral/` | 363 | 3.7 | 87 | 142 | 76 / 96 | 32 | 37 / 12.7 | 2+10 / 8+20 | strip only | disagreement 0.89, score, six signed scores |
| `/societies/` | 455 | 7.2 | 92 | 151 | – / – | 40 | 58 / 10.5 | 2+8 / 8+23 | none | fingerprint |
| `/societies/usa/` | 1,040 | 13.5 | 116 | 202 | 288 / 343 | 45 | 62 / 6.8 | 2+4 / 8+15 | no / no | notably, Paper's sample, Attention check, flagged as students |
| `/societies/usa/?compare=jpn` | 1,259 | 15.7 | 116 | 202 | 288 / 343 | 45 | 62 / 6.8 | 2+4 / 8+15 | no / no | same |
| `/societies/mng/` | 302 | 2.6 | 137 | 187 | 186 / 207 | 37 | 61 / 8.4 | 2+5 / 8+10 | no / no | same, plus correlation, fingerprints |
| `/audiences/` | 404 | 4.4 | 89 | 215 | 195 / 215 | 63 | 44 / 10.6 | 2+7 / 8+8 | no / no | actor gender, raw scores, −2.5 to +2.5 |
| `/audiences/?society=jpn` | 413 | 4.4 | 91 | 224 | 204 / 224 | 63 | 44 / 10.7 | 2+7 / 8+9 | no / no | same |
| `/audiences/usemphone/` | 360 | 3.0 | 108 | 219 | 162 / 210 | 56 | 43 / 11.6 | 2+5 / 8+8 | no / no | actor gender, +1.8, +0.5, −0.8 |
| `/audiences/usemphone/?society=jpn` | 387 | 3.2 | 102 | 223 | 175 / 223 | 56 | 42 / 12.2 | 2+6 / 8+9 | no / no | same |
| `/audiences/usemphone/?split=gender` | 400 | 3.2 | 118 | 237 | 189 / 237 | 56 | 44 / 11.5 | 2+5 / 8+8 | no / no | same |
| `/change/` | 905 | 8.9 | 137 | 213 | 260 / 308 | 66 | 50 / 9.4 | 2+2 / 8+6 | no / no | 95% intervals (twice), pairs |
| `/change/jpn/` | 631 | 5.3 | 126 | 202 | 245 / 293 | 56 | 49 / 9.5 | 2+4 / 8+8 | no / no | 95% intervals |
| `/change/?society=chl` | 925 | 9.1 | 157 | 221 | 280 / 328 | 66 | 50 / 9.4 | 2+4 / 8+6 | no / no | 95% intervals |
| `/method/` | 5,132 | 40.0 | 90 | 230 | – / – | 131 | 44 / 11.8 | 2+19 / 8+27 | none | shrinkage, centered scores, intervals, disagreement |
| 404 | 103 | 1.0 | 103 | 109 | – / – | 18 | 90 / 2.7 | 2+2 / 8+2 | none | — |

At 1280 the control bar adds "Paper's sample", "Attention check", "Raw scores" and "Centered" to the
first screen of every module but the home page, the story and the method page.

### The five heaviest passages, rewritten

Each keeps its facts and the wording rules. Word counts are of the visible text.

**1. The change provenance note** (`/change/`, `/change/[society]/`, story step 5; 113 words).

> Two surveys, about 20 years apart. The 2000–2003 survey and the 2023–2024 Global Study of Everyday
> Norms asked different people, recruited in different ways, with different questionnaires, in
> different eras. Each value here is a difference between the two surveys' average answers, not a
> change in anyone's views, and it does not say why the answers differ. Only summaries of the
> 2000–2003 survey are shown: each society's average for each pair, never an individual answer.
> 2000–2003 data: Gelfand et al. (2011), Science 332:1100–1104, shared by the GSN authors (Eriksson,
> K., Strimling, P., Vartanova, I., Simpson, B., et al., 2025) in their deposit on OSF. The method page
> explains how the surveys are compared.

Visible (51 words):

> **Two surveys, about 20 years apart.** Different people, recruited differently, answered different
> questionnaires in different eras. Each value is a gap between the two surveys' averages, not a
> change in anyone's views, and it does not say why they differ. 2000–2003 data: Gelfand et al.
> (2011), shared by the GSN authors.

Behind "About the 2000–2003 data ▸": only each society's average for each pair is shown, never an
individual answer; the full citations (*Science* 332:1100–1104; Eriksson, K., Strimling, P.,
Vartanova, I., Simpson, B., et al., 2025, on OSF) and the link to how the surveys are compared.
(Touches NFR-41 and C-6: the credit and the "only summaries" fact stay on the page.)

**2. The change overview's lede** (`/change/`; 66 words).

> Averaged over the 26 societies in both surveys, 63 of the 120 pairs were judged more appropriate in
> 2023–2024 than in 2000–2003 and 46 less appropriate, beyond their 95% intervals; 11 were within
> them. On average over their pairs, respondents in 13 of the 26 societies judged the pairs more
> appropriate in 2023–2024 and in 6 less appropriate, beyond their 95% intervals; 7 were within them.

Lede (33 words):

> Averaged over the 26 societies in both surveys, 63 of the 120 pairs were judged clearly more
> appropriate in 2023–2024 than in 2000–2003 and 46 clearly less; 11 were too close to call.

The second sentence moves to the summary of "Each society, averaged over its pairs", the chart it
describes, in the same form ("respondents in 13 judged the pairs clearly more appropriate on
average, in 6 clearly less; 7 were too close to call"), with D-4's one-line meaning of "clearly".

**3. Story step 1** (`/story/`; 60 words).

> The paper behind this atlas concludes that everyday norms vary "far more across situations than
> across societies". In its model, two situated behaviors typically differ by more (a standard
> deviation of 0.31 on the −2.5 to +2.5 scale) than two societies do (0.19), and both are small next
> to how much single ratings vary beyond what the model explains (1.11).

Rewritten (46 words):

> The paper behind this atlas concludes that everyday norms vary "far more across situations than
> across societies". In its model, two behaviors in their situations typically differ by 0.31 on the
> −2.5 to +2.5 scale, two societies by 0.19, and single answers by more than either (1.11).

"Standard deviation" and the "beyond what the model explains" qualifier (finding L-2) move to the
chart, where the bars are: "Typical difference (standard deviation) in the paper's model" as its
title and "A single answer, beyond what the model explains: 1.11" as the third bar's label.

**4. The audiences' chart note** (`/audiences/`; 63 words).

> In each panel, from left to right: alone, in front of colleagues or classmates, and in front of
> management or professors. Scores run from −2.5 (extremely inappropriate) at the bottom to +2.5
> (extremely appropriate) at the top; the darker line is 0. Points are coloured by score, as on the
> matrix, and a dashed outline marks a small sample (10 to 29 respondents).

Rewritten (28 words), with the three audience names printed once above the first row of panels and
the axis ends on the first panel:

> Higher is more appropriate, from −2.5 (extremely inappropriate) to +2.5 (extremely appropriate);
> the dark line is 0. Colours as on the matrix; dashed outline: 10 to 29 respondents.

**5. A behavior's audiences lede** (`/audiences/[behavior]/`, 15 pages; 55 words).

> On average across the 90 societies, respondents judged using a mobile phone very appropriate when
> alone (+1.8), somewhat appropriate in front of colleagues or classmates (+0.5) and somewhat
> inappropriate in front of management or professors (−0.8): 2.6 lower in front of management or
> professors than when alone, the 3rd largest drop of the 15 behaviors.

Rewritten (41 words):

> On average across the 90 societies, respondents judged using a mobile phone very appropriate when
> alone, somewhat appropriate in front of colleagues or classmates and somewhat inappropriate in
> front of management or professors. Only two of the 15 behaviors drop more.

The three scores and the 2.6 drop go on the chart's points and in the details, where they already
are.

**Also: the two most-read sentences.** The cell lede (150 pages and their share cards):

> On average, respondents in 90 societies judged singing at a funeral ceremony somewhat inappropriate
> (−0.9; 31% chose an appropriate answer), and disagreement between societies is 0.89, the highest of
> the 150 pairs.

→ "Societies disagree about singing at a funeral ceremony more than about any of the 150 pairs. On
average, 31% of a society's respondents chose an appropriate answer." (27 words; for a mid-ranked
pair: "Societies disagree about eating on a bus about as much as about a typical pair (70th of 150).")

The quiz's reveal (every reader, three times):

> Your answer, very appropriate (+1.5), is above the average answer of respondents in 4 of 87
> societies and below it in 83; 3 societies have too few responses or were not asked.

→ "You said very appropriate. In 83 of 87 societies, respondents' average answer was more approving
than that; in 4 it was less. (3 societies had too few responses or were not asked.)" (32 words, as
many as now, but it can be said back without inverting "below".)

## 6. Navigation

### How the modules connect today

- **Header** (every page): the wordmark opens the quiz; Explore, Societies, Audiences, Change,
  Story, Method; Theme. On phones and at 768 px it is a Menu. The society, sample and scale follow
  the reader everywhere except the story (decision 82).
- **Quiz** → a pair's drill-down ("See every society for this pair"), the story and the matrix (from
  the summary only), the matrix ("Skip to the atlas").
- **Matrix** → each pair's drill-down (on phones through a bottom sheet, which also gives the
  society's value).
- **Drill-down** → the other nine situations (strip), previous and next pair, the behavior's
  audiences, the change module (for the 12 behaviors both surveys asked), "← All 150 pairs"; a dot
  selects a society.
- **Fingerprint** → each pair's drill-down, the five similar societies and "Compare" (which jumps to
  `#compare`), the society's audiences and change page, "← All societies".
- **Audiences** → each behavior's page, previous and next behavior, "← All 15 behaviors".
- **Change** → each society's page, each pair's drill-down, "← All 26 societies in both surveys".
- **Story** → six steps, "Skip to the atlas" in a sticky bar, a list of links at the end.
- **Method** ← every chart's "About this chart".

Every child page has a back link, Back retraces every view change, and a copied link restores the
view: those are real strengths. What is missing is a way in for a reader who has a question rather
than a module in mind ("Is it rude to eat on a bus in Japan?").

### The reader tasks

On a phone (375 × 812, touch), as a first-time visitor, starting at the page named.

| # | Task | Steps taken | Hesitation or misreading | Result |
| --- | --- | --- | --- | --- |
| 1 | From `/`, in 5 s: what is this, what can I do? | Read the first screen. | The quiz's answers are below the fold; the biggest button is "Skip to the atlas". | Yes: "how appropriate everyday behaviors are in 90 societies; a quiz or the atlas". |
| 2 | Answer the quiz; say what the result means. | Three answers, three reveals, the summary; again with Japan chosen. | The chart sits a screen below the button; "+1.5" unexplained; "below it in 83" had to be inverted; the shapes and colours have no key; the summary does not mention Japan. | Partly: "on eating in a restaurant, respondents in nearly every society were more approving on average than me (83 of 87)". With Japan: "8% of respondents in Japan answered as I did; their average is extremely appropriate", clear. |
| 3 | How appropriate do respondents in Japan find eating on a bus, and is that unusual? | Skip to the atlas → Society: Japan → scroll ≈ ten screens to "Eat · Bus" → tap (bottom sheet) → "Open: Eating on a bus" → scroll to the end of the page. | The row shows −0.1, the global value; the drill-down's first sentence is the global average under a box reading "Japan"; the rank is the last thing on the page and reads backwards ("79th most accepting of 88"). | Yes, slowly: "somewhat inappropriate (−0.6), stricter than the average of all societies; about the 10th strictest of 88". The bottom sheet alone answered the first half well. |
| 4 | Cold at `/explore/sing/funeral/`: what does this chart say? | Read the first screen, scroll. | The first chart is the strip; the beeswarm is on the third screen under "Estimate: Shrunken / Raw" and "Every society's shrunken estimate"; "0.89" means nothing. | Partly: "societies disagree about this a lot, from −2.3 among respondents in Saudi Arabia to +1.2 among respondents in the Caribbean", found on screen 2. |
| 5 | Which society's answers are most like the United States', and how do they differ? | Menu → Societies → picker "United States" (the list entry is ≈ 6.6 screens down) → the lede names Canada → "Compare" → jumps to the comparison. | The facts panel sits before the chart; "similarity 0.84 … correlation of two fingerprints". | Yes: "Canada; they differ by 0.2 on average, most about reading the newspaper in a job interview (−1.9 against −1.4)". |
| 6 | Does it matter who is watching when someone uses a mobile phone? | Menu → Audiences → scroll to the fourth screen → "Use a mobile phone" → read the lede. | The panel's "2.6 lower with management" had no scale to judge it by; the phone's chart axis is numbers. | Yes: "very appropriate alone, somewhat inappropriate in front of management or professors". |
| 7 | Did respondents in Japan judge music on headphones in a library differently in 2023–2024 than in 2000–2003, and how sure can I be? | Menu → Change → picker "Japan" (moves to `/change/jpn/`) → the pair is the first row, ≈ 1.8 screens down. | "▲ beyond the 95% interval of the difference"; the interval itself only in the table. | Half: "higher in 2023–2024, +1.6 (−0.2 to +1.4)". "How sure" could not be put in words. |
| 8 | Is a score for a society with few respondents trustworthy, and how would I know? | Drill-down → the "Hollow: small sample" legend → tap a hollow dot → "Show uncertainty" → "Raw". | Nothing says what few respondents do to an estimate; "shrunken" needs the method page; tapping a dot replaced the society. | Partly: "hollow dots have 10–29 respondents and wider ranges"; not why the dot sits where it does. |
| 9 | Switch to Centered; explain what changed and whether to use it. | Options → Centered, on `/explore/`. | The matrix looked identical; the summary changed five words; after closing Options nothing showed the scale. | No. |
| 10 | Share the view, then Back to where I started. | Options → Copy link ("Link copied") → Back × 4. | Copy link is inside Options; four Backs for four changes. | Yes: the link restored society, scale and sort; each Back restored the previous state. |

### Where readers get lost or stuck

1. **Finding a pair or a society on a phone** (tasks 3, 5, 6): long lists without a jump.
2. **Their own society is never first** (task 3): the pages are built around the global view and add
   the society at the edges.
3. **State they cannot see** (tasks 9, 10): scale and Copy link live behind "Options"; nothing shows
   the scale once it closes; the module name is not visible on phones.
4. **State that changes under them** (task 8): a tap on a dot replaces the society.
5. **The first click from home leads to the densest view**; the tour, the best on-ramp, is in Menu.

### A proposed structure

Keep the modules and their URLs; change the ways in.

- **Home as a hub.** The quiz first; under it, four entry points phrased as questions with a
  thumbnail each: "Take the 2-minute tour" (story), "Look up a situation" (a search over the 150
  pairs that opens the drill-down), "Look up a society" (the picker, opening the fingerprint), "Does
  it matter who's watching?" (audiences), "Two surveys 20 years apart" (change). "Skip to the atlas"
  stays as a link (FR-1).
- **One search for pairs and societies** in the control bar on phones ("Eating on a bus", "Japan"),
  replacing the society-only picker there; choosing a pair opens it with the society kept.
- **Header order by reader, not by module:** Tour, Situations (the matrix), Societies, Who's
  watching, Then and now, Method; the current one named on phones. (FR-2's names; question 3 and 9.)
- **History:** a new entry for a new page or society, a replaced entry for sorts and toggles
  (decision 31; question 7).

## 7. Visual identity

### What reads as generic now

- The system font at bold weights, left-aligned, with no display treatment: every page title looks
  like a documentation heading.
- A grey control bar, bordered grey buttons and boxed grey panels ("Details", "About these
  respondents", the provenance note): the vocabulary of an admin dashboard.
- One blue for links, primary buttons, selected segments, focus rings and "appropriate" (D-37).
- Charts are clean and correctly labelled but unbranded: black dumbbells, black bars in the story,
  region colours on the beeswarm, estimate colours on the map; each chart was designed on its own.
- No mark: the wordmark is plain bold text, and the palette band that makes the share cards
  recognisable never appears on the site.

Against the editorial sites in the brief: structurally it is closest to Our World in Data (chart,
table and "about" for every view, careful sourcing), with less annotation on the charts. It lacks
what makes the FT's and the New York Times' graphics recognisable, a headline that states the
finding above every chart, a subtitle with the unit and annotations on the marks, and what makes
The Pudding's, a voice and a visual motif. The quiz is the NYT's "how would you answer?" pattern
without its payoff, the one striking line and a result worth sharing.

What is already distinctive and worth building on: the seven-stop orange–blue band, the 15 × 10
grid of coloured squares (it is literally the atlas's map), and the "respondents in…" voice.

### Three directions, within the constraints

**A. "A printed atlas" (lowest cost).** A warm paper surface and ink colours in place of greys; the
seven-stop band as a 4-px rule under the header on every page, as on the cards; a small 3 × 3 tile
mark from the palette beside the wordmark; thin rules instead of boxed panels; chart titles that
state findings, FT-style, with the unit in a subtitle; neutral ink for selected states (D-37).
*Trade-offs:* the diverging palette's midpoint must stay distinct from a warm background in both
themes, so `colors.spec.ts` and the 3:1 and 4.5:1 checks need re-running; visual baselines change.
*Cost:* S–M, tokens and CSS only, no dependency, no performance cost.

**B. "The tile" (most recognisable).** Make the coloured square the site's visual language: a pair
chip (a small square in the pair's colour plus its name) wherever a pair is named, in links, lists,
the quiz and the story's headings; a 15 × 10 thumbnail fingerprint beside every society's name on
the index, the similar list and the compare picker; the tile as favicon and step markers. *Trade-offs:*
busier pages if overused; thumbnails need every society's 150 differences on the index (check
against NFR-1's 300 KB data limit and NFR-3's lazy loading); chips are decorative, so the text stays
the accessible name. *Cost:* M–L.

**C. "Type and annotation."** One self-hosted sans-serif with some character and tabular figures
(variable woff2, Latin subset, two weights, roughly 30–60 KB), larger display titles, and
annotations on the charts (the named extremes, "you are here", the reader's society) in place of
the paragraphs that now explain them. *Trade-offs:* the font is not JS or CSS, so NFR-1's 200 KB is
untouched, but it is a first-load asset that can delay LCP (preload it, `font-display: optional`
or `swap`); `font-src 'self'` already allows it; the share cards render in Liberation Sans in the
Playwright image and would need the same font for consistency (decision 91). *Cost:* M; your
decision under §6.4 (question 1).

A and C combine well; B is the one that would make a screenshot of the site recognisable without
its name.

## 8. What works

Keep these.

- **The wording discipline.** "Respondents in Japan" everywhere, observations not causes, the
  provenance stated, the regions credited as the authors' grouping. No slip was seen on the routes
  reviewed (the module's own name is the one tension, D-32).
- **Response labels beside numbers** ("−0.6 somewhat inappropriate"; "49% chose an appropriate
  answer"): the right instinct, which section 5 proposes to push further.
- **One chart frame for every chart:** title, one-sentence summary, "Show as table", "About this
  chart". Predictable, accessible and honest.
- **Back links on every child page** ("← All 150 pairs", "← All societies", "← All 15 behaviors",
  "← All 26 societies in both surveys") and **URLs that restore a view exactly**, with Back
  retracing it.
- **"Compare" from the similar list** jumps straight to the comparison; compare mode itself (dumbbells,
  largest gaps first, one summary sentence) is the clearest two-society view on the site.
- **The phone list's bottom sheet,** which gives the global value and the chosen society's in one
  place (task 3's best moment).
- **The beeswarm with uncertainty on:** a ranked dot-and-whisker list that a lay reader can read.
- **The audiences' focused slopegraph at 1280,** with response labels on the axis.
- **Plain certainty where it exists:** the change strip's "higher in 26 of 26 societies".
- **Empty and small states in plain words:** "No pair was rated by 10 or more respondents in
  Mongolia, so none can be shown"; "Too few responses: Mongolia, Namibia" listed by name.
- **The quiz with a society:** "8% of respondents in Japan chose very appropriate, as you did" and
  the response distribution with "your answer" marked.
- **The 404 page,** and the home share card's question as a hook.
- **The dark theme,** and no sideways scrolling at 375 px on any of the 20 routes.

## 9. Questions for you

1. **Typeface:** stay with the system font, or add one self-hosted family (direction C), with the
   share cards following it?
2. **The tour's first step:** keep the paper's standard-deviation chart as the opener (decision 83),
   or open with a concrete example and move the model's numbers to the method page (D-2)?
3. **The module's name:** keep "Change since the early 2000s", or rename it "Then and now" so the name
   matches the wording rule (D-32; FR-2, §5.6)?
4. **The sample toggle:** keep "Paper's sample" and "Attention check" in the always-visible bar at
   1280, or put them in Options at every width (FR-4 is still met, and the badge still shows)?
5. **Default orders:** paper order everywhere, or "most telling first" on phones (largest differences
   on a fingerprint, largest drop on the audiences) (D-12; decision 31's defaults)?
6. **Selecting by dot:** should tapping or clicking a society's dot set the reader's society at all,
   or only through an explicit button in its tip (D-14)?
7. **History:** should sorts and toggles replace the history entry rather than add one (D-29;
   decision 31, FR-84)?
8. **Labels:** may "Shrunken / Raw", "Raw scores / Centered" and the sample names change? They are
   in the method page, the tests and the cards (D-8).
9. **The header:** may "Story" come first (as "Tour"), and would you consider Method in the footer
   only? FR-2 requires a header link to every module today.
10. **Share cards:** finding headlines for the 150 cell and 90 society cards (D-38; decision 91)?
11. **How much before launch:** the "before launch" items are each S or M, but together they touch
    most routes and the visual baselines. Which do you want in v1.0?

## 10. What happened to each finding

Added after the review, when its changes were built (23 and 24 October 2026, on `main`, commits
`d991473` to `58a58e9`, nothing pushed), following `docs/design-changes-kickoff.md`: the
maintainer took everything in this review for v1.0 (its section 3), and the choices made on the way
are decisions 111 to 140 in `docs/decisions.md`. The SRS lines they need wait in
`docs/srs-changes.md` under "Proposed, not applied". Every finding was built; one part of one
finding was dropped (D-4's band), and three were built differently from the proposal (D-2, D-3,
D-12), each said below.

| Finding | Outcome | What the site does now | Decision, SRS line | Commits |
| --- | --- | --- | --- | --- |
| D-1 | Done | A pair's page opens with the society's result under its title ("Respondents in Japan: somewhat inappropriate (−0.6), clearly stricter than the global average; 10th strictest of 88"), or "Pick a society to see where it stands"; its place is held on `?society=` links. | 115, 137; FR-25 | `0857253`, `130064b` |
| D-2 | Changed | Step 1 draws the 150 pairs' averages and the 88 societies' averages on one scale from All data. The proposed example (one behavior's situations beside one pair's societies) was not used: the median behavior, flirting, has a pair whose societies spread wider than its situations, which would repeat the problem. The paper's standard deviations moved to `/method/#story`. | 133; FR-64 | `a5b8300` |
| D-3 | Changed | No chip: while the scale is relative, every chart's subtitle has a second line ("Relative to each society's own average · Show as answered"), and the matrix's says the global averages move by 0.01 at most. Words change, the layout does not, and the line is held on `?scale=centered` links. | 119, 137; FR-5 | `639eb2a`, `b26ded7` |
| D-4 | Done, band dropped | "Clearly higher in 2023–2024" ▲, "clearly lower" ▼, "too close to call", and one line per page on what "clearly" means. The faint interval band behind each arrow was not drawn: the arrows' axis holds the two averages, not their difference, so the band needs its own design, and the words already answer "how sure"; the interval stays in each row's details and the table. Left for v1.1. | 112; §6.5 | `89893f6` |
| D-5 | Done | The beeswarm first, its controls under it, then the map and the strip; the lede is the finding. | 113, 115, 116 | `b092f3d`, `130064b` |
| D-6 | Done | Ledes and summaries lead with the response label and the share choosing an appropriate answer; scores in brackets, details, tables and axes; the method page's guide gives the scale. | 113, 118; §6.5 | `b092f3d`, `bf0b31d`, `21c012d` |
| D-7 | Done | Disagreement as a rank in words ("more than about any other pair"); the key reads less to more, without numbers. | 113 | `b092f3d` |
| D-8 | Done | "As answered / Relative to each society's average", "Adjusted for small samples / Unadjusted", "All respondents / The paper's sample / Passed the attention check", "clearly", "Every society's average answer", "pair" defined where first used; URL values and anchors kept. | 111; FR-4, FR-22, FR-31 | `59e70ee`, `e5fb1f0` |
| D-9 | Done | The reveal scrolls its chart into view and says "You said extremely appropriate. In all 87 societies, respondents' average answer was less approving than that."; one colour for the dots; no "shrinkage". | 124 | `8fa50b7` |
| D-10 | Done | One takeaway line, a strip per question with the reader's answer, the chosen society's share, "Take the 2-minute tour" as the main button; nothing shares or encodes an answer. | 124 | `fa85f2b` |
| D-11 | Done | h1 "How would you answer?", one sentence, the first answer at 506 px on a 375 × 812 screen (was 821), "Skip to the atlas or take the 2-minute tour" as links, and the hub under the quiz. | 123; §6.1 | `0322721` |
| D-12 | Changed | "Jump to a behavior" on the matrix's and a fingerprint's phone lists in the paper's order (the other orders already start with the telling rows); fingerprints open on the largest differences and the audiences on the largest drop, at every width; the index has a map (D-31). | 126, 128, 132; FR-17 | `979a785`, `2182c4b`, `beef91e` |
| D-13 | Done | With a society, each phone row's bar is that society's average, with the global average as a tick. | 128; FR-17 | `979a785` |
| D-14 | Done | On touch the first tap on a society's dot pins its tip, whose button selects ("Show respondents in Somaliland"); a second tap or a tap elsewhere closes it; mouse and Enter unchanged. On the beeswarm, the reveal and both maps. | 125; §6.3 | `b5e877b`, `beef91e` |
| D-15 | Done | A small sample's tip: "Only 23 respondents: this estimate is pulled toward the global average, and the true average could be anywhere from −2.8 to −1.8." | 112; FR-22 | `0857253` |
| D-16 | Done | The finding as the lede; the audiences named once above the panels, the first panel's axis; the note one line, the filters and notes under the charts. | 130 | `bf0b31d`, `4f23b91` |
| D-17 | Done | The phone slopegraph's axis ends in response labels. | 130 | `4f23b91` |
| D-18 | Done | The lede one sentence; the provenance note 54 visible words (was 113), the rest under "About the 2000–2003 data"; the facts and scale note under the arrows; the story's step shows five rows. | 114 | `21c012d`, `3cae0d0`, `a5b8300` |
| D-19 | Done | The notice in the lede's place, a picker limited to the 26, "Show all 26 societies". | 114 | `21c012d`, `3cae0d0` |
| D-20 | Done | The fingerprint first, similar societies next, the facts under "About these 829 respondents"; similarity without "correlation". | 129 | `d7b5a80`, `0f1d2ba`, `e5fb1f0` |
| D-21 | Done | "Compare with…" by the title. | 129; §6.1 | `0f1d2ba` |
| D-22 | Done | About 50 words and one chart a step, one "About this chart" per step holding the summary and table, five rows in the change step: 1,104 words over 10.6 phone screens before, 889 over 7.8 now. | 133; NFR-11 | `a5b8300` |
| D-23 | Done | Every module route starts its main chart on the first phone screen (17 routes in `e2e/first-screen.e2e.ts`), and the desktop bar is 95 px tall (was 151). Words before the chart: see below. | 117, 137, 138 | `f047957`, `130064b`, `0f1d2ba`, `4f23b91`, `3cae0d0`, `58e3f55`, `bdf1cfb`, `b26ded7` |
| D-24 | Done | The phone menu button names the module ("Situations"). | 121; FR-2 | `4991ac3` |
| D-25 | Done | Disagreement as a ring in the text ink with a halo, like ▲ ▼ and the FR-16 rings: at least 3.86:1 on every fill. | 135 | `154a3e7` |
| D-26 | Done | Beeswarm dots filled by estimate, shaped by region, dashed for small samples, as on the map and the card. | 116; FR-21 | `154a3e7`, `58a58e9` |
| D-27 | Done | "10th strictest of 88". | 113; FR-25 | `d991473` |
| D-28 | Done | Share by every page's title but the 404 page's: the share sheet, or the link copied. | 131; FR-81 | `c14c40e` |
| D-29 | Done | Sorts and toggles replace the history entry; a page, society or comparison adds one. | 127; FR-84, AT-11 | `2182c4b` |
| D-30 | Done | "How to read the atlas" in five lines under a rule, the contents in five groups. The page grew from 5,132 to 5,772 words with the guide and the paper's model, moved from the story. | 140 | `e2db91b`, `fef798e` |
| D-31 | Done | A map of the 90 societies by region opens the index; each dot links to a fingerprint. Thumbnails were not made (design-changes decision 6). | 132; §6.1 | `beef91e` |
| D-32 | Done | "Then and now: two surveys about 20 years apart"; the header says "Then and now"; paths unchanged. | 114; Summary, §1.2, §5.6, §6.1, §9.3 | `38aa088` |
| D-33 | Done | One row from 1024 px (search, scale, Options with the sample, Copy link); Options below 1024 px; the sample as a list. The bar is 95 px at 1280 and 93 px at 768 (were 151 and 256). | 120; FR-4, §6.2 | `58e3f55` |
| D-34 | Done | "(95% interval narrower than 0.1)"; the global average's is left out of prose. | 112 | `4f11c5a` |
| D-35 | Done | One decimal for every score and difference, on the pages and the cards. | 114, 136 | `213b568`, `58a58e9` |
| D-36 | Done | Mongolia and Namibia: one block with their region's other societies, no Sort, table or comparison. | 129 | `0f1d2ba` |
| D-37 | Done | Selected states and primary buttons in ink; links and focus blue. | 134; §6.4 | `766740d` |
| D-38 | Done | Finding headlines for the 150 pair and 90 society cards, one detail line, the credit in two lines with every element. | 136; §6.4 | `58a58e9` |
| D-39 | Done | More chroma next to 0 in the dark ramp; `colors.spec.ts` keeps the midpoint at least 0.03 from every surface. | 134 | `766740d` |

**The ten changes (section 2)** are all in v1.0, including the parts timed for v1.1: the society's
value in phone rows (1), the wording sweep (2), the tour's new chart (3), the quiz's summary (4),
the renames (6), the default orders and jump (8) and the colour work (10). **Section 5's
rewrites:** the provenance note (113 → 54 visible words), the change lede (66 → 39), step 1 (60 →
about 50 under its heading), the audiences' note (63 words → one line of 11) and a behavior's lede
(55 → 41), as rewritten there or close to it; the cell lede and the quiz's sentence as proposed.
**Section 6's structure** is built as proposed: the hub, one search, the header order and the
history rule. **Section 9's questions**, as the maintainer answered them: the system font
(direction A); a concrete picture for step 1; "Then and now"; the sample in Options at every
width; telling-first orders at every width; on touch only the tip's button selects, while a click
and Enter still do; sorts and toggles replace the entry; the labels change, their URL values stay;
"Tour" first and Method still in the header; finding headlines on the cards; all of it in v1.0.

### Before and after

The same method as section 5, run by the same script on the build before the changes (it
reproduces section 5's figures within a few words) and on the final build. At 375 px unless a
width is given; "–" where a page has no chart.

| Route | Chart top, px | Words before the chart, 375 / 1280 | First phone screen, words | Phone screens | Grade | Chart on the first screen, 375 / 1280 |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | – (first answer 821 → 506) | – | 102 → 71 | 1.9 → 2.8 | 8.7 → 7.1 | – |
| `/story/` | 1,084 → 752 | 172 / 99 → 115 / 70 | 133 → 119 | 9.1 → 7.8 | 10.4 → 10.3 | no / yes → yes / yes |
| `/explore/` | 988 → 676 | 135 / 179 → 72 / 119 | 109 → 80 | 12.7 → 12.7 | 5.4 → 5.2 | no / yes → yes / yes |
| `/explore/?society=jpn` | 1,120 → 800 | 158 / 202 → 96 / 142 | 109 → 100 | 12.9 → 12.9 | 5.5 → 5.0 | no / yes → yes / yes |
| `/explore/eat/bus/?society=jpn` | 631 → 690 | 76 / 96 → 99 / 152 | 93 → 103 | 3.8 → 4.0 | 10.8 → 10.6 | the strip → the beeswarm |
| `/explore/sing/funeral/` | 694 → 614 | 76 / 96 → 91 / 147 | 87 → 94 | 3.7 → 3.9 | 11.5 → 10.2 | the strip → the beeswarm |
| `/societies/` | none → 556 | – → 88 / 111 | 92 → 121 | 7.2 → 7.7 | 10.5 → 10.0 | no / no → yes / yes |
| `/societies/usa/` | 2,011 → 735 | 288 / 343 → 97 / 121 | 116 → 105 | 13.5 → 4.6 | 7.0 → 9.1 | no / no → yes / yes |
| `/societies/usa/?compare=jpn` | 2,011 → 735 | 288 / 343 → 97 / 121 | 116 → 105 | 15.7 → 6.8 | 7.1 → 8.2 | no / no → yes / yes |
| `/societies/mng/` | 1,293 → – | 186 / 207 → – | 137 → 116 | 2.6 → 1.3 | 9.0 → 14.3 | an empty frame → one block |
| `/audiences/` | 1,224 → 647 | 195 / 215 → 85 / 107 | 89 → 102 | 4.4 → 4.2 | 10.2 → 9.8 | no / no → yes / yes |
| `/audiences/?society=jpn` | 1,245 → 648 | 204 / 224 → 86 / 108 | 91 → 103 | 4.4 → 4.3 | 10.3 → 9.9 | no / no → yes / yes |
| `/audiences/usemphone/` | 1,147 → 626 | 162 / 210 → 85 / 108 | 108 → 88 | 3.0 → 2.8 | 11.1 → 9.8 | no / no → yes / yes |
| `/audiences/usemphone/?society=jpn` | 1,217 → 626 | 175 / 223 → 84 / 107 | 102 → 87 | 3.2 → 2.9 | 11.6 → 10.2 | no / no → yes / yes |
| `/audiences/usemphone/?split=gender` | 1,241 → 674 | 189 / 237 → 91 / 114 | 118 → 94 | 3.2 → 3.0 | 11.0 → 9.8 | no / no → yes / yes |
| `/change/` | 1,548 → 758 | 260 / 308 → 137 / 215 | 137 → 202 | 8.9 → 9.1 | 10.3 → 9.3 | no / no → yes / yes |
| `/change/jpn/` | 1,594 → 769 | 245 / 293 → 136 / 214 | 126 → 192 | 5.3 → 4.8 | 11.4 → 10.0 | no / no → yes / yes |
| `/change/?society=chl` | 1,664 → 800 | 280 / 328 → 125 / 203 | 157 → 178 | 9.1 → 9.2 | 10.3 → 9.1 | no / no → yes / yes |
| `/method/` | – | – | 90 → 161 | 40.0 → 44.6 | 11.2 → 11.5 | – |

- **The brief's targets are met:** every module route starts its main chart on the first phone
  screen, and no lede runs past 45 words (`e2e/first-screen.e2e.ts`, in Chromium, WebKit, the
  iPhone and the Pixel). Query links shift the layout by at most 0.006 (they shifted 0.116 to 0.186
  before; `e2e/layout-shift.e2e.ts`).
- **Not met, and why:** words before the first chart fell from 76–288 to 72–137, still above the
  60 or so that would let a reader see the picture before reading. What remains is the society box,
  each chart's title and subtitle (which now say the finding, and count) and, on Then and now, the
  shortened provenance note, which a rule keeps visible. Then and now's first screen has more words
  than before because its arrows' labels are now on it. Module prose reads at grade 9 to 10.6 (was
  10 to 11.6, the heuristic approximate), above the lay target of 8: the atlas's own terms
  ("respondents", "appropriate", "situation") are long words. The Mongolia page's 14.3 is one
  sentence listing the region's other societies by name. With a society chosen, a pair's first
  chart starts 59 px lower than before, under the society's result (D-1); but it is now the
  beeswarm, which used to start on the third screen.
- **Performance:** the largest first load is 109.4 KB of JS and CSS (the story; 99.5 KB before) of
  NFR-1's 200, and 144.7 KB of data (a pair's page, unchanged) of 300; the largest `__data.json` is
  1,990 bytes (`/societies/srb/`) of 2,048. Lighthouse CI, 12 routes × 3 on this machine, mobile
  profile, on the final build: LCP medians 1.67 to 2.12 s (the story 2.12, `/societies/chl/` 2.10;
  1.66 to 1.97 s after phase 3 and up to 2.30 s after phase 6, with no run on this machine before
  the changes), CLS ≤ 0.006, TBT ≤ 1 ms, accessibility 1.00, every assertion met. The launch's
  deployed medians were 0.89 to 1.33 s.

### The reader tasks, again

The same ten tasks (section 6), scripted on the final build at 375 × 812 with touch, the beacon
stubbed, each step taken as a first-time reader would.

| # | Steps now | Result before | Result now |
| --- | --- | --- | --- |
| 1 | Read the first screen: "How would you answer?", one sentence, "Skip to the atlas or take the 2-minute tour", the first answer at 506 px. | Yes, the answers below the fold | Yes, an answer on the first screen and the tour offered |
| 2 | Three answers and reveals (the chart's top 137 px down the screen after the button), the summary; again with Japan. | Partly | Yes: "On 2 of 3 questions, most societies' average answers were more approving than yours"; with Japan, "90% of respondents in Japan chose extremely appropriate too" |
| 3 | Home → "Look up a situation" → "eat bus" → Eating on a bus → Society: Japan. The answer sits under the title, 0.3 screens down. | Yes, slowly (ten screens down a list, then the end of the page) | Yes, on the first screen: "Respondents in Japan: somewhat inappropriate (−0.6), clearly stricter than the global average; 10th strictest of 88" |
| 4 | Read the first screen: the lede, then the beeswarm titled "Societies' averages run from extremely inappropriate to very appropriate", its drawing at 614 px. | Partly, on screen 2 | Yes, on the first screen |
| 5 | Menu → Societies → the search box → United States; the lede names Canada; "Compare with…" by the title → Canada. | Yes | Yes, without scrolling to the comparison: "The largest gap: reading the newspaper in a job interview", 0.2 apart on average |
| 6 | Menu → Who's watching (panels by the largest drop; "Use a mobile phone" at 1.1 screens) → its page. | Yes (the fourth screen) | Yes: "Use a mobile phone: very appropriate alone, somewhat inappropriate in front of management or professors" |
| 7 | Menu → Then and now → Japan; the pair's row at 1.2 screens, the line on "clearly" with the key. | Half: how sure could not be said | Yes: "clearly higher in 2023–2024" (+1.6), clearly meaning bigger than the surveys' margin of error |
| 8 | The key's "Dashed: small sample (10–29)"; tap a dashed dot. | Partly; the tap replaced the society | Yes: "Only 23 respondents: this estimate is pulled toward the global average, and the true average could be anywhere from −2.8 to −1.8"; the society stays |
| 9 | Options → "Relative to each society's average" → close Options. | No | Yes: the note under the title says so, that the matrix barely changes and that centering matters on a fingerprint, with "Show as answered" |
| 10 | From the method page to the matrix with Chile; the relative scale and a sort; Share by the title (copied, as there is no share sheet); Back. | Yes, four Backs | Yes, one Back to the method page; the link holds society, scale and sort |

Left for v1.1 from this review: D-4's interval band, and any further cut in the words before the
first chart (`docs/v1.1.md`).
