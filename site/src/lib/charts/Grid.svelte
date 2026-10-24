<script lang="ts" generics="T">
	import { tick, type Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import { BEHAVIOR_TEXT, BEHAVIORS, SITUATION_TEXT, SITUATIONS } from '#lib/data/grid.ts';

	interface Props {
		/** One entry per cell, in grid order; undefined while the data loads, when the grid keeps
		 *  its size so nothing shifts. */
		cells: T[] | undefined;
		rows: number[];
		columns: number[];
		/** The grid's accessible name. */
		label: string;
		/** A cell's fill and ink (charts/colors.ts); undefined leaves it unfilled, with a dashed
		 *  edge, for a cell with nothing to show. */
		cellStyle: (cell: T) => string | undefined;
		cellLabel: (cell: T) => string;
		href: (cell: number) => ResolvedPathname;
		/** What a cell holds: circles, marks, rings. */
		content: Snippet<[T]>;
		/** The tooltip's contents. */
		details: Snippet<[T]>;
		/** The cell under the pointer or keyboard focus, for a details panel. */
		onpreview: (cell: number | null) => void;
		describedBy: string;
		tooltipId: string;
	}

	let {
		cells,
		rows,
		columns,
		label,
		cellStyle,
		cellLabel,
		href,
		content,
		details,
		onpreview,
		describedBy,
		tooltipId
	}: Props = $props();

	const width = SITUATIONS.length;
	let container: HTMLDivElement | undefined = $state();
	/** The one cell in the tab order (roving tabindex). */
	let active = $state(0);
	let preview: number | null = $state(null);
	let tooltip = $state({ x: 0, y: 0, below: false });
	let pointerType = '';

	function show(cell: number, anchor: HTMLElement) {
		preview = cell;
		onpreview(cell);
		if (!container) return;
		const box = container.getBoundingClientRect();
		const rect = anchor.getBoundingClientRect();
		tooltip = {
			x: rect.left + rect.width / 2 - box.left,
			y: rect.top - box.top,
			below: rect.top - box.top < 220
		};
		if (tooltip.below) tooltip.y = rect.bottom - box.top;
	}

	function hide() {
		preview = null;
		onpreview(null);
	}

	async function focusCell(cell: number) {
		active = cell;
		await tick();
		container?.querySelector<HTMLElement>(`[data-cell="${cell}"]`)?.focus();
	}

	// NFR-13: arrow keys move through the grid in its displayed order; Enter opens the cell.
	function keydown(event: KeyboardEvent, cell: number) {
		const r = rows.indexOf(Math.floor(cell / width));
		const c = columns.indexOf(cell % width);
		const at = (row: number, column: number) => rows[row] * width + columns[column];
		let next: number | undefined;
		switch (event.key) {
			case 'ArrowRight':
				next = c < columns.length - 1 ? at(r, c + 1) : undefined;
				break;
			case 'ArrowLeft':
				next = c > 0 ? at(r, c - 1) : undefined;
				break;
			case 'ArrowDown':
				next = r < rows.length - 1 ? at(r + 1, c) : undefined;
				break;
			case 'ArrowUp':
				next = r > 0 ? at(r - 1, c) : undefined;
				break;
			case 'Home':
				next = event.ctrlKey ? at(0, 0) : at(r, 0);
				break;
			case 'End':
				next = event.ctrlKey ? at(rows.length - 1, columns.length - 1) : at(r, columns.length - 1);
				break;
			case 'Escape':
				// §6.3: Escape closes the tooltip.
				if (preview !== null) {
					event.preventDefault();
					hide();
				}
				return;
			default:
				return;
		}
		event.preventDefault();
		if (next !== undefined) void focusCell(next);
	}

	// §6.3: on touch, the first tap shows the details and the second opens the cell.
	function click(event: MouseEvent, cell: number) {
		if (pointerType === 'touch' && preview !== cell) {
			event.preventDefault();
			show(cell, event.currentTarget as HTMLElement);
		}
	}
</script>

<!-- The shared 15 × 10 grid of the matrix (FR-10) and the fingerprint (FR-30): one tab stop,
     arrow keys, details on hover and focus, and a link per cell (FR-13, FR-14, NFR-13). -->
<div class="grid-chart" bind:this={container} onmouseleave={hide} role="presentation">
	<table role="grid" aria-label={label} aria-describedby={describedBy}>
		<thead>
			<tr>
				<th scope="col" class="corner"><span class="visually-hidden">Behavior</span></th>
				{#each columns as s (s)}
					<th scope="col"><span class="column">{SITUATION_TEXT[SITUATIONS[s]].label}</span></th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as b (b)}
				<tr>
					<th scope="row">{BEHAVIOR_TEXT[BEHAVIORS[b]].label}</th>
					{#each columns as s (s)}
						{@const index = b * width + s}
						{@const cell = cells?.[index]}
						{@const style = cell ? cellStyle(cell) : undefined}
						<td role="gridcell" class="score" {style}>
							<a
								href={href(index)}
								data-cell={index}
								tabindex={index === active ? 0 : -1}
								class:loading={!cell}
								class:empty={cell && !style}
								aria-label={cell ? cellLabel(cell) : 'Loading'}
								aria-describedby={preview === index ? tooltipId : undefined}
								onfocus={(event) => {
									active = index;
									show(index, event.currentTarget);
								}}
								onblur={hide}
								onmouseenter={(event) => show(index, event.currentTarget)}
								onpointerdown={(event) => (pointerType = event.pointerType)}
								onclick={(event) => click(event, index)}
								onkeydown={(event) => keydown(event, index)}
							>
								{#if cell}{@render content(cell)}{/if}
							</a>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	{#if preview !== null && cells}
		<div
			id={tooltipId}
			class="tooltip"
			class:below={tooltip.below}
			style="--x: {tooltip.x}px; --y: {tooltip.y}px"
		>
			{@render details(cells[preview])}
		</div>
	{/if}
</div>

<style>
	.grid-chart {
		position: relative;
		/* Room for the last column's slanted label, so nothing scrolls sideways (NFR-21). */
		padding-right: 3.5rem;
	}

	/* Cells are var(--cell) square, set by the page from the frame's width, so the legend's
	   reference marks match them. */
	table {
		table-layout: fixed;
		width: calc(9.5rem + 10 * (var(--cell) + 2px) + 2px);
		border-collapse: separate;
		border-spacing: 2px;
	}

	.corner {
		width: 9.5rem;
	}

	td,
	thead th {
		width: var(--cell);
	}

	thead th {
		height: 6.5rem;
		vertical-align: bottom;
		padding: 0;
		font-weight: 400;
		font-size: var(--text-sm);
		position: relative;
	}

	.column {
		position: absolute;
		left: 50%;
		bottom: 0.375rem;
		transform-origin: 0 100%;
		transform: rotate(-50deg);
		white-space: nowrap;
	}

	tbody th {
		padding-right: 0.5rem;
		font-weight: 400;
		font-size: var(--text-sm);
		text-align: right;
		line-height: 1.2;
	}

	td {
		padding: 0;
	}

	a {
		position: relative;
		display: grid;
		place-items: center;
		width: var(--cell);
		height: var(--cell);
		background: var(--fill);
		/* The outline gives near-neutral cells a 3:1 edge against the page (NFR-12). */
		box-shadow: inset 0 0 0 1px var(--border-strong);
		border-radius: 2px;
		text-decoration: none;
	}

	a.loading {
		background: var(--surface-muted);
	}

	/* Nothing to show (FR-27): no fill, a dashed 3:1 edge, and the mark inside (decision 46). */
	a.empty {
		background: none;
		box-shadow: none;
		border: 1px dashed var(--border-strong);
		color: var(--text);
	}

	a:hover {
		box-shadow:
			inset 0 0 0 2px var(--text),
			inset 0 0 0 3px var(--surface);
	}

	a.empty:hover {
		box-shadow: inset 0 0 0 1px var(--text);
	}

	.tooltip {
		position: absolute;
		z-index: 5;
		left: clamp(0px, calc(var(--x) - 9rem), calc(100% - 18rem));
		top: var(--y);
		transform: translateY(calc(-100% - 0.5rem));
		width: min(18rem, 100%);
		padding: 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface-raised);
		box-shadow: var(--shadow);
		pointer-events: none;
		font-size: var(--text-md);
	}

	.tooltip.below {
		transform: translateY(0.5rem);
	}

	/* ≥ 1024 px the details panel beside the grid shows the same values (§6.2). */
	@media (min-width: 1024px) {
		.tooltip {
			display: none;
		}
	}
</style>
