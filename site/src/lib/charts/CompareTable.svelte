<script lang="ts">
	import { BEHAVIOR_TEXT, SITUATION_TEXT } from '#lib/data/grid.ts';
	import { interval, score } from '#lib/data/format.ts';
	import type { Estimate } from '#lib/data/model.ts';
	import DataTable, { type Column } from './DataTable.svelte';
	import type { ComparePair, Comparison } from './compare-model';

	interface Props {
		comparison: Comparison;
		/** Society names, the page's first. */
		names: [string, string];
		caption: string;
	}

	let { comparison, names, caption }: Props = $props();

	const estimate = (e: Estimate) => `${score(e.value)} (${interval(e.lo, e.hi)})`;
	const columns: Column<ComparePair>[] = $derived([
		{ header: 'Behavior', text: (p) => BEHAVIOR_TEXT[p.behavior].label, rowHeader: true },
		{ header: 'Situation', text: (p) => SITUATION_TEXT[p.situation].label },
		{ header: `Respondents in ${names[0]} (95% interval)`, text: (p) => estimate(p.a) },
		{ header: `Respondents in ${names[1]} (95% interval)`, text: (p) => estimate(p.b) },
		{ header: 'Gap', text: (p) => score(p.gap) },
		{ header: 'Global mean', text: (p) => score(p.global) }
	]);
</script>

<!-- NFR-11: the dumbbell's values, largest gap first; the pairs not compared follow the chart. -->
<DataTable {caption} rows={comparison.pairs} {columns} key={(p) => p.index} />
