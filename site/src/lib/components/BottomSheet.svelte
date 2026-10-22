<script lang="ts">
	import { tick, type Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		children: Snippet;
	}

	let { open, title, onclose, children }: Props = $props();

	const id = $props.id();
	let sheet: HTMLDivElement | undefined = $state();
	let returnTo: HTMLElement | null = null;

	// Focus moves into the sheet when it opens and back to where it came from when it closes.
	$effect(() => {
		if (open) {
			returnTo = document.activeElement as HTMLElement | null;
			void tick().then(() => sheet?.focus());
		} else if (returnTo) {
			returnTo.focus();
			returnTo = null;
		}
	});

	function keydown(event: KeyboardEvent) {
		// §6.3: Escape closes sheets.
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
		}
	}
</script>

<!-- §6.2: below 640 px, details open in a bottom sheet. -->
{#if open}
	<div
		class="sheet"
		role="dialog"
		aria-labelledby="{id}-title"
		tabindex="-1"
		bind:this={sheet}
		onkeydown={keydown}
	>
		<div class="head">
			<h2 id="{id}-title">{title}</h2>
			<button type="button" class="button" onclick={onclose}>Close</button>
		</div>
		{@render children()}
	</div>
{/if}

<style>
	.sheet {
		position: fixed;
		z-index: 30;
		left: 0;
		right: 0;
		bottom: 0;
		max-height: 70vh;
		overflow-y: auto;
		padding: 1rem var(--gutter) 1.5rem;
		border-top: 1px solid var(--border-strong);
		border-radius: 0.75rem 0.75rem 0 0;
		background: var(--surface-raised);
		box-shadow: var(--shadow);
	}

	.sheet:focus {
		outline: none;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	h2 {
		font-size: var(--text-md);
		margin: 0;
		color: var(--text-muted);
	}
</style>
