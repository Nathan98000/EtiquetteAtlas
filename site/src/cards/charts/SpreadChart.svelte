<script lang="ts">
	import { dodge, extent } from '#lib/charts/dodge.ts';
	import { score } from '#lib/data/format.ts';
	import type { SpreadDot } from '../model';

	// Decision 3, recommendation 15: the story's first picture for its share card, the 150 pairs'
	// averages and the societies' averages over all the pairs, as two rows on one scale.
	interface Props {
		pairs: SpreadDot[];
		societies: SpreadDot[];
		labels: [string, string];
		caption: string;
	}

	let { pairs, societies, labels, caption }: Props = $props();

	const WIDTH = 590;
	const PAD = 20;
	const x = (v: number) => PAD + ((v + 2.5) / 5) * (WIDTH - 2 * PAD);
	/** Half of each row's band; dots shrink until the row fits. */
	const HALF = 52;
	const fit = (dots: SpreadDot[]) => {
		for (const r of [6, 5, 4.5, 4, 3.5, 3]) {
			const placed = dodge(
				dots,
				(d) => x(d.value),
				(d) => d.key,
				2 * r + 1
			);
			if (extent(placed) + r <= HALF) return { r, placed };
		}
		return {
			r: 3,
			placed: dodge(
				dots,
				(d) => x(d.value),
				(d) => d.key,
				7
			)
		};
	};
	const rows = $derived([fit(pairs), fit(societies)]);
	const ROW = 26 + 2 * HALF + 30;
	const height = 2 * ROW + 44;
</script>

<figure>
	<svg viewBox="0 0 {WIDTH} {height}" width={WIDTH} {height} aria-hidden="true">
		{#each rows as row, i (i)}
			{@const top = i * ROW}
			{@const values = row.placed.map((p) => p.item.value)}
			{@const [lo, hi] = [Math.min(...values), Math.max(...values)]}
			<text class="label" x={PAD} y={top + 14}>{labels[i]}</text>
			{#each row.placed as p (p.item.key)}
				<circle cx={p.x} cy={top + 26 + HALF + p.y} r={row.r} fill={p.item.fill} />
			{/each}
			<g class="range" transform="translate(0 {top + 26 + 2 * HALF + 8})">
				<line x1={x(lo)} x2={x(hi)} y1="0" y2="0" />
				<line x1={x(lo)} x2={x(lo)} y1="-5" y2="5" />
				<line x1={x(hi)} x2={x(hi)} y1="-5" y2="5" />
				<text x={x(lo)} y="19">{score(lo)}</text>
				<text x={x(hi)} y="19">{score(hi)}</text>
			</g>
		{/each}
		<g class="axis" transform="translate(0 {2 * ROW + 6})">
			<line x1={x(-2.5)} x2={x(2.5)} y1="0" y2="0" />
			<text class="pole" x={x(-2.5)} y="22" text-anchor="start">← Inappropriate</text>
			<text class="pole" x={x(2.5)} y="22" text-anchor="end">Appropriate →</text>
		</g>
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

	.label {
		font-weight: 700;
		font-size: 17px;
	}

	circle {
		stroke: var(--text);
		stroke-width: 0.75;
	}

	.range line,
	.axis line {
		stroke: var(--border-strong);
		stroke-width: 1.5;
	}

	.range text {
		text-anchor: middle;
		fill: var(--text-muted);
	}

	.pole {
		font-weight: 700;
		fill: var(--text-muted);
		font-size: 14px;
	}

	figcaption {
		margin-top: 4px;
		font-size: 15px;
		color: var(--text-muted);
	}
</style>
