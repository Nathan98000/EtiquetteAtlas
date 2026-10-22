<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { BEHAVIOR_TEXT, CELLS, SITUATION_TEXT } from '#lib/data/grid.ts';
	import { score } from '#lib/data/format.ts';
	import type { Scale } from '#lib/data/model.ts';
	import BottomSheet from '#lib/components/BottomSheet.svelte';
	import CellDetails from './CellDetails.svelte';
	import { MARK_GLYPH, cellLabel, type MatrixCell, type SelectedSociety } from './matrix-model';

	interface Props {
		cells: MatrixCell[] | undefined;
		order: number[];
		scale: Scale;
		society?: SelectedSociety;
		societyReady: boolean;
		href: (cell: number) => ResolvedPathname;
	}

	let { cells, order, scale, society, societyReady, href }: Props = $props();

	let open: number | null = $state(null);
	const MAX = 2.5;
</script>

<!-- FR-17: below 640 px the matrix becomes a sortable list of the 150 cells, each with an inline
     mean bar and a disagreement circle. A tap opens the details; the sheet's link opens the cell. -->
<ol class="list" aria-label="150 behavior–situation pairs">
	{#each order as index (index)}
		{@const cell = cells?.[index]}
		<li class="score" style={cell?.style}>
			<button
				type="button"
				disabled={!cell}
				aria-label={cell ? cellLabel(cell, society) : 'Loading'}
				onclick={() => (open = index)}
			>
				<span class="label">
					<span class="behavior">{BEHAVIOR_TEXT[CELLS[index].behavior].label}</span>
					<span class="situation">
						{SITUATION_TEXT[CELLS[index].situation].label}
						{#if cell?.universal}<span class="tag">Most universal</span>{/if}
						{#if cell?.dependent}<span class="tag">Most culture-dependent</span>{/if}
					</span>
				</span>
				<span class="bar-track" aria-hidden="true">
					{#if cell}
						<span
							class="bar"
							class:negative={cell.mean < 0}
							style="--w: {(Math.min(MAX, Math.abs(cell.mean)) / MAX) * 50}%"
						></span>
					{/if}
				</span>
				<span class="value num" aria-hidden="true">{cell ? score(cell.mean) : ''}</span>
				<span class="dot-box" aria-hidden="true">
					{#if cell}<span class="dot" style="--r: {cell.dot}"></span>{/if}
				</span>
				<span class="mark" aria-hidden="true">{cell?.mark ? MARK_GLYPH[cell.mark] : ''}</span>
			</button>
		</li>
	{/each}
</ol>

<BottomSheet open={open !== null && !!cells} title="Details" onclose={() => (open = null)}>
	{#if open !== null && cells}
		<CellDetails cell={cells[open]} {scale} {society} {societyReady} />
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
		grid-template-columns: minmax(0, 1fr) clamp(5rem, 32vw, 10rem) 2.5rem var(--cell) 0.875rem;
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

	.tag {
		display: block;
		width: fit-content;
		margin-top: 0.125rem;
		white-space: nowrap;
		padding: 0 0.375rem;
		border: 1px solid var(--text);
		border-radius: 999px;
		color: var(--text);
		font-size: 0.75rem;
	}

	/* FR-17: the mean as a bar from 0 (the track's middle), in the fill colour, outlined so pale
	   fills still show (NFR-12). */
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

	.value {
		text-align: right;
		font-size: var(--text-sm);
	}

	.dot-box {
		display: grid;
		place-items: center;
		width: var(--cell);
		height: var(--cell);
	}

	.dot {
		width: calc(var(--r) * 64%);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--text);
	}

	.mark {
		font-size: 0.75rem;
	}

	.open-link {
		margin: 1rem 0 0;
	}
</style>
