<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import AttributionFooter from '#lib/components/AttributionFooter.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
	<a class="wordmark" href={resolve('/')}>The Etiquette Atlas</a>
</header>
<main id="main">
	{@render children()}
</main>
<AttributionFooter />

<style>
	.skip-link {
		position: absolute;
		left: 0.5rem;
		top: -3rem;
		padding: 0.5rem 0.75rem;
		background: var(--surface);
	}

	.skip-link:focus {
		top: 0.5rem;
	}

	.site-header {
		padding: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.wordmark {
		color: var(--text);
		font-weight: 700;
		text-decoration: none;
	}

	main {
		flex: 1 0 auto;
		width: 100%;
		max-width: var(--measure);
		margin: 0 auto;
		padding: 2rem 1rem 0;
	}
</style>
