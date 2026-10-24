<script lang="ts">
	import { CONTEXT_TEXT, CONTEXTS } from '#lib/data/grid.ts';
	import { interval, responseLabel, score } from '#lib/data/format.ts';
	import { missingText } from '#lib/data/model.ts';
	import {
		actorGap,
		actorText,
		effectOf,
		effectText,
		readingOrder,
		respondentsText,
		shareText,
		type BehaviorAudiences
	} from './audience-model';

	interface Props {
		row: BehaviorAudiences | undefined;
		/** The column shown, or null for the hint. */
		context: number | null;
		actor: boolean;
	}

	let { row, context, actor }: Props = $props();

	const lines = $derived(row ? readingOrder(row.series) : []);
	const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
</script>

<!-- FR-40, FR-42: each line's value in one column with its 95% interval and respondents, then
     each line's audience effect and, with the actor's gender, its gap. -->
{#if row && context !== null}
	<h3>{CONTEXT_TEXT[CONTEXTS[context]].label}</h3>
	<dl>
		{#each lines as s (s.kind)}
			{@const v = s.values[context]}
			<dt>{s.label}</dt>
			{#if v.estimate}
				<dd>
					<span class="num">{score(v.estimate.value)}</span>, {responseLabel(v.estimate.value)}
					<span class="muted"
						>(95% interval <span class="num">{interval(v.estimate.lo, v.estimate.hi)}</span>)</span
					>
				</dd>
				<dd class="muted">{respondentsText(v)} · {shareText(v)}</dd>
			{:else}
				<dd>{capital(missingText(v.status))}</dd>
			{/if}
		{/each}
	</dl>
{:else}
	<p class="hint">
		Point at a column, or move to it with the arrow keys, to see each line's value with its 95%
		interval. Select it to keep it here.
	</p>
{/if}
{#if row}
	<h3>When alone and in front of management or professors</h3>
	<ul>
		{#each lines as s (s.kind)}
			<li><span class="who">{s.label}:</span> {effectText(effectOf(s.values))}</li>
		{/each}
	</ul>
	{#if actor}
		<h3>Who does it</h3>
		<ul>
			{#each lines as s (s.kind)}
				<li><span class="who">{s.label}:</span> {actorText(actorGap(s.values))}</li>
			{/each}
		</ul>
	{/if}
{/if}

<style>
	h3 {
		font-size: var(--text-md);
		margin: 0 0 0.5rem;
	}

	h3:not(:first-child) {
		margin-top: 1rem;
	}

	dl,
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	dt {
		font-weight: 700;
	}

	dt:not(:first-child) {
		margin-top: 0.5rem;
	}

	dd {
		margin: 0;
	}

	li + li {
		margin-top: 0.25rem;
	}

	.who {
		font-weight: 600;
	}

	.muted {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	p {
		margin: 0.75rem 0 0;
	}

	.hint {
		margin: 0;
	}
</style>
