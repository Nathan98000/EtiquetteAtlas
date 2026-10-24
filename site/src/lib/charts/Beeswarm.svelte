<script lang="ts">
	import { tick } from 'svelte';
	import { scaleLinear } from 'd3-scale';
	import { count, interval, place, score, signed } from '#lib/data/format.ts';
	import { REGIONS, Status } from '#lib/data/model.ts';
	import { REGION_SHAPE, scoreStyle } from './colors';
	import { dodge, extent, type Placed } from './dodge';
	import type { Drill, SocietyPoint } from './drill-model';
	import SocietyTip from './SocietyTip.svelte';
	import TipChoose from './TipChoose.svelte';
	import { TouchPin } from './touch-pin.svelte';
	import { symbolPath } from './symbols';

	interface Props {
		drill: Drill;
		/** FR-20: whiskers for every society, which then take one row each (decision 35). */
		uncertainty: boolean;
		selected: string | null;
		/** Shared with the map, so hover and focus are linked both ways (FR-24). */
		hovered: string | null;
		onhover: (code: string | null) => void;
		onselect: (code: string) => void;
		label: string;
		describedBy: string;
		/**
		 * FR-61: the quiz reader's answer, drawn as a dashed line with its label (decision 79). The
		 * global mean's label then gives way to it, so the two never overlap (D-9); the page names the
		 * solid line instead.
		 */
		marker?: { value: number; label: string };
		/** D-9: one kind of dot, filled by its estimate, so the chart needs no key of regions. */
		plain?: boolean;
	}

	let {
		drill,
		uncertainty,
		selected,
		hovered,
		onhover,
		onselect,
		label,
		describedBy,
		marker,
		plain = false
	}: Props = $props();

	const M = { left: 16, right: 16, top: 30, bottom: 56 };
	/** Half the swarm's band: 294 px in all with the margins (18.375rem, the reserved height). */
	const HALF = 104;
	let width = $state(0);
	let container: HTMLDivElement | undefined = $state();
	/** The society that holds the chart's one tab stop (roving tabindex). */
	let focusCode: string | null = $state(null);
	/** The society whose tooltip this chart shows: hovered or focused here, not on the map. */
	let local: string | null = $state(null);

	const x = $derived(
		scaleLinear()
			.domain([-2.5, 2.5])
			.range([M.left, Math.max(M.left + 1, width - M.right)])
	);

	interface Layout {
		points: Placed<SocietyPoint>[];
		r: number;
		height: number;
		axis: number;
	}

	// A fixed scale (−2.5 to +2.5) keeps cells comparable. The chart keeps one height, so the space
	// reserved for it before the data arrive is the space it takes (NFR-2) and it can open a pair's
	// page (D-5): dots shrink where societies crowd one place, down to a 2 px radius, and only past
	// that does the chart grow (no pair at 375 px or wider; decision 35 amended).
	const layout: Layout = $derived.by(() => {
		const value = (p: SocietyPoint) => p.estimate!.value;
		if (uncertainty) {
			const row = 6;
			const sorted = [...drill.plotted].sort(
				(a, b) => value(b) - value(a) || a.code.localeCompare(b.code)
			);
			const points = sorted.map((item, i) => ({ item, x: x(value(item)), y: i * row }));
			const height = M.top + sorted.length * row + M.bottom;
			return { points, r: 2.75, height, axis: height - M.bottom + 6 };
		}
		let r = width < 480 ? 4.5 : 5.5;
		let points = dodge(
			drill.plotted,
			(p) => x(value(p)),
			(p) => p.code,
			2 * r + 1
		);
		while (extent(points) + r > HALF - 4 && r > 2) {
			r -= 0.25;
			points = dodge(
				drill.plotted,
				(p) => x(value(p)),
				(p) => p.code,
				2 * r + 1
			);
		}
		const half = Math.max(HALF, extent(points) + r + 4);
		const middle = M.top + half;
		return {
			points: points.map((p) => ({ ...p, y: middle + p.y })),
			r,
			height: M.top + 2 * half + M.bottom,
			axis: M.top + 2 * half
		};
	});

	const offset = $derived(uncertainty ? M.top + 3 : 0);
	const shapes = $derived(
		Object.fromEntries(
			REGIONS.map((region) => [
				region,
				symbolPath(plain ? 'circle' : REGION_SHAPE[region], layout.r)
			])
		)
	);
	const order = $derived(layout.points.slice().sort((a, b) => a.x - b.x || a.y - b.y));
	const byCode = $derived(new Map(layout.points.map((p) => [p.item.code, p])));
	const tabStop = $derived(
		(focusCode && byCode.has(focusCode) && focusCode) ||
			(selected && byCode.has(selected) && selected) ||
			order[0]?.item.code
	);
	const pin = new TouchPin(() => container);
	const tip = $derived.by(() => {
		const code = pin.code ?? local;
		return code ? byCode.get(code) : undefined;
	});
	const ticks = [-2, -1, 0, 1, 2];

	function ariaLabel(p: SocietyPoint): string {
		const e = p.estimate!;
		const small = p.status === Status.Small ? ', small sample' : '';
		return (
			`Respondents in ${place(p.code, p.name)}: ${score(e.value)} ` +
			`(95% interval ${interval(e.lo, e.hi)}), ${p.n === null ? '' : count(p.n)} respondents` +
			`${small}, ${p.region}`
		);
	}

	function enter(code: string) {
		local = code;
		onhover(code);
	}

	function leave() {
		local = null;
		onhover(null);
	}

	async function move(code: string | undefined) {
		if (!code) return;
		focusCode = code;
		await tick();
		container?.querySelector<SVGElement>(`[data-code="${code}"]`)?.focus();
	}

	// NFR-13: one tab stop; arrow keys move through societies from low to high, Enter selects.
	function keydown(event: KeyboardEvent, code: string) {
		const i = order.findIndex((p) => p.item.code === code);
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				void move(order[Math.min(order.length - 1, i + 1)]?.item.code);
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				void move(order[Math.max(0, i - 1)]?.item.code);
				break;
			case 'Home':
				void move(order[0]?.item.code);
				break;
			case 'End':
				void move(order[order.length - 1]?.item.code);
				break;
			case 'Enter':
			case ' ':
				onselect(code);
				break;
			case 'Escape':
				local = null;
				pin.close();
				break;
			default:
				return;
		}
		event.preventDefault();
	}
</script>

<div class="beeswarm" bind:this={container} bind:clientWidth={width}>
	{#if width > 0}
		<svg
			{width}
			height={layout.height}
			role="group"
			aria-label={label}
			aria-describedby={describedBy}
		>
			<!-- FR-23: the band where societies typically fall (global mean ± τ) and the mean. -->
			<rect
				class="band"
				x={x(drill.band[0])}
				y={M.top - 6}
				width={Math.max(0, x(drill.band[1]) - x(drill.band[0]))}
				height={layout.axis - M.top + 6}
			/>
			<line class="zero" x1={x(0)} x2={x(0)} y1={M.top - 6} y2={layout.axis} />
			<line class="mean" x1={x(drill.mean)} x2={x(drill.mean)} y1={M.top - 10} y2={layout.axis} />
			{#if marker}
				{@const mx = x(marker.value)}
				<line class="marker" x1={mx} x2={mx} y1={M.top - 10} y2={layout.axis} />
				<text
					class="marker-label"
					x={mx}
					y={M.top - 14}
					text-anchor={marker.value < -1.2 ? 'start' : marker.value > 1.2 ? 'end' : 'middle'}
				>
					{marker.label}
				</text>
			{:else}
				<text
					class="mean-label"
					x={x(drill.mean)}
					y={M.top - 14}
					text-anchor={drill.mean < -1.2 ? 'start' : drill.mean > 1.2 ? 'end' : 'middle'}
				>
					Global average {score(drill.mean)}
				</text>
			{/if}

			<g class="axis" aria-hidden="true">
				<line x1={x(-2.5)} x2={x(2.5)} y1={layout.axis} y2={layout.axis} />
				{#each ticks as t (t)}
					<line x1={x(t)} x2={x(t)} y1={layout.axis} y2={layout.axis + 5} />
					<text x={x(t)} y={layout.axis + 18} text-anchor="middle">{signed(t, 0)}</text>
				{/each}
				<text x={x(-2.5)} y={layout.axis + 38} text-anchor="start">Extremely inappropriate</text>
				<text x={x(2.5)} y={layout.axis + 38} text-anchor="end">Extremely appropriate</text>
			</g>

			<g transform="translate(0 {offset})">
				{#each layout.points as point (point.item.code)}
					{@const p = point.item}
					{@const show = uncertainty || p.code === hovered || p.code === selected}
					{#if show && p.estimate}
						<line
							class="whisker"
							class:strong={p.code === hovered || p.code === selected}
							x1={x(p.estimate.lo)}
							x2={x(p.estimate.hi)}
							y1={point.y}
							y2={point.y}
						/>
					{/if}
				{/each}
				{#each layout.points as point (point.item.code)}
					{@const p = point.item}
					<g
						class="dot score"
						class:plain
						class:small={p.status === Status.Small}
						class:hovered={p.code === hovered}
						style="{scoreStyle(p.estimate!.value)}; transform: translate({point.x}px, {point.y}px)"
						role="button"
						tabindex={p.code === tabStop ? 0 : -1}
						aria-label={ariaLabel(p)}
						aria-pressed={p.code === selected}
						data-code={p.code}
						onmouseenter={() => enter(p.code)}
						onmouseleave={leave}
						onfocus={() => {
							focusCode = p.code;
							enter(p.code);
						}}
						onblur={leave}
						onpointerdown={(event) => pin.down(event)}
						onclick={() => {
							if (pin.click(p.code)) onselect(p.code);
						}}
						onkeydown={(event) => keydown(event, p.code)}
					>
						<path d={shapes[p.region]} />
						{#if p.code === selected || p.code === hovered || p.code === pin.code}
							<circle class="ring" class:selected={p.code === selected} r={layout.r + 4} />
						{/if}
					</g>
				{/each}
				{#if selected && byCode.has(selected)}
					{@const s = byCode.get(selected)!}
					<text
						class="selected-label"
						x={Math.min(Math.max(s.x, M.left + 60), width - M.right - 60)}
						y={s.y - layout.r - 9}
						text-anchor="middle"
						aria-hidden="true"
					>
						{s.item.name}
					</text>
				{/if}
			</g>
		</svg>
		{#if tip}
			<div
				class="tooltip"
				class:pinned={pin.code === tip.item.code}
				class:below={tip.y + offset < 150}
				style="--x: {tip.x}px; --y: {tip.y + offset}px"
				role="presentation"
			>
				<SocietyTip point={tip.item} kind={drill.kind} />
				{#if pin.code === tip.item.code && tip.item.code !== selected}
					<TipChoose
						code={tip.item.code}
						name={tip.item.name}
						onchoose={() => {
							const code = tip.item.code;
							pin.close();
							onselect(code);
						}}
					/>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.beeswarm {
		position: relative;
		/* The chart's one height (HALF above), kept while the data load. */
		min-height: 18.375rem;
	}

	svg {
		display: block;
		overflow: visible;
		font-size: var(--text-sm);
	}

	text {
		fill: var(--text);
	}

	.band {
		fill: var(--surface-muted);
		stroke: var(--border-strong);
		stroke-dasharray: 3 3;
	}

	.zero {
		stroke: var(--border-strong);
	}

	.mean {
		stroke: var(--text);
		stroke-width: 2;
	}

	.mean-label {
		font-weight: 600;
	}

	/* The reader's answer: dashed and thicker than the global mean, in the text colour, so the two
	   are told apart by line style and label rather than hue (NFR-12). */
	.marker {
		stroke: var(--text);
		stroke-width: 3;
		stroke-dasharray: 6 3;
	}

	.marker-label {
		font-weight: 700;
	}

	.axis line {
		stroke: var(--text-muted);
	}

	.axis text {
		fill: var(--text-muted);
	}

	.dot {
		cursor: pointer;
		outline: none;
		transition: transform 250ms ease-out;
	}

	/* D-26: filled by the estimate and shaped by region, as on the map and the share card, and
	   outlined in the text colour for 3:1 (the quiz's plain dots are all circles, D-9). */
	.dot path {
		fill: var(--fill);
		stroke: var(--text);
		stroke-width: 1;
	}

	/* FR-22: small samples (10–29 respondents) get the map's dashed outline. */
	.dot.small path {
		stroke-width: 1.25;
		stroke-dasharray: 2 1.5;
	}

	.ring {
		fill: none;
		stroke: var(--text);
		stroke-width: 1.5;
	}

	.ring.selected {
		stroke-width: 2.5;
	}

	.dot:focus-visible .ring,
	.dot:focus-visible path {
		stroke: var(--focus);
		stroke-width: 3;
	}

	.whisker {
		stroke: var(--text-muted);
		stroke-width: 1;
		opacity: 0.7;
	}

	.whisker.strong {
		stroke: var(--text);
		stroke-width: 2;
		opacity: 1;
	}

	.selected-label {
		font-weight: 700;
		paint-order: stroke;
		stroke: var(--surface);
		stroke-width: 4px;
		stroke-linejoin: round;
	}

	.tooltip {
		position: absolute;
		z-index: 5;
		left: clamp(0px, calc(var(--x) - 8rem), calc(100% - 16rem));
		top: var(--y);
		transform: translateY(calc(-100% - 0.75rem));
		width: min(16rem, 100%);
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface-raised);
		box-shadow: var(--shadow);
		pointer-events: none;
	}

	/* D-14: a tip pinned by a tap holds a button. */
	.tooltip.pinned {
		pointer-events: auto;
	}

	.tooltip.below {
		transform: translateY(0.75rem);
	}
</style>
