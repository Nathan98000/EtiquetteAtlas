import type { Page } from '@playwright/test';
import { expect, sampleRadio, swarmReady, test, url, watchCsp } from './helpers';

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
	await expect(sampleRadio(page, "The paper's sample")).toBeChecked();
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
	// Direction A: the title states the societies' range; the subtitle says what a dot is.
	await expect(page.locator('#swarm-title')).toHaveText(
		/^(Societies' averages run from .+ to .+|Every society's average is .+)$/
	);
	await expect(page.locator('#swarm .subtitle')).toHaveText(
		"Each dot: one society's average answer"
	);
	await expect(page.locator('.beeswarm .dot.small').first()).toBeVisible();
	await page.getByRole('radio', { name: 'Unadjusted', exact: true }).check();
	await expect(page).toHaveURL(/estimate=raw$/);
	// Decision 111: the subtitle stays; the toggle and the table say which estimate.
	await expect(page.locator('#swarm .subtitle')).toHaveText(
		"Each dot: one society's average answer"
	);
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
	// D-5: the controls sit under the beeswarm, so it comes just before them.
	await page.getByRole('radio', { name: 'Adjusted for small samples' }).focus();
	let inSwarm = false;
	for (let i = 0; i < 8 && !inSwarm; i++) {
		await page.keyboard.press('Shift+Tab');
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

	// The box's height as first painted, before the app applies the URL's society.
	await page.addInitScript(() =>
		document.addEventListener('DOMContentLoaded', () => {
			const el = document.querySelector('.society-box');
			(window as unknown as { painted: number }).painted = el!.getBoundingClientRect().height;
		})
	);
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
	// NFR-2: app.html marks a `?society=` link before the first paint, so the box's space is
	// reserved from the start and the society's arrival moves nothing.
	const painted = await page.evaluate(() => (window as unknown as { painted: number }).painted);
	expect((await box.boundingBox())!.height).toBe(painted);
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

test.describe('on touch', () => {
	test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

	/** The dot furthest right in a chart, which no neighbour covers. */
	async function edgeDot(page: Page, chart: string) {
		return page.locator(chart).evaluate((el) => {
			const dots = [...el.querySelectorAll('[data-code]')].filter(
				(d) => d.getAttribute('data-code') !== 'JPN'
			);
			const box = (d: Element) => d.getBoundingClientRect();
			const dot = dots.reduce((a, b) => (box(b).right > box(a).right ? b : a));
			const { x, y, width, height } = box(dot);
			return { code: dot.getAttribute('data-code')!, x: x + width / 2, y: y + height / 2 };
		});
	}

	for (const chart of ['.beeswarm', '.map']) {
		test(`D-14: on ${chart.slice(1)}, a tap shows a society's tip with a button that chooses it`, async ({
			page
		}) => {
			await page.goto(url('explore/sing/funeral/?society=jpn'));
			await swarmReady(page);
			await page
				.locator(chart === '.map' ? '.map, .placeholder.map' : chart)
				.first()
				.scrollIntoViewIfNeeded();
			await expect(page.locator(chart).locator('[data-code]').first()).toBeVisible();
			const dot = await edgeDot(page, chart);
			const choose = page.locator(chart).getByRole('button', { name: /^Show respondents in / });

			// The first tap shows the tip only; the society stays.
			await page.touchscreen.tap(dot.x, dot.y);
			await expect(choose).toBeVisible();
			await expect(page).toHaveURL(/\?society=jpn$/);
			// A second tap closes it, and so does a tap elsewhere.
			await page.touchscreen.tap(dot.x, dot.y);
			await expect(choose).toBeHidden();
			await page.touchscreen.tap(dot.x, dot.y);
			await expect(choose).toBeVisible();
			await page.touchscreen.tap(4, dot.y);
			await expect(choose).toBeHidden();
			await expect(page).toHaveURL(/\?society=jpn$/);

			// The button chooses the society.
			await page.touchscreen.tap(dot.x, dot.y);
			await choose.tap();
			await expect(page).toHaveURL(new RegExp(`\\?society=${dot.code.toLowerCase()}$`));
		});
	}
});
