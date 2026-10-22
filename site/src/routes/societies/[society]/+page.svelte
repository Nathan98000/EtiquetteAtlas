<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import CompareTable from '#lib/charts/CompareTable.svelte';
	import { comparison, comparisonSummary, pairWho } from '#lib/charts/compare-model.ts';
	import Fingerprint from '#lib/charts/Fingerprint.svelte';
	import FingerprintDetails from '#lib/charts/FingerprintDetails.svelte';
	import FingerprintLegend from '#lib/charts/FingerprintLegend.svelte';
	import FingerprintList from '#lib/charts/FingerprintList.svelte';
	import FingerprintTable from '#lib/charts/FingerprintTable.svelte';
	import {
		fingerprintCells,
		fingerprintChartSummary,
		fingerprintCounts,
		fingerprintListOrder,
		fingerprintOrder,
		fingerprintSummary
	} from '#lib/charts/fingerprint-model.ts';
	import FactsPanel from '#lib/components/FactsPanel.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import SortSelect from '#lib/components/SortSelect.svelte';
	import SimilarList from '#lib/components/SimilarList.svelte';
	import SocietyPicker from '#lib/components/SocietyPicker.svelte';
	import { FINGERPRINT_SORT_KEYS } from '#lib/data/derive.ts';
	import { place, respondentsIn } from '#lib/data/format.ts';
	import { BEHAVIORS, CELLS, CELL_COUNT, SITUATIONS, cellParams } from '#lib/data/grid.ts';
	import { loadCells, loadGlobal, loadSimilarity, loadSocieties, preload } from '#lib/data/load.ts';
	import { SAMPLE_LABEL, SAMPLES } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { factsView, similarView } from '#lib/data/society.ts';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import { fingerprintHref, setView, societyHref, view, withView } from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const vs = $derived(view.state);
	const code = $derived(data.code);
	const who = $derived(respondentsIn(data.code, data.name));
	const title = $derived(who[0].toUpperCase() + who.slice(1));

	const global = new Resource(() => loadGlobal(view.state.sample));
	const cellsFile = new Resource(() => loadCells(view.state.sample));
	const similarityFile = new Resource(() => loadSimilarity(view.state.sample));
	const societies = new Resource(() => loadSocieties());

	// Use the sample's files together only once all are for the same sample.
	const files = $derived(
		global.current &&
			cellsFile.current &&
			global.current.sample === vs.sample &&
			cellsFile.current.sample === vs.sample
			? { global: global.current, cells: cellsFile.current }
			: undefined
	);
	const similarity = $derived(
		similarityFile.current?.sample === vs.sample ? similarityFile.current : undefined
	);
	const index = $derived(files?.cells.indexOf(code));
	// §4.4: not in the active sample (decision 53); unknown until the files arrive.
	const outside = $derived(files !== undefined && index === undefined);
	const model = $derived(
		files && index !== undefined
			? fingerprintCells(files.global, files.cells, index, vs.scale)
			: undefined
	);
	const counts = $derived(model ? fingerprintCounts(model) : undefined);
	// Until the browser has the data, the prerendered All-data values stand in, as the default
	// view shows them anyway (FR-87, decision 51).
	const fromBuild = $derived(vs.sample === 'all');
	const empty = $derived(counts ? counts.shown === 0 : !files && fromBuild && data.empty);

	const similar = $derived(
		similarity && societies.current
			? similarView(similarity, societies.current, code)
			: fromBuild
				? data.similar
				: undefined
	);
	const facts = $derived(
		societies.current
			? (factsView(societies.current, code, vs.sample) ?? undefined)
			: fromBuild
				? data.facts
				: undefined
	);

	const outsideText = $derived(`${title} are not in this sample (${SAMPLE_LABEL[vs.sample]}).`);
	const summary = $derived.by(() => {
		if (outside) return outsideText;
		if (!counts || !similar || !similarity) return data.summary;
		const closest = similar[0] ? respondentsIn(similar[0].code, similar[0].name) : null;
		return fingerprintSummary(who, counts, vs.scale, closest);
	});
	const chartSummary = $derived(
		outside
			? outsideText
			: model
				? fingerprintChartSummary(who, model, vs.scale)
				: data.chartSummary
	);

	const order = $derived(
		global.current
			? fingerprintOrder(global.current, vs.scale, vs.sort, model)
			: { rows: BEHAVIORS.map((_, i) => i), columns: SITUATIONS.map((_, i) => i) }
	);
	const list = $derived(
		global.current
			? fingerprintListOrder(global.current, vs.scale, vs.sort, model)
			: CELLS.map((cell) => cell.index)
	);

	// The details panel keeps the last cell previewed (FR-13).
	let shown: number | null = $state(null);

	function href(cell: number) {
		const { behavior, situation } = cellParams(CELLS[cell]);
		return withView(resolve(`explore/${behavior}/${situation}/`), vs, GLOBAL_KEYS);
	}

	const otherHref = (other: string) => societyHref(other, vs);
	// FR-33: the similar society's "Compare" opens the comparison on this page.
	const compareHref = (other: string) =>
		`${fingerprintHref({ ...vs, compare: other })}#compare` as ResolvedPathname;

	function previewCell(cell: number | null) {
		if (cell !== null) shown = cell;
	}

	// FR-33: the society compared with, when the URL names another known society (decision 49).
	const other = $derived(
		vs.compare && vs.compare !== code ? societies.current?.get(vs.compare) : undefined
	);
	const otherIndex = $derived(other ? files?.cells.indexOf(other.code) : undefined);
	const names = $derived<[string, string]>([
		place(data.code, data.name),
		other ? place(other.code, other.name) : ''
	]);
	const pair = $derived(pairWho(names[0], names[1]));
	const result = $derived(
		files && index !== undefined && otherIndex !== undefined
			? comparison(files.global, files.cells, index, otherIndex, vs.scale, names)
			: undefined
	);
	// NFR-3: the dumbbell's code loads only when there is something to compare.
	let dumbbell: Promise<typeof import('#lib/charts/Dumbbell.svelte')> | undefined = $state();
	$effect(() => {
		if (other) dumbbell ??= import('#lib/charts/Dumbbell.svelte');
	});

	onMount(() => {
		// The other samples' global and similarity files are about 9 KB in all: fetch them while
		// idle so a sample switch only waits for the cells file (NFR-4).
		const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 1500));
		idle(() => preload(...SAMPLES.flatMap((s) => [() => loadGlobal(s), () => loadSimilarity(s)])));
	});
</script>

<Seo
	{title}
	description="Where {who} judged 15 everyday behaviors in 10 situations more or less appropriate than the global average, whose answers were most alike, and who took part."
/>

<div class="society-page">
	<nav class="crumbs" aria-label="Breadcrumb">
		<a href={societyHref(null, vs)}>All societies</a>
	</nav>
	<h1>{title}</h1>
	<p class="lede">{summary}</p>
	<noscript>
		<p>The fingerprint chart needs JavaScript.</p>
	</noscript>

	{#each [global, cellsFile, similarityFile, societies] as resource, i (i)}
		{#if resource.error}
			<LoadError error={resource.error} retry={resource.retry} />
		{/if}
	{/each}

	<!-- Facts and similar societies come first, so a phone's 150-row list does not bury them
	     (decision 54). -->
	<div class="cards">
		<FactsPanel {facts} />
		<SimilarList
			{similar}
			empty={outside ? 'not-in-sample' : 'no-pairs'}
			href={otherHref}
			{compareHref}
		/>
	</div>

	<div class="layout">
		<ChartFrame
			id="fingerprint"
			title="Compared with the global average, {CELL_COUNT} pairs"
			summary={chartSummary}
			about={resolve('method/#fingerprint')}
		>
			{#snippet controls()}
				<SortSelect
					keys={FINGERPRINT_SORT_KEYS}
					value={vs.sort}
					onchange={(sort) => setView({ sort })}
				/>
			{/snippet}
			{#snippet legend()}
				{#if !empty && !outside}<FingerprintLegend {counts} />{/if}
			{/snippet}
			{#snippet chart()}
				{#if outside}
					<div class="notice">
						<p>{outsideText}</p>
						<button type="button" class="button" onclick={() => setView({ sample: 'all' })}>
							Show All data
						</button>
					</div>
				{:else if empty}
					<!-- Decision 53: nothing to draw. -->
					<p class="notice">
						Every pair was rated by fewer than 10 {who}, so no difference can be shown. Their facts
						are above.
					</p>
				{:else}
					<div class="grid-view">
						<Fingerprint
							cells={model}
							rows={order.rows}
							columns={order.columns}
							scale={vs.scale}
							{who}
							{href}
							onpreview={previewCell}
							describedBy="fingerprint-summary"
						/>
					</div>
					<div class="list-view">
						<FingerprintList cells={model} order={list} scale={vs.scale} {who} {href} />
					</div>
				{/if}
			{/snippet}
			{#snippet table()}
				{#if model}
					<FingerprintTable cells={model} order={list} scale={vs.scale} {who} />
				{:else}
					<p>{outside ? outsideText : 'No values to show.'}</p>
				{/if}
			{/snippet}
		</ChartFrame>

		<aside class="panel" aria-labelledby="details-title">
			<h2 id="details-title">Details</h2>
			{#if model && shown !== null}
				<FingerprintDetails cell={model[shown]} scale={vs.scale} {who} />
				<p class="open">
					<a href={href(shown)}>See every society for this pair</a>
				</p>
			{:else}
				<p>
					Point at a square, or move to it with the arrow keys, to see how {who} compare with the global
					average. Select it to see every society for that pair.
				</p>
			{/if}
		</aside>
	</div>

	<!-- The same society in the audiences module (decision 57). -->
	<p class="more-link">
		<a href={withView(resolve('audiences/'), vs, GLOBAL_KEYS)}>
			How {who} judged the 15 behaviors alone and in front of others
		</a>
	</p>

	<!-- FR-33: compare mode, two societies cell by cell (decision 49). -->
	<section id="compare" class="compare needs-js" aria-labelledby="compare-title">
		<h2 id="compare-title">Compare with another society</h2>
		<p class="hint">
			Both societies' estimates{vs.scale === 'centered' ? ', centered,' : ''} for every pair they can
			both show, largest gaps first.
		</p>
		<div class="compare-picker">
			<SocietyPicker
				societies={societies.current}
				selected={other?.code ?? null}
				sample={vs.sample}
				exclude={code}
				label="Compare with"
				clearLabel="Stop comparing"
				onselect={(c) => setView({ compare: c })}
			/>
		</div>
		{#if other && !outside}
			{#if files && otherIndex === undefined}
				<p class="notice">
					Respondents in {names[1]} are not in this sample ({SAMPLE_LABEL[vs.sample]}).
				</p>
			{:else}
				<ChartFrame
					id="dumbbell"
					title="Respondents in {names[0]} and in {names[1]}, pair by pair"
					summary={result ? comparisonSummary(pair, result, vs.scale) : 'Loading the comparison…'}
					about={resolve('method/#compare')}
				>
					{#snippet chart()}
						{#if result && dumbbell}
							{#await dumbbell}
								<p class="muted">Loading…</p>
							{:then { default: Dumbbell }}
								<Dumbbell comparison={result} {names} {href} />
							{:catch error}
								<LoadError
									{error}
									retry={() => (dumbbell = import('#lib/charts/Dumbbell.svelte'))}
								/>
							{/await}
						{/if}
					{/snippet}
					{#snippet table()}
						{#if result}
							<CompareTable
								comparison={result}
								{names}
								caption="Respondents in {names[0]} and in {names[1]}{vs.scale === 'centered'
									? ', centered'
									: ''}, largest gap first"
							/>
						{/if}
					{/snippet}
				</ChartFrame>
			{/if}
		{/if}
	</section>
</div>

<style>
	.society-page {
		max-width: var(--page);
		margin: 0 auto;
		padding: 1.25rem var(--gutter) 0;
		/* Grid cell size from the chart frame's width, as on /explore (resolved inside the
		   frame's container). */
		--cell: clamp(2.25rem, (100cqi - 13rem - 22px) / 10, 4.5rem);
	}

	.crumbs {
		margin-bottom: 0.5rem;
		font-size: var(--text-sm);
	}

	.crumbs a::before {
		content: '← ';
	}

	.lede {
		max-width: var(--measure);
		font-size: var(--text-lg);
	}

	.cards {
		display: grid;
		gap: 1rem;
		margin: 1.5rem 0 2rem;
	}

	/* ≥ 1024 px: facts and similar societies side by side; the chart on the left with a 320 px
	   details panel on the right (§6.2). */
	@media (min-width: 1024px) {
		.cards {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}

		.layout {
			grid-template-columns: minmax(0, 1fr) var(--panel);
			align-items: start;
		}

		.panel {
			position: sticky;
			top: 1rem;
		}
	}

	.layout {
		display: grid;
		gap: 2rem;
	}

	.panel {
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-muted);
	}

	.panel h2 {
		font-size: var(--text-md);
		color: var(--text-muted);
	}

	.open {
		margin: 1rem 0 0;
	}

	.notice {
		max-width: var(--measure);
		padding: 1rem;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
	}

	.notice p {
		margin-top: 0;
	}

	.more-link {
		margin: 1.5rem 0 0;
	}

	.more-link a::after {
		content: ' →';
	}

	.compare {
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
		scroll-margin-top: 1rem;
	}

	.compare h2 {
		font-size: var(--text-xl);
		margin: 0;
	}

	.hint {
		max-width: var(--measure);
		color: var(--text-muted);
	}

	.compare-picker {
		display: flex;
		margin-bottom: 1.5rem;
	}

	.muted {
		color: var(--text-muted);
	}

	.list-view {
		display: none;
	}

	/* < 640 px: the grid becomes a list and details open in a bottom sheet (FR-17, §6.2). */
	@media (max-width: 639.98px) {
		.society-page {
			--cell: 2.25rem;
		}

		.grid-view,
		.panel {
			display: none;
		}

		.list-view {
			display: block;
		}
	}
</style>
