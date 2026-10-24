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
		/** Direction A: what the chart shows, as a finding (charts/titles.ts). */
		title: string;
		/** What is drawn and its unit, under the title. */
		subtitle?: string;
		/**
		 * The prerendered title, kept as an invisible sizer on a `?society=` link (app.html marks
		 * it before the first paint), so a society's shorter title does not pull the chart up.
		 */
		reserve?: string;
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
		/**
		 * D-23: on phones the key follows the chart instead of leading it, so a chart with a long
		 * key still starts on the first screen (the pair page's beeswarm).
		 */
		legendAfterOnPhones?: boolean;
		/** What centering does, said once per page on its first chart (CENTERING, or more). */
		explain?: string | Snippet;
		/**
		 * D-22: the summary, "Show as table" and the method note in one "About this chart"
		 * disclosure, as each step of the story has them.
		 */
		compact?: boolean;
	}

	let {
		id,
		title,
		subtitle,
		reserve,
		summary,
		about,
		controls,
		below,
		legend,
		chart,
		table,
		centered = false,
		scaled = false,
		explain,
		legendAfterOnPhones = false,
		compact = false
	}: Props = $props();

	let showTable = $state(false);
</script>

<section {id} class="chart-frame" aria-labelledby="{id}-title">
	<div class="head">
		<div class="titles">
			{#if reserve}
				<h2 id="{id}-title" class="stack">
					<span>{title}</span><span class="sizer" aria-hidden="true">{reserve}</span>
				</h2>
			{:else}
				<h2 id="{id}-title">{title}</h2>
			{/if}
			{#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
		</div>
		{#if controls}<div class="tools">{@render controls()}</div>{/if}
	</div>
	{#if centered || scaled}
		<!-- D-3: nothing else on the chart may show that the scale changed, so the chart says so,
		     as a second line of its subtitle (decision 119). -->
		<p class="scale-chip" class:pending={!centered} aria-hidden={centered ? undefined : 'true'}>
			<strong>Relative to each society's own average.</strong>
			{#if typeof explain === 'string'}{explain}{:else}{@render explain?.()}{/if}
			<button type="button" class="link-button" onclick={() => setView({ scale: 'raw' })}>
				Show as answered
			</button>
		</p>
	{/if}
	{#if legend}
		<div class="legend-wrap" class:after={legendAfterOnPhones}>{@render legend()}</div>
	{/if}
	<div class="body needs-js" hidden={showTable}>
		{@render chart()}
	</div>
	{#if legend && legendAfterOnPhones}
		<!-- The same key, shown here instead below 640 px; only one of the two is ever displayed. -->
		<div class="legend-under">{@render legend()}</div>
	{/if}
	<div id="{id}-table" class="table-wrap" hidden={!showTable}>
		{#if showTable}
			{@render table()}
		{/if}
	</div>
	{@render below?.()}
	<!-- D-23: what the chart says, its table and its method note come after it, so the chart starts
	     near the top of the screen; NFR-11 and FR-7 are unchanged. -->
	{#if compact}
		<details class="foot compact">
			<summary>About this chart</summary>
			<p class="summary" id="{id}-summary">{summary}</p>
			<div class="links">
				{@render tableToggle()}
				<a class="about" href={about}>How it is made</a>
			</div>
		</details>
	{:else}
		<div class="foot">
			<p class="summary" id="{id}-summary">{summary}</p>
			<div class="links">
				{@render tableToggle()}
				<a class="about" href={about}>About this chart</a>
			</div>
		</div>
	{/if}
</section>

{#snippet tableToggle()}
	<button
		type="button"
		class="button"
		aria-expanded={showTable}
		aria-controls="{id}-table"
		onclick={() => (showTable = !showTable)}
	>
		{showTable ? 'Show as chart' : 'Show as table'}
	</button>
{/snippet}

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

	/* NFR-2: the title and its sizer share one cell; the sizer counts only on a `?society=` link. */
	.stack {
		display: grid;
	}

	.stack > span {
		grid-area: 1 / 1;
	}

	.sizer {
		display: none;
		visibility: hidden;
	}

	:global(html[data-society]) .sizer {
		display: block;
	}

	.titles {
		min-width: 0;
		flex: 1 1 20rem;
	}

	.legend-under {
		display: none;
	}

	/* Phones: titles a step smaller, and a long key under its chart, so the chart starts on the
	   first screen (D-23). */
	@media (max-width: 639.98px) {
		h2 {
			font-size: var(--text-md);
		}

		.legend-wrap.after {
			display: none;
		}

		.legend-under {
			display: block;
			margin-top: 0.5rem;
		}
	}

	.subtitle {
		max-width: var(--measure);
		margin: 0.125rem 0 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
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
		margin: -0.25rem 0 0.5rem;
		font-size: var(--text-sm);
	}

	.foot {
		margin-top: 0.75rem;
	}

	.compact summary {
		width: fit-content;
		padding: 0.25rem 0;
		font-size: var(--text-sm);
		color: var(--link);
		cursor: pointer;
	}

	.compact[open] summary {
		margin-bottom: 0.5rem;
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
