<script lang="ts" generics="T extends Cell & { headline: string }">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import { BEHAVIOR_TEXT, CELLS, SITUATION_TEXT, type Cell } from '#lib/data/grid.ts';
	import BottomSheet from '#lib/components/BottomSheet.svelte';

	interface Props {
		/** One entry per cell, in grid order; undefined while the data loads. */
		cells: T[] | undefined;
		order: number[];
		/** The list's accessible name. */
		label: string;
		cellLabel: (cell: T) => string;
		/** Fill and ink for the bar (charts/colors.ts). */
		cellStyle: (cell: T) => string | undefined;
		/** The bar's value, drawn from 0, or null for no bar. */
		value: (cell: T) => number | null;
		/** Values beyond ±max reach the track's end with an arrowhead. */
		max: number;
		valueText: (cell: T) => string;
		/** Tags under the situation, such as "Most universal". */
		tags?: Snippet<[T]>;
		/** Marks after the value: fixed-width, so the rows line up. */
		marks: Snippet<[T]>;
		/** The bottom sheet's contents. */
		details: Snippet<[T]>;
		href: (cell: number) => ResolvedPathname;
	}

	let {
		cells,
		order,
		label,
		cellLabel,
		cellStyle,
		value,
		max,
		valueText,
		tags,
		marks,
		details,
		href
	}: Props = $props();

	let open: number | null = $state(null);
</script>

<!-- FR-17: below 640 px a 15 × 10 grid becomes a sortable list of the 150 cells, each with an
     inline bar from 0 and its marks. A tap opens the details; the sheet's link opens the cell. -->
<ol class="list" aria-label={label}>
	{#each order as index (index)}
		{@const cell = cells?.[index]}
		{@const v = cell ? value(cell) : null}
		<li class="score" style={cell ? cellStyle(cell) : undefined}>
			<button
				type="button"
				disabled={!cell}
				aria-label={cell ? cellLabel(cell) : 'Loading'}
				onclick={() => (open = index)}
			>
				<span class="label">
					<span class="behavior">{BEHAVIOR_TEXT[CELLS[index].behavior].label}</span>
					<span class="situation">
						{SITUATION_TEXT[CELLS[index].situation].label}
						{#if cell}{@render tags?.(cell)}{/if}
					</span>
				</span>
				<span class="bar-track" aria-hidden="true">
					{#if v !== null}
						<span
							class="bar"
							class:negative={v < 0}
							class:clamped={Math.abs(v) > max}
							style="--w: {(Math.min(max, Math.abs(v)) / max) * 50}%"
						></span>
					{/if}
				</span>
				<span class="value num" aria-hidden="true">{cell ? valueText(cell) : ''}</span>
				<span class="marks" aria-hidden="true"
					>{#if cell}{@render marks(cell)}{/if}</span
				>
			</button>
		</li>
	{/each}
</ol>

<BottomSheet open={open !== null && !!cells} title="Details" onclose={() => (open = null)}>
	{#if open !== null && cells}
		{@render details(cells[open])}
		<p class="open-link">
			<a class="button" href={href(open)}>Open: {cells[open].headline}</a>
		</p>
	{/if}
</BottomSheet>

<style>
	.list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li + li {
		border-top: 1px solid var(--border);
	}

	button {
		display: grid;
		grid-template-columns: minmax(0, 1fr) clamp(5rem, 32vw, 10rem) 2.5rem auto;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		min-height: 3rem;
		padding: 0.375rem 0;
		border: 0;
		background: none;
		text-align: left;
	}

	.label {
		display: flex;
		flex-direction: column;
		line-height: 1.25;
		min-width: 0;
	}

	.behavior {
		font-weight: 600;
	}

	.situation {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	/* The value as a bar from 0 (the track's middle), in the fill colour, outlined so pale fills
	   still show (NFR-12). */
	.bar-track {
		position: relative;
		height: 1rem;
		border-left: 1px solid transparent;
		background: linear-gradient(var(--border-strong), var(--border-strong)) 50% 0 / 1px 100%
			no-repeat;
	}

	.bar {
		position: absolute;
		top: 0.125rem;
		bottom: 0.125rem;
		left: 50%;
		width: var(--w);
		background: var(--fill);
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}

	.bar.negative {
		left: auto;
		right: 50%;
	}

	/* Beyond the scale: the bar ends in an arrowhead (decision 46). */
	.bar.clamped {
		clip-path: polygon(0 0, calc(100% - 0.5rem) 0, 100% 50%, calc(100% - 0.5rem) 100%, 0 100%);
	}

	.bar.negative.clamped {
		clip-path: polygon(0.5rem 0, 100% 0, 100% 100%, 0.5rem 100%, 0 50%);
	}

	.value {
		text-align: right;
		font-size: var(--text-sm);
	}

	.marks {
		display: flex;
		align-items: center;
	}

	.open-link {
		margin: 1rem 0 0;
	}
</style>
