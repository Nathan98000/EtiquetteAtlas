import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { basePath, changeModule, origin } from './site.config.js';

// SvelteKit hashes only the inline scripts it writes itself, so the theme script in app.html
// (applied before first paint, NFR-30) gets its hash here and the policy keeps out
// 'unsafe-inline' (NFR-32).
const appHtml = readFileSync(new URL('./src/app.html', import.meta.url), 'utf8');
const inlineScripts = [...appHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
	([, body]) => `sha256-${createHash('sha256').update(body).digest('base64')}` as const
);

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// No SPA fallback: every route is prerendered to its own index.html (HR-2).
			adapter: adapter({ strict: true }),
			paths: {
				base: basePath, // HR-1
				origin,
				// Root-relative asset URLs, so 404.html still loads its CSS when GitHub Pages
				// serves it for a missing URL at any depth.
				relative: false
			},
			// Prerendered pages receive the policy as a <meta> tag with hashes for SvelteKit's
			// inline scripts, because GitHub Pages cannot send headers (HR-7, NFR-32). Scripts and
			// connections stay on this origin; the analytics beacon's hosts are added in M2.
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', ...inlineScripts],
					'connect-src': ['self'],
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
			prerender: { entries: ['*', '/404'] },
			// Small stylesheets go inline, so first paint waits on fewer requests (NFR-2). Inline
			// styles are allowed by the CSP; scripts and data stay in hashed files (HR-3).
			inlineStyleThreshold: 8192,
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
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
