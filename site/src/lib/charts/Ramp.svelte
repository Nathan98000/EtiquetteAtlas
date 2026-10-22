<script lang="ts">
	import { DIVERGING } from './colors';

	interface Props {
		/** The labels under the ramp's left end, middle and right end. */
		ends: [string, string, string];
	}

	let { ends }: Props = $props();

	const ramp = (stops: readonly string[]) => `linear-gradient(to right, ${stops.join(', ')})`;
	const style = `--ramp-light: ${ramp(DIVERGING.light)}; --ramp-dark: ${ramp(DIVERGING.dark)}`;
</script>

<!-- The diverging scale of §6.4 in both themes, shared by the matrix and fingerprint legends. -->
<div class="ramp-key" {style}>
	<div class="ramp" aria-hidden="true"></div>
	<div class="ends">
		{#each ends as end, i (i)}<span>{end}</span>{/each}
	</div>
</div>

<style>
	.ramp-key {
		--ramp: var(--ramp-light);
	}

	:global(:root[data-theme='dark']) .ramp-key {
		--ramp: var(--ramp-dark);
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .ramp-key {
			--ramp: var(--ramp-dark);
		}
	}

	.ramp {
		width: min(16rem, 100%);
		height: 0.75rem;
		background: var(--ramp);
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}

	.ends {
		display: flex;
		justify-content: space-between;
		width: min(16rem, 100%);
		gap: 0.5rem;
		font-size: 0.75rem;
	}
</style>
