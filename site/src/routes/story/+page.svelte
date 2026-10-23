<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { attribution } from '#lib/attribution.ts';
	import { audienceRows } from '#lib/charts/audience-model.ts';
	import Beeswarm from '#lib/charts/Beeswarm.svelte';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import DataTable, { type Column } from '#lib/charts/DataTable.svelte';
	import { drill } from '#lib/charts/drill-model.ts';
	import Slopegraph from '#lib/charts/Slopegraph.svelte';
	import SocietyTable from '#lib/charts/SocietyTable.svelte';
	import { CHANGE_MODULE } from '#lib/change-module.ts';
	import AudienceCredit from '#lib/components/AudienceCredit.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SHARE_ALT } from '#lib/share.ts';
	import StoryChange from '#lib/components/StoryChange.svelte';
	import StoryStep from '#lib/components/StoryStep.svelte';
	import { percent, responseLabel, score, spread } from '#lib/data/format.ts';
	import { BEHAVIOR_TEXT, BEHAVIORS, CELLS, cellParams, headline, phrase } from '#lib/data/grid.ts';
	import { loadCells, loadContexts, loadGlobal, loadSocieties } from '#lib/data/load.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { PAPER_SD, STEP_TITLE, storySteps, type StepId } from '#lib/story/story-model.ts';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import {
		audiencesHref,
		changeHref,
		societyHref,
		view,
		withView
	} from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const n = $derived(data.numbers);
	// Five steps without the change module, six with it (FR-64, R-6).
	const steps = $derived(storySteps(CHANGE_MODULE && n.change !== null));
	const vs = $derived(view.state);

	// The step crossing the middle of the window, and the steps near enough to load (NFR-3).
	let current: StepId = $state('finding');
	let near: Partial<Record<StepId, boolean>> = $state({});
	const markNear = (id: string) => (near[id as StepId] = true);
	const markCurrent = (id: string) => (current = id as StepId);

	// The story shows All data whatever the sample toggle (decision 82).
	const cellsNeeded = $derived(!!(near.universal || near.dependent));
	const global = new Resource(() => (cellsNeeded ? loadGlobal('all') : undefined));
	const cells = new Resource(() => (cellsNeeded ? loadCells('all') : undefined));
	const societies = new Resource(() => (cellsNeeded ? loadSocieties() : undefined));
	const contexts = new Resource(() => (near.audience ? loadContexts('all') : undefined));

	const drillFor = (cell: number) =>
		global.current && cells.current && societies.current
			? drill(cells.current, societies.current, global.current, cell, 'shrunk', 'raw')
			: undefined;
	const audience = $derived(
		contexts.current
			? audienceRows(contexts.current, { scope: { kind: 'global' }, split: false })[
					n.audience.behavior
				]
			: undefined
	);

	let hovered: string | null = $state(null);

	// FR-65: Next, Previous and the dots move to a step and its heading; no history entry, and no
	// smooth scrolling under reduced motion (decision 81).
	async function goTo(id: StepId) {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
		current = id;
		await tick();
		document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
	}
	const step = (offset: number) => (id: StepId) => {
		const target = steps[steps.indexOf(id) + offset];
		return target ? () => goTo(target) : undefined;
	};
	const previous = step(-1);
	const next = step(1);
	const indexOf = (id: StepId) => steps.indexOf(id);

	const cellHref = (cell: number) => {
		const { behavior, situation } = cellParams(CELLS[cell]);
		return withView(resolve(`explore/${behavior}/${situation}/`), vs, GLOBAL_KEYS);
	};
	const atlas = $derived(withView(resolve('explore/'), vs, GLOBAL_KEYS));

	interface SdRow {
		label: string;
		sd: number;
	}
	const SD_ROWS: SdRow[] = [
		{ label: 'Between situated behaviors', sd: PAPER_SD.situations },
		{ label: 'Between societies', sd: PAPER_SD.societies },
		{ label: 'Everything else: individual respondents and noise', sd: PAPER_SD.residual }
	];
	const sdColumns: Column<SdRow>[] = [
		{ header: 'Source of variation', text: (r) => r.label, rowHeader: true },
		{ header: 'Standard deviation in the paper’s model', text: (r) => spread(r.sd) }
	];

	const behaviorText = $derived(BEHAVIOR_TEXT[BEHAVIORS[n.audience.behavior]]);
</script>

<Seo
	title="A guided tour"
	description="Five or six steps through what the Global Study of Everyday Norms shows: norms vary more across situations than across societies, where societies agree and disagree, who's watching, and two surveys 20 years apart."
	imageAlt="{SHARE_ALT.story} Between situated behaviors {spread(
		PAPER_SD.situations
	)}; between societies {spread(PAPER_SD.societies)}."
/>

<div class="story">
	<header class="intro">
		<h1>A guided tour</h1>
		<p class="lede">
			A few steps through the answers of 25,422 respondents in 90 societies, then on to the atlas.
			The tour uses All data, every respondent in every society.
		</p>
		<noscript>
			<p>The charts need JavaScript; the text of every step is below.</p>
		</noscript>
	</header>

	<!-- FR-65: where you are, every step one press away, and a way out at all times. -->
	<nav class="progress" aria-label="Story steps">
		<p class="where" aria-live="polite">Step {indexOf(current) + 1} of {steps.length}</p>
		<ol class="dots">
			{#each steps as id, i (id)}
				<li>
					<button
						type="button"
						aria-label="Step {i + 1}: {STEP_TITLE[id]}"
						aria-current={current === id ? 'step' : undefined}
						onclick={() => goTo(id)}
					>
						<span class="dot" aria-hidden="true"></span>
					</button>
				</li>
			{/each}
		</ol>
		<a class="skip" href={atlas}>Skip to the atlas</a>
	</nav>

	{#each [global, cells, societies, contexts] as resource, i (i)}
		{#if resource.error}
			<LoadError error={resource.error} retry={resource.retry} />
		{/if}
	{/each}

	<StoryStep
		id="finding"
		index={indexOf('finding')}
		count={steps.length}
		title={STEP_TITLE.finding}
		next={next('finding')}
		oncurrent={markCurrent}
		onnear={markNear}
	>
		{#snippet text()}
			<p>
				The paper behind this atlas found that everyday norms vary "far more across situations than
				across societies". In its model, two situated behaviors typically differ by more (a standard
				deviation of {spread(PAPER_SD.situations)} on the −2.5 to +2.5 scale) than two societies do ({spread(
					PAPER_SD.societies
				)}), and both are small next to how much individual respondents differ ({spread(
					PAPER_SD.residual
				)}).
			</p>
			<p>
				The rest of this tour shows what that looks like in the answers.
				<a href={attribution.articleUrl} rel="external">Eriksson et al. ({attribution.year})</a>.
			</p>
		{/snippet}
		{#snippet figure()}
			<ChartFrame
				id="story-finding"
				title="How much answers vary, in the paper's model"
				summary="In the paper's model, the standard deviation is {spread(
					PAPER_SD.situations
				)} between situated behaviors, {spread(PAPER_SD.societies)} between societies and {spread(
					PAPER_SD.residual
				)} for everything else."
				about={resolve('method/#disagreement')}
			>
				{#snippet chart()}
					<ul class="bars" aria-label="Standard deviations in the paper's model">
						{#each SD_ROWS as row (row.label)}
							<li>
								<span class="bar-label">{row.label}</span>
								<span class="bar-track" aria-hidden="true">
									<span class="bar" style="width: {(row.sd / PAPER_SD.residual) * 100}%"></span>
								</span>
								<span class="bar-value num">{spread(row.sd)}</span>
							</li>
						{/each}
					</ul>
				{/snippet}
				{#snippet table()}
					<DataTable
						caption="Standard deviations in the paper's model"
						rows={SD_ROWS}
						columns={sdColumns}
						key={(r) => r.label}
					/>
				{/snippet}
			</ChartFrame>
		{/snippet}
	</StoryStep>

	{#each [['universal', n.universal], ['dependent', n.dependent]] as const as [id, c] (id)}
		{@const d = drillFor(c.cell)}
		<StoryStep
			{id}
			index={indexOf(id)}
			count={steps.length}
			title={STEP_TITLE[id]}
			previous={previous(id)}
			next={next(id)}
			oncurrent={markCurrent}
			onnear={markNear}
		>
			{#snippet text()}
				{#if id === 'universal'}
					<p>
						Respondents everywhere judged {phrase(CELLS[c.cell])}
						{responseLabel(c.mean)}: the average of the {c.societies} societies is {score(c.mean)},
						and
						{percent(c.share)} chose an appropriate answer. Disagreement between societies is {spread(
							c.tau
						)}, the lowest of the 150 pairs: society averages run only from {score(c.range[0])} to
						{score(c.range[1])}.
					</p>
				{:else}
					<p>
						{headline(CELLS[c.cell])} divides societies most: disagreement is {spread(c.tau)}, the
						highest of the 150 pairs. On average respondents judged it {responseLabel(c.mean)} ({score(
							c.mean
						)}), but society averages run from {score(c.range[0])} to {score(c.range[1])}.
					</p>
				{/if}
				<p><a href={cellHref(c.cell)}>See every society for this pair</a></p>
			{/snippet}
			{#snippet figure()}
				<ChartFrame
					id="story-{id}"
					title="{headline(CELLS[c.cell])}, society by society"
					summary="Each shape is one society's average answer; they run from {score(
						c.range[0]
					)} to {score(c.range[1])}, around a global mean of {score(c.mean)}."
					about={resolve('method/#disagreement')}
				>
					{#snippet chart()}
						<div class="reserve swarm">
							{#if d}
								<Beeswarm
									drill={d}
									uncertainty={false}
									selected={null}
									{hovered}
									onhover={(code) => (hovered = code)}
									onselect={(code) => goto(societyHref(code, vs))}
									label="Societies placed by their average answer to {phrase(CELLS[c.cell])}"
									describedBy="story-{id}-summary"
								/>
							{/if}
						</div>
					{/snippet}
					{#snippet table()}
						{#if d}
							<SocietyTable drill={d} caption="Each society's average answer, highest first" />
						{/if}
					{/snippet}
				</ChartFrame>
			{/snippet}
		</StoryStep>
	{/each}

	<StoryStep
		id="audience"
		index={indexOf('audience')}
		count={steps.length}
		title={STEP_TITLE.audience}
		previous={previous('audience')}
		next={next('audience')}
		oncurrent={markCurrent}
		onnear={markNear}
	>
		{#snippet text()}
			<p>
				Who is around matters too. Averaged over all societies, respondents judged {behaviorText.gerund.toLowerCase()}
				{responseLabel(n.audience.alone)} when alone ({score(n.audience.alone)}) but {responseLabel(
					n.audience.management
				)} in front of management or professors ({score(n.audience.management)}): a drop of {Math.abs(
					n.audience.effect
				).toFixed(1)}, the largest of the 15 behaviors.
			</p>
			<p>
				<a href={audiencesHref(BEHAVIORS[n.audience.behavior], vs)}>
					{behaviorText.label} in front of each audience
				</a>
			</p>
			<AudienceCredit />
		{/snippet}
		{#snippet figure()}
			<ChartFrame
				id="story-audience"
				title="{behaviorText.label}, by audience"
				summary="All societies: {score(n.audience.alone)} when alone and {score(
					n.audience.management
				)} in front of management or professors."
				about={resolve('method/#audiences')}
			>
				{#snippet chart()}
					<Slopegraph
						row={audience}
						actor={false}
						size="focus"
						label="{behaviorText.label} by audience, all societies"
						describedBy="story-audience-summary"
					/>
				{/snippet}
				{#snippet table()}
					<p>
						Alone {score(n.audience.alone)}; in front of management or professors {score(
							n.audience.management
						)}. The behavior's page has the full table.
					</p>
				{/snippet}
			</ChartFrame>
		{/snippet}
	</StoryStep>

	{#if CHANGE_MODULE && n.change}
		<StoryChange
			numbers={n.change}
			index={indexOf('change')}
			count={steps.length}
			near={!!near.change}
			previous={previous('change')!}
			next={next('change')!}
			oncurrent={markCurrent}
			onnear={markNear}
		/>
	{/if}

	<StoryStep
		id="explore"
		index={indexOf('explore')}
		count={steps.length}
		title={STEP_TITLE.explore}
		previous={previous('explore')}
		oncurrent={markCurrent}
		onnear={markNear}
	>
		{#snippet text()}
			<p>The atlas has much more: every behavior in every situation, for every society.</p>
			<ul class="links">
				<li><a href={atlas}>The matrix of 15 behaviors in 10 situations</a></li>
				<li>
					<a href={cellHref(n.dependent.cell)}
						>{headline(CELLS[n.dependent.cell])}, society by society</a
					>
				</li>
				<li>
					<a href={societyHref(vs.society, vs)}>
						{vs.society ? 'Your society’s fingerprint' : 'Each society’s fingerprint'}
					</a>
				</li>
				<li><a href={audiencesHref(null, vs)}>Who's watching: all 15 behaviors by audience</a></li>
				{#if CHANGE_MODULE}
					<li><a href={changeHref(vs.society, vs, false)}>Two surveys, 20 years apart</a></li>
				{/if}
				<li><a href={resolve('method/')}>How the numbers are made</a></li>
			</ul>
		{/snippet}
	</StoryStep>
</div>

<style>
	.story {
		max-width: var(--page);
		margin: 0 auto;
		padding: 1.25rem var(--gutter) 0;
	}

	.lede {
		max-width: var(--measure);
		font-size: var(--text-lg);
	}

	/* The step bar stays in view (FR-65). */
	.progress {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 1rem;
		margin: 0 calc(-1 * var(--gutter));
		padding: 0.5rem var(--gutter);
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}

	.where {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.dots {
		display: flex;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.dots button {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}

	.dot {
		width: 0.75rem;
		height: 0.75rem;
		border: 2px solid var(--text);
		border-radius: 50%;
	}

	/* The current step: filled, as well as named in "Step 2 of 6". */
	.dots button[aria-current='step'] .dot {
		background: var(--text);
	}

	.skip {
		margin-left: auto;
		font-size: var(--text-sm);
	}

	.bars {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	.bars li {
		display: grid;
		grid-template-columns: minmax(0, 12rem) minmax(0, 1fr) 3rem;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
	}

	.bar-track {
		height: 1.25rem;
	}

	.bar {
		display: block;
		height: 100%;
		background: var(--text);
	}

	.bar-value {
		text-align: right;
	}

	.reserve.swarm {
		min-height: 14rem;
	}

	.links li {
		margin-bottom: 0.5rem;
	}
</style>
