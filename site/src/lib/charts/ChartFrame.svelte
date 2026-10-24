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
		/** Controls that act on the chart, shown right under it (D-5). */
		below?: Snippet;
		legend?: Snippet;
		chart: Snippet;
		/** NFR-11: the same values as an accessible table. */
		table: Snippet;
		/** D-3, FR-5: the chart shows centered scores, so it says so beside its title. */
		centered?: boolean;
		/**
		 * The chart follows the scale toggle: a page opened with `?scale=centered` holds its note's
		 * space from the first paint (app.html), before the URL applies (NFR-2).
		 */
		scaled?: boolean;
		/** What centering does, said once per page on its first chart (CENTERING, or more). */
		explain?: string | Snippet;
	}

	let {
		id,
		title,
		summary,
		about,
		controls,
		below,
		legend,
		chart,
		table,
		centered = false,
		scaled = false,
		explain
	}: Props = $props();

	let showTable = $state(false);
</script>

<section class="chart-frame" aria-labelledby="{id}-title">
	<div class="head">
		<h2 id="{id}-title">{title}</h2>
		{#if controls}<div class="tools">{@render controls()}</div>{/if}
	</div>
	{#if centered || scaled}
		<!-- D-3: nothing else on the chart may show that the scale changed, so the chart says so. -->
		<p class="scale-chip" class:pending={!centered} aria-hidden={centered ? undefined : 'true'}>
			<strong>Relative to each society's own average.</strong>
			{#if typeof explain === 'string'}{explain}{:else}{@render explain?.()}{/if}
			<button type="button" class="link-button" onclick={() => setView({ scale: 'raw' })}>
				Show as answered
			</button>
		</p>
	{/if}
	{@render legend?.()}
	<div class="body needs-js" hidden={showTable}>
		{@render chart()}
	</div>
	<div id="{id}-table" class="table-wrap" hidden={!showTable}>
		{#if showTable}
			{@render table()}
		{/if}
	</div>
	{@render below?.()}
	<!-- D-23: what the chart says, its table and its method note come after it, so the chart starts
	     near the top of the screen; NFR-11 and FR-7 are unchanged. -->
	<div class="foot">
		<p class="summary" id="{id}-summary">{summary}</p>
		<div class="links">
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
		margin-bottom: 0.5rem;
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

	.scale-chip.pending {
		display: none;
	}

	:global(html[data-centered]) .scale-chip.pending {
		display: block;
		visibility: hidden;
	}

	.scale-chip {
		max-width: var(--measure);
		margin: 0.5rem 0 0;
		padding: 0.375rem 0.75rem;
		border-left: 4px solid var(--border-strong);
		background: var(--surface-muted);
		font-size: var(--text-sm);
	}

	.foot {
		margin-top: 0.75rem;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
	}

	.summary {
		margin: 0 0 0.5rem;
		max-width: var(--measure);
		color: var(--text-muted);
	}

	.table-wrap {
		max-width: 100%;
		overflow-x: auto;
	}
</style>
