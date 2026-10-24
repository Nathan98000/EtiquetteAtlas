<script lang="ts">
	import {
		RELATIVE,
		count,
		interval,
		narrow,
		percent,
		respondentsIn,
		responseLabel,
		score,
		spread
	} from '#lib/data/format.ts';
	import type { Scale } from '#lib/data/model.ts';
	import { societyPhrase, type MatrixCell, type SelectedSociety } from './matrix-model';

	interface Props {
		cell: MatrixCell;
		scale: Scale;
		society?: SelectedSociety;
		/** False while the selected society's file loads. */
		societyReady?: boolean;
	}

	let { cell, scale, society, societyReady = true }: Props = $props();

	const centered = $derived(scale === 'centered' ? ` (${RELATIVE})` : '');
	const who = $derived(society ? respondentsIn(society.code, society.name) : '');
</script>

<!-- FR-13: behavior, situation, global mean with its 95% interval, disagreement with its
     interval, number of societies and total respondents. -->
<p class="title">{cell.headline}</p>
<dl>
	<div>
		<dt>Global average{centered}</dt>
		<dd>
			<span class="num">{score(cell.mean)}</span>, {responseLabel(cell.mean)}
			<!-- D-34: an interval that rounds to a point is left out for the global mean. -->
			{#if !narrow(cell.meanLo, cell.meanHi)}
				<span class="muted"
					>(95% interval <span class="num">{interval(cell.meanLo, cell.meanHi)}</span>)</span
				>
			{/if}
		</dd>
	</div>
	<div>
		<dt>Chose an appropriate answer</dt>
		<dd>
			<span class="num">{percent(cell.share)}</span>
			<span class="muted">(average of societies)</span>
		</dd>
	</div>
	<div>
		<dt>Disagreement{centered}</dt>
		<dd>
			<span class="num">{spread(cell.tau)}</span>
			<span class="muted"
				>(95% interval <span class="num">{spread(cell.tauLo)} to {spread(cell.tauHi)}</span>)</span
			>
		</dd>
	</div>
	<div>
		<dt>Societies</dt>
		<dd class="num">{cell.societies}</dd>
	</div>
	<div>
		<dt>Respondents</dt>
		<dd class="num">{count(cell.respondents)}</dd>
	</div>
	{#if society}
		<div class="society">
			<dt>{who[0].toUpperCase() + who.slice(1)}</dt>
			<dd>
				{#if !society.inSample}
					not in this sample
				{:else if !cell.society}
					{societyReady ? 'no value' : 'loading…'}
				{:else}
					{societyPhrase(cell.society)}
					{#if cell.society.estimate}
						<span class="muted">
							(95% interval <span class="num">
								{interval(cell.society.estimate.lo, cell.society.estimate.hi)}</span
							>)
						</span>
					{/if}
				{/if}
			</dd>
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

	.society {
		padding-top: 0.375rem;
		border-top: 1px solid var(--border);
	}
</style>
