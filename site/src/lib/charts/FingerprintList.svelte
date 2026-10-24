<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { score } from '#lib/data/format.ts';
	import type { Scale } from '#lib/data/model.ts';
	import BarList from './BarList.svelte';
	import { DEVIATION_MAX } from './colors';
	import FingerprintDetails from './FingerprintDetails.svelte';
	import { fingerprintLabel, type FingerprintCell } from './fingerprint-model';
	import { MARK_GLYPH } from './matrix-model';

	interface Props {
		cells: FingerprintCell[] | undefined;
		order: number[];
		scale: Scale;
		who: string;
		href: (cell: number) => ResolvedPathname;
	}

	let { cells, order, scale, who, href }: Props = $props();

	/** D-20: the first rows, then "Show all", so similar societies and facts stay near (decision 54). */
	const FIRST = 25;
</script>

<!-- FR-17, FR-30: below 640 px the fingerprint is a list of the 150 cells, each with its
     difference as a bar from 0 on the colour scale's ±1.5 and its FR-31 mark. -->
<BarList
	{cells}
	{order}
	label="150 behavior–situation pairs, compared with the global average"
	cellLabel={fingerprintLabel}
	cellStyle={(cell) => cell.style}
	value={(cell) => cell.deviation}
	max={DEVIATION_MAX}
	valueText={(cell) => (cell.deviation === null ? '' : score(cell.deviation))}
	{href}
	limit={FIRST}
>
	{#snippet marks(cell)}
		<span class="mark">{MARK_GLYPH[cell.mark]}</span>
	{/snippet}
	{#snippet details(cell)}
		<FingerprintDetails {cell} {scale} {who} />
	{/snippet}
</BarList>

<style>
	.mark {
		display: inline-block;
		width: 1rem;
		text-align: center;
		font-size: 0.875rem;
	}
</style>
