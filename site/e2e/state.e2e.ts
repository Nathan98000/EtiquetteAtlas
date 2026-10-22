import { expect, test } from '@playwright/test';
import { matrixReady, swarmReady, url } from './helpers';

test('AT-11: society, sample and scale update every view and the URL; back and forward restore them', async ({
	page
}) => {
	await page.goto(url('explore/usemphone/funeral/'));
	await swarmReady(page);

	// FR-3: type-ahead picks a society.
	const box = page.getByRole('combobox', { name: 'Society' });
	await box.fill('chil');
	await expect(page.getByRole('listbox', { name: 'Societies' }).getByRole('option')).toHaveCount(1);
	await box.press('Enter');
	await expect(page).toHaveURL(/\?society=chl$/);
	await expect(box).toHaveValue('Chile');
	const panel = page.getByRole('complementary');
	await expect(panel.getByRole('heading', { name: 'Respondents in Chile' })).toBeVisible();
	await expect(page.locator('.beeswarm [aria-pressed="true"]')).toHaveAttribute('data-code', 'CHL');
	await expect(page.locator('.strip .mark').first()).toBeVisible();
	await expect(page.getByRole('link', { name: 'Societies' })).toHaveAttribute(
		'href',
		/societies\/\?society=chl$/
	);

	// FR-4: the sample changes every view and shows its badge.
	const before = await page.locator('#swarm-summary').textContent();
	await page.getByRole('radio', { name: 'Attention check' }).check();
	await expect(page).toHaveURL(/\?society=chl&sample=attention$/);
	await expect(page.locator('.badge')).toHaveText(/Attention check: 80 societies/);
	await expect(page.locator('#swarm-summary')).not.toHaveText(before ?? '');

	// FR-5: the scale changes every view.
	await page.getByRole('radio', { name: 'Centered' }).check();
	await expect(page).toHaveURL(/\?society=chl&sample=attention&scale=centered$/);
	await expect(page.getByRole('heading', { name: /shrunken estimate, centered/ })).toBeVisible();

	// FR-84: back and forward step through the states.
	await page.goBack();
	await expect(page).toHaveURL(/\?society=chl&sample=attention$/);
	await expect(page.getByRole('radio', { name: 'Raw scores' })).toBeChecked();
	await expect(
		page.getByRole('heading', { name: "Every society's shrunken estimate" })
	).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/\?society=chl$/);
	await expect(page.getByRole('radio', { name: 'All data' })).toBeChecked();
	await expect(page.locator('.badge')).toHaveText('');
	await page.goBack();
	await expect(box).toHaveValue('');
	await page.goForward();
	await page.goForward();
	await expect(page).toHaveURL(/\?society=chl&sample=attention$/);
	await expect(page.getByRole('radio', { name: 'Attention check' })).toBeChecked();
	await expect(box).toHaveValue('Chile');
});

test('AT-11: the matrix follows the same controls', async ({ page }) => {
	await page.goto(url('explore/'));
	await matrixReady(page);
	await page.getByRole('combobox', { name: 'Society' }).fill('Japan');
	await page.getByRole('option', { name: /^Japan/ }).click();
	await expect(page).toHaveURL(/\?society=jpn$/);
	await expect(
		page
			.getByRole('grid')
			.getByRole('link', { name: /respondents in Japan/ })
			.first()
	).toBeVisible();
	await page.getByRole('radio', { name: 'Centered' }).check();
	await expect(page).toHaveURL(/\?society=jpn&scale=centered$/);
	await expect(page.locator('#matrix-summary')).toBeVisible();
	await page.goBack();
	await expect(page.getByRole('radio', { name: 'Raw scores' })).toBeChecked();
});

test('§4.4: a society outside the sample reads "not in this sample"', async ({ page }) => {
	await page.goto(url('explore/argue/funeral/?society=kwt&sample=paper'));
	await swarmReady(page);
	await expect(page.getByRole('complementary')).toContainText('Not in this sample');
});

test('§6.1: invalid query values fall back to the defaults', async ({ page }) => {
	await page.goto(url('explore/?society=zzz&sample=everyone&scale=log&sort=random'));
	await matrixReady(page);
	await expect(page.getByRole('radio', { name: 'All data' })).toBeChecked();
	await expect(page.getByRole('radio', { name: 'Raw scores' })).toBeChecked();
	await expect(page.getByLabel('Sort')).toHaveValue('paper');
	await expect(page.getByRole('combobox', { name: 'Society' })).toHaveValue('');
});

test('FR-81: Copy link copies the permalink', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto(url('explore/?society=chl&sort=mean'));
	await matrixReady(page);
	await page.getByRole('button', { name: 'Copy link' }).click();
	await expect(page.getByText('Link copied')).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
});

test('FR-86: a failed data file shows a plain message and a retry control', async ({ page }) => {
	let failures = 1;
	await page.route(/global-all\.[^/]*\.json$/, async (route) => {
		if (failures-- > 0) await route.abort();
		else await route.continue();
	});
	await page.goto(url('explore/'));
	const alert = page.getByRole('alert');
	await expect(alert).toContainText('could not be loaded');
	await alert.getByRole('button', { name: 'Try again' }).click();
	await matrixReady(page);
	await expect(page.getByRole('alert')).toHaveCount(0);
});

test('FR-83: each route has its own title, description and canonical URL in the HTML', async ({
	request
}) => {
	for (const [path, title] of [
		['explore/', 'Explore 150 behaviors and situations · The Etiquette Atlas'],
		[
			'explore/kiss/job-interview/',
			'Kissing on the mouth in a job interview · The Etiquette Atlas'
		],
		['method/', 'Method · The Etiquette Atlas']
	]) {
		const html = await (await request.get(url(path))).text();
		expect(html).toContain(`<title>${title}</title>`);
		expect(html).toMatch(/<meta name="description" content="[^"]{40,}"/);
		expect(html).toContain(
			`<link rel="canonical" href="https://nathan98000.github.io/EtiquetteAtlas/${path}"`
		);
	}
});

test.describe('FR-87: without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('each route shows its text summary and says the charts need JavaScript', async ({
		page
	}) => {
		await page.goto(url('explore/'));
		await expect(page.locator('#matrix-summary')).toHaveText(/^Average judgments run from/);
		// Playwright's text engine skips <noscript>, so the note is located by element.
		await expect(page.locator('main noscript p')).toContainText(
			'The interactive matrix needs JavaScript.'
		);
		await expect(page.getByRole('grid')).toBeHidden();
		await page.goto(url('explore/eat/bus/'));
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eating on a bus');
		await expect(
			page.getByText(/^On average, respondents in 90 societies judged eating on a bus/)
		).toBeVisible();
		await expect(page.locator('main noscript p')).toContainText(
			'The charts for this pair need JavaScript.'
		);
	});
});

test('NFR-30, §6.4: the theme follows the system, and a manual choice is the only thing stored', async ({
	page,
	context
}) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto(url(''));
	const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
	expect(await background()).toBe('rgb(20, 24, 28)');
	await page.getByLabel('Theme').selectOption('light');
	expect(await background()).toBe('rgb(255, 255, 255)');
	await page.reload();
	expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
	expect(await background()).toBe('rgb(255, 255, 255)');
	expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['theme']);
	// SvelteKit's router keeps scroll positions per history entry in sessionStorage; nothing
	// else may be stored there until the quiz (decision 43).
	const session = await page.evaluate(() => Object.keys(sessionStorage));
	expect(session.filter((key) => !key.startsWith('sveltekit:'))).toEqual([]);
	expect(await context.cookies()).toEqual([]);
});
