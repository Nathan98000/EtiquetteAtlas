<script lang="ts">
	import { resolve } from '$app/paths';
	import { audienceCredit as c } from '#lib/attribution.ts';
</script>

<!-- FR-43: the audiences module credits the analysis of these audience effects (decision 66). It is
     prerendered, so it reads without JavaScript. -->
<p class="credit">
	The audiences and the actor's gender were analysed by {c.short}, “<a href={c.url} rel="external"
		>{c.title}</a
	>”, <cite>{c.journal}</cite>
	{c.volume}. The values here are the atlas's own aggregates and can differ from the paper's
	estimates (<a href={resolve('method/#audiences')}>method</a>).
</p>

<style>
	.credit {
		max-width: var(--measure);
		margin: 2rem 0 0;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
</style>
