<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { drill } from '#lib/charts/drill-model.ts';
	import LoadError from '#lib/components/LoadError.svelte';
	import QuizReveal from '#lib/components/QuizReveal.svelte';
	import Seo from '#lib/components/Seo.svelte';
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
	import { SAMPLE_LABEL } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { QUIZ_ITEMS } from '#lib/quiz/items.ts';
	import {
		RESPONSE_VALUES,
		placement,
		placementText,
		quizQuestions,
		type Response
	} from '#lib/quiz/quiz-model.ts';
	import { readAnswers, sessionStore, writeAnswers, type Answers } from '#lib/quiz/quiz-store.ts';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import { setView, view, withView } from '#lib/state/view.svelte.ts';

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

	function start() {
		if (started) return;
		started = true;
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

	// FR-61: the answer is shown right away; focus moves to where it falls.
	function reveal(event: SubmitEvent) {
		event.preventDefault();
		const response = picked[current];
		if (response === null) return;
		start();
		answers = { ...answers, [question.key]: response };
		writeAnswers(sessionStore(), answers);
		void focus('reveal-title');
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
</script>

<!-- FR-1: the home route opens the quiz entry, with "Skip to the atlas" in view (decision 78). -->
<Seo
	description="How appropriate is it to sing at a funeral? Rate three everyday behaviors and see how your answers compare with respondents in 90 societies, then explore 15 behaviors in 10 situations."
/>

<div class="home">
	<h1>The Etiquette Atlas</h1>
	<p class="lede">
		Is it fine to eat on a bus, or to use a phone at a funeral? See how respondents in 90 societies
		judged 15 everyday behaviors in 10 situations.
	</p>
	<p>
		<a class="button primary" href={withView(resolve('explore/'), vs, GLOBAL_KEYS)}>
			Skip to the atlas
		</a>
	</p>

	<section class="quiz" aria-labelledby="quiz-title">
		<h2 id="quiz-title">How would you answer?</h2>
		<p class="intro">
			Rate three behaviors on the six answers the survey offered, and see how your answers compare
			with the average answers of respondents in each society. Your answers stay in this browser
			tab: they are never sent anywhere.
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
					<p class="sample" role="status">Comparing with the {SAMPLE_LABEL[vs.sample]}.</p>
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
							<h3 id="question-title" tabindex="-1">
								<span class="count">Question {current + 1} of {questions.length}</span>
								{question.question}
							</h3>
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
						<h3 id="reveal-title" tabindex="-1">Where your answer falls</h3>
						<QuizReveal
							{question}
							response={revealed}
							drill={drillFor(question.index)}
							sample={vs.sample}
							{society}
							counts={countsFor(question.index)}
							onselect={(code) => setView({ society: code })}
						/>
						<p>
							<button type="button" class="button primary" onclick={next}>
								{current + 1 < questions.length ? 'Next question' : 'See all your answers'}
							</button>
						</p>
					</section>
				{/if}
			{:else}
				<section class="summary" aria-labelledby="summary-title">
					<h3 id="summary-title" tabindex="-1">Your answers</h3>
					<ol>
						{#each questions as q (q.key)}
							{@const response = answers[q.key]}
							{@const d = drillFor(q.index)}
							<li>
								<strong>{q.headline}</strong>:
								{#if response !== undefined}
									{d
										? placementText(placement(d, response), response, vs.sample)
										: RESPONSES[response - 1]}
								{:else}
									not answered.
								{/if}
								<a href={cellHref(q.index)}>See every society for this pair</a>
							</li>
						{/each}
					</ol>
					<p class="next-steps">
						<a class="button primary" href={withView(resolve('story/'), vs, GLOBAL_KEYS)}>
							Take the guided tour
						</a>
						<a class="button" href={withView(resolve('explore/'), vs, GLOBAL_KEYS)}>
							Explore the matrix
						</a>
						<button type="button" class="button" onclick={again}>Start again</button>
					</p>
				</section>
			{/if}
		</div>
	</section>
</div>

<style>
	.home {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 2.5rem var(--gutter) 0;
	}

	h1 {
		font-size: clamp(2rem, 1.2rem + 4vw, 3rem);
	}

	.lede {
		font-size: var(--text-lg);
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

	.quiz {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.society-pick {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.5rem 1.5rem;
		margin: 1.25rem 0 1.5rem;
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

	h3 {
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

	.summary li {
		margin-bottom: 0.75rem;
	}

	.next-steps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
</style>
