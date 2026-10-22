<script lang="ts">
	interface Props {
		error: Error;
		retry: () => void;
	}

	let { error, retry }: Props = $props();
</script>

<!-- FR-86: a plain message and a retry control when a data file fails to load. -->
<div class="load-error" role="alert">
	<p>
		The data for this view could not be loaded. Check your connection and try again.
		<span class="detail">({error.message})</span>
	</p>
	<button type="button" class="button" onclick={retry}>Try again</button>
</div>

<style>
	.load-error {
		padding: 1rem;
		border: 1px solid var(--border-strong);
		border-left: 4px solid var(--text);
		border-radius: var(--radius);
		background: var(--surface-muted);
	}

	.detail {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
</style>
