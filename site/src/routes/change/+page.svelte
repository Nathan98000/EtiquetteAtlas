<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChangeArrows from '#lib/charts/ChangeArrows.svelte';
	import {
		behaviorStrip,
		behaviorStripSummary,
		changeChartSummary,
		changeSummary,
		globalChange,
		societiesSummary,
		societyStrip,
		societyStripSummary,
		subjectOf,
		VERDICT,
		type StripRow
	} from '#lib/charts/change-model.ts';
	import ChangeStrip from '#lib/charts/ChangeStrip.svelte';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import DataTable, { type Column } from '#lib/charts/DataTable.svelte';
	import ChangeProvenance from '#lib/components/ChangeProvenance.svelte';
	import ChangeScaleNote from '#lib/components/ChangeScaleNote.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { CHANGE_SHARE_ALT } from '#lib/change-text.ts';
	import { attribution } from '#lib/attribution.ts';
	import { interval, place, score } from '#lib/data/format.ts';
	import { CELLS, cellParams } from '#lib/data/grid.ts';
	import { loadChange, loadSocieties } from '#lib/data/load.ts';
	import { CHANGE_SOCIETIES, SAMPLE_PHRASE, inChangeSurvey } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import { changeHref, setView, view, withView } from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const vs = $derived(view.state);

	// NFR-3: the change file loads on the change routes only, once the URL's sample applies
	// (decision 31), so a link with ?sample= fetches one change file rather than two.
	const change = new Resource(() => (view.ready ? loadChange(view.state.sample) : undefined));
	const societies = new Resource(() => loadSocieties());
	const file = $derived(change.current?.sample === vs.sample ? change.current : undefined);
	const n = $derived(file?.codes.length ?? CHANGE_SOCIETIES.length);
	const scope = { kind: 'global' } as const;
	const together = $derived(subjectOf(scope, n));

	// Decision 67: a society in both surveys has its own page; one view, one URL.
	$effect(() => {
		if (inChangeSurvey(vs.society)) {
			void goto(changeHref(vs.society, vs), { replaceState: true });
		}
	});
	// FR-53: a society the 2000–2003 survey did not include.
	const missing = $derived(
		vs.society && !inChangeSurvey(vs.society) ? societies.current?.get(vs.society) : undefined
	);

	const arrows = $derived(file ? globalChange(file) : undefined);
	const name = (code: string) => societies.current?.get(code)?.name ?? code;
	const strip = $derived(file && societies.current ? societyStrip(file, name) : undefined);
	const behaviors = $derived(file ? behaviorStrip(file) : undefined);

	// Until the browser has the data, the prerendered All-data text stands in (FR-87, decision 74).
	const summary = $derived(
		arrows && strip ? `${changeSummary(scope, arrows, n)} ${societiesSummary(strip)}` : data.summary
	);
	const others = $derived(
		file && societies.current ? societies.current.count(vs.sample) - file.codes.length : null
	);

	function href(cell: number) {
		const { behavior, situation } = cellParams(CELLS[cell]);
		return withView(resolve(`explore/${behavior}/${situation}/`), vs, GLOBAL_KEYS);
	}

	const stripColumns = (first: string, note: string): Column<StripRow>[] => [
		{ header: first, text: (r) => r.label, rowHeader: true },
		{ header: 'Mean difference', text: (r) => score(r.diff.value, 2) },
		{ header: '95% interval', text: (r) => interval(r.diff.lo, r.diff.hi, 2) },
		{
			header: 'How sure',
			text: (r) => VERDICT[r.direction][0].toUpperCase() + VERDICT[r.direction].slice(1)
		},
		{ header: note, text: (r) => r.note }
	];
</script>

<Seo
	title="Change since the early 2000s"
	description="How respondents in 26 societies judged 12 everyday behaviors in 10 situations in 2023–2024, against a survey from 2000–2003 that asked about the same behaviors and situations: differences between two surveys, not change in individuals."
	imageAlt="{CHANGE_SHARE_ALT} {data.summary}"
/>

<div class="change-page">
	<h1>Change since the early 2000s</h1>
	<p class="lede">{summary}</p>
	<noscript>
		<p>The charts need JavaScript.</p>
	</noscript>

	{#each [change, societies] as resource, i (i)}
		{#if resource.error}
			<LoadError error={resource.error} retry={resource.retry} />
		{/if}
	{/each}

	{#if missing}
		<!-- FR-53: say so, and show the societies in both surveys instead. -->
		<p class="notice" role="status">
			The 2000–2003 survey did not include {place(missing.code, missing.name)}, so this page shows {together}.
			<a href={changeHref(null, vs)}>Clear the society</a>
		</p>
	{/if}

	<ChangeProvenance />
	<ChangeScaleNote />

	<ChangeArrows
		view={arrows}
		title="Averaged over {together}, pair by pair"
		summary={arrows ? changeChartSummary(scope, arrows, n) : data.chartSummary}
		{together}
		sort={vs.sort}
		onsort={(sort) => setView({ sort })}
		{href}
	/>

	<section class="more" aria-label="Societies and behaviors">
		<ChartFrame
			id="societies-strip"
			title="Each society, averaged over its pairs"
			summary={strip ? societyStripSummary(strip) : data.societySummary}
			about={resolve('method/#change')}
		>
			{#snippet chart()}
				<div class="reserve societies">
					{#if strip}
						<ChangeStrip
							rows={strip}
							label="Societies in both surveys, highest mean difference first"
							href={(code) => changeHref(code, vs)}
						/>
					{/if}
				</div>
			{/snippet}
			{#snippet table()}
				{#if strip}
					<DataTable
						caption="Each society's mean difference over its pairs, highest first"
						rows={strip}
						columns={stripColumns('Society', 'Pairs')}
						key={(r) => r.key}
					/>
				{/if}
			{/snippet}
		</ChartFrame>
		<p class="aside">
			{#if others !== null}
				The other {others} societies in {vs.sample === 'all' ? 'the GSN' : SAMPLE_PHRASE[vs.sample]} were
				not in the 2000–2003 survey.
			{:else}
				The other GSN societies were not in the 2000–2003 survey.
			{/if}
		</p>

		<ChartFrame
			id="behaviors-strip"
			title="Each behavior, averaged over societies and situations"
			summary={behaviors ? behaviorStripSummary(behaviors, n) : data.behaviorSummary}
			about={resolve('method/#change')}
		>
			{#snippet chart()}
				<div class="reserve behaviors">
					{#if behaviors}
						<ChangeStrip rows={behaviors} label="Behaviors, highest mean difference first" />
					{/if}
				</div>
			{/snippet}
			{#snippet table()}
				{#if behaviors}
					<DataTable
						caption="Each behavior's mean difference over societies and situations, highest first"
						rows={behaviors}
						columns={stripColumns('Behavior', 'Societies above 0')}
						key={(r) => r.key}
					/>
				{/if}
			{/snippet}
		</ChartFrame>
		<p class="aside">
			A behavior's societies "above 0" count every society whose difference is above 0, clearly or
			not. With the Paper's sample, these rows reproduce Table 1 of
			<a href={attribution.articleUrl} rel="external">Eriksson et al. ({attribution.year})</a>.
		</p>
	</section>
</div>

<style>
	.change-page {
		max-width: var(--page);
		margin: 0 auto;
		padding: 1.25rem var(--gutter) 0;
	}

	.lede {
		max-width: var(--measure);
		font-size: var(--text-lg);
	}

	.notice {
		max-width: var(--measure);
		padding: 0.75rem 1rem;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
	}

	.more {
		display: grid;
		gap: 1rem;
		max-width: 56rem;
		margin-top: 3rem;
	}

	.aside {
		max-width: var(--measure);
		margin: 0 0 2rem;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	/* Rows reserved at build time, measured with All data's 26 societies and 12 behaviors, so
	   nothing shifts (NFR-2). */
	.reserve.societies {
		min-height: 94rem;
	}

	.reserve.behaviors {
		min-height: 59rem;
	}

	@media (min-width: 640px) {
		.reserve.societies {
			min-height: 57rem;
		}

		.reserve.behaviors {
			min-height: 27rem;
		}
	}
</style>
