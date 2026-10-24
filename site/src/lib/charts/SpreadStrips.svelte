<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { score, signed } from '#lib/data/format.ts';
	import { CELLS, headline } from '#lib/data/grid.ts';
	import type { Spread } from '#lib/story/story-model.ts';
	import { scoreStyle } from './colors';
	import { dodge, type Placed } from './dodge';

	interface Props {
		spread: Spread;
		/** A society's name, for its dot's tooltip. */
		name: (code: string) => string;
		label: string;
		describedBy: string;
	}

	let { spread, name, label, describedBy }: Props = $props();

	const M = { left: 12, right: 12 };
	/** Half of each row's band; the rows keep this height, and dots shrink to fit (as decision 35). */
	const HALF = 30;
	/** Above each band its label; under it the range line and its end values. */
	const LABEL = 18;
	const RANGE = 26;
	const ROW = LABEL + 2 * HALF + RANGE;
	const AXIS = 44;
	let width = $state(0);

	const x = $derived(
		scaleLinear()
			.domain([-2.5, 2.5])
			.range([M.left, Math.max(M.left + 1, width - M.right)])
	);

	interface Dot {
		key: string;
		value: number;
		title: string;
	}

	function layout(dots: Dot[]): { points: Placed<Dot>[]; r: number } {
		let points: Placed<Dot>[] = [];
		for (let r = 4; r >= 2; r -= 0.5) {
			points = dodge(
				dots,
				(d) => x(d.value),
				(d) => d.key,
				2 * r + 1
			);
			if (points.every((p) => Math.abs(p.y) <= HALF - r)) return { points, r };
		}
		return { points, r: 2 };
	}

	const rows = $derived(
		width > 0
			? [
					{
						label: `The ${spread.pairs.length} pairs' averages`,
						...layout(
							spread.pairs.map((p) => ({
								key: String(p.cell),
								value: p.value,
								title: `${headline(CELLS[p.cell])}: ${score(p.value)}`
							}))
						)
					},
					{
						label: `The ${spread.societies.length} societies' averages`,
						...layout(
							spread.societies.map((s) => ({
								key: s.code,
								value: s.value,
								title: `Respondents in ${name(s.code)}: ${score(s.value)}`
							}))
						)
					}
				]
			: []
	);
	const ticks = [-2, -1, 0, 1, 2];
</script>

<!-- Decision 3 (D-2): the paper's finding in the atlas's own averages, two rows on one scale. -->
<div class="spread" bind:clientWidth={width}>
	{#if width > 0}
		<svg
			{width}
			height={2 * ROW + AXIS}
			role="img"
			aria-label={label}
			aria-describedby={describedBy}
		>
			{#each rows as row, i (i)}
				{@const top = i * ROW}
				{@const values = row.points.map((p) => p.item.value)}
				{@const [lo, hi] = [Math.min(...values), Math.max(...values)]}
				<text class="row-label" x={M.left} y={top + 12}>{row.label}</text>
				<g transform="translate(0 {top + LABEL + HALF})">
					{#each row.points as point (point.item.key)}
						<circle
							class="dot score"
							style={scoreStyle(point.item.value)}
							cx={point.x}
							cy={point.y}
							r={row.r}
						>
							<title>{point.item.title}</title>
						</circle>
					{/each}
				</g>
				<g class="range" transform="translate(0 {top + LABEL + 2 * HALF + 6})">
					<line x1={x(lo)} x2={x(hi)} y1="0" y2="0" />
					<line x1={x(lo)} x2={x(lo)} y1="-4" y2="4" />
					<line x1={x(hi)} x2={x(hi)} y1="-4" y2="4" />
					<text x={x(lo)} y="16" text-anchor="middle">{score(lo)}</text>
					<text x={x(hi)} y="16" text-anchor="middle">{score(hi)}</text>
				</g>
			{/each}
			<g class="axis" transform="translate(0 {2 * ROW + 8})">
				<line x1={x(-2.5)} x2={x(2.5)} y1="0" y2="0" />
				{#each ticks as t (t)}
					<line x1={x(t)} x2={x(t)} y1="0" y2="5" />
					<text x={x(t)} y="18" text-anchor="middle">{signed(t, 0)}</text>
				{/each}
				<text x={x(-2.5)} y="36" text-anchor="start">Extremely inappropriate</text>
				<text x={x(2.5)} y="36" text-anchor="end">Extremely appropriate</text>
			</g>
		</svg>
	{/if}
</div>

<style>
	.spread {
		/* Two rows and the axis (2 × ROW + AXIS above), held while the data load (NFR-2). */
		min-height: 15.75rem;
	}

	svg {
		display: block;
		overflow: visible;
		font-size: var(--text-sm);
	}

	text {
		fill: var(--text);
	}

	.row-label {
		font-weight: 600;
	}

	/* The ink outline keeps pale fills at 3:1 (NFR-12), as on the map. */
	.dot {
		fill: var(--fill);
		stroke: var(--text);
		stroke-width: 0.75;
	}

	.range line,
	.axis line {
		stroke: var(--border-strong);
		stroke-width: 1;
	}

	.range text {
		fill: var(--text-muted);
	}
</style>
