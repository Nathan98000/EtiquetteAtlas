import { expect, swarmReady, test, url, watchCsp } from './helpers';

const cell = url('explore/usemphone/funeral/');

test('AT-2: a cell URL with society and sample opens in a fresh browser with that view', async ({
	browser
}) => {
	const context = await browser.newContext();
	const page = await context.newPage();
	await watchCsp(page);
	// In the paper's sample, five societies have too few responses for singing in the library.
	await page.goto(url('explore/sing/library/?society=chl&sample=paper'));
	await swarmReady(page);

	// FR-4: the sample is applied and its badge shows.
	await expect(page.getByRole('radio', { name: "The paper's sample" })).toBeChecked();
	await expect(page.locator('.badge')).toHaveText(/The paper's sample: 71 societies/);

	// FR-3, FR-20, FR-25: the society is highlighted and ranked.
	const chile = page.locator('.beeswarm').getByRole('button', { name: /^Respondents in Chile:/ });
	await expect(chile).toHaveAttribute('aria-pressed', 'true');
	const panel = page.getByRole('complementary');
	await expect(page.locator('.society-box')).toContainText(/^Respondents in Chile: /);
	await expect(page.locator('.society-box')).toContainText(/(most accepting|strictest) of \d+/);

	// FR-27: suppressed societies read "too few responses" and are not plotted.
	await expect(panel.getByRole('heading', { name: 'Too few responses' })).toBeVisible();
	await expect(panel).toContainText('Peru');
	await expect(page.getByRole('button', { name: /^Respondents in Peru:/ })).toHaveCount(0);
	const shown = await page.locator('.beeswarm [data-code]').count();
	await expect(panel).toContainText(new RegExp(`Societies shown\\s*${shown}`));
	expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
	await context.close();
});

test('FR-22: shrunken by default, raw on request, small samples flagged', async ({ page }) => {
	await page.goto(cell);
	await swarmReady(page);
	await expect(page.getByRole('heading', { name: "Every society's average answer" })).toBeVisible();
	await expect(page.locator('.beeswarm .dot.small').first()).toBeVisible();
	await page.getByRole('radio', { name: 'Unadjusted', exact: true }).check();
	await expect(page).toHaveURL(/estimate=raw$/);
	// Decision 5: the title stays; the toggle and the table say which estimate.
	await expect(page.getByRole('heading', { name: "Every society's average answer" })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Unadjusted', exact: true })).toBeChecked();
});

test('FR-20, FR-23: intervals on hover, as whiskers with Show uncertainty; mean line and band', async ({
	page
}) => {
	await page.goto(cell);
	await swarmReady(page);
	await expect(page.locator('.beeswarm .mean')).toHaveCount(1);
	await expect(page.locator('.beeswarm .band')).toHaveCount(1);
	await expect(page.locator('.beeswarm .mean-label')).toHaveText(/^Global average/);
	const dot = page.locator('.beeswarm [data-code]').first();
	await dot.hover();
	await expect(page.locator('.beeswarm .tooltip')).toContainText('95% interval');
	await expect(page.locator('.beeswarm .tooltip')).toContainText('respondents');
	await page.getByRole('checkbox', { name: 'Show uncertainty' }).check();
	await expect(page).toHaveURL(/uncertainty=on$/);
	const dots = await page.locator('.beeswarm [data-code]').count();
	await expect(page.locator('.beeswarm .whisker')).toHaveCount(dots);
});

test('FR-24: the map loads when needed, and hover is linked both ways with the beeswarm', async ({
	page
}) => {
	const requests: string[] = [];
	page.on('request', (request) => requests.push(request.url()));
	await page.goto(cell);
	await swarmReady(page);
	await page.locator('.map, .placeholder.map').first().scrollIntoViewIfNeeded();
	const map = page.locator('.map');
	await expect(map.locator('[data-code]').first()).toBeVisible();
	expect(requests.some((u) => /land-110m.*\.json$/.test(u))).toBe(true);

	const code = await map.locator('[data-code]').first().getAttribute('data-code');
	await map.locator(`[data-code="${code}"]`).hover();
	await expect(page.locator(`.beeswarm [data-code="${code}"] .ring`)).toHaveCount(1);
	await page.locator(`.beeswarm [data-code="${code}"]`).hover();
	await expect(map.locator(`[data-code="${code}"] .ring`)).toHaveCount(1);
});

test('FR-25, NFR-13: by keyboard, a society is reached, selected and ranked', async ({ page }) => {
	await page.goto(cell);
	await swarmReady(page);
	await page.getByRole('checkbox', { name: 'Show uncertainty' }).focus();
	let inSwarm = false;
	for (let i = 0; i < 8 && !inSwarm; i++) {
		await page.keyboard.press('Tab');
		inSwarm = await page.evaluate(
			() => !!document.activeElement?.closest('.beeswarm') && document.activeElement !== null
		);
	}
	expect(inSwarm, 'Tab reaches the beeswarm').toBe(true);
	await page.keyboard.press('End');
	const code = await page.locator(':focus').getAttribute('data-code');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(new RegExp(`society=${code!.toLowerCase()}`));
	await expect(page.locator('.society-box')).toContainText(/1st most accepting of \d+|tied 1st/i);
});

test('FR-26: the strip shows the behavior in every situation; previous and next move between cells', async ({
	page
}) => {
	await page.goto(`${cell}?society=chl&estimate=raw`);
	const strip = page.getByRole('list', { name: 'Use a mobile phone in each situation' });
	await expect(strip.getByRole('link')).toHaveCount(10);
	await expect(strip.getByRole('link', { name: /^Funeral/ })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await page.getByRole('link', { name: /Using a mobile phone on a city sidewalk/ }).click();
	await expect(page).toHaveURL(/\/explore\/usemphone\/sidewalk\/\?society=chl&estimate=raw$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Using a mobile phone on a city sidewalk'
	);
	await page
		.getByRole('link', { name: /Using a mobile phone at a funeral ceremony/ })
		.first()
		.click();
	await expect(page).toHaveURL(/\/explore\/usemphone\/funeral\//);
});

test("D-1, D-27, FR-25: the society's result comes first, ranked from the nearer end", async ({
	page
}) => {
	await page.goto(url('explore/eat/bus/'));
	await swarmReady(page);
	const box = page.locator('.society-box');
	await expect(box).toContainText('Pick a society to see where it stands.');
	const empty = (await box.boundingBox())!.height;

	await page.goto(url('explore/eat/bus/?society=jpn'));
	await swarmReady(page);
	// Directly under the title, before the global lede.
	const order = await page.evaluate(() =>
		['h1', '.society-box', '.lede'].map(
			(s) => document.querySelector(s)!.getBoundingClientRect().top
		)
	);
	expect(order).toEqual([...order].sort((a, b) => a - b));
	await expect(box).toContainText(
		/^Respondents in Japan: somewhat inappropriate \(−0\.\d\), clearly stricter than the global average; \d+(st|nd|rd|th) strictest of 88\./
	);
	// NFR-2: its height is reserved, so the society's arrival moves nothing.
	expect((await box.boundingBox())!.height).toBe(empty);
});

test('D-15, D-34: a small sample says what it does to the estimate; point-like intervals are not shown', async ({
	page
}) => {
	await page.goto(url('explore/kiss/party/'));
	await swarmReady(page);
	await page.locator('.beeswarm .dot.small').first().hover();
	await expect(page.locator('.beeswarm .tooltip')).toContainText(
		/^.*Only \d+ respondents: this estimate is pulled toward the global average, and the true average could be anywhere from −?\d\.\d to [−+]?\d\.\d\./
	);
	await expect(page.locator('.beeswarm .tooltip')).not.toContainText('95% interval');
});
