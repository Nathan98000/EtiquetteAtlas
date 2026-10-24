<script lang="ts">
	import { resolve } from '$app/paths';
	import { view } from '#lib/state/view.svelte.ts';
</script>

<!-- Decision 72: both surveys in raw scores, whatever the scale toggle, as the audiences do
     (decision 60); the scale stays in the URL so it follows the reader. -->
<p class="scale-note">
	{#if view.state.scale === 'centered'}
		The 2000–2003 survey has no scores relative to each society's average, so these charts show
		scores as answered in both surveys. A difference compares a society's respondents in the two
		surveys either way.
		<a href={resolve('method/#change')}>Why</a>
	{:else}
		Scores as answered in both surveys, from −2.5 (extremely inappropriate) to +2.5 (extremely
		appropriate).
	{/if}
</p>

<style>
	.scale-note {
		max-width: var(--measure);
		min-height: 3em;
		margin: 0.75rem 0 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
</style>
