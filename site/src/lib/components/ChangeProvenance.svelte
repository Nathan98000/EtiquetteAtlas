<script lang="ts">
	import { resolve } from '$app/paths';
	import { attribution as a } from '#lib/attribution.ts';
</script>

<!-- FR-52, NFR-41, C-6: on every change page, prerendered so it reads without JavaScript. The
     build check finds it by `data-provenance` (AT-4, decision 70). -->
<aside class="provenance" data-provenance aria-labelledby="provenance-title">
	<h2 id="provenance-title">Two surveys, about 20 years apart</h2>
	<p>
		The 2000–2003 survey and the 2023–2024 Global Study of Everyday Norms asked different people,
		recruited in different ways, with different questionnaires, in different eras. Each value here
		is a difference between the two surveys' average answers, not a change in anyone's views, and it
		does not say why the answers differ.
	</p>
	<p>
		Only summaries of the 2000–2003 survey are shown: each society's average for each pair, never an
		individual answer. 2000–2003 data:
		<a href={a.comparisonUrl} rel="external">{a.comparison}</a>, shared by the GSN authors ({a.authors},
		{a.year}) in their <a href={a.dataUrl} rel="external">deposit on OSF</a>. The method page
		explains <a href={resolve('method/#change')}>how the surveys are compared</a>.
	</p>
</aside>

<style>
	.provenance {
		max-width: var(--measure);
		margin: 1.5rem 0;
		padding: 1rem 1.25rem;
		border-left: 3px solid var(--border-strong);
		background: var(--surface-muted);
	}

	h2 {
		font-size: var(--text-md);
		margin: 0 0 0.5rem;
	}

	p {
		margin: 0 0 0.5rem;
	}

	p:last-child {
		margin-bottom: 0;
	}
</style>
