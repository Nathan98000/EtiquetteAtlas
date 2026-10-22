<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const missing = $derived(page.status === 404);
</script>

<!-- Shown for errors during client-side navigation; missing URLs on the host get 404.html. -->
<svelte:head>
	<title>{missing ? 'Page not found' : 'Something went wrong'} · The Etiquette Atlas</title>
</svelte:head>

<div class="page">
	<h1>{missing ? 'Page not found' : 'Something went wrong'}</h1>
	<p>
		{missing
			? 'There is no page at this address.'
			: 'This page could not be shown. Reloading may help.'}
	</p>
	<p><a href={resolve('/')}>Go to the atlas home page</a></p>
</div>

<style>
	.page {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 2rem var(--gutter) 0;
	}
</style>
