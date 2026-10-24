<script lang="ts">
	import { REGIONS } from '#lib/data/model.ts';
	import { DIVERGING, REGION_SHAPE, regionStyle } from './colors';
	import { symbolPath } from './symbols';

	interface Props {
		/**
		 * D-26: the beeswarm and the pair's map both fill dots by the estimate and shape them by
		 * region; the beeswarm's key adds its band. The societies index's map colours its dots by
		 * region, as it shows no estimate (D-31).
		 */
		mode: 'region' | 'estimate' | 'place';
		/** On the index's map: the sample leaves some societies out, drawn as outlines. */
		outside?: boolean;
	}

	let { mode, outside = false }: Props = $props();

	const ramp = (stops: readonly string[]) => `linear-gradient(to right, ${stops.join(', ')})`;
	const style = `--ramp-light: ${ramp(DIVERGING.light)}; --ramp-dark: ${ramp(DIVERGING.dark)}`;
</script>

<div class="legend" {style}>
	<ul class="regions" aria-label="Regions (the GSN authors' grouping)">
		{#each REGIONS as region (region)}
			<li>
				<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
					<path
						class={mode === 'place' ? 'region' : 'plain'}
						style={regionStyle(region)}
						d={symbolPath(REGION_SHAPE[region], 5)}
					/>
				</svg>
				{region}
			</li>
		{/each}
		<li class="muted">(the GSN authors' regions)</li>
	</ul>
	<ul class="keys">
		{#if mode === 'place'}
			<!-- A `?sample=` link holds this key's place from the first paint (app.html, NFR-2). -->
			<li class="outside-key" class:shown={outside}>
				<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
					<path class="hollow" d={symbolPath('circle', 5)} />
				</svg>
				Outlined: not in this sample
			</li>
		{:else}
			<li>
				<span class="ramp" aria-hidden="true"></span>
				Fill: average answer
			</li>
			<li>
				<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
					<path class="dashed" d={symbolPath('circle', 5)} />
				</svg>
				Dashed: small sample (10–29)
			</li>
			{#if mode === 'region'}
				<li><span class="band" aria-hidden="true"></span> Where most societies fall</li>
			{/if}
		{/if}
	</ul>
</div>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 2rem;
		margin-bottom: 0.5rem;
		font-size: var(--text-sm);
		--ramp: var(--ramp-light);
	}

	:global(:root[data-theme='dark']) .legend {
		--ramp: var(--ramp-dark);
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .legend {
			--ramp: var(--ramp-dark);
		}
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.muted {
		color: var(--text-muted);
	}

	/* Phones: one wrapping list, so the key takes fewer lines above the chart (D-23). */
	@media (max-width: 639.98px) {
		.legend {
			gap: 0.25rem 1rem;
		}

		ul {
			display: contents;
		}
	}

	path.region {
		fill: var(--region);
	}

	.outside-key {
		display: none;
	}

	.outside-key.shown,
	:global(html[data-sample]) .outside-key {
		display: inline-flex;
	}

	path.plain {
		fill: var(--surface);
		stroke: var(--text);
	}

	path.hollow {
		fill: var(--surface);
		stroke: var(--text);
		stroke-width: 1.75;
	}

	path.dashed {
		fill: var(--surface);
		stroke: var(--text);
		stroke-dasharray: 2 1.5;
	}

	.band {
		display: inline-block;
		width: 1.5rem;
		height: 0.875rem;
		border: 1px dashed var(--border-strong);
		background: var(--surface-muted);
		box-shadow: inset 0.69rem 0 0 -0.6rem var(--text);
	}

	.ramp {
		display: inline-block;
		width: 4rem;
		height: 0.75rem;
		background: var(--ramp);
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}
</style>
