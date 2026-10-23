import type { Page } from '@playwright/test';
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

// §9.1, decisions 41 and 97: each module at 360, 800 and 1280 px in both themes, compared with
// baselines made in the Playwright Linux image (npm run test:visual; update them with
// npm run test:visual:update after a deliberate change). Each screenshot is the top 1200 px of the
// page, where the header, the controls and the main chart are.

const ROUTES: { name: string; path: string; ready: (page: Page) => Promise<void> }[] = [
	{
		name: 'home',
		path: '',
		ready: async (p) => expect(p.getByRole('radio').first()).toBeVisible()
	},
	{
		name: 'story',
		path: 'story/',
		ready: async (p) => expect(p.locator('#finding svg, #finding .bars').first()).toBeVisible()
	},
	{ name: 'explore', path: 'explore/', ready: matrixReady },
	{ name: 'cell', path: 'explore/usemphone/funeral/?society=chl', ready: swarmReady },
	{ name: 'societies', path: 'societies/', ready: societiesReady },
	{ name: 'society', path: 'societies/chl/', ready: matrixReady },
	{ name: 'audiences', path: 'audiences/', ready: audiencesReady },
	{ name: 'audience', path: 'audiences/usemphone/', ready: slopeReady },
	{ name: 'change', path: 'change/', ready: arrowsReady },
	{ name: 'change-society', path: 'change/jpn/', ready: arrowsReady },
	{ name: 'method', path: 'method/', ready: async () => {} }
];

for (const width of [360, 800, 1280]) {
	for (const scheme of ['light', 'dark'] as const) {
		for (const route of ROUTES) {
			test(`§9.1: /${route.path} at ${width} px, ${scheme}`, async ({ page }) => {
				await page.setViewportSize({ width, height: 1200 });
				await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
				await page.goto(url(route.path), { waitUntil: 'networkidle' });
				await route.ready(page);
				await page.evaluate(() => document.fonts.ready);
				await page.waitForLoadState('networkidle');
				await expect(page).toHaveScreenshot(`${route.name}-${width}-${scheme}.png`);
			});
		}
	}
}
