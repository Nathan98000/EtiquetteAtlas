<script lang="ts">
	import { fill } from '#lib/charts/colors.ts';
	import { score } from '#lib/data/format.ts';
	import type { SlopeLine } from '../model';

	// The audiences' slopegraph (FR-40, decision 59), simplified: each behavior's average across
	// the three audiences for all societies, the largest and smallest drops in the text colour and
	// named, the others thin and muted.
	interface Props {
		columns: string[];
		lines: SlopeLine[];
	}

	let { columns, lines }: Props = $props();

	const WIDTH = 570;
	const HEIGHT = 360;
	const LEFT = 52;
	const STEP = 150;
	const TOP = 34;
	const BOTTOM = HEIGHT - 16;
	const y = (v: number) => TOP + ((2.5 - v) / 5) * (BOTTOM - TOP);
	const xs = $derived(columns.map((_, k) => LEFT + 10 + STEP * k));
	const path = (values: (number | null)[]) =>
		values
			.map((v, k) => (v === null ? '' : `${k === 0 ? 'M' : 'L'}${xs[k]},${y(v).toFixed(1)}`))
			.join('');
	const order = $derived([...lines].sort((a, b) => Number(a.highlight) - Number(b.highlight)));
</script>

<figure>
	<svg width={WIDTH} height={HEIGHT} viewBox="0 0 {WIDTH} {HEIGHT}" aria-hidden="true">
		{#each [-2, -1, 0, 1, 2] as tick (tick)}
			<line
				class:zero={tick === 0}
				class="grid"
				x1={LEFT}
				x2={xs[2] + 8}
				y1={y(tick)}
				y2={y(tick)}
			/>
			<text class="tick" x={LEFT - 8} y={y(tick)}>{score(tick, 0)}</text>
		{/each}
		{#each columns as label, k (label)}
			<text class="column" x={xs[k]} y={TOP - 18}>{label}</text>
		{/each}
		{#each order as line (line.label)}
			<path class:highlight={line.highlight} d={path(line.values)} />
			{#if line.highlight}
				{#each line.values as v, k (k)}
					{#if v !== null}
						<circle cx={xs[k]} cy={y(v)} r="6" fill={fill(v, 'light')} />
					{/if}
				{/each}
				<text class="label" x={xs[2] + 14} y={y(line.values[2] ?? 0)}>{line.label}</text>
			{/if}
		{/each}
	</svg>
	<p class="caption">
		Average judgment of each behavior, from −2.5 (extremely inappropriate) to +2.5 (extremely
		appropriate), all societies
	</p>
</figure>

<style>
	figure {
		margin: 0;
	}

	text {
		font-size: 15px;
		fill: var(--text);
		dominant-baseline: central;
	}

	.tick {
		text-anchor: end;
		fill: var(--text-muted);
		font-size: 14px;
	}

	.column {
		text-anchor: middle;
		font-weight: 700;
	}

	.caption {
		margin: 6px 0 0;
		max-width: 520px;
		font-size: 14px;
		color: var(--text-muted);
	}

	.grid {
		stroke: var(--border);
	}

	.grid.zero {
		stroke: var(--border-strong);
		stroke-width: 1.5;
	}

	path {
		fill: none;
		stroke: var(--border-strong);
		stroke-width: 1.5;
	}

	path.highlight {
		stroke: var(--text);
		stroke-width: 3.5;
	}

	circle {
		stroke: var(--text);
		stroke-width: 2;
	}

	.label {
		font-weight: 700;
	}
</style>
