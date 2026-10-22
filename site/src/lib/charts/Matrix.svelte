<script lang="ts">
	import { tick } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import { BEHAVIOR_TEXT, BEHAVIORS, SITUATION_TEXT, SITUATIONS } from '#lib/data/grid.ts';
	import type { Scale } from '#lib/data/model.ts';
	import CellDetails from './CellDetails.svelte';
	import { MARK_GLYPH, cellLabel, type MatrixCell, type SelectedSociety } from './matrix-model';

	interface Props {
		/** Undefined while the data loads: the grid keeps its size, so nothing shifts. */
		cells: MatrixCell[] | undefined;
		rows: number[];
		columns: number[];
		scale: Scale;
		society?: SelectedSociety;
		societyReady: boolean;
		href: (cell: number) => ResolvedPathname;
		/** The cell under the pointer or keyboard focus, for the details panel. */
		onpreview: (cell: number | null) => void;
		describedBy: string;
	}

	let { cells, rows, columns, scale, society, societyReady, href, onpreview, describedBy }: Props =
		$props();

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

<div class="matrix" bind:this={container} onmouseleave={hide} role="presentation">
	<table
		role="grid"
		aria-label="Global average and disagreement for 15 behaviors in 10 situations"
		aria-describedby={describedBy}
	>
		<thead>
			<tr>
				<td class="corner"></td>
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
						<td role="gridcell" class="score" style={cell?.style}>
							<a
								href={href(index)}
								data-cell={index}
								tabindex={index === active ? 0 : -1}
								class:loading={!cell}
								class:universal={cell?.universal}
								class:dependent={cell?.dependent}
								aria-label={cell ? cellLabel(cell, society) : 'Loading'}
								aria-describedby={preview === index ? 'matrix-tooltip' : undefined}
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
								{#if cell}
									<span class="dot" style="--r: {cell.dot}"></span>
									{#if cell.mark && MARK_GLYPH[cell.mark]}
										<span class="mark" aria-hidden="true">{MARK_GLYPH[cell.mark]}</span>
									{/if}
								{/if}
							</a>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	{#if preview !== null && cells}
		<div
			id="matrix-tooltip"
			class="tooltip"
			class:below={tooltip.below}
			style="--x: {tooltip.x}px; --y: {tooltip.y}px"
		>
			<CellDetails cell={cells[preview]} {scale} {society} {societyReady} />
		</div>
	{/if}
</div>

<style>
	.matrix {
		position: relative;
		/* Room for the last column's slanted label, so nothing scrolls sideways (NFR-21). */
		padding-right: 3.5rem;
	}

	/* Cells are var(--cell) square, set by the page from the frame's width, so the legend's
	   reference circles match them. */
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

	a:hover {
		box-shadow: inset 0 0 0 2px var(--ink);
	}

	/* FR-16: a solid ring marks the most universal cell, a double ring the most culture-dependent. */
	a.universal {
		box-shadow: inset 0 0 0 3px var(--ink);
	}

	a.dependent {
		box-shadow:
			inset 0 0 0 2px var(--ink),
			inset 0 0 0 4px var(--fill),
			inset 0 0 0 6px var(--ink);
	}

	/* FR-11: disagreement as the circle's area, in the ink that contrasts with the fill. */
	.dot {
		width: calc(var(--r) * 64%);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--ink);
	}

	.mark {
		position: absolute;
		top: 1px;
		right: 3px;
		font-size: 0.6875rem;
		line-height: 1;
		color: var(--ink);
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

	/* ≥ 1024 px the details panel beside the matrix shows the same values (§6.2). */
	@media (min-width: 1024px) {
		.tooltip {
			display: none;
		}
	}
</style>
