<script lang="ts">
	import { setView } from '#lib/state/view.svelte.ts';

	interface Props {
		/** "Respondents in Kuwait are not in the paper's sample." */
		text: string;
	}

	let { text }: Props = $props();
</script>

<!-- Decisions 53 and 63: a society outside the active sample, with a way back to all respondents,
     where every society is. -->
<div class="notice" role="status">
	<p>{text}</p>
	<button type="button" class="button" onclick={() => setView({ sample: 'all' })}>
		Show all respondents
	</button>
</div>

<style>
	.notice {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		max-width: var(--measure);
		padding: 0.75rem 1rem;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
	}

	p {
		margin: 0;
		max-width: 28rem;
	}
</style>
