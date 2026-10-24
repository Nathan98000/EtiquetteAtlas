<script lang="ts">
	import { resolve } from '$app/paths';
	import { attribution as a } from '#lib/attribution.ts';
	import { comparison } from '#lib/change-text.ts';
</script>

<!-- FR-52, NFR-41, C-6: on every change page, prerendered so it reads without JavaScript. The
     build check finds it by `data-provenance` (AT-4, decision 70). D-18: the essentials and the
     credit are visible; what only summaries are shown, the full citations and the method link are
     one click away, shortened and never removed. -->
<aside class="provenance" data-provenance aria-labelledby="provenance-title">
	<p>
		<strong id="provenance-title">About the two surveys.</strong> Different people, recruited
		differently, answered different questionnaires in different eras. Each value is a gap between
		the two surveys' averages, not a change in anyone's views, and it does not say why they differ.
		2000–2003 data:
		<a href={comparison.url} rel="external">Gelfand et al. (2011)</a>, shared by the GSN authors.
	</p>
	<details>
		<summary>About the 2000–2003 data</summary>
		<p>
			Only summaries of the 2000–2003 survey are shown: each society's average for each pair, never
			an individual answer. 2000–2003 data: {comparison.text}, shared by the GSN authors ({a.authors},
			{a.year}) in their <a href={a.dataUrl} rel="external">deposit on OSF</a>. The method page
			explains <a href={resolve('method/#change')}>how the surveys are compared</a>.
		</p>
	</details>
</aside>

<style>
	.provenance {
		max-width: var(--measure);
		margin: 1rem 0 1.5rem;
		padding: 0.75rem 1rem;
		font-size: var(--text-sm);
		border-left: 3px solid var(--border-strong);
	}

	p {
		margin: 0 0 0.5rem;
	}

	details p {
		margin: 0.5rem 0 0;
	}

	summary {
		cursor: pointer;
		padding: 0.25rem 0;
	}
</style>
