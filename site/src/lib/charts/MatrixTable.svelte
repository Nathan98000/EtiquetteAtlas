<script lang="ts">
	import { BEHAVIOR_TEXT, SITUATION_TEXT } from '#lib/data/grid.ts';
	import {
		RELATIVE,
		count,
		interval,
		percent,
		respondentsIn,
		score,
		spread
	} from '#lib/data/format.ts';
	import type { Scale } from '#lib/data/model.ts';
	import DataTable, { type Column } from './DataTable.svelte';
	import { societyPhrase, type MatrixCell, type SelectedSociety } from './matrix-model';

	interface Props {
		cells: MatrixCell[];
		order: number[];
		scale: Scale;
		society?: SelectedSociety;
	}

	let { cells, order, scale, society }: Props = $props();
	const centered = $derived(scale === 'centered' ? `, ${RELATIVE}` : '');

	const columns = $derived.by(() => {
		const list: Column<MatrixCell>[] = [
			{ header: 'Behavior', text: (c) => BEHAVIOR_TEXT[c.behavior].label, rowHeader: true },
			{ header: 'Situation', text: (c) => SITUATION_TEXT[c.situation].label },
			{
				header: 'Global average (95% interval)',
				text: (c) => `${score(c.mean)} (${interval(c.meanLo, c.meanHi)})`
			},
			{ header: 'Chose appropriate', text: (c) => percent(c.share) },
			{
				header: 'Disagreement (95% interval)',
				text: (c) => `${spread(c.tau)} (${spread(c.tauLo)} to ${spread(c.tauHi)})`
			},
			{ header: 'Societies', text: (c) => String(c.societies) },
			{ header: 'Respondents', text: (c) => count(c.respondents) }
		];
		if (society?.inSample) {
			list.push({
				header: respondentsIn(society.code, society.name),
				text: (c) => (c.society ? societyPhrase(c.society) : '')
			});
		}
		return list;
	});
</script>

<!-- NFR-11: the matrix's values as a table, in the order the chart is sorted. -->
<DataTable
	caption="Global average and disagreement for each behavior and situation{centered}"
	rows={order.map((i) => cells[i])}
	{columns}
	key={(c) => c.index}
/>
