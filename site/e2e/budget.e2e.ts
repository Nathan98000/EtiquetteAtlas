import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { Page } from '@playwright/test';
import { basePath } from '../site.config.js';
import {
	arrowsReady,
	audiencesReady,
	expect,
	matrixReady,
	slopeReady,
	societiesReady,
	swarmReady,
	test,
	url
} from './helpers';

// NFR-1: what each representative route transfers on first load, measured from the requests the
// page makes until it is idle, with each file's gzip size taken from build/ (GitHub Pages gzips).
// The drill-down is scrolled to its map so the lazily loaded map counts too. Small stylesheets are
// inlined into the HTML, so the page itself counts toward JS and CSS.

const build = resolve(import.meta.dirname, '..', 'build');
const KB = 1024;

const ROUTES: { path: string; ready: (page: Page) => Promise<void> }[] = [
	{ path: '', ready: async () => {} },
	{
		// The quiz's worst case: an answer revealed with a society's answers (decision 80).
		path: '?society=chl',
		ready: async (page) => {
			await page.getByRole('radio', { name: 'very appropriate', exact: true }).check();
			await page.getByRole('button', { name: 'See where your answer falls' }).click();
			await expect(page.locator('.distribution li')).toHaveCount(6);
		}
	},
	{
		// Every step of the story loaded, the change step included.
		path: 'story/',
		ready: async (page) => {
			for (const id of ['universal', 'dependent', 'audience', 'change', 'explore']) {
				await page.locator(`section#${id}`).scrollIntoViewIfNeeded();
			}
			await expect(page.locator('#story-change-rows circle.dot').first()).toBeVisible();
		}
	},
	{ path: 'explore/', ready: matrixReady },
	{ path: 'explore/?society=chl', ready: matrixReady },
	{
		path: 'explore/usemphone/funeral/?society=chl',
		ready: async (page) => {
			await swarmReady(page);
			await page.locator('.placeholder.map, .map').first().scrollIntoViewIfNeeded();
			await expect(page.locator('.map [data-code]').first()).toBeVisible();
		}
	},
	{ path: 'societies/', ready: societiesReady },
	{ path: 'societies/chl/', ready: matrixReady },
	{
		path: 'societies/chl/?compare=jpn',
		ready: async (page) => {
			await matrixReady(page);
			await expect(page.locator('.dumbbell')).toBeVisible();
		}
	},
	{ path: 'audiences/', ready: audiencesReady },
	{ path: 'audiences/usemphone/?society=chl', ready: slopeReady },
	{ path: 'change/', ready: arrowsReady },
	{ path: 'change/jpn/?sample=attention', ready: arrowsReady },
	{ path: 'method/', ready: async () => {} }
];

const gzip = (path: string) => gzipSync(readFileSync(resolve(build, path))).length;

for (const route of ROUTES) {
	test(`NFR-1: first load of /${route.path} stays within 200 KB of JS and CSS and 300 KB of data`, async ({
		page
	}, testInfo) => {
		const files = new Set<string>();
		page.on('requestfinished', (request) => {
			const path = new URL(request.url()).pathname;
			if (path.startsWith(`${basePath}/_app/`)) files.add(path.slice(basePath.length + 1));
		});
		await page.goto(url(route.path), { waitUntil: 'networkidle' });
		await route.ready(page);
		await page.waitForLoadState('networkidle');

		const html = `${route.path.replace(/\?.*$/, '')}index.html`;
		let code = gzip(html);
		let data = 0;
		for (const file of files) {
			if (/\.(js|css)$/.test(file)) code += gzip(file);
			else if (/\.json$/.test(file) && file !== '_app/version.json') data += gzip(file);
		}
		const line = `/${route.path}: JS+CSS ${(code / KB).toFixed(1)} KB, data ${(data / KB).toFixed(1)} KB`;
		console.log(`NFR-1 ${line}`);
		await testInfo.attach('first-load', { body: line, contentType: 'text/plain' });
		expect(code).toBeLessThanOrEqual(200 * KB);
		expect(data).toBeLessThanOrEqual(300 * KB);
	});
}
