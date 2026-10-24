<script lang="ts">
	import { resolve } from '$app/paths';
	import { CHANGE_MODULE } from '#lib/change-module.ts';
	import { cellChangeLink } from '#lib/change-text.ts';
	import Beeswarm from '#lib/charts/Beeswarm.svelte';
	import BehaviorStrip from '#lib/charts/BehaviorStrip.svelte';
	import ChartFrame, { CENTERING } from '#lib/charts/ChartFrame.svelte';
	import { drill, regionSummary, societyBox, standing } from '#lib/charts/drill-model.ts';
	import { matrixCells, societyPhrase, type SelectedSociety } from '#lib/charts/matrix-model.ts';
	import RegionLegend from '#lib/charts/RegionLegend.svelte';
	import SocietyTable from '#lib/charts/SocietyTable.svelte';
	import { rangeTitle, regionTitle, stripTitle } from '#lib/charts/titles.ts';
	import CellSociety from '#lib/components/CellSociety.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ShareButton from '#lib/components/ShareButton.svelte';
	import StepLinks from '#lib/components/StepLinks.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { cellSummary, neighbours, societiesSummary, stripSummary } from '#lib/data/derive.ts';
	import {
		RELATIVE,
		estimateWords,
		interval,
		narrow,
		place,
		score,
		spread
	} from '#lib/data/format.ts';
	import {
		BEHAVIOR_TEXT,
		CELLS,
		CHANGE_BEHAVIORS,
		SITUATION_TEXT,
		cellParams,
		headline,
		slug
	} from '#lib/data/grid.ts';
	import { loadCells, loadGlobal, loadSocieties } from '#lib/data/load.ts';
	import { inChangeSurvey, type EstimateKind } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { CELL_KEYS, GLOBAL_KEYS } from '#lib/state/url.ts';
	import { changeHref, setView, view, withView } from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const vs = $derived(view.state);
	const cell = $derived(data.cell);
	// The URL's sample applies once the app has mounted (decision 31); loading waits for it, so
	// ?sample= never fetches All data's files first (decision 96).
	const global = new Resource(() => (view.ready ? loadGlobal(view.state.sample) : undefined));
	const cellsFile = new Resource(() => (view.ready ? loadCells(view.state.sample) : undefined));
	const societies = new Resource(() => loadSocieties());

	// Use the two sample files together only once both are for the same sample.
	const files = $derived(
		global.current && cellsFile.current && global.current.sample === cellsFile.current.sample
			? { global: global.current, cells: cellsFile.current }
			: undefined
	);
	const d = $derived(
		files && societies.current
			? drill(files.cells, societies.current, files.global, cell, vs.estimate, vs.scale)
			: undefined
	);
	const where = $derived(d ? standing(d, vs.society) : { kind: 'unknown' as const });
	const selectedSociety = $derived(societies.current?.get(vs.society));
	const box = $derived(societyBox(where, selectedSociety, d, vs.sample));
	const society: SelectedSociety | undefined = $derived(
		selectedSociety && files && societies.current
			? {
					code: selectedSociety.code,
					name: selectedSociety.name,
					inSample: societies.current.inSample(selectedSociety.code, files.cells.sample),
					index: files.cells.indexOf(selectedSociety.code)
				}
			: undefined
	);
	const model = $derived(
		files ? matrixCells(files.global, vs.scale, files.cells, society) : undefined
	);

	const summary = $derived(files ? cellSummary(files.global, cell, vs.scale) : data.summary);
	// Until the data arrives, the summaries are the prerendered All-data ones (FR-87).
	const swarmSummary = $derived(
		d && societies.current
			? societiesSummary(
					[...d.plotted, ...d.tooFew, ...d.notAsked],
					(code) => societies.current?.get(code),
					cell
				)
			: data.swarmSummary
	);
	const behavior = $derived(CELLS[cell].behavior);
	// Direction A: each chart's title states what it shows, prerendered from All data (NFR-2).
	const titles = $derived({
		swarm: d ? rangeTitle(d.plotted.map((p) => p.estimate!.value)) : data.swarmTitle,
		map: d
			? regionTitle(d.plotted.map((p) => ({ region: p.region, value: p.estimate!.value })))
			: data.mapTitle,
		strip: model
			? stripTitle(
					behavior,
					CELLS.filter((c) => c.behavior === behavior).map((c) => ({
						cell: c,
						value: model[c.index].mean
					}))
				)
			: data.stripTitle
	});
	const { previous, next } = $derived(neighbours(cell));
	// Decision 5 (D-8): the estimate and scale in plain words, for captions and labels; the title
	// stays "Every society's average answer" and the toggle says which.
	const which = $derived(
		`${estimateWords(vs.estimate)}${vs.scale === 'centered' ? `, ${RELATIVE}` : ''}`
	);

	let hovered: string | null = $state(null);

	function href(target: number) {
		const { behavior, situation } = cellParams(CELLS[target]);
		return withView(resolve(`explore/${behavior}/${situation}/`), vs, CELL_KEYS);
	}

	function select(code: string) {
		void setView({ society: code === vs.society ? null : code });
	}

	const estimateOptions: { value: EstimateKind; label: string }[] = [
		{ value: 'shrunk', label: 'Adjusted for small samples' },
		{ value: 'raw', label: 'Unadjusted' }
	];

	// NFR-3: the map's code and outlines load only when the map nears the screen.
	let mapModule: Promise<typeof import('#lib/charts/DotMap.svelte')> | undefined = $state();
	function loadMapWhenNear(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					mapModule ??= import('#lib/charts/DotMap.svelte');
					observer.disconnect();
				}
			},
			{ rootMargin: '300px' }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

<Seo
	title={data.title}
	description={data.summary}
	imageAlt="{data.title}: a dot for each society's estimate on the scale from inappropriate to appropriate, with the global average. {data.swarmSummary}"
/>

<div class="drill">
	<!-- D-28: Share at the right of the way back, so the title keeps its width. -->
	<div class="crumbs-row">
		<nav class="crumbs" aria-label="Breadcrumb">
			<a href={withView(resolve('explore/'), vs, GLOBAL_KEYS)}>All 150 pairs</a>
		</nav>
		<ShareButton />
	</div>
	<h1>{data.title}</h1>
	<CellSociety text={box} />
	<p class="lede">{summary}</p>
	<noscript>
		<p>The charts for this pair need JavaScript.</p>
	</noscript>

	{#each [global, cellsFile, societies] as resource, i (i)}
		{#if resource.error}
			<LoadError error={resource.error} retry={resource.retry} />
		{/if}
	{/each}

	<!-- D-5: the society's result, then the pair's finding and its beeswarm first; the map and the
	     behavior across situations follow. -->
	<div class="layout">
		<div class="charts">
			<ChartFrame
				id="swarm"
				title={titles.swarm}
				subtitle="Each dot: one society's average answer"
				legendAfterOnPhones
				summary={swarmSummary}
				about={resolve('method/#intervals')}
				centered={vs.scale === 'centered'}
				scaled
				explain={CENTERING}
			>
				{#snippet legend()}
					<RegionLegend mode="region" />
				{/snippet}
				{#snippet chart()}
					{#if d}
						<Beeswarm
							drill={d}
							uncertainty={vs.uncertainty}
							selected={vs.society}
							{hovered}
							onhover={(code) => (hovered = code)}
							onselect={select}
							label="Societies placed by their average answer ({which}) for {data.title.toLowerCase()}"
							describedBy="swarm-summary"
						/>
					{:else}
						<div class="placeholder swarm"></div>
					{/if}
				{/snippet}
				<!-- D-5: the estimate and uncertainty controls act on this chart, so they sit under it. -->
				{#snippet below()}
					<div class="toggles needs-js">
						<Segmented
							legend="Estimate"
							name="estimate"
							value={vs.estimate}
							options={estimateOptions}
							onchange={(value) => setView({ estimate: value })}
						/>
						<Toggle
							label="Show uncertainty"
							checked={vs.uncertainty}
							onchange={(checked) => setView({ uncertainty: checked })}
						/>
						<a class="about" href={resolve('method/#shrinkage')}>About the adjustment</a>
					</div>
				{/snippet}
				{#snippet table()}
					{#if d}
						<SocietyTable
							drill={d}
							caption="Each society's average answer ({which}), highest first"
						/>
					{/if}
				{/snippet}
			</ChartFrame>
			<!-- Links to this behavior elsewhere in the atlas, under the beeswarm (D-5). -->
			<div class="more-links">
				<p class="more-link">
					<a href={withView(resolve(`audiences/${slug(behavior)}/`), vs, GLOBAL_KEYS)}>
						{BEHAVIOR_TEXT[behavior].gerund} alone and in front of others
					</a>
				</p>
				<!-- Decision 67: the 12 behaviors the 2000–2003 survey asked link to the change module, for
		     the selected society when it was in both surveys. -->
				{#if CHANGE_MODULE && CHANGE_BEHAVIORS.includes(behavior)}
					<p class="more-link">
						<a href={changeHref(vs.society, vs, false)}>
							{cellChangeLink(
								selectedSociety && inChangeSurvey(selectedSociety.code)
									? place(selectedSociety.code, selectedSociety.name)
									: null
							)}
						</a>
					</p>
				{/if}
			</div>
			<ChartFrame
				id="map"
				title={titles.map}
				subtitle="Each dot: one society, where it is"
				summary={d ? regionSummary(d.plotted) : data.mapSummary}
				about={resolve('method/#map')}
				centered={vs.scale === 'centered'}
				scaled
			>
				{#snippet legend()}
					<RegionLegend mode="estimate" />
				{/snippet}
				{#snippet chart()}
					<div {@attach loadMapWhenNear}>
						{#if mapModule && d}
							{#await mapModule}
								<div class="placeholder map"></div>
							{:then { default: DotMap }}
								<DotMap
									drill={d}
									selected={vs.society}
									{hovered}
									onhover={(code) => (hovered = code)}
									onselect={select}
									label="Map of societies coloured by their average answer ({which})"
									describedBy="map-summary"
								/>
							{:catch error}
								<LoadError
									{error}
									retry={() => (mapModule = import('#lib/charts/DotMap.svelte'))}
								/>
							{/await}
						{:else}
							<div class="placeholder map"></div>
						{/if}
					</div>
				{/snippet}
				{#snippet table()}
					{#if d}
						<SocietyTable drill={d} caption="Each society's average answer ({which})" />
					{/if}
				{/snippet}
			</ChartFrame>
			<div class="strip-section needs-js">
				<ChartFrame
					id="strip"
					title={titles.strip}
					subtitle="The global average in each situation"
					summary={files ? stripSummary(files.global, behavior, vs.scale) : data.stripSummary}
					about={resolve('method/#global')}
					centered={vs.scale === 'centered'}
					scaled
				>
					{#snippet chart()}
						<BehaviorStrip cells={model} {cell} {href} />
					{/snippet}
					{#snippet table()}
						{#if model}
							<table class="data">
								<caption
									>Global average for {BEHAVIOR_TEXT[behavior].label.toLowerCase()} by situation</caption
								>
								<thead>
									<tr>
										<th scope="col">Situation</th>
										<th scope="col">Global average</th>
										<th scope="col">Disagreement</th>
										{#if society?.inSample}<th scope="col"
												>Respondents in {place(society.code, society.name)}</th
											>{/if}
									</tr>
								</thead>
								<tbody>
									{#each CELLS.filter((c) => c.behavior === behavior) as c (c.index)}
										<tr>
											<th scope="row">{SITUATION_TEXT[c.situation].label}</th>
											<td>{score(model[c.index].mean)}</td>
											<td>{spread(model[c.index].tau)}</td>
											{#if society?.inSample}
												<td
													>{model[c.index].society
														? societyPhrase(model[c.index].society!)
														: ''}</td
												>
											{/if}
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					{/snippet}
				</ChartFrame>
				<!-- FR-26: previous and next cells in paper order (decision 39). -->
				<StepLinks
					label="Other pairs"
					previous={{ href: href(previous), label: headline(CELLS[previous]) }}
					next={{ href: href(next), label: headline(CELLS[next]) }}
				/>
			</div>
		</div>

		<aside class="panel" aria-labelledby="all-title">
			<h2 id="all-title">All societies</h2>
			{#if d}
				<dl>
					<div>
						<dt>Global average</dt>
						<dd>
							{score(d.mean)}
							<!-- D-34: an interval that rounds to a point is left out. -->
							{#if !narrow(d.meanLo, d.meanHi)}
								<span class="muted">({interval(d.meanLo, d.meanHi)})</span>
							{/if}
						</dd>
					</div>
					<div>
						<dt>Disagreement</dt>
						<dd>
							{spread(d.tau)}
							<span class="muted">({spread(d.tauLo)} to {spread(d.tauHi)})</span>
						</dd>
					</div>
					<div>
						<dt>Societies shown</dt>
						<dd>{d.plotted.length}</dd>
					</div>
				</dl>
				<!-- FR-27: listed, never plotted or ranked. -->
				{#if d.tooFew.length}
					<h3>Too few responses</h3>
					<p class="list">{d.tooFew.map((p) => p.name).join(', ')}</p>
				{/if}
				{#if d.notAsked.length}
					<h3>Not asked</h3>
					<p class="list">{d.notAsked.map((p) => p.name).join(', ')}</p>
				{/if}
				{#if d.notInSample.length}
					<details>
						<summary>Not in this sample ({d.notInSample.length})</summary>
						<p class="list">{d.notInSample.map((s) => s.name).join(', ')}</p>
					</details>
				{/if}
			{:else}
				<p class="muted">Loading…</p>
			{/if}
		</aside>
	</div>
</div>

<style>
	.drill {
		max-width: var(--page);
		margin: 0 auto;
		padding: 1.25rem var(--gutter) 0;
	}

	.crumbs {
		margin-bottom: 0.5rem;
		font-size: var(--text-sm);
	}

	.crumbs a::before {
		content: '← ';
	}

	/* Phones: a step smaller, so the longest pair's title takes two lines, not three (D-23). */
	@media (max-width: 639.98px) {
		h1 {
			font-size: var(--text-xl);
		}
	}

	.lede {
		max-width: var(--measure);
		font-size: var(--text-lg);
	}

	.strip-section {
		margin-bottom: 2rem;
	}

	/* The links follow the beeswarm closely; the grid's gap would part them. */
	.more-links {
		margin-top: -1.75rem;
	}

	.more-link {
		margin: 0.75rem 0 0;
		font-size: var(--text-sm);
	}

	.more-link a::after {
		content: ' →';
	}

	.layout {
		display: grid;
		gap: 2rem;
	}

	/* ≥ 1024 px: charts on the left, a 320 px panel on the right (§6.2). */
	@media (min-width: 1024px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) var(--panel);
			align-items: start;
		}

		.panel {
			position: sticky;
			top: 1rem;
		}
	}

	.charts {
		display: grid;
		gap: 2.5rem;
		min-width: 0;
	}

	.toggles {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem 1.5rem;
		margin-top: 0.75rem;
	}

	.about {
		font-size: var(--text-sm);
		padding: 0.625rem 0;
	}

	.placeholder.swarm {
		min-height: 18.375rem;
	}

	.placeholder.map {
		aspect-ratio: 2.466;
		background: var(--surface-muted);
		border-radius: var(--radius);
	}

	/* Direction A: a rule above, not a box. */
	.panel {
		padding: 0.75rem 0 0;
		border-top: 2px solid var(--text);
	}

	.panel h2 {
		font-size: var(--text-md);
		margin: 0 0 0.5rem;
	}

	.panel h3 {
		font-size: var(--text-sm);
		margin: 1rem 0 0.25rem;
		color: var(--text-muted);
	}

	.muted {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	dl {
		display: grid;
		gap: 0.25rem;
		margin: 0;
	}

	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	dt {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	dd {
		margin: 0;
		text-align: right;
	}

	.list {
		font-size: var(--text-sm);
		margin: 0;
	}

	details {
		margin-top: 1rem;
		font-size: var(--text-sm);
	}

	summary {
		cursor: pointer;
		padding: 0.25rem 0;
	}

	table.data {
		border-collapse: collapse;
		font-size: var(--text-sm);
		min-width: 100%;
	}

	table.data caption {
		text-align: left;
		font-weight: 600;
		padding-bottom: 0.5rem;
	}

	table.data th,
	table.data td {
		padding: 0.375rem 0.5rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
	}
</style>
