<script lang="ts">
	import { count, interval, place, responseLabel, score } from '#lib/data/format.ts';
	import { Status, type EstimateKind } from '#lib/data/model.ts';
	import { smallSampleText, versusGlobal, type SocietyPoint } from './drill-model';

	interface Props {
		point: SocietyPoint;
		/** Which estimate the point shows (FR-22): an adjusted one is pulled toward the average. */
		kind: EstimateKind;
	}

	let { point, kind }: Props = $props();

	const small = $derived(point.status === Status.Small && point.estimate !== null);
</script>

<!-- FR-20, FR-21: the society's estimate with its 95% interval and its sample size. -->
<p class="name">Respondents in {place(point.code, point.name)}</p>
{#if point.estimate}
	<p>
		<span class="num">{score(point.estimate.value)}</span>, {responseLabel(point.estimate.value)}
		{#if !small}
			<span class="muted"
				>(95% interval <span class="num">{interval(point.estimate.lo, point.estimate.hi)}</span
				>)</span
			>
		{/if}
	</p>
	<p>{versusGlobal(point.notable)}</p>
	{#if small}
		<!-- D-15: what few respondents do to an estimate, where the reader looks; it gives the count
		     and the interval, so the lines around it do not repeat them. -->
		<p class="small">{smallSampleText(point, kind)}</p>
	{/if}
{/if}
<p class="muted">
	{#if !small}{point.n === null ? 'Fewer than 10' : count(point.n)} respondents ·{/if}
	{point.region}
</p>

<style>
	p {
		margin: 0 0 0.25rem;
	}

	p:last-child {
		margin: 0;
	}

	.name {
		font-weight: 700;
	}

	.muted {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.small {
		font-size: var(--text-sm);
	}
</style>
