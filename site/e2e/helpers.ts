import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { analytics, basePath } from '../site.config.js';

/**
 * Test runs stay out of the analytics (FR-90, decision 87): every page gets an empty script in
 * place of the Cloudflare beacon, so nothing reaches Cloudflare, while the request for it still
 * shows that each page loads it. `BEACON=live` lets the real beacon through, for the checks of
 * the deployed site after a push (AT-9).
 */
export const BEACON_LIVE = process.env.BEACON === 'live';

/**
 * Pages are prerendered, so they show content before the app takes over: a click or keystroke
 * that comes first acts on the static page, through links without the view's query string or a
 * picker with no handlers. This `test` waits, after every full load, for the mark the root layout
 * sets once the app has mounted (skipped when JavaScript is off or the page loads no app).
 */
export const test = base.extend({
	context: async ({ context }, use) => {
		if (!BEACON_LIVE) {
			await context.route(analytics.script, (route) =>
				route.fulfill({ status: 200, contentType: 'text/javascript', body: '' })
			);
			await context.route(`${analytics.reportOrigin}/**`, (route) => route.abort());
		}
		await use(context);
	},
	page: async ({ page, javaScriptEnabled }, use) => {
		if (javaScriptEnabled !== false) {
			// Pages without client-side rendering, such as the 404 page, load no app to wait for.
			const hydrated = () =>
				page.waitForFunction(
					() =>
						document.documentElement.hasAttribute('data-hydrated') ||
						!document.querySelector('link[rel="modulepreload"]')
				);
			const goto = page.goto.bind(page);
			page.goto = async (target, options) => {
				const response = await goto(target, options);
				await hydrated();
				return response;
			};
			const reload = page.reload.bind(page);
			page.reload = async (options) => {
				const response = await reload(options);
				await hydrated();
				return response;
			};
		}
		await use(page);
	}
});

export { expect };

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

/** The change routes' arrows are drawn once the first row has its points (FR-50). */
export async function arrowsReady(page: Page) {
	await expect(page.locator('#arrows-rows circle.dot').first()).toBeVisible();
}

/** A sample's radio, which waits under Options at every width (decision 120, D-33). */
export function sampleRadio(page: Page, label: string) {
	return page.getByRole('radio', { name: label, includeHidden: true });
}

/** Picks a sample, opening Options first (decision 120, D-33). */
export async function pickSample(page: Page, label: string) {
	const radio = sampleRadio(page, label);
	if (!(await radio.isVisible())) await page.getByRole('button', { name: 'Options' }).click();
	await radio.check();
}

/** Presses Tab until the locator has focus, as a keyboard user would (NFR-13). */
export async function tabTo(page: Page, target: Locator, max = 40) {
	for (let i = 0; i < max; i++) {
		if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
		await page.keyboard.press('Tab');
	}
	await expect(target, 'Tab reaches it').toBeFocused();
}
