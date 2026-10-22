<script lang="ts">
	import type { ResolvedPathname } from '$app/types';

	interface Step {
		href: ResolvedPathname;
		label: string;
	}

	interface Props {
		/** The navigation's accessible name: "Other pairs", "Other behaviors". */
		label: string;
		previous: Step;
		next: Step;
	}

	let { label, previous, next }: Props = $props();
</script>

<!-- FR-26 and the audiences: previous and next in paper order, wrapping at the ends
     (decisions 39 and 57). -->
<nav class="steps" aria-label={label}>
	<a class="button" href={previous.href} rel="prev">
		<span aria-hidden="true">←</span>
		{previous.label}
	</a>
	<a class="button" href={next.href} rel="next">
		{next.label} <span aria-hidden="true">→</span>
	</a>
</nav>

<style>
	.steps {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	a {
		max-width: 100%;
		font-size: var(--text-sm);
	}
</style>
