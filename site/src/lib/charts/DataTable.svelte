<script lang="ts" module>
	export interface Column<Row> {
		header: string;
		text: (row: Row) => string;
		/** The column that names each row (a <th scope="row">). */
		rowHeader?: boolean;
	}
</script>

<script lang="ts" generics="T">
	interface Props {
		caption: string;
		rows: T[];
		columns: Column<T>[];
		/** A key per row for Svelte's keyed each. */
		key: (row: T) => string | number;
	}

	let { caption, rows, columns, key }: Props = $props();
</script>

<!-- NFR-11: a chart's values as an accessible table, in the order the chart is sorted. -->
<table>
	<caption>{caption}</caption>
	<thead>
		<tr>
			{#each columns as column (column.header)}
				<th scope="col">{column.header}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each rows as row (key(row))}
			<tr>
				{#each columns as column (column.header)}
					{#if column.rowHeader}
						<th scope="row">{column.text(row)}</th>
					{:else}
						<td>{column.text(row)}</td>
					{/if}
				{/each}
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
