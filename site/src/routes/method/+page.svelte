<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import MethodChange from '#lib/components/MethodChange.svelte';
	import MethodChangeLink from '#lib/components/MethodChangeLink.svelte';
	import SocietyFacts from '#lib/components/SocietyFacts.svelte';
	import { attribution, audienceCredit } from '#lib/attribution.ts';
	import { CHANGE_MODULE } from '#lib/change-module.ts';
	import { listText } from '#lib/data/society.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const all = $derived(data.samples.find((s) => s.sample === 'all')!);
	const others = $derived(data.samples.filter((s) => s.sample !== 'all'));
	// Cloudflare's privacy policy, as linked from its Web Analytics page (FR-92, decision 94).
	const CLOUDFLARE_PRIVACY = 'https://www.cloudflare.com/privacypolicy/';
</script>

<!-- FR-70 to FR-73, FR-92, NFR-34, HR-8 (decision 93): the method in plain language, from
     docs/method-notes.md, with §4.8's caveats, the per-society table, each sample's effect, the
     versions and checksums, and the privacy notice. Each chart's "About this chart" opens its
     section (FR-7). -->
<Seo
	title="Method"
	description="How The Etiquette Atlas turns the Global Study of Everyday Norms into scores, intervals and disagreement, what it cannot tell you, and where every number comes from."
/>

<article class="page">
	<h1>Method</h1>
	<p class="lede">
		How the atlas turns the answers of {all.respondents} respondents into the scores, ranges and charts
		you see, what it cannot tell you, and where everything comes from. Each chart's "About this chart"
		link opens its section here.
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
			{#if CHANGE_MODULE}<MethodChangeLink />{/if}
			<li><a href="#quiz">The quiz</a></li>
			<li><a href="#story">The guided story</a></li>
			<li><a href="#rank">Ranks</a></li>
			<li><a href="#map">The map</a></li>
			<li><a href="#limits">What the atlas cannot tell you</a></li>
			<li><a href="#privacy">Privacy</a></li>
			<li><a href="#versions">Versions and checksums</a></li>
			<li><a href="#about">About the atlas</a></li>
			<li><a href="#societies">Every society in the data</a></li>
		</ul>
	</nav>

	<section id="data">
		<h2>Where the numbers come from</h2>
		<p>
			Everything here comes from the
			<a href={attribution.dataUrl} rel="external">Global Study of Everyday Norms</a>:
			{all.respondents} people in {all.societies} societies rated how appropriate 15 everyday behaviors
			are in 10 situations, between July 2023 and May 2024. They were convenience samples, recruited in
			different ways at each site (by email, social media or survey organizations), so they are not a
			random sample of each country, and more than half are recorded as students. That is why the atlas
			speaks of "respondents in Chile" rather than "Chileans". The atlas shows summaries of their answers,
			never an individual answer, and never a score or a count of answers for a group of fewer than 10
			people.
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
				<strong>Paper's sample</strong>: the respondents behind the main figures of the GSN paper.
				It leaves out people who took the survey after February 2024, and Kuwait.
			</li>
			<li>
				<strong>Attention check</strong>: respondents who passed a check that they were reading
				carefully, in the societies the GSN authors kept with it.
			</li>
		</ul>
		<h3>What each sample changes</h3>
		<!-- FR-71: each toggle's effect, from the committed files at build time. -->
		<ul>
			<li>
				<strong>{all.label}</strong>: {all.respondents} respondents in {all.societies} societies.
			</li>
			{#each others as sample (sample.sample)}
				<li>
					<strong>{sample.label}</strong>: {sample.respondents} respondents in {sample.societies} societies.
					It leaves out {sample.leftOut.length} societies: {listText(sample.leftOut)}. Across the
					150 pairs, the average of all societies moves by {sample.shift?.mean} on average and by at most
					{sample.shift?.max} from All data.
				</li>
			{/each}
		</ul>
		<p>
			With fewer respondents, a society's scores rest on fewer answers: their intervals widen, more
			pairs read "too few responses", and ranks can move. Societies outside the chosen sample read
			"not in this sample". The guided story always shows All data.
		</p>
		<p>
			The paper's statistical models use a further subset, the 17,288 respondents with every answer
			those models need. The atlas does not offer it; it uses it only to check that it rebuilds the
			paper's samples exactly.
		</p>
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
			each society's respondents at random, with replacement, {data.versions.replicates} times and recomputing
			everything each time; the interval holds the middle 95% of the results. Narrow ranges mean many
			respondents who largely agree. The intervals treat the set of societies as fixed: they reflect who
			was surveyed within each society, not which societies took part.
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
			based on few move more. A shrunken score's interval comes from a formula that combines the
			society's own uncertainty with that of the average of all societies. On a pair's page, the
			Estimate toggle switches to the raw scores.
		</p>
	</section>

	<section id="global">
		<h2>The global picture</h2>
		<p>
			The matrix shows the average score of all societies for each pair, with every society counting
			equally, however many respondents it had. In All data, the 829 respondents in the United
			States count as much as the 71 in Chile.
		</p>
	</section>

	<section id="disagreement">
		<h2>Disagreement</h2>
		<p>
			For each pair, disagreement measures how far apart societies are. Some of the spread between
			society scores is just the noise of surveying a few dozen people per society, so we subtract
			that noise: what remains is our estimate of how much respondents in different societies really
			differ. It is in the same units as the scores: a disagreement of 0.5 means societies typically
			sit about half a point above or below the global average. On a pair's page, the band around
			the global average spans one disagreement either side.
		</p>
	</section>

	<section id="centered">
		<h2>Centered scores</h2>
		<p>
			Respondents in some societies rate nearly everything higher than respondents elsewhere; the
			data cannot tell whether that is general leniency or a way of using the scale. The centered
			view removes each society's overall tendency, so you see where it is stricter or looser than
			usual for itself. The GSN paper makes no such adjustment; it is our addition.
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
			compare two societies only when at least 120 of the 150 pairs have 10 or more respondents in
			both, so a few societies have no similar societies listed. Centering shifts all of a society's
			scores by the same amount, so the scale toggle does not change similarity.
		</p>
	</section>

	<section id="facts">
		<h2>Society facts</h2>
		<p>
			Each society's page shows how many people responded in the chosen sample, the share flagged as
			students, the languages people took the survey in, and the months of fieldwork; the table at
			the end of this page lists them all. Student status was not collected the same way at every
			site: some asked respondents, some recorded it for everyone they recruited, and some recorded
			none, so we show the share with no status as well. Fieldwork months are those in which at
			least 10 respondents started. The collection sites themselves are never shown, as they could
			help identify respondents. Regions are the GSN authors' four-way grouping (see The map).
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
			behavior–situation pairs, which these questions are not part of, and the audience effect
			compares a society with itself, so the way a society's respondents use the scale mostly
			cancels out.
		</p>
		<p>
			Women and men respondents are shown for all societies together only: within one society, a
			behavior in front of one audience was rated by about 55 respondents in the median case, and
			men are about a third of respondents, so each group would be small. Respondents who answered
			"other" or preferred not to say are left out of this split, though they count everywhere else.
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

	{#if CHANGE_MODULE}<MethodChange />{/if}

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

	<!-- FR-64, §4.8; decisions 81 to 83. -->
	<section id="story">
		<h2>The guided story</h2>
		<p>
			The guided story opens with one of the GSN paper's conclusions: norms vary "far more across
			situations than across societies". In the paper's statistical model, after the predictors it
			uses, judgments differ between situated behaviors with a standard deviation of 0.31 on the
			−2.5 to +2.5 scale (on top of 0.36 between the 15 behaviors themselves), between societies
			with 0.19 and between individual respondents with 0.50; single ratings vary around all of
			these with 1.11, what the model leaves unexplained. These are the paper's estimates for its
			preregistered sample of 17,288 respondents (its Supplementary Table 9); the atlas does not
			compute them. The story's other steps are chosen from All data, whatever sample you picked
			elsewhere.
		</p>
	</section>

	<section id="rank">
		<h2>Ranks</h2>
		<p>
			A society's rank is one more than the number of societies with a higher score for the pair,
			among those shown for the chosen sample, estimate and scale; societies with equal scores share
			a rank. Ranks move with the uncertainty of the scores, so neighbouring ranks often differ by
			less than the intervals.
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

	<!-- §4.8, FR-73, R-2, R-4. -->
	<section id="limits">
		<h2>What the atlas cannot tell you</h2>
		<ul>
			<li>
				<strong>What a country thinks.</strong> Respondents were convenience samples, recruited in
				different ways at each site: {data.students.students}% of all respondents were recorded as
				students, and no status was recorded for another {data.students.unknown}%. A society's score
				describes its respondents, not its population.
			</li>
			<li>
				<strong>Why answers differ.</strong> The atlas shows where answers differ and by how much. It
				does not say what makes one society's respondents stricter than another's.
			</li>
			<li>
				<strong>Whether every translation measures the same thing.</strong> The GSN authors tested whether
				the questionnaire works the same way across societies only for its scale of values, where it held
				in part (the same structure everywhere, but not full measurement invariance), and not for the
				ratings of appropriateness the atlas shows. Some differences between societies may come from wording.
			</li>
			<li>
				<strong>How any one person's views changed.</strong> Each respondent answered once, between July
				2023 and May 2024; the change pages compare two surveys of different people.
			</li>
		</ul>
	</section>

	<!-- FR-92, NFR-34, HR-8, C-11, NFR-30; decision 94. -->
	<section id="privacy">
		<h2>Privacy</h2>
		<p>The atlas sets no cookies and asks for no personal data.</p>
		<ul>
			<li>
				<strong>Analytics.</strong> Every page loads Cloudflare Web Analytics to count visits. For
				each page view it records the page's address without its query string, the site that linked
				to it, the country, the browser, operating system and device type, and how fast the page
				loaded. The address names the page you opened, such as a society's or a pair's. The choices
				the atlas keeps in the query string (a society picked on other pages, the sample, the scale)
				are not sent, and neither are your quiz answers. Like any server your browser contacts,
				Cloudflare receives your IP address. Cloudflare says it uses no cookies or browser storage
				for this and does not fingerprint visitors by their IP address or browser. See
				<a href={CLOUDFLARE_PRIVACY} rel="external">Cloudflare's privacy policy</a>.
			</li>
			<li>
				<strong>Your browser's storage.</strong> If you pick a theme, your choice is kept in your browser's
				local storage. If you take the quiz, your answers are kept in the tab's session storage until
				you close it. The site also keeps scroll positions there, so Back returns you to where you were.
				None of this leaves your browser.
			</li>
			<li>
				<strong>Hosting.</strong> GitHub, which hosts the site on GitHub Pages, logs visitors' IP addresses.
			</li>
		</ul>
	</section>

	<!-- FR-72; decision 20. -->
	<section id="versions" class="wide">
		<h2>Versions and checksums</h2>
		<p>
			The numbers on this site were built on {data.versions.buildDate} by version {data.versions
				.pipeline}
			of the atlas's pipeline, from these files of the GSN deposit on OSF. Each file is checked against
			its MD5 checksum before use, and the build stops if one has changed.
		</p>
		<table>
			<caption>OSF files read by the pipeline</caption>
			<thead>
				<tr>
					<th scope="col">File</th>
					<th scope="col">OSF version</th>
					<th scope="col">MD5 checksum</th>
				</tr>
			</thead>
			<tbody>
				{#each data.versions.files as file (file.name)}
					<tr>
						<th scope="row"><a href={file.url} rel="external">{file.name}</a></th>
						<td>{file.version}</td>
						<td><code>{file.md5}</code></td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p>
			Intervals use {data.versions.replicates} replicates drawn from a fixed seed ({data.versions
				.seed}), so rebuilding from the same files gives exactly the same numbers. The pipeline and
			the site are open source: <a href={attribution.codeUrl} rel="external">code on GitHub</a>.
		</p>
	</section>

	<section id="about">
		<h2>About the atlas</h2>
		<p>
			The Etiquette Atlas is an independent, non-commercial site. It is not made, reviewed or
			endorsed by the authors of the Global Study of Everyday Norms; it builds on the data they
			shared under
			<a href={attribution.licenseUrl} rel="license external">{attribution.license}</a>. To cite the
			data, cite {attribution.authors} ({attribution.year}),
			<a href={attribution.articleUrl} rel="external">{attribution.title}</a>,
			<cite>{attribution.journal}</cite>
			{attribution.volume}, and the
			<a href={attribution.dataUrl} rel="external">OSF deposit</a>. The site's code is under the MIT
			licence; mistakes, and any part of the site you cannot reach or use with your browser,
			keyboard or assistive technology, can be reported as an issue on
			<a href={attribution.codeUrl} rel="external">GitHub</a>.
		</p>
	</section>

	<!-- FR-71: every society's sample sizes, student share and languages. -->
	<section id="societies" class="wide">
		<h2>Every society in the data</h2>
		<SocietyFacts />
	</section>
</article>

<style>
	/* Text keeps its measure; the two tables may use more of the width. */
	.page {
		max-width: 64rem;
		margin: 0 auto;
		padding: 2rem var(--gutter) 0;
	}

	.page > :not(.wide) {
		max-width: var(--measure);
		margin-inline: auto;
	}

	.wide > :not(table) {
		max-width: var(--measure);
	}

	.lede {
		font-size: var(--text-lg);
	}

	nav ul {
		columns: 2 12rem;
		padding-left: 1.25rem;
	}

	section {
		scroll-margin-top: 1rem;
		margin-top: 2rem;
	}

	h3 {
		font-size: var(--text-md);
		margin-bottom: 0.5rem;
	}

	table {
		border-collapse: collapse;
		width: 100%;
		font-size: var(--text-sm);
	}

	caption {
		text-align: left;
		padding-bottom: 0.5rem;
	}

	th,
	td {
		padding: 0.3rem 0.4rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
		overflow-wrap: anywhere;
	}

	thead th {
		border-bottom: 2px solid var(--border-strong);
	}

	code {
		font-size: 0.8125rem;
	}
</style>
