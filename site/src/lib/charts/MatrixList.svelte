<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { score } from '#lib/data/format.ts';
	import type { Scale } from '#lib/data/model.ts';
	import BarList from './BarList.svelte';
	import CellDetails from './CellDetails.svelte';
	import { scoreStyle } from './colors';
	import { MARK_GLYPH, cellLabel, type MatrixCell, type SelectedSociety } from './matrix-model';

	interface Props {
		cells: MatrixCell[] | undefined;
		order: number[];
		scale: Scale;
		society?: SelectedSociety;
		societyReady: boolean;
		href: (cell: number) => ResolvedPathname;
		/** D-12: the rows run in paper order, so a picker can jump to a behavior. */
		jump?: boolean;
	}

	let { cells, order, scale, society, societyReady, href, jump = false }: Props = $props();

	// D-13: with a society in the sample, each bar is its respondents' average, the global
	// average a tick across it.
	const mine = $derived(society?.inSample ?? false);
	const own = (cell: MatrixCell) => cell.society?.estimate?.value ?? null;
</script>

<!-- FR-17: the matrix as a list of the 150 cells, each with an inline mean bar and a
     disagreement circle. -->
<BarList
	{cells}
	{order}
	label="150 behavior–situation pairs"
	cellLabel={(cell) => cellLabel(cell, society)}
	cellStyle={(cell) => (mine ? scoreStyle(own(cell) ?? 0) : cell.style)}
	value={(cell) => (mine ? own(cell) : cell.mean)}
	max={2.5}
	tick={mine ? (cell) => cell.mean : undefined}
	valueText={(cell) => (mine ? (own(cell) === null ? '' : score(own(cell)!)) : score(cell.mean))}
	{href}
	{jump}
>
	{#snippet tags(cell)}
		{#if cell.universal}<span class="tag">Most universal</span>{/if}
		{#if cell.dependent}<span class="tag">Most culture-dependent</span>{/if}
	{/snippet}
	{#snippet marks(cell)}
		<span class="dot-box"><span class="dot" style="--r: {cell.dot}"></span></span>
		<span class="mark">{cell.mark ? MARK_GLYPH[cell.mark] : ''}</span>
	{/snippet}
	{#snippet details(cell)}
		<CellDetails {cell} {scale} {society} {societyReady} />
	{/snippet}
</BarList>

<style>
	.tag {
		display: block;
		width: fit-content;
		margin-top: 0.125rem;
		white-space: nowrap;
		padding: 0 0.375rem;
		border: 1px solid var(--text);
		border-radius: 999px;
		color: var(--text);
		font-size: 0.75rem;
	}

	.dot-box {
		display: grid;
		place-items: center;
		width: var(--cell);
		height: var(--cell);
	}

	.dot {
		width: calc(var(--r) * 64%);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--text);
	}

	.mark {
		display: inline-block;
		width: 0.875rem;
		margin-left: 0.5rem;
		font-size: 0.75rem;
	}
</style>
