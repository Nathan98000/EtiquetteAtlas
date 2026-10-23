import type { Page } from '@playwright/test';
import { analytics, basePath } from '../site.config.js';
import { expect, test } from './helpers';

const home = `${basePath}/`;

declare global {
	interface Window {
		cspViolations: string[];
	}
}

/** Record CSP violations from the first script onwards (the hook runs outside the page's CSP). */
async function watchCsp(page: Page) {
	await page.addInitScript(() => {
		window.cspViolations = [];
		document.addEventListener('securitypolicyviolation', (event) => {
			window.cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`);
		});
	});
}

test('HR-1, NFR-40: home page renders under the base path with the attribution footer', async ({
	page
}) => {
	const response = await page.goto(home);
	expect(response?.status()).toBe(200);
	await expect(page).toHaveTitle('The Etiquette Atlas');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Etiquette Atlas');

	const footer = page.getByRole('contentinfo');
	await expect(footer).toContainText('Eriksson');
	await expect(footer).toContainText('(2025)');
	await expect(footer).toContainText('aggregated and modelled by The Etiquette Atlas');
	await expect(footer.getByRole('link', { name: /Everyday norms have become/ })).toHaveAttribute(
		'href',
		'https://doi.org/10.1038/s44271-025-00324-4'
	);
	await expect(footer.getByRole('link', { name: /data on OSF/ })).toHaveAttribute(
		'href',
		'https://doi.org/10.17605/OSF.IO/SH4RB'
	);
	await expect(footer.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
		'href',
		'https://creativecommons.org/licenses/by/4.0/'
	);
});

test('HR-1, HR-3, NFR-31: every request but the beacon stays under the base path; JS and CSS are hashed', async ({
	page,
	baseURL
}) => {
	const requests: string[] = [];
	const failures: string[] = [];
	page.on('request', (request) => requests.push(request.url()));
	page.on('requestfailed', (request) => failures.push(request.url()));
	page.on('response', (response) => {
		if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
	});

	await page.goto(home, { waitUntil: 'networkidle' });

	const prefix = new URL(home, baseURL).href;
	expect(requests.filter((url) => !url.startsWith(prefix))).toEqual([analytics.script]);
	expect(failures).toEqual([]);
	const assets = requests.filter(
		(url) => url.startsWith(prefix) && /\.(js|css)$/.test(new URL(url).pathname)
	);
	expect(assets.length).toBeGreaterThan(0);
	for (const url of assets) expect(new URL(url).pathname).toMatch(`${basePath}/_app/immutable/`);
});

test('HR-7, NFR-32: the CSP comes from a meta tag and nothing violates it', async ({ page }) => {
	await watchCsp(page);
	await page.goto(home, { waitUntil: 'networkidle' });

	const csp = await page
		.locator('meta[http-equiv="content-security-policy"]')
		.getAttribute('content');
	// Scripts from this origin, hashed inline scripts and the beacon; connections to this origin
	// and the beacon's reporting host (FR-90).
	const directive = (name: string) => csp!.match(new RegExp(`${name} ([^;]*)`))![1].split(' ');
	expect(
		directive('script-src').filter((s) => s !== "'self'" && !s.startsWith("'sha256-"))
	).toEqual([analytics.scriptOrigin]);
	expect(directive('connect-src')).toEqual(["'self'", analytics.reportOrigin]);
	expect(csp).not.toMatch(/unsafe-eval/);
	// SvelteKit's hashed inline bootstrap ran, so the app hydrated under the policy.
	expect(
		await page.evaluate(() => Object.keys(window).some((k) => k.startsWith('__sveltekit_')))
	).toBe(true);
	expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
});

test('HR-2, FR-85: unknown URLs get the custom 404 page, styled, with a link home', async ({
	page
}) => {
	await watchCsp(page);
	const response = await page.goto(`${basePath}/no/such/page/`);
	expect(response?.status()).toBe(404);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
	await expect(page.getByRole('contentinfo')).toContainText('CC BY 4.0');
	// The stylesheet loaded even though the URL is three folders deep.
	expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain(
		'system-ui'
	);
	expect(await page.evaluate(() => window.cspViolations)).toEqual([]);

	await page.getByRole('link', { name: 'Go to the atlas home page' }).click();
	await expect(page).toHaveURL(new RegExp(`${basePath}/$`));
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Etiquette Atlas');
});

test('§6.4: system font stack with body text of at least 16 px', async ({ page }) => {
	await page.goto(home);
	const style = await page.evaluate(() => {
		const body = getComputedStyle(document.body);
		return { family: body.fontFamily, size: parseFloat(body.fontSize) };
	});
	expect(style.family).toMatch(/^system-ui/);
	expect(style.size).toBeGreaterThanOrEqual(16);
});

test('C-11, NFR-30: the site sets no cookies', async ({ page, context }) => {
	await page.goto(home, { waitUntil: 'networkidle' });
	await page.goto(`${basePath}/missing/`);
	expect(await context.cookies()).toEqual([]);
});
