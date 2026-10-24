<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { ResolvedPathname } from '$app/types';
	import { CHANGE_MODULE } from '#lib/change-module.ts';
	import { CHANGE_NAME } from '#lib/change-text.ts';
	import { DIVERGING, scoreStyle } from '#lib/charts/colors.ts';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import { changeHref, societyHref, view, withView } from '#lib/state/view.svelte.ts';
	import ThemeSwitch from './ThemeSwitch.svelte';

	// FR-2: every module. Decision 11: named for what a reader looks up, the tour first. A build
	// without the change module leaves its link out (R-6, decision 75).
	const MODULES: { label: string; path: ResolvedPathname; section: string }[] = [
		{ label: 'Tour', path: resolve('story/'), section: '/story' },
		{ label: 'Situations', path: resolve('explore/'), section: '/explore' },
		{ label: 'Societies', path: resolve('societies/'), section: '/societies' },
		{ label: "Who's watching", path: resolve('audiences/'), section: '/audiences' },
		{ label: CHANGE_NAME, path: resolve('change/'), section: '/change' },
		{ label: 'Method', path: resolve('method/'), section: '/method' }
	].filter((module) => CHANGE_MODULE || module.section !== '/change');

	let open = $state(false);
	const section = $derived(page.route.id ?? '');
	// D-24: on phones the menu button names the module the reader is in.
	const current = $derived(MODULES.find((module) => section.startsWith(module.section)));

	// Societies opens the selected society's fingerprint, or the index without one (decision 44);
	// Change opens the selected society's change page when it has one (decision 67).
	const href = (module: (typeof MODULES)[number]) =>
		module.section === '/societies'
			? societyHref(view.state.society, view.state)
			: module.section === '/change'
				? changeHref(view.state.society, view.state, false)
				: withView(module.path, view.state, GLOBAL_KEYS);

	// Direction A (decision 6): the palette's seven stops as a band under the header, as on the
	// share cards, and a 3 × 3 tile of the matrix beside the wordmark. Both are decoration.
	const band = (stops: readonly string[]) =>
		`linear-gradient(to right, ${stops
			.map(
				(c, i) =>
					`${c} ${((i / stops.length) * 100).toFixed(2)}% ${(((i + 1) / stops.length) * 100).toFixed(2)}%`
			)
			.join(', ')})`;
	const bandStyle = `--band-light: ${band(DIVERGING.light)}; --band-dark: ${band(DIVERGING.dark)}`;
	const TILE = [-2.5, -1.67, 0, -1.67, 0, 1.67, 0, 1.67, 2.5];

	// A followed link closes the menu.
	$effect(() => {
		void page.url;
		open = false;
	});
</script>

<header class="site-header">
	<div class="bar">
		<a class="wordmark" href={withView(resolve('/'), view.state, GLOBAL_KEYS)}>
			<span class="tile" aria-hidden="true">
				{#each TILE as value, i (i)}<span class="score" style={scoreStyle(value)}></span>{/each}
			</span>
			The Etiquette Atlas
		</a>
		<button
			type="button"
			class="menu-button button"
			aria-expanded={open}
			aria-controls="site-nav"
			onclick={() => (open = !open)}
		>
			{#if current}<span class="visually-hidden">Menu:</span> {current.label}{:else}Menu{/if}
			<span class="caret" aria-hidden="true">▾</span>
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
	<div class="band" style={bandStyle} aria-hidden="true"></div>
</header>

<style>
	.site-header {
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
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-right: auto;
		color: var(--text);
		font-weight: 700;
		text-decoration: none;
		padding: 0.5rem 0;
	}

	.tile {
		display: grid;
		grid-template-columns: repeat(3, 0.375rem);
		gap: 1px;
	}

	.tile span {
		height: 0.375rem;
		background: var(--fill);
	}

	.band {
		height: 4px;
		background: var(--band-light);
	}

	:global(:root[data-theme='dark']) .band {
		background: var(--band-dark);
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .band {
			background: var(--band-dark);
		}
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
		font-weight: 600;
	}

	.caret {
		font-size: 0.75em;
	}

	.menu-button[aria-expanded='true'] .caret {
		transform: rotate(180deg);
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

		/* The wordmark and the module's name share one row down to 320 px. */
		@media (max-width: 419.98px) {
			.bar {
				column-gap: 0.5rem;
			}

			.menu-button {
				padding-inline: 0.625rem;
				font-size: var(--text-sm);
			}
		}

		@media (max-width: 359.98px) {
			.wordmark {
				font-size: var(--text-sm);
			}

			/* The wordmark and the module's name keep one row at 320 px. */
			.tile {
				display: none;
			}
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
