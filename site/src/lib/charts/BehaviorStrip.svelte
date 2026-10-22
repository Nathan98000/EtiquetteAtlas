<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { BEHAVIOR_TEXT, BEHAVIORS, CELLS, SITUATION_TEXT, SITUATIONS } from '#lib/data/grid.ts';
	import { score } from '#lib/data/format.ts';
	import { MARK_GLYPH, type MatrixCell } from './matrix-model';

	interface Props {
		/** The matrix model, for the fills, circles and society marks of the row (FR-26). */
		cells: MatrixCell[] | undefined;
		cell: number;
		href: (cell: number) => ResolvedPathname;
	}

	let { cells, cell, href }: Props = $props();

	const behavior = $derived(Math.floor(cell / SITUATIONS.length));
	const row = $derived(SITUATIONS.map((_, s) => behavior * SITUATIONS.length + s));
</script>

<!-- FR-26: the same behavior across all 10 situations, each a link to its own drill-down. -->
<ol class="strip" aria-label="{BEHAVIOR_TEXT[BEHAVIORS[behavior]].label} in each situation">
	{#each row as index (index)}
		{@const c = cells?.[index]}
		<li>
			<a
				href={href(index)}
				aria-current={index === cell ? 'page' : undefined}
				aria-label="{SITUATION_TEXT[CELLS[index].situation].label}{c
					? `: ${score(c.mean)}, disagreement ${c.tau.toFixed(2)}`
					: ''}"
			>
				<span class="square score" class:loading={!c} style={c?.style}>
					{#if c}
						<span class="dot" style="--r: {c.dot}"></span>
						{#if c.mark && MARK_GLYPH[c.mark]}
							<span class="mark" aria-hidden="true">{MARK_GLYPH[c.mark]}</span>
						{/if}
					{/if}
				</span>
				<span class="label">{SITUATION_TEXT[CELLS[index].situation].label}</span>
				<!-- A no-break space keeps the line's height before the data arrives. -->
				<span class="value num" aria-hidden="true">{c ? score(c.mean) : '\u00a0'}</span>
			</a>
		</li>
	{/each}
</ol>

<style>
	.strip {
		display: grid;
		grid-template-columns: repeat(10, minmax(0, 1fr));
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* No sideways scrolling on phones (NFR-21): two rows of five. */
	@media (max-width: 639.98px) {
		.strip {
			grid-template-columns: repeat(5, minmax(0, 1fr));
			row-gap: 0.75rem;
		}
	}

	a {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.125rem;
		border-radius: var(--radius);
		color: var(--text);
		text-decoration: none;
		text-align: center;
	}

	a:hover {
		background: var(--surface-muted);
	}

	a[aria-current='page'] {
		box-shadow: inset 0 0 0 2px var(--text);
		font-weight: 700;
	}

	.square {
		position: relative;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		max-width: 100%;
		background: var(--fill);
		box-shadow: inset 0 0 0 1px var(--border-strong);
		border-radius: 2px;
	}

	.square.loading {
		background: var(--surface-muted);
	}

	.dot {
		width: calc(var(--r) * 64%);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--ink);
	}

	.mark {
		position: absolute;
		top: 1px;
		right: 2px;
		font-size: 0.625rem;
		line-height: 1;
		color: var(--ink);
	}

	.label {
		font-size: var(--text-sm);
		line-height: 1.2;
		hyphens: auto;
	}

	.value {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
</style>
