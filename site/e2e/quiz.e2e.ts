import type { Page } from '@playwright/test';
import { expect, tabTo, test, url, watchCsp } from './helpers';

const radio = (page: Page, label: string) => page.getByRole('radio', { name: label, exact: true });
const summary = (page: Page) => page.locator('#answer-summary');

/** Picks a response and reveals it, waiting until the societies' answers are in. */
async function answer(page: Page, label: string) {
	await radio(page, label).check();
	await page.getByRole('button', { name: 'See where your answer falls' }).click();
	await expect(summary(page)).toHaveText(/^Your answer, /);
}

async function next(page: Page) {
	await page.getByRole('button', { name: /^(Next question|See all your answers)$/ }).click();
}

test.describe('FR-1, FR-60, FR-61: the quiz on the home page', () => {
	for (const [width, height] of [
		[320, 640],
		[1280, 800]
	]) {
		test(`FR-1: "Skip to the atlas" is in view without scrolling at ${width} px`, async ({
			page
		}) => {
			await page.setViewportSize({ width, height });
			await page.goto(url(''));
			const skip = page.getByRole('link', { name: 'Skip to the atlas' });
			await expect(skip).toBeInViewport();
			await expect(skip).toHaveAttribute('href', /\/explore\/$/);
			await expect(page.getByRole('heading', { name: 'How would you answer?' })).toBeVisible();
		});
	}

	test('asks the three configured questions and shows where each answer falls', async ({
		page
	}) => {
		await watchCsp(page);
		await page.goto(url(''));
		await expect(page.locator('#question-title')).toHaveText(
			'Question 1 of 3 How appropriate is it to eat in a restaurant?'
		);
		await expect(page.getByRole('radio')).toHaveCount(6);
		await answer(page, 'extremely appropriate');
		await expect(summary(page)).toHaveText(
			'Your answer, extremely appropriate (+2.5), is above the average answer of respondents in ' +
				'all 87 societies; 3 societies have too few responses or were not asked.'
		);
		await expect(page.locator('.beeswarm .marker')).toBeAttached();
		await expect(page.locator('.beeswarm .marker-label')).toHaveText(
			'Your answer: extremely appropriate'
		);
		await expect(
			page.getByText('Pick a society above to see how its respondents answered.')
		).toBeVisible();
		await next(page);
		await expect(page.locator('#question-title')).toHaveText(
			'Question 2 of 3 How appropriate is it to sing at a funeral ceremony?'
		);
		await answer(page, 'very inappropriate');
		await expect(summary(page)).toHaveText(
			/^Your answer, very inappropriate \(−1\.5\), is above the average answer of respondents in \d+ of 88 societies and below it in \d+/
		);
		await next(page);
		await answer(page, 'somewhat appropriate');
		await next(page);
		const list = page.locator('.summary li');
		await expect(list).toHaveCount(3);
		await expect(list.nth(0)).toContainText('Eating in a restaurant');
		await expect(list.nth(2).getByRole('link')).toHaveAttribute(
			'href',
			/\/explore\/listen\/library\/$/
		);
		expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
	});

	test('FR-61, FR-62: a chosen society’s answers, with yours marked; society changes follow the URL (AT-11)', async ({
		page
	}) => {
		await page.goto(url(''));
		const box = page.getByRole('combobox', { name: 'Compare with a society (optional)' });
		await box.fill('Chile');
		await expect(page.getByRole('option', { name: /^Chile/ })).toBeVisible();
		await box.press('Enter');
		await expect(page).toHaveURL(/\/\?society=chl$/);
		await answer(page, 'very appropriate');
		const section = page.getByRole('region', { name: 'Respondents in Chile', exact: true });
		await expect(section.locator('p').first()).toHaveText(
			/^(None of the|\d+% of) respondents in Chile .*chose very appropriate/
		);
		const bars = page.getByRole('list', { name: 'How respondents in Chile answered, by response' });
		await expect(bars.getByRole('listitem')).toHaveCount(6);
		await expect(bars.locator('li.mine')).toContainText('very appropriate');
		await expect(bars.locator('li.mine')).toContainText('your answer');
		await expect(page.locator('.beeswarm [data-code="CHL"]')).toHaveAttribute(
			'aria-pressed',
			'true'
		);

		await box.fill('Japan');
		await expect(page.getByRole('option', { name: /^Japan/ })).toBeVisible();
		await box.press('Enter');
		await expect(page).toHaveURL(/\/\?society=jpn$/);
		await expect(
			page.getByRole('region', { name: 'Respondents in Japan', exact: true })
		).toBeVisible();
		await page.goBack();
		await expect(page).toHaveURL(/\/\?society=chl$/);
		await expect(
			page.getByRole('region', { name: 'Respondents in Chile', exact: true })
		).toBeVisible();
		await page.goForward();
		await expect(
			page.getByRole('region', { name: 'Respondents in Japan', exact: true })
		).toBeVisible();
	});
});

test('AT-3, FR-63, C-12, NFR-30: answers never leave the tab; a reload keeps them and a new tab does not', async ({
	page,
	context
}) => {
	const sent: { url: string; method: string; body: string | null }[] = [];
	page.on('request', (request) =>
		sent.push({ url: request.url(), method: request.method(), body: request.postData() })
	);
	await page.goto(url(''), { waitUntil: 'networkidle' });
	const before = sent.length;
	const start = page.url();
	await answer(page, 'extremely appropriate');
	await next(page);
	await answer(page, 'very inappropriate');
	await next(page);
	await answer(page, 'somewhat appropriate');
	await next(page);
	await page.waitForLoadState('networkidle');

	// Only the site's own hashed files, fetched without a query string or a body.
	const after = sent.slice(before);
	expect(after.length).toBeGreaterThan(0);
	for (const request of after) {
		const target = new URL(request.url);
		expect(target.pathname).toMatch(/\/EtiquetteAtlas\/_app\/immutable\//);
		expect(target.search).toBe('');
		expect(request.method).toBe('GET');
		expect(request.body).toBeNull();
	}
	expect(page.url()).toBe(start);
	expect(await context.cookies()).toEqual([]);
	const stored = await page.evaluate(() => sessionStorage.getItem('etiquette-atlas:quiz'));
	expect(JSON.parse(stored!)).toEqual({
		'eat/restaurant': 6,
		'sing/funeral': 2,
		'listen/library': 4
	});
	expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

	// A reload keeps the answers: the summary comes back.
	await page.reload();
	await expect(page.locator('.summary li')).toHaveCount(3);
	await expect(page.locator('.summary li').nth(0)).toContainText('extremely appropriate');

	// A new tab starts empty.
	const tab = await context.newPage();
	await tab.goto(url(''));
	await expect(tab.locator('#question-title')).toContainText('Question 1 of 3');
	expect(await tab.evaluate(() => sessionStorage.getItem('etiquette-atlas:quiz'))).toBeNull();

	// "Start again" clears them.
	await page.getByRole('button', { name: 'Start again' }).click();
	await expect(page.locator('#question-title')).toBeFocused();
	expect(await page.evaluate(() => sessionStorage.getItem('etiquette-atlas:quiz'))).toBeNull();
});

test('NFR-13, AT-6: by keyboard alone, answer the three questions and go on to the story', async ({
	page
}) => {
	await page.goto(url(''));
	await tabTo(page, radio(page, 'extremely inappropriate'), 60);
	for (let q = 0; q < 3; q++) {
		// Arrow keys move through the six responses; Tab reaches the button.
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await expect(radio(page, 'somewhat inappropriate')).toBeChecked();
		await tabTo(page, page.getByRole('button', { name: 'See where your answer falls' }));
		await page.keyboard.press('Enter');
		await expect(page.locator('#reveal-title')).toBeFocused();
		await expect(summary(page)).toHaveText(/^Your answer, somewhat inappropriate/);
		const more = page.getByRole('button', { name: /^(Next question|See all your answers)$/ });
		await tabTo(page, more, 80);
		await page.keyboard.press('Enter');
		if (q < 2) {
			await expect(page.locator('#question-title')).toBeFocused();
			await tabTo(page, radio(page, 'extremely inappropriate'), 20);
		}
	}
	await expect(page.locator('#summary-title')).toBeFocused();
	await tabTo(page, page.getByRole('link', { name: 'Take the guided tour' }));
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/story\/$/);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('FR-87: the home page says the quiz needs JavaScript and keeps the way to the atlas', async ({
		page
	}) => {
		await page.goto(url(''));
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Etiquette Atlas');
		await expect(page.locator('main noscript p').first()).toHaveText(
			'The quiz needs JavaScript. Skip to the atlas to explore the answers.'
		);
		await expect(page.getByRole('link', { name: 'Skip to the atlas' })).toBeVisible();
		await expect(page.getByRole('radio').first()).toBeHidden();
	});
});
