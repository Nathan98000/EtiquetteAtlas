<script lang="ts" module>
	import type { ResolvedPathname } from '$app/types';
	import type { Drill } from '#lib/charts/drill-model.ts';
	import type { ResponseCounts } from '#lib/data/model.ts';
	import type { QuizQuestion, Response } from '#lib/quiz/quiz-model.ts';

	export interface SummaryRow {
		question: QuizQuestion;
		response: Response | undefined;
		drill: Drill | undefined;
		/** The chosen society's response counts: undefined while they load, null when it has none. */
		counts: ResponseCounts | null | undefined;
		href: ResolvedPathname;
	}
</script>

<script lang="ts">
	import { place } from '#lib/data/format.ts';
	import type { SampleId, Society } from '#lib/data/model.ts';
	import {
		placement,
		scoreOf,
		societyAnswer,
		societyShareText,
		summaryLine,
		takeaway
	} from '#lib/quiz/quiz-model.ts';

	interface Props {
		rows: SummaryRow[];
		society: Society | undefined;
		sample: SampleId;
	}

	let { rows, society, sample }: Props = $props();

	const placements = $derived(
		rows.map((r) => (r.drill && r.response !== undefined ? placement(r.drill, r.response) : null))
	);

	// One scale for the three strips, −2.5 to +2.5 (§4.3), inset so the end marks show whole.
	const INSET = 6;
	const HEIGHT = 30;
	let width = $state(0);
	const x = (v: number) => INSET + ((v + 2.5) / 5) * Math.max(0, width - 2 * INSET);
</script>

<!-- D-10: the end of the quiz: one takeaway, each answer against the spread of the societies'
     average answers, and the chosen society's share who answered the same. Nothing here is put in
     a link, the address or a request (FR-63, C-12). -->
<p class="takeaway">{takeaway(placements)}</p>

<ol class="rows" bind:clientWidth={width}>
	{#each rows as row, i (row.question.key)}
		{@const p = placements[i]}
		<li>
			<a class="pair" href={row.href}>{row.question.headline}</a>
			{#if row.response === undefined}
				<p class="line">Not answered.</p>
			{:else if row.drill && p}
				<svg class="strip" {width} height={HEIGHT} aria-hidden="true">
					{#if width > 0}
						<line class="track" x1={x(-2.5)} x2={x(2.5)} y1={HEIGHT / 2} y2={HEIGHT / 2} />
						{#each row.drill.plotted as point (point.code)}
							{@const px = x(point.estimate!.value)}
							<line
								class="society"
								class:chosen={point.code === society?.code}
								x1={px}
								x2={px}
								y1={7}
								y2={HEIGHT - 7}
							/>
						{/each}
						<line
							class="mine"
							x1={x(scoreOf(row.response))}
							x2={x(scoreOf(row.response))}
							y1={0}
							y2={HEIGHT}
						/>
					{/if}
				</svg>
				<p class="line">{summaryLine(p, row.response)}</p>
				{#if society}
					<p class="line society-line">
						{#if row.counts === undefined}
							Loading the answers of respondents in {place(society.code, society.name)}…
						{:else}
							{societyShareText(
								societyAnswer(row.drill, society.code, row.counts),
								society.code,
								society.name,
								row.question,
								row.response,
								sample
							)}
						{/if}
					</p>
				{/if}
			{:else}
				<p class="line">Loading…</p>
			{/if}
		</li>
	{/each}
</ol>

<!-- The strips' key, in words and the marks themselves (no colour needed). -->
<ul class="key" aria-hidden="true">
	<li><span class="key-society"></span> a society's average answer</li>
	{#if society}
		<li>
			<span class="key-society chosen"></span> respondents in {place(society.code, society.name)}
		</li>
	{/if}
	<li><span class="key-mine"></span> your answer</li>
	<li class="ends">from extremely inappropriate (left) to extremely appropriate (right)</li>
</ul>

<style>
	.takeaway {
		max-width: var(--measure);
		margin: 0 0 1rem;
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.rows li {
		padding: 0.75rem 0;
		border-top: 1px solid var(--border);
	}

	.pair {
		font-weight: 600;
	}

	.strip {
		display: block;
		margin: 0.375rem 0;
		overflow: visible;
	}

	.track {
		stroke: var(--border-strong);
		stroke-width: 1;
	}

	.society {
		stroke: var(--text-muted);
		stroke-width: 1;
		opacity: 0.55;
	}

	.society.chosen {
		stroke: var(--text);
		stroke-width: 3;
		opacity: 1;
	}

	.mine {
		stroke: var(--text);
		stroke-width: 2;
		stroke-dasharray: 4 3;
	}

	.line {
		max-width: var(--measure);
		margin: 0;
	}

	.society-line {
		color: var(--text-muted);
	}

	.key {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		margin: 0.5rem 0 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.key li {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.key-society {
		display: inline-block;
		width: 1px;
		height: 1rem;
		background: var(--text-muted);
	}

	.key-society.chosen {
		width: 3px;
		background: var(--text);
	}

	.key-mine {
		display: inline-block;
		height: 1rem;
		border-left: 2px dashed var(--text);
	}
</style>
