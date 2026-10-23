<script lang="ts">
	import { resolve } from '$app/paths';
	import { societyLabel } from '#lib/charts/audience-model.ts';
	import { SAMPLE_LABEL, type Society } from '#lib/data/model.ts';
	import { setView, view } from '#lib/state/view.svelte.ts';
	import SampleNotice from './SampleNotice.svelte';
	import Segmented from './Segmented.svelte';
	import Toggle from './Toggle.svelte';

	interface Props {
		/** The society picked in the control bar, when the societies are known. */
		society: Society | undefined;
		/** The picked society is not in the active sample (decision 63). */
		outside: boolean;
	}

	let { society, outside }: Props = $props();

	const vs = $derived(view.state);
	const scoped = $derived(society !== undefined && !outside);
	const inSociety = $derived(scoped && vs.scope !== 'global');
	const who = $derived(society ? societyLabel(society.code, society.name) : '');
</script>

<!-- FR-42: one society or all societies, the actor's gender, and women and men respondents for
     all societies only (DR-12, §4.7). Every change is a navigation (decision 57). -->
<div class="filters needs-js">
	<div class="scope">
		{#if scoped}
			<Segmented
				legend="Show"
				name="scope"
				value={vs.scope}
				options={[
					{ value: 'society', label: who },
					{ value: 'global', label: 'All societies' }
				]}
				onchange={(scope) => setView({ scope })}
			/>
		{:else if outside}
			<SampleNotice
				text="{who} are not in this sample ({SAMPLE_LABEL[
					vs.sample
				]}), so the charts show all societies."
			/>
		{:else}
			<p class="hint">Showing all societies. Pick a society above to see its respondents.</p>
		{/if}
	</div>
	<div class="toggles">
		<Toggle
			label="Who does it: a woman or a man (actor gender)"
			checked={vs.actor}
			onchange={(actor) => setView({ actor })}
		/>
		<Toggle
			label="Women and men respondents"
			checked={vs.split}
			disabled={inSociety
				? 'For all societies together only: within one society these groups are too small.'
				: null}
			onchange={(split) => setView({ split })}
		/>
	</div>
	<p class="note">
		{#if vs.split && !inSociety}
			Respondents who answered "other" or preferred not to say are left out of this split, though
			they count everywhere else.
		{/if}
		{#if vs.scale === 'centered'}
			Centering applies to the situations only: these charts show raw scores. The drop from alone to
			management or professors is a difference within each society either way.
			<a href={resolve('method/#audiences')}>Why</a>
		{:else}
			Raw scores, from −2.5 (extremely inappropriate) to +2.5 (extremely appropriate).
		{/if}
	</p>
</div>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem 2rem;
		margin: 1rem 0 1.5rem;
	}

	/* The space of the society switch is kept while the societies load, so nothing shifts. */
	.scope {
		min-height: 4.25rem;
		display: flex;
		align-items: flex-end;
	}

	.toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
	}

	.hint {
		margin: 0;
		max-width: 22rem;
		color: var(--text-muted);
	}

	.note {
		flex-basis: 100%;
		max-width: var(--measure);
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
</style>
