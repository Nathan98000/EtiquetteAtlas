<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Scale } from '#lib/data/model.ts';
	import FingerprintDetails from './FingerprintDetails.svelte';
	import Grid from './Grid.svelte';
	import { fingerprintLabel, type FingerprintCell } from './fingerprint-model';
	import { MARK_GLYPH } from './matrix-model';

	interface Props {
		/** Undefined while the data loads: the grid keeps its size, so nothing shifts. */
		cells: FingerprintCell[] | undefined;
		rows: number[];
		columns: number[];
		scale: Scale;
		/** "respondents in Chile". */
		who: string;
		href: (cell: number) => ResolvedPathname;
		onpreview: (cell: number | null) => void;
		describedBy: string;
	}

	let { cells, rows, columns, scale, who, href, onpreview, describedBy }: Props = $props();
</script>

<!-- FR-30, FR-31: the society's difference from the global mean in each cell, with ▲ or ▼ where
     it is notable and – where there is nothing to show; the same grid as the matrix. -->
<Grid
	{cells}
	{rows}
	{columns}
	label="{who[0].toUpperCase() +
		who.slice(1)} compared with the global average, 15 behaviors in 10 situations"
	cellStyle={(cell) => cell.style}
	cellLabel={fingerprintLabel}
	{href}
	{onpreview}
	{describedBy}
	tooltipId="fingerprint-tooltip"
>
	{#snippet content(cell)}
		{#if MARK_GLYPH[cell.mark]}
			<span class="glyph" aria-hidden="true">{MARK_GLYPH[cell.mark]}</span>
		{/if}
	{/snippet}
	{#snippet details(cell)}
		<FingerprintDetails {cell} {scale} {who} />
	{/snippet}
</Grid>

<style>
	/* Marks read without colour (NFR-12): in the ink that contrasts with the fill, or the text
	   colour in an unfilled cell. */
	.glyph {
		font-size: 0.875rem;
		line-height: 1;
		color: var(--ink, var(--text));
	}
</style>
