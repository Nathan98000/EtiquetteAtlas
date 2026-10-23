<script lang="ts">
	import { count, interval, responseLabel, score } from '#lib/data/format.ts';
	import { directionText, type ChangeRow } from './change-model';

	interface Props {
		row: ChangeRow;
		/** For one society, the same pair for the societies in both surveys together. */
		reference: ChangeRow | undefined;
		/** "the 26 societies in both surveys". */
		together: string;
	}

	let { row, reference, together }: Props = $props();
</script>

<!-- FR-50, FR-51: both surveys' values for a pair, the difference with its 95% interval, and what
     each value rests on. -->
<p class="title">{row.headline}</p>
<dl>
	<div>
		<dt>2023–2024 survey (GSN)</dt>
		<dd>
			<span class="num">{score(row.newer)}</span>, {responseLabel(row.newer)}
			{#if row.n}
				<span class="muted"
					>(<span class="num">{count(row.n.newer)}</span> respondents{row.small.newer
						? ', small sample'
						: ''})</span
				>
			{/if}
		</dd>
	</div>
	<div>
		<dt>2000–2003 survey</dt>
		<dd>
			<span class="num">{score(row.older)}</span>, {responseLabel(row.older)}
			{#if row.n}
				<span class="muted"
					>(<span class="num">{count(row.n.older)}</span> ratings{row.small.older
						? ', small sample'
						: ''})</span
				>
			{/if}
		</dd>
	</div>
	<div>
		<dt>Difference</dt>
		<dd>
			<span class="num">{score(row.diff.value)}</span>
			<span class="muted"
				>(95% interval <span class="num">{interval(row.diff.lo, row.diff.hi)}</span>)</span
			>, {directionText(row.direction)}
		</dd>
	</div>
	{#if row.societies !== null}
		<div>
			<dt>Averaged over</dt>
			<dd><span class="num">{row.societies}</span> societies with this pair in both surveys</dd>
		</div>
	{/if}
	{#if reference}
		<div>
			<dt>Difference for {together}</dt>
			<dd><span class="num">{score(reference.diff.value)}</span></dd>
		</div>
	{/if}
</dl>

<style>
	.title {
		margin: 0 0 0.5rem;
		font-weight: 700;
		line-height: 1.3;
	}

	dl {
		margin: 0;
		display: grid;
		gap: 0.375rem;
	}

	dt {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	dd {
		margin: 0;
	}

	.muted {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
</style>
