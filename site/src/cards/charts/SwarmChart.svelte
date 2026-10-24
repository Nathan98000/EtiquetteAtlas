<script lang="ts">
	import { dodge, extent } from '#lib/charts/dodge.ts';
	import { score } from '#lib/data/format.ts';
	import type { SwarmDot } from '../model';

	// A cell's beeswarm (FR-20, FR-23), simplified: each society's shrunken estimate on the fixed
	// −2.5 to +2.5 axis (decision 35), filled by the appropriateness scale, the global mean as a
	// line, and the two end societies named.
	interface Props {
		dots: SwarmDot[];
		mean: number;
		low: string;
		high: string;
		note: string;
	}

	let { dots, mean, low, high, note }: Props = $props();

	const WIDTH = 1088;
	const PAD = 70;
	const x = (v: number) => PAD + ((v + 2.5) / 5) * (WIDTH - 2 * PAD);
	// Where estimates bunch up the swarm grows tall; the dots get smaller, down to 3.5 px, until it
	// fits the room under the text, so the chart keeps its scale.
	const MAX_HALF = 88;
	const layout = (r: number) => {
		const placed = dodge(
			dots,
			(d) => x(d.value),
			(d) => d.code,
			2 * r + 1.5
		);
		return { r, placed, half: extent(placed) + r };
	};
	const fitted = $derived.by(() => {
		for (const r of [7.5, 6.5, 5.5, 4.5]) {
			const attempt = layout(r);
			if (attempt.half <= MAX_HALF) return attempt;
		}
		return layout(3.5);
	});
	const R = $derived(fitted.r);
	const placed = $derived(fitted.placed);
	const half = $derived(Math.max(fitted.half, 40));
	// Room above the swarm for the mean's label and, when an end society's name would run off
	// the image beside its dot, for that name on a leader line (about 8.5 px a character).
	const top = 62;
	const axis = $derived(top + 2 * half + 12);
	const height = $derived(axis + 64);
	const mid = $derived(top + half);
	const sorted = $derived([...placed].sort((a, b) => a.x - b.x));
	const first = $derived(sorted[0]);
	const last = $derived(sorted[sorted.length - 1]);
	const textWidth = (text: string) => text.length * 8.5;
	const meanSpan = $derived([x(mean) - 70, x(mean) + 70]);
	const overlapsMean = (from: number, to: number) => from < meanSpan[1] && to > meanSpan[0];
	const lowBeside = $derived(first.x - R - 8 - textWidth(low) >= 0);
	const highBeside = $derived(last.x + R + 8 + textWidth(high) <= WIDTH);
	const lowAbove = $derived(
		overlapsMean(first.x - R, first.x - R + textWidth(low)) ? top - 40 : top - 14
	);
	const highAbove = $derived(
		overlapsMean(last.x + R - textWidth(high), last.x + R) ? top - 40 : top - 14
	);
</script>

<svg viewBox="0 0 {WIDTH} {height}" aria-hidden="true">
	<line class="mean" x1={x(mean)} x2={x(mean)} y1={top - 8} y2={axis} />
	<text class="mean-label" x={x(mean)} y={top - 14}>Global average {score(mean)}</text>
	{#each placed as p (p.item.code)}
		<circle class:small={p.item.small} cx={p.x} cy={mid + p.y} r={R} fill={p.item.fill} />
	{/each}
	{#if lowBeside}
		<text class="end" x={first.x - R - 6} y={mid + first.y} text-anchor="end">{low}</text>
	{:else}
		<line class="leader" x1={first.x} x2={first.x} y1={lowAbove + 9} y2={mid + first.y - R} />
		<text class="end" x={first.x - R} y={lowAbove}>{low}</text>
	{/if}
	{#if highBeside}
		<text class="end" x={last.x + R + 6} y={mid + last.y}>{high}</text>
	{:else}
		<line class="leader" x1={last.x} x2={last.x} y1={highAbove + 9} y2={mid + last.y - R} />
		<text class="end" x={last.x + R} y={highAbove} text-anchor="end">{high}</text>
	{/if}
	<line class="axis" x1={x(-2.5)} x2={x(2.5)} y1={axis} y2={axis} />
	{#each [-2, -1, 0, 1, 2] as tick (tick)}
		<line class="tick" x1={x(tick)} x2={x(tick)} y1={axis} y2={axis + 6} />
		<text class="tick-label" x={x(tick)} y={axis + 20}>{score(tick, 0)}</text>
	{/each}
	<text class="pole" x={x(-2.5)} y={axis + 42}>← Inappropriate</text>
	<text class="pole" x={x(2.5)} y={axis + 42} text-anchor="end">Appropriate →</text>
	<text class="note" x={WIDTH / 2} y={axis + 42}>{note}</text>
</svg>

<style>
	svg {
		width: 100%;
		height: 100%;
		max-height: 100%;
	}

	text {
		font-size: 15px;
		fill: var(--text);
		dominant-baseline: central;
	}

	/* D-26: filled by the estimate, outlined in the ink; a small sample's outline is dashed. */
	circle {
		stroke: var(--text);
		stroke-width: 1;
	}

	circle.small {
		stroke-dasharray: 2.5 2;
		stroke-width: 1.5;
	}

	.mean {
		stroke: var(--text);
		stroke-width: 2;
		stroke-dasharray: 5 4;
	}

	.mean-label,
	.tick-label,
	.note {
		text-anchor: middle;
	}

	.end {
		font-weight: 700;
	}

	.leader {
		stroke: var(--text);
		stroke-width: 1;
	}

	.axis,
	.tick {
		stroke: var(--border-strong);
		stroke-width: 1.5;
	}

	.tick-label,
	.pole,
	.note {
		fill: var(--text-muted);
		font-size: 14px;
	}

	.pole {
		font-weight: 700;
	}
</style>
