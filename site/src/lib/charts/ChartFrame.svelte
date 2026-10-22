<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';

	interface Props {
		id: string;
		title: string;
		/** NFR-11: the chart in one sentence. */
		summary: string;
		/** FR-7: the method note behind the chart. */
		about: ResolvedPathname;
		/** Controls shown next to the title, such as a sort menu. */
		controls?: Snippet;
		legend?: Snippet;
		chart: Snippet;
		/** NFR-11: the same values as an accessible table. */
		table: Snippet;
	}

	let { id, title, summary, about, controls, legend, chart, table }: Props = $props();

	let showTable = $state(false);
</script>

<section class="chart-frame" aria-labelledby="{id}-title">
	<div class="head">
		<h2 id="{id}-title">{title}</h2>
		<div class="tools">
			{@render controls?.()}
			<button
				type="button"
				class="button"
				aria-expanded={showTable}
				aria-controls="{id}-table"
				onclick={() => (showTable = !showTable)}
			>
				{showTable ? 'Show as chart' : 'Show as table'}
			</button>
			<a class="about" href={about}>About this chart</a>
		</div>
	</div>
	<p class="summary" id="{id}-summary">{summary}</p>
	{@render legend?.()}
	<div class="body needs-js" hidden={showTable}>
		{@render chart()}
	</div>
	<div id="{id}-table" class="table-wrap" hidden={!showTable}>
		{#if showTable}
			{@render table()}
		{/if}
	</div>
</section>

<style>
	.chart-frame {
		min-width: 0;
		/* Charts size their marks from the frame's width (cqi units). */
		container-type: inline-size;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	h2 {
		font-size: var(--text-lg);
		margin: 0;
	}

	.tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
	}

	.about {
		font-size: var(--text-sm);
	}

	.summary {
		margin: 0.5rem 0 0.75rem;
		max-width: var(--measure);
		color: var(--text-muted);
	}

	.table-wrap {
		max-width: 100%;
		overflow-x: auto;
	}
</style>
