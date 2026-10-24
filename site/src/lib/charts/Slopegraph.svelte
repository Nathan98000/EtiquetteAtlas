<script lang="ts">
	import { tick } from 'svelte';
	import { scaleLinear } from 'd3-scale';
	import { ACTORS, AUDIENCES, CONTEXT_TEXT, CONTEXTS } from '#lib/data/grid.ts';
	import { RESPONSES, score } from '#lib/data/format.ts';
	import { Status, missingText, type ContextValue } from '#lib/data/model.ts';
	import {
		columnLabel,
		type BehaviorAudiences,
		type Series,
		type SeriesKind
	} from './audience-model';
	import { scoreStyle } from './colors';
	import { symbolPath } from './symbols';

	interface Props {
		/** Undefined while the data loads: the chart keeps its size, so nothing shifts (NFR-2). */
		row: BehaviorAudiences | undefined;
		/** FR-42: add who does it, a woman or a man, as a group of its own. */
		actor: boolean;
		/** "focus": a behavior's own chart, with axes, labels and keyboard; "small": a panel. */
		size: 'focus' | 'small';
		/** focus: the column selected with a click or Enter, which keeps its details. */
		selected?: number | null;
		/** focus: the column under the pointer or keyboard focus, for the details panel. */
		onpreview?: (context: number | null) => void;
		onselect?: (context: number) => void;
		label?: string;
		describedBy?: string;
		/** small: label the scale's ends and 0, for the first panel (D-16). */
		axis?: boolean;
	}

	let {
		row,
		actor,
		size,
		selected = null,
		onpreview = () => {},
		onselect = () => {},
		label = '',
		describedBy,
		axis = false
	}: Props = $props();

	/** The six response points (§4.3): response k sits at k − 3.5. */
	const POINTS = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
	const PAD = 8;
	/** D-17: below 560 px the focused chart names its ends in words, above and below the plot. */
	const WORDS_PAD = 22;

	interface Group {
		contexts: number[];
		heading: string;
		top: number;
		left: number;
		slot: number;
	}

	let width = $state(0);
	let container: HTMLDivElement | undefined = $state();
	/** The column that holds the chart's one tab stop (roving tabindex). */
	let focusContext: number | null = $state(null);
	/** The column previewed here, by pointer or focus. */
	let local: number | null = $state(null);

	const focus = $derived(size === 'focus');
	const contexts: number[] = $derived(actor ? [...AUDIENCES, ...ACTORS] : [...AUDIENCES]);

	// A fixed scale (−2.5 to +2.5) keeps behaviors comparable. The actor's gender is a group of
	// its own beside the audiences, or below them when the page is narrow, so its labels fit.
	const layout = $derived.by(() => {
		const narrow = focus && width < 560;
		const gutter = focus ? (narrow ? 8 : 176) : axis ? 26 : 4;
		const pad = narrow ? WORDS_PAD : PAD;
		// From 640 px every line is named at its end; the margin is kept even for one line, so
		// it does not move when a society's line arrives (NFR-2).
		const ends = focus && width >= 640;
		const right = ends ? 116 : focus ? 12 : 4;
		const plotWidth = Math.max(1, width - gutter - right);
		const plotHeight = focus ? 252 : 120;
		const head = focus ? (actor ? 28 : 8) : 4;
		const below = focus ? 56 : 4;
		const stacked = focus && actor && width < 520;
		const slot = plotWidth / (!actor ? 3 : stacked ? 3 : 5.5);
		const audiences: Group = {
			contexts: [...AUDIENCES],
			heading: 'Audience',
			top: head,
			left: gutter,
			slot
		};
		const groups = [audiences];
		if (actor) {
			groups.push({
				contexts: [...ACTORS],
				heading: 'Who does it',
				top: stacked ? 2 * head + plotHeight + below : head,
				left: stacked ? gutter : gutter + 3.5 * slot,
				slot
			});
		}
		const bands = stacked ? 2 : 1;
		return {
			groups,
			gutter,
			plotWidth,
			plotHeight,
			ends,
			narrow,
			stacked,
			height: bands * (head + plotHeight + below),
			tops: [...new Set(groups.map((g) => g.top))],
			scale: scaleLinear()
				.domain([-2.5, 2.5])
				.range([plotHeight - pad, pad])
		};
	});

	const groupOf = (k: number) => layout.groups[k < ACTORS[0] ? 0 : 1];
	const x = (k: number) => {
		const g = groupOf(k);
		return g.left + (k - g.contexts[0] + 0.5) * g.slot;
	};
	const y = (k: number, value: number) => groupOf(k).top + layout.scale(value);
	const f = (n: number) => n.toFixed(1);

	/** Women and men sit a little apart so equal values never hide each other (decision 59). */
	const DODGE: Record<SeriesKind, number> = { main: 0, reference: 0, women: -1, men: 1 };
	const r = $derived(focus ? 6.5 : 4);
	const dx = (kind: SeriesKind) => DODGE[kind] * (focus ? 6 : 3.5);
	const shapes = $derived({ circle: symbolPath('circle', r), square: symbolPath('square', r) });
	const tickHalf = $derived(focus ? 10 : 6);

	/** Pairs joined by a line: neighbouring audiences, and the two actor genders. */
	const PAIRS = [
		[0, 1],
		[1, 2],
		[ACTORS[0], ACTORS[1]]
	];

	/** A line breaks where a value is missing (DR-9): only neighbours with values are joined. */
	function path(s: Series): string {
		const shift = dx(s.kind);
		return PAIRS.filter(([a, b]) => contexts.includes(a) && contexts.includes(b))
			.flatMap(([a, b]) => {
				const ea = s.values[a].estimate;
				const eb = s.values[b].estimate;
				if (!ea || !eb) return [];
				return [`M${f(x(a) + shift)},${f(y(a, ea.value))}L${f(x(b) + shift)},${f(y(b, eb.value))}`];
			})
			.join('');
	}

	const shown = $derived(local ?? selected);
	const tabStop = $derived(
		focusContext !== null && contexts.includes(focusContext)
			? focusContext
			: selected !== null && contexts.includes(selected)
				? selected
				: contexts[0]
	);

	/** Line names at the right-hand end, pushed apart so they never overlap. */
	const endLabels = $derived.by(() => {
		if (!row || !layout.ends) return [];
		const placed = row.series
			.map((s) => {
				const k = [...contexts].reverse().find((c) => s.values[c].estimate);
				if (k === undefined) return undefined;
				return { s, x: x(k) + dx(s.kind) + r + 6, y: y(k, s.values[k].estimate!.value) };
			})
			.filter((p) => p !== undefined)
			.sort((a, b) => a.y - b.y);
		for (let i = 1; i < placed.length; i++) {
			placed[i].y = Math.max(placed[i].y, placed[i - 1].y + 16);
		}
		return placed;
	});

	function enter(k: number) {
		local = k;
		onpreview(k);
	}

	function leave() {
		local = null;
		onpreview(null);
	}

	async function move(k: number | undefined) {
		if (k === undefined) return;
		focusContext = k;
		await tick();
		container?.querySelector<SVGElement>(`[data-context="${k}"]`)?.focus();
	}

	// NFR-13: one tab stop; arrow keys, Home and End move between the columns, Enter or Space
	// keeps a column's details, Escape lets them go.
	function keydown(event: KeyboardEvent, k: number) {
		const i = contexts.indexOf(k);
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				void move(contexts[Math.min(contexts.length - 1, i + 1)]);
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				void move(contexts[Math.max(0, i - 1)]);
				break;
			case 'Home':
				void move(contexts[0]);
				break;
			case 'End':
				void move(contexts[contexts.length - 1]);
				break;
			case 'Enter':
			case ' ':
				onselect(k);
				break;
			case 'Escape':
				local = null;
				onpreview(null);
				break;
			default:
				return;
		}
		event.preventDefault();
	}

	const mark = (kind: SeriesKind) => (kind === 'men' ? shapes.square : shapes.circle);
	const small = (v: ContextValue) => v.status === Status.Small;
</script>

<div
	class="slopegraph"
	class:compact={!focus}
	bind:this={container}
	bind:clientWidth={width}
	style="height: {layout.height}px"
>
	{#if width > 0 && row}
		<svg
			{width}
			height={layout.height}
			role={focus ? 'group' : undefined}
			aria-label={focus ? label : undefined}
			aria-describedby={focus ? describedBy : undefined}
			aria-hidden={focus ? undefined : 'true'}
		>
			<!-- The six response points, and 0 between "somewhat inappropriate" and "somewhat
			     appropriate" (§4.3), labelled in the gutter on the focused chart (§6.5). -->
			{#each layout.tops as top (top)}
				<g class="grid" aria-hidden="true">
					{#each POINTS as p (p)}
						<line
							x1={layout.gutter}
							x2={layout.gutter + layout.plotWidth}
							y1={top + layout.scale(p)}
							y2={top + layout.scale(p)}
						/>
					{/each}
					<line
						class="zero"
						x1={layout.gutter}
						x2={layout.gutter + layout.plotWidth}
						y1={top + layout.scale(0)}
						y2={top + layout.scale(0)}
					/>
					{#if focus && !layout.narrow}
						{#each POINTS as p, i (p)}
							<text x={layout.gutter - 8} y={top + layout.scale(p)} text-anchor="end">
								{RESPONSES[i][0].toUpperCase() + RESPONSES[i].slice(1)}
							</text>
						{/each}
					{:else if focus}
						<!-- D-17: the ends in words on a phone too, above and below the plot. -->
						<text class="end" x={layout.gutter} y={top + layout.scale(2.5) - 12}>
							Extremely appropriate ({score(2.5)})
						</text>
						<text class="end" x={layout.gutter} y={top + layout.scale(-2.5) + 12}>
							Extremely inappropriate ({score(-2.5)})
						</text>
					{:else if axis}
						<!-- D-16: the first panel names the scale, for all of them. -->
						{#each [2.5, 0, -2.5] as p (p)}
							<text class="tiny" x={layout.gutter - 3} y={top + layout.scale(p)} text-anchor="end">
								{score(p)}
							</text>
						{/each}
					{/if}
				</g>
			{/each}

			{#if actor && !layout.stacked}
				{@const at = layout.groups[1].left - 0.25 * layout.groups[1].slot}
				<line
					class="rule"
					x1={at}
					x2={at}
					y1={layout.groups[1].top}
					y2={layout.groups[1].top + layout.plotHeight}
				/>
			{/if}

			{#if focus && shown !== null && contexts.includes(shown)}
				{@const g = groupOf(shown)}
				<rect
					class="band"
					x={x(shown) - g.slot / 2}
					y={g.top}
					width={g.slot}
					height={layout.plotHeight}
				/>
			{/if}

			{#each row.series as s (s.kind)}
				<path class="line {s.kind}" d={path(s)} />
			{/each}

			<!-- Intervals of the column shown (FR-40, decision 62). -->
			{#if focus && shown !== null && contexts.includes(shown)}
				{#each row.series as s (s.kind)}
					{@const e = s.values[shown].estimate}
					{#if e}
						{@const cx = x(shown) + dx(s.kind) + (s.kind === 'reference' ? tickHalf + 4 : 0)}
						<g class="whisker {s.kind}" aria-hidden="true">
							<line x1={cx} x2={cx} y1={y(shown, e.lo)} y2={y(shown, e.hi)} />
							<line x1={cx - 4} x2={cx + 4} y1={y(shown, e.lo)} y2={y(shown, e.lo)} />
							<line x1={cx - 4} x2={cx + 4} y1={y(shown, e.hi)} y2={y(shown, e.hi)} />
						</g>
					{/if}
				{/each}
			{/if}

			{#each row.series as s (s.kind)}
				{#each contexts as k (k)}
					{@const v = s.values[k]}
					{#if v.estimate}
						{@const px = x(k) + dx(s.kind)}
						{@const py = y(k, v.estimate.value)}
						{#if s.kind === 'reference'}
							<!-- All societies as a reference: a tick, as on the dumbbell (decision 49). -->
							<line class="tick" x1={px - tickHalf} x2={px + tickHalf} y1={py} y2={py} />
						{:else}
							<!-- Filled by the score like the matrix, ringed in the text colour for 3:1;
							     a dashed ring for a small sample, as on the map (decision 32). -->
							<path
								class="mark score"
								class:small={small(v)}
								style="{scoreStyle(v.estimate.value)}; transform: translate({f(px)}px, {f(py)}px)"
								d={mark(s.kind)}
							/>
						{/if}
					{/if}
				{/each}
			{/each}

			{#each endLabels as p (p.s.kind)}
				<text class="end {p.s.kind}" x={p.x} y={p.y} aria-hidden="true">{p.s.short}</text>
			{/each}

			{#if focus}
				{#each contexts as k (k)}
					{@const g = groupOf(k)}
					<g
						class="column"
						role="button"
						tabindex={k === tabStop ? 0 : -1}
						aria-label={columnLabel(row, k)}
						aria-pressed={selected === k}
						data-context={k}
						onmouseenter={() => enter(k)}
						onmouseleave={leave}
						onfocus={() => {
							focusContext = k;
							enter(k);
						}}
						onblur={leave}
						onclick={() => onselect(k)}
						onkeydown={(event) => keydown(event, k)}
					>
						<rect
							class="hit"
							x={x(k) - g.slot / 2 + 1}
							y={g.top - 2}
							width={g.slot - 2}
							height={layout.plotHeight + 4}
						/>
					</g>
				{/each}
			{/if}
		</svg>

		{#if focus}
			<!-- Context names under each column, and over each group when the actor's gender is
			     shown; the columns carry the same names for assistive technology. -->
			<div class="labels" aria-hidden="true">
				{#each layout.groups as g (g.heading)}
					{#if actor}
						<span
							class="heading"
							style="left: {g.left}px; top: {g.top - 26}px; width: {g.slot * g.contexts.length}px"
						>
							{g.heading}
						</span>
					{/if}
					{#each g.contexts as k (k)}
						{@const v = row.main.values[k]}
						<span
							class="context"
							class:shown={k === shown}
							style="left: {x(k)}px; top: {g.top + layout.plotHeight + 6}px; width: {Math.min(
								g.slot - 4,
								200
							)}px"
						>
							{g.slot >= 130 ? CONTEXT_TEXT[CONTEXTS[k]].label : CONTEXT_TEXT[CONTEXTS[k]].short}
							{#if !v.estimate}
								<em>{missingText(v.status)}</em>
							{/if}
						</span>
					{/each}
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.slopegraph {
		position: relative;
	}

	svg {
		display: block;
		overflow: visible;
		font-size: var(--text-sm);
	}

	/* Response gridlines are decorative (their labels carry the meaning); 0 is 3:1 (NFR-12). */
	.grid line {
		stroke: var(--border);
	}

	.grid .zero {
		stroke: var(--border-strong);
		stroke-width: 1.5;
	}

	.grid text {
		fill: var(--text-muted);
		dominant-baseline: middle;
	}

	.grid text.tiny {
		font-size: 0.6875rem;
	}

	.rule {
		stroke: var(--border-strong);
		stroke-dasharray: 2 3;
	}

	.band {
		fill: var(--surface-muted);
	}

	/* Lines are told apart by style, not hue (decision 59): the view's own and women respondents
	   solid, men respondents long dashes, all societies as a reference thin dashes. */
	.line {
		fill: none;
		stroke: var(--text);
		stroke-width: 2;
		stroke-linejoin: round;
	}

	.line.men {
		stroke-dasharray: 8 4;
	}

	.line.reference {
		stroke: var(--text-muted);
		stroke-width: 1.5;
		stroke-dasharray: 4 3;
	}

	.compact .line {
		stroke-width: 1.5;
	}

	.compact .line.reference {
		stroke-width: 1.25;
		stroke-dasharray: 3 2;
	}

	.tick {
		stroke: var(--text-muted);
		stroke-width: 2.5;
	}

	.mark {
		fill: var(--fill);
		stroke: var(--text);
		stroke-width: 2;
	}

	.compact .mark {
		stroke-width: 1.5;
	}

	.mark.small {
		stroke-dasharray: 3 2;
	}

	.compact .mark.small {
		stroke-dasharray: 2 1.5;
	}

	.whisker line {
		stroke: var(--text);
		stroke-width: 1.5;
	}

	.whisker.reference line {
		stroke: var(--text-muted);
	}

	.end {
		fill: var(--text);
		font-weight: 600;
		dominant-baseline: middle;
	}

	.end.reference {
		fill: var(--text-muted);
		font-weight: 400;
	}

	.column {
		cursor: pointer;
		outline: none;
	}

	.hit {
		fill: transparent;
	}

	.column:focus-visible .hit {
		stroke: var(--focus);
		stroke-width: 3;
	}

	.labels {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.labels span {
		position: absolute;
		font-size: var(--text-sm);
		line-height: 1.25;
		text-align: center;
	}

	.context {
		transform: translateX(-50%);
	}

	.context.shown {
		font-weight: 700;
	}

	.context em {
		display: block;
		font-style: normal;
		color: var(--text-muted);
	}

	.heading {
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-strong);
	}
</style>
