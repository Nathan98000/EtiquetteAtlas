<script lang="ts">
	import { SORT_LABEL, type SortKey } from '#lib/data/derive.ts';

	interface Props {
		/** The orders the route offers (url.ts sortKeysFor). */
		keys: readonly SortKey[];
		value: SortKey;
		onchange: (value: SortKey) => void;
	}

	let { keys, value, onchange }: Props = $props();
</script>

<!-- FR-12, FR-41: a chart's sort, next to its title. -->
<label class="sort">
	<span>Sort</span>
	<select {value} onchange={(event) => onchange(event.currentTarget.value as SortKey)}>
		{#each keys as key (key)}
			<option value={key}>{SORT_LABEL[key]}</option>
		{/each}
	</select>
</label>

<style>
	.sort {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	select {
		min-height: 2.75rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface-raised);
		color: var(--text);
		font-size: var(--text-md);
	}
</style>
