import { audiencesReady, expect, slopeReady, tabTo, test, url, watchCsp } from './helpers';

const details = (page: import('@playwright/test').Page) =>
	page.getByRole('complementary', { name: 'Details' });

test.describe('FR-40: a behavior’s focused slopegraph', () => {
	test('draws the three audiences for all societies, with summaries, details and a table', async ({
		page
	}) => {
		await watchCsp(page);
		await page.goto(url('audiences/usemphone/'));
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			"Using a mobile phone: who's watching?"
		);
		await slopeReady(page);
		const columns = page
			.getByRole('group', { name: 'Use a mobile phone by audience' })
			.getByRole('button');
		await expect(columns).toHaveCount(3);
		await expect(columns.nth(0)).toHaveAccessibleName(
			/^Alone: all societies \+1\.8 \(95% interval \+1\.\d to \+1\.\d; [\d,]+ respondents in 90 societies\)$/
		);
		await expect(page.locator('#slope-summary')).toHaveText(
			'When alone, in front of colleagues or classmates and in front of management or ' +
				'professors: all societies +1.8, +0.5, −0.8.'
		);
		await expect(page.locator('.lede')).toContainText(
			'2.6 lower in front of management or professors than when alone, the 3rd largest drop of ' +
				'the 15 behaviors'
		);
		// Pointing at a column shows its interval and its details.
		await columns.nth(2).hover();
		await expect(
			details(page).getByRole('heading', {
				name: 'In front of management or professors',
				exact: true
			})
		).toBeVisible();
		await expect(details(page)).toContainText('95% interval');
		await expect(page.locator('.slopegraph .whisker')).toHaveCount(1);
		// NFR-11: the same values as a table.
		await page.getByRole('button', { name: 'Show as table' }).click();
		await expect(page.getByRole('table').getByRole('row')).toHaveCount(4);
		expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
	});

	test('one society over all societies, its small samples named', async ({ page }) => {
		await page.goto(url('audiences/usemphone/?society=chl'));
		await slopeReady(page);
		await expect(page.getByRole('radio', { name: 'Respondents in Chile' })).toBeChecked();
		await expect(page.locator('.series-key li')).toHaveText([
			'Respondents in Chile',
			'All societies'
		]);
		await expect(page.locator('.lede')).toHaveText(
			/^Respondents in Chile judged using a mobile phone/
		);
		const alone = page.getByRole('button', { name: /^Alone: / });
		await expect(alone).toHaveAccessibleName(
			/^Alone: respondents in Chile .* \(small sample\)\), all societies \+1\.8/
		);
		await expect(page.locator('.slopegraph path.mark.small').first()).toBeVisible();
	});

	test('DR-9, FR-27: a missing audience breaks the line and says why', async ({ page }) => {
		// Ethiopia: too few responses about arguing in front of colleagues or classmates.
		await page.goto(url('audiences/argue/?society=eth'));
		await slopeReady(page);
		await expect(page.locator('.lede')).toContainText(
			'with too few responses in front of colleagues or classmates'
		);
		await expect(page.locator('.labels .context').nth(1)).toContainText('too few responses');
		await expect(page.locator('.slopegraph path.line.main')).toHaveAttribute('d', '');
		await expect(
			page.getByRole('button', { name: /^In front of colleagues or classmates: / })
		).toHaveAccessibleName(/respondents in Ethiopia too few responses, all societies/);
		// Kuwait was not asked about kissing (decision 8).
		await page.goto(url('audiences/kiss/?society=kwt'));
		await expect(page.locator('.lede')).toHaveText(
			'Respondents in Kuwait were not asked about kissing on the mouth.'
		);
	});

	test('decision 58: talking, out of the audiences’ order, gets a note', async ({ page }) => {
		await page.goto(url('audiences/talk/'));
		await slopeReady(page);
		await expect(page.locator('.order-note')).toHaveText(
			/^Not in the audiences' order: judged most appropriate in front of colleagues or classmates/
		);
		await page.goto(url('audiences/eat/'));
		await slopeReady(page);
		await expect(page.locator('.order-note')).toHaveCount(0);
	});

	test('decision 57: previous and next step through the behaviors, wrapping at the ends', async ({
		page
	}) => {
		await page.goto(url('audiences/usemphone/?society=chl&actor=on'));
		const steps = page.getByRole('navigation', { name: 'Other behaviors' });
		await expect(steps.getByRole('link', { name: 'Shout in anger' })).toHaveAttribute(
			'href',
			/\/audiences\/shout\/\?society=chl&actor=on$/
		);
		await steps.getByRole('link', { name: 'Argue' }).click();
		await expect(page).toHaveURL(/\/audiences\/argue\/\?society=chl&actor=on$/);
	});
});

test.describe('FR-41: small multiples of all 15 behaviors', () => {
	test('a panel per behavior, sorted by the audience effect, each opening its behavior', async ({
		page
	}) => {
		await page.goto(url('audiences/'));
		await audiencesReady(page);
		const panels = page.locator('.multiples > li');
		await expect(panels.first()).toContainText('Argue');
		await expect(page.locator('#multiples-summary')).toHaveText(
			/^On average across the 90 societies, respondents judged every one of the 15 behaviors less appropriate in front of management or professors than when alone/
		);
		await page.getByLabel('Sort').selectOption('effect');
		await expect(page).toHaveURL(/\/audiences\/\?sort=effect$/);
		await expect(panels.first()).toContainText('Music on headphones');
		await expect(panels.first()).toContainText('3.0 lower with management');
		await expect(panels.last()).toContainText('Talk');
		await page.getByRole('button', { name: 'Show as table' }).click();
		await expect(page.getByRole('table').getByRole('row').nth(1)).toContainText(
			'Music on headphones'
		);
		await page.getByRole('button', { name: 'Show as chart' }).click();
		await page.getByRole('link', { name: /^Talk / }).click();
		await expect(page).toHaveURL(/\/audiences\/talk\/$/);
		await page.getByRole('link', { name: 'All 15 behaviors' }).click();
		await expect(page).toHaveURL(/\/audiences\/$/);
	});

	test('the panels follow the selected society; one not asked says so', async ({ page }) => {
		await page.goto(url('audiences/?society=kwt'));
		await audiencesReady(page);
		await expect(page.locator('#multiples-summary')).toHaveText(
			/^Respondents in Kuwait judged .* of the 13 behaviors with enough responses/
		);
		await expect(page.getByRole('link', { name: /^Kiss on the mouth Not asked$/ })).toBeVisible();
		await expect(page.getByRole('link', { name: /^Flirt Not asked$/ })).toBeVisible();
		await page.getByLabel('Sort').selectOption('effect');
		await expect(page.locator('.multiples > li').last()).toContainText('Flirt');
	});
});

test.describe('FR-42: filters', () => {
	test('one society or all societies, keeping the society for other routes', async ({ page }) => {
		await page.goto(url('audiences/?society=chl'));
		await audiencesReady(page);
		await expect(page.locator('#multiples-summary')).toHaveText(/^Respondents in Chile judged/);
		await page.getByRole('radio', { name: 'All societies' }).check();
		await expect(page).toHaveURL(/\/audiences\/\?society=chl&scope=global$/);
		await expect(page.locator('#multiples-summary')).toHaveText(
			/^On average across the 90 societies/
		);
		// The society stays selected for the other routes, and the filters follow into a behavior.
		await expect(page.getByRole('link', { name: 'Explore', exact: true })).toHaveAttribute(
			'href',
			/\/explore\/\?society=chl$/
		);
		await page.getByRole('link', { name: /^Kiss on the mouth / }).click();
		await expect(page).toHaveURL(/\/audiences\/kiss\/\?society=chl&scope=global$/);
		await expect(page.getByRole('radio', { name: 'All societies' })).toBeChecked();
	});

	test('the actor’s gender is a group of its own, labelled as who does it', async ({ page }) => {
		await page.goto(url('audiences/shout/'));
		await slopeReady(page);
		await page.getByRole('checkbox', { name: /actor gender/ }).check();
		await expect(page).toHaveURL(/\/audiences\/shout\/\?actor=on$/);
		const columns = page
			.getByRole('group', { name: 'Shout in anger by audience and by who does it' })
			.getByRole('button');
		await expect(columns).toHaveCount(5);
		await expect(columns.nth(3)).toHaveAccessibleName(/^Done by a woman: all societies /);
		await expect(columns.nth(4)).toHaveAccessibleName(/^Done by a man: all societies /);
		await expect(page.locator('.labels .heading')).toHaveText(['Audience', 'Who does it']);
		await expect(details(page)).toContainText('0.6 higher done by a woman than done by a man');
		await expect(page.locator('#slope-summary')).toContainText(
			'Done by a woman and by a man: all societies'
		);
		await page.getByRole('link', { name: 'All 15 behaviors' }).click();
		await expect(page).toHaveURL(/\/audiences\/\?actor=on$/);
		await audiencesReady(page);
		await expect(page.locator('.multiples .rule')).toHaveCount(15);
	});

	test('DR-12: women and men respondents for all societies only', async ({ page }) => {
		await page.goto(url('audiences/argue/'));
		await slopeReady(page);
		const split = page.getByRole('checkbox', { name: 'Women and men respondents' });
		await split.check();
		await expect(page).toHaveURL(/\/audiences\/argue\/\?split=gender$/);
		await expect(page.locator('.series-key li')).toHaveText([
			'Women respondents',
			'Men respondents'
		]);
		await expect(page.getByText(/left out of this split/)).toBeVisible();
		await expect(page.locator('.slopegraph path.mark')).toHaveCount(6);
		// With a society in view the split is off limits, and says why.
		await page.getByRole('combobox', { name: 'Society' }).fill('Japan');
		await page.getByRole('option', { name: /^Japan/ }).click();
		await expect(page).toHaveURL(/\/audiences\/argue\/\?society=jpn$/);
		await expect(split).toBeDisabled();
		await expect(split).not.toBeChecked();
		await expect(page.getByText(/For all societies together only/)).toBeVisible();
		await expect(page.locator('.series-key li')).toHaveText([
			'Respondents in Japan',
			'All societies'
		]);
		await page.getByRole('radio', { name: 'All societies' }).check();
		await expect(split).toBeEnabled();
	});

	test('decision 63: a society outside the sample falls back to all societies', async ({
		page
	}) => {
		await page.goto(url('audiences/?society=kwt&sample=paper'));
		await audiencesReady(page);
		await expect(page.getByRole('status').filter({ hasText: 'not in this sample' })).toContainText(
			"Respondents in Kuwait are not in this sample (Paper's sample)"
		);
		await expect(page.locator('#multiples-summary')).toHaveText(
			/^On average across the 71 societies/
		);
		await page.getByRole('button', { name: 'Show All data' }).click();
		await expect(page).toHaveURL(/\/audiences\/\?society=kwt$/);
		await expect(page.getByRole('link', { name: /^Kiss on the mouth Not asked$/ })).toBeVisible();
	});
});

test('AT-11: on the audiences, society, sample and scale update every view and the URL; back and forward restore them', async ({
	page
}) => {
	await page.goto(url('audiences/listen/'));
	await slopeReady(page);
	const box = page.getByRole('combobox', { name: 'Society' });
	await box.fill('Japan');
	await expect(page.getByRole('option', { name: /^Japan/ })).toBeVisible();
	await box.press('Enter');
	await expect(page).toHaveURL(/\/audiences\/listen\/\?society=jpn$/);
	await expect(page.locator('.lede')).toHaveText(/^Respondents in Japan judged listening/);
	await expect(page.locator('#slope-summary')).toContainText('respondents in Japan');
	const japan = await page.locator('#slope-summary').textContent();

	await page.getByRole('radio', { name: 'Attention check' }).check();
	await expect(page).toHaveURL(/\?society=jpn&sample=attention$/);
	await expect(page.locator('.badge')).toHaveText(/Attention check: 80 societies/);
	await expect(page.locator('#slope-summary')).not.toHaveText(japan ?? '');

	// The audiences use raw scores whatever the scale, and say so (decision 60).
	await page.getByRole('radio', { name: 'Centered' }).check();
	await expect(page).toHaveURL(/\?society=jpn&sample=attention&scale=centered$/);
	await expect(page.getByText(/Centering applies to the situations only/)).toBeVisible();

	await page.goBack();
	await expect(page).toHaveURL(/\?society=jpn&sample=attention$/);
	await expect(page.getByText(/Centering applies/)).toBeHidden();
	await page.goBack();
	await expect(page).toHaveURL(/\?society=jpn$/);
	await expect(page.locator('#slope-summary')).toHaveText(japan ?? '');
	await page.goBack();
	await expect(box).toHaveValue('');
	await expect(page.locator('.lede')).toHaveText(/^On average across the 90 societies/);
	await page.goForward();
	await page.goForward();
	await expect(page).toHaveURL(/\?society=jpn&sample=attention$/);
	await expect(page.getByRole('radio', { name: 'Attention check' })).toBeChecked();
	await expect(box).toHaveValue('Japan');

	// The header carries the society, sample and scale into the module and out of it.
	await expect(page.getByRole('link', { name: 'Audiences', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await page.getByRole('link', { name: 'Audiences', exact: true }).click();
	await expect(page).toHaveURL(/\/audiences\/\?society=jpn&sample=attention$/);
	await audiencesReady(page);
	await expect(page.locator('#multiples-summary')).toHaveText(/^Respondents in Japan judged/);
});

test('NFR-13: by keyboard alone, open a behavior, read its slopegraph, switch to all societies and move on', async ({
	page
}) => {
	await page.goto(url('audiences/?society=chl'));
	await audiencesReady(page);
	await tabTo(page, page.getByRole('link', { name: /^Laugh out loud / }), 60);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/audiences\/laugh\/\?society=chl$/);
	await slopeReady(page);

	// One tab stop for the chart; arrows, Home and End move between its columns.
	await tabTo(page, page.getByRole('button', { name: /^Alone: respondents in Chile/ }), 60);
	await expect(details(page).getByRole('heading', { name: 'Alone', exact: true })).toBeVisible();
	await page.keyboard.press('ArrowRight');
	await expect(
		page.getByRole('button', { name: /^In front of colleagues or classmates: / })
	).toBeFocused();
	await expect(
		details(page).getByRole('heading', {
			name: 'In front of colleagues or classmates',
			exact: true
		})
	).toBeVisible();
	await page.keyboard.press('End');
	const management = page.getByRole('button', { name: /^In front of management or professors: / });
	await expect(management).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(management).toHaveAttribute('aria-pressed', 'true');

	// Back to the society switch, where an arrow picks all societies.
	const own = page.getByRole('radio', { name: 'Respondents in Chile' });
	for (let i = 0; i < 20 && !(await own.evaluate((el) => el === document.activeElement)); i++) {
		await page.keyboard.press('Shift+Tab');
	}
	await expect(own).toBeFocused();
	await page.keyboard.press('ArrowRight');
	await expect(page).toHaveURL(/\/audiences\/laugh\/\?society=chl&scope=global$/);
	await expect(page.locator('.lede')).toHaveText(/^On average across the 90 societies/);

	// On to the next behavior.
	await tabTo(page, page.getByRole('link', { name: 'Curse or swear' }), 60);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/audiences\/curse\/\?society=chl&scope=global$/);
});

test('FR-83, NFR-60: audiences routes have their own title, description and canonical URL', async ({
	request
}) => {
	for (const [path, title] of [
		['audiences/', "Who's watching? · The Etiquette Atlas"],
		['audiences/usemphone/', "Using a mobile phone: who's watching? · The Etiquette Atlas"],
		['audiences/readnewspaper/', "Reading the newspaper: who's watching? · The Etiquette Atlas"]
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
	expect(sitemap.match(/<loc>[^<]*\/audiences\/[a-z]+\/<\/loc>/g)).toHaveLength(15);
	expect(sitemap).toContain('/EtiquetteAtlas/audiences/</loc>');
});

test('FR-43: the audiences routes and the method page credit the 2026 analysis of audience effects', async ({
	request
}) => {
	for (const path of ['audiences/', 'audiences/usemphone/', 'audiences/kiss/', 'method/']) {
		const html = await (await request.get(url(path))).text();
		expect(html).toContain(
			'How norms depend on the presence and status of observers: the relational contingency of ' +
				'everyday behaviors in 90 societies'
		);
		expect(html).toContain('<cite>American Sociological Review</cite>');
		expect(html).toContain('href="https://doi.org/10.1177/00031224261464586" rel="external"');
	}
	// Finding L-7: the last of the paper's 158 authors, as Crossref lists them.
	const method = await (await request.get(url('method/'))).text();
	expect(method).toMatch(/(&amp;|&) Van Lange, P\. A\. M\./);
});

test.describe('FR-87: without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the audiences routes show their summaries and say the charts need JavaScript', async ({
		page
	}) => {
		await page.goto(url('audiences/'));
		await expect(page.locator('#multiples-summary')).toHaveText(
			/^On average across the 90 societies, respondents judged every one of the 15 behaviors/
		);
		await expect(page.locator('main noscript p').first()).toContainText(
			'The small multiples need JavaScript.'
		);
		await page.goto(url('audiences/listen/'));
		await expect(page.locator('.lede')).toHaveText(
			/^On average across the 90 societies, respondents judged listening to music on headphones very appropriate when alone \(\+1\.8\)/
		);
		await expect(page.locator('#slope-summary')).toHaveText(
			/^When alone, .*: all societies \+1\.8/
		);
	});
});
