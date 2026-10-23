# Method notes (draft for the method page, FR-70)

Plain-language drafts for each estimator, edited into the method page (`/method`) from M2 on.
Each section has the text for readers, then a short technical note for reviewers. Where a
section says it is on the method page, the page's wording is the current one and the draft here
follows it. Wording follows SRS §6.5:
"respondents in Chile", not "Chileans", and no causes (FR-73).

## Where the numbers come from

**For readers.** Everything here comes from the Global Study of Everyday Norms: 25,422 people in
90 societies rated how appropriate 15 everyday behaviors are in 10 situations, between July 2023
and May 2024. Most respondents were recruited through universities and online panels, so they
are not a random sample of each country; more than half are students. The atlas shows
summaries of their answers, never an individual answer, and never a summary of fewer than 10
people.

You can switch between three groups of respondents:
- **All data** (the default): everyone who rated at least one behavior.
- **Paper's sample**: the respondents behind the main figures of the GSN paper (71 societies);
  it leaves out people who took the survey after February 2024, and Kuwait.
- **Attention check**: respondents who passed a check that they were reading carefully, in the
  80 societies with enough of them.

**Technical.** Samples are rebuilt from the deposited flags and must reproduce 25,422 / 90,
18,656 / 71 and 15,599 / 80 exactly, or the build stops (DR-3). The paper's cutoff is
`StartDate` ≤ 2024-02-29 23:00 UTC (1 March, Stockholm time). The paper's mixed models use a
further complete-case subset (17,288 respondents); the atlas uses it only as a cross-check.

## The scale

**For readers.** Respondents chose one of six answers, from "extremely inappropriate" to
"extremely appropriate". The atlas scores them from −2.5 to +2.5, as the paper does. There is no
middle answer: 0 falls between "somewhat inappropriate" and "somewhat appropriate". Alongside
each score we show the share of respondents who chose one of the three "appropriate" answers.

**Technical.** Ratings 1–6 are recoded as rating − 3.5 (DR-2). The share counts ratings of 4, 5
or 6 (DR-11).

## A society's score for a behavior in a situation

**For readers.** For each society and each of the 150 behavior–situation pairs, the score is the
average answer of that society's respondents who rated it. Each respondent rated about a fifth
of the pairs, so a typical score rests on about 50 people.

**Technical.** n, mean, SD (n − 1 denominator) and the count of each response (DR-4).

## How sure are we? Intervals

**For readers.** Every score comes with a range: the 95% interval. It shows how much the score
could move if the same society had been surveyed again with different respondents. We find it
by re-drawing each society's respondents at random, with replacement, 2,000 times and
recomputing everything each time; the interval holds the middle 95% of the results. Narrow
ranges mean many respondents who largely agree.

**Technical.** Percentile bootstrap, 2,000 replicates, resampling respondents within each
society so that each respondent's ratings move together (DR-5). Each society's draws come from
its own seeded stream, so results are reproducible and do not depend on which other societies
are in a sample. Intervals treat the set of societies as fixed: they reflect who was surveyed
within each society, not which societies took part. When every respondent gave the same answer,
the raw interval has zero width (a handful of cells); the shrunken interval below does not.

## Small samples

**For readers.** Where fewer than 10 respondents in a society rated a pair, we do not show a
score: it reads "too few responses". Scores from 10 to 29 respondents are flagged as small
samples. Some societies did not ask some questions: the surveys in Kuwait and Saudi Arabia left
out kissing, and Kuwait's also left out flirting. Those pairs read "not asked".

**Technical.** DR-9; status codes in `data/derived/README.md`. A pair counts as not asked when
the society has no rating of that behavior in any situation; the build checks that this gives
exactly Kuwait (kiss, flirt) and Saudi Arabia (kiss).

## Shrinkage (the default estimate)

**For readers.** Scores from small groups of respondents bounce around more. To keep a few
unusual answers from making a society look extreme, the default view pulls each society's
score part of the way toward the average of all societies. Scores based on many respondents
barely move; scores based on few move more. You can switch to the raw scores at any time.

**Technical.** Empirical Bayes (DR-6): weight w = τ² / (τ² + SE²) and shrunken = w × mean
+ (1 − w) × global mean, with τ² the cell's between-society variance (below). SE² is the cell's
within-society variance pooled over all societies, divided by the society's n (decision 2): a
society–cell's own SD is undefined for one rating, zero when everyone agrees and noisy for
small n. The interval is ± 1.96 √(w × SE² + (1 − w)² × var(global mean)), with the variance of
the global mean from the bootstrap (decision 3). Taking percentiles of the shrunken value
across replicates instead would measure only w × SE and would be too narrow for exactly the
small societies that shrink most. The interval ignores the uncertainty in τ itself.

## The global picture

**For readers.** The matrix shows the average score of all societies for each pair, with every
society counting equally, however many respondents it had. So the 829 respondents in the
United States count as much as the 71 in Chile.

**Technical.** Unweighted mean of society means, as in the paper (DR-7), over every society with
at least one rating, including those too small to show on their own (decision 1). Its interval
is the percentile interval of the replicate global means. The global share "appropriate" is the
unweighted mean of society shares (decision 5).

## Disagreement

**For readers.** For each pair, disagreement measures how far apart societies are. Some of the
spread between society scores is just the noise of surveying a few dozen people per society, so
we subtract that noise: what remains is our estimate of how much societies really differ. It is
in the same units as the scores: a disagreement of 0.5 means societies typically sit about half
a point above or below the global average.

**Technical.** τ (DR-8): τ² = max(0, variance of society means − mean SE²), the method of
moments with the pooled SE above. The raw SD of society means is published too. The interval
needs care: resampling adds its own noise on top of the noise already in the data, so the
replicates' spread centres on the raw variance, not on τ². Each replicate is therefore corrected
twice, τ*² = var(m*) − mean(SE*²) − mean(SE²), floored at 0, and the interval is the
percentiles of τ* (decision 15). Without the second correction the interval missed the estimate
itself in 45 of 150 cells under All data.

## Centered scores (scale toggle)

**For readers.** Some groups of respondents use the top of the scale more than others, in every
situation. The centered view removes each society's overall tendency, so you see where it is
stricter or looser than usual for itself. The GSN paper makes no such adjustment; it is our
addition.

**Technical.** DR-10: a society's offset is its mean deviation from the global cell means over
the cells it has (decision 4); centered = estimate − offset. For a society with all 150 cells
this equals subtracting its own mean and adding back the overall mean. Centered τ uses the same
noise correction; it ignores the small extra noise in the offset.

## Society fingerprints

On the method page as `#fingerprint` since M3 (decisions 46 and 47).

**For readers.** A society's fingerprint shows, for each of the 150 pairs, how far its
respondents' score lies above or below the average of all societies. It uses the default
estimate, which pulls scores from few respondents toward the average, so a handful of unusual
answers cannot make a society look extreme. Blue means the society's respondents judged the pair
more appropriate than average (looser), orange less appropriate (stricter). The colours run out
at 1.5 points either way; the few larger differences take the end colours, and the details give
their exact value. A pair rated by fewer than 10 respondents, or left out of that society's
survey, shows a dash and no colour.

**Technical.** FR-30: shrunken estimate − global cell mean on the scale shown; centered, the
estimate minus the society's shrunken offset, minus the centered global mean (DR-10). This is
the fingerprint DR-14 correlates (decision 16). Under All data 1.0% of differences lie beyond
±1.5 on the raw scale and 0.3% on the centered one. The difference has no interval of its own in
the data: the details give the society's interval and the global mean's.

## Comparing two societies

On the method page as `#compare` since M3 (decision 49).

**For readers.** On a society's page you can compare it with any other society, pair by pair.
Each row shows both societies' estimates (shrunken, on the scale you chose) with the global mean
as a tick, and the gap between them; the largest gaps come first. Pairs that either society
cannot show are listed apart. Each estimate has its own uncertainty, so a small gap may be noise:
the table gives each estimate's 95% interval.

**Technical.** FR-33: the gap is the difference of the two shrunken estimates, in hundredths,
sorted by its size with ties in paper order. No interval is computed for the gap, so the
comparison shows estimates side by side rather than testing their difference.

## Notably stricter or looser

On the method page as `#notable` (the matrix) and in `#fingerprint` since M3.

**For readers.** On a society's fingerprint, a pair is marked notably stricter or looser when we
are 95% sure the society's score is below or above the global average. A pair can have a clear
colour and no mark when few respondents rated it.

**Technical.** FR-31: the percentile interval of (society mean − global mean) across replicates
excludes 0. The global mean includes the society, and both move together in each replicate.
Under the centered scale the same test runs on centered values: each replicate recomputes the
offsets, and the interval of (centered society mean − centered global mean) must exclude 0
(decision 24). A society that rates everything higher is then notable only where it departs
from its own tendency.

## Similar societies

On the method page as `#similar` since M3 (decision 48).

**For readers.** Two societies are similar when they depart from the global average in the same
places: stricter about the same things and looser about the same things. The score is the
correlation between their two fingerprints, from −1 to 1: 1 would mean exactly the same pattern,
0 no shared pattern. It measures how alike the answers are, not how related the cultures are. We
compare two societies only when both have at least 120 of the 150 pairs with 10 or more
respondents, so a few societies have no similar societies listed. Centering shifts all of a
society's scores by the same amount, so the scale toggle does not change similarity.

**Technical.** DR-14 as amended by decision 16: the Pearson correlation of fingerprints
(shrunken estimate − global cell mean) over cells both can publish, with at least 120 shared
cells; top five per society, ties to the lower code. Correlating the estimates themselves would
rank on noise, because every pair of societies shares the same strong situation pattern; and
the DR-10 centering, a constant per society, would not change a correlation. Mongolia, Namibia
and Ethiopia have too few publishable cells under All data.

## Who's watching? Audiences and actor gender

On the method page as `#audiences` since M4 (decisions 57 to 66), with the credit for the 2026
*American Sociological Review* analysis of these audience effects (FR-43).

**For readers.** A second part of the survey asked about the same 15 behaviors without a
situation, but with an audience: when alone, in front of colleagues or classmates, or in front of
management or professors. It also asked how appropriate each behavior is when done by a woman and
when done by a man. That is about who does it, not who watches, so the charts draw it apart from
the audiences. They show how respondents judged each behavior in front of each audience, not why,
and not how anyone feels when watched.

Each value is the average answer of a society's respondents, as given, with its 95% interval;
"all societies" is the average of the society averages. The audience effect is the score when
alone minus the score in front of management or professors, the two ends of the audiences. It
keeps its sign, so a behavior judged more appropriate in front of management shows as higher, not
as a smaller drop. Talking is judged most appropriate in front of colleagues or classmates, so its
range across the three audiences is a little larger than this difference. A difference has no
interval of its own: both scores come from the same respondents, so their intervals cannot simply
be combined, and a small difference in one society may be noise.

These charts always show raw scores. Centering subtracts each society's average over the 150
situations, which these questions are not part of, and the audience effect compares a society
with itself, so the way a society's respondents use the scale mostly cancels out.

Women and men respondents are shown for all societies together only: within one society, a
behavior's answers from women or from men in front of one audience rest on about 11 respondents
in the median society. Respondents who answered "other" or preferred not to say are left out of
this split, though they count everywhere else.

**Technical.** DR-12. Respondents and their samples come from the main file (decision 6), so
21 respondents found only in the contexts file are in no sample. Global values are unweighted
means of society means. The respondent-gender split shows women and men; "Other / prefer not to
answer" is a single mixed category and is left out of the split, though it counts everywhere
else (decision 18). Intervals resample respondents within societies; the gender splits draw the
same respondents as the whole sample. The effect (decision 58) needs both ends with 10 or more
respondents: under All data, 1,306 society–behaviors, 8 of them reversed, from −1.64 to +4.16;
for all societies it runs from 0.77 (talking) to 2.97 (music on headphones). It has no bootstrap
interval (decision 60); one would need a new resampled quantity in the pipeline, with its own
seed key.

## Change since the early 2000s

On the method page as `#change` since M5 (decisions 67 to 77); the change pages link to it from
their provenance note and their charts' "About this chart".

**For readers.** For 26 societies, a survey from 2000–2003 by Gelfand and colleagues asked about
12 of the same behaviors in the same 10 situations; resting, shouting in anger and using a mobile
phone were not asked then. The change pages compare the two surveys' average answers for each
society and pair. The surveys asked different people, recruited in different ways, with
different questionnaires, about 20 years apart. A difference is therefore a difference between
two surveys, not a change in anyone's views, and it does not say why the answers differ. Only
summaries of the older survey are shown, each society's average for each pair, never an
individual answer: the GSN authors note that its individual answers are not public.

Both surveys are shown as raw averages, whatever the scale toggle says, because the older survey
has no centered scores. A difference counts as higher or lower in 2023–2024 only when its 95%
interval excludes 0; an interval that ends exactly at 0 counts as within. Without a society, the
pages average the societies in both surveys (26, or 22 in the Paper's sample), which are not the
90-society averages shown elsewhere.

**Technical.** DR-13 and C-6. Per society and cell: n, mean and SD for each wave and the
difference GSN − 2000–2003, with a percentile interval of the replicate differences. The GSN
side uses the main bootstrap; the older side resamples its respondent keys (country +
ResponseId) within each society; five keys appear to hold two respondents' ratings and are kept
as one resampling unit (decision 13), so an older-survey n counts ratings. Behavior summaries
follow the paper's Table 1: a society's change for a behavior is its mean difference over that
behavior's situations; Israel has no laugh × party cell in the older survey. The build
reproduces Table 1 within ±0.02 (NFR-51). The site reads the bounds as stored (decision 68):
under All data 980 society–pairs are higher, 747 lower and 1,392 within. Small samples (10 to 29
GSN respondents) occur only under Attention check, in 177 society–pairs (decision 69).

## The quiz

On the method page as `#quiz` since M6 (decisions 78 to 80 and 86).

**For readers.** On the home page you can rate three behaviors in situations on the six answers
the survey offered. The question wording is the atlas's own; the six answers are the survey's.
Your answer is placed among each society's average answer in the sample you chose. An average is
the middle of many people's answers, while yours is a single answer on one of the six points, so
"above the average answer of respondents in 4 societies" says where your answer falls, not how you
compare with anyone. If you choose a society, you also see how many of its respondents gave each
answer. Societies with fewer than 10 respondents for a question are left out and counted apart.
Your answers stay in the browser tab and are never sent anywhere.

**Technical.** FR-60 to FR-63. Response k sits at k − 3.5. It is compared in hundredths with the
societies' shrunken estimates on the raw scale (decision 32), whatever the scale toggle; a
society's responses come from `distributions-<s>.json` (DR-4), whose counts add up to its n. The
answers are kept in one sessionStorage key, `etiquette-atlas:quiz`, so a reload keeps them and a
new tab starts empty (AT-3).

## The guided story

On `/story/` since M6 (decisions 81 to 85); its charts link to the method sections they draw on.

**For readers.** The tour opens with the paper's main finding: norms vary "far more across
situations than across societies". In the paper's model the standard deviation between situated
behaviors is 0.31 on the −2.5 to +2.5 scale, between societies 0.19, and for everything else,
individual respondents and noise, 1.11. These are the paper's estimates; the atlas does not
compute them. The next steps show the pair societies agree on most, the pair they disagree on
most, the largest audience effect and the largest difference between the 2000–2003 and
2023–2024 surveys, all from All data.

**Technical.** SRS §4.8 for the paper's numbers. The steps are chosen at build time: the cells
with the least and most disagreement τ on the raw scale (FR-16), the behavior with the largest
drop from alone to management or professors (decision 58), and the largest difference averaged
over the societies in both surveys (decision 71). Without the change module the story has five
steps (R-6).

## Society facts

On the method page as `#facts` since M3 (decision 50).

**For readers.** Each society's page shows how many people responded in the chosen sample, the
share flagged as students, the languages people took the survey in, and the months of fieldwork.
Student status was recorded by the collection sites rather than asked in the questionnaire, and
some sites recorded none, so we show the share with no status as well. Fieldwork months are
those in which at least 10 respondents started. The collection sites themselves are never shown,
because they could help identify respondents. Regions are the GSN authors' four-way grouping.

**Technical.** DR-15. Student shares are as stored in the GSN deposit (decision 11); the
companion tightness project recodes the Philippines and Bolivia, which the atlas does not.
Languages are Qualtrics interface codes merged by language (EN and EN-GB are both English) and
listed when at least 10 respondents used them (decision 10); the names of the codes BSC and M-CR
are inferred. The fieldwork period runs from the first to the last month in which at least 10
respondents started (decision 17). Collection sites are never shown (SRS §4.4).

## Reproducibility

**Technical.** The pipeline checks the OSF files' MD5s (DR-1), uses a fixed seed and pinned
dependencies, and writes sorted, rounded JSON, so rebuilding gives byte-identical files
(NFR-50). Bootstrap sums are sums of whole numbers, exact whatever the hardware. The manifest
lists the OSF files, the pipeline version and the build date (FR-72).
