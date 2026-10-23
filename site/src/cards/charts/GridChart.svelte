<script lang="ts">
	import { DIVERGING } from '#lib/charts/colors.ts';
	import { COLUMN_LABELS, ROW_LABELS, type GridCell } from '../model';

	// The 15 × 10 grid of the matrix (FR-10, FR-11, FR-16) or of a fingerprint (FR-30, FR-31),
	// simplified for a share image: fills, disagreement circles or ▲/▼ marks, row and column labels.
	interface Props {
		cells: GridCell[];
		legend: 'matrix' | 'fingerprint';
	}

	let { cells, legend }: Props = $props();

	const LABEL = 152;
	const W = 38;
	// The last column's slanted label reaches past the grid.
	const RIGHT = 34;
	const H = 21;
	const HEAD = 74;
	const width = LABEL + W * COLUMN_LABELS.length + RIGHT;
	const gridHeight = H * ROW_LABELS.length;
	const height = HEAD + gridHeight + 34;
	const ends = $derived(
		legend === 'matrix' ? ['Inappropriate', 'Appropriate'] : ['Stricter', 'Looser']
	);
</script>

<figure>
	<svg {width} height={height - 34} viewBox="0 0 {width} {height - 34}" aria-hidden="true">
		{#each COLUMN_LABELS as label, s (label)}
			<text class="column" transform="translate({LABEL + W * s + W / 2 + 4},{HEAD - 6}) rotate(-50)"
				>{label}</text
			>
		{/each}
		{#each ROW_LABELS as label, b (label)}
			<text class="row" x={LABEL - 8} y={HEAD + H * b + H / 2}>{label}</text>
		{/each}
		{#each cells as cell, c (c)}
			{@const x = LABEL + W * (c % 10)}
			{@const y = HEAD + H * Math.floor(c / 10)}
			{#if cell.fill}
				<rect class="cell" {x} {y} width={W} height={H} fill={cell.fill} />
			{:else}
				<rect class="cell missing" x={x + 1} y={y + 1} width={W - 2} height={H - 2} />
				<text class="mark" x={x + W / 2} y={y + H / 2} fill={cell.ink}>–</text>
			{/if}
			{#if cell.dot !== null}
				<circle
					cx={x + W / 2}
					cy={y + H / 2}
					r={Math.max(1.2, cell.dot * (H / 2 - 2))}
					fill={cell.ink}
				/>
			{/if}
			{#if cell.mark}
				<text class="mark" x={x + W / 2} y={y + H / 2} fill={cell.ink}>{cell.mark}</text>
			{/if}
		{/each}
		<!-- FR-16's rings go on top of every cell. -->
		{#each cells as cell, c (c)}
			{#if cell.ring}
				{@const x = LABEL + W * (c % 10)}
				{@const y = HEAD + H * Math.floor(c / 10)}
				<rect class="ring" x={x - 1.5} y={y - 1.5} width={W + 3} height={H + 3} />
				{#if cell.ring === 2}
					<rect class="ring" x={x - 5} y={y - 5} width={W + 10} height={H + 10} />
				{/if}
			{/if}
		{/each}
	</svg>
	<figcaption>
		<span class="scale">
			<span class="ramp"
				>{#each DIVERGING.light as color (color)}<span style:background={color}></span>{/each}</span
			>
			<span class="ends"><span>{ends[0]}</span><span>{ends[1]}</span></span>
		</span>
		{#if legend === 'matrix' && cells.some((c) => c.dot !== null)}
			<span class="key"><span class="dot"></span> Larger dot: more disagreement</span>
		{:else if legend === 'fingerprint'}
			<span class="key">▲ ▼ Notably looser or stricter</span>
		{/if}
	</figcaption>
</figure>

<style>
	figure {
		margin: 0;
	}

	text {
		font-size: 14px;
		fill: var(--text);
		dominant-baseline: central;
	}

	.row {
		text-anchor: end;
	}

	.column {
		dominant-baseline: auto;
	}

	.cell {
		stroke: var(--surface);
		stroke-width: 1;
	}

	.missing {
		fill: none;
		stroke: var(--border-strong);
		stroke-dasharray: 3 2;
	}

	.mark {
		font-size: 12px;
		text-anchor: middle;
	}

	.ring {
		fill: none;
		stroke: var(--text);
		stroke-width: 2.5;
	}

	figcaption {
		display: flex;
		gap: 24px;
		align-items: flex-start;
		margin: 4px 0 0 152px;
		font-size: 14px;
		color: var(--text-muted);
	}

	.scale {
		display: flex;
		flex-direction: column;
		width: 180px;
	}

	.ramp {
		display: flex;
		height: 10px;
		border: 1px solid var(--border-strong);
	}

	.ramp span {
		flex: 1;
	}

	.ends {
		display: flex;
		justify-content: space-between;
	}

	.key {
		white-space: nowrap;
	}

	.dot {
		display: inline-block;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--text);
	}
</style>
