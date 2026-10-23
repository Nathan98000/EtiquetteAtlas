<script lang="ts">
	import { resolve } from '$app/paths';
	import { CHANGE_MODULE } from '#lib/change-module.ts';
	import { cellChangeLink } from '#lib/change-text.ts';
	import Beeswarm from '#lib/charts/Beeswarm.svelte';
	import BehaviorStrip from '#lib/charts/BehaviorStrip.svelte';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import { drill, regionSummary, standing } from '#lib/charts/drill-model.ts';
	import { matrixCells, societyPhrase, type SelectedSociety } from '#lib/charts/matrix-model.ts';
	import RegionLegend from '#lib/charts/RegionLegend.svelte';
	import SocietyTable from '#lib/charts/SocietyTable.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import StepLinks from '#lib/components/StepLinks.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { cellSummary, neighbours, societiesSummary, stripSummary } from '#lib/data/derive.ts';
	import { count, interval, place, responseLabel, score, spread } from '#lib/data/format.ts';
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
	import { SAMPLE_LABEL, Status, inChangeSurvey, type EstimateKind } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { CELL_KEYS, GLOBAL_KEYS } from '#lib/state/url.ts';
	import { changeHref, setView, view, withView } from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const vs = $derived(view.state);
	const cell = $derived(data.cell);
	const global = new Resource(() => loadGlobal(view.state.sample));
	const cellsFile = new Resource(() => loadCells(view.state.sample));
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
	const { previous, next } = $derived(neighbours(cell));
	const estimateLabel = $derived(vs.estimate === 'shrunk' ? 'shrunken' : 'raw');
	const scaleLabel = $derived(vs.scale === 'centered' ? ', centered' : '');

	let hovered: string | null = $state(null);

	function href(target: number) {
		const { behavior, situation } = cellParams(CELLS[target]);
		return withView(resolve(`explore/${behavior}/${situation}/`), vs, CELL_KEYS);
	}

	function select(code: string) {
		void setView({ society: code === vs.society ? null : code });
	}

	const estimateOptions: { value: EstimateKind; label: string }[] = [
		{ value: 'shrunk', label: 'Shrunken' },
		{ value: 'raw', label: 'Raw' }
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
	imageAlt="{data.title}: a dot for each society's estimate on the scale from inappropriate to appropriate, with the global mean. {data.swarmSummary}"
/>

<div class="drill">
	<nav class="crumbs" aria-label="Breadcrumb">
		<a href={withView(resolve('explore/'), vs, GLOBAL_KEYS)}>All 150 pairs</a>
	</nav>
	<h1>{data.title}</h1>
	<p class="lede">{summary}</p>
	<noscript>
		<p>The charts for this pair need JavaScript.</p>
	</noscript>

	{#each [global, cellsFile, societies] as resource, i (i)}
		{#if resource.error}
			<LoadError error={resource.error} retry={resource.retry} />
		{/if}
	{/each}

	<div class="strip-section needs-js">
		<ChartFrame
			id="strip"
			title="{BEHAVIOR_TEXT[behavior].label} in each situation"
			summary={files ? stripSummary(files.global, behavior, vs.scale) : data.stripSummary}
			about={resolve('method/#global')}
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
								<th scope="col">Global mean</th>
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
										<td>{model[c.index].society ? societyPhrase(model[c.index].society!) : ''}</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			{/snippet}
		</ChartFrame>
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
		<!-- FR-26: previous and next cells in paper order (decision 39). -->
		<StepLinks
			label="Other pairs"
			previous={{ href: href(previous), label: headline(CELLS[previous]) }}
			next={{ href: href(next), label: headline(CELLS[next]) }}
		/>
	</div>

	<div class="layout">
		<div class="charts">
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
				<a class="about" href={resolve('method/#shrinkage')}>About shrinkage</a>
			</div>

			<ChartFrame
				id="swarm"
				title="Every society's {estimateLabel} estimate{scaleLabel}"
				summary={swarmSummary}
				about={resolve('method/#intervals')}
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
							label="Societies placed by their {estimateLabel} estimate for {data.title.toLowerCase()}"
							describedBy="swarm-summary"
						/>
					{:else}
						<div class="placeholder swarm"></div>
					{/if}
				{/snippet}
				{#snippet table()}
					{#if d}
						<SocietyTable
							drill={d}
							caption="Each society's {estimateLabel} estimate{scaleLabel}, highest first"
						/>
					{/if}
				{/snippet}
			</ChartFrame>

			<ChartFrame
				id="map"
				title="Where the societies are"
				summary={d ? regionSummary(d.plotted) : data.mapSummary}
				about={resolve('method/#map')}
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
									label="Map of societies coloured by their {estimateLabel} estimate"
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
						<SocietyTable drill={d} caption="Each society's {estimateLabel} estimate{scaleLabel}" />
					{/if}
				{/snippet}
			</ChartFrame>
		</div>

		<aside class="panel" aria-labelledby="society-title">
			<h2 id="society-title">
				{selectedSociety
					? `Respondents in ${place(selectedSociety.code, selectedSociety.name)}`
					: 'Pick a society'}
			</h2>
			<div class="society" aria-live="polite">
				{#if !selectedSociety}
					<p>Choose one in the Society box above, or select a dot, to see where it stands.</p>
				{:else if where.kind === 'plotted'}
					<!-- FR-25: the selected society's rank among the societies shown. -->
					<p class="rank">{where.text[0].toUpperCase() + where.text.slice(1)}</p>
					<p>
						<span class="num big">{score(where.point.estimate!.value)}</span>
						{responseLabel(where.point.estimate!.value)}
					</p>
					<p class="muted">
						95% interval {interval(where.point.estimate!.lo, where.point.estimate!.hi)};
						{where.point.notable === 1
							? 'looser than'
							: where.point.notable === -1
								? 'stricter than'
								: 'close to'} the global mean
					</p>
					<p class="muted">
						{count(where.point.n ?? 0)} respondents{where.point.status === Status.Small
							? ' (small sample)'
							: ''}; {estimateLabel} estimate{scaleLabel}
					</p>
				{:else if where.kind === 'too-few'}
					<p><strong>Too few responses</strong>: fewer than 10 respondents rated this pair.</p>
				{:else if where.kind === 'not-asked'}
					<p><strong>Not asked</strong>: this survey left the question out.</p>
				{:else if where.kind === 'not-in-sample'}
					<p><strong>Not in this sample</strong> ({SAMPLE_LABEL[vs.sample]}).</p>
				{:else}
					<p class="muted">Loading…</p>
				{/if}
			</div>

			{#if d}
				<h2>All societies</h2>
				<dl>
					<div>
						<dt>Global mean</dt>
						<dd>
							{score(d.mean)} <span class="muted">({interval(d.meanLo, d.meanHi)})</span>
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

	.lede {
		max-width: var(--measure);
		font-size: var(--text-lg);
	}

	.strip-section {
		margin: 1.5rem 0 2rem;
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
		margin-bottom: -1.5rem;
	}

	.about {
		font-size: var(--text-sm);
		padding: 0.625rem 0;
	}

	.placeholder.swarm {
		min-height: 13.5rem;
	}

	.placeholder.map {
		aspect-ratio: 2.466;
		background: var(--surface-muted);
		border-radius: var(--radius);
	}

	.panel {
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-muted);
	}

	.panel h2 {
		font-size: var(--text-md);
		margin: 0 0 0.5rem;
	}

	.panel h2 + .society + h2,
	.panel .society + h2 {
		margin-top: 1.5rem;
	}

	.panel h3 {
		font-size: var(--text-sm);
		margin: 1rem 0 0.25rem;
		color: var(--text-muted);
	}

	.society p {
		margin: 0 0 0.375rem;
	}

	.rank {
		font-weight: 700;
		font-size: var(--text-lg);
	}

	.big {
		font-size: var(--text-xl);
		font-weight: 700;
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
