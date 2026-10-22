<script lang="ts">
	import { resolve } from '$app/paths';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import { view, withView } from '#lib/state/view.svelte.ts';
	import Seo from './Seo.svelte';

	interface Props {
		title: string;
		/** What the module will show, in one sentence. */
		promise: string;
		milestone: string;
	}

	let { title, promise, milestone }: Props = $props();
</script>

<!-- Placeholder for a module built in a later milestone, so header links never 404 (FR-2,
     decision 29). Kept out of search results and the sitemap. -->
<Seo {title} description={promise} noindex />

<div class="page">
	<h1>{title}</h1>
	<p class="lede">{promise}</p>
	<p>This part of the atlas is still being built ({milestone}).</p>
	<p>
		<a class="button" href={withView(resolve('explore/'), view.state, GLOBAL_KEYS)}>
			Explore the matrix of 150 behaviors and situations
		</a>
	</p>
</div>

<style>
	.page {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 2rem var(--gutter) 0;
	}

	.lede {
		font-size: var(--text-lg);
	}
</style>
