import type { Page, Request } from '@playwright/test';
import { analytics, basePath } from '../site.config.js';
import { BEACON_LIVE, expect, pickSample, test, url } from './helpers';

// AT-9, FR-90, FR-91, C-11, NFR-30 to NFR-32: every page loads the analytics beacon, the only
// third party it contacts, and nothing sets a cookie or stores anything but the theme, the quiz
// answers and SvelteKit's scroll keys. Against build/ the beacon is an empty stub (decision 87);
// with BEACON=live and DEPLOYED_ORIGIN set (npm run test:deployed) the real beacon runs on the
// deployed site, so its reporting requests and its own storage are checked too.

const ROUTES = [
	'',
	'story/',
	'explore/?society=chl&sample=paper',
	'explore/usemphone/funeral/?society=chl',
	'societies/',
	'societies/chl/?compare=jpn',
	'audiences/',
	'audiences/usemphone/?society=chl',
	'change/',
	'change/jpn/',
	'method/',
	'no/such/page/'
];

const ALLOWED_SESSION_KEY = /^(etiquette-atlas:quiz|sveltekit:.+)$/;

/** Every request a page makes from its first byte until it is idle. */
async function visit(page: Page, path: string): Promise<Request[]> {
	const requests: Request[] = [];
	const record = (request: Request) => requests.push(request);
	page.on('request', record);
	await page.goto(url(path), { waitUntil: 'networkidle' });
	// The beacon reports after the page has loaded; give it time on the deployed site.
	if (BEACON_LIVE) await page.waitForTimeout(1500);
	page.off('request', record);
	return requests;
}

test('AT-9, FR-90, NFR-31: every page loads the beacon, and contacts no other third party', async ({
	page,
	context,
	baseURL
}) => {
	const site = new URL(`${basePath}/`, baseURL).href;
	for (const path of ROUTES) {
		const requests = await visit(page, path);
		const thirdParty = requests.map((r) => r.url()).filter((u) => !u.startsWith(site));
		expect(
			thirdParty.filter((u) => u === analytics.script),
			`/${path} loads the beacon`
		).toHaveLength(1);
		const others = thirdParty.filter(
			(u) => u !== analytics.script && !(BEACON_LIVE && u.startsWith(`${analytics.reportOrigin}/`))
		);
		expect(others, `/${path} contacts no other third party`).toEqual([]);
	}
	expect(await context.cookies(), 'C-11: no cookies, first or third party').toEqual([]);
	expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
	const session = await page.evaluate(() => Object.keys(sessionStorage));
	expect(session.filter((key) => !ALLOWED_SESSION_KEY.test(key))).toEqual([]);
});

// Decision 94: the privacy notice says the analytics record a page's address without its query
// string, where the view's choices live. The live beacon strips it before sending, on a full load
// and on a view change alike; the society or pair in a path is part of the address it records.
test('FR-91, C-12, decision 94: nothing sent to the analytics carries a quiz answer or the query string', async ({
	page,
	context
}) => {
	const reports: string[] = [];
	page.on('request', (request) => {
		if (request.url().startsWith(analytics.reportOrigin) || request.url() === analytics.script) {
			reports.push(`${request.url()} ${request.postData() ?? ''}`);
		}
	});
	await page.goto(url('?society=chl'), { waitUntil: 'networkidle' });
	await page.getByRole('radio', { name: 'extremely appropriate', exact: true }).check();
	await page.getByRole('button', { name: 'See where your answer falls' }).click();
	await expect(page.locator('.beeswarm .marker-label')).toBeVisible();
	await page.goto(url('explore/?society=chl&sample=paper'), { waitUntil: 'networkidle' });
	// A view change moves the query string in place, which the live beacon reports as a page view.
	await pickSample(page, 'Passed the attention check');
	await expect(page).toHaveURL(/sample=attention/);
	if (BEACON_LIVE) await page.waitForTimeout(1500);

	expect(reports.length).toBeGreaterThan(0);
	if (BEACON_LIVE) {
		// The beacon did report, and named the page by its path alone.
		const sent = reports.filter((report) => report.startsWith(analytics.reportOrigin));
		expect(sent.length).toBeGreaterThan(0);
		expect(sent.some((report) => report.includes(`${basePath}/explore/`))).toBe(true);
	}
	for (const report of reports) {
		expect(report).not.toMatch(/extremely appropriate|eat\/restaurant|etiquette-atlas:quiz/);
		expect(report).not.toMatch(/\b(society|sample|scale|compare)=/);
	}
	expect(await context.cookies()).toEqual([]);
	expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
