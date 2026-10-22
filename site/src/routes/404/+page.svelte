<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Page not found · The Etiquette Atlas</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
	<h1>Page not found</h1>
	<p>There is no page at this address. The link may be mistyped, or the page may have moved.</p>
	<p><a href={resolve('/')}>Go to the atlas home page</a></p>
	<p><a href={resolve('explore/')}>Explore the matrix of behaviors and situations</a></p>
</div>

<style>
	.page {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 2rem var(--gutter) 0;
	}
</style>
