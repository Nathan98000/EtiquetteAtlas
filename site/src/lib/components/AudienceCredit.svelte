<script lang="ts">
	import { resolve } from '$app/paths';
	import { audienceCredit as c } from '#lib/attribution.ts';
</script>

<!-- FR-43: the audiences module credits the analysis of these audience effects (decision 66). It is
     prerendered, so it reads without JavaScript. -->
<!-- Section 5 of the design review: one line, with the full citation on the method page. -->
<p class="credit">
	Audiences analysed by <a href={c.url} rel="external">{c.short}</a>, <cite>{c.journal}</cite>;
	these are the atlas's own aggregates, which can differ from the paper's (<a
		href={resolve('method/#audiences')}>method</a
	>).
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
