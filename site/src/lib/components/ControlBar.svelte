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

	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && optionsOpen) optionsOpen = false;
	}
</script>

<!-- FR-3 to FR-5, FR-81: the global controls. Every change updates the URL, and every view
     reads the URL, so all of them change together (§6.3, AT-11). D-33, decision 10: from 1024 px
     one row, the society, the scale, Options and Copy link; the sample is under Options at every
     width, and below 1024 px so are the scale and Copy link. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section class="control-bar" aria-label="View controls" onkeydown={keydown}>
	<div class="inner">
		<SocietyPicker
			societies={societies.current}
			selected={view.state.society}
			{sample}
			onselect={(code) => setView({ society: code })}
		/>
		<!-- FR-4: a badge whenever a non-default sample is active, outside Options. A `?sample=` link
		     holds its place from the first paint (app.html), so the bar does not move (NFR-2). -->
		<div class="badge-row" class:shown={sample !== 'all'}>
			<p class="badge" role="status">
				{#if sample !== 'all'}
					{SAMPLE_LABEL[sample]}: {societies.current?.count(sample) ?? counts[sample]} societies
				{/if}
			</p>
		</div>
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
					vertical
				/>
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
			<div class="copy">
				<CopyLink />
			</div>
		</div>
	</div>
</section>

<style>
	.control-bar {
		border-bottom: 1px solid var(--border);
		background: var(--surface-muted);
	}

	.inner {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem 1rem;
		max-width: var(--page);
		margin: 0 auto;
		padding: 0.75rem var(--gutter);
	}

	/* The badge has a row of its own, so a `?sample=` link, marked before the first paint
	   (app.html), holds the same place before and after its text arrives (NFR-2). */
	.badge-row {
		display: none;
		order: 3;
		flex-basis: 100%;
	}

	.badge-row.shown,
	:global(html[data-sample]) .badge-row {
		display: block;
	}

	.badge {
		display: inline-block;
		min-width: 15rem;
		min-height: 2rem;
		margin: 0;
		padding: 0.25rem 0.625rem;
		border: 2px solid var(--text);
		border-radius: 999px;
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.scale {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.25rem 0.75rem;
	}

	.about {
		font-size: var(--text-sm);
		padding: 0.5rem 0;
	}

	/* Below 1024 px: the sample, the scale and Copy link fold under Options (§6.2, D-33). */
	.options {
		display: none;
		flex-basis: 100%;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.options.open {
		display: flex;
	}

	/* < 640 px: the bar stays in reach as the page scrolls (§6.2). */
	@media (max-width: 639.98px) {
		.control-bar {
			position: sticky;
			top: 0;
			z-index: 15;
		}
	}

	/* ≥ 1024 px: one row; only the sample waits under Options, in a small panel. With another
	   sample, the badge takes a second row. */
	@media (min-width: 1024px) {
		.options,
		.options.open {
			display: contents;
		}

		.scale {
			order: 1;
			flex: none;
		}

		.options-toggle {
			order: 2;
			margin-left: auto;
			flex: none;
		}

		.copy {
			order: 3;
			flex: none;
			white-space: nowrap;
		}

		.badge-row {
			order: 4;
		}

		.sample {
			display: none;
		}

		.options.open .sample {
			display: block;
			position: absolute;
			z-index: 20;
			top: calc(100% - 0.25rem);
			right: var(--gutter);
			padding: 0.75rem;
			border: 1px solid var(--border-strong);
			border-radius: var(--radius);
			background: var(--surface-raised);
			box-shadow: var(--shadow);
		}
	}
</style>
