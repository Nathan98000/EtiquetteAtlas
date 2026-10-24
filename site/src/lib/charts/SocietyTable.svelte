<script lang="ts">
	import { count, interval, score } from '#lib/data/format.ts';
	import { Status } from '#lib/data/model.ts';
	import type { Drill } from './drill-model';

	interface Props {
		drill: Drill;
		caption: string;
	}

	let { drill, caption }: Props = $props();

	const rows = $derived(
		[...drill.plotted].sort(
			(a, b) => b.estimate!.value - a.estimate!.value || a.name.localeCompare(b.name)
		)
	);
	const compare = (notable: number | null) =>
		notable === 1 ? 'looser' : notable === -1 ? 'stricter' : 'close';
</script>

<!-- NFR-11: the beeswarm's and the map's values as a table, highest estimate first; societies
     with too few responses or not asked are listed, not ranked (FR-27). -->
<table>
	<caption>{caption}</caption>
	<thead>
		<tr>
			<th scope="col">Respondents in</th>
			<th scope="col">Region</th>
			<th scope="col">Estimate (95% interval)</th>
			<th scope="col">Compared with the global average</th>
			<th scope="col">Respondents</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as p (p.code)}
			<tr>
				<th scope="row">{p.name}</th>
				<td>{p.region}</td>
				<td>{score(p.estimate!.value)} ({interval(p.estimate!.lo, p.estimate!.hi)})</td>
				<td>{compare(p.notable)}</td>
				<td>{p.n === null ? '' : count(p.n)}{p.status === Status.Small ? ' (small sample)' : ''}</td
				>
			</tr>
		{/each}
		{#each [...drill.tooFew, ...drill.notAsked] as p (p.code)}
			<tr>
				<th scope="row">{p.name}</th>
				<td>{p.region}</td>
				<td colspan="3">{p.status === Status.NotAsked ? 'Not asked' : 'Too few responses'}</td>
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

	tbody th {
		font-weight: 400;
	}
</style>
