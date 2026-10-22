<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Scale } from '#lib/data/model.ts';
	import CellDetails from './CellDetails.svelte';
	import Grid from './Grid.svelte';
	import { MARK_GLYPH, cellLabel, type MatrixCell, type SelectedSociety } from './matrix-model';

	interface Props {
		/** Undefined while the data loads: the grid keeps its size, so nothing shifts. */
		cells: MatrixCell[] | undefined;
		rows: number[];
		columns: number[];
		scale: Scale;
		society?: SelectedSociety;
		societyReady: boolean;
		href: (cell: number) => ResolvedPathname;
		/** The cell under the pointer or keyboard focus, for the details panel. */
		onpreview: (cell: number | null) => void;
		describedBy: string;
	}

	let { cells, rows, columns, scale, society, societyReady, href, onpreview, describedBy }: Props =
		$props();
</script>

<Grid
	{cells}
	{rows}
	{columns}
	label="Global average and disagreement for 15 behaviors in 10 situations"
	cellStyle={(cell) => cell.style}
	cellLabel={(cell) => cellLabel(cell, society)}
	{href}
	{onpreview}
	{describedBy}
	tooltipId="matrix-tooltip"
>
	{#snippet content(cell)}
		<span class="dot" style="--r: {cell.dot}"></span>
		{#if cell.mark && MARK_GLYPH[cell.mark]}
			<span class="mark" aria-hidden="true">{MARK_GLYPH[cell.mark]}</span>
		{/if}
		{#if cell.universal || cell.dependent}
			<span class="ring" class:dependent={cell.dependent} aria-hidden="true"></span>
		{/if}
	{/snippet}
	{#snippet details(cell)}
		<CellDetails {cell} {scale} {society} {societyReady} />
	{/snippet}
</Grid>

<style>
	/* FR-11: disagreement as the circle's area, in the ink that contrasts with the fill. */
	.dot {
		width: calc(var(--r) * 64%);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--ink);
	}

	.mark {
		position: absolute;
		top: 1px;
		right: 3px;
		font-size: 0.6875rem;
		line-height: 1;
		color: var(--ink);
	}

	/* FR-16: a solid ring marks the most universal cell, a double ring the most culture-dependent. */
	.ring {
		position: absolute;
		inset: 0;
		border-radius: 2px;
		box-shadow: inset 0 0 0 3px var(--ink);
		pointer-events: none;
	}

	.ring.dependent {
		box-shadow:
			inset 0 0 0 2px var(--ink),
			inset 0 0 0 4px var(--fill),
			inset 0 0 0 6px var(--ink);
	}
</style>
