<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { CHANGE_MODULE } from '#lib/change-module.ts';
	import { CHANGE_HUB, CHANGE_NAME } from '#lib/change-text.ts';
	import { directionStyle, regionStyle, scoreStyle } from '#lib/charts/colors.ts';
	import { drill } from '#lib/charts/drill-model.ts';
	import LoadError from '#lib/components/LoadError.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ShareButton from '#lib/components/ShareButton.svelte';
	import SocietyPicker from '#lib/components/SocietyPicker.svelte';
	import { RESPONSES } from '#lib/data/format.ts';
	import { cellParams } from '#lib/data/grid.ts';
	import {
		loadCells,
		loadDistributions,
		loadGlobal,
		loadSocieties,
		preload
	} from '#lib/data/load.ts';
	import { REGIONS, SAMPLE_PHRASE } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { QUIZ_ITEMS } from '#lib/quiz/items.ts';
	import { RESPONSE_VALUES, quizQuestions, type Response } from '#lib/quiz/quiz-model.ts';
	import { readAnswers, sessionStore, writeAnswers, type Answers } from '#lib/quiz/quiz-store.ts';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import {
		audiencesHref,
		changeHref,
		pairHref,
		setView,
		societyHref,
		view,
		withView
	} from '#lib/state/view.svelte.ts';

	// FR-60: the three items from the configuration file, asked in its order.
	const questions = quizQuestions(QUIZ_ITEMS);
	const keys = questions.map((q) => q.key);

	const vs = $derived(view.state);

	// FR-63: answers live in page memory and the tab's sessionStorage only (decision 80).
	let answers: Answers = $state({});
	/** The response picked in each question's radio group, before or after it is revealed. */
	let picked: (Response | null)[] = $state(questions.map(() => null));
	/** The question shown, or the summary after the third. */
	let current = $state(0);
	const done = $derived(current >= questions.length);
	const question = $derived(questions[Math.min(current, questions.length - 1)]);
	const revealed = $derived(done ? undefined : answers[question.key]);

	// NFR-3: the societies' files load once the reader turns to a question, the response counts
	// only once a society is chosen (decision 80).
	let started = $state(false);
	const societies = new Resource(() => loadSocieties());
	const global = new Resource(() => (started ? loadGlobal(view.state.sample) : undefined));
	const cells = new Resource(() => (started ? loadCells(view.state.sample) : undefined));
	const counts = new Resource(() =>
		started && view.state.society ? loadDistributions(view.state.sample) : undefined
	);

	const files = $derived(
		global.current?.sample === vs.sample && cells.current?.sample === vs.sample
			? { global: global.current, cells: cells.current }
			: undefined
	);
	const society = $derived(societies.current?.get(vs.society));
	const drillFor = (cell: number) =>
		files && societies.current
			? drill(files.cells, societies.current, files.global, cell, 'shrunk', 'raw')
			: undefined;
	const countsFor = (cell: number) => {
		const file = counts.current?.sample === vs.sample ? counts.current : undefined;
		if (!file || !society) return undefined;
		const index = file.indexOf(society.code);
		return index === undefined ? null : file.counts(index, cell);
	};

	// NFR-3: the reveal's charts load with the data, not with the page (decision 80).
	let revealCode: Promise<typeof import('#lib/components/QuizReveal.svelte')> | undefined =
		$state();
	let summaryCode: Promise<typeof import('#lib/components/QuizSummary.svelte')> | undefined =
		$state();

	function start() {
		if (started) return;
		started = true;
		revealCode = import('#lib/components/QuizReveal.svelte');
		summaryCode = import('#lib/components/QuizSummary.svelte');
		const sample = view.state.sample;
		preload(
			() => loadGlobal(sample),
			() => loadCells(sample)
		);
	}

	async function focus(id: string) {
		await tick();
		document.getElementById(id)?.focus();
	}

	// FR-61: the answer is shown right away; focus moves to where it falls, and the page scrolls
	// so the chart under that heading is in view, not only the heading (D-9). No smooth scrolling
	// under reduced motion.
	async function showReveal() {
		await tick();
		const heading = document.getElementById('reveal-title');
		if (!heading) return;
		heading.focus({ preventScroll: true });
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		heading.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
	}

	function reveal(event: SubmitEvent) {
		event.preventDefault();
		const response = picked[current];
		if (response === null) return;
		start();
		answers = { ...answers, [question.key]: response };
		writeAnswers(sessionStore(), answers);
		void showReveal();
	}

	function next() {
		current += 1;
		void focus(current >= questions.length ? 'summary-title' : 'question-title');
	}

	function again() {
		answers = {};
		picked = questions.map(() => null);
		writeAnswers(sessionStore(), {});
		current = 0;
		void focus('question-title');
	}

	onMount(() => {
		// A reload keeps the answers (AT-3): reopen at the first unanswered question.
		const stored = readAnswers(sessionStore(), keys);
		if (Object.keys(stored).length) {
			answers = stored;
			picked = keys.map((key) => stored[key] ?? null);
			const open = keys.findIndex((key) => stored[key] === undefined);
			current = open === -1 ? questions.length : open;
			start();
		}
	});

	const cellHref = (cell: number) => {
		const { behavior, situation } = cellParams(questions.find((q) => q.index === cell)!);
		return withView(resolve(`explore/${behavior}/${situation}/`), vs, GLOBAL_KEYS);
	};

	const summaryRows = $derived(
		questions.map((q) => ({
			question: q,
			response: answers[q.key],
			drill: drillFor(q.index),
			counts: countsFor(q.index),
			href: cellHref(q.index)
		}))
	);

	// Decision 11: the hub's small pictures, drawn from the palette's tokens; they hold no data.
	const STRIP = [-2.1, -1.3, -0.6, 0.2, 0.9, 1.7];
	const GRID = [-2, -1, 0.5, 1.5, -0.5, 1, 2, -1.5, 0, 0.8, -2.2, 1.2, -0.3, 0.6, 1.8];
	const SWARM = REGIONS.flatMap((region, r) =>
		[0, 1].map((k) => ({ region, k: r * 2 + k, y: [22, 58, 40, 64, 28, 50, 36, 60][r * 2 + k] }))
	);
	const BARS = [1.6, 0.6, -0.9];
</script>

<!-- FR-1: the home route opens the quiz entry, with "Skip to the atlas" in view (decision 78). -->
<Seo
	description="How appropriate is it to sing at a funeral? Rate three everyday behaviors and see how your answers compare with respondents in 90 societies, then explore 15 behaviors in 10 situations."
/>

<div class="home">
	<!-- D-11: the first question is the page's hero, under a one-line promise; "Skip to the atlas"
	     stays in view as a link (FR-1), with the tour beside it. -->
	<section class="quiz" aria-labelledby="quiz-title">
		<div class="page-title">
			<h1 id="quiz-title">How would you answer?</h1>
			<ShareButton />
		</div>
		<p class="lede">
			Rate three everyday behaviors and see how respondents in 90 societies judged them; your
			answers stay in this browser tab.
		</p>
		<p class="ways">
			<a href={withView(resolve('explore/'), vs, GLOBAL_KEYS)}>Skip to the atlas</a>
			or <a href={withView(resolve('story/'), vs, GLOBAL_KEYS)}>take the 2-minute tour</a>
		</p>
		<noscript>
			<p>The quiz needs JavaScript. Skip to the atlas to explore the answers.</p>
		</noscript>

		<div class="needs-js">
			<!-- FR-62: a society to compare with, before or during the quiz, or none. -->
			<div class="society-pick">
				<SocietyPicker
					societies={societies.current}
					selected={vs.society}
					sample={vs.sample}
					label="Compare with a society (optional)"
					onselect={(code) => setView({ society: code })}
				/>
				{#if vs.sample !== 'all'}
					<p class="sample" role="status">Comparing with {SAMPLE_PHRASE[vs.sample]}.</p>
				{/if}
			</div>

			{#each [societies, global, cells, counts] as resource, i (i)}
				{#if resource.error}
					<LoadError error={resource.error} retry={resource.retry} />
				{/if}
			{/each}

			{#if !done}
				<form class="question" onsubmit={reveal}>
					<fieldset>
						<legend>
							<h2 id="question-title" tabindex="-1">
								<span class="count">Question {current + 1} of {questions.length}</span>
								{question.question}
							</h2>
						</legend>
						<div class="responses">
							{#each RESPONSE_VALUES as response (response)}
								<label class="response">
									<input
										type="radio"
										name="response"
										value={response}
										checked={picked[current] === response}
										onchange={() => (picked[current] = response)}
										onfocus={start}
									/>
									<span>{RESPONSES[response - 1]}</span>
								</label>
							{/each}
						</div>
					</fieldset>
					<button
						type="submit"
						class="button primary"
						disabled={picked[current] === null}
						onpointerenter={start}
					>
						See where your answer falls
					</button>
				</form>

				{#if revealed !== undefined}
					<section class="answer" aria-labelledby="reveal-title">
						<h2 id="reveal-title" tabindex="-1">Where your answer falls</h2>
						{#await revealCode}
							<p class="loading">Loading…</p>
						{:then module}
							{#if module}
								<module.default
									{question}
									response={revealed}
									drill={drillFor(question.index)}
									sample={vs.sample}
									{society}
									counts={countsFor(question.index)}
									onselect={(code) => setView({ society: code })}
								/>
							{/if}
						{:catch error}
							<LoadError
								{error}
								retry={() => (revealCode = import('#lib/components/QuizReveal.svelte'))}
							/>
						{/await}
						<p>
							<button type="button" class="button primary" onclick={next}>
								{current + 1 < questions.length ? 'Next question' : 'See all your answers'}
							</button>
						</p>
					</section>
				{/if}
			{:else}
				<section class="summary" aria-labelledby="summary-title">
					<h2 id="summary-title" tabindex="-1">Your answers</h2>
					{#await summaryCode}
						<p class="loading">Loading…</p>
					{:then module}
						{#if module}
							<module.default rows={summaryRows} {society} sample={vs.sample} />
						{/if}
					{:catch error}
						<LoadError
							{error}
							retry={() => (summaryCode = import('#lib/components/QuizSummary.svelte'))}
						/>
					{/await}
					<!-- D-10: the tour is the next step; nothing here shares or carries the answers. -->
					<p class="next-steps">
						<a class="button primary" href={withView(resolve('story/'), vs, GLOBAL_KEYS)}>
							Take the 2-minute tour
						</a>
						<a class="button" href={withView(resolve('explore/'), vs, GLOBAL_KEYS)}>
							Explore the atlas
						</a>
						<button type="button" class="button" onclick={again}>Start again</button>
					</p>
				</section>
			{/if}
		</div>
	</section>

	<!-- Decision 11: the ways into the atlas, each a question (the review's section 6). -->
	<section class="hub" aria-labelledby="hub-title">
		<h2 id="hub-title">Explore the atlas</h2>
		<ul class="cards">
			<li class="card">
				<div class="preview strip" aria-hidden="true">
					{#each STRIP as score, i (i)}
						<span class="score" style="{scoreStyle(score)};--x:{8 + i * 16}%"></span>
					{/each}
				</div>
				<h3>
					<a class="stretch" href={withView(resolve('story/'), vs, GLOBAL_KEYS)}>
						Take the 2-minute tour
					</a>
				</h3>
				<p>What the survey found, one chart at a time.</p>
			</li>
			<li class="card">
				<div class="preview grid" aria-hidden="true">
					{#each GRID as score, i (i)}
						<span class="score" style={scoreStyle(score)}></span>
					{/each}
				</div>
				<h3>Look up a situation</h3>
				<p>Any of 15 behaviors in 10 situations, in every society.</p>
				<div class="needs-js">
					<SocietyPicker
						societies={undefined}
						selected={null}
						sample={vs.sample}
						label="Behavior and situation"
						onselect={() => {}}
						onpair={(cell) => goto(pairHref(cell, vs))}
						pairsOnly
					/>
				</div>
				<p class="all">
					<a href={withView(resolve('explore/'), vs, GLOBAL_KEYS)}>Or see all 150 pairs</a>
				</p>
			</li>
			<li class="card">
				<div class="preview swarm" aria-hidden="true">
					{#each SWARM as dot (dot.k)}
						<span class="region" style="{regionStyle(dot.region)};--k:{dot.k};--y:{dot.y}%"></span>
					{/each}
				</div>
				<h3><a class="stretch" href={societyHref(null, vs)}>Look up a society</a></h3>
				<p>How respondents in each of 90 societies answered, and who answered alike.</p>
			</li>
			<li class="card">
				<div class="preview bars" aria-hidden="true">
					{#each BARS as score, i (i)}
						<span class="score" style="{scoreStyle(score)};--h:{70 - i * 22}%"></span>
					{/each}
				</div>
				<h3>
					<a class="stretch" href={audiencesHref(null, vs)}>Does it matter who's watching?</a>
				</h3>
				<p>The same behaviors alone and in front of colleagues or management.</p>
			</li>
			{#if CHANGE_MODULE}
				<li class="card">
					<div class="preview arrows direction" aria-hidden="true" style={directionStyle()}>
						<span class="from"></span><span class="line"></span><span class="to"></span>
					</div>
					<h3>
						<a class="stretch" href={changeHref(vs.society, vs, false)}>{CHANGE_NAME}</a>
					</h3>
					<p>{CHANGE_HUB}</p>
				</li>
			{/if}
		</ul>
	</section>
</div>

<style>
	.home {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 1.5rem var(--gutter) 0;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: var(--text-2xl);
	}

	.lede {
		margin: 0;
		font-size: var(--text-lg);
	}

	.ways {
		margin: 0.5rem 0 0;
	}

	.primary {
		font-weight: 600;
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}

	.primary:hover {
		background: var(--accent);
		text-decoration: underline;
	}

	.primary:disabled {
		border-color: var(--border-strong);
		background: var(--surface-muted);
		color: var(--text-muted);
		text-decoration: none;
		cursor: not-allowed;
	}

	.society-pick {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.5rem 1.5rem;
		margin: 1rem 0 1.25rem;
	}

	.sample {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend {
		padding: 0;
	}

	.quiz h2 {
		font-size: var(--text-xl);
		margin: 0 0 1rem;
	}

	.count {
		display: block;
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--text-muted);
	}

	/* The six responses in the GSN's order, from 1 to 6 (§4.3): two columns from 480 px. */
	.responses {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	@media (min-width: 480px) {
		.responses {
			grid-template-columns: 1fr 1fr;
			grid-auto-flow: column;
			grid-template-rows: repeat(3, auto);
		}
	}

	.response {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-height: 2.75rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		cursor: pointer;
	}

	.response:has(input:checked) {
		border-width: 2px;
		border-color: var(--text);
		font-weight: 600;
	}

	.response input {
		width: 1.125rem;
		height: 1.125rem;
		margin: 0;
	}

	.answer,
	.summary {
		margin-top: 2rem;
	}

	#reveal-title {
		scroll-margin-top: 1rem;
	}

	.loading {
		min-height: 14rem;
		color: var(--text-muted);
	}

	.next-steps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	/* Decision 11: the hub, one card per way in. */
	.hub {
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.hub h2 {
		margin: 0 0 1rem;
		font-size: var(--text-xl);
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
		gap: 1.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Direction A: each way in under a rule, not in a box. */
	.card {
		position: relative;
		padding: 0.75rem 0 0;
		border-top: 2px solid var(--text);
	}

	.card:has(.stretch:hover) h3 {
		text-decoration: underline;
	}

	.card:has(.stretch:focus-visible) {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}

	.card h3 {
		margin: 0 0 0.25rem;
		font-size: var(--text-lg);
	}

	.card p {
		margin: 0;
	}

	.card .all {
		margin-top: 0.5rem;
		font-size: var(--text-sm);
	}

	.card .needs-js {
		margin-top: 0.75rem;
	}

	/* The whole card follows its link. */
	.stretch::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	.stretch:focus-visible {
		outline: none;
	}

	.preview {
		position: relative;
		height: 3.5rem;
		margin-bottom: 0.75rem;
		border-radius: var(--radius);
		background: var(--surface-muted);
	}

	.preview span {
		position: absolute;
	}

	.strip::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 6%;
		right: 6%;
		border-top: 1px solid var(--border-strong);
	}

	.strip span {
		top: calc(50% - 0.5rem);
		left: var(--x);
		width: 1rem;
		height: 1rem;
		border: 1px solid var(--border-strong);
		border-radius: 50%;
		background: var(--fill);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(5, 1.125rem);
		grid-auto-rows: 0.875rem;
		gap: 0.125rem;
		align-content: center;
		padding-left: 1rem;
	}

	.grid span {
		position: static;
		border-radius: 0.125rem;
		background: var(--fill);
	}

	.swarm span {
		top: var(--y);
		left: calc(10% + var(--k) * 10%);
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		background: var(--region);
	}

	.bars {
		display: flex;
		align-items: flex-end;
		gap: 0.375rem;
		padding: 0.5rem 1rem 0;
	}

	.bars span {
		position: static;
		width: 1.25rem;
		height: var(--h);
		border-radius: 0.125rem 0.125rem 0 0;
		background: var(--fill);
	}

	.arrows .from,
	.arrows .to {
		top: calc(50% - 0.375rem);
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
	}

	.arrows .from {
		left: 18%;
		border: 2px solid var(--text-muted);
	}

	.arrows .to {
		left: 62%;
		background: var(--more);
	}

	.arrows .line {
		top: 50%;
		left: calc(18% + 0.75rem);
		width: calc(44% - 0.75rem);
		border-top: 2px solid var(--more);
	}
</style>
