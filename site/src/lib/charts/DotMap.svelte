<script lang="ts">
	import { tick } from 'svelte';
	import { geoEqualEarth, geoPath } from 'd3-geo';
	import { feature } from 'topojson-client';
	import LoadError from '#lib/components/LoadError.svelte';
	import { count, interval, place, score } from '#lib/data/format.ts';
	import { loadLand } from '#lib/data/load.ts';
	import { REGIONS, Status } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { REGION_SHAPE, scoreStyle } from './colors';
	import type { Drill, SocietyPoint } from './drill-model';
	import { MAP_NORTH, MAP_SOUTH } from './map-model';
	import SocietyTip from './SocietyTip.svelte';
	import TipChoose from './TipChoose.svelte';
	import { TouchPin } from './touch-pin.svelte';
	import { symbolPath } from './symbols';

	interface Props {
		drill: Drill;
		selected: string | null;
		/** Shared with the beeswarm, so hover and focus are linked both ways (FR-24). */
		hovered: string | null;
		onhover: (code: string | null) => void;
		onselect: (code: string) => void;
		label: string;
		describedBy: string;
	}

	let { drill, selected, hovered, onhover, onselect, label, describedBy }: Props = $props();

	const land = new Resource(() => loadLand());
	const geometry = $derived(
		land.current ? feature(land.current, land.current.objects.land) : undefined
	);

	const uid = $props.id();
	const clipId = `${uid}-land`;
	let width = $state(0);
	let container: HTMLDivElement | undefined = $state();
	let focusCode: string | null = $state(null);
	let local: string | null = $state(null);

	const projection = $derived(geoEqualEarth().fitWidth(Math.max(1, width), { type: 'Sphere' }));
	const top = $derived(projection([0, MAP_NORTH])![1]);
	const height = $derived(projection([0, MAP_SOUTH])![1] - top);
	const outline = $derived(geometry && width > 0 ? geoPath(projection).digits(1)(geometry) : '');
	const r = $derived(width < 480 ? 3.5 : 5);
	const shapes = $derived(
		Object.fromEntries(REGIONS.map((region) => [region, symbolPath(REGION_SHAPE[region], r)]))
	);

	interface Dot {
		point: SocietyPoint;
		x: number;
		y: number;
	}

	const dots: Dot[] = $derived(
		drill.plotted.map((point) => {
			const [x, y] = projection([point.lon, point.lat]) ?? [0, 0];
			return { point, x, y: y - top };
		})
	);
	// Hovered and selected dots draw last, on top of their neighbours.
	const drawn = $derived(
		[...dots].sort(
			(a, b) =>
				Number(a.point.code === selected || a.point.code === hovered) -
				Number(b.point.code === selected || b.point.code === hovered)
		)
	);
	const byCode = $derived(new Map(dots.map((d) => [d.point.code, d])));
	const westToEast = $derived([...dots].sort((a, b) => a.x - b.x || a.y - b.y));
	const southToNorth = $derived([...dots].sort((a, b) => b.y - a.y || a.x - b.x));
	const tabStop = $derived(
		(focusCode && byCode.has(focusCode) && focusCode) ||
			(selected && byCode.has(selected) && selected) ||
			westToEast[0]?.point.code
	);
	const pin = new TouchPin(() => container);
	const tip = $derived.by(() => {
		const code = pin.code ?? local;
		return code ? byCode.get(code) : undefined;
	});

	function ariaLabel(p: SocietyPoint): string {
		const e = p.estimate!;
		return (
			`Respondents in ${place(p.code, p.name)}: ${score(e.value)} ` +
			`(95% interval ${interval(e.lo, e.hi)}), ${p.n === null ? '' : count(p.n)} respondents` +
			`${p.status === Status.Small ? ', small sample' : ''}, ${p.region}`
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

	async function move(list: Dot[], code: string, step: number) {
		const i = list.findIndex((d) => d.point.code === code);
		const next = list[Math.min(list.length - 1, Math.max(0, i + step))]?.point.code;
		if (!next) return;
		focusCode = next;
		await tick();
		container?.querySelector<SVGElement>(`[data-code="${next}"]`)?.focus();
	}

	// NFR-13: one tab stop; left and right move west and east, up and down north and south.
	function keydown(event: KeyboardEvent, code: string) {
		switch (event.key) {
			case 'ArrowRight':
				void move(westToEast, code, 1);
				break;
			case 'ArrowLeft':
				void move(westToEast, code, -1);
				break;
			case 'ArrowUp':
				void move(southToNorth, code, 1);
				break;
			case 'ArrowDown':
				void move(southToNorth, code, -1);
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

{#if land.error}
	<LoadError error={land.error} retry={land.retry} />
{/if}
<div class="map" bind:this={container} bind:clientWidth={width}>
	{#if width > 0}
		<svg
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			role="group"
			aria-label={label}
			aria-describedby={describedBy}
		>
			<!-- Land beyond the crop stays inside the map's box; dots and rings may overflow it. -->
			<clipPath id={clipId}><rect {width} {height} /></clipPath>
			<path class="land" d={outline} transform="translate(0 {-top})" clip-path="url(#{clipId})" />
			{#each drawn as dot (dot.point.code)}
				{@const p = dot.point}
				<!-- FR-24: dots coloured by the same estimate as the beeswarm, shaped by region. -->
				<g
					class="dot score"
					class:small={p.status === Status.Small}
					style="{scoreStyle(p.estimate!.value)}; transform: translate({dot.x}px, {dot.y}px)"
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
						<circle class="ring" class:selected={p.code === selected} r={r + 4} />
					{/if}
				</g>
			{/each}
			{#if selected && byCode.has(selected)}
				{@const s = byCode.get(selected)!}
				<text
					class="selected-label"
					x={Math.min(Math.max(s.x, 60), width - 60)}
					y={s.y - r - 9}
					text-anchor="middle"
					aria-hidden="true"
				>
					{s.point.name}
				</text>
			{/if}
		</svg>
		{#if tip}
			<div
				class="tooltip"
				class:pinned={pin.code === tip.point.code}
				class:below={tip.y < 150}
				style="--x: {tip.x}px; --y: {tip.y}px"
				role="presentation"
			>
				<SocietyTip point={tip.point} kind={drill.kind} />
				{#if pin.code === tip.point.code && tip.point.code !== selected}
					<TipChoose
						code={tip.point.code}
						name={tip.point.name}
						onchoose={() => {
							const code = tip.point.code;
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
	.map {
		position: relative;
		aspect-ratio: 2.466;
	}

	svg {
		display: block;
		overflow: visible;
		font-size: var(--text-sm);
	}

	.land {
		fill: var(--land);
		stroke: var(--border);
		stroke-width: 0.5;
	}

	.dot {
		cursor: pointer;
		outline: none;
	}

	/* The ink outline keeps pale fills at 3:1 against land and sea (NFR-12). */
	.dot path {
		fill: var(--fill);
		stroke: var(--text);
		stroke-width: 1;
	}

	/* FR-22: small samples get a dashed outline (the fill shows the estimate). */
	.dot.small path {
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

	.selected-label {
		fill: var(--text);
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
