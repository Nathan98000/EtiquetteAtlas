<script lang="ts">
	import type { Bar } from '../model';

	// Horizontal bars for the story's and the method's cards: the paper's standard deviations, or
	// the respondents in each sample.
	interface Props {
		bars: Bar[];
		max: number;
		caption: string;
	}

	let { bars, max, caption }: Props = $props();

	/** The longest bar, leaving room for its text. */
	const BAR = 220;
</script>

<figure>
	{#each bars as bar (bar.label)}
		<div class="bar">
			<span class="label">{bar.label}</span>
			<span class="track">
				<span class="fill" style:width="{(bar.value / max) * BAR}px"></span>
				<span class="text">{bar.text}</span>
			</span>
		</div>
	{/each}
	<figcaption>{caption}</figcaption>
</figure>

<style>
	figure {
		margin: 0;
		width: 560px;
	}

	.bar {
		display: grid;
		gap: 6px;
		margin-bottom: 22px;
	}

	.label {
		font-size: 20px;
		font-weight: 700;
	}

	.track {
		display: flex;
		align-items: center;
		gap: 12px;
		height: 44px;
	}

	.fill {
		flex: none;
		height: 100%;
		background: var(--text-muted);
	}

	.text {
		font-size: 19px;
		white-space: nowrap;
	}

	figcaption {
		margin-top: 8px;
		font-size: 15px;
		color: var(--text-muted);
	}
</style>
