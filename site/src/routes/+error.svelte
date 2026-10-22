<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const missing = $derived(page.status === 404);
</script>

<!-- Shown for errors during client-side navigation; missing URLs on the host get 404.html. -->
<svelte:head>
	<title>{missing ? 'Page not found' : 'Something went wrong'} · The Etiquette Atlas</title>
</svelte:head>

<h1>{missing ? 'Page not found' : 'Something went wrong'}</h1>
<p>
	{missing
		? 'There is no page at this address.'
		: 'This page could not be shown. Reloading may help.'}
</p>
<p><a href={resolve('/')}>Go to the atlas home page</a></p>
