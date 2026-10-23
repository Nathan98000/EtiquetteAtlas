<script lang="ts">
	import { REGION_COLOR, REGION_SHAPE } from '#lib/charts/colors.ts';
	import { symbolPath } from '#lib/charts/symbols.ts';
	import { REGIONS } from '#lib/data/model.ts';
	import type { MapDot } from '../model';

	// The dot map (FR-24, decision 36), simplified: each society at its GSN coordinates, coloured
	// and shaped by the GSN authors' four regions (§6.4), on Natural Earth's land.
	interface Props {
		land: string;
		width: number;
		height: number;
		dots: MapDot[];
	}

	let { land, width, height, dots }: Props = $props();

	const R = 5.5;
	const shapes = Object.fromEntries(REGIONS.map((r) => [r, symbolPath(REGION_SHAPE[r], R)]));
	const legendShapes = Object.fromEntries(REGIONS.map((r) => [r, symbolPath(REGION_SHAPE[r], 6)]));
</script>

<figure>
	<svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
		<path class="land" d={land} />
		{#each dots as dot, i (i)}
			<path
				class="dot"
				d={shapes[dot.region]}
				transform="translate({dot.x.toFixed(1)},{dot.y.toFixed(1)})"
				fill={REGION_COLOR.light[dot.region]}
			/>
		{/each}
	</svg>
	<figcaption>
		{#each REGIONS as region (region)}
			<span>
				<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"
					><path d={legendShapes[region]} fill={REGION_COLOR.light[region]} /></svg
				>
				{region}
			</span>
		{/each}
	</figcaption>
</figure>

<style>
	figure {
		margin: 0;
	}

	.land {
		fill: var(--land);
	}

	.dot {
		stroke: var(--surface);
		stroke-width: 1;
	}

	figcaption {
		display: flex;
		gap: 22px;
		margin-top: 10px;
		font-size: 15px;
		color: var(--text);
	}

	figcaption span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
</style>
