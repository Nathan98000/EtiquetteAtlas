<script lang="ts">
	import { resolve } from '$app/paths';
	import { loadSocieties } from '#lib/data/load.ts';
	import { SAMPLE_LABEL, SAMPLES, type SampleId, type Scale } from '#lib/data/model.ts';
	import { RELATIVE } from '#lib/data/format.ts';
	import { Resource } from '#lib/data/resource.svelte.ts';
	import { setView, view } from '#lib/state/view.svelte.ts';
	import CopyLink from './CopyLink.svelte';
	import Segmented from './Segmented.svelte';
	import SocietyPicker from './SocietyPicker.svelte';

	const societies = new Resource(() => loadSocieties());
	let optionsOpen = $state(false);

	const sample = $derived(view.state.sample);
	const sampleOptions = SAMPLES.map((value) => ({ value, label: SAMPLE_LABEL[value] }));
	const scaleOptions: { value: Scale; label: string }[] = [
		// Decision 5 (D-8): the scales in plain words; the URL keeps `scale=centered`.
		{ value: 'raw', label: 'As answered' },
		{ value: 'centered', label: RELATIVE[0].toUpperCase() + RELATIVE.slice(1) }
	];
	const counts: Record<SampleId, number> = { all: 90, paper: 71, attention: 80 };
</script>

<!-- FR-3 to FR-5, FR-81: the global controls. Every change updates the URL, and every view
     reads the URL, so all of them change together (§6.3, AT-11). -->
<section class="control-bar" aria-label="View controls">
	<div class="inner">
		<SocietyPicker
			societies={societies.current}
			selected={view.state.society}
			{sample}
			onselect={(code) => setView({ society: code })}
		/>
		<button
			type="button"
			class="options-toggle button"
			aria-expanded={optionsOpen}
			aria-controls="view-options"
			onclick={() => (optionsOpen = !optionsOpen)}
		>
			Options
		</button>
		<div id="view-options" class="options" class:open={optionsOpen}>
			<div class="sample">
				<Segmented
					legend="Sample"
					name="sample"
					value={sample}
					options={sampleOptions}
					onchange={(value) => setView({ sample: value })}
				/>
				<!-- FR-4: a badge whenever a non-default sample is active. Its space is kept so the
				     bar does not move when it appears. -->
				<p class="badge" class:shown={sample !== 'all'} role="status">
					{#if sample !== 'all'}
						{SAMPLE_LABEL[sample]}: {societies.current?.count(sample) ?? counts[sample]} societies
					{/if}
				</p>
			</div>
			<div class="scale">
				<Segmented
					legend="Scale"
					name="scale"
					value={view.state.scale}
					options={scaleOptions}
					onchange={(value) => setView({ scale: value })}
				/>
				<a class="about" href={resolve('method/#centered')}>About the two scales</a>
			</div>
			<CopyLink />
		</div>
	</div>
</section>

<style>
	.control-bar {
		border-bottom: 1px solid var(--border);
		background: var(--surface-muted);
	}

	.inner {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem 1.5rem;
		max-width: var(--page);
		margin: 0 auto;
		padding: 0.75rem var(--gutter);
	}

	.options {
		display: contents;
	}

	.sample,
	.scale {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.25rem 0.75rem;
	}

	.badge {
		min-width: 13rem;
		margin: 0;
		padding: 0.25rem 0.625rem;
		border: 2px solid transparent;
		border-radius: 999px;
		font-size: var(--text-sm);
		font-weight: 600;
		visibility: hidden;
	}

	.badge.shown {
		visibility: visible;
		border-color: var(--text);
	}

	.about {
		font-size: var(--text-sm);
		padding: 0.5rem 0;
	}

	.options-toggle {
		display: none;
	}

	/* < 640 px: the picker stays in a sticky bar and the other controls fold away (§6.2). */
	@media (max-width: 639.98px) {
		.control-bar {
			position: sticky;
			top: 0;
			z-index: 15;
		}

		.inner {
			flex-wrap: wrap;
			align-items: flex-end;
		}

		.options-toggle {
			display: inline-flex;
		}

		.options {
			display: none;
			flex-basis: 100%;
		}

		.options.open {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
		}

		.badge {
			min-width: 0;
		}

		.badge:not(.shown) {
			display: none;
		}
	}
</style>
