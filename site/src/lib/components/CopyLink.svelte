<script lang="ts">
	let message = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	// FR-81: copies the current permalink, which holds the whole view (FR-80).
	async function copy() {
		try {
			await navigator.clipboard.writeText(location.href);
			message = 'Link copied';
		} catch {
			message = 'Copying failed: the link is in the address bar';
		}
		clearTimeout(timer);
		timer = setTimeout(() => (message = ''), 4000);
	}
</script>

<div class="copy">
	<button type="button" class="button" onclick={copy}>Copy link</button>
	<span class="status" role="status">{message}</span>
</div>

<style>
	.copy {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
</style>
