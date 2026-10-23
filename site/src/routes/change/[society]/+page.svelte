<script lang="ts">
	import { resolve } from '$app/paths';
	import ChangeArrows from '#lib/charts/ChangeArrows.svelte';
	import {
		changeChartSummary,
		changeSummary,
		globalChange,
		societyChange,
		subjectOf,
		type ChangeScope
	} from '#lib/charts/change-model.ts';
	import ChangeProvenance from '#lib/components/ChangeProvenance.svelte';
	import ChangeScaleNote from '#lib/components/ChangeScaleNote.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import SampleNotice from '#lib/components/SampleNotice.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { CHANGE_SHARE_ALT } from '#lib/change-text.ts';
	import { count, respondentsIn } from '#lib/data/format.ts';
	import { CELLS, cellParams } from '#lib/data/grid.ts';
	import { loadChange, loadSocieties } from '#lib/data/load.ts';
	import { CHANGE_SOCIETIES, SAMPLE_LABEL } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import { changeHref, setView, societyHref, view, withView } from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const vs = $derived(view.state);
	const who = $derived(respondentsIn(data.code, data.name));
	const Who = $derived(who[0].toUpperCase() + who.slice(1));

	// NFR-3: the change file loads on the change routes only, once the URL's sample applies
	// (decision 31), so a link with ?sample= fetches one change file rather than two.
	const change = new Resource(() => (view.ready ? loadChange(view.state.sample) : undefined));
	const societies = new Resource(() => loadSocieties());
	const file = $derived(change.current?.sample === vs.sample ? change.current : undefined);
	const n = $derived(file?.codes.length ?? CHANGE_SOCIETIES.length);
	const index = $derived(file?.indexOf(data.code));
	// Decision 63: not in the active sample (South Korea, the Netherlands, Portugal and Turkey in
	// the paper's sample); the page then shows the societies in both surveys (FR-53).
	const outside = $derived(file !== undefined && index === undefined);
	const scope: ChangeScope = $derived(
		outside ? { kind: 'global' } : { kind: 'society', code: data.code, name: data.name }
	);
	const together = $derived(subjectOf({ kind: 'global' }, n));
	const reference = $derived(file ? globalChange(file) : undefined);
	const arrows = $derived(
		file ? (index === undefined ? reference : societyChange(file, index)) : undefined
	);

	const outsideText = $derived(`${Who} are not in this sample (${SAMPLE_LABEL[vs.sample]}).`);
	// Until the browser has the data, the prerendered All-data text stands in (FR-87, decision 74).
	const summary = $derived(
		outside ? outsideText : arrows ? changeSummary(scope, arrows, n) : data.summary
	);
	const chartSummary = $derived(arrows ? changeChartSummary(scope, arrows, n) : data.chartSummary);
	const facts = $derived.by(() => {
		if (!file || index === undefined) return vs.sample === 'all' ? data.facts : undefined;
		const own = file.societies()[index];
		return {
			older: own.respondents,
			newer: societies.current?.respondents(data.code, vs.sample) ?? null,
			pairs: own.cells
		};
	});

	function href(cell: number) {
		const { behavior, situation } = cellParams(CELLS[cell]);
		return withView(resolve(`explore/${behavior}/${situation}/`), vs, GLOBAL_KEYS);
	}
</script>

<Seo
	title={data.title}
	description="How {who} judged 12 everyday behaviors in 10 situations in 2023–2024, against respondents there in a survey from 2000–2003: differences between two surveys, not change in individuals."
	imageAlt={CHANGE_SHARE_ALT}
/>

<div class="change-page">
	<nav class="crumbs" aria-label="Breadcrumb">
		<a href={changeHref(null, vs)}>All {n} societies in both surveys</a>
	</nav>
	<h1>{data.title}</h1>
	<p class="lede">{summary}</p>
	<noscript>
		<p>The chart needs JavaScript.</p>
	</noscript>

	{#each [change, societies] as resource, i (i)}
		{#if resource.error}
			<LoadError error={resource.error} retry={resource.retry} />
		{/if}
	{/each}

	{#if outside}
		<SampleNotice text="{outsideText} The chart shows {together} instead." />
	{:else}
		<!-- Fixed columns and lines, so values arriving after the page do not move it (NFR-2). -->
		<dl class="facts" aria-label="Respondents">
			<div>
				<dt>2000–2003 survey</dt>
				<dd class="num">{facts?.older ? `${count(facts.older)} respondents` : '…'}</dd>
			</div>
			<div>
				<dt>2023–2024 survey</dt>
				<dd class="num">
					{facts?.newer ? `${count(facts.newer)} respondents` : '…'}
					<span class="muted">{SAMPLE_LABEL[vs.sample]}</span>
				</dd>
			</div>
			<div>
				<dt>Pairs in both</dt>
				<dd class="num">{facts?.pairs ?? '…'}</dd>
			</div>
		</dl>
	{/if}

	<ChangeProvenance />
	<ChangeScaleNote />

	<ChangeArrows
		view={arrows}
		reference={outside ? undefined : reference}
		title={outside
			? `Averaged over ${together}, pair by pair`
			: `${Who} in 2000–2003 and 2023–2024, pair by pair`}
		summary={chartSummary}
		{together}
		sort={vs.sort}
		onsort={(sort) => setView({ sort })}
		{href}
	/>

	<p class="more-link">
		<a href={societyHref(data.code, vs)}>
			Where {who} judged the 15 behaviors more or less appropriate than the global average
		</a>
	</p>
</div>

<style>
	.change-page {
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

	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: 0.5rem 1rem;
		max-width: var(--measure);
		margin: 1rem 0 0;
	}

	.muted {
		display: block;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	dt {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	dd {
		margin: 0;
	}

	.more-link {
		margin: 2rem 0 0;
	}

	.more-link a::after {
		content: ' →';
	}
</style>
