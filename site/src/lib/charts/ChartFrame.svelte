<script lang="ts" module>
	/** D-3: what centering does, said on the first centered chart of a page. */
	export const CENTERING =
		"Each society's answers are shifted so their overall average matches the global one.";
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import { setView } from '#lib/state/view.svelte.ts';

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
		/** D-3, FR-5: the chart shows centered scores, so it says so beside its title. */
		centered?: boolean;
		/** What centering does, said once per page on its first chart (CENTERING, or more). */
		explain?: string | Snippet;
	}

	let {
		id,
		title,
		summary,
		about,
		controls,
		legend,
		chart,
		table,
		centered = false,
		explain
	}: Props = $props();

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
	{#if centered}
		<!-- D-3: nothing else on the chart may show that the scale changed, so the chart says so. -->
		<p class="scale-chip">
			<strong>Relative to each society's own average.</strong>
			{#if typeof explain === 'string'}{explain}{:else}{@render explain?.()}{/if}
			<button type="button" class="link-button" onclick={() => setView({ scale: 'raw' })}>
				Show as answered
			</button>
		</p>
	{/if}
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

	.scale-chip {
		max-width: var(--measure);
		margin: 0.5rem 0 0;
		padding: 0.375rem 0.75rem;
		border-left: 4px solid var(--border-strong);
		background: var(--surface-muted);
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
