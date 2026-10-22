<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import { attribution } from '#lib/attribution.ts';
</script>

<!-- FR-7 in M2: a draft method page with anchored sections that each "About this chart" link
     opens; FR-70 completes it in M7 (decision 30). Text drafted in docs/method-notes.md. -->
<Seo
	title="Method"
	description="How The Etiquette Atlas turns the Global Study of Everyday Norms into scores, intervals and disagreement, in plain language."
/>

<article class="page">
	<h1>Method</h1>
	<p class="draft">
		Draft: this page is being written. It will add per-society tables, file versions and more detail
		before the atlas is announced.
	</p>
	<nav aria-label="On this page">
		<ul>
			<li><a href="#data">Where the numbers come from</a></li>
			<li><a href="#samples">Samples</a></li>
			<li><a href="#scale">The scale</a></li>
			<li><a href="#scores">A society's score</a></li>
			<li><a href="#intervals">Intervals</a></li>
			<li><a href="#small-samples">Small samples</a></li>
			<li><a href="#shrinkage">Shrinkage</a></li>
			<li><a href="#global">The global picture</a></li>
			<li><a href="#disagreement">Disagreement</a></li>
			<li><a href="#centered">Centered scores</a></li>
			<li><a href="#notable">Stricter or looser</a></li>
			<li><a href="#fingerprint">Society fingerprints</a></li>
			<li><a href="#compare">Comparing two societies</a></li>
			<li><a href="#similar">Similar societies</a></li>
			<li><a href="#facts">Society facts</a></li>
			<li><a href="#rank">Ranks</a></li>
			<li><a href="#map">The map</a></li>
			<li><a href="#privacy">Privacy</a></li>
		</ul>
	</nav>

	<section id="data">
		<h2>Where the numbers come from</h2>
		<p>
			Everything here comes from the
			<a href={attribution.dataUrl} rel="external">Global Study of Everyday Norms</a>: 25,422 people
			in 90 societies rated how appropriate 15 everyday behaviors are in 10 situations, between July
			2023 and May 2024. Most respondents were recruited through universities and online panels, so
			they are not a random sample of each country, and more than half are students. That is why the
			atlas speaks of "respondents in Chile" rather than "Chileans". The atlas shows summaries of
			their answers, never an individual answer, and never a summary of fewer than 10 people.
		</p>
		<p>
			The atlas describes how answers differ, not why. A difference between two societies can also
			reflect who was surveyed in each, translation, or how people use a rating scale.
		</p>
	</section>

	<section id="samples">
		<h2>Samples</h2>
		<p>You can switch between three groups of respondents:</p>
		<ul>
			<li><strong>All data</strong> (the default): everyone who rated at least one behavior.</li>
			<li>
				<strong>Paper's sample</strong>: the respondents behind the main figures of the GSN paper,
				in 71 societies. It leaves out people who took the survey after February 2024, and Kuwait.
			</li>
			<li>
				<strong>Attention check</strong>: respondents who passed a check that they were reading
				carefully, in the 80 societies with enough of them.
			</li>
		</ul>
		<p>Societies outside the chosen sample read "not in this sample".</p>
	</section>

	<section id="scale">
		<h2>The scale</h2>
		<p>
			Respondents chose one of six answers, from "extremely inappropriate" to "extremely
			appropriate". The atlas scores them from −2.5 to +2.5, as the paper does. There is no middle
			answer: 0 falls between "somewhat inappropriate" and "somewhat appropriate". Alongside each
			score we show the share of respondents who chose one of the three "appropriate" answers.
		</p>
	</section>

	<section id="scores">
		<h2>A society's score</h2>
		<p>
			For each society and each of the 150 behavior–situation pairs, the score is the average answer
			of that society's respondents who rated it. Each respondent rated about a fifth of the pairs,
			so a typical score rests on about 50 people.
		</p>
	</section>

	<section id="intervals">
		<h2>How sure are we? Intervals</h2>
		<p>
			Every score comes with a range: the 95% interval. It shows how much the score could move if
			the same society had been surveyed again with different respondents. We find it by re-drawing
			each society's respondents at random, with replacement, 2,000 times and recomputing everything
			each time; the interval holds the middle 95% of the results. Narrow ranges mean many
			respondents who largely agree.
		</p>
	</section>

	<section id="small-samples">
		<h2>Small samples</h2>
		<p>
			Where fewer than 10 respondents in a society rated a pair, we do not show a score: it reads
			"too few responses". Scores from 10 to 29 respondents are flagged as small samples and drawn
			as hollow marks. Some societies did not ask some questions: the surveys in Kuwait and Saudi
			Arabia left out kissing, and Kuwait's also left out flirting. Those pairs read "not asked".
		</p>
	</section>

	<section id="shrinkage">
		<h2>Shrinkage (the default estimate)</h2>
		<p>
			Scores from small groups of respondents bounce around more. To keep a few unusual answers from
			making a society look extreme, the default view pulls each society's score part of the way
			toward the average of all societies. Scores based on many respondents barely move; scores
			based on few move more. You can switch to the raw scores at any time.
		</p>
	</section>

	<section id="global">
		<h2>The global picture</h2>
		<p>
			The matrix shows the average score of all societies for each pair, with every society counting
			equally, however many respondents it had. So the 829 respondents in the United States count as
			much as the 71 in Chile.
		</p>
	</section>

	<section id="disagreement">
		<h2>Disagreement</h2>
		<p>
			For each pair, disagreement measures how far apart societies are. Some of the spread between
			society scores is just the noise of surveying a few dozen people per society, so we subtract
			that noise: what remains is our estimate of how much societies really differ. It is in the
			same units as the scores: a disagreement of 0.5 means societies typically sit about half a
			point above or below the global average. On a pair's page, the band around the global average
			spans one disagreement either side.
		</p>
	</section>

	<section id="centered">
		<h2>Centered scores</h2>
		<p>
			Some groups of respondents use the top of the scale more than others, in every situation. The
			centered view removes each society's overall tendency, so you see where it is stricter or
			looser than usual for itself. The GSN paper makes no such adjustment; it is our addition.
		</p>
	</section>

	<section id="notable">
		<h2>Stricter or looser</h2>
		<p>
			With a society selected, a pair is marked stricter or looser when we are 95% sure the
			society's score is below or above the global average. On the centered scale the same test uses
			centered scores, so a society that rates everything higher is marked only where it departs
			from its own tendency.
		</p>
	</section>

	<section id="fingerprint">
		<h2>Society fingerprints</h2>
		<p>
			A society's fingerprint shows, for each of the 150 pairs, how far its respondents' score lies
			above or below the average of all societies. It uses the default estimate, which pulls scores
			from few respondents toward the average (see Shrinkage), so a handful of unusual answers
			cannot make a society look extreme. Blue means the society's respondents judged the pair more
			appropriate than average (looser), orange less appropriate (stricter). The colours run out at
			1.5 points either way; the few larger differences take the end colours, and the details give
			their exact value.
		</p>
		<p>
			A ▲ or ▼ marks a pair where we are 95% sure the society's score is above or below the global
			average. A pair can have a clear colour and no mark when few respondents rated it. A pair
			rated by fewer than 10 respondents, or left out of that society's survey, shows a dash and no
			colour. On the centered scale, both the colours and the marks use centered scores (see
			Centered scores).
		</p>
	</section>

	<section id="compare">
		<h2>Comparing two societies</h2>
		<p>
			On a society's page you can compare it with any other society, pair by pair. Each row shows
			both societies' estimates (shrunken, on the scale you chose) with the global mean as a tick,
			and the gap between them; the largest gaps come first. Pairs that either society cannot show
			are listed apart. Each estimate has its own uncertainty, so a small gap may be noise: the
			table gives each estimate's 95% interval.
		</p>
	</section>

	<section id="similar">
		<h2>Similar societies</h2>
		<p>
			Two societies are similar when they depart from the global average in the same places:
			stricter about the same things and looser about the same things. The score is the correlation
			between their two fingerprints, from −1 to 1: 1 would mean exactly the same pattern, 0 no
			shared pattern. It measures how alike the answers are, not how related the cultures are. We
			compare two societies only when both have at least 120 of the 150 pairs with 10 or more
			respondents, so a few societies have no similar societies listed. Centering shifts all of a
			society's scores by the same amount, so the scale toggle does not change similarity.
		</p>
	</section>

	<section id="facts">
		<h2>Society facts</h2>
		<p>
			Each society's page shows how many people responded in the chosen sample, the share flagged as
			students, the languages people took the survey in, and the months of fieldwork. Student status
			was recorded by the collection sites rather than asked in the questionnaire, and some sites
			recorded none, so we show the share with no status as well. Fieldwork months are those in
			which at least 10 respondents started. The collection sites themselves are never shown,
			because they could help identify respondents. Regions are the GSN authors' four-way grouping
			(see The map).
		</p>
	</section>

	<section id="rank">
		<h2>Ranks</h2>
		<p>
			A society's rank counts the societies with a higher score for the pair, among those shown for
			the chosen sample, estimate and scale; societies with equal scores share a rank. Ranks move
			with the uncertainty of the scores, so neighbouring ranks often differ by less than the
			intervals.
		</p>
	</section>

	<section id="map">
		<h2>The map</h2>
		<p>
			Each society sits at the coordinates given in the GSN data; Kosovo's position was added by
			hand. Shapes mark the authors' four-way grouping of regions (Africa, Asia, Latin America and
			the West), a convenience grouping with known oddities: Russia and Israel are in the West and
			Turkey is in Asia. Outlines come from Natural Earth, which is in the public domain.
		</p>
	</section>

	<section id="privacy">
		<h2>Privacy</h2>
		<p>
			The atlas sets no cookies and collects no personal data. If you pick a theme, your choice is
			kept in your browser's local storage and never leaves it. GitHub, which hosts the site, logs
			visitors' IP addresses.
		</p>
	</section>
</article>

<style>
	.page {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 2rem var(--gutter) 0;
	}

	.draft {
		padding: 0.75rem 1rem;
		border-left: 4px solid var(--accent);
		background: var(--surface-muted);
	}

	nav ul {
		columns: 2 12rem;
		padding-left: 1.25rem;
	}

	section {
		scroll-margin-top: 1rem;
		margin-top: 2rem;
	}
</style>
