<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import CellDetails from '#lib/charts/CellDetails.svelte';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import Matrix from '#lib/charts/Matrix.svelte';
	import MatrixLegend from '#lib/charts/MatrixLegend.svelte';
	import MatrixList from '#lib/charts/MatrixList.svelte';
	import MatrixTable from '#lib/charts/MatrixTable.svelte';
	import { centeringShift, matrixCells, type SelectedSociety } from '#lib/charts/matrix-model.ts';
	import LoadError from '#lib/components/LoadError.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SHARE_ALT } from '#lib/share.ts';
	import SortSelect from '#lib/components/SortSelect.svelte';
	import { spread } from '#lib/data/format.ts';
	import { SORT_KEYS, listOrder, matrixOrder, matrixSummary } from '#lib/data/derive.ts';
	import { BEHAVIORS, CELLS, CELL_COUNT, SITUATIONS, cellParams } from '#lib/data/grid.ts';
	import { loadCells, loadGlobal, loadSocieties, preload } from '#lib/data/load.ts';
	import { SAMPLES } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import { setView, societyHref, view, withView } from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const vs = $derived(view.state);
	// The URL's sample applies once the app has mounted (decision 31); loading waits for it, so
	// ?sample= never fetches All data's file first (decision 96).
	const global = new Resource(() => (view.ready ? loadGlobal(view.state.sample) : undefined));
	const societies = new Resource(() => loadSocieties());
	// FR-15: the society–cell file loads only once a society is selected (NFR-3).
	const cellsFile = new Resource(() =>
		view.ready && view.state.society ? loadCells(view.state.sample) : undefined
	);

	const cells = $derived(cellsFile.current?.sample === vs.sample ? cellsFile.current : undefined);
	const society: SelectedSociety | undefined = $derived.by(() => {
		const found = societies.current?.get(vs.society);
		if (!found || !societies.current) return undefined;
		return {
			code: found.code,
			name: found.name,
			inSample: societies.current.inSample(found.code, vs.sample),
			index: cells?.indexOf(found.code)
		};
	});
	const societyReady = $derived(!society?.inSample || cells !== undefined);

	const model = $derived(
		global.current ? matrixCells(global.current, vs.scale, cells, society) : undefined
	);
	const order = $derived(
		global.current
			? matrixOrder(global.current, vs.scale, vs.sort)
			: { rows: BEHAVIORS.map((_, i) => i), columns: SITUATIONS.map((_, i) => i) }
	);
	const list = $derived(
		global.current ? listOrder(global.current, vs.scale, vs.sort) : CELLS.map((cell) => cell.index)
	);
	// Before the data arrives this is the prerendered All-data summary, which the default view
	// shows anyway (FR-87).
	const summary = $derived(global.current ? matrixSummary(global.current, vs.scale) : data.summary);
	const universal = $derived(model?.find((c) => c.universal));
	const dependent = $derived(model?.find((c) => c.dependent));

	// The details panel keeps the last cell previewed (FR-13).
	let shown: number | null = $state(null);

	function href(cell: number) {
		const { behavior, situation } = cellParams(CELLS[cell]);
		return withView(resolve(`explore/${behavior}/${situation}/`), vs, GLOBAL_KEYS);
	}

	function previewCell(cell: number | null) {
		if (cell === null) return;
		shown = cell;
		// The drill-down needs the society–cell file: start it before the click.
		preload(() => loadCells(vs.sample));
	}

	onMount(() => {
		// The other samples' global files are 3 KB each: fetch them while idle so a sample switch
		// redraws at once (NFR-4).
		const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 1500));
		idle(() => preload(...SAMPLES.map((s) => () => loadGlobal(s))));
	});
</script>

<Seo
	title="Explore 150 behaviors and situations"
	description="How appropriate are 15 everyday behaviors in 10 situations? The average judgment of respondents in 90 societies, and how much societies disagree, in one matrix."
	imageAlt="{SHARE_ALT.explore} {data.summary}"
/>

<div class="explore">
	<div class="intro">
		<h1>What is appropriate where?</h1>
		<!-- D-6, D-23: one short line; the legend says what the colour and the circle mean. -->
		<p class="lede">
			How respondents in {global.current?.societies(0) ?? 90} societies judged each pair of a behavior
			and a situation, and how much societies disagree. Select a pair to see every society.
		</p>
		<noscript>
			<p>
				The interactive matrix needs JavaScript. Every behavior and situation also has its own page
				with a summary.
			</p>
		</noscript>
	</div>

	{#if global.error}
		<LoadError error={global.error} retry={global.retry} />
	{/if}
	{#if cellsFile.error}
		<LoadError error={cellsFile.error} retry={cellsFile.retry} />
	{/if}

	<div class="layout">
		<ChartFrame
			id="matrix"
			title="Average judgment and disagreement, {CELL_COUNT} pairs"
			{summary}
			about={resolve('method/#global')}
			centered={vs.scale === 'centered'}
			scaled
		>
			{#snippet explain()}
				{@const shift = global.current ? centeringShift(global.current) : null}
				The global averages move by {shift === null
					? '…'
					: shift < 0.005
						? 'less than 0.01'
						: `${spread(shift)} at most`}, so the matrix barely changes; centering matters on a
				<a href={societyHref(vs.society, vs)}>society's fingerprint</a>.
			{/snippet}
			{#snippet controls()}
				<SortSelect keys={SORT_KEYS} value={vs.sort} onchange={(sort) => setView({ sort })} />
			{/snippet}
			{#snippet legend()}
				<MatrixLegend {universal} {dependent} {society} />
			{/snippet}
			{#snippet below()}
				<MatrixLegend {universal} {dependent} part="rings" />
			{/snippet}
			{#snippet chart()}
				<div class="grid-view">
					<Matrix
						cells={model}
						rows={order.rows}
						columns={order.columns}
						scale={vs.scale}
						{society}
						{societyReady}
						{href}
						onpreview={previewCell}
						describedBy="matrix-summary"
					/>
				</div>
				<div class="list-view">
					<MatrixList cells={model} order={list} scale={vs.scale} {society} {societyReady} {href} />
				</div>
			{/snippet}
			{#snippet table()}
				{#if model}
					<MatrixTable cells={model} order={list} scale={vs.scale} {society} />
				{/if}
			{/snippet}
		</ChartFrame>

		<aside class="panel" aria-labelledby="details-title">
			<h2 id="details-title">Details</h2>
			{#if model && shown !== null}
				<CellDetails cell={model[shown]} scale={vs.scale} {society} {societyReady} />
				<p class="open">
					<a href={href(shown)}>See every society for this pair</a>
				</p>
			{:else}
				<p>
					Point at a square, or move to it with the arrow keys, to see its numbers here. Select it
					to see every society.
				</p>
			{/if}
		</aside>
	</div>
</div>

<style>
	.explore {
		max-width: var(--page);
		margin: 0 auto;
		padding: 1.5rem var(--gutter) 0;
		/* Matrix cell size from the chart frame's width: row labels, ten columns and room for the
		   slanted labels (resolved where used, inside the frame's container). */
		--cell: clamp(2.25rem, (100cqi - 13rem - 22px) / 10, 4.5rem);
	}

	.intro {
		max-width: var(--measure);
	}

	.lede {
		font-size: var(--text-lg);
	}

	.layout {
		display: grid;
		gap: 2rem;
		margin-top: 1rem;
	}

	/* ≥ 1024 px: chart on the left, a 320 px details panel on the right (§6.2). */
	@media (min-width: 1024px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) var(--panel);
			align-items: start;
		}

		.panel {
			position: sticky;
			top: 1rem;
		}
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

	.list-view {
		display: none;
	}

	/* < 640 px: the matrix becomes a list and details open in a bottom sheet (FR-17, §6.2). */
	@media (max-width: 639.98px) {
		.explore {
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
