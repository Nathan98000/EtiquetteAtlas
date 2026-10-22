<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import AttributionFooter from '#lib/components/AttributionFooter.svelte';
	import Header from '#lib/components/Header.svelte';
	import { theme } from '#lib/state/theme.svelte.ts';
	import { view } from '#lib/state/view.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => {
		theme.start();
		view.start();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- FR-87: without JavaScript, charts would stay empty frames; the text summaries remain. -->
	<noscript
		><style>
			.needs-js {
				display: none !important;
			}
		</style></noscript
	>
</svelte:head>

<a class="skip-link" href="#main">Skip to content</a>
<Header />
<main id="main" tabindex="-1">
	{@render children()}
</main>
<AttributionFooter />

<style>
	.skip-link {
		position: absolute;
		z-index: 10;
		left: 0.5rem;
		top: -3rem;
		padding: 0.5rem 0.75rem;
		background: var(--surface);
	}

	.skip-link:focus {
		top: 0.5rem;
	}

	main {
		flex: 1 0 auto;
		width: 100%;
	}

	main:focus {
		outline: none;
	}
</style>
