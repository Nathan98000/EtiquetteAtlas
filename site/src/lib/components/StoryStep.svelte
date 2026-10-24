<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		id: string;
		/** 0-based position and the number of steps, for "Step 2 of 6". */
		index: number;
		count: number;
		title: string;
		text: Snippet;
		figure?: Snippet;
		previous?: () => void;
		next?: () => void;
		/** The step crosses the middle of the window: it is the current one (FR-64). */
		oncurrent: (id: string) => void;
		/** The step is within a screen of the window: time to load its data (NFR-3). */
		onnear: (id: string) => void;
	}

	let { id, index, count, title, text, figure, previous, next, oncurrent, onnear }: Props =
		$props();

	let section: HTMLElement | undefined = $state();

	onMount(() => {
		if (!section || !('IntersectionObserver' in window)) {
			onnear(id);
			return;
		}
		const middle = new IntersectionObserver(
			(entries) => entries.some((e) => e.isIntersecting) && oncurrent(id),
			{ rootMargin: '-45% 0px -50% 0px' }
		);
		const near = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					onnear(id);
					near.disconnect();
				}
			},
			{ rootMargin: '100% 0px' }
		);
		middle.observe(section);
		near.observe(section);
		return () => {
			middle.disconnect();
			near.disconnect();
		};
	});
</script>

<!-- FR-64, FR-65: one step of the story, its text beside its chart from 1024 px and above it
     below that (§6.2), ending with Previous and Next (decision 81): under the text beside the
     chart, after the chart below 1024 px (D-22). -->
<section
	{id}
	class="story-step"
	class:figured={figure}
	aria-labelledby="{id}-title"
	bind:this={section}
>
	<div class="text">
		<h2 id="{id}-title" tabindex="-1">
			<span class="count">Step {index + 1} of {count}</span>
			{title}
		</h2>
		{@render text()}
	</div>
	{#if figure}
		<div class="figure">{@render figure()}</div>
	{/if}
	{#if previous || next}
		<div class="step-links">
			{#if previous}
				<button type="button" class="button" onclick={previous}>
					<span aria-hidden="true">←</span> Previous step
				</button>
			{/if}
			{#if next}
				<button type="button" class="button" onclick={next}>
					Next step <span aria-hidden="true">→</span>
				</button>
			{/if}
		</div>
	{/if}
</section>

<style>
	.story-step {
		display: grid;
		gap: 1.5rem;
		padding: 2.5rem 0;
		border-top: 1px solid var(--border);
		/* Clear the sticky step bar when a step is scrolled to. */
		scroll-margin-top: 4.5rem;
	}

	@media (min-width: 1024px) {
		.story-step {
			grid-template-columns: minmax(0, 26rem) minmax(0, 1fr);
			column-gap: 3rem;
			row-gap: 0;
			align-items: start;
		}

		.story-step.figured {
			grid-template-areas: 'text figure' 'links figure';
			grid-template-rows: auto 1fr;
		}

		.figured .text {
			grid-area: text;
		}

		.figured .figure {
			grid-area: figure;
		}

		.figured .step-links {
			grid-area: links;
		}
	}

	h2 {
		font-size: var(--text-xl);
	}

	h2:focus {
		outline: none;
	}

	h2:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 4px;
	}

	.count {
		display: block;
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--text-muted);
	}

	.text :global(p) {
		max-width: var(--measure);
	}

	.step-links {
		display: flex;
		flex-wrap: wrap;
		align-content: start;
		gap: 0.75rem;
	}

	@media (min-width: 1024px) {
		.step-links {
			margin-top: 1.5rem;
		}
	}

	.figure {
		min-width: 0;
	}
</style>
