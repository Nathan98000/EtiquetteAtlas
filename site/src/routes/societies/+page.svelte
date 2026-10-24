<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import RegionLegend from '#lib/charts/RegionLegend.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ShareButton from '#lib/components/ShareButton.svelte';
	import { SHARE_ALT } from '#lib/share.ts';
	import { count } from '#lib/data/format.ts';
	import { loadCells, loadGlobal, loadSimilarity, loadSocieties, preload } from '#lib/data/load.ts';
	import { REGIONS } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { byRegion, indexSummary, mapSummary } from '#lib/data/society.ts';
	import { societyHref, view } from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const vs = $derived(view.state);
	const societies = new Resource(() => loadSocieties());
	const groups = $derived(societies.current ? byRegion(societies.current) : undefined);
	const summary = $derived(
		societies.current ? indexSummary(societies.current, vs.sample) : data.summary
	);

	// Decision 44: a society named in the query has its own page; one view, one URL.
	$effect(() => {
		const code = vs.society;
		if (code && societies.current?.get(code)) {
			void goto(societyHref(code, vs), { replaceState: true });
		}
	});

	const mapText = $derived(
		societies.current ? mapSummary(societies.current, vs.sample) : data.mapSummary
	);

	// D-31, NFR-3: the map's code and outlines load once it nears the screen, after the page.
	let mapModule: Promise<typeof import('#lib/charts/SocietyMap.svelte')> | undefined = $state();
	function loadMapWhenNear(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					mapModule ??= import('#lib/charts/SocietyMap.svelte');
					observer.disconnect();
				}
			},
			{ rootMargin: '300px' }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}

	// A fingerprint needs the sample's cells: start fetching before the click (decision 27).
	function warm() {
		const sample = vs.sample;
		preload(
			() => loadGlobal(sample),
			() => loadCells(sample),
			() => loadSimilarity(sample)
		);
	}
</script>

<Seo
	title="Societies"
	description="Respondents in 90 societies: for each, where their answers depart from the global average, whose answers are most alike, and who took part."
	imageAlt="{SHARE_ALT.societies} {data.summary}"
/>

<div class="page">
	<div class="intro">
		<div class="page-title">
			<h1>Societies</h1>
			<ShareButton />
		</div>
		<p class="lede">{summary}</p>
		<p>
			Pick a society, on the map, in the Society box above or in the list below, to see where its
			respondents were stricter or looser than the average of all societies.
		</p>
		<noscript>
			<p>
				The list of societies needs JavaScript. Every society also has its own page, at societies/
				followed by its three-letter code, such as societies/chl/ for Chile.
			</p>
		</noscript>
	</div>

	{#if societies.error}
		<LoadError error={societies.error} retry={societies.retry} />
	{/if}

	<!-- D-31: the index opens with where the societies are, each dot a way to its page. -->
	<div class="map-section needs-js">
		<ChartFrame
			id="map"
			title="Where the {societies.current?.list.length ?? 90} societies are"
			summary={mapText}
			about={resolve('method/#map')}
		>
			{#snippet legend()}
				<RegionLegend
					mode="place"
					outside={!!societies.current?.list.some(
						(s) => !societies.current?.inSample(s.code, vs.sample)
					)}
				/>
			{/snippet}
			{#snippet chart()}
				<div {@attach loadMapWhenNear}>
					{#if mapModule && societies.current}
						{#await mapModule}
							<div class="placeholder map"></div>
						{:then { default: SocietyMap }}
							<SocietyMap
								societies={societies.current}
								sample={vs.sample}
								href={(code) => societyHref(code, vs)}
								onwarm={warm}
								label="Map of the societies by the GSN authors' regions"
								describedBy="map-summary"
							/>
						{:catch error}
							<LoadError
								{error}
								retry={() => (mapModule = import('#lib/charts/SocietyMap.svelte'))}
							/>
						{/await}
					{:else}
						<div class="placeholder map"></div>
					{/if}
				</div>
			{/snippet}
			{#snippet table()}
				{#if societies.current}
					<table class="data">
						<caption>The societies, their region and their respondents in this sample</caption>
						<thead>
							<tr
								><th scope="col">Society</th><th scope="col">Region</th><th scope="col"
									>Respondents</th
								></tr
							>
						</thead>
						<tbody>
							{#each [...societies.current.list].sort( (a, b) => a.name.localeCompare(b.name, 'en') ) as society (society.code)}
								{@const n = societies.current.respondents(society.code, vs.sample)}
								<tr>
									<th scope="row">{society.name}</th>
									<td>{society.region}</td>
									<td class="num">{n === null ? 'not in this sample' : count(n)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			{/snippet}
		</ChartFrame>
	</div>

	<!-- Decision 52: the regions are the GSN authors' grouping (§4.4). Rows are reserved before the
	     list arrives, so nothing shifts (NFR-2). -->
	<div class="regions needs-js">
		{#each REGIONS as region (region)}
			{@const members = groups?.find((g) => g.region === region)?.members}
			<section aria-labelledby="region-{region.replace(' ', '-')}">
				<h2 id="region-{region.replace(' ', '-')}">
					{region} <span class="count">({data.regions[region]} societies)</span>
				</h2>
				<ul>
					{#if members}
						{#each members as society (society.code)}
							{@const n = societies.current?.respondents(society.code, vs.sample) ?? null}
							<li>
								<a href={societyHref(society.code, vs)} onpointerenter={warm} onfocus={warm}>
									{society.name}
								</a>
								<span class="n" class:outside={n === null}>
									{n === null ? 'not in this sample' : `${count(n)} respondents`}
								</span>
							</li>
						{/each}
					{:else}
						{#each { length: data.regions[region] }, i (i)}
							<li class="placeholder" aria-hidden="true">
								<span>&nbsp;</span><span class="n">&nbsp;</span>
							</li>
						{/each}
					{/if}
				</ul>
			</section>
		{/each}
		<p class="note">
			The regions are the GSN authors' four-way grouping, a convenience with known oddities: Russia
			and Israel are in the West and Turkey is in Asia.
		</p>
	</div>
</div>

<style>
	.page {
		max-width: var(--page);
		margin: 0 auto;
		padding: 1.5rem var(--gutter) 0;
	}

	.intro {
		max-width: var(--measure);
	}

	.map-section {
		margin-top: 1.5rem;
	}

	/* The map's shape (map-model.ts), held before its module and outlines arrive (NFR-2). */
	.placeholder.map {
		aspect-ratio: 2.466;
		border-radius: var(--radius);
		background: var(--surface-muted);
	}

	.lede {
		font-size: var(--text-lg);
	}

	section {
		margin-top: 2rem;
	}

	h2 {
		font-size: var(--text-lg);
		margin: 0 0 0.5rem;
	}

	.count {
		font-weight: 400;
		color: var(--text-muted);
		font-size: var(--text-md);
	}

	ul {
		columns: 15rem;
		column-gap: 2rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Two fixed lines per row, so the list takes the same space before and after it loads. */
	li {
		display: flex;
		flex-direction: column;
		break-inside: avoid;
		height: 3.25rem;
		padding: 0.25rem 0;
		line-height: 1.35;
	}

	li a {
		width: fit-content;
		font-weight: 600;
	}

	.n {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.n.outside {
		font-style: italic;
	}

	.note {
		max-width: var(--measure);
		margin-top: 2rem;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
</style>
