<script lang="ts">
	import type { BoxText } from '#lib/charts/drill-model.ts';

	interface Props {
		text: BoxText;
	}

	let { text }: Props = $props();
</script>

<!-- D-1, FR-25: the selected society's result for the pair, directly under the title. With a
     society in the URL (marked on <html> before the first paint, app.html) its height is reserved for
     every state, so nothing moves when the society applies after the page mounts (NFR-2); without
     one, the invitation to pick takes two short lines. -->
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
		/* "Pick a society to see where it stands" and its note: four lines at 320 px, three from
		   360 px and two from 640 px. */
		min-height: 7.5rem;
		max-width: var(--measure);
		margin: 0.75rem 0 1rem;
		padding: 0.625rem 0.875rem;
		border-left: 4px solid var(--text);
	}

	@media (min-width: 360px) {
		.society-box {
			min-height: 5.75rem;
		}
	}

	@media (min-width: 640px) {
		.society-box {
			min-height: 4.5rem;
		}
	}

	/* With a society in the URL: the longest state, "Respondents in the Central African Republic:
	   …", with its note: eight lines at 320 px, six from 360 px, three from 640 px and two from
	   1024 px (checked against every state at each width). */
	:global(html[data-society]) .society-box {
		min-height: 13.5rem;
	}

	@media (min-width: 360px) {
		:global(html[data-society]) .society-box {
			min-height: 10.5rem;
		}
	}

	@media (min-width: 640px) {
		:global(html[data-society]) .society-box {
			min-height: 7rem;
		}
	}

	@media (min-width: 1024px) {
		:global(html[data-society]) .society-box {
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
