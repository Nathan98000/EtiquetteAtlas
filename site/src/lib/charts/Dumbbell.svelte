<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { score } from '#lib/data/format.ts';
	import { DIRECTION_GLYPH } from './change-model';
	import { directionStyle } from './colors';
	import {
		ARROW_DOT,
		DOT,
		RING,
		arrow as arrowOf,
		xOf,
		type PairRow,
		type Unpaired
	} from './dumbbell-model';
	import SeriesKey, { type KeyItem } from './SeriesKey.svelte';

	interface Props {
		/** The list's id is `${id}-rows`. */
		id: string;
		/** In the order shown. */
		rows: readonly PairRow[];
		unpaired: readonly Unpaired[];
		key: readonly KeyItem[];
		/** The list's accessible name. */
		label: string;
		/** Draw an arrow from ○ to ●, coloured by `direction` (FR-50, decision 69). */
		arrow?: boolean;
		/** The buttons: "Show the 25 largest gaps", "Show all 150 pairs both can show". */
		showFirst: string;
		showAll: string;
		/** The summary of the pairs set apart: "pairs not compared". */
		unpairedLabel: string;
		/** A note under the key, such as what the arrows' colours mean. */
		note?: string;
		href: (cell: number) => ResolvedPathname;
		/** Hover or focus on a row (FR-13): the details panel follows it. */
		onpreview?: (cell: number) => void;
		/** Rows shown before "Show all": 25 (decision 49), or 5 in the story (D-22). */
		first?: number;
	}

	let {
		id,
		rows,
		unpaired,
		key,
		label,
		arrow = false,
		showFirst,
		showAll,
		unpairedLabel,
		note,
		href,
		onpreview,
		first = 25
	}: Props = $props();

	let all = $state(false);
	const shown = $derived(all ? rows : rows.slice(0, first));
	/** The track's width in px, measured from the axis above the rows. */
	let width = $state(0);
	const HEIGHT = 20;
	const Y = HEIGHT / 2;
	const dot = $derived(arrow ? ARROW_DOT : DOT);
</script>

<!-- Two values per row (FR-33, FR-50): ● the page's own value and ○ the one it is compared with,
     told apart by shape in the text colour (decisions 49 and 69). With `arrow`, a shaft and head run
     from ○ to ●, blue or orange when the difference is beyond its interval and grey within it; ▲ or
     ▼ after the difference says the same without colour. Each label opens the pair's drill-down. -->
<div
	class="dumbbell"
	class:arrows={arrow}
	class:direction={arrow}
	style={arrow ? directionStyle() : undefined}
>
	<SeriesKey items={key} />
	{#if note}<p class="note">{note}</p>{/if}
	<div class="axis" aria-hidden="true">
		<span class="axis-track" bind:clientWidth={width}>
			<span>−2.5<span class="words">extremely inappropriate</span></span><span>0</span><span
				>+2.5<span class="words">extremely appropriate</span></span
			>
		</span>
	</div>
	<ol id="{id}-rows" class="rows" aria-label={label}>
		{#each shown as row (row.index)}
			{@const [xa, xb] = [xOf(row.a, width), xOf(row.b, width)]}
			{@const shaft = arrow && width ? arrowOf(xb, xa, Y) : null}
			<li onmouseenter={() => onpreview?.(row.index)}>
				<a class="label" href={href(row.index)} onfocus={() => onpreview?.(row.index)}>
					{row.headline}
				</a>
				<span class="visually-hidden">{row.text}</span>
				<svg class="track" {width} height={HEIGHT} aria-hidden="true">
					{#if width}
						<line class="zero" x1={xOf(0, width)} x2={xOf(0, width)} y1="0" y2={HEIGHT} />
						{#if row.reference !== undefined}
							{@const xr = xOf(row.reference, width)}
							<line class="tick" x1={xr} x2={xr} y1="2" y2={HEIGHT - 2} />
						{/if}
						{#if arrow}
							{#if shaft}
								<g class="shaft dir{row.direction ?? 0}">
									<line x1={shaft.x1} x2={shaft.x2} y1={Y} y2={Y} />
									<path d={shaft.head} />
								</g>
							{/if}
						{:else}
							<line class="line" x1={Math.min(xa, xb)} x2={Math.max(xa, xb)} y1={Y} y2={Y} />
						{/if}
						<circle class="ring" cx={xb} cy={Y} r={RING} />
						<circle class="dot" cx={xa} cy={Y} r={dot} />
						{#if row.small?.b}
							<circle class="small" cx={xb} cy={Y} r={RING + 3} />
						{/if}
						{#if row.small?.a}
							<circle class="small" cx={xa} cy={Y} r={(row.small.b ? RING : dot) + 3} />
						{/if}
					{/if}
				</svg>
				<span class="gap num" aria-hidden="true">
					{score(row.gap)}{#if arrow}<span class="glyph">{DIRECTION_GLYPH[row.direction ?? 0]}</span
						>{/if}
				</span>
				{#if row.values}
					<span class="values" aria-hidden="true">{row.values}</span>
				{/if}
			</li>
		{/each}
	</ol>
	{#if rows.length > first}
		<button
			type="button"
			class="button more"
			aria-controls="{id}-rows"
			aria-expanded={all}
			onclick={() => (all = !all)}
		>
			{all ? showFirst : showAll}
		</button>
	{/if}
	{#if unpaired.length}
		<details>
			<summary>{unpaired.length} {unpairedLabel}</summary>
			<ul class="unpaired">
				{#each unpaired as pair (pair.index)}
					<li>{pair.headline}: {pair.reason}</li>
				{/each}
			</ul>
		</details>
	{/if}
</div>

<style>
	.dumbbell {
		--gap-width: 3rem;
		font-size: var(--text-sm);
	}

	.arrows {
		--gap-width: 4rem;
	}

	.note {
		max-width: var(--measure);
		margin: -0.25rem 0 0.75rem;
		color: var(--text-muted);
	}

	ul,
	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.axis,
	.rows li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--gap-width);
		gap: 0.125rem 0.75rem;
	}

	.axis {
		grid-template-areas: 'track gap';
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.axis-track {
		grid-area: track;
		display: flex;
		justify-content: space-between;
		min-width: 0;
	}

	/* Below 640 px the axis shows numbers only, so its labels never collide. */
	.words {
		display: none;
	}

	.rows li {
		grid-template-areas: 'label label' 'track gap' 'values values';
		padding: 0.375rem 0;
		border-top: 1px solid var(--border);
	}

	.rows li:hover,
	.rows li:focus-within {
		background: var(--surface-muted);
	}

	/* From 640 px the label sits beside its track. */
	@media (min-width: 640px) {
		.axis,
		.rows li {
			grid-template-columns: 16rem minmax(0, 1fr) var(--gap-width);
		}

		.axis {
			grid-template-areas: '. track gap';
		}

		.words {
			display: inline;
			margin-left: 0.3em;
		}

		.rows li {
			grid-template-areas: 'label track gap' '. values values';
			align-items: center;
		}
	}

	.label {
		grid-area: label;
		line-height: 1.3;
	}

	.track {
		grid-area: track;
		display: block;
		width: 100%;
		height: 1.25rem;
		overflow: visible;
	}

	.zero {
		stroke: var(--border);
	}

	.line {
		stroke: var(--border-strong);
		stroke-width: 2;
	}

	.tick {
		stroke: var(--text-muted);
		stroke-width: 2;
	}

	/* ● and ○ in the text colour: 3:1 and more on both surfaces (NFR-12). */
	.dot {
		fill: var(--text);
	}

	.ring {
		fill: var(--surface);
		stroke: var(--text);
		stroke-width: 2;
	}

	/* A small sample (10 to 29): a dashed ring, as on the map and the slopegraph. */
	.small {
		fill: none;
		stroke: var(--text);
		stroke-width: 1.5;
		stroke-dasharray: 2 2;
	}

	/* Decision 69: blue more appropriate in 2023–2024, orange less, beyond the interval; grey
	   within it. All three reach 3:1 on both surfaces (colors.spec.ts). */
	.shaft line {
		stroke-width: 2;
	}

	.shaft.dir1 {
		stroke: var(--more);
		fill: var(--more);
	}

	.shaft.dir-1 {
		stroke: var(--less);
		fill: var(--less);
	}

	.shaft.dir0 {
		stroke: var(--border-strong);
		fill: var(--border-strong);
	}

	.gap {
		grid-area: gap;
		text-align: right;
		white-space: nowrap;
	}

	.glyph {
		display: inline-block;
		width: 1rem;
		text-align: center;
	}

	.values {
		grid-area: values;
		color: var(--text-muted);
	}

	/* The details panel shows these from 1024 px. */
	@media (min-width: 1024px) {
		.values {
			display: none;
		}
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

	.unpaired {
		padding-left: 1.25rem;
		list-style: disc;
	}
</style>
