import { expect, matrixReady, noSidewaysScroll, test, url, watchCsp } from './helpers';

const explore = url('explore/');

test.describe('the matrix from 640 px', () => {
	test('FR-10, FR-11, FR-16: 150 cells, each with a fill and a disagreement circle', async ({
		page
	}) => {
		await watchCsp(page);
		await page.goto(explore);
		const grid = page.getByRole('grid');
		await expect(grid.getByRole('gridcell')).toHaveCount(150);
		await matrixReady(page);
		await expect(grid.locator('.dot')).toHaveCount(150);
		const fills = await grid
			.locator('a[data-cell]')
			.evaluateAll((links) => new Set(links.map((a) => getComputedStyle(a).backgroundColor)).size);
		expect(fills).toBeGreaterThan(50);
		await expect(grid.getByRole('link', { name: /the most universal pair/ })).toHaveCount(1);
		await expect(grid.getByRole('link', { name: /the most culture-dependent pair/ })).toHaveCount(
			1
		);
		expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
	});

	test('FR-12, FR-80, FR-84: sorting reorders the grid and is kept in the URL; Back leaves the page', async ({
		page
	}) => {
		await page.goto(url('method/'));
		await page.goto(explore);
		await matrixReady(page);
		const firstRow = page.getByRole('grid').getByRole('rowheader').first();
		await expect(firstRow).toHaveText('Argue');
		await page.getByLabel('Sort').selectOption('name');
		await expect(page).toHaveURL(/\/explore\/\?sort=name$/);
		await expect(firstRow).toHaveText('Argue');
		// The first column header names the row labels.
		await expect(page.getByRole('grid').getByRole('columnheader').nth(1)).toHaveText('Bus');
		await page.getByLabel('Sort').selectOption('mean');
		await expect(page).toHaveURL(/sort=mean$/);
		await expect(firstRow).not.toHaveText('Argue');
		// Decision 9: a sort replaces the history entry, so Back leaves the page at once.
		await page.goBack();
		await expect(page).toHaveURL(/\/method\/$/);
		await page.goForward();
		await expect(page).toHaveURL(/\/explore\/\?sort=mean$/);
		await expect(page.getByLabel('Sort')).toHaveValue('mean');
	});

	test('FR-13: hover shows behavior, situation, mean and disagreement with intervals, societies and respondents', async ({
		page
	}) => {
		await page.setViewportSize({ width: 800, height: 900 });
		await page.goto(explore);
		await matrixReady(page);
		await page.locator('[data-cell="140"]').hover();
		const tip = page.locator('#matrix-tooltip');
		await expect(tip).toBeVisible();
		await expect(tip).toContainText('Using a mobile phone at a funeral ceremony');
		for (const text of [
			'Global average',
			'95% interval',
			'Disagreement',
			'Societies',
			'Respondents'
		]) {
			await expect(tip).toContainText(text);
		}
		await page.keyboard.press('Escape');
	});

	test('FR-13, FR-14, NFR-13: by keyboard alone, arrows move, focus shows details, Enter opens', async ({
		page
	}) => {
		await page.goto(explore);
		await matrixReady(page);
		// One tab stop for the whole grid.
		await expect(page.getByRole('grid').locator('[tabindex="0"]')).toHaveCount(1);
		await page.getByLabel('Sort').focus();
		let found = false;
		for (let i = 0; i < 6 && !found; i++) {
			await page.keyboard.press('Tab');
			found = await page.evaluate(() => document.activeElement?.getAttribute('data-cell') === '0');
		}
		expect(found, 'Tab reaches the first cell').toBe(true);
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowDown');
		await expect(page.locator(':focus')).toHaveAttribute(
			'aria-label',
			/^Laughing out loud on a city sidewalk/
		);
		await expect(page.getByRole('complementary')).toContainText(
			'Laughing out loud on a city sidewalk'
		);
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/\/explore\/laugh\/sidewalk\/$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Laughing out loud on a city sidewalk'
		);
	});

	test('FR-15: with a society selected, cells show whether it is stricter, looser or close', async ({
		page
	}) => {
		await page.goto(`${explore}?society=chl`);
		await matrixReady(page);
		const grid = page.getByRole('grid');
		await expect(
			grid.getByRole('link', { name: /respondents in Chile: .*stricter than/ }).first()
		).toBeVisible();
		await expect(
			grid.getByRole('link', { name: /respondents in Chile: .*looser than/ }).first()
		).toBeVisible();
		await expect(grid.locator('.mark').first()).toBeVisible();
		await expect(page.locator('.legend').getByText(/^Respondents in Chile:$/)).toBeVisible();
	});

	test('NFR-11: the matrix has a one-sentence summary and a table view', async ({ page }) => {
		await page.goto(explore);
		await matrixReady(page);
		await expect(page.locator('#matrix-summary')).toHaveText(
			/^.+ is judged the most appropriate on average .*\.$/
		);
		await page.getByRole('button', { name: 'Show as table' }).click();
		const table = page.getByRole('table', { name: /Global average and disagreement/ });
		await expect(table.getByRole('row')).toHaveCount(151);
		await page.getByRole('button', { name: 'Show as chart' }).click();
		await expect(page.getByRole('grid')).toBeVisible();
	});
});

test.describe('AT-1, FR-17: below 640 px the matrix is a list', () => {
	test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

	test('the list shows all 150 cells with mean and disagreement marks', async ({ page }) => {
		await page.goto(explore);
		const list = page.getByRole('list', { name: '150 behavior–situation pairs' });
		await expect(list.getByRole('listitem')).toHaveCount(150);
		await expect(list.getByRole('button', { name: 'Loading' })).toHaveCount(0);
		await expect(list.locator('.bar')).toHaveCount(150);
		await expect(list.locator('.dot')).toHaveCount(150);
		await expect(page.getByRole('grid')).toBeHidden();
		await noSidewaysScroll(page);
	});

	test('§6.3: a tap opens the details in a bottom sheet, whose link opens the cell', async ({
		page
	}) => {
		await page.goto(`${explore}?sort=disagreement`);
		const list = page.getByRole('list', { name: '150 behavior–situation pairs' });
		await expect(list.getByRole('button', { name: 'Loading' })).toHaveCount(0);
		await list.getByRole('button').first().tap();
		const sheet = page.getByRole('dialog', { name: 'Details' });
		await expect(sheet).toBeVisible();
		await expect(sheet).toContainText('Disagreement');
		await page.keyboard.press('Escape');
		await expect(sheet).toBeHidden();
		await list.getByRole('button').first().tap();
		await sheet.getByRole('link', { name: /^Open:/ }).tap();
		await expect(page).toHaveURL(/\/explore\/[a-z]+\/[a-z-]+\/$/);
	});
});
