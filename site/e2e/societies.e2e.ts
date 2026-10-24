import type { Page } from '@playwright/test';
import {
	expect,
	matrixReady,
	noSidewaysScroll,
	societiesReady,
	test,
	url,
	watchCsp
} from './helpers';

const chile = url('societies/chl/');

/** The counts in the page's one-sentence summary (FR-31). */
async function summaryCounts(page: Page) {
	const text = await page.locator('.lede').textContent();
	const match = text?.match(
		/clearly stricter than the global average on (\d+|none) of the \d+ pairs.* and clearly looser on (\d+|none)/
	);
	expect(match, `counts in "${text}"`).not.toBeNull();
	const n = (s: string) => (s === 'none' ? 0 : Number(s));
	return { stricter: n(match![1]), looser: n(match![2]) };
}

test.describe('the fingerprint from 640 px', () => {
	test('FR-30, FR-31: 150 cells filled by their difference, with ▲ and ▼ where notable', async ({
		page
	}) => {
		await watchCsp(page);
		await page.goto(chile);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Respondents in Chile');
		const grid = page.getByRole('grid', { name: /^Respondents in Chile compared with the global/ });
		await expect(grid.getByRole('gridcell')).toHaveCount(150);
		await matrixReady(page);
		const fills = await grid
			.locator('a[data-cell]')
			.evaluateAll((links) => new Set(links.map((a) => getComputedStyle(a).backgroundColor)).size);
		expect(fills).toBeGreaterThan(20);
		// The marks match the counts in the summary and the legend.
		const { stricter, looser } = await summaryCounts(page);
		await expect(grid.locator('.glyph', { hasText: '▲' })).toHaveCount(looser);
		await expect(grid.locator('.glyph', { hasText: '▼' })).toHaveCount(stricter);
		await expect(
			grid.getByRole('link', { name: /clearly looser than the global average/ })
		).toHaveCount(looser);
		await expect(page.getByText(`clearly looser (more appropriate): ${looser}`)).toBeVisible();
		expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
	});

	test('FR-31, decision 24: the centered scale tests centered differences', async ({ page }) => {
		await page.goto(url('societies/jpn/'));
		await matrixReady(page);
		const raw = await summaryCounts(page);
		await page.getByRole('radio', { name: "Relative to each society's average" }).check();
		await expect(page).toHaveURL(/\/societies\/jpn\/\?scale=centered$/);
		await expect(page.locator('.lede')).toHaveText(
			/^Relative to each society's average, respondents in Japan/
		);
		const centered = await summaryCounts(page);
		expect(centered).not.toEqual(raw);
		await expect(page.getByRole('grid').locator('.glyph', { hasText: '▼' })).toHaveCount(
			centered.stricter
		);
	});

	test('DR-9, FR-27: pairs with too few responses or not asked read so, unfilled', async ({
		page
	}) => {
		// Kuwait's survey left out kissing and flirting (decision 8).
		await page.goto(url('societies/kwt/'));
		await matrixReady(page);
		const grid = page.getByRole('grid');
		await expect(grid.getByRole('link', { name: /: not asked$/ })).toHaveCount(20);
		const empty = grid.locator('a.empty').first();
		expect(await empty.evaluate((a) => getComputedStyle(a).borderStyle)).toBe('dashed');
		await expect(empty).toHaveText('–');
	});

	test('FR-13, FR-14: hover and focus show the details, which link to the pair', async ({
		page
	}) => {
		await page.setViewportSize({ width: 800, height: 900 });
		await page.goto(chile);
		await matrixReady(page);
		await page.locator('[data-cell="140"]').hover();
		const tip = page.locator('#fingerprint-tooltip');
		await expect(tip).toContainText('Using a mobile phone at a funeral ceremony');
		for (const text of [
			'Difference from the global average',
			'Respondents in Chile',
			'95% interval',
			'Global average'
		]) {
			await expect(tip).toContainText(text);
		}
		await page.setViewportSize({ width: 1280, height: 900 });
		// The panel follows hover as well as focus; after the resize the mouse may rest on another
		// cell, so it moves off the grid first.
		await page.mouse.move(0, 0);
		await page.locator('[data-cell="140"]').focus();
		const panel = page.getByRole('complementary');
		await expect(panel).toContainText('Using a mobile phone at a funeral ceremony');
		await expect(
			panel.getByRole('link', { name: 'See every society for this pair' })
		).toHaveAttribute('href', /\/explore\/usemphone\/funeral\/\?society=chl$/);
	});

	test('NFR-13: arrows move through the grid and Enter opens the pair for this society', async ({
		page
	}) => {
		await page.goto(`${chile}?sample=paper`);
		await matrixReady(page);
		await page.locator('[data-cell="0"]').focus();
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowDown');
		await expect(page.locator(':focus')).toHaveAttribute(
			'aria-label',
			/^Laughing out loud on a city sidewalk: /
		);
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/\/explore\/laugh\/sidewalk\/\?society=chl&sample=paper$/);
	});

	test('decision 45: the grid sorts like the matrix, or by the largest differences', async ({
		page
	}) => {
		await page.goto(chile);
		await matrixReady(page);
		const firstRow = page.getByRole('grid').getByRole('rowheader').first();
		await expect(firstRow).toHaveText('Argue');
		await page.getByLabel('Sort').selectOption('difference');
		await expect(page).toHaveURL(/\/societies\/chl\/\?sort=difference$/);
		await expect(firstRow).not.toHaveText('Argue');
		await page.goBack();
		await expect(firstRow).toHaveText('Argue');
	});

	test('NFR-11: the fingerprint has a one-sentence summary and a table view', async ({ page }) => {
		await page.goto(chile);
		await matrixReady(page);
		await expect(page.locator('#fingerprint-summary')).toHaveText(
			/^Respondents in Chile were clearly .*; the largest differences are for .*\.$/
		);
		await page.getByRole('button', { name: 'Show as table' }).first().click();
		const table = page.getByRole('table', { name: /^Respondents in Chile compared with/ });
		await expect(table.getByRole('row')).toHaveCount(151);
	});
});

test.describe('FR-17: below 640 px the fingerprint is a list', () => {
	test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

	test('150 cells with bars, largest differences first when sorted so', async ({ page }) => {
		await page.goto(`${chile}?sort=difference`);
		const list = page.getByRole('list', { name: /compared with the global average$/ });
		await expect(list.getByRole('listitem')).toHaveCount(150);
		await expect(list.getByRole('button', { name: 'Loading' })).toHaveCount(0);
		await expect(page.getByRole('grid')).toBeHidden();
		const values = await list.locator('.value').evaluateAll((spans) =>
			spans
				.map((s) => s.textContent?.replace('−', '-').trim() ?? '')
				.filter(Boolean)
				.map(Number)
		);
		expect(Math.abs(values[0])).toBeGreaterThanOrEqual(Math.abs(values.at(-1)!));
		await list.getByRole('button').first().tap();
		const sheet = page.getByRole('dialog', { name: 'Details' });
		await expect(sheet).toContainText('Difference from the global average');
		await sheet.getByRole('link', { name: /^Open:/ }).tap();
		await expect(page).toHaveURL(/\/explore\/[a-z]+\/[a-z-]+\/\?society=chl$/);
	});

	test('NFR-21: nothing scrolls sideways, compare mode included', async ({ page }) => {
		await page.goto(`${chile}?compare=caf`);
		await expect(page.locator('.dumbbell')).toBeVisible();
		await noSidewaysScroll(page);
	});
});

test('FR-32: five similar societies, each opening its fingerprint with the sample and scale', async ({
	page
}) => {
	// Chile has too few pairs under Attention check (71 of 150); Japan has all 150.
	await page.goto(url('societies/jpn/?sample=attention&scale=centered'));
	const similar = page.getByRole('region', { name: 'Most similar answers' });
	await expect(similar.locator('li a.name')).toHaveCount(5);
	await expect(similar.getByText(/^\d\.\d\d$/).first()).toBeVisible();
	const first = similar.getByRole('listitem').first().getByRole('link').first();
	const name = (await first.textContent())!.trim();
	await first.click();
	await expect(page).toHaveURL(/\/societies\/[a-z]{3}\/\?sample=attention&scale=centered$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`${name}$`));
});

test('FR-32, decision 53: societies without pairs or cells say so plainly', async ({ page }) => {
	// Ethiopia has 97 publishable pairs, too few to compare (at least 120).
	await page.goto(url('societies/eth/'));
	await matrixReady(page);
	await expect(page.getByRole('region', { name: 'Most similar answers' })).toContainText(
		'Too few pairs with enough responses to compare'
	);
	// Mongolia has no publishable pair under All data.
	await page.goto(url('societies/mng/'));
	await expect(page.locator('.lede')).toHaveText(
		'No pair was rated by 10 or more respondents in Mongolia, so none can be shown.'
	);
	await expect(page.getByRole('grid')).toHaveCount(0);
	// Kuwait is outside the paper's sample (§4.4).
	await page.goto(url('societies/kwt/?sample=paper'));
	await expect(page.locator('.lede')).toHaveText(
		"Respondents in Kuwait are not in the paper's sample."
	);
	await page.getByRole('button', { name: 'Show all respondents' }).click();
	await expect(page).toHaveURL(/\/societies\/kwt\/$/);
	await matrixReady(page);
});

test('FR-34: the facts panel shows respondents, students, languages, fieldwork and region', async ({
	page
}) => {
	await page.goto(chile);
	const facts = page.getByRole('region', { name: 'About these respondents' });
	await expect(facts).toContainText('Respondents');
	await expect(facts).toContainText('Spanish');
	await expect(facts).toContainText(
		/(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/
	);
	await expect(facts).toContainText("Region (the GSN authors' grouping)");
	await expect(facts).toContainText('Latin America');
	await expect(facts).toContainText(
		/All respondents: \d+ · The paper's sample: \d+ · Passed the attention check: \d+/
	);
	await expect(facts).toContainText('Collection sites are not shown');
	await page.getByRole('radio', { name: "The paper's sample" }).check();
	await expect(facts).toContainText("Respondents (the paper's sample)");
	// Decision 17: Mauritius has no month with 10 respondents starting in the paper's sample.
	await page.goto(url('societies/mus/?sample=paper'));
	await expect(page.getByRole('region', { name: 'About these respondents' })).toContainText(
		'not shown: fewer than 10 respondents started in any one month'
	);
});

test('FR-33: compare mode draws a dumbbell per pair, largest gaps first', async ({ page }) => {
	await page.goto(chile);
	await matrixReady(page);
	const picker = page.getByRole('combobox', { name: 'Compare with' });
	await picker.fill('Japa');
	// §6.3: Escape closes the compare picker's list.
	await expect(page.getByRole('listbox')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('listbox')).toHaveCount(0);
	await picker.press('ArrowDown');
	await expect(page.getByRole('option', { name: /^Japan/ })).toBeVisible();
	await picker.press('Enter');
	await expect(page).toHaveURL(/\/societies\/chl\/\?compare=jpn$/);
	const rows = page.locator('#dumbbell-rows > li');
	await expect(rows).toHaveCount(25);
	await expect(page.locator('#dumbbell-summary')).toHaveText(
		/^Across the \d+ pairs both can show, respondents in Chile and in Japan differ by/
	);
	const gaps = await rows
		.locator('.gap')
		.evaluateAll((spans) => spans.map((s) => Math.abs(Number(s.textContent!.replace('−', '-')))));
	expect(gaps).toEqual([...gaps].sort((a, b) => b - a));
	await page.getByRole('button', { name: /^Show all \d+ pairs both can show$/ }).click();
	await expect(rows).toHaveCount(150);
	await page.getByRole('button', { name: 'Stop comparing (Japan)' }).click();
	await expect(page).toHaveURL(/\/societies\/chl\/$/);
	await expect(page.locator('.dumbbell')).toHaveCount(0);
});

test('FR-33: a similar society’s Compare link opens the comparison', async ({ page }) => {
	await page.goto(chile);
	const similar = page.getByRole('region', { name: 'Most similar answers' });
	await similar
		.getByRole('link', { name: /^Compare with respondents in / })
		.first()
		.click();
	await expect(page).toHaveURL(/\/societies\/chl\/\?compare=[a-z]{3}#compare$/);
	await expect(page.locator('.dumbbell')).toBeVisible();
});

test.describe('the index of societies', () => {
	test('decision 52: 90 societies by the authors’ regions, with respondents in the sample', async ({
		page
	}) => {
		await page.goto(url('societies/'));
		await societiesReady(page);
		const regions = page.locator('.regions');
		await expect(regions.getByRole('heading', { level: 2 })).toHaveText([
			'Africa (16 societies)',
			'Asia (22 societies)',
			'Latin America (14 societies)',
			'West (38 societies)'
		]);
		await expect(regions.getByRole('link')).toHaveCount(90);
		await expect(regions.getByText('not in this sample')).toHaveCount(0);
		await page.getByRole('radio', { name: "The paper's sample" }).check();
		await expect(page).toHaveURL(/\/societies\/\?sample=paper$/);
		await expect(regions.getByText('not in this sample')).toHaveCount(19);
		await expect(page.locator('.lede')).toHaveText(
			/^71 of the 90 societies are in the paper's sample/
		);
		await regions.getByRole('link', { name: 'Chile' }).click();
		await expect(page).toHaveURL(/\/societies\/chl\/\?sample=paper$/);
	});

	test('decision 44: the picker opens a fingerprint; clearing it returns to the index', async ({
		page
	}) => {
		await page.goto(url('societies/?scale=centered'));
		const box = page.getByRole('combobox', { name: 'Society' });
		await box.fill('chil');
		await expect(page.getByRole('option', { name: /^Chile/ })).toBeVisible();
		await box.press('Enter');
		await expect(page).toHaveURL(/\/societies\/chl\/\?scale=centered$/);
		await expect(box).toHaveValue('Chile');
		await page.getByRole('button', { name: 'Clear the society (Chile)' }).click();
		await expect(page).toHaveURL(/\/societies\/\?scale=centered$/);
	});

	test('decision 44: a society in the query opens its own page', async ({ page }) => {
		await page.goto(url('societies/?society=chl&sample=paper'));
		await expect(page).toHaveURL(/\/societies\/chl\/\?sample=paper$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Respondents in Chile');
	});
});

test('decision 44: the header and links out carry the society between routes', async ({ page }) => {
	await page.goto(url('explore/?society=jpn&sample=attention'));
	await matrixReady(page);
	await expect(page.getByRole('link', { name: 'Societies', exact: true })).toHaveAttribute(
		'href',
		/\/societies\/jpn\/\?sample=attention$/
	);
	await page.getByRole('link', { name: 'Societies', exact: true }).click();
	await expect(page).toHaveURL(/\/societies\/jpn\/\?sample=attention$/);
	await expect(page.getByRole('link', { name: 'Explore', exact: true })).toHaveAttribute(
		'href',
		/\/explore\/\?society=jpn&sample=attention$/
	);
	await expect(page.getByRole('link', { name: 'Societies', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
});

test('FR-83, NFR-60: society routes have their own title, description and canonical URL', async ({
	request
}) => {
	for (const [path, title] of [
		['societies/', 'Societies · The Etiquette Atlas'],
		['societies/chl/', 'Respondents in Chile · The Etiquette Atlas'],
		['societies/phl/', 'Respondents in the Philippines · The Etiquette Atlas']
	]) {
		const html = await (await request.get(url(path))).text();
		expect(html).toContain(`<title>${title}</title>`);
		expect(html).toMatch(/<meta name="description" content="[^"]{40,}"/);
		expect(html).not.toContain('noindex');
		expect(html).toContain(
			`<link rel="canonical" href="https://nathan98000.github.io/EtiquetteAtlas/${path}"`
		);
	}
	const sitemap = await (await request.get(url('sitemap.xml'))).text();
	expect(sitemap.match(/<loc>[^<]*\/societies\/[a-z]{3}\/<\/loc>/g)).toHaveLength(90);
	expect(sitemap).toContain('/EtiquetteAtlas/societies/</loc>');
});

test.describe('FR-87: without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a society route shows its summary, facts and similar societies', async ({ page }) => {
		await page.goto(chile);
		await expect(page.locator('.lede')).toHaveText(/^Respondents in Chile were clearly stricter/);
		await expect(page.locator('main noscript p').first()).toContainText(
			'The fingerprint chart needs JavaScript.'
		);
		await expect(page.getByRole('region', { name: 'About these respondents' })).toContainText(
			'Respondents'
		);
		await expect(
			page.getByRole('region', { name: 'Most similar answers' }).getByRole('listitem')
		).toHaveCount(5);
		await page.goto(url('societies/'));
		await expect(page.locator('.lede')).toHaveText(/^Respondents in 90 societies took part/);
	});
});
