<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		/** The page's own title; the site name is added. */
		title?: string;
		description: string;
		/** Pages that should stay out of search results, such as placeholders (decision 29). */
		noindex?: boolean;
	}

	let { title, description, noindex = false }: Props = $props();

	const SITE = 'The Etiquette Atlas';
	const full = $derived(title ? `${title} · ${SITE}` : SITE);
	// Canonical URLs leave out the query string: prerendered tags cannot vary by it (§6.1).
	const canonical = $derived(new URL(page.url.pathname, page.url.origin).href);
</script>

<!-- FR-83: each prerendered route's own title, description and canonical URL, readable without
     JavaScript. Share images arrive in M7, so there is no og:image yet (decision 26). -->
<svelte:head>
	<title>{full}</title>
	<meta name="description" content={description} />
	{#if noindex}
		<meta name="robots" content="noindex" />
	{:else}
		<link rel="canonical" href={canonical} />
	{/if}
	<meta property="og:site_name" content={SITE} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={full} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta name="twitter:card" content="summary" />
</svelte:head>
