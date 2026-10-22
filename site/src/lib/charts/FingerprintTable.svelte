<script lang="ts">
	import { BEHAVIOR_TEXT, SITUATION_TEXT } from '#lib/data/grid.ts';
	import { count, interval, percent, score } from '#lib/data/format.ts';
	import { Status, type Scale } from '#lib/data/model.ts';
	import DataTable, { type Column } from './DataTable.svelte';
	import { markPhrase, type FingerprintCell } from './fingerprint-model';

	interface Props {
		cells: FingerprintCell[];
		order: number[];
		scale: Scale;
		who: string;
	}

	let { cells, order, scale, who }: Props = $props();
	const centered = $derived(scale === 'centered' ? ', centered' : '');

	const missing = (c: FingerprintCell) =>
		c.status === Status.NotAsked ? 'not asked' : 'too few responses';
	const shown = (c: FingerprintCell, text: (c: FingerprintCell) => string) =>
		c.estimate && c.deviation !== null ? text(c) : '';

	const columns: Column<FingerprintCell>[] = [
		{ header: 'Behavior', text: (c) => BEHAVIOR_TEXT[c.behavior].label, rowHeader: true },
		{ header: 'Situation', text: (c) => SITUATION_TEXT[c.situation].label },
		{
			header: 'Difference from the global average',
			text: (c) => (c.deviation === null ? missing(c) : score(c.deviation))
		},
		{ header: 'Compared with the global average', text: (c) => shown(c, () => markPhrase(c.mark)) },
		{
			header: 'Estimate (95% interval)',
			text: (c) =>
				shown(c, () => `${score(c.estimate!.value)} (${interval(c.estimate!.lo, c.estimate!.hi)})`)
		},
		{ header: 'Chose appropriate', text: (c) => shown(c, () => percent(c.share ?? 0)) },
		{
			header: 'Respondents',
			text: (c) =>
				shown(c, () => `${count(c.n ?? 0)}${c.status === Status.Small ? ' (small sample)' : ''}`)
		},
		{
			header: 'Global mean (95% interval)',
			text: (c) => `${score(c.global)} (${interval(c.globalLo, c.globalHi)})`
		}
	];
</script>

<!-- NFR-11: the fingerprint's values as a table, in the order the chart is sorted. -->
<DataTable
	caption="{who[0].toUpperCase() + who.slice(1)} compared with the global average{centered}"
	rows={order.map((i) => cells[i])}
	{columns}
	key={(c) => c.index}
/>
