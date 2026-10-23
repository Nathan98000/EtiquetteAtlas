import type { Page } from '@playwright/test';
import {
	arrowsReady,
	audiencesReady,
	expect,
	matrixReady,
	noSidewaysScroll,
	slopeReady,
	societiesReady,
	swarmReady,
	test,
	url,
	watchCsp
} from './helpers';

// NFR-20, §2.4, decision 98: the smoke subset that Firefox, Safari (desktop WebKit and an iPhone)
// and Chrome on Android (a Pixel) run, besides desktop Chromium's full suite. Every module route
// loads and draws without an error, a CSP violation or sideways scrolling, and the quiz, the story
// and the society picker work.

const ROUTES: { path: string; ready: (page: Page) => Promise<void> }[] = [
	{ path: '', ready: async (page) => expect(page.getByRole('radio').first()).toBeVisible() },
	{ path: 'story/', ready: async (page) => expect(page.locator('section#finding')).toBeVisible() },
	{ path: 'explore/?society=chl', ready: matrixReady },
	{ path: 'explore/usemphone/funeral/?society=chl', ready: swarmReady },
	{ path: 'societies/', ready: societiesReady },
	{ path: 'societies/chl/', ready: matrixReady },
	{ path: 'audiences/', ready: audiencesReady },
	{ path: 'audiences/usemphone/?society=chl', ready: slopeReady },
	{ path: 'change/', ready: arrowsReady },
	{ path: 'change/jpn/', ready: arrowsReady },
	{
		path: 'method/',
		ready: async (page) =>
			expect(page.locator('#societies tbody tr, #societies .narrow li').first()).toBeAttached()
	}
];

/** Errors a page throws or logs, after it is ready. */
async function errorsOf(page: Page, open: () => Promise<void>): Promise<string[]> {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(`console: ${message.text()}`);
	});
	await open();
	return errors;
}

for (const route of ROUTES) {
	test(`NFR-20: /${route.path} loads and draws without errors @compat`, async ({ page }) => {
		await watchCsp(page);
		const errors = await errorsOf(page, async () => {
			await page.goto(url(route.path));
			await route.ready(page);
		});
		expect(errors).toEqual([]);
		expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
		await noSidewaysScroll(page);
	});
}

test('NFR-20, FR-61: an answer to the quiz is placed among the societies @compat', async ({
	page
}) => {
	await page.goto(url(''));
	await page.getByRole('radio', { name: 'very appropriate', exact: true }).check();
	await page.getByRole('button', { name: 'See where your answer falls' }).click();
	await expect(page.locator('.beeswarm .marker-label')).toBeVisible();
	await expect(page.locator('.beeswarm .marker-label')).toContainText('Your answer');
});

test('NFR-20, FR-65: the story moves to its next step @compat', async ({ page }) => {
	await page.goto(url('story/'));
	await page.locator('section#finding').getByRole('button', { name: 'Next step' }).click();
	await expect(page.locator('#universal-title')).toBeFocused();
});

test('NFR-20, FR-3: the society picker selects a society and keeps it in the URL @compat', async ({
	page
}) => {
	await page.goto(url('explore/'));
	await matrixReady(page);
	const box = page.getByRole('combobox', { name: 'Society' });
	await box.fill('japa');
	await page.getByRole('listbox', { name: 'Societies' }).getByRole('option').first().click();
	await expect(page).toHaveURL(/society=jpn/);
});
