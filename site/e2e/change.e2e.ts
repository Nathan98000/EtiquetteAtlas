import type { Page } from '@playwright/test';
import {
	arrowsReady,
	expect,
	matrixReady,
	pickSample,
	sampleRadio,
	swarmReady,
	tabTo,
	test,
	url,
	watchCsp
} from './helpers';

const details = (page: Page) => page.getByRole('complementary', { name: 'Details' });
const rows = (page: Page) => page.locator('#arrows-rows > li');
const PROVENANCE = 'About the two surveys';

/** The differences after each row's track, as numbers. */
async function gaps(page: Page): Promise<number[]> {
	return rows(page)
		.locator('.gap')
		.evaluateAll((spans) =>
			spans.map((s) => Number(s.textContent!.replace(/[▲▼]/g, '').replace('−', '-')))
		);
}

test.describe('AT-4: the overview of the societies in both surveys', () => {
	test('FR-50 to FR-52: arrows, summary counts and the provenance note, from aggregates only', async ({
		page
	}) => {
		await watchCsp(page);
		const data: string[] = [];
		let change: Record<string, unknown> | undefined;
		page.on('response', async (response) => {
			const path = new URL(response.url()).pathname;
			if (!path.endsWith('.json') || path.endsWith('/version.json')) return;
			data.push(path.replace(/^.*\//, '').replace(/\.[^.]+\.json$/, ''));
			if (path.includes('/change-')) change = await response.json();
		});
		await page.goto(url('change/'));
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Then and now: two surveys about 20 years apart'
		);
		// FR-51, D-4: how sure in words, as surveys judged them, never "became".
		await expect(page.locator('.lede')).toHaveText(
			'Averaged over the 26 societies in both surveys, 63 of the 120 pairs of a behavior and a ' +
				'situation were judged clearly more appropriate in 2023–2024 than in 2000–2003 and 46 ' +
				'clearly less; 11 were too close to call.'
		);
		// D-18: the societies' counts moved from the lede to their strip's summary.
		await expect(page.locator('#societies-strip-summary')).toHaveText(
			'On average over their pairs, respondents in 13 of the 26 societies judged the pairs ' +
				'clearly more appropriate in 2023–2024 and in 6 clearly less; 7 were too close to call.'
		);
		// FR-52, NFR-41.
		const note = page.getByRole('complementary', { name: PROVENANCE });
		await expect(note).toContainText('not a change in anyone');
		// D-18: the rest is one click away, in the page and its text, never removed.
		await expect(note.getByText('Only summaries of the 2000–2003 survey are shown')).toBeHidden();
		await note.getByText('About the 2000–2003 data').click();
		await expect(note).toContainText('Only summaries of the 2000–2003 survey are shown');
		await expect(note.getByRole('link', { name: /^Gelfand et al\. \(2011\)/ })).toHaveAttribute(
			'href',
			'https://doi.org/10.1126/science.1197754'
		);
		// FR-50: one arrow per pair, largest difference first, then all 120.
		await arrowsReady(page);
		await expect(rows(page)).toHaveCount(25);
		await expect(rows(page).first().locator('.shaft path')).toBeVisible();
		const first = await gaps(page);
		expect(first.map(Math.abs)).toEqual([...first.map(Math.abs)].sort((a, b) => b - a));
		await expect(page.locator('#arrows-summary')).toHaveText(
			/^Each arrow runs from the 2000–2003 average to the 2023–2024 average of the 26 societies in both surveys; the largest difference is for listening to music on headphones in the library/
		);
		// D-4: how sure in words, and what "clearly" means, once on the page.
		await expect(page.locator('.dumbbell .note')).toContainText(
			'▲ Blue: clearly higher in 2023–2024. ▼ Orange: clearly lower. Grey: too close to call. ' +
				"Clearly means the gap is bigger than the surveys' margin of error (a 95% interval)."
		);
		await expect(rows(page).first().locator('.visually-hidden')).toContainText(
			/clearly higher in 2023–2024|clearly lower in 2023–2024|too close to call/
		);
		await page.getByRole('button', { name: 'Show all 120 pairs' }).click();
		await expect(rows(page)).toHaveCount(120);
		// NFR-3: the change file and the societies, nothing else.
		expect([...new Set(data)].sort()).toEqual(['change-all', 'societies']);
		// C-6: society × pair aggregates, no respondent-level row.
		expect(Object.keys(change!).sort()).toEqual([
			'behaviors',
			'cells',
			'global',
			'grid',
			'sample',
			'societies',
			'source'
		]);
		expect((change!.cells as { n0: unknown[] }).n0).toHaveLength(26 * 120);
		expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
	});

	test('FR-51: each society’s and each behavior’s mean difference, with tables', async ({
		page
	}) => {
		await page.goto(url('change/'));
		const societies = page.getByRole('list', {
			name: 'Societies in both surveys, highest mean difference first'
		});
		await expect(societies.getByRole('listitem')).toHaveCount(26);
		await expect(societies.getByRole('link').first()).toHaveText('Malaysia');
		await expect(societies.getByRole('link').last()).toHaveText('Australia');
		await expect(page.getByText('The other 64 societies in the GSN')).toBeVisible();
		const behaviors = page.getByRole('list', { name: 'Behaviors, highest mean difference first' });
		await expect(behaviors.getByRole('listitem')).toHaveCount(12);
		const cry = behaviors.getByRole('listitem').first();
		await expect(cry.locator('.label')).toHaveText('Cry');
		await expect(cry.locator('.value')).toHaveText('+0.6▲');
		await expect(cry.locator('.note')).toHaveText('clearly higher · higher in 26 of 26 societies');
		await societies.getByRole('link', { name: 'Japan' }).click();
		await expect(page).toHaveURL(/\/change\/jpn\/$/);
	});

	test('NFR-11: the arrows as a table', async ({ page }) => {
		await page.goto(url('change/'));
		await arrowsReady(page);
		await page
			.locator('section:has(> .head #arrows-title)')
			.getByRole('button', { name: 'Show as table' })
			.click();
		const table = page.locator('#arrows-table table');
		await expect(table.getByRole('row')).toHaveCount(121);
		await expect(table.getByRole('row').nth(1)).toContainText('Music on headphones');
		await expect(table.getByRole('row').nth(1)).toContainText('26 societies');
	});
});

test.describe('FR-50: a society’s page', () => {
	test('its own arrows, counts, facts, details and drill-down links', async ({ page }) => {
		await page.goto(url('change/jpn/'));
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Respondents in Japan in 2000–2003 and 2023–2024'
		);
		await expect(page.locator('.lede')).toHaveText(
			'Of the 120 pairs of a behavior and a situation that both surveys asked, respondents in ' +
				'Japan in 2023–2024 judged 22 clearly more appropriate than respondents there in ' +
				'2000–2003 and 38 clearly less; 60 were too close to call.'
		);
		await expect(page.getByRole('complementary', { name: PROVENANCE })).toBeVisible();
		await expect(page.locator('.facts')).toContainText('2000–2003 survey');
		await expect(page.locator('.facts')).toContainText(
			/2023–2024 survey\s*[\d,]+ respondents\s*Pairs in both/
		);
		await arrowsReady(page);
		const firstRow = rows(page).first();
		await firstRow.hover();
		await expect(details(page)).toContainText('2023–2024 survey (GSN)');
		await expect(details(page)).toContainText('2000–2003 survey');
		await expect(details(page)).toContainText(/ratings/);
		await expect(details(page)).toContainText('Difference for the 26 societies in both surveys');
		const label = firstRow.getByRole('link');
		// Links out of a change page carry its society, as a fingerprint's do (decision 44).
		await expect(label).toHaveAttribute('href', /\/explore\/[a-z]+\/[a-z-]+\/\?society=jpn$/);
		await label.click();
		await swarmReady(page);
	});

	test('Israel: 119 pairs, the missing one set apart', async ({ page }) => {
		await page.goto(url('change/isr/'));
		await expect(page.locator('.lede')).toHaveText(
			/^Of the 119 pairs of a behavior and a situation that both surveys asked/
		);
		await arrowsReady(page);
		await page.getByText('1 pair not shown').click();
		await expect(
			page.getByText('Laughing out loud at a party: not in both surveys’ data')
		).toBeVisible();
	});

	test('DR-9: small samples get a dashed ring and are named', async ({ page }) => {
		// Portugal under Attention check: 97 pairs rest on 10 to 29 respondents.
		await page.goto(url('change/prt/?sample=attention'));
		await arrowsReady(page);
		await expect(page.locator('#arrows-rows circle.small').first()).toBeVisible();
		await expect(rows(page).first().locator('.visually-hidden')).toHaveText(
			/small sample in 2023–2024$/
		);
	});
});

test.describe('FR-53: a society without 2000–2003 data', () => {
	test('says so and shows the societies in both surveys', async ({ page }) => {
		await page.goto(url('change/?society=chl'));
		// D-19: the notice in the lede's place, with the societies in both surveys to pick from.
		const notice = page.getByRole('status').filter({ hasText: 'did not include' });
		await expect(notice.locator('p')).toHaveText(
			'The 2000–2003 survey did not include Chile, so this page shows the 26 societies in both surveys.'
		);
		await expect(page.locator('.lede')).toHaveCount(0);
		const only = notice.getByRole('combobox', { name: 'Pick a society in both surveys' });
		await only.fill('chil');
		await expect(notice.getByRole('option')).toHaveCount(0);
		await only.fill('');
		await expect(page.getByRole('combobox', { name: 'Society', exact: true })).toHaveValue('Chile');
		await expect(page.locator('#arrows-title')).toHaveText(
			'Averaged over the 26 societies in both surveys, pair by pair'
		);
		await arrowsReady(page);
		await page.getByRole('link', { name: 'Show all 26 societies' }).click();
		await expect(page).toHaveURL(/\/change\/$/);
		await expect(page.getByRole('status').filter({ hasText: 'did not include' })).toHaveCount(0);
	});

	test('decision 63: outside the sample, the page shows the 22 societies in the paper’s sample', async ({
		page
	}) => {
		await page.goto(url('change/kor/?sample=paper'));
		await expect(page.getByRole('status').filter({ hasText: 'are not in the' })).toContainText(
			"Respondents in South Korea are not in the paper's sample. The chart shows the 22 societies in both surveys instead."
		);
		await expect(page.locator('#arrows-title')).toHaveText(
			'Averaged over the 22 societies in both surveys, pair by pair'
		);
		await page.getByRole('button', { name: 'Show all respondents' }).click();
		await expect(page).toHaveURL(/\/change\/kor\/$/);
		await expect(page.locator('.lede')).toHaveText(
			/^Of the 120 pairs of a behavior and a situation that both surveys asked, respondents in South Korea/
		);
	});
});

test('decision 67: a society in both surveys has its own page, and the sort follows within the module', async ({
	page
}) => {
	await page.goto(url('change/?society=jpn'));
	await expect(page).toHaveURL(/\/change\/jpn\/$/);
	await arrowsReady(page);
	await page.getByRole('combobox', { name: 'Sort' }).selectOption('paper');
	await expect(page).toHaveURL(/\/change\/jpn\/\?sort=paper$/);
	await expect(rows(page).first().getByRole('link')).toHaveText('Arguing at a funeral ceremony');
	const box = page.getByRole('combobox', { name: 'Society' });
	await box.fill('United States');
	await expect(page.getByRole('option', { name: /^United States/ })).toBeVisible();
	await box.press('Enter');
	await expect(page).toHaveURL(/\/change\/usa\/\?sort=paper$/);
	await page.getByRole('link', { name: 'All 26 societies in both surveys' }).click();
	await expect(page).toHaveURL(/\/change\/\?sort=paper$/);
	// The default order is left out of the URL.
	await page.getByRole('combobox', { name: 'Sort' }).selectOption('difference');
	await expect(page).toHaveURL(/\/change\/$/);
});

test('decision 67: the header, fingerprints and drill-downs link to the change pages', async ({
	page
}) => {
	await page.goto(url('explore/?society=jpn&sample=attention&sort=mean'));
	await expect(page.getByRole('link', { name: 'Then and now', exact: true })).toHaveAttribute(
		'href',
		/\/change\/jpn\/\?sample=attention$/
	);
	await page.goto(url('explore/?society=chl'));
	await expect(page.getByRole('link', { name: 'Then and now', exact: true })).toHaveAttribute(
		'href',
		/\/change\/\?society=chl$/
	);
	await page.goto(url('societies/jpn/'));
	await matrixReady(page);
	await page
		.getByRole('link', {
			name: 'How respondents in Japan answered in 2023–2024 and in a survey from 2000–2003'
		})
		.click();
	await expect(page).toHaveURL(/\/change\/jpn\/$/);
	await page.goto(url('societies/chl/'));
	await expect(page.getByRole('link', { name: /survey from 2000–2003/ })).toHaveCount(0);
	await page.goto(url('explore/eat/restaurant/?society=jpn'));
	await expect(
		page.getByRole('link', { name: 'Respondents in Japan compared with a survey from 2000–2003' })
	).toHaveAttribute('href', /\/change\/jpn\/$/);
	// Mobile phones were not asked about in 2000–2003.
	await page.goto(url('explore/usemphone/funeral/'));
	await expect(page.getByRole('link', { name: /2000–2003/ })).toHaveCount(0);
});

test('AT-11: on the change routes, society, sample and scale update every view and the URL; back and forward restore them', async ({
	page
}) => {
	await page.goto(url('change/'));
	await arrowsReady(page);
	const box = page.getByRole('combobox', { name: 'Society' });
	await box.fill('Japan');
	await expect(page.getByRole('option', { name: /^Japan/ })).toBeVisible();
	await box.press('Enter');
	await expect(page).toHaveURL(/\/change\/jpn\/$/);
	await expect(page.locator('.lede')).toHaveText(
		/judged 22 clearly more appropriate .* and 38 clearly less/
	);
	await expect(page.locator('#arrows-summary')).toContainText('for respondents in Japan');

	await pickSample(page, 'Passed the attention check');
	await expect(page).toHaveURL(/\/change\/jpn\/\?sample=attention$/);
	await expect(page.locator('.badge')).toHaveText(/Passed the attention check: 80 societies/);
	await expect(page.locator('.lede')).toHaveText(
		/judged 24 clearly more appropriate .* and 38 clearly less/
	);

	// Raw scores whatever the scale, and the page says so (decision 72).
	await page.getByRole('radio', { name: "Relative to each society's average" }).check();
	await expect(page).toHaveURL(/\/change\/jpn\/\?sample=attention&scale=centered$/);
	await expect(page.locator('.scale-note')).toContainText('has no scores relative to each society');

	await page.goBack();
	await expect(page).toHaveURL(/\?sample=attention$/);
	await expect(page.locator('.scale-note')).toContainText('Scores as answered in both surveys');
	await page.goBack();
	await expect(page).toHaveURL(/\/change\/jpn\/$/);
	await expect(page.locator('.lede')).toHaveText(/judged 22 clearly more appropriate/);
	await page.goBack();
	await expect(page).toHaveURL(/\/change\/$/);
	await expect(box).toHaveValue('');
	await expect(page.locator('.lede')).toHaveText(/^Averaged over the 26 societies/);
	await page.goForward();
	await page.goForward();
	await expect(page).toHaveURL(/\/change\/jpn\/\?sample=attention$/);
	await expect(sampleRadio(page, 'Passed the attention check')).toBeChecked();
	await expect(box).toHaveValue('Japan');
	await expect(page.locator('.lede')).toHaveText(/judged 24 clearly more appropriate/);
});

test('NFR-13: by keyboard alone, pick a society, read its differences, open a pair and switch to the societies in both surveys', async ({
	page
}) => {
	await page.goto(url('change/'));
	await arrowsReady(page);
	const box = page.getByRole('combobox', { name: 'Society' });
	await tabTo(page, box);
	await page.keyboard.type('Japa');
	await expect(page.getByRole('option', { name: /^Japan/ })).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/change\/jpn\/$/);
	await arrowsReady(page);

	// Focus on a pair shows its details; Enter opens its drill-down.
	const first = rows(page).first().getByRole('link');
	const name = await first.textContent();
	await tabTo(page, first, 60);
	await expect(details(page).locator('.title')).toHaveText(name!.trim());
	await page.keyboard.press('Tab');
	const second = rows(page).nth(1).getByRole('link');
	await expect(second).toBeFocused();
	await expect(details(page).locator('.title')).toHaveText((await second.textContent())!.trim());
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/explore\/[a-z]+\/[a-z-]+\/\?society=jpn$/);
	await page.goBack();
	await expect(page).toHaveURL(/\/change\/jpn\/$/);

	// Back to the societies in both surveys.
	await page.locator('body').focus();
	await tabTo(page, page.getByRole('link', { name: 'All 26 societies in both surveys' }), 60);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/change\/$/);
	await expect(page.locator('.lede')).toHaveText(/^Averaged over the 26 societies/);
});

test('FR-83, NFR-60: change routes have their own title, description and canonical URL', async ({
	page
}) => {
	for (const [path, title] of [
		['change/', 'Then and now'],
		['change/jpn/', 'Respondents in Japan in 2000–2003 and 2023–2024']
	]) {
		await page.goto(url(path));
		await expect(page).toHaveTitle(`${title} · The Etiquette Atlas`);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute(
			'content',
			/2000–2003.*not change in individuals/
		);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			new RegExp(`/EtiquetteAtlas/${path}$`)
		);
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
	}
	const sitemap = await (await page.request.get(url('sitemap.xml'))).text();
	expect(sitemap).toContain('/EtiquetteAtlas/change/</loc>');
	expect(sitemap.match(/\/change\/[a-z]{3}\/<\/loc>/g)).toHaveLength(26);
	expect(sitemap.match(/<url>/g)).toHaveLength(288);
});

test('FR-7, FR-52: "About this chart" opens the method page’s change section', async ({ page }) => {
	await page.goto(url('change/jpn/'));
	await page
		.locator('section:has(> .head #arrows-title)')
		.getByRole('link', { name: 'About this chart' })
		.click();
	await expect(page).toHaveURL(/\/method\/#change$/);
	const section = page.locator('#change');
	await expect(section.getByRole('heading', { level: 2 })).toHaveText(
		'Then and now: the 2000–2003 survey'
	);
	await expect(section).toContainText('not a change in anyone');
	// C-6, finding L-4: the provenance as the companion files give it, without calling the file
	// private, as the versions table links it.
	await expect(section).toContainText('individual answers as provided to them privately');
	await expect(section).not.toContainText('not public');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('FR-87: the change routes show their summaries, the provenance note and say the charts need JavaScript', async ({
		page
	}) => {
		await page.goto(url('change/'));
		await expect(page.locator('.lede')).toHaveText(
			/^Averaged over the 26 societies in both surveys, 63/
		);
		await expect(page.getByRole('complementary', { name: PROVENANCE })).toBeVisible();
		await expect(page.locator('main noscript p').first()).toHaveText('The charts need JavaScript.');
		await page.goto(url('change/jpn/'));
		await expect(page.locator('.lede')).toHaveText(/judged 22 clearly more appropriate/);
		await expect(page.locator('#arrows-summary')).toHaveText(/^Each arrow runs/);
		await expect(page.locator('main noscript p').first()).toHaveText('The chart needs JavaScript.');
	});
});
