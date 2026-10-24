<script lang="ts">
	import {
		RELATIVE,
		count,
		interval,
		narrow,
		percent,
		responseLabel,
		score
	} from '#lib/data/format.ts';
	import { Status, type Scale } from '#lib/data/model.ts';
	import { markPhrase, type FingerprintCell } from './fingerprint-model';

	interface Props {
		cell: FingerprintCell;
		scale: Scale;
		/** "respondents in Chile". */
		who: string;
	}

	let { cell, scale, who }: Props = $props();

	const centered = $derived(scale === 'centered' ? ` (${RELATIVE})` : '');
	const Who = $derived(who[0].toUpperCase() + who.slice(1));
</script>

<!-- FR-30, FR-31: the society's difference from the global mean and how sure it is, with the two
     estimates behind it. A difference has no interval of its own in the data; the notable test
     uses the interval of the difference (decision 19). -->
<p class="title">{cell.headline}</p>
<dl>
	{#if cell.status === Status.NotAsked}
		<div>
			<dt>{Who}</dt>
			<dd><strong>Not asked</strong>: this survey left the question out.</dd>
		</div>
	{:else if !cell.estimate || cell.deviation === null}
		<div>
			<dt>{Who}</dt>
			<dd><strong>Too few responses</strong>: fewer than 10 of them rated this pair.</dd>
		</div>
	{:else}
		<div>
			<dt>Difference from the global average{centered}</dt>
			<dd>
				<span class="num">{score(cell.deviation)}</span>, {markPhrase(cell.mark)}
				{#if cell.clamped}<span class="muted">(beyond the colour scale)</span>{/if}
			</dd>
		</div>
		<div>
			<dt>{Who}{centered}</dt>
			<dd>
				<span class="num">{score(cell.estimate.value)}</span>, {responseLabel(cell.estimate.value)}
				<span class="muted"
					>(95% interval <span class="num">{interval(cell.estimate.lo, cell.estimate.hi)}</span
					>)</span
				>
			</dd>
		</div>
		<div>
			<dt>Chose an appropriate answer</dt>
			<dd>
				<span class="num">{percent(cell.share ?? 0)}</span>
				<span class="muted"
					>(all societies <span class="num">{percent(cell.globalShare)}</span>)</span
				>
			</dd>
		</div>
		<div>
			<dt>Respondents</dt>
			<dd>
				<span class="num">{count(cell.n ?? 0)}</span>{cell.status === Status.Small
					? ' (small sample)'
					: ''}
			</dd>
		</div>
	{/if}
	<div>
		<dt>Global mean{centered}</dt>
		<dd>
			<span class="num">{score(cell.global)}</span>
			<!-- D-34: an interval that rounds to a point is left out for the global mean. -->
			{#if !narrow(cell.globalLo, cell.globalHi)}
				<span class="muted"
					>(95% interval <span class="num">{interval(cell.globalLo, cell.globalHi)}</span>)</span
				>
			{/if}
		</dd>
	</div>
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
