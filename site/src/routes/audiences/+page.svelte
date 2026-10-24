<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		audienceOrder,
		audienceRows,
		audiencesSummary,
		effectShort,
		multiplesTable,
		panelDetails,
		readingOrder,
		subjectOf,
		type AudienceScope,
		type MultipleTableRow
	} from '#lib/charts/audience-model.ts';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import DataTable, { type Column } from '#lib/charts/DataTable.svelte';
	import SeriesKey, { type KeyItem } from '#lib/charts/SeriesKey.svelte';
	import Slopegraph from '#lib/charts/Slopegraph.svelte';
	import AudienceCredit from '#lib/components/AudienceCredit.svelte';
	import AudienceFilters from '#lib/components/AudienceFilters.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SHARE_ALT } from '#lib/share.ts';
	import SortSelect from '#lib/components/SortSelect.svelte';
	import { AUDIENCE_SORT_KEYS } from '#lib/data/derive.ts';
	import { BEHAVIOR_TEXT, BEHAVIORS, CONTEXT_TEXT, CONTEXTS } from '#lib/data/grid.ts';
	import { loadContexts, loadSocieties } from '#lib/data/load.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { audiencesHref, setView, view } from '#lib/state/view.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const vs = $derived(view.state);

	// NFR-3: the contexts file loads on the audiences routes only.
	// The URL's sample applies once the app has mounted (decision 31); loading waits for it, so
	// ?sample= never fetches All data's file first (decision 96).
	const contexts = new Resource(() => (view.ready ? loadContexts(view.state.sample) : undefined));
	const societies = new Resource(() => loadSocieties());

	const file = $derived(contexts.current?.sample === vs.sample ? contexts.current : undefined);
	const society = $derived(societies.current?.get(vs.society));
	const known = $derived(file !== undefined && (vs.society === null || societies.current));
	const index = $derived(society && file ? file.indexOf(society.code) : undefined);
	const outside = $derived(society !== undefined && file !== undefined && index === undefined);
	const scope: AudienceScope = $derived(
		society && index !== undefined && vs.scope !== 'global'
			? { kind: 'society', index, code: society.code, name: society.name }
			: { kind: 'global' }
	);
	const rows = $derived(file && known ? audienceRows(file, { scope, split: vs.split }) : undefined);
	// FR-41: the panels and their table follow the sort; paper order until the data arrives.
	const order = $derived(rows ? audienceOrder(rows, vs.sort) : BEHAVIORS.map((_, b) => b));
	// Until the browser has the data, the prerendered All-data summary stands in (FR-87).
	const summary = $derived(
		rows && file ? audiencesSummary(rows, subjectOf(scope, file.codes.length)) : data.summary
	);

	const KEY: Record<string, KeyItem> = {
		main: { label: '', mark: 'dot', line: 'solid' },
		reference: { label: 'All societies', mark: 'tick', line: 'dashed' },
		women: { label: 'Women respondents', mark: 'dot', line: 'solid' },
		men: { label: 'Men respondents', mark: 'square', line: 'long-dash' }
	};
	const key = $derived(
		rows
			? readingOrder(rows[0].series).map((s) => ({ ...KEY[s.kind], label: s.label }))
			: [{ ...KEY.main, label: 'All societies' }]
	);
	const shownContexts = $derived(vs.actor ? CONTEXTS.length : 3);

	const columns: Column<MultipleTableRow>[] = $derived([
		{ header: 'Behavior', text: (r) => r.behavior, rowHeader: true },
		{ header: 'Who', text: (r) => r.series },
		...CONTEXTS.slice(0, shownContexts).map((c, k) => ({
			header: CONTEXT_TEXT[c].label,
			text: (r: MultipleTableRow) => r.values[k]
		})),
		{ header: 'Alone minus management or professors', text: (r) => r.effect },
		...(vs.actor ? [{ header: 'Woman minus man', text: (r: MultipleTableRow) => r.actorGap }] : [])
	]);
</script>

<Seo
	title="Who's watching?"
	description="How respondents in 90 societies judged 15 everyday behaviors when alone, in front of colleagues or classmates and in front of management or professors, and done by a woman or by a man."
	imageAlt="{SHARE_ALT.audiences} {data.summary}"
/>

<div class="audiences-page">
	<h1>Who's watching?</h1>
	<!-- D-16: the module's finding is the lede; the chart's summary says what the panels show. -->
	<p class="lede">{summary}</p>
	<noscript>
		<p>The small multiples need JavaScript.</p>
	</noscript>

	{#each [contexts, societies] as resource, i (i)}
		{#if resource.error}
			<LoadError error={resource.error} retry={resource.retry} />
		{/if}
	{/each}

	<AudienceFilters {society} {outside} />

	<ChartFrame
		id="multiples"
		title="All {BEHAVIORS.length} behaviors, by audience"
		summary="The survey also asked about the {BEHAVIORS.length} behaviors without a situation, by who is watching. Each panel shows one behavior, from left to right alone, in front of colleagues or classmates and in front of management or professors, and opens its own page."
		about={resolve('method/#audiences')}
	>
		{#snippet controls()}
			<SortSelect
				keys={AUDIENCE_SORT_KEYS}
				value={vs.sort}
				onchange={(sort) => setView({ sort })}
			/>
		{/snippet}
		{#snippet legend()}
			<SeriesKey items={key} />
			<!-- Section 5 of the design review: the axis in one line. -->
			<p class="axis-key">
				Higher is more appropriate, from −2.5 (extremely inappropriate) to +2.5 (extremely
				appropriate); the dark line is 0.{vs.actor
					? ' After the dotted rule: done by a woman and done by a man.'
					: ''} Colours as on the matrix; dashed outline: 10 to 29 respondents.
			</p>
		{/snippet}
		{#snippet chart()}
			<ol class="multiples">
				{#each order as i (i)}
					{@const row = rows?.[i]}
					<li>
						<!-- The link's name is its visible text (WCAG 2.5.3); the values in full are its
						     description. -->
						<a
							href={audiencesHref(BEHAVIORS[i], vs)}
							aria-describedby={row && !row.notAsked ? `panel-${i}` : undefined}
						>
							<span class="name">{BEHAVIOR_TEXT[BEHAVIORS[i]].label}</span>
							<!-- A no-break space keeps the line's height before the data arrives. -->
							<span class="effect">
								{row ? (row.notAsked ? 'Not asked' : effectShort(row.effect)) : '\u00a0'}
							</span>
							{#if row?.notAsked}
								<span class="not-asked" aria-hidden="true">–</span>
							{:else}
								<Slopegraph {row} actor={vs.actor} size="small" />
							{/if}
						</a>
						{#if row && !row.notAsked}
							<span id="panel-{i}" hidden>{panelDetails(row, vs.actor)}</span>
						{/if}
					</li>
				{/each}
			</ol>
		{/snippet}
		{#snippet table()}
			{#if rows}
				<DataTable
					caption="Each behavior by audience{vs.actor
						? ' and by who does it'
						: ''}, in the order shown"
					rows={multiplesTable(rows, order)}
					{columns}
					key={(r) => r.key}
				/>
			{/if}
		{/snippet}
	</ChartFrame>

	<AudienceCredit />
</div>

<style>
	.audiences-page {
		max-width: var(--page);
		margin: 0 auto;
		padding: 1.25rem var(--gutter) 0;
	}

	.lede {
		max-width: var(--measure);
		font-size: var(--text-lg);
	}

	.axis-key {
		max-width: var(--measure);
		margin: 0 0 1rem;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	/* Five panels a row from 1024 px, three from 640 px, two below (decision 59). */
	.multiples {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	@media (min-width: 640px) {
		.multiples {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.multiples {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
	}

	a {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		height: 100%;
		padding: 0.5rem 0.5rem 0.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		text-decoration: none;
	}

	a:hover {
		border-color: var(--border-strong);
		background: var(--surface-muted);
	}

	.name {
		font-weight: 700;
		line-height: 1.25;
		color: var(--link);
	}

	a:hover .name {
		text-decoration: underline;
	}

	.effect {
		font-size: var(--text-sm);
		line-height: 1.3;
		color: var(--text-muted);
		/* Two lines at most, kept even when the text needs one, so panels align. */
		min-height: 2.6em;
	}

	.not-asked {
		display: grid;
		place-items: center;
		height: 128px;
		color: var(--text-muted);
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
	}
</style>
