import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { matrixReady, noSidewaysScroll, swarmReady, url } from './helpers';

const ROUTES = [
	{ path: '', ready: async () => {} },
	{ path: 'explore/?society=chl', ready: matrixReady },
	{ path: 'explore/usemphone/funeral/?society=chl', ready: swarmReady },
	{ path: 'method/', ready: async () => {} }
];

for (const scheme of ['light', 'dark'] as const) {
	for (const route of ROUTES) {
		test(`NFR-10, AT-6: axe finds no serious or critical issue on /${route.path} (${scheme})`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await page.goto(url(route.path));
			await route.ready(page);
			if (route.path.startsWith('explore/usemphone')) {
				await page.locator('.placeholder.map, .map').first().scrollIntoViewIfNeeded();
				await expect(page.locator('.map [data-code]').first()).toBeVisible();
			}
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			const serious = results.violations
				.filter((v) => v.impact === 'serious' || v.impact === 'critical')
				.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`);
			expect(serious).toEqual([]);
		});
	}
}

for (const width of [320, 640, 1024]) {
	test(`NFR-21, NFR-14: nothing scrolls sideways at ${width} px (640 px is 1280 px at 200% zoom)`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 800 });
		for (const route of ROUTES) {
			await page.goto(url(route.path));
			await route.ready(page);
			await noSidewaysScroll(page);
		}
	});
}

test('NFR-14: transitions are switched off under reduced motion', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(url('explore/usemphone/funeral/'));
	await swarmReady(page);
	const duration = await page
		.locator('.beeswarm [data-code]')
		.first()
		.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
	expect(duration).toBeLessThan(0.001);
});
