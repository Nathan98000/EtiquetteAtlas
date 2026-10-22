<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { score } from '#lib/data/format.ts';
	import type { Comparison } from './compare-model';
	import SeriesKey from './SeriesKey.svelte';

	interface Props {
		comparison: Comparison;
		/** Society names, the page's first: "Chile", "Japan". */
		names: [string, string];
		href: (cell: number) => ResolvedPathname;
	}

	let { comparison, names, href }: Props = $props();

	/** Rows shown before "Show all" (decision 49). */
	const FIRST = 25;
	let all = $state(false);
	const rows = $derived(all ? comparison.pairs : comparison.pairs.slice(0, FIRST));
	/** A score's position on the −2.5 to +2.5 track, in percent. */
	const x = (value: number) => ((Math.max(-2.5, Math.min(2.5, value)) + 2.5) / 5) * 100;
</script>

<!-- FR-33: the two societies' shrunken estimates for each pair as a dumbbell: ● the page's
     society, ○ the other, told apart by shape, since blue and orange mean appropriateness and the
     region colours mean regions. Largest gaps first; each label opens the pair's drill-down. -->
<div class="dumbbell">
	<SeriesKey
		items={[
			{ label: `Respondents in ${names[0]}`, mark: 'dot' },
			{ label: `Respondents in ${names[1]}`, mark: 'ring' },
			{ label: 'Global mean', mark: 'vtick' }
		]}
	/>
	<div class="axis" aria-hidden="true">
		<span>−2.5 extremely inappropriate</span><span>0</span><span>+2.5 extremely appropriate</span>
	</div>
	<ol id="dumbbell-rows" class="rows">
		{#each rows as pair (pair.index)}
			{@const [xa, xb] = [x(pair.a.value), x(pair.b.value)]}
			<li>
				<a class="label" href={href(pair.index)}>{pair.headline}</a>
				<span class="visually-hidden">
					{names[0]}
					{score(pair.a.value)}; {names[1]}
					{score(pair.b.value)}; gap {score(pair.gap)}
				</span>
				<span class="track" aria-hidden="true">
					<span class="tick" style="left: {x(pair.global)}%"></span>
					<span class="line" style="left: {Math.min(xa, xb)}%; width: {Math.abs(xa - xb)}%"></span>
					<span class="dot b" style="left: {xb}%"></span>
					<span class="dot a" style="left: {xa}%"></span>
				</span>
				<span class="gap num" aria-hidden="true">{score(pair.gap)}</span>
			</li>
		{/each}
	</ol>
	{#if comparison.pairs.length > FIRST}
		<button
			type="button"
			class="button more"
			aria-controls="dumbbell-rows"
			aria-expanded={all}
			onclick={() => (all = !all)}
		>
			{all
				? `Show the ${FIRST} largest gaps`
				: `Show all ${comparison.pairs.length} pairs both can show`}
		</button>
	{/if}
	{#if comparison.unmatched.length}
		<details>
			<summary>{comparison.unmatched.length} pairs not compared</summary>
			<ul class="unmatched">
				{#each comparison.unmatched as pair (pair.index)}
					<li>{pair.headline}: {pair.reason}</li>
				{/each}
			</ul>
		</details>
	{/if}
</div>

<style>
	.dumbbell {
		font-size: var(--text-sm);
	}

	ul,
	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.axis {
		display: flex;
		justify-content: space-between;
		margin-right: 3.75rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.rows li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 3rem;
		grid-template-areas: 'label label' 'track gap';
		gap: 0.125rem 0.75rem;
		padding: 0.375rem 0;
		border-top: 1px solid var(--border);
	}

	/* From 640 px the label sits beside its track. */
	@media (min-width: 640px) {
		.axis {
			margin-left: calc(16rem + 0.75rem);
		}

		.rows li {
			grid-template-columns: 16rem minmax(0, 1fr) 3rem;
			grid-template-areas: 'label track gap';
			align-items: center;
		}
	}

	.label {
		grid-area: label;
		line-height: 1.3;
	}

	.track {
		grid-area: track;
		position: relative;
		height: 1.25rem;
		/* 0, the scale's midpoint, as a faint line. */
		background: linear-gradient(var(--border), var(--border)) 50% 0 / 1px 100% no-repeat;
	}

	.line {
		position: absolute;
		top: calc(50% - 1px);
		height: 2px;
		background: var(--border-strong);
	}

	.tick {
		position: absolute;
		top: 0.125rem;
		bottom: 0.125rem;
		display: inline-block;
		width: 2px;
		min-height: 1rem;
		transform: translateX(-1px);
		background: var(--text-muted);
	}

	/* ● the page's society, ○ the other, both in the text colour (3:1 and more, NFR-12). */
	.dot {
		position: absolute;
		top: 50%;
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		transform: translate(-50%, -50%);
	}

	.dot.a {
		background: var(--text);
	}

	.dot.b {
		background: var(--surface);
		box-shadow: inset 0 0 0 2px var(--text);
	}

	.gap {
		grid-area: gap;
		text-align: right;
	}

	.more {
		margin-top: 0.75rem;
	}

	details {
		margin-top: 1rem;
	}

	summary {
		cursor: pointer;
		padding: 0.25rem 0;
	}

	.unmatched {
		padding-left: 1.25rem;
		list-style: disc;
	}
</style>
