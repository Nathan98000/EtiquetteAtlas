<script lang="ts">
	import type { BoxText } from '#lib/charts/drill-model.ts';

	interface Props {
		text: BoxText;
	}

	let { text }: Props = $props();
</script>

<!-- D-1, FR-25: the selected society's result for the pair, directly under the title. Its height is
     reserved for every state, so nothing moves when the URL's society applies after the page
     mounts (NFR-2). -->
<div class="society-box" aria-live="polite">
	<p class="lead">{text.lead}</p>
	<p class="note">{text.note}</p>
</div>

<style>
	.society-box {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.25rem;
		/* The longest state, "Respondents in the Central African Republic: …", with its note: seven
		   lines at 320 px, six from 360 px, three from 640 px and two from 1024 px (checked against
		   every state at each width). */
		min-height: 12rem;
		max-width: var(--measure);
		margin: 0.75rem 0 1rem;
		padding: 0.625rem 0.875rem;
		border-left: 4px solid var(--border-strong);
		background: var(--surface-muted);
	}

	@media (min-width: 360px) {
		.society-box {
			min-height: 10.5rem;
		}
	}

	@media (min-width: 640px) {
		.society-box {
			min-height: 7rem;
		}
	}

	@media (min-width: 1024px) {
		.society-box {
			min-height: 6rem;
		}
	}

	p {
		margin: 0;
	}

	.lead {
		font-weight: 600;
	}

	.note {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
</style>
