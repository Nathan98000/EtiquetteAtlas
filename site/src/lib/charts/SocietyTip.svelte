<script lang="ts">
	import { count, interval, place, responseLabel, score } from '#lib/data/format.ts';
	import { Status } from '#lib/data/model.ts';
	import type { SocietyPoint } from './drill-model';

	interface Props {
		point: SocietyPoint;
	}

	let { point }: Props = $props();

	const comparison = $derived(
		point.notable === 1
			? 'looser than the global mean'
			: point.notable === -1
				? 'stricter than the global mean'
				: 'close to the global mean'
	);
</script>

<!-- FR-20, FR-21: the society's estimate with its 95% interval and its sample size. -->
<p class="name">Respondents in {place(point.code, point.name)}</p>
{#if point.estimate}
	<p>
		<span class="num">{score(point.estimate.value)}</span>, {responseLabel(point.estimate.value)}
		<span class="muted"
			>(95% interval <span class="num">{interval(point.estimate.lo, point.estimate.hi)}</span
			>)</span
		>
	</p>
	<p>{comparison}</p>
{/if}
<p class="muted">
	{point.n === null ? 'Fewer than 10' : count(point.n)} respondents{point.status === Status.Small
		? ' (small sample)'
		: ''} · {point.region}
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
</style>
