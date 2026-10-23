<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SHARE_ALT, SHARE_DIR, SHARE_HEIGHT, SHARE_WIDTH, shareCard } from '#lib/share.ts';

	interface Props {
		/** The page's own title; the site name is added. */
		title?: string;
		description: string;
		/** Pages that should stay out of search results, such as placeholders (decision 29). */
		noindex?: boolean;
		/** What the route's share image shows; the module's own description when left out. */
		imageAlt?: string;
	}

	let { title, description, noindex = false, imageAlt }: Props = $props();

	const SITE = 'The Etiquette Atlas';
	const full = $derived(title ? `${title} · ${SITE}` : SITE);
	// Canonical URLs leave out the query string: prerendered tags cannot vary by it (§6.1).
	const canonical = $derived(new URL(page.url.pathname, page.url.origin).href);
	// FR-82, FR-83: the route's share image, an absolute URL (decision 89).
	const card = $derived(noindex ? null : shareCard(page.route.id, page.params));
	const image = $derived(
		card && new URL(`${SHARE_DIR}/${card}.png`, new URL(resolve('/'), page.url.origin)).href
	);
	const alt = $derived(card ? (imageAlt ?? SHARE_ALT[card] ?? '') : '');
</script>

<!-- FR-83: each prerendered route's own title, description, canonical URL and share image,
     readable without JavaScript (decisions 26 and 89). -->
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
	{#if image}
		<meta property="og:image" content={image} />
		<meta property="og:image:type" content="image/png" />
		<meta property="og:image:width" content={String(SHARE_WIDTH)} />
		<meta property="og:image:height" content={String(SHARE_HEIGHT)} />
		<meta property="og:image:alt" content={alt} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image:alt" content={alt} />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
</svelte:head>
