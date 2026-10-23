<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SortSelect from '#lib/components/SortSelect.svelte';
	import { CHANGE_SORT_KEYS, type SortKey } from '#lib/data/derive.ts';
	import {
		arrowRows,
		changeOrder,
		changeTable,
		type ChangeRow,
		type ChangeTableRow,
		type ChangeView
	} from './change-model';
	import ChangeDetails from './ChangeDetails.svelte';
	import ChartFrame from './ChartFrame.svelte';
	import DataTable, { type Column } from './DataTable.svelte';
	import Dumbbell from './Dumbbell.svelte';

	interface Props {
		/** The pairs to draw, or undefined while the data loads. */
		view: ChangeView | undefined;
		/** On a society's page, the societies in both surveys, for the details. */
		reference?: ChangeView;
		title: string;
		summary: string;
		/** "the 26 societies in both surveys". */
		together: string;
		sort: SortKey;
		onsort: (sort: SortKey) => void;
		href: (cell: number) => ResolvedPathname;
	}

	let { view, reference, title, summary, together, sort, onsort, href }: Props = $props();

	const rows = $derived(view ? changeOrder(view.rows, sort) : []);
	const byIndex = (list: readonly ChangeRow[] | undefined, index: number | null) =>
		index === null ? undefined : list?.find((r) => r.index === index);

	// The details panel keeps the last pair previewed (FR-13).
	let preview: number | null = $state(null);
	const shown = $derived(byIndex(view?.rows, preview));

	const columns: Column<ChangeTableRow>[] = [
		{ header: 'Behavior', text: (r) => r.behavior, rowHeader: true },
		{ header: 'Situation', text: (r) => r.situation },
		{ header: '2000–2003', text: (r) => r.older },
		{ header: '2023–2024', text: (r) => r.newer },
		{ header: 'Difference', text: (r) => r.diff },
		{ header: '95% interval', text: (r) => r.interval },
		{ header: 'Beyond the interval', text: (r) => r.direction },
		{ header: 'Based on', text: (r) => r.n }
	];
</script>

<!-- FR-50: an arrow per pair from the 2000–2003 average to the 2023–2024 average (decision 69),
     with the details beside it from 1024 px (§6.2) and the values as a table (NFR-11). -->
<div class="layout">
	<div class="chart">
		<ChartFrame id="arrows" {title} {summary} about={resolve('method/#change')}>
			{#snippet controls()}
				<SortSelect keys={CHANGE_SORT_KEYS} value={sort} onchange={onsort} />
			{/snippet}
			{#snippet chart()}
				<div class="reserve">
					{#if view}
						<Dumbbell
							id="arrows"
							arrow
							rows={arrowRows(rows)}
							unpaired={view.missing}
							key={[
								{ label: '2000–2003 survey', mark: 'ring' },
								{ label: '2023–2024 survey (GSN)', mark: 'dot' },
								{ label: 'From 2000–2003 to 2023–2024', mark: 'arrow' }
							]}
							label="{title}, {sort === 'difference'
								? 'largest difference first'
								: sort === 'name'
									? 'by name'
									: 'in paper order'}"
							showFirst={sort === 'difference'
								? 'Show the 25 largest differences'
								: 'Show the first 25 pairs'}
							showAll="Show all {view.rows.length} pairs"
							unpairedLabel={view.missing.length === 1 ? 'pair not shown' : 'pairs not shown'}
							note="Blue arrows and ▲: judged more appropriate in 2023–2024, beyond the 95% interval of the difference. Orange and ▼: less appropriate. Grey: within the interval. A dashed ring marks a small sample (10 to 29)."
							{href}
							onpreview={(cell) => (preview = cell)}
						/>
					{/if}
				</div>
			{/snippet}
			{#snippet table()}
				{#if view}
					<DataTable
						caption="{title}, in the chart's order"
						rows={changeTable(rows)}
						{columns}
						key={(r) => r.key}
					/>
				{/if}
			{/snippet}
		</ChartFrame>
	</div>

	<aside class="panel" aria-labelledby="change-details-title">
		<h2 id="change-details-title">Details</h2>
		{#if shown}
			<ChangeDetails row={shown} reference={byIndex(reference?.rows, preview)} {together} />
			<p class="open"><a href={href(shown.index)}>See every society for this pair</a></p>
		{:else}
			<p>
				Point at a pair, or move to its name with the Tab key, to see both surveys' values. Select
				it to see every society for that pair.
			</p>
		{/if}
	</aside>
</div>

<style>
	.layout {
		display: grid;
		gap: 2rem;
	}

	.chart {
		min-width: 0;
	}

	/* Space for the key, the axis, 25 rows and the button, so nothing below moves when the
	   chart arrives (NFR-2). Rows carry a line of values below 1024 px. */
	.reserve {
		min-height: 138rem;
	}

	@media (min-width: 640px) {
		.reserve {
			min-height: 104rem;
		}
	}

	@media (min-width: 1024px) {
		.reserve {
			min-height: 70rem;
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

	/* Below 1024 px each row lists its values, so the panel is not needed (decision 69). */
	.panel {
		display: none;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-muted);
	}

	@media (min-width: 1024px) {
		.panel {
			display: block;
		}
	}

	.panel h2 {
		font-size: var(--text-md);
		color: var(--text-muted);
	}

	.open {
		margin: 1rem 0 0;
	}
</style>
