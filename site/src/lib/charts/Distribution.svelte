<script lang="ts">
	import { RESPONSES, count, percent } from '#lib/data/format.ts';
	import type { ResponseCounts } from '#lib/data/model.ts';
	import { shares, type Response } from '#lib/quiz/quiz-model.ts';
	import { scoreStyle } from './colors';

	interface Props {
		counts: ResponseCounts;
		/** The quiz reader's answer, marked by an outline and in words. */
		answer: Response | null;
		/** The list's accessible name. */
		label: string;
	}

	let { counts, answer, label }: Props = $props();

	const s = $derived(shares(counts));
	const max = $derived(Math.max(...s, 1));
</script>

<!-- FR-61: a society's six responses for one cell as bars, filled by the appropriateness scale as
     on the matrix and outlined at 3:1, with each share in words; the reader's answer is outlined
     in the text colour and labelled, so it never rests on colour alone (decision 79). -->
<ol class="distribution" aria-label={label}>
	{#each RESPONSES as response, i (response)}
		{@const mine = answer === i + 1}
		<li class:mine>
			<span class="label">
				{response}
				{#if mine}<strong class="tag">your answer</strong>{/if}
			</span>
			<span class="track" aria-hidden="true">
				<span class="bar score" style="{scoreStyle(i - 2.5)}; width: {(s[i] / max) * 100}%"></span>
			</span>
			<span class="value num">
				{percent(s[i])}<span class="visually-hidden"> ({count(counts.counts[i])} respondents)</span>
			</span>
		</li>
	{/each}
</ol>

<style>
	.distribution {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	li {
		display: grid;
		grid-template-columns: minmax(0, 11rem) minmax(0, 1fr) 3rem;
		align-items: center;
		gap: 0.75rem;
		padding: 0.25rem 0.5rem;
		border: 2px solid transparent;
		border-radius: var(--radius);
	}

	li.mine {
		border-color: var(--text);
	}

	.label {
		line-height: 1.3;
	}

	.tag {
		display: block;
		font-size: 0.75rem;
	}

	.track {
		height: 1rem;
	}

	.bar {
		display: block;
		height: 100%;
		min-width: 2px;
		background: var(--fill);
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}

	.value {
		text-align: right;
	}
</style>
