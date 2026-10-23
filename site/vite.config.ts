import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { analytics, basePath, changeModule, origin } from './site.config.js';
import { CHANGE_CARD, SHARE_DIR, SHARE_SOURCE } from './src/lib/share.ts';

// Share images (FR-82; decision 88): `npm run cards` sets CARDS=on to build the card pages in
// src/cards/ instead of the site, into .cards/, for scripts/share-images.js to photograph. That
// build has its own page template (no beacon, no CSP) and generated files, and leaves build/ alone.
const cards = process.env.CARDS === 'on';

// SvelteKit hashes only the inline scripts it writes itself, so the theme script in app.html
// (applied before first paint, NFR-30) gets its hash here and the policy keeps out
// 'unsafe-inline' (NFR-32).
const appHtml = readFileSync(new URL('./src/app.html', import.meta.url), 'utf8');
const inlineScripts = [...appHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
	([, body]) => `sha256-${createHash('sha256').update(body).digest('base64')}` as const
);

/**
 * R-6: a build without the change module (CHANGE_MODULE=off) compiles the change routes and the
 * components only they and the story's change step use to stubs, the routes not prerendered, and
 * swaps the module holding the change files' URLs for one with none, so no change page, chart code
 * or 2000–2003 aggregate reaches build/ (decisions 75 and 85).
 */
function withoutChangeModule(): Plugin {
	const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));
	const routes = at('./src/routes/change/');
	const files = at('./src/lib/data/change-files.ts');
	const components = new Set(
		[
			'charts/ChangeArrows.svelte',
			'charts/ChangeDetails.svelte',
			'charts/ChangeStrip.svelte',
			'components/ChangeProvenance.svelte',
			'components/ChangeScaleNote.svelte',
			'components/StoryChange.svelte'
		].map((path) => at(`./src/lib/${path}`))
	);
	return {
		name: 'without-change-module',
		enforce: 'pre',
		async resolveId(source, importer, options) {
			const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
			return resolved?.id === files ? files.replace(/\.ts$/, '.off.ts') : null;
		},
		load(id) {
			if (components.has(id)) return '';
			if (!id.startsWith(routes)) return null;
			if (id.endsWith('.svelte')) return '';
			if (id.endsWith('.ts')) return 'export const prerender = false;';
			return null;
		}
	};
}

/**
 * FR-82, decision 90: publishes the PNGs `npm run cards` wrote to share-images/ under build/share/,
 * as listed in its manifest, leaving out the change module's card in a build without it (R-6).
 * Without them the build still succeeds, and check-build.js reports every missing image (AT-7).
 */
function shareImages(): Plugin {
	const source = fileURLToPath(new URL(`./${SHARE_SOURCE}/`, import.meta.url));
	return {
		name: 'share-images',
		apply: 'build',
		generateBundle() {
			if (this.environment.config.consumer !== 'client') return;
			if (!existsSync(`${source}manifest.json`)) {
				this.warn(`no share images in ${SHARE_SOURCE}/: run \`npm run cards\``);
				return;
			}
			const manifest: { images: { path: string }[] } = JSON.parse(
				readFileSync(`${source}manifest.json`, 'utf8')
			);
			for (const { path } of manifest.images) {
				if (!changeModule && path === `${CHANGE_CARD}.png`) continue;
				this.emitFile({
					type: 'asset',
					fileName: `${SHARE_DIR}/${path}`,
					source: readFileSync(`${source}${path}`)
				});
			}
		}
	};
}

export default defineConfig({
	plugins: [
		...(changeModule ? [] : [withoutChangeModule()]),
		...(cards ? [] : [shareImages()]),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			...(cards
				? {
						files: { routes: 'src/cards/routes', appTemplate: 'src/cards/app.html' },
						outDir: '.svelte-kit-cards'
					}
				: {}),
			// No SPA fallback: every route is prerendered to its own index.html (HR-2). Without the
			// change module its stub routes are the only ones left unprerendered (R-6).
			adapter: cards
				? adapter({ pages: '.cards', assets: '.cards' })
				: adapter({ strict: changeModule }),
			paths: {
				base: basePath, // HR-1
				origin,
				// Root-relative asset URLs, so 404.html still loads its CSS when GitHub Pages
				// serves it for a missing URL at any depth.
				relative: false
			},
			// Prerendered pages receive the policy as a <meta> tag with hashes for SvelteKit's
			// inline scripts, because GitHub Pages cannot send headers (HR-7, NFR-32). Scripts and
			// connections stay on this origin, except the analytics beacon's script and reporting
			// hosts, as Cloudflare's FAQ asks for a manually embedded beacon (FR-90).
			csp: cards
				? undefined
				: {
						mode: 'hash',
						directives: {
							'default-src': ['self'],
							'script-src': ['self', ...inlineScripts, analytics.scriptOrigin],
							'connect-src': ['self', analytics.reportOrigin],
							// Svelte and SvelteKit set inline style attributes; NFR-32 constrains scripts
							// and connections only.
							'style-src': ['self', 'unsafe-inline'],
							'img-src': ['self'],
							'font-src': ['self'],
							'object-src': ['none'],
							'base-uri': ['self'],
							'form-action': ['self']
						}
					},
			prerender: { entries: cards ? ['*'] : ['*', '/404'] },
			// Small stylesheets go inline, so first paint waits on fewer requests (NFR-2). Inline
			// styles are allowed by the CSP; scripts and data stay in hashed files (HR-3). Cards
			// inline all their CSS, so each one is a single file.
			inlineStyleThreshold: cards ? Infinity : 8192,
			// Deterministic app version in CI; local builds fall back to a timestamp.
			version: { name: process.env.GITHUB_SHA }
		})
	],
	// R-6: whether the change module is in this build (decision 75).
	define: { __CHANGE_MODULE__: JSON.stringify(changeModule) },
	// Keep every imported asset a content-hashed file on this origin (HR-3): no data: URIs for
	// the CSP to allow.
	build: { assetsInlineLimit: 0 },
	// The dev server may read the pipeline's outputs, which live outside site/.
	server: { fs: { allow: ['../data/derived'] } },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.spec.js'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
