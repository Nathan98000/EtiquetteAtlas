import type { Page } from '@playwright/test';
import { expect, tabTo, test, url, watchCsp } from './helpers';

const TITLES = [
	'Situations matter more than societies',
	'Where societies agree',
	'Where societies disagree most',
	'Who is watching',
	'Two surveys, 20 years apart',
	'Explore for yourself'
];

const step = (page: Page, id: string) => page.locator(`section#${id}`);

test.describe('FR-64: the guided story', () => {
	test('opens with the paper’s finding and walks through five more steps', async ({ page }) => {
		await watchCsp(page);
		await page.goto(url('story/'));
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('A guided tour');
		await expect(page.locator('.story-step > .text > h2')).toHaveText(
			TITLES.map((title, i) => `Step ${i + 1} of 6 ${title}`)
		);
		// §4.8: the paper's finding, quoted and credited; decision 3 (D-2): pictured with the
		// atlas's own averages, the paper's model left to the method page.
		const finding = step(page, 'finding');
		await expect(finding).toContainText('"far more across situations than across societies"');
		await expect(finding.getByRole('link', { name: 'Eriksson et al., 2025' })).toHaveAttribute(
			'href',
			'https://doi.org/10.1038/s44271-025-00324-4'
		);
		await expect(finding.locator('.spread circle')).toHaveCount(150 + 88);
		await expect(finding).not.toContainText('0.31');
		await expect(finding.locator('#story-finding-summary')).toHaveText(
			"The 150 pairs' averages run from −2.0 to +2.1; the 88 societies' averages over all the " +
				'pairs, from −1.0 to +0.4. Mongolia and Namibia are left out: none of their pairs had 10 ' +
				'or more respondents.'
		);
		// D-22, FR-7: one "About this chart" per step holds the summary, the table and the note.
		await finding.getByText('About this chart').click();
		await expect(finding.getByRole('link', { name: 'How it is made' })).toHaveAttribute(
			'href',
			/\/method\/#story$/
		);
		await finding.getByRole('button', { name: 'Show as table' }).click();
		await expect(finding.getByRole('table').locator('tbody tr')).toHaveCount(150 + 88);

		// FR-16: the most universal and most culture-dependent cells, on their beeswarms.
		await step(page, 'universal').scrollIntoViewIfNeeded();
		await expect(step(page, 'universal')).toContainText(
			'shouting in anger in a job interview very inappropriate'
		);
		await expect(step(page, 'universal').locator('.beeswarm [data-code]').first()).toBeVisible();
		await expect(step(page, 'dependent')).toContainText(
			'Singing at a funeral ceremony divides societies most: their averages run from extremely ' +
				'inappropriate (−2.3) to very appropriate (+1.2).'
		);
		await expect(step(page, 'dependent').locator('.beeswarm [data-code]').first()).toBeVisible();

		// The audience effect, with the 2026 credit (FR-43).
		await step(page, 'audience').scrollIntoViewIfNeeded();
		await expect(step(page, 'audience')).toContainText('the largest drop of the 15 behaviors');
		await expect(step(page, 'audience').locator('.slopegraph')).toBeVisible();
		await expect(step(page, 'audience').locator('.credit')).toContainText('(2026)');

		// The largest difference since the early 2000s, with the provenance note (FR-52, NFR-41).
		const change = step(page, 'change');
		await change.scrollIntoViewIfNeeded();
		await expect(change).toContainText(
			'the largest difference of the 120 pairs both surveys asked'
		);
		await expect(
			change.getByRole('complementary', { name: 'About the two surveys' })
		).toBeVisible();
		// D-22: the five largest differences, the rest on request.
		await expect(change.locator('#story-change-rows > li')).toHaveCount(5);
		await change.getByRole('button', { name: 'Show all 26 societies' }).click();
		await expect(change.locator('#story-change-rows > li')).toHaveCount(26);

		await expect(step(page, 'explore').getByRole('link')).toHaveCount(6);
		expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
	});
});

test('FR-65: Next and the progress dots move to a step and its heading, without history entries', async ({
	page
}) => {
	await page.goto(url('story/'));
	const entries = await page.evaluate(() => window.history.length);
	await step(page, 'finding').getByRole('button', { name: 'Next step' }).click();
	await expect(page.locator('#universal-title')).toBeFocused();
	const dot = page.getByRole('button', { name: 'Step 4: Who is watching' });
	await dot.click();
	await expect(page.locator('#audience-title')).toBeFocused();
	await expect(dot).toHaveAttribute('aria-current', 'step');
	await expect(page.locator('.progress .where')).toHaveText('Step 4 of 6');
	await step(page, 'audience').getByRole('button', { name: 'Previous step' }).click();
	await expect(page.locator('#dependent-title')).toBeFocused();
	expect(page.url()).toMatch(/\/story\/$/);
	expect(await page.evaluate(() => window.history.length)).toBe(entries);

	// Skip is in view at every step.
	await step(page, 'explore').scrollIntoViewIfNeeded();
	const skip = page.locator('.progress').getByRole('link', { name: 'Skip to the atlas' });
	await expect(skip).toBeInViewport();
	await skip.click();
	await expect(page).toHaveURL(/\/explore\/$/);
});

test('FR-65, NFR-14: under reduced motion a step is reached at once, with no smooth scrolling', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(url('story/'));
	await page.getByRole('button', { name: 'Step 5: Two surveys, 20 years apart' }).click();
	const top = await page.locator('#change').evaluate((el) => el.getBoundingClientRect().top);
	expect(Math.abs(top - 72)).toBeLessThan(24);
});

test('NFR-13, AT-6: by keyboard alone, move through the story and open a pair', async ({
	page
}) => {
	await page.goto(url('story/'));
	await tabTo(page, step(page, 'finding').getByRole('button', { name: 'Next step' }), 60);
	await page.keyboard.press('Enter');
	await expect(page.locator('#universal-title')).toBeFocused();
	await tabTo(
		page,
		step(page, 'universal').getByRole('link', { name: 'See every society for this pair' })
	);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/explore\/shout\/job-interview\/$/);
});

test('§9.1: quiz, then story, then the explorer', async ({ page }) => {
	await page.goto(url(''));
	for (const label of ['very appropriate', 'very inappropriate', 'somewhat appropriate']) {
		await page.getByRole('radio', { name: label, exact: true }).check();
		await page.getByRole('button', { name: 'See where your answer falls' }).click();
		await page.getByRole('button', { name: /^(Next question|See all your answers)$/ }).click();
	}
	await page
		.getByRole('region', { name: 'Your answers' })
		.getByRole('link', { name: 'Take the 2-minute tour', exact: true })
		.click();
	await expect(page).toHaveURL(/\/story\/$/);
	await page.locator('.progress').getByRole('link', { name: 'Skip to the atlas' }).click();
	await expect(page).toHaveURL(/\/explore\/$/);
});

test('FR-83, NFR-60: the story has its own title, description and canonical URL, and is indexed', async ({
	page
}) => {
	await page.goto(url('story/'));
	await expect(page).toHaveTitle('A guided tour · The Etiquette Atlas');
	await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /situations/);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		/\/EtiquetteAtlas\/story\/$/
	);
	await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
	const sitemap = await (await page.request.get(url('sitemap.xml'))).text();
	expect(sitemap).toContain('/EtiquetteAtlas/story/</loc>');
	expect(sitemap.match(/<url>/g)).toHaveLength(288);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('FR-87: every step’s text is there, with a note that the charts need JavaScript', async ({
		page
	}) => {
		await page.goto(url('story/'));
		await expect(page.locator('.story-step > .text > h2')).toHaveCount(6);
		await expect(step(page, 'dependent')).toContainText('divides societies most');
		await expect(page.locator('main noscript p').first()).toHaveText(
			'The charts need JavaScript; the text of every step is below.'
		);
	});
});

test('NFR-11: the audience step shows its slopegraph as a full table', async ({ page }) => {
	await page.goto(url('story/'));
	const audience = step(page, 'audience');
	await audience.scrollIntoViewIfNeeded();
	await expect(audience.locator('.slopegraph [data-context="0"]')).toBeAttached();
	await audience.getByText('About this chart').click();
	await audience.getByRole('button', { name: 'Show as table' }).click();
	const table = audience.getByRole('table');
	await expect(table.locator('tbody tr')).toHaveCount(3);
	await expect(table.locator('tbody th')).toHaveText([
		'Alone',
		'In front of colleagues or classmates',
		'In front of management or professors'
	]);
	await expect(table.locator('tbody tr').first()).toContainText('to');
});
