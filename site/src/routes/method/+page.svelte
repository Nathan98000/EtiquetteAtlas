<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import { attribution, audienceCredit } from '#lib/attribution.ts';
	import { CHANGE_MODULE } from '#lib/change-module.ts';
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
			<li><a href="#audiences">Who's watching?</a></li>
			{#if CHANGE_MODULE}<li><a href="#change">Change since the early 2000s</a></li>{/if}
			<li><a href="#quiz">The quiz</a></li>
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

	<section id="audiences">
		<h2>Who's watching? Audiences and actor gender</h2>
		<p>
			A second part of the survey asked about the same 15 behaviors without a situation, but with an
			audience: when alone, in front of colleagues or classmates, or in front of management or
			professors. It also asked how appropriate each behavior is when done by a woman and when done
			by a man. That is about who does it, not who watches, so the charts draw it apart from the
			audiences. They show how respondents judged each behavior in front of each audience, not why,
			and not how anyone feels when watched.
		</p>
		<p>
			Each value is the average answer of a society's respondents, as given, with its 95% interval;
			"all societies" is the average of the society averages. The audience effect is the score when
			alone minus the score in front of management or professors, the two ends of the audiences. It
			keeps its sign, so a behavior judged more appropriate in front of management shows as higher,
			not as a smaller drop. Talking is judged most appropriate in front of colleagues or
			classmates, so its range across the three audiences is a little larger than this difference. A
			difference has no interval of its own: both scores come from the same respondents, so their
			intervals cannot simply be combined, and a small difference in one society may be noise.
		</p>
		<p>
			These charts always show raw scores. Centering subtracts each society's average over the 150
			situations, which these questions are not part of, and the audience effect compares a society
			with itself, so the way a society's respondents use the scale mostly cancels out.
		</p>
		<p>
			Women and men respondents are shown for all societies together only: within one society, a
			behavior's answers from women or from men in front of one audience rest on about 11
			respondents in the median society. Respondents who answered "other" or preferred not to say
			are left out of this split, though they count everywhere else.
		</p>
		<!-- FR-43, decision 66. -->
		<p>
			These audience effects were analysed by {audienceCredit.authors} ({audienceCredit.year}).
			<a href={audienceCredit.url} rel="external">{audienceCredit.title}</a>.
			<cite>{audienceCredit.journal}</cite>
			{audienceCredit.volume}. The atlas shows its own aggregates of the GSN data, which can differ
			from the paper's estimates.
		</p>
	</section>

	<!-- FR-52, FR-70, NFR-41, §4.7, §4.8; decisions 67 to 75. Left out of a build without the
	     change module (R-6). -->
	{#if CHANGE_MODULE}
		<section id="change">
			<h2>Change since the early 2000s</h2>
			<p>
				For 26 societies, a survey from 2000–2003 by Gelfand and colleagues asked about 12 of the
				same behaviors in the same 10 situations; resting, shouting in anger and using a mobile
				phone were not asked then. The change pages compare the two surveys' average answers for
				each society and pair. The surveys asked different people, recruited in different ways, with
				different questionnaires, about 20 years apart. A difference is therefore a difference
				between two surveys, not a change in anyone's views, and it does not say why the answers
				differ. Only summaries of the older survey are shown, each society's average for each pair,
				never an individual answer: the GSN authors note that its individual answers are not public.
			</p>
			<p>
				Both surveys are shown as raw averages on the −2.5 to +2.5 scale, whatever the scale toggle
				says, because the older survey has no centered scores. The difference is the 2023–2024
				average minus the 2000–2003 average, with a 95% interval from resampling each survey's
				respondents within each society. A difference counts as higher or lower in 2023–2024 only
				when its interval excludes 0; an interval that ends exactly at 0 counts as within. In the
				older survey a pair rests on 107 to 312 ratings. In the newer one, pairs with 10 to 29
				respondents are marked as small samples; they occur only in the Attention check sample.
				Israel's 2000–2003 data have no value for laughing out loud at a party.
			</p>
			<p>
				Without a society, the pages average the societies in both surveys: 26, or 22 in the Paper's
				sample, which leaves out South Korea, the Netherlands, Portugal and Turkey. These are not
				the averages of all 90 societies shown elsewhere. A society's mean difference averages its
				pairs. A behavior's averages its 10 situations within each society, then the societies, as
				in Table 1 of Eriksson et al. ({attribution.year}), which the Paper's sample reproduces; its
				count of societies "above 0" includes differences within their intervals.
			</p>
			<p>
				2000–2003 data: <a href={attribution.comparisonUrl} rel="external"
					>{attribution.comparison}</a
				>, shared by the GSN authors in their
				<a href={attribution.dataUrl} rel="external">deposit on OSF</a>.
			</p>
		</section>
	{/if}

	<!-- FR-60, FR-61, FR-63; decisions 78 to 80. -->
	<section id="quiz">
		<h2>The quiz</h2>
		<p>
			On the home page you can rate three behaviors in situations on the six answers the survey
			offered, from extremely inappropriate to extremely appropriate. The question wording is the
			atlas's own; the six answers are the survey's. Your answer is placed among each society's
			average answer (the shrunken estimate, on the raw scale) in the sample you chose. An average
			is the middle of many people's answers, while yours is a single answer on one of the six
			points, so "above the average answer of respondents in 4 societies" says where your answer
			falls, not how you compare with anyone. If you choose a society, you also see how many of its
			respondents gave each answer. Societies with fewer than 10 respondents for a question are left
			out and counted apart.
		</p>
		<p>
			Your answers stay in this browser tab: they are kept in its session storage, so a reload keeps
			them, and they disappear when you close the tab or choose "Start again". They are never sent,
			logged or put in the page's address.
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
			kept in your browser's local storage and never leaves it. If you take the quiz, your answers
			are kept in the tab's session storage until you close it, and never leave it either. GitHub,
			which hosts the site, logs visitors' IP addresses.
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
