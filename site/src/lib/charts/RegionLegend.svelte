<script lang="ts">
	import { REGIONS } from '#lib/data/model.ts';
	import { DIVERGING, REGION_SHAPE, regionStyle } from './colors';
	import { symbolPath } from './symbols';

	interface Props {
		/** The beeswarm colours dots by region; the map colours them by the estimate. */
		mode: 'region' | 'estimate';
	}

	let { mode }: Props = $props();

	const ramp = (stops: readonly string[]) => `linear-gradient(to right, ${stops.join(', ')})`;
	const style = `--ramp-light: ${ramp(DIVERGING.light)}; --ramp-dark: ${ramp(DIVERGING.dark)}`;
</script>

<div class="legend" {style}>
	<ul class="regions" aria-label="Regions (the GSN authors' grouping)">
		{#each REGIONS as region (region)}
			<li>
				<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
					<path
						class={mode === 'region' ? 'region' : 'plain'}
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
		{#if mode === 'region'}
			<li>
				<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
					<path class="hollow" d={symbolPath('circle', 5)} />
				</svg>
				Hollow: small sample (10–29 respondents)
			</li>
			<li><span class="band" aria-hidden="true"></span> Global mean ± disagreement</li>
		{:else}
			<li>
				<span class="ramp" aria-hidden="true"></span>
				Fill: the society's estimate, from inappropriate to appropriate
			</li>
			<li>
				<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
					<path class="dashed" d={symbolPath('circle', 5)} />
				</svg>
				Dashed outline: small sample
			</li>
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

	path.region {
		fill: var(--region);
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
