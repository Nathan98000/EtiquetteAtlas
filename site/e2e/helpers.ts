import { expect, type Page } from '@playwright/test';
import { basePath } from '../site.config.js';

export const url = (path: string) => `${basePath}/${path}`;

declare global {
	interface Window {
		cspViolations: string[];
	}
}

/** Record CSP violations from the first script onwards (the hook runs outside the page's CSP). */
export async function watchCsp(page: Page) {
	await page.addInitScript(() => {
		window.cspViolations = [];
		document.addEventListener('securitypolicyviolation', (event) => {
			window.cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`);
		});
	});
}

/** The matrix or a fingerprint has its data once its first cell has a real label. */
export async function matrixReady(page: Page) {
	await expect(page.locator('[data-cell="0"]').first()).not.toHaveAttribute(
		'aria-label',
		'Loading'
	);
}

/** The index of societies has its list once the first society links to its page. */
export async function societiesReady(page: Page) {
	await expect(page.locator('.regions li a').first()).toBeVisible();
}

/** The drill-down has its data once the beeswarm has drawn its dots. */
export async function swarmReady(page: Page) {
	await expect(page.locator('.beeswarm [data-code]').first()).toBeVisible();
}

/** The page never scrolls sideways (NFR-21). */
export async function noSidewaysScroll(page: Page) {
	const { scroll, client } = await page.evaluate(() => ({
		scroll: document.documentElement.scrollWidth,
		client: document.documentElement.clientWidth
	}));
	expect(scroll, 'page width beyond the viewport').toBeLessThanOrEqual(client);
}
