<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { ResolvedPathname } from '$app/types';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import { changeHref, societyHref, view, withView } from '#lib/state/view.svelte.ts';
	import ThemeSwitch from './ThemeSwitch.svelte';

	// FR-2: every module, including those built later, which have placeholder pages (decision 29).
	const MODULES: { label: string; path: ResolvedPathname; section: string }[] = [
		{ label: 'Explore', path: resolve('explore/'), section: '/explore' },
		{ label: 'Societies', path: resolve('societies/'), section: '/societies' },
		{ label: 'Audiences', path: resolve('audiences/'), section: '/audiences' },
		{ label: 'Change', path: resolve('change/'), section: '/change' },
		{ label: 'Story', path: resolve('story/'), section: '/story' },
		{ label: 'Method', path: resolve('method/'), section: '/method' }
	];

	let open = $state(false);
	const section = $derived(page.route.id ?? '');

	// Societies opens the selected society's fingerprint, or the index without one (decision 44);
	// Change opens the selected society's change page when it has one (decision 67).
	const href = (module: (typeof MODULES)[number]) =>
		module.section === '/societies'
			? societyHref(view.state.society, view.state)
			: module.section === '/change'
				? changeHref(view.state.society, view.state, false)
				: withView(module.path, view.state, GLOBAL_KEYS);

	// A followed link closes the menu.
	$effect(() => {
		void page.url;
		open = false;
	});
</script>

<header class="site-header">
	<div class="bar">
		<a class="wordmark" href={withView(resolve('/'), view.state, GLOBAL_KEYS)}>
			The Etiquette Atlas
		</a>
		<button
			type="button"
			class="menu-button button"
			aria-expanded={open}
			aria-controls="site-nav"
			onclick={() => (open = !open)}
		>
			Menu
		</button>
		<div id="site-nav" class="menu" class:open>
			<nav aria-label="Modules">
				<ul>
					{#each MODULES as module (module.path)}
						<li>
							<a
								href={href(module)}
								aria-current={section.startsWith(module.section) ? 'page' : undefined}
							>
								{module.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
			<ThemeSwitch />
		</div>
	</div>
</header>

<style>
	.site-header {
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.5rem;
		max-width: var(--page);
		margin: 0 auto;
		padding: 0.5rem var(--gutter);
	}

	.wordmark {
		margin-right: auto;
		color: var(--text);
		font-weight: 700;
		text-decoration: none;
		padding: 0.5rem 0;
	}

	.menu {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	ul {
		display: flex;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	nav a {
		display: block;
		padding: 0.625rem 0.75rem;
		border-radius: var(--radius);
		color: var(--text);
		text-decoration: none;
	}

	nav a:hover {
		background: var(--surface-muted);
	}

	nav a[aria-current='page'] {
		font-weight: 700;
		box-shadow: inset 0 -3px 0 var(--accent);
	}

	/* ≥ 1024 px: module tabs in the header (§6.2). */
	.menu-button {
		display: none;
	}

	/* Below 1024 px the header collapses to a menu holding the modules and the theme (§6.2). */
	@media (max-width: 1023.98px) {
		.menu-button {
			display: inline-flex;
		}

		.menu {
			display: none;
			flex-basis: 100%;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
			padding-bottom: 0.75rem;
		}

		.menu.open {
			display: flex;
		}

		nav {
			width: 100%;
		}

		ul {
			flex-direction: column;
		}

		nav a[aria-current='page'] {
			box-shadow: inset 3px 0 0 var(--accent);
		}
	}
</style>
