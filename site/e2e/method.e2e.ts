import { expect, test, url } from './helpers';

// FR-70 to FR-73, FR-92, NFR-34, HR-8: the method page, settled (decision 93).

test('FR-70: the method page is no longer a draft, and every contents link has its section', async ({
	page
}) => {
	await page.goto(url('method/'));
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Method');
	await expect(page.getByText(/^Draft:/)).toHaveCount(0);
	const anchors = await page
		.getByRole('navigation', { name: 'On this page' })
		.getByRole('link')
		.evaluateAll((links) => links.map((a) => a.getAttribute('href')));
	expect(anchors.length).toBeGreaterThan(20);
	for (const anchor of anchors) await expect(page.locator(anchor!)).toHaveCount(1);
	for (const id of ['#limits', '#versions', '#privacy', '#about', '#story']) {
		expect(anchors).toContain(id);
	}
});

test('FR-71: every society with its respondents in each sample, students and languages', async ({
	page
}) => {
	await page.goto(url('method/'));
	const table = page.locator('#societies table');
	await expect(table.locator('tbody tr')).toHaveCount(90);
	const chile = table.locator('tbody tr', { has: page.getByRole('link', { name: 'Chile' }) });
	await expect(chile).toContainText('71');
	await expect(chile).toContainText('Spanish');
	await expect(chile).toContainText('November to December 2023');
	// Chad is in neither the paper's sample nor the attention check.
	await expect(table.locator('tbody tr', { hasText: 'Chad' })).toContainText('–');
	await expect(page.locator('#samples')).toContainText('It leaves out 19 societies');
	await expect(page.locator('#samples')).toContainText('It leaves out 10 societies');
});

test('FR-71, NFR-21: on a phone the societies are a list, with nothing scrolling sideways', async ({
	page
}) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto(url('method/'));
	await expect(page.locator('#societies table')).toBeHidden();
	await expect(page.locator('#societies .narrow > li')).toHaveCount(90);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('FR-72: the OSF files with their versions and checksums, the pipeline version and build date', async ({
	page
}) => {
	await page.goto(url('method/'));
	const versions = page.locator('#versions');
	await expect(versions).toContainText(/built on \d{1,2} \w+ \d{4} by version \d+\.\d+\.\d+/);
	const rows = versions.locator('tbody tr');
	await expect(rows).toHaveCount(5);
	for (const md5 of await rows.locator('code').allTextContents()) {
		expect(md5).toMatch(/^[0-9a-f]{32}$/);
	}
	await expect(rows.first().getByRole('link')).toHaveAttribute('href', /^https:\/\/osf\.io\//);
});

test('FR-92, NFR-34, HR-8: the privacy notice covers analytics, storage and hosting', async ({
	page
}) => {
	await page.goto(url('method/'));
	const privacy = page.locator('#privacy');
	await expect(privacy).toContainText('Cloudflare Web Analytics');
	await expect(privacy).toContainText('without its query string');
	// Decision 105: a society's or pair's page is in the address; quiz answers are not sent.
	await expect(privacy).toContainText("such as a society's or a pair's");
	await expect(privacy).toContainText('neither are your quiz answers');
	await expect(privacy).not.toContainText('Nothing you choose');
	await expect(privacy.getByRole('link', { name: "Cloudflare's privacy policy" })).toHaveAttribute(
		'href',
		'https://www.cloudflare.com/privacypolicy/'
	);
	await expect(privacy).toContainText('no cookies');
	await expect(privacy).toContainText('session storage');
	await expect(privacy).toContainText("logs visitors' IP addresses");
	await expect(page.locator('#limits')).toContainText('recorded as students');
});

test('NFR-10, decision 106: the About section says how to report an accessibility problem', async ({
	page
}) => {
	await page.goto(url('method/'));
	const about = page.locator('#about');
	await expect(about).toContainText('assistive technology, can be reported as an issue');
	await expect(about.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
		'href',
		'https://github.com/Nathan98000/EtiquetteAtlas'
	);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('FR-87: the text, sample effects and versions are prerendered', async ({ page }) => {
		await page.goto(url('method/'));
		await expect(page.locator('#samples')).toContainText('It leaves out 19 societies');
		await expect(page.locator('#versions tbody tr')).toHaveCount(5);
		await expect(page.locator('#societies noscript p')).toContainText('The table needs JavaScript');
		await expect(page.locator('#societies .needs-js')).toBeHidden();
	});
});
