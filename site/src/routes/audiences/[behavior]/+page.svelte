<script lang="ts">
	import { resolve } from '$app/paths';
	import AudienceDetails from '#lib/charts/AudienceDetails.svelte';
	import {
		audienceRows,
		behaviorSummary,
		orderNote,
		readingOrder,
		slopeSummary,
		slopeTable,
		subjectOf,
		type AudienceScope,
		type SlopeTableRow
	} from '#lib/charts/audience-model.ts';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import DataTable, { type Column } from '#lib/charts/DataTable.svelte';
	import SeriesKey, { type KeyItem } from '#lib/charts/SeriesKey.svelte';
	import Slopegraph from '#lib/charts/Slopegraph.svelte';
	import AudienceCredit from '#lib/components/AudienceCredit.svelte';
	import AudienceFilters from '#lib/components/AudienceFilters.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ShareButton from '#lib/components/ShareButton.svelte';
	import StepLinks from '#lib/components/StepLinks.svelte';
	import { neighbours } from '#lib/data/derive.ts';
	import { BEHAVIOR_TEXT, BEHAVIORS } from '#lib/data/grid.ts';
	import { loadContexts, loadSocieties } from '#lib/data/load.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { audiencesHref, view } from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const vs = $derived(view.state);
	const behavior = $derived(data.behavior);
	const text = $derived(BEHAVIOR_TEXT[BEHAVIORS[behavior]]);

	// NFR-3: the contexts file loads on the audiences routes only.
	// The URL's sample applies once the app has mounted (decision 31); loading waits for it, so
	// ?sample= never fetches All data's file first (decision 96).
	const contexts = new Resource(() => (view.ready ? loadContexts(view.state.sample) : undefined));
	const societies = new Resource(() => loadSocieties());

	const file = $derived(contexts.current?.sample === vs.sample ? contexts.current : undefined);
	const society = $derived(societies.current?.get(vs.society));
	// A society is shown once both files say where it is; until then the view waits for them.
	const known = $derived(file !== undefined && (vs.society === null || societies.current));
	const index = $derived(society && file ? file.indexOf(society.code) : undefined);
	const outside = $derived(society !== undefined && file !== undefined && index === undefined);
	const scope: AudienceScope = $derived(
		society && index !== undefined && vs.scope !== 'global'
			? { kind: 'society', index, code: society.code, name: society.name }
			: { kind: 'global' }
	);
	const rows = $derived(file && known ? audienceRows(file, { scope, split: vs.split }) : undefined);
	const row = $derived(rows?.[behavior]);

	// Until the browser has the data, the prerendered All-data text stands in (FR-87, decision 61).
	const summary = $derived(
		rows && file
			? behaviorSummary(rows, behavior, subjectOf(scope, file.codes.length))
			: data.summary
	);
	const chartSummary = $derived(row ? slopeSummary(row, vs.actor) : data.chartSummary);
	const note = $derived(row ? orderNote(row) : null);

	const KEY: Record<string, KeyItem> = {
		main: { label: '', mark: 'dot', line: 'solid' },
		reference: { label: 'All societies', mark: 'tick', line: 'dashed' },
		women: { label: 'Women respondents', mark: 'dot', line: 'solid' },
		men: { label: 'Men respondents', mark: 'square', line: 'long-dash' }
	};
	const key = $derived(
		row
			? readingOrder(row.series).map((s) => ({ ...KEY[s.kind], label: s.label }))
			: [{ ...KEY.main, label: 'All societies' }]
	);

	// The details show the column previewed, else the one selected (FR-40).
	let preview: number | null = $state(null);
	let selected: number | null = $state(null);

	const { previous, next } = $derived(neighbours(behavior, BEHAVIORS.length));
	const step = (b: number) => ({
		href: audiencesHref(BEHAVIORS[b], vs),
		label: BEHAVIOR_TEXT[BEHAVIORS[b]].label
	});

	const columns: Column<SlopeTableRow>[] = [
		{ header: 'Who', text: (r) => r.series, rowHeader: true },
		{ header: 'Audience or actor', text: (r) => r.context },
		{ header: 'Score', text: (r) => r.value },
		{ header: '95% interval', text: (r) => r.interval },
		{ header: 'Respondents', text: (r) => r.respondents },
		{ header: 'Chose an appropriate answer', text: (r) => r.share }
	];
</script>

<Seo
	title={data.title}
	description="How respondents in 90 societies judged {text.gerund.toLowerCase()} when alone, in front of colleagues or classmates and in front of management or professors, and done by a woman or by a man."
/>

<div class="audience-page">
	<!-- D-28: Share at the right of the way back, so the title keeps its width. -->
	<div class="crumbs-row">
		<nav class="crumbs" aria-label="Breadcrumb">
			<a href={audiencesHref(null, vs)}>All 15 behaviors</a>
		</nav>
		<ShareButton />
	</div>
	<h1>{data.title}</h1>
	<!-- NFR-2: on a `?society=` link (marked before the first paint, app.html) the prerendered lede
	     stays as an invisible sizer, so a society's shorter sentence does not pull the chart up. -->
	<div class="lede-stack">
		<p class="lede">{summary}</p>
		<p class="sizer" aria-hidden="true">{data.summary}</p>
	</div>
	<noscript>
		<p>The slopegraph needs JavaScript.</p>
	</noscript>

	{#each [contexts, societies] as resource, i (i)}
		{#if resource.error}
			<LoadError error={resource.error} retry={resource.retry} />
		{/if}
	{/each}

	<div class="layout">
		<div class="chart">
			<ChartFrame
				id="slope"
				title="{text.label}, by audience"
				summary={chartSummary}
				about={resolve('method/#audiences')}
			>
				{#snippet legend()}
					<SeriesKey items={key} />
				{/snippet}
				<!-- D-23: who is shown and how to read the points come under the chart. -->
				{#snippet below()}
					<p class="key-note">
						Points are coloured by score, as on the matrix; a dashed outline marks a small sample
						(10 to 29 respondents).
					</p>
					<AudienceFilters {society} {outside} />
				{/snippet}
				{#snippet chart()}
					<Slopegraph
						{row}
						actor={vs.actor}
						size="focus"
						{selected}
						onpreview={(k) => (preview = k)}
						onselect={(k) => (selected = selected === k ? null : k)}
						label="{text.label} by audience{vs.actor ? ' and by who does it' : ''}"
						describedBy="slope-summary"
					/>
				{/snippet}
				{#snippet table()}
					{#if row}
						<DataTable
							caption="{text.label}: each line's score by audience{vs.actor
								? ' and by who does it'
								: ''}"
							rows={slopeTable(row, vs.actor)}
							{columns}
							key={(r) => r.key}
						/>
					{/if}
				{/snippet}
			</ChartFrame>
			{#if note}
				<p class="order-note">{note}</p>
			{/if}
		</div>

		<aside class="panel" aria-labelledby="details-title">
			<h2 id="details-title">Details</h2>
			<AudienceDetails {row} context={preview ?? selected} actor={vs.actor} />
		</aside>
	</div>

	<!-- Previous and next behaviors in the SRS order, wrapping at the ends (decision 57). -->
	<StepLinks label="Other behaviors" previous={step(previous)} next={step(next)} />

	<AudienceCredit />
</div>

<style>
	.audience-page {
		max-width: var(--page);
		margin: 0 auto;
		padding: 1.25rem var(--gutter) 0;
	}

	.crumbs {
		margin-bottom: 0.5rem;
		font-size: var(--text-sm);
	}

	.crumbs a::before {
		content: '← ';
	}

	.lede,
	.sizer {
		max-width: var(--measure);
		font-size: var(--text-lg);
	}

	.lede-stack {
		display: grid;
	}

	.lede-stack > p {
		grid-area: 1 / 1;
	}

	.sizer {
		display: none;
		visibility: hidden;
	}

	:global(html[data-society]) .sizer {
		display: block;
	}

	.layout {
		display: grid;
		gap: 2rem;
	}

	/* ≥ 1024 px: the chart on the left, a 320 px details panel on the right; below, the panel
	   follows the chart, as on the drill-down (§6.2, decision 62). */
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

	.chart {
		min-width: 0;
	}

	.key-note {
		max-width: var(--measure);
		margin: 0.75rem 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.order-note {
		max-width: var(--measure);
		margin: 1rem 0 0;
		padding: 0.75rem 1rem;
		border-left: 3px solid var(--border-strong);
		background: var(--surface-muted);
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
</style>
