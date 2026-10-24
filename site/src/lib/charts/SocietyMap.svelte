<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import type { ResolvedPathname } from '$app/types';
	import { geoEqualEarth, geoPath } from 'd3-geo';
	import { feature } from 'topojson-client';
	import LoadError from '#lib/components/LoadError.svelte';
	import { count } from '#lib/data/format.ts';
	import { loadLand } from '#lib/data/load.ts';
	import { REGIONS, type SampleId, type Societies, type Society } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { REGION_SHAPE, regionStyle } from './colors';
	import { MAP_NORTH, MAP_SOUTH } from './map-model';
	import { symbolPath } from './symbols';
	import TipChoose from './TipChoose.svelte';
	import { TouchPin } from './touch-pin.svelte';

	interface Props {
		societies: Societies;
		sample: SampleId;
		/** A society's fingerprint, keeping the sample and scale (decision 44). */
		href: (code: string) => ResolvedPathname;
		/** Starts loading what a fingerprint needs, before the click (decision 27). */
		onwarm: () => void;
		label: string;
		describedBy: string;
	}

	let { societies, sample, href, onwarm, label, describedBy }: Props = $props();

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
		society: Society;
		x: number;
		y: number;
		/** Its respondents in the sample, or null when the sample leaves it out (§4.4). */
		n: number | null;
	}

	const dots: Dot[] = $derived(
		societies.list.map((society) => {
			const [x, y] = projection([society.lon, society.lat]) ?? [0, 0];
			return { society, x, y: y - top, n: societies.respondents(society.code, sample) };
		})
	);
	const byCode = $derived(new Map(dots.map((d) => [d.society.code, d])));
	const westToEast = $derived([...dots].sort((a, b) => a.x - b.x || a.y - b.y));
	const southToNorth = $derived([...dots].sort((a, b) => b.y - a.y || a.x - b.x));
	const tabStop = $derived(
		(focusCode && byCode.has(focusCode) && focusCode) || westToEast[0]?.society.code
	);
	const pin = new TouchPin(() => container);
	const tip = $derived.by(() => {
		const code = pin.code ?? local;
		return code ? byCode.get(code) : undefined;
	});

	const ariaLabel = (d: Dot) =>
		`${d.society.name}: ${d.n === null ? 'not in this sample' : `${count(d.n)} respondents`}, ` +
		d.society.region;

	function enter(code: string) {
		local = code;
		onwarm();
	}

	async function move(list: Dot[], code: string, step: number) {
		const i = list.findIndex((d) => d.society.code === code);
		const next = list[Math.min(list.length - 1, Math.max(0, i + step))]?.society.code;
		if (!next) return;
		focusCode = next;
		await tick();
		container?.querySelector<SVGElement>(`[data-code="${next}"]`)?.focus();
	}

	// NFR-13: one tab stop; left and right move west and east, up and down north and south, and
	// Enter follows the link.
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
<!-- D-31: the 90 societies where they are, by the GSN authors' regions; each opens its page. -->
<div class="map" bind:this={container} bind:clientWidth={width}>
	{#if width > 0}
		<svg {width} {height} role="group" aria-label={label} aria-describedby={describedBy}>
			<!-- Land beyond the crop stays inside the map's box; dots and rings may overflow it. -->
			<clipPath id={clipId}><rect {width} {height} /></clipPath>
			<path class="land" d={outline} transform="translate(0 {-top})" clip-path="url(#{clipId})" />
			{#each dots as dot (dot.society.code)}
				{@const code = dot.society.code}
				<a
					href={href(code)}
					class="dot region"
					class:outside={dot.n === null}
					style="{regionStyle(dot.society.region)}; transform: translate({dot.x}px, {dot.y}px)"
					tabindex={code === tabStop ? 0 : -1}
					aria-label={ariaLabel(dot)}
					data-code={code}
					onmouseenter={() => enter(code)}
					onmouseleave={() => (local = null)}
					onfocus={() => {
						focusCode = code;
						enter(code);
					}}
					onblur={() => (local = null)}
					onpointerdown={(event) => pin.down(event)}
					onclick={(event) => {
						if (!pin.click(code)) event.preventDefault();
					}}
					onkeydown={(event) => keydown(event, code)}
				>
					<path d={shapes[dot.society.region]} />
					{#if code === local || code === pin.code}
						<circle class="ring" r={r + 4} />
					{/if}
				</a>
			{/each}
		</svg>
		{#if tip}
			<div
				class="tooltip"
				class:pinned={pin.code === tip.society.code}
				class:below={tip.y < 150}
				style="--x: {tip.x}px; --y: {tip.y}px"
				role="presentation"
			>
				<strong>{tip.society.name}</strong>
				<span class="meta">
					{tip.n === null ? 'Not in this sample' : `${count(tip.n)} respondents`} · {tip.society
						.region}
				</span>
				{#if pin.code === tip.society.code}
					<TipChoose
						code={tip.society.code}
						name={tip.society.name}
						onchoose={() => {
							const code = tip.society.code;
							pin.close();
							void goto(href(code));
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

	/* The ink outline keeps every region's colour at 3:1 against land and sea (NFR-12). */
	.dot path {
		fill: var(--region);
		stroke: var(--text);
		stroke-width: 1;
	}

	/* Left out of the sample: the outline only. */
	.dot.outside path {
		fill: var(--surface);
		stroke: var(--region);
		stroke-width: 1.5;
	}

	.ring {
		fill: none;
		stroke: var(--text);
		stroke-width: 1.5;
	}

	.dot:focus-visible .ring,
	.dot:focus-visible path {
		stroke: var(--focus);
		stroke-width: 3;
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

	.meta {
		display: block;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
</style>
