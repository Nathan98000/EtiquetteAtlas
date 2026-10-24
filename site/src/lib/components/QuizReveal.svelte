<script lang="ts">
	import { resolve } from '$app/paths';
	import Beeswarm from '#lib/charts/Beeswarm.svelte';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import DataTable, { type Column } from '#lib/charts/DataTable.svelte';
	import Distribution from '#lib/charts/Distribution.svelte';
	import type { Drill } from '#lib/charts/drill-model.ts';
	import SocietyTable from '#lib/charts/SocietyTable.svelte';
	import { RESPONSES, count, percent, place, score } from '#lib/data/format.ts';
	import type { ResponseCounts, SampleId, Society } from '#lib/data/model.ts';
	import {
		distributionSummary,
		placement,
		placementText,
		responseText,
		scoreOf,
		shares,
		societyAnswer,
		societyText,
		type QuizQuestion,
		type Response
	} from '#lib/quiz/quiz-model.ts';

	interface Props {
		question: QuizQuestion;
		response: Response;
		/** The cell's societies in the active sample; undefined while the files load. */
		drill: Drill | undefined;
		sample: SampleId;
		/** The society the reader chose, if any (FR-62). */
		society: Society | undefined;
		/** Its response counts: undefined while they load, null when it has none. */
		counts: ResponseCounts | null | undefined;
		onselect: (code: string) => void;
	}

	let { question, response, drill, sample, society, counts, onselect }: Props = $props();

	let hovered: string | null = $state(null);
	const where = $derived(drill ? placementText(placement(drill, response), response, sample) : '');
	const mine = $derived(
		drill && society && counts !== undefined
			? societyAnswer(drill, society.code, counts)
			: undefined
	);
	const who = $derived(society ? `respondents in ${place(society.code, society.name)}` : '');

	interface Row {
		response: string;
		respondents: string;
		share: string;
	}
	const columns: Column<Row>[] = [
		{ header: 'Response', text: (r) => r.response, rowHeader: true },
		{ header: 'Respondents', text: (r) => r.respondents },
		{ header: 'Share', text: (r) => r.share }
	];
	const rows = (c: ResponseCounts): Row[] =>
		RESPONSES.map((label, i) => ({
			response: i + 1 === response ? `${label} (your answer)` : label,
			respondents: count(c.counts[i]),
			share: percent(shares(c)[i])
		}));
</script>

<!-- FR-61: where the answer falls among the societies' estimates and, with a society chosen,
     within its respondents' answers (decision 79). -->
<div class="reveal">
	<ChartFrame
		id="answer"
		title="Your answer and {drill?.plotted.length ?? 'the'} societies' average answers"
		summary={drill ? where : 'Loading the societies’ answers…'}
		about={resolve('method/#quiz')}
	>
		{#snippet chart()}
			<div class="reserve">
				{#if drill}
					<Beeswarm
						{drill}
						uncertainty={false}
						selected={society?.code ?? null}
						{hovered}
						onhover={(code) => (hovered = code)}
						{onselect}
						label="Societies placed by their average answer to {question.headline.toLowerCase()}, with your answer"
						describedBy="answer-summary"
						marker={{ value: scoreOf(response), label: `Your answer: ${responseText(response)}` }}
						plain
					/>
				{/if}
			</div>
			<!-- D-9: what the marks are, without the model's words; the solid line's label gives way to
			     the reader's answer on the chart, so it is named here. -->
			<p class="note">
				Each dot is one society's average answer, coloured by it; pick one to compare with its
				respondents. The solid line is the global average{drill ? `, ${score(drill.mean)}` : ''};
				the dashed line is your answer, a single rating, so it sits on one of the six response
				points.
			</p>
		{/snippet}
		{#snippet table()}
			{#if drill}
				<SocietyTable {drill} caption="Each society's average answer, highest first" />
			{/if}
		{/snippet}
	</ChartFrame>

	{#if society}
		<section class="society" aria-labelledby="society-answer-title">
			<h3 id="society-answer-title">Respondents in {place(society.code, society.name)}</h3>
			{#if mine === undefined}
				<p class="muted">Loading their answers…</p>
			{:else}
				<p>{societyText(mine, society.code, society.name, question, response, sample)}</p>
				{#if mine.kind === 'counts'}
					<ChartFrame
						id="society-answers"
						title="How {who} answered"
						summary={distributionSummary(mine.counts, society.code, society.name, question)}
						about={resolve('method/#quiz')}
					>
						{#snippet chart()}
							<Distribution
								counts={mine.counts}
								answer={response}
								label="How {who} answered, by response"
							/>
						{/snippet}
						{#snippet table()}
							<DataTable
								caption="How {who} answered {question.headline.toLowerCase()}"
								rows={rows(mine.counts)}
								{columns}
								key={(r) => r.response}
							/>
						{/snippet}
					</ChartFrame>
				{/if}
			{/if}
		</section>
	{:else}
		<p class="hint">Pick a society above to see how its respondents answered.</p>
	{/if}
</div>

<style>
	.reveal {
		display: grid;
		gap: 1.5rem;
	}

	/* The beeswarm's height, kept while the files load (NFR-2). */
	.reserve {
		min-height: 18.375rem;
	}

	.note,
	.hint,
	.muted {
		max-width: var(--measure);
		margin: 0.5rem 0 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	h3 {
		font-size: var(--text-md);
		margin: 0 0 0.5rem;
	}

	.society p {
		max-width: var(--measure);
	}
</style>
