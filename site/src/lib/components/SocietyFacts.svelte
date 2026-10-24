<script lang="ts">
	import LoadError from '#lib/components/LoadError.svelte';
	import { count } from '#lib/data/format.ts';
	import { loadSocieties } from '#lib/data/load.ts';
	import { SAMPLE_LABEL, SAMPLES, type Societies } from '#lib/data/model.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { listText, period } from '#lib/data/society.ts';
	import { societyHref, view } from '#lib/state/view.svelte.ts';

	// FR-71: every society's respondents in each sample, its student share, its interface
	// languages and its fieldwork period, drawn in the browser from societies.json (decision 93):
	// 90 rows would be a dataset in the page's __data.json (decision 28). A table from 760 px, a
	// list below, so nothing scrolls sideways (NFR-21). Its height is reserved.
	const societies = new Resource(() => loadSocieties());
	const vs = $derived(view.state);

	interface Row {
		code: string;
		name: string;
		region: string;
		respondents: string[];
		students: string;
		languages: string;
		fieldwork: string;
	}

	/** The share flagged as students, as stored, and the share with no status (decision 11). */
	function students(share: number, unknown: number): string {
		if (unknown >= 100) return 'not recorded';
		return unknown === 0 ? `${share}%` : `${share}% (${unknown}% unknown)`;
	}

	function rowsOf(file: Societies): Row[] {
		return [...file.list]
			.sort((a, b) => a.name.localeCompare(b.name, 'en'))
			.map((s) => {
				const facts = file.facts(s.code, 'all')!;
				return {
					code: s.code,
					name: s.name,
					region: s.region,
					respondents: SAMPLES.map((sample) => {
						const n = file.respondents(s.code, sample);
						return n === null ? '–' : count(n);
					}),
					students: students(facts.studentShare, facts.studentUnknown),
					languages: listText(facts.languages),
					fieldwork: period(facts.firstMonth, facts.lastMonth) ?? 'not shown'
				};
			});
	}

	const rows = $derived(societies.current ? rowsOf(societies.current) : null);
</script>

<div class="facts" aria-busy={rows === null}>
	{#if societies.error}
		<LoadError error={societies.error} retry={societies.retry} />
	{:else if rows}
		<table class="wide">
			<caption>
				Respondents in each sample, the share recorded as students among all respondents, the
				languages of the survey and the months of fieldwork. A dash means the society is not in that
				sample.
			</caption>
			<thead>
				<tr>
					<th scope="col">Society</th>
					{#each SAMPLES as sample (sample)}<th scope="col" class="n">{SAMPLE_LABEL[sample]}</th
						>{/each}
					<th scope="col">Students</th>
					<th scope="col">Languages</th>
					<th scope="col">Fieldwork</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.code)}
					<tr>
						<th scope="row"><a href={societyHref(row.code, vs)}>{row.name}</a></th>
						{#each row.respondents as n, i (i)}<td class="n">{n}</td>{/each}
						<td>{row.students}</td>
						<td>{row.languages}</td>
						<td>{row.fieldwork}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<ul class="narrow" aria-label="Societies in the data">
			{#each rows as row (row.code)}
				<li>
					<a href={societyHref(row.code, vs)}>{row.name}</a>
					<dl>
						{#each SAMPLES as sample, i (sample)}
							<div>
								<dt>{SAMPLE_LABEL[sample]}</dt>
								<dd>{row.respondents[i]}</dd>
							</div>
						{/each}
						<div>
							<dt>Students</dt>
							<dd>{row.students}</dd>
						</div>
						<div>
							<dt>Languages</dt>
							<dd>{row.languages}</dd>
						</div>
						<div>
							<dt>Fieldwork</dt>
							<dd>{row.fieldwork}</dd>
						</div>
					</dl>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="needs-js">Loading the societies…</p>
	{/if}
	<noscript>
		<p>The table needs JavaScript. Each society's page lists the same facts without it.</p>
	</noscript>
</div>

<style>
	.facts {
		min-height: 160rem;
	}

	.facts:not([aria-busy='true']) {
		min-height: 0;
	}

	table {
		border-collapse: collapse;
		width: 100%;
		font-size: var(--text-sm);
	}

	caption {
		text-align: left;
		padding-bottom: 0.5rem;
	}

	th,
	td {
		padding: 0.3rem 0.4rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}

	thead th {
		border-bottom: 2px solid var(--border-strong);
		vertical-align: bottom;
	}

	.n {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.narrow {
		display: none;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.narrow li {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
	}

	dl {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: 0.25rem 1rem;
		margin: 0.25rem 0 0;
		font-size: var(--text-sm);
	}

	dt {
		color: var(--text-muted);
	}

	dd {
		margin: 0;
	}

	@media (max-width: 759px) {
		.wide {
			display: none;
		}

		.narrow {
			display: block;
		}
	}
</style>
