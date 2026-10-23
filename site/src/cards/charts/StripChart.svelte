<script lang="ts">
	import { DIRECTION_COLOR } from '#lib/charts/colors.ts';
	import type { StripRow } from '../model';

	// The change overview's behavior strip (FR-51, decision 73), simplified: each behavior's mean
	// difference between the surveys with its 95% interval on a fixed −1 to +1 axis, blue or orange
	// beyond the interval and grey within it (decision 69), with ▲ or ▼ after the signed value.
	interface Props {
		rows: StripRow[];
		caption: string;
	}

	let { rows, caption }: Props = $props();

	const WIDTH = 570;
	const LABEL = 168;
	const RIGHT = 74;
	const ROW = 28;
	const TOP = 30;
	const height = $derived(TOP + ROW * rows.length + 28);
	const x = (v: number) => LABEL + 14 + ((v + 1) / 2) * (WIDTH - LABEL - RIGHT - 28);
	const colors = DIRECTION_COLOR.light;
	const color = (d: StripRow['direction']) =>
		d === 1 ? colors.more : d === -1 ? colors.less : colors.within;
	const glyph = (d: StripRow['direction']) => (d === 1 ? '▲' : d === -1 ? '▼' : '');
</script>

<figure>
	<svg width={WIDTH} {height} viewBox="0 0 {WIDTH} {height}" aria-hidden="true">
		{#each [-1, -0.5, 0, 0.5, 1] as tick (tick)}
			<line
				class:zero={tick === 0}
				class="grid"
				x1={x(tick)}
				x2={x(tick)}
				y1={TOP - 4}
				y2={height - 24}
			/>
			<text class="tick" x={x(tick)} y={height - 10}
				>{tick > 0 ? '+' : tick < 0 ? '−' : ''}{Math.abs(tick)}</text
			>
		{/each}
		<text class="pole" x={x(0) - 8} y={TOP - 16} text-anchor="end">← Less appropriate</text>
		<text class="pole" x={x(0) + 8} y={TOP - 16}>More appropriate →</text>
		{#each rows as row, i (row.label)}
			{@const cy = TOP + ROW * i + ROW / 2}
			<text class="label" x={LABEL} y={cy}>{row.label}</text>
			<line
				x1={x(row.lo)}
				x2={x(row.hi)}
				y1={cy}
				y2={cy}
				stroke={color(row.direction)}
				stroke-width="4"
				stroke-linecap="round"
			/>
			<circle cx={x(row.diff)} {cy} r="6" fill={color(row.direction)} />
			<text class="value" x={WIDTH - 4} y={cy}>{row.text} {glyph(row.direction)}</text>
		{/each}
	</svg>
	<figcaption>{caption}</figcaption>
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

	.label,
	.value {
		text-anchor: end;
	}

	.value {
		font-variant-numeric: tabular-nums;
	}

	.pole,
	.tick {
		font-size: 13px;
		fill: var(--text-muted);
	}

	.tick {
		text-anchor: middle;
	}

	.grid {
		stroke: var(--border);
	}

	.grid.zero {
		stroke: var(--border-strong);
		stroke-width: 1.5;
	}

	circle {
		stroke: var(--surface);
		stroke-width: 1.5;
	}

	figcaption {
		max-width: 540px;
		margin: 4px 0 0;
		font-size: 14px;
		color: var(--text-muted);
	}
</style>
