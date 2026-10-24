<script lang="ts" generics="T extends Cell & { headline: string }">
	import { tick as settle, type Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import {
		BEHAVIORS,
		BEHAVIOR_TEXT,
		CELLS,
		SITUATION_TEXT,
		type Behavior,
		type Cell
	} from '#lib/data/grid.ts';
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
		/** D-13: a second value marked on the track, such as the global average under a society's bar. */
		tick?: (cell: T) => number | null;
		valueText: (cell: T) => string;
		/** Tags under the situation, such as "Most universal". */
		tags?: Snippet<[T]>;
		/** Marks after the value: fixed-width, so the rows line up. */
		marks: Snippet<[T]>;
		/** The bottom sheet's contents. */
		details: Snippet<[T]>;
		href: (cell: number) => ResolvedPathname;
		/** Rows shown before "Show all", or every row (D-20: a fingerprint's list on a phone). */
		limit?: number;
		/** D-12: in paper order the rows run by behavior, and a picker jumps to one. */
		jump?: boolean;
	}

	let {
		cells,
		order,
		label,
		cellLabel,
		cellStyle,
		value,
		max,
		tick,
		valueText,
		tags,
		marks,
		details,
		href,
		limit,
		jump = false
	}: Props = $props();

	let open: number | null = $state(null);
	let all = $state(false);
	const listId = $props.id();
	const shown = $derived(limit && !all ? order.slice(0, limit) : order);
	const at = (v: number) => 50 + (Math.max(-max, Math.min(max, v)) / max) * 50;

	let target: Behavior = $state(BEHAVIORS[0]);

	// D-12: show the behavior's first row, with focus on it, below the sticky bar.
	async function jumpTo() {
		const i = order.findIndex((index) => CELLS[index].behavior === target);
		if (i < 0) return;
		if (limit && i >= limit) all = true;
		await settle();
		const row = document.getElementById(`${listId}-${order[i]}`);
		row?.scrollIntoView({ block: 'start' });
		row?.querySelector('button')?.focus({ preventScroll: true });
	}
</script>

{#if jump}
	<form
		class="jump"
		onsubmit={(event) => {
			event.preventDefault();
			void jumpTo();
		}}
	>
		<label for="{listId}-jump">Jump to a behavior</label>
		<select id="{listId}-jump" bind:value={target}>
			{#each BEHAVIORS as behavior (behavior)}
				<option value={behavior}>{BEHAVIOR_TEXT[behavior].label}</option>
			{/each}
		</select>
		<button type="submit" class="button">Go</button>
	</form>
{/if}

<!-- FR-17: below 640 px a 15 × 10 grid becomes a sortable list of the 150 cells, each with an
     inline bar from 0 and its marks. A tap opens the details; the sheet's link opens the cell. -->
<ol id={listId} class="list" aria-label={label}>
	{#each shown as index (index)}
		{@const cell = cells?.[index]}
		{@const v = cell ? value(cell) : null}
		{@const t = cell && tick ? tick(cell) : null}
		<li id="{listId}-{index}" class="score" style={cell ? cellStyle(cell) : undefined}>
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
					{#if t !== null}
						<span class="tick" style="--t: {at(t)}%"></span>
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

{#if limit && order.length > limit}
	<button
		type="button"
		class="button more"
		aria-controls={listId}
		aria-expanded={all}
		onclick={() => (all = !all)}
	>
		{all ? `Show the first ${limit}` : `Show all ${order.length} pairs`}
	</button>
{/if}

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

	/* Below the sticky control bar (§6.2) when a jump brings the row up. */
	li {
		scroll-margin-top: 7rem;
	}

	.jump {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.jump label {
		flex-basis: 100%;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.jump select {
		flex: 1 1 10rem;
		min-height: 2.75rem;
	}

	.more {
		margin-top: 0.75rem;
	}

	.list button {
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

	/* D-13: the global average across the society's bar. */
	.tick {
		position: absolute;
		top: -0.125rem;
		bottom: -0.125rem;
		left: calc(var(--t) - 1px);
		width: 2px;
		background: var(--text);
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
