<script lang="ts">
	import { resolve } from '$app/paths';
	import type { FactsView } from '#lib/data/society.ts';
	import { SAMPLE_PHRASE } from '#lib/data/model.ts';

	interface Props {
		/** Undefined while the file loads. */
		facts: FactsView | undefined;
	}

	let { facts }: Props = $props();
</script>

<!-- FR-34: who responded, in the active sample. Collection sites are left out (§4.4, decision 9);
     the regions are the GSN authors' grouping (§4.4). -->
<section class="card" aria-labelledby="facts-title">
	<h2 id="facts-title">About these respondents</h2>
	<dl>
		<div>
			<dt>
				Respondents{facts && facts.sample !== 'all' ? ` (${SAMPLE_PHRASE[facts.sample]})` : ''}
			</dt>
			<dd class="num">{facts ? (facts.inSample?.respondents ?? 'not in this sample') : '…'}</dd>
		</div>
		{#if !facts || facts.inSample}
			<div>
				<dt>Flagged as students</dt>
				<dd>{facts?.inSample?.students ?? '…'}</dd>
			</div>
			<div>
				<dt>Survey languages</dt>
				<dd>{facts?.inSample?.languages ?? '…'}</dd>
			</div>
			<div>
				<dt>Fieldwork</dt>
				<dd>{facts?.inSample?.period ?? '…'}</dd>
			</div>
		{/if}
		<div>
			<dt>Region (the GSN authors' grouping)</dt>
			<dd>{facts?.region ?? '…'}</dd>
		</div>
	</dl>
	<p class="samples">
		{#if facts}
			{#each facts.bySample as s, i (s.sample)}{i ? ' · ' : ''}{s.label}:
				<span class="num">{s.respondents ?? 'not included'}</span>{/each}
		{:else}&nbsp;{/if}
	</p>
	<p class="note">
		Student status was not collected the same way at every site: some asked, some recorded it for
		everyone they recruited, some recorded none. Collection sites are not shown, to protect
		respondents' privacy.
		<a href={resolve('method/#facts')}>About these facts</a>
	</p>
</section>

<style>
	.card {
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-muted);
	}

	h2 {
		font-size: var(--text-lg);
		margin: 0 0 0.5rem;
	}

	dl {
		display: grid;
		gap: 0.25rem;
		margin: 0;
	}

	dl div {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0 1rem;
	}

	dt {
		color: var(--text-muted);
	}

	dd {
		margin: 0;
		text-align: right;
	}

	.samples {
		margin: 0.75rem 0 0;
		font-size: var(--text-sm);
	}

	.note {
		margin: 0.5rem 0 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
</style>
