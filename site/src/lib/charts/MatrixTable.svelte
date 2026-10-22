<script lang="ts">
	import { BEHAVIOR_TEXT, SITUATION_TEXT } from '#lib/data/grid.ts';
	import { count, interval, percent, respondentsIn, score, spread } from '#lib/data/format.ts';
	import type { Scale } from '#lib/data/model.ts';
	import { societyPhrase, type MatrixCell, type SelectedSociety } from './matrix-model';

	interface Props {
		cells: MatrixCell[];
		order: number[];
		scale: Scale;
		society?: SelectedSociety;
	}

	let { cells, order, scale, society }: Props = $props();
	const centered = $derived(scale === 'centered' ? ', centered' : '');
</script>

<!-- NFR-11: the matrix's values as a table, in the order the chart is sorted. -->
<table>
	<caption>Global average and disagreement for each behavior and situation{centered}</caption>
	<thead>
		<tr>
			<th scope="col">Behavior</th>
			<th scope="col">Situation</th>
			<th scope="col">Global mean (95% interval)</th>
			<th scope="col">Chose appropriate</th>
			<th scope="col">Disagreement (95% interval)</th>
			<th scope="col">Societies</th>
			<th scope="col">Respondents</th>
			{#if society?.inSample}
				<th scope="col">{respondentsIn(society.code, society.name)}</th>
			{/if}
		</tr>
	</thead>
	<tbody>
		{#each order as index (index)}
			{@const cell = cells[index]}
			<tr>
				<th scope="row">{BEHAVIOR_TEXT[cell.behavior].label}</th>
				<td>{SITUATION_TEXT[cell.situation].label}</td>
				<td>{score(cell.mean)} ({interval(cell.meanLo, cell.meanHi)})</td>
				<td>{percent(cell.share)}</td>
				<td>{spread(cell.tau)} ({spread(cell.tauLo)} to {spread(cell.tauHi)})</td>
				<td>{cell.societies}</td>
				<td>{count(cell.respondents)}</td>
				{#if society?.inSample}
					<td>{cell.society ? societyPhrase(cell.society) : ''}</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		border-collapse: collapse;
		font-size: var(--text-sm);
		min-width: 100%;
	}

	caption {
		text-align: left;
		font-weight: 600;
		padding-bottom: 0.5rem;
	}

	th,
	td {
		padding: 0.375rem 0.5rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}

	thead th {
		border-bottom: 2px solid var(--border-strong);
	}
</style>
