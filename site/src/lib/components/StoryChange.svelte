<script lang="ts">
	import { resolve } from '$app/paths';
	import { ARROWS_NOTE, societyArrows } from '#lib/charts/change-model.ts';
	import ChartFrame from '#lib/charts/ChartFrame.svelte';
	import DataTable, { type Column } from '#lib/charts/DataTable.svelte';
	import Dumbbell from '#lib/charts/Dumbbell.svelte';
	import type { PairRow } from '#lib/charts/dumbbell-model.ts';
	import { responseLabel, score } from '#lib/data/format.ts';
	import { CELLS, CHANGE_CELLS, headline, phrase } from '#lib/data/grid.ts';
	import { loadChange, loadSocieties } from '#lib/data/load.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import type { StoryNumbers } from '#lib/story/story-model.ts';
	import { changeHref, view } from '#lib/state/view.svelte.ts';
	import ChangeProvenance from './ChangeProvenance.svelte';
	import StoryStep from './StoryStep.svelte';

	interface Props {
		numbers: NonNullable<StoryNumbers['change']>;
		index: number;
		count: number;
		near: boolean;
		previous: () => void;
		next: () => void;
		oncurrent: (id: string) => void;
		onnear: (id: string) => void;
	}

	let { numbers, index, count, near, previous, next, oncurrent, onnear }: Props = $props();

	// The story shows All data (decision 82); the change file loads as the step nears (NFR-3).
	const change = new Resource(() => (near ? loadChange('all') : undefined));
	const societies = new Resource(() => (near ? loadSocieties() : undefined));
	const cell = $derived(CELLS[numbers.cell]);
	const k = $derived(CHANGE_CELLS.findIndex((c) => c.index === numbers.cell));
	const rows = $derived(
		change.current && societies.current
			? societyArrows(change.current, k, (code) => societies.current?.get(code)?.name ?? code)
			: undefined
	);
	const href = (s: number) => changeHref(change.current?.codes[s] ?? null, view.state, false);

	const columns: Column<PairRow>[] = [
		{ header: 'Respondents in', text: (r) => r.headline, rowHeader: true },
		{ header: '2000–2003', text: (r) => score(r.b) },
		{ header: '2023–2024', text: (r) => score(r.a) },
		{ header: 'Difference', text: (r) => score(r.gap) }
	];
</script>

<!-- FR-64, FR-52, NFR-41: the largest difference since the early 2000s, as a difference between
     two surveys, with the provenance note (decision 70). Only in a build with the change module:
     without it, vite.config.ts compiles this file to an empty component (R-6, decision 75). -->
<StoryStep
	id="change"
	{index}
	{count}
	title="Two surveys, 20 years apart"
	{previous}
	{next}
	{oncurrent}
	{onnear}
>
	{#snippet text()}
		<!-- D-22: about 50 words; the five largest differences in the chart, the rest on request. -->
		<p>
			For {numbers.societies} societies, a survey from 2000–2003 asked 12 of the same behaviors in the
			same situations. Averaged over them, respondents judged {phrase(cell)}
			{responseLabel(numbers.older)} then and {responseLabel(numbers.newer)} in 2023–2024: the largest
			difference of the 120 pairs both surveys asked. It is a difference between two surveys, not a change
			in anyone's views.
		</p>
		<ChangeProvenance />
	{/snippet}
	{#snippet figure()}
		<ChartFrame
			id="story-change"
			title={rows
				? `${headline(cell)}: ${rows.filter((r) => r.direction === 1).length} of ${rows.length} societies clearly higher in 2023–2024`
				: `${headline(cell)}, society by society`}
			subtitle="Each society in both surveys, largest first"
			summary="Each arrow runs from a society's 2000–2003 average to its 2023–2024 average; averaged over the {numbers.societies} societies, the difference is {score(
				numbers.diff
			)}."
			about={resolve('method/#change')}
			compact
		>
			{#snippet chart()}
				<div class="reserve">
					{#if rows}
						<Dumbbell
							id="story-change"
							arrow
							{rows}
							unpaired={[]}
							key={[
								{ label: '2000–2003 survey', mark: 'ring' },
								{ label: '2023–2024 survey (GSN)', mark: 'dot' },
								{ label: 'From 2000–2003 to 2023–2024', mark: 'arrow' }
							]}
							label="Societies in both surveys, largest difference first"
							first={5}
							showFirst="Show the 5 largest differences"
							showAll="Show all {rows.length} societies"
							unpairedLabel="societies not shown"
							note={ARROWS_NOTE}
							{href}
						/>
					{/if}
				</div>
			{/snippet}
			{#snippet table()}
				{#if rows}
					<DataTable
						caption="{headline(
							cell
						)}: each society's averages in both surveys, largest difference first"
						{rows}
						{columns}
						key={(r) => r.index}
					/>
				{/if}
			{/snippet}
		</ChartFrame>
	{/snippet}
</StoryStep>

<style>
	/* The five rows with their key and button, measured at 375, 640 and 1024 px (NFR-2). */
	.reserve {
		min-height: 40.5rem;
	}

	@media (min-width: 640px) {
		.reserve {
			min-height: 31rem;
		}
	}

	@media (min-width: 1024px) {
		.reserve {
			min-height: 25.5rem;
		}
	}
</style>
