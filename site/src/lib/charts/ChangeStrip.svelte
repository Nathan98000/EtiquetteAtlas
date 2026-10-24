<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { interval, score } from '#lib/data/format.ts';
	import { DIRECTION_GLYPH, VERDICT, directionText, type StripRow } from './change-model';
	import { directionStyle } from './colors';

	interface Props {
		rows: readonly StripRow[];
		/** The list's accessible name. */
		label: string;
		/** A link per row, such as a society's change page. */
		href?: (key: string) => ResolvedPathname;
	}

	let { rows, label, href }: Props = $props();

	/** The axis: ±1, where every society's and behavior's mean difference falls; beyond is clamped. */
	const MAX = 1;
	const x = (v: number) => ((Math.max(-MAX, Math.min(MAX, v)) + MAX) / (2 * MAX)) * 100;
</script>

<!-- FR-51 (decision 73): a mean difference per row with its 95% interval, from −1 to +1, with one
     decimal like every other score (D-35). The
     whisker is blue or orange beyond the interval and grey within it, and ▲ or ▼ says the same
     without colour; the point is in the text colour. -->
<div class="strip direction" style={directionStyle()}>
	<div class="axis" aria-hidden="true">
		<span class="track"><span>−1</span><span>0</span><span>+1</span></span>
	</div>
	<ol aria-label={label}>
		{#each rows as row (row.key)}
			<li>
				{#if href}
					<a class="label" href={href(row.key)}>{row.label}</a>
				{:else}
					<span class="label">{row.label}</span>
				{/if}
				<span class="visually-hidden">
					{score(row.diff.value)} (95% interval {interval(row.diff.lo, row.diff.hi)}), {directionText(
						row.direction
					)}{row.note ? `; ${row.note}` : ''}
				</span>
				<span class="track" aria-hidden="true">
					<span
						class="whisker dir{row.direction}"
						style="left: {x(row.diff.lo)}%; width: {x(row.diff.hi) - x(row.diff.lo)}%"
					></span>
					<span class="point" style="left: {x(row.diff.value)}%"></span>
				</span>
				<span class="value num" aria-hidden="true"
					>{score(row.diff.value)}<span class="glyph">{DIRECTION_GLYPH[row.direction]}</span
					></span
				>
				<!-- D-4: how sure, in words beside ▲ and ▼. -->
				<span class="note" aria-hidden="true"
					>{[VERDICT[row.direction], row.note].filter(Boolean).join(' · ')}</span
				>
			</li>
		{/each}
	</ol>
</div>

<style>
	.strip {
		font-size: var(--text-sm);
	}

	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.axis,
	li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 4.5rem;
		grid-template-areas: 'label label' 'track value' 'note note';
		gap: 0.125rem 0.75rem;
		align-items: center;
	}

	.axis {
		grid-template-areas: 'track value';
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.axis .track {
		display: flex;
		justify-content: space-between;
		background: none;
	}

	li {
		padding: 0.375rem 0;
		border-top: 1px solid var(--border);
	}

	@media (min-width: 640px) {
		.axis,
		li {
			grid-template-columns: 12rem minmax(0, 1fr) 4.5rem 11rem;
			grid-template-areas: 'label track value note';
		}

		.axis {
			grid-template-areas: '. track value .';
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
		/* 0 as a 3:1 line. */
		background: linear-gradient(var(--border-strong), var(--border-strong)) 50% 0 / 1px 100%
			no-repeat;
	}

	.whisker {
		position: absolute;
		top: calc(50% - 1.5px);
		height: 3px;
		min-width: 2px;
	}

	.whisker.dir1 {
		background: var(--more);
	}

	.whisker.dir-1 {
		background: var(--less);
	}

	.whisker.dir0 {
		background: var(--border-strong);
	}

	.point {
		position: absolute;
		top: 50%;
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		transform: translate(-50%, -50%);
		background: var(--text);
	}

	.value {
		grid-area: value;
		text-align: right;
		white-space: nowrap;
	}

	.glyph {
		display: inline-block;
		width: 1rem;
		text-align: center;
	}

	.note {
		grid-area: note;
		color: var(--text-muted);
	}
</style>
