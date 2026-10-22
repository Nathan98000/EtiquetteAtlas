import { expect, type Locator, type Page } from '@playwright/test';
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

/** The small multiples have their data once every panel has drawn its chart or says "not asked". */
export async function audiencesReady(page: Page) {
	await expect(page.locator('.multiples > li')).toHaveCount(15);
	await expect(page.locator('.multiples svg, .multiples .not-asked')).toHaveCount(15);
}

/** A behavior's slopegraph has its data once its columns can take focus. */
export async function slopeReady(page: Page) {
	await expect(page.locator('.slopegraph [data-context="0"]')).toBeAttached();
}

/** Presses Tab until the locator has focus, as a keyboard user would (NFR-13). */
export async function tabTo(page: Page, target: Locator, max = 40) {
	for (let i = 0; i < max; i++) {
		if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
		await page.keyboard.press('Tab');
	}
	await expect(target, 'Tab reaches it').toBeFocused();
}
