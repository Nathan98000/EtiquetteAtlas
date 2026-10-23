<script lang="ts">
	import { attribution as a } from '#lib/attribution.ts';
	import { CHANGE_MODULE } from '#lib/change-module.ts';
</script>

<!-- NFR-40, FR-6: the data credit on every page. `data-attribution` lets the build check find it.
     rel="external" marks off-site links, which SvelteKit's router leaves to the browser. -->
<footer class="attribution" data-attribution>
	<p>
		Data: {a.authors} ({a.year}).
		<a href={a.articleUrl} rel="external">{a.title}</a>. <cite>{a.journal}</cite>
		{a.volume}. <a href={a.dataUrl} rel="external">{a.dataName} data on OSF</a>, licensed
		<a href={a.licenseUrl} rel="license external">{a.license}</a>.
		{#if CHANGE_MODULE}
			2000–2003 comparison data: <a href={a.comparisonUrl} rel="external">{a.comparison}</a>.
		{/if}
		{a.note}
	</p>
	<p>Site code: <a href={a.codeUrl} rel="external">MIT licence</a>.</p>
</footer>

<style>
	.attribution {
		margin-top: 4rem;
		padding: 1.5rem 1rem 2rem;
		border-top: 1px solid var(--border);
		background: var(--surface-muted);
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	p {
		max-width: var(--measure);
		margin: 0 auto 0.5rem;
	}
</style>
